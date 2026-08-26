// ─── Turn 14, F1: the daily pain ────────────────────────────────────────────
//
// Five bugs the owner meets every day, and the rules behind them. What can be
// pinned in node is pinned here; the PAIR invariant of F1.1 is also pinned as
// one step in the browser walk, because the half of it that broke last time
// broke in the renderer's own intersection list.

import test from 'node:test';
import assert from 'node:assert/strict';

import { roomClickIsBackground } from '../src/lib/selection.js';
import {
  migrateRoom, rectCorners, lCorners, roomWalls, setWallLength, moveWall,
  wallsInScope, wallStub, DEFAULT_WALL_STUB, wallIndicesInScope,
} from '../src/engine/room.js';
import { runMemberIds, hasTopInfill } from '../src/engine/runs.js';
import { menuActions } from '../src/lib/contextActions.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

// ─── F1.1 — the PAIR ────────────────────────────────────────────────────────

const cabinet = { userData: { ccUnitId: 'u1' } };
const inUnit = { userData: {}, parent: { userData: {}, parent: cabinet } };
const plain = { userData: {} };

test('F1.1a — a room surface with nothing in front of it IS the background', () => {
  // The floor at 5.2 m, with the cabinet's own outline lines a metre BEHIND it.
  // That is the exact list the browser produced for a click on the floor in
  // front of a base unit, and turn 13's rule refused it.
  const intersections = [
    { distance: 5.197, object: plain },
    { distance: 6.514, object: inUnit },
    { distance: 6.825, object: inUnit },
  ];
  assert.equal(roomClickIsBackground(intersections, 5.197), true);
});

test('F1.1b — a cabinet IN FRONT of the surface takes the click', () => {
  const intersections = [
    { distance: 4.1, object: inUnit },
    { distance: 6.6, object: plain },
  ];
  assert.equal(roomClickIsBackground(intersections, 6.6), false,
    'the wall behind a cabinet must not clear the selection the cabinet is setting');
});

test('F1.1 — a coincident hit counts as in front, not as a floating-point race', () => {
  const intersections = [{ distance: 4.2, object: inUnit }, { distance: 4.2, object: plain }];
  assert.equal(roomClickIsBackground(intersections, 4.2), false);
});

test('F1.1 — an empty ray is background, and so is a room-only ray', () => {
  assert.equal(roomClickIsBackground([], 3), true);
  assert.equal(roomClickIsBackground([{ distance: 1, object: plain }], 3), true);
});

// ─── F1.2 — removal must remove ─────────────────────────────────────────────

const wallUnit = (id, x, extra = {}) => ({
  id,
  type: 'WUD',
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
  params: {
    unit_num: id, width: 600, height: 720, depth: 300, mount_height: 1500, ...extra,
  },
});

test('F1.2 — a run member knows the run has an infill above it', () => {
  const owner = wallUnit('A', 0, { top_infill_mm: 300 });
  const member = wallUnit('B', 600, { run_top_infill: { role: 'member', ownerId: 'A' } });
  assert.equal(hasTopInfill(owner), true);
  assert.equal(hasTopInfill(member), true, 'the piece is over its head — the switch must say so');
  assert.equal(hasTopInfill(wallUnit('C', 1200)), false);
});

test('F1.2 — the context menu shows the RUN state and offers to take it off', () => {
  const member = wallUnit('B', 600, { run_top_infill: { role: 'member', ownerId: 'A' } });
  const removed = [];
  const entry = menuActions({
    unit: member,
    store: { removeTopInfill: (id) => removed.push(id) },
  }).find((a) => a.id === 'top-infill');
  assert.ok(entry, 'a wall unit is offered a top infill');
  assert.equal(entry.checked, true, 'ticked — the piece is there');
  entry.run();
  assert.deepEqual(removed, ['B'], 'and clicking it REMOVES rather than adding a second request');
});

test('F1.2 — the run is every cabinet the piece lies on', () => {
  const units = [
    wallUnit('A', 0, { top_infill_mm: 300 }),
    wallUnit('B', 600),
    wallUnit('C', 1200),
    // A gap wider than the run tolerance starts a new run.
    wallUnit('D', 3000),
  ];
  assert.deepEqual(runMemberIds(units, 'B', P).sort(), ['A', 'B', 'C']);
  assert.deepEqual(runMemberIds(units, 'D', P), ['D']);
  assert.deepEqual(runMemberIds(units, 'nobody', P), ['nobody']);
});

// ─── F1.5a — typing a length keeps the right angles ─────────────────────────

const corners = (room) => room.corners.map((c) => [Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10]);
const anglesOf = (cs) => {
  const walls = roomWalls({ corners: cs.map(([x, y]) => ({ x, y })) });
  return walls.map((w) => Math.round((Math.atan2(w.along.y, w.along.x) * 180) / Math.PI));
};

test('F1.5a — typing 4500 on a 4000 × 3000 rectangle RESCALES it', () => {
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  const next = setWallLength(room, 0, 4500);
  const walls = roomWalls({ ...room, corners: next });
  assert.equal(Math.round(walls[0].width), 4500, 'the wall that was typed');
  assert.equal(Math.round(walls[2].width), 4500, 'and the one opposite it');
  // The owner's bug, in one line: the two 3000 walls came out at 3041.4.
  assert.equal(Math.round(walls[1].width), 3000, 'the other pair is UNTOUCHED — no shear');
  assert.equal(Math.round(walls[3].width), 3000);
  assert.deepEqual(anglesOf(corners({ corners: next })), anglesOf(corners(room)),
    'and every wall still runs in exactly the direction it did');
});

test('F1.5a — shrinking works the same way, and the start corner stays put', () => {
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  const next = setWallLength(room, 0, 2500);
  const walls = roomWalls({ ...room, corners: next });
  assert.equal(Math.round(walls[0].width), 2500);
  assert.equal(Math.round(walls[1].width), 3000);
  assert.deepEqual(next[0], room.corners[0], 'wall 1 keeps the corner it starts at');
});

test('F1.5a — an L-shape keeps all six of its walls square', () => {
  const room = migrateRoom({ height: 2500, corners: lCorners(4000, 3000, 1200, 1000) });
  const before = anglesOf(corners(room));
  const next = setWallLength(room, 0, 4600);
  const walls = roomWalls({ ...room, corners: next });
  assert.equal(Math.round(walls[0].width), 4600);
  assert.deepEqual(anglesOf(corners({ corners: next })), before);
});

test('F1.5a / F10.1 — moveWall is the one primitive, and it refuses to fold the room', () => {
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  // Wall 1 is a side wall; pushing it out by 500 lengthens the two that meet it.
  const out = roomWalls({ ...room, corners: moveWall(room, 1, 500) });
  assert.equal(Math.round(out[0].width), 4500);
  assert.equal(Math.round(out[1].width), 3000, 'the wall that MOVED keeps its own length');
  // …and dragged 4000 the other way it would pass through the wall opposite.
  assert.deepEqual(moveWall(room, 1, -4000), room.corners, 'refused, not folded');
});

test('F1.5a — a wall moved by exactly what was typed moves by exactly that', () => {
  // CLAUDE.md F10.2, and the reason the two phases share a primitive.
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  const moved = moveWall(room, 0, 202);
  const walls = roomWalls({ ...room, corners: moved });
  // Wall 0 runs along y = 0 and moves OUTWARD, so its y goes negative by 202.
  assert.equal(Math.round(moved[0].y * 10) / 10, -202);
  assert.equal(Math.round(moved[1].y * 10) / 10, -202);
  assert.equal(Math.round(walls[1].width), 3202, 'the neighbours stretched to meet it');
});

// ─── F1.5b — one wall is one wall ───────────────────────────────────────────

test('F1.5b — "one wall" scope shows the wall and two returns', () => {
  // ─── THE LENGTH CHANGED AT T51 · F8, AND NOTHING ELSE HERE DID ──────────
  //
  // The owner, 26.08.2026: *"default bocznych ścian zrób na 2000 mm."*  T14
  // shipped 1000 and this test said "CLAUDE.md asks for 1000 mm", which it did,
  // then. What the test is FOR is the shape — the wall, one return at each end,
  // never the room, both running forward — and that is untouched. The length is
  // read from the constant rather than repeated, so the next change moves one
  // number and not two.
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  assert.equal(wallStub(room), DEFAULT_WALL_STUB);
  const shown = wallsInScope(room, 'wall');
  assert.equal(shown.length, 3, 'the wall, and one return at each end — never the room');
  assert.equal(shown[0].stub, undefined);
  assert.equal(Math.round(shown[0].width), 4000);
  for (const stub of shown.slice(1)) {
    assert.equal(stub.stub, true);
    assert.equal(Math.round(stub.width), DEFAULT_WALL_STUB, 'T51 F8 asks for 2000 mm');
  }
  // Both returns touch the main wall's ends and run FORWARD, into the room.
  const main = shown[0];
  const touches = shown.slice(1).map((st) => [st.start, st.end]
    .some((p) => (Math.hypot(p.x - main.start.x, p.y - main.start.y) < 1e-6
      || Math.hypot(p.x - main.end.x, p.y - main.end.y) < 1e-6)));
  assert.deepEqual(touches, [true, true]);
  for (const stub of shown.slice(1)) {
    const far = [stub.start, stub.end].find((p) => Math.abs(p.y) > 1e-6);
    assert.ok(far && far.y > 0, 'forward, into the room');
  }
});

test('F1.5b — returns of zero are no returns, and the whole room is still the default', () => {
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000), wall_stub_mm: 0 });
  assert.equal(wallsInScope(room, 'wall').length, 1);
  assert.equal(wallsInScope(room, 'room').length, 4);
  assert.deepEqual(wallIndicesInScope(room, 'wall'), [0]);
  assert.deepEqual(wallIndicesInScope(room, 'room'), [0, 1, 2, 3]);
});

test('F1.5b — the stub length survives a save and a reload', () => {
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000), wall_stub_mm: 1500 });
  assert.equal(wallStub(migrateRoom(JSON.parse(JSON.stringify(room)))), 1500);
  // …and a stub can never be longer than the wall it is cut from.
  const short = migrateRoom({ height: 2500, corners: rectCorners(4000, 600), wall_stub_mm: 1500 });
  for (const stub of wallsInScope(short, 'wall').slice(1)) {
    assert.ok(stub.width <= 600 + 1e-6, `${stub.width} is longer than the wall it comes off`);
  }
});
