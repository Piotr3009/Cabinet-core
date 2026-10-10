import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import {
  buildBom, mergeUnitMaterials, purchaseBom, sheetFamilyOfPart,
  projectPartUsage, unassignedInUse, cncAssignmentWarning,
} from '../src/engine/bom.js';
import { PART_REGISTRY } from '../src/engine/partRegistry.js';
// T76 F5 · one state: the line's state is T75's readiness.
import { readinessOf } from '../src/engine/readiness.js';

const materials = [
  { id: 'mdf25', name: 'MDF 25 mm', thickness: 25, price: 30 },
  { id: 'mdf8', name: 'MDF 8 mm', thickness: 8, price: 10 },
  { id: 'mdf8b', name: 'Alternative MDF 8 mm', thickness: 8, price: 12 },
  { id: 'mdf12', name: 'MDF 12 mm', thickness: 12, price: 16 },
];
const make = (thickness = 8, id = 'one', type = 'BUD') => {
  const params = {
    ...defaultParamsFor(type, P), unit_num: id, front_type: 'AM',
    front_decoration: { ...defaultFrontDecoration('AM'), mouldingProjectionMm: thickness },
  };
  return { unit: { id, type, params }, result: computeCabinet(params, P) };
};
const strips = (entry) => entry.result.panels.filter((panel) => panel.part === 'FRONT-MOULDING');
const areaOf = (panels) => panels.reduce((sum, panel) => sum + panel.area_m2 * panel.qty, 0);
const narrow = { ALL_PARTS: [PART_REGISTRY.front_moulding] };
const context = (base, extra = {}) => ({ materials, profile: P, assignments: { base }, ...extra });
const near = (value, wanted) => assert.ok(Math.abs(value - wanted) < 1e-10, `${value} differs from ${wanted}`);

test('8 mm applied strips cannot merge into a 25 mm door stock purchase line', () => {
  const entry = make();
  const rows = mergeUnitMaterials([entry], context({
    door: { material_id: 'mdf25' }, front_moulding: { material_id: 'mdf25' },
  }));
  const door = rows.find((row) => row.key === 'mat:mdf25');
  assert.deepEqual(door.parts, ['door']);
  near(door.qty, areaOf(entry.result.panels.filter((panel) => panel.part === 'FRONT')));
  const moulding = rows.find((row) => row.key === 'part:front_moulding:8');
  assert.equal(moulding._assigned, false);
  assert.equal(moulding.lineCost, null);
  assert.match(moulding.name, /8 mm/);
  near(moulding.qty, areaOf(strips(entry)));
  // T76 F5 · read off readiness: each strip a cut part of its own, the door
  // cut, and the gluing of the four a manual NOTE on the door's unit.
  for (const strip of strips(entry)) assert.equal(readinessOf(strip, { drills: entry.result.drills }), 'cut');
  const cut = buildBom([entry]).units[0].rows;
  assert.ok(cut.filter((row) => row.part === 'FRONT-MOULDING').every((row) => row.readiness === 'cut'));
  assert.equal(cut.find((row) => row.part === 'FRONT').readiness, 'cut');
  const note = cut.find((row) => row.part === 'APPLIED-STRIPS');
  assert.equal(note.readiness, 'manual');
  assert.equal(note.material_role, 'note');
});

test('each moulding thickness is checked before family quantities merge', () => {
  const eight = make(8, 'eight');
  const twelve = make(12, 'twelve');
  const ctx = context({ front_moulding: { material_id: 'mdf8', yield: 1.2 } }, narrow);
  const purchase = purchaseBom([eight, twelve], ctx);
  assert.equal(purchase.rows.length, 2);
  near(purchase.rows.find((row) => row.key === 'mat:mdf8').qty, areaOf(strips(eight)) * 1.2);
  const missing = purchase.rows.find((row) => row.key === 'part:front_moulding:12');
  near(missing.qty, areaOf(strips(twelve)) * 1.2);
  assert.equal(purchase.totals.complete, false);
  assert.equal(purchase.unassigned.length, 1);
});

test('valid individual stock assignments win over family assignments and retain every strip', () => {
  const entry = make(8);
  const parts = strips(entry);
  parts[0].meta.material_id = 'mdf8b';
  const rows = mergeUnitMaterials([entry], context({ front_moulding: { material_id: 'mdf8', yield: 1.1 } }, narrow));
  assert.equal(rows.length, 2);
  near(rows.find((row) => row.key === 'mat:mdf8b').qty, parts[0].area_m2 * 1.1);
  near(rows.find((row) => row.key === 'mat:mdf8').qty, areaOf(parts.slice(1)) * 1.1);
  near(rows.reduce((sum, row) => sum + row.qty, 0), areaOf(parts) * 1.1);
  assert.ok(rows.every((row) => row._assigned));
});

test('an invalid individual assignment stays unassigned instead of falling back silently', () => {
  const entry = make(8);
  const parts = strips(entry);
  parts[0].meta.material_id = 'mdf25';
  const rows = mergeUnitMaterials([entry], context({ front_moulding: { material_id: 'mdf8' } }, narrow));
  assert.ok(!rows.some((row) => row.key === 'mat:mdf25'));
  near(rows.find((row) => row.key === 'part:front_moulding:8').qty, parts[0].area_m2);
  near(rows.find((row) => row.key === 'mat:mdf8').qty, areaOf(parts.slice(1)));
});

test('a valid palette-slot override resolves through the same material law as the cut list', () => {
  const entry = make(12);
  for (const panel of strips(entry)) panel.meta.material_key = 'front:f2';
  const design = { fronts: { types: [{ id: 'f1', material_id: 'mdf25' }, { id: 'f2', material_id: 'mdf12' }] } };
  const ctx = context({ front_moulding: { material_id: 'mdf8' } }, { ...narrow, design });
  const rows = mergeUnitMaterials([entry], ctx);
  assert.deepEqual(rows.map((row) => row.key), ['mat:mdf12']);
  near(rows[0].qty, areaOf(strips(entry)));
  const cut = buildBom([entry], ctx);
  assert.ok(cut.units[0].rows.filter((row) => row.part === 'FRONT-MOULDING').every((row) => row.material_id === 'mdf12'));
});

test('unassigned thicknesses remain separate and explicit stock works without a project design', () => {
  const eight = make(8, 'eight');
  const twelve = make(12, 'twelve');
  const ctx = context({}, narrow);
  const missing = mergeUnitMaterials([eight, twelve], ctx);
  assert.deepEqual(missing.map((row) => row.key).sort(), ['part:front_moulding:12', 'part:front_moulding:8']);
  for (const panel of strips(twelve)) panel.meta.material_id = 'mdf12';
  const assigned = mergeUnitMaterials([twelve], ctx);
  assert.deepEqual(assigned.map((row) => row.key), ['mat:mdf12']);
  assert.ok(assigned[0]._assigned);
});

test('family overrides are validated against the physical strip thickness', () => {
  const base = make(8, 'base', 'BUD');
  const wardrobe = make(12, 'wardrobe', 'WARDROBE');
  const ctx = context({ front_moulding: { material_id: 'mdf8' } }, narrow);
  ctx.assignments.overrides = { front_moulding: { wardrobe: { material_id: 'mdf12' } } };
  const rows = mergeUnitMaterials([base, wardrobe], ctx);
  assert.deepEqual(rows.map((row) => row.key).sort(), ['mat:mdf12', 'mat:mdf8']);
  near(rows.find((row) => row.key === 'mat:mdf8').qty, areaOf(strips(base)));
  near(rows.find((row) => row.key === 'mat:mdf12').qty, areaOf(strips(wardrobe)));
});

test('the cut BOM does not resurrect an explicitly rejected material id', () => {
  const entry = make();
  const panel = strips(entry)[0];
  panel.meta.material_id = 'mdf25';
  const cut = buildBom([entry], { materials, design: {}, profile: P });
  const row = cut.units[0].rows.find((item) => item.id === panel.id);
  assert.equal(row.material_id, null);
  assert.match(row.material_key, /^unassigned:front-moulding:8/);
  assert.equal(row.material_label, 'Applied moulding stock 8 mm');
});

test('moulding sheet estimates use the front sheet family and honour narrowed registry walks', () => {
  assert.equal(sheetFamilyOfPart('front_moulding'), 'fronts');
  const entry = make();
  const profile = { ...P, cnc: { ...P.cnc, sheetFronts: { width: 1000, height: 1000 }, sheetCarcass: { width: 100, height: 100 } } };
  const rows = mergeUnitMaterials([entry], context({ front_moulding: { material_id: 'mdf8' } }, { ...narrow, profile }));
  assert.equal(rows[0].sheets, 1);
  assert.deepEqual(mergeUnitMaterials([entry], context({}, { ALL_PARTS: [] })), []);
});

const assignedContext = (entries, mouldingStock = 'mdf8') => {
  const base = Object.fromEntries(Object.keys(projectPartUsage(entries, { profile: P }))
    .map((id) => [id, { material_id: id === 'front_moulding' ? mouldingStock : 'mdf25' }]));
  return context(base);
};

test('assignment badge and CNC warning reject wrong or unavailable moulding stock', () => {
  const entries = [make()];
  for (const stock of ['mdf25', 'missing', 'unknown-thickness']) {
    const ctx = assignedContext(entries, stock);
    ctx.materials = [...materials, { id: 'unknown-thickness', name: 'Unknown board' }];
    const missing = unassignedInUse(entries, ctx);
    assert.deepEqual(missing.map((row) => row.partId), ['front_moulding']);
    assert.deepEqual(missing[0].families, ['base']);
    assert.match(cncAssignmentWarning(entries, ctx), /1 cut part has no board assigned \(Applied front mouldings\)/);
    assert.equal(purchaseBom(entries, { ...ctx, ...narrow }).totals.complete, false);
  }
  const valid = assignedContext(entries);
  assert.deepEqual(unassignedInUse(entries, valid), []);
  assert.equal(cncAssignmentWarning(entries, valid), null);
});

test('assignment badge and CNC warning accept per-strip stock without a family assignment', () => {
  const entry = make();
  const ctx = assignedContext([entry], null);
  for (const panel of strips(entry)) panel.meta.material_id = 'mdf8b';
  assert.deepEqual(unassignedInUse([entry], ctx), []);
  assert.equal(cncAssignmentWarning([entry], ctx), null);
  assert.equal(purchaseBom([entry], { ...ctx, ...narrow }).totals.complete, true);
  strips(entry)[0].meta.material_id = 'mdf25';
  ctx.assignments.base.front_moulding.material_id = 'mdf8';
  assert.deepEqual(unassignedInUse([entry], ctx).map((row) => row.partId), ['front_moulding']);
  assert.match(cncAssignmentWarning([entry], ctx), /Applied front mouldings/);
});

test('mixed strip thicknesses stay missing until every piece has matching stock', () => {
  const entries = [make(8, 'base'), make(12, 'tall', 'WARDROBE')];
  const ctx = assignedContext(entries);
  assert.deepEqual(unassignedInUse(entries, ctx)[0].families, ['wardrobe']);
  ctx.assignments.overrides = { front_moulding: { wardrobe: { material_id: 'mdf12' } } };
  assert.deepEqual(unassignedInUse(entries, ctx), []);
  assert.equal(cncAssignmentWarning(entries, ctx), null);
  assert.equal(purchaseBom(entries, { ...ctx, ...narrow }).totals.complete, true);
});

test('assignment checks accept valid palette overrides through the material resolver', () => {
  const entry = make(12);
  for (const panel of strips(entry)) panel.meta.material_key = 'front:f2';
  const ctx = assignedContext([entry]);
  ctx.design = { fronts: { types: [{ id: 'f1', material_id: 'mdf25' }, { id: 'f2', material_id: 'mdf12' }] } };
  assert.deepEqual(unassignedInUse([entry], ctx), []);
  assert.equal(cncAssignmentWarning([entry], ctx), null);
});
