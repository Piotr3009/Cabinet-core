/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F3 · THE FRONTS SHEET
//
// The owner, 22.10.2026: (21:23) *"pozniej chce widziec wszystkie fronty, bez
// przebijania carcasow, tylko to co widac za frontami, i tyle, fronty
// magenta"*; (22:56) *"1 shaker zostaw jak jest"*, *"2 zawiasy na elewacji
// wedlug silnika i podobnie jak na moim dxf"*, *"3 galki 30 mm, wysokosc
// wedlug silnika (pozycja jak kto ustawi)"*. CLAUDE.md T81 F3: "Tests
// test/turn81-f03-fronts.test.js: the BUD 600's door carries two or three
// bars exactly at the ladder's cup heights (the count the engine gives, never
// typed); the pair's bars on the outer edges; the knob circle of 30 at the
// drill summary's point; an in-frame run shows its frame board and the 19
// above and below; a lay-on run shows no frame; no CARCASE line lies inside a
// front's rectangle."

import test from 'node:test';
import assert from 'node:assert/strict';

import { S, t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { buildRunElevation, worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { rectCorners } from '../src/engine/room.js';

const P = () => getCabinetProfile();
const ctx = () => drawingContext(15, P());

function fronts(inframe) {
  const ids = t81Kitchen({ inframe });
  const a = setArgs();
  const group = wallGroups(a.entries, P())[0];
  const sheet = buildRunElevation(group, {
    mode: 'fronts', room: a.room, worktops: worktopsOnWall(a.worktops, 0), frontTypeOf: a.frontTypeOf, profile: P(), ctx: ctx(),
  });
  return { ids, group, sheet, a };
}

const memberOf = (group, id) => group.members.find((m) => m.unit.id === id);
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

test('F3 · the BUD 600\'s door carries the bars the engine\'s ladder bores, on its hinge edge, 6 x 70', () => {
  for (const inframe of [true, false]) {
    const { ids, group, sheet } = fronts(inframe);
    const m = memberOf(group, ids.a);
    const door = m.result.panels.find((p) => p.part === 'FRONT');
    const cups = hardwareInstances(m.result, P()).hinges.filter((h) => h.panelId === door.id);
    assert.ok(cups.length === 2 || cups.length === 3, 'two or three, as the engine says');
    const bars = sheet.entities.filter((e) => e.layer === 'HINGE_MARK' && e.src === `${ids.a}:${door.id}`);
    assert.equal(bars.length, cups.length, 'one bar per cup, the count never typed');
    const { width, height } = P().drawings.hingeBar;
    for (const hg of cups) {
      const bar = bars.find((b) => near(b.y + b.h / 2, m.base + hg.y));
      assert.ok(bar, `a bar centred on the cup at ${m.base + hg.y}`);
      assert.deepEqual([bar.w, bar.h], [width, height]);
      // Hinge L: on the leaf's left edge, inside its outline.
      assert.ok(near(bar.x, m.x + door.box.x), 'on the hinge edge');
      assert.equal(bar.fill, '#111111', 'a solid black bar, as the owner\'s DXF draws it');
    }
  }
});

test('F3 · a pair of doors: the bars on the outer edges', () => {
  const { ids, group, sheet } = fronts(true);
  const m = memberOf(group, ids.b);
  const left = m.result.panels.find((p) => p.id.endsWith('-FL'));
  const right = m.result.panels.find((p) => p.id.endsWith('-FR'));
  const barsOf = (p) => sheet.entities.filter((e) => e.layer === 'HINGE_MARK' && e.src === `${ids.b}:${p.id}`);
  assert.ok(barsOf(left).length > 0 && barsOf(right).length > 0);
  assert.ok(barsOf(left).every((b) => near(b.x, m.x + left.box.x)), 'the left leaf on its left edge');
  assert.ok(barsOf(right).every((b) => near(b.x + b.w, m.x + right.box.x + right.box.w)), 'the right leaf on its right edge');
  // A drawer front is not hinged: no bar on the BUDR2.
  assert.equal(sheet.entities.filter((e) => e.layer === 'HINGE_MARK' && e.src.startsWith(`${ids.c}:`)).length, 0);
});

test('F3 · the knob: a circle of 30 at the drill summary\'s point, mirrored out of the front\'s cut frame as the room does', () => {
  for (const inframe of [true, false]) {
    const { group, sheet } = fronts(inframe);
    const circles = sheet.entities.filter((e) => e.kind === 'circle' && e.layer === 'HANDLES' && e.handle === 'knob');
    let expected = 0;
    for (const m of group.members) {
      for (const h of m.result.drillSummary?.handles || []) {
        const p = m.result.panels.find((q) => q.id === h.panel);
        for (const [hx, hy] of h.holes) {
          expected += 1;
          const cx = m.x + p.box.x + p.box.w - hx;
          const cy = m.base + p.box.y + hy;
          assert.ok(circles.some((c) => near(c.cx, cx) && near(c.cy, cy) && c.r === P().drawings.knobDiameter / 2),
            `${m.unit.params.unit_num} ${p.id}: a 30 knob at ${cx}, ${cy}`);
        }
      }
    }
    assert.equal(circles.length, expected, 'one circle per drilled knob');
    assert.equal(expected, 6);
  }
});

test('F3 · an in-frame run shows its frame board and the 19 above and below; a lay-on run shows no frame', () => {
  const on = fronts(true);
  const frame = on.sheet.entities.filter((e) => e.kind === 'line' && e.layer === 'FRAME_BOARD');
  assert.ok(frame.length > 0, 'the frame is on the fronts sheet');
  const base = on.group.members.filter((m) => m.base < 200);
  const ys = frame.filter((e) => e.src.startsWith(`${on.ids.a}:FRAME`)).flatMap((e) => [e.y1, e.y2]);
  const bottom = Math.min(...base.map((m) => m.base));
  const top = Math.max(...base.map((m) => m.top));
  assert.ok(near(Math.min(...ys), bottom - 19), `19 below the carcass: ${Math.min(...ys)}`);
  assert.ok(near(Math.max(...ys), top + 19), `19 above it: ${Math.max(...ys)}`);
  const off = fronts(false);
  assert.equal(off.sheet.entities.filter((e) => e.layer === 'FRAME_BOARD').length, 0, 'lay-on: no frame');
});

test('F3 · no CARCASE line lies inside a front\'s rectangle, and nothing from inside the carcass shows', () => {
  for (const inframe of [true, false]) {
    const { group, sheet } = fronts(inframe);
    for (const m of group.members) {
      for (const p of m.result.panels.filter((q) => q.box && (q.part === 'FRONT' || q.part === 'DRAWER-FRONT'))) {
        const x0 = m.x + p.box.x; const x1 = x0 + p.box.w; const y0 = m.base + p.box.y; const y1 = y0 + p.box.h;
        const inside = sheet.entities.filter((e) => e.kind === 'line' && e.layer === 'CARCASE'
          && Math.min(e.x1, e.x2) > x0 + 0.1 && Math.max(e.x1, e.x2) < x1 - 0.1
          && Math.min(e.y1, e.y2) > y0 + 0.1 && Math.max(e.y1, e.y2) < y1 - 0.1);
        assert.deepEqual(inside, [], `${m.unit.params.unit_num} ${p.id}`);
      }
    }
    for (const layer of ['SHELVES', 'RUNNERS', 'HINGES', 'LEG_BLOCK']) {
      assert.equal(sheet.entities.filter((e) => e.kind === 'line' && e.layer === layer).length, 0, `no ${layer} on the fronts`);
    }
  }
});

test('F3 · shaker as it was: the field on the DOORS layer, from the front-detail law, and the swing from the hinge side', () => {
  const { ids, group, sheet } = fronts(true);
  const m = memberOf(group, ids.a);
  const door = m.result.panels.find((p) => p.part === 'FRONT');
  const field = sheet.entities.filter((e) => e.layer === 'DOORS' && e.meta === 'front-detail' && e.src === `${ids.a}:${door.id}`);
  assert.equal(field.length, 1, 'the field\'s rectangle, one rect as the single front elevation writes it');
  const leaf = sheet.entities.find((e) => e.kind === 'rect' && e.layer === 'DOORS' && !e.meta && e.src === `${ids.a}:${door.id}`);
  assert.ok(leaf, 'the leaf itself, one rect');
  const inset = field[0].x - leaf.x;
  assert.ok(inset > 0 && Math.abs((leaf.x + leaf.w) - (field[0].x + field[0].w) - inset) < 1e-6
    && Math.abs(field[0].y - leaf.y - inset) < 1e-6, `the field sits square in the leaf: ${inset}`);
  const swing = sheet.entities.filter((e) => e.layer === 'DOOR_SWING' && e.src === `${ids.a}:${door.id}`);
  assert.equal(swing.length, 2, 'the two diagonals from the hinge side');
});

test('F3 · an appliance unit is named on the fronts sheet, from applianceLabel', () => {
  S().newProject('T81 F3 appliance');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = S().addUnit('BUD', { wall: 0, x: 0 }).id;
  const d = S().addUnit('DW_PANEL', { wall: 0, x: 600 }).id;
  void a; void d;
  const sheets = wallDrawingSheets(setArgs());
  const sheet = sheets.find((s) => s.variant === 'fronts').sheet;
  assert.ok(sheet.entities.some((e) => e.kind === 'text' && e.layer === 'APPLIANCE' && e.text === 'D/W behind'));
});
