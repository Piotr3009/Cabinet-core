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
 *   store      { redistributeShelves, rotateUnit, removeUnit, closeAllFronts }
 * @returns {Array<{id:string,label:string,hint?:string,danger?:boolean,run:Function}>}
 */
export function menuActions({ unit, panelPart, store }) {
  const type = getUnitType(unit.type);
  const actions = [];

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
    hint: `Now ${Math.round(Number(unit.position?.rotation_deg) || 0)}°`,
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
