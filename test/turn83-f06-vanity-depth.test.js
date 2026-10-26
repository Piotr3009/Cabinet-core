/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F6 . THE CARCASS TO THE WALL, THE VOID INSIDE THE CARCASS
//
// The owner, 25.10.2026 (22:41), after the eye-test of T82: *"jak mamy
// miejsce na rurki z tylu to super ze szuflady sa mniejsze ale carcas powinien
// byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do
// sciany"*. The turn's own law: **the carcass is to the wall**: a service void
// is room taken INSIDE the carcass, never air between the carcass and the
// wall.
//
// LISP FIRST: reference/lisp/KIT_VANITY.lsp D27 (and D5, D6, D7, D9, D15, D21
// amended): `vanity-wall-gap` is the house's clearance, `vanity-box-room` keeps
// the void behind every drawer box, `vanity-void-note` says where it is. The
// engine mirrors it (`engine/vanity.js vanityWallGap`, `vanityBoxRoom`,
// `vanityVoidNote`; `cabinet.js` snaps the box on the runner ladder over that
// room; `types.js defaultParamsFor` writes no `wall_gap`; `checks.js` #45).
//
// CLAUDE.md F6's test: a VANITY3 900 x 600 x 500: `wall_gap` 10, sides 500
// deep, boxes on the runner for 420 (the ladder's rung at or under 500 - 80),
// rails at the back; the chest (T82's columns rule) untouched.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { runChecks } from '../src/engine/checks.js';
import { wallGapOf } from '../src/engine/runs.js';
import { serviceVoidOf } from '../src/engine/worktop.js';
import {
  vanityBoxRoom, vanityBoxesOf, vanityTrapVerdict, vanityVoidNote, vanityWallGap,
} from '../src/engine/vanity.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { confirmDrawerBox } from './drawer-box-gate.js';
import { loadLisp } from './lisp-mini.js';
import { parenBalance } from '../scripts/t57-paren-balance.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const TEXT = readFileSync(`${ROOT}reference/lisp/KIT_VANITY.lsp`, 'utf8');
const L = loadLisp(TEXT);
const PROSE = TEXT.split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
const OWNER = 'jak mamy miejsce na rurki z tylu to super ze szuflady sa mniejsze ale carcas powinien byc do sciany, '
  + 'czyli wszystko w srodku carcasa mniejsze ale carcas do sciany';

const G = P.board.thickness;
const GB = P.wardrobe.drawers.boxSideThickness;
const FT = P.front.thickness;
const VOID = P.vanity.serviceVoidMm;
const CLEARANCE = P.room.wallBackClearance;
const LADDER = P.hardware.runner.movento.nominalLadder;
const OVER = P.hardware.runner.movento.nominalOverBoxMm;
const kit = (id, extra = {}) => computeCabinet({ ...defaultParamsFor(id, P), unit_num: 'VU01', ...extra }, P);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const boxParts = (r) => r.panels.filter((p) => p.role === 'drawer_box');
const S = () => useProjectStore.getState();

function room() {
  S().newProject('T83 F6');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  confirmDrawerBox();
}

// === THE LISP, FIRST =========================================================

test('F6 . KIT_VANITY.lsp: D27 in the owner\'s words, the amended notes, balanced, ASCII, no dash', () => {
  const b = parenBalance(TEXT);
  assert.equal(b.balance, 0);
  assert.equal(b.negativeAt, null);
  assert.ok(/^[\x00-\x7F]*$/.test(TEXT), 'ASCII');
  assert.doesNotMatch(TEXT, /[\u2013\u2014]/, 'no em or en dash');
  assert.match(TEXT, /^;;; D27 THE CARCASS TO THE WALL, THE VOID INSIDE/m);
  assert.ok(PROSE.includes(OWNER), 'the owner\'s words of 22:41, verbatim');
  assert.ok(PROSE.includes('a service void is room taken INSIDE the carcass, never air between the carcass and the wall'));
  for (const d of ['D5', 'D6', 'D7', 'D9', 'D15', 'D21']) {
    const at = TEXT.indexOf(`;;; ${d} `);
    const next = TEXT.indexOf(';;; D', at + 5);
    assert.match(TEXT.slice(at, next), /AMENDED[\s;]*25\.10\.2026[\s;,(]*T83 F6/, `${d} says it was amended tonight`);
  }
  for (const r of ['vanity-wall-gap', 'vanity-box-room', 'vanity-box-depth', 'vanity-boxes', 'vanity-void-note']) {
    assert.ok(L.has(r), `${r} defined`);
  }
});

test('F6 . the LISP\'s numbers: the wall gap is the clearance, the box keeps the void, the top 548, #45 inside', () => {
  assert.equal(L.call('vanity-wall-gap', CLEARANCE), CLEARANCE);
  assert.equal(L.call('vanity-wall-gap', CLEARANCE), 10);
  // D9 / D27: at most D - front - void, and the parent's D - G - 20.
  assert.equal(L.call('vanity-box-room', 500, G, FT, VOID), 395);
  assert.equal(L.call('vanity-box-room', 500, G, FT, 0), 462, 'vd 0 is the parent\'s D - G - 20');
  assert.equal(L.call('vanity-box-depth', 500, G, FT, VOID), 390);
  assert.equal(L.call('vanity-box-depth', 500, G, FT, 0), 440, 'the parent keeps its 450 runner');
  const [b] = L.call('vanity-boxes', 900, 600, 500, G, GB, FT, 3, 1, VOID);
  assert.deepEqual([b[6], b[7]], [390, 85], 'the box 390, its back face 85 from the carcass back');
  assert.equal(L.call('vanity-top-depth', 500, P.doors.gap, FT, P.autoParts.worktop.frontOverhang, 0), 548);
  assert.equal(L.call('vanity-void-note'), '#45 Service void 80 inside the vanity behind the drawers');
});

// === THE CARCASS TO THE WALL =================================================

test('F6 . VANITY3 900 x 600 x 500 is born at the wall: no wall_gap of its own, the house clearance, 10', () => {
  for (const id of ['VANITY2', 'VANITY3', 'VANITY4']) {
    const p = defaultParamsFor(id, P);
    assert.equal(p.wall_gap, undefined, `${id}: nothing written at birth`);
    assert.equal(wallGapOf({ type: id, params: p }, P), CLEARANCE, `${id}: like every unit`);
    assert.equal(serviceVoidOf({ type: id, params: p }, P), 0, `${id}: no air between the carcass and the wall`);
  }
  assert.equal(vanityWallGap(P), 10);
  assert.equal(vanityWallGap(P), L.call('vanity-wall-gap', CLEARANCE));
  // By the road the client clicks: the store's addUnit.
  room();
  const { id, error } = S().addUnit('VANITY3', { wall: 0, x: 1000 });
  assert.equal(error, null);
  const u = S().units.find((x) => x.id === id);
  assert.equal(u.params.wall_gap, undefined);
  assert.equal(wallGapOf(u, P), 10, 'wall_gap 10');
  const bud = S().addUnit('BUD', { wall: 0, x: 2000 }).id;
  assert.equal(wallGapOf(u, P), wallGapOf(S().units.find((x) => x.id === bud), P), 'the vanity\'s back line is the run\'s');
});

test('F6 . the carcass is 500 deep at the wall: the rails at the back, flush with the sides\' back edges, the sides to the front', () => {
  const r = kit('VANITY3');
  const carcass = r.panels.filter((p) => ['BUL', 'BUR', 'TOP', 'BOTTOM', 'RAIL-BOTTOM', 'RAIL-TOP'].includes(p.id));
  assert.equal(carcass.length, 6);
  const z0 = Math.min(...carcass.map((p) => p.box.z));
  const z1 = Math.max(...carcass.map((p) => p.box.z + p.box.d));
  assert.deepEqual([z0, z1], [0, 500], 'sides 500 deep with the rails: the typed depth, to the wall');
  for (const name of ['RAIL-BOTTOM', 'RAIL-TOP']) {
    const rail = byId(r, name);
    assert.deepEqual([rail.box.z, rail.box.d, rail.box.w, rail.box.h], [0, G, 900, 100], `${name} at the carcass back`);
  }
  for (const side of ['BUL', 'BUR']) {
    assert.equal(byId(r, side).box.z, G, `${side}'s back edge on the rails' inside face`);
    assert.equal(byId(r, side).box.z + byId(r, side).box.d, 500, `${side} to the carcass front`);
  }
  assert.equal(r.panels.filter((p) => p.part === 'BACK').length, 0, 'the back stays cut out (T82)');
});

// === THE VOID INSIDE: THE BOXES GIVE WAY =====================================

test('F6 . the boxes stand on the runner for 420: the ladder\'s rung at or under 500 - 80, the box 10 shorter (17.10)', () => {
  const r = kit('VANITY3');
  const rung = Math.max(...LADDER.filter((n) => n <= 500 - VOID));
  assert.equal(rung, 400);
  const sides = r.panels.filter((p) => p.part === 'DRAWER-SIDE');
  assert.equal(sides.length, 6);
  for (const s of sides) assert.equal(s.box.d, rung - OVER, `${s.id}: the box is the runner less ten`);
  assert.equal(r.derived.szufDl, 390);
  const pairs = r.hardware.find((h) => h.role === 'runner_pairs');
  assert.equal(pairs.qty, 3);
  assert.equal(pairs.spec.length_mm, 390);
  assert.equal(pairs.spec.nl, rung, 'the 400 runner is ordered');
  assert.equal(pairs.spec.on_ladder, true);
  // The box's back face keeps the void from the carcass back: no box board enters it.
  for (const p of boxParts(r)) assert.ok(p.box.z >= VOID - 1e-6, `${p.id} at z ${p.box.z} enters the void`);
  assert.equal(Math.min(...boxParts(r).map((p) => p.box.z)), 85);
  // The engine is the LISP: box for box.
  assert.deepEqual(vanityBoxesOf(r.panels, { n: 3, columns: 1 }).map((b) => [b.col, b.idx, b.x0, b.bw, b.side, b.base, b.depth, b.zBack]),
    L.call('vanity-boxes', 900, 600, 500, G, GB, FT, 3, 1, VOID));
  // The cut and the CNC follow: the sides and the bottoms are drawn 390 long.
  assert.equal(byId(r, 'D1-SL').cnc.drawn_h, 390);
  assert.deepEqual([byId(r, 'D1-DNO').w, byId(r, 'D1-DNO').h], [831, 390]);
});

test('F6 . the void holds at every depth: the engine\'s room is the LISP\'s, every back face 80 or more from the back', () => {
  for (const D of [420, 450, 480, 490, 495, 500, 505, 530, 560, 600, 650]) {
    for (const frontT of [18, 22, 25]) {
      assert.equal(vanityBoxRoom({ D, G, frontT }, P), L.call('vanity-box-room', D, G, frontT, VOID), `${D} / ${frontT}`);
    }
    const r = kit('VANITY3', { depth: D, sinks: 0 });
    const lisp = L.call('vanity-boxes', 900, 600, D, G, GB, FT, 3, 1, VOID);
    assert.deepEqual(vanityBoxesOf(r.panels, { n: 3, columns: 1 }).map((b) => [b.depth, b.zBack]), lisp.map((b) => [b[6], b[7]]), `D ${D}`);
    for (const b of lisp) assert.ok(b[7] >= VOID, `D ${D}: the box's back face at ${b[7]}`);
    // ...and it is the longest rung that keeps it.
    const longer = LADDER.find((n) => n - OVER > lisp[0][6]);
    if (longer != null) assert.ok(D - FT - (longer - OVER) < VOID || longer - OVER > D - G - 20, `D ${D}: ${longer} would have kept the void`);
  }
});

test('F6 . the fronts unchanged, the rails at the back, the pipes behind the boxes through the open back', () => {
  const r = kit('VANITY3');
  const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT').map((p) => [p.box.x, p.box.y, p.box.z, p.w, p.h, p.thickness]);
  assert.deepEqual(fronts, [[1.5, 0, 503, 897, 197, 25], [1.5, 200, 503, 897, 197, 25], [1.5, 400, 503, 897, 197, 25]]);
  // The room for the pipes: between the sides, between the rails (y 100 to 500), from the carcass back to the
  // boxes' back faces (z 0 to 85): no board of the carcass or the boxes stands in it.
  const box = { x0: G, x1: 900 - G, y0: 100, y1: 500, z0: 0, z1: 85 };
  const inside = (p) => p.box.x < box.x1 && p.box.x + p.box.w > box.x0
    && p.box.y < box.y1 && p.box.y + p.box.h > box.y0
    && p.box.z < box.z1 && p.box.z + p.box.d > box.z0;
  assert.deepEqual(r.panels.filter((p) => p.material_role !== 'front' && inside(p)).map((p) => p.id), []);
});

test('F6 . the trap\'s U is cut from the shorter box\'s back face: it reaches 205, and #39 reads it there', () => {
  const r = kit('VANITY3', { sinks: 1 });
  const dno = byId(r, 'D3-DNO');
  assert.ok(dno.meta?.vanityTrap, 'the U is cut in the top box');
  const boxes = vanityBoxesOf(r.panels, { n: 3, columns: 1 });
  const top = boxes.find((b) => b.idx === 3);
  assert.equal(top.zBack + P.vanity.trapDepthMm, 205);
  // The sentence is the LISP's for whatever waste the profile sets (V2's F8 moves it, CLAUDE.md F8).
  const zw = P.vanity.wasteFromBackMm;
  const lisp = (L.call('vanity-trap-verdict', 900, 600, 500, G, GB, FT, 3, 1, 1) || []).map((e) => e[2]);
  const engine = vanityTrapVerdict({ boxes, n: 3, columns: 1, sinks: 1, W: 900, GB }, P).map((v) => v.sentence);
  assert.deepEqual(engine, lisp);
  assert.equal(engine.some((s) => /beyond the U/.test(s)), zw > 205, `the waste at ${zw}`);
});

// === THE WORKTOP TO THE WALL OVER THE CARCASS ================================

test('F6 . the worktop reaches the wall over the carcass as any run\'s: 548, the fronts 10 under its edge', () => {
  room();
  const id = S().addUnit('VANITY3', { wall: 0, x: 1000 }).id;
  const slab = S().worktopsOf().find((w) => (w.geometry?.unitIds || []).includes(id));
  assert.ok(slab, 'the vanity is born under its top (T82 F10)');
  const g = slab.geometry;
  assert.equal(g.z, 0, 'flush at the wall');
  assert.equal(g.d, 500 + P.doors.gap + FT + P.autoParts.worktop.frontOverhang);
  assert.equal(g.d, 548);
  assert.equal(g.d - (wallGapOf(S().units.find((u) => u.id === id), P) + 500 + P.doors.gap + FT), 10);
});

// === CHECK #45: THE VOID IS INSIDE, BEHIND THE DRAWERS =======================

test('F6 . #45 says "Service void 80 inside the vanity behind the drawers", a note, once a vanity', () => {
  assert.equal(vanityVoidNote(P), 'Service void 80 inside the vanity behind the drawers.');
  assert.equal(`#45 ${vanityVoidNote(P).replace(/\.$/, '')}`, L.call('vanity-void-note'));
  room();
  const v = S().addUnit('VANITY3', { wall: 0, x: 1000 }).id;
  S().addUnit('BUDR', { wall: 0, x: 2000 });
  const found = S().runChecks().filter((f) => f.check === 45);
  assert.equal(found.length, 1, 'one vanity, one note; the drawer base none');
  assert.equal(found[0].unitId, v);
  assert.equal(found[0].level, 'note');
  assert.match(found[0].message, /Service void 80 inside the vanity behind the drawers\.$/);
  // By the engine alone too.
  const unit = { id: 'u1', type: 'VANITY3', params: { ...defaultParamsFor('VANITY3', P), unit_num: 'VU01' } };
  const said = runChecks({ entries: [{ unit, result: kit('VANITY3') }], units: [unit], profile: P }).filter((f) => f.check === 45);
  assert.equal(said.length, 1);
});

// === THE CHEST AND THE PARENT, UNTOUCHED =====================================

test('F6 . the chest (T82\'s columns rule) and the drawer base read no void: their boxes are the parent\'s', () => {
  const noVoid = { ...P, vanity: { ...P.vanity, serviceVoidMm: 0 } };
  for (const id of ['WARDROBE_CHEST2', 'WARDROBE_CHEST3', 'WARDROBE_CHEST4']) {
    for (const extra of [{}, { columns: 2, drawer_split: 'equal' }]) {
      const params = { ...defaultParamsFor(id, P), unit_num: '01', ...extra };
      assert.deepEqual(computeCabinet(params, noVoid), computeCabinet(params, P), `${id} ${JSON.stringify(extra)} read the void`);
      assert.equal(defaultParamsFor(id, P).wall_gap, undefined);
    }
  }
  // The chest at columns 2 is the LISP's section 5(c2) with vd 0.
  const chest = computeCabinet({ ...defaultParamsFor('WARDROBE_CHEST3', P), unit_num: '01', columns: 2, drawer_split: 'equal' }, P);
  const lisp = L.call('vanity-boxes', 800, 647, 568, G, GB, FT, 3, 2, 0);
  assert.deepEqual(vanityBoxesOf(chest.panels, { n: 3, columns: 2 }).map((b) => b.depth), lisp.map((b) => b[6]));
  // The drawer base keeps its 450 runner at 500.
  for (const type of ['BUDR', 'BUDR2', 'BUDR4']) {
    const budr = computeCabinet({ ...defaultParamsFor(type, P), width: 900, height: 600, depth: 500 }, P);
    assert.equal(byId(budr, 'D1-SL').box.d, 440, `${type}: the parent's box`);
    assert.equal(byId(budr, 'D1-SL').box.z, 35, `${type}: its back face where it was`);
  }
});

// === SAVE AND RELOAD =========================================================

test('F6 . a T82 vanity saved with the void in its wall gap (90) loads at the wall; a gap typed since stands', () => {
  room();
  const a = S().addUnit('VANITY3', { wall: 0, x: 500 }).id;
  const b = S().addUnit('VANITY3', { wall: 0, x: 1600 }).id;
  const project = JSON.parse(JSON.stringify(S().project));
  const units = JSON.parse(JSON.stringify(S().units));
  units.find((u) => u.id === a).params.wall_gap = CLEARANCE + VOID;   // as T82 wrote it at birth
  units.find((u) => u.id === b).params.wall_gap = 50;                 // as a joiner typed it
  S().loadProject(project, units);
  const A = S().units.find((u) => u.id === a);
  const B = S().units.find((u) => u.id === b);
  assert.equal(A.params.wall_gap, undefined, 'T82\'s birth number is dropped');
  assert.equal(wallGapOf(A, P), 10, 'it stands at the wall');
  assert.equal(B.params.wall_gap, 50, 'what was typed is his');
  // A save and a reload of the new vanity keep it at the wall.
  const again = JSON.parse(JSON.stringify(S().units));
  S().loadProject(JSON.parse(JSON.stringify(S().project)), again);
  assert.equal(wallGapOf(S().units.find((u) => u.id === a), P), 10);
  assert.equal(byId(S().unitResult(a), 'D1-SL').box.d, 390, 'the boxes as cut');
});
