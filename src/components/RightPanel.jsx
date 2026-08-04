import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore, validateUnit, shelfLimits } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { getUnitType } from '../engine/types.js';
import { doorCountFor } from '../engine/cabinet.js';

// Right parameter panel. Carcass parameters, the interior contents of the
// selected section, and doors as the LAST step — after which the panel closes
// itself (SPEC 4.10).
export default function RightPanel() {
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const openModal = useUiStore((s) => s.openModal);
  const notify = useUiStore((s) => s.notify);
  const clearSelection = useUiStore((s) => s.clearSelection);

  const units = useProjectStore((s) => s.units);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const removeItem = useProjectStore((s) => s.removeItem);
  const updateItem = useProjectStore((s) => s.updateItem);
  const addItem = useProjectStore((s) => s.addItem);
  const redistributeShelves = useProjectStore((s) => s.redistributeShelves);
  const removeUnit = useProjectStore((s) => s.removeUnit);
  const setDoors = useProjectStore((s) => s.setDoors);
  const unitResult = useProjectStore((s) => s.unitResult);
  const profile = useCabinetProfileStore((s) => s.profile);

  const unit = units.find((u) => u.id === selectedUnitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const type = unit ? getUnitType(unit.type) : null;
  const issues = unit && result ? validateUnit(unit, result) : [];
  const items = unit?.params.sections?.[0]?.items || [];
  const shelves = items.filter((i) => i.kind === 'shelf').sort((a, b) => (a.pos_mm || 0) - (b.pos_mm || 0));
  const drawers = items.filter((i) => i.kind === 'drawer');
  const rail = items.find((i) => i.kind === 'hanger');
  const hasDoors = Boolean(unit?.params.doors) && unit.params.doors !== false;

  const addDoors = () => {
    const count = doorCountFor(unit.params.width, profile);
    setDoors(unit.id, { count, hinge: unit.params.hinge || profile.doors.defaultHinge });
    notify(`${count} door${count === 1 ? '' : 's'} added — the unit is complete.`, 'ok');
    closeRightPanel();          // SPEC 4.10: doors are the last step
    clearSelection();
  };

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 z-20 flex flex-col">
      <div className="flex items-center px-3 py-2 border-b border-shell-600">
        <span className="text-xs uppercase tracking-wide text-ink-200">
          {unit ? `${type.label} · ${unit.params.unit_num}` : 'Parameters'}
        </span>
        <span className="flex-1" />
        <button type="button" className="cc-btn-ghost" onClick={closeRightPanel} title="Close panel">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!unit ? (
          <p className="text-sm text-ink-400">Select a unit in the canvas, or add one from the Library.</p>
        ) : (
          <div className="space-y-4">
            {/* ── carcass ── */}
            <div className="grid grid-cols-3 gap-2">
              {[['width', 'Width'], ['height', 'Height'], ['depth', 'Depth']].map(([key, label]) => (
                <div key={key}>
                  <span className="cc-label">{label}</span>
                  <input
                    type="number" className="cc-input" value={unit.params[key]}
                    onChange={(e) => updateUnitParams(unit.id, { [key]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="cc-label">Board (mm)</span>
                <select className="cc-input" value={unit.params.board_t} onChange={(e) => updateUnitParams(unit.id, { board_t: Number(e.target.value) })}>
                  {profile.board.thicknessOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <span className="cc-label">Front (mm)</span>
                <select className="cc-input" value={unit.params.front_t} onChange={(e) => updateUnitParams(unit.id, { front_t: Number(e.target.value) })}>
                  {profile.front.thicknessOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="cc-label">Front type</span>
                <select className="cc-input" value={unit.params.front_type} onChange={(e) => updateUnitParams(unit.id, { front_type: e.target.value })}>
                  {Object.entries(profile.front.types).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <span className="cc-label">Hinge side</span>
                <select
                  className="cc-input" value={unit.params.hinge}
                  disabled={result.derived.doors === 2}
                  onChange={(e) => updateUnitParams(unit.id, { hinge: e.target.value })}
                >
                  <option value="L">Left</option>
                  <option value="R">Right</option>
                </select>
              </div>
            </div>

            <div className="cc-divider" />

            {/* ── interior ── */}
            <div className="flex items-center">
              <span className="text-xs uppercase tracking-wide text-ink-200">Section 1</span>
              <span className="flex-1" />
              <button type="button" className="cc-btn" onClick={() => openModal('add-items')}>+ Add items</button>
            </div>

            {drawers.length > 0 && (
              <div className="text-sm">
                <div className="cc-row">
                  <span className="text-ink-100">{drawers.length} × drawer</span>
                  <span className="text-ink-400 text-xs">
                    {result.derived.szufDl ? `${result.derived.szufSzer} × ${result.derived.szufDl} mm` : 'dropped'}
                  </span>
                </div>
                <div className="cc-row text-xs text-ink-400">
                  <span>Partition (locked, required above the stack)</span>
                  <span>{result.derived.partition_bottom_y ? `${Math.round(result.derived.partition_bottom_y)} mm` : '—'}</span>
                </div>
              </div>
            )}

            {rail && (
              <div className="cc-row text-sm">
                <span className="text-ink-100">Hanger rail</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" className="cc-input w-20 text-right" value={Math.round(rail.pos_mm)}
                    onChange={(e) => updateItem(unit.id, rail.id, { pos_mm: Number(e.target.value) })}
                  />
                  <button type="button" className="cc-btn-ghost" onClick={() => removeItem(unit.id, rail.id)}>×</button>
                </div>
              </div>
            )}

            <div>
              <div className="cc-row">
                <span className="text-sm text-ink-100">Shelves ({shelves.length})</span>
                <div className="flex gap-1">
                  <button
                    type="button" className="cc-btn px-2"
                    title="Add a shelf and space them evenly"
                    onClick={() => {
                      const limits = shelfLimits(unit, profile);
                      const step = (limits.max - limits.min) / (shelves.length + 2);
                      if (step < profile.editor.minShelfGap) { notify('Not enough clear height for another shelf.', 'warn'); return; }
                      addItem(unit.id, { kind: 'shelf', variant: 'fixed', pos_mm: limits.min + 1 });
                      redistributeShelves(unit.id);
                    }}
                  >+</button>
                </div>
              </div>
              <ul className="space-y-1">
                {shelves.map((sh, i) => (
                  <li key={sh.id} className="flex items-center gap-1 text-sm">
                    <span className="text-ink-400 w-6 text-xs">S{i + 1}</span>
                    <input
                      type="number" className="cc-input w-20 text-right" value={Math.round(sh.pos_mm ?? 0)}
                      onChange={(e) => updateItem(unit.id, sh.id, { pos_mm: Number(e.target.value) })}
                    />
                    <select
                      className="cc-input flex-1" value={sh.variant || 'fixed'}
                      onChange={(e) => updateItem(unit.id, sh.id, { variant: e.target.value })}
                    >
                      <option value="fixed">Fixed</option>
                      <option value="pullout">Pull-out</option>
                    </select>
                    <button type="button" className="cc-btn-ghost" onClick={() => removeItem(unit.id, sh.id)} title="Remove shelf">×</button>
                  </li>
                ))}
                {shelves.length === 0 && <li className="text-xs text-ink-400">No shelves yet.</li>}
              </ul>
            </div>

            {issues.length > 0 && (
              <ul className="space-y-1">
                {issues.map((iss, i) => (
                  <li key={i} className={`text-[11px] px-2 py-1 rounded border ${iss.level === 'error'
                    ? 'border-status-danger/50 bg-status-danger/10 text-status-danger'
                    : 'border-status-warn/50 bg-status-warn/10 text-status-warn'}`}
                  >
                    {iss.message}
                  </li>
                ))}
              </ul>
            )}

            <div className="cc-divider" />

            {/* ── doors: the last step ── */}
            <div>
              <div className="cc-row">
                <span className="text-sm text-ink-100">Doors</span>
                <span className="text-xs text-ink-400">
                  {hasDoors ? `${result.derived.doors} fitted` : `${doorCountFor(unit.params.width, profile)} would fit`}
                </span>
              </div>
              {hasDoors ? (
                <button type="button" className="cc-btn w-full" onClick={() => setDoors(unit.id, false)}>Remove doors</button>
              ) : (
                <button type="button" className="cc-btn-gold w-full" onClick={addDoors}>Add doors — finish unit</button>
              )}
            </div>

            <div className="cc-divider" />
            <div className="flex justify-between items-center text-xs text-ink-400">
              <span>{result.totals.pieces_total} pieces · {result.totals.area_m2.toFixed(2)} m²</span>
              <button type="button" className="cc-btn-ghost text-status-danger" onClick={() => { removeUnit(unit.id); clearSelection(); }}>
                Delete unit
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
