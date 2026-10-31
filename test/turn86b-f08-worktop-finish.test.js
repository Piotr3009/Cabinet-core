/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F8 (CLAUDE.md T86B PART C): THE WORKTOP'S FINISH, AND ITS OVERHANG
//
// The owner, 30.10.2026: *"mozliwosc dodania worktopu z naszego sprayowanego
// panelu nie tylko szary worktop"* (22:52); *"nie koniecznie nawis, nawis jako
// opcja prosze"*, *"3 - dla komody oraz dla biurka, opcja inny blat tez (w
// przyszlosci) Hi-Macs"* (22:56).
//
// CLAUDE.md T86B F8.4: *"migration writes 'decor' on an old record; a chest
// island's slab set to 'spray' RAL 3005 renders through the sprayed surface
// (the material's colour and sheen read from `surfaceFor`'s result) and lists
// as a sprayed panel in the BOM with its area; a kitchen run's slab has no
// finish row and renders as yesterday; the overhang field writes
// `islandOverhangMm` on the island and the slab grows by 2 x the number."*
//
// The chest island is built here directly as an island record carrying
// `chestIsland: { variant }` with the chest on face A (S1's addChestIsland
// builds the same record in PART B), so this F stands on its own.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateDesign, projectSheen, worktopFinishOf } from '../src/engine/design.js';
import { migrateIsland, rectCorners, roomWalls } from '../src/engine/room.js';
import { islandOverhangOf, worktopsFor } from '../src/engine/worktop.js';
import { buildBom } from '../src/engine/bom.js';
import { sprayAreaFor } from '../src/engine/spray.js';
import { surfaceFor, worktopSurface } from '../src/3d/materials.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
const S = () => useProjectStore.getState();
const RAL3005 = { hex: '#9b111e', name: '3005', system: 'RAL' };

/** A 4000 x 3000 room, a chest island in the middle (face A = wall 4), a WARDROBE_CHEST3 on face A, its slab. */
function chestIsland(variant = 'panel', extra = {}) {
  S().newProject();
  const v = S().setRoom({
    corners: rectCorners(4000, 3000),
    height: 2500,
    islands: [{ id: 'isle', cx: 2000, cy: 1500, w: 1200, d: 600, rotation: 0, chestIsland: { variant }, ...extra }],
  });
  assert.equal(v.ok, true, v.message);
  const chest = S().addUnit('WARDROBE_CHEST3', { wall: 4, params: { width: 1200, depth: 600, height: 900 } });
  assert.equal(chest.error, null);
  const wt = S().addWorktop([chest.id]);
  assert.equal(wt.ok, true, wt.error);
  return { chest: chest.id, wt: wt.id };
}

// DEVIATION, named in the report: an old record READS as 'decor' (worktopFinishOf,
// stamped on every resolved slab by worktopsFor) and is STORED byte for byte as
// it was, because writing the key into the stored record moved the T75 saved
// fixtures (test/turn75-fixtures-the-set.test.js, "a saved fixture is what the
// store gives back"), which FROZEN 1 holds IDENTICAL.
test('T86B F8 · migration reads finish \'decor\' on an old record; a spray keeps the fronts\' colour and its sheen', () => {
  const old = migrateDesign({ worktops: [{ id: 'w1', unitIds: ['a', 'b'] }] }).worktops[0];
  assert.deepEqual(worktopFinishOf(old), { finish: 'decor' }, 'an old record: today\'s road');
  assert.equal(old.colour, undefined);
  assert.equal(old.finish, undefined, 'stored as it was: the T75 fixtures hold');
  const units = ['a', 'b'].map((id, i) => ({ id, type: 'BUD', params: { width: 600, depth: 560, height: 720 }, position: { wall: 0, x_mm: i * 600 } }));
  const [slab] = worktopsFor({ records: [old], units, profile: P });
  assert.equal(slab.finish, 'decor', 'the resolved slab says it');
  const sprayed = migrateDesign({ worktops: [{ id: 'w1', unitIds: ['a', 'b'], finish: 'spray', colour: RAL3005, sheen: 30 }] }).worktops[0];
  assert.deepEqual([sprayed.finish, sprayed.colour, sprayed.sheen], ['spray', RAL3005, 30]);
  // A spray with no colour is no sprayed slab; an unknown finish is decor.
  assert.deepEqual(worktopFinishOf({ finish: 'spray' }), { finish: 'decor' });
  assert.deepEqual(worktopFinishOf({ finish: 'himacs', colour: RAL3005 }), { finish: 'decor' });
  assert.deepEqual(worktopFinishOf({ finish: 'spray', colour: RAL3005 }), { finish: 'spray', colour: RAL3005, sheen: null });
});

test('T86B F8 · the profile: the finishes enum and the island overhang, 0 by default', () => {
  // E1's F4 writes them into profile.js; until then the readers fall back to the same values.
  const finishes = P.worktop?.finishes || P.autoParts?.worktop?.finishes || ['decor', 'spray'];
  assert.deepEqual(finishes, ['decor', 'spray']);
  assert.equal(islandOverhangOf({}, P), 0, 'CONFIRMED: none by default');
  assert.equal(islandOverhangOf({ islandOverhangMm: 20 }, P), 20);
  // The island record keeps the chest island's two fields; a kitchen island is as it was.
  assert.deepEqual(migrateIsland({ id: 'i', cx: 0, cy: 0, w: 1200, d: 600, chestIsland: { variant: 'double' }, islandOverhangMm: 15 }),
    { id: 'i', cx: 0, cy: 0, w: 1200, d: 600, rotation: 0, chestIsland: { variant: 'double' }, islandOverhangMm: 15 });
  assert.deepEqual(Object.keys(migrateIsland({ id: 'k', cx: 0, cy: 0, w: 1800, d: 900, islandOverhangMm: 15 })),
    ['id', 'cx', 'cy', 'w', 'd', 'rotation'], 'a kitchen island carries no chest fields');
});

test('T86B F8 · a chest island\'s slab set to Sprayed RAL 3005 renders through the sprayed fronts\' surface', () => {
  const { wt } = chestIsland();
  const res = S().setWorktopFinish(wt, { finish: 'spray', colour: RAL3005 });
  assert.equal(res.ok, true, res.error);
  const [slab] = S().worktopsOf();
  assert.equal(slab.finish, 'spray');
  assert.deepEqual(slab.colour, RAL3005);
  const sheen = projectSheen(S().project.design, P);
  const surface = worktopSurface(slab, P, sheen);
  // The SAME road a sprayed front takes: surfaceFor's sprayed, sheen-driven branch.
  const front = surfaceFor({
    role: 'front', materialRole: 'front', finishExposed: true,
    finishes: { front: { kind: 'spray', hex: RAL3005.hex }, carcass: null }, profile: P, frontColour: RAL3005.hex, sheen,
  });
  assert.equal(surface.sprayed, true);
  assert.equal(surface.sheenDriven, true);
  assert.equal(`#${surface.colour.getHexString()}`, RAL3005.hex, 'the material\'s colour is the RAL');
  for (const k of ['roughness', 'clearcoat', 'clearcoatRoughness', 'metalness', 'envMapIntensity']) {
    assert.equal(surface[k], front[k], `${k}: the sprayed front's`);
  }
  // The slab's own sheen moves it, as the slider moves a front.
  assert.equal(S().setWorktopFinish(wt, { sheen: 90 }).ok, true);
  const glossy = worktopSurface(S().worktopsOf()[0], P, sheen);
  assert.ok(glossy.roughness < surface.roughness, 'more sheen, less roughness');
  // Back to Decor: today's road (null: the grey slab), colour gone from the record.
  assert.equal(S().setWorktopFinish(wt, { finish: 'decor' }).ok, true);
  const back = S().worktopsOf()[0];
  assert.equal(back.finish, 'decor');
  assert.equal(back.colour, undefined);
  assert.equal(worktopSurface(back, P, sheen), null);
});

test('T86B F8 · refusals in words: an unknown finish, a spray with no colour to give it', () => {
  const { wt } = chestIsland();
  const odd = S().setWorktopFinish(wt, { finish: 'himacs' });
  assert.equal(odd.ok, false);
  assert.match(odd.error, /decor or spray/);
  // The project has no front colour: nothing to spray it in, said, and nothing changes.
  assert.equal(migrateDesign(S().project.design).colour.front, null);
  const bare = S().setWorktopFinish(wt, { finish: 'spray' });
  assert.equal(bare.ok, false);
  assert.match(bare.error, /needs its colour/);
  assert.equal(S().worktopsOf()[0].finish, 'decor');
});

test('T86B F8 · a sprayed slab lists as a sprayed panel in the BOM with its area, not as a worktop decor line', () => {
  const { wt } = chestIsland();
  S().setWorktopFinish(wt, { finish: 'spray', colour: RAL3005 });
  const bom = buildBom(S().allResults(), { design: migrateDesign(S().project.design), profile: P, room: S().project.room });
  const block = bom.units.find((u) => u.unitId === 'worktops');
  assert.ok(block, 'the worktops block');
  assert.equal(block.rows.filter((r) => r.part === 'WORKTOP').length, 0, 'no decor line');
  const [row] = block.rows.filter((r) => r.part === 'WORKTOP-PANEL');
  assert.ok(row, 'a sprayed panel line');
  const g = S().worktopsOf()[0].geometry;
  assert.equal(row.material_role, 'front');
  assert.equal(row.role, 'free_panel');
  assert.match(row.material_label, /^Sprayed panel 38 mm, RAL 3005 spray$/);
  assert.deepEqual([row.w, row.h], [g.w, g.d]);
  const spray = sprayAreaFor({ w: g.w, h: g.d, thickness: g.thickness }, { id: 'free_panel', kind: null }, P);
  assert.equal(row.spray_m2, spray.m2Each, 'the panel\'s own spray area: two faces and four edges');
  assert.ok(row.spray_m2 > 2 * (g.w * g.d) / 1e6 - 1e-9);
  assert.equal(bom.totals.worktop_area_m2, undefined, 'nothing bought as a worktop');
  // Decor again: the bought slab line, as yesterday.
  S().setWorktopFinish(wt, { finish: 'decor' });
  const again = buildBom(S().allResults(), { design: migrateDesign(S().project.design), profile: P, room: S().project.room });
  assert.equal(again.units.find((u) => u.unitId === 'worktops').rows.filter((r) => r.part === 'WORKTOP').length, 1);
});

test('T86B F8 · the overhang field writes islandOverhangMm on the chest island and the slab grows by 2 x the number', () => {
  const { wt } = chestIsland();
  const before = S().worktopsOf()[0].geometry;
  assert.deepEqual(before.overhang, { front: 0, side: 0, wall: 0 }, 'none by default');
  const res = S().setWorktopOverhang(wt, 20);
  assert.equal(res.ok, true, res.error);
  assert.equal(S().project.room.islands[0].islandOverhangMm, 20, 'written on the island');
  const after = S().worktopsOf()[0].geometry;
  assert.equal(after.w, before.w + 40);
  assert.equal(after.d, before.d + 40);
  assert.deepEqual(after.overhang, { front: 20, side: 20, wall: 0 });
  // A number below 0 is refused in words, nothing moves.
  const neg = S().setWorktopOverhang(wt, -5);
  assert.equal(neg.ok, false);
  assert.match(neg.error, /0 or more/);
  assert.equal(S().project.room.islands[0].islandOverhangMm, 20);
  // Stored on the island, the next open reads it back.
  const walls = roomWalls(S().project.room);
  const [slab] = worktopsFor({ records: migrateDesign(S().project.design).worktops, units: S().units, profile: P, walls });
  assert.equal(slab.geometry.w, before.w + 40);
});

test('T86B F8 · a kitchen island\'s slab keeps its overhang law, and its field is refused', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 4000), height: 2500 });
  S().addIsland();
  const a = S().addUnit('BUD', { wall: 4 }).id;
  const { id: wt } = S().addWorktop([a]);
  const g = S().worktopsOf()[0].geometry;
  assert.deepEqual(g.overhang, { front: 20, side: 20, wall: 0 }, 'the 9.10 law, untouched');
  const res = S().setWorktopOverhang(wt, 0);
  assert.equal(res.ok, false);
  assert.match(res.error, /kitchen island keeps its own overhang/);
  assert.equal(S().worktopsOf()[0].finish, 'decor');
});

test('T86B F8 · the desk: its slab as T75 F17 left it until a number is typed, then that number all round', () => {
  S().newProject('Desk', { design: { projectType: 'wardrobe' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const id = S().addUnit('WARDROBE_DESK').id;
  const [record] = migrateDesign(S().project.design).worktops;
  assert.equal(record.kind, 'desk');
  const before = S().worktopsOf()[0].geometry;
  assert.deepEqual([before.overhang.front, before.overhang.side], [20, 10], 'today\'s numbers stand');
  assert.equal(S().setWorktopOverhang(record.id, 0).ok, true);
  const after = S().worktopsOf()[0].geometry;
  assert.deepEqual([after.overhang.front, after.overhang.side], [0, 0]);
  assert.equal(after.d, before.d - 20);
  assert.equal(after.w, before.w - 20, 'ten off each free end');
  // A desk's slab takes the spray finish too.
  assert.equal(S().setWorktopFinish(record.id, { finish: 'spray', colour: RAL3005 }).ok, true);
  assert.equal(S().worktopsOf()[0].finish, 'spray');
  assert.ok(S().units.some((u) => u.id === id));
});

test('T86B F8 · a kitchen run\'s slab: no finish row, the grey slab as yesterday', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = S().addUnit('BUD', { wall: 0 }).id;
  const b = S().addUnit('BUD', { wall: 0 }).id;
  const { id: wt } = S().addWorktop([a, b]);
  const [slab] = S().worktopsOf();
  assert.equal(slab.finish, 'decor');
  assert.equal(worktopSurface(slab, P, 50), null, 'today\'s road');
  const res = S().setWorktopOverhang(wt, 10);
  assert.equal(res.ok, false, 'the field is not this slab\'s');
  // THE PANEL: the rows stand on a chest island's slab and a desk's, nowhere else.
  const PANEL = read('src/components/RightPanel.jsx');
  const at = PANEL.indexOf('function WorktopFinishRows(');
  assert.ok(at > 0);
  const body = PANEL.slice(at, PANEL.indexOf('\n}\n', at));
  assert.match(body, /const chestFace = record\.island \? walls\.find\(\(w\) => w\.island === record\.island && w\.chestIsland\) : null;/);
  assert.match(body, /const desk = !record\.island && getUnitType\(unit\.type\)\?\.desk === true;/);
  assert.match(body, /if \(!chestFace && !desk\) return null;/);
  assert.match(body, /const label = \{ decor: 'Decor', spray: 'Sprayed panel' \};/);
  assert.match(body, />Finish</);
  assert.match(body, />Overhang \(mm\)</);
  // One road: the fronts' own components, imported, never copied.
  assert.match(PANEL, /import ColourPicker from '\.\/ColourPicker\.jsx';/);
  assert.match(PANEL, /import SheenSlider from '\.\/SheenSlider\.jsx';/);
  assert.match(body, /<ColourPicker\b/);
  assert.match(body, /<SheenSlider\b/);
  assert.match(body, /setWorktopFinish\(record\.id/);
  assert.match(body, /setWorktopOverhang\(record\.id, v\)/);
  // THE SCENE: a decor slab keeps today's material, a sprayed one the sprayed surface.
  const SCENE = read('src/3d/Scene.jsx');
  assert.match(SCENE, /if \(!surface\) return <meshStandardMaterial color=\{colour\} roughness=\{0\.55\} metalness=\{0\.04\} side=\{side\} \/>;/);
  assert.match(SCENE, /const surface = profile \? worktopSurface\(w, profile, sheen\) : null;/);
});
