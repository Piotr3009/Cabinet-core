import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateDesign, projectHeights, heightForGroup, isCustomHeight } from '../src/engine/design.js';
import { HEIGHT_GROUPS, UNIT_TYPE_ORDER, getUnitType, heightGroupOf } from '../src/engine/types.js';
import { clampUnitHeight } from '../src/engine/collision.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
// Turn 24 (CLAUDE.md F3.1): no thickness, no drawers — the gate, opened.
import { confirmDrawerBox } from './drawer-box-gate.js';

// ─── Project heights (BACKLOG #29, turn 5 F3) ───
//
// A workshop builds a whole kitchen to ONE set of heights. Before this, every
// unit arrived at whatever its AutoLISP kit shipped with, and matching a run
// meant retyping the same number into every cabinet.
//
// The rule: a new unit INHERITS the project height for its kind; a height typed
// into the panel is a deliberate exception and is marked custom; changing a
// project height carries every non-custom unit with it, clamped by the room.

const store = () => useProjectStore.getState();

function project(design = {}) {
  store().loadProject({
    id: null,
    name: 'heights',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 4000) }),
    design,
  }, []);
}

function add(type) {
  const { id, error } = store().addUnit(type);
  assert.equal(error, null, error || '');
  return id;
}

const unitOf = (id) => store().units.find((u) => u.id === id);

// ─── the numbers themselves ───

test('an untouched project builds to the profile heights', () => {
  const h = projectHeights(migrateDesign(null), P);
  assert.equal(h.base, 770);
  assert.equal(h.wall, 720);
  assert.equal(h.tall, 2150);
  assert.equal(h.wallMount, 1500);
  assert.equal(h.toeKick, 100);
  assert.equal(h.toeKick, P.baseUnit.legHeight, 'the toe kick IS the leg height');
});

test('a project that has set one keeps it; the rest still come from the profile', () => {
  const h = projectHeights({ heights: { base: 735 } }, P);
  assert.equal(h.base, 735);
  assert.equal(h.tall, 2150);
});

test('every unit type either has a height group or says why not', () => {
  const known = new Set(HEIGHT_GROUPS.map((g) => g.id));
  for (const id of UNIT_TYPE_ORDER) {
    const group = heightGroupOf(id);
    if (group == null) {
      // The two types without one, and both on purpose: a low cabinet built to
      // the 720 mm base height is a base unit with another name, and an OVEN
      // BASE's height is set by the appliance in it — its shelf is 598 mm from
      // the TOP of the carcass, so a kitchen's base height is not what decides
      // it (turn 17, CLAUDE.md F10).
      // T36 F7: …and the TOP BOX, on purpose too — it is a small carcass that
      // rides on a main, and its height is the joiner's own answer to "what is
      // left between the wardrobe and the ceiling". No project default may set
      // it, which is exactly what `heightGroup: null` says.
      assert.ok(['LOW_CABINET', 'OVEN_BASE', 'WARDROBE_TOP'].includes(id), `${id} has no height group and no reason`);
      continue;
    }
    assert.ok(known.has(group), `${id} points at a group that does not exist: ${group}`);
  }
  assert.equal(heightForGroup(null, migrateDesign(null), P), null);
  assert.equal(heightForGroup('tall', migrateDesign(null), P), 2150);
});

// ─── inheritance ───

test('a new unit is built to the project height for its KIND', () => {
  project({ heights: { base: 735, wall: 700, tall: 2200, wallMount: 1450, toeKick: 120 } });

  assert.equal(unitOf(add('BUD')).params.height, 735);
  confirmDrawerBox();
  assert.equal(unitOf(add('BUDR')).params.height, 735);
  assert.equal(unitOf(add('SINK')).params.height, 735);
  assert.equal(unitOf(add('BUDTALL')).params.height, 2200);
  assert.equal(unitOf(add('WARDROBE')).params.height, 2200);

  const wall = unitOf(add('WUD'));
  assert.equal(wall.params.height, 700);
  // Turn 8 (CLAUDE.md F5): there are TALL units on this wall already, so the
  // wall unit hangs level with their tops rather than at the project's mount
  // height — a run whose wall units stop short of the tall cabinet beside them
  // reads as two kitchens. 2200 carcass + 120 toe kick, less its own 700.
  assert.equal(wall.params.mount_height, 2200 + 120 - 700, 'lined up with the tall unit beside it');

  // The one that keeps its own: a low cabinet is low by definition.
  assert.equal(unitOf(add('LOW_CABINET')).params.height, P.lowCabinet.defaults.height);
});

test('with no tall unit beside it, a wall unit hangs where the project says', () => {
  project({ heights: { wall: 700, wallMount: 1450 } });
  const wall = unitOf(add('WUD'));
  assert.equal(wall.params.mount_height, 1450);
});

test('the toe kick reaches the legs, the plinth and the floor drop', () => {
  project({ heights: { toeKick: 140 } });
  const id = add('BUD');
  const unit = unitOf(id);
  assert.equal(unit.params.leg_height, 140);

  const r = computeCabinet(paramsForEngine(unit), P);
  assert.equal(r.assemblies.carcass.legHeight, 140);
  assert.equal(r.assemblies.legs.height, 140);

  store().addPlinth(id);
  const withPlinth = computeCabinet(paramsForEngine(unitOf(id)), P);
  assert.equal(withPlinth.panels.find((p) => p.id === 'PLINTH').h, 140,
    'the plinth is as tall as the legs it hides');
});

test('a unit placed before a height was set still follows the profile', () => {
  project();
  assert.equal(unitOf(add('BUD')).params.height, P.projectHeights.base);
  assert.equal(unitOf(add('WARDROBE')).params.height, P.projectHeights.tall);
});

// ─── override, and the way back ───

test('typing a height marks the unit custom, and the project stops moving it', () => {
  project();
  const a = add('BUD');
  const b = add('BUD');

  assert.equal(isCustomHeight(unitOf(a)), false);
  store().updateUnitParams(a, { height: 900 });
  assert.equal(unitOf(a).params.height, 900);
  assert.equal(isCustomHeight(unitOf(a)), true, 'a hand-typed height is the exception');

  const { moved } = store().setProjectHeights({ base: 800 });
  assert.equal(unitOf(a).params.height, 900, 'the custom one is left alone');
  assert.equal(unitOf(b).params.height, 800, 'the other follows');
  assert.equal(moved, 1, 'and the count says so out loud');
});

test('reset puts a custom unit back on the project height', () => {
  project({ heights: { base: 735 } });
  const id = add('BUD');
  store().updateUnitParams(id, { height: 900 });
  assert.equal(isCustomHeight(unitOf(id)), true);

  store().resetUnitHeight(id);
  assert.equal(unitOf(id).params.height, 735);
  assert.equal(isCustomHeight(unitOf(id)), false, 'and it follows the project again');

  // …including a later change.
  store().setProjectHeights({ base: 760 });
  assert.equal(unitOf(id).params.height, 760);
});

test('a type with no height group has nothing to reset to', () => {
  project();
  const id = add('LOW_CABINET');
  assert.equal(store().resetUnitHeight(id), null);
  assert.equal(unitOf(id).params.height, P.lowCabinet.defaults.height, 'and is not touched');
});

// ─── the clamp ───

test('a project height that will not fit the room stops at the ceiling', () => {
  assert.deepEqual(
    clampUnitHeight({ height: 2600, floorY: 100, roomHeight: 2500 }),
    { height: 2400, max: 2400, min: 0, blocked: true, by: 'the ceiling' },
  );
  // Room height unknown = nothing to stop it.
  assert.equal(clampUnitHeight({ height: 4000, floorY: 100, roomHeight: 0 }).height, 4000);
  // A type minimum is the other end of the same clamp.
  const low = clampUnitHeight({ height: 800, floorY: 0, roomHeight: 2500, minHeight: 1100 });
  assert.equal(low.height, 1100);
  assert.equal(low.blocked, true);
});

test('pushing a project height through a low ceiling clamps and reports', () => {
  store().loadProject({
    id: null, name: 'low', room: migrateRoom({ height: 2000, corners: rectCorners(6000, 4000) }), design: {},
  }, []);
  const id = add('BUDTALL');
  const { notices } = store().setProjectHeights({ tall: 2400 });

  const unit = unitOf(id);
  const floorY = P.projectHeights.toeKick;
  assert.equal(unit.params.height, 2000 - floorY, 'it goes as far as the room allows');
  assert.equal(isCustomHeight(unit), false, 'clamped is not the same as chosen by hand');
  assert.ok(notices.some((n) => n.includes('Height limited')), 'and it says what stopped it');
});

test('a wall unit follows the mount height without becoming custom', () => {
  project();
  const id = add('WUD');
  store().setProjectHeights({ wallMount: 1600 });
  assert.equal(unitOf(id).params.mount_height, 1600);
  assert.equal(isCustomHeight(unitOf(id)), false);

  const r = computeCabinet(paramsForEngine(unitOf(id)), P);
  assert.equal(r.assemblies.mountHeight, 1600);
});

test('the heights survive a save/load round trip through the design', () => {
  project({ heights: { base: 735, tall: 2200 } });
  const saved = JSON.parse(JSON.stringify(store().project.design));
  const back = migrateDesign(saved);
  assert.equal(back.heights.base, 735);
  assert.equal(back.heights.tall, 2200);
  assert.equal(back.heights.wall, null, 'unset stays unset, so the profile keeps answering for it');
  assert.equal(projectHeights(back, P).wall, P.projectHeights.wall);
});

test('a project height is clamped to what a cabinet can be at all', () => {
  project();
  const { applied } = store().setProjectHeights({ base: 99999, tall: 1 });
  assert.equal(applied.base, P.projectHeights.max);
  assert.equal(applied.tall, P.projectHeights.min);
});

test('the engine still answers a bare params object the way it always did', () => {
  // Nothing above may change what computeCabinet() does when nobody passes a
  // leg height — the golden fixtures are that promise, and this says it here
  // too, next to the feature that could have broken it.
  const bare = computeCabinet({ type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01' }, P);
  assert.equal(bare.assemblies.carcass.legHeight, P.baseUnit.legHeight);
  const wardrobe = computeCabinet({ type: 'WARDROBE', width: 600, height: 2150, depth: 578, unit_num: 'W01' }, P);
  assert.equal(wardrobe.assemblies.carcass.legHeight, P.wardrobe.legHeight);
  assert.equal(getUnitType('WUD').legs, false);
});