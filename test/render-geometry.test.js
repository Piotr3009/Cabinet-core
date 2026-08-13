// ─── What the 3D view is allowed to draw ───
//
// UnitView renders `result.panels[].box` and `result.assemblies` VERBATIM — it
// re-derives no dimension (turn-1 phase 2). So "does 3D match the engine?" is
// answerable here, in node, instead of by squinting at a screenshot: if these
// invariants hold, the render is the engine.
//
// The bug this file was written for: on a wide two-door wardrobe the engine
// deducts a drawer panel on BOTH sides (reduction 96 at width 1200), but the
// drawer BOTTOM was placed flush against the left of its box, so the scene
// showed a lopsided stack while the cut list was correct.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { UNIT_TYPE_ORDER, UNIT_TYPES, defaultParamsFor } from '../src/engine/types.js';

const wardrobe = (extra) => computeCabinet({
  type: 'WARDROBE', width: 600, height: 2150, depth: 578, board_t: 18, front_t: 25, unit_num: 'W01', ...extra,
}, P);

/** Mirror of a span about the carcass centre line. */
const gaps = (box, W) => ({ left: box.x, right: W - (box.x + box.w) });

test('every panel the view draws carries a box, and it is inside the carcass', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const params = defaultParamsFor(id, P);
    const r = computeCabinet({ ...params, shelves: 1, drawers: UNIT_TYPES[id].supports.drawers ? 2 : 0, rail: UNIT_TYPES[id].supports.rail }, P);
    const { width: W, height: H, depth: D } = r.params;
    for (const p of r.panels) {
      assert.ok(p.box, `${id} ${p.id} has no box — the view would skip it`);
      const { x, y, z, w, h, d } = p.box;
      for (const [k, v] of Object.entries({ x, y, z, w, h, d })) {
        assert.ok(Number.isFinite(v), `${id} ${p.id}.box.${k} is ${v}`);
      }
      assert.ok(w > 0 && h > 0 && d > 0, `${id} ${p.id} has a non-positive box`);
      assert.ok(x >= -1e-6 && x + w <= W + 1e-6, `${id} ${p.id} sticks out sideways: ${x}..${x + w} of ${W}`);
      // Fronts legitimately stand proud of the carcass depth and, on a wall
      // unit with the door extend, hang below it.
      const isFront = p.material_role === 'front';
      // ─── TURN 28 (CLAUDE.md F1.3) ─────────────────────────────────────────
      // A PLINTH stands UNDER the carcass by its own height — that is what a
      // toe kick IS, and every plinth in the app has always been at
      // `y: −plinthH`. It was simply never reachable from a bare
      // `defaultParamsFor` before, because a plinth is a decision. The D/W is
      // the kit whose toe kick is one of its three pieces, so it arrives with
      // one, and the invariant has to say what it always meant.
      const floor = p.role === 'plinth' ? -h : (isFront ? -P.wallUnit.doorExtend : 0);
      assert.ok(z >= -1e-6 && z + d <= D + P.doors.gap + P.front.thickness + 1e-6,
        `${id} ${p.id} sticks out front/back: ${z}..${z + d} of ${D}`);
      assert.ok(y >= floor - 1e-6 && y + h <= H + 1e-6,
        `${id} ${p.id} sticks out vertically: ${y}..${y + h} of ${H}`);
    }
  }
});

test('a two-door wardrobe is symmetric in the scene, not just in the cut list', () => {
  const r = wardrobe({ width: 1200, drawers: 2 });
  const W = 1200;
  assert.equal(r.derived.numDrPanels, 2);
  assert.equal(r.derived.drawerReduction, 96, 'a drawer panel is deducted on both sides');

  const dpL = r.panels.find((p) => p.id === 'DP-L').box;
  const dpR = r.panels.find((p) => p.id === 'DP-R').box;
  assert.equal(gaps(dpL, W).left, gaps(dpR, W).right, 'the two drawer panels sit at the same inset');

  // Every drawer part is centred between the two drawer panels.
  for (const part of ['DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK', 'DRAWER-BOTTOM', 'DRAWER-FRONT']) {
    for (const p of r.panels.filter((x) => x.part === part)) {
      const g = gaps(p.box, W);
      assert.ok(Math.abs(g.left - g.right) <= 1e-6, `${p.id} is off-centre: ${g.left} vs ${g.right}`);
    }
  }
  // …and the two box sides mirror each other.
  const sides = r.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.meta.drawer === 1).map((p) => p.box);
  assert.equal(gaps(sides[0], W).left, gaps(sides[1], W).right, 'drawer box sides are not mirrored');

  // The one-door case keeps its single drawer panel, so it is NOT symmetric —
  // which is the point: the render follows the engine, not a prettier idea.
  const single = wardrobe({ width: 600, drawers: 2, hinge: 'L' });
  assert.equal(single.derived.numDrPanels, 1);
  const box = single.panels.find((p) => p.part === 'DRAWER-BOX-FRONT').box;
  assert.notEqual(gaps(box, 600).left, gaps(box, 600).right);
});

test('the drawer bottom sits centred in its box, both in a wardrobe and a BUDR', () => {
  const r = wardrobe({ width: 1200, drawers: 2 });
  const side = r.panels.find((p) => p.id === 'D1-SL').box;
  const otherSide = r.panels.find((p) => p.id === 'D1-SR').box;
  const bottom = r.panels.find((p) => p.id === 'D1-DNO').box;
  const boxLeft = side.x;
  const boxRight = otherSide.x + otherSide.w;
  assert.ok(Math.abs((bottom.x - boxLeft) - (boxRight - (bottom.x + bottom.w))) <= 1e-6,
    `bottom off-centre: ${bottom.x - boxLeft} vs ${boxRight - (bottom.x + bottom.w)}`);

  const budr = computeCabinet({ type: 'BUDR', width: 900, height: 770, depth: 558, unit_num: 'DR2' }, P);
  const bSide = budr.panels.find((p) => p.id === 'D1-SL').box;
  const bOther = budr.panels.find((p) => p.id === 'D1-SR').box;
  const bBottom = budr.panels.find((p) => p.id === 'D1-DNO').box;
  assert.ok(Math.abs((bBottom.x - bSide.x) - ((bOther.x + bOther.w) - (bBottom.x + bBottom.w))) <= 1e-6);
});

test('the scene gets the legs the hardware list orders', () => {
  const narrow = computeCabinet({ type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01' }, P);
  assert.equal(narrow.assemblies.legs.positions.length, narrow.totals.legs);
  assert.equal(narrow.assemblies.legs.positions.length, 4);
  assert.equal(narrow.assemblies.legs.height, P.baseUnit.legHeight);

  const wide = computeCabinet({ type: 'BUD', width: 1400, height: 770, depth: 558, unit_num: '02' }, P);
  assert.equal(wide.assemblies.legs.positions.length, wide.totals.legs);
  assert.equal(wide.assemblies.legs.positions.length, 5);
  // Corners stay in the corners; the extra one is in the middle of both spans.
  const corners = wide.assemblies.legs.positions.filter((p) => p.role === 'corner');
  assert.equal(corners.length, 4);
  assert.equal(new Set(corners.map((c) => c.x)).size, 2, 'corner legs share two x positions');
  assert.equal(new Set(corners.map((c) => c.z)).size, 2, 'and two z positions');

  // Every leg stands under the carcass, not beside it.
  for (const leg of wide.assemblies.legs.positions) {
    assert.ok(leg.x >= 0 && leg.x + wide.assemblies.legs.width <= 1400, `leg x ${leg.x} outside the unit`);
    assert.ok(leg.z >= 0 && leg.z + wide.assemblies.legs.width <= 558, `leg z ${leg.z} outside the unit`);
  }
});

test('a wall unit hangs: no legs, a mount height the view can use', () => {
  const r = computeCabinet({ type: 'WUD', width: 600, height: 720, depth: 400, unit_num: 'WU1' }, P);
  assert.equal(r.assemblies.legs, null);
  assert.equal(r.assemblies.mount, 'wall');
  assert.equal(r.assemblies.mountHeight, P.wallUnit.defaults.mountHeight);

  const custom = computeCabinet({ type: 'WUD', width: 600, height: 720, depth: 400, mount_height: 1650, unit_num: 'WU1' }, P);
  assert.equal(custom.assemblies.mountHeight, 1650);

  const floor = computeCabinet({ type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01' }, P);
  assert.equal(floor.assemblies.mount, 'floor');
  assert.equal(floor.assemblies.mountHeight, 0);
});

test('drawer fronts are handed to the view with position and size, per drawer', () => {
  const w = wardrobe({ drawers: 3, drawer_heights: [250, 180, 150] });
  assert.equal(w.assemblies.drawerFronts.length, 3);
  const panelsByDrawer = new Map(w.panels.filter((p) => p.part === 'DRAWER-FRONT').map((p) => [p.meta.drawer, p]));
  for (const f of w.assemblies.drawerFronts) {
    const p = panelsByDrawer.get(f.index);
    assert.equal(f.h, p.h, `drawer ${f.index} height`);
    assert.equal(f.w, p.w, `drawer ${f.index} width`);
    assert.equal(f.y, p.box.y, `drawer ${f.index} position`);
  }
  // Fronts never overlap: each one starts above the previous one's top.
  const sorted = [...w.assemblies.drawerFronts].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.ok(sorted[i].y >= sorted[i - 1].y + sorted[i - 1].h, `drawer front ${i + 1} overlaps the one below`);
  }

  const budr = computeCabinet({ type: 'BUDR', width: 600, height: 770, depth: 558, unit_num: 'DR1' }, P);
  assert.equal(budr.assemblies.drawerFronts.length, 3);
  const top = budr.assemblies.drawerFronts[2];
  assert.equal(top.y + top.h, 770 - P.baseDrawerUnit.gap, 'the BUDR stack reaches the top of the carcass');
});

// ─── BACKLOG #3: the wide wardrobe with internal drawers ───
//
// Reported as "the drawer boxes look wrong on a wide wardrobe". The numbers are
// pinned here so the question is never asked of a screenshot again: on a 1200
// two-door wardrobe the engine deducts a drawer panel on BOTH sides, which
// insets the box by exactly 71 mm per side, and the two DP panels stand
// against the carcass sides.
//
// A render that disagrees with these numbers is a render bug — the panel boxes
// UnitView draws are these very boxes.

test('a 1200 wardrobe with 2 internal drawers: boxes inset 71 per side, DP at the sides', () => {
  const r = wardrobe({ width: 1200, drawers: 2 });
  const G = P.board.thickness;
  const DP = P.wardrobe.drawerPanel;
  const DR = P.wardrobe.drawers;

  assert.equal(r.derived.doors, 2, 'two doors, so a drawer panel on each side');
  assert.equal(r.derived.numDrPanels, 2);
  assert.equal(r.derived.drawerReduction, 2 * (DP.inset + G), '96 mm off the box width');
  assert.equal(r.derived.internal_width, 1200 - 2 * G);
  assert.equal(r.derived.szufSzer, 1164 - DR.boxWidthClearance - 96, 'box width 1058');

  // The inset the report is about: 18 (side) + 30 (DP inset) + 18 (DP) + 5
  // (half the box clearance) = 71 mm, and the same on the right.
  const expectedInset = G + DP.inset + G + DR.boxWidthClearance / 2;
  assert.equal(expectedInset, 71);
  // The two box sides are the outer faces of the box: one is `inset` off the
  // left, the other the same off the right.
  for (const i of [1, 2]) {
    const sl = r.panels.find((p) => p.id === `D${i}-SL`);
    const sr = r.panels.find((p) => p.id === `D${i}-SR`);
    assert.equal(gaps(sl.box, 1200).left, expectedInset, `D${i} box left inset`);
    assert.equal(gaps(sr.box, 1200).right, expectedInset, `D${i} box right inset`);
  }
  // Everything that spans the box is centred in the carcass, on both sides.
  for (const part of ['DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK', 'DRAWER-BOTTOM']) {
    for (const p of r.panels.filter((x) => x.part === part)) {
      const g = gaps(p.box, 1200);
      assert.ok(g.left >= expectedInset - 1e-6, `${p.id} left gap ${g.left} < ${expectedInset}`);
      assert.ok(Math.abs(g.left - g.right) < 1e-6, `${p.id} is lopsided: ${g.left} vs ${g.right}`);
    }
  }

  // The drawer panels themselves sit one inset off each carcass side, i.e.
  // between the side and the box — not out in the middle of the unit.
  const left = r.panels.find((p) => p.id === 'DP-L');
  const right = r.panels.find((p) => p.id === 'DP-R');
  assert.equal(left.box.x, G + DP.inset, 'DP-L is 30 mm off the left side');
  assert.equal(right.box.x + right.box.w, 1200 - G - DP.inset, 'DP-R is 30 mm off the right side');
  assert.equal(left.box.w, G);
  assert.equal(right.box.w, G);

  // The fronts stay centred on the carcass, not on the box.
  for (const f of r.panels.filter((p) => p.part === 'DRAWER-FRONT')) {
    const g = gaps(f.box, 1200);
    assert.ok(Math.abs(g.left - g.right) < 1e-6, `${f.id} front is off-centre: ${g.left} vs ${g.right}`);
    assert.equal(f.w, r.derived.szufSzer + DR.frontOversize);
  }
});
