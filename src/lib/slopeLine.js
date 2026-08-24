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

// ─── F2/F3: THE LINE A CABINET IS CUT ON ────────────────────────────────────
//
// The engine's frame is the UNIT's: x from 0 at the unit's left edge to its
// width, y UP FROM THE CARCASS FLOOR — which is `floorY` above the room's
// floor (the legs, or a wall unit's mount height). So the cut handed down is
// the ceiling line, minus the project's infill, minus `floorY`.
//
// TWO POINTS, per CLAUDE.md F3, and the reason a knee inside the unit does not
// need a third: a straight line between the two edge values is BELOW the true
// ceiling everywhere the true line has a knee, so a cabinet cut to it clears
// the ceiling by construction. It is the conservative reading, which is the
// only safe one when the alternative is a carcass 30 mm into the plaster.

/**
 * The slope cut for a unit standing at `x` on this wall, or NULL when the unit
 * stands entirely under a full-height ceiling.
 *
 * NULL is the gate. `paramsForEngine` omits the key entirely for a null, so a
 * unit away from the slope hands the engine exactly the params it handed
 * yesterday and `computeCabinet` is byte-identical (iron rule 2).
 *
 * @param {object} args
 *   slopes      normalised slopes of the unit's wall
 *   wallWidth   mm
 *   wallHeight  mm — the room height
 *   x           the unit's left edge along the wall
 *   width       the unit's width
 *   infill      the project's infill — the scribe gap (owner, 24.08)
 *   floorY      how far the carcass floor stands above the room floor
 * @returns {{axis:'width', x0:number, y0:number, x1:number, y1:number,
 *            infill:number, low:'L'|'R'}|null}
 */
export function slopeCutLine({
  slopes, wallWidth, wallHeight, x = 0, width = 0, infill = 0, floorY = 0,
} = {}) {
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const uw = Math.max(0, num(width, 0));
  const left = num(x, 0);
  const gap = Math.max(0, num(infill, 0));
  const base = Math.max(0, num(floorY, 0));
  if (!(uw > 0) || !(h > 0)) return null;
  const yL = ceilingAt(left, slopes, { wallWidth: w, wallHeight: h });
  const yR = ceilingAt(left + uw, slopes, { wallWidth: w, wallHeight: h });
  // Neither edge is under a slope AND no knee between them dips — the unit is
  // under a flat ceiling and there is no cut at all. `isCut` over the unit's
  // own span answers the middle case (a unit straddling a ridge).
  if (!isCut(slopes, { wallWidth: w, wallHeight: h, from: left, to: left + uw })) return null;
  return {
    axis: 'width',
    x0: 0,
    y0: round4(yL - gap - base),
    x1: round4(uw),
    y1: round4(yR - gap - base),
    infill: round4(gap),
    low: yR <= yL ? 'R' : 'L',
  };
}

/** The clear carcass height the cut leaves at a point along the unit. */
export function cutHeightAt(cut, xMm) {
  if (!cut) return Infinity;
  const span = num(cut.x1, 0) - num(cut.x0, 0);
  if (!(Math.abs(span) > 1e-9)) return round4(num(cut.y0, 0));
  const t = (num(xMm, 0) - num(cut.x0, 0)) / span;
  return round4(num(cut.y0, 0) + (num(cut.y1, 0) - num(cut.y0, 0)) * t);
}

/** Which end of a cut unit is the LOW one, and which keeps its height. */
export function cutEnds(cut) {
  if (!cut) return null;
  const y0 = num(cut.y0, 0);
  const y1 = num(cut.y1, 0);
  return {
    low: y1 <= y0 ? 'R' : 'L',
    tall: y1 <= y0 ? 'L' : 'R',
    lowY: round4(Math.min(y0, y1)),
    tallY: round4(Math.max(y0, y1)),
  };
}

// ─── F2: THE ARRIVAL LAW ────────────────────────────────────────────────────
//
// *"the unit MAY enter the slope zone (that is the point of this turn) down to
// the station where `ceilingAt(far edge) − infill ≥ 400 + legs`. Past that:
// hard stop."*
//
// FAR EDGE is the unit's edge that is deeper into the slope — the right edge
// under a slope on the R, the left edge under one on the L. The station is
// therefore a bound on the unit's own x, and it is solved rather than searched:
// on a straight run the inequality is linear in x, so the answer is exact and a
// 1 mm drag cannot step over it.

/**
 * The stretch of wall a unit of this width may stand on, given the slopes.
 *
 * @returns {{min:number, max:number}} the unit's own x, clamped to the wall.
 *   `min > max` never comes back — a wall with no legal station answers with
 *   the flat part it does have, and the Check (#19) is what says the unit does
 *   not fit under this slope at all.
 */
export function slopeStation({
  slopes, wallWidth, wallHeight, width, infill = 0, floorY = 0, minimum = 400,
} = {}) {
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const uw = Math.max(0, num(width, 0));
  const need = Math.max(0, num(minimum, 0)) + Math.max(0, num(floorY, 0))
    + Math.max(0, num(infill, 0));
  let min = 0;
  let max = Math.max(0, w - uw);
  for (const raw of Array.isArray(slopes) ? slopes : []) {
    const s = fit(raw, w, h);
    if (!s) continue;
    // Where the ceiling itself reaches `need`. Below `startHeight` the whole
    // slope zone is out of bounds; above `h` the slope never bites.
    if (need <= s.startHeight) continue;
    if (need >= h) {
      // Not even the flat ceiling is high enough — nothing this module can do
      // about that, and #19 reports it. Leave the wall as it is.
      continue;
    }
    // On side R the ceiling at x is startHeight + (h − startHeight)·(w − x)/run.
    // Solving for `need` gives the x past which the ceiling is too low:
    const drop = h - s.startHeight;
    const reach = (s.run * (need - s.startHeight)) / drop;   // distance from the wall END
    if (s.side === 'R') {
      // The far edge is the unit's RIGHT edge: x + uw ≤ w − reach.
      max = Math.min(max, round4(w - reach - uw));
    } else {
      // Mirrored: the far edge is the unit's LEFT edge, x ≥ reach.
      min = Math.max(min, round4(reach));
    }
  }
  min = clamp(min, 0, Math.max(0, w - uw));
  max = clamp(max, 0, Math.max(0, w - uw));
  if (max < min) max = min;
  return { min: round4(min), max: round4(max) };
}

/**
 * How far UNDER the minimum a unit standing here is — 0 when it is legal.
 *
 * The Check (#19) reports this number, and the clamp above is what normally
 * stops it ever being non-zero. A clamp with no witness is a clamp nobody finds
 * out has stopped working (the house grammar, T37-F5c), and a unit can arrive
 * here by a path that does not drag: a typed x, a room resized under it, a
 * slope edited over its head.
 */
export function slopeShortfallMm({
  slopes, wallWidth, wallHeight, x = 0, width = 0, infill = 0, floorY = 0, minimum = 400,
} = {}) {
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const uw = Math.max(0, num(width, 0));
  const left = num(x, 0);
  const gap = Math.max(0, num(infill, 0));
  const base = Math.max(0, num(floorY, 0));
  const need = Math.max(0, num(minimum, 0));
  if (!(uw > 0) || !(h > 0)) return 0;
  const clear = Math.min(
    ceilingAt(left, slopes, { wallWidth: w, wallHeight: h }),
    ceilingAt(left + uw, slopes, { wallWidth: w, wallHeight: h }),
  ) - gap - base;
  return clear >= need ? 0 : round4(need - clear);
}
