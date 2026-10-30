/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T85 F1 . THE LISP FIRST (reference/lisp/KIT_RECESS.lsp D29, D30, D31; section I3 and its NUMBERS I4).
//
// CLAUDE.md T85 F1: *"Under D28, dated 30.10.2026, with the owner's words above as the law citations ... Paren
// balance 0/0; test/turn85-f01-lisp.test.js reads each routine's name and the owner's words from the file, as
// turn80-f01-lisp.test.js does."*  The kit's routines are RUN here (test/lisp-mini.js) on the five cases of the
// mockup, and their answers are held to the NUMBERS block I4, sentence by sentence. The engine is F2's.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadLisp } from './lisp-mini.js';
import { notchProfile } from '../src/engine/notch.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { LICENSED, LISP, GOLDENS, REPINNED } from '../scripts/t78-classify.d/f50-t85-f01.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const TEXT = read('reference/lisp/KIT_RECESS.lsp');
const NOTCH = read('reference/lisp/KIT_NOTCH.lsp');
const CABINEO = read('reference/lisp/SKYLON_JOINTS_CABINEO.lsp');
// The prose with its `;;;` and its wrapping folded away, as a person reads it.
const PROSE = TEXT.split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
const say = (s) => assert.ok(PROSE.includes(s), `the kit states: ${s}`);

/** The LISP's own balance: parens outside strings and comments. */
function parenScan(text) {
  let depth = 0;
  let min = 0;
  let inString = false;
  let inComment = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inComment) { if (ch === '\n') inComment = false; continue; }
    if (inString) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === ';') { inComment = true; continue; }
    if (ch === '(') depth += 1;
    else if (ch === ')') { depth -= 1; if (depth < min) min = depth; }
  }
  return { balance: depth, min };
}

/** Only the top-level (defun ...) forms: the kits load each other and draw, which the mini evaluator does not. */
function defuns(text) {
  const out = [];
  let depth = 0;
  let start = -1;
  let inS = false;
  let inC = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inC) { if (ch === '\n') inC = false; continue; }
    if (inS) { if (ch === '\\') { i += 1; continue; } if (ch === '"') inS = false; continue; }
    if (ch === '"') { inS = true; continue; }
    if (ch === ';') { inC = true; continue; }
    if (ch === '(') { if (depth === 0) start = i; depth += 1; } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) { const f = text.slice(start, i + 1); if (/^\(defun /.test(f)) out.push(f); }
    }
  }
  return out.join('\n');
}

const L = loadLisp([CABINEO, NOTCH, TEXT].map(defuns).join('\n'));
const r4 = (v) => (Array.isArray(v) ? v.map(r4) : (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v));
const run = (name, ...args) => r4(L.call(name, ...args));
const T = true;
// The Cabineo 12 numbers of a puzzle unit (cabineo-profile): e 50, p 250, nMin 2, the pocket 16.7 wide, ax 5.5.
const CAB = [5.5, 50, 250, 2, 16.7];

test('F1 . KIT_RECESS.lsp balances 0/0, ASCII, no dash; D29 to D31 under D28, dated, the owner\'s words', () => {
  for (const [name, text] of [['KIT_RECESS.lsp', TEXT], ['KIT_NOTCH.lsp', NOTCH]]) {
    const { balance, min } = parenScan(text);
    assert.equal(balance, 0, name);
    assert.equal(min, 0, name);
    assert.ok(/^[\x00-\x7F]*$/.test(text), `${name} ASCII`);
    assert.doesNotMatch(text, /[\u2013\u2014]/, name);
  }
  const d28 = TEXT.indexOf(';;; D28 ONE PRESS PUTS THE DRAWERS IN THE RECESS.');
  const d29 = TEXT.indexOf(';;; D29 THE RECESS COLUMN FOLLOWS THE RECESS.');
  const d30 = TEXT.indexOf(';;; D30 THE RETURNS ARE ON CABINEO.');
  const d31 = TEXT.indexOf(';;; D31 THE SWING.');
  const notHere = TEXT.indexOf(';;; 4. NOT HERE');
  assert.ok(d28 > 0 && d28 < d29 && d29 < d30 && d30 < d31 && d31 < notHere, 'D29, D30, D31 under D28, before 4. NOT HERE');
  say('30.10.2026, 20:17 TO 20:48');
  for (const words of [
    'dlaczego niektore elementy z recess nie sa machined?',
    'jak mamy szuflady w recess to juz sie tak nie przesuwa',
    'szuflady znikaja a zostaja dividery ktore sie robia do samej gory, nie powinno tak byc',
    '1 - cabineo, 2 - jesli wneka wychodzi poza szafe to zostaje jeden divider',
    'polka zostaje w ksztalcie litery L, proste prawda?',
    '2 - nie, tutaj musi byc minimum 30 mm',
    'znikaja z szufladami, bo to sa dividery do szuflad',
    'default zawiasy prosze zrob 90 stopni, teraz mamy 150 to nie jest dobre, i silver prosze',
  ]) say(words);
  say('WHERE THE DEPTH CHANGES, A WALL STANDS');
  say('D11 is AMENDED: a RETURN so joined is a CUT part');
  say('Check #30 no longer counts it');
  say('The FLOOR and the LID stay outlines');
  say('Every door opens to 90 in the picture (profile doors.openAngle 90, openAngleAtWall 90)');
  // D1 to D28 stand: the section headings of 28.10 are where they were.
  for (const m of [/;;; D22 THE DRAWERS IN THE RECESS\./, /;;; D26 ALIGN WITH RECESS STANDS BOTH DIVIDERS\./,
    /;;; D27 A CARCASS TOO SHALLOW FOR DRAWERS TAKES THEM IN THE RECESS\./]) assert.match(TEXT, m);
});

test('F1 . section I3 names every routine; the table carries recess.minColumnSide 30, the profile its mirror', () => {
  for (const m of [
    /;;; I3\. THE COLUMN FOLLOWS THE RECESS \(D29, D30; 30\.10\.2026\)/,
    /;;; I4\. NUMBERS - THE COLUMN FOLLOWS THE RECESS \(D29, D30; 30\.10\.2026\)/,
    /\(defun recess-col-wall \(cw g e lo minside\)/,
    /\(defun recess-col-walls \(cw g ex0 ex1 minside\)/,
    /\(defun recess-col-divider-count \(walls /, /\(defun recess-col-zone \(walls /,
    /\(defun recess-col-box-span \(walls\)/,
    /\(defun recess-col-bottom-edges \(cw g walls /, /\(defun recess-col-cap-edges \(cw g walls /,
    /\(defun recess-col-bottom-outline-walls \(cw cd g walls ed /, /\(defun recess-col-cap-outline-walls \(cw g walls ed capd /,
    /\(defun recess-col-top-joints-walls \(cw cd g ex0 ex1 ed walls /,
    /\(defun recess-col-return-full \(ch g ez1 ed\)/, /\(defun recess-col-return-full-place \(x0 cd ch g ez1 ed\)/,
    /\(defun recess-col-box-places-walls \(cw cd ch g ex0 ex1 ez0 ez1 ed capt walls /,
    /\(defun recess-col-wall-fillers \(cw cd g ex0 ex1 capy fy walls /,
    /\(defun recess-col-dead-pockets \(cw g ex0 ex1 walls /,
    /\(defun recess-return-cabineo \(x0 y0 g len lft ax e p nMin wide /,
    /\(foreach off \(cabineo-positions len e p nMin wide\)/,
    // The amended refusal: the signature D22 wrote, the side test gone, the dividers asked only where they stand.
    /\(defun recess-col-refusal \(cw ch g ex0 ex1 ez0 ez1 dl dr gd capy \/ minI\)/,
    /\(\(or \(and dl \(> \(abs \(- dl ex0\)\) 0\.5\)\) \(and dr \(> \(abs \(- \(\+ dr gd\) ex1\)\) 0\.5\)\)\)/,
    /;;; AMENDED 30\.10\.2026 \(D29 b\): the band reaching a side no longer refuses/,
  ]) assert.match(TEXT, m);
  // D26's button stands as it was.
  assert.match(TEXT, /\(defun recess-col-pair-x \(cw ex0 ex1 w\)\n  \(if \(or \(recess-left-p ex0\) \(recess-right-p ex1 cw\)\)\n    nil\n    \(list ex0 \(- ex1 w\)\)\)\)/);
  assert.match(NOTCH, /\("recess\.minColumnSide"\s+\. 30\.0\)\s+;; 30\.10\.2026 \(KIT_RECESS\.lsp D29\): the owner's "2 - nie, tutaj musi byc minimum 30 mm"/);
  assert.match(NOTCH, /\("recess\.handEdge"\s+\. 1\.0\)\)\)/, 'the hand edge still closes the table');
  assert.equal(P.recess.minColumnSideMm, 30);
  assert.equal(P.recess.handEdgeMm, 1);
  assert.equal(notchProfile(P)['recess.minColumnSide'], 30);
  assert.equal(notchProfile({ recess: { minColumnSideMm: 40 } })['recess.minColumnSide'], 40);
  assert.match(read('src/engine/profile.js'), /minColumnSideMm: 30,/);
  assert.match(read('src/engine/profile.js'), /\*"2 - nie, tutaj musi byc\n\s+\/\/ minimum 30 mm"\*/);
});

test('F1 . recess-col-walls: the five cases of the mockup, each wall its kind and its inner face', () => {
  assert.deepEqual(run('recess-col-walls', 1200, 18, 210, 990, 30), [['DIVIDER', 228], ['DIVIDER', 972]]);
  assert.deepEqual(run('recess-col-walls', 1200, 18, 0, 690, 30), [['SIDE', 18], ['DIVIDER', 672]]);
  assert.deepEqual(run('recess-col-walls', 1200, 18, 510, 1200, 30), [['DIVIDER', 528], ['SIDE', 1182]]);
  assert.deepEqual(run('recess-col-walls', 1200, 18, 25, 805, 30), [['RETURN', 43], ['DIVIDER', 787]]);
  assert.deepEqual(run('recess-col-walls', 1200, 18, 395, 1175, 30), [['DIVIDER', 413], ['RETURN', 1157]]);
  // The owner's minimum exactly: 48 - 18 = 30 is a divider; 47.5 is not.
  assert.deepEqual(run('recess-col-walls', 1200, 18, 48, 1152, 30), [['DIVIDER', 66], ['DIVIDER', 1134]]);
  assert.deepEqual(run('recess-col-walls', 1200, 18, 47.5, 1152.5, 30), [['RETURN', 65.5], ['RETURN', 1134.5]]);
  assert.equal(run('recess-col-divider-count', [['DIVIDER', 228], ['DIVIDER', 972]]), 2);
  assert.equal(run('recess-col-divider-count', [['SIDE', 18], ['DIVIDER', 672]]), 1);
  assert.equal(run('recess-col-divider-count', [['SIDE', 18], ['SIDE', 1182]]), 0);
  assert.equal(run('recess-col-zone', [['DIVIDER', 228], ['DIVIDER', 972]]), 1);
  assert.equal(run('recess-col-zone', [['SIDE', 18], ['DIVIDER', 672]]), 0);
  assert.equal(run('recess-col-zone', [['RETURN', 43], ['DIVIDER', 787]]), 0);
  assert.equal(run('recess-col-zone', [['DIVIDER', 528], ['SIDE', 1182]]), 1);
  assert.equal(run('recess-col-zone', [['SIDE', 18], ['SIDE', 1182]]), null);
  say('(recess-col-walls 1200 18 210 990 30) = (("DIVIDER" 228) ("DIVIDER" 972))');
  say('(recess-col-walls 1200 18 0 690 30) = (("SIDE" 18) ("DIVIDER" 672))');
  say('(recess-col-walls 1200 18 25 805 30) = (("RETURN" 43) ("DIVIDER" 787))');
});

test('F1 . I4 CASE G (a): both edges in, D22 point for point; the RETURNs\' Cabineo on the board over the drawers', () => {
  const walls = run('recess-col-walls', 1200, 18, 210, 990, 30);
  assert.deepEqual(run('recess-col-box-span', walls), [228, 972]);
  assert.equal(run('recess-col-drawer-depth', 187, 290), 477);
  const cap = [[0, 0], [1164, 0], [1164, 272], [972, 272], [972, 562], [192, 562], [192, 272], [0, 272]];
  assert.deepEqual(run('recess-col-cap-outline-walls', 1200, 18, walls, 290, 272), cap);
  assert.deepEqual(run('recess-col-cap-outline', 1200, 18, 210, 990, 290, 272), cap, 'D22\'s own routine, the same L');
  assert.deepEqual(run('recess-col-bottom-edges', 1200, 18, walls), [192, 972]);
  assert.deepEqual(run('recess-col-bottom-outline-walls', 1200, 300, 18, walls, 290),
    run('recess-col-bottom-outline', 1200, 300, 18, 210, 990, 290));
  assert.deepEqual(run('recess-col-box-places-walls', 1200, 300, 2150, 18, 210, 990, 0, 2150, 290, 647, walls),
    run('recess-col-box-places', 1200, 300, 2150, 18, 210, 990, 0, 2150, 290, 647));
  assert.deepEqual(run('recess-col-wall-fillers', 1200, 300, 18, 210, 990, 629, 90, walls),
    run('recess-col-fillers', 1200, 300, 18, 210, 990, 629, 90));
  assert.deepEqual(run('recess-col-dead-pockets', 1200, 18, 210, 990, walls), null);
  assert.deepEqual(run('recess-return-cabineo', 210, 282, 18, 290, T, ...CAB), [[50, 215.5, 332], [240, 215.5, 522]]);
  assert.deepEqual(run('recess-return-cabineo', 972, 282, 18, 290, null, ...CAB), [[50, 984.5, 332], [240, 984.5, 522]]);
  say('(recess-return-cabineo 210 282 18 290 T 5.5 50 250 2 16.7) = ((50 215.5 332) (240 215.5 522))');
  say('((50 984.5 332) (240 984.5 522)). Two connectors a RETURN, four in all');
});

test('F1 . I4 CASE G (b): the left edge 100 outside, one divider, the SIDE the wall, the L boards from BUL', () => {
  const walls = run('recess-col-walls', 1200, 18, 0, 690, 30);
  assert.deepEqual(run('recess-col-box-span', walls), [18, 672]);
  assert.deepEqual(run('recess-col-cap-edges', 1200, 18, walls), [0, 672]);
  assert.deepEqual(run('recess-col-bottom-edges', 1200, 18, walls), [0, 672]);
  assert.deepEqual(run('recess-col-box-places-walls', 1200, 300, 2150, 18, 0, 690, 0, 2150, 290, 647, walls),
    [['RETURN-R', [672, 282, 647, 690, 572, 2150]], ['EXT-BACK', [0, 572, 0, 690, 590, 2150]]]);
  assert.deepEqual(run('recess-col-wall-fillers', 1200, 300, 18, 0, 690, 629, 90, walls),
    [['R1', [690, 90, 18, 1182, 108, 629]], ['R2', [690, 264, 18, 1182, 282, 629]]]);
  assert.deepEqual(run('recess-return-cabineo', 672, 282, 18, 290, null, ...CAB), [[50, 684.5, 332], [240, 684.5, 522]]);
  // The grown side's joint: the TOP's and the BOTTOM's left edge re-planned on 572, no back run on the left.
  say('BUL grows to 572 (section 2: the band reaches it, floor to ceiling)');
  say('No RETURN-L. RETURN-R (672 282 647 690 572 2150)');
});

test('F1 . I4 CASE G (c): the left edge 15 inside, the full-height RETURN the wall, the dead pocket 7', () => {
  const walls = run('recess-col-walls', 1200, 18, 25, 805, 30);
  assert.deepEqual(run('recess-col-box-span', walls), [43, 787]);
  assert.deepEqual(run('recess-col-return-full', 2150, 18, 2150, 290), [290, 2132]);
  assert.deepEqual(run('recess-col-return-full-place', 25, 300, 2150, 18, 2150, 290), [25, 282, 18, 43, 572, 2150]);
  assert.deepEqual(run('recess-col-box-places-walls', 1200, 300, 2150, 18, 25, 805, 0, 2150, 290, 647, walls), [
    ['RETURN-L', [25, 282, 18, 43, 572, 2150]], ['RETURN-R', [787, 282, 647, 805, 572, 2150]],
    ['EXT-BACK', [25, 572, 0, 805, 590, 2150]]]);
  assert.deepEqual(run('recess-col-cap-edges', 1200, 18, walls), [25, 787]);
  assert.deepEqual(run('recess-col-bottom-edges', 1200, 18, walls), [7, 787]);
  assert.deepEqual(run('recess-col-dead-pockets', 1200, 18, 25, 805, walls), [[18, 25]]);
  assert.deepEqual(run('recess-col-wall-fillers', 1200, 300, 18, 25, 805, 629, 90, walls),
    [['R1', [805, 90, 18, 1182, 108, 629]], ['R2', [805, 264, 18, 1182, 282, 629]]]);
  assert.deepEqual(run('recess-return-cabineo', 25, 282, 18, 290, T, ...CAB), [[50, 30.5, 332], [240, 30.5, 522]]);
  assert.deepEqual(run('recess-return-cabineo', 787, 282, 18, 290, null, ...CAB), [[50, 799.5, 332], [240, 799.5, 522]]);
  say('= (290 2132), at (25 282 18 43 572 2150): on the BOTTOM to the ceiling');
  say('((18 25)): 7 wide, the NOTE');
});

test('F1 . I4 CASE G (d) and (e): out of the band, no recess column; the amended refusal in words', () => {
  say('the bare wardrobe, no bays');
  say('the dividers full height, 540 x 2114, its own board Z2-PART 744 x 530');
  // The routine's sentences are the engine's (F2 mirrors them); the side test is gone from the code, kept as a quote.
  const body = TEXT.slice(TEXT.indexOf('(defun recess-col-refusal'), TEXT.indexOf('(defun recess-col-window'));
  assert.doesNotMatch(body, /\(\(or \(recess-left-p ex0\) \(recess-right-p ex1 cw\)\)\n/);
  assert.match(body, /"RECESS DRAWERS: the recess does not start on the floor; the drawers keep the carcass's depth\."/);
  assert.match(body, /"RECESS DRAWERS: the dividers do not stand on the recess's edges; the drawers keep the carcass's depth\."/);
});

test('F1 . the classifier: the LISP files named, two engine files licensed, no golden and no gate', () => {
  assert.deepEqual(Object.keys(LISP).sort(), ['reference/lisp/KIT_NOTCH.lsp', 'reference/lisp/KIT_RECESS.lsp']);
  assert.deepEqual(Object.keys(LICENSED).sort(), ['src/engine/notch.js', 'src/engine/profile.js']);
  for (const v of Object.values(LICENSED)) assert.match(v.why, /2 - nie, tutaj musi byc minimum 30 mm/);
  assert.deepEqual(GOLDENS, []);
  assert.deepEqual(REPINNED, []);
});
