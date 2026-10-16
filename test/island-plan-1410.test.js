/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── THE ISLAND PLAN (owner, 14.10.2026; the rectangle is the island, 15.10.2026) ──
//
// *"przy dodaniu wyspy chciałbym żeby był widok z góry i proponowana na
// podłodze plan wyspy ... dopiero jak się wstawi to wtedy pokaże się cała
// wyspa."*  The plan is arithmetic until it is inserted; then it is the same
// island and the same cabinets every other road makes.
//
// 15.10.2026, the owner: *"wstawia mi szafki na zewnatrz wyspy zamiast w
// srodku, to jest za trudne, powinno byc mega latwe."*  So the rectangle on
// the floor is the island's OUTER footprint: the cabinets stand INSIDE it,
// each face's cabinets take a band (the 10 mm gap plus their depth) from
// that edge inward, and T75's core is what they leave in the middle. The
// store still inserts a core and cabinets on its faces; only the numbers
// are derived from the rectangle now.

import test from 'node:test';
import assert from 'node:assert/strict';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners, roomIslands } from '../src/engine/room.js';
import { wallGapOf } from '../src/engine/runs.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { readFileSync } from 'node:fs';
import {
  islandPlanDraft, planCabinets, planClearances, planFaceFree, planCabinet, clearanceLevel,
  planBands, planCore, planCoreRefusal, CORE_MIN_MM, turnCabinet, NEXT_FACE_CLOCKWISE,
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
  const depth = defaultParamsFor('BUD', P).depth;   // 558
  const band = 10 + depth;                          // the wall gap plus the cabinet: 568
  const draft = { ...islandPlanDraft({ room: S().project.room, units: [], profile: P }), d: 1200, cabs: [planCabinet('A', 'BUD', 600), planCabinet('A', 'BUD', 500), planCabinet('E1', 'BUD', 600)] };
  const rows = planCabinets(draft, P);
  assert.deepEqual(rows.map((r) => [r.face, r.x, r.width]), [['A', 0, 600], ['A', 600, 500], ['E1', 0, 600]]);
  // The bands the faces take of the 1800 x 1200 rectangle, and the core they leave.
  assert.deepEqual(planBands(draft, P), { A: band, E1: band, B: 0, E2: 0 });
  const core = planCore(draft, P);
  assert.deepEqual([core.w, core.d, core.cx, core.cy], [1800 - band, 1200 - band, 2000 + band / 2, 1500 + band / 2]);
  // What is free on a face is the core's face: the end's band shortens A and B, A's band shortens the ends.
  assert.equal(planFaceFree(draft, 'A', P), 1800 - band - 1100);
  assert.equal(planFaceFree(draft, 'B', P), 1800 - band);
  assert.equal(planFaceFree(draft, 'E1', P), 1200 - band - 600);
  assert.equal(planFaceFree(draft, 'E2', P), 1200 - band);
  // The cabinets stand INSIDE the rectangle: face A is its top edge (y = 1500 - 600 = 900) and the cabinet's
  // front is on it, its back 558 inward; the E1 cabinet's front is on the left edge (x = 1100).
  const top = 1500 - 600;
  const a = rows[0].poly;
  assert.ok(a.every((p) => p.y >= top - 1e-6 && p.y <= top + depth + 1e-6), `a cabinet on A stands inside the island, front on its edge: ${JSON.stringify(a)}`);
  assert.ok(Math.abs(Math.min(...a.map((p) => p.y)) - top) < 1e-6, 'its front is the island\'s edge');
  const e1 = rows[2].poly;
  assert.ok(Math.abs(Math.min(...e1.map((p) => p.x)) - 1100) < 1e-6, 'the E1 cabinet\'s front is the island\'s left edge');
  assert.ok(e1.every((p) => p.y >= top + band - 1e-6), 'the E1 cabinet stands clear of A\'s band (the corner is nobody\'s)');
  // Overfilling is reported, not hidden.
  const full = { ...draft, cabs: [planCabinet('E2', 'BUD', 600), planCabinet('E2', 'BUD', 600)] };
  assert.equal(planFaceFree(full, 'E2', P), 1200 - 1200);
  assert.equal(planCabinets(full, P)[1].overhang, 0);
  const over = { ...full, cabs: [...full.cabs, planCabinet('E2', 'BUD', 300)] };
  assert.equal(planFaceFree(over, 'E2', P), -300);
  assert.equal(planCabinets(over, P)[2].overhang, 300);
});

test('a rectangle too small for its cabinets is refused in words, never clipped', () => {
  kitchen();
  const band = 10 + defaultParamsFor('BUD', P).depth;
  const draft = islandPlanDraft({ room: S().project.room, units: [], profile: P });   // 1800 x 900
  assert.equal(planCoreRefusal(draft, P), null, 'an empty rectangle is its own core');
  assert.equal(planCoreRefusal({ ...draft, cabs: [planCabinet('A', 'BUD', 600)] }, P), null, `one row leaves ${900 - band} of core`);
  // Two rows back to back need 2 x 568 + the least core.
  const both = { ...draft, cabs: [planCabinet('A', 'BUD', 600), planCabinet('B', 'BUD', 600)] };
  assert.equal(planCore(both, P).d, 900 - 2 * band);
  assert.match(planCoreRefusal(both, P), new RegExp(`900 mm deep; the cabinets on faces A and B need at least ${2 * band + CORE_MIN_MM} mm`));
  assert.equal(planCoreRefusal({ ...both, d: 2 * band + CORE_MIN_MM }, P), null, 'deep enough: accepted');
  assert.equal(planCoreRefusal({ ...both, d: 2 * band + CORE_MIN_MM - 1 }, P)?.length > 0, true, 'a millimetre less: refused');
  // Both ends on a short island.
  const ends = { ...draft, w: 1000, cabs: [planCabinet('E1', 'BUD', 300), planCabinet('E2', 'BUD', 300)] };
  assert.match(planCoreRefusal(ends, P), /1000 mm long; the cabinets on its ends need at least 1186 mm/);
  const all = { ...ends, cabs: [...ends.cabs, ...both.cabs] };
  assert.match(planCoreRefusal(all, P), /^The island is 1000 x 900 mm; its cabinets need at least 1186 x 1186 mm\./);
  // The store refuses the same plan in the same words, and changes nothing.
  const before = JSON.stringify({ units: S().units, room: S().project.room });
  const verdict = S().insertIslandPlan(both);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.message, planCoreRefusal(both, P));
  assert.equal(JSON.stringify({ units: S().units, room: S().project.room }), before);
});

test('clearances: from the island\'s outer edge on each face to the first thing in front of it', () => {
  kitchen();
  const draft = islandPlanDraft({ room: S().project.room, units: [], profile: P });
  const empty = Object.fromEntries(planClearances({ room: S().project.room, units: [], draft, profile: P }).map((c) => [c.face, c]));
  assert.equal(empty.A.mm, 1050, 'the island\'s top edge to the back wall');
  assert.equal(empty.B.mm, 1050, 'the island\'s bottom edge to the front wall');
  assert.equal(empty.E1.mm, 1100);
  assert.equal(empty.E2.mm, 1100);
  assert.match(empty.A.what, /^wall \d/);
  // Since 15.10.2026 the rectangle IS the outer edge: a cabinet on A stands inside it, so the walkway is the same.
  const withA = { ...draft, cabs: [planCabinet('A', 'BUD', 600)] };
  const c = Object.fromEntries(planClearances({ room: S().project.room, units: [], draft: withA, profile: P }).map((x) => [x.face, x]));
  assert.equal(c.A.mm, 1050, 'the cabinet is inside the rectangle: the walkway is the rectangle\'s');
  assert.equal(c.B.mm, 1050, 'the other faces are untouched');
  // A cabinet on the back wall in front of face A is what A now measures to.
  const added = S().addUnit('BUD', { wall: 0, x: 1700 });
  assert.equal(added.error, null, added.error);
  const u = S().units.find((x) => x.id === added.id);
  const near = Object.fromEntries(planClearances({ room: S().project.room, units: S().units, draft, profile: P }).map((x) => [x.face, x]));
  assert.equal(near.A.what, `unit ${u.params.unit_num}`);
  assert.equal(near.A.mm, 1050 - wallGapOf(u, P) - Number(u.params.depth), 'measured to the cabinet\'s front, as it really stands off its wall');
  assert.deepEqual([clearanceLevel(1000), clearanceLevel(950), clearanceLevel(899), clearanceLevel(null)], ['ok', 'tight', 'bad', 'none']);
  // An island dragged INTO that wall unit reads as a negative clearance: an overlap, by how much.
  const pushed = { ...withA, cy: 950 };   // its top edge at y = 500
  const into = Object.fromEntries(planClearances({ room: S().project.room, units: S().units, draft: pushed, profile: P }).map((x) => [x.face, x]));
  // The wall unit's front stands at y = gap + depth; the island's edge at y = 950 - 450.
  const wallFront = wallGapOf(u, P) + Number(u.params.depth);
  assert.ok(into.A.mm < 0, `an overlap reads negative, got ${into.A.mm}`);
  assert.equal(into.A.mm, -(wallFront - 500), 'by exactly the overlap of the two fronts');
  assert.equal(clearanceLevel(into.A.mm), 'bad');
});

test('INSERT builds the island and its cabinets in one go, through the room\'s own roads', () => {
  kitchen();
  assert.equal(S().beginIslandPlan(null).ok, true);
  const plan = UI().islandPlan;
  assert.ok(plan && plan.islandId === null, 'the plan opened as a draft');
  assert.deepEqual(roomIslands(S().project.room), [], 'nothing in the project yet');
  // 1800 x 1100 at (2000, 1600): a row on A and a 450 cabinet on the E2 end.
  UI().setIslandPlan({ cx: 2000, cy: 1600, d: 1100, cabs: [planCabinet('A', 'BUD', 600), planCabinet('A', 'SINK', 600), planCabinet('E2', 'BUD', 450)] });
  const verdict = S().insertIslandPlan(UI().islandPlan);
  assert.equal(verdict.ok, true, verdict.message);
  const islands = roomIslands(S().project.room);
  assert.equal(islands.length, 1);
  // What the room holds is the CORE the rectangle leaves: 568 off the top (A) and off the right end (E2).
  const band = 10 + defaultParamsFor('BUD', P).depth;
  assert.deepEqual([islands[0].cx, islands[0].cy, islands[0].w, islands[0].d], [2000 - band / 2, 1600 + band / 2, 1800 - band, 1100 - band]);
  // And the cabinets' fronts are the rectangle's edges: A's at y = 1600 - 550, E2's at x = 2000 + 900.
  const planned = islandPlanDraft({ room: S().project.room, units: S().units, profile: P, islandId: islands[0].id });
  assert.deepEqual([planned.cx, planned.cy, planned.w, planned.d], [2000, 1600, 1800, 1100], 'the plan of the inserted island is the rectangle that was drawn');
  const onIt = S().units.filter((u) => u.position?.island === islands[0].id);
  assert.deepEqual(onIt.map((u) => [u.type, u.position.face, u.position.x_mm, u.params.width]).sort(),
    [['BUD', 'A', 0, 600], ['BUD', 'E2', 0, 450], ['SINK', 'A', 600, 600]].sort());
  // The cabinets are real: each has its own engine result.
  for (const u of onIt) assert.ok(S().unitResult(u.id).panels.length > 0);
});

test('the plan of an existing island carries its cabinets; APPLY re-places, resizes, strikes and adds', () => {
  kitchen();
  S().beginIslandPlan(null);
  // Two rows back to back: 2 x 568 of bands, so the rectangle is 1200 deep and leaves 64 of core.
  UI().setIslandPlan({ d: 1200, cabs: [planCabinet('A', 'BUD', 600), planCabinet('A', 'BUD', 600), planCabinet('B', 'BUD', 900)] });
  const first = S().insertIslandPlan(UI().islandPlan);
  assert.equal(first.ok, true, first.message);
  const id = roomIslands(S().project.room)[0].id;
  assert.deepEqual([roomIslands(S().project.room)[0].w, roomIslands(S().project.room)[0].d], [1800, 1200 - 2 * (10 + defaultParamsFor('BUD', P).depth)]);
  assert.equal(S().beginIslandPlan(id).ok, true);
  const again = UI().islandPlan;
  assert.equal(again.islandId, id);
  assert.deepEqual([again.w, again.d], [1800, 1200], 'the plan reopens as the rectangle that was drawn');
  assert.deepEqual(again.cabs.map((c) => [c.face, c.w, Boolean(c.unitId)]), [['A', 600, true], ['A', 600, true], ['B', 900, true]]);
  const [struck, second, onB] = again.cabs;
  const kept = S().units.find((u) => u.id === second.unitId);
  // Strike the first on A, widen the second to 800, lengthen the island to 2400, add one more on A.
  const changed = {
    ...again, w: 2400,
    cabs: [{ ...second, w: 800 }, onB, planCabinet('A', 'BUD', 600)],
  };
  const verdict = S().insertIslandPlan(changed);
  assert.equal(verdict.ok, true, verdict.message);
  assert.equal(roomIslands(S().project.room)[0].w, 2400, 'no cabinet on the ends: the core is the rectangle\'s length');
  assert.equal(S().units.some((u) => u.id === struck.unitId), false, 'the struck cabinet is gone');
  const now = S().units.find((u) => u.id === second.unitId);
  assert.deepEqual([now.position.face, now.position.x_mm, now.params.width, now.params.unit_num], ['A', 0, 800, kept.params.unit_num], 'the kept cabinet moved to the start of A, widened, and is still itself');
  const onA = S().units.filter((u) => u.position?.island === id && u.position.face === 'A').sort((a, b) => a.position.x_mm - b.position.x_mm);
  assert.deepEqual(onA.map((u) => [u.position.x_mm, u.params.width]), [[0, 800], [800, 600]]);
});

test('a plan the room refuses changes nothing, and says why', () => {
  kitchen();
  const before = JSON.stringify({ units: S().units, room: S().project.room });
  S().beginIslandPlan(null);
  UI().setIslandPlan({ cx: 3900, cy: 1500 });   // the island would stand through the right wall
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

// ─── 15.10.2026 (evening), the owner: the plan's numbers, the depth, the front, the turn ──
//
// *"liczby przy ustawianiu island nie moge wykasowac istniejacych i nie moge
// zmienic; edycja szafki daj szerokosc na planie ale tez glebokosc; zeby bylo
// wiadomo gdzie jest front, inny kolor krawedzi; daj mozliwosc przekrecania
// szafkami."*

test('a plan cabinet turns onto the next face clockwise, and the rows say which way the front is', () => {
  kitchen();
  assert.deepEqual(NEXT_FACE_CLOCKWISE, { A: 'E2', E2: 'B', B: 'E1', E1: 'A' });
  let cab = planCabinet('A', 'BUD', 600);
  const seen = [cab.face];
  for (let i = 0; i < 4; i += 1) { cab = turnCabinet(cab); seen.push(cab.face); }
  assert.deepEqual(seen, ['A', 'E2', 'B', 'E1', 'A'], 'four turns bring it round');
  assert.equal(turnCabinet(cab).key, cab.key, 'the same cabinet, turned');
  // The depth a plan cabinet carries is its own; the rows say the face's frame so the view can draw the front.
  const draft = { ...islandPlanDraft({ room: S().project.room, units: [], profile: P }), d: 1200, cabs: [{ ...planCabinet('A', 'BUD', 600), depth: 400 }] };
  const [row] = planCabinets(draft, P);
  assert.equal(row.depth, 400, 'its own depth, not the type\'s');
  assert.deepEqual([row.inward.x + 0, row.inward.y], [0, -1], 'face A\'s frame looks away from the core (-y): the cabinet stands that way, its front farthest out');
  // The front edge is poly[2]-poly[3]: the two corners farthest from the core, at the island\'s top edge y = 900.
  assert.ok(Math.abs(row.poly[2].y - 900) < 1e-6 && Math.abs(row.poly[3].y - 900) < 1e-6, JSON.stringify(row.poly));
  assert.deepEqual(planBands(draft, P), { A: 410, E1: 0, B: 0, E2: 0 }, 'the band follows the cabinet\'s own depth');
});

test('the plan window: fields the hand can clear, a depth per cabinet, the front edge in gold, the turn button', () => {
  const view = readFileSync(new URL('../src/3d/IslandPlan.jsx', import.meta.url), 'utf8');
  assert.match(view, /function MmField\(\{ value, min = 50, onCommit, attrs = \{\}/);
  assert.match(view, /onBlur=\{commit\}/);
  assert.match(view, /if \(e\.key === 'Enter'\) \{ e\.preventDefault\(\); e\.currentTarget\.blur\(\); \}/);
  assert.match(view, /if \(e\.key === 'Escape'\) \{ setDraft\(String\(value \?\? ''\)\); setEditing\(false\);/);
  assert.match(view, /attrs=\{\{ 'data-plan-w': '1' \}\}/);
  assert.match(view, /attrs=\{\{ 'data-plan-cab-w': c\.key \}\}/);
  assert.match(view, /attrs=\{\{ 'data-plan-cab-d': c\.key \}\}/, 'a depth field per cabinet');
  assert.match(view, /onCommit=\{\(n\) => changeCab\(c\.key, \{ depth: n \}\)\}/);
  assert.match(view, /data-plan-cab-turn=\{c\.key\}/, 'the turn button');
  assert.match(view, /const turnCab = \(key\) => setPlan\(\{ cabs: plan\.cabs\.map\(\(c\) => \(c\.key === key \? turnCabinet\(c\) : c\)\) \}\);/);
  assert.match(view, /data-plan-cab-front=\{row\.cab\.key\}/, 'the front edge drawn apart');
  // A `path`, not a `line`: a `line` in src/3d could be a scene object and R7 (test/turn23) forbids data-* on one.
  assert.match(view, /d=\{`M\$\{X\(row\.poly\[2\]\.x\)\} \$\{Y\(row\.poly\[2\]\.y\)\} L\$\{X\(row\.poly\[3\]\.x\)\} \$\{Y\(row\.poly\[3\]\.y\)\}`\}/);
  assert.match(view, /stroke="#E0B35A" strokeWidth="4"/);
});
