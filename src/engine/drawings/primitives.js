// ─── The four things a drawing is made of (turn 7, CLAUDE.md F1) ───
//
// Turn 6 kept these as private helpers inside frontElevation.js, because there
// was one view and nothing else needed them. Turn 7 has three views and a
// cover, so they move here — and they move under names nothing else in the app is called.
//
// That is not fussiness. `test/imports.test.js` checks every file in src/ for a
// name that one of our own modules exports and this file uses without importing
// it, and it works by collecting every exported name in the app. Exporting
// `text`, `line` and `circle` from anywhere makes those three words into
// tripwires for the whole codebase: half the React components have a `text`
// prop, engine/render.js has a local `text`, and CncView draws a `circle`. The
// checker was right to complain — a name that generic has no business being a
// module export. So the exports are `entText`, `entLine`, `entCircle`, and
// the files that draw with them alias them back to something short on the way
// in, where the alias is local and harmless.
//
// Everything is in DRAWING millimetres with Y UP. The sheet lays them out and
// the renderer flips Y.
//
// Pure functions — no React, no store imports.

/** A line. */
export const entLine = (layer, x1, y1, x2, y2) => ({ kind: 'line', layer, x1, y1, x2, y2 });

/** A rectangle by its lower-left corner and size. */
export const entRect = (layer, x, y, w, h) => ({
  kind: 'rect', layer, x, y, w: Math.abs(w), h: Math.abs(h),
});

/** A caption. `height` is the cap height, in drawing mm. */
export const entText = (layer, x, y, value, height, align = 'centre') => ({
  kind: 'text', layer, x, y, text: value, height, align,
});

/** A circle by centre and radius — the hinge cup, the rail seen end-on. */
export const entCircle = (layer, cx, cy, r) => ({ kind: 'circle', layer, cx, cy, r });

/**
 * Move a set of entities. Used to lay several views out on one card: a view is
 * built at its own origin and never has to know where it will end up.
 */
export function moveEntities(entities, dx, dy) {
  return entities.map((e) => {
    if (e.kind === 'line') return { ...e, x1: e.x1 + dx, y1: e.y1 + dy, x2: e.x2 + dx, y2: e.y2 + dy };
    if (e.kind === 'rect') return { ...e, x: e.x + dx, y: e.y + dy };
    if (e.kind === 'circle') return { ...e, cx: e.cx + dx, cy: e.cy + dy };
    return { ...e, x: e.x + dx, y: e.y + dy };
  });
}

/** The box a set of entities occupies, in drawing mm. */
export function boundsOf(entities) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const see = (x, y) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const e of entities) {
    if (e.kind === 'line') { see(e.x1, e.y1); see(e.x2, e.y2); }
    else if (e.kind === 'rect') { see(e.x, e.y); see(e.x + e.w, e.y + e.h); }
    else if (e.kind === 'circle') { see(e.cx - e.r, e.cy - e.r); see(e.cx + e.r, e.cy + e.r); }
    else if (e.kind === 'text') { see(e.x - e.height, e.y - e.height); see(e.x + e.height, e.y + e.height); }
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1, h: 1 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
