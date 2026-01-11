import { Loader2, Radio } from 'lucide-react';
import { Header } from './components/Header';
import { DeviceCard } from './components/DeviceCard';
import { NowPlaying } from './components/NowPlaying';
import { Presets } from './components/Presets';
import { ZoneManager } from './components/ZoneManager';
import { CustomStations } from './components/CustomStations';
import { useDiscovery } from './hooks/useDiscovery';
import { useWebSocket } from './hooks/useWebSocket';
import { useStore, useSelectedDevice } from './store';

function App() {
  const { devices, isDiscovering, discoveryError } = useDiscovery();
  const selectedDevice = useSelectedDevice();
  const selectDevice = useStore((state) => state.selectDevice);

  // Enable WebSocket connections for real-time updates
  useWebSocket();

  return (
    <div className="min-h-screen bg-bose-950 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {isDiscovering && devices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
            <p className="text-gray-400">Searching for Bose SoundTouch devices...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          </div>
        )}

        {!isDiscovering && devices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Radio size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-400 mb-2">No devices found</p>
            {discoveryError && (
              <p className="text-sm text-red-400 mb-4 max-w-md text-center">
                {discoveryError}
              </p>
            )}
            <p className="text-sm text-gray-500 max-w-md text-center">
              Make sure your Bose SoundTouch devices are powered on and connected to the same network.
              You can also add a device manually using the + button above.
            </p>
          </div>
        )}

        {devices.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Devices List */}
            <div className="lg:col-span-2 space-y-6">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white flex items-center gap-2">
                    <Radio size={20} />
                    Devices
                    <span className="text-sm text-gray-500">({devices.length})</span>
                  </h2>
                  {isDiscovering && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 size={14} className="animate-spin" />
                      Scanning...
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {devices.map((device) => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      isSelected={selectedDevice?.id === device.id}
                      onSelect={() => selectDevice(device.id)}
                    />
                  ))}
                </div>
              </section>
            </div>

            {/* Control Panel */}
            <div className="space-y-4">
              <NowPlaying />
              <Presets />
              <CustomStations />
              <ZoneManager />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-bose-800 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            Bose and SoundTouch are trademarks of Bose Corporation.
          </p>
          <p className="mt-1">
            This is an unofficial controller app and is not affiliated with Bose Corporation.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
