import { useMemo } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore, validateUnit, shelfLimits } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { getUnitType } from '../engine/types.js';
import { doorCountFor } from '../engine/cabinet.js';
import { roomWalls } from '../engine/room.js';
import { migrateDesign, resolveUnitDesign } from '../engine/design.js';

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
  const room = useProjectStore((s) => s.project.room);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const removeItem = useProjectStore((s) => s.removeItem);
  const updateItem = useProjectStore((s) => s.updateItem);
  const setShelfPos = useProjectStore((s) => s.setShelfPos);
  const setDrawerHeight = useProjectStore((s) => s.setDrawerHeight);
  const addItem = useProjectStore((s) => s.addItem);
  const redistributeShelves = useProjectStore((s) => s.redistributeShelves);
  const removeUnit = useProjectStore((s) => s.removeUnit);
  const setDoors = useProjectStore((s) => s.setDoors);
  const setUnitWall = useProjectStore((s) => s.setUnitWall);
  const rotateUnit = useProjectStore((s) => s.rotateUnit);
  const assignDoorStyle = useProjectStore((s) => s.assignDoorStyle);
  // Select the STORED value and migrate in a memo: a selector that builds a
  // new object every call makes zustand's snapshot change on every render,
  // which React reports as "Maximum update depth exceeded".
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const unitResult = useProjectStore((s) => s.unitResult);
  const profile = useCabinetProfileStore((s) => s.profile);
  const walls = useMemo(() => roomWalls(room), [room]);

  const unit = units.find((u) => u.id === selectedUnitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const type = unit ? getUnitType(unit.type) : null;
  const issues = unit && result ? validateUnit(unit, result, { room, units }) : [];
  const items = unit?.params.sections?.[0]?.items || [];
  const shelves = items.filter((i) => i.kind === 'shelf').sort((a, b) => (a.pos_mm || 0) - (b.pos_mm || 0));
  // Bottom-up, the same order the engine stacks them in, so D1 in this list is
  // D1 in the cut list.
  const drawers = items.filter((i) => i.kind === 'drawer')
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
  const rail = items.find((i) => i.kind === 'hanger');
  // A drawer unit whose stack comes from a fixed ratio (BUDR) has no editable
  // drawer heights and no removable drawers — it IS its three drawers.
  const ratioDrawers = type?.drawerStyle === 'budr';
  const resolvedDesign = unit ? resolveUnitDesign(unit, design) : null;
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
                    onChange={(e) => {
                      // Growing a unit is a move: it stops at the neighbour, the
                      // end of the wall or the far side of the room, and says so.
                      const { notices } = updateUnitParams(unit.id, { [key]: Number(e.target.value) });
                      for (const n of notices) notify(n, 'warn');
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="cc-label">Wall</span>
                <select
                  className="cc-input"
                  value={unit.position?.wall ?? 0}
                  onChange={(e) => {
                    // A full wall refuses the move; the select snaps back to
                    // the wall the unit is actually on because it is bound to
                    // the stored position, not to what was clicked.
                    const moved = setUnitWall(unit.id, Number(e.target.value));
                    if (moved?.error) notify(moved.error, 'warn');
                  }}
                >
                  {walls.map((w) => (
                    <option key={w.index} value={w.index}>Wall {w.index + 1} · {Math.round(w.width)} mm</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="cc-label">Rotation</span>
                <div className="flex gap-1">
                  <input
                    type="number" className="cc-input w-16 text-right" step={5}
                    title="Angle to the wall (0 = back to wall)"
                    value={Math.round(unit.position?.rotation_deg ?? 0)}
                    onChange={(e) => rotateUnit(unit.id, 'set', Number(e.target.value))}
                  />
                  <button type="button" className="cc-btn px-2" title="Turn 90° clockwise" onClick={() => rotateUnit(unit.id, 'step', 90)}>+90°</button>
                </div>
              </div>
            </div>

            <div className="flex gap-1">
              <button type="button" className="cc-btn flex-1" onClick={() => rotateUnit(unit.id, 'back')}>Back to wall</button>
              <button type="button" className="cc-btn flex-1" onClick={() => rotateUnit(unit.id, 'side')}>Side to wall</button>
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
                <span className="cc-label">Door style</span>
                <select
                  className="cc-input"
                  value={unit.params.door_style_id || ''}
                  onChange={(e) => assignDoorStyle(unit.id, e.target.value || null)}
                >
                  <option value="">Project default</option>
                  {design.doorStyles.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="button" className="cc-btn w-full" onClick={() => openModal('design')}>
                  Design settings…
                </button>
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

            {resolvedDesign?.colour && (
              <div className="cc-row text-[11px] text-ink-400">
                <span>Front colour</span>
                <span className="px-2 py-0.5 rounded border border-shell-600" style={{ background: resolvedDesign.colour.hex }}>
                  {resolvedDesign.colour.name}
                </span>
              </div>
            )}

            {/* ── per-type parameters: only the ones this kit actually has ── */}
            {(type.mount === 'wall' || type.doorExtend || unit.type === 'FRIDGE') && (
              <div className="grid grid-cols-2 gap-2">
                {type.mount === 'wall' && (
                  <div>
                    <span className="cc-label">Mount height</span>
                    <input
                      type="number" className="cc-input" title="Height of the carcass base above the floor"
                      value={Math.round(unit.params.mount_height ?? profile.wallUnit.defaults.mountHeight)}
                      onChange={(e) => updateUnitParams(unit.id, { mount_height: Number(e.target.value) })}
                    />
                  </div>
                )}
                {unit.type === 'FRIDGE' && (
                  <div>
                    <span className="cc-label">Fridge height</span>
                    <input
                      type="number" className="cc-input" title="Inner clearance for the appliance"
                      value={Math.round(unit.params.fridge_h ?? profile.fridgeUnit.defaults.fridgeH)}
                      onChange={(e) => updateUnitParams(unit.id, { fridge_h: Number(e.target.value) })}
                    />
                  </div>
                )}
                {type.doorExtend && (
                  <label className="flex items-end gap-2 pb-1 text-sm text-ink-100">
                    <input
                      type="checkbox"
                      checked={Boolean(unit.params.door_extend)}
                      onChange={(e) => updateUnitParams(unit.id, { door_extend: e.target.checked })}
                    />
                    <span>Door extend +{profile.wallUnit.doorExtend}</span>
                  </label>
                )}
              </div>
            )}

            <div className="cc-divider" />

            {/* ── interior ── */}
            <div className="flex items-center">
              <span className="text-xs uppercase tracking-wide text-ink-200">Section 1</span>
              <span className="flex-1" />
              {/* A fridge housing has no interior to fit out, and a drawer unit
                  IS its drawers — neither offers the modal. */}
              {(type.supports.shelves || type.supports.rail) && (
                <button type="button" className="cc-btn" onClick={() => openModal('add-items')}>+ Add items</button>
              )}
            </div>

            {drawers.length > 0 && (
              <div className="text-sm">
                <div className="cc-row">
                  <span className="text-ink-100">{drawers.length} × drawer</span>
                  <span className="text-ink-400 text-xs">
                    {result.derived.szufDl ? `${result.derived.szufSzer} × ${result.derived.szufDl} mm` : 'dropped'}
                  </span>
                </div>
                {/* Height per drawer, bottom-up. The BOM, the CNC sheet and the
                    3D view all recompute from the engine on every keystroke. */}
                <ul className="space-y-1 mt-1">
                  {drawers.map((dr, i) => (
                    <li key={dr.id} className="flex items-center gap-1">
                      <span className="text-ink-400 w-6 text-xs">D{i + 1}</span>
                      {/* A BUDR's three fronts come from the kit's own 4:3:2
                          split of the carcass height — there is no per-drawer
                          height to set, so the engine's number is SHOWN, not
                          offered as an input that would do nothing. */}
                      {ratioDrawers ? (
                        <span className="cc-input w-20 text-right opacity-70">
                          {Math.round(result.derived.drawer_heights?.[i] ?? 0)}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={profile.wardrobe.drawers.minFrontHeight}
                          max={profile.wardrobe.drawers.maxFrontHeight}
                          step={10}
                          className="cc-input w-20 text-right"
                          title="Drawer front height (mm)"
                          value={Math.round(dr.height_mm ?? profile.wardrobe.drawers.frontHeight)}
                          onChange={(e) => setDrawerHeight(unit.id, dr.id, Number(e.target.value))}
                        />
                      )}
                      <span className="text-[11px] text-ink-400 flex-1">
                        mm front
                        {result.derived.drawer_box_side_h?.[i] != null
                          && ` · box side ${Math.round(result.derived.drawer_box_side_h[i])}`}
                      </span>
                      {!ratioDrawers && (
                        <button
                          type="button" className="cc-btn-ghost" title="Remove this drawer"
                          onClick={() => removeItem(unit.id, dr.id)}
                        >×</button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="cc-row text-xs text-ink-400">
                  <span>Stack height</span>
                  <span>
                    {result.derived.drawerTotalH
                      ? `${Math.round(result.derived.drawerTotalH)} mm`
                      : (ratioDrawers && result.derived.front_heights
                        ? `${Math.round(result.derived.front_heights.reduce((a, b) => a + b, 0)
                          + (result.derived.front_heights.length - 1) * profile.baseDrawerUnit.gap)} mm`
                        : '—')}
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

            {type.supports.shelves && (
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
                    {/* Typed positions go through the SAME clamp as the drag —
                        the field is not a back door around the collision rules. */}
                    <input
                      type="number" className="cc-input w-20 text-right" value={Math.round(sh.pos_mm ?? 0)}
                      onChange={(e) => setShelfPos(unit.id, sh.id, Number(e.target.value))}
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
            )}

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

            {/* ── doors: the last step (a drawer unit has none by design) ── */}
            {type.supports.doors ? (
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
            ) : (
              <p className="text-xs text-ink-400">
                {drawers.length} drawer fronts are the face of this unit — it takes no doors.
              </p>
            )}

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
