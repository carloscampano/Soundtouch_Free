import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { scanDevices } from '../lib/api';

// Known device IPs from your network - only these will be scanned by default
const KNOWN_IPS = [
  '10.13.5.7',   // Living
  '10.13.5.8',   // Cocina
  '10.13.5.12',  // Baño
  '10.13.5.14',  // Habitacion
  '10.13.5.35',  // Baño Visitas
];

export function useDiscovery() {
  const {
    devices,
    addDevice,
    setDiscovering,
    setDiscoveryError,
    isDiscovering,
    discoveryError,
    initializeDevice,
  } = useStore();

  const abortRef = useRef(false);

  const discoverDevices = useCallback(async () => {
    if (isDiscovering) return;

    setDiscovering(true);
    setDiscoveryError(null);
    abortRef.current = false;

    try {
      // Only scan known IPs to avoid console errors
      await scanDevices(KNOWN_IPS, (device) => {
        addDevice(device);
        initializeDevice(device);
      });
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  }, [isDiscovering, setDiscovering, setDiscoveryError, addDevice, initializeDevice]);

  const stopDiscovery = useCallback(() => {
    abortRef.current = true;
    setDiscovering(false);
  }, [setDiscovering]);

  const addManualDevice = useCallback(
    async (ip: string) => {
      try {
        const foundDevices = await scanDevices([ip], (device) => {
          addDevice(device);
          initializeDevice(device);
        });

        if (foundDevices.length === 0) {
          throw new Error(`No SoundTouch device found at ${ip}`);
        }

        return foundDevices[0];
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to add device');
      }
    },
    [addDevice, initializeDevice]
  );

  // Auto-discover on mount
  useEffect(() => {
    if (devices.length === 0) {
      discoverDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    devices,
    isDiscovering,
    discoveryError,
    discoverDevices,
    stopDiscovery,
    addManualDevice,
  };
}
