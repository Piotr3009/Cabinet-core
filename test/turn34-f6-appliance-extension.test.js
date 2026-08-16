// ─── Turn 34, CLAUDE.md F6: a trim may EXTEND, there and only there ────────
//
// The owner, 16.08.2026: *"raczej tylko przy appliance'ach — silnik powinien
// pilnować, żeby zawsze było 3"*.
//
// The matrix has always said an appliance neighbour wants clearance 0: a
// dishwasher door is 594 in a 600 opening, so the MACHINE provides the 3 and
// our front runs to the carcass end. T32's healing plan could never deliver
// that, because it floored every correction at trim 0 — "a trim only narrows".
// A front that the kit cut 3 mm inside its own carcass end therefore stood
// 3 + 3 = 6 from the appliance door and no heal path could close it.
//
// So the floor becomes KIND-DEPENDENT, in exactly one kind. Everywhere else
// the T32 law stands verbatim, and this file pins both halves.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { NEIGHBOUR, clearanceFor, healingPlan } from '../src/engine/frontClearance.js';

const SRC = readFileSync(new URL('../src/engine/frontClearance.js', import.meta.url), 'utf8');

/**
 * One front, one edge, as `frontClearances()` publishes it — the smallest
 * thing `healingPlan` reads, so the law can be pinned without a whole room.
 */
function row({
  kind, have, w = 597, unitId = 'u1', panelId = '01-F',
}) {
  const want = clearanceFor(kind, P);
  return {
    unitId,
    panelId,
    unitNum: '01',
    w,
    edges: {
      right: {
        kind,
        side: 'right',
        wantClearanceMm: want,
        haveClearanceMm: have,
        parked: want === null,
        correctionMm: want === null ? 0 : Math.round((want - have) * 100) / 100,
      },
    },
  };
}

const noTrim = () => null;

// ─── the exception, and only the exception ─────────────────────────────────

test('beside an APPLIANCE a front at stock 3 EXTENDS by 3 — the sum is the owner\'s 3', () => {
  const plan = healingPlan([row({ kind: NEIGHBOUR.APPLIANCE, have: 3 })], { trimOf: noTrim });
  assert.equal(plan.patches.length, 1);
  const [p] = plan.patches;
  assert.equal(p.side, 'right');
  assert.equal(p.trim, -3, 'a NEGATIVE trim is an extension');
  assert.equal(p.deltaMm, -3);
  assert.equal(p.kind, NEIGHBOUR.APPLIANCE);
  // The result the client sees: our front runs to the carcass end (clearance
  // 0) and the appliance's own 3 mm inset IS the gap.
  assert.equal(p.trim + 3, 0, 'clearance closed to 0 — the machine provides the 3');
  assert.match(plan.notices[0], /\+3 mm at an appliance front/);
});

test('the extension is CAPPED at closing the stock clearance to 0 — never wider', () => {
  // A front already extended by 3 (trim −3) standing flush with its carcass
  // end: nothing more is owed and nothing more is planned.
  const trimOf = () => ({ left: 0, right: -3 });
  const plan = healingPlan([row({ kind: NEIGHBOUR.APPLIANCE, have: 0 })], { trimOf });
  assert.deepEqual(plan.patches, [], 'a closed edge is a settled edge — the pass converges');

  // And an edge whose matrix WANTED more than the stock has to give is held
  // at the cap rather than made wider than the carcass.
  const overreach = [{
    ...row({ kind: NEIGHBOUR.APPLIANCE, have: 2 }),
  }];
  overreach[0].edges.right.correctionMm = -9; // as if the matrix asked for −9
  const capped = healingPlan(overreach, { trimOf: noTrim });
  assert.equal(capped.patches[0].trim, -2,
    'the stock clearance was 2; closing it to 0 is the whole of what a trim may do');
});

test('every OTHER kind still floors at 0 — "a trim only narrows", verbatim', () => {
  for (const kind of [
    NEIGHBOUR.FRONT, NEIGHBOUR.END_PANEL, NEIGHBOUR.INFILL, NEIGHBOUR.WALL, NEIGHBOUR.NONE,
  ]) {
    // A front standing WIDER apart than the matrix wants: the correction is
    // negative, and outside the appliance it may not be acted on.
    const plan = healingPlan([row({ kind, have: 12 })], { trimOf: noTrim });
    assert.deepEqual(plan.patches, [], `${kind}: a trim may not extend`);
  }
  // …and a positive correction on those kinds still narrows exactly as before.
  const narrows = healingPlan([row({ kind: NEIGHBOUR.END_PANEL, have: 1.5 })], { trimOf: noTrim });
  assert.equal(narrows.patches[0].trim, 1.5);
});

test('a PARKED corner and an appliance\'s OWN face are still never planned', () => {
  assert.deepEqual(
    healingPlan([row({ kind: NEIGHBOUR.CORNER, have: 3 })], { trimOf: noTrim }).patches, [],
  );
  const own = row({ kind: NEIGHBOUR.APPLIANCE, have: 3 });
  own.appliance = 'dw';
  assert.deepEqual(healingPlan([own], { trimOf: noTrim }).patches, [],
    'a fridge door is the factory\'s width, never cut');
});

test('the doc-comment names the ONE exception, with the owner\'s sentence on it', () => {
  assert.match(SRC, /a WIDENING past the kit's own width/, 'the T32 law is still written down…');
  assert.match(SRC, /raczej tylko przy appliance'ach/, '…and the 16.08 exception is quoted beside it');
});

// ─── the drilling rides the edge (rules 9 and 12, on an EXTENSION) ─────────

test('the trim runs BEFORE the drilling, so a cup 21.5 from the hinge edge stays 21.5', () => {
  const base = { ...defaultParamsFor('BUD', P), unit_num: '01' };
  const stock = computeCabinet(base, P);
  const front = stock.panels.find((p) => p.role === 'front');
  assert.ok(front, 'the BUD has a door');

  const extended = computeCabinet({
    ...base,
    front_edge_trim: { [front.id]: { left: 0, right: -3 } },
  }, P);
  const wider = extended.panels.find((p) => p.id === front.id);
  assert.equal(wider.w, front.w + 3, 'the negative trim WIDENED the board');
  assert.deepEqual(wider.meta.edgeTrim, { left: 0, right: -3 }, 'and the piece says what was done');

  // The cups: still 21.5 from the front's OWN hinge edge, on the widened board.
  const cupsOf = (r, id) => (r.drills || [])
    .filter((d) => d.panel === id && /cup/i.test(d.kind || d.role || ''))
    .map((d) => d.x);
  const before = cupsOf(stock, front.id);
  const after = cupsOf(extended, front.id);
  assert.equal(before.length, after.length, 'the same holes, in the same number');
  if (before.length) {
    const edgeDist = (xs, w) => xs.map((x) => Math.round(Math.min(x, w - x) * 100) / 100);
    assert.deepEqual(edgeDist(after, wider.w), edgeDist(before, front.w),
      'every cup kept its distance from its own edge');
  }
});

// ─── the fingerprint (rule 2) ──────────────────────────────────────────────

test('no standard config carries an appliance, so F6 moves no fingerprint', () => {
  // The bare engine is handed no `front_edge_trim` at all, which is the whole
  // reason the golden fixtures never see this pass.
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P);
    assert.ok(!r.panels.some((p) => p.meta?.edgeTrim), `${id}: nothing was trimmed`);
  }
});
