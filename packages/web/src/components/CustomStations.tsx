import { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Play,
  Pencil,
  Trash2,
  Save,
  X,
  Music,
  Loader2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { useSelectedDevice } from '../store';

// Types
interface CustomStation {
  id: string;
  name: string;
  streamUrl: string;
  imageUrl: string;
  type: 'radio' | 'playlist';
  category: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = 'http://localhost:3001';

export function CustomStations() {
  const selectedDevice = useSelectedDevice();
  const [stations, setStations] = useState<CustomStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<CustomStation | null>(null);
  const [playingStation, setPlayingStation] = useState<string | null>(null);
  const [savingToPreset, setSavingToPreset] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    streamUrl: '',
    imageUrl: '',
    type: 'radio' as 'radio' | 'playlist',
    category: '',
  });

  // Load stations
  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/stations`);
      if (!response.ok) throw new Error('Failed to load stations');
      const data = await response.json();
      setStations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingStation
        ? `${API_BASE}/api/stations/${editingStation.id}`
        : `${API_BASE}/api/stations`;

      const response = await fetch(url, {
        method: editingStation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save station');

      await loadStations();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save station');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this station?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/stations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete station');
      await loadStations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete station');
    }
  };

  const handlePlay = async (station: CustomStation) => {
    if (!selectedDevice) {
      setError('Please select a device first');
      return;
    }

    try {
      setPlayingStation(station.id);
      const response = await fetch(
        `${API_BASE}/api/device/${selectedDevice.ip}/playCustomStation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stationId: station.id }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to play station');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play station');
    } finally {
      setPlayingStation(null);
    }
  };

  const handleSaveToPreset = async (station: CustomStation, presetId: number) => {
    if (!selectedDevice) {
      setError('Please select a device first');
      return;
    }

    try {
      setSavingToPreset(station.id);
      const response = await fetch(
        `${API_BASE}/api/device/${selectedDevice.ip}/storeCustomPreset`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stationId: station.id, presetId }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save preset');
      }

      setError(null);
      alert(`Saved "${station.name}" to Preset ${presetId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preset');
    } finally {
      setSavingToPreset(null);
    }
  };

  const openEditForm = (station: CustomStation) => {
    setEditingStation(station);
    setFormData({
      name: station.name,
      streamUrl: station.streamUrl,
      imageUrl: station.imageUrl,
      type: station.type,
      category: station.category,
    });
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingStation(null);
    setFormData({
      name: '',
      streamUrl: '',
      imageUrl: '',
      type: 'radio',
      category: '',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingStation(null);
    setFormData({
      name: '',
      streamUrl: '',
      imageUrl: '',
      type: 'radio',
      category: '',
    });
  };

  return (
    <div className="bg-bose-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <Radio size={16} />
          Custom Stations
        </h3>
        <button
          onClick={openNewForm}
          className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-1"
        >
          <Plus size={14} />
          Add Station
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Station Form */}
      {isFormOpen && (
        <div className="mb-4 p-4 bg-bose-800 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-3">
            {editingStation ? 'Edit Station' : 'New Station'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-bose-700 border border-bose-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="Radio Station Name"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Stream URL * (must be HTTP)</label>
              <input
                type="url"
                required
                value={formData.streamUrl}
                onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                className="w-full px-3 py-2 bg-bose-700 border border-bose-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="http://stream.example.com/live.mp3"
              />
              <p className="text-xs text-gray-500 mt-1">
                SoundTouch only supports HTTP streams, not HTTPS
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Image URL (optional)</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-3 py-2 bg-bose-700 border border-bose-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="http://example.com/logo.png"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as 'radio' | 'playlist' })
                  }
                  className="w-full px-3 py-2 bg-bose-700 border border-bose-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="radio">Live Radio</option>
                  <option value="playlist">Playlist/On-demand</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-bose-700 border border-bose-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Music, News, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Save size={14} />
                {editingStation ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 bg-bose-700 hover:bg-bose-600 text-gray-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Station List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-500" />
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Music size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No custom stations yet</p>
          <p className="text-xs mt-1">Add your first station to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stations.map((station) => (
            <div
              key={station.id}
              className="p-3 bg-bose-800 rounded-lg hover:bg-bose-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Station Icon/Image */}
                <div className="w-10 h-10 bg-bose-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {station.imageUrl ? (
                    <img
                      src={station.imageUrl}
                      alt={station.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Radio size={20} className="text-gray-500" />
                  )}
                </div>

                {/* Station Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">
                    {station.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {station.type === 'radio' ? 'Live Radio' : 'Playlist'}
                    {station.category && ` - ${station.category}`}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Play Button */}
                  <button
                    onClick={() => handlePlay(station)}
                    disabled={!selectedDevice || playingStation === station.id}
                    className="p-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={selectedDevice ? 'Play' : 'Select a device first'}
                  >
                    {playingStation === station.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>

                  {/* Save to Preset Dropdown */}
                  <div className="relative group">
                    <button
                      disabled={!selectedDevice || savingToPreset === station.id}
                      className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={selectedDevice ? 'Save to Preset' : 'Select a device first'}
                    >
                      {savingToPreset === station.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                    </button>
                    {selectedDevice && (
                      <div className="absolute right-0 top-full mt-1 bg-bose-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
                        <div className="px-3 py-2 text-xs text-gray-400 border-b border-bose-600 whitespace-nowrap">
                          Save to Preset:
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-3">
                          {[1, 2, 3, 4, 5, 6].map((presetId) => (
                            <button
                              key={presetId}
                              onClick={() => handleSaveToPreset(station, presetId)}
                              className="w-8 h-8 bg-bose-600 hover:bg-blue-600 text-white rounded text-sm font-bold transition-colors flex items-center justify-center"
                            >
                              {presetId}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => openEditForm(station)}
                    className="p-2 rounded-lg hover:bg-bose-700 text-gray-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(station.id)}
                    className="p-2 rounded-lg hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-bose-800/50 rounded-lg">
        <p className="text-xs text-gray-500">
          Custom stations use LOCAL_INTERNET_RADIO source. Stream URLs must be HTTP (not HTTPS).
          Save stations to device presets (1-6) for quick access after cloud shutdown.
        </p>
      </div>
    </div>
  );
}
