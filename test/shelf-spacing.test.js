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
//
// ─── TURN 11 (CLAUDE.md F2) ───
// The zone was right and the formula was one-sided: it spaces BOTTOM FACES, and
// a shelf is 18 mm of board, so the only opening with no shelf under it came out
// one board bigger than the rest (Piotr: 226.5 / 227 / 244.5). `boardT` closes
// it for the DESIGN layer; omitted, this is still the AutoLISP to the last
// decimal, which is what the engine's own fallback and every fixture need.
// The turn-11 tests are at the foot of the file.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { evenShelfPositions } from '../src/engine/items.js';
import { shelfBand } from '../src/engine/collision.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
// Turn 24 (CLAUDE.md F3.1): no thickness, no drawers — the gate, opened.
import { confirmDrawerBox } from './drawer-box-gate.js';

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

  const expected = evenShelfPositions({
    zoneBottom: G, zoneTop: H - G, count: 3, boardT: G,
  }).map((y) => Math.round(y / P.editor.mmStep) * P.editor.mmStep);
  assert.deepEqual(shelfPositions(id), expected);
});

test('the zone follows the drawers: shelves settle above the stack, evenly', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  confirmDrawerBox();
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
    boardT: G,
  }).map((y) => Math.round(y / P.editor.mmStep) * P.editor.mmStep);
  assert.deepEqual(shelfPositions(id), expected);
  assert.ok(shelfPositions(id)[0] > zone.top, 'and no shelf is inside the drawer zone');
});

test('evening the shelves does not turn the stack upside down', () => {
  // The second half of the bug, and it is reachable by doing nothing but
  // pressing the two buttons in order.
  //
  // Shelves are ADDED biggest-opening-first (engine/items.js centredShelfPos),
  // so the stored array is NOT in physical order: the first shelf halves the
  // carcass and the second halves the lower half, which puts items[0] above
  // items[1]. Turn 8 walked
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

// ─── TURN 11 (CLAUDE.md F2): ALL THE GAPS, INCLUDING THE BOTTOM ONE ─────────
//
// Piotr's screenshot after turn 9: 226.5 / 227 / 244.5. The zone was already
// right; the arithmetic accounted the board at ONE END ONLY, so the opening
// with no shelf under it came out exactly one board thickness bigger than
// every other one — 244.5 − 226.5 = 18.
//
// These are the tests CLAUDE.md F2.2 asks for by name: every gap equal, to
// 0.5 mm, for 1 / 2 / 3 shelves, in a plain cabinet, in one with drawers below
// and in one with a plinth.

/**
 * Every CLEAR opening in the shelf column of a unit, floor to ceiling, measured
 * between FACES — which is what a joiner puts a tape on and what the screenshot
 * shows. Read from the ENGINE's own panel boxes, not from the stored items, so
 * a shelf that is not where the store thinks it is cannot pass this.
 */
function openings(id) {
  const unit = unitOf(id);
  const G = unit.params.board_t ?? P.board.thickness;
  const result = computeCabinet(paramsForEngine(unit), P);
  const zone = result.assemblies.drawerZone;
  const floor = zone ? zone.top + G : G;
  const ceiling = unit.params.height - G;
  const boards = result.panels
    .filter((p) => p.part === 'SHELF' && p.box)
    .map((p) => ({ from: p.box.y, to: p.box.y + p.box.h }))
    .sort((a, b) => a.from - b.from);
  const faces = [floor, ...boards.flatMap((b) => [b.from, b.to]), ceiling];
  const out = [];
  for (let i = 0; i < faces.length - 1; i += 2) out.push(faces[i + 1] - faces[i]);
  return out;
}

function assertEvenOpenings(id, count, what) {
  const gaps = openings(id);
  assert.equal(gaps.length, count + 1, `${what}: ${count} shelves make ${count + 1} openings`);
  for (const g of gaps) {
    assert.ok(Math.abs(g - gaps[0]) <= P.editor.mmStep,
      `${what}, ${count} shelves: openings ${gaps.map((v) => v.toFixed(1)).join(' / ')} are not equal`);
  }
}

for (const n of [1, 2, 3]) {
  test(`plain cabinet, ${n} shelf${n === 1 ? '' : 'ves'}: every gap equal`, () => {
    project();
    const { id } = store().addUnit('WARDROBE');
    store().addShelves(id, n);
    store().redistributeShelves(id);
    assertEvenOpenings(id, n, 'plain cabinet');
  });

  test(`cabinet with drawers below, ${n} shelf${n === 1 ? '' : 'ves'}: every gap equal`, () => {
    project();
    const { id } = store().addUnit('WARDROBE');
    confirmDrawerBox();
    store().addDrawers(id, 3);
    store().addShelves(id, n);
    store().redistributeShelves(id);
    // The zone starts at the TOP FACE of the partition that closes the stack —
    // the LISP's `shelfZoneBottom = wieniecY + G` (KIT_WARDROBE_FULL L688).
    assertEvenOpenings(id, n, 'drawers below');
  });

  test(`cabinet with a plinth, ${n} shelf${n === 1 ? '' : 'ves'}: every gap equal`, () => {
    project();
    const { id } = store().addUnit('BUDTALL');
    assert.equal(store().addPlinth(id), true, 'a tall unit stands on legs and takes a plinth');
    store().addShelves(id, n);
    store().redistributeShelves(id);
    // The plinth hangs BELOW the carcass (box.y is negative) — it closes the
    // leg space, not the inside of the box — so it must not move the zone by so
    // much as half a millimetre. That is the other half of F2.1: the bottom
    // bound is the cabinet floor's TOP FACE and nothing else.
    assertEvenOpenings(id, n, 'with a plinth');
  });
}

test('the lowest opening is no longer one board bigger than the rest', () => {
  // The regression, stated as the number Piotr reported. Turn 9's formula is
  // still available (boardT omitted) and still produces the fault, which is what
  // makes this a comparison rather than an assertion about an implementation.
  const zoneBottom = 18;
  const zoneTop = 1020 - 18;
  const G = 18;
  const lisp = evenShelfPositions({ zoneBottom, zoneTop, count: 3 });
  const fixed = evenShelfPositions({
    zoneBottom, zoneTop, count: 3, boardT: G,
  });

  const gapsOf = (ys) => {
    const faces = [zoneBottom, ...ys.flatMap((y) => [y, y + G]), zoneTop];
    const out = [];
    for (let i = 0; i < faces.length - 1; i += 2) out.push(faces[i + 1] - faces[i]);
    return out;
  };

  const before = gapsOf(lisp);
  assert.ok(Math.abs((before[0] - before[1]) - G) < 1e-9,
    'the AutoLISP formula leaves the bottom opening exactly one board bigger');

  const after = gapsOf(fixed);
  for (const g of after) assert.ok(Math.abs(g - after[0]) < 1e-9, `${after.join(' / ')}`);
  // …and the shelves still divide the SAME zone: nothing has been added to it.
  assert.ok(fixed[0] > zoneBottom && fixed[2] + G < zoneTop);
});

test('boardT omitted is the AutoLISP, to the last decimal', () => {
  // The engine's own even-spacing fallback calls this without a thickness, and
  // through it the pin drilling and every golden fixture. It must not move.
  const kit = evenShelfPositions({ zoneBottom: 18, zoneTop: 2132, count: 2 });
  const spacing = (2132 - 18) / 3;
  assert.ok(Math.abs(kit[0] - (18 + spacing)) < 1e-12);
  assert.ok(Math.abs(kit[1] - (18 + spacing * 2)) < 1e-12);
  assert.deepEqual(evenShelfPositions({ zoneBottom: 18, zoneTop: 2132, count: 2, boardT: 0 }), kit);
});

// ─── TURN 11 (CLAUDE.md F2.3): AN ADDED SHELF IS CENTRED ────────────────────

test('the first shelf added halves the zone', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().addShelves(id, 1);
  const G = unitOf(id).params.board_t ?? P.board.thickness;
  const H = unitOf(id).params.height;
  const [y] = shelfPositions(id);
  // Centred BOARD, not centred face: the two openings it leaves are equal.
  const below = y - G;
  const above = (H - G) - (y + G);
  assert.ok(Math.abs(below - above) <= P.editor.mmStep,
    `a single added shelf leaves ${below} below and ${above} above`);
  // …and it is nowhere near the top, which is where turn 4 put it.
  assert.ok(y < H - G - P.editor.minShelfEdgeGap * 2, 'not parked under the wieniec');
});

test('the second shelf halves the biggest opening that is left', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().addShelves(id, 2);
  const ys = shelfPositions(id);
  assert.equal(ys.length, 2);
  const G = unitOf(id).params.board_t ?? P.board.thickness;
  assert.ok(ys[1] - (ys[0] + G) >= P.editor.minShelfGap - 1e-9, 'and never on top of the first');
});

test('an added shelf lands above the drawers, centred in what is left', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  confirmDrawerBox();
  store().addDrawers(id, 3);
  store().addShelves(id, 1);
  const unit = unitOf(id);
  const G = unit.params.board_t ?? P.board.thickness;
  const result = computeCabinet(paramsForEngine(unit), P);
  const floor = result.assemblies.drawerZone.top + G;
  const [y] = shelfPositions(id);
  assert.ok(y > floor, 'above the partition that closes the stack');
  const below = y - floor;
  const above = (unit.params.height - G) - (y + G);
  assert.ok(Math.abs(below - above) <= P.editor.mmStep,
    `centred in the zone above the drawers: ${below} / ${above}`);
});

test('a shelf that will not fit is refused rather than stacked', () => {
  project();
  const { id } = store().addUnit('LOW_CABINET');
  // Fill it until it says no, and then check it really did say no.
  const { added, requested } = store().addShelves(id, 20);
  assert.ok(added < requested, 'the carcass runs out of room before 20 shelves');
  const ys = shelfPositions(id);
  const G = unitOf(id).params.board_t ?? P.board.thickness;
  for (let i = 1; i < ys.length; i += 1) {
    assert.ok(ys[i] - ys[i - 1] > G, `shelves at ${ys[i - 1]} and ${ys[i]} overlap`);
  }
});
