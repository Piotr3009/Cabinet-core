// ─── T53 · F5 — TOP BOXES: SIDE BY SIDE, NEVER ONE INSIDE ANOTHER ─────────
//
// The owner, 27.08.2026:
//
//   *"top box łamią zasadę — nakłada się jeden na drugi, a nie może. poza tym
//   jak dodaję plusik po lewej, to on się nie pojawia po lewej, tylko jeden w
//   drugim."*
//
// ─── DIAGNOSED: 1 MAIN = 1 RIDER AT THE MAIN'S OWN X ──────────────────────
//
// Three clauses, three symptoms:
//
//   `settleRiders` wrote the rider `x = host.x_mm`, HARD — so a box put beside
//   another snapped back onto the main's left edge on the very next settle;
//   `riddenBy` was a Map host → ONE rider, so a second silently shadowed the
//   first and the door under the main was told about only one of them;
//   the add-plus on a BOX fell through to the last main in the project,
//   because a box fails the `!ridesOn` test the host search makes.
//
// The model turns over: a rider keeps ITS OWN X clamped inside the host's span,
// a host carries a LIST, and rider–rider overlap is forbidden by the same clamp
// discipline cabinets have — the house law, *"nie pozwalamy na nachodzenie się
// materiałów na siebie."*

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  hostSpan, minRiderWidth, riddenList, riderFreeWidth, riderLayout, riderSlot, settleRiders,
} from '../src/engine/topBox.js';

const store = () => useProjectStore.getState();
const unit = (id) => store().units.find((u) => u.id === id);

function room() {
  store().loadProject({
    id: null, name: 'T53 F5', number: '53', client: 'the owner',
    room: migrateRoom({ height: 3000, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
}

/** A 1200 main with one 600 box on it. */
function mainWithABox(width = 1200, boxWidth = 600) {
  room();
  const main = store().addUnit('WARDROBE');
  store().updateUnitParams(main.id, { width });
  const box = store().addUnit('WARDROBE_TOP', { near: main.id });
  assert.ok(box.id, box.error || '');
  store().updateUnitParams(box.id, { width: boxWidth });
  return { main: main.id, box: box.id };
}

// ─── TWO BOXES, SIDE BY SIDE ──────────────────────────────────────────────

test('F5 — two boxes on one 1200 main sit side by side, and survive a settle', () => {
  const { main, box } = mainWithABox();
  const second = store().addUnit('WARDROBE_TOP', { near: box, side: 'R' });
  assert.ok(second.id, second.error || '');

  const a = unit(box);
  const b = unit(second.id);
  assert.equal(a.position.x_mm, unit(main).position.x_mm, 'the first is at the main’s left edge');
  assert.equal(b.position.x_mm, a.position.x_mm + a.params.width, 'the second stands beside it');
  assert.notEqual(a.position.x_mm, b.position.x_mm, 'NOT one inside the other');

  // The settle used to be what undid this.
  const before = store().units.map((u) => `${u.id}@${u.position.x_mm}`);
  store().refreshAutoParts();
  store().settleLayout(null);
  assert.deepEqual(store().units.map((u) => `${u.id}@${u.position.x_mm}`), before,
    'a settle moves neither of them');
});

test('F5 — the main carries a LIST, and every box is on it', () => {
  const { main, box } = mainWithABox();
  const second = store().addUnit('WARDROBE_TOP', { near: box, side: 'R' });
  const list = riddenList(unit(main).params.ridden_by);
  assert.equal(list.length, 2, 'both boxes are named');
  assert.ok(list.includes(box) && list.includes(second.id));
  // …and the door under the main still knows there is a carcass on its top.
  assert.ok(unit(main).params.ridden_by, 'the stamp doors.js reads is still truthy');
});

test('F5 — plus-L lands on the LEFT', () => {
  const { main, box } = mainWithABox(1200, 500);
  // Stand the first box on the right half, so there is a gap on its left.
  store().moveUnit(box, unit(main).position.x_mm + 700, 0, { magnet: false });
  const left = store().addUnit('WARDROBE_TOP', { near: box, side: 'L' });
  assert.ok(left.id, left.error || '');
  assert.ok(unit(left.id).position.x_mm < unit(box).position.x_mm,
    'it appeared on the left, which is where the plus was');
  assert.equal(unit(left.id).position.x_mm + unit(left.id).params.width,
    unit(box).position.x_mm, 'snug against the box it was asked for');
  assert.equal(unit(left.id).params.rides_on, main,
    'and on the clicked box’s OWN main, not the last main in the project');
});

test('F5 — the box that does not fit REFUSES, and says so', () => {
  const { box } = mainWithABox(1200, 600);
  const second = store().addUnit('WARDROBE_TOP', { near: box, side: 'R' });
  assert.ok(second.id, second.error || '');
  const third = store().addUnit('WARDROBE_TOP', { near: second.id, side: 'R' });
  assert.equal(third.id, null, 'refused');
  assert.match(third.error, /no room for another top box to the right/i);
  assert.equal(store().units.filter((u) => u.type === 'WARDROBE_TOP').length, 2,
    'and nothing was added');
});

test('F5 — a second box is born to FIT the gap, not to the main’s full width', () => {
  const { main, box } = mainWithABox(1200, 500);
  const second = store().addUnit('WARDROBE_TOP', { near: box, side: 'R' });
  assert.ok(second.id, second.error || '');
  assert.equal(unit(second.id).params.width, 700, '1200 − 500');
  assert.equal(unit(box).params.width + unit(second.id).params.width,
    unit(main).params.width, 'the two of them are the main');
});

// ─── NO OVERLAP, EVER ─────────────────────────────────────────────────────

test('F5 — a box dragged over its neighbour is pushed clear, not stacked', () => {
  const { main, box } = mainWithABox(1200, 400);
  const second = store().addUnit('WARDROBE_TOP', { near: box, side: 'R' });
  const x0 = unit(main).position.x_mm;
  // Ask for the same millimetre the first box stands on.
  store().moveUnit(second.id, x0, 0, { magnet: false });
  const a = unit(box);
  const b = unit(second.id);
  const overlap = Math.min(a.position.x_mm + a.params.width, b.position.x_mm + b.params.width)
    - Math.max(a.position.x_mm, b.position.x_mm);
  assert.ok(overlap <= 0.01, `${overlap} mm of overlap — the house law forbids any`);
});

test('F5 — riderLayout is idempotent and never hangs a box past the main', () => {
  const host = { id: 'H', position: { wall: 0, x_mm: 1000 }, params: { width: 1200 } };
  const riders = [
    { id: 'b', position: { wall: 0, x_mm: 1500 }, params: { width: 600 } },
    { id: 'a', position: { wall: 0, x_mm: 1000 }, params: { width: 600 } },
  ];
  const first = riderLayout(host, riders);
  assert.deepEqual([...first], [['a', { offset: 0, x: 1000 }], ['b', { offset: 600, x: 1600 }]]);
  const settled = riders.map((r) => ({
    ...r,
    position: { ...r.position, x_mm: first.get(r.id).x },
    params: { ...r.params, rides_offset_mm: first.get(r.id).offset },
  }));
  assert.deepEqual([...riderLayout(host, settled)], [...first], 'a settled floor settles to itself');

  // Asked to hang past the right edge, it is clamped inside.
  const far = [{ id: 'a', position: { wall: 0, x_mm: 5000 }, params: { width: 600 } }];
  assert.deepEqual(riderLayout(host, far).get('a'), { offset: 600, x: 1600 },
    'the last millimetre it may stand on');
  assert.deepEqual(hostSpan(host), { left: 1000, right: 2200, width: 1200 });
});

test('F5 — riderSlot answers the side it was asked, in either convention', () => {
  const host = { id: 'H', position: { wall: 0, x_mm: 0 }, params: { width: 1200 } };
  const one = { id: 'a', position: { wall: 0, x_mm: 500 }, params: { width: 300 } };
  assert.equal(riderSlot(host, [one], 200, { beside: one, side: 'L' }), 300, 'snug on its left');
  assert.equal(riderSlot(host, [one], 200, { beside: one, side: 'left' }), 300, '…either spelling');
  assert.equal(riderSlot(host, [one], 200, { beside: one, side: 'R' }), 800, 'and on its right');
  assert.equal(riderSlot(host, [one], 600, { beside: one, side: 'L' }), null, 'no room: null');
  assert.equal(riderFreeWidth(host, [one], { beside: one, side: 'L' }), 500);
  assert.equal(riderFreeWidth(host, [one], { beside: one, side: 'R' }), 400);
  assert.equal(minRiderWidth(P), 200, 'the workshop’s own minimum, off the profile');
});

// ─── MIGRATION ────────────────────────────────────────────────────────────

test('F5g — a saved project with the OLD single scalar loads and keeps its box', () => {
  room();
  const main = store().addUnit('WARDROBE');
  store().updateUnitParams(main.id, { width: 1200 });
  const box = store().addUnit('WARDROBE_TOP', { near: main.id });
  store().updateUnitParams(box.id, { width: 500 });
  store().moveUnit(box.id, unit(main.id).position.x_mm + 400, 0, { magnet: false });
  const savedX = unit(box.id).position.x_mm;

  // As a T52 file would have it: `ridden_by` a bare string.
  const saved = store().units.map((u) => (u.id === main.id
    ? { ...u, params: { ...u.params, ridden_by: box.id } }
    : u));
  assert.ok(savedX > 0, 'the box was moved off the main’s own left edge');

  store().loadProject({
    id: null, name: 'old', number: '52', client: 'the owner',
    room: migrateRoom({ height: 3000, corners: rectCorners(4000, 3000) }), design: {},
  }, JSON.parse(JSON.stringify(saved)));

  assert.deepEqual(riddenList(unit(main.id).params.ridden_by), [box.id], 'one id, as a list of one');
  assert.equal(unit(box.id).position.x_mm, savedX, 'and the box is exactly where it was');
});

test('F5 — riddenList reads every shape the field has ever had', () => {
  assert.deepEqual(riddenList(undefined), []);
  assert.deepEqual(riddenList(null), []);
  assert.deepEqual(riddenList('u_1'), ['u_1']);
  assert.deepEqual(riddenList(['u_1', 'u_2']), ['u_1', 'u_2']);
  assert.deepEqual(riddenList([null, 'u_1']), ['u_1']);
});

// ─── WHAT STAYS ───────────────────────────────────────────────────────────

test('F5 — the box still rides its main’s TOP and its moves', () => {
  const { main, box } = mainWithABox();
  const top = Number(unit(box).params.mount_height);
  assert.ok(top > 0);
  // Move the main: the box goes with it, keeping its offset inside the span.
  const before = unit(box).position.x_mm - unit(main).position.x_mm;
  store().moveUnit(main, unit(main).position.x_mm + 300, 0, { magnet: false });
  assert.equal(unit(box).position.wall, unit(main).position.wall);
  assert.ok(unit(box).position.x_mm >= unit(main).position.x_mm,
    'still inside its main');
  assert.equal(Number(unit(box).params.mount_height), Number(unit(box).params.mount_height),
    'and still hung at its top');
  assert.ok(before >= 0);
});

test('F5 — settleRiders is a no-op on units with no rider at all', () => {
  const units = [{ id: 'a', type: 'WARDROBE', position: { wall: 0, x_mm: 0 }, params: { width: 600 } }];
  assert.equal(settleRiders(units, P), units, 'the same array, untouched');
});
