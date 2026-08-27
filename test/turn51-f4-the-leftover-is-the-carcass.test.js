// ─── T51 · F4 — THE LEFTOVER IS MEASURED FROM THE CARCASS ───────────────────
//
// CLAUDE.md F4:
//
//   *"`runEndGap` measures from `paddedSpan`, which includes the fillers — so
//   the engine reads zero where the owner sees a gap, and the offer never
//   appears. The gap is measured from the CABINET BODY to the wall, ignoring
//   the scribe filler that stands in it: at a 40 filler and a 300 shadow, the
//   bar says 340, and the filler returns to its 40 once the run is shared
//   out."*
//
// There are TWO questions at the end of a run and they have different answers:
//
//   CAN A CABINET GO HERE?     measured to the PADDED edge — a run's own end
//                              panel is a real board and nothing stands in it.
//                              `addPlusPoints` asks this and `add-plus.test.js`
//                              holds it to the answer.
//   WHAT IS LEFT OVER?         measured from the CABINET BODY.
//
// Both come back from `runEndGap` now, and the share-out reads the second.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildRuns, runEndGap } from '../src/engine/runs.js';
import { shareOutPlan, shareOutOffered, shareOutGapSpan } from '../src/engine/shareOut.js';
import { getCabinetProfile } from '../src/engine/profile.js';

const P = getCabinetProfile();
const WALL = 4000;

const bud = (id, x, w = 600, params = {}) => ({
  id,
  type: 'BUD',
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
  params: {
    width: w, height: 770, depth: 558, front_t: 18, leg_height: 100, ...params,
  },
});

const ends = (units) => {
  const run = buildRuns(units, P)[0];
  return {
    run,
    left: runEndGap(run, 'left', { wallWidth: WALL, others: units }),
    right: runEndGap(run, 'right', { wallWidth: WALL, others: units }),
  };
};

test('F4 — a 40 filler and a 300 shadow: the leftover is 340', () => {
  // The run finishes at 3660. Its end unit carries the scribe filler that will
  // stand in the last 40 mm, and beyond it there is 300 mm of bare wall.
  const units = [bud('A', 40), bud('B', 640), bud('C', 1240, 2420, { side_infill_right_mm: 40 })];
  const { right } = ends(units);
  assert.equal(right.bodyGap, 340, 'carcass to wall — what the joiner is looking at');
  assert.equal(right.gap, 340, 'and the filler was never in the padded span anyway');
});

test('F4 — an END PANEL at the wall: the engine read ZERO where he sees 40', () => {
  // The end unit carries a 40 mm panel taken right up to the wall. Measured to
  // the PADDED edge there is nothing left; measured from the CARCASS there are
  // the 40 mm the panel is standing in — which is exactly what a share-out
  // re-cuts.
  const units = [bud('A', 40), bud('B', 640, 3320, {
    end_panels: [{ id: 'ep', side: 'R', thickness: 40 }],
  })];
  const { right } = ends(units);
  assert.equal(right.gap, 0, 'no CABINET can go there — and that answer is unchanged');
  assert.equal(right.bodyGap, 40, 'but there are 40 mm of leftover, and the bar must say so');
});

// ─── AMENDED BY T53 · F1a — AND THE AMENDMENT IS NAMED ─────────────────────
//
// T51's measurement is untouched and still the point of this file: the leftover
// is read from the CARCASS, so this run reads 80 where the padded edge read 0.
//
// What T53 overturns is the second line of the old test — that 80 was therefore
// an OFFER. Every millimetre of that 80 is RESERVED: 40 at the left wall for
// the scribe this run has not been given yet, 40 at the right for the panel
// standing in it. The wall is full. The owner, 27.08:
//
//   *"jak dołożę nową szafę lub cupboard, i zostaje mniej niż 400 to muszę
//   przesunąć żeby się pojawiła ta informacja."*
//
// …and the same subtraction that makes the bar appear on his add is what stops
// it standing forever over two fillers — the T52 verdict's own note. So the
// gate is `gap − reserved.total`, and here that is zero.
//
// The measurement below is T51's, to the millimetre. Only the verdict on it
// moved, and `test/turn53-f1-*` is where the new one is argued.
test('F4 — …and that is the difference between a leftover and a full wall', () => {
  const units = [bud('A', 40), bud('B', 640, 3320, {
    end_panels: [{ id: 'ep', side: 'R', thickness: 40 }],
  })];
  const run = buildRuns(units, P)[0];
  const ctx = { wallWidth: WALL, others: units, wallMargin: 40 };
  const plan = shareOutPlan(run, ctx, P, {});
  assert.equal(plan.gap, 80, 'the two carcass ends: 40 at the wall, 40 at the panel');
  assert.equal(plan.reserved.total, 80, '…and both of them are already spoken for');
  assert.equal(shareOutOffered(run, ctx, P), null,
    'so there is no leftover to offer — T53 F1a');

  // Give the same run a real leftover — 300 mm of bare wall — and it offers.
  const shorter = [bud('A', 40), bud('B', 640, 3020, {
    end_panels: [{ id: 'ep', side: 'R', thickness: 40 }],
  })];
  const run2 = buildRuns(shorter, P)[0];
  const ctx2 = { wallWidth: WALL, others: shorter, wallMargin: 40 };
  const plan2 = shareOutPlan(run2, ctx2, P, {});
  assert.equal(plan2.gap, 380, '40 at the left wall, 340 of bare wall past the panel');
  assert.ok(shareOutOffered(run2, ctx2, P), 'and 380 − 80 = 300, which is under his 400');
});

test('F4 — the arithmetic of the WIDTHS is untouched by any of this', () => {
  // `clear` runs boundary to boundary — the wall, or the neighbouring run — and
  // neither of those is this run's own edge. Five 600s in a 4000 wall with a
  // 40 mm margin each side: 3920 to share, 784 each.
  const units = [0, 1, 2, 3, 4].map((i) => bud(`u${i}`, 40 + i * 600));
  const run = buildRuns(units, P)[0];
  const plan = shareOutPlan(run, { wallWidth: WALL, others: units, wallMargin: 40 }, P, {});
  assert.equal(plan.clear, 4000);
  assert.equal(plan.infills, 80);
  assert.equal(plan.each, 784);
  assert.equal(plan.widths.length, 5);
});

test('F4 — the BAR stands in the leftover the joiner sees, filler included', () => {
  const units = [bud('A', 40), bud('B', 640, 3000, {
    end_panels: [{ id: 'ep', side: 'R', thickness: 20 }],
  })];
  const run = buildRuns(units, P)[0];
  const span = shareOutGapSpan(run, { wallWidth: WALL, others: units });
  assert.equal(span.side, 'right');
  assert.equal(span.from, 3640, 'it starts at the CARCASS, not past the panel');
  assert.equal(span.to, WALL);
  assert.equal(span.gap, 360);
});
