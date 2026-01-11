#!/usr/bin/env tsx
/**
 * Device Discovery Script
 * Finds Bose SoundTouch devices on the local network
 */

import { SoundTouchDiscovery, scanNetwork } from '../discovery/index.js';
import { SoundTouchClient } from '../api/client.js';
import { networkInterfaces } from 'os';

function getLocalIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netInterface = nets[name];
    if (!netInterface) continue;

    for (const net of netInterface) {
      // Skip internal and non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '192.168.1.1';
}

async function main() {
  console.log('🔍 Searching for Bose SoundTouch devices...\n');

  const localIP = getLocalIP();
  console.log(`📍 Local IP: ${localIP}`);
  console.log(`📡 Network: ${localIP.split('.').slice(0, 3).join('.')}.0/24\n`);

  // Try mDNS discovery first
  console.log('Method 1: mDNS/Bonjour Discovery');
  console.log('─'.repeat(40));

  const discovery = new SoundTouchDiscovery();
  const mdnsDevices = await discovery.discover({
    timeout: 5000,
    onDeviceFound: (device) => {
      console.log(`  ✓ Found: ${device.name} (${device.ip})`);
    },
  });

  discovery.stop();

  if (mdnsDevices.length === 0) {
    console.log('  No devices found via mDNS');
  }

  console.log('\nMethod 2: Network Scan');
  console.log('─'.repeat(40));
  console.log('  Scanning network (this may take a moment)...');

  const scanDevices = await scanNetwork(localIP, 1, 254, {
    timeout: 1500,
    onDeviceFound: (device) => {
      console.log(`  ✓ Found: ${device.name} (${device.ip})`);
    },
  });

  // Combine unique devices
  const allDevices = new Map<string, typeof mdnsDevices[0]>();
  [...mdnsDevices, ...scanDevices].forEach((d) => allDevices.set(d.id, d));

  const devices = Array.from(allDevices.values());

  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Total devices found: ${devices.length}`);
  console.log('═'.repeat(50));

  if (devices.length === 0) {
    console.log('\n⚠️  No devices found. Make sure:');
    console.log('   - Bose SoundTouch devices are powered on');
    console.log('   - Devices are connected to the same network');
    console.log('   - No firewall is blocking port 8090');
    return;
  }

  // Get detailed info for each device
  console.log('\n📱 Device Details:\n');

  for (const device of devices) {
    console.log(`┌─ ${device.name} ─────────────────────────────────`);
    console.log(`│  IP: ${device.ip}`);
    console.log(`│  ID: ${device.id}`);

    try {
      const client = new SoundTouchClient(device.ip);

      // Get device info
      const info = await client.getInfo();
      console.log(`│  Type: ${info.type}`);

      if (info.components.length > 0) {
        console.log(`│  Software: ${info.components[0].softwareVersion}`);
      }

      // Get volume
      const volume = await client.getVolume();
      console.log(`│  Volume: ${volume.actualVolume}% ${volume.muteEnabled ? '(muted)' : ''}`);

      // Get now playing
      const nowPlaying = await client.getNowPlaying();
      if (nowPlaying.source !== 'STANDBY') {
        console.log(`│  Playing: ${nowPlaying.track || nowPlaying.stationName || nowPlaying.source}`);
        if (nowPlaying.artist) {
          console.log(`│  Artist: ${nowPlaying.artist}`);
        }
        console.log(`│  Status: ${nowPlaying.playStatus}`);
      } else {
        console.log(`│  Status: Standby`);
      }

      // Get zone info
      const zone = await client.getZone();
      if (zone && zone.members.length > 1) {
        console.log(`│  Zone: Master with ${zone.members.length - 1} slave(s)`);
      }

      // Get presets
      const presets = await client.getPresets();
      if (presets.length > 0) {
        console.log(`│  Presets: ${presets.map(p => `[${p.id}:${p.contentItem.itemName}]`).join(' ')}`);
      }

    } catch (error) {
      console.log(`│  ⚠️  Could not get details: ${error instanceof Error ? error.message : error}`);
    }

    console.log(`└${'─'.repeat(48)}`);
    console.log('');
  }

  // Output devices as JSON for use in other scripts
  console.log('📋 Devices JSON:');
  console.log(JSON.stringify(devices, null, 2));
}

main().catch(console.error);
