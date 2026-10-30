/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 30.10.2026 · THE SHELF LADDER STANDS ON THE COLUMN'S OWN CAP ──
//
// The owner, after Center between over drawers standing in a recess column
// (30.10.2026): *"nawet nie pokazuje wymiaru pomiedzy polka a polka
// szufladowa"*; *"polka nad szufladami przez program nie jest brana jako
// polka"*. The shelves WERE centred (the store's own numbers, below); the
// ladder of dimensions in the view measured the lowest shelf from the bottom
// of the cabinet, because its floor came from `assemblies.drawerZone`, which
// only a full-width stack has. A stack in one column (T79 F3's two columns,
// the recess column of 28.10) closes under its own `PARTITION` board.
//
// The law now (engine/shelfHeights.js shelfColumns): a column's floor is the
// top face of the highest cap board standing under its lowest shelf and across
// its run, when that is above the floor handed in. Every number below is read
// off the engine's own panels after the store acted.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { shelfColumns } from '../src/engine/shelfHeights.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const G = P.board.thickness;

function aRoom() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  U().clearSelection();
}

/** The view's own call (3d/UnitView.jsx shelfColumnList), on this unit. */
function ladder(id) {
  const unit = S().units.find((u) => u.id === id);
  const r = S().unitResult(id);
  return shelfColumns({
    panels: r.panels,
    floor: G,
    ceiling: Number(unit.params.height) - G,
    width: Number(unit.params.width),
    tolerance: P.carcass.shelfWidthClearance,
  }, P.editor.mmStep);
}
const sizes = (col) => col.lights.map((l) => l.size);
const shelfY = (id) => S().unitResult(id).panels.filter((p) => p.part === 'SHELF').map((p) => p.box.y).sort((a, b) => a - b);

// ─── 1 · THE FULL-WIDTH STACK: THE NUMBER drawerZone GAVE, TO THE MILLIMETRE ─

test('30.10 · a full-width stack: the ladder starts on the cap (647), as it did; Center between cap to TOP reads 499.5 / 500 / 499.5', () => {
  aRoom();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  assert.equal(S().addDrawers(id, 3, 'internal', 200).ok, true);
  for (const pos of [1200, 1300]) S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: pos });
  const r = S().unitResult(id);
  assert.equal(r.assemblies.drawerZone.top + G, 647, 'the stack\'s cap is not where T79 left it');
  const [col] = ladder(id);
  assert.equal(col.lights[0].from, 647, 'the ladder does not start on the cap');
  assert.deepEqual(S().centreShelvesBetween(id, 'PARTITION', 'TOP'), { ok: true, count: 2 });
  assert.deepEqual(shelfY(id), [1146.5, 1664.5]);
  assert.deepEqual(sizes(ladder(id)[0]), [499.5, 500, 499.5]);
});

// ─── 2 · THE RECESS COLUMN (28.10): THE OWNER'S CASE ─────────────────────────

test('30.10 · drawers in the recess column: the ladder starts on the cap, not on the bottom; after Center between it reads 483 three times', () => {
  aRoom();
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 800, depth: 300 });
  const a = S().addUnit('WARDROBE', { wall: 0, x: 200 });
  S().updateUnitParams(a.id, { width: 1200, depth: 300 });
  S().moveUnit(a.id, 800, 1);
  const res = S().addDrawers(a.id, 3, 'internal', 200);
  assert.equal(res.recess, true, res.error);
  for (const pos of [1200, 1300]) S().addItem(a.id, { kind: 'shelf', variant: 'adjustable', pos_mm: pos, zone: 1 });
  const r = S().unitResult(a.id);
  assert.equal(r.assemblies.drawerZone, null, 'a column\'s stack is not a drawerZone');
  const cap = r.panels.find((p) => p.part === 'PARTITION');
  assert.equal(cap.box.y + cap.box.h, 647);
  // Before: the view measured 1200 - 18 = 1182 under the lowest shelf. Now 553.
  const [before] = ladder(a.id);
  assert.equal(before.lights[0].from, 647);
  assert.equal(before.lights[0].size, 553);
  assert.deepEqual(S().centreShelvesBetween(a.id, 'PARTITION', 'TOP'), { ok: true, count: 2 });
  assert.deepEqual(shelfY(a.id), [1130, 1631]);
  assert.deepEqual(sizes(ladder(a.id)[0]), [483, 483, 483]);
});

// ─── 3 · ONE COLUMN OF A DIVIDED CABINET: ITS OWN CAP, THE OTHER BAY THE FLOOR ─

test('30.10 · a lone column (Z1-PART): that bay\'s ladder starts on its cap; the other bay\'s on the carcass floor', () => {
  aRoom();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  const pid = S().addPartition(id, 591);
  S().updateItem(id, pid, { front_mm: 0 });
  assert.equal(S().addDrawers(id, 3, 'internal', 200, 0).ok, true);
  // Both stacks stand under the divider's reach, so the two bays keep their own walls.
  S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: 300, zone: 1 });
  S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: 1200, zone: 0 });
  const r = S().unitResult(id);
  const cap = r.panels.find((p) => p.id === 'Z1-PART');
  assert.ok(cap, 'no Z1-PART');
  assert.equal(cap.box.x + cap.box.w, 591, 'the lone cap spans its bay only');
  const cols = ladder(id);
  const left = cols.find((c) => c.shelves.some((p) => p.meta?.zone === 0));
  const right = cols.find((c) => c.shelves.some((p) => p.meta?.zone === 1));
  assert.ok(left && right && left !== right, 'two bays, two ladders');
  assert.equal(left.lights[0].from, 647, 'the drawer bay starts on its cap');
  assert.equal(right.lights[0].from, G, 'the open bay starts on the floor');
});

// ─── 4 · NO DRAWERS: NOTHING CHANGES ──────────────────────────────────────────

test('30.10 · no drawers: the ladder starts on the carcass floor, as it always has', () => {
  aRoom();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  for (const pos of [700, 1400]) S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: pos });
  const [col] = ladder(id);
  assert.equal(col.lights[0].from, G);
  assert.deepEqual(sizes(col), [682, 682, 764]);
});

// ─── 5 · THE VIEW READS THE ONE LAW ──────────────────────────────────────────

test('30.10 · UnitView hands shelfColumns the carcass floor only; drawerZone is no longer its floor', () => {
  const view = read('src/3d/UnitView.jsx');
  const call = view.slice(view.indexOf('const shelfColumnList = useMemo(() => shelfColumns({'));
  const block = call.slice(0, call.indexOf(']);') + 3);
  assert.match(block, /floor: interiorFloor\(G\),/);
  assert.doesNotMatch(block, /drawerZone/);
  const engine = read('src/engine/shelfHeights.js');
  assert.match(engine, /CHAT FIX 30\.10\.2026 · THE COLUMN STANDS ON ITS OWN DRAWER CAP/);
  assert.match(engine, /p\.part === 'PARTITION'/);
});
