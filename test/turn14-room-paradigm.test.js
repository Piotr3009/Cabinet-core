// ─── Turn 14, F10: Room setup, the new paradigm ─────────────────────────────
//
// The owner: corner-dragging is unusable, and he is describing the ARITHMETIC
// rather than the mouse. A corner is a point shared by two walls, so dragging
// it changes the DIRECTION of both — every angle in the room moves at once and
// a right angle can only be hit by luck.
//
// What a joiner moves is a WALL, and that is one primitive: `moveWall` offsets
// a wall along its own normal and re-cuts the two neighbours where they now
// meet it, keeping their directions exactly. F1.5a's typed length is that
// primitive solved for a crossing point; F10.2's typed distance is that
// primitive with the number typed instead of dragged; F10.3's box is the same
// gesture on a rectangle. CLAUDE.md F10.5 asks for exactly this — build on the
// constraint, do not duplicate it — and the tests below are what says it is
// one rule and not four.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  migrateRoom, rectCorners, lCorners, roomWalls, moveWall, setWallLength,
  roomBoxes, migrateBox, moveBox, moveBoxSide, boxCorners, MIN_BOX_SIZE, BOX_SIDES,
} from '../src/engine/room.js';
import {
  boxSpansOnWall, wallObstacles, clampUnitX, freeSlotOnWall,
} from '../src/engine/collision.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const room = (w = 4000, d = 3000, extra = {}) => migrateRoom({ height: 2500, corners: rectCorners(w, d), ...extra });
const wallsOf = (r, corners) => roomWalls({ ...r, corners });
const angles = (r, corners) => wallsOf(r, corners).map((w) => Math.round((Math.atan2(w.along.y, w.along.x) * 180) / Math.PI));

// ─── F10.1 — drag a WHOLE WALL ─────────────────────────────────────────────

test('F10.1 — a wall moves along its own normal; the neighbours stretch', () => {
  const r = room();
  const before = angles(r, r.corners);
  const next = moveWall(r, 0, 500);
  const walls = wallsOf(r, next);
  assert.equal(Math.round(walls[0].width), 4000, 'the wall that moved keeps its length');
  assert.equal(Math.round(walls[1].width), 3500, 'and its neighbours grew by exactly the move');
  assert.equal(Math.round(walls[3].width), 3500);
  assert.deepEqual(angles(r, next), before, 'every angle in the room is preserved');
});

test('F10.1 — an L-SHAPE keeps all six angles too (F10.4)', () => {
  const r = migrateRoom({ height: 2500, corners: lCorners(4000, 3000, 1200, 1000) });
  const before = angles(r, r.corners);
  for (const index of [0, 1, 2, 3, 4, 5]) {
    const next = moveWall(r, index, 120);
    assert.deepEqual(angles(r, next), before, `moving wall ${index} sheared the room`);
  }
});

test('F10.1 — a wall dragged through the room is REFUSED, not folded', () => {
  const r = room();
  assert.deepEqual(moveWall(r, 1, -4000), r.corners, 'inside out is not a room');
  assert.deepEqual(moveWall(r, 0, -3000), r.corners);
  // …and a move of nothing is a no-op rather than a rewrite.
  assert.deepEqual(moveWall(r, 0, 0), r.corners);
});

// ─── F10.2 — typed distance ────────────────────────────────────────────────

test('F10.2 — typed 202 moves the wall EXACTLY 202', () => {
  const r = room();
  const next = moveWall(r, 0, 202);
  // Wall 0 runs along y = 0 and moves OUTWARD, so the room grows by 202.
  assert.equal(Math.round(next[0].y * 10) / 10, -202);
  assert.equal(Math.round(next[1].y * 10) / 10, -202);
  assert.equal(Math.round(wallsOf(r, next)[1].width), 3202);
  // …and 20 then 202 is 202 from the ORIGINAL, not 222: the drag remembers the
  // room as it was when the hand went down, which is what makes the typed
  // number absolute.
  const dragged = moveWall(r, 0, 20);
  assert.equal(Math.round(moveWall(r, 0, 202)[0].y), Math.round(next[0].y));
  assert.equal(Math.round(dragged[0].y), -20);
});

test('F10.2/F1.5a — the typed LENGTH and the typed DISTANCE are one primitive', () => {
  const r = room();
  // "Make wall 1 4500" is "move wall 2 out by 500" — the same call, solved for
  // the crossing point. If they were two rules they could disagree; they cannot.
  assert.deepEqual(setWallLength(r, 0, 4500), moveWall(r, 1, 500));
});

// ─── F10.3 — the box ───────────────────────────────────────────────────────

test('F10.3 — a box is a rectangle in the plan, and it is never inverted', () => {
  const b = migrateBox({ id: 'b1', x: 1000, y: 200, w: 400, d: 350 });
  assert.deepEqual(boxCorners(b), [
    { x: 1000, y: 200 }, { x: 1400, y: 200 }, { x: 1400, y: 550 }, { x: 1000, y: 550 },
  ]);
  assert.equal(migrateBox({ w: -5, d: 0 }).w, MIN_BOX_SIZE, 'a box with no size is not a box');
  assert.ok(migrateBox({}).id, 'and it always has an id to be picked by');
});

test('F10.3 — a box SIDE moves exactly as a wall does: outward is positive', () => {
  const b = migrateBox({ id: 'b1', x: 1000, y: 200, w: 400, d: 350 });
  assert.deepEqual(moveBoxSide(b, 'right', 100), { ...b, w: 500 });
  assert.deepEqual(moveBoxSide(b, 'left', 100), { ...b, x: 900, w: 500 });
  assert.deepEqual(moveBoxSide(b, 'back', 50), { ...b, d: 400 });
  assert.deepEqual(moveBoxSide(b, 'front', 50), { ...b, y: 150, d: 400 });
  // Dragged through the opposite side it is refused, exactly as a wall is.
  assert.deepEqual(moveBoxSide(b, 'right', -400), b);
  assert.deepEqual(moveBoxSide(b, 'nonsense', 100), b);
  assert.deepEqual(BOX_SIDES, ['left', 'right', 'front', 'back']);
});

test('F10.3 — the whole box moves without changing size', () => {
  const b = migrateBox({ id: 'b1', x: 1000, y: 200, w: 400, d: 350 });
  assert.deepEqual(moveBox(b, 250, -100), { ...b, x: 1250, y: 100 });
});

test('F10.3 — a box travels with the room, and survives a save', () => {
  const r = room(4000, 3000, { boxes: [{ id: 'b1', x: 1000, y: 0, w: 400, d: 350 }] });
  assert.equal(roomBoxes(r).length, 1);
  const reloaded = migrateRoom(JSON.parse(JSON.stringify(r)));
  assert.deepEqual(roomBoxes(reloaded), roomBoxes(r));
  // …and a room that has none carries no empty key to save.
  assert.equal(migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }).boxes, undefined);
});

// ─── F10.3 — it participates in placement collision LIKE WALLS DO ──────────

test('F10.3 — a box on the wall blocks a cabinet exactly as a neighbour does', () => {
  const r = room(4000, 3000, { boxes: [{ id: 'chimney', x: 1500, y: 0, w: 400, d: 300 }] });
  const wall = roomWalls(r)[0];
  const spans = boxSpansOnWall({ wall, depth: 558, boxes: roomBoxes(r) });
  assert.equal(spans.length, 1);
  assert.equal(Math.round(spans[0].left), 1500);
  assert.equal(Math.round(spans[0].right), 1900);
  assert.equal(spans[0].box, true, 'and it says what it is, so a message can name it');

  // A unit slid at it from the left STOPS at it.
  const stop = clampUnitX({
    x: 9999, current: 0, width: 600, wallWidth: 4000, others: spans,
  }, P);
  assert.equal(stop.x, 1500 - 600 - P.editor.minUnitGap);
});

test('F10.3 — a box the cabinet passes BEHIND or IN FRONT of is not in the way', () => {
  const r = room(4000, 3000, { boxes: [{ id: 'pillar', x: 1500, y: 900, w: 400, d: 400 }] });
  const wall = roomWalls(r)[0];
  // The pillar stands 900 into the room; a 558-deep cabinet on this wall never
  // reaches it, so it is not an obstacle — the same rule a unit on another wall
  // is measured by.
  assert.deepEqual(boxSpansOnWall({ wall, depth: 558, boxes: roomBoxes(r) }), []);
  // …and a deep run does meet it.
  assert.equal(boxSpansOnWall({ wall, depth: 1000, boxes: roomBoxes(r) }).length, 1);
  // The wall OPPOSITE never sees it either.
  const far = roomWalls(r)[2];
  assert.deepEqual(boxSpansOnWall({ wall: far, depth: 558, boxes: roomBoxes(r) }), []);
});

test('F10.3 — the drag clamp and the PLACEMENT search see the same box', () => {
  const r = room(4000, 3000, { boxes: [{ id: 'chimney', x: 0, y: 0, w: 600, d: 300 }] });
  const wall = roomWalls(r)[0];
  const boxes = roomBoxes(r);
  const obstacles = wallObstacles({
    wall, walls: roomWalls(r), depth: 558, others: [], boxes,
  });
  assert.equal(obstacles.length, 1, 'the drag clamp sees it');
  // The placement takes bare spans, and it must not drop a unit into a chimney.
  const x = freeSlotOnWall({
    width: 600,
    wallWidth: 4000,
    others: boxSpansOnWall({ wall, depth: 558, boxes }),
  }, P);
  assert.ok(x >= 600, `a unit placed at ${x} would be standing in the chimney`);
});
