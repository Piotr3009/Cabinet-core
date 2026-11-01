import {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { groupedActions, menuActions, menuTitle } from '../lib/contextActions.js';
import { formatMm } from '../engine/format.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
import { clampMenuPosition, placeMenuUnderAnchor, placeSubmenu } from '../lib/menuPlacement.js';
import { anchorOfElement } from '../lib/modalAnchor.js';

// Right-click menu for an item in the canvas (CLAUDE.md phase 5).
// The actions themselves live in lib/contextActions.js — this file is only
// where they are shown, dismissed and keyboard-handled.
//
// THE RIGHT-CLICK MENU TURN (the owner's boards, 01.11.2026), J1 and J2:
// 280 px wide (*"280 px: Ewa, teraz tez Julia"*), the header at 13 px with the
// title lib/contextActions.js `menuTitle` gives, one 16 px tick column in every
// row so every label starts on one line, and four kinds of row drawn from the
// action's own `kind`: a COMMAND, a TOGGLE (a 12 px square: gold with a tick,
// empty, or a gold outline with a short bar when only some of the selection
// has it), a CHOICE (the label, then circles, each a real button, one chosen
// or none when the selection disagrees) and a SUBMENU (a chevron; it opens
// beside the menu). Groups are parted by a hairline and may carry a small grey
// title ("Cabinet W02"); Delete stands alone at the bottom under a line, in
// red. The same menu opens from the "..." icon at the top of the right panel
// (`ActionsMenuButton`, below), anchored under it.

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
  const removeUnit = useProjectStore((s) => s.removeUnit);
  const addEndPanel = useProjectStore((s) => s.addEndPanel);
  const addPlinth = useProjectStore((s) => s.addPlinth);
  const removePlinth = useProjectStore((s) => s.removePlinth);
  // T75 F5 · the upstand, on and off per run like the plinth.
  const addUpstand = useProjectStore((s) => s.addUpstand);
  const removeUpstand = useProjectStore((s) => s.removeUpstand);
  const addTopInfill = useProjectStore((s) => s.addTopInfill);
  const removeEndPanel = useProjectStore((s) => s.removeEndPanel);
  const setSideInfillEnabled = useProjectStore((s) => s.setSideInfillEnabled);
  const setSideInfillPinned = useProjectStore((s) => s.setSideInfillPinned);
  const removeTopInfill = useProjectStore((s) => s.removeTopInfill);
  const setCornice = useProjectStore((s) => s.setCornice);
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
  // THE RIGHT-CLICK MENU TURN (01.11.2026): what the new entries call. The
  // door's own entries (its window, its hinge side, Remove this door) reach
  // the very acts the door's double click, the right panel and Backspace
  // reach; Centre between arms the right panel's own two pick mode; Duplicate
  // is projectStore.duplicateUnits. The engine result is the door's own hinge.
  const unitResult = useProjectStore((s) => s.unitResult);
  const duplicateUnits = useProjectStore((s) => s.duplicateUnits);
  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const setBayDoor = useProjectStore((s) => s.setBayDoor);
  const removeFront = useProjectStore((s) => s.removeFront);
  const selectElement = useUiStore((s) => s.selectElement);
  const clearElement = useUiStore((s) => s.clearElement);
  const armCentreBetween = useUiStore((s) => s.armCentreBetween);

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
      panelId: menu.panelId ?? null,
      panelDrawer: menu.drawer ?? null,
      result: unitResult(unit.id),
      store: {
        // F5.4: every bulk entry is one undo step, and this is the only place
        // that promise is made.
        batch,
        redistributeShelves,
        removeUnit,
        closeAllFronts,
        addEndPanel: (unitId, opts) => {
          const { error } = addEndPanel(unitId, opts) || {};
          if (error) notify(error, 'warn');
        },
        removeEndPanel,
        addPlinth: (unitId) => { if (!addPlinth(unitId)) notify('This type stands on no legs — it takes no plinth.', 'warn'); },
        removePlinth,
        addUpstand: (unitId) => { if (!addUpstand(unitId)) notify('An upstand stands on a worktop: this unit has none to stand on.', 'warn'); },
        removeUpstand,
        addTopInfill: (unitId) => {
          if (!addTopInfill(unitId)) notify('No room between this unit and the ceiling.', 'warn');
        },
        removeTopInfill,
        // ─── TURN 26 (CLAUDE.md F9.1): THE TOGGLE THAT DID NOTHING ──────────
        //
        // Owner: the right-click cornice toggle does nothing. The menu item was
        // there, the store action was there, and the ENTRY IN THIS OBJECT was
        // not — so `store.setCornice?.(unit.id, h)` was an optional call on
        // `undefined`, which is a silent no-op by design. The `?.` that makes
        // this list safe to grow is the same `?.` that made a missing line
        // invisible; `verify/t26/cornice-toggle.md` carries the post-mortem and
        // `test/turn26-f9-cornice.test.js` now asserts that EVERY entry the
        // menu can produce has the function it calls.
        //
        // The notices are the store's own — the ceiling check and the infill
        // the moulding is screwed to — and they are shown rather than dropped.
        setCornice: (unitId, height) => {
          const { notices } = setCornice(unitId, height) || {};
          for (const notice of notices || []) notify(notice, 'warn');
        },
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
        // Turn 20 (CLAUDE.md F11.1): the same window, scoped to one drawer.
        editDrawer: (unitId, drawer) => openModal('cabinet', { unitId, drawer, anchor: menuAnchor() }),
        // ─── Turn 13 (CLAUDE.md F5.3) ───
        // It takes the whole SELECTION and is one undo step of its own: the
        // store's bulk action batches internally, so the menu does not wrap it
        // again.
        addDoors: (ids) => {
          const { fitted, already } = addDoorsBulk(ids) || {};
          if (!fitted && already) notify('They already have their doors.', 'info');
        },
        // The options for what was just added are in the panel, not in a modal.
        openPanelSection: (id) => { openRightPanel(); setPanelSection(id, true); },
        // ─── THE RIGHT-CLICK MENU TURN: THE NEW ENTRIES' ACTS ───────────────
        // A door's own window, as its double click opens it: the piece is
        // selected (the right panel follows) and the window stands beside the
        // menu.
        editElement: (unitId, panelId) => {
          selectElement(unitId, panelId);
          openModal('element', { unitId, panelId, anchor: menuAnchor() });
        },
        // The right panel's Center between, armed on this cabinet: the next two
        // clicks in the view are the lower and the upper piece, and the menu
        // says so, because the menu closes and nothing else would.
        armCentreBetween: (unitId) => {
          armCentreBetween(unitId);
          notify('Centre between: click the lower piece, then the upper one. Esc cancels.', 'info');
        },
        // Duplicate refuses in the store's own words when a copy finds no room.
        duplicateUnits: (ids) => {
          const res = duplicateUnits(ids);
          if (res && res.ok === false) notify(res.error, 'warn');
        },
        // A face door's hinge side, and a bay door's, as the right panel sets them.
        updateUnitParams,
        setBayDoor,
        // Remove this door: the Backspace road (ConfiguratorPage), the same two calls.
        removeFront,
        clearElement,
      },
    })
    // ─── Turn 14 (CLAUDE.md F6.4) ───
    // `showHinges` / `toggleHinges` are GONE from this menu. The owner's
    // verdict is that the choice is senseless; the hinges stay visible exactly
    // as turn 13 left them (the store flag and its profile default are
    // untouched, and View still owns it), and REDRAWING them is parked.
    //
    // THE RIGHT-CLICK MENU TURN: Rename, Colour..., Rotate 90, Back to wall,
    // Side to wall and Drawer fronts left the menu (the owner, 01.11.2026:
    // *"drawers front usun ... colour i turn tez usunac ... rename ... na pole
    // name, juz jest"*), so their wiring left this object with them. Their acts
    // stay where they live: the right panel's name field and its Colour,
    // Rotation and Wall rows, the store's drawer front acts.
    : []), [unit, menu, selection, unitResult, batch, redistributeShelves,
    removeUnit, closeAllFronts, addEndPanel, removeEndPanel, addPlinth, removePlinth, addUpstand, removeUpstand, addTopInfill,
    removeTopInfill, setCornice, addBottomMask, removeBottomMask,
    setSideInfillEnabled, setSideInfillPinned, notify, openRightPanel,
    setPanelSection, openModal, addDoorsBulk, selectElement, armCentreBetween, duplicateUnits,
    updateUnitParams, setBayDoor, removeFront, clearElement]);

  // ─── Placement (turn 11, CLAUDE.md F1.4a) ───
  // Measured, then clamped by lib/menuPlacement.js. `at` is null until the
  // first layout pass, which is what the `visibility` below is for.
  // THE RIGHT-CLICK MENU TURN, J2: a menu opened from the "..." icon carries
  // the icon's rectangle (`anchor`) and hangs from it; a menu opened at the
  // pointer opens from the pointer, as it always has.
  const [at, setAt] = useState(null);
  // J1: the submenu standing open beside one of the rows, or null.
  const [sub, setSub] = useState(null);
  const subBox = useRef(null);
  const [subAt, setSubAt] = useState(null);

  useLayoutEffect(() => {
    if (!menu) { setAt(null); return; }
    const el = box.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    setAt(menu.anchor
      ? placeMenuUnderAnchor({
        anchor: menu.anchor, width: rect.width, height: rect.height, viewport,
      })
      : clampMenuPosition({
        x: menu.x,
        y: menu.y,
        width: rect.width,
        height: rect.height,
        viewport,
      }));
    // `actions.length` is in the deps because a menu whose entries change is a
    // menu of a different height, and it has to be re-placed.
  }, [menu, actions.length]);

  // Another press, another menu: it opens with no submenu standing beside it.
  useEffect(() => { setSub(null); }, [menu]);

  // The submenu is measured and stood beside the row that opened it; opened
  // from the keyboard, the first of its rows takes the focus.
  useLayoutEffect(() => {
    if (!sub) { setSubAt(null); return; }
    const el = subBox.current;
    const menuEl = box.current;
    if (!el || !menuEl) return;
    const size = el.getBoundingClientRect();
    setSubAt(placeSubmenu({
      menu: menuEl.getBoundingClientRect(),
      row: sub.row,
      size: { width: size.width, height: size.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }));
    if (sub.focus) el.querySelector?.('[role^="menuitem"]:not([aria-disabled="true"])')?.focus?.();
  }, [sub]);

  const startDrag = (e) => {
    const el = box.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    // A submenu stands beside the menu where it was; the menu moving away
    // from it would leave it hanging in the air, so it folds.
    setSub(null);
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
  // J1: Delete (every `danger` row) stands ALONE at the bottom, under a line.
  const { body, danger } = useMemo(() => splitDanger(groups), [groups]);
  const subGroups = useMemo(() => splitDanger(groupedActions(sub?.items || [])), [sub]);

  if (!menu || !unit) return null;

  // The header reads the same four facts the entries do (lib/contextActions.js
  // works the cabinets out once from them: one, several, a door, a drawer front).
  const title = menuTitle({
    unit,
    selection,
    panelPart: menu.part ?? null,
    panelId: menu.panelId ?? null,
    panelDrawer: menu.drawer ?? null,
  });

  // What a row does when it is chosen. Every road closes the menu, as every
  // entry always has; Delete also drops the selection it has just emptied.
  const runAction = (a) => {
    if (a.disabled) return;
    a.run?.();
    if (a.id === 'delete') clearSelection();
    closeContextMenu();
  };
  const runOption = (a, option) => {
    if (a.disabled || option.disabled) return;
    option.run?.();
    closeContextMenu();
  };
  const openSub = (a, el, focus = false) => {
    if (a.disabled) return;
    setSub({
      id: a.id, label: a.label, items: a.items || [], row: el?.getBoundingClientRect?.() || null, rowEl: el || null, focus,
    });
  };
  const leaveSub = () => { if (sub) setSub(null); };
  const closeSubToRow = () => {
    const row = sub?.rowEl;
    setSub(null);
    row?.focus?.();
  };

  return (
    <>
      <div
        ref={box}
        role="menu"
        aria-label={title}
        data-context-menu="1"
        className={`fixed ${LAYER_CLASS.menu} w-[280px] max-h-[calc(100vh-16px)] flex flex-col cc-panel py-1`}
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
            drag from reaching the canvas underneath. J1: 13 px, the title the
            actions file gives, and the grip on the right that says it moves. */}
        <div
          className="h-[35px] shrink-0 px-3 flex items-center justify-between gap-2 text-[13px] leading-[18px] text-ink-200 border-b border-shell-600 cursor-move select-none touch-none"
          title="Drag to move this menu"
          data-menu-header="1"
          onPointerDown={startDrag}
        >
          <span className="min-w-0 truncate">{title}</span>
          <Grip />
        </div>
        {/* ─── Turn 14 (CLAUDE.md F6.3): the sections, and the gold rule ───
            The ORDER and the grouping are DATA (lib/contextActions.js); all this
            component does is draw a delicate line between one group and the next.
            J1: the list scrolls inside the menu as a safety net only; the
            placement keeps the whole menu on the screen. */}
        <div className="cc-scroll min-h-0 flex-1" data-menu-body="1">
          {body.map((group, gi) => (
            <div key={group.id} role="group" aria-label={group.title || undefined} data-menu-group={group.id}>
              {gi > 0 && <Divider id={group.id} />}
              {group.title ? <GroupTitle text={group.title} /> : null}
              {group.actions.map((a) => (
                <MenuRow key={a.id} a={a} sub={sub} onRun={runAction} onOption={runOption} onOpenSub={openSub} onEnterRow={leaveSub} />
              ))}
            </div>
          ))}
          {danger.length > 0 && (
            <div role="group" data-menu-group="danger">
              {body.length > 0 && <Divider id="danger" />}
              {danger.map((a) => (
                <MenuRow key={a.id} a={a} sub={sub} onRun={runAction} onOption={runOption} onOpenSub={openSub} onEnterRow={leaveSub} />
              ))}
            </div>
          )}
        </div>
      </div>
      {sub && (
        <div
          ref={subBox}
          role="menu"
          aria-label={sub.label}
          data-context-submenu={sub.id}
          className={`fixed ${LAYER_CLASS.menu} w-[280px] max-h-[calc(100vh-16px)] cc-panel py-1 cc-scroll`}
          style={{ left: subAt?.left ?? 0, top: subAt?.top ?? 0, visibility: subAt ? 'visible' : 'hidden' }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); closeSubToRow(); } }}
        >
          {subGroups.body.map((group, gi) => (
            <div key={group.id} role="group" aria-label={group.title || undefined} data-menu-group={group.id}>
              {gi > 0 && <Divider id={group.id} />}
              {group.title ? <GroupTitle text={group.title} /> : null}
              {group.actions.map((a) => (
                <MenuRow key={a.id} a={a} sub={null} onRun={runAction} onOption={runOption} onOpenSub={() => {}} onEnterRow={() => {}} />
              ))}
            </div>
          ))}
          {subGroups.danger.length > 0 && (
            <div role="group" data-menu-group="danger">
              {subGroups.body.length > 0 && <Divider id="danger" />}
              {subGroups.danger.map((a) => (
                <MenuRow key={a.id} a={a} sub={null} onRun={runAction} onOption={runOption} onOpenSub={() => {}} onEnterRow={() => {}} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── THE RIGHT-CLICK MENU TURN, J1: THE ROWS ─────────────────────────────────
//
// Every size here is the board's (OneCabinet, Door, ThreeCabinets, 01.11.2026):
// rows 32 px, the tick column 16 px, the square 12 px, the circles 10 px, the
// framed entry 34 px. Where a finger is the pointer (an iPad), every row and
// every segment grows to 44 px (Ewa's note on the board: *"pole do klikniecia
// min. 44 x 32 px"*, and 44 for a finger).

/** A row's height: 32 px for a mouse, 44 px for a finger. */
const ROW_H = 'min-h-8 [@media(pointer:coarse)]:min-h-11';
/** A segment's height: 32 px for a mouse, 44 px for a finger. */
const SEG_H = 'h-8 [@media(pointer:coarse)]:h-11';

/**
 * The rows of a menu in two parts: the groups as given, less every `danger`
 * row, and the danger rows on their own, which the menu draws last, under a
 * line. Pure, so test/menu-ui.test.js asks it as written.
 */
export function splitDanger(groups) {
  const danger = [];
  const body = [];
  for (const group of groups || []) {
    const keep = (group.actions || []).filter((a) => {
      if (a.danger) { danger.push(a); return false; }
      return true;
    });
    if (keep.length) body.push({ ...group, actions: keep });
  }
  return { body, danger };
}

/** An action's kind: the contract's own word, or (for an older action) read off `checked`. */
export function kindOf(a) {
  if (a?.kind) return a.kind;
  return a?.checked === undefined ? 'command' : 'toggle';
}

/** What the tooltip says: the reason a disabled row is grey, else its hint. */
function tipOf(a) {
  if (a.disabled) return a.disabledReason || a.hint || '';
  return a.hint || '';
}

function MenuRow({
  a, sub, onRun, onOption, onOpenSub, onEnterRow,
}) {
  const kind = kindOf(a);
  if (kind === 'choice') return <ChoiceRow a={a} onOption={onOption} onEnterRow={onEnterRow} />;
  const isSub = kind === 'submenu';
  const open = isSub && sub?.id === a.id;
  const off = Boolean(a.disabled);
  let tone = 'text-ink-100';
  if (a.danger) tone = 'text-status-danger';
  if (off) tone = 'text-ink-400 cursor-not-allowed';
  const hover = off ? '' : 'hover:bg-shell-700 focus-visible:bg-shell-700';
  const shape = a.framed
    // F6.1: "Edit cabinet" FIRST and FRAMED, a bordered standout entry,
    // because it is the one a joiner reaches for once the cabinet is standing.
    ? `px-1 py-1 min-h-[34px] [@media(pointer:coarse)]:min-h-11 rounded border border-gold ${off ? 'text-ink-400' : 'text-ink-50'}`
    : `px-3 py-1.5 ${ROW_H} ${tone}`;
  const button = (
    <button
      type="button"
      role={kind === 'toggle' ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked={kind === 'toggle' ? (a.checked === 'mixed' ? 'mixed' : Boolean(a.checked)) : undefined}
      aria-disabled={off ? 'true' : undefined}
      aria-haspopup={isSub ? 'menu' : undefined}
      aria-expanded={isSub ? open : undefined}
      data-menu-entry={a.id}
      data-menu-kind={kind}
      title={tipOf(a)}
      className={`w-full flex items-center gap-2 text-left text-sm leading-5 outline-none transition-colors ${shape} ${hover} ${open ? 'bg-shell-700' : ''}`}
      onPointerEnter={(e) => {
        if (!isSub) { onEnterRow(); return; }
        if (e.pointerType === 'mouse' && !open) onOpenSub(a, e.currentTarget);
      }}
      onKeyDown={isSub ? (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); onOpenSub(a, e.currentTarget, true); }
      } : undefined}
      onClick={(e) => {
        if (isSub) { if (!open) onOpenSub(a, e.currentTarget); return; }
        onRun(a);
      }}
    >
      <TickColumn kind={kind} checked={a.checked} />
      <span className="min-w-0 flex-1">{a.label}</span>
      {isSub ? <Chevron /> : null}
    </button>
  );
  return a.framed ? <div className="px-2 py-1">{button}</div> : button;
}

/**
 * A CHOICE: the label, then its segments, each one a real button with a
 * circle. Up to three segments stand on the label's line (Cornice: None, 70,
 * 100); four or more go under the label at the full width (End panels: None,
 * Left, Right, Both), because four do not fit beside a label in 280 px.
 * A selection that disagrees has NO segment selected, never a guess.
 */
function ChoiceRow({ a, onOption, onEnterRow }) {
  const options = a.options || [];
  const stacked = options.length > 3;
  const off = Boolean(a.disabled);
  const segments = (
    <span
      role="radiogroup"
      aria-label={a.label}
      className={`inline-flex ${stacked ? 'w-full' : 'shrink-0'} border border-shell-600 rounded overflow-hidden`}
    >
      {options.map((o, i) => {
        const dead = off || Boolean(o.disabled);
        return (
          <button
            key={o.id}
            type="button"
            role="menuitemradio"
            aria-checked={Boolean(o.selected)}
            aria-disabled={dead ? 'true' : undefined}
            data-menu-option={o.id}
            title={dead ? (o.disabledReason || a.disabledReason || o.hint || a.hint || '') : (o.hint || a.hint || '')}
            className={`${SEG_H} min-w-[44px] ${stacked ? 'flex-1 px-1.5 gap-1' : 'px-2 gap-1.5'} inline-flex items-center justify-center text-[13px] whitespace-nowrap outline-none transition-colors ${
              i > 0 ? 'border-l border-shell-600' : ''} ${
              o.selected ? 'bg-gold/15 text-ink-50' : 'bg-shell-700 text-ink-100'} ${
              dead ? 'text-ink-400 cursor-not-allowed' : 'hover:bg-shell-600 focus-visible:bg-shell-600'}`}
            onClick={() => onOption(a, o)}
          >
            <Radio on={Boolean(o.selected)} />
            <span>{o.label}</span>
          </button>
        );
      })}
    </span>
  );
  const hooks = {
    role: 'group',
    'aria-label': a.label,
    'data-menu-entry': a.id,
    'data-menu-kind': 'choice',
    'data-choice-layout': stacked ? 'stacked' : 'inline',
    title: tipOf(a),
    onPointerEnter: onEnterRow,
  };
  const words = off ? 'text-ink-400' : 'text-ink-100';
  if (stacked) {
    return (
      <div className="px-3 py-1.5" {...hooks}>
        <div className={`flex items-center gap-2 min-h-5 text-sm leading-5 ${words}`}>
          <TickColumn kind="choice" />
          <span className="min-w-0 flex-1">{a.label}</span>
        </div>
        <div className="pl-6 pt-1 flex">{segments}</div>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-1 min-h-10 text-sm leading-5 ${words}`} {...hooks}>
      <TickColumn kind="choice" />
      <span className="min-w-0 flex-1">{a.label}</span>
      {segments}
    </div>
  );
}

/** The 16 px column every row has, so every label starts on one line. */
function TickColumn({ kind, checked }) {
  return (
    <span className="w-4 shrink-0 flex items-center justify-center" data-menu-tick="1" aria-hidden="true">
      {kind === 'toggle' ? <ToggleBox checked={checked} /> : null}
    </span>
  );
}

/**
 * The toggle's 12 px square. On: gold, with a tick drawn by two borders. Off:
 * empty, a 1 px outline. Mixed (some of the selection has it): a gold outline
 * with a short bar, drawn, never a dash typed.
 */
function ToggleBox({ checked }) {
  if (checked === 'mixed') {
    return (
      <span className="relative inline-block w-3 h-3 rounded-[2px] border border-gold" data-toggle="mixed">
        <span className="absolute left-[2px] top-[4px] w-[6px] h-[2px] bg-gold" />
      </span>
    );
  }
  if (checked) {
    return (
      <span className="relative inline-block w-3 h-3 rounded-[2px] bg-gold" data-toggle="on">
        <span className="absolute left-[4px] top-[1px] w-[4px] h-[7px] border-r-2 border-b-2 border-shell-900 rotate-45" />
      </span>
    );
  }
  return <span className="inline-block w-3 h-3 rounded-[2px] border border-ink-400" data-toggle="off" />;
}

/** A choice's 10 px circle: gold with a dot when chosen, an outline when not. */
function Radio({ on }) {
  return on ? (
    <span className="relative inline-block shrink-0 w-2.5 h-2.5 rounded-full border border-gold" data-radio="on" aria-hidden="true">
      <span className="absolute left-[2px] top-[2px] w-1 h-1 rounded-full bg-gold" />
    </span>
  ) : (
    <span className="inline-block shrink-0 w-2.5 h-2.5 rounded-full border border-ink-400" data-radio="off" aria-hidden="true" />
  );
}

/** The 1 px line between two groups. */
function Divider({ id }) {
  return <div className="mx-3 my-1 border-t border-gold/30" role="separator" data-menu-divider={id} />;
}

/** A group's own small grey heading ("Cabinet W02" under a door's rows). */
function GroupTitle({ text }) {
  return (
    <div className="px-3 pt-2 pb-1 text-[11px] leading-4 uppercase tracking-[0.08em] text-ink-400 select-none" data-menu-group-title="1">
      {text}
    </div>
  );
}

/** The submenu row's chevron. */
function Chevron() {
  return (
    <svg className="shrink-0 text-ink-200" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The header's grip: six dots that say the menu can be moved. */
function Grip() {
  return (
    <span className="grid grid-cols-[3px_3px] gap-[3px] shrink-0" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="block w-[3px] h-[3px] rounded-full bg-ink-400" />)}
    </span>
  );
}

// ─── THE RIGHT-CLICK MENU TURN, J2: THE ICON ─────────────────────────────────
//
// The owner chose option B, *"na gorze prawego panelu"*, for everyone: a "..."
// button at the top of the right panel, beside the cabinet's name, that opens
// the SAME menu the right click opens, for the selection as it stands, hung
// under the button. It is the way in for a hand that does not know the right
// click (and for a Mac trackpad, an iPad, a pen). 32 px square for a mouse,
// 44 px for a finger (the board: *"Ikona: 32 x 32 px na komputerze, 44 x 44 px
// na iPadzie"*).

/**
 * The request the icon hands `openContextMenu`: the scene's own shape (the
 * primary cabinet, no panel, no part) plus the button's rectangle, which is
 * what makes the menu hang from the button rather than open at a pointer.
 */
export function menuFromButton(unitId, rect) {
  const r = rect || {};
  const left = Number(r.left ?? r.x) || 0;
  const top = Number(r.top ?? r.y) || 0;
  const width = Number(r.width) || 0;
  const height = Number(r.height) || 0;
  return {
    x: left + width,
    y: top + height,
    unitId,
    panelId: null,
    part: null,
    drawer: null,
    from: 'icon',
    anchor: {
      x: left, y: top, width, height,
    },
  };
}

/** The "..." button. Nothing selected, nothing to act on: no button. */
export function ActionsMenuButton({ className = '' }) {
  const unitId = useUiStore((s) => s.selectedUnitId);
  const open = useUiStore((s) => s.contextMenu?.from === 'icon');
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  if (!unitId) return null;
  return (
    <button
      type="button"
      className={`cc-btn-ghost inline-flex items-center justify-center p-0 w-8 h-8 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 ${open ? 'text-gold bg-shell-700' : ''} ${className}`}
      data-menu-icon="1"
      aria-label="Actions"
      title="Actions: the same menu as a right click on the cabinet"
      aria-haspopup="menu"
      aria-expanded={open}
      // The menu closes on any press outside it; a press on its own button must
      // not close it only for the click to open it again.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (open) { closeContextMenu(); return; }
        openContextMenu(menuFromButton(unitId, e.currentTarget.getBoundingClientRect()));
      }}
    >
      <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
        {[0, 1, 2].map((i) => <span key={i} className="block w-1 h-1 rounded-full bg-current" />)}
      </span>
    </button>
  );
}
