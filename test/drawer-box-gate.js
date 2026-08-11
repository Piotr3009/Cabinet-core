// ─── THE DRAWER-BOX GATE, OPENED (turn 24, CLAUDE.md F3.1) ──────────────────
//
// The owner's law: **no thickness, no drawers.** A drawer box is all joint —
// the sides are grooved for the bottom, the front and back are cut to the
// sides' own board — and half a millimetre out is a box that does not go
// together. So the app refuses to add a drawer-bearing unit, or drawers to a
// unit, until somebody has put a caliper on the drawer-box board and ticked it.
//
// Every test that builds a cabinet WITH drawers therefore has to answer the
// same question a joiner does. This is that answer, in one line, so a test that
// is about shelf spacing does not have to explain the gate — and so that the
// day the gate changes shape there is one place to follow it.
//
// The number is 18: the workshop's own drawer-box board
// (`profile.wardrobe.drawers.boxSideThickness`), which is what every kit,
// fixture and golden has cut a box from since turn 1.

import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';

/**
 * Confirm the drawer-box slot, so this project may grow drawers.
 *
 * @param {number} [measured]  what the caliper said; the profile's own board
 *   when nothing is passed, which is the case every test before this turn was
 *   implicitly running under.
 */
export function confirmDrawerBox(measured = DEFAULT_CABINET_PROFILE.wardrobe.drawers.boxSideThickness) {
  return useProjectStore.getState().setSlotThickness('box', { measured, confirmed: true });
}
