// ─── Hardware tests ───
//
// The engine counts hardware FROM THE GEOMETRY — quantities, never products.
// Which hinge and what it costs is an assignment the workshop makes against
// its own material list, so these tests check the counts and the aggregation,
// and that none of it leaks into the cutting-list CSV (which stays the LISP
// format: cut parts only).

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet, hingeCentres } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE, migrateCabinetProfile } from '../src/engine/profile.js';
import { buildBom, hardwareDemand, demandCost } from '../src/engine/bom.js';
import { HARDWARE_ROLES, MOCK_MATERIALS } from '../src/stores/materialAssignmentStore.js';

const P = DEFAULT_CABINET_PROFILE;
const WARDROBE = {
  type: 'WARDROBE', width: 600, height: 2150, depth: 578, board_t: 18, front_t: 25,
  front_type: 'S', hinge: 'L', unit_num: 'W01',
};
const roleOf = (r, role) => r.hardware.find((h) => h.role === role);
const run = (p) => computeCabinet({ ...WARDROBE, ...p }, P);

test('every hardware line carries role, qty and spec', () => {
  const r = run({ drawers: 2, shelves: 2, rail: true, rail_offset: 1400 });
  assert.ok(r.hardware.length > 0);
  for (const h of r.hardware) {
    assert.equal(typeof h.role, 'string');
    assert.ok(h.qty > 0, `${h.role} qty`);
    assert.ok(h.unit, `${h.role} unit`);
    assert.equal(typeof h.spec, 'object', `${h.role} spec`);
    assert.ok(HARDWARE_ROLES.some((x) => x.id === h.role), `${h.role} is a known role`);
  }
});

test('hinges = hinges per door × doors, straight off the hinge rule', () => {
  const single = run({ drawers: 0, shelves: 0, rail: false });
  const perDoor = hingeCentres(2150, P.hinges.rules.tall, P).length;
  assert.equal(perDoor, 6);
  assert.equal(roleOf(single, 'hinges').qty, 6);
  assert.equal(roleOf(single, 'hinges').spec.per_door, 6);
  assert.equal(roleOf(single, 'hinges').spec.doors, 1);

  const double = run({ width: 1200, drawers: 0, shelves: 0, rail: false });
  assert.equal(double.derived.doors, 2);
  assert.equal(roleOf(double, 'hinges').qty, 12);

  // No doors yet (they are the last step) → no hinges to buy.
  assert.equal(roleOf(run({ doors: false, drawers: 0, shelves: 0 }), 'hinges'), undefined);
});

test('one runner PAIR per drawer, at the snapped runner length', () => {
  const r = run({ drawers: 3, shelves: 0, rail: false });
  const runners = roleOf(r, 'runner_pairs');
  assert.equal(runners.qty, 3);
  assert.equal(runners.unit, 'pairs');
  assert.equal(runners.spec.length_mm, r.derived.szufDl);
  assert.equal(runners.spec.length_mm, 440, 'a 578 deep wardrobe snaps to the 440 runner');
  assert.equal(runners.qty, r.totals.runner_pairs, 'agrees with the totals block');

  // A deeper carcass snaps up a step, and the spec follows.
  assert.equal(roleOf(run({ depth: 700, drawers: 1, shelves: 0 }), 'runner_pairs').spec.length_mm, 540);
  // Drawers dropped for a too-shallow carcass → nothing to buy.
  assert.equal(roleOf(run({ depth: 460, drawers: 2, shelves: 0 }), 'runner_pairs'), undefined);
});

test('legs come from the profile, and only for a type that has them', () => {
  const w = roleOf(run({ drawers: 0, shelves: 0 }), 'legs');
  assert.equal(w.qty, P.wardrobe.legsPerUnit);
  assert.equal(w.qty, 4);
  assert.equal(w.spec.height_mm, P.wardrobe.legHeight);

  const bud = computeCabinet({ type: 'BUD', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: '01' }, P);
  assert.equal(roleOf(bud, 'legs').qty, P.baseUnit.legsPerUnit);
});

test('the rail is one piece cut to the internal width, and only when fitted', () => {
  const r = run({ drawers: 0, shelves: 0, rail: true, rail_offset: 1400 });
  const rail = roleOf(r, 'rail');
  assert.equal(rail.qty, 1);
  assert.equal(rail.spec.length_mm, r.derived.internal_width);
  assert.equal(rail.spec.length_mm, 564);
  assert.equal(roleOf(run({ drawers: 0, shelves: 0, rail: false }), 'rail'), undefined);
});

test('four shelf pins per shelf, from the profile', () => {
  assert.equal(roleOf(run({ shelves: 3, drawers: 0 }), 'shelf_pins').qty, 3 * P.shelfHoles.pinsPerShelf);
  assert.equal(roleOf(run({ shelves: 3, drawers: 0 }), 'shelf_pins').qty, 12);
  assert.equal(roleOf(run({ shelves: 0, drawers: 0 }), 'shelf_pins'), undefined);

  const sixPin = migrateCabinetProfile({
    ...DEFAULT_CABINET_PROFILE,
    shelfHoles: { ...DEFAULT_CABINET_PROFILE.shelfHoles, pinsPerShelf: 6 },
  });
  const r = computeCabinet({ ...WARDROBE, shelves: 2, drawers: 0 }, sixPin);
  assert.equal(r.hardware.find((h) => h.role === 'shelf_pins').qty, 12);
});

test('hardware is counted from geometry, so it follows a parameter change live', () => {
  const before = run({ shelves: 1, drawers: 1, rail: false });
  const after = run({ shelves: 4, drawers: 3, rail: true, rail_offset: 1400 });
  assert.equal(roleOf(before, 'shelf_pins').qty, 4);
  assert.equal(roleOf(after, 'shelf_pins').qty, 16);
  assert.equal(roleOf(before, 'runner_pairs').qty, 1);
  assert.equal(roleOf(after, 'runner_pairs').qty, 3);
  assert.equal(roleOf(before, 'rail'), undefined);
  assert.equal(roleOf(after, 'rail').qty, 1);
});

// ─── project-level aggregation ───

const entryFor = (id, params) => ({ unit: { id }, result: computeCabinet({ ...WARDROBE, ...params }, P) });

test('the BOM merges hardware across units — on role AND spec', () => {
  const bom = buildBom([
    entryFor('u1', { unit_num: 'W01', drawers: 2, shelves: 2, rail: true, rail_offset: 1400 }),
    entryFor('u2', { unit_num: 'W02', drawers: 1, shelves: 1, rail: false }),
  ]);

  const runners = bom.hardware.filter((h) => h.role === 'runner_pairs');
  assert.equal(runners.length, 1, 'same length → one line');
  assert.equal(runners[0].qty, 3);
  assert.deepEqual(runners[0].units.sort(), ['W01', 'W02']);

  assert.equal(bom.hardware.find((h) => h.role === 'shelf_pins').qty, 12);
  assert.equal(bom.hardware.find((h) => h.role === 'legs').qty, 8);
  assert.equal(bom.hardware.find((h) => h.role === 'rail').qty, 1);
});

test('two runner lengths in one project stay two lines to buy', () => {
  const bom = buildBom([
    entryFor('u1', { unit_num: 'W01', depth: 578, drawers: 2, shelves: 0 }),   // 440
    entryFor('u2', { unit_num: 'W02', depth: 700, drawers: 2, shelves: 0 }),   // 540
  ]);
  const runners = bom.hardware.filter((h) => h.role === 'runner_pairs');
  assert.equal(runners.length, 2, 'different lengths must not be merged into one order line');
  assert.deepEqual(runners.map((r) => r.spec.length_mm).sort((a, b) => a - b), [440, 540]);
  assert.equal(runners.reduce((s, r) => s + r.qty, 0), 4);
});

test('assignment prices hardware by the piece, with no yield applied', () => {
  const bom = buildBom([entryFor('u1', { unit_num: 'W01', drawers: 2, shelves: 2, rail: true, rail_offset: 1400 })]);
  const assignments = {
    hinges: { material_id: 'hw_hinge_soft' },
    runner_pairs: { material_id: 'hw_runner_bb', yield: 1.5 },   // ignored on purpose
    shelf_pins: { material_id: 'hw_shelf_pin' },
  };
  const demand = hardwareDemand(bom, assignments, MOCK_MATERIALS);

  // Costs are rounded to the penny by the engine, like every other money value.
  const money = (v) => Number(v.toFixed(2));

  const hinges = demand.find((d) => d.role === 'hinges');
  assert.equal(hinges.material.id, 'hw_hinge_soft');
  assert.equal(hinges.cost, money(6 * 3.8));

  const runners = demand.find((d) => d.role === 'runner_pairs');
  assert.equal(runners.cost, money(2 * 6.9), 'no yield coefficient on countable hardware');

  // An unassigned role still reports its quantity — it just has no price.
  const legs = demand.find((d) => d.role === 'legs');
  assert.equal(legs.material, null);
  assert.equal(legs.cost, null);
  assert.equal(legs.qty, 4);

  assert.equal(demandCost(demand), money(money(6 * 3.8) + money(2 * 6.9) + money(8 * 0.09)));
  assert.equal(demandCost(hardwareDemand(bom, {}, MOCK_MATERIALS)), null, 'nothing priced → no total');
});

test('every hardware role is offered in the UI, and only hardware materials fit it', () => {
  // A wardrobe covers every role except the wall hangers, which only a wall
  // unit has — so the project has to contain one for the check to mean anything.
  const bom = buildBom([
    entryFor('u1', { unit_num: 'W01', drawers: 2, shelves: 2, rail: true, rail_offset: 1400 }),
    { unit: { id: 'u2' }, result: computeCabinet({ type: 'WUD', width: 600, height: 720, depth: 400, shelves: 1, unit_num: 'WU1' }, P) },
  ]);
  for (const role of HARDWARE_ROLES) {
    assert.ok(bom.hardware.some((h) => h.role === role.id), `${role.id} must be reachable from a real unit`);
  }
  const hardwareMaterials = MOCK_MATERIALS.filter((m) => m.category === 'hardware');
  assert.ok(hardwareMaterials.length >= HARDWARE_ROLES.length, 'the mock list must cover every role');
  for (const m of hardwareMaterials) assert.ok(m.price > 0 && m.unit, `${m.id} needs a unit and a price`);
});

// ─── what hardware must NOT touch ───

test('the cutting-list CSV is unchanged: cut parts only, LISP format', () => {
  const r = run({ drawers: 2, shelves: 2, rail: true, rail_offset: 1400 });
  assert.equal(r.csvLines.length, r.panels.length, 'one row per cut part, nothing else');

  // Every row names a real cut part — so no hardware line can have slipped in.
  // (A substring check would be wrong here: the RAIL-PART *panel* legitimately
  // contains the word "rail".)
  const panelIds = new Set(r.panels.map((p) => p.id));
  for (const l of r.csvLines) {
    const cells = l.split(',');
    assert.equal(cells.length, 7, 'UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM');
    assert.ok(panelIds.has(cells[1]), `CSV row "${l}" does not name a cut part`);
  }
  assert.equal(new Set(r.csvLines.map((l) => l.split(',')[1])).size, r.panels.length, 'every part exactly once');
});

test('hardware does not touch the panel counts or the areas', () => {
  const r = run({ drawers: 2, shelves: 2, rail: true, rail_offset: 1400 });
  const bom = buildBom([{ unit: { id: 'u1' }, result: r }]);
  assert.equal(bom.totals.pieces, r.panels.length);
  assert.equal(bom.roles.every((x) => !HARDWARE_ROLES.some((h) => h.id === x.role)), true,
    'hardware roles must not appear among the board roles');
});
