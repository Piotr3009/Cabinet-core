// ─── THE TOP IS DRAWN FROM ITS UNDERSIDE (chat fix 17.10.2026, 14:15) ──────
//
// The owner, 12:15, of the nesting sheet: *"w 01 bottom i top nie powinno byc
// odbicie lustrzane?"*  and at 14:15: *"lustro bottom i top, prosze, koduj"*.
//
// WHAT WAS WRONG. Every board's CNC drawing is the board seen from its
// MACHINED face: BUL and BUR are mirror images of each other (BUL x from the
// front, BUR x from the back, both inner face up, as the LISP has drawn them
// since turn 1); the BOTTOM is drawn from above, which is its inner face. The
// TOP was drawn in the BOTTOM's very frame (x from the back edge, y from BUL's
// end), which is the view from ABOVE: the TOP's OUTER face, the one face on the
// whole carcass drawn from the wrong side. The 3-D has known since turn 13
// ("TOP is the exception: its u x v is +n, a reflection"); nobody saw it on a
// sheet because until 15.10.2026 nothing on a TOP was asymmetric: the puzzle's
// tenons and dog bones mirror themselves. The recess bite (KIT_RECESS.lsp),
// the chimney notch (KIT_NOTCH.lsp), the divider's biscuit slots in the TOP's
// underside (SKYLON_JOINTS_BISCUIT.lsp section I) and a Cabineo pocket are
// not symmetric, and a TOP laid underside up on the bed and cut from the old
// drawing had its bite on the wrong side and its slot on the wrong face.
//
// THE LAW NOW. The TOP is drawn like every other board, from the face the
// machine works: its UNDERSIDE. Its frame is the BOTTOM's mirrored across the
// width: x still runs from the BACK edge towards the front (the banded front
// edge stays at the right of the drawing, the edge code '>' stays true), y
// runs from BUR's end towards BUL's. In numbers: y' = W_int - y for every
// point, where W_int is the drawn height (the internal width), and every
// outline keeps its anticlockwise walk by being read backwards. A dog bone,
// a mark, a hole, a notch corner, a bite, a Cabineo pocket all take the same
// one mirror, here, once, at the end of computeCabinet, after every producer
// has had its say in the frame it has always spoken. The 3-D's placement of
// the TOP (engine/joinery.js panelPlacement) takes the same frame, so the
// scene, the sheet and the file still agree to the millimetre.
//
// THE GOLDENS MOVE, knowingly: every TOP file in the repo changes bytes (the
// y of each point mirrored, the walk reversed). The six base goldens, T75's,
// T78's, the notch, the recess and the Cabineo goldens are re-pinned with the
// owner's words in scripts/t78-classify.d/f32-owner-1710d.mjs.
//
// Pure functions, pure data. The L corner's TOP-L (meta.lBoard) is not a box
// TOP and keeps its own frame (KIT_CORNER_L.lsp).

import { panelPlacement } from './joinery.js';

const EPS = 1e-9;
const r4 = (v) => Math.round(v * 1e4) / 1e4;

/** Is this panel a box TOP this law moves (the L corner's TOP-L is not)? */
export function isBoxTop(panel) {
  return panel?.part === 'TOP' && !panel?.meta?.lBoard;
}

/**
 * THE PRODUCERS' FRAME. Every routine inside computeCabinet draws the TOP in
 * the frame the LISP's drawTOP_ROT90 draws it in (the BOTTOM's, lifted to
 * the top face: x from the back, y from BUL's end, the view from above), and
 * the one mirror at the end (mirrorTopRecords) turns the whole record into
 * the underside frame that `panelPlacement` publishes. A producer that sets
 * out a cut on the TOP by projecting a cabinet point (engine/dividerJoints.js)
 * must therefore project into THIS frame, not into panelPlacement's, or the
 * end pass mirrors it twice. For every other board the two are the same.
 */
export function producerPlacement(panel) {
  if (!isBoxTop(panel) || !panel?.box) return panelPlacement(panel);
  const { box } = panel;
  return {
    origin: [box.x, box.y + box.h, box.z], u: [0, 0, 1], v: [1, 0, 0], n: [0, 1, 0],
  };
}

/** A notch corner name with its y half swapped: x0y0 <-> x0y1, x1y0 <-> x1y1. */
export function mirrorCornerName(fc) {
  const m = /^(x[01])(y[01])$/.exec(String(fc || ''));
  if (!m) return fc;
  return `${m[1]}${m[2] === 'y0' ? 'y1' : 'y0'}`;
}

/**
 * The outline's points mirrored in y and read backwards (anticlockwise
 * again). A bulge (a third number on a vertex, DXF's tan(angle / 4) of the
 * segment leaving it) follows its segment: the mirror flips its sign and the
 * reversed walk flips it back, so it is carried as it was.
 */
export function mirrorOutline(pts, H) {
  if (!Array.isArray(pts)) return pts;
  const n = pts.length;
  const out = [];
  for (let k = 0; k < n; k += 1) {
    const src = pts[n - 1 - k];
    const [x, y] = src;
    // the bulge of the segment that LEAVES the new vertex k is the bulge of
    // the old segment (n-2-k -> n-1-k), stored on old vertex n-2-k; the last
    // new vertex closes to the first, which was the old last segment.
    const bulgeSrc = k < n - 1 ? pts[n - 2 - k] : pts[n - 1];
    const b = bulgeSrc && bulgeSrc.length > 2 && Number.isFinite(Number(bulgeSrc[2])) ? Number(bulgeSrc[2]) : null;
    out.push(b != null && Math.abs(b) > EPS ? [x, r4(H - y), b] : [x, r4(H - y)]);
  }
  return out;
}

const isPt = (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]));
const mirrorPt = (p, H) => [p[0], r4(H - Number(p[1])), ...p.slice(2)];
const mirrorBox = (b, H) => [b[0], r4(H - Number(b[3])), b[2], r4(H - Number(b[1]))];
/** A Cabineo end name of the producers' frame ('Y0' the y = 0 end) on the mirrored board. */
const mirrorEnd = (end) => (end === 'Y0' ? 'YH' : (end === 'YH' ? 'Y0' : end));

/**
 * A cut record's `meta` mirrored where it carries drawn-frame geometry: T78
 * F20's Cabineo pocket (`axis`, `lobes`, `end`, and its `export` frame, which
 * reflects x only, so its y is the drawn y: `at`, `axis`, `lobes`, `pts`,
 * `box`). Any other key is carried as it is.
 */
export function mirrorRecordMeta(meta, H) {
  if (!meta || typeof meta !== 'object') return meta;
  const out = { ...meta };
  if (isPt(meta.axis)) out.axis = mirrorPt(meta.axis, H);
  if (Array.isArray(meta.lobes)) out.lobes = meta.lobes.map((l) => (isPt(l) ? mirrorPt(l, H) : l));
  if (typeof meta.end === 'string') out.end = mirrorEnd(meta.end);
  if (meta.export && typeof meta.export === 'object') {
    const ex = meta.export;
    out.export = {
      ...ex,
      ...(isPt(ex.at) ? { at: mirrorPt(ex.at, H) } : {}),
      ...(isPt(ex.axis) ? { axis: mirrorPt(ex.axis, H) } : {}),
      ...(Array.isArray(ex.lobes) ? { lobes: ex.lobes.map((l) => (isPt(l) ? mirrorPt(l, H) : l)) } : {}),
      ...(Array.isArray(ex.pts) ? { pts: mirrorOutline(ex.pts, H) } : {}),
      ...(Array.isArray(ex.box) && ex.box.length === 4 ? { box: mirrorBox(ex.box, H) } : {}),
    };
  }
  return out;
}

/** A rectangle pocket {x1,y1,x2,y2}, its `pts` and its `meta`, mirrored. */
export function mirrorPocket(p, H) {
  if (!p || typeof p !== 'object') return p;
  const out = { ...p };
  if (Number.isFinite(Number(p.y1)) && Number.isFinite(Number(p.y2))) {
    out.y1 = r4(H - Number(p.y2));
    out.y2 = r4(H - Number(p.y1));
  }
  if (Array.isArray(p.pts)) out.pts = mirrorOutline(p.pts, H);
  if (p.meta) out.meta = mirrorRecordMeta(p.meta, H);
  return out;
}

/** An arc record {cx, cy, r, start, end} (degrees, anticlockwise) mirrored in y. */
export function mirrorArc(a, H) {
  if (!a || typeof a !== 'object') return a;
  const deg = (v) => ((Number(v) % 360) + 360) % 360;
  return {
    ...a,
    ...(Number.isFinite(Number(a.cy)) ? { cy: r4(H - Number(a.cy)) } : {}),
    ...(Number.isFinite(Number(a.start)) && Number.isFinite(Number(a.end))
      ? { start: r4(deg(360 - Number(a.end))), end: r4(deg(360 - Number(a.start))) } : {}),
  };
}

/** One TOP's cnc record, mirrored in place (a new object; the panel keeps everything else). */
export function mirrorTopCnc(cnc) {
  const H = Number(cnc.drawn_h);
  if (!(H > 0)) return cnc;
  const out = { ...cnc };
  if (Array.isArray(cnc.outline)) out.outline = mirrorOutline(cnc.outline, H);
  if (Array.isArray(cnc.pockets)) out.pockets = cnc.pockets.map((p) => mirrorPocket(p, H));
  if (Array.isArray(cnc.marks)) {
    out.marks = cnc.marks.map((m) => ({
      ...m,
      from: [m.from[0], r4(H - m.from[1])],
      to: [m.to[0], r4(H - m.to[1])],
    }));
  }
  if (Array.isArray(cnc.holes)) out.holes = cnc.holes.map((h) => ({ ...h, y: r4(H - Number(h.y)), ...(h.meta ? { meta: mirrorRecordMeta(h.meta, H) } : {}) }));
  if (Array.isArray(cnc.curves)) out.curves = cnc.curves.map((c) => mirrorArc(c, H));
  if (Array.isArray(cnc.arcs)) out.arcs = cnc.arcs.map((c) => mirrorArc(c, H));
  if (cnc.notch && typeof cnc.notch === 'object') {
    const flip = (nt) => (nt ? { ...nt, fc: mirrorCornerName(nt.fc), ...(nt.also ? { also: flip(nt.also) } : {}) } : nt);
    out.notch = flip(cnc.notch);
  }
  if (cnc.bite && typeof cnc.bite === 'object') {
    out.bite = { ...cnc.bite, y0: r4(H - Number(cnc.bite.y1)), y1: r4(H - Number(cnc.bite.y0)) };
  }
  return out;
}

/**
 * THE PASS: every box TOP's record and its drills, mirrored once. Mutates
 * `panels` (each TOP's `cnc` is replaced) and `drills` (each TOP hole's y) in
 * place, as the rest of computeCabinet does.
 *
 * @returns {string[]} the ids of the TOPs moved
 */
export function mirrorTopRecords({ panels, drills }) {
  const moved = [];
  for (const p of panels || []) {
    if (!isBoxTop(p) || !p.cnc) continue;
    const H = Number(p.cnc.drawn_h);
    if (!(H > 0)) continue;
    p.cnc = mirrorTopCnc(p.cnc);
    for (const d of drills || []) {
      if (d.panel !== p.id) continue;
      d.y = r4(H - Number(d.y));
      // T75 F23: an edge bore names the edge it enters ('Y0' the y = 0 end).
      if (typeof d.edge === 'string') d.edge = mirrorEnd(d.edge);
      if (d.meta) d.meta = mirrorRecordMeta(d.meta, H);
    }
    moved.push(p.id);
  }
  return moved;
}
