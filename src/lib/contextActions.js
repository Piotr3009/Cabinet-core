// ─── Context-menu actions ───
// The right-click menu is a LIST, not a switch: adding "Duplicate" or "Send to
// wall 2" later is one more entry here, and the menu component's layout,
// keyboard handling and dismissal already work (CLAUDE.md phase 5 — "an
// architecture for the actions to come").
//
// Plain JS with no React and no store import: the actions receive the store
// functions they need, which is also what makes them testable in node.

import { getUnitType } from '../engine/types.js';

/**
 * @param {object} args
 *   unit       the unit that was right-clicked
 *   panelPart  which panel of it (so a front can offer front actions)
 *   store      { redistributeShelves, rotateUnit, removeUnit, closeAllFronts,
 *                addEndPanel, addPlinth, removePlinth, addTopInfill,
 *                removeTopInfill, openPanelSection }
 * @returns {Array<{id:string,label:string,hint?:string,danger?:boolean,run:Function}>}
 */
export function menuActions({ unit, panelPart, store }) {
  const type = getUnitType(unit.type);
  const actions = [];

  // ── the manual construction pieces (turn 4, BACKLOG #16/#17) ──
  // Right-clicking a unit is where a joiner reaches for these, so they are here
  // as well as in the panel. The OPTIONS (to the floor or to the unit height, the
  // thickness, "apply to all") live in the panel section, which is what opens
  // alongside — CLAUDE.md is explicit that this must not be a modal.
  // Turn 5 (BACKLOG #31): Left / Right / Both. "Both" is the same act twice and
  // is done as exactly that in the store, so a unit with a neighbour hard
  // against one side gets the panel that fits and hears why the other did not.
  const endPanels = unit.params.end_panels || [];
  const fittedOn = (side) => endPanels.some((ep) => ep.side === side);
  for (const [side, label] of [['L', 'left'], ['R', 'right'], ['B', 'both sides']]) {
    const fitted = side === 'B' ? (fittedOn('L') && fittedOn('R')) : fittedOn(side);
    actions.push({
      id: `end-panel-${side}`,
      label: fitted ? `End panel ${label} ✓` : `Add end panel — ${label}`,
      hint: fitted
        ? 'Already fitted — change or remove it in the Construction section'
        : 'A masking panel outside this side, in the BOM like any other piece',
      disabled: fitted,
      run: () => {
        if (fitted) return;
        store.addEndPanel?.(unit.id, { side });
        store.openPanelSection?.('construction');
      },
    });
  }
  if (type.legs && type.mount === 'floor') {
    actions.push(unit.params.plinth
      ? { id: 'plinth-off', label: 'Remove plinth', run: () => store.removePlinth?.(unit.id) }
      : {
        id: 'plinth-on',
        label: 'Add plinth',
        hint: 'A toe kick under this unit — manual since turn 4',
        run: () => { store.addPlinth?.(unit.id); store.openPanelSection?.('construction'); },
      });
  }
  actions.push(Number(unit.params.top_infill_mm) > 0
    ? { id: 'top-infill-off', label: 'Remove top infill', run: () => store.removeTopInfill?.(unit.id) }
    : {
      id: 'top-infill-on',
      label: 'Add top infill',
      hint: 'Closes the gap to the ceiling — drag its handle, or double-click it to fill',
      run: () => { store.addTopInfill?.(unit.id); store.openPanelSection?.('construction'); },
    });

  // ── Insets (turn 7, CLAUDE.md F5 / BACKLOG #32) ──
  // The MENU opens the section; the numbers are typed in the panel, exactly as
  // the plinth and the end panels work. A three-field form does not belong in a
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

  // ── Save as template (turn 5, BACKLOG #30) ──
  // Right-clicking the cabinet you have just finished configuring is where a
  // joiner reaches for this. It asks for a NAME (the modal), because a library
  // of "Wardrobe", "Wardrobe (2)" and "Wardrobe (3)" is a library nobody uses.
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
      run: () => store.redistributeShelves(unit.id),
    });
  }
  actions.push({
    id: 'rotate-90',
    label: 'Rotate 90°',
    hint: `Now ${Math.round(Number(unit.position?.rotation_deg) || 0)}°`,   // degrees, not mm
    run: () => store.rotateUnit(unit.id, 'step', 90),
  });
  actions.push({ id: 'back-to-wall', label: 'Back to wall', run: () => store.rotateUnit(unit.id, 'back', 0) });
  actions.push({ id: 'side-to-wall', label: 'Side to wall', run: () => store.rotateUnit(unit.id, 'side', 90) });
  if (panelPart === 'FRONT' || panelPart === 'DRAWER-FRONT') {
    actions.push({ id: 'close-fronts', label: 'Close all fronts', run: () => store.closeAllFronts(unit.id) });
  }
  actions.push({ id: 'delete', label: 'Delete', danger: true, run: () => store.removeUnit(unit.id) });
  return actions;
}
