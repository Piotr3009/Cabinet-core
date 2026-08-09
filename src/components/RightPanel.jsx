import { useMemo, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';
import { useProjectStore, validateUnit } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { HEIGHT_GROUPS, getUnitType } from '../engine/types.js';
import { doorCountFor } from '../engine/cabinet.js';
import { roomWalls } from '../engine/room.js';
import { migrateDesign, projectHeights, resolveUnitDesign } from '../engine/design.js';
import { drawerRows, hangerOf, shelfRows } from '../engine/items.js';
import { formatMm, formatMmPair } from '../engine/format.js';
import NumberField from './NumberField.jsx';
import MultiUnitPanel from './MultiUnitPanel.jsx';
import AddItems from './AddItems.jsx';
import Section from './Section.jsx';
import ElementProperties from './ElementProperties.jsx';
import CncTree from './CncTree.jsx';

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
  const selectedElement = useUiStore((s) => s.selectedElement);
  const clearElement = useUiStore((s) => s.clearElement);
  const panelOpen = useUiStore((s) => s.panelOpen);
  const togglePanelSection = useUiStore((s) => s.togglePanelSection);

  const units = useProjectStore((s) => s.units);
  const room = useProjectStore((s) => s.project.room);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const removeItem = useProjectStore((s) => s.removeItem);
  const updateItem = useProjectStore((s) => s.updateItem);
  const setShelfPos = useProjectStore((s) => s.setShelfPos);
  const setShelfVariant = useProjectStore((s) => s.setShelfVariant);
  const setShelfLocked = useProjectStore((s) => s.setShelfLocked);
  const setShelfFront = useProjectStore((s) => s.setShelfFront);
  const setPartitionFront = useProjectStore((s) => s.setPartitionFront);
  const setDrawerHeight = useProjectStore((s) => s.setDrawerHeight);
  const setAllDrawerHeights = useProjectStore((s) => s.setAllDrawerHeights);
  const setDrawerEqualHeights = useProjectStore((s) => s.setDrawerEqualHeights);
  const redistributeShelves = useProjectStore((s) => s.redistributeShelves);
  const centrePartitions = useProjectStore((s) => s.centrePartitions);
  const setPartitionX = useProjectStore((s) => s.setPartitionX);
  const removeUnit = useProjectStore((s) => s.removeUnit);
  const setDoors = useProjectStore((s) => s.setDoors);
  const addDoorsToUnit = useProjectStore((s) => s.addDoors);
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
  const setEndPanelDefaults = useProjectStore((s) => s.setEndPanelDefaults);
  const setUnitInsets = useProjectStore((s) => s.setUnitInsets);
  const resetUnitHeight = useProjectStore((s) => s.resetUnitHeight);
  // Select the STORED value and migrate in a memo: a selector that builds a
  // new object every call makes zustand's snapshot change on every render,
  // which React reports as "Maximum update depth exceeded".
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const unitResult = useProjectStore((s) => s.unitResult);
  const profile = useCabinetProfileStore((s) => s.profile);
  const walls = useMemo(() => roomWalls(room), [room]);

  const viewMode = useUiStore((s) => s.viewMode);
  // Turn 13 (CLAUDE.md F5.2): over more than one cabinet this panel becomes
  // the COMMON actions instead. `selectedUnitId` is still the primary, so
  // everything below it is unchanged.
  const selectedUnitIds = useUiStore((s) => s.selectedUnitIds);
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
  // The vertical partitions, left to right — the order a joiner reads them in.
  const partitions = items
    .filter((i) => i.kind === 'partition')
    .sort((a, b) => (Number(a.x_mm) || 0) - (Number(b.x_mm) || 0));
  // A drawer unit whose stack comes from a fixed ratio (BUDR) has no editable
  // drawer heights and no removable drawers — it IS its three drawers.
  const ratioDrawers = type?.drawerStyle === 'budr';
  const equalHeights = unit?.params.drawer_equal_heights !== false;
  const resolvedDesign = unit ? resolveUnitDesign(unit, design) : null;
  const hasDoors = Boolean(unit?.params.doors) && unit.params.doors !== false;
  const DR = profile.wardrobe.drawers;
  // Which PROJECT height this unit follows, if its kind has one at all
  // (BACKLOG #29). A low cabinet has none — being lower is what it is for.
  const heightGroup = type?.heightGroup ?? null;
  const heightGroupLabel = HEIGHT_GROUPS.find((g) => g.id === heightGroup)?.label || 'height';
  const projectHeight = heightGroup ? projectHeights(design, profile)[heightGroup] : null;

  // ─── The selected ELEMENT (turn 9, CLAUDE.md F4) ───
  // Resolved from the ENGINE's panel — the same id the 3D view draws, the BOM
  // prints and the CNC sheet lays out — back to the ITEM its overrides live on.
  // A piece with no item behind it (the partition above a drawer stack, the
  // rail partitioner) is derived by the engine and has nowhere to keep an
  // override, so it reads out and does not edit.
  const element = useMemo(() => {
    // Both must EXIST before their ids are compared: on a fresh project neither
    // does, `undefined === undefined` is true, and `null.elementRef` throws.
    const ref = selectedElement && unit && selectedElement.unitId === unit.id
      ? selectedElement.elementRef : null;
    if (!ref || !result) return null;
    const panel = result.panels.find((p) => p.id === ref);
    if (!panel) return null;
    const item = panel.meta?.itemId
      ? items.find((i) => i.id === panel.meta.itemId) || null
      : null;
    return { panel, item };
  }, [selectedElement, unit?.id, result, items]);

  // ─── Turn 13 (CLAUDE.md F6) ───
  // The arithmetic moved into the store (`addDoors`), because the same act is
  // offered from three places now — here, the right-click menu over a whole
  // selection, and the golden plus — and three copies of "how many doors does
  // this width take" is how two of them come to disagree about the hinge.
  const addDoors = () => {
    const { count } = addDoorsToUnit(unit.id) || {};
    if (!count) return;
    notify(`${count} door${count === 1 ? '' : 's'} added — the unit is complete.`, 'ok');
    closeRightPanel();          // SPEC 4.10: doors are the last step
    clearSelection();
  };

  // ─── Turn 11 (CLAUDE.md F8.2) ───
  // In the CNC view this panel is the CHECKBOX TREE: which units are on the
  // sheet, which of their parts, and the two downloads. It is the same panel in
  // the same place — entering CNC no longer means losing the thing you had open,
  // it means the thing you had open becomes the tool for what you are now doing.
  if (viewMode === 'cnc') {
    return (
      <aside className="absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 z-20 flex flex-col">
        <PanelHeader title="CNC sheet" onClose={closeRightPanel} />
        <div className="flex-1 overflow-y-auto">
          <CncTree />
        </div>
      </aside>
    );
  }

  if (!unit) {
    return (
      <aside className="absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 z-20 flex flex-col">
        <PanelHeader title="Parameters" onClose={closeRightPanel} />
        <p className="p-3 text-sm text-ink-400">Select a unit in the canvas, or open Library in the menu.</p>
      </aside>
    );
  }

  // ─── Turn 13 (CLAUDE.md F5.2) ───
  // More than one cabinet: the shared editors and the actions that make sense
  // for all of them. Deliberately a SEPARATE component and not this one with
  // half its rows hidden — every field below is about one carcass's own
  // geometry, and a "mixed" state for each of them would be forty branches.
  if (selectedUnitIds.length > 1) {
    return <MultiUnitPanel ids={selectedUnitIds} onClose={closeRightPanel} />;
  }

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 z-20 flex flex-col">
      <PanelHeader title={`${type.label} · ${unit.params.unit_num}`} onClose={closeRightPanel} />

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {/* ── the ONE piece that is selected (turn 9, CLAUDE.md F4.3) ──
            First, above the carcass, because when it is there it is what the
            joiner is looking at. It disappears the moment nothing is selected
            inside the unit, so the panel is not permanently a row longer. */}
        {element && (
          <ElementSection unit={unit} element={element} onClose={clearElement} />
        )}

        {/* ── carcass ── */}
        <Section
          title="Carcass"
          badge={formatMmPair(unit.params.width, unit.params.height)}
          open={panelOpen.carcass}
          onToggle={() => togglePanelSection('carcass')}
        >
          <div className="grid grid-cols-3 gap-2">
            {[['width', 'Width'], ['height', 'Height'], ['depth', 'Depth']].map(([key, label]) => (
              <div key={key}>
                <span className="cc-label">
                  {label}
                  {/* Turn 5 (BACKLOG #29): a height typed here is a DELIBERATE
                      exception to the project's, so the field says so and offers
                      the way back rather than leaving the unit quietly adrift. */}
                  {key === 'height' && heightGroup && unit.params.height_custom && (
                    <span className="ml-1 text-gold" title={`The project builds these at ${formatMm(projectHeight)} mm`}>
                      custom
                    </span>
                  )}
                </span>
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

          {heightGroup && (
            <div className="cc-row text-[11px] text-ink-400">
              <span>
                {unit.params.height_custom
                  ? `Project ${heightGroupLabel.toLowerCase()} is ${formatMm(projectHeight)} mm`
                  : `Follows the project ${heightGroupLabel.toLowerCase()} (${formatMm(projectHeight)} mm)`}
              </span>
              <button
                type="button"
                className="cc-btn px-2"
                disabled={!unit.params.height_custom}
                title={unit.params.height_custom
                  ? 'Put this unit back on the project height'
                  : 'This unit is already on the project height'}
                onClick={() => {
                  const { notices } = resetUnitHeight(unit.id) || { notices: [] };
                  for (const n of notices) notify(n, 'warn');
                  notify(`Back on the project ${heightGroupLabel.toLowerCase()}.`, 'ok');
                }}
              >
                Reset
              </button>
            </div>
          )}

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
                  <option key={w.index} value={w.index}>Wall {w.index + 1} · {formatMm(w.width)} mm</option>
                ))}
              </select>
            </div>
            <div>
              <span className="cc-label">Rotation</span>
              <div className="flex gap-1">
                <NumberField
                  className="cc-input w-16 text-right"
                  title="Angle to the wall (0 = back to wall)"
                  step={1}
                  value={unit.position?.rotation_deg ?? 0}
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
              {/* ─── Turn 13 (CLAUDE.md F3.1) ───
                  This was "Design settings…", and that is the bug the owner
                  reported: a button in a UNIT's panel that opens the PROJECT's
                  surface. Editing one cabinet's colour rewrote the whole job.
                  It opens the unit's own picker now, which offers the project
                  palette and writes a unit-level override; Settings is still
                  one click away, from inside it and from the top bar. */}
              <button
                type="button"
                className="cc-btn w-full"
                data-unit-colour="1"
                title="This cabinet's own carcass and front, from the project palette"
                onClick={(e) => openModal('unit-finish', { unitIds: [unit.id], anchor: anchorOfEvent(e) })}
              >
                Colour…
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
                    value={unit.params.mount_height ?? profile.wallUnit.defaults.mountHeight}
                    onCommit={(v) => updateUnitParams(unit.id, { mount_height: v })}
                  />
                </div>
              )}
              {unit.type === 'FRIDGE' && (
                <div>
                  <span className="cc-label">Fridge height</span>
                  <NumberField
                    title="Inner clearance for the appliance"
                    value={unit.params.fridge_h ?? profile.fridgeUnit.defaults.fridgeH}
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
            <AddItems unit={unit} />
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
                    value={drawers[0]?.item.height_mm ?? DR.frontHeight}
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
                          {formatMm(result.derived.drawer_heights?.[num - 1] ?? 0)}
                        </span>
                      ) : (
                        <NumberField
                          min={DR.minFrontHeight}
                          max={DR.maxFrontHeight}
                          className="cc-input w-20 text-right"
                          title="Drawer front height (mm) — Enter to apply, Escape to undo"
                          value={dr.height_mm ?? DR.frontHeight}
                          onCommit={(v) => setDrawerHeight(unit.id, dr.id, v)}
                        />
                      )}
                      <span className="text-[11px] text-ink-400 flex-1">
                        mm
                        {result.derived.drawer_box_side_h?.[num - 1] != null
                          && ` · box ${formatMm(result.derived.drawer_box_side_h[num - 1])}`}
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
                    ? formatMm(result.derived.drawerTotalH, { unit: true })
                    : (ratioDrawers && result.derived.front_heights
                      ? formatMm(result.derived.front_heights.reduce((a, b) => a + b, 0)
                        + (result.derived.front_heights.length - 1) * profile.baseDrawerUnit.gap, { unit: true })
                      : '—')}
                </span>
              </div>
              {result.derived.partition_bottom_y != null && (
                <div className="cc-row text-xs text-ink-400">
                  <span>Partition (locked, required above the stack)</span>
                  <span>{formatMm(result.derived.partition_bottom_y, { unit: true })}</span>
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
                  className="cc-input w-20 text-right" value={rail.pos_mm}
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
                {shelves.map(({ item: sh, label }) => {
                  // Turn 8 (CLAUDE.md F4): a shelf is now three questions —
                  // where it is, how it is HELD, and how far back its front
                  // edge stands. A screwed one, or a locked one, does not move.
                  const locked = sh.variant === 'fixed' || sh.updown_locked === true;
                  const toFace = Number(sh.front_mm) === 0;
                  return (
                    <li key={sh.id} className="flex items-center gap-1 text-sm">
                      <span className="text-ink-400 w-6 text-xs">{label}</span>
                      {/* Typed positions go through the SAME clamp as the drag —
                          the field is not a back door around the collision rules,
                          and a locked shelf refuses both. */}
                      <NumberField
                        className="cc-input w-16 text-right" value={sh.pos_mm ?? 0}
                        disabled={locked}
                        title={locked ? 'Screwed or locked — unlock it to move it' : 'Height above the carcass floor'}
                        onCommit={(v) => setShelfPos(unit.id, sh.id, v)}
                      />
                      <select
                        className="cc-input flex-1" value={sh.variant || 'adjustable'}
                        title="How this shelf is held"
                        onChange={(e) => setShelfVariant(unit.id, sh.id, e.target.value)}
                      >
                        <option value="adjustable">Adjustable</option>
                        <option value="fixed">Fixed (screwed)</option>
                        <option value="pullout">Pull-out</option>
                      </select>
                      {/* The minimal toggle CLAUDE.md asks for: full UI later. */}
                      <button
                        type="button"
                        className={`cc-btn px-1.5 ${sh.updown_locked ? 'border-gold text-ink-50' : ''}`}
                        title={sh.updown_locked
                          ? 'Locked in place — drilled like a fixed shelf'
                          : 'Lock this shelf where it is'}
                        disabled={sh.variant === 'fixed'}
                        onClick={() => setShelfLocked(unit.id, sh.id, !sh.updown_locked)}
                      >
                        {sh.updown_locked ? '🔒' : '🔓'}
                      </button>
                      <button
                        type="button"
                        className={`cc-btn px-1.5 ${toFace ? 'border-gold text-ink-50' : ''}`}
                        title={toFace
                          ? `Front edge is out at the face — click for the ${formatMm(profile.carcass.interiorSetback)} mm setback`
                          : `Front edge is set back ${formatMm(profile.carcass.shelfDepthClearance)} mm — click to stretch it to the face`}
                        onClick={() => setShelfFront(unit.id, sh.id, toFace ? null : 0)}
                      >
                        ⇥
                      </button>
                      <button type="button" className="cc-btn-ghost" onClick={() => removeItem(unit.id, sh.id)} title="Remove shelf">×</button>
                    </li>
                  );
                })}
              </ul>
              {/* The partition over a drawer stack is a fixed shelf too, and it
                  is set back with them (F4) — with the same way out. */}
              {result.panels.some((p) => p.part === 'PARTITION' || p.part === 'RAIL-PART') && (
                <div className="cc-row text-[11px] text-ink-400">
                  <span>Partition front edge</span>
                  <button
                    type="button"
                    className={`cc-btn px-2 ${Number(unit.params.partition_front_mm) === 0 ? 'border-gold text-ink-50' : ''}`}
                    onClick={() => setPartitionFront(
                      unit.id,
                      Number(unit.params.partition_front_mm) === 0 ? null : 0,
                    )}
                  >
                    {Number(unit.params.partition_front_mm) === 0
                      ? 'at the face'
                      : `set back ${formatMm(profile.carcass.interiorSetback)}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── Vertical partitions (turn 12, CLAUDE.md F5.2) ───
              Turn 11 could ADD one and nothing else: there was no row for it in
              this panel, so there was no way to move it by typing, no Centre and
              — the one the owner named — no way to delete it. All three are
              here, and Centre is the shelves' Even on the other axis: N
              partitions divide the internal width into N+1 equal bays. */}
          {partitions.length > 0 && (
            <div>
              <div className="cc-row">
                <span className="text-sm text-ink-100">Vertical partitions ({partitions.length})</span>
                <button
                  type="button" className="cc-btn px-2"
                  data-centre-partitions="1"
                  title="Space them evenly across the width — equal bays"
                  onClick={() => {
                    const moved = centrePartitions(unit.id);
                    if (moved) notify(moved === 1 ? 'Partition centred.' : `${moved} partitions spaced evenly.`, 'ok');
                  }}
                >
                  Centre
                </button>
              </div>
              <ul className="space-y-1">
                {partitions.map((pt, i) => {
                  const panel = result.panels.find((pp) => pp.meta?.itemId === pt.id && pp.part === 'VPART');
                  return (
                    <li key={pt.id} className="flex items-center gap-1 text-sm">
                      <span className="text-ink-400 w-6 text-xs">P{i + 1}</span>
                      <NumberField
                        className="cc-input w-16 text-right"
                        value={pt.x_mm ?? 0}
                        title="Distance from the left inner face to this partition's left face"
                        onCommit={(v) => setPartitionX(unit.id, pt.id, v)}
                      />
                      {/* What it stands on, when it stands on something
                          (CLAUDE.md F5.3). A partition that has found a FIXED
                          shelf says so, because that is what decides how tall it
                          is cut and how deep it is. */}
                      <span className="text-[11px] text-ink-400 flex-1 truncate">
                        {panel?.meta?.terminatesOn
                          ? `on a fixed shelf · ${formatMm(panel.h)} tall`
                          : `full height · ${formatMm(panel?.w ?? 0)}`}
                      </span>
                      <button
                        type="button" className="cc-btn-ghost"
                        data-remove-partition={pt.id}
                        title="Remove this partition"
                        onClick={() => { removeItem(unit.id, pt.id); notify('Partition removed.', 'ok'); }}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
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
                    ? `${formatMm(result.assemblies.carcass.legHeight)} mm, set back ${formatMm(profile.autoParts.plinth.setback)}`
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

          {/* top infill — not offered on a base unit at all (turn 8, F2.7):
              what goes on top of a base cabinet is a worktop, so there is no gap
              to the ceiling for the piece to close. */}
          {!type.supports.topInfill ? (
            <p className="text-[11px] text-ink-400">
              A worktop goes on top of this unit — the gap above it is where the wall units are,
              not something a top infill closes.
            </p>
          ) : (
          <div className="cc-row">
            <div className="flex flex-col">
              <span className="text-sm text-ink-100">Top infill</span>
              <span className="text-[11px] text-ink-400">
                {Number(unit.params.top_infill_mm) > 0 ? 'drag its top edge, or double-click it to fill' : 'not fitted'}
              </span>
            </div>
            {Number(unit.params.top_infill_mm) > 0 ? (
              <div className="flex items-center gap-1">
                <NumberField
                  className="cc-input w-16 text-right"
                  min={0}
                  value={unit.params.top_infill_mm}
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
          )}

          {/* side infill — automatic, and says so */}
          <div className="cc-row text-[11px] text-ink-400">
            <span>Side infill (automatic at the wall)</span>
            <span>
              {[unit.params.side_infill_left_mm, unit.params.side_infill_right_mm]
                .map((v) => (Number(v) > 0 ? formatMm(v) : '—')).join(' / ')}
            </span>
          </div>
          {/* ─── Turn 11 (CLAUDE.md F3.2) ───
              How far the filler runs above the unit, how far the end panel does,
              what either is made of: all of it is edited on the PIECE's OWN
              selection now — click it in the canvas, or double-click it — and
              not through the whole cabinet's panel. Owner verdict, in as many
              words: "osobno, nie z całą szafką". What stays here is the fact
              that the piece EXISTS, because that is a fact about the cabinet. */}
          <p className="text-[11px] text-ink-400">
            Click a filler in the canvas to set how far it runs above the unit, pin it, or cut it from
            another board.
          </p>

          <div className="cc-divider !my-2" />

          {/* ── deliberate clearances (turn 7, BACKLOG #32) ──
              Not a mistake to be tidied up: a soil pipe in the corner, a wall
              that bows, a radiator bracket. The collision clamp respects these
              exactly as it respects a neighbour, so the next drag does not
              close the gap the pipe is standing in. */}
          <Insets
            unit={unit}
            profile={profile}
            onSet={(patch) => {
              const { notices } = setUnitInsets(unit.id, patch);
              for (const n of notices) notify(n, 'warn');
            }}
          />

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

/**
 * ─── One piece inside the cabinet (turn 9, F4.3; the WHOLE cabinet, turn 11 F3) ──
 *
 * Turn 9 could edit one kind of thing: a shelf. Turn 11 edits every piece —
 * sides, bottom, top, back, vertical partitions, end panels, infills, the
 * fronts' hinges — and the FIELDS are decided by engine/elements.js rather than
 * by a branch here, so the panel and the double-click modal (F3.3) render the
 * same controls from one component and can never come apart.
 *
 * What stays turn 9's is the shape of the thing: it is FIRST, above the carcass,
 * because when a piece is selected it is what the joiner is looking at, and it
 * disappears the moment nothing is selected inside the unit.
 */
function ElementSection({ unit, element, onClose }) {
  const { panel, item } = element;
  return (
    <section className="rounded border border-gold/60 bg-shell-700/40 p-2 space-y-2">
      <div className="cc-row">
        <span className="text-[11px] uppercase tracking-wide text-ink-400 flex-1">Selected piece</span>
        <button type="button" className="cc-btn-ghost" title="Deselect this piece (Esc)" onClick={onClose}>×</button>
      </div>
      <ElementProperties unit={unit} panel={panel} item={item} />
      <p className="text-[11px] text-ink-400">
        {panel.meta?.locked
          ? 'Screwed in place. Selected, it can still be made thicker or cut from another board.'
          : 'Double-click it in the canvas to edit it where it stands.'}
      </p>
    </section>
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
 * Inset BACK (turn 7, CLAUDE.md F5 / BACKLOG #32; halved turn 11, F5.1).
 *
 * ─── TURN 11: LEFT AND RIGHT ARE GONE ───
 * Owner verdict: "Insets L/P — broken concept." He is right about why. A
 * sideways inset asked a joiner to describe a gap in millimetres and then left
 * the gap EMPTY: no piece, no scribe, a slot down the side of the run that the
 * cut list said nothing about. What he actually wants beside a cabinet is a
 * PIECE, and that is the pinned side filler — right-click ▸ Pin infill left /
 * right (lib/contextActions.js), which stretches as the unit moves.
 *
 * The BACK inset survives untouched, because it is a different thing entirely: a
 * unit stood off the wall to clear a soil pipe or a bowed wall. Nothing fills
 * that gap; the point of it is that it stays open.
 */
function Insets({ unit, profile, onSet }) {
  const value = Number(unit.params.inset_back_mm) || 0;
  return (
    <div className="space-y-1">
      <div className="cc-row">
        <span className="text-sm text-ink-100">Back inset</span>
        <span className="text-[11px] text-ink-400">{value > 0 ? 'respected by the clamp' : 'none'}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="cc-label">Back</span>
          <NumberField
            className="cc-input text-right"
            min={0}
            max={profile.editor.maxInset}
            title="Stand it off the wall — a pipe, a bowed wall, a skirting"
            value={value}
            onCommit={(v) => onSet({ back: v })}
          />
        </label>
      </div>
      <p className="text-[11px] text-ink-400">
        A deliberate gap behind the unit for something that is not furniture. For a gap BESIDE it,
        right-click the cabinet and pin the infill — a piece closes it, and it stretches as the unit moves.
      </p>
    </div>
  );
}

/**
 * End panels (BACKLOG #17). The OPTIONS live here, in the section — not in a
 * modal: height to the floor or to the unit height, thickness (the doors' by
 * default) and "Apply to all end panels", which makes the next one anywhere in
 * the project inherit these settings.
 */
function EndPanels({
  unit, profile, design, onAdd, onRemove, onDefaults,
}) {
  const panels = unit.params.end_panels || [];
  const has = (side) => panels.some((ep) => ep.side === side);
  return (
    <div className="space-y-2">
      <div className="cc-row">
        <span className="text-sm text-ink-100">End panels</span>
        {/* Left / Right / Both (turn 5, BACKLOG #31). "Both" is the existing
            action twice, so a side that will not fit is refused on its own and
            the other one still appears. */}
        <div className="flex gap-1">
          {[['L', 'Left'], ['R', 'Right'], ['B', 'Both']].map(([side, label]) => {
            const fitted = side === 'B' ? (has('L') && has('R')) : has(side);
            return (
              <button
                key={side}
                type="button"
                className="cc-btn px-2"
                disabled={fitted}
                title={fitted
                  ? 'Already fitted'
                  : (side === 'B'
                    ? 'A masking panel outside both sides'
                    : `Masking panel outside the ${label.toLowerCase()} side`)}
                onClick={() => onAdd(side)}
              >
                + {label}
              </button>
            );
          })}
        </div>
      </div>

      {panels.length === 0 && (
        <p className="text-[11px] text-ink-400">
          None. An end panel masks the outside of a side and is a cut piece in the BOM, the CNC sheet and the DXF.
        </p>
      )}

      {/* ─── Turn 11 (CLAUDE.md F3.2) ───
          The panel's own settings — height mode, thickness, how far above the
          unit, what it is made of — are edited on its OWN selection: click it
          in the canvas, or double-click it for the card beside it. Owner
          verdict, in as many words: "osobno, nie z całą szafką".
          What is left here is the list: which sides have one, and the way to
          take one off, because that is a fact about the CABINET. */}
      <ul className="space-y-1">
        {panels.map((ep) => (
          <li key={ep.id} className="flex items-center gap-2 text-sm">
            <span className="text-ink-400 w-6 text-xs">{ep.side}</span>
            <span className="flex-1 text-[11px] text-ink-400">
              {ep.height === 'unit' ? 'unit height' : 'to floor'}
              {' · '}
              {formatMm(ep.thickness || unit.params.front_t || profile.front.thickness)} mm
              {Number(ep.top_mm) > 0 ? ` · +${formatMm(ep.top_mm)} above` : ''}
            </span>
            <button type="button" className="cc-btn-ghost" title="Remove this end panel" onClick={() => onRemove(ep.id)}>×</button>
          </li>
        ))}
      </ul>
      {panels.length > 0 && (
        <p className="text-[11px] text-ink-400">
          Click one in the canvas to change its height, its board or how far it runs above the unit.
        </p>
      )}

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
        {formatMm(design.endPanel.thickness || unit.params.front_t || profile.front.thickness)} mm).
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

