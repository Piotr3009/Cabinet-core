/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── WHERE A LABEL STANDS: ON THE BOARD (chat fix 19.10.2026) ───────────────
//
// The owner, 19.10.2026: *"cnc rysuje ... litery poza elementami"*. The DXF
// writer and the CNC sheet put a board's caption at the middle of its
// RECTANGLE (w / 2, h / 2) and its note under the rectangle's top edge, which
// is the board for a rectangle and is thin air for a shape: the glass door's
// aperture, the dishwasher plinth's strip (a 20 mm band over a cut-out), the
// fridge SPURS drawn turned (its outline 260 x 556 under a 556 x 260 record),
// a BACK with a recess window. The probe of 19.10 found ten such texts.
//
// ONE LAW, two callers (`cnc/dxf.js panelEntities`, `components/CncView.jsx`):
// the intended point is the rectangle's, as always (w / 2, h / 2; the note
// under the top edge); a point that is on the board (inside the outline,
// outside every through pocket) with room for the text around it stays
// exactly where it was, so every file whose label was on its board is byte
// for byte what it was (a side's back tabs run past its rectangle, and a
// point read off the outline's box would have moved every tabbed board's
// label by half a tab); a point that is not is moved to the nearest point
// that is, with room for the text, found on a grid over the outline's box.
// Pure: numbers in, a point out.

const EPS = 0.01;

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function clearanceTo(x, y, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    best = Math.min(best, segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  }
  return best;
}

/** The outline's own box: [x0, y0, x1, y1]. */
export function outlineBox(outline) {
  const xs = outline.map(([x]) => x);
  const ys = outline.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** A rectangle pocket as a closed loop (the DXF writer's own corner order). */
function pocketLoop(k) {
  return [[k.x1, k.y1], [k.x2, k.y1], [k.x2, k.y2], [k.x1, k.y2]];
}

/**
 * The through pockets of a panel (depth reaching the board's thickness): the
 * windows a label must keep out of.
 */
export function throughWindows(panel) {
  const thick = Number(panel?.thickness) || 0;
  return (panel?.cnc?.pockets || [])
    .filter((k) => thick > 0 && Number(k.depth) >= thick - EPS)
    .map(pocketLoop);
}

/**
 * Is (x, y) on the board with `room` millimetres of material round it?
 * @returns {number} the clearance there, or -1 off the board
 */
export function roomAt(x, y, outline, windows = []) {
  if (!Array.isArray(outline) || outline.length < 3) return -1;
  if (!inPoly(x, y, outline)) return -1;
  let c = clearanceTo(x, y, outline);
  for (const w of windows) {
    if (inPoly(x, y, w)) return -1;
    c = Math.min(c, clearanceTo(x, y, w));
  }
  return c;
}

/**
 * The point a label stands at: `[x, y]` as asked when it is on the board with
 * `room` round it; else the nearest point on the board that has the room,
 * else the point on the board with the most room. `room` is half the text's
 * height (the glyphs' own reach), never less than 1.
 */
export function onBoardPoint(x, y, outline, windows = [], room = 1) {
  const want = Math.max(1, Number(room) || 0);
  const here = roomAt(x, y, outline, windows);
  if (here >= want) return [x, y];
  const [x0, y0, x1, y1] = outlineBox(outline);
  const bw = x1 - x0;
  const bh = y1 - y0;
  if (!(bw > 0) || !(bh > 0)) return [x, y];
  const step = Math.max(1, Math.min(bw, bh) / 40);
  let best = null;
  for (let gy = y0 + step / 2; gy < y1; gy += step) {
    for (let gx = x0 + step / 2; gx < x1; gx += step) {
      const c = roomAt(gx, gy, outline, windows);
      if (c < 0) continue;
      // The nearest point with the room; short of the room, the cost grows
      // with what is missing, so a cramped point near wins over a cramped
      // point far and a roomy point wins over both.
      const score = Math.hypot(gx - x, gy - y) + Math.max(0, want - c) * 4;
      if (!best || score < best.score) best = { x: gx, y: gy, score };
    }
  }
  if (!best) return [x, y];
  return [Math.round(best.x * 10) / 10, Math.round(best.y * 10) / 10];
}

/**
 * The two anchors of a board's text, in the board's drawn frame:
 *   caption  the middle of the record's rectangle (w / 2, h / 2, as the writer
 *            has always placed it), moved onto the board when it is not on it;
 *   note     the FIRST line of the note under the outline's top edge
 *            (h - size * 1.2 for a rectangle), the block lifted where it would
 *            run off the bottom; `noteCentre` is the block's middle;
 *            moved onto the board the same way.
 * Reads the outline and the through pockets; a panel without an outline
 * answers from w / h as before.
 */
export function labelAnchors(panel, { captionH = 0, noteSize = 0, noteBlockH = 0 } = {}) {
  const outline = panel?.cnc?.outline;
  const w = Number(panel?.cnc?.drawn_w ?? panel?.w) || 0;
  const h = Number(panel?.cnc?.drawn_h ?? panel?.h) || 0;
  const blockH = Math.max(noteSize, Number(noteBlockH) || 0);
  // The FIRST line of the note under the top edge, as always; the block of
  // lines stacks DOWN from it (`cnc/dxf.js`). A block too tall to stack from
  // there (a plinth 140 tall with a four-line site-trim note, 19.10.2026) is
  // lifted so its last line stays on the board, and a block taller than the
  // board itself is centred on it: text is a layer the machine does not cut,
  // and a note over the caption is a note on the board, which an off-board
  // note is not.
  const firstLine = (top, bottom) => {
    let y = top - noteSize * 1.2;
    const tail = blockH - noteSize;
    if (y - tail < bottom + noteSize / 2) y = bottom + noteSize / 2 + tail;
    if (y > top - noteSize / 2) y = (top + bottom) / 2 + tail / 2;
    return y;
  };
  // The intended points are the RECTANGLE's, exactly as the writer has always
  // placed them (w / 2, h / 2; w / 2, h - size * 1.2): a side's back tabs run
  // past its rectangle and a label read off the outline's box would move by
  // half a tab on every tabbed board. Only a point that is NOT on the board is
  // moved, so every file whose label was on its board is byte for byte what it
  // was.
  const cx = w / 2;
  const noteAt = [cx, firstLine(h, 0)];
  if (!Array.isArray(outline) || outline.length < 3) {
    return { caption: [cx, h / 2], note: noteAt, noteCentre: [cx, noteAt[1] - (blockH - noteSize) / 2], box: [0, 0, w, h] };
  }
  const box = outlineBox(outline);
  const windows = throughWindows(panel);
  const caption = onBoardPoint(cx, h / 2, outline, windows, captionH / 2);
  // The note stands at the top edge by design (beside the cut), so it asks for
  // half its own height only when it has to move; on a rectangle it stays.
  const note = roomAt(noteAt[0], noteAt[1], outline, windows) >= 0 ? noteAt : onBoardPoint(noteAt[0], noteAt[1], outline, windows, noteSize / 2);
  // The block's own middle, for a layout that centres its lines (the CNC sheet).
  const noteCentre = [note[0], note[1] - (blockH - noteSize) / 2];
  return { caption, note, noteCentre, box };
}
