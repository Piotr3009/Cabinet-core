// ─── TURN 21 F11: THE HEIGHT MAGNET ─────────────────────────────────────────
//
// Owner: dragging a shelf near the height of a shelf in the next bay — or the
// next CABINET — should catch, softly. His words: **a proposal, not force.**
//
// So the tests below are as much about what it does NOT do: it does not touch a
// typed number, it does not link anything, it does not hold on when the hand
// keeps going, and it does not reach round a corner or across a wall for a
// cabinet that merely has similar numbers.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyMagnet, magnetCandidates, overlapsHorizontally, sameBay,
} from '../src/engine/shelfMagnet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const WITHIN = P.editor.shelfMagnetMm;

// A tiny world: three cabinets along one wall, each with its own shelves.
const world = () => {
  const units = [
    { id: 'A', base: 100, span: { left: 0, right: 600 }, shelves: [{ id: 'a1', pos_mm: 800, run: { from: 18, to: 300 } }, { id: 'a2', pos_mm: 1200, run: { from: 318, to: 582 } }] },
    { id: 'B', base: 100, span: { left: 600, right: 1200 }, shelves: [{ id: 'b1', pos_mm: 850, run: { from: 18, to: 582 } }] },
    // Round the corner: it overlaps nothing of A.
    { id: 'C', base: 100, span: { left: 3000, right: 3600 }, shelves: [{ id: 'c1', pos_mm: 802, run: { from: 18, to: 582 } }] },
  ];
  return {
    units,
    args: (unitId, itemId) => ({
      unit: units.find((u) => u.id === unitId),
      itemId,
      neighbours: units,
      shelvesOf: (u) => u.shelves,
      baseOf: (u) => u.base,
      spanOf: (u) => u.span,
    }),
  };
};

test('F11.1 — the candidates are the next BAY and the next CABINET, and nothing else', () => {
  const w = world();
  const got = magnetCandidates(w.args('A', 'a1'));
  const ids = got.map((c) => `${c.unitId}/${c.itemId}`).sort();
  // a2 is in ANOTHER BAY of the same cabinet; b1 is the cabinet next door.
  // a1 is the shelf in the hand, and c1 is round the corner.
  assert.deepEqual(ids, ['A/a2', 'B/b1']);
  assert.deepEqual(got.find((c) => c.itemId === 'a2').from, 'bay');
  assert.deepEqual(got.find((c) => c.itemId === 'b1').from, 'unit');
});

test('F11.1 — a shelf in the SAME bay is not a candidate', () => {
  // Two shelves in one column at one height are two shelves in the same place.
  const units = [{
    id: 'A',
    base: 0,
    span: { left: 0, right: 600 },
    shelves: [
      { id: 'a1', pos_mm: 800, run: { from: 18, to: 582 } },
      { id: 'a2', pos_mm: 805, run: { from: 18, to: 582 } },
    ],
  }];
  const got = magnetCandidates({
    unit: units[0],
    itemId: 'a1',
    neighbours: units,
    shelvesOf: (u) => u.shelves,
    baseOf: () => 0,
    spanOf: (u) => u.span,
  });
  assert.deepEqual(got, []);
});

test('F11.1 — heights are compared in ROOM space, not in stored numbers', () => {
  // Two cabinets on different toe kicks. Their shelves line up on the WALL at
  // stored 800 and 700 — which is what a joiner sees and what should catch.
  const units = [
    { id: 'A', base: 100, span: { left: 0, right: 600 }, shelves: [{ id: 'a1', pos_mm: 800, run: null }] },
    { id: 'B', base: 200, span: { left: 600, right: 1200 }, shelves: [{ id: 'b1', pos_mm: 700, run: null }] },
  ];
  const got = magnetCandidates({
    unit: units[0],
    itemId: 'a1',
    neighbours: units,
    shelvesOf: (u) => u.shelves,
    baseOf: (u) => u.base,
    spanOf: (u) => u.span,
  });
  assert.equal(got.length, 1);
  // 700 in B's frame is 800 in A's, because B stands 100 higher.
  assert.equal(got[0].pos, 800);
});

test('F11.1 — it catches within the profile’s window and nowhere else', () => {
  const candidates = [{ pos: 850, from: 'unit', unitId: 'B', itemId: 'b1' }];
  // Just inside.
  const near = applyMagnet(850 - WITHIN, candidates, WITHIN);
  assert.equal(near.pos, 850);
  assert.equal(near.caught.itemId, 'b1');
  // Just outside — and the number the hand asked for is returned untouched.
  const far = applyMagnet(850 - WITHIN - 0.5, candidates, WITHIN);
  assert.equal(far.pos, 850 - WITHIN - 0.5);
  assert.equal(far.caught, null);
  // The number is the PROFILE's, so a workshop that wants a firmer catch edits
  // one line (rule 2).
  assert.equal(WITHIN, 10);
});

test('F11.2 — drag on THROUGH and it lets go', () => {
  const candidates = [{ pos: 850, from: 'unit', unitId: 'B', itemId: 'b1' }];
  // A hand travelling up past the neighbour: caught, caught, caught, free.
  const path = [842, 848, 856, 862].map((y) => applyMagnet(y, candidates, WITHIN));
  assert.deepEqual(path.map((r) => r.pos), [850, 850, 850, 862]);
  assert.deepEqual(path.map((r) => Boolean(r.caught)), [true, true, true, false]);
});

test('F11.1 — the NEAREST candidate wins when two are in range', () => {
  const candidates = [
    { pos: 850, from: 'unit', unitId: 'B', itemId: 'b1' },
    { pos: 856, from: 'bay', unitId: 'A', itemId: 'a2' },
  ];
  assert.equal(applyMagnet(854, candidates, WITHIN).caught.itemId, 'a2');
  assert.equal(applyMagnet(851, candidates, WITHIN).caught.itemId, 'b1');
});

test('F11.2 — nothing links: the magnet is a value, not a relationship', () => {
  const candidates = [{ pos: 850, from: 'unit', unitId: 'B', itemId: 'b1' }];
  const caught = applyMagnet(848, candidates, WITHIN);
  // What comes back is a POSITION and a description of what it met. There is
  // no id to store, no pair to keep in step, and moving the neighbour later
  // moves nothing here.
  assert.deepEqual(Object.keys(caught).sort(), ['caught', 'pos']);
  assert.equal(caught.pos, 850);
  // …and asking again with no candidates gives the hand's own number back.
  assert.equal(applyMagnet(848, [], WITHIN).pos, 848);
  assert.equal(applyMagnet(848, candidates, 0).pos, 848, 'a zero window is a magnet turned off');
});

test('F11 — the geometry helpers say what they mean', () => {
  assert.equal(overlapsHorizontally({ left: 0, right: 600 }, { left: 600, right: 1200 }), true, 'butted units are beside each other');
  assert.equal(overlapsHorizontally({ left: 0, right: 600 }, { left: 900, right: 1500 }), false, 'a metre apart is not');
  assert.equal(overlapsHorizontally(null, { left: 0, right: 1 }), false);
  assert.equal(sameBay({ from: 0, to: 300 }, { from: 318, to: 600 }), false);
  assert.equal(sameBay({ from: 0, to: 400 }, { from: 300, to: 600 }), true);
  assert.equal(sameBay(null, { from: 0, to: 1 }), true, 'no runs known: one column');
});
