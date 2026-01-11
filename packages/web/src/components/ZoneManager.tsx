import { useState, useEffect } from 'react';
import { Users, Plus, X, Volume2 } from 'lucide-react';
import { useStore, useDevices, useSelectedDevice, useDeviceState } from '../store';
import { useZoneControl } from '../hooks/useZoneControl';

export function ZoneManager() {
  const devices = useDevices();
  const selectedDevice = useSelectedDevice();
  const deviceState = useDeviceState(selectedDevice?.id ?? null);
  const { createZone, playEverywhere, dissolveZone, addToZone, removeFromZone, getZoneInfo, setZoneVolume } =
    useZoneControl();

  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [selectedSlaves, setSelectedSlaves] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Global volume state for zone
  const [globalVolume, setGlobalVolume] = useState(50);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  // Sync global volume with master device volume when not dragging
  useEffect(() => {
    if (!isDraggingVolume && deviceState?.volume?.actualVolume !== undefined) {
      setGlobalVolume(deviceState.volume.actualVolume);
    }
  }, [deviceState?.volume?.actualVolume, isDraggingVolume]);

  if (!selectedDevice) {
    return null;
  }

  const zoneInfo = getZoneInfo(selectedDevice.id);
  const availableSlaves = devices.filter((d) => d.id !== selectedDevice.id);

  const handlePlayEverywhere = async () => {
    try {
      setError(null);
      await playEverywhere(selectedDevice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create zone');
    }
  };

  const handleDissolveZone = async () => {
    try {
      setError(null);
      await dissolveZone(selectedDevice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dissolve zone');
    }
  };

  const handleCreateZone = async () => {
    if (selectedSlaves.size === 0) {
      setError('Select at least one device to group');
      return;
    }

    try {
      setError(null);
      const slaves = devices.filter((d) => selectedSlaves.has(d.id));
      await createZone(selectedDevice, slaves);
      setIsCreatingZone(false);
      setSelectedSlaves(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create zone');
    }
  };

  const handleRemoveFromZone = async (slaveId: string) => {
    const slave = devices.find((d) => d.id === slaveId);
    if (!slave) return;

    try {
      setError(null);
      await removeFromZone(selectedDevice, slave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from zone');
    }
  };

  const toggleSlaveSelection = (deviceId: string) => {
    const newSelection = new Set(selectedSlaves);
    if (newSelection.has(deviceId)) {
      newSelection.delete(deviceId);
    } else {
      newSelection.add(deviceId);
    }
    setSelectedSlaves(newSelection);
  };

  return (
    <div className="bg-bose-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <Users size={16} />
          Multi-Room Zones
        </h3>

        {devices.length > 1 && !isCreatingZone && (
          <button
            onClick={handlePlayEverywhere}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1"
          >
            <Volume2 size={14} />
            Play Everywhere
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Current Zone */}
      {zoneInfo && zoneInfo.memberCount > 1 && (
        <div className="mb-4 p-3 bg-bose-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              {zoneInfo.isMaster ? 'Zone Master' : 'Grouped'}
            </span>
            {zoneInfo.isMaster && (
              <button
                onClick={handleDissolveZone}
                className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
              >
                Ungroup All
              </button>
            )}
          </div>

          <div className="space-y-1">
            {zoneInfo.isMaster && zoneInfo.slaves.map((slave) => (
              <div
                key={slave.id}
                className="flex items-center justify-between text-sm py-1"
              >
                <span className="text-gray-400">{slave.name}</span>
                <button
                  onClick={() => handleRemoveFromZone(slave.id)}
                  className="p-1 hover:bg-bose-700 rounded transition-colors"
                  title="Remove from zone"
                >
                  <X size={14} className="text-gray-500 hover:text-red-400" />
                </button>
              </div>
            ))}

            {!zoneInfo.isMaster && zoneInfo.master && (
              <div className="text-sm text-gray-400">
                Grouped with: {zoneInfo.master.name}
              </div>
            )}
          </div>

          {/* Global Zone Volume Control - Only show for master */}
          {zoneInfo.isMaster && (
            <div className="mt-4 pt-3 border-t border-bose-700">
              <div className="flex items-center gap-3">
                <Volume2 size={18} className="text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Zone Volume</span>
                    <span className="text-xs text-blue-400 font-medium">{globalVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={globalVolume}
                    onChange={(e) => setGlobalVolume(Number(e.target.value))}
                    onMouseDown={() => setIsDraggingVolume(true)}
                    onMouseUp={() => {
                      setIsDraggingVolume(false);
                      setZoneVolume(selectedDevice.id, globalVolume);
                    }}
                    onTouchStart={() => setIsDraggingVolume(true)}
                    onTouchEnd={() => {
                      setIsDraggingVolume(false);
                      setZoneVolume(selectedDevice.id, globalVolume);
                    }}
                    className="w-full h-2 bg-bose-700 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-blue-500
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:-mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Adjusts volume on all {zoneInfo.memberCount} grouped devices
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Zone UI */}
      {isCreatingZone ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Select devices to group with {selectedDevice.name}:
          </p>

          <div className="space-y-2">
            {availableSlaves.map((device) => (
              <button
                key={device.id}
                onClick={() => toggleSlaveSelection(device.id)}
                className={`
                  w-full p-2 rounded-lg text-left text-sm transition-colors flex items-center gap-2
                  ${selectedSlaves.has(device.id)
                    ? 'bg-blue-600/20 border border-blue-500 text-white'
                    : 'bg-bose-800 hover:bg-bose-700 text-gray-300'}
                `}
              >
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center
                    ${selectedSlaves.has(device.id)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-500'}`}
                >
                  {selectedSlaves.has(device.id) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  )}
                </div>
                {device.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateZone}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
            >
              Create Zone
            </button>
            <button
              onClick={() => {
                setIsCreatingZone(false);
                setSelectedSlaves(new Set());
                setError(null);
              }}
              className="px-3 py-2 bg-bose-800 hover:bg-bose-700 text-gray-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        availableSlaves.length > 0 &&
        (!zoneInfo || zoneInfo.memberCount <= 1) && (
          <button
            onClick={() => setIsCreatingZone(true)}
            className="w-full p-3 rounded-lg border-2 border-dashed border-bose-700 hover:border-bose-600 text-gray-500 hover:text-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Create Zone
          </button>
        )
      )}

      {availableSlaves.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-2">
          Only one device found. Add more SoundTouch devices to create zones.
        </p>
      )}
    </div>
  );
}
