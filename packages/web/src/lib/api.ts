/**
 * Proxy-aware API client for browser
 */

import {
  type DeviceInfo,
  type VolumeState,
  type NowPlaying,
  type Preset,
  type Zone,
  type ZoneMember,
  type KeyValue,
  type KeyState,
  parseXml,
  buildXml,
} from '@soundtouch/core';

const PROXY_BASE = 'http://localhost:3001/api/device';
const DEFAULT_TIMEOUT = 10000; // 10 seconds for slower operations

// Helper functions for XML parsing
function getTextContent(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (node && typeof node === 'object' && '#text' in node) {
    return String((node as { '#text': unknown })['#text']);
  }
  return '';
}

function getAttribute(node: unknown, attr: string): string | undefined {
  if (node && typeof node === 'object') {
    const key = `@_${attr}`;
    if (key in node) {
      return String((node as Record<string, unknown>)[key]);
    }
  }
  return undefined;
}

export class ProxySoundTouchClient {
  private baseUrl: string;
  private deviceIp: string;

  constructor(deviceIp: string) {
    this.deviceIp = deviceIp;
    this.baseUrl = `${PROXY_BASE}/${deviceIp}`;
  }

  private async request(method: 'GET' | 'POST', endpoint: string, body?: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/xml',
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - device may be slow to respond');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async get(endpoint: string): Promise<string> {
    return this.request('GET', endpoint);
  }

  private async post(endpoint: string, body: string): Promise<string> {
    return this.request('POST', endpoint, body);
  }

  async getInfo(): Promise<DeviceInfo> {
    const xml = await this.get('/info');
    const parsed = parseXml<{ info: Record<string, unknown> }>(xml);
    const info = parsed.info;

    const components: DeviceInfo['components'] = [];
    const rawComponents = info.components as { component: unknown[] | unknown } | undefined;
    if (rawComponents?.component) {
      const compArray = Array.isArray(rawComponents.component)
        ? rawComponents.component
        : [rawComponents.component];
      for (const comp of compArray) {
        const c = comp as Record<string, unknown>;
        components.push({
          componentCategory: getTextContent(c.componentCategory),
          softwareVersion: getTextContent(c.softwareVersion),
          serialNumber: getTextContent(c.serialNumber),
        });
      }
    }

    const networkInfo: DeviceInfo['networkInfo'] = [];
    const rawNetworkInfo = info.networkInfo as unknown[] | unknown;
    const netArray = Array.isArray(rawNetworkInfo) ? rawNetworkInfo : [rawNetworkInfo];
    for (const net of netArray) {
      if (net) {
        const n = net as Record<string, unknown>;
        networkInfo.push({
          type: getAttribute(n, 'type') ?? '',
          macAddress: getTextContent(n.macAddress),
          ipAddress: getTextContent(n.ipAddress),
        });
      }
    }

    return {
      deviceID: getAttribute(info, 'deviceID') ?? '',
      name: getTextContent(info.name),
      type: getTextContent(info.type),
      margeAccountUUID: getTextContent(info.margeAccountUUID),
      components,
      networkInfo,
      margeURL: getTextContent(info.margeURL),
    };
  }

  async getVolume(): Promise<VolumeState> {
    const xml = await this.get('/volume');
    const parsed = parseXml<{ volume: Record<string, unknown> }>(xml);
    const vol = parsed.volume;

    return {
      targetVolume: Number(getTextContent(vol.targetvolume)) || 0,
      actualVolume: Number(getTextContent(vol.actualvolume)) || 0,
      // Handle both boolean (from fast-xml-parser) and string values
      muteEnabled: vol.muteenabled === true || vol.muteenabled === 'true',
    };
  }

  async setVolume(level: number): Promise<void> {
    const xml = buildXml({ volume: level });
    await this.post('/volume', xml);
  }

  async getNowPlaying(): Promise<NowPlaying> {
    const xml = await this.get('/nowPlaying');
    const parsed = parseXml<{ nowPlaying: Record<string, unknown> }>(xml);
    const np = parsed.nowPlaying;

    let contentItem;
    const rawContentItem = np.ContentItem as Record<string, unknown> | undefined;
    if (rawContentItem) {
      contentItem = {
        source: getAttribute(rawContentItem, 'source') ?? '',
        location: getAttribute(rawContentItem, 'location'),
        sourceAccount: getAttribute(rawContentItem, 'sourceAccount'),
        isPresetable: getAttribute(rawContentItem, 'isPresetable') === 'true',
        itemName: getTextContent(rawContentItem.itemName),
      };
    }

    const art = np.art as Record<string, unknown> | undefined;

    return {
      deviceID: getAttribute(np, 'deviceID') ?? '',
      source: getAttribute(np, 'source') ?? '',
      contentItem,
      track: getTextContent(np.track) || undefined,
      artist: getTextContent(np.artist) || undefined,
      album: getTextContent(np.album) || undefined,
      stationName: getTextContent(np.stationName) || undefined,
      art: art ? getTextContent(art) : undefined,
      artImageStatus: art ? (getAttribute(art, 'artImageStatus') as any) : undefined,
      playStatus: (getTextContent(np.playStatus) as any) || 'INVALID_PLAY_STATUS',
      shuffleSetting: getTextContent(np.shuffleSetting) || undefined,
      repeatSetting: getTextContent(np.repeatSetting) || undefined,
    };
  }

  async getPresets(): Promise<Preset[]> {
    const xml = await this.get('/presets');
    const parsed = parseXml<{ presets: { preset?: unknown | unknown[] } }>(xml);
    const presets: Preset[] = [];

    if (parsed.presets?.preset) {
      const presetArray = Array.isArray(parsed.presets.preset)
        ? parsed.presets.preset
        : [parsed.presets.preset];

      for (const p of presetArray) {
        const preset = p as Record<string, unknown>;
        const rawContentItem = preset.ContentItem as Record<string, unknown>;

        if (rawContentItem) {
          presets.push({
            id: Number(getAttribute(preset, 'id')) || 0,
            createdOn: Number(getAttribute(preset, 'createdOn')) || undefined,
            updatedOn: Number(getAttribute(preset, 'updatedOn')) || undefined,
            contentItem: {
              source: getAttribute(rawContentItem, 'source') ?? '',
              location: getAttribute(rawContentItem, 'location'),
              sourceAccount: getAttribute(rawContentItem, 'sourceAccount'),
              isPresetable: getAttribute(rawContentItem, 'isPresetable') === 'true',
              itemName: getTextContent(rawContentItem.itemName),
            },
          });
        }
      }
    }

    return presets;
  }

  async getZone(): Promise<Zone | null> {
    const xml = await this.get('/getZone');
    const parsed = parseXml<{ zone: Record<string, unknown> }>(xml);
    const zone = parsed.zone;

    if (!zone) return null;

    const masterMAC = getAttribute(zone, 'master') ?? '';
    if (!masterMAC) return null;

    const members: ZoneMember[] = [];
    const rawMembers = zone.member as unknown[] | unknown;
    if (rawMembers) {
      const memberArray = Array.isArray(rawMembers) ? rawMembers : [rawMembers];
      for (const m of memberArray) {
        const member = m as Record<string, unknown>;
        members.push({
          ipAddress: getAttribute(member, 'ipaddress') ?? '',
          macAddress: getTextContent(member),
        });
      }
    }

    return { masterMAC, members };
  }

  async sendKey(key: KeyValue, state: KeyState = 'press'): Promise<void> {
    const xml = buildXml({
      key: {
        '@_state': state,
        '@_sender': 'Gabbo',
        '#text': key,
      },
    });
    // Key endpoint might return 400 but still execute the command
    try {
      await this.post('/key', xml);
    } catch (error) {
      // Ignore 400 errors for key commands - device often returns 400 but executes
      if (error instanceof Error && !error.message.includes('400')) {
        throw error;
      }
    }
  }

  async pressKey(key: KeyValue): Promise<void> {
    await this.sendKey(key, 'press');
    // Small delay between press and release
    await new Promise(resolve => setTimeout(resolve, 100));
    // Release can fail on some devices, ignore errors
    try {
      await this.sendKey(key, 'release');
    } catch {
      // Ignore release errors - press is what matters
    }
  }

  async play(): Promise<void> { await this.pressKey('PLAY'); }
  async pause(): Promise<void> { await this.pressKey('PAUSE'); }
  async playPause(): Promise<void> { await this.pressKey('PLAY_PAUSE'); }
  async stop(): Promise<void> { await this.pressKey('STOP'); }
  async nextTrack(): Promise<void> { await this.pressKey('NEXT_TRACK'); }
  async prevTrack(): Promise<void> { await this.pressKey('PREV_TRACK'); }
  async power(): Promise<void> { await this.pressKey('POWER'); }
  // Mute is a toggle - only send press, no release needed
  async mute(): Promise<void> { await this.sendKey('MUTE', 'press'); }
  async selectPreset(id: 1|2|3|4|5|6): Promise<void> { await this.pressKey(`PRESET_${id}` as KeyValue); }

  async setZone(masterMAC: string, senderIP: string, members: ZoneMember[]): Promise<void> {
    const memberXml = members.map((m) => ({
      '@_ipaddress': m.ipAddress,
      '#text': m.macAddress,
    }));

    const xml = buildXml({
      zone: {
        '@_master': masterMAC,
        '@_senderIPAddress': senderIP,
        member: memberXml,
      },
    });
    await this.post('/setZone', xml);
  }

  async addZoneSlave(masterMAC: string, slaveIP: string, slaveMAC: string): Promise<void> {
    const xml = buildXml({
      zone: {
        '@_master': masterMAC,
        member: {
          '@_ipaddress': slaveIP,
          '#text': slaveMAC,
        },
      },
    });
    await this.post('/addZoneSlave', xml);
  }

  async removeZoneSlave(masterMAC: string, slaveIP: string, slaveMAC: string): Promise<void> {
    const xml = buildXml({
      zone: {
        '@_master': masterMAC,
        member: {
          '@_ipaddress': slaveIP,
          '#text': slaveMAC,
        },
      },
    });
    await this.post('/removeZoneSlave', xml);
  }
}

// Scan for devices through proxy
export async function scanDevices(
  ips: string[],
  onFound?: (device: { id: string; name: string; ip: string; type: string }) => void
): Promise<Array<{ id: string; name: string; ip: string; port: number; type: string }>> {
  const devices: Array<{ id: string; name: string; ip: string; port: number; type: string }> = [];

  await Promise.all(
    ips.map(async (ip) => {
      try {
        const client = new ProxySoundTouchClient(ip);
        const info = await client.getInfo();

        const device = {
          id: info.deviceID,
          name: info.name,
          ip,
          port: 8090,
          type: info.type,
        };

        devices.push(device);
        onFound?.(device);
      } catch {
        // Device not found
      }
    })
  );

  return devices;
}
