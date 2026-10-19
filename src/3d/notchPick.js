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

// ─── T79 F5 · CUT EDGE: THE FOUR HORIZONTAL EDGES, AND WHAT A CLICK DOES ───
//
// The owner, 18.10.2026: *"cut the corner działa idealnie, ale możesz zrobić mi
// też poziome cut? wszystkich 4 rogów?"*  The four horizontal edges of the
// side elevation (KIT_NOTCH.lsp D22), each a bar along the whole width at its
// height and depth, and each a handle above the carcass top (no board stands
// between it and the eye, the corners' own reason) with a drop line down to a
// bottom edge's bar. TB and TF sit at the top, BB and BF at the floor; the
// back ones at z 0, the front ones at z = D; the two at one depth stand apart
// along the width so both can be clicked.

/** Where the four edges stand, in the unit's own frame (z = D is the front). */
export function notchEdgeSpots(width, depth, height) {
  const W = Number(width) || 0;
  const D = Number(depth) || 0;
  const H = Number(height) || 0;
  // CHAT FIX 19.10.2026 (the owner: "kwadrat na srodku kazdej z 4 poziomych
  // krawedzi boku, jak przy naroznikach": "tak"): the handle sits ON the edge,
  // at the middle of the width, as a corner's handle sits at its corner.
  return [
    { edge: 'TB', y: H, z: 0, x: W / 2 },
    { edge: 'BB', y: 0, z: 0, x: W / 2 },
    { edge: 'TF', y: H, z: D, x: W / 2 },
    { edge: 'BF', y: 0, z: D, x: W / 2 },
  ];
}

/** The click on a lit edge: the window at the click, about that edge. */
export function askNotchEdge(unitId, edge, at) {
  useUiStore.getState().openModal('edge-notch', {
    unitId, edge, at: at ? { x: at.x, y: at.y } : null,
  });
}
