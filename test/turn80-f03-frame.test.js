/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F3 · THE RUN GETS ITS FRAME (construction, BOM, labels) ─────────────
//
// CLAUDE.md T80 F3: *"A run = the butted cabinets of one wall segment, in
// order, as the plinth run already groups them ... In-frame uses THE SAME
// grouping, never a second one (one law one path): the frame board is a run
// part like the plinth board ... listed in the BOM under the run with its own
// number, labelled FRAME (one piece) or FRAME-1..n (joined)."*  Tests: the
// probe table as assertions (verify/t80/f03-probe.md); the frame's width,
// height, origin and openings for the worked examples, read from the run
// result and held to the LISP's OWN answer (the kit's routines run here); the
// join at 3000 (two boards, the cut on a stile centre line); the BOM line;
// the labels; the frame stopping at a unit it does not stand on; the save
// (derived, never stored); and in-frame OFF is main.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { buildRuns, plinthSegments } from '../src/engine/runs.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildBom } from '../src/engine/bom.js';
import { ELEMENT_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import * as IF from '../src/engine/inframe.js';
import { rectCorners } from '../src/engine/room.js';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const L = loadLisp(readFileSync(`${ROOT}reference/lisp/KIT_INFRAME.lsp`, 'utf8'));
const S = () => useProjectStore.getState();
const F = IF.inframeSpec(P);
const num = (id) => S().units.find((u) => u.id === id)?.params.unit_num;
const framesOf = (id) => S().unitResult(id).panels.filter((p) => p.role === 'frame');

/** The mockup's scene (scripts/chatfix-2110-mockup-inframe-final.mjs), the end panel at the mockup's 18. */
function mockup({ inframe = true } = {}) {
  S().newProject('T80 F3');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  S().setFrontType('f1', { source: 'spray' });
  const add = (type, x) => S().addUnit(type, { wall: 0, x }).id;
  const a = add('BUD', 1000); const b = add('BUD', 1600); const c = add('BUDR2', 2400); const w = add('WUD', 1000);
  S().updateUnitParams(a, { width: 600 }); S().updateUnitParams(b, { width: 800 });
  S().updateUnitParams(c, { width: 500 }); S().updateUnitParams(w, { width: 600 });
  S().setDoors(a, { count: 1, hinge: 'L' }); S().setDoors(b, { count: 2, hinge: 'L' }); S().setDoors(w, { count: 1, hinge: 'L' });
  S().addEndPanel(a, { side: 'L', thickness: 18 });
  if (inframe) S().setDesign({ inframe: true });
  return { a, b, c, w };
}

// ═══ THE PROBE TABLE, AS ASSERTIONS (verify/t80/f03-probe.md) ═══════════════

test('F3 probe · the mockup\'s units stand butted, and buildRuns groups the plinth\'s two runs', () => {
  const { a, b, c, w } = mockup({ inframe: false });
  const xs = [a, b, c, w].map((id) => S().units.find((u) => u.id === id).position.x_mm);
  assert.deepEqual(xs, [1000, 1600, 2400, 1000], 'every asked x kept');
  const runs = buildRuns(S().units, P);
  assert.deepEqual(runs.map((r) => r.units.map((u) => num(u.id))), [['01', '02', 'DR01'], ['WU01']]);
  assert.equal(P.autoParts.topInfill.runGap, 1, 'the run gap tolerance is 1 mm (DECISIONS 13)');
  assert.deepEqual(plinthSegments(runs[0]).map((s) => s.map((u) => num(u.id))), [['01', '02', 'DR01']], 'the plinth\'s one segment');
  assert.deepEqual(S().units.find((u) => u.id === a).params.end_panels.map((e) => [e.side, e.thickness]), [['L', 18]]);
  // Lay-on: not one frame element, not one FRAME board, not one params key.
  assert.ok(Object.values(S().runElements).every((e) => !e.frame));
  for (const id of [a, b, c, w]) assert.deepEqual(framesOf(id), []);
});

// ═══ THE FRAME, HELD TO THE LISP'S OWN ANSWER ══════════════════════════════

test('F3 · the mockup\'s run: ONE frame on 01, 1920 x 808 at (-19, -19), the openings and stiles of the LISP', () => {
  const { a, b, c } = mockup();
  const el = S().runElements[a].frame;
  assert.equal(el.role, 'owner');
  assert.deepEqual(S().runElements[b].frame, { role: 'member', ownerId: a });
  assert.deepEqual(S().runElements[c].frame, { role: 'member', ownerId: a });
  // The LISP, run on the same three cabinets (x0 from the first, y0 from its carcass bottom).
  const kit = L.call('inframe-frame', [[0, 600, 770, 0, 18], [600, 800, 770, 0, 18], [1400, 500, 770, 0, 18]], ['PANEL', 18], ['OPEN', 0]);
  assert.deepEqual([el.offset, el.dy, el.width, el.height], kit.slice(0, 4));
  assert.deepEqual([el.offset, el.dy, el.width, el.height], [-19, -19, 1920, 808]);
  assert.deepEqual(el.openings.map((o) => [o.x0, o.y0, o.x1, o.y1]), kit[4]);
  assert.deepEqual(el.stiles, L.call('inframe-stiles', kit));
  assert.deepEqual(el.stiles, [38, 38, 38, 20]);
  assert.deepEqual(el.gaps, [0, 0]);
  assert.deepEqual(el.ends, { left: { kind: 'PANEL', panel: 18 }, right: { kind: 'OPEN', panel: 0 } });
  assert.equal(el.overhang.left, 1);
  // The board itself, cut by the owner.
  const [frame] = framesOf(a);
  assert.equal(frame.id, 'FRAME');
  assert.equal(frame.part, 'FRAME');
  assert.deepEqual([frame.w, frame.h, frame.thickness], [1920, 808, 25]);
  assert.deepEqual(frame.box, { x: -19, y: -19, z: 558, w: 1920, h: 808, d: 25 }, 'on the carcass face, 25 deep');
  assert.equal(frame.material_role, 'front', 'the FRONT type\'s material');
  assert.equal(frame.finish_exposed, true);
  assert.equal(frame.edging.len_m, 0, 'no banding');
  assert.equal(frame.cnc.grain, undefined, 'MDF: no grain');
  assert.deepEqual(frame.cnc.pockets.map((p) => [p.x1, p.y1, p.x2, p.y2, p.cutout, p.depth, p.layer]), [
    [38, 38, 600, 770, true, 25, 'RECESS_WINDOW'], [638, 38, 1400, 770, true, 25, 'RECESS_WINDOW'], [1438, 38, 1900, 770, true, 25, 'RECESS_WINDOW'],
  ]);
  assert.deepEqual(frame.meta.inframe.openings.map((o) => [o.w, o.h]), [[562, 732], [762, 732], [462, 732]], 'the walk\'s openings');
  // The members cut no frame.
  assert.deepEqual(framesOf(b), []);
  assert.deepEqual(framesOf(c), []);
});

test('F3 · the wall unit WUD 600: its own frame, 602 x 758 at (-1, -19), the opening 562 x 682', () => {
  const { w } = mockup();
  const el = S().runElements[w].frame;
  const kit = L.call('inframe-frame', [[0, 600, 720, 0, 18]], ['OPEN', 0], ['OPEN', 0]);
  assert.deepEqual([el.offset, el.dy, el.width, el.height], kit.slice(0, 4));
  assert.deepEqual([el.width, el.height], [602, 758]);
  const [frame] = framesOf(w);
  assert.deepEqual([frame.w, frame.h], [602, 758]);
  assert.deepEqual(frame.meta.inframe.openings.map((o) => [o.w, o.h]), [[562, 682]]);
  assert.equal(el.mount, 'wall');
});

// ═══ THE JOIN ═════════════════════════════════════════════════════════════

test('F3 · the join: five BUD 600 (3002 wide) are two boards, FRAME-1 and FRAME-2, cut on the stile\'s centre line', () => {
  S().newProject('T80 F3 join');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  const ids = [0, 600, 1200, 1800, 2400].map((x) => S().addUnit('BUD', { wall: 0, x: 500 + x }).id);
  for (const id of ids) S().updateUnitParams(id, { width: 600 });
  S().setDesign({ inframe: true });
  const el = S().runElements[ids[0]].frame;
  assert.equal(el.width, 3002);
  assert.deepEqual(el.pieces, [{ name: 'FRAME-1', from: 0, to: 1201 }, { name: 'FRAME-2', from: 1201, to: 3002 }]);
  assert.equal(el.joined, true);
  // The LISP's own join.
  const kit = L.call('inframe-frame', [0, 600, 1200, 1800, 2400].map((x) => [x, 600, 770, 0, 18]), ['OPEN', 0], ['OPEN', 0]);
  assert.deepEqual(L.call('inframe-join', kit, 2800)[2], [1201]);
  const boards = framesOf(ids[0]);
  assert.deepEqual(boards.map((p) => [p.id, p.w, p.h, p.box.x, p.cnc.pockets.length]), [
    ['FRAME-1', 1201, 808, -1, 2], ['FRAME-2', 1801, 808, 1200, 3],
  ]);
  // The cut lies on the centre line of the stile between the second and the third cabinet: 1 + 1200, half the 38 each side.
  const [one, two] = boards;
  assert.equal(one.cnc.pockets[1].x2, 1182, 'the second opening ends 19 short of the cut');
  assert.equal(two.cnc.pockets[0].x1, 19, 'the third begins 19 after it');
  assert.ok(boards.every((p) => p.w <= P.inframe.boardMax));
});

// ═══ THE BOM AND THE LABELS ═══════════════════════════════════════════════

test('F3 · the BOM: one FRAME line under the run\'s owner, MDF 25, its own part (In-frame frames)', () => {
  const { a, w } = mockup();
  const bom = buildBom(S().allResults(), { design: S().project.design, profile: P, materials: [] });
  const rows = bom.units.flatMap((u) => u.rows.filter((r) => r.role === 'frame').map((r) => [u.unitNum, r.id, r.w, r.h, r.thickness, r.material_role]));
  assert.deepEqual(rows, [['01', 'FRAME', 1920, 808, 25, 'front'], ['WU01', 'FRAME', 602, 758, 25, 'front']]);
  assert.equal(ELEMENT_TO_PART_ID.FRAME, 'frame');
  assert.equal(PART_REGISTRY.frame.group, 'front');
  assert.equal(PART_REGISTRY.frame.unit, 'm²');
  assert.ok(framesOf(a).length === 1 && framesOf(w).length === 1);
});

test('F3 · the labels: FRAME for one piece, FRAME-1 .. FRAME-n when joined', () => {
  assert.deepEqual(IF.pieceNames(1), ['FRAME']);
  assert.deepEqual(IF.pieceNames(3), ['FRAME-1', 'FRAME-2', 'FRAME-3']);
  assert.deepEqual(IF.pieceNames(2), L.call('inframe-piece-names', 2));
});

// ═══ WHERE THE FRAME STOPS ════════════════════════════════════════════════

test('F3 · the frame STOPS at a unit it does not stand on: two segments, 19 stiles at the split', () => {
  S().newProject('T80 F3 split');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  const a = S().addUnit('BUD', { wall: 0, x: 1000 }).id;
  const o = S().addUnit('OVEN_BASE', { wall: 0, x: 1600 }).id;
  const c = S().addUnit('BUD', { wall: 0, x: 2200 }).id;
  for (const id of [a, o, c]) S().updateUnitParams(id, { width: 600 });
  S().setDesign({ inframe: true });
  const runs = buildRuns(S().units, P);
  assert.equal(runs.filter((r) => r.mount === 'floor').length, 1, 'one run, the plinth\'s');
  assert.equal(S().runElements[o]?.frame, undefined, 'the oven housing has no frame');
  const left = S().runElements[a].frame;
  const right = S().runElements[c].frame;
  assert.equal(left.role, 'owner');
  assert.equal(right.role, 'owner');
  assert.deepEqual(left.ends.right, { kind: 'SPLIT', panel: 0, by: o, why: 'type' });
  assert.deepEqual(right.ends.left, { kind: 'SPLIT', panel: 0, by: o, why: 'type' });
  assert.deepEqual(left.stiles, [20, 19]);
  assert.deepEqual(right.stiles, [19, 20]);
  assert.equal(left.width, 600 + 1, 'flush at the split, 1 past the open end');
  // The oven's own params carry no in-frame.
  assert.deepEqual(framesOf(o), []);
});

// ═══ SAVE AND RELOAD: DERIVED, NEVER STORED ════════════════════════════════

test('F3 · the frame is derived, never stored: the saved units carry no frame, the reload cuts it again', () => {
  const { a } = mockup();
  const before = framesOf(a).map((p) => [p.id, p.w, p.h, p.box]);
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  assert.doesNotMatch(JSON.stringify(saved.units), /run_frame|"frame"/, 'no frame in the saved units');
  assert.equal(saved.project.design.inframe, true, 'the design key is what is stored');
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(framesOf(a).map((p) => [p.id, p.w, p.h, p.box]), before);
});

// ═══ IN-FRAME OFF IS MAIN ═════════════════════════════════════════════════

test('F3 · in-frame OFF is main: the switch back to lay-on leaves every unit\'s cut as a project that never had it', () => {
  const { a, b, c, w } = mockup({ inframe: false });
  const layon = Object.fromEntries([a, b, c, w].map((id) => [num(id), JSON.stringify(S().unitResult(id))]));
  S().setDesign({ inframe: true });
  assert.ok(framesOf(a).length === 1);
  S().setDesign({ inframe: false });
  for (const id of [a, b, c, w]) assert.equal(JSON.stringify(S().unitResult(id)), layon[num(id)], `${num(id)} is main again`);
  assert.equal('inframe' in S().project.design, false);
});
