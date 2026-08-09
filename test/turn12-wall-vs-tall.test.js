// ─── Wall units must SEE tall units (turn 12, CLAUDE.md F7) ─────────────────
//
// Owner-verified twice: "a hanging unit ignores tall units completely — it
// drives straight through them and no alignment happens."
//
// One line caused it, and it had been right for eight turns: a unit's obstacles
// were everything at the same MOUNTING LEVEL. A tall unit stands on the floor,
// so it was filed with the base units — and it reaches all the way up through
// the band the wall units hang in. The question is whether two pieces of
// furniture occupy the same HEIGHTS, and that is what is asked now.
//
// The tests below are in two halves: the arithmetic (pure, engine) and the
// behaviour (the store, which is where the owner met the bug).

import test from 'node:test';
import assert from 'node:assert/strict';

import { bandsOverlap, unitBand } from '../src/engine/collision.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

function project() {
  store().loadProject({
    id: null,
    name: 't12-f7',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

// ─── The arithmetic ─────────────────────────────────────────────────────────

test('a band is where a unit starts and where it stops', () => {
  assert.deepEqual(unitBand({ floorY: 100, height: 720 }), { from: 100, to: 820 });
  assert.deepEqual(unitBand({ floorY: 1500, height: 720 }), { from: 1500, to: 2220 });
  assert.deepEqual(unitBand({}), { from: 0, to: 0 });
});

test('a base unit and a wall unit share no height — the old rule, kept', () => {
  const base = unitBand({ floorY: 100, height: 720 });
  const wall = unitBand({ floorY: 1500, height: 720 });
  assert.equal(bandsOverlap(base, wall), false);
  assert.equal(bandsOverlap(wall, base), false);
});

test('a TALL unit and a wall unit do — which is the bug', () => {
  const tall = unitBand({ floorY: 100, height: 2150 });
  const wall = unitBand({ floorY: 1500, height: 720 });
  assert.equal(bandsOverlap(tall, wall), true);
  assert.equal(bandsOverlap(wall, tall), true);
});

test('touching is not overlapping — a kitchen finished flush is not a collision', () => {
  const tall = unitBand({ floorY: 100, height: 1400 });   // top at 1500
  const wall = unitBand({ floorY: 1500, height: 720 });   // starts at 1500
  assert.equal(bandsOverlap(tall, wall, P.editor.levelOverlapMm), false);
  // …but a millimetre INTO it is.
  const lower = unitBand({ floorY: 1498, height: 720 });
  assert.equal(bandsOverlap(tall, lower, P.editor.levelOverlapMm), true);
});

test('bandsOverlap is safe with nothing', () => {
  assert.equal(bandsOverlap(null, unitBand({ floorY: 0, height: 100 })), false);
  assert.equal(bandsOverlap(unitBand({ floorY: 0, height: 100 }), undefined), false);
});

// ─── The behaviour ──────────────────────────────────────────────────────────

/**
 * Put a hanging unit at the left-hand end and a blocker further along, then
 * drive the hanging unit straight at it.
 *
 * The ORDER matters and it is worth saying why: a unit added to the scene is
 * placed in the first free slot, so adding the blocker second puts it beside
 * the mover rather than across the room. Both are then moved explicitly, which
 * is what a joiner does with a mouse.
 */
function driveInto(blockerType) {
  project();
  const wall = store().addUnit('WUD');
  store().moveUnit(wall.id, 0, 0);
  const blocker = store().addUnit(blockerType);
  store().moveUnit(blocker.id, 2500, 0);
  store().moveUnit(wall.id, 5000, 0);          // straight at it, and past it
  return {
    wallRight: unitOf(wall.id).position.x_mm + unitOf(wall.id).params.width,
    blockerLeft: unitOf(blocker.id).position.x_mm,
    wallId: wall.id,
    blockerId: blocker.id,
  };
}

test('a wall unit dragged into a tall unit STOPS at it', () => {
  const { wallRight, blockerLeft } = driveInto('BUDTALL');
  assert.equal(blockerLeft, 2500, 'the tall unit is where it was put');
  assert.ok(
    wallRight <= blockerLeft + 1e-6,
    `the wall unit ended at ${wallRight}, through a tall unit starting at ${blockerLeft}`,
  );
  // …and it stops FLUSH against it rather than somewhere short of it.
  assert.ok(wallRight > blockerLeft - 1, `it stopped ${blockerLeft - wallRight} mm short`);
});

test('…and a BASE unit is still not in a wall unit\'s way', () => {
  const { wallRight, blockerLeft } = driveInto('BUD');
  assert.ok(wallRight > blockerLeft, 'the wall unit hangs over the base unit, as a kitchen does');
});

test('two wall units still stop at each other', () => {
  const { wallRight, blockerLeft } = driveInto('WUD');
  assert.ok(wallRight <= blockerLeft + 1e-6);
});

test('a FRIDGE housing blocks a wall unit too — it is a height, not a label', () => {
  const { wallRight, blockerLeft } = driveInto('FRIDGE');
  assert.ok(wallRight <= blockerLeft + 1e-6);
});

test('a base unit made TALL blocks one, without changing its type', () => {
  // The rule is about the furniture, not about the kit's name. A low cabinet
  // typed up to 2 m is a tall unit as far as a wall unit is concerned.
  const low = driveInto('LOW_CABINET');
  assert.ok(low.wallRight > low.blockerLeft, 'a low cabinet is under the wall units');

  // The wall unit sailed past it and is now on the far side. Type the cabinet
  // up to 2 m and drive the wall unit back: it stops on its right-hand edge.
  store().updateUnitParams(low.blockerId, { height: 2000 });
  const blocker = unitOf(low.blockerId);
  const blockerRight = blocker.position.x_mm + blocker.params.width;
  store().moveUnit(low.wallId, 0, 0);
  assert.ok(
    unitOf(low.wallId).position.x_mm >= blockerRight - 1e-6,
    `now it does — the wall unit reached ${unitOf(low.wallId).position.x_mm}, past ${blockerRight}`,
  );
  assert.ok(unitOf(low.wallId).position.x_mm < blockerRight + 1, 'and it stops flush against it');
});

test('a new wall unit is not placed on top of a tall one either', () => {
  project();
  // Fill the wall with tall units, leaving a slot only at the far end.
  const first = store().addUnit('BUDTALL');
  store().moveUnit(first.id, 0, 0);
  const wall = store().addUnit('WUD');
  const w = unitOf(wall.id);
  const t = unitOf(first.id);
  const overlaps = w.position.x_mm < t.position.x_mm + t.params.width
    && t.position.x_mm < w.position.x_mm + w.params.width;
  assert.equal(overlaps, false, 'the free-slot search saw the tall unit');
});
