// ─── DRAWING A WALL (turn 50, CLAUDE.md F1) ─────────────────────────────────
//
// The owner, 25.08.2026, and his sentence IS the specification:
//
//   *"myśle że będzie rysowanie ściany poprzez dodawanie kresek i wpisywanie
//   długości odcinka ściany — czyli zaznaczasz kierunek, a później długość
//   wpisujesz. domyślnie jak inny kierunek to 90 stopni, chyba że wpiszesz
//   inny kąt."*
//
// Two gestures and nothing else: you INDICATE a direction, and you TYPE a
// length. That is how a joiner tapes a room out on site — he does not know
// where the corners are in some coordinate frame, he knows "along this wall
// 3600, then turn, then 2400".
//
// ─── WHY THE ANGLE IS A TURN AND NOT A BEARING ──────────────────────────────
//
// "domyślnie jak inny kierunek to 90 stopni" — the 90 is the TURN, not a
// compass reading. A room is a sequence of turns, and the turn is what a hand
// on site measures against the wall it has just walked. So the angle field
// carries 90 and is there to be OVERTYPED, exactly as CLAUDE.md says: a bay at
// 45 is `45` in that field for one segment and the field goes back to 90.
//
// ─── WHAT "INDICATE A DIRECTION" MEANS TO A POINTER ─────────────────────────
//
// `aimHeading` is the whole of it. The pointer names a raw bearing; the draft
// answers with the nearest of the only three directions the next segment may
// take — straight on, turn left by the angle, turn right by the angle. So the
// hand does not have to land on 90.0000°: it has to be nearer to one of three
// than to the other two, which is a gesture a mouse can actually make.
//
// The FIRST segment has no previous wall to turn from, so its candidates are
// the four axes. A first wall drawn at 37° is not a room anybody taps out, and
// the angle field is still there for the one who wants it (`addSegment` takes
// any bearing — the snapping is the POINTER's convenience, never a clamp).
//
// ─── UNDO TAKES BACK ONE SEGMENT ────────────────────────────────────────────
//
// CLAUDE.md, in as many words. So the draft is a LIST and `undoSegment` pops
// one off it. It is deliberately not the app's own undo stack: a half-drawn
// outline is not a project state, and a joiner who mistypes 2400 as 24000 wants
// that one line back, not the last thing he did to the kitchen.
//
// ─── AND NOTHING HERE IS THE ENGINE'S ROOM ──────────────────────────────────
//
// A draft is not a room and never becomes one by accident: `draftToCorners`
// is the ONE crossing, it hands back a plain corner list, and `engine/room.js`
// migrates and normalises it exactly as it does a corner list from anywhere
// else. Every consumer downstream — the walls, the placement, the 3-D view —
// reads `project.room` and has never heard of this module.
//
// Pure functions — no React, no store, no three.js.

import { MIN_WALL_LENGTH, rectCorners } from './room.js';

/** The turn a new direction takes when nobody has said otherwise. */
export const DEFAULT_TURN_DEG = 90;

/**
 * How near the start a chain has to come back to count as CLOSED.
 *
 * Generous on purpose: this is a decision the app announces ("this closes the
 * room") and the hand confirms, not something it does behind the pointer. 150
 * mm is about a finger's width at the scales this plan draws at.
 */
export const CLOSE_TOLERANCE_MM = 150;

// `Math.round(-0.0001 * 1e4) / 1e4` is NEGATIVE ZERO, which is a real value in
// JS and fails an `===` against 0 downstream for no reason — the same trap
// `engine/cabinet.js` names at the end panel's `box.y`. Adding 0 collapses it.
const round4 = (v) => (Math.round(v * 1e4) / 1e4) + 0 || 0;
const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const RAD = Math.PI / 180;

/** A bearing brought into [0, 360). */
export function normaliseDeg(deg) {
  const d = num(deg, 0) % 360;
  return round4(d < 0 ? d + 360 : d);
}

/** The signed difference between two bearings, in (−180, 180]. */
export function deltaDeg(from, to) {
  const d = normaliseDeg(to) - normaliseDeg(from);
  if (d > 180) return round4(d - 360);
  if (d <= -180) return round4(d + 360);
  return round4(d);
}

/** A fresh draft rooted at one point on the floor. */
export function newDraft(start) {
  return {
    start: { x: round4(num(start?.x, 0)), y: round4(num(start?.y, 0)) },
    segments: [],
  };
}

/** One segment, sane: a bearing in [0, 360) and a length that is a length. */
function fitSegment(seg) {
  return {
    deg: normaliseDeg(seg?.deg),
    length: round4(Math.max(0, num(seg?.length, 0))),
  };
}

/** Every segment of a draft, normalised. */
export function draftSegments(draft) {
  return (Array.isArray(draft?.segments) ? draft.segments : []).map(fitSegment);
}

/**
 * The chain as points — the start, then one point per segment.
 *
 * `x` runs to the right and `y` INTO the room, which is `engine/room.js`'s own
 * plan frame: a corner list from here needs no transform to become a room.
 */
export function draftPoints(draft) {
  const out = [{ ...newDraft(draft?.start).start }];
  for (const seg of draftSegments(draft)) {
    const last = out[out.length - 1];
    out.push({
      x: round4(last.x + Math.cos(seg.deg * RAD) * seg.length),
      y: round4(last.y + Math.sin(seg.deg * RAD) * seg.length),
    });
  }
  return out;
}

/** Where the chain has got to. */
export function draftEnd(draft) {
  const pts = draftPoints(draft);
  return pts[pts.length - 1];
}

/** The bearing of the last segment drawn, or null on an empty draft. */
export function draftHeading(draft) {
  const segs = draftSegments(draft);
  return segs.length ? segs[segs.length - 1].deg : null;
}

/**
 * The directions the NEXT segment may take — straight on, or the turn either
 * way. An empty draft answers with the four axes, which is what a first wall
 * is drawn along.
 */
export function headingChoices(draft, turnDeg = DEFAULT_TURN_DEG) {
  const previous = draftHeading(draft);
  if (previous == null) return [0, 90, 180, 270].map(normaliseDeg);
  const turn = Math.abs(num(turnDeg, DEFAULT_TURN_DEG)) || DEFAULT_TURN_DEG;
  // Straight on FIRST, so a tie between "carry on" and a turn keeps the wall
  // running — the safer of the two answers when the hand has barely moved.
  return [previous, previous + turn, previous - turn].map(normaliseDeg);
}

/**
 * Which direction the pointer is INDICATING: the choice nearest the raw
 * bearing from the chain's end to the point.
 *
 * Returns null when the pointer has not moved far enough off the end to mean
 * anything — a direction read off a two-pixel drag is a direction the hand did
 * not choose.
 */
export function aimHeading(draft, point, turnDeg = DEFAULT_TURN_DEG, minReachMm = 1) {
  const end = draftEnd(draft);
  const dx = num(point?.x, 0) - end.x;
  const dy = num(point?.y, 0) - end.y;
  if (Math.hypot(dx, dy) < Math.max(0, num(minReachMm, 1))) return null;
  const raw = normaliseDeg((Math.atan2(dy, dx) * 180) / Math.PI);
  let best = null;
  for (const deg of headingChoices(draft, turnDeg)) {
    const off = Math.abs(deltaDeg(deg, raw));
    if (best === null || off < best.off - 1e-9) best = { deg, off };
  }
  return best ? best.deg : null;
}

/** How far along that direction the pointer reaches — the length it implies. */
export function aimLength(draft, point, headingDeg) {
  const end = draftEnd(draft);
  const dx = num(point?.x, 0) - end.x;
  const dy = num(point?.y, 0) - end.y;
  const deg = normaliseDeg(headingDeg);
  // Projected onto the chosen direction, never the raw distance: the pointer is
  // off the line by construction (it is what CHOSE the line), and a length that
  // included that error would be longer than the wall the eye is drawing.
  return round4(Math.max(0, dx * Math.cos(deg * RAD) + dy * Math.sin(deg * RAD)));
}

/**
 * What is wrong with a segment of this length — the message the field shows,
 * or null.
 *
 * CLAUDE.md: *"If a segment would produce a wall shorter than the room model's
 * own minimum, say so at the field rather than accepting it."* The minimum is
 * `engine/room.js`'s own (`MIN_WALL_LENGTH`), imported rather than repeated, so
 * a shop that changes it changes it once.
 */
export function segmentIssue(lengthMm) {
  const len = Number(lengthMm);
  if (!Number.isFinite(len) || len <= 0) return 'Type the length of this wall in millimetres.';
  if (len < MIN_WALL_LENGTH) return `A wall is at least ${MIN_WALL_LENGTH} mm — ${Math.round(len)} is shorter than the room model allows.`;
  return null;
}

/** Add one segment. Refused — the draft comes back unchanged — when it is not one. */
export function addSegment(draft, { headingDeg, lengthMm } = {}) {
  if (segmentIssue(lengthMm)) return draft;
  const deg = normaliseDeg(headingDeg ?? draftHeading(draft) ?? 0);
  return {
    ...newDraft(draft?.start),
    segments: [...draftSegments(draft), fitSegment({ deg, length: lengthMm })],
  };
}

/**
 * Re-type a segment that is already drawn.
 *
 * *"a drawn segment can be re-typed without starting again."* The segments
 * AFTER it keep their own bearings and lengths and simply travel with it, which
 * is what "re-typed" means to a chain: changing the second wall of an L moves
 * the third, it does not re-draw it.
 */
export function setSegmentLength(draft, index, lengthMm) {
  const segs = draftSegments(draft);
  if (!segs[index] || segmentIssue(lengthMm)) return draft;
  return {
    ...newDraft(draft?.start),
    segments: segs.map((s, i) => (i === index ? fitSegment({ ...s, length: lengthMm }) : s)),
  };
}

/** …and re-aim one, by the same rule and for the same reason. */
export function setSegmentHeading(draft, index, headingDeg) {
  const segs = draftSegments(draft);
  if (!segs[index] || !Number.isFinite(Number(headingDeg))) return draft;
  return {
    ...newDraft(draft?.start),
    segments: segs.map((s, i) => (i === index ? fitSegment({ ...s, deg: headingDeg }) : s)),
  };
}

/** Undo: ONE segment, never the whole wall (CLAUDE.md F1). */
export function undoSegment(draft) {
  const segs = draftSegments(draft);
  if (!segs.length) return draft;
  return { ...newDraft(draft?.start), segments: segs.slice(0, -1) };
}

/** How near the start the chain has come back — Infinity while it is empty. */
export function closingGapMm(draft) {
  const segs = draftSegments(draft);
  if (!segs.length) return Infinity;
  const end = draftEnd(draft);
  const start = newDraft(draft?.start).start;
  return round4(Math.hypot(end.x - start.x, end.y - start.y));
}

/**
 * Is this chain closed?
 *
 * Three segments is the floor: two walls back onto their own start only by
 * doubling back on themselves, and that is a line rather than a room.
 */
export function isClosed(draft, tolerance = CLOSE_TOLERANCE_MM) {
  return draftSegments(draft).length >= 3
    && closingGapMm(draft) <= Math.max(0, num(tolerance, CLOSE_TOLERANCE_MM));
}

/**
 * The corner list this draft becomes.
 *
 * CLOSED — the points, less the duplicate that lands back on the start. The
 * outline the joiner drew, corner for corner.
 *
 * OPEN, two segments or more — the points, and the polygon is closed by the
 * IMPLIED edge from the last corner back to the first. CLAUDE.md: *"an open
 * chain is a valid one-wall or L job and must not be forced closed."* It is
 * not: nothing is snapped, nothing is squared up, and `drawnWallCount` below
 * records how many of the walls were actually DRAWN so the plan can show the
 * implied one for what it is.
 *
 * OPEN, one segment — a ONE-WALL job, which this app has had since turn 14. It
 * becomes the rectangle that wall has always stood in, `depth` deep, so the
 * floor exists and `wallsInScope` shows the wall and its two returns exactly as
 * it always has.
 *
 * @returns {Array<{x:number,y:number}>|null} null when there is nothing to make
 */
export function draftToCorners(draft, { depth = 3000 } = {}) {
  const segs = draftSegments(draft);
  if (!segs.length) return null;
  const pts = draftPoints(draft);
  if (isClosed(draft)) return pts.slice(0, -1).map((p) => ({ ...p }));
  if (segs.length === 1) {
    // The wall, and the box it stands in. Rotated onto the wall's own bearing,
    // so a first wall drawn "down the screen" gives a room standing that way.
    const deg = segs[0].deg;
    const nx = -Math.sin(deg * RAD);
    const ny = Math.cos(deg * RAD);
    const d = Math.max(MIN_WALL_LENGTH, num(depth, 3000));
    const a = pts[0];
    const b = pts[1];
    return [
      { x: round4(a.x), y: round4(a.y) },
      { x: round4(b.x), y: round4(b.y) },
      { x: round4(b.x + nx * d), y: round4(b.y + ny * d) },
      { x: round4(a.x + nx * d), y: round4(a.y + ny * d) },
    ];
  }
  return pts.map((p) => ({ ...p }));
}

/**
 * How many of the resulting room's walls this draft actually DREW.
 *
 * A closed outline drew all of them. An open chain of k segments drew k, and
 * the rest of the polygon is the edge that had to exist for the floor to be cut
 * from something. The plan draws those in grey, which is the same grammar
 * turn 14's stubs already use — a wall nobody typed does not carry a number.
 */
export function drawnWallCount(draft) {
  const segs = draftSegments(draft);
  if (!segs.length) return 0;
  return isClosed(draft) ? segs.length : segs.length;
}

/**
 * A draft READ BACK OFF a room, so the editor can be re-entered on a room that
 * already exists instead of only ever starting from nothing.
 *
 * Every corner list is a chain of segments — that is the whole of turn 50's
 * claim about rooms — so this is a walk and not a conversion.
 */
export function draftFromCorners(corners) {
  const pts = (Array.isArray(corners) ? corners : [])
    .map((c) => ({ x: num(c?.x, 0), y: num(c?.y, 0) }));
  if (pts.length < 2) return newDraft({ x: 0, y: 0 });
  const closed = [...pts, pts[0]];
  const segments = [];
  for (let i = 1; i < closed.length; i += 1) {
    const dx = closed[i].x - closed[i - 1].x;
    const dy = closed[i].y - closed[i - 1].y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) continue;
    segments.push(fitSegment({ deg: (Math.atan2(dy, dx) * 180) / Math.PI, length }));
  }
  return { ...newDraft(pts[0]), segments };
}

/** A rectangle as a DRAFT — four segments, so the editor can show one. */
export function rectDraft(width, depth) {
  return draftFromCorners(rectCorners(width, depth));
}
