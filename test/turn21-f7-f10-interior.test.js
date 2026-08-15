// ─── TURN 21 F7 / F8 / F9 / F10 — the wardrobe interior grows up ────────────
//
// F7  The shelf learns its three kinds: fix / adjustable / pull-out.
// F8  The partition setback: a DEFAULT, not a law. 20 is where it starts, not
//     what it is.
// F9  A partition yields only to the shelf that CROSSES it. SPAN decides,
//     never order.
// F10 One truth for shelf heights: the interior datum. The panel said 860 and
//     the chip said 842, about the same shelf.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  partitionSpan, shelfCrossesPartition, widthZones,
} from '../src/engine/zones.js';
import {
  SHELF_TYPES, shelfBuild, shelfTypeEnabled, shelfTypeOf, shelfVariantForType,
} from '../src/engine/shelfTypes.js';
import {
  clearLights, fieldFromPos, interiorFloor, lightBelow, posFromField,
} from '../src/engine/shelfHeights.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const G = P.board.thickness;

const wardrobe = (items, extra = {}) => computeCabinet({
  type: 'WARDROBE',
  width: 1200,
  height: 2150,
  depth: 578,
  board_t: 18,
  front_t: 25,
  front_type: 'S',
  hinge: 'L',
  unit_num: 'W1',
  shelves: items.filter((i) => i.kind === 'shelf').length,
  sections: [{ items }],
  ...extra,
}, P);

const vpartOf = (r, n = 1) => r.panels.find((p) => p.id === `VPART-${n}`);
const shelfOf = (r, n = 1) => r.panels.find((p) => p.id === `SHELF-${n}`);

// ─── F7 — the three kinds ──────────────────────────────────────────────────

test('F7 — three kinds, in the owner’s own words — and turn 33 adds his fourth', () => {
  // Turn 33 (CLAUDE.md F3): the SHOE SHELF joins the menu — pinned like the
  // adjustable, tilted only in the picture, its stop rail cut beside it.
  assert.deepEqual(SHELF_TYPES.map((t) => t.id), ['fix', 'adjustable', 'pullout', 'shoe']);
  assert.deepEqual(SHELF_TYPES.map((t) => t.label), ['Fix', 'Adjustable', 'Pull-out', 'Shoe shelf']);
});

test('F7.1/F7.2 — a type is the `variant` a shelf already had: ONE truth, two names', () => {
  // Nothing said: the pin shelf the kit has drilled since turn 1.
  assert.equal(shelfTypeOf(null), 'adjustable');
  assert.equal(shelfTypeOf({}), 'adjustable');
  assert.equal(shelfTypeOf({ variant: 'adjustable' }), 'adjustable');
  // Somebody screwed it, or locked it where it is — both are `fix` in the
  // workshop, and both were already drilled that way.
  assert.equal(shelfTypeOf({ variant: 'fixed' }), 'fix');
  assert.equal(shelfTypeOf({ updown_locked: true }), 'fix');
  // …and writing a type writes that same one field back.
  assert.equal(shelfVariantForType('fix'), 'fixed');
  assert.equal(shelfVariantForType('adjustable'), 'adjustable');
  assert.equal(shelfVariantForType('nonsense'), 'adjustable');
});

test('F7.2 — ADJUSTABLE is LISP-backed, so it ships enabled and invents nothing', () => {
  assert.equal(shelfTypeEnabled('adjustable'), true);
  // SKYLON_COMMON drawBUL L755-768, verbatim: two columns 70 mm in from each
  // edge, three pins per column at ±50, ⌀7.5 on SHELVES_7_5MM. The profile has
  // carried exactly that since turn 1 — there is no new number here at all.
  assert.equal(P.shelfHoles.columnFromEdge, 70);
  assert.deepEqual(P.shelfHoles.clusterOffsets, [-50, 0, 50]);
  assert.equal(P.shelfHoles.diameter, 7.5);
  assert.equal(P.shelfHoles.layer, 'SHELVES_7_5MM');

  // …and an adjustable shelf really is drilled that way, while a fix one gets
  // screws on its own centre line and no pins — "the shelf loses its fixed
  // dowels when adjustable", read the other way round.
  const pinned = wardrobe([{ id: 's1', kind: 'shelf', pos_mm: 900 }]);
  const screwed = wardrobe([{ id: 's1', kind: 'shelf', pos_mm: 900, variant: 'fixed' }]);
  const layers = (r) => new Set(r.drills.filter((d) => d.panel === 'BUL' && d.kind.startsWith('shelf')).map((d) => d.layer));
  assert.ok(layers(pinned).has('SHELVES_7_5MM'));
  assert.ok(!layers(pinned).has('SCREWS_3MM'));
  assert.ok(layers(screwed).has('SCREWS_3MM'));
  assert.ok(!layers(screwed).has('SHELVES_7_5MM'));
  assert.equal(
    pinned.drills.filter((d) => d.kind === 'shelf').length,
    pinned.drillSummary.shelf_pin_row_y.length
      * P.shelfHoles.clusterOffsets.length
      * pinned.drillSummary.shelf_hole_x.length
      * 2,
    'three pins per column, two columns, both sides, per row — the LISP’s own count',
  );
});

test('F7.3 — PULL-OUT ships visible and DISABLED, with the reason and no invented number', () => {
  const entry = SHELF_TYPES.find((t) => t.id === 'pullout');
  assert.ok(entry, 'the option is there — a joiner can see the app knows about it');
  assert.equal(entry.enabled, false, '…and cannot choose it yet');
  assert.match(entry.hint, /workshop number|tray side/i);
  assert.equal(shelfTypeEnabled('pullout'), false);
  // The PLUMBING is in place, so the number is a one-line unlock: the engine
  // switch exists, names the blocked kind and says why.
  assert.deepEqual(shelfBuild({ variant: 'fixed' }), { kind: 'screwed', blocked: null });
  assert.deepEqual(shelfBuild({}), { kind: 'pinned', blocked: null });
  const pullout = shelfBuild({ variant: 'pullout' });
  assert.equal(pullout.kind, 'pinned', 'built as what it physically is with the runners left off');
  assert.match(pullout.blocked, /workshop number/i);
});

// ─── F8 — the setback is a default, not a law ──────────────────────────────

test('F8.1 — a partition takes its OWN setback, and the unit only seeds it', () => {
  const at = (front) => wardrobe(
    [{ id: 'p1', kind: 'partition', x_mm: 600, ...(front == null ? {} : { front_mm: front }) }],
    { partition_front_mm: 20 },
  );
  // Nothing said on the piece: the unit's number.
  assert.equal(vpartOf(at(null)).meta.front_mm, 20);
  // Its own number wins, and it is not clamped to the unit's.
  assert.equal(vpartOf(at(60)).meta.front_mm, 60);
  assert.equal(vpartOf(at(0)).meta.front_mm, 0, 'setback 0 is load-bearing — F12’s doors need it');
  // The DEPTH follows the number, which is the same board getting longer.
  assert.equal(
    vpartOf(at(0)).box.d - vpartOf(at(60)).box.d, 60,
    'the piece is exactly as much deeper as the setback is smaller',
  );
  // …and the panel says so, so the door law can ask the piece.
  assert.equal(vpartOf(at(0)).meta.setback, 0);
});

test('F8.3 — the golden default is untouched: no setback said, nothing moves', () => {
  // A bare `computeCabinet` has no project-level setback at all, which is what
  // the LISP kits cut and what every golden fixture expects.
  const bare = computeCabinet({
    type: 'WARDROBE',
    width: 1200,
    height: 2150,
    depth: 578,
    board_t: 18,
    front_t: 25,
    front_type: 'S',
    hinge: 'L',
    unit_num: 'W1',
    sections: [{ items: [{ id: 'p1', kind: 'partition', x_mm: 600 }] }],
  }, P);
  assert.equal(vpartOf(bare).meta.front_mm, 0, 'flush, as the kit cuts it');
});

// ─── F9 — span decides, never order ────────────────────────────────────────

test('F9.1 — the crossing law is two intervals, and touching is not crossing', () => {
  const part = { x: 600, thickness: 18 };
  assert.equal(shelfCrossesPartition({ from: 20, to: 1180 }, part), true, 'a full-width shelf crosses');
  assert.equal(shelfCrossesPartition({ from: 20, to: 600 }, part), false, 'a left-bay shelf abuts it');
  assert.equal(shelfCrossesPartition({ from: 618, to: 1180 }, part), false, 'a right-bay shelf abuts it');
  assert.equal(shelfCrossesPartition({ from: 500, to: 700 }, part), true, 'and one that overlaps it does');
  assert.equal(shelfCrossesPartition({ from: NaN, to: 700 }, part), false);
});

test('F9.1 — a shelf inside one bay leaves the partition alone; one that spans it splits it', () => {
  const partition = { id: 'p1', kind: 'partition', x_mm: 600 };
  const spanning = { id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1000 };
  const inBay = { ...spanning, zone: 0 };

  const split = wardrobe([partition, spanning]);
  assert.equal(vpartOf(split).meta.terminatesOn, 's1', 'the shelf crosses it, so it carries it');
  assert.equal(vpartOf(split).box.y + vpartOf(split).box.h, 1000);

  const clear = wardrobe([partition, inBay]);
  assert.equal(vpartOf(clear).meta.terminatesOn, null, 'a bay shelf carries nothing');
  assert.equal(vpartOf(clear).box.h, 2150 - 2 * G, 'so the partition runs the full height');
  // …and the bay shelf really is inside one bay, which is what made it so.
  assert.ok(shelfOf(clear).meta.run.to <= 600 + 1e-9);
});

test('F9.2 — ORDER decides nothing: both ways round end in identical geometry', () => {
  // The owner's screenshot case, built both ways: partition first then the bay
  // shelf, and the bay shelf first then the partition.
  const partition = { id: 'p1', kind: 'partition', x_mm: 600 };
  const bayShelf = {
    id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1000, zone: 1,
  };
  const a = wardrobe([partition, bayShelf]);
  const b = wardrobe([bayShelf, partition]);
  const geometry = (r) => r.panels
    .filter((p) => p.box)
    .map((p) => `${p.id}|${p.w}x${p.h}x${p.thickness}|${p.box.x},${p.box.y},${p.box.z}`)
    .sort();
  assert.deepEqual(geometry(a), geometry(b));
  // And a re-computation from the same items — a save/load round trip in every
  // way that matters — lands on the same answer again.
  assert.deepEqual(geometry(wardrobe([partition, bayShelf])), geometry(a));
});

test('F9.1 — a shelf in ANOTHER bay cannot truncate a partition (turn 12’s worst case)', () => {
  // Two partitions, three bays, and one fixed shelf in the LEFT bay. Turn 12
  // handed `partitionSpan` every shelf in the cabinet, so the right-hand
  // partition stopped on a board that does not reach it.
  const r = wardrobe([
    { id: 'p1', kind: 'partition', x_mm: 400 },
    { id: 'p2', kind: 'partition', x_mm: 800 },
    {
      id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 900, zone: 0,
    },
  ]);
  assert.equal(vpartOf(r, 1).meta.terminatesOn, null);
  assert.equal(vpartOf(r, 2).meta.terminatesOn, null);
  for (const n of [1, 2]) assert.equal(vpartOf(r, n).box.h, 2150 - 2 * G);
  // The bays themselves are still the geometry they always were.
  assert.equal(widthZones({ width: 1200, boardT: G, partitions: [{ x_mm: 400 }, { x_mm: 800 }] }).length, 3);
});

test('F9 — partitionSpan itself is unchanged: it answers about the shelves it is GIVEN', () => {
  const carried = partitionSpan({
    floor: G,
    ceiling: 2132,
    shelves: [{ kind: 'shelf', variant: 'fixed', pos_mm: 1000 }],
    boardT: G,
    depth: 540,
    fullDepth: 560,
  });
  assert.equal(carried.to, 1000);
  assert.equal(carried.terminatesOn, null, 'no id on the item, so nothing is claimed');
  const alone = partitionSpan({
    floor: G, ceiling: 2132, shelves: [], boardT: G, depth: 540, fullDepth: 560,
  });
  assert.equal(alone.to, 2132);
});

// ─── F10 — one truth for shelf heights ─────────────────────────────────────

test('F10.1 — the field is the underside above the INTERIOR floor', () => {
  assert.equal(interiorFloor(18), 18);
  // The owner's screenshot, exactly: the panel said 860 and the chip said 842.
  assert.equal(fieldFromPos(860, 18), 842);
  assert.equal(posFromField(842, 18), 860);
  // …and it round-trips, which is what lets an existing project be edited
  // through the new mapping without drifting.
  for (const pos of [18, 100.5, 860, 2000]) {
    assert.equal(posFromField(fieldFromPos(pos, 18), 18), pos);
  }
  // A cabinet cut from a different board has a different floor.
  assert.equal(fieldFromPos(860, 22), 838);
});

test('F10.1 — the field and the first chip are the SAME number', () => {
  const r = wardrobe([{ id: 's1', kind: 'shelf', pos_mm: 860 }]);
  const shelf = shelfOf(r);
  const lights = clearLights({
    positions: [shelf.box.y], thickness: [shelf.box.h], floor: interiorFloor(G), ceiling: 2150 - G,
  });
  assert.equal(lightBelow(shelf.box.y, lights).size, fieldFromPos(shelf.box.y, G));
  assert.equal(lightBelow(shelf.box.y, lights).size, 842);
});

test('F10.1 — the chips are the CLEAR LIGHTS: floor→shelf, shelf→shelf, shelf→top', () => {
  const lights = clearLights({
    positions: [500, 1000], thickness: 18, floor: 18, ceiling: 2132,
  });
  assert.deepEqual(lights.map((g) => g.size), [482, 482, 1114]);
  assert.deepEqual(lights.map((g) => [g.below, g.above]), [[null, 1], [1, 2], [2, null]]);
  // The odd one out is marked, which is what the readout exists for.
  assert.deepEqual(lights.map((g) => g.even), [false, false, true]);
  // A per-shelf thickness is honoured — a joiner's 25 mm board eats 25 mm.
  const thick = clearLights({
    positions: [500], thickness: [25], floor: 18, ceiling: 2132,
  });
  assert.deepEqual(thick.map((g) => g.size), [482, 1607]);
});

test('F10.2 — STORAGE DOES NOT MOVE: a turn-20 project loads to identical geometry', () => {
  // The very same stored items a turn-20 project holds — `pos_mm` measured
  // from the outside of the carcass bottom, exactly as it always was.
  const stored = [
    { id: 's1', kind: 'shelf', pos_mm: 860 },
    { id: 's2', kind: 'shelf', pos_mm: 1400, variant: 'fixed' },
  ];
  const r = wardrobe(stored);
  assert.equal(shelfOf(r, 1).box.y, 860, 'exactly where turn 20 put it');
  assert.equal(shelfOf(r, 2).box.y, 1400);
  assert.deepEqual(r.drillSummary.shelf_row_y, [860, 1400]);
  // Only what is SHOWN changed meaning — and it maps back to the same store.
  assert.equal(posFromField(fieldFromPos(860, G), G), 860);
  // …and the type reading of an untouched shelf moves no drilling either.
  assert.equal(shelfTypeOf(stored[0]), 'adjustable');
  assert.equal(shelfTypeOf(stored[1]), 'fix');
});
