// ─── T75 F1 · THE CORNER RULEBOOK, ONE MODULE ──────────────────────────────
//
// The owner, 9.10.2026: *"daj od razu narożniki przemyślane."*
//
// A real kitchen and a real fitted wardrobe close an internal corner in one of
// three ways, and every consumer that has to know which (the runs, the plinth,
// the cornice, the worktop, the front clearance, the corner stop) asks THIS
// module and nothing else. No second corner detection anywhere: CLAUDE.md T75
// F1, *"Every consumer below ... reads THIS module."*
//
// ─── WHAT A CORNER IS ──────────────────────────────────────────────────────
//
// Walls are a closed ring (`room.js roomWalls`): wall i runs from corner i to
// corner i+1, so wall i's END meets wall i+1's START. That shared point is an
// INTERNAL corner when the next wall turns into the room (a rectangle's four,
// an L room's five) and an outside one (the L room's sixth) when it turns away.
// Furniture meets furniture only at an internal corner.
//
// Two runs MEET at a corner when the end unit of the run on one wall and the
// end unit of the run on the adjacent wall stand at that corner with their
// depth bands overlapping (the test `collision.js wallObstacles` makes when it
// flags `corner: true`): one of the two OCCUPIES the corner square, the one
// whose back runs into the corner along its own wall (wall A), and the other
// (wall B) stops on A's face. Which wall is A is therefore a fact about where
// the units stand, never about the walls' numbering.
//
// ─── THE FOUR ANSWERS ──────────────────────────────────────────────────────
//
//   'blind'  the occupant is a BLIND kit (F3): its blank hides behind run B.
//   'L'      the occupant is an L carcass (F4): both runs stop on its arms.
//   'post'   the occupant is a plain unit and run B stands on the corner stop
//            with a CORNER POST beside it (F2): the corner is dead space.
//   'none'   two plain units and no post: the door at the corner cannot open.
//            A CHECK, in words, naming both units. The engine never guesses a
//            post for a job that has not asked for one.
//
// EXTERNAL corners (an island's four, F9) come back from the same function
// with `kind: 'external'`: the faces of one island meet there, nothing is
// occupied, and only the plinth (a 45 degree mitre, F6) asks about them.
//
// Pure functions and pure data. No React, no store, no three.js.

import { getUnitType } from './types.js';
import { wallGapOf, unitBase } from './runs.js';

const EPS = 1e-6;

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
// Read where a wall is turned off its wall, the same test `buildRuns` makes.
const alongWall = (unit) => !((num(unit?.position?.rotation_deg)) % 360);

/** The workshop's corner numbers, defensively read (T75 proposed, owner to confirm). */
export function cornerSpec(profile) {
  const c = profile?.corner || {};
  return {
    postMm: num(c.postMm, 50),
    overlap: c.overlap === 'own' ? 'own' : 'adjacent',
    // How far from a corner a unit can stand and still be the one AT it: the
    // front-clearance rulebook's own neighbour reach, so "beside" means one
    // thing in this app.
    reachMm: num(profile?.doors?.neighbourReachMm, 200),
  };
}

/**
 * How far a unit's FRONT FACE stands from the wall behind it: its own wall gap,
 * its carcass, the door gap and its front. The same sum the run's returns use
 * (`projectStore.refreshAutoParts frontFaceDepthOf`), said once here for the
 * corner: CLAUDE.md T75 F2's `d_A_face`.
 */
export function cornerFaceMm(unit, profile) {
  const depth = num(unit?.params?.depth);
  const frontT = num(unit?.params?.front_t, num(profile?.front?.thickness));
  const gap = num(profile?.doors?.gap);
  return wallGapOf(unit, profile) + depth + gap + frontT;
}

/** How far a unit's CARCASS reaches from the wall behind it: its gap and its depth. */
export function carcassReachMm(unit, profile) {
  return wallGapOf(unit, profile) + num(unit?.params?.depth);
}

/**
 * THE CORNER STOP (F2): how far along wall B, measured from the corner, a unit
 * on B stops when wall A's run ends at that corner in a blind kit or a plain
 * unit: A's face plus the post. An L occupant is its own stop (its arm end),
 * which is its footprint, so it returns null and the ordinary collision clamp
 * answers.
 */
export function cornerStopMm(occupant, profile) {
  const type = getUnitType(occupant?.type);
  if (type.corner) return null;
  return cornerFaceMm(occupant, profile) + cornerSpec(profile).postMm;
}

/** Is this wall one of the room's own (not an island face, F9)? */
const isRoomWall = (wall) => !wall?.island;

/**
 * Does the next wall turn INTO the room at the end of this one? With `inward`
 * pointing at the room, the next wall runs along this wall's inward normal at
 * an internal corner and against it at an outside one.
 */
export function isInternalCorner(wallA, wallB) {
  const dot = wallA.inward.x * wallB.along.x + wallA.inward.y * wallB.along.y;
  return dot > 0.5;
}

/** The vertical band a unit occupies, floor up. */
function bandOf(unit, profile) {
  const base = unitBase(unit, profile);
  return { from: base, to: base + num(unit?.params?.height) };
}

const bandsMeet = (a, b) => Math.min(a.to, b.to) - Math.max(a.from, b.from) > 1;

/** The unit on `wall` whose END is nearest the wall's end (the corner), per band. */
function endUnits(units, wallIndex, which, wallLength) {
  return units
    .filter((u) => (u.position?.wall ?? 0) === wallIndex && alongWall(u))
    .map((u) => {
      const x = num(u.position?.x_mm);
      const w = num(u.params?.width);
      // Distance from this unit's corner-facing end to the corner, along its wall.
      const gap = which === 'end' ? wallLength - (x + w) : x;
      return { unit: u, gap };
    });
}

/**
 * Which kind of unit occupies a corner square, by its type.
 */
export function occupantKind(unit) {
  const type = getUnitType(unit?.type);
  if (type.corner) return 'L';
  if (type.blind) return 'blind';
  return 'plain';
}

/**
 * Does unit `b` carry the corner post on the side facing this corner?
 * The post is the store's auto-part (`params.corner_post_left_mm` /
 * `params.corner_post_right_mm`, F2), written when `b` lands on the stop.
 */
function hasCornerPost(unit, side) {
  const key = side === 'left' ? 'corner_post_left_mm' : 'corner_post_right_mm';
  return num(unit?.params?.[key]) > 0;
}

/**
 * EVERY CORNER in the room, internal and external.
 *
 * @param {object} args
 *   units    the store's units (`{ id, type, params, position }`)
 *   walls    `roomWalls(room)`, real walls first, island faces after (F9)
 *   profile
 * @returns {Array<{
 *   corner: {x:number, y:number}, kind: 'internal'|'external',
 *   wallA: number, wallB: number,
 *   runA: {wall:number, unitId:string, side:'left'|'right', gapMm:number}|null,
 *   runB: {wall:number, unitId:string, side:'left'|'right', gapMm:number}|null,
 *   level: {from:number, to:number}|null,
 *   faceMm: number|null, stopMm: number|null,
 *   solution: 'blind'|'L'|'post'|'none'|null,
 *   island?: string,
 * }>}
 */
export function cornersOf({ units = [], walls = [], profile }) {
  const spec = cornerSpec(profile);
  const out = [];
  const room = walls.filter(isRoomWall);
  const n = room.length;

  // ── INTERNAL: wall i's end meets wall i+1's start ──
  for (let i = 0; i < n && n >= 2; i += 1) {
    const wa = room[i];
    const wb = room[(i + 1) % n];
    if (!isInternalCorner(wa, wb)) continue;
    const corner = { x: wa.end.x, y: wa.end.y };
    const onA = endUnits(units, wa.index, 'end', num(wa.width));
    const onB = endUnits(units, wb.index, 'start', num(wb.width));
    const pairs = [];
    for (const a of onA) {
      for (const b of onB) {
        const bandA = bandOf(a.unit, profile);
        const bandB = bandOf(b.unit, profile);
        if (!bandsMeet(bandA, bandB)) continue;
        // Who occupies the corner square: the unit whose own end runs into the
        // corner (within the reach), with the other standing beyond its face.
        // The other stands beyond the occupant's CARCASS (collision keeps it
        // there) and not further than its face, the post and the reach.
        const faceA = cornerFaceMm(a.unit, profile);
        const faceB = cornerFaceMm(b.unit, profile);
        const backA = carcassReachMm(a.unit, profile);
        const backB = carcassReachMm(b.unit, profile);
        // Beyond the stop the two are a gap, not a corner: nothing meets there.
        const slack = 1 + num(profile?.editor?.minUnitGap);
        const limitOf = (occupant, face, back) => (getUnitType(occupant.type).corner
          ? back + slack
          : face + spec.postMm + slack);
        let occ = null;
        if (a.gap <= spec.reachMm && b.gap >= backA - 1 && b.gap <= limitOf(a.unit, faceA, backA)) {
          occ = 'a';
        } else if (b.gap <= spec.reachMm && a.gap >= backB - 1 && a.gap <= limitOf(b.unit, faceB, backB)) {
          occ = 'b';
        }
        if (!occ) continue;
        pairs.push({ a, b, occ, level: { from: Math.max(bandA.from, bandB.from), to: Math.min(bandA.to, bandB.to) } });
      }
    }
    // One answer per corner per level: the closest pair wins.
    const seen = new Set();
    pairs.sort((p, q) => (p.a.gap + p.b.gap) - (q.a.gap + q.b.gap));
    for (const p of pairs) {
      const key = `${p.a.unit.id}|${p.b.unit.id}`;
      if (seen.has(p.a.unit.id) || seen.has(p.b.unit.id) || seen.has(key)) continue;
      seen.add(p.a.unit.id); seen.add(p.b.unit.id); seen.add(key);
      // Relabel so A is ALWAYS the occupant's wall.
      const occA = p.occ === 'a';
      const occupant = occA ? p.a : p.b;
      const other = occA ? p.b : p.a;
      const wallA = occA ? wa.index : wb.index;
      const wallB = occA ? wb.index : wa.index;
      // The occupant's corner-facing end, in its own frame: wall i's END is a
      // unit's right (larger x), wall i+1's START is its left.
      const sideA = occA ? 'right' : 'left';
      const sideB = occA ? 'left' : 'right';
      const kind = occupantKind(occupant.unit);
      const faceMm = kind === 'L' ? null : cornerFaceMm(occupant.unit, profile);
      const stopMm = cornerStopMm(occupant.unit, profile);
      let solution;
      if (kind === 'L') solution = 'L';
      else if (kind === 'blind') solution = 'blind';
      else if (hasCornerPost(other.unit, sideB)) solution = 'post';
      else solution = 'none';
      out.push({
        corner,
        kind: 'internal',
        wallA,
        wallB,
        runA: { wall: wallA, unitId: occupant.unit.id, side: sideA, gapMm: round2(occupant.gap) },
        runB: { wall: wallB, unitId: other.unit.id, side: sideB, gapMm: round2(other.gap) },
        level: p.level,
        faceMm: faceMm == null ? null : round2(faceMm),
        stopMm: stopMm == null ? null : round2(stopMm),
        solution,
      });
    }
  }

  // ── EXTERNAL: the four corners of every island (F9) ──
  const byIsland = new Map();
  for (const w of walls) {
    if (!w?.island) continue;
    if (!byIsland.has(w.island)) byIsland.set(w.island, []);
    byIsland.get(w.island).push(w);
  }
  for (const [island, faces] of byIsland) {
    const ring = [...faces];
    for (let i = 0; i < ring.length; i += 1) {
      const fa = ring[i];
      const fb = ring[(i + 1) % ring.length];
      out.push({
        corner: { x: fa.end.x, y: fa.end.y },
        kind: 'external',
        island,
        wallA: fa.index,
        wallB: fb.index,
        runA: null,
        runB: null,
        level: null,
        faceMm: null,
        stopMm: null,
        solution: null,
      });
    }
  }
  return out;
}

function round2(v) { return Math.round(Number(v) * 100) / 100; }

/**
 * The CHECK for a corner left without an answer (F1): two plain units, no
 * post, the door at the corner cannot open. In words, naming both units.
 */
export function cornerChecks(corners, nameOf = (id) => id) {
  const out = [];
  for (const c of corners || []) {
    if (c.kind !== 'internal' || c.solution !== 'none') continue;
    const a = nameOf(c.runA.unitId);
    const b = nameOf(c.runB.unitId);
    out.push({
      unitIds: [c.runA.unitId, c.runB.unitId],
      corner: c,
      message: `${a} and ${b} meet in the corner with nothing between them: the door at the corner `
        + `cannot open. Stand ${b} on the corner stop (a corner post), or use a blind corner or an L corner unit.`,
    });
  }
  return out;
}

/**
