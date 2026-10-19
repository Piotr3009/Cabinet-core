/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── THE RECESS EXTENSION (the owner, 15.10.2026, the evening) ──────────────
//
// *"czy reces nie moze dzialac jak komin, czyli front zawsze trzyma sie linii
// a jak wpada do reces to wtedy sie wydluza szafka?"*  2 tak, 3 glebszy
// karkas, 4 dowolny, 5 glebsze. `reference/lisp/KIT_RECESS.lsp` is the law
// (written and paren-balanced first, its NUMBERS block in section F), and
// `src/engine/extension.js` mirrors it routine for routine. This file holds
// the mirror to the LISP's numbers board by board, the two passes in
// `computeCabinet` to the boards they cut, the store to its two halves (a
// deeper carcass wholly inside, an extension partly inside), and the wall's
// elevation window to the drawing the owner asked for.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { notchProfile, cutNotchCorner } from '../src/engine/notch.js';
import {
  RECESS_WINDOW_LAYER, recessLeftP, recessRightP, recessFloorP, recessTopP, recessFullP, recessIx0, recessIx1,
  recessBz0, recessBz1, recessWindow, recessInteriorRefusal, recessBumpOutline, recessBumpReentrants,
  recessBumpDogbones, recessTranspose, recessMirrorX, recessBiteOutline, recessBiteDogbones, recessRunSockets, recessRunTabs,
  recessPlanBump, recessTopOutline, recessTopDogbones, recessTopJoints, recessSideBump, recessSideOutline,
  recessSideDogbones, recessSideJoints, recessBackPieces, recessBackCut, recessCutEdges, recessCutKind,
  recessBackOutline, recessBackDogbones, recessRunRow, recessBackJoints, recessBoxPlaces, recessReturn,
  recessReturnScrews, recessLid, recessLidScrews, recessExtBack, recessExtBackScrews, recessShelfInP,
  recessShelfBump, recessShelfOutline, recessShelfDogbones, recessRefusal, recessNotchFootprint, EXTENSION_REFUSED, extensionOf,
  extensionVerdict, hangerCutoutStepped, withExtensionRefusal, cutEdgeBite, extensionCarcass, extensionDrills,
  extensionSummary,
} from '../src/engine/extension.js';
import { cncLayer } from '../src/engine/cnc/layers.js';
import { machiningFor } from '../src/engine/machining.js';
import { migratePlanElement, recessBand } from '../src/lib/wallElements.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { backStandoff } from '../src/engine/collision.js';
import { unitBase } from '../src/engine/runs.js';

const K = notchProfile(P);
const G = 18;
const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01', front_t: 25, shelves: 1, hinge: 'L' };
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const pts4 = (pts) => pts.map(([x, y]) => [r4(x), r4(y)]);
const A = { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 };
const B = { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 };
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const drillsOf = (r, panel, kind) => r.drills.filter((d) => d.panel === panel && (!kind || d.kind === kind));
const lisp = readFileSync(new URL('../reference/lisp/KIT_RECESS.lsp', import.meta.url), 'utf8');

// ─── B. THE BAND ───────────────────────────────────────────────────────────

test('the band: which edges are reached, the interior, the window (KIT_RECESS.lsp section B)', () => {
  assert.equal(recessLeftP(0), true); assert.equal(recessLeftP(310), false);
  assert.equal(recessRightP(600, 600), true); assert.equal(recessRightP(490, 600), false);
  assert.equal(recessFloorP(0), true); assert.equal(recessTopP(770, 770), true); assert.equal(recessTopP(590, 770), false);
  assert.equal(recessFullP(600, 770, 0, 600, 0, 770), true);
  assert.equal(recessFullP(600, 770, 310, 600, 0, 770), false);
  assert.equal(recessIx0(310, G), 328); assert.equal(recessIx1(600, G), 582);
  assert.equal(recessBz0(0, G), 0); assert.equal(recessBz0(210, G), 228);
  assert.equal(recessBz1(770, 770, G), 770); assert.equal(recessBz1(590, 770, G), 572);
  // CASE A: right, floor and top reached; CASE B: nothing reached.
  assert.deepEqual(recessWindow(600, 770, G, 310, 600, 0, 770), [328, 0, 600, 770]);
  assert.deepEqual(recessWindow(600, 770, G, 110, 490, 210, 590), [128, 228, 472, 572]);
  // D4: the interior rule, and D2 said in words.
  assert.equal(recessInteriorRefusal(600, 770, G, 310, 600, 0, 770, 150, K), null);
  assert.match(recessInteriorRefusal(600, 770, G, 0, 600, 0, 770, 150, K), /deeper carcass/);
  assert.match(recessInteriorRefusal(600, 770, G, 300, 420, 0, 770, 150, K), /narrower inside/);
  assert.match(recessInteriorRefusal(600, 770, G, 310, 600, 300, 420, 150, K), /lower inside/);
  assert.match(recessInteriorRefusal(600, 770, G, 310, 600, 0, 770, 30, K), /too shallow/);
});

// ─── C. ONE OUTLINE LAW: A RECTANGLE WITH A BUMP ───────────────────────────

test('the bump outline, its re-entrant corners and dog bones, carried into every frame', () => {
  assert.deepEqual(recessBumpOutline(564, 540, 310, 564, 150), [[0, 0], [564, 0], [564, 690], [310, 690], [310, 540], [0, 540]]);
  assert.deepEqual(recessBumpOutline(560, 520, 110, 450, 150),
    [[0, 0], [560, 0], [560, 520], [450, 520], [450, 670], [110, 670], [110, 520], [0, 520]]);
  assert.deepEqual(recessBumpOutline(100, 50, 0, 100, 20), [[0, 0], [100, 0], [100, 70], [0, 70]], 'both steps gone: a plain deeper rectangle');
  assert.deepEqual(recessBumpReentrants(564, 540, 310, 564), [[[310, 540], [-1, 1]]]);
  assert.deepEqual(recessBumpReentrants(560, 520, 110, 450), [[[110, 520], [-1, 1]], [[450, 520], [1, 1]]]);
  assert.deepEqual(pts4(recessBumpDogbones(564, 540, 310, 564, 4).map(([x, y]) => [x, y])), [[307.1716, 542.8284]]);
  assert.deepEqual(recessBumpDogbones(560, 520, 110, 450, 4).map(([x, y, r]) => [r4(x), r4(y), r]),
    [[107.1716, 522.8284, 4], [452.8284, 522.8284, 4]]);
  // The three carriers keep the walk anticlockwise (a reflection reverses it).
  assert.deepEqual(recessTranspose([[0, 0], [2, 0], [2, 1]]), [[1, 2], [0, 2], [0, 0]]);
  assert.deepEqual(recessMirrorX([[0, 0], [2, 0], [2, 1]], 2), [[0, 1], [0, 0], [2, 0]]);
  assert.deepEqual(recessBiteOutline(100, 50, 20, 0, 60, 30, 'bottom'), [[0, 0], [20, 0], [20, 30], [60, 30], [60, 0], [100, 0], [100, 50], [0, 50]]);
  assert.deepEqual(recessBiteOutline(100, 50, 0, 10, 30, 40, 'left'), [[0, 0], [100, 0], [100, 50], [0, 50], [0, 40], [30, 40], [30, 10], [0, 10]]);
  assert.deepEqual(recessBiteDogbones(20, 0, 60, 30, 'bottom', 4).map(([x, y, r]) => [r4(x), r4(y), r]), [[22.8284, 27.1716, 4], [57.1716, 27.1716, 4]]);
  // D7: a run under 96 carries no joint.
  assert.deepEqual(recessRunSockets(310, 0, 95, 264.5, 96), [95, 215]);
  assert.deepEqual(recessRunSockets(90, 0, 95, 264.5, 96), []);
  assert.deepEqual(recessRunTabs(770, 0, 95, 300, 600, 96), [95, 385, 675]);
  assert.deepEqual(recessRunTabs(80, 10, 95, 300, 600, 96), []);
  assert.deepEqual(recessRunRow(18, 328, 50), [68, 173, 278]);
});

// ─── D. BOARD BY BOARD, CASE A (the LISP's NUMBERS) ────────────────────────

test('CASE A: the TOP and the BOTTOM: 564 x 690 less 310 x 150 at the rear-left, the dog bone, the joints', () => {
  assert.deepEqual(recessPlanBump(600, 558, G, 310, 600, 150), [564, 540, 310, 564, 150]);
  assert.deepEqual(recessTopOutline(600, 558, G, 310, 600, 150), [[0, 0], [564, 0], [564, 690], [310, 690], [310, 540], [0, 540]]);
  assert.deepEqual(recessTopDogbones(600, 558, G, 310, 600, 150, 4).map(([x, y, r]) => [r4(x), r4(y), r]), [[307.1716, 542.8284, 4]]);
  const tj = recessTopJoints(600, 558, G, 310, 600, 150, K);
  assert.deepEqual(tj, { LEFT: [95, 445], RIGHT: [95, 595], BACK: [95, 215] });
});

test('CASE A: BUR grows to 690 x 770, a plain rectangle; its sockets, rows and back tabs', () => {
  assert.deepEqual(recessSideBump(558, 770, G, 0, 770, 150), [770, 540, 0, 770, 150]);
  assert.deepEqual(recessSideOutline(558, 770, G, 0, 770, 150, false), [[690, 0], [690, 770], [0, 770], [0, 0]]);
  assert.deepEqual(recessSideOutline(558, 770, G, 0, 770, 150, true), [[690, 0], [690, 770], [0, 770], [0, 0]]);
  assert.deepEqual(recessSideDogbones(558, 770, G, 0, 770, 150, 4, true), []);
  const sj = recessSideJoints(558, 770, G, 0, 770, 150, K);
  assert.deepEqual(sj['TOP-SOCKETS'], [95, 595]);
  assert.deepEqual(sj['BOTTOM-SOCKETS'], [95, 595]);
  assert.deepEqual(sj['TOP-SCREWS'], [50, 345, 640]);
  assert.deepEqual(sj['BACK-TABS'], [], 'it meets the EXT-BACK');
  assert.deepEqual(sj['PIN-COLUMNS'], [70, 470]);
  // A part-height bump: the straight runs carry the tabs, the bump has two re-entrant corners.
  const part = recessSideJoints(558, 770, G, 210, 590, 150, K);
  assert.deepEqual(part['BACK-TABS'], [114, 671], 'runs 0..228 and 572..770, each planned on its own: one centred tab each (SKY:tabCentres under 300)');
  assert.deepEqual(recessSideOutline(558, 770, G, 210, 590, 150, false),
    [[540, 0], [540, 228], [690, 228], [690, 572], [540, 572], [540, 770], [0, 770], [0, 0]]);
  assert.deepEqual(recessSideDogbones(558, 770, G, 210, 590, 150, 4, false).map(([x, y, r]) => [r4(x), r4(y), r]),
    [[542.8284, 225.1716, 4], [542.8284, 574.8284, 4]]);
});

test('CASE A: the BACK is one shorter piece 328 x 770; its sockets and rows; no column into the RETURN (19.10)', () => {
  const pieces = recessBackPieces(600, 770, G, 310, 600, 0, 770);
  assert.deepEqual(pieces, [[0, 0, 328, 770]]);
  const window = recessWindow(600, 770, G, 310, 600, 0, 770);
  assert.equal(recessBackCut(pieces[0], window), null, 'a shortened piece is whole');
  assert.deepEqual(recessBackOutline(pieces[0], null), [[0, 0], [328, 0], [328, 770], [0, 770]]);
  assert.deepEqual(recessBackDogbones(pieces[0], null, 4), []);
  const bj = recessBackJoints(pieces[0], window, 600, 770, G, 310, 600, 0, 770, [113, 233], [113, 233], [95, 385, 675], [], K);
  assert.deepEqual(bj.LEFT, [95, 385, 675]);
  assert.deepEqual(bj.RIGHT, []);
  assert.deepEqual(bj.TOP, [113, 233]);
  assert.deepEqual(bj.BOTTOM, [113, 233]);
  // REWRITTEN 19.10.2026 (chat fix, KIT_RECESS.lsp D17 as on 17.10), the
  // owner: *"nie na pierwszych plecach tylko na tych drugich ktore sa we
  // wnetrzu recess"*: the column into the RETURN's end ([319, 50], [319, 385],
  // [319, 720], drawn from 18.10 to 19.10) is gone again; the rows into BUL,
  // the TOP and the BOTTOM stay.
  assert.deepEqual(bj.SCREWS, [
    [9, 50], [9, 240], [9, 530], [9, 720],
    [68, 761], [173, 761], [278, 761],
    [68, 9], [173, 9], [278, 9],
  ]);
});

test('CASE A: the added boards and their stated screws', () => {
  const places = recessBoxPlaces(600, 558, 770, G, 310, 600, 0, 770, 150);
  assert.deepEqual(places, {
    'RETURN-L': [310, 558, 0, 328, 690, 770],
    'EXT-BACK': [310, 690, 0, 600, 708, 770],
  });
  assert.deepEqual(recessReturn(770, G, 0, 770, 150), [132, 770]);
  // 17.10.2026 (D17): the RETURN states NO screws. The owner: *"bedziemy
  // montowac na ciastka (w przyszlosci dodamy lamello) teraz nic"*. Until that
  // morning: [[50, 9], [50, 761], [66, 9], [66, 761], [82, 9], [82, 761]].
  assert.deepEqual(recessReturnScrews(770, G, 0, 770, 150, K), []);
  assert.deepEqual(recessExtBack(310, 600, 0, 770), [290, 770]);
  // REWRITTEN 18.10.2026 (T79 F6, D17 amended): the EXT-BACK is a back, *"ale
  // tylko na plecach"*: its twelve, a column each side, a row top and bottom.
  assert.deepEqual(recessExtBackScrews(600, 770, G, 310, 600, 0, 770, K), [
    [9, 50], [281, 50], [9, 385], [281, 385], [9, 720], [281, 720],
    [68, 9], [68, 761], [145, 9], [145, 761], [222, 9], [222, 761],
  ]);
});

test('CASE A: the shelf in the band grows (D10): 560 x 670 less 310 x 150, its dog bone', () => {
  const shelf = [20, 20, 580, 540];
  assert.equal(recessShelfInP(385, G, 770, 0, 770), true);
  assert.deepEqual(recessShelfBump(600, 558, G, 310, 600, 150, shelf, K), [560, 520, 310, 560, 150]);
  assert.deepEqual(recessShelfOutline(600, 558, G, 310, 600, 150, shelf, K), [[0, 0], [560, 0], [560, 670], [310, 670], [310, 520], [0, 520]]);
  assert.deepEqual(recessShelfDogbones(600, 558, G, 310, 600, 150, shelf, K, 4).map(([x, y, r]) => [r4(x), r4(y), r]), [[307.1716, 522.8284, 4]]);
});

// ─── D. BOARD BY BOARD, CASE B (the window) ────────────────────────────────

test('CASE B: one whole BACK with a window, no row round it (19.10); the FLOOR, the LID, two RETURNs', () => {
  const pieces = recessBackPieces(600, 770, G, 110, 490, 210, 590);
  assert.deepEqual(pieces, [[0, 0, 600, 770]]);
  const window = recessWindow(600, 770, G, 110, 490, 210, 590);
  const cut = recessBackCut(pieces[0], window);
  assert.deepEqual(cut, [128, 228, 472, 572]);
  assert.deepEqual(recessCutEdges(cut, 600, 770), []);
  assert.equal(recessCutKind(cut, 600, 770), 'window');
  assert.deepEqual(recessBackOutline(pieces[0], cut), [[0, 0], [600, 0], [600, 770], [0, 770]]);
  assert.deepEqual(recessBackDogbones(pieces[0], cut, 4), [], 'D9: the cutter rounds a window\'s corners');
  const bj = recessBackJoints(pieces[0], window, 600, 770, G, 110, 490, 210, 590, [113, 487], [113, 487], [95, 385, 675], [95, 385, 675], K);
  assert.deepEqual(bj.LEFT, [95, 385, 675]); assert.deepEqual(bj.RIGHT, [95, 385, 675]);
  assert.deepEqual(bj.TOP, [113, 487]); assert.deepEqual(bj.BOTTOM, [113, 487]);
  // REWRITTEN 19.10.2026 (chat fix, D17 as on 17.10): the twelve round the
  // window (S outside each edge, into the RETURNs' ends and the FLOOR's and
  // LID's front edges, drawn from 18.10 to 19.10) are gone; the BACK keeps
  // exactly drawBACK's fourteen.
  assert.equal(bj.SCREWS.length, 14, 'the parent\'s fourteen, nothing round the window');
  assert.deepEqual(bj.SCREWS.slice(14), [], 'no hand-fix row round the window');
  assert.deepEqual(recessBoxPlaces(600, 558, 770, G, 110, 490, 210, 590, 150), {
    'RETURN-L': [110, 558, 228, 128, 690, 572],
    'RETURN-R': [472, 558, 228, 490, 690, 572],
    FLOOR: [110, 558, 210, 490, 690, 228],
    LID: [110, 558, 572, 490, 690, 590],
    'EXT-BACK': [110, 690, 210, 490, 708, 590],
  });
  assert.deepEqual(recessReturn(770, G, 210, 590, 150), [132, 344]);
  assert.deepEqual(recessReturnScrews(770, G, 210, 590, 150, K), [], 'between a FLOOR and a LID it carries none of its own');
  assert.deepEqual(recessLid(G, 110, 490, 150), [380, 132]);
  // 17.10.2026 (D17): none stated on the FLOOR or the LID.
  assert.deepEqual(recessLidScrews(G, 110, 490, 150, K), []);
  // REWRITTEN 18.10.2026 (T79 F6, D17 amended): the EXT-BACK, a back, drilled.
  assert.deepEqual(recessExtBackScrews(600, 770, G, 110, 490, 210, 590, K), [
    [9, 68], [371, 68], [9, 190], [371, 190], [9, 312], [371, 312],
    [68, 9], [68, 371], [190, 9], [190, 371], [312, 9], [312, 371],
  ]);
});

test('the BACK\'s other shapes: a bite, a corner, two pieces (D8, D9)', () => {
  // A bite out of the bottom edge (the band reaches the floor, inside the width).
  const w1 = recessWindow(600, 770, G, 110, 490, 0, 500);
  const p1 = recessBackPieces(600, 770, G, 110, 490, 0, 500);
  const c1 = recessBackCut(p1[0], w1);
  assert.deepEqual(c1, [128, 0, 472, 482]);
  assert.equal(recessCutKind(c1, 600, 770), 'bite');
  assert.deepEqual(recessBackOutline(p1[0], c1), [[0, 0], [128, 0], [128, 482], [472, 482], [472, 0], [600, 0], [600, 770], [0, 770]]);
  assert.deepEqual(recessBackDogbones(p1[0], c1, 4).map(([x, y, r]) => [r4(x), r4(y), r]), [[130.8284, 479.1716, 4], [469.1716, 479.1716, 4]]);
  // A bite out of the left edge (BUL grows over a mid band).
  const w2 = recessWindow(600, 770, G, 0, 400, 200, 600);
  const c2 = recessBackCut([0, 0, 600, 770], w2);
  assert.deepEqual(c2, [0, 218, 382, 582]);
  assert.deepEqual(recessCutEdges(c2, 600, 770), ['left']);
  assert.deepEqual(recessBackOutline([0, 0, 600, 770], c2), [[0, 0], [600, 0], [600, 770], [0, 770], [0, 582], [382, 582], [382, 218], [0, 218]]);
  // A corner (the band reaches the floor and the right side, part height).
  const w3 = recessWindow(600, 770, G, 310, 600, 0, 500);
  const c3 = recessBackCut([0, 0, 600, 770], w3);
  assert.equal(recessCutKind(c3, 600, 770), 'corner');
  assert.deepEqual(recessBackOutline([0, 0, 600, 770], c3), [[0, 0], [328, 0], [328, 482], [600, 482], [600, 770], [0, 770]]);
  assert.deepEqual(recessBackDogbones([0, 0, 600, 770], c3, 4).map(([x, y, r]) => [r4(x), r4(y), r]), [[330.8284, 479.1716, 4]]);
  // Two pieces: full height inside the width; both sides over a mid band.
  assert.deepEqual(recessBackPieces(600, 770, G, 110, 490, 0, 770), [[0, 0, 128, 770], [472, 0, 600, 770]]);
  assert.deepEqual(recessBackPieces(600, 770, G, 0, 600, 200, 600), [[0, 0, 600, 218], [0, 582, 600, 770]]);
  assert.deepEqual(recessBackPieces(600, 770, G, 0, 600, 0, 770), [], 'D2: the whole back is the window, never here');
});

// ─── E. THE REFUSALS ───────────────────────────────────────────────────────

test('the refusals: a notch, a band outside the carcass, a return inside a side, the interior rule', () => {
  assert.equal(recessRefusal(600, 558, 770, G, 310, 600, 0, 770, 150, false, K), null);
  // T79 F8, KIT_RECESS.lsp D13 amended (the owner, 18.10.2026: *"dlaczego cut the corner likwiduje nam wcięcie
  // do recess?"*): the 10th argument is the notch's FOOTPRINT on the BACK, no longer "notched" (until then any
  // notch refused the band: "RECESS: a carcass notched round an obstacle cannot grow into a recess as well").
  // Apart (BL 200 wide against 310..600): no refusal; overlapping (the band from 100): the sentence the Check shows.
  assert.equal(recessRefusal(600, 558, 770, G, 310, 600, 0, 770, 150, recessNotchFootprint(600, 770, 200, 0, 'BL'), K), null);
  assert.equal(recessRefusal(600, 558, 770, G, 100, 600, 0, 770, 150, recessNotchFootprint(600, 770, 200, 0, 'BL'), K),
    'The recess cannot be cut: the corner cut stands where the recess band is; move one of them.');
  // A part-height notch whose height stands apart from the band's coexists across the same x.
  assert.equal(recessRefusal(600, 558, 770, G, 0, 300, 400, 770, 150, recessNotchFootprint(600, 770, 200, 300, 'BL'), K), null);
  assert.match(recessRefusal(600, 558, 770, G, -10, 600, 0, 770, 150, false, K), /outside the carcass/);
  assert.match(recessRefusal(600, 558, 770, G, 10, 600, 0, 770, 150, false, K), /RETURN cannot stand inside the side/);
  assert.match(recessRefusal(600, 558, 770, G, 0, 595, 0, 770, 150, false, K), /RETURN cannot stand inside the side/);
  assert.match(recessRefusal(600, 558, 770, G, 310, 600, 10, 770, 150, false, K), /FLOOR cannot lie inside the BOTTOM/);
  assert.match(recessRefusal(600, 558, 770, G, 310, 600, 0, 760, 150, false, K), /LID cannot lie inside the TOP/);
  assert.match(recessRefusal(600, 558, 770, G, 300, 420, 0, 770, 150, false, K), /narrower inside/);
});

// ─── Z. THE ENGINE CUTS WHAT THE ROUTINES DESCRIBE ─────────────────────────

test('extensionOf reads the band once; a half record is no extension', () => {
  assert.deepEqual(extensionOf({ extension: A }), { ...A, for: 'a recess in this wall' });
  assert.equal(extensionOf({ extension: { x0: 1 } }), null);
  assert.equal(extensionOf({}), null);
  assert.equal(EXTENSION_REFUSED, 'EXTENSION_REFUSED');
});

test('CASE A through computeCabinet: every board the LISP names, to its numbers', () => {
  const r = computeCabinet({ ...BUD, extension: A }, P);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.derived.extension, {
    x0: 310, x1: 600, z0: 0, z1: 770, d: 150, window: [328, 0, 600, 770],
    grown: ['BUR', 'TOP', 'BOTTOM', 'BACK', 'SHELF-1'], boards: ['RETURN-L', 'EXT-BACK'], pieces: 1, for: 'a recess in this wall',
  });
  assert.deepEqual(r.csvLines, [
    '01,BUL,540,770,<,0.77,0.416',
    '01,BUR,690,770,>,0.77,0.531',
    '01,TOP,564,690,>,0.56,0.343',
    '01,BOTTOM,564,690,>,0.56,0.343',
    '01,BACK,328,770,,0,0.253',
    '01,SHELF-1,560,670,>,0.56,0.329',
    '01,01-F,597,767,<>^v,2.73,0.458',
    '01,RETURN-L,132,770,,0,0.102',
    '01,EXT-BACK,290,770,,0,0.223',
  ]);
  // BUR: a deeper side from its new back edge; its sockets 95 and 595 from the front are 95 and 595 from the back.
  const bur = panelOf(r, 'BUR');
  assert.deepEqual(bur.cnc.outline, [[0, 0], [690, 0], [690, 770], [0, 770]]);
  assert.equal(bur.cnc.drawn_w, 690);
  assert.deepEqual(bur.box, { x: 582, y: 0, z: -132, w: 18, h: 770, d: 690 });
  assert.deepEqual(drillsOf(r, 'BUR', 'puzzle').map((d) => d.x).sort((a, b) => a - b), [70.5, 70.5, 119.5, 119.5, 570.5, 570.5, 619.5, 619.5]);
  assert.deepEqual(drillsOf(r, 'BUR', 'screw').map((d) => d.x).sort((a, b) => a - b), [50, 50, 345, 345, 640, 640]);
  // D12: the back pin column from the NEW back edge (70 and 620 from the front).
  assert.deepEqual([...new Set(drillsOf(r, 'BUR', 'shelf').map((d) => d.x))].sort((a, b) => a - b), [70, 620]);
  assert.equal(bur.cnc.notch, null);
  // TOP: the plan outline in the ROT90 frame, its dog bone, its tabs re-planned.
  const top = panelOf(r, 'TOP');
  assert.equal(top.h, 690);
  assert.equal(top.cnc.drawn_w, 690);
  // 17.10.2026 (KIT_RECESS.lsp D18): no dog bone at the corner (it stood at
  // (147.1716, 307.1716) ROT90 until that morning); the CORNER_4MM mark, two
  // open lines 40 long from the corner (150, 310) along the two edges that
  // meet there. The owner: *"nie, nie dodawaj wiercenia, dodaj jeden layer w
  // samym cornerze okolo 40 mm w kazda strone na linii L shape"*.
  assert.deepEqual(top.cnc.holes, []);
  // 17.10.2026, 14:15 (KIT_RECESS.lsp D19, "lustro bottom i top"): the TOP is
  // drawn from its UNDERSIDE, y from the BUR end: the corner (150, 310) of the
  // BOTTOM's frame is (150, 564 - 310) = (150, 254) on the TOP, its legs with it.
  // 16:10 (KIT_RECESS.lsp D20, KIT_NOTCH.lsp D12): ONE open L per corner, walked
  // the outline's way; the TOP's walk is the BOTTOM's mirrored and reversed.
  assert.deepEqual(top.cnc.marks, [
    { layer: 'CORNER_4MM', from: [150, 294], to: [110, 254], pts: [[150, 294], [150, 254], [110, 254]] },
  ]);
  assert.deepEqual(top.meta.planOutline, [[0, 690], [564, 690], [564, 0], [310, 0], [310, 150], [0, 150]]);
  assert.deepEqual(top.box, { x: 18, y: 752, z: -132, w: 564, h: 18, d: 690 });
  const corners = top.cnc.outline.filter(([x, y]) => (x === 690 || x === 0 || x === 150) && (y === 0 || y === 564 || y === 254));
  assert.deepEqual(corners, [[150, 564], [150, 254], [0, 254], [0, 0], [690, 0], [690, 564]], 'the NUMBERS of D19: the ROT90 walk mirrored and read backwards');
  assert.deepEqual(top.cnc.pockets.length, 6, 'two tabs into BUL, two into BUR, two into the BACK: six dog-bone reliefs');
  // ...and the BOTTOM, the same board in plan, keeps the ROT90 frame it always had.
  const bottom = panelOf(r, 'BOTTOM');
  assert.deepEqual(bottom.cnc.marks, [
    { layer: 'CORNER_4MM', from: [110, 310], to: [150, 270], pts: [[110, 310], [150, 310], [150, 270]] },
  ]);
  const bCorners = bottom.cnc.outline.filter(([x, y]) => (x === 690 || x === 0 || x === 150) && (y === 0 || y === 564 || y === 310));
  assert.deepEqual(bCorners, [[690, 0], [690, 564], [0, 564], [0, 310], [150, 310], [150, 0]]);
  // BACK: 328 x 770, its sockets and rows. REWRITTEN 19.10.2026 (chat fix, D17
  // as on 17.10, the owner: *"na tych pierwszych nie, to juz bylo usuniete i
  // znowu trzeba usunac"*): NO column into the RETURN's end ([319, 50],
  // [319, 385], [319, 720], drawn from 18.10 to 19.10).
  const back = panelOf(r, 'BACK');
  assert.deepEqual(back.cnc.outline, [[0, 0], [328, 0], [328, 770], [0, 770]]);
  assert.deepEqual(back.box, { x: 0, y: 0, z: 0, w: 328, h: 770, d: 18 });
  assert.deepEqual(drillsOf(r, 'BACK', 'screw').map((d) => [d.x, d.y]), [
    [9, 50], [9, 240], [9, 530], [9, 720], [68, 761], [173, 761], [278, 761], [68, 9], [173, 9], [278, 9],
  ]);
  assert.deepEqual(drillsOf(r, 'BACK', 'puzzle').filter((d) => d.y === 762).map((d) => d.x), [88.5, 137.5, 208.5, 257.5]);
  // The shelf: drawn depth x width, its dog bone, its plan for the 3-D.
  const shelf = panelOf(r, 'SHELF-1');
  assert.deepEqual(shelf.cnc.outline, [[520, 0], [520, 310], [670, 310], [670, 560], [0, 560], [0, 0]]);
  // 17.10.2026 (D18): the shelf's corner (520, 310) drawn carries the mark, not the bone at (522.8284, 307.1716).
  assert.deepEqual((shelf.cnc.holes || []).filter((h) => h.kind === 'notch_dogbone'), []);
  assert.deepEqual(shelf.cnc.marks, [
    { layer: 'CORNER_4MM', from: [520, 270], to: [560, 310], pts: [[520, 270], [520, 310], [560, 310]] },
  ]);
  assert.deepEqual(shelf.meta.planOutline, [[0, 670], [560, 670], [560, 0], [310, 0], [310, 150], [0, 150]]);
  // The added boards, standing behind the back. 17.10.2026 (D17): the RETURN
  // is plain and hand-fixed, NO screws stated on it (its six until that
  // morning); biscuits by hand, nothing drawn. REWRITTEN 18.10.2026 (T79 F6,
  // D17 amended): the EXT-BACK is a back, *"ale tylko na plecach"*: its twelve
  // are DRILLED (dia 3, SCREWS_3MM) and it is a cut part.
  const ret = panelOf(r, 'RETURN-L');
  assert.deepEqual([ret.part, ret.role, ret.meta.readiness, ret.meta.fixing], ['RECESS-RETURN', 'extension', 'geometry', 'manual']);
  assert.deepEqual(ret.box, { x: 310, y: 0, z: -132, w: 18, h: 770, d: 132 });
  assert.deepEqual(ret.meta.extension.screws, []);
  assert.deepEqual(drillsOf(r, 'RETURN-L'), []);
  const eb = panelOf(r, 'EXT-BACK');
  assert.deepEqual(eb.box, { x: 310, y: 0, z: -150, w: 290, h: 770, d: 18 });
  assert.deepEqual([eb.meta.readiness, eb.meta.fixing], [undefined, undefined]);
  const ebRows = [[9, 50], [281, 50], [9, 385], [281, 385], [9, 720], [281, 720],
    [68, 9], [68, 761], [145, 9], [145, 761], [222, 9], [222, 761]];
  assert.deepEqual(eb.meta.extension.screws, ebRows);
  assert.deepEqual(drillsOf(r, 'EXT-BACK', 'screw').map((d) => [d.x, d.y, d.d, d.layer]), ebRows.map(([x, y]) => [x, y, 3, 'SCREWS_3MM']));
  assert.equal(panelOf(r, 'BUL').w, 540, 'the other side is the parent\'s');
  assert.equal(drillsOf(r, 'BUL', 'hinge').length, drillsOf(computeCabinet(BUD, P), 'BUL', 'hinge').length);
});

test('CASE B through computeCabinet: the window is a through pocket on RECESS_WINDOW; five boards added', () => {
  const r = computeCabinet({ ...BUD, extension: B }, P);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.derived.extension.boards, ['RETURN-L', 'RETURN-R', 'FLOOR', 'LID', 'EXT-BACK']);
  assert.deepEqual(r.derived.extension.grown, ['BACK', 'SHELF-1']);
  const back = panelOf(r, 'BACK');
  assert.deepEqual(back.cnc.pockets.filter((k) => k.layer === RECESS_WINDOW_LAYER), [{ layer: 'RECESS_WINDOW', x1: 128, y1: 228, x2: 472, y2: 572, depth: 18 }]);
  assert.equal(back.cnc.outline.length, 4);
  // REWRITTEN 19.10.2026 (chat fix, D17 as on 17.10): the twelve round the
  // window are gone again; the parent's fourteen stay; the EXT-BACK keeps its twelve.
  assert.equal(drillsOf(r, 'BACK', 'screw').length, 14, 'the parent\'s fourteen, nothing round the window');
  assert.equal(drillsOf(r, 'EXT-BACK', 'screw').length, 12, 'the EXT-BACK, a back, drilled round the band');
  for (const id of ['RETURN-L', 'RETURN-R', 'FLOOR', 'LID']) assert.deepEqual(drillsOf(r, id), [], `${id}: "tylko na plecach"`);
  assert.equal(r.csvLines.find((l) => l.startsWith('01,BACK')), '01,BACK,600,770,,0,0.344', 'the window comes off the area');
  assert.deepEqual(r.csvLines.slice(7), ['01,RETURN-L,132,344,,0,0.045', '01,RETURN-R,132,344,,0,0.045', '01,FLOOR,380,132,,0,0.050', '01,LID,380,132,,0,0.050', '01,EXT-BACK,380,380,,0,0.144']);
  const shelf = panelOf(r, 'SHELF-1');
  assert.deepEqual(shelf.cnc.outline, [[520, 0], [520, 110], [670, 110], [670, 450], [520, 450], [520, 560], [0, 560], [0, 0]]);
  // 17.10.2026 (D18): two corners, no bones ((522.8284, 107.1716) and (522.8284, 452.8284) until then);
  // 16:10 (D20): one open L per corner, walked the outline's way.
  assert.deepEqual((shelf.cnc.holes || []).filter((h) => h.kind === 'notch_dogbone'), []);
  assert.deepEqual(shelf.cnc.marks, [
    { layer: 'CORNER_4MM', from: [520, 70], to: [560, 110], pts: [[520, 70], [520, 110], [560, 110]] },
    { layer: 'CORNER_4MM', from: [560, 450], to: [520, 490], pts: [[560, 450], [520, 450], [520, 490]] },
  ]);
  for (const id of ['BUL', 'BUR', 'TOP', 'BOTTOM']) assert.equal(panelOf(r, id).cnc.outline.length, panelOf(computeCabinet(BUD, P), id).cnc.outline.length, `${id} is the parent's`);
  // The layer is a machine contract: ACI 52, a pocket, drawn through.
  assert.equal(cncLayer('RECESS_WINDOW').aci, 52);
  assert.equal(cncLayer('RECESS_WINDOW').kind, 'pocket');
  assert.equal(machiningFor('RECESS_WINDOW', P).draw, true);
});

test('the other shapes through computeCabinet: a corner, a bite, two pieces, the 3-D records', () => {
  const corner = computeCabinet({ ...BUD, extension: { x0: 310, x1: 600, z0: 0, z1: 500, d: 150 } }, P);
  assert.deepEqual(panelOf(corner, 'BACK').cnc.notch, { fc: 'x1y0', nw: 272, nh: 482 });
  assert.deepEqual(panelOf(corner, 'BUR').cnc.notch, { fc: 'x0y1', nw: 150, nh: 288 });
  assert.deepEqual(corner.derived.extension.boards, ['RETURN-L', 'LID', 'EXT-BACK']);
  const bite = computeCabinet({ ...BUD, extension: { x0: 110, x1: 490, z0: 0, z1: 500, d: 150 } }, P);
  assert.deepEqual(panelOf(bite, 'BACK').cnc.bite, { x0: 128, y0: 0, x1: 472, y1: 482 });
  assert.equal(panelOf(bite, 'BACK').cnc.outline.length, 8);
  const mid = computeCabinet({ ...BUD, extension: { x0: 0, x1: 400, z0: 200, z1: 600, d: 150 } }, P);
  assert.deepEqual(panelOf(mid, 'BUL').cnc.notch, { fc: 'x1y0', nw: 150, nh: 218, also: { fc: 'x1y1', nw: 150, nh: 188 } });
  assert.deepEqual(panelOf(mid, 'BACK').cnc.bite, { x0: 0, y0: 218, x1: 382, y1: 582 });
  const two = computeCabinet({ ...BUD, extension: { x0: 110, x1: 490, z0: 0, z1: 770, d: 150 } }, P);
  assert.deepEqual(two.panels.filter((p) => p.part === 'BACK').map((p) => [p.id, p.w, p.h, p.box.x]), [['BACK', 128, 770, 0], ['BACK-2', 128, 770, 472]]);
  assert.equal(two.derived.extension.pieces, 2);
  const twoZ = computeCabinet({ ...BUD, extension: { x0: 0, x1: 600, z0: 200, z1: 600, d: 150 } }, P);
  assert.deepEqual(twoZ.panels.filter((p) => p.part === 'BACK').map((p) => [p.id, p.w, p.h, p.box.y]), [['BACK', 600, 218, 0], ['BACK-2', 600, 188, 582]]);
  // The 3-D's halves: a second corner, a bite out of an edge.
  const rect = [[0, 0], [100, 0], [100, 50], [0, 50]];
  assert.deepEqual(cutNotchCorner(rect, 100, 50, { fc: 'x1y0', nw: 10, nh: 10, also: { fc: 'x1y1', nw: 10, nh: 10 } }),
    [[0, 0], [90, 0], [90, 10], [100, 10], [100, 40], [90, 40], [90, 50], [0, 50]]);
  assert.deepEqual(cutEdgeBite(rect, 100, 50, { x0: 20, y0: 0, x1: 60, y1: 30 }), [[0, 0], [20, 0], [20, 30], [60, 30], [60, 0], [100, 0], [100, 50], [0, 50]]);
  assert.deepEqual(cutEdgeBite(rect, 100, 50, { x0: 0, y0: 10, x1: 30, y1: 40 }), [[0, 0], [100, 0], [100, 50], [0, 50], [0, 40], [30, 40], [30, 10], [0, 10]]);
  assert.deepEqual(cutEdgeBite(rect, 100, 50, null), rect);
});

test('the verdict: the kit, a notch, a hanger in the window; a refusal cuts the parent and says why', () => {
  const full = computeCabinet({ ...BUD, extension: { x0: 0, x1: 600, z0: 0, z1: 770, d: 150 } }, P);
  assert.deepEqual(full.warnings.map((w) => w.code), [EXTENSION_REFUSED]);
  assert.match(full.derived.extension.refused, /deeper carcass/);
  assert.equal(full.panels.length, computeCabinet(BUD, P).panels.length, 'the parent is what is cut');
  // T79 F8 (D13 amended, the owner: *"dlaczego cut the corner likwiduje nam wcięcie do recess?"*): a notch apart
  // from the band on the BACK no longer refuses it; both are cut (test/turn79-f08-notch-and-recess.test.js board by
  // board). A band that overlaps the notch's footprint is refused in words and the notch stands.
  const notched = computeCabinet({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 0 }, extension: A }, P);
  assert.deepEqual(notched.warnings, []);
  assert.ok(notched.derived.notch && notched.derived.extension && !notched.derived.extension.refused, 'both are cut');
  const overlapping = computeCabinet({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 0 }, extension: { ...A, x0: 100 } }, P);
  assert.equal(overlapping.warnings.find((w) => w.code === EXTENSION_REFUSED).message,
    'The recess cannot be cut: the corner cut stands where the recess band is; move one of them.');
  assert.ok(overlapping.derived.notch && !overlapping.derived.notch.refused, 'the notch stands');
  const budr = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '03', extension: A }, P);
  assert.match(budr.warnings.find((w) => w.code === EXTENSION_REFUSED).message, /RECESS: an extension grows from a base unit/);
  // A wall unit: the hanger cut-out the window reaches steps in beside it (D14); one with nowhere to go refuses.
  const wud = { ...defaultParamsFor('WUD', P), unit_num: '02' };
  const stepped = computeCabinet({ ...wud, extension: { x0: 300, x1: 600, z0: 0, z1: 720, d: 100 } }, P);
  assert.deepEqual(stepped.warnings, []);
  assert.deepEqual(panelOf(stepped, 'BACK').cnc.pockets.filter((k) => k.layer === 'HANGER_HOLE').map((k) => [k.x1, k.x2]), [[0, 30], [288, 318]]);
  const stuck = computeCabinet({ ...wud, extension: { x0: 0, x1: 600, z0: 300, z1: 720, d: 100 } }, P);
  assert.match(stuck.warnings.find((w) => w.code === EXTENSION_REFUSED).message, /hanger cut-out/);
  assert.equal(hangerCutoutStepped({ x1: 0, x2: 30, y1: 662, y2: 720 }, [0, 0, 282, 720], 600).x1, 282);
  assert.equal(hangerCutoutStepped({ x1: 570, x2: 600, y1: 662, y2: 720 }, [0, 0, 282, 720], 600).x1, 570, 'not reached: stays');
  // The wrapper and the summary, asked directly.
  const parent = computeCabinet(BUD, P);
  const v = extensionVerdict({ parent, params: { ...BUD, extension: { x0: 300, x1: 420, z0: 0, z1: 770, d: 150 } }, type: getUnitType('BUD'), profile: P });
  assert.match(v.message, /narrower inside/);
  const wrapped = withExtensionRefusal(parent, v, { ...BUD, extension: { x0: 300, x1: 420, z0: 0, z1: 770, d: 150 } });
  assert.equal(wrapped.warnings.at(-1).code, EXTENSION_REFUSED);
  assert.equal(extensionSummary(null), null);
  assert.equal(extensionCarcass({ params: BUD }), null);
  assert.equal(extensionDrills({ cut: null }), undefined);
});

// ─── THE STORE: THE TWO HALVES (D1, D2, D3) ─────────────────────────────────

const S = () => useProjectStore.getState();
const unitOf = (id) => S().units.find((u) => u.id === id);
// T79 F10, the owner 18.10.2026: *"lub zmniejszać go odsuwaniem od recesu."*
// A recess gives a cabinet its depth less the cabinet's stand-off (the
// standard ten included): what a 300 recess gives at the standard.
const IN = 300 - P.room.wallBackClearance;

function kitchenWithRecess(extra = {}) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 1300, depth: 300, ...extra });
}

test('wholly inside: a DEEPER carcass on the same line of fronts (D2); partly inside: the extension (D1); out: as it was', () => {
  kitchenWithRecess();
  const a = S().addUnit('BUD', { wall: 0, x: 200 });
  assert.equal(a.error, null, a.error);
  S().moveUnit(a.id, 1100, 1);
  let u = unitOf(a.id);
  assert.equal(u.params.recess_mm, IN);
  assert.equal(u.params.depth, 558 + IN, 'its depth plus the recess less its stand-off (T79 F10)');
  assert.equal(u.params.depth_full, 558);
  assert.equal(backStandoff(u, P), P.room.wallBackClearance - IN, 'standing back in the recess by what it takes of it');
  assert.equal(backStandoff(u, P) + u.params.depth, P.room.wallBackClearance + 558, 'THE FRONT HOLDS THE LINE');
  let r = S().unitResult(a.id);
  assert.equal(panelOf(r, 'BUL').w, 558 + IN - 18, 'a deeper side, the kit\'s own depth law');
  assert.equal(r.derived.extension, undefined, 'no extension on a deeper carcass');
  assert.deepEqual(r.warnings.filter((w) => /OVERLAP|RECESS|EXTENSION/.test(w.code)), []);
  // Half across the recess's edge: on the wall line, its depth back, an extension behind its back.
  S().moveUnit(a.id, 1800, 1);
  u = unitOf(a.id);
  assert.equal(u.params.recess_mm, undefined);
  assert.equal(u.params.depth, 558);
  assert.equal(u.params.depth_full, undefined);
  assert.equal(backStandoff(u, P), P.room.wallBackClearance);
  r = S().unitResult(a.id);
  assert.deepEqual(r.derived.extension.boards, ['RETURN-R', 'EXT-BACK']);
  assert.deepEqual([r.derived.extension.x0, r.derived.extension.x1, r.derived.extension.z0, r.derived.extension.z1, r.derived.extension.d], [0, 490, 0, 770, IN]);
  assert.equal(panelOf(r, 'BUL').w, 558 + IN - 18, 'BUL grows into the recess');
  assert.equal(panelOf(r, 'BUR').w, 540);
  // Out of the recess altogether.
  S().moveUnit(a.id, 200, 1);
  u = unitOf(a.id);
  assert.equal(u.params.depth, 558);
  assert.equal(S().unitResult(a.id).derived.extension, undefined);
  // The recess removed while the cabinet stands in it: back to its own depth.
  S().moveUnit(a.id, 1100, 1);
  assert.equal(unitOf(a.id).params.depth, 558 + IN);
  S().removeWallSlope(S().project.wallSlopes[0].id);
  assert.equal(unitOf(a.id).params.depth, 558);
  assert.equal(unitOf(a.id).params.recess_mm, undefined);
});

test('the band (D3): a recess from the floor to 1000 takes the bottom of a tall unit; a wall unit above it is untouched', () => {
  kitchenWithRecess({ x_mm: 500, width: 2000, depth: 150, bottom_mm: 0, top_mm: 1000 });
  const el = S().project.wallSlopes[0];
  assert.deepEqual([el.bottom_mm, el.top_mm], [null, 1000]);
  assert.deepEqual(recessBand(el, 2500), [0, 1000]);
  const t = S().addUnit('BUDTALL', { wall: 0, x: 1000 });
  assert.equal(t.error, null, t.error);
  const u = unitOf(t.id);
  assert.equal(u.params.recess_mm, undefined, 'not wholly inside: the band stops at 1000');
  const r = S().unitResult(t.id);
  const base = unitBase(u, P);
  assert.deepEqual([r.derived.extension.z0, r.derived.extension.z1], [0, 1000 - base - 10], 'the band in the carcass frame, the clearance off the recess\'s head');
  assert.deepEqual(r.derived.extension.boards, ['LID', 'EXT-BACK']);
  assert.ok(panelOf(r, 'BUL').cnc.notch && panelOf(r, 'BUL').cnc.notch.fc === 'x1y1', 'the side bumps over the band only');
  const w = S().addUnit('WUD', { wall: 0, x: 1700 });
  assert.equal(w.error, null, w.error);
  assert.equal(S().unitResult(w.id).derived.extension, undefined, 'the wall unit hangs above the band');
  // The same recess floor to ceiling: the tall unit is wholly inside and deeper.
  S().updateWallSlope(el.id, { top_mm: null });
  const in150 = 150 - P.room.wallBackClearance;
  assert.equal(unitOf(t.id).params.recess_mm, in150);
  assert.equal(unitOf(t.id).params.depth, 558 + in150);
  assert.equal(unitOf(w.id).params.recess_mm, in150, 'and so is the wall unit now');
});

test('the recess record: bottom_mm and top_mm live on it, null for the floor and the ceiling; a chimney has neither', () => {
  const r = migratePlanElement({ kind: 'recess', wall: 0, x_mm: 100, width: 600, depth: 150, bottom_mm: 350, top_mm: '1200' });
  assert.deepEqual([r.bottom_mm, r.top_mm], [350, 1200]);
  const plain = migratePlanElement({ kind: 'recess', wall: 0, x_mm: 100, width: 600, depth: 150 });
  assert.deepEqual([plain.bottom_mm, plain.top_mm], [null, null]);
  assert.deepEqual(recessBand(plain, 2500), [0, 2500]);
  assert.deepEqual(recessBand(migratePlanElement({ kind: 'recess', wall: 0, bottom_mm: 0, top_mm: 9000 }), 2500), [0, 2500]);
  const c = migratePlanElement({ kind: 'chimney', wall: 0, x_mm: 100, width: 600, depth: 350, bottom_mm: 350 });
  assert.equal('bottom_mm' in c, false);
  assert.deepEqual(recessBand(c, 2500), [0, 2500]);
});

// ─── THE WALL SEEN FROM THE FRONT ──────────────────────────────────────────

for (const rel of ['src/components/WallElevationModal.jsx', 'src/retail/design/room/WallElevationModal.jsx']) {
  test(`${rel}: the front view draws the recess (its band) and the chimney, lists them, and the recess window has Bottom and Top`, () => {
    const src = readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
    assert.match(src, /recessBand/);
    assert.match(src, /data-elevation-plan=\{el\.id\}/);
    assert.match(src, /strokeDasharray=\{isRecess \? '5 3' : undefined\}/);
    assert.match(src, /startFrontPlanDrag/);
    assert.match(src, /const onThisWall = view === 'front' \? \[\.\.\.elements, \.\.\.plan\] : plan;/);
    assert.match(src, /data-plan-bottom="1"/);
    assert.match(src, /data-plan-top="1"/);
    assert.match(src, /onPlan\(\{ bottom_mm: v > 0 \? v : null \}\)/);
    assert.match(src, /onPlan\(\{ top_mm: v < wallHeight \? v : null \}\)/);
    assert.doesNotMatch(src, /Geometry for the eye this turn/);
    assert.match(src, /A unit wholly inside it is cut deeper/);
  });
}

test('KIT_RECESS.lsp carries the law, the decisions and the NUMBERS, in ASCII', () => {
  assert.match(lisp, /;;; 2\. THE LAW: AN EXTENSION MAKES THE CARCASS DEEPER OVER A BAND/);
  assert.match(lisp, /;;; D1 {2}THE FRONT HOLDS THE LINE/);
  assert.match(lisp, /;;; D14 THE PARENTS/);
  assert.match(lisp, /;;; F\. NUMBERS - THE GOLDEN CASES/);
  assert.match(lisp, /\(defun recess-back-pieces /);
  assert.match(lisp, /\(defun c:RECESS_FULL /);
  assert.ok(!/[^\x00-\x7F]/.test(lisp), 'the LISP is ASCII');
});
