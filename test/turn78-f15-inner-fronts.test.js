// ─── T78 · F15 · INTERNAL DRAWERS GET FRONTS ─────────────────────────────────
//
// The owner, 11.10.2026: *"szuflady wewnetrzne powinny miec fronty."*  Every
// internal drawer (behind doors: the wardrobe's, PANTRY's, BUD_INT's) gets an
// INNER FRONT: a board of the front material, width = the box width plus the
// profile's overhang (0), height = the box side height, screwed to the box
// front through the box's own fixing (the T34 shoe-box pattern), role
// drawer_front with meta.inner, in the cut list, the BOM, the drawings and the
// spray schedule. The T33 F6 door setback is re-measured against it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { drawerMotion } from '../src/engine/drawerMotion.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

test('F15 · the numbers: profile.wardrobe.drawers.innerFront proposed; Blum\'s inner front in the file, owner to confirm', () => {
  assert.deepEqual(P.wardrobe.drawers.innerFront, { overhangMm: 0, heightMm: 'box side height' });
  assert.match(read('src/engine/profile.js'), /innerFront: \{ overhangMm: 0, heightMm: 'box side height' \},/);
  const json = JSON.parse(read('reference/hardware/blum-inner-front.json'));
  assert.equal(json.status, 'owner to confirm');
  assert.ok(json.frontPiece, 'the aluminium front piece Blum sells');
});

test('F15 · BUD_INT and PANTRY: every internal drawer gets its inner front, the box\'s width and side height, on the box front, front material', () => {
  for (const type of ['BUD_INT', 'PANTRY']) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: 'U1' }, P);
    const sides = r.panels.filter((p) => p.part === 'DRAWER-SIDE' && /SL$/.test(p.id));
    const inner = r.panels.filter((p) => p.role === 'drawer_front');
    assert.ok(sides.length >= 2, `${type} has internal drawers`);
    assert.equal(inner.length, sides.length, `${type}: one inner front per internal drawer`);
    assert.equal(r.panels.filter((p) => p.part === 'DRAWER-FRONT' && p.role === 'front').length, 0, 'no overlay front behind doors');
    for (const f of inner) {
      const i = f.meta.drawer;
      const side = r.panels.find((p) => p.id === `D${i}-SL`);
      const sideR = r.panels.find((p) => p.id === `D${i}-SR`);
      assert.equal(f.id, `U1-IF${i}`);
      assert.equal(f.part, 'DRAWER-FRONT');
      assert.equal(f.meta.inner, true);
      assert.equal(f.thickness, P.front.thickness);
      assert.equal(f.material_role, 'front', 'front material');
      assert.equal(f.finish_exposed, true);
      assert.ok(near(f.h, side.h), 'the box side height');
      assert.ok(near(f.w, (sideR.box.x + sideR.box.w) - side.box.x), 'the box width, overhang 0');
      assert.ok(near(f.box.x, side.box.x), 'standing on the box');
      assert.ok(near(f.box.y, side.box.y));
      assert.ok(near(f.box.z, side.box.z + side.box.d), 'on the box front face');
      assert.equal(f.box.d, P.front.thickness);
      assert.ok(f.cnc.outline.length === 4, 'a plain rectangle');
    }
    // The door setback: the inner front's face stands the profile's setback behind the carcass front.
    const door = r.panels.find((p) => p.part === 'FRONT');
    assert.ok(door);
    const face = Math.max(...inner.map((f) => f.box.z + f.box.d));
    assert.ok(door.box.z - face >= P.wardrobe.drawers.setback - 1e-6, `the door clears the inner front by at least ${P.wardrobe.drawers.setback}`);
    // The motion: the inner front is the drawer's face: it rides and it is the gesture.
    const m = drawerMotion(r.panels, { [inner[0].id]: 1 });
    assert.equal(m.forPanel(sides[0]).open, 1, 'the box rides its inner front');
  }
});

test('F15 · the wardrobe\'s internal drawers (mount internal) and a drawer-unit row behind doors get inner fronts; the overlay ones do not', () => {
  const w = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: 'W1', doors: { count: 2 },
    sections: [{ items: [{ id: 'd1', kind: 'drawer', index: 1, mount: 'internal' }, { id: 'd2', kind: 'drawer', index: 2, mount: 'overlay' }] }],
  }, P);
  const inner = w.panels.filter((p) => p.role === 'drawer_front');
  const overlay = w.panels.filter((p) => p.part === 'DRAWER-FRONT' && p.role === 'front');
  assert.deepEqual(inner.map((p) => p.meta.drawer), [1]);
  assert.deepEqual(overlay.map((p) => p.meta.drawer), [2]);
  assert.ok(inner[0].w < overlay[0].w, 'the inner front is the box\'s width, the overlay the opening\'s');
  // A drawer unit with its fronts off: every row behind a door-less face gets an inner front with the box's fixing screws.
  const b = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: 'D1', drawer_fronts: false }, P);
  const bi = b.panels.filter((p) => p.role === 'drawer_front');
  assert.equal(bi.length, 3);
  for (const f of bi) {
    const screws = b.drills.filter((d) => d.panel === f.id && d.kind === 'front_screw');
    assert.equal(screws.length, 2, 'the box\'s own front fixing, two screws');
    assert.ok(screws.every((d) => d.x > 0 && d.x < f.w && d.y > 0 && d.y < f.h));
  }
});

test('F15 · the whole road: the cut list and the BOM carry the inner fronts as front-material boards; the goldens re-pinned are named', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const u = S().addUnit('BUD_INT').id;
  S().addDrawers(u, 2);
  const r = S().unitResult(u);
  const inner = r.panels.filter((p) => p.role === 'drawer_front');
  assert.equal(inner.length, 2);
  assert.ok(r.csvLines.some((l) => /-IF1,/.test(l)), 'the cut list carries IF1');
  const materials = r.panels.filter((p) => p.role === 'drawer_front').map((p) => p.material_role);
  assert.deepEqual(materials, ['front', 'front'], 'the BOM books them to the front sheet');
  const frag = read('scripts/t78-classify.d/f15.mjs');
  assert.ok(frag.includes('verify/t70/goldens-base.json (PANTRY)') && frag.includes('fixtures/golden-bud-int.json'), 'the two re-pins are named');
  const g = JSON.parse(read('fixtures/golden-bud-int.json'));
  assert.ok(JSON.stringify(g.expected).includes('-IF1'), 'the BUD_INT golden carries the inner front');
});
