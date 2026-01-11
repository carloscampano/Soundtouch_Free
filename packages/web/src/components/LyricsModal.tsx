import { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic2,
  Minus,
  Plus,
  AlertCircle,
  Loader2,
  Music2,
  Radio,
} from 'lucide-react';

interface SyncedLyric {
  time: number; // milliseconds
  text: string;
}

interface LyricsData {
  id: number;
  track: string;
  artist: string;
  album: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: SyncedLyric[];
  hasSyncedLyrics: boolean;
}

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: string | null;
  artist: string | null;
  album?: string | null;
  isPlaying: boolean;
  deviceTime?: {
    current: number; // seconds
    total: number;   // seconds
  };
}

const API_BASE = 'http://localhost:3001';

export function LyricsModal({
  isOpen,
  onClose,
  track,
  artist,
  album,
  isPlaying,
  deviceTime,
}: LyricsModalProps) {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state
  const [offset, setOffset] = useState(0); // Manual sync offset in ms
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Convert device time (seconds) to milliseconds
  const currentTimeMs = deviceTime ? deviceTime.current * 1000 : 0;
  const totalTimeMs = deviceTime ? deviceTime.total * 1000 : 0;

  // Fetch lyrics when modal opens or track changes
  useEffect(() => {
    if (isOpen && track && artist) {
      fetchLyrics();
    }
  }, [isOpen, track, artist]);

  // Update current line based on device time
  useEffect(() => {
    if (!lyrics?.syncedLyrics?.length || !deviceTime) return;

    const adjustedTime = currentTimeMs + offset;
    let newIndex = -1;

    for (let i = lyrics.syncedLyrics.length - 1; i >= 0; i--) {
      if (adjustedTime >= lyrics.syncedLyrics[i].time) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex);
      scrollToLine(newIndex);
    }
  }, [currentTimeMs, offset, lyrics?.syncedLyrics, currentLineIndex]);

  // Reset state when track changes
  useEffect(() => {
    setCurrentLineIndex(-1);
    setOffset(0);
  }, [track, artist]);

  const fetchLyrics = async () => {
    if (!track || !artist) return;

    setIsLoading(true);
    setError(null);
    setLyrics(null);
    setCurrentLineIndex(-1);

    try {
      const params = new URLSearchParams({ track, artist });
      if (album) params.append('album', album);

      const response = await fetch(`${API_BASE}/api/lyrics/search?${params}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('No se encontraron letras para esta canción');
          return;
        }
        throw new Error('Error al buscar letras');
      }

      const data = await response.json();
      setLyrics(data);

      // Initialize line refs
      if (data.syncedLyrics) {
        lineRefs.current = new Array(data.syncedLyrics.length).fill(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const adjustOffset = (delta: number) => {
    setOffset((prev) => prev + delta);
  };

  const scrollToLine = (index: number) => {
    if (index >= 0 && lineRefs.current[index]) {
      lineRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const hasDeviceTime = deviceTime && deviceTime.total > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-bose-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-bose-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-bose-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Mic2 size={24} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Karaoke</h2>
              <p className="text-sm text-gray-400 truncate max-w-[300px]">
                {track} - {artist}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bose-800 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={48} className="animate-spin text-purple-500" />
            </div>
          )}

          {error && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <AlertCircle size={48} className="mb-4 text-gray-500" />
              <p className="text-center">{error}</p>
              <button
                onClick={fetchLyrics}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {lyrics?.instrumental && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <Music2 size={48} className="mb-4 text-gray-500" />
              <p className="text-center">Esta canción es instrumental</p>
            </div>
          )}

          {lyrics && !lyrics.instrumental && (
            <>
              {/* Lyrics Display */}
              <div
                ref={lyricsContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-2"
              >
                {lyrics.hasSyncedLyrics ? (
                  // Synced lyrics (karaoke mode)
                  lyrics.syncedLyrics.map((line, index) => (
                    <div
                      key={index}
                      ref={(el) => (lineRefs.current[index] = el)}
                      className={`py-2 px-4 rounded-lg transition-all duration-300 ${
                        index === currentLineIndex
                          ? 'bg-purple-600/30 text-white text-xl font-semibold scale-105'
                          : index < currentLineIndex
                          ? 'text-gray-500'
                          : 'text-gray-300'
                      }`}
                    >
                      <span className="text-xs text-gray-500 mr-3">
                        {formatTime(line.time)}
                      </span>
                      {line.text}
                    </div>
                  ))
                ) : (
                  // Plain lyrics (no sync)
                  <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {lyrics.plainLyrics || 'Sin letras disponibles'}
                  </div>
                )}
              </div>

              {/* Sync Controls */}
              {lyrics.hasSyncedLyrics && (
                <div className="p-4 border-t border-bose-700 bg-bose-800/50">
                  <div className="flex items-center justify-between gap-4">
                    {/* Sync Status */}
                    <div className="flex items-center gap-2">
                      {hasDeviceTime ? (
                        <>
                          <Radio size={16} className={`${isPlaying ? 'text-green-400 animate-pulse' : 'text-gray-500'}`} />
                          <span className={`text-sm ${isPlaying ? 'text-green-400' : 'text-gray-500'}`}>
                            {isPlaying ? 'Sincronizado' : 'Pausado'}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-yellow-500">
                          Sin datos de tiempo
                        </span>
                      )}
                    </div>

                    {/* Time Display */}
                    <div className="text-center">
                      <div className="text-2xl font-mono text-white">
                        {formatTime(currentTimeMs)}
                      </div>
                      <div className="text-xs text-gray-500">
                        / {formatTime(totalTimeMs || (lyrics.duration || 0) * 1000)}
                      </div>
                    </div>

                    {/* Sync Offset Controls */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Ajuste:</span>
                      <button
                        onClick={() => adjustOffset(-500)}
                        className="p-1.5 rounded hover:bg-bose-700 text-gray-400 hover:text-white transition-colors"
                        title="-0.5s"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-sm text-gray-300 w-16 text-center">
                        {offset >= 0 ? '+' : ''}{(offset / 1000).toFixed(1)}s
                      </span>
                      <button
                        onClick={() => adjustOffset(500)}
                        className="p-1.5 rounded hover:bg-bose-700 text-gray-400 hover:text-white transition-colors"
                        title="+0.5s"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-1 bg-bose-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${isPlaying ? 'bg-purple-500' : 'bg-gray-600'}`}
                      style={{
                        width: `${Math.min(
                          100,
                          (currentTimeMs / (totalTimeMs || (lyrics.duration || 300) * 1000)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-bose-700 text-center">
          <p className="text-xs text-gray-500">
            Letras de{' '}
            <a
              href="https://lrclib.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              LRCLIB
            </a>
            {' '}• Sincronización automática con el dispositivo
          </p>
        </div>
      </div>
    </div>
  );
}
