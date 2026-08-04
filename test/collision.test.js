// ─── Collision clamp tests ───
//
// The rule under test is "a move STOPS at the boundary". These are the edge
// cases that a browser click-test will never reliably reproduce: zero
// clearance, elements already touching, a drag that outruns the cursor and
// tries to travel far past a neighbour, and a slot with no room at all.
//
// Everything here is pure arithmetic on the profile's clearances — if a
// clearance changes, these tests change with it, because they read the profile
// rather than restating its numbers.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE, migrateCabinetProfile } from '../src/engine/profile.js';
import {
  clampShelfPos, clampUnitX, firstFreeUnitX, shelfBand, shelfBounds, unitIssues, unitSpan,
} from '../src/engine/collision.js';

const P = DEFAULT_CABINET_PROFILE;
const GAP = P.editor.minShelfGap;
const EDGE = P.editor.minShelfEdgeGap;
const MAGNET = P.editor.unitMagnet;

const band = (opts = {}) => shelfBand({ height: 2150, boardT: 18, floorY: null, ...opts }, P);

// ─── shelf band ───

test('the shelf band is the clear space between the base and the top', () => {
  const b = band();
  assert.equal(b.floor, 18);                 // top face of the base panel
  assert.equal(b.ceiling, 2150 - 18);        // underside of the top panel
  assert.equal(b.min, 18 + EDGE);
  assert.equal(b.max, 2150 - 18 - EDGE);
});

test('a drawer stack raises the floor the shelves stand on', () => {
  const b = band({ floorY: 444 });           // partition top for a 2-drawer stack
  assert.equal(b.floor, 444);
  assert.equal(b.min, 444 + EDGE);
  assert.equal(b.max, 2150 - 18 - EDGE);
});

// ─── shelf ↔ top / bottom ───

test('a shelf dragged at the top panel stops at the minimum clearance', () => {
  const b = band();
  const r = clampShelfPos({ pos: 99999, current: 1000, others: [], band: b }, P);
  assert.equal(r.pos, b.max);
  assert.equal(r.blocked, false);
});

test('a shelf dragged at the base stops at the minimum clearance', () => {
  const b = band();
  assert.equal(clampShelfPos({ pos: -5000, current: 1000, others: [], band: b }, P).pos, b.min);
});

test('a shelf dragged into the drawer zone stops on top of the partition', () => {
  const b = band({ floorY: 444 });
  const r = clampShelfPos({ pos: 100, current: 900, others: [], band: b }, P);
  assert.equal(r.pos, 444 + EDGE);
  assert.ok(r.pos > 444, 'never inside the drawer stack');
});

// ─── shelf ↔ shelf ───

test('a shelf stops one minimum gap short of the shelf above it', () => {
  const b = band();
  const r = clampShelfPos({ pos: 1400, current: 800, others: [1000], band: b }, P);
  assert.equal(r.pos, 1000 - GAP);
  assert.equal(r.max, 1000 - GAP);
});

test('a shelf stops one minimum gap above the shelf below it', () => {
  const b = band();
  const r = clampShelfPos({ pos: 400, current: 1200, others: [1000], band: b }, P);
  assert.equal(r.pos, 1000 + GAP);
});

test('a shelf between two neighbours is trapped between both gaps', () => {
  const b = band();
  const bounds = shelfBounds({ pos: 1000, others: [800, 1200], band: b }, P);
  assert.equal(bounds.min, 800 + GAP);
  assert.equal(bounds.max, 1200 - GAP);
  assert.equal(clampShelfPos({ pos: 5000, current: 1000, others: [800, 1200], band: b }, P).pos, 1200 - GAP);
  assert.equal(clampShelfPos({ pos: -5000, current: 1000, others: [800, 1200], band: b }, P).pos, 800 + GAP);
});

test('zero clearance: shelves already exactly one gap apart cannot close further', () => {
  const b = band();
  const others = [1000, 1000 + GAP * 2];
  const pos = 1000 + GAP;                       // sitting on both limits at once
  const bounds = shelfBounds({ pos, others, band: b }, P);
  assert.equal(bounds.min, pos);
  assert.equal(bounds.max, pos);
  for (const target of [pos - 1, pos + 1, -9999, 9999]) {
    assert.equal(clampShelfPos({ pos: target, current: pos, others, band: b }, P).pos, pos);
  }
});

test('no room in the band at all: the shelf holds its position, flagged blocked', () => {
  // A carcass whose interior is shorter than the two edge clearances together
  // (needs height < 2×boardT + 2×edgeGap = 116 mm with the stock profile).
  const tiny = shelfBand({ height: 100, boardT: 18, floorY: null }, P);
  assert.ok(tiny.max < tiny.min, 'this band is genuinely impossible');
  const r = clampShelfPos({ pos: 500, current: 90, others: [], band: tiny }, P);
  assert.equal(r.pos, 90, 'held its position rather than snapping to a bound');
  assert.equal(r.blocked, true);
});

test('the reference faces for the live dimension are never blank', () => {
  const b = band({ floorY: 444 });
  const lone = shelfBounds({ pos: 1000, others: [], band: b }, P);
  assert.equal(lone.below, 444);                // partition top
  assert.equal(lone.above, 2150 - 18);          // top panel underside
  const crowded = shelfBounds({ pos: 1000, others: [700, 1500], band: b }, P);
  assert.equal(crowded.below, 700);
  assert.equal(crowded.above, 1500);
});

test('a workshop that wants bigger clearances gets them, with no code change', () => {
  const roomy = migrateCabinetProfile({
    ...DEFAULT_CABINET_PROFILE,
    editor: { ...DEFAULT_CABINET_PROFILE.editor, minShelfGap: 120, minShelfEdgeGap: 90 },
  });
  const b = shelfBand({ height: 2150, boardT: 18, floorY: null }, roomy);
  assert.equal(b.min, 18 + 90);
  assert.equal(clampShelfPos({ pos: 9999, current: 500, others: [1000], band: b }, roomy).pos, 1000 - 120);
});

// ─── unit ↔ unit, unit ↔ wall ───

const U = (x, w) => ({ left: x, right: x + w });

test('a unit cannot leave the wall in either direction', () => {
  assert.equal(clampUnitX({ x: -900, current: 500, width: 600, wallWidth: 4000, others: [] }, P).x, 0);
  assert.equal(clampUnitX({ x: 9999, current: 500, width: 600, wallWidth: 4000, others: [] }, P).x, 3400);
});

test('a wall narrower than the unit pins it at zero rather than going negative', () => {
  assert.equal(clampUnitX({ x: 300, current: 0, width: 900, wallWidth: 600, others: [] }, P).x, 0);
});

test('a drag that outruns the cursor still stops at the neighbour — it never jumps past', () => {
  // Neighbour occupying 1200..1800. Our unit is at 300 and the pointer is
  // thrown to 3500: the far side of the neighbour is NOT reachable.
  const r = clampUnitX({ x: 3500, current: 300, width: 600, wallWidth: 4000, others: [U(1200, 600)] }, P);
  assert.equal(r.x, 1200 - 600, 'butted against the neighbour, not past it');
  assert.equal(r.max, 600);
});

test('the same throw from the other side stops on the neighbour\'s right edge', () => {
  const r = clampUnitX({ x: -3000, current: 2500, width: 600, wallWidth: 4000, others: [U(1200, 600)] }, P);
  assert.equal(r.x, 1800);
});

test('units already touching cannot be pushed into each other', () => {
  // Ours 1800..2400, neighbour 1200..1800 — flush.
  for (const target of [1799, 1000, -50]) {
    assert.equal(clampUnitX({ x: target, current: 1800, width: 600, wallWidth: 4000, others: [U(1200, 600)] }, P).x, 1800);
  }
});

test('the magnet butts a unit edge to edge — and produces no overlap', () => {
  const others = [U(1200, 600)];                       // 1200..1800
  const near = 1800 + Math.floor(MAGNET / 2);
  const r = clampUnitX({ x: near, current: 2400, width: 600, wallWidth: 4000, others }, P);
  assert.equal(r.x, 1800, 'pulled flush against the right edge of the neighbour');
  assert.ok(r.x >= 1800, 'flush is the closest legal position — never an overlap');

  const far = 1800 + MAGNET + 1;
  assert.equal(clampUnitX({ x: far, current: 2400, width: 600, wallWidth: 4000, others }, P).x, far);
});

test('the magnet also butts a unit against the ends of the wall', () => {
  assert.equal(clampUnitX({ x: MAGNET - 1, current: 500, width: 600, wallWidth: 4000, others: [] }, P).x, 0);
  assert.equal(clampUnitX({ x: 3400 - MAGNET + 1, current: 2000, width: 600, wallWidth: 4000, others: [] }, P).x, 3400);
});

test('a gap on the far side of a neighbour is not reachable, however hard you pull', () => {
  // 900 mm of free wall at 800..1700, and a 1000 mm unit parked at 2600 behind
  // the unit that occupies 1700..2600. Aiming for the gap gets you flush
  // against the near neighbour and no further.
  const others = [U(0, 800), U(1700, 900)];
  const r = clampUnitX({ x: 900, current: 2600, width: 1000, wallWidth: 4000, others }, P);
  assert.equal(r.x, 2600, 'stopped on the neighbour, not teleported into the gap');
  assert.equal(r.blocked, false, 'it still has room to travel right');
});

test('with no scribe gap the clamp can always stop, never jump: low ≤ here ≤ high', () => {
  // The invariant that makes this a hard stop rather than a teleport. Checked
  // against a wall full of neighbours from every starting position.
  const others = [U(0, 600), U(600, 600), U(2000, 600), U(3400, 600)];
  for (let current = 0; current <= 3400; current += 50) {
    const r = clampUnitX({ x: current, current, width: 600, wallWidth: 4000, others }, P);
    assert.ok(r.min <= r.max, `slot inverted at ${current}`);
    assert.equal(r.blocked, false);
  }
});

test('a scribe gap introduced after the run was built leaves those units pinned', () => {
  // 0..1000 and 1600..2400 taken, our 600 unit flush between them at 1000.
  // With a 10 mm scribe gap it no longer fits its own slot — nothing legal to
  // move to, so it holds position instead of jumping.
  const scribed = migrateCabinetProfile({
    ...DEFAULT_CABINET_PROFILE,
    editor: { ...DEFAULT_CABINET_PROFILE.editor, minUnitGap: 10 },
  });
  const others = [U(0, 1000), U(1600, 800)];
  for (const target of [0, 1200, 9999]) {
    const r = clampUnitX({ x: target, current: 1000, width: 600, wallWidth: 4000, others }, scribed);
    assert.equal(r.x, 1000, `target ${target} must not move it`);
    assert.equal(r.blocked, true);
  }
});

test('a scribe gap still stops a flush neighbour from being driven through', () => {
  // Regression: reading which side an obstacle is on off the PADDED span made
  // a flush pair look "already overlapping", and the clamp then ignored the
  // very neighbour it exists to protect.
  const scribed = migrateCabinetProfile({
    ...DEFAULT_CABINET_PROFILE,
    editor: { ...DEFAULT_CABINET_PROFILE.editor, minUnitGap: 10, unitMagnet: 0 },
  });
  const others = [U(1200, 600)];                       // 1200..1800
  const r = clampUnitX({ x: 0, current: 1800, width: 600, wallWidth: 4000, others }, scribed);
  assert.equal(r.x, 1810, 'pushed out to the scribe gap, never into the neighbour');
  assert.ok(r.x >= 1800, 'no overlap');
});

test('three units in a row: the middle one is boxed in by its immediate neighbours only', () => {
  const others = [U(0, 600), U(2000, 600), U(3000, 600)];
  const r = clampUnitX({ x: 9999, current: 1000, width: 600, wallWidth: 4000, others }, P);
  assert.equal(r.x, 1400, 'stops at the unit at 2000, not at the one at 3000');
  assert.equal(clampUnitX({ x: -9999, current: 1000, width: 600, wallWidth: 4000, others }, P).x, 600);
});

test('a scribe gap in the profile is honoured by the same clamp', () => {
  const scribed = migrateCabinetProfile({
    ...DEFAULT_CABINET_PROFILE,
    editor: { ...DEFAULT_CABINET_PROFILE.editor, minUnitGap: 10, unitMagnet: 40 },
  });
  const r = clampUnitX({ x: 9999, current: 200, width: 600, wallWidth: 4000, others: [U(1200, 600)] }, scribed);
  assert.equal(r.x, 1200 - 600 - 10);
});

test('unitSpan reads the footprint the clamp works on', () => {
  assert.deepEqual(unitSpan({ position: { x_mm: 250 }, params: { width: 600 } }), { left: 250, right: 850 });
  assert.deepEqual(unitSpan({}), { left: 0, right: 0 });
});

// ─── what clamping cannot fix: validation ───

test('a unit taller than the room is reported, because no drag can fix it', () => {
  const issues = unitIssues({
    unit: { position: { wall: 0, x_mm: 0 }, params: { width: 600, height: 2600 } },
    room: { height: 2500, walls: [{ width: 4000 }] },
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'UNIT_TALLER_THAN_ROOM');
  assert.equal(issues[0].level, 'error');
  assert.match(issues[0].message, /100 mm taller/);
});

test('a unit wider than its wall is reported too', () => {
  const issues = unitIssues({
    unit: { position: { wall: 0, x_mm: 0 }, params: { width: 4200, height: 2000 } },
    room: { height: 2500, walls: [{ width: 4000 }] },
  });
  assert.deepEqual(issues.map((i) => i.code), ['UNIT_WIDER_THAN_WALL']);
});

test('a unit that fits reports nothing', () => {
  assert.deepEqual(unitIssues({
    unit: { position: { wall: 0, x_mm: 100 }, params: { width: 600, height: 2150 } },
    room: { height: 2500, walls: [{ width: 4000 }] },
    others: [U(1000, 600)],
  }), []);
});

test('touching units are legal; overlapping ones are reported', () => {
  const at = (x) => ({
    unit: { position: { wall: 0, x_mm: x }, params: { width: 600, height: 2150 } },
    room: { height: 2500, walls: [{ width: 4000 }] },
    others: [{ ...U(1200, 600), label: 'W02' }],
  });
  assert.deepEqual(unitIssues(at(1800)), [], 'flush is fine');
  assert.deepEqual(unitIssues(at(600)), [], 'flush on the other side is fine');
  const overlap = unitIssues(at(1700));
  assert.equal(overlap[0].code, 'UNIT_OVERLAP');
  assert.match(overlap[0].message, /W02/);
  assert.match(overlap[0].message, /100 mm/);
});

// ─── placing a new unit ───

test('the first unit lands centred, the next ones butt onto what is there', () => {
  assert.equal(firstFreeUnitX({ width: 600, wallWidth: 4000, others: [] }), 1700);
  assert.equal(firstFreeUnitX({ width: 600, wallWidth: 4000, others: [U(1700, 600)] }), 2300);
  assert.equal(firstFreeUnitX({ width: 600, wallWidth: 4000, others: [U(1700, 600), U(2300, 600)] }), 2900);
});

test('a new unit goes to the right-hand end of the run even when the left is free', () => {
  // 500..1300 and 2000..2600 are taken; the run ends at 2600 and that is where
  // the next unit goes — "add, add, add" builds a row, it does not backfill.
  assert.equal(firstFreeUnitX({ width: 600, wallWidth: 4000, others: [U(500, 800), U(2000, 600)] }), 2600);
});

test('when the right-hand end has run out of wall, the first gap wide enough is used', () => {
  // Wall 2600 wide, so a 600 unit can sit at 2000 at the very latest. The run
  // already ends at 3400, past the wall — so the 800..2000 gap is taken.
  assert.equal(firstFreeUnitX({ width: 600, wallWidth: 2600, others: [U(0, 800), U(2000, 1400)] }), 800);
});

test('a new unit on a full wall is still placed inside the wall', () => {
  const x = firstFreeUnitX({ width: 600, wallWidth: 1000, others: [U(0, 1000)] });
  assert.equal(x, 400, 'clamped to wallWidth − width rather than pushed off the wall');
});
