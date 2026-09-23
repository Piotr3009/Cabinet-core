// ─── TURN 74 · F4 · SETUP ROOM: A NEW ROOM REPLACES THE OLD ONE ────────────
//
// The owner, 23.09.2026 (list point 2):
//
//   *"Przy tworzeniu nowego pokoju po starym jeden nachodzi na drugi zamiast
//   resetu."*
//
// The probe (`verify/t74/f04-probe.md`, real mouse, committed before the fix)
// convicted two sites: `setRoom` MERGES, so a drawn room kept the old room's
// window and slope; and retail's room window stayed under the drawing with its
// own draft of the old outline. These assertions are the probe's table.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { cornersOfPath, newPath, addSegment, closePath } from '../src/engine/drawRoom.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

/** A drawn rectangle, the engine's own way (`engine/drawRoom.js`). */
function drawn(w, d) {
  let path = newPath();
  for (const [dir, mm] of [['E', w], ['S', d], ['W', w]]) path = addSegment(path, dir, mm).path;
  return cornersOfPath(closePath(path).path);
}

/** The probe's OLD room: a window and a slope on wall 1, a box, one wardrobe. */
function oldRoom() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addOpening({ kind: 'window', wall: 0, x_mm: 1400, width: 1200, height: 1400, sill: 850 });
  S().setRoom({ boxes: [{ id: 'b1', x: 3000, y: 2000, w: 600, d: 400 }] });
  S().addWallSlope({ wall: 0, side: 'right', kind: 'slope' });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1000, height: 2100, depth: 600 } });
  assert.equal(S().project.room.openings.length, 1);
  assert.ok((S().project.wallSlopes || []).length >= 1, 'the old room has no slope to lose');
  assert.equal((S().project.room.boxes || []).length, 1);
  return id;
}

test('T74 F4 · a NEW room replaces the old: walls, openings, boxes and slopes of the old one go', () => {
  const unitId = oldRoom();
  const verdict = S().setRoom({ corners: drawn(5000, 3500) }, { replace: true });
  assert.equal(verdict.ok, true, verdict.message);
  const room = S().project.room;
  assert.deepEqual(room.corners.map((c) => [Math.round(c.x), Math.round(c.y)]),
    [[0, 0], [5000, 0], [5000, 3500], [0, 3500]]);
  assert.deepEqual(room.openings, [], 'the old room\'s window stands on the new room');
  assert.equal((room.boxes || []).length, 0, 'the old room\'s box stands in the new room');
  assert.deepEqual(S().project.wallSlopes, [], 'the old room\'s slope cuts the new room');
  // The height and the returns are the room's settings, not its geometry.
  assert.equal(room.height, 2500);
  // Cabinets are NOT deleted.
  assert.ok(S().units.some((u) => u.id === unitId), 'a cabinet was deleted');
});

test('T74 F4 · a refused new room clears NOTHING (the guard speaks first)', () => {
  const unitId = oldRoom();
  // A room too small for the wardrobe standing in it.
  const verdict = S().setRoom({ corners: drawn(600, 400) }, { replace: true });
  assert.equal(verdict.ok, false, 'a room smaller than its cabinet was accepted');
  assert.equal(S().project.room.openings.length, 1, 'the refusal cleared the window');
  assert.ok(S().project.wallSlopes.length >= 1, 'the refusal cleared the slope');
  assert.equal(S().project.room.boxes.length, 1, 'the refusal cleared the box');
  assert.ok(S().units.some((u) => u.id === unitId));
});

test('T74 F4 · without `replace`, setRoom is the merge it always was (an edit of THIS room)', () => {
  oldRoom();
  assert.equal(S().setRoom({ corners: rectCorners(4200, 3000) }).ok, true);
  assert.equal(S().project.room.openings.length, 1, 'a wall edit lost the window');
  assert.ok(S().project.wallSlopes.length >= 1, 'a wall edit lost the slope');
});

test('T74 F4 · both drawing windows: the FIRST save of a drawing is the new room', () => {
  for (const rel of ['src/components/DrawRoomModal.jsx', 'src/retail/design/room/DrawRoomModal.jsx']) {
    const src = uncomment(read(rel));
    assert.match(src, /const newRoom = useRef\(true\);/, `${rel} does not know a drawing is a new room`);
    assert.match(src, /setRoom\(\{ corners: cornersOfPath\(path\) \}, \{ replace: newRoom\.current \}\)/,
      `${rel} saves a drawn room as a merge`);
    // …and only the first: a window put on a NEW wall through its elevation
    // (the wall click saves, then the elevation adds) survives the next save.
    const save = src.slice(src.indexOf('const save = useCallback'), src.indexOf('const openWall'));
    assert.match(save, /newRoom\.current = false;/, `${rel} replaces on every save`);
    assert.ok(save.indexOf('newRoom.current = false;') > save.indexOf('if (!verdict?.ok)'),
      `${rel} forgets the new room before the guard has let it stand`);
  }
});

test('T74 F4 · retail: the drawing takes the room window\'s place, as PRO\'s does', () => {
  const room = uncomment(read('src/retail/design/DesignRoom.jsx'));
  assert.match(room, /const modalNow = useUiStore\(\(s\) => s\.modal\);/);
  assert.match(room, /useEffect\(\(\) => \{ if \(modalNow === 'draw-room'\) setRoomEditor\(null\); \}, \[modalNow\]\);/);
});

test('T74 F4 · one law, one path: the replace is `setRoom`\'s own, with its own guard', () => {
  const store = uncomment(read('src/stores/projectStore.js'));
  const body = store.slice(store.indexOf('setRoom: (patch, opts = {}) => {'), store.indexOf('previewRoom:'));
  assert.match(body, /const fresh = opts\?\.replace === true;/);
  assert.match(body, /openings: \[\], boxes: \[\],/);
  assert.match(body, /const verdict = roomChangeGuard\(next, s\.units\);\s*if \(!verdict\.ok\) return verdict;/);
  assert.match(body, /\.\.\.\(fresh \? \{ wallSlopes: \[\] \} : \{\}\)/);
  assert.ok(!/removeUnit|units: \[\]/.test(body), 'the new room deletes cabinets');
});
