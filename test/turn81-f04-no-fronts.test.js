/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F4 · THE SHEET WITHOUT FRONTS
//
// The owner, 22.10.2026 (21:23): *"nastepnie widok wszystkich scian bez
// frontow, tak jakbysmy ukryli albo sciagneli fronty"*. CLAUDE.md T81 F4:
// "Tests test/turn81-f04-no-fronts.test.js: no DOORS entity; the drawer boxes
// of the BUDR2 as rectangles at the engine's box positions; the hinge plates
// at the ladder's heights on the side; the frame present under in-frame."

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

function noFronts(inframe) {
  const ids = t81Kitchen({ inframe });
  const a = setArgs();
  const group = wallGroups(a.entries, P())[0];
  const sheet = buildRunElevation(group, {
    mode: 'no-fronts', room: a.room, worktops: worktopsOnWall(a.worktops, 0), frontTypeOf: a.frontTypeOf, profile: P(), ctx: drawingContext(15, P()),
  });
  return { ids, group, sheet };
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

test('F4 · no DOORS entity: the fronts lifted off as the room\'s Hide fronts lifts them; the end panel stays, in the carcass\'s ink', () => {
  for (const inframe of [true, false]) {
    const { ids, group, sheet } = noFronts(inframe);
    assert.deepEqual(sheet.entities.filter((e) => e.layer === 'DOORS'), [], 'no front on the sheet');
    assert.equal(sheet.entities.filter((e) => e.layer === 'HANDLES' || e.layer === 'HINGE_MARK' || e.layer === 'DOOR_SWING').length, 0,
      'nothing that rides on a front');
    const fronts = new Set(group.members.flatMap((m) => m.result.panels
      .filter((p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT').map((p) => `${m.unit.id}:${p.id}`)));
    assert.equal(sheet.entities.filter((e) => fronts.has(e.src)).length, 0, 'not one edge of a leaf');
    // 3d/UnitView.jsx: `hideFronts && frontKind(p)` takes the doors and the
    // drawer fronts and nothing else; the END panel is still in the room.
    assert.ok(sheet.entities.some((e) => e.kind === 'line' && e.layer === 'CARCASE' && e.src === `${ids.a}:END-L`), 'the end panel');
  }
});

test('F4 · the BUDR2\'s drawer boxes, as rectangles at the engine\'s box positions', () => {
  for (const inframe of [true, false]) {
    const { ids, group, sheet } = noFronts(inframe);
    const m = group.members.find((x) => x.unit.id === ids.c);
    const sides = m.result.panels.filter((p) => p.part === 'DRAWER-SIDE');
    const drawers = [...new Set(sides.map((p) => p.id.split('-')[0]))];
    assert.equal(drawers.length, 2);
    for (const d of drawers) {
      const mine = sides.filter((p) => p.id.startsWith(`${d}-`));
      const x0 = m.x + Math.min(...mine.map((p) => p.box.x));
      const x1 = m.x + Math.max(...mine.map((p) => p.box.x + p.box.w));
      const y0 = m.base + Math.min(...mine.map((p) => p.box.y));
      const y1 = m.base + Math.max(...mine.map((p) => p.box.y + p.box.h));
      const lines = sheet.entities.filter((e) => e.kind === 'line' && e.layer === 'SHELVES' && e.src.startsWith(`${ids.c}:${d}-`));
      assert.ok(lines.length >= 4, `${d}: its boards are drawn`);
      const xs = lines.flatMap((e) => [e.x1, e.x2]);
      const ys = lines.flatMap((e) => [e.y1, e.y2]);
      assert.ok(near(Math.min(...xs), x0) && near(Math.max(...xs), x1), `${d}: x ${Math.min(...xs)}..${Math.max(...xs)} is the box's ${x0}..${x1}`);
      assert.ok(near(Math.min(...ys), y0) && near(Math.max(...ys), y1), `${d}: y ${Math.min(...ys)}..${Math.max(...ys)} is the box's ${y0}..${y1}`);
    }
  }
});

test('F4 · the hinge plates at the ladder\'s heights, on the side the leaf hangs from', () => {
  for (const inframe of [true, false]) {
    const { ids, group, sheet } = noFronts(inframe);
    for (const id of [ids.a, ids.b, ids.w]) {
      const m = group.members.find((x) => x.unit.id === id);
      const hinges = hardwareInstances(m.result, P()).hinges;
      const plates = sheet.entities.filter((e) => e.kind === 'line' && e.family === 'plate' && e.src.startsWith(`${id}:`));
      assert.ok(plates.length > 0, `${m.unit.params.unit_num}: plates drawn`);
      for (const hg of hinges) {
        const y = m.base + hg.y;
        const x = m.x + hg.plateX;
        assert.ok(plates.some((e) => Math.min(e.y1, e.y2) <= y + 0.01 && Math.max(e.y1, e.y2) >= y - 0.01
          && Math.min(Math.abs(e.x1 - x), Math.abs(e.x2 - x)) < P().hardware.hinge.plateThickness + 0.01),
        `${m.unit.params.unit_num}: a plate across the cup row ${y} at the side ${x}`);
      }
    }
  }
});

test('F4 · the frame stays under in-frame (it is the carcass\'s face); the plinth too, and the legs stand behind it', () => {
  const on = noFronts(true);
  assert.ok(on.sheet.entities.some((e) => e.layer === 'FRAME_BOARD'), 'the frame, as the owner\'s DXF keeps it');
  const off = noFronts(false);
  assert.equal(off.sheet.entities.filter((e) => e.layer === 'FRAME_BOARD').length, 0);
  for (const { sheet } of [on, off]) {
    assert.ok(sheet.entities.some((e) => e.layer === 'CARCASE' && e.part === 'PLINTH'), 'the plinth');
    // The run's plinth stands in front of every leg: the room shows none, and
    // neither does the sheet (the X-ray and the sections draw them).
    assert.equal(sheet.entities.filter((e) => e.layer === 'LEG_BLOCK').length, 0, 'the legs, hidden by the plinth');
  }
});

test('F4 · an appliance space: the kit body the room walls in, the dashed aperture and the name', () => {
  S().newProject('T81 F4 appliance');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  assert.ok(S().addUnit('BIN', { wall: 0, x: 1000 }).id);
  assert.ok(S().addUnit('DW_PANEL', { wall: 0, x: 1600 }).id);
  const sheet = wallDrawingSheets(setArgs()).find((s) => s.variant === 'no-fronts').sheet;
  assert.ok(sheet.entities.some((e) => e.kind === 'line' && e.layer === 'APPLIANCE' && e.family === 'kit'), 'the bin\'s placeholder body');
  assert.ok(sheet.entities.some((e) => e.kind === 'rect' && e.layer === 'APPLIANCE' && e.hidden), 'the D/W aperture, dashed');
  assert.ok(sheet.entities.some((e) => e.kind === 'text' && e.layer === 'APPLIANCE' && e.text === 'D/W'));
});
