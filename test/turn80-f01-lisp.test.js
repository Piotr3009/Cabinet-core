/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F1 · THE LISP OF THE FRAME, FIRST (reference/lisp/KIT_INFRAME.lsp) ──
//
// CLAUDE.md T80 PART A: *"New file reference/lisp/KIT_INFRAME.lsp, the Skylon
// header, the owner's quotes of 21.10 as its D-notes, parens balanced (the
// parens test grows with it). It is the law of three things: (a) THE FRAME OF
// A RUN, (b) THE JOIN, (c) THE FRONTS INSET ... The LISP carries the three
// worked examples (600 one door, 800 pair, BUDR2 500) as its own test values;
// test/turn80-f01-lisp.test.js reads them back through the LISP census the
// repo already runs (the T57 "LISP is law" tests) and the parens test."*
//
// The kit's routines are RUN here (test/lisp-mini.js, a reader and evaluator
// of the subset the kit writes) on the worked examples' inputs, and their
// answers are held to the owner's numbers and to the kit's own NUMBERS
// block, sentence by sentence. Nothing in the engine moves in F1.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import { loadLisp } from './lisp-mini.js';
import { parenBalance, balanceOfKits, lispConstant } from '../scripts/t57-paren-balance.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const KIT = 'KIT_INFRAME.lsp';
const TEXT = readFileSync(`${ROOT}reference/lisp/${KIT}`, 'utf8');
const L = loadLisp(TEXT);
// The prose with its `;;;` and its wrapping folded away, as a person reads it.
const PROSE = TEXT.split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
const say = (s) => assert.ok(PROSE.includes(s), `the kit states: ${s}`);
const K = (name) => lispConstant(name, `${ROOT}reference/lisp`, KIT);
const fmt = (v) => String(Math.round(v * 1000) / 1000);
const rect = (r) => `(${r.map(fmt).join(' ')})`;

// ─── THE FOLDER AS THE TURN'S BASE LEFT IT ────────────────────────────────
// main of 21.10.2026 (f5d8aab, the owner's "80"): every file of
// reference/lisp but this kit, `name sha256` per line, sorted, hashed once.
// Pinned so the proof needs no history: CI checks out one commit and has no
// base to diff against (the PRO freeze's own reason, test/turn59-f1).
const LISP_BASE_FINGERPRINT = '745d56d65a7b94e20bba9f85f3510b6d59d1c1ada46c3b19cecb738177480a02';
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
// T82 F1 AMENDED (25.10.2026): a kit a LATER turn adds is a NEW file held by that turn's own test
// (KIT_HAWA.lsp, test/turn82-f01-hawa-lisp.test.js; the owner, 25.10.2026: *"zaczniemy od hawa dodanie"*;
// CLAUDE.md T82 LAWS: *"PART A and PART B each begin with a LISP kit"*). It stands outside T80's fingerprint
// and its git row; every other file is still T80's base byte for byte, and the fingerprint is not re-pinned.
// T82 F8 AMENDED (25.10.2026): and KIT_VANITY.lsp (test/turn82-f08-vanity-lisp.test.js; the owner, 25.10.2026:
// *"pozniej dodajemy vanity unit"*).
// T83 F1 AMENDED (25.10.2026): and KIT_MIRROR.lsp (test/turn83-f01-mirror-lisp.test.js; the owner, 25.10.2026, 14:09:
// *"teraz zaprojektujmy dokladnie to co masz na rysunku szafka wiszaca"*; CLAUDE.md T83 LAWS: *"PART A and PART B
// begin with the LISP"*). A new file held by its own test, outside T80's fingerprint like the two above.
const LATER_KITS = ['KIT_HAWA.lsp', 'KIT_VANITY.lsp', 'KIT_MIRROR.lsp'];
// T83 F6 AMENDED (25.10.2026): a later kit AMENDED on the owner's order, its amendment licensed by its turn's fragment
// (scripts/t78-classify.d/f44-t83-f06.mjs LISP): KIT_VANITY.lsp's void moves inside the carcass. The owner, 25.10.2026,
// 22:41: *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*.
// CHAT FIX 26.10.2026: KIT_MIRROR.lsp AMENDED on the owner's order, D5a and the constant mirrorMinDoor (held by
// test/chatfix-2610-mirror-door-widths.test.js and test/turn83-f01-mirror-lisp.test.js). The owner, 26.10.2026, 09:02:
// *"jesli uzytkownik zmienil to ten numer juz sie nie moze zmieniac, wtedy zmieniamy tylko te ktore nie byly ruszane"*.
// CHAT FIX 28.10.2026 AMENDED: the first two kits of T80's base AMENDED since, on the owner's order: KIT_RECESS.lsp (D22
// to D25, its section I) and KIT_NOTCH.lsp (one row of its table, recess.handEdge), licensed by
// scripts/t78-classify.d/f47-owner-2810-recess.mjs LISP and held by test/chatfix-2810-recess-drawers.test.js. The owner,
// 28.10.2026: *"co ja potrzebuje to ustawic szuflady tylko w tej wnece"*, *"szuflady tez prosze"*. From tonight they
// stand outside T80's fingerprint, as the later kits do, and the rest of the folder is fingerprinted once more: T80's
// base (f5d8aab) less those two, hashed the same way out of `git show f5d8aab:`, gives this very number, so every other
// file is still T80's base byte for byte. The first pin stays written above: the base's whole folder.
const AMENDED_KITS = ['KIT_RECESS.lsp', 'KIT_NOTCH.lsp'];
const LISP_BASE_FINGERPRINT_LESS_AMENDED = '5c9787b4bb00b516ccc2c6bcfe298f9ed1edda8b80e4ec5447c37237d0b67a4d';
const AMENDED_LATER = ['M\treference/lisp/KIT_VANITY.lsp', 'M\treference/lisp/KIT_MIRROR.lsp',
  ...AMENDED_KITS.map((k) => `M\treference/lisp/${k}`)];
const lispFingerprint = () => sha256(readdirSync(`${ROOT}reference/lisp`)
  .filter((n) => n !== KIT && !LATER_KITS.includes(n) && !AMENDED_KITS.includes(n)).sort()
  .map((n) => `${n} ${sha256(readFileSync(`${ROOT}reference/lisp/${n}`))}`).join('\n'));
/** The turn's base, where git can answer (origin/main, else main), or null. */
function baseCommit() {
  for (const ref of ['origin/main', 'main']) {
    const r = spawnSync('git', ['merge-base', 'HEAD', ref], { cwd: ROOT, encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

// The engine's own lay-on fronts of the three kits (computeCabinet, 22.10.2026,
// verify/t80/f05-probe.md): x, y, x + w, y + h in the carcass's frame.
const BUD600 = { cab: [0, 600, 770, 0, 18], fronts: [[1.5, 0, 598.5, 767]] };
const BUD800 = { cab: [0, 800, 770, 0, 18], fronts: [[1.5, 0, 398.5, 767], [401.5, 0, 798.5, 767]] };
const BUDR2 = { cab: [0, 500, 770, 0, 18], fronts: [[1.5, 0, 498.5, 382], [1.5, 385, 498.5, 767]] };

// ═══ THE FILE ════════════════════════════════════════════════════════════

test('F1 · KIT_INFRAME.lsp: the Skylon header, ASCII, no dash, a NEW file and the only LISP this turn adds', () => {
  assert.ok(TEXT.startsWith(';;; Copyright (c) 2026 Skylon Development Ltd. All rights reserved.'));
  assert.ok(/^[\x00-\x7F]*$/.test(TEXT), 'ASCII (AutoCAD\'s loader)');
  assert.doesNotMatch(TEXT, /[\u2013\u2014]/, 'no em or en dash');
  // Against the turn's base (main of 21.10.2026, the owner's "80"): the folder gained this file and nothing else moved.
  assert.equal(lispFingerprint(), LISP_BASE_FINGERPRINT_LESS_AMENDED, 'every other file of reference/lisp is the base\'s, byte for byte, and none was added');
  // ...and git agrees, where git can answer (a one-commit checkout has no base: the fingerprint is the proof there).
  const base = baseCommit();
  if (base) {
    const moved = spawnSync('git', ['diff', '--name-status', base, '--', 'reference/lisp'], { cwd: ROOT, encoding: 'utf8' })
      .stdout.split('\n').filter(Boolean);
    for (const row of moved) {
      assert.ok([KIT, ...LATER_KITS].some((k) => row === `A\treference/lisp/${k}`) || AMENDED_LATER.includes(row), `only the new kits: ${row}`);
    }
  }
});

test('F1 · the owner\'s words of 21.10.2026 are its D-notes, folded to ASCII', () => {
  for (const words of [
    'a co z british style kitchen z ramkami?',
    '4 - cnc blum in frame, 6 - mockup pls',
    'raczej plyta, malo kiedy bedzie jeden ciag dluzszy jak 2800, a jak bedzie to bedziemy laczyc.',
    'najlepiej jakbysmy zrobili wszedzie ramke 38 mm',
    '1 mm bedzie w srodku wystawac',
    'bo veneer ma 19 mm x 2 bedzie idealnie.',
    'ramka 25, drzwi 22 i jest idealnie, 3 mm gap pomiedzy carcasem a drzwiami.',
    'jak podwojne drzwi to miedzy drzwiami nie ma ramki, tylko miedzy szafkami.',
    '3 mm zawsze.',
    'zawias na boku szafki (specjalne zawiasy z Bluma).',
    'jezeli chodzi o dol to zdecydowanie wariant C',
    'a pozniej ktos stolarz wypelni ta dziure i blat pojdzie na wierzch, taka jest idea',
    '"2 na styk"', '"3 per projekt"', '"5 tak"', 'na pdf na przekroju pokaz kawalek timber',
  ]) say(words);
  for (let d = 1; d <= 15; d += 1) assert.match(TEXT, new RegExp(`^;;; D${d} [A-Z0-9 ]`, 'm'), `D${d}`);
});

test('F1 · parens 0/0, and the census grows by the new kit (derived, never typed)', () => {
  const scan = parenBalance(TEXT);
  assert.equal(scan.balance, 0, `${scan.open} open, ${scan.close} close`);
  assert.equal(scan.negativeAt, null, 'no ) before its (');
  assert.ok(scan.open > 100, 'a kit, not a stub');
  const rows = balanceOfKits(`${ROOT}reference/lisp`);
  assert.ok(rows.some((r) => r.name === KIT), 'the census reads it');
  for (const r of rows) assert.equal(r.balance, 0, r.name);
});

test('F1 · the owner\'s numbers are one-line constants, read by the census\'s own reader', () => {
  assert.equal(K('inframeStile'), 38, '"wszedzie ramke 38"');
  assert.equal(K('inframeRail'), 38);
  assert.equal(K('inframeFrameT'), 25, '"ramka 25"');
  assert.equal(K('inframeFrontT'), 22, '"drzwi 22"');
  assert.equal(K('inframeGap'), 3, '"3 mm zawsze"');
  assert.equal(K('inframeOutside'), 19, '"wariant C", "tak samo jak dol"');
  assert.equal(K('inframeBoardMax'), 2800, '"jeden ciag dluzszy jak 2800"');
  // Reals, never integers: AutoLISP divides two integers to an integer (38 / 2 is fine, 37 / 2 is not).
  for (const name of ['inframeStile', 'inframeRail', 'inframeFrameT', 'inframeFrontT', 'inframeGap', 'inframeOutside', 'inframeBoardMax']) {
    assert.match(TEXT, new RegExp(`\\(defun ${name} \\( / \\) [0-9]+\\.[0-9]+\\)`), `${name} is written as a real`);
  }
  // 25 = 22 + 3: the air behind the front is what the frame leaves the door.
  assert.equal(K('inframeFrameT') - K('inframeFrontT'), K('inframeGap'));
});

test('F1 · every routine of the three laws is defined, once, in this kit and in no other', () => {
  const routines = ['inframe-lip', 'inframe-lip-ok-p', 'inframe-outside', 'inframe-opening', 'inframe-end-reach',
    'inframe-end-overhang', 'inframe-frame', 'inframe-stiles', 'inframe-rails', 'inframe-gaps', 'inframe-cutout',
    'inframe-join-candidates', 'inframe-join-from', 'inframe-join', 'inframe-pieces', 'inframe-piece-names',
    'inframe-front', 'inframe-fronts', 'inframe-size', 'inframe-front-planes', 'inframe-plate-setback',
    'inframe-cup-clear-p', 'inframe-end-panel-depth', 'inframe-end-panel-grow', 'inframe-worktop-lift',
    'inframe-filler', 'c:inframe_full'];
  for (const r of routines) assert.ok(L.has(r), `${r} defined`);
  for (const other of balanceOfKits(`${ROOT}reference/lisp`).map((r) => r.name).filter((n) => n !== KIT)) {
    const code = readFileSync(`${ROOT}reference/lisp/${other}`, 'utf8').replace(/;.*$/gm, '');
    assert.doesNotMatch(code, /\(defun inframe/i, `${other} defines no in-frame routine`);
  }
});

// ═══ (a) THE LIP AND 19 OUTSIDE ═══════════════════════════════════════════

test('F1 (a) · the lip follows from 38: 1 for 18, 0 for 19, refused over 19; 19 outside either way', () => {
  assert.equal(L.call('inframe-lip', 18), 1);
  assert.equal(L.call('inframe-lip', 19), 0);
  assert.equal(L.call('inframe-lip', 20), -1);
  assert.equal(L.call('inframe-lip-ok-p', 18), true);
  assert.equal(L.call('inframe-lip-ok-p', 19), true);
  assert.equal(L.call('inframe-lip-ok-p', 20), null, 'a board over 19 is a red Check, never a wider stile');
  assert.equal(L.call('inframe-outside', 18), 19);
  assert.equal(L.call('inframe-outside', 19), 19);
  say('THE LIP: t 18: lip 1, outside 19. t 19: lip 0, outside 19. t 20: lip -1, refused (inframe-lip-ok-p nil).');
  // Between two butted cabinets of either board the stile is 38 ("veneer ma 19 mm x 2 bedzie idealnie").
  for (const [a, b] of [[18, 18], [19, 19], [18, 19]]) {
    const frame = L.call('inframe-frame', [[0, 600, 770, 0, a], [600, 600, 770, 0, b]], ['OPEN', 0], ['OPEN', 0]);
    assert.equal(L.call('inframe-stiles', frame)[1], 38, `${a} + ${b}`);
  }
});

// ═══ (c) THE THREE WORKED EXAMPLES ═══════════════════════════════════════

test('F1 (c) · EXAMPLE 1, BUD 600 one door: opening 562 x 732, the door 556 x 726', () => {
  const o = L.call('inframe-opening', BUD600.cab);
  assert.deepEqual(o, [19, 19, 581, 751]);
  assert.deepEqual(L.call('inframe-size', o), [562, 732]);
  const [door] = L.call('inframe-fronts', o, BUD600.fronts, K('inframeGap'));
  assert.deepEqual(door, [22, 22, 578, 748]);
  assert.deepEqual(L.call('inframe-size', door), [556, 726]);
  assert.deepEqual(L.call('inframe-front-planes', K('inframeFrameT'), K('inframeFrontT')), [3, 25], 'back 3, face 25');
  say(`The lay-on door ${rect(BUD600.fronts[0])}. The opening ${rect(o)}: 562 x 732. The inset door ${rect(door)}: 556 x 726, 22 thick, its back 3 and its face 25 in front of the carcass.`);
});

test('F1 (c) · EXAMPLE 2, BUD 800 pair: opening 762, leaves 376.5 each, 3 between, no stile, half a mm kept', () => {
  const o = L.call('inframe-opening', BUD800.cab);
  assert.deepEqual(L.call('inframe-size', o), [762, 732]);
  const [fl, fr] = L.call('inframe-fronts', o, BUD800.fronts, K('inframeGap'));
  assert.deepEqual(fl, [22, 22, 398.5, 748]);
  assert.deepEqual(fr, [401.5, 22, 778, 748]);
  assert.deepEqual(L.call('inframe-size', fl), [376.5, 726]);
  assert.deepEqual(L.call('inframe-size', fr), [376.5, 726]);
  assert.equal(fr[0] - fl[2], 3, '3 between the leaves');
  say(`The lay-on leaves FL ${rect(BUD800.fronts[0])} and FR ${rect(BUD800.fronts[1])}, the midline 400. The opening ${rect(o)}: 762 x 732. The inset leaves FL ${rect(fl)} and FR ${rect(fr)}: 376.5 x 726 each, 3 between them, no stile.`);
});

test('F1 (c) · EXAMPLE 3, BUDR2 500: two fronts 456 wide, 3 between, 3 to the rails, no rail between', () => {
  const o = L.call('inframe-opening', BUDR2.cab);
  assert.deepEqual(L.call('inframe-size', o), [462, 732]);
  const [f1, f2] = L.call('inframe-fronts', o, BUDR2.fronts, K('inframeGap'));
  assert.deepEqual(f1, [22, 22, 478, 382]);
  assert.deepEqual(f2, [22, 385, 478, 748]);
  assert.deepEqual(L.call('inframe-size', f1), [456, 360]);
  assert.deepEqual(L.call('inframe-size', f2), [456, 363]);
  assert.equal(f2[1] - f1[3], 3, '3 between');
  assert.equal(f1[1] - o[1], 3, '3 to the bottom rail');
  assert.equal(o[3] - f2[3], 3, '3 to the top rail');
  say(`The lay-on F1 ${rect(BUDR2.fronts[0])} and F2 ${rect(BUDR2.fronts[1])}, the midline 383.5. The opening ${rect(o)}: 462 x 732. The inset F1 ${rect(f1)}: 456 x 360; F2 ${rect(f2)}: 456 x 363; 3 between them, no rail, 3 to the rails.`);
});

// ═══ (a) THE RUN OF THE MOCKUP AND THE WALL UNIT ══════════════════════════

test('F1 (a) · the mockup\'s run: END-L 18 + BUD 600 + 800 + BUDR2 500: the frame 1920 x 808, stiles 38, one board', () => {
  const cabs = [[0, 600, 770, 0, 18], [600, 800, 770, 0, 18], [1400, 500, 770, 0, 18]];
  const frame = L.call('inframe-frame', cabs, ['PANEL', 18], ['OPEN', 0]);
  const [fx0, fy0, w, h, ops] = frame;
  assert.deepEqual([fx0, fy0, w, h], [-19, -19, 1920, 808]);
  assert.deepEqual(ops, [[38, 38, 600, 770], [638, 38, 1400, 770], [1438, 38, 1900, 770]]);
  assert.deepEqual(ops.map((o) => L.call('inframe-size', o)), [[562, 732], [762, 732], [462, 732]], 'the walk\'s openings');
  assert.deepEqual(L.call('inframe-stiles', frame), [38, 38, 38, 20]);
  assert.deepEqual(L.call('inframe-rails', frame, ops[0]), [38, 38]);
  assert.equal(L.call('inframe-end-overhang', ['PANEL', 18], 18), 1, 'the panel overhang, PROPOSED');
  assert.deepEqual(L.call('inframe-gaps', cabs), [0, 0], 'butted');
  const join = L.call('inframe-join', frame, K('inframeBoardMax'));
  assert.deepEqual(join, [1, 1920, null], 'one board');
  assert.deepEqual(L.call('inframe-piece-names', 1), ['FRAME']);
  const cut = L.call('inframe-cutout', ops[0]);
  assert.deepEqual(cut, [[38, 770], [600, 770], [600, 38], [38, 38]]);
  say('the frame (-19 -19) 1920 x 808, the openings (38 38 600 770), (638 38 1400 770), (1438 38 1900 770); the stiles 38 38 38 20; the rails 38 and 38; 19 under the carcass and 19 over it; the panel\'s overhang 1; one board: FRAME.');
  say(`The cut-out of the first opening ${cut.map((p) => rect(p)).join(' ')}.`);
});

test('F1 (a) · the wall unit WUD 600: the frame 602 x 758, open both ends', () => {
  const frame = L.call('inframe-frame', [[0, 600, 720, 0, 18]], ['OPEN', 0], ['OPEN', 0]);
  assert.deepEqual(frame.slice(0, 4), [-1, -19, 602, 758]);
  assert.deepEqual(frame[4], [[20, 38, 582, 720]]);
  assert.deepEqual(L.call('inframe-size', frame[4][0]), [562, 682]);
  assert.deepEqual(L.call('inframe-stiles', frame), [20, 20]);
  say('the frame (-1 -19) 602 x 758, the opening (20 38 582 720): 562 x 682; the stiles 20 20.');
});

test('F1 (a) · a split at a unit the frame stops at: the stile is lip + t = 19 (D8)', () => {
  const frame = L.call('inframe-frame', [[0, 600, 770, 0, 18]], ['SPLIT', 0], ['OPEN', 0]);
  assert.deepEqual(L.call('inframe-stiles', frame), [19, 20]);
  assert.equal(frame[0], 0, 'flush with the carcass\'s outer face');
});

test('F1 (a) · not butted: the stile grows by the gap, 4 mm apart is 42 (D5)', () => {
  const cabs = [[0, 600, 770, 0, 18], [604, 600, 770, 0, 18]];
  const frame = L.call('inframe-frame', cabs, ['OPEN', 0], ['OPEN', 0]);
  assert.deepEqual(L.call('inframe-gaps', cabs), [4]);
  assert.equal(L.call('inframe-stiles', frame)[1], 42);
  say('A run 4 mm apart (BUD 600 at 0, BUD 600 at 604): the stile between them 42, not 38.');
});

// ═══ (b) THE JOIN ═══════════════════════════════════════════════════════

test('F1 (b) · the join: five BUD 600, 3002 over 2800: two boards cut on a stile centre line', () => {
  const cabs = [0, 600, 1200, 1800, 2400].map((x) => [x, 600, 770, 0, 18]);
  const frame = L.call('inframe-frame', cabs, ['OPEN', 0], ['OPEN', 0]);
  assert.equal(frame[2], 3002);
  assert.deepEqual(L.call('inframe-join-candidates', frame), [601, 1201, 1801, 2401], 'the stiles\' centre lines');
  const [pieces, longest, cuts] = L.call('inframe-join', frame, K('inframeBoardMax'));
  assert.equal(pieces, 2, 'the fewest pieces');
  assert.equal(longest, 1801, 'the most even of them');
  assert.deepEqual(cuts, [1201], 'the first from the left among equals');
  assert.deepEqual(L.call('inframe-pieces', frame[2], cuts), [[0, 1201], [1201, 3002]]);
  assert.deepEqual(L.call('inframe-piece-names', 2), ['FRAME-1', 'FRAME-2']);
  // Every cut lies on a stile's centre line: 1201 is 1 + 1200, the joint between the second and the third cabinet.
  const stileCentres = L.call('inframe-join-candidates', frame);
  for (const c of cuts) assert.ok(stileCentres.includes(c));
  say('the frame 3002 wide over a 2800 board; the stile centre lines 601 1201 1801 2401; two pieces, the longest 1801 either way, the first from the left: the cut at 1201, FRAME-1 (0 1201) 1201 and FRAME-2 (1201 3002) 1801.');
  // A frame that fits is never cut; a frame with no stile in reach cannot be joined (nil).
  assert.deepEqual(L.call('inframe-join', [0, 0, 2800, 808, [[20, 38, 2780, 770]]], 2800), [1, 2800, null]);
  assert.equal(L.call('inframe-join', [0, 0, 3000, 808, [[20, 38, 2980, 770]]], 2800), null);
  // Three pieces when two cannot do it: 8 x 600 open (4802): 3 boards, every one within 2800.
  const eight = L.call('inframe-frame', [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [k * 600, 600, 770, 0, 18]), ['OPEN', 0], ['OPEN', 0]);
  const j8 = L.call('inframe-join', eight, 2800);
  assert.equal(j8[0], 2);
  const twelve = L.call('inframe-frame', Array.from({ length: 12 }, (_, k) => [k * 600, 600, 770, 0, 18]), ['OPEN', 0], ['OPEN', 0]);
  const j12 = L.call('inframe-join', twelve, 2800);
  assert.equal(j12[0], 3);
  for (const [a, b] of L.call('inframe-pieces', twelve[2], j12[2])) assert.ok(b - a <= 2800);
});

// ═══ (d) (e) THE HINGE, THE END PANEL, THE WORKTOP, THE FILLER ════════════

test('F1 (d) (e) · the plate column 20.5; the end panel 583 deep and 19 higher; the worktop 19 higher; the filler a note', () => {
  assert.equal(L.call('inframe-plate-setback', K('inframeFrontT'), 1.5, K('inframeFrameT')), 20.5);
  assert.equal(L.call('inframe-cup-clear-p', 4, 3), true);
  assert.equal(L.call('inframe-cup-clear-p', -1, 3), null, 'a K that would cut into the lip is refused');
  assert.equal(L.call('inframe-end-panel-depth', 558), 583);
  assert.deepEqual(L.call('inframe-end-panel-grow', 18, null), [19, 0]);
  assert.deepEqual(L.call('inframe-end-panel-grow', 18, true), [19, 19]);
  assert.equal(L.call('inframe-worktop-lift', 18), 19);
  assert.deepEqual(L.call('inframe-filler', 18, 1900), [19, 1900]);
  say('A 22 door, the inset 1.5, the frame 25: the plate column 20.5 back from the carcass front.');
  say('KIT_BUD_FULL D 558, t 18: 583 deep, 19 higher at the top; on a wall unit 19 at the top and 19 at the bottom. THE WORKTOP: 19 higher. THE FILLER: 19 x the run\'s width, a note.');
});
