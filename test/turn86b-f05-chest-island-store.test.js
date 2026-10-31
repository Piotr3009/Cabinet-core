/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F5 . THE CHEST AS AN ISLAND (law 4).
//
// The owner, 30.10.2026 (22:52): *"chest powinna byc mozliwosc odsuniecia od sciany ale nie na zasadzie back move
// tylko powinna byc mozliwosc na srodku pokoju cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub
// polaczenie szuflad z 2 stron; chest dodany w changing room"*; (22:56) *"1 - oba"*.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  islandCorners, migrateIsland, migrateRoom, rectCorners, roomIslands, roomWalls,
} from '../src/engine/room.js';
import { worktopsFor } from '../src/engine/worktop.js';
import { migrateDesign } from '../src/engine/design.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';

const S = () => useProjectStore.getState();
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

/** The owner's changing room: a wardrobe job, 4000 x 3000. */
function changingRoom(projectType = 'wardrobe') {
  S().loadProject({
    id: null, name: 'T86B F5', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: { projectType },
  }, []);
}
const unit = (id) => S().units.find((u) => u.id === id);
const islandOf = (id) => roomIslands(S().project.room).find((i) => i.id === id);
const slabs = () => worktopsFor({
  records: migrateDesign(S().project.design).worktops, units: S().units, profile: P, walls: roomWalls(S().project.room),
});
/** The world box of every unit on an island, from the room's own face frames. */
function plan(u) {
  const w = roomWalls(S().project.room)[u.position.wall];
  const x = Number(u.position.x_mm); const width = Number(u.params.width); const depth = Number(u.params.depth);
  const pts = [[x, 0], [x + width, 0], [x + width, depth], [x, depth]]
    .map(([a, v]) => ({ x: w.start.x + w.along.x * a + w.inward.x * v, y: w.start.y + w.along.y * a + w.inward.y * v }));
  const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
/** A 1200 x 900 x 600 chest of three on wall 0 between two wardrobes. */
function wallChest() {
  const a = S().addUnit('WARDROBE', { wall: 0, x: 100, params: { width: 1000, depth: 600 } });
  const c = S().addUnit('WARDROBE_CHEST3', { wall: 0, x: 1100, params: { width: 1200, height: 900, depth: 600 } });
  const b = S().addUnit('WARDROBE', { wall: 0, x: 2300, params: { width: 1000, depth: 600 } });
  assert.ok(a.id && c.id && b.id, `${a.error || ''}${c.error || ''}${b.error || ''}`);
  return { a: a.id, c: c.id, b: b.id };
}

test('F5 . the entry: "Chest in the room" lands as an island at the room centre, the chest on face A, the panel on C', () => {
  changingRoom();
  const res = S().addChestIsland('WARDROBE_CHEST3', { variant: 'panel' });
  assert.equal(res.ok, true, res.message);
  const isl = islandOf(res.id);
  assert.deepEqual(isl.chestIsland, { variant: 'panel' }, 'the variant remembered on the island');
  assert.equal(isl.islandOverhangMm, 0, 'its overhang the profile\'s none');
  const chest = unit(res.chestId);
  assert.equal(chest.position.island, res.id);
  assert.equal(chest.position.face, 'A');
  const panel = unit(res.backId);
  assert.equal(panel.type, 'FREE_PANEL');
  assert.equal(panel.position.face, 'B', 'the face opposite the chest (the spec\'s C)');
  // The footprint (chest and panel) is centred in the room, and the panel's face meets the chest's back.
  const pc = plan(chest); const pp = plan(panel);
  const all = { x0: Math.min(pc.x0, pp.x0), x1: Math.max(pc.x1, pp.x1), y0: Math.min(pc.y0, pp.y0), y1: Math.max(pc.y1, pp.y1) };
  assert.equal((all.x0 + all.x1) / 2, 2000);
  assert.equal((all.y0 + all.y1) / 2, 1500);
  assert.equal(pc.y1, pp.y0, 'gap 0: the panel stands on the chest\'s back');
  assert.equal(all.y1 - all.y0, Number(chest.params.depth) + 18, 'the footprint: the chest\'s depth plus the board');
});

test('F5 . "Stand in the room" on a 1200 x 900 wall chest: the panel 1200 x 900 x 18, the wall run recomputed', () => {
  changingRoom();
  const { a, c, b } = wallChest();
  const res = S().addChestIsland(c, { variant: 'panel' });
  assert.equal(res.ok, true, res.message);
  assert.equal(res.chestId, c, 'the same chest, its params kept');
  assert.equal(unit(c).params.width, 1200);
  assert.equal(unit(c).params.height, 900);
  assert.equal(unit(c).position.face, 'A');
  const panel = unit(res.backId);
  assert.deepEqual([panel.params.width, panel.params.height, panel.params.depth], [1200, 900, 18], 'the back panel');
  assert.equal(panel.params.board_t, 18, 'the project\'s board');
  // The wall run it left: the two wardrobes stand on wall 0, the chest is no longer of their run.
  for (const id of [a, b]) assert.equal(unit(id).position.wall, 0);
  assert.ok(!S().units.some((u) => u.position.wall === 0 && u.id === c));
});

test('F5 . variant B: the second chest on C with the first\'s params, back to back', () => {
  changingRoom();
  const { c } = wallChest();
  flushHistory();
  const depth = useHistoryStore.getState().past.length;
  const res = S().addChestIsland(c, { variant: 'double' });
  assert.equal(res.ok, true, res.message);
  flushHistory();
  assert.equal(useHistoryStore.getState().past.length, depth + 1, 'one batch, one undo');
  const two = unit(res.backId);
  assert.equal(two.type, 'WARDROBE_CHEST3');
  assert.equal(two.position.face, 'B');
  for (const k of ['width', 'height', 'depth']) assert.equal(two.params[k], unit(c).params[k], k);
  assert.notEqual(two.params.unit_num, unit(c).params.unit_num, 'a name of its own');
  assert.equal(plan(unit(c)).y1, plan(two).y0, 'the backs meet');
});

test('F5 . the worktop: ONE slab over the island, the footprint plus 2 x islandOverhangMm', () => {
  changingRoom();
  const { c } = wallChest();
  const res = S().addChestIsland(c, { variant: 'panel' });
  const mine = slabs().filter((sl) => sl.island === res.id || sl.geometry?.island === res.id);
  assert.equal(mine.length, 1, 'one slab');
  const chest = unit(c);
  const front = Number(P.doors.gap) + Number(chest.params.front_t || 0);
  const g0 = mine[0].geometry;
  assert.equal(g0.w, 1200, 'the chest\'s width, no overhang by default');
  assert.equal(g0.d, 600 + front + 18, 'the chest over its fronts, and the panel');
  // The overhang is the island's own number: 20 grows the slab by 40 each way.
  assert.equal(S().updateIsland(res.id, { islandOverhangMm: 20 }).ok, true);
  const g1 = slabs().find((sl) => sl.geometry?.island === res.id).geometry;
  assert.equal(g1.w, g0.w + 40);
  assert.equal(g1.d, g0.d + 40);
});

test('F5 . grab and move: +300 moves chest, panel and slab together in ONE undo step; into a wall refused in words', () => {
  changingRoom();
  const res = S().addChestIsland('WARDROBE_CHEST3', { variant: 'panel' });
  flushHistory();
  const at = (id) => plan(unit(id));
  const was = { chest: at(res.chestId), panel: at(res.backId), slab: JSON.stringify(slabs()[0].geometry.outline) };
  const isl = islandOf(res.id);
  const depth = useHistoryStore.getState().past.length;
  assert.equal(S().moveChestIsland(res.id, isl.cx + 300, isl.cy).ok, true);
  flushHistory();
  assert.equal(useHistoryStore.getState().past.length, depth + 1, 'one undo step');
  assert.equal(at(res.chestId).x0, was.chest.x0 + 300);
  assert.equal(at(res.backId).x0, was.panel.x0 + 300);
  assert.equal(slabs().length, 1);
  // Into the wall: refused in words, nothing moves.
  const now = islandOf(res.id);
  const before = JSON.stringify(S().units);
  const no = S().moveChestIsland(res.id, now.cx + 3000, now.cy);
  assert.equal(no.ok, false);
  assert.match(no.message, /^The chest cannot stand there: /);
  assert.equal(JSON.stringify(S().units), before, 'nothing moved');
  assert.deepEqual(islandOf(res.id), now);
  // One Ctrl+Z puts the whole island back.
  assert.ok(useHistoryStore.getState().undo());
  assert.equal(at(res.chestId).x0, was.chest.x0);
  assert.equal(at(res.backId).x0, was.panel.x0);
});

test('F5 . the drag of the CHEST\'s carcass moves the whole island along its face; against a wardrobe refused', () => {
  changingRoom();
  const res = S().addChestIsland('WARDROBE_CHEST3', { variant: 'panel' });
  const before = plan(unit(res.backId));
  // The 3D drag is moveUnit along the chest's own face (face A runs right to left at rotation 0).
  const x0 = unit(res.chestId).position.x_mm;
  const out = S().moveUnit(res.chestId, x0 + 200, 0);
  assert.equal(out.blocked, false);
  assert.equal(unit(res.chestId).position.x_mm, x0, 'the chest stays on its face');
  assert.equal(plan(unit(res.backId)).x0, before.x0 - 200, 'the island travelled, panel and all');
  // A wardrobe in the way: the island refuses in words, never clamped.
  S().addUnit('WARDROBE', { wall: 0, x: 0, params: { width: 1000, depth: 600 } });
  const isl = islandOf(res.id);
  const no = S().moveChestIsland(res.id, isl.cx, 300);
  assert.equal(no.ok, false);
  assert.match(no.message, /cannot stand there/);
  assert.deepEqual(islandOf(res.id), isl);
});

test('F5 . rotate by 90: the footprint turns about its centre, the faces kept; refused in words where it will not fit', () => {
  changingRoom();
  const res = S().addChestIsland('WARDROBE_CHEST3', { variant: 'double' });
  const box = () => {
    const ps = [plan(unit(res.chestId)), plan(unit(res.backId))];
    return {
      x0: Math.min(...ps.map((p) => p.x0)), x1: Math.max(...ps.map((p) => p.x1)), y0: Math.min(...ps.map((p) => p.y0)), y1: Math.max(...ps.map((p) => p.y1)),
    };
  };
  const b0 = box();
  assert.equal(S().rotateChestIsland(res.id).ok, true);
  const b1 = box();
  assert.equal(islandOf(res.id).rotation, 90);
  assert.ok(Math.abs((b1.x1 - b1.x0) - (b0.y1 - b0.y0)) < 1e-6, 'the footprint turned');
  assert.ok(Math.abs((b1.x0 + b1.x1) / 2 - (b0.x0 + b0.x1) / 2) < 1e-6, 'about its centre');
  assert.ok(Math.abs((b1.y0 + b1.y1) / 2 - (b0.y0 + b0.y1) / 2) < 1e-6);
  assert.equal(unit(res.chestId).position.face, 'A');
  assert.equal(unit(res.backId).position.face, 'B');
  // Turned back, and pushed against the right wall, a turn would carry it through the wall: refused.
  assert.equal(S().rotateChestIsland(res.id, -90).ok, true);
  assert.equal(islandCorners(islandOf(res.id)).length, 4);
  assert.equal(S().moveChestIsland(res.id, 4000 - 400 - 2, 1500).ok, true, 'against the right wall');
  const still = islandOf(res.id);
  const turn = S().rotateChestIsland(res.id);
  assert.equal(turn.ok, false);
  assert.match(turn.message, /^The chest cannot turn there: /);
  assert.deepEqual(islandOf(res.id), still);
});

test('F5 . the variant is changed in the island\'s panel: the chest stays, what stands on C changes', () => {
  changingRoom();
  const res = S().addChestIsland('WARDROBE_CHEST3', { variant: 'panel' });
  const at = plan(unit(res.chestId));
  const v = S().setChestIslandVariant(res.id, 'double');
  assert.equal(v.ok, true, v.message);
  assert.deepEqual(islandOf(res.id).chestIsland, { variant: 'double' });
  assert.deepEqual(plan(unit(res.chestId)), at, 'the chest did not move');
  assert.equal(unit(v.backId).type, 'WARDROBE_CHEST3');
  assert.ok(!S().units.some((u) => u.id === res.backId), 'the panel went');
  assert.equal(slabs().length, 1, 'one slab, over both chests');
});

test('F5 . only a chest; a kitchen island exactly as yesterday (FROZEN 6)', () => {
  changingRoom();
  assert.equal(S().addChestIsland('WARDROBE').ok, false);
  assert.equal(S().addChestIsland('BUD').ok, false);
  // The kitchen island record: no new key, the 50 mm least core, the 20 mm overhang.
  const k = migrateIsland({ id: 'k', cx: 1, cy: 2, w: 1800, d: 10, rotation: 0, chestIsland: { variant: 'nope' } });
  assert.deepEqual(k, { id: 'k', cx: 1, cy: 2, w: 1800, d: 50, rotation: 0 });
  changingRoom('kitchen');
  const add = S().addIsland();
  assert.equal(add.ok, true);
  const walls = roomWalls(S().project.room);
  assert.ok(walls.filter((w) => w.island).every((w) => !('chestIsland' in w) && !('islandOverhangMm' in w)));
  const faceA = walls.findIndex((w) => w.island === add.id && w.face === 'A');
  const u = S().addUnit('BUD', { wall: faceA, x: 0 });
  assert.ok(u.id, u.error);
  assert.equal(S().addWorktop([u.id]).ok, true);
  assert.equal(slabs()[0].geometry.overhang.front, 20, 'the kitchen island keeps its front overhang law');
});

test('F5 . the visible entries: Library "Chest in the room", the panel\'s "Stand in the room", the popup\'s two pictures', () => {
  const lib = read('src/components/LibraryPanel.jsx');
  assert.ok(lib.includes('data-library-chest-in-room="1"') && lib.includes('Chest in the room'));
  assert.ok(lib.includes("addChestIsland('WARDROBE_CHEST3', { variant })"));
  const pop = read('src/components/ChestIslandPopup.jsx');
  for (const s of ['data-chest-variant={v.id}', 'data-chest-stand-in-room=', 'Stand in the room', 'data-chest-island-rotate=',
    'data-chest-island-variant=', 'A: back panel', 'B: back to back', "e.key !== 'r'"]) assert.ok(pop.includes(s), s);
  assert.ok(read('src/components/RightPanel.jsx').includes('<ChestIslandRow unit={unit} />'));
  assert.ok(read('src/3d/UnitView.jsx').includes('onMove(alongNow.current(p) - drag.current.offset, snapStep);'));
});
