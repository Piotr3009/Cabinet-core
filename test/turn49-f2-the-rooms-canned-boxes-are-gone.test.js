import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { migrateRoom, roomBoxes, rectCorners, lCorners } from '../src/engine/room.js';

// ─── TURN 49 · F2 — THE ROOM'S CANNED BOXES ARE GONE ────────────────────────
//
// The owner, 25.08.2026: *"a room ustawienie z gory to usun boxy, to bez
// sensu."*
//
// The wizard's room step opened with three PRE-MADE shapes on offer —
// Rectangle, L-shape, + Box — before anybody had said a word about the job. A
// plan that arrives already pretending to be somebody's kitchen has to be
// undone before the real room can be typed in, which is the "z góry" he means.
//
// NOTHING IS DELETED (iron rule 4). The three buttons are the MENU door's,
// where there is a room to reshape and "make this a rectangle again" is exactly
// what a hand reaches for. What changed is which door draws them.

const ROOM = readFileSync(new URL('../src/components/RoomModal.jsx', import.meta.url), 'utf8');
const FLOW = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');

test('F2 — the editor knows which door it came through, and the flow says so', () => {
  assert.match(ROOM, /wizard = false/, 'the prop, defaulting to the menu door');
  assert.match(ROOM, /data-room-door=\{wizard \? 'wizard' : 'menu'\}/);
  // The flow's room step passes it. Everything else about the step is T7's.
  const step = FLOW.slice(FLOW.indexOf('<RoomModal'), FLOW.indexOf('/>', FLOW.indexOf('<RoomModal')));
  assert.match(step, /\n\s+wizard\n/, 'the wizard door is declared');
});

// ─── SUPERSEDED BY TURN 50 · F12, AND REVERSED BY TURN 51 · F1 ─────────────
//
// T49 gated the canned row on the door. T50-F12 made the two doors one screen
// by taking `Rectangle` and `L-shape` out of BOTH, and said the WALL EDITOR
// replaced them. The owner walked that the next morning, 26.08.2026:
//
//   *"drawing room w ogóle nie ma sensu — cofnij całkowicie to i zostaw
//   dodawanie wnęki i boxa jak wcześniej, ale żeby działało."*
//
// With the replacement struck out the two buttons come back, and T51's own F1
// names them: *"Rectangle, L-shape, + Box, Import DXF plan stays and must
// WORK"*, and *"Settings ▸ Room setup and the wizard's room step must show the
// SAME screen."*  So: ONE screen, FOUR tools, BOTH doors.
test('F1/T51 — the four tools are drawn, in one screen, in both doors', () => {
  assert.match(ROOM, /data-room-preset="rect"/, 'Rectangle is back');
  assert.match(ROOM, /data-room-preset="L"/, 'L-shape is back');
  assert.match(ROOM, /data-insert-box="1"/, '+ Box stands beside them');
  assert.match(ROOM, /Import DXF plan/, 'and so does the DXF import');
  assert.match(ROOM, /const setPreset = \(kind\) => \{/, 'with the handler the two shapes need');
  // ONE screen: the row is drawn on no condition at all — not the door it was
  // opened by, and (T51-F1's own bug) not the scope either.
  assert.match(
    ROOM,
    /data-room-tools="1"[\s\S]{0,400}data-insert-box="1"/,
    'the four live in one row',
  );
  assert.doesNotMatch(ROOM, /\{wizard && [\s\S]{0,80}data-room-preset/, 'no door gate');
});

test('F1/T51 — the wall editor is gone, surface and module', () => {
  assert.doesNotMatch(ROOM, /^import .*wallDraw/m, 'the module is not imported');
  assert.doesNotMatch(ROOM, /data-draw-walls|data-wall-editor|data-wall-draft/, 'and no surface is left');
});

// ─── F1/T51: THE BUG THE SCOPE GATE WAS ────────────────────────────────────
//
// T50's own test asserted `{scope === 'room' && (` around the tools row and
// called it right — *"a one-wall job has no plan to put a chimney in"*. It has:
// the plan draws the whole room in either scope, a chimney is a chimney, and
// the owner's *"nie pokazuje się"* was literally true because in a ONE-WALL
// job there was no button on the screen at all.
test('F1/T51 — + Box is reachable in a ONE-WALL job, which is where it was not', () => {
  const row = ROOM.slice(ROOM.indexOf('data-room-tools="1"'), ROOM.indexOf('data-insert-box="1"'));
  assert.doesNotMatch(row, /scope === 'room'/, 'the scope no longer gates the row');
  assert.match(ROOM, /const insertBox = \(\) => \{/, 'and both functions behind it stand');
  assert.match(ROOM, /const removeBox = \(id\) => \{/);
  assert.match(ROOM, /' A BOX does: it stands floor to ceiling/, 'the paragraph is unconditional');
  assert.doesNotMatch(ROOM, /\{!wizard && ' A BOX does/, 'no longer hung off the door');
});

test('F2 — the ENGINE that made the canned shapes is untouched', () => {
  // `rectCorners`, `lCorners` and the box list are exactly what they were,
  // which is why nothing had to be rebuilt to put the two buttons back.
  const rect = rectCorners(4000, 3000);
  assert.equal(rect.length, 4);
  assert.equal(lCorners(4000, 3000, 1000, 1000).length, 6);
  assert.deepEqual(roomBoxes(migrateRoom({})), []);
});

test('F2 — the wall editor came at T50 and went at T51', () => {
  // T49 refused to start it, T50 built it, and the owner struck it out the
  // morning after: *"drawing room w og\u00f3le nie ma sensu \u2014 cofnij ca\u0142kowicie
  // to."*  So the module is gone and this is what the assertion protects now:
  // it did not come back into the COMPONENT on its way out. A bearing computed
  // in a React file is the second geometry T49 refused, whichever turn writes
  // it.
  assert.doesNotMatch(ROOM, /^import .*wallDraw/m, 'the wall editor module is not imported');
  assert.doesNotMatch(ROOM, /data-draw-walls|data-wall-editor|data-wall-draft/, 'and none of its surface is left');
  assert.doesNotMatch(ROOM, /Math\.atan2/, 'and no bearing is computed in the surface');
});
