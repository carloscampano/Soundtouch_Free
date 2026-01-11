import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { parseXml } from '@soundtouch/core';

interface WebSocketConnection {
  ws: WebSocket;
  deviceId: string;
  ip: string;
}

// Parse WebSocket update messages
function parseUpdate(xml: string): { type: string; data: unknown } | null {
  try {
    const parsed = parseXml<{ updates?: { [key: string]: unknown } }>(xml);
    if (parsed.updates) {
      const keys = Object.keys(parsed.updates);
      if (keys.length > 0) {
        const type = keys[0];
        return { type, data: parsed.updates[type] };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function useWebSocket() {
  const devices = useStore((state) => state.devices);
  const refreshDeviceState = useStore((state) => state.refreshDeviceState);
  const connectionsRef = useRef<Map<string, WebSocketConnection>>(new Map());

  const connectDevice = useCallback((deviceId: string, ip: string) => {
    // Don't connect if already connected
    if (connectionsRef.current.has(deviceId)) {
      return;
    }

    try {
      // Connect directly to device WebSocket (works in local network)
      const ws = new WebSocket(`ws://${ip}:8080`, 'gabbo');

      ws.onopen = () => {
        console.log(`WebSocket connected to ${ip}`);
      };

      ws.onmessage = (event) => {
        const update = parseUpdate(event.data);
        if (update) {
          // Refresh device state when we receive an update
          refreshDeviceState(deviceId);
        }
      };

      ws.onerror = () => {
        // Silently handle errors - device might not support WebSocket
      };

      ws.onclose = () => {
        connectionsRef.current.delete(deviceId);
        // Try to reconnect after 5 seconds
        setTimeout(() => {
          const device = devices.find(d => d.id === deviceId);
          if (device) {
            connectDevice(deviceId, ip);
          }
        }, 5000);
      };

      connectionsRef.current.set(deviceId, { ws, deviceId, ip });
    } catch {
      // Silently handle connection errors
    }
  }, [devices, refreshDeviceState]);

  const disconnectDevice = useCallback((deviceId: string) => {
    const connection = connectionsRef.current.get(deviceId);
    if (connection) {
      connection.ws.close();
      connectionsRef.current.delete(deviceId);
    }
  }, []);

  const disconnectAll = useCallback(() => {
    connectionsRef.current.forEach((connection) => {
      connection.ws.close();
    });
    connectionsRef.current.clear();
  }, []);

  // Auto-connect to all devices
  useEffect(() => {
    devices.forEach((device) => {
      if (!connectionsRef.current.has(device.id)) {
        connectDevice(device.id, device.ip);
      }
    });

    // Cleanup connections for removed devices
    connectionsRef.current.forEach((connection, deviceId) => {
      if (!devices.find(d => d.id === deviceId)) {
        disconnectDevice(deviceId);
      }
    });
  }, [devices, connectDevice, disconnectDevice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, [disconnectAll]);

  return {
    connectDevice,
    disconnectDevice,
    disconnectAll,
    connectedCount: connectionsRef.current.size,
  };
}
