// ─── THE PENCIL LEARNS TO DRAW (turn 24, CLAUDE.md F2) ──────────────────────
//
// The owner vetoed turn 23's part-editor interaction outright — four buttons
// and four number fields is a FORM, and a joiner marking out a board does not
// fill in a form. The replacement was drawn for him and approved before this
// turn was written, and F2 is that mock transcribed. This module is its
// arithmetic.
//
// ─── IT SPEAKS AUTOCAD, BECAUSE HE DOES ────────────────────────────────────
//
// The ruler already speaks object snap (`lib/rulerSnaps.js`, turn 20) — in 3-D,
// on boxes, in the room. This is the same language on ONE PART's 2-D print, and
// it is a separate module for the same reason the ruler's is: the question is
// different. A drawing has an OUTLINE with corners and edges, machinings with
// centres and quadrants, and lines with midpoints. A box has none of that.
//
// The eight kinds F2.3 asks for, with the marker each carries:
//
//   END        ■  square          the outline's corners
//   MID        △  triangle        the midpoint of every edge, of every mark
//   CEN        ○  circle          the centre of a hole or a pocket
//   Node       ⊙  small circle    a feature's insertion point
//   Quadrant   ◇  diamond         N/E/S/W of a circular feature
//   INT        ✕  cross           where two lines of the drawing cross
//   PER        ⊾  right angle     the foot of the perpendicular from the cursor
//   NEA        ⧗  hourglass       the nearest point on a line, anywhere along it
//
// PRIORITY ON CONFLICT, verbatim from CLAUDE.md F2.3:
//
//     CEN/END  >  MID  >  INT  >  PER  >  NEA
//
// with Node and Quadrant sitting where a joiner expects them — a Node IS an
// insertion point and reads as an END-class certainty, a Quadrant is a point on
// a circle and reads with MID. The order is a LIST below so it can be read
// rather than inferred.
//
// Extension, Tangent, Parallel, Apparent Intersection, Insertion and Geometric
// Centre are NOT in this turn. CLAUDE.md names them and this module does not
// pretend to have them.
//
// Pure functions and pure data. No React, no store, no SVG, no three.js — the
// component projects and picks, this decides WHAT there is to pick.

/** The eight kinds, in the order the checkbox panel lists them (F2.3). */
export const SNAP_KINDS = [
  { id: 'END', label: 'Endpoint', marker: 'square' },
  { id: 'MID', label: 'Midpoint', marker: 'triangle' },
  { id: 'CEN', label: 'Centre', marker: 'circle' },
  { id: 'NODE', label: 'Node', marker: 'node' },
  { id: 'QUAD', label: 'Quadrant', marker: 'diamond' },
  { id: 'INT', label: 'Intersection', marker: 'cross' },
  { id: 'PER', label: 'Perpendicular', marker: 'perp' },
  { id: 'NEA', label: 'Nearest', marker: 'hourglass' },
];

/**
 * WHICH BEATS WHICH (F2.3).
 *
 * `CEN/END > MID > INT > PER > NEA`, and the two kinds CLAUDE.md's chain does
 * not name are placed where AutoCAD places them: a NODE is an insertion point
 * and is as definite as an endpoint; a QUADRANT is a point ON a circle, like a
 * midpoint is a point on a line.
 */
export const SNAP_PRIORITY = ['CEN', 'END', 'NODE', 'MID', 'QUAD', 'INT', 'PER', 'NEA'];

const RANK = new Map(SNAP_PRIORITY.map((k, i) => [k, i]));

/** Every kind on, which is what a joiner who has never opened the panel gets. */
export const ALL_SNAPS_ON = Object.fromEntries(SNAP_KINDS.map((k) => [k.id, true]));

/** Two points are the same point within this many mm. */
const SAME = 0.02;

const finite = (v) => Number.isFinite(Number(v));

/**
 * The DRAWING, as the geometry a snap can be taken on.
 *
 * @param {object} drawing  `engine/drawings/partDetail.js` output
 * @returns {{segments:Array, circles:Array, boxes:Array}}
 *   `segments` are [ [x1,y1], [x2,y2] ] — the outline's edges and every mark;
 *   `circles` are { x, y, r } — every hole;
 *   `boxes` are { x, y, w, h } — every pocket.
 */
export function snapGeometry(drawing) {
  const segments = [];
  const circles = [];
  const boxes = [];

  const outline = drawing?.outline || [];
  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    if (finite(a?.[0]) && finite(b?.[0])) segments.push([[a[0], a[1]], [b[0], b[1]]]);
  }

  for (const m of drawing?.machinings || []) {
    if (m.kind === 'pocket') {
      boxes.push({
        x: m.x, y: m.y, w: m.w, h: m.h, id: m.id,
      });
      const corners = [[m.x, m.y], [m.x + m.w, m.y], [m.x + m.w, m.y + m.h], [m.x, m.y + m.h]];
      for (let i = 0; i < 4; i += 1) segments.push([corners[i], corners[(i + 1) % 4]]);
      continue;
    }
    if (m.kind === 'mark') {
      segments.push([[m.from[0], m.from[1]], [m.to[0], m.to[1]]]);
      continue;
    }
    circles.push({
      x: m.x, y: m.y, r: Math.max(Number(m.d) / 2, 0), id: m.id,
    });
  }
  return { segments, circles, boxes };
}

/**
 * Every point a joiner could mean, over one drawing.
 *
 * The cursor is passed in because three of the eight kinds are ABOUT the
 * cursor: PER is the foot of a perpendicular from it, NEA is the nearest point
 * on a line to it, and neither exists as a fixed feature of the drawing. That
 * is AutoCAD's own model, not a shortcut.
 *
 * @param {object} args
 *   geometry  `snapGeometry()` output
 *   cursor    { x, y } in the part's own millimetres
 *   enabled   { [kind]: boolean } — the checkbox panel (F2.3)
 * @returns {Array<{kind:string, x:number, y:number, of:string|null}>}
 */
export function snapCandidates({ geometry, cursor, enabled = ALL_SNAPS_ON }) {
  const out = [];
  const on = (kind) => enabled?.[kind] !== false;
  const push = (kind, x, y, of = null) => {
    if (!on(kind) || !finite(x) || !finite(y)) return;
    out.push({ kind, x, y, of });
  };

  const { segments = [], circles = [], boxes = [] } = geometry || {};

  // ── END and MID, on every straight line of the drawing ──
  for (const [a, b] of segments) {
    push('END', a[0], a[1]);
    push('END', b[0], b[1]);
    push('MID', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }

  // ── CEN, NODE and QUAD, on every round feature ──
  for (const c of circles) {
    push('CEN', c.x, c.y, c.id);
    // A NODE is the feature's INSERTION point — for a drilled hole that is its
    // own centre, which is where a joiner puts his bradawl. It is a separate
    // kind because a joiner turning `Node` off wants the centres of holes and
    // not the centres of pockets, and the reverse.
    push('NODE', c.x, c.y, c.id);
    if (c.r > SAME) {
      push('QUAD', c.x + c.r, c.y, c.id);
      push('QUAD', c.x - c.r, c.y, c.id);
      push('QUAD', c.x, c.y + c.r, c.id);
      push('QUAD', c.x, c.y - c.r, c.id);
    }
  }
  // …and a POCKET's centre is a CEN too: it is the middle of a machined hole,
  // whatever shape the hole is.
  for (const b of boxes) push('CEN', b.x + b.w / 2, b.y + b.h / 2, b.id);

  // ── INT, where two lines of the drawing cross ──
  if (on('INT')) {
    for (let i = 0; i < segments.length; i += 1) {
      for (let j = i + 1; j < segments.length; j += 1) {
        const p = segmentIntersection(segments[i], segments[j]);
        if (p) push('INT', p[0], p[1]);
      }
    }
  }

  // ── PER and NEA, which are about the CURSOR ──
  if (cursor && (on('PER') || on('NEA'))) {
    for (const [a, b] of segments) {
      const foot = footOfPerpendicular(cursor, a, b);
      if (!foot) continue;
      // Inside the segment it is a PERPENDICULAR; the nearest point on the
      // line, clamped to its ends, is NEAREST. On an interior point the two
      // coincide and the priority list settles it.
      if (foot.within) push('PER', foot.x, foot.y);
      push('NEA', foot.clampedX, foot.clampedY);
    }
  }

  return out;
}

/**
 * The one the cursor has caught, or null.
 *
 * @param {object} args
 *   candidates  `snapCandidates()` output
 *   cursor      { x, y }
 *   magnetMm    the aperture, in the PART's own millimetres (F2.3: one number
 *               in profile.js, the sheet-space equivalent of ~5 mm)
 * @returns {{kind, x, y, of, distance}|null}
 */
export function resolveSnap({ candidates = [], cursor, magnetMm = 5 }) {
  if (!cursor) return null;
  let best = null;
  for (const c of candidates) {
    const d = Math.hypot(c.x - cursor.x, c.y - cursor.y);
    if (d > magnetMm) continue;
    if (!best) { best = { ...c, distance: d }; continue; }
    // ─── THE CONFLICT RULE (F2.3) ───
    // AutoCAD's, and CLAUDE.md's: the higher-priority KIND wins the pixel, and
    // only where two candidates are the same kind does the nearer one win. A
    // corner and a nearest-point under one aperture is a corner, every time —
    // which is the whole reason a joiner trusts the marker.
    const better = RANK.get(c.kind) < RANK.get(best.kind)
      || (c.kind === best.kind && d < best.distance);
    if (better) best = { ...c, distance: d };
  }
  return best;
}

/** Everything at once: geometry in, the caught point out. */
export function snapAt({
  drawing, cursor, enabled = ALL_SNAPS_ON, magnetMm = 5, geometry = null,
}) {
  const geom = geometry || snapGeometry(drawing);
  return resolveSnap({
    candidates: snapCandidates({ geometry: geom, cursor, enabled }),
    cursor,
    magnetMm,
  });
}

// ─── THE NUMBER IS AN IN-FLIGHT OVERRIDE (F2.5) ────────────────────────────
//
// "With a tool armed, typing digits opens a small floating input at the cursor;
// Enter places the point AT that distance along the currently snapped axis from
// the reference edge. SketchUp's grammar."
//
// Two facts make that work, and both are here rather than in the component:
//
//   THE AXIS. Which way the number runs. It is the axis the cursor is CLOSER
//   to being on relative to the reference — a joiner who has moved his hand to
//   the right and typed 37 means 37 across, not 37 up.
//   THE REFERENCE EDGE. What the number is measured FROM: the nearest edge of
//   the part on that axis, which is where a tape hooks.

/**
 * Which edge of the part a typed number is measured from, and which way.
 *
 * @param {object} args
 *   from      { x, y } — the point the gesture started at (the cursor, or the
 *             first click of a two-click tool)
 *   size      { w, h } — the part as the sheet lays it
 *   axis      'x' | 'y' | null — forced, or decided from `from` vs `size`
 * @returns {{axis:'x'|'y', origin:number, direction:1|-1, edge:string}}
 */
export function numericReference({ from, size, axis = null }) {
  const w = Number(size?.w) || 0;
  const h = Number(size?.h) || 0;
  const x = Number(from?.x) || 0;
  const y = Number(from?.y) || 0;
  const useAxis = axis === 'x' || axis === 'y'
    ? axis
    // Nothing said: the axis the cursor has travelled FURTHEST along from the
    // part's near corner is the one the number is about. It is the same
    // judgement SketchUp makes and it is the one a hand makes without thinking.
    : (Math.min(x, w - x) <= Math.min(y, h - y) ? 'x' : 'y');

  if (useAxis === 'x') {
    const fromLeft = x <= w - x;
    return {
      axis: 'x', origin: fromLeft ? 0 : w, direction: fromLeft ? 1 : -1, edge: fromLeft ? 'left' : 'right',
    };
  }
  const fromBottom = y <= h - y;
  return {
    axis: 'y', origin: fromBottom ? 0 : h, direction: fromBottom ? 1 : -1, edge: fromBottom ? 'bottom' : 'top',
  };
}

/**
 * WHERE a typed number puts the point (F2.5).
 *
 * @param {object} args
 *   at        { x, y } — where the cursor is, which supplies the OTHER axis
 *   value     the number typed
 *   size      { w, h }
 *   axis      'x' | 'y' | null
 *   second    an optional second number, for the other axis (F2.5's Tab)
 * @returns {{x:number, y:number, axis:string, edge:string}|null}
 */
export function placeByNumber({
  at, value, size, axis = null, second = null,
}) {
  // `Number(null)` is 0 and `Number('')` is 0, and neither is a number anybody
  // typed — placing a point at the edge because a field was empty is exactly
  // the class of bug rule 13 is about.
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const ref = numericReference({ from: at, size, axis });
  const put = { x: Number(at?.x) || 0, y: Number(at?.y) || 0 };
  put[ref.axis] = ref.origin + ref.direction * n;

  if (second !== null && second !== undefined && Number.isFinite(Number(second))) {
    // Tab, or a second number: the OTHER axis, measured from its own near edge.
    const other = numericReference({ from: at, size, axis: ref.axis === 'x' ? 'y' : 'x' });
    put[other.axis] = other.origin + other.direction * Number(second);
  }
  return { ...put, axis: ref.axis, edge: ref.edge };
}

// ─── LIVE DIMENSIONS WHILE DRAWING (F2.4) ──────────────────────────────────

/**
 * The measurements the cursor carries: HORIZONTAL and VERTICAL ONLY.
 *
 * "Thin blue arrows from the cursor to the nearest edges/features — HORIZONTAL
 * and VERTICAL ONLY, never diagonal." So a point is measured to the near edge
 * on each axis, and to the nearest FEATURE that shares a line with it — which
 * is the number a joiner checks a pattern by, and is a horizontal or a vertical
 * or it is not drawn at all.
 *
 * @param {object} args
 *   at        { x, y }
 *   size      { w, h }
 *   features  [{ id, x, y }] — the machinings' centres
 *   alignMm   how near two features have to be to share a line
 * @returns {Array<{key:string, from:number[], to:number[], offset:number}>}
 *   the same row shape `engine/dimensionArrows.js dimensionSet` consumes, so
 *   the drawing tools and turn 23's hover arrows are ONE renderer.
 */
export function drawingDimensionRows({
  at, size, features = [], alignMm = 0.5,
}) {
  const x = Number(at?.x);
  const y = Number(at?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  const w = Number(size?.w) || 0;
  const h = Number(size?.h) || 0;

  const rows = [];
  const leftIsNearer = x <= w - x;
  rows.push({
    key: 'x', from: [leftIsNearer ? 0 : w, y], to: [x, y], offset: 0,
  });
  const bottomIsNearer = y <= h - y;
  rows.push({
    key: 'y', from: [x, bottomIsNearer ? 0 : h], to: [x, y], offset: 0,
  });

  // …and the nearest feature ON THE SAME LINE, in each direction. A diagonal
  // to the nearest hole would be a number nobody can cut to.
  const near = (axis) => {
    let best = null;
    for (const f of features) {
      const fx = Number(f.x);
      const fy = Number(f.y);
      if (!Number.isFinite(fx) || !Number.isFinite(fy)) continue;
      const aligned = axis === 'x' ? Math.abs(fy - y) <= alignMm : Math.abs(fx - x) <= alignMm;
      if (!aligned) continue;
      const d = axis === 'x' ? Math.abs(fx - x) : Math.abs(fy - y);
      if (d <= alignMm) continue;                 // it IS the point
      if (!best || d < best.d) best = { f, d };
    }
    return best;
  };
  const alongX = near('x');
  if (alongX) {
    rows.push({
      key: `nx:${alongX.f.id}`, from: [x, y], to: [Number(alongX.f.x), y], offset: 0,
    });
  }
  const alongY = near('y');
  if (alongY) {
    rows.push({
      key: `ny:${alongY.f.id}`, from: [x, y], to: [x, Number(alongY.f.y)], offset: 0,
    });
  }
  return rows;
}

// ─── the small geometry ────────────────────────────────────────────────────

/** Where two SEGMENTS cross, or null — never where they merely would if extended. */
export function segmentIntersection([a, b], [c, d]) {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const denom = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denom) < 1e-12) return null;             // parallel or collinear
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / denom;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}

/**
 * The foot of the perpendicular from a point to a line, and the nearest point
 * on the SEGMENT — which are the same thing except past its ends.
 */
export function footOfPerpendicular(p, a, b) {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const len2 = rx * rx + ry * ry;
  if (len2 < 1e-12) return null;
  const t = ((Number(p.x) - a[0]) * rx + (Number(p.y) - a[1]) * ry) / len2;
  const clamped = Math.max(0, Math.min(1, t));
  return {
    x: a[0] + t * rx,
    y: a[1] + t * ry,
    clampedX: a[0] + clamped * rx,
    clampedY: a[1] + clamped * ry,
    within: t >= 0 && t <= 1,
  };
}
