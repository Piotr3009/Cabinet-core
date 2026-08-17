// ─── Collision clamping ───
// The rule is: A MOVE STOPS AT THE BOUNDARY. Not a warning, not an undo after
// the fact, and never an overlap that the cut list then has to explain
// (CLAUDE.md task 3).
//
// Everything here is a pure function of numbers. The store calls it from its
// setters, so the drag path, the keyboard path, a typed-in number and any
// future path all go through the SAME arithmetic — there is no second copy of
// the rule to drift.
//
// Every clearance comes from profile.editor; nothing in this file is a bare
// number (CLAUDE.md rule 3).

import { boxCorners } from './room.js';

/** Clamp that survives a reversed range: never returns a value outside [lo,hi]. */
function clampTo(value, lo, hi) {
  if (hi < lo) return lo;
  return Math.min(Math.max(Number(value), lo), hi);
}

// ─── Shelves ───────────────────────────────────────────────────────────────

/**
 * The vertical band a shelf may live in, measured to the shelf's bottom face.
 *
 * Floor: the top face of whatever closes the space below — the drawer
 * partition if there is a drawer stack, otherwise the base panel.
 * Ceiling: the underside of the top panel.
 * Both are then pulled in by the minimum clear space a shelf needs.
 *
 * @param {{height:number, boardT:number, floorY:number|null}} geom
 *        floorY: top face of the partition / base panel, in cabinet mm
 * @param {object} profile
 */
export function shelfBand({ height, boardT, floorY }, profile) {
  const edge = profile.editor.minShelfEdgeGap;
  const bottom = floorY == null ? boardT : floorY;
  return {
    min: bottom + edge,
    max: height - boardT - edge,
    floor: bottom,
    ceiling: height - boardT,
  };
}

/**
 * ─── TURN 37 (CLAUDE.md F4a): A CROSSING BOARD IS AN END OF THE CABINET ─────
 *
 * The owner, 17.08.2026, walking the split doors he asked for in T36:
 * *"dodajemy półkę i powinna być traktowana jak koniec szafy — jeśli daję
 * centruj półki, to ponad tą poprzeczką powinny się centrować według tej
 * poprzeczki, i to samo z dolną — taka sama rola."*
 *
 * He is right, and the reason is that a split divider is not furniture STANDING
 * IN a column, it is what makes two columns. Nothing above it can be spaced
 * against the base panel, because the base is not what it sits over; nothing
 * below it can be centred against the underside of the top, because the top is
 * not what closes it. Its role is the base's role, upwards, and the top's role,
 * downwards — "taka sama rola", in as many words.
 *
 * So the band a shelf lives in is CUT by the boards that cross it, and each
 * piece of it is an ordinary band with its own floor, its own ceiling and the
 * same `minShelfEdgeGap` pulled in at each end — exactly the arithmetic
 * `shelfBand` above does at the ends of the carcass, because it is the same
 * question asked about a different pair of faces.
 *
 * ONE LAW, and it lives HERE rather than in the three callers that need it:
 * the store's `shelfBandFor` narrows every band through this, so the drag, the
 * clamp sweep, the Even button and the add-shelf placement cannot end up
 * holding three opinions about where a divider is.
 *
 * NOTHING CROSSING = ONE SEGMENT, the band itself, returned unchanged key for
 * key. A cabinet with no split is the cabinet it was yesterday, and that is the
 * turn's byte-identity contract said in code.
 *
 * @param {object} args
 *   band        shelfBand(): { min, max, floor, ceiling }
 *   boundaries  the crossing boards, `{ at, thickness }` — `at` is the board's
 *               UNDERSIDE, the datum `pos_mm` has carried since turn 1. A bare
 *               number is a board of no thickness, which is a line.
 * @returns {Array<{min:number,max:number,floor:number,ceiling:number}>}
 *          bottom-up, one per segment
 */
export function bandSegments({ band, boundaries = [] }, profile) {
  const edge = profile.editor.minShelfEdgeGap;
  const crossing = (boundaries || [])
    .map((b) => (b && typeof b === 'object'
      ? { at: Number(b.at), t: Math.max(0, Number(b.thickness) || 0) }
      : { at: Number(b), t: 0 }))
    // Only the boards that actually cross THIS band: a divider in another bay,
    // or one below the drawer partition a shelf already stands over, is not a
    // boundary this shelf has ever had to think about.
    .filter((b) => Number.isFinite(b.at) && b.at + b.t > band.floor && b.at < band.ceiling)
    .sort((a, b) => a.at - b.at);
  if (!crossing.length) return [band];
  // floor → divider underside, divider top → next underside, … last top →
  // ceiling. The same face walk `centredShelfPos` and `shelfGapLadder` make,
  // because an opening is measured between FACES everywhere in this engine.
  const faces = [band.floor, ...crossing.flatMap((b) => [b.at, b.at + b.t]), band.ceiling];
  const out = [];
  for (let i = 0; i < faces.length - 1; i += 2) {
    const floor = Math.max(band.floor, faces[i]);
    const ceiling = Math.min(band.ceiling, faces[i + 1]);
    out.push({
      ...band, floor, ceiling, min: floor + edge, max: ceiling - edge,
    });
  }
  return out;
}

/**
 * The one segment a piece at `at` belongs to (turn 37, CLAUDE.md F4a).
 *
 * `at` is the shelf's own underside, so a shelf UNDER the divider is handed the
 * band that stops at the divider and a shelf above it is handed the one that
 * starts there — which is what makes the drag stop at the boundary instead of
 * walking through it.
 *
 * Nothing said (`at` null) is the WHOLE band, unchanged: a caller that is not
 * asking about a particular piece — the rail's automatic placement, the panel's
 * readout of what this cabinet allows — gets the answer it got yesterday.
 */
export function bandSegmentAt({ band, boundaries = [], at = null }, profile) {
  const segments = bandSegments({ band, boundaries }, profile);
  if (segments.length === 1) return segments[0];
  // `at == null` FIRST, and not `Number.isFinite(Number(at))` alone: `Number
  // (null)` is 0, so "nobody said where" would read as "the floor of the
  // carcass" and every caller that asks about no piece in particular would be
  // handed the BOTTOM segment. The same trap rule 13 is about.
  const y = at == null ? NaN : Number(at);
  if (!Number.isFinite(y)) return band;
  const inside = segments.find((s) => y >= s.floor && y < s.ceiling);
  if (inside) return inside;
  // On the boundary itself, or outside the band altogether: the NEAREST
  // segment. A shelf is never handed a band it cannot live in — the clamp
  // above has to have somewhere to put it.
  const reach = (s) => (y < s.floor ? s.floor - y : y - s.ceiling);
  return segments.reduce((best, s) => (reach(s) < reach(best) ? s : best));
}

/**
 * Drag bounds for ONE shelf: the band, narrowed by its immediate neighbours.
 *
 * `below`/`above` are the reference faces for the live dimension readout, so
 * it is never blank: the neighbouring shelf when there is one, otherwise the
 * band's own floor and ceiling.
 */
export function shelfBounds({ pos, others, band }, profile) {
  const gap = profile.editor.minShelfGap;
  const sorted = [...others].filter(Number.isFinite).sort((a, b) => a - b);
  const below = [...sorted].filter((y) => y <= pos).pop();
  const above = sorted.find((y) => y > pos);
  return {
    min: Math.max(band.min, below != null ? below + gap : band.min),
    max: Math.min(band.max, above != null ? above - gap : band.max),
    // ─── TURN 37 (CLAUDE.md F4a): NEVER PAST THE END OF THE BAND ────────────
    // The reference face is the nearest thing this shelf can actually measure
    // to, and the band's own ends are things: with a split divider overhead
    // (`bandSegments`) the neighbour above may be on the FAR SIDE of it, and a
    // readout naming a shelf through a solid board is a number that is not
    // about this opening at all. Without a divider the band's ceiling is the
    // underside of the top and every neighbour is already under it, so this is
    // the same answer it has given since turn 8.
    below: Math.max(below ?? band.floor, band.floor),
    above: Math.min(above ?? band.ceiling, band.ceiling),
  };
}

/**
 * Where a shelf actually ends up. The move is clamped into the bounds above —
 * so a shelf dragged at a neighbour stops touching it at the minimum gap and
 * stays there, however far the cursor keeps travelling.
 *
 * When the band has no room at all (a tall drawer stack under a low top) the
 * shelf holds its current position rather than jumping to a bound.
 */
export function clampShelfPos({ pos, current, others, band }, profile) {
  const bounds = shelfBounds({ pos: current ?? pos, others, band }, profile);
  if (bounds.max < bounds.min) {
    return { pos: current ?? bounds.min, ...bounds, blocked: true };
  }
  return { pos: clampTo(pos, bounds.min, bounds.max), ...bounds, blocked: false };
}

// ─── One element's depth (turn 9, CLAUDE.md F4) ────────────────────────────

/**
 * How far back a piece INSIDE a carcass may be set from the face of it.
 *
 * The number is a SETBACK, measured from the front face, because that is what
 * the engine already takes as an input (`front_mm` on a shelf item, turn 8) and
 * what a joiner says out loud: "that one is twenty back". So:
 *
 *     0            flush with the front face — the full pull-out turn 8 built
 *     max          as far back as leaves a piece worth cutting
 *
 * The far end is not the back panel. A shelf dragged all the way to the
 * construction plane behind it would be a 4 mm strip with a cut-list entry and
 * two banded edges, so the clamp stops it `editor.minElementDepth` short — the
 * narrowest board a workshop would still call a shelf.
 *
 * `backLoss` is depth the carcass has already taken off the piece before the
 * setback is applied at all: the sink unit's back panel sits 50 mm forward
 * INSIDE the box (KIT_SINK L425-426), and a shelf in one is that much shorter
 * before anybody drags anything.
 *
 * A pure function of four numbers, like every other rule in this file: the
 * drag, the number field in the panel and any path added later all clamp
 * through it, so there is no second copy to drift.
 *
 * @param {{depth:number, boardT:number, backLoss:number}} geom
 */
export function elementDepthBounds({ depth, boardT, backLoss = 0 }, profile) {
  const usable = (Number(depth) || 0) - (Number(boardT) || 0) - (Number(backLoss) || 0);
  return {
    min: 0,
    max: Math.max(0, usable - profile.editor.minElementDepth),
    // What the piece is actually cut to at each end of the range, so a readout
    // can say "560 deep" rather than "0 back".
    deepest: Math.max(0, usable),
    shallowest: Math.min(profile.editor.minElementDepth, Math.max(0, usable)),
  };
}

/** The setback a drag or a typed number ends up at. Stops at the boundary. */
export function clampElementDepth(value, bounds) {
  return clampTo(Number.isFinite(Number(value)) ? Number(value) : bounds.min, bounds.min, bounds.max);
}

// ─── Units on a wall ───────────────────────────────────────────────────────

/**
 * How far a unit's END PANELS stick out past its carcass, per side (turn 4,
 * BACKLOG #17). An end panel is screwed to the OUTSIDE of the carcass side, so
 * it is part of the unit's footprint: a neighbour that ignored it would be
 * standing in it.
 */
export function endPanelPads(unit, fallbackThickness = 0) {
  const out = { left: 0, right: 0 };
  for (const ep of unit?.params?.end_panels || []) {
    const t = Number(ep?.thickness) > 0 ? Number(ep.thickness) : Number(fallbackThickness) || 0;
    if (ep?.side === 'L') out.left = Math.max(out.left, t);
    if (ep?.side === 'R') out.right = Math.max(out.right, t);
  }
  return out;
}

/**
 * Deliberate clearances a unit keeps to its neighbours and to the wall behind
 * it (turn 7, CLAUDE.md F5 / BACKLOG #32).
 *
 * A joiner asks for one of these when there is something in the way that is not
 * furniture: a soil pipe in the corner, a wall that bows, a radiator bracket.
 * It is NOT a mistake to be tidied up — it is a decision, and the collision
 * clamp has to respect it exactly as it respects a neighbour, or the first drag
 * will close the gap the pipe is standing in.
 */
export function insetPads(unit) {
  const at = (key) => Math.max(0, Number(unit?.params?.[key]) || 0);
  return { left: at('inset_left_mm'), right: at('inset_right_mm'), back: at('inset_back_mm') };
}

/**
 * How far a unit's carcass stands off the wall behind it (turn 8, CLAUDE.md F3).
 *
 * Two numbers, added, and they mean different things:
 *
 *   `profile.room.wallBackClearance` — EVERY unit, always. Piotr's reasons are
 *   that walls are never straight and that a wall unit hangs on brackets which
 *   stand it off anyway. It is a fact about how this workshop builds, not a
 *   decision anybody makes per cabinet.
 *
 *   `params.inset_back_mm` — a DECISION about one cabinet, taken because there
 *   is a soil pipe or a bowed wall behind that one (turn 7, BACKLOG #32).
 *
 * They add because they are both real: a cabinet held 40 mm off for a pipe is
 * 40 mm off, and it still has the 10 mm every other cabinet has behind it —
 * which is to say the pipe clearance is measured from where the unit would
 * otherwise stand.
 */
export function wallClearance(profile) {
  return Math.max(0, Number(profile?.room?.wallBackClearance) || 0);
}

export function backStandoff(unit, profile) {
  return wallClearance(profile) + insetPads(unit).back;
}

/**
 * How much wall a unit takes up beyond its own width, per side.
 *
 * Two different things add to it and they add TOGETHER: an end panel, which is
 * a piece of board bolted to the outside of the carcass, and an inset, which is
 * air nobody may occupy. Geometrically the panel is against the carcass and the
 * gap is outside the panel, so a unit with both keeps its neighbour one panel
 * plus one gap away — which is what a joiner means by asking for both.
 */
export function footprintPads(unit, fallbackThickness = 0, profile = null) {
  const panels = endPanelPads(unit, fallbackThickness);
  const insets = insetPads(unit);
  return {
    left: panels.left + insets.left,
    right: panels.right + insets.right,
    // `back` is where the CARCASS starts, measured into the room from the wall.
    // With a profile in hand that includes the standing clearance every unit
    // has (turn 8, F3); without one it is the deliberate inset alone, which is
    // what a caller with no profile — an old test, a plain geometry question —
    // is asking about.
    back: profile ? backStandoff(unit, profile) : insets.back,
  };
}

/**
 * [left, right) footprint of a unit along its wall, END PANELS AND INSETS
 * INCLUDED.
 *
 * Every "where does this unit fit" question goes through here, so an end panel
 * and a deliberate gap are both respected by placing, moving and resizing
 * without any of them knowing what either one is.
 */
export function unitSpan(unit) {
  const pad = footprintPads(unit, unit?.params?.front_t);
  const left = (Number(unit.position?.x_mm) || 0) - pad.left;
  return { left, right: left + (Number(unit.params?.width) || 0) + pad.left + pad.right };
}

// ─── WHAT IS IN THE WAY OF WHAT (turn 12, CLAUDE.md F7) ────────────────────
//
// Bug, owner-verified twice: "a hanging unit ignores tall units completely — it
// drives straight through them and no alignment happens."
//
// The cause was one line, and it had been right for eight turns. A unit's
// obstacles were everything at the same MOUNTING LEVEL — `mount === 'wall'` for
// hanging units, `'floor'` for standing ones — which is exactly correct while
// every standing unit stops at worktop height and every hanging one starts
// above it. A TALL unit breaks it: it stands on the floor, so it is filed under
// 'floor', and it goes all the way up through the band the wall units hang in.
// The two never met, so a wall unit drove through a 2.15 m cabinet.
//
// "Mounting level" was always a proxy. The real question is whether the two
// pieces of furniture occupy the same HEIGHTS, and that is what is asked now —
// which gives the old answer everywhere the old rule was right (a base unit and
// a wall unit share no height at all) and the right answer where it was wrong.
//
// It is also, deliberately, not a rule about "tall units". A wardrobe, a fridge
// housing, a dresser somebody has typed 1900 into and whatever kit turn 15 adds
// are all handled by the same three lines, because the question is about the
// furniture and not about the label on it.

/**
 * The band of heights a unit occupies: from the underside of its carcass to the
 * top of it.
 *
 * @param {object} args
 *   floorY  how far off the floor the carcass starts — the toe kick for a unit
 *           on legs, the mounting height for one that hangs
 *   height  the carcass height
 */
export function unitBand({ floorY = 0, height = 0 }) {
  const from = Number(floorY) || 0;
  return { from, to: from + (Number(height) || 0) };
}

/**
 * Do two units share any of their height?
 *
 * `minOverlap` is what stops two pieces that merely TOUCH from blocking each
 * other: a wall unit hung exactly on the top of a tall one is a kitchen finished
 * flush, not a collision. It is a profile number
 * (`editor.levelOverlapMm`) like every other clearance.
 */
export function bandsOverlap(a, b, minOverlap = 0) {
  if (!a || !b) return false;
  return Math.min(a.to, b.to) - Math.max(a.from, b.from) > (Number(minOverlap) || 0);
}

// ─── Plan geometry: units on DIFFERENT walls ────────────────────────────────
// Two units on the same wall are a one-dimensional problem. Two units meeting
// in a CORNER are not: one stands on wall 1 and the other on wall 2, and what
// overlaps is their footprints on the floor. Everything below turns that back
// into the same one-dimensional problem by measuring the other unit in THIS
// wall's frame — along the wall, and into the room.

/**
 * The four plan corners of a unit standing on `wall`.
 *
 * `rotation` (degrees, clockwise seen from above) turns the unit about the
 * point where it meets the wall — 0 is back-to-wall, 90 is side-to-wall. The
 * footprint is what every collision question is asked about, so a rotated unit
 * needs no separate rules: it is just a different rectangle.
 */
export function unitFootprint({ wall, x, width, depth, rotation = 0, backInset = 0 }) {
  const ax = wall.along.x; const ay = wall.along.y;
  const nx = wall.inward.x; const ny = wall.inward.y;
  const ox = wall.start.x + ax * x;
  const oy = wall.start.y + ay * x;
  const rad = (Number(rotation) || 0) * Math.PI / 180;
  const cos = Math.cos(rad); const sin = Math.sin(rad);
  // A BACK INSET stands the unit off the wall (turn 7): it is measured into the
  // room, so the footprint starts there instead of at v = 0 and every plan
  // question — corners, depth clamps, distance arrows — answers from the real
  // rectangle rather than from the one the unit would occupy if it were pushed
  // back against a wall that is not straight.
  const near = Math.max(0, Number(backInset) || 0);
  // Local (u along the wall, v into the room) → plan, with the rotation applied
  // in the local frame first.
  const place = (u, v) => {
    const ru = u * cos - v * sin;
    const rv = u * sin + v * cos;
    return { x: ox + ax * ru + nx * rv, y: oy + ay * ru + ny * rv };
  };
  return [place(0, near), place(width, near), place(width, near + depth), place(0, near + depth)];
}

/** A unit's own span in its wall's frame, rotation included. */
export function unitPlanSpan({ wall, x, width, depth, rotation = 0, backInset = 0 }) {
  return spanInWallFrame(unitFootprint({ wall, x, width, depth, rotation, backInset }), wall);
}

/** A plan polygon measured in one wall's frame: along the wall, into the room. */
export function spanInWallFrame(points, wall) {
  let uMin = Infinity; let uMax = -Infinity; let vMin = Infinity; let vMax = -Infinity;
  for (const p of points) {
    const dx = p.x - wall.start.x;
    const dy = p.y - wall.start.y;
    const u = dx * wall.along.x + dy * wall.along.y;
    const v = dx * wall.inward.x + dy * wall.inward.y;
    uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
  }
  return { left: uMin, right: uMax, near: vMin, far: vMax };
}

/**
 * The plan's own obstacles, in one wall's frame (turn 14, CLAUDE.md F10.3).
 *
 * A box is measured EXACTLY as a unit standing on another wall is: its
 * footprint is brought into this wall's frame and it counts only where it
 * reaches into the depth band the moving unit occupies. A chimney breast on the
 * opposite wall is not in anybody's way; the same breast in this corner is.
 *
 * Its own function because two different questions ask it — the drag clamp
 * (through `wallObstacles`) and the PLACEMENT search, which takes bare spans.
 */
export function boxSpansOnWall({ wall, depth, boxes = [] }) {
  const out = [];
  for (const box of boxes || []) {
    const span = spanInWallFrame(boxCorners(box), wall);
    if (span.far <= 0 || span.near >= (Number(depth) || 0)) continue;
    if (span.right <= 0 || span.left >= wall.width) continue;
    out.push({
      left: span.left, right: span.right, label: box.label || 'a box in the plan', corner: false, box: true,
    });
  }
  return out;
}

/**
 * Everything that blocks movement along `wall` for a unit `depth` deep.
 *
 * Same-wall neighbours are their own span. A unit on another wall counts only
 * when it actually reaches into the depth band this unit occupies — which is
 * exactly what happens in a corner, and never happens on the wall opposite.
 *
 * @param {object} args
 *   wall     the wall being moved along (from engine/room.js roomWalls)
 *   walls    every wall of the room
 *   depth    the moving unit's depth
 *   others   [{ wall: index, x_mm, width, depth, label }] — every OTHER unit
 *            at the same mounting level
 *   boxes    [{ id, x, y, w, d }] — the plan's own obstacles (turn 14,
 *            CLAUDE.md F10.3): a chimney breast, a boxed pipe, a pillar. They
 *            are measured EXACTLY as a unit on another wall is — footprint into
 *            this wall's frame, ignored unless it reaches into the depth band
 *            this unit occupies — because to a cabinet being slid along a wall
 *            a chimney and a neighbour are the same fact.
 */
export function wallObstacles({
  wall, walls, depth, others = [], boxes = [],
}) {
  const out = [...boxSpansOnWall({ wall, depth, boxes })];
  for (const o of others) {
    if (o.wall === wall.index && !o.rotation) {
      out.push({ left: o.x_mm, right: o.x_mm + o.width, label: o.label, corner: false });
      continue;
    }
    const otherWall = walls[o.wall];
    if (!otherWall) continue;
    const footprint = unitFootprint({
      wall: otherWall, x: o.x_mm, width: o.width, depth: o.depth, rotation: o.rotation, backInset: o.backInset,
    });
    const span = spanInWallFrame(footprint, wall);
    if (o.wall === wall.index) {
      // A rotated neighbour on THIS wall: its footprint is what counts, not
      // its nominal width.
      out.push({ left: span.left, right: span.right, label: o.label, corner: false });
      continue;
    }
    // Behind this wall, or past the front of this unit: not in the way.
    if (span.far <= 0 || span.near >= depth) continue;
    if (span.right <= 0 || span.left >= wall.width) continue;
    out.push({ left: span.left, right: span.right, label: o.label, corner: true });
  }
  return out;
}

/**
 * How deep a unit may be at this spot before it runs into the far wall.
 *
 * A ray is cast into the room from each end of the unit's footprint; the first
 * wall either ray meets is the limit. Exact for a rectangle and for the
 * L-shaped rooms turn 3 introduces.
 */
export function maxDepthOnWall({ wall, walls, x, width }) {
  let limit = Infinity;
  for (const u of [x, x + width]) {
    const px = wall.start.x + wall.along.x * u;
    const py = wall.start.y + wall.along.y * u;
    for (const other of walls) {
      if (other.index === wall.index) continue;
      const t = rayToSegment(px, py, wall.inward, other);
      if (t != null && t > 1e-6) limit = Math.min(limit, t);
    }
  }
  return Number.isFinite(limit) ? limit : 0;
}

/** Distance from (px,py) along `dir` to the segment `seg`, or null. */
function rayToSegment(px, py, dir, seg) {
  const sx = seg.start.x; const sy = seg.start.y;
  const ex = seg.end.x; const ey = seg.end.y;
  const rx = dir.x; const ry = dir.y;
  const qx = ex - sx; const qy = ey - sy;
  const denom = rx * qy - ry * qx;
  if (Math.abs(denom) < 1e-9) return null;              // parallel
  const t = ((sx - px) * qy - (sy - py) * qx) / denom;  // along the ray
  const s = ((sx - px) * ry - (sy - py) * rx) / denom;  // along the segment
  if (t < 0 || s < -1e-6 || s > 1 + 1e-6) return null;
  return t;
}

// ─── Resizing a unit ───────────────────────────────────────────────────────
// Widening is a move like any other: it has to stop at the same barriers. The
// difference is which end moves — the position stays put and the far edge
// travels — so it gets its own clamp rather than a re-run of clampUnitX.

/**
 * The widest this unit may be where it stands.
 *
 * `wallMargin` is the scribe gap the unit must leave at the end of the wall
 * (turn 4: the side-infill stop), and `padRight` is its own end panel, which
 * travels with the far edge as it grows.
 *
 * @returns {{width:number, max:number, blocked:boolean, by:string|null}}
 */
export function clampUnitWidth({
  width, x, wallWidth, others = [], wallMargin = 0, padRight = 0,
}, profile) {
  const clearance = profile.editor.minUnitGap;
  const margin = Math.max(0, Number(wallMargin) || 0);
  const pad = Math.max(0, Number(padRight) || 0);
  let max = Math.max(0, wallWidth - x - margin - pad);
  let limitedBy = margin > 0 ? 'the infill at the wall' : 'the wall';

  for (const o of others) {
    if (o.right <= x) continue;                 // entirely to the left
    const free = o.left - clearance - x - pad;
    if (free < max) { max = Math.max(0, free); limitedBy = o.label || 'a neighbour'; }
  }
  const next = Math.min(Number(width) || 0, max);
  const blocked = next < (Number(width) || 0);
  return { width: next, max, blocked, by: blocked ? limitedBy : null };
}

/**
 * The deepest this unit may be where it stands: the room's own limit, and any
 * unit on another wall that its footprint would grow into.
 */
export function clampUnitDepth({ depth, x, width, wall, walls, others = [], backInset = 0 }, profile) {
  const clearance = profile.editor.minUnitGap;
  // A unit standing off the wall has less room in front of it, by exactly the
  // amount it was stood off (turn 7, CLAUDE.md F5).
  const back = Math.max(0, Number(backInset) || 0);
  let max = Math.max(0, maxDepthOnWall({ wall, walls, x, width }) - back);
  let limitedBy = back > 0 ? 'the room, and this unit’s back inset' : 'the room';

  for (const o of others) {
    if (o.wall === wall.index && !o.rotation) continue;
    const otherWall = walls[o.wall];
    if (!otherWall) continue;
    const span = spanInWallFrame(
      unitFootprint({
        wall: otherWall, x: o.x_mm, width: o.width, depth: o.depth, rotation: o.rotation, backInset: o.backInset,
      }),
      wall,
    );
    // Only a neighbour standing in front of this unit's width can limit it.
    if (span.right <= x || span.left >= x + width) continue;
    if (span.far <= 0) continue;
    const free = span.near - clearance - back;
    if (free < max) { max = Math.max(0, free); limitedBy = o.label || 'a neighbour'; }
  }
  const next = Math.min(Number(depth) || 0, max);
  const blocked = next < (Number(depth) || 0);
  return { depth: next, max, blocked, by: blocked ? limitedBy : null };
}

/**
 * Where a unit actually ends up when slid along a wall.
 *
 * A unit moves CONTINUOUSLY, so it can only be stopped by the obstacles it
 * would reach first: the free slot it is standing in right now. Obstacles on
 * the far side of a neighbour are irrelevant — you cannot pass through the
 * neighbour to get to them. That is what makes this a hard stop rather than a
 * "nearest legal position", which would let a fast drag teleport a unit past
 * its neighbour into the next gap.
 *
 * The magnet is the same barrier, reached early: within `unitMagnet` of a
 * neighbour's edge (or a wall end) the unit butts against it exactly. Edge to
 * edge, never an overlap.
 *
 * @param {object} args
 *   x          desired position (already snapped by the caller)
 *   current    where the unit is now — defines which slot it is in
 *   width      the unit's width
 *   wallWidth  the wall it stands on
 *   others     [{left,right}] footprints of the OTHER units on the same wall
 *   wallMargin the gap the unit must leave at EACH end of the wall. Turn 4: a
 *              unit does not travel all the way to the wall any more — it stops
 *              one infill width short, and the filler that closes that gap
 *              appears by itself (BACKLOG #15). The magnet makes the stop a
 *              landing: within `unitMagnet` of it the unit sits exactly there,
 *              so the gap is EXACTLY the infill width and not 19.4 mm.
 */
export function clampUnitX({ x, current, width, wallWidth, others = [], wallMargin = 0 }, profile) {
  const magnet = profile.editor.unitMagnet;
  const clearance = profile.editor.minUnitGap;
  const margin = Math.max(0, Number(wallMargin) || 0);

  // A wall too short for the unit plus its two margins keeps the unit inside the
  // wall and gives up the margins: the alternative is a clamp with no legal
  // position at all.
  const wallMax = Math.max(0, wallWidth - width - margin);
  const wallMin = Math.min(margin, wallMax);
  const here = clampTo(current ?? x, wallMin, wallMax);

  let low = wallMin;
  let high = wallMax;
  for (const o of others) {
    // Which side an obstacle is on is decided on the RAW footprints: a unit
    // standing flush against its neighbour is on that neighbour's right, not
    // "overlapping it". The clearance is then applied to the barrier itself —
    // reading the side off the padded span instead would make a flush pair look
    // overlapping the moment a scribe gap is configured, and the clamp would
    // stop constraining exactly the neighbour it is meant to protect.
    if (o.right <= here) low = Math.max(low, o.right + clearance);            // blocks travel left
    else if (o.left >= here + width) high = Math.min(high, o.left - clearance - width); // blocks right
    // Anything left over genuinely overlaps this unit already. It cannot
    // constrain the move without teleporting the unit out of the overlap, so
    // it is skipped and unitIssues() reports it instead.
  }

  // With no scribe gap this cannot happen: low ≤ here ≤ high by construction,
  // which is precisely what makes the clamp a stop rather than a jump. It
  // becomes reachable once minUnitGap > 0 and a run was built without it.
  if (high < low) return { x: here, min: low, max: high, blocked: true };

  let next = clampTo(x, low, high);
  if (Math.abs(next - low) <= magnet) next = low;
  else if (Math.abs(next - high) <= magnet) next = high;
  return { x: next, min: low, max: high, blocked: false };
}

/**
 * How tall this unit is allowed to be in this room (turn 5, BACKLOG #29).
 *
 * A project height is pushed onto every unit that has not been given one by
 * hand, and a room with a low ceiling must not be the way that creates a unit
 * standing through it. So the push is CLAMPED, the same way growing a unit
 * sideways is clamped by its neighbour: it goes as far as it can and says what
 * stopped it.
 *
 * @param {object} args
 *   height     the height being asked for
 *   floorY     how far off the floor the carcass starts — the leg height for a
 *              standing unit, the mount height for one on the wall
 *   roomHeight 0 = no ceiling known, so nothing to stop it
 *   minHeight  the type's own minimum, if it has one
 */
export function clampUnitHeight({ height, floorY = 0, roomHeight = 0, minHeight = 0 }) {
  const wanted = Number(height) || 0;
  const base = Math.max(0, Number(floorY) || 0);
  const room = Number(roomHeight) || 0;
  const floor = Math.max(0, Number(minHeight) || 0);
  const ceiling = room > 0 ? Math.max(floor, room - base) : Infinity;

  let value = wanted;
  let blocked = false;
  let by = null;
  if (value > ceiling) { value = ceiling; blocked = true; by = 'the ceiling'; }
  if (value < floor) { value = floor; blocked = true; by = 'this type\'s minimum height'; }
  return { height: value, max: ceiling, min: floor, blocked, by };
}

/**
 * What is wrong with this unit where it stands. Position is already clamped by
 * the setters, so these are the cases clamping CANNOT fix — the unit simply
 * does not fit the room and a number has to change.
 */
export function unitIssues({ unit, wallWidth: wallW, roomHeight: roomH, others = [] }) {
  const issues = [];
  // Plain numbers, not a room object: this file knows nothing about how a room
  // is shaped, which is what lets the same rule serve a rectangle, an L and
  // whatever comes next (engine/room.js does the shape).
  const wallWidth = Number(wallW) || 0;
  const roomHeight = Number(roomH) || 0;
  const w = Number(unit.params?.width) || 0;
  const h = Number(unit.params?.height) || 0;

  if (roomHeight > 0 && h > roomHeight) {
    issues.push({
      level: 'error',
      code: 'UNIT_TALLER_THAN_ROOM',
      message: `Unit is ${Math.round(h - roomHeight)} mm taller than the room (${Math.round(h)} mm in a ${Math.round(roomHeight)} mm room).`,
    });
  }
  if (wallWidth > 0 && w > wallWidth) {
    issues.push({
      level: 'error',
      code: 'UNIT_WIDER_THAN_WALL',
      message: `Unit is ${Math.round(w - wallWidth)} mm wider than the wall (${Math.round(w)} mm on a ${Math.round(wallWidth)} mm wall).`,
    });
  }

  const me = unitSpan(unit);
  for (const o of others) {
    if (o.right > me.left && me.right > o.left) {
      issues.push({
        level: 'error',
        code: 'UNIT_OVERLAP',
        message: `Unit overlaps ${o.label || 'another unit'} on this wall by ${Math.round(Math.min(o.right, me.right) - Math.max(o.left, me.left))} mm.`,
      });
      break;
    }
  }
  return issues;
}

/**
 * Where a unit of `width` FITS on this wall without touching anything — or
 * null, when it does not fit at all.
 *
 * The difference from firstFreeUnitX() is the null: this one never answers
 * with a position that overlaps. It is what the "add a unit" path asks, so a
 * new unit lands on a wall that has room or is refused outright, rather than
 * being dropped on top of a neighbour for unitIssues() to complain about
 * afterwards (CLAUDE.md turn 3, phase 4: no overlap by ANY path).
 */
export function freeSlotOnWall({
  width, wallWidth, others = [], wallMargin = 0, near = null, side = null,
}, profile) {
  const clearance = profile?.editor?.minUnitGap ?? 0;
  const w = Number(width) || 0;
  // The same stop a drag obeys (BACKLOG #15): a unit is never PLACED flush
  // against the wall either, or its first drag would jump it off the wall.
  const margin = Math.max(0, Number(wallMargin) || 0);
  const wallMax = Math.max(0, wallWidth - w - margin);
  const wallMin = Math.min(margin, wallMax);
  if (w <= 0 || wallWidth < w) return null;
  if (!others.length) return Math.round(Math.max(wallMin, (wallWidth - w) / 2));

  const spans = [...others].sort((a, b) => a.left - b.left);

  // ─── Turn 8 (CLAUDE.md F2.1) — the most important bug in the list ───
  //
  // Piotr: a new unit ALWAYS lands to the right of the existing ones, and it
  // cannot then be dragged left. Both halves of that are true and the second
  // one is not a bug: a unit butted hard against its neighbour has nowhere to
  // go left, and a clamp that let it pass through would be worse. The bug is
  // the FIRST half — the placement had exactly one idea, "the right-hand end",
  // so the left-hand side of a run was unreachable by any route at all.
  //
  // When the caller names a unit to work beside, the answer is the nearest FREE
  // slot on EITHER side of it. `side` narrows that to one of them, for a caller
  // that means "and on the left".
  if (near) {
    const anchor = typeof near === 'number'
      ? { left: near, right: near }
      : { left: Number(near.left) || 0, right: Number(near.right) || 0 };
    const wanted = side === 'L' || side === 'left' ? 'L' : (side === 'R' || side === 'right' ? 'R' : null);
    let best = null;
    for (const slot of freeSlots(spans, { wallMin, wallMax, width: w, clearance })) {
      // A new cabinet goes NEXT TO something, never adrift in the middle of a
      // gap: each free stretch offers its two ends and nothing between them.
      for (const x of new Set([slot.from, slot.to])) {
        const right = x + w;
        const onLeft = right <= anchor.left + 1e-6;
        const onRight = x >= anchor.right - 1e-6;
        if (wanted === 'L' && !onLeft) continue;
        if (wanted === 'R' && !onRight) continue;
        // How far this slot is from the unit we were told to work beside.
        // Butted against it is 0, which is what "add another one here" means.
        const distance = onLeft ? anchor.left - right : (onRight ? x - anchor.right : 0);
        // Ties go RIGHT, so a run with room on both sides still grows the way
        // "add, add, add" always grew.
        if (!best || distance < best.distance - 1e-6 || (Math.abs(distance - best.distance) <= 1e-6 && onRight && !best.onRight)) {
          best = { x, distance, onRight };
        }
      }
    }
    return best ? Math.round(best.x) : null;
  }

  // Butt onto the right-hand end of the run first — building a row of units is
  // "add, add, add", the turn-1 behaviour, kept deliberately for a caller that
  // names no unit to work beside.
  const rightMost = spans.reduce((m, s) => Math.max(m, s.right), wallMin);
  if (rightMost + clearance <= wallMax) return Math.round(rightMost + clearance);

  let cursor = wallMin;
  for (const s of spans) {
    const gap = s.left - clearance - cursor;
    if (gap >= w && cursor <= wallMax) return Math.round(cursor);
    cursor = Math.max(cursor, s.right + clearance);
  }
  return null;
}

/**
 * Every stretch of wall a unit `width` wide actually fits in, as the range of
 * left-edge positions it could take there: `{ from, to }` with from ≤ to.
 *
 * Written out rather than folded into the search above because it is the honest
 * shape of the question — "where is there room" — and because the placing path
 * and anything later that asks it (a duplicate, a paste) must not each grow
 * their own version of the arithmetic.
 */
export function freeSlots(spans, {
  wallMin, wallMax, width, clearance = 0,
}) {
  const out = [];
  const sorted = [...spans].sort((a, b) => a.left - b.left);
  let cursor = wallMin;
  const consider = (from, to) => {
    const lo = Math.max(from, wallMin);
    const hi = Math.min(to - width, wallMax);
    if (hi >= lo - 1e-9) out.push({ from: lo, to: Math.max(lo, hi) });
  };
  for (const s of sorted) {
    consider(cursor, s.left - clearance);
    cursor = Math.max(cursor, s.right + clearance);
  }
  consider(cursor, wallMax + width);
  return out;
}

/**
 * Where a NEW unit of `width` lands.
 *
 * Empty wall: centred. Otherwise butted onto the right-hand end of the run, so
 * building a row of units is just "add, add, add" — the tura-1 behaviour, kept
 * deliberately. Only when the right-hand end has run out of wall does it fall
 * back to the first gap wide enough, and finally to the far end of the wall
 * (where unitIssues() reports the overlap that no placement could avoid).
 */
export function firstFreeUnitX({ width, wallWidth, others = [] }) {
  const wallMax = Math.max(0, wallWidth - width);
  if (!others.length) return Math.round(Math.max(0, (wallWidth - width) / 2));

  const rightMost = others.reduce((m, s) => Math.max(m, s.right), 0);
  if (rightMost <= wallMax) return Math.round(rightMost);

  const spans = [...others].sort((a, b) => a.left - b.left);
  let cursor = 0;
  for (const s of spans) {
    if (s.left - cursor >= width) return Math.round(clampTo(cursor, 0, wallMax));
    cursor = Math.max(cursor, s.right);
  }
  return Math.round(wallMax);
}
