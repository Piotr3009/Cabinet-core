// ─── THE OBJECTS A HAND DRAWS ON A PRINT (turn 38, CLAUDE.md F5/F6) ─────────
//
// Turn 24 gave the part editor four tools — Select, Drill, Line, Dowel line —
// and turn 38 gives it the rest of a drawing board: polyline, circle, rect,
// arc, and the verbs that act on what has been drawn (move, copy, rotate,
// group, delete).
//
// EVERYTHING HERE IS ARITHMETIC. No React, no store, no SVG, no three.js — the
// component projects and picks, this decides what a shape IS. That is the same
// division `engine/partSnap.js` was written on and for the same reason: a
// constructor with a degenerate case is a thing to be tested in node, not
// discovered on a bench.
//
// ─── THE RECORD ─────────────────────────────────────────────────────────────
//
// A drawn object is one entry in the SAME list turn 23 built —
// `unit.params.part_edits[panelId].ops` — carrying the same three things every
// op there has carried since: an `op`, a `layer`, and coordinates in the
// panel's own CNC millimetres. CLAUDE.md's word is *"extend, do not replace"*,
// so nothing about the existing four moves.
//
// What is added is an `id` (so a verb can name one object) and an optional
// `group` (so several answer as one).
//
//   { op:'line',     id, layer, from:[x,y], to:[x,y] }              ← turn 24's
//   { op:'polyline', id, layer, pts:[[x,y],…], closed }
//   { op:'rect',     id, layer, from:[x,y], to:[x,y] }
//   { op:'circle',   id, layer, at:[x,y], r }
//   { op:'arc',      id, layer, cx, cy, r, start, end }   angles in DEGREES,
//                                                          swept anticlockwise
//                                                          from start to end
//
// ANGLES ARE DEGREES and the sweep is anticlockwise, because that is what a
// DXF ARC is (group codes 50/51, "counterclockwise from start to end") and a
// second convention between here and the writer would be a bug waiting for the
// first arc that crosses zero.

/** Round to the micrometre — the same 4 places every stored coordinate takes. */
const q = (v) => {
  const n = Math.round((Number(v) || 0) * 1e4) / 1e4;
  return Object.is(n, -0) ? 0 : n;
};

const finite = (v) => Number.isFinite(Number(v));
const pt = (p) => (Array.isArray(p) && finite(p[0]) && finite(p[1]) ? [q(p[0]), q(p[1])] : null);

/** The ops this module builds and the verbs act on — the DRAWN ones. */
export const OBJECT_OPS = Object.freeze(['line', 'polyline', 'rect', 'circle', 'arc']);

/** Is this op a drawn object, as opposed to a drill, a dowel line or a hide? */
export function isObjectOp(op) {
  return Boolean(op) && OBJECT_OPS.includes(op.op);
}

/**
 * The next id, derived from the ops already there.
 *
 * DETERMINISTIC on purpose: `o1`, `o2`, … counted off the highest that exists.
 * A timestamp or a random suffix would make two identical drawings produce two
 * different saved files, and this app has spent thirty turns making the same
 * input give the same bytes.
 */
export function nextObjectId(ops = []) {
  let top = 0;
  for (const o of ops || []) {
    const m = /^o(\d+)$/.exec(String(o?.id || ''));
    if (m) top = Math.max(top, Number(m[1]));
  }
  return `o${top + 1}`;
}

/** …and n of them, so one gesture that lands four objects numbers them once. */
export function nextObjectIds(ops = [], n = 1) {
  const first = Number(nextObjectId(ops).slice(1));
  return Array.from({ length: Math.max(0, n) }, (_, i) => `o${first + i}`);
}

// ─── THE CONSTRUCTORS ───────────────────────────────────────────────────────
//
// Every one of them returns `null` for a degenerate input rather than an
// object nobody can cut. That is rule 13's habit: a zero-size rectangle is not
// a small rectangle, it is a mistake, and a mistake that reaches the machine as
// a closed polyline of four identical points is a plunge with no move.

/** A straight run between two points. Zero length is not a line. */
export function makeLine({ id, layer, from, to }) {
  const a = pt(from);
  const b = pt(to);
  if (!a || !b) return null;
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-6) return null;
  return { op: 'line', id, layer, from: a, to: b };
}

/**
 * A run of points. Consecutive duplicates are dropped — a double click at the
 * end of a polyline is one point, not two — and fewer than two survivors is
 * not a polyline.
 */
export function makePolyline({ id, layer, pts, closed = false }) {
  const clean = [];
  for (const p of pts || []) {
    const v = pt(p);
    if (!v) continue;
    const last = clean[clean.length - 1];
    if (last && Math.hypot(v[0] - last[0], v[1] - last[1]) < 1e-6) continue;
    clean.push(v);
  }
  if (clean.length < 2) return null;
  // A closed run of two points is a line drawn there and back.
  if (closed && clean.length < 3) return null;
  return { op: 'polyline', id, layer, pts: clean, closed: Boolean(closed) };
}

/** Two opposite corners. Either side zero is not a rectangle. */
export function makeRect({ id, layer, from, to }) {
  const a = pt(from);
  const b = pt(to);
  if (!a || !b) return null;
  if (Math.abs(b[0] - a[0]) < 1e-6 || Math.abs(b[1] - a[1]) < 1e-6) return null;
  return { op: 'rect', id, layer, from: a, to: b };
}

/** Centre and radius. Radius zero — a click that never moved — is not a circle. */
export function makeCircle({ id, layer, at, r }) {
  const c = pt(at);
  const radius = q(r);
  if (!c || !(radius > 1e-6)) return null;
  return { op: 'circle', id, layer, at: c, r: radius };
}

/**
 * THE ARC THROUGH THREE POINTS — start, a point it passes through, end.
 *
 * The circumcentre of the triangle, then the two angles, then the DIRECTION:
 * the arc has to contain the middle point, and there are two arcs between any
 * two points on a circle. Which one is settled by the sign of the cross
 * product `(b−a) × (c−b)` — positive is anticlockwise — and not by comparing
 * angles, because angle comparison is exactly where the wrap at 360 bites.
 *
 * @returns {{cx,cy,r,start,end}|null} null when the three are collinear (no
 *   circle passes through them) or when two of them are the same point.
 */
export function arcThroughThreePoints(a, b, c) {
  const A = pt(a); const B = pt(b); const C = pt(c);
  if (!A || !B || !C) return null;
  const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
  // Collinear — including any two of the three being the same point, which
  // makes the triangle degenerate the same way.
  if (Math.abs(d) < 1e-9) return null;
  const a2 = A[0] * A[0] + A[1] * A[1];
  const b2 = B[0] * B[0] + B[1] * B[1];
  const c2 = C[0] * C[0] + C[1] * C[1];
  const cx = (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d;
  const cy = (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d;
  const r = Math.hypot(A[0] - cx, A[1] - cy);
  if (!(r > 1e-6) || !Number.isFinite(r)) return null;
  const ang = (p) => ((Math.atan2(p[1] - cy, p[0] - cx) * 180) / Math.PI + 360) % 360;
  const cross = (B[0] - A[0]) * (C[1] - B[1]) - (B[1] - A[1]) * (C[0] - B[0]);
  // DXF sweeps anticlockwise from start to end. A clockwise three-point arc is
  // the SAME arc read the other way round, so the two ends trade places.
  const start = cross > 0 ? ang(A) : ang(C);
  const end = cross > 0 ? ang(C) : ang(A);
  return { cx: q(cx), cy: q(cy), r: q(r), start: q(start), end: q(end) };
}

/** …and the op that carries it. */
export function makeArc({ id, layer, a, b, c }) {
  const arc = arcThroughThreePoints(a, b, c);
  if (!arc) return null;
  return { op: 'arc', id, layer, ...arc };
}

// ─── READING A SHAPE ────────────────────────────────────────────────────────

/** How far apart two arc angles are, anticlockwise, in degrees (0 < sweep ≤ 360). */
export function arcSweep(arc) {
  const s = Number(arc?.start) || 0;
  const e = Number(arc?.end) || 0;
  const d = ((e - s) % 360 + 360) % 360;
  return d < 1e-9 ? 360 : d;
}

/** A point on an arc, `t` from 0 (start) to 1 (end). */
export function arcPointAt(arc, t) {
  const deg = (Number(arc.start) || 0) + arcSweep(arc) * t;
  const rad = (deg * Math.PI) / 180;
  return [arc.cx + arc.r * Math.cos(rad), arc.cy + arc.r * Math.sin(rad)];
}

/**
 * An arc as a run of points — for drawing it, for snapping to it and for
 * bounding it. `segments` is chosen by the caller because a screen wants more
 * of them than a bounding box does.
 */
export function arcPoints(arc, segments = 32) {
  const n = Math.max(2, Math.round(segments));
  const out = [];
  for (let i = 0; i <= n; i += 1) out.push(arcPointAt(arc, i / n));
  return out;
}

/** The four corners of a rect op, anticlockwise from its low corner. */
export function rectCorners(o) {
  const x1 = Math.min(o.from[0], o.to[0]);
  const y1 = Math.min(o.from[1], o.to[1]);
  const x2 = Math.max(o.from[0], o.to[0]);
  const y2 = Math.max(o.from[1], o.to[1]);
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
}

/**
 * The object as a run of points — the ONE reading the canvas, the snap engine
 * and the bounds all take, so none of them can disagree about where a shape is.
 *
 * A circle comes back as a closed 32-gon: it is only ever used for hit-testing
 * and bounds, never for the DXF, which writes a real CIRCLE.
 */
export function objectPoints(o, segments = 32) {
  if (!o) return [];
  if (o.op === 'line') return [o.from, o.to];
  if (o.op === 'polyline') return o.closed ? [...o.pts, o.pts[0]] : [...o.pts];
  if (o.op === 'rect') { const k = rectCorners(o); return [...k, k[0]]; }
  if (o.op === 'circle') {
    return arcPoints({
      cx: o.at[0], cy: o.at[1], r: o.r, start: 0, end: 0,
    }, segments);
  }
  if (o.op === 'arc') return arcPoints(o, segments);
  return [];
}

/** The box a shape occupies, or null. */
export function objectBounds(o) {
  if (o?.op === 'circle') {
    return {
      x: o.at[0] - o.r, y: o.at[1] - o.r, w: o.r * 2, h: o.r * 2,
    };
  }
  const pts = objectPoints(o, 64);
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
  };
}

/** How near the cursor is to a shape's own ink, in mm — for click selection. */
export function distanceToObject(o, at) {
  const x = Number(at?.x);
  const y = Number(at?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Infinity;
  if (o?.op === 'circle') return Math.abs(Math.hypot(x - o.at[0], y - o.at[1]) - o.r);
  const pts = objectPoints(o, 48);
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i += 1) {
    best = Math.min(best, distanceToSegment([x, y], pts[i], pts[i + 1]));
  }
  return best;
}

/** Point → segment, clamped to its ends. */
export function distanceToSegment(p, a, b) {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const len2 = rx * rx + ry * ry;
  if (len2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * rx + (p[1] - a[1]) * ry) / len2));
  return Math.hypot(p[0] - (a[0] + t * rx), p[1] - (a[1] + t * ry));
}

/** Is the whole of this shape inside a marquee box? (F6's drag-select.) */
export function objectInBox(o, box) {
  const b = objectBounds(o);
  if (!b || !box) return false;
  const x1 = Math.min(box.x, box.x + box.w);
  const x2 = Math.max(box.x, box.x + box.w);
  const y1 = Math.min(box.y, box.y + box.h);
  const y2 = Math.max(box.y, box.y + box.h);
  return b.x >= x1 - 1e-6 && b.y >= y1 - 1e-6 && b.x + b.w <= x2 + 1e-6 && b.y + b.h <= y2 + 1e-6;
}

// ─── THE VERBS (F6) ─────────────────────────────────────────────────────────

/** Everything moved by the same offset. A rect stays a rect; an arc's centre goes. */
export function moveObject(o, dx, dy) {
  const ox = Number(dx) || 0;
  const oy = Number(dy) || 0;
  const p = ([x, y]) => [q(x + ox), q(y + oy)];
  if (o.op === 'line') return { ...o, from: p(o.from), to: p(o.to) };
  if (o.op === 'rect') return { ...o, from: p(o.from), to: p(o.to) };
  if (o.op === 'polyline') return { ...o, pts: o.pts.map(p) };
  if (o.op === 'circle') return { ...o, at: p(o.at) };
  if (o.op === 'arc') return { ...o, cx: q(o.cx + ox), cy: q(o.cy + oy) };
  // A drill, a dowel line — the other things an override list carries — move
  // too, because a joiner selecting a set does not sort it by kind first.
  if (o.op === 'drill') return { ...o, x: q(o.x + ox), y: q(o.y + oy) };
  if (o.op === 'dowels') return { ...o, from: p(o.from), to: p(o.to) };
  return o;
}

/**
 * Turned about a point, anticlockwise, in degrees.
 *
 * A RECT BECOMES A POLYLINE, and that is not a shortcut: a rect op is two
 * corners of an axis-aligned rectangle, and a rectangle at 30° cannot be
 * written that way at all. Turning it into its own four corners keeps the
 * shape exactly and loses only the name.
 */
export function rotateObject(o, cx, cy, deg) {
  const rad = ((Number(deg) || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ox = Number(cx) || 0;
  const oy = Number(cy) || 0;
  const p = ([x, y]) => [
    q(ox + (x - ox) * cos - (y - oy) * sin),
    q(oy + (x - ox) * sin + (y - oy) * cos),
  ];
  if (o.op === 'line') return { ...o, from: p(o.from), to: p(o.to) };
  if (o.op === 'polyline') return { ...o, pts: o.pts.map(p) };
  if (o.op === 'rect') {
    return {
      op: 'polyline', id: o.id, layer: o.layer, pts: rectCorners(o).map(p), closed: true, ...(o.group ? { group: o.group } : {}),
    };
  }
  if (o.op === 'circle') return { ...o, at: p(o.at) };
  if (o.op === 'arc') {
    const [ncx, ncy] = p([o.cx, o.cy]);
    const turn = ((Number(deg) || 0) % 360 + 360) % 360;
    return {
      ...o, cx: ncx, cy: ncy, start: q((o.start + turn) % 360), end: q((o.end + turn) % 360),
    };
  }
  if (o.op === 'drill') { const [x, y] = p([o.x, o.y]); return { ...o, x, y }; }
  if (o.op === 'dowels') return { ...o, from: p(o.from), to: p(o.to) };
  return o;
}

/**
 * F6's MIRROR — a shape reflected in the line through two points.
 *
 * Not in CLAUDE.md's named five verbs but on its toolbar list, and it is the
 * same arithmetic as the rest of them: every point of the shape reflected, the
 * shape's own kind kept where it survives the reflection. A RECT does not — a
 * mirrored rectangle is still axis-aligned only when the mirror is — so it
 * becomes its own four corners, exactly as `rotateObject` does it and for the
 * same reason.
 */
export function mirrorObject(o, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return null;
  const reflect = ([x, y]) => {
    const t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    return [2 * px - x, 2 * py - y];
  };
  if (o.op === 'line') return { ...o, from: reflect(o.from), to: reflect(o.to) };
  if (o.op === 'polyline') return { ...o, pts: o.pts.map(reflect) };
  if (o.op === 'rect') {
    return {
      op: 'polyline', id: o.id, layer: o.layer, closed: true, pts: objectPoints(o).slice(0, 4).map(reflect),
    };
  }
  if (o.op === 'circle') return { ...o, at: reflect(o.at) };
  if (o.op === 'arc') {
    // A reflected arc sweeps the other way, so its ends trade places and both
    // angles are measured about the mirrored centre.
    const [cx, cy] = reflect([o.cx, o.cy]);
    const end0 = reflect(arcPoints(o, 2)[0]);
    const end1 = reflect(arcPoints(o, 2)[2]);
    const ang = (p) => ((Math.atan2(p[1] - cy, p[0] - cx) * 180) / Math.PI + 360) % 360;
    return {
      ...o, cx, cy, start: ang(end1), end: ang(end0),
    };
  }
  if (o.op === 'drill') { const [x, y] = reflect([o.x, o.y]); return { ...o, x, y }; }
  if (o.op === 'dowels') return { ...o, from: reflect(o.from), to: reflect(o.to) };
  return o;
}

/** A copy, with an id of its own and no group of its own. */
export function copyObject(o, id) {
  const { group: _dropped, ...rest } = o;
  return { ...rest, id };
}

/**
 * GROUP (F6): the selected objects get one shared id, and clicking any member
 * selects the whole set.
 *
 * A member that is ALREADY in a group joins the new one whole — its old
 * group's other members come with it — because a joiner who has grouped four
 * holes and then groups one of them with a line means all five. Silently
 * splitting a group would be the app editing something nobody named.
 */
export function groupIn(ops, ids, groupId) {
  const want = new Set(ids || []);
  const groups = new Set();
  for (const o of ops || []) if (want.has(o?.id) && o.group) groups.add(o.group);
  return (ops || []).map((o) => (want.has(o?.id) || (o?.group && groups.has(o.group))
    ? { ...o, group: groupId }
    : o));
}

/** …and the other way: the named group's members become their own again. */
export function ungroupIn(ops, groupId) {
  return (ops || []).map((o) => {
    if (o?.group !== groupId) return o;
    const { group: _gone, ...rest } = o;
    return rest;
  });
}

/**
 * The ids a click on ONE object really selects: itself, or every member of its
 * group (F6: "clicking any member selects the whole group").
 */
export function selectionFor(ops, id) {
  const hit = (ops || []).find((o) => o?.id === id);
  if (!hit) return [];
  if (!hit.group) return [id];
  return (ops || []).filter((o) => o?.group === hit.group).map((o) => o.id);
}

/** The next group id, counted off what is there — deterministic, like the object ids. */
export function nextGroupId(ops = []) {
  let top = 0;
  for (const o of ops || []) {
    const m = /^g(\d+)$/.exec(String(o?.group || ''));
    if (m) top = Math.max(top, Number(m[1]));
  }
  return `g${top + 1}`;
}
