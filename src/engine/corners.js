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
        // T75 F10 · face A's length, so the plinth knows which run reaches it.
        widthA: fa.width,
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
 * T75 F3 · which END of a unit stands at an internal corner of its wall, if
 * either: 'right' when its right end is within the reach of the wall's end and
 * the next wall turns into the room there, 'left' for the start. Asked of a
 * blind kit with no run beside it yet, so its blank faces the corner it stands
 * in before anything stops on it.
 */
export function cornerEndOf(unit, walls, profile) {
  if (!alongWall(unit)) return null;
  const room = (walls || []).filter(isRoomWall);
  const n = room.length;
  const i = room.findIndex((w) => w.index === (unit.position?.wall ?? 0));
  if (i < 0 || n < 2) return null;
  const spec = cornerSpec(profile);
  const x = num(unit.position?.x_mm);
  const w = num(unit.params?.width);
  const here = room[i];
  if (num(here.width) - (x + w) <= spec.reachMm && isInternalCorner(here, room[(i + 1) % n])) return 'right';
  if (x <= spec.reachMm && isInternalCorner(room[(i - 1 + n) % n], here)) return 'left';
  return null;
}

/**
 * T75 F3 · THE BLIND KIT AS THE FRONT-CLEARANCE RULEBOOK SEES IT.
 *
 * The rulebook (`frontClearance.js`, the fronts branch's file) measures a
 * front's clearance from its own CARCASS END. A blind kit's leaf does not end
 * at its carcass end on the blank's side: it ends at the BLANK, a fixed front
 * piece standing where the next run hides the carcass. So the clearance view
 * hands the rulebook what the leaf actually stands beside: a carcass that
 * starts where the blank ends, with the blank as a rigid neighbour on that
 * side (rule 2, the end panel's), and the leaf where it really is in the room.
 * Every other unit passes through untouched.
 *
 * @param {Array<{unit:object, result:object}>} entries
 * @returns {{entries: Array, units: Array}}
 */
export function blindClearanceView(entries) {
  const out = [];
  for (const e of entries || []) {
    const blank = (e?.result?.panels || []).find((p) => p?.role === 'blind_blank' && p.box);
    if (!blank) { out.push(e); continue; }
    const t = num(blank.w);
    const left = blank.meta?.side !== 'right';
    const x = num(e.unit.position?.x_mm);
    const unit = {
      ...e.unit,
      position: { ...e.unit.position, x_mm: left ? x + t : x },
      params: {
        ...e.unit.params,
        width: num(e.unit.params?.width) - t,
        end_panels: [
          ...(e.unit.params?.end_panels || []).filter((ep) => (ep?.side === 'R') === left),
          { id: 'blind-blank', side: left ? 'L' : 'R', thickness: t },
        ],
      },
    };
    const panels = (e.result.panels || [])
      .filter((p) => p !== blank)
      .map((p) => (left && p.box ? { ...p, box: { ...p.box, x: p.box.x - t } } : p));
    out.push({ ...e, unit, result: { ...e.result, panels } });
  }
  return { entries: out, units: out.map((e) => e.unit) };
}


/**
 * T75 F4 · THE L CARCASS AS THE FRONT-CLEARANCE RULEBOOK SEES IT.
 *
 * An L stands on TWO walls and its two leaves face two ways; the rulebook
 * (`frontClearance.js`, the fronts branch's file) measures a front in ONE
 * wall's frame against its own carcass end. So the view hands it each ARM as a
 * unit on its own wall: arm A on the unit's wall, its opening from the inner
 * corner line to SIDE-A; arm B on the adjacent wall (the one meeting the
 * unit's corner end), its opening from the inner corner line to SIDE-B. Each
 * leaf keeps its own `meta.cornerEdge` (the covered and the overlapping edge,
 * rule 7's two kinds), so the corner edge is measured by the L's own law and
 * the OUTER edge meets whatever stands beside it on that wall: rule 1 against
 * a neighbour's front, a wall, an end panel, as for any unit. Both arms keep
 * the L's id, so a Check names the L and a healing trim lands on its params.
 * Every other entry passes through untouched.
 *
 * @param {{entries:Array, units:Array}} view  `blindClearanceView`'s answer
 * @param {Array} walls  `roomWalls(room)`
 * @returns {{entries: Array, units: Array}}
 */
export function lClearanceView(view, walls, profile) {
  const room = (walls || []).filter(isRoomWall);
  const n = room.length;
  const entries = [];
  for (const e of view?.entries || []) {
    const lc = e?.result?.derived?.corner_l;
    if (!lc || !getUnitType(e.unit?.type).corner || !alongWall(e.unit) || n < 2) { entries.push(e); continue; }
    const i = room.findIndex((w) => w.index === (e.unit.position?.wall ?? 0));
    if (i < 0) { entries.push(e); continue; }
    const left = lc.side !== 'right';
    const W = num(lc.width);
    const D = num(lc.depth);
    const d = num(lc.arm);
    const x = num(e.unit.position?.x_mm);
    const gap = wallGapOf(e.unit, profile);
    const doorOf = (arm) => (e.result.panels || []).find((p) => p?.meta?.arm === arm && p.role === 'front' && p.box);
    // Arm A: the unit's own wall, the virtual frame moved to the arm's start.
    const fromA = left ? d : 0;
    const doorA = doorOf('A');
    entries.push({
      ...e,
      unit: {
        ...e.unit,
        position: { ...e.unit.position, x_mm: x + fromA },
        params: { ...e.unit.params, width: W - d },
      },
      result: {
        ...e.result,
        panels: doorA ? [{ ...doorA, box: { ...doorA.box, x: doorA.box.x - fromA } }] : [],
      },
    });
    // Arm B: the adjacent wall, where the corner end meets it.
    const wb = left ? room[(i - 1 + n) % n] : room[(i + 1) % n];
    const doorB = doorOf('B');
    const b = doorB?.box;
    entries.push({
      ...e,
      unit: {
        ...e.unit,
        position: {
          ...e.unit.position,
          wall: wb.index,
          x_mm: left ? num(wb.width) - gap - D : gap + d,
        },
        // Its back (BACK-B) stands where the L's corner end stands off wall B.
        // The L's own end pieces (fillers, end panels, posts) stand on wall A,
        // so arm B carries none of them onto wall B.
        params: {
          ...e.unit.params,
          width: D - d,
          wall_gap: left ? x : num(room[i].width) - x - W,
          side_infill_left_mm: 0,
          side_infill_right_mm: 0,
          end_panels: [],
          corner_post_left_mm: 0,
          corner_post_right_mm: 0,
        },
      },
      result: {
        ...e.result,
        panels: b ? [{
          ...doorB,
          box: left
            ? { x: D - b.z - b.d, y: b.y, z: b.x, w: b.d, h: b.h, d: b.w }
            : { x: b.z - d, y: b.y, z: W - (b.x + b.w), w: b.d, h: b.h, d: b.w },
        }] : [],
      },
    });
  }
  return { entries, units: entries.map((x) => x.unit) };
}
