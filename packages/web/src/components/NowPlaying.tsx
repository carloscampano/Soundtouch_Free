import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Music,
} from 'lucide-react';
import { useSelectedDevice, useDeviceState } from '../store';
import { useDeviceControl } from '../hooks/useDeviceControl';

export function NowPlaying() {
  const selectedDevice = useSelectedDevice();
  const state = useDeviceState(selectedDevice?.id ?? null);
  const {
    playPause,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    sendKey,
    isReady,
  } = useDeviceControl(selectedDevice?.id ?? null);

  // Extract values (with defaults for when state is not available)
  const nowPlaying = state?.nowPlaying;
  const volume = state?.volume;
  const deviceVolume = volume?.actualVolume ?? 0;

  // Local state for smooth slider movement - must be before any conditional returns
  const [localVolume, setLocalVolume] = useState(deviceVolume);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingVolume, setPendingVolume] = useState<number | null>(null);

  // Sync local volume with device volume when not dragging and no pending update
  useEffect(() => {
    if (!isDragging && pendingVolume === null) {
      setLocalVolume(deviceVolume);
    }
    // Clear pending state when device confirms the new volume (within tolerance)
    if (pendingVolume !== null && Math.abs(deviceVolume - pendingVolume) <= 2) {
      setPendingVolume(null);
    }
  }, [deviceVolume, isDragging, pendingVolume]);

  // Safety timeout to clear pending state if device doesn't confirm
  useEffect(() => {
    if (pendingVolume !== null) {
      const timeout = setTimeout(() => {
        setPendingVolume(null);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [pendingVolume]);

  if (!selectedDevice || !nowPlaying) {
    return (
      <div className="bg-bose-900 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
        <Music size={48} className="mb-4 opacity-50" />
        <p>Select a device to control</p>
      </div>
    );
  }

  const isPlaying = nowPlaying.playStatus === 'PLAY_STATE';
  const isStandby = nowPlaying.source === 'STANDBY';
  const isMuted = volume?.muteEnabled ?? false;

  // Shuffle and repeat states
  const isShuffleOn = nowPlaying.shuffleSetting === 'SHUFFLE_ON';
  const repeatSetting = nowPlaying.repeatSetting; // REPEAT_OFF, REPEAT_ONE, REPEAT_ALL
  const isRepeatOne = repeatSetting === 'REPEAT_ONE';
  const isRepeatAll = repeatSetting === 'REPEAT_ALL';
  const isRepeatActive = isRepeatOne || isRepeatAll;

  // Cycle through repeat modes: OFF -> ALL -> ONE -> OFF
  const handleRepeatClick = () => {
    if (!repeatSetting || repeatSetting === 'REPEAT_OFF') {
      sendKey('REPEAT_ALL');
    } else if (repeatSetting === 'REPEAT_ALL') {
      sendKey('REPEAT_ONE');
    } else {
      sendKey('REPEAT_OFF');
    }
  };

  // Toggle shuffle
  const handleShuffleClick = () => {
    sendKey(isShuffleOn ? 'SHUFFLE_OFF' : 'SHUFFLE_ON');
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVolume(Number(e.target.value));
  };

  const handleVolumeCommit = () => {
    setIsDragging(false);
    if (localVolume !== deviceVolume) {
      setPendingVolume(localVolume);
      setVolume(localVolume);
    }
  };

  return (
    <div className="bg-bose-900 rounded-xl p-6">
      {/* Album Art */}
      <div className="relative aspect-square max-w-[200px] mx-auto mb-6 rounded-lg overflow-hidden bg-bose-800">
        {nowPlaying.art && nowPlaying.artImageStatus === 'IMAGE_PRESENT' ? (
          <img
            src={nowPlaying.art}
            alt="Album art"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={64} className="text-gray-600" />
          </div>
        )}
        {isPlaying && (
          <div className="absolute bottom-2 right-2 bg-green-500 rounded-full p-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-white truncate">
          {isStandby
            ? 'Standby'
            : nowPlaying.track || nowPlaying.stationName || nowPlaying.source}
        </h2>
        {nowPlaying.artist && (
          <p className="text-gray-400 truncate">{nowPlaying.artist}</p>
        )}
        {nowPlaying.album && (
          <p className="text-sm text-gray-500 truncate">{nowPlaying.album}</p>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={handleShuffleClick}
          className={`p-2 rounded-full transition-colors ${
            isShuffleOn
              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
              : 'text-gray-400 hover:bg-bose-800 hover:text-white'
          }`}
          title={isShuffleOn ? 'Shuffle On' : 'Shuffle Off'}
        >
          <Shuffle size={20} />
        </button>

        <button
          onClick={prevTrack}
          disabled={!isReady}
          className="p-2 rounded-full hover:bg-bose-800 transition-colors text-gray-400 hover:text-white disabled:opacity-50"
          title="Previous"
        >
          <SkipBack size={24} />
        </button>

        <button
          onClick={playPause}
          disabled={!isReady}
          className="p-4 rounded-full bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
        </button>

        <button
          onClick={nextTrack}
          disabled={!isReady}
          className="p-2 rounded-full hover:bg-bose-800 transition-colors text-gray-400 hover:text-white disabled:opacity-50"
          title="Next"
        >
          <SkipForward size={24} />
        </button>

        <button
          onClick={handleRepeatClick}
          className={`p-2 rounded-full transition-colors ${
            isRepeatActive
              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
              : 'text-gray-400 hover:bg-bose-800 hover:text-white'
          }`}
          title={isRepeatOne ? 'Repeat One' : isRepeatAll ? 'Repeat All' : 'Repeat Off'}
        >
          {isRepeatOne ? <Repeat1 size={20} /> : <Repeat size={20} />}
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMute}
          className="p-2 rounded-lg hover:bg-bose-800 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX size={20} className="text-red-400" />
          ) : (
            <Volume2 size={20} className="text-gray-400" />
          )}
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={localVolume}
          onChange={handleVolumeChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={handleVolumeCommit}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={handleVolumeCommit}
          className="flex-1 h-2 bg-bose-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:-mt-1"
        />

        <span className="text-sm text-gray-400 w-10 text-right">{localVolume}%</span>
      </div>
    </div>
  );
}
