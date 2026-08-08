// ─── Even shelf spacing: the kit's formula, not an invented one ─────────────
// Turn 9, CLAUDE.md F3.
//
// Piotr's report: after "Even"/"Centre shelves", the gaps are NOT equal.
//
// The cause was that turn 8 spread the shelves across the DRAG BAND — the zone
// pulled in by `editor.minShelfEdgeGap` at both ends — rather than across the
// shelf ZONE. That makes the first and last openings exactly one edge gap
// different from the middle ones, which is what a joiner sees.
//
// The replacement is KIT_WARDROBE_FULL.lsp `drawWardrobeShelvesFront`
// (lines 133-142), traced verbatim:
//
//     spacing  = (shelfZoneTop − shelfZoneBottom) / (numShelves + 1)
//     shelfY_i = shelfZoneBottom + spacing · i
//
// and the zone bounds are the LISP's own (lines 687-692): the TOP FACE of
// whatever closes the space below — the rail partitioner, the drawer partition,
// or the base panel — up to the UNDERSIDE of the top panel.
//
// `shelfY` is the shelf's BOTTOM FACE. The LISP says so twice: it draws the
// board from `shelfY` to `shelfY + G` (line 143) and it drills the pin cluster
// at `shelfY − 50 / shelfY / shelfY + 50` (lines 411-416) — the row the shelf
// sits ON. `pos_mm` has meant the same thing here since turn 1.
//
// Every expected number below is worked out BY HAND from that formula in the
// comment above it. Nothing is read back out of the implementation.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { evenShelfPositions } from '../src/engine/items.js';
import { shelfBand } from '../src/engine/collision.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);
const shelfPositions = (id) => (unitOf(id).params.sections[0].items || [])
  .filter((i) => i.kind === 'shelf')
  .map((i) => i.pos_mm)
  .sort((a, b) => a - b);

function project() {
  store().loadProject({
    id: null,
    name: 'even',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

// ─── the formula itself ─────────────────────────────────────────────────────

test('one shelf lands in the middle of the zone', () => {
  // zone 18 → 2132 (a 2150 wardrobe on 18 mm board)
  // spacing = (2132 − 18) / 2 = 1057
  // S1 = 18 + 1057 = 1075
  assert.deepEqual(evenShelfPositions({ zoneBottom: 18, zoneTop: 2132, count: 1 }), [1075]);
});

test('two shelves cut the zone into three equal steps', () => {
  // spacing = (2132 − 18) / 3 = 704.666…
  // S1 = 18 + 704.666… = 722.666…
  // S2 = 18 + 1409.333… = 1427.333…
  const got = evenShelfPositions({ zoneBottom: 18, zoneTop: 2132, count: 2 });
  const spacing = (2132 - 18) / 3;
  assert.equal(got.length, 2);
  assert.ok(Math.abs(got[0] - (18 + spacing)) < 1e-9);
  assert.ok(Math.abs(got[1] - (18 + spacing * 2)) < 1e-9);
});

test('three shelves cut it into four — and the steps really are equal', () => {
  // zone 18 → 1002 (a 1020 mm carcass): spacing = 984 / 4 = 246
  // S1 = 264, S2 = 510, S3 = 756
  assert.deepEqual(evenShelfPositions({ zoneBottom: 18, zoneTop: 1002, count: 3 }), [264, 510, 756]);
});

test('the zone offsets when there are drawers below — the same formula, a higher floor', () => {
  // A drawer stack whose partition's TOP FACE is at 700, in a 2150 carcass:
  // zone 700 → 2132, spacing = 1432 / 2 = 716, so the single shelf is at 1416.
  assert.deepEqual(evenShelfPositions({ zoneBottom: 700, zoneTop: 2132, count: 1 }), [1416]);
  // …and with two: spacing = 1432 / 3 = 477.333…
  const two = evenShelfPositions({ zoneBottom: 700, zoneTop: 2132, count: 2 });
  assert.ok(Math.abs(two[0] - (700 + 1432 / 3)) < 1e-9);
  assert.ok(Math.abs(two[1] - (700 + (1432 / 3) * 2)) < 1e-9);
});

test('no shelves, no positions — and a nonsense count is no shelves', () => {
  assert.deepEqual(evenShelfPositions({ zoneBottom: 18, zoneTop: 2132, count: 0 }), []);
  assert.deepEqual(evenShelfPositions({ zoneBottom: 18, zoneTop: 2132, count: -3 }), []);
  assert.deepEqual(evenShelfPositions({ zoneBottom: 18, zoneTop: 2132, count: 'two' }), []);
});

test('the STEPS between bottom faces are equal, which is what the kit spaces', () => {
  // The property the formula guarantees, checked rather than assumed: every
  // step from the zone floor to the first shelf, shelf to shelf, and the last
  // shelf to the zone top is the same number.
  for (const n of [1, 2, 3, 4, 5, 7, 10]) {
    const zoneBottom = 18;
    const zoneTop = 2132;
    const ys = evenShelfPositions({ zoneBottom, zoneTop, count: n });
    const faces = [zoneBottom, ...ys, zoneTop];
    const steps = faces.slice(1).map((y, i) => y - faces[i]);
    for (const s of steps) {
      assert.ok(Math.abs(s - steps[0]) < 1e-9, `${n} shelves: step ${s} against ${steps[0]}`);
    }
    assert.equal(steps.length, n + 1, 'N shelves make N+1 steps');
  }
});

// ─── the zone is the one the engine and the LISP already agree on ───────────

test('the zone bounds are shelfBand floor/ceiling — not the drag band', () => {
  // This is the whole bug in one assertion. `min`/`max` are how close a shelf
  // may be DRAGGED to the ends; `floor`/`ceiling` are where the carcass
  // actually closes, which is what the LISP spaces between.
  const band = shelfBand({ height: 2150, boardT: 18, floorY: null }, P);
  assert.equal(band.floor, 18, 'the top face of the base panel');
  assert.equal(band.ceiling, 2150 - 18, 'the underside of the top panel');
  assert.equal(band.min, 18 + P.editor.minShelfEdgeGap);
  assert.equal(band.max, 2150 - 18 - P.editor.minShelfEdgeGap);

  const kit = evenShelfPositions({ zoneBottom: band.floor, zoneTop: band.ceiling, count: 2 });
  const oldWay = evenShelfPositions({ zoneBottom: band.min, zoneTop: band.max, count: 2 });
  assert.notDeepEqual(kit, oldWay, 'the two answers differ — that difference IS the report');
});

test('a shelf drilled at the even position is drilled where the shelf sits', () => {
  // `shelfHoles.followPositions` means the pin rows follow the positions the UI
  // supplies. The formula and the drilling therefore have to mean the same
  // thing by "shelfY", and the engine's own even-spacing fallback is the
  // control: with no positions supplied it computes exactly the same numbers.
  const bare = computeCabinet({
    type: 'WARDROBE', width: 600, height: 2150, depth: 578, unit_num: '01', shelves: 2,
  }, P);
  const zoneBottom = 18;
  const zoneTop = 2150 - 18;
  const expected = evenShelfPositions({ zoneBottom, zoneTop, count: 2 });
  const got = bare.assemblies.shelves.map((s) => s.y);
  assert.equal(got.length, 2);
  for (let i = 0; i < got.length; i += 1) assert.ok(Math.abs(got[i] - expected[i]) < 1e-9);

  // And the board is drawn FROM that y, one thickness tall — the LISP's
  // `drawRect shelfX1 shelfY shelfX2 (shelfY + G)`.
  for (const panel of bare.panels.filter((p) => p.part === 'SHELF')) {
    assert.equal(panel.box.h, 18, 'the shelf box starts at pos_mm and is one board thick');
  }
});

// ─── the button a joiner actually presses ───────────────────────────────────

test('"Even" puts the shelves exactly where the LISP would put them', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  const unit = unitOf(id);
  const G = unit.params.board_t ?? P.board.thickness;
  const H = unit.params.height;

  store().addShelves(id, 3);
  // Somewhere arbitrary first, so the button has something to correct.
  const items = unit.params.sections[0].items.filter((i) => i.kind === 'shelf');
  for (const sh of items) store().setShelfPos(id, sh.id, 900);

  store().redistributeShelves(id);

  const expected = evenShelfPositions({ zoneBottom: G, zoneTop: H - G, count: 3 })
    .map((y) => Math.round(y / P.editor.mmStep) * P.editor.mmStep);
  assert.deepEqual(shelfPositions(id), expected);
});

test('…and the clear openings come out even, which is the report', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  const G = unitOf(id).params.board_t ?? P.board.thickness;
  const H = unitOf(id).params.height;
  store().addShelves(id, 3);
  store().redistributeShelves(id);

  // Between BOTTOM FACES the steps are equal by construction. What a joiner
  // looks at is the clear opening, and that is the step less one board — the
  // same number for every opening above the first, which is the step itself
  // (nothing stands under the lowest shelf).
  const ys = shelfPositions(id);
  const step = (H - G - G) / (ys.length + 1);
  const openings = [
    ys[0] - G,                                    // base panel top → S1 underside
    ...ys.slice(1).map((y, i) => y - (ys[i] + G)), // shelf to shelf
    (H - G) - (ys[ys.length - 1] + G),            // S3 top → top panel underside
  ];
  for (const o of openings.slice(1)) {
    assert.ok(Math.abs(o - openings[1]) <= P.editor.mmStep,
      `openings ${openings.join(', ')} are not even`);
  }
  assert.ok(Math.abs(openings[0] - step) <= P.editor.mmStep,
    'and the lowest one is the full step — there is no board under it');
});

test('the zone follows the drawers: shelves settle above the stack, evenly', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().addDrawers(id, 3);
  store().addShelves(id, 2);
  store().redistributeShelves(id);

  const unit = unitOf(id);
  const G = unit.params.board_t ?? P.board.thickness;
  const result = computeCabinet(paramsForEngine(unit), P);
  const zone = result.assemblies.drawerZone;
  assert.ok(zone, 'the drawer stack fits, so there is a zone to sit above');

  const expected = evenShelfPositions({
    zoneBottom: zone.top + G,          // the partition's TOP face
    zoneTop: unit.params.height - G,   // the underside of the top panel
    count: 2,
  }).map((y) => Math.round(y / P.editor.mmStep) * P.editor.mmStep);
  assert.deepEqual(shelfPositions(id), expected);
  assert.ok(shelfPositions(id)[0] > zone.top, 'and no shelf is inside the drawer zone');
});

test('evening the shelves does not turn the stack upside down', () => {
  // The second half of the bug, and it is reachable by doing nothing but
  // pressing the two buttons in order.
  //
  // Shelves are ADDED from the top down (engine/items.js nextShelfPos), so the
  // stored array runs DESCENDING: items[0] is the highest shelf. Turn 8 walked
  // that array and handed out ascending positions as it went — so the highest
  // shelf was given the lowest slot and the stack came back inverted. Nothing
  // moved on screen when the shelves were still evenly spaced, which is why it
  // went unnoticed; it shows the moment one of them has been dragged.
  //
  // They are assigned in ENGINE order now — bottom-up, the order S1..Sn means
  // everywhere else in the system.
  project();
  const { id } = store().addUnit('WARDROBE');
  store().addShelves(id, 2);
  const stored = unitOf(id).params.sections[0].items.filter((i) => i.kind === 'shelf');
  assert.ok(stored[0].pos_mm > stored[1].pos_mm,
    'shelves are added top-down, so the stored array is descending — the trap');

  const [high, low] = stored;
  store().setShelfPos(id, low.id, 1600);          // close the two up a little
  store().redistributeShelves(id);

  const at = (itemId) => unitOf(id).params.sections[0].items.find((i) => i.id === itemId).pos_mm;
  assert.ok(at(high.id) > at(low.id), 'the higher shelf is still the higher one');
});

test('a shelf can never be evened on top of another one', () => {
  // Even spacing can still be too tight when the zone is short, and the clamp
  // has the final word there exactly as it does for a drag — `redistribute`
  // ends by re-clamping, so the button can no more produce an overlap than a
  // pointer can.
  project();
  const { id } = store().addUnit('LOW_CABINET');
  store().addShelves(id, 3);
  store().redistributeShelves(id);
  const ys = shelfPositions(id);
  const G = unitOf(id).params.board_t ?? P.board.thickness;
  for (let i = 1; i < ys.length; i += 1) {
    assert.ok(ys[i] - ys[i - 1] >= P.editor.minShelfGap - 1e-9,
      `shelves at ${ys[i - 1]} and ${ys[i]} are closer than the minimum gap`);
    assert.ok(ys[i] - ys[i - 1] > G, 'and certainly not inside one another');
  }
});
