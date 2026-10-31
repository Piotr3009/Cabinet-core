// ─── T75 · F21 · THE CSV CONTRACT WITH JOINERYCORE ──────────────────────────
//
// The owner, 9.10.2026: *"stock połączony z joinery core, na razie export
// import za pomocą csv coś jak production core, później api."*
//
// CLAUDE.md T75 F21: *"PROBE: the round trip `toCsv` to `fromCsv` to
// `mergeImport` on the real catalogue shape, every column, as a test; what does
// not survive is fixed. The purchase BOM export (`bom.js purchaseBom`) carries
// `jc_uuid` and the material code on every line that has them ... The project
// stores the `warehouseStamp` it was priced against and the `price_source` per
// assigned material; opening a project whose catalogue has moved since raises
// a CHECK, in words, never a silent recompute ... Menu, `Database ▸
// Materials`: the two existing export buttons read `Export for JoineryCore
// (CSV)` ... and `Export project list for JoineryCore (CSV)`; the import reads
// `Import from JoineryCore (CSV)`; `JC_NOTICE` stays. The API is NOT this turn."*
//
// verify/t75/p07-probe.md measured the round trip; every FAILS row of its
// table is asserted below as fixed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  CSV_COLUMNS, JC_NOTICE, catalogueMoves, catalogueStamp, fromCsv, importSummary, mergeImport, migrateMaterial,
  priceSnapshot, projectUuids, toCsv, usedInProject,
} from '../src/engine/warehouse.js';
import { purchaseBom } from '../src/engine/bom.js';
import { buildPurchaseBomCsvText } from '../src/lib/exporters.js';
import { runChecks, CHECKS } from '../src/engine/checks.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const JC_ROW = {
  item_number: '0042',
  name: 'MFC White W980, 18mm "SM"',
  category: 'Sheets',
  subcategory: 'Egger',
  size: '2800 × 2070',
  thickness: '18',
  color: 'Biały / White',
  unit: 'sheet',
  cost_per_unit: '42.5',
  image_url: 'https://cdn.example.com/w980.jpg?w=200,h=200',
  jc_uuid: 'A1B2C3D4-0000-4000-8000-00000000BEEF',
  notes: 'line one\nline two',
};

test('F21 · PROBE: the round trip, every column of the twelve', () => {
  assert.deepEqual(CSV_COLUMNS, [
    'item_number', 'name', 'category', 'subcategory', 'size', 'thickness',
    'color', 'unit', 'cost_per_unit', 'image_url', 'jc_uuid', 'notes',
  ]);
  const row = migrateMaterial(JC_ROW);
  const { rows: back, error } = fromCsv(toCsv([row]));
  assert.equal(error, null);
  assert.equal(back.length, 1);
  const b = back[0];
  assert.equal(b.item_number, '0042');
  assert.equal(b.name, 'MFC White W980, 18mm "SM"', 'comma and quotes');
  assert.equal(b.category, 'sheets');
  assert.equal(b.subcategory, 'Egger');
  assert.equal(b.size, '2800 × 2070', 'UTF-8');
  assert.equal(b.thickness, 18);
  assert.equal(b.color, 'Biały / White');
  assert.equal(b.unit, 'sheet');
  assert.equal(b.cost_per_unit, 42.5);
  assert.equal(b.image_url, 'https://cdn.example.com/w980.jpg?w=200,h=200');
  assert.equal(b.jc_uuid, 'A1B2C3D4-0000-4000-8000-00000000BEEF');
  assert.equal(b.notes, 'line one\nline two', 'FIXED: a quoted newline is part of the cell (probe: the tail line was lost)');
  // …and back onto the warehouse it came from: matched, not doubled.
  const merged = mergeImport([row], back);
  assert.deepEqual([merged.added, merged.updated], [0, 1]);
});

test('F21 · FIXED: a number is read the way a JoineryCore file writes it, and a non-number is null, never 0', () => {
  const price = (v) => migrateMaterial({ name: 'x', cost_per_unit: v }).cost_per_unit;
  assert.equal(price('42,50'), 42.5, 'probe: 4250');
  assert.equal(price('1 234,56'), 1234.56, 'probe: 123456');
  assert.equal(price('1,234.56'), 1234.56);
  assert.equal(price('1,234'), 1234);
  assert.equal(price('£42.50'), 42.5);
  assert.equal(price('1e3'), 1000, 'probe: 13');
  assert.equal(price('n/a'), null, 'probe: 0, a price nobody gave is not free');
  assert.equal(price(''), null);
  assert.equal(migrateMaterial({ name: 'x', thickness: '18,5' }).thickness, 18.5, 'probe: 185');
});

test('F21 · FIXED: one uuid however it is printed; a worn item number is given the next free one, and said', () => {
  const row = migrateMaterial(JC_ROW);
  const lower = mergeImport([row], [{ ...JC_ROW, jc_uuid: JC_ROW.jc_uuid.toLowerCase(), cost_per_unit: '45' }]);
  assert.deepEqual([lower.added, lower.updated], [0, 1], 'probe: added 1, updated 0');
  const worn = mergeImport([row], [{ name: 'Another board', item_number: '0042' }]);
  assert.equal(worn.rows.filter((r) => r.item_number === '0042').length, 1, 'probe: 0042 worn twice');
  assert.deepEqual(worn.renumbered, [{ name: 'Another board', was: '0042', now: '0043' }]);
  assert.match(importSummary(worn), /1 given a new item number \(0042 to 0043\)/);
  // The law that stays (turn51-f7): no uuid is a new row. JC_NOTICE says so.
  assert.match(JC_NOTICE, /a row that has none is a new row/);
});

test('F21 · FIXED: the project list is THIS project\'s rows, not every uuid in the warehouse', () => {
  const rows = ['u-1', 'u-2', 'u-3'].map((u, i) => migrateMaterial({ name: `Board ${i}`, jc_uuid: u }));
  // A project naming none of the three (the probe exported 3 of 3).
  assert.deepEqual(usedInProject(rows, { names: [], uuids: projectUuids({ assignments: {}, materials: [] }) }), []);
  const stock = [{ id: 'mat_a', name: 'Stock A', jc_uuid: 'U-2' }];
  const assignments = { base: { carcase_side: { material_id: 'mat_a' } } };
  const used = usedInProject(rows, { names: [], uuids: projectUuids({ assignments, materials: stock }) });
  assert.deepEqual(used.map((r) => r.jc_uuid), ['u-2']);
  assert.match(read('src/components/WarehouseModal.jsx'), /uuids: projectUuids\(\{ assignments, materials: stock \}\)/);
});

test('F21 · the purchase BOM carries jc_uuid and the material code on every line that has them', () => {
  const unit = { id: 'u', type: 'BUD', params: { ...defaultParamsFor('BUD', P), unit_num: '01' } };
  const result = computeCabinet(unit.params, P);
  const materials = [
    { id: 'mat_a', name: 'Egger W980', price: 11.4, jc_uuid: '6f1c2a7e-0000-4000-8000-000000000001', code: 'W980 SM' },
  ];
  const bom = purchaseBom([{ unit, result }], {
    assignments: { base: { carcase_side: { material_id: 'mat_a' } } }, materials, profile: P,
  });
  const line = bom.rows.find((r) => r._assigned);
  assert.equal(line.jc_uuid, '6f1c2a7e-0000-4000-8000-000000000001');
  assert.equal(line.code, 'W980 SM');
  const csv = buildPurchaseBomCsvText(bom, {});
  assert.match(csv, /PARTS,JC_UUID,CODE\n/);
  assert.match(csv, /,6f1c2a7e-0000-4000-8000-000000000001,W980 SM\n/);
  // An unassigned line has neither, and says nothing it does not know.
  assert.ok(bom.rows.filter((r) => !r._assigned).every((r) => !r.jc_uuid && !r.code));
});

test('F21 · priced at what the job was quoted at; the moved list is a Check in words, never a silent recompute', () => {
  const unit = { id: 'u', type: 'BUD', params: { ...defaultParamsFor('BUD', P), unit_num: '01' } };
  const result = computeCabinet(unit.params, P);
  const assignments = { base: { carcase_side: { material_id: 'mat_a' } } };
  const then = [{ id: 'mat_a', name: 'Egger W980', price: 10, jc_uuid: 'U-1', price_source: 'import' }];
  const stamp = priceSnapshot({ assignments, materials: then, at: '2026-10-09T00:00:00Z' });
  assert.equal(stamp.prices.mat_a.price, 10);
  assert.equal(stamp.prices.mat_a.price_source, 'import', 'the price_source per assigned material');
  assert.equal(stamp.stamp, catalogueStamp([{ id: 'mat_a', jc_uuid: 'U-1', price: 10 }]));
  const now = [{ ...then[0], price: 12 }];
  const quoted = purchaseBom([{ unit, result }], {
    assignments, materials: now, profile: P, pricedAt: stamp,
  }).rows.find((r) => r._assigned);
  assert.equal(quoted.costPerUnit, 10, 'the quote stands');
  assert.equal(quoted.price_source, 'quoted');
  const moves = catalogueMoves(stamp, { materials: now });
  assert.deepEqual(moves, [{
    id: 'mat_a', name: 'Egger W980', was: 10, now: 12,
  }]);
  const found = runChecks({ profile: P, priceMoves: moves }).filter((f) => f.check === 29);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'yellow');
  assert.match(found[0].message, /Egger W980 10\.00 to 12\.00/);
  assert.match(found[0].message, /Accept today's prices/);
  assert.equal(CHECKS.find((c) => c.n === 29).label, 'The price list moved since this job was priced');
  // A later save keeps the quoted price and adds a newly assigned material at today's.
  const later = priceSnapshot({
    assignments: { base: { carcase_side: { material_id: 'mat_a' }, back: { material_id: 'mat_b' } } },
    materials: [...now, { id: 'mat_b', name: 'HDF', price: 3 }],
    keep: stamp,
  });
  assert.equal(later.prices.mat_a.price, 10);
  assert.equal(later.prices.mat_b.price, 3);
  assert.deepEqual(catalogueMoves(null, { materials: now }), [], 'a job never priced has nothing moved');
});

test('F21 · the store: saved with its stamp; Accept today\'s prices is the owner\'s one decision', async () => {
  const { useProjectStore } = await import('../src/stores/projectStore.js');
  const { useMaterialAssignmentStore } = await import('../src/stores/materialAssignmentStore.js');
  const S = () => useProjectStore.getState();
  S().newProject();
  S().addUnit('BUD');
  const M = useMaterialAssignmentStore.getState();
  const mat = M.materials[0];
  useMaterialAssignmentStore.setState({ data: { ...M.data, base: { ...(M.data?.base || {}), carcase_side: { material_id: mat.id } } } });
  // AMENDED BY T-CC1a F7 (31.10.2026): projectForSave is the ONE builder of the item JSON ({ format, version,
  // project, units, assignments }, no profile); the stamp rides its `project`. *"dopiero caly json powinien sie
  // zapisac do DB przy nacisnieciu Zapisz lub co 5 minut automatycznie"* (the owner, 30.10.2026).
  const saved = S().projectForSave().project;
  assert.ok(saved.warehouseStamp?.prices?.[mat.id], 'the save carries what the job was priced at');
  assert.deepEqual(S().catalogueMoves(), []);
  useMaterialAssignmentStore.setState({
    materials: useMaterialAssignmentStore.getState().materials.map((m) => (m.id === mat.id ? { ...m, price: (Number(m.price) || 0) + 5 } : m)),
  });
  assert.equal(S().catalogueMoves().length, 1, 'the list moved');
  assert.equal(S().runChecks().filter((f) => f.check === 29).length, 1);
  S().acceptCatalogue();
  assert.deepEqual(S().catalogueMoves(), [], 'accepted: re-priced against today\'s list');
  useMaterialAssignmentStore.setState({ materials: M.materials, data: M.data });
});

test('F21 · the menu reads JoineryCore; the API is not this turn', () => {
  const src = read('src/components/WarehouseModal.jsx');
  assert.match(src, /Import from JoineryCore \(CSV\)/);
  assert.match(src, /Export project list for JoineryCore \(CSV\)/);
  assert.match(src, /Export for JoineryCore \(CSV\)/);
  assert.match(src, /JC_NOTICE/);
  // The attributes the T51 walk clicks stay.
  for (const hook of ['data-warehouse-import', 'data-warehouse-export-project', 'data-warehouse-export-all']) {
    assert.ok(src.includes(hook), hook);
  }
  assert.match(read('src/components/BomPanel.jsx'), /data-bom-accept-prices="1"/);
});
