import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { doorBays, bayDoorPlan, hingedCarcassSidesOf } from '../src/engine/doors.js';

// ─── TURN 58 · F2 — THE SLOPE'S LAST LIE: ONE HAND, BOTH ENDS ──────────────
//
// MEASURED ON main cd399cf, 30.08.2026. A 1800 × 2150 wardrobe, one partition
// at 900, bay leaves typed [L, R], under a ceiling rising 1200 → 2150 across
// the width:
//
//   leaf W01-B1   drilled hand = R   (forced = true)   hung on = BUL
//
// The cups are bored in the leaf's RIGHT stile — T46's law, "brak wyboru
// otwierania": the door opens FROM the slope, so the hinges live on the
// full-height edge and the diagonal never carries one — and the ⌀5 plate
// pattern is bored into BUL, because the BOUNDARY was picked from the hand a
// joiner had TYPED and nobody told it the ceiling had overruled him.
//
// Counted in holes: BUL 6, BUR 12. Six holes in a board no hinge reaches, and
// a leaf that cannot be hung on either side. It is the exact fault shape T41-F4
// fixed for split doors ("four bored holes with no hinge in them"), resurrected
// one board down by a ceiling.
//
// THE LAW (reference/lisp/KIT_WARDROBE_FULL.lsp, section G1). A hinge has ONE
// hand. `SKY:leafHand` answers it — the ceiling forces it where the ceiling
// cuts the leaf, the typed hand stands everywhere else, a tie keeps what was
// typed — and `SKY:leafBoundary` DERIVES the board the plates go in from that
// one answer. Two ends of one hinge, one call.
//
// A LEVEL ceiling ties on every leaf, so every cabinet in the app that is not
// under a slope is answered by exactly the hand that answered it yesterday —
// which is what keeps the goldens byte-identical and is asserted below.

/** The ceiling that forces the hand: low at the left, full height at the right. */
const RISING = [{ x: 0, y: 1200 }, { x: 1800, y: 2150 }];
const PARTITION = [{ id: 'p1', kind: 'partition', x_mm: 900, front_mm: 0 }];

const wardrobe = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  width: 1800,
  height: 2150,
  items: PARTITION,
  sections: [{ items: PARTITION }],
  bay_doors: [{ door: 'one', hinge: 'L' }, { door: 'one', hinge: 'R' }],
  ...over,
}, P);

const leaves = (r) => r.panels.filter((p) => p.part === 'FRONT' && p.meta?.bay != null);
const leafOf = (r, bay) => leaves(r).find((p) => p.meta.bay === bay);
/** Plate holes bored into one board. */
const platesOn = (r, panelId) => r.drills.filter((d) => d.kind === 'hinge' && d.panel === panelId).length;

// ═══ 1. THE REPRODUCTION ════════════════════════════════════════════════════

test('F2 · the leaf the slope re-handed is HUNG on the side it is DRILLED on', () => {
  const r = wardrobe({ slope_cut: { pts: RISING, infill: 40 } });
  const b1 = leafOf(r, 0);

  // First: the slope really did overrule the joiner — otherwise this proves
  // nothing at all.
  assert.equal(b1.meta.hinge, 'R', 'the ceiling forced the hand to the full-height edge');
  assert.equal(b1.meta.hingeForced, true, 'and the piece says so');

  // THE LAW. Bay 0 runs from BUL to the partition; a leaf forced onto its
  // RIGHT hand hangs on the PARTITION, never on BUL.
  assert.equal(b1.meta.hingeOn, 'VPART-1',
    'the boundary follows the hand — this is the byte main got wrong');
  assert.equal(b1.meta.hingeFace, 'L',
    'and on the partition face this door closes against');
});

test('F2 · and BUL is not bored for a hinge no door reaches', () => {
  const r = wardrobe({ slope_cut: { pts: RISING, infill: 40 } });
  // On main: BUL 6, BUR 12. Both leaves are forced onto their right hand, so
  // the left-hand carcass board carries nothing at all.
  assert.equal(platesOn(r, 'BUL'), 0, 'six holes with no hinge in them are gone');
  assert.ok(platesOn(r, 'BUR') > 0, 'the leaf that really does hang on BUR still is bored');
  assert.ok(platesOn(r, 'VPART-1') > 0, 'and the partition takes the plates the slope moved to it');
});

test('F2 · every leaf under the ceiling agrees with itself', () => {
  const r = wardrobe({ slope_cut: { pts: RISING, infill: 40 } });
  const bays = doorBays({ width: 1800, boardT: P.board.thickness, partitions: [] });
  assert.ok(bays.length >= 1, 'the helper is reachable');
  for (const leaf of leaves(r)) {
    const bearer = leaf.meta.hingeOn;
    assert.ok(bearer, `${leaf.id} says which board carries it`);
    // The hand and the bearer are two readings of one fact: a leaf on its left
    // hand hangs on its bay's LEFT boundary and vice versa. Whatever the
    // ceiling decided, they cannot disagree.
    const carcass = bearer === 'BUL' ? 'L' : (bearer === 'BUR' ? 'R' : null);
    if (carcass) {
      assert.equal(leaf.meta.hinge, carcass,
        `${leaf.id} is drilled on the hand it hangs by`);
    }
  }
});

// ═══ 2. …AND A LEVEL ROOM IS YESTERDAY, TO THE BYTE ═════════════════════════

test('F2 · a level ceiling keeps the hand the joiner typed', () => {
  const r = wardrobe();
  const b1 = leafOf(r, 0);
  const b2 = leafOf(r, 1);
  assert.equal(b1.meta.hinge, 'L', 'typed L, and nothing overruled it');
  assert.equal(b1.meta.hingeOn, 'BUL');
  assert.equal(b1.meta.hingeForced, undefined, 'no ceiling, no forcing');
  assert.equal(b2.meta.hinge, 'R');
  assert.equal(b2.meta.hingeOn, 'BUR');
  assert.ok(platesOn(r, 'BUL') > 0, 'BUL carries the left leaf exactly as it did');
  assert.ok(platesOn(r, 'BUR') > 0, 'and BUR the right one');
});

test('F2 · a bare kit call is not touched by any of this', () => {
  // No bay doors, no ceiling: the FACE rule answers, exactly as yesterday.
  const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01' }, P);
  assert.equal(leaves(bare).length, 0, 'no bay leaves to re-hand');
  assert.ok(bare.panels.length > 0);
});

// ═══ 3. THE DESIGN LAYER STOPS KEEPING ITS OWN TABLE ════════════════════════
//
// `projectStore.hingedCarcassSides` answered "which carcass sides carry a
// hinged door" with a hand-rolled pair of ifs over the RAW typed hinge —
// a second answer to the question `bayDoorPlan` already answers, and one the
// ceiling could not reach. It is this turn's licensed deletion.

test('F2 · ONE law answers which carcass sides carry a hinged door', () => {
  const bays = doorBays({
    width: 1800,
    boardT: P.board.thickness,
    partitions: [{ id: 'p1', x: 900, fullHeight: true, setback: 0, thickness: P.board.thickness }],
  });
  const modes = [{ door: 'one', hinge: 'L' }, { door: 'one', hinge: 'R' }];

  // Level: both outer boundaries carry a leaf, which is the old table's answer.
  assert.deepEqual(hingedCarcassSidesOf({ bays, modes }), ['BUL', 'BUR']);

  // Forced onto the right hand by the ceiling: BUL carries nothing.
  const forced = [{ door: 'one', hinge: 'R' }, { door: 'one', hinge: 'R' }];
  assert.deepEqual(hingedCarcassSidesOf({ bays, modes: forced }), ['BUR']);

  // …and the answer IS the plan's, not a second reading of it.
  const plan = bayDoorPlan({ bays, modes: forced, width: 1800, gap: P.doors.gap });
  const fromPlan = [...new Set(plan.filter((l) => !l.onPartition).map((l) => l.hingeOn))];
  assert.deepEqual(hingedCarcassSidesOf({ bays, modes: forced }), fromPlan,
    'one path per job: the sides are read OFF the plan');
});

test('F2 · a unit with no bay doors is answered by the engine, as before', () => {
  const bays = doorBays({ width: 900, boardT: P.board.thickness, partitions: [] });
  assert.equal(hingedCarcassSidesOf({ bays, modes: [] }), undefined,
    'nothing said — the engine\'s own doorCount rule still answers');
});

// ═══ 4. THE LISP SAID IT FIRST ══════════════════════════════════════════════

test('F2 · the law is written in the kit before the engine reads it', () => {
  const kit = readFileSync('reference/lisp/KIT_WARDROBE_FULL.lsp', 'utf8');
  assert.match(kit, /\(defun SKY:leafHand /, 'the hand is stated once');
  assert.match(kit, /\(defun SKY:leafBoundary /, 'and the board it hangs on is DERIVED');
  assert.match(kit, /A HINGE HAS ONE HAND/, 'and the law is said in words');
  // The tie rule, which is what keeps every level room byte-identical.
  assert.match(kit, /a tie keeps the hand that was typed/i);
});
