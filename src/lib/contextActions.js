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

/**
 * @param {object} args
 *   unit       the unit that was right-clicked
 *   panelPart  which panel of it (so a front can offer front actions)
 *   dimensions whether this unit's full dimensions are currently on the scene
 *   store      the store functions the actions call
 * @returns {Array<{id:string,label:string,hint?:string,checked?:boolean,
 *                  danger?:boolean,disabled?:boolean,run:Function}>}
 */
export function menuActions({
  unit, panelPart, dimensions = false, store = {},
}) {
  const type = getUnitType(unit.type);
  const actions = [];

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
      label: `End panel — ${label}`,
      checked: fitted,
      hint: fitted
        ? 'Fitted. Click to take it off; its options are in the Construction section'
        : 'A masking panel outside this side, in the BOM like any other piece',
      run: () => {
        if (fitted) {
          for (const ep of endPanels.filter((e) => side === 'B' || e.side === side)) {
            store.removeEndPanel?.(unit.id, ep.id);
          }
          return;
        }
        store.addEndPanel?.(unit.id, { side });
        store.openPanelSection?.('construction');
      },
    });
  }

  // ── 3. the infills, per unit ──
  // The TOP infill is not offered to a base unit at all (F2.7): what goes on
  // top of a base cabinet is a worktop, and the gap above THAT is where the
  // wall units go.
  if (type.supports.topInfill) {
    const fitted = Number(unit.params.top_infill_mm) > 0;
    actions.push({
      id: 'top-infill',
      label: 'Top infill',
      checked: fitted,
      hint: fitted
        ? 'Fitted. Click to take it off; drag its top edge to place it'
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
        ? 'Off for this cabinet — the gap beside it stays open'
        : 'On: parking this unit at the wall produces the filler that closes the gap',
      run: () => store.setSideInfillEnabled?.(unit.id, off),
    });
  }

  // ── 4. the plinth ──
  if (type.legs && type.mount === 'floor') {
    const fitted = unit.params.plinth === true;
    actions.push({
      id: 'plinth',
      label: 'Plinth',
      checked: fitted,
      hint: fitted ? 'Fitted. Click to take it off' : 'A toe kick under this unit — manual since turn 4',
      run: () => {
        if (fitted) { store.removePlinth?.(unit.id); return; }
        store.addPlinth?.(unit.id);
        store.openPanelSection?.('construction');
      },
    });
  }

  // ── 5. everything else, as before ──
  // Insets (turn 7, CLAUDE.md F5 / BACKLOG #32): the MENU opens the section;
  // the numbers are typed in the panel. A three-field form does not belong in a
  // right-click menu, and CLAUDE.md has ruled out a modal for this family since
  // turn 4.
  const insets = [unit.params.inset_left_mm, unit.params.inset_right_mm, unit.params.inset_back_mm]
    .filter((v) => Number(v) > 0).length;
  actions.push({
    id: 'insets',
    label: insets ? `Insets (${insets} set)…` : 'Insets…',
    hint: 'A deliberate gap for a pipe, a bowed wall or a bracket — the clamp respects it',
    run: () => store.openPanelSection?.('construction'),
  });

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
  return actions;
}
