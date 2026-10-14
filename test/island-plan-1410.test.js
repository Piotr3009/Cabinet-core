// ─── THE ISLAND PLAN (owner, 14.10.2026) ────────────────────────────────────
//
// *"przy dodaniu wyspy chciałbym żeby był widok z góry i proponowana na
// podłodze plan wyspy ... dopiero jak się wstawi to wtedy pokaże się cała
// wyspa."*  The plan is arithmetic until it is inserted; then it is the same
// island and the same cabinets every other road makes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners, roomIslands } from '../src/engine/room.js';
import { wallGapOf } from '../src/engine/runs.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  islandPlanDraft, planCabinets, planClearances, planFaceFree, planCabinet, clearanceLevel,
} from '../src/engine/islandPlan.js';

const S = () => useProjectStore.getState();
const UI = () => useUiStore.getState();

function kitchen() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  UI().closeIslandPlan();
}

test('a new plan opens where newIsland would stand the island, with no cabinets', () => {
  kitchen();
  const draft = islandPlanDraft({ room: S().project.room, units: S().units, profile: P, islandId: null });
  assert.deepEqual([draft.islandId, draft.cx, draft.cy, draft.w, draft.d, draft.rotation, draft.cabs], [null, 2000, 1500, 1800, 900, 0, []]);
});

test('plan cabinets stand on their face in list order, each against the one before; the face says what is free', () => {
  kitchen();
  const draft = { ...islandPlanDraft({ room: S().project.room, units: [], profile: P }), cabs: [planCabinet('A', 'BUD', 600), planCabinet('A', 'BUD', 800), planCabinet('E1', 'BUD', 600)] };
  const rows = planCabinets(draft, P);
  assert.deepEqual(rows.map((r) => [r.face, r.x, r.width]), [['A', 0, 600], ['A', 600, 800], ['E1', 0, 600]]);
  assert.equal(planFaceFree(draft, 'A'), 400);
  assert.equal(planFaceFree(draft, 'B'), 1800);
  assert.equal(planFaceFree(draft, 'E1'), 300);
  // Face A runs along the top edge of the core (y = 1050) and its cabinets stand ABOVE it, 10 mm off.
  const a = rows[0].poly;
  assert.ok(a.every((p) => p.y <= 1050 - 10 + 1e-6), 'a cabinet on A stands outside the core, 10 mm off its face');
  // Overfilling is reported, not hidden.
  const full = { ...draft, cabs: [planCabinet('E2', 'BUD', 600), planCabinet('E2', 'BUD', 600)] };
  assert.equal(planFaceFree(full, 'E2'), -300);
  assert.equal(planCabinets(full, P)[1].overhang, 300);
});

test('clearances: from the island\'s outer edge on each face to the first thing in front of it', () => {
  kitchen();
  const draft = islandPlanDraft({ room: S().project.room, units: [], profile: P });
  const empty = Object.fromEntries(planClearances({ room: S().project.room, units: [], draft, profile: P }).map((c) => [c.face, c]));
  assert.equal(empty.A.mm, 1050, 'the core\'s top edge to the back wall');
  assert.equal(empty.B.mm, 1050, 'the core\'s bottom edge to the front wall');
  assert.equal(empty.E1.mm, 1100);
  assert.equal(empty.E2.mm, 1100);
  assert.match(empty.A.what, /^wall \d/);
  // A base unit on face A reaches the wall gap plus its depth beyond the core: the walkway shrinks by that.
  const withA = { ...draft, cabs: [planCabinet('A', 'BUD', 600)] };
  const c = Object.fromEntries(planClearances({ room: S().project.room, units: [], draft: withA, profile: P }).map((x) => [x.face, x]));
  assert.equal(c.A.mm, 1050 - 10 - defaultParamsFor('BUD', P).depth);
  assert.equal(c.B.mm, 1050, 'the other faces are untouched');
  // A cabinet on the back wall in front of face A is what A now measures to.
  const added = S().addUnit('BUD', { wall: 0, x: 1700 });
  assert.equal(added.error, null, added.error);
  const u = S().units.find((x) => x.id === added.id);
  const near = Object.fromEntries(planClearances({ room: S().project.room, units: S().units, draft, profile: P }).map((x) => [x.face, x]));
  assert.equal(near.A.what, `unit ${u.params.unit_num}`);
  assert.equal(near.A.mm, 1050 - wallGapOf(u, P) - Number(u.params.depth), 'measured to the cabinet\'s front, as it really stands off its wall');
  assert.deepEqual([clearanceLevel(1000), clearanceLevel(950), clearanceLevel(899), clearanceLevel(null)], ['ok', 'tight', 'bad', 'none']);
  // A plan cabinet on A standing INTO that wall unit reads as a negative clearance: an overlap, by how much.
  const into = Object.fromEntries(planClearances({ room: S().project.room, units: S().units, draft: withA, profile: P }).map((x) => [x.face, x]));
  // The wall unit's front stands at y = gap + depth; the plan cabinet's front at y = 1050 - 10 - depth.
  const wallFront = wallGapOf(u, P) + Number(u.params.depth);
  const planFront = 1050 - 10 - defaultParamsFor('BUD', P).depth;
  assert.ok(into.A.mm < 0, `an overlap reads negative, got ${into.A.mm}`);
  assert.equal(into.A.mm, -(wallFront - planFront), 'by exactly the overlap of the two fronts');
  assert.equal(clearanceLevel(into.A.mm), 'bad');
});

test('INSERT builds the island and its cabinets in one go, through the room\'s own roads', () => {
  kitchen();
  assert.equal(S().beginIslandPlan(null).ok, true);
  const plan = UI().islandPlan;
  assert.ok(plan && plan.islandId === null, 'the plan opened as a draft');
  assert.deepEqual(roomIslands(S().project.room), [], 'nothing in the project yet');
  UI().setIslandPlan({ cx: 2000, cy: 1600, cabs: [planCabinet('A', 'BUD', 600), planCabinet('A', 'SINK', 600), planCabinet('E2', 'BUD', 450)] });
  const verdict = S().insertIslandPlan(UI().islandPlan);
  assert.equal(verdict.ok, true, verdict.message);
  const islands = roomIslands(S().project.room);
  assert.equal(islands.length, 1);
  assert.deepEqual([islands[0].cx, islands[0].cy, islands[0].w, islands[0].d], [2000, 1600, 1800, 900]);
  const onIt = S().units.filter((u) => u.position?.island === islands[0].id);
  assert.deepEqual(onIt.map((u) => [u.type, u.position.face, u.position.x_mm, u.params.width]).sort(),
    [['BUD', 'A', 0, 600], ['BUD', 'E2', 0, 450], ['SINK', 'A', 600, 600]].sort());
  // The cabinets are real: each has its own engine result.
  for (const u of onIt) assert.ok(S().unitResult(u.id).panels.length > 0);
});

test('the plan of an existing island carries its cabinets; APPLY re-places, resizes, strikes and adds', () => {
  kitchen();
  S().beginIslandPlan(null);
  UI().setIslandPlan({ cabs: [planCabinet('A', 'BUD', 600), planCabinet('A', 'BUD', 600), planCabinet('B', 'BUD', 900)] });
  assert.equal(S().insertIslandPlan(UI().islandPlan).ok, true);
  const id = roomIslands(S().project.room)[0].id;
  assert.equal(S().beginIslandPlan(id).ok, true);
  const again = UI().islandPlan;
  assert.equal(again.islandId, id);
  assert.deepEqual(again.cabs.map((c) => [c.face, c.w, Boolean(c.unitId)]), [['A', 600, true], ['A', 600, true], ['B', 900, true]]);
  const [first, second, onB] = again.cabs;
  const kept = S().units.find((u) => u.id === second.unitId);
  // Strike the first on A, widen the second to 800, lengthen the island, add one on E1.
  const changed = {
    ...again, w: 2400,
    cabs: [{ ...second, w: 800 }, onB, planCabinet('E1', 'BUD', 600)],
  };
  const verdict = S().insertIslandPlan(changed);
  assert.equal(verdict.ok, true, verdict.message);
  assert.equal(roomIslands(S().project.room)[0].w, 2400);
  assert.equal(S().units.some((u) => u.id === first.unitId), false, 'the struck cabinet is gone');
  const now = S().units.find((u) => u.id === second.unitId);
  assert.deepEqual([now.position.face, now.position.x_mm, now.params.width, now.params.unit_num], ['A', 0, 800, kept.params.unit_num], 'the kept cabinet moved to the start of A, widened, and is still itself');
  const e1 = S().units.filter((u) => u.position?.island === id && u.position.face === 'E1');
  assert.deepEqual(e1.map((u) => [u.position.x_mm, u.params.width]), [[0, 600]]);
});

test('a plan the room refuses changes nothing, and says why', () => {
  kitchen();
  const before = JSON.stringify({ units: S().units, room: S().project.room });
  S().beginIslandPlan(null);
  UI().setIslandPlan({ cx: 3900, cy: 1500 });   // the core would stand through the right wall
  const verdict = S().insertIslandPlan(UI().islandPlan);
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /outside the room|through a wall/i);
  assert.equal(JSON.stringify({ units: S().units, room: S().project.room }), before, 'the project is as it was');
  UI().closeIslandPlan();
});

test('the plan window pauses the room and the hidden flag is per island, session only', () => {
  kitchen();
  assert.equal(UI().islandPlan, null);
  assert.deepEqual(UI().hiddenIslands, {});
  UI().toggleIslandHidden('island_x');
  assert.deepEqual(UI().hiddenIslands, { island_x: true });
  UI().toggleIslandHidden('island_x');
  assert.deepEqual(UI().hiddenIslands, {});
});
