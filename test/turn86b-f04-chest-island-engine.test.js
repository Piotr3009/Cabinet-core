/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F4 . THE CHEST ISLAND'S BOARDS (CLAUDE.md T86B laws 4, 5, 6). The owner, 30.10.2026 (22:52): *"chest powinna
// byc mozliwosc odsuniecia od sciany ... cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub polaczenie
// szuflad z 2 stron"*; (22:56) *"nie koniecznie nawis, nawis jako opcja prosze; 1 - oba"*. The plan (lib/chestIsland.js),
// the plinth set back on every exposed side by the front's own number (engine/cabinet.js `plinth_free`, handed by the
// store's paramsForEngine), the back panel the FREE PANEL kit; a kitchen BUD's plinth as yesterday.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateIsland, rectCorners, roomWalls } from '../src/engine/room.js';
import {
  CHEST_ISLAND_KITS, chestIslandPlan, chestIslandPlinthSides, isChestIslandKit, islandOverhangOf,
} from '../src/lib/chestIsland.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';

const SB = P.autoParts.plinth.setback;
const T = P.autoParts.plinth.thickness ?? P.board.thickness;
const CHEST = { width: 1200, depth: 600, height: 900 };
const chestParams = (extra = {}) => ({
  ...defaultParamsFor('WARDROBE_CHEST3', P), ...CHEST, plinth: true, ...extra,
});
const plinths = (r) => Object.fromEntries(r.panels.filter((p) => p.part === 'PLINTH').map((p) => [p.id, p.box]));

test('F4 . the profile: the island slab\'s overhang 0 by default, the two finishes', () => {
  assert.equal(P.autoParts.worktop.islandOverhangMm, 0);
  assert.deepEqual(P.autoParts.worktop.finishes, ['decor', 'spray']);
  assert.equal(islandOverhangOf(P), 0);
  assert.ok(P.autoParts.worktop.frontOverhang > 0, 'the kitchen slab\'s own overhang numbers stand');
});

test('F4 . the kits: the chests of drawers and nothing else', () => {
  assert.deepEqual([...CHEST_ISLAND_KITS], ['WARDROBE_CHEST2', 'WARDROBE_CHEST3', 'WARDROBE_CHEST4']);
  assert.equal(isChestIslandKit('WARDROBE_CHEST3'), true);
  assert.equal(isChestIslandKit('BUD'), false);
  assert.equal(isChestIslandKit('WARDROBE_DESK'), false);
});

test('F4 . the plan of a 1200 x 600 x 900 WARDROBE_CHEST3, variant A (the back panel)', () => {
  const plan = chestIslandPlan({ chest: CHEST, variant: 'panel', panelT: 18, profile: P });
  assert.deepEqual(plan.island, { w: 1200, d: 618 });
  assert.deepEqual(plan.faces.A, { kind: 'unit', width: 1200, depth: 600, height: 900 });
  assert.deepEqual(plan.faces.C, { kind: 'panel', width: 1200, height: 900, thickness: 18 });
  assert.deepEqual(plan.worktop, { w: 1200, d: 618, overhang: 0 }, 'no overhang by default');
  const over = chestIslandPlan({ chest: CHEST, variant: 'panel', panelT: 18, profile: P, overhangMm: 20 });
  assert.deepEqual(over.worktop, { w: 1240, d: 658, overhang: 20 }, 'the option: 2 x the number each way');
});

test('F4 . the plan, variant B (two chests back to back)', () => {
  const plan = chestIslandPlan({ chest: CHEST, variant: 'double', panelT: 18, profile: P });
  assert.deepEqual(plan.island, { w: 1200, d: 1200 });
  assert.deepEqual(plan.faces.C, { kind: 'unit', width: 1200, depth: 600, height: 900 });
  assert.deepEqual(plan.worktop, { w: 1200, d: 1200, overhang: 0 });
});

test('F4 . variant A: the plinth set back by the profile\'s number on the back (behind the panel) and both sides', () => {
  const free = chestIslandPlinthSides({ type: 'WARDROBE_CHEST3', face: 'A', variant: 'panel', panelT: 18 });
  assert.deepEqual(free, { left: true, right: true, back: true, backFaceMm: 18 });
  const b = plinths(computeCabinet(chestParams({ plinth_free: free }), P));
  assert.deepEqual(Object.keys(b).sort(), ['PLINTH', 'PLINTH-B', 'PLINTH-L', 'PLINTH-R']);
  // The front, as every plinth: its face SB behind the carcass front.
  assert.equal(b.PLINTH.z + T, 600 - SB);
  // The left and right: their outer faces SB inside the carcass sides.
  assert.equal(b['PLINTH-L'].x, SB);
  assert.equal(b['PLINTH-R'].x + b['PLINTH-R'].w, 1200 - SB);
  assert.deepEqual([b.PLINTH.x, b.PLINTH.x + b.PLINTH.w], [SB, 1200 - SB], 'the front runs between the set-back sides');
  // The back: SB behind the PANEL's face (the panel 18 behind the carcass back).
  assert.equal(b['PLINTH-B'].z, -18 + SB);
  // The returns fit between the front and the back boards.
  assert.equal(b['PLINTH-L'].z, b['PLINTH-B'].z + T);
  assert.equal(b['PLINTH-L'].z + b['PLINTH-L'].d, b.PLINTH.z);
});

test('F4 . variant B: the plinth set back on both sides; the backs meet, no back board', () => {
  for (const face of ['A', 'B']) {
    const free = chestIslandPlinthSides({ type: 'WARDROBE_CHEST3', face, variant: 'double' });
    assert.deepEqual(free, { left: true, right: true, back: false, backFaceMm: 0 });
    const b = plinths(computeCabinet(chestParams({ plinth_free: free }), P));
    assert.deepEqual(Object.keys(b).sort(), ['PLINTH', 'PLINTH-L', 'PLINTH-R']);
    assert.equal(b['PLINTH-L'].x, SB);
    assert.equal(b['PLINTH-R'].x + b['PLINTH-R'].w, 1200 - SB);
    assert.equal(b['PLINTH-L'].z, 0, 'the return runs to the carcass back, where the other chest\'s meets it');
  }
  assert.equal(chestIslandPlinthSides({ type: 'FREE_PANEL', face: 'B', variant: 'panel' }), null, 'the panel has none');
});

test('F4 . the back panel: the FREE PANEL kit, 1200 x 900 x 18', () => {
  const r = computeCabinet({
    ...defaultParamsFor('FREE_PANEL', P), width: 1200, height: 900, panel_width: 900, board_t: 18,
  }, P);
  const fp = r.panels.find((p) => p.id === 'FP');
  assert.deepEqual([fp.w, fp.h, fp.thickness], [1200, 900, 18]);
  assert.deepEqual([fp.box.w, fp.box.h, fp.box.d], [1200, 900, 18]);
});

test('F4 . a kitchen BUD on a wall, and a chest with no island: the plinth as yesterday', () => {
  const budParams = { ...defaultParamsFor('BUD', P), plinth: true };
  const bud = plinths(computeCabinet(budParams, P));
  assert.deepEqual(Object.keys(bud), ['PLINTH']);
  assert.deepEqual(bud.PLINTH, {
    x: 0, y: -100, z: budParams.depth - SB - T, w: budParams.width, h: 100, d: T,
  });
  const chest = plinths(computeCabinet(chestParams(), P));
  assert.deepEqual(Object.keys(chest), ['PLINTH']);
  assert.deepEqual([chest.PLINTH.x, chest.PLINTH.w], [0, 1200]);
});

test('F4 . through the store: a chest on a chest island\'s face A hands the engine its exposed sides', () => {
  const S = () => useProjectStore.getState();
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const verdict = S().setRoom({
    islands: [{ id: 'isl1', cx: 2000, cy: 1500, w: 1200, d: 618, rotation: 0, chestIsland: { variant: 'panel' } }],
  });
  assert.ok(verdict.ok, verdict.message);
  assert.deepEqual(S().project.room.islands[0].chestIsland, { variant: 'panel' }, 'the room keeps the variant');
  const walls = roomWalls(S().project.room);
  const a = walls.findIndex((w) => w.island === 'isl1' && w.face === 'A');
  const back = walls.findIndex((w) => w.island === 'isl1' && w.face === 'B');
  const chest = S().addUnit('WARDROBE_CHEST3', { wall: a });
  assert.ok(chest.id, chest.error);
  S().updateUnitParams(chest.id, { width: 1200, depth: 600, height: 900 });
  const panel = S().addUnit('FREE_PANEL', { wall: back });
  assert.ok(panel.id, panel.error);
  const u = S().units.find((x) => x.id === chest.id);
  const pe = paramsForEngine(u, S().project.design);
  assert.deepEqual(pe.plinth_free, { left: true, right: true, back: true, backFaceMm: 18 });
  const b = plinths(computeCabinet(pe, P));
  assert.equal(b['PLINTH-B'].z, -18 + SB);
  // A plain island (no `chestIsland`) migrates as yesterday, and a wall unit hands the engine no new key.
  assert.deepEqual(Object.keys(migrateIsland({ id: 'isl2', cx: 1, cy: 1, w: 900, d: 600, islandOverhangMm: 20 })),
    ['id', 'cx', 'cy', 'w', 'd', 'rotation']);
  assert.equal(migrateIsland({ id: 'i', w: 900, d: 600, chestIsland: { variant: 'double' }, islandOverhangMm: 20 })
    .islandOverhangMm, 20, 'a chest island keeps its slab\'s own overhang');
  const w = S().addUnit('WARDROBE_CHEST3', { wall: 0 });
  assert.equal('plinth_free' in paramsForEngine(S().units.find((x) => x.id === w.id), S().project.design), false);
});
