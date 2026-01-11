import { RefreshCw, Plus, Settings, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useDiscovery } from '../hooks/useDiscovery';

export function Header() {
  const { isDiscovering, discoverDevices, addManualDevice } = useDiscovery();
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddManualDevice = async () => {
    if (!manualIp.trim()) {
      setAddError('Please enter an IP address');
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      await addManualDevice(manualIp.trim());
      setManualIp('');
      setShowAddDevice(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add device');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <header className="bg-bose-950 border-b border-bose-800">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">SoundTouch Controller</h1>
            <p className="text-sm text-gray-500">Controller for Bose SoundTouch systems</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={discoverDevices}
              disabled={isDiscovering}
              className="p-2 rounded-lg bg-bose-800 hover:bg-bose-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh devices"
            >
              {isDiscovering ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <RefreshCw size={20} />
              )}
            </button>

            <button
              onClick={() => setShowAddDevice(!showAddDevice)}
              className="p-2 rounded-lg bg-bose-800 hover:bg-bose-700 text-gray-400 hover:text-white transition-colors"
              title="Add device manually"
            >
              <Plus size={20} />
            </button>

            <button
              className="p-2 rounded-lg bg-bose-800 hover:bg-bose-700 text-gray-400 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Add Device Form */}
        {showAddDevice && (
          <div className="mt-4 p-4 bg-bose-900 rounded-lg">
            <h3 className="text-sm font-medium text-white mb-3">Add Device Manually</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="Enter IP address (e.g., 192.168.1.100)"
                className="flex-1 px-3 py-2 bg-bose-800 border border-bose-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddManualDevice}
                disabled={isAdding}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isAdding ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add'
                )}
              </button>
            </div>
            {addError && (
              <p className="mt-2 text-sm text-red-400">{addError}</p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
