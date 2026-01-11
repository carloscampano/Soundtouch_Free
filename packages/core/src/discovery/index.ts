import { Bonjour, type Service } from 'bonjour-service';
import { type SoundTouchDevice } from '../types/index.js';
import { SoundTouchClient } from '../api/client.js';

const SOUNDTOUCH_SERVICE_TYPE = 'soundtouch';
const DEFAULT_DISCOVERY_TIMEOUT = 5000;

export interface DiscoveryOptions {
  timeout?: number;
  onDeviceFound?: (device: SoundTouchDevice) => void;
}

export class SoundTouchDiscovery {
  private bonjour: Bonjour;
  private devices: Map<string, SoundTouchDevice> = new Map();

  constructor() {
    this.bonjour = new Bonjour();
  }

  async discover(options: DiscoveryOptions = {}): Promise<SoundTouchDevice[]> {
    const timeout = options.timeout ?? DEFAULT_DISCOVERY_TIMEOUT;

    return new Promise((resolve) => {
      const browser = this.bonjour.find({ type: SOUNDTOUCH_SERVICE_TYPE });

      browser.on('up', (service: Service) => {
        const device = this.serviceToDevice(service);
        if (device && !this.devices.has(device.id)) {
          this.devices.set(device.id, device);
          options.onDeviceFound?.(device);
        }
      });

      setTimeout(() => {
        browser.stop();
        resolve(Array.from(this.devices.values()));
      }, timeout);
    });
  }

  private serviceToDevice(service: Service): SoundTouchDevice | null {
    if (!service.addresses || service.addresses.length === 0) {
      return null;
    }

    // Prefer IPv4
    const ip = service.addresses.find((addr) => !addr.includes(':')) ?? service.addresses[0];

    return {
      id: service.txt?.MAC ?? service.name,
      name: service.name,
      ip,
      port: service.port,
      type: service.txt?.model ?? 'SoundTouch',
      model: service.txt?.model,
    };
  }

  stop(): void {
    this.bonjour.destroy();
  }

  clearCache(): void {
    this.devices.clear();
  }
}

// Scan network by IP range (fallback method)
export async function scanNetwork(
  baseIp: string,
  startRange: number = 1,
  endRange: number = 254,
  options: { timeout?: number; onDeviceFound?: (device: SoundTouchDevice) => void } = {}
): Promise<SoundTouchDevice[]> {
  const timeout = options.timeout ?? 1000;
  const devices: SoundTouchDevice[] = [];

  // Extract base from IP (e.g., "192.168.1" from "192.168.1.100")
  const parts = baseIp.split('.');
  const base = parts.slice(0, 3).join('.');

  const scanPromises: Promise<void>[] = [];

  for (let i = startRange; i <= endRange; i++) {
    const ip = `${base}.${i}`;
    scanPromises.push(
      (async () => {
        try {
          const client = new SoundTouchClient(ip, 8090, { timeout });
          const info = await client.getInfo();

          const device: SoundTouchDevice = {
            id: info.deviceID,
            name: info.name,
            ip,
            port: 8090,
            type: info.type,
          };

          devices.push(device);
          options.onDeviceFound?.(device);
        } catch {
          // Device not found or not a SoundTouch device
        }
      })()
    );
  }

  // Run in batches to avoid overwhelming the network
  const batchSize = 20;
  for (let i = 0; i < scanPromises.length; i += batchSize) {
    const batch = scanPromises.slice(i, i + batchSize);
    await Promise.all(batch);
  }

  return devices;
}

// Quick scan specific IPs
export async function scanIPs(
  ips: string[],
  options: { timeout?: number; onDeviceFound?: (device: SoundTouchDevice) => void } = {}
): Promise<SoundTouchDevice[]> {
  const timeout = options.timeout ?? 2000;
  const devices: SoundTouchDevice[] = [];

  await Promise.all(
    ips.map(async (ip) => {
      try {
        const client = new SoundTouchClient(ip, 8090, { timeout });
        const info = await client.getInfo();

        const device: SoundTouchDevice = {
          id: info.deviceID,
          name: info.name,
          ip,
          port: 8090,
          type: info.type,
        };

        devices.push(device);
        options.onDeviceFound?.(device);
      } catch {
        // Device not found
      }
    })
  );

  return devices;
}

export function createDiscovery(): SoundTouchDiscovery {
  return new SoundTouchDiscovery();
}
