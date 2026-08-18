// ─── THE BOM VIEW'S OWN FILE (turn 39, CLAUDE.md F6) ────────────────────────
//
// The view renders `purchaseBom()`; this writes the same object to a file. Two
// things about it are the whole point and both are asserted below:
//
//   • the UNASSIGNED lines are IN the file, at the top, with no cost. An order
//     that silently dropped the parts nobody has chosen a board for would be an
//     order for half a kitchen.
//   • the total is labelled INCOMPLETE whenever one of those lines exists —
//     *"a BOM with unassigned lines shows its total as incomplete, never as a
//     confident number."*

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { purchaseBom } from '../src/engine/bom.js';
import { buildPurchaseBomCsvText } from '../src/lib/exporters.js';
import { PART_GROUPS } from '../src/engine/partRegistry.js';

const MATS = [
  { id: 'egger_white', name: 'Egger W980 18 mm', category: 'board', price: 11.4 },
  { id: 'sprayed', name: 'Sprayed MDF 25 mm', category: 'front', price: 27 },
];

function cabinet(typeId, extra = {}) {
  const params = { ...defaultParamsFor(typeId, P), unit_num: '01', ...extra };
  return { unit: { id: `u_${typeId}`, type: typeId, params }, result: computeCabinet(params, P) };
}
const WARDROBE = cabinet('WARDROBE', { doors: true, plinth: true, shelves: 2 });
const BUD = cabinet('BUD', { doors: true, plinth: true });

const ctxWith = (base) => ({ assignments: { base }, materials: MATS, profile: P });
const rows = (csv) => csv.trim().split('\n');

test('the header names the columns the owner asked for', () => {
  const csv = buildPurchaseBomCsvText(purchaseBom([WARDROBE], ctxWith({})), { scope: 'project' });
  assert.match(csv, /^SCOPE,project/);
  assert.match(csv, /GROUP,MATERIAL,ASSIGNED,QTY,UNIT,SHEETS,UNIT_COST,LINE_COST,PARTS/);
});

test('an unassigned line is in the file, marked NO, with no cost', () => {
  const csv = buildPurchaseBomCsvText(purchaseBom([WARDROBE], ctxWith({})), {});
  const doors = rows(csv).find((l) => l.includes('Doors'));
  assert.ok(doors, 'the doors are unassigned and would have been dropped');
  const cells = doors.split(',');
  assert.equal(cells[2], 'NO');
  assert.equal(cells[6], '', 'no unit cost');
  assert.equal(cells[7], '', 'no line cost');
});

test('the total says INCOMPLETE, and carries a WARNING row explaining why', () => {
  const bom = purchaseBom([WARDROBE], ctxWith({ carcase_side: { material_id: 'egger_white' } }));
  const csv = buildPurchaseBomCsvText(bom, {});
  assert.match(csv, /TOTAL \(INCOMPLETE\)/);
  assert.match(csv, /WARNING,/);
  assert.match(csv, /this total is not the price of the job/);
});

test('…and a complete BOM says TOTAL, with no warning at all', () => {
  const base = {};
  for (const r of purchaseBom([WARDROBE], ctxWith({})).rows) {
    for (const partId of r.parts) base[partId] = { material_id: 'egger_white' };
  }
  const bom = purchaseBom([WARDROBE], ctxWith(base));
  assert.equal(bom.totals.complete, true);
  const csv = buildPurchaseBomCsvText(bom, {});
  assert.ok(!csv.includes('INCOMPLETE'), 'a complete BOM must not shout');
  assert.ok(!csv.includes('WARNING'), 'nor warn');
  assert.match(csv, /,TOTAL,/);
});

test('every group that has lines gets a subtotal, and they add up to the total', () => {
  const bom = purchaseBom([WARDROBE, BUD], ctxWith({
    carcase_side: { material_id: 'egger_white' },
    carcase_horizontal: { material_id: 'egger_white' },
    door: { material_id: 'sprayed' },
  }));
  const csv = buildPurchaseBomCsvText(bom, {});
  const subtotals = rows(csv).filter((l) => /subtotal/.test(l));
  const groupsPresent = new Set(bom.rows.map((r) => r.group).filter(Boolean));
  assert.equal(subtotals.length, groupsPresent.size, 'one subtotal per group with lines');
  const sum = subtotals.reduce((s, l) => s + (Number(l.split(',')[7]) || 0), 0);
  assert.ok(Math.abs(sum - bom.totals.cost) < 0.02, `subtotals ${sum} vs total ${bom.totals.cost}`);
});

test('a material name with a comma cannot break the file', () => {
  const csv = buildPurchaseBomCsvText(purchaseBom([WARDROBE], {
    assignments: { base: { carcase_side: { material_id: 'x' } } },
    materials: [{ id: 'x', name: 'Egger W980, 18 mm "SM"', price: 10 }],
    profile: P,
  }), {});
  assert.match(csv, /"Egger W980, 18 mm ""SM"""/);
  // …and every data row still has exactly nine columns.
  const header = rows(csv).find((l) => l.startsWith('GROUP,'));
  assert.equal(header.split(',').length, 9);
});

test('the scope is on the file, so a cabinet order is not read as a project order', () => {
  const one = buildPurchaseBomCsvText(purchaseBom([WARDROBE], ctxWith({})), { scope: 'cabinet' });
  const all = buildPurchaseBomCsvText(purchaseBom([WARDROBE, BUD], ctxWith({})), { scope: 'project' });
  assert.match(one, /^SCOPE,cabinet/);
  assert.match(all, /^SCOPE,project/);
});

test('the group labels are the registry’s own', () => {
  const bom = purchaseBom([WARDROBE], ctxWith({ carcase_side: { material_id: 'egger_white' } }));
  const csv = buildPurchaseBomCsvText(bom, {});
  const labels = PART_GROUPS.map((g) => g.label);
  const used = rows(csv).filter((l) => /subtotal/.test(l)).map((l) => l.split(',')[1].replace(/"/g, '').replace(' subtotal', ''));
  for (const u of used) assert.ok(labels.includes(u) || u === 'OTHER', `${u} is not a registry group`);
});

test('an empty project writes a file rather than throwing', () => {
  const csv = buildPurchaseBomCsvText(purchaseBom([], {}), {});
  assert.match(csv, /GROUP,MATERIAL/);
  assert.match(csv, /,TOTAL,/);
});
