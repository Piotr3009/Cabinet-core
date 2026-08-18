// ─── THE ASSIGNMENT STORE (turn 39, CLAUDE.md F2) ───────────────────────────
//
// The owner, 18.08.2026: *"każdy jeden projekt powinien mieć Assign
// materials"*. Turn 3's store held ONE set of assignments for every job this
// browser had ever opened, keyed on the engine's own panel ROLES. This turn
// moves it onto the PART REGISTRY and onto the PROJECT, and CLAUDE.md F2 names
// the four things that have to be true afterwards:
//
//   base/override inheritance · defaults seeding · yield arithmetic ·
//   round-trip through save/load
//
// Everything asserted here is a PURE function out of `engine/partRegistry.js`,
// which is what lets a node test say anything about it at all: the zustand
// shell holds no rule of its own.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAssignments, expandAssignments, assignmentFor, isAssigned, yieldFor,
  seedFromDefaults, legacyToCanonical, unassignedParts, unassignedByGroup,
  ASSIGNMENT_SCHEMA, VARIANT_ORDER, PART_REGISTRY, ALL_PARTS, PART_GROUPS,
} from '../src/engine/partRegistry.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';

// ─── Inheritance: overrides win, base inherits ──────────────────────────────

test('a base assignment covers every cabinet family at once', () => {
  const d = normalizeAssignments({ base: { carcase_side: { material_id: 'egger_white' } } });
  for (const family of VARIANT_ORDER) {
    assert.equal(assignmentFor(d, 'carcase_side', family)?.material_id, 'egger_white', family);
  }
  // …and with no family named at all, which is what a project-level read asks.
  assert.equal(assignmentFor(d, 'carcase_side')?.material_id, 'egger_white');
});

test('an override wins for ITS family and leaves the others inheriting', () => {
  const d = normalizeAssignments({
    base: { carcase_side: { material_id: 'egger_white' } },
    overrides: { carcase_side: { wardrobe: { material_id: 'oak_ply' } } },
  });
  assert.equal(assignmentFor(d, 'carcase_side', 'wardrobe').material_id, 'oak_ply');
  assert.equal(assignmentFor(d, 'carcase_side', 'base').material_id, 'egger_white');
  assert.equal(assignmentFor(d, 'carcase_side', 'wall').material_id, 'egger_white');
  assert.equal(assignmentFor(d, 'carcase_side', 'tall').material_id, 'egger_white');
  assert.equal(assignmentFor(d, 'carcase_side', 'pantry').material_id, 'egger_white');
});

test('an override with no base still surfaces — it is not silently dropped', () => {
  const d = normalizeAssignments({ overrides: { shelf: { pantry: { material_id: 'beech' } } } });
  assert.equal(assignmentFor(d, 'shelf', 'pantry').material_id, 'beech');
  assert.equal(assignmentFor(d, 'shelf', 'base'), null);
  assert.equal(expandAssignments(d)['shelf@pantry'].material_id, 'beech');
});

test('the flat view carries part ids, family rows AND turn 3’s legacy roles', () => {
  const flat = expandAssignments({
    base: { carcase_side: { material_id: 'A' }, door: { material_id: 'B' } },
    overrides: { carcase_side: { wardrobe: { material_id: 'C' } } },
  });
  assert.equal(flat.carcase_side.material_id, 'A');
  assert.equal(flat['carcase_side@wardrobe'].material_id, 'C');
  assert.equal(flat['carcase_side@base'].material_id, 'A');
  // The legacy aliases — `engine/bom.js materialDemand()` has read these since
  // turn 3 and iron rule 3 says they keep working.
  assert.equal(flat.side.material_id, 'A');
  assert.equal(flat.front.material_id, 'B');
});

test('an unknown family is not a family — it inherits the base', () => {
  const d = normalizeAssignments({
    base: { shelf: { material_id: 'A' } },
    overrides: { shelf: { kitchenette: { material_id: 'B' } } },   // not one of the five
  });
  assert.equal(assignmentFor(d, 'shelf', 'kitchenette').material_id, 'A');
  assert.equal(d.overrides.shelf, undefined);
});

// ─── The legacy bridge ──────────────────────────────────────────────────────

test('turn 3’s flat role map migrates onto part ids with nothing lost', () => {
  const d = normalizeAssignments({
    side: { material_id: 'A' },
    back: { material_id: 'B' },
    front: { material_id: 'C', yield: 1.12 },
    drawer_box: { material_id: 'D' },
    hinges: { material_id: 'E' },
    runner_pairs: { material_id: 'F' },
  });
  assert.equal(d.base.carcase_side.material_id, 'A');
  assert.equal(d.base.back.material_id, 'B');
  assert.equal(d.base.door.material_id, 'C');
  assert.equal(d.base.door.yield, 1.12);
  assert.equal(d.base.drawer_box_side.material_id, 'D');
  assert.equal(d.base.hinge.material_id, 'E');
  assert.equal(d.base.runner.material_id, 'F');
});

test('TOP and BOTTOM collapse onto one row, and WHICH one is deterministic', () => {
  // Both legacy roles land on `carcase_horizontal`. First writer wins, so the
  // migration cannot depend on key-order luck.
  const a = normalizeAssignments({ top: { material_id: 'T' }, bottom: { material_id: 'B' } });
  assert.equal(a.base.carcase_horizontal.material_id, 'T');
  const b = normalizeAssignments({ bottom: { material_id: 'B' }, top: { material_id: 'T' } });
  assert.equal(b.base.carcase_horizontal.material_id, 'B');
  // Either way there is exactly ONE row, which is the owner's whole question.
  assert.equal(Object.keys(a.base).length, 1);
});

test('legacyToCanonical reads part ids, legacy roles and the @family notation', () => {
  assert.deepEqual(legacyToCanonical('carcase_side'), { key: 'carcase_side', variantKey: null });
  assert.deepEqual(legacyToCanonical('side'), { key: 'carcase_side', variantKey: null });
  assert.deepEqual(legacyToCanonical('shelf@wardrobe'), { key: 'shelf', variantKey: 'wardrobe' });
  assert.deepEqual(legacyToCanonical('side@base'), { key: 'carcase_side', variantKey: 'base' });
  assert.deepEqual(legacyToCanonical('shelf@atlantis'), { key: 'shelf', variantKey: null });
  assert.deepEqual(legacyToCanonical('nonsense'), { key: 'nonsense', variantKey: null });
});

// ─── Yield ──────────────────────────────────────────────────────────────────

test('yield defaults to 1.0, and never to a lie', () => {
  assert.equal(yieldFor({}, 'shelf'), 1.0);
  assert.equal(yieldFor({ base: { shelf: { material_id: 'A' } } }, 'shelf'), 1.0);
  // Garbage is not a coefficient. A NaN here would multiply a purchase order.
  for (const bad of [0, -1, 'abc', null, undefined, NaN, Infinity]) {
    const d = normalizeAssignments({ base: { shelf: { material_id: 'A', yield: bad } } });
    assert.equal(d.base.shelf.yield, 1.0, `yield ${String(bad)}`);
  }
});

test('yield is per assignment, and an override carries its own', () => {
  const d = normalizeAssignments({
    base: { shelf: { material_id: 'A', yield: 1.1 } },
    overrides: { shelf: { wardrobe: { material_id: 'A', yield: 1.25 } } },
  });
  assert.equal(yieldFor(d, 'shelf', 'base'), 1.1);
  assert.equal(yieldFor(d, 'shelf', 'wardrobe'), 1.25);
  // The arithmetic the BOM does with it: 4 m² at 1.25 is 5 m² to buy.
  assert.equal(4 * yieldFor(d, 'shelf', 'wardrobe'), 5);
  assert.equal(Number((10 * yieldFor(d, 'shelf', 'base')).toFixed(4)), 11);
});

// ─── Seeding from the workshop's defaults ───────────────────────────────────

test('the workshop’s defaults fill a project that has never been assigned', () => {
  const d = seedFromDefaults(null, { carcase_side: 'egger_white', back: { material_id: 'hdf6', yield: 1.05 } });
  assert.equal(d.base.carcase_side.material_id, 'egger_white');
  assert.equal(d.base.carcase_side.yield, 1.0);
  assert.equal(d.base.back.material_id, 'hdf6');
  assert.equal(d.base.back.yield, 1.05);
});

test('a default NEVER overwrites a choice somebody made by hand', () => {
  const chosen = normalizeAssignments({ base: { carcase_side: { material_id: 'the_joiner_chose_this' } } });
  const d = seedFromDefaults(chosen, { carcase_side: 'egger_white', shelf: 'birch_ply' });
  assert.equal(d.base.carcase_side.material_id, 'the_joiner_chose_this');
  assert.equal(d.base.shelf.material_id, 'birch_ply');       // …but it does fill the silence
});

test('seeding is idempotent and ignores keys the registry does not know', () => {
  const defaults = { shelf: 'birch', not_a_part: 'nonsense', another: { material_id: 'x' } };
  const once = seedFromDefaults(null, defaults);
  const twice = seedFromDefaults(once, defaults);
  assert.deepEqual(twice, once);
  assert.equal(once.base.not_a_part, undefined);
  assert.equal(once.base.another, undefined);
  assert.equal(Object.keys(once.base).length, 1);
});

test('a default written in turn 3’s role vocabulary still lands', () => {
  const d = seedFromDefaults(null, { side: 'egger_white', front: 'sprayed_mdf' });
  assert.equal(d.base.carcase_side.material_id, 'egger_white');
  assert.equal(d.base.door.material_id, 'sprayed_mdf');
});

test('profile.materials exists, ships EMPTY, and survives a migration', () => {
  assert.deepEqual(P.materials.defaults, {}, 'a material id is a workshop number — this app invents none');
  assert.deepEqual(P.materials.legRules, []);
  const stored = migrateCabinetProfile({
    ...P, materials: { defaults: { shelf: 'their_board' }, legRules: [{ material_id: 'leg100' }] },
  });
  assert.equal(stored.materials.defaults.shelf, 'their_board');
  assert.equal(stored.materials.legRules[0].material_id, 'leg100');
  // A profile stored before this turn comes back with the block, not without it.
  const old = { ...P };
  delete old.materials;
  assert.deepEqual(migrateCabinetProfile(old).materials, { defaults: {}, legRules: [] });
});

// ─── Round trip ─────────────────────────────────────────────────────────────

test('save → JSON → load is the same blob, byte for byte', () => {
  const live = normalizeAssignments({
    base: { carcase_side: { material_id: 'A', yield: 1.1 }, door: { material_id: 'B' } },
    overrides: { carcase_side: { wardrobe: { material_id: 'C', yield: 1.2 } } },
    customParts: [{ id: 'custom_1', name: 'Dowels 8×40', unit: 'pcs', qtyPerUnit: 24 }],
    auto: { hinge: true },
  });
  const round = normalizeAssignments(JSON.parse(JSON.stringify(live)));
  assert.deepEqual(round, live);
  assert.equal(round.schema, ASSIGNMENT_SCHEMA);
  assert.equal(round.customParts[0].qtyPerUnit, 24);
  assert.equal(round.auto.hinge, true);
});

test('normalize is idempotent on every shape it accepts', () => {
  const shapes = [
    null, undefined, {}, 'nonsense', 42, [],
    { side: { material_id: 'A' } },                                    // turn 3, flat
    { schema: 1, base: { shelf: { material_id: 'B' } } },              // CLAUDE.md's own stamp
    { schema: 2, base: {}, overrides: {} },                            // empty canonical
    { base: { shelf: { material_id: 'C' } }, overrides: { shelf: { tall: { material_id: 'D' } } } },
  ];
  for (const raw of shapes) {
    const once = normalizeAssignments(raw);
    assert.deepEqual(normalizeAssignments(once), once, JSON.stringify(raw));
    assert.equal(once.schema, ASSIGNMENT_SCHEMA);
  }
});

test('a blob stamped schema 1 — CLAUDE.md’s own code block — is read, not refused', () => {
  const d = normalizeAssignments({ schema: 1, base: { shelf: { material_id: 'A', yield: 1.15 } } });
  assert.equal(d.schema, 2);
  assert.equal(d.base.shelf.material_id, 'A');
  assert.equal(d.base.shelf.yield, 1.15);
});

test('junk in the blob cannot reach the BOM', () => {
  const d = normalizeAssignments({
    base: { shelf: 'not an object', carcase_side: null, back: { material_id: 'ok' } },
    overrides: { shelf: 'nope', back: { wardrobe: 7 } },
    customParts: 'not an array',
    auto: 'not an object',
  });
  assert.deepEqual(Object.keys(d.base), ['back']);
  assert.deepEqual(d.overrides, {});
  assert.deepEqual(d.customParts, []);
  assert.deepEqual(d.auto, {});
});

// ─── What is missing, and where ─────────────────────────────────────────────

test('unassigned counts answer per group, and drop as parts are assigned', () => {
  const empty = unassignedByGroup(null);
  assert.equal(unassignedParts(null).length, ALL_PARTS.length);
  const total = Object.values(empty).reduce((a, b) => a + b, 0);
  assert.equal(total, ALL_PARTS.length);
  for (const g of PART_GROUPS) assert.ok(empty[g.id] > 0, g.id);

  const d = normalizeAssignments({ base: { carcase_side: { material_id: 'A' } } });
  assert.equal(unassignedByGroup(d).board, empty.board - 1);
  assert.equal(unassignedByGroup(d).front, empty.front);
  assert.ok(isAssigned(d, 'carcase_side'));
  assert.ok(!isAssigned(d, 'door'));
});

test('a part assigned only for ONE family is unassigned for the others', () => {
  const d = normalizeAssignments({ overrides: { door: { wardrobe: { material_id: 'A' } } } });
  assert.ok(isAssigned(d, 'door', 'wardrobe'));
  assert.ok(!isAssigned(d, 'door', 'base'));
  assert.ok(!isAssigned(d, 'door'));
  assert.ok(unassignedParts(d, 'wardrobe').every((p) => p.id !== 'door'));
  assert.ok(unassignedParts(d, 'base').some((p) => p.id === 'door'));
});

test('an assignment with no material behind it is NOT an assignment', () => {
  // A row that carries a yield and a category filter but no board is a row the
  // joiner started and did not finish. It must still read as unassigned, or the
  // gate and the counter both lie.
  const d = normalizeAssignments({ base: { shelf: { yield: 1.2, category: 'board' } } });
  assert.ok(!isAssigned(d, 'shelf'));
  assert.ok(unassignedParts(d).some((p) => p.id === 'shelf'));
  assert.equal(yieldFor(d, 'shelf'), 1.2);
});

test('every registry part can be assigned and read back', () => {
  const base = {};
  for (const p of ALL_PARTS) base[p.id] = { material_id: `mat_${p.id}` };
  const d = normalizeAssignments({ base });
  for (const p of ALL_PARTS) {
    assert.equal(assignmentFor(d, p.id).material_id, `mat_${p.id}`, p.id);
    assert.ok(PART_REGISTRY[p.id]);
  }
  assert.equal(unassignedParts(d).length, 0);
});
