/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// CHAT-FIX 25.10.2026 . THE FREE PANEL, STUCK TO A SURFACE OF THE OWNER'S CHOICE
//
// The owner, 25.10.2026: *"zebym ja mogl go przykleic do tej powierzchni
// jakiej chce"*, *"chce tez oblozyc boxy lub kominy tez prosze z odsunieciem
// od nich"*, *"3 nie jedzie"* (the panel does not follow the host it was stuck
// to), *"ten panel musi byc w miare mozliwe do ustawienia gdzie bede chcial,
// naprzyklad bede chcial polozyc na szafkach jako daszek albo oblozyc komin w
// kacie"*.
//
// What is held here, number for number: `engine/attachPanel.js` (the list of
// surfaces, the numbers a surface asks of the panel, the obstacles that are
// still in a stood-off panel's way) and the store's two actions
// (`attachTargetsFor`, `attachFreePanel`) plus the `moveUnit` change that lets
// a panel stood in front of a chimney slide along that chimney's face.
//
// T82 (CLAUDE.md PART D) extends it, never reverts it (FROZEN 5). F17, the
// owner 25.10.2026 13:36: *"jak mam frontowy komin to nie moge powiekszyc
// panela bo mi wchodzi w sciane"*: a panel stuck to a chimney's front grows
// along that face, its thickness keeps its width, the size window and the
// Check read the same obstacles the move reads, and its back inset is capped
// by the room, not by a cabinet's 300. F19: a panel on a cabinet's FRONT
// (`standsInFrontOf`, collision.js) neither holds the cabinet off nor is held
// off by it, and the list offers "Unit NN, front".
//
// THE STAGE (every test builds it afresh): a 5000 x 3000 room, 2500 high; a
// box bx1 at x 4400 (400 wide, 300 deep) on wall 1; a chimney on wall 1 at
// x 2500, 600 wide, 350 deep; a BUD at x 600 widened to 800; a WUD at x 1600;
// a FREE_PANEL (800 x 400 x 18) at x 3600. The default profile: board 18, wall
// clearance 10, the BUD on 100 mm legs under a 770 carcass (unitTop 870), the
// WUD hung at 1500 under a 720 carcass (unitTop 2220).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners, roomWalls, wallPlanObstacles } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { unitTop, unitBase } from '../src/engine/runs.js';
import { spanInWallFrame } from '../src/engine/collision.js';
import { boxCorners } from '../src/engine/room.js';
import {
  attachTargets, attachTargetByKey, attachPlan, obstaclesBeyond, obstacleOnWall, UNIT_FACES, OBSTACLE_FACES,
} from '../src/engine/attachPanel.js';
// T82 F17 and F19 read the two new names through the modules, so a missing one
// fails its own test and leaves the chat-fix's rows standing.
import * as ATTACH from '../src/engine/attachPanel.js';
import * as COLLISION from '../src/engine/collision.js';
import { useProjectStore, validateUnit } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();
const unit = (id) => S().units.find((u) => u.id === id);
const BOARD = 18;
const CLEARANCE = 10;
const ROOM_H = 2500;

/** The stage, afresh: ids of the BUD, the WUD, the panel; the chimney's record id. */
function stage() {
  S().newProject();
  S().setRoom({
    corners: rectCorners(5000, 3000), height: ROOM_H, boxes: [{ id: 'bx1', x: 4400, y: 0, w: 400, d: 300 }],
  });
  const chimney = S().addWallSlope({ kind: 'chimney', wall: 0, x_mm: 2500, width: 600, depth: 350 });
  const bud = S().addUnit('BUD', { wall: 0, x: 600 }).id;
  S().updateUnitParams(bud, { width: 800 });
  const wud = S().addUnit('WUD', { wall: 0, x: 1600 }).id;
  const panel = S().addUnit('FREE_PANEL', { wall: 0, x: 3600 }).id;
  return { bud, wud, panel, chimney };
}

/** The panel's stance and place, read back in one object. */
function stanceOf(id) {
  const u = unit(id);
  return {
    wall: u.position.wall,
    x: u.position.x_mm,
    facing: u.params.panel_facing,
    tilt: u.params.panel_tilt_deg,
    mount: u.params.mount_height,
    inset: u.params.inset_back_mm ?? 0,
    box: { width: u.params.width, height: u.params.height, depth: u.params.depth },
  };
}

// === 0 . THE STAGE IS WHAT THE NUMBERS BELOW ASSUME =========================

test('CHAT-FIX 25.10 . the stage: the numbers every assertion below is measured against', () => {
  const { bud, wud, panel } = stage();
  assert.equal(P.board.thickness, BOARD);
  assert.equal(P.room.wallBackClearance, CLEARANCE);
  assert.equal(unit(bud).params.width, 800);
  assert.equal(unit(bud).position.x_mm, 600);
  assert.equal(unitBase(unit(bud), P), 100, 'the BUD stands on 100 mm legs');
  assert.equal(unit(bud).params.height, 770);
  assert.equal(unitTop(unit(bud), P), 870, 'the BUD top: legs 100 + carcass 770');
  assert.equal(unit(wud).params.mount_height, 1500);
  assert.equal(unit(wud).params.height, 720);
  assert.equal(unitTop(unit(wud), P), 2220, 'the WUD top: mount 1500 + carcass 720');
  assert.equal(unit(panel).type, 'FREE_PANEL');
  assert.deepEqual(stanceOf(panel), {
    wall: 0, x: 3600, facing: 'along', tilt: 0, mount: 0, inset: 0, box: { width: 800, height: 400, depth: 18 },
  });
  assert.equal(S().project.room.height, ROOM_H);
});

// === 1 . THE LIST OF SURFACES ================================================

test('CHAT-FIX 25.10 . attachTargetsFor: wall, floor, ceiling, every other unit\'s four faces (T82 F19: its front), every chimney\'s and box\'s three faces, never the panel itself', () => {
  const { bud, wud, panel, chimney } = stage();
  const targets = S().attachTargetsFor(panel);
  assert.deepEqual(targets.slice(0, 3).map((t) => t.key), ['wall', 'floor', 'ceiling']);
  assert.deepEqual(targets.slice(0, 3).map((t) => t.label), ['Wall (flush)', 'Floor', 'Ceiling']);
  const keys = targets.map((t) => t.key);
  const labels = Object.fromEntries(targets.map((t) => [t.key, t.label]));
  // The BUD (Unit 01) and the WUD (Unit WU01): left, right, top, labelled in
  // words; and since T82 F19 their FRONT too (a panel covering a cabinet's
  // front, the cladding the chat-fix left out).
  assert.deepEqual(UNIT_FACES, ['left', 'right', 'top', 'front']);
  for (const face of UNIT_FACES) {
    assert.ok(keys.includes(`unit:${bud}:${face}`), `no unit:${bud}:${face}`);
    assert.ok(keys.includes(`unit:${wud}:${face}`), `no unit:${wud}:${face}`);
  }
  assert.equal(labels[`unit:${bud}:left`], 'Unit 01, left side');
  assert.equal(labels[`unit:${bud}:right`], 'Unit 01, right side');
  assert.equal(labels[`unit:${bud}:top`], 'Unit 01, top');
  assert.equal(labels[`unit:${bud}:front`], 'Unit 01, front');
  assert.equal(labels[`unit:${wud}:left`], 'Unit WU01, left side');
  assert.equal(labels[`unit:${wud}:front`], 'Unit WU01, front');
  // The chimney and the box: front, left, right, on wall 1.
  assert.deepEqual(OBSTACLE_FACES, ['front', 'left', 'right']);
  for (const face of OBSTACLE_FACES) {
    assert.ok(keys.includes(`obstacle:${chimney}:${face}`), `no obstacle:${chimney}:${face}`);
    assert.ok(keys.includes(`obstacle:bx1:${face}`), `no obstacle:bx1:${face}`);
  }
  assert.equal(labels[`obstacle:${chimney}:front`], 'Chimney on wall 1, front');
  assert.equal(labels[`obstacle:${chimney}:left`], 'Chimney on wall 1, left side');
  assert.equal(labels[`obstacle:bx1:right`], 'Box on wall 1, right side');
  for (const t of targets.filter((x) => x.kind === 'obstacle')) assert.equal(t.wall, 0);
  // Never itself; and nothing else is in the list.
  assert.ok(!keys.some((k) => k.startsWith(`unit:${panel}:`)), 'the panel offers itself');
  assert.equal(targets.length, 3 + 2 * 4 + 2 * 3);
  // A cabinet is not a panel: it has no surfaces to be stuck to.
  assert.deepEqual(S().attachTargetsFor(bud), []);
  assert.deepEqual(S().attachTargetsFor('no-such-unit'), []);
  // The engine's own list agrees with the store's, and a key finds its target.
  const walls = roomWalls(S().project.room);
  const obstacles = wallPlanObstacles(S().project.room, S().project.wallSlopes, { blocking: true });
  const args = {
    panel: unit(panel), units: S().units, walls, obstacles: [...S().project.room.boxes, ...obstacles],
  };
  assert.equal(attachTargets(args).length, targets.length);
  assert.equal(attachTargetByKey(`unit:${bud}:top`, args)?.label, 'Unit 01, top');
  assert.equal(attachTargetByKey('nothing', args), null);
});

// === 2 . BESIDE A UNIT ========================================================

test('CHAT-FIX 25.10 . a unit\'s left side, gap 0: across, upright, its right face on the host\'s left span, on the floor, flush to the wall', () => {
  const { bud, panel } = stage();
  const res = S().attachFreePanel(panel, `unit:${bud}:left`, { gap: 0 });
  assert.deepEqual(res, { ok: true, label: 'Unit 01, left side', clamped: 0, error: null });
  assert.deepEqual(stanceOf(panel), {
    wall: 0,
    x: 600 - BOARD,
    facing: 'across',
    tilt: 0,
    mount: 0,
    inset: 0,
    box: { width: BOARD, height: 400, depth: 800 },
  });
});

test('CHAT-FIX 25.10 . a unit\'s right side, gap 20: x is the host\'s right edge plus the gap', () => {
  const { bud, panel } = stage();
  const res = S().attachFreePanel(panel, `unit:${bud}:right`, { gap: 20 });
  assert.equal(res.ok, true);
  assert.equal(res.clamped, 0);
  const s = stanceOf(panel);
  assert.equal(s.x, 600 + 800 + 20);
  assert.equal(s.facing, 'across');
  assert.equal(s.tilt, 0);
  assert.equal(s.mount, 0, 'a floor-standing host: the panel stands on the floor');
  assert.equal(s.inset, 0);
  // The engine says the same, before the store writes it.
  const walls = roomWalls(S().project.room);
  const plan = attachPlan({
    panel: unit(panel),
    target: attachTargetByKey(`unit:${bud}:right`, { panel: unit(panel), units: S().units, walls, obstacles: [] }),
    gap: 20,
    units: S().units,
    walls,
    obstacles: [],
    profile: P,
    roomHeight: ROOM_H,
  });
  assert.equal(plan.x, 1420);
  assert.equal(plan.params.panel_facing, 'across');
  assert.equal(plan.params.mount_height, 0);
});

// === 3 . ON TOP OF A UNIT ("jako daszek") ===================================

test('CHAT-FIX 25.10 . a unit\'s top, gap 0: along, flat, its left edge on the host\'s left, lying on the host\'s top (BUD 870, WUD 2220)', () => {
  const { bud, wud, panel } = stage();
  const onBud = S().attachFreePanel(panel, `unit:${bud}:top`, { gap: 0 });
  assert.deepEqual(onBud, { ok: true, label: 'Unit 01, top', clamped: 0, error: null });
  assert.deepEqual(stanceOf(panel), {
    wall: 0,
    x: 600,
    facing: 'along',
    tilt: 90,
    mount: 870,
    inset: 0,
    box: { width: 800, height: BOARD, depth: 400 },
  });
  const onWud = S().attachFreePanel(panel, `unit:${wud}:top`, { gap: 0 });
  assert.equal(onWud.ok, true);
  assert.equal(onWud.label, 'Unit WU01, top');
  const s = stanceOf(panel);
  assert.equal(s.x, 1600);
  assert.equal(s.mount, 2220, 'the WUD top: mount 1500 + carcass 720');
  assert.equal(s.tilt, 90);
  assert.equal(s.box.height, BOARD);
});

// === 4 . FLOOR, CEILING, WALL ================================================

test('CHAT-FIX 25.10 . floor: flat at 0; ceiling: flat with its top at 2500 (mount 2482); wall: upright again, its top brought under the ceiling (mount 2100), flush', () => {
  const { panel } = stage();
  const floor = S().attachFreePanel(panel, 'floor', { gap: 0 });
  assert.deepEqual(floor, { ok: true, label: 'Floor', clamped: 0, error: null });
  let s = stanceOf(panel);
  assert.equal(s.tilt, 90);
  assert.equal(s.mount, 0);
  assert.equal(s.x, 3600, 'the floor does not move it along the wall');
  assert.equal(s.box.height, BOARD);

  const ceiling = S().attachFreePanel(panel, 'ceiling', { gap: 0 });
  assert.deepEqual(ceiling, { ok: true, label: 'Ceiling', clamped: 0, error: null });
  s = stanceOf(panel);
  assert.equal(s.tilt, 90);
  assert.equal(s.mount, ROOM_H - BOARD);
  assert.equal(s.mount + s.box.height, ROOM_H, 'its top face is the ceiling');

  const wall = S().attachFreePanel(panel, 'wall', { gap: 0 });
  assert.deepEqual(wall, { ok: true, label: 'Wall (flush)', clamped: 0, error: null });
  s = stanceOf(panel);
  assert.equal(s.tilt, 0);
  assert.equal(s.facing, 'along');
  assert.equal(s.box.height, 400, 'upright again, the board is 400 high');
  assert.equal(s.mount, ROOM_H - 400, 'a 400 board that hung at the ceiling is brought down so its top is under it');
  assert.equal(s.inset, 0, 'flush: no inset over the wall clearance');
  assert.equal(s.x, 3600);
});

test('CHAT-FIX 25.10 . a ceiling gap is taken off the mount; a floor gap is the mount', () => {
  const { panel } = stage();
  S().attachFreePanel(panel, 'ceiling', { gap: 100 });
  assert.equal(stanceOf(panel).mount, ROOM_H - BOARD - 100);
  S().attachFreePanel(panel, 'floor', { gap: 50 });
  assert.equal(stanceOf(panel).mount, 50);
});

// === 5 . A CHIMNEY AND A BOX ("oblozyc komin w kacie") ======================

test('CHAT-FIX 25.10 . the chimney\'s front, gap 0: along, upright, x 2500, its back face on the chimney\'s face (inset 340); and the panel then slides along that face', () => {
  const { panel, chimney } = stage();
  const res = S().attachFreePanel(panel, `obstacle:${chimney}:front`, { gap: 0 });
  assert.deepEqual(res, { ok: true, label: 'Chimney on wall 1, front', clamped: 0, error: null });
  const s = stanceOf(panel);
  assert.equal(s.wall, 0);
  assert.equal(s.x, 2500);
  assert.equal(s.facing, 'along');
  assert.equal(s.tilt, 0);
  assert.equal(s.inset, 350 - CLEARANCE, 'the back face at 350: the clearance 10 plus an inset of 340');
  assert.equal(s.mount, 0, 'a chimney stands floor to ceiling: its cladding starts on the floor');
  // The chimney it stands in front of is not in its way: a later move along
  // the chimney's face lands where it was asked.
  const moved = S().moveUnit(panel, 2600, 1);
  assert.equal(moved.x, 2600);
  assert.equal(unit(panel).position.x_mm, 2600, 'the chimney threw the panel out');
  assert.equal(stanceOf(panel).inset, 340, 'the move kept the panel on the chimney\'s face');
});

test('CHAT-FIX 25.10 . the chimney\'s left side: x 2482; its right side: x 3100; both across, upright, back to the wall', () => {
  const { panel, chimney } = stage();
  const left = S().attachFreePanel(panel, `obstacle:${chimney}:left`, { gap: 0 });
  assert.deepEqual(left, { ok: true, label: 'Chimney on wall 1, left side', clamped: 0, error: null });
  let s = stanceOf(panel);
  assert.equal(s.x, 2500 - BOARD);
  assert.equal(s.facing, 'across');
  assert.equal(s.tilt, 0);
  assert.equal(s.inset, 0, 'the chimney stands on the wall line: no inset');
  assert.equal(s.box.width, BOARD);
  const right = S().attachFreePanel(panel, `obstacle:${chimney}:right`, { gap: 0 });
  assert.deepEqual(right, { ok: true, label: 'Chimney on wall 1, right side', clamped: 0, error: null });
  s = stanceOf(panel);
  assert.equal(s.x, 2500 + 600);
  assert.equal(s.facing, 'across');
  assert.equal(s.inset, 0);
});

test('CHAT-FIX 25.10 . the box\'s front, gap 10: inset 300 (its face at 300 plus the gap, less the clearance); the room clamps x and the store reports by how much', () => {
  const { panel } = stage();
  const res = S().attachFreePanel(panel, 'obstacle:bx1:front', { gap: 10 });
  assert.equal(res.ok, true);
  assert.equal(res.label, 'Box on wall 1, front');
  const s = stanceOf(panel);
  assert.equal(s.inset, 300 + 10 - CLEARANCE);
  assert.equal(s.facing, 'along');
  assert.equal(s.tilt, 0);
  // The box starts at 4400; an 800 panel from there would end at 5200 on a
  // 5000 wall. The clamp keeps it 10 off the wall end: 5000 - 10 - 800.
  assert.ok(res.clamped > 0, 'the room clamped the panel and the store did not say so');
  assert.equal(s.x, 5000 - CLEARANCE - 800);
  assert.equal(res.clamped, 4400 - s.x);
  assert.equal(res.clamped, 210);
});

// === 6 . "3 NIE JEDZIE": THE PANEL DOES NOT FOLLOW ITS HOST ==================

test('CHAT-FIX 25.10 . stuck to a unit\'s left side, the panel stays where it was put when the host is moved', () => {
  const { bud, panel } = stage();
  S().attachFreePanel(panel, `unit:${bud}:left`, { gap: 0 });
  const before = stanceOf(panel);
  assert.equal(before.x, 582);
  const moved = S().moveUnit(bud, 1200, 1);
  assert.equal(moved.x, 1200, 'the host did not move: the test says nothing');
  assert.equal(unit(bud).position.x_mm, 1200);
  assert.deepEqual(stanceOf(panel), before, 'the panel travelled with its host');
});

// === 7 . REFUSED IN WORDS, NOTHING CHANGED ===================================

test('CHAT-FIX 25.10 . a cabinet cannot be attached; an unknown key is refused; neither changes a thing', () => {
  const { bud, panel } = stage();
  const snapshot = JSON.stringify(S().units);
  const cabinet = S().attachFreePanel(bud, 'floor', { gap: 0 });
  assert.equal(cabinet.ok, false);
  assert.equal(cabinet.error, 'Only a free-standing panel can be attached.');
  assert.equal(cabinet.label, null);
  const unknown = S().attachFreePanel(panel, 'obstacle:nothing:front', { gap: 0 });
  assert.equal(unknown.ok, false);
  assert.equal(typeof unknown.error, 'string');
  assert.ok(unknown.error.length > 0, 'no sentence');
  const gone = S().attachFreePanel(panel, 'unit:u_not_here:top', { gap: 0 });
  assert.equal(gone.ok, false);
  assert.ok(gone.error.length > 0, 'no sentence');
  assert.equal(JSON.stringify(S().units), snapshot, 'a refusal changed the units');
  // The engine's own refusals.
  assert.equal(attachPlan({ panel: unit(bud), target: { kind: 'floor' }, profile: P }).error, 'Only a free-standing panel can be attached.');
  assert.equal(attachPlan({ panel: unit(panel), target: null, profile: P }).error, 'Choose a surface to attach the panel to.');
  assert.equal(attachPlan({ panel: unit(panel), target: { kind: 'moon' }, profile: P }).error, 'That surface is not one a panel can be attached to.');
});

// === 8 . THE OBSTACLES STILL IN A STOOD-OFF PANEL'S WAY ======================

test('CHAT-FIX 25.10 . obstaclesBeyond: the chimney (far 350) is not beyond a line at 350, and is beyond one at 349; the box (far 300) likewise at 300 and 299', () => {
  stage();
  const walls = roomWalls(S().project.room);
  const wall = walls[0];
  const chimneys = wallPlanObstacles(S().project.room, S().project.wallSlopes, { blocking: true });
  assert.equal(chimneys.length, 1);
  assert.equal(chimneys[0].kind, 'chimney');
  assert.equal(spanInWallFrame(boxCorners(chimneys[0]), wall).far, 350);
  assert.deepEqual(obstaclesBeyond(chimneys, wall, 350), []);
  assert.equal(obstaclesBeyond(chimneys, wall, 349).length, 1);
  assert.equal(obstaclesBeyond(chimneys, wall, 0).length, 1);
  const boxes = S().project.room.boxes;
  assert.equal(spanInWallFrame(boxCorners(boxes[0]), wall).far, 300);
  assert.deepEqual(obstaclesBeyond(boxes, wall, 300), []);
  assert.equal(obstaclesBeyond(boxes, wall, 299).length, 1);
  // Both together, a panel standing 340 + 10 off the wall: only what reaches past 350.
  assert.deepEqual(obstaclesBeyond([...boxes, ...chimneys], wall, 350), []);
  assert.equal(obstaclesBeyond([...boxes, ...chimneys], wall, 299).length, 2);
  assert.deepEqual(obstaclesBeyond(null, wall, 0), []);
  assert.deepEqual(obstaclesBeyond(chimneys, null, 0), []);
  // The chimney is read on wall 1, at 2500..3100, 0..350.
  const on = obstacleOnWall(chimneys[0], walls);
  assert.equal(on.wall.index, 0);
  assert.deepEqual([on.span.left, on.span.right, on.span.near, on.span.far], [2500, 3100, 0, 350]);
});

// === 9 . A CABINET IS AS IT WAS (regression smoke) ===========================

test('CHAT-FIX 25.10 . a plain cabinet dragged towards the chimney still goes through moveUnit and comes back with an x', () => {
  const { bud } = stage();
  const res = S().moveUnit(bud, 2400, 1);
  assert.ok(res && Number.isFinite(res.x), 'moveUnit returned no x');
  assert.equal(unit(bud).position.x_mm, res.x);
  assert.ok(unit(bud).position.x_mm + unit(bud).params.width <= 5000, 'the cabinet left the wall');
});

// === 10 . T82 F17 . THE PANEL IN FRONT OF A CHIMNEY CAN GROW ================
//
// The probe (`verify/t82/f17-probe.md`): the three size roads of the store
// (`updateUnitParams`' width spans, `unitSizeBoundsFor`, `validateUnit`) read
// the plan's obstacles unfiltered, so the chimney a panel stands in front of
// was its neighbour: 600 gave "Width limited to 0 mm", 900 slid the panel off
// the chimney's face, `board_t 36` shrank it to 1, the size window said 0 and
// the Check said UNIT_OVERLAP. They now read what `moveUnit` reads since the
// chat-fix: only the obstacles that reach past the panel's own back line.

/** Every notice of one size edit, and the panel after it. */
function grow(id, patch) {
  const res = S().updateUnitParams(id, patch);
  return { notices: res.notices, s: stanceOf(id) };
}

test('T82 F17 . a panel on the chimney\'s front grows from 800 to 1200 with no notice and keeps x 2500 on the chimney\'s face', () => {
  const { panel, chimney } = stage();
  S().attachFreePanel(panel, `obstacle:${chimney}:front`, { gap: 0 });
  assert.equal(stanceOf(panel).x, 2500);
  for (const length of [600, 900, 1200]) {
    const { notices, s } = grow(panel, { panel_length: length });
    assert.deepEqual(notices, [], `${length}: the chimney behind the panel spoke`);
    assert.equal(s.box.width, length, `${length}: the panel did not take its length`);
    assert.equal(s.x, 2500, `${length}: the panel left the chimney's face`);
    assert.equal(s.inset, 340, `${length}: the panel left the chimney's face`);
  }
});

test('T82 F17 . board_t 36 on the panel in front of the chimney keeps its width and its place', () => {
  const { panel, chimney } = stage();
  S().attachFreePanel(panel, `obstacle:${chimney}:front`, { gap: 0 });
  const { notices, s } = grow(panel, { board_t: 36 });
  assert.deepEqual(notices, []);
  assert.equal(unit(panel).params.board_t, 36);
  assert.deepEqual(s.box, { width: 800, height: 400, depth: 36 }, 'the thickness shrank the panel');
  assert.equal(s.x, 2500);
  assert.equal(s.inset, 340);
});

test('T82 F17 . the size window reads the room\'s bounds for it, and the Check finds no overlap with the chimney behind it', () => {
  const { panel, chimney } = stage();
  S().attachFreePanel(panel, `obstacle:${chimney}:front`, { gap: 0 });
  const bounds = S().unitSizeBoundsFor(panel);
  // From x 2500 to the wall end less the 10 a free panel keeps off a wall: the
  // chimney (far 350) and the box (far 300) both stand behind its back at 350.
  assert.equal(bounds.width.max, 5000 - 2500 - CLEARANCE, `width max ${bounds.width.max} by ${bounds.width.by}`);
  const check = () => validateUnit(unit(panel), S().unitResult(panel), {
    room: S().project.room, units: S().units, wallSlopes: S().project.wallSlopes,
  });
  assert.deepEqual(check().filter((i) => i.code === 'UNIT_OVERLAP'), [], 'the Check says it overlaps the chimney');
  grow(panel, { panel_length: 1200 });
  assert.deepEqual(check().filter((i) => i.code === 'UNIT_OVERLAP'), []);
});

test('T82 F17 . a chimney in the corner: the panel on its front grows to 900 and 1200 with no notice (no "cannot grow either way")', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 3000), height: ROOM_H });
  const chimney = S().addWallSlope({ kind: 'chimney', wall: 0, x_mm: 0, width: 600, depth: 350 });
  const panel = S().addUnit('FREE_PANEL', { wall: 0, x: 3600 }).id;
  const res = S().attachFreePanel(panel, `obstacle:${chimney}:front`, { gap: 0 });
  assert.equal(res.ok, true);
  // The wall end holds it the clearance off the side wall, and the store says by how much.
  assert.equal(res.clamped, CLEARANCE);
  assert.equal(stanceOf(panel).x, CLEARANCE);
  for (const length of [900, 1200]) {
    const { notices, s } = grow(panel, { panel_length: length });
    assert.deepEqual(notices, [], `${length}: ${notices.join(' / ')}`);
    assert.equal(s.box.width, length);
    assert.equal(s.x, CLEARANCE);
  }
});

test('T82 F17 . the refusal names the unit by its type: a panel boxed in is "this free-standing panel", never "this wardrobe"', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 3000), height: ROOM_H });
  S().addWallSlope({ kind: 'chimney', wall: 0, x_mm: 2500, width: 600, depth: 350 });
  const bud = S().addUnit('BUD', { wall: 0, x: 600 }).id;
  S().updateUnitParams(bud, { width: 800 });
  const panel = S().addUnit('FREE_PANEL', { wall: 0, x: 1400 }).id;
  assert.equal(stanceOf(panel).x, 1400, 'the stage: the panel stands against the BUD');
  // Flush to the wall it stands IN the chimney's band: the chimney holds it.
  assert.deepEqual(grow(panel, { panel_length: 1100 }).notices, []);
  const { notices, s } = grow(panel, { panel_length: 1200 });
  assert.equal(s.box.width, 1100);
  assert.equal(notices.length, 1);
  assert.equal(notices[0], 'This free-standing panel cannot grow either way: a chimney on this wall is on the right and '
    + '01 is on the left. 1100 mm is what it can be.');
  assert.doesNotMatch(notices[0], /wardrobe/);
});

test('T82 F17 . kept: a panel ACROSS the wall beside the chimney grows in length to the room\'s far wall less the clearance', () => {
  const { panel, chimney } = stage();
  S().attachFreePanel(panel, `obstacle:${chimney}:left`, { gap: 0 });
  for (const length of [900, 1200, 2000]) {
    const { notices, s } = grow(panel, { panel_length: length });
    assert.deepEqual(notices, [], `${length}`);
    assert.equal(s.box.depth, length);
    assert.equal(s.x, 2500 - BOARD);
  }
  const { notices, s } = grow(panel, { panel_length: 3500 });
  assert.equal(s.box.depth, 3000 - CLEARANCE);
  assert.match(notices.join(' '), /Depth limited to 2990 mm by the room/);
});

test('T82 F17 . the back inset of a free panel is capped by the ROOM (the far wall less the panel), not by a cabinet\'s 300', () => {
  const { bud, panel, chimney } = stage();
  S().attachFreePanel(panel, `obstacle:${chimney}:front`, { gap: 0 });
  assert.equal(stanceOf(panel).inset, 340);
  // The same number typed again stays where the attach put it: 340, not 300.
  const again = S().setUnitInsets(panel, { back: 340 });
  assert.equal(again.applied.inset_back_mm, 340, 'the panel was pulled 40 into the chimney');
  assert.equal(stanceOf(panel).inset, 340);
  assert.equal(stanceOf(panel).x, 2500);
  // The room's own cap: 3000 deep, 10 off the wall, an 18 board.
  const walls = roomWalls(S().project.room);
  const cap = ATTACH.freePanelInsetMax({ panel: unit(panel), wall: walls[0], walls, profile: P });
  assert.equal(cap, 3000 - CLEARANCE - BOARD);
  const far = S().setUnitInsets(panel, { back: 5000 });
  assert.equal(far.applied.inset_back_mm, 3000 - CLEARANCE - BOARD);
  assert.match(far.notices.join(' '), /limited to 2972 mm by the room/, 'the room clamped in silence');
  // A cabinet keeps the cabinet's number.
  assert.equal(S().setUnitInsets(bud, { back: 400 }).applied.inset_back_mm, P.editor.maxInset);
  // The right panel's Back field ends where the clamp does (the probe's row 14:
  // its `max` was the cabinet's 300 for a panel too).
  assert.equal(S().insetBackMaxFor(panel), 3000 - CLEARANCE - BOARD);
  assert.equal(S().insetBackMaxFor(bud), P.editor.maxInset);
  assert.equal(S().insetBackMaxFor('no-such-unit'), null);
  const right = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  assert.match(right, /const backMax = \(typeof insetBackMaxFor === 'function' \? insetBackMaxFor\(unit\.id\) : null\) \?\? profile\.editor\.maxInset;/);
  assert.match(right, /max=\{Number\.isFinite\(backMax\) \? backMax : undefined\}/);
});

test('T82 F17 . the room refuses in words a surface that would stand the panel past the far wall, and nothing moves', () => {
  const { panel } = stage();
  S().setUnitInsets(panel, { back: 5000 });
  assert.equal(stanceOf(panel).inset, 2972);
  const before = JSON.stringify(S().units);
  // Laid flat on the floor its box is 400 deep: 2972 + 10 + 400 passes 3000.
  const res = S().attachFreePanel(panel, 'floor', { gap: 0 });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'Floor would stand the panel 2972 mm off the wall; the room leaves it 2590 mm.');
  assert.equal(JSON.stringify(S().units), before, 'a refusal changed the units');
});

// === 11 . T82 F19 . THE FRONT OF A UNIT ======================================
//
// The chat-fix left out "unit, front" (a panel covering a cabinet's front:
// the owner's cladding of 24.10's list). `obstructs` held a free panel off a
// cabinet on its x span and height band and never read depth, so a panel in
// FRONT of a cabinet was in the cabinet's way. `standsInFrontOf` (collision.js,
// one predicate): a free panel whose back line stands at or beyond a unit's
// front line (its wall gap, its depth, the door gap and its front) does not
// obstruct that unit and is not obstructed by it.

const BUD_FRONT = CLEARANCE + 558 + P.doors.gap + 25;   // 596: the BUD's door face off the wall
const WUD_FRONT = CLEARANCE + 400 + P.doors.gap + 25;   // 438: the WUD's

test('T82 F19 . the stage\'s front lines: the BUD\'s door face 596 off the wall, the WUD\'s 438', () => {
  const { bud, wud } = stage();
  assert.equal(unit(bud).params.depth, 558);
  assert.equal(unit(bud).params.front_t, 25);
  assert.equal(unit(wud).params.depth, 400);
  assert.equal(P.doors.gap, 3);
  assert.equal(BUD_FRONT, 596);
  assert.equal(WUD_FRONT, 438);
});

test('T82 F19 . standsInFrontOf: a free panel whose back is at or past a unit\'s front line, on the same wall; never a cabinet, never two panels', () => {
  const { standsInFrontOf } = COLLISION;
  assert.equal(typeof standsInFrontOf, 'function', 'collision.js has no standsInFrontOf');
  const bud = { type: 'BUD', position: { wall: 0, x_mm: 600 }, params: { width: 800, depth: 558, front_t: 25 } };
  const fp = (inset, wall = 0) => ({
    type: 'FREE_PANEL', position: { wall, x_mm: 600 }, params: { width: 800, depth: 18, inset_back_mm: inset },
  });
  assert.equal(standsInFrontOf(fp(BUD_FRONT - CLEARANCE), bud, P), true, 'its back on the door face');
  assert.equal(standsInFrontOf(fp(BUD_FRONT - CLEARANCE + 50), bud, P), true, 'beyond it');
  assert.equal(standsInFrontOf(fp(BUD_FRONT - CLEARANCE - 1), bud, P), false, '1 mm into the doors');
  assert.equal(standsInFrontOf(fp(0), bud, P), false, 'flush to the wall');
  assert.equal(standsInFrontOf(fp(BUD_FRONT, 1), bud, P), false, 'on another wall');
  assert.equal(standsInFrontOf(bud, fp(BUD_FRONT), P), false, 'a cabinet is not a free panel');
  assert.equal(standsInFrontOf(bud, bud, P), false);
  assert.equal(standsInFrontOf(fp(BUD_FRONT), fp(0), P), false, 'two panels meet anyway (T74 F13)');
  assert.equal(standsInFrontOf(null, bud, P), false);
});

test('T82 F19 . Attach "Unit 01, front": along, upright, its left on the unit\'s left, its back on the door face plus the gap, on the floor', () => {
  const { bud, wud, panel } = stage();
  const res = S().attachFreePanel(panel, `unit:${bud}:front`, { gap: 0 });
  assert.deepEqual(res, { ok: true, label: 'Unit 01, front', clamped: 0, error: null });
  assert.deepEqual(stanceOf(panel), {
    wall: 0, x: 600, facing: 'along', tilt: 0, mount: 0, inset: BUD_FRONT - CLEARANCE, box: { width: 800, height: 400, depth: BOARD },
  });
  assert.equal(stanceOf(panel).inset, 586);
  S().attachFreePanel(panel, `unit:${bud}:front`, { gap: 20 });
  assert.equal(stanceOf(panel).inset, 586 + 20);
  // A hanging unit's front: the panel at its base.
  const onWud = S().attachFreePanel(panel, `unit:${wud}:front`, { gap: 0 });
  assert.equal(onWud.ok, true);
  assert.equal(onWud.label, 'Unit WU01, front');
  const s = stanceOf(panel);
  assert.equal(s.x, 1600);
  assert.equal(s.mount, 1500);
  assert.equal(s.inset, WUD_FRONT - CLEARANCE);
});

test('T82 F19 . the panel on the BUD\'s front slides across it, the BUD slides behind it, and the Check finds no overlap', () => {
  const { bud, panel } = stage();
  S().attachFreePanel(panel, `unit:${bud}:front`, { gap: 0 });
  assert.equal(S().moveUnit(panel, 1700, 0.5, { magnet: false }).x, 1700);
  // Back across the BUD's span: the cabinet it stands in front of is not in its way.
  assert.equal(S().moveUnit(panel, 300, 0.5, { magnet: false }).x, 300, 'the BUD held the panel in front of it off');
  assert.equal(stanceOf(panel).inset, 586);
  S().moveUnit(panel, 1700, 0.5, { magnet: false });
  // …and the BUD passes behind the panel.
  assert.equal(S().moveUnit(bud, 1600, 1).x, 1600, 'the panel in front of the BUD held the BUD off');
  const issues = (id) => validateUnit(unit(id), S().unitResult(id), {
    room: S().project.room, units: S().units, wallSlopes: S().project.wallSlopes,
  }).filter((i) => i.code === 'UNIT_OVERLAP');
  assert.deepEqual(issues(panel), []);
  assert.deepEqual(issues(bud), []);
});

test('T82 F19 . kept: back on the wall, the same panel is held off by the cabinet again (T74 F13: a cabinet holds a free panel off)', () => {
  const { bud, panel } = stage();
  S().attachFreePanel(panel, `unit:${bud}:front`, { gap: 0 });
  S().moveUnit(panel, 1700, 0.5, { magnet: false });
  S().attachFreePanel(panel, 'wall', { gap: 0 });
  assert.equal(stanceOf(panel).inset, 0);
  assert.equal(stanceOf(panel).x, 1700);
  assert.equal(S().moveUnit(panel, 300, 0.5, { magnet: false }).x, 600 + 800, 'a panel at the wall drove into the BUD');
});

// === 12 . T82 F17, AFTER THE REVIEW . THE PANEL'S OWN BACK LINE ON EVERY ROAD
//
// The review of 25.10 (C/D/E, panel 0): a panel stood off its wall was still
// measured as if its back were on the wall line. `obstaclesBeyond` took away
// the obstacles wrongly kept (behind its back), but the band it was checked in
// was `[0, depth]` from the WALL, so a box or a unit round the corner standing
// where the board really is was dropped (the panel passed through it), and a
// unit entirely BEHIND it limited its depth to 0 and squashed it. For a free
// panel the band is `[back, back + depth]`, `back = backStandoff(panel)`, on
// the move, the width, the size window, the Check and the depth clamp.

/** A bare 5000 x 3000 room, 2500 high, with these plan boxes. */
function bareRoom(boxes = []) {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 3000), height: ROOM_H, boxes });
}
const overlaps = (id) => validateUnit(unit(id), S().unitResult(id), {
  room: S().project.room, units: S().units, wallSlopes: S().project.wallSlopes,
}).filter((i) => i.code === 'UNIT_OVERLAP');
/** Put a unit somewhere by hand, past every clamp, the way a stale save could. */
function placeAt(id, x) {
  useProjectStore.setState((st) => ({
    units: st.units.map((u) => (u.id === id ? { ...u, position: { ...u.position, x_mm: x } } : u)),
  }));
}

test('T82 F17 after the review . a column standing 600 to 900 off the wall stops a panel whose back is at 700: the move, the width, the Check', () => {
  bareRoom([{ id: 'col', x: 2000, y: 600, w: 400, d: 300 }]);
  const panel = S().addUnit('FREE_PANEL', { wall: 0, x: 600 }).id;
  S().setUnitInsets(panel, { back: 690 });
  assert.equal(COLLISION.backStandoff(unit(panel), P), 700, 'the stage: the board at 700 to 718, inside the column');
  // The move is held at the column, as it is for a panel and a box both at the wall.
  assert.equal(S().moveUnit(panel, 1900, 0.5, { magnet: false }).x, 2000 - 800, 'the panel passed through the column');
  // The width does not grow through it.
  S().moveUnit(panel, 600, 0.5, { magnet: false });
  const { notices, s } = grow(panel, { panel_length: 2500 });
  assert.ok(s.x + s.box.width <= 2000 + 1e-6, `the panel grew into the column: ${s.x} + ${s.box.width}`);
  assert.match(notices.join(' '), /Width limited to/);
  // A panel standing in it (a stale save) is said in the Check.
  placeAt(panel, 1900);
  assert.equal(overlaps(panel).length, 1, 'the Check said nothing of the column the board crosses');
  // Control: the same panel back at the wall passes in front of nothing it crosses.
  S().setUnitInsets(panel, { back: 0 });
  assert.deepEqual(overlaps(panel), [], 'the column 600 off the wall is not where a panel at the wall is');
});

test('T82 F17 after the review . a BUD round the corner (wall 2, 800 to 1400 off wall 1) stops a panel whose back is at 1000; the two Checks agree', () => {
  bareRoom();
  const bud = S().addUnit('BUD', { wall: 1, x: 800 }).id;
  const panel = S().addUnit('FREE_PANEL', { wall: 0, x: 3000 }).id;
  S().setUnitInsets(panel, { back: 990 });
  assert.equal(COLLISION.backStandoff(unit(panel), P), 1000);
  const moved = S().moveUnit(panel, 4190, 0.5, { magnet: false });
  // The BUD's carcass reaches from 4990 back to 4432 along wall 1 (10 + 558).
  assert.ok(moved.x + 800 <= 5000 - CLEARANCE - 558 + 1e-6, `the panel drove into the BUD: x ${moved.x}`);
  placeAt(panel, 4190);
  assert.equal(overlaps(panel).length, 1, 'only the BUD\'s Check spoke');
  assert.equal(overlaps(bud).length, 1);
  // Control: at the wall (back 10, the board at 10 to 28) the BUD 800 out is not in its way.
  S().setUnitInsets(panel, { back: 0 });
  placeAt(panel, 3000);
  assert.equal(S().moveUnit(panel, 4190, 0.5, { magnet: false }).x, 4190);
  assert.deepEqual(overlaps(panel), []);
});

test('T82 F17 after the review . a corner BUD entirely BEHIND a panel 1000 off the wall: no "Depth limited", no squash, and the across panel reaches x 4500', () => {
  const fresh = (patch = null) => {
    bareRoom();
    const bud = S().addUnit('BUD', { wall: 1, x: 600 }).id;
    S().moveUnit(bud, 0, 0.5, { magnet: false });
    const panel = S().addUnit('FREE_PANEL', { wall: 0, x: 4000 }).id;
    S().setUnitInsets(panel, { back: 990 });
    return { bud, panel, res: patch ? S().updateUnitParams(panel, patch) : null };
  };
  const { bud, panel } = fresh();
  // The stage: the BUD on wall 2 from 40 to 640 off wall 1, the board at 1000 to 1018.
  assert.equal(unit(bud).position.wall, 1);
  assert.ok(unit(bud).position.x_mm + 600 < 1000, 'the BUD reaches the panel: the test says nothing');
  assert.equal(S().unitSizeBoundsFor(panel).depth.max, 3000 - 1000, 'the size window\'s depth was 0');
  for (const patch of [{ board_t: 36 }, { panel_width: 600 }, { panel_length: 900 }]) {
    const { res } = fresh(patch);
    assert.deepEqual(res.notices, [], `${JSON.stringify(patch)}: ${res.notices.join(' / ')}`);
  }
  // Laid flat or leant, the board keeps its box: nothing behind it squashes it.
  const flat = fresh({ panel_tilt_deg: 90 });
  assert.deepEqual(flat.res.notices, []);
  assert.equal(unit(flat.panel).params.depth, 400, 'the flat board was squashed by the BUD behind it');
  const leant = fresh({ panel_tilt_deg: 60 });
  assert.deepEqual(leant.res.notices, []);
  assert.equal(S().unitResult(leant.panel).panels[0].box.h, 400, 'the leant board was squashed to 1');
  assert.deepEqual(overlaps(leant.panel), []);
  // Across the wall, 1000 out, it slides over the BUD's stretch of wall.
  const across = fresh({ panel_facing: 'across' });
  assert.equal(S().moveUnit(across.panel, 4500, 0.5, { magnet: false }).x, 4500, 'the BUD behind the panel stopped it');
});
