// ─── Turn 32, CLAUDE.md F7: ready-made drawer boxes ─────────────────────────
//
// The wizard's materials block asks ONCE per project. Same-board is the
// default and is already the engine's behaviour (the box inherits the
// confirmed carcass thickness — chat fix 15.08). Ready-made: the box parts
// leave the CUTTING and a purchase line appears in the BOM (F5); the fronts
// stay ours, and the GEOMETRY stays computed — the drawer still exists in 3D
// and the front still needs its drilling.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { buildBom } from '../src/engine/bom.js';
import { migrateDesign } from '../src/engine/design.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const wardrobe = (extra = {}) => ({
  type: 'WARDROBE', width: 900, height: 2400, depth: 568, unit_num: '01', drawers: 2, ...extra,
});

test('the answer survives migration; anything else means "same board"', () => {
  assert.equal(migrateDesign({ drawerBoxes: { mode: 'ready' } }).drawerBoxes.mode, 'ready');
  assert.equal(migrateDesign({ drawerBoxes: { mode: 'same' } }).drawerBoxes.mode, 'same');
  assert.equal(migrateDesign({ drawerBoxes: { mode: 'ikea' } }).drawerBoxes.mode, null);
  assert.equal(migrateDesign(null).drawerBoxes.mode, null);
});

test('READY: the box parts leave the cutting list — and ONLY the cutting list', () => {
  const cut = computeCabinet(wardrobe(), P);
  const bought = computeCabinet(wardrobe({ drawer_boxes: 'ready' }), P);

  // The GEOMETRY is identical: the drawer still exists in 3D, every board of
  // it, and the front still carries its drilling.
  assert.deepEqual(
    bought.panels.map((p) => [p.id, p.w, p.h]),
    cut.panels.map((p) => [p.id, p.w, p.h]),
    'not one panel moved',
  );
  assert.deepEqual(bought.drills, cut.drills, 'not one hole moved');

  // …but the CSV the saw reads has no box rows left.
  const boxIds = cut.panels.filter((p) => p.role === 'drawer_box').map((p) => p.id);
  assert.ok(boxIds.length >= 8, 'two drawers of boxes existed to leave');
  for (const id of boxIds) {
    assert.ok(cut.csvLines.some((l) => l.includes(id)), `${id} was cut before`);
    assert.ok(!bought.csvLines.some((l) => l.includes(id)), `${id} still on the saw's list`);
  }
  // The FRONTS stay ours (the CSV names pieces by id — the DF rows).
  assert.ok(bought.csvLines.some((l) => /-DF\d/.test(l)), 'the faces are still cut');
});

test('READY: the BOM counts no box boards, and the areas follow', () => {
  const params = wardrobe();
  const entries = [{ unit: { id: 'u1', params, type: params.type }, result: computeCabinet(params, P) }];
  const design = migrateDesign(null);
  const cut = buildBom(entries, { design, profile: P });
  const bought = buildBom(entries, { design, profile: P, excludeDrawerBoxes: true });
  assert.ok(!bought.cutRows.some((r) => r.role === 'drawer_box'));
  assert.ok(bought.totals.board_area_m2 < cut.totals.board_area_m2, 'the box boards left the total');
  assert.equal(bought.totals.front_area_m2, cut.totals.front_area_m2, 'the fronts are untouched');
});

test('a project that never answered cuts every board, exactly as before', () => {
  store().loadProject({
    id: null, name: 't32-f7', room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
  const { id } = store().addUnit('WARDROBE');
  store().addDrawers(id, 2, 'overlay', 220);
  const unit = store().units.find((u) => u.id === id);
  assert.equal(paramsForEngine(unit, migrateDesign(store().project.design)).drawer_boxes, null);
  const r = store().unitResult(id);
  assert.ok(r.csvLines.some((l) => /D1-SL/.test(l)), 'the box is on the saw’s list');

  // …and the wizard's answer travels the override channel to the same place.
  store().setDesign({ drawerBoxes: { mode: 'ready' } });
  const after = store().unitResult(id);
  assert.ok(!after.csvLines.some((l) => /D1-SL/.test(l)), 'bought — off the saw’s list');
});
