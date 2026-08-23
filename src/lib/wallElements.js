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

/** What a slope starts life as: the ceiling drops on the RIGHT, over a metre. */
export const SLOPE_DEFAULTS = { side: 'R', startHeight: 1800, run: 900 };

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

/** Every stored slope, normalised — the reader the store and the editor share. */
export function wallSlopes(list) {
  return (Array.isArray(list) ? list : []).map(migrateSlope).filter(Boolean);
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
 */
export function wallHeightAt(xMm, slopes, { wallWidth, wallHeight }) {
  const w = Math.max(0, num(wallWidth, 0));
  const h = Math.max(0, num(wallHeight, 0));
  const x = clamp(num(xMm, 0), 0, w);
  let top = h;
  for (const raw of wallSlopes(slopes)) {
    const s = clampSlope(raw, { wallWidth: w, wallHeight: h });
    if (!s || s.run <= 0) continue;
    if (s.side === 'L') {
      if (x <= s.run) top = Math.min(top, s.startHeight + ((h - s.startHeight) * x) / s.run);
    } else if (x >= w - s.run) {
      top = Math.min(top, s.startHeight + ((h - s.startHeight) * (w - x)) / s.run);
    }
  }
  return round4(top);
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
