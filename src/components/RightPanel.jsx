import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';

// Right parameter panel — closable; it closes itself once doors are added
// (SPEC 4.10). Interior editing lands on top of this in a later phase.
export default function RightPanel() {
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const units = useProjectStore((s) => s.units);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const unit = units.find((u) => u.id === selectedUnitId) || null;

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-[300px] cc-panel rounded-none border-y-0 border-r-0 z-20 flex flex-col">
      <div className="flex items-center px-3 py-2 border-b border-shell-600">
        <span className="text-xs uppercase tracking-wide text-ink-200">Parameters</span>
        <span className="flex-1" />
        <button type="button" className="cc-btn-ghost" onClick={closeRightPanel} title="Close panel">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!unit ? (
          <p className="text-sm text-ink-400">Select a unit in the canvas.</p>
        ) : (
          <div className="space-y-3">
            {[['width', 'Width'], ['height', 'Height'], ['depth', 'Depth']].map(([key, label]) => (
              <div key={key}>
                <span className="cc-label">{label} (mm)</span>
                <input
                  type="number"
                  className="cc-input"
                  value={unit.params[key]}
                  onChange={(e) => updateUnitParams(unit.id, { [key]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
