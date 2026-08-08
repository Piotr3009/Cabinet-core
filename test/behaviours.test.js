// ─── Two behaviours (turn 8, CLAUDE.md F5) ───
//
// Neither reaches the cut list. Both are the difference between a tool that
// draws a kitchen and one that behaves like a kitchen.
//
//   1. A DOOR WITH A WALL ON ITS HINGE SIDE STOPS SQUARE. The geometry is the
//      surprising part: a door does not hit the wall on the way OUT, it hits it
//      on the way PAST 90°, because its free edge crosses back over the hinge.
//      So 90° is not a rounded-down guess — it is exactly the last angle at
//      which a door of any width, beside a gap of any size, is still travelling
//      away from the wall.
//
//   2. A WALL UNIT PLACED BESIDE A TALL ONE LINES UP WITH ITS TOP. A run whose
//      wall units stop 80 mm short of the tall cabinet next to them reads as
//      two kitchens. It is a starting point, not a rule: the field stays
//      editable.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { doorOpenAngle, mountHeightAlignedWith } from '../src/engine/doors.js';
import { unitBase, unitTop } from '../src/engine/runs.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const DEG = 180 / Math.PI;
const deg = (rad) => Math.round(rad * DEG * 100) / 100;

function project(design = {}) {
  store().loadProject({
    id: null,
    name: 'behaviours',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 4000) }),
    design,
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const add = (type) => {
  const { id, error } = store().addUnit(type);
  assert.equal(error, null, error || '');
  return id;
};

// ─── the door ───────────────────────────────────────────────────────────────

test('a door with nothing beside it opens the full swing', () => {
  const angle = doorOpenAngle({ doorWidth: 597, hingeOffset: 1.5, gapToWall: null }, P);
  assert.equal(deg(angle), P.doors.openAngle);
});

test('a door with a WALL on its hinge side stops square', () => {
  // The 10 mm from F3 is what is actually beside it, and it changes nothing:
  // any gap narrower than the door itself gives the same answer.
  for (const gap of [0, P.room.wallBackClearance, 20, 60]) {
    const angle = doorOpenAngle({ doorWidth: 597, hingeOffset: 1.5, gapToWall: gap }, P);
    assert.equal(deg(angle), P.doors.openAngleAtWall, `gap ${gap}`);
  }
});

test('…and never further than the wall, whatever the profile says', () => {
  // A workshop that sets openAngleAtWall to 120 does not get a door through a
  // wall: the full swing is still the ceiling on the answer.
  const flat = { ...P, doors: { ...P.doors, openAngle: 80, openAngleAtWall: 120 } };
  assert.equal(deg(doorOpenAngle({ doorWidth: 597, gapToWall: 10 }, flat)), 80);
});

test('a gap wider than the door is not a wall at all — the door is free', () => {
  // At 900 mm clear, a 597 mm door never reaches the plaster: the free edge
  // only travels one door width back past the hinge.
  const angle = doorOpenAngle({ doorWidth: 597, hingeOffset: 1.5, gapToWall: 900 }, P);
  assert.equal(deg(angle), P.doors.openAngle);
});

test('the geometry, checked the long way round', () => {
  // x(θ) = hingeX + w·cos θ. At the angle this returns, the free edge must not
  // have crossed the wall — which for a capped door means it is still short of
  // it, and for a free one means it never gets there.
  const w = 597;
  const hingeX = 1.5;
  for (const gap of [0, 10, 60, 300, 900]) {
    const angle = doorOpenAngle({ doorWidth: w, hingeOffset: hingeX, gapToWall: gap }, P);
    const freeEdge = hingeX + w * Math.cos(angle);
    assert.ok(freeEdge >= -gap - 1e-6, `gap ${gap}: the free edge is ${freeEdge} mm past the wall`);
  }
});

test('the wall gap the view asks for is a WALL, not a neighbour', () => {
  project({ infill: { sideWidth: 0 } });
  const a = add('BUD');
  store().moveUnit(a, -5000, 0);
  const b = store().addUnit('BUD', { near: a, side: 'R' }).id;

  assert.equal(store().wallGapsFor(a).left, P.room.wallBackClearance, 'a real wall, at the real distance');
  assert.equal(store().wallGapsFor(a).right, null, 'a neighbour is not a wall');
  assert.equal(store().wallGapsFor(b).left, null);
  assert.ok(store().wallGapsFor(b).right > 0, 'and the far end of the wall still is');
});

// ─── the wall unit and the tall unit ────────────────────────────────────────

test('the mounting height that lines two units up', () => {
  assert.equal(mountHeightAlignedWith({ tallTop: 2250, unitHeight: 720 }), 1530);
  // A wall unit taller than the tall cabinet cannot line up with it, and says
  // so rather than hanging below the floor.
  assert.equal(mountHeightAlignedWith({ tallTop: 600, unitHeight: 720 }), null);
  // …nor through the ceiling.
  assert.equal(mountHeightAlignedWith({ tallTop: 2600, unitHeight: 720, roomHeight: 2500 }), null);
});

test('a wall unit placed beside a tall one hangs level with its top', () => {
  project();
  const tall = add('BUDTALL');
  const wall = add('WUD');
  const top = unitTop(unitOf(tall), P);
  assert.equal(unitOf(wall).params.mount_height + unitOf(wall).params.height, top);
});

test('…and it is a STARTING POINT: the field still moves it', () => {
  project();
  add('BUDTALL');
  const wall = add('WUD');
  store().updateUnitParams(wall, { mount_height: 1400 });
  assert.equal(unitOf(wall).params.mount_height, 1400);
});

test('with no tall unit on that wall it hangs at the project height', () => {
  project();
  add('BUD');
  const wall = add('WUD');
  assert.equal(unitOf(wall).params.mount_height, P.projectHeights.wallMount);
});

test('a tall unit on ANOTHER wall does not decide where this one hangs', () => {
  project();
  const tall = add('BUDTALL');
  store().setUnitWall(tall, 1);
  const wall = add('WUD');
  assert.equal(unitOf(wall).params.mount_height, P.projectHeights.wallMount);
});

// ─── the toe kick that never reached the top ────────────────────────────────

test('a unit’s top is measured from its OWN toe kick, not the profile’s', () => {
  // Found by F5: a project on a 120 mm kick lined its wall units up 20 mm low,
  // because unitTop() read the profile's leg height and ignored the one turn 5
  // pushed onto the unit. Everything that asks "how high is the top of this"
  // was out by the same 20 mm — which units are one run, and how much room is
  // left above one for a top infill.
  const unit = { type: 'BUDTALL', params: { height: 2200, leg_height: 120 } };
  assert.equal(unitBase(unit, P), 120);
  assert.equal(unitTop(unit, P), 2320);
  // …and with nothing set, the profile's, exactly as before.
  assert.equal(unitBase({ type: 'BUDTALL', params: { height: 2200 } }, P), P.baseUnit.legHeight);
  assert.equal(unitBase({ type: 'WARDROBE', params: {} }, P), P.wardrobe.legHeight);
  assert.equal(unitBase({ type: 'WUD', params: { mount_height: 1500 } }, P), 1500);
});
