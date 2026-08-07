// ─── Deliberate clearances (turn 7, CLAUDE.md F5 / BACKLOG #32) ───
//
// A joiner insets a cabinet when something that is not furniture is in the way:
// a soil pipe in the corner, a wall that bows, a radiator bracket. The gap is
// not a mistake to be tidied up — it is the whole point — and the collision
// clamp has to treat it exactly as it treats a neighbour, or the first drag
// closes the gap the pipe is standing in.
//
// So this is a test of the CLAMPING FUNCTIONS, which is what CLAUDE.md asks
// for: the slot shrinks by the inset, the depth shrinks by the back inset, the
// unit around the corner is measured where it really stands, and the distance
// arrows read the real distance rather than the one the unit would be at if it
// were pushed back against the wall.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  clampUnitDepth, clampUnitWidth, clampUnitX, footprintPads, insetPads,
  unitFootprint, unitPlanSpan, unitSpan, wallObstacles,
} from '../src/engine/collision.js';
import { roomWalls, rectCorners } from '../src/engine/room.js';
import { wallDistances } from '../src/engine/dimensions.js';

const room = { height: 2500, corners: rectCorners(4000, 3000), openings: [] };
const walls = roomWalls(room);
const wall = walls[0];

const unit = (params = {}, position = {}) => ({
  id: 'u1',
  type: 'BUD',
  position: { wall: 0, x_mm: 1000, rotation_deg: 0, ...position },
  params: { unit_num: '01', width: 600, height: 770, depth: 558, front_t: 25, ...params },
});

// ─── the pads ───────────────────────────────────────────────────────────────

test('an inset is read off the unit, and never negative', () => {
  assert.deepEqual(insetPads(unit()), { left: 0, right: 0, back: 0 });
  assert.deepEqual(
    insetPads(unit({ inset_left_mm: 40, inset_right_mm: 12.5, inset_back_mm: 60 })),
    { left: 40, right: 12.5, back: 60 },
  );
  assert.deepEqual(insetPads(unit({ inset_left_mm: -40 })), { left: 0, right: 0, back: 0 },
    'a negative clearance is not a thing a joiner can ask for');
  assert.deepEqual(insetPads(null), { left: 0, right: 0, back: 0 });
});

test('an end panel and an inset ADD — the panel is against the carcass, the gap is outside it', () => {
  const both = unit({
    inset_left_mm: 40,
    end_panels: [{ id: 'ep', side: 'L', height: 'floor', thickness: 18 }],
  });
  assert.equal(footprintPads(both, 25).left, 58, 'one panel plus one gap');
  assert.equal(footprintPads(both, 25).right, 0);
});

test('the unit’s footprint on the wall grows by its insets', () => {
  const plain = unitSpan(unit());
  assert.deepEqual(plain, { left: 1000, right: 1600 });

  const inset = unitSpan(unit({ inset_left_mm: 40, inset_right_mm: 25 }));
  assert.deepEqual(inset, { left: 960, right: 1625 }, 'nobody may stand in either gap');
});

// ─── the slot the unit may slide in ─────────────────────────────────────────

test('a neighbour’s inset shrinks the slot, and the move STOPS there', () => {
  // A unit at 1600 with a 40 mm left inset: nothing may come nearer than 1560.
  const neighbour = unitSpan(unit({ inset_left_mm: 40 }, { x_mm: 1600 }));
  const others = [{ left: neighbour.left, right: neighbour.right, label: '02' }];

  const dragged = clampUnitX({
    x: 1400, current: 800, width: 600, wallWidth: wall.width, others,
  }, P);
  assert.equal(dragged.x, 960, 'it stops 40 mm short — the gap the pipe is in');
  assert.equal(dragged.blocked, false, 'a stop is not a refusal');

  // …and it stays there however far the cursor keeps going.
  assert.equal(clampUnitX({ x: 9999, current: 800, width: 600, wallWidth: wall.width, others }, P).x, 960);

  // Without the inset the same drag butts right up against the neighbour.
  const flush = unitSpan(unit({}, { x_mm: 1600 }));
  assert.equal(
    clampUnitX({ x: 1400, current: 800, width: 600, wallWidth: wall.width, others: [{ left: flush.left, right: flush.right }] }, P).x,
    1000,
  );
});

test('a unit’s OWN inset stops it short of its neighbour too', () => {
  const neighbour = [{ left: 1600, right: 2200, label: '02' }];
  // The moving unit is 600 wide with a 40 mm right inset, so its footprint is
  // 640 and it is dragged as that.
  const me = unit({ inset_right_mm: 40 }, { x_mm: 800 });
  const pad = footprintPads(me, me.params.front_t);
  const span = unitSpan(me);
  const lead = span.left - me.position.x_mm;
  const result = clampUnitX({
    x: 1400 + lead,
    current: me.position.x_mm + lead,
    width: span.right - span.left,
    wallWidth: wall.width,
    others: neighbour,
  }, P);
  assert.equal(pad.right, 40);
  assert.equal(result.x - lead, 960, 'the carcass stops 40 mm short of the neighbour');
});

test('growing a unit stops at its own right-hand inset', () => {
  const clamp = clampUnitWidth({
    width: 1200,
    x: 1000,
    wallWidth: wall.width,
    others: [{ left: 1800, right: 2400, label: '02' }],
    padRight: footprintPads(unit({ inset_right_mm: 50 }), 25).right,
  }, P);
  assert.equal(clamp.width, 750, 'the far edge stops 50 mm before the neighbour');
  assert.equal(clamp.blocked, true);
  assert.equal(clamp.by, '02');
});

// ─── the back inset ─────────────────────────────────────────────────────────

test('a back inset stands the unit off the wall, in plan', () => {
  const flat = unitPlanSpan({ wall, x: 1000, width: 600, depth: 558 });
  assert.equal(flat.near, 0);
  assert.equal(flat.far, 558);

  const off = unitPlanSpan({ wall, x: 1000, width: 600, depth: 558, backInset: 60 });
  assert.equal(off.near, 60, 'it starts 60 mm into the room');
  assert.equal(off.far, 618, '…and reaches 60 mm further in');
  assert.equal(off.left, flat.left, 'and not a millimetre sideways');
});

test('a back inset costs the unit that much depth, and the clamp says so', () => {
  const flat = clampUnitDepth({ depth: 4000, x: 1000, width: 600, wall, walls }, P);
  assert.equal(flat.depth, 3000, 'the room is 3000 deep');

  const off = clampUnitDepth({ depth: 4000, x: 1000, width: 600, wall, walls, backInset: 60 }, P);
  assert.equal(off.depth, 2940, 'standing 60 mm off the wall leaves 60 mm less');
  assert.equal(off.blocked, true);
  assert.match(off.by, /back inset/, 'and it names what took the room');
});

test('a unit round the corner blocks the stretch of wall it really stands on', () => {
  // A unit on wall 1 — the right-hand wall — reaching into wall 0's depth band.
  // That is the corner case, in both senses.
  const other = { wall: 1, x_mm: 0, width: 600, depth: 600, rotation: 0, label: 'C1' };

  const flat = wallObstacles({ wall, walls, depth: 558, others: [other] });
  assert.equal(flat.length, 1, 'it is in the corner and in the way');
  assert.equal(flat[0].corner, true);
  assert.deepEqual([flat[0].left, flat[0].right], [3400, 4000], 'the last 600 mm of wall 0');

  // Stand it off ITS wall, and the stretch of wall 0 it occupies MOVES — 700 mm
  // along, because wall 1's inward direction is wall 0's along direction. A
  // clamp that measured it where it was pushed back would stop a unit 700 mm
  // from where the obstacle really is.
  const off = wallObstacles({ wall, walls, depth: 558, others: [{ ...other, backInset: 700 }] });
  assert.equal(off.length, 1);
  assert.deepEqual([off[0].left, off[0].right], [2700, 3300]);
});

test('a footprint with a back inset is the same rectangle, moved', () => {
  const flat = unitFootprint({ wall, x: 0, width: 600, depth: 500 });
  const off = unitFootprint({ wall, x: 0, width: 600, depth: 500, backInset: 100 });
  for (let i = 0; i < 4; i += 1) {
    const moved = Math.hypot(off[i].x - flat[i].x, off[i].y - flat[i].y);
    assert.ok(Math.abs(moved - 100) < 1e-9, 'every corner moved 100 mm, and only into the room');
  }
});

// ─── the arrows ─────────────────────────────────────────────────────────────

test('the distance arrows read the REAL gap, not the shrunken slot', () => {
  // Two units butted as close as their insets allow: 02 has a 40 mm left inset,
  // so it stands at 1640 with 01 finishing at 1600.
  const marks = wallDistances({
    wall,
    units: [
      { id: 'a', x_mm: 1000, width: 600, depth: 558, rotation: 0, label: '01', y: 100 },
      { id: 'b', x_mm: 1640, width: 600, depth: 558, rotation: 0, label: '02', y: 100 },
    ],
    minGap: P.dimensions.minGap,
  });
  const between = marks.find((m) => m.kind === 'unit');
  assert.ok(between, 'there IS a gap between them, and it is worth an arrow');
  assert.equal(between.mm, 40, 'the arrow says 40 — what a tape would read');
  assert.deepEqual(between.between, ['01', '02']);
});

test('an arrow is drawn clear of a unit standing off the wall', () => {
  const marks = wallDistances({
    wall,
    units: [
      { id: 'a', x_mm: 200, width: 600, depth: 558, rotation: 0, backInset: 0, label: '01', y: 100 },
      { id: 'b', x_mm: 1200, width: 600, depth: 558, rotation: 0, backInset: 120, label: '02', y: 100 },
    ],
    minGap: P.dimensions.minGap,
  });
  const between = marks.find((m) => m.kind === 'unit');
  assert.equal(between.mm, 400, 'the gap along the wall is unchanged by a back inset');
  assert.equal(between.depth, 678, 'but the line clears the deeper of the two, where it really is');
});

// ─── the case a browser found ───────────────────────────────────────────────

test('WHICH side an obstacle is on is decided on the carcass, not on the padded span', () => {
  // The bug this pins, found by the turn-7 end-to-end run: two units butted at
  // 2300, then the right-hand one is given a 40 mm left inset. Its padded span
  // now starts at 2260 — INSIDE the neighbour — and any search that asks "which
  // obstacles finish before my span starts" finds none, falls back to the wall,
  // and reports 2260 mm of clear space beside a unit that is standing in
  // something. The inset was recorded and no gap opened.
  //
  // The fix is one line and this is the shape of it: the SIDE comes from the
  // carcass, the DISTANCE from the padded span.
  const me = unit({ inset_left_mm: 40 }, { x_mm: 2300 });
  const neighbour = { left: 1700, right: 2300, label: '01' };
  const span = unitSpan(me);
  const carcass = { left: me.position.x_mm, right: me.position.x_mm + me.params.width };

  assert.equal(span.left, 2260, 'the padded span starts inside the neighbour');
  assert.ok(!(neighbour.right <= span.left), 'so a span-based side test loses it');
  assert.ok(neighbour.right <= carcass.left, '…and a carcass-based one does not');

  // Measured properly, the answer is the overlap: −40, which is exactly how far
  // the unit has to move for the gap to be real.
  assert.equal(span.left - neighbour.right, -40);
});

// ─── the limit ──────────────────────────────────────────────────────────────

test('there is a limit, and it is in the profile', () => {
  assert.ok(Number(P.editor.maxInset) > 0);
  assert.ok(P.editor.maxInset >= P.autoParts.sideInfill.maxWidth,
    'an inset is at least as big as the widest thing the app will scribe with — below that, use a filler');
});
