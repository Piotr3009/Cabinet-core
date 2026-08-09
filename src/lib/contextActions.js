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
import { hasBottomMask, hasTopInfill } from '../engine/runs.js';

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
 *   dimensions whether this unit's full dimensions are currently on the scene
 *   hinges     whether the hinge bodies are drawn in Solid (turn 11, F3.5)
 *   store      the store functions the actions call
 * @returns {Array<{id:string,label:string,hint?:string,checked?:boolean,
 *                  danger?:boolean,disabled?:boolean,run:Function}>}
 */
export function menuActions({
  unit, selection = null, panelPart, dimensions = false, hinges = false, store = {},
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

  // ── 1. the numbers ──
  // A toggle, not a one-way door: the same entry turns them off, which is what
  // makes it usable twice in a row on the same cabinet.
  actions.push({
    id: 'dimensions',
    label: 'Show all dimensions',
    checked: Boolean(dimensions),
    hint: 'Every dimension of THIS cabinet on the scene — width, height, depth, shelves, fronts',
    run: () => store.toggleUnitDimensions?.(unit.id),
  });

  // ─── Turn 11 (CLAUDE.md F3.5): the ironmongery ───
  // In the SAME group as the dimensions switch, because it is the same kind of
  // question — what do I want drawn on top of the furniture — and CLAUDE.md
  // asks for it in "the existing context-menu toggles group" by name. It is a
  // project-wide way of looking, like X-ray, not a property of this cabinet;
  // right-clicking a cabinet is simply where a joiner's hand already is.
  actions.push({
    id: 'hinges',
    label: 'Hinges in Solid',
    checked: Boolean(hinges),
    hint: 'Draw the hinge bodies where they are fitted, without switching to X-ray',
    run: () => store.toggleHinges?.(),
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

  // ── 4b. doors, and the colour (turn 13, CLAUDE.md F5.3) ──
  //
  // Two entries the menu never had. "Add doors" was a button at the bottom of
  // the right panel and nowhere else, which is a long way from the cabinet when
  // the cabinet is what you are looking at; the colour had no unit-level
  // control at all until F3, which is the bug this turn opened with.
  {
    const hasDoors = Boolean(unit.params.doors) && unit.params.doors !== false;
    if (type.supports?.doors !== false) {
      actions.push({
        id: 'add-doors',
        label: forAll('Add doors'),
        disabled: hasDoors && !many,
        hint: hasDoors && !many
          ? 'This cabinet already has its doors'
          : 'Hang the doors this width calls for — one or two, on the unit’s own hinge side',
        run: () => store.addDoors?.(targets),
      });
    }
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
  // ─── Turn 12 (CLAUDE.md F4): the cabinet editor ───
  // "Right-click a unit → 'Edit cabinet' → a NEW modal hosting its OWN small 3D
  // canvas with THAT unit only." It is placed here, above the destructive half
  // of the menu, because it is the entry a joiner reaches for most often once
  // the cabinet is standing: it is where you go to LOOK at what you have made.
  actions.push({
    id: 'edit-cabinet',
    label: 'Edit cabinet…',
    hint: 'This cabinet on its own — explode it, turn a part over, edit any piece',
    run: () => store.editCabinet?.(unit.id),
  });

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
  return actions;
}
