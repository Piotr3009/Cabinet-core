// ─── TURN 41, F3: THE DRAWER SWITCH ─────────────────────────────────────────
//
// An INVESTIGATION first, and the brief adds one instruction to it: *"in F3 do
// not tidy the menu before the switch works."*
//
// WHAT THE TRACE FOUND. T40 shipped "Drawers (internal)" and "Drawers
// (overlay)" side by side in the wardrobe's offer and the ENGINE half of both
// works — measured, the overlay stack sits on the floor, cuts its fixed shelf,
// shortens the doors, re-ladders their hinges and never reserves the hinge
// strip. What was missing is everything around it:
//
//   1. THERE IS NO SWITCH. Two ADD buttons that both add. Choose internal, then
//      overlay, and you get BOTH — six fronts in one 624 mm band, two physical
//      stacks interpenetrating, `warnings` empty.
//   2. THE HEIGHT SLIDER IS DEAD ON AN OVERLAY DRAWER, and lies about it: the
//      field displays the number you typed while the board stays 200 mm.
//   3. T40-F3a BROKE PER-BAY DOORS: a wardrobe with bay leaves reads as a
//      wardrobe with no doors, loses both standoffs and widens its drawer
//      fronts by 96 mm into sides that still carry a hinge plate.
//
// Every assertion below is a MILLIMETRE OF BOARD or a COUNT OF PANELS. The
// brief names the observable fact for this feature by hand — "the front width
// in mm" — and that is what is asserted.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { drawerHeightValue, drawerRefOf, internalDrawerRef } from '../src/engine/drawerRef.js';

const store = () => useProjectStore.getState();
const fresh = () => store().loadProject({
  id: null, name: 't41-f3', design: {},
  room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
}, []);

const resultOf = (id) => computeCabinet(paramsForEngine(store().units.find((x) => x.id === id)), P);
const frontsOf = (r) => (r.panels || []).filter((p) => p.part === 'DRAWER-FRONT')
  .sort((a, b) => a.box.y - b.box.y);
const wardrobe = (over = {}) => {
  fresh();
  return store().addUnit('WARDROBE', { params: { width: 900, height: 2150, ...over } });
};

// ═══ 1. THE SWITCH ══════════════════════════════════════════════════════════

test('F3 — choosing one drawer kind CLEARS the other: one stack, never two', () => {
  const u = wardrobe();
  store().addDrawers(u.id, 3, 'overlay', 200);
  assert.equal(frontsOf(resultOf(u.id)).length, 3, 'internal: three fronts');

  store().addOverlayDrawers(u.id, 3, 200);
  const afterOverlay = frontsOf(resultOf(u.id));
  assert.equal(afterOverlay.length, 3, 'choosing overlay does not ADD to the internal stack');
  assert.ok(afterOverlay.every((p) => p.meta?.overlay === true), 'and what is left is the overlay stack');

  store().addDrawers(u.id, 3, 'overlay', 200);
  const afterInternal = frontsOf(resultOf(u.id));
  assert.equal(afterInternal.length, 3, 'and back again');
  assert.ok(!afterInternal.some((p) => p.meta?.overlay), 'the overlay stack is gone');
});

test('F3 — but removing a stack (count 0) clears only itself', () => {
  // The count is what says "this is a choice". Taking the overlay drawers off
  // must not silently delete an internal stack somebody wanted kept.
  const u = wardrobe();
  store().addDrawers(u.id, 3, 'overlay', 200);
  store().addOverlayDrawers(u.id, 0, 200);
  assert.equal(frontsOf(resultOf(u.id)).length, 3, 'the internal stack survives');
  assert.ok(!frontsOf(resultOf(u.id)).some((p) => p.meta?.overlay));
});

// ═══ 2. THE FRONT WIDTH IN MM ═══════════════════════════════════════════════

test('F3a — no door, no strip: the front width in mm', () => {
  const width = (kind, doors) => {
    const u = wardrobe();
    if (doors) store().addDoors(u.id);
    if (kind === 'internal') store().addDrawers(u.id, 3, 'overlay', 200);
    else store().addOverlayDrawers(u.id, 3, 200);
    const r = resultOf(u.id);
    return { mm: Math.round(frontsOf(r)[0].w), dp: (r.panels || []).filter((p) => p.part === 'DP').length };
  };
  const onDoors = width('internal', true);
  const offDoors = width('internal', false);
  assert.ok(offDoors.mm > onDoors.mm,
    `doors off must widen the front: ${onDoors.mm} -> ${offDoors.mm}`);
  assert.equal(onDoors.dp, 2, 'two doors, two standoffs');
  assert.equal(offDoors.dp, 0, 'no door, no standoff');

  // …and an OVERLAY stack never has the strip, under any door state (F3b).
  const oOn = width('overlay', true);
  const oOff = width('overlay', false);
  assert.equal(oOn.mm, oOff.mm, 'the overlay front is the same width doors on or off');
  assert.equal(oOn.dp, 0);
  assert.equal(oOff.dp, 0);
});

test('F3a — …and a BAY door is a door too (the T40 regression)', () => {
  // T40 derived the strip from `doorCount`, and a cabinet with per-bay doors
  // sets `doors: false` by construction. Measured on T40: DP 2 -> 0, FILLER
  // 4 -> 0, front 1262 -> 1358 mm, into two sides still carrying hinge plates.
  fresh();
  const u = store().addUnit('WARDROBE', { params: { width: 1400, height: 2150 } });
  store().updateUnitParams(u.id, { sections: [{ items: [{ id: 'p1', kind: 'partition', x_mm: 691, front_mm: 0 }] }] });
  store().addDrawers(u.id, 2, 'overlay', 200);
  store().addDoors(u.id);
  const face = resultOf(u.id);
  const faceW = Math.round(frontsOf(face)[0].w);
  const dp = (r) => (r.panels || []).filter((p) => p.part === 'DP').length;
  assert.equal(dp(face), 2, 'face doors: two standoffs');

  store().setBayDoors(u.id, [{ door: 'one', hinge: 'L' }, { door: 'one', hinge: 'R' }]);
  const both = resultOf(u.id);
  assert.equal(dp(both), 2, 'a leaf on each carcass side reserves both bands');
  assert.equal(Math.round(frontsOf(both)[0].w), faceW, 'and the front is the same width as with face doors');

  store().setBayDoors(u.id, [{ door: 'one', hinge: 'L' }, { door: 'none' }]);
  const left = resultOf(u.id);
  assert.equal(dp(left), 1, 'one leaf on the left only reserves one band');
  assert.ok(Math.round(frontsOf(left)[0].w) > faceW, 'so the front is wider than with two');
  assert.ok(Math.round(frontsOf(left)[0].w) < 1358, 'but NOT as wide as the T40 regression made it');
});

// ═══ 3. THE HEIGHT SLIDER MOVES THE BOARD ═══════════════════════════════════

test('F3 — the per-drawer height moves the board, on BOTH kinds of drawer', () => {
  for (const kind of ['overlay', 'internal']) {
    const u = wardrobe();
    if (kind === 'overlay') store().addOverlayDrawers(u.id, 3, 200);
    else store().addDrawers(u.id, 3, 'overlay', 200);
    const before = frontsOf(resultOf(u.id)).map((p) => Math.round(p.h));
    const panel = frontsOf(resultOf(u.id)).find((p) => Number(p.meta?.drawer) === 2);
    assert.ok(panel, `${kind}: there is a drawer 2`);

    // Exactly what the properties panel does.
    const ref = drawerRefOf(store().units.find((x) => x.id === u.id), panel, 2);
    store().setDrawerHeight(u.id, ref, 300);

    const after = frontsOf(resultOf(u.id)).map((p) => Math.round(p.h));
    assert.equal(after[1], 300, `${kind}: the BOARD is 300 mm (${before.join(',')} -> ${after.join(',')})`);
    assert.equal(after[0], before[0], `${kind}: drawer 1 did not move`);
    assert.equal(after[2], before[2], `${kind}: drawer 3 did not move`);
    // …and the field shows the board, which is the half that lied.
    assert.equal(drawerHeightValue(store().units.find((x) => x.id === u.id), panel, 2), 300,
      `${kind}: the field agrees with the board`);
  }
});

test('F3 — the OLD lookup is kept, and it is the one that could not see an overlay drawer', () => {
  // Sanctity: `internalDrawerRef` is the pre-T41 lookup, whole and un-deleted.
  // Pinning its answer here is what records the fault rather than erasing it —
  // on an overlay stack it returns a NUMBER, and a number routes the height to
  // `params.drawer_heights`, which the overlay stack has never read.
  const u = wardrobe();
  store().addOverlayDrawers(u.id, 3, 200);
  const unit = store().units.find((x) => x.id === u.id);
  const panel = frontsOf(resultOf(u.id)).find((p) => Number(p.meta?.drawer) === 2);

  assert.equal(typeof internalDrawerRef(unit, 2), 'number', 'the old lookup falls through to an index');
  assert.equal(typeof drawerRefOf(unit, panel, 2), 'string', 'the new one names the item');
  assert.equal(drawerRefOf(unit, panel, 2), panel.meta.itemId, 'the stamp the engine writes for this');

  // …and on an INTERNAL drawer the two agree, so nothing else was re-answered.
  const v = wardrobe();
  store().addDrawers(v.id, 3, 'overlay', 200);
  const vUnit = store().units.find((x) => x.id === v.id);
  const vPanel = frontsOf(resultOf(v.id)).find((p) => Number(p.meta?.drawer) === 2);
  assert.equal(drawerRefOf(vUnit, vPanel, 2), internalDrawerRef(vUnit, 2),
    'an internal drawer is answered exactly as it was yesterday');
});
