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
