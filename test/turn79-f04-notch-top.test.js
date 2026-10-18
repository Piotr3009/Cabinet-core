/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F4 · THE NOTCH FROM THE TOP (a negative height) ────────────────────
//
// The owner, 18.10.2026: *"cut corner ucina nam tylko od dołu a co jeśli
// będziemy chcieli od góry, nie powinno być funkcji -500 na przykład i wtedy
// ucina od góry? i mała informacja o tym."*
//
// LISP first: reference/lisp/KIT_NOTCH.lsp D21 THE TOP-ANCHORED NOTCH and its
// NUMBERS block I2 (BUD 600, notch BL 200 / 200 / -300, board by board);
// src/engine/notch.js mirrors it routine for routine. These assertions are
// that block, read off the engine's real cut, plus the refusal under
// notch.minInterior, the store road, save and reload, the export, and the
// small information (the help line) in PRO and in retail.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as N from '../src/engine/notch.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { ELEMENT_TO_PART_ID } from '../src/engine/partRegistry.js';
import { resultFindings } from '../src/engine/cnc/edgeGuard.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { cutRows } from '../src/engine/drawings/setPaper.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';
import { GATES, LISP } from '../scripts/t78-classify.d/f34-t79-f04.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const K = N.notchProfile(P);
const r2 = (v) => Math.round(v * 10000) / 10000;

const OWNER = 'nie powinno być funkcji -500 na przykład i wtedy ucina od góry? i mała informacja o tym.';
const HELP = 'WIDTH along the back, DEPTH into the carcass, HEIGHT from the floor; 0 runs top to bottom; '
  + 'a negative HEIGHT cuts from the top (e.g. -500).';

// The LISP's case (I2): KIT_BUD_FULL defaults, golden-bud.json's BUD-A with 1 shelf.
const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1 };
const TOP_NOTCH = { corner: 'BL', w: 200, d: 200, h: -300 };
const parent = computeCabinet(BUD, P);
const cut = computeCabinet({ ...BUD, notch: TOP_NOTCH }, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const drillsOf = (r, id, kind) => r.drills.filter((d) => d.panel === id && (!kind || d.kind === kind));
const xs = (list) => [...new Set(list.map((d) => d.x))].sort((a, b) => a - b);
const ys = (list) => [...new Set(list.map((d) => d.y))].sort((a, b) => a - b);
/** A socket's centre is the middle of its two holes (24.5 either side), along x at a given y. */
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

// ═══ THE LISP FIRST ════════════════════════════════════════════════════════

test('F4 · KIT_NOTCH.lsp carries D21 and its NUMBERS block I2; the old refusal is gone from the LISP and the engine', () => {
  const lisp = read('reference/lisp/KIT_NOTCH.lsp');
  assert.match(lisp, /;;; D21 THE TOP-ANCHORED NOTCH\./);
  assert.match(lisp, /;;; I2\. NUMBERS - THE NOTCH FROM THE TOP \(D21, fixtures\/golden-notch-top\.json\)/);
  for (const routine of ['notch-from-top-p (ch nh)', 'notch-floor (ch g nw nd nh)', 'notch-side-fc (corner burFrame top',
    'notch-back-fc (corner top)', 'notch-plinth (cw cd nw nd corner setback pt top', 'notch-crosses-p (cw cd ch g nw nd nh corner rect z0 z1']) {
    assert.ok(lisp.includes(`(defun ${routine}`), `the LISP defines ${routine}`);
  }
  // The old refusal is named in a comment where it stood; no routine says it any more.
  assert.doesNotMatch(lisp, /"NOTCH: the height cannot be below 0/);
  assert.doesNotMatch(read('src/engine/notch.js'), /'NOTCH: the height cannot be below 0/);
  assert.doesNotMatch(lisp, /[^\x00-\x7f]/, 'the LISP stays ASCII');
  // The licence in the F's fragment quotes the owner, word for word as CLAUDE.md writes him.
  assert.ok(LISP['reference/lisp/KIT_NOTCH.lsp'].includes(OWNER));
});

test('F4 · the anchor is the sign: full, from the floor, from the top (section B, D21)', () => {
  assert.equal(N.notchFullP(770, 0), true);
  assert.equal(N.notchFullP(770, -770), true, '|nh| at or over the carcass is full height, either way');
  assert.equal(N.notchFullP(770, -300), false);
  assert.equal(N.notchFromTopP(770, -300), true);
  assert.equal(N.notchFromTopP(770, 300), false);
  assert.equal(N.notchFromTopP(770, 0), false);
  assert.equal(N.notchFromTopP(770, -800), false, 'full height is not "from the top"');
  assert.equal(N.notchHh(770, -300), 300);
  assert.equal(N.notchHh(770, 300), 300);
  assert.equal(N.notchHh(770, 0), 770);
  // The corner name takes y1 for y0 from the top, in every frame.
  assert.equal(N.notchSideFc('BL', false, true), 'x1y1');
  assert.equal(N.notchSideFc('BL', false), 'x1y0', 'the floor notch as before');
  assert.equal(N.notchSideFc('BR', true, true), 'x0y1');
  assert.equal(N.notchSideFc('FL', false, true), 'x0y1');
  assert.equal(N.notchBackFc('BL', true), 'x0y1');
  assert.equal(N.notchBackFc('BR', true), 'x1y1');
  assert.equal(N.notchBackFc('BL'), 'x0y0');
  // notchOf says so.
  assert.equal(N.notchOf({ notch: TOP_NOTCH }, P).anchor, 'top');
  assert.equal(N.notchOf({ notch: { ...TOP_NOTCH, h: 0 } }, P).anchor, undefined);
});

// ═══ NUMBERS (I2), BOARD BY BOARD, ON THE ENGINE'S REAL CUT ════════════════

test('F4 · NUMBERS: BUL loses its rear TOP corner; BUR is the parent\'s', () => {
  assert.equal(refusalOf(cut), null, JSON.stringify(cut.warnings));
  assert.deepEqual(N.notchSide(558, 770, 18, 200, 200, -300, 'BL'),
    [[0, 0], [540, 0], [540, 470], [340, 470], [340, 770], [0, 770]]);
  const bul = panelOf(cut, 'BUL');
  assert.deepEqual([bul.w, bul.h], [540, 770], 'a part-height side keeps its length');
  assert.deepEqual(bul.cnc.notch, { fc: 'x1y1', nw: 200, nh: 300 });
  assert.deepEqual(bul.meta.notch.outline, [[0, 0], [540, 0], [540, 470], [340, 470], [340, 770], [0, 770]]);
  assert.equal(r2(bul.area_m2 * 1e6), 355800, 'BUL 0.4158 -> 0.3558 m2');
  assert.deepEqual(bul.cnc.marks, [{ layer: 'CORNER_4MM', from: [380, 470], to: [340, 510], pts: [[380, 470], [340, 470], [340, 510]] }]);
  assert.deepEqual(panelOf(cut, 'BUR'), panelOf(parent, 'BUR'));
});

test('F4 · NUMBERS: the TOP is cut instead of the BOTTOM, by section I\'s numbers; the BOTTOM is the parent\'s', () => {
  const top = panelOf(cut, 'TOP');
  assert.deepEqual(top.meta.notch.outline, [[0, 0], [564, 0], [564, 540], [200, 540], [200, 340], [0, 340]]);
  assert.deepEqual(top.cnc.notch, { fc: 'x0y1', nw: 200, nh: 200 }, 'drawn from its underside (D11)');
  assert.equal(r2(top.area_m2 * 1e6), 264560);
  assert.deepEqual(top.cnc.marks, [{ layer: 'CORNER_4MM', from: [200, 404], to: [160, 364], pts: [[200, 404], [200, 364], [160, 364]] }]);
  assert.deepEqual(panelOf(cut, 'BOTTOM'), panelOf(parent, 'BOTTOM'));
  // The TOP's tabs, re-planned (notch-top-joints, unchanged): into BUL 95 245, into BUR 95 445, into the BACK 295 469.
  assert.deepEqual(N.notchTopJoints(600, 558, 18, 200, 200, 'BL', K), { LEFT: [95, 245], RIGHT: [95, 445], BACK: [295, 469] });
});

test('F4 · NUMBERS: the BACK loses its top-left corner', () => {
  assert.deepEqual(N.notchBack(600, 770, 200, -300, 'BL'), [[0, 0], [600, 0], [600, 770], [200, 770], [200, 470], [0, 470]]);
  const back = panelOf(cut, 'BACK');
  assert.deepEqual([back.w, back.h], [600, 770]);
  assert.deepEqual(back.cnc.notch, { fc: 'x0y1', nw: 200, nh: 300 });
  assert.deepEqual(back.cnc.outline, [[0, 0], [600, 0], [600, 770], [200, 770], [200, 470], [0, 470]]);
  assert.equal(r2(back.area_m2 * 1e6), 402000, 'BACK 0.462 -> 0.402 m2');
  assert.deepEqual(back.cnc.marks, [{ layer: 'CORNER_4MM', from: [200, 510], to: [160, 470], pts: [[200, 510], [200, 470], [160, 470]] }]);
});

test('F4 · NUMBERS: the box is RETURN, STEP and FLOOR, hanging from the top; no LID', () => {
  assert.deepEqual(N.notchBoxPlaces(600, 558, 770, 18, 200, 200, -300, 'BL'), {
    RETURN: [200, 358, 470, 218, 540, 770],
    STEP: [0, 340, 470, 218, 358, 770],
    FLOOR: [18, 340, 452, 218, 540, 470],
  });
  assert.deepEqual(N.notchFloor(770, 18, 200, 200, -300), [200, 200]);
  assert.equal(N.notchLid(770, 18, 200, 200, -300), null);
  assert.equal(N.notchFloor(770, 18, 200, 200, 300), null, 'a floor notch has a LID, not a FLOOR');
  assert.deepEqual(cut.derived.notch.boards, ['RETURN', 'STEP', 'FLOOR']);
  assert.equal(cut.derived.notch.anchor, 'top');
  const ret = panelOf(cut, 'RETURN');
  const step = panelOf(cut, 'STEP');
  const floor = panelOf(cut, 'FLOOR');
  assert.deepEqual([ret.w, ret.h, ret.part], [182, 300, 'NOTCH-RETURN']);
  assert.deepEqual(ret.box, { x: 200, y: 470, z: 18, w: 18, h: 300, d: 182 });
  assert.deepEqual([step.w, step.h, step.part], [218, 300, 'NOTCH-STEP']);
  assert.deepEqual(step.box, { x: 0, y: 470, z: 200, w: 218, h: 300, d: 18 });
  assert.deepEqual([floor.w, floor.h, floor.part], [200, 200, 'NOTCH-FLOOR']);
  assert.deepEqual(floor.box, { x: 18, y: 452, z: 18, w: 200, h: 18, d: 200 });
  assert.equal(floor.meta.readiness, 'geometry');
  assert.equal(floor.meta.fixing, 'manual');
  assert.deepEqual(floor.meta.notch.screws, [], 'no screw is stated for the box (D10)');
  assert.equal(panelOf(cut, 'LID'), undefined);
  assert.equal(ELEMENT_TO_PART_ID['NOTCH-FLOOR'], 'carcase_horizontal');
  // The cut list lists the three.
  assert.deepEqual(cutRows(cut).carcass.filter((r) => /NOTCH-/.test(r.part)).map((r) => [r.id, r.w, r.h]),
    [['RETURN', 182, 300], ['STEP', 218, 300], ['FLOOR', 200, 200]]);
});

test('F4 · NUMBERS: SHELF-1 under the FLOOR is the parent\'s; a shelf whose top rises past 452 is cut', () => {
  assert.deepEqual(panelOf(cut, 'SHELF-1'), panelOf(parent, 'SHELF-1'), 'its top face 403 is under the FLOOR\'s underside 452');
  assert.equal(N.notchShelfCrossesP(434, 18, 770, -300), false, '434 + 18 = 452: it touches, it does not cross');
  assert.equal(N.notchShelfCrossesP(435, 18, 770, -300), true);
  assert.equal(N.notchShelfCrossesP(317, 18, 770, 300), true, 'the floor notch as before: under the LID\'s top (318)');
  assert.equal(N.notchShelfCrossesP(318, 18, 770, 300), false);
  // 400 down from the top: the FLOOR's underside is 352, the shelf at 385 crosses and takes section I's outline.
  const deep = computeCabinet({ ...BUD, notch: { ...TOP_NOTCH, h: -400 } }, P);
  assert.equal(refusalOf(deep), null);
  assert.deepEqual(panelOf(deep, 'SHELF-1').meta.notch.outline, [[0, 0], [560, 0], [560, 520], [200, 520], [200, 320], [0, 320]]);
  assert.deepEqual(panelOf(deep, 'SHELF-1').cnc.marks.map((m) => m.layer), ['CORNER_4MM']);
});

test('F4 · NUMBERS: which joints move (I2 WHICH JOINTS MOVE), routine and real drills', () => {
  const sj = N.notchSideJoints(558, 770, 18, 200, 200, -300, 'BL', K);
  assert.deepEqual(sj, {
    'TOP-SOCKETS': [95, 245],
    'BOTTOM-SOCKETS': [95, 445],
    'TOP-SCREWS': [50, 170, 290],
    'BOTTOM-SCREWS': [50, 270, 490],
    'BACK-TABS': [95, 375],
    'PIN-COLUMNS': [70, 270],
  });
  // ...and on BUL itself: the top row re-planned, the bottom row the parent's.
  assert.deepEqual(socketXs(drillsOf(cut, 'BUL', 'puzzle'), 762), [95, 245]);
  assert.deepEqual(socketXs(drillsOf(cut, 'BUL', 'puzzle'), 8), [95, 445]);
  assert.deepEqual(xs(drillsOf(cut, 'BUL', 'screw').filter((d) => d.y === 761)), [50, 170, 290]);
  assert.deepEqual(xs(drillsOf(cut, 'BUL', 'screw').filter((d) => d.y === 9)), [50, 270, 490]);
  const tabBones = panelOf(cut, 'BUL').cnc.pockets.filter((pk) => pk.layer === P.puzzle.layers.dogbone).map((pk) => (pk.y1 + pk.y2) / 2);
  assert.deepEqual(tabBones, [95, 375], 'the back-edge tabs planned on the run UNDER the notch, 0 .. 470');
  const bj = N.notchBackJoints(600, 770, 18, 200, -300, 'BL', K);
  assert.deepEqual(bj['FAR-SOCKETS'], [95, 385, 675]);
  assert.deepEqual(bj['NEAR-SOCKETS'], [95, 375]);
  assert.deepEqual(bj['TOP-SOCKETS'], [313, 487]);
  assert.deepEqual(bj['BOTTOM-SOCKETS'], [113, 487]);
  // T79 F6 (KIT_NOTCH.lsp D10 amended, 18.10.2026; the owner: *"to trzeba będzie
  // dodać ... ale tylko na plecach"*): beside the notch the row into the
  // RETURN's end (x 209), under it the row into the FLOOR's back edge (y 461).
  assert.deepEqual(bj.SCREWS, [
    [591, 50], [591, 240], [591, 530], [591, 720],
    [9, 50], [9, 235], [9, 420],
    [209, 520], [209, 620], [209, 720],
    [68, 461], [109, 461], [150, 461],
    [268, 761], [400, 761], [532, 761],
    [68, 9], [300, 9], [532, 9],
  ]);
  // ...and on the BACK itself.
  const puzzle = drillsOf(cut, 'BACK', 'puzzle');
  assert.deepEqual(socketYs(puzzle, 8), [95, 375], 'the notch edge');
  assert.deepEqual(socketYs(puzzle, 592), [95, 385, 675], 'the far edge');
  assert.deepEqual(socketXs(puzzle, 762), [313, 487], 'the top edge');
  assert.deepEqual(socketXs(puzzle, 8), [113, 487], 'the bottom edge, the parent\'s');
  assert.deepEqual(drillsOf(cut, 'BACK', 'screw').map((d) => [d.x, d.y]), bj.SCREWS);
});

// The block itself, read as text: every number I2 states is the number the engine cuts, so the LISP and the
// mirror cannot drift apart unseen (the assertions above hold the engine to literals; this holds the LISP to the engine).
test('F4 · the LISP\'s own I2 block, line by line, is the engine\'s cut (outlines, marks, areas, the box, the joints, the room)', () => {
  const lisp = read('reference/lisp/KIT_NOTCH.lsp');
  const from = lisp.indexOf(';;; I2. NUMBERS - THE NOTCH FROM THE TOP');
  // T79 F6: the block I3 (the BACK's rows round the box) stands between I2 and J; I2 ends where it starts.
  const i3 = lisp.indexOf(';;; I3. NUMBERS', from);
  const to = i3 > from ? i3 : lisp.indexOf(';;; J. DRAWING', from);
  assert.ok(from > 0 && to > from, 'the I2 block stands before section J');
  const lines = lisp.slice(from, to).split('\n').map((l) => l.replace(/^;;;\s?/, ''));
  const prose = lines.join(' ').replace(/\s+/g, ' ');
  const pts = (list) => list.map(([x, y]) => `(${r2(x)} ${r2(y)})`).join(' ');
  const arrow = (list) => list.map(([x, y]) => `(${r2(x)} ${r2(y)})`).join(' -> ');
  const csv = (list) => list.map(r2).join(', ');
  const say = (s) => assert.ok(prose.includes(s), `I2 states ${s}`);
  // A row of WHICH JOINTS MOVE: its label, then the PARENT and the NOTCHED columns (two or more spaces apart).
  const row = (label) => {
    const cols = lines.map((l) => l.trim().split(/\s{2,}/)).find((c) => c[0] === label);
    assert.ok(cols, `I2 has the row ${label}`);
    return cols;
  };
  const held = (label, was, now) => {
    const [, p, n] = row(label);
    assert.equal(p, csv(was), `${label}: the parent's column`);
    assert.equal(n, csv(now), `${label}: the notched column`);
  };
  const bul = panelOf(cut, 'BUL');
  const top = panelOf(cut, 'TOP');
  const back = panelOf(cut, 'BACK');
  // THE BOARDS.
  const [kx0, ky0, kx1, ky1] = N.notchKeepout(600, 558, 18, 200, 200, 'BL', 0);
  say(`KEEP-OUT (plan): x ${r2(kx0)}..${r2(kx1)}, y ${r2(ky0)}..${r2(ky1)}`);
  say(pts(bul.meta.notch.outline));
  say(arrow(bul.cnc.marks[0].pts));
  say(`(${r2(bul.area_m2 * 1e6)} mm2)`);
  say(pts(top.meta.notch.outline));
  say(arrow(top.cnc.marks[0].pts));
  say(`(${r2(top.area_m2 * 1e6)} mm2)`);
  // The TOP drawn from its underside (D11): the plan turned onto its drawing (notchRot90Pts) and read from below,
  // the same closed walk the LISP lists, from whichever vertex it starts.
  const drawn = N.notchRot90Pts(top.meta.notch.outline, 540).map(([x, y]) => [x, 564 - y]);
  const listed = [[200, 564], [200, 364], [0, 364], [0, 0], [540, 0], [540, 564]];
  say(`drawn from its UNDERSIDE (D11): ${pts(listed)}`);
  const at = drawn.findIndex(([x, y]) => x === listed[0][0] && y === listed[0][1]);
  assert.ok(at >= 0, 'the LISP\'s first vertex is on the engine\'s TOP');
  const turned = [...drawn.slice(at), ...drawn.slice(0, at)];
  assert.ok(JSON.stringify(turned) === JSON.stringify(listed)
    || JSON.stringify([turned[0], ...turned.slice(1).reverse()]) === JSON.stringify(listed), 'the TOP\'s drawn walk');
  for (const [x, y] of listed) {
    assert.ok(top.cnc.outline.some(([a, b]) => Math.abs(a - x) < 1e-6 && Math.abs(b - y) < 1e-6), `(${x} ${y}) is a vertex of the cut TOP`);
  }
  say(pts(back.cnc.outline));
  say(arrow(back.cnc.marks[0].pts));
  say(`(${r2(back.area_m2 * 1e6)} mm2)`);
  const places = N.notchBoxPlaces(600, 558, 770, 18, 200, 200, -300, 'BL');
  for (const id of ['STEP', 'RETURN', 'FLOOR']) {
    const p = panelOf(cut, id);
    const [x0, y0, z0, x1, y1, z1] = places[id];
    say(`${id} - ${r2(p.w)} x ${r2(p.h)}, carcass x ${r2(x0)}..${r2(x1)}, y ${r2(y0)}..${r2(y1)}, z ${r2(z0)}..${r2(z1)}`);
  }
  say(`its top face (${r2(panelOf(cut, 'SHELF-1').box.y + 18)}) is under the FLOOR's underside (${r2(panelOf(cut, 'FLOOR').box.y)})`);
  // WHICH JOINTS MOVE.
  const bulP = drillsOf(parent, 'BUL', 'puzzle');
  const bulC = drillsOf(cut, 'BUL', 'puzzle');
  held('BUL top sockets (x from front)', socketXs(bulP, 762), socketXs(bulC, 762));
  held('BUL bottom sockets', socketXs(bulP, 8), socketXs(bulC, 8));
  const scrAt = (r, id, y) => xs(drillsOf(r, id, 'screw').filter((d) => d.y === y));
  held('BUL top screw row', scrAt(parent, 'BUL', 761), scrAt(cut, 'BUL', 761));
  held('BUL bottom screw row', scrAt(parent, 'BUL', 9), scrAt(cut, 'BUL', 9));
  const tabsOf = (r) => panelOf(r, 'BUL').cnc.pockets.filter((pk) => pk.layer === P.puzzle.layers.dogbone).map((pk) => (pk.y1 + pk.y2) / 2);
  held('BUL back-edge tabs (y)', tabsOf(parent), tabsOf(cut));
  const sj = N.notchSideJoints(558, 770, 18, 200, 200, -300, 'BL', K);
  held('BUL shelf-pin columns', N.notchPinColumns(540, N.notchP(K, 'shelfHoles.columnFromEdge')), sj['PIN-COLUMNS']);
  // The TOP's tabs, in the LISP's plan frame (before D11 reads it from below): into BUL along one long edge,
  // into BUR along the other, into the BACK along the back edge (the drawn x = -9 edge, y read back as 564 - y).
  const tj = N.notchTopJoints(600, 558, 18, 200, 200, 'BL', K);
  const topBones = (r, pick) => panelOf(r, 'TOP').cnc.pockets.filter((pk) => pk.layer === P.puzzle.layers.dogbone)
    .map((pk) => [(pk.x1 + pk.x2) / 2, (pk.y1 + pk.y2) / 2]).filter(pick);
  const intoBack = (r) => topBones(r, ([x]) => x < 0).map(([, y]) => 564 - y).sort((a, b) => a - b);
  assert.equal(row('TOP tabs into BUL (y)')[2], csv(tj.LEFT));
  assert.equal(row('TOP tabs into BUR (y)')[2], csv(tj.RIGHT));
  held('TOP tabs into BACK (x)', intoBack(parent), intoBack(cut));
  assert.deepEqual(intoBack(cut), tj.BACK);
  const backP = drillsOf(parent, 'BACK', 'puzzle');
  const backC = drillsOf(cut, 'BACK', 'puzzle');
  held('BACK sockets, notch edge (y)', socketYs(backP, 8), socketYs(backC, 8));
  held('BACK sockets, far edge (y)', socketYs(backP, 592), socketYs(backC, 592));
  held('BACK top sockets (carcass x)', socketXs(backP, 762), socketXs(backC, 762));
  held('BACK bottom sockets', socketXs(backP, 8), socketXs(backC, 8));
  held('BACK top screw row (y 761)', scrAt(parent, 'BACK', 761), scrAt(cut, 'BACK', 761));
  held('BACK bottom screw row (y 9)', scrAt(parent, 'BACK', 9), scrAt(cut, 'BACK', 9));
  const colAt = (r, x) => ys(drillsOf(r, 'BACK', 'screw').filter((d) => d.x === x));
  assert.equal(row('BACK side screw rows (y)')[1], csv(colAt(parent, 9)));
  assert.deepEqual(colAt(cut, 591), colAt(parent, 591), 'the far edge (x 591) unchanged');
  say(`notch edge (x 9): ${csv(colAt(cut, 9))} (the run under the notch)`);
  // THE ROOM UNDER IT: the deepest the engine accepts is the number I2 names, and its sentence is the engine's.
  let deepest = 0;
  for (let a = 1; a < 770; a += 1) if (N.notchRefusal(600, 558, 770, 18, 200, 200, -a, 'BL', K) === null) deepest = a;
  say(`|nh| may run to ${deepest} (770 - ${deepest} - 36 = 100)`);
  say(`"${N.notchRefusal(600, 558, 770, 18, 200, 200, -(deepest + 1), 'BL', K)}"`);
});

test('F4 · the legs stay, the plinth stays, the keep-out reads the top (D21)', () => {
  assert.deepEqual(cut.assemblies.legs.positions, parent.assemblies.legs.positions, 'a notch from the top has no footprint on the floor');
  assert.deepEqual(N.notchPlinth(600, 558, 200, 200, 'FL', 50, 18, true), [0, 600]);
  assert.deepEqual(N.notchPlinth(600, 558, 200, 200, 'FL', 50, 18), [200, 600], 'the floor notch as before');
  const front = computeCabinet({ ...BUD, hinge: 'R', plinth: true, notch: { corner: 'FL', w: 200, d: 200, h: -300 } }, P);
  assert.equal(refusalOf(front), null, JSON.stringify(front.warnings));
  assert.equal(panelOf(front, 'PLINTH').w, 600, 'the plinth is whole under a front notch from the top');
  // An object in the keep-out's plan: under the FLOOR it is clear, rising past its underside it crosses.
  const rect = [50, 400, 150, 500];
  assert.equal(N.notchCrossesP(600, 558, 770, 18, 200, 200, -300, 'BL', rect, 0, 452), false);
  assert.equal(N.notchCrossesP(600, 558, 770, 18, 200, 200, -300, 'BL', rect, 0, 453), true);
  assert.equal(N.notchCrossesP(600, 558, 770, 18, 200, 200, 300, 'BL', rect, 317, 500), true, 'the floor notch as before');
  assert.equal(N.notchCrossesP(600, 558, 770, 18, 200, 200, 300, 'BL', rect, 318, 500), false);
});

// ═══ ROOM REFUSES FIRST ════════════════════════════════════════════════════

test('F4 · the room under the cut: |h| must leave notch.minInterior (100) under it, refused in words', () => {
  const SAID = 'NOTCH: a notch from the top must leave 100 mm of the interior under it. Make it shorter, or make it full height.';
  assert.equal(N.notchP(K, 'notch.minInterior'), 100);
  assert.equal(N.notchRefusal(600, 558, 770, 18, 200, 200, -634, 'BL', K), null, '770 - 634 - 36 = 100');
  assert.equal(N.notchRefusal(600, 558, 770, 18, 200, 200, -635, 'BL', K), SAID);
  // Unboxed (a rebate, no FLOOR) counts the BOTTOM only.
  assert.equal(N.notchRefusal(600, 558, 770, 18, 10, 40, -652, 'FR', K), null, '770 - 652 - 18 = 100');
  assert.equal(N.notchRefusal(600, 558, 770, 18, 10, 40, -653, 'FR', K), SAID);
  // Through the engine: refused, the parent is what is cut, the sentence travels (Check #28).
  const no = computeCabinet({ ...BUD, notch: { ...TOP_NOTCH, h: -635 } }, P);
  assert.equal(refusalOf(no)?.message, SAID);
  assert.deepEqual(no.panels, parent.panels);
  assert.deepEqual(no.drills, parent.drills);
  const yes = computeCabinet({ ...BUD, notch: { ...TOP_NOTCH, h: -634 } }, P);
  assert.equal(refusalOf(yes), null);
  assert.equal(panelOf(yes, 'FLOOR').box.y, 100 + 18, 'the FLOOR\'s underside 100 over the BOTTOM\'s top face');
  // The mirror of "the back edge above the notch cannot hold a tab", when the profile keeps less room.
  const lean = { ...K, 'notch.minInterior': 0 };
  assert.equal(N.notchRefusal(600, 558, 770, 18, 200, 200, -700, 'BR', lean),
    'NOTCH: the back edge of BUR under the notch cannot hold a tab. Make it shorter, or make it full height.');
  // The floor notch's refusals are what they were.
  assert.match(N.notchRefusal(600, 558, 770, 18, 200, 200, 740, 'BR', K), /LID room under the TOP/);
  assert.match(N.notchRefusal(600, 558, 770, 18, 200, 200, 700, 'BR', K), /back edge of BUR above the notch cannot hold a tab/);
});

test('F4 · a hinge in a front notch from the top is refused as at the floor (D7, the corner at the top)', () => {
  const r = computeCabinet({ ...BUD, notch: { corner: 'FL', w: 200, d: 200, h: -300 } }, P);
  const w = refusalOf(r);
  assert.ok(w, 'the top hinge row stands in a front-left notch from the top');
  assert.equal(w.message, N.notchHoleRefusal('hinge', 'BUL'));
  assert.deepEqual(r.panels, parent.panels);
});

test('F4 · every corner and three kits from the top: no outline fault, no export-gate fault', () => {
  const cases = [
    ['BUD', { corner: 'BL', w: 200, d: 200, h: -300 }, {}],
    ['BUD', { corner: 'BR', w: 200, d: 200, h: -300 }, { hinge: 'L' }],
    ['BUD', { corner: 'FR', w: 200, d: 100, h: -250 }, { hinge: 'L' }],
    ['BUD', { corner: 'BR', w: 10, d: 40, h: -50 }, {}],
    ['WARDROBE', { corner: 'BL', w: 300, d: 250, h: -400 }, {}],
    ['WUD', { corner: 'BL', w: 200, d: 150, h: -200 }, {}],
  ];
  for (const [type, notch, extra] of cases) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', shelves: 1, ...extra, notch }, P);
    const said = `${type} ${JSON.stringify(notch)}`;
    assert.equal(refusalOf(r), null, `${said} refused: ${JSON.stringify(r.warnings)}`);
    assert.equal(r.derived.notch.anchor, 'top', said);
    assert.deepEqual(resultFindings(r), [], `${said}: outline faults`);
    assert.deepEqual(unitFindings(r, { profile: P }), [], `${said}: export gate`);
  }
  // An unboxed rebate from the top stands at the top of the side's outer face.
  const reb = computeCabinet({ ...BUD, notch: { corner: 'BR', w: 10, d: 40, h: -50 } }, P);
  assert.deepEqual(panelOf(reb, 'BUR').meta.notch.rebate, [0, 720, 40, 770, 10]);
  assert.equal(panelOf(reb, 'RETURN'), undefined, 'a rebate is not boxed');
});

test('F4 · THE WALL UNIT, a beam over it: the hanger holes step forward with the shortened side, the cut-out steps in', () => {
  const base = { ...defaultParamsFor('WUD', P), unit_num: '05' }; // 600 x 720 x 400
  const r = computeCabinet({ ...base, notch: { corner: 'BL', w: 200, d: 150, h: -200 } }, P);
  assert.equal(refusalOf(r), null, JSON.stringify(r.warnings));
  assert.deepEqual(r.derived.notch.boards, ['RETURN', 'STEP', 'FLOOR']);
  assert.deepEqual(r.drills.filter((d) => d.kind === 'hanger' && d.panel === 'BUL').map((d) => [d.x, d.y]), [[211, 667], [179, 667]],
    '21 and 53 off the notch\'s face (382 - 150 - 21, 382 - 150 - 53), never dropped');
  assert.deepEqual(r.drills.filter((d) => d.kind === 'hanger' && d.panel === 'BUR').map((d) => [d.x, d.y]), [[21, 667], [53, 667]]);
  assert.deepEqual(r.panels.find((p) => p.id === 'BACK').cnc.pockets.filter((k) => k.layer === 'HANGER_HOLE').map((k) => [k.x1, k.y1, k.x2, k.y2]),
    [[200, 662, 230, 720], [570, 662, 600, 720]], 'the left cut-out beside the notch, on the board that is there');
  // The pure routine, a y1 corner: reached from the top, not from the floor.
  const cuts = [{ layer: 'HANGER_HOLE', x1: 0, y1: 662, x2: 30, y2: 720 }, { layer: 'HANGER_HOLE', x1: 570, y1: 662, x2: 600, y2: 720 }];
  assert.deepEqual(N.notchHangerCutouts(cuts, 'HANGER_HOLE', 600, 720, 200, 50, 'x0y1').map((k) => [k.x1, k.x2]), [[200, 230], [570, 600]]);
  assert.deepEqual(N.notchHangerCutouts(cuts, 'HANGER_HOLE', 600, 720, 200, 50, 'x0y0').map((k) => [k.x1, k.x2]), [[0, 30], [570, 600]], 'the floor notch 50 high does not reach it');
});

// ═══ THE DRAWING, THE EXPORT, THE 3-D ══════════════════════════════════════

test('F4 · the CNC export: the TOP, BUL and the BACK carry their L and one CORNER_4MM mark; the box boards are plain outlines', () => {
  const files = buildUnitDxfFiles(cut, P);
  const marksOf = (id) => files.find((f) => f.panelId === id).entities.filter((e) => e.layer === 'CORNER_4MM');
  assert.deepEqual(marksOf('TOP'), [{ type: 'poly', layer: 'CORNER_4MM', closed: false, pts: [[200, 404], [200, 364], [160, 364]] }]);
  assert.equal(marksOf('BUL').length, 1);
  assert.equal(marksOf('BACK').length, 1);
  assert.equal(marksOf('BOTTOM').length, 0, 'the BOTTOM is whole');
  for (const id of ['RETURN', 'STEP', 'FLOOR']) assert.ok(files.some((f) => f.panelId === id), `${id} has no DXF`);
});

test('F4 · the 3-D cuts the corner the engine states: BUL at x1y1, the TOP and the BACK at x0y1', () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.deepEqual(N.cutNotchCorner(sq, 10, 10, { fc: 'x0y1', nw: 4, nh: 3 }), [[0, 0], [10, 0], [10, 10], [4, 10], [4, 7], [0, 7]]);
  for (const id of ['BUL', 'TOP', 'BACK']) {
    const { solid } = panelSolids(panelOf(cut, id), P.puzzle.layers, P, cut.drills);
    assert.ok(solid, `${id} rendered as a plain box`);
  }
  assert.match(read('src/3d/panelSolid.js'), /const shaped = notch \? cutNotchCorner\(outline, w, h, notch\) : outline;/,
    'the 3-D reads the corner from cnc.notch.fc, nothing else');
});

// ═══ THE GOLDENS AND THE GATE ══════════════════════════════════════════════

test('F4 · golden-notch-top.json is the cut, byte for byte; golden-notch.json and the six hold; the gate opens on h < 0 only', () => {
  const file = JSON.parse(read('fixtures/golden-notch-top.json'));
  assert.deepEqual(file.params.notch, TOP_NOTCH);
  assert.equal(file.params.shelves, 1);
  assert.deepEqual(goldenOf(file.params, P), file.expected);
  const old = JSON.parse(read('fixtures/golden-notch.json'));
  assert.deepEqual(goldenOf(old.params, P), old.expected, 'the full-height notch is what it was');
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(head[id].sha256, base[id].sha256, id);
  assert.equal(GATES.notchTop.opens(file.params), true);
  assert.equal(GATES.notchTop.opens(old.params), false, 'h 0');
  assert.equal(GATES.notchTop.opens({ ...BUD, notch: { ...TOP_NOTCH, h: 300 } }), false, 'h 300');
  assert.equal(GATES.notchTop.opens(BUD), false, 'no notch');
});

// ═══ THE STORE, SAVE AND RELOAD, THE TWO WINDOWS ═══════════════════════════

function aKitchen() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUD');
  return S().units[0].id;
}
const unitOf = (id) => S().units.find((u) => u.id === id);

test('F4 · setUnitNotch keeps a negative HEIGHT, refuses one with no room under it, and the reload cuts it again', () => {
  const id = aKitchen();
  const res = S().setUnitNotch(id, { corner: 'BL', w: 200, d: 200, h: -300 });
  assert.equal(res.ok, true, res.said);
  assert.deepEqual(unitOf(id).params.notch, { corner: 'BL', w: 200, d: 200, h: -300 });
  const r = S().unitResult(id);
  assert.ok(r.panels.some((p) => p.id === 'FLOOR'));
  assert.equal(r.panels.find((p) => p.id === 'TOP').cnc.notch.fc, 'x0y1');
  // Refused in the engine's words, and not kept.
  const no = S().setUnitNotch(id, { corner: 'BL', w: 200, d: 200, h: -700 });
  assert.equal(no.ok, false);
  assert.match(no.said, /a notch from the top must leave 100 mm of the interior under it/);
  assert.equal(unitOf(id).params.notch.h, -300, 'a refused notch was kept');
  // Save and reload.
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  const before = S().unitResult(id).csvLines;
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(unitOf(id).params.notch, { corner: 'BL', w: 200, d: 200, h: -300 });
  assert.deepEqual(S().unitResult(id).csvLines, before);
  assert.ok(before.some((l) => /,FLOOR,/.test(l)), 'the FLOOR is on the cut list');
});

test('F4 · retail: the adapter cuts from the top; the window says so', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = A.addFirstWardrobe();
  const yes = A.cutCorner(a, 'BL', { w: 200, d: 200, h: -300 });
  assert.equal(yes.ok, true, yes.said);
  assert.equal(A.notchOfUnit(a).h, -300);
  assert.ok(S().unitResult(a).panels.some((p) => p.id === 'FLOOR'));
  A.removeCornerCut(a);
});

test('F4 · the small information: the help line, word for word, in PRO and in retail; HEIGHT shows a negative number', () => {
  const pro = read('src/components/RightPanel.jsx');
  assert.ok(pro.includes(`data-testid="notch-help">${HELP}</p>`), 'PRO\'s CUT CORNER window');
  assert.match(pro, /function notchHeightText\(h\) \{ return Number\(h\) \? String\(Math\.round\(Number\(h\)\)\) : 'full'; \}/);
  const retail = read('src/retail/design/detail/NotchAsk.jsx');
  assert.ok(retail.includes(`data-testid="notch-help">${HELP}</p>`), 'retail\'s CUT CORNER window');
  assert.match(retail, /const heightText = \(h\) => \(Number\(h\) \? String\(Math\.round\(Number\(h\)\)\) : 'full'\);/);
  assert.doesNotMatch(HELP, /[\u2013\u2014]/);
  // Licensed: PRO in the freeze, retail as a named hand edit (NotchAsk.jsx is retail's own, not a copy).
  assert.match(read('test/turn59-f1-the-switch.test.js'), /T79 F4 \. the CUT CORNER window/);
  assert.match(read('scripts/t78-copy.mjs'), /retail: 'src\/retail\/design\/detail\/NotchAsk\.jsx',\n\s+by: 'T79 F4'/);
});
