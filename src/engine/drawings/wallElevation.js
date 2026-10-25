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

// ─── T82 F21 · THE FRONTS' OWN DIMENSIONS ───────────────────────────────────
//
// The owner, 24.10.2026 (19:34): *"jak mamy szuflady to nie pokazuje dokladnie
// wymiarow frontow i przerw pomiedzy nimi czy pomiedzy drzwiami tylko 207 i
// 200 co nie ma sensu"*. CLAUDE.md T82 F21: "the height chain is FRONT, GAP,
// FRONT (363 · 3 · 360 on the BUDR2) ... the width chain gains the same for
// doors: LEAF, GAP, LEAF (376.5 · 3 · 376.5 on the BUD 800) under the run's
// unit chain. Where a figure would not fit its segment ... it is written
// beside the chain with a leader, never dropped."
//
// T41 F5c's law, "a 3 mm gap is not a dimension", is RETIRED. It dropped every
// edge closer than the front gap to the last one kept, so the gap fell into
// the next front: the T81 fronts sheet printed 360 · 366 for drawer fronts of
// 360 and 363 (verify/t82/f21-probe.md rows 2 and 3). The gap is dimensioned
// now, and a figure too small for its segment is lifted beside the chain on a
// leader by the set's own grammar (setChains.js, T71's collision rule).
//
// THE SECOND FAULT THE PROBE FOUND (row 11). The edges were pooled across the
// whole wall, so on a lay-on run the BUDR2's top front (867) and the BUD's
// door top (870) made a 3 that is no gap between two fronts, and the BUD's own
// 770 was never a figure. A front chain is therefore ONE UNIT'S STACK, the
// same FRONT, GAP, FRONT the room's "Show front dimensions" measures per
// cabinet (frontDimensions.js frontGaps): two units are never pooled into one
// chain. Identical stacks (a row of doors of one height) are one chain, and
// stacks that do not overlap in height (the wall run over the base run) share
// a line of the sheet.

/**
 * A FACE front: a door leaf or a drawer front, as the room shows it closed.
 * An inner drawer front behind a door (T78 F15, `meta.inner`) is not on the
 * face, so it is in no chain of fronts.
 *
 * T82 F21, after the review: the HAWA pocket door (PART A, `POCKET-DOOR`,
 * role `pocket_door`) is a leaf like any other, its TB across and its TH up.
 * Its box is in the pocket's own frame and reaches over the unit it covers,
 * so it is read where it hangs, as every front is.
 */
function isFaceFront(p) {
  if (!p?.box || p.meta?.inner) return false;
  return p.part === 'FRONT' || p.part === 'DRAWER-FRONT' || p.part === 'POCKET-DOOR';
}

/**
 * A BOARD ON THE FACE that is not a leaf: a HAWA pocket panel (role
 * `pocket_panel`, in the front material) that no leaf of its own unit hangs
 * in front of. The one-door pocket's panel A runs forward flush with the
 * closed door and is seen; panel B, and both B panels of the two-door pocket,
 * stand behind a door and are not. On the leaf chain such a board is its own
 * figure with the true gaps either side of it, never folded into a "gap".
 */
function faceBoards(m) {
  const leaves = m.result.panels.filter(isFaceFront);
  return m.result.panels.filter((p) => p?.box && p.role === 'pocket_panel'
    && !leaves.some((l) => l.box.x < p.box.x + p.box.w - SAME && l.box.x + l.box.w > p.box.x + SAME));
}

/**
 * Every unit's own front stack, up the wall: its face fronts' bottom and top
 * edges, FRONT, GAP, FRONT. Units whose stacks are the same (within the
 * half millimetre) share one stack.
 *
 * @returns {Array<{edges:number[], values:number[], ids:string[], right:number}>}
 *          in the members' order; `right` is the stack's rightmost carcass edge
 */
export function frontStacks(members) {
  const stacks = [];
  for (const m of members) {
    const edges = uniqueSorted(m.result.panels.filter(isFaceFront)
      .flatMap((p) => [m.base + p.box.y, m.base + p.box.y + p.box.h]));
    if (edges.length < 2) continue;
    const same = stacks.find((s) => s.edges.length === edges.length
      && s.edges.every((e, i) => Math.abs(e - edges[i]) <= SAME));
    if (same) {
      same.ids.push(m.unit.id);
      same.right = Math.max(same.right, m.x + m.width);
      continue;
    }
    stacks.push({ edges, values: chainValues(edges), ids: [m.unit.id], right: m.x + m.width });
  }
  return stacks;
}

/**
 * The stacks laid on the LINES of the front chain, innermost first. The
 * richest stack (the most fronts, then the one nearest the chain) takes the
 * inner line; a stack shares a line with every stack whose height it does not
 * overlap and takes the next line out where it would.
 *
 * @returns {Array<Array<stack>>}
 */
export function frontChainLines(members) {
  const order = frontStacks(members)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (b.s.values.length - a.s.values.length) || (b.s.right - a.s.right) || (a.i - b.i))
    .map(({ s }) => s);
  const lines = [];
  const lo = (s) => s.edges[0];
  const hi = (s) => s.edges[s.edges.length - 1];
  for (const s of order) {
    let line = lines.find((l) => l.every((o) => lo(s) >= hi(o) - SAME || hi(s) <= lo(o) + SAME));
    if (!line) {
      line = [];
      lines.push(line);
    }
    line.push(s);
  }
  return lines;
}

/**
 * LEAF, GAP, LEAF along one run: every face front's two edges (and a face
 * board's: the HAWA pocket's panel A), and with `ends` the run's first and
 * last carcass edges too. A pair of doors reads
 * 376.5 · 3 · 376.5, the stiles and the reveals between two cabinets' leaves
 * are figures too (his own DXF's bottom chain, 40 · 600 · 3 · 600 · 40), and
 * with its ends the chain adds up to the unit chain above it, which is the
 * joiner's check. Without them it is the fronts' own extent, first leaf to
 * last, which is what a hung run's chain takes: it stands in the open wall
 * where a tall unit's front may be the next thing beside it.
 *
 * @returns {{leafEdges:number[], leaves:number[]}}  empty when no front stands in the run
 */
export function leafChains(members, { ends = true } = {}) {
  const edges = members.flatMap((m) => [...m.result.panels.filter(isFaceFront), ...faceBoards(m)]
    .flatMap((p) => [m.x + p.box.x, m.x + p.box.x + p.box.w]));
  if (!edges.length) return { leafEdges: [], leaves: [] };
  const outer = ends
    ? [Math.min(...members.map((m) => m.x)), Math.max(...members.map((m) => m.x + m.width))]
    : [];
  const leafEdges = uniqueSorted([...outer, ...edges]);
  return { leafEdges, leaves: chainValues(leafEdges) };
}

/**
 * THE TWO VERTICAL CHAINS, AS NUMBERS: every front's own height, and the bands.
 *
 * `stacks` are the units' own FRONT, GAP, FRONT (above); `fronts` is every
 * stack's figures in order. T82 F21: the `floorMm` option of T41 F5c is
 * retired and read no more, so a caller still passing it changes nothing.
 */
export function heightChains(members) {
  const stacks = frontStacks(members);
  const bandEdges = uniqueSorted([0, ...members.flatMap((m) => [m.base, m.top])]);
  return {
    stacks,
    fronts: stacks.flatMap((s) => s.values),
    bandEdges,
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

  // T82 F21: every unit's own FRONT, GAP, FRONT, one line per overlapping
  // stack (`frontChainLines`); the T41 floor is retired.
  const { bandEdges: bands } = heightChains(members);
  const lines = fronts ? frontChainLines(members) : [];
  lines.forEach((line, k) => {
    for (const stack of line) {
      out.push(...chainDimensions({
        edges: stack.edges, at: x.right, direction: 'v', offset: W.chainFirst + k * W.chainStep, textHeight,
      }));
    }
  });

  // The BANDS. The floor is always an edge — his left-hand chain starts there
  // and so does a fitter's tape. T82 F21: one line out from the last line of
  // fronts.
  if (bands.length > 1) {
    out.push(...chainDimensions({
      edges: bands, at: x.right, direction: 'v', offset: W.chainFirst + Math.max(1, lines.length) * W.chainStep, textHeight,
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
 *   shakerFrame  T43-F2: the PROJECT's frame width in millimetres, resolved
 *                ONCE at the sheet level by `shakerFrameMm(design, profile)`.
 *                `null` is the profile default, which is what every caller
 *                that has not been taught to ask still gets.
 *   profile
 * @returns {{entities:Array, bounds:object, members:number, skipped:number}}
 */
export function buildWallElevation(group, {
  withFronts = true, room = null, frontTypeOf = null, profile, shakerFrame = null,
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
        // ─── TURN 43 (CLAUDE.md F2) ─────────────────────────────────────
        // ONE resolved number, handed down from the sheet. Never re-resolved
        // per panel: a kitchen whose doors wear three different frames is a
        // kitchen nobody meant to build, and a drawing that resolves the
        // frame twice is how the second one appears.
        shakerFrame,
      })
      : buildCarcassElevation(m.result, {
        unitNum: m.unit.params?.unit_num,
        profile,
        unitNumberHeight: W.unitNumberHeight,
        // ─── TURN 43 (CLAUDE.md F3) ───────────────────────────────────────
        // *"Szuflady nie są narysowane"*, and *"nóżki to jakieś klocki"*. Both
        // are asked for HERE and nowhere else: the unit card keeps exactly the
        // carcass view it has drawn since turn 7 (iron rule 4).
        drawerBoxes: true,
        legSymbol: true,
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
  // T75 F9 · the cut passes through plaster only: an island's face is not a wall.
  for (const wall of walls.filter((w) => !w.island)) {
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
