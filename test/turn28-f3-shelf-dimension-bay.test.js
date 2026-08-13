// ─── TURN 28 F3 — a shelf's dimension stands in its OWN bay ─────────────────
//
// The owner, walking turn 27:
//
//   *"znowu pokazuje po prawej stronie szafki półki, które są po lewej od
//   divertera — to nie jest spójne; jak jest diverter, to półki inaczej będą
//   rozdzielone, to proste jest."*
//
// Turn 27 F1 taught the DRILLING which two boards carry a shelf
// (`engine/shelfBearers.js`); the dimension ladder never learned it. A shelf in
// the LEFT bay drew its gap ladder down the unit's RIGHT flank, and drew its
// gaps against shelves on the other side of a partition — which is not a
// compartment anybody can put anything in.
//
// The law: the ladder for a shelf anchors on the flank of ITS OWN BAY, through
// the SAME resolution the drilling goes through. Left bay on the left; right
// bay on the right; middle bay on its own partition flank. R11 stands — still
// one dimension component, fed a different anchor.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  columnOfItem, columnOfShelf, interiorFloor, ladderFlank, shelfColumns,
} from '../src/engine/shelfHeights.js';
import { bearingWalls, shelfBearers } from '../src/engine/shelfBearers.js';

const G = P.board.thickness;

/** The turn-27 eye-test cabinet: 900 wide, a partition at 450. */
const divided = (items) => computeCabinet({
  ...defaultParamsFor('BUD', P),
  unit_num: '01',
  width: 900,
  height: 770,
  sections: [{ width_mm: 900, items: [{ id: 'p1', kind: 'partition', x_mm: 450 }, ...items] }],
}, P);

const columnsOf = (r) => shelfColumns({
  panels: r.panels,
  floor: interiorFloor(G),
  ceiling: r.params.height - G,
  width: r.params.width,
  tolerance: P.carcass.shelfWidthClearance,
}, P.editor.mmStep);

// ─── F3.1 — the anchor, bay by bay ──────────────────────────────────────────

test('F3.1 a shelf in the LEFT bay dimensions on the LEFT', () => {
  const r = divided([{ id: 's1', kind: 'shelf', pos_mm: 300, zone: 0 }]);
  const cols = columnsOf(r);
  assert.equal(cols.length, 1, 'one bay has shelves in it');
  const [col] = cols;
  assert.deepEqual(col.of, ['BUL', 'VPART-1'], 'the two boards it stands on');
  assert.equal(col.flank.x, 0, 'the ladder is on the unit’s LEFT');
  assert.equal(col.flank.dir, -1, '…and pushed further left, clear of the cabinet');
  assert.equal(col.flank.on, 'BUL');
  assert.notEqual(col.flank.x, r.params.width, 'and NOT on the right flank — the fault');
});

test('F3.1 a shelf in the RIGHT bay dimensions on the RIGHT', () => {
  const r = divided([{ id: 's1', kind: 'shelf', pos_mm: 300, zone: 1 }]);
  const [col] = columnsOf(r);
  assert.deepEqual(col.of, ['VPART-1', 'BUR']);
  assert.equal(col.flank.x, r.params.width);
  assert.equal(col.flank.dir, +1);
  assert.equal(col.flank.on, 'BUR');
});

test('F3.1 a shelf in a MIDDLE bay dimensions on its own partition flank', () => {
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width: 1500,
    height: 770,
    sections: [{
      width_mm: 1500,
      items: [
        { id: 'p1', kind: 'partition', x_mm: 450 },
        { id: 'p2', kind: 'partition', x_mm: 1000 },
        { id: 's2', kind: 'shelf', pos_mm: 400, zone: 1 },
      ],
    }],
  }, P);
  const [col] = columnsOf(r);
  assert.deepEqual(col.of, ['VPART-1', 'VPART-2'], 'neither end is the carcass');
  const part = r.panels.find((p) => p.id === 'VPART-1');
  assert.equal(col.flank.x, part.box.x + part.box.w, 'the bay’s own left partition face');
  assert.equal(col.flank.dir, +1, 'pushed INTO the bay it measures');
  assert.equal(col.flank.on, 'VPART-1');
});

test('F3.1 three bays, three shelves: each ladder is on its own bay’s side', () => {
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width: 1500,
    height: 770,
    sections: [{
      width_mm: 1500,
      items: [
        { id: 'p1', kind: 'partition', x_mm: 450 },
        { id: 'p2', kind: 'partition', x_mm: 1000 },
        { id: 's1', kind: 'shelf', pos_mm: 300, zone: 0 },
        { id: 's2', kind: 'shelf', pos_mm: 400, zone: 1 },
        { id: 's3', kind: 'shelf', pos_mm: 500, zone: 2 },
      ],
    }],
  }, P);
  const cols = columnsOf(r);
  assert.equal(cols.length, 3, 'three bays, three columns');
  const partitions = r.panels.filter((p) => p.part === 'VPART');
  assert.equal(partitions.length, 2);
  for (const col of cols) {
    for (const board of col.shelves) {
      // THE COMPLAINT, said as arithmetic: no partition stands between a
      // shelf and the ladder that measures it. That is the whole of "półki,
      // które są po lewej od divertera" being drawn on the right.
      const mid = board.box.x + board.box.w / 2;
      const lo = Math.min(mid, col.flank.x);
      const hi = Math.max(mid, col.flank.x);
      for (const part of partitions) {
        const centre = part.box.x + part.box.w / 2;
        assert.ok(!(centre > lo + 1e-6 && centre < hi - 1e-6),
          `${board.id}: ${part.id} stands between the shelf and its own ladder`);
      }
    }
  }
  // …and the three anchors are three DIFFERENT places, which is the whole
  // complaint: they were one.
  assert.equal(new Set(cols.map((c) => c.flank.x)).size, 3);
});

// ─── F3.2 — ONE resolution, the drilling's own ──────────────────────────────

test('F3.2 the anchor comes out of the SAME bearers the ⌀7.5 ladder is bored in', () => {
  const r = divided([
    { id: 's1', kind: 'shelf', pos_mm: 300, zone: 0 },
    { id: 's2', kind: 'shelf', pos_mm: 500, zone: 1 },
  ]);
  const walls = bearingWalls(r.panels);
  for (const col of columnsOf(r)) {
    for (const board of col.shelves) {
      const bearers = shelfBearers({
        walls,
        run: board.meta.run,
        level: board.box.y,
        tolerance: P.carcass.shelfWidthClearance,
      });
      // The picture's anchor IS `ladderFlank` of the drilling's own pair.
      assert.deepEqual(col.flank, ladderFlank(bearers, r.params.width));
      assert.deepEqual(col.of, [bearers.left.id, bearers.right.id]);
    }
  }
});

test('F3.2 a shelf is measured against the shelves in ITS bay only', () => {
  // Two shelves at different heights in different bays. Before F3 they were
  // one column, so the ladder printed a "gap" of 200 between two boards that
  // do not share a compartment.
  const r = divided([
    { id: 's1', kind: 'shelf', pos_mm: 300, zone: 0 },
    { id: 's2', kind: 'shelf', pos_mm: 500, zone: 1 },
  ]);
  const cols = columnsOf(r);
  assert.equal(cols.length, 2);
  for (const col of cols) {
    assert.equal(col.shelves.length, 1, 'one board in each bay');
    assert.equal(col.lights.length, 2, 'floor→shelf and shelf→top, and nothing else');
    const [below, above] = col.lights;
    const board = col.shelves[0];
    assert.ok(Math.abs(below.to - board.box.y) < 1e-6, 'the light below is up to this board');
    assert.ok(Math.abs(above.from - (board.box.y + board.box.h)) < 1e-6);
    // …and no light ends on the OTHER bay's shelf.
    const other = cols.find((c) => c !== col).shelves[0];
    assert.ok(!col.lights.some((g) => Math.abs(g.to - other.box.y) < 1e-6),
      'nothing is measured across the divider');
  }
});

// ─── F3.3 — an undivided cabinet does not move a millimetre ─────────────────

test('F3.3 no partition: ONE column, on the unit’s right flank, exactly as turn 8', () => {
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 2 }, P);
  const cols = columnsOf(r);
  assert.equal(cols.length, 1);
  const [col] = cols;
  assert.deepEqual(col.of, ['BUL', 'BUR']);
  assert.equal(col.flank.x, r.params.width, 'the right flank, where it has always been');
  assert.equal(col.flank.dir, +1);
  assert.equal(col.shelves.length, 2, 'both boards in the one column');
  assert.equal(col.lights.length, 3, 'floor, between, top');
});

test('F3.3 …and a WARDROBE with a drawer zone keeps its floor', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', shelves: 2, drawers: 2,
  }, P);
  const zone = r.assemblies.drawerZone;
  const cols = shelfColumns({
    panels: r.panels,
    floor: zone ? zone.top + G : interiorFloor(G),
    ceiling: r.params.height - G,
    width: r.params.width,
    tolerance: P.carcass.shelfWidthClearance,
  }, P.editor.mmStep);
  assert.equal(cols.length, 1);
  assert.ok(Math.abs(cols[0].lights[0].from - (zone ? zone.top + G : G)) < 1e-6,
    'the column starts at the top of the drawer stack, not at the carcass floor');
});

// ─── F3.4 — R11: one component, fed a different anchor ─────────────────────

test('F3.4 the VIEW feeds the flank in; it still draws nothing itself', () => {
  const src = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
  // The three ladders — the "all dims" chain, the hover ladder and the live
  // drag — all read a COLUMN's flank rather than the unit's width.
  assert.match(src, /const shelfColumnList = useMemo\(\(\) => shelfColumns\(\{/);
  assert.match(src, /from: \[hoverColumn\.flank\.x, g\.from\]/);
  assert.match(src, /offset: hoverColumn\.flank\.dir \* sideOffset/);
  assert.match(src, /from: \[\(dragColumn\?\.flank \|\| unitFlank\)\.x, g\.from\]/);
  assert.match(src, /col\?\.flank \|\| unitFlank/);
  // …and the component itself is untouched: it takes points and a plane.
  const chain = readFileSync(new URL('../src/3d/DimensionChain.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(chain, /shelfBearers|shelfColumns|flank/, 'the chain knows nothing about bays');
});

test('F3.4 the two lookups a view needs are the module’s own, not the view’s', () => {
  const r = divided([
    { id: 's1', kind: 'shelf', pos_mm: 300, zone: 0 },
    { id: 's2', kind: 'shelf', pos_mm: 500, zone: 1 },
  ]);
  const cols = columnsOf(r);
  const left = r.panels.find((p) => p.part === 'SHELF' && p.meta.itemId === 's1');
  assert.equal(columnOfShelf(cols, left.id).flank.on, 'BUL', 'by panel id — the "all dims" chain');
  assert.equal(columnOfItem(cols, 's2').flank.on, 'BUR', 'by item id — the hover and the drag');
  assert.equal(columnOfItem(cols, 'nobody'), null);
  assert.equal(columnOfShelf(cols, null), null);
});
