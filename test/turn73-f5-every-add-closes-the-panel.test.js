// ─── TURN 73 · F5 · THE PANEL LEAVES ON EVERY ADD, NOT ONLY THE PLUS ───────
//
// The owner, 23.09.2026, testing T72 point 5:
//
//   *"jak dodasz przyciskiem plusikiem to działa, ale jak z menu EXTRAS /
//   another wardrobe, to nie działa, pokazuje panel."*
//
// The plus calls `adapter.addBesidePlus`, EXTRAS `ADD ANOTHER WARDROBE` calls
// `adapter.addFirstWardrobe`. Both are asserted here, through the adapter the
// buttons call, so a third button can be added to this list and checked.

import test from 'node:test';
import assert from 'node:assert/strict';

import { rectCorners } from '../src/engine/room.js';
import { setWardrobeEndPanelAuto } from '../src/engine/endPanelAuto.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const S = () => useProjectStore.getState();

function aClientRoom(wall = 4000) {
  setWardrobeEndPanelAuto(true);
  S().newProject();
  S().setRoom({ corners: rectCorners(wall, 3000), height: 2500 });
  return A.addFirstWardrobe();
}

const unit = (id) => S().units.find((u) => u.id === id);
const panelsOn = (id) => (unit(id)?.params?.end_panels || [])
  .map((ep) => (ep.side === 'R' ? 'R' : 'L')).sort();
const right = (id) => (Number(unit(id).position.x_mm) || 0) + (Number(unit(id).params.width) || 0);

test('T73 F5 · the first wardrobe stands at the wall start with a panel on its free end', () => {
  const a = aClientRoom();
  assert.ok(a);
  assert.deepEqual(panelsOn(a), ['R']);
});

test('T73 F5 · EXTRAS ADD ANOTHER WARDROBE: the panel between them is gone and they meet flush', () => {
  const a = aClientRoom();
  const b = A.addFirstWardrobe();
  assert.ok(b, 'the add refused');
  assert.notEqual(a, b);
  assert.deepEqual(panelsOn(a), [], 'the facing panel survived the EXTRAS add');
  assert.deepEqual(panelsOn(b), ['R']);
  assert.equal(Number(unit(b).position.x_mm), right(a), 'the new wardrobe stands one board out');
});

test('T73 F5 · the PLUS still does the same (T72 F5 kept)', () => {
  const a = aClientRoom();
  const r = A.addBesidePlus({ unitId: a, side: 'right' });
  assert.equal(r.ok, true, r.said);
  assert.deepEqual(panelsOn(a), []);
  assert.deepEqual(panelsOn(r.id), ['R']);
});

test('T73 F5 · EXTRAS on a wall with no room on the right goes to the left of the first', () => {
  const a = aClientRoom(3000);
  // Put the first wardrobe at the far right end of the wall.
  S().moveUnit(a, 3000, 1);
  const b = A.addFirstWardrobe();
  assert.ok(b, 'the add refused');
  assert.ok(Number(unit(b).position.x_mm) < Number(unit(a).position.x_mm), 'it did not go to the left');
  assert.deepEqual(panelsOn(a), [], 'the facing panel on the left survived');
  assert.deepEqual(panelsOn(b), ['L']);
  assert.equal(right(b), Number(unit(a).position.x_mm), 'not flush');
});

test('T73 F5 · the second wardrobe arrives with its doors on, as the first does', () => {
  aClientRoom();
  const b = A.addFirstWardrobe();
  const doors = (unit(b).params?.sections?.[0]?.items || []).filter((i) => i?.kind === 'door');
  const firstDoors = (S().units[0].params?.sections?.[0]?.items || []).filter((i) => i?.kind === 'door');
  assert.equal(doors.length, firstDoors.length);
});

test('T73 F5 · cornice all or none: a neighbour with no cornice gives the new one none', () => {
  const a = aClientRoom();
  S().setCornice(a, 0);
  assert.equal(Number(unit(a).params.cornice) || 0, 0);
  const b = A.addFirstWardrobe();
  assert.equal(Number(unit(b).params.cornice) || 0, 0, 'the run is mixed');
});

test('T73 F5 · cornice all or none: a neighbour with a cornice gives the new one the same', () => {
  const a = aClientRoom();
  const h = Number(unit(a).params.cornice) || 0;
  assert.ok(h > 0, 'the first wardrobe was born without its cornice');
  const b = A.addFirstWardrobe();
  assert.equal(Number(unit(b).params.cornice) || 0, h);
});
