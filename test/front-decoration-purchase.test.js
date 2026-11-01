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

// ─── T-CC2a REWRITES the purchase-list half of this file by name ─────────────
// CLAUDE.md T-CC2a laws 2, 4 and 7: the purchase list is keyed by the CATALOGUE
// entry the cut list resolves for each piece and is never read off the per-part
// assignment blob. An applied strip is cut at its own 8 or 12 mm, which no sheet
// of the catalogue is (18, 19, 22, 25 tonight), so each thickness is its OWN
// line, "Not in the catalogue yet", never merged into the 25 mm door stock and
// never priced. The cut list's own law (an explicit stock id that does not match
// the strip is not resurrected) and the old window's badge and CNC warning are
// untouched and still asserted below.
const mouldingRows = (rows) => rows.filter((row) => row.parts.includes('front_moulding'));

test('8 mm applied strips cannot merge into a 25 mm door stock purchase line', () => {
  const entry = make();
  const rows = mergeUnitMaterials([entry], context({
    door: { material_id: 'mdf25' }, front_moulding: { material_id: 'mdf25' },
  }));
  const doorPanels = entry.result.panels.filter((panel) => panel.part === 'FRONT');
  const door = rows.find((row) => row.kind === 'sheet' && row.parts.includes('door'));
  assert.equal(door.catalogueId, `sheet.generic.${doorPanels[0].thickness}`, 'the door\'s board, from the design');
  assert.ok(!door.parts.includes('front_moulding'), 'no strip on the door\'s line');
  const moulding = mouldingRows(rows);
  assert.equal(moulding.length, 1);
  assert.deepEqual([moulding[0].status, moulding[0].words, moulding[0].lineCost], ['not-in-catalogue', 'Not in the catalogue yet', null]);
  assert.match(moulding[0].name, /8 mm/);
  near(moulding[0].m2, Math.round(areaOf(strips(entry)) * 1e4) / 1e4);
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

test('each moulding thickness is its own line before anything merges', () => {
  const eight = make(8, 'eight');
  const twelve = make(12, 'twelve');
  const purchase = purchaseBom([eight, twelve], context({ front_moulding: { material_id: 'mdf8', yield: 1.2 } }, narrow));
  const rows = mouldingRows(purchase.rows);
  assert.equal(rows.length, 2);
  near(rows.find((row) => /8 mm/.test(row.name)).m2, Math.round(areaOf(strips(eight)) * 1e4) / 1e4);
  near(rows.find((row) => /12 mm/.test(row.name)).m2, Math.round(areaOf(strips(twelve)) * 1e4) / 1e4);
  assert.equal(purchase.totals.complete, false);
});

test('an individual stock id on a strip does not price it: the purchase list reads the catalogue, never a stock row', () => {
  const entry = make(8);
  const parts = strips(entry);
  parts[0].meta.material_id = 'mdf8b';
  const rows = mouldingRows(mergeUnitMaterials([entry], context({ front_moulding: { material_id: 'mdf8', yield: 1.1 } }, narrow)));
  assert.equal(rows.reduce((sum, row) => sum + row.m2, 0) > 0, true);
  near(rows.reduce((sum, row) => sum + row.m2, 0), Math.round(areaOf(parts) * 1e4) / 1e4);
  assert.ok(rows.every((row) => row.status === 'not-in-catalogue' && row.price === null));
});

test('a wrong individual stock id is never a fallback to the door\'s board', () => {
  const entry = make(8);
  const parts = strips(entry);
  parts[0].meta.material_id = 'mdf25';
  const rows = mergeUnitMaterials([entry], context({ front_moulding: { material_id: 'mdf8' } }, narrow));
  near(mouldingRows(rows).reduce((sum, row) => sum + row.m2, 0), Math.round(areaOf(parts) * 1e4) / 1e4);
  assert.ok(mouldingRows(rows).every((row) => row.kind === 'sheet' && row.catalogueId === null));
});

test('a valid palette-slot override resolves through the same material law as the cut list', () => {
  const entry = make(12);
  for (const panel of strips(entry)) panel.meta.material_key = 'front:f2';
  const design = { fronts: { types: [{ id: 'f1', material_id: 'mdf25' }, { id: 'f2', material_id: 'mdf12' }] } };
  const ctx = context({ front_moulding: { material_id: 'mdf8' } }, { ...narrow, design });
  const cut = buildBom([entry], ctx);
  const cutStrips = cut.cutRows.filter((row) => row.part === 'FRONT-MOULDING');
  assert.ok(cutStrips.every((row) => row.material_id === 'mdf12'), 'the cut list keeps the slot\'s stored id');
  assert.ok(cutStrips.every((row) => row.catalogue_id === null), 'a 12 mm strip is in no sheet of the catalogue');
  const rows = mouldingRows(mergeUnitMaterials([entry], ctx));
  assert.equal(rows.length, 1);
  near(rows[0].m2, Math.round(areaOf(strips(entry)) * 1e4) / 1e4);
});

test('thicknesses remain separate, with or without a project design', () => {
  const eight = make(8, 'eight');
  const twelve = make(12, 'twelve');
  const missing = mouldingRows(mergeUnitMaterials([eight, twelve], context({}, narrow)));
  assert.deepEqual(missing.map((row) => row.name.match(/(\d+) mm/)[1]).sort(), ['12', '8']);
  for (const panel of strips(twelve)) panel.meta.material_id = 'mdf12';
  assert.equal(mouldingRows(mergeUnitMaterials([twelve], context({}, narrow))).length, 1);
});

test('a family assignment does not reach the purchase list: the strips of two families are their thicknesses\' lines', () => {
  const base = make(8, 'base', 'BUD');
  const wardrobe = make(12, 'wardrobe', 'WARDROBE');
  const ctx = context({ front_moulding: { material_id: 'mdf8' } }, narrow);
  ctx.assignments.overrides = { front_moulding: { wardrobe: { material_id: 'mdf12' } } };
  const rows = mouldingRows(mergeUnitMaterials([base, wardrobe], ctx));
  near(rows.find((row) => /8 mm/.test(row.name)).m2, Math.round(areaOf(strips(base)) * 1e4) / 1e4);
  near(rows.find((row) => /12 mm/.test(row.name)).m2, Math.round(areaOf(strips(wardrobe)) * 1e4) / 1e4);
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

test('a strip is cut off the front sheet family; with no catalogue sheet it carries no sheet count', () => {
  assert.equal(sheetFamilyOfPart('front_moulding'), 'fronts');
  const entry = make();
  const rows = mouldingRows(mergeUnitMaterials([entry], context({ front_moulding: { material_id: 'mdf8' } }, { ...narrow, profile: P })));
  assert.equal(rows[0].sheets, null, 'a sheet is counted only by a link to a catalogue sheet (law 6)');
  assert.deepEqual(mergeUnitMaterials([], context({}, { ALL_PARTS: [] })), []);
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
    // T-CC2a: the purchase list is the catalogue's: an 8 mm strip is in no sheet of it, so the total is incomplete whatever the blob says.
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
  // T-CC2a REWRITES this line by name: the purchase list no longer reads the blob, and 8 mm strip stock is not in the catalogue yet.
  assert.equal(purchaseBom([entry], { ...ctx, ...narrow }).totals.complete, false);
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
  // T-CC2a REWRITES this line by name: 8 and 12 mm strip stock is not in the catalogue yet, the total is incomplete.
  assert.equal(purchaseBom(entries, { ...ctx, ...narrow }).totals.complete, false);
});

test('assignment checks accept valid palette overrides through the material resolver', () => {
  const entry = make(12);
  for (const panel of strips(entry)) panel.meta.material_key = 'front:f2';
  const ctx = assignedContext([entry]);
  ctx.design = { fronts: { types: [{ id: 'f1', material_id: 'mdf25' }, { id: 'f2', material_id: 'mdf12' }] } };
  assert.deepEqual(unassignedInUse([entry], ctx), []);
  assert.equal(cncAssignmentWarning([entry], ctx), null);
});
