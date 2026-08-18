// ─── THE PRECISION QUARTET (turn 38, CLAUDE.md F12) ─────────────────────────
//
// The owner, 17.08.2026: *"trim i fillet i offset to podstawa."* Offset, Trim,
// Fillet and Array — the four operations that turn a sketch into a set-out,
// and the four CLAUDE.md puts LAST in the execution order so a short night
// cuts here first.
//
// They all operate on MANUAL objects only (`engine/partObjects.js`), which is
// F12's own last line and is also the architecture: the engine's geometry is
// the print, and a hand that could trim a computed hole would be editing the
// kit.
//
// EVERY FUNCTION HERE RETURNS null FOR A DEGENERATE CASE. Parallel lines do
// not intersect, a trim with no intersection is a no-op, a fillet radius the
// corner cannot hold is refused — CLAUDE.md names all three, and the caller
// turns each `null` into a status-bar sentence rather than a crash.
//
// Pure arithmetic. No React, no store, no SVG.

import {
  arcSweep, distanceToSegment, makeArc, moveObject, objectPoints, rectCorners,
} from './partObjects.js';
import { segmentIntersection } from './partSnap.js';

const q = (v) => {
  const n = Math.round((Number(v) || 0) * 1e4) / 1e4;
  return Object.is(n, -0) ? 0 : n;
};

// ─── WHERE A LINE MEETS A CIRCLE ────────────────────────────────────────────
//
// CLAUDE.md F12, on Trim: *"works line-vs-line and line-vs-circle/arc
// (`segmentIntersection` exists; add line-circle intersection with tests)."*
// This is that addition, and it is deliberately a SEGMENT-vs-circle question
// like its neighbour: a chord that would cross the circle if the line were
// extended is not a crossing, for the same reason `segmentIntersection`
// refuses one.

/**
 * The points where a segment crosses a circle — 0, 1 or 2 of them.
 *
 * @param {number[]} a  [x, y] one end of the segment
 * @param {number[]} b  [x, y] the other
 * @param {{cx:number, cy:number, r:number}} circle
 * @returns {Array<[number, number]>} in order along the segment from `a`
 */
export function lineCircleIntersection(a, b, circle) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return [];
  const r = Number(circle?.r);
  if (!(r > 0)) return [];
  const fx = a[0] - circle.cx;
  const fy = a[1] - circle.cy;
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - r * r;
  const disc = B * B - 4 * len2 * C;
  // TANGENT is a real answer and it is ONE point, not two of the same: a
  // discriminant of zero is a line that touches, and reporting it twice would
  // make a trim cut a zero-length piece out of the middle of a line.
  if (disc < -1e-9) return [];
  const root = Math.sqrt(Math.max(0, disc));
  const ts = disc <= 1e-9
    ? [-B / (2 * len2)]
    : [(-B - root) / (2 * len2), (-B + root) / (2 * len2)];
  return ts
    .filter((t) => t >= -1e-9 && t <= 1 + 1e-9)
    .sort((x, y) => x - y)
    .map((t) => [q(a[0] + t * dx), q(a[1] + t * dy)]);
}

/** Is this angle inside an arc's own sweep? (A crossing off the arc is not one.) */
export function angleOnArc(arc, deg) {
  const from = ((Number(arc.start) || 0) % 360 + 360) % 360;
  const at = ((Number(deg) || 0) % 360 + 360) % 360;
  const rel = ((at - from) % 360 + 360) % 360;
  return rel <= arcSweep(arc) + 1e-6;
}

/** Every point where a segment crosses one object — line, polyline, rect, circle or arc. */
export function crossingsWith(a, b, other) {
  const out = [];
  if (other.op === 'circle' || other.op === 'arc') {
    const circle = other.op === 'circle'
      ? { cx: other.at[0], cy: other.at[1], r: other.r }
      : { cx: other.cx, cy: other.cy, r: other.r };
    for (const p of lineCircleIntersection(a, b, circle)) {
      if (other.op === 'arc') {
        const deg = (Math.atan2(p[1] - circle.cy, p[0] - circle.cx) * 180) / Math.PI;
        if (!angleOnArc(other, deg)) continue;
      }
      out.push(p);
    }
    return out;
  }
  const pts = other.op === 'rect' ? [...rectCorners(other), rectCorners(other)[0]] : objectPoints(other, 48);
  for (let i = 0; i + 1 < pts.length; i += 1) {
    const hit = segmentIntersection([a, b], [pts[i], pts[i + 1]]);
    if (hit) out.push([q(hit[0]), q(hit[1])]);
  }
  return out;
}

// ─── OFFSET ─────────────────────────────────────────────────────────────────
//
// "Selected line/polyline/circle/arc → parallel copy at typed distance, side
// chosen by click. New object on the same layer."
//
// The SIDE is a click, so the distance the joiner typed is always positive and
// the sign is read off where his hand is — which is how every CAD package does
// it and is the only reading that needs no second question.

/**
 * A parallel copy of one shape.
 *
 * @param {object} o        the shape
 * @param {number} distance the typed distance, sign ignored
 * @param {{x,y}} side      the click that says WHICH side
 * @param {string} id       the new object's id
 * @returns {object|null} null for a shape that cannot be offset that way
 */
export function offsetObject(o, distance, side, id) {
  const d = Math.abs(Number(distance) || 0);
  if (!(d > 1e-6) || !o || !side) return null;

  if (o.op === 'circle') {
    // Outward or inward, decided by where the click fell relative to the rim.
    const away = Math.hypot(side.x - o.at[0], side.y - o.at[1]) > o.r;
    const r = away ? o.r + d : o.r - d;
    if (!(r > 1e-6)) return null;              // a circle offset inside itself
    return { ...o, id, r: q(r) };
  }
  if (o.op === 'arc') {
    const away = Math.hypot(side.x - o.cx, side.y - o.cy) > o.r;
    const r = away ? o.r + d : o.r - d;
    if (!(r > 1e-6)) return null;
    return { ...o, id, r: q(r) };
  }

  const pts = o.op === 'rect' ? rectCorners(o) : (o.op === 'line' ? [o.from, o.to] : o.pts);
  if (!pts || pts.length < 2) return null;
  const closed = o.op === 'rect' || (o.op === 'polyline' && o.closed);

  // ─── THE SIMPLE OFFSET, AND WHY IT IS THE HONEST ONE ────────────────────
  //
  // Each segment is moved along its own normal and the run is rebuilt from the
  // moved segments' intersections — the classical construction. Where two
  // consecutive segments are parallel there is no intersection to take, so the
  // moved endpoint stands as it is; that is exactly the case a joiner draws
  // when he offsets a straight polyline, and it is right.
  //
  // A self-intersecting offset (a corner tighter than the distance) is NOT
  // cleaned up. It is drawn as it comes out, because the alternative is this
  // module deciding which loop the joiner meant.
  const sign = offsetSideSign(pts, closed, side);
  if (!sign) return null;
  const moved = [];
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-9) continue;
    const nx = (-(b[1] - a[1]) / len) * d * sign;
    const ny = ((b[0] - a[0]) / len) * d * sign;
    moved.push([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]]);
  }
  if (!moved.length) return null;

  const out = [];
  if (!closed) out.push(moved[0][0]);
  for (let i = 0; i < moved.length - (closed ? 0 : 1); i += 1) {
    const cur = moved[i];
    const nxt = moved[(i + 1) % moved.length];
    const hit = lineLineIntersection(cur[0], cur[1], nxt[0], nxt[1]);
    out.push(hit || cur[1]);
  }
  if (!closed) out.push(moved[moved.length - 1][1]);
  const clean = out.map(([x, y]) => [q(x), q(y)]);
  if (o.op === 'line') return { op: 'line', id, layer: o.layer, from: clean[0], to: clean[clean.length - 1] };
  return {
    op: 'polyline', id, layer: o.layer, pts: closed ? clean.slice(0, pts.length) : clean, closed,
  };
}

/** Which side of a run a point falls on: +1 or −1, or 0 where it cannot be told. */
function offsetSideSign(pts, closed, side) {
  let best = null;
  let bestD = Infinity;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const d = distanceToSegment([side.x, side.y], a, b);
    if (d < bestD) { bestD = d; best = [a, b]; }
  }
  if (!best) return 0;
  const [a, b] = best;
  const cross = (b[0] - a[0]) * (side.y - a[1]) - (b[1] - a[1]) * (side.x - a[0]);
  if (Math.abs(cross) < 1e-9) return 0;      // the click is ON the line
  return cross > 0 ? 1 : -1;
}

/** Where two INFINITE lines cross, or null when they are parallel. */
export function lineLineIntersection(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const denom = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / denom;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}

// ─── TRIM ───────────────────────────────────────────────────────────────────
//
// "Cutting edge(s) selected → click the segment portion to remove."
//
// The victim is cut at every crossing with every cutting edge; the piece the
// click fell in is the piece that goes, and what is left comes back as one or
// two objects. NO INTERSECTION IS A NO-OP and says so with `null`, which is
// CLAUDE.md's own degenerate case.

/**
 * @param {object} victim   the object the click landed on
 * @param {Array} edges     the selected cutting edges
 * @param {{x,y}} at        the click
 * @param {string[]} ids    two ids, for the (up to) two survivors
 * @returns {Array<object>|null} what replaces the victim, or null for a no-op
 */
export function trimObject(victim, edges, at, ids = []) {
  if (!victim || !at) return null;
  // A trim is a cut along a RUN of points, so a circle is trimmed as its own
  // 48-gon and an arc as its own chord run — the same reading everything else
  // in this house takes of them.
  const closed = victim.op === 'rect' || (victim.op === 'polyline' && victim.closed) || victim.op === 'circle';
  const pts = victim.op === 'rect'
    ? [...rectCorners(victim), rectCorners(victim)[0]]
    : objectPoints(victim, 96);
  if (pts.length < 2) return null;

  // Every crossing, as a distance ALONG the run — one axis, so sorting them is
  // sorting numbers rather than comparing points.
  const cuts = [];
  let run = 0;
  for (let i = 0; i + 1 < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (const edge of edges || []) {
      if (edge.id === victim.id) continue;
      for (const p of crossingsWith(a, b, edge)) {
        const along = run + Math.hypot(p[0] - a[0], p[1] - a[1]);
        cuts.push({ along, p });
      }
    }
    run += len;
  }
  if (!cuts.length) return null;
  cuts.sort((x, y) => x.along - y.along);

  // WHERE THE CLICK IS, on the same axis.
  let clickAt = null;
  let bestD = Infinity;
  run = 0;
  for (let i = 0; i + 1 < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const d = distanceToSegment([at.x, at.y], a, b);
    if (d < bestD) {
      bestD = d;
      const t = len < 1e-9 ? 0 : Math.max(0, Math.min(1, ((at.x - a[0]) * (b[0] - a[0]) + (at.y - a[1]) * (b[1] - a[1])) / (len * len)));
      clickAt = run + t * len;
    }
    run += len;
  }
  if (clickAt === null) return null;

  const bounds = [0, ...cuts.map((c) => c.along), run];
  let lo = 0;
  let hi = bounds.length - 1;
  for (let i = 0; i + 1 < bounds.length; i += 1) {
    if (clickAt >= bounds[i] - 1e-6 && clickAt <= bounds[i + 1] + 1e-6) { lo = i; hi = i + 1; break; }
  }
  const from = bounds[lo];
  const to = bounds[hi];
  // A closed run whose click falls in the piece before the first cut and after
  // the last one is ONE piece that wraps — the survivors are then a single
  // open run from the last cut to the first.
  const survivors = [];
  if (from > 1e-6) survivors.push(sliceRun(pts, 0, from));
  if (run - to > 1e-6) survivors.push(sliceRun(pts, to, run));
  if (closed && survivors.length === 2) {
    const joined = [...survivors[1], ...survivors[0].slice(1)];
    return [asPolyline(victim, joined, ids[0])].filter(Boolean);
  }
  return survivors
    .map((s, i) => asPolyline(victim, s, ids[i] || `${victim.id}-${i}`))
    .filter(Boolean);
}

/** The piece of a run between two distances along it. */
function sliceRun(pts, from, to) {
  const out = [];
  let run = 0;
  for (let i = 0; i + 1 < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const at = (t) => [q(a[0] + (t * (b[0] - a[0])) / (len || 1)), q(a[1] + (t * (b[1] - a[1])) / (len || 1))];
    const segFrom = Math.max(from - run, 0);
    const segTo = Math.min(to - run, len);
    if (segTo > segFrom + 1e-9) {
      const p0 = at(segFrom);
      if (!out.length || Math.hypot(out[out.length - 1][0] - p0[0], out[out.length - 1][1] - p0[1]) > 1e-9) out.push(p0);
      out.push(at(segTo));
    }
    run += len;
  }
  return out;
}

/** A run of points as the simplest object that can hold it. */
function asPolyline(victim, pts, id) {
  if (!pts || pts.length < 2) return null;
  if (pts.length === 2) return { op: 'line', id, layer: victim.layer, from: pts[0], to: pts[1] };
  return {
    op: 'polyline', id, layer: victim.layer, pts, closed: false,
  };
}

// ─── FILLET ─────────────────────────────────────────────────────────────────
//
// "Two lines + typed radius → corner arc, lines shortened to tangent points.
// Radius 0 = corner join. Reject impossible radii with a status-bar message,
// never a crash."

/**
 * @param {object} a       the first line
 * @param {object} b       the second
 * @param {number} radius  0 for a plain corner join
 * @param {string} id      the arc's id
 * @returns {{replaced:Map<string,object>, arc:object|null}|null}
 *   null when the two are parallel, when either is not a line, or when the
 *   radius will not fit the corner they make.
 */
export function filletLines(a, b, radius, id) {
  if (!a || !b || a.id === b.id) return null;
  if (a.op !== 'line' || b.op !== 'line') return null;
  const corner = lineLineIntersection(a.from, a.to, b.from, b.to);
  if (!corner) return null;                      // PARALLEL — CLAUDE.md's case

  // Each line's own far end, and the unit vector from the corner towards it.
  const farOf = (l) => (Math.hypot(l.from[0] - corner[0], l.from[1] - corner[1])
    > Math.hypot(l.to[0] - corner[0], l.to[1] - corner[1]) ? l.from : l.to);
  const dirOf = (far) => {
    const dx = far[0] - corner[0];
    const dy = far[1] - corner[1];
    const len = Math.hypot(dx, dy);
    return len < 1e-9 ? null : [dx / len, dy / len];
  };
  const farA = farOf(a);
  const farB = farOf(b);
  const dirA = dirOf(farA);
  const dirB = dirOf(farB);
  if (!dirA || !dirB) return null;

  const r = Math.abs(Number(radius) || 0);
  const replaced = new Map();
  if (r < 1e-6) {
    // RADIUS 0 — a plain corner join. Both lines run to the corner itself.
    replaced.set(a.id, { ...a, from: farA, to: [q(corner[0]), q(corner[1])] });
    replaced.set(b.id, { ...b, from: [q(corner[0]), q(corner[1])], to: farB });
    return { replaced, arc: null };
  }

  const cosTheta = Math.max(-1, Math.min(1, dirA[0] * dirB[0] + dirA[1] * dirB[1]));
  const theta = Math.acos(cosTheta);
  // Collinear either way: there is no corner to round.
  if (theta < 1e-6 || Math.abs(theta - Math.PI) < 1e-6) return null;
  const tangent = r / Math.tan(theta / 2);
  const lenA = Math.hypot(farA[0] - corner[0], farA[1] - corner[1]);
  const lenB = Math.hypot(farB[0] - corner[0], farB[1] - corner[1]);
  // AN IMPOSSIBLE RADIUS: the tangent point would fall past the far end of one
  // of the two lines, which is a fillet bigger than the corner can hold.
  if (tangent > lenA - 1e-6 || tangent > lenB - 1e-6) return null;

  const tA = [q(corner[0] + dirA[0] * tangent), q(corner[1] + dirA[1] * tangent)];
  const tB = [q(corner[0] + dirB[0] * tangent), q(corner[1] + dirB[1] * tangent)];
  // The arc's centre is along the bisector, at r / sin(θ/2) from the corner.
  const bis = [dirA[0] + dirB[0], dirA[1] + dirB[1]];
  const bisLen = Math.hypot(bis[0], bis[1]);
  if (bisLen < 1e-9) return null;
  const dist = r / Math.sin(theta / 2);
  const centre = [corner[0] + (bis[0] / bisLen) * dist, corner[1] + (bis[1] / bisLen) * dist];
  // The midpoint of the arc is on the bisector at `dist − r` from the corner —
  // and three points make an arc, which is the constructor this house already
  // has and tests.
  const mid = [corner[0] + (bis[0] / bisLen) * (dist - r), corner[1] + (bis[1] / bisLen) * (dist - r)];
  const arc = makeArc({
    id, layer: a.layer, a: tA, b: mid, c: tB,
  });
  if (!arc) return null;
  // A centre that came out somewhere else than the constructor's own is a
  // fillet nobody can cut, and it is cheaper to refuse than to draw.
  if (Math.hypot(arc.cx - centre[0], arc.cy - centre[1]) > 0.05) return null;

  replaced.set(a.id, { ...a, from: farA, to: tA });
  replaced.set(b.id, { ...b, from: tB, to: farB });
  return { replaced, arc };
}

// ─── ARRAY ──────────────────────────────────────────────────────────────────
//
// "Rectangular (rows × cols × spacing) and along-a-line (count + pitch — reuse
// the dowel-pitch pattern). Typed values, ghost preview, Enter commits."

/**
 * A rectangular array — every copy but the original, so the caller appends.
 *
 * @param {object} args
 *   objects  what is selected
 *   rows, cols, spacing
 *   ids      enough new ids for `(rows*cols − 1) × objects.length`
 */
export function arrayRect({
  objects = [], rows = 1, cols = 1, spacing = 0, ids = [],
}) {
  const R = Math.max(1, Math.trunc(Number(rows) || 0));
  const C = Math.max(1, Math.trunc(Number(cols) || 0));
  const step = Number(spacing) || 0;
  if (!objects.length || !(step > 0) || R * C <= 1) return [];
  const out = [];
  let n = 0;
  for (let r = 0; r < R; r += 1) {
    for (let c = 0; c < C; c += 1) {
      if (!r && !c) continue;                  // the original stays where it is
      for (const o of objects) {
        const id = ids[n] || `${o.id}-${r}-${c}`;
        n += 1;
        const { group: _g, ...bare } = o;
        out.push(moveObject({ ...bare, id }, c * step, r * step));
      }
    }
  }
  return out;
}

/**
 * An array ALONG A LINE — count and pitch, which is the dowel line's own
 * pattern (`engine/partEdits.js dowelPositions`) applied to whole objects
 * instead of to holes.
 */
export function arrayAlongLine({
  objects = [], from, to, count = 2, ids = [],
}) {
  const n = Math.max(2, Math.trunc(Number(count) || 0));
  if (!objects.length || !from || !to) return [];
  const dx = (to.x - from.x) / (n - 1);
  const dy = (to.y - from.y) / (n - 1);
  if (Math.hypot(dx, dy) < 1e-9) return [];
  const out = [];
  let k = 0;
  for (let i = 1; i < n; i += 1) {
    for (const o of objects) {
      const id = ids[k] || `${o.id}-${i}`;
      k += 1;
      const { group: _g, ...bare } = o;
      out.push(moveObject({ ...bare, id }, dx * i, dy * i));
    }
  }
  return out;
}
