import { useCallback } from 'react';
import { useStore } from '../store';
import type { SoundTouchDevice } from '@soundtouch/core';

export function useZoneControl() {
  const devices = useStore((state) => state.devices);
  const deviceStates = useStore((state) => state.deviceStates);
  const getClient = useStore((state) => state.getClient);
  const refreshDeviceState = useStore((state) => state.refreshDeviceState);

  // Create a new zone with a master and slaves
  const createZone = useCallback(
    async (master: SoundTouchDevice, slaves: SoundTouchDevice[]) => {
      const client = getClient(master.id);
      if (!client) {
        throw new Error('Master device not connected');
      }

      // Build zone members
      const members = [master, ...slaves].map((device) => ({
        ipAddress: device.ip,
        macAddress: device.id,
      }));

      await client.setZone(master.id, master.ip, members);

      // Refresh all device states
      await Promise.all([master, ...slaves].map((d) => refreshDeviceState(d.id)));
    },
    [getClient, refreshDeviceState]
  );

  // Add a slave to an existing zone
  const addToZone = useCallback(
    async (master: SoundTouchDevice, slave: SoundTouchDevice) => {
      const client = getClient(master.id);
      if (!client) {
        throw new Error('Master device not connected');
      }

      await client.addZoneSlave(master.id, slave.ip, slave.id);

      // Refresh states
      await Promise.all([refreshDeviceState(master.id), refreshDeviceState(slave.id)]);
    },
    [getClient, refreshDeviceState]
  );

  // Remove a slave from a zone
  const removeFromZone = useCallback(
    async (master: SoundTouchDevice, slave: SoundTouchDevice) => {
      const client = getClient(master.id);
      if (!client) {
        throw new Error('Master device not connected');
      }

      await client.removeZoneSlave(master.id, slave.ip, slave.id);

      // Refresh states
      await Promise.all([refreshDeviceState(master.id), refreshDeviceState(slave.id)]);
    },
    [getClient, refreshDeviceState]
  );

  // Play everywhere - create zone with all devices
  const playEverywhere = useCallback(
    async (master: SoundTouchDevice) => {
      const slaves = devices.filter((d) => d.id !== master.id);
      if (slaves.length === 0) {
        throw new Error('No other devices available');
      }
      await createZone(master, slaves);
    },
    [devices, createZone]
  );

  // Dissolve zone - remove all slaves
  const dissolveZone = useCallback(
    async (master: SoundTouchDevice) => {
      const client = getClient(master.id);
      if (!client) {
        throw new Error('Master device not connected');
      }

      const state = deviceStates.get(master.id);
      if (!state?.zone) {
        return;
      }

      // Remove each slave
      const masterMac = master.id;
      const slaves = state.zone.members.filter((m) => m.macAddress !== masterMac);

      for (const slave of slaves) {
        await client.removeZoneSlave(masterMac, slave.ipAddress, slave.macAddress);
      }

      // Refresh all states
      await Promise.all(devices.map((d) => refreshDeviceState(d.id)));
    },
    [devices, deviceStates, getClient, refreshDeviceState]
  );

  // Get zone info for a device
  const getZoneInfo = useCallback(
    (deviceId: string) => {
      const state = deviceStates.get(deviceId);
      if (!state?.zone) {
        return null;
      }

      const zone = state.zone;
      const masterDevice = devices.find((d) => d.id === zone.masterMAC);
      const slaveDevices = zone.members
        .filter((m) => m.macAddress !== zone.masterMAC)
        .map((m) => devices.find((d) => d.id === m.macAddress))
        .filter((d): d is SoundTouchDevice => d !== undefined);

      return {
        master: masterDevice,
        slaves: slaveDevices,
        isMaster: deviceId === zone.masterMAC,
        isSlave: deviceId !== zone.masterMAC && zone.members.some((m) => m.macAddress === deviceId),
        memberCount: zone.members.length,
      };
    },
    [devices, deviceStates]
  );

  // Set volume for all devices in a zone
  const setZoneVolume = useCallback(
    async (masterId: string, volume: number) => {
      const state = deviceStates.get(masterId);
      if (!state?.zone) {
        // No zone, just set volume on the single device
        const client = getClient(masterId);
        if (client) {
          await client.setVolume(volume);
          await refreshDeviceState(masterId);
        }
        return;
      }

      const zone = state.zone;

      // Set volume on all zone members in parallel
      const volumePromises = zone.members.map(async (member) => {
        const device = devices.find((d) => d.id === member.macAddress);
        if (!device) return;

        const client = getClient(device.id);
        if (!client) return;

        try {
          await client.setVolume(volume);
        } catch (error) {
          console.error(`Failed to set volume on ${device.name}:`, error);
        }
      });

      await Promise.all(volumePromises);

      // Refresh all zone member states
      await Promise.all(
        zone.members.map((m) => {
          const device = devices.find((d) => d.id === m.macAddress);
          return device ? refreshDeviceState(device.id) : Promise.resolve();
        })
      );
    },
    [devices, deviceStates, getClient, refreshDeviceState]
  );

  return {
    createZone,
    addToZone,
    removeFromZone,
    playEverywhere,
    dissolveZone,
    getZoneInfo,
    setZoneVolume,
  };
}
