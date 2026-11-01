// ─── Context-menu actions ───
//
// THE CONTRACT (the right-click menu turn, 01.11.2026; Bruno produces, Julia's
// `components/ContextMenu.jsx` renders; nothing else is promised):
//
//   menuActions(args) -> Action[]
//   menuTitle(args)   -> string, the menu's header
//   groupedActions(actions) -> [{ id, title?, actions }], in MENU_GROUPS order
//
//   args: { unit, selection?, panelPart?, panelId?, panelDrawer?, result?,
//           store?, profile? }   (aliases: `units` for selection, `part` for
//           panelPart or `{ part, drawer }`, `drawer` for panelDrawer)
//     unit       the cabinet under the pointer (the PRIMARY)
//     selection  every selected cabinet; the menu is about all of them only
//                when the one under the pointer is among them
//     panelPart  the engine part clicked ('FRONT' is a door, 'DRAWER-FRONT' a
//                drawer front); anything else is the cabinet itself
//     panelId    the engine panel id clicked (the door the door menu is about)
//     panelDrawer which drawer that panel belongs to, or null
//     result     the cabinet's engine result (`unitResult(unit.id)`): the
//                door's own hinge, a slope that forces it, a pair
//     store      the functions the entries call (below)
//
//   Action: { id, group, label, hint?, framed?, danger?, disabled?,
//             disabledReason?, kind: 'command' | 'toggle' | 'choice' |
//             'submenu', checked?: true | false | 'mixed',
//             options?: [{ id, label, selected: boolean, run }],
//             items?: Action[] (submenu), run? }
//     command  `run` does it
//     toggle   `checked` says the state; over several cabinets that disagree
//              it is 'mixed' and the label says "<Label> (<k> of <n>)"; a
//              click turns it ON for all, the next click OFF for all
//     choice   one row of `options`; none is `selected` where the cabinets
//              disagree; an option's `run` sets it on all of them
//     submenu  `items` is a whole menu (the one cabinet menu)
//   An action in the Cabinet group of a part menu also carries `groupTitle`,
//   which `groupedActions` hands on as the group's `title`.
//
//   The store functions the entries call, each through `store.<name>?.(...)`
//   (test/turn26-f9-cornice.test.js holds every one of them supplied):
//     batch(fn)                      one undo step around a multi act
//     editCabinet(unitId)            the cabinet editor
//     editDrawer(unitId, k)          the cabinet editor, scoped to drawer k
//     editElement(unitId, panelId)   the piece's own window (a door's double click)
//     addPlinth / removePlinth(unitId)
//     addTopInfill / removeTopInfill(unitId)
//     setCornice(unitId, heightMm)   0 is none
//     addEndPanel(unitId, { side }) / removeEndPanel(unitId, endPanelId)
//     setSideInfillEnabled(unitId, on)
//     setSideInfillPinned(unitId, side, pinned)
//     addBottomMask / removeBottomMask(unitId)
//     addUpstand / removeUpstand(unitId)
//     openPanelSection(sectionId)
//     redistributeShelves(unitId)    Centre shelves
//     armCentreBetween(unitId)       Centre between, the two pick mode
//     addDoors(unitIds)              the store's addDoorsBulk
//     closeAllFronts(unitId)
//     saveAsTemplate(unitId)         the modal reads the selection (a set with several)
//     duplicateUnits(unitIds)        projectStore.duplicateUnits
//     removeUnit(unitId)
//     updateUnitParams(unitId, patch)  a face door's hinge side
//     setBayDoor(unitId, bay, patch)   a bay door's hinge side
//     removeFront(unitId, panelId) and clearElement()  Remove this door, as Backspace
//
// Plain JS with no React and no store import: the actions receive the store
// functions they need, which is also what makes them testable in node.
//
// ─── THE HISTORY, SHORT ───
// Turn 8: every construction entry is a switch that says its state. Turn 13:
// the menu acts on the selection, through the store's `batch` (one undo step).
// Turn 14: the order is DATA (each entry names its group). Turn 20: a drawer's
// own window from a click on that drawer. Turn 25: the top cornice. Turn 50:
// Add doors and Show all dimensions left the menu (the owner, 25.08.2026:
// *"w prawym przycisku myszy menu nie powinno byc Add doors oraz Show
// dimensions"*). T74 F13: a free panel is one board. T75: the upstand; a set.
//
// ─── THE RIGHT-CLICK MENU TURN (the owner, 01.11.2026, on the mockups) ───
// *"drawers front usun ... colour i turn tez usunac, save as template narazie
// zostaw ... rename ... na pole name, juz jest, mniej zmian ... show in cnc tez
// nie, jak juz to copy czyli duplicate bym tylko zostawil, natomiast center
// shelves i center between oraz add doors bym dodal"*; *"tak jak teraz na
// wszystkie dzialaja ktore sa zaznaczone oczywiscie"*; *"wall fillers zostaw
// jak jest"*; *"zmien pisownie"* (Centre); *"menu i prawy panel tak jak jest, w
// menu prawego przycisku dodajemy jeszcze center between"*; of the drawer
// fronts: *"mam przycisk hide all fronts, wiec raczej nie potrzebuje tego
// przycisku, pamietaj mniej przyciskow lepiej dla wszystkich"*; of a door:
// *"to doors a nie cala szafka, nie zmieniaj"*.
//
//   OUT of the menu, the acts kept where they live: Rename (the right panel's
//   NAME field), Colour... (the right panel), Rotate 90, Back to wall, Side to
//   wall (the right panel), Drawer fronts (the store's acts stay). Never
//   built: Show in CNC, Size..., Lock, Copy size.
//   IN: Centre shelves (the spelling), Centre between, Add doors (back after
//   T50), Duplicate (new, projectStore.duplicateUnits; one cabinet only, its
//   turn kept: *"duplikujemy po jednej szafce, bedzie latwiej ... ten sam obrot"*).
//   SEVERAL: every entry acts on ALL selected (today 13 of 21 acted only on
//   the one clicked, Delete too); a toggle that differs is MIXED. Duplicate
//   is not offered over several (23:04).
//   A PART: a door or a drawer front has its own short menu, and the cabinet
//   it hangs on in one group below it, with the whole cabinet menu one click
//   away (All cabinet actions).

import { getUnitType } from '../engine/types.js';
import { getCabinetProfile } from '../engine/profile.js';
import { corniceOption } from '../engine/cornice.js';
import { hasBottomMask, hasTopInfill } from '../engine/runs.js';

/**
 * The sections, in the order the menu draws them.
 *
 *   part     the door's or the drawer front's own entries (a part menu)
 *   edit     the cabinet's own window, first and framed
 *   build    what finishes the cabinet and its run: plinth, infills, cornice,
 *            end panels, the fillers at the wall, the mask, the upstand
 *   inside   the shelves, the doors, the fronts
 *   copy     a template or a set, and Duplicate
 *   danger   Delete, red, alone, last
 *   cabinet  under a part menu: the cabinet the part hangs on (titled)
 */
export const MENU_GROUPS = ['part', 'edit', 'build', 'inside', 'copy', 'danger', 'cabinet'];

/** An entry that names no section of MENU_GROUPS lands here, never nowhere. */
const DEFAULT_GROUP = 'inside';

/**
 * The entries, grouped and in order: what the component renders.
 *
 * The ORDER of the sections is MENU_GROUPS and not the order entries happen to
 * be pushed in. A group carries a `title` only where its entries say one (the
 * Cabinet group of a part menu).
 */
export function groupedActions(actions) {
  const byGroup = new Map(MENU_GROUPS.map((g) => [g, []]));
  for (const a of actions || []) {
    const key = byGroup.has(a.group) ? a.group : DEFAULT_GROUP;
    byGroup.get(key).push(a);
  }
  return MENU_GROUPS
    .map((id) => {
      const list = byGroup.get(id);
      const title = list.find((a) => a.groupTitle)?.groupTitle;
      return title ? { id, title, actions: list } : { id, actions: list };
    })
    .filter((g) => g.actions.length);
}

/**
 * Who the menu is about, read once for the header and for the entries.
 *
 * The cabinets it acts on always include the one under the pointer: a
 * right-click on a cabinet outside the selection is about that cabinet alone,
 * because acting on three others would be the menu lying about what it is
 * about. With several, the menu is the SEVERAL menu whatever part was clicked:
 * the selection is what the hand set up, and the owner's rule is that every
 * entry acts on all of them.
 */
function contextOf({
  unit = null, selection = null, units = null, panelPart = null, part = null,
  panelDrawer = null, drawer = null,
} = {}) {
  const list = Array.isArray(selection) ? selection : (Array.isArray(units) ? units : null);
  const primary = unit || list?.[0] || null;
  const inList = (list || []).filter((u) => u && u.id);
  const targets = primary && inList.some((u) => u.id === primary.id) ? inList : (primary ? [primary] : []);
  const partName = typeof part === 'string' ? part : (part?.part ?? panelPart ?? null);
  const drawerNo = Number(part?.drawer ?? drawer ?? panelDrawer);
  const onDrawer = Number.isFinite(drawerNo) && drawerNo > 0 ? drawerNo : null;
  const many = targets.length > 1;
  let kind = 'cabinet';
  if (many) kind = 'several';
  else if (partName === 'FRONT') kind = 'door';
  else if (partName === 'DRAWER-FRONT') kind = 'drawer-front';
  return {
    unit: primary, targets, many, kind, partName, onDrawer,
  };
}

/**
 * A type's name as the header prints it. A few kit labels carry a dash
 * ("Drawer unit, 3 drawers" is written with one in engine/types.js); the menu
 * writes none, so the dash is read as the comma it means.
 */
function typeLabel(unit) {
  const label = unit?.type ? String(getUnitType(unit.type).label || '') : '';
  return label.replace(/\s*[\u2013\u2014]\s*/g, ', ');
}

/** "W02 Wardrobe": the cabinet's number and its type, as the canvas names it. */
function cabinetName(unit) {
  const num = unit?.params?.unit_num ?? '';
  return [num, typeLabel(unit)].filter(Boolean).join(' ');
}

/**
 * The header: "W02 · Wardrobe", "3 cabinets selected", "Door · W02 Wardrobe",
 * "Drawer front 2 · W02 Wardrobe".
 */
export function menuTitle(args = {}) {
  const ctx = contextOf(args);
  const { unit } = ctx;
  if (!unit) return '';
  if (ctx.kind === 'several') return `${ctx.targets.length} cabinets selected`;
  if (ctx.kind === 'door') return `Door · ${cabinetName(unit)}`;
  if (ctx.kind === 'drawer-front') {
    return `Drawer front${ctx.onDrawer ? ` ${ctx.onDrawer}` : ''} · ${cabinetName(unit)}`;
  }
  return `${unit.params?.unit_num ?? ''} · ${typeLabel(unit)}`;
}

/** Does this cabinet carry doors now: a face door, or a door in any bay? */
function hasDoorsFitted(unit) {
  const p = unit?.params || {};
  if (p.doors && p.doors !== false) return true;
  return Array.isArray(p.bay_doors) && p.bay_doors.some((b) => String(b?.door).toLowerCase() === 'one');
}

/** One cabinet's end panels as the choice row reads them: none, L, R or both. */
function endPanelValue(unit) {
  const own = unit?.params?.end_panels || [];
  const left = own.some((ep) => ep.side === 'L');
  const right = own.some((ep) => ep.side === 'R');
  if (left && right) return 'B';
  if (left) return 'L';
  if (right) return 'R';
  return 'none';
}

export function menuActions(args = {}) {
  const {
    store = {}, profile = getCabinetProfile(), result = null, panelId = null,
  } = args;
  const ctx = contextOf(args);
  const { unit } = ctx;
  if (!unit) return [];

  /**
   * Every multi act runs inside one batch: one undo step, never one per
   * cabinet. The batch is asked for EXPLICITLY rather than through `??`: a
   * batch that returns nothing (which is what a batch normally does) would make
   * `??` fall through and run the loop a second time.
   */
  const batched = (fn) => {
    if (typeof store.batch === 'function') store.batch(fn);
    else fn();
  };

  if (ctx.kind === 'door') return doorMenu({ ...ctx, store, profile, result, panelId, args });
  if (ctx.kind === 'drawer-front') return drawerFrontMenu({ ...ctx, store, args });
  return cabinetMenu({ ...ctx, store, profile, batched });
}

/**
 * THE CABINET MENU: one cabinet, or several. The one list for both, because
 * the owner's rule is one rule: an entry acts on every cabinet it is about.
 */
function cabinetMenu({
  unit, targets, many, partName, onDrawer, store, profile, batched,
}) {
  const type = getUnitType(unit.type);
  const actions = [];
  const n = targets.length;
  const fitting = (u) => !getUnitType(u.type).freePanel;
  const ids = (list) => list.map((u) => u.id);

  /**
   * A switch over the cabinets that can take it. `pool` is the cabinets the
   * entry is about (a wall unit takes no plinth, so three selected with one
   * wall unit among them is a plinth over two); its state is read per cabinet
   * and never copied from the primary. Off when none has it, on when all
   * have it, mixed between, and the count is said in the label. A click from
   * off or mixed turns it ON where it is not; from on it turns it OFF.
   */
  const toggle = ({
    id, label, pool, isOn, on, off, hintOn, hintOff, afterOn = null,
  }) => {
    if (!pool.length) return;
    const k = pool.filter(isOn).length;
    const checked = k === 0 ? false : (k === pool.length ? true : 'mixed');
    actions.push({
      id,
      group: 'build',
      kind: 'toggle',
      label: checked === 'mixed' ? `${label} (${k} of ${pool.length})` : label,
      checked,
      hint: checked === true ? hintOn : hintOff,
      run: () => {
        const turnOff = checked === true;
        batched(() => {
          for (const u of pool) {
            if (turnOff) { if (isOn(u)) off(u.id); } else if (!isOn(u)) on(u.id);
          }
        });
        if (!turnOff && afterOn) afterOn();
      },
    });
  };

  // ── edit: the cabinet's own window, FIRST and framed (turn 14) ──
  if (!many && !type.freePanel) {
    actions.push({
      id: 'edit-cabinet',
      group: 'edit',
      kind: 'command',
      framed: true,
      label: 'Edit cabinet…',
      hint: 'This cabinet on its own: explode it, turn a part over, edit any piece',
      run: () => store.editCabinet?.(unit.id),
    });
    // Turn 20 (F11.1): a click on a drawer's BOX (a side, the back, the
    // bottom) still offers that drawer's window. A click on its FRONT is the
    // drawer front menu.
    if (onDrawer && partName !== 'DRAWER-FRONT') {
      actions.push({
        id: 'edit-drawer',
        group: 'edit',
        kind: 'command',
        framed: true,
        label: `Edit drawer ${onDrawer}…`,
        hint: 'This drawer on its own: explode it, turn a part over, look at every piece',
        run: () => store.editDrawer?.(unit.id, onDrawer),
      });
    }
  }

  // ── build ──
  const carcasses = targets.filter(fitting);

  toggle({
    id: 'plinth',
    label: 'Plinth',
    pool: carcasses.filter((u) => {
      const t = getUnitType(u.type);
      return t.legs && t.mount === 'floor';
    }),
    isOn: (u) => u.params?.plinth === true,
    on: (id) => store.addPlinth?.(id),
    off: (id) => store.removePlinth?.(id),
    hintOn: 'Fitted. Click to take it off',
    hintOff: 'A toe kick under the cabinet; adjacent ones come out as ONE length',
    afterOn: () => store.openPanelSection?.('construction'),
  });

  toggle({
    id: 'top-infill',
    label: 'Top infill',
    // Turn 8 (F2.7): never on a base unit; what goes on top of it is a worktop.
    pool: carcasses.filter((u) => getUnitType(u.type).supports?.topInfill),
    // Turn 14 (F1.2): the RUN's state, not this carcass's alone.
    isOn: (u) => hasTopInfill(u),
    on: (id) => store.addTopInfill?.(id),
    off: (id) => store.removeTopInfill?.(id),
    hintOn: 'Fitted. Click to take it off: the whole run’s piece goes with it',
    hintOff: 'Closes the gap to the ceiling: drag its edge, or double-click it to fill',
    afterOn: () => store.openPanelSection?.('construction'),
  });

  // Turn 25 (F12.3): the cornice is a CHOICE of moulding, so it is one row of
  // options; the heights are the profile's, so a workshop that stocks a third
  // gets a third option.
  {
    const pool = carcasses.filter((u) => getUnitType(u.type).supports?.cornice);
    if (pool.length) {
      const heights = [0, ...(profile.autoParts?.cornice?.heights || [])];
      const values = pool.map((u) => corniceOption(u.params?.cornice, profile));
      const agreed = values.every((v) => v === values[0]) ? values[0] : null;
      actions.push({
        id: 'cornice',
        group: 'build',
        kind: 'choice',
        label: 'Cornice',
        hint: 'Bought moulding over the doors, one run; the heights are the workshop’s',
        options: heights.map((h) => ({
          id: h === 0 ? 'none' : String(h),
          label: h === 0 ? 'None' : String(h),
          selected: agreed === h,
          run: () => {
            batched(() => {
              for (const u of pool) {
                if (corniceOption(u.params?.cornice, profile) !== h) store.setCornice?.(u.id, h);
              }
            });
            store.openPanelSection?.('construction');
          },
        })),
      });
    }
  }

  // Turn 5 gave Left / Right / Both, turn 8 made each a switch; tonight they
  // are one row. Each option is the same acts as before, on and off: the
  // panels the option does not want come off, the ones it wants and the
  // cabinet lacks go on, one side at a time, so a cabinet hard against a
  // neighbour on one side gets the panel that fits and hears why the other
  // did not.
  {
    const pool = carcasses;
    if (pool.length) {
      const values = pool.map(endPanelValue);
      const agreed = values.every((v) => v === values[0]) ? values[0] : null;
      const OPTIONS = [['none', 'None'], ['L', 'Left'], ['R', 'Right'], ['B', 'Both']];
      actions.push({
        id: 'end-panels',
        group: 'build',
        kind: 'choice',
        label: 'End panels',
        hint: 'A masking panel outside a side, in the BOM like any other piece; its options are in the Construction section',
        options: OPTIONS.map(([value, label]) => ({
          id: value,
          label,
          selected: agreed === value,
          run: () => {
            const wantL = value === 'L' || value === 'B';
            const wantR = value === 'R' || value === 'B';
            let added = false;
            batched(() => {
              for (const u of pool) {
                const own = u.params?.end_panels || [];
                for (const ep of own) {
                  if ((ep.side === 'L' && !wantL) || (ep.side === 'R' && !wantR)) store.removeEndPanel?.(u.id, ep.id);
                }
                if (wantL && !own.some((ep) => ep.side === 'L')) { store.addEndPanel?.(u.id, { side: 'L' }); added = true; }
                if (wantR && !own.some((ep) => ep.side === 'R')) { store.addEndPanel?.(u.id, { side: 'R' }); added = true; }
              }
            });
            if (added) store.openPanelSection?.('construction');
          },
        })),
      });
    }
  }

  // The SIDE infill is DERIVED, a fact about where the cabinet stands
  // (BACKLOG #15), so the switch is "does this cabinet take one at all".
  // *"wall fillers zostaw jak jest"*: the three rows and their names as today.
  toggle({
    id: 'side-infill',
    label: 'Scribe fillers at the wall',
    pool: carcasses,
    isOn: (u) => u.params?.side_infill_off !== true,
    on: (id) => store.setSideInfillEnabled?.(id, true),
    off: (id) => store.setSideInfillEnabled?.(id, false),
    hintOn: 'On: parking the cabinet at the wall produces the filler that closes the gap',
    hintOff: 'Off: the gap beside it stays open, and the cabinet may be pushed to the wall',
  });

  // Turn 11 (F5.1): a pinned filler never vanishes when the cabinet drives
  // away from the wall and stretches to whatever the gap becomes. A cabinet
  // with its fillers switched off takes no pin: the switch above is the way
  // out of that contradiction, and the entry says so in words.
  for (const [key, side, word, widthKey] of [
    ['side_infill_left_pinned', 'L', 'left', 'side_infill_left_mm'],
    ['side_infill_right_pinned', 'R', 'right', 'side_infill_right_mm'],
  ]) {
    if (!carcasses.length) break;
    const pool = carcasses.filter((u) => u.params?.side_infill_off !== true);
    const label = `Pin infill ${word}`;
    if (!pool.length) {
      const reason = many
        ? 'Scribe fillers at the wall are off for these cabinets: turn them on first'
        : 'Scribe fillers at the wall are off for this cabinet: turn them on first';
      actions.push({
        id: `pin-infill-${side}`,
        group: 'build',
        kind: 'toggle',
        label,
        checked: false,
        disabled: true,
        disabledReason: reason,
        hint: reason,
      });
      continue;
    }
    const width = !many ? Number(unit.params?.[widthKey]) || 0 : 0;
    toggle({
      id: `pin-infill-${side}`,
      label,
      pool,
      isOn: (u) => u.params?.[key] === true,
      on: (id) => store.setSideInfillPinned?.(id, side, true),
      off: (id) => store.setSideInfillPinned?.(id, side, false),
      hintOn: `Pinned${width ? ` at ${Math.round(width)} mm` : ''}: click to unpin and let it come and go with the gap`,
      hintOff: 'Keep a filler on this side whatever the gap becomes: it stretches with the cabinet',
    });
  }

  // Turn 14 (F5): the board under a run of hanging cabinets.
  toggle({
    id: 'bottom-mask',
    label: 'Bottom masking panel',
    pool: carcasses.filter((u) => getUnitType(u.type).mount === 'wall'),
    isOn: (u) => hasBottomMask(u),
    on: (id) => store.addBottomMask?.(id),
    off: (id) => store.removeBottomMask?.(id),
    hintOn: 'Fitted. Click to take it off: the whole run’s board goes with it',
    hintOff: 'One board under the run, cabinet depth plus the wall standoff, in the fronts’ material',
    afterOn: () => store.openPanelSection?.('construction'),
  });

  // T75 F5: on and off per run like the plinth, only where a worktop lies.
  toggle({
    id: 'upstand',
    label: 'Upstand',
    pool: carcasses.filter((u) => {
      const t = getUnitType(u.type);
      return t.mount === 'floor' && t.supports?.topInfill === false;
    }),
    isOn: (u) => u.params?.upstand === true,
    on: (id) => store.addUpstand?.(id),
    off: (id) => store.removeUpstand?.(id),
    hintOn: 'Fitted. Click to take it off the run',
    hintOff: 'A strip on the worktop against the wall, along the whole run, in the worktop’s material',
  });

  // ── inside ──
  {
    const pool = carcasses.filter((u) => getUnitType(u.type).supports?.shelves);
    if (pool.length) {
      actions.push({
        id: 'center-shelves',
        group: 'inside',
        kind: 'command',
        label: 'Centre shelves',
        hint: 'Space the shelves evenly in the free height, each bay on its own',
        run: () => batched(() => { for (const u of pool) store.redistributeShelves?.(u.id); }),
      });
    }
    // The right panel's Center between, on this one cabinet: the two pick
    // mode (the lower piece, then the upper), as RightPanel's ShelvesHead arms it.
    if (!many && pool.length) {
      actions.push({
        id: 'center-between',
        group: 'inside',
        kind: 'command',
        label: 'Centre between',
        hint: 'Pick the lower piece, then the upper: the shelves between them are spaced evenly',
        run: () => store.armCentreBetween?.(unit.id),
      });
    }
  }
  // Back in the menu (the owner removed it on 25.08.2026 and wants it now):
  // the right panel's Add doors, through the store's one answer.
  {
    const pool = carcasses.filter((u) => getUnitType(u.type).supports?.doors && !hasDoorsFitted(u));
    if (pool.length) {
      actions.push({
        id: 'add-doors',
        group: 'inside',
        kind: 'command',
        label: 'Add doors',
        hint: many
          ? `Hang the doors their widths call for, on the ${pool.length} of ${n} without doors`
          : 'Hang the doors this width calls for',
        run: () => store.addDoors?.(ids(pool)),
      });
    }
  }
  if (!many && (partName === 'FRONT' || partName === 'DRAWER-FRONT')) {
    actions.push({
      id: 'close-fronts', group: 'inside', kind: 'command', label: 'Close all fronts', run: () => store.closeAllFronts?.(unit.id),
    });
  }

  // ── copy ──
  // Turn 5 (BACKLOG #30): it asks for a NAME (the modal). T75 F20: over a
  // selection it saves a SET; the modal reads the same selection.
  actions.push({
    id: 'save-template',
    group: 'copy',
    kind: 'command',
    label: many ? 'Save as a set…' : 'Save as template…',
    hint: many
      ? 'Keep these cabinets, left to right with the gaps between them, in Library ▸ Sets'
      : 'Keep these parameters in Library ▸ Saved sets, ready to insert again',
    run: () => store.saveAsTemplate?.(unit.id),
  });
  // Duplicate is ONE cabinet's (the owner, 01.11.2026, 23:04: *"duplikujemy po
  // jednej szafce, bedzie latwiej"*): not offered over several, and the menu
  // sends the one id. The copy keeps the original's turn (*"ten sam obrot"*).
  if (!many) {
    actions.push({
      id: 'duplicate',
      group: 'copy',
      kind: 'command',
      label: 'Duplicate',
      hint: 'A copy beside it: the same type, sizes, turn, colour and contents, the next free number',
      run: () => store.duplicateUnits?.([unit.id]),
    });
  }

  // ── danger: red, alone, last; over several it says how many ──
  actions.push({
    id: 'delete',
    group: 'danger',
    kind: 'command',
    label: many ? `Delete ${n} cabinets` : 'Delete',
    danger: true,
    run: () => batched(() => { for (const u of targets) store.removeUnit?.(u.id); }),
  });

  // T74 F13: a FREE PANEL is one board, not a carcass. The fitting entries
  // above already pass it by; on its own it offers a template, a copy, the bin.
  if (!many && type.freePanel) return actions.filter((a) => FREE_PANEL_MENU.has(a.id));
  return actions;
}

/** T74 F13 · what the right-click offers on a free panel. */
const FREE_PANEL_MENU = new Set(['save-template', 'duplicate', 'delete']);

/**
 * The Cabinet group under a part menu: the cabinet the part hangs on, its
 * window, and the whole cabinet menu one click away (*"nic nie ginie"*).
 */
function cabinetGroup({ unit, store, args }) {
  const groupTitle = `Cabinet ${unit.params?.unit_num ?? ''}`.trim();
  const items = menuActions({
    ...args, unit, selection: [unit], units: null, panelPart: null, part: null, panelDrawer: null, drawer: null, panelId: null,
  });
  return [
    {
      id: 'edit-cabinet',
      group: 'cabinet',
      groupTitle,
      kind: 'command',
      label: 'Edit cabinet…',
      hint: 'This cabinet on its own: explode it, turn a part over, edit any piece',
      run: () => store.editCabinet?.(unit.id),
    },
    {
      id: 'cabinet-actions',
      group: 'cabinet',
      groupTitle,
      kind: 'submenu',
      label: 'All cabinet actions',
      hint: 'Everything the cabinet’s own menu offers',
      items,
    },
  ];
}

/**
 * A DOOR clicked: the door's own entries, then its cabinet.
 *
 * The hinge side is the right panel's control (RightPanel's Hinge side and the
 * door window's, `updateUnitParams(unit, { hinge })`); a door in a BAY has its
 * own hinge, the bay row's `setBayDoor`. Greyed with the reason today's code
 * gives where it refuses: a leaf cut on the slope opens from the slope, and a
 * pair hangs one leaf each side.
 */
function doorMenu({
  unit, store, result, panelId, args,
}) {
  const panel = panelId ? (result?.panels || []).find((p) => p.id === panelId) || null : null;
  const meta = panel?.meta || {};
  const bay = meta.bay != null && meta.bay !== '' && Number.isFinite(Number(meta.bay)) ? Number(meta.bay) : null;
  const bayRow = bay != null && Array.isArray(unit.params?.bay_doors) ? unit.params.bay_doors[bay] : null;

  let hand = String(meta.hinge || (bayRow ? bayRow.hinge : unit.params?.hinge) || 'L').toUpperCase() === 'R' ? 'R' : 'L';
  let hingeRefused = null;
  if (panel && !meta.hinge) hingeRefused = 'This front has no hinge side';
  else if (meta.hingeForced) {
    hand = meta.hinge === 'R' ? 'R' : 'L';
    hingeRefused = 'Cut on the slope: the door opens from the slope';
  } else if (bay == null && Number(result?.derived?.doors) === 2) {
    hingeRefused = 'A pair of doors: one leaf hangs on each side';
  }
  const setHand = (side) => {
    if (bay != null) store.setBayDoor?.(unit.id, bay, { hinge: side });
    else store.updateUnitParams?.(unit.id, { hinge: side });
  };

  let removeRefused = null;
  if (!panelId) removeRefused = 'Right-click the door itself to remove it';
  else if (meta.appliance) removeRefused = 'This is the appliance’s own door: it stays with its housing';

  return [
    {
      id: 'edit-door',
      group: 'part',
      kind: 'command',
      framed: true,
      label: 'Edit this door…',
      hint: 'This door’s own window, as a double click on it opens',
      ...(panelId ? {} : { disabled: true, disabledReason: 'Right-click the door itself to edit it' }),
      run: () => { if (panelId) store.editElement?.(unit.id, panelId); },
    },
    {
      id: 'hinge-side',
      group: 'part',
      kind: 'choice',
      label: 'Hinge side',
      hint: hingeRefused || 'Which side the hinges are on',
      ...(hingeRefused ? { disabled: true, disabledReason: hingeRefused } : {}),
      options: [['L', 'Left'], ['R', 'Right']].map(([side, label]) => ({
        id: side,
        label,
        selected: hand === side,
        run: () => { if (!hingeRefused && hand !== side) setHand(side); },
      })),
    },
    {
      id: 'close-fronts', group: 'part', kind: 'command', label: 'Close all fronts', run: () => store.closeAllFronts?.(unit.id),
    },
    {
      id: 'remove-door',
      group: 'part',
      kind: 'command',
      label: 'Remove this door',
      hint: removeRefused || 'Takes this door off, as Backspace on a selected door does; Undo puts it back',
      ...(removeRefused ? { disabled: true, disabledReason: removeRefused } : {}),
      run: () => {
        if (removeRefused) return;
        store.removeFront?.(unit.id, panelId);
        store.clearElement?.();
      },
    },
    ...cabinetGroup({ unit, store, args }),
  ];
}

/** A DRAWER FRONT clicked: that drawer's window, the fronts, then its cabinet. */
function drawerFrontMenu({
  unit, onDrawer, store, args,
}) {
  const actions = [];
  if (onDrawer) {
    actions.push({
      id: 'edit-drawer',
      group: 'part',
      kind: 'command',
      framed: true,
      label: `Edit drawer ${onDrawer}…`,
      hint: 'This drawer on its own: explode it, turn a part over, look at every piece',
      run: () => store.editDrawer?.(unit.id, onDrawer),
    });
  }
  actions.push({
    id: 'close-fronts', group: 'part', kind: 'command', label: 'Close all fronts', run: () => store.closeAllFronts?.(unit.id),
  });
  return [...actions, ...cabinetGroup({ unit, store, args })];
}
