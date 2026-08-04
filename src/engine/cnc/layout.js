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

/**
 * True extents of one part: the outline, its pockets and its holes.
 *
 * The nominal rectangle is NOT the answer — a puzzle tab reaches one board
 * thickness past the panel edge and a socket relief overshoots it by 6 mm, so
 * laying out on w × h alone would overlap neighbouring parts on the sheet.
 */
export function panelBounds(panel, drills = []) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const hit = (x, y) => {
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
    return { minX: 0, minY: 0, maxX: panel.w, maxY: panel.h, w: panel.w, h: panel.h };
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
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

/** Geometry point (engine, y-up) → sheet point (y-down), for a placed part. */
export function toSheet(place, x, y) {
  return [place.x + (x - place.bounds.minX), place.y + (place.bounds.maxY - y)];
}

/** SVG "x,y x,y …" for a polygon, in sheet coordinates. */
export function sheetPolygon(place, points) {
  return points.map(([x, y]) => toSheet(place, x, y).join(',')).join(' ');
}

/** A pocket rectangle in sheet coordinates: { x, y, w, h }. */
export function sheetRect(place, pocket) {
  const [x1, y1] = toSheet(place, Math.min(pocket.x1, pocket.x2), Math.max(pocket.y1, pocket.y2));
  return {
    x: x1,
    y: y1,
    w: Math.abs(pocket.x2 - pocket.x1),
    h: Math.abs(pocket.y2 - pocket.y1),
  };
}
