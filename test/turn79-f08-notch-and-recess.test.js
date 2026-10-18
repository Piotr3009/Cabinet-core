/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F8 · A NOTCH AND A RECESS ON THE SAME CARCASS ─────────────────────
//
// The owner, 18.10.2026: *"dlaczego cut the corner likwiduje nam wcięcie do
// recess?"*
//
// THE PROBE (verify/t79/f08-probe.md): BUD 600 with golden-notch.json's notch
// (BL 200 / 200 / 0) and golden-recess.json's band (x 310..600, floor to top,
// 150 deep) was cut as the notch alone, board for board, the band refused by
// KIT_RECESS.lsp D13 in a sentence no screen showed. LISP first: D13 amended to
// WITH A NOTCH (the footprints on the BACK decide), section H and the NUMBERS
// block CASE D; src/engine/extension.js mirrors it and cuts it after the notch.
// These assertions are the probe's table turned round, the LISP's routines and
// its CASE D block on the engine's real cut, the overlap refused in words the
// Check shows, a side both cut, the store, save and reload, the export and the
// goldens.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as N from '../src/engine/notch.js';
import * as X from '../src/engine/extension.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { CHECKS } from '../src/engine/checks.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { resultFindings } from '../src/engine/cnc/edgeGuard.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { cutRows } from '../src/engine/drawings/setPaper.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';
import { GATES, LISP, LICENSED } from '../scripts/t78-classify.d/f34-t79-f08.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const K = N.notchProfile(P);
const r2 = (v) => Math.round(v * 10000) / 10000;

const OWNER = 'dlaczego cut the corner likwiduje nam wcięcie do recess?';
// T79 F6 (KIT_NOTCH.lsp D10 AMENDED), the law the combined BACK follows too (the F6 x F8 seam), the owner
// 18.10.2026: *"jak mamy cut the corners lub recess to nie rysujesz mi dziurek na śrubki 3 mm, to trzeba będzie
// dodać"*; 14:17: *"ale tylko na plecach."*  The LISP states it in ASCII.
const OWNER_F6_LISP = 'jak mamy cut the corners lub recess to nie rysujesz mi dziurek na srubki 3 mm, to trzeba bedzie dodac';
const SENTENCE = 'The recess cannot be cut: the corner cut stands where the recess band is; move one of them.';
const OLD = 'RECESS: a carcass notched round an obstacle cannot grow into a recess as well; the notch stands.';

// The probe's unit: golden-recess.json's BUD (golden-bud.json's BUD-A with 1 shelf).
const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01', front_t: 25, shelves: 1, hinge: 'L' };
const NOTCH = { corner: 'BL', w: 200, d: 200, h: 0 };
const BAND = { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 };
const notchAlone = computeCabinet({ ...BUD, notch: NOTCH }, P);
const extAlone = computeCabinet({ ...BUD, extension: BAND }, P);
const both = computeCabinet({ ...BUD, notch: NOTCH, extension: BAND }, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const size = (r, id) => { const p = panelOf(r, id); return p ? `${r2(p.w)} x ${r2(p.h)}` : '-'; };
const extRefusal = (r) => r.warnings.find((w) => w.code === X.EXTENSION_REFUSED) || null;
/** The same closed walk from whichever vertex, either way round. */
const sameWalk = (a, b) => {
  if (a.length !== b.length) return false;
  const k = (p) => `${r2(p[0])},${r2(p[1])}`;
  const A = a.map(k);
  const B = b.map(k);
  const at = A.indexOf(B[0]);
  if (at < 0) return false;
  const turned = [...A.slice(at), ...A.slice(0, at)];
  return turned.join(';') === B.join(';') || [turned[0], ...turned.slice(1).reverse()].join(';') === B.join(';');
};

// ═══ THE LISP FIRST ════════════════════════════════════════════════════════

test('F8 · KIT_RECESS.lsp: D13 WITH A NOTCH under licence, section H, CASE D; the old refusal is only a record', () => {
  const lisp = read('reference/lisp/KIT_RECESS.lsp');
  assert.match(lisp, /;;; D13 WITH A NOTCH\. Amended 18\.10\.2026 under the owner's word: \*"dlaczego\s+;;;\s+cut the corner likwiduje nam wciecie do recess\?"\*/);
  assert.match(lisp, /;;; H\. WITH A NOTCH \(D13, 18\.10\.2026\)/);
  assert.match(lisp, /;;; CASE D \(fixtures\/golden-notch-and-recess\.json; D13, 18\.10\.2026/);
  for (const routine of ['recess-notch-footprint', 'recess-notch-overlap-p', 'recess-runs', 'recess-in-run', 'recess-notch-zcut',
    'recess-notch-xcut', 'recess-cut-corner', 'recess-notched-top-outline', 'recess-notched-top-joints',
    'recess-notched-side-outline', 'recess-notched-side-joints', 'recess-notched-back-pieces', 'recess-notched-back-corner',
    'recess-notched-back-outline', 'recess-notched-shelf-outline', 'recess-box-name', 'recess-notch-box-rows']) {
    assert.ok(lisp.includes(`(defun ${routine} `), `the LISP defines ${routine}`);
  }
  // The F6 x F8 seam: the rows into the notch's box are KIT_NOTCH's own routine, called, never re-stated.
  const notchLisp = read('reference/lisp/KIT_NOTCH.lsp');
  assert.ok(notchLisp.includes('(defun notch-back-box-rows (cw ch g nw nh corner '), 'KIT_NOTCH defines notch-back-box-rows');
  assert.ok(notchLisp.includes('box (notch-back-box-rows cw ch g nw nh corner))'), 'notch-back-joints draws it');
  assert.match(lisp, /\(foreach p \(recess-notch-box-rows nb cw ch g\)/, 'recess-back-joints draws it on the piece');
  assert.match(lisp, /\(cdr \(assoc "SCREWS" \(notch-back-box-rows cw ch g \(- \(caddr nb\) \(car nb\)\) nh/, 'recess-notch-box-rows calls the notch\'s own');
  const d13 = lisp.slice(lisp.indexOf(';;; D13 WITH A NOTCH'), lisp.indexOf(';;; D14 THE PARENTS')).replace(/;;;\s*/g, ' ').replace(/\s+/g, ' ');
  assert.ok(d13.includes(OWNER_F6_LISP) && d13.includes('ale tylko na plecach.'), 'D13 quotes the F6 law it follows');
  assert.ok(d13.includes('carries the rows into it exactly as the notched BACK alone does'));
  // recess-refusal answers an overlap with the sentence the Check shows; the old one stands only in comments.
  assert.match(lisp, /\(cond \(\(recess-notch-overlap-p fp ex0 ex1 ez0 ez1\)\s+"The recess cannot be cut: the corner cut stands where the recess band is; move one of them\."\)/);
  const code = lisp.split('\n').filter((l) => !/^\s*;/.test(l)).join('\n');
  assert.ok(!code.includes('notched round an obstacle'), 'the old sentence is no answer of the LISP any more');
  assert.doesNotMatch(lisp, /[^\x00-\x7f]/, 'the LISP stays ASCII');
  assert.ok(LISP['reference/lisp/KIT_RECESS.lsp'].includes(OWNER), 'the licence quotes the owner');
  assert.ok(LICENSED['src/engine/extension.js'].why.includes(OWNER));
});

// ═══ THE PROBE, TURNED ROUND ═══════════════════════════════════════════════

test('F8 · THE PROBE table 1: the notch alone and the extension alone are what they were; both now cut both', () => {
  // verify/t79/f08-probe.md section 1, its first two columns verbatim, and the third as the law now reads.
  const rows = [
    ['BUL', '340 x 770', '540 x 770', '340 x 770'],
    ['BUR', '540 x 770', '690 x 770', '690 x 770'],
    ['TOP', '564 x 540', '564 x 690', '564 x 690'],
    ['BOTTOM', '564 x 540', '564 x 690', '564 x 690'],
    ['BACK', '400 x 770', '328 x 770', '128 x 770'],
    ['SHELF-1', '560 x 520', '560 x 670', '560 x 670'],
    ['RETURN', '182 x 770', '-', '182 x 770'],
    ['STEP', '218 x 770', '-', '218 x 770'],
    ['RETURN-L', '-', '132 x 770', '132 x 770'],
    ['EXT-BACK', '-', '290 x 770', '290 x 770'],
  ];
  for (const [id, n, e, b] of rows) {
    assert.equal(size(notchAlone, id), n, `${id}, the notch alone`);
    assert.equal(size(extAlone, id), e, `${id}, the extension alone`);
    assert.equal(size(both, id), b, `${id}, both`);
  }
  // Section 2: what it says. Until T79 the third row carried EXTENSION_REFUSED with the old sentence.
  assert.deepEqual(notchAlone.warnings, []);
  assert.deepEqual(extAlone.warnings, []);
  assert.deepEqual(both.warnings, [], 'nothing refused');
  assert.deepEqual(both.derived.notch, notchAlone.derived.notch, 'derived.notch as the notch alone');
  assert.deepEqual(both.derived.extension, {
    x0: 310, x1: 600, z0: 0, z1: 770, d: 150, window: [328, 0, 600, 770],
    grown: ['BUR', 'TOP', 'BOTTOM', 'BACK', 'SHELF-1'], boards: ['RETURN-L', 'EXT-BACK'], pieces: 1, for: 'a recess in this wall',
  });
  assert.ok(!both.warnings.some((w) => w.message === OLD));
});

// ═══ SECTION H, THE ROUTINES ═══════════════════════════════════════════════

test('F8 · section H: the footprint on the BACK and the overlap (from the floor, the whole height, from the top)', () => {
  assert.deepEqual(X.recessNotchFootprint(600, 770, 200, 0, 'BL'), [0, 0, 200, 770]);
  assert.deepEqual(X.recessNotchFootprint(600, 770, 200, 300, 'BR'), [400, 0, 600, 300]);
  assert.deepEqual(X.recessNotchFootprint(600, 770, 200, -300, 'BL'), [0, 470, 200, 770], 'D21: the top 300');
  assert.deepEqual(X.recessNotchFootprint(600, 770, 200, 300, 'FR'), [400, 0, 600, 300], 'a front corner\'s width over the same x');
  const fp = X.recessNotchFootprint(600, 770, 200, 0, 'BL');
  assert.equal(X.recessNotchOverlapP(fp, 310, 600, 0, 770), false, 'apart');
  assert.equal(X.recessNotchOverlapP(fp, 200, 600, 0, 770), false, 'touching is not overlapping');
  assert.equal(X.recessNotchOverlapP(fp, 100, 600, 0, 770), true);
  assert.equal(X.recessNotchOverlapP(X.recessNotchFootprint(600, 770, 200, 300, 'BL'), 0, 300, 400, 770), false, 'heights apart');
  assert.equal(X.recessNotchOverlapP(X.recessNotchFootprint(600, 770, 200, -300, 'BL'), 0, 300, 400, 770), true, 'from the top: they meet');
  assert.equal(X.recessNotchOverlapP(null, 0, 600, 0, 770), false, 'no notch');
  // recess-refusal reads it; the old boolean is no footprint.
  assert.equal(X.recessRefusal(600, 558, 770, 18, 100, 600, 0, 770, 150, fp, K), SENTENCE);
  assert.equal(X.recessRefusal(600, 558, 770, 18, 310, 600, 0, 770, 150, fp, K), null);
  assert.equal(X.RECESS_NOTCH_OVERLAP, SENTENCE);
});

test('F8 · section H: the runs two cuts leave, the notch\'s height and width on the BACK\'s edges, the box names', () => {
  assert.deepEqual(X.recessRuns(18, 582, [[0, 218]]), [[218, 582]], 'a cut past the run\'s start');
  assert.deepEqual(X.recessRuns(0, 564, [[310, 564], [0, 200]]), [[200, 310]], 'sorted, a run of no length is none');
  assert.deepEqual(X.recessRuns(0, 770, [[418, 770], [0, 300]]), [[300, 418]]);
  assert.deepEqual(X.recessRuns(0, 100, []), [[0, 100]]);
  assert.deepEqual(X.recessInRun([95, 385, 675], [300, 770]), [385, 675]);
  assert.deepEqual(X.recessNotchXcut([0, 0, 200, 770], 18, 600, true), [[0, 218]], 'the notch and its RETURN, nw + g');
  assert.deepEqual(X.recessNotchXcut([400, 0, 600, 300], 18, 600, true), [[382, 600]]);
  assert.deepEqual(X.recessNotchXcut([0, 0, 200, 300], 18, 600, false), [], 'not on that edge');
  assert.deepEqual(X.recessNotchZcut([0, 0, 200, 300], 0, true), [[0, 300]]);
  assert.deepEqual(X.recessNotchZcut([0, 470, 200, 770], 400, true), [[70, 370]], 'in the piece\'s frame');
  assert.deepEqual(X.recessNotchZcut(null, 0, true), []);
  assert.equal(X.recessBoxName('FLOOR', true), 'EXT-FLOOR');
  assert.equal(X.recessBoxName('LID', true), 'EXT-LID');
  assert.equal(X.recessBoxName('RETURN-L', true), 'RETURN-L');
  assert.equal(X.recessBoxName('LID', false), 'LID', 'without a notch every name is as it was');
  // recess-cut-corner is the 3-D's own arithmetic: one law, one path.
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.deepEqual(X.recessCutCorner(sq, 10, 10, 'x0y0', 4, 3), N.cutNotchCorner(sq, 10, 10, { fc: 'x0y0', nw: 4, nh: 3 }));
});

test('F8 · section H: the TOP, a side, the BACK and a shelf both cut (the routines, the LISP\'s numbers)', () => {
  assert.deepEqual(X.recessNotchedTopOutline(600, 558, 18, 310, 600, 150, 200, 200, 'BL'),
    [[0, 0], [564, 0], [564, 690], [310, 690], [310, 540], [200, 540], [200, 340], [0, 340]]);
  assert.deepEqual(X.recessNotchedTopJoints(600, 558, 18, 310, 600, 150, 200, 200, 'BL', K),
    { LEFT: [95, 245], RIGHT: [95, 595], BACK: [255] }, 'into BUL the notch\'s, into BUR the extension\'s, one run 200..310');
  // A side both cut: a BOXED notch 300 high under a band from 400 to the top, on BUL (its frame, x from the front).
  assert.deepEqual(X.recessNotchedSideOutline(558, 770, 18, 400, 770, 150, 200, 200, 300, 'BL'),
    [[540, 418], [690, 418], [690, 770], [0, 770], [0, 0], [340, 0], [340, 300], [540, 300]]);
  assert.deepEqual(X.recessNotchedSideJoints(558, 770, 18, 400, 770, 150, 200, 200, 300, 'BL', K), {
    'TOP-SOCKETS': [95, 595], 'BOTTOM-SOCKETS': [95, 245], 'TOP-SCREWS': [50, 345, 640], 'BOTTOM-SCREWS': [50, 170, 290],
    'BACK-TABS': [359], 'PIN-COLUMNS': [70, 270],
  }, 'the top edge the extension\'s, the bottom the notch\'s, one tab on 300..418');
  assert.deepEqual(X.recessNotchedSideOutline(558, 770, 18, 400, 770, 150, 10, 200, 300, 'BL'),
    X.recessSideOutline(558, 770, 18, 400, 770, 150, false), 'an unboxed notch is a rebate: the bump alone');
  // The BACK: a full-height notch takes its strip off; a part-height one is a corner of the piece holding it.
  const full = X.recessNotchFootprint(600, 770, 200, 0, 'BL');
  assert.deepEqual(X.recessNotchedBackPieces(600, 770, 18, 310, 600, 0, 770, full), [[200, 0, 328, 770]]);
  assert.deepEqual(X.recessNotchedBackPieces(600, 770, 18, 300, 500, 0, 770, full), [[200, 0, 318, 770], [482, 0, 600, 770]]);
  assert.deepEqual(X.recessNotchedBackPieces(600, 770, 18, 310, 600, 0, 770, null), X.recessBackPieces(600, 770, 18, 310, 600, 0, 770));
  assert.deepEqual(X.recessNotchedBackCorner([0, 0, 600, 770], X.recessNotchFootprint(600, 770, 200, 300, 'BL')), ['x0y0', 200, 300]);
  assert.deepEqual(X.recessNotchedBackCorner([0, 0, 600, 770], X.recessNotchFootprint(600, 770, 200, -300, 'BR')), ['x1y1', 200, 300]);
  assert.equal(X.recessNotchedBackCorner([200, 0, 328, 770], full), null, 'the strip is off, no corner left');
  const cut = X.recessBackCut([0, 0, 600, 770], X.recessWindow(600, 770, 18, 0, 300, 400, 770));
  assert.deepEqual(X.recessNotchedBackOutline([0, 0, 600, 770], cut, ['x0y0', 200, 300]),
    [[600, 0], [600, 770], [282, 770], [282, 418], [0, 418], [0, 300], [200, 300], [200, 0]], 'the window\'s corner and the notch\'s');
  assert.deepEqual(X.recessNotchedShelfOutline(600, 558, 18, 310, 600, 150, [20, 20, 580, 540], 2, 200, 200, 'BL', K),
    [[0, 0], [560, 0], [560, 670], [310, 670], [310, 520], [200, 520], [200, 320], [0, 320]]);
});

test('F8 x F6 · section H: recess-notch-box-rows reads the notch back off its footprint and answers KIT_NOTCH\'s own rows', () => {
  // One law, one path: notchBackBoxRows is what notchBackJoints draws into the box, and what the extension draws.
  for (const [nw, nh, corner] of [[200, 0, 'BL'], [200, 0, 'BR'], [200, 300, 'BL'], [200, -300, 'BL'], [100, 300, 'BR'], [60, 40, 'BL']]) {
    const fp = X.recessNotchFootprint(600, 770, nw, nh, corner);
    const own = N.notchBackBoxRows(600, 770, 18, nw, nh, corner, K);
    assert.deepEqual(X.recessNotchBoxRows(fp, 600, 770, 18, K), own.SCREWS, `${corner} ${nw}/${nh}: the notch's own rows`);
    const bj = N.notchBackJoints(600, 770, 18, nw, nh, corner, K);
    const at = bj.SCREWS.findIndex((p) => p[0] === own.SCREWS[0]?.[0] && p[1] === own.SCREWS[0]?.[1]);
    assert.deepEqual(bj.SCREWS.slice(at, at + own.SCREWS.length), own.SCREWS, `${corner} ${nw}/${nh}: notchBackJoints draws them, in one run`);
    assert.deepEqual(bj.SHORT, own.SHORT.length ? own.SHORT : undefined);
  }
  assert.deepEqual(N.notchBackBoxRows(600, 770, 18, 200, 0, 'BL', K).SCREWS, [[209, 50], [209, 240], [209, 530], [209, 720]], 'the whole new edge, x 209');
  assert.deepEqual(N.notchBackBoxRows(600, 770, 18, 200, 300, 'BL', K).SCREWS,
    [[209, 50], [209, 150], [209, 250], [68, 309], [109, 309], [150, 309]], 'the RETURN\'s run and the LID\'s row');
  assert.deepEqual(N.notchBackBoxRows(600, 770, 18, 200, -300, 'BL', K).SCREWS,
    [[209, 520], [209, 620], [209, 720], [68, 461], [109, 461], [150, 461]], 'D21: the RETURN\'s run and the FLOOR\'s row');
  assert.deepEqual(N.notchBackBoxRows(600, 770, 18, 200, 300, 'FL', K).SCREWS, [], 'a front corner has no box behind the BACK');
  assert.deepEqual(N.notchBackBoxRows(600, 770, 18, 10, 300, 'BL', K).SCREWS, [], 'an unboxed rebate has none');
  assert.deepEqual(X.recessNotchBoxRows(null, 600, 770, 18, K), [], 'no notch, no rows');
});

// ═══ BOARD BY BOARD, THE ENGINE'S REAL CUT (CASE D) ════════════════════════

test('F8 · CASE D: BUL is the notch\'s, BUR the extension\'s; the TOP, the BOTTOM and SHELF-1 take both', () => {
  assert.deepEqual(panelOf(both, 'BUL').cnc.outline, panelOf(notchAlone, 'BUL').cnc.outline);
  assert.deepEqual(panelOf(both, 'BUL').box, panelOf(notchAlone, 'BUL').box);
  assert.deepEqual(panelOf(both, 'BUR').cnc.outline, panelOf(extAlone, 'BUR').cnc.outline);
  const plan = [[0, 0], [564, 0], [564, 690], [310, 690], [310, 540], [200, 540], [200, 340], [0, 340]];
  for (const id of ['TOP', 'BOTTOM']) {
    const p = panelOf(both, id);
    assert.deepEqual(p.meta.extension.outline, plan, `${id}: the plan`);
    assert.equal(r2(p.area_m2 * 1e6), 302660, `${id}: area`);
    assert.equal(p.cnc.notch, null, 'the 3-D extrudes its planOutline');
    assert.equal(p.meta.planOutline.length, 8);
    assert.deepEqual(p.box, panelOf(extAlone, id).box, 'the grown box');
    assert.equal(p.cnc.marks.length, 2, `${id}: two corners, two marks`);
  }
  assert.deepEqual(panelOf(both, 'TOP').cnc.marks.map((m) => m.pts), [[[150, 294], [150, 254], [110, 254]], [[350, 404], [350, 364], [310, 364]]]);
  assert.deepEqual(panelOf(both, 'BOTTOM').cnc.marks.map((m) => m.pts), [[[110, 310], [150, 310], [150, 270]], [[310, 200], [350, 200], [350, 160]]]);
  const sh = panelOf(both, 'SHELF-1');
  assert.deepEqual(sh.meta.extension.outline, [[0, 0], [560, 0], [560, 670], [310, 670], [310, 520], [200, 520], [200, 320], [0, 320]]);
  assert.equal(r2(sh.area_m2 * 1e6), 288700);
  assert.deepEqual(sh.cnc.marks.map((m) => m.pts[1]), [[320, 200], [520, 310]], 'one mark per corner, the notch\'s not twice');
});

test('F8 · CASE D: the BACK is cut from the notched BACK, 128 wide between the notch and the window', () => {
  const bk = panelOf(both, 'BACK');
  assert.equal(bk.w, 128);
  assert.equal(bk.h, 770);
  assert.equal(bk.box.x, 200, 'past the notch');
  assert.deepEqual(bk.cnc.outline, [[0, 0], [128, 0], [128, 770], [0, 770]]);
  assert.equal(bk.cnc.drawn_w, 128);
  assert.equal(bk.cnc.notch, null);
  assert.deepEqual(bk.cnc.marks, []);
  assert.equal(r2(bk.area_m2 * 1e6), 98560);
  // Its joints: no side meets it; the TOP's and the BOTTOM's one socket (carcass 273). Its dia 3 rows (T79 F6, the
  // owner: "jak mamy cut the corners lub recess to nie rysujesz mi dziurek na śrubki 3 mm, to trzeba będzie dodać";
  // "ale tylko na plecach."): the top and bottom rows on 218..328, the RETURN's column at x 9 (carcass 209, the
  // notched BACK's own, KIT_NOTCH.lsp D10 AMENDED) and RETURN-L's at x 119 (carcass 319, the window's, D17 AMENDED).
  assert.deepEqual(bk.cnc.pockets.map((k) => [k.x1, k.y1, k.x2, k.y2]), [[47.5, 761, 98.5, 776], [47.5, -6, 98.5, 9]]);
  assert.deepEqual(bk.cnc.holes.filter((h) => h.kind === 'screw').map((h) => [h.x, h.y]), [
    [68, 761], [73, 761], [78, 761], [68, 9], [73, 9], [78, 9],
    [9, 50], [9, 240], [9, 530], [9, 720],
    [119, 50], [119, 385], [119, 720],
  ]);
  // The RETURN's column is the notched BACK's own, hole for hole (both BACKs stand at carcass x 200).
  const col = (r) => panelOf(r, 'BACK').cnc.holes.filter((h) => h.kind === 'screw' && h.x + panelOf(r, 'BACK').box.x === 209).map((h) => h.y);
  assert.deepEqual(col(both), col(notchAlone));
  assert.deepEqual(col(both), [50, 240, 530, 720]);
  assert.deepEqual(both.drills.filter((d) => d.panel === 'BACK' && d.x === 9).map((d) => d.y), [50, 240, 530, 720], 'drilled');
  // Moved once: the notch's re-origin of the whole BACK was taken over (the drills stand in the piece's frame).
  assert.ok(both.drills.filter((d) => d.panel === 'BACK').every((d) => d.x >= 0 && d.x <= 128), 'every BACK hole on the board');
  assert.equal(both.panels.filter((p) => p.part === 'BACK').length, 1);
});

test('F8 · CASE D: the box boards, each by its own routine; every id once', () => {
  const box = (id) => { const p = panelOf(both, id); return [p.part, p.w, p.h, p.box.x, p.box.z, p.box.d]; };
  assert.deepEqual(box('RETURN'), ['NOTCH-RETURN', 182, 770, 200, 18, 182]);
  assert.deepEqual(box('STEP'), ['NOTCH-STEP', 218, 770, 0, 200, 18]);
  assert.deepEqual(box('RETURN-L'), ['RECESS-RETURN', 132, 770, 310, -132, 132]);
  assert.deepEqual(box('EXT-BACK'), ['RECESS-BACK', 290, 770, 310, -150, 18]);
  const ids = both.panels.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
});

// The LISP's CASE D block, read as text: every number it states is the number the engine cuts.
test('F8 · the LISP\'s own CASE D block, line by line, is the engine\'s cut', () => {
  const lisp = read('reference/lisp/KIT_RECESS.lsp');
  const from = lisp.indexOf(';;; CASE D (fixtures/golden-notch-and-recess.json');
  const to = lisp.indexOf(';;; G. DRAWING', from);
  assert.ok(from > 0 && to > from, 'CASE D stands before section G');
  const lines = lisp.slice(from, to).split('\n').map((l) => l.replace(/^;;;\s?/, ''));
  const prose = lines.join(' ').replace(/\s+/g, ' ');
  const say = (s) => assert.ok(prose.includes(s), `CASE D states ${s}`);
  const pts = (list) => list.map(([x, y]) => `(${r2(x)} ${r2(y)})`).join(' ');
  const arrow = (list) => list.map(([x, y]) => `(${r2(x)} ${r2(y)})`).join(' -> ');
  const csv = (list) => list.map(r2).join(', ');
  say(SENTENCE);
  const fp = X.recessNotchFootprint(600, 770, 200, 0, 'BL');
  say(`FOOTPRINTS ON THE BACK: the notch x ${fp[0]}..${fp[2]}, z ${fp[1]}..${fp[3]}; the band x 310..600, z 0..770`);
  for (const id of ['BUL', 'BUR']) say(`${id} ${size(both, id)},`);
  const top = panelOf(both, 'TOP');
  say(`plan frame: ${pts(top.meta.extension.outline)}`);
  const planMarks = N.cornerMarkRecords(top.meta.extension.outline, 40, P.puzzle).map((m) => arrow(m.pts));
  say(`plan: ${planMarks[0]} ${planMarks[1]}`);
  const bottomCorners = panelOf(both, 'BOTTOM').cnc.marks.map((m) => `(${m.pts[1][0]} ${m.pts[1][1]})`);
  say(`corners ${bottomCorners.join(', ')}`);
  say(`TOP drawn from its UNDERSIDE: corners ${top.cnc.marks.map((m) => `(${m.pts[1][0]} ${m.pts[1][1]})`).join(', ')}`);
  say(`(${r2(top.area_m2 * 1e6)} mm2)`);
  const bk = panelOf(both, 'BACK');
  say(`BACK ${size(both, 'BACK')}, carcass x ${bk.box.x}..${bk.box.x + bk.w}`);
  say(`${pts(bk.cnc.outline)}; area ${r2(bk.area_m2 * 1e6)} mm2`);
  const sh = panelOf(both, 'SHELF-1');
  say(`SHELF-1 ${size(both, 'SHELF-1')}, both cut`);
  say(pts(sh.meta.extension.outline));
  say(`corners ${N.cornerMarkRecords(sh.meta.extension.outline, 40, P.puzzle).map((m) => `(${m.pts[1][0]} ${m.pts[1][1]})`).join(', ')}; area ${r2(sh.area_m2 * 1e6)} mm2`);
  for (const [id, x0, x1, y0, y1] of [['STEP', 0, 218, 340, 358], ['RETURN', 200, 218, 358, 540], ['RETURN-L', 310, 328, 558, 690], ['EXT-BACK', 310, 600, 690, 708]]) {
    const p = panelOf(both, id);
    assert.equal(p.box.x, x0);
    assert.equal(p.box.x + p.box.w, x1);
    assert.equal(558 - (p.box.z + p.box.d), y0, `${id} y0`);
    assert.equal(558 - p.box.z, y1, `${id} y1`);
    say(`${id} ${size(both, id)}, carcass x ${x0}..${x1}, y ${y0}..${y1}`);
  }
  // WHICH JOINTS MOVE: the rows, by their labels (columns two or more spaces apart).
  const row = (label) => {
    const cols = lines.map((l) => l.trim().split(/\s{2,}/)).find((c) => c[0] === label);
    assert.ok(cols, `CASE D has the row ${label}`);
    return cols;
  };
  const tjE = X.recessTopJoints(600, 558, 18, 310, 600, 150, K);
  const tjB = X.recessNotchedTopJoints(600, 558, 18, 310, 600, 150, 200, 200, 'BL', K);
  assert.deepEqual(row('TOP/BOTTOM tabs into BUL (y)').slice(1), [csv(tjE.LEFT), csv(tjB.LEFT)]);
  assert.deepEqual(row('TOP/BOTTOM tabs into BUR (y)').slice(1), [csv(tjE.RIGHT), csv(tjB.RIGHT)]);
  assert.deepEqual(row('TOP/BOTTOM tabs into BACK (x)').slice(1), [csv(tjE.BACK), csv(tjB.BACK)]);
  assert.deepEqual(row('BACK top/bottom sockets (x)').slice(1), [csv(N.notchShift(tjE.BACK, 18)), csv(N.notchShift(tjB.BACK, 18))]);
  const scr = (r, y) => {
    const p = panelOf(r, 'BACK');
    return p.cnc.holes.filter((h) => h.kind === 'screw' && h.y === y).map((h) => h.x + p.box.x).sort((a, b) => a - b);
  };
  assert.deepEqual(row('BACK top/bottom rows (x)').slice(1), [csv(scr(extAlone, 761)), csv(scr(both, 761))]);
  assert.deepEqual(row('BACK left screw row (z)').slice(1, 2), [csv(panelOf(extAlone, 'BACK').cnc.holes.filter((h) => h.kind === 'screw' && h.x === 9).map((h) => h.y))]);
  // T79 F6 x F8: the left edge meets the notch's RETURN and carries its column, the notched BACK's own (no socket).
  const leftBoth = panelOf(both, 'BACK').cnc.holes.filter((h) => h.kind === 'screw' && h.x === 9).map((h) => h.y);
  assert.equal(row('BACK left screw row (z)')[2], `${csv(leftBoth)} at carcass x 209, into the notch's RETURN`);
  assert.equal(row('BACK sockets, left edge (z)')[2], 'NONE');
  assert.ok(prose.includes(OWNER_F6_LISP), 'CASE D quotes the F6 law');
  // THE BACK'S DIA 3 HOLES, BOTH CUT, read off the engine's cut (carcass x).
  const holesOf = (r) => { const p = panelOf(r, 'BACK'); return p.cnc.holes.filter((h) => h.kind === 'screw').map((h) => [h.x + p.box.x, h.y]); };
  const hb = holesOf(both);
  const xs = (z) => hb.filter((h) => h[1] === z).map((h) => h[0]).join(' ');
  const zs = (x) => hb.filter((h) => h[0] === x).map((h) => h[1]).join(' ');
  say(`top row x ${xs(761)}, z 761`);
  say(`bottom row x ${xs(9)}, z 9`);
  say(`into the notch's RETURN x 209, z ${zs(209)} (notch-back-box-rows)`);
  say(`into RETURN-L's end x 319, z ${zs(319)} (the window's column)`);
  say(`so the BACK carries ${hb.length} dia 3 holes`);
  assert.equal(hb.length, 13);
  // THE NOTCH'S BOX ROWS ON THE PIECE THAT HOLDS THEM: part height from the floor, from the top, and a BR corner.
  const piece = (notch, band = BAND) => holesOf(computeCabinet({ ...BUD, notch, extension: band }, P));
  const p300 = piece({ ...NOTCH, h: 300 });
  const at = (list, x) => list.filter((h) => h[0] === x).map((h) => h[1]).join(' ');
  const along = (list, z) => list.filter((h) => h[1] === z).map((h) => h[0]).join(' ');
  say(`BL 200/200/300 the piece x 0..328 holds the corner: into the RETURN x 209: ${at(p300, 209)}; into the LID, z 309: ${along(p300, 309)}; ${p300.length} dia 3 holes on the piece`);
  const pTop = piece({ ...NOTCH, h: -300 });
  say(`BL 200/200/-300 the same piece: into the RETURN x 209: ${at(pTop, 209)}; into the FLOOR, z 461: ${along(pTop, 461)}; ${pTop.length} dia 3 holes`);
  const pBr = piece({ ...NOTCH, corner: 'BR' }, { ...BAND, x0: 0, x1: 290 });
  say(`BR 200/200/0 with the band x 0..290 (BUL grows): the piece x 272..400, into the RETURN x 391 (its own x 119): ${at(pBr, 391)}; ${pBr.length} dia 3 holes`);
});

test('F8 x F6 · the piece that holds the notch\'s box carries its rows exactly as the notched BACK alone (full, from the floor, from the top, BR)', () => {
  const cases = [
    [{ corner: 'BL', w: 200, d: 200, h: 0 }, BAND, 13],
    [{ corner: 'BL', w: 200, d: 200, h: 300 }, BAND, 18],
    [{ corner: 'BL', w: 200, d: 200, h: -300 }, BAND, 18],
    [{ corner: 'BR', w: 200, d: 200, h: 0 }, { ...BAND, x0: 0, x1: 290 }, 13],
    [{ corner: 'BR', w: 200, d: 200, h: 300 }, { ...BAND, x0: 0, x1: 290 }, 18],
  ];
  const carcassHoles = (r) => r.panels.filter((p) => p.part === 'BACK').flatMap((p) => p.cnc.holes
    .filter((h) => h.kind === 'screw').map((h) => `${r2(h.x + p.box.x)},${r2(h.y + p.box.y)}`));
  for (const [notch, band, count] of cases) {
    const name = `${notch.corner} ${notch.w}/${notch.d}/${notch.h}`;
    const alone = computeCabinet({ ...BUD, notch }, P);
    const two = computeCabinet({ ...BUD, notch, extension: band }, P);
    assert.deepEqual(two.warnings, [], `${name}: both cut`);
    const rows = N.notchBackBoxRows(600, 770, 18, notch.w, notch.h, notch.corner, K).SCREWS.map(([x, z]) => `${r2(x)},${r2(z)}`);
    assert.ok(rows.length >= 4, `${name}: the box has rows`);
    const a = carcassHoles(alone);
    const b = carcassHoles(two);
    for (const h of rows) {
      assert.ok(a.includes(h), `${name}: the notched BACK alone carries ${h}`);
      assert.equal(b.filter((x) => x === h).length, 1, `${name}: the extension's BACK carries ${h}, once`);
    }
    assert.equal(b.length, count, `${name}: ${count} dia 3 holes on the BACK`);
    assert.equal(new Set(b).size, b.length, `${name}: no two holes in one place`);
    const drilled = two.drills.filter((d) => two.panels.some((p) => p.part === 'BACK' && p.id === d.panel) && d.kind === 'screw').length;
    assert.equal(drilled, count, `${name}: every one drilled`);
  }
});

// ═══ THE F8 REVIEW: A HOLE ONCE, A ROW ON ITS RUN ══════════════════════════
//
// THE PROBE (HEAD 4a23c34, the seam, verify/t79/f08-probe.md section 6): the combined BACK drilled a hole twice where
// the footprints touch (the band's RETURN behind the notch's own, both columns at one x), and on the side edge the
// notch cuts drawBACK's side row ran on what the notch left of it only, never the window, with no guard on a short
// run: holes stood in the window, in the notch and under the board. D13 says it: "every edge cut by both takes its
// joints run by run on what the two leave of it". The PROBE column below is that engine's output, verbatim.

const BACK_HOLES = (r, id) => panelOf(r, id).cnc.holes.filter((h) => h.kind === 'screw').map((h) => [h.x, h.y]);
/** Inside the piece's outline (even-odd), the outline drawn in the piece's frame. */
const onBoard = ([x, y], poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const airOf = (r) => r.panels.filter((p) => p.part === 'BACK').flatMap((p) => p.cnc.holes
  .filter((h) => h.kind === 'screw' && !onBoard([h.x, h.y], p.cnc.outline)).map((h) => `${r2(h.x + p.box.x)},${r2(h.y + p.box.y)}`));

test('F8 review · the PROBE table turned round: a hole once where the footprints touch, a side row on what the notch AND the window leave', () => {
  // [case, notch, band, piece, PROBE (HEAD 4a23c34, verbatim), now]
  const rows = [
    ['the footprints touch', { corner: 'BL', w: 200, d: 200, h: 0 }, { ...BAND, x0: 200 }, 'BACK',
      [[9, 50], [9, 240], [9, 530], [9, 720], [9, 50], [9, 385], [9, 720]],
      [[9, 50], [9, 240], [9, 530], [9, 720], [9, 385]]],
    ['the band and the notch on one side', { corner: 'BL', w: 200, d: 200, h: 300 }, { x0: 0, x1: 400, z0: 300, z1: 500, d: 150 }, 'BACK',
      [[9, 350], [9, 720]],
      [[9, 532], [9, 720]]],
    ['a short run under a notch from the top', { corner: 'BR', w: 200, d: 200, h: -60 }, { x0: 0, x1: 600, z0: 100, z1: 700, d: 150 }, 'BACK-2',
      [[591, 50], [591, -22]],
      []],
  ];
  for (const [name, notch, band, id, probe, now] of rows) {
    const r = computeCabinet({ ...BUD, notch, extension: band }, P);
    assert.deepEqual(r.warnings, [], `${name}: both cut`);
    const holes = BACK_HOLES(r, id);
    const p = panelOf(r, id);
    if (name === 'the footprints touch') {
      assert.equal(p.w, 18, 'the piece between the notch and the window is 18 wide');
      assert.deepEqual(holes, now, `${name}: every hole once, the RETURN's column first`);
      assert.equal(r.drills.filter((d) => d.panel === id && d.kind === 'screw').length, now.length, `${name}: drilled once each`);
    } else {
      const side = (list) => list.filter(([x]) => x === probe[0][0]);
      assert.deepEqual(side(holes), now, `${name}: the side row on the notched edge`);
    }
    for (const h of probe.filter((q) => !now.some((n) => n[0] === q[0] && n[1] === q[1]))) {
      assert.ok(!onBoard(h, p.cnc.outline) || holes.filter((q) => q[0] === h[0] && q[1] === h[1]).length <= 1,
        `${name}: the PROBE's (${h}) was off the board or twice`);
    }
    assert.ok(holes.every((h) => onBoard(h, p.cnc.outline)), `${name}: every hole on the board`);
    assert.equal(new Set(holes.map(String)).size, holes.length, `${name}: no two holes in one place`);
  }
  // The pure routines: off the notch's edge recessSideRow is the one run it always was; a hole joins once.
  assert.deepEqual(X.recessSideRow(770, 0, [95, 385, 675], null, [328, 0, 600, 770], false, false, 50),
    N.notchRowsBetweenTabs(0, 770, [95, 385, 675], 50));
  assert.deepEqual(X.recessSideRow(88, 682, [], [400, 710, 600, 770], [0, 118, 600, 682], false, false, 50), [50, 38],
    'the edge the notch does not cut keeps its row, as the extension alone draws it');
  assert.deepEqual(X.recessSideRow(88, 682, [], [400, 710, 600, 770], [0, 118, 600, 682], true, true, 50), [],
    'the 28 the notch leaves holds no hole');
  assert.deepEqual(X.recessSideRow(770, 0, [626], [0, 0, 200, 300], [0, 318, 382, 482], true, true, 50), [532, 720]);
  assert.deepEqual(X.recessWindowZcut([0, 318, 382, 482], 0, true), [[318, 482]]);
  assert.deepEqual(X.recessWindowZcut([0, 318, 382, 482], 0, false), []);
  assert.deepEqual(X.recessPutHole([[9, 50]], [9, 50]), [[9, 50]]);
  assert.deepEqual(X.recessPutHole([[9, 50]], [9, 385]), [[9, 50], [9, 385]]);
});

test('F8 review · the sweep: a notch adds no hole off its piece and none twice; every box row once', () => {
  const bands = [];
  for (const [x0, x1] of [[310, 600], [0, 290], [200, 600], [0, 400], [300, 500], [0, 600]]) {
    for (const [z0, z1] of [[0, 770], [400, 770], [0, 400], [300, 500], [100, 700]]) bands.push({ x0, x1, z0, z1, d: 150 });
  }
  let cut = 0;
  for (const band of bands) {
    // The extension alone, its own rows (a band that reaches a side short of the floor or the top drills the side's
    // column through the window: KIT_RECESS.lsp since 15.10.2026, not T79's, named in the PR); the notch adds none.
    const alone = new Set(airOf(computeCabinet({ ...BUD, extension: band }, P)));
    for (const corner of ['BL', 'BR']) {
      for (const h of [0, 300, -300, -60]) {
        const notch = { corner, w: 200, d: 200, h };
        const r = computeCabinet({ ...BUD, notch, extension: band }, P);
        if (r.warnings.length) continue;
        cut += 1;
        const name = `${corner} 200/200/${h}, band ${band.x0}..${band.x1} z ${band.z0}..${band.z1}`;
        assert.deepEqual(airOf(r).filter((k) => !alone.has(k)), [], `${name}: no hole off its piece`);
        for (const p of r.panels.filter((q) => q.part === 'BACK')) {
          const keys = p.cnc.holes.filter((q) => q.kind === 'screw').map((q) => `${r2(q.x)},${r2(q.y)}`);
          assert.equal(new Set(keys).size, keys.length, `${name}: ${p.id}, no two holes in one place`);
        }
        const all = r.panels.filter((p) => p.part === 'BACK').flatMap((p) => p.cnc.holes
          .filter((q) => q.kind === 'screw').map((q) => `${r2(q.x + p.box.x)},${r2(q.y + p.box.y)}`));
        for (const [x, z] of N.notchBackBoxRows(600, 770, 18, 200, h, corner, K).SCREWS) {
          assert.equal(all.filter((k) => k === `${r2(x)},${r2(z)}`).length, 1, `${name}: the box row (${x}, ${z}) once`);
        }
      }
    }
  }
  assert.ok(cut >= 60, `the sweep cut both on ${cut} units`);
});

test('F8 review · the LISP\'s REVIEW CASES are the engine\'s cut', () => {
  const lisp = read('reference/lisp/KIT_RECESS.lsp');
  const from = lisp.indexOf(';;; THE REVIEW CASES (the T79 F8 review, 18.10.2026');
  const to = lisp.indexOf(';;; G. DRAWING', from);
  assert.ok(from > 0 && to > from, 'the REVIEW CASES stand in CASE D, before section G');
  const prose = lisp.slice(from, to).split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
  const say = (s) => assert.ok(prose.includes(s), `the REVIEW CASES state ${s}`);
  const at = (r, id, x) => BACK_HOLES(r, id).filter((h) => h[0] === x).map((h) => r2(h[1] + panelOf(r, id).box.y)).join(' ');
  const touch = computeCabinet({ ...BUD, notch: NOTCH, extension: { ...BAND, x0: 200 } }, P);
  say(`the piece x ${panelOf(touch, 'BACK').box.x}..${panelOf(touch, 'BACK').box.x + panelOf(touch, 'BACK').w} (18 wide)`);
  say(`share x 209: z ${at(touch, 'BACK', 9).split(' ').slice(0, 4).join(' ')} (the RETURN's), then ${at(touch, 'BACK', 9).split(' ')[4]}`);
  say(`${BACK_HOLES(touch, 'BACK').length} holes, each once`);
  say('PROBE: 7 holes, z 50 and 720 drilled twice');
  const side = computeCabinet({ ...BUD, notch: { ...NOTCH, h: 300 }, extension: { x0: 0, x1: 400, z0: 300, z1: 500, d: 150 } }, P);
  say(`the side row x 9: z ${at(side, 'BACK', 9)}`);
  say('PROBE: x 9: z 350 720, the 350 in the window');
  const short = computeCabinet({ ...BUD, notch: { corner: 'BR', w: 200, d: 200, h: -60 }, extension: { x0: 0, x1: 600, z0: 100, z1: 700, d: 150 } }, P);
  assert.equal(at(short, 'BACK-2', 591), '', 'no side row on the 28');
  say(`the box rows x 391: z ${at(short, 'BACK-2', 391)}`);
  say(`the FLOOR's z 701: x ${BACK_HOLES(short, 'BACK-2').filter((h) => h[1] + 682 === 701).map((h) => h[0]).join(' ')}`);
  say('PROBE: x 591: z 732 (in the notch) and 660 (under the board)');
});

// ═══ THE OVERLAP: REFUSED IN WORDS, AND THE CHECK SHOWS IT ════════════════

test('F8 · an overlap: the notch stands, the band is refused in the sentence, the parent with its notch is what is cut', () => {
  const over = computeCabinet({ ...BUD, notch: NOTCH, extension: { ...BAND, x0: 100 } }, P);
  assert.deepEqual(over.warnings, [{ code: 'EXTENSION_REFUSED', message: SENTENCE }]);
  assert.deepEqual(over.derived.extension, { x0: 100, x1: 600, z0: 0, z1: 770, d: 150, for: 'a recess in this wall', refused: SENTENCE });
  assert.deepEqual(over.derived.notch, notchAlone.derived.notch, 'the notch stands');
  assert.deepEqual(over.panels, notchAlone.panels, 'the parent, its notch cut, board for board');
  // From the top: a notch -300 meets a band reaching the top over its width.
  const top = computeCabinet({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: -300 }, extension: { x0: 0, x1: 300, z0: 400, z1: 770, d: 150 } }, P);
  assert.equal(extRefusal(top)?.message, SENTENCE);
});

// Found by the F8 review: the notch was judged against the parent cut WITH its band, so on a grown BUR (its frame
// ed further from the new back edge) the hinge the notch takes was read past it, the notch was cut and two hinge
// holes went with it (BUD, hinge R, FR 200 / 200 / 300, the band 300..600 from 400 up: 4 of 6). The notch first:
// asked of the kit's own carcass, refused as alone (KIT_NOTCH.lsp D7), and the band is cut alone.
test('F8 · the notch is asked of the kit\'s own carcass first: a hinge it takes on BUR is refused with a band as well', () => {
  const hinged = { ...BUD, hinge: 'R' };
  const notch = { corner: 'FR', w: 200, d: 200, h: 300 };
  const band = { x0: 300, x1: 600, z0: 400, z1: 770, d: 150 };
  const alone = computeCabinet({ ...hinged, notch }, P);
  const bandAlone = computeCabinet({ ...hinged, extension: band }, P);
  const asked = computeCabinet({ ...hinged, notch, extension: band }, P);
  const refusal = alone.warnings.find((w) => w.code === N.NOTCH_REFUSED);
  assert.match(refusal.message, /the hinge drilling of BUR falls in the notch/);
  assert.deepEqual(asked.warnings, alone.warnings, 'refused in the same words');
  assert.ok(asked.derived.extension && !asked.derived.extension.refused, 'the band is cut alone');
  assert.deepEqual(asked.panels, bandAlone.panels, 'the parent with its band, board for board');
  assert.equal(asked.drills.filter((d) => d.panel === 'BUR' && d.kind === 'hinge').length, 6, 'every hinge hole stays');
});

test('F8 · Check #36 Recess extension refused: red, in the engine\'s words; the PRO panel reads its label off CHECKS', () => {
  const row = CHECKS.find((c) => c.n === 36);
  assert.deepEqual(row, { n: 36, level: 'red', label: 'Recess extension refused' });
  assert.equal(CHECKS.find((c) => c.n === 32).label, 'Front thinner than its decoration\'s board', '#32 stays T76 F4\'s');
  // The PRO Check panel is data-driven: the number, the label from CHECKS, the finding's own message.
  const panel = read('src/components/CheckPanel.jsx');
  assert.match(panel, /CHECKS\.find\(\(c\) => c\.n === f\.check\)\?\.label/);
  // Through the store, as a person builds it (the probe's section 4): an overlapping notch makes the row appear.
  const id = kitchenWithRecess();
  assert.ok(S().unitResult(id).derived.extension && !S().unitResult(id).derived.extension.refused);
  const res = S().setUnitNotch(id, { corner: 'BL', w: 200, d: 200, h: 0 });
  assert.equal(res.ok, true, 'the notch is kept: it stands, the band gives way');
  const findings = S().runChecks().filter((f) => f.check === 36);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, 'red');
  assert.equal(findings[0].message, `${unitOf(id).params.unit_num}: ${SENTENCE}`);
  assert.equal(findings[0].unitId, id);
});

// ═══ A SIDE BOTH CUT, THE BOX NAMES, EVERY CORNER ══════════════════════════

const STEPPED = [
  ['BL 300 under a band from 400 (BUL both)', { corner: 'BL', w: 200, d: 200, h: 300 }, { x0: 0, x1: 300, z0: 400, z1: 770, d: 150 }, 'BUL'],
  ['BR 300 under a band from 400 (BUR both)', { corner: 'BR', w: 200, d: 200, h: 300 }, { x0: 300, x1: 600, z0: 400, z1: 770, d: 150 }, 'BUR'],
  ['BL -300 over a band to 400 (BUL both)', { corner: 'BL', w: 200, d: 200, h: -300 }, { x0: 0, x1: 300, z0: 0, z1: 400, d: 150 }, 'BUL'],
  ['BR 300 under a mid band (BUR both, three corners)', { corner: 'BR', w: 200, d: 200, h: 300 }, { x0: 300, x1: 600, z0: 400, z1: 600, d: 150 }, 'BUR'],
];

test('F8 · a side both cut: the stepped outline, and the 3-D takes the same board out of its rectangle', () => {
  for (const [said, notch, ext, sideId] of STEPPED) {
    const r = computeCabinet({ ...BUD, hinge: sideId === 'BUL' ? 'R' : 'L', notch, extension: ext }, P);
    assert.deepEqual(r.warnings, [], `${said}: ${JSON.stringify(r.warnings)}`);
    const side = panelOf(r, sideId);
    assert.equal(side.w, 690, `${said}: grown`);
    assert.ok(r.derived.extension.grown.includes(sideId));
    // The nominal outline in BUL's frame (x from the front); BUR's frame runs from the new back edge.
    const nominal = X.recessNotchedSideOutline(558, 770, 18, ext.z0, ext.z1, 150, notch.w, notch.d, notch.h, notch.corner);
    const finalFrame = sideId === 'BUL' ? nominal : nominal.map(([x, y]) => [690 - x, y]);
    const rect = [[0, 0], [690, 0], [690, 770], [0, 770]];
    const solid = N.cutNotchCorner(rect, 690, 770, side.cnc.notch);
    assert.ok(sameWalk(solid, finalFrame), `${said}: the 3-D's board ${JSON.stringify(solid)} against ${JSON.stringify(finalFrame)}`);
    assert.equal(r2(side.area_m2 * 1e6), r2(N.polygonArea(nominal)), `${said}: area`);
    assert.ok(panelSolids(side, P.puzzle.layers, P, r.drills).solid, `${said}: rendered`);
    assert.deepEqual(resultFindings(r), [], `${said}: outline faults`);
    assert.deepEqual(unitFindings(r, { profile: P }), [], `${said}: export gate`);
  }
});

test('F8 · on a notched carcass the extension\'s FLOOR and LID are EXT-FLOOR and EXT-LID; the notch keeps its own', () => {
  const mid = computeCabinet({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 300 }, extension: { x0: 100, x1: 400, z0: 400, z1: 600, d: 150 } }, P);
  assert.deepEqual(mid.warnings, []);
  assert.deepEqual(mid.derived.notch.boards, ['RETURN', 'STEP', 'LID']);
  assert.deepEqual(mid.derived.extension.boards, ['RETURN-L', 'RETURN-R', 'EXT-FLOOR', 'EXT-LID', 'EXT-BACK']);
  assert.equal(panelOf(mid, 'LID').part, 'NOTCH-LID');
  assert.equal(panelOf(mid, 'EXT-LID').part, 'RECESS-LID');
  assert.equal(panelOf(mid, 'EXT-FLOOR').part, 'RECESS-FLOOR');
  const fromTop = computeCabinet({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: -300 }, extension: { x0: 0, x1: 300, z0: 0, z1: 400, d: 150 } }, P);
  assert.equal(panelOf(fromTop, 'FLOOR').part, 'NOTCH-FLOOR');
  assert.equal(panelOf(fromTop, 'EXT-LID').part, 'RECESS-LID');
  for (const r of [mid, fromTop]) {
    const ids = r.panels.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, 'every id once');
  }
  // The BACK with a window and the notch's corner: the window a pocket, the corner on the outline.
  const bk = panelOf(mid, 'BACK');
  assert.deepEqual(bk.cnc.notch, { fc: 'x0y0', nw: 200, nh: 300 });
  assert.deepEqual(bk.cnc.pockets.filter((k) => k.layer === X.RECESS_WINDOW_LAYER).map((k) => [k.x1, k.y1, k.x2, k.y2]), [[118, 418, 382, 582]]);
  // Its left rows keep off the notch's box: from its top (300) up, never into the RETURN.
  assert.deepEqual(bk.cnc.holes.filter((h) => h.kind === 'screw' && h.x === 9).map((h) => h.y), [350, 535, 720]);
  // The extension alone without the notch keeps its LID and FLOOR names.
  const plain = computeCabinet({ ...BUD, extension: { x0: 100, x1: 400, z0: 400, z1: 600, d: 150 } }, P);
  assert.deepEqual(plain.derived.extension.boards, ['RETURN-L', 'RETURN-R', 'FLOOR', 'LID', 'EXT-BACK']);
});

test('F8 · every corner and two parents apart from a band: no refusal, no outline fault, no export-gate fault', () => {
  const cases = [
    ['BUD', { corner: 'BL', w: 200, d: 200, h: 0 }, BAND, {}],
    ['BUD', { corner: 'BR', w: 200, d: 200, h: 0 }, { x0: 0, x1: 290, z0: 0, z1: 770, d: 150 }, {}],
    ['BUD', { corner: 'FL', w: 200, d: 200, h: 0 }, BAND, { hinge: 'R' }],
    ['BUD', { corner: 'BL', w: 200, d: 200, h: 0 }, { x0: 300, x1: 500, z0: 0, z1: 770, d: 150 }, {}],
    ['BUD', { corner: 'BL', w: 10, d: 20, h: 50 }, BAND, {}],
    ['WARDROBE', { corner: 'BL', w: 200, d: 250, h: 0 }, { x0: 300, x1: 600, z0: 0, z1: 2150, d: 200 }, {}],
  ];
  for (const [type, notch, extension, extra] of cases) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', shelves: 1, ...extra, notch, extension }, P);
    const said = `${type} ${JSON.stringify(notch)} ${JSON.stringify(extension)}`;
    assert.deepEqual(r.warnings.filter((w) => /REFUSED/.test(w.code)), [], `${said}: ${JSON.stringify(r.warnings)}`);
    assert.ok(r.derived.notch && r.derived.extension, `${said}: both cut`);
    assert.deepEqual(resultFindings(r), [], `${said}: outline faults`);
    assert.deepEqual(unitFindings(r, { profile: P }), [], `${said}: export gate`);
    const ids = r.panels.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${said}: every id once`);
  }
  // Two BACK pieces either side of a band, past a full-height notch: each from the parent's box.
  const two = computeCabinet({ ...BUD, notch: NOTCH, extension: { x0: 300, x1: 500, z0: 0, z1: 770, d: 150 } }, P);
  assert.deepEqual(two.panels.filter((p) => p.part === 'BACK').map((p) => [p.id, p.w, p.box.x]), [['BACK', 118, 200], ['BACK-2', 118, 482]]);
  // An unboxed notch (a rebate) is a corner of the BACK, its rows in the rebate dropped (KIT_NOTCH.lsp D7).
  const reb = computeCabinet({ ...BUD, notch: { corner: 'BL', w: 10, d: 20, h: 50 }, extension: BAND }, P);
  assert.deepEqual(panelOf(reb, 'BACK').cnc.notch, { fc: 'x0y0', nw: 10, nh: 50 });
  assert.ok(panelOf(reb, 'BACK').cnc.holes.every((h) => !(h.x < 10 && h.y < 50)), 'nothing drilled into the rebate');
});

// ═══ THE DRAWING, THE EXPORT, THE 3-D ══════════════════════════════════════

test('F8 · the CNC export: the TOP, the BOTTOM and SHELF-1 carry two CORNER_4MM marks each, the BACK none; every board has a file', () => {
  const files = buildUnitDxfFiles(both, P);
  const marksOf = (id) => files.find((f) => f.panelId === id).entities.filter((e) => e.layer === 'CORNER_4MM');
  for (const id of ['TOP', 'BOTTOM', 'SHELF-1']) {
    const m = marksOf(id);
    assert.equal(m.length, 2, id);
    assert.ok(m.every((e) => e.type === 'poly' && e.closed === false && e.pts.length === 3), `${id}: open L of three points`);
  }
  assert.equal(marksOf('BACK').length, 0);
  for (const p of both.panels) assert.ok(files.some((f) => f.panelId === p.id), `${p.id} has no DXF`);
  const rows = cutRows(both).carcass.map((r) => r.id);
  for (const id of ['RETURN', 'STEP', 'RETURN-L', 'EXT-BACK', 'BACK', 'TOP', 'BOTTOM']) assert.ok(rows.includes(id), `${id} on the cut list`);
});

// Found by the F8 review: extensionDrills re-origined a grown BUR (its frame from the NEW back edge, KIT_RECESS.lsp)
// by moving the outline, the pockets and the holes ed, never the marks, so the bump's CORNER_4MM mark stood at
// (0, 482) and, both cut, the notch's at (200, 300): ed off their corners in the DXF. The marks move with the board.
test('F8 · a grown BUR\'s CORNER_4MM marks stand on its corners, alone and both cut, in the DXF too', () => {
  const cornersOf = (r) => panelOf(r, 'BUR').cnc.marks.filter((m) => m.layer === 'CORNER_4MM').map((m) => m.pts);
  const alone = computeCabinet({ ...BUD, extension: { x0: 310, x1: 600, z0: 0, z1: 500, d: 150 } }, P);
  assert.equal(panelOf(alone, 'BUR').w, 690);
  assert.deepEqual(cornersOf(alone), [[[150, 522], [150, 482], [110, 482]]], 'the bump\'s inner corner, x ed from the new back edge');
  const dxf = buildUnitDxfFiles(alone, P).find((f) => f.panelId === 'BUR').entities.filter((e) => e.layer === 'CORNER_4MM');
  assert.deepEqual(dxf.map((e) => [e.closed, e.pts]), [[false, [[150, 522], [150, 482], [110, 482]]]]);
  const both2 = computeCabinet({ ...BUD, notch: { corner: 'BR', w: 200, d: 200, h: 300 }, extension: { x0: 300, x1: 600, z0: 400, z1: 770, d: 150 } }, P);
  assert.deepEqual(both2.warnings, []);
  assert.deepEqual(cornersOf(both2), [[[310, 300], [350, 300], [350, 260]], [[110, 418], [150, 418], [150, 378]]],
    'the notch\'s corner (ed + nd, its height) and the bump\'s (ed, bz0)');
  for (const r of [alone, both2]) {
    const xs = panelOf(r, 'BUR').cnc.outline.map((q) => q[0]);
    for (const m of cornersOf(r)) for (const [x] of m) assert.ok(x >= Math.min(...xs) && x <= Math.max(...xs), `a mark on the board: ${x}`);
  }
});

test('F8 · the 3-D: the grown boards extrude their planOutline, the BACK its rectangle; the cache key names the whole chain', () => {
  for (const id of ['TOP', 'BOTTOM', 'SHELF-1', 'BACK', 'BUL', 'BUR']) {
    assert.ok(panelSolids(panelOf(both, id), P.puzzle.layers, P, both.drills).solid, `${id} rendered`);
  }
  // A corner with no frame and at most one `also` keys as it always did; a grown side's corner names its frame.
  assert.equal(N.notchCornerKey({ fc: 'x1y0', nw: 150, nh: 218, also: { fc: 'x1y1', nw: 150, nh: 188 } }), 'x1y0:150:218+x1y1:150:188');
  assert.equal(N.notchCornerKey({ fc: 'x0y0', nw: 150, nh: 418, also: { fc: 'x0y1', nw: 150, nh: 188, also: { fc: 'x0y0', nw: 200, nh: 300, fw: 540, ox: 150 } } }),
    'x0y0:150:418+x0y1:150:188+x0y0:200:300@150/540');
  // cutNotchCorner with no frame is what it was; with one, the corner stands in it.
  const rect = [[0, 0], [690, 0], [690, 770], [0, 770]];
  assert.deepEqual(N.cutNotchCorner(rect, 690, 770, { fc: 'x1y0', nw: 150, nh: 418 }), [[0, 0], [540, 0], [540, 418], [690, 418], [690, 770], [0, 770]]);
  assert.deepEqual(N.cutNotchCorner([[0, 0], [540, 0], [540, 418], [690, 418], [690, 770], [0, 770]], 690, 770, { fc: 'x1y0', nw: 200, nh: 300, fw: 540 }),
    [[0, 0], [340, 0], [340, 300], [540, 300], [540, 418], [690, 418], [690, 770], [0, 770]]);
  const solid = read('src/3d/panelSolid.js');
  assert.match(solid, /import \{ cutNotchCorner \} from '\.\.\/engine\/notch\.js';/);
  assert.match(solid, /notch \? `notch:\$\{notchCornerKey\(notch\)\}` : ''/);
});

// ═══ THE STORE, SAVE AND RELOAD ════════════════════════════════════════════

const S = () => useProjectStore.getState();
const unitOf = (id) => S().units.find((u) => u.id === id);

/** The probe's section 4: a 4000 x 3000 room, a recess at x 1000 (1300 wide, 300 deep), a BUD half across its right reveal. */
function kitchenWithRecess() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 1300, depth: 300 });
  const a = S().addUnit('BUD', { wall: 0, x: 200 });
  assert.equal(a.error, null, a.error);
  S().moveUnit(a.id, 1800, 1);
  return a.id;
}

test('F8 · THE PROBE table 4, turned round: the notch at the far end from the band no longer takes the extension away', () => {
  const id = kitchenWithRecess();
  const before = S().unitResult(id).derived.extension;
  // T79 F10 (the owner, 18.10.2026: *"lub zmniejszać go odsuwaniem od recesu, logika."*): the extension is the recess
  // less the unit's stand-off (300 - 10 at the standard clearance).
  assert.deepEqual([before.x0, before.x1, before.z0, before.z1, before.d], [0, 490, 0, 770, 290]);
  const res = S().setUnitNotch(id, { corner: 'BR', w: 80, d: 200, h: 0 });
  assert.deepEqual(res, { ok: true, said: '', notch: { corner: 'BR', w: 80, d: 200, h: 0 } });
  const r = S().unitResult(id);
  assert.equal(extRefusal(r), null, 'no refusal');
  assert.deepEqual(r.derived.extension.boards, ['RETURN-R', 'EXT-BACK']);
  assert.deepEqual(r.derived.extension.grown, ['BUL', 'TOP', 'BOTTOM', 'BACK']);
  assert.ok(r.derived.notch && !r.derived.notch.refused);
  assert.equal(panelOf(r, 'BUL').w, 830, 'BUL grows into the recess (540 + 290, T79 F10)');
  assert.equal(panelOf(r, 'BUR').w, 340, 'BUR loses the notch');
  assert.deepEqual(S().runChecks().filter((f) => f.check === 36), [], 'nothing to say');
  // Save and reload: the same cut.
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  const lines = S().unitResult(id).csvLines;
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(unitOf(id).params.notch, { corner: 'BR', w: 80, d: 200, h: 0 });
  assert.deepEqual(S().unitResult(id).csvLines, lines);
  assert.ok(lines.some((l) => /,RETURN-R,/.test(l)) && lines.some((l) => /,RETURN,/.test(l)), 'both boxes on the cut list');
});

// ═══ THE GOLDENS AND THE GATE ══════════════════════════════════════════════

test('F8 · golden-notch-and-recess.json is the cut, byte for byte; the notch, recess and the six hold; the gate is the pair', () => {
  const file = JSON.parse(read('fixtures/golden-notch-and-recess.json'));
  assert.deepEqual(file.params.notch, NOTCH);
  assert.deepEqual(file.params.extension, BAND);
  assert.deepEqual(goldenOf(file.params, P), file.expected);
  for (const name of ['golden-notch.json', 'golden-notch-top.json', 'golden-recess.json', 'golden-recess-band.json']) {
    const old = JSON.parse(read(`fixtures/${name}`));
    assert.deepEqual(goldenOf(old.params, P), old.expected, `${name} is what it was`);
    assert.equal(GATES.notchRecess.opens(old.params), false, `${name} does not open the pair`);
  }
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(head[id].sha256, base[id].sha256, id);
  assert.equal(GATES.notchRecess.opens(file.params), true);
  assert.equal(GATES.notchRecess.opens(BUD), false);
  assert.equal(GATES.notchRecess.opens({ ...BUD, notch: NOTCH }), false);
  assert.equal(GATES.notchRecess.opens({ ...BUD, extension: BAND }), false);
});
