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

// ─── SUPERSEDED BY TURN 50 · F12 ────────────────────────────────────────────
//
// T49 gated the canned row on the door, and the owner then noticed that the two
// doors differ. CLAUDE.md T50-F12: *"Make them the same screen … if he has not
// said by the time this feature is reached, ship the wizard's version in both
// (no canned shapes anywhere)."* He has not, so `Rectangle` and `L-shape` are
// drawn in NEITHER door from turn 50.
//
// That is not a deletion, and the two tests below are what says why: what the
// canned shapes made, the WALL EDITOR now makes and names — a rectangle is four
// typed segments (T50-F1), which is the owner's own answer to how a room is
// drawn. And `+ Box` was never a canned shape at all; it is a chimney, a pillar,
// a boxed pipe, and T49 hid it in the wizard only by association with the row it
// stood in. It is drawn in both doors now.
test('F2/T50-F12 — the canned SHAPES are in neither door, and the wall editor is why', () => {
  assert.doesNotMatch(ROOM, /data-room-preset="rect"/, 'no Rectangle button, either door');
  assert.doesNotMatch(ROOM, /data-room-preset="L"/, 'no L-shape button, either door');
  assert.doesNotMatch(ROOM, /const setPreset = /, 'and no handler left standing behind them');
  // What replaced them, in the same corner of the same screen.
  assert.match(ROOM, /data-draw-walls="1"/, 'the wall editor is the door to a shape now');
  assert.match(ROOM, /data-wall-editor="1"/, 'and it is a real editor, not a preset');
});

test('F2/T50-F12 — + Box stands in BOTH doors, with the sentence that explains it', () => {
  assert.match(ROOM, /data-insert-box="1"[\s\S]{0,60}insertBox/, 'the button');
  assert.match(ROOM, /const insertBox = \(\) => \{/, 'and both functions behind it');
  assert.match(ROOM, /const removeBox = \(id\) => \{/);
  // The gate is on the SCOPE only — a one-wall job has no plan to put a chimney
  // in — and no longer on which door the editor was opened by.
  assert.match(ROOM, /\{scope === 'room' && \(/, 'scope decides, the door does not');
  assert.doesNotMatch(ROOM, /scope === 'room' && !wizard &&/, 'the T49 gate is gone');
  assert.match(ROOM, /' A BOX does: it stands floor to ceiling/, 'and the paragraph is unconditional too');
  assert.doesNotMatch(ROOM, /\{!wizard && ' A BOX does/, 'no longer hung off the door');
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

test('F2 — the wall editor was T50\u2019s, and T50 is where it arrived', () => {
  // T49 asserted the opposite of this line — *"that is T50's work, not this
  // turn's: do not start it here"* — and it held for T49's whole diff. The turn
  // it was waiting for is this one, so what the assertion protects now is that
  // the editor lives in its own ENGINE module and not as a second geometry
  // grown inside a React component.
  assert.match(ROOM, /from '\.\.\/engine\/wallDraw\.js'/, 'the arithmetic is the engine\u2019s');
  assert.doesNotMatch(ROOM, /Math\.atan2/, 'and no bearing is computed in the surface');
});
