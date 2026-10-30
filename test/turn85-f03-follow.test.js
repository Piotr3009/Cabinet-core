/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T85 F3 . THE COLUMN FOLLOWS THE RECESS (KIT_RECESS.lsp D29, CLAUDE.md PART B).
//
// The owner, 30.10.2026, 20:17: *"przy przesunieciu calej szafy szuflady
// znikaja a zostaja dividery ktore sie robia do samej gory, nie powinno tak
// byc"*; 20:45: *"nie, tutaj musi byc minimum 30 mm"*, *"znikaja z
// szufladami, bo to sa dividery do szuflad"*.
//
// First the pure plan (src/lib/recessColumn.js) on the owner's wardrobe, as
// written; then the store, the way the client clicks (moveUnit, the room's
// recess edit, one undo), enabled once the engine of F2 is in the tree.

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import * as X from '../src/engine/extension.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  followPlan, wallsOf, carcassUsableDepth, carcassHoldsDrawers, leaveNotice, minColumnSideOf,
} from '../src/lib/recessColumn.js';

const MARK = { recessColumn: true };

/**
 * The owner's 1200 x 2150 x 300 wardrobe as addRecessDrawers leaves it before the 800 recess: the band 210 .. 990
 * in the carcass frame, ed 290, the two marked dividers on its edges at the face, three marked drawers in Column 2.
 */
function wardrobe({ depth = 300, dividers = [210, 972], zone = 1, extra = [] } = {}) {
  const items = [
    ...[1, 2, 3].map((k) => ({
      id: `d${k}`, kind: 'drawer', index: k, mount: 'internal', zone, height_mm: 200, meta: MARK,
    })),
    ...dividers.map((x, k) => ({ id: `v${k + 1}`, kind: 'partition', x_mm: x, front_mm: 0, meta: MARK })),
    ...extra,
  ];
  return {
    id: 'u1',
    type: 'WARDROBE',
    position: { wall: 0, x_mm: 800 },
    params: {
      unit_num: 'W01', width: 1200, height: 2150, depth, board_t: 18, front_t: 25, sections: [{ width_mm: 1200, items }],
    },
  };
}
/** The band of an 800 recess whose left reveal is `rx0` in the carcass frame (10 clear of each reveal). */
function bandAt(rx0, width = 800, W = 1200, G = 18) {
  const rx1 = rx0 + width;
  if (!(rx1 > 0 && rx0 < W)) return null;
  return {
    x0: rx0 <= 0 ? 0 : Math.max(G, rx0 + 10), x1: rx1 >= W ? W : Math.min(W - G, rx1 - 10), z0: 0, z1: 2150, d: 290,
  };
}

describe('T85 F3 . the plan, pure', () => {
  test('the walls: the owner\'s 30 (default when a profile lacks it), each edge DIVIDER, SIDE or RETURN', () => {
    assert.equal(minColumnSideOf({}), 30);
    assert.equal(minColumnSideOf({ recess: { minColumnSideMm: 40 } }), 40);
    assert.deepEqual(wallsOf(1200, 18, 210, 990, 30), [['DIVIDER', 228], ['DIVIDER', 972]]);
    assert.deepEqual(wallsOf(1200, 18, 0, 390, 30), [['SIDE', 18], ['DIVIDER', 372]]);
    assert.deepEqual(wallsOf(1200, 18, 25, 805, 30), [['RETURN', 43], ['DIVIDER', 787]]);
    assert.deepEqual(wallsOf(1200, 18, 48, 1152, 30), [['DIVIDER', 66], ['DIVIDER', 1134]], 'exactly 30 is a bay');
    assert.deepEqual(wallsOf(1200, 18, 47.5, 1152.5, 30), [['RETURN', 65.5], ['RETURN', 1134.5]]);
    assert.deepEqual(wallsOf(1200, 18, 400, 1200, 30), [['DIVIDER', 418], ['SIDE', 1182]]);
  });

  test('the depth test of D27: 300 deep holds none (usable 187 < 240), 558 holds them (445)', () => {
    assert.equal(carcassUsableDepth(wardrobe(), P), 187);
    assert.equal(carcassHoldsDrawers(wardrobe(), P), false);
    assert.equal(carcassUsableDepth(wardrobe({ depth: 558 }), P), 445);
    assert.equal(carcassHoldsDrawers(wardrobe({ depth: 558 }), P), true);
  });

  test('as born (D28): nothing to do', () => {
    const plan = followPlan(wardrobe(), bandAt(200), P);
    assert.deepEqual(plan, {
      walls: [['DIVIDER', 228], ['DIVIDER', 972]], moves: [], remove: [], add: [], zones: [], drawersRemoved: false, notice: null,
    });
  });

  test('+80: both edges still in, the two dividers move with the recess, the drawers stay in Column 2', () => {
    const plan = followPlan(wardrobe(), bandAt(120), P);
    assert.deepEqual(plan.walls, [['DIVIDER', 148], ['DIVIDER', 892]]);
    assert.deepEqual(plan.moves, [{ id: 'v1', x: 130 }, { id: 'v2', x: 892 }]);
    assert.deepEqual([plan.remove, plan.add, plan.zones, plan.drawersRemoved, plan.notice], [[], [], [], false, null]);
  });

  test('+600: the left edge out, the left divider leaves, the side is the wall, the drawers in Column 1', () => {
    const plan = followPlan(wardrobe(), bandAt(-400), P);
    assert.deepEqual(plan.walls, [['SIDE', 18], ['DIVIDER', 372]]);
    assert.deepEqual(plan.moves, [{ id: 'v2', x: 372 }]);
    assert.deepEqual(plan.remove, ['v1']);
    assert.deepEqual(plan.zones, [{ id: 'd1', zone: 0 }, { id: 'd2', zone: 0 }, { id: 'd3', zone: 0 }]);
    assert.equal(plan.notice, null);
  });

  test('the right edge out: the right divider leaves, the left one stands on its edge, the drawers stay in Column 2', () => {
    const plan = followPlan(wardrobe(), bandAt(600), P);
    assert.deepEqual(plan.walls, [['DIVIDER', 628], ['SIDE', 1182]]);
    assert.deepEqual(plan.moves, [{ id: 'v1', x: 610 }]);
    assert.deepEqual(plan.remove, ['v2']);
    assert.deepEqual(plan.zones, []);
  });

  test('15 inside: the band starts 25 in, its bay 7 under the 30: the RETURN is the wall, the left divider leaves', () => {
    const plan = followPlan(wardrobe(), bandAt(15), P);
    assert.deepEqual(plan.walls, [['RETURN', 43], ['DIVIDER', 787]]);
    assert.deepEqual(plan.moves, [{ id: 'v2', x: 787 }]);
    assert.deepEqual(plan.remove, ['v1']);
    assert.deepEqual(plan.zones.map((z) => z.zone), [0, 0, 0]);
  });

  test('out of the band, 300 deep: the drawers and the two dividers go, the notice in the owner\'s words', () => {
    const plan = followPlan(wardrobe(), bandAt(1300), P);
    assert.equal(plan.walls, null);
    assert.deepEqual(plan.remove, ['d1', 'd2', 'd3', 'v1', 'v2']);
    assert.equal(plan.drawersRemoved, true);
    assert.equal(plan.notice, 'W01: the recess left the cabinet; its 3 drawers and the two dividers that held them are gone. '
      + 'Add drawers again where the cabinet stands.');
    // One divider left before it went: the grammar of one.
    const one = followPlan(wardrobe({ dividers: [372], zone: 0 }), null, P);
    assert.equal(one.notice, 'W01: the recess left the cabinet; its 3 drawers and the divider that held them are gone. '
      + 'Add drawers again where the cabinet stands.');
    assert.equal(leaveNotice({ params: { unit_num: 'W02' } }, 1, 0),
      'W02: the recess left the cabinet; its 1 drawer is gone. Add drawers again where the cabinet stands.');
  });

  test('out of the band, 558 deep: the drawers stay at the carcass\'s depth, the dividers stay, no notice', () => {
    const plan = followPlan(wardrobe({ depth: 558, dividers: [110, 872] }), null, P);
    assert.deepEqual([plan.moves, plan.remove, plan.add, plan.zones, plan.drawersRemoved, plan.notice],
      [[], [], [], [], false, null]);
  });

  test('a band off the floor, or the engine\'s own refusal other than "dividers do not stand": the column leaves', () => {
    const off = followPlan(wardrobe(), { ...bandAt(200), z0: 400 }, P);
    assert.equal(off.drawersRemoved, true);
    const refused = { warnings: [{ code: 'RECESS_DRAWERS_SHALLOW', message: 'RECESS DRAWERS: the recess ends too close over the board over the drawers; the drawers keep the carcass\'s depth.' }] };
    assert.equal(followPlan(wardrobe(), bandAt(120), P, refused).drawersRemoved, true);
    const notStand = { warnings: [{ code: 'RECESS_DRAWERS_SHALLOW', message: 'RECESS DRAWERS: the dividers do not stand on the recess\'s edges; the drawers keep the carcass\'s depth.' }] };
    const plan = followPlan(wardrobe(), bandAt(120), P, notStand);
    assert.equal(plan.drawersRemoved, false);
    assert.deepEqual(plan.moves, [{ id: 'v1', x: 130 }, { id: 'v2', x: 892 }]);
  });

  test('the recess +200 in Room: centred, both dividers move; on its left reveal, the right edge reaches the side', () => {
    const centred = followPlan(wardrobe(), bandAt(100, 1000), P);
    assert.deepEqual(centred.moves, [{ id: 'v1', x: 110 }, { id: 'v2', x: 1072 }]);
    const wider = followPlan(wardrobe(), bandAt(200, 1000), P);
    assert.deepEqual(wider.walls, [['DIVIDER', 228], ['SIDE', 1182]]);
    assert.deepEqual([wider.moves, wider.remove], [[], ['v2']]);
  });

  test('back over the carcass: a marked divider gone is put back on its edge (the DECISION), the drawers back in Column 2', () => {
    const plan = followPlan(wardrobe({ dividers: [372], zone: 0 }), bandAt(200), P);
    assert.deepEqual(plan.moves, [{ id: 'v1', x: 972 }]);
    assert.deepEqual(plan.add, [{ x: 210, side: 'L' }]);
    assert.deepEqual(plan.zones.map((z) => z.zone), [1, 1, 1]);
  });

  test('the joiner\'s own divider (unmarked) is never moved nor removed by this road', () => {
    const own = { id: 'mine', kind: 'partition', x_mm: 1100, front_mm: 40 };
    const moved = followPlan(wardrobe({ extra: [own] }), bandAt(-400), P);
    assert.ok(!moved.moves.some((m) => m.id === 'mine'));
    assert.ok(!moved.remove.includes('mine'));
    const gone = followPlan(wardrobe({ extra: [own] }), null, P);
    assert.deepEqual(gone.remove, ['d1', 'd2', 'd3', 'v1', 'v2']);
    // A cabinet with no marked column: no plan.
    const bare = wardrobe({ dividers: [] });
    bare.params.sections[0].items = bare.params.sections[0].items.map(({ meta, ...i }) => i);
    assert.equal(followPlan(bare, bandAt(120), P), null);
  });

  test('one law one path: the walls are the engine\'s recessColWalls, the 30 the notch table\'s', () => {
    assert.equal(wallsOf, X.recessColWalls);
    assert.equal(minColumnSideOf(P), 30);
    const plan = followPlan(wardrobe(), bandAt(120), P, null, { wallsOf: () => [['SIDE', 18], ['DIVIDER', 892]] });
    assert.deepEqual(plan.remove, ['v1']);
  });
});

// ─── the store, the way the client clicks (enabled once F2's engine is in the tree) ─────────────────────────────

describe('T85 F3 . the store follows', async () => {
  const { rectCorners } = await import('../src/engine/room.js');
  const { useProjectStore } = await import('../src/stores/projectStore.js');
  const {
    flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
  } = await import('../src/stores/historyStore.js');
  const { useUiStore } = await import('../src/stores/uiStore.js');
  const { setGesture } = await import('../src/stores/historyBatch.js');
  const { recessAlignPlan } = await import('../src/stores/projectStore.js');
  const S = () => useProjectStore.getState();
  const unitOf = (id) => S().units.find((u) => u.id === id);
  const itemsOf = (id) => unitOf(id).params.sections[0].items;
  const partsOf = (id) => itemsOf(id).filter((i) => i.kind === 'partition').sort((a, b) => a.x_mm - b.x_mm);
  const drawersOf = (id) => itemsOf(id).filter((i) => i.kind === 'drawer');
  const notices = [];
  test.before(() => {
    watchProjectHistory();
    const real = useUiStore.getState().notify;
    useUiStore.setState({ notify: (msg, level, ...rest) => { notices.push([msg, level]); return real?.(msg, level, ...rest); } });
  });
  test.after(() => unwatchProjectHistory());

  /** The owner's room: the 800 x 300 recess at 1000, the 1200 x 300 wardrobe at 800, three drawers by RECESS. */
  function owner(depth = 300) {
    S().newProject();
    S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
    const recess = S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 800, depth: 300 });
    const a = S().addUnit('WARDROBE', { wall: 0, x: 200 });
    S().updateUnitParams(a.id, { width: 1200, depth });
    S().moveUnit(a.id, 800, 1);
    const res = S().addDrawers(a.id, 3, 'internal', 200, null, null, { columns: 'recess' });
    assert.equal(res.ok, true, res.error);
    flushHistory();
    notices.length = 0;
    return { id: a.id, recess };
  }

  test('addRecessDrawers marks its two dividers and its drawers', () => {
    const { id } = owner();
    assert.deepEqual(partsOf(id).map((p) => [p.x_mm, p.meta?.recessColumn]), [[210, true], [972, true]]);
    assert.deepEqual(drawersOf(id).map((d) => d.meta?.recessColumn), [true, true, true]);
  });

  test('moveUnit +80: the dividers follow, the drawers 440 deep, one undo step', () => {
    const { id } = owner();
    const depth = useHistoryStore.getState().past.length;
    S().moveUnit(id, 880, 1);
    flushHistory();
    assert.deepEqual(partsOf(id).map((p) => [p.x_mm, p.front_mm]), [[130, 0], [892, 0]]);
    const r = S().unitResult(id);
    assert.ok(r.derived.extension.column);
    assert.equal(r.panels.find((p) => p.id === 'Z2D1-SL').w, 440);
    assert.equal(useHistoryStore.getState().past.length, depth + 1);
  });

  test('moveUnit +600: one divider left, the drawers in Column 1, the box wall to wall', () => {
    const { id } = owner();
    S().moveUnit(id, 1400, 1);
    assert.deepEqual(partsOf(id).map((p) => p.x_mm), [372]);
    assert.deepEqual(drawersOf(id).map((d) => d.zone), [0, 0, 0]);
    const r = S().unitResult(id);
    assert.deepEqual(r.derived.extension.column.walls, [['SIDE', 18], ['DIVIDER', 372]]);
    assert.deepEqual(r.derived.extension.column.dividers, ['VPART-1']);
    const sl = r.panels.find((p) => p.id === 'Z1D1-SL');
    const sr = r.panels.find((p) => p.id === 'Z1D1-SR');
    assert.deepEqual([sl.box.x, sr.box.x + sr.box.w, sl.w], [23, 367, 440], 'wall to wall, 18 .. 372 less the runners\' 5');
    assert.deepEqual(r.warnings.filter((w) => /DRAWERS/.test(w.code)), []);
  });

  test('15 inside: the RETURN is the wall, one divider, the note', () => {
    const { id } = owner();
    S().moveUnit(id, 985, 1);
    assert.deepEqual(partsOf(id).map((p) => p.x_mm), [787]);
    const r = S().unitResult(id);
    assert.deepEqual(r.derived.extension.column.walls, [['RETURN', 43], ['DIVIDER', 787]]);
    assert.deepEqual(drawersOf(id).map((d) => d.zone), [0, 0, 0]);
    assert.ok(r.panels.some((p) => p.id === 'RETURN-L'));
    assert.deepEqual(r.warnings.map((w) => w.code), ['RECESS_DEAD_POCKET'], 'the note, never red');
    assert.equal(r.panels.find((p) => p.id === 'Z1D1-SL').w, 440);
  });

  test('the drag (a held gesture): out and back keeps the column; let go out of the band, it leaves in the drag\'s one undo', () => {
    const { id } = owner();
    const before = JSON.parse(JSON.stringify(S().units));
    const depth = useHistoryStore.getState().past.length;
    setGesture(true);
    S().moveUnit(id, 2200, 1, { follow: 'move' });
    assert.equal(drawersOf(id).length, 3, 'half way through the drag nothing is taken');
    S().moveUnit(id, 880, 1, { follow: 'move' });
    setGesture(false);
    flushHistory();
    assert.deepEqual(partsOf(id).map((p) => p.x_mm), [130, 892]);
    assert.equal(drawersOf(id).length, 3);
    assert.deepEqual(notices, []);
    assert.equal(useHistoryStore.getState().past.length, depth + 1);
    // Let go out of the band: taken as the gesture ends, the notice said, ONE undo for the drag and the removal.
    const mid = JSON.parse(JSON.stringify(S().units));
    setGesture(true);
    S().moveUnit(id, 1600, 1, { follow: 'move' });
    S().moveUnit(id, 2200, 1, { follow: 'move' });
    assert.equal(drawersOf(id).length, 3);
    setGesture(false);
    flushHistory();
    assert.deepEqual([partsOf(id), drawersOf(id)], [[], []]);
    assert.equal(notices.length, 1);
    assert.equal(useHistoryStore.getState().past.length, depth + 2);
    assert.ok(useHistoryStore.getState().undo());
    assert.deepEqual(JSON.parse(JSON.stringify(S().units)), mid, 'one Ctrl+Z, the cabinet where the drag began, its column whole');
    assert.ok(useHistoryStore.getState().undo());
    assert.deepEqual(JSON.parse(JSON.stringify(S().units)), before);
  });

  test('recessAlignPlan and alignDividersWithRecess answer as before (FROZEN 5)', () => {
    const { id } = owner();
    const u = unitOf(id);
    const plan = recessAlignPlan(u, S().unitResult(id), partsOf(id)[0].id);
    assert.deepEqual(plan, { moves: [{ id: partsOf(id)[0].id, x: 210 }, { id: partsOf(id)[1].id, x: 972 }], pair: true, done: true });
    const res = S().alignDividersWithRecess(id, partsOf(id)[0].id);
    assert.equal(res.ok, true, res.error);
    assert.deepEqual(partsOf(id).map((p) => [p.x_mm, p.front_mm]), [[210, 0], [972, 0]]);
  });

  test('out of the band, 300 deep: the drawers and the two dividers gone, the notice said, one undo restores all', () => {
    const { id } = owner();
    const before = JSON.parse(JSON.stringify(S().units));
    const depth = useHistoryStore.getState().past.length;
    S().moveUnit(id, 2200, 1);
    flushHistory();
    assert.deepEqual(partsOf(id), []);
    assert.deepEqual(drawersOf(id), []);
    assert.deepEqual(notices, [['W01: the recess left the cabinet; its 3 drawers and the two dividers that held them are gone. '
      + 'Add drawers again where the cabinet stands.', 'info']]);
    assert.equal(useHistoryStore.getState().past.length, depth + 1);
    assert.ok(useHistoryStore.getState().undo());
    assert.deepEqual(JSON.parse(JSON.stringify(S().units)), before);
  });

  test('the 558 cabinet out of the band: drawers at the carcass\'s depth, the dividers full height, no notice', () => {
    const { id } = owner(558);
    S().moveUnit(id, 2200, 1);
    assert.equal(partsOf(id).length, 2);
    assert.equal(drawersOf(id).length, 3);
    const r = S().unitResult(id);
    assert.equal(r.panels.find((p) => p.id === 'Z2D1-SL').w, 440);
    assert.deepEqual(notices, []);
  });

  test('a room edit of the recess (+200, centred) moves the dividers in the same step', () => {
    const { id, recess } = owner();
    S().updateWallSlope(recess, { x_mm: 900, width: 1000 });
    assert.deepEqual(partsOf(id).map((p) => p.x_mm), [110, 1072]);
  });

  test('a joiner\'s own divider is never moved by the road; the D26 button answers as before', () => {
    const { id } = owner();
    const ownId = S().addPartition(id, 1100);
    assert.ok(ownId);
    S().moveUnit(id, 880, 1);
    const own = partsOf(id).find((p) => p.id === ownId);
    assert.equal(own.x_mm, 1100, 'the joiner\'s own divider where he put it');
    assert.equal(own.meta?.recessColumn, undefined);
    assert.deepEqual(partsOf(id).filter((p) => p.meta?.recessColumn).map((p) => p.x_mm), [130, 892]);
    assert.deepEqual(drawersOf(id).map((d) => d.zone), [1, 1, 1]);
    // Out of the band, 300 deep: the column leaves with ITS dividers; his stays.
    S().moveUnit(id, 2200, 1);
    assert.deepEqual(partsOf(id).map((p) => p.id), [ownId]);
    // The D26 button answers as before on a divider he placed (FROZEN 5).
    assert.equal(typeof S().alignDividersWithRecess, 'function');
  });
});
