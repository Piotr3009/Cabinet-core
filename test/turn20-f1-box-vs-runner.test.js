// ─── TURN 20 F1: THE DRAWER BOX TAKES ITS HEIGHT FROM THE RUNNER ────────────
//
// Owner, eye test of turn 18: "the holes are right, the runners are right, the
// fronts are right — only the BOX sits wrong against them."
//
// ONE formula, for EVERY drawer in the app including the bottom one, measured
// off the row the engine actually drills (`runner_rows_carcass_y` — the line
// the runner's own underside stands on):
//
//   bottom face of the drawer BOTTOM panel = runner bottom + 28.5 mm
//   lower edge of the drawer SIDE          = runner bottom + 13.5 mm
//
// and 28.5 − 13.5 is the groove: the bottom stands `runnerPocketWidth` above
// the side's lower edge. Before this turn the two kits disagreed — a BUDR box
// sat exactly ON the row, a wardrobe's hung 9 mm BELOW it — which is two laws
// for one piece of Blum hardware.
//
// Per kit family, per drawer index, bottom drawer included. Nothing here reads
// a fixture: these are the ENGINE's own two numbers held against the ENGINE's
// own runner row, which is what makes the law checkable on a stack of heights
// no LISP ever drew.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const B = P.baseDrawerUnit;
const G = P.board.thickness;

const boxesOf = (r, part) => r.panels
  .filter((p) => p.part === part && p.box)
  .sort((a, b) => (a.meta?.drawer ?? 0) - (b.meta?.drawer ?? 0));

/**
 * The law, asserted on one computed cabinet.
 *
 * Every drawer of the unit, in the engine's own order, against the engine's own
 * runner rows — so a kit that grows a fourth drawer is covered the day it does.
 */
function lawHolds(r, label) {
  const rows = r.drillSummary?.runner_rows_carcass_y || [];
  assert.ok(rows.length > 0, `${label}: the unit has runner rows to measure from`);

  const sides = boxesOf(r, 'DRAWER-SIDE');
  const bottoms = boxesOf(r, 'DRAWER-BOTTOM');
  // Two sides per drawer, one bottom.
  assert.equal(sides.length, rows.length * 2, `${label}: a pair of sides per runner row`);
  assert.equal(bottoms.length, rows.length, `${label}: a bottom per runner row`);

  rows.forEach((row, i) => {
    const drawer = i + 1;
    for (const side of sides.filter((p) => p.meta.drawer === drawer)) {
      assert.equal(
        side.box.y, row + B.boxAboveRunner,
        `${label} drawer ${drawer} ${side.id}: the side's lower edge is 13.5 above the runner`,
      );
    }
    const bottom = bottoms.find((p) => p.meta.drawer === drawer);
    assert.equal(
      bottom.box.y, row + B.bottomAboveRunner,
      `${label} drawer ${drawer}: the bottom's underside is 28.5 above the runner`,
    );
    // …and the two agree with each other through the groove, which is the
    // check that says these are ONE law and not two numbers that happen to be
    // right today.
    assert.equal(bottom.box.y, sides.find((p) => p.meta.drawer === drawer).box.y + B.runnerPocketWidth);
  });
}

test('F1 — the two numbers are the profile’s, and the second is derived from the first', () => {
  assert.equal(B.boxAboveRunner, 13.5);
  assert.equal(B.bottomAboveRunner, 28.5);
  assert.equal(
    B.bottomAboveRunner, B.boxAboveRunner + B.runnerPocketWidth,
    '28.5 = 13.5 + the groove — one law, not two independent numbers',
  );
  // The wardrobe's own contradicting number is gone rather than left saying
  // something untrue.
  assert.equal(P.wardrobe.drawers.boxDropFromRunner, undefined);
});

for (const [type, count] of [['BUDR2', 2], ['BUDR', 3], ['BUDR4', 4]]) {
  test(`F1 — ${type}: every box rides its runner, the bottom one too`, () => {
    const r = computeCabinet({
      type, width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: 'DR1',
    }, P);
    const rows = r.drillSummary.runner_rows_carcass_y;
    assert.equal(rows.length, count, `${type} has ${count} drawers`);
    // The BOTTOM drawer's runner sits on the carcass floor — G + the kit's own
    // first row — and the box rides it like any other, which is F1.3.
    assert.equal(rows[0], G + P.baseDrawerUnit.firstRowFromBottom);
    lawHolds(r, type);
  });
}

test('F1 — a wardrobe with drawers keeps the same law, on its own runner rows', () => {
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
    drawers: 3,
    drawer_heights: [300, 200, 150],
  }, P);
  assert.equal(r.drillSummary.runner_rows_carcass_y.length, 3);
  lawHolds(r, 'WARDROBE');
});

test('F1 — a wardrobe with a drawer PANEL (asymmetric box) obeys it as well', () => {
  const r = computeCabinet({
    type: 'WARDROBE',
    width: 1200,
    height: 2150,
    depth: 578,
    board_t: 18,
    front_t: 25,
    front_type: 'S',
    hinge: 'L',
    unit_num: 'W02',
    drawers: 2,
    drawer_heights: [250, 150],
    drawer_panel: 'L',
  }, P);
  lawHolds(r, 'WARDROBE + DP');
});

test('F1 — the drawer heights a joiner types do not bend the law', () => {
  for (const heights of [[150, 150], [400], [120, 120, 120, 120]]) {
    const r = computeCabinet({
      type: 'WARDROBE',
      width: 600,
      height: 2150,
      depth: 578,
      board_t: 18,
      front_t: 25,
      front_type: 'S',
      hinge: 'L',
      unit_num: 'W03',
      drawers: heights.length,
      drawer_heights: heights,
    }, P);
    lawHolds(r, `WARDROBE ${heights.join('/')}`);
  }
});

test('F1 — an appliance base obeys the law and SAYS what the old clamp costs', () => {
  // Turn 18's clamp measures the headroom from the runner ROW, and the box now
  // starts 13.5 mm above it. The board is deliberately NOT re-cut — F1.2 keeps
  // the side heights turn 18 cut, and the turn allows exactly one CNC delta —
  // so the app warns instead of silently moving an exported DXF.
  const r = computeCabinet({
    type: 'OVEN_BASE', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: 'OV1',
  }, P);
  lawHolds(r, 'OVEN_BASE');
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const shelf = r.panels.find((p) => p.id === 'FIXED');
  const over = side.box.y + side.box.h - shelf.box.y;
  assert.ok(over > 0, 'the clamped box does stand past the shelf');
  const warned = r.warnings.find((w) => w.code === 'APPLIANCE_DRAWER_BOX_OVER_SHELF');
  assert.ok(warned, 'and the app says so rather than re-cutting the board');
  assert.match(warned.message, new RegExp(`${over} mm past the shelf`));
});

test('F1 — a unit with no appliance shelf is not warned about one', () => {
  const r = computeCabinet({
    type: 'BUDR', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: 'DR1',
  }, P);
  assert.equal(r.warnings.find((w) => w.code === 'APPLIANCE_DRAWER_BOX_OVER_SHELF'), undefined);
});

test('F1 — nothing the machine cuts moves: the pockets are still off the part’s own edges', () => {
  const r = computeCabinet({
    type: 'BUDR', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: 'DR1',
  }, P);
  for (const side of boxesOf(r, 'DRAWER-SIDE')) {
    const runner = side.cnc.pockets.find((p) => p.layer === 'DRAWER_RUNNER_POCKET');
    const bottom = side.cnc.pockets.find((p) => p.layer === 'DRAWER_BOTTOM_POCKET');
    // The BUDR side is drawn rotated, so the two bands run along x.
    assert.deepEqual([runner.x1, runner.x2], [0, B.runnerPocketWidth]);
    assert.deepEqual(
      [bottom.x1, bottom.x2],
      [B.runnerPocketWidth, B.runnerPocketWidth + G + B.bottomPocketExtra],
    );
  }
});
