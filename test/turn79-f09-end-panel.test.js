/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F9 · THE END PANEL FOLLOWS ITS SIDE INTO THE RECESS AND THE NOTCH ──
//
// The owner, 18.10.2026: *"nie wycina mi panelu bocznego do recess a powinno."*
//
// PROBE first (verify/t79/f09-probe.md): the END panel was a plain rectangle
// beside every cut, the band never told the engine it reached past it, and
// wholly inside a recess it came out 596 deep at z 0..596 beside a carcass at
// z 18..858. LISP first: KIT_NOTCH.lsp D23 (section H3, NUMBERS I4) and
// KIT_RECESS.lsp D21 (section D, NUMBERS F2); src/engine mirrors them routine
// for routine and cuts them in ONE pass (extension.js endPanelsFollowSides).
// These assertions are the probe's rows turned round, the routines held to
// the LISP, the NUMBERS blocks read off the engine's cut, the END's outline
// against its side's in each case, the wholly-inside depth, the BOM, the
// drawing and the export, the 3-D, save and reload, the goldens and the gate.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as N from '../src/engine/notch.js';
import * as X from '../src/engine/extension.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { resultFindings } from '../src/engine/cnc/edgeGuard.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { partDetailDrawing } from '../src/engine/drawings/partDetail.js';
import { cutRows } from '../src/engine/drawings/setPaper.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';
import { GATES, LISP, GOLDENS, LIVENESS } from '../scripts/t78-classify.d/f34-t79-f09.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const OWNER = 'nie wycina mi panelu bocznego do recess a powinno.';

// The LISP's parent (I4, F2): KIT_BUD_FULL defaults, 1 shelf, END panels 25 thick to the floor.
const kit = (extra = {}) => ({ ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1, ...extra });
const EPL = { id: 'ep-l', side: 'L', height: 'floor', thickness: 25 };
const EPR = { id: 'ep-r', side: 'R', height: 'floor', thickness: 25 };
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const cut = (extra) => computeCabinet(kit(extra), P);
const NOTCH = { corner: 'BL', w: 200, d: 200, h: 300 };
const BAND = { x0: 310, x1: 600, z0: 210, z1: 590, d: 150, ends: ['R'] };
const r4 = (v) => Math.round(v * 10000) / 10000;

// ═══ THE PROBE'S ROWS, TURNED ROUND (store-built, as the probe was) ═════════

function roomWith(recess) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  if (recess) S().addWallSlope({ kind: 'recess', wall: 0, ...recess });
  const a = S().addUnit('BUD', { wall: 0, x: 900 });
  assert.equal(a.error, null, a.error);
  S().moveUnit(a.id, 900, 1);
  return a.id;
}

test('F9 · probe rows 1 to 9: partly in the band, END-R grows with BUR where the band reaches past it, and only there', () => {
  // Row 4: a recess x 1300..2300, 300 deep, floor to ceiling: END-R reaches the recess back (z -310).
  let id = roomWith({ x_mm: 1300, width: 1000, depth: 300 });
  assert.equal(S().addEndPanel(id, { side: 'R' }).error, null);
  let r = S().unitResult(id);
  assert.deepEqual(r.derived.extension.ends, ['R'], 'row 9: the room tells the engine the band reaches past END-R');
  assert.deepEqual(panelOf(r, 'BUR').box.z, -282);
  assert.deepEqual([panelOf(r, 'END-R').w, panelOf(r, 'END-R').box.z, panelOf(r, 'END-R').box.z + panelOf(r, 'END-R').box.d], [896, -310, 586]);
  assert.ok(r.csvLines.includes('01,END-R,896,870,<>^v,3.53,0.780'), 'the cut list follows');
  // Row 7: the band bottom 0, top 600: z 0..490 in the carcass; END-R covers the LID's end (490), BUR stops at 472.
  id = roomWith({ x_mm: 1300, width: 1000, depth: 300, bottom_mm: 0, top_mm: 600 });
  S().addEndPanel(id, { side: 'R' });
  r = S().unitResult(id);
  assert.deepEqual(panelOf(r, 'BUR').cnc.notch, { fc: 'x0y1', nw: 300, nh: 298 });
  assert.deepEqual(panelOf(r, 'LID').box.y + panelOf(r, 'LID').box.h, 490);
  assert.deepEqual(panelOf(r, 'END-R').cnc.notch, { fc: 'x0y1', nw: 300, nh: 280 });
  // Row 8: the recess ends at 1510, inside END-R's 25 (1500..1525): BUR grows, END-R stays on the wall line.
  id = roomWith({ x_mm: 1300, width: 210, depth: 300 });
  S().addEndPanel(id, { side: 'R' });
  r = S().unitResult(id);
  assert.equal(r.derived.extension.ends, undefined, 'the band does not reach past END-R');
  assert.equal(panelOf(r, 'BUR').w, 840, 'BUR grows all the same');
  assert.deepEqual([panelOf(r, 'END-R').w, panelOf(r, 'END-R').box.z], [596, -10]);
  assert.equal(panelOf(r, 'END-R').meta.followsSide, undefined);
  // A unit with no end panel: the extension the room asks for is the one it always was.
  id = roomWith({ x_mm: 1300, width: 1000, depth: 300 });
  r = S().unitResult(id);
  assert.deepEqual([r.derived.extension.x0, r.derived.extension.x1, r.derived.extension.ends], [410, 600, undefined]);
});

test('F9 · a grown END stops on the recess\'s own bottom and head: never into the wall under or over it (D21)', () => {
  // The recess starts 50 over the floor, the BUD stands on 100 legs: the band is clipped to the carcass underside,
  // END-R runs to the floor and grows from 50 up only (the room hands the engine rz0 -50).
  let id = roomWith({ x_mm: 1300, width: 1000, depth: 300, bottom_mm: 50 });
  S().addEndPanel(id, { side: 'R' });
  let u = S().units.find((x) => x.id === id);
  let r = S().unitResult(id);
  assert.deepEqual([r.derived.extension.z0, r.derived.extension.ends], [0, ['R']]);
  let ep = panelOf(r, 'END-R');
  assert.deepEqual([ep.w, ep.box.y, ep.box.z], [896, -100, -310]);
  assert.deepEqual(ep.cnc.notch, { fc: 'x0y0', nw: 300, nh: 50 }, 'the 50 under the recess stays on the wall line');
  // END-R run up 300 over the carcass, the recess's head 1000 over the floor (900 over the carcass underside).
  id = roomWith({ x_mm: 1300, width: 1000, depth: 300, top_mm: 1000 });
  S().addEndPanel(id, { side: 'R' });
  u = S().units.find((x) => x.id === id);
  S().setEndPanelTop(id, u.params.end_panels[0].id, 300);
  r = S().unitResult(id);
  ep = panelOf(r, 'END-R');
  assert.deepEqual([ep.w, ep.h, ep.box.z], [896, 1170, -310]);
  assert.deepEqual(ep.cnc.notch, { fc: 'x0y1', nw: 300, nh: 170 }, 'the 170 over the head stays on the wall line');
  // A recess from the floor to the ceiling: the END grows over its whole height, as before.
  id = roomWith({ x_mm: 1300, width: 1000, depth: 300, bottom_mm: 0 });
  S().addEndPanel(id, { side: 'R' });
  ep = panelOf(S().unitResult(id), 'END-R');
  assert.deepEqual([ep.w, ep.cnc.notch], [896, null]);
});

test('F9 · probe rows 10 to 13: wholly inside, the END panel reaches the recess back with the sides and the door face with the doors', () => {
  const id = roomWith({ x_mm: 800, width: 1300, depth: 300 });
  assert.equal(S().addEndPanel(id, { side: 'R' }).error, null);
  const u = S().units.find((x) => x.id === id);
  assert.deepEqual([u.params.depth, u.params.depth_full, u.params.recess_mm], [858, 558, 300]);
  const r = S().unitResult(id);
  const bur = panelOf(r, 'BUR');
  const ep = panelOf(r, 'END-R');
  // Row 12 was 596 at z 0..596. Now: 10 off the recess's back wall like the carcass, its face on the doors'.
  assert.deepEqual([ep.w, ep.box.z, ep.box.z + ep.box.d], [896, -10, 886]);
  assert.equal(ep.box.d, u.params.depth + P.room.wallBackClearance + P.doors.gap + u.params.front_t, 'the carcass depth, the wall gap and the door');
  assert.equal(bur.box.z + bur.box.d, 858);
  assert.ok(r.csvLines.includes('01,END-R,896,870,<>^v,3.53,0.780'));
  // Row 13, the reference: out of the recess it is the 596 it always was.
  S().moveUnit(id, 2600, 1);
  assert.deepEqual([panelOf(S().unitResult(id), 'END-R').w, panelOf(S().unitResult(id), 'END-R').box.z], [596, -10]);
});

test('F9 · wholly inside, the END keeps to the wall line under or over the recess (D21): never in the wall', () => {
  // The recess starts 50 over the floor: the BUD (on 100) stands wholly in it, END-R runs to the floor.
  let id = roomWith({ x_mm: 800, width: 1300, depth: 300, bottom_mm: 50 });
  S().addEndPanel(id, { side: 'R' });
  let u = S().units.find((x) => x.id === id);
  assert.equal(u.params.recess_mm, 300);
  assert.equal(u.params.recess_band, undefined, 'derived, never stored');
  let ep = panelOf(S().unitResult(id), 'END-R');
  assert.deepEqual([ep.w, ep.box.y, ep.box.z, ep.box.z + ep.box.d], [896, -100, -10, 886]);
  assert.deepEqual(ep.cnc.notch, { fc: 'x0y0', nw: 300, nh: 50 }, 'its back edge on the wall line under the recess');
  // Its head 1000 over the floor and END-R run up 300 over the carcass (to 1170): 170 over the head on the wall line.
  id = roomWith({ x_mm: 800, width: 1300, depth: 300, top_mm: 1000 });
  S().addEndPanel(id, { side: 'R' });
  u = S().units.find((x) => x.id === id);
  S().setEndPanelTop(id, u.params.end_panels[0].id, 300);
  ep = panelOf(S().unitResult(id), 'END-R');
  assert.deepEqual([ep.w, ep.h, ep.box.z], [896, 1170, -10]);
  assert.deepEqual(ep.cnc.notch, { fc: 'x0y1', nw: 300, nh: 170 });
  // Floor to ceiling: nothing to keep off, a plain deeper board (the probe's row 12 turned round).
  id = roomWith({ x_mm: 800, width: 1300, depth: 300 });
  S().addEndPanel(id, { side: 'R' });
  ep = panelOf(S().unitResult(id), 'END-R');
  assert.deepEqual([ep.w, ep.cnc.notch, ep.meta.followsSide], [896, undefined, undefined]);
});

test('F9 · probe rows 14 to 21: the END panel on a notched side is cut, the other hand is not', () => {
  // Row 16: full height, END-L is shallower, its back on the STEP's back face (z 200).
  let r = cut({ notch: { ...NOTCH, h: 0 }, end_panels: [EPL, EPR] });
  assert.deepEqual([panelOf(r, 'STEP').box.z, panelOf(r, 'END-L').box.z, panelOf(r, 'END-L').w], [200, 200, 386]);
  assert.equal(panelOf(r, 'END-R').w, 596, 'the other hand');
  // Rows 18, 19: from the floor and from the top.
  r = cut({ notch: NOTCH, end_panels: [EPL] });
  assert.deepEqual(panelOf(r, 'END-L').cnc.notch, { fc: 'x1y0', nw: 210, nh: 400 });
  r = cut({ notch: { ...NOTCH, h: -300 }, end_panels: [EPL] });
  assert.deepEqual(panelOf(r, 'END-L').cnc.notch, { fc: 'x1y1', nw: 210, nh: 300 });
  // Row 21: the edge notch, both ENDs.
  r = cut({ edgeNotch: { edge: 'BB', d: 20, h: 120 }, end_panels: [EPL, EPR] });
  assert.deepEqual(panelOf(r, 'END-L').cnc.notch, { fc: 'x1y0', nw: 48, nh: 220 });
  assert.deepEqual(panelOf(r, 'END-R').cnc.notch, { fc: 'x0y0', nw: 48, nh: 220 });
  // Row 22: the scene has a frame for it now (handedness u x v = -n, as every placement).
  const pl = panelPlacement(panelOf(r, 'END-L'));
  const cross = [pl.u[1] * pl.v[2] - pl.u[2] * pl.v[1], pl.u[2] * pl.v[0] - pl.u[0] * pl.v[2], pl.u[0] * pl.v[1] - pl.u[1] * pl.v[0]];
  assert.deepEqual(cross.map((v) => v + 0), pl.n.map((v) => -v + 0));
  assert.deepEqual(panelPlacement(panelOf(r, 'END-L')), panelPlacement({ ...panelOf(r, 'END-L'), part: 'BUL', meta: {} }));
  assert.deepEqual(panelPlacement(panelOf(r, 'END-R')), panelPlacement({ ...panelOf(r, 'END-R'), part: 'BUR', meta: {} }));
  // A REFUSED notch cuts no END: the parent is what is cut (Room refuses first).
  r = cut({ notch: { corner: 'BR', w: 10, d: 100, h: 60 }, end_panels: [EPR] });
  assert.ok(r.warnings.some((w) => w.code === 'NOTCH_REFUSED'));
  assert.deepEqual([panelOf(r, 'END-R').w, panelOf(r, 'END-R').cnc.notch], [596, undefined]);
});

// ═══ THE LISP FIRST ════════════════════════════════════════════════════════

test('F9 · the LISP first: KIT_NOTCH.lsp D23 / H3 / I4 and KIT_RECESS.lsp D21 / F2, ASCII, licensed with the owner\'s words', () => {
  const notch = read('reference/lisp/KIT_NOTCH.lsp');
  assert.match(notch, /;;; D23 THE END PANEL FOLLOWS ITS SIDE\. The owner: \*"nie wycina mi panelu\n;;;\s+bocznego do recess a powinno\."\*/);
  assert.match(notch, /;;; H3\. THE END PANEL FOLLOWS ITS SIDE \(D23, 18\.10\.2026\)/);
  assert.match(notch, /;;; I4\. NUMBERS - THE END PANEL \(D23, fixtures\/golden-notch-end-panel\.json\)/);
  for (const routine of ['notch-end-h (ch hh anchor ph pb)', 'notch-end-cut (ch g nw nd nh corner hand sb sf ph pb', 'edge-notch-end-cut (ch g ed eh edge hand sb sf ph pb)',
    'notch-end-in-p (c y ph)', 'notch-end-runs (rows k', 'notch-end-outline (ew ph cuts']) {
    assert.ok(notch.includes(`(defun ${routine}`), `KIT_NOTCH.lsp defines ${routine}`);
  }
  const recess = read('reference/lisp/KIT_RECESS.lsp');
  assert.match(recess, /;;; D21 THE END PANEL GROWS WITH ITS SIDE\. The owner: \*"nie wycina mi panelu\n;;;\s+bocznego do recess a powinno\."\*/);
  assert.match(recess, /;;; F2\. NUMBERS - THE END PANEL \(D21, fixtures\/golden-recess-end-panel\.json\)/);
  assert.ok(recess.includes('(defun recess-end-reach-p (hand rx0 rx1 cw et)'));
  assert.ok(recess.includes('(defun recess-end-cuts (ch ez0 ez1 ed hand ph pb rz0 rz1'));
  for (const text of [notch, recess]) {
    assert.doesNotMatch(text, /[^\x00-\x7f]/, 'the LISP stays ASCII');
  }
  for (const file of ['reference/lisp/KIT_NOTCH.lsp', 'reference/lisp/KIT_RECESS.lsp']) {
    assert.ok(LISP[file].includes(OWNER), `${file} is licensed with the owner's words`);
  }
});

test('F9 · the routines, the LISP\'s own answers (H3, section D)', () => {
  // notch-end-h: run on to the END's own underside or top.
  assert.equal(N.notchEndH(770, 300, 'floor', 870, 100), 400);
  assert.equal(N.notchEndH(770, 300, 'top', 870, 100), 300);
  assert.equal(N.notchEndH(770, 100, 'top', 1070, 100), 300);
  assert.equal(N.notchEndH(770, 770, 'full', 870, 100), 870);
  // notch-end-cut: the keep-out's face (D23), the hand.
  assert.deepEqual(N.notchEndCut(770, 18, 200, 200, 300, 'BL', 'L', 10, 28, 870, 100), ['x1y0', 210, 400]);
  assert.equal(N.notchEndCut(770, 18, 200, 200, 300, 'BL', 'R', 10, 28, 870, 100), null, 'the other hand');
  assert.deepEqual(N.notchEndCut(770, 18, 200, 200, -300, 'BL', 'L', 10, 28, 870, 100), ['x1y1', 210, 300]);
  assert.deepEqual(N.notchEndCut(770, 18, 200, 200, 0, 'BL', 'L', 10, 28, 870, 100), ['x1y0', 210, 870]);
  assert.deepEqual(N.notchEndCut(770, 18, 200, 150, 300, 'FR', 'R', 10, 28, 870, 100), ['x1y0', 178, 400], 'a front corner: flush');
  assert.deepEqual(N.notchEndCut(770, 18, 10, 30, 40, 'BR', 'R', 10, 28, 870, 100), ['x0y0', 58, 140], 'a rebate: flush');
  // edge-notch-end-cut: flush with the side's cut face.
  assert.deepEqual(N.edgeNotchEndCut(770, 18, 20, 120, 'BB', 'L', 10, 28, 870, 100), ['x1y0', 48, 220]);
  assert.deepEqual(N.edgeNotchEndCut(770, 18, 20, 120, 'BB', 'R', 10, 28, 870, 100), ['x0y0', 48, 220]);
  assert.deepEqual(N.edgeNotchEndCut(770, 18, 50, 100, 'TF', 'L', 10, 28, 870, 100), ['x0y1', 78, 100]);
  // notch-end-outline: one walk; one cut is notch-rect-outline's own polygon; a plain END the plain rectangle.
  for (const c of [['x1y0', 210, 400], ['x0y0', 48, 220], ['x1y1', 78, 300], ['x0y1', 150, 180]]) {
    assert.deepEqual(N.notchEndOutline(596, 870, [c]).pts, N.notchRectOutline(596, 870, c[1], c[2], c[0]), `${c[0]}`);
  }
  assert.deepEqual(N.notchEndOutline(596, 870, [null]), { box: [0, 0, 596, 870], pts: N.notchPlainRect(596, 870) });
  assert.deepEqual(N.notchEndOutline(596, 870, [['x1y0', 210, 870]]), { box: [0, 0, 386, 870], pts: N.notchPlainRect(386, 870) }, 'a strip');
  assert.deepEqual(N.notchEndOutline(596, 870, [['x0y0', 210, 870]]).box, [210, 0, 596, 870], 'a strip at x0: re-origined');
  // A stepped corner (two cuts on one corner) is walked as it falls, never dropped.
  assert.deepEqual(N.notchEndOutline(600, 800, [['x1y0', 100, 500], ['x1y0', 300, 200]]).pts,
    [[0, 0], [300, 0], [300, 200], [500, 200], [500, 500], [600, 500], [600, 800], [0, 800]]);
  assert.equal(N.notchEndOutline(100, 100, [['x0y0', 100, 100]]), null, 'nothing left');
  // recess-end-reach-p and recess-end-cuts (KIT_RECESS.lsp D21).
  assert.equal(X.recessEndReachP('R', 400, 1400, 600, 25), true);
  assert.equal(X.recessEndReachP('R', 400, 610, 600, 25), false);
  assert.equal(X.recessEndReachP('L', -25, 300, 600, 25), true);
  assert.equal(X.recessEndReachP('L', -24, 300, 600, 25), false);
  assert.deepEqual(X.recessEndCuts(770, 210, 590, 150, 'R', 870, 100), [['x0y0', 150, 310], ['x0y1', 150, 180]]);
  assert.deepEqual(X.recessEndCuts(770, 0, 590, 150, 'L', 870, 100), [['x1y1', 150, 180]]);
  assert.deepEqual(X.recessEndCuts(770, 0, 770, 150, 'R', 870, 100), []);
  // The recess's own bottom and top where the band was clipped (D21): the END grows no further than the recess.
  assert.deepEqual(X.recessEndCuts(770, 0, 770, 150, 'R', 1070, 100, -50, 900), [['x0y0', 150, 50], ['x0y1', 150, 70]]);
  assert.deepEqual(X.recessEndCuts(770, 0, 770, 150, 'L', 870, 100, -100, 770), [], 'a recess from the floor to the END\'s own top');
  assert.deepEqual(X.recessEndCuts(770, 0, 770, 150, 'L', 870, 100, -150, 2000), [], 'never more than the END');
  assert.deepEqual(X.recessEndCuts(770, 210, 590, 150, 'R', 870, 100, -50, 900), [['x0y0', 150, 310], ['x0y1', 150, 180]], 'unclipped: the band');
});

// ═══ THE NUMBERS BLOCKS, READ OFF THE ENGINE'S CUT ═════════════════════════

function block(file, from, to) {
  const text = read(file);
  const a = text.indexOf(from);
  const b = text.indexOf(to, a);
  assert.ok(a > 0 && b > a, `${file} has its block`);
  return text.slice(a, b).split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
}
const ptsOf = (list) => list.map(([x, y]) => `(${r4(x)} ${r4(y)})`).join(' ');
const arrowOf = (list) => list.map(([x, y]) => `(${r4(x)} ${r4(y)})`).join(' -> ');

test('F9 · KIT_NOTCH.lsp I4, line by line, is the engine\'s cut (outlines, marks, areas)', () => {
  const prose = block('reference/lisp/KIT_NOTCH.lsp', ';;; I4. NUMBERS - THE END PANEL', ';;; J. DRAWING');
  const say = (s) => assert.ok(prose.includes(s), `I4 states ${s}`);
  const cases = [
    [{ notch: NOTCH, end_panels: [EPL] }, 'END-L', 434520],
    [{ notch: { ...NOTCH, h: 0 }, end_panels: [EPL] }, 'END-L', 335820],
    [{ notch: { ...NOTCH, h: -300 }, end_panels: [EPL] }, 'END-L', 455520],
    [{ notch: { corner: 'FR', w: 200, d: 150, h: 300 }, end_panels: [EPR] }, 'END-R', 447320],
    [{ notch: { corner: 'BR', w: 10, d: 30, h: 40 }, end_panels: [EPR] }, 'END-R', 510400],
    [{ edgeNotch: { edge: 'BB', d: 20, h: 120 }, end_panels: [EPL, EPR] }, 'END-L', 507960],
    [{ edgeNotch: { edge: 'BB', d: 20, h: 120 }, end_panels: [EPL, EPR] }, 'END-R', null],
    [{ edgeNotch: { edge: 'TB', d: 50, h: 100 }, end_panels: [{ ...EPL, top_mm: 200 }] }, 'END-L', 614320],
    [{ notch: NOTCH, edgeNotch: { edge: 'TB', d: 50, h: 100 }, end_panels: [EPL] }, 'END-L', 426720],
  ];
  for (const [extra, id, area] of cases) {
    const r = cut(extra);
    assert.equal(r.warnings.filter((w) => /REFUSED/.test(w.code)).length, 0, JSON.stringify(extra));
    const p = panelOf(r, id);
    say(ptsOf(p.cnc.outline));
    for (const m of p.cnc.marks) say(arrowOf(m.pts));
    if (area) {
      assert.equal(Math.round(p.area_m2 * 1e6), area);
      say(`(${area} mm2)`);
    }
  }
  say('area 0.51852 -> 0.43452 m2 (434520 mm2); the cut list keeps 596 x 870');
  say('its box z 200..586');
  say('leaves END-R 596 x 870');
});

test('F9 · KIT_RECESS.lsp F2, line by line, is the engine\'s cut', () => {
  const prose = block('reference/lisp/KIT_RECESS.lsp', ';;; F2. NUMBERS - THE END PANEL', ';;; G. DRAWING');
  const say = (s) => assert.ok(prose.includes(s), `F2 states ${s}`);
  const d = cut({ extension: BAND, end_panels: [EPR] });
  const ep = panelOf(d, 'END-R');
  say(ptsOf(ep.cnc.outline));
  for (const m of ep.cnc.marks) say(arrowOf(m.pts));
  assert.deepEqual([ep.w, ep.h, ep.box.z, r4(ep.box.z + ep.box.d)], [746, 870, -160, 586]);
  say('746 x 870, its box z -160..586');
  assert.equal(Math.round(ep.area_m2 * 1e6), 575520);
  say('area 0.51852 -> 0.57552 m2 (575520 mm2)');
  assert.equal(ep.edging.len_m, 3.232);
  say('2 x (746 + 870) = 3232 mm');
  assert.deepEqual(panelOf(d, 'BUR').cnc.notch, { fc: 'x0y0', nw: 150, nh: 228, also: { fc: 'x0y1', nw: 150, nh: 198 } });
  say('690 x 770 less 150 x 228 at "x0y0" and 150 x 198 at "x0y1"');
  // The boards the END now covers: the FLOOR, the LID and the EXT-BACK end at x 600, behind z 0.
  assert.deepEqual(['FLOOR', 'LID', 'EXT-BACK'].map((id) => [panelOf(d, id).box.x + panelOf(d, id).box.w, panelOf(d, id).box.y]), [[600, 210], [600, 572], [600, 210]]);
  say('the EXT-BACK at carcass z -150..-132');
  assert.deepEqual([panelOf(d, 'EXT-BACK').box.z, r4(panelOf(d, 'EXT-BACK').box.z + panelOf(d, 'EXT-BACK').box.d)], [-150, -132]);
  // CASE A with END-R, the same band on the left, wholly inside.
  const a = panelOf(cut({ extension: { ...BAND, z0: 0, z1: 770 }, end_panels: [EPR] }), 'END-R');
  say(`z -160..586: ${ptsOf(a.cnc.outline)}; area ${a.area_m2} m2`);
  // The recess stops short of the END's own edges: it grows from the recess's bottom to its head, no further.
  const s = panelOf(cut({ extension: { ...BAND, z0: 0, z1: 770, rz0: -50, rz1: 900 }, end_panels: [{ ...EPR, top_mm: 200 }] }), 'END-R');
  assert.deepEqual([s.w, s.h, s.box.z, r4(s.box.z + s.box.d)], [746, 1070, -160, 586]);
  say('746 x 1070, its box z -160..586');
  say(ptsOf(s.cnc.outline));
  for (const m of s.cnc.marks) say(arrowOf(m.pts));
  assert.equal(Math.round(s.area_m2 * 1e6), 780220);
  say('area 0.78022 m2 (780220 mm2)');
  const l = cut({ extension: { x0: 0, x1: 290, z0: 0, z1: 590, d: 150, ends: ['L'] }, end_panels: [EPL, EPR] });
  say(`"x1y1": ${ptsOf(panelOf(l, 'END-L').cnc.outline)}`);
  assert.equal(panelOf(l, 'END-R').w, 596, 'the other hand unchanged');
  const w = panelOf(cut({ depth: 708, depth_full: 558, recess_mm: 150, end_panels: [EPR] }), 'END-R');
  assert.deepEqual([w.w, w.box.z, w.box.z + w.box.d], [746, -10, 736]);
  say('END-R 746 x 870, its box z -10..736');
  // ...and kept to the wall line under a recess that starts 50 over the floor (the room's recess_band).
  const wb = panelOf(cut({ depth: 708, depth_full: 558, recess_mm: 150, recess_band: { rz0: -50 }, end_panels: [EPR] }), 'END-R');
  assert.deepEqual(X.recessEndCuts(770, 0, 770, 150, 'R', 870, 100, -50, null), [['x0y0', 150, 50]]);
  say('(recess-end-cuts 770 0 770 150 "R" 870 100 -50 nil) = (("x0y0" 150 50))');
  assert.deepEqual([wb.w, wb.box.z, wb.box.z + wb.box.d], [746, -10, 736]);
  say(ptsOf(wb.cnc.outline));
  for (const m of wb.cnc.marks) say(arrowOf(m.pts));
  assert.equal(Math.round(wb.area_m2 * 1e6), 641520);
  say('area 0.64152 m2 (641520 mm2)');
});

// ═══ THE END'S OUTLINE AGAINST ITS SIDE'S, CASE BY CASE ═════════════════════

// The world height range of a missing corner, from the board's own record and box.
function cornerSpan(p) {
  const out = [];
  for (let c = p.cnc.notch; c; c = c.also) {
    const top = c.fc.slice(2) === 'y1';
    out.push({ fc: c.fc, y0: top ? p.box.y + p.box.h - c.nh : p.box.y, y1: top ? p.box.y + p.box.h : p.box.y + c.nh, nw: c.nw });
  }
  return out;
}

test('F9 · the END outline is its side\'s: the same corners, at the same heights run on to its own edges, its face where the keep-out begins', () => {
  // The corner notch, from the floor: the same corner; the END's corner holds the side's height and runs down to the floor.
  let r = cut({ notch: NOTCH, end_panels: [EPL] });
  let [s] = cornerSpan(panelOf(r, 'BUL'));
  let [e] = cornerSpan(panelOf(r, 'END-L'));
  assert.equal(e.fc, s.fc);
  assert.deepEqual([e.y0, e.y1, s.y0, s.y1], [-100, 300, 0, 300]);
  // Its cut face on the STEP's back face (z 200); the side's on the STEP's front face (z 218): the END covers the STEP's end.
  // (END-L's x runs back from its front face: the cut face stands at x = drawn_w - nw.)
  const ep = panelOf(r, 'END-L');
  assert.equal(ep.box.z + ep.box.d - (ep.cnc.drawn_w - e.nw), panelOf(r, 'STEP').box.z);
  assert.equal(panelOf(r, 'STEP').box.z, 200);
  assert.equal(panelOf(r, 'BUL').box.z + s.nw, panelOf(r, 'STEP').box.z + 18);
  // From the top (F4).
  r = cut({ notch: { ...NOTCH, h: -300 }, end_panels: [EPL] });
  [s] = cornerSpan(panelOf(r, 'BUL'));
  [e] = cornerSpan(panelOf(r, 'END-L'));
  assert.deepEqual([e.fc, e.y0, e.y1], [s.fc, s.y0, s.y1]);
  // The edge notch (F5): the same corner, flush with the side's cut face (carcass z 38) on both hands.
  r = cut({ edgeNotch: { edge: 'TB', d: 50, h: 100 }, end_panels: [{ ...EPL, top_mm: 200 }, EPR] });
  for (const [sideId, epId] of [['BUL', 'END-L'], ['BUR', 'END-R']]) {
    [s] = cornerSpan(panelOf(r, sideId));
    [e] = cornerSpan(panelOf(r, epId));
    assert.equal(e.fc, s.fc, epId);
    assert.equal(e.y0, s.y0, `${epId}: the rebate's underside`);
    assert.equal(e.y1, panelOf(r, epId).box.y + panelOf(r, epId).box.h, `${epId}: run on to its own top`);
    // The cut face: the side's back edge less its corner = the END's back edge less its corner, in the carcass.
    const sideFace = panelOf(r, sideId).box.z + s.nw;
    const endFace = panelOf(r, epId).box.z + e.nw;
    assert.equal(sideFace, 68);
    assert.equal(endFace, sideFace, `${epId} flush with ${sideId}`);
  }
  // The recess, partly in: the same ed, the same corners, over the band's own height (it covers the FLOOR and the LID).
  r = cut({ extension: BAND, end_panels: [EPR] });
  const sides = cornerSpan(panelOf(r, 'BUR'));
  const ends = cornerSpan(panelOf(r, 'END-R'));
  assert.deepEqual(ends.map((c) => [c.fc, c.nw]), sides.map((c) => [c.fc, c.nw]));
  assert.deepEqual(ends.map((c) => [c.y0, c.y1]), [[-100, 210], [590, 770]], 'the band 210..590, the END to the floor');
  assert.deepEqual(sides.map((c) => [c.y0, c.y1]), [[0, 228], [572, 770]], 'the side under the FLOOR and the LID');
  assert.equal(panelOf(r, 'END-R').box.d - 596, panelOf(r, 'BUR').w - 540, 'grown by the same ed');
});

test('F9 · wholly inside: the END panel\'s depth is the carcass\'s, the wall gap and the door, as on the wall line', () => {
  for (const recess of [150, 300]) {
    const D = 558 + recess;
    const r = cut({ depth: D, depth_full: 558, recess_mm: recess, end_panels: [EPL, EPR] });
    for (const id of ['END-L', 'END-R']) {
      const p = panelOf(r, id);
      assert.equal(p.box.d, D + 10 + 28, `${id} at ${recess}`);
      assert.equal(p.box.z, -10);
      assert.equal(p.w, D + 38);
      assert.equal(p.meta.followsSide, undefined, 'nothing is cut: it is the deeper panel');
    }
    const bul = panelOf(r, 'BUL');
    assert.equal(bul.box.z + bul.box.d, D, 'the carcass front');
  }
});

// ═══ BOM, DRAWING, EXPORT, 3-D ═════════════════════════════════════════════

test('F9 · BOM and the cut list follow the outline; the drawing and the export read it; nothing is refused', () => {
  const plain = cut({ end_panels: [EPL] });
  const r = cut({ notch: NOTCH, end_panels: [EPL] });
  const ep = panelOf(r, 'END-L');
  assert.equal(ep.area_m2, 0.43452);
  assert.ok(r.csvLines.includes('01,END-L,596,870,<>^v,2.93,0.435'));
  assert.equal(r4(r.totals.front_area_m2 - plain.totals.front_area_m2), r4(0.43452 - 0.51852), 'the front sheet loses the corner');
  assert.deepEqual(cutRows(r).fronts.filter((x) => x.id === 'END-L').map((x) => [x.w, x.h]), [[596, 870]]);
  const detail = JSON.stringify(partDetailDrawing(ep, { drills: r.drills, profile: P }));
  assert.ok(detail.includes('386,400'), 'the part detail draws the corner');
  for (const res of [r, cut({ extension: BAND, end_panels: [EPR] }), cut({ edgeNotch: { edge: 'BB', d: 20, h: 120 }, end_panels: [EPL, EPR] })]) {
    assert.deepEqual(resultFindings(res), [], 'no outline fault');
    assert.deepEqual(unitFindings(res, { profile: P }), [], 'the export gate holds');
  }
  const file = buildUnitDxfFiles(r, P).find((f) => f.panelId === 'END-L');
  const outline = file.entities.find((e) => e.layer === 'OUTLINE');
  assert.deepEqual(outline.pts, [[0, 0], [386, 0], [386, 400], [596, 400], [596, 870], [0, 870]]);
  const marks = file.entities.filter((e) => e.layer === 'CORNER_4MM');
  assert.deepEqual(marks, [{ type: 'poly', layer: 'CORNER_4MM', closed: false, pts: [[386, 360], [386, 400], [426, 400]] }], 'one open L (D12)');
});

test('F9 · the 3-D cuts the corner the engine states; an uncut END panel is still its box', () => {
  const r = cut({ notch: NOTCH, end_panels: [EPL, EPR] });
  const { solid } = panelSolids(panelOf(r, 'END-L'), P.puzzle.layers, P, r.drills);
  assert.ok(solid, 'the notched END panel rendered as a plain box');
  solid.computeBoundingBox();
  assert.ok(Math.abs(solid.boundingBox.max.z - solid.boundingBox.min.z - 0.596) < 1e-6);
  assert.equal(panelSolids(panelOf(r, 'END-R'), P.puzzle.layers, P, r.drills).solid, null, 'the other hand is a box');
  const grown = cut({ extension: BAND, end_panels: [EPR] });
  assert.ok(panelSolids(panelOf(grown, 'END-R'), P.puzzle.layers, P, grown.drills).solid, 'the grown END with its two corners');
});

// ═══ SAVE AND RELOAD ════════════════════════════════════════════════════════

test('F9 · save and reload: the end panels and the notch are unit params, the band is derived; the reloaded unit cuts the same', () => {
  let id = roomWith({ x_mm: 1300, width: 1000, depth: 300, bottom_mm: 0, top_mm: 600 });
  S().addEndPanel(id, { side: 'R' });
  const before = S().unitResult(id).csvLines;
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  assert.equal(saved.units[0].params.extension, undefined, 'the band is never stored');
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(S().unitResult(id).csvLines, before);
  assert.ok(before.includes('01,END-R,896,870,<>^v,3.53,0.696'));
  id = roomWith(null);
  S().addEndPanel(id, { side: 'L' });
  assert.equal(S().setUnitNotch(id, NOTCH).ok, true);
  const cutBefore = S().unitResult(id).csvLines;
  const saved2 = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved2.project, saved2.units);
  assert.deepEqual(S().unitResult(id).csvLines, cutBefore);
  assert.ok(cutBefore.includes('01,END-L,596,870,<>^v,2.93,0.435'));
});

// ═══ THE GOLDENS AND THE GATE ═══════════════════════════════════════════════

test('F9 · the two new goldens hold; the six are byte-identical; no golden before tonight opens the gate', () => {
  for (const g of GOLDENS) {
    const fixture = JSON.parse(read(`fixtures/${g.file}`));
    assert.deepEqual(fixture.expected, goldenOf(g.params()), `${g.file} holds`);
    assert.equal(GATES.endFollows.opens(g.params()), true, `${g.file} opens its own gate`);
  }
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    assert.equal(head[id].sha256, base[id].sha256, id);
    assert.equal(GATES.endFollows.opens(defaultParamsFor(id, P)), false, `${id} opens the gate`);
  }
  for (const file of ['golden-notch.json', 'golden-notch-top.json', 'golden-recess.json', 'golden-recess-band.json', 'golden-edge-notch-bb.json', 'golden-edge-notch-tb.json']) {
    const fixture = JSON.parse(read(`fixtures/${file}`));
    assert.equal(GATES.endFollows.opens(fixture.params), false, `${file} opens the gate`);
    assert.deepEqual(goldenOf(fixture.params), fixture.expected, `${file} moved`);
  }
  assert.equal(LIVENESS.endFollows().live, true, LIVENESS.endFollows().said);
});
