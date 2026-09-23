// ─── TURN 74 · F11 · PULLING AWAY UNDOES WHAT PUSHING IN DID ───────────────
//
// The owner, 23.09.2026 (list point 10):
//
//   *"dosunięcie szafy do ściany narożnej zmienia orientację drzwi i dokłada
//   panel (perfekcyjnie), ale po odsunięciu nic nie wraca: drzwi nie wracają
//   na oryginalną stronę, panel/divider nie znika. Brak odwrócenia operacji."*
//
// The probe (`verify/t74/f11-probe.md`, a real drag in and out, committed
// before the fix): the corner rule is T55 F3's `settleSlopeDoorPartitions`
// under the slope on the corner wall. It flipped the right door to the left,
// added the door partition, cleared the interior, and kept no record, so the
// drag back undid nothing. The end-panel automat on the same move already
// reversed, because it marks its own work: the fix copies that.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

function corner() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const id = A.addFirstWardrobe();
  S().setWallSlopes([{ wall: 0, side: 'right', startHeight: 1800, run: 900, kind: 'slope' }]);
  return id;
}
const unitOf = (id) => S().units.find((u) => u.id === id);
const hands = (id) => S().unitResult(id).panels.filter((p) => p.part === 'FRONT').map((p) => p.meta.hinge);
const partitions = (id) => (unitOf(id).params.sections[0].items || []).filter((i) => i.kind === 'partition');

test('T74 F11 · pushed in, the rule does its work, and writes down what it did', () => {
  const id = corner();
  assert.deepEqual(hands(id), ['L', 'R'], 'the wardrobe starts as a pair, left and right');
  S().moveUnit(id, 4000, 0);
  assert.deepEqual(hands(id), ['L', 'L'], 'the slope did not flip the right door');
  assert.equal(partitions(id).length, 1, 'no door partition was added');
  const rec = unitOf(id).params.slope_door_auto;
  assert.ok(rec, 'no record of what the automat did');
  assert.equal(rec.doors, true, 'the doors before the push are not recorded');
  assert.equal(rec.partition.added, true);
  assert.deepEqual(rec.wrote, unitOf(id).params.bay_doors);
});

test('T74 F11 · pulled away, the doors return to their sides and the divider goes', () => {
  const id = corner();
  S().moveUnit(id, 4000, 0);
  S().moveUnit(id, 0, 0);
  assert.deepEqual(hands(id), ['L', 'R'], 'the doors did not return to their original sides');
  assert.equal(partitions(id).length, 0, 'the divider the slope added is still there');
  assert.equal(unitOf(id).params.doors, true);
  assert.equal(unitOf(id).params.bay_doors ?? null, null, 'the bay doors were not taken back to what they were');
  assert.equal(unitOf(id).params.slope_door_auto, undefined, 'the record outlived its reason');
  // …and pushing in again does it again, cleanly.
  S().moveUnit(id, 4000, 0);
  assert.deepEqual(hands(id), ['L', 'L']);
  assert.equal(partitions(id).length, 1);
});

test('T74 F11 · the slope removed is the same as pulled away', () => {
  const id = corner();
  S().moveUnit(id, 4000, 0);
  S().setWallSlopes([]);
  S().refreshAutoParts();
  assert.deepEqual(hands(id), ['L', 'R']);
  assert.equal(partitions(id).length, 0);
});

test('T74 F11 · only what the AUTOMAT did is undone: a door the client re-hung stays, and its partition with it', () => {
  const id = corner();
  S().moveUnit(id, 4000, 0);
  S().setBayDoor(id, 0, { door: 'one', hinge: 'R' });
  S().moveUnit(id, 0, 0);
  assert.equal(unitOf(id).params.bay_doors[0].hinge, 'R', 'the client\'s own hand was undone');
  assert.equal(partitions(id).length, 1, 'the partition the client\'s door hangs on was taken away');
  assert.equal(unitOf(id).params.slope_door_auto, undefined);
});

test('T74 F11 · a partition moved by hand is the client\'s: it stays, the doors come back', () => {
  const id = corner();
  S().moveUnit(id, 4000, 0);
  const [p] = partitions(id);
  S().setPartitionX(id, p.id, Number(p.x_mm) - 200);
  S().moveUnit(id, 0, 0);
  assert.equal(partitions(id).length, 1, 'the client\'s divider was taken away');
});

test('T74 F11 · a wardrobe the slope never touched carries no record and no bay doors', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const id = A.addFirstWardrobe();
  S().moveUnit(id, 800, 0);
  assert.equal(unitOf(id).params.slope_door_auto, undefined);
  assert.equal(unitOf(id).params.bay_doors ?? null, null);
});

test('T74 F11 · one sweep, one record: the undo lives in the corner rule\'s own sweep', () => {
  const src = read('src/stores/projectStore.js');
  const sweep = src.slice(src.indexOf('settleSlopeDoorPartitions: () => {'), src.indexOf('undoSlopeDoorFlip: (unitId, record) => {'));
  assert.match(sweep, /if \(record && leaves\.length === 0\) \{\s*runBatch\(\(\) => get\(\)\.undoSlopeDoorFlip\(unit\.id, record\)\);/);
  assert.match(sweep, /slope_door_auto: next/);
  // T55's own words are kept: the classifier of that turn greps them.
  assert.match(src, /settleSlopeDoorPartitions/);
});
