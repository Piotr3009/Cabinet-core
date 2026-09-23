// ─── TURN 74 · F5 · SETUP ROOM "3 WALLS" IS A U: FRONT, RIGHT AND LEFT ─────
//
// The owner, 23.09.2026 (list point 12):
//
//   *"SETUP ROOM THREE WALLS daje ścianę przednią, prawą i ścianę za kamerą;
//   ma być przednia, prawa i LEWA (kształt U). Logika trybu zostaje."*
//
// In the room's own coordinates (`rectCorners`): wall 0 runs along y = 0 and
// is the one the camera looks at (the FRONT), wall 1 is x = width (the RIGHT),
// wall 2 is y = depth (BEHIND the camera) and wall 3 is x = 0 (the LEFT). The
// U is walls 3, 0 and 1; its open side is wall 2 and faces the camera.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  lCorners, migrateRoom, rectCorners, roomWalls, wallIndicesInScope, wallStub, wallsInScope,
} from '../src/engine/room.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const room = (w = 4000, d = 3000) => migrateRoom({ corners: rectCorners(w, d), height: 2500 });
const at = (p) => `${Math.round(p.x)},${Math.round(p.y)}`;

test('T74 F5 · the three real walls are the LEFT, the FRONT and the RIGHT', () => {
  const r = room();
  const walls = roomWalls(r);
  const real = wallsInScope(r, 'three').filter((w) => !w.stub);
  // By geometry, not by index alone: the front is y = 0, the right x = width,
  // the left x = 0. Nothing at y = depth, the wall behind the camera.
  const front = real.find((w) => Math.abs(w.start.y) < 1e-6 && Math.abs(w.end.y) < 1e-6);
  const right = real.find((w) => Math.abs(w.start.x - 4000) < 1e-6 && Math.abs(w.end.x - 4000) < 1e-6);
  const left = real.find((w) => Math.abs(w.start.x) < 1e-6 && Math.abs(w.end.x) < 1e-6);
  assert.ok(front && right && left, 'the U is not front + right + left');
  assert.equal(real.length, 3);
  assert.ok(!real.some((w) => Math.abs(w.start.y - 3000) < 1e-6 && Math.abs(w.end.y - 3000) < 1e-6),
    'the wall behind the camera is still a real wall');
  assert.deepEqual(wallIndicesInScope(r, 'three'), [0, 1, walls.length - 1],
    'wall 0 is listed first, so every "first wall in scope" reader lands on the front');
});

test('T74 F5 · the open side faces the camera: both returns stand on the wall behind it', () => {
  const r = room();
  const back = roomWalls(r)[2];
  const stubs = wallsInScope(r, 'three').filter((w) => w.stub);
  assert.equal(stubs.length, 2, 'the mode keeps its two returns');
  assert.deepEqual([...new Set(stubs.map((w) => w.index))], [2]);
  // One at each free corner of the U: the right wall's end and the left's start.
  const touched = new Set(stubs.flatMap((w) => [at(w.start), at(w.end)]));
  assert.ok(touched.has(at(back.start)), 'no return at the right-hand free corner');
  assert.ok(touched.has(at(back.end)), 'no return at the left-hand free corner');
  // The house's own length, as before: the logic of the mode stays.
  for (const s of stubs) assert.equal(Math.round(s.width), Math.round(wallStub(r, null)));
});

test('T74 F5 · the arithmetic guard stands: two returns from one wall never cross', () => {
  const narrow = room(2000, 4000);
  const open = roomWalls(narrow)[2].width;
  for (const s of wallsInScope(narrow, 'three').filter((w) => w.stub)) {
    assert.ok(s.width <= open / 2 + 1e-6, 'two returns cut from one wall overlapped');
  }
});

test('T74 F5 · with more corners the two returns come from the two walls that meet the U', () => {
  const l = migrateRoom({ corners: lCorners(5000, 4000, 1500, 1500), height: 2500 });
  const walls = roomWalls(l);
  const scoped = wallsInScope(l, 'three');
  assert.deepEqual(scoped.filter((w) => !w.stub).map((w) => w.index), [0, 1, walls.length - 1]);
  assert.deepEqual(scoped.filter((w) => w.stub).map((w) => w.index), [2, walls.length - 2]);
});

test('T74 F5 · the other scopes are byte for byte what they were', () => {
  const r = room();
  const sig = (scope) => wallsInScope(r, scope).map((w) => `${w.index}:${w.stub ? 's' : 'w'}:${Math.round(w.width)}`);
  assert.deepEqual(sig('wall'), ['0:w:4000', '3:s:2000', '1:s:2000']);
  assert.deepEqual(sig('two'), ['0:w:4000', '1:w:3000', '3:s:2000', '2:s:2000']);
  assert.equal(sig('room').length, 4);
});

test('T74 F5 · the preset row is untouched: the mode is still `three`, labelled 3 walls, in both apps', () => {
  for (const rel of ['src/components/RoomModal.jsx', 'src/retail/design/room/RoomModal.jsx']) {
    assert.match(read(rel), /\{ id: 'three', label: '3 walls' \}/, `${rel} lost its preset`);
  }
});
