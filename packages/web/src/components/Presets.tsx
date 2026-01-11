import { Radio } from 'lucide-react';
import { useSelectedDevice, useDeviceState } from '../store';
import { useDeviceControl } from '../hooks/useDeviceControl';

export function Presets() {
  const selectedDevice = useSelectedDevice();
  const state = useDeviceState(selectedDevice?.id ?? null);
  const { selectPreset, isReady } = useDeviceControl(selectedDevice?.id ?? null);

  if (!selectedDevice) {
    return null;
  }

  const presets = state?.presets ?? [];
  const presetSlots = [1, 2, 3, 4, 5, 6] as const;

  return (
    <div className="bg-bose-900 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
        <Radio size={16} />
        Presets
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {presetSlots.map((slot) => {
          const preset = presets.find((p) => p.id === slot);
          const hasPreset = !!preset;

          return (
            <button
              key={slot}
              onClick={() => selectPreset(slot)}
              disabled={!isReady || !hasPreset}
              className={`
                p-3 rounded-lg text-sm transition-all duration-200
                ${hasPreset
                  ? 'bg-bose-800 hover:bg-bose-700 text-white'
                  : 'bg-bose-950 text-gray-600 cursor-not-allowed'}
              `}
              title={preset?.contentItem.itemName ?? `Preset ${slot} (empty)`}
            >
              <div className="font-bold text-lg mb-1">{slot}</div>
              <div className="text-xs truncate">
                {preset?.contentItem.itemName ?? '---'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
