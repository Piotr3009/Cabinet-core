// ─── T51 · F1 — THE WALL EDITOR IS REVERTED, AND THE PLAN IS REAL ───────────
//
// The owner, 26.08.2026:
//
//   *"drawing room w ogóle nie ma sensu — cofnij całkowicie to i zostaw
//   dodawanie wnęki i boxa jak wcześniej, ale żeby działało. ten sposób
//   rysowania nie ma sensu."*
//
// The revert is asserted in `turn49-f2-...` beside the tests it reverses. What
// is asserted HERE is the half CLAUDE.md calls "F1's real job" — that the
// things left standing beside the editor actually work — and the two faults
// that were found by USING the app rather than by reading it:
//
//   1. `+ Box` was drawn behind `scope === 'room'`. A ONE-WALL job — most of
//      the jobs this app quotes — had no door to a box at all, which is the
//      owner's *"nie pokazuje się"* exactly.
//   2. A RECESS and a CHIMNEY were stored on `project.wallSlopes`, listed in
//      the wall editor and drawn in its top view — and then read by NOTHING.
//      Both `3d/Room.jsx` and the placement filter that list to
//      `kind === 'slope'`, so the room did not contain what the joiner drew.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  migrateRoom, roomWalls, roomBoxes, boxCorners,
  planElementBlocks, planElementFootprint, wallPlanObstacles,
} from '../src/engine/room.js';
import { boxSpansOnWall } from '../src/engine/collision.js';
import { migrateWallElement } from '../src/lib/wallElements.js';

const ROOM_JSX = readFileSync(new URL('../src/3d/Room.jsx', import.meta.url), 'utf8');
const STORE = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');

/** A plain 4 × 3 m room. Wall 0 runs along y = 0, from (0,0) to (4000,0). */
const room = () => migrateRoom({
  height: 2500,
  corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }],
});

const el = (patch) => migrateWallElement({
  id: 'e1', kind: 'chimney', wall: 0, x_mm: 1000, width: 600, depth: 350, ...patch,
});

// ─── the module that was never there ───────────────────────────────────────

test('F1 — engine/wallDraw.js is gone', async () => {
  await assert.rejects(
    () => import('../src/engine/wallDraw.js'),
    'the module the owner struck out does not resolve',
  );
});

test('F1 — and the room model no longer carries what only that editor read', () => {
  const r = migrateRoom({ height: 2500, corners: room().corners, drawn_walls: 2 });
  assert.equal(r.drawn_walls, undefined, '`drawn_walls` went with the editor that wrote it');
});

// ─── a chimney is a box that was drawn on a wall ────────────────────────────

test('F1 — a CHIMNEY stands INTO the room, off the wall it was drawn on', () => {
  const foot = planElementFootprint(el({}), roomWalls(room())[0]);
  assert.ok(foot, 'it has a footprint at all, which is the whole bug');
  // Wall 0 runs along +x at y = 0 and its inward is +y, so a breast standing
  // proud of it occupies y 0 → 350 over x 1000 → 1600.
  const xs = foot.corners.map((c) => c.x).sort((a, b) => a - b);
  const ys = foot.corners.map((c) => c.y).sort((a, b) => a - b);
  assert.deepEqual([xs[0], xs[3]], [1000, 1600], 'along the wall, where it was drawn');
  assert.deepEqual([ys[0], ys[3]], [0, 350], 'and proud of it, into the room');
  assert.equal(foot.blocks, true, 'a cabinet has to stop at one');
});

test('F1 — a RECESS goes the OTHER way, and is never an obstacle', () => {
  const foot = planElementFootprint(el({ id: 'r1', kind: 'recess', depth: 300 }), roomWalls(room())[0]);
  const ys = foot.corners.map((c) => c.y).sort((a, b) => a - b);
  assert.deepEqual([ys[0], ys[3]], [-300, 0], 'cut back through the wall, not into the room');
  assert.equal(foot.blocks, false);
  assert.equal(planElementBlocks({ kind: 'recess' }), false);
  assert.equal(planElementBlocks({ kind: 'chimney' }), true);
});

test('F1 — the placement clamps against a chimney and NOT against a recess', () => {
  const r = room();
  const list = [el({}), el({ id: 'r1', kind: 'recess', depth: 300, x_mm: 2500, width: 900 })];
  const blocking = wallPlanObstacles(r, list, { blocking: true });
  assert.equal(blocking.length, 1, 'one of the two stops a cabinet');
  assert.equal(blocking[0].kind, 'chimney');

  const both = wallPlanObstacles(r, list);
  assert.equal(both.length, 2, 'and the VIEW is given both');

  // …and it reaches the clamp by the route a box in the plan has taken since
  // turn 14: same record, same function, no second obstacle kind downstream.
  const spans = boxSpansOnWall({ wall: roomWalls(r)[0], depth: 600, boxes: blocking });
  assert.equal(spans.length, 1);
  assert.equal(spans[0].left, 1000);
  assert.equal(spans[0].right, 1600);
});

test('F1 — a chimney on an ANGLED wall keeps its own line', () => {
  // An L-shaped room: wall 1 runs from (4000,0) to (4000,1500) — down the page,
  // so a chimney on it is 350 deep in −x, not in +y.
  const lShaped = migrateRoom({
    height: 2500,
    corners: [
      { x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 1500 },
      { x: 2000, y: 1500 }, { x: 2000, y: 3000 }, { x: 0, y: 3000 },
    ],
  });
  const wall = roomWalls(lShaped)[1];
  const foot = planElementFootprint(el({ wall: 1, x_mm: 200, width: 600, depth: 350 }), wall);
  const xs = foot.corners.map((c) => c.x);
  assert.ok(Math.min(...xs) < 4000, 'it stands off that wall, into the room');
  // And `boxCorners` takes those four as given rather than squaring them up —
  // an axis-aligned box round a turned chimney is a chimney that is not there.
  assert.deepEqual(boxCorners(foot), foot.corners);
});

test('F1 — an ordinary box in the plan is unchanged by any of this', () => {
  const r = migrateRoom({ ...room(), boxes: [{ id: 'b1', x: 100, y: 200, w: 300, d: 400 }] });
  assert.deepEqual(boxCorners(roomBoxes(r)[0]), [
    { x: 100, y: 200 }, { x: 400, y: 200 }, { x: 400, y: 600 }, { x: 100, y: 600 },
  ]);
  assert.deepEqual(wallPlanObstacles(r, []), [], 'and a room with no wall elements has none');
});

// ─── the two surfaces that were reading past it ────────────────────────────

test('F1 — the SCENE draws the recesses and chimneys of each wall', () => {
  assert.match(ROOM_JSX, /const planOnWall = useCallback/, 'the list is read for all three kinds now');
  assert.match(ROOM_JSX, /planElements=\{wall\.stub \? \[\] : planOnWall\(wall\.index\)\}/, 'and handed to the wall');
  assert.match(ROOM_JSX, /el\.kind === 'chimney'/, 'a breast is a solid');
  assert.match(ROOM_JSX, /if \(el\.kind !== 'recess'\) continue;/, 'an alcove is a hole in the wall');
});

test('F1 — every clamp asks ONE function what the plan puts in the way', () => {
  assert.match(STORE, /function planObstaclesOf\(room, wallSlopeList\) \{/);
  // Nothing clamps against `roomBoxes` alone any more: a call site that knew
  // about only half the plan is exactly how a chimney went unnoticed for a turn.
  const calls = STORE.match(/boxes: roomBoxes\(/g) || [];
  assert.equal(calls.length, 0, 'no call site reads half the plan');
  assert.ok((STORE.match(/planObstaclesOf\(/g) || []).length >= 7, 'and they all read the whole of it');
});
