/**
 * Browser-compatible discovery module
 * Only uses HTTP scanning (no mDNS)
 */

import { type SoundTouchDevice } from '../types/index.js';
import { SoundTouchClient } from '../api/client.js';

export interface DiscoveryOptions {
  timeout?: number;
  onDeviceFound?: (device: SoundTouchDevice) => void;
}

// Scan network by IP range
export async function scanNetwork(
  baseIp: string,
  startRange: number = 1,
  endRange: number = 254,
  options: DiscoveryOptions = {}
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
  options: DiscoveryOptions = {}
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
