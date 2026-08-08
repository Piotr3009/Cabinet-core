// ─── Two of Piotr's seven (turn 8, CLAUDE.md F2.1 and F2.2) ───
//
// F2.1 is the one CLAUDE.md marks NAJWAŻNIEJSZY, and the report is two
// sentences: a new unit always lands to the RIGHT of the existing ones, and it
// cannot then be dragged left.
//
// The second sentence is not a bug and must not be "fixed". A unit butted hard
// against its neighbour has nowhere to go left, and a clamp that let it pass
// through the neighbour would be a far worse bug than the one being reported —
// turn 3 phase 4 closed exactly that off. The tests below hold that line
// deliberately, because the tempting fix breaks it.
//
// The bug is the FIRST sentence. `freeSlotOnWall` knew one direction, so the
// left-hand end of a run was unreachable BY ANY ROUTE: not by adding (always
// right), not by dragging (blocked, correctly). Turn 8 gives the placement a
// unit to work beside and the nearest free slot on EITHER side of it.
//
// F2.2 is smaller and just as invisible: the hinge side lives in two places and
// the engine reads the other one.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { freeSlotOnWall, freeSlots } from '../src/engine/collision.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const WALL = 4000;

function project(infillWidth = 0) {
  store().loadProject({
    id: null,
    name: 'slots',
    room: migrateRoom({ height: 2500, corners: rectCorners(WALL, 3000) }),
    design: { infill: { sideWidth: infillWidth } },
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const xs = () => store().units.map((u) => u.position.x_mm).sort((a, b) => a - b);

// ─── the free stretches of a wall ───────────────────────────────────────────

test('a wall with one unit in the middle has room on both sides of it', () => {
  const slots = freeSlots([{ left: 1700, right: 2300 }], {
    wallMin: 0, wallMax: WALL - 600, width: 600, clearance: 0,
  });
  assert.equal(slots.length, 2);
  assert.deepEqual(slots[0], { from: 0, to: 1100 }, 'left of it: a unit may start anywhere up to butting on');
  assert.deepEqual(slots[1], { from: 2300, to: 3400 }, 'and right of it');
});

test('a gap too narrow for the unit is not a slot at all', () => {
  const slots = freeSlots([{ left: 0, right: 600 }, { left: 1000, right: 1600 }], {
    wallMin: 0, wallMax: WALL - 600, width: 600, clearance: 0,
  });
  // The 400 mm hole between them cannot take a 600 mm cabinet.
  assert.ok(slots.every((s) => !(s.from >= 600 && s.to <= 1000)));
  assert.ok(slots.some((s) => s.from === 1600), 'the room to the right of the pair is');
});

// ─── placing beside a unit ──────────────────────────────────────────────────

const beside = (spans, near, side = null) => freeSlotOnWall({
  width: 600, wallWidth: WALL, others: spans, near, side,
}, P);

test('with a unit named, a new one lands on the nearest free side of IT', () => {
  const spans = [{ left: 1700, right: 2300 }, { left: 2300, right: 2900 }];
  // Beside the LEFT-hand unit, the free side is its left — which is the whole
  // of Piotr's bug: before turn 8 this answered 2900, every time, for ever.
  assert.equal(beside(spans, { left: 1700, right: 2300 }), 1100);
  // Beside the RIGHT-hand one, the free side is its right.
  assert.equal(beside(spans, { left: 2300, right: 2900 }), 2900);
});

test('room on both sides is a tie, and a tie still grows the run rightwards', () => {
  const spans = [{ left: 1700, right: 2300 }];
  assert.equal(beside(spans, { left: 1700, right: 2300 }), 2300,
    '"add, add, add" is the turn-1 behaviour and is kept');
});

test('a SIDE can be named, and it is obeyed even when the other side is nearer', () => {
  const spans = [{ left: 1700, right: 2300 }];
  assert.equal(beside(spans, { left: 1700, right: 2300 }, 'L'), 1100);
  assert.equal(beside(spans, { left: 1700, right: 2300 }, 'R'), 2300);
});

test('a side with no room refuses, rather than quietly using the other one', () => {
  // A unit hard against the left wall has nothing on its left.
  const spans = [{ left: 0, right: 600 }];
  assert.equal(beside(spans, { left: 0, right: 600 }, 'L'), null);
  assert.equal(beside(spans, { left: 0, right: 600 }, 'R'), 600);
});

test('a new unit goes NEXT TO something, never adrift in the middle of a gap', () => {
  // 4 m of wall, one unit at 1700. Both answers butt onto something: the
  // neighbour, or the end of the wall.
  const spans = [{ left: 1700, right: 2300 }];
  assert.equal(beside(spans, { left: 1700, right: 2300 }, 'L'), 1100, 'butted onto the neighbour');
  const far = freeSlotOnWall({
    width: 600, wallWidth: WALL, others: spans, near: { left: 0, right: 0 },
  }, P);
  assert.equal(far, 0, 'and beside a point at the wall, butted onto the wall');
});

test('naming nobody is the old behaviour, exactly', () => {
  const spans = [{ left: 1700, right: 2300 }];
  assert.equal(freeSlotOnWall({ width: 600, wallWidth: WALL, others: spans }, P), 2300);
  assert.equal(freeSlotOnWall({ width: 600, wallWidth: WALL, others: [] }, P), 1700, 'an empty wall centres it');
});

// ─── through the store ──────────────────────────────────────────────────────

test('adding beside the LEFTMOST unit builds the run leftwards', () => {
  project();
  const first = store().addUnit('BUD').id;
  const second = store().addUnit('BUD', { near: first }).id;
  assert.deepEqual(xs(), [1700, 2300], 'the second butts onto the first, as it always did');

  // Now work beside the FIRST one, which has a neighbour on its right.
  const third = store().addUnit('BUD', { near: first }).id;
  assert.deepEqual(xs(), [1100, 1700, 2300]);
  assert.equal(unitOf(third).position.x_mm, 1100);

  // …and keep going: each new unit is placed beside the one before it.
  store().addUnit('BUD', { near: third });
  assert.deepEqual(xs(), [500, 1100, 1700, 2300]);
  assert.ok(second);
});

test('"on the left" is a thing that can be asked for, and refused with a reason', () => {
  project();
  const first = store().addUnit('BUD').id;
  // Hard against the left-hand end of the wall — which since turn 8 (F3) means
  // the wall clearance, not zero: a cabinet does not stand on a bowed wall.
  store().moveUnit(first, -5000, 0);
  const stop = P.room.wallBackClearance;
  assert.equal(unitOf(first).position.x_mm, stop);

  const left = store().addUnit('BUD', { near: first, side: 'L' });
  assert.equal(left.id, null);
  assert.match(left.error, /left of/i, 'and it says which side it could not do');
  assert.match(left.error, /01/, 'and which unit it was asked about');

  const right = store().addUnit('BUD', { near: first, side: 'R' });
  assert.equal(right.error, null);
  assert.equal(unitOf(right.id).position.x_mm, stop + 600);
});

test('a unit butted against its neighbour still cannot be dragged THROUGH it', () => {
  // The half of the report that is not a bug. If this ever passes something
  // other than 1700, the clamp has been "fixed" into letting cabinets overlap.
  project();
  const a = store().addUnit('BUD').id;
  const b = store().addUnit('BUD', { near: a }).id;
  assert.deepEqual(xs(), [1700, 2300]);
  store().moveUnit(b, -5000, 0);
  assert.equal(unitOf(b).position.x_mm, 2300, 'it stops at its neighbour, exactly');
  // …and the one that IS free on its left travels all the way to the wall.
  store().moveUnit(a, -5000, 0);
  assert.equal(unitOf(a).position.x_mm, P.room.wallBackClearance,
    'a free left-hand side is a free road, right down to the stop at the wall');
});

test('with the infill OFF the stop is the wall clearance, not nothing (turn 8, F3)', () => {
  // Piotr's reason for the 10 mm is that walls are never straight. That is as
  // true of the wall BESIDE a run as of the one behind it, so a unit with no
  // scribe filler configured still stops short — it just stops at 10 rather
  // than at a filler width.
  project(0);
  const a = store().addUnit('BUD').id;
  store().moveUnit(a, -5000, 0);
  assert.equal(unitOf(a).position.x_mm, P.room.wallBackClearance);
});

test('with the wall gap set, a free left-hand side stops at the infill, not before', () => {
  project(20);
  const a = store().addUnit('BUD').id;
  store().moveUnit(a, -5000, 0);
  assert.equal(unitOf(a).position.x_mm, 20, 'the stop that makes the scribe filler appear (BACKLOG #15)');
});

// ─── F2.2: the hinge switch ─────────────────────────────────────────────────

const hingeOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);

test('flipping the hinge in the panel really flips the hinge', () => {
  project();
  const id = store().addUnit('BUD').id;
  store().setDoors(id, { count: 1, hinge: 'L' });
  assert.equal(hingeOf(id).params.hinge, 'L');

  // THE BUG: `doors` is an object once doors are fitted, and normalizeParams
  // lets `doors.hinge` override `hinge` — so the panel's switch wrote to a
  // field nothing read and the control did nothing at all.
  store().updateUnitParams(id, { hinge: 'R' });
  assert.equal(unitOf(id).params.hinge, 'R');
  assert.equal(unitOf(id).params.doors.hinge, 'R', 'both places, or the engine reads the stale one');
  assert.equal(hingeOf(id).params.hinge, 'R');
});

test('the flip reaches the 3D door, the drilling and the drawing', () => {
  project();
  const id = store().addUnit('BUD').id;
  store().setDoors(id, { count: 1, hinge: 'L' });

  const before = hingeOf(id);
  assert.deepEqual(before.drillSummary.hinged_sides, ['BUL']);
  assert.equal(before.panels.find((p) => p.part === 'FRONT').meta.hinge, 'L');
  const cupBefore = before.drills.find((d) => d.kind === 'cup');

  store().updateUnitParams(id, { hinge: 'R' });
  const after = hingeOf(id);
  // 1. the carcass side that is drilled for the hinges
  assert.deepEqual(after.drillSummary.hinged_sides, ['BUR']);
  // 2. what the 3D view swings the door about (meta.hinge)
  assert.equal(after.panels.find((p) => p.part === 'FRONT').meta.hinge, 'R');
  // 3. the cup, which moves to the other edge of the door
  const cupAfter = after.drills.find((d) => d.kind === 'cup');
  assert.notEqual(cupBefore.x, cupAfter.x, 'the cup is measured from the hinge edge');
  assert.equal(cupAfter.x, P.hinges.cups.xFromHingeEdge);
});

test('fitting doors with a hinge writes it onto the unit too', () => {
  project();
  const id = store().addUnit('BUD').id;
  store().setDoors(id, { count: 1, hinge: 'R' });
  assert.equal(unitOf(id).params.hinge, 'R', 'the panel’s switch shows what the unit actually has');
});

test('a pair of doors is one of each, whatever the switch says', () => {
  project();
  const id = store().addUnit('BUD').id;
  store().updateUnitParams(id, { width: 900 });
  store().setDoors(id, { count: 2, hinge: 'L' });
  store().updateUnitParams(id, { hinge: 'R' });
  const fronts = hingeOf(id).panels.filter((p) => p.part === 'FRONT');
  assert.deepEqual(fronts.map((f) => f.meta.hinge), ['L', 'R'],
    'two doors hinge outwards from the middle — there is no side to choose');
});
