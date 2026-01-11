import { useCallback } from 'react';
import { useStore } from '../store';
import type { KeyValue } from '@soundtouch/core';

export function useDeviceControl(deviceId: string | null) {
  const getClient = useStore((state) => state.getClient);
  const refreshDeviceState = useStore((state) => state.refreshDeviceState);

  const client = deviceId ? getClient(deviceId) : undefined;

  const setVolume = useCallback(
    async (level: number) => {
      if (!client || !deviceId) return;
      try {
        await client.setVolume(level);
        setTimeout(() => refreshDeviceState(deviceId), 200);
      } catch (error) {
        console.error('setVolume failed:', error);
      }
    },
    [client, deviceId, refreshDeviceState]
  );

  const toggleMute = useCallback(async () => {
    if (!client || !deviceId) return;
    try {
      await client.mute();
      setTimeout(() => refreshDeviceState(deviceId), 200);
    } catch (error) {
      console.error('toggleMute failed:', error);
    }
  }, [client, deviceId, refreshDeviceState]);

  const play = useCallback(async () => {
    if (!client || !deviceId) return;
    try {
      await client.play();
      setTimeout(() => refreshDeviceState(deviceId), 300);
    } catch (error) {
      console.error('play failed:', error);
    }
  }, [client, deviceId, refreshDeviceState]);

  const pause = useCallback(async () => {
    if (!client || !deviceId) return;
    try {
      await client.pause();
      setTimeout(() => refreshDeviceState(deviceId), 300);
    } catch (error) {
      console.error('pause failed:', error);
    }
  }, [client, deviceId, refreshDeviceState]);

  const playPause = useCallback(async () => {
    if (!client || !deviceId) return;
    try {
      await client.playPause();
      setTimeout(() => refreshDeviceState(deviceId), 300);
    } catch (error) {
      console.error('playPause failed:', error);
    }
  }, [client, deviceId, refreshDeviceState]);

  const nextTrack = useCallback(async () => {
    if (!client || !deviceId) return;
    try {
      await client.nextTrack();
      setTimeout(() => refreshDeviceState(deviceId), 500);
    } catch (error) {
      console.error('nextTrack failed:', error);
    }
  }, [client, deviceId, refreshDeviceState]);

  const prevTrack = useCallback(async () => {
    if (!client || !deviceId) return;
    try {
      await client.prevTrack();
      setTimeout(() => refreshDeviceState(deviceId), 500);
    } catch (error) {
      console.error('prevTrack failed:', error);
    }
  }, [client, deviceId, refreshDeviceState]);

  const power = useCallback(async () => {
    if (!client || !deviceId) return;
    try {
      await client.power();
      setTimeout(() => refreshDeviceState(deviceId), 500);
    } catch (error) {
      console.error('power failed:', error);
    }
  }, [client, deviceId, refreshDeviceState]);

  const selectPreset = useCallback(
    async (presetId: 1 | 2 | 3 | 4 | 5 | 6) => {
      if (!client || !deviceId) return;
      try {
        await client.selectPreset(presetId);
        setTimeout(() => refreshDeviceState(deviceId), 500);
      } catch (error) {
        console.error('selectPreset failed:', error);
      }
    },
    [client, deviceId, refreshDeviceState]
  );

  const sendKey = useCallback(
    async (key: KeyValue) => {
      if (!client || !deviceId) return;
      try {
        await client.pressKey(key);
        setTimeout(() => refreshDeviceState(deviceId), 300);
      } catch (error) {
        console.error('sendKey failed:', error);
      }
    },
    [client, deviceId, refreshDeviceState]
  );

  return {
    setVolume,
    toggleMute,
    play,
    pause,
    playPause,
    nextTrack,
    prevTrack,
    power,
    selectPreset,
    sendKey,
    isReady: !!client,
  };
}
