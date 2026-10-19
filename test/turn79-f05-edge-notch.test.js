/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F5 · THE HORIZONTAL NOTCH: ALL FOUR EDGES OF THE SIDE ──────────────
//
// The owner, 18.10.2026: *"cut the corner działa idealnie, ale możesz zrobić mi
// też poziome cut? wszystkich 4 rogów?"*
//
// LISP first: reference/lisp/KIT_NOTCH.lsp D22 THE EDGE NOTCH, its section H2
// and its NUMBERS block I3 (BUD 600, BB 20 / 120 and TB 50 / 100, board by
// board, and case C, the corner notch beside it); src/engine/notch.js mirrors
// it routine for routine (section H2) and cuts it (section Z2). These
// assertions are that block, read off the engine's real cut; the corner mark
// (one open L per inner corner); the run law proved to be the corner notch's
// own; coexistence and refusal; the store road, save and reload; the PRO and
// retail windows and the 3-D picker; the goldens and the gate.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as N from '../src/engine/notch.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { resultFindings } from '../src/engine/cnc/edgeGuard.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { MODAL_KINDS, modalNeedsAnchor } from '../src/lib/modalLayer.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { askNotchEdge, notchEdgeSpots } from '../src/3d/notchPick.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';
import { GATES, LISP, GOLDENS } from '../scripts/t78-classify.d/f34-t79-f05.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const K = N.notchProfile(P);
const r2 = (v) => Math.round(v * 10000) / 10000;

const OWNER = 'cut the corner działa idealnie, ale możesz zrobić mi też poziome cut? wszystkich 4 rogów?';
const HELP = 'A rebate along the whole edge: skirting at the bottom-back, coving at the top-back.';

// The LISP's cases (I3): KIT_BUD_FULL defaults, golden-bud.json's BUD-A with 1 shelf.
const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1 };
const BB = { edge: 'BB', d: 20, h: 120 };
const TB = { edge: 'TB', d: 50, h: 100 };
const CORNER = { corner: 'BL', w: 200, d: 200, h: 300 };
const parent = computeCabinet(BUD, P);
const bb = computeCabinet({ ...BUD, edgeNotch: BB }, P);
const tb = computeCabinet({ ...BUD, edgeNotch: TB }, P);
const both = computeCabinet({ ...BUD, notch: CORNER, edgeNotch: TB }, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const drillsOf = (r, id, kind) => r.drills.filter((d) => d.panel === id && (!kind || d.kind === kind));
const xs = (list) => [...new Set(list.map((d) => d.x))].sort((a, b) => a - b);
const ys = (list) => [...new Set(list.map((d) => d.y))].sort((a, b) => a - b);
/** A socket's centre is the middle of its two holes, along x at a given y. */
const socketXs = (list, y) => {
  const at = xs(list.filter((d) => d.y === y));
  const out = [];
  for (let i = 0; i + 1 < at.length; i += 2) out.push(r2((at[i] + at[i + 1]) / 2));
  return out;
};
/** ...and along y at a given x. */
const socketYs = (list, x) => {
  const at = ys(list.filter((d) => d.x === x));
  const out = [];
  for (let i = 0; i + 1 < at.length; i += 2) out.push(r2((at[i] + at[i + 1]) / 2));
  return out;
};
const refusalOf = (r) => r.warnings.find((w) => w.code === N.NOTCH_REFUSED) || null;
const tabsUp = (p) => p.cnc.pockets.filter((pk) => pk.layer === P.puzzle.layers.dogbone).map((pk) => r2((pk.y1 + pk.y2) / 2)).sort((a, b) => a - b);
const scrAt = (r, id, y) => xs(drillsOf(r, id, 'screw').filter((d) => d.y === y));
const colAt = (r, id, x) => ys(drillsOf(r, id, 'screw').filter((d) => d.x === x));

// ═══ THE LISP FIRST ════════════════════════════════════════════════════════

test('F5 · KIT_NOTCH.lsp carries D22, its section H2, its NUMBERS block I3 and its command; the licence quotes the owner', () => {
  const lisp = read('reference/lisp/KIT_NOTCH.lsp');
  assert.match(lisp, /;;; D22 THE EDGE NOTCH\. The owner: \*"cut the corner dziala idealnie, ale\n;;;\s+mozesz zrobic mi tez poziome cut\? wszystkich 4 rogow\?"\*/);
  assert.match(lisp, /;;; H2\. THE EDGE NOTCH \(D22, 18\.10\.2026\)/);
  assert.match(lisp, /;;; I3\. NUMBERS - THE EDGE NOTCH \(D22, fixtures\/golden-edge-notch-bb\.json,/);
  assert.match(lisp, /;;; K2\. THE EDGE COMMAND \(D22\)/);
  for (const routine of ['edge-notch-side-fc (edge burFrame)', 'edge-notch-side (cd ch g ed eh edge burFrame)',
    'edge-notch-side-runs (cd ch g ed eh edge', 'notch-side-runs (cd ch g nw nd nh corner', 'edge-notch-plan-side (runs cd',
    'edge-notch-top-runs (cw cd g ed edge', 'notch-top-runs (cw cd g nw nd corner', 'edge-notch-plan-back (runs cw ch g',
    'edge-notch-back-runs (cw ch g eh edge', 'notch-back-runs (cw ch g nw nh corner', 'edge-notch-keepout (cw cd ch g ed eh edge)',
    'edge-notch-less-two (bw bh cutA cutB', 'edge-notch-refusal (cw cd ch g ed eh edge', 'edge-notch-meets-refusal (cw cd ch g ed eh edge nw nd nh corner',
    'edge-notch-hole-refusal (kind board)', 'c:EDGENOTCH_FULL (']) {
    assert.ok(lisp.includes(`(defun ${routine}`), `the LISP defines ${routine}`);
  }
  assert.match(lisp, /\("notch\.edgeDefaults\.depth"\s+\. 20\.0\)/);
  assert.match(lisp, /\("notch\.edgeDefaults\.height"\s+\. 120\.0\)\)\)/);
  assert.doesNotMatch(lisp, /[^\x00-\x7f]/, 'the LISP stays ASCII');
  assert.doesNotMatch(lisp, /[\u2013\u2014]/);
  // The licence in the F's fragment quotes the owner, word for word as CLAUDE.md writes him.
  assert.ok(LISP['reference/lisp/KIT_NOTCH.lsp'].includes(OWNER));
  assert.ok(read('CLAUDE.md').replace(/\s+/g, ' ').includes(OWNER), 'the quote is CLAUDE.md\'s');
});

test('F5 · the edges, the corner name (notch-side-fc\'s own), what a unit asks for, the profile\'s defaults', () => {
  assert.deepEqual(N.EDGE_NOTCH_EDGES, ['TB', 'BB', 'TF', 'BF']);
  const fc = (edge, bur) => N.edgeNotchSideFc(edge, bur);
  assert.deepEqual(['TB', 'BB', 'TF', 'BF'].map((e) => fc(e, false)), ['x1y1', 'x1y0', 'x0y1', 'x0y0'], 'BUL, x from the front');
  assert.deepEqual(['TB', 'BB', 'TF', 'BF'].map((e) => fc(e, true)), ['x0y1', 'x0y0', 'x1y1', 'x1y0'], 'BUR, x from the back');
  assert.equal(N.edgeNotchBoard('TB'), 'TOP');
  assert.equal(N.edgeNotchBoard('BF'), 'BOTTOM');
  assert.deepEqual(N.edgeNotchOf({ edgeNotch: { edge: 'bb', d: '20', h: 120 } }, P), { edge: 'BB', d: 20, h: 120 });
  assert.deepEqual(N.edgeNotchOf({ edgeNotch: { edge: 'TF' } }, P), { edge: 'TF', d: 20, h: 120 }, 'the profile\'s defaults');
  assert.equal(N.edgeNotchOf({}, P), null);
  assert.deepEqual(P.notch.edgeDefaults, { edge: 'BB', depthMm: 20, heightMm: 120 });
  assert.deepEqual(migrateCabinetProfile({ ...P, notch: { ...P.notch, edgeDefaults: { depthMm: 25 } } }).notch.edgeDefaults,
    { edge: 'BB', depthMm: 25, heightMm: 120 }, 'merged key by key');
  // The corner's kit sentence is byte for byte what it was; the edge names itself.
  const budr = getUnitType('BUDR');
  assert.match(N.notchKitRefusal(budr), /^NOTCH: a corner is cut from a base unit \(KIT_BUD\)/);
  assert.match(N.notchKitRefusal(budr, 'an edge'), /^NOTCH: an edge is cut from a base unit \(KIT_BUD\)/);
  assert.equal(N.notchKitRefusal(getUnitType('BUD'), 'an edge'), null);
});

// ═══ ONE LAW: THE RUN LAW IS THE CORNER NOTCH'S OWN SECTION 4 ══════════════

test('F5 · the run law, asked of the corner notch\'s runs, plans exactly what notch-side-joints, notch-top-joints and notch-back-joints plan', () => {
  const cases = [
    ['BL', 200, 200, 300], ['BL', 200, 200, 0], ['BL', 200, 200, -300], ['BR', 200, 150, 400],
    ['FL', 200, 200, 300], ['FR', 250, 120, -250], ['BR', 10, 40, 200], ['FL', 10, 40, 0],
  ];
  for (const [corner, nw, nd, nh] of cases) {
    const said = `${corner} ${nw} / ${nd} / ${nh}`;
    const sj = N.notchSideJoints(558, 770, 18, nw, nd, nh, corner, K);
    const planned = N.edgeNotchPlanSide(N.notchSideRuns(558, 770, 18, nw, nd, nh, corner), 558, K);
    for (const key of ['TOP-SOCKETS', 'BOTTOM-SOCKETS', 'TOP-SCREWS', 'BOTTOM-SCREWS', 'BACK-TABS']) {
      assert.deepEqual(planned[key], sj[key], `${said}: the side's ${key}`);
    }
    if (N.notchBoxedP(nw, 18)) {
      assert.deepEqual(N.edgeNotchPlanTop(N.notchTopRuns(600, 558, 18, nw, nd, corner), 558, K), N.notchTopJoints(600, 558, 18, nw, nd, corner, K), `${said}: the TOP / BOTTOM`);
    }
    const bj = N.notchBackJoints(600, 770, 18, nw, nh, corner, K);
    const bp = N.edgeNotchPlanBack(N.notchBackRuns(600, 770, 18, nw, nh, corner), 600, 770, 18, K);
    const left = N.notchLeftP(corner);
    assert.deepEqual(bp[left ? 'LEFT-SOCKETS' : 'RIGHT-SOCKETS'], bj['NEAR-SOCKETS'], `${said}: the BACK's notch edge`);
    assert.deepEqual(bp[left ? 'RIGHT-SOCKETS' : 'LEFT-SOCKETS'], bj['FAR-SOCKETS'], `${said}: the BACK's far edge`);
    assert.deepEqual(bp['TOP-SOCKETS'], bj['TOP-SOCKETS'], `${said}: the BACK's top edge`);
    assert.deepEqual(bp['BOTTOM-SOCKETS'], bj['BOTTOM-SOCKETS'], `${said}: the BACK's bottom edge`);
    if (N.notchBoxedP(nw, 18)) {
      // T79 F6 (KIT_NOTCH.lsp D10 amended, the owner 18.10.2026: *"to trzeba będzie dodać ... ale tylko na plecach"*):
      // the corner notch's BACK also carries the rows into its box (the RETURN's column, the LID's or the FLOOR's
      // row); the run law plans the BACK's carcass edges, so every hole it plans is drawBACK's, and drawBACK's
      // others stand on the box's lines only.
      const key = (list) => list.map(([x, y]) => `${r2(x)},${r2(y)}`).sort();
      const have = new Set(key(bj.SCREWS));
      for (const k of key(bp.SCREWS)) assert.ok(have.has(k), `${said}: drawBACK's rows carry the planned ${k}`);
      const S = 9;
      const hh = nh === 0 ? 770 : Math.abs(nh);
      const nearX = left ? nw + S : 600 - nw - S;
      const boxY = nh < 0 ? 770 - hh - S : hh + S;
      const planned = new Set(key(bp.SCREWS));
      const extra = bj.SCREWS.filter(([x, y]) => !planned.has(`${r2(x)},${r2(y)}`));
      for (const [x, y] of extra) {
        assert.ok(r2(x) === r2(nearX) || (nh !== 0 && r2(y) === r2(boxY)), `${said}: the extra hole ${x},${y} stands on the box's lines`);
      }
    }
  }
});

// ═══ NUMBERS (I3), BOARD BY BOARD, ON THE ENGINE'S REAL CUT ════════════════

test('F5 · NUMBERS A (BB 20 / 120): BUL and BUR lose their rear BOTTOM corner, one open L each', () => {
  assert.equal(refusalOf(bb), null, JSON.stringify(bb.warnings));
  assert.deepEqual(N.edgeNotchSide(558, 770, 18, 20, 120, 'BB', false), [[0, 0], [520, 0], [520, 120], [540, 120], [540, 770], [0, 770]]);
  const bul = panelOf(bb, 'BUL');
  assert.deepEqual([bul.w, bul.h, bul.cnc.drawn_w, bul.cnc.drawn_h], [540, 770, 540, 770], 'a side keeps its length');
  assert.deepEqual(bul.cnc.notch, { fc: 'x1y0', nw: 20, nh: 120 });
  assert.deepEqual(bul.meta.edgeNotch.outline, [[0, 0], [520, 0], [520, 120], [540, 120], [540, 770], [0, 770]]);
  assert.equal(r2(bul.area_m2 * 1e6), 413400);
  assert.deepEqual(bul.cnc.marks, [{ layer: 'CORNER_4MM', from: [520, 80], to: [540, 120], pts: [[520, 80], [520, 120], [540, 120]] }]);
  const bur = panelOf(bb, 'BUR');
  assert.deepEqual(bur.cnc.notch, { fc: 'x0y0', nw: 20, nh: 120 });
  assert.deepEqual(bur.meta.edgeNotch.outline, [[20, 0], [540, 0], [540, 770], [0, 770], [0, 120], [20, 120]]);
  assert.deepEqual(bur.cnc.marks, [{ layer: 'CORNER_4MM', from: [0, 120], to: [20, 80], pts: [[0, 120], [20, 120], [20, 80]] }]);
  assert.equal(r2(bur.area_m2 * 1e6), 413400);
});

test('F5 · NUMBERS A: the BOTTOM 520 deep (re-origined at its new back edge), the BACK 650 high; the TOP and the shelf are the parent\'s', () => {
  const bottom = panelOf(bb, 'BOTTOM');
  assert.deepEqual(bottom.meta.edgeNotch.outline, [[0, 0], [564, 0], [564, 520], [0, 520]]);
  assert.deepEqual([bottom.w, bottom.h, bottom.cnc.drawn_w, bottom.cnc.drawn_h], [564, 520, 520, 564]);
  assert.deepEqual(bottom.box, { ...panelOf(parent, 'BOTTOM').box, z: 38, d: 520 }, 'the box loses 20 at the back');
  assert.equal(r2(bottom.area_m2 * 1e6), 293280);
  assert.equal(bottom.cnc.notch, null, 'a strip, no corner');
  assert.deepEqual(bottom.cnc.marks, [], 'no inner corner, no mark');
  const xsOf = bottom.cnc.outline.map(([x]) => x);
  assert.deepEqual([Math.min(...xsOf), Math.max(...xsOf)], [0, 520], 'drawTOP_ROT90, x from the new back edge');
  assert.deepEqual(panelOf(bb, 'TOP'), panelOf(parent, 'TOP'));
  assert.deepEqual(panelOf(bb, 'SHELF-1'), panelOf(parent, 'SHELF-1'));
  const back = panelOf(bb, 'BACK');
  assert.deepEqual(back.cnc.outline, [[0, 0], [600, 0], [600, 650], [0, 650]], 'its own frame, re-origined');
  assert.deepEqual([back.w, back.h, back.cnc.drawn_w, back.cnc.drawn_h], [600, 650, 600, 650]);
  assert.deepEqual(back.box, { ...panelOf(parent, 'BACK').box, y: 120, h: 650 });
  assert.equal(r2(back.area_m2 * 1e6), 390000);
  // 19.10.2026 (D22 amended; the owner: *"jak tniemy pionowe to wszystko jest a jak poziome to nie ma, dlaczego?"*):
  // the closing boards, by the corner notch's own law run the whole width: the EDGE-STEP (600 x 120 in the g behind
  // the sides' cut ends) and the EDGE-LID (564 x 20 on it, between the sides); no RETURN, no screw.
  assert.deepEqual(bb.derived.edgeNotch, { edge: 'BB', d: 20, h: 120, cut: ['BUL', 'BUR', 'BOTTOM', 'BACK', 'EDGE-STEP', 'EDGE-LID'], dropped: 0 });
  assert.equal(bb.panels.length, parent.panels.length + 2, 'two closing boards');
  const step = panelOf(bb, 'EDGE-STEP');
  const lid = panelOf(bb, 'EDGE-LID');
  assert.deepEqual([step.part, step.role, step.w, step.h, step.box], ['NOTCH-STEP', 'notch_box', 600, 120, { x: 0, y: 0, z: 20, w: 600, h: 120, d: 18 }]);
  assert.deepEqual([lid.part, lid.role, lid.w, lid.h, lid.box], ['NOTCH-LID', 'notch_box', 564, 20, { x: 18, y: 120, z: 18, w: 564, h: 18, d: 20 }]);
  assert.deepEqual([step.cnc.outline.length, step.cnc.pockets.length, step.cnc.holes.length, lid.cnc.pockets.length], [4, 0, 0, 0], 'plain rectangles');
  assert.deepEqual([step.meta.readiness, step.meta.fixing, step.meta.edgeNotch], ['geometry', 'manual', { edge: 'BB', d: 20, h: 120, box: 'EDGE-STEP' }]);
  assert.deepEqual(N.edgeNotchBoxPlaces(600, 558, 770, 18, 20, 120, 'BB'), { STEP: [0, 520, 0, 600, 538, 120], LID: [18, 520, 120, 582, 540, 138] });
  assert.deepEqual(N.edgeNotchBoxPlaces(600, 558, 770, 18, 50, 100, 'TB'), { STEP: [0, 490, 670, 600, 508, 770], FLOOR: [18, 490, 652, 582, 540, 670] });
  assert.deepEqual(N.edgeNotchBoxPlaces(600, 558, 770, 18, 20, 120, 'BF'), { LID: [18, 0, 120, 582, 20, 138] }, 'a front edge: no STEP (D4)');
  assert.deepEqual([N.edgeNotchStep(600, 120, 'BB'), N.edgeNotchStep(600, 120, 'BF'), N.edgeNotchLid(600, 18, 20, 'BB'), N.edgeNotchLid(600, 18, 20, 'TB'), N.edgeNotchFloor(600, 18, 50, 'TB')],
    [[600, 120], null, [564, 20], null, [564, 50]]);
});

test('F5 · NUMBERS B (TB 50 / 100): the rear TOP corners, the TOP 490 deep drawn from its underside, the BACK 670 high', () => {
  assert.equal(refusalOf(tb), null, JSON.stringify(tb.warnings));
  const bul = panelOf(tb, 'BUL');
  assert.deepEqual(bul.meta.edgeNotch.outline, [[0, 0], [540, 0], [540, 670], [490, 670], [490, 770], [0, 770]]);
  assert.deepEqual(bul.cnc.notch, { fc: 'x1y1', nw: 50, nh: 100 });
  assert.deepEqual(bul.cnc.marks[0].pts, [[530, 670], [490, 670], [490, 710]]);
  assert.equal(r2(bul.area_m2 * 1e6), 410800);
  const bur = panelOf(tb, 'BUR');
  assert.deepEqual(bur.meta.edgeNotch.outline, [[0, 0], [540, 0], [540, 770], [50, 770], [50, 670], [0, 670]]);
  assert.deepEqual(bur.cnc.marks[0].pts, [[50, 710], [50, 670], [10, 670]]);
  const top = panelOf(tb, 'TOP');
  assert.deepEqual(top.meta.edgeNotch.outline, [[0, 0], [564, 0], [564, 490], [0, 490]]);
  assert.deepEqual([top.h, top.cnc.drawn_w, top.cnc.drawn_h], [490, 490, 564]);
  assert.deepEqual(top.box, { ...panelOf(parent, 'TOP').box, z: 68, d: 490 });
  assert.equal(r2(top.area_m2 * 1e6), 276360);
  // Drawn from its underside (D11): the LISP's (0 564) (0 0) (490 0) (490 564), the corners of the cut outline.
  for (const [x, y] of [[0, 564], [0, 0], [490, 0], [490, 564]]) {
    assert.ok(top.cnc.outline.some(([a, b]) => a === x && b === y), `(${x} ${y}) is a corner of the cut TOP`);
  }
  assert.deepEqual(panelOf(tb, 'BOTTOM'), panelOf(parent, 'BOTTOM'));
  const back = panelOf(tb, 'BACK');
  assert.deepEqual(back.cnc.outline, [[0, 0], [600, 0], [600, 670], [0, 670]]);
  assert.deepEqual(back.box, { ...panelOf(parent, 'BACK').box, h: 670 });
  assert.equal(r2(back.area_m2 * 1e6), 402000);
});

test('F5 · NUMBERS: which joints move, on the real drills (A and B)', () => {
  // A, BB: BUL's bottom edge on 0..520, the back tabs on 120..770; the BACK's sockets mate them, no bottom row.
  assert.deepEqual(socketXs(drillsOf(bb, 'BUL', 'puzzle'), 8), [95, 425]);
  assert.deepEqual(socketXs(drillsOf(bb, 'BUL', 'puzzle'), 762), [95, 445], 'the top edge is the parent\'s');
  assert.deepEqual(scrAt(bb, 'BUL', 9), [50, 260, 470]);
  assert.deepEqual(tabsUp(panelOf(bb, 'BUL')), [215, 445, 675]);
  assert.deepEqual(socketXs(drillsOf(bb, 'BUR', 'puzzle'), 8), [115, 445], 'BUR read from the back');
  assert.deepEqual(scrAt(bb, 'BUR', 9), [70, 280, 490]);
  assert.deepEqual(socketYs(drillsOf(bb, 'BACK', 'puzzle'), 8), [95, 325, 555], 'own frame (carcass z 215, 445, 675)');
  assert.deepEqual(socketYs(drillsOf(bb, 'BACK', 'puzzle'), 592), [95, 325, 555]);
  assert.deepEqual(socketXs(drillsOf(bb, 'BACK', 'puzzle'), 642), [113, 487], 'the top edge, the parent\'s');
  assert.deepEqual(colAt(bb, 'BACK', 9), [50, 210, 440, 600]);
  assert.deepEqual(colAt(bb, 'BACK', 591), [50, 210, 440, 600]);
  assert.deepEqual(scrAt(bb, 'BACK', 641), [68, 300, 532]);
  assert.equal(drillsOf(bb, 'BACK').filter((d) => d.y < 0).length, 0);
  // The BOTTOM's tabs into the sides on 0..520 (drawn x 95 and 425 from the new back edge), none into the BACK.
  const bones = (r, id) => panelOf(r, id).cnc.pockets.map((pk) => [r2((pk.x1 + pk.x2) / 2), r2((pk.y1 + pk.y2) / 2)]);
  assert.deepEqual([...new Set(bones(bb, 'BOTTOM').map(([x]) => x))].sort((a, b) => a - b), [95, 425]);
  assert.equal(bones(bb, 'BOTTOM').filter(([x]) => x < 0).length, 0, 'no tab into the BACK');
  // B, TB: BUL's top edge on 0..490, the back tabs on 0..670; the BACK's top edge gone.
  assert.deepEqual(socketXs(drillsOf(tb, 'BUL', 'puzzle'), 762), [95, 395]);
  assert.deepEqual(scrAt(tb, 'BUL', 761), [50, 245, 440]);
  assert.deepEqual(scrAt(tb, 'BUL', 9), [50, 270, 490]);
  assert.deepEqual(tabsUp(panelOf(tb, 'BUL')), [95, 335, 575]);
  assert.deepEqual(socketXs(drillsOf(tb, 'BUR', 'puzzle'), 762), [145, 445]);
  assert.deepEqual(scrAt(tb, 'BUR', 761), [100, 295, 490]);
  assert.deepEqual(socketYs(drillsOf(tb, 'BACK', 'puzzle'), 8), [95, 335, 575]);
  assert.deepEqual(socketXs(drillsOf(tb, 'BACK', 'puzzle'), 8), [113, 487]);
  assert.deepEqual(colAt(tb, 'BACK', 9), [50, 215, 455, 620]);
  assert.deepEqual(scrAt(tb, 'BACK', 9), [68, 300, 532]);
  assert.equal(scrAt(tb, 'BACK', 761).length, 0, 'no top row: nothing meets it');
  // The routines say the same.
  assert.deepEqual(N.edgeNotchSideJoints(558, 770, 18, 20, 120, 'BB', K), {
    'TOP-SOCKETS': [95, 445], 'BOTTOM-SOCKETS': [95, 425], 'TOP-SCREWS': [50, 270, 490], 'BOTTOM-SCREWS': [50, 260, 470], 'BACK-TABS': [215, 445, 675],
  });
  assert.deepEqual(N.edgeNotchTopJoints(600, 558, 18, 50, 'TB', K), { LEFT: [95, 395], RIGHT: [95, 395], BACK: [] });
  assert.deepEqual(N.edgeNotchTopJoints(600, 558, 18, 50, 'TF', K), { LEFT: [145, 445], RIGHT: [145, 445], BACK: [95, 469] });
});

// The block itself, read as text: every number I3 states is the number the engine cuts.
test('F5 · the LISP\'s own I3 block, line by line, is the engine\'s cut (outlines, marks, areas, joints, the room, case C)', () => {
  const lisp = read('reference/lisp/KIT_NOTCH.lsp');
  const from = lisp.indexOf(';;; I3. NUMBERS - THE EDGE NOTCH');
  const to = lisp.indexOf(';;; J. DRAWING', from);
  assert.ok(from > 0 && to > from, 'the I3 block stands before section J');
  const lines = lisp.slice(from, to).split('\n').map((l) => l.replace(/^;;;\s?/, ''));
  const prose = lines.join(' ').replace(/\s+/g, ' ');
  const pts = (list) => list.map(([x, y]) => `(${r2(x)} ${r2(y)})`).join(' ');
  const arrow = (list) => list.map(([x, y]) => `(${r2(x)} ${r2(y)})`).join(' -> ');
  const csv = (list) => list.map(r2).join(', ');
  const say = (s) => assert.ok(prose.includes(s), `I3 states ${s}`);
  // Each case's table is its own: A's rows before CASE B, B's between CASE B and CASE C.
  const caseB = lines.findIndex((l) => l.startsWith('CASE B'));
  const caseC = lines.findIndex((l) => l.startsWith('CASE C'));
  assert.ok(caseB > 0 && caseC > caseB, 'I3 has its three cases in order');
  let scope = lines.slice(0, caseB);
  const row = (label) => {
    const cols = scope.map((l) => l.trim().split(/\s{2,}/)).find((c) => c[0] === label);
    assert.ok(cols, `I3 has the row ${label}`);
    return cols;
  };
  const held = (label, was, now) => {
    const [, p, n] = row(label);
    assert.equal(p, csv(was), `${label}: the parent's column`);
    assert.equal(n, csv(now), `${label}: the cut column`);
  };
  // CASE A.
  const [k, kz0, kz1] = N.edgeNotchKeepout(600, 558, 770, 18, 20, 120, 'BB');
  say(`KEEP-OUT: plan x ${k[0]}..${k[2]}, y ${k[1]}..${k[3]}; height z ${kz0}..${kz1}.`);
  for (const id of ['BUL', 'BUR']) {
    const p = panelOf(bb, id);
    say(pts(p.meta.edgeNotch.outline));
    say(arrow(p.cnc.marks[0].pts));
  }
  say(`(${r2(panelOf(bb, 'BUL').area_m2 * 1e6)} mm2)`);
  say(`plan frame ${pts(panelOf(bb, 'BOTTOM').meta.edgeNotch.outline)}`);
  say(`re-origined at its new back edge: ${pts([[520, 0], [520, 564], [0, 564], [0, 0]])}`);
  say(`(${r2(panelOf(bb, 'BOTTOM').area_m2 * 1e6)} mm2)`);
  say(`own frame ${pts(panelOf(bb, 'BACK').cnc.outline)}`);
  say(`(${r2(panelOf(bb, 'BACK').area_m2 * 1e6)} mm2)`);
  held('BUL bottom sockets (from front)', socketXs(drillsOf(parent, 'BUL', 'puzzle'), 8), socketXs(drillsOf(bb, 'BUL', 'puzzle'), 8));
  held('BUL bottom screw row', scrAt(parent, 'BUL', 9), scrAt(bb, 'BUL', 9));
  held('BUL back-edge tabs (y)', tabsUp(panelOf(parent, 'BUL')), tabsUp(panelOf(bb, 'BUL')));
  held('BACK sockets, both side edges', socketYs(drillsOf(parent, 'BACK', 'puzzle'), 8), socketYs(drillsOf(bb, 'BACK', 'puzzle'), 8).map((y) => y + 120));
  held('BACK top sockets (carcass x)', socketXs(drillsOf(parent, 'BACK', 'puzzle'), 762), socketXs(drillsOf(bb, 'BACK', 'puzzle'), 642));
  held('BACK side screw rows (x 9, 591)', colAt(parent, 'BACK', 9), colAt(bb, 'BACK', 9).map((y) => y + 120));
  assert.equal(row('BACK bottom sockets')[2], 'NONE');
  assert.equal(row('BACK bottom screw row')[2], 'NONE');
  assert.equal(row('BOTTOM tabs into BACK (x)')[2], 'NONE (meets nothing)');
  const tjA = N.edgeNotchTopJoints(600, 558, 18, 20, 'BB', K);
  assert.equal(row('BOTTOM tabs into BUL / BUR (y)')[2], csv(tjA.LEFT));
  say(`bottom sockets ${csv(socketXs(drillsOf(bb, 'BUR', 'puzzle'), 8).reverse())}; screws ${csv(scrAt(bb, 'BUR', 9).reverse())}`);
  // CASE B.
  scope = lines.slice(caseB, caseC);
  const [kb, kbz0, kbz1] = N.edgeNotchKeepout(600, 558, 770, 18, 50, 100, 'TB');
  say(`KEEP-OUT: plan x ${kb[0]}..${kb[2]}, y ${kb[1]}..${kb[3]}; height z ${kbz0}..${kbz1}.`);
  for (const id of ['BUL', 'BUR']) {
    const p = panelOf(tb, id);
    say(pts(p.meta.edgeNotch.outline));
    say(arrow(p.cnc.marks[0].pts));
  }
  say(`plan frame ${pts(panelOf(tb, 'TOP').meta.edgeNotch.outline)}`);
  say(`(${r2(panelOf(tb, 'TOP').area_m2 * 1e6)} mm2)`);
  say(pts(panelOf(tb, 'BACK').cnc.outline));
  held('BUL top sockets (x from front)', socketXs(drillsOf(parent, 'BUL', 'puzzle'), 762), socketXs(drillsOf(tb, 'BUL', 'puzzle'), 762));
  held('BUL top screw row', scrAt(parent, 'BUL', 761), scrAt(tb, 'BUL', 761));
  held('BUL back-edge tabs (y)', tabsUp(panelOf(parent, 'BUL')), tabsUp(panelOf(tb, 'BUL')));
  held('BACK side screw rows (x 9, 591)', colAt(parent, 'BACK', 9), colAt(tb, 'BACK', 9));
  held('BACK bottom screw row (y 9)', scrAt(parent, 'BACK', 9), scrAt(tb, 'BACK', 9));
  // THE ROOM: the deepest and the highest the engine accepts are the numbers I3 names, and the sentences are the engine's.
  let deepest = 0;
  let highest = 0;
  for (let a = 1; a < 558; a += 1) if (N.edgeNotchRefusal(600, 558, 770, 18, a, 100, 'BB', K) === null) deepest = a;
  for (let a = 1; a < 770; a += 1) if (N.edgeNotchRefusal(600, 558, 770, 18, 20, a, 'BB', K) === null) highest = a;
  say(`ed may run to ${deepest} and eh to ${highest}`);
  say(`"${N.edgeNotchRefusal(600, 558, 770, 18, deepest + 1, 100, 'BB', K)}"`);
  say(`"${N.edgeNotchRefusal(600, 558, 770, 18, 20, highest + 1, 'BB', K)}"`);
  // CASE C.
  say(pts(panelOf(both, 'BUL').meta.edgeNotch.outline));
  for (const m of panelOf(both, 'BUL').cnc.marks) say(arrow(m.pts));
  say(`area ${r2(panelOf(both, 'BUL').area_m2)} m2 (${r2(panelOf(both, 'BUL').area_m2 * 1e6)} mm2)`);
  say(`(${r2(panelOf(both, 'BACK').area_m2 * 1e6)} mm2)`);
  say(`"${N.edgeNotchMeetsRefusal(600, 558, 770, 18, 20, 120, 'BB', 200, 200, 300, 'BL', K)}"`);
});

// ═══ THE CORNER MARK: ONE OPEN L PER INNER CORNER (the 1710h law) ══════════

test('F5 · the corner mark is one open three-point L per inner corner, on CORNER_4MM, walked the outline\'s way; the DXF writes it open', () => {
  const inner = (pts) => N.cornerMarksOf(pts, 40).length;
  for (const [r, id, n] of [[bb, 'BUL', 1], [bb, 'BUR', 1], [tb, 'BUL', 1], [tb, 'BUR', 1], [bb, 'BOTTOM', 0], [bb, 'BACK', 0], [both, 'BUL', 2], [both, 'BACK', 1]]) {
    const p = panelOf(r, id);
    assert.equal(p.cnc.marks.length, n, `${id}: ${n} mark(s)`);
    for (const m of p.cnc.marks) {
      assert.equal(m.layer, 'CORNER_4MM');
      assert.equal(m.pts.length, 3, 'one L: three points');
      assert.deepEqual([m.from, m.to], [m.pts[0], m.pts[2]]);
    }
    const nominal = p.meta.edgeNotch?.outline;
    if (nominal && id !== 'BOTTOM') assert.equal(inner(nominal), n, `${id}: one per inner corner of its outline`);
  }
  for (const r of [bb, tb, both]) {
    const files = buildUnitDxfFiles(r, P);
    for (const f of files) {
      for (const e of f.entities.filter((x) => x.layer === 'CORNER_4MM')) {
        assert.equal(e.closed, false, `${f.panelId}: an open polyline`);
        assert.equal(e.pts.length, 3, `${f.panelId}: three vertices`);
      }
    }
    assert.equal(files.find((f) => f.panelId === 'BUL').entities.filter((x) => x.layer === 'CORNER_4MM').length, r === both ? 2 : 1);
  }
});

// ═══ COEXISTENCE AND REFUSAL ═══════════════════════════════════════════════

test('F5 · coexistence (case C): the corner notch BL 200 / 200 / 300 and TB 50 / 100 are both cut, each board on the met runs', () => {
  assert.equal(refusalOf(both), null, JSON.stringify(both.warnings));
  assert.equal(both.derived.edgeNotch.withCorner, true);
  assert.deepEqual(both.derived.notch.boards, ['RETURN', 'STEP', 'LID']);
  const bul = panelOf(both, 'BUL');
  assert.deepEqual(bul.meta.edgeNotch.outline, [[0, 0], [340, 0], [340, 300], [540, 300], [540, 670], [490, 670], [490, 770], [0, 770]]);
  assert.deepEqual(bul.cnc.notch, { fc: 'x1y0', nw: 200, nh: 300, also: { fc: 'x1y1', nw: 50, nh: 100 } }, 'the 3-D cuts both');
  assert.equal(r2(bul.area_m2 * 1e6), 350800);
  assert.deepEqual(socketXs(drillsOf(both, 'BUL', 'puzzle'), 8), [95, 245]);
  assert.deepEqual(scrAt(both, 'BUL', 9), [50, 170, 290]);
  assert.deepEqual(socketXs(drillsOf(both, 'BUL', 'puzzle'), 762), [95, 395]);
  assert.deepEqual(tabsUp(bul), [395, 575], 'the back run 300..670');
  const back = panelOf(both, 'BACK');
  assert.deepEqual(back.cnc.outline, [[0, 300], [200, 300], [200, 0], [600, 0], [600, 670], [0, 670]]);
  assert.deepEqual(back.cnc.notch, { fc: 'x0y0', nw: 200, nh: 300 });
  assert.equal(r2(back.area_m2 * 1e6), 342000);
  assert.deepEqual(socketYs(drillsOf(both, 'BACK', 'puzzle'), 8), [395, 575]);
  assert.deepEqual(socketYs(drillsOf(both, 'BACK', 'puzzle'), 592), [95, 335, 575]);
  assert.deepEqual(socketXs(drillsOf(both, 'BACK', 'puzzle'), 8), [313, 487]);
  assert.deepEqual(colAt(both, 'BACK', 9), [350, 485, 620]);
  assert.deepEqual(colAt(both, 'BACK', 591), [50, 215, 455, 620]);
  assert.deepEqual(scrAt(both, 'BACK', 9), [268, 400, 532]);
  assert.deepEqual(panelOf(both, 'TOP'), panelOf(tb, 'TOP'), 'the corner notch cuts the BOTTOM only');
  const cornerOnly = computeCabinet({ ...BUD, notch: CORNER }, P);
  assert.deepEqual(panelOf(both, 'BOTTOM'), panelOf(cornerOnly, 'BOTTOM'), 'the edge notch does not reach the BOTTOM');
  for (const id of ['RETURN', 'STEP', 'LID']) assert.deepEqual(panelOf(both, id), panelOf(cornerOnly, id), `${id} as the corner notch cuts it`);
  // The corner notch hung from the top with a skirting under it, and a full-height corner beside a front edge:
  // the BACK re-origined by the edge (z 120), the BUR re-origined by the corner (a board 340 long, cut at its front).
  const top = computeCabinet({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: -300 }, edgeNotch: BB }, P);
  assert.equal(refusalOf(top), null, JSON.stringify(top.warnings));
  assert.deepEqual(panelOf(top, 'BACK').cnc.notch, { fc: 'x0y1', nw: 200, nh: 300 });
  assert.deepEqual(panelOf(top, 'BACK').box.y, 120);
  assert.deepEqual(panelOf(top, 'BACK').cnc.marks[0].pts, [[200, 390], [200, 350], [160, 350]]);
  const full = computeCabinet({ ...BUD, notch: { corner: 'BR', w: 200, d: 200, h: 0 }, edgeNotch: { edge: 'BF', d: 30, h: 60 } }, P);
  assert.equal(refusalOf(full), null, JSON.stringify(full.warnings));
  const bur = panelOf(full, 'BUR');
  assert.deepEqual([bur.w, bur.cnc.drawn_w, bur.box.z, bur.box.d], [340, 340, 218, 340]);
  assert.deepEqual(bur.cnc.notch, { fc: 'x1y0', nw: 30, nh: 60 });
  assert.deepEqual(bur.cnc.marks[0].pts, [[310, 20], [310, 60], [340, 60]], 'in the shortened board\'s own frame');
  assert.deepEqual(panelOf(full, 'BOTTOM').meta.edgeNotch.outline, [[0, 30], [564, 30], [564, 340], [364, 340], [364, 540], [0, 540]]);
  for (const r of [both, top, full]) {
    assert.deepEqual(resultFindings(r), [], 'no outline fault');
    assert.deepEqual(unitFindings(r, { profile: P }), [], 'no export-gate fault');
  }
});

test('F5 · overlapping rectangles refuse in words, and the parent with its corner notch is what is cut; a run both leave too short refuses', () => {
  const r = computeCabinet({ ...BUD, notch: CORNER, edgeNotch: BB }, P);
  const w = refusalOf(r);
  assert.equal(w.message, 'NOTCH: the edge notch and the corner notch overlap on BUL. Move one of them, or make it smaller.');
  assert.equal(w.panel, 'BUL');
  assert.deepEqual(r.panels, computeCabinet({ ...BUD, notch: CORNER }, P).panels);
  assert.equal(r.derived.edgeNotch.refused, w.message);
  assert.equal(refusalOf(computeCabinet({ ...BUD, notch: { ...CORNER, h: 0 }, edgeNotch: TB }, P)).message,
    'NOTCH: the edge notch and the corner notch overlap on BUL. Move one of them, or make it smaller.', 'full height meets every back edge');
  const short = computeCabinet({ ...BUD, notch: { ...CORNER, h: 500 }, edgeNotch: { edge: 'TB', d: 50, h: 200 } }, P);
  assert.equal(refusalOf(short).message, 'NOTCH: what the corner notch and the edge notch leave of the BACK edge of BUL cannot hold a joint. Make one of them smaller.');
  // A rebate (an unboxed corner notch) whose side the edge notch would move a joint into (a shallow wall unit).
  const reb = computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: '01', depth: 300, notch: { corner: 'FR', w: 10, d: 100, h: 200 }, edgeNotch: { edge: 'BB', d: 100, h: 100 } }, P);
  assert.equal(refusalOf(reb).message, 'NOTCH: a notch narrower than the board is a rebate in BUR, and the edge notch moves a joint into it. '
    + 'Make the corner notch at least as wide as the board, or smaller.');
  assert.equal(refusalOf(computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: '01', depth: 300, notch: { corner: 'FR', w: 10, d: 100, h: 200 } }, P)), null, 'the rebate alone is cut');
  // The pure routines.
  assert.equal(N.edgeNotchShortRun({ BACK: [500, 770] }, { BACK: [0, 570] }, 96), 'BACK');
  assert.equal(N.edgeNotchShortRun({ BACK: [300, 770] }, { BACK: [0, 670] }, 96), null);
  assert.equal(N.edgeNotchShortRun({ BACK: null }, { BACK: [0, 670] }, 96), null, 'an edge one cut took away is no joint to hold');
  assert.deepEqual(N.edgeNotchLessTwo(10, 10, ['x0y0', 4, 3], ['x1y1', 2, 2]), [[0, 3], [4, 3], [4, 0], [10, 0], [10, 8], [8, 8], [8, 10], [0, 10]]);
  assert.deepEqual(N.edgeNotchLessTwo(10, 10, ['x1y0', 4, 3], ['x0y1', 10, 2]), [[0, 0], [6, 0], [6, 3], [10, 3], [10, 8], [0, 8]], 'a strip and a corner');
  assert.deepEqual(N.edgeNotchLessTwo(10, 10, ['x0y0', 4, 3], null), N.notchRectOutline(10, 10, 4, 3, 'x0y0').slice(-2).concat(N.notchRectOutline(10, 10, 4, 3, 'x0y0').slice(0, 4)),
    'one cut: notch-rect-outline\'s polygon from another vertex');
});

test('F5 · the room refuses first: minInterior in depth and in height, the edge, zero, the kit, a slope, a recess', () => {
  const at = (edgeNotch, extra = {}) => refusalOf(computeCabinet({ ...BUD, shelves: 0, ...extra, edgeNotch }, P))?.message || null;
  assert.equal(at({ edge: 'BB', d: 440, h: 100 }), null);
  assert.equal(at({ edge: 'BB', d: 441, h: 100 }), 'NOTCH: an edge notch must leave 100 mm of the interior beside it in depth. Make it shallower.');
  assert.equal(at({ edge: 'TB', d: 20, h: 652 }), null);
  assert.equal(at({ edge: 'TB', d: 20, h: 653 }), 'NOTCH: an edge notch must leave 100 mm of the interior beside it in height. Make it lower.');
  assert.equal(at({ edge: 'XX', d: 20, h: 100 }), 'NOTCH: the edge is TB, BB, TF or BF.');
  assert.equal(at({ edge: 'BB', d: 0, h: 100 }), 'NOTCH: the depth and the height of an edge notch must both be more than 0.');
  const budr = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01', edgeNotch: BB }, P);
  assert.match(refusalOf(budr).message, /^NOTCH: an edge is cut from a base unit \(KIT_BUD\), a tall unit \(KIT_BUDTALL\), a wardrobe \(KIT_WARDROBE\) or a wall unit \(KIT_WUD\) carcass; /);
  const say = (extraParams, parentParams = {}) => N.edgeNotchVerdict({
    parent: { params: { width: 600, height: 770, depth: 558, board_t: 18, ...parentParams }, panels: [], drills: [] },
    params: { edgeNotch: BB, ...extraParams },
    type: getUnitType('BUD'),
    profile: P,
  })?.message ?? null;
  assert.equal(say({}, { slope_cut: { x0: 0, x1: 600 } }), 'NOTCH: a carcass cut under a slope cannot take an edge notch as well. Move it out of the slope first.');
  assert.equal(say({ extension: { x0: 0, x1: 300, z0: 0, z1: 770, d: 100 } }), 'NOTCH: a carcass grown into a recess cannot take an edge notch as well. Move it out of the recess first.');
  assert.equal(say({}), null);
});

test('F5 · D7 and D8: a hinge or a hanger on either side, a hanger cut-out in the BACK, a shelf in the rebate refuse; a shelf pin steps; the legs step', () => {
  for (const edge of ['TF', 'BF']) {
    const r = computeCabinet({ ...BUD, edgeNotch: { edge, d: 50, h: 100 } }, P);
    assert.equal(refusalOf(r).message, N.edgeNotchHoleRefusal('hinge', 'BUL'), `${edge}: the hinge plates`);
    assert.deepEqual(r.panels, parent.panels, `${edge}: the parent is what is cut`);
  }
  assert.equal(N.edgeNotchHoleRefusal('hinge', 'BUL'),
    'NOTCH: the hinge drilling of BUL falls in the edge notch, and a hinge cannot be fixed to air. Make the notch smaller, or cut another edge.');
  const wud = { ...defaultParamsFor('WUD', P), unit_num: '01' };
  assert.equal(refusalOf(computeCabinet({ ...wud, edgeNotch: TB }, P)).message, N.edgeNotchHoleRefusal('hanger', 'BUL'));
  assert.equal(refusalOf(computeCabinet({ ...wud, edgeNotch: { edge: 'TB', d: 10, h: 100 } }, P)).message,
    'NOTCH: the hanger cut-out of the BACK falls in the edge notch, and a hanger cannot be fixed to air. Make the notch smaller, or cut another edge.');
  assert.equal(refusalOf(computeCabinet({ ...wud, edgeNotch: { edge: 'BB', d: 20, h: 100 } }, P)), null, 'a skirting under a wall unit');
  assert.equal(refusalOf(computeCabinet({ ...BUD, edgeNotch: { edge: 'BB', d: 20, h: 400 } }, P)).message,
    'NOTCH: SHELF-1 stands where the edge notch goes. Move it, or make the notch smaller.');
  // A shelf-pin hole the cut reaches steps away from it by ed (the corner notch's D7), the shelf over the rebate.
  const pins = computeCabinet({ ...BUD, edgeNotch: { edge: 'BB', d: 100, h: 350 } }, P);
  assert.equal(refusalOf(pins), null);
  assert.deepEqual(drillsOf(pins, 'BUL', 'shelf').filter((d) => d.y === 335).map((d) => d.x), [70, 370]);
  assert.deepEqual(drillsOf(pins, 'BUR', 'shelf').filter((d) => d.y === 335).map((d) => d.x), [170, 470]);
  // Legs standing in a bottom edge's footprint step out of it (50 from the back, 60 deep: 50 + 60 + 18).
  const legs = computeCabinet({ ...BUD, edgeNotch: { edge: 'BB', d: 60, h: 120 } }, P).assemblies.legs.positions;
  assert.deepEqual(legs.map((l) => l.z), [430, 430, 128, 128]);
  assert.deepEqual(computeCabinet({ ...BUD, edgeNotch: TB }, P).assemblies.legs.positions, parent.assemblies.legs.positions, 'a top edge leaves them');
});

test('F5 · the joint systems keep the puzzle, in words, under an edge notch', () => {
  for (const [system, file] of [['cabineo12', 'SKYLON_JOINTS_CABINEO.lsp'], ['dowel', 'SKYLON_JOINTS_DOWEL.lsp'], ['biscuit', 'SKYLON_JOINTS_BISCUIT.lsp']]) {
    const r = computeCabinet({ ...BUD, joints_system: system, edgeNotch: BB }, P);
    assert.equal(r.derived.joints.refused, `a carcass with an edge notch keeps the puzzle: KIT_NOTCH.lsp re-plans the puzzle's joints, and ${file} has no notch row`, system);
    assert.equal(r.derived.edgeNotch.edge, 'BB', `${system}: the edge notch is cut with the puzzle`);
  }
});

test('F5 · every edge on four kits: no outline fault, no export-gate fault, a solid in the 3-D', () => {
  const cases = [
    ['BUD', BB, {}], ['BUD', TB, {}], ['BUD', { edge: 'BF', d: 30, h: 60 }, {}], ['BUD', { edge: 'TF', d: 30, h: 60 }, { hinge: 'R' }],
    ['WARDROBE', BB, {}], ['WARDROBE', TB, {}], ['WUD', { edge: 'BB', d: 20, h: 100 }, {}], ['BUDTALL', { edge: 'TB', d: 60, h: 150 }, {}],
  ];
  for (const [type, edgeNotch, extra] of cases) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', shelves: 1, ...extra, edgeNotch }, P);
    const said = `${type} ${JSON.stringify(edgeNotch)}`;
    assert.equal(refusalOf(r), null, `${said} refused: ${JSON.stringify(r.warnings)}`);
    assert.deepEqual(resultFindings(r), [], `${said}: outline faults`);
    assert.deepEqual(unitFindings(r, { profile: P }), [], `${said}: export gate`);
    for (const id of ['BUL', 'BUR', N.edgeNotchBoard(edgeNotch.edge)]) {
      const { solid } = panelSolids(panelOf(r, id), P.puzzle.layers, P, r.drills);
      assert.ok(solid, `${said}: ${id} rendered`);
    }
  }
  // The 3-D cuts the side's corner from cnc.notch (both corners with `also`), nothing else.
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.deepEqual(N.cutNotchCorner(sq, 10, 10, { fc: 'x1y0', nw: 2, nh: 3, also: { fc: 'x1y1', nw: 1, nh: 2 } }),
    [[0, 0], [8, 0], [8, 3], [10, 3], [10, 8], [9, 8], [9, 10], [0, 10]]);
});

// ═══ THE GOLDENS AND THE GATE ══════════════════════════════════════════════

test('F5 · golden-edge-notch-bb.json and golden-edge-notch-tb.json are the cut; the notch goldens and the six hold; the gate opens on the parameter only', () => {
  for (const [file, edge] of [['golden-edge-notch-bb.json', BB], ['golden-edge-notch-tb.json', TB]]) {
    const g = JSON.parse(read(`fixtures/${file}`));
    assert.deepEqual(g.params.edgeNotch, edge);
    assert.deepEqual(goldenOf(g.params, P), g.expected, file);
    assert.equal(GATES.edgeNotch.opens(g.params), true, file);
    assert.ok(GOLDENS.some((x) => x.file === file), `${file} is named in the fragment`);
  }
  for (const file of ['golden-notch.json', 'golden-notch-top.json']) {
    const g = JSON.parse(read(`fixtures/${file}`));
    assert.deepEqual(goldenOf(g.params, P), g.expected, `${file} is what it was`);
    assert.equal(GATES.edgeNotch.opens(g.params), false, file);
  }
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(head[id].sha256, base[id].sha256, id);
  assert.equal(GATES.edgeNotch.opens(BUD), false);
  assert.equal(GATES.edgeNotch.opens({ ...BUD, notch: CORNER }), false, 'the corner notch alone');
});

// ═══ THE STORE, SAVE AND RELOAD, THE TWO WINDOWS, THE PICKER ═══════════════

function aKitchen() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUD');
  return S().units[0].id;
}
const unitOf = (id) => S().units.find((u) => u.id === id);

test('F5 · setUnitEdgeNotch keeps the edge notch, refuses in the engine\'s words and keeps nothing, reloads, and takes it off', () => {
  const id = aKitchen();
  const res = S().setUnitEdgeNotch(id, { edge: 'bb', d: 20, h: 120 });
  assert.equal(res.ok, true, res.said);
  assert.deepEqual(unitOf(id).params.edgeNotch, { edge: 'BB', d: 20, h: 120 });
  const r = S().unitResult(id);
  assert.equal(r.derived.edgeNotch.edge, 'BB');
  assert.equal(r.panels.find((p) => p.id === 'BOTTOM').cnc.drawn_w, r.params.depth - 18 - 20);
  const no = S().setUnitEdgeNotch(id, { edge: 'BB', d: 2000, h: 120 });
  assert.equal(no.ok, false);
  assert.match(no.said, /an edge notch must leave 100 mm of the interior beside it in depth/);
  assert.deepEqual(unitOf(id).params.edgeNotch, { edge: 'BB', d: 20, h: 120 }, 'a refused edge notch was kept');
  assert.equal(S().setUnitEdgeNotch(id, { edge: 'ZZ', d: 20, h: 120 }).said, 'NOTCH: the edge is TB, BB, TF or BF.');
  // Save and reload.
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  const before = S().unitResult(id).csvLines;
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(unitOf(id).params.edgeNotch, { edge: 'BB', d: 20, h: 120 });
  assert.deepEqual(S().unitResult(id).csvLines, before);
  // Off again, one action.
  assert.equal(S().setUnitEdgeNotch(id, null).ok, true);
  assert.equal(unitOf(id).params.edgeNotch, undefined);
  assert.equal(S().unitResult(id).derived.edgeNotch, undefined);
});

test('F5 · the picker: CUT EDGE lights the four edges (and puts the corners out), a click opens the edge-notch window at the click', () => {
  const id = aKitchen();
  U().startNotchPick(id);
  U().startEdgeNotchPick(id);
  assert.equal(U().edgeNotchPick, id);
  assert.equal(U().notchPick, null, 'one or the other is lit');
  U().startNotchPick(id);
  assert.equal(U().edgeNotchPick, null);
  U().stopNotchPick();
  // REWRITTEN 19.10.2026 (chat fix, the owner: "kwadrat na srodku kazdej z 4
  // poziomych krawedzi boku, jak przy naroznikach": "tak"): the square's spot
  // is the middle of the edge, not a lifted handle at 35 / 65 percent.
  assert.deepEqual(notchEdgeSpots(600, 558, 770), [
    { edge: 'TB', y: 770, z: 0, x: 300 }, { edge: 'BB', y: 0, z: 0, x: 300 },
    { edge: 'TF', y: 770, z: 558, x: 300 }, { edge: 'BF', y: 0, z: 558, x: 300 },
  ]);
  assert.deepEqual(MODAL_KINDS['edge-notch'], { about: 'object', label: 'Cut edge' });
  assert.equal(modalNeedsAnchor('edge-notch'), true);
  askNotchEdge(id, 'TB', { x: 400, y: 300 });
  assert.equal(U().modal, 'edge-notch');
  assert.equal(U().modalArgs.unitId, id);
  assert.equal(U().modalArgs.edge, 'TB');
  U().closeModal();
  const scene = read('src/3d/NotchEdges.jsx');
  assert.match(scene, /userData=\{\{ ccNotchEdge: sp\.edge, ccUnitId: unitId \}\}/, 'the walk finds the handles');
  assert.match(scene, /useUiStore\(\(s\) => s\.edgeNotchPick\)/);
  assert.match(read('src/3d/UnitView.jsx'), /<NotchEdges unitId=\{unit\.id\} width=\{W\} depth=\{D\} height=\{H\} edgeNotch=\{unit\.params\?\.edgeNotch \|\| null\} \/>/,
    'mounted where NotchCorners is');
});

test('F5 · retail: the adapter cuts an edge, the SIZE step carries CUT EDGE, the window says the owner\'s two cases', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = A.addFirstWardrobe();
  assert.equal(A.canCutEdge(a), true);
  assert.equal(A.toggleCutEdge(a), true);
  assert.equal(A.cuttingEdge(a), true);
  assert.deepEqual(A.edgeNotchDefaults(), { edge: 'BB', d: 20, h: 120 });
  const yes = A.cutEdge(a, 'BB', { d: 20, h: 120 });
  assert.equal(yes.ok, true, yes.said);
  assert.equal(A.cuttingEdge(a), false, 'the edges go out with the cut');
  assert.deepEqual(A.edgeNotchOfUnit(a), { edge: 'BB', d: 20, h: 120 });
  const no = A.cutEdge(a, 'BB', { d: 5000, h: 120 });
  assert.equal(no.ok, false);
  assert.match(no.said, /^NOTCH: an edge notch must leave/);
  assert.equal(A.removeEdgeCut(a).ok, true);
  assert.equal(A.edgeNotchOfUnit(a), null);
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /data-testid="cut-edge"/);
  assert.match(options, /data-testid="remove-edge-cut"/);
  const ask = read('src/retail/design/detail/EdgeNotchAsk.jsx');
  assert.ok(ask.includes(`data-testid="edge-notch-help">${HELP}</p>`), 'retail\'s CUT EDGE window');
  assert.match(read('src/retail/design/Editors.jsx'), /\{is\('edge-notch'\) && <EdgeNotchAsk args=\{modalArgs\} \/>\}/);
  assert.match(read('scripts/t78-copy.mjs'), /retail: 'src\/retail\/design\/detail\/EdgeNotchAsk\.jsx',\n\s+by: 'T79 F5'/);
});

test('F5 · PRO: CUT EDGE beside CUT CORNER, the window with EDGE, DEPTH, HEIGHT and the help line word for word; licensed in the freeze', () => {
  const pro = read('src/components/RightPanel.jsx');
  assert.match(pro, /data-testid="cut-edge"/);
  assert.match(pro, /\{edgeLit \? 'PICK AN EDGE' : 'CUT EDGE'\}/);
  assert.match(pro, /data-testid="remove-edge-cut"/);
  assert.ok(pro.includes(`data-testid="edge-notch-help">${HELP}</p>`), 'PRO\'s CUT EDGE window');
  for (const e of ['TB', 'BB', 'TF', 'BF']) assert.match(pro, new RegExp(`\\{ id: '${e}', title: '`));
  assert.match(pro, /data-edge-notch-field=\{key\}/);
  assert.match(pro, /<Modal name="edge-notch" title=\{`CUT EDGE \$\{edge\}`\}/);
  assert.match(pro, /<EdgeNotchModal \/>/);
  assert.match(read('test/turn59-f1-the-switch.test.js'), /T79 F5 \. the CUT CORNER row gains a second button, CUT EDGE/);
  assert.doesNotMatch(HELP, /[\u2013\u2014]/);
  for (const rel of ['src/3d/NotchEdges.jsx', 'src/retail/design/detail/EdgeNotchAsk.jsx', 'scripts/t78-classify.d/f34-t79-f05.mjs', 'test/turn79-f05-edge-notch.test.js']) {
    const text = read(rel);
    assert.ok(text.startsWith('/*\n * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.\n'), `${rel} opens with the owner's header`);
    assert.doesNotMatch(text, /[\u2013\u2014]/, `${rel}: no em or en dash`);
  }
});
