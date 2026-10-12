// ─── T78 · F1 · NOTHING COULD BE ADDED LEFT OF AN L (the owner's blocker) ────
//
// The owner, 11.10.2026: *"dodawanie szafek po lewej stronie l shape szafki
// prosze, teraz nie mozna dodac zadnych szafek"*, and *"powiekszenie L shape
// szafek prawa lewa strona"*.
//
// THE PROBE (verify/t78/f01-probe.md): a run is one wall's, so the L's arm on
// the ADJACENT wall stood in no run and offered no plus; the library add beside
// the L tried the L's own wall and its corner side has no room there by
// definition, so `freeSlotOnWall` refused in its own words. The fix is one
// arithmetic, `runs.js cornerLAdjacentSpan` (where arm B ends on the adjacent
// wall), read by the plus (`addPlusPoints`) and by the placement
// (`projectStore.addUnit`): the L occupies the corner square in BOTH walls'
// depth bands and nothing else; the first free slot on wall B begins at the end
// of arm B, on wall A at the end of arm A; the corner stop for both runs is the
// L's own arm end.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { addPlusPoints, cornerLAdjacentSpan } from '../src/engine/runs.js';
import { roomWalls, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const walls = () => roomWalls(S().project.room);
const GAP = P.room.wallBackClearance;

function room() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}

test('F1 · the L on wall 0 (left hand) is arm B on wall 3: its end stands gap + depth from the corner', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const u = U(l);
  assert.deepEqual([u.position.wall, u.position.x_mm, u.params.corner_side], [0, GAP, 'left']);
  const adj = cornerLAdjacentSpan(u, walls(), P);
  assert.equal(adj.wall, 3, 'the wall BEFORE wall 0 runs into this corner');
  assert.equal(adj.side, 'left', 'arm B occupies the END of wall 3, so the free side is the left');
  assert.equal(adj.right, 3000 - GAP, 'the L stands its wall gap off wall 0, which is wall 3\'s end');
  assert.equal(adj.left, 3000 - GAP - 900, 'and its depth along wall 3');
  assert.equal(adj.x_mm, adj.left);
  assert.equal(adj.armMm, P.baseUnit.defaults.depth, 'the arm is the family\'s depth');
});

test('F1 · the plus points: one on wall 0 to the right of arm A, one on wall 3 at the end of arm B, none in the corner', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const points = addPlusPoints(S().units, { walls: walls() }, P);
  const mine = points.filter((p) => p.unitId === l);
  assert.equal(mine.length, 2, JSON.stringify(points));
  const a = mine.find((p) => p.wall === 0);
  const b = mine.find((p) => p.wall === 3);
  assert.deepEqual([a.side, a.x_mm], ['right', GAP + 900], 'wall A: the run\'s own plus at the arm A end');
  assert.deepEqual([b.side, b.x_mm, b.corner, b.mount], ['left', 3000 - GAP - 900, true, 'floor']);
  assert.equal(b.depth_mm, P.baseUnit.defaults.depth, 'the plus stands in front of the ARM');
  assert.ok(b.gap >= P.ui.addPlusMinGapMm);
  assert.equal(mine.some((p) => p.wall === 0 && p.side === 'left'), false, 'the corner side offers nothing on wall A');
});

test('F1 · the plus on wall B, taken: addUnit beside the L on its corner side lands on wall 3, flush with the arm B end', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const point = addPlusPoints(S().units, { walls: walls() }, P).find((p) => p.unitId === l && p.wall === 3);
  const r = S().addUnit('BUD', { near: l, side: point.side });
  assert.ok(r.id, r.error);
  const b = U(r.id);
  assert.equal(b.position.wall, 3, 'it landed on the adjacent wall');
  assert.equal(b.position.x_mm + b.params.width, 3000 - GAP - 900, 'flush with the arm B end, the L\'s own stop');
  // The gesture the library panel sends is `side: 'left'`; the store's own `L`
  // spelling lands in the same place.
  S().removeUnit(r.id);
  const r2 = S().addUnit('BUD', { near: l, side: 'L' });
  assert.ok(r2.id, r2.error);
  assert.deepEqual([U(r2.id).position.wall, U(r2.id).position.x_mm + 600], [3, 3000 - GAP - 900]);
});

test('F1 · the other side of the L is still its own wall: beside it to the right lands on wall 0 at the arm A end', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const r = S().addUnit('BUD', { near: l, side: 'R' });
  assert.ok(r.id, r.error);
  assert.deepEqual([U(r.id).position.wall, U(r.id).position.x_mm], [0, GAP + 900]);
});

test('F1 · once a cabinet stands on wall B the plus moves to ITS free end, and both L pluses go when the gaps are used up', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const b = S().addUnit('BUD', { near: l, side: 'L' }).id;
  let points = addPlusPoints(S().units, { walls: walls() }, P);
  assert.equal(points.some((p) => p.unitId === l && p.wall === 3), false, 'the arm B end is taken');
  const bLeft = points.find((p) => p.unitId === b && p.side === 'left');
  assert.ok(bLeft, 'the new cabinet\'s own left end offers the next plus');
  assert.equal(bLeft.wall, 3);
  // A second one on the same plus lands beside the first.
  const c = S().addUnit('BUD', { near: b, side: 'L' }).id;
  assert.equal(U(c).position.x_mm + 600, U(b).position.x_mm);
  points = addPlusPoints(S().units, { walls: walls() }, P);
  assert.equal(points.filter((p) => p.wall === 3).length, 1, 'wall 3: one plus left, at the far end of the run');
});

test('F1 · the right-hand L (corner at the END of its wall): arm B is on the NEXT wall at its START, the free side is the right', () => {
  room();
  // Two Ls on wall 0: the second takes the right-hand corner.
  S().addUnit('CORNER_L_BASE');
  const l2 = S().addUnit('CORNER_L_BASE').id;
  assert.equal(U(l2).params.corner_side, 'right');
  const adj = cornerLAdjacentSpan(U(l2), walls(), P);
  assert.deepEqual([adj.wall, adj.side, adj.left, adj.right], [1, 'right', GAP, GAP + 900]);
  const r = S().addUnit('BUD', { near: l2, side: 'R' });
  assert.ok(r.id, r.error);
  assert.deepEqual([U(r.id).position.wall, U(r.id).position.x_mm], [1, GAP + 900], 'flush with arm B on wall 1');
});

test('F1 · a wall L carries the same second plus at the wall level, and a base unit does not take it', () => {
  room();
  const l = S().addUnit('CORNER_L_WALL').id;
  const points = addPlusPoints(S().units, { walls: walls() }, P);
  const b = points.find((p) => p.unitId === l && p.wall === 3);
  assert.ok(b, JSON.stringify(points));
  assert.equal(b.mount, 'wall');
  assert.equal(b.x_mm, 3000 - GAP - P.cornerWall.defaults.depth);
  const r = S().addUnit('WUD', { near: l, side: 'L' });
  assert.ok(r.id, r.error);
  assert.deepEqual([U(r.id).position.wall, U(r.id).position.x_mm + U(r.id).params.width], [3, b.x_mm]);
});

test('F1 · a wall named by the caller is never re-aimed: the corner aim is the plus\'s and the library\'s, not a set\'s', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const r = S().addUnit('BUD', { near: l, side: 'L', wall: 0 });
  assert.equal(r.id, null, 'wall 0 named, its corner side has no room: refused in words, as before');
  assert.match(r.error, /no room/);
});

test('F1 · nothing moves for a plain unit, a turned L or a room with one wall', () => {
  room();
  const l = S().addUnit('BUD').id;
  assert.equal(cornerLAdjacentSpan(U(l), walls(), P), null);
  const turned = { ...U(l), type: 'CORNER_L_BASE', position: { ...U(l).position, rotation_deg: 90 } };
  assert.equal(cornerLAdjacentSpan(turned, walls(), P), null);
  assert.equal(cornerLAdjacentSpan(U(l), [], P), null);
});
