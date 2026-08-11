// ─── TURN 20 F3: THE WHOLE DRAWER SLIDES, NOT JUST ITS FACE ─────────────────
//
// Owner: today the front glides out and the box stays in the carcass.
//
// The arithmetic is `engine/drawerMotion.js` — WHICH parts travel together and
// HOW FAR — so the property can be held without a browser. The view is one
// `slide` prop and one `travel` on the panel component it already had.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  drawerMotion, drawerOf, drawerOpenAmounts, drawerTravel,
} from '../src/engine/drawerMotion.js';
import { runnerNominalLength } from '../src/engine/runners.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';

const budr = () => computeCabinet({
  type: 'BUDR', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: '01',
}, P);

const frontOf = (r, drawer) => r.panels
  .find((p) => p.part === 'DRAWER-FRONT' && p.meta?.drawer === drawer);

test('F3.1 — every part of ONE drawer travels, and nothing else does', () => {
  const r = budr();
  const open = { [frontOf(r, 2).id]: 1 };
  const motion = drawerMotion(r.panels, open);

  const moved = r.panels.filter((p) => p.box && (motion.forPanel(p)?.open ?? 0) > 0);
  const ids = moved.map((p) => p.id).sort();
  // The face, the two sides, the box front and back, the bottom. Six boards.
  assert.deepEqual(ids, ['01-F2', 'D2-BB', 'D2-BF', 'D2-DNO', 'D2-SL', 'D2-SR'].sort());
  for (const p of moved) {
    assert.equal(motion.forPanel(p).open, 1, `${p.id}: the SAME value drives all of them`);
  }
  // Drawer 1 and drawer 3 stay shut, and so does the carcass.
  for (const p of r.panels.filter((q) => q.box && !ids.includes(q.id))) {
    assert.equal(motion.forPanel(p)?.open ?? 0, 0, `${p.id} moved and should not have`);
  }
});

test('F3.1 — the travel is the drawer’s own NL, not a fraction of the cabinet', () => {
  const r = budr();
  const travel = drawerTravel(r.panels);
  const nl = runnerNominalLength(
    r.derived.szufMaxDl ?? r.panels.find((p) => p.part === 'DRAWER-SIDE').box.d,
    P,
  );
  for (const [, mmTravel] of travel) {
    assert.equal(mmTravel, r.panels.find((p) => p.part === 'DRAWER-SIDE').box.d);
    assert.equal(mmTravel, nl, 'the box is cut to the runner’s nominal length');
  }
  // And it is NOT turn 3's guess.
  assert.notEqual([...travel.values()][0], r.params.depth * 0.75);
});

test('F3.1 — a wardrobe’s inner drawers travel their own NL too', () => {
  const r = computeCabinet({
    type: 'WARDROBE',
    width: 600,
    height: 2150,
    depth: 578,
    board_t: 18,
    front_t: 25,
    front_type: 'S',
    hinge: 'L',
    unit_num: 'W01',
    drawers: 2,
    drawer_heights: [250, 150],
  }, P);
  const travel = drawerTravel(r.panels);
  assert.equal(travel.size, 2);
  for (const [drawer, mmTravel] of travel) {
    const side = r.panels.find((p) => p.part === 'DRAWER-SIDE' && p.meta.drawer === drawer);
    assert.equal(mmTravel, side.box.d);
    assert.ok(mmTravel > 0);
  }
});

test('F3.2 — the runner rows under an open drawer are the ones that ride out', () => {
  const r = budr();
  const motion = drawerMotion(r.panels, { [frontOf(r, 1).id]: 1 });
  const { runners } = hardwareInstances(r, P);
  const riding = runners.filter((row) => (motion.open.get(row.drawer) || 0) > 0);
  assert.equal(riding.length, 2, 'a pair, and only drawer 1’s pair');
  for (const row of riding) assert.equal(row.drawer, 1);
  // The distance the pair travels is the box's own, so the runner and the box
  // it carries cannot separate.
  assert.equal(motion.travel.get(1), r.panels.find((p) => p.id === 'D1-SL').box.d);
});

test('F3.3 — closed is closed: nothing moves with no front open', () => {
  const r = budr();
  for (const openFronts of [null, {}, { '01-F1': 0 }]) {
    const motion = drawerMotion(r.panels, openFronts);
    for (const p of r.panels.filter((q) => q.box)) {
      assert.equal(motion.forPanel(p)?.open ?? 0, 0, `${p.id} moved with everything shut`);
    }
  }
});

test('F3 — a piece that is not part of a drawer is never asked to slide', () => {
  const r = budr();
  for (const p of r.panels) {
    const n = drawerOf(p);
    if (p.role === 'drawer_box' || p.part === 'DRAWER-FRONT') assert.ok(n > 0, p.id);
    else assert.equal(n, null, `${p.id} is not a drawer part`);
  }
});

test('F3 — the open amounts come off the FRONTS, so a stripped carcass sits shut', () => {
  const r = budr();
  // Fronts off (turn 17 F8): the boxes are there and there is no face to open.
  const noFronts = computeCabinet({
    type: 'BUDR', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: '01', drawer_fronts: false,
  }, P);
  assert.equal(noFronts.panels.filter((p) => p.part === 'DRAWER-FRONT').length, 0);
  assert.equal(drawerOpenAmounts(noFronts.panels, { anything: 1 }).size, 0);
  // …and with the fronts on, one open face opens one drawer.
  assert.deepEqual([...drawerOpenAmounts(r.panels, { [frontOf(r, 3).id]: 0.4 })], [[3, 0.4]]);
});

test('F3 — nothing here is geometry: the engine output is untouched by opening', () => {
  const r = budr();
  const before = JSON.stringify(r.panels);
  drawerMotion(r.panels, { [frontOf(r, 1).id]: 1 });
  assert.equal(JSON.stringify(r.panels), before, 'the animation is an OFFSET, never a position');
});
