/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F7 . PAINT BY COLOUR, PRIMER, SOLVENT (CLAUDE.md T-CC2a laws 4, 7).
// The owner, 01.11.2026, 12:50: *"na farby jeden link z nazwa bespoke kolor
// (kolor w nazwie), linkowanie kolorow nie ma sensu ... rozpuszczalnik 5
// procent ilosc farby ... dodac primer czy basecoat"*; 13:28: *"2 razy zeby
// bylo widomo ile jednej i drugiej farby"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { purchaseBom } from '../src/engine/bom.js';
import { paintLinesFor, litresFor, sprayScheduleFor } from '../src/engine/spray.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { toMaterial } from '../src/lib/jcStock.js';
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';

// The decor pack the app loads (lib/decorCatalogue.js): a faced front resolves to its decor, as in the browser.
setDecorCatalogue(parseDecorCatalogue(JSON.parse(readFileSync(new URL('../public/decors/egger/egger-decors.json', import.meta.url), 'utf8'))));

const WINE = { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' };
const BLUE = { hex: '#1d1e33', name: '5004 Black Blue', system: 'RAL' };
const DESIGN = {
  carcass: { types: [{ id: 'c1', source: 'egger', finish_id: 'egger:H3325_28' }] },
  fronts: { types: [{ id: 'f1', source: 'spray', colour: WINE }, { id: 'f2', source: 'spray', colour: BLUE }] },
};
const unitOn = (n, front) => {
  const params = { ...defaultParamsFor('BUD', P), unit_num: n, front_type_id: front };
  return { unit: { id: n, type: 'BUD', params }, result: computeCabinet({ type: 'BUD', ...params }, P) };
};
const JOB = [unitOn('01', 'f1'), unitOn('02', 'f2'), unitOn('03', 'f2')];
const paintRow = toMaterial({ id: 'tin', name: 'Bespoke colour, mixed to order', category: 'Paints', unit: 'L', cost_per_unit: 22, current_quantity: 0 });
const LINKS = new Map([['paint.bespoke', { cc_material_id: 'paint.bespoke', stock_item_id: 'tin', yield: null, sheet_width_mm: null, sheet_length_mm: null, coverage_m2_per_l: null }]]);

test('F7.1 · two front colours are two paint lines with their own litres, keyed by colour, named "Paint, bespoke colour: <RAL>"', () => {
  const pb = purchaseBom(JOB, { links: LINKS, stock: [paintRow], profile: P, design: DESIGN });
  const paints = pb.rows.filter((r) => r.catalogueId === 'paint.bespoke');
  assert.equal(paints.length, 2, 'one line a colour');
  assert.deepEqual(paints.map((r) => r.key).sort(), ['cat:paint.bespoke|RAL 3005 Wine Red', 'cat:paint.bespoke|RAL 5004 Black Blue']);
  assert.deepEqual(paints.map((r) => r.name).sort(), ['Paint, bespoke colour: RAL 3005 Wine Red', 'Paint, bespoke colour: RAL 5004 Black Blue']);
  const S = P.spray;
  for (const r of paints) {
    assert.equal(r.unit, 'L');
    assert.equal(r.qty, litresFor(r.m2, { coats: S.defaults.coats, coverage: S.defaults.coverageM2PerL, wastePct: S.wastePct }), `${r.colour}: today's formula`);
  }
  const wine = paints.find((r) => r.colour === 'RAL 3005 Wine Red');
  const blue = paints.find((r) => r.colour === 'RAL 5004 Black Blue');
  assert.ok(blue.m2 > wine.m2, 'two units of blue paint more than one of wine: their own litres');
  // The ONE paint.bespoke link prices both colours (*"linkowanie kolorow nie ma sensu"*).
  for (const r of paints) {
    assert.equal(r.status, 'linked');
    assert.equal(r.price, 22);
    assert.equal(r.lineCost, Math.round(r.qty * 22 * 100) / 100);
  }
});

test('F7.2 · one primer line for the whole job, one solvent line at 5 percent of the two colours\' litres', () => {
  assert.equal(P.spray.solventPct, 5, 'CONFIRMED, in the profile');
  assert.equal(P.spray.primerCoats, 1, 'PROPOSED, in the profile');
  const lines = paintLinesFor(JOB, { design: DESIGN, profile: P });
  const colours = lines.filter((l) => l.role === 'paint');
  const primer = lines.filter((l) => l.role === 'primer');
  const solvent = lines.filter((l) => l.role === 'solvent');
  assert.equal(colours.length, 2);
  assert.equal(primer.length, 1);
  assert.equal(solvent.length, 1);
  const m2 = colours.reduce((s, l) => s + l.m2, 0);
  assert.ok(Math.abs(primer[0].m2 - m2) < 1e-4, 'the primer covers every sprayed m2');
  assert.equal(primer[0].litres, litresFor(m2, { coats: 1, coverage: P.spray.defaults.coverageM2PerL, wastePct: P.spray.wastePct }));
  const litres = colours.reduce((s, l) => s + l.litres, 0);
  assert.equal(solvent[0].litres, Math.round(litres * 0.05 * 100) / 100, '5 percent of the colours\' litres');
  const pb = purchaseBom(JOB, { profile: P, design: DESIGN });
  assert.equal(pb.rows.filter((r) => r.catalogueId === 'paint.primer').length, 1);
  assert.equal(pb.rows.filter((r) => r.catalogueId === 'paint.solvent').length, 1);
  assert.equal(pb.rows.find((r) => r.catalogueId === 'paint.solvent').qty, solvent[0].litres);
});

test('F7.1 · the link\'s coverage wins over the profile default; one sprayed colour on two sets is one tin', () => {
  const lines12 = paintLinesFor(JOB, { design: DESIGN, profile: P, coverage: 12 });
  for (const l of lines12.filter((x) => x.role === 'paint')) {
    assert.equal(l.coverage, 12);
    assert.equal(l.litres, litresFor(l.m2, { coats: P.spray.defaults.coats, coverage: 12, wastePct: P.spray.wastePct }));
  }
  const withCov = new Map([['paint.bespoke', { ...LINKS.get('paint.bespoke'), coverage_m2_per_l: 12 }]]);
  const pb = purchaseBom(JOB, { links: withCov, stock: [paintRow], profile: P, design: DESIGN });
  const wine = pb.rows.find((r) => r.key === 'cat:paint.bespoke|RAL 3005 Wine Red');
  assert.equal(wine.qty, lines12.find((l) => l.colour === 'RAL 3005 Wine Red').litres);
  // A sprayed carcass in the fronts' colour: set 2 of the schedule, one line of paint (one colour, one tin).
  const sprayed = {
    ...DESIGN,
    carcass: { types: [{ id: 'c1', source: 'sprayed' }] },
    colour: { carcass: WINE },
    fronts: { types: [{ id: 'f1', source: 'spray', colour: WINE }] },
  };
  const one = [unitOn('01', 'f1')];
  const sets = new Set(sprayScheduleFor({ entries: one, design: sprayed, profile: P }).groups.map((g) => g.set));
  assert.deepEqual([...sets].sort(), [1, 2], 'two sets on the page');
  assert.equal(paintLinesFor(one, { design: sprayed, profile: P }).filter((l) => l.role === 'paint').length, 1, 'one colour, one paint line');
});

test('F7 · a faced (laminate) front is no paint line; stain and lacquer are catalogue entries with no live source tonight', () => {
  const faced = { ...DESIGN, fronts: { types: [{ id: 'f1', source: 'laminate', finish_id: 'egger:U999_12' }] } };
  const lines = paintLinesFor([unitOn('01', 'f1')], { design: faced, profile: P });
  assert.equal(lines.filter((l) => l.role === 'paint').length, 0);
  const pb = purchaseBom(JOB, { profile: P, design: DESIGN });
  assert.ok(!pb.rows.some((r) => r.catalogueId === 'stain.bespoke' || r.catalogueId === 'lacquer'));
});
