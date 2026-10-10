// ─── T75 · F10 · UNITS ON THE FACES, THE ENDS, THE PANELS ───────────────────
//
// CLAUDE.md T75 F10: *"A unit is added to a face as to a wall (`addUnit` with
// the face's index; the library's plus points on the plan show the faces). The
// two long faces take runs back to back; an END face takes an END UNIT turned
// to face out ... The panel law extended to backs: "bok karkasu nigdy nie
// zostaje widoczny" holds for a BACK on an island. An empty long face gets an
// auto BACK PANEL (front material, the end panel's height law, role
// `back_panel`); an empty end face gets the auto END PANEL the free end of a
// run already gets (`endPanelAuto`), sized to the whole island depth. A unit
// added to a face takes the automat's panel off (the vanishing law); a panel
// the client added by hand stays. Plinth: one per face, 45° mitres at the
// island's four external corners (F6)."*
//
// The owner, 9.10.2026: *"twoja droga, plus dodawanie szafek po bokach lub end
// panele, w całości."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { runEnd } from '../src/engine/runs.js';
import { ELEMENT_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { elementKind } from '../src/engine/elements.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';

const S = () => useProjectStore.getState();
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const panelsOf = () => S().units.filter((u) => u.params.island_auto === true)
  .map((u) => [u.position.face, u.params.island_panel, u.position.x_mm, u.params.width, u.params.height]);

function island() {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 4000), height: 2500 });
  return S().addIsland().id;
}

test('F10 · an empty island is covered: a back panel on each long face, an end panel across each end', () => {
  island();
  const reach = 10 + P.front.thickness; // the wall gap and the board
  assert.deepEqual(panelsOf(), [
    ['A', 'back', 0, 1800, 870],
    ['E1', 'end', -reach, reach + 900 + reach, 870],
    ['B', 'back', 0, 1800, 870],
    ['E2', 'end', -reach, reach + 900 + reach, 870],
  ]);
  // The end panel's height law: a base unit's top above the floor.
  const back = S().units.find((u) => u.params.island_panel === 'back');
  const r = S().unitResult(back.id);
  const board = r.panels.find((p) => p.role === 'back_panel');
  assert.ok(board);
  assert.equal(board.material_role, 'front', 'front material');
  assert.equal(board.thickness, P.front.thickness, 'at the front\'s thickness');
  assert.equal(board.w, 1800);
  assert.ok(r.csvLines.some((l) => /,BACK-PANEL,1800,870,/.test(l)), r.csvLines.join('\n'));
  assert.equal(ELEMENT_TO_PART_ID['BACK-PANEL'], 'back_panel');
  assert.equal(PART_REGISTRY.back_panel.materialType, 'front');
  assert.equal(ELEMENT_TO_PART_ID['ISLAND-END-PANEL'], 'end_panel');
  assert.equal(elementKind({ part: 'BACK-PANEL', role: 'back_panel' }), 'free-panel');
});

test('F10 · the vanishing law: a unit added to a face takes the automat\'s panel off, the end panels grow', () => {
  island();
  const placed = S().addUnit('BUD', { wall: 4 });
  assert.equal(placed.error, null);
  const unit = S().units.find((u) => u.id === placed.id);
  assert.equal(unit.position.face, 'A');
  assert.equal(unit.params.side_infill_left_mm, 0, 'no scribe against a face');
  assert.equal(unit.params.side_infill_right_mm, 0);
  const faceA = 10 + unit.params.depth + P.doors.gap + unit.params.front_t;
  const empty = 10 + P.front.thickness;
  assert.deepEqual(panelsOf(), [
    ['E1', 'end', -faceA, faceA + 900 + empty, 870],
    ['B', 'back', 0, 1800, 870],
    ['E2', 'end', -empty, empty + 900 + faceA, 870],
  ]);
  // …and the cause gone, the panel comes back.
  S().removeUnit(placed.id);
  assert.equal(panelsOf().filter(([f]) => f === 'A').length, 1);
});

test('F10 · a face runs to its ends: no wall margin, and its end is a free end, not a wall', () => {
  island();
  const a = S().addUnit('BUD', { wall: 4 });
  S().moveUnit(a.id, 0, 0);
  assert.equal(S().units.find((u) => u.id === a.id).position.x_mm, 0, 'a cabinet stands at the face\'s very end');
  const unit = S().units.find((u) => u.id === a.id);
  const run = { wall: 4, units: [unit], left: 0, right: unit.params.width };
  assert.equal(runEnd(run, 'left', { wallWidth: 1800, roomHeight: 2500, island: true }, P).kind, 'open');
  assert.equal(runEnd(run, 'left', { wallWidth: 1800, roomHeight: 2500 }, P).kind, 'wall', 'plaster is still plaster');
});

test('F10 · back to back, and an END unit turned to face out', () => {
  island();
  assert.equal(S().addUnit('BUD', { wall: 4 }).error, null);
  assert.equal(S().addUnit('BUD', { wall: 6 }).error, null);
  const end = S().addUnit('BUDR', { wall: 5 });
  assert.equal(end.error, null);
  const walls = roomWalls(S().project.room);
  const e = S().units.find((u) => u.id === end.id);
  assert.equal(walls[e.position.wall].face, 'E1');
  // It faces OUT: its frame's inward points away from the core.
  assert.deepEqual([walls[5].inward.x + 0, walls[5].inward.y + 0], [-1, 0]);
  // Two faces with cabinets, one end with a unit: only E2 keeps a panel.
  assert.deepEqual(panelsOf().map(([f, k]) => `${f}:${k}`), ['E2:end']);
});

test('F10 · a panel the client put on a face by hand stays, and holds the automat off that face', () => {
  island();
  const hand = S().addUnit('FREE_PANEL', { wall: 6 });
  assert.equal(hand.error, null);
  assert.equal(panelsOf().filter(([f]) => f === 'B').length, 0, 'the hand panel covers face B');
  S().addUnit('BUD', { wall: 4 });
  assert.ok(S().units.some((u) => u.id === hand.id), 'the client\'s panel stays');
});

test('F10 · the plinth: one per face, and a 45° mitre round an external corner both runs reach', () => {
  island();
  const ids = [S().addUnit('BUD', { wall: 4 }).id, S().addUnit('BUD', { wall: 4 }).id, S().addUnit('BUD', { wall: 4 }).id];
  const e = S().addUnit('BUD', { wall: 5 }).id;
  S().moveUnit(e, 0, 0);
  const owner = S().units.filter((u) => ids.includes(u.id)).sort((x, y) => x.position.x_mm - y.position.x_mm)[0];
  const kickE = 10 + S().units.find((u) => u.id === e).params.depth - P.autoParts.plinth.setback;
  const kickA = 10 + owner.params.depth - P.autoParts.plinth.setback;
  const elE = S().runElements[e].plinth;
  assert.deepEqual(elE.mitres, [{ side: 'left', mm: kickA, deg: 45, external: true }]);
  const elA = S().runElements[owner.id].plinth;
  assert.deepEqual(elA.mitres, [{ side: 'right', mm: kickE, deg: 45, external: true }]);
  // Cut: the E1 kick is carried on across the corner square.
  const kick = S().unitResult(e).panels.find((p) => p.id === 'PLINTH');
  assert.equal(kick.box.x, -kickA);
  assert.deepEqual(kick.meta.mitres, elE.mitres);
});

test('F10 · the plus on an empty face opens the library ON that face', () => {
  useUiStore.getState().openLibraryToInsert('base', { wall: 6 });
  assert.deepEqual(useUiStore.getState().libraryInsert, { wall: 6 });
  useUiStore.getState().openLibraryToInsert('base', { near: 'u1', side: 'left' });
  assert.deepEqual(useUiStore.getState().libraryInsert, { near: 'u1', side: 'left' });
  useUiStore.getState().closeLibrary();
  assert.match(read('src/3d/Scene.jsx'), /function IslandFacePluses\(/);
  assert.match(read('src/3d/Scene.jsx'), /openLibraryToInsert\(categoryOf\('BUD'\)\?\.id \|\| null, \{ wall: wall\.index \}\)/);
  assert.match(read('src/components/LibraryPanel.jsx'), /\.\.\.\(onFace \? \{ wall: insertAt\.wall \} : \{\}\)/);
  // A face is only ever tried when it is asked for.
  island();
  S().addUnit('BUD');
  assert.ok(!roomWalls(S().project.room)[S().units.at(-1).position.wall].island, 'the go-round never lands on an island');
});

test('F10 · the Wall select names a face for what it is', () => {
  assert.match(read('src/components/RightPanel.jsx'), /\{wallLabel\(walls, w\.index\)\} · \{formatMm\(w\.width\)\} mm/);
});

test('F10 · the vanishing law holds on the Wall select too, and a refusal puts the panel back', () => {
  island();
  const u = S().addUnit('BUD').id;
  assert.equal(S().setUnitWall(u, 6).blocked, false, 'onto face B, its back panel leaving first');
  assert.equal(panelsOf().filter(([f]) => f === 'B').length, 0);
  // A unit too wide for an end face is refused, and E1 keeps its panel.
  const wide = S().addUnit('BUD', { params: { width: 1200 } }).id;
  assert.equal(S().setUnitWall(wide, 5).blocked, true);
  assert.equal(panelsOf().filter(([f]) => f === 'E1').length, 1);
});

test('F10 · an empty island is removed whole, its automat panels with it', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addIsland();
  assert.ok(S().units.length > 0, 'the automat covered the empty faces');
  const gone = S().removeIsland(id);
  assert.equal(gone.ok, true);
  assert.equal(S().project.room.islands, undefined);
  assert.equal(S().units.length, 0, 'no panel outlives its island');
});
