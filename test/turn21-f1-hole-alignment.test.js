// ─── TURN 21 F1: THE PILOT HOLES ARE THE GATE ───────────────────────────────
//
// The owner put a drawer in the exploded editor and read the truth off two
// pilot holes that did not meet: the drillings in the drawer FRONT were not at
// the same height as the drillings in the BOX. That single observation unwound
// to one wrong anchor in the engine — the box hung off the runner's SCREW ROW,
// 38 mm above the runner it should ride.
//
// This file is the gate that turn 21 installs so no future turn can argue with
// it. It is not a test of a formula; it is a test of TWO HOLES:
//
//   façade pilot   front bottom + 96.5  (+ G on drawer 1, whose front runs one
//                                        board lower to cover the carcass floor)
//   box pilot      box front bottom + 50
//
// and the assertion is |Δ| = 0, per kit family, per drawer, bottom one
// included. The chain that makes them meet is four numbers deep and every one
// of them is the workshop's:
//
//   runner bottom  +  13.5  box side's lower edge      (boxAboveRunner)
//                  +  15    the bottom board's groove  (runnerPocketWidth)
//                  +  G     the bottom board itself
//                  +  50    the box front's own pilot  (boxScrewFromEdge)
//                  ─────────
//                  =  96.5  the façade's own pilot. Every drawer, every kit.
//
// The LISP is perfectly self-consistent about it and always was —
// KIT_BUDR_FULL L523-526 (96.5, +G on drawer 1) and L712-714 (runnerY = 38
// above the front's base), KIT_WARDROBE_FULL L313-322 (93.5 on drawer 1, 96.5
// on the rest, which is the same line because that front starts 3 mm higher).
// What was not self-consistent was the engine, and the holes said so.
//
// ─── WHAT IS READ, AND WHAT IS DERIVED ─────────────────────────────────────
//
// Where the engine DRILLS a pilot (the BUDR family's drawer fronts and box
// fronts) the gate reads the hole the machine will actually cut — coordinate,
// layer and all. Where it does not (the wardrobe's internal drawer front and
// box front carry the LISP's holes but the engine emits a plain rectangle
// today), the gate applies the LISP's law to the panel the engine DID place,
// which is the same question asked of the same geometry. Both cases are
// recorded in verify/t21/hole-alignment.md; the missing wardrobe drillings are
// a CNC delta and therefore not this turn's to add.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { drawerPilotRows } from '../src/engine/drawerPilots.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const B = P.baseDrawerUnit;
const DR = P.wardrobe.drawers;
const G = P.board.thickness;

const panelOf = (r, part, drawer) => r.panels.find(
  (p) => p.part === part && p.box && Number(p.meta?.drawer) === drawer,
);

/**
 * THE GATE. Every drawer of one unit, both pilot rows, |Δ| = 0.
 *
 * The arithmetic is the ENGINE's — `drawerPilotRows` — and not a copy of it
 * living beside the assertion, which is rule R4 asked in its own key: a check
 * that rebuilds the thing it checks proves nothing. The same function writes
 * verify/t21/hole-alignment.md, so the table and the assertion cannot drift.
 */
function holeAlignment(r, kit) {
  const rows = drawerPilotRows(r, P);
  assert.ok(rows.length > 0, `${kit}: the unit has drawers to check`);
  assert.equal(
    rows.length, r.drillSummary.runner_bottoms_carcass_y.length,
    `${kit}: a pilot pair for every drawer, none skipped`,
  );
  for (const row of rows) {
    assert.equal(
      row.delta, 0,
      `${kit} drawer ${row.drawer}: the façade's pilot (${row.facadeY}) and the box front's `
      + `(${row.boxY}) are ${row.delta} mm apart`,
    );
  }
  return rows;
}

const budr = (type, params = {}) => computeCabinet({
  type, width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: 'DR1', ...params,
}, P);

const wardrobe = (params = {}) => computeCabinet({
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
  ...params,
}, P);

/** The five kit families the gate covers, as CLAUDE.md F1.4 names them. */
const GATE_CASES = [
  { kit: 'BUDR', build: () => budr('BUDR') },
  { kit: 'BUDR2', build: () => budr('BUDR2') },
  { kit: 'BUDR4', build: () => budr('BUDR4') },
  { kit: 'WARDROBE', build: () => wardrobe() },
  { kit: 'OVEN_BASE', build: () => budr('OVEN_BASE') },
];

for (const { kit, build } of GATE_CASES) {
  test(`F1 GATE — ${kit}: the façade's pilots and the box's meet, every drawer`, () => {
    holeAlignment(build(), kit);
  });
}

test('F1 GATE — the chain that makes them meet is the workshop’s four numbers', () => {
  assert.equal(
    B.boxAboveRunner + B.runnerPocketWidth + G + B.boxScrewFromEdge,
    B.frontScrewFromBottom,
    '13.5 + 15 + 18 + 50 = 96.5 — the box front’s pilot IS the façade’s',
  );
  // The wardrobe's two numbers are one number: its bottom front starts
  // `firstFrontAdjust` higher, so its pilot is that much lower in the board.
  assert.equal(
    DR.firstFrontScrewFromBottom + DR.firstFrontAdjust,
    DR.frontScrewFromBottom,
    '93.5 + 3 = 96.5 — KIT_WARDROBE_FULL L313-322',
  );
  // And the screw row is NOT the anchor: it is the drilling offset above it.
  assert.equal(B.firstRowFromBottom, P.wardrobe.runners.firstRowFromBottom);
});

test('F1 GATE — the runner’s bottom and its screw row are two named things', () => {
  for (const { kit, build } of GATE_CASES) {
    const r = build();
    const bottoms = r.drillSummary.runner_bottoms_carcass_y;
    const rows = r.drillSummary.runner_rows_carcass_y;
    assert.equal(bottoms.length, rows.length, `${kit}: one screw row per runner`);
    bottoms.forEach((bottom, i) => {
      assert.equal(rows[i] - bottom, B.firstRowFromBottom,
        `${kit} drawer ${i + 1}: the screw row is the MOVENTO offset above the runner`);
      // …and the box hangs off the BOTTOM, never off the row.
      const side = panelOf(r, 'DRAWER-SIDE', i + 1);
      assert.equal(side.box.y, bottom + B.boxAboveRunner, `${kit} drawer ${i + 1}: the box rides the runner`);
    });
  }
});

test('F1 GATE — a drawer stack no LISP ever drew still passes it', () => {
  // The gate is arithmetic over the engine's own panels, not a table of the
  // kit's three heights, so a stack a joiner types by hand is covered too.
  for (const heights of [[150, 150], [400], [120, 120, 120, 120], [250, 150]]) {
    holeAlignment(
      wardrobe({ drawers: heights.length, drawer_heights: heights }),
      `WARDROBE ${heights.join('/')}`,
    );
  }
  for (const [type, hs] of [['BUDR', [200, 250, 300]], ['BUDR2', [400, 350]]]) {
    holeAlignment(budr(type, { drawer_heights: hs }), `${type} ${hs.join('/')}`);
  }
});

test('F1 GATE — a wardrobe with a drawer PANEL passes it too', () => {
  holeAlignment(
    wardrobe({
      width: 1200, unit_num: 'W02', drawers: 2, drawer_heights: [250, 150], drawer_panel: 'L',
    }),
    'WARDROBE + DP',
  );
});

test('F1 GATE — the façade pilots the BUDR kit really drills are the ones read', () => {
  // The gate must not be quietly falling through to the law on the kit whose
  // holes started this: the BUDR family's fronts and box fronts are DRILLED,
  // and it is those coordinates the assertion above compared.
  const rows = holeAlignment(budr('BUDR'), 'BUDR');
  for (const row of rows) {
    assert.equal(row.facadeSource, 'drilled', `drawer ${row.drawer}: the façade hole is a real drilling`);
    assert.equal(row.boxSource, 'drilled', `drawer ${row.drawer}: the box hole is a real drilling`);
  }
  // Drawer 1's façade runs G lower than its runner, and its pilot is G higher
  // in the board — which is the whole of the "+ G on drawer 1" rule.
  assert.equal(rows[0].facadeY, rows[0].runnerBottom + B.frontScrewFromBottom);
  assert.equal(rows[0].runnerBottom, G);
});

test('F1 GATE — and it FAILS on the anchor turn 20 shipped', () => {
  // The gate is only a gate if it can fail. This is turn 20's arithmetic — the
  // box hung off the SCREW row — held against the façade the engine cuts, and
  // the miss is exactly `firstRowFromBottom`.
  const r = budr('BUDR');
  for (const row of drawerPilotRows(r, P)) {
    const turn20BoxY = row.runnerScrewRow
      + B.boxAboveRunner + B.runnerPocketWidth + G + B.boxScrewFromEdge;
    assert.equal(turn20BoxY - row.facadeY, B.firstRowFromBottom,
      `drawer ${row.drawer}: turn 20's box put its pilots 38 mm above the façade's`);
  }
});
