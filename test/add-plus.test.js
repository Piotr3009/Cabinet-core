// ─── The "+" that adds a cabinet (turn 9, CLAUDE.md F2) ─────────────────────
//
// Turn 8 answered "adding on the left is impossible" with a three-way side
// picker in the Library panel — ◀ / auto / ▶ — and Piotr's verdict is that it
// is confusing. It asks you to describe a place in words, in a panel, before
// you have said which cabinet you mean.
//
// Turn 9 asks the other way round: every FREE END of every run carries a "+",
// and clicking it says the whole sentence at once. What is tested here is the
// arithmetic behind it — where a plus is offered and, more importantly, where
// it is NOT, because a plus in a gap no cabinet fits is an offer the placement
// refuses a moment later.
//
// The threshold is `profile.ui.addPlusMinGapMm`, and the gap is the CLEAR
// distance from the outside of the run to the next thing along: a neighbouring
// unit at the same level, or the wall.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { addPlusPoints, runEndGap, buildRuns } from '../src/engine/runs.js';
import { roomWalls, migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const MIN = P.ui.addPlusMinGapMm;
const WALL = 4000;
const walls = roomWalls(migrateRoom({ height: 2500, corners: rectCorners(WALL, 3000) }));

/** A base unit standing at x, of this width, on wall 0. */
const bud = (id, x, width = 600, extra = {}) => ({
  id,
  type: 'BUD',
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
  params: {
    width, height: 770, depth: 558, unit_num: id, leg_height: 100, ...extra,
  },
});

const wud = (id, x, width = 600) => ({
  id,
  type: 'WUD',
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
  params: {
    width, height: 720, depth: 400, unit_num: id, mount_height: 1500,
  },
});

const plusAt = (points, unitId, side) => points.find((p) => p.unitId === unitId && p.side === side);

// ─── the threshold ──────────────────────────────────────────────────────────

test('the constant is in the profile, in workshop language', () => {
  assert.equal(MIN, 100);
  // Below a scribe filler's widest gap: anything narrower than this is a
  // filler's job, not a cabinet's.
  assert.ok(MIN < P.autoParts.sideInfill.maxWidth);
});

test('a unit in open wall gets a plus on both sides', () => {
  const points = addPlusPoints([bud('A', 1000)], { walls }, P);
  assert.equal(points.length, 2);
  assert.equal(plusAt(points, 'A', 'left').gap, 1000, 'clear to the wall on the left');
  assert.equal(plusAt(points, 'A', 'right').gap, WALL - 1600, '…and to the wall on the right');
});

test('exactly at the threshold the plus is still offered', () => {
  // A move STOPS at a boundary in this app, so the boundary case is reachable
  // by dragging and has to have a definite answer. `>=` is that answer.
  const points = addPlusPoints([bud('A', MIN)], { walls }, P);
  assert.ok(plusAt(points, 'A', 'left'), `a ${MIN} mm gap is a cabinet's, just`);
  assert.equal(plusAt(points, 'A', 'left').gap, MIN);
});

test('half a millimetre under it, the plus is gone', () => {
  // 0.5 mm is the grid the whole app works to (BACKLOG #33), so this is the
  // smallest step that can exist either side of the line.
  const points = addPlusPoints([bud('A', MIN - P.editor.mmStep)], { walls }, P);
  assert.equal(plusAt(points, 'A', 'left'), undefined);
  assert.ok(plusAt(points, 'A', 'right'), 'and the far side is unaffected');
});

test('a unit hard against the wall has no plus on that side', () => {
  const points = addPlusPoints([bud('A', 0)], { walls }, P);
  assert.equal(plusAt(points, 'A', 'left'), undefined);
  assert.ok(plusAt(points, 'A', 'right'));
});

test('a unit filling the wall gets no plus at all', () => {
  const points = addPlusPoints([bud('A', 0, WALL)], { walls }, P);
  assert.deepEqual(points, []);
});

// ─── a NEIGHBOUR blocks the same way a wall does ────────────────────────────

test('two units butted together: the plus is on the outside of the pair only', () => {
  // One RUN of two cabinets, so there are two ends, not four — and the joint
  // between them is not a place a cabinet goes.
  const units = [bud('A', 1000), bud('B', 1600)];
  assert.equal(buildRuns(units, P).length, 1, 'butted units are one run');
  const points = addPlusPoints(units, { walls }, P);
  assert.equal(points.length, 2);
  assert.ok(plusAt(points, 'A', 'left'), 'the left end of the run');
  assert.ok(plusAt(points, 'B', 'right'), '…and the right end');
  assert.equal(plusAt(points, 'A', 'right'), undefined);
  assert.equal(plusAt(points, 'B', 'left'), undefined);
});

test('the gap to a NEIGHBOURING run is measured, not the gap to the wall through it', () => {
  // A: 0…600.  B: 900…1500.  The 300 mm between them is a cabinet's gap; the
  // 2500 mm of clear wall to B's right is a different question.
  const units = [bud('A', 0), bud('B', 900)];
  assert.equal(buildRuns(units, P).length, 2, 'a 300 mm gap breaks the run');
  const points = addPlusPoints(units, { walls }, P);
  assert.equal(plusAt(points, 'A', 'right').gap, 300);
  assert.equal(plusAt(points, 'B', 'left').gap, 300);
  assert.equal(plusAt(points, 'B', 'right').gap, WALL - 1500);
  assert.equal(plusAt(points, 'A', 'left'), undefined, 'A is on the wall');
});

test('a neighbour 60 mm away closes the plus on BOTH facing sides', () => {
  const units = [bud('A', 0), bud('B', 660)];
  const points = addPlusPoints(units, { walls }, P);
  assert.equal(plusAt(points, 'A', 'right'), undefined);
  assert.equal(plusAt(points, 'B', 'left'), undefined);
  assert.ok(plusAt(points, 'B', 'right'), 'the open end is still open');
});

test("an END PANEL is part of the unit, so it eats into the gap", () => {
  // The unit is 0…600 and carries an 18 mm masking panel on its right, so its
  // real footprint is 0…618. A gap measured to the CARCASS would offer the
  // 18 mm the panel is already standing in.
  const bare = bud('A', 0);
  const withPanel = bud('A', 0, 600, { end_panels: [{ id: 'ep', side: 'R', thickness: 18 }] });
  const gapOf = (u) => addPlusPoints([u, bud('B', 718)], { walls }, P);
  assert.equal(plusAt(gapOf(bare), 'A', 'right').gap, 118);
  assert.equal(plusAt(gapOf(withPanel), 'A', 'right').gap, 100);
});

// ─── levels do not block each other ─────────────────────────────────────────

test('a wall unit does not close the gap beside a base unit', () => {
  // They occupy different bands of the same wall. A base unit can slide under a
  // wall unit and always could — the placement has said so since turn 3.
  const units = [bud('A', 0), wud('W', 660)];
  const points = addPlusPoints(units, { walls }, P);
  assert.equal(plusAt(points, 'A', 'right').gap, WALL - 600, 'clear to the wall, past the wall unit');
  assert.equal(plusAt(points, 'W', 'left').gap, 660);
});

// ─── the raw gap, on its own ────────────────────────────────────────────────

test('runEndGap reports WHERE the gap is, not only how big', () => {
  const units = [bud('A', 800), bud('B', 2000)];
  const [runA] = buildRuns(units, P).filter((r) => r.units[0].id === 'A');
  const right = runEndGap(runA, 'right', { wallWidth: WALL, others: units });
  assert.equal(right.from, 1400, 'from the outside of A');
  assert.equal(right.to, 2000, '…to the outside of B');
  assert.equal(right.gap, 600);
  assert.equal(right.unit.id, 'A', 'and it names the unit the plus hangs off');

  const left = runEndGap(runA, 'left', { wallWidth: WALL, others: units });
  assert.equal(left.from, 0, 'nothing to the left, so the wall');
  assert.equal(left.gap, 800);
});

test('an empty project offers nothing to add beside', () => {
  assert.deepEqual(addPlusPoints([], { walls }, P), []);
});

test('a TURNED unit is not part of any run, and offers no plus', () => {
  // `buildRuns` skips a rotated unit: it has no "along the wall" to share, so
  // it has no left-hand or right-hand end in the run's sense either.
  const turned = { ...bud('T', 1000), position: { wall: 0, x_mm: 1000, rotation_deg: 90 } };
  assert.deepEqual(addPlusPoints([turned], { walls }, P), []);
});

// ─── the click, all the way through ─────────────────────────────────────────
//
// The plus does not place anything itself: it carries `{ near, side }` to
// `projectStore.addUnit`, which is turn 8's insertion, unchanged. This phase
// changed the TRIGGER, not the mechanics — so what is checked here is that the
// place a plus names really does decide where the cabinet lands.

test('a plus on the LEFT puts the new unit on the left — the bug turn 8 opened', () => {
  const store = useProjectStore.getState();
  store.loadProject({
    id: null,
    name: 'plus',
    room: migrateRoom({ height: 2500, corners: rectCorners(WALL, 3000) }),
    design: {},
  }, []);

  const { id: first } = store.addUnit('BUD');
  const anchor = useProjectStore.getState().units.find((u) => u.id === first);
  const before = anchor.position.x_mm;

  const points = addPlusPoints(
    useProjectStore.getState().units,
    { walls: roomWalls(useProjectStore.getState().project.room) },
    P,
  );
  const left = points.find((p) => p.side === 'left');
  assert.ok(left, 'a unit centred on an empty wall has room on its left');
  assert.equal(left.unitId, first);

  const { id: second, error } = useProjectStore.getState()
    .addUnit('BUD', { near: left.unitId, side: left.side });
  assert.equal(error, null);

  const added = useProjectStore.getState().units.find((u) => u.id === second);
  assert.ok(added.position.x_mm < before, 'it landed to the LEFT of the one clicked');
  assert.ok(added.position.x_mm + added.params.width <= before + 1e-6, 'and not on top of it');
});

test('…and the plus disappears from a side once the gap has been used up', () => {
  const store = () => useProjectStore.getState();
  // A wall a 600 cabinet leaves 50 mm either side of: real, and reachable —
  // it is the top of a bathroom vanity run.
  const narrow = roomWalls(migrateRoom({ height: 2500, corners: rectCorners(700, 3000) }));
  store().loadProject({
    id: null,
    name: 'plus',
    room: migrateRoom({ height: 2500, corners: rectCorners(700, 3000) }),
    design: {},
  }, []);
  const { id } = store().addUnit('BUD');
  const placed = store().units.find((u) => u.id === id);
  assert.equal(placed.params.width, 600);

  const points = addPlusPoints(store().units, { walls: narrow }, P);
  assert.deepEqual(points, [], '50 mm either side is a scribe filler, not a cabinet');
});

test('a gap that HAS been filled stops offering itself', () => {
  // A 600 unit at 0 and a 4000 wall: the right-hand plus is offered, a cabinet
  // is added there, and the plus between the two is gone — there is no gap
  // left, because the new one butted onto its neighbour.
  const before = addPlusPoints([bud('A', 0)], { walls }, P);
  assert.ok(plusAt(before, 'A', 'right'), 'clear wall to the right');

  const after = addPlusPoints([bud('A', 0), bud('B', 600)], { walls }, P);
  assert.equal(plusAt(after, 'A', 'right'), undefined, 'nothing goes between them now');
  assert.ok(plusAt(after, 'B', 'right'), 'and the run has grown a new free end');
});
