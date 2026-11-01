/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F8 . THE LISP OF THE VANITY, FIRST (reference/lisp/KIT_VANITY.lsp)
//
// CLAUDE.md T82 F8: *"Parent KIT_BUDR (the drawer base) with these
// differences, each a named section"*, and the turn's law *"LISP IS LAW
// (every new cut goes to reference/lisp/ FIRST, then the engine mirrors it
// byte for byte)"*. The kit's routines are RUN here (test/lisp-mini.js, the
// T80 reader and evaluator) on the worked example VANITY3 900 x 600 x 500 and
// on the cases its NUMBERS block writes, and their answers are held to the
// owner's numbers, to profile.vanity, to the parent's numbers as the engine
// cuts them today (BUDR2 and BUDR4 box for box) and to the kit's own prose,
// sentence by sentence. Nothing in the engine cuts a vanity in F8: the
// goldens are untouched because computeCabinet reads no profile.vanity key.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadLisp } from './lisp-mini.js';
import { parenBalance, balanceOfKits, lispConstant } from '../scripts/t57-paren-balance.mjs';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const ROOT = new URL('../', import.meta.url).pathname;
const KIT = 'KIT_VANITY.lsp';
const TEXT = readFileSync(`${ROOT}reference/lisp/${KIT}`, 'utf8');
const L = loadLisp(TEXT);
// The prose with its `;;;` and its wrapping folded away, as a person reads it.
const PROSE = TEXT.split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
const say = (s) => assert.ok(PROSE.includes(s), `the kit states: ${s}`);
const K = (name) => lispConstant(name, `${ROOT}reference/lisp`, KIT);
const V = P.vanity;

// The worked example: VANITY3 900 x 600 x 500, G 18, box board 18, front 25.
const EX = [900, 600, 500, 18, 18, 25];
// AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
// the vanity's boxes keep the service void behind them (D9, D27): vanity-boxes takes the void, 80 for the vanity,
// 0 for the parent and the chest.
const VD = 80;
const boxes = (n, columns, dims = EX, vd = VD) => L.call('vanity-boxes', ...dims, n, columns, vd);
const verdict = (n, columns, sinks, dims = EX) => L.call('vanity-trap-verdict', ...dims, n, columns, sinks) || [];

// ═══ THE FILE ════════════════════════════════════════════════════════════

test('F8 . KIT_VANITY.lsp: the Skylon header of KIT_INFRAME, ASCII, no dash, no load at the top level', () => {
  const inframe = readFileSync(`${ROOT}reference/lisp/KIT_INFRAME.lsp`, 'utf8').split('\n').slice(0, 4).join('\n');
  assert.ok(TEXT.startsWith(`${inframe}\n`), 'the four copyright lines of KIT_INFRAME.lsp, byte for byte');
  assert.ok(/^[\x00-\x7F]*$/.test(TEXT), 'ASCII (AutoCAD\'s loader)');
  assert.doesNotMatch(TEXT, /[\u2013\u2014]/, 'no em or en dash');
  assert.doesNotMatch(TEXT.replace(/;.*$/gm, ''), /\(load\b/, 'nothing is loaded from here: the routines need nothing');
  assert.match(TEXT, /^;;; Command: VANITY_FULL$/m);
  assert.match(TEXT, /^;;; Requires: SKYLON_COMMON\.lsp loaded first/m);
});

test('F8 . parens 0/0, a kit not a stub, and the census reads it (turn35-lisp-parens walks it by name too)', () => {
  const b = parenBalance(TEXT);
  assert.equal(b.balance, 0);
  assert.equal(b.negativeAt, null);
  assert.ok(b.open > 300, 'a kit, not a stub');
  const rows = balanceOfKits(`${ROOT}reference/lisp`);
  assert.ok(rows.some((r) => r.name === KIT), 'the census reads it');
  for (const r of rows) assert.equal(r.balance, 0, r.name);
});

test('F8 . every routine is the kit\'s own: no name of another kit, no local that folds onto a parameter', () => {
  const defuns = [...TEXT.replace(/;.*$/gm, '').matchAll(/\(defun\s+([^\s(]+)\s*\(([^)]*)\)/g)];
  assert.ok(defuns.length > 60, `${defuns.length} defuns`);
  const mine = new Set(defuns.map((m) => m[1].toLowerCase()));
  for (const name of mine) assert.match(name, /^(vanity|c:vanity_full)/, `${name} carries the kit's prefix`);
  for (const other of balanceOfKits(`${ROOT}reference/lisp`).map((r) => r.name).filter((n) => n !== KIT)) {
    const code = readFileSync(`${ROOT}reference/lisp/${other}`, 'utf8').replace(/;.*$/gm, '');
    for (const m of code.matchAll(/\(defun\s+([^\s(]+)/g)) {
      assert.ok(!mine.has(m[1].toLowerCase()), `${other} defines ${m[1]} too`);
    }
  }
  // AutoLISP folds case: a local `w` beside a parameter `W` is the same symbol, set to nil on entry.
  for (const [, name, spec] of defuns) {
    const [params, locals = ''] = spec.split('/');
    const ps = new Set(params.trim().split(/\s+/).filter(Boolean).map((s) => s.toLowerCase()));
    for (const l of locals.trim().split(/\s+/).filter(Boolean)) {
      assert.ok(!ps.has(l.toLowerCase()), `${name}: the local ${l} folds onto a parameter`);
    }
  }
  // The routine names the slices that mirror it read.
  for (const r of ['vanity-rails', 'vanity-fronts', 'vanity-boxes', 'vanity-divider', 'vanity-openings',
    'vanity-wastes', 'vanity-trap-u', 'vanity-trap-plan', 'vanity-trap-us', 'vanity-trap-verdict',
    'vanity-u-in-bottom', 'vanity-u-outline', 'vanity-back-pieces', 'vanity-piece-ids', 'vanity-wall-gap',
    'vanity-top-depth', 'vanity-void-note', 'vanity-side-tabs-kept', 'vanity-rail-side-screws',
    'vanity-mount', 'vanity-base-y', 'vanity-hangers', 'vanity-top-cutouts', 'vanity-top-cutout-note',
    'vanity-oval-meets-p', 'vanity-socket-centres', 'vanity-top-back-features', 'vanity-top-back-dropped',
    'vanity-bowl-verdict', 'vanity-double-refused-p', 'vanity-double-refusal', 'c:vanity_full',
    // T83 F8 (D29): the bowl board by board, the U that follows the waste.
    'vanity-u-depth', 'vanity-bowl-enters', 'vanity-bowl-shell', 'vanity-box-boards', 'vanity-bowl-boards', 'vanity-bowl-hits',
    'vanity-bowl-sentence', 'vanity-bowl-refused']) assert.ok(L.has(r), `${r} defined`);
});

test('F8 . the owner\'s words of 25.10.2026 are its D-notes, folded to ASCII, D1 to D26', () => {
  for (const words of [
    'vanity unit (podobna zasada bedzie do chest drawers) vanity unit potrzebuje z szufladami nawierzchniowymi',
    'wybor jak zawsze 2 3 i 4 ale pamietaj ze w vanity default to sa rowne',
    'do tego prosze external drawers ale wybor 2 rows, patrz szafa',
    'plinth do zmiany wysokosc, propozycja floating lub on the floor',
    'dodajesz tylko do widoku, musimy miec tez wyciecie na trap',
    'w razie czego jak nie bedzie miejsca to zostawimy informacje prosze uzyc shallow trap',
    'minimum potrzebujemy okolo 80 mm do 100 mm',
    'nie ma plecow na vanity unit tylko sa poziome poprzeczki na dole i na gorze, plecy sa jakby wyciete',
    '"2 wyciecie u dookola zeby sie szuflada otwierala, 3 - 80, 4 - 100 na material carcasa grubosc, 5 - blat osobny element jak worktop, 6 - do BOM tez, 7 - tak"',
    '13:46 "6 - tak"',
  ]) say(words);
  for (let d = 1; d <= 26; d += 1) assert.match(TEXT, new RegExp(`^;;; D${d} {1,2}[A-Z0-9]`, 'm'), `D${d}`);
  // The review of 25.10.2026: the amended notes say so, with their reason.
  say('D7 THE TOP IS THE WORKTOP, TO THE WALL (CONFIRMED 13:03 "5 - blat osobny element jak worktop"; AMENDED 25.10.2026 after the review: the house\'s own reach, one number for the LISP and the engine).');
  say('AFTER THE REVIEW OF 25.10.2026 (each finding reproduced on the integrated tree; D7, D13, D17, D18 and D21 above are amended with them):');
});

test('F8 . every difference is a named section, the two columns one of its own for the chest to cite', () => {
  for (const s of [
    /^;;; 1\. THE LAW IN ONE PARAGRAPH$/m,
    /^;;; 2\. DECISIONS TAKEN FOR THE OWNER/m,
    /^;;; 3\. CONSTANTS \(the owner's numbers; profile\.vanity mirrors them\)$/m,
    /^;;; 4\. THE PARENT'S NUMBERS, RESTATED \(never changed here\)$/m,
    /^;;; 5\. ROUTINES$/m,
    /^;;; ---- \(a\) THE BACK CUT OUT: RAIL-BOTTOM AND RAIL-TOP ----$/m,
    /^;;; ---- \(b\) THE SERVICE VOID AND THE TOP TO THE WALL ----$/m,
    /^;;; ---- \(c\) THE EQUAL OVERLAY DRAWERS AND THEIR BOXES ----$/m,
    /^;;; ---- \(c2\) THE TWO COLUMNS: THE VANITY AND THE CHEST ----$/m,
    /^;;; ---- \(d\) THE TRAP ----$/m,
    /^;;; ---- \(e\) PLINTH OR FLOATING ----$/m,
    /^;;; ---- \(f\) THE BASIN THROUGH THE TOPS ----$/m,
    /^;;; ---- \(g\) NO DOUBLE DRAWER UNDER A BASIN ----$/m,
    /^;;; 6\. NUMBERS/m,
    /^;;; 7\. THE COMMAND/m,
  ]) assert.match(TEXT, s);
  say('The section WARDROBE_CHEST2/3/4 take whole (D20)');
  say('D20 THE CHEST OF DRAWERS (CONFIRMED 13:03 "7 - tak"). WARDROBE_CHEST2/3/4 take D8');
  say('Nothing else of this file: its back stays, no rails, no void, no basin, no U.');
});

// ═══ THE NUMBERS: profile.vanity IS THE LISP'S, KEY FOR KEY ══════════════

const KEYS = {
  serviceVoidMm: 'vanityServiceVoid',
  railHeightMm: 'vanityRailH',
  trapWidthMm: 'vanityTrapW',
  trapDepthMm: 'vanityTrapD',
  trapRadiusMm: 'vanityTrapR',
  trapClearMm: 'vanityTrapClear',
  backPieceMinMm: 'vanityBackPieceMin',
  // T83 F7 (CLAUDE.md T83 F7 "160 / 2 + 20 PROPOSED"): the trap's gap a side, its own key and constant.
  trapGapClearMm: 'vanityTrapGapClear',
  wasteFromBackMm: 'vanityWasteFromBack',
  'basin.shape': 'vanityBasinShape',
  'basin.widthMm': 'vanityBasinW',
  'basin.depthMm': 'vanityBasinD',
  'basin.heightMm': 'vanityBasinH',
  'defaults.width': 'vanityWidth',
  'defaults.height': 'vanityHeight',
  'defaults.depth': 'vanityDepth',
  'defaults.plinth': 'vanityPlinth',
  'defaults.top': 'vanityTop',
  'defaults.floatHeightMm': 'vanityFloatHeight',
  'hangers.perUnit': 'vanityHangersPerUnit',
  'hangers.name': 'vanityHangerName',
  'hangers.article': 'vanityHangerArticle',
};
const leaves = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object'
  ? leaves(v, `${pre}${k}.`) : [[`${pre}${k}`, v]]));
const LINES = TEXT.split('\n');
/** The `;; profile.vanity.` comment a constant sits under. */
function sourceOf(name) {
  const at = LINES.findIndex((l) => l.startsWith(`(defun ${name} ( / )`));
  assert.ok(at > 0, `${name} is a one-line constant`);
  for (let i = at - 1; i >= 0; i -= 1) if (LINES[i].startsWith(';; profile.vanity.')) return LINES[i];
  return null;
}

test('F8 . every profile.vanity number is a LISP constant of the same value, under its source', () => {
  const all = leaves(V);
  assert.deepEqual(all.map(([k]) => k).sort(), Object.keys(KEYS).sort(), 'every key of profile.vanity has its constant, and no other');
  for (const [key, value] of all) {
    const name = KEYS[key];
    const lisp = typeof value === 'number' ? K(name) : L.call(name);
    assert.equal(lisp, value, `${key} ${value} is ${name} ${lisp}`);
    const src = sourceOf(name);
    assert.ok(src && src.startsWith(`;; profile.vanity.${key.split('.')[0]}`), `${name} sits under its key: ${src}`);
    assert.match(src, /CONFIRMED|PROPOSED/, `${name} says where it comes from`);
  }
  // Millimetres are written as reals: AutoLISP divides two integers to an integer.
  for (const [key, value] of all) {
    if (typeof value === 'number' && key !== 'hangers.perUnit') {
      assert.match(TEXT, new RegExp(`\\(defun ${KEYS[key]} \\( / \\) [0-9]+\\.[0-9]+\\)`), `${KEYS[key]} is written as a real`);
    }
  }
  // The owner's own numbers are CONFIRMED with his words; the turn's readings are PROPOSED.
  for (const name of ['vanityServiceVoid', 'vanityRailH', 'vanityTrapW', 'vanityTrapD', 'vanityTrapR']) {
    assert.match(sourceOf(name), /CONFIRMED/, name);
  }
  for (const name of ['vanityTrapClear', 'vanityTrapGapClear', 'vanityBackPieceMin', 'vanityWasteFromBack', 'vanityBasinW', 'vanityWidth', 'vanityFloatHeight']) {
    assert.match(sourceOf(name), /PROPOSED/, name);
  }
  assert.deepEqual(V, {
    serviceVoidMm: 80, railHeightMm: 100, trapWidthMm: 160, trapDepthMm: 120, trapRadiusMm: 20, trapClearMm: 60,
    // AMENDED BY T83 F7 (25.10.2026, 22:41): *"zmniejszmy szuflady na szerokosc, tylko fronty zostawmy szerokie i pomiedzy szufladami zrobi sie miejsce na syfon (tylko gorna row)"*: the gap's 20 a side (PROPOSED).
    trapGapClearMm: 20,
    // AMENDED BY T83 F8 (25.10.2026, 22:41): *"umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie wchodzi w drugi material"*: 200 to 250.
    backPieceMinMm: 30, wasteFromBackMm: 250,
    basin: { shape: 'oval', widthMm: 520, depthMm: 400, heightMm: 150 },
    defaults: { width: 900, height: 600, depth: 500, plinth: 100, top: 20, floatHeightMm: 300 },
    hangers: { perUnit: 2, name: 'Cabinet hanger 50 kg with wall plate', article: '' },
  }, 'CLAUDE.md T82 THE NUMBERS, as written');
});

test('F8 . profile.js says each vanity number\'s source in the owner\'s words, beside the number', () => {
  const src = readFileSync(`${ROOT}src/engine/profile.js`, 'utf8');
  const block = src.slice(src.indexOf('// ─── T82 F8 · THE VANITY UNIT'), src.indexOf('hangers: { perUnit: 2'));
  for (const s of ['*"3 - 80"* (CONFIRMED)', '*"4 - 100 na material carcasa grubosc"* (CONFIRMED)',
    '*"6 - tak"* (13:46), CONFIRMED', 'PROPOSED: the air the box under the top drawer keeps',
    'PROPOSED (CLAUDE.md F11)', 'PROPOSED, to the eye only', 'PROPOSED (CLAUDE.md F9)',
    '*"6 - do BOM tez"* (CONFIRMED, in the BOM)', 'reference/lisp/KIT_VANITY.lsp',
    'PROPOSED (KIT_VANITY.lsp D23, after the review of 25.10.2026)', 'in the carcass TOP\n    // (KIT_VANITY.lsp D18)']) {
    assert.ok(block.includes(s), `profile.vanity says: ${s}`);
  }
});

test('F8 . a profile saved before tonight comes back with profile.vanity, a tuned number kept', () => {
  const { vanity, ...old } = { ...P, schema: P.schema };
  assert.ok(vanity);
  assert.deepEqual(migrateCabinetProfile(old).vanity, V, 'the whole block, from the default');
  const tuned = migrateCabinetProfile({ ...old, vanity: { trapDepthMm: 245, basin: { widthMm: 600 } } }).vanity;
  assert.equal(tuned.trapDepthMm, 245, 'the owner\'s own number stands');
  assert.equal(tuned.serviceVoidMm, 80);
  assert.deepEqual(tuned.basin, { ...V.basin, widthMm: 600 }, 'key by key in the nested block');
  assert.deepEqual(tuned.hangers, V.hangers);
});

test('F8 . the parent\'s numbers the kit restates are the house\'s, number for number', () => {
  const B = P.baseDrawerUnit;
  const pairs = [
    ['vanityGap', B.gap], ['vanityFrontDeduction', B.frontWidthDeduction], ['vanityPairGap', P.doors.doubleTotalGap],
    ['vanitySideRatio', B.sideRatio], ['vanityBoxAboveRunner', B.boxAboveRunner], ['vanityBottomGroove', B.runnerPocketWidth],
    ['vanityBoxTopClear', B.boxTopClearance], ['vanityMinBoxInside', B.minBoxInside],
    ['vanityBoxWallDeduction', B.boxFrontHeightDeduction], ['vanityBoxWallExtra', B.boxFrontHeightExtra],
    ['vanityDepthAllowance', B.depthAllowance], ['vanityBoxClear', B.boxWidthClearance], ['vanityBoxClear', B.boxFrontClearance],
    ['vanityBottomOversize', B.bottomOversize], ['vanityRunnerOverBox', P.hardware.runner.movento.nominalOverBoxMm],
    ['vanityTabFromEnd', P.puzzle.tabCentresFromEnd], ['vanityTabSingleAtOrBelow', P.puzzle.singleTabAtOrBelow],
    ['vanityTabMiddleBelow', P.puzzle.middleTabBelow], ['vanityDogboneHalf', P.puzzle.dogboneHalfHeight],
    ['vanityBackScrewFromEnd', P.puzzle.screwFromEnd], ['vanitySingleSocketBelow', P.puzzle.singleSocketBelow],
  ];
  for (const [name, house] of pairs) assert.equal(K(name), house, `${name} is the house's ${house}`);
  assert.deepEqual(L.call('vanityRunnerLadder'), P.hardware.runner.movento.nominalLadder, 'the runner ladder');
  assert.equal(B.bottomAboveRunner, K('vanityBoxAboveRunner') + K('vanityBottomGroove'), 'the 28.5 the trap line stands on');
});

// ═══ THE PARENT, RUN: THE KIT'S BOXES ARE THE ENGINE'S BOXES ══════════════

test('F8 . at one column the kit\'s equal stack is the engine\'s BUDR2 and BUDR4, box for box', () => {
  for (const [type, n] of [['BUDR2', 2], ['BUDR4', 4]]) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), type, width: 900, height: 600, depth: 500, front_t: 25 }, P);
    // T83 F6: the parent asks no void (vd 0), so the kit's routine is the BUDR's box for box.
    const lisp = boxes(n, 1, EX, 0);
    const fronts = L.call('vanity-fronts', 900, 600, n, 1);
    for (let i = 1; i <= n; i += 1) {
      const b = lisp[i - 1];
      const side = r.panels.find((p) => p.id === `D${i}-SL`);
      const back = r.panels.find((p) => p.id === `D${i}-BB`);
      const bottom = r.panels.find((p) => p.id === `D${i}-DNO`);
      const front = r.panels.find((p) => /-F\d+$/.test(p.id) && p.id.endsWith(`-F${i}`));
      assert.deepEqual([side.box.x, side.box.y, side.box.z, side.h, side.w], [b[2], b[5], b[7], b[4], b[6]], `${type} D${i}: the side`);
      assert.equal(r.panels.find((p) => p.id === `D${i}-SR`).box.x + 18 - side.box.x, b[3], `${type} D${i}: the box's width`);
      assert.deepEqual([back.w, back.h, back.box.x], [L.call('vanity-box-len', b, 18), L.call('vanity-box-wall-h', b, 18), b[2] + 18], `${type} D${i}: the back wall`);
      assert.deepEqual([bottom.w, bottom.box.y], [L.call('vanity-box-bottom-w', b, 18), L.call('vanity-box-under', b)], `${type} D${i}: the bottom`);
      const f = fronts[i - 1];
      assert.deepEqual([front.box.x, front.box.y, front.w, front.h], [f[2], f[3], f[4], f[5]], `${type} F${i}`);
    }
  }
});

test('F8 . computeCabinet reads no profile.vanity key: the drawer base, the sink and the chest cut what they cut', () => {
  const { vanity, ...without } = P;
  assert.ok(vanity);
  for (const type of ['BUD', 'BUDR', 'BUDR2', 'BUDR4', 'SINK', 'WARDROBE', 'WARDROBE_CHEST3']) {
    const params = { ...defaultParamsFor(type, P), type };
    assert.deepEqual(computeCabinet(params, without), computeCabinet(params, P), `${type} moved with profile.vanity`);
  }
});

// ═══ (a) THE BACK CUT OUT ═══════════════════════════════════════════════

test('F8 (a) . two rails W x 100 x G where the back stood; no side tab survives; the back\'s end screws do', () => {
  assert.deepEqual(L.call('vanity-rails', 900, 600, 18), [
    ['RAIL-BOTTOM', 0, 0, 0, 900, 100, 18],
    ['RAIL-TOP', 0, 500, 0, 900, 100, 18],
  ]);
  assert.deepEqual(L.call('vanity-back-window', 600), [100, 500], 'the open back');
  assert.deepEqual(L.call('vanity-tab-centres', 600), [95, 300, 505], 'puzzle.js tabCentres at 600');
  // The dog bone is 30 either side: 95 reaches 125, past the 100 rail; 300 is in the open back.
  for (const H of [600, 650, 720, 800, 900, 2000, 400, 300]) {
    assert.equal(L.call('vanity-side-tabs-kept', H), null, `no side tab at H ${H}`);
  }
  assert.deepEqual(L.call('vanity-back-side-screws', 600), [50, 197.5, 402.5, 550]);
  assert.deepEqual(L.call('vanity-rail-side-screws', 600), [['RAIL-BOTTOM', 50], ['RAIL-TOP', 50]]);
  assert.deepEqual(L.call('vanity-rail-of', 40.6, 59.4, 600), 'RAIL-BOTTOM', 'a Cabineo pocket at 50 lands inside');
  assert.equal(L.call('vanity-rail-of', 270.6, 289.4, 600), null, 'one at 300 stands in the open back');
  say('THE BACK. RAIL-BOTTOM 900 x 100 x 18 at y 0 and RAIL-TOP 900 x 100 x 18 at y 500, both at z 0; the open back from 100 to 500.');
  say('The sides\' back tabs at 95 300 505 reach 65..125, 270..330 and 475..535: none is kept.');
  say('The back\'s side screws at 50 197.5 402.5 550: 50 kept in RAIL-BOTTOM and 550 in RAIL-TOP (50 down from its top), the two between the tabs gone.');
  say('D4 THE SIDES\' BACK TABS GO, EVERY ONE (DERIVED from D3).');
  say('D5 THE SIDES\' DEPTH IS THE PARENT\'S, D - G (DERIVED).');
});

// ═══ (b) THE VOID AND THE TOP ═════════════════════════════════════════════

test('F8 (b) . the carcass to the wall at the clearance; the top is the house slab, 548; the void inside is a note, #45', () => {
  const clearance = P.room.wallBackClearance;
  assert.equal(clearance, 10);
  // AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
  // the carcass stands at the house's clearance like every unit (D6, D27); T82's 90 (the clearance + 80) is gone.
  const wallGap = L.call('vanity-wall-gap', clearance);
  assert.equal(wallGap, 10);
  // AMENDED after the review of 25.10.2026 (D7): the house worktop's reach, worktop.js worktopGeometry,
  // D + the door gap + the front + the front overhang, plus the stand-off (wall_gap less the clearance): 0 now, so
  // T83 F6 moves 628 to 548, the top reaching the wall over the carcass as any run's.
  const top = L.call('vanity-top-depth', 500, P.doors.gap, P.front.thickness, P.autoParts.worktop.frontOverhang, wallGap - clearance);
  assert.equal(top, 548);
  // The fronts stand 10 under the slab's edge, as every kitchen slab's: a BUD 558 slab is 606, its fronts at 596.
  assert.equal(top - (wallGap + 500 + P.doors.gap + P.front.thickness), 10);
  assert.equal(L.call('vanity-top-depth', 558, P.doors.gap, P.front.thickness, P.autoParts.worktop.frontOverhang, 0), 606);
  // T83 F6: CLAUDE.md F6 *"The Check's note #45 says "Service void 80 inside the vanity behind the drawers""*.
  assert.equal(L.call('vanity-void-note'), '#45 Service void 80 inside the vanity behind the drawers');
  say('THE VOID, INSIDE (T83 F6, D27). wall_gap 10, the house clearance: the carcass to the wall; the worktop 548 deep from the wall (500 + 3 + 25 + 20), the fronts 10 under its edge; the void 80 inside, the boxes\' back faces at 85 from the carcass back.');
  say('reaches the wall over the carcass as any run\'s: 500 + 3 + 25 + 20 = 548 on the default (628 under T82, over the void), as a BUD 558 kitchen\'s slab is 606 for fronts at 596');
});

// ═══ (c) THE EQUAL DRAWERS ═══════════════════════════════════════════════

test('F8 (c) . VANITY3 900 x 600 x 500: three equal fronts, the boxes on the 400 runner less ten (T83 F6: the void inside)', () => {
  assert.deepEqual(L.call('vanity-front-heights', 600, 3), [197, 197, 197]);
  assert.deepEqual(L.call('vanity-fronts', 900, 600, 3, 1), [
    [1, 1, 1.5, 0, 897, 197], [1, 2, 1.5, 200, 897, 197], [1, 3, 1.5, 400, 897, 197],
  ]);
  // AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
  // the box keeps the void behind it (D9, D27): at most 500 - 25 - 80 = 395, the 390 box on the 400 runner (T82: 440 on the 450).
  assert.equal(L.call('vanity-box-room', 500, 18, 25, VD), 395);
  assert.equal(L.call('vanity-box-depth', 500, 18, 25, VD), 390, 'the 400 runner less 10');
  assert.equal(L.call('vanity-box-depth', 500, 18, 25, 0), 440, 'the parent, no void: the 450 runner less 10');
  const b = boxes(3, 1);
  assert.deepEqual(b.map((x) => x[5]), [31.5, 213.5, 413.5], 'the feet');
  assert.deepEqual(b.map((x) => L.call('vanity-box-top', x)), [169.5, 351.5, 551.5], 'the tops');
  assert.deepEqual([b[0][2], b[0][3], b[0][4], b[0][6], b[0][7]], [23, 854, 138, 390, 85]);
  assert.deepEqual([L.call('vanity-box-len', b[0], 18), L.call('vanity-box-wall-h', b[0], 18), L.call('vanity-box-bottom-w', b[0], 18)], [818, 104, 831]);
  // Equal, the top one taking the rounding (the parent's exact variants), and 3 under the top.
  for (const [H, n] of [[600, 2], [600, 4], [601, 3], [602, 4], [560, 4], [720, 3]]) {
    const hs = L.call('vanity-front-heights', H, n);
    assert.equal(hs.reduce((s, h) => s + h, 0) + n * 3, H, `${n} over ${H} fill the face`);
    assert.ok(hs.slice(0, -1).every((h) => h === hs[0]), `${n} over ${H}: equal but the top`);
  }
  say('THE FRONTS. 197 197 197 at y 0 200 400, 897 wide at x 1.5.');
  say('THE BOXES. 390 deep (the 400 runner, the rung at or under 500 - 80), the back face at z 85; 854 wide at x 23, the walls 818 long and 104 high, the bottom 831; the sides 138, their feet at 31.5 213.5 413.5, their tops 169.5 351.5 551.5. The parent (vd 0): 440 deep on the 450, the back face at 35.');
});

// ═══ (c2) THE TWO COLUMNS ════════════════════════════════════════════════

test('F8 (c2) . columns 2: a DIVIDER on the bottom, under the top, the sides\' depth; a pair of fronts; six boxes', () => {
  assert.deepEqual(L.call('vanity-divider', 900, 600, 500, 18, 2), ['DIVIDER', 441, 18, 18, 18, 564, 482]);
  assert.equal(L.call('vanity-divider', 900, 600, 500, 18, 1), null, 'one column, no divider');
  assert.deepEqual(L.call('vanity-openings', 900, 18, 2), [[18, 441], [459, 882]]);
  const f = L.call('vanity-fronts', 900, 600, 3, 2);
  assert.equal(f.length, 6);
  assert.deepEqual([...new Set(f.map((x) => x[4]))], [447], 'the pair: (W - 6) / 2');
  assert.deepEqual([...new Set(f.map((x) => x[2]))], [1.5, 451.5]);
  assert.equal(451.5 - (1.5 + 447), 3, '3 between the columns, on the divider\'s centre line');
  const b = boxes(3, 2);
  assert.equal(b.length, 6);
  assert.deepEqual([...new Set(b.map((x) => x[2]))], [23, 464]);
  assert.deepEqual([...new Set(b.map((x) => x[3]))], [413]);
  assert.deepEqual([L.call('vanity-box-len', b[0], 18), L.call('vanity-box-bottom-w', b[0], 18)], [377, 390]);
  // Material never enters material: every box between its column's side and the divider, 5 clear.
  const div = L.call('vanity-divider', 900, 600, 500, 18, 2);
  for (const x of b) {
    const [x0, x1] = [x[2], x[2] + x[3]];
    assert.ok(x1 <= div[1] - 5 || x0 >= div[1] + div[4] + 5, `box ${x[0]}.${x[1]} clears the divider`);
  }
  assert.deepEqual(['Z1D3', 'D3'], [L.call('vanity-box-tag', 1, 3, 2), L.call('vanity-box-tag', 1, 3, 1)]);
  say('the DIVIDER at x 441, 18 x 564 x 482 from y 18 and z 18; the openings 18..441 and 459..882, 423 each; the fronts 447 wide at x 1.5 and 451.5; six boxes 413 wide at x 23 and 464, walls 377, bottoms 390');
});

test('F8 (c2) . the chest takes the same section: CHEST3 800 x 647 x 568, equal, columns 2', () => {
  assert.deepEqual(L.call('vanity-front-heights', 647, 3), [213, 213, 212]);
  const f = L.call('vanity-fronts', 800, 647, 3, 2);
  assert.deepEqual([...new Set(f.map((x) => x[4]))], [397]);
  assert.deepEqual(L.call('vanity-divider', 800, 647, 568, 18, 2), ['DIVIDER', 391, 18, 18, 18, 611, 550]);
  assert.deepEqual(L.call('vanity-openings', 800, 18, 2), [[18, 391], [409, 782]]);
  // The chest's own defaults are T75's: the section reads them, it never moves them.
  assert.deepEqual(P.wardrobeChest.defaults, { width: 800, height: 647, depth: 568 });
  say('THE CHEST. WARDROBE_CHEST3 W 800 H 647 D 568, equal, columns 2: the fronts 213 213 212 (638 over three, the top one takes the rounding), 397 wide at x 1.5 and 401.5; the DIVIDER at x 391, 18 x 611 x 550; the openings 373 each.');
});

// ═══ (d) THE TRAP ════════════════════════════════════════════════════════

test('F8 (d) . the U: 160 x 120 R 20 in the top box under the waste, the back wall in two, the bottom notched', () => {
  assert.deepEqual(L.call('vanity-wastes', 900, 1, 1), [450]);
  assert.deepEqual(L.call('vanity-wastes', 900, 2, 2), [225, 675]);
  assert.deepEqual(L.call('vanity-wastes', 900, 1, 2), [300, 600]);
  assert.equal(L.call('vanity-wastes', 900, 1, 0), null, 'no basin, no trap');
  const us = L.call('vanity-trap-us', ...EX, 3, 1, 1);
  // AMENDED BY T83 F8 (25.10.2026, 22:41): *"umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie wchodzi w drugi material"*, and CLAUDE.md T83 F8: *"The U of the top box (columns 1) follows the waste"*:
  // the U reaches a trap as wide as itself centred on the waste at 250 (D13, D15, D29): 250 + 80 - 85 = 245 (T82: 120).
  assert.deepEqual(us, [['D3', [1, 370, 530, 245, 20]]], 'one U, in the TOP drawer only');
  const b3 = boxes(3, 1)[2];
  assert.equal(L.call('vanity-u-depth', b3, 18), 245);
  const nt = L.call('vanity-u-in-bottom', b3, us[0][1], 18);
  assert.deepEqual(nt, [335.5, 495.5, 245, 20]);
  assert.equal((nt[0] + nt[1]) / 2, L.call('vanity-box-bottom-w', b3, 18) / 2, 'centred on the bottom: the waste over the box\'s centre');
  assert.deepEqual(L.call('vanity-u-outline', nt), [
    [[335.5, 0], [335.5, 225], [355.5, 245], [475.5, 245], [495.5, 225], [495.5, 0]],
    [[355.5, 225], [475.5, 225]],
    20,
  ]);
  assert.deepEqual(L.call('vanity-back-pieces', b3, [us[0][1]], 18), [[0, 329], [489, 818]]);
  assert.deepEqual(L.call('vanity-piece-ids', 'D3', 2), ['D3-BB-1', 'D3-BB-2']);
  // Two basins on one column: two U's in one box, the back wall in three.
  const two = L.call('vanity-trap-us', ...EX, 3, 1, 2);
  assert.deepEqual(two.map((x) => x[1].slice(1, 3)), [[220, 380], [520, 680]]);
  assert.deepEqual(L.call('vanity-back-pieces', b3, two.map((x) => x[1]), 18), [[0, 179], [339, 479], [639, 818]]);
  // Two columns, two basins: a U in each column's top box.
  const cols = L.call('vanity-trap-us', ...EX, 3, 2, 2);
  assert.deepEqual(cols.map((x) => [x[0], ...x[1].slice(1, 3)]), [['Z1D3', 145, 305], ['Z2D3', 595, 755]]);
  assert.deepEqual(L.call('vanity-back-pieces', boxes(3, 2)[2], [cols[0][1]], 18), [[0, 104], [264, 377]]);
  say('The U 370..530 in the top box (D3), 245 deep (it follows the waste, D29: 250 + 80 - 85), R 20; in the bottom\'s frame 335.5..495.5; the back wall cut as D3-BB-1 (0 329) and D3-BB-2 (489 818), 329 each.');
  say('the wastes at 225 and 675, the U\'s 145..305 in Z1D3 and 595..755 in Z2D3; Z1D3\'s back wall (0 104) and (264 377).');
  say('TWO BASINS ON ONE COLUMN. The wastes at 300 and 600, the U\'s 220..380 and 520..680, the back wall D3-BB-1 (0 179), D3-BB-2 (339 479), D3-BB-3 (639 818).');
});

test('F8 (d) . Check #39 in words: the waste beyond the U, the shallow trap, the divider, the U that does not fit', () => {
  // D15: a waste beyond the U's reach is said. AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
  // the shorter box's back face stands at 85, so the U reaches 205 (T82: 155); the waste, wherever the profile sets it
  // (vanityWasteFromBack), is said only where it stands beyond that.
  // AMENDED BY T83 F8 (25.10.2026, 22:41): *"umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie wchodzi w drugi material"*, and CLAUDE.md T83 F8: *"The U of the top box (columns 1) follows the waste"*:
  // the U reaches the waste + 80 (D15, D29); REACH only where the box is too short to take it.
  const zw = K('vanityWasteFromBack');
  const uDepth = Math.min(390 - 18 - 30, Math.max(120, zw + 80 - 85));
  const reach = 85 + uDepth - zw;
  const said = reach < 0 ? [['REACH', 450, `#39 The trap stands ${-reach} mm beyond the U: the U reaches ${85 + uDepth} from the carcass back, the waste stands at ${zw}`]] : [];
  const v3 = verdict(3, 1, 1);
  assert.deepEqual(v3, said);
  assert.equal(L.call('vanity-trap-reach', boxes(3, 1)[2], zw, 18), reach);
  assert.equal(reach, 80, 'the waste at 250 stands 80 inside the U\'s 330');
  say('the owner set it, "The U of the top box (columns 1) follows the waste": the U is that U (D13), 245 deep under the waste at 250, reaching 330: the trap stands inside it and nothing is said; REACH is said only where the box is too short to take it.');
  say('the shorter box stands at 85 (500 - 25 - 390), the U reaches 205 and the waste at 200 stands 5 inside it: nothing is said on the default.');
  say('A U that takes a trap as wide as itself centred on that waste is 200 + 80 - 85 = 195 deep: the owner\'s to set.');
  // D16: the trap's bottom line is the top box's bottom underside; 60 of air under it.
  const b = boxes(3, 1);
  assert.equal(L.call('vanity-trap-line', b[2]), 428.5);
  assert.equal(L.call('vanity-trap-room', b[2], b[1]), 77);
  say('The trap\'s bottom line 428.5, the box under it tops at 351.5: 77 of air, no shallow trap.');
  const v4 = verdict(4, 1, 1, [900, 560, 500, 18, 18, 25]);
  // T83 F6: REACH only where the waste stands beyond the shorter box's U (205), as above.
  const reachSaid = reach < 0 ? ['REACH'] : [];
  assert.deepEqual(v4.map((x) => x[0]), [...reachSaid, 'SHALLOW']);
  assert.equal(v4.find((x) => x[0] === 'SHALLOW')[2], '#39 Use a shallow trap: the drawer under it stands 59 mm under the trap\'s bottom, 60 wanted');
  assert.deepEqual(L.call('vanity-trap-us', 900, 560, 500, 18, 18, 25, 4, 1, 1).map((x) => x[0]), ['D4'], 'no second U, ever');
  assert.deepEqual(verdict(4, 1, 1).map((x) => x[0]), reachSaid, 'at 600 the four have 62 of air');
  say('THE SHALLOW TRAP. VANITY4 W 900 H 560 D 500: fronts 137 137 137 137 at y 0 140 280 420; sides 96; the trap\'s bottom line 448.5, the box under it tops at 389.5: 59 of air: "#39 Use a shallow trap: the drawer under it stands 59 mm under the trap\'s bottom, 60 wanted". The same at H 600: 147 each, 62 of air, no sentence.');
  // D17: one basin on two columns: no U. AMENDED BY T83 F7 (25.10.2026, 22:41): *"zmniejszmy szuflady na szerokosc, tylko fronty zostawmy szerokie i pomiedzy szufladami zrobi sie miejsce na syfon (tylko gorna row)"*:
  // the top row's boxes stand apart round the trap (D28), the waste in the gap's air; D17's sentence stays for a unit
  // too narrow for the gap.
  assert.deepEqual(verdict(3, 2, 1), [['RUNNERS', 450, '#39 The trap stands in the gap between the top drawers: no wall carries their two inner runners']]);
  assert.equal(L.call('vanity-trap-us', ...EX, 3, 2, 1), null, 'no U is cut');
  assert.deepEqual(verdict(3, 2, 1, [300, 600, 500, 18, 18, 25]), [['DIVIDER', 150, '#39 The trap stands over the divider: no top drawer can take its U']]);
  say('Under T82 the waste stood on the divider: no U, "#39 The trap stands over the divider: no top drawer can take its U", the sentence D17 keeps for a unit too narrow for the gap.');
  // Two basins too close on a narrow carcass: the second U would leave under 30 between them (D23).
  const narrow = L.call('vanity-trap-plan', 480, 600, 500, 18, 18, 25, 3, 1, 2);
  assert.deepEqual(narrow.map((e) => e[3]), ['CUT', 'FIT']);
  assert.ok(verdict(3, 1, 2, [480, 600, 500, 18, 18, 25]).some((e) => e[2] === FIT_SAID));
  // No basin: no trap, nothing said.
  assert.deepEqual(verdict(3, 1, 0), []);
});

// ═══ AFTER THE REVIEW: THE SMALLEST BOARD, THE TOPS, THE BOWL, THE DOUBLE ══

const FIT_SAID = '#39 The trap\'s U does not fit the top drawer\'s box: every board of its back wall keeps 30';

test('F8 D23 . no U leaves a back-wall board under 30: the review\'s 0 and sliver boards are FIT, never cut', () => {
  assert.equal(K('vanityBackPieceMin'), 30);
  // The review's cases: W 484 on two columns with two basins (0 and 9), W 242 with one (0 and 0),
  // W 480 with two on one column (the two U's touched: 0 between them).
  for (const [W, columns, sinks, plan] of [[484, 2, 2, ['FIT', 'FIT']], [242, 1, 1, ['FIT']], [480, 1, 2, ['CUT', 'FIT']],
    [500, 2, 2, ['FIT', 'FIT']], [600, 2, 2, ['FIT', 'FIT']], [301, 1, 1, ['FIT']]]) {
    const dims = [W, 600, 500, 18, 18, 25];
    assert.deepEqual(L.call('vanity-trap-plan', ...dims, 3, columns, sinks).map((e) => e[3]), plan, `W ${W} columns ${columns} sinks ${sinks}`);
    for (const e of verdict(3, columns, sinks, dims).filter((x) => x[0] === 'FIT')) assert.equal(e[2], FIT_SAID);
  }
  // Every board the cut U's leave keeps 30, over the widths a vanity is drawn at.
  for (let W = 240; W <= 2400; W += 2) {
    for (const [columns, sinks] of [[1, 1], [1, 2], [2, 2]]) {
      const dims = [W, 600, 500, 18, 18, 25];
      const bx = boxes(3, columns, dims);
      const us = L.call('vanity-trap-us', ...dims, 3, columns, sinks) || [];
      for (const col of [1, 2].slice(0, columns)) {
        const mine = us.filter((x) => x[1][0] === col).map((x) => x[1]);
        if (!mine.length) continue;
        const b = bx.find((x) => x[0] === col && x[1] === 3);
        for (const [a0, a1] of L.call('vanity-back-pieces', b, mine, 18)) {
          assert.ok(a1 - a0 >= 30 - 1e-9, `W ${W} columns ${columns} sinks ${sinks}: a board of ${a1 - a0}`);
        }
      }
    }
  }
  // The first widths that take the U's: one basin 302, two columns with two basins 604.
  assert.deepEqual(L.call('vanity-trap-plan', 302, 600, 500, 18, 18, 25, 3, 1, 1).map((e) => e[3]), ['CUT']);
  assert.deepEqual(L.call('vanity-trap-plan', 604, 600, 500, 18, 18, 25, 3, 2, 2).map((e) => e[3]), ['CUT', 'CUT']);
  say('THE SMALLEST BOARD. W 484, columns 2, sinks 2: the U\'s would leave 0 and 9 of the two back walls: neither is cut, "#39 The trap\'s U does not fit the top drawer\'s box: every board of its back wall keeps 30". W 242 with one basin, and W 480 with two on one column: the same.');
});

test('F8 D18 D26 . the carcass TOP takes the worktop\'s oval, cut on site; the TOP\'s back joint under it is not cut', () => {
  // AMENDED BY T83 F8 (25.10.2026, 22:41): *"umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie wchodzi w drugi material"*: the waste at 250 stands the oval
  // 50 in front of the carcass back, 32 in front of the TOP's back edge: a HOLE, every back joint whole (T82: 182, EDGE).
  assert.deepEqual(L.call('vanity-top-cutouts', [450], 18), [[432, 232, 520, 400, 'HOLE']], 'centred on the waste, a hole in the TOP');
  assert.deepEqual(L.call('vanity-top-cutouts', [225, 675], 18).map((c) => c.slice(0, 2)), [[207, 232], [657, 232]]);
  assert.equal(L.call('vanity-top-cutouts', null, 18), null, 'no basin the worktop takes, no cut');
  assert.equal(L.call('vanity-top-cutout-note', 'VU01'), 'Basin cut-out 520 x 400 oval in the carcass top of VU01: cut on site to the basin\'s template.');
  // The TOP's back joint: its two tenons with the rail's sockets (socketCentres over 864), the rail's three screws.
  assert.deepEqual(L.call('vanity-top-back-features', 900, 18), [
    ['TENON', 113, 83, 143], ['TENON', 787, 757, 817], ['SCREW', 68, 68, 68], ['SCREW', 450, 450, 450], ['SCREW', 832, 832, 832],
  ]);
  assert.equal(L.call('vanity-top-back-dropped', 900, 18, [450]), null, 'the oval no longer reaches the TOP\'s back edge: nothing goes');
  // D26's law, on a line the oval does cross: 182 in front of the waste (T82's TOP edge, z 68 now), from 342.2 to 557.8.
  assert.equal(L.call('vanity-oval-meets-p', 342.3, 342.3, 450, 68), true);
  assert.equal(L.call('vanity-oval-meets-p', 342.1, 342.1, 450, 68), null);
  assert.equal(L.call('vanity-oval-meets-p', 557.7, 557.7, 450, 68), true);
  assert.equal(L.call('vanity-oval-meets-p', 557.9, 557.9, 450, 68), null);
  assert.equal(L.call('vanity-oval-meets-p', 0, 900, 450, 18), null, 'the TOP\'s back edge past the oval meets nothing');
  assert.equal(L.call('vanity-oval-meets-p', 0, 900, 450, 470), null, 'a line past the oval meets nothing');
  // Two basins on two columns, and on one column at a third: the TOP's edge is whole under both.
  assert.equal(L.call('vanity-top-back-dropped', 900, 18, [225, 675]), null);
  assert.equal(L.call('vanity-top-back-dropped', 900, 18, [300, 600]), null);
  say('THE TOPS: the carcass TOP takes the oval 520 x 400 at 432, 232 in its own frame (T83 F8; 182 under T82), a HOLE 32 in front of its back edge; "Basin cut-out 520 x 400 oval in the carcass top of VU01: cut on site to the basin\'s template."; every tenon and screw of the TOP\'s back edge stays (under T82 the rail\'s screw at 450 was not cut).');
  say('D18 THE CARCASS TOP TAKES THE BASIN\'S OVAL (AMENDED 25.10.2026 after the review; the house law: material never enters another material).');
  say('with the waste at 250 the oval no longer reaches the TOP\'s back edge on the default: nothing goes.');
});

test('F8 D25 D29 . the bowl never enters a board: every board it enters is said in #48, CLAUDE.md\'s sentence', () => {
  // AMENDED BY T83 F8 (25.10.2026, 22:41): *"umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie wchodzi w drugi material"*; CLAUDE.md T83 F8: *"#48 grows the
  // sentence: "the bowl enters RAIL-TOP by N mm: move the basin forward or take a shallower bowl""*. The bowl's solid is
  // the room's half ellipsoid, held board by board (D29): the T82 reading of the box as a block and its three sentences
  // are retired.
  const bowl = (h, xs = [450], dims = EX, n = 3, columns = 1, sinks = 1) => L.call('vanity-bowl-verdict', 'VU01', ...dims, n, columns, sinks, xs, 20, h);
  // 31.10.2026: 22.1 and a bowl 113 deep (21.1 and 115 until that day): the wall stands on the groove's upper edge, flush
  // with the sides' top, 1 higher (SKYLON_JOINTS_CABINEO.lsp D.2c; KIT_VANITY.lsp vanity-box-boards wy + vanityBoxWallExtra).
  const def = 'VU01: The bowl enters D3-BB-1 by 22.1 mm, D3-BB-2 by 22.1 mm: move the basin forward or take a shallower bowl.';
  assert.equal(bowl(150), def, 'RAIL-TOP clear at 250; the top box\'s back wall beside the U is not (F6 moved the boxes 50 forward)');
  assert.equal(bowl(113), null, 'a bowl 113 deep clears it');
  assert.equal(bowl(20), null, 'a bowl no deeper than the worktop meets nothing under it');
  assert.equal(bowl(150, null), null, 'no basin the worktop takes, nothing to say');
  // One basin on two columns (D28): the narrowed boxes' inner sides stand under the bowl.
  assert.equal(bowl(150, [450], EX, 3, 2, 1), 'VU01: The bowl enters Z1D3-SR by 70 mm, Z2D3-SL by 70 mm, Z1D3-BB by 7.1 mm, '
    + 'Z2D3-BB by 7.1 mm: move the basin forward or take a shallower bowl.');
  // The board test itself: a board under the bowl's axis enters by the height it keeps under the rim.
  assert.equal(L.call('vanity-bowl-enters', ['B', 440, 400, 240, 20, 300, 20], 450, 250, 620, 150), 150, 'to the rim, through the bowl');
  assert.equal(L.call('vanity-bowl-enters', ['B', 0, 0, 0, 10, 10, 10], 450, 250, 620, 150), null, 'outside the oval');
  // The shell refuses with the worktop's refusals (vanity-bowl-refused): at 250 none; the boards in the cut's order.
  assert.equal(L.call('vanity-bowl-refused', 'VU01', 900, 600, 500, 18, [450], 20, 150), null);
  assert.deepEqual(L.call('vanity-bowl-shell', 900, 600, 500, 18).map((b) => b[0]), ['BUL', 'BUR', 'RAIL-BOTTOM', 'RAIL-TOP']);
  assert.deepEqual(L.call('vanity-bowl-boards', ...EX, 3, 1, 1).map((b) => b[0]).slice(0, 12), [
    'BUL', 'BUR', 'RAIL-BOTTOM', 'RAIL-TOP', 'D1-SL', 'D1-SR', 'D2-SL', 'D2-SR', 'D3-SL', 'D3-SR', 'D1-BF', 'D1-BB']);
  say('THE BOWL (T83 F8, D29): RAIL-TOP clear, the sides clear; "' + def + '" (21.1 until 31.10.2026, the walls 1 lower); the waste at 270, or a bowl 113 deep (115 until that day), enters nothing.');
  say('THE SHELL: the waste at 210, the oval 10 from the carcass back: "VU01: The bowl enters RAIL-TOP by 22 mm: move the basin forward or take a shallower bowl.", refused with the worktop\'s refusals, cut in neither top.');
  // The kit's own NUMBERS, run: the waste at 270 and at 210 (the constant moved, nothing else).
  const at = (zw) => loadLisp(TEXT.replace('(defun vanityWasteFromBack ( / ) 250.0)', `(defun vanityWasteFromBack ( / ) ${zw}.0)`));
  assert.equal(at(270).call('vanity-bowl-verdict', 'VU01', ...EX, 3, 1, 1, [450], 20, 150), null, '270 clears every board');
  assert.equal(at(270).call('vanity-bowl-refused', 'VU01', 900, 600, 500, 18, [450], 20, 150), null);
  assert.equal(at(210).call('vanity-bowl-refused', 'VU01', 900, 600, 500, 18, [450], 20, 150),
    'VU01: The bowl enters RAIL-TOP by 22 mm: move the basin forward or take a shallower bowl.');
});

test('F8 D24 . a double drawer under a basin is refused in words on the top row and the row under it', () => {
  assert.deepEqual([1, 2, 3].map((r) => L.call('vanity-double-refused-p', r, 3, 1)), [null, true, true]);
  assert.deepEqual([1, 2, 3, 4].map((r) => L.call('vanity-double-refused-p', r, 4, 2)), [null, null, true, true]);
  assert.deepEqual([1, 2].map((r) => L.call('vanity-double-refused-p', r, 2, 1)), [true, true], 'on two drawers both rows are the trap\'s');
  assert.deepEqual([1, 2, 3].map((r) => L.call('vanity-double-refused-p', r, 3, 0)), [null, null, null], 'no basin: the parent\'s double');
  assert.equal(L.call('vanity-double-refusal', 3),
    'Drawer 3: a double drawer is not cut under a basin: the trap\'s U is the top box\'s and its air is measured to the box under it. One box is cut.');
  say('THE DOUBLE. VANITY3 with a basin: a double asked on drawer 3 or 2: "Drawer 3: a double drawer is not cut under a basin: the trap\'s U is the top box\'s and its air is measured to the box under it. One box is cut."; on drawer 1 the parent\'s double.');
});

// ═══ (e) PLINTH OR FLOATING ══════════════════════════════════════════════

test('F8 (e) . on the floor on the house plinth, or floating on the wall at 300 with two hangers', () => {
  assert.deepEqual([L.call('vanity-mount', true), L.call('vanity-plinth-p', true), L.call('vanity-base-y', true, 300, 100), L.call('vanity-hangers', true)], ['wall', null, 300, 2]);
  assert.deepEqual([L.call('vanity-mount', null), L.call('vanity-plinth-p', null), L.call('vanity-base-y', null, 300, 100), L.call('vanity-hangers', null)], ['floor', true, 100, 0]);
  assert.equal(L.call('vanityHangerName'), 'Cabinet hanger 50 kg with wall plate');
  assert.equal(L.call('vanityHangerArticle'), '', 'the article is the owner\'s to fill');
  say('FLOATING. mount "wall", no plinth, the carcass underside at 300, 2 hangers. On the floor: the plinth 100, no hanger.');
  say('RAIL-TOP is where they bite.');
});

test('F8 . the worked example and every decision the slices mirror are written in the kit', () => {
  say('THE WORKED EXAMPLE. VANITY3 W 900 H 600 D 500, G 18, the box board 18, the front 25, one column, one basin, on the house\'s clearance 10.');
  for (const d of [
    'D2 NO BACK: THE BACK CUT OUT', 'D3 THE RAIL KEEPS THE BACK\'S JOINT THAT LANDS INSIDE IT',
    'D11 THE DIVIDER STANDS ON THE BOTTOM AND UNDER THE TOP', 'D12 THE PAIR OF FRONTS',
    'D13 THE TRAP\'S U', 'D15 THE NUMBERS DISAGREE AND THE ROOM SAYS SO', 'D16 THE TRAP\'S BOTTOM LINE',
    'D17 A WASTE OVER THE DIVIDER', 'D18 THE CARCASS TOP TAKES THE BASIN\'S OVAL', 'D19 PLINTH OR FLOATING',
    'D21 THE CHECKS.', 'D22 THE UNIT NUMBER is VU', 'D23 THE BACK WALL KEEPS 30', 'D24 NO DOUBLE DRAWER UNDER A BASIN',
    'D25 THE BOWL, AND CHECK #48', 'D26 THE TOP\'S BACK JOINT UNDER A BASIN',
  ]) say(d);
});
