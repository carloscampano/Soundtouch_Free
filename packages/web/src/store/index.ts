import { create } from 'zustand';
import type {
  SoundTouchDevice,
  NowPlaying,
  VolumeState,
  Zone,
  Preset,
} from '@soundtouch/core';
import { ProxySoundTouchClient } from '../lib/api';

interface DeviceState {
  nowPlaying: NowPlaying | null;
  volume: VolumeState | null;
  zone: Zone | null;
  presets: Preset[];
  isLoading: boolean;
  error: string | null;
}

interface AppState {
  // Devices
  devices: SoundTouchDevice[];
  selectedDeviceId: string | null;
  deviceStates: Map<string, DeviceState>;
  clients: Map<string, ProxySoundTouchClient>;

  // Discovery
  isDiscovering: boolean;
  discoveryError: string | null;

  // Actions
  setDevices: (devices: SoundTouchDevice[]) => void;
  addDevice: (device: SoundTouchDevice) => void;
  removeDevice: (deviceId: string) => void;
  selectDevice: (deviceId: string | null) => void;
  setDiscovering: (isDiscovering: boolean) => void;
  setDiscoveryError: (error: string | null) => void;

  // Device state actions
  updateDeviceState: (deviceId: string, state: Partial<DeviceState>) => void;
  getDeviceState: (deviceId: string) => DeviceState | undefined;
  getClient: (deviceId: string) => ProxySoundTouchClient | undefined;

  // Initialize device connection
  initializeDevice: (device: SoundTouchDevice) => Promise<void>;
  disconnectDevice: (deviceId: string) => void;
  refreshDeviceState: (deviceId: string) => Promise<void>;
}

const defaultDeviceState: DeviceState = {
  nowPlaying: null,
  volume: null,
  zone: null,
  presets: [],
  isLoading: false,
  error: null,
};

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  devices: [],
  selectedDeviceId: null,
  deviceStates: new Map(),
  clients: new Map(),
  isDiscovering: false,
  discoveryError: null,

  // Actions
  setDevices: (devices) => set({ devices }),

  addDevice: (device) =>
    set((state) => ({
      devices: state.devices.some((d) => d.id === device.id)
        ? state.devices
        : [...state.devices, device],
    })),

  removeDevice: (deviceId) => {
    const { disconnectDevice } = get();
    disconnectDevice(deviceId);
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== deviceId),
      selectedDeviceId: state.selectedDeviceId === deviceId ? null : state.selectedDeviceId,
    }));
  },

  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

  setDiscovering: (isDiscovering) => set({ isDiscovering }),

  setDiscoveryError: (error) => set({ discoveryError: error }),

  updateDeviceState: (deviceId, newState) =>
    set((state) => {
      const currentState = state.deviceStates.get(deviceId) ?? { ...defaultDeviceState };
      const updatedStates = new Map(state.deviceStates);
      updatedStates.set(deviceId, { ...currentState, ...newState });
      return { deviceStates: updatedStates };
    }),

  getDeviceState: (deviceId) => get().deviceStates.get(deviceId),

  getClient: (deviceId) => get().clients.get(deviceId),

  initializeDevice: async (device) => {
    const { clients, updateDeviceState } = get();

    // Create client if not exists
    if (!clients.has(device.id)) {
      const client = new ProxySoundTouchClient(device.ip);
      const newClients = new Map(clients);
      newClients.set(device.id, client);
      set({ clients: newClients });
    }

    // Fetch initial state
    updateDeviceState(device.id, { isLoading: true, error: null });
    await get().refreshDeviceState(device.id);
  },

  disconnectDevice: (deviceId) => {
    const { clients } = get();

    // Remove client
    const newClients = new Map(clients);
    newClients.delete(deviceId);
    set({ clients: newClients });

    // Clear state
    const newStates = new Map(get().deviceStates);
    newStates.delete(deviceId);
    set({ deviceStates: newStates });
  },

  refreshDeviceState: async (deviceId) => {
    const { clients, updateDeviceState } = get();
    const client = clients.get(deviceId);

    if (!client) {
      updateDeviceState(deviceId, { error: 'No client available' });
      return;
    }

    try {
      const [nowPlaying, volume, zone, presets] = await Promise.all([
        client.getNowPlaying().catch(() => null),
        client.getVolume().catch(() => null),
        client.getZone().catch(() => null),
        client.getPresets().catch(() => []),
      ]);

      updateDeviceState(deviceId, {
        nowPlaying,
        volume,
        zone,
        presets,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      updateDeviceState(deviceId, {
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch device state',
      });
    }
  },
}));

// Selectors
export const useDevices = () => useStore((state) => state.devices);
export const useSelectedDevice = () => {
  const devices = useStore((state) => state.devices);
  const selectedId = useStore((state) => state.selectedDeviceId);
  return devices.find((d) => d.id === selectedId) ?? null;
};
export const useDeviceState = (deviceId: string | null) =>
  useStore((state) => (deviceId ? state.deviceStates.get(deviceId) : undefined));
export const useIsDiscovering = () => useStore((state) => state.isDiscovering);
