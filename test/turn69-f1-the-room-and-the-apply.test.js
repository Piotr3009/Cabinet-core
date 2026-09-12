// ─── TURN 69 · F1 — 1/2/3 WALLS, AND APPLY WORKS ───────────────────────────
//
// CLAUDE.md, F1, verbatim:
//
//   *"The plan header's preset row becomes: **1 WALL · 2 WALLS · 3 WALLS ·
//   DRAW ROOM…** — IMPORT DXF is DELETED (owner: "to nie przejdzie").
//   3 WALLS = U (left + back + right): add scope `'three'` in `room.js` by the
//   `'two'` pattern, stubs on the two free ends, outside the cut path."*
//
//   *"**APPLY does nothing — probe first** (what fires, what the store
//   receives), commit the verdict, fix at the convicted site."*
//
// The probe is `scripts/t69-f1-probe.mjs` and its two runs are
// `verify/t69/f1-probe.md` (the diagnosis, committed BEFORE the cut) and
// `verify/t69/f1-probe-after.md` (the proof). This file is what stops either
// verdict from coming back.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  rectCorners, roomWalls, wallsInScope, wallIndicesInScope, wallStub, migrateRoom,
} from '../src/engine/room.js';
import { ROOM_SCOPES, normaliseScope } from '../src/engine/design.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const BOTH = ['src/components/RoomModal.jsx', 'src/retail/design/room/RoomModal.jsx'];

const S = () => useProjectStore.getState();
const room4 = (w = 4000, d = 3000) => migrateRoom({ corners: rectCorners(w, d), height: 2500 });

// ═══ 1 · THE VOCABULARY KNOWS THE WORD ══════════════════════════════════════

test('F1 · `three` is a scope the gate lets through', () => {
  assert.deepEqual([...ROOM_SCOPES], ['room', 'wall', 'two', 'three']);
  // The gate every stored project passes: a project saved on three walls
  // reopens on three walls, and not silently on four.
  assert.equal(normaliseScope('three'), 'three');
  assert.equal(normaliseScope('four'), 'room', 'an unknown word still means the whole room');
});

// ═══ 2 · THE U — THREE REAL WALLS, TWO STUBS, BOTH FROM THE OPEN SIDE ═══════

test('F1 · `three` draws walls 0, 1 and 2 and a stub at each free end', () => {
  const walls = wallsInScope(room4(), 'three');
  const real = walls.filter((w) => !w.stub);
  const stubs = walls.filter((w) => w.stub);

  assert.deepEqual(real.map((w) => w.index), [0, 1, 2], 'the U is three consecutive walls');
  assert.equal(stubs.length, 2, 'a stub at each of the run\'s two free ends');
  assert.deepEqual(wallIndicesInScope(room4(), 'three'), [0, 1, 2],
    'and a stub is never a wall a client stands furniture against');
});

test('F1 · the two returns are cut from the ONE wall the U leaves out', () => {
  const r = room4();
  const all = roomWalls(r);
  const stubs = wallsInScope(r, 'three').filter((w) => w.stub);
  assert.deepEqual([...new Set(stubs.map((w) => w.index))], [all.length - 1],
    'both returns come from the open side, because it is the only wall left');

  // One keeps each end, so they stand AT the two free corners and nowhere else.
  const open = all[all.length - 1];
  const at = (p) => `${Math.round(p.x)},${Math.round(p.y)}`;
  const touched = new Set(stubs.flatMap((w) => [at(w.start), at(w.end)]));
  assert.ok(touched.has(at(open.start)) && touched.has(at(open.end)),
    'a return that touches neither free corner is not a return');
});

test('F1 · the returns are the house\'s length, and never cross each other', () => {
  // A 4 m open side takes the workshop's own 2 m returns, exactly as one-wall
  // scope does — the `'two'` pattern, unchanged.
  const wide = migrateRoom({ corners: rectCorners(4000, 4000), height: 2500 });
  const house = wallStub(wide, null);
  const onWide = wallsInScope(wide, 'three').filter((w) => w.stub).map((w) => Math.round(w.width));
  assert.deepEqual(onWide, [house, house], 'a wide open side takes the house\'s own returns');

  // A narrow one cannot, and the arithmetic guard is what stops two returns
  // cut from one wall from crossing — which is geometry with no reading at all.
  const narrow = migrateRoom({ corners: rectCorners(4000, 2000), height: 2500 });
  const open = roomWalls(narrow)[roomWalls(narrow).length - 1].width;
  const onNarrow = wallsInScope(narrow, 'three').filter((w) => w.stub).map((w) => w.width);
  assert.ok(onNarrow.every((w) => w <= open / 2 + 1e-6),
    'two returns cut from one wall overlapped each other');
});

test('F1 · under four corners `three` returns the whole room, like every unknown scope', () => {
  const triangle = migrateRoom({ corners: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 0, y: 3000 }], height: 2500 });
  assert.equal(wallsInScope(triangle, 'three').length, roomWalls(triangle).length);
});

test('F1 · `wall` and `two` are byte-for-byte what they were', () => {
  // The new branch is ABOVE them; a law that changed its neighbours is a law
  // that was not added but rewritten.
  const r = room4();
  assert.deepEqual(
    wallsInScope(r, 'wall').map((w) => `${w.index}:${w.stub ? 's' : 'w'}:${Math.round(w.width)}`),
    ['0:w:4000', '3:s:2000', '1:s:2000'],
  );
  assert.deepEqual(
    wallsInScope(r, 'two').map((w) => `${w.index}:${w.stub ? 's' : 'w'}:${Math.round(w.width)}`),
    ['0:w:4000', '1:w:3000', '3:s:2000', '2:s:2000'],
  );
});

// ═══ 3 · THE ROW, IN BOTH APPS ══════════════════════════════════════════════

test('F1 · the row is 1 WALL · 2 WALLS · 3 WALLS · DRAW ROOM…, in both apps', () => {
  for (const rel of BOTH) {
    const src = read(rel);
    assert.match(src, /WALL_COUNTS = Object\.freeze\(\[/, `${rel} has no wall-count row`);
    for (const id of ['wall', 'two', 'three']) {
      assert.ok(src.includes(`id: '${id}'`), `${rel}'s row has no ${id} answer`);
    }
    for (const label of ['1 wall', '2 walls', '3 walls']) {
      assert.ok(src.includes(label), `${rel}'s row lost "${label}"`);
    }
    // DRAW ROOM… stays last, *"for walls with recesses or chimneys"*.
    assert.ok(src.indexOf('data-room-walls') < src.indexOf('data-room-draw'),
      `${rel} does not keep DRAW ROOM… last in the row`);
    // Pressing one writes the SCOPE and never geometry — one law, one place.
    assert.match(src, /onClick=\{\(\) => setDesign\(\{ scope: id \}\)\}/,
      `${rel}'s row writes something other than the scope`);
  }
});

test('F1 · IMPORT DXF is gone from both apps, and the engine keeps its importer', () => {
  for (const rel of BOTH) {
    const src = read(rel);
    assert.ok(!src.includes('data-import-dxf'), `${rel} still imports DXF`);
    assert.ok(!/proposeRoomFromDxf/.test(src), `${rel} still calls the DXF reader`);
    assert.ok(!src.includes('accept=".dxf'), `${rel} still has the file input`);
  }
  // LICENSED REMOVALS is about the BUTTON. Nothing in the engine died.
  assert.match(read('src/engine/dxfImport.js'), /export function proposeRoomFromDxf/);
});

// ═══ 4 · THE PROBE'S TWO VERDICTS, MADE PERMANENT ═══════════════════════════

test('F1 · VERDICT 1 — APPLY sends only what the window changed', () => {
  for (const rel of BOTH) {
    const src = read(rel);
    assert.match(src, /const verdict = setRoom\(changed\);/,
      `${rel} still sends the whole snapshotted draft`);
    assert.match(src, /base\.current/, `${rel} has no baseline to diff against`);
  }
});

test('F1 · a live write underneath survives APPLY', () => {
  // The window opens, the docked elevation editor adds a window to the wall,
  // APPLY sends the plan's own change. Before tonight the opening was lost.
  S().newProject();
  S().setRoom({ corners: rectCorners(3000, 3000), height: 2500 });
  const base = migrateRoom(S().project.room);
  const draft = migrateRoom({ ...base, height: 2700 });

  S().setRoom({ openings: [{ id: 'op_t69', kind: 'window', wall: 0, x_mm: 400, width: 900, height: 1200, sill: 850 }] });

  const changed = Object.fromEntries(
    Object.entries(draft).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(base[k])),
  );
  assert.deepEqual(Object.keys(changed), ['height'], 'the diff sent a key the window never edited');
  S().setRoom(changed);

  assert.equal(S().project.room.height, 2700, 'the plan\'s own edit did not land');
  assert.equal((S().project.room.openings || []).length, 1,
    'APPLY overwrote what the docked editor had just written');
});

test('F1 · VERDICT 2 — APPLY is never drawn dead, and the store still refuses', () => {
  for (const rel of BOTH) {
    const src = read(rel);
    assert.doesNotMatch(src, /onClick=\{apply\}\s+disabled=/,
      `${rel} still draws a dead, silent APPLY`);
    assert.match(src, /onClick=\{apply\} data-room-apply="1"/, `${rel} lost the APPLY hook`);
    // And the sentence is READ, not merely authored.
    assert.match(src, /notify\(verdict\.message, 'error'\)/, `${rel} swallows the refusal`);
  }

  // The refusal itself is the store's, exactly as it always was.
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 2000, height: 2400, depth: 600 } }) || {};
  S().updateUnitParams(id, { width: 2000, height: 2400, depth: 600 });
  const verdict = S().setRoom({ corners: rectCorners(1800, 3000) });
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /Cannot shrink the room below placed units/);
  assert.equal(Math.round(roomWalls(S().project.room)[0].width), 4000, 'the room moved anyway');
});
