/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F4 . THE MIRROR CABINET'S BOM
//
// CLAUDE.md T83 F4: *"Lines per cabinet: "LED light panel, made to measure,
// 4000 K, 75 x H" (one per LED stile), "Mirror 4 mm" (m2, the doors and the
// back when on), "Glass shelf 6 mm toughened, W x D" (one per shelf), "LED
// strip under" and "LED strip inside" (lm), "LED driver 24 V" (one), "Fused
// spur by electrician" (a note), the hinges by weight, the shelf pins, the
// hanging brackets as the vanity's. Articles empty strings
// (`profile.mirror.articles`) for the owner to fill."*; the walk reads *"the
// BOM read (LED panels 2, mirror m2, glass 15)"*.
//
// THE STAGE: MIRROR_CABINET at the profile's defaults: doors 327 / 477 / 327 x
// 937 with a mirror each (1.0597 m2), two LED stiles 75 x 937, fifteen glass
// shelves (ten 336.5 x 177 in the outer bays, five 533 x 177 in the middle),
// the LED under 1254 and inside 922, one driver in the bottom box. Every
// number is the kit's (`derived.mirror`); `engine/bom.js
// mirrorCabinetOrderLines` turns it into order lines in `result.hardware`'s
// shape, and the kit's bought parts leave the cut rows.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  buildBom, buildCabinetPartQtys, mirrorCabinetNotes, mirrorCabinetOrderLines,
} from '../src/engine/bom.js';
import { ironmongerySummary } from '../src/engine/bomInvoice.js';

/** A mirror cabinet as the library births it, with its own answers changed. */
function kit(extra = {}, mirror = {}) {
  const d = defaultParamsFor('MIRROR_CABINET', P);
  return { ...d, unit_num: '01', ...extra, mirror: { ...d.mirror, ...mirror } };
}
const entry = (params, id = 'mc1') => ({ unit: { id, type: params.type, params }, result: computeCabinet(params, P) });
const lines = (extra, mirror) => mirrorCabinetOrderLines(computeCabinet(kit(extra, mirror), P), P);
const of = (ls, role) => ls.filter((l) => l.role === role);
const sum = (ls) => ls.reduce((s, l) => s + l.qty, 0);

test('F4 . the default cabinet buys LED panels 2, the mirror of its doors in m2, glass 15, two strips, one driver', () => {
  const r = computeCabinet(kit(), P);
  const m = r.derived.mirror;
  const ls = mirrorCabinetOrderLines(r, P);
  assert.deepEqual(of(ls, 'mirror_led_panel').map((l) => [l.label, l.qty, l.unit]),
    [['LED light panel, made to measure, 4000 K, 75 x 937', 2, 'pcs']], 'one a LED stile');
  assert.deepEqual(of(ls, 'mirror_m2').map((l) => [l.label, l.qty, l.unit, l.spec_label]),
    [['Mirror 4 mm', 1.0597, 'm²', 'on the doors']]);
  assert.equal(of(ls, 'mirror_m2')[0].qty, m.mirrorArea.doors_m2, 'the kit\'s own m2');
  assert.deepEqual(of(ls, 'mirror_m2')[0].spec.pieces.map((p) => [p.on, p.w, p.h]),
    [['01-F1', 327, 937], ['01-F2', 477, 937], ['01-F3', 327, 937]], 'the glazier\'s pieces');
  assert.deepEqual(of(ls, 'mirror_glass_shelf').map((l) => [l.label, l.qty]), [
    ['Glass shelf 6 mm toughened, 336.5 x 177', 10],
    ['Glass shelf 6 mm toughened, 533 x 177', 5],
  ]);
  assert.equal(sum(of(ls, 'mirror_glass_shelf')), 15, 'one a shelf');
  assert.deepEqual(of(ls, 'led_strip').map((l) => [l.label, l.qty, l.unit]),
    [['LED strip under', 1.254, 'm'], ['LED strip inside', 0.922, 'm']], 'in linear metres');
  assert.deepEqual(of(ls, 'mirror_led_driver').map((l) => [l.label, l.qty, l.spec_label]),
    [['LED driver 24 V', 1, 'in the bottom box, for the LED panels and the strips']]);
  // The hinges by the door's weight with its mirror: the kit's ladder, door by door.
  assert.equal(sum(of(ls, 'hinges')), m.hingesTotal);
  assert.equal(sum(of(ls, 'hinges')), 9);
  for (const l of of(ls, 'hinges')) {
    assert.equal(l.spec.by_weight, true);
    assert.match(l.spec_label, /by the door's weight with its mirror, the ladder's band to 13 kg and 1600 mm/);
  }
  assert.deepEqual(of(ls, 'hinges').map((l) => [l.spec.doors, l.spec.on_divider]), [[2, false], [1, true]]);
  assert.match(of(ls, 'hinges')[1].spec_label, /hung on a divider: the hinge is the owner's to name$/, 'D11 said, never clamped');
  // The house's pins, four a glass shelf; the vanity's hanging brackets.
  assert.deepEqual(of(ls, 'shelf_pins').map((l) => [l.qty, l.spec_label]), [[15 * P.shelfHoles.pinsPerShelf, `⌀${P.shelfHoles.diameter}`]]);
  assert.deepEqual(of(ls, 'vanity_hangers').map((l) => [l.label, l.qty]), [[P.vanity.hangers.name, P.mirror.hangers.perUnit]]);
  assert.deepEqual(ls.map((l) => l.role), [
    'mirror_led_panel', 'mirror_m2', 'mirror_glass_shelf', 'mirror_glass_shelf', 'led_strip', 'led_strip',
    'mirror_led_driver', 'hinges', 'hinges', 'shelf_pins', 'vanity_hangers',
  ]);
  for (const l of ls) assert.ok(l.qty > 0 && l.unit && l.spec && l.spec_label, `${l.role} is a whole hardware line`);
});

test('F4 . the mirror on the back adds its m2; doors without a mirror leave the back alone; neither, no mirror line', () => {
  const both = of(lines({}, { mirror_back: true }), 'mirror_m2');
  assert.deepEqual(both.map((l) => [l.qty, l.spec_label]), [[2.1827, 'on the doors and the back']]);
  assert.deepEqual(both[0].spec.pieces.slice(3).map((p) => [p.on, p.w, p.h]),
    [['BACK bay 1', 340.5, 922], ['BACK bay 2', 537, 922], ['BACK bay 3', 340.5, 922]]);
  assert.deepEqual(of(lines({}, { mirror_doors: false, mirror_back: true }), 'mirror_m2').map((l) => [l.qty, l.spec_label]),
    [[1.123, 'on the back']]);
  assert.deepEqual(of(lines({}, { mirror_doors: false }), 'mirror_m2'), []);
});

test('F4 . what is not there is not bought: no stile, no light; no light, no driver and no spur; no shelf, no glass and no pin', () => {
  assert.deepEqual(of(lines({}, { stile: 'none' }), 'mirror_led_panel'), []);
  assert.deepEqual(of(lines({}, { stile: 'timber' }), 'mirror_led_panel'), [], 'a timber stile is a cut board');
  const dark = computeCabinet(kit({}, { stile: 'none', led_under: false, led_inside: false }), P);
  const ls = mirrorCabinetOrderLines(dark, P);
  assert.deepEqual(['led_strip', 'mirror_led_driver'].flatMap((r) => of(ls, r)), []);
  assert.deepEqual(mirrorCabinetNotes(dark, P), [], 'nothing to feed, no spur');
  const bare = lines({}, { shelves_per_bay: 0 });
  assert.deepEqual(['mirror_glass_shelf', 'shelf_pins'].flatMap((r) => of(bare, r)), []);
  assert.deepEqual(of(lines({}, { led_inside: false }), 'led_strip').map((l) => l.label), ['LED strip under']);
});

test('F4 . the bought parts leave the cut rows: the pieces are the kit\'s 16, no LED panel or glass is board area', () => {
  const e = entry(kit());
  const bom = buildBom([e], { profile: P });
  const r = e.result;
  assert.equal(bom.totals.pieces, r.totals.pieces_total);
  assert.equal(bom.totals.pieces, 16);
  const rows = bom.units[0].rows;
  assert.ok(!rows.some((x) => x.role === 'led_stile' || x.part === 'SHELF' && x.thickness === 6), 'no bought part is a cut row');
  const cut = r.panels.filter((p) => p.material_role !== 'bought');
  const front = cut.filter((p) => p.material_role === 'front').reduce((s, p) => s + p.area_m2 * p.qty, 0);
  const board = cut.filter((p) => p.material_role !== 'front').reduce((s, p) => s + p.area_m2 * p.qty, 0);
  assert.ok(Math.abs(bom.totals.front_area_m2 - front) < 1e-3);
  assert.ok(Math.abs(bom.totals.board_area_m2 - board) < 1e-3);
  // The purchase list: no m2 for a bought part (the LED stile maps to a corner post, the glass to a shelf).
  const q = buildCabinetPartQtys(r, e.unit, { profile: P });
  assert.equal(q.corner_post, undefined, 'the LED stile is not a post of board');
  assert.ok(Math.abs(q.shelf.m2 - r.panels.find((p) => p.id === 'BOX-TOP').area_m2) < 1e-6, 'the only SHELF board is the box\'s lid');
  // …and it reads the lines the registry knows: the hinges and their plates, the pins, the strip, the vanity's hanger.
  assert.deepEqual([q.hinge.pcs, q.hinge_plate.pcs, q.shelf_pin.pcs, q.vanity_hanger.pcs], [9, 9, 60, 2]);
  assert.ok(Math.abs(q.led_strip.m - 2.176) < 1e-9);
  // A timber stile IS cut: it stays a row.
  const timber = buildBom([entry(kit({}, { stile: 'timber' }))], { profile: P });
  assert.equal(timber.units[0].rows.filter((x) => x.part === 'MIRROR-STILE').length, 2);
});

test('F4 . the fused spur by the electrician is a NOTE row, manual, counted in nothing', () => {
  const bom = buildBom([entry(kit())], { profile: P });
  const notes = bom.units[0].rows.filter((x) => x.material_role === 'note');
  assert.deepEqual(notes.map((x) => [x.part, x.material_label, x.readiness, x.qty, x.area_m2]),
    [['MIRROR-SPUR', 'NOTE: Fused spur by electrician: it feeds the LED driver 24 V in the bottom box', 'manual', 1, 0]]);
  assert.ok(!bom.cutRows.some((x) => x.part === 'MIRROR-SPUR'), 'merged with nothing');
});

test('F4 . the articles are empty strings for the owner; typed, each prints on its own line', () => {
  assert.ok(Object.values(P.mirror.articles).every((a) => a === ''), 'every article empty');
  for (const l of lines()) assert.ok(!l.spec_label.includes(' · ') || l.role === 'hinges', `${l.role} names no article`);
  const typed = {
    ...P,
    mirror: {
      ...P.mirror,
      articles: {
        ...P.mirror.articles, ledPanel: 'LP-75', mirror: 'MIR-4', glassShelf: 'GS-6', ledDriver: 'DRV-24', hanger: 'HG-50', fusedSpur: 'FS-13A',
      },
    },
  };
  const r = computeCabinet(kit(), P);
  const ls = mirrorCabinetOrderLines(r, typed);
  assert.equal(of(ls, 'mirror_led_panel')[0].spec_label, 'LP-75 · 75 x 937 mm');
  assert.equal(of(ls, 'mirror_led_panel')[0].spec.article, 'LP-75');
  assert.equal(of(ls, 'mirror_m2')[0].spec_label, 'MIR-4 · on the doors');
  assert.equal(of(ls, 'mirror_glass_shelf')[0].spec_label, 'GS-6 · 336.5 x 177 mm');
  assert.equal(of(ls, 'mirror_led_driver')[0].spec_label, 'DRV-24 · in the bottom box, for the LED panels and the strips');
  assert.equal(of(ls, 'vanity_hangers')[0].spec_label, 'HG-50 · in the sides\' hanger cut-outs');
  assert.match(mirrorCabinetNotes(r, typed)[0].material_label, /^NOTE: Fused spur by electrician \(FS-13A\): /);
});

test('F4 . the BOM merges two cabinets, the ironmongery prints the lines; every other unit\'s BOM is what it was', () => {
  const two = buildBom([entry(kit(), 'a'), entry(kit({ unit_num: '02' }), 'b')], { profile: P });
  const hw = (role) => two.hardware.filter((h) => h.role === role);
  assert.deepEqual(hw('mirror_led_panel').map((h) => [h.qty, h.units]), [[4, ['01', '02']]]);
  assert.deepEqual(hw('mirror_m2').map((h) => h.qty), [2.1194]);
  assert.equal(sum(hw('mirror_glass_shelf')), 30);
  // The ironmongery block of the BOM panel prints every line (a named spec until the owner fills the article).
  const one = entry(kit());
  const iron = ironmongerySummary({ entries: [one], bom: buildBom([one], { profile: P }), design: null, profile: P });
  for (const label of ['LED light panel, made to measure, 4000 K, 75 x 937', 'Mirror 4 mm', 'Glass shelf 6 mm toughened, 336.5 x 177',
    'Glass shelf 6 mm toughened, 533 x 177', 'LED strip under', 'LED strip inside', 'LED driver 24 V', P.mirror.hangers.name]) {
    assert.ok(iron.some((l) => l.label === label), `the ironmongery prints ${label}`);
  }
  assert.equal(iron.filter((l) => l.role === 'hinges').reduce((s, l) => s + l.qty, 0), 9);
  // No other kit carries a mirror cabinet's line or a bought part.
  for (const type of UNIT_TYPE_ORDER) {
    if (type === 'MIRROR_CABINET') continue;
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01' }, P);
    assert.deepEqual(mirrorCabinetOrderLines(r, P), [], type);
    assert.deepEqual(mirrorCabinetNotes(r, P), [], type);
    assert.ok(!r.panels.some((p) => p.material_role === 'bought'), `${type} has no bought part`);
  }
});

test('F4 . the hinges follow the kit\'s ladder: a taller, heavier door buys what the kit says', () => {
  for (const height of [700, 1100, 1600]) {
    const r = computeCabinet(kit({ height }), P);
    const ls = mirrorCabinetOrderLines(r, P);
    assert.equal(sum(of(ls, 'hinges')), r.derived.mirror.hingesTotal, `${height}`);
    assert.deepEqual(of(ls, 'hinges').flatMap((l) => l.spec.door_kg).sort(),
      r.derived.mirror.doors.map((d) => d.weightKg).sort(), 'every door weighed once');
  }
});
