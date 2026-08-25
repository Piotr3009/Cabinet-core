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
// `slopeStation`, and the engine is handed `slopeCutLine`'s POINTS and never
// computes a ceiling at all. T47 made that a POLYLINE — `ceilingPolyline`'s
// own vertices, knees and all — and the sentence is unchanged: one function
// answers where the ceiling is, and everything else asks it.
//
// ─── WHY THE ENGINE IS HANDED POINTS AND NOT THIS MODULE ────────────────────
//
// `src/engine/**` imports nothing from `src/lib/**` — the layering law this
// house has kept since turn 31 (`cabinet.js` L1466). The engine therefore takes
// the CUT as an input, exactly as it takes the plinth, the hinge standard and
// the shaker frame: `paramsForEngine` resolves it here and hands two points
// down. A bare `computeCabinet()` is handed none and cuts what the AutoLISP
// cuts, which is what makes the byte-identity gate hold
// (`scripts/t46-classify.mjs`, and T47's `scripts/t47-classify.mjs`).
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
// ─── TURN 47 (CLAUDE.md F1): AND IT IS A POLYLINE ───────────────────────────
//
// The owner, the morning after T46, screenshot in hand:
//
//   *"jak sie konczy skos to powinno sie zalamywac kat tam gdzie sie zalamuje a
//   nie od konca do konca szafy… w tym przypadku powinno byc czesc prosta i od
//   momentu zalamania skos taki sam jak reszta skosu, nie moze byc od konca do
//   konca szafy bo nie mamy ten sam skos i to nie zadziala."*
//
// T46 sampled the ceiling at the unit's two edges and handed the engine a
// STRAIGHT LINE between them. It defended that as "the conservative reading —
// below the true ceiling everywhere the true line has a knee, so the cabinet
// clears the plaster by construction". The defence is true about the CLEARANCE
// and false about the CUT: a board bevelled to a line the wall does not have
// meets the plaster at an angle, and the joiner has a gap he cannot close. It
// is a production defect, and the owner named it as one.
//
// So the cut is the CEILING'S OWN POLYLINE, and there is nothing to invent:
// `ceilingPolyline` (above, T46's own) already puts a vertex at every knee.
// The three subtractions T46 made to two ends are made to EVERY vertex.
//
// TWO SLOPES IN ONE UNIT fall out for free — a wall with an L slope and an R
// slope gives a line that descends, runs flat, and descends again. There is no
// second code path, because there was never a first one: it is the same
// `ceilingAt`, sampled at the same knees.
//
// A UNIT UNDER ONE STRAIGHT RUN yields TWO points, and its geometry is
// unchanged from T46 vertex for vertex. That is the safety net for the whole
// rewrite and `test/turn47-f1-the-line-bends.test.js` asserts it.

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
 * @returns {{axis:'width', pts:Array<{x:number,y:number}>, infill:number,
 *            low:'L'|'R'}|null}
 *   `pts` is UNIT-LOCAL: x from 0 at the unit's left edge, y clear millimetres
 *   above the carcass floor, left to right, a vertex at every knee, always at
 *   least two.
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
  // Neither edge is under a slope AND no knee between them dips — the unit is
  // under a flat ceiling and there is no cut at all. `isCut` over the unit's
  // own span answers the middle case (a unit straddling a ridge).
  if (!isCut(slopes, { wallWidth: w, wallHeight: h, from: left, to: left + uw })) return null;
  // ONE call, and it is the one that already knows where the knees are. Every
  // vertex takes the same three subtractions T46 made to its two ends: into the
  // unit's frame, less the scribe gap, less the carcass floor.
  const line = ceilingPolyline({
    slopes, wallWidth: w, wallHeight: h, from: left, to: left + uw,
  });
  const pts = line.map((p) => ({ x: round4(p.x - left), y: round4(p.y - gap - base) }));
  if (pts.length < 2) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  return {
    axis: 'width',
    pts,
    infill: round4(gap),
    low: last.y <= first.y ? 'R' : 'L',
  };
}

/**
 * The line of a cut, normalised — `[{x, y}, …]`, left to right, at least two.
 *
 * A cut carrying `pts` answers with them. A cut carrying T46's `{y0, y1}` pair
 * answers with the two vertices that pair always WAS, which is what keeps every
 * fixture, every saved project and the whole T46 suite reading straight: the
 * straight run is not a special case of the polyline, it is a polyline of two
 * points.
 */
export function cutPoints(cut) {
  if (!cut) return null;
  if (Array.isArray(cut.pts)) {
    const pts = cut.pts
      .map((p) => ({ x: num(p?.x, NaN), y: num(p?.y, NaN) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .sort((a, b) => a.x - b.x);
    return pts.length >= 2 ? pts : null;
  }
  const y0 = num(cut.y0, NaN);
  const y1 = num(cut.y1, NaN);
  if (!Number.isFinite(y0) || !Number.isFinite(y1)) return null;
  return [{ x: num(cut.x0, 0), y: y0 }, { x: num(cut.x1, 0), y: y1 }];
}

/**
 * The clear carcass height the cut leaves at a point along the unit.
 *
 * T47: interpolated WITHIN the containing segment, never across the whole span.
 * Beyond either end the line holds its end value — which is exactly what T46's
 * own clamp did, and what `engine/puzzle.js slopeHeightAt` does beside it.
 */
export function cutHeightAt(cut, xMm) {
  const pts = cutPoints(cut);
  if (!pts) return Infinity;
  const x = num(xMm, 0);
  const last = pts[pts.length - 1];
  if (x <= pts[0].x) return round4(pts[0].y);
  if (x >= last.x) return round4(last.y);
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    if (x <= b.x) {
      const span = b.x - a.x;
      if (!(span > 1e-9)) return round4(b.y);
      return round4(a.y + (b.y - a.y) * ((x - a.x) / span));
    }
  }
  return round4(last.y);
}

/**
 * Which end of a cut unit is the LOW one, and which keeps its height.
 *
 * T47: it reads the FIRST AND LAST VERTEX of the line, which on a straight run
 * is the same pair of numbers it always read. `lowY`/`tallY` stay the two ENDS
 * — for the lowest point ANYWHERE on the line (which may now be a knee) ask
 * `cutValley`.
 */
export function cutEnds(cut) {
  const pts = cutPoints(cut);
  if (!pts) return null;
  const y0 = pts[0].y;
  const y1 = pts[pts.length - 1].y;
  return {
    low: y1 <= y0 ? 'R' : 'L',
    tall: y1 <= y0 ? 'L' : 'R',
    lowY: round4(Math.min(y0, y1)),
    tallY: round4(Math.max(y0, y1)),
  };
}

/**
 * The LOWEST point of the line, wherever it falls.
 *
 * Under T46 that was always an end. Under a bent line it may be a knee — a
 * ceiling that comes down from both sides has its low points at the two ends,
 * and one that comes down into a valley has it in the middle — so anything
 * asking "is there enough cabinet left" has to ask the whole line, not its
 * ends. (`SKY:cutValleyBetween`, the LISP's own.)
 */
export function cutValley(cut) {
  const pts = cutPoints(cut);
  if (!pts) return Infinity;
  return round4(pts.reduce((lo, p) => Math.min(lo, p.y), Infinity));
}

/** The tallest point of the line — the "czubek skosu" a side is run up to. */
export function cutPeak(cut) {
  const pts = cutPoints(cut);
  if (!pts) return Infinity;
  return round4(pts.reduce((hi, p) => Math.max(hi, p.y), -Infinity));
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
