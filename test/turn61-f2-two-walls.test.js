// ─── TURN 61 · F2 — TWO WALLS ──────────────────────────────────────────────
//
// The owner: *"zrob 2 sciany, Elki bedziemy dokaldac"*, confirmed *"2 tak
// wystarczy"*. No corner carcass — the L-shape stays parked, so the two runs
// are independent and nothing new is cut where they meet.
//
// ─── IT IS THE ONE-WALL LAW WITH ONE MORE REAL WALL ────────────────────────
//
// That sentence is the whole design and this file is the check of it. Walls 0
// and 1 are ADJACENT — they share corner 1 — so the pair has exactly two FREE
// ends, and those two ends get the same `wallStub` returns one-wall mode gives
// its own two. "Real" stays the one thing it has ever been, the absence of the
// stub flag, and nothing downstream learns a new word.
//
// ─── AND WHY PRO CANNOT SEE IT ─────────────────────────────────────────────
//
// No PRO surface can WRITE `scope: 'two'` — the new-project flow offers two
// cards and neither is this one — so PRO's rendered output cannot move. That is
// the same fall-through argument the chrome channels make, on another axis, and
// the last test here is it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_WALL_STUB, rectCorners, wallIndicesInScope, wallsInScope,
} from '../src/engine/room.js';
import { ROOM_SCOPES, migrateDesign, normaliseScope } from '../src/engine/design.js';
import { normaliseScope as flowScope } from '../src/engine/projectTypes.js';
import * as A from '../src/retail/design/adapter.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const S = () => useProjectStore.getState();

const room = (w = 4000, d = 3000) => ({
  schema: 2, height: 2500, corners: rectCorners(w, d), openings: [],
});
const near = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

test('F2 · walls 0 and 1 are real, adjacent, and share corner 1', () => {
  const shown = wallsInScope(room(), 'two');
  const real = shown.filter((w) => !w.stub);
  assert.equal(real.length, 2, 'two walls, not one and not four');
  assert.deepEqual(real.map((w) => w.index), [0, 1]);
  assert.ok(near(real[0].end, real[1].start), 'the pair does not meet at a corner');
  assert.deepEqual(wallIndicesInScope(room(), 'two'), [0, 1]);

  // The lengths are the rectangle's own two sides — which is why WALL 2 WIDTH
  // is `rectCorners`' second argument and not a new number anywhere.
  assert.equal(Math.round(real[0].width), 4000);
  assert.equal(Math.round(real[1].width), 3000);
});

test('F2 · the two FREE ends get the returns one-wall mode gives its own two', () => {
  const shown = wallsInScope(room(), 'two');
  const real = shown.filter((w) => !w.stub);
  const stubs = shown.filter((w) => w.stub);
  assert.equal(stubs.length, 2);
  for (const stub of stubs) {
    assert.equal(Math.round(stub.width), DEFAULT_WALL_STUB, 'a return is not the house length');
    assert.ok(near(stub.end, real[0].start) || near(stub.start, real[1].end),
      'a return does not touch one of the pair\'s free ends');
    // The REAL index rides along, exactly as it does in one-wall mode, so a
    // unit standing on a wall is on the wall it always was.
    assert.ok([2, 3].includes(stub.index), 'a return lost its own wall index');
  }
  // The workshop's own number decides how long they are, and a room that STATES
  // one still wins — both are `wallStub`'s law and neither is re-written here.
  const tuned = { ...room(), wall_stub_mm: 1200 };
  for (const s of wallsInScope(tuned, 'two').filter((w) => w.stub)) {
    assert.equal(Math.round(s.width), 1200);
  }
  assert.equal(wallsInScope({ ...room(), wall_stub_mm: 0 }, 'two').length, 2,
    'with no returns at all there should be exactly the two real walls');
});

test('F2 · under four corners the whole room is returned — the degenerate guard', () => {
  // With three corners `walls[2]` and `walls[length - 1]` are the SAME wall and
  // both returns would be cut out of it. `'wall'` guards at three for its own
  // version of this; `'two'` needs four.
  const triangle = {
    schema: 2,
    height: 2500,
    corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 0, y: 3000 }],
    openings: [],
  };
  assert.equal(wallsInScope(triangle, 'two').length, 3, 'a triangle grew a return');
});

test('F2 · the two scopes PRO can write answer exactly what they answered', () => {
  assert.equal(wallsInScope(room(), 'wall').length, 3);
  assert.deepEqual(wallIndicesInScope(room(), 'wall'), [0]);
  assert.equal(wallsInScope(room(), 'room').length, 4);
  assert.deepEqual(wallIndicesInScope(room(), 'room'), [0, 1, 2, 3]);
  // An unknown word still means the whole room, as it always has.
  assert.equal(wallsInScope(room(), 'nonsense').length, 4);
});

// ─── AMENDED BY TURN 69 · F1 ──────────────────────────────────────────────
// A fourth word joined the vocabulary: `'three'` — a U, left + back + right,
// with a stub at each of the run's two free ends. CLAUDE.md F1 licenses
// `engine/room.js` for the geometry, and ONE word of `engine/design.js` for the
// gate, because a scope `room.js` can draw and `normaliseScope` downgrades is a
// scope that does not exist. Every other assertion below is unchanged, and the
// new word is held to exactly what `'two'` is held to.
test('F2, amended by T69 · ONE vocabulary — the migrator and the flow cannot disagree about a word', () => {
  assert.deepEqual([...ROOM_SCOPES], ['room', 'wall', 'two', 'three']);
  assert.equal(migrateDesign({ scope: 'three' }).scope, 'three', "'three' does not survive a save");
  // Literally the same function, not two copies that agree today.
  assert.equal(normaliseScope, flowScope,
    'engine/design.js and engine/projectTypes.js hold two normalisers');
  assert.equal(migrateDesign({ scope: 'two' }).scope, 'two', "'two' does not survive a save");
  assert.equal(migrateDesign({ scope: 'wall' }).scope, 'wall');
  assert.equal(migrateDesign({ scope: 'nonsense' }).scope, 'room');
  assert.equal(migrateDesign(null).scope, 'room');
});

test('F2 · a return under a rake is capped by the main it MEETS, not by walls[0]', () => {
  // T46 wrote `const main = walls[0]` because in one-wall scope there was one
  // main and both returns touched it. The return cut from wall 2 touches WALL
  // 1's end, so `walls[0]` answered null and that return lost its cap.
  const draw = read('src/3d/Room.jsx');
  assert.ok(!/const main = walls\[0\];/.test(draw),
    'stubCap still assumes there is only one main wall');
  assert.match(draw, /for \(const main of walls\) \{\s*\n\s*if \(main\.stub\) continue;/,
    'stubCap does not search the real walls for the one it touches');
});

test('F2 · the room, the chips and the second wardrobe — through the store alone', () => {
  A.startDesign('Bedroom wardrobe');
  A.addFirstWardrobe();
  assert.equal(A.wallChoice(S().project), 'wall', 'a fresh design shows one wall');

  assert.equal(A.setWallCount('two'), 'two');
  assert.equal(A.roomScope(S().project), 'two');
  assert.deepEqual(A.wallsShown(S().project, S().project.room), [0, 1]);

  // WALL 2 WIDTH is the rectangle's other side, written by the same `setSpace`.
  assert.equal(A.setSpace({ wall2Mm: 2400 }).ok, true);
  assert.equal(A.wallLengthMm(S().project.room, 1), 2400);
  assert.equal(A.wallLengthMm(S().project.room, 0), 4000, 'wall 1 moved wall 0');

  // ADD WARDROBE ON WALL 2 — the store's own add, then the store's own move.
  const added = A.addWardrobeOnWall(1);
  assert.equal(added.ok, true, added.said);
  assert.equal(A.unitWall(added.id), 1);
  assert.equal(A.unitsOnWall(0).length, 1);
  assert.equal(A.unitsOnWall(1).length, 1);

  // …and the WALL chip row moves one round the corner through `setUnitWall`,
  // whose refusal — when there is one — is the store's own sentence.
  const first = A.unitsOnWall(0)[0];
  const moved = A.setUnitWall(first.id, 1);
  if (!moved.ok) {
    assert.match(moved.said, /Wall 2 has no free space for this unit/,
      'the refusal is not the store\'s own sentence');
  } else {
    assert.equal(A.unitWall(first.id), 1);
  }
});

test('F2 · the STAGE HINT names the wall only once there is one to confuse it with', () => {
  A.startDesign('Bedroom wardrobe');
  A.addFirstWardrobe();
  const one = A.designUnit(S().units);
  S().addShelves(one.id, 2);
  const shelf = S().unitResult(one.id).panels.find((p) => p.part === 'SHELF');
  const sel = () => A.resolveSelection({ unitId: one.id, elementRef: shelf.id });
  assert.equal(A.selectionName(sel()), 'Shelf', 'one wardrobe should say nothing about walls');

  A.setWallCount('two');
  assert.equal(A.addWardrobeOnWall(1).ok, true);
  assert.equal(A.selectionName(sel()), 'Wall 1 wardrobe — Shelf');
});

// ─── AMENDED BY TURN 69 · F1 — THE KNOWN GAP IS HALF CLOSED, ON PURPOSE ───
//
// T61 stated a gap rather than hiding it: four frozen PRO surfaces read a
// `'two'` project as `'room'` or as "One wall", and since no PRO surface could
// MAKE one, PRO never saw one.
//
// Tonight `RoomModal.jsx` is licensed (CLAUDE.md F1, and T67's exemption
// RENEWED at a new hash) and its preset row is *"1 WALL · 2 WALLS · 3 WALLS ·
// DRAW ROOM…"*. So PRO can now write all three, and that window reads the scope
// through the vocabulary's own gate rather than through a ternary that knew one
// word. The gap is closed WHERE IT WAS LICENSED TO BE and nowhere else.
//
// WHAT IS STILL A GAP, stated the same way T61 stated it: the other three
// surfaces are frozen and untouched, so the new-project flow and the wizard
// still read `'two'` and `'three'` as "One wall" / the whole room. They no
// longer decide what PRO can HAVE — the room window does — they decide what
// those three screens SAY about it, and that is the night PRO's flow is
// licensed, not this one.
test('F2, amended by T69 · PRO writes the scope from ONE window, and reads it through the gate', () => {
  for (const rel of ['src/components/NewProjectFlow.jsx',
    'src/components/WizardSummary.jsx', 'src/components/WizardSettings.jsx']) {
    assert.ok(!/'two'/.test(read(rel)), `${rel} can produce a two-wall project`);
    assert.ok(!/'three'/.test(read(rel)), `${rel} can produce a three-wall project`);
  }
  const room = read('src/components/RoomModal.jsx');
  // The window that CAN, and the one place it does it.
  assert.match(room, /const WALL_COUNTS = Object\.freeze\(\[/);
  assert.match(room, /setDesign\(\{ scope: id \}\)/, 'the row stopped writing the scope');
  assert.equal((room.match(/setDesign\(\{ scope:/g) || []).length, 1,
    'the scope is written from more than one place in this window');
  // …and it READS through the vocabulary's gate, not through a ternary that
  // knows one word — which is what made `'two'` invisible to PRO for eight turns.
  assert.match(room, /normaliseScope\(st\.project\.design\?\.scope\)/,
    'the room window reads the scope with a ternary again');
  assert.doesNotMatch(room, /scope === 'wall' \? 'wall' : 'room'/,
    'the one-word ternary came back');
});
