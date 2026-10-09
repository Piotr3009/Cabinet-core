// ─── T75 F7 · CUT CORNER: WHERE THE CORNERS STAND, AND WHAT A CLICK DOES ────
//
// The two halves of `NotchCorners.jsx` that need no three.js, so a node test
// can hold them: where the four plan corners stand in a unit's own frame, and
// the click on one, which opens the `notch` window at the click (the T74 F1
// kind: `lib/modalLayer.js` holds it to an anchor).

import { useUiStore } from '../stores/uiStore.js';

/** Where the four corners stand, in the unit's own frame (z = D is the front). */
export function notchCornerSpots(width, depth) {
  const W = Number(width) || 0;
  const D = Number(depth) || 0;
  return [
    { corner: 'BL', x: 0, z: 0 },
    { corner: 'BR', x: W, z: 0 },
    { corner: 'FL', x: 0, z: D },
    { corner: 'FR', x: W, z: D },
  ];
}

/** The click on a lit corner: the window at the click, about that corner. */
export function askNotchCorner(unitId, corner, at) {
  useUiStore.getState().openModal('notch', {
    unitId, corner, at: at ? { x: at.x, y: at.y } : null,
  });
}
