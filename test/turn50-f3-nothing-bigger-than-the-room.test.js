// ─── T50 · F3: NOTHING IS BUILT BIGGER THAN THE ROOM ───────────────────────
//
// The owner, 25.08.2026: *"dlaczego pozwala system dodawać top box powyżej
// rozmiaru pokoju? to powinno być blokada."*
//
// CLAUDE.md: *"A unit may not be given a width, a height or a depth that puts
// it outside the room it stands in … The guard sits where the number is
// ACCEPTED (the parameter panel and the size modal), so it can refuse with a
// reason, and the reason names the room's figure … An existing project that
// already contains such a unit opens unchanged and says so in Check, rather
// than being silently resized under the owner's hands."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { unitTop } from '../src/engine/runs.js';
import {
  roomFitRefusal, roomFitFaults, riderBornHeight, headroomMm, floorOf,
} from '../src/engine/roomFit.js';
import { runChecks } from '../src/engine/checks.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const room = (h = 2400, w = 4000, d = 3000) => migrateRoom({ height: h, corners: rectCorners(w, d) });

const wardrobe = (over = {}) => ({
  id: 'w1',
  type: 'WARDROBE',
  params: {
    width: 600, height: 2150, depth: 568, unit_num: '01', ...over,
  },
  position: { wall: 0, x_mm: 0, rotation_deg: 0 },
});

// ─── THE THREE DIMENSIONS ──────────────────────────────────────────────────

test('F3 · a height that does not fit is refused, and the room’s figure is in the sentence', () => {
  const no = roomFitRefusal({
    unit: wardrobe(), patch: { height: 2600 }, room: room(2400), profile: P,
  });
  assert.ok(no, 'refused');
  assert.equal(no.key, 'height');
  assert.match(no.message, /2400 mm/, 'the ROOM’s figure — CLAUDE.md asks for it by name');
  assert.match(no.message, /2600/, 'and what will not fit in it');
  assert.equal(no.limit, 2400 - P.wardrobe.legHeight, 'what is actually left, over its own legs');
});

test('F3 · a height that DOES fit is not refused', () => {
  assert.equal(roomFitRefusal({
    unit: wardrobe(), patch: { height: 2150 }, room: room(2400), profile: P,
  }), null);
  // …and exactly what is left is allowed, to the millimetre.
  const head = headroomMm(wardrobe(), room(2400), P);
  assert.equal(roomFitRefusal({
    unit: wardrobe(), patch: { height: head }, room: room(2400), profile: P,
  }), null, 'the last millimetre still fits');
  assert.ok(roomFitRefusal({
    unit: wardrobe(), patch: { height: head + 1 }, room: room(2400), profile: P,
  }), 'and the one after it does not');
});

test('F3 · a width wider than its WALL is refused, naming the wall', () => {
  const no = roomFitRefusal({
    unit: wardrobe(), patch: { width: 5000 }, room: room(2400, 4000), profile: P,
  });
  assert.ok(no);
  assert.equal(no.key, 'width');
  assert.match(no.message, /wall 1 is 4000 mm/, 'a cabinet is too wide for a WALL, not for a room');
  assert.equal(roomFitRefusal({
    unit: wardrobe(), patch: { width: 3999 }, room: room(2400, 4000), profile: P,
  }), null);
});

test('F3 · a depth deeper than the room reaches is refused', () => {
  const no = roomFitRefusal({
    unit: wardrobe(), patch: { depth: 4000 }, room: room(2400, 4000, 3000), profile: P,
  });
  assert.ok(no);
  assert.equal(no.key, 'depth');
  assert.match(no.message, /3000 mm back from wall 1/);
  assert.equal(roomFitRefusal({
    unit: wardrobe(), patch: { depth: 600 }, room: room(2400, 4000, 3000), profile: P,
  }), null);
});

test('F3 · with no room to measure against, nothing is refused', () => {
  assert.equal(roomFitRefusal({ unit: wardrobe(), patch: { height: 9000 }, room: null, profile: P }), null,
    'a bare computeCabinet and every fixture — a rule with nothing to compare to refuses nothing');
  assert.equal(headroomMm(wardrobe(), { height: 0 }, P), Infinity);
});

// ─── THE OWNER'S OWN CASE: THE TOP BOX ─────────────────────────────────────

test('F3 · a top box is measured from the top of what it stands on', () => {
  const host = wardrobe({ height: 2150 });
  const box = {
    id: 'b1',
    type: 'WARDROBE_TOP',
    params: {
      width: 600, height: 500, depth: 568, unit_num: '02', rides_on: 'w1', mount_height: unitTop(host, P),
    },
    position: { wall: 0, x_mm: 0, rotation_deg: 0 },
  };
  const top = unitTop(host, P);
  assert.equal(floorOf(box, P, { host }), top, 'its floor IS the wardrobe’s top');
  assert.equal(headroomMm(box, room(2500), P, { host }), 2500 - top);

  // 2150 + 100 legs = 2250; a 500 box in a 2500 room is 250 through the ceiling.
  const no = roomFitRefusal({
    unit: box, patch: { height: 500 }, room: room(2500), host, profile: P,
  });
  assert.ok(no, 'and THAT is the owner’s bug, refused');
  assert.match(no.message, /2500 mm/);
  assert.match(no.message, new RegExp(String(Math.round(top))), 'it says what it is standing on');
});

test('F3 · a top box is BORN FITTED rather than born through the ceiling', () => {
  const host = wardrobe({ height: 2150 });
  const box = { type: 'WARDROBE_TOP', params: { height: 500 }, position: {} };
  const born = riderBornHeight({
    unit: box, host, room: room(2500), profile: P, minHeight: P.wardrobe.topBox.minHeight,
  });
  assert.equal(born.refuse, null, 'there is room for a box, just not a 500 one');
  assert.equal(born.height, 2500 - unitTop(host, P), 'so it arrives at what is left');

  // …and where there is not even the type's own minimum, the ADD is refused.
  const tight = riderBornHeight({
    unit: box, host, room: room(2300), profile: P, minHeight: P.wardrobe.topBox.minHeight,
  });
  assert.ok(tight.refuse, 'the "blokada" he asked for');
  assert.match(tight.refuse, /2300 mm/, 'with the room’s figure in it');

  // A box that already fits is not touched at all.
  const roomy = riderBornHeight({
    unit: box, host, room: room(3000), profile: P, minHeight: P.wardrobe.topBox.minHeight,
  });
  assert.equal(roomy.height, null);
  assert.equal(roomy.refuse, null);
});

// ─── AN EXISTING PROJECT OPENS UNCHANGED, AND SAYS SO IN CHECK ─────────────

test('F3 · a saved job that is already too big is REPORTED, never resized', () => {
  const units = [wardrobe({ height: 2600 })];
  const faults = roomFitFaults(units, room(2400), P);
  assert.equal(faults.length, 1);
  assert.equal(faults[0].key, 'height');
  assert.equal(units[0].params.height, 2600, 'and the unit is exactly as it was');

  const findings = runChecks({ units, room: room(2400), profile: P });
  const twenty = findings.filter((f) => f.check === 20);
  assert.equal(twenty.length, 1, 'Check says so — rule #20');
  assert.equal(twenty[0].level, 'red');
  assert.match(twenty[0].message, /2400 mm/, 'with the room’s own figure');
  assert.equal(twenty[0].dimension, 'height');
});

test('F3 · a job that fits raises nothing', () => {
  const findings = runChecks({ units: [wardrobe()], room: room(2400), profile: P });
  assert.deepEqual(findings.filter((f) => f.check === 20), []);
});

test('F3 · one rule answers both halves — a saved fault and a typed number', () => {
  // The fault list is built by asking the REFUSAL about the size a unit already
  // has, so the two can never disagree about what fits.
  const src = readFileSync(new URL('../src/engine/roomFit.js', import.meta.url), 'utf8');
  const faults = src.slice(src.indexOf('export function roomFitFaults'));
  assert.ok(faults.includes('roomFitRefusal('), 'Check asks the guard, not a second copy of it');
});

// ─── THE TWO SURFACES CLAUDE.md NAMES ──────────────────────────────────────

test('F3 · the guard sits at the parameter panel and at the size modal', () => {
  const panel = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  assert.ok(panel.includes('roomFitRefusalFor(unit.id, { [key]: v })'),
    'the parameter panel refuses before the setter');
  assert.ok(panel.includes('data-unit-size-field='), 'and the three fields are findable');

  const modal = readFileSync(new URL('../src/components/UnitSizeModal.jsx', import.meta.url), 'utf8');
  assert.ok(modal.includes('roomFitRefusalFor(unit.id, { [key]: value })'),
    'and so does the size modal');
});

test('F3 · it REFUSES — the clamp is left exactly as it was', () => {
  // `clampUnitHeight` is still what moves a number the APP moved (a project
  // height push, a drag). F3 does not touch it, which is what keeps
  // `test/project-heights.test.js`'s "clamps and reports" honest.
  const collision = readFileSync(new URL('../src/engine/collision.js', import.meta.url), 'utf8');
  assert.ok(collision.includes('export function clampUnitHeight('), 'still there');
  assert.ok(collision.includes("by = 'the ceiling'"), 'and still clamping at the ceiling');
  const guard = readFileSync(new URL('../src/engine/roomFit.js', import.meta.url), 'utf8');
  assert.ok(!/Math\.min\([^)]*head/.test(guard), 'the guard never quietly reduces a typed number');
});

// ─── THE STORE, END TO END ─────────────────────────────────────────────────

const store = () => useProjectStore.getState();

test('F3 · a top box added into a room with no headroom is REFUSED, with the figure', () => {
  store().loadProject({
    id: null, name: 'T50 F3', number: '50', client: 'the owner', room: room(2300), design: {},
  }, []);
  const main = store().addUnit('WARDROBE');
  assert.ok(main.id);
  // 2150 + 100 legs = 2250 in a 2300 room: 50 mm left, and a box needs 200.
  const box = store().addUnit('WARDROBE_TOP');
  assert.equal(box.id, null, 'the add is blocked');
  assert.match(box.error, /2300 mm/, 'and the room’s figure is in the refusal');
});

test('F3 · …and in a room with headroom it is born to fit', () => {
  store().loadProject({
    id: null, name: 'T50 F3b', number: '50', client: 'the owner', room: room(2600), design: {},
  }, []);
  const main = store().addUnit('WARDROBE');
  const box = store().addUnit('WARDROBE_TOP');
  assert.ok(box.id, 'it goes in');
  const host = store().units.find((u) => u.id === main.id);
  const rider = store().units.find((u) => u.id === box.id);
  assert.equal(Number(rider.params.mount_height) + Number(rider.params.height), 2600,
    'and it finishes exactly on the ceiling rather than through it');
  assert.equal(Number(rider.params.mount_height), unitTop(host, P));
});

test('F3 · the panel’s refusal does not write the number', () => {
  store().loadProject({
    id: null, name: 'T50 F3c', number: '50', client: 'the owner', room: room(2400), design: {},
  }, []);
  const main = store().addUnit('WARDROBE');
  const before = store().units.find((u) => u.id === main.id).params.height;
  const no = store().roomFitRefusalFor(main.id, { height: 2600 });
  assert.ok(no, 'the surface is told no');
  assert.match(no.message, /2400 mm/);
  assert.equal(store().units.find((u) => u.id === main.id).params.height, before,
    'and asking the question changed nothing');
});
