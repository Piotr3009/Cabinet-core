import { useMemo, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore, validateUnit, shelfLimits } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { getUnitType } from '../engine/types.js';
import { doorCountFor } from '../engine/cabinet.js';
import { roomWalls } from '../engine/room.js';
import { migrateDesign, resolveUnitDesign } from '../engine/design.js';
import { drawerRows, hangerOf, shelfRows } from '../engine/items.js';
import NumberField from './NumberField.jsx';
import Section from './Section.jsx';

// Right parameter panel. Carcass parameters, the interior contents of the
// selected section, and doors as the LAST step — after which the panel closes
// itself (SPEC 4.10).
//
// Turn 4 (BACKLOG #10–#14): everything folds into sections, "Add items" is a
// LIST OF TYPES whose settings open inline — no separate modal at all — the
// drawer stack has one height field unless you untick "Equal heights", a new
// item is placed where it cannot collide, and adding internal drawers swings the
// doors open so you can see what you just asked for.
export default function RightPanel() {
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const openModal = useUiStore((s) => s.openModal);
  const notify = useUiStore((s) => s.notify);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const panelOpen = useUiStore((s) => s.panelOpen);
  const togglePanelSection = useUiStore((s) => s.togglePanelSection);
  const addItemKind = useUiStore((s) => s.addItemKind);
  const setAddItemKind = useUiStore((s) => s.setAddItemKind);
  const openFrontsFor = useUiStore((s) => s.openFrontsFor);

  const units = useProjectStore((s) => s.units);
  const room = useProjectStore((s) => s.project.room);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const removeItem = useProjectStore((s) => s.removeItem);
  const updateItem = useProjectStore((s) => s.updateItem);
  const setShelfPos = useProjectStore((s) => s.setShelfPos);
  const setDrawerHeight = useProjectStore((s) => s.setDrawerHeight);
  const setAllDrawerHeights = useProjectStore((s) => s.setAllDrawerHeights);
  const setDrawerEqualHeights = useProjectStore((s) => s.setDrawerEqualHeights);
  const addDrawers = useProjectStore((s) => s.addDrawers);
  const addShelves = useProjectStore((s) => s.addShelves);
  const addHangerRail = useProjectStore((s) => s.addHangerRail);
  const redistributeShelves = useProjectStore((s) => s.redistributeShelves);
  const removeUnit = useProjectStore((s) => s.removeUnit);
  const setDoors = useProjectStore((s) => s.setDoors);
  const setUnitWall = useProjectStore((s) => s.setUnitWall);
  const rotateUnit = useProjectStore((s) => s.rotateUnit);
  const assignDoorStyle = useProjectStore((s) => s.assignDoorStyle);
  const addPlinth = useProjectStore((s) => s.addPlinth);
  const removePlinth = useProjectStore((s) => s.removePlinth);
  const addTopInfill = useProjectStore((s) => s.addTopInfill);
  const removeTopInfill = useProjectStore((s) => s.removeTopInfill);
  const setTopInfill = useProjectStore((s) => s.setTopInfill);
  const fillToCeiling = useProjectStore((s) => s.fillToCeiling);
  const addEndPanel = useProjectStore((s) => s.addEndPanel);
  const removeEndPanel = useProjectStore((s) => s.removeEndPanel);
  const updateEndPanel = useProjectStore((s) => s.updateEndPanel);
  const setEndPanelDefaults = useProjectStore((s) => s.setEndPanelDefaults);
  // Select the STORED value and migrate in a memo: a selector that builds a
  // new object every call makes zustand's snapshot change on every render,
  // which React reports as "Maximum update depth exceeded".
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const unitResult = useProjectStore((s) => s.unitResult);
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const walls = useMemo(() => roomWalls(room), [room]);

  const unit = units.find((u) => u.id === selectedUnitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const type = unit ? getUnitType(unit.type) : null;
  const issues = unit && result ? validateUnit(unit, result, { room, units }) : [];
  const items = unit?.params.sections?.[0]?.items || [];
  // TOP-DOWN, from engine/items.js: the first row of every list below is the
  // piece nearest the ceiling, exactly as the 3D view shows it (BACKLOG #1).
  // Each row keeps the engine's own number, so D1 is still the bottom drawer
  // on the cut list, on the CNC sheet and at the saw.
  const shelves = shelfRows(items);
  const drawers = drawerRows(items);
  const rail = hangerOf(items);
  // A drawer unit whose stack comes from a fixed ratio (BUDR) has no editable
  // drawer heights and no removable drawers — it IS its three drawers.
  const ratioDrawers = type?.drawerStyle === 'budr';
  const equalHeights = unit?.params.drawer_equal_heights !== false;
  const resolvedDesign = unit ? resolveUnitDesign(unit, design) : null;
  const hasDoors = Boolean(unit?.params.doors) && unit.params.doors !== false;
  const DR = profile.wardrobe.drawers;
  const hardware = materials.filter((m) => m.category === 'hardware');

  const addDoors = () => {
    const count = doorCountFor(unit.params.width, profile);
    setDoors(unit.id, { count, hinge: unit.params.hinge || profile.doors.defaultHinge });
    notify(`${count} door${count === 1 ? '' : 's'} added — the unit is complete.`, 'ok');
    closeRightPanel();          // SPEC 4.10: doors are the last step
    clearSelection();
  };

  if (!unit) {
    return (
      <aside className="absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 z-20 flex flex-col">
        <PanelHeader title="Parameters" onClose={closeRightPanel} />
        <p className="p-3 text-sm text-ink-400">Select a unit in the canvas, or open Library in the menu.</p>
      </aside>
    );
  }

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 z-20 flex flex-col">
      <PanelHeader title={`${type.label} · ${unit.params.unit_num}`} onClose={closeRightPanel} />

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {/* ── carcass ── */}
        <Section
          title="Carcass"
          badge={`${Math.round(unit.params.width)} × ${Math.round(unit.params.height)}`}
          open={panelOpen.carcass}
          onToggle={() => togglePanelSection('carcass')}
        >
          <div className="grid grid-cols-3 gap-2">
            {[['width', 'Width'], ['height', 'Height'], ['depth', 'Depth']].map(([key, label]) => (
              <div key={key}>
                <span className="cc-label">{label}</span>
                <NumberField
                  value={unit.params[key]}
                  onCommit={(v) => {
                    // Growing a unit is a move: it stops at the neighbour, the
                    // end of the wall or the far side of the room, and says so.
                    const { notices } = updateUnitParams(unit.id, { [key]: v });
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
                <NumberField
                  className="cc-input w-16 text-right"
                  title="Angle to the wall (0 = back to wall)"
                  value={Math.round(unit.position?.rotation_deg ?? 0)}
                  onCommit={(v) => rotateUnit(unit.id, 'set', v)}
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

          {/* per-type parameters: only the ones this kit actually has */}
          {(type.mount === 'wall' || type.doorExtend || unit.type === 'FRIDGE') && (
            <div className="grid grid-cols-2 gap-2">
              {type.mount === 'wall' && (
                <div>
                  <span className="cc-label">Mount height</span>
                  <NumberField
                    title="Height of the carcass base above the floor"
                    value={Math.round(unit.params.mount_height ?? profile.wallUnit.defaults.mountHeight)}
                    onCommit={(v) => updateUnitParams(unit.id, { mount_height: v })}
                  />
                </div>
              )}
              {unit.type === 'FRIDGE' && (
                <div>
                  <span className="cc-label">Fridge height</span>
                  <NumberField
                    title="Inner clearance for the appliance"
                    value={Math.round(unit.params.fridge_h ?? profile.fridgeUnit.defaults.fridgeH)}
                    onCommit={(v) => updateUnitParams(unit.id, { fridge_h: v })}
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
        </Section>

        {/* ── add items: a list of TYPES, settings inline (BACKLOG #10) ── */}
        {(type.supports.shelves || type.supports.rail || (type.supports.drawers && !ratioDrawers)) && (
          <Section
            title="Add items"
            open={panelOpen.add}
            onToggle={() => togglePanelSection('add')}
            hint="Pick what goes inside — the settings open here, not in a window"
          >
            <AddItems
              unit={unit}
              type={type}
              profile={profile}
              hardware={hardware}
              rail={rail}
              openKind={addItemKind}
              onPick={setAddItemKind}
              onAddDrawers={(count, height) => {
                const before = items.filter((i) => i.kind === 'drawer').length;
                addDrawers(unit.id, count, 'overlay', height);
                // Honest about what the number means: drawers that were already
                // there KEEP the height they were given, so this cannot claim
                // the whole stack is now `height` mm.
                notify(before
                  ? `Stack is ${count} drawer${count === 1 ? '' : 's'} — new ones at ${height} mm, the existing heights kept.`
                  : `${count} × ${height} mm drawer${count === 1 ? '' : 's'} added — the partition above them is automatic.`, 'ok');
                // BACKLOG #13: internal drawers live behind the doors, so the
                // doors get out of the way to show what was just added.
                const fronts = unitResult(unit.id)?.panels.filter((p) => p.part === 'FRONT').map((p) => p.id) || [];
                if (fronts.length) openFrontsFor(unit.id, fronts);
                setAddItemKind(null);
              }}
              onAddShelves={(count) => {
                const { added, requested } = addShelves(unit.id, count);
                if (added === 0) notify('Not enough clear height for another shelf.', 'warn');
                else if (added < requested) notify(`Room for ${added} of ${requested} shelves — the rest would not fit.`, 'warn');
                setAddItemKind(null);
              }}
              onAddRail={(material) => {
                const id = addHangerRail(unit.id, {
                  materialId: material?.id || null,
                  materialLabel: material?.name || null,
                });
                if (!id) { notify('This unit already has a hanging rail.', 'warn'); return; }
                notify(material ? `Hanging rail added — ${material.name}.` : 'Hanging rail added.', 'ok');
                setAddItemKind(null);
              }}
            />
          </Section>
        )}

        {/* ── what is inside ── */}
        <Section
          title="Section 1"
          badge={contentsBadge(drawers.length, shelves.length, Boolean(rail))}
          open={panelOpen.contents}
          onToggle={() => togglePanelSection('contents')}
        >
          {drawers.length === 0 && shelves.length === 0 && !rail && (
            <p className="text-xs text-ink-400">Empty. Use Add items above.</p>
          )}

          {drawers.length > 0 && (
            <div className="text-sm space-y-1">
              <div className="cc-row">
                <span className="text-ink-100">{drawers.length} × drawer</span>
                <span className="text-ink-400 text-xs">
                  {result.derived.szufDl ? `${result.derived.szufSzer} × ${result.derived.szufDl} mm` : 'dropped'}
                </span>
              </div>

              {/* Equal heights ✓ by default: one field for the whole stack
                  (BACKLOG #11). Unticked, every drawer gets its own — listed
                  TOP-DOWN, so the first row is the drawer nearest the ceiling. */}
              {!ratioDrawers && (
                <label className="flex items-center gap-2 text-[12px] text-ink-100">
                  <input
                    type="checkbox"
                    checked={equalHeights}
                    onChange={(e) => setDrawerEqualHeights(unit.id, e.target.checked)}
                  />
                  <span>Equal heights</span>
                </label>
              )}

              {!ratioDrawers && equalHeights ? (
                <div className="flex items-center gap-2">
                  <span className="text-ink-400 w-6 text-xs">all</span>
                  <NumberField
                    min={DR.minFrontHeight}
                    max={DR.maxFrontHeight}
                    className="cc-input w-20 text-right"
                    title="Front height for every drawer (mm) — Enter to apply"
                    value={Math.round(drawers[0]?.item.height_mm ?? DR.frontHeight)}
                    onCommit={(v) => setAllDrawerHeights(unit.id, v)}
                  />
                  <span className="text-[11px] text-ink-400 flex-1">mm front, every drawer</span>
                </div>
              ) : (
                <ul className="space-y-1 mt-1">
                  {drawers.map(({ item: dr, num, label }) => (
                    <li key={dr.id} className="flex items-center gap-1">
                      <span className="text-ink-400 w-6 text-xs">{label}</span>
                      {/* A BUDR's three fronts come from the kit's own 4:3:2
                          split of the carcass height — there is no per-drawer
                          height to set, so the engine's number is SHOWN, not
                          offered as an input that would do nothing. */}
                      {ratioDrawers ? (
                        <span className="cc-input w-20 text-right opacity-70">
                          {Math.round(result.derived.drawer_heights?.[num - 1] ?? 0)}
                        </span>
                      ) : (
                        <NumberField
                          min={DR.minFrontHeight}
                          max={DR.maxFrontHeight}
                          className="cc-input w-20 text-right"
                          title="Drawer front height (mm) — Enter to apply, Escape to undo"
                          value={Math.round(dr.height_mm ?? DR.frontHeight)}
                          onCommit={(v) => setDrawerHeight(unit.id, dr.id, v)}
                        />
                      )}
                      <span className="text-[11px] text-ink-400 flex-1">
                        mm
                        {result.derived.drawer_box_side_h?.[num - 1] != null
                          && ` · box ${Math.round(result.derived.drawer_box_side_h[num - 1])}`}
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
              )}

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
              {result.derived.partition_bottom_y != null && (
                <div className="cc-row text-xs text-ink-400">
                  <span>Partition (locked, required above the stack)</span>
                  <span>{Math.round(result.derived.partition_bottom_y)} mm</span>
                </div>
              )}
            </div>
          )}

          {rail && (
            <div className="cc-row text-sm">
              <div className="flex flex-col">
                <span className="text-ink-100">Hanger rail</span>
                {rail.material_label && <span className="text-[11px] text-ink-400">{rail.material_label}</span>}
              </div>
              <div className="flex items-center gap-1">
                <NumberField
                  className="cc-input w-20 text-right" value={Math.round(rail.pos_mm)}
                  onCommit={(v) => updateItem(unit.id, rail.id, { pos_mm: v })}
                />
                <button type="button" className="cc-btn-ghost" onClick={() => removeItem(unit.id, rail.id)}>×</button>
              </div>
            </div>
          )}

          {type.supports.shelves && shelves.length > 0 && (
            <div>
              <div className="cc-row">
                <span className="text-sm text-ink-100">Shelves ({shelves.length})</span>
                <button
                  type="button" className="cc-btn px-2"
                  title="Space them evenly in the free height"
                  onClick={() => redistributeShelves(unit.id)}
                >
                  Even
                </button>
              </div>
              <ul className="space-y-1">
                {shelves.map(({ item: sh, label }) => (
                  <li key={sh.id} className="flex items-center gap-1 text-sm">
                    <span className="text-ink-400 w-6 text-xs">{label}</span>
                    {/* Typed positions go through the SAME clamp as the drag —
                        the field is not a back door around the collision rules. */}
                    <NumberField
                      className="cc-input w-20 text-right" value={Math.round(sh.pos_mm ?? 0)}
                      onCommit={(v) => setShelfPos(unit.id, sh.id, v)}
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
              </ul>
            </div>
          )}
        </Section>

        {/* ── construction: the pieces you ASK for (BACKLOG #16/#17) ── */}
        <Section
          title="Construction"
          badge={constructionBadge(unit, type)}
          open={panelOpen.construction}
          onToggle={() => togglePanelSection('construction')}
          hint="Plinth, top infill and end panels — added, never assumed"
        >
          {/* plinth */}
          {type.legs && type.mount === 'floor' ? (
            <div className="cc-row">
              <div className="flex flex-col">
                <span className="text-sm text-ink-100">Plinth</span>
                <span className="text-[11px] text-ink-400">
                  {unit.params.plinth
                    ? `${Math.round(result.assemblies.carcass.legHeight)} mm, set back ${profile.autoParts.plinth.setback}`
                    : 'not fitted'}
                </span>
              </div>
              {unit.params.plinth ? (
                <button type="button" className="cc-btn" onClick={() => removePlinth(unit.id)}>Remove</button>
              ) : (
                <button type="button" className="cc-btn" onClick={() => addPlinth(unit.id)}>Add plinth</button>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-ink-400">This type stands on no legs — it takes no plinth.</p>
          )}

          {/* top infill */}
          <div className="cc-row">
            <div className="flex flex-col">
              <span className="text-sm text-ink-100">Top infill</span>
              <span className="text-[11px] text-ink-400">
                {Number(unit.params.top_infill_mm) > 0 ? 'drag its handle, or double-click it to fill' : 'not fitted'}
              </span>
            </div>
            {Number(unit.params.top_infill_mm) > 0 ? (
              <div className="flex items-center gap-1">
                <NumberField
                  className="cc-input w-16 text-right"
                  min={0}
                  value={Math.round(unit.params.top_infill_mm)}
                  onCommit={(v) => setTopInfill(unit.id, v)}
                />
                <button type="button" className="cc-btn px-2" title="All the way to the ceiling" onClick={() => fillToCeiling(unit.id)}>▲</button>
                <button type="button" className="cc-btn-ghost" onClick={() => removeTopInfill(unit.id)}>×</button>
              </div>
            ) : (
              <button
                type="button" className="cc-btn"
                onClick={() => {
                  if (!addTopInfill(unit.id)) notify('No room between this unit and the ceiling.', 'warn');
                }}
              >
                Add top infill
              </button>
            )}
          </div>

          {/* side infill — automatic, and says so */}
          <div className="cc-row text-[11px] text-ink-400">
            <span>Side infill (automatic at the wall)</span>
            <span>
              {[unit.params.side_infill_left_mm, unit.params.side_infill_right_mm]
                .map((v) => (Number(v) > 0 ? `${Math.round(v)}` : '—')).join(' / ')}
            </span>
          </div>

          <div className="cc-divider !my-2" />

          {/* end panels */}
          <EndPanels
            unit={unit}
            profile={profile}
            design={design}
            onAdd={(side) => {
              const { error } = addEndPanel(unit.id, { side });
              if (error) notify(error, 'warn');
            }}
            onUpdate={(id, patch) => updateEndPanel(unit.id, id, patch)}
            onRemove={(id) => removeEndPanel(unit.id, id)}
            onDefaults={setEndPanelDefaults}
          />
        </Section>

        {/* Problems are never folded away — a warning behind a closed section is
            a warning nobody reads. */}
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

        {/* ── doors: the last step (a drawer unit has none by design) ── */}
        <Section
          title="Doors"
          badge={hasDoors ? `${result.derived.doors} fitted` : (type.supports.doors ? 'none yet' : 'n/a')}
          open={panelOpen.doors}
          onToggle={() => togglePanelSection('doors')}
        >
          {type.supports.doors ? (
            <>
              <div className="cc-row text-xs text-ink-400">
                <span>{hasDoors ? 'Fitted' : 'Would fit'}</span>
                <span>{hasDoors ? result.derived.doors : doorCountFor(unit.params.width, profile)}</span>
              </div>
              {hasDoors ? (
                <button type="button" className="cc-btn w-full" onClick={() => setDoors(unit.id, false)}>Remove doors</button>
              ) : (
                <button type="button" className="cc-btn-gold w-full" onClick={addDoors}>Add doors — finish unit</button>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-400">
              {drawers.length} drawer fronts are the face of this unit — it takes no doors.
            </p>
          )}
        </Section>

        <div className="flex justify-between items-center text-xs text-ink-400 pt-1">
          <span>{result.totals.pieces_total} pieces · {result.totals.area_m2.toFixed(2)} m²</span>
          <button type="button" className="cc-btn-ghost text-status-danger" onClick={() => { removeUnit(unit.id); clearSelection(); }}>
            Delete unit
          </button>
        </div>
      </div>
    </aside>
  );
}

function PanelHeader({ title, onClose }) {
  return (
    <div className="flex items-center px-3 py-2 border-b border-shell-600">
      <span className="text-xs uppercase tracking-wide text-ink-200">{title}</span>
      <span className="flex-1" />
      <button type="button" className="cc-btn-ghost" onClick={onClose} title="Close panel">×</button>
    </div>
  );
}

/** What this unit has been given, at a glance on the folded section header. */
function constructionBadge(unit, type) {
  const parts = [];
  if (unit.params.plinth) parts.push('plinth');
  if (Number(unit.params.top_infill_mm) > 0) parts.push('top');
  const ends = (unit.params.end_panels || []).length;
  if (ends) parts.push(`${ends} end`);
  if (!parts.length) return type.legs && type.mount === 'floor' ? 'none' : '';
  return parts.join(' · ');
}

/**
 * End panels (BACKLOG #17). The OPTIONS live here, in the section — not in a
 * modal: height to the floor or to the unit height, thickness (the doors' by
 * default) and "Apply to all end panels", which makes the next one anywhere in
 * the project inherit these settings.
 */
function EndPanels({ unit, profile, design, onAdd, onUpdate, onRemove, onDefaults }) {
  const panels = unit.params.end_panels || [];
  const has = (side) => panels.some((ep) => ep.side === side);
  return (
    <div className="space-y-2">
      <div className="cc-row">
        <span className="text-sm text-ink-100">End panels</span>
        <div className="flex gap-1">
          {[['L', 'Left'], ['R', 'Right']].map(([side, label]) => (
            <button
              key={side}
              type="button"
              className="cc-btn px-2"
              disabled={has(side)}
              title={has(side) ? 'Already fitted on this side' : `Masking panel outside the ${label.toLowerCase()} side`}
              onClick={() => onAdd(side)}
            >
              + {label}
            </button>
          ))}
        </div>
      </div>

      {panels.length === 0 && (
        <p className="text-[11px] text-ink-400">
          None. An end panel masks the outside of a side and is a cut piece in the BOM, the CNC sheet and the DXF.
        </p>
      )}

      <ul className="space-y-1">
        {panels.map((ep) => (
          <li key={ep.id} className="flex items-center gap-1 text-sm">
            <span className="text-ink-400 w-6 text-xs">{ep.side}</span>
            <select
              className="cc-input flex-1"
              value={ep.height}
              onChange={(e) => onUpdate(ep.id, { height: e.target.value })}
            >
              <option value="floor">To floor</option>
              <option value="unit">Unit height</option>
            </select>
            <NumberField
              className="cc-input w-14 text-right"
              min={1}
              title="Thickness (mm)"
              value={Math.round(ep.thickness || unit.params.front_t || profile.front.thickness)}
              onCommit={(v) => onUpdate(ep.id, { thickness: v })}
            />
            <button type="button" className="cc-btn-ghost" title="Remove this end panel" onClick={() => onRemove(ep.id)}>×</button>
          </li>
        ))}
      </ul>

      <label className="flex items-center gap-2 text-[12px] text-ink-100">
        <input
          type="checkbox"
          checked={design.endPanel.applyToAll}
          onChange={(e) => onDefaults({ applyToAll: e.target.checked })}
        />
        <span>Apply to all end panels</span>
      </label>
      <p className="text-[11px] text-ink-400">
        Ticked, the next end panel you add anywhere in this project inherits these settings
        (now: {design.endPanel.height === 'floor' ? 'to floor' : 'unit height'},{' '}
        {Math.round(design.endPanel.thickness || unit.params.front_t || profile.front.thickness)} mm).
      </p>
    </div>
  );
}

function contentsBadge(drawers, shelves, rail) {
  const parts = [];
  if (drawers) parts.push(`${drawers}D`);
  if (shelves) parts.push(`${shelves}S`);
  if (rail) parts.push('rail');
  return parts.join(' · ');
}

/**
 * "Add items" — a list of TYPES. Clicking one opens ITS settings right here
 * (BACKLOG #10: no separate modals). What is not available for this kit is shown
 * disabled with the reason, rather than hidden.
 */
function AddItems({
  unit, type, profile, hardware, rail, openKind, onPick, onAddDrawers, onAddShelves, onAddRail,
}) {
  const DR = profile.wardrobe.drawers;
  const items = unit.params.sections?.[0]?.items || [];
  const existingDrawers = items.filter((i) => i.kind === 'drawer').length;
  const ratioDrawers = type.drawerStyle === 'budr';

  const [drawerCount, setDrawerCount] = useState(existingDrawers || 2);
  const [drawerHeight, setDrawerHeight] = useState(DR.frontHeight);
  const [shelfCount, setShelfCount] = useState(1);
  const [railMaterial, setRailMaterial] = useState(hardware.find((m) => /rail/i.test(m.name))?.id || '');

  const kinds = [
    {
      id: 'drawers',
      label: 'Drawers',
      disabled: !type.supports.drawers || ratioDrawers,
      why: ratioDrawers ? 'this kit IS its three drawers' : 'not for this type',
    },
    { id: 'shelves', label: 'Shelves', disabled: !type.supports.shelves, why: 'not for this type' },
    {
      id: 'hanger',
      label: 'Hanger rail',
      disabled: !type.supports.rail || Boolean(rail),
      why: rail ? 'already fitted' : 'not for this type',
    },
    { id: 'pulldown', label: 'Pull-down rail', disabled: true, soon: true },
  ];

  return (
    <div className="space-y-1">
      {kinds.map((kind) => (
        <div key={kind.id}>
          <button
            type="button"
            disabled={kind.disabled}
            aria-expanded={openKind === kind.id}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-shell-700 ${
              openKind === kind.id ? 'bg-shell-700 text-gold' : 'text-ink-100'}`}
            onClick={() => onPick(kind.id)}
          >
            <span className="flex-1">{kind.label}</span>
            {kind.soon && <span className="cc-tag">soon</span>}
            {kind.disabled && !kind.soon && <span className="text-[10px] text-ink-400">{kind.why}</span>}
            {!kind.disabled && <span className="text-ink-400 text-[10px]" aria-hidden>{openKind === kind.id ? '▾' : '▸'}</span>}
          </button>

          {openKind === kind.id && !kind.disabled && (
            <div className="mt-1 mb-2 ml-2 pl-2 border-l border-shell-600 space-y-2">
              {kind.id === 'drawers' && (
                <>
                  <div className="flex items-end gap-2">
                    <div className="w-16">
                      <span className="cc-label">Count</span>
                      <NumberField min={1} max={DR.maxCount} value={drawerCount} onCommit={setDrawerCount} />
                    </div>
                    <div className="w-20">
                      <span className="cc-label">Height</span>
                      <NumberField
                        min={DR.minFrontHeight} max={DR.maxFrontHeight}
                        value={drawerHeight} onCommit={setDrawerHeight}
                      />
                    </div>
                    <button type="button" className="cc-btn-gold" onClick={() => onAddDrawers(drawerCount, drawerHeight)}>Add</button>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="cc-btn border-gold text-gold flex-1" disabled>Overlay</button>
                    <button
                      type="button" className="cc-btn flex-1" disabled
                      title="Inset deductions still to come from Piotr — BLOCKERS #6"
                    >
                      Inset <span className="cc-tag ml-1">soon</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-400">
                    Stacked from the bottom, {DR.minFrontHeight}–{DR.maxFrontHeight} mm each. A partition closes the
                    stack automatically (SPEC 4.7), and the doors open so you can see them.
                  </p>
                </>
              )}

              {kind.id === 'shelves' && (
                <>
                  <div className="flex items-end gap-2">
                    <div className="w-16">
                      <span className="cc-label">Add</span>
                      <NumberField min={1} max={10} value={shelfCount} onCommit={setShelfCount} />
                    </div>
                    <button type="button" className="cc-btn-gold" onClick={() => onAddShelves(shelfCount)}>Add</button>
                  </div>
                  <p className="text-[11px] text-ink-400">
                    Filled from the top down, never on top of a shelf that is already there. Drag any of them
                    vertically, or press Even to space them out.
                  </p>
                </>
              )}

              {kind.id === 'hanger' && (
                <>
                  <div>
                    <span className="cc-label">Rail (hardware)</span>
                    <select
                      className="cc-input"
                      value={railMaterial}
                      onChange={(e) => setRailMaterial(e.target.value)}
                    >
                      <option value="">Not specified</option>
                      {hardware.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                      <option value="" disabled>— Connect JoineryCore for live stock (soon) —</option>
                    </select>
                  </div>
                  <button
                    type="button" className="cc-btn-gold w-full"
                    onClick={() => onAddRail(hardware.find((m) => m.id === railMaterial) || null)}
                  >
                    Add hanger rail
                  </button>
                  <p className="text-[11px] text-ink-400">
                    Hung as high as it can go under the lowest shelf, above the drawer partition. The rail you pick
                    is the line that appears in the BOM hardware.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
