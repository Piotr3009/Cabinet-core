// ─── Flat CNC sheet layout ───
// Lays every cut part of a unit out side by side, exactly like the CNC section
// of the AutoLISP does (KIT_WARDROBE_FULL: `curX = curX + partWidth + odstep`),
// except that the row wraps instead of running off to the right forever.
//
// This is the arrangement a workshop looks at BEFORE the machine — the job
// AutoCAD used to do. It is not a nesting optimiser and must never become one:
// the order is the engine's panel order so the sheet reads like the cut list.
//
// Pure JavaScript — no React, no store imports, no DOM (engine rule).

// ─── HOW A PART IS TURNED ON THE SHEET (turn 17, CLAUDE.md F3) ──────────────
//
// Owner: "odwróć wszystkie półki o 90 stopni w CNC — zobacz, w 3D orientacja
// jest dobra ale nie współgra z CNC."
//
// He is right, and the disagreement is not subtle once it is written down. Every
// board in this app is nested with the GRAIN RUNNING UP THE DRAWING — its long
// cut dimension along the drawing's y. A side panel is drawn 560 × 2100, a back
// 600 × 2150, a door 597 × 2097; a TOP is drawn TURNED for exactly this reason
// (`drawTOP_ROT90`: 560 × 564, the internal width up the page). One family of
// parts does not: a SHELF is drawn `width × depth`, so its grain lies ACROSS the
// sheet while the top and bottom of the same carcass stand up it. In the 3D view
// the shelf and the top are parallel boards with parallel figure; on the sheet
// they are crossed. That is the whole complaint.
//
// The fix is a fact about the LAYOUT and not about the part. CLAUDE.md says
// "rotate the shelf's CNC PLACEMENT 90°", and placement is the right word: the
// part's own CNC frame — the frame `fixtures/golden-partition-biscuits.json`
// pins its biscuit marks in, the frame a per-panel DXF is written in, the frame
// `engine/joinery.js` maps back into the cabinet — does not move a millimetre.
// What moves is how the sheet PUTS IT DOWN, which is what a nesting program
// turns and what the owner is looking at.
//
// Turn 0 is the identity, exactly: a sheet with no shelves on it is byte-for-byte
// the sheet it was, which is what keeps this turn's CNC delta to the one part it
// is about.

/** The horizontal boards a joiner calls a shelf. VPART is upright and is not one. */
export const SHELF_BOARD_PARTS = new Set(['SHELF', 'PARTITION', 'RAIL-PART', 'FIXED']);

/**
 * How many degrees this part is turned when it is laid on the sheet.
 *
 * A number rather than a boolean because it is an ANGLE, and because the next
 * kit that wants 180° should be a case here rather than a second flag.
 */
export function sheetTurn(panel) {
  return SHELF_BOARD_PARTS.has(panel?.part) ? 90 : 0;
}

/**
 * A point of the part's own CNC frame, turned by `turn` about that frame's
 * origin.
 *
 * `|| 0` on every negation is not decoration: `-0` is a real IEEE value, it
 * survives arithmetic, and it reads back out of a bounds comparison as a
 * different number from `0`. One of them in a coordinate is a file that differs
 * from its own fingerprint for no reason a joiner could ever see.
 */
export function turnPoint(x, y, turn) {
  if (turn === 90) return [-y || 0, x];
  if (turn === 180) return [-x || 0, -y || 0];
  if (turn === 270) return [y, -x || 0];
  return [x, y];
}

/**
 * True extents of one part AS IT IS LAID DOWN: the outline, its pockets and its
 * holes, turned by `sheetTurn`.
 *
 * The nominal rectangle is NOT the answer — a puzzle tab reaches one board
 * thickness past the panel edge and a socket relief overshoots it by 6 mm, so
 * laying out on w × h alone would overlap neighbouring parts on the sheet.
 */
export function panelBounds(panel, drills = []) {
  const turn = sheetTurn(panel);
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const hit = (px, py) => {
    const [x, y] = turnPoint(px, py, turn);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const [x, y] of panel.cnc?.outline || []) hit(x, y);
  for (const p of panel.cnc?.pockets || []) { hit(p.x1, p.y1); hit(p.x2, p.y2); }
  for (const d of drills) {
    if (d.panel !== panel.id) continue;
    const r = d.d / 2;
    hit(d.x - r, d.y - r);
    hit(d.x + r, d.y + r);
  }

  if (!Number.isFinite(minX)) {
    // A part with no CNC geometry at all still gets its nominal rectangle.
    const [w, h] = turn === 90 || turn === 270 ? [panel.h, panel.w] : [panel.w, panel.h];
    return { minX: 0, minY: 0, maxX: w, maxY: h, w, h, turn };
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, turn };
}

/**
 * Arrange parts into rows.
 *
 * Returned coordinates are SHEET coordinates: x to the right, **y downwards**,
 * origin top-left — the frame an SVG viewport uses directly, so no mirroring
 * transform is needed and no label ends up drawn back to front. A geometry
 * point (gx, gy) of a placed part maps to
 *   sx = place.x + (gx − bounds.minX)
 *   sy = place.y + (bounds.maxY − gy)
 *
 * @param {object[]} panels  result.panels (already in cut-list order)
 * @param {object[]} drills  result.drills
 * @param {{gap:number, rowWidth:number}} opts  from profile.cnc
 * @returns {{places:object[], width:number, height:number}}
 */
export function layoutPanels(panels, drills, { gap, rowWidth }) {
  const places = [];
  let cursorX = 0;
  let rowTop = 0;
  let rowHeight = 0;
  let sheetWidth = 0;

  for (const panel of panels) {
    const bounds = panelBounds(panel, drills);
    // Wrap once the row is full — but never leave a row empty, or a part wider
    // than rowWidth on its own would loop forever.
    if (cursorX > 0 && cursorX + bounds.w > rowWidth) {
      rowTop += rowHeight + gap;
      cursorX = 0;
      rowHeight = 0;
    }
    places.push({ panel, bounds, x: cursorX, y: rowTop, w: bounds.w, h: bounds.h });
    cursorX += bounds.w + gap;
    sheetWidth = Math.max(sheetWidth, cursorX - gap);
    rowHeight = Math.max(rowHeight, bounds.h);
  }

  return { places, width: sheetWidth, height: rowTop + rowHeight };
}

/**
 * Geometry point (the PART's own CNC frame, y-up) → sheet point (y-down), for a
 * placed part.
 *
 * The turn is applied first, because it is a fact about how the part is put
 * down and everything after it — the bounds, the row packing, the flip into the
 * DXF's y-up frame — is measured on the part as laid.
 */
export function toSheet(place, x, y) {
  const [tx, ty] = turnPoint(x, y, place.bounds.turn || 0);
  return [place.x + (tx - place.bounds.minX), place.y + (place.bounds.maxY - ty)];
}

/** SVG "x,y x,y …" for a polygon, in sheet coordinates. */
export function sheetPolygon(place, points) {
  return points.map(([x, y]) => toSheet(place, x, y).join(',')).join(' ');
}

/**
 * A pocket rectangle in sheet coordinates: { x, y, w, h }.
 *
 * Derived from the two mapped CORNERS rather than from the pocket's own width
 * and height, because a turned part swaps them — and an SVG `<rect>` wants a
 * top-left corner and two positive extents whichever way round the part lies.
 */
export function sheetRect(place, pocket) {
  const a = toSheet(place, pocket.x1, pocket.y1);
  const b = toSheet(place, pocket.x2, pocket.y2);
  return {
    x: Math.min(a[0], b[0]),
    y: Math.min(a[1], b[1]),
    w: Math.abs(b[0] - a[0]),
    h: Math.abs(b[1] - a[1]),
  };
}
