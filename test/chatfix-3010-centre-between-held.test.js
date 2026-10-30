/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 30.10.2026 · CENTER BETWEEN: THE TWO PIECES HELD FIRST ────────
//
// The owner (30.10.2026): *"powinno sie najpierw wybrac dwie polki a pozniej
// nacisnac centre between i cala reszta pomiedzy tymi polkami sie centruja"*.
// T79 F12 asked the other order (press, then the lower, then the upper pick)
// and still does; `armCentreBetween` now reads the selection first: exactly
// two pieces of the cabinet held (Ctrl+click, T36 F2) ARE the two picks, and
// the project store's subscription runs the act on the press itself. Every
// claim is read off the engine's own panels after the store acted.

import test from 'node:test';
import assert from 'node:assert/strict';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore, CENTRE_BETWEEN_SAY } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';

const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const G = P.board.thickness;

const panelsOf = (id) => S().unitResult(id).panels;
const shelfYs = (id) => panelsOf(id).filter((p) => p.part === 'SHELF').map((p) => p.box.y).sort((a, b) => a - b);
const lastMessage = () => {
  const m = U().messages || [];
  return m.length ? (m[m.length - 1].text ?? m[m.length - 1].message ?? null) : null;
};

/** A 1200 x 2200 wardrobe, three internal drawers under their cap (647), three uneven shelves above. */
function aWardrobe() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  U().clearSelection();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  assert.equal(S().addDrawers(id, 3, 'internal', 200).ok, true);
  for (const pos of [900, 1000, 1900]) S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: pos });
  U().selectUnit(id);
  const byY = (y) => panelsOf(id).find((p) => p.part === 'SHELF' && p.box.y === y).id;
  return { id, byY };
}

test('30.10 · the cap and the top shelf held (Ctrl+click), then Center between: the two between come out on equal gaps, on the press itself', () => {
  const { id, byY } = aWardrobe();
  const top = byY(1900);
  U().selectElement(id, 'PARTITION');
  U().selectElement(id, top, { additive: true });
  assert.equal(U().selectedElements.length, 2, 'two pieces held');
  U().armCentreBetween(id);
  // The act ran on the press: the mode is over, the two shelves between stand on equal clear gaps.
  assert.equal(U().centreBetween, null, 'the mode did not end on the press');
  const ys = shelfYs(id);
  assert.equal(ys[2], 1900, 'the held upper shelf never moves');
  // (1900 - 647 - 2 x 18) / 3 = 405.67, on the 0.5 step.
  const gaps = [ys[0] - 647, ys[1] - (ys[0] + G), 1900 - (ys[1] + G)];
  for (const g of gaps) assert.ok(Math.abs(g - gaps[0]) <= P.editor.mmStep + 1e-9, `the gaps are not equal: ${gaps.join(', ')}`);
  // The selection stays as the hand left it.
  assert.equal(U().selectedElements.length, 2);
});

test('30.10 · held in the other order (the upper first) is the same act: the store reads the two by height', () => {
  const a = aWardrobe();
  U().selectElement(a.id, 'PARTITION');
  U().selectElement(a.id, a.byY(1900), { additive: true });
  U().armCentreBetween(a.id);
  const first = shelfYs(a.id);
  const b = aWardrobe();
  U().selectElement(b.id, b.byY(1900));
  U().selectElement(b.id, 'PARTITION', { additive: true });
  U().armCentreBetween(b.id);
  assert.deepEqual(shelfYs(b.id), first);
});

test('30.10 · one piece held, or none: the press arms the two picks as T79 F12 did (press, lower, upper)', () => {
  const { id, byY } = aWardrobe();
  U().selectElement(id, byY(900));
  U().armCentreBetween(id);
  assert.deepEqual(U().centreBetween, { unitId: id, lower: null, upper: null });
  U().cancelCentreBetween();
  U().clearElement();
  U().armCentreBetween(id);
  assert.deepEqual(U().centreBetween, { unitId: id, lower: null, upper: null });
  // …and the two picks from the view finish it, as before.
  U().selectElement(id, 'PARTITION', { pick: true });
  assert.equal(U().centreBetween.lower, 'PARTITION');
  U().selectElement(id, 'TOP', { pick: true });
  assert.equal(U().centreBetween, null);
  const ys = shelfYs(id);
  const gaps = [ys[0] - 647, ys[1] - (ys[0] + G), ys[2] - (ys[1] + G), (2200 - G) - (ys[2] + G)];
  for (const g of gaps) assert.ok(Math.abs(g - gaps[0]) <= P.editor.mmStep + 1e-9, `the gaps are not equal: ${gaps.join(', ')}`);
});

test('30.10 · three pieces held: not two picks, so the press arms the mode and nothing moves', () => {
  const { id, byY } = aWardrobe();
  const before = shelfYs(id);
  U().selectElement(id, byY(900));
  U().selectElement(id, byY(1000), { additive: true });
  U().selectElement(id, byY(1900), { additive: true });
  U().armCentreBetween(id);
  assert.deepEqual(U().centreBetween, { unitId: id, lower: null, upper: null });
  assert.deepEqual(shelfYs(id), before);
  U().cancelCentreBetween();
});

test('30.10 · two held with nothing between them: the store says so in words, nothing moves, the mode is over', () => {
  const { id, byY } = aWardrobe();
  const before = shelfYs(id);
  U().clearMessages?.();
  U().selectElement(id, byY(900));
  U().selectElement(id, byY(1000), { additive: true });
  U().armCentreBetween(id);
  assert.equal(U().centreBetween, null);
  assert.deepEqual(shelfYs(id), before);
  assert.equal(lastMessage(), CENTRE_BETWEEN_SAY.none);
});

test('30.10 · two held of which one may not be picked (a divider): refused in the store\'s own sentence', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  U().clearSelection();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  S().addPartition(id, 591);
  S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: 900, zone: 0 });
  S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: 1500, zone: 0 });
  U().selectUnit(id);
  U().clearMessages?.();
  const shelf = panelsOf(id).find((p) => p.part === 'SHELF' && p.box.y === 1500).id;
  U().selectElement(id, 'VPART-1');
  U().selectElement(id, shelf, { additive: true });
  U().armCentreBetween(id);
  assert.equal(U().centreBetween, null);
  assert.equal(lastMessage(), CENTRE_BETWEEN_SAY.kind);
});

test('30.10 · pieces of ANOTHER cabinet in the selection are not this cabinet\'s picks', () => {
  const { id } = aWardrobe();
  const added = S().addUnit('WARDROBE', { wall: 0, x: 100, params: { width: 1200, height: 2200, depth: 600 } });
  assert.equal(added.error, null, added.error);
  const other = added.id;
  S().addItem(other, { kind: 'shelf', variant: 'adjustable', pos_mm: 900 });
  S().addItem(other, { kind: 'shelf', variant: 'adjustable', pos_mm: 1500 });
  const o = panelsOf(other).filter((p) => p.part === 'SHELF').map((p) => p.id);
  U().selectElement(other, o[0]);
  U().selectElement(other, o[1], { additive: true });
  U().armCentreBetween(id);
  assert.deepEqual(U().centreBetween, { unitId: id, lower: null, upper: null });
  U().cancelCentreBetween();
});
