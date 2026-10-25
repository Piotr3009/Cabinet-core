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

import { S, t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import {
  frontChainLines, frontStacks, heightChains, leafChains, mountingBands, wallGroups, widthChains,
} from '../src/engine/drawings/wallElevation.js';
import { buildRunElevation, measureRun, worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { chooseSetScale, drawingContext, setZones } from '../src/engine/drawings/setSheet.js';
import { figureCollisions, figureWidth } from '../src/engine/drawings/setChains.js';
import { PEN, penWidth } from '../src/engine/drawings/layers.js';

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
