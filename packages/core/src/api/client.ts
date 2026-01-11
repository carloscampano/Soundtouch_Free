import {
  type DeviceInfo,
  type VolumeState,
  type BassState,
  type BassCapabilities,
  type NowPlaying,
  type Preset,
  type SourceItem,
  type Zone,
  type ZoneMember,
  type KeyValue,
  type KeyState,
  type Capability,
  type ContentItem,
  type PlayStatus,
  type ArtStatus,
} from '../types/index.js';
import { parseXml, buildXml, getAttribute, getTextContent } from '../utils/xml-parser.js';

const DEFAULT_PORT = 8090;
const DEFAULT_TIMEOUT = 5000;

export interface ClientOptions {
  timeout?: number;
}

export class SoundTouchClient {
  private baseUrl: string;
  private timeout: number;

  constructor(host: string, port: number = DEFAULT_PORT, options: ClientOptions = {}) {
    this.baseUrl = `http://${host}:${port}`;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  private async request(method: 'GET' | 'POST', endpoint: string, body?: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

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

  // ==================== Device Info ====================

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

  async getName(): Promise<string> {
    const info = await this.getInfo();
    return info.name;
  }

  async setName(name: string): Promise<void> {
    const xml = buildXml({ name });
    await this.post('/name', xml);
  }

  // ==================== Volume ====================

  async getVolume(): Promise<VolumeState> {
    const xml = await this.get('/volume');
    const parsed = parseXml<{ volume: Record<string, unknown> }>(xml);
    const vol = parsed.volume;

    return {
      targetVolume: Number(getTextContent(vol.targetvolume)) || 0,
      actualVolume: Number(getTextContent(vol.actualvolume)) || 0,
      muteEnabled: getTextContent(vol.muteenabled) === 'true',
    };
  }

  async setVolume(level: number, mute?: boolean): Promise<void> {
    const volumeObj: Record<string, unknown> = {
      volume: level,
    };

    if (mute !== undefined) {
      volumeObj.volume = {
        '#text': level,
        muteenabled: mute,
      };
    }

    const xml = buildXml({ volume: level });
    await this.post('/volume', xml);
  }

  async setMute(mute: boolean): Promise<void> {
    const xml = buildXml({
      volume: {
        muteenabled: mute,
      },
    });
    await this.post('/volume', xml);
  }

  // ==================== Bass ====================

  async getBassCapabilities(): Promise<BassCapabilities> {
    const xml = await this.get('/bassCapabilities');
    const parsed = parseXml<{ bassCapabilities: Record<string, unknown> }>(xml);
    const bass = parsed.bassCapabilities;

    return {
      bassAvailable: getTextContent(bass.bassAvailable) === 'true',
      bassMin: Number(getTextContent(bass.bassMin)) || 0,
      bassMax: Number(getTextContent(bass.bassMax)) || 0,
      bassDefault: Number(getTextContent(bass.bassDefault)) || 0,
    };
  }

  async getBass(): Promise<BassState> {
    const xml = await this.get('/bass');
    const parsed = parseXml<{ bass: Record<string, unknown> }>(xml);
    const bass = parsed.bass;

    return {
      targetBass: Number(getTextContent(bass.targetbass)) || 0,
      actualBass: Number(getTextContent(bass.actualbass)) || 0,
    };
  }

  async setBass(level: number): Promise<void> {
    const xml = buildXml({ bass: level });
    await this.post('/bass', xml);
  }

  // ==================== Now Playing ====================

  async getNowPlaying(): Promise<NowPlaying> {
    const xml = await this.get('/nowPlaying');
    const parsed = parseXml<{ nowPlaying: Record<string, unknown> }>(xml);
    const np = parsed.nowPlaying;

    let contentItem: ContentItem | undefined;
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
      artImageStatus: art ? (getAttribute(art, 'artImageStatus') as ArtStatus) : undefined,
      playStatus: (getTextContent(np.playStatus) as PlayStatus) || 'INVALID_PLAY_STATUS',
      description: getTextContent(np.description) || undefined,
      stationLocation: getTextContent(np.stationLocation) || undefined,
    };
  }

  // ==================== Presets ====================

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

    return presets;
  }

  // ==================== Sources ====================

  async getSources(): Promise<SourceItem[]> {
    const xml = await this.get('/sources');
    const parsed = parseXml<{ sources: { sourceItem?: unknown | unknown[] } }>(xml);
    const sources: SourceItem[] = [];

    if (parsed.sources?.sourceItem) {
      const sourceArray = Array.isArray(parsed.sources.sourceItem)
        ? parsed.sources.sourceItem
        : [parsed.sources.sourceItem];

      for (const s of sourceArray) {
        const src = s as Record<string, unknown>;
        sources.push({
          source: getAttribute(src, 'source') ?? '',
          sourceAccount: getAttribute(src, 'sourceAccount') ?? '',
          status: (getAttribute(src, 'status') as 'READY' | 'UNAVAILABLE') ?? 'UNAVAILABLE',
          name: getTextContent(src),
        });
      }
    }

    return sources;
  }

  async selectSource(source: string, sourceAccount?: string): Promise<void> {
    const contentItem: Record<string, unknown> = {
      '@_source': source,
    };
    if (sourceAccount) {
      contentItem['@_sourceAccount'] = sourceAccount;
    }

    const xml = buildXml({ ContentItem: contentItem });
    await this.post('/select', xml);
  }

  // ==================== Key Press ====================

  async sendKey(key: KeyValue, state: KeyState = 'press'): Promise<void> {
    const xml = buildXml({
      key: {
        '@_state': state,
        '@_sender': 'SoundTouchController',
        '#text': key,
      },
    });
    await this.post('/key', xml);
  }

  async pressKey(key: KeyValue): Promise<void> {
    await this.sendKey(key, 'press');
    await this.sendKey(key, 'release');
  }

  async play(): Promise<void> {
    await this.pressKey('PLAY');
  }

  async pause(): Promise<void> {
    await this.pressKey('PAUSE');
  }

  async playPause(): Promise<void> {
    await this.pressKey('PLAY_PAUSE');
  }

  async stop(): Promise<void> {
    await this.pressKey('STOP');
  }

  async nextTrack(): Promise<void> {
    await this.pressKey('NEXT_TRACK');
  }

  async prevTrack(): Promise<void> {
    await this.pressKey('PREV_TRACK');
  }

  async power(): Promise<void> {
    await this.pressKey('POWER');
  }

  async mute(): Promise<void> {
    await this.pressKey('MUTE');
  }

  async volumeUp(): Promise<void> {
    await this.pressKey('VOLUME_UP');
  }

  async volumeDown(): Promise<void> {
    await this.pressKey('VOLUME_DOWN');
  }

  async selectPreset(presetId: 1 | 2 | 3 | 4 | 5 | 6): Promise<void> {
    await this.pressKey(`PRESET_${presetId}` as KeyValue);
  }

  // ==================== Zone (Multi-room) ====================

  async getZone(): Promise<Zone | null> {
    const xml = await this.get('/getZone');
    const parsed = parseXml<{ zone: Record<string, unknown> }>(xml);
    const zone = parsed.zone;

    if (!zone) {
      return null;
    }

    const masterMAC = getAttribute(zone, 'master') ?? '';
    if (!masterMAC) {
      return null;
    }

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

    return {
      masterMAC,
      members,
    };
  }

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

  // ==================== Capabilities ====================

  async getCapabilities(): Promise<Capability[]> {
    const xml = await this.get('/capabilities');
    const parsed = parseXml<{ capabilities: { capability?: unknown | unknown[] } }>(xml);
    const capabilities: Capability[] = [];

    if (parsed.capabilities?.capability) {
      const capArray = Array.isArray(parsed.capabilities.capability)
        ? parsed.capabilities.capability
        : [parsed.capabilities.capability];

      for (const c of capArray) {
        const cap = c as Record<string, unknown>;
        capabilities.push({
          name: getAttribute(cap, 'name') ?? '',
          url: getAttribute(cap, 'url') ?? '',
          info: getAttribute(cap, 'info'),
        });
      }
    }

    return capabilities;
  }

  // ==================== Static factory methods ====================

  static create(host: string, port?: number, options?: ClientOptions): SoundTouchClient {
    return new SoundTouchClient(host, port, options);
  }
}
