/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F1 . THE L'S ARM IS A NEIGHBOUR (CLAUDE.md T86B law 1). The owner, 30.10.2026 (22:26): *"jak mamy szafy
// dochodzace do L shape szafy to liczy infill a nie powinien"*. Arm B of a Corner L on the adjacent wall is, to the
// run that ends against it, a cabinet side: no side infill, no wall gap, the corner stop the arm's end. One
// arithmetic (runs.js cornerArmStandIns, the stand-in of cornerLAdjacentSpan's span) read by the plus, the side
// infill (projectStore.refreshAutoParts) and the share-out (shareOut.js runFor). Tested through the store, the way
// the client clicks: the L added, the cabinet added on the plus at the arm's end.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { addPlusPoints, cornerArmStandIns, cornerLAdjacentSpan } from '../src/engine/runs.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { roomWalls, rectCorners } from '../src/engine/room.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const walls = () => roomWalls(S().project.room);
const GAP = P.room.wallBackClearance;

function room() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}

const infillPanels = (unit) => computeCabinet(paramsForEngine(unit, S().project.design), P).panels
  .filter((p) => /INFILL/.test(String(p.id)) || p.role === 'side_infill');

/** The L in the left corner of wall 0 and a cabinet added on the plus at its arm's end on wall 3. */
function lAndNeighbour(lType, type) {
  room();
  const l = S().addUnit(lType).id;
  const point = addPlusPoints(S().units, { walls: walls() }, P).find((p) => p.unitId === l && p.corner);
  assert.ok(point, 'the plus at the arm B end');
  const b = S().addUnit(type, { near: l, side: point.side });
  assert.ok(b.id, b.error);
  return { l, b: b.id, adj: cornerLAdjacentSpan(U(l), walls(), P) };
}

for (const [lType, type] of [['CORNER_L_BASE', 'BUD'], ['CORNER_L_WARDROBE', 'WARDROBE']]) {
  test(`F1 . ${lType}: a ${type} at the arm's end on wall 3 meets it as a unit, no infill toward the arm`, () => {
    const { b, adj } = lAndNeighbour(lType, type);
    const u = U(b);
    assert.equal(u.position.wall, 3);
    assert.equal(u.position.x_mm + u.params.width, adj.left, 'flush with the arm B end, the corner stop');
    assert.equal(u.params.side_infill_right_mm, 0, 'no infill toward the arm');
    // The run's end there is a UNIT: the stand-in of the arm stands in the run's neighbours at that level.
    const standIns = cornerArmStandIns(S().units, 3, 'floor', walls(), P);
    assert.equal(standIns.length, 1);
    assert.deepEqual([standIns[0].position.x_mm, standIns[0].params.width], [adj.left, adj.right - adj.left]);
    // A PINNED filler toward the arm is a decision that cannot invent a gap: a neighbour closes the side.
    // (Before tonight the pin stretched it across the whole arm to the wall, 900 mm and more.)
    const pinned = S().setSideInfillPinned(b, 'R', true);
    assert.equal(pinned, 0, 'the pinned side reads 0: the arm is a neighbour, not the wall');
    assert.equal(infillPanels(U(b)).filter((p) => /R/.test(String(p.id))).length, 0, 'no infill board at that end');
    // The share-out sees the arm as the run's right boundary: the leftover is at the wall end, nothing reserved
    // at the arm, and the run is laid out up to the arm's end and not into it.
    const view = S().shareOutView(b);
    if (view?.span) {
      assert.equal(view.span.side, 'left', 'the leftover is the wall end, not the arm');
    }
    const c = S().addUnit(type, { near: b, side: 'L' }).id;
    const r = S().shareOutRun(b);
    assert.equal(r.ok, true, r.message);
    const last = U(b);
    assert.equal(last.position.x_mm + last.params.width, adj.left, 'shared out up to the arm, not into it');
    assert.equal(last.params.side_infill_right_mm, 0);
    assert.equal(U(c).position.x_mm, U(c).params.side_infill_left_mm, 'the wall end keeps its filler: the infill is the wall\'s');
    assert.ok(U(c).params.side_infill_left_mm > 0);
  });
}

test('F1 . the mirror: an L in the right corner of wall 0, a BUD on wall 1 at its arm\'s end', () => {
  room();
  S().addUnit('CORNER_L_BASE');
  const l2 = S().addUnit('CORNER_L_BASE').id;
  assert.equal(U(l2).params.corner_side, 'right');
  const adj = cornerLAdjacentSpan(U(l2), walls(), P);
  assert.equal(adj.wall, 1);
  const b = S().addUnit('BUD', { near: l2, side: 'R' }).id;
  assert.deepEqual([U(b).position.wall, U(b).position.x_mm], [1, adj.right]);
  assert.equal(U(b).params.side_infill_left_mm, 0);
  assert.equal(S().setSideInfillPinned(b, 'L', true), 0, 'a pin toward the arm cannot invent a gap');
  assert.equal(cornerArmStandIns(S().units, 1, 'floor', walls(), P).length, 1);
  const c = S().addUnit('BUD', { near: b, side: 'R' }).id;
  assert.equal(S().shareOutRun(b).ok, true);
  assert.equal(U(b).position.x_mm, adj.right, 'shared out from the arm\'s end, not from the wall');
  assert.ok(U(c).position.x_mm > adj.right);
});

test('F1 . a wall L and a WUD: the arm stands in at the wall level only', () => {
  room();
  const l = S().addUnit('CORNER_L_WALL').id;
  const adj = cornerLAdjacentSpan(U(l), walls(), P);
  const w = S().addUnit('WUD', { near: l, side: 'L' }).id;
  assert.equal(U(w).position.x_mm + U(w).params.width, adj.left);
  assert.equal(S().setSideInfillPinned(w, 'R', true), 0);
  assert.equal(cornerArmStandIns(S().units, 3, 'wall', walls(), P).length, 1);
  assert.equal(cornerArmStandIns(S().units, 3, 'floor', walls(), P).length, 0, 'a base run does not meet a wall arm');
});

test('F1 . a unit on wall 3 that does NOT reach the arm keeps its gap and its plus, as today', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const adj = cornerLAdjacentSpan(U(l), walls(), P);
  const b = S().addUnit('BUD', { near: l, side: 'L' }).id;
  S().moveUnit(b, 500);
  assert.equal(U(b).position.x_mm, 500);
  assert.equal(U(b).params.side_infill_right_mm, 0);
  const points = addPlusPoints(S().units, { walls: walls() }, P);
  const toArm = points.find((p) => p.unitId === b && p.side === 'right');
  assert.ok(toArm, 'the plus between the BUD and the arm stays');
  assert.equal(toArm.gap, adj.left - 1100, 'the gap to the arm\'s end');
  const lPlus = points.find((p) => p.unitId === l && p.corner);
  assert.ok(lPlus, 'and the L\'s own plus at its arm end');
});
