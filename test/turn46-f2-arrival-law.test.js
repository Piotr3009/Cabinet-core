import test from 'node:test';
import assert from 'node:assert/strict';

import { ceilingAt, slopeShortfallMm, slopeStation } from '../src/lib/slopeLine.js';
import { clampUnitX } from '../src/engine/collision.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { runChecks } from '../src/engine/checks.js';
import { useProjectStore } from '../src/stores/projectStore.js';

// ─── TURN 46 · F2 — ARRIVAL LAW: CLAMP + MINIMUM 400 ────────────────────────
//
// CLAUDE.md F2, the owner's own decision of 24.08.2026:
//
//   *"Dragging a unit along a sloped wall: the unit MAY enter the slope zone
//   (that is the point of this turn) **down to the station where
//   `ceilingAt(far edge) − infill ≥ 400 + legs`**. Past that: hard stop."*
//   *"A unit standing where its FULL height no longer fits is not an error —
//   it is a CUT unit (F3). A unit pushed past the 400 floor is refused with a
//   red Check: `Unit under slope minimum (400 mm)`."*
//   *"The scribe gap to the sloped ceiling is **the project's infill value** —
//   one number, the one the owner already sets."*
//
// THE FIXTURE SLOPE, used by every assertion below and by the walk:
//   a 4000 × 2500 wall whose ceiling comes down over its last 900 mm to 300.

const WALL = { wallWidth: 4000, wallHeight: 2500 };
const FIXTURE = [{ side: 'R', startHeight: 300, run: 900 }];
const UNIT = {
  width: 600, infill: 40, floorY: 100, minimum: 400,
};

// ── the station, computed and asserted (F2's own test) ──

test('the station is solved exactly: 400 mm of clear carcass at the far edge', () => {
  const { min, max } = slopeStation({ slopes: FIXTURE, ...WALL, ...UNIT });
  assert.equal(min, 0, 'nothing stops it travelling left');
  assert.equal(max, 3301.8182, 'the last legal station for a 600 mm unit');

  // What that station MEANS, asked of the ceiling itself rather than restated:
  const far = max + UNIT.width;
  const clear = ceilingAt(far, FIXTURE, WALL) - UNIT.infill - UNIT.floorY;
  assert.equal(Math.round(clear * 1e4) / 1e4, 400, 'exactly the owner\'s 400');
});

test('…and it MAY enter the slope zone — that is the point of the turn', () => {
  const { max } = slopeStation({ slopes: FIXTURE, ...WALL, ...UNIT });
  // The run begins at 3100. The station is well past it: the unit is allowed
  // 800 mm INTO the slope before the floor stops it.
  assert.ok(max > 3100, `the station ${max} is inside the slope zone`);
  assert.ok(max + UNIT.width > 3100, 'and so is its far edge, by 800 mm');
});

test('the SCRIBE GAP is the project\'s infill — 0 and 40 give different stations', () => {
  const at0 = slopeStation({ slopes: FIXTURE, ...WALL, ...UNIT, infill: 0 });
  const at40 = slopeStation({ slopes: FIXTURE, ...WALL, ...UNIT, infill: 40 });
  assert.ok(at0.max > at40.max, 'a wider scribe stops the unit earlier');
  assert.equal(Math.round((at0.max - at40.max) * 100) / 100, 16.36,
    '40 mm of scribe over a 900/2200 slope is 16.36 mm of travel');
});

test('the LEGS are in the law too — "400 + legs"', () => {
  const flat = slopeStation({ slopes: FIXTURE, ...WALL, ...UNIT, floorY: 0 });
  const onLegs = slopeStation({ slopes: FIXTURE, ...WALL, ...UNIT, floorY: 100 });
  assert.ok(flat.max > onLegs.max, 'a unit on legs runs out of headroom sooner');
});

test('a slope on the L mirrors the station exactly', () => {
  const L = [{ side: 'L', startHeight: 300, run: 900 }];
  const { min, max } = slopeStation({ slopes: L, ...WALL, ...UNIT });
  assert.equal(min, 98.1818);
  assert.equal(max, 3400, 'the wall\'s own far end, untouched');
  const clear = ceilingAt(min, L, WALL) - UNIT.infill - UNIT.floorY;
  assert.equal(Math.round(clear * 1e4) / 1e4, 400);
});

test('a wall with no slope leaves the whole wall legal', () => {
  assert.deepEqual(slopeStation({ slopes: [], ...WALL, ...UNIT }), { min: 0, max: 3400 });
});

test('a slope that never bites (startHeight above the need) does not clamp', () => {
  const high = [{ side: 'R', startHeight: 1800, run: 900 }];
  assert.deepEqual(slopeStation({ slopes: high, ...WALL, ...UNIT }), { min: 0, max: 3400 });
});

// ── the HARD STOP: the clamp, not a nearest-legal jump ──

test('clampUnitX takes the station as a barrier — a fast drag cannot jump it', () => {
  const limit = slopeStation({ slopes: FIXTURE, ...WALL, ...UNIT });
  const far = clampUnitX({
    x: 3900, current: 3000, width: 600, wallWidth: 4000, others: [], slopeLimit: limit,
  }, P);
  assert.equal(far.x, limit.max, 'the drag stops AT the station, however fast it was');
  assert.equal(far.max, limit.max);
});

test('…and with no slope the clamp is byte-for-byte the clamp of yesterday', () => {
  const args = {
    x: 3900, current: 3000, width: 600, wallWidth: 4000, others: [],
  };
  assert.deepEqual(clampUnitX(args, P), clampUnitX({ ...args, slopeLimit: null }, P));
});

test('the slope never beats a NEIGHBOUR — whichever stops it first wins', () => {
  const limit = { min: 0, max: 3301.8182 };
  const withNeighbour = clampUnitX({
    x: 3900,
    current: 1000,
    width: 600,
    wallWidth: 4000,
    others: [{ left: 2000, right: 2600 }],
    slopeLimit: limit,
  }, P);
  assert.ok(withNeighbour.x < 2000, 'the neighbour is nearer, so the neighbour stops it');
});

// ── the Check, firing and clearing ──

const shortfallOf = (x) => ({
  shortfallMm: slopeShortfallMm({
    slopes: FIXTURE, ...WALL, x, width: 600, infill: 40, floorY: 100, minimum: 400,
  }),
  minimumMm: 400,
  clearMm: 400 - slopeShortfallMm({
    slopes: FIXTURE, ...WALL, x, width: 600, infill: 40, floorY: 100, minimum: 400,
  }),
});

test('#19 fires past the floor and CLEARS at the station', () => {
  const unit = { id: 'u1', type: 'WARDROBE', params: { unit_num: '01', width: 600 }, position: { wall: 0, x_mm: 0 } };
  const result = { unitNum: '01', panels: [], drills: [] };

  const past = runChecks({
    entries: [{ unit, result }],
    units: [unit],
    profile: P,
    slopeShortfallOf: () => shortfallOf(3400),
  }).filter((f) => f.check === 19);
  assert.equal(past.length, 1, 'the red fires');
  assert.equal(past[0].level, 'red');
  assert.match(past[0].message, /Unit under slope minimum \(400 mm\)/);
  assert.ok(past[0].slopeShortfallMm > 0);

  const at = runChecks({
    entries: [{ unit, result }],
    units: [unit],
    profile: P,
    slopeShortfallOf: () => shortfallOf(3301.8182),
  }).filter((f) => f.check === 19);
  assert.deepEqual(at, [], 'and it clears the moment the unit is legal again');
});

test('a caller that hands no slope reader gets no #19 at all', () => {
  const unit = { id: 'u1', type: 'WARDROBE', params: { unit_num: '01', width: 600 }, position: { wall: 0, x_mm: 0 } };
  const found = runChecks({
    entries: [{ unit, result: { unitNum: '01', panels: [], drills: [] } }],
    units: [unit],
    profile: P,
  });
  assert.deepEqual(found.filter((f) => f.check === 19), []);
});

// ── the store: the whole chain, through the real setter ──

test('the STORE stops a dragged unit at the station and the Check stays quiet', () => {
  const store = useProjectStore.getState();
  store.newProject({ name: 'T46 F2' });
  useProjectStore.setState((st) => ({
    project: {
      ...st.project,
      room: {
        ...st.project.room,
        corners: [
          { x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 },
        ],
        height: 2500,
      },
      design: { ...st.project.design, infill: { ...st.project.design.infill, sideWidth: 40 } },
      wallSlopes: [{
        id: 's1', kind: 'slope', wall: 0, side: 'R', startHeight: 300, run: 900,
      }],
    },
  }));
  const added = useProjectStore.getState().addUnit('WARDROBE', { wall: 0, x_mm: 100 });
  assert.ok(added, 'a wardrobe went on the wall');
  const id = added.id ?? added;
  useProjectStore.getState().updateUnitParams(id, { width: 600 });

  const moved = useProjectStore.getState().moveUnit(id, 3900, 1);
  const unit = useProjectStore.getState().units.find((u) => u.id === id);
  assert.ok(unit.position.x_mm < 3400, 'the slope stopped it short of the wall end');
  assert.ok(unit.position.x_mm > 3100, 'and it DID drive into the slope zone');
  assert.equal(moved.blocked, false);

  const reds = useProjectStore.getState().runChecks().filter((f) => f.check === 19);
  assert.deepEqual(reds, [], 'stopped at the station, the Check has nothing to say');
});
