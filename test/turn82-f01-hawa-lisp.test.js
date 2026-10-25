/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F1 · THE LISP OF THE HAWA POCKET, FIRST (reference/lisp/KIT_HAWA.lsp)
//
// CLAUDE.md T82 F1: *"A new kit in the house grammar (SKYLON_COMMON), named
// sections D1 to Dn, every number with its HAWA page in a comment."* and the
// turn's own law: *"The manufacturer's sheet is the law of the hardware"*.
// The owner, 25.10.2026, 13:40: *"zaczniemy od hawa dodanie"*.
//
// The kit's routines are RUN here (test/lisp-mini.js) on the kit's own worked
// examples and held to its NUMBERS block, sentence by sentence; every number
// of profile.hawa is read off the LISP by the census's own constant reader and
// held to the profile key that mirrors it; the two weight tables are parsed
// and held to the LISP's rows cell for cell. Nothing in computeCabinet moves
// in F1: no existing kit reads a hawa key.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

import { loadLisp } from './lisp-mini.js';
import { parenBalance, balanceOfKits, lispConstant } from '../scripts/t57-paren-balance.mjs';
import { DEFAULT_CABINET_PROFILE, migrateCabinetProfile } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url).pathname;
const KIT = 'KIT_HAWA.lsp';
const TEXT = readFileSync(`${ROOT}reference/lisp/${KIT}`, 'utf8');
const L = loadLisp(TEXT);
const H = DEFAULT_CABINET_PROFILE.hawa;
const PROSE = TEXT.split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
const say = (s) => assert.ok(PROSE.includes(s), `the kit states: ${s}`);
const K = (name) => lispConstant(name, `${ROOT}reference/lisp`, KIT);
const call = (name, ...args) => L.call(name, ...args);
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-3, `${msg}: ${a} is not ${b}`);
const json = (rel) => JSON.parse(readFileSync(`${ROOT}${rel}`, 'utf8'));

// ═══ THE FILE ════════════════════════════════════════════════════════════

test('F1 · KIT_HAWA.lsp: the Skylon header, ASCII, no dash, and a NEW file beside an untouched folder', () => {
  assert.ok(TEXT.startsWith(';;; Copyright (c) 2026 Skylon Development Ltd. All rights reserved.'));
  const inframe = readFileSync(`${ROOT}reference/lisp/KIT_INFRAME.lsp`, 'utf8');
  assert.equal(TEXT.split('\n').slice(0, 5).join('\n'), inframe.split('\n').slice(0, 5).join('\n'), 'the house header, line for line');
  assert.ok(/^[\x00-\x7F]*$/.test(TEXT), 'ASCII (AutoCAD\'s loader)');
  assert.doesNotMatch(TEXT, /[\u2013\u2014]/, 'no em or en dash');
  assert.match(TEXT, /^;;; Command: HAWA_FULL$/m);
  assert.match(TEXT, /^;;; Requires: SKYLON_COMMON\.lsp loaded first/m);
  // Against the turn's base, where git can answer: the folder gains files and no existing one moves.
  const base = spawnSync('git', ['merge-base', 'HEAD', 'd0f84ebe'], { cwd: ROOT, encoding: 'utf8' });
  if (base.status === 0 && base.stdout.trim()) {
    const rows = spawnSync('git', ['diff', '--name-status', base.stdout.trim(), '--', 'reference/lisp'], { cwd: ROOT, encoding: 'utf8' })
      .stdout.split('\n').filter(Boolean);
    for (const row of rows) assert.match(row, /^A\treference\/lisp\/KIT_[A-Z_]+\.lsp$/, `only new kits, no existing one moved: ${row}`);
  }
});

test('F1 · the owner\'s words of 25.10.2026 head the kit, folded to ASCII', () => {
  for (const words of [
    'musimy zrobic nowy projekt i zakodowac w kuchni nowy system to sie nazywa hawa III sa to drzwi ktore sa pocket doors',
    'potrzebujemy zaprojektowac to jako wstawienie pomiedzy 2 panele 110 mm przestrzen pomiedzy, wysuwasz pocket door i zakrywasz szafke lub szafki',
    'zaczniemy od hawa dodanie',
    'panele po bokach to jest nie carcas tylko front zawsze, wiec jesli jest 18 mm to daj zawsze 22 mm automatycznie, i napisz informacje minimum 19 mm',
    'raczej zawsze wystaja troche wiec nie ma problemu',
    '"3 tak moga", "4 - tak", "5 - tak"',
    'The manufacturer\'s sheet is the law of the hardware',
  ]) say(words);
});

test('F1 · parens 0/0, no ) before its (, and the census reads the new kit', () => {
  const scan = parenBalance(TEXT);
  assert.equal(scan.balance, 0, `${scan.open} open, ${scan.close} close`);
  assert.equal(scan.negativeAt, null, 'no ) before its (');
  assert.ok(scan.open > 100, 'a kit, not a stub');
  assert.ok(balanceOfKits(`${ROOT}reference/lisp`).some((r) => r.name === KIT), 'the census reads it');
});

test('F1 · the sections: D1 to D22 as decisions, then CONSTANTS, ROUTINES (a) to (i), NUMBERS, THE COMMAND', () => {
  for (let d = 1; d <= 22; d += 1) assert.match(TEXT, new RegExp(`^;;; D${d} {1,2}[A-Z]`, 'm'), `D${d}`);
  assert.doesNotMatch(TEXT, /^;;; D23 /m, 'twenty-two, as the header says');
  for (const head of ['1. THE LAW IN ONE PARAGRAPH', '2. DECISIONS', '3. CONSTANTS', '4. ROUTINES', '5. NUMBERS', '6. THE COMMAND']) {
    assert.match(TEXT, new RegExp(`^;;; ${head.replace('.', '\\.')}`, 'm'), head);
  }
  for (const s of ['(a) THE PANELS, THE WIDTH, THE HEIGHTS', '(b) THE DOOR\'S WIDTH AND ITS CLASS', '(c) THE DEPTH',
    '(d) THE DOOR\'S DRILLING', '(e) THE PANELS\' HOLES', '(f) THE CUT', '(g) THE DOOR OPEN', '(h) THE HAND, THE SETS, THE COVER',
    '(i) THE CHECKS, IN WORDS']) {
    assert.ok(TEXT.includes(`;;; ---- ${s}`), s);
  }
});

test('F1 · every routine is defined once, in this kit and no other; no routine of KIT_INFRAME is reused', () => {
  const routines = ['hawa-mm', 'hawa-panel-t', 'hawa-panel-swap-p', 'hawa-panel-ok-p', 'hawa-clear', 'hawa-width', 'hawa-cap',
    'hawa-eh', 'hawa-th', 'hawa-z', 'hawa-share', 'hawa-round', 'hawa-tb', 'hawa-kg', 'hawa-table', 'hawa-th-min', 'hawa-th-max',
    'hawa-hinges', 'hawa-allowed-kg', 'hawa-class-fits-p', 'hawa-class', 'hawa-t1-max', 'hawa-t1-need', 'hawa-depth',
    'hawa-depth-ok-p', 'hawa-track-length', 'hawa-lookup', 'hawa-ta', 'hawa-cup-vs', 'hawa-steel-length', 'hawa-steel-rows',
    'hawa-steel-us', 'hawa-steel-grooves', 'hawa-door-holes', 'hawa-row', 'hawa-track-last', 'hawa-b-bracket', 'hawa-b-holes',
    'hawa-a-holes', 'hawa-foot', 'hawa-door-box', 'hawa-cut', 'hawa-door-open', 'hawa-system-hand', 'hawa-set-name',
    'hawa-connector-name', 'hawa-check-37', 'hawa-check-37-cover', 'hawa-check-38', 'hawa-check-47', 'hawa-join',
    'createhawalayers', 'hawa-draw-hole', 'c:hawa_full'];
  for (const r of routines) assert.ok(L.has(r), `${r} defined`);
  const defs = (text) => [...text.replace(/;.*$/gm, '').matchAll(/\(defun\s+([^\s(]+)/g)].map((m) => m[1].toLowerCase());
  const mine = defs(TEXT);
  assert.equal(new Set(mine).size, mine.length, 'no routine defined twice');
  for (const other of readdirSync(`${ROOT}reference/lisp`).filter((n) => n.endsWith('.lsp') && n !== KIT)) {
    const theirs = new Set(defs(readFileSync(`${ROOT}reference/lisp/${other}`, 'utf8')));
    for (const name of mine) assert.ok(!theirs.has(name), `${other} already defines ${name}`);
  }
});

// ═══ THE CONSTANTS AND THE PROFILE ══════════════════════════════════════

// Every number of profile.hawa, by the LISP constant that states it.
const MIRROR = [
  ['hawaPocketOne', H.pocketClearMm.one], ['hawaPocketTwo', H.pocketClearMm.two],
  ['hawaPanelMin', H.panelMinMm], ['hawaPanelThinFront', H.panelThinFrontMm], ['hawaPanelAMin', H.panelAMinMm],
  ['hawaBoardT', H.topBottomMm], ['hawaBottomMin', H.bottomMinMm], ['hawaTopMin', H.topMinMm], ['hawaCapOne', H.connectorCapMm],
  ['hawaHardwareZone', H.hardwareZoneMm], ['hawaZoneTop', H.zoneTopMm], ['hawaZoneBottom', H.zoneBottomMm],
  ['hawaProfileW', H.profileSymbolMm.w], ['hawaProfileD', H.profileSymbolMm.d],
  ['hawaZ1', H.gaps.z1], ['hawaZ2', H.gaps.z2], ['hawaZ3', H.gaps.z3], ['hawaZ5', H.gaps.z5], ['hawaZFront', H.gaps.front],
  ['hawaSMin', H.door.sMinMm], ['hawaSMax', H.door.sMaxMm], ['hawaTBMin', H.door.tbMinMm], ['hawaTBMax', H.door.tbMaxMm],
  ['hawaRound', H.door.roundMm],
  ['hawaTH25Min', H.classes[25].thMinMm], ['hawaTH25Max', H.classes[25].thMaxMm], ['hawaKg25', H.classes[25].maxKg],
  ['hawaHinges25', H.classes[25].hinges],
  ['hawaTH35Min', H.classes[35].thMinMm], ['hawaTH35Max', H.classes[35].thMaxMm], ['hawaKg35', H.classes[35].maxKg],
  ['hawaHinges35', H.classes[35].hinges],
  ['hawaDensity', H.doorDensityKgPerM3],
  ['hawaT1Plus', H.depth.t1PlusMm], ['hawaMPlus', H.depth.mPlusMm], ['hawaMLess', H.depth.mLessMm], ['hawaT1Min', H.depth.t1MinMm],
  ['hawaTrackMax', H.depth.trackMaxMm], ['hawaTrackLess', H.depth.trackLessMm], ['hawaTrackStart', H.depth.trackStartMm],
  ['hawaRear', H.rearAllowanceMm],
  ['hawaCupD', H.hinge.cupDiaMm], ['hawaCupDepth', H.hinge.cupDepthMm], ['hawaCupFromEnd', H.hinge.cupFromEndMm],
  ['hawaScrewD', H.hinge.screwDiaMm], ['hawaScrewDepth', H.hinge.screwDepthMm], ['hawaScrewPitch', H.hinge.screwPitchMm],
  ['hawaScrewIn', H.hinge.screwInMm], ['hawaSleeveD', H.hinge.sleeveDiaMm], ['hawaSleeveDepth', H.hinge.sleeveDepthMm],
  ['hawaSleeveFromEnd', H.hinge.sleeveFromEndMm],
  ['hawaSteelTop', H.steel.topMm], ['hawaSteelBottom', H.steel.bottomMm], ['hawaSteelFirst', H.steel.firstMm],
  ['hawaSteelPitch', H.steel.pitchMm], ['hawaSteelPlus', H.steel.plusMm], ['hawaGrooveW', H.steel.grooveWidthMm],
  ['hawaGrooveDepth', H.steel.grooveDepthMm],
  ['hawaPitch', H.holes.pitchMm],
  ['hawaBTopAxis', H.holes.b.topAxisMm], ['hawaBTopFirst', H.holes.b.topFirstMm], ['hawaBBottomAxis', H.holes.b.bottomAxisMm],
  ['hawaBBottomFirst', H.holes.b.bottomFirstMm], ['hawaBracketLess', H.holes.b.bracketLessMm],
  ['hawaBracketW', H.holes.b.bracketWidthMm], ['hawaBracketH', H.holes.b.bracketHeightMm],
  ['hawaATopAxis', H.holes.a.topAxisMm], ['hawaATopFirst', H.holes.a.topFirstMm], ['hawaABottomAxis', H.holes.a.bottomAxisMm],
  ['hawaABottomFirst', H.holes.a.bottomFirstMm], ['hawaABracketPitch', H.holes.a.bracketPitchMm],
  ['hawaABracketGapLess', H.holes.a.bracketGapLessMm], ['hawaAPadFrom', H.holes.a.padFromMm], ['hawaAPadTop', H.holes.a.padTopMm],
  ['hawaAPadBottom', H.holes.a.padBottomMm], ['hawaTrackHoleEnd', H.holes.trackHoleEndMm],
  ['hawaPilotD', H.holes.pilotDiaMm], ['hawaPilotDepth', H.holes.pilotDepthMm],
  ['hawaFootD', H.foot.diaMm], ['hawaFootFrom', H.foot.fromMm],
];

/** Every number a plain object holds, as [path, value], deep. */
function numbersOf(obj, path = 'hawa') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const p = `${path}.${k}`;
    if (typeof v === 'number') return [[p, v]];
    if (v && typeof v === 'object' && !Array.isArray(v)) return numbersOf(v, p);
    return [];
  });
}

test('F1 · every number of profile.hawa is a LISP constant of the same value, written as a real, its source beside it', () => {
  for (const [name, value] of MIRROR) {
    assert.equal(K(name), value, `${name} is profile ${value}`);
    const line = TEXT.split('\n').find((l) => l.startsWith(`(defun ${name} ( / ) `));
    assert.ok(line, `${name} is a one-line constant`);
    assert.match(line, new RegExp(`^\\(defun ${name} \\( / \\) -?[0-9]+\\.[0-9]+\\)`), `${name} is written as a real`);
    assert.match(line, /\)\s+; .*(160704|169313|52676|31418|52679|PROPOSED|the owner|CLAUDE\.md)/, `${name} names its source: ${line}`);
  }
  // ...and the mirror misses nothing: every number of profile.hawa outside the two hinge tables is one of them.
  const mirrored = MIRROR.map(([, v]) => v);
  const loose = numbersOf(H).filter(([p]) => !/^hawa\.hinge\.ta[12]\./.test(p) && !/^hawa\.classes\.\d+$/.test(p));
  assert.equal(loose.length, MIRROR.length, `${loose.length} numbers in profile.hawa, ${MIRROR.length} constants: ${loose.map(([p]) => p).join(', ')}`);
  for (const [p, v] of loose) assert.ok(mirrored.includes(v), `${p} = ${v} has no constant`);
});

test('F1 · the TA tables: the profile\'s rows are the LISP\'s, and the cup axis stands 31 from the half pocket\'s outer boundary (D2)', () => {
  const ta1 = call('hawaTA1Table');
  const ta2 = call('hawaTA2Table');
  assert.deepEqual(ta1, Object.entries(H.hinge.ta1).map(([z, ta]) => [Number(z), ta]));
  assert.deepEqual(ta2, Object.entries(H.hinge.ta2).map(([z, ta]) => [Number(z), ta]));
  for (const [z, ta] of ta1) assert.equal(ta + z, 31, `160704: TA1 ${ta} + Z3 ${z}`);
  for (const [z, ta] of ta2) assert.equal(ta + z / 2, 31, `169313: TA2 ${ta} + Z5 ${z} / 2`);
  assert.equal(call('hawa-ta', 1), 28, 'Z3 3: TA1 28');
  assert.equal(call('hawa-ta', 2), 29.5, 'Z5 3: TA2 29.5');
  say('TA1 + Z3 = 31 for every row of 160704');
  say('TA2 + Z5 / 2 = 31 for every row of 169313');
});

test('F1 · the profile names the article, the layers, Push and the tables the LISP names', () => {
  assert.equal(H.articles.setPushLeft, '408.30.711', 'the NBS sheet\'s code, PROPOSED');
  assert.ok(TEXT.includes('408.30.711'), 'the LISP names it (D22)');
  for (const [k, v] of Object.entries(H.articles)) if (k !== 'setPushLeft') assert.equal(v, '', `${k}: empty for the owner`);
  for (const layer of Object.values(H.layers)) {
    assert.ok(TEXT.includes(`"${layer}"`), `${layer} is a layer the LISP draws on`);
  }
  // AMENDED AFTER THE REVIEW (T82 F5, KIT_HAWA.lsp D15): the door's three carry their 13 in the name, one layer one depth.
  for (const layer of ['HAWA_3MM', 'FRONT_HINGES_5MM_D13', 'FRONT_HINGES_8MM_D13', 'HAWA_FOOT_35MM', 'HAWA_GROOVE_12MM', 'FRONT_HINGES_35MM_D13']) {
    assert.match(TEXT, new RegExp(`\\(command "\\._LAYER" "_N" "${layer}" "_C" "\\d+" "${layer}" ""\\)`), `createHawaLayers makes ${layer}`);
  }
  assert.equal(H.defaults.push, true, '"5 - tak"');
  say('Push is the default.');
  for (const cls of [25, 35]) {
    assert.equal(H.weightTables[cls], `reference/hawa/weight-${cls}.json`);
    assert.ok(existsSync(`${ROOT}${H.weightTables[cls]}`));
    assert.ok(TEXT.includes(`weight-${cls}.json`), 'the LISP names the file');
  }
});

test('F1 · a profile saved before the pocket door comes back with every hawa number (station 5)', () => {
  const old = JSON.parse(JSON.stringify(DEFAULT_CABINET_PROFILE));
  delete old.hawa;
  const back = migrateCabinetProfile(old);
  assert.deepEqual(back.hawa, H);
  const tuned = migrateCabinetProfile({ ...old, hawa: { rearAllowanceMm: 25 } });
  assert.equal(tuned.hawa.rearAllowanceMm, 25, 'a tuned number is kept');
  assert.deepEqual(tuned.hawa.gaps, H.gaps, 'the rest come back');
});

// ═══ THE WEIGHT TABLES ═════════════════════════════════════════════════

test('F1 · weight-25.json and weight-35.json are the LISP\'s rows cell for cell, and the profile\'s reading of them', () => {
  for (const cls of [25, 35]) {
    const doc = json(`reference/hawa/weight-${cls}.json`);
    assert.equal(doc.class, cls);
    assert.match(doc.source, /160704 V07 \(30\.05\.2024\), p1/, 'the drawing and its page');
    assert.match(doc.source, /169313 V06 p1/);
    assert.match(doc.status, /^CONFIRMED/);
    assert.match(doc.reading, /PROPOSED/);
    assert.deepEqual(doc.columns, call('hawaWeightColumns'), 'the columns TB 440 to 750');
    const rows = call(`hawaWeight${cls}`);
    assert.deepEqual(doc.rows.map((r) => [r.th, ...r.kg]), rows, 'row for row, cell for cell');
    const C = H.classes[cls];
    assert.deepEqual(doc.thRange, [C.thMinMm, C.thMaxMm], 'the TH range is the class\'s');
    assert.deepEqual([doc.rows.at(-1).th, doc.rows[0].th], [C.thMinMm, C.thMaxMm], 'the rows run the class\'s range');
    for (let k = 1; k < doc.rows.length; k += 1) assert.equal(doc.rows[k - 1].th - doc.rows[k].th, 50, 'every 50');
    assert.equal(doc.maxKg, C.maxKg);
    assert.equal(Math.max(...doc.rows.flatMap((r) => r.kg)), C.maxKg, 'the largest cell is the class\'s kg');
    assert.equal(doc.columns[0], H.door.tbMinMm);
    assert.equal(doc.columns.at(-1), H.door.tbMaxMm);
    // The allowance FALLS with TB and RISES with TH (the hinges' lever): a door read at the column at or
    // above its TB and the row at or below its TH is read on the safe side (D7).
    for (const r of doc.rows) for (let k = 1; k < r.kg.length; k += 1) assert.ok(r.kg[k] <= r.kg[k - 1], `TH ${r.th}`);
    for (let k = 1; k < doc.rows.length; k += 1) {
      for (let j = 0; j < 7; j += 1) assert.ok(doc.rows[k].kg[j] <= doc.rows[k - 1].kg[j], `TH ${doc.rows[k].th} TB ${doc.columns[j]}`);
    }
  }
  // Spot cells against hawa-numbers.md section 1 (the transcript of 160704 p1).
  const w25 = json('reference/hawa/weight-25.json');
  const w35 = json('reference/hawa/weight-35.json');
  const cell = (doc, th, tb) => doc.rows.find((r) => r.th === th).kg[doc.columns.indexOf(tb)];
  assert.equal(cell(w25, 1200, 750), 11);
  assert.equal(cell(w25, 2200, 700), 25);
  assert.equal(cell(w25, 2200, 750), 24);
  assert.equal(cell(w35, 1900, 750), 25);
  assert.equal(cell(w35, 2700, 440), 35);
});

// ═══ (a) THE PANELS, THE WIDTH ═══════════════════════════════════════════

test('F1 (a) · the panels are front: 22 on an 18 front with note #47, the front\'s own from 19; the widths 99, 154, 105', () => {
  assert.equal(call('hawa-panel-t', 18), 22);
  assert.equal(call('hawa-panel-t', 19), 19);
  assert.equal(call('hawa-panel-t', 25), 25);
  assert.equal(call('hawa-panel-swap-p', 18), true);
  assert.equal(call('hawa-panel-swap-p', 19), null);
  assert.equal(call('hawa-panel-ok-p', 18), true);
  assert.equal(call('hawa-check-47', 18), '#47 HAWA pocket panels 22: the hardware panel needs 19 mm minimum');
  assert.equal(call('hawa-check-47', 19), null);
  assert.equal(call('hawa-width', 1, 18), 99);
  assert.equal(call('hawa-width', 2, 18), 154);
  assert.equal(call('hawa-width', 1, 25), 105);
  assert.equal(call('hawa-width', 2, 19), 148);
  say('The widths: 99 (one door, 18 front), 154 (two doors, 18 front), 105 (one door, 25 front), 148 (two doors, 19 front).');
  say('22 + 55 + 22 = 99 and 22 + 110 + 22 = 154 on an 18 front, 25 + 55 + 25 = 105 on a 25 one.');
});

// ═══ EXAMPLE 1 ════════════════════════════════════════════════════════════

test('F1 · EXAMPLE 1, one door hand R on an 18 front beside a BUD 500 on a 580 run: TB 572.5, T1 567, M 100.5, III/25', () => {
  const tb = call('hawa-tb', 1, 18, 500, 1.5);
  const th = call('hawa-th', 1, 2100);
  const eh = call('hawa-eh', 1, 2100);
  assert.deepEqual([tb, eh, th], [572.5, 2057.5, 2051.5]);
  const d = call('hawa-depth', 1, tb, 580, 18);
  assert.deepEqual(d, [567, 100.5, 472, 580], 'T1 M E1 KT');
  assert.equal(d[0], tb + K('hawaT1Plus') + K('hawaZ3') - d[1], 'T1 = TB + 92 + Z3 - M');
  assert.equal(d[2], tb - d[1], 'E1 = TB - M');
  assert.ok(d[1] >= 18 + 3 && d[1] <= tb - 320, 'M within HAWA\'s limits');
  assert.equal(call('hawa-depth-ok-p', 1, tb, 580, 18), true);
  assert.equal(call('hawa-check-38', 1, tb, 580, 18), null);
  assert.equal(call('hawa-track-length', d[0]), 560);
  near(call('hawa-kg', tb, th, 18, 700), 14.7985, 'the door\'s kg');
  assert.equal(call('hawa-allowed-kg', 25, th, tb), 25, 'the cell 2050 x 600');
  assert.equal(call('hawa-class', th, tb, 18, 700, null), 25);
  assert.equal(call('hawa-hinges', 25), 3);
  assert.deepEqual(call('hawa-cup-vs', 25, th), [200, 1025.75, 1851.5]);
  const holes = call('hawa-door-holes', 1, 25, tb, th, d[1]);
  assert.deepEqual(holes.filter((h) => h[0] === 'FRONT_HINGES_35MM_D13').map((h) => [h[1], h[2], h[3], h[4]]),
    [[28, 200, 35, 13], [28, 1025.75, 35, 13], [28, 1851.5, 35, 13]]);
  assert.deepEqual(holes.filter((h) => h[0] === 'FRONT_HINGES_5MM_D13').map((h) => [h[1], h[2]]),
    [[37, 226], [37, 174], [37, 1051.75], [37, 999.75], [37, 1877.5], [37, 1825.5]]);
  assert.deepEqual(holes.filter((h) => h[0] === 'FRONT_HINGES_8MM_D13').map((h) => [h[1], h[2], h[3], h[4]]), [[28, 22, 8, 13], [28, 2029.5, 8, 13]]);
  // Panel B.
  const b = call('hawa-b-holes', d[0], eh);
  assert.deepEqual(b.filter((h) => h[2] === 2035.5).map((h) => h[1]), [32, 192, 352, 512]);
  assert.deepEqual(b.filter((h) => h[2] === 41).map((h) => h[1]), [60, 220, 380, 540]);
  assert.deepEqual(call('hawa-b-bracket', d[0], eh), [512, 1028.75, 534, 1098.75], 'from half of EH UP 70 (D12)');
  assert.deepEqual(b.at(-1).slice(0, 3), ['HAWA_3MM', 523, 1063.75]);
  for (const h of b) assert.deepEqual(h.slice(3), [3, 10], 'the pilots fi 3 x 10');
  // Panel A.
  const a = call('hawa-a-holes', 18, d[0], d[2], eh);
  assert.deepEqual(a.filter((h) => h[2] === 2047.5).map((h) => h[1]), [66, 226, 386, 546], 'four, as drawn');
  assert.deepEqual(a.filter((h) => h[2] === 22).map((h) => h[1]), [41, 105, 301, 365]);
  assert.deepEqual(a.filter((h) => h[1] === 61).map((h) => h[2]), [1997.5, 60], 'the two pads');
  assert.deepEqual(call('hawa-foot', 1, 18, 18), ['HAWA_FOOT_35MM', 49.5, 39, 35, 18], 'through the 18 board');
  // The cut.
  const cut = call('hawa-cut', 1, 'R', 18, 2100, 580, 500, 1.5);
  assert.deepEqual(cut.map((p) => p[1]), ['POCKET-BOTTOM', 'POCKET-A', 'POCKET-B', 'POCKET-TOP', 'POCKET-DOOR']);
  const byId = Object.fromEntries(cut.map((p) => [p[1], p]));
  assert.deepEqual(byId['POCKET-BOTTOM'].slice(2), [99, 601, 18, [0, 0, 0, 99, 18, 601]]);
  assert.deepEqual(byId['POCKET-A'].slice(2), [601, 2057.5, 22, [0, 18, 0, 22, 2057.5, 601]], 'A flush with the door\'s face (D2 D4)');
  assert.deepEqual(byId['POCKET-B'].slice(2), [580, 2057.5, 22, [77, 18, 0, 22, 2057.5, 580]], 'B on the carcass front plane');
  assert.deepEqual(byId['POCKET-TOP'].slice(2), [99, 601, 18, [0, 2082, 0, 99, 18, 601]], 'on the 6.5 cap');
  assert.deepEqual(byId['POCKET-DOOR'].slice(2), [572.5, 2051.5, 18, [25, 21, 583, 572.5, 2051.5, 18]], '3 proud, Z3 inside A');
  assert.deepEqual(call('hawa-door-open', 1, 'R', null, 18, 2100, 580, 500, 1.5), [42, 21, 108, 18, 2051.5, 572.5]);
  const left = Object.fromEntries(call('hawa-cut', 1, 'L', 18, 2100, 580, 500, 1.5).map((p) => [p[1], p]));
  assert.equal(left['POCKET-B'][5][0], 0);
  assert.equal(left['POCKET-A'][5][0], 77);
  assert.equal(left['POCKET-DOOR'][5][0], -498.5);
  assert.equal(call('hawa-door-open', 1, 'L', null, 18, 2100, 580, 500, 1.5)[0], 39);
  assert.equal(call('hawa-set-name', 25, true, 'R'), 'Hawa Concepta III 25 Push, left');
  assert.equal(call('hawa-connector-name', 1), 'Hawa Connector 55');
  say('TB 572.5 (500 + 22 + 52 - 1.5). T1 567 (the track caps the 580), M 100.5, E1 472, KT 580.');
  say('the cell 2050 x 600 allows 25: III/25, 3 hinges.');
  say('B\'s top row at v 2035.5: 32 192 352 512; its bottom row at v 41: 60 220 380 540; the bracket footprint (512 1028.75 534 1098.75), its pilot (523 1063.75).');
  say('its connector row at v 2047.5: 66 226 386 546; its brackets at v 22: 41 105 301 365; its pads (61 1997.5) and (61 60).');
  say('The door closed at x 25 to 597.5, z 583 to 601; open at x 42 to 60, z 108 to 680.5.');
  say('The set "Hawa Concepta III 25 Push, left", the connector "Hawa Connector 55".');
});

// ═══ EXAMPLE 2 ════════════════════════════════════════════════════════════

test('F1 · EXAMPLE 2, two doors on a 19 front, H 2400: TB 521 each, III/35 above 2200, the steel rows and their holes', () => {
  const tb = call('hawa-tb', 2, 19, 450, 1.5);
  const th = call('hawa-th', 2, 2400);
  assert.deepEqual([tb, call('hawa-eh', 2, 2400), th], [521, 2364, 2358], 'no cap over the 110');
  const d = call('hawa-depth', 2, tb, 600, 19);
  assert.deepEqual(d, [567, 49, 472, 587], 'KT = T1 + RE, under the cabinet\'s 600');
  assert.equal(call('hawa-class', th, tb, 19, 700, null), 35);
  assert.equal(call('hawa-hinges', 35), 4);
  const cups = call('hawa-cup-vs', 35, th);
  assert.equal(cups.length, 4);
  near(cups[1], 852.6667, 'the second cup');
  assert.equal(cups[3], 2158);
  assert.deepEqual(call('hawa-steel-rows', th), [2261, 21], '100 - Z1 below the top, 24 - Z2 above the bottom');
  assert.deepEqual(call('hawa-steel-us', tb, d[1]), [464, 112], 'M + 8 = 57 and 409 from the free edge');
  assert.equal(call('hawa-steel-length', tb, d[1]), 475, 'TB - M + 3');
  assert.deepEqual(call('hawa-steel-grooves', tb, th, d[1]), [[0, 2255, 475, 2267], [0, 15, 475, 27]]);
  const holes = call('hawa-door-holes', 2, 35, tb, th, d[1]);
  assert.equal(holes.filter((h) => h[0] === 'FRONT_HINGES_35MM_D13').length, 4);
  assert.ok(holes.filter((h) => h[0] === 'FRONT_HINGES_35MM_D13').every((h) => h[1] === 29.5), 'TA2 29.5');
  assert.equal(holes.filter((h) => h[0] === 'FRONT_HINGES_8MM_D13').length, 2 + 4, 'two sleeves and two holes on each profile');
  const cut = call('hawa-cut', 2, null, 19, 2400, 600, 450, 1.5);
  assert.deepEqual(cut.map((p) => [p[0], p[1]]), [['POCKET-BOTTOM', 'POCKET-BOTTOM'], ['POCKET-B', 'POCKET-B-L'], ['POCKET-B', 'POCKET-B-R'],
    ['POCKET-TOP', 'POCKET-TOP'], ['POCKET-DOOR', 'POCKET-DOOR-L'], ['POCKET-DOOR', 'POCKET-DOOR-R']], 'both panels are B (D20)');
  const byId = Object.fromEntries(cut.map((p) => [p[1], p]));
  assert.deepEqual(byId['POCKET-BOTTOM'].slice(2, 4), [148, 609]);
  assert.deepEqual(byId['POCKET-B-R'][5], [129, 18, 0, 19, 2364, 587]);
  assert.deepEqual(byId['POCKET-DOOR-L'][5], [-448.5, 21, 590, 521, 2358, 19]);
  assert.deepEqual(byId['POCKET-DOOR-R'][5], [75.5, 21, 590, 521, 2358, 19]);
  assert.equal(byId['POCKET-DOOR-R'][5][0] - (byId['POCKET-DOOR-L'][5][0] + tb), 3, 'Z5 between the two doors');
  assert.deepEqual(call('hawa-door-open', 2, null, 'L', 19, 2400, 600, 450, 1.5), [36, 21, 115, 19, 2358, 521]);
  assert.deepEqual(call('hawa-door-open', 2, null, 'R', 19, 2400, 600, 450, 1.5), [93, 21, 115, 19, 2358, 521]);
  assert.equal(call('hawa-connector-name', 2), 'Hawa Connector 110');
  assert.equal(call('hawa-set-name', 35, true, 'L'), 'Hawa Concepta III 35 Push, right');
  assert.equal(call('hawa-set-name', 35, null, 'R'), 'Hawa Concepta III 35 Pull, left');
  say('TB 521 each (450 + 19 + 53.5 - 1.5). T1 567, M 49, E1 472, KT 587 (567 + 20), the boards 148 x 609.');
  say('The steel rows at v 2261 and 21, the holes at u 464 and 112 (M + 8 = 57 and 409 from the free edge; 761 is off the profile), the profile 475 long, the grooves (0 2255 475 2267) and (0 15 475 27).');
  say('The doors closed: L at x -448.5 to 72.5, R at x 75.5 to 596.5, z 590 to 609. Open: L at x 36 to 55, R at x 93 to 112, z 115 to 636.');
});

// ═══ EXAMPLES 3 TO 5: THE FLUSH CASE, THE REFUSALS, THE CLASS ═══════════

test('F1 · EXAMPLE 3, the flush case: M under S + 3 becomes S + 3 and the pocket is shallower than the cabinet', () => {
  const tb = call('hawa-tb', 1, 19, 380, 1.5);
  assert.equal(tb, 449.5);
  const d = call('hawa-depth', 1, tb, 567, 19);
  assert.deepEqual(d, [522.5, 22, 427.5, 542.5]);
  assert.equal(call('hawa-track-length', d[0]), 515.5);
  const b = call('hawa-b-holes', d[0], 2000);
  assert.deepEqual(b.filter((h) => h[2] === 1978).map((h) => h[1]), [32, 192, 352, 512]);
  assert.deepEqual(b.filter((h) => h[2] === 41).map((h) => h[1]), [60, 220, 380]);
  assert.equal(b.at(-1)[1], 478.5);
  say('TB 449.5; M from T1 567 would be -22.5, so M 22 and T1 522.5, E1 427.5, KT 542.5; the tracks 515.5; B\'s top row 32 192 352 512, its bottom row 60 220 380, the bracket\'s pilot at u 478.5.');
});

test('F1 · EXAMPLE 4, #38: a 569.5 door on a 350 wall cabinet needs a pocket 415 deep, in words', () => {
  const tb = call('hawa-tb', 1, 19, 500, 1.5);
  assert.equal(tb, 569.5);
  assert.deepEqual(call('hawa-depth', 1, tb, 350, 19), [350, 314.5, 255, 350]);
  assert.equal(call('hawa-depth-ok-p', 1, tb, 350, 19), null);
  const s = '#38 HAWA: the door 569.5 needs a pocket 415 deep on a 350 cabinet; make the cabinet deeper or the door narrower';
  assert.equal(call('hawa-check-38', 1, tb, 350, 19), s);
  say(`"${s}".`);
  assert.equal(call('hawa-t1-max'), 567, 'the 560 track');
  assert.equal(call('hawa-t1-need', 1), 415, '412 + Z3');
  assert.equal(call('hawa-t1-need', 2), 415, '412 + Z5');
  // The 750 door on a 580 cabinet: T1 567, M 278 (D8), not refused.
  const d750 = call('hawa-depth', 1, 750, 580, 19);
  assert.deepEqual(d750.slice(0, 2), [567, 278]);
  assert.equal(call('hawa-check-38', 1, 750, 580, 19), null);
  say('So a 750 door on a 580 cabinet takes T1 567 and stands M 278 proud');
});

test('F1 · EXAMPLE 5, #37 and the class: TB, S and TH out of range, the class by weight, the override kept, the drawer unit refused', () => {
  const tb = call('hawa-tb', 1, 19, 700, 1.5);
  assert.equal(tb, 769.5);
  assert.equal(call('hawa-check-37', 1, tb, 2051.5, 19, 700, null), '#37 HAWA door out of range: TB 769.5 (440 to 750)');
  assert.equal(call('hawa-check-37', 1, 500, 2000, 30, 700, null), '#37 HAWA door out of range: S 30 (18 to 26)');
  assert.match(call('hawa-check-37', 1, 500, 2800, 19, 700, null), /^#37 HAWA door out of range: TH 2800 \(1200 to 2700\)$/);
  assert.match(call('hawa-check-37', 1, 500, 1100, 19, 700, null), /TH 1100 \(1200 to 2700\)/);
  // By weight: 26.9 kg past the 25 table's 22, within the 35 table's 27: III/35 below 2200.
  near(call('hawa-kg', 750, 2051.5, 25, 700), 26.9259375, 'the kg');
  assert.equal(call('hawa-allowed-kg', 25, 2051.5, 750), 22);
  assert.equal(call('hawa-allowed-kg', 35, 2051.5, 750), 27);
  assert.equal(call('hawa-class', 2051.5, 750, 25, 700, null), 35);
  assert.equal(call('hawa-check-37', 1, 750, 2051.5, 25, 700, null), null);
  // Too heavy for 25, too short for 35.
  assert.equal(call('hawa-class', 1500, 750, 26, 700, null), null);
  const heavy = '#37 HAWA door out of range: a door of 20.5 kg at TH 1500 x TB 750 is past the III/25 and the III/35 tables';
  assert.equal(call('hawa-check-37', 1, 750, 1500, 26, 700, null), heavy);
  say(`"${heavy}"`);
  // The class flips at 2200 ("the class flips to 35 above 2200", CLAUDE.md F3).
  assert.equal(call('hawa-class', 2200, 600, 19, 700, null), 25);
  assert.equal(call('hawa-class', 2201, 600, 19, 700, null), 35);
  // The owner's override is kept where it carries the door, and refused in words where it does not.
  assert.equal(call('hawa-class', 2051.5, 572.5, 18, 700, 35), 35);
  assert.equal(call('hawa-class', 1500, 572.5, 18, 700, 35), null, '1500 is below III/35');
  assert.match(call('hawa-check-37', 1, 572.5, 1500, 18, 700, 35), /is past the III\/35 table$/);
  // The cell: TH 2051.5 reads the 2050 row (down), TB 650.5 the 700 column (up).
  assert.equal(call('hawa-allowed-kg', 25, 2051.5, 650.5), 24, 'the 700 column of the 2050 row');
  assert.equal(call('hawa-allowed-kg', 25, 2099, 750), 22, 'the 2050 row, not the 2100 row\'s 23');
  assert.equal(call('hawa-allowed-kg', 25, 1199, 600), null, 'below the table');
  assert.equal(call('hawa-allowed-kg', 25, 2000, 751), null, 'past its last column');
  assert.equal(call('hawa-check-37-cover', '03'), '#37 HAWA door out of range: unit 03 has drawer fronts; the pocket door covers doors only');
  say('A covered drawer unit 03: "#37 HAWA door out of range: unit 03 has drawer fronts; the pocket door covers doors only".');
  say('At TH 2200 the class is III/25, at 2201 III/35.');
});

test('F1 · the readings this kit takes against CLAUDE.md\'s worked numbers are written in it, with the sheet\'s reason', () => {
  say('CLAUDE.md F3\'s worked "599 (500 + 99)" assumed the door covers A as well; on 160704 it cannot (D2)');
  say('CLAUDE.md F1(d) and hawa-numbers.md 2.5 say "below"; the sheet is the law');
  say('(CLAUDE.md\'s "M 265 with T1 580" needs a 573 track HAWA does not supply)');
  say('every hole of A is dimensioned from A\'s front edge with an S in it (S + 48, S + 23, S + 43');
});
