// ─── THE POINTS A JOINER MEANS (turn 20, CLAUDE.md F6) ──────────────────────
//
// Owner: "the tape grabs wherever the ray lands. It must catch the points a
// joiner means — corner, end, middle, the meeting of two parts — show that it
// caught one, and only then measure."
//
// That is AutoCAD's object snap, which is his home ground, so this uses
// AutoCAD's own three answers and its own vocabulary:
//
//   END   the eight corners of a panel. A board is a box; its corners are where
//         a tape hooks.
//   MID   the midpoints of its twelve edges. "Halfway along the front edge of
//         the shelf" is a measurement a joiner takes every day.
//   INT   where two panels MEET. Not a mathematical curiosity: the inside
//         corner of a carcass is the point you measure an opening from, and it
//         belongs to neither board on its own.
//
// ─── WHY IT IS A LIB MODULE ────────────────────────────────────────────────
// Pure arithmetic on axis-aligned boxes: no three.js, no React, no camera. The
// component projects and picks; this decides WHAT there is to pick. That split
// is what lets a node test assert the whole of F6.1 on a two-panel fixture
// without a browser, which is the same bargain engine/explode.js struck in
// turn 12.
//
// Coordinates are millimetres in whatever frame the caller hands over — the
// ROOM's, for the ruler, because a joiner measuring a run is measuring across
// cabinets.

/** The three kinds, in AutoCAD's own priority order: END beats MID beats INT. */
export const SNAP_KINDS = ['END', 'MID', 'INT'];

const PRIORITY = new Map(SNAP_KINDS.map((k, i) => [k, i]));

/** Two points are the same point within this many mm. */
const SAME = 0.05;

/**
 * Every point the tape may catch, over a set of boxes.
 *
 * @param {Array} boxes  [{ id, min:[x,y,z], max:[x,y,z] }] — world mm
 * @param {object} opts
 *   contactMm  how close two boxes have to be to count as touching
 * @returns {Array<{kind:string, p:[number,number,number], of:string[]}>}
 */
export function snapTargets(boxes = [], { contactMm = 0.5 } = {}) {
  const out = [];
  for (const box of boxes) {
    if (!valid(box)) continue;
    for (const p of boxCorners(box)) out.push({ kind: 'END', p, of: [box.id] });
    for (const p of boxEdgeMidpoints(box)) out.push({ kind: 'MID', p, of: [box.id] });
  }
  for (const [a, b] of pairs(boxes)) {
    for (const p of contactPoints(a, b, contactMm)) out.push({ kind: 'INT', p, of: [a.id, b.id] });
  }
  return dedupe(out);
}

/** The 8 corners of a box, in a stable order. */
export function boxCorners(box) {
  const out = [];
  for (const x of [box.min[0], box.max[0]]) {
    for (const y of [box.min[1], box.max[1]]) {
      for (const z of [box.min[2], box.max[2]]) out.push([x, y, z]);
    }
  }
  return out;
}

/**
 * The midpoints of the 12 edges of a box.
 *
 * An edge runs along ONE axis and is pinned at a min or a max on the other two:
 * 3 axes × 4 combinations = 12, which is the count F6.1 asks for and is worth
 * generating rather than listing so it cannot be mistyped.
 */
export function boxEdgeMidpoints(box) {
  const mid = [0, 1, 2].map((i) => (box.min[i] + box.max[i]) / 2);
  const out = [];
  for (let axis = 0; axis < 3; axis += 1) {
    const [u, v] = [0, 1, 2].filter((i) => i !== axis);
    for (const uu of [box.min[u], box.max[u]]) {
      for (const vv of [box.min[v], box.max[v]]) {
        const p = [0, 0, 0];
        p[axis] = mid[axis];
        p[u] = uu;
        p[v] = vv;
        out.push(p);
      }
    }
  }
  return out;
}

/**
 * Where two boxes MEET: the shared edge's midpoint and its two ends.
 *
 * The overlap of two axis-aligned boxes is itself a box, and where they merely
 * touch it is flat on one axis (a side panel and a bottom share a rectangle) or
 * flat on two (two boards meeting along a line). The SHARED EDGE is that
 * overlap's longest axis, taken through the middle of the other two — which is
 * the line a joiner would put a pencil along, and the point at the centre of it
 * is the inside corner of the carcass.
 *
 * `contactMm` lets boards that are drawn a hair apart, or that overlap by the
 * width of a rounding error, still count as touching: a joint is a joint.
 *
 * @returns {Array<[number,number,number]>} 0 or 3 points
 */
export function contactPoints(a, b, contactMm = 0.5) {
  if (!valid(a) || !valid(b)) return [];
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  for (let i = 0; i < 3; i += 1) {
    lo[i] = Math.max(a.min[i], b.min[i]);
    hi[i] = Math.min(a.max[i], b.max[i]);
    // Apart by more than the tolerance on ANY axis and the two never meet.
    if (lo[i] - hi[i] > contactMm) return [];
    if (hi[i] < lo[i]) {
      // Touching across a hair of daylight: the contact is the plane between.
      const mid = (lo[i] + hi[i]) / 2;
      lo[i] = mid;
      hi[i] = mid;
    }
  }
  const spans = [0, 1, 2].map((i) => hi[i] - lo[i]);
  const along = spans.indexOf(Math.max(...spans));
  // Two boards that share only a corner have no edge to put a pencil along —
  // and that corner is already an END on both of them.
  if (spans[along] <= SAME) return [];
  const centre = [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2);
  const at = (value) => centre.map((c, i) => (i === along ? value : c));
  return [at(centre[along]), at(lo[along]), at(hi[along])];
}

/**
 * The target nearest the cursor, in SCREEN space, or null.
 *
 * The magnet is measured in PIXELS (F6.2) — `profile.editor.ruler.snapPx` —
 * because a magnet measured in millimetres is unusable zoomed out and
 * hair-trigger zoomed in. AutoCAD's aperture is in pixels for the same reason.
 *
 * @param {Array} targets  from `snapTargets`
 * @param {function} project  ([x,y,z]) → { x, y, behind } in client px
 * @param {{x:number,y:number}} cursor
 * @param {number} maxPx
 */
export function nearestSnap(targets = [], project, cursor, maxPx = 12) {
  let best = null;
  let bestD = Infinity;
  for (const target of targets) {
    const at = project(target.p);
    if (!at || at.behind) continue;
    const d = Math.hypot(at.x - cursor.x, at.y - cursor.y);
    if (d > maxPx) continue;
    // A tie goes to the higher-priority kind, which is how AutoCAD breaks one:
    // a corner and a midpoint under the same pixel is a corner.
    const better = d < bestD - 0.5
      || (Math.abs(d - bestD) <= 0.5 && best && PRIORITY.get(target.kind) < PRIORITY.get(best.kind));
    if (better) { best = { ...target, screen: at, distancePx: d }; bestD = Math.min(bestD, d); }
  }
  return best;
}

function valid(box) {
  return Boolean(box) && Array.isArray(box.min) && Array.isArray(box.max)
    && box.min.every(Number.isFinite) && box.max.every(Number.isFinite);
}

function* pairs(list) {
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      if (valid(list[i]) && valid(list[j])) yield [list[i], list[j]];
    }
  }
}

/**
 * One target per point. Two boards that butt share four corners, and a tape
 * that offered the same pixel three times would be a tape that hesitated.
 * The highest-priority kind wins the point and the others' panel ids join it,
 * so the marker can still say what it is on.
 */
function dedupe(targets) {
  const by = new Map();
  const key = (p) => p.map((v) => Math.round(v / SAME)).join(',');
  for (const t of targets) {
    const k = key(t.p);
    const seen = by.get(k);
    if (!seen) { by.set(k, { ...t, of: [...t.of] }); continue; }
    for (const id of t.of) if (!seen.of.includes(id)) seen.of.push(id);
    if (PRIORITY.get(t.kind) < PRIORITY.get(seen.kind)) seen.kind = t.kind;
  }
  return [...by.values()];
}
