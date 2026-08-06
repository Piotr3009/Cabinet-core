// ─── Room v2: walls as a list, the shrink guard, DXF import ───
//
// The room is the one thing in the project that can create an overlap without
// anybody dragging anything, so most of this file is about what the room is
// NOT allowed to do to the units standing in it.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_ROOM, migrateRoom, normalizeRoom, roomWalls, wallWidth, roomBounds, roomArea,
  rectCorners, lCorners, clampOpening, openingsOnWall, roomChangeGuard, validateRoomShape,
  OPENING_DEFAULTS,
} from '../src/engine/room.js';
import { proposeRoomFromDxf, readDxfEntities, chainLines, dropCollinear } from '../src/engine/dxfImport.js';
import { panelDxf } from '../src/engine/cnc/dxf.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';

const unit = (id, wall, x, width, height = 2150) => ({
  id, params: { unit_num: id, width, height }, position: { wall, x_mm: x },
});

// ─── shape ───

test('a rectangle is four walls, and their widths are the room dimensions', () => {
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  const walls = roomWalls(room);
  assert.equal(walls.length, 4);
  assert.deepEqual(walls.map((w) => w.width), [4000, 3000, 4000, 3000]);
  assert.equal(roomArea(room), 12e6);
  assert.deepEqual(roomBounds(room).centre, { x: 2000, y: 1500 });
});

test('an L-shaped room is the same structure with six walls', () => {
  const room = migrateRoom({ height: 2500, corners: lCorners(4000, 3000, 1500, 1200) });
  const walls = roomWalls(room);
  assert.equal(walls.length, 6);
  assert.equal(roomArea(room), 4000 * 3000 - 1500 * 1200);
  // Every wall has length and every corner turns a right angle in this preset.
  for (const w of walls) assert.ok(w.width > 0, `wall ${w.index} has no width`);
  assert.equal(validateRoomShape(room.corners).length, 0);
});

test('every wall faces into the room, whichever way the corners were listed', () => {
  const clockwise = { height: 2500, corners: [...rectCorners(4000, 3000)].reverse(), openings: [] };
  for (const room of [migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), migrateRoom(clockwise)]) {
    const walls = roomWalls(room);
    const c = roomBounds(room).centre;
    for (const w of walls) {
      const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
      const toCentre = { x: c.x - mid.x, y: c.y - mid.y };
      assert.ok(w.inward.x * toCentre.x + w.inward.y * toCentre.y > 0,
        `wall ${w.index} normal points out of the room`);
      // Unit vectors, so the view can use them directly.
      assert.ok(Math.abs(Math.hypot(w.along.x, w.along.y) - 1) < 1e-9);
      assert.ok(Math.abs(Math.hypot(w.inward.x, w.inward.y) - 1) < 1e-9);
    }
  }
});

test('the rotation a wall reports really maps local +X onto the wall and +Z inward', () => {
  const room = migrateRoom({ height: 2500, corners: lCorners(4000, 3000, 1500, 1200) });
  for (const w of roomWalls(room)) {
    // Rotation about world Y by `angle`: local +X → (cos, 0, −sin), +Z → (sin, 0, cos).
    const cos = Math.cos(w.angle); const sin = Math.sin(w.angle);
    const localX = { x: cos, y: -sin };          // plan (x, y) ≡ world (X, Z)
    const localZ = { x: sin, y: cos };
    assert.ok(Math.abs(localX.x - w.along.x) < 1e-9 && Math.abs(localX.y - w.along.y) < 1e-9,
      `wall ${w.index}: local +X does not follow the wall`);
    assert.ok(Math.abs(localZ.x - w.inward.x) < 1e-9 && Math.abs(localZ.y - w.inward.y) < 1e-9,
      `wall ${w.index}: local +Z does not point into the room`);
  }
});

test('a turn-1 project opens as a room, not as a crash', () => {
  const legacy = { height: 2400, walls: [{ width: 3600 }] };
  const room = migrateRoom(legacy);
  assert.equal(room.schema, 2);
  assert.equal(room.height, 2400);
  assert.equal(wallWidth(room, 0), 3600, 'the wall it always had keeps its width');
  assert.equal(roomWalls(room).length, 4, 'and gains the three that were never drawn');
  assert.deepEqual(room.openings, []);
  // Migrating twice changes nothing.
  assert.deepEqual(migrateRoom(room), room);
  assert.deepEqual(migrateRoom(null).corners, DEFAULT_ROOM.corners);
});

test('normalizeRoom is idempotent and keeps the corner set', () => {
  const room = migrateRoom({ height: 2500, corners: lCorners(4000, 3000, 1500, 1200) });
  const once = normalizeRoom(room);
  const twice = normalizeRoom(once);
  assert.deepEqual(twice.corners, once.corners);
  assert.equal(once.corners.length, room.corners.length);
});

// ─── openings ───

test('an opening is pulled back into its wall instead of hanging off the end', () => {
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  const off = clampOpening({ kind: 'window', wall: 0, x_mm: 3800, width: 1200, height: 1400, sill: 900 }, room);
  assert.equal(off.x_mm, 2800, 'slid back so it ends at the wall end');
  assert.equal(off.x_mm + off.width, 4000);

  const tooTall = clampOpening({ kind: 'window', wall: 0, x_mm: 0, width: 1000, height: 3000, sill: 900 }, room);
  assert.equal(tooTall.sill + tooTall.height, 2500, 'never above the ceiling');

  const door = clampOpening({ kind: 'door', wall: 1, x_mm: 100, width: 900, height: 2040, sill: 800 }, room);
  assert.equal(door.sill, 0, 'a door stands on the floor');

  const tooWide = clampOpening({ kind: 'door', wall: 1, x_mm: 0, width: 9000 }, room);
  assert.equal(tooWide.width, 3000, 'never wider than its wall');
  assert.equal(OPENING_DEFAULTS.door.sill, 0);
});

test('openings are read back per wall, in order along it', () => {
  const room = migrateRoom({
    height: 2500,
    corners: rectCorners(4000, 3000),
    openings: [
      { id: 'a', kind: 'window', wall: 0, x_mm: 2000, width: 1000, height: 1400, sill: 900 },
      { id: 'b', kind: 'door', wall: 0, x_mm: 200, width: 900, height: 2040, sill: 0 },
      { id: 'c', kind: 'window', wall: 2, x_mm: 500, width: 800, height: 1200, sill: 1000 },
    ],
  });
  assert.deepEqual(openingsOnWall(room, 0).map((o) => o.id), ['b', 'a']);
  assert.deepEqual(openingsOnWall(room, 2).map((o) => o.id), ['c']);
  assert.deepEqual(openingsOnWall(room, 3), []);
});

// ─── the shrink guard ───

test('a room may not shrink below the units standing in it', () => {
  const units = [unit('01', 0, 3000, 900, 2150)];   // occupies 3000..3900 on wall 0
  const smaller = migrateRoom({ height: 2500, corners: rectCorners(3500, 3000) });
  const verdict = roomChangeGuard(smaller, units);
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /Cannot shrink the room below placed units — move or remove units first/);
  assert.match(verdict.message, /01/, 'the message names the unit in the way');
  assert.equal(verdict.blocking.length, 1);
  assert.match(verdict.blocking[0].reason, /past the end of wall 1/);

  // Exactly fitting is allowed — the guard blocks overlap, not tidiness.
  assert.equal(roomChangeGuard(migrateRoom({ height: 2500, corners: rectCorners(3900, 3000) }), units).ok, true);
  assert.equal(roomChangeGuard(migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), units).ok, true);
});

test('the guard also catches a ceiling dropped under a unit, and a deleted wall', () => {
  const tall = [unit('W01', 0, 0, 600, 2150)];
  const low = roomChangeGuard(migrateRoom({ height: 2000, corners: rectCorners(4000, 3000) }), tall);
  assert.equal(low.ok, false);
  assert.match(low.blocking[0].reason, /taller than the new ceiling/);

  const onWall5 = [{ ...unit('X', 5, 0, 600), position: { wall: 5, x_mm: 0 } }];
  const gone = roomChangeGuard(migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), onWall5);
  assert.equal(gone.ok, false);
  assert.match(gone.blocking[0].reason, /no longer exist/);
});

test('an L-shaped cut that eats a wall a unit stands on is refused', () => {
  // Wall 1 of the rectangle runs 3000 mm deep; the unit sits at 2000 on it.
  const units = [unit('02', 1, 2000, 800)];
  const full = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  assert.equal(roomChangeGuard(full, units).ok, true);

  const bitten = migrateRoom({ height: 2500, corners: lCorners(4000, 3000, 1500, 1200) });
  const verdict = roomChangeGuard(bitten, units);
  assert.equal(verdict.ok, false, 'wall 1 is now 1800 mm and the unit ends at 2800');
  assert.match(verdict.message, /02/);
});

test('an empty room can always change shape', () => {
  assert.equal(roomChangeGuard(migrateRoom({ height: 2200, corners: rectCorners(1000, 1000) }), []).ok, true);
});

// ─── DXF import ───

const dxfWith = (body) => `0\nSECTION\n2\nENTITIES\n${body}0\nENDSEC\n0\nEOF\n`;

const lineEntity = (x1, y1, x2, y2) =>
  `0\nLINE\n8\nWALLS\n10\n${x1}\n20\n${y1}\n30\n0.0\n11\n${x2}\n21\n${y2}\n31\n0.0\n`;

const lwpolyEntity = (points, closed) => {
  let s = `0\nLWPOLYLINE\n8\nWALLS\n90\n${points.length}\n70\n${closed ? 1 : 0}\n`;
  for (const p of points) s += `10\n${p.x}\n20\n${p.y}\n`;
  return s;
};

test('the parser reads LINE and LWPOLYLINE out of the ENTITIES section', () => {
  const dxf = dxfWith(lineEntity(0, 0, 4000, 0) + lwpolyEntity([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], true));
  const { lines, polylines } = readDxfEntities(dxf);
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0], { x1: 0, y1: 0, x2: 4000, y2: 0, layer: 'WALLS' });
  assert.equal(polylines.length, 1);
  assert.equal(polylines[0].closed, true);
  assert.equal(polylines[0].points.length, 3);

  // Entities outside ENTITIES (blocks, tables) must not be picked up.
  const noise = `0\nSECTION\n2\nBLOCKS\n${lineEntity(9, 9, 9, 9)}0\nENDSEC\n` + dxf;
  assert.equal(readDxfEntities(noise).lines.length, 1);
});

test('a closed polyline wins over loose lines, and the outline is moved to the origin', () => {
  const dxf = dxfWith(
    lwpolyEntity([{ x: 10000, y: 5000 }, { x: 14000, y: 5000 }, { x: 14000, y: 8000 }, { x: 10000, y: 8000 }], true)
    + lineEntity(0, 0, 50, 0),
  );
  const proposal = proposeRoomFromDxf(dxf);
  assert.equal(proposal.ok, true);
  assert.equal(proposal.source, 'closed polyline');
  assert.deepEqual(proposal.corners, [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }]);
  assert.equal(proposal.stats.area_m2, 12);

  const room = migrateRoom({ height: 2500, corners: proposal.corners });
  assert.deepEqual(roomWalls(room).map((w) => w.width), [4000, 3000, 4000, 3000]);
});

test('loose wall lines are chained into a loop', () => {
  const dxf = dxfWith(
    lineEntity(0, 0, 4000, 0)
    + lineEntity(4000, 3000, 0, 3000)      // deliberately drawn the other way round
    + lineEntity(4000, 0, 4000, 3000)
    + lineEntity(0, 3000, 0, 0),
  );
  const proposal = proposeRoomFromDxf(dxf);
  assert.equal(proposal.ok, true);
  assert.equal(proposal.source, 'chained lines');
  assert.equal(proposal.corners.length, 4);
  assert.deepEqual(roomWalls(migrateRoom({ height: 2500, corners: proposal.corners })).map((w) => w.width).sort((a, b) => a - b),
    [3000, 3000, 4000, 4000]);
  assert.ok(proposal.warnings.some((w) => /check that it closes/.test(w)));
});

test('a wall drawn as three segments arrives as one wall', () => {
  const points = [
    { x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 2500, y: 0 }, { x: 4000, y: 0 },
    { x: 4000, y: 3000 }, { x: 0, y: 3000 },
  ];
  const proposal = proposeRoomFromDxf(dxfWith(lwpolyEntity(points, true)));
  assert.deepEqual(proposal.corners, [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }]);
  assert.deepEqual(dropCollinear(points).length, 4);
});

test('an L-shaped plan survives the round trip', () => {
  const corners = lCorners(5000, 4000, 2000, 1500);
  const proposal = proposeRoomFromDxf(dxfWith(lwpolyEntity(corners, true)));
  assert.deepEqual(proposal.corners, corners);
  assert.equal(roomWalls(migrateRoom({ height: 2500, corners: proposal.corners })).length, 6);
});

test('a plan drawn in metres or centimetres scales on import', () => {
  const dxf = dxfWith(lwpolyEntity([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], true));
  assert.deepEqual(proposeRoomFromDxf(dxf, { scale: 1000 }).corners,
    [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }]);
});

test('a DXF with nothing usable says so instead of proposing a broken room', () => {
  const empty = proposeRoomFromDxf(dxfWith(''));
  assert.equal(empty.ok, false);
  assert.match(empty.warnings[0], /No LINE or LWPOLYLINE/);
  assert.equal(proposeRoomFromDxf('not a dxf at all').ok, false);
});

test('chainLines tolerates a gap smaller than the tolerance', () => {
  const pts = chainLines([
    { x1: 0, y1: 0, x2: 1000, y2: 0 },
    { x1: 1002, y1: 0, x2: 1000, y2: 800 },     // 2 mm gap
  ], 5);
  assert.equal(pts.length, 3);
});

test('the importer reads a DXF this app itself wrote', () => {
  // Not a made-up string: the turn-2 generator emits R12 POLYLINE, so this
  // proves the two halves of the app agree about what a DXF is — and documents
  // that a panel outline is NOT accepted as a room (it is not closed as one).
  const dxf = panelDxf(
    { id: 'BUL', part: 'BUL', cnc: { outline: [[0, 0], [560, 0], [560, 2150], [0, 2150]], pockets: [], drawn_w: 560, drawn_h: 2150 } },
    [],
    { unitNum: 'W01', profile: DEFAULT_CABINET_PROFILE },
  );
  const { lines, polylines } = readDxfEntities(dxf);
  assert.equal(lines.length, 0, 'the generator writes polylines, not lines');
  assert.equal(polylines.length, 0, 'R12 POLYLINE/VERTEX is not LWPOLYLINE — the importer ignores it');
});
