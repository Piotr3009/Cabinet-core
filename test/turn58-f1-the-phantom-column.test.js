import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { plateBearerOf } from '../src/engine/doors.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

// ─── TURN 58 · F1 — THE PHANTOM HINGE COLUMN ON BUL/BUR ────────────────────
//
// The owner, 30.08.2026: *"jak mamy skos i się przełącza z lewej na prawą
// stronę drzwi, ale na BUL i BUR się już nie przełącza."*
//
// THE CAUSE, one. The carcass hinged-side resolution is BLIND to the forced
// flip. `src/engine/cabinet.js` hard-coded it:
//
//     const hingedSides = dropsForward ? []
//       : (doorCount === 2 ? ['BUL', 'BUR']
//         : (doorCount === 1 ? [cfg.hinge === 'R' ? 'BUR' : 'BUL'] : []));
//
// Two doors ⇒ BOTH carcass sides, always. One door ⇒ the side the RAW param
// names. Under a slope T46/T55 FORCE the leaves to one hand (`meta.hingeForced`)
// and the flipped leaf hangs on the DOOR PARTITION the store inserts (T55-F3) —
// but the table went on boring the side the leaf just abandoned.
//
// MEASURED ON THIS BASE (6c50653), W1000 H2200 D600, two doors:
//
//     ceiling 1300 → 2200 across the width
//     leaves      01-FL:R(F)  01-FR:R(F)
//     hinge drills   BUL = 6 (PHANTOM)   BUR = 12
//
// …and on one door it is worse, because the raw pick can be the whole answer:
//
//     W600, one door, hinge 'L', same rake
//     leaf        01-F:R(F)
//     hinge drills   BUL = 6 (PHANTOM)   BUR = 0
//
// Six ⌀5 plate holes in a board no hinge reaches, and — on the one-door case —
// not one hole in the board that actually carries the door.
//
// THE LAW. ONE resolver, `doors.js plateBearerOf`: WHICH BOARD CARRIES THIS
// LEAF'S PLATES, read off the leaf's own `meta.hinge` (forced or free) and the
// board that actually stands on its hinge line. The static table and every raw
// `cfg.hinge` side-pick die (licensed deletion 1). Slope RIGHT is the same
// resolver with zero extra branches, which is what the mirror tests below are
// for: if L and R ever needed different code, the resolver would be two.

const G = P.board.thickness;

const wardrobe = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  width: 1000,
  height: 2200,
  depth: 600,
  ...over,
}, P);

/** A ceiling rising to the RIGHT — the tall edge is the right, so the hand is forced R. */
const RISES_RIGHT = { pts: [{ x: 0, y: 1300 }, { x: 1000, y: 2200 }], infill: 40 };
/** …and its mirror. */
const FALLS_RIGHT = { pts: [{ x: 0, y: 2200 }, { x: 1000, y: 1300 }], infill: 40 };

const platesOn = (r, id) => r.drills.filter((d) => d.kind === 'hinge' && d.panel === id).length;
const leaves = (r) => r.panels.filter((p) => p.part === 'FRONT');
const handsOf = (r) => leaves(r).map((p) => `${p.id}:${p.meta?.hinge}${p.meta?.hingeForced ? '(F)' : ''}`);

// ═══ 1. THE REPRODUCTION, AND ITS MIRROR ════════════════════════════════════

test('F1 · two doors under a rake: the abandoned side is not bored', () => {
  const r = wardrobe({ slope_cut: RISES_RIGHT });
  // First: the slope really did flip a leaf, or this proves nothing.
  assert.deepEqual(handsOf(r), ['01-FL:R(F)', '01-FR:R(F)'],
    'both leaves forced to the right hand — T46/T55');
  assert.equal(platesOn(r, 'BUL'), 0,
    'BUL carries no door now — on main it took 6 phantom holes');
  assert.ok(platesOn(r, 'BUR') > 0, 'and BUR, which really does carry one, is bored');
});

test('F1 · …and the mirror is the SAME resolver, not a second branch', () => {
  const r = wardrobe({ slope_cut: FALLS_RIGHT });
  assert.deepEqual(handsOf(r), ['01-FL:L(F)', '01-FR:L(F)'], 'both forced left');
  assert.equal(platesOn(r, 'BUR'), 0, 'the right side is the abandoned one now');
  assert.ok(platesOn(r, 'BUL') > 0);
});

test('F1 · one door, both hands, flipped by the rake', () => {
  const narrow = (over) => computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 600,
    height: 2200,
    depth: 600,
    doors: { count: 1 },
    ...over,
  }, P);
  const rake = { pts: [{ x: 0, y: 1300 }, { x: 600, y: 2200 }], infill: 40 };

  // Typed LEFT, forced RIGHT: on main this bored BUL 6 and BUR 0 — the
  // phantom column AND no column at all where the door hangs.
  const flipped = narrow({ hinge: 'L', slope_cut: rake });
  assert.equal(flipped.panels.find((p) => p.part === 'FRONT').meta.hinge, 'R', 'forced');
  assert.equal(platesOn(flipped, 'BUL'), 0, 'the typed side is not bored');
  assert.ok(platesOn(flipped, 'BUR') > 0, 'the side it actually hangs on is');

  // Typed RIGHT under the same rake: the raw pick happened to agree, and it
  // must still agree — a fix that only moved the answer would fail here.
  const agreeing = narrow({ hinge: 'R', slope_cut: rake });
  assert.equal(platesOn(agreeing, 'BUL'), 0);
  assert.ok(platesOn(agreeing, 'BUR') > 0);
});

// ═══ 2. THE FLAT TWINS ARE YESTERDAY, TO THE BYTE ═══════════════════════════

test('F1 · flat twin, two doors: BUL 12 / BUR 12, exactly as before', () => {
  const r = wardrobe();
  assert.deepEqual(handsOf(r), ['01-FL:L', '01-FR:R'], 'nothing forced');
  assert.equal(platesOn(r, 'BUL'), 12);
  assert.equal(platesOn(r, 'BUR'), 12);
});

test('F1 · flat twin, one door: the typed hand still decides', () => {
  const one = (hinge) => computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 600,
    height: 2200,
    depth: 600,
    doors: { count: 1 },
    hinge,
  }, P);
  const left = one('L');
  assert.equal(platesOn(left, 'BUL'), 12);
  assert.equal(platesOn(left, 'BUR'), 0);
  const right = one('R');
  assert.equal(platesOn(right, 'BUL'), 0);
  assert.equal(platesOn(right, 'BUR'), 12);
});

test('F1 · an appliance face hangs on nothing, as it always did', () => {
  const dw = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01' }, P);
  assert.equal(platesOn(dw, 'BUL') + platesOn(dw, 'BUR'), 0,
    'no doors, no plates — the drops-forward gate is untouched');
});

// ═══ 3. THE RESOLVER ITSELF — ONE LAW, ASKED DIRECTLY ═══════════════════════

test('F1 · the resolver reads the leaf, and finds the board on its hinge line', () => {
  const r = wardrobe({ slope_cut: RISES_RIGHT });
  const [fl, fr] = leaves(r);
  // FL is forced RIGHT; its hinge edge lands mid-cabinet, where this bare kit
  // cuts nothing at all — so it hangs on NOTHING and bores nothing.
  assert.equal(plateBearerOf(fl, { panels: r.panels, width: 1000, boardT: G }), null);
  // FR is forced RIGHT and its hinge edge IS the right side.
  assert.equal(plateBearerOf(fr, { panels: r.panels, width: 1000, boardT: G }), 'BUR');
});

test('F1 · a bay leaf keeps saying which board it hangs on', () => {
  // `meta.hingeOn` is `bayDoorPlan`'s own answer and predates this turn; the
  // resolver must defer to it rather than re-deriving it from geometry.
  const bay = { part: 'FRONT', box: { x: 0, w: 100 }, meta: { hingeOn: 'VPART-1', hinge: 'L' } };
  assert.equal(plateBearerOf(bay, { panels: [], width: 1000, boardT: G }), 'VPART-1');
});

test('F1 · and a leaf that says nothing bores nothing', () => {
  assert.equal(plateBearerOf(null, {}), null);
  assert.equal(plateBearerOf({ part: 'BUL' }, {}), null, 'a carcass board is not a leaf');
  assert.equal(plateBearerOf({ part: 'FRONT', box: { x: 0, w: 10 }, meta: {} }, {}), null);
});

// ═══ 4. THE FLIPPED LEAF'S COLUMN LIVES ON THE PARTITION, ONCE ══════════════

test('F1 · with the door partition in, the column is on it and is NOT doubled', () => {
  const S = () => useProjectStore.getState();
  S().loadProject({
    id: null,
    name: 'T58 F1',
    number: '58',
    client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
  // T55-F3's own scene, step for step — it is the scene that forces the
  // partition, and copying it is what keeps this a test of F1 rather than a
  // second opinion about when a partition appears.
  const unit = S().addUnit('WARDROBE');
  S().updateUnitParams(unit.id, { width: 1000, height: 2200 });
  S().addDoors(unit.id);
  S().addShelves(unit.id, 2);
  S().addHangerRail(unit.id, {});
  S().moveUnit(unit.id, 0, 0, { magnet: false });
  S().addWallSlope({ wall: 0, side: 'L', startHeight: 1300, run: 900 });
  S().settleLayout();
  S().refreshAutoParts();

  const r = S().unitResult(unit.id);
  const partition = r.panels.find((p) => p.part === 'VPART');
  assert.ok(partition, 'T55-F3 forced the door partition in');

  const flipped = r.panels.filter((p) => p.part === 'FRONT' && p.meta?.hingeForced);
  assert.ok(flipped.length, 'and the leaves really are forced');

  // The abandoned carcass side takes nothing…
  const abandoned = flipped[0].meta.hinge === 'R' ? 'BUL' : 'BUR';
  assert.equal(platesOn(r, abandoned), 0, `${abandoned} is not bored for a door that left it`);

  // …and the partition's column is ONE column, not two leaves' worth stacked.
  const onPart = r.drills.filter((d) => d.kind === 'hinge' && d.panel === partition.id);
  const ys = onPart.map((d) => d.y);
  assert.equal(ys.length, new Set(ys).size,
    'every plate hole on the partition is at its own height — the column is not doubled');
});
