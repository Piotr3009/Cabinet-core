// ─── Zones, partitions and which side (turn 12, CLAUDE.md F5) ───────────────
//
// The owner's rules for a partition, stated as behaviour:
//
//   • it may terminate ON a shelf only if that shelf is FIXED;
//   • if that shelf is set back, the partition's depth FOLLOWS it — shrink the
//     shelf and the partition shrinks with it, automatically;
//   • if the shelf is adjustable, the partition does NOT attach;
//   • with a partition present, an added shelf lands in the BAY it was told to.
//
// And underneath them the thing CLAUDE.md asks to be built for its own sake:
// "an explicit ZONE model in the interior maths … the foundation the 2×/4×
// drawer stacks and future interior work will stand on".

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  centreInZone, heightZones, isFixedShelf, largestZone, partitionCollisions,
  partitionSpan, widthZones, zoneAt, zonesBetween,
} from '../src/engine/zones.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);
const itemsOf = (id) => unitOf(id).params.sections[0].items;

function project() {
  store().loadProject({
    id: null,
    name: 't12-zones',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

// ─── The zone model ─────────────────────────────────────────────────────────

test('an empty span is ONE zone, and its faces are the span', () => {
  const zones = zonesBetween({
    from: 18, to: 582, boards: [], boardT: 18, axis: 'x',
  });
  assert.equal(zones.length, 1);
  assert.deepEqual(
    { from: zones[0].from, to: zones[0].to, size: zones[0].size },
    { from: 18, to: 582, size: 564 },
  );
  assert.equal(zones[0].centre, 300);
});

test('one board makes two zones, measured between FACES', () => {
  // A partition at x=291, 18 thick, in a 600 cabinet: two clear bays of 273.
  const zones = widthZones({ width: 600, boardT: 18, partitions: [{ x_mm: 291 }] });
  assert.equal(zones.length, 2);
  assert.deepEqual(zones.map((z) => [z.from, z.to]), [[18, 291], [309, 582]]);
  assert.deepEqual(zones.map((z) => z.size), [273, 273]);
  // Indices are what a shelf stores, so they have to be stable and 0-based.
  assert.deepEqual(zones.map((z) => z.index), [0, 1]);
});

test('two boards make three, in order, whatever order they arrive in', () => {
  const a = widthZones({ width: 900, boardT: 18, partitions: [{ x_mm: 600 }, { x_mm: 300 }] });
  const b = widthZones({ width: 900, boardT: 18, partitions: [{ x_mm: 300 }, { x_mm: 600 }] });
  assert.deepEqual(a, b);
  assert.equal(a.length, 3);
  assert.deepEqual(a.map((z) => z.size), [282, 282, 264]);
});

test('a board outside the span is not a board in it', () => {
  const zones = widthZones({ width: 600, boardT: 18, partitions: [{ x_mm: 5000 }, { x_mm: -20 }] });
  assert.equal(zones.length, 1, 'nonsense positions do not carve up the cabinet');
});

test('heightZones is the same question up the other axis', () => {
  const zones = heightZones({
    floor: 18, ceiling: 752, boardT: 18, shelves: [{ pos_mm: 250 }, { pos_mm: 500 }],
  });
  assert.deepEqual(zones.map((z) => z.size), [232, 232, 234]);
  assert.equal(largestZone(zones).index, 2);
});

test('zoneAt finds the opening a point is in, and null when it is on a board', () => {
  const zones = widthZones({ width: 600, boardT: 18, partitions: [{ x_mm: 291 }] });
  assert.equal(zoneAt(zones, 100).index, 0);
  assert.equal(zoneAt(zones, 400).index, 1);
  assert.equal(zoneAt(zones, 300), null, '300 is inside the partition itself');
  assert.equal(zoneAt(zones, 'nonsense'), null);
});

test('centreInZone centres the BOARD, not its near face', () => {
  const zone = {
    from: 100, to: 400, size: 300, index: 0, id: 'y1', centre: 250,
  };
  assert.equal(centreInZone(zone, 18), 100 + (300 - 18) / 2);
  assert.equal(centreInZone(zone, 18) + 18 / 2, 250, 'the middle of the board is the middle of the zone');
  assert.equal(centreInZone(zone, 400), null, 'a piece that does not fit gets no answer');
  assert.equal(centreInZone(null, 18), null);
});

// ─── The partition and the shelf it stands on ───────────────────────────────

const SHELF = (over) => ({
  id: 's1', kind: 'shelf', pos_mm: 400, variant: 'adjustable', ...over,
});

test('a partition runs full height when nothing carries it', () => {
  const span = partitionSpan({
    floor: 18, ceiling: 752, shelves: [], boardT: 18, depth: 520, fullDepth: 540,
  });
  assert.equal(span.from, 18);
  assert.equal(span.to, 752);
  assert.equal(span.height, 734);
  assert.equal(span.terminatesOn, null);
  assert.equal(span.depth, 520);
});

test('it terminates on a FIXED shelf', () => {
  const span = partitionSpan({
    floor: 18,
    ceiling: 752,
    shelves: [SHELF({ variant: 'fixed' })],
    boardT: 18,
    depth: 520,
    fullDepth: 540,
  });
  assert.equal(span.to, 400);
  assert.equal(span.height, 382);
  assert.equal(span.terminatesOn, 's1');
});

test('…and NOT on an adjustable one — that is a collision, not a joint', () => {
  const shelves = [SHELF({ variant: 'adjustable' })];
  const span = partitionSpan({
    floor: 18, ceiling: 752, shelves, boardT: 18, depth: 520, fullDepth: 540,
  });
  assert.equal(span.terminatesOn, null);
  assert.equal(span.to, 752, 'it runs straight past');
  // …and the piece it runs past is named, so the existing collision treatment
  // has something to be applied to.
  const clash = partitionCollisions({ span, shelves, boardT: 18 });
  assert.deepEqual(clash.map((s) => s.id), ['s1']);
});

test('a pull-out shelf carries nothing either — only FIXED means screwed', () => {
  assert.equal(isFixedShelf({ kind: 'shelf', variant: 'fixed' }), true);
  assert.equal(isFixedShelf({ kind: 'shelf', variant: 'adjustable' }), false);
  assert.equal(isFixedShelf({ kind: 'shelf', variant: 'pullout' }), false);
  assert.equal(isFixedShelf({ kind: 'partition', variant: 'fixed' }), false);
  const span = partitionSpan({
    floor: 18,
    ceiling: 752,
    shelves: [SHELF({ variant: 'pullout' })],
    boardT: 18,
    depth: 520,
    fullDepth: 540,
  });
  assert.equal(span.terminatesOn, null);
});

test('the LOWEST fixed shelf is the one that carries it', () => {
  const span = partitionSpan({
    floor: 18,
    ceiling: 752,
    shelves: [
      { id: 'hi', kind: 'shelf', pos_mm: 600, variant: 'fixed' },
      { id: 'lo', kind: 'shelf', pos_mm: 300, variant: 'fixed' },
    ],
    boardT: 18,
    depth: 520,
    fullDepth: 540,
  });
  assert.equal(span.terminatesOn, 'lo');
  assert.equal(span.to, 300);
});

test('THE DEPTH FOLLOWS: shrink the shelf, the partition shrinks with it', () => {
  const at = (setback) => partitionSpan({
    floor: 18,
    ceiling: 752,
    shelves: [SHELF({ variant: 'fixed', front_mm: setback })],
    boardT: 18,
    depth: 520,
    fullDepth: 540,
  });
  assert.equal(at(0).depth, 520, 'a shelf out at the face constrains nothing');
  assert.equal(at(100).depth, 440, 'a 100 mm setback leaves 440 of the 540');
  assert.equal(at(300).depth, 240);
  // …and the partition's own front setback follows, so the 3D view and the CNC
  // sheet place it against the same face the shelf uses.
  assert.equal(at(100).front_mm, 100);
  // It is a MAXIMUM, never a stretch: a shelf that reaches further than the
  // partition's own depth does not make the partition deeper.
  assert.equal(at(0).depth, 520);
});

// ─── …and the same thing, through the engine ────────────────────────────────

test('the engine cuts the partition to what carries it', () => {
  const base = defaultParamsFor('BUDTALL', P);
  const withShelf = (variant, front) => computeCabinet({
    ...base,
    sections: [{
      width_mm: base.width,
      items: [
        { id: 'sh', kind: 'shelf', pos_mm: 800, variant, front_mm: front },
        { id: 'pt', kind: 'partition', x_mm: 291 },
      ],
    }],
  }, P).panels.find((p) => p.part === 'VPART');

  const free = withShelf('adjustable', null);
  const carried = withShelf('fixed', null);
  assert.ok(free.w > carried.w, 'a carried partition is shorter than a free one');
  assert.equal(carried.box.y + carried.box.h, 800, 'it stops at the shelf');
  assert.equal(carried.meta.terminatesOn, 'sh');
  assert.equal(free.meta.terminatesOn, null);

  // …and set the shelf back, and the partition comes back with it.
  const shallow = withShelf('fixed', 120);
  assert.ok(shallow.h < carried.h, 'the depth followed the shelf');
  assert.equal(shallow.meta.front_mm, 120);
});

test('a shelf in a bay is cut to that bay', () => {
  const base = defaultParamsFor('BUDTALL', P);
  const build = (zone) => computeCabinet({
    ...base,
    width: 900,
    sections: [{
      width_mm: 900,
      items: [
        { id: 'pt', kind: 'partition', x_mm: 441 },
        { id: 'sh', kind: 'shelf', pos_mm: 800, variant: 'adjustable', zone },
      ],
    }],
  }, P).panels.find((p) => p.id === 'SHELF-1');

  const full = build(null);
  const left = build(0);
  const right = build(1);
  assert.ok(full.w > left.w, 'a shelf told which bay is narrower than one that was not');
  assert.equal(left.w, right.w, 'two equal bays cut two equal shelves');
  assert.ok(right.box.x > left.box.x, 'and the right one starts further along');
  assert.equal(left.meta.zone, 0);
  assert.equal(full.meta.zone, null);
});

// ─── The store: Centre, delete, and which side ──────────────────────────────

test('Centre spaces the partitions into equal bays', () => {
  project();
  const { id } = store().addUnit('BUDTALL');
  store().updateUnitParams(id, { width: 900 });
  store().addPartition(id);
  store().addPartition(id);
  store().centrePartitions(id);
  const zones = store().zonesOf(id);
  assert.equal(zones.length, 3);
  const sizes = zones.map((z) => Math.round(z.size * 10) / 10);
  assert.equal(new Set(sizes).size, 1, `bays are not equal: ${sizes.join(', ')}`);
});

test('Centre on a single partition puts it in the middle', () => {
  project();
  const { id } = store().addUnit('BUDTALL');
  store().updateUnitParams(id, { width: 900 });
  store().addPartition(id);
  store().setPartitionX(id, itemsOf(id).find((i) => i.kind === 'partition').id, 100);
  store().centrePartitions(id);
  const zones = store().zonesOf(id);
  assert.equal(zones.length, 2);
  assert.equal(Math.round(zones[0].size), Math.round(zones[1].size));
});

test('Centre on a cabinet with no partitions does nothing and says so', () => {
  project();
  const { id } = store().addUnit('BUDTALL');
  assert.equal(store().centrePartitions(id), 0);
  assert.equal(store().centrePartitions('not-a-unit'), 0);
});

test('a partition can be DELETED, which is what turn 11 had no path for', () => {
  project();
  const { id } = store().addUnit('BUDTALL');
  const partId = store().addPartition(id);
  assert.ok(partId);
  assert.equal(store().zonesOf(id).length, 2);
  store().removeItem(id, partId);
  assert.equal(itemsOf(id).filter((i) => i.kind === 'partition').length, 0);
  assert.equal(store().zonesOf(id).length, 1, 'the cabinet is one bay again');
});

test('an added shelf lands in the bay it was told, and centres in THAT bay', () => {
  project();
  const { id } = store().addUnit('BUDTALL');
  store().updateUnitParams(id, { width: 900 });
  store().addPartition(id);
  store().centrePartitions(id);

  store().addShelves(id, 1, 0);
  store().addShelves(id, 1, 1);
  const shelves = itemsOf(id).filter((i) => i.kind === 'shelf');
  assert.equal(shelves.length, 2);
  assert.deepEqual(shelves.map((sh) => sh.zone).sort(), [0, 1]);
  // Each one halved its OWN bay, so both are at the same height — they are not
  // stacking against each other, which is what "centres in THAT zone" means.
  assert.equal(shelves[0].pos_mm, shelves[1].pos_mm);
});

test('with no partition nothing is asked, and the shelf is full width', () => {
  project();
  const { id } = store().addUnit('BUDTALL');
  assert.equal(store().zonesOf(id).length, 1);
  store().addShelves(id, 1);
  const [shelf] = itemsOf(id).filter((i) => i.kind === 'shelf');
  assert.equal(shelf.zone, undefined, 'no zone is written when there is no choice');
});
