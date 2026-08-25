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

test('F2 — the canned row is gated on the door, not deleted', () => {
  assert.match(ROOM, /scope === 'room' && !wizard &&/, 'the row renders behind the menu door only');
  // All three buttons still exist, by name, with their handlers.
  assert.match(ROOM, /data-room-preset="rect"[\s\S]{0,80}setPreset\('rect'\)/);
  assert.match(ROOM, /data-room-preset="L"[\s\S]{0,80}setPreset\('L'\)/);
  assert.match(ROOM, /data-insert-box="1"[\s\S]{0,60}insertBox/);
  // …and so do the functions behind them: `insertBox` and `removeBox` are the
  // room editor's, and the menu door still reaches every one of them.
  assert.match(ROOM, /const insertBox = \(\) => \{/);
  assert.match(ROOM, /const removeBox = \(id\) => \{/);
  assert.match(ROOM, /const setPreset = \(kind\) => \{/);
});

test('F2 — and the sentence that explains + Box goes with the button', () => {
  // A paragraph about a control that is not on the screen is the same offence
  // as the control. The menu door keeps both.
  assert.match(ROOM, /\{!wizard && ' A BOX does: it stands floor to ceiling/);
});

test('F2 — the ENGINE that made the canned shapes is untouched', () => {
  // Iron rule 2: nothing this turn goes near `src/engine/**`. `rectCorners`,
  // `lCorners` and the box list are exactly what they were — which is also why
  // the menu door loses nothing at all.
  const rect = rectCorners(4000, 3000);
  assert.equal(rect.length, 4);
  assert.equal(lCorners(4000, 3000, 1000, 1000).length, 6);
  assert.deepEqual(roomBoxes(migrateRoom({})), []);
});

test('F2 — and the WALL EDITOR was not started here (T50)', () => {
  // *"What a room needs instead is the wall editor, and that is T50's work,
  // not this turn's: do not start it here."* The room editor draws the plan it
  // has always drawn — walls dragged along their own normal and lengths typed —
  // and nothing in it has grown a direction-and-length walk tonight.
  assert.doesNotMatch(ROOM, /wallEditor|drawWall|WallDrawer|bearing|azimuth/i);
});
