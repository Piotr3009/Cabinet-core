/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F10, F11, F12 · THE VANITY'S TOP, ITS BASIN, ITS SERVICE VOID
//
// The owner, 25.10.2026 (12:57): *"dodanie blat grubosc do wyboru"*, *"dodanie
// 1 sink or 2 sink? dodajesz tylko do widoku"*, *"nastepnie to bedzie miejsce
// z tylu na rurki minimum potrzebujemy okolo 80 mm do 100 mm"*; and at 13:03
// over the mockup (verify/t82/mockups/vanity.png): *"3 - 80"*, *"5 - blat
// osobny element jak worktop"*.
//
// CLAUDE.md T82:
//   F10 the vanity's top is the house WORKTOP, its thickness typed, its depth
//       reaching the WALL line over the service void (d = the unit's reach +
//       the void + the front overhang); a vanity born in a room gets its
//       worktop at birth.
//   F11 sinks 1 or 2: a basin solid to the eye (oval 520 x 400 x 150 from
//       profile.vanity.basin), one centred, two at the column centres (or at a
//       third and two thirds of the width for one column); the worktop's
//       cut-out on the plan; nothing in the cut list, nothing on the CNC. The
//       waste centre (the trap's centre of F8(d)) is x at the basin centre, z
//       at vanity.wasteFromBack from the carcass back.
//   F12 the plan draws the void hatched (SERVICE_VOID), the section the two
//       rails and the void; the Check lists the void as a NOTE, never a fault
//       (CLAUDE.md's #40, numbered #45 this turn: BRIEF section 6).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { migrateDesign } from '../src/engine/design.js';
import { wallGapOf } from '../src/engine/runs.js';
import {
  basinCentresOf, fitBasins, serviceVoidOf, worktopEligible, worktopGeometry, worktopsFor,
} from '../src/engine/worktop.js';
import { vanitySpec, vanityWastes } from '../src/engine/vanity.js';
import { buildBom } from '../src/engine/bom.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { CHECKS, checkSummary } from '../src/engine/checks.js';
import { DRAWING_LAYERS, LAYER_ORDER } from '../src/engine/drawings/layers.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { buildPlan } from '../src/engine/drawings/setPlan.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { buildStation, hatchLines, sectionStations } from '../src/engine/drawings/setSection.js';
import { confirmDrawerBox } from './drawer-box-gate.js';

const S = () => useProjectStore.getState();
const P = () => getCabinetProfile();
const V = () => P().vanity || {};
const near = (a, b, eps = 0.01) => Math.abs(Number(a) - Number(b)) <= eps;

/** The numbers, read from the profile (B1 writes them; CLAUDE.md's PROPOSED values as the floor). */
const VOID = () => vanitySpec(P()).serviceVoidMm;
const BASIN = () => {
  const b = V().basin || {};
  return { w: Number(b.widthMm), d: Number(b.depthMm), h: Number(b.heightMm) };
};
const WASTE_FROM_BACK = () => vanitySpec(P()).wasteFromBackMm;
const CLEARANCE = () => Math.max(0, Number(P().room?.wallBackClearance) || 0);

function room() {
  S().newProject('T82 F10 vanity');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  confirmDrawerBox();
}

/** One vanity on wall A at x 1000, its params applied after birth (as the right panel writes them). */
function vanity(type = 'VANITY3', params = {}) {
  room();
  const res = S().addUnit(type, { wall: 0, x: 1000 });
  assert.ok(res?.id, `the ${type} was refused: ${res?.error}`);
  if (Object.keys(params).length) S().updateUnitParams(res.id, params);
  return res.id;
}

const unitOf = (id) => S().units.find((u) => u.id === id);
const records = () => migrateDesign(S().project.design).worktops;
const slabOver = (id) => S().worktopsOf().find((w) => (w.geometry?.unitIds || []).includes(id));
const basinsOf = (slab) => (slab?.cutouts || []).filter((c) => c.kind === 'basin');
const entryOf = (id) => S().allResults().find((e) => e.unit.id === id);

/** The plan of the room as the Drawings window builds it, at 1:20. */
const planOf = (which) => buildPlan(S().allResults(), {
  which, room: S().project.room, worktops: S().worktopsOf().map((w) => w.geometry || w), profile: P(), ctx: drawingContext(20, P()),
});

/** The section station through one unit, at 1:20. */
function sectionOf(id) {
  const group = wallGroups(S().allResults(), P())[0];
  const st = sectionStations(group, { chosenId: id }).find((x) => x.member.unit.id === id);
  assert.ok(st, 'a station through the unit');
  return buildStation(group, st, {
    room: S().project.room, worktops: worktopsOnWall(S().worktopsOf(), 0), profile: P(), ctx: drawingContext(20, P()),
  });
}

// ─── F10 · THE TOP IS A WORKTOP ────────────────────────────────────────────

test('F10 · a vanity born in a room gets its worktop at birth: one record over the one unit, the kind a set gives', () => {
  const id = vanity('VANITY3');
  const mine = records().filter((w) => w.unitIds.includes(id));
  assert.equal(mine.length, 1, 'one worktop record over the vanity');
  assert.deepEqual(mine[0].unitIds, [id]);
  assert.equal(mine[0].kind, 'top', 'the one cabinet a top is laid on (T75 F20)');
  // Its thickness is the vanity's own default top (profile.vanity.defaults, PROPOSED 20).
  const top = Number(V().defaults.top);
  assert.equal(slabOver(id).geometry.thickness, top);
});

test('F10 · its depth reaches the WALL over the carcass, as any run\'s: the unit\'s reach + the front overhang (T83 F6)', () => {
  const id = vanity('VANITY3');
  const u = unitOf(id);
  // AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
  // the carcass stands at the clearance like every unit and the void is inside it (KIT_VANITY.lsp D6, D27); the slab
  // reaches the wall over the carcass as any run's, 548 (T82: the clearance + 80 off the wall, the slab 628 over the void).
  assert.equal(wallGapOf(u, P()), CLEARANCE(), 'the carcass stands at the clearance (F8(b))');
  assert.equal(serviceVoidOf(u, P()), 0, 'no air between the carcass and the wall');
  const g = slabOver(id).geometry;
  const reach = Number(u.params.depth) + (Number(P().doors?.gap) || 0) + (Number(u.params.front_t) || 0);
  const over = Number(P().autoParts?.worktop?.frontOverhang ?? 20);
  assert.equal(g.z, 0, 'flush at the wall: nothing hangs over a wall');
  assert.ok(near(g.d, reach + over), `d ${g.d} = ${reach} + ${over}`);
  assert.ok(near(g.d, 548), `d ${g.d}: 500 + 3 + 25 + 20`);
  // The slab's front edge stands as proud of the vanity's front as any slab of
  // the house stands of its run's (T30's law, the clearance included).
  // DECIDED after the review of PART B (topbasin 0): this 628 (900 x 500 x 600,
  // front 25, wall gap 90) is the house worktop's law, not the 638 the LISP's
  // vanity-top-depth first gave: the vanity's top IS the house worktop, the
  // fronts 10 under its edge as under every kitchen slab. KIT_VANITY.lsp D7 is
  // amended to say so (slice B1, the same fix round). T83 F6: the same law at
  // the wall, 548 (D7 AMENDED), the fronts still 10 under its edge.
  const front = wallGapOf(u, P()) + reach;
  assert.ok(near(g.d - front, over - CLEARANCE()), 'the same overhang past the fronts as a kitchen slab');
});

test('F10 · the void is the vanity\'s alone: a kitchen slab is exactly what it was', () => {
  room();
  const a = S().addUnit('BUD', { wall: 0, x: 1000 }).id;
  const b = S().addUnit('BUD', { wall: 0, x: 1600 }).id;
  const g = worktopGeometry({ units: [unitOf(a), unitOf(b)], profile: P() });
  const u = unitOf(a);
  assert.equal(serviceVoidOf(u, P()), 0, 'no void behind a base unit');
  assert.equal(g.d, Number(u.params.depth) + (Number(P().doors?.gap) || 0) + (Number(u.params.front_t) || 0) + P().autoParts.worktop.frontOverhang);
});

test('F10 · the thickness is typed (*"blat grubosc do wyboru"*): the record\'s own, and a nonsense number refused in words', () => {
  const id = vanity('VANITY3');
  const rec = records().find((w) => w.unitIds.includes(id));
  const ok = S().setWorktopThickness(rec.id, 30);
  assert.equal(ok.ok, true);
  assert.equal(slabOver(id).geometry.thickness, 30);
  assert.equal(slabOver(id).geometry.h, 30);
  const bad = S().setWorktopThickness(rec.id, 0);
  assert.equal(bad.ok, false);
  assert.match(bad.error, /thickness/i, 'said in words');
  assert.equal(slabOver(id).geometry.thickness, 30, 'and nothing changed');
});

// ─── F10 · AFTER THE REVIEW (verify/t82 review of PART B, topbasin 1 to 3) ─

/** An island in a 5000 x 4000 room, two BUDs on face A under the island's one slab. */
function islandKitchen() {
  S().newProject('T82 F10 island');
  S().setRoom({ corners: rectCorners(5000, 4000), height: 2500 });
  confirmDrawerBox();
  const isle = S().addIsland().id;
  const face = (f) => roomWalls(S().project.room).find((w) => w.island && w.face === f);
  const a = S().addUnit('BUD', { wall: face('A').index }).id;
  const b = S().addUnit('BUD', { wall: face('A').index }).id;
  const add = S().addWorktop([a, b]);
  assert.equal(add.ok, true, add.error);
  return {
    isle, face, a, b, wt: add.id,
  };
}

test('F10 · review 1: a vanity born on an island face JOINS the island\'s top, never replaces it (its decor, its seating stay)', () => {
  const { isle, face, a, wt } = islandKitchen();
  S().extendWorktop(wt, { decor: 'OAK' });
  S().extendIslandWorktop(wt, 'B', 300);
  const v = S().addUnit('VANITY2', { wall: face('E2').index }).id;
  assert.ok(v, 'the vanity stands on face E2');
  const mine = records().filter((w) => w.island === isle);
  assert.equal(mine.length, 1, 'one island record, still');
  assert.equal(mine[0].id, wt, 'the same record');
  assert.equal(mine[0].decor, 'OAK', 'its decor kept');
  assert.equal(mine[0].extend.B, 300, 'its seating overhang kept');
  assert.ok(mine[0].unitIds.includes(a) && mine[0].unitIds.includes(v), 'the vanity joins it');
  assert.equal(mine[0].thickness, undefined, 'the island\'s thickness is not the vanity\'s to change at birth');
});

test('F10 · review 1: a vanity alone on an island takes the island\'s top at its own thickness', () => {
  S().newProject('T82 F10 lone island');
  S().setRoom({ corners: rectCorners(5000, 4000), height: 2500 });
  confirmDrawerBox();
  const isle = S().addIsland().id;
  const faceA = roomWalls(S().project.room).find((w) => w.island && w.face === 'A');
  const v = S().addUnit('VANITY3', { wall: faceA.index }).id;
  const mine = records().filter((w) => w.island === isle);
  assert.equal(mine.length, 1);
  assert.ok(mine[0].unitIds.includes(v));
  assert.equal(slabOver(v).geometry.shape, 'island');
});

test('F10 · review 2: a lone vanity gets its top back after Remove, through the gate and the Add worktop road', () => {
  const id = vanity('VANITY3');
  const rec = records().find((w) => w.unitIds.includes(id));
  S().removeWorktop(rec.id);
  assert.equal(slabOver(id), undefined, 'removed');
  const gate = worktopEligible([unitOf(id)], P(), { walls: roomWalls(S().project.room) });
  assert.equal(gate.ok, true, `a vanity takes its own top: ${gate.why}`);
  // The right panel's own button: addWorktop([unit.id]), no `single`.
  const res = S().addWorktop([id]);
  assert.equal(res.ok, true, res.error);
  const back = records().find((w) => w.unitIds.includes(id));
  assert.equal(back.kind, 'top');
  assert.equal(slabOver(id).geometry.thickness, Number(V().defaults.top), 'at the vanity\'s own top thickness');
  assert.equal(basinsOf(slabOver(id)).length, 1, 'and its basin with it');
});

test('F10 · review 2: two vanities under one top, one deleted: the other keeps its top and its basin', () => {
  room();
  const a = S().addUnit('VANITY3', { wall: 0, x: 1000 }).id;
  const b = S().addUnit('VANITY3', { wall: 0, x: 1900 }).id;
  const res = S().addWorktop([a, b]);
  assert.equal(res.ok, true, res.error);
  assert.equal(basinsOf(slabOver(a)).length, 2);
  S().removeUnit(b);
  const slab = slabOver(a);
  assert.ok(slab, 'the survivor keeps its top');
  assert.equal(basinsOf(slab).length, 1);
});

test('F10 · review 3: an island\'s slab reads the record\'s thickness: the vanity\'s typed top is the slab\'s', () => {
  S().newProject('T82 F10 island thickness');
  S().setRoom({ corners: rectCorners(5000, 4000), height: 2500 });
  confirmDrawerBox();
  S().addIsland();
  const faceA = roomWalls(S().project.room).find((w) => w.island && w.face === 'A');
  const v = S().addUnit('VANITY3', { wall: faceA.index }).id;
  const rec = records().find((w) => w.unitIds.includes(v));
  assert.equal(slabOver(v).geometry.h, Number(V().defaults.top), 'born at the vanity\'s 20');
  assert.equal(S().setWorktopThickness(rec.id, 30).ok, true);
  const g = slabOver(v).geometry;
  assert.equal(g.h, 30);
  assert.equal(g.thickness, 30);
  const bom = buildBom(S().allResults(), { design: migrateDesign(S().project.design), profile: P(), room: S().project.room });
  const row = bom.units.find((x) => x.unitId === 'worktops').rows.find((r) => r.part === 'WORKTOP');
  assert.equal(row.thickness, 30, 'the BOM line says what the slab is');
});

test('F10 · review 3: an island record with no thickness of its own is the profile\'s, as it always was', () => {
  islandKitchen();
  const g = S().worktopsOf()[0].geometry;
  assert.equal(g.shape, 'island');
  assert.equal(g.h, P().autoParts.worktop.thickness);
});

// ─── F11 · THE BASIN, ONLY TO THE EYE ──────────────────────────────────────

test('F11 · sinks 0: no basin, no cut-out', () => {
  const id = vanity('VANITY3', { sinks: 0 });
  assert.deepEqual(basinCentresOf(unitOf(id), P()), []);
  assert.equal(basinsOf(slabOver(id)).length, 0);
});

test('F11 · one sink is centred; its waste is the basin\'s centre, wasteFromBack off the carcass back', () => {
  const id = vanity('VANITY3', { sinks: 1 });
  const u = unitOf(id);
  const W = Number(u.params.width);
  const c = basinCentresOf(u, P());
  assert.equal(c.length, 1);
  assert.ok(near(c[0].x, W / 2));
  assert.ok(near(c[0].z, WASTE_FROM_BACK()));
  // On the slab: an oval cut-out of the basin's size, centred there, in the wall's frame.
  const [cut] = basinsOf(slabOver(id));
  assert.ok(cut, 'the worktop carries the basin\'s cut-out');
  assert.equal(cut.shape, 'oval');
  assert.equal(cut.w, BASIN().w);
  assert.equal(cut.d, BASIN().d);
  assert.ok(near(cut.x + cut.w / 2, Number(u.position.x_mm) + W / 2));
  assert.ok(near(cut.z + cut.d / 2, wallGapOf(u, P()) + WASTE_FROM_BACK()));
  assert.equal(cut.machined, false, 'never machined: the basin is supplied by others');
});

test('F11 · two sinks on one column stand at a third and two thirds of the width (on a top they fit)', () => {
  const id = vanity('VANITY3', { sinks: 2, columns: 1, width: 1620 });
  const u = unitOf(id);
  const W = Number(u.params.width);
  const xs = basinCentresOf(u, P()).map((c) => c.x);
  assert.equal(xs.length, 2);
  assert.ok(near(xs[0], W / 3) && near(xs[1], (2 * W) / 3), `${xs}`);
  assert.equal(basinsOf(slabOver(id)).length, 2);
});

test('F11 · two sinks on two columns stand at the column centres, READ from the one source (vanity.js vanityWastes)', () => {
  const id = vanity('VANITY3', { sinks: 2, columns: 2, width: 1200 });
  const u = unitOf(id);
  const W = Number(u.params.width);
  const r = entryOf(id).result;
  assert.ok(r.panels.some((p) => p.part === 'VPART' || p.id === 'DIVIDER'), 'columns 2 cuts a divider (F8)');
  const xs = basinCentresOf(u, P()).map((c) => c.x);
  assert.deepEqual(xs, vanityWastes({ W, columns: 2, sinks: 2 }), 'the basins stand on the LISP\'s wastes');
  assert.ok(near(xs[0], W / 4) && near(xs[1], (3 * W) / 4), `${xs}`);
  // And the U the LISP cut for each: centred on its basin (the trap round the waste).
  const cuts = basinsOf(slabOver(id)).map((c) => c.cx - Number(u.position.x_mm));
  assert.deepEqual(cuts, xs);
});

test('F11 · the basin stands where the trap\'s U was cut: the U in the top box is centred on the basin', () => {
  for (const [sinks, columns] of [[1, 1], [2, 1], [2, 2]]) {
    const id = vanity('VANITY3', { sinks, columns });
    const u = unitOf(id);
    const trap = entryOf(id).result.derived?.vanity?.trap;
    assert.ok(trap, 'the engine says where it cut the U (derived.vanity.trap)');
    const xs = basinCentresOf(u, P()).map((c) => c.x);
    assert.deepEqual(trap.wastes, xs, `sinks ${sinks}, columns ${columns}: the wastes are the basins`);
    for (const cut of trap.cuts) {
      cut.us.forEach((one, k) => {
        assert.ok(near((one.from + one.to) / 2, cut.centres[k]));
        assert.ok(xs.some((x) => near(x, cut.centres[k])), `the U at ${cut.centres[k]} stands under a basin`);
      });
    }
    assert.equal(trap.wasteFromBackMm, basinCentresOf(u, P())[0].z);
  }
});

test('F11 · one sink on two columns is centred all the same ("one centred")', () => {
  const id = vanity('VANITY3', { sinks: 1, columns: 2 });
  const u = unitOf(id);
  const xs = basinCentresOf(u, P()).map((c) => c.x);
  assert.equal(xs.length, 1);
  assert.ok(near(xs[0], Number(u.params.width) / 2));
});

test('F11 · nothing in the cut list and nothing on the CNC from a basin: the parts of sinks 0, 1 and 2 are one list', () => {
  const ids = {};
  const parts = {};
  const files = {};
  for (const sinks of [0, 1, 2]) {
    const id = vanity('VANITY3', { sinks, width: 1620 });
    ids[sinks] = id;
    const r = entryOf(id).result;
    // The one difference the sinks make is the TRAP's (F8(d), B2's cut): the
    // top box's back wall split round the U into its pieces, {tag}-BB-k. Folded
    // back to the wall they came from, the lists are one: the basin adds nothing.
    const wall = (pid) => pid.replace(/-BB-\d+$/, '-BB');
    parts[sinks] = [...new Set(r.panels.map((p) => wall(p.id)))].sort();
    files[sinks] = [...new Set(buildUnitDxfFiles(r, P()).map((f) => wall(f.panelId)))].sort();
    assert.ok(!r.panels.some((p) => /BASIN/i.test(`${p.id} ${p.part}`)), 'no basin board');
    assert.ok(!files[sinks].some((f) => /BASIN/i.test(f)), 'no basin file');
    const bom = buildBom(S().allResults(), {
      design: migrateDesign(S().project.design), profile: P(), room: S().project.room,
    });
    assert.ok(!bom.cutRows.some((row) => /BASIN/i.test(`${row.id} ${row.part}`)), 'no basin on the cut list');
    // The basin's cut-out is a NOTE under the worktop, one per basin, as the sink's is (T75 F5).
    const wt = bom.units.find((x) => x.unitId === 'worktops');
    const notes = (wt?.rows || []).filter((row) => row.part === 'WORKTOP-CUTOUT' && /basin/i.test(row.id));
    assert.equal(notes.length, sinks);
    assert.ok(notes.every((row) => row.material_role === 'note' && row.area_m2 === 0));
  }
  assert.deepEqual(parts[1], parts[0]);
  assert.deepEqual(parts[2], parts[0]);
  assert.deepEqual(files[1], files[0]);
  assert.deepEqual(files[2], files[0]);
});

test('F11 · the basins follow the vanity: a save and a reload keep them, sinks 0 takes them away', () => {
  const id = vanity('VANITY3', { sinks: 2, columns: 1, width: 1620 });
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject('somewhere else');
  S().loadProject(saved.project, saved.units);
  assert.equal(basinsOf(slabOver(id)).length, 2, 'the reload draws the same two');
  S().updateUnitParams(id, { sinks: 0 });
  assert.equal(basinsOf(slabOver(id)).length, 0);
  assert.equal(records().filter((w) => w.unitIds.includes(id)).length, 1, 'the top stays');
});

test('F11 · worktopsFor alone (no store) gives the same basins: one law, one path', () => {
  const id = vanity('VANITY4', { sinks: 1 });
  const slabs = worktopsFor({ records: records(), units: S().units, profile: P() });
  const fromStore = basinsOf(slabOver(id));
  const pure = basinsOf(slabs.find((w) => (w.geometry?.unitIds || []).includes(id)));
  assert.deepEqual(pure, fromStore);
});

// ─── F11 · THE BASINS THAT DO NOT FIT: SAID, NEVER SQUASHED ────────────────
//
// CLAUDE.md T82's law: *"The room refuses in words, the engine never
// squashes"*. A basin is cut into the top only where its oval lies wholly
// inside the slab with the cut-out margin (worktop.cutout.insetMm) and clear of
// the ovals cut before it; one that does not fit is not cut, not drawn, not
// listed, and Check #48 says what would let it in. Nothing moves, nothing
// shrinks: the wastes (and the trap's U) stay the LISP's.

const MARGIN = () => P().autoParts.worktop.cutout?.insetMm ?? 20;
// T82 F9, after the review (B2): #48 also says the BOWL (KIT_VANITY.lsp D25,
// `bowl: true`); these are the basins the top cannot take.
const findings48 = () => S().runChecks().filter((f) => f.check === 48 && !f.bowl);

/** Every basin cut lies inside its slab with the margin and clear of the others: the room's own rule. */
function assertBasinsFit(slab) {
  const g = slab.geometry;
  const m = MARGIN();
  const cut = basinsOf(slab);
  for (const c of cut) {
    assert.ok(c.x >= g.x + m - 1e-6 && c.x + c.w <= g.x + g.w - m + 1e-6, `basin x ${c.x}..${c.x + c.w} inside ${g.x}..${g.x + g.w}`);
    assert.ok(c.z >= (g.z || 0) + m - 1e-6 && c.z + c.d <= (g.z || 0) + g.d - m + 1e-6, 'and in depth');
  }
  for (let i = 0; i < cut.length; i += 1) {
    for (let j = i + 1; j < cut.length; j += 1) {
      const a = cut[i]; const b = cut[j];
      const rx = a.w / 2 + m / 2; const rz = a.d / 2 + m / 2;
      assert.ok(((a.cx - b.cx) / rx) ** 2 + ((a.cz - b.cz) / rz) ** 2 >= 4 - 1e-6, 'two basins clear of each other');
    }
  }
}

test('F11 · two 520 basins on one 900 column overlap: the second is not cut, and #48 says what lets it in', () => {
  const id = vanity('VANITY3', { sinks: 2, columns: 1 });
  const u = unitOf(id);
  const slab = slabOver(id);
  const cut = basinsOf(slab);
  assert.equal(cut.length, 1, 'the first is cut, the one that meets it is not');
  assert.ok(near(cut[0].cx - Number(u.position.x_mm), 300), 'where the LISP put it: nothing moved');
  assertBasinsFit(slab);
  const [f] = findings48();
  assert.ok(f, '#48 said');
  assert.equal(f.level, 'yellow');
  assert.equal(f.unitId, id);
  assert.equal(f.message, `VU01: Two basins ${BASIN().w} wide do not fit the top of a 900 vanity: make the vanity 1620 wide or take one basin.`);
  // The trap's U is the LISP's and follows `sinks`: both wastes stand (the engine never squashes).
  assert.deepEqual(entryOf(id).result.derived.vanity.trap.wastes, [300, 600]);
  // The width it names lets both in, and 10 less does not.
  S().updateUnitParams(id, { width: 1620 });
  assert.equal(basinsOf(slabOver(id)).length, 2);
  assert.equal(findings48().length, 0);
  S().updateUnitParams(id, { width: 1610 });
  assert.equal(basinsOf(slabOver(id)).length, 1);
  // ...and one basin is the other way out.
  S().updateUnitParams(id, { width: 900, sinks: 1 });
  assert.equal(basinsOf(slabOver(id)).length, 1);
  assert.equal(findings48().length, 0);
});

test('F11 · on two columns of 900 both ovals pass the vanity\'s ends: none is cut, #48 names 1120', () => {
  const id = vanity('VANITY3', { sinks: 2, columns: 2 });
  assert.equal(basinsOf(slabOver(id)).length, 0);
  const [f] = findings48();
  assert.equal(f.message, `VU01: Two basins ${BASIN().w} wide do not fit the top of a 900 vanity: make the vanity 1120 wide or take one basin.`);
  assert.deepEqual(f.basins, { asked: 2, cut: 0, why: 'width', need: { width: 1120 } });
  S().updateUnitParams(id, { width: 1120 });
  assertBasinsFit(slabOver(id));
  assert.equal(basinsOf(slabOver(id)).length, 2);
});

test('F11 · one basin on a narrow vanity, and on a shallow one: the width, the depth', () => {
  const id = vanity('VANITY3', { sinks: 1, width: 500 });
  assert.equal(basinsOf(slabOver(id)).length, 0);
  assert.equal(findings48()[0].message, `VU01: A basin ${BASIN().w} wide does not fit the top of a 500 vanity: make the vanity 560 wide.`);
  S().updateUnitParams(id, { width: 560 });
  assert.equal(basinsOf(slabOver(id)).length, 1);
  S().updateUnitParams(id, { width: 900, depth: 350 });
  assert.equal(basinsOf(slabOver(id)).length, 0);
  const [f] = findings48();
  // AMENDED BY T83 F8 (25.10.2026, 22:41): *"umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie wchodzi w drugi material"*: the waste at 250
  // (T82: 200) asks 50 more of depth: 440 (T82: 390).
  assert.equal(f.message, `VU01: A basin ${BASIN().d} deep does not fit the top of a 350 deep vanity: make the vanity 440 deep.`);
  S().updateUnitParams(id, { depth: 440 });
  assert.equal(basinsOf(slabOver(id)).length, 1);
  assertBasinsFit(slabOver(id));
});

test('F11 · what is not cut is in no reader: the BOM notes, the plan and the bowls count the basins cut', () => {
  const id = vanity('VANITY3', { sinks: 2, columns: 1 });
  const bom = buildBom(S().allResults(), {
    design: migrateDesign(S().project.design), profile: P(), room: S().project.room,
  });
  const notes = bom.units.find((x) => x.unitId === 'worktops').rows.filter((row) => row.part === 'WORKTOP-CUTOUT');
  assert.equal(notes.length, 1, 'one note: the one basin cut');
  // Over every width a vanity is born at, every basin cut fits (the room's rule never fires).
  for (const width of [600, 800, 900, 1000, 1080, 1200, 1500, 1620, 1800]) {
    for (const [sinks, columns] of [[1, 1], [2, 1], [2, 2], [1, 2]]) {
      S().updateUnitParams(id, { width, sinks, columns });
      const slab = slabOver(id);
      assertBasinsFit(slab);
      const asked = basinCentresOf(unitOf(id), P()).length;
      const said = findings48().length;
      assert.equal(said, basinsOf(slab).length < asked ? 1 : 0, `${width} ${sinks}/${columns}: #48 exactly when one is not cut`);
    }
  }
});

test('F11 · fitBasins is the one source: the vanity alone (as computeCabinet holds it) gives the slab\'s basins and #48\'s words', () => {
  // KIT_VANITY.lsp D18 (B1) cuts the carcass TOP for each FITTED basin and the
  // engine mirrors it (B2): it reads `fitBasins({ type, params }, profile).fitted`.
  for (const [width, sinks, columns] of [[900, 1, 1], [900, 2, 1], [900, 2, 2], [1120, 2, 2], [1620, 2, 1], [500, 1, 1]]) {
    const id = vanity('VANITY3', { width, sinks, columns });
    const u = unitOf(id);
    const plan = fitBasins({ type: u.type, params: u.params }, P());
    assert.equal(plan.basins.length, basinCentresOf(u, P()).length, 'every basin asked');
    const x0 = Number(u.position.x_mm); const back = wallGapOf(u, P());
    const cut = basinsOf(slabOver(id)).map((c) => [c.basin, near(c.cx - x0, 0) ? 0 : c.cx - x0, c.cz - back]);
    assert.deepEqual(cut, plan.fitted.map((b) => [b.n, b.cx, b.cz]), `${width} ${sinks}/${columns}: the slab cuts what fitBasins fits`);
    const said = findings48();
    assert.equal(said.length, plan.refusal ? 1 : 0);
    if (plan.refusal) assert.equal(said[0].message, plan.refusal.message);
    for (const b of plan.fitted) assert.ok(b.fits && b.w === BASIN().w && b.d === BASIN().d && b.h === BASIN().h);
  }
  // Not a vanity: nothing.
  assert.deepEqual(fitBasins({ type: 'BUD', params: {} }, P()), { basins: [], fitted: [], refusal: null });
});

test('F11 · the vanity\'s own top decides, whatever stands beside it: butted to a tall unit, the same basins', () => {
  room();
  const v = S().addUnit('VANITY3', { wall: 0, x: 1000 }).id;
  S().updateUnitParams(v, { sinks: 2, columns: 2, width: 1120 });
  const alone = basinsOf(slabOver(v)).map((c) => c.cx);
  S().addUnit('BUDTALL', { near: v, side: 'R' });
  const beside = basinsOf(slabOver(v)).map((c) => c.cx);
  assert.deepEqual(beside, alone);
  assertBasinsFit(slabOver(v));
});

test('F11 · on an island the basin\'s centre rides into the slab\'s frame with its box', () => {
  S().newProject('T82 F11 island');
  S().setRoom({ corners: rectCorners(5000, 4000), height: 2500 });
  confirmDrawerBox();
  S().addIsland();
  const walls = roomWalls(S().project.room);
  const faceB = walls.find((w) => w.island && w.face === 'B');
  assert.ok(faceB, 'the island has a face B');
  const id = S().addUnit('VANITY3', { wall: faceB.index }).id;
  assert.ok(id);
  const slab = S().worktopsOf().find((w) => (w.geometry?.unitIds || []).includes(id));
  assert.ok(slab, 'the vanity\'s top is the island\'s slab');
  assert.equal(slab.geometry.shape, 'island');
  const [c] = basinsOf(slab);
  assert.ok(c, 'the basin is cut into the island\'s slab');
  assert.ok(near(c.cx, c.x + c.w / 2) && near(c.cz, c.z + c.d / 2), `centre ${c.cx}, ${c.cz} in the box ${c.x}, ${c.z}, ${c.w}, ${c.d}`);
  assertBasinsFit(slab);
});

// ─── F12 · THE SERVICE VOID AS A NOTE ──────────────────────────────────────

test('F12 · Check #45 lists the void as a NOTE, never a fault: "Service void 80 inside the vanity behind the drawers" (T83 F6)', () => {
  const id = vanity('VANITY3');
  const row = CHECKS.find((c) => c.n === 45);
  assert.ok(row, '#45 is in the list');
  assert.equal(row.level, 'note');
  const found = S().runChecks().filter((f) => f.check === 45);
  assert.equal(found.length, 1);
  assert.equal(found[0].unitId, id);
  assert.equal(found[0].level, 'note');
  // AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
  // CLAUDE.md T83 F6 *"The Check's note #45 says "Service void 80 inside the vanity behind the drawers""*.
  assert.match(found[0].message, new RegExp(`Service void ${VOID()} inside the vanity behind the drawers`));
  // A note is not counted as a fault nor as something to look at.
  assert.equal(checkSummary(found), checkSummary([]));
});

test('F12 · review 6: a NOTE is never a thing to look at: not in the export preflight, not on the toolbar, not in the summary', async () => {
  const C = await import('../src/engine/checks.js');
  assert.equal(typeof C.findingsToAct, 'function', 'one reading of what asks something of a person');
  vanity('VANITY3', { sinks: 0 });
  // #18 is the node run's own (no hardware catalogue): the job's findings are the rest.
  const found = S().runChecks().filter((f) => f.check !== 18);
  assert.deepEqual(found.map((f) => [f.check, f.level]), [[45, 'note']]);
  assert.deepEqual(C.findingsToAct(found), [], 'nothing to act on');
  assert.equal(checkSummary(found), checkSummary([]));
  // The three places that count findings as work count through it.
  const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  const tree = read('src/components/CncTree.jsx');
  const at = tree.indexOf('const found = runChecks();');
  assert.ok(at > 0);
  assert.match(tree.slice(at, at + 400), /findingsToAct\(found\)/, 'the CNC export preflight');
  const page = read('src/pages/ConfiguratorPage.jsx');
  const pre = page.slice(page.indexOf('const checkBeforeExport'), page.indexOf('const checkBeforeExport') + 1200);
  assert.match(pre, /findingsToAct\(found\)/, 'the page\'s export preflight');
  assert.match(read('src/components/CanvasToolbar.jsx'), /const checkCount = findingsToAct\(checkFindings\)\.length;/, 'the toolbar\'s badge');
});

test('F12 · no vanity, no #45', () => {
  room();
  S().addUnit('BUD', { wall: 0, x: 1000 });
  assert.equal(S().runChecks().filter((f) => f.check === 45).length, 0);
});

test('F12 · SHEETS · the section through the vanity: the two rails cut at the back, the void band hatched and named', () => {
  const id = vanity('VANITY3', { sinks: 1 });
  const sec0 = sectionOf(id);
  for (const rail of ['RAIL-TOP', 'RAIL-BOTTOM']) {
    assert.ok(sec0.entities.some((e) => e.cut && String(e.src || '').endsWith(`:${rail}`)), `${rail} is cut`);
  }
  // AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
  // a vanity as it is born stands at the wall, its void inside it (KIT_VANITY.lsp D27): no band between the wall and
  // the carcass back. The band is the stand-off's, as T82 drew it: hatched where the vanity is stood off the wall.
  assert.equal(sec0.entities.filter((e) => e.layer === 'SERVICE_VOID').length, 0, 'no air behind a vanity at the wall');
  S().updateUnitParams(id, { wall_gap: CLEARANCE() + VOID() });
  const u = unitOf(id);
  const sec = sectionOf(id);
  // The band: from the wall (0) to the carcass back, over the carcass's height, on its own ink.
  const band = sec.entities.filter((e) => e.layer === 'SERVICE_VOID' && e.meta === 'service-void');
  assert.ok(band.length >= 3, 'hatched');
  const gap = wallGapOf(u, P());
  for (const e of band) {
    for (const x of [e.x1, e.x2]) assert.ok(x >= -0.01 && x <= gap + 0.01, `hatch at ${x} inside the void`);
  }
  const label = sec.entities.find((e) => e.kind === 'text' && e.meta === 'service-void-label');
  assert.ok(label, 'named');
  assert.equal(label.text, `SERVICE VOID ${VOID()}`);
  // No vanity, no band.
  room();
  const b = S().addUnit('BUDR2', { wall: 0, x: 1000 }).id;
  assert.equal(sectionOf(b).entities.filter((e) => e.layer === 'SERVICE_VOID').length, 0);
});

test('F12 · the hatch is one law: 45 degree lines on the pitch, clipped to the rectangle', () => {
  const lines = hatchLines(0, 0, 90, 600, 10);
  assert.ok(lines.length > 0);
  for (const [ax, ay, bx, by] of lines) {
    assert.ok(near(by - ay, bx - ax), 'at 45 degrees');
    for (const [x, y] of [[ax, ay], [bx, by]]) assert.ok(x >= -1e-6 && x <= 90 + 1e-6 && y >= -1e-6 && y <= 600 + 1e-6);
  }
  assert.deepEqual(hatchLines(0, 0, 0, 600, 10), [], 'no width, no hatch');
});

// ─── F11 / F12 ON E3's SHEETS ───────────────────────────────────────────────
//
// The plan's oval cut-out on the APPLIANCE ink (blue, dashed: what the client
// supplies, T71), the void hatched on SERVICE_VOID on the base plan, and the
// basin's bowl in section. They are drawn by E3's files (layers.js, setPlan.js,
// projector.js) from the B3 patches (/home/user/t82/patches/F11-B3-to-E3-*,
// F12-B3-to-E3-*); until those land the block says so and waits.

const E3 = DRAWING_LAYERS.SERVICE_VOID ? false : 'awaits E3: the B3 patches to layers.js, setPlan.js and projector.js';

test('F12 · E3 · SERVICE_VOID is an ink of its own, in the pen order', { skip: E3 }, () => {
  assert.ok(LAYER_ORDER.includes('SERVICE_VOID'));
  const others = Object.entries(DRAWING_LAYERS).filter(([k]) => k !== 'SERVICE_VOID').map(([, L]) => L.colour);
  assert.ok(!others.includes(DRAWING_LAYERS.SERVICE_VOID.colour), 'one ink, one layer: a grey nobody else wears');
});

test('F11 · E3 · the wall plan draws the basin as an oval on the APPLIANCE ink with its size', { skip: E3 }, () => {
  vanity('VANITY3', { sinks: 1 });
  const plan = planOf('wall');
  const oval = plan.entities.filter((e) => e.meta === 'basin-cutout');
  assert.equal(oval.length, 1);
  assert.equal(oval[0].layer, 'APPLIANCE');
  assert.ok(oval[0].kind === 'poly' && oval[0].pts.length >= 24, 'an oval, not a rectangle');
  assert.ok(plan.entities.some((e) => e.kind === 'text' && e.text === `BASIN ${BASIN().w} x ${BASIN().d}`));
  assert.ok(!plan.entities.some((e) => e.kind === 'text' && /^BASIN .* R/.test(e.text)), 'never named as a radiused rectangle');
});

test('F12 · E3 · the base plan hatches the void on SERVICE_VOID, between the wall and the carcass back', { skip: E3 }, () => {
  const id = vanity('VANITY3');
  // AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
  // at the wall there is no air to hatch (the void is inside, KIT_VANITY.lsp D27); stood off the wall, the stand-off is.
  assert.equal(planOf('base').entities.filter((e) => e.layer === 'SERVICE_VOID').length, 0, 'no air behind a vanity at the wall');
  S().updateUnitParams(id, { wall_gap: CLEARANCE() + VOID() });
  const u = unitOf(id);
  const hatch = planOf('base').entities.filter((e) => e.layer === 'SERVICE_VOID');
  assert.ok(hatch.length >= 3, 'hatched');
  // Wall A runs along x from the room's corner, the room inward along +y.
  const x0 = Number(u.position.x_mm); const x1 = x0 + Number(u.params.width);
  const gap = wallGapOf(u, P());
  for (const e of hatch) {
    for (const [x, y] of [[e.x1, e.y1], [e.x2, e.y2]]) {
      assert.ok(x >= x0 - 0.01 && x <= x1 + 0.01, `hatch x ${x} inside the unit's span`);
      assert.ok(y >= -0.01 && y <= gap + 0.01, `hatch y ${y} inside the void`);
    }
  }
  room();
  S().addUnit('BUDR2', { wall: 0, x: 1000 });
  assert.equal(planOf('base').entities.filter((e) => e.layer === 'SERVICE_VOID').length, 0, 'no vanity, no hatch');
});

test('F11 · E3 · the section draws the basin\'s bowl, hung from the slab\'s top by its depth', { skip: E3 }, () => {
  const id = vanity('VANITY3', { sinks: 1 });
  const sec = sectionOf(id);
  const bowl = sec.entities.filter((e) => e.layer === 'APPLIANCE' && String(e.src || '').startsWith('basin:'));
  assert.ok(bowl.length >= 12, 'its half ellipse');
  const slab = worktopsOnWall(S().worktopsOf(), 0)[0];
  const ys = bowl.flatMap((e) => [e.y1, e.y2]);
  assert.ok(near(Math.max(...ys), slab.y + slab.h) && near(Math.min(...ys), slab.y + slab.h - BASIN().h, 0.5), `${Math.min(...ys)}..${Math.max(...ys)}`);
  // ...and the plan and the elevation never draw it as a solid (the plan's oval is the cut-out's).
  assert.ok(!planOf('wall').entities.some((e) => String(e.src || '').startsWith('basin:')));
});
