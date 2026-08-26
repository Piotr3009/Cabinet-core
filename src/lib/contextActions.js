// ─── Context-menu actions ───
// The right-click menu is a LIST, not a switch: adding "Duplicate" or "Send to
// wall 2" later is one more entry here, and the menu component's layout,
// keyboard handling and dismissal already work (CLAUDE.md phase 5 — "an
// architecture for the actions to come").
//
// Plain JS with no React and no store import: the actions receive the store
// functions they need, which is also what makes them testable in node.
//
// ─── TURN 8 (CLAUDE.md F7): THE ORDER, AND THE TOGGLES ───
//
// Two things change, and the second is the one Piotr asked for in as many
// words: "koniec biegania do menu".
//
// THE ORDER is what a joiner reaches for, in the order he reaches for it: show
// me this cabinet's numbers, put a panel on that side, close that gap — and
// only then the things that move or destroy it.
//
// THE TOGGLES are ON/OFF in one place. Turn 4's menu could only ADD an end
// panel; removing one meant opening the panel and finding the row. An entry
// that can only be used once is an entry that is wrong half the time it is
// read, so every one of these now says what the state IS (`checked`) and
// flips it.

import { getUnitType } from '../engine/types.js';
import { getCabinetProfile } from '../engine/profile.js';
import { corniceOption } from '../engine/cornice.js';
import { hasBottomMask, hasTopInfill } from '../engine/runs.js';

// ─── TURN 14 (CLAUDE.md F6): THE ORDER IS DATA ─────────────────────────────
//
// The owner's four verdicts, and the fourth is the one worth writing down.
//
//   "EDIT CABINET" FIRST, AND FRAMED. It is where a joiner goes once the
//   cabinet is standing — to look at what he has made — so it is the first
//   thing the menu offers and it is drawn as a standout entry rather than as
//   one line among fifteen.
//
//   "SHOW ALL DIMENSIONS" LAST. Turn 8 put it first, on the argument that "show
//   me this cabinet's numbers" is what a joiner reaches for. Living with it says
//   otherwise: it is a way of LOOKING, not a thing you do to a cabinet, and it
//   is the entry you want out of the way of the ones that build.
//
//   SECTIONS. [top infill + plinth] | [all end panels] | [the rest], divided by
//   a delicate gold line. Every entry names its GROUP and the component draws
//   the rule between them: the order is DATA, so adding an entry is choosing
//   which group it belongs to and never re-laying-out a component.
//
//   THE HINGES TOGGLE IS GONE. The owner: the choice is senseless. The hinges
//   stay visible exactly as turn 13 left them — `showHinges` still exists,
//   still defaults from the profile, and REDRAWING them is a parked, separate
//   topic (BACKLOG) — what goes is the entry that asked a question with only
//   one sensible answer.
//
// ─── TURN 13 (CLAUDE.md F5.3): THE MENU APPLIES TO THE SELECTION ───────────
//
// Ctrl+click three cabinets, right-click one of them, choose Add plinth: all
// three get one — and the turn-12 run logic merges the adjacent ones into a
// single length itself, so the answer is one plinth and not three.
//
// FIVE entries are named by CLAUDE.md and exactly those five are bulk: the
// plinth, the pinned fillers, the end panels, Add doors and the unit colour.
// Everything else stays about the cabinet under the pointer, and every bulk
// entry SAYS SO in its label — a menu where some entries silently do three
// things and others do one is a menu you have to test on your own project.
//
// The mechanism is the store's `batch`, so the whole thing is one undo step
// (F5.4). Nothing here loops without it.

/**
 * @param {object} args
 *   unit       the unit that was right-clicked — the PRIMARY
 *   selection  every selected unit, this one included. Defaults to just it, so
 *              a caller that has never heard of multi-select is unaffected.
 *   panelPart  which panel of it (so a front can offer front actions)
 *   panelDrawer  which DRAWER that panel belongs to, or null (turn 20, F11.1)
 *   dimensions whether this unit's full dimensions are currently on the scene
 *   hinges     whether the hinge bodies are drawn in Solid (turn 11, F3.5)
 *   store      the store functions the actions call
 * @returns {Array<{id:string,label:string,hint?:string,checked?:boolean,
 *                  danger?:boolean,disabled?:boolean,run:Function}>}
 */
/**
 * Which section an entry belongs to (F6.3).
 *
 * [top infill + plinth] — the pieces that finish a RUN: what closes the gap to
 * the ceiling, what closes the gap to the floor, and (turn 14) what closes the
 * underside of a hanging one. One group because they are one question asked at
 * three heights.
 *
 * [all end panels] — every masking panel, on its own, because "put a panel on
 * that side" is a decision a joiner makes about a run's ENDS and he makes it
 * three or four times in a row.
 *
 * [the rest] — everything else, in the order turn 8 settled.
 */
const GROUP_OF = {
  'top-infill': 'run-pieces',
  // Turn 25 (CLAUDE.md F12.3): the cornice is a run piece like the infill it
  // is screwed to, so it sits in the same group rather than at the bottom with
  // the per-cabinet actions.
  'cornice-0': 'run-pieces',
  'cornice-70': 'run-pieces',
  'cornice-100': 'run-pieces',
  plinth: 'run-pieces',
  'bottom-mask': 'run-pieces',
  'end-panel-L': 'end-panels',
  'end-panel-R': 'end-panels',
  'end-panel-B': 'end-panels',
};

/** The sections, in the order the menu draws them. */
export const MENU_GROUPS = ['edit', 'run-pieces', 'end-panels', 'rest', 'dimensions'];

/**
 * The entries, grouped and in order — what the component renders (F6.3).
 *
 * The ORDER of the sections is this list and not the order entries happen to be
 * pushed in, so an entry added to "the rest" cannot land above the end panels
 * by accident.
 */
export function groupedActions(actions) {
  const byGroup = new Map(MENU_GROUPS.map((g) => [g, []]));
  for (const a of actions || []) {
    const key = byGroup.has(a.group) ? a.group : 'rest';
    byGroup.get(key).push(a);
  }
  return MENU_GROUPS.map((id) => ({ id, actions: byGroup.get(id) })).filter((g) => g.actions.length);
}

export function menuActions({
  unit, selection = null, panelPart, panelDrawer = null, dimensions = false, hinges = false, store = {},
  profile = getCabinetProfile(),
}) {
  const type = getUnitType(unit.type);
  const actions = [];

  // The cabinets a bulk entry acts on, and how many — always including the one
  // under the pointer, whatever the selection says, because right-clicking a
  // cabinet that is not in it and getting an action on three others would be
  // the menu lying about what it is about.
  const targets = (() => {
    const ids = (selection || []).map((u) => u.id).filter(Boolean);
    return ids.includes(unit.id) ? ids : [unit.id];
  })();
  const many = targets.length > 1;
  /** "Add plinth" over three cabinets says "Add plinth (3)". */
  const forAll = (label) => (many ? `${label} (${targets.length})` : label);
  /**
   * Every bulk entry runs inside one batch — F5.4, and never per entry.
   *
   * The `batch` is asked for EXPLICITLY rather than through `??`: a batch that
   * returns nothing (which is what a batch normally does) would make `??` fall
   * through and run the loop a second time.
   */
  const each = (fn) => {
    const loop = () => { for (const id of targets) fn(id); };
    if (typeof store.batch === 'function') store.batch(loop);
    else loop();
  };

  // ── 0. the cabinet's own window — FIRST, and framed (F6.1) ──
  actions.push({
    id: 'edit-cabinet',
    group: 'edit',
    framed: true,
    label: 'Edit cabinet…',
    hint: 'This cabinet on its own — explode it, turn a part over, edit any piece',
    run: () => store.editCabinet?.(unit.id),
  });

  // ── 1. …and the DRAWER's own window, where the click was on a drawer ──
  //
  // Turn 20 (CLAUDE.md F11.1): "Context menu on any drawer part gains 'Edit
  // drawer' as the discoverable route." The double-click on a box panel is the
  // fast way in; this is the one a joiner FINDS. It is only offered where the
  // right-click actually landed on a drawer, because an entry that opens the
  // window for "drawer 1" after a click on a side panel would be the menu
  // guessing.
  const onDrawer = Number(panelDrawer) > 0 ? Number(panelDrawer) : null;
  if (onDrawer && !many) {
    actions.push({
      id: 'edit-drawer',
      group: 'edit',
      framed: true,
      label: `Edit drawer ${onDrawer}…`,
      hint: 'This drawer on its own — explode it, turn a part over, look at every piece',
      run: () => store.editDrawer?.(unit.id, onDrawer),
    });
  }

  // ─── Turn 17 (CLAUDE.md F6.2): RENAME, WHERE THE OWNER LOOKED ────────────
  //
  // Turn 16 F6 shipped renaming — inline, in the right panel's header, which is
  // where the name already is. The owner could not find it, and living with it
  // says why: a bare input between two other controls reads as decoration, and
  // the place a joiner reaches for "call this one something else" is the menu he
  // is already right-clicking the cabinet with.
  //
  // So this is NOT a second renaming mechanism — CLAUDE.md says "do NOT rebuild
  // it" in as many words. It is a way IN to the one that exists: the panel
  // opens, its Parameters section comes up and the cursor lands in the name box
  // with the text selected. One name, one field, two doors to it.
  actions.push({
    id: 'rename',
    group: 'edit',
    label: `Rename “${unit.params.unit_num}”…`,
    hint: 'What this cabinet is called — it prints on the canvas, the CNC sheet, the BOM and the drawings',
    run: () => store.renameUnit?.(unit.id),
  });

  // ── 2. end panels, on and OFF, from here ──
  // Turn 5 (BACKLOG #31) gave Left / Right / Both; turn 8 makes each of them a
  // switch. "Both" is still the same act twice and is still done as exactly
  // that in the store, so a unit with a neighbour hard against one side gets
  // the panel that fits and hears why the other did not.
  const endPanels = unit.params.end_panels || [];
  const fittedOn = (side) => endPanels.some((ep) => ep.side === side);
  for (const [side, label] of [['L', 'left'], ['R', 'right'], ['B', 'both sides']]) {
    const fitted = side === 'B' ? (fittedOn('L') && fittedOn('R')) : fittedOn(side);
    actions.push({
      id: `end-panel-${side}`,
      label: forAll(`End panel — ${label}`),
      checked: fitted,
      hint: fitted
        ? 'Fitted. Click to take it off; its options are in the Construction section'
        : 'A masking panel outside this side, in the BOM like any other piece',
      // Bulk (F5.3), and the STATE is read per unit rather than copied from the
      // primary: over a run where one cabinet already has a left panel, "take
      // it off" has to take off the ones that are there and not fit five more.
      run: () => {
        each((id) => {
          const target = (selection || []).find((u) => u.id === id) || unit;
          const own = target.params.end_panels || [];
          if (fitted) {
            for (const ep of own.filter((e) => side === 'B' || e.side === side)) {
              store.removeEndPanel?.(id, ep.id);
            }
            return;
          }
          if (side === 'B') {
            if (!own.some((e) => e.side === 'L')) store.addEndPanel?.(id, { side: 'L' });
            if (!own.some((e) => e.side === 'R')) store.addEndPanel?.(id, { side: 'R' });
            return;
          }
          if (!own.some((e) => e.side === side)) store.addEndPanel?.(id, { side });
        });
        if (!fitted) store.openPanelSection?.('construction');
      },
    });
  }

  // ── 3. the infills, per unit ──
  // The TOP infill is not offered to a base unit at all (F2.7): what goes on
  // top of a base cabinet is a worktop, and the gap above THAT is where the
  // wall units go.
  if (type.supports.topInfill) {
    // Turn 14 (CLAUDE.md F1.2): the RUN's state, not this carcass's. A member
    // of a run carries no height of its own — the owner holds the geometry —
    // so reading `top_infill_mm` alone showed "not fitted" under a piece the
    // joiner was looking at, and the entry then ADDED a second request instead
    // of taking the piece off.
    const fitted = hasTopInfill(unit);
    actions.push({
      id: 'top-infill',
      label: 'Top infill',
      checked: fitted,
      hint: fitted
        ? 'Fitted. Click to take it off — the whole run’s piece goes with it'
        : 'Closes the gap to the ceiling — drag its edge, or double-click it to fill',
      run: () => {
        if (fitted) { store.removeTopInfill?.(unit.id); return; }
        store.addTopInfill?.(unit.id);
        store.openPanelSection?.('construction');
      },
    });
  }
  // ─── TURN 25 (CLAUDE.md F12.3): THE TOP CORNICE, IN THE MENU ────────────
  //
  // "Top cornice joins the unit's right-click menu (none / 70 / 100). Top
  // infill is already there." Three entries rather than one toggle, because a
  // cornice is a CHOICE of moulding and not an on/off — and the two heights are
  // read off the profile, so a workshop that stocks a third gets a third entry.
  if (type.supports.cornice) {
    const fitted = corniceOption(unit.params.cornice, profile);
    for (const h of [0, ...(profile.autoParts.cornice.heights || [])]) {
      actions.push({
        id: `cornice-${h}`,
        label: h === 0 ? 'Top cornice: none' : `Top cornice ${h} mm`,
        checked: fitted === h,
        hint: h === 0
          ? 'No moulding over this cabinet'
          : `${profile.autoParts.cornice.projection[h] || 0} mm forward of the doors — bought moulding, one run`,
        run: () => {
          store.setCornice?.(unit.id, h);
          store.openPanelSection?.('construction');
        },
      });
    }
  }

  // The SIDE infill is DERIVED — it is a fact about where the unit is standing
  // (BACKLOG #15) — so the switch is not "add one", it is "does this cabinet
  // take one at all". A joiner who is going to scribe the door instead turns it
  // off here and the piece stops appearing in the cut list.
  {
    const off = unit.params.side_infill_off === true;
    actions.push({
      id: 'side-infill',
      label: 'Scribe fillers at the wall',
      checked: !off,
      hint: off
        ? 'Off for this cabinet — the gap beside it stays open, and the unit may be pushed to the wall'
        : 'On: parking this unit at the wall produces the filler that closes the gap',
      run: () => store.setSideInfillEnabled?.(unit.id, off),
    });

    // ─── Pin a filler (turn 11, CLAUDE.md F5.1) ───
    // The replacement for "Insets L/P", which the owner has ruled a broken
    // concept. Automatic until somebody says otherwise: pinned, the piece never
    // vanishes when the unit drives away from the wall and it stretches to
    // whatever the gap becomes. Unpinning hands it back to the automatics.
    //
    // Not offered at all with the fillers switched off for this cabinet: a
    // pinned piece on a unit that takes no pieces is a contradiction, and the
    // switch above is the way out of it.
    for (const [key, side, label] of [
      ['side_infill_left_pinned', 'L', 'left'],
      ['side_infill_right_pinned', 'R', 'right'],
    ]) {
      const isPinned = unit.params[key] === true;
      const width = Number(unit.params[side === 'L' ? 'side_infill_left_mm' : 'side_infill_right_mm']) || 0;
      actions.push({
        id: `pin-infill-${side}`,
        label: forAll(`Pin infill ${label}`),
        checked: isPinned,
        disabled: off,
        hint: isPinned
          ? `Pinned${width ? ` at ${Math.round(width)} mm` : ''} — click to unpin and let it come and go with the gap`
          : 'Keep a filler on this side whatever the gap becomes — it stretches with the unit',
        // Bulk (F5.3). The primary decides the DIRECTION — the joiner is
        // pinning or unpinning, and that is one decision — and each cabinet
        // then produces the filler its own gap calls for, or none.
        run: () => each((id) => store.setSideInfillPinned?.(id, side, !isPinned)),
      });
    }
  }

  // ─── The bottom masking panel (turn 14, CLAUDE.md F5) ───
  // The plinth's twin at the other end of the kitchen, so it sits beside it and
  // in the same group: one board under a RUN of hanging cabinets, hiding the
  // underside and the ten-millimetre slot behind them. Bulk like the plinth,
  // and for the same reason — a joiner tick three wall units and asks for the
  // board under all of them, and the run logic merges the adjacent ones itself.
  if (type.mount === 'wall') {
    const fitted = hasBottomMask(unit);
    actions.push({
      id: 'bottom-mask',
      label: forAll('Bottom masking panel'),
      checked: fitted,
      hint: fitted
        ? 'Fitted. Click to take it off — the whole run’s board goes with it'
        : 'One board under the run, unit depth + the wall standoff, in the fronts’ material',
      run: () => {
        each((id) => (fitted ? store.removeBottomMask?.(id) : store.addBottomMask?.(id)));
        if (!fitted) store.openPanelSection?.('construction');
      },
    });
  }

  // ── 4. the plinth ──
  if (type.legs && type.mount === 'floor') {
    const fitted = unit.params.plinth === true;
    actions.push({
      id: 'plinth',
      label: forAll('Plinth'),
      checked: fitted,
      hint: fitted
        ? 'Fitted. Click to take it off'
        : (many
          ? 'A toe kick under each of them — adjacent ones come out as ONE length (turn 12)'
          : 'A toe kick under this unit — manual since turn 4'),
      // Bulk (F5.3), and CLAUDE.md names the reason it needs nothing else:
      // "the turn-12 run logic merges adjacent ones itself". Three cabinets
      // side by side get three plinth flags and one plinth.
      run: () => {
        each((id) => (fitted ? store.removePlinth?.(id) : store.addPlinth?.(id)));
        if (!fitted) store.openPanelSection?.('construction');
      },
    });
  }

  // ── 4b. the colour (turn 13, CLAUDE.md F5.3) ──
  //
  // ─── TURN 50 (CLAUDE.md F10): "ADD DOORS" LEAVES THIS MENU ───────────────
  //
  // The owner, 25.08.2026: *"w prawym przycisku myszy menu nie powinno być Add
  // doors oraz Show dimensions."*
  //
  // The ENTRY goes; the ACTION does not (iron rule 4). `projectStore.addDoors`
  // is untouched and is reached from three places, all of them still there:
  //
  //   · the RIGHT-HAND PANEL — `components/RightPanel.jsx`, the button this
  //     entry was added in turn 13 to duplicate;
  //   · the PLUS MODAL — `components/AddItemsModal.jsx`, "Add doors" beside
  //     the items, where a cabinet is being fitted out;
  //   · a MULTI-SELECTION — `components/MultiUnitPanel.jsx addDoorsBulk`,
  //     which is what `forAll('Add doors')` was reaching for here.
  //
  // The colour stays: it had no unit-level control at all before turn 13 and
  // still has none anywhere else.
  // ─── Turn 17 (CLAUDE.md F8.1): THE DRAWER FRONTS COME OFF ────────────────
  // The same idiom as turn 15's Remove doors, on the kit whose fronts ARE its
  // face — so the boxes can be worked on and their heights edited. Offered only
  // where there is a stack to strip, and it SAYS which state it is in, like
  // every other switch in this menu since turn 8.
  if (type.drawerStyle) {
    const fitted = unit.params.drawer_fronts !== false;
    actions.push({
      id: 'drawer-fronts',
      label: 'Drawer fronts',
      checked: fitted,
      hint: fitted
        ? 'Fitted. Click to take them off — the boxes, their runners and the carcass stay exactly as they are'
        : 'Off. The boxes are bare, so a drawer’s height can be edited on the box itself',
      run: () => (fitted ? store.removeDrawerFronts?.(unit.id) : store.addDrawerFronts?.(unit.id)),
    });
  }

  actions.push({
    id: 'unit-colour',
    label: forAll('Colour…'),
    hint: 'This cabinet’s own finish, from the project palette — the project is left alone',
    run: () => store.unitColour?.(targets),
  });

  // ── 5. everything else, as before ──
  //
  // ─── TURN 11 (CLAUDE.md F5.1): INSETS ARE GONE FROM HERE ───
  // "Insets L/P: REMOVE from the menu (owner verdict: broken concept)." A
  // sideways inset asked the joiner to describe a gap in millimetres and then
  // left the gap empty; what he actually wants is a PIECE in it, which is the
  // pinned filler two entries up. The BACK inset is a different thing — a unit
  // stood off the wall for a soil pipe — and it keeps its field in the
  // Construction section of the right panel, where it is typed rather than
  // reached through a menu.

  // Save as template (turn 5, BACKLOG #30). Right-clicking the cabinet you have
  // just finished configuring is where a joiner reaches for this. It asks for a
  // NAME (the modal), because a library of "Wardrobe", "Wardrobe (2)" and
  // "Wardrobe (3)" is a library nobody uses.
  actions.push({
    id: 'save-template',
    label: 'Save as template',
    hint: 'Keep these parameters in Library ▸ Saved sets, ready to insert again',
    run: () => store.saveAsTemplate?.(unit.id),
  });

  if (type.supports.shelves) {
    actions.push({
      id: 'center-shelves',
      label: 'Center shelves',
      hint: 'Space them evenly in the free height',
      run: () => store.redistributeShelves?.(unit.id),
    });
  }
  actions.push({
    id: 'rotate-90',
    label: 'Rotate 90°',
    hint: `Now ${Math.round(Number(unit.position?.rotation_deg) || 0)}°`,   // degrees, not mm
    run: () => store.rotateUnit?.(unit.id, 'step', 90),
  });
  actions.push({ id: 'back-to-wall', label: 'Back to wall', run: () => store.rotateUnit?.(unit.id, 'back', 0) });
  actions.push({ id: 'side-to-wall', label: 'Side to wall', run: () => store.rotateUnit?.(unit.id, 'side', 90) });
  if (panelPart === 'FRONT' || panelPart === 'DRAWER-FRONT') {
    actions.push({ id: 'close-fronts', label: 'Close all fronts', run: () => store.closeAllFronts?.(unit.id) });
  }
  actions.push({ id: 'delete', label: 'Delete', danger: true, run: () => store.removeUnit?.(unit.id) });

  // ── LAST: the numbers (F6.2) ──
  //
  // ─── TURN 50 (CLAUDE.md F10): "SHOW ALL DIMENSIONS" LEAVES THIS MENU ─────
  //
  // The owner, and he gives the reason in the same breath: *"dimension już mamy
  // na górze."*  It is on the TOP BAR (View ▸ Dimensions) and on the canvas
  // toolbar (Show dimensions), and what those draw is the SAME CHAIN this entry
  // drew — `engine/dimensions.js dimensionCarriers`, over every cabinet instead
  // of over one.
  //
  // The MECHANISM is not deleted (iron rule 4): `uiStore.unitDimensions`,
  // `toggleUnitDimensions` and `clearUnitDimensions` are exactly what they
  // were, and `3d/Scene.jsx` still draws from them. What has gone is this
  // menu's door onto it, which is what the owner asked for. Named in the PR and
  // written into BACKLOG, because a mechanism with no door is worth him
  // knowing about.
  //
  // The `dimensions` argument stays in this function's signature for the same
  // reason: the caller still knows the answer, and a rule that has to be
  // re-plumbed to come back is a rule that does not come back.

  // The GROUPS, applied last and in one place (F6.3). An entry that has not
  // named its own belongs to "the rest", which is what makes this a default
  // rather than a table anybody has to keep in step: a new entry lands
  // somewhere sensible on the day it is written.
  return actions.map((a) => ({ ...a, group: a.group || GROUP_OF[a.id] || 'rest' }));
}
