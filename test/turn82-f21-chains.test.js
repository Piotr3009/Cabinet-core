/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F21 · THE FRONTS' OWN DIMENSIONS
//
// The owner, 24.10.2026 (19:34): *"jak mamy szuflady to nie pokazuje dokladnie
// wymiarow frontow i przerw pomiedzy nimi czy pomiedzy drzwiami tylko 207 i
// 200 co nie ma sensu"*. CLAUDE.md T82 F21: "the height chain is FRONT, GAP,
// FRONT (363 · 3 · 360 on the BUDR2), the gaps dimensioned as the owner's DXF
// dimensions them (19 gap dimensions of 2 and 3 on Balck_kicthen.dxf), the
// gap figure in the ANNOTATION pen at the chain's text height; the width
// chain gains the same for doors: LEAF, GAP, LEAF (376.5 · 3 · 376.5 on the
// BUD 800) under the run's unit chain. Where a figure would not fit its
// segment (a 3 at 1:20 is 0.15 mm) it is written beside the chain with a
// leader, never dropped."
//
// The probe (verify/t82/f21-probe.md) adds row 11: edges pooled across the
// wall make a 3 on a lay-on run (the BUDR2's top front 867 against the BUD's
// door top 870) that is no gap between two fronts. So a front chain is one
// unit's own stack, never two units' edges pooled.
//
// The stage is the T81 walk's kitchen (`scripts/t81-kitchen.mjs`): BUD 600,
// BUD 800 a pair, BUDR2 500, WUD 600, in-frame by default (CLAUDE.md's
// numbers are the in-frame ones) and lay-on beside it; the sheet is 1:15.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { S, t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { rectCorners } from '../src/engine/room.js';
import { formatMm } from '../src/engine/format.js';
import {
  frontChainLines, frontStacks, heightChains, leafChains, mountingBands, wallGroups, widthChains,
} from '../src/engine/drawings/wallElevation.js';
import { buildRunElevation, measureRun, worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { chooseSetScale, drawingContext, setZones } from '../src/engine/drawings/setSheet.js';
import { figureCollisions, figureWidth } from '../src/engine/drawings/setChains.js';
import { PEN, penWidth } from '../src/engine/drawings/layers.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';

const P = () => getCabinetProfile();
const sum = (a) => Math.round(a.reduce((n, v) => n + v, 0) * 100) / 100;

/** A pair of wall doors beside the WUD 600: a WUD 800 at x 1600, two leaves. */
function addWallPair() {
  const id = S().addUnit('WUD', { wall: 0, x: 1600 }).id;
  S().updateUnitParams(id, { width: 800 });
  S().setDoors(id, { count: 2, hinge: 'L' });
  return id;
}

/** The kitchen, its wall, and a sheet at the scale the set chooses (or a fixed one). */
function stage({ inframe = true, mode = 'fronts', scale = null, pair = false } = {}) {
  const ids = t81Kitchen({ inframe });
  if (pair) ids.p = addWallPair();
  const a = setArgs();
  const group = wallGroups(a.entries, P())[0];
  const worktops = worktopsOnWall(a.worktops, 0);
  const s = scale ?? chooseSetScale(measureRun(group, { room: a.room, worktops, profile: P() }), setZones(P()).object, P()).scale;
  const ctx = drawingContext(s, P());
  const sheet = buildRunElevation(group, {
    mode, room: a.room, worktops, frontTypeOf: a.frontTypeOf, profile: P(), ctx,
  });
  return { ids, a, group, ctx, sheet };
}

const captions = (ch) => ch.figures.map((f) => f.caption);
/** The front chains up the right of the run: their figures stand right of the last carcass. */
const rightChains = ({ sheet, group }) => sheet.chains.filter((ch) => ch.figures.length
  && ch.figures.every((f) => f.axis === 'y' && f.x > group.to));
/** The x of a vertical chain's own dimension line (the one its arrowheads stand on). */
const lineX = (ch) => ch.find((e) => e.kind === 'poly').pts[0][0];
/** The horizontal chains whose dimension line stands at y. */
const chainsAtY = ({ sheet }, y) => sheet.chains.filter((ch) => ch.some((e) => e.kind === 'line'
  && Math.abs(e.y1 - y) < 1e-6 && Math.abs(e.y2 - y) < 1e-6 && Math.abs(e.x2 - e.x1) > 0));
const chainAtY = (s, y) => chainsAtY(s, y)[0];
/** Does `seq` appear in `list` as consecutive members? */
const hasRun = (list, seq) => list.some((_, i) => seq.every((v, j) => list[i + j] === v));

// ═══ THE NUMBERS ═══════════════════════════════════════════════════════════

test('F21 · FRONT, GAP, FRONT per unit: 363 · 3 · 360 on the BUDR2, the doors their own 726, nothing merged', () => {
  const { group, ids } = stage({ inframe: true });
  const stacks = frontStacks(group.members);
  const of = (id) => stacks.find((s) => s.ids.includes(id));
  // Read bottom up: the BUDR2's lower front 360, the gap 3, its upper front
  // 363 (CLAUDE.md reads it top down: 363 · 3 · 360).
  assert.deepEqual(of(ids.c).values, [360, 3, 363]);
  // T81 printed 360 · 366: the 3 fell into the front above it.
  assert.ok(!stacks.some((s) => s.values.includes(366)), 'the gap is no longer swallowed by the next front');
  // The BUD 600's door and the BUD 800's pair stand at one height: one stack.
  assert.equal(of(ids.a), of(ids.b), 'two cabinets with the same fronts share one chain');
  assert.deepEqual(of(ids.a).values, [726]);
  assert.deepEqual(of(ids.w).values, [676]);
  // heightChains publishes the same stacks, figure for figure.
  assert.deepEqual(heightChains(group.members).fronts, stacks.flatMap((s) => s.values));
});

test('F21 · probe row 11: a lay-on run prints no false 3 from two units\' edges, and the BUD\'s 770 is a figure', () => {
  const { group, ids } = stage({ inframe: false });
  const stacks = frontStacks(group.members);
  const of = (id) => stacks.find((s) => s.ids.includes(id));
  assert.deepEqual(of(ids.c).values, [382, 3, 382], 'the BUDR2: two equal fronts and the gap between them');
  assert.deepEqual(of(ids.a).values, [770], 'the BUD\'s door is its own figure');
  for (const s of stacks) {
    for (let i = 1; i < s.edges.length; i += 1) {
      assert.ok(!(s.edges[i - 1] === 867 && s.edges[i] === 870), 'no chain runs from the BUDR2\'s top front to the BUD\'s door top');
    }
  }
  // Every 3 on every chain is the air between two fronts of ONE unit.
  for (const s of stacks) {
    s.values.forEach((v, i) => {
      if (v > P().doors.gap + 0.5) return;
      const m = group.members.find((q) => q.unit.id === s.ids[0]);
      const lo = s.edges[i]; const hi = s.edges[i + 1];
      const fronts = m.result.panels.filter((p) => p.box && (p.part === 'FRONT' || p.part === 'DRAWER-FRONT'));
      assert.ok(fronts.some((p) => Math.abs(m.base + p.box.y + p.box.h - lo) < 0.5), `a front ends at ${lo}`);
      assert.ok(fronts.some((p) => Math.abs(m.base + p.box.y - hi) < 0.5), `and the next begins at ${hi}`);
    });
  }
});

test('F21 · the stacks share a line where their heights do not overlap, and step out where they do', () => {
  const { group, ids } = stage({ inframe: true });
  const lines = frontChainLines(group.members);
  assert.equal(lines.length, 2);
  // The inner line: the richest stack (the drawers) and the wall run over it.
  assert.deepEqual(lines[0].map((s) => s.ids).flat().sort(), [ids.c, ids.w].sort());
  // The next line out: the doors, whose height overlaps the drawers'.
  assert.deepEqual(lines[1].map((s) => s.ids).flat().sort(), [ids.a, ids.b].sort());
});

test('F21 · the T41 drop rule is retired: the legibility floor drops no edge any more', () => {
  // T41 F5c passed the front gap as `floorMm` and dropped every edge closer
  // than it. The 2026 law dimensions the gap, so the option changes nothing.
  const { group } = stage({ inframe: true });
  assert.deepEqual(heightChains(group.members, { floorMm: P().doors.gap }), heightChains(group.members));
});

test('F21 · LEAF, GAP, LEAF: 376.5 · 3 · 376.5 on the BUD 800, and the leaf chain adds up to the run', () => {
  const { group } = stage({ inframe: true });
  const floor = mountingBands(group.members)[0];
  const { leafEdges, leaves } = leafChains(floor.members);
  // From the run's first carcass edge to its last, every front's two edges:
  // the frame stile 22, the BUD 600's door, the stiles between, the pair with
  // its 3, the BUDR2's drawer width, the last stile.
  assert.deepEqual(leaves, [22, 556, 44, 376.5, 3, 376.5, 44, 456, 22]);
  assert.ok(hasRun(leaves, [376.5, 3, 376.5]), 'the pair and the gap between its leaves');
  const units = widthChains(floor.members, P());
  assert.equal(sum(leaves), sum(units.detailed), 'the leaves and the gaps add up to the units: the joiner\'s check');
  assert.equal(leafEdges[0], units.detailedEdges[0]);
  assert.equal(leafEdges[leafEdges.length - 1], units.detailedEdges[units.detailedEdges.length - 1]);

  const off = stage({ inframe: false });
  const offLeaves = leafChains(mountingBands(off.group.members)[0].members).leaves;
  assert.ok(hasRun(offLeaves, [397, 3, 397]), `lay-on, the pair: ${JSON.stringify(offLeaves)}`);
  assert.equal(sum(offLeaves), 1900);
});

// ═══ THE SHEET ═════════════════════════════════════════════════════════════

test('F21 · the fronts sheet prints 360 · 3 · 363 up the right, the 3 beside the chain on a leader', () => {
  for (const scale of [null, 20]) {
    const s = stage({ inframe: true, scale });
    if (scale == null) assert.equal(s.ctx.scale, 15, 'the walk\'s kitchen is laid at 1:15');
    const right = rightChains(s);
    const drawers = right.find((ch) => captions(ch).includes('363'));
    assert.ok(drawers, 'the BUDR2\'s chain is on the right');
    assert.deepEqual(captions(drawers), ['360', '3', '363'], `1:${s.ctx.scale}`);
    assert.equal(lineX(drawers), s.group.to + s.ctx.chainFirst, 'on the inner line');
    const gap = drawers.figures.find((f) => f.caption === '3');
    // A 3 is 0.15 mm of paper at 1:20 and 0.2 mm at 1:15: it cannot carry its
    // figure, so it is LIFTED beside the chain, never dropped.
    assert.equal(gap.lifted, true, 'the 3 is lifted');
    const mid = (gap.a + gap.b) / 2;
    const leader = drawers.find((e) => e.kind === 'line' && e.layer === 'DIMENSIONS'
      && Math.abs(e.y1 - mid) < 1e-6 && Math.abs(e.y2 - mid) < 1e-6 && Math.abs(e.x1 - lineX(drawers)) < 1e-6 && e.x2 > e.x1);
    assert.ok(leader, 'a leader from the chain line to the figure');
    const text = drawers.find((e) => e.kind === 'text' && e.text === '3');
    assert.equal(text.layer, 'DIMENSIONS');
    assert.equal(penWidth(text), PEN.ANNOTATION, 'the gap figure in the ANNOTATION pen');
    assert.equal(text.paperHeight, P().drawings.set.textHeight, 'at the chain\'s own text height');
    const front = drawers.find((e) => e.kind === 'text' && e.text === '360');
    assert.equal(text.paperHeight, front.paperHeight, 'the same height as the front figures beside it');
    // The wall unit on the same inner line, the doors one line out.
    const wall = right.find((ch) => captions(ch).join() === '676');
    assert.equal(lineX(wall), lineX(drawers), 'the wall run shares the inner line');
    const doors = right.find((ch) => captions(ch).join() === '726');
    assert.equal(lineX(doors), s.group.to + s.ctx.chainSecond, 'the doors one line out');
  }
  // Lay-on, the same law: no 3 from two units' edges.
  const off = stage({ inframe: false });
  const all = rightChains(off).map((ch) => captions(ch).join(' ')).sort();
  assert.deepEqual(all, ['382 3 382', '720', '770']);
});

test('F21 · the leaf chain hangs under the floor run\'s unit chain; the overall steps out one line', () => {
  const s = stage({ inframe: true });
  const { ctx } = s;
  const units = chainAtY(s, -ctx.chainFirst);
  assert.deepEqual(captions(units), ['600', '800', '500'], 'the unit chain is where T71 hung it');
  const leaf = chainAtY(s, -ctx.chainSecond);
  assert.ok(leaf, 'a chain on the second line under the run');
  assert.deepEqual(captions(leaf), ['22', '556', '44', '376.5', '3', '376.5', '44', '456', '22']);
  assert.ok(leaf.figures.filter((f) => f.caption === '3').every((f) => f.lifted), 'the gap between the leaves is lifted, not dropped');
  const overall = chainAtY(s, -ctx.chainThird);
  assert.ok(overall, 'the overall on the third line');
  assert.deepEqual(captions(overall), ['1900']);
  // T71's chains keep their places in the list: the unit chain and the overall
  // are where T71's own test reads them.
  assert.deepEqual(captions(s.sheet.chains[1]), ['600', '800', '500']);
  assert.deepEqual(captions(s.sheet.chains[2]), ['1900']);
});

test('F21 · a wall run\'s pair: LEAF, GAP, LEAF under the wall units, in the open wall over the worktop', () => {
  for (const inframe of [true, false]) {
    const s = stage({ inframe, pair: true });
    const { ctx, group } = s;
    const wallBase = mountingBands(group.members)[1].base;
    const under = chainAtY(s, wallBase - ctx.chainFirst);
    assert.ok(under, `inframe ${inframe}: a chain under the wall units`);
    const leaves = captions(under);
    const pair = group.members.find((m) => m.unit.id === s.ids.p);
    const fl = pair.result.panels.filter((p) => p.part === 'FRONT').map((p) => p.box.w);
    assert.equal(fl.length, 2, 'the WUD 800 has two leaves');
    assert.ok(hasRun(leaves, [String(fl[0]), '3', String(fl[1])]), `the pair and its 3: ${leaves.join(' ')}`);
    // First leaf to last: a hung run's chain keeps to its own fronts, so no
    // figure at a carcass end hangs over a tall unit beside the run.
    const runFronts = group.members.filter((m) => m.base === wallBase).flatMap((m) => m.result.panels
      .filter((p) => p.part === 'FRONT').map((p) => [m.x + p.box.x, m.x + p.box.x + p.box.w])).flat();
    assert.equal(under.figures[0].a, Math.min(...runFronts), 'from the first leaf');
    assert.equal(under.figures[under.figures.length - 1].b, Math.max(...runFronts), 'to the last');
    // It stands in the open wall: every figure under the wall units and over
    // the worktop, never over a cabinet.
    const worktopTop = Math.max(...worktopsOnWall(s.a.worktops, 0).map((w) => w.y + w.h));
    for (const f of under.figures) {
      assert.ok(f.y < wallBase && f.y - ctx.textHeight / 2 > worktopTop, `${f.caption} at ${f.y.toFixed(0)} is in the open wall`);
      assert.ok(!group.members.some((m) => f.x > m.x && f.x < m.x + m.width && f.y > m.base && f.y < m.top), `${f.caption} is over no cabinet`);
    }
  }
});

test('F21 · the sheet without fronts keeps T71\'s two lines: no leaf chain, the overall on the second', () => {
  const s = stage({ inframe: true, mode: 'no-fronts', pair: true });
  assert.deepEqual(captions(chainAtY(s, -s.ctx.chainFirst)), ['600', '800', '500']);
  assert.deepEqual(captions(chainAtY(s, -s.ctx.chainSecond)), ['1900']);
  assert.equal(chainAtY(s, -s.ctx.chainThird), undefined);
  const wallBase = mountingBands(s.group.members)[1].base;
  assert.equal(chainAtY(s, wallBase - s.ctx.chainFirst), undefined, 'no leaves where there are no fronts');
});

test('F21 · never dropped: every segment of every chain carries its figure, and no two figures collide', () => {
  for (const inframe of [true, false]) {
    for (const scale of [null, 20]) {
      for (const pair of [false, true]) {
        const s = stage({ inframe, scale, pair });
        for (const ch of s.sheet.chains) {
          const heads = ch.filter((e) => e.kind === 'poly').length;
          assert.equal(ch.figures.length, heads / 2, `one figure per segment: ${captions(ch).join(' ')}`);
        }
        assert.equal(figureCollisions(s.sheet.chains, s.ctx.textHeight).length, 0,
          `inframe ${inframe} 1:${s.ctx.scale} pair ${pair}: no two figures share a spot`);
      }
    }
  }
});

test('F21 · on the laid sheet every chain stays in the drawing box: over the title strip, clear of the column', () => {
  for (const inframe of [true, false]) {
    for (const mode of ['fronts', 'xray']) {
      const s = stage({ inframe, mode, pair: true });
      // Placed as layoutSetSheet places the drawing: its solid centred in the
      // object area, the chains in the bands around it.
      const zones = setZones(P());
      const b = measureRun(s.group, { room: s.a.room, worktops: worktopsOnWall(s.a.worktops, 0), profile: P() });
      const k = s.ctx.scale;
      const ox = zones.object.x + (zones.object.w - b.w / k) / 2 - b.x / k;
      const oy = zones.object.y + (zones.object.h - b.h / k) / 2 - b.y / k;
      const T = s.ctx.textHeight;
      for (const ch of s.sheet.chains) {
        for (const e of ch) {
          // A figure's own box: its width along its line, the text height across it.
          const w = e.kind === 'text' ? figureWidth(e.text, T) / 2 : 0;
          const [hx, hy] = e.rotate ? [T / 2, w] : [w, T / 2];
          const xs = e.kind === 'text' ? [e.x - hx, e.x + hx] : e.kind === 'line' ? [e.x1, e.x2] : e.pts.map((p) => p[0]);
          const ys = e.kind === 'text' ? [e.y - hy, e.y + hy] : e.kind === 'line' ? [e.y1, e.y2] : e.pts.map((p) => p[1]);
          const x1 = ox + Math.max(...xs) / k; const x0 = ox + Math.min(...xs) / k;
          const y0 = oy + Math.min(...ys) / k;
          assert.ok(y0 >= zones.box.y, `${mode}: ${e.kind} ${e.text ?? ''} under the box's floor at ${y0.toFixed(2)}`);
          assert.ok(x1 <= zones.box.x + zones.box.w && x0 >= zones.box.x, `${mode}: ${e.kind} ${e.text ?? ''} out of the box at ${x0.toFixed(2)} to ${x1.toFixed(2)}`);
        }
      }
    }
  }
});

// ═══ AFTER THE REVIEW: THE HAWA DOOR IS A LEAF ON THE CHAINS ═══════════════
//
// INT's review of 25.10.2026: the chains read FRONT and DRAWER-FRONT only, so
// the HAWA pocket door (PART A, `POCKET-DOOR`, role `pocket_door`) was in
// neither chain. On a run BUD 600 (its own door), a one-door pocket hand R and
// the BUD 500 it covers (its own door dropped) the leaf chain read 1.5 · 597 ·
// 600.5, the last figure running from the BUD 600's door across the pocket
// and the covered unit, and the door's height was in no stack. Counted
// blindly, the door would read 1.5 · 597 · 26.5 · TB · 1.5, the 26.5 being
// panel A's face with the two gaps either side of it: a false gap. So the door
// is a leaf (its TB across, its TH up), and the pocket panel that stands on
// the face (panel A of the one-door pocket, flush with the door, in the front
// material) is chained as the board it is, with the true gaps either side.
// The panels behind a door (panel B, both B of the two-door pocket) are not.

const POCKET = 'HAWA_POCKET';
const unitOf = (id) => S().units.find((u) => u.id === id);
const withDoor = (type, x, width) => {
  const id = S().addUnit(type, { wall: 0, x }).id;
  S().updateUnitParams(id, { width });
  S().setDoors(id, { count: 1, hinge: 'L' });
  return id;
};

/**
 * The review's run, butted end to end: a BUD 600 with its own door and a BUD
 * 500 the pocket's door covers (hand R: the pocket left of the BUD 500; hand
 * L: right of it), or the two-door pocket between two BUD 450 it covers.
 */
function hawaRun({ doors = 1, hand = 'R', front18 = false } = {}) {
  S().newProject('T82 F21 review');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  if (front18) S().setFrontType('f1', { source: 'spray', material_id: 'generic-18' });
  const ids = {};
  if (doors === 1 && hand === 'R') {
    ids.c = withDoor('BUD', 2000, 500);
    ids.p = S().addUnit(POCKET, { near: ids.c, side: 'L' }).id;
    ids.a = withDoor('BUD', unitOf(ids.p).position.x_mm - 600, 600);
  } else if (doors === 1) {
    ids.c = withDoor('BUD', 1000, 500);
    ids.p = S().addUnit(POCKET, { near: ids.c, side: 'R' }).id;
    const pu = unitOf(ids.p);
    ids.a = withDoor('BUD', pu.position.x_mm + pu.params.width, 600);
  } else {
    ids.l = withDoor('BUD', 1000, 450);
    ids.p = S().addUnit(POCKET, { near: ids.l, side: 'R' }).id;
    S().setPocket(ids.p, { doors: 2 });
    const pu = unitOf(ids.p);
    ids.r = withDoor('BUD', pu.position.x_mm + pu.params.width, 450);
  }
  const a = { entries: S().allResults(), room: S().project.room };
  const group = wallGroups(a.entries, P())[0];
  const m = (id) => group.members.find((q) => q.unit.id === id);
  const pocket = m(ids.p);
  const part = (re) => pocket.result.panels.filter((p) => re.test(p.id));
  return { ids, group, m, pocket, part, a };
}

/** A board's x span on the wall. */
const span = (m, p) => [m.x + p.box.x, m.x + p.box.x + p.box.w];
const valuesOf = (edges) => edges.slice(1).map((e, i) => Math.round((e - edges[i]) * 100) / 100);

test('F21 review · one door, hand R: the pocket door is a leaf, panel A a board with its true gaps, no false 26.5', () => {
  const run = hawaRun({ doors: 1, hand: 'R' });
  const { group, m, ids, pocket, part } = run;
  assert.equal(m(ids.c).result.panels.some((p) => p.part === 'FRONT'), false, 'the covered BUD 500 has no door of its own');
  const door = part(/^POCKET-DOOR$/)[0];
  const panelA = part(/^POCKET-A$/)[0];
  const bud = m(ids.a).result.panels.find((p) => p.part === 'FRONT');
  const { leaves, leafEdges } = leafChains(mountingBands(group.members)[0].members);
  const expected = [group.from, ...span(m(ids.a), bud), ...span(pocket, panelA), ...span(pocket, door), group.to];
  assert.deepEqual(leafEdges, expected, 'the run end, the BUD 600\'s door, panel A, the pocket door, the run end');
  // Read: 1.5 · 597 · 1.5 · A · 3 · TB · 1.5, every figure a leaf, a board or a gap.
  assert.deepEqual(leaves, valuesOf(expected));
  assert.ok(leaves.includes(door.box.w), `the door's own TB ${door.box.w} is a figure`);
  assert.ok(leaves.includes(panelA.box.w), `panel A's own ${panelA.box.w} is a figure`);
  const [budEnd] = span(m(ids.a), bud).slice(1);
  const [doorStart] = span(pocket, door);
  const across = Math.round((doorStart - budEnd) * 100) / 100;
  assert.ok(across > panelA.box.w, 'between the BUD\'s door and the pocket door: the gap, panel A, the gap');
  assert.ok(!leaves.includes(across), `no figure runs across panel A and its two gaps (${across})`);
  assert.ok(!leaves.includes(Math.round((group.to - budEnd) * 100) / 100), 'no figure runs across the pocket and the covered unit');
  assert.equal(sum(leaves), group.to - group.from, 'the chain still adds up to the run');
  // Up the right: the door's TH is a stack of its own; panel B behind it is not a leaf.
  const stacks = frontStacks(group.members);
  const own = stacks.find((s) => s.ids.includes(ids.p));
  assert.ok(own, 'the pocket\'s door is in the height stacks');
  assert.deepEqual(own.values, [door.box.h]);
  assert.equal(stacks.some((s) => s.ids.includes(ids.c)), false, 'the covered unit has no stack of its own');
  const panelB = part(/^POCKET-B$/)[0];
  assert.ok(!leafEdges.includes(span(pocket, panelB)[0]), 'panel B stands behind the door: not on the chain');
});

test('F21 review · the review\'s own run, an 18 front: 1.5 · 597 · 1.5 · 22 · 3 · 572.5 · 1.5', () => {
  const { group, ids } = hawaRun({ doors: 1, hand: 'R', front18: true });
  const { leaves } = leafChains(mountingBands(group.members)[0].members);
  // The BUD 600's reveal, its door, its reveal; panel A (22 on an 18 front);
  // the door's own gap; TB 572.5; the reveal at the run's end. T81 read the
  // last three as one 600.5, and a blind count read 26.5 for the middle three.
  assert.deepEqual(leaves, [1.5, 597, 1.5, 22, 3, 572.5, 1.5]);
  assert.ok(!leaves.includes(600.5) && !leaves.includes(26.5));
  assert.deepEqual(frontStacks(group.members).find((s) => s.ids.includes(ids.p)).values, [721.5], 'TH up the right');
});

test('F21 review · one door, hand L: the same law, mirrored', () => {
  const { group, m, ids, pocket, part } = hawaRun({ doors: 1, hand: 'L' });
  const door = part(/^POCKET-DOOR$/)[0];
  const panelA = part(/^POCKET-A$/)[0];
  const bud = m(ids.a).result.panels.find((p) => p.part === 'FRONT');
  const { leafEdges, leaves } = leafChains(mountingBands(group.members)[0].members);
  assert.deepEqual(leafEdges, [group.from, ...span(pocket, door), ...span(pocket, panelA), ...span(m(ids.a), bud), group.to]);
  assert.ok(leaves.includes(door.box.w) && leaves.includes(panelA.box.w));
  assert.deepEqual(frontStacks(group.members).find((s) => s.ids.includes(ids.p)).values, [door.box.h]);
});

test('F21 review · two doors: two leaves and the gap between them over the 110 pocket; both B panels behind them', () => {
  const { group, ids, pocket, part } = hawaRun({ doors: 2 });
  const doorL = part(/^POCKET-DOOR-L$/)[0];
  const doorR = part(/^POCKET-DOOR-R$/)[0];
  assert.ok(doorL && doorR, 'the two-door pocket has its two leaves');
  const { leafEdges, leaves } = leafChains(mountingBands(group.members)[0].members);
  assert.deepEqual(leafEdges, [group.from, ...span(pocket, doorL), ...span(pocket, doorR), group.to]);
  const gap = Math.round((doorR.box.x - doorL.box.x - doorL.box.w) * 100) / 100;
  assert.ok(hasRun(leaves, [doorL.box.w, gap, doorR.box.w]), `LEAF, GAP, LEAF: ${leaves.join(' ')}`);
  for (const b of part(/^POCKET-B-/)) assert.ok(!leafEdges.includes(span(pocket, b)[0]), `${b.id} stands behind a door`);
  const own = frontStacks(group.members).find((s) => s.ids.includes(ids.p));
  assert.deepEqual(own.values, [doorL.box.h], 'the two leaves share one height');
});

test('F21 review · on the fronts sheet the pocket\'s figures are printed, the gaps beside the chain on a leader', () => {
  for (const [cfg, scale] of [{ doors: 1, hand: 'R' }, { doors: 1, hand: 'L' }, { doors: 2 }, { doors: 1, hand: 'R', front18: true }]
    .flatMap((c) => [[c, 15], [c, 20]])) {
    const { group, pocket, part, a } = hawaRun(cfg);
    const ctx = drawingContext(scale, P());
    const sheet = buildRunElevation(group, { mode: 'fronts', room: a.room, worktops: [], profile: P(), ctx });
    const leaf = chainAtY({ sheet }, -ctx.chainSecond);
    assert.ok(leaf, `${JSON.stringify(cfg)}: the leaf chain under the run`);
    for (const d of part(/^POCKET-DOOR/)) assert.ok(captions(leaf).includes(formatMm(d.box.w)), `the door's TB ${d.box.w} printed`);
    assert.equal(leaf.figures.length, leaf.filter((e) => e.kind === 'poly').length / 2, 'one figure per segment');
    assert.ok(leaf.figures.filter((f) => f.b - f.a <= 3.5).every((f) => f.lifted), 'every gap beside the chain, never dropped');
    // A lifted figure has its leader, or stands on the row just off the line
    // beside its own arrows (the third spot, where both levels are taken).
    for (const f of leaf.figures.filter((g) => g.lifted && !g.row)) {
      assert.ok(leaf.some((e) => e.kind === 'line' && e.x1 === f.x && e.x2 === f.x), `${f.caption} has its leader`);
    }
    const right = rightChains({ sheet, group });
    assert.ok(right.some((ch) => captions(ch).includes(formatMm(part(/^POCKET-DOOR/)[0].box.h))), 'the door\'s TH up the right');
    assert.equal(figureCollisions(sheet.chains, ctx.textHeight).length, 0);
    void pocket;
  }
});

test('F21 review · the walk\'s kitchen: every dimension entity of its sheets byte for byte as before the review', () => {
  // Pinned on fa3bf30d, before this fix: sha256 of the sheet's DIMENSIONS
  // entities (JSON), the first 16 hex, and their count.
  const PINNED = {
    'inframe:fronts': '41e452c587069a50 n=121',
    'inframe:xray': '41e452c587069a50 n=121',
    'inframe:no-fronts': '1eac86281936196e n=59',
    'layon:fronts': '3b90ae822cc52b72 n=116',
    'layon:xray': '3b90ae822cc52b72 n=116',
    'layon:no-fronts': 'ad9423de50aa18e0 n=54',
  };
  for (const inframe of [true, false]) {
    for (const mode of ['fronts', 'xray', 'no-fronts']) {
      const s = stage({ inframe, mode });
      const ents = s.sheet.entities.filter((e) => e.layer === 'DIMENSIONS');
      const got = `${createHash('sha256').update(JSON.stringify(ents)).digest('hex').slice(0, 16)} n=${ents.length}`;
      assert.equal(got, PINNED[`${inframe ? 'inframe' : 'layon'}:${mode}`], `${inframe ? 'in-frame' : 'lay-on'} ${mode}`);
    }
  }
});

// ═══ AFTER THE REVIEW (C/D/E): ONLY LEAVES SEEN FACE-ON ═══════════════════
//
// The review's find (sheets 1): an L corner's B-arm door stands along z
// (`meta.swingZ`; on a corner seen from the other wall, `meta.faceX`), so on
// this wall's elevation it is a board edge, 25 wide, inside the A door. The
// chain took it as a leaf and printed 558 · 3 · 25 · 312.5 · 93 · 597 · 1.5:
// the A leaf's 340.5 nowhere, a "25" that is no leaf. A chain of fronts
// takes only the leaves the elevation sees face-on, the projector's own law
// (projector.js handleMarks: a leaf standing along z is not drawn as a face).

function cornerRun(side = 'left') {
  S().newProject('T82 F21 review, L corner');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const l = S().addUnit('CORNER_L_BASE', { wall: 0, x: 0 }).id;
  S().updateUnitParams(l, { corner_side: side, doors: true });
  const b = withDoor('BUD', 1000, 600);
  const group = wallGroups(S().allResults(), P())[0];
  return { group, corner: group.members.find((m) => m.unit.id === l), bud: group.members.find((m) => m.unit.id === b) };
}

test('F21 review · the L corner\'s B-arm door, turned along z, is no leaf on this wall: the A leaf reads whole', () => {
  for (const side of ['left', 'right']) {
    const { group, corner, bud } = cornerRun(side);
    const fronts = corner.result.panels.filter((p) => p.box && p.part === 'FRONT');
    const turned = fronts.filter((p) => p.meta?.swingZ || p.meta?.faceX);
    const facing = fronts.filter((p) => !p.meta?.swingZ && !p.meta?.faceX);
    assert.ok(turned.length >= 1 && facing.length >= 1, `${side}: the corner has a leaf of each kind`);
    const { leafEdges, leaves } = leafChains(mountingBands(group.members)[0].members);
    for (const p of turned) {
      const [x0, x1] = span(corner, p);
      assert.ok(!(leafEdges.includes(x0) && leafEdges.includes(x1)), `${side}: ${p.id}'s edge (${p.box.w}) is not a leaf on the chain`);
    }
    for (const p of facing) assert.ok(leaves.includes(p.box.w), `${side}: ${p.id} reads whole, ${p.box.w}`);
    const door = bud.result.panels.find((p) => p.part === 'FRONT');
    const expected = [group.from, ...facing.flatMap((p) => span(corner, p)), ...span(bud, door), group.to]
      .sort((a, b) => a - b).filter((v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]) > 0.5);
    assert.deepEqual(leafEdges, expected, `${side}: the run's ends, the A leaf, the BUD's door`);
    assert.equal(sum(leaves), group.to - group.from, 'and the chain adds up to the run');
    // Up the right, only face-on leaves make a stack.
    const stacks = frontStacks(group.members);
    const own = stacks.find((s) => s.ids.includes(corner.unit.id));
    const ys = [...new Set(facing.flatMap((p) => [corner.base + p.box.y, corner.base + p.box.y + p.box.h]))].sort((a, b) => a - b);
    assert.deepEqual(own.edges, ys, `${side}: the corner's stack is its facing leaf's`);
  }
});

// ═══ AFTER THE REVIEW (C/D/E): THE FRONT CHAINS STAY IN THEIR BAND ═════════
//
// The review's find (sheets 0): runChains hung one line per overlapping
// stack at 8 + 9k paper mm with no limit, so a wall of many different drawer
// banks put its 4th line past the 26 mm band and over the side column's
// legend (a 6800 wall at 1:25: the 4th line at x 350, the column at 348).
// The law now: the lines stand where T71 hangs them when they all fit; where
// they do not, they step in, each just clear of the figures of the line
// inside it, with its figures beside its own arrows; a stack that still finds
// no room in the band is not drawn past it but named on the sheet in words.

function runOf(spec, wall = 8000, inframe = false) {
  S().newProject('T82 F21 review, the band');
  S().setRoom({ corners: rectCorners(wall, 3000), height: 2500 });
  let x = 300;
  for (const [type, w, doors] of spec) {
    const id = S().addUnit(type, { wall: 0, x }).id;
    S().updateUnitParams(id, { width: w });
    if (doors) S().setDoors(id, { count: doors, hinge: 'L' });
    x += w;
  }
  S().setDesign({ inframe });
  const st = S();
  const args = {
    entries: st.allResults(), project: st.project, room: st.project.room, worktops: st.worktopsOf(),
    design: st.project.design, profile: P(), date: '25/10/2026',
  };
  return { args, group: wallGroups(args.entries, P())[0] };
}

const SEVEN = [['BUD', 600, 1], ['BUDR2', 500], ['BUDR4', 500], ['BUDR', 600, 1], ['BUD', 800, 2], ['BUD', 600, 1], ['BUD', 500, 1]];
const EIGHT = [['BUD', 600, 1], ['BUDR2', 500], ['BUDR4', 500], ['BUDR', 600, 1], ['DW_PANEL', 600], ['OVEN_BASE', 600], ['BUDTALL', 600, 1], ['BUDR2_HOB', 600]];
const FIVE = [['BUD', 600, 1], ['BUDR2', 500], ['BUDR', 500], ['BUDR4', 500], ['BUD', 800, 2]];
const REVIEW_CASES = [['seven units, 6800', SEVEN, 6800], ['eight units, 6600', EIGHT, 6600], ['five units, 4100', FIVE, 4100]];

test('F21 review · on the laid sheet no front chain passes the band into the column', () => {
  for (const [name, spec, wall] of REVIEW_CASES) {
    const { args } = runOf(spec, wall);
    for (const variant of ['fronts', 'xray']) {
      const found = wallDrawingSheets(args).find((x) => x.variant === variant);
      const sheet = found.sheet || found;
      const col = sheet.zones.column.x;
      for (const e of sheet.entities.filter((q) => q.layer === 'DIMENSIONS' && q.meta !== 'legend')) {
        const x1 = e.kind === 'text' ? e.x + (e.rotate ? e.height / 2 : figureWidth(e.text, e.height) / 2)
          : e.kind === 'line' ? Math.max(e.x1, e.x2) : e.kind === 'poly' ? Math.max(...e.pts.map((p) => p[0])) : -Infinity;
        assert.ok(x1 <= col + 1e-6, `${name} ${variant}: ${e.kind} ${e.text ?? ''} at ${x1.toFixed(2)} is past the column line ${col}`);
      }
    }
  }
});

test('F21 review · every stack is chained inside the band, or named on the sheet in words', () => {
  for (const [name, spec, wall] of REVIEW_CASES) {
    const { args, group } = runOf(spec, wall);
    const worktops = worktopsOnWall(args.worktops, 0);
    const k = chooseSetScale(measureRun(group, { room: args.room, worktops, profile: P() }), setZones(P()).object, P()).scale;
    const ctx = drawingContext(k, P());
    const sheet = buildRunElevation(group, { mode: 'fronts', room: args.room, worktops, profile: P(), ctx });
    const right = rightChains({ sheet, group });
    // The run's right edge as the sheet takes it (the wall's end, when the
    // run reaches near it): the inner line stands chainFirst beyond it.
    const edge = Math.min(...right.map(lineX)) - ctx.chainFirst;
    // Inside the band: every entity of every front chain.
    for (const ch of right) {
      for (const e of ch) {
        const x1 = e.kind === 'text' ? e.x + ctx.textHeight / 2 : e.kind === 'line' ? Math.max(e.x1, e.x2) : Math.max(...e.pts.map((p) => p[0]));
        assert.ok(x1 <= edge + ctx.band + 1e-6, `${name}: ${e.kind} ${e.text ?? ''} at ${((x1 - edge) / ctx.scale).toFixed(2)} paper mm, past the band`);
      }
    }
    const note = sheet.entities.filter((e) => e.note === 'fronts-unchained').map((e) => e.text).join(' ');
    const numOf = (id) => group.members.find((m) => m.unit.id === id).unit.params.unit_num;
    let chained = 0;
    for (const s of frontStacks(group.members)) {
      const drawn = right.some((ch) => captions(ch).join(' ') === s.values.map((v) => formatMm(v)).join(' '));
      if (drawn) { chained += 1; continue; }
      for (const id of s.ids) assert.ok(note.includes(numOf(id)), `${name}: the stack ${s.values.join(' ')} of ${numOf(id)} is chained or named (${note})`);
      assert.match(note, /see the cut list/);
    }
    // Every stack with a gap in it (FRONT, GAP, FRONT) is chained: what the band cannot hold is a single front.
    for (const s of frontStacks(group.members).filter((q) => q.values.length > 1)) {
      assert.ok(right.some((ch) => captions(ch).join(' ') === s.values.map((v) => formatMm(v)).join(' ')), `${name}: ${s.values.join(' ')} chained`);
    }
    assert.ok(chained >= 3, `${name}: the lines step in: ${chained} chained`);
    assert.equal(figureCollisions(sheet.chains, ctx.textHeight).length, 0, `${name}: no two figures share a spot`);
  }
});
