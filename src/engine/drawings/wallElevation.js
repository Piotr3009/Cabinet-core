// ─── THE WALL DRAWING (turn 40, CLAUDE.md F5) ───────────────────────────────
//
// The owner, 18.08.2026: *"nie mamy drawingu całościowego — pokazuje nam tylko
// pojedyncze szafki, a ja bym chciał drawing całości profesjonalny jak z
// AutoCada."* He supplied his own AutoCAD set — Anderson Kitchen rev B — as the
// standard, and CLAUDE.md reads it as the spec's true source:
//
//   · A SHEET IS A WALL.  `Wall A /1`, `Wall A /2`, `Wall B /1`, `Wall B /2`,
//     plus one `Horizontal section`. /1 is WITH FRONTS, /2 is the CARCASS view
//     without them — the same split the Unit Card already makes per cabinet,
//     applied to a whole wall.
//   · TWO DIMENSION CHAINS PER AXIS, never one. Top: each cabinet's own width
//     with the gaps between them. Bottom: the GROUPED totals. Right: every
//     front's own height AND the grouped bands. Left: the overall height.
//     CLAUDE.md calls this "the single most important detail of the whole
//     feature — one chain is not his drawing".
//   · COLOUR: fronts magenta, the hinge side shown by the grey diagonals across
//     each door, handles green, existing building fabric red.
//   · "No Scale" — he does not print to a scale, he trusts the dimensions.
//
// ─── REUSE, DO NOT REWRITE (CLAUDE.md's own instruction) ────────────────────
//
// A wall drawing is the per-unit views this app already draws, composed side by
// side at their `position.x_mm` and at the height each unit actually stands or
// hangs at, with the chains drawn ACROSS the composition. Every rectangle on it
// comes out of `buildFrontElevation` / `buildCarcassElevation` / `buildTopView`
// — so a wall drawing cannot disagree with a unit card about the same cabinet,
// which is the whole reason it is composed rather than re-derived.
//
// THE PROJECT ALREADY KNOWS WALLS. Every unit carries
// `position: { wall, x_mm, rotation_deg }` and `engine/runs.js` already groups
// neighbours by wall and by gap. Both are used here; no second notion of a run
// is invented.
//
// Pure functions — no React, no store imports, no jsPDF.

import { buildFrontElevation, chainDimensions, dimensionEntities } from './frontElevation.js';
import { buildCarcassElevation } from './views.js';
import {
  boundsOf, entLine as line, entText as text, moveEntities as translate,
} from './primitives.js';
import { unitBase, unitTop } from '../runs.js';
import { roomWalls } from '../room.js';

/** Wall 0 is `Wall A`, exactly as his set names them. */
export function wallLabel(index) {
  const i = Math.max(0, Math.trunc(Number(index) || 0));
  return i < 26 ? String.fromCharCode(65 + i) : `${i + 1}`;
}

/** Two edges are the same edge when a joiner could not measure between them. */
const SAME = 0.5;

function uniqueSorted(values) {
  const out = [];
  for (const v of [...values].sort((a, b) => a - b)) {
    if (!out.length || Math.abs(out[out.length - 1] - v) > SAME) out.push(v);
  }
  return out;
}

/**
 * A unit's rotation, normalised. A TURNED unit has no "along the wall" to
 * share — `engine/runs.js buildRuns` skips it for exactly this reason and so
 * does the elevation, which cannot draw a cabinet edge-on and pretend it is a
 * face. It is still on the PLAN, where its footprint is honest.
 */
export function turnedAway(unit) {
  return ((((Number(unit?.position?.rotation_deg) || 0) % 360) + 360) % 360) !== 0;
}

/**
 * The project's cabinets, grouped by the wall they stand against.
 *
 * @param {Array} entries  [{ unit, result }] — the store's `allResults()` shape
 * @returns {Array<{wall:number, label:string, members:Array, skipped:Array,
 *                  from:number, to:number, top:number}>}
 *          walls in index order; A WALL WITH NO CABINETS IS NOT IN THE LIST,
 *          which is what makes "no sheet rather than an empty one" true by
 *          construction rather than by a guard somewhere downstream.
 */
export function wallGroups(entries = [], profile) {
  const byWall = new Map();
  for (const e of entries) {
    if (!e?.unit || !e?.result) continue;
    const wall = Math.max(0, Math.trunc(Number(e.unit.position?.wall ?? 0)));
    if (!byWall.has(wall)) byWall.set(wall, { members: [], skipped: [] });
    const bucket = byWall.get(wall);
    if (turnedAway(e.unit)) { bucket.skipped.push(e); continue; }
    bucket.members.push({
      unit: e.unit,
      result: e.result,
      x: Number(e.unit.position?.x_mm) || 0,
      base: unitBase(e.unit, profile),
      top: unitTop(e.unit, profile),
      width: Number(e.unit.params?.width) || 0,
    });
  }

  const out = [];
  for (const wall of [...byWall.keys()].sort((a, b) => a - b)) {
    const { members, skipped } = byWall.get(wall);
    if (!members.length) continue;
    members.sort((a, b) => a.x - b.x || String(a.unit.id).localeCompare(String(b.unit.id)));
    out.push({
      wall,
      label: wallLabel(wall),
      members,
      skipped,
      from: Math.min(...members.map((m) => m.x)),
      to: Math.max(...members.map((m) => m.x + m.width)),
      top: Math.max(...members.map((m) => m.top)),
    });
  }
  return out;
}

/**
 * The GROUPS the bottom chain measures: consecutive cabinets with nothing
 * between them, merged into one number.
 *
 * The break rule is `engine/runs.js`'s — a gap wider than the run tolerance —
 * because "which cabinets are one length of worktop" and "which cabinets are
 * one number on the bottom chain" are the same question, and answering it twice
 * is how two drawings of one kitchen come to disagree.
 */
export function widthGroups(members, profile) {
  const tol = Number(profile?.autoParts?.topInfill?.runGap) || 0;
  const groups = [];
  for (const m of members) {
    const last = groups[groups.length - 1];
    if (last && m.x - last.to <= tol + SAME) {
      last.to = Math.max(last.to, m.x + m.width);
      last.members.push(m);
    } else {
      groups.push({ from: m.x, to: m.x + m.width, members: [m] });
    }
  }
  return groups;
}

/**
 * TWO CHAINS ACROSS THE TOP AND THE BOTTOM.
 *
 * TOP — each cabinet's own width with the gaps between them, which is his
 * `597.0 · 37 · 501.0 · 501.0 · 37 · 513.0`. Every edge of every carcass is a
 * boundary, so the chain alternates cabinets and gaps without being told which
 * is which.
 *
 * BOTTOM — the grouped totals, which is his `599.5 · 37 · 1011.0 · 36.0 ·
 * 1571.0 · 40.0`. Only the group boundaries are edges, so two cabinets that
 * touch become one number.
 *
 * The invariant the tests pin: THE DETAILED CHAIN SUMS TO THE GROUPED CHAIN.
 * Both run between the same two outermost edges, so both add up to the same
 * overall length — which is the arithmetic a joiner does on site to check a
 * drawing, done here so the drawing cannot fail it.
 */
/** The segments a chain of edges measures, in order. */
export function chainValues(edges) {
  const s = uniqueSorted(edges);
  const out = [];
  for (let i = 1; i < s.length; i += 1) out.push(Math.round((s[i] - s[i - 1]) * 100) / 100);
  return out;
}

/**
 * THE TWO HORIZONTAL CHAINS, AS NUMBERS.
 *
 * Exported so the invariant CLAUDE.md names — *"the detailed chain sums to the
 * grouped chain"* — can be asserted as arithmetic rather than by reading
 * arrowheads off an SVG. Both chains run between the same two outermost edges,
 * so the equality holds by construction; the test is what says it still does.
 */
export function widthChains(members, profile) {
  const detailedEdges = uniqueSorted(members.flatMap((m) => [m.x, m.x + m.width]));
  const groupedEdges = uniqueSorted(widthGroups(members, profile).flatMap((g) => [g.from, g.to]));
  return {
    detailedEdges,
    groupedEdges,
    detailed: chainValues(detailedEdges),
    grouped: chainValues(groupedEdges),
  };
}

// ─── TURN 41 (F5c): A CHAIN MEASURES ONE RUN, NOT ONE WALL ──────────────────
//
// MEASURED FAULT. Both chains above take EVERY cabinet on the wall, whatever
// height it is hung at. Put a wall unit over a base run — which is what a
// kitchen IS — and its edges are injected into the base run's chain:
//
//     BUD 600 @0 · BUD 500 @640 · WUD 600 @40 mounted 1500
//     detailed edges [0, 40, 600, 640, 1140]  ->  chain 40 · 560 · 40 · 500
//
// Not one of those four numbers is a cabinet and not one is a gap. And the
// grouped chain fails the other way in the same case: the wall unit spans the
// 40 mm gap between the two base units, so `widthGroups` merges all three into
// one group and the whole bottom chain becomes the single figure 1140.
//
// On a wall with no overlap the two chains come out BYTE-IDENTICAL — measured,
// [600, 40, 500] above and [600, 40, 500] below — so the sheet printed the same
// three numbers twice. Two chains that always agree are not the two chains
// CLAUDE.md calls "the single most important detail of the whole feature".
//
// THE CAUSE is that "which cabinets belong on one chain" was never asked. A
// dimension chain measures a RUN: cabinets standing at the same height, in a
// line. So the members are banded by their mounting level first — the same key
// the store already uses to decide who shares a run — and every chain is a
// chain of ONE band.

/** The mounting bands on this wall, floor first, each with its own members. */
export function mountingBands(members) {
  const byBase = new Map();
  for (const m of members) {
    // Half a millimetre, the workshop grid — two cabinets hung at 1500 and
    // 1500.2 are one run and not two.
    const key = Math.round((Number(m.base) || 0) * 2) / 2;
    if (!byBase.has(key)) byBase.set(key, []);
    byBase.get(key).push(m);
  }
  return [...byBase.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([base, list]) => ({
      base,
      members: [...list].sort((a, b) => a.x - b.x),
    }));
}

/**
 * The chains for ONE band, and whether the two of them actually say different
 * things.
 *
 * `same` is what stops the sheet printing one run of numbers twice: where every
 * cabinet in a band is separated from its neighbour, the detailed chain and the
 * grouped chain are the same chain, and ONE honest chain beats two identical
 * ones.
 */
export function bandChains(band, profile) {
  const chains = widthChains(band.members, profile);
  const same = chains.detailed.length === chains.grouped.length
    && chains.detailed.every((v, i) => Math.abs(v - chains.grouped[i]) < SAME);
  return { ...chains, same, base: band.base };
}

/** THE TWO VERTICAL CHAINS, AS NUMBERS — every front's own height, and the bands. */
export function heightChains(members, { floorMm = 0 } = {}) {
  const rawFrontEdges = uniqueSorted(members.flatMap((m) => m.result.panels
    .filter((p) => p.box && (p.part === 'FRONT' || p.part === 'DRAWER-FRONT'))
    .flatMap((p) => [m.base + p.box.y, m.base + p.box.y + p.box.h])));
  // ─── TURN 41 (F5c): A 3 mm GAP IS NOT A DIMENSION ────────────────────────
  //
  // MEASURED. A BUDR4 over a BUD with two wall units gave the front chain
  //
  //     190 · 3 · 190 · 3 · 190 · 3 · 188 · 633 · 717
  //
  // — nine segments, three of them the 3 mm air between one front and the next.
  // At the sheet's 1:10 that is a 0.3 mm arrow carrying a 5.5 mm-tall "3". The
  // owner's own chain is 140.3 · 100.3 · 40.0 · 221.0 · 22.0: front heights,
  // and no gaps.
  //
  // So an edge that would make a segment shorter than the legibility floor is
  // DROPPED rather than dimensioned. The floor is the front gap itself, passed
  // in by the caller from the profile, so the rule is "do not dimension the
  // air between two fronts" and not a magic number. `chainValues` is untouched
  // and still total — the filter is at the drawing step, which is where the
  // legibility question belongs.
  const frontEdges = [];
  for (const e of rawFrontEdges) {
    if (!frontEdges.length || e - frontEdges[frontEdges.length - 1] > floorMm + SAME) frontEdges.push(e);
  }
  // …and never drop the last edge: the chain has to reach the top of the run.
  const lastRaw = rawFrontEdges[rawFrontEdges.length - 1];
  if (lastRaw != null && frontEdges[frontEdges.length - 1] !== lastRaw) {
    frontEdges[frontEdges.length - 1] = lastRaw;
  }
  const bandEdges = uniqueSorted([0, ...members.flatMap((m) => [m.base, m.top])]);
  return {
    frontEdges,
    bandEdges,
    fronts: chainValues(frontEdges),
    bands: chainValues(bandEdges),
  };
}

export function horizontalChains(members, { profile, y, textHeight }) {
  const W = profile.drawings.wallDrawing;
  // ─── TURN 41 (F5c): ONE PAIR OF CHAINS PER RUN ───────────────────────────
  //
  // The detailed chains stack ABOVE the drawing, one row per mounting band,
  // the highest band outermost — so a wall run is measured over the wall units
  // and the base run over the base units, and neither injects an edge into the
  // other's chain. The grouped chain goes BELOW, and it is the FLOOR run's:
  // that is the set-out a joiner works to on site, and it is the chain the
  // owner's own bottom row carries.
  const bands = mountingBands(members);
  const out = [];
  bands.forEach((band, i) => {
    const chains = bandChains(band, profile);
    out.push(...chainDimensions({
      edges: chains.detailedEdges,
      at: y.top,
      direction: 'h',
      offset: -W.chainFirst * (i + 1),
      textHeight,
    }));
  });
  // The floor band's grouped totals, below — and only when they SAY something
  // the detailed chain above does not.
  const floor = bands[0];
  if (floor) {
    const chains = bandChains(floor, profile);
    if (!chains.same) {
      out.push(...chainDimensions({
        edges: chains.groupedEdges, at: y.bottom, direction: 'h', offset: W.chainFirst, textHeight,
      }));
    }
  }
  return out;
}

/**
 * TWO CHAINS UP THE RIGHT, AND THE OVERALL DOWN THE LEFT.
 *
 * RIGHT, inner — every FRONT's own height: his `140.3 · 100.3 · 40.0 · 221.0 ·
 * 22.0`. The edges are every front's top and bottom across the WHOLE wall, so
 * a band that two cabinets share is measured once.
 *
 * RIGHT, outer — the grouped bands: his `1550.0 · 770.0 · 100.0 · 30.0`. The
 * edges are the floor, every carcass's base and every carcass's top, which is
 * what makes the toe kick, the base run, the gap and the wall run come out as
 * four numbers rather than as twenty.
 *
 * LEFT — the overall height, floor to the highest thing on the wall.
 */
export function verticalChains(members, { profile, x, textHeight, fronts = true }) {
  const W = profile.drawings.wallDrawing;
  const out = [];
  const top = Math.max(...members.map((m) => m.top));

  // T41-F5c: the legibility floor is the front GAP itself — the air between one
  // front and the next is not a part and is not dimensioned.
  const { frontEdges, bandEdges: bands } = heightChains(members, {
    floorMm: Number(profile?.doors?.gap) || 0,
  });
  if (fronts && frontEdges.length > 1) {
    out.push(...chainDimensions({
      edges: frontEdges, at: x.right, direction: 'v', offset: W.chainFirst, textHeight,
    }));
  }

  // The BANDS. The floor is always an edge — his left-hand chain starts there
  // and so does a fitter's tape.
  if (bands.length > 1) {
    out.push(...chainDimensions({
      edges: bands, at: x.right, direction: 'v', offset: W.chainFirst + W.chainStep, textHeight,
    }));
  }

  // …and the whole height, on the left.
  out.push(...dimensionEntities({
    from: [x.left, 0], to: [x.left, top], direction: 'v', offset: -W.chainFirst, value: top, textHeight,
  }));
  return out;
}

/**
 * The HANDLES, in green — his own convention.
 *
 * Read off `drillSummary.handles`, which is the engine's published answer to
 * "where is every handle on this cabinet" (T25-F4). A bar is drawn as its two
 * screw centres joined; a knob as a short mark on its own point. Nothing here
 * re-derives a position: a handle drawn anywhere but where the machine drills
 * it would be worse than no handle on the drawing at all.
 */
export function handleMarks(result, profile, { dx = 0, dy = 0 } = {}) {
  const W = profile.drawings.wallDrawing;
  const out = [];
  for (const h of result.drillSummary?.handles || []) {
    const holes = Array.isArray(h.holes) ? h.holes : [];
    if (holes.length >= 2) {
      const [a, b] = [holes[0], holes[holes.length - 1]];
      out.push(line('HANDLES', dx + a[0], dy + a[1], dx + b[0], dy + b[1]));
      for (const [hx, hy] of holes) {
        out.push(line('HANDLES', dx + hx, dy + hy - W.handleTick, dx + hx, dy + hy + W.handleTick));
      }
    } else if (holes.length === 1) {
      const [hx, hy] = holes[0];
      out.push(line('HANDLES', dx + hx - W.handleTick, dy + hy, dx + hx + W.handleTick, dy + hy));
      out.push(line('HANDLES', dx + hx, dy + hy - W.handleTick, dx + hx, dy + hy + W.handleTick));
    }
  }
  return out;
}

/**
 * ONE WALL, AS ONE ELEVATION.
 *
 * @param {object} group     one entry of `wallGroups()`
 * @param {object} args
 *   withFronts   true → the `/1` sheet; false → the `/2` carcass sheet
 *   room         for the ceiling line, which is building fabric
 *   frontTypeOf  (unit) => 'S' | 'H' | 'F' — the design layer's answer, passed
 *                in rather than resolved here (the engine takes millimetres,
 *                not rulebooks)
 *   profile
 * @returns {{entities:Array, bounds:object, members:number, skipped:number}}
 */
export function buildWallElevation(group, {
  withFronts = true, room = null, frontTypeOf = null, profile,
} = {}) {
  const W = profile.drawings.wallDrawing;
  const T = W.textHeight;
  const entities = [];

  for (const m of group.members) {
    const view = withFronts
      ? buildFrontElevation(m.result, {
        unitNum: m.unit.params?.unit_num,
        frontType: frontTypeOf ? frontTypeOf(m.unit) : null,
        profile,
        overallDims: false,
        unitNumberHeight: W.unitNumberHeight,
        // ─── TURN 43 (CLAUDE.md F1): /1 IS FRONTS ──────────────────────────
        // The whole reason the option exists. `/1` gets the clean view — no
        // hidden lines, no insides, no legs — and NOTHING ELSE in the app
        // changes behaviour, because the option defaults off.
        frontsOnly: true,
      })
      : buildCarcassElevation(m.result, {
        unitNum: m.unit.params?.unit_num, profile, unitNumberHeight: W.unitNumberHeight,
      });
    entities.push(...translate(view.entities, m.x, m.base));
    if (withFronts) entities.push(...handleMarks(m.result, profile, { dx: m.x, dy: m.base }));
  }

  // ─── THE BUILDING FABRIC, IN RED ─────────────────────────────────────────
  // His set draws the architrave and the walls in red, because what is already
  // in the room is not what the workshop is making. The two pieces of it this
  // app actually knows are the FLOOR and the CEILING.
  const pad = W.fabricOverhang;
  entities.push(line('BUILDING', group.from - pad, 0, group.to + pad, 0));
  const ceiling = Number(room?.height) || 0;
  if (ceiling > group.top) {
    entities.push(line('BUILDING', group.from - pad, ceiling, group.to + pad, ceiling));
  }

  const solid = boundsOf(entities);

  // ─── AND THE TWO CHAINS ON EACH AXIS ─────────────────────────────────────
  entities.push(...horizontalChains(group.members, {
    profile, textHeight: T, y: { top: Math.max(solid.y + solid.h, group.top), bottom: 0 },
  }));
  entities.push(...verticalChains(group.members, {
    profile,
    textHeight: T,
    x: { left: group.from, right: group.to },
    // The carcass sheet has no fronts on it, so the front chain would be an
    // empty run of arrows. The BANDS still stand, which is what /2 is read for.
    fronts: withFronts,
  }));

  // A turned cabinet cannot be drawn on an elevation of the wall it stands
  // against, and pretending otherwise would be a drawing that lies. It is
  // NAMED instead, and it is on the plan.
  if (group.skipped.length) {
    const b = boundsOf(entities);
    entities.push(text('VIEW_TITLE', b.x, b.y - W.noteHeight * 1.6,
      `${group.skipped.length} turned unit${group.skipped.length === 1 ? '' : 's'} on this wall `
      + '- see the horizontal section', W.noteHeight, 'left'));
  }

  return {
    entities,
    bounds: boundsOf(entities),
    solid,
    members: group.members.length,
    skipped: group.skipped.length,
  };
}

/**
 * THE HORIZONTAL SECTION — the plan, all walls, cabinet numbers.
 *
 * One per project, and it is the sheet that says how the walls stand to each
 * other. Every footprint is placed in the ROOM's own plan frame through the
 * wall it belongs to, so a cabinet on wall B lands where wall B is rather than
 * beside wall A's.
 *
 * A footprint is emitted as FOUR LINES rather than a rectangle for a reason
 * that matters on an L-shaped room: a wall that does not run along an axis
 * needs its cabinets turned with it, and a rect primitive has no rotation. Four
 * lines through the wall's own frame are correct on every wall this app can
 * make.
 */
export function buildHorizontalSection(entries = [], { room = null, profile }) {
  const W = profile.drawings.wallDrawing;
  const walls = roomWalls(room);
  const entities = [];

  // ── the room itself, in red: it is building fabric ──
  //
  // ─── TURN 41 (F5a): AND IT IS CUT, SO IT IS THE HEAVIEST LINE HERE ───────
  // A horizontal section is a cut through the room at worktop height, and the
  // room's own walls are what the cut passes through. T40 drew them at the
  // BUILDING layer's 0.25 — LIGHTER than an uncut cabinet footprint at 0.35 —
  // so the section's cut line was the thinnest thing on the sheet, which is
  // the exact inversion of what a section is for.
  for (const wall of walls) {
    entities.push({ ...line('BUILDING', wall.start.x, wall.start.y, wall.end.x, wall.end.y), pen: 'CUT' });
  }

  /** A point in one wall's frame — `u` along it, `v` in from it — in the room's. */
  const at = (wall, u, v) => [
    wall.start.x + wall.along.x * u + wall.inward.x * v,
    wall.start.y + wall.along.y * u + wall.inward.y * v,
  ];
  // T41-F5a: `pen` names the role these four lines play on THIS sheet. A
  // cabinet's footprint on a plan is cut through; its fronts, which stand
  // beyond the cut, are seen rather than cut.
  const quad = (layer, wall, u0, u1, v0, v1, pen = null) => {
    const pts = [at(wall, u0, v0), at(wall, u1, v0), at(wall, u1, v1), at(wall, u0, v1)];
    return pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const ent = line(layer, p[0], p[1], q[0], q[1]);
      return pen ? { ...ent, pen } : ent;
    });
  };

  const gap = Number(profile.doors?.gap) || 0;
  for (const e of entries) {
    if (!e?.unit || !e?.result) continue;
    const wall = walls[Math.max(0, Math.trunc(Number(e.unit.position?.wall ?? 0)))] || walls[0];
    if (!wall) continue;
    const u0 = Number(e.unit.position?.x_mm) || 0;
    const u1 = u0 + (Number(e.result.params.width) || 0);
    const depth = Number(e.result.params.depth) || 0;
    entities.push(...quad('CARCASE', wall, u0, u1, 0, depth, 'CUT'));

    // The fronts, magenta, standing off the carcass by the front gap — the
    // same relationship `views.js planBox` draws inside one unit's card.
    const frontT = Math.max(...e.result.panels
      .filter((p) => p.box && p.material_role === 'front' && p.box.z >= depth)
      .map((p) => p.box.d), 0);
    if (frontT > 0) {
      entities.push(...quad('DOORS', wall, u0, u1, depth + gap, depth + gap + frontT, 'VISIBLE'));
    }

    // ── the cabinet NUMBER, green, in the plan — his own convention ──
    const [cx, cy] = at(wall, (u0 + u1) / 2, depth / 2);
    entities.push(text('UNIT_NUMBER', cx, cy,
      String(e.unit.params?.unit_num ?? e.result.unitNum ?? ''), W.planNumberHeight));
  }

  // ── which wall is which, so the elevations can be found from the plan ──
  for (const wall of walls) {
    const label = wallLabel(wall.index);
    const [lx, ly] = at(wall, wall.width / 2, -W.wallLabelOffset);
    entities.push(text('VIEW_TITLE', lx, ly, `WALL ${label}`, W.planLabelHeight));
  }

  return { entities, bounds: boundsOf(entities), walls: walls.length };
}
