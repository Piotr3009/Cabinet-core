// ─── T75 · F9 · THE ISLAND ENTITY ───────────────────────────────────────────
//
// CLAUDE.md T75 F9: *"`room.islands = [{ id, cx, cy, w, d, rotation }]`
// (`engine/room.js` migration: absent = none). `roomWalls` returns, after the
// real walls, four FACES per island with `island: id`, `face: 'A' | 'B' | 'E1'
// | 'E2'`, their frames (`start`, `along`, `inward` pointing away from the
// island centre) ... A face is NOT plaster ... Room refuses first: an island
// must lie inside the room polygon with its footprint clear of every unit and
// box; a move that would collide is refused naming the obstacle. PRO only this
// turn (kitchen jobs) ... UI: Room setup gets `ADD ISLAND` (default
// `profile.island.defaults` = 1800 x 900) ... `rotation` in 90° steps."*
//
// The owner, 9.10.2026: *"twoja droga, plus dodawanie szafek po bokach lub end
// panele, w całości."*
//
// The PROBE (verify/t75/p03-probe.md) measured the faces of a 4000 x 3000 room
// with the island { cx 2000, cy 1500, w 1800, d 900 } by hand; the table at its
// top is asserted below against the engine that now makes them.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import {
  islandCorners, islandInsideRoom, migrateRoom, realWalls, rectCorners, rehomeIslandUnits, roomChangeGuard,
  roomWalls, wallLabel, wallName, wallNeighbours, wallsInScope, lCorners,
} from '../src/engine/room.js';
import { islandClash, newIsland } from '../src/engine/island.js';
import { cornersOf } from '../src/engine/corners.js';
import { roomDistances } from '../src/engine/dimensions.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const ISLAND = {
  id: 'is1', cx: 2000, cy: 1500, w: 1800, d: 900, rotation: 0,
};
const room = () => migrateRoom({ corners: rectCorners(4000, 3000), height: 2500, islands: [ISLAND] });

test('F9 · PROBE: the four faces are the probe\'s table, ring A, E1, B, E2, inward pointing out', () => {
  const faces = roomWalls(room()).slice(4);
  const row = (f) => [f.index, f.face, f.start.x, f.start.y, f.end.x, f.end.y, f.along.x + 0, f.along.y + 0,
    f.inward.x + 0, f.inward.y + 0, Math.round(f.angle * 1e4) / 1e4 + 0];
  assert.deepEqual(faces.map(row), [
    [4, 'A', 2900, 1050, 1100, 1050, -1, 0, 0, -1, -3.1416],
    [5, 'E1', 1100, 1050, 1100, 1950, 0, 1, -1, 0, -1.5708],
    [6, 'B', 1100, 1950, 2900, 1950, 1, 0, 0, 1, 0],
    [7, 'E2', 2900, 1950, 2900, 1050, 0, -1, 1, 0, 1.5708],
  ]);
  // The frame law every wall obeys: inward is the left normal of along.
  for (const f of faces) {
    assert.equal(f.inward.x, -f.along.y);
    assert.equal(f.inward.y, f.along.x);
    assert.equal(f.island, 'is1');
  }
  // The ring closes: each face's end is the next one's start (F1's external corners read it).
  for (let k = 0; k < 4; k += 1) assert.deepEqual(faces[k].end, faces[(k + 1) % 4].start);
  assert.equal(cornersOf({ units: [], walls: roomWalls(room()), profile: P }).filter((c) => c.kind === 'external').length, 4);
});

test('F9 · the record migrates: absent is none, present is kept, and migration is idempotent', () => {
  const plain = migrateRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  assert.equal('islands' in plain, false, 'a room saved before tonight migrates to "none", never islands: []');
  const r = room();
  assert.deepEqual(r.islands, [ISLAND]);
  assert.deepEqual(migrateRoom(r), r);
  // Rotation in quarter turns, sizes real.
  const odd = migrateRoom({ ...r, islands: [{ ...ISLAND, rotation: 100, w: -5 }] });
  assert.equal(odd.islands[0].rotation, 90);
  assert.ok(odd.islands[0].w >= 50);
  // Turned a quarter, the core is turned about its centre.
  assert.deepEqual(islandCorners({ ...ISLAND, rotation: 90 }).map((c) => [c.x, c.y]),
    [[2450, 2400], [2450, 600], [1550, 600], [1550, 2400]]);
});

test('F9 · a face is NOT plaster: never scoped, drawn, neighboured, opened or counted as a wall', () => {
  const r = room();
  assert.equal(realWalls(r).length, 4);
  assert.equal(roomWalls(r).length, 8);
  for (const scope of ['room', 'wall', 'two', 'three']) {
    assert.ok(wallsInScope(r, scope, P).every((w) => !w.island), `${scope} scope shows a face`);
  }
  assert.deepEqual(wallNeighbours(r, 0).prev, { wall: 3, end: 'end' }, 'wall 0 meets wall 3, not a face');
  assert.deepEqual(wallNeighbours(r, 3).next, { wall: 0, end: 'start' });
  // Named for what it is.
  assert.equal(wallName(roomWalls(r), 5), 'face E1 of island 1');
  assert.equal(wallLabel(roomWalls(r), 4), 'Island 1 · face A');
  assert.equal(wallLabel(roomWalls(r), 1), 'Wall 2');
  // Not dimensioned as a wall: the corner arrows on a face are dropped.
  const marks = roomDistances({
    walls: roomWalls(r),
    units: [{
      id: 'u', wall: 4, x_mm: 600, width: 600, depth: 560, level: 'floor',
    }],
  });
  assert.equal(marks.filter((m) => m.wall === 4 && m.kind === 'wall').length, 0);
  // The drawings read the building as plaster only (licensed, FROZEN 2).
  assert.match(read('src/engine/drawings/setPlan.js'), /const walls = realWalls\(room\);\n  for \(const wall of walls\) \{\n    const ops = openingsOnWall/);
  assert.match(read('src/engine/drawings/setSheet.js'), /realWalls\(room\)/);
  assert.match(read('src/engine/drawings/wallElevation.js'), /for \(const wall of walls\.filter\(\(w\) => !w\.island\)\)/);
});

test('F9 · Room refuses first: outside the polygon, on a unit, on a box, on another island', () => {
  const r = room();
  assert.equal(islandInsideRoom(r, ISLAND), true);
  const out = migrateRoom({ ...r, islands: [{ ...ISLAND, cx: 3800 }] });
  const guard = roomChangeGuard(out, []);
  assert.equal(guard.ok, false);
  assert.match(guard.message, /outside the room/);
  // An L room: the bite is outside.
  const L = migrateRoom({ corners: lCorners(4000, 3000, 1500, 1500), height: 2500, islands: [{ ...ISLAND, cx: 3200, cy: 2300, w: 600, d: 400 }] });
  assert.equal(islandInsideRoom(L, L.islands[0]), false);
  // On a unit standing on wall 0, deep enough to reach the island.
  const unit = {
    id: 'u1', type: 'BUD', position: { wall: 0, x_mm: 1500, rotation_deg: 0 }, params: { unit_num: '01', width: 600, depth: 1100, height: 720 },
  };
  assert.match(islandClash({ room: r, units: [unit], profile: P }), /Island 1 would stand on 01/);
  // On a box.
  const boxed = migrateRoom({ ...r, boxes: [{ id: 'b', x: 1900, y: 1400, w: 100, d: 100 }] });
  assert.match(islandClash({ room: boxed, units: [], profile: P }), /a box in the plan/);
  // On another island.
  const two = migrateRoom({ ...r, islands: [ISLAND, { ...ISLAND, id: 'is2', cx: 2200 }] });
  assert.match(islandClash({ room: two, units: [], profile: P }), /island 2/);
});

test('F9 · the default is the profile\'s, marked proposed, and a stored profile is given it', () => {
  assert.deepEqual(P.island.defaults, { w: 1800, d: 900 });
  const old = { ...P };
  delete old.island;
  assert.deepEqual(migrateCabinetProfile(old).island.defaults, { w: 1800, d: 900 });
  const isl = newIsland(migrateRoom({ corners: rectCorners(4000, 3000), height: 2500 }), P, 'x');
  assert.deepEqual([isl.cx, isl.cy, isl.w, isl.d, isl.rotation], [2000, 1500, 1800, 900, 0]);
  assert.match(read('src/engine/profile.js'), /defaults: \{ w: 1800, d: 900 \},\s+\/\/ T75 proposed, owner to confirm/);
});

test('F9 · the store: ADD ISLAND on a kitchen job, moves refused in words, a unit keeps its face through a room change', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  assert.equal(S().islandsAllowed(), true, 'a PRO job is a kitchen job by default');
  const add = S().addIsland();
  assert.equal(add.ok, true);
  const id = add.id;
  assert.equal(S().project.room.islands.length, 1);
  // A unit put on face A (the Wall select, `setUnitWall`) carries what it stands on.
  const placed = S().addUnit('BUD');
  assert.equal(S().setUnitWall(placed.id, 4).blocked, false);
  const u = S().units.find((x) => x.id === placed.id);
  assert.deepEqual([u.position.island, u.position.face], [id, 'A']);
  // A move into the wall is refused, naming what it would carry through it.
  const refused = S().moveIsland(id, 2000, 600);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /Island 1 would carry/);
  assert.equal(S().project.room.islands[0].cy, 1500, 'the island stays where it last fitted');
  // The room gains two corners: the island's faces move to new indices, and
  // the unit follows its FACE, not its old index.
  const grown = S().setRoom({ corners: lCorners(6000, 5000, 1000, 1000) });
  assert.equal(grown.ok, true);
  const walls = roomWalls(S().project.room);
  const now = S().units.find((x) => x.id === placed.id);
  assert.equal(walls[now.position.wall].island, id);
  assert.equal(walls[now.position.wall].face, 'A');
  assert.equal(now.position.wall, 6, 'six walls, so face A is index 6 now');
  // Rotation in quarter turns, through setRoom.
  assert.equal(S().rotateIsland(id).ok, true);
  assert.equal(S().project.room.islands[0].rotation, 90);
  // Removing it while a cabinet stands on it is refused in words.
  const gone = S().removeIsland(id);
  assert.equal(gone.ok, false);
  assert.match(gone.message, /Cannot remove the island while cabinets stand on it: move or remove them first \(01\)/);
});

test('F9 · re-homing is pure and stamps what a unit stands on', () => {
  const walls = roomWalls(room());
  const units = [{ id: 'a', position: { wall: 5, x_mm: 0 } }, { id: 'b', position: { wall: 1, x_mm: 0 } }];
  const homed = rehomeIslandUnits(units, walls);
  assert.deepEqual(homed[0].position, { wall: 5, x_mm: 0, island: 'is1', face: 'E1' });
  assert.equal(homed[1], units[1], 'a unit on plaster is untouched');
  assert.equal(rehomeIslandUnits(homed, walls), homed, 'a settled list is returned as it is');
});

test('F9 · a loaded project keeps its island and its units on their faces', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addIsland();
  const placed = S().addUnit('BUD');
  S().setUnitWall(placed.id, 6);
  const project = JSON.parse(JSON.stringify(S().project));
  const units = JSON.parse(JSON.stringify(S().units));
  S().newProject();
  S().loadProject(project, units);
  assert.equal(S().project.room.islands.length, 1);
  const u = S().units.find((x) => x.id === placed.id);
  assert.equal(roomWalls(S().project.room)[u.position.wall].face, 'B');
});

test('F9 · the UI: Room setup offers ADD ISLAND behind the kitchen gate, the plan draws it, its figures are fields', () => {
  const src = read('src/components/RoomModal.jsx');
  assert.match(src, /\{islandsAllowed && \(\n\s+<button[\s\S]*?data-room-add-island="1"[\s\S]*?Add island/);
  assert.match(src, /data-plan-island=\{isl\.id\}/);
  assert.match(src, /data-island-dim=\{`\$\{isl\.id\}:\$\{key\}`\}/);
  assert.match(src, /data-island-field=/);
  assert.match(src, /onFocus=\{\(e\) => e\.target\.select\(\)\}/, 'the T73 F3 field: focused and selected');
  assert.match(src, /data-island-rotate=/);
  assert.match(src, /data-island-remove=/);
  // The retail copy is the copy machine's (T69's rules), so it carries every hook PRO has.
  const retail = read('src/retail/design/room/RoomModal.jsx');
  for (const hook of ['data-room-add-island', 'data-plan-island', 'data-island-dim', 'data-island-field', 'data-island-rotate']) {
    assert.ok(retail.includes(hook), `retail lost ${hook}`);
  }
  // …and the gate is the job's family: a retail job is a wardrobe job.
  assert.match(read('src/stores/projectStore.js'), /islandsAllowed: \(\) => getProjectType\(migrateDesign\(get\(\)\.project\.design\)\.projectType\)\?\.category === 'kitchen'/);
});
