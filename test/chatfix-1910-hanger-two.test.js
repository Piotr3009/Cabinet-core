/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 19.10.2026 · THE SECOND HANGING ROD IN THE SAME BAY ───────────
//
// The owner, 19.10.2026 (09:16, on T79 F11): *"nie ma mozliwosci dodania
// drugiego ponizej, dodaj to prosze, i proponuj (jak polki) 950 jedne od
// drugiego"*; asked "950 mm os do osi, drugi w tym samym bayu pod pierwszym?":
// *"tak ale tylko jako propozycja"*. LISP first: reference/lisp/KIT_HANGER_TWO
// .lsp (D1 two at most, D2 born below or refused in words, D3 the magnet both
// ways, D4 one law one path, D5 the number in the profile). The engine cuts
// every unit-wide hanger after the first as a rod of its own (the column-rail
// law with no column); the store proposes and refuses; the drag offers 950.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildCabinetPartQtys } from '../src/engine/bom.js';
import { rectCorners, migrateRoom } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';
import { GATES, LIVENESS, GOLDENS, LICENSED } from '../scripts/t78-classify.d/f37-owner-1910c.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const OWNER = 'nie ma mozliwosci dodania drugiego ponizej, dodaj to prosze, i proponuj (jak polki) 950 jedne od drugiego';
const H1 = { id: 'h1', kind: 'hanger', pos_mm: 1400, datum: 'bottom', mount: 'alone' };
const H2 = { id: 'h2', kind: 'hanger', pos_mm: 450, datum: 'bottom', mount: 'alone' };
const kit = (items, extra = {}) => ({ ...defaultParamsFor('WARDROBE', P), unit_num: '01', ...extra, sections: [{ width_mm: 600, items }] });
const rods = (r) => [r.assemblies.rail, ...(r.assemblies.columnRails || [])].filter(Boolean);
const brackets = (r) => r.drills.filter((d) => d.kind === 'rail_bracket').map((d) => [d.panel, d.x, d.y]);
const railLines = (r) => r.hardware.filter((h) => h.role === 'rail');

// ═══ THE LISP FIRST ════════════════════════════════════════════════════════

test('KIT_HANGER_TWO.lsp: a new file, the owner\'s header, his words, balanced, ASCII, its five decisions and its routines', () => {
  const text = read('reference/lisp/KIT_HANGER_TWO.lsp');
  assert.match(text, /^;;; Copyright \(c\) 2026 Skylon Development Ltd\. All rights reserved\./);
  assert.ok(text.replace(/\n;;;\s*/g, ' ').includes(OWNER), 'the owner\'s words');
  assert.ok(text.includes('"tak ale tylko jako propozycja"'));
  for (const d of ['D1  TWO AT MOST', 'D2  THE SECOND IS BORN BELOW', 'D3  THE PROPOSAL IS A MAGNET, BOTH WAYS', 'D4  ONE LAW, ONE PATH', 'D5  THE NUMBER LIVES IN THE PROFILE']) {
    assert.ok(text.includes(`;;; ${d}`), d);
  }
  for (const fn of ['hanger-two-axis', 'hanger-two-fits-p', 'hanger-two-catches', 'hanger-two-catch', 'hanger-two-holes', 'c:HANGERTWO_FULL']) {
    assert.ok(text.includes(`(defun ${fn} `), fn);
  }
  assert.match(text, /\(drawWardrobeRailHolesBUL x0BUL y0 szer railAbsY\)/, 'KIT_WARDROBE_FULL\'s routine is CALLED, never copied');
  assert.ok(/^[\x00-\x7F]*$/.test(text), 'ASCII');
  assert.doesNotMatch(text, /[–—]/, 'no em or en dash');
  let depth = 0; let min = 0;
  for (const line of text.split('\n')) {
    let inStr = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (inStr) { if (c === '\\') i += 1; else if (c === '"') inStr = false; continue; }
      if (c === ';') break;
      if (c === '"') inStr = true;
      else if (c === '(') depth += 1;
      else if (c === ')') { depth -= 1; min = Math.min(min, depth); }
    }
  }
  assert.deepEqual([depth, min], [0, 0], 'balanced');
  // The six fossil kits are untouched by this file: it defines no routine of theirs.
  assert.doesNotMatch(text, /\(defun drawWardrobeRailHoles/);
});

// ═══ THE ENGINE: NUMBERS ═══════════════════════════════════════════════════

test('NUMBERS: WARDROBE 600, the first rod at 1418 and the second at 468: four bracket screws, two rail lines of 564, rail count 2', () => {
  const two = computeCabinet(kit([H1, H2]), P);
  assert.deepEqual(two.warnings, []);
  assert.deepEqual(rods(two).map((r) => [r.y, r.x1, r.x2, r.itemId, r.zone ?? null]), [[1418, 18, 582, 'h1', null], [468, 18, 582, 'h2', null]]);
  assert.deepEqual(brackets(two), [['BUL', 275, 1418], ['BUR', 275, 1418], ['BUL', 275, 468], ['BUR', 275, 468]]);
  assert.ok(two.drills.filter((d) => d.kind === 'rail_bracket').every((d) => d.layer === 'SCREWS_3MM' && d.d === 3));
  assert.deepEqual(railLines(two).map((h) => [h.qty, h.spec?.length_mm, h.spec?.zone]), [[1, 564, undefined], [1, 564, undefined]]);
  assert.equal(two.totals.rail, 2);
  const q = buildCabinetPartQtys(two, { type: 'WARDROBE' });
  assert.equal(q.rail_support.pcs, 4, 'four brackets bought');
  assert.equal(Math.round(q.rail_tube.m * 1000), 1128, 'two lengths of tube, 2 x 564');
  // fits: 468 - 15 = 453 above the bottom board's top (18).
  assert.ok(468 - P.hardware.rail.diameter / 2 >= 18);
});

test('one rod is what it always was; a column rod is what it always was; a column takes two as well', () => {
  const one = computeCabinet(kit([H1]), P);
  assert.deepEqual(rods(one).map((r) => r.y), [1418]);
  assert.equal(brackets(one).length, 2);
  assert.equal(railLines(one).length, 1);
  assert.equal(one.totals.rail, 1);
  // The six base goldens, untouched (the gate opens on two unit-wide hangers only).
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(head[id].sha256, base[id].sha256, id);
  // A divided wardrobe: one rod per column (T32 F4) stands; a second hanger in column 0 is a second rod there.
  const divided = (hangers) => computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 1200,
    sections: [{ width_mm: 1200, items: [{ id: 'p1', kind: 'partition', x_mm: 600 }, ...hangers] }],
  }, P);
  const colOne = divided([{ ...H1, zone: 0 }]);
  const colTwo = divided([{ ...H1, zone: 0 }, { ...H2, zone: 0 }]);
  assert.deepEqual(rods(colOne).map((r) => [r.zone, r.y]), [[0, 1418]]);
  assert.deepEqual(rods(colTwo).map((r) => [r.zone, r.y]), [[0, 1418], [0, 468]]);
  assert.equal(colTwo.drills.filter((d) => d.kind === 'rail_bracket').length, 4);
});

// ═══ THE STORE: BORN BELOW, REFUSED IN WORDS, THE MAGNET BOTH WAYS ═════════

const S = () => useProjectStore.getState();
function project() {
  S().loadProject({ id: null, name: 'hanger-two', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {} }, []);
}

test('addHangerRail: the second rod is born 950 under the first; a third is refused in words', () => {
  project();
  const u = S().addUnit('WARDROBE');
  assert.equal(S().hangerRailRefusal(u.id, null), null, 'an empty bay takes a rod');
  assert.equal(S().secondRailAxis(u.id, null), null);
  const a = S().addHangerRail(u.id, {});
  assert.ok(a);
  assert.deepEqual(S().secondRailAxis(u.id, null), { axis: 468, between: 950, first: 1418, floor: 18, fits: true });
  assert.equal(S().hangerRailRefusal(u.id, null), null, 'room for a second');
  const b = S().addHangerRail(u.id, {});
  assert.ok(b && b !== a);
  const items = S().units.find((x) => x.id === u.id).params.sections[0].items.filter((i) => i.kind === 'hanger');
  assert.deepEqual(items.map((i) => [i.id, i.pos_mm, i.mount]), [[a, 1400, 'alone'], [b, 450, 'alone']]);
  assert.deepEqual(rods(S().unitResult(u.id)).map((r) => r.y), [1418, 468]);
  assert.equal(S().hangerRailRefusal(u.id, null), 'This bay already hangs two rails.');
  assert.equal(S().addHangerRail(u.id, {}), null, 'a third is refused');
  // The rod's window reads the second by its item id, not the first's zone.
  assert.equal(S().railTravelFor(u.id, b).axis, 468);
  assert.equal(S().railTravelFor(u.id, a).axis, 1418);
});

test('addHangerRail: no room 950 under a low first rod is refused in words, nothing placed elsewhere', () => {
  project();
  const u = S().addUnit('WARDROBE');
  const a = S().addHangerRail(u.id, {});
  S().setRailHeight(u.id, a, 882);
  assert.equal(S().unitResult(u.id).assemblies.rail.y, 900);
  assert.deepEqual(S().secondRailAxis(u.id, null), { axis: -50, between: 950, first: 900, floor: 18, fits: false });
  assert.equal(S().hangerRailRefusal(u.id, null), 'No room for a second rail 950 mm under this one; raise the first.');
  assert.equal(S().addHangerRail(u.id, {}), null);
  assert.equal(S().units.find((x) => x.id === u.id).params.sections[0].items.filter((i) => i.kind === 'hanger').length, 1);
});

test('the magnet offers 950 under and over the other rod, beside 50 under a shelf; Alt refuses it', () => {
  project();
  const u = S().addUnit('WARDROBE');
  const a = S().addHangerRail(u.id, {});
  const b = S().addHangerRail(u.id, {});
  const forB = S().railMagnetCandidates(u.id, b).filter((c) => c.railItemId);
  assert.deepEqual(forB, [{ pos: 450, axis: 468, between: 950, railItemId: a }], 'under the first; over it is over the top and out of the travel');
  const forA = S().railMagnetCandidates(u.id, a).filter((c) => c.railItemId);
  assert.deepEqual(forA, [{ pos: 1400, axis: 1418, between: 950, railItemId: b }]);
  // A drag of the first rod to 1395 is caught at 1400 (editor.shelfMagnetMm 10); with Alt it stays at 1395.
  const caught = S().moveRail(u.id, a, 1395);
  assert.equal(caught.pos, 1400);
  assert.equal(caught.magnet?.railItemId, b);
  const free = S().moveRail(u.id, a, 1395, { magnet: false });
  assert.equal(free.pos, 1395);
  assert.equal(free.magnet, null);
  // A shelf 50 over the second rod: the shelf's own catch stands beside the rod's.
  S().addItem(u.id, { kind: 'shelf', pos_mm: 700 });
  const both = S().railMagnetCandidates(u.id, b);
  assert.ok(both.some((c) => c.panelId && c.below === 50), 'the shelf offers 50 under it');
  assert.ok(both.some((c) => c.railItemId === a), 'the other rod offers 950');
});

// ═══ THE SCREEN AND ITS COPY ═══════════════════════════════════════════════

test('AddItems asks the store why not and says the second is born under the first; RailModal reads by item id; the retail copies are the machine\'s', () => {
  const add = read('src/components/AddItems.jsx');
  assert.match(add, /const why = hangerRailRefusal\(unit\.id, zone\);\s*if \(why\) \{ notify\(why, 'warn'\); return; \}/);
  assert.match(add, /const second = secondRailAxis\(unit\.id, zone\);/);
  assert.match(add, /Second rail added \$\{formatMm\(second\.between, \{ unit: true \}\)\} under the first/);
  assert.match(add, /disabled: !type\.supports\.rail \|\| \(zones\.length <= 1 && Boolean\(hangerRailRefusal\(unit\.id, null\)\)\)/);
  const modal = read('src/components/RailModal.jsx');
  assert.match(modal, /\(result\?\.assemblies\?\.columnRails \|\| \[\]\)\.find\(\(r\) => r\.itemId === item\.id\)/);
  for (const rel of ['AddItems.jsx', 'RailModal.jsx']) {
    assert.ok(read(`src/retail/design/detail/${rel}`).includes('hangerRailRefusal') || rel === 'RailModal.jsx', `${rel}: the copy carries the change`);
  }
  assert.ok(read('src/retail/design/detail/RailModal.jsx').includes("r.itemId === item.id"));
  assert.equal(P.hardware.hanger.betweenRailsMm, 950, 'the number lives in the profile (KIT_HANGER_TWO.lsp D5)');
});

// ═══ THE GOLDEN AND THE GATE ═══════════════════════════════════════════════

test('golden-rails-two.json is the cut, byte for byte; the gate opens on two unit-wide hangers only; the fragment quotes the owner', () => {
  const g = JSON.parse(read('fixtures/golden-rails-two.json'));
  assert.deepEqual(goldenOf(g.params, P), g.expected);
  assert.equal(GOLDENS[0].file, 'golden-rails-two.json');
  assert.equal(GATES.secondRail.opens(g.params), true);
  assert.equal(GATES.secondRail.opens(kit([H1])), false, 'one hanger');
  assert.equal(GATES.secondRail.opens(kit([{ ...H1, zone: 0 }, { ...H2, zone: 0 }])), false, 'two in a column: the column law of T32, not this gate');
  assert.equal(GATES.secondRail.opens(defaultParamsFor('WARDROBE', P)), false);
  assert.equal(LIVENESS.secondRail().live, true, LIVENESS.secondRail().said);
  for (const { why } of Object.values(LICENSED)) assert.ok(why.includes(OWNER));
});
