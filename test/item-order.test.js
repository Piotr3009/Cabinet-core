// ─── The order interior items are listed in (BACKLOG #1) ───
//
// The bug: the top row of the drawer list in the right panel was the BOTTOM
// drawer in 3D. The fix is not "reverse the array in the view" — it is having
// one written-down convention, which engine/items.js now is.
//
// So the test is the 1:1 claim itself: row i of the list must be the piece at
// the i-th highest position in the ENGINE's own output. Nothing here trusts a
// screenshot, and nothing re-derives a geometry: the y values come from
// computeCabinet.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  drawerRows, drawersInEngineOrder, hangerOf, nextHangerOffset, nextShelfPos,
  shelfRows, shelvesInEngineOrder,
} from '../src/engine/items.js';

const items = [
  { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
  { id: 'd2', kind: 'drawer', index: 2, height_mm: 250 },
  { id: 'd3', kind: 'drawer', index: 3, height_mm: 150 },
  { id: 's1', kind: 'shelf', pos_mm: 1200 },
  { id: 's2', kind: 'shelf', pos_mm: 1700 },
  { id: 'h1', kind: 'hanger', pos_mm: 900 },
];

const wardrobe = (extra = {}) => computeCabinet({
  type: 'WARDROBE', width: 600, height: 2150, depth: 578, board_t: 18, front_t: 25,
  unit_num: 'W01', ...extra,
}, P);

// ─── the two orders, and which is which ───

test('the engine order is bottom-up: D1 is the drawer nearest the floor', () => {
  assert.deepEqual(drawersInEngineOrder(items).map((i) => i.id), ['d1', 'd2', 'd3']);
  assert.deepEqual(shelvesInEngineOrder(items).map((i) => i.id), ['s1', 's2']);

  // Order comes off `index`, not off the array: an editor that appends does not
  // silently renumber the stack.
  const shuffled = [items[2], items[0], items[1]];
  assert.deepEqual(drawersInEngineOrder(shuffled).map((i) => i.id), ['d1', 'd2', 'd3']);
});

test('the list order is top-down, and each row keeps its cut-list number', () => {
  const rows = drawerRows(items);
  assert.deepEqual(rows.map((r) => r.item.id), ['d3', 'd2', 'd1'], 'top of the list is the top drawer');
  assert.deepEqual(rows.map((r) => r.label), ['D3', 'D2', 'D1'], 'D1 stays the bottom drawer, as the workshop cuts it');

  const shelves = shelfRows(items);
  assert.deepEqual(shelves.map((r) => r.item.id), ['s2', 's1']);
  assert.deepEqual(shelves.map((r) => r.label), ['S2', 'S1']);
});

// ─── the claim that matters: list row i == i-th highest piece in 3D ───

test('row order matches the height order of the engine drawer fronts, 1:1', () => {
  const heights = [200, 250, 150];
  const r = wardrobe({ drawers: 3, drawer_heights: heights });
  const stack = r.assemblies.drawerFronts;
  assert.equal(stack.length, 3);

  const rows = drawerRows(heights.map((h, i) => ({ id: `d${i + 1}`, kind: 'drawer', index: i + 1, height_mm: h })));
  // Front y from the engine, highest first — what the eye sees top to bottom.
  const byHeight = [...stack].sort((a, b) => b.y - a.y).map((f) => f.index);
  assert.deepEqual(rows.map((row) => row.num), byHeight);

  // And the number on the row is the number the engine put on the panel.
  for (const row of rows) {
    const front = r.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta.drawer === row.num);
    assert.ok(front, `no DRAWER-FRONT for ${row.label}`);
    assert.equal(front.h, row.num === 1 ? heights[0] - P.wardrobe.drawers.firstFrontAdjust : heights[row.num - 1]);
  }
});

test('the same holds for a BUDR, whose three fronts are a fixed 4:3:2 split', () => {
  const r = computeCabinet({ type: 'BUDR', width: 600, height: 770, depth: 558, unit_num: 'DR01' }, P);
  const rows = drawerRows([1, 2, 3].map((n) => ({ id: `d${n}`, kind: 'drawer', index: n })));
  const byHeight = [...r.assemblies.drawerFronts].sort((a, b) => b.y - a.y).map((f) => f.index);
  assert.deepEqual(rows.map((row) => row.num), byHeight);
  // The tallest front of a 4:3:2 stack is the bottom one — so the list must end
  // with it, not start with it.
  assert.equal(rows[rows.length - 1].num, 1);
  assert.ok(r.derived.front_heights[0] > r.derived.front_heights[2]);
});

test('shelf rows match the engine shelf rows, highest first', () => {
  const positions = [500, 1100, 1750];
  const r = wardrobe({
    shelves: positions.length,
    items: positions.map((pos, i) => ({ id: `s${i + 1}`, kind: 'shelf', pos_mm: pos })),
  });
  const rows = shelfRows(positions.map((pos, i) => ({ id: `s${i + 1}`, kind: 'shelf', pos_mm: pos })));
  const drawn = r.panels.filter((p) => p.part === 'SHELF').sort((a, b) => b.box.y - a.box.y);
  assert.deepEqual(rows.map((row) => row.num), drawn.map((p) => p.meta.index));
  assert.deepEqual(rows.map((row) => row.item.pos_mm), drawn.map((p) => p.box.y));
});

test('hangerOf finds the rail, and an empty section has no rows at all', () => {
  assert.equal(hangerOf(items).id, 'h1');
  assert.equal(hangerOf([]), null);
  assert.deepEqual(drawerRows([]), []);
  assert.deepEqual(shelfRows([]), []);
});

// ─── auto-placement (BACKLOG #12) ───

const band = { min: 100, max: 2000, floor: 18, ceiling: 2132 };

test('shelves fill from the top down and never land on one another', () => {
  assert.equal(nextShelfPos({ band, positions: [] }, P), band.max, 'the first one goes to the top');

  const second = nextShelfPos({ band, positions: [2000] }, P);
  assert.equal(second, 2000 - P.editor.itemStackPitch);

  // A pitch that would breach the minimum gap is pulled back to the gap.
  const tight = { min: 100, max: 2000 };
  const packed = nextShelfPos({ band: tight, positions: [140] }, P);
  assert.equal(packed, 140 - P.editor.minShelfGap);

  // No room left → null, so the caller can say so instead of stacking two
  // shelves in the same slot.
  assert.equal(nextShelfPos({ band: { min: 100, max: 2000 }, positions: [120] }, P), null);
});

test('the hanger rail goes as high as it can under the lowest shelf', () => {
  const RL = P.wardrobe.rail;
  const E = P.editor;

  // No shelves: the type default is honoured (a wardrobe rail at 1400).
  assert.equal(nextHangerOffset({ band, positions: [], zoneBase: 0, fallback: 1400 }, P), 1400);
  // …and it stays honoured while it still fits under the shelves that are there.
  assert.equal(nextHangerOffset({ band, positions: [1800], zoneBase: 0, fallback: 1400 }, P), 1400);

  // A shelf low enough to be in the way pushes the rail down under it.
  const under = nextHangerOffset({ band, positions: [1300], zoneBase: 0, fallback: 1400 }, P);
  assert.equal(under, 1300 - RL.partitionAbove - E.minShelfGap);
  assert.ok(under < 1300, 'the rail cannot sit on the shelf it hangs below');

  // With no default at all it simply goes as high as it can.
  assert.equal(
    nextHangerOffset({ band, positions: [1500], zoneBase: 0, fallback: null }, P),
    1500 - RL.partitionAbove - E.minShelfGap,
  );

  // Above a drawer stack the offset is measured from the partition, not the floor.
  const overDrawers = nextHangerOffset({ band, positions: [1500], zoneBase: 700, fallback: null }, P);
  assert.equal(overDrawers, 1500 - RL.partitionAbove - E.minShelfGap - 700);

  // Never negative, however low the shelf.
  assert.equal(nextHangerOffset({ band, positions: [120], zoneBase: 0, fallback: null }, P), E.minShelfGap);
});
