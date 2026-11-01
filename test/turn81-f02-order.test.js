/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F2 · THE SHEET LIST, IN THE OWNER'S ORDER
//
// The owner, 22.10.2026 (21:23): *"najpierw chce widziec 3d jak zrobiles
// pierwsza strona, pozniej chce widziec wszystkie fronty, bez przebijania
// carcasow, tylko to co widac za frontami, i tyle, fronty magenta, nastepnie
// widok wszystkich scian bez frontow, tak jakbysmy ukryli albo sciagneli
// fronty, pozniej przekroj z gory, i pozniej przekroje pionowe, a na koncu
// wizualizacja."*; (22:56) *"potrzebujemy drawings z numeracja unitow"*;
// (22:57) *"a przeciez mamy x-ray, to tez mozna zrobic x-ray prosze."*
// CLAUDE.md T81 F2: "Tests test/turn81-f02-order.test.js: the names and the
// order for the walk's kitchen (one wall: 01 3D, 02 Fronts, 03 Without fronts,
// 04 X-ray, 05 Plan base, 06 Plan wall, 07 Sections, 08 Visualisation, 09 Cut
// list); two walls: every wall's three sheets before the plans."

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { S, t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { SET_LEGEND } from '../src/engine/drawings/setSheet.js';

const set = () => wallDrawingSheets(setArgs());
const names = (sheets) => sheets.map((s) => `${s.no} ${s.name}`);
// The legend's swatch ('01' in the unit number's ink) is the convention, not a unit (`meta: 'legend'`).
const texts = (sheet, layer) => sheet.entities.filter((e) => e.kind === 'text' && e.layer === layer && e.meta !== 'legend').map((e) => e.text);

test('F2 · one wall: 3D, fronts, without fronts, X-ray, the two plans, the sections, the visualisation, the cut list', () => {
  t81Kitchen({ inframe: true });
  const sheets = set();
  assert.deepEqual(names(sheets), [
    '01 3D',
    '02 Wall A · Fronts',
    '03 Wall A · Without fronts',
    '04 Wall A · X-ray',
    '05 Plan · base units',
    '06 Plan · wall units',
    '07 Wall A · Sections A-A',
    // AMENDED 01.11.2026 (T-CC1b F8.2): *"dodac wizualizacje z drugiego kata"*, the two angles in place of the one visualisation.
    '08 Visualisation, left',
    '09 Visualisation, right',
    '10 Cut list and materials',
  ]);
  assert.deepEqual(sheets.map((s) => s.variant), ['3d', 'fronts', 'no-fronts', 'xray', 'plan-base', 'plan-wall', 'sections', 'visual', 'visual', 'cutlist']);
  // Numbered from 01, of the whole set, in every title strip.
  for (const s of sheets) {
    assert.equal(s.sheet.sheetNo, s.no);
    assert.equal(s.sheet.sheetOf, '10');
    assert.ok(s.sheet.entities.some((e) => e.kind === 'text' && e.text === `${s.no} / 10`), `${s.no} stamped`);
  }
  // No cover as a page of its own: it is folded into the 3D's column.
  assert.ok(!sheets.some((s) => /Cover/.test(s.name)));
});

test('F2 · the 3D sheet carries the cover\'s index and revisions in its column', () => {
  t81Kitchen({ inframe: true });
  const sheets = set();
  const first = sheets[0].sheet;
  const all = first.entities.filter((e) => e.kind === 'text').map((e) => e.text);
  for (const s of sheets) assert.ok(all.includes(s.name), `the index names ${s.name}`);
  assert.ok(all.includes('SHEET INDEX') && all.includes('REVISIONS'));
  assert.ok(all.includes('T81 kitchen'), 'the job, as the cover said it');
  assert.equal(first.scaleLabel, 'NTS');
  // The index takes the column's place: no key plan and no legend on the 3D;
  // every elevation keeps the legend of the owner's colours.
  assert.ok(!all.includes('KEY PLAN') && !all.includes('LEGEND'));
  const fronts = sheets.find((s) => s.variant === 'fronts').sheet;
  const words = fronts.entities.filter((e) => e.kind === 'text').map((e) => e.text);
  for (const [, , label] of SET_LEGEND) assert.ok(words.includes(label), `the legend names ${label}`);
});

test('F2 · two walls: every wall\'s fronts, without fronts and X-ray sheets come before the plans, in that order', () => {
  t81Kitchen({ inframe: true });
  const b = S().addUnit('BUD', { wall: 1, x: 600 }).id;
  S().updateUnitParams(b, { width: 600 });
  const sheets = set();
  const n = names(sheets);
  assert.deepEqual(n.slice(0, 8), [
    '01 3D',
    '02 Wall A · Fronts',
    '03 Wall B · Fronts',
    '04 Wall A · Without fronts',
    '05 Wall B · Without fronts',
    '06 Wall A · X-ray',
    '07 Wall B · X-ray',
    '08 Plan · base units',
  ]);
  const plans = sheets.findIndex((s) => s.variant === 'plan-base');
  for (const v of ['fronts', 'no-fronts', 'xray']) {
    assert.deepEqual(sheets.filter((s) => s.variant === v).map((s) => s.wall), [0, 1], `${v} for every wall`);
    assert.ok(sheets.filter((s) => s.variant === v).every((s) => sheets.indexOf(s) < plans), `${v} before the plans`);
  }
  const sections = sheets.filter((s) => s.variant === 'sections');
  assert.ok(sections.length >= 1 && sections.every((s) => sheets.indexOf(s) > plans), 'the sections after the plans');
  // T-CC1b F8.2: the two angles, then the cut list.
  assert.equal(sheets[sheets.length - 2].variant, 'visual');
  assert.equal(sheets[sheets.length - 3].variant, 'visual');
  assert.equal(sheets[sheets.length - 1].variant, 'cutlist');
});

test('F2 · the unit numbers: on every sheet that shows a unit', () => {
  t81Kitchen({ inframe: true });
  const sheets = set();
  const all = S().allResults().map((e) => String(e.unit.params.unit_num)).sort();
  const of = (v) => sheets.find((s) => s.variant === v).sheet;
  for (const v of ['3d', 'fronts', 'no-fronts', 'xray']) {
    assert.deepEqual([...new Set(texts(of(v), 'UNIT_NUMBER'))].sort(), all, `${v}: every unit numbered`);
  }
  // A plan numbers the units its cut passes through; the sections the cut units.
  assert.deepEqual([...new Set(texts(of('plan-base'), 'UNIT_NUMBER'))].sort(), ['01', '02', 'DR01']);
  assert.deepEqual([...new Set(texts(of('plan-wall'), 'UNIT_NUMBER'))].sort(), ['WU01']);
  assert.ok(texts(of('sections'), 'UNIT_NUMBER').includes('DR01'));
});

test('F2 · the window: the sheet buttons walk the engine\'s list, and its words say the owner\'s order', () => {
  const src = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
  assert.match(src, /wallSheetList\.map\(\(page, i\) =>/, 'one button per sheet, in the list\'s own order');
  assert.match(src, /the\s+room in <b>3D<\/b>/);
  assert.match(src, /every wall <b>without fronts<\/b>/);
  assert.match(src, /every wall in <b>X-ray<\/b>/);
  assert.ok(!/<b>00<\/b> cover/.test(src), 'no cover sheet in the words');
  // T-CC1b F6 (*"usunac card 3D view i front only"*, the owner, 01.11.2026): the kind tabs are deleted; the
  // window is the set alone.
  assert.ok(!/'Card \(3 views\)'|'Front only'|data-drawing-kind-tab/.test(src), 'the kind row is gone');
  assert.match(src, /const kind = 'walls';/);
});
