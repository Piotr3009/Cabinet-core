// ─── Turn 33, CLAUDE.md F4: mirrors on doors ────────────────────────────────
//
// Per-door: none / inside / outside. A mirror is BONDED, never drilled — the
// whole feature is a meta face for the 3D, a `Mirror W × H` order line at the
// front minus the profile's 20 mm a side (marked, owner to confirm), and NOT
// ONE change to drills, panels or fixtures.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 't33-f4',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design: { projectType: 'wardrobe' },
  }, []);
}

function wardrobeWithDoors(width = 1000) {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width, doors: true });
  const doors = store().unitResult(id).panels.filter((p) => p.part === 'FRONT' && p.role === 'front');
  assert.ok(doors.length >= 1, 'the wardrobe wears doors');
  return { id, doors };
}

test('the margin is ONE profile line, 20 a side, marked owner to confirm', () => {
  assert.equal(P.doors.mirror.marginPerSide, 20);
});

test('an inside mirror stamps the meta, orders the glass, and drills NOTHING', () => {
  const { id, doors } = wardrobeWithDoors();
  const before = store().unitResult(id);

  store().setDoorMirror(id, doors[0].id, 'inside');
  const after = store().unitResult(id);
  const door = after.panels.find((p) => p.id === doors[0].id);

  assert.equal(door.meta.mirror.face, 'inside');
  assert.equal(door.meta.mirror.w, door.w - 2 * P.doors.mirror.marginPerSide);
  assert.equal(door.meta.mirror.h, door.h - 2 * P.doors.mirror.marginPerSide);

  const line = after.hardware.find((h) => h.role === 'mirror');
  assert.ok(line, 'the BOM orders the mirror');
  assert.equal(line.qty, 1, 'one line per mirrored door');
  assert.match(line.spec_label, /^Mirror \d+ × \d+ mm · inside$/);
  assert.equal(line.spec.width_mm, Math.round(door.w - 40));

  assert.equal(JSON.stringify(after.drills), JSON.stringify(before.drills),
    'BONDED, not drilled — the drill set does not move');
  assert.equal(after.panels.length, before.panels.length, 'nothing new is cut');
});

test('outside is outside; none takes it off; a pair may differ leaf by leaf', () => {
  const { id, doors } = wardrobeWithDoors(1000);
  assert.ok(doors.length === 2, 'a 1000 wardrobe wears a pair');

  store().setDoorMirror(id, doors[0].id, 'outside');
  store().setDoorMirror(id, doors[1].id, 'inside');
  let result = store().unitResult(id);
  const faces = result.panels
    .filter((p) => p.meta?.mirror)
    .map((p) => [p.id, p.meta.mirror.face]);
  assert.deepEqual(faces.map(([, f]) => f).sort(), ['inside', 'outside'],
    'each leaf keeps its own answer');
  assert.equal(result.hardware.filter((h) => h.role === 'mirror').length, 2,
    'two doors, two order lines');

  store().setDoorMirror(id, doors[0].id, null);
  store().setDoorMirror(id, doors[1].id, null);
  result = store().unitResult(id);
  assert.ok(!result.panels.some((p) => p.meta?.mirror), 'none means none');
  assert.ok(!result.hardware.some((h) => h.role === 'mirror'), 'nothing ordered');
  assert.equal(store().doorMirrorsOf(id), null, 'an empty map is stored as absence');
});

test('nonsense faces do not survive the store', () => {
  const { id, doors } = wardrobeWithDoors();
  store().setDoorMirror(id, doors[0].id, 'sideways');
  assert.equal(store().doorMirrorsOf(id), null);
});

test('a bare computeCabinet knows nothing of mirrors', () => {
  const bare = computeCabinet({
    type: 'WARDROBE', width: 1000, height: 2200, depth: 568, unit_num: '01', doors: true,
  }, P);
  assert.ok(!bare.panels.some((p) => p.meta?.mirror));
  assert.ok(!bare.hardware.some((h) => h.role === 'mirror'));
});
