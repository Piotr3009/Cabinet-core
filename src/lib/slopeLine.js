// ─── ONE CEILING LINE, AND ONLY ONE (turn 46, CLAUDE.md "The slope, in
// numbers") ─────────────────────────────────────────────────────────────────
//
// The owner, 24.08.2026, screenshot in hand: *"sufit się ścina, ale ściana już
// nie — nie łączy się. I mebel pozwala się na dojechanie do skosu. Przecież to
// nie ma sensu."*
//
// Two faults in one sentence, and they have ONE cause: three different places
// in this app each had their own idea of where the ceiling is. The wall mesh
// lerped its own diagonal, `wallElements.wallHeightAt` lerped a second one, and
// the unit clamp had never heard of either. CLAUDE.md's answer is a rule about
// this file rather than about the geometry:
//
//   *"`ceilingAt(x)` is THAT function — write it ONCE (`lib/slopeLine.js` or
//   beside `wallElements`), and every consumer below imports it. Two
//   independent lerps in two files is the two-chain disease and fails the
//   turn."*
//
// So this module owns the line and nothing else does. `wallElements.js`
// `wallHeightAt` is a one-line call into it (its own lerp is gone), the wall
// mesh (`3d/Room.jsx`) traces `ceilingPolyline`, the drag clamp asks
// `slopeStation`, and the engine is handed `slopeCutLine`'s two points and
// never computes a ceiling at all.
//
// ─── WHY THE ENGINE IS HANDED POINTS AND NOT THIS MODULE ────────────────────
//
// `src/engine/**` imports nothing from `src/lib/**` — the layering law this
// house has kept since turn 31 (`cabinet.js` L1466). The engine therefore takes
// the CUT as an input, exactly as it takes the plinth, the hinge standard and
// the shaker frame: `paramsForEngine` resolves it here and hands two points
// down. A bare `computeCabinet()` is handed none and cuts what the AutoLISP
// cuts, which is what makes tonight's byte-identity gate hold
// (`scripts/t46-classify.mjs`).
//
// ─── THE SCHEMA, RESTATED ONCE ──────────────────────────────────────────────
//
// A slope on wall `i` is `{ side: 'L'|'R', startHeight, run }` from
// `project.wallSlopes` (T44-F1, normalised by `lib/wallElements.js`). The
// ceiling over the wall's x axis is `room.height` until the run begins and then
// linear down to `startHeight` at the wall's end. x is millimetres from the
// wall's START corner; y is millimetres UP from the floor. That is the
// elevation `engine/drawings/wallElevation.js` publishes and the one a tape
// measure gives.
//
// Pure functions — no React, no store, no three.js.

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const round4 = (v) => Math.round(v * 1e4) / 1e4;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * The scribe gap between a cabinet and the sloped ceiling.
 *
 * The owner, 24.08: *"jak ustawimy infill 40 to 40"* — it is THE PROJECT'S
 * INFILL and not a number of this module's own. One number, the one he already
 * sets (`design.infill.sideWidth`), so a job scribed 40 at the walls is scribed
 * 40 at the ceiling and there is no second field to disagree with the first.
 */
export function slopeInfillMm(design) {
  const v = Number(design?.infill?.sideWidth);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

/**
 * The floor under a cut cabinet: how much clear carcass a unit must still have
 * at its far edge before the drag is refused.
 *
 * The owner's own number, 24.08: **minimum 400 mm**. It is a profile number so
 * a workshop can raise it, and his 400 is the answer where nobody has.
 */
export function slopeMinimumMm(profile) {
  const v = Number(profile?.checks?.slopeMinimumMm);
  return Number.isFinite(v) && v > 0 ? v : 400;
}

/** One slope, sane: the side is L or R and the two numbers fit the wall. */
function fit(slope, w, h) {
  if (!slope) return null;
  const run = clamp(num(slope.run, 0), 0, w || num(slope.run, 0));
  const startHeight = clamp(num(slope.startHeight, h), 0, h || num(slope.startHeight, 0));
  if (!(run > 0)) return null;
  return { side: slope.side === 'L' ? 'L' : 'R', run, startHeight };
}

/**
 * ─── THE FUNCTION ───────────────────────────────────────────────────────────
 *
 * How high the ceiling is over a point along a wall: full `wallHeight`
 * everywhere the slopes do not reach, and a straight line down to a slope's
 * `startHeight` at the wall's end over its own `run`.
 *
 * Two slopes on one wall (the ceiling comes down at BOTH ends) is a case the
 * T44 schema allows, so the answer is the LOWEST any of them gives — a ceiling
 * is the underside of everything above it, not the last one in the list.
 *
 * @param {number} xMm      along the wall, from its start corner
 * @param {Array}  slopes   normalised slopes of THIS wall (lib/wallElements.js)
 * @param {{wallWidth:number, wallHeight:number}} wall
 * @returns {number} mm above the floor
 */
export function ceilingAt(xMm, slopes, { wallWidth, wallHeight } = {}) {
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const x = clamp(num(xMm, 0), 0, w);
  let top = h;
  for (const raw of Array.isArray(slopes) ? slopes : []) {
    const s = fit(raw, w, h);
    if (!s) continue;
    if (s.side === 'L') {
      if (x <= s.run) top = Math.min(top, s.startHeight + ((h - s.startHeight) * x) / s.run);
    } else if (x >= w - s.run) {
      top = Math.min(top, s.startHeight + ((h - s.startHeight) * (w - x)) / s.run);
    }
  }
  return round4(top);
}

/** Is the ceiling over this stretch of wall lower than the room anywhere? */
export function isCut(slopes, { wallWidth, wallHeight, from = 0, to = null } = {}) {
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const b = to == null ? w : num(to, w);
  const pts = ceilingPolyline({ slopes, wallWidth: w, wallHeight: h, from, to: b });
  return pts.some((p) => p.y < h - 1e-6);
}

/**
 * Every x at which the line CHANGES DIRECTION over a wall — where a run
 * begins, and the wall's two ends.
 *
 * A polyline drawn from samples would round the knee off; a polyline drawn from
 * the knees is exact at every vertex and needs three points for the commonest
 * wall in the world. The wall mesh, the ghost line and the elevation all take
 * their vertices from here, which is what stops any of them inventing a fourth
 * shape for the same ceiling.
 */
export function slopeBreakXs(slopes, { wallWidth } = {}) {
  const w = Math.max(0, num(wallWidth, 0));
  const xs = new Set([0, w]);
  for (const raw of Array.isArray(slopes) ? slopes : []) {
    const s = fit(raw, w, Infinity);
    if (!s) continue;
    xs.add(s.side === 'L' ? s.run : round4(w - s.run));
  }
  return [...xs].filter((x) => x >= 0 && x <= w).sort((a, b) => a - b);
}

/**
 * The ceiling over a stretch of wall, as a polyline — `[{x, y}, …]`, left to
 * right, with a vertex at every knee inside the stretch and at both ends.
 *
 * `from`/`to` are along the WALL (not the stretch), which is what lets a STUB
 * ask for its own fragment of its wall's line (F1) with no second arithmetic.
 */
export function ceilingPolyline({
  slopes, wallWidth, wallHeight, from = 0, to = null,
} = {}) {
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const a = clamp(num(from, 0), 0, w);
  const b = clamp(to == null ? w : num(to, w), 0, w);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const xs = [lo, ...slopeBreakXs(slopes, { wallWidth: w }).filter((x) => x > lo && x < hi), hi];
  return xs.map((x) => ({ x: round4(x), y: ceilingAt(x, slopes, { wallWidth: w, wallHeight: h }) }));
}
