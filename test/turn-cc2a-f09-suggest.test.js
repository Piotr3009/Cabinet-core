/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F9 . SUGGEST, NEVER DECIDE (law 8). The owner, 01.11.2026: *"tylko podpowiedz od akceptacji tenanta"*.
// The rules of lib/linkSuggest.js against the catalogue's own entries (engine/catalogue.js) and stock rows as
// Joinery Core hands them over (lib/jcStock.js toMaterial): the decor code and the thickness for a sheet, MDF and
// the thickness, the article number for hardware; at most one suggestion; Accept all saves only the ticked;
// nothing is saved before Accept.
import test from 'node:test';
import assert from 'node:assert/strict';

const { entryById, entriesOf } = await import('../src/engine/catalogue.js');
const { toMaterial } = await import('../src/lib/jcStock.js');
const {
  suggestFor, suggestAll, acceptAllLinks, sheetFields, paintFields, decorCodeOf, linkStatus, offcutPctOf, yieldOfPct,
  matchesEntry, rowToken,
} = await import('../src/lib/linkSuggest.js');

const row = (id, name, extra = {}) => toMaterial({
  id, name, category: 'Sheet materials', subcategory: '', unit: 'sheet', current_quantity: 4, cost_per_unit: 40,
  size: '', thickness: null, color: '', item_number: '', image_url: null, supplier_id: null, ...extra,
});

const OAK18 = entryById('sheet.egger.h3325_28.18');
const OAK25 = entryById('sheet.egger.h3325_28.25');
const MDF18 = entryById('sheet.mdf.18');
const HINGE = entryById('hinge.blum.clip-top.110.nickel');

const STOCK = [
  row('jc-0001', 'Egger H-3325 ST28 Gladstone Oak board', { thickness: '18', item_number: 'EGG-OAK-18' }),
  row('jc-0002', 'Gladstone oak 25mm', { thickness: '25', item_number: 'H3325/25' }),
  row('jc-0003', 'Egger H3325 faced MDF 18', { thickness: '18' }),
  row('jc-0004', 'MDF 18 mm', { thickness: '18', item_number: 'MDF-18' }),
  row('jc-0005', 'MDF 22 mm', { thickness: '22' }),
  row('jc-0006', 'Blum hinge 110 nickel', { category: 'Ironmongery', unit: 'pcs', item_number: '71-B-3550' }),
  row('jc-0007', 'Hinge H33250 lookalike', { thickness: '18' }),
];

test('F9.1 the catalogue carries what the rules read: a decor id, a thickness, an article number', () => {
  assert.ok(OAK18 && OAK25 && MDF18 && HINGE, 'the entries this test names exist in the catalogue');
  assert.equal(decorCodeOf(OAK18), 'H3325');
  assert.equal(OAK18.thickness, 18);
  assert.ok(HINGE.articleNo, 'the hinge carries an article number');
});

test('F9.1 a sheet: the decor code (any separator) AND the thickness; never a longer code', () => {
  const hit = suggestFor(OAK18, STOCK);
  assert.equal(hit?.id, 'jc-0001', 'H-3325 at 18 mm is the first row that meets the rule');
  assert.equal(suggestFor(OAK25, STOCK)?.id, 'jc-0002', 'the code in the item number counts, at 25 mm');
  // A code inside a longer code is not the code.
  assert.equal(suggestFor(OAK18, [STOCK[6]]), null, 'H33250 is not H3325');
});

test('F9.1 no suggestion on a thickness mismatch', () => {
  assert.equal(suggestFor(OAK18, [STOCK[1]]), null, 'the 25 mm oak is never offered for the 18 mm entry');
  assert.equal(suggestFor(OAK25, [STOCK[0], STOCK[2]]), null);
  assert.equal(suggestFor(MDF18, [STOCK[4]]), null, 'MDF 22 is not MDF 18');
  // A row with no thickness at all is never a sheet suggestion.
  assert.equal(suggestFor(MDF18, [row('jc-x', 'MDF offcuts')]), null);
});

test('F9.1 MDF: the word MDF and the thickness; a plain MDF row before a decor-faced one', () => {
  assert.equal(suggestFor(MDF18, STOCK)?.id, 'jc-0004');
  assert.equal(suggestFor(MDF18, [STOCK[2]])?.id, 'jc-0003', 'the faced MDF still says MDF at 18 when it is the only one');
});

test('F9.1 hardware: the entry\'s article number, exact, separators folded in the number', () => {
  assert.equal(suggestFor(HINGE, STOCK)?.id, 'jc-0006');
  const other = entryById('hinge.blum.clip-top.110.onyx');
  assert.equal(suggestFor(other, STOCK), null, '71B3590 is not in the stock');
  // An entry with no article number is never suggested by any word of its name.
  const noArticle = entriesOf('ironmongery').find((e) => !e.articleNo);
  assert.ok(noArticle);
  assert.equal(suggestFor(noArticle, [row('jc-n', noArticle.name, { category: 'Ironmongery' })]), null);
});

test('F9.1 at most one suggestion per entry; a live link is never suggested over; a removed one is', () => {
  const all = suggestAll([OAK18, OAK25, MDF18, HINGE], STOCK, new Map());
  assert.equal(all.size, 4);
  for (const v of all.values()) assert.equal(typeof v.id, 'string', 'one row, never a list');
  const linked = new Map([[OAK18.id, { cc_material_id: OAK18.id, stock_item_id: 'jc-0001' }]]);
  assert.equal(suggestAll([OAK18], STOCK, linked).size, 0, 'a linked entry has nothing to suggest');
  const removed = new Map([[OAK18.id, { cc_material_id: OAK18.id, stock_item_id: 'jc-gone' }]]);
  assert.equal(linkStatus(OAK18, removed, STOCK).status, 'removed');
  assert.equal(suggestAll([OAK18], STOCK, removed).get(OAK18.id)?.id, 'jc-0001', 'a removed link may be offered a row, never repaired by itself');
  assert.equal(suggestAll([OAK18], STOCK, new Map(), { stockOk: false }).size, 0, 'no stock read, no suggestion');
});

test('F9.2 Accept all saves only the ticked; the sheet size is asked once and both sizes are required', () => {
  const items = [
    { entry: OAK18, row: STOCK[0] },
    { entry: MDF18, row: STOCK[3] },
    { entry: HINGE, row: STOCK[5] },
  ];
  const ticked = new Set([OAK18.id, HINGE.id]);
  const noSize = acceptAllLinks(items, ticked, { width: '', length: '', offcutPct: '10' });
  assert.equal(noSize.ok, false, 'a ticked sheet without its size is not offered to save');
  assert.deepEqual(noSize.links, []);
  assert.equal(noSize.errors.width, 'Required');
  const plan = acceptAllLinks(items, ticked, { width: '2440', length: '1220', offcutPct: '10' });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.links.map((l) => l.cc_material_id), [OAK18.id, HINGE.id], 'only the ticked, never the unticked MDF');
  assert.deepEqual(plan.links[0], {
    cc_material_id: OAK18.id, stock_item_id: 'jc-0001', sheet_width_mm: 2440, sheet_length_mm: 1220, yield: 1.1,
  });
  assert.deepEqual(plan.links[1], { cc_material_id: HINGE.id, stock_item_id: 'jc-0006' }, 'hardware carries no sheet size');
  // With the sheet unticked, no size is asked at all.
  assert.equal(acceptAllLinks(items, new Set([HINGE.id]), {}).ok, true);
  assert.equal(acceptAllLinks(items, new Set(), {}).ok, false, 'nothing ticked, nothing to save');
});

test('F8.5 the sheet form: both sizes required, 100 to 6000 whole mm; the offcut is a percentage of the yield', () => {
  assert.equal(sheetFields({ width: '', length: '1220' }).ok, false);
  assert.equal(sheetFields({ width: '2440', length: '' }).ok, false);
  assert.equal(sheetFields({ width: '99', length: '1220' }).errors.width, 'Whole millimetres, 100 to 6000');
  assert.equal(sheetFields({ width: '6001', length: '1220' }).ok, false);
  assert.equal(sheetFields({ width: '2440.5', length: '1220' }).ok, false);
  assert.deepEqual(sheetFields({ width: '2440', length: '1220', offcutPct: '' }).values, { sheet_width_mm: 2440, sheet_length_mm: 1220 });
  assert.equal(sheetFields({ width: '2440', length: '1220', offcutPct: '5' }).values.yield, 1.05);
  assert.equal(sheetFields({ width: '2440', length: '1220', offcutPct: '250' }).ok, false, 'a yield over 3.00 is JC\'s refusal');
  assert.equal(offcutPctOf(1.1), '10', '1.10 shows 10');
  assert.equal(yieldOfPct('10'), 1.1);
  assert.equal(paintFields({ coverage: '' }).ok, true, 'the paint coverage is optional');
  assert.deepEqual(paintFields({ coverage: '12' }).values, { coverage_m2_per_l: 12 });
  assert.equal(paintFields({ coverage: '0.01' }).ok, false);
});

test('F8.3 the search of the left table narrows by name and decor code, any case, any separator', () => {
  assert.ok(matchesEntry(OAK18, 'h3325'));
  assert.ok(matchesEntry(OAK18, 'H 3325'));
  assert.ok(matchesEntry(OAK18, 'gladstone'));
  assert.ok(!matchesEntry(MDF18, 'h3325'));
  assert.ok(matchesEntry(MDF18, ''));
});

test('law 1 the row token is a hash, never the id, the same on every run', () => {
  assert.equal(rowToken(OAK18.id), rowToken('sheet.egger.h3325_28.18'));
  assert.notEqual(rowToken(OAK18.id), rowToken(OAK25.id));
  assert.doesNotMatch(rowToken(OAK18.id), /sheet|egger|h3325/);
});
