/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F1 · ONE PROJECTOR, FED BY WHAT THE ROOM DRAWS
//
// CLAUDE.md T81 F1: "Tests test/turn81-f01-projector.test.js: the probe census
// as assertions: for the walk's kitchen, in-frame on and off, the set of
// boards the projector was fed equals the set the room draws (by part id);
// every hardware instance has a silhouette or the named fallback; the fronts
// view of the BUD 600 shows exactly one door rectangle 556 x 726 and no
// carcass line inside it; the no-fronts view shows the hinge plates and no
// door; the X-ray view shows both." The owner, 22.10.2026 (22:57): *"zalezy
// mi zebys rysowal w pdf 1 do 1 co mamy na cabinet core"*. The probe:
// verify/t81/f01-probe.md.

import test from 'node:test';
import assert from 'node:assert/strict';

import { S, t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import {
  projectRun, projectRoom, runSolids, mergeCollinear, orthoView, unitNumbers, applianceMarks, numberSlot,
} from '../src/engine/drawings/projector.js';

const P = () => getCabinetProfile();

function stage(inframe) {
  const ids = t81Kitchen({ inframe });
  const a = setArgs();
  const group = wallGroups(a.entries, P())[0];
  const worktops = worktopsOnWall(a.worktops, 0);
  return { ids, a, group, worktops };
}

/** The room's own board filter (3d/UnitView.jsx, the MovingPanel map), written out here. */
const roomDraws = (result) => result.panels.filter((p) => p.box && !p.meta?.frontDecorationParent).map((p) => p.id).sort();

const lines = (r, pred = () => true) => r.entities.filter((e) => e.kind === 'line' && pred(e));
const inside = (e, box, eps = 0.1) => Math.min(e.x1, e.x2) > box.x0 + eps && Math.max(e.x1, e.x2) < box.x1 - eps
  && Math.min(e.y1, e.y2) > box.y0 + eps && Math.max(e.y1, e.y2) < box.y1 - eps;

for (const inframe of [true, false]) {
  const label = inframe ? 'in-frame ON' : 'in-frame OFF';

  test(`F1 · ${label}: the boards the projector is fed are the boards the room draws, by part id, per unit`, () => {
    const { a, group } = stage(inframe);
    const { solids } = runSolids(group, { profile: P() });
    for (const m of group.members) {
      const fed = solids.filter((s) => s.kind === 'board' && s.unitId === m.unit.id).map((s) => s.panelId).sort();
      assert.deepEqual(fed, roomDraws(m.result), `unit ${m.unit.params.unit_num}`);
    }
    // Every entry of the wall is a member: nothing the room draws is left off.
    assert.equal(group.members.length, a.entries.length);
    // The in-frame frame is fed when the room draws it, and only then.
    const frames = solids.filter((s) => s.role === 'frame');
    assert.equal(frames.length, inframe ? 2 : 0);
  });

  test(`F1 · ${label}: every hardware instance has a silhouette or today's symbol`, () => {
    const { group } = stage(inframe);
    const { solids } = runSolids(group, { profile: P() });
    for (const m of group.members) {
      const hw = hardwareInstances(m.result, P());
      const mine = (fam) => solids.filter((s) => s.unitId === m.unit.id && s.family === fam);
      assert.equal(mine('leg').length, hw.legs.length, 'one leg solid per leg');
      assert.equal(mine('plate').length, hw.hinges.length, 'one plate per hinge, on the carcass');
      assert.equal(mine('hinge').length, hw.hinges.length, 'one cup and arm per hinge, on the door');
      assert.equal(mine('runner').length, hw.runners.length);
      assert.equal(mine('rod').length, hw.rods.length);
      assert.equal(mine('rail').length, hw.rails.length);
      assert.equal(mine('support').length, hw.shelfSupports.length);
      assert.equal(mine('kit').length, hw.kits.length);
      for (const s of solids.filter((x) => x.unitId === m.unit.id && x.kind === 'hw')) {
        assert.ok(typeof s.sil === 'function' || (s.sil === null && s.prisms.length > 0), `${s.family}: a silhouette or the symbol`);
      }
    }
  });

  test(`F1 · ${label}: the fronts view of the BUD 600 shows one door 556 x 726 and no carcass line inside it`, () => {
    const { ids, group, worktops, a } = stage(inframe);
    const r = projectRun(group, { view: 'front', mode: 'fronts', profile: P(), worktops, frontTypeOf: a.frontTypeOf });
    const m = group.members.find((x) => x.unit.id === ids.a);
    const door = m.result.panels.find((p) => p.part === 'FRONT');
    const doorLines = lines(r, (e) => e.src === `${ids.a}:${door.id}` && e.layer === 'DOORS' && !e.meta);
    // Exactly one rectangle: four outline edges, closed. A lay-on door runs to
    // the carcass top (T35 F12), where the worktop's nearer edge IS its top
    // line: the camera sees one line there, and it is the worktop's.
    const top = m.base + door.box.y + door.box.h;
    const underWorktop = !inframe && lines(r, (e) => e.layer === 'WORKTOP' && Math.abs(e.y1 - top) < 0.01 && Math.abs(e.y2 - top) < 0.01
      && Math.min(e.x1, e.x2) <= m.x + door.box.x + 0.01 && Math.max(e.x1, e.x2) >= m.x + door.box.x + door.box.w - 0.01).length === 1;
    assert.equal(doorLines.length + (underWorktop ? 1 : 0), 4, 'the leaf\'s four edges');
    const xs = doorLines.flatMap((e) => [e.x1, e.x2]);
    const ys = [...doorLines.flatMap((e) => [e.y1, e.y2]), ...(underWorktop ? [top] : [])];
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    assert.deepEqual([Math.round(w * 10) / 10, Math.round(h * 10) / 10], inframe ? [556, 726] : [door.box.w, door.box.h]);
    if (inframe) assert.deepEqual([door.box.w, door.box.h], [556, 726], 'the inset door of T80');
    const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    const carcass = lines(r, (e) => e.layer === 'CARCASE' && inside(e, box));
    assert.deepEqual(carcass, [], 'no carcass line inside the door');
    // Nothing from inside the cabinet shows on the fronts sheet at all.
    assert.equal(lines(r, (e) => ['SHELVES', 'RUNNERS', 'HINGES', 'LEG_BLOCK'].includes(e.layer)).length, 0,
      'no shelf, runner, hinge or leg line on the fronts');
    // The painter's white rides under every solid.
    assert.ok(r.entities.some((e) => e.layer === 'MASK' && e.fill === '#ffffff' && e.fillRole === 'mask'));
  });

  test(`F1 · ${label}: the no-fronts view shows the hinge plates and no door`, () => {
    const { ids, group, worktops } = stage(inframe);
    const r = projectRun(group, { view: 'front', mode: 'no-fronts', profile: P(), worktops });
    const fronts = new Set(group.members.flatMap((m) => m.result.panels.filter((p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT').map((p) => `${m.unit.id}:${p.id}`)));
    assert.equal(lines(r, (e) => fronts.has(e.src)).length, 0, 'no front');
    assert.equal(lines(r, (e) => e.layer === 'DOORS' && e.src.endsWith('-F')).length, 0);
    // The plates of the BUD 600's door, on its left side at the ladder's three heights.
    const m = group.members.find((x) => x.unit.id === ids.a);
    const cups = hardwareInstances(m.result, P()).hinges;
    const plates = lines(r, (e) => e.family === 'plate' && e.src.startsWith(`${ids.a}:`));
    assert.ok(plates.length >= cups.length, 'the plates are drawn');
    for (const hg of cups) {
      const y = m.base + hg.y;
      assert.ok(plates.some((e) => Math.min(e.y1, e.y2) <= y && Math.max(e.y1, e.y2) >= y), `a plate across the cup row ${y}`);
    }
    // The frame stays under in-frame: it is the carcass's face (the owner's DXF keeps it).
    assert.equal(lines(r, (e) => e.layer === 'FRAME_BOARD').length > 0, inframe);
  });

  test(`F1 · ${label}: the X-ray view shows both the door and the plates, and nothing is filled`, () => {
    const { ids, group, worktops } = stage(inframe);
    const r = projectRun(group, { view: 'front', mode: 'xray', profile: P(), worktops });
    const m = group.members.find((x) => x.unit.id === ids.a);
    const door = m.result.panels.find((p) => p.part === 'FRONT');
    assert.ok(lines(r, (e) => e.src === `${ids.a}:${door.id}` && e.layer === 'XRAY_FRONT').length >= 4, 'the door on XRAY_FRONT');
    assert.ok(lines(r, (e) => e.family === 'plate' && e.src.startsWith(`${ids.a}:`)).length > 0, 'the plates through it');
    assert.ok(lines(r, (e) => e.layer === 'XRAY_CARCASE').length > 0, 'the carcass on XRAY_CARCASE');
    assert.equal(r.entities.filter((e) => e.layer === 'MASK' || e.fill).length, 0, 'nothing filled, no mask');
  });
}

test('F1 · the views: a front looks along -z, a plan down, a section along the wall to its end', () => {
  assert.deepEqual(orthoView('front').dir, [0, 0, -1]);
  assert.deepEqual(orthoView('plan').dir, [0, -1, 0]);
  assert.deepEqual(orthoView('section').dir, [1, 0, 0]);
  // A section is a true view: the wall (z = 0) on the left, the room on the right.
  const v = orthoView('section');
  assert.ok(v.screen([0, 0, 600])[0] > v.screen([0, 0, 0])[0]);
});

test('F1 · a cut plane: the plan cuts the boards it meets and keeps what lies below', () => {
  const { group, worktops } = stage(true);
  const r = projectRun(group, { view: 'plan', cut: P().drawings.set.planCut.base, mode: 'fronts', profile: P(), worktops });
  const cut = new Set(lines(r, (e) => e.cut).map((e) => e.part));
  for (const id of ['BUL', 'BUR', 'BACK', 'FRAME', 'END-L']) assert.ok(cut.has(id), `${id} is cut`);
  assert.ok(!cut.has('TOP') && !cut.has('BOTTOM'), 'the top and the bottom are not met at 400');
  assert.ok(!lines(r).some((e) => e.layer === 'WORKTOP'), 'the worktop lies above the base cut');
});

test('F1 · the words ride the solids: every unit numbered, the appliance named, the number in its clear band', () => {
  const { group } = stage(true);
  const ctx = { scale: 15, mm: (v) => v * 15, unitNumberHeight: 3.4 * 15, labelHeight: 2.2 * 15 };
  for (const [view, mode] of [['front', 'fronts'], ['front', 'no-fronts'], ['front', 'xray'], ['plan', 'fronts'], ['section', 'fronts']]) {
    const nums = unitNumbers(group, { view, mode, profile: P(), ctx });
    assert.deepEqual(nums.map((e) => e.text).sort(), group.members.map((m) => String(m.unit.params.unit_num)).sort(), `${view} ${mode}`);
    assert.ok(nums.every((e) => e.layer === 'UNIT_NUMBER' && e.mask && e.paperHeight === 3.4));
  }
  // The drawer unit's number stands in the widest clear band between its boxes, never on one.
  const dr = group.members.find((m) => m.unit.type === 'BUDR2');
  const y = numberSlot(dr.result);
  const boxes = dr.result.panels.filter((p) => p.part === 'DRAWER-SIDE').map((p) => [p.box.y, p.box.y + p.box.h]);
  assert.ok(!boxes.some(([a, b]) => y > a && y < b), 'not on a drawer box');
  // No appliance in this kitchen: no appliance word.
  assert.deepEqual(applianceMarks(group, { mode: 'no-fronts', profile: P(), ctx }), []);
});

test('F1 · the room in perspective: the same boards, the frame among them, the doors in front of the carcass', () => {
  const { a } = stage(true);
  const group = wallGroups(a.entries, P())[0];
  const worktops = worktopsOnWall(a.worktops, 0);
  const wall = { start: { x: 0, y: 0 }, along: { x: 1, y: 0 }, inward: { x: 0, y: 1 }, width: 6000 };
  const r = projectRoom([{ group, wall, worktops }], {
    camera: { P: [group.from - 2000, 1650, 5200], T: [group.from + 1000, 600, 0] }, profile: P(), frontTypeOf: a.frontTypeOf,
  });
  assert.ok(r.entities.some((e) => e.layer === 'FRAME_BOARD'), 'the frame is in the picture');
  assert.ok(r.entities.some((e) => e.layer === 'DOORS'));
  assert.ok(!r.entities.some((e) => e.layer === 'SHELVES' || e.layer === 'RUNNERS'), 'nothing inside shows through a front');
  assert.equal(r.entities.filter((e) => e.kind === 'circle' && e.layer === 'HANDLES').length, 6, 'the six knobs');
});

test('F1 · the pieces of a line are one line again', () => {
  const pieces = [
    { kind: 'line', layer: 'CARCASE', x1: 0, y1: 0, x2: 10, y2: 0 },
    { kind: 'line', layer: 'CARCASE', x1: 10, y1: 0, x2: 25, y2: 0 },
    { kind: 'line', layer: 'CARCASE', x1: 30, y1: 0, x2: 40, y2: 0 },
    { kind: 'line', layer: 'DOORS', x1: 0, y1: 0, x2: 10, y2: 0 },
  ];
  const out = mergeCollinear(pieces).map((e) => [e.layer, Math.round(e.x1), Math.round(e.x2)]).sort();
  assert.deepEqual(out, [['CARCASE', 0, 25], ['CARCASE', 30, 40], ['DOORS', 0, 10]]);
  void S;
});
