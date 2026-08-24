// ─── THE WALL, SEEN FROM THE FRONT (turn 44, CLAUDE.md F1) ──────────────────
//
// The owner, 23.08.2026: *"One wall is the FIRST card"* — and choosing it opens
// an ELEVATION, not a plan. A joiner standing in front of a wall does not think
// in corner coordinates; he thinks "the window starts 900 up and the ceiling
// comes down over the last metre".
//
// So this module is the arithmetic of that picture, and it is deliberately
// PURE — no React, no store, no three.js — for the same reason `engine/room.js`
// is: the rules have to be testable in node, and the editor has to be a hand on
// top of them rather than a second set of rules.
//
// ─── ONE WALL SCHEMA, NO TWIN (CLAUDE.md F1) ────────────────────────────────
//
// DOORS and WINDOWS are `room.openings` — the list the Room path has used since
// turn 3, with the same `{ id, kind, wall, x_mm, width, height, sill }` shape
// and the same `clampOpening` behind it. Nothing here re-implements them; the
// elevation READS them and hands back rectangles.
//
// A SLOPE is the one element the room schema has never carried, and iron rule 2
// closes `src/engine/**` for the night byte-for-byte — `migrateRoom` is an
// exhaustive whitelist, so a `room.slopes` key would be dropped on the way
// through it. It therefore lives on the PROJECT, as `project.wallSlopes`, keyed
// by the SAME wall index the openings use. That is the twin the rule forbids
// avoided rather than created: one wall, one index, two lists, and this module
// is the only place that knows there are two.
//
// Coordinates: millimetres, x along the wall from its start corner, y UP from
// the floor. That is the elevation the drawings already publish
// (`engine/drawings/wallElevation.js`) and the one a tape measure gives.
//
// ─── TURN 45 (CLAUDE.md F1): THE SAME LIST GROWS TWO MORE KINDS ─────────────
//
// *"Top = the wall seen from above: wall line, depth zone, and two NEW
// draggable elements — `Recess` and `Chimney` (rectangles with width + depth,
// double-click for numbers). Stored on the same wall model."*
//
// STORED ON THE SAME WALL MODEL is the clause that shapes this file. A recess
// and a chimney are not slopes, but they are the same KIND of fact: a thing
// this wall has, at a position along it, that a cabinet will one day have to be
// clamped around. So the list T44 opened for slopes takes all three, keyed by
// the same wall index, normalised by one function and read by one editor.
//
// The store key is still `project.wallSlopes`. That name is T44's and it is now
// half a lie, but a schema rename would strand every project saved between the
// two turns for the sake of a word — and T44's own note already says where this
// list is going ("the day the engine reopens, it moves into the room beside
// `boxes`"). It is renamed there, once, when it moves.
//
// A PLAN element is `{ id, kind, wall, x_mm, width, depth }`: x along the wall
// exactly as an opening's is, and DEPTH out from the wall line — which is the
// second axis the elevation does not have and the whole reason the top view
// exists. The engine ignores both this turn: they are geometry for the eye, and
// for the unit clamping a later turn will read them for.

import { ceilingAt } from './slopeLine.js';

/** What a slope starts life as: the ceiling drops on the RIGHT, over a metre. */
export const SLOPE_DEFAULTS = { side: 'R', startHeight: 1800, run: 900 };

/** The three things a wall can carry, in this module's own vocabulary. */
export const WALL_ELEMENT_KINDS = ['slope', 'recess', 'chimney'];

/** The two the TOP view adds (T45 F1b), and what they start life as. */
export const PLAN_KINDS = ['recess', 'chimney'];
export const RECESS_DEFAULTS = { width: 900, depth: 300 };
export const CHIMNEY_DEFAULTS = { width: 600, depth: 350 };
export const PLAN_DEFAULTS = { recess: RECESS_DEFAULTS, chimney: CHIMNEY_DEFAULTS };

/** How small an element may be made before the editor refuses to shrink it. */
export const MIN_ELEMENT_MM = 50;

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const round4 = (v) => Math.round(v * 1e4) / 1e4;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** A stable id for a new element, in the house's own grammar. */
export function newElementId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * A slope, from anything: the side is L or R, the numbers are real and never
 * negative, and the wall index is an integer.
 *
 * Returns null for a record that names no wall — a slope with nowhere to be is
 * not a slope, and dropping it here is what keeps every reader below simple.
 */
export function migrateSlope(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const wall = Math.trunc(num(raw.wall, 0));
  if (!(wall >= 0)) return null;
  return {
    id: String(raw.id || newElementId('slope')),
    kind: 'slope',
    wall,
    side: raw.side === 'L' ? 'L' : 'R',
    startHeight: round4(Math.max(0, num(raw.startHeight, SLOPE_DEFAULTS.startHeight))),
    run: round4(Math.max(0, num(raw.run, SLOPE_DEFAULTS.run))),
  };
}

/**
 * A PLAN element — a recess or a chimney — from anything.
 *
 * A recess is a bite OUT of the wall (an alcove); a chimney is a lump standing
 * PROUD of it. Both are a rectangle in plan: how wide, and how deep. The sign
 * of the depth is not stored — the KIND says which way it goes, and a stored
 * −300 would be a second way to say the same thing.
 */
export function migratePlanElement(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = PLAN_KINDS.includes(raw.kind) ? raw.kind : null;
  if (!kind) return null;
  const wall = Math.trunc(num(raw.wall, 0));
  if (!(wall >= 0)) return null;
  const d = PLAN_DEFAULTS[kind];
  return {
    id: String(raw.id || newElementId(kind)),
    kind,
    wall,
    x_mm: round4(Math.max(0, num(raw.x_mm, 0))),
    width: round4(Math.max(MIN_ELEMENT_MM, num(raw.width, d.width))),
    depth: round4(Math.max(MIN_ELEMENT_MM, num(raw.depth, d.depth))),
  };
}

/** One stored wall element, whatever kind it is. */
export function migrateWallElement(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (PLAN_KINDS.includes(raw.kind)) return migratePlanElement(raw);
  // Anything else is read as a SLOPE, which is what the whole list was before
  // this turn — so a project saved by T44, whose records carry no `kind` at
  // all, opens with its slopes exactly where it left them.
  return migrateSlope(raw);
}

/** Every stored wall element, normalised — the reader the store keeps. */
export function wallElements(list) {
  return (Array.isArray(list) ? list : []).map(migrateWallElement).filter(Boolean);
}

/** Every stored slope, normalised — the reader the store and the editor share. */
export function wallSlopes(list) {
  return wallElements(list).filter((el) => el.kind === 'slope');
}

/** The plan elements of ONE wall, left to right. */
export function planElementsOnWall(list, wallIndex) {
  const index = Math.trunc(num(wallIndex, 0));
  return wallElements(list)
    .filter((el) => PLAN_KINDS.includes(el.kind) && el.wall === index)
    .sort((a, b) => a.x_mm - b.x_mm);
}

/** A plan element pulled back into its wall — the same courtesy a window gets. */
export function clampPlanElement(el, { wallWidth }) {
  const p = migratePlanElement(el);
  if (!p) return null;
  const w = Math.max(0, num(wallWidth, 0));
  const width = round4(Math.min(p.width, w || p.width));
  return {
    ...p,
    width,
    x_mm: round4(clamp(p.x_mm, 0, Math.max(0, (w || p.x_mm + width) - width))),
  };
}

/**
 * Move a plan element: along the wall, and in or out of it.
 *
 * @returns the patch for that element, never a whole list.
 */
export function movePlanElement(el, { dxMm = 0, ddMm = 0 }, { wallWidth }) {
  const p = migratePlanElement(el);
  if (!p) return {};
  const w = Math.max(0, num(wallWidth, 0));
  const x = clamp(p.x_mm + num(dxMm, 0), 0, Math.max(0, w - p.width));
  const depth = Math.max(MIN_ELEMENT_MM, p.depth + num(ddMm, 0));
  return { x_mm: round4(x), depth: round4(depth) };
}

/** The slopes of ONE wall, in a stable order. */
export function slopesOnWall(list, wallIndex) {
  return wallSlopes(list)
    .filter((s) => s.wall === (Number(wallIndex) || 0))
    .sort((a, b) => (a.side === b.side ? a.run - b.run : (a.side === 'L' ? -1 : 1)));
}

/**
 * A slope pulled back into its wall: it never runs past the far end and it
 * never starts above the ceiling. The same courtesy `clampOpening` does for a
 * window, and for the same reason — a number typed into a field is a guess
 * until the wall has had its say.
 */
export function clampSlope(slope, { wallWidth, wallHeight }) {
  const s = migrateSlope(slope);
  if (!s) return null;
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  return {
    ...s,
    run: round4(clamp(s.run, 0, w || s.run)),
    startHeight: round4(clamp(s.startHeight, 0, h || s.startHeight)),
  };
}

/**
 * The triangle a slope takes OUT of the wall, in elevation millimetres.
 *
 * `side` is the end the ceiling comes down at; `startHeight` is how high the
 * wall still is at that end; `run` is how far along it takes to reach full
 * height. The polygon returned is the piece of wall that is NOT there.
 */
export function slopePolygon(slope, { wallWidth, wallHeight }) {
  const s = clampSlope(slope, { wallWidth, wallHeight });
  if (!s) return [];
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  if (s.side === 'L') {
    return [{ x: 0, y: s.startHeight }, { x: s.run, y: h }, { x: 0, y: h }];
  }
  return [{ x: w, y: s.startHeight }, { x: w - s.run, y: h }, { x: w, y: h }];
}

/**
 * How high the wall still is at a point along it — full height everywhere the
 * slopes do not reach. What a cabinet would have to duck under, and what the
 * elevation draws its ceiling line from.
 *
 * ─── TURN 46: THE LERP LEAVES THIS FILE ─────────────────────────────────────
 *
 * CLAUDE.md, 24.08: *"`ceilingAt(x)` is THAT function — write it ONCE
 * (`lib/slopeLine.js` or beside `wallElements`), and every consumer below
 * imports it. Two independent lerps in two files is the two-chain disease and
 * fails the turn."*
 *
 * It used to lerp here, and `3d/Room.jsx` lerped a second time for the wall
 * mesh — two chains, and the owner's screenshot is what a room looks like when
 * they disagree. The arithmetic now lives in `lib/slopeLine.js` and this is a
 * one-line call into it: the SAME numbers to the last decimal (this function's
 * turn-44 tests are unchanged and still pass), from one place.
 */
export function wallHeightAt(xMm, slopes, { wallWidth, wallHeight }) {
  return ceilingAt(xMm, wallSlopes(slopes), { wallWidth, wallHeight });
}

/**
 * Every element of one wall as an elevation RECTANGLE (a slope comes back with
 * its polygon instead), ready for an SVG that knows nothing about rooms.
 *
 * @param {object} args
 *   openings    room.openings — already clamped by the caller, or raw
 *   slopes      project.wallSlopes
 *   wallIndex   which wall
 *   wallWidth   mm
 *   wallHeight  mm
 */
export function elevationElements({
  openings = [], slopes = [], wallIndex = 0, wallWidth = 0, wallHeight = 0,
} = {}) {
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const index = Math.trunc(num(wallIndex, 0));
  const out = [];

  for (const o of Array.isArray(openings) ? openings : []) {
    if (Math.trunc(num(o?.wall, 0)) !== index) continue;
    const kind = o.kind === 'door' ? 'door' : 'window';
    const width = Math.max(MIN_ELEMENT_MM, num(o.width, 0));
    const height = Math.max(MIN_ELEMENT_MM, num(o.height, 0));
    const y = kind === 'door' ? 0 : Math.max(0, num(o.sill, 0));
    out.push({
      id: String(o.id || newElementId('op')),
      kind,
      x: round4(clamp(num(o.x_mm, 0), 0, Math.max(0, w - width))),
      y: round4(y),
      w: round4(Math.min(width, w || width)),
      h: round4(Math.min(height, Math.max(0, (h || height) - y) || height)),
    });
  }

  for (const raw of slopesOnWall(slopes, index)) {
    const s = clampSlope(raw, { wallWidth: w, wallHeight: h });
    out.push({
      id: s.id,
      kind: 'slope',
      side: s.side,
      startHeight: s.startHeight,
      run: s.run,
      points: slopePolygon(s, { wallWidth: w, wallHeight: h }),
    });
  }

  return out;
}

/**
 * Move an element along the wall (and, for a window, up and down it).
 *
 * Doors stand on the floor, so a door only ever travels sideways — the same
 * rule `clampOpening` states, said once more here because a DRAG is where the
 * temptation to lift one comes from.
 *
 * @returns the patch for that opening, never a whole list.
 */
export function moveOpening(opening, { dxMm = 0, dyMm = 0 }, { wallWidth, wallHeight }) {
  const kind = opening?.kind === 'door' ? 'door' : 'window';
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const width = Math.max(MIN_ELEMENT_MM, num(opening?.width, 0));
  const height = Math.max(MIN_ELEMENT_MM, num(opening?.height, 0));
  const x = clamp(num(opening?.x_mm, 0) + num(dxMm, 0), 0, Math.max(0, w - width));
  if (kind === 'door') return { x_mm: round4(x) };
  const sill = clamp(num(opening?.sill, 0) + num(dyMm, 0), 0, Math.max(0, h - height));
  return { x_mm: round4(x), sill: round4(sill) };
}

/** A slope dragged sideways is a slope whose RUN changes — the ridge moves. */
export function dragSlope(slope, dxMm, { wallWidth, wallHeight }) {
  const s = migrateSlope(slope);
  if (!s) return null;
  const towards = s.side === 'L' ? 1 : -1;
  return clampSlope({ ...s, run: s.run + towards * num(dxMm, 0) }, { wallWidth, wallHeight });
}

/**
 * Is this wall drawable? A wall with no width or no height has no elevation,
 * and an editor that pretended otherwise would divide by zero somewhere.
 */
export function wallElevationIssues({ wallWidth, wallHeight }) {
  const issues = [];
  if (!(num(wallWidth, 0) > 0)) issues.push('The wall has no width.');
  if (!(num(wallHeight, 0) > 0)) issues.push('The wall has no height.');
  return issues;
}

// ─── F1a: THE DIMENSION CHAINS, EXACTLY AS HIS RED PEN (turn 45) ────────────
//
// *"Live dimension chains exactly as his red pen: top = wall width + the
// slope's run segment; right edge = slope drop + the wall stub under it;
// left = full height; bottom = width. They follow every drag live."*
//
// He drew them on a screenshot: four chains round the elevation, each broken
// where the wall is broken. The TOP one is the interesting one — it is the wall
// width, and then the slope's RUN called out separately, because the run is the
// number a joiner needs and the one nothing on the screen was saying.
//
// The chains are arithmetic, so they are here rather than in the SVG. "They
// follow every drag live" is then free: the editor re-renders from the store on
// every pointer move, this function is called with the new numbers, and there is
// no second copy of the geometry to forget to update.

/** One measured segment of a chain, in elevation millimetres. */
function seg(id, from, to, label = null) {
  return {
    id, from: round4(from), to: round4(to), mm: round4(Math.abs(to - from)), label,
  };
}

/**
 * The four chains, for a wall of this size carrying these slopes.
 *
 * @returns {{top:Array, right:Array, left:Array, bottom:Array}} each an array of
 *   segments measured ALONG that edge — x for top and bottom, y for left and
 *   right — so an SVG can draw them without knowing what any of them mean.
 */
export function elevationDimensionChains({
  wallWidth = 0, wallHeight = 0, slopes = [], wallIndex = 0,
} = {}) {
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const list = slopesOnWall(slopes, wallIndex)
    .map((sl) => clampSlope(sl, { wallWidth: w, wallHeight: h }))
    .filter((sl) => sl && sl.run > 0);

  // ── TOP: the wall width, and the slope's run called out under it ──
  const top = [seg('top-width', 0, w, 'wall width')];
  for (const sl of list) {
    top.push(sl.side === 'L'
      ? seg(`top-run-${sl.id}`, 0, sl.run, 'slope run')
      : seg(`top-run-${sl.id}`, w - sl.run, w, 'slope run'));
  }

  // ── RIGHT: the slope's DROP, and the wall STUB standing under it ──
  //
  // Only a slope on THIS edge breaks it. A wall whose ceiling comes down on the
  // left has a right edge that is simply its full height, and the chain says
  // so with one segment rather than with two that add up to the same thing.
  const onRight = list.find((sl) => sl.side === 'R') || null;
  const right = onRight
    ? [
      seg(`right-drop-${onRight.id}`, onRight.startHeight, h, 'slope drop'),
      seg(`right-stub-${onRight.id}`, 0, onRight.startHeight, 'wall under it'),
    ]
    : [seg('right-height', 0, h, 'height')];

  // ── LEFT: the full height … unless the ceiling comes down on THIS side ──
  const onLeft = list.find((sl) => sl.side === 'L') || null;
  const left = onLeft
    ? [
      seg(`left-drop-${onLeft.id}`, onLeft.startHeight, h, 'slope drop'),
      seg(`left-stub-${onLeft.id}`, 0, onLeft.startHeight, 'wall under it'),
    ]
    : [seg('left-height', 0, h, 'full height')];

  // ── BOTTOM: the width, said again where a tape measure would lie ──
  const bottom = [seg('bottom-width', 0, w, 'width')];

  return {
    top, right, left, bottom,
  };
}

/** Every segment of every chain, flat — what a DOM audit counts. */
export function allDimensionSegments(chains) {
  const c = chains || {};
  return [...(c.top || []), ...(c.right || []), ...(c.left || []), ...(c.bottom || [])];
}
