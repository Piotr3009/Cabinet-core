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
import { DEPARTMENTS } from '../src/engine/catalogue.js';
import { buildPurchaseBomCsvText } from '../src/lib/exporters.js';
import { loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';

loadHardwareCatalogues();

// REWRITTEN BY T-CC2a F5 (CLAUDE.md T-CC2a laws 3 and 7): the file is the SAME purchase list the view renders, keyed
// by the catalogue and priced through the COMPANY'S LINKS, never the per-part assignment blob. What T39 said and the
// new law still says is asserted as it was: the lines nobody has linked are IN the file with no cost, and the total
// says INCOMPLETE whenever one exists (*"jesli CC wybierze MDF 25 a nie mamy przypisanego materialu z JC to bedzie
// napisane MDF 25 materials not assigned"*, the owner, 01.11.2026).
const DESIGN = {
  carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'egger', finish_id: 'egger:W1000_9' }] },
  fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' } }] },
};
const STOCK = [
  { id: 's-white', name: 'Egger W1000 ST9 18 mm', unit: 'sheet', price: 41, item_number: 'EG-W1000-18' },
  { id: 's-mdf', name: 'MDF 18 mm', unit: 'sheet', price: 30, item_number: 'MDF-18' },
  { id: 's-any', name: 'A stock row', unit: 'pcs', price: 1.2, item_number: 'ANY-1' },
];
const link = (cc, stock) => [cc, {
  cc_material_id: cc, stock_item_id: stock, yield: null, sheet_width_mm: 2800, sheet_length_mm: 2070, coverage_m2_per_l: null,
}];

function cabinet(typeId, extra = {}) {
  const params = { ...defaultParamsFor(typeId, P), unit_num: '01', ...extra };
  return { unit: { id: `u_${typeId}`, type: typeId, params }, result: computeCabinet(params, P) };
}
const WARDROBE = cabinet('WARDROBE', { doors: true, plinth: true, shelves: 2 });
const BUD = cabinet('BUD', { doors: true, plinth: true });

const ctxWith = (pairs, stock = STOCK) => ({ links: new Map(pairs), stock, profile: P, design: DESIGN });
const rows = (csv) => csv.trim().split('\n');
/** One CSV row's cells, quotes honoured (a name may hold a comma). */
const cellsOf = (line) => [...`${line},`.matchAll(/("(?:[^"]|"")*"|[^,]*),/g)].map((m) => m[1].replace(/^"|"$/g, '').replace(/""/g, '"'));
/** Every catalogue id of a job linked: the boards to their sheet, the rest to one stock row. */
const linkAll = (units) => purchaseBom(units, ctxWith([])).rows.map((r) => r.catalogueId).filter(Boolean)
  .map((id) => link(id, id.startsWith('sheet.mdf') ? 's-mdf' : (id.startsWith('sheet.') ? 's-white' : 's-any')));

test('the header names the columns the owner asked for', () => {
  const csv = buildPurchaseBomCsvText(purchaseBom([WARDROBE], ctxWith([])), { scope: 'project' });
  assert.match(csv, /^SCOPE,project/);
  assert.match(csv, /GROUP,MATERIAL,ASSIGNED,QTY,UNIT,SHEETS,UNIT_COST,LINE_COST,PARTS/);
});

test('a line not linked is in the file, saying "Not linked", with no cost', () => {
  const csv = buildPurchaseBomCsvText(purchaseBom([WARDROBE], ctxWith([])), {});
  const board = rows(csv).find((l) => l.includes('W1000'));
  assert.ok(board, 'the carcass board is not linked and would have been dropped');
  const cells = cellsOf(board);
  assert.equal(cells[2], 'Not linked');
  assert.equal(cells[6], '', 'no unit cost');
  assert.equal(cells[7], '', 'no line cost');
});

test('the total says INCOMPLETE, and carries a WARNING row with the words of law 7', () => {
  const bom = purchaseBom([WARDROBE], ctxWith([link('sheet.egger.w1000_9.18', 's-white')]));
  const csv = buildPurchaseBomCsvText(bom, {});
  assert.match(csv, /TOTAL \(INCOMPLETE\)/);
  assert.match(csv, /WARNING,"?Incomplete total, \d+ lines? not linked\. Link them in Cabinet Core, Materials, Link materials\./);
  assert.ok(!/Not assigned materials/.test(csv), 'T-CC1b F11\'s words are rewritten by name');
});

test('…and a fully linked BOM says TOTAL, with no warning at all', () => {
  const bom = purchaseBom([WARDROBE], ctxWith(linkAll([WARDROBE])));
  assert.equal(bom.totals.complete, true);
  const csv = buildPurchaseBomCsvText(bom, {});
  assert.ok(!csv.includes('INCOMPLETE'), 'a complete BOM must not shout');
  assert.ok(!csv.includes('WARNING'), 'nor warn');
  assert.match(csv, /,TOTAL,/);
});

test('every department that has lines gets a subtotal, and they add up to the total', () => {
  const bom = purchaseBom([WARDROBE, BUD], ctxWith(linkAll([WARDROBE, BUD])));
  const csv = buildPurchaseBomCsvText(bom, {});
  const subtotals = rows(csv).filter((l) => /subtotal/.test(l));
  const present = new Set(bom.rows.map((r) => r.department));
  assert.equal(subtotals.length, present.size, 'one subtotal per department with lines');
  const sum = subtotals.reduce((s, l) => s + (Number(cellsOf(l)[7]) || 0), 0);
  assert.ok(Math.abs(sum - bom.totals.cost) < 0.02, `subtotals ${sum} vs total ${bom.totals.cost}`);
});

test('a JC material name with a comma cannot break the file', () => {
  const bom = purchaseBom([WARDROBE], ctxWith([link('sheet.egger.w1000_9.18', 'x')],
    [{ id: 'x', name: 'Egger W1000, 18 mm "ST9"', unit: 'sheet', price: 10, item_number: 'A,1' }]));
  const csv = buildPurchaseBomCsvText(bom, {});
  assert.match(csv, /"A,1"/);
  // AMENDED BY T75 F21: eleven columns, JC_UUID and CODE after PARTS: the linked stock row's uuid and number.
  const header = rows(csv).find((l) => l.startsWith('GROUP,'));
  assert.equal(header.split(',').length, 11);
});

test('the scope is on the file, so a cabinet order is not read as a project order', () => {
  const one = buildPurchaseBomCsvText(purchaseBom([WARDROBE], ctxWith([])), { scope: 'cabinet' });
  const all = buildPurchaseBomCsvText(purchaseBom([WARDROBE, BUD], ctxWith([])), { scope: 'project' });
  assert.match(one, /^SCOPE,cabinet/);
  assert.match(all, /^SCOPE,project/);
});

test('the group labels are the catalogue\'s departments (and Bespoke)', () => {
  const bom = purchaseBom([WARDROBE], {
    ...ctxWith([link('sheet.egger.w1000_9.18', 's-white')]),
    bespoke: [{ id: 'b1', name: 'Client handles', qty: 4, unit: 'pcs', price: 0, suppliedByClient: true }],
  });
  const csv = buildPurchaseBomCsvText(bom, {});
  const labels = [...DEPARTMENTS.map((g) => g.label), 'Bespoke'];
  const used = rows(csv).filter((l) => /subtotal/.test(l)).map((l) => cellsOf(l)[1].replace(' subtotal', ''));
  for (const u of used) assert.ok(labels.includes(u), `${u} is not a department`);
  // T-CC2a F10.3: the bespoke row is in the file, marked Bespoke.
  const b = rows(csv).find((l) => l.includes('Client handles'));
  assert.ok(b && b.startsWith('Bespoke,'), b);
  assert.match(b, /Bespoke \(supplied by client\)/);
});

test('an empty project writes a file rather than throwing', () => {
  const csv = buildPurchaseBomCsvText(purchaseBom([], {}), {});
  assert.match(csv, /GROUP,MATERIAL/);
  assert.match(csv, /,TOTAL,/);
});
