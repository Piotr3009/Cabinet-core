import {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { getUnitType } from '../engine/types.js';
import { groupedActions, menuActions } from '../lib/contextActions.js';
import { formatMm } from '../engine/format.js';
import { clampMenuPosition } from '../lib/menuPlacement.js';
import { anchorOfElement } from '../lib/modalAnchor.js';

// Right-click menu for an item in the canvas (CLAUDE.md phase 5).
// The actions themselves live in lib/contextActions.js — this file is only
// where they are shown, dismissed and keyboard-handled.

export default function ContextMenu() {
  const menu = useUiStore((s) => s.contextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const closeAllFronts = useUiStore((s) => s.closeAllFronts);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const setPanelSection = useUiStore((s) => s.setPanelSection);
  const openRightPanel = useUiStore((s) => s.openRightPanel);
  const notify = useUiStore((s) => s.notify);
  const units = useProjectStore((s) => s.units);
  const redistributeShelves = useProjectStore((s) => s.redistributeShelves);
  const rotateUnit = useProjectStore((s) => s.rotateUnit);
  const removeUnit = useProjectStore((s) => s.removeUnit);
  const addEndPanel = useProjectStore((s) => s.addEndPanel);
  const addPlinth = useProjectStore((s) => s.addPlinth);
  const removePlinth = useProjectStore((s) => s.removePlinth);
  const addTopInfill = useProjectStore((s) => s.addTopInfill);
  const removeEndPanel = useProjectStore((s) => s.removeEndPanel);
  const setSideInfillEnabled = useProjectStore((s) => s.setSideInfillEnabled);
  const setSideInfillPinned = useProjectStore((s) => s.setSideInfillPinned);
  const unitDimensions = useUiStore((s) => s.unitDimensions);
  const toggleUnitDimensions = useUiStore((s) => s.toggleUnitDimensions);
  const removeTopInfill = useProjectStore((s) => s.removeTopInfill);
  const addBottomMask = useProjectStore((s) => s.addBottomMask);
  const removeBottomMask = useProjectStore((s) => s.removeBottomMask);
  const openModal = useUiStore((s) => s.openModal);
  // ─── Turn 13 (CLAUDE.md F5.3) ───
  // The menu is about the cabinet under the pointer AND about everything else
  // that is selected. The list is resolved to real units here so the actions
  // can read each one's own state (which side already has an end panel) rather
  // than assuming the primary speaks for all of them.
  const selectedUnitIds = useUiStore((s) => s.selectedUnitIds);
  const batch = useProjectStore((s) => s.batch);
  const addDoorsBulk = useProjectStore((s) => s.addDoorsBulk);

  const unit = units.find((u) => u.id === menu?.unitId) || null;
  const selection = useMemo(
    () => units.filter((u) => selectedUnitIds.includes(u.id)),
    [units, selectedUnitIds],
  );

  // What a modal opened FROM this menu is beside (turn 12, rule 15): the menu
  // itself, which is already standing next to the cabinet it is about. Read
  // before the menu closes — see MenuBar for the same reasoning.
  const box = useRef(null);
  const menuAnchor = () => anchorOfElement(box.current);

  const actions = useMemo(() => (unit
    ? menuActions({
      unit,
      selection,
      panelPart: menu.part,
      dimensions: Boolean(unitDimensions[unit.id]),
      store: {
        // F5.4: every bulk entry is one undo step, and this is the only place
        // that promise is made.
        batch,
        redistributeShelves,
        rotateUnit,
        removeUnit,
        closeAllFronts,
        toggleUnitDimensions,
        addEndPanel: (unitId, opts) => {
          const { error } = addEndPanel(unitId, opts) || {};
          if (error) notify(error, 'warn');
        },
        removeEndPanel,
        addPlinth: (unitId) => { if (!addPlinth(unitId)) notify('This type stands on no legs — it takes no plinth.', 'warn'); },
        removePlinth,
        addTopInfill: (unitId) => {
          if (!addTopInfill(unitId)) notify('No room between this unit and the ceiling.', 'warn');
        },
        removeTopInfill,
        // Turn 14 (CLAUDE.md F5): the board under a run of wall units.
        addBottomMask: (unitId) => {
          if (!addBottomMask(unitId)) notify('Only a hanging cabinet has an underside to mask.', 'warn');
        },
        removeBottomMask,
        setSideInfillEnabled: (unitId, on) => {
          setSideInfillEnabled(unitId, on);
          notify(on
            ? 'Scribe fillers on for this cabinet.'
            : 'Scribe fillers off for this cabinet — it can be pushed to the wall.', 'info');
        },
        // Turn 11 (CLAUDE.md F5.1): the replacement for the insets. A pinned
        // filler stays whatever the gap becomes, so the toast says what it IS
        // rather than what was clicked — a pin on a unit standing in the middle
        // of a run has nothing to fill and produces nothing, and silence there
        // would read as a broken button.
        setSideInfillPinned: (unitId, side, pin) => {
          const width = setSideInfillPinned(unitId, side, pin);
          const where = side === 'L' ? 'left' : 'right';
          if (!pin) { notify(`The ${where} filler is automatic again.`, 'info'); return; }
          notify(width > 0
            ? `Filler pinned on the ${where} — ${formatMm(width)} mm, and it stretches as the unit moves.`
            : `Pinned on the ${where}. There is no gap there yet — move the unit off the wall and the filler appears.`,
          'info');
        },
        // "Save as template" needs one thing the menu cannot give it: a NAME.
        // That is the modal's whole job (BACKLOG #30).
        saveAsTemplate: (unitId) => openModal('save-template', { unitId, anchor: menuAnchor() }),
        // Turn 12 (CLAUDE.md F4): the cabinet's own window, beside the cabinet.
        editCabinet: (unitId) => openModal('cabinet', { unitId, anchor: menuAnchor() }),
        // ─── Turn 13 (CLAUDE.md F5.3) ───
        // Both take the whole SELECTION, and both are one undo step of their
        // own: the store's bulk actions batch internally, so the menu does not
        // wrap them again.
        addDoors: (ids) => {
          const { fitted, already } = addDoorsBulk(ids) || {};
          if (fitted) notify(`Doors hung on ${fitted} cabinet${fitted === 1 ? '' : 's'}.`, 'ok');
          if (!fitted && already) notify('They already have their doors.', 'info');
        },
        unitColour: (ids) => openModal('unit-finish', { unitIds: ids, anchor: menuAnchor() }),
        // The options for what was just added are in the panel, not in a modal.
        openPanelSection: (id) => { openRightPanel(); setPanelSection(id, true); },
      },
    })
    // ─── Turn 14 (CLAUDE.md F6.4) ───
    // `showHinges` / `toggleHinges` are GONE from this menu. The owner's
    // verdict is that the choice is senseless; the hinges stay visible exactly
    // as turn 13 left them (the store flag and its profile default are
    // untouched, and View still owns it), and REDRAWING them is parked.
    : []), [unit, menu, unitDimensions, redistributeShelves, rotateUnit,
    removeUnit, closeAllFronts, toggleUnitDimensions, addEndPanel, removeEndPanel, addPlinth, removePlinth, addTopInfill,
    removeTopInfill, addBottomMask, removeBottomMask,
    setSideInfillEnabled, setSideInfillPinned, notify, openRightPanel,
    setPanelSection, openModal]);

  // ─── Placement (turn 11, CLAUDE.md F1.4a) ───
  // Measured, then clamped by lib/menuPlacement.js. `at` is null until the
  // first layout pass, which is what the `visibility` below is for.
  const [at, setAt] = useState(null);

  useLayoutEffect(() => {
    if (!menu) { setAt(null); return; }
    const el = box.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAt(clampMenuPosition({
      x: menu.x,
      y: menu.y,
      width: rect.width,
      height: rect.height,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }));
    // `actions.length` is in the deps because a menu whose entries change is a
    // menu of a different height, and it has to be re-placed.
  }, [menu, actions.length]);

  const startDrag = (e) => {
    const el = box.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    const grab = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const size = { width: rect.width, height: rect.height };

    // A dragged menu goes where it is PUT — clamped to the viewport all the
    // same, because dragging it off the screen is the bug this phase closes.
    const move = (ev) => setAt(clampMenuPosition({
      x: ev.clientX - grab.x,
      y: ev.clientY - grab.y,
      width: size.width,
      height: size.height,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      // A dragged menu is placed by the hand, so it never flips: the pointer
      // is holding its top-left corner and the clamp only keeps it on screen.
      margin: 0,
    }));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  useEffect(() => {
    if (!menu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeContextMenu(); };
    const onDown = () => closeContextMenu();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [menu, closeContextMenu]);

  const groups = useMemo(() => groupedActions(actions), [actions]);

  if (!menu || !unit) return null;

  return (
    <div
      ref={box}
      className="fixed z-50 w-[180px] cc-panel py-1"
      // Hidden for exactly one frame: the placement has to MEASURE the menu, and
      // a menu drawn at the raw pointer position first would flash off the
      // bottom of a short screen before it corrected itself.
      style={{ left: at?.left ?? menu.x, top: at?.top ?? menu.y, visibility: at ? 'visible' : 'hidden' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ─── The header, and the handle (turn 11, CLAUDE.md F1.4b) ───
          Draggable, like the Library panel: on a laptop the menu opens over the
          very cabinet it is about, and moving it aside is how you look at the
          thing while you choose what to do to it. Grabbing it also stops the
          drag from reaching the canvas underneath. */}
      <div
        className="px-3 py-1 text-[11px] text-ink-400 border-b border-shell-600 cursor-move select-none"
        title="Drag to move this menu"
        onPointerDown={startDrag}
      >
        {selection.length > 1 && selection.some((u) => u.id === unit.id)
          ? `${selection.length} cabinets selected`
          : `${unit.params.unit_num} · ${getUnitType(unit.type).label}`}
      </div>
      {/* ─── Turn 14 (CLAUDE.md F6.3): the sections, and the gold rule ───
          The ORDER and the grouping are DATA (lib/contextActions.js); all this
          component does is draw a delicate line between one group and the next.
          "Delicate" is a hairline at a third opacity in the app's own gold —
          heavy enough to separate three sections, light enough that a menu of
          eighteen entries does not read as a table. */}
      {groups.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && <div className="mx-3 my-1 border-t border-gold/30" data-menu-divider={group.id} />}
          {group.actions.map((a) => (
            <button
              key={a.id}
              type="button"
              data-menu-entry={a.id}
              disabled={a.disabled}
              className={`w-full text-left text-sm transition-colors disabled:opacity-40
                disabled:cursor-not-allowed hover:enabled:bg-shell-700 ${
                a.danger ? 'text-status-danger' : 'text-ink-100'} ${
                // F6.1: "Edit cabinet" FIRST and FRAMED — a bordered, standout
                // entry, because it is the one a joiner reaches for once the
                // cabinet is standing.
                a.framed
                  ? 'my-1 mx-2 px-2 py-1.5 rounded border border-gold text-gold w-[calc(100%-1rem)]'
                  : 'px-3 py-1.5'}`}
              title={a.hint || ''}
              onClick={() => {
                a.run();
                if (a.id === 'delete') clearSelection();
                closeContextMenu();
              }}
            >
              {/* The state, where the eye already is (turn 8, F7): a toggle that
                  does not say which way it is set is a toggle you have to try. */}
              {a.checked === undefined
                ? a.label
                : (
                  <span className="flex items-center gap-1.5">
                    <span className={a.checked ? 'text-gold' : 'text-ink-400'}>{a.checked ? '✓' : '·'}</span>
                    <span>{a.label}</span>
                  </span>
                )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
