// ─── Adding things to a unit (BACKLOG #11, #12, #14) ───
//
// These are STORE rules, not view rules, which is why they are testable here:
// a new item goes where it cannot collide, "Equal heights" is one height for the
// whole stack, and the rail the workshop picked reaches the BOM as a product
// rather than as a length.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore, shelfLimits, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildBom } from '../src/engine/bom.js';
import { drawersInEngineOrder, shelvesInEngineOrder } from '../src/engine/items.js';
// Turn 24 (CLAUDE.md F3.1): no thickness, no drawers — the gate, opened.
import { confirmDrawerBox } from './drawer-box-gate.js';

const store = () => useProjectStore.getState();

/** A clean project with one unit of `type`, and its id. */
function withUnit(type = 'WARDROBE') {
  store().loadProject({ id: null, name: 'test', room: null, design: null }, []);
  const { id, error } = store().addUnit(type);
  assert.equal(error, null, error || '');
  return id;
}

const itemsOf = (id) => store().units.find((u) => u.id === id)?.params.sections?.[0]?.items || [];

// ─── TURN 11 (CLAUDE.md F2.3) ───
// This used to say "shelves fill from the TOP down" and assert that the first
// one lands on `band.max`. Piotr's verdict killed that rule: a single shelf 40 mm
// under the wieniec is a shelf nobody would fit, and every set of shelves had to
// be corrected with Even before it was worth looking at. An added shelf HALVES
// the biggest opening it can find (engine/items.js `centredShelfPos`).
//
// What has NOT changed, and is what this test is really for, is the second half
// of its old name: no added item ever lands on one that is already there.
test('an added shelf is centred in the biggest opening, and never lands on another', () => {
  const id = withUnit('WARDROBE');
  const unit = store().units.find((u) => u.id === id);
  const band = shelfLimits(unit, P);
  const G = unit.params.board_t ?? P.board.thickness;

  store().addShelves(id, 1);
  let positions = shelvesInEngineOrder(itemsOf(id)).map((s) => s.pos_mm);
  assert.equal(positions.length, 1);
  const below = positions[0] - band.floor;
  const above = band.ceiling - (positions[0] + G);
  assert.ok(Math.abs(below - above) <= P.editor.mmStep,
    `the first shelf halves the zone — ${below} below, ${above} above`);

  store().addShelves(id, 2);
  positions = shelvesInEngineOrder(itemsOf(id)).map((s) => s.pos_mm);
  assert.equal(positions.length, 3);
  // Ascending, each at least the minimum gap above the last: that IS "no new
  // item collides with an existing one".
  for (let i = 1; i < positions.length; i += 1) {
    assert.ok(positions[i] - positions[i - 1] >= P.editor.minShelfGap,
      `shelves ${i} and ${i + 1} are ${positions[i] - positions[i - 1]} mm apart`);
  }
  assert.ok(positions.every((p) => p >= band.min && p <= band.max), 'all inside the band');
});

test('when the height runs out, the extra shelves are refused and counted', () => {
  const id = withUnit('LOW_CABINET');
  const before = shelvesInEngineOrder(itemsOf(id)).length;
  const { added, requested } = store().addShelves(id, 10);
  assert.equal(requested, 10);
  assert.ok(added < 10, `a 600 mm cabinet cannot take ten shelves — it took ${added}`);
  assert.equal(shelvesInEngineOrder(itemsOf(id)).length, before + added, 'exactly what was reported went in');

  // And when there is genuinely no room at all, nothing is added and it says 0.
  const packed = store().addShelves(id, 5);
  assert.equal(packed.added, 0);
});

test('drawers stack from the bottom, and the shelves above them re-settle', () => {
  const id = withUnit('WARDROBE');
  store().addShelves(id, 2);
  const highBefore = Math.max(...shelvesInEngineOrder(itemsOf(id)).map((s) => s.pos_mm));

  confirmDrawerBox();
  store().addDrawers(id, 3, 'overlay', 250);
  const drawers = drawersInEngineOrder(itemsOf(id));
  assert.deepEqual(drawers.map((d) => d.index), [1, 2, 3], 'numbered bottom-up for the engine');

  const unit = store().units.find((u) => u.id === id);
  const result = computeCabinet(paramsForEngine(unit), P);
  const zoneTop = result.assemblies.drawerZone.top;
  for (const sh of shelvesInEngineOrder(itemsOf(id))) {
    assert.ok(sh.pos_mm > zoneTop, `shelf at ${sh.pos_mm} is inside the drawer zone (top ${zoneTop})`);
  }
  assert.ok(highBefore > 0);
});

test('Equal heights is one height for the whole stack, clamped once', () => {
  const id = withUnit('WARDROBE');
  confirmDrawerBox();
  store().addDrawers(id, 3, 'overlay', 200);

  store().setAllDrawerHeights(id, 260);
  assert.deepEqual(drawersInEngineOrder(itemsOf(id)).map((d) => d.height_mm), [260, 260, 260]);
  assert.equal(store().units.find((u) => u.id === id).params.drawer_equal_heights, true);

  // Out of range is pulled back to the workshop limit, not rejected.
  assert.equal(store().setAllDrawerHeights(id, 5000), P.wardrobe.drawers.maxFrontHeight);
  assert.deepEqual(
    drawersInEngineOrder(itemsOf(id)).map((d) => d.height_mm),
    Array(3).fill(P.wardrobe.drawers.maxFrontHeight),
  );
  assert.equal(store().setAllDrawerHeights(id, 1), P.wardrobe.drawers.minFrontHeight);
});

test('unticking Equal heights keeps the stack; ticking it back adopts the bottom drawer', () => {
  const id = withUnit('WARDROBE');
  confirmDrawerBox();
  store().addDrawers(id, 3, 'overlay', 200);
  store().setDrawerEqualHeights(id, false);
  assert.equal(store().units.find((u) => u.id === id).params.drawer_equal_heights, false);

  const [bottom, middle] = drawersInEngineOrder(itemsOf(id));
  store().setDrawerHeight(id, bottom.id, 150);
  store().setDrawerHeight(id, middle.id, 300);
  assert.deepEqual(drawersInEngineOrder(itemsOf(id)).map((d) => d.height_mm), [150, 300, 200]);

  // Ticking it back has to MEAN something: the bottom drawer wins, because that
  // is the one the eye starts from.
  store().setDrawerEqualHeights(id, true);
  assert.deepEqual(drawersInEngineOrder(itemsOf(id)).map((d) => d.height_mm), [150, 150, 150]);
});

test('the hanger rail lands between the drawers and the shelves', () => {
  const id = withUnit('WARDROBE');
  confirmDrawerBox();
  store().addDrawers(id, 2, 'overlay', 200);
  store().addShelves(id, 1);
  store().addHangerRail(id, { materialId: 'hw_rail_oval', materialLabel: 'Oval hanging rail 30 × 15' });

  const unit = store().units.find((u) => u.id === id);
  const result = computeCabinet(paramsForEngine(unit), P);
  const railY = result.derived.rail_y;
  const partitionTop = result.assemblies.drawerZone.top + unit.params.board_t;
  const shelf = shelvesInEngineOrder(itemsOf(id))[0].pos_mm;

  assert.ok(railY > partitionTop, `rail at ${railY} must clear the drawer partition at ${partitionTop}`);
  assert.ok(result.derived.rail_partition_y < shelf, 'and its partitioner must stay under the shelf above it');

  // A second rail is refused rather than stacked on the first.
  assert.equal(store().addHangerRail(id, {}), null);
  assert.equal(itemsOf(id).filter((i) => i.kind === 'hanger').length, 1);
});

test('the rail chosen from the hardware list is what the BOM orders', () => {
  const id = withUnit('WARDROBE');
  store().addHangerRail(id, { materialId: 'hw_rail_oval', materialLabel: 'Oval hanging rail 30 × 15' });

  const unit = store().units.find((u) => u.id === id);
  const result = computeCabinet(paramsForEngine(unit), P);
  const line = result.hardware.find((h) => h.role === 'rail');
  assert.equal(line.qty, 1);
  assert.equal(line.spec.material_id, 'hw_rail_oval');
  assert.match(line.spec_label, /Oval hanging rail/);
  assert.match(line.spec_label, /mm/, 'the cut length is still there — it is a rail you cut');

  const bom = buildBom([{ unit, result }]);
  const row = bom.hardware.find((h) => h.role === 'rail');
  assert.match(row.spec_label, /Oval hanging rail/);

  // No product chosen: the line still exists with its length, because the
  // QUANTITY is geometry and does not wait for a purchasing decision.
  const plain = withUnit('LOW_CABINET');
  store().addHangerRail(plain, {});
  const plainUnit = store().units.find((u) => u.id === plain);
  const plainLine = computeCabinet(paramsForEngine(plainUnit), P).hardware.find((h) => h.role === 'rail');
  assert.equal(plainLine.qty, 1);
  assert.equal(plainLine.spec.material_id, null);
  assert.match(plainLine.spec_label, /^\d+ mm$/);
});
