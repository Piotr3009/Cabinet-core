// ─── Interactions: the rules behind them ───
//
// The animations and the camera flight are view state and stay in the view.
// What CAN be tested here is what they must never break: a turned unit obeys
// the same collision rules as a straight one, and the context menu offers the
// actions a unit actually has.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  unitFootprint, unitPlanSpan, wallObstacles, clampUnitX, spanInWallFrame,
} from '../src/engine/collision.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, roomWalls, rectCorners } from '../src/engine/room.js';
import { menuActions } from '../src/lib/contextActions.js';

const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
const walls = roomWalls(room);
const wall0 = walls[0];

test('turning a unit turns its footprint about the point it meets the wall', () => {
  const straight = unitPlanSpan({ wall: wall0, x: 1000, width: 600, depth: 500, rotation: 0 });
  assert.equal(Math.round(straight.left), 1000);
  assert.equal(Math.round(straight.right), 1600);
  assert.equal(Math.round(straight.far), 500);

  // 90°: the unit now runs INTO the room, so it covers its depth along the
  // wall and its width away from it.
  const turned = unitPlanSpan({ wall: wall0, x: 1000, width: 600, depth: 500, rotation: 90 });
  assert.equal(Math.round(turned.right - turned.left), 500);
  assert.equal(Math.round(turned.far - turned.near), 600);

  // 180° puts it behind the wall — which is exactly why the clamp has to see
  // the footprint and not the nominal width.
  const flipped = unitPlanSpan({ wall: wall0, x: 1000, width: 600, depth: 500, rotation: 180 });
  assert.equal(Math.round(flipped.far), 0);
  assert.equal(Math.round(flipped.near), -500);
});

test('45° is allowed, and its footprint is the real diagonal', () => {
  const span = unitPlanSpan({ wall: wall0, x: 0, width: 600, depth: 400, rotation: 45 });
  const expected = (600 + 400) * Math.SQRT1_2;
  assert.ok(Math.abs((span.right - span.left) - expected) < 1e-6, `${span.right - span.left} vs ${expected}`);
  const corners = unitFootprint({ wall: wall0, x: 0, width: 600, depth: 400, rotation: 45 });
  assert.equal(corners.length, 4);
  // The anchor corner stays exactly where it was.
  assert.ok(Math.abs(corners[0].x - wall0.start.x) < 1e-9 && Math.abs(corners[0].y - wall0.start.y) < 1e-9);
});

test('a turned neighbour blocks by what it covers, not by its width', () => {
  // 600 × 500 anchored at 2000 and turned 90°: it now stands side-to-wall, so
  // it covers its DEPTH along the wall (1500…2000) and its width goes into the
  // room. The anchor stays where it was, which is also where the 3D view
  // pivots it — picture and rule cannot disagree.
  const others = [{ wall: 0, x_mm: 2000, width: 600, depth: 500, rotation: 90, label: 'W02' }];
  const spans = wallObstacles({ wall: wall0, walls, depth: 558, others });
  assert.equal(spans.length, 1);
  assert.equal(Math.round(spans[0].left), 1500);
  assert.equal(Math.round(spans[0].right), 2000, 'its DEPTH is what lies along the wall now');

  // A unit slid at it from the left stops against the footprint, 100 mm
  // earlier than it would against the same cabinet standing straight.
  const stop = clampUnitX({ x: 9999, current: 0, width: 600, wallWidth: 4000, others: spans }, P);
  assert.equal(stop.x, 900);
});

test('a unit turned into the room still measures correctly from another wall', () => {
  const fp = unitFootprint({ wall: wall0, x: 3800, width: 600, depth: 400, rotation: 90 });
  const fromNeighbour = spanInWallFrame(fp, walls[1]);
  // It reaches around the corner: wall 1 sees it close to its own start.
  assert.ok(fromNeighbour.near < 300, `near ${fromNeighbour.near}`);
  const obstacles = wallObstacles({
    wall: walls[1], walls, depth: 558,
    others: [{ wall: 0, x_mm: 3800, width: 600, depth: 400, rotation: 90, label: 'W01' }],
  });
  assert.equal(obstacles.length, 1);
  assert.equal(obstacles[0].corner, true);
});

// ─── the context menu is a LIST, not a switch ───

const unitOf = (type, extra = {}) => ({
  id: 'u1', type, position: { wall: 0, x_mm: 0, rotation_deg: 0 }, params: { unit_num: '01', width: 600 }, ...extra,
});

test('the menu offers what the unit has, and always offers the basics', () => {
  const store = {};
  const wardrobe = menuActions({ unit: unitOf('WARDROBE'), panelPart: 'BUL', store });
  const ids = wardrobe.map((a) => a.id);
  assert.deepEqual(ids, ['center-shelves', 'rotate-90', 'back-to-wall', 'side-to-wall', 'delete']);

  // A fridge housing has no shelves, so it is not offered a shelf action.
  const fridge = menuActions({ unit: unitOf('FRIDGE'), panelPart: 'BUL', store }).map((a) => a.id);
  assert.equal(fridge.includes('center-shelves'), false);
  assert.ok(fridge.includes('rotate-90') && fridge.includes('delete'));

  // Right-clicking a front also offers to shut everything again.
  const onFront = menuActions({ unit: unitOf('WARDROBE'), panelPart: 'FRONT', store }).map((a) => a.id);
  assert.ok(onFront.includes('close-fronts'));
});

test('every menu action is runnable and calls exactly its own store function', () => {
  const called = [];
  const store = {
    redistributeShelves: (id) => called.push(['center', id]),
    rotateUnit: (id, mode, value) => called.push(['rotate', id, mode, value]),
    removeUnit: (id) => called.push(['delete', id]),
    closeAllFronts: (id) => called.push(['close', id]),
  };
  const actions = menuActions({ unit: unitOf('WARDROBE'), panelPart: 'DRAWER-FRONT', store });
  for (const a of actions) {
    assert.equal(typeof a.run, 'function', `${a.id} has no run`);
    assert.equal(typeof a.label, 'string');
    a.run();
  }
  assert.deepEqual(called, [
    ['center', 'u1'],
    ['rotate', 'u1', 'step', 90],
    ['rotate', 'u1', 'back', 0],
    ['rotate', 'u1', 'side', 90],
    ['close', 'u1'],
    ['delete', 'u1'],
  ]);
});

test('only one action is destructive, and it says so', () => {
  const actions = menuActions({ unit: unitOf('BUD'), panelPart: 'BUL', store: {} });
  assert.deepEqual(actions.filter((a) => a.danger).map((a) => a.id), ['delete']);
});
