/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F6 . SHEETS ARE COUNTED (CLAUDE.md T-CC2a law 6). The owner,
// 01.11.2026, 13:28: *"cc zrobi nam 10 sqm a format plyty to 2.4 x 1.2 ...
// 2.88 sqm ... dajmy 10 procent na offcuts bo zawsze zaokraglamy do gory,
// nawet jesli wyjdzie 2.1 plyty musimy zamowic 3"*; *"jesli klient bedzie
// chcial mniej to zmieni sobie w yeld ustawieniu"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  purchaseBom, sheetCount, sheetUnitKind, LINK_WORDS,
} from '../src/engine/bom.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { toMaterial } from '../src/lib/jcStock.js';

const DESIGN = { carcass: { types: [{ id: 'c1', source: 'egger', finish_id: 'egger:H3325_28' }] } };
const ID = 'sheet.egger.h3325_28.18';
const entries = () => ['01', '02'].map((n) => {
  const params = { ...defaultParamsFor('BUD', P), unit_num: n };
  return { unit: { id: n, type: 'BUD', params }, result: computeCabinet({ type: 'BUD', ...params }, P) };
});
const stockRow = (unit, cost) => toMaterial({ id: 'egg', name: 'Egger H3325 ST28 18mm', category: 'Sheets', unit, cost_per_unit: cost, current_quantity: 4, thickness: 18 });
const linkOf = (extra = {}) => new Map([[ID, {
  cc_material_id: ID, stock_item_id: 'egg', yield: null, sheet_width_mm: 2440, sheet_length_mm: 1220, coverage_m2_per_l: null, ...extra,
}]]);
const sheetRow = (ctx) => purchaseBom(entries(), { profile: P, design: DESIGN, ...ctx }).rows.find((r) => r.catalogueId === ID);

test('F6.1 · the owner\'s example: 10 m2 of a 2440 x 1220 sheet at 1.10 is 4 sheets (11 / 2.977 = 3.69, up to 4)', () => {
  assert.equal(P.materials.sheetYield, 1.10, 'the one number, in the profile');
  assert.equal(sheetCount(10, { yield: 1.10, widthMm: 2440, lengthMm: 1220 }), 4);
  // 2.1 sheets of need is 3: always up.
  const one = (2440 * 1220) / 1e6;
  assert.equal(sheetCount(2.1 * one, { yield: 1, widthMm: 2440, lengthMm: 1220 }), 3);
  assert.equal(sheetCount(2 * one, { yield: 1, widthMm: 2440, lengthMm: 1220 }), 2, 'exactly two is two, never three');
  assert.equal(sheetCount(10, { yield: 1.10, widthMm: null, lengthMm: 1220 }), null, 'no size, no count: never guessed');
});

test('F6.1 · a project row: m2 of the parts, the profile\'s 1.10 when the link holds none, the link\'s 1.05 when it does', () => {
  const r = sheetRow({ links: linkOf(), stock: [stockRow('sheet', 40)] });
  assert.ok(r.m2 > 0);
  assert.equal(r.yield, 1.10);
  assert.equal(r.sheets, Math.ceil((r.m2 * 1.10) / ((2440 * 1220) / 1e6)));
  assert.deepEqual(r.sheetSize, { width_mm: 2440, length_mm: 1220 });
  const own = sheetRow({ links: linkOf({ yield: 1.05 }), stock: [stockRow('sheet', 40)] });
  assert.equal(own.yield, 1.05, 'the company\'s own allowance');
  assert.equal(own.sheets, Math.ceil((own.m2 * 1.05) / ((2440 * 1220) / 1e6)));
});

test('F6.2 · the cost by the stock row\'s unit: per sheet is sheets x price, per m2 is m2 x 1.10 x price, any other unit no price', () => {
  const perSheet = sheetRow({ links: linkOf(), stock: [stockRow('Sheets', 40)] });
  assert.equal(perSheet.status, 'linked');
  assert.equal(perSheet.lineCost, perSheet.sheets * 40);
  const perM2 = sheetRow({ links: linkOf(), stock: [stockRow('m²', 12)] });
  assert.equal(perM2.lineCost, Math.round(perM2.m2 * 1.10 * 12 * 100) / 100);
  const odd = sheetRow({ links: linkOf(), stock: [stockRow('kg', 12)] });
  assert.deepEqual([odd.status, odd.words, odd.price, odd.lineCost], ['unit-unknown', 'Check the unit of this item in Joinery Core', null, null]);
  assert.equal(odd.sheets, perSheet.sheets, 'the count stands; only the price is not said');
  for (const u of ['sheet', 'Sheets', 'board', 'boards', 'pc', 'PCS', 'each', 'ea']) assert.equal(sheetUnitKind(u), 'sheet', u);
  for (const u of ['m2', 'm²', 'sqm', 'sq m', 'SQM']) assert.equal(sheetUnitKind(u), 'area', u);
  for (const u of ['kg', 'L', '', null, 'litre']) assert.equal(sheetUnitKind(u), null, String(u));
});

test('F6.1 · a link without its sheet size: no count and the words, never a price', () => {
  const r = sheetRow({ links: linkOf({ sheet_width_mm: null, sheet_length_mm: null }), stock: [stockRow('sheet', 40)] });
  assert.deepEqual([r.status, r.words, r.sheets, r.price, r.lineCost], ['no-sheet-size', LINK_WORDS.sheetSizeMissing, null, null, null]);
  assert.equal(LINK_WORDS.sheetSizeMissing, 'Sheet size missing, add it in Link materials');
});

test('F6.1 · the 15 percent of bomInvoice is gone from the profile; the family sheets of checks.js are not read by the purchase list', () => {
  assert.equal(P.bom.wastePct, undefined, 'the second offcut number is deleted (the Deletion licence)');
  assert.deepEqual(P.bom.sheet, { width: 2800, height: 2070 }, 'the invoice\'s sheet stays');
  const src = readFileSync(new URL('../src/engine/bom.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /import \{ sheetSizeForFamily \}/, 'the purchase list reads the link\'s size, never the family sheet');
});

test('F6.3 · edging in metres, by the decor of the board it is taped to; a sprayed MDF edge is never taped', () => {
  const pb = purchaseBom(entries(), { profile: P, design: { ...DESIGN, fronts: { types: [{ id: 'f1', source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' } }] } } });
  const edge = pb.rows.find((r) => r.catalogueId === 'edge.egger.h3325_28');
  assert.ok(edge && edge.unit === 'm' && edge.qty > 0);
  assert.ok(pb.rows.some((r) => r.catalogueId === 'sheet.mdf.18' || r.catalogueId === 'sheet.mdf.25'), 'the fronts are MDF');
  assert.ok(!pb.rows.some((r) => r.kind === 'edging' && /MDF/.test(r.name)), 'no tape on a painted edge');
});
