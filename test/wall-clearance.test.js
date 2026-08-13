// ─── Ten millimetres off the wall, every unit (turn 8, CLAUDE.md F3) ───
//
// Piotr's two reasons, in his order: walls are never straight, and a wall unit
// hangs on brackets that stand it off anyway. So this is not a clearance
// anybody asks for per cabinet — it is a fact about how this workshop builds,
// and it belongs in the profile beside every other such fact.
//
// It is SEPARATE from `params.inset_back_mm` (turn 7), which is a decision
// about ONE cabinet with a pipe behind it, and the two add up.
//
// What makes this a phase rather than a constant is everything that has to
// follow it: where the unit is drawn, what the distance arrows read, how deep
// an end panel is cut, how far a mitred return has to run to reach the wall,
// how deep the unit may be before it hits the far wall, and what a drag stops
// at beside a wall when there is no scribe filler configured.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { backStandoff, unitPlanSpan, wallClearance } from '../src/engine/collision.js';
import { migrateRoom, rectCorners, roomWalls } from '../src/engine/room.js';
import { buildTopView } from '../src/engine/drawings/views.js';
import { buildUnitCard } from '../src/engine/drawings/unitCard.js';

const store = () => useProjectStore.getState();
const GAP = P.room.wallBackClearance;
const WALL = 4000;
const DEPTH = 3000;

function project(infillWidth = 20) {
  store().loadProject({
    id: null,
    name: 'clearance',
    room: migrateRoom({ height: 2500, corners: rectCorners(WALL, DEPTH) }),
    design: { infill: { sideWidth: infillWidth } },
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);

// ─── the number itself ──────────────────────────────────────────────────────

test('the clearance is a profile number, and it is 10 mm', () => {
  assert.equal(P.room.wallBackClearance, 10);
  assert.equal(wallClearance(P), 10);
  // A workshop that builds to something else changes ONE number, and it
  // survives being saved and reloaded.
  const other = migrateCabinetProfile({ ...P, room: { wallBackClearance: 25 } });
  assert.equal(wallClearance(other), 25);
  // …and a profile saved before turn 8 gets the default rather than a crash.
  const ancient = migrateCabinetProfile({ ...P, room: undefined });
  assert.equal(wallClearance(ancient), 10);
});

test('EVERY type stands off the wall — base, wall and tall alike', () => {
  for (const type of ['BUD', 'WUD', 'BUDTALL', 'WARDROBE', 'SINK', 'LOW_CABINET', 'FRIDGE', 'BUDR']) {
    assert.equal(backStandoff({ type, params: {} }, P), GAP, `${type} is standing on the wall`);
  }
});

test('a deliberate inset ADDS to it, rather than replacing it', () => {
  // The 40 mm is for a pipe. The 10 mm is because the wall is not flat. Both
  // are true at once, so the cabinet is 50 mm off the wall.
  const unit = { type: 'BUD', params: { inset_back_mm: 40 } };
  assert.equal(backStandoff(unit, P), GAP + 40);
});

// ─── where the unit actually is ─────────────────────────────────────────────

test('the plan puts the carcass 10 mm into the room, not on the wall', () => {
  project();
  const id = store().addUnit('BUD').id;
  const walls = roomWalls(store().project.room);
  const span = unitPlanSpan({
    wall: walls[0],
    x: unitOf(id).position.x_mm,
    width: unitOf(id).params.width,
    depth: unitOf(id).params.depth,
    backInset: backStandoff(unitOf(id), P),
  });
  assert.equal(span.near, GAP, 'the back of the carcass');
  assert.equal(span.far, GAP + unitOf(id).params.depth, 'and the front of it');
});

test('the depth a unit may grow to is measured from where it stands', () => {
  project();
  const id = store().addUnit('BUD').id;
  const { applied, notices } = store().updateUnitParams(id, { depth: DEPTH });
  // The room is 3000 deep; the unit starts 10 into it, so 2990 is all there is.
  assert.equal(applied.depth, DEPTH - GAP);
  assert.ok(notices.some((n) => /Depth limited/.test(n)));
});

// ─── the pieces that have to reach the wall ─────────────────────────────────

test('an end panel is cut deep enough to reach the wall behind it', () => {
  project();
  const id = store().addUnit('BUD').id;
  store().setDoors(id, { count: 1, hinge: 'L' });
  store().addEndPanel(id, { side: 'R' });
  const unit = unitOf(id);
  const ep = resultOf(id).panels.find((p) => p.part === 'END-PANEL');
  const door = resultOf(id).panels.find((p) => p.part === 'FRONT');

  assert.equal(ep.box.z, -GAP, 'it starts AT the wall');
  assert.equal(ep.box.z + ep.box.d, door.box.z + door.box.d, 'and finishes flush with the door');
  assert.equal(ep.w, GAP + unit.params.depth + P.doors.gap + unit.params.front_t);
});

test('a deliberate inset DOES lengthen the end panel — it still reaches the wall', () => {
  // ─── TURN 28 (CLAUDE.md F9): THE OWNER OVERRULES TURN 8 ON THIS ───────────
  //
  // Turn 8 kept the two apart on the reasoning that the wall clearance is empty
  // air a masking panel should cross, while a 40 mm inset holds a soil pipe and
  // running the panel back into it runs it into the thing the cabinet was moved
  // away from.
  //
  // The owner's F9 says otherwise, and he is right about which is the common
  // case: the field moves a whole RUN off the wall, and an end panel that stops
  // short leaves a slot down the side of the run at eye level — the very fault
  // the wall-clearance line above was written to fix, back again the moment the
  // number gets bigger than ten millimetres. "Every end panel in that run
  // deepens automatically so it always reaches the wall."
  project();
  const id = store().addUnit('BUD').id;
  store().addEndPanel(id, { side: 'R' });
  const before = resultOf(id).panels.find((p) => p.part === 'END-PANEL').w;
  store().setUnitInsets(id, { back: 40 });
  const after = resultOf(id).panels.find((p) => p.part === 'END-PANEL').w;
  assert.equal(after, before + 40, 'deeper by exactly the inset');
  // …and it still STARTS at the wall and finishes flush with the door, which is
  // the invariant the number is in service of.
  const ep = resultOf(id).panels.find((p) => p.part === 'END-PANEL');
  const door = resultOf(id).panels.find((p) => p.part === 'FRONT');
  assert.equal(ep.box.z, -(GAP + 40), 'it starts AT the wall, past the inset');
  if (door) assert.equal(ep.box.z + ep.box.d, door.box.z + door.box.d);
});

test('a mitred return runs to the wall, not to the back of the carcass', () => {
  project();
  const id = store().addUnit('BUDTALL').id;
  store().moveUnit(id, 1500, 0);            // out in the room, both ends open
  store().addTopInfill(id);
  const unit = unitOf(id);
  const ret = resultOf(id).panels.find((p) => p.meta?.segment === 'return-left' && p.meta?.piece === 'face');
  assert.ok(ret, 'an open end turns the corner');
  assert.equal(ret.w, GAP + unit.params.depth + P.doors.gap + unit.params.front_t);
});

// ─── the drawing says so ────────────────────────────────────────────────────

test('the top view draws the wall, with the gap to it', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const view = buildTopView(r, { unitNum: '01', profile: P });
  // In the plan the back of the carcass is at y = depth; the wall is one
  // clearance beyond it.
  const wall = view.entities.find((e) => e.kind === 'line' && Math.abs(e.y1 - (558 + GAP)) < 1e-9);
  assert.ok(wall, 'no wall line — the plan would show the cabinet standing on nothing');
  assert.equal(wall.y1, wall.y2, 'and it is a wall, not a diagonal');
});

test('the production card puts a NUMBER on the gap', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const card = buildUnitCard(r, { profile: P, unitNum: '01', project: { name: 'x' } });
  // 10 mm at 1:10 is a millimetre on paper: the line alone reads as an error,
  // and the number is what makes it a decision the fitter can act on.
  const said = card.entities.some((e) => e.kind === 'text' && String(e.text).includes(String(GAP)));
  assert.ok(said, 'the 10 mm is drawn but never stated');
});

// ─── the side wall, with the infill off ─────────────────────────────────────

test('with no scribe filler a unit still stops short of the SIDE wall', () => {
  project(0);
  const id = store().addUnit('BUD').id;
  store().moveUnit(id, -5000, 0);
  assert.equal(unitOf(id).position.x_mm, GAP);
  store().moveUnit(id, 99999, 0);
  assert.equal(unitOf(id).position.x_mm, WALL - unitOf(id).params.width - GAP);
});

test('a real infill width still wins — it is bigger, and it is a piece', () => {
  project(40);
  const id = store().addUnit('BUD').id;
  store().moveUnit(id, -5000, 0);
  assert.equal(unitOf(id).position.x_mm, 40);
  assert.equal(unitOf(id).params.side_infill_left_mm, 40, 'and the filler appears, as it has since turn 4');
});

test('with the infill off, the 10 mm gap is a scribe and NOT a filler', () => {
  project(0);
  const id = store().addUnit('BUD').id;
  store().moveUnit(id, -5000, 0);
  assert.equal(unitOf(id).params.side_infill_left_mm, 0,
    'a 10 mm stop is the wall clearance, not a piece anybody cuts');
  assert.equal(resultOf(id).panels.filter((p) => p.part === 'INFILL').length, 0);
});
