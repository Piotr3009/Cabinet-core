// ─── Collisions: the paths that are not a drag ───
//
// Turn 2 closed dragging. What was left open: a unit can also grow into its
// neighbour (type a bigger width), grow into the room (type a bigger depth),
// or meet another unit around a CORNER, where the two stand on different walls
// and what overlaps is their footprints on the floor.
//
// All of it goes through the same pure functions as the drag — that is the
// point of the file: one rule, several entry points, no second copy to drift.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampUnitWidth, clampUnitDepth, clampUnitX, wallObstacles, unitFootprint,
  spanInWallFrame, maxDepthOnWall, unitIssues,
} from '../src/engine/collision.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { migrateRoom, roomWalls, rectCorners, lCorners } from '../src/engine/room.js';

const rect = (w = 4000, d = 3000) => migrateRoom({ height: 2500, corners: rectCorners(w, d) });
const lRoom = () => migrateRoom({ height: 2500, corners: lCorners(4000, 3000, 1500, 1200) });
const other = (wall, x, width, depth, label) => ({ wall, x_mm: x, width, depth, label });

// ─── growing wider ───

test('a unit may not grow into its neighbour', () => {
  const walls = roomWalls(rect());
  const others = wallObstacles({ wall: walls[0], walls, depth: 558, others: [other(0, 1200, 600, 558, 'W02')] });
  // Standing at 0, the neighbour starts at 1200 — that is the ceiling.
  const clamp = clampUnitWidth({ width: 1500, x: 0, wallWidth: walls[0].width, others }, P);
  assert.equal(clamp.width, 1200);
  assert.equal(clamp.max, 1200);
  assert.equal(clamp.blocked, true);
  assert.equal(clamp.by, 'W02');

  // Asking for less than the room available is simply granted.
  assert.deepEqual(clampUnitWidth({ width: 900, x: 0, wallWidth: 4000, others }, P),
    { width: 900, max: 1200, blocked: false, by: null });
});

test('a unit may not grow past the end of its wall', () => {
  const walls = roomWalls(rect());
  const clamp = clampUnitWidth({ width: 1500, x: 3200, wallWidth: walls[0].width, others: [] }, P);
  assert.equal(clamp.width, 800);
  assert.equal(clamp.blocked, true);
  assert.equal(clamp.by, 'the wall');
});

test('the scribe gap applies to growing, exactly as it applies to moving', () => {
  const scribed = migrateCabinetProfile({ ...P, editor: { ...P.editor, minUnitGap: 5 } });
  const others = [{ left: 1200, right: 1800, label: 'W02' }];
  assert.equal(clampUnitWidth({ width: 2000, x: 0, wallWidth: 4000, others }, scribed).width, 1195);
  assert.equal(clampUnitWidth({ width: 2000, x: 0, wallWidth: 4000, others }, P).width, 1200);
});

test('a neighbour entirely to the left never limits a width', () => {
  const others = [{ left: 0, right: 600, label: 'W01' }];
  const clamp = clampUnitWidth({ width: 3000, x: 600, wallWidth: 4000, others }, P);
  assert.equal(clamp.width, 3000);
  assert.equal(clamp.blocked, false);
});

// ─── growing deeper ───

test('depth stops at the far wall of the room', () => {
  const room = rect(4000, 3000);
  const walls = roomWalls(room);
  assert.equal(maxDepthOnWall({ wall: walls[0], walls, x: 0, width: 600 }), 3000);
  const clamp = clampUnitDepth({ depth: 4000, x: 0, width: 600, wall: walls[0], walls, others: [] }, P);
  assert.equal(clamp.depth, 3000);
  assert.equal(clamp.blocked, true);
  assert.equal(clamp.by, 'the room');
});

test('in an L-shaped room the depth limit follows the wall the unit faces', () => {
  const room = lRoom();          // 4000 × 3000 with a 1500 × 1200 bite out of the far-right
  const walls = roomWalls(room);
  const front = walls.find((w) => w.start.y === 0 && w.end.y === 0);
  // Left of the bite the room is the full depth; behind the bite it is shorter.
  assert.equal(maxDepthOnWall({ wall: front, walls, x: 0, width: 600 }), 3000);
  assert.equal(maxDepthOnWall({ wall: front, walls, x: 3200, width: 600 }), 1800);
  // A unit straddling the step is limited by the SHALLOWER side, not the deeper.
  assert.equal(maxDepthOnWall({ wall: front, walls, x: 2300, width: 600 }), 1800);
});

test('a unit may not grow into the one standing around the corner', () => {
  const room = rect(4000, 3000);
  const walls = roomWalls(room);
  const wall0 = walls[0];
  const wall1 = walls[1];        // the wall that turns the corner at x = 4000
  // A 600-wide, 900-deep unit on wall 1, standing 800 mm along it. In wall 0's
  // frame it covers the last 900 mm of the wall, 800…1400 mm into the room.
  const others = [other(wall1.index, 800, 600, 900, 'W02')];

  const clamp = clampUnitDepth({ depth: 1200, x: 3400, width: 600, wall: wall0, walls, others }, P);
  assert.equal(clamp.max, 800, 'it may come forward only as far as that unit reaches');
  assert.equal(clamp.depth, 800);
  assert.equal(clamp.blocked, true);
  assert.equal(clamp.by, 'W02');

  // The same unit at the OTHER end of the wall is not affected at all.
  const away = clampUnitDepth({ depth: 1200, x: 0, width: 600, wall: wall0, walls, others }, P);
  assert.equal(away.depth, 1200);
  assert.equal(away.blocked, false);
  assert.equal(away.by, null);

  // And a neighbour standing IN the corner leaves no depth at all: a unit
  // there would already be inside it.
  const inCorner = clampUnitDepth({
    depth: 600, x: 3400, width: 600, wall: wall0, walls, others: [other(wall1.index, 0, 600, 900, 'W03')],
  }, P);
  assert.equal(inCorner.max, 0);
  assert.equal(inCorner.by, 'W03');
});

// ─── corners, seen from the move path ───

test('a unit around the corner is an obstacle for sliding, not just for growing', () => {
  const room = rect(4000, 3000);
  const walls = roomWalls(room);
  // 600 × 900 unit standing on wall 1 at the corner: in wall 0's frame it
  // occupies the last 900 mm and reaches 600 mm into the room.
  const others = [other(1, 0, 600, 900, 'W02')];
  const spans = wallObstacles({ wall: walls[0], walls, depth: 558, others });
  assert.equal(spans.length, 1);
  assert.equal(spans[0].corner, true);
  assert.ok(Math.abs(spans[0].right - 4000) < 1e-6);
  assert.ok(Math.abs(spans[0].left - (4000 - 900)) < 1e-6);

  // …so a unit slid hard right stops at it instead of overlapping it.
  const clamp = clampUnitX({ x: 9999, current: 1000, width: 600, wallWidth: 4000, others: spans }, P);
  assert.equal(clamp.x, 4000 - 900 - 600);
});

test('a shallow unit passes in front of a corner neighbour that starts further back', () => {
  const room = rect(4000, 3000);
  const walls = roomWalls(room);
  // On wall 1, 400 mm along it: in wall 0's frame the unit occupies 400…1000 mm
  // into the room, so it is only in the way of something at least that deep.
  const others = [other(1, 400, 600, 900, 'W02')];
  assert.equal(wallObstacles({ wall: walls[0], walls, depth: 558, others }).length, 1, '558 deep reaches it');
  assert.equal(wallObstacles({ wall: walls[0], walls, depth: 300, others }).length, 0, '300 deep passes in front');
});

test('the wall opposite is never an obstacle, however deep the units are', () => {
  const room = rect(4000, 3000);
  const walls = roomWalls(room);
  const opposite = walls[2];
  const others = [other(opposite.index, 0, 600, 900, 'W03')];
  assert.deepEqual(wallObstacles({ wall: walls[0], walls, depth: 700, others }), []);
});

// ─── the plan geometry these rest on ───

test('a footprint is the rectangle the unit really covers on the floor', () => {
  const walls = roomWalls(rect(4000, 3000));
  const fp = unitFootprint({ wall: walls[0], x: 1000, width: 600, depth: 500 });
  assert.equal(fp.length, 4);
  const span = spanInWallFrame(fp, walls[0]);
  assert.equal(Math.round(span.left), 1000);
  assert.equal(Math.round(span.right), 1600);
  assert.equal(Math.round(span.near), 0);
  assert.equal(Math.round(span.far), 500);

  // Measured from the NEXT wall's frame, the same footprint sits off to one
  // side and 2400 mm away — which is why it does not block anything there.
  const fromNext = spanInWallFrame(fp, walls[1]);
  assert.ok(fromNext.near > 2000, `near ${fromNext.near}`);
});

test('every wall of an L-shaped room measures the same footprint consistently', () => {
  const room = lRoom();
  const walls = roomWalls(room);
  for (const wall of walls) {
    const fp = unitFootprint({ wall, x: 0, width: 600, depth: 500 });
    const span = spanInWallFrame(fp, wall);
    assert.ok(Math.abs(span.left) < 1e-6, `wall ${wall.index} left`);
    assert.ok(Math.abs(span.right - 600) < 1e-6, `wall ${wall.index} right`);
    assert.ok(Math.abs(span.near) < 1e-6, `wall ${wall.index} near`);
    assert.ok(Math.abs(span.far - 500) < 1e-6, `wall ${wall.index} far`);
  }
});

test('validation reports a corner overlap the same way as a side-by-side one', () => {
  const room = rect(4000, 3000);
  const walls = roomWalls(room);
  const unit = { position: { wall: 0, x_mm: 3600 }, params: { width: 600, height: 2150, depth: 558 } };
  const others = wallObstacles({
    wall: walls[0], walls, depth: 558, others: [other(1, 0, 600, 900, 'W02')],
  }).map((o) => ({ left: o.left, right: o.right, label: o.label }));
  const issues = unitIssues({ unit, wallWidth: 4000, roomHeight: 2500, others });
  assert.equal(issues[0].code, 'UNIT_OVERLAP');
  assert.match(issues[0].message, /W02/);
});
