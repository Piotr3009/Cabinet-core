/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── THE RECESS MAKES THE CABINET DEEPER (the owner, 15.10.2026) ────────────
//
// The night: *"wneka zrobiona nie pozwala szafkom jakby wpasc w wneke."*  The
// evening, on the mockup: *"front zawsze trzyma sie linii a jak wpada do reces
// to wtedy sie wydluza szafka"*, *"glebszy karkas tak jak proponujesz"*. So a
// cabinet whose whole span stands inside a recess stands against the recess's
// back wall AND is deeper by the recess, its front exactly where it was
// (KIT_RECESS.lsp D1, D2). `params.recess_mm`, `depth` and `depth_full` are
// derived at the store's choke point (settleRecesses); `recess_mm` comes off
// the wall gap in the one helper every placement reads (runs.js wallGapOf).
// Nobody types them. The partly-inside half (the extension) is
// test/recess-extension-1510.test.js.
//
// T79 F10, the owner 18.10.2026: *"jak odsunie od ściany na grubość większą
// niż recess to powinien zlikwidować recess w szafie, lub zmniejszać go
// odsuwaniem od recesu."*  The recess a cabinet takes is the recess less its
// stand-off, the standard ten included: IN below (test/turn79-f10-*).

import test from 'node:test';
import assert from 'node:assert/strict';
import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { backStandoff, unitFootprint } from '../src/engine/collision.js';
import { wallGapOf } from '../src/engine/runs.js';

const S = () => useProjectStore.getState();
const unitOf = (id) => S().units.find((u) => u.id === id);
const frontOf = (u) => backStandoff(u, P) + Number(u.params.depth);
// T79 F10: what a 300 recess gives a cabinet at the standard stand-off.
const IN = 300 - P.room.wallBackClearance;

function kitchenWithRecess() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  // An alcove in the back wall: x 1000 to 2300, 300 deep behind the wall line.
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 1300, depth: 300 });
}

test('wallGapOf: recess_mm comes off the gap, the hand\'s gap and the profile\'s alike; nothing else moves', () => {
  assert.equal(wallGapOf({ params: {} }, P), P.room.wallBackClearance);
  assert.equal(wallGapOf({ params: { recess_mm: 300 } }, P), P.room.wallBackClearance - 300);
  assert.equal(wallGapOf({ params: { wall_gap: 25, recess_mm: 300 } }, P), -275);
  assert.equal(wallGapOf({ params: { wall_gap: 25 } }, P), 25);
  assert.equal(wallGapOf({ params: { recess_mm: -5 } }, P), P.room.wallBackClearance, 'a negative recess is no recess');
  // The footprint follows a negative back inset behind the wall line.
  const wall = roomWalls(rectCorners(4000, 3000))[0];
  const fp = unitFootprint({ wall, x: 1100, width: 600, depth: 858, backInset: -290 });
  assert.deepEqual(fp.map((p) => Math.round(p.y)), [-290, -290, 568, 568], 'the back behind the wall line, the front where a 558 on the wall line has it');
});

test('a cabinet slid wholly into the recess is deeper by it and keeps its front; half across its edge it keeps its depth; out again it is as it was', () => {
  kitchenWithRecess();
  const a = S().addUnit('BUD', { wall: 0, x: 200 });
  assert.equal(a.error, null, a.error);
  const front = frontOf(unitOf(a.id));
  assert.equal(unitOf(a.id).params.recess_mm, undefined);
  assert.equal(backStandoff(unitOf(a.id), P), P.room.wallBackClearance);
  S().moveUnit(a.id, 1100, 1);
  let u = unitOf(a.id);
  assert.equal(u.position.x_mm, 1100);
  assert.equal(u.params.recess_mm, IN, 'inside the recess: the recess less its stand-off deep in (T79 F10)');
  assert.equal(u.params.depth, 558 + IN, 'and that much deeper');
  assert.equal(u.params.depth_full, 558, 'its own depth kept');
  assert.equal(backStandoff(u, P), P.room.wallBackClearance - IN, 'what it takes of the recess comes off the gap (T79 F10)');
  assert.equal(frontOf(u), front, 'THE FRONT HOLDS THE LINE (D1)');
  assert.deepEqual(S().unitResult(a.id).warnings.filter((w) => /OVERLAP|RECESS|EXTENSION/.test(w.code)), []);
  assert.equal(S().unitResult(a.id).panels.find((p) => p.id === 'TOP').h, 558 + IN - 18, 'the kit\'s own depth law: the TOP is D less a board deep (the shelves with it, the owner\'s "glebsze")');
  S().moveUnit(a.id, 1800, 1);
  u = unitOf(a.id);
  assert.equal(u.position.x_mm, 1800, 'a recess is not an obstacle: the cabinet may stand across its edge');
  assert.equal(u.params.recess_mm, undefined, 'half across the edge it is not wholly in');
  assert.equal(u.params.depth, 558);
  assert.equal(u.params.depth_full, undefined);
  assert.equal(frontOf(u), front);
  assert.ok(S().unitResult(a.id).derived.extension, 'it grows an extension instead');
  S().moveUnit(a.id, 1600, 1);
  assert.equal(unitOf(a.id).params.recess_mm, IN);
  assert.equal(unitOf(a.id).params.depth, 558 + IN);
  // The recess removed: the cabinet is back on the wall line at its own depth.
  S().removeWallSlope(S().project.wallSlopes[0].id);
  assert.equal(unitOf(a.id).params.recess_mm, undefined);
  assert.equal(unitOf(a.id).params.depth, 558);
  assert.equal(backStandoff(unitOf(a.id), P), P.room.wallBackClearance);
});

test('a recess on another wall, a shallower recess drawn over the cabinet, and a cabinet with an end panel', () => {
  kitchenWithRecess();
  const b = S().addUnit('BUD', { wall: 1, x: 300 });
  assert.equal(b.error, null, b.error);
  assert.equal(unitOf(b.id).params.recess_mm, undefined, 'the recess is on wall 1 (index 0), this cabinet on the next wall');
  const a = S().addUnit('BUD', { wall: 0, x: 1200 });
  assert.equal(unitOf(a.id).params.recess_mm, IN, 'added inside the recess: in it at once');
  assert.equal(unitOf(a.id).params.depth, 558 + IN);
  // The recess redrawn shallower: the cabinet follows.
  const id = S().project.wallSlopes[0].id;
  S().updateWallSlope(id, { depth: 120 });
  const in120 = 120 - P.room.wallBackClearance;
  assert.equal(unitOf(a.id).params.recess_mm, in120);
  assert.equal(unitOf(a.id).params.depth, 558 + in120);
  // A cabinet whose end panel would stand outside the recess is not wholly in.
  S().moveUnit(a.id, 1000, 1);
  assert.equal(unitOf(a.id).position.x_mm, 1000);
  assert.equal(unitOf(a.id).params.recess_mm, in120, 'flush with the recess edge, no end panel: in');
  S().setUnitInsets(a.id, { left: 20 });
  const moved = unitOf(a.id);
  if (moved.params.inset_left_mm === 20 && moved.position.x_mm < 1020) {
    assert.equal(moved.params.recess_mm, undefined, 'its left inset stands past the recess edge: not wholly in');
    assert.equal(moved.params.depth, 558);
  } else {
    assert.equal(moved.params.recess_mm, in120, 'the inset moved the cabinet along to keep it off the recess wall: still in');
    assert.equal(moved.params.depth, 558 + in120);
  }
});

test('a cabinet in a recess is never at an obstacle too: settleObstacles leaves its depth_full alone', () => {
  kitchenWithRecess();
  const a = S().addUnit('BUD', { wall: 0, x: 1200 });
  assert.equal(unitOf(a.id).params.depth, 558 + IN);
  // The settlers run again on every refresh; the numbers stand.
  S().settleObstacles();
  S().settleRecesses();
  assert.deepEqual([unitOf(a.id).params.depth, unitOf(a.id).params.depth_full, unitOf(a.id).params.recess_mm, unitOf(a.id).params.standoff_mm], [558 + IN, 558, IN, undefined]);
});
