import test from 'node:test';
import assert from 'node:assert/strict';

import { wallDistances, roomDistances, distanceLabel } from '../src/engine/dimensions.js';
import { roomWalls, rectCorners, DEFAULT_ROOM } from '../src/engine/room.js';

// ─── Distance arrows (CLAUDE.md turn 3, phase 8) ───
// The numbers the toolbar draws on the canvas: unit → wall and unit → unit.
// They must agree with the collision clamp about where a unit actually is,
// which is why they are measured on the SAME footprint the clamp uses.

const ROOM = { ...DEFAULT_ROOM, corners: rectCorners(4000, 3000), height: 2500 };
const WALLS = roomWalls(ROOM);
const WALL = WALLS[0];

const at = (x, width, extra = {}) => ({
  id: `u${x}`, x_mm: x, width, depth: 600, rotation: 0, y: 100, label: `U${x}`, ...extra,
});

test('one unit on a wall: measured to BOTH corners', () => {
  const marks = wallDistances({ wall: WALL, units: [at(1000, 600)] });
  assert.equal(marks.length, 2);
  assert.deepEqual(marks.map((m) => m.kind), ['wall', 'wall']);
  assert.equal(marks[0].mm, 1000);                        // start corner → unit
  assert.equal(marks[1].mm, WALL.width - 1600);           // unit → far corner
  assert.deepEqual(marks[0].between, [null, 'U1000']);
  assert.deepEqual(marks[1].between, ['U1000', null]);
});

test('two units: wall, gap, wall — in order along the wall', () => {
  const marks = wallDistances({ wall: WALL, units: [at(2000, 500), at(500, 600)] });
  assert.deepEqual(marks.map((m) => m.kind), ['wall', 'unit', 'wall']);
  assert.equal(marks[0].mm, 500);
  assert.equal(marks[1].mm, 900);                         // 1100 → 2000
  assert.deepEqual(marks[1].between, ['U500', 'U2000']);
  assert.equal(marks[2].mm, WALL.width - 2500);
});

test('units butted together produce no gap arrow', () => {
  const marks = wallDistances({ wall: WALL, units: [at(0, 600), at(600, 600)] });
  // No arrow at the corner (the run starts there) and none between them.
  assert.deepEqual(marks.map((m) => m.kind), ['wall']);
  assert.equal(marks[0].from, 1200);
});

test('a gap under minGap is touching, not spaced', () => {
  const marks = wallDistances({ wall: WALL, units: [at(0, 600), at(601, 600)], minGap: 2 });
  assert.equal(marks.filter((m) => m.kind === 'unit').length, 0);
  const loose = wallDistances({ wall: WALL, units: [at(0, 600), at(601, 600)], minGap: 1 });
  assert.equal(loose.filter((m) => m.kind === 'unit').length, 1);
});

test('a rotated unit is measured across the wall it really covers', () => {
  // Side-to-wall: the footprint spans the DEPTH along the wall, not the width.
  const straight = wallDistances({ wall: WALL, units: [at(1000, 900)] });
  const turned = wallDistances({ wall: WALL, units: [at(1000, 900, { rotation: 90, depth: 600 })] });
  assert.equal(straight[1].from, 1900);                   // 1000 + width
  // Rotating about the wall anchor puts the footprint at [x - depth, x].
  assert.equal(turned[0].mm, 400);                        // corner → 1000 − 600
  assert.equal(turned[1].from, 1000);
});

test('overlapping units are not reported as a negative distance', () => {
  const marks = wallDistances({ wall: WALL, units: [at(0, 800), at(400, 800)] });
  assert.ok(marks.every((m) => m.mm > 0), 'no negative or zero measurement');
  assert.equal(marks.filter((m) => m.kind === 'unit').length, 0);
});

test('the line clears the deeper of the two neighbours', () => {
  const marks = wallDistances({
    wall: WALL,
    units: [at(0, 600, { depth: 400 }), at(1200, 600, { depth: 700 })],
  });
  const gap = marks.find((m) => m.kind === 'unit');
  assert.equal(gap.depth, 700);
});

test('the arrow floats between the two heights it measures between', () => {
  const marks = wallDistances({
    wall: WALL,
    units: [at(0, 600, { y: 100 }), at(1200, 600, { y: 1500 })],
  });
  assert.equal(marks.find((m) => m.kind === 'unit').y, 800);
  // The unit at 0 starts at the corner, so the only corner arrow left is the
  // one belonging to the unit at 1200 — and it floats at that unit's height.
  const corner = marks.filter((m) => m.kind === 'wall');
  assert.equal(corner.length, 1);
  assert.equal(corner[0].y, 1500);
});

test('base units and wall units are measured separately', () => {
  const marks = roomDistances({
    walls: WALLS,
    units: [
      { ...at(0, 600), wall: 0, level: 'floor' },
      { ...at(300, 600), wall: 0, level: 'wall' },
    ],
  });
  // A wall unit hanging over a base unit is not a 300 mm gap — each level gets
  // its own run, and each is measured to the corners on its own.
  assert.equal(marks.filter((m) => m.kind === 'unit').length, 0);
  assert.equal(marks.filter((m) => m.level === 'floor').length, 1);
  assert.equal(marks.filter((m) => m.level === 'wall').length, 2);
});

test('every wall of the room is measured, and marks name their wall', () => {
  const marks = roomDistances({
    walls: WALLS,
    units: [{ ...at(500, 600), wall: 0 }, { ...at(700, 600), wall: 2 }],
  });
  assert.deepEqual([...new Set(marks.map((m) => m.wall))].sort(), [0, 2]);
  for (const m of marks) assert.ok(WALLS[m.wall], 'mark points at a real wall');
});

test('an empty room measures nothing', () => {
  assert.deepEqual(roomDistances({ walls: WALLS, units: [] }), []);
  assert.deepEqual(wallDistances({ wall: WALL, units: [] }), []);
  assert.deepEqual(wallDistances({ wall: null, units: [at(0, 600)] }), []);
});

test('distances are captioned in whole millimetres', () => {
  // Turn 5 (BACKLOG #33): the caption goes through the app's one millimetre
  // rule, so a half millimetre survives the arrow instead of being rounded off
  // it. `test/format-mm.test.js` owns that rule; this only pins that the
  // arrows use it.
  assert.equal(distanceLabel(1234.4), '1234.4 mm');
  assert.equal(distanceLabel(0.5), '0.5 mm');
  assert.equal(distanceLabel(1234), '1234 mm');
});
