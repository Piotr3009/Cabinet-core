/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F5 · THE X-RAY SHEET
//
// The owner, 22.10.2026 (22:57): *"zalezy mi zebys rysowal w pdf 1 do 1 co
// mamy na cabinet core, a przeciez mamy x-ray, to tez mozna zrobic x-ray
// prosze."* CLAUDE.md T81 F5: "Tests test/turn81-f05-xray.test.js: the door
// rectangle present on XRAY_FRONT, the carcass on XRAY_CARCASE, the drawer
// boxes and runners in full ink; nothing filled."

import test from 'node:test';
import assert from 'node:assert/strict';

import { t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { buildRunElevation, worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';

const P = () => getCabinetProfile();

function xray(inframe) {
  const ids = t81Kitchen({ inframe });
  const a = setArgs();
  const group = wallGroups(a.entries, P())[0];
  const sheet = buildRunElevation(group, {
    mode: 'xray', room: a.room, worktops: worktopsOnWall(a.worktops, 0), frontTypeOf: a.frontTypeOf, profile: P(), ctx: drawingContext(15, P()),
  });
  return { ids, group, sheet };
}

test('F5 · the door rectangle on XRAY_FRONT, every leaf of the wall', () => {
  for (const inframe of [true, false]) {
    const { group, sheet } = xray(inframe);
    for (const m of group.members) {
      for (const p of m.result.panels.filter((q) => q.box && (q.part === 'FRONT' || q.part === 'DRAWER-FRONT'))) {
        const leaf = sheet.entities.filter((e) => e.kind === 'rect' && e.layer === 'XRAY_FRONT' && !e.meta && e.src === `${m.unit.id}:${p.id}`);
        assert.equal(leaf.length, 1, `${m.unit.params.unit_num} ${p.id}: one rectangle`);
        assert.deepEqual([leaf[0].x, leaf[0].y, leaf[0].w, leaf[0].h], [m.x + p.box.x, m.base + p.box.y, p.box.w, p.box.h]);
      }
    }
    assert.equal(sheet.entities.filter((e) => e.layer === 'DOORS').length, 0, 'no front in the opaque ink');
  }
});

test('F5 · the carcass on XRAY_CARCASE: the sides, the top and the bottom, the frame and the plinth faded as the room fades them', () => {
  for (const inframe of [true, false]) {
    const { ids, sheet } = xray(inframe);
    const carcass = sheet.entities.filter((e) => e.layer === 'XRAY_CARCASE');
    for (const part of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'PLINTH']) {
      assert.ok(carcass.some((e) => e.src === `${ids.a}:${part}`), `the BUD 600's ${part}`);
    }
    if (inframe) assert.ok(carcass.some((e) => e.src.startsWith(`${ids.a}:FRAME`)), 'the frame, carcass under the X-ray (3d/UnitView.jsx frontKind)');
    assert.equal(sheet.entities.filter((e) => e.layer === 'CARCASE' || e.layer === 'FRAME_BOARD').length, 0, 'no shell board in its opaque ink');
    // The X-ray's greys are drawn thin, as the room fades them.
    assert.ok([...carcass, ...sheet.entities.filter((e) => e.layer === 'XRAY_FRONT')].every((e) => e.pen === 'THIN'));
  }
});

test('F5 · the drawer boxes and the runners inside, in their own full ink', () => {
  for (const inframe of [true, false]) {
    const { ids, group, sheet } = xray(inframe);
    const m = group.members.find((x) => x.unit.id === ids.c);
    const sides = m.result.panels.filter((p) => p.part === 'DRAWER-SIDE');
    assert.equal(new Set(sides.map((p) => p.id.split('-')[0])).size, 2);
    for (const p of sides) {
      assert.ok(sheet.entities.some((e) => e.src === `${ids.c}:${p.id}` && e.layer !== 'XRAY_CARCASE' && e.layer !== 'XRAY_FRONT'),
        `${p.id} in its own ink`);
    }
    const runners = hardwareInstances(m.result, P()).runners;
    assert.ok(runners.length >= 2);
    const drawn = sheet.entities.filter((e) => e.family === 'runner' && e.src.startsWith(`${ids.c}:`));
    assert.ok(drawn.length > 0, 'the runners show through');
    assert.ok(drawn.every((e) => e.layer === 'RUNNERS'), 'in the runner\'s own ink, never an X-ray grey');
    // The hinges and the legs through the shell, as the room's X-ray brings them out.
    assert.ok(sheet.entities.some((e) => e.family === 'plate' && e.src.startsWith(`${ids.a}:`)), 'the plates');
    assert.ok(sheet.entities.some((e) => e.layer === 'LEG_BLOCK' && e.src.startsWith(`${ids.a}:`)), 'the legs behind the plinth');
  }
});

test('F5 · nothing filled: no painter\'s white, no slab tint, no hinge bar', () => {
  for (const inframe of [true, false]) {
    const { sheet } = xray(inframe);
    assert.deepEqual(sheet.entities.filter((e) => e.layer === 'MASK' || (e.fill && e.layer !== 'DIMENSIONS')).map((e) => `${e.layer}:${e.src || ''}`), []);
    assert.equal(sheet.entities.filter((e) => e.layer === 'HINGE_MARK').length, 0, 'a bar is the fronts sheet\'s mark, painted on a leaf');
  }
  // On the sheet as the reader gets it: no white path over the boards.
  t81Kitchen({ inframe: true });
  const page = wallDrawingSheets(setArgs()).find((s) => s.variant === 'xray');
  const svg = sheetToSvg(page.sheet, { kind: 'wall' });
  assert.ok(!/data-layer="MASK"/.test(svg));
  assert.ok(/data-layer="XRAY_FRONT"/.test(svg) && /data-layer="XRAY_CARCASE"/.test(svg));
});

test('F5 · the internals over the greys: every faded board is drawn before the first internal stroke', () => {
  const { sheet } = xray(true);
  const grey = (e) => e.layer === 'XRAY_CARCASE' || e.layer === 'XRAY_FRONT';
  const solid = sheet.entities.filter((e) => e.src && e.solid);
  const lastGrey = solid.map(grey).lastIndexOf(true);
  const firstInner = solid.findIndex((e) => !grey(e));
  assert.ok(lastGrey >= 0 && firstInner > lastGrey, `the greys ${lastGrey}, the first internal ${firstInner}`);
});

test('F5 · the unit numbers on the X-ray, in their clear bands', () => {
  const { group, sheet } = xray(true);
  const nums = sheet.entities.filter((e) => e.kind === 'text' && e.layer === 'UNIT_NUMBER').map((e) => e.text).sort();
  assert.deepEqual(nums, group.members.map((m) => String(m.unit.params.unit_num)).sort());
});
