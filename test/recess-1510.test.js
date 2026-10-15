// ─── THE RECESS TAKES THE CABINET IN (the owner, 15.10.2026) ────────────────
//
// *"wneka zrobiona nie pozwala szafkom jakby wpasc w wneke."*  A recess is room
// behind the wall line; a cabinet whose whole span stands inside one stands
// against the recess's own back wall. `params.recess_mm` is derived at the
// store's choke point (settleRecesses) and comes off the wall gap in the one
// helper every placement reads (runs.js wallGapOf). Nobody types it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { backStandoff, unitFootprint } from '../src/engine/collision.js';
import { wallGapOf } from '../src/engine/runs.js';

const S = () => useProjectStore.getState();
const unitOf = (id) => S().units.find((u) => u.id === id);

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
  const fp = unitFootprint({ wall, x: 1100, width: 600, depth: 558, backInset: -290 });
  assert.deepEqual(fp.map((p) => Math.round(p.y)), [-290, -290, 268, 268]);
});

test('a cabinet slid wholly into the recess stands against its back wall; half across its edge it stays on the wall line; out again it loses the number', () => {
  kitchenWithRecess();
  const a = S().addUnit('BUD', { wall: 0, x: 200 });
  assert.equal(a.error, null, a.error);
  assert.equal(unitOf(a.id).params.recess_mm, undefined);
  assert.equal(backStandoff(unitOf(a.id), P), P.room.wallBackClearance);
  S().moveUnit(a.id, 1100, 1);
  assert.equal(unitOf(a.id).position.x_mm, 1100);
  assert.equal(unitOf(a.id).params.recess_mm, 300, 'inside the recess: 300 deep in');
  assert.equal(backStandoff(unitOf(a.id), P), P.room.wallBackClearance - 300, 'the same gap off the recess\'s back wall the wall gets');
  assert.deepEqual(S().unitResult(a.id).warnings.filter((w) => /OVERLAP|RECESS/.test(w.code)), []);
  S().moveUnit(a.id, 1800, 1);
  assert.equal(unitOf(a.id).position.x_mm, 1800, 'a recess is not an obstacle: the cabinet may stand across its edge');
  assert.equal(unitOf(a.id).params.recess_mm, undefined, 'half across the edge it cannot go in: on the wall line');
  S().moveUnit(a.id, 1600, 1);
  assert.equal(unitOf(a.id).params.recess_mm, 300);
  // The recess removed: the cabinet is back on the wall line.
  S().removeWallSlope(S().project.wallSlopes[0].id);
  assert.equal(unitOf(a.id).params.recess_mm, undefined);
  assert.equal(backStandoff(unitOf(a.id), P), P.room.wallBackClearance);
});

test('a recess on another wall, a shallower recess drawn over the cabinet, and a cabinet with an end panel', () => {
  kitchenWithRecess();
  const b = S().addUnit('BUD', { wall: 1, x: 300 });
  assert.equal(b.error, null, b.error);
  assert.equal(unitOf(b.id).params.recess_mm, undefined, 'the recess is on wall 1 (index 0), this cabinet on the next wall');
  const a = S().addUnit('BUD', { wall: 0, x: 1200 });
  assert.equal(unitOf(a.id).params.recess_mm, 300, 'added inside the recess: in it at once');
  // The recess redrawn shallower: the cabinet follows.
  const id = S().project.wallSlopes[0].id;
  S().updateWallSlope(id, { depth: 120 });
  assert.equal(unitOf(a.id).params.recess_mm, 120);
  // A cabinet whose end panel would stand outside the recess stays on the wall line.
  S().moveUnit(a.id, 1000, 1);
  assert.equal(unitOf(a.id).position.x_mm, 1000);
  assert.equal(unitOf(a.id).params.recess_mm, 120, 'flush with the recess edge, no end panel: in');
  S().setUnitInsets(a.id, { left: 20 });
  const moved = unitOf(a.id);
  if (moved.params.inset_left_mm === 20 && moved.position.x_mm < 1020) {
    assert.equal(moved.params.recess_mm, undefined, 'its left inset stands past the recess edge: out');
  } else {
    assert.equal(moved.params.recess_mm, 120, 'the inset moved the cabinet along to keep it off the recess wall: still in');
  }
});
