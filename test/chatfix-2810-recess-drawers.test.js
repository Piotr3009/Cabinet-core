/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// CHAT FIX 28.10.2026 . THE DRAWERS IN THE RECESS (KIT_RECESS.lsp D22 to D25).
//
// The owner, 19:29: *"szafa ma 1000 mm a wneka 800, to po prawej i po lewej
// szafa jest o 100 mm plytka a reszta gleboka, i co ja potrzebuje to ustawic
// szuflady tylko w tej wnece i odsunac diverted po lewej i po prawej rowno z
// wneka, zeby zamontowac szuflady"*; the first mockup, 19:36: *"dokladnie
// tak"*, *"pamietaj zeby diverted byl tylko do wysokosci polki nad
// szufladami"*, *"nie zapomnij zablokowac to jak w przypadku 30 mm, ale teraz
// bedzie varius w zaleznosci od wneki i diverted"*, *"polka nad szufladami
// powinna byc wycieta jak inne polki az do tylu, w L shape lub z cornerami"*,
// *"wszystkie polki teraz sa 10 mm, to polke nad szufladami tez zrob 10 mm jak
// reszta"*; the second, 19:44: *"dokladnie o to mi chodzi"*, and *"plecy ...
// w zwiazku ze to jest w ksztalcie U to ja nie moge puscic tego na edge
// bander, wiec nie zrobie scribe na edging, wiec w tym miejscu musimy
// pomniejszyc o 1 mm plecy, ale tylko w podkowie U"*; 19:47: *"dokladnie,
// mozesz zakodowac prosze"*, *"szuflady tez prosze"*.
//
// LISP first: these assertions are the LISP's section I and its NUMBERS (I2)
// on the routines, then on computeCabinet, the store, the Check, the golden
// and the classifier. The divider's runner row (the probe of the same evening:
// mirrored front to back) is held here too, beside the recess column it serves.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as X from '../src/engine/extension.js';
import { notchProfile } from '../src/engine/notch.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { CHECKS } from '../src/engine/checks.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore, paramsForEngine, recessAlignPlan } from '../src/stores/projectStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';
import {
  GATES, LICENSED, LIVENESS, GOLDENS, REPINNED, LISP,
} from '../scripts/t78-classify.d/f47-owner-2810-recess.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const K = notchProfile(P);
const S = () => useProjectStore.getState();
// D26 asks for one undo per press: the history watches the store as the app's does.
test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

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

// KIT_RECESS.lsp CASE E: KIT_WARDROBE_FULL 1000 wide before the owner's recess 800 (the band 110..890, 150 deep),
// dividers at 110 and 872, three internal drawers 200 between them, the project's setbacks 10.
const PROJECT = { shelf_front_mm: 10, interior_setback_mm: 10, drawer_cap_setback_mm: 10 };
const drawer = (index, extra = {}) => ({ id: `d${index + 1}`, kind: 'drawer', zone: 1, index, height_mm: 200, mount: 'internal', ...extra });
const caseE = ({ z0 = 0, z1 = 2150, xs = [110, 872], drawers = [drawer(0), drawer(1), drawer(2)], extra = {} } = {}) => ({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  width: 1000,
  ...PROJECT,
  extension: { x0: 110, x1: 890, z0, z1, d: 150 },
  items: [{ id: 'p1', kind: 'partition', x_mm: xs[0] }, { id: 'p2', kind: 'partition', x_mm: xs[1] }, ...drawers],
  ...extra,
});
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const holesOf = (r, panel, kind) => r.drills.filter((d) => d.panel === panel && d.kind === kind).map((d) => [d.x, d.y]);
const worldZ = (p, x, y) => {
  const pl = panelPlacement(p);
  return Math.round((pl.origin[2] + x * pl.u[2] + y * pl.v[2]) * 100) / 100;
};

// ─── the LISP ────────────────────────────────────────────────────────────────

test('LISP first · KIT_RECESS.lsp balances 0/0 with D22 to D25, section I and its NUMBERS I2; ASCII, no dash', () => {
  const text = read('reference/lisp/KIT_RECESS.lsp');
  const { balance, min } = parenScan(text);
  assert.equal(balance, 0);
  assert.equal(min, 0);
  assert.ok(/^[\x00-\x7F]*$/.test(text), 'ASCII');
  assert.doesNotMatch(text, /[\u2013\u2014]/);
  for (const m of [
    /;;; D22 THE DRAWERS IN THE RECESS\./, /;;; D23 THE HAND EDGE\./, /;;; D24 THE BOARD OVER THE DRAWERS STANDS BACK 10\./,
    /;;; D25 THE BACK'S HOLES FOLLOW ITS PIECES\./, /;;; I\. THE DRAWERS IN THE RECESS \(D22, D23, D25; 28\.10\.2026\)/,
    /;;; I2\. NUMBERS - THE DRAWERS IN THE RECESS \(D22 to D25\)/,
    /\(defun recess-col-refusal \(cw ch g ex0 ex1 ez0 ez1 dl dr gd capy \/ minI\)/,
    /\(defun recess-col-window \(cw ch g ex0 ex1 ez0 ez1\)/, /\(defun recess-col-back-pieces /,
    /\(defun recess-col-plan-bump \(cw cd g ex0 ex1 ed\)/, /\(defun recess-col-bottom-outline /,
    /\(defun recess-col-top-joints \(cw cd g ex0 ex1 /, /\(defun recess-col-box-places \(cw cd ch g ex0 ex1 ez0 ez1 ed capt /,
    /\(defun recess-col-return \(ch g ez1 ed capt\)/, /\(defun recess-col-divider \(x0 gd cd g ed front capy\)/,
    /\(defun recess-col-cap-bump \(cw g ex0 ex1 ed capd\)/, /\(defun recess-col-cap-outline /,
    /\(defun recess-col-drawer-depth \(usable ed\)/, /\(defun recess-col-fillers \(cw cd g ex0 ex1 capy fy /,
    /\(defun recess-col-divider-x \(cw ex0 ex1 x w /, /\(defun recess-hand-cut \(cut bw bh he colp /,
    /\(defun recess-piece-at \(pieces cuts x z r /, /\(defun recess-window-pieces \(cw ch w /,
    // recess-back-joints' runs end at the WINDOW's edges; RECESS_FULL draws the cut as the cutter takes it.
    /\(append \(if \(recess-left-p ex0\) nil \(list \(list g wx0\)\)\)/, /\(recess-p "recess\.handEdge"\) nil\)\)\)/,
    /plecy, ale tylko w podkowie U/, /szuflady tez prosze/,
  ]) assert.match(text, m);
  const notch = read('reference/lisp/KIT_NOTCH.lsp');
  assert.equal(parenScan(notch).balance, 0);
  assert.match(notch, /\("recess\.handEdge"\s+\. 1\.0\)\)\)/, 'the table KIT_RECESS.lsp reads carries the hand edge');
});

// ─── section I, routine by routine: the NUMBERS (I2) ─────────────────────────

test('I · recess-col-refusal: CASE E is a recess column; each other case in words', () => {
  assert.equal(X.recessColRefusal(1000, 2150, 18, 110, 890, 0, 2150, 110, 872, 18, 629, K), null);
  assert.equal(X.recessColRefusal(1000, 2150, 18, 110, 890, 0, 2150, 110.5, 871.5, 18, 629, K), null, 'within the editor\'s half millimetre');
  assert.match(X.recessColRefusal(1000, 2150, 18, 0, 890, 0, 2150, 110, 872, 18, 629, K), /reaches a side of the carcass/);
  assert.match(X.recessColRefusal(1000, 2150, 18, 110, 1000, 0, 2150, 110, 872, 18, 629, K), /reaches a side of the carcass/);
  assert.match(X.recessColRefusal(1000, 2150, 18, 110, 890, 200, 2150, 110, 872, 18, 629, K), /does not start on the floor/);
  assert.match(X.recessColRefusal(1000, 2150, 18, 110, 890, 0, 2150, 100, 872, 18, 629, K), /do not stand on the recess's edges/);
  assert.match(X.recessColRefusal(1000, 2150, 18, 110, 890, 0, 2150, 110, 880, 18, 629, K), /do not stand on the recess's edges/);
  // bz1 682 is 35 over the board's top (647): under notch.minInterior (100).
  assert.match(X.recessColRefusal(1000, 2150, 18, 110, 890, 0, 700, 110, 872, 18, 629, K), /ends too close over the board over the drawers/);
});

test('I · the window, the pieces, the BOTTOM\'s bump and the back runs of a recess column (CASE E)', () => {
  assert.deepEqual(X.recessColWindow(1000, 2150, 18, 110, 890, 0, 2150), [110, 0, 890, 2150]);
  assert.deepEqual(X.recessColBackPieces(1000, 2150, 18, 110, 890, 0, 2150), [[0, 0, 110, 2150], [890, 0, 1000, 2150]]);
  // The law of the pieces is the window's: the band's own window gives what recessBackPieces always gave.
  assert.deepEqual(X.recessWindowPieces(1000, 2150, X.recessWindow(1000, 2150, 18, 110, 890, 0, 2150)),
    X.recessBackPieces(1000, 2150, 18, 110, 890, 0, 2150));
  assert.deepEqual(X.recessColBackPieces(1000, 2150, 18, 110, 890, 0, 1200), [[0, 0, 1000, 2150]], 'E2: one piece, a bite');
  assert.deepEqual(X.recessColPlanBump(1000, 568, 18, 110, 890, 150), [964, 550, 92, 872, 150]);
  assert.deepEqual(X.recessColBottomOutline(1000, 568, 18, 110, 890, 150),
    [[0, 0], [964, 0], [964, 550], [872, 550], [872, 700], [92, 700], [92, 550], [0, 550]]);
  const tj = X.recessColTopJoints(1000, 568, 18, 110, 890, K);
  assert.deepEqual(tj.BACK, [], 'the runs 0..92 and 872..964 are under 96 (D7): screwed, no socket');
  const band = X.recessTopJoints(1000, 568, 18, 110, 890, 150, K);
  assert.deepEqual([tj.LEFT, tj.RIGHT], [band.LEFT, band.RIGHT], 'no side grows: the long edges as the band\'s');
  assert.deepEqual(band.BACK, [55, 909], 'the band\'s own runs 0..110 and 854..964 carry one socket each');
});

test('I · the added boards, the dividers, the board over the drawers, the drawers and the fillers (CASE E, E2)', () => {
  assert.deepEqual(X.recessColBoxPlaces(1000, 568, 2150, 18, 110, 890, 0, 2150, 150, 647), {
    'RETURN-L': [110, 550, 647, 128, 700, 2150],
    'RETURN-R': [872, 550, 647, 890, 700, 2150],
    'EXT-BACK': [110, 700, 0, 890, 718, 2150],
  });
  assert.deepEqual(X.recessColBoxPlaces(1000, 568, 2150, 18, 110, 890, 0, 1200, 150, 647), {
    'RETURN-L': [110, 550, 647, 128, 700, 1182],
    'RETURN-R': [872, 550, 647, 890, 700, 1182],
    LID: [110, 568, 1182, 890, 700, 1200],
    'EXT-BACK': [110, 700, 0, 890, 718, 1200],
  });
  assert.deepEqual(X.recessColReturn(2150, 18, 2150, 150, 647), [150, 1503]);
  assert.deepEqual(X.recessColReturn(2150, 18, 1200, 150, 647), [150, 535]);
  assert.deepEqual(X.recessColDivider(110, 18, 568, 18, 150, 10, 629), [110, 10, 18, 128, 700, 629], '690 deep, 611 high');
  assert.deepEqual(X.recessColCapBump(1000, 18, 110, 890, 150, 540), [964, 540, 92, 872, 150]);
  assert.deepEqual(X.recessColCapOutline(1000, 18, 110, 890, 150, 540),
    [[0, 0], [964, 0], [964, 540], [872, 540], [872, 690], [92, 690], [92, 540], [0, 540]]);
  assert.equal(X.recessColDrawerDepth(455, 150), 605, 'the ladder takes 590');
  assert.deepEqual(X.recessColFillers(1000, 568, 18, 110, 890, 629, 90), {
    L1: [18, 90, 18, 110, 108, 629], L2: [18, 532, 18, 110, 550, 629],
    R1: [890, 90, 18, 982, 108, 629], R2: [890, 532, 18, 982, 550, 629],
  });
  assert.deepEqual(Object.keys(X.recessColFillers(1000, 568, 18, 18, 890, 629, 90)), ['R1', 'R2'], 'a slot of nothing takes none');
  // ALIGN WITH RECESS: the nearer edge, the left face at 110 or 890 - 18.
  assert.equal(X.recessColDividerX(1000, 110, 890, 100, 18), 110);
  assert.equal(X.recessColDividerX(1000, 110, 890, 880, 18), 872);
  assert.equal(X.recessColDividerX(1000, 0, 890, 100, 18), 872, 'the band from the left side: only its right edge');
  assert.equal(X.recessColDividerX(1000, 0, 1000, 500, 18), null, 'no edge inside the carcass');
});

test('I · D23 the hand edge: 1 more on the cut\'s own edges; a recess column\'s edges across stay; D25 the piece a hole falls on', () => {
  assert.deepEqual(X.recessHandCut([128, 228, 472, 572], 600, 770, 1, false), [127, 227, 473, 573], 'CASE B: the window, four');
  assert.deepEqual(X.recessHandCut([128, 0, 872, 1182], 1000, 2150, 1, false), [127, 0, 873, 1183], 'E3: the owner\'s U, three');
  assert.deepEqual(X.recessHandCut([110, 0, 890, 1182], 1000, 2150, 1, true), [110, 0, 890, 1183], 'E2: a recess column, its top only');
  assert.deepEqual(X.recessHandCut([328, 0, 600, 572], 600, 770, 1, false), [327, 0, 600, 573], 'a corner, two');
  assert.deepEqual(X.recessHandCut([328, 228, 600, 572], 600, 770, 1, false), [327, 227, 600, 573], 'F2 CASE D, a bite at the right');
  assert.equal(K['recess.handEdge'], 1);
  const pieces = [[0, 0, 110, 2150], [890, 0, 1000, 2150]];
  assert.deepEqual(X.recessPieceAt(pieces, [null, null], 68, 638, 1.5), { id: 'BACK', x: 68, z: 638 });
  assert.equal(X.recessPieceAt(pieces, [null, null], 500, 638, 1.5), null, 'in the window: no board');
  assert.deepEqual(X.recessPieceAt(pieces, [null, null], 932, 638, 1.5), { id: 'BACK-2', x: 42, z: 638 });
  assert.equal(X.recessPieceAt(pieces, [null, null], 109, 638, 1.5), null, 'where a recess column\'s divider passes through');
  const one = [[0, 0, 1000, 2150]];
  assert.equal(X.recessPieceAt(one, [[110, 0, 890, 1183]], 500, 638, 1.5), null, 'E2: in the bite');
  assert.deepEqual(X.recessPieceAt(one, [[110, 0, 890, 1183]], 500, 2141, 1.5), { id: 'BACK', x: 500, z: 2141 });
});

// ─── CASE E through computeCabinet ───────────────────────────────────────────

test('CASE E · the recess column cut: the dividers 690 under ONE board 964 x 690, the drawers 590, RETURNs on the board', () => {
  const r = computeCabinet(caseE(), P);
  assert.deepEqual(r.warnings, []);
  const e = r.derived.extension;
  assert.deepEqual(e.window, [110, 0, 890, 2150]);
  assert.equal(e.pieces, 2);
  assert.deepEqual(e.boards, ['BACK-2', 'RETURN-L', 'RETURN-R', 'EXT-BACK']);
  assert.deepEqual(e.column, { zone: 1, dividers: ['VPART-1', 'VPART-2'], cap: 'PARTITION', capY: 629 });
  for (const [id, x] of [['VPART-1', 110], ['VPART-2', 872]]) {
    const vp = panelOf(r, id);
    assert.deepEqual(vp.box, { x, y: 18, z: -132, w: 18, h: 611, d: 690 }, `${id} stops under the board, runs to the EXT-BACK`);
    assert.deepEqual([vp.w, vp.h, vp.cnc.drawn_w, vp.cnc.drawn_h], [611, 690, 690, 611]);
    assert.deepEqual(vp.cnc.outline, [[0, 0], [690, 0], [690, 611], [0, 611]]);
    assert.equal(vp.meta.front_mm, 10, 'its own setback kept at the front');
    assert.equal(vp.meta.terminatesOn, 'PARTITION');
  }
  // THE BOARD OVER THE DRAWERS, its own frame (x across from BUL's inner face, y from its BACK edge).
  const cap = panelOf(r, 'PARTITION');
  assert.deepEqual(cap.box, { x: 18, y: 629, z: -132, w: 964, h: 18, d: 690 });
  assert.deepEqual([cap.w, cap.h], [964, 690]);
  assert.equal(cap.meta.front_mm, 10, 'D24: 10 like every shelf');
  assert.equal(cap.meta.variant, 'fixed');
  assert.deepEqual(cap.cnc.outline, [[0, 150], [92, 150], [92, 0], [872, 0], [872, 150], [964, 150], [964, 690], [0, 690]]);
  assert.deepEqual(cap.cnc.marks.filter((m) => m.layer === 'CORNER_4MM').map((m) => m.pts),
    [[[52, 150], [92, 150], [92, 110]], [[872, 110], [872, 150], [912, 150]]]);
  assert.deepEqual(cap.meta.planOutline, [[0, 690], [964, 690], [964, 150], [872, 150], [872, 0], [92, 0], [92, 150], [0, 150]]);
  assert.equal(Math.round(cap.area_m2 * 1e6), 637560);
  assert.equal(r.panels.filter((p) => p.part === 'PARTITION').length, 1, 'one board, no Z2-PART');
  // THE BOTTOM between the band's outer faces; THE TOP the band's own.
  assert.deepEqual(panelOf(r, 'BOTTOM').meta.planOutline, [[0, 700], [964, 700], [964, 150], [872, 150], [872, 0], [92, 0], [92, 150], [0, 150]]);
  assert.deepEqual(panelOf(r, 'TOP').meta.planOutline, [[0, 700], [964, 700], [964, 150], [854, 150], [854, 0], [110, 0], [110, 150], [0, 150]]);
  // THE BACK in two, 110 wide; the RETURNs on the board, through the BACK's plane.
  assert.deepEqual(r.panels.filter((p) => p.part === 'BACK').map((p) => [p.id, p.w, p.h, p.box.x]), [['BACK', 110, 2150, 0], ['BACK-2', 110, 2150, 890]]);
  assert.deepEqual(panelOf(r, 'RETURN-L').box, { x: 110, y: 647, z: -132, w: 18, h: 1503, d: 150 });
  assert.deepEqual(panelOf(r, 'RETURN-R').box, { x: 872, y: 647, z: -132, w: 18, h: 1503, d: 150 });
  assert.deepEqual([panelOf(r, 'RETURN-L').w, panelOf(r, 'RETURN-L').h], [150, 1503]);
  assert.deepEqual([panelOf(r, 'EXT-BACK').w, panelOf(r, 'EXT-BACK').h], [780, 2150]);
  // THE SLOTS closed on the DP's two lines.
  assert.deepEqual(r.panels.filter((p) => p.part === 'FILLER').map((p) => [p.id, p.w, p.h, p.box.x, p.box.z]), [
    ['Z2-FILLER-L1', 92, 611, 18, 460], ['Z2-FILLER-L2', 92, 611, 18, 18],
    ['Z2-FILLER-R1', 92, 611, 890, 460], ['Z2-FILLER-R2', 92, 611, 890, 18],
  ]);
  assert.equal(r.panels.filter((p) => p.part === 'DP').length, 0, 'no DP: the drawers stand the slot clear of the hinges');
  // THE DRAWERS: 590 (440 before), the box from -97 to 493, 35 clear of the EXT-BACK.
  for (const i of [1, 2, 3]) {
    const side = panelOf(r, `Z2D${i}-SL`);
    assert.equal(side.w, 590);
    assert.deepEqual([side.box.z, side.box.d], [-97, 590]);
  }
});

test('CASE E · the divider\'s runner row from its own front, the BACK\'s rows on its runs, D25 and the divider\'s foot', () => {
  const r = computeCabinet(caseE(), P);
  // VPART-2 is the column's RIGHT wall: its LEFT face, drilled as BUL from its own front edge (10 behind the face).
  assert.deepEqual([...new Set(holesOf(r, 'VPART-2', 'runner').map(([x]) => x))], [102, 134, 358]);
  const vp2 = panelOf(r, 'VPART-2');
  assert.deepEqual([102, 134, 358].map((x) => worldZ(vp2, x, 0)), [456, 424, 200], 'the runner\'s own 37 69 293 behind the box front 493');
  // VPART-1 is its LEFT wall: its RIGHT face, the same part turned over, drilled as BUR (T82 F9): 690 - v.
  assert.deepEqual([...new Set(holesOf(r, 'VPART-1', 'runner').map(([x]) => x))], [588, 556, 332]);
  // The BACK's rows on the runs the window leaves (18..110: two at the quarters), the side rows as the parent's.
  const back = holesOf(r, 'BACK', 'screw');
  assert.deepEqual(back.filter(([, y]) => y === 2141 || y === 9), [[41, 2141], [87, 2141], [41, 9], [87, 9]]);
  assert.ok(back.filter(([, y]) => y !== 2141 && y !== 9).every(([x]) => x === 9), 'the side row into BUL, x 9');
  const back2 = holesOf(r, 'BACK-2', 'screw');
  assert.deepEqual(back2.filter(([, y]) => y === 2141 || y === 9), [[23, 2141], [69, 2141], [23, 9], [69, 9]]);
  assert.ok(back2.filter(([, y]) => y !== 2141 && y !== 9).every(([x]) => x === 101), 'the side row into BUR, x 101');
  // D25: the board's three into the BACK land on the pieces, none in the window; no divider row through a BACK
  // that is not there.
  assert.deepEqual(r.drills.filter((d) => d.kind === 'partition_screw' && /^BACK/.test(d.panel)).map((d) => [d.panel, d.x, d.y]),
    [['BACK', 68, 638], ['BACK-2', 42, 638]]);
  assert.deepEqual(r.drills.filter((d) => d.kind === 'partition_back_screw'), []);
  // The divider's foot (SKYLON_JOINTS_BISCUIT.lsp section I) on the grown BOTTOM over its whole 690: two sets each.
  assert.equal(r.drills.filter((d) => d.kind === 'divider_screw' && d.panel === 'BOTTOM').length, 8);
});

test('CASE E2 · the band to 1200: the U at the BACK\'s bottom, its top edge 1 more, its sides on the dividers', () => {
  const r = computeCabinet(caseE({ z1: 1200 }), P);
  assert.deepEqual(r.warnings, []);
  const back = panelOf(r, 'BACK');
  assert.deepEqual([back.w, back.h], [1000, 2150]);
  assert.deepEqual(back.cnc.bite, { x0: 110, y0: 0, x1: 890, y1: 1183 });
  assert.deepEqual(back.cnc.outline, [[0, 0], [110, 0], [110, 1183], [890, 1183], [890, 0], [1000, 0], [1000, 2150], [0, 2150]]);
  assert.deepEqual(back.cnc.marks.filter((m) => m.layer === 'CORNER_4MM').map((m) => m.pts),
    [[[110, 1143], [110, 1183], [150, 1183]], [[850, 1183], [890, 1183], [890, 1143]]]);
  assert.deepEqual([panelOf(r, 'RETURN-L').w, panelOf(r, 'RETURN-L').h, panelOf(r, 'RETURN-L').box.y], [150, 535, 647]);
  assert.deepEqual([panelOf(r, 'LID').w, panelOf(r, 'LID').h, panelOf(r, 'LID').box.y], [780, 132, 1182]);
  const rows = holesOf(r, 'BACK', 'screw');
  assert.deepEqual(rows.filter(([, y]) => y === 9), [[41, 9], [87, 9], [913, 9], [959, 9]]);
  assert.deepEqual(rows.filter(([, y]) => y === 2141), [[68, 2141], [500, 2141], [932, 2141]], 'the TOP is the parent\'s');
  assert.deepEqual(r.drills.filter((d) => d.kind === 'partition_screw' && d.panel === 'BACK').map((d) => d.x), [68, 932], '500 is in the U');
});

test('CASE E3 · the owner\'s U with no dividers: cut 746 x 1183, 744 x 1182 once the hand edge is on', () => {
  const r = computeCabinet({ ...caseE({ z1: 1200 }), items: [] }, P);
  assert.deepEqual(panelOf(r, 'BACK').cnc.bite, { x0: 127, y0: 0, x1: 873, y1: 1183 });
  assert.equal(r.derived.extension.column, undefined);
  assert.deepEqual(r.warnings, []);
});

// ─── #49: any other column the band reaches keeps the carcass's depth, in words ─

test('#49 · the dividers off the edges, the band off the floor, another stack, a shoe on top, a notch: 440 and the sentence', () => {
  const off = computeCabinet(caseE({ xs: [100, 880] }), P);
  const said = off.warnings.find((w) => w.code === 'RECESS_DRAWERS_SHALLOW');
  assert.equal(said.message, 'RECESS DRAWERS: the dividers do not stand on the recess\'s edges; the drawers keep the carcass\'s '
    + 'depth. Double-click a divider: "Align both with recess" stands the two on the recess\'s edges, at the face.');
  assert.equal(said.zone, 1);
  assert.equal(panelOf(off, 'Z2D1-SL').w, 440);
  assert.ok(panelOf(off, 'Z2-PART'), 'the column keeps its own board');
  assert.equal(panelOf(off, 'VPART-1').box.h, 2114, 'the dividers stand full height');
  assert.equal(off.derived.extension.column, undefined);
  assert.deepEqual(off.derived.extension.window, [128, 0, 872, 2150], 'the band\'s own window');
  const floor = computeCabinet(caseE({ z0: 200 }), P);
  assert.match(floor.warnings.find((w) => w.code === 'RECESS_DRAWERS_SHALLOW').message, /does not start on the floor/);
  const stack = computeCabinet(caseE({ drawers: [drawer(0), { id: 'w1', kind: 'drawer', index: 0, mount: 'internal' }] }), P);
  assert.match(stack.warnings.find((w) => w.code === 'RECESS_DRAWERS_SHALLOW').message, /carries another stack/);
  const shoe = computeCabinet(caseE({ drawers: [drawer(0), drawer(1, { variant: 'shoe' })] }), P);
  assert.match(shoe.warnings.find((w) => w.code === 'RECESS_DRAWERS_SHALLOW').message, /top drawer is the shoe drawer/);
  // D26: a third divider, or the drawers in a side column, are named as such; only the pair off its edges points to the press.
  const three = computeCabinet({ ...caseE(), items: [...caseE().items, { id: 'p3', kind: 'partition', x_mm: 491 }] }, P);
  assert.match(three.warnings.find((w) => w.code === 'RECESS_DRAWERS_SHALLOW').message,
    /between exactly two dividers, one on each of its edges; this cabinet has 3, so they keep the carcass's depth\.$/);
  const side = computeCabinet({ ...caseE({ xs: [300, 700] }), items: [...caseE({ xs: [300, 700] }).items.filter((i) => i.kind === 'partition'),
    drawer(0, { zone: 0 }), drawer(1, { zone: 0 })] }, P);
  assert.equal(side.warnings.find((w) => w.code === 'RECESS_DRAWERS_SHALLOW').message,
    'RECESS DRAWERS: the drawers go into the recess in the column between the two dividers (Column 2); these stand in Column 1, '
    + 'so they keep the carcass\'s depth.');
  // No extension, no zoned drawer: nothing to say.
  assert.deepEqual(computeCabinet({ ...caseE(), extension: null }, P).warnings.filter((w) => w.code === 'RECESS_DRAWERS_SHALLOW'), []);
  assert.deepEqual(computeCabinet({ ...caseE(), items: caseE().items.slice(0, 2) }, P).warnings, []);
  // The Check: #49, yellow, the engine's own words.
  assert.deepEqual(CHECKS.find((c) => c.n === 49), { n: 49, level: 'yellow', label: 'Drawers in front of a recess keep the carcass\'s depth' });
});

// ─── the divider's runner row, on any column ─────────────────────────────────

test('the divider\'s runner row (28.10): its left face as BUL, its right face turned over as BUR, from its own front', () => {
  const kit = (zone, front) => computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 1200, depth: 558, ...PROJECT,
    items: [{ id: 'p1', kind: 'partition', x_mm: 591, front_mm: front },
      { id: 'd1', kind: 'drawer', zone, index: 0, height_mm: 200, mount: 'internal' }],
  }, P);
  // Column 1 (BUL .. VPART-1): VPART-1's LEFT face at the face: the runner's own 37 69 293 behind the setback 75.
  const left = kit(0, 0);
  assert.deepEqual([...new Set(holesOf(left, 'VPART-1', 'runner').map(([x]) => x))], [112, 144, 368]);
  assert.deepEqual([112, 144, 368].map((x) => worldZ(panelOf(left, 'VPART-1'), x, 0)), [446, 414, 190], 'on BUL\'s own lines');
  // Column 2 (VPART-1 .. BUR): its RIGHT face, turned over: 540 - v, exactly BUR's own numbers.
  const right = kit(1, 0);
  assert.deepEqual([...new Set(holesOf(right, 'VPART-1', 'runner').map(([x]) => x))], [428, 396, 172]);
  assert.deepEqual([...new Set(holesOf(right, 'BUR', 'runner').map(([x]) => x))], [428, 396, 172]);
  // A divider 10 back: measured from its own front (102 134 358), never from the cap's depth.
  assert.deepEqual([...new Set(holesOf(kit(0, 10), 'VPART-1', 'runner').map(([x]) => x))], [102, 134, 358]);
});

// ─── D25 on any recess-cut BACK ──────────────────────────────────────────────

test('D25 · a full-width stack before a band floor to ceiling: its holes on BACK and BACK-2, none in the window', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 1000, ...PROJECT,
    extension: { x0: 100, x1: 900, z0: 0, z1: 2150, d: 150 },
    items: [{ id: 'd1', kind: 'drawer', index: 0, mount: 'internal' }, { id: 'd2', kind: 'drawer', index: 1, mount: 'internal' },
      { id: 's1', kind: 'shelf', pos_mm: 1400, locked: true }],
  }, P);
  const back = (kind) => r.drills.filter((d) => d.kind === kind && /^BACK/.test(d.panel)).map((d) => [d.panel, d.x]);
  assert.deepEqual(back('partition_screw'), [['BACK', 68], ['BACK-2', 50]], 'was 68, 500 and 932, all on a BACK 118 wide');
  assert.deepEqual(back('dp_screw').map(([p]) => p).sort(), ['BACK', 'BACK', 'BACK-2', 'BACK-2']);
  assert.ok(back('dp_screw').every(([p, x]) => (p === 'BACK' ? x < 118 : x < 118)), 'on the board');
  for (const [p, x] of back('shelf_back_screw')) assert.ok(x > 0 && x < 118, `${p} x ${x} is on the board`);
});

// ─── D24 and D23 in the profile ──────────────────────────────────────────────

test('D24 · the board over the drawers 10 in a project; a saved profile\'s old 20 is rebuilt from code; D23 is 1', () => {
  assert.equal(P.wardrobe.drawers.capSetbackMm, 10);
  const saved = { ...P, wardrobe: { ...P.wardrobe, drawers: { ...P.wardrobe.drawers, capSetbackMm: 20 } } };
  assert.equal(migrateCabinetProfile(saved).wardrobe.drawers.capSetbackMm, 10, 'no screen edits it: the code\'s number');
  assert.equal(P.recess.handEdgeMm, 1);
  assert.equal(notchProfile(P)['recess.handEdge'], 1);
  // A profile saved before tonight carries no `recess` key at all.
  const { recess: _none, ...before } = P;
  assert.equal(notchProfile(before)['recess.handEdge'], 1, 'a profile saved before tonight reads 1');
  assert.equal(migrateCabinetProfile(before).recess.handEdgeMm, 1);
});

// ─── the store, as a person builds it ────────────────────────────────────────

function wardrobeBeforeRecess() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 800, depth: 150 });
  const a = S().addUnit('WARDROBE', { wall: 0, x: 200 });
  assert.equal(a.error, null, a.error);
  S().updateUnitParams(a.id, { width: 1000 });
  S().moveUnit(a.id, 900, 1);
  return a.id;
}
const unitOf = (id) => S().units.find((u) => u.id === id);
const partsOf = (id) => unitOf(id).params.sections[0].items.filter((i) => i.kind === 'partition');

test('the store · Align with recess puts each divider on its edge; the drawers between go into the recess; #49 says so until then', () => {
  const id = wardrobeBeforeRecess();
  const band = S().unitResult(id).derived.extension;
  assert.deepEqual([band.x0, band.x1, band.z0, band.d], [110, 890, 0, 140], 'the room\'s band: 10 off the reveals, the wall gap off its depth');
  S().addPartition(id, 300);
  S().addPartition(id, 700);
  // The column guard: drawers beside a divider need it at the face.
  for (const p of partsOf(id)) S().setElementDepth(id, p.id, 0);
  const added = S().addDrawers(id, 3, 'internal', undefined, 1);
  assert.equal(added.ok, true, added.message);
  const before = S().unitResult(id);
  assert.equal(before.panels.find((p) => p.id === 'Z2D1-SL').w, 440);
  const rows = S().runChecks().filter((f) => f.check === 49);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].level, 'yellow');
  assert.match(rows[0].message, /"Align both with recess"/);
  // The button's one action (D26): both dividers, one press.
  const res = S().alignDividersWithRecess(id, partsOf(id)[1].id);
  assert.equal(res.ok, true, res.error);
  assert.equal(res.pair, true);
  assert.deepEqual(partsOf(id).map((p) => p.x_mm), [110, 872]);
  const after = S().unitResult(id);
  assert.deepEqual(after.warnings.filter((w) => w.code === 'RECESS_DRAWERS_SHALLOW'), []);
  assert.deepEqual(S().runChecks().filter((f) => f.check === 49), []);
  // The store's wardrobe is 558 deep and the room's band 140 (the recess's 150 less the wall gap): the usable 445
  // plus 140 is 585, the ladder's 540 (440 before; the runner every 50, the box 10 less).
  const D = Number(unitOf(id).params.depth);
  assert.equal(D, 558);
  assert.equal(after.panels.find((p) => p.id === 'Z2D1-SL').w, 540);
  assert.equal(after.panels.find((p) => p.id === 'VPART-1').box.d, D + 140 - 18, 'flush at the face, to the EXT-BACK');
  assert.equal(after.panels.find((p) => p.id === 'PARTITION').meta.front_mm, 10);
  assert.equal(paramsForEngine(unitOf(id)).drawer_cap_setback_mm, 10);
  assert.ok(after.derived.extension.column);
});

// ─── D26: the owner's walk at home (*"problem polega na tym ze nie dzialaja te szuflady"*) ─────────────

test('D26 · the app\'s own two dividers (491, 245.5): one press stands both on the edges, at the face, in one undo; then the drawers go into the recess', () => {
  const id = wardrobeBeforeRecess();
  // "Add a vertical partition", twice, as the panel does it: centred in the widest bay.
  S().addPartition(id);
  S().addPartition(id);
  assert.deepEqual(partsOf(id).map((p) => p.x_mm), [491, 245.5], 'the app\'s own places');
  // What failed for him: D22's per-divider rule took the one at 491 LEFT (381 either way, a tie) and the
  // other's minimum gap stopped it at 285.5.
  assert.equal(X.recessColDividerX(1000, 110, 890, 491, 18), 110);
  assert.equal(X.recessColDividerX(1000, 110, 890, 245.5, 18), 110);
  const [mid, left] = partsOf(id);
  const plan = recessAlignPlan(unitOf(id), S().unitResult(id), mid.id);
  assert.deepEqual(plan, { moves: [{ id: left.id, x: 110 }, { id: mid.id, x: 872 }], pair: true, done: false });
  flushHistory();
  const before = JSON.parse(JSON.stringify(S().units));
  const depth = useHistoryStore.getState().past.length;
  const res = S().alignDividersWithRecess(id, mid.id);
  flushHistory();
  assert.deepEqual(res, { ok: true, pair: true, moves: plan.moves });
  assert.deepEqual(partsOf(id).map((p) => [p.x_mm, p.front_mm]), [[872, 0], [110, 0]], 'both on the edges, both at the face');
  assert.equal(useHistoryStore.getState().past.length, depth + 1, 'one press, one undo');
  assert.equal(recessAlignPlan(unitOf(id), S().unitResult(id), mid.id).done, true, 'the button goes once they stand there');
  // One Ctrl+Z puts both back where the app put them; Ctrl+Y stands them again.
  assert.ok(useHistoryStore.getState().undo());
  assert.deepEqual(JSON.parse(JSON.stringify(S().units)), before, 'one undo, both dividers');
  assert.ok(useHistoryStore.getState().redo());
  assert.deepEqual(partsOf(id).map((p) => [p.x_mm, p.front_mm]), [[872, 0], [110, 0]]);
  // The drawers in the column between them (Column 2): into the recess, nothing to say.
  assert.equal(S().addDrawers(id, 3, 'internal', 200, 1).ok, true);
  const r = S().unitResult(id);
  assert.deepEqual(r.warnings.filter((w) => w.code === 'RECESS_DRAWERS_SHALLOW'), []);
  assert.deepEqual(r.derived.extension.column, { zone: 1, dividers: ['VPART-1', 'VPART-2'], cap: 'PARTITION', capY: 629 });
  assert.equal(r.panels.find((p) => p.id === 'Z2D1-SL').w, 540);
  assert.equal(r.panels.find((p) => p.id === 'VPART-1').box.d, 680);
  assert.deepEqual([r.panels.find((p) => p.id === 'PARTITION').w, r.panels.find((p) => p.id === 'PARTITION').h], [964, 670]);
});

test('D26 · the drawers first, then the press: the guard asks for the face, the press gives it; one divider goes to its nearer edge', () => {
  const id = wardrobeBeforeRecess();
  S().addPartition(id);
  S().addPartition(id);
  // The project's dividers stand 10 back: the column guard refuses drawers beside them, in words.
  const refused = S().addDrawers(id, 3, 'internal', 200, 1);
  assert.equal(refused.ok, false);
  const res = S().alignDividersWithRecess(id, partsOf(id)[1].id);
  assert.equal(res.ok, true);
  assert.equal(S().addDrawers(id, 3, 'internal', 200, 1).ok, true, 'at the face, the column takes them');
  assert.deepEqual(S().unitResult(id).warnings.filter((w) => w.code === 'RECESS_DRAWERS_SHALLOW'), []);
  // One divider: the pressed one to its nearer edge, at the face.
  const one = wardrobeBeforeRecess();
  S().addPartition(one, 700);
  const solo = partsOf(one)[0];
  assert.deepEqual(recessAlignPlan(unitOf(one), S().unitResult(one), solo.id).moves, [{ id: solo.id, x: 872 }]);
  assert.equal(S().alignDividersWithRecess(one, solo.id).ok, true);
  assert.deepEqual(partsOf(one).map((p) => [p.x_mm, p.front_mm]), [[872, 0]]);
  // No recess: no plan, no button.
  S().newProject();
  const plain = S().addUnit('WARDROBE', { wall: 0, x: 200 });
  S().addPartition(plain.id);
  assert.equal(recessAlignPlan(unitOf(plain.id), S().unitResult(plain.id), partsOf(plain.id)[0].id), null);
  assert.equal(S().alignDividersWithRecess(plain.id, partsOf(plain.id)[0].id).ok, false);
});

test('D26 · recess-col-pair-x: the pair on the two edges; none when the band reaches a side', () => {
  assert.deepEqual(X.recessColPairX(1000, 110, 890, 18), [110, 872]);
  assert.deepEqual(X.recessColPairX(1000, 110, 890, 25), [110, 865], 'the right one\'s own board');
  assert.equal(X.recessColPairX(1000, 0, 890, 18), null);
  assert.equal(X.recessColPairX(1000, 110, 1000, 18), null);
  const text = read('reference/lisp/KIT_RECESS.lsp');
  assert.match(text, /;;; D26 ALIGN WITH RECESS STANDS BOTH DIVIDERS\./);
  assert.match(text, /\(defun recess-col-pair-x \(cw ex0 ex1 w\)/);
  assert.match(text, /problem\s*\n?;*\s*polega na tym ze nie dzialaja te szuflady/);
  assert.match(text, /THE PAIR \(D26, recess-col-pair-x 1000 110 890 18\) = \(110 872\)/);
});

test('the window · Align with recess, in PRO and in its retail copy, through the store\'s one action', () => {
  for (const file of ['src/components/ElementProperties.jsx', 'src/retail/design/detail/ElementProperties.jsx']) {
    const src = read(file);
    assert.match(src, /import \{ recessAlignPlan \} from '(\.\.\/)+stores\/projectStore\.js';/);
    assert.match(src, /data-partition-align-recess=\{item\.id\}/);
    assert.match(src, /const res = alignDividersWithRecess\(unit\.id, item\.id\);/);
    assert.match(src, /\{alignPlan\.pair \? 'Align both with recess' : 'Align with recess'\}/);
    assert.match(src, /\{alignPlan && !alignPlan\.done \? \(/);
  }
});

// ─── the golden, the six, the classifier ─────────────────────────────────────

test('the golden · golden-recess-drawers.json is CASE E, byte for byte; golden-recess-band re-pinned with his words; the six hold', () => {
  const g = JSON.parse(read('fixtures/golden-recess-drawers.json'));
  assert.deepEqual(goldenOf(g.params, P), g.expected);
  assert.deepEqual(g.params, GOLDENS[0].params());
  assert.equal(GOLDENS[0].file, 'golden-recess-drawers.json');
  const band = JSON.parse(read('fixtures/golden-recess-band.json'));
  assert.deepEqual(goldenOf(band.params, P), band.expected);
  assert.match(band.meta.repinned, /Then: 28\.10\.2026 \(chat fix, KIT_RECESS\.lsp D23, the hand edge\)/);
  assert.ok(band.expected.csvLines.includes('01,BACK,600,770,,0,0.342'));
  assert.deepEqual(REPINNED.map((x) => x.file), ['fixtures/golden-recess-band.json']);
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(head[id].sha256, base[id].sha256, id);
});

test('the classifier · four gates, each live; five engine files licensed; two LISP files named', () => {
  assert.deepEqual(Object.keys(GATES), ['recessDrawersColumn', 'recessHandEdge', 'recessBackHoles', 'dividerRunnerRow']);
  for (const key of Object.keys(GATES)) {
    const { live, said } = LIVENESS[key]();
    assert.equal(live, true, `${key}: ${said}`);
  }
  assert.deepEqual(Object.keys(LICENSED).sort(), ['src/engine/cabinet.js', 'src/engine/checks.js', 'src/engine/extension.js',
    'src/engine/notch.js', 'src/engine/profile.js']);
  assert.deepEqual(Object.keys(LISP).sort(), ['reference/lisp/KIT_NOTCH.lsp', 'reference/lisp/KIT_RECESS.lsp']);
  assert.equal(GATES.recessDrawersColumn.opens(caseE()), true);
  assert.equal(GATES.recessDrawersColumn.opens({ ...caseE(), extension: null }), false);
  assert.equal(GATES.recessHandEdge.opens(caseE({ z1: 1200 })), true, 'a bite');
  assert.equal(GATES.recessHandEdge.opens(caseE()), false, 'two whole strips');
});
