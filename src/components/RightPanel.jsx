import { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';
import { useProjectStore, validateUnit } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { HEIGHT_GROUPS, getUnitType, profilePath } from '../engine/types.js';
import { doorCountFor, leafCountRefusal, minDrawerFrontHeight } from '../engine/cabinet.js';
import { endPanelDrop, takesPlinth } from '../engine/autoparts.js';
import { roomWalls, wallLabel } from '../engine/room.js';
import { hasBottomMask, hasTopInfill } from '../engine/runs.js';
import { corniceOption } from '../engine/cornice.js';
// T78 F18 · the four lift systems a wall unit's front may open by, and which kits take one.
import { LIFT_SYSTEMS, liftTakesKit } from '../engine/liftSystems.js';
import { FRONT_STYLE_OPTIONS, frontStyleSelection, migrateDesign, projectHeights, resolveUnitDesign } from '../engine/design.js';
import { drawerRows, hangerOf, shelfRows } from '../engine/items.js';
import { isDuplicateName, unitName } from '../engine/naming.js';
import { formatMm, formatMmPair } from '../engine/format.js';
import { SHELF_TYPES, shelfTypeOf } from '../engine/shelfTypes.js';
import { fieldFromPos, posFromField } from '../engine/shelfHeights.js';
import { bayWidthsOf, chainFromX, xFromChain } from '../engine/partitionPositions.js';
import NumberField from './NumberField.jsx';
// T75 F7 · CUT CORNER: the small window at the click on a lit corner.
import Modal from './Modal.jsx';
import { notchApplies } from '../engine/notch.js';
// T75 F4/F11 · the worktop row: who takes one alone, and the island's seating.
import { takesWorktop, worktopEligible } from '../engine/worktop.js';
import { CABINEO_REFUSAL, dowelKitRefusal, jointSystemOf } from '../engine/dowels.js';
import { biscuitKitRefusal } from '../engine/biscuitJoints.js';
import { cabineoKitRefusal, isCabineoSystem } from '../engine/cabineo.js';
import FrontDecorationControls from './FrontDecorationControls.jsx';
import MultiUnitPanel from './MultiUnitPanel.jsx';
import AddItems from './AddItems.jsx';
import Section from './Section.jsx';
import ElementProperties from './ElementProperties.jsx';
import CncTree from './CncTree.jsx';
import UnitWarnings from './UnitWarnings.jsx';
import ShelfHingeClash from './ShelfHingeClash.jsx';
import { LAYER_CLASS } from '../lib/modalLayer.js';

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
  // T51 (CLAUDE.md F1): a chimney drawn on a wall is an obstacle like a box in
  // the plan, so Check has to be handed the list it lives on or it reports a
  // clean unit standing through one.
  const wallSlopes = useProjectStore((s) => s.project.wallSlopes);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  // Turn 50 (CLAUDE.md F3): may this unit be given this size at all?
  const roomFitRefusalFor = useProjectStore((s) => s.roomFitRefusalFor);
  const removeItem = useProjectStore((s) => s.removeItem);
  const updateItem = useProjectStore((s) => s.updateItem);
  const setShelfPos = useProjectStore((s) => s.setShelfPos);
  const setShelfType = useProjectStore((s) => s.setShelfType);
  // Turn 21 (CLAUDE.md F12): doors on the partition, one per bay.
  const setBayDoors = useProjectStore((s) => s.setBayDoors);
  const setBayDoor = useProjectStore((s) => s.setBayDoor);
  // Turn 36 (CLAUDE.md F6): the split, per unit and per bay.
  const setSplitTop = useProjectStore((s) => s.setSplitTop);
  const setBaySplitTop = useProjectStore((s) => s.setBaySplitTop);
  const bayDoorsFor = useProjectStore((s) => s.bayDoorsFor);
  const setShelfLocked = useProjectStore((s) => s.setShelfLocked);
  const setShelfFront = useProjectStore((s) => s.setShelfFront);
  const setPartitionFront = useProjectStore((s) => s.setPartitionFront);
  const setDrawerHeight = useProjectStore((s) => s.setDrawerHeight);
  const resetDrawerHeights = useProjectStore((s) => s.resetDrawerHeights);
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
  const addBottomMask = useProjectStore((s) => s.addBottomMask);
  const removeBottomMask = useProjectStore((s) => s.removeBottomMask);
  const setTopInfill = useProjectStore((s) => s.setTopInfill);
  const setCornice = useProjectStore((s) => s.setCornice);
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
  // Turn 30 (CLAUDE.md F10): what the PROJECT resolves a front style to, so
  // "Project default" can name it rather than being a blank line.
  const projectFrontStyle = design.fronts.style;
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
  // Turn 30 (CLAUDE.md F15): a kit that houses an appliance has an APERTURE in
  // its own defaults — the built-in fridge and the american one are the same
  // KIT_FRIDGE with different envelopes, so the control asks the kit rather
  // than naming a type.
  const apertureDefault = type ? (profilePath(profile, type.defaultsKey)?.fridgeH ?? null) : null;
  // T78 F17 . is this the hob's unit (T75 F14's flag, or the oven base)? Its
  // hob KIND is a choice here; the hood's clearance Check (#34) reads it.
  const isHob = unit ? (unit.params.hob === true || type?.appliance === 'oven') : false;
  // Turn 22 (CLAUDE.md F1.1): the per-unit cornice option, resolved. A stored
  // value this workshop does not buy reads as 'none' rather than as itself.
  const corniceValue = unit ? corniceOption(unit.params.cornice, profile) : 0;
  const issues = unit && result ? validateUnit(unit, result, { room, units, wallSlopes }) : [];
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
  // A drawer unit whose stack comes from a fixed ratio (BUDR) has no removable
  // drawers — it IS its three drawers. Its HEIGHTS are editable since turn 17
  // (CLAUDE.md F8.2), and since turn 18 they are editable HERE too (F2.2).
  const ratioDrawers = type?.drawerStyle === 'budr';
  // T78 F7 · an L's drawer stack (Blum SPACE CORNER) is the drawer unit's own
  // split per arm: the rows are added and removed here, their heights are the
  // kit's and are shown, not typed.
  const lStack = Boolean(type?.corner) && drawers.length > 0;
  const lRowOf = (num) => (result?.derived?.corner_l?.drawer_rows || []).find((r) => r.row === num) || null;
  // Has anybody set one by hand? Then there is a stack to hand back to the kit.
  const ownDrawerHeights = Array.isArray(unit?.params.drawer_heights)
    && unit.params.drawer_heights.length > 0;
  const equalHeights = unit?.params.drawer_equal_heights !== false;
  const resolvedDesign = unit ? resolveUnitDesign(unit, design) : null;
  const hasDoors = Boolean(unit?.params.doors) && unit.params.doors !== false;
  // Turn 21 (CLAUDE.md F12): the bays this face divides into, and this unit's
  // own per-bay answer where it has one.
  const doorBaysHere = useMemo(
    () => (unit ? bayDoorsFor(unit.id) : []),
    [unit, bayDoorsFor, result],
  );
  const bayDoorModes = Array.isArray(unit?.params?.bay_doors) ? unit.params.bay_doors : null;
  // Turn 36 (CLAUDE.md F6): the segments this unit's split doors were cut
  // into, TOP FIRST — the engine's own published record, never re-derived.
  const splitRows = (result?.assemblies?.splitDoors || []).flatMap((rec) => rec.segments.map((s) => ({
    leaf: rec.leaf, id: s.id, label: `${s.label} (${rec.leaf})`, h: s.h, hinges: s.hinges,
  })));
  const DR = profile.wardrobe.drawers;
  // Turn 23 (CLAUDE.md F10.1): the carcass board, and the CLEAR BAYS this unit
  // divides into. One derivation (`engine/partitionPositions.js`), two
  // displays: the P rows' field and the bay chips under the header — and F8's
  // hover arrows in the scene read the very same function.
  const boardT = Number(unit?.params?.board_t) || profile.board.thickness;
  const bays = useMemo(
    () => (result ? bayWidthsOf(result, boardT) : []),
    [result, boardT],
  );
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
      <aside className={`absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 ${LAYER_CLASS.panel} flex flex-col`}>
        <PanelHeader title="CNC sheet" onClose={closeRightPanel} />
        <div className="flex-1 overflow-y-auto">
          <CncTree />
        </div>
      </aside>
    );
  }

  if (!unit) {
    return (
      <aside className={`absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 ${LAYER_CLASS.panel} flex flex-col`}>
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
    <aside className={`absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 ${LAYER_CLASS.panel} flex flex-col`}>
      <PanelHeader title={type.label} onClose={closeRightPanel}>
        {/* Turn 16 (CLAUDE.md F6): the name is the owner's, edited where it is
            shown. It was `${type.label} · 01` printed into the header.
            Turn 17 (F6.2): …and the owner could not find it. It was a bare
            24-pixel box between two other controls, which reads as decoration
            rather than as the field it is. It SAYS what it is now, and the
            right-click menu has an entry that comes here and puts the cursor
            in it — the control is not rebuilt, it is made findable. */}
        <UnitNameField unit={unit} units={units} />
      </PanelHeader>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {/* ── the ONE piece that is selected (turn 9, CLAUDE.md F4.3) ──
            First, above the carcass, because when it is there it is what the
            joiner is looking at. It disappears the moment nothing is selected
            inside the unit, so the panel is not permanently a row longer. */}
        {element && (
          <ElementSection unit={unit} element={element} onClose={clearElement} />
        )}

        {/* ─── TURN 30 (CLAUDE.md F7): A SHELF AND A HINGE AT ONE HEIGHT ────
            ABOVE the sections and outside every one of them, deliberately: a
            conflict prompt folded inside a collapsed "Carcass" is a prompt
            nobody ever expands to find. It shows only when there IS a clash,
            so the panel is not permanently a row longer, and it ASKS rather
            than fixes — two buttons, each opening the editor where the
            decision belongs. No silent auto-fix. */}
        <ShelfHingeClash unitId={unit.id} />

        {/* ── carcass ── */}
        <Section
          title="Carcass"
          badge={formatMmPair(unit.params.width, unit.params.height)}
          open={panelOpen.carcass}
          onToggle={() => togglePanelSection('carcass')}
        >
          <div className="grid grid-cols-3 gap-2">
            {/* T78 F5 · an L's width is ARM A and its depth ARM B (the owner,
                11.10.2026: *"powiekszenie L shape szafek prawa lewa strona"*);
                the fields and the setter are the same, the words are the L's. */}
            {(getUnitType(unit.type).corner
              ? [['width', 'Arm A'], ['height', 'Height'], ['depth', 'Arm B']]
              : [['width', 'Width'], ['height', 'Height'], ['depth', 'Depth']]).map(([key, label]) => (
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
                  data-unit-size-field={key}
                  onCommit={(v) => {
                    // ─── TURN 50 (CLAUDE.md F3): THE ROOM REFUSES FIRST ─────
                    //
                    // *"dlaczego pozwala system dodawać top box powyżej rozmiaru
                    // pokoju? to powinno być blokada."*  This is the parameter
                    // panel — one of the two places CLAUDE.md names as where the
                    // number is ACCEPTED — so the refusal is here, before the
                    // setter, and the sentence names the room's own figure.
                    // Nothing is clamped and nothing is applied.
                    const no = roomFitRefusalFor(unit.id, { [key]: v });
                    if (no) { notify(no.message, 'warn'); return; }
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
                  // T75 F9 · an island's face is named for what it is.
                  <option key={w.index} value={w.index}>{wallLabel(walls, w.index)} · {formatMm(w.width)} mm</option>
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

          {/* T75 F7 · CUT CORNER: lights the four plan corners in the scene. */}
          {notchApplies(type) && <NotchRow unit={unit} />}

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

          {/* ─── Turn 25 (CLAUDE.md F10): SHORT / OVER, ON THE UNIT ───────────
              Silent clamping ends here. The engine has raised a short front,
              absorbed a stack's drift and cut a box back to clear the top panel
              for twenty-four turns without any of it reaching a person; this is
              the reading that shows it. It does NOT block — the cabinet is cut
              as asked and the app says what it found. */}
          <UnitWarnings unitId={unit.id} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              {/* ─── TURN 30 (CLAUDE.md F10): …AND "PROJECT DEFAULT" ─────────
                  The project's front style propagates to every front WITHOUT
                  ITS OWN OVERRIDE, and until tonight no cabinet could say it
                  had none: `defaultParamsFor` stamped one at birth, so this
                  select could only ever show a choice. The empty value is that
                  missing answer — the same "Reset to project" grammar the
                  front-type PALETTE already uses — and it names the style the
                  project resolves to, so the field is never a blank. */}
              <span className="cc-label">Front type</span>
              <select
                className="cc-input"
                data-unit-front-type="1"
                value={unit.params.front_type || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const selected = value ? frontStyleSelection(value, {
                    style: resolvedDesign?.frontType, decoration: resolvedDesign?.frontDecoration,
                  }) : null;
                  updateUnitParams(unit.id, { front_type: value || null, front_decoration: selected?.decoration || null });
                }}
              >
                <option value="">
                  Project default ({profile.front.types[projectFrontStyle]?.label || projectFrontStyle})
                </option>
                {FRONT_STYLE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                {unit.params.front_type === 'H' && <option value="H">Legacy handleless</option>}
              </select>
            </div>
            {/* ─── T78 F8 · CORNER DOORS: PAIR OR BI-FOLD ─────────────────────
                The owner, 11.10.2026: *"zawiasy podwojne czyli jedne drzwiczki
                do carcasu a pozniej zawiasy od drzwiczek do drzwiczek."*  A
                choice on the L only: `pair` is today's two leaves (A on SIDE-A,
                B on SIDE-B, B overlapping at the corner); `bifold` hangs leaf B
                on leaf A's free edge with Blum's CLIP top 60 degree bi-fold
                corner hinge. Written through `updateUnitParams` as
                `corner_doors`; the engine says what it bores and what it does
                not (CORNER_L_BIFOLD). No number is typed here. */}
            {type?.corner && result.derived.doors > 0 && (
              <div>
                <span className="cc-label">Corner doors</span>
                <select
                  className="cc-input"
                  data-corner-doors="1"
                  value={unit.params.corner_doors === 'bifold' ? 'bifold' : 'pair'}
                  title="Pair: door A on SIDE-A and door B on SIDE-B. Bi-fold: door B hangs on door A's free edge (Blum CLIP top 60 degree bi-fold corner hinge, owner to confirm)"
                  onChange={(e) => updateUnitParams(unit.id, { corner_doors: e.target.value === 'bifold' ? 'bifold' : null })}
                >
                  <option value="pair">Pair (A on the carcass, B on the carcass)</option>
                  <option value="bifold">Bi-fold (B hangs on A)</option>
                </select>
                {result.derived.corner_l?.doors_mode === 'bifold' && (
                  <p className="text-[11px] text-ink-400 mt-1" data-corner-doors-said="1">
                    {(result.warnings || []).find((w) => w.code === 'CORNER_L_BIFOLD')?.message || ''}
                  </p>
                )}
              </div>
            )}
            <div>
              <span className="cc-label">Hinge side</span>
              {/* ─── T55 (CLAUDE.md F8): THE PANEL STOPS LYING ABOUT THE HINGE
                  Drilling, the door modal and ElementProperties read the
                  FORCED hand (meta.hinge / meta.hingeForced, T46 law); this
                  select showed raw params.hinge. Same conduct as
                  ElementProperties' hinge-side now: every hinged leaf forced →
                  the forced hand, disabled, one-line reason. Mixed — some
                  forced, some free — the select governs the free leaves and
                  the title says so. */}
              {(() => {
                const leaves = (result.panels || []).filter((p) => p.part === 'FRONT'
                  && p.role === 'front' && p.meta?.hinge);
                const forcedLeaves = leaves.filter((p) => p.meta.hingeForced);
                const allForced = leaves.length > 0 && forcedLeaves.length === leaves.length;
                const someForced = forcedLeaves.length > 0 && !allForced;
                return (
                  <>
                    <select
                      className="cc-input"
                      value={allForced ? forcedLeaves[0].meta.hinge : unit.params.hinge}
                      disabled={result.derived.doors === 2 || allForced}
                      data-unit-hinge-forced={allForced ? '1' : (someForced ? 'mixed' : undefined)}
                      title={allForced
                        ? 'Cut on the slope — the door opens from the slope.'
                        : (someForced
                          ? 'Some leaves are forced by the slope — this governs the free leaves only.'
                          : undefined)}
                      onChange={(e) => updateUnitParams(unit.id, { hinge: e.target.value })}
                    >
                      <option value="L">Left</option>
                      <option value="R">Right</option>
                    </select>
                    {allForced ? (
                      <p className="text-[11px] opacity-70 mt-1" data-unit-hinge-forced-reason="1">
                        Cut on the slope — the door opens from the slope.
                      </p>
                    ) : null}
                  </>
                );
              })()}
            </div>
            {/* ─── T78 F18 · FRONT OPENS: HINGED, OR A BLUM AVENTOS LIFT ──────
                The owner, 11.10.2026: *"szafki poziome otwierane do gory system
                blum ... podwojne drzwi pojedyncze etc."*  On a wall unit only
                (WUD, WUD_GLASS, WARDROBE_WALL): hinged is today's door; HK top
                lifts up about the top edge, HS swings up and over, HL lifts
                parallel, HF folds up in two halves. A CHOICE, written as
                `front_system` through updateUnitParams; the engine chooses the
                set off the catalogue file and says what it bought and what it
                does not bore (LIFT_NO_UNIT, LIFT_CABINET, LIFT_NO_PATTERN). No
                number is typed here. */}
            {liftTakesKit(type) && result.derived.doors > 0 && (
              <div>
                <span className="cc-label">Front opens</span>
                <select
                  className="cc-input"
                  data-front-system="1"
                  value={LIFT_SYSTEMS.includes(unit.params.front_system) ? unit.params.front_system : 'hinged'}
                  title="Hinged: cup hinges. A Blum AVENTOS lift: one full-width leaf on two lift mechanisms, no cups; the set is chosen off the catalogue (owner to confirm), zero holes until its fixing pattern is in the catalogue file"
                  onChange={(e) => updateUnitParams(unit.id, { front_system: LIFT_SYSTEMS.includes(e.target.value) ? e.target.value : null })}
                >
                  <option value="hinged">Hinged</option>
                  <option value="hk">HK top (lift up)</option>
                  <option value="hs">HS (up and over)</option>
                  <option value="hl">HL (lift parallel)</option>
                  <option value="hf">HF (bi-fold up)</option>
                </select>
                {result.derived.lift && (
                  <p className="text-[11px] text-ink-400 mt-1" data-front-system-said="1">
                    {result.derived.lift.said}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── T78 F12 / F13 · PER LEAF: THE GLASS KIND AND THE HINGE FAMILY ─
              The owner, 11.10.2026: *"domyslnie smoke ale z wyborem"* and
              *"otwieranie drzwi wiekszy kat otwarcia 180 stopni, zawiasy."*  One
              row per hinged leaf: its glass (clear | smoke | reeded, on a glazed
              leaf) and its hinge FAMILY (standard | wide); the angle inside the
              family stays derived from the front thickness (T22 law), so no
              number is typed here. Written per leaf as `door_glass[id]` and
              `door_hinge_family[id]` through updateUnitParams. */}
          {(() => {
            const leaves = (result.panels || []).filter((p) => p.part === 'FRONT' && p.role === 'front' && p.meta?.hinge);
            if (!leaves.length) return null;
            const kinds = profile.front?.glass?.kinds || ['clear', 'smoke', 'reeded'];
            const labels = profile.front?.glass?.labels || {};
            const num = unit.params.unit_num || '';
            return (
              <div className="mt-2 space-y-1" data-leaf-choices="1">
                <span className="cc-label">Per leaf</span>
                {leaves.map((p) => (
                  <div key={p.id} className="flex items-center gap-1 text-[12px]">
                    <span className="text-ink-400 w-16 truncate" title={p.id}>{num && p.id.startsWith(`${num}-`) ? p.id.slice(num.length + 1) : p.id}</span>
                    {p.meta?.glass && (
                      <select
                        className="cc-input flex-1"
                        data-door-glass={p.id}
                        value={p.meta.glass.kind || 'smoke'}
                        title="The glass in this leaf (the BOM line names it; smoke is the default)"
                        onChange={(e) => updateUnitParams(unit.id, { door_glass: { ...(unit.params.door_glass || {}), [p.id]: e.target.value } })}
                      >
                        {kinds.map((k) => <option key={k} value={k}>{`${labels[k] || k} glass`}</option>)}
                      </select>
                    )}
                    <select
                      className="cc-input flex-1"
                      data-door-hinge-family={p.id}
                      value={p.meta?.hingeFamily === 'wide' ? 'wide' : 'standard'}
                      title={`Hinge family: the angle follows the front thickness inside it${p.meta?.openAngleDeg ? ` (${p.meta.openAngleDeg} degrees here)` : ''}`}
                      onChange={(e) => updateUnitParams(unit.id, {
                        door_hinge_family: { ...(unit.params.door_hinge_family || {}), [p.id]: e.target.value === 'wide' ? 'wide' : 'standard' },
                      })}
                    >
                      <option value="standard">Standard hinges</option>
                      <option value="wide">Wide-angle hinges (155 / 170)</option>
                    </select>
                  </div>
                ))}
              </div>
            );
          })()}

          <FrontDecorationControls
            style={resolvedDesign?.frontType}
            value={resolvedDesign?.frontDecoration}
            onChange={(decoration) => updateUnitParams(unit.id, { front_decoration: decoration })}
          />

          {resolvedDesign?.colour && (
            <div className="cc-row text-[11px] text-ink-400">
              <span>Front colour</span>
              <span className="px-2 py-0.5 rounded border border-shell-600" style={{ background: resolvedDesign.colour.hex }}>
                {resolvedDesign.colour.name}
              </span>
            </div>
          )}

          {/* per-type parameters: only the ones this kit actually has */}
          {(type.mount === 'wall' || type.doorExtend || apertureDefault != null || isHob) && (
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
              {/* T78 F17 . the hob kind, a CHOICE on the hob unit (induction the
                  default, unwritten): the hood's clearance Check (#34) and the
                  store's proposal read it (engine/hoodClearance.js). The numbers
                  live in the profile (hood.clearance), never here. */}
              {isHob && (
                <div>
                  <span className="cc-label">Hob</span>
                  <select
                    className="cc-input"
                    title="Induction asks 650 mm of hood clearance over the worktop, gas 750 (profile.hood.clearance, proposed): the Check says the number, the client decides"
                    value={unit.params.hob_kind === 'gas' ? 'gas' : 'induction'}
                    onChange={(e) => updateUnitParams(unit.id, { hob_kind: e.target.value })}
                  >
                    <option value="induction">Induction</option>
                    <option value="gas">Gas</option>
                  </select>
                </div>
              )}
              {/* Turn 30 (CLAUDE.md F15): the aperture is offered by any kit
                  that HAS one — the built-in housing and the american one are
                  the same KIT_FRIDGE with different envelopes, so this asks the
                  kit rather than the type id. */}
              {apertureDefault != null && (
                <div>
                  <span className="cc-label">Fridge height</span>
                  <NumberField
                    title="Inner clearance for the appliance"
                    value={unit.params.fridge_h ?? apertureDefault}
                    onCommit={(v) => updateUnitParams(unit.id, { fridge_h: v })}
                  />
                </div>
              )}
              {/* ─── Turn 14 (CLAUDE.md F4.2): DOOR EXTEND HAS MOVED ───
                  It is a DOOR property and it lives in the door's own modal
                  now — double-click a front. It sat here, in the carcass block,
                  for three turns, which is why the owner came to report it
                  missing: it is not where anybody looks for a door setting. */}
              {type.doorExtend && (
                <p className="col-span-2 text-[11px] text-ink-400">
                  <span className="text-ink-100">Door extend</span> is a door setting — double-click a
                  front to open it{unit.params.door_extend ? ' (on: +' : ''}
                  {unit.params.door_extend ? `${formatMm(profile.wallUnit.doorExtend)})` : ''}.
                </p>
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
                  {/* eslint-disable-next-line no-nested-ternary */}
                  {lStack
                    ? `SPACE CORNER · two boxes a row · NL ${formatMm(lRowOf(1)?.travel_mm || 0)} mm`
                    : (result.derived.szufDl ? `${result.derived.szufSzer} × ${result.derived.szufDl} mm` : 'dropped')}
                </span>
              </div>

              {/* Equal heights ✓ by default: one field for the whole stack
                  (BACKLOG #11). Unticked, every drawer gets its own — listed
                  TOP-DOWN, so the first row is the drawer nearest the ceiling. */}
              {!ratioDrawers && !lStack && (
                <label className="flex items-center gap-2 text-[12px] text-ink-100">
                  <input
                    type="checkbox"
                    checked={equalHeights}
                    onChange={(e) => setDrawerEqualHeights(unit.id, e.target.checked)}
                  />
                  <span>Equal heights</span>
                </label>
              )}

              {!ratioDrawers && !lStack && equalHeights ? (
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
                      {/* ─── Turn 18 (CLAUDE.md F2.2) ───
                          This was a dimmed span, with a comment saying a BUDR's
                          fronts come from the kit's ratio and an input here
                          "would do nothing". It DOES something now — turn 17
                          gave the stack per-drawer heights and this turn fixed
                          the setter that was writing them to the wrong place —
                          so it is the same NumberField the element editor has,
                          against the same engine clamp: no shorter than the
                          runner screws plus the air under them. */}
                      {/* eslint-disable-next-line no-nested-ternary */}
                      {lStack ? (
                        <span className="cc-input w-20 text-right text-ink-100" data-l-row-height={num} title="The kit's own split (the drawer unit's ratio), per arm">
                          {formatMm(lRowOf(num)?.fronts?.[0]?.h ?? 0)}
                        </span>
                      ) : ratioDrawers ? (
                        <NumberField
                          min={minDrawerFrontHeight(profile)}
                          className="cc-input w-20 text-right"
                          data-drawer-height-mm={num}
                          title={`Drawer front height (mm) — no shorter than ${formatMm(minDrawerFrontHeight(profile))} mm, the runner screws plus the air under them.`}
                          value={result.derived.drawer_heights?.[num - 1] ?? 0}
                          onCommit={(v) => setDrawerHeight(unit.id, dr.id, v)}
                        />
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
                      {/* ─── T78 F16 · THE DOUBLE DRAWER ──────────────────────
                          The owner: *"podwojne szuflady szafki z szuflada na
                          sztucce z bluma."*  A drawer-unit row may be DOUBLE:
                          behind its one front a deep box and, above it, an
                          inner cutlery drawer on its own runners (Blum's inner
                          drawer behind a front, reference/hardware/
                          blum-inner-drawer.json, owner to confirm). A choice,
                          written as params.drawer_double[row]; the engine says
                          in words where the row is too short (DOUBLE_DRAWER_REFUSED). */}
                      {ratioDrawers && !lStack && (
                        <label className="flex items-center gap-1 text-[11px] text-ink-300" title="Double: a deep box below and an inner cutlery drawer above, behind this one front">
                          <input
                            type="checkbox"
                            data-drawer-double={num}
                            checked={unit.params.drawer_double?.[num] === true}
                            onChange={(e) => updateUnitParams(unit.id, {
                              drawer_double: { ...(unit.params.drawer_double || {}), [num]: e.target.checked ? true : null },
                            })}
                          />
                          <span>Double</span>
                        </label>
                      )}
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

              {/* ─── Turn 18 (CLAUDE.md F2.2) ───
                  …and the way back. A ratio stack that nobody has touched has
                  no heights of its own, so there is nothing to reset and the
                  button is not there; the moment one is typed it appears, and
                  it hands the whole stack back to the kit's own split. */}
              {ratioDrawers && ownDrawerHeights && (
                <button
                  type="button"
                  className="cc-btn px-2 text-xs"
                  data-drawer-heights-reset="1"
                  title="Back to the kit's own split"
                  onClick={() => resetDrawerHeights(unit.id)}
                >
                  Reset to the kit
                </button>
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

          {/* ─── TURN 42 (CLAUDE.md F1): AND THE COMMENTED-OUT FIELD IS GONE ──
              T41 superseded the editable height field here and left it in a
              comment. Iron rule 3 licenses its deletion BY NAME this turn
              ("RightPanel.jsx:655 — the block T41 commented out: now DELETE
              it"), and the owner's own reason applies: *"nie patrzymy na
              przeszłość w ogóle."* What replaced it stands below — the
              resolved axis, read off the engine's `assemblies.rail.y`, which
              is the millimetre the 3-D draws and the machine drills. */}
          {rail && (
            <div className="cc-row text-sm">
              <div className="flex flex-col">
                <span className="text-ink-100">Hanger rail</span>
                {rail.material_label && <span className="text-[11px] text-ink-400">{rail.material_label}</span>}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-ink-100 tabular-nums" data-testid="rail-height">
                  {result.assemblies?.rail?.y != null
                    ? formatMm(result.assemblies.rail.y, { unit: true })
                    : '—'}
                </span>
                <button type="button" className="cc-btn-ghost" onClick={() => removeItem(unit.id, rail.id)}>×</button>
              </div>
            </div>
          )}

          {type.supports.shelves && shelves.length > 0 && (
            <div>
              {/* Turn 21 (CLAUDE.md F10): the board the interior floor is one
                  of — this unit's own, not the workshop default, because a
                  cabinet cut from 22 mm has its floor 22 mm up. */}
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
                  const boardT = Number(unit.params.board_t) || profile.board.thickness;
                  // Turn 8 (CLAUDE.md F4): a shelf is now three questions —
                  // where it is, how it is HELD, and how far back its front
                  // edge stands. A screwed one, or a locked one, does not move.
                  const locked = shelfTypeOf(sh) === 'fix' || sh.updown_locked === true;
                  const toFace = Number(sh.front_mm) === 0;
                  return (
                    <li key={sh.id} className="flex items-center gap-1 text-sm">
                      <span className="text-ink-400 w-6 text-xs">{label}</span>
                      {/* Typed positions go through the SAME clamp as the drag —
                          the field is not a back door around the collision rules,
                          and a locked shelf refuses both. */}
                      {/* ─── Turn 21 (CLAUDE.md F10): THE INTERIOR DATUM ───
                          The clear light under the shelf, which is the number
                          the 3-D chip beside it shows and the number a joiner
                          measures. Storage does not move — `posFromField` puts
                          it back — and the clamp is still the setter's. */}
                      <NumberField
                        className="cc-input w-16 text-right"
                        value={fieldFromPos(sh.pos_mm ?? boardT, boardT)}
                        disabled={locked}
                        title={locked
                          ? 'Screwed or locked — unlock it to move it'
                          : 'The clear light under the shelf — its underside above the interior floor'}
                        onCommit={(v) => setShelfPos(unit.id, sh.id, posFromField(v, boardT))}
                      />
                      {/* Turn 21 (CLAUDE.md F7): the owner's three kinds, in
                          his own words. A kind whose workshop number is still
                          outstanding is offered and disabled, with the reason
                          on it — never silently missing, never invented. */}
                      <select
                        className="cc-input flex-1" value={shelfTypeOf(sh)}
                        title="How this shelf is held"
                        data-shelf-type="1"
                        onChange={(e) => setShelfType(unit.id, sh.id, e.target.value)}
                      >
                        {SHELF_TYPES.map((t) => (
                          <option key={t.id} value={t.id} disabled={!t.enabled} title={t.hint}>
                            {t.label}
                            {t.enabled ? '' : ' — workshop number outstanding'}
                          </option>
                        ))}
                      </select>
                      {/* The minimal toggle CLAUDE.md asks for: full UI later. */}
                      <button
                        type="button"
                        className={`cc-btn px-1.5 ${sh.updown_locked ? 'border-gold text-ink-50' : ''}`}
                        title={sh.updown_locked
                          ? 'Locked in place — drilled like a fixed shelf'
                          : 'Lock this shelf where it is'}
                        disabled={shelfTypeOf(sh) === 'fix'}
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
              {/* T43 (iron rule 3): the `|| p.part === 'RAIL-PART'` half of this
                  condition is a T42 leftover — the part no longer exists — and
                  is deleted by name. */}
              {result.panels.some((p) => p.part === 'PARTITION') && (
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
                {/* ─── Turn 23 (CLAUDE.md F10.3) ───
                    "The Centre action and P1/P2 rows re-label accordingly." It
                    does the same thing it has always done; what it is FOR is
                    equal BAYS, which is the word the rest of this block now
                    speaks. */}
                <button
                  type="button" className="cc-btn px-2"
                  data-centre-partitions="1"
                  title="Space them evenly across the width — equal clear bays"
                  onClick={() => {
                    const moved = centrePartitions(unit.id);
                  }}
                >
                  Equal bays
                </button>
              </div>
              {/* ─── TURN 23 (CLAUDE.md F10.1): THE BAYS THEMSELVES ──────────
                  "the scene chips (and F8's hover arrows) = CLEAR bay widths
                  between neighbours. Both from one function." This is that
                  function's other reading, in the panel: what the owner is
                  actually dividing the cabinet into. */}
              <div className="text-[11px] text-ink-400 mb-1" data-partition-bays="1">
                bays{' '}
                {bays.map((b, i) => (
                  <span key={b.index}>
                    {i > 0 ? ' · ' : ''}
                    <b className="text-ink-200 tabular-nums">{formatMm(b.size)}</b>
                  </span>
                ))}
              </div>
              <ul className="space-y-1">
                {partitions.map((pt, i) => {
                  const panel = result.panels.find((pp) => pp.meta?.itemId === pt.id && pp.part === 'VPART');
                  // ─── TURN 24 (CLAUDE.md F11): DISPLAY CHAINS, STORAGE
                  //     STAYS ABSOLUTE ───────────────────────────────────────
                  // Every OTHER partition, at the width the ENGINE cut it —
                  // so a partition on carcass 2 is measured to the face that
                  // will actually be there (F3.3). The field then shows the
                  // clear light from this piece's LEFT neighbour, and typing
                  // into it moves ONLY this piece: the number is a distance
                  // from a face that is already where it is.
                  const others = partitions
                    .filter((o) => o.id !== pt.id)
                    .map((o) => {
                      const op = result.panels.find((pp) => pp.meta?.itemId === o.id && pp.part === 'VPART');
                      return { x: op?.box.x ?? o.x_mm, w: op?.box.w ?? boardT };
                    });
                  const mine = panel?.box.x ?? pt.x_mm ?? boardT;
                  return (
                    <li key={pt.id} className="flex items-center gap-1 text-sm">
                      <span className="text-ink-400 w-6 text-xs">P{i + 1}</span>
                      {/* ─── TURN 23 (CLAUDE.md F10.1) / TURN 24 (F11) ───
                          Owner: "the partition field measures from the
                          cabinet's outer end; I place partitions from the
                          INSIDE." Turn 23 made the field the inside face; turn
                          24 makes it the LEFT NEIGHBOUR's face, which for P1 is
                          that same interior face — one mapping, two cases of
                          it, and turn 23's law subsumed rather than duplicated.
                          STORAGE DOES NOT MOVE: `xFromChain` puts back exactly
                          what `x_mm` has meant since turn 11, so moving P1
                          changes the NUMBER P2 shows and nothing else. */}
                      <NumberField
                        className="cc-input w-16 text-right"
                        data-partition-chain={pt.id}
                        value={chainFromX({ x: mine, boardT, others })}
                        title={i === 0
                          ? 'From the INSIDE face of the left side panel to this partition’s near face'
                          : 'From the previous partition’s face to this one’s near face — the clear bay between them'}
                        onCommit={(v) => setPartitionX(
                          unit.id, pt.id, xFromChain({ value: v, x: mine, boardT, others }),
                        )}
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
                        onClick={() => removeItem(unit.id, pt.id)}
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
          {/* ─── TURN 29 (CLAUDE.md F3): THE ENGINE'S OWN GATE, NOT A SECOND ─
              *"front i plinth powinien być tak samo włączany jak cała reszta
              szafek."* This asked `type.legs`, and legs and a plinth have been
              two questions since turn 22 — the D/W panel has NO legs (the
              machine stands where they would be) and a toe kick that runs
              past it, notched. So the engine would cut the piece and the panel
              refused to offer the button. One gate now, `engine/autoparts.js
              takesPlinth`, which is the same function the store's own
              `canTakePlinth` asks. */}
          {takesPlinth(unit.type, profile) && type.mount === 'floor' ? (
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
            <p className="text-[11px] text-ink-400">This type carries no toe kick — it takes no plinth.</p>
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
                {hasTopInfill(unit) ? 'drag its top edge, or double-click it to fill' : 'not fitted'}
              </span>
            </div>
            {/* Turn 14 (CLAUDE.md F1.2): the RUN's state. A member of a run
                carries no height of its own, so this row used to offer "Add top
                infill" under a piece that was plainly there — and the × that
                takes it off was unreachable from every cabinet but the first. */}
            {hasTopInfill(unit) ? (
              <div className="flex items-center gap-1">
                <NumberField
                  className="cc-input w-16 text-right"
                  min={0}
                  value={Number(unit.params.top_infill_mm) || 0}
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

          {/* T75 F4/F11 · the worktop of ONE cabinet (the L's slab shaped like
              the L, a cabinet on an island) and the island's seating overhang:
              the walk found no click reached either. */}
          <WorktopRow unit={unit} />

          {/* ─── THE CORNICE (turn 22, CLAUDE.md F1) ───
              Three states, one control: none, 70, 100. It is offered on the
              kits that finish below the ceiling with a face somebody looks up
              at — wardrobes and tall units — and nowhere else. Choosing a
              height also asks for the 40 mm infill the moulding is FIXED TO,
              through the same setter the drag uses, so the ceiling still has
              the last word. */}
          {type.supports.cornice && (
            <div className="cc-row">
              <div className="flex flex-col">
                <span className="text-sm text-ink-100">Cornice</span>
                <span className="text-[11px] text-ink-400">
                  {corniceValue
                    ? `${corniceValue} mm, ${formatMm(profile.autoParts.cornice.projection[corniceValue] || 0)} forward — bought moulding, one run`
                    : 'not fitted'}
                </span>
              </div>
              <div className="flex items-center gap-1" data-cornice-options="1">
                {[0, ...profile.autoParts.cornice.heights].map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-cornice={h}
                    className={corniceValue === h ? 'cc-btn-gold' : 'cc-btn'}
                    onClick={() => {
                      const { notices } = setCornice(unit.id, h);
                      for (const n of notices) notify(n, 'warn');
                    }}
                  >
                    {h === 0 ? 'None' : `${h}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── The bottom masking panel (turn 14, CLAUDE.md F5) ───
              The plinth's twin at the other end of the kitchen, so it is in the
              same section: one board under a RUN of hanging cabinets, its depth
              the unit's plus the ten millimetres they stand off the wall. */}
          {type.mount === 'wall' && (
            <div className="cc-row">
              <div className="flex flex-col">
                <span className="text-sm text-ink-100">Bottom masking panel</span>
                <span className="text-[11px] text-ink-400">
                  {hasBottomMask(unit)
                    ? 'one board across the run — double-click it to edit'
                    : 'not fitted'}
                </span>
              </div>
              {hasBottomMask(unit) ? (
                <button type="button" className="cc-btn-ghost" onClick={() => removeBottomMask(unit.id)}>×</button>
              ) : (
                <button type="button" className="cc-btn" onClick={() => addBottomMask(unit.id)}>
                  Add masking panel
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

          {/* ─── T75 F23 · THE JOINT SYSTEM, PER UNIT ───────────────────────
              *"lisp najpierw."*  Puzzle or Dowel, written to the unit's
              `joints_system` through `updateUnitParams`; the engine asks the
              pattern of the puzzle cut first and refuses in its own words.
              Cabineo is shown and refused with its sentence. No typed number:
              every dowel number is the profile's. */}
          <JointsRow
            unit={unit}
            type={type}
            result={result}
            profile={profile}
            onSet={(system) => updateUnitParams(unit.id, { joints_system: system })}
          />

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
              {/* ─── CHAT FIX 15.10.2026: ONE LEAF OR TWO, BY CHOICE ─────────
                  The owner: *"jak mamy małe drzwi, ale wciąż chcę zrobić 2, to
                  żebym miał możliwość podzielenia ich na 2."*  The ladder
                  (700) decides until a person chooses; the choice is the same
                  `setDoors({ count })` pin retail's HOW MANY writes, so a
                  resize keeps it (the 15.08 rule) and the engine cuts the pair
                  by its own arithmetic. What may not be cut is said by ONE
                  law, `leafCountRefusal`: a pair whose leaves fall under
                  `doors.minLeafWidth`. A single leaf over 700 stays the
                  person's own decision, as the 15.08 rule protects it (retail
                  refuses it for a client on its own words). Not on kits whose
                  count is their identity (TWIN, the blind kits, the L) nor on
                  a bay-door layout, which is a different system. */}
              {hasDoors && !type.doorCount && !type.blind && !type.corner && !bayDoorModes && (() => {
                const pinned = unit.params.doors && typeof unit.params.doors === 'object'
                  && Number.isFinite(Number(unit.params.doors.count))
                  ? Number(unit.params.doors.count) : null;
                const auto = doorCountFor(unit.params.width, profile);
                const current = pinned ?? auto;
                return (
                  <div className="cc-row pt-1" data-leaf-count="1">
                    <span
                      className="text-xs text-ink-200 flex-1"
                      title="One leaf or a pair. The 700 mm rule answers until you choose; your choice survives a resize."
                    >
                      Leaves
                    </span>
                    {[1, 2].map((n) => {
                      const refusal = leafCountRefusal(unit.params.width, n, profile);
                      return (
                        <button
                          key={n}
                          type="button"
                          data-leaf-count-chip={n}
                          className={`${current === n ? 'cc-btn-gold' : 'cc-btn'} px-3`}
                          disabled={Boolean(refusal)}
                          title={refusal || (auto === n ? 'The 700 mm rule\'s own answer' : 'Your choice; a resize keeps it')}
                          onClick={() => setDoors(unit.id, {
                            ...(unit.params.doors && typeof unit.params.doors === 'object' ? unit.params.doors : {}),
                            count: n,
                          })}
                        >
                          {n}{auto === n ? ' (auto)' : ''}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              {/* ─── TURN 36 (CLAUDE.md F6): SPLIT DOORS ───────────────────
                  The owner types the TOP segment; the bottom is what is left
                  after the 3 mm between them. 0 = no split, and a number that
                  would leave a segment under 100 mm is refused by the engine
                  rather than cut (engine/splitDoors.js, the kit's own
                  `SPLIT_SEG_MIN`). A fix shelf appears on the line
                  automatically — full depth, no 20 setback: that is what a
                  divider IS. */}
              {hasDoors && (
                <div className="cc-row pt-1" data-split-door="1">
                  <span className="text-xs text-ink-200 flex-1" title="The upper leaf's height. 0 = one door, as before.">
                    Split door: top segment
                  </span>
                  <NumberField
                    className="cc-input w-20 text-right"
                    data-split-top="1"
                    min={0}
                    value={Number(unit.params.split_top_mm) || 0}
                    onCommit={(v) => setSplitTop(unit.id, v)}
                  />
                  <span className="text-[11px] text-ink-400">mm</span>
                </div>
              )}
              {hasDoors && splitRows.length > 0 && (
                /* TOP FIRST — the owner's order and the kit's own
                   `splitDoorSegments`, which is the same law engine/items.js
                   applies to shelves and drawers: the engine counts from the
                   floor, a human reads from the ceiling. */
                <ul className="space-y-0.5 pl-1" data-split-segments="1">
                  {splitRows.map((row) => (
                    <li key={row.leaf + row.id} className="text-[11px] text-ink-400" data-split-segment={row.id}>
                      <span className="text-ink-200">{row.label}</span>
                      {` ${formatMm(row.h)} mm · ${row.hinges} hinge${row.hinges === 1 ? '' : 's'}`}
                    </li>
                  ))}
                </ul>
              )}
              {/* ─── Turn 21 (CLAUDE.md F12): A DOOR PER BAY ───
                  Offered only where a partition can actually carry one — full
                  height and flush with the face — because those are physical
                  facts about the piece and not a setting to be argued with. */}
              {doorBaysHere.length > 1 && (
                <div className="space-y-1 pt-1" data-bay-doors="1">
                  <div className="cc-row">
                    <span className="text-xs text-ink-200 flex-1">Per bay</span>
                    <button
                      type="button"
                      className={`cc-btn px-2 ${bayDoorModes ? 'border-gold text-gold' : ''}`}
                      title={bayDoorModes
                        ? 'Back to one face — the bay doors come off'
                        : 'A door in each bay, hinged on the carcass side or on the partition'}
                      onClick={() => setBayDoors(unit.id, bayDoorModes
                        ? null
                        : doorBaysHere.map((b) => ({ door: 'one', hinge: b.left.kind === 'partition' ? 'L' : 'L' })))}
                    >
                      {bayDoorModes ? 'On' : 'Off'}
                    </button>
                  </div>
                  {bayDoorModes && doorBaysHere.map((bay, i) => (
                    <div className="cc-row" key={bay.index} data-bay={bay.index}>
                      <span className="text-ink-400 w-10 text-xs">B{bay.index + 1}</span>
                      <select
                        className="cc-input flex-1"
                        value={bayDoorModes[i]?.door || 'none'}
                        title="A door in this bay, or nothing"
                        onChange={(e) => setBayDoor(unit.id, i, { door: e.target.value })}
                      >
                        <option value="none">No door</option>
                        <option value="one">One door</option>
                      </select>
                      <select
                        className="cc-input w-20"
                        value={bayDoorModes[i]?.hinge || 'L'}
                        disabled={(bayDoorModes[i]?.door || 'none') === 'none'}
                        title="Which side this leaf is hinged on — the carcass, or the partition"
                        onChange={(e) => setBayDoor(unit.id, i, { hinge: e.target.value })}
                      >
                        <option value="L">Hinge L</option>
                        <option value="R">Hinge R</option>
                      </select>
                      {/* T36 F6: this bay's own split, overriding the unit's.
                          0 here means "not this bay", even where the unit
                          asked for one. */}
                      <NumberField
                        className="cc-input w-16 text-right"
                        data-bay-split-top={bay.index}
                        title="Split door: this bay's top segment, in mm. 0 = one door."
                        min={0}
                        value={Number(bayDoorModes[i]?.split_top_mm) || 0}
                        onCommit={(v) => setBaySplitTop(unit.id, i, v)}
                      />
                    </div>
                  ))}
                </div>
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
      {/* T75 F7 · the CUT CORNER window, opened at the click on a lit corner. */}
      <NotchModal />
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

function PanelHeader({ title, onClose, children = null }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-shell-600">
      <span className="text-xs uppercase tracking-wide text-ink-200 shrink-0">{title}</span>
      {children}
      <span className="flex-1" />
      <button type="button" className="cc-btn-ghost" onClick={onClose} title="Close panel">×</button>
    </div>
  );
}

/**
 * ─── A CABINET'S NAME, EDITED WHERE IT IS SHOWN (turn 16, CLAUDE.md F6) ─────
 *
 * "Default stays automatic (01, 02, WU05…), but it becomes EDITABLE — panel
 * header and/or unit modal, inline edit, stored on the unit."
 *
 * Inline, in the header, because that is where the name already IS: a joiner
 * renames the thing he is looking at rather than opening a dialog to do it.
 * Everything downstream — the canvas label, the CNC block caption and part
 * codes, the BOM, the drawings, the check-out — reads `params.unit_num` and
 * always has, so nothing had to be told about this.
 *
 * A duplicate is FLAGGED and not refused (F6): two cabinets called "Island" is
 * a workshop's business. Clearing the box puts the automatic name back.
 */
function UnitNameField({ unit, units }) {
  const setUnitName = useProjectStore((s) => s.setUnitName);
  const [draft, setDraft] = useState(null);
  const duplicate = useMemo(() => isDuplicateName(unit, units), [unit, units]);
  const value = draft ?? unitName(unit);
  const commit = () => {
    if (draft != null && draft.trim() !== unitName(unit)) setUnitName(unit.id, draft);
    setDraft(null);
  };
  return (
    <span className="flex items-center gap-1 min-w-0">
      <label className="text-[10px] uppercase tracking-wide text-ink-400 shrink-0" htmlFor={`unit-name-${unit.id}`}>
        Name
      </label>
      <input
        id={`unit-name-${unit.id}`}
        className={`cc-input h-6 py-0 px-1.5 text-xs w-28 ${duplicate ? 'border-status-warn' : ''}`}
        data-unit-name={unit.id}
        value={value}
        title={duplicate
          ? 'Another cabinet in this project has this name — allowed, but the cut list will show two'
          : 'What this cabinet is called. It prints on the canvas, the CNC sheet, the BOM and the drawings.'}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
        }}
      />
      {duplicate && (
        <span className="text-[10px] text-status-warn" data-duplicate-name="1" title="Two cabinets share this name">
          ⚠
        </span>
      )}
    </span>
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
  const type = getUnitType(unit.type);
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
              {/* Turn 13 (F4): a wall unit's panel ends with the cabinet
                  whatever the stored value claims, so the row reads the RULE
                  rather than the field — a label that disagrees with the piece
                  is worse than no label. */}
              {endPanelDrop({
                height: ep.height,
                type,
                mountHeight: unit.params.mount_height,
                legHeight: unit.params.leg_height,
                profile,
              }) > 0 ? 'to floor' : 'ends with the cabinet'}
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

// ─── T75 F7 · CUT CORNER ────────────────────────────────────────────────────
//
// The owner, 23.09.2026: *"Klikasz 'wytnij narożnik', program podświetla
// narożniki, wybierasz, podajesz wysokość, głębokość, szerokość (np.
// 200x200)."*
//
// The button lights the selected unit's four plan corners in the scene
// (`3d/NotchCorners.jsx`, `uiStore.notchPick`); a click on one opens the small
// window AT THE CLICK (the T74 F1 kind: the shell's anchor, and a click
// anywhere else closes it with nothing cut). WIDTH, DEPTH and HEIGHT open on
// `profile.notch.defaults` (200, 200, full: the owner's own example) and Enter
// cuts, through the store's ONE action (`setUnitNotch`, one undo step), which
// asks the engine first and shows its refusal here in its own words. A notch
// that exists is taken off from the same row.
function NotchRow({ unit }) {
  const pick = useUiStore((s) => s.notchPick);
  const startNotchPick = useUiStore((s) => s.startNotchPick);
  const stopNotchPick = useUiStore((s) => s.stopNotchPick);
  const setUnitNotch = useProjectStore((s) => s.setUnitNotch);
  const notch = unit.params?.notch || null;
  const lit = pick === unit.id;
  // The corners go out with the row: a unit deselected, a section folded.
  useEffect(() => () => { if (useUiStore.getState().notchPick === unit.id) stopNotchPick(); }, [unit.id, stopNotchPick]);
  return (
    <div className="flex gap-1" data-notch-row={unit.id}>
      <button
        type="button"
        className={`cc-btn flex-1 ${lit ? 'border-gold text-gold' : ''}`}
        data-testid="cut-corner"
        title={lit ? 'Click one of the lit corners in the scene' : 'Cut a corner out of this carcass'}
        onClick={() => (lit ? stopNotchPick() : startNotchPick(unit.id))}
      >
        {lit ? 'PICK A CORNER' : 'CUT CORNER'}
      </button>
      {notch && (
        <button
          type="button"
          className="cc-btn px-2"
          data-testid="remove-corner-cut"
          title={`Take the ${notch.corner} notch off again`}
          onClick={() => { setUnitNotch(unit.id, null); stopNotchPick(); }}
        >
          {`REMOVE ${notch.corner} CUT`}
        </button>
      )}
    </div>
  );
}

// ─── T75 F23 · PUZZLE, DOWEL, AND CABINEO RESERVED ─────────────────────────
// What the unit is CUT with, read back off the engine's own answer
// (`result.derived.joints`), so the row never claims a system the cut did not
// take: a refusal shows in the engine's words and the puzzle stays lit.
//
// T78 F19 / F20 (CLAUDE.md T78 PART E): the owner's four systems, Cabineo in
// its two variants (11.10.2026). The company row chooses the default
// (`companyDefaults.js joints_system`), the project inherits it, this row is
// the UNIT's override (`params.joints_system`), so a lit button that is not
// the puzzle may be the company's choice as much as a click here. The
// reserved id 'cabineo' of T75 is still refused in words when a saved unit
// carries it. Not one number on this row: the numbers are the profile's.
const JOINT_CHOICES = [
  { id: 'puzzle', label: 'Puzzle', title: 'Skylon puzzle: tabs, sockets and dog bones' },
  { id: 'dowel', label: 'Dowel', title: 'Dowel pairs on both boards of every joint (SKYLON_JOINTS_DOWEL.lsp)' },
  { id: 'biscuit', label: 'Biscuit', title: 'The owner\'s biscuit set on side to top and side to bottom, never the back (SKYLON_JOINTS_BISCUIT.lsp)' },
  { id: 'cabineo8', label: 'Cabineo 8', title: 'Lamello Cabineo 8: pockets from the outside face of the top, the bottom and a fixed shelf, the screw holes in the sides (SKYLON_JOINTS_CABINEO.lsp)' },
  { id: 'cabineo12', label: 'Cabineo 12', title: 'Lamello Cabineo 12: pockets from the outside face of the top, the bottom and a fixed shelf, the screw holes in the sides (SKYLON_JOINTS_CABINEO.lsp)' },
];
function JointsRow({
  unit, type, result, profile, onSet,
}) {
  const asked = jointSystemOf(unit.params, profile);
  const cut = result?.derived?.joints || null;
  const refusals = {
    dowel: dowelKitRefusal(type),
    biscuit: biscuitKitRefusal(type),
    cabineo8: cabineoKitRefusal(type),
    cabineo12: cabineoKitRefusal(type),
  };
  let status = 'Skylon puzzle: tabs, sockets and dog bones';
  if (cut?.system === 'dowel') {
    status = `${cut.dowels} dowels, ${cut.edge_bores} edge bores by hand · `
      + `${cut.gate ? `${cut.gate}: the CNC export refuses it` : 'confirmed by the owner'}`;
  } else if (cut?.system === 'biscuit') {
    status = `${cut.sets} biscuit sets, ${cut.screws} screws, the marks on the sides · the owner's own set, no gate`;
  } else if (isCabineoSystem(cut?.system)) {
    status = `Cabineo ${cut.variant}: ${cut.pockets} pockets from the outside face, ${cut.holes} holes in the sides · `
      + `${cut.gate ? `${cut.gate}: the CNC export refuses it` : 'confirmed by the owner'}`;
  } else if (cut?.refused) {
    status = `Kept the puzzle: ${cut.refused}`;
  }
  const lit = cut?.system && JOINT_CHOICES.some((c) => c.id === cut.system) ? cut.system : 'puzzle';
  const askedRefusal = refusals[asked] || null;
  return (
    <div className="space-y-1" data-joints-row={unit.id}>
      <div className="cc-row">
        <div className="flex flex-col">
          <span className="text-sm text-ink-100">Joints</span>
          <span className="text-[11px] text-ink-400" data-joints-status="1">{status}</span>
        </div>
        {/* five buttons on a 310 px panel: they wrap (the PART E walk read Cabineo 8 / 12 past the panel edge) */}
        <div className="flex flex-wrap items-center justify-end gap-1 max-w-[180px]" data-joints-options="1">
          {JOINT_CHOICES.map((c) => {
            const refusal = refusals[c.id] || null;
            return (
              <button
                key={c.id}
                type="button"
                data-joints={c.id}
                disabled={Boolean(refusal)}
                title={refusal || c.title}
                className={`${lit === c.id ? 'cc-btn-gold' : 'cc-btn'} ${refusal ? 'opacity-50' : ''}`}
                onClick={() => onSet(c.id)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      {askedRefusal && <p className="text-[11px] text-ink-400">{askedRefusal}</p>}
      {asked === 'cabineo' && <p className="text-[11px] text-ink-400" data-joints-cabineo="1">{CABINEO_REFUSAL}</p>}
    </div>
  );
}

/** "full" for 0, the number otherwise. */
function notchHeightText(h) { return Number(h) > 0 ? String(Math.round(Number(h))) : 'full'; }

function NotchModal() {
  const modal = useUiStore((s) => s.modal);
  const args = useUiStore((s) => s.modalArgs);
  if (modal !== 'notch' || !args?.unitId || !args?.corner) return null;
  return <NotchWindow key={`${args.unitId}:${args.corner}`} args={args} />;
}

function NotchWindow({ args }) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const closeModal = useUiStore((s) => s.closeModal);
  const stopNotchPick = useUiStore((s) => s.stopNotchPick);
  const setUnitNotch = useProjectStore((s) => s.setUnitNotch);
  const unit = useProjectStore((s) => s.units.find((u) => u.id === args.unitId)) || null;
  const def = profile?.notch?.defaults || {};
  const had = unit?.params?.notch?.corner === args.corner ? unit.params.notch : null;
  const [w, setW] = useState(String(had?.w ?? def.widthMm ?? ''));
  const [d, setD] = useState(String(had?.d ?? def.depthMm ?? ''));
  const [h, setH] = useState(notchHeightText(had?.h ?? def.heightMm ?? 0));
  const [said, setSaid] = useState('');
  const close = () => { closeModal(); stopNotchPick(); };
  // The shell measures itself in a hidden frame first, so `autoFocus` alone
  // can miss; WIDTH is asked for the caret on a short timer until it has it
  // (UnitSizeModal's own answer, T74 F7), then left alone.
  useEffect(() => {
    let id = 0;
    const until = Date.now() + 3000;
    const land = () => {
      const el = document.querySelector('[data-testid="notch-ask"] [data-notch-field="width"]');
      if (el && document.activeElement !== el) { el.focus(); el.select?.(); }
      if ((!el || document.activeElement !== el) && Date.now() < until) id = setTimeout(land, 30);
    };
    id = setTimeout(land, 0);
    return () => clearTimeout(id);
  }, []);
  const apply = () => {
    const height = /^\s*(full|0)?\s*$/i.test(h) ? 0 : Number(h);
    const res = setUnitNotch(args.unitId, {
      corner: args.corner, w: Number(w), d: Number(d), h: height,
    });
    if (!res?.ok) { setSaid(res?.said || ''); return; }
    close();
  };
  const field = (label, key, value, onChange, autoFocus = false) => (
    <label className="block">
      <span className="cc-label">{label}</span>
      <input
        className="cc-input w-full text-right"
        data-notch-field={key}
        value={value}
        autoFocus={autoFocus}
        onFocus={(e) => e.target.select()}
        onChange={(e) => { onChange(e.target.value); setSaid(''); }}
      />
    </label>
  );
  return (
    <Modal name="notch" title={`CUT CORNER ${args.corner}`} anchor={args.anchor || null} width="w-64" onClose={close}>
      <form
        className="space-y-2"
        data-testid="notch-ask"
        data-notch-corner={args.corner}
        data-notch-unit={args.unitId}
        onSubmit={(e) => { e.preventDefault(); apply(); }}
      >
        <div className="grid grid-cols-3 gap-2">
          {field('WIDTH', 'width', w, setW, true)}
          {field('DEPTH', 'depth', d, setD)}
          {field('HEIGHT', 'height', h, setH)}
        </div>
        <p className="text-[11px] text-ink-400">mm. WIDTH along the back, DEPTH into the carcass, HEIGHT from the floor; full runs top to bottom.</p>
        {said && <p className="text-[11px] text-status-danger" data-testid="notch-said">{said}</p>}
        <div className="flex justify-end">
          <button type="submit" className="cc-btn" data-testid="notch-cut">CUT</button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * ─── T75 F4 / F11 · THE WORKTOP OF ONE CABINET, AND THE ISLAND'S SEATING ───
 *
 * *"The L kit's worktop is one slab shaped like the L"* and *"a seating
 * overhang of `profile.worktop.seatingMm` offered as one click on a face with
 * no units"*: the walk found that no click reached either (the worktop button
 * lives in the panel of two or more). Here, for the one selected cabinet: Add
 * worktop where the cabinet may carry one alone (an L, a desk, a cabinet on an
 * island; the store's own `worktopEligible` decides and its refusal is said),
 * Remove where it carries one, and on an island's slab one button per face
 * with no cabinet on it. The overhang is the profile's number; nothing typed.
 */
function WorktopRow({ unit }) {
  const design = useProjectStore((s) => s.project.design);
  const room = useProjectStore((s) => s.project.room);
  const units = useProjectStore((s) => s.units);
  const addWorktop = useProjectStore((s) => s.addWorktop);
  const removeWorktop = useProjectStore((s) => s.removeWorktop);
  const seatingOverhang = useProjectStore((s) => s.seatingOverhang);
  const extendIslandWorktop = useProjectStore((s) => s.extendIslandWorktop);
  const notify = useUiStore((s) => s.notify);
  const profile = useCabinetProfileStore((s) => s.profile);
  if (!takesWorktop(unit.type)) return null;
  const walls = roomWalls(room);
  const records = migrateDesign(design).worktops;
  const isle = unit.position?.island ?? null;
  const record = records.find((w) => (isle != null && w.island === isle) || w.unitIds.includes(unit.id)) || null;
  const alone = worktopEligible([unit], profile, { walls });
  if (!record) {
    if (!alone.ok) return null;
    return (
      <div className="cc-row" data-worktop-row="add">
        <div className="flex flex-col">
          <span className="text-sm text-ink-100">Worktop</span>
          <span className="text-[11px] text-ink-400">not fitted</span>
        </div>
        <button
          type="button"
          className="cc-btn"
          data-add-worktop-one="1"
          onClick={() => { const res = addWorktop([unit.id]); if (!res.ok) notify(res.error, 'warn'); }}
        >
          Add worktop
        </button>
      </div>
    );
  }
  const faces = record.island ? walls.filter((w) => w.island === record.island) : [];
  const empty = faces.filter((f) => !units.some((u) => (u.position?.wall ?? 0) === f.index && !getUnitType(u.type).freePanel));
  return (
    <div className="space-y-1" data-worktop-row={record.id}>
      <div className="cc-row">
        <div className="flex flex-col">
          <span className="text-sm text-ink-100">Worktop</span>
          <span className="text-[11px] text-ink-400">
            {record.island ? 'one slab over the whole island' : (record.kind === 'L' ? 'one slab shaped like the L' : `over ${record.unitIds.length} cabinet${record.unitIds.length === 1 ? '' : 's'}`)}
          </span>
        </div>
        <button type="button" className="cc-btn" data-remove-worktop-one={record.id} onClick={() => removeWorktop(record.id)}>Remove</button>
      </div>
      {empty.map((f) => {
        const on = Number(record.extend?.[f.face]) > 0;
        return (
          <div key={f.face} className="cc-row" data-seating-face={f.face}>
            <span className="text-[11px] text-ink-400">
              {on ? `Seating on face ${f.face}: ${formatMm(record.extend[f.face])} mm` : `Face ${f.face} has no cabinets`}
            </span>
            {on ? (
              <button type="button" className="cc-btn-ghost" title="Take the seating overhang off" onClick={() => extendIslandWorktop(record.id, f.face, 0)}>×</button>
            ) : (
              <button
                type="button"
                className="cc-btn"
                data-seating-add={f.face}
                onClick={() => { const res = seatingOverhang(record.id, f.face); if (!res.ok) notify(res.error, 'warn'); }}
              >
                Seating overhang
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
