// ─── Shelves v2 (turn 8, CLAUDE.md F4) ───
//
// Three changes, and the first one has a constraint on it worth writing down.
//
//  1. SET BACK 20 mm. An adjustable shelf has stood 20 mm off the face since
//     the AutoLISP; a FIX shelf and a partition were cut full depth. Piotr
//     wants them all on one line.
//
//     …but the golden fixtures ARE the AutoLISP kits, and fixtures/README rule
//     1 is absolute: engine output must match, and if it does not, the engine
//     is wrong. A partition cut 20 mm shorter would put every wardrobe fixture
//     red. So the setback arrives as a PARAMETER the store supplies for every
//     unit in a project, exactly the way the plinth and the top infill do — a
//     bare `computeCabinet()` still cuts what the kit cuts, and a cabinet in a
//     project is set back. Both statements are tested here.
//
//  2. FIX = SCREWED. Three ⌀3 screws through each carcass side into the edge of
//     the board, on its centre line — the same joint the partition has always
//     used — and NO pin holes, because holes for a shelf that cannot move are
//     holes drilled for nothing.
//
//  3. `updown_locked`: a shelf that is otherwise adjustable but must not be
//     dragged. Same drilling, same refusal to move.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore, paramsForEngine, migrateUnitShelves } from '../src/stores/projectStore.js';
import { computeCabinet, isShelfLocked, shelfVariant } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { shelfGapLadder } from '../src/engine/items.js';
// Turn 24 (CLAUDE.md F3.1): no thickness, no drawers — the gate, opened.
import { confirmDrawerBox } from './drawer-box-gate.js';

const store = () => useProjectStore.getState();
const G = P.board.thickness;
const SETBACK = P.carcass.interiorSetback;

function project() {
  store().loadProject({
    id: null,
    name: 'shelves',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);
const shelvesOf = (id) => resultOf(id).panels.filter((p) => p.part === 'SHELF');
const itemsOf = (id) => unitOf(id).params.sections[0].items;
const drillsOf = (id, kind) => resultOf(id).drills.filter((d) => d.kind === kind);

function withShelves(type = 'BUD', count = 2) {
  project();
  const { id } = store().addUnit(type);
  store().addShelves(id, count);
  return id;
}

// ─── what a shelf IS ────────────────────────────────────────────────────────

test('a shelf nobody has said anything about is ADJUSTABLE', () => {
  assert.equal(shelfVariant(undefined), 'adjustable');
  assert.equal(shelfVariant({}), 'adjustable');
  assert.equal(shelfVariant({ variant: 'nonsense' }), 'adjustable');
  assert.equal(shelfVariant({ variant: 'fixed' }), 'fixed');
  assert.equal(shelfVariant({ variant: 'pullout' }), 'pullout');

  const id = withShelves();
  assert.ok(itemsOf(id).every((i) => i.variant === 'adjustable'), 'and one that is ADDED is too');
});

test('a project saved before turn 8 keeps its shelves adjustable', () => {
  // `fixed` used to mean nothing more than "a shelf" — it was the value
  // addShelves wrote for everything. Reading it as SCREWED would re-drill a
  // cabinet somebody may already have cut.
  const legacy = {
    id: 'u1',
    type: 'BUD',
    position: { wall: 0, x_mm: 0 },
    params: {
      width: 600,
      sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 400 }] }],
    },
  };
  const migrated = migrateUnitShelves(legacy);
  assert.equal(migrated.params.sections[0].items[0].variant, 'adjustable');
  assert.equal(migrated.params.shelf_schema, 2, 'and it is stamped, so it happens once');
  // …and a unit that HAS been through it is left alone, screwed shelves and all.
  const modern = migrateUnitShelves({
    ...migrated,
    params: {
      ...migrated.params,
      sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 400 }] }],
    },
  });
  assert.equal(modern.params.sections[0].items[0].variant, 'fixed');
});

test('locked is locked, for either of the two reasons', () => {
  assert.equal(isShelfLocked({ variant: 'fixed' }), true, 'screwed in');
  assert.equal(isShelfLocked({ variant: 'adjustable', updown_locked: true }), true, 'or held by decision');
  assert.equal(isShelfLocked({ variant: 'adjustable' }), false);
  assert.equal(isShelfLocked({ variant: 'pullout' }), false);
});

// ─── the setback, and the fixtures it must not disturb ──────────────────────

test('a BARE kit call still cuts exactly what the AutoLISP cuts', () => {
  // fixtures/README rule 1, stated as a test rather than trusted.
  const r = computeCabinet({
    type: 'WARDROBE', width: 600, height: 2150, depth: 578, unit_num: 'W01', shelves: 1, drawers: 2, rail: true,
  }, P);
  const internalDepth = 578 - G;
  assert.equal(r.panels.find((p) => p.id === 'PARTITION').h, internalDepth);
  assert.equal(r.panels.find((p) => p.id === 'RAIL-PART').h, internalDepth);
  assert.equal(r.panels.find((p) => p.id === 'SHELF-1').h, 578 - G - P.carcass.shelfDepthClearance);
});

test('a unit in a PROJECT sets its partition back with the shelves', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  confirmDrawerBox();
  store().addDrawers(id, 2);
  store().addHangerRail(id);
  const r = resultOf(id);
  const depth = unitOf(id).params.depth;
  const internalDepth = depth - G;

  assert.equal(r.panels.find((p) => p.id === 'PARTITION').h, internalDepth - SETBACK);
  assert.equal(r.panels.find((p) => p.id === 'RAIL-PART').h, internalDepth - SETBACK);
  // …and both start at the BACK, so what moved is the front edge.
  for (const idp of ['PARTITION', 'RAIL-PART']) {
    assert.equal(r.panels.find((p) => p.id === idp).box.z, G);
  }
});

test('a partition can be stretched out to the face on its own', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  confirmDrawerBox();
  store().addDrawers(id, 2);
  const internalDepth = unitOf(id).params.depth - G;
  store().setPartitionFront(id, 0);
  assert.equal(resultOf(id).panels.find((p) => p.id === 'PARTITION').h, internalDepth);
  // …and put back.
  store().setPartitionFront(id, null);
  assert.equal(resultOf(id).panels.find((p) => p.id === 'PARTITION').h, internalDepth - SETBACK);
});

test('one shelf can be stretched to the face without moving the others', () => {
  const id = withShelves('BUD', 2);
  const depth = unitOf(id).params.depth;
  const standard = depth - G - P.carcass.shelfDepthClearance;
  assert.ok(shelvesOf(id).every((p) => p.h === standard));

  store().setShelfFront(id, itemsOf(id)[0].id, 0);
  const sizes = shelvesOf(id).map((p) => p.h).sort((a, b) => a - b);
  assert.deepEqual(sizes, [standard, depth - G]);
  assert.equal(shelvesOf(id).find((p) => p.h === depth - G).box.z, G, 'the back edge did not move');
});

test('the TOP and BOTTOM are not in this — they carry the joint', () => {
  const id = withShelves('BUD', 1);
  const r = resultOf(id);
  const internalDepth = unitOf(id).params.depth - G;
  for (const idp of ['TOP', 'BOTTOM']) {
    assert.equal(r.panels.find((p) => p.id === idp).h, internalDepth, `${idp} was shortened`);
  }
});

// ─── FIX = screwed ──────────────────────────────────────────────────────────

test('an adjustable shelf is drilled for pins; a FIX one is drilled for screws', () => {
  const id = withShelves('BUD', 2);
  const [a, b] = itemsOf(id);

  // Two adjustable shelves: two rows of pins per side, no shelf screws.
  const pinsPerRow = P.shelfHoles.clusterOffsets.length * 2;      // 3 holes × 2 columns
  assert.equal(drillsOf(id, 'shelf').length, 2 * 2 * pinsPerRow, 'both sides, both rows');
  assert.equal(drillsOf(id, 'shelf_screw').length, 0);

  store().setShelfVariant(id, a.id, 'fixed');
  assert.equal(drillsOf(id, 'shelf').length, 1 * 2 * pinsPerRow, 'the adjustable one keeps its pins');
  assert.equal(drillsOf(id, 'shelf_screw').length, 2 * 3, 'three screws per side for the fixed one');
  assert.ok(b);
});

test('a shelf screw is ⌀3, on the SCREWS layer, on the shelf’s own centre line', () => {
  const id = withShelves('BUD', 1);
  const item = itemsOf(id)[0];
  store().setShelfVariant(id, item.id, 'fixed');

  const screws = drillsOf(id, 'shelf_screw');
  assert.equal(screws.length, 6);
  for (const s of screws) {
    assert.equal(s.d, P.puzzle.screwDiameter);
    assert.equal(s.layer, P.puzzle.layers.screw, 'SCREWS_3MM — the layer the LISP already uses');
    // Into the EDGE of the board: half a thickness above the shelf's underside.
    assert.equal(s.y, unitOf(id).params.sections[0].items[0].pos_mm + G / 2);
  }
  assert.deepEqual([...new Set(screws.map((s) => s.panel))].sort(), ['BUL', 'BUR']);
  // Three across the depth, at the same places the partition's screws go.
  const sideW = unitOf(id).params.depth - G;
  assert.deepEqual(
    [...new Set(screws.map((s) => s.x))].sort((x, y) => x - y),
    [P.puzzle.screwFromEnd, sideW / 2, sideW - P.puzzle.screwFromEnd],
  );
});

test('a LOCKED adjustable shelf is drilled exactly like a fixed one', () => {
  const id = withShelves('BUD', 1);
  const item = itemsOf(id)[0];
  store().setShelfLocked(id, item.id, true);
  assert.equal(drillsOf(id, 'shelf').length, 0, 'no pins for a shelf that cannot move');
  assert.equal(drillsOf(id, 'shelf_screw').length, 6);
  // …and unlocking gives them back.
  store().setShelfLocked(id, item.id, false);
  assert.equal(drillsOf(id, 'shelf_screw').length, 0);
  assert.ok(drillsOf(id, 'shelf').length > 0);
});

test('the drill summary says which rows are pinned and which are screwed', () => {
  const id = withShelves('BUD', 2);
  const [a] = itemsOf(id);
  store().setShelfVariant(id, a.id, 'fixed');
  const d = resultOf(id).drillSummary;
  assert.equal(d.shelf_row_y.length, 2, 'every shelf is still WHERE it is');
  assert.equal(d.shelf_pin_row_y.length, 1);
  assert.equal(d.shelf_screw_row_y.length, 1);
  assert.equal(d.shelf_screw_row_y[0], d.shelf_row_y.find((y) => y === a.pos_mm) + G / 2);
});

// ─── a locked shelf does not move, by ANY route ─────────────────────────────

test('a fixed or locked shelf refuses the drag AND the typed number', () => {
  const id = withShelves('BUD', 2);
  const [a, b] = itemsOf(id);
  const wasA = a.pos_mm;

  store().setShelfVariant(id, a.id, 'fixed');
  const dragged = store().setShelfPos(id, a.id, wasA - 200);
  assert.equal(dragged.blocked, true);
  assert.equal(dragged.locked, true, 'and it says WHY, so the readout can too');
  assert.equal(itemsOf(id).find((i) => i.id === a.id).pos_mm, wasA);

  // The one beside it is untouched and still moves.
  const free = store().setShelfPos(id, b.id, b.pos_mm - 50);
  assert.equal(free.blocked, false);
  assert.notEqual(itemsOf(id).find((i) => i.id === b.id).pos_mm, b.pos_mm);
});

test('the 3D view is told which shelves are held, so it can say so', () => {
  const id = withShelves('BUD', 2);
  const [a] = itemsOf(id);
  store().setShelfLocked(id, a.id, true);
  const r = resultOf(id);
  const panel = r.panels.find((p) => p.part === 'SHELF' && p.meta.itemId === a.id);
  assert.equal(panel.meta.locked, true);
  assert.equal(r.assemblies.shelves.find((s) => s.itemId === a.id).locked, true);
  assert.equal(r.assemblies.shelves.find((s) => s.itemId !== a.id).locked, false);
});

// ─── the cut list follows ───────────────────────────────────────────────────

test('the setback reaches the CSV and the CNC outline, not just the picture', () => {
  const id = withShelves('BUD', 1);
  const item = itemsOf(id)[0];
  store().setShelfFront(id, item.id, 0);
  const r = resultOf(id);
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  assert.equal(shelf.cnc.outline[2][1], shelf.h, 'the CNC outline is the piece, not the old size');
  assert.ok(r.csvLines.some((l) => l.includes(`,SHELF-1,${Math.round(shelf.w)},${Math.round(shelf.h)},`)));
});

// ─── hover: the gaps in the whole column ─────────────────────────────────────

test('the hover readout measures every CLEAR opening, between faces', () => {
  // Two shelves in a 770 carcass, 18 mm board: floor face at 18, top face at
  // 752, so three openings — and they are measured between FACES, because the
  // question is what fits in there.
  const gaps = shelfGapLadder({
    positions: [262, 506], floor: G, ceiling: 770 - G, boardT: G,
  });
  assert.deepEqual(gaps.map((g) => g.size), [244, 226, 228]);
  assert.deepEqual(gaps.map((g) => [g.from, g.to]), [[18, 262], [280, 506], [524, 752]]);
});

test('…and says which ones are the odd ones out', () => {
  const uneven = shelfGapLadder({ positions: [262, 506], floor: G, ceiling: 770 - G, boardT: G });
  // 244 is the biggest opening; 226 and 228 are the ones a joiner is looking
  // for, and they are the ones the readout puts in gold.
  assert.deepEqual(uneven.map((g) => g.even), [true, false, false]);

  // A stack that IS even says so all the way down.
  // Three zero-thickness shelves at 200/400/600 in an 800 opening make FOUR
  // even gaps: floor to the first, two between, and the last to the top.
  const even = shelfGapLadder({ positions: [200, 400, 600], floor: 0, ceiling: 800, boardT: 0 });
  assert.deepEqual(even.map((g) => g.size), [200, 200, 200, 200]);
  assert.ok(even.every((g) => g.even));
});

test('no shelves, no ladder', () => {
  assert.deepEqual(shelfGapLadder({ positions: [], floor: 18, ceiling: 752, boardT: 18 }), []);
  assert.deepEqual(shelfGapLadder({ positions: [NaN], floor: 18, ceiling: 752, boardT: 18 }), []);
});
