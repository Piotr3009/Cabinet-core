/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T82 F2, F3 · THE POCKET IS A UNIT, AND ITS DOOR ─────────────────────────
//
// CLAUDE.md T82 F3: *"Tests test/turn82-f03-hawa-door.test.js: a BUD 500 beside
// a one-door pocket on a 580 run gives TB = 599 (500 + 99), T1 = 567 at most, M
// by the formula; a 750 door on a 580 run stands M = 265 proud (T1 580 = 750 +
// 92 + 3 - M); a 750 door whose M would pass TB - 320 is refused with Check #38;
// the class flips to 35 above 2200; one door over two narrow units ("3 tak
// moga") gives TB = their span + the pocket."*
//
// The owner, 25.10.2026, 11:40: *"potrzebujemy zaprojektowac to jako wstawienie
// pomiedzy 2 panele 110 mm przestrzen pomiedzy, wysuwasz pocket door i
// zakrywasz szafke lub szafki"*; 13:46: *"panele po bokach to jest nie carcas
// tylko front zawsze, wiec jesli jest 18 mm to daj zawsze 22 mm automatycznie,
// i napisz informacje minimum 19 mm"*, *"raczej zawsze wystaja troche wiec nie
// ma problemu"*, *"3 tak moga"*, *"4 - tak, 5 - tak"*.
//
// LISP IS LAW. reference/lisp/KIT_HAWA.lsp was written first (slice A1, F1);
// src/engine/hawaPocket.js mirrors it routine for routine and the engine cuts
// what it returns. This file RUNS the kit's routines (test/lisp-mini.js) on the
// kit's own worked examples and on a grid around them and holds the mirror,
// the cut and the figures to the kit's answers. Where CLAUDE.md F3's list and
// the kit differ, the kit wins and the test says why:
//   - TB: the door covers its own panel B, the cabinet and the clear less Z3,
//     never panel A (D2, D6; 160704's top view), and the house's 1.5 at the
//     free edge: the BUD 500 on an 18 front is 500 + 22 + (55 - 3) - 1.5 =
//     572.5, not 599 (which assumed the door over A) and not the walk's 592
//     (the mockup's 18 + 55 + 19 pocket of before the 13:46 panel rule).
//   - T1 is capped at 567 (the 560 track is T1 - 7): the 750 door on a 580
//     run stands M = 278 proud, not 265 (T1 580 needs a 573 track).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_TYPES, UNIT_TYPE_ORDER, UNIT_NUM_PREFIX, defaultParamsFor, isHawaPocket,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import { ELEMENT_TO_PART_ID } from '../src/engine/partRegistry.js';
import * as H from '../src/engine/hawaPocket.js';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const L = loadLisp(readFileSync(`${ROOT}reference/lisp/KIT_HAWA.lsp`, 'utf8'));
const K = H.hawaSpec(P);

/** A pocket's engine params: the kit's defaults, a run's height, the project's front, what it covers. */
function pocket({
  doors = 1, hand = 'R', cls = null, push = true, frontT = 18, height = 2100, cover = null, unitNum = 'HP01', depth = 580,
} = {}) {
  return {
    ...defaultParamsFor('HAWA_POCKET', P),
    unit_num: unitNum,
    height,
    depth,
    front_t: frontT,
    pocket: {
      doors, hand: doors === 2 ? null : hand, push, cls, covers: (cover?.doors || []).flatMap((d) => d.units || []),
    },
    ...(cover ? { pocket_cover: cover } : {}),
  };
}
/** One door over `span` of cabinets `KT1` deep, the free edge at a run end (the house's 1.5, rule 6). */
const coverOne = (span, KT1 = 580, { side = 'R', free = 1.5, units = ['b'], drawerFronts = [] } = {}) => ({
  doors: [{
    side, units, spanMm: span, KT1, freeEndClearanceMm: free, drawerFronts,
  }],
});
const coverTwo = (span, KT1, free = 1.5) => ({
  doors: ['L', 'R'].map((side) => ({
    side, units: [side.toLowerCase()], spanMm: span, KT1, freeEndClearanceMm: free,
  })),
});
const fig = (params) => H.hawaPocketFigures(params, P);
const door = (f, side = null) => (side ? f.doors.find((d) => d.side === side) : f.doors[0]);
const box = (l) => ({
  x: l[0], y: l[1], z: l[2], w: l[3], h: l[4], d: l[5],
});

// ═══ F2 · THE TYPE ══════════════════════════════════════════════════════════

test('F2 · HAWA_POCKET is a unit of the run: its LISP, prefix HP, legs, the floor, the cornice, the type order', () => {
  const t = UNIT_TYPES.HAWA_POCKET;
  assert.equal(t.id, 'HAWA_POCKET');
  assert.equal(t.label, 'HAWA pocket (Concepta III)');
  assert.equal(t.lisp, 'KIT_HAWA.lsp', 'LISP is law: the kit names its LISP');
  assert.equal(t.carcass.top, 'pocket');
  assert.equal(t.mount, 'floor', 'it stands on the run\'s plinth line');
  assert.equal(t.legs, true, 'legs as a cabinet (the run\'s plinth spans it)');
  assert.ok(!t.freePanel, 'a unit, not a free board');
  assert.equal(t.supports.topInfill, false, 'a base run\'s worktop goes over it');
  assert.equal(t.supports.cornice, true, 'the cornice does not break at it');
  assert.equal(t.supports.doors, false, 'no house door: its door is the HAWA door');
  assert.equal(t.heightGroup, 'tall', 'Concepta doors are 1200 to 2700: a tall run\'s, moved with it');
  assert.equal(t.family, undefined, 'both libraries show it');
  assert.ok(isHawaPocket('HAWA_POCKET'));
  assert.ok(!isHawaPocket('BUD'));
  assert.equal(UNIT_TYPE_ORDER.at(-2), 'HAWA_POCKET', 'in the order, the free panel still last');
  assert.equal(UNIT_NUM_PREFIX.HAWA_POCKET, 'HP');
});

test('F2 · born with its choices and its width before it covers anything (A + 55 + B at the workshop\'s front)', () => {
  const d = defaultParamsFor('HAWA_POCKET', P);
  assert.deepEqual(d.pocket, {
    doors: 1, hand: 'R', push: true, cls: null, covers: [],
  }, 'Push by default ("5 - tak"), the class by F3, one door covering the right');
  assert.equal(d.width, L.call('hawa-width', 1, P.front.thickness), 'the default profile\'s 25 front: 25 + 55 + 25');
  assert.equal(d.width, 105);
  assert.equal(d.height, P.tallUnit.defaults.height, 'a tall run\'s height until the store matches it');
  assert.equal(H.hawaPocketWidth({ doors: 2, frontT: 18 }, P), 154);
});

test('F2 · the width is the two panels and the clear: 99, 154, 105, 148, the LISP\'s own (D1)', () => {
  assert.equal(fig(pocket({ frontT: 18 })).widthMm, 99);
  assert.equal(fig(pocket({ frontT: 18, doors: 2 })).widthMm, 154);
  assert.equal(fig(pocket({ frontT: 25 })).widthMm, 105);
  assert.equal(fig(pocket({ frontT: 19, doors: 2 })).widthMm, 148);
  for (const doors of [1, 2]) {
    for (const t of [16, 18, 19, 22, 25, 26]) assert.equal(fig(pocket({ doors, frontT: t })).widthMm, L.call('hawa-width', doors, t));
  }
  assert.equal(fig(pocket()).clearMm, 55, '160704, Connector 55');
  assert.equal(fig(pocket({ doors: 2 })).clearMm, 110, '169313, Connector 110');
});

test('F1(a) · the pocket panels are the FRONT, 22 when the front is 18, and #47 says so', () => {
  const thin = fig(pocket({ frontT: 18 }));
  assert.deepEqual(thin.panel, { t: 22, swapped: true });
  assert.deepEqual(thin.notes, [{ n: 47, code: 'HAWA_PANEL_22', message: '#47 HAWA pocket panels 22: the hardware panel needs 19 mm minimum' }]);
  assert.equal(thin.notes[0].message, L.call('hawa-check-47', 18));
  const thick = fig(pocket({ frontT: 25 }));
  assert.deepEqual(thick.panel, { t: 25, swapped: false });
  assert.deepEqual(thick.notes, [], 'no swap, no note');
  assert.equal(L.call('hawa-check-47', 25), null);
});

// ═══ F3 · THE DOOR (CLAUDE.md F3's list, the kit's answers) ════════════════

test('F3 · a BUD 500 beside a one-door pocket on a 580 run, 18 front: TB 572.5, T1 567, M by the formula (EXAMPLE 1)', () => {
  const f = fig(pocket({ cover: coverOne(500, 580) }));
  const d = door(f);
  assert.equal(d.TB, 572.5, '500 + 22 + (55 - 3) - 1.5: the door covers B, the clear less Z3, the cabinet');
  assert.equal(d.TB, L.call('hawa-tb', 1, 18, 500, 1.5));
  assert.equal(f.EH, 2057.5, '2100 - 18 - 18 - 6.5');
  assert.equal(d.TH, 2051.5, 'EH less Z1 and Z2');
  assert.equal(d.S, 18);
  assert.equal(d.T1, 567, 'the cabinet\'s 580, capped by the 560 track (T1 - 7)');
  assert.equal(d.M, d.TB + 92 + 3 - d.T1, 'M = TB + 92 + Z3 - T1');
  assert.equal(d.M, 100.5);
  assert.equal(d.E1, 472, 'E1 = TB - M');
  assert.equal(f.KT, 580, 'KT = T1 + RE 20, capped at KT1');
  assert.equal(d.trackMm, 560);
  assert.equal(d.cls, 25);
  assert.equal(d.clsAuto, true);
  assert.equal(d.hinges, 3);
  assert.equal(d.TA, 28, 'TA1 28 at Z3 3');
  assert.deepEqual(d.cupY, [200, 1025.75, 1851.5]);
  assert.equal(Math.round(d.weightKg * 10) / 10, 14.8);
  assert.equal(d.maxKg, 25, 'the cell 2050 x 600');
  assert.equal(d.steelMm, null, 'III/25 carries no steel profile');
  assert.equal(d.hawaHand, 'left', 'hand R orders HAWA\'s left-hand set (D16)');
  assert.equal(d.setName, 'Hawa Concepta III 25 Push, left');
  assert.equal(f.connectorName, 'Hawa Connector 55');
  assert.equal(d.hingeEdge, 'L', 'the cups on the pocket side');
  assert.deepEqual(d.closed, {
    x: 25, y: 21, z: 583, w: 572.5, h: 2051.5, d: 18,
  }, 'Z3 inside panel A, 3 in front of the fronts');
  assert.equal(d.closed.x + d.closed.w, 99 + 500 - 1.5, 'the free edge where a lay-on front\'s edge stands');
  assert.deepEqual(d.open, {
    x: 42, y: 21, z: 108, w: 18, h: 2051.5, d: 572.5,
  }, 'square to the front, 17 off B, E1 behind the plane, M before it');
  assert.equal(f.ok, true);
  assert.deepEqual(f.refusals, []);
});

test('F3 · the 750 door on a 580 run stands M = 278 proud (T1 567, the 560 track), never T1 580', () => {
  assert.deepEqual(H.depthOf(1, 750, 580, 18, K), [567, 278, 472, 580]);
  assert.deepEqual(H.depthOf(1, 750, 580, 18, K), L.call('hawa-depth', 1, 750, 580, 18));
  assert.equal(H.check38(1, 750, 580, 18, K), null);
});

test('F3 · the flush case: M = S + 3 and the pocket shallower than the cabinet (EXAMPLE 3)', () => {
  const f = fig(pocket({ frontT: 19, depth: 567, cover: coverOne(380, 567) }));
  const d = door(f);
  assert.equal(d.TB, 449.5);
  assert.equal(d.M, 22);
  assert.equal(d.T1, 522.5);
  assert.equal(d.E1, 427.5);
  assert.equal(f.KT, 542.5);
  assert.equal(f.frontAlignMm, 567 - 542.5, 'the store stands it off by this so its front is the cabinet\'s');
  assert.equal(d.trackMm, 515.5);
});

test('F3 · #38: a door whose M would pass TB - 320 is refused in the kit\'s words, never clamped (EXAMPLE 4)', () => {
  const f = fig(pocket({ frontT: 19, depth: 350, cover: coverOne(500, 350) }));
  const d = door(f);
  assert.equal(d.TB, 569.5);
  assert.equal(d.T1, 350);
  assert.equal(d.M, 314.5, 'the M the cabinet gives, stated');
  const r = f.refusals.find((x) => x.n === 38);
  assert.equal(r.message, '#38 HAWA: the door 569.5 needs a pocket 415 deep on a 350 cabinet; make the cabinet deeper or the door narrower');
  assert.equal(r.message, L.call('hawa-check-38', 1, 569.5, 350, 19));
  assert.equal(f.ok, false);
  // The 750 door CLAUDE.md names: on a cabinet under 415 its M passes TB - 320.
  assert.match(H.check38(1, 750, 400, 18, K), /^#38 HAWA: the door 750 needs a pocket 415 deep on a 400 cabinet/);
  assert.equal(H.depthOf(1, 750, 400, 18, K)[1], 445, '445 > 750 - 320');
});

test('F3 · the class flips to III/35 above 2200 (2200 is III/25, 2201 III/35): four hinges, the steel profile TB - M + 3', () => {
  const at = (th) => door(fig(pocket({ height: th + 48.5, cover: coverOne(500, 580) })));
  assert.equal(at(2200).TH, 2200);
  assert.equal(at(2200).cls, 25);
  assert.equal(at(2201).cls, 35);
  assert.equal(at(2201).hinges, 4);
  assert.equal(at(2201).steelMm, at(2201).TB - at(2201).M + 3);
  assert.equal(at(2201).cls, L.call('hawa-class', 2201, 572.5, 18, 700, null));
});

test('F3 · the class by WEIGHT: past the III/25 table at its cell, within the III/35 (EXAMPLE 5)', () => {
  // TH 2051.5 x TB 750 x S 25 at 700 kg/m3 = 26.9 kg: III/25 allows 22 at 2050 x 750, III/35 27.
  assert.equal(Math.round(H.kgOf(750, 2051.5, 25, 700) * 10) / 10, 26.9);
  assert.equal(H.allowedKg(25, 2051.5, 750), 22);
  assert.equal(H.allowedKg(35, 2051.5, 750), 27);
  assert.equal(H.classOf(2051.5, 750, 25, 700, null, K), 35);
  // TH 1500 x TB 750 x S 26: 20.5 kg, past III/25's 15 and under III/35's 1900.
  assert.equal(H.check37(1, 750, 1500, 26, 700, null, K),
    '#37 HAWA door out of range: a door of 20.5 kg at TH 1500 x TB 750 is past the III/25 and the III/35 tables');
});

test('F3 · the class the owner sets is kept, and a door outside it is refused in words (#37), never switched', () => {
  const f = fig(pocket({ height: 2301 + 48.5, cls: 25, cover: coverOne(500, 580) }));
  const d = door(f);
  assert.equal(d.clsAsked, 25);
  assert.equal(d.clsAuto, false);
  assert.equal(d.cls, null, 'III/25 does not carry a 2301 door: refused, not switched to 35');
  assert.equal(d.holes.length, 0, 'a refused door is not drilled (the LISP\'s command drills a door with a class)');
  const r = f.refusals.find((x) => x.n === 37);
  assert.match(r.message, /^#37 HAWA door out of range: a door of .* kg at TH 2301 x TB 572.5 is past the III\/25 table$/);
  assert.equal(r.message, L.call('hawa-check-37', 1, 572.5, 2301, 18, 700, 25));
  const ok = door(fig(pocket({ height: 2301 + 48.5, cls: 35, cover: coverOne(500, 580) })));
  assert.equal(ok.cls, 35);
});

test('F3 · one door over two narrow units ("3 tak moga"): their span, B and the clear; past 750 refused', () => {
  const two = door(fig(pocket({ cover: coverOne(600, 580, { units: ['b', 'c'] }) })));
  assert.equal(two.TB, 600 + 22 + 52 - 1.5);
  assert.deepEqual(two.covers, ['b', 'c']);
  const three = fig(pocket({ cover: coverOne(900, 580, { units: ['b', 'c', 'd'] }) }));
  assert.equal(door(three).TB, 972.5);
  assert.deepEqual(three.refusals.map((x) => x.message), ['#37 HAWA door out of range: TB 972.5 (440 to 750)']);
  // EXAMPLE 5: span 700 on a 19 front.
  assert.equal(H.check37(1, H.tbOf(1, 19, 700, 1.5, K), 2051.5, 19, 700, null, K), '#37 HAWA door out of range: TB 769.5 (440 to 750)');
});

test('F3 · S is the project\'s front, 18 to 26; TH 1200 to 2700; outside, #37 in words', () => {
  assert.ok(fig(pocket({ frontT: 16, cover: coverOne(500) })).refusals.some((x) => x.message.includes('S 16 (18 to 26)')));
  assert.equal(H.check37(1, 600, 2000, 30, 700, null, K), '#37 HAWA door out of range: S 30 (18 to 26)');
  assert.deepEqual(fig(pocket({ frontT: 26, cover: coverOne(500) })).refusals, []);
  assert.ok(fig(pocket({ height: 2800, cover: coverOne(500) })).refusals.some((x) => x.message.includes('TH 2751.5 (1200 to 2700)')));
  assert.ok(fig(pocket({ height: 770, cover: coverOne(500) })).refusals.some((x) => x.n === 37), 'a base run is not Concepta\'s');
});

test('F3 · a covered unit with drawer fronts is refused in words (#37, D17), the door kept', () => {
  const f = fig(pocket({ cover: coverOne(500, 580, { drawerFronts: ['DR01'] }) }));
  assert.ok(f.refusals.some((x) => x.message === '#37 HAWA door out of range: unit DR01 has drawer fronts; the pocket door covers doors only'));
  assert.equal(L.call('hawa-check-37-cover', 'DR01'), '#37 HAWA door out of range: unit DR01 has drawer fronts; the pocket door covers doors only');
  assert.equal(door(f).TB, 572.5, 'never a silent change of the door');
});

test('F3 · two doors in one 110 pocket: each its cabinet, its B and half the pocket less Z5 / 2 (EXAMPLE 2)', () => {
  const f = fig(pocket({
    doors: 2, frontT: 19, height: 2400, depth: 600, cover: coverTwo(450, 600),
  }));
  assert.equal(f.widthMm, 148);
  assert.equal(f.TH, 2358);
  for (const side of ['L', 'R']) {
    const d = door(f, side);
    assert.equal(d.TB, 521);
    assert.equal(d.T1, 567);
    assert.equal(d.M, 49);
    assert.equal(d.cls, 35, 'TH over 2200');
    assert.equal(d.TA, 29.5, 'TA2 29.5 at Z5 3');
    assert.equal(d.steelMm, 475);
    assert.deepEqual(d.grooves, [[0, 2255, 475, 2267], [0, 15, 475, 27]]);
  }
  assert.equal(f.KT, 587);
  assert.deepEqual([door(f, 'L').closed.x, door(f, 'L').closed.x + 521], [-448.5, 72.5]);
  assert.deepEqual([door(f, 'R').closed.x, door(f, 'R').closed.x + 521], [75.5, 596.5]);
  assert.equal(door(f, 'R').closed.x - (door(f, 'L').closed.x + 521), 3, 'Z5 3 between the two doors');
  assert.deepEqual([door(f, 'L').open.x, door(f, 'R').open.x, door(f, 'L').open.z], [36, 93, 115]);
  assert.equal(door(f, 'L').setName, 'Hawa Concepta III 35 Push, right');
  assert.equal(door(f, 'R').setName, 'Hawa Concepta III 35 Push, left');
  assert.equal(f.connectorName, 'Hawa Connector 110');
});

// ═══ THE CUT (computeCabinet cuts what KIT_HAWA.lsp cuts) ════════════════════

test('F2/F3 · computeCabinet cuts hawa-cut part for part: ids, sizes, thicknesses, boxes (EXAMPLE 1, both hands; EXAMPLE 2)', () => {
  const cases = [
    { doors: 1, hand: 'R', frontT: 18, h: 2100, kt1: 580, span: 500 },
    { doors: 1, hand: 'L', frontT: 18, h: 2100, kt1: 580, span: 500 },
    { doors: 2, hand: null, frontT: 19, h: 2400, kt1: 600, span: 450 },
    { doors: 1, hand: 'R', frontT: 25, h: 2250, kt1: 600, span: 650 },
    { doors: 1, hand: 'R', frontT: 19, h: 2000, kt1: 567, span: 380 },
  ];
  for (const c of cases) {
    const cover = c.doors === 2 ? coverTwo(c.span, c.kt1) : coverOne(c.span, c.kt1, { side: c.hand });
    const params = pocket({
      doors: c.doors, hand: c.hand || 'R', frontT: c.frontT, height: c.h, depth: c.kt1, cover,
    });
    const r = computeCabinet(params, P);
    const kit = L.call('hawa-cut', c.doors, c.hand || 'R', c.frontT, c.h, c.kt1, c.span, 1.5);
    assert.deepEqual(
      r.panels.map((p) => [p.part, p.id, p.w, p.h, p.thickness, p.box]),
      kit.map(([part, id, w, h, t, b]) => [part, id, w, h, t, box(b)]),
      `the cut of ${JSON.stringify(c)}`,
    );
  }
  // EXAMPLE 1, hand L: B at x 0, A at x 77, the door at x -498.5 to 74.
  const l = computeCabinet(pocket({ hand: 'L', cover: coverOne(500, 580, { side: 'L' }) }), P);
  const by = (part) => l.panels.find((p) => p.part === part);
  assert.deepEqual([by('POCKET-B').box.x, by('POCKET-A').box.x], [0, 77]);
  assert.deepEqual([by('POCKET-DOOR').box.x, by('POCKET-DOOR').box.x + by('POCKET-DOOR').box.w], [-498.5, 74]);
  assert.deepEqual([l.hawa.doors[0].open.x, l.hawa.doors[0].open.x + 18], [39, 57]);
});

test('F2/F3 · the parts are named with the unit, the panels front material, the boards carcass, the door its own role', () => {
  const params = pocket({ cover: coverOne(500, 580) });
  const r = computeCabinet(params, P);
  const by = (part) => r.panels.find((p) => p.part === part);
  for (const part of ['POCKET-A', 'POCKET-B']) {
    assert.equal(by(part).role, 'pocket_panel');
    assert.equal(by(part).material_role, 'front', 'the owner: "nie carcas tylko front zawsze"');
    assert.equal(by(part).finish_exposed, true);
    assert.equal(by(part).thickness, 22);
  }
  for (const part of ['POCKET-TOP', 'POCKET-BOTTOM']) {
    assert.equal(by(part).role, 'pocket_board');
    assert.equal(by(part).material_role, 'board', 'a top and a bottom in the carcass finish (CLAUDE.md F6)');
  }
  const d = by('POCKET-DOOR');
  assert.equal(d.role, 'pocket_door', 'no house front law reaches it: no trim, no handle, no Blum ladder');
  assert.equal(d.material_role, 'front');
  assert.deepEqual(r.panels.map((p) => p.meta.pocket.kind), ['bottom', 'A', 'B', 'top', 'door']);
  for (const p of r.panels) assert.ok(ELEMENT_TO_PART_ID[p.part], `${p.part} is in the part registry`);
  assert.ok(r.csvLines.some((x) => x.startsWith('HP01,POCKET-DOOR,573,2052,')));
  assert.equal(r.csvLines.length, r.panels.length);
  // ONE derivation: the engine publishes what it cut from.
  assert.deepEqual(r.hawa, H.hawaPocketFigures(params, P));
  assert.ok(r.warnings.some((w) => w.code === 'HAWA_PANEL_22'));
  assert.equal(r.totals.legs > 0, true, 'it stands on legs as a cabinet does');
});

test('F5 hand-off · the holes are the LISP\'s, in its face frames, on meta.pocket.holes', () => {
  const params = pocket({ cover: coverOne(500, 580) });
  const r = computeCabinet(params, P);
  const by = (part) => r.panels.find((p) => p.part === part).meta.pocket.holes;
  const f = r.hawa;
  const d = f.doors[0];
  assert.deepEqual(by('POCKET-B'), L.call('hawa-b-holes', d.T1, f.EH));
  assert.deepEqual(by('POCKET-A'), L.call('hawa-a-holes', 18, d.T1, d.E1, f.EH));
  assert.deepEqual(by('POCKET-BOTTOM'), [L.call('hawa-foot', 1, 18, 18)]);
  assert.deepEqual(by('POCKET-DOOR'), L.call('hawa-door-holes', 1, 25, d.TB, d.TH, d.M));
  assert.deepEqual(by('POCKET-B').map((x) => x[1]).slice(0, 4), [32, 192, 352, 512], 'EXAMPLE 1: B\'s top row');
  assert.deepEqual(by('POCKET-A').slice(-2).map((x) => [x[1], x[2]]), [[61, 1997.5], [61, 60]], 'the pads');
  assert.deepEqual(by('POCKET-TOP'), []);
});

test('F3 · pocketCoverOf: the covered units in order become the kit\'s span, KT1 and far', () => {
  const pocketUnit = { id: 'p', type: 'HAWA_POCKET', position: { wall: 0, x_mm: 0 }, params: { ...pocket(), width: 99 } };
  const b = { id: 'b', type: 'BUDTALL', position: { wall: 0, x_mm: 99 }, params: { width: 300, depth: 580, unit_num: '01' } };
  const c = { id: 'c', type: 'BUDTALL', position: { wall: 0, x_mm: 399 }, params: { width: 300, depth: 560, unit_num: '02' } };
  assert.deepEqual(H.pocketCoverOf(pocketUnit, [b], P), {
    doors: [{
      side: 'R', units: ['b'], unitNums: ['01'], spanMm: 300, KT1: 580, far: 'none', freeEndClearanceMm: 1.5, drawerFronts: [],
    }],
  });
  const two = H.pocketCoverOf(pocketUnit, [b, c], P, { beyond: { R: 'wall' } }).doors[0];
  assert.deepEqual([two.spanMm, two.KT1, two.far, two.freeEndClearanceMm], [600, 560, 'wall', 3], 'the shallowest cabinet governs');
  const ended = { ...c, params: { ...c.params, end_panels: [{ side: 'R', thickness: 18 }] } };
  assert.equal(H.pocketCoverOf(pocketUnit, [b, ended], P).doors[0].far, 'endPanel', 'its own end panel past the far edge: 3');
  const drawers = { id: 'd', type: 'BUDR2', position: { wall: 0, x_mm: 99 }, params: { width: 500, depth: 580, unit_num: 'DR01' } };
  assert.deepEqual(H.pocketCoverOf(pocketUnit, [drawers], P).doors[0].drawerFronts, ['DR01']);
  assert.equal(H.pocketCoverOf(pocketUnit, [], P), null, 'nothing covered, no door');
  // The two-door pocket: each unit's side from where it stands.
  const mid = { ...pocketUnit, position: { wall: 0, x_mm: 500 }, params: { ...pocket({ doors: 2 }), width: 154 } };
  const left = { id: 'l', type: 'BUDTALL', position: { wall: 0, x_mm: 0 }, params: { width: 500, depth: 580, unit_num: '01' } };
  const right = { id: 'r', type: 'BUDTALL', position: { wall: 0, x_mm: 654 }, params: { width: 500, depth: 580, unit_num: '02' } };
  assert.deepEqual(H.pocketCoverOf(mid, [left, right], P).doors.map((x) => [x.side, x.spanMm]), [['L', 500], ['R', 500]]);
});

test('F2 · a bare kit (no unit to cover) cuts the pocket and no door, and does not throw', () => {
  const r = computeCabinet(defaultParamsFor('HAWA_POCKET', P), P);
  assert.deepEqual(r.panels.map((p) => p.part), ['POCKET-BOTTOM', 'POCKET-A', 'POCKET-B', 'POCKET-TOP']);
  assert.deepEqual(r.hawa.doors, []);
});

// ═══ LISP IS LAW: THE MIRROR, ROUTINE FOR ROUTINE, ON A GRID ═══════════════

test('F1 mirror · every routine of KIT_HAWA.lsp section 4 answers what its JS mirror answers', () => {
  for (const doors of [1, 2]) {
    assert.equal(H.clearOf(doors, K), L.call('hawa-clear', doors));
    assert.equal(H.capOf(doors, K), L.call('hawa-cap', doors));
    assert.equal(H.zOf(doors, K), L.call('hawa-z', doors));
    assert.equal(H.shareOf(doors, K), L.call('hawa-share', doors));
    assert.equal(H.t1Need(doors, K), L.call('hawa-t1-need', doors));
    assert.equal(H.taOf(doors, K), L.call('hawa-ta', doors));
    assert.equal(H.connectorName(doors), L.call('hawa-connector-name', doors));
    for (const h of [770, 2057, 2100, 2248.5, 2400, 2800]) {
      assert.equal(H.ehOf(doors, h, K), L.call('hawa-eh', doors, h));
      assert.equal(H.thOf(doors, h, K), L.call('hawa-th', doors, h));
    }
  }
  assert.equal(H.t1Max(K), L.call('hawa-t1-max'));
  for (const t of [16, 18, 19, 22, 25]) {
    assert.equal(H.panelT(t, K), L.call('hawa-panel-t', t));
    assert.equal(H.panelSwapP(t, K) ? true : null, L.call('hawa-panel-swap-p', t));
  }
  for (const x of [571.24, 571.25, 571.74, 572.5, 449.49]) assert.equal(H.roundOf(x, K), L.call('hawa-round', x));
  for (const cls of [25, 35]) {
    for (const th of [1199, 1200, 1500, 1899, 1900, 2051.5, 2200, 2201, 2358, 2700, 2701]) {
      assert.equal(H.cupVs(cls, th, K).join(' '), L.call('hawa-cup-vs', cls, th).join(' '));
      assert.deepEqual(H.steelRows(th, K), L.call('hawa-steel-rows', th));
      for (const tb of [430, 440, 449.5, 572.5, 600, 750, 751]) {
        assert.equal(H.allowedKg(cls, th, tb), L.call('hawa-allowed-kg', cls, th, tb), `kg ${cls} ${th} ${tb}`);
        for (const s of [18, 25]) {
          assert.equal(H.classOf(th, tb, s, 700, null, K), L.call('hawa-class', th, tb, s, 700, null), `class ${th} ${tb} ${s}`);
          assert.equal(H.classOf(th, tb, s, 700, cls, K), L.call('hawa-class', th, tb, s, 700, cls));
          assert.equal(H.check37(1, tb, th, s, 700, null, K), L.call('hawa-check-37', 1, tb, th, s, 700, null));
          assert.equal(H.check37(2, tb, th, s, 700, cls, K), L.call('hawa-check-37', 2, tb, th, s, 700, cls));
        }
      }
    }
  }
  for (const doors of [1, 2]) {
    for (const tb of [440, 449.5, 521, 572.5, 750]) {
      for (const kt1 of [300, 350, 400, 414, 500, 567, 580, 600]) {
        for (const s of [18, 19, 26]) {
          assert.deepEqual(H.depthOf(doors, tb, kt1, s, K), L.call('hawa-depth', doors, tb, kt1, s));
          assert.equal(H.check38(doors, tb, kt1, s, K), L.call('hawa-check-38', doors, tb, kt1, s));
        }
      }
      for (const m of [21, 49, 100.5, 278]) {
        assert.equal(H.steelLength(tb, m, K), L.call('hawa-steel-length', tb, m));
        assert.deepEqual(H.steelUs(tb, m, K), L.call('hawa-steel-us', tb, m) || []);
        assert.deepEqual(H.steelGrooves(tb, 2358, m, K), L.call('hawa-steel-grooves', tb, 2358, m));
        for (const cls of [25, 35]) assert.deepEqual(H.doorHoles(doors, cls, tb, 2358, m, K), L.call('hawa-door-holes', doors, cls, tb, 2358, m));
      }
    }
  }
  for (const t1 of [414, 522.5, 567]) {
    assert.equal(H.trackLength(t1, K), L.call('hawa-track-length', t1));
    assert.equal(H.trackLast(t1, K), L.call('hawa-track-last', t1));
    assert.deepEqual(H.bBracket(t1, 2057.5, K), L.call('hawa-b-bracket', t1, 2057.5));
    assert.deepEqual(H.bHoles(t1, 2057.5, K), L.call('hawa-b-holes', t1, 2057.5));
    assert.deepEqual(H.aHoles(18, t1, 472, 2057.5, K), L.call('hawa-a-holes', 18, t1, 472, 2057.5));
  }
  for (const doors of [1, 2]) for (const t of [18, 25]) assert.deepEqual(H.footOf(doors, t, t, K), L.call('hawa-foot', doors, t, t));
  for (const covers of ['L', 'R']) {
    assert.equal(H.systemHand(covers), L.call('hawa-system-hand', covers));
    for (const cls of [25, 35]) for (const push of [true, false]) assert.equal(H.hawaSetName(cls, push, covers), L.call('hawa-set-name', cls, push || null, covers));
  }
  for (const doors of [1, 2]) {
    for (const hand of ['L', 'R']) {
      for (const span of [300, 380, 450, 500, 650, 700]) {
        for (const kt1 of [350, 567, 580, 600]) {
          for (const t of [18, 19, 25]) {
            assert.deepEqual(H.cutOf(doors, hand, t, 2100, kt1, span, 1.5, K), L.call('hawa-cut', doors, hand, t, 2100, kt1, span, 1.5));
            for (const side of ['L', 'R']) {
              assert.deepEqual(H.doorOpenOf(doors, hand, side, t, 2100, kt1, span, 1.5, K), L.call('hawa-door-open', doors, hand, side, t, 2100, kt1, span, 1.5));
            }
          }
        }
      }
    }
  }
});

test('F1 mirror · the engine\'s figures are the LISP\'s for every door of the grid (TB, T1, M, E1, KT, class, boxes)', () => {
  for (const doors of [1, 2]) {
    for (const span of [380, 500, 650]) {
      for (const kt1 of [350, 580, 600]) {
        for (const t of [18, 19, 25]) {
          for (const h of [2100, 2400]) {
            const cover = doors === 2 ? coverTwo(span, kt1) : coverOne(span, kt1);
            const f = fig(pocket({
              doors, frontT: t, height: h, depth: kt1, cover,
            }));
            const tb = L.call('hawa-tb', doors, t, span, 1.5);
            const [t1, m, e1, kt] = L.call('hawa-depth', doors, tb, kt1, t);
            assert.equal(f.KT, kt);
            for (const d of f.doors) {
              assert.deepEqual([d.TB, d.T1, d.M, d.E1, d.TH], [tb, t1, m, e1, L.call('hawa-th', doors, h)]);
              assert.equal(d.cls, L.call('hawa-class', d.TH, tb, t, 700, null));
              assert.deepEqual(d.open, box(L.call('hawa-door-open', doors, 'R', d.side, t, h, kt1, span, 1.5)));
            }
          }
        }
      }
    }
  }
});
