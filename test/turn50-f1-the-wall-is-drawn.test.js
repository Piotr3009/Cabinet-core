// ─── T50 · F1: THE WALL EDITOR — DIRECTION, THEN LENGTH ────────────────────
//
// The owner, 25.08.2026, and CLAUDE.md quotes him as the specification:
//
//   *"rysowanie ściany poprzez dodawanie kresek i wpisywanie długości odcinka
//   ściany — czyli zaznaczasz kierunek, a później długość wpisujesz.
//   domyślnie jak inny kierunek to 90 stopni, chyba że wpiszesz inny kąt."*
//
// Six things are asked of it and every one of them is asked here:
//   a direction is indicated and a length typed;
//   a change of direction is 90° BY DEFAULT and the field is overtypable;
//   each segment shows its length;
//   a drawn segment can be re-typed WITHOUT starting again;
//   Undo takes back ONE SEGMENT;
//   closing onto the start finishes the room, and an open chain is valid and
//   is NOT forced closed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_TURN_DEG, CLOSE_TOLERANCE_MM,
  newDraft, draftPoints, draftSegments, draftEnd, draftHeading,
  headingChoices, aimHeading, aimLength, addSegment, setSegmentLength,
  setSegmentHeading, undoSegment, isClosed, closingGapMm, segmentIssue,
  draftToCorners, drawnWallCount, draftFromCorners, rectDraft, normaliseDeg, deltaDeg,
} from '../src/engine/wallDraw.js';
import {
  MIN_WALL_LENGTH, migrateRoom, roomWalls, drawnWalls, rectCorners, validateRoomShape,
} from '../src/engine/room.js';

const at = (draft, i) => draftPoints(draft)[i];

/** A four-wall room, drawn the way the owner describes drawing one. */
function drawRectangle(w = 4000, d = 3000) {
  let draft = newDraft({ x: 0, y: 0 });
  draft = addSegment(draft, { headingDeg: 0, lengthMm: w });
  draft = addSegment(draft, { headingDeg: 90, lengthMm: d });
  draft = addSegment(draft, { headingDeg: 180, lengthMm: w });
  draft = addSegment(draft, { headingDeg: 270, lengthMm: d });
  return draft;
}

// ─── THE TWO GESTURES ───────────────────────────────────────────────────────

test('F1 · a segment is a direction and a typed length, and the chain grows one at a time', () => {
  let draft = newDraft({ x: 100, y: 200 });
  assert.deepEqual(draftPoints(draft), [{ x: 100, y: 200 }], 'a fresh draft is its start point');
  assert.equal(draftHeading(draft), null, 'and it is aimed at nothing yet');

  draft = addSegment(draft, { headingDeg: 0, lengthMm: 3600 });
  assert.equal(draftSegments(draft).length, 1);
  assert.deepEqual(at(draft, 1), { x: 3700, y: 200 }, '3600 along +x from the start');
  assert.equal(draftHeading(draft), 0);

  draft = addSegment(draft, { headingDeg: 90, lengthMm: 2400 });
  assert.deepEqual(at(draft, 2), { x: 3700, y: 2600 }, 'and 2400 into the room');
});

test('F1 · a segment shorter than the room model’s own minimum is refused with a reason', () => {
  const draft = newDraft({ x: 0, y: 0 });
  assert.equal(segmentIssue(3000), null, 'a real wall passes');
  assert.equal(segmentIssue(MIN_WALL_LENGTH), null, 'the minimum itself passes');

  const issue = segmentIssue(MIN_WALL_LENGTH - 1);
  assert.ok(issue, 'one millimetre under it does not');
  assert.match(issue, new RegExp(String(MIN_WALL_LENGTH)), 'and the message names the minimum');
  assert.equal(segmentIssue(0), 'Type the length of this wall in millimetres.');

  assert.equal(draftSegments(addSegment(draft, { headingDeg: 0, lengthMm: 50 })).length, 0,
    'and the draft does not take it');
});

// ─── 90° BY DEFAULT, AND OVERTYPABLE ───────────────────────────────────────

test('F1 · a change of direction is 90° by default — and only ever three choices', () => {
  assert.equal(DEFAULT_TURN_DEG, 90, 'the owner’s own default');

  const first = newDraft({ x: 0, y: 0 });
  assert.deepEqual(headingChoices(first), [0, 90, 180, 270],
    'a FIRST wall has no wall to turn from, so it takes the four axes');

  const running = addSegment(first, { headingDeg: 0, lengthMm: 3000 });
  assert.deepEqual(headingChoices(running), [0, 90, 270],
    'after one wall: straight on, or a right angle either way');
});

test('F1 · …unless you type another angle', () => {
  const running = addSegment(newDraft({ x: 0, y: 0 }), { headingDeg: 0, lengthMm: 3000 });
  assert.deepEqual(headingChoices(running, 45), [0, 45, 315],
    'a bay at 45 is 45 in the field, and the two turns follow it');
  // …and the field going back to 90 puts the right angle back, with nothing
  // remembered about the 45: the angle is a field, not a mode.
  assert.deepEqual(headingChoices(running, 90), [0, 90, 270]);
});

test('F1 · the POINTER indicates the direction — it does not have to land on 90.0000°', () => {
  const running = addSegment(newDraft({ x: 0, y: 0 }), { headingDeg: 0, lengthMm: 3000 });
  // The chain ends at (3000, 0). A hand that means "turn into the room" lands
  // somewhere down and a little forward of it.
  assert.equal(aimHeading(running, { x: 3260, y: 1800 }, 90), 90, 'nearest of the three is the turn');
  assert.equal(aimHeading(running, { x: 5200, y: 120 }, 90), 0, 'and carrying straight on reads as 0');
  assert.equal(aimHeading(running, { x: 3100, y: -2200 }, 90), 270, 'the other way is the other turn');
  assert.equal(aimHeading(running, { x: 3000, y: 0 }, 90), null,
    'a pointer that has not moved off the end indicates nothing');
});

test('F1 · the length the pointer reaches is measured ALONG the direction it chose', () => {
  const running = addSegment(newDraft({ x: 0, y: 0 }), { headingDeg: 0, lengthMm: 3000 });
  // 1800 into the room and 260 off the line: the wall is 1800, not 1818.7.
  assert.equal(aimLength(running, { x: 3260, y: 1800 }, 90), 1800);
  assert.equal(aimLength(running, { x: 1000, y: 0 }, 0), 0, 'and it never goes backwards');
});

// ─── EVERY SEGMENT SHOWS ITS LENGTH, AND CAN BE RE-TYPED ───────────────────

test('F1 · a drawn segment is re-typed without starting again — the rest travels with it', () => {
  let draft = drawRectangle(4000, 3000);
  assert.deepEqual(at(draft, 4), { x: 0, y: 0 }, 'it closed on its own start');

  // The joiner measures again: the first wall is 4500, not 4000.
  draft = setSegmentLength(draft, 0, 4500);
  assert.equal(draftSegments(draft)[0].length, 4500, 'the wall is re-typed');
  assert.equal(draftSegments(draft).length, 4, 'and nothing was re-drawn');
  assert.equal(draftSegments(draft)[1].length, 3000, 'the walls after it keep their own numbers');
  assert.deepEqual(at(draft, 1), { x: 4500, y: 0 }, 'they simply travel with it');
  assert.deepEqual(at(draft, 2), { x: 4500, y: 3000 });
  assert.deepEqual(at(draft, 4), { x: 500, y: 0 }, 'so the outline is now 500 mm open — which is TRUE');

  // A bad number is refused at the field, not accepted and repaired.
  const before = draftSegments(draft)[0].length;
  assert.equal(draftSegments(setSegmentLength(draft, 0, 12))[0].length, before);
});

test('F1 · a drawn segment can be re-aimed too, by the same rule', () => {
  let draft = drawRectangle();
  draft = setSegmentHeading(draft, 1, 45);
  assert.equal(draftSegments(draft)[1].deg, 45);
  assert.equal(draftSegments(draft).length, 4, 'still four segments');
});

// ─── UNDO TAKES BACK ONE SEGMENT ───────────────────────────────────────────

test('F1 · Undo takes back ONE SEGMENT, never the whole wall', () => {
  const four = drawRectangle();
  const three = undoSegment(four);
  assert.equal(draftSegments(three).length, 3, 'one came off');
  assert.deepEqual(draftSegments(three), draftSegments(four).slice(0, 3), 'and it was the LAST one');

  const two = undoSegment(three);
  const one = undoSegment(two);
  const none = undoSegment(one);
  assert.equal(draftSegments(none).length, 0, 'four undos take four segments');
  assert.deepEqual(draftPoints(none), [{ x: 0, y: 0 }], 'and the start point is still there');
  assert.equal(draftSegments(undoSegment(none)).length, 0, 'an empty draft undoes to itself');
});

// ─── CLOSING, AND NOT BEING FORCED TO ──────────────────────────────────────

test('F1 · closing the outline back onto the start finishes the room', () => {
  const draft = drawRectangle(4000, 3000);
  assert.equal(closingGapMm(draft), 0);
  assert.equal(isClosed(draft), true);

  const corners = draftToCorners(draft);
  assert.equal(corners.length, 4, 'four corners, not five — the duplicate goes');
  assert.deepEqual(corners, rectCorners(4000, 3000).map((c) => ({ x: c.x, y: c.y })),
    'and it is the rectangle it was drawn as');
  assert.deepEqual(validateRoomShape(corners), [], 'a room the model accepts');
});

test('F1 · a chain that comes back NEAR the start closes; one that does not, does not', () => {
  let draft = newDraft({ x: 0, y: 0 });
  draft = addSegment(draft, { headingDeg: 0, lengthMm: 4000 });
  draft = addSegment(draft, { headingDeg: 90, lengthMm: 3000 });
  draft = addSegment(draft, { headingDeg: 180, lengthMm: 4000 });
  draft = addSegment(draft, { headingDeg: 270, lengthMm: 2900 });
  assert.equal(closingGapMm(draft), 100);
  assert.equal(isClosed(draft, CLOSE_TOLERANCE_MM), true, '100 mm out is on the start');

  const wide = setSegmentLength(draft, 3, 2000);
  assert.equal(closingGapMm(wide), 1000);
  assert.equal(isClosed(wide, CLOSE_TOLERANCE_MM), false, 'a metre out is not');
});

test('F1 · an OPEN chain is a valid L job and is NOT forced closed', () => {
  let draft = newDraft({ x: 0, y: 0 });
  draft = addSegment(draft, { headingDeg: 0, lengthMm: 4000 });
  draft = addSegment(draft, { headingDeg: 90, lengthMm: 3000 });
  assert.equal(isClosed(draft), false, 'two walls are not a closed room');

  const corners = draftToCorners(draft);
  assert.equal(corners.length, 3, 'the three corners the two walls have');
  assert.deepEqual(corners[0], { x: 0, y: 0 });
  assert.deepEqual(corners[1], { x: 4000, y: 0 });
  assert.deepEqual(corners[2], { x: 4000, y: 3000 });
  assert.deepEqual(validateRoomShape(corners), [], 'and the floor is cut from it');

  assert.equal(drawnWallCount(draft), 2, 'TWO of its walls were drawn');
  const room = migrateRoom({ height: 2500, corners, drawn_walls: drawnWallCount(draft) });
  assert.equal(roomWalls(room).length, 3, 'the polygon still closes — a floor comes from something');
  assert.equal(drawnWalls(room), 2, 'but the app knows the third was never typed');
});

test('F1 · one segment is a ONE-WALL job, and it stands in a room', () => {
  const draft = addSegment(newDraft({ x: 0, y: 0 }), { headingDeg: 0, lengthMm: 3600 });
  const corners = draftToCorners(draft, { depth: 2000 });
  assert.equal(corners.length, 4, 'the wall, and the box it stands in');
  const room = migrateRoom({ height: 2500, corners, drawn_walls: drawnWallCount(draft) });
  const walls = roomWalls(room);
  assert.equal(walls.length, 4);
  assert.equal(Math.round(walls.find((w) => w.index === 0).width), 3600, 'wall 1 is the wall he drew');
  assert.equal(drawnWalls(room), 1, 'and it is the only one he drew');
});

test('F1 · a first wall drawn DOWN the plan gives a room standing that way', () => {
  const draft = addSegment(newDraft({ x: 0, y: 0 }), { headingDeg: 90, lengthMm: 3600 });
  const corners = draftToCorners(draft, { depth: 2000 });
  // The wall runs +y; the room therefore stands off it in −x.
  assert.deepEqual(corners[0], { x: 0, y: 0 });
  assert.deepEqual(corners[1], { x: 0, y: 3600 });
  assert.deepEqual(corners[2], { x: -2000, y: 3600 });
  assert.deepEqual(validateRoomShape(corners), [], 'still a room');
});

// ─── READING A ROOM BACK, SO THE EDITOR IS NOT ONE-WAY ─────────────────────

test('F1 · every corner list is a chain of segments — the editor re-enters a room', () => {
  const back = draftFromCorners(rectCorners(4000, 3000));
  assert.equal(draftSegments(back).length, 4);
  assert.deepEqual(draftToCorners(back), rectCorners(4000, 3000).map((c) => ({ x: c.x, y: c.y })),
    'out and back is the room it started as');
  assert.deepEqual(draftSegments(rectDraft(4000, 3000)), draftSegments(back));
});

// ─── THE ARITHMETIC ITSELF ─────────────────────────────────────────────────

test('F1 · bearings are normalised and differences are signed', () => {
  assert.equal(normaliseDeg(-90), 270);
  assert.equal(normaliseDeg(450), 90);
  assert.equal(deltaDeg(350, 10), 20, 'across the wrap');
  assert.equal(deltaDeg(10, 350), -20);
  assert.equal(deltaDeg(0, 180), 180);
});

test('F1 · draftEnd is where the chain has got to', () => {
  const draft = drawRectangle(4000, 3000);
  assert.deepEqual(draftEnd(draft), { x: 0, y: 0 });
  assert.deepEqual(draftEnd(undoSegment(draft)), { x: 0, y: 3000 });
});

// ─── THE SURFACE (the editor is REACHABLE, and by pointer) ─────────────────

test('F1 · the plan carries the editor, and the editor is driven by the pointer', () => {
  const src = readFileSync(new URL('../src/components/RoomModal.jsx', import.meta.url), 'utf8');
  assert.ok(src.includes('data-draw-walls='), 'the door into the editor');
  assert.ok(src.includes('data-wall-editor='), 'the panel of typed lengths');
  assert.ok(src.includes('data-draft-field='), 'and every segment is re-typable there');
  assert.ok(src.includes('data-draft-undo='), 'Undo, as a control');
  assert.ok(src.includes('data-draft-finish='), 'and Finish');
  assert.ok(src.includes('data-draw-turn='), 'the angle field, carrying 90 and overtypable');
  assert.ok(src.includes('drawClick('), 'a click on the plan puts a corner or fixes a segment');
  assert.ok(src.includes('aimAt('), 'and moving over it AIMS the next one');
  assert.ok(src.includes('data-draft-length='), 'each segment shows its length as it is drawn');
});

test('F1 · nothing about the ENGINE changes — this draws project.room and no more', () => {
  const src = readFileSync(new URL('../src/engine/wallDraw.js', import.meta.url), 'utf8');
  // The one import it has is the room module's own minimum and its rectangle.
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(imports, ['./room.js'], 'one import, and it is the room');
  assert.ok(!/\bcomputeCabinet\(/.test(src), 'it never calls the cabinet engine');
});
