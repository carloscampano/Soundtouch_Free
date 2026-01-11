import { Volume2, VolumeX, Power, Radio } from 'lucide-react';
import type { SoundTouchDevice } from '@soundtouch/core';
import { useDeviceState } from '../store';
import { useDeviceControl } from '../hooks/useDeviceControl';
import { useZoneControl } from '../hooks/useZoneControl';

interface DeviceCardProps {
  device: SoundTouchDevice;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function DeviceCard({ device, isSelected, onSelect }: DeviceCardProps) {
  const state = useDeviceState(device.id);
  const { toggleMute, power } = useDeviceControl(device.id);
  const { getZoneInfo } = useZoneControl();

  const zoneInfo = getZoneInfo(device.id);
  const isPlaying = state?.nowPlaying?.playStatus === 'PLAY_STATE';
  const isMuted = state?.volume?.muteEnabled ?? false;
  const volume = state?.volume?.actualVolume ?? 0;

  const getStatusColor = () => {
    if (state?.nowPlaying?.source === 'STANDBY') return 'bg-gray-500';
    if (isPlaying) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (!state?.nowPlaying) return 'Loading...';
    if (state.nowPlaying.source === 'STANDBY') return 'Standby';
    if (state.nowPlaying.track) return state.nowPlaying.track;
    if (state.nowPlaying.stationName) return state.nowPlaying.stationName;
    return state.nowPlaying.source;
  };

  return (
    <div
      onClick={onSelect}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-200
        ${isSelected
          ? 'bg-bose-800 ring-2 ring-blue-500 shadow-lg'
          : 'bg-bose-900 hover:bg-bose-800'}
      `}
    >
      {/* Zone indicator */}
      {zoneInfo && zoneInfo.memberCount > 1 && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
          {zoneInfo.isMaster ? 'Master' : 'Grouped'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <h3 className="font-medium text-white truncate">{device.name}</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            power();
          }}
          className="p-1.5 rounded-lg hover:bg-bose-700 transition-colors"
          title="Power"
        >
          <Power size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Now Playing */}
      <div className="text-sm text-gray-400 truncate mb-3">
        {getStatusText()}
        {state?.nowPlaying?.artist && (
          <span className="text-gray-500"> - {state.nowPlaying.artist}</span>
        )}
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          className="p-1 rounded hover:bg-bose-700 transition-colors"
        >
          {isMuted ? (
            <VolumeX size={16} className="text-red-400" />
          ) : (
            <Volume2 size={16} className="text-gray-400" />
          )}
        </button>
        <div className="flex-1 h-1.5 bg-bose-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${isMuted ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${volume}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-8 text-right">{volume}%</span>
      </div>

      {/* Device info */}
      <div className="mt-3 pt-3 border-t border-bose-700 flex items-center justify-between text-xs text-gray-500">
        <span>{device.ip}</span>
        {device.type && (
          <span className="flex items-center gap-1">
            <Radio size={12} />
            {device.type}
          </span>
        )}
      </div>
    </div>
  );
}
