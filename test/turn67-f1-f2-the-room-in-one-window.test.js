// ─── TURN 67 · F1 & F2 — THE ROOM IN ONE WINDOW, AND ONE CEILING ──────────
//
// THE EVENT OF THIS TURN. Asked whether `src/components/**` — frozen since
// T59 — may change so the room can be one window, the owner answered:
//
//   *"tak, zdecydowanie potwierdzam."*
//
// and of the elevation editor inside it:
//
//   *"który jest super, nie zmieniaj."*
//
// So this file asks two things of the night. FIRST (F1): the window has the
// owner's mockup's shape — plan on top, the UNCHANGED `WallElevationModal`
// docked below it, the three tools beside the plan, a wall click swapping the
// editor in place, and DRAW ROOM opening a window that exists in BOTH apps.
// SECOND (F2): at a shared corner both walls have the same height, because one
// ceiling cannot be two heights.
//
// The freeze is not this file's business — `turn59-f1-the-switch.test.js`
// carries the exemption, the owner's sentence and the re-frozen hashes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  migrateRoom, rectCorners, roomWalls, wallNeighbours,
} from '../src/engine/room.js';
import {
  cornerHeightAt, impliedProfilesOnWall, ownHeightAtEnd, wallCornerHeights, wallHeightAt,
} from '../src/lib/wallElements.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const PRO = 'src/components/RoomModal.jsx';
const RETAIL = 'src/retail/design/room/RoomModal.jsx';
const BOTH = [PRO, RETAIL];
// AMENDED BY CHAT FIX 28.10.2026 (the setup workspace of 26.10, commit 4f3e33c): RoomModal gained two
// opt-in props for the setup workspace, `embedded` and `draftState` (RoomModal.jsx:164, false and null by
// default), and NewProjectFlow.jsx:334 is the one door that passes them. These are the two ORDINARY doors,
// Settings ▸ Room setup (ConfiguratorPage.jsx:747) and retail's route (RoomEditor.jsx:34), named so the F1
// tests below can hold them to passing neither. The owner: *"zakoduj mi prosze te zmiany"* (26.10, the
// setup UI); *"ok robie merge a ty prosze napraw ten fail"* (28.10).
const ORDINARY_DOORS = ['src/pages/ConfiguratorPage.jsx', 'src/retail/design/room/RoomEditor.jsx'];
// CHAT FIX 28.10.2026: each ordinary door's `<RoomModal ... />` is read the way the every-door scan below reads
// it (comments out, the whole tag to its `/>`), so a harmless prop or a comment never breaks the match.
const ordinaryDoor = (rel) => {
  const tags = roomDoors().filter(([file]) => file === rel).map(([, tag]) => tag);
  assert.ok(tags.length, `${rel} no longer opens the room window`);
  return tags.join('\n');
};
// AMENDED BY CHAT FIX 28.10.2026: the two doors above are not taken on trust. Every `<RoomModal ... />` tag in
// src is read, and only the setup workspace (components/NewProjectFlow.jsx) may hand the room window the
// setup's `embedded` or `draftState`; a third door that opts in that way fails here.
const SETUP_DOOR = 'src/components/NewProjectFlow.jsx';
const srcFiles = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory()
  ? srcFiles(`${dir}/${e.name}`)
  : (/\.(js|jsx)$/.test(e.name) ? [`${dir}/${e.name}`] : [])));
const roomDoors = () => srcFiles('src').flatMap((rel) => [...uncomment(read(rel)).matchAll(/<RoomModal\b[\s\S]*?\/>/g)]
  .map((m) => [rel, m[0]]));

// ═══ F1 · THE WINDOW ════════════════════════════════════════════════════════

test('F1 · plan on top, elevation below, ONE window — in both apps', () => {
  for (const rel of BOTH) {
    const src = read(rel);
    const plan = src.indexOf('data-room-plan-half="1"');
    const dock = src.indexOf('data-elevation-dock="1"');
    const acts = src.indexOf('data-room-actions="1"');
    assert.ok(plan > 0, `${rel} has no plan half`);
    assert.ok(dock > plan, `${rel} draws the elevation above the plan`);
    assert.ok(acts > dock, `${rel}: the window's buttons are not at its foot`);
    // ONE window: the elevation is INSIDE this modal's children, not beside it.
    // AMENDED BY CHAT FIX 28.10.2026 (the setup workspace of 26.10, commit 4f3e33c): RoomModal.jsx:1195
    // hands the docked editor the room window's own `embedded` flag and nothing else. Only the setup
    // workspace sets it (NewProjectFlow.jsx:334); in Settings ▸ Room setup and in retail it is false and the
    // editor is docked here, inside this window's children, as at T83. 4f3e33c amended this line's twin
    // itself (test/turn62-f2-f3-the-copy.test.js:484). The owner: *"zakoduj mi prosze te zmiany"* (26.10,
    // the setup UI); *"ok robie merge a ty prosze napraw ten fail"* (28.10).
    assert.match(src, /<WallElevationModal key=\{wallOnShow\} wallIndex=\{wallOnShow\} embedded=\{embedded\} \/>/,
      `${rel} does not dock the elevation`);
    // …and the room modal is still ONE `Modal`, not two.
    assert.equal((uncomment(src).match(/<Modal\b/g) || []).length, 1,
      `${rel} opens a second window`);
    // AMENDED BY CHAT FIX 28.10.2026 (the setup workspace of 26.10, commit 4f3e33c): the room window is now
    // drawn by ONE `<EditorFrame>` (RoomModal.jsx:661, :672), which IS `Modal` in every ordinary door and a
    // bare fragment inside the setup workspace's own window (RoomModal.jsx:1237), so the count above no longer
    // sees it. The one `<Modal` it counts is the setup workspace's island plan (RoomModal.jsx:1211), drawn only
    // behind `embedded`. Both are named here: the room is still ONE window in both doors, and no second window
    // can hide behind the island plan's count. The owner: *"zakoduj mi prosze te zmiany"* (26.10, the setup
    // UI); *"ok robie merge a ty prosze napraw ten fail"* (28.10).
    const body = uncomment(src);
    assert.equal((body.match(/<EditorFrame\b/g) || []).length, 1, `${rel} draws the room in two frames`);
    assert.match(body, /const EditorFrame = embedded\s*\?\s*EmbeddedRoomFrame\s*:\s*Modal;/,
      `${rel}: an ordinary room window is not the shell's one Modal`);
    assert.match(body, /function EmbeddedRoomFrame\(\{ children \}\) \{\s*return <>\{children\}<\/>;\s*\}|const EmbeddedRoomFrame = \(\{ children \}\) => <>\{children\}<\/>;/,
      `${rel}: inside the setup workspace the room opens a window of its own`);
    assert.match(body, /\{embedded && planningIsland && islandPlan && \(\s*<Modal name="island-plan"/,
      `${rel}: its one other Modal is not the setup workspace's island plan`);
    // AMENDED BY CHAT FIX 28.10.2026: ONE window means the docked editor stands INSIDE that one frame's
    // children, between `<EditorFrame` and `</EditorFrame>`, never a sibling drawn after it; and the window's
    // Cancel / Apply row is left out in the setup workspace alone (`{!embedded && ...}`), so an ordinary room
    // window keeps its foot.
    const frameOpen = body.indexOf('<EditorFrame');
    const frameClose = body.indexOf('</EditorFrame>');
    const docked = body.indexOf('<WallElevationModal key={wallOnShow}');
    assert.ok(frameOpen >= 0 && docked > frameOpen && frameClose > docked,
      `${rel}: the docked elevation stands outside the room window`);
    assert.match(body, /\{!embedded && \(?\s*<div[^>]*data-room-actions="1">/,
      `${rel}: the room window's Cancel and Apply are not drawn in an ordinary room window`);
    const acts2 = body.indexOf('data-room-actions="1"');
    assert.ok(acts2 > docked && frameClose > acts2, `${rel}: the Cancel and Apply row is not at the window's own foot`);
  }
});

test('F1 · the elevation editor is UNCHANGED — *"który jest super, nie zmieniaj"*', () => {
  // It is not in tonight's exemption list, so the freeze test already holds it
  // byte for byte. What is asserted HERE is the other half: the room window
  // gives it NOTHING but a wall index — no new prop, no callback, no wrapper
  // that would need the file to learn anything.
  for (const rel of BOTH) {
    const src = read(rel);
    const call = src.slice(src.indexOf('<WallElevationModal'), src.indexOf('/>', src.indexOf('<WallElevationModal')) + 2);
    // AMENDED BY CHAT FIX 28.10.2026 (the setup workspace of 26.10, commit 4f3e33c): the editor learnt two
    // opt-in props, `embedded` and `onNavigationChange` (WallElevationModal.jsx:76, false and null by default;
    // licensed in the freeze test's EXEMPT as "Setup UI 26.10.2026 F1" and re-frozen there), and the room
    // window passes only the first, its own flag, through (RoomModal.jsx:1195): still no `onBack`, no
    // `onSave`, no callback, no wrapper. The flag is false
    // by default (RoomModal.jsx:164) and false in both ordinary doors, so in an ordinary room window the
    // editor runs the path it ran at T83 (rendered old against new on one fixture, its markup differs only
    // in class strings that style nothing outside `.cc-setup`, a viewBox equal to the svg's own size, one
    // spacing wrapper and an aria-label on the remove buttons). The owner: *"zakoduj mi prosze te zmiany"*
    // (26.10, the setup UI); *"ok robie merge a ty prosze napraw ten fail"* (28.10).
    assert.equal(call.replace(/\s+/g, ' ').trim(),
      '<WallElevationModal key={wallOnShow} wallIndex={wallOnShow} embedded={embedded} />',
      `${rel} passes the elevation editor something it has to learn`);
    for (const def of [/\bembedded = false\b/, /\bonNavigationChange = null\b/, /\bdraftState = null\b/]) {
      assert.match(src, def, `${rel}: an ordinary room window docks the setup workspace's editor (${def})`);
    }
  }
  // AMENDED BY CHAT FIX 28.10.2026 (the setup workspace of 26.10, commit 4f3e33c): `embedded={embedded}` is
  // false in an ordinary room window BY NAME, not by luck: the editor's own default is that same false
  // (WallElevationModal.jsx:75-76, and the retail copy), and neither ordinary door passes the flag. The
  // owner: *"zakoduj mi prosze te zmiany"* (26.10, the setup UI); *"ok robie merge a ty prosze napraw ten
  // fail"* (28.10).
  for (const rel of ['src/components/WallElevationModal.jsx', 'src/retail/design/room/WallElevationModal.jsx']) {
    assert.match(read(rel), /wallIndex = 0, anchor = null, onBack = null, onSave = null,\s*embedded = false,/,
      `${rel}: the editor's default path is not the ordinary one`);
  }
  for (const rel of ORDINARY_DOORS) {
    assert.doesNotMatch(ordinaryDoor(rel), /\bembedded\b/,
      `${rel} opens an ordinary room window as the setup workspace`);
  }
  const doors = roomDoors();
  assert.ok(doors.some(([rel]) => rel === SETUP_DOOR), 'the setup workspace no longer opens the room window');
  for (const [rel, tag] of doors) {
    if (rel === SETUP_DOOR) continue;
    assert.doesNotMatch(tag, /\b(?:embedded|draftState)\b/, `${rel} opens the room window as the setup workspace`);
  }
  // And the docking is a DISPLAY layer, in the licensed file, scoped to one
  // attribute — never a class, so PRO's Tailwind and retail's `pbi-re-*` are
  // served by the same rules.
  for (const rel of BOTH) {
    const css = read(rel).slice(read(rel).indexOf('const DOCK_CSS'), read(rel).indexOf('export default function'));
    assert.match(css, /\[data-elevation-dock\] \[data-modal-shell\]/, `${rel}'s dock does not out-rank the shell`);
    assert.match(css, /\[data-elevation-dock\] \[data-modal-footer\] \{ display: none/, `${rel} leaves a dead Back/Save row`);
    assert.doesNotMatch(css, /\.(cc-|pbi-re-)/, `${rel}'s dock is keyed on a class and cannot serve both apps`);
  }
});

test('F1 · a click on a wall in the plan swaps the elevation, in place', () => {
  for (const rel of BOTH) {
    const src = uncomment(read(rel));
    // The gesture: the same pointer-down that picks a wall to drag.
    assert.match(src, /const startWallDrag = \(e, index\) => \{[\s\S]{0,600}setWallShown\(index\)/,
      `${rel}: a plan click does not choose the wall`);
    // …and it is NOT `picked`, which Escape and a background click clear.
    // AMENDED BY CHAT FIX 28.10.2026 (the setup workspace of 26.10, commit 4f3e33c): RoomModal.jsx:221 seeds
    // the wall on show from `draftState?.wallShown`, the draft the setup workspace keeps while its steps
    // change (NewProjectFlow.jsx:335 is the one door that passes it). `draftState` is null by default
    // (RoomModal.jsx:164) and neither ordinary door passes it, so an ordinary room window still opens on the
    // first wall, and the wall on show is still its own state, never `picked`. The owner: *"zakoduj mi
    // prosze te zmiany"* (26.10, the setup UI); *"ok robie merge a ty prosze napraw ten fail"* (28.10).
    assert.match(src, /const \[wallShown, setWallShown\] = useState\(draftState\?\.wallShown \|\| 0\)/,
      `${rel} has no wall of its own`);
    assert.match(src, /\bdraftState = null\b/, `${rel}: an ordinary room window does not open on the first wall`);
    assert.match(src, /const wallOnShow = editable\.some\(\(w\) => w\.index === wallShown\)/,
      `${rel} can dock an editor on a wall the room has not got`);
    // The active wall is highlighted and NAMED, as the mockup draws it.
    assert.match(src, /Wall \{w\.index \+ 1\} · \{formatMm\(w\.width\)\}/, `${rel} does not label the wall`);
    assert.match(src, /data-plan-wall-active=/, `${rel} does not highlight the active wall`);
  }
  // AMENDED BY CHAT FIX 28.10.2026 (the setup workspace of 26.10, commit 4f3e33c): the `draftState` that
  // seeds the wall on show (RoomModal.jsx:221) is passed by the setup workspace alone; neither ordinary
  // door passes it, so Settings ▸ Room setup and retail open on the first wall as before. The owner:
  // *"zakoduj mi prosze te zmiany"* (26.10, the setup UI); *"ok robie merge a ty prosze napraw ten fail"*
  // (28.10).
  for (const door of ORDINARY_DOORS) {
    assert.doesNotMatch(ordinaryDoor(door), /\bdraftState\b/,
      `${door} opens an ordinary room window on the setup workspace's wall`);
  }
});

/**
 * ─── AMENDED BY TURN 69 · F1 · THE ROW ANSWERS A QUESTION NOW ──────────────
 *
 * T67's row was RECTANGLE · DRAW ROOM… · IMPORT DXF PLAN…. CLAUDE.md F1
 * replaces the first and the third:
 *
 *   *"The plan header's preset row becomes: 1 WALL · 2 WALLS · 3 WALLS · DRAW
 *   ROOM… — IMPORT DXF is DELETED (owner: "to nie przejdzie")."*
 *
 * and RECTANGLE went with F1's own probe, which convicted it of proposing the
 * rectangle already on screen. DRAW ROOM… is the one tool that survives both
 * turns, and it is still asserted here by the same hook it always had.
 *
 * Nothing is deleted from this test: the two struck out move from the
 * "must be present" half to the "must be gone" half, which is the shape T67
 * itself gave `L-shape` and `+ Box`.
 */
test('F1 · the three tools stand beside the plan, and the two struck out are gone', () => {
  for (const rel of BOTH) {
    const src = read(rel);
    assert.ok(src.includes('data-room-draw="1"'), `${rel} lost data-room-draw="1"`);
    // T69 F1 · the row that answers *"how many walls carry furniture"*.
    assert.ok(/data-room-walls=/.test(src), `${rel} lost the 1/2/3-wall row`);
    for (const label of ['1 wall', '2 walls', '3 walls']) {
      assert.ok(src.includes(label), `${rel} lost the ${label} answer`);
    }
    assert.ok(!src.includes('data-room-preset="rect"'), `${rel} still has Rectangle`);
    assert.ok(!src.includes('data-import-dxf'), `${rel} still has Import DXF plan`);
    assert.ok(!src.includes('data-room-preset="L"'), `${rel} still has L-shape`);
    assert.ok(!/data-insert-box/.test(src), `${rel} still has + Box`);
    // The WALL HEIGHT field is beside the plan, as the mockup asks.
    assert.ok(src.includes('Wall height (mm)') && src.includes('Room height (mm)'),
      `${rel} lost the height field`);
  }
  // …and the ENGINE kept every law. Only the buttons went — T69 included:
  // `rectCorners` and `proposeRoomFromDxf` are untouched and still exported.
  const engine = read('src/engine/room.js');
  assert.match(engine, /export function lCorners/);
  assert.match(engine, /export const MIN_BOX_SIZE|MIN_BOX_SIZE =/);
  assert.match(engine, /export function rectCorners/);
  assert.match(read('src/engine/dxfImport.js'), /export function proposeRoomFromDxf/);
  // A saved plan still draws, drags and types its boxes.
  for (const rel of BOTH) {
    assert.ok(read(rel).includes('data-box-list="1"'), `${rel} stopped listing a saved plan's boxes`);
    assert.ok(read(rel).includes('data-plan-box='), `${rel} stopped drawing them`);
  }
});

test('F1 · DRAW ROOM works — and the hypothesis was right about why it did not', () => {
  // CLAUDE.md: *"retail's copy carries the button but `DrawRoomModal` never
  // entered the recursive copy."*  VERIFIED: the button has called
  // `openModal('draw-room')` from the copy since T62 and nothing in retail
  // answered the name. Both halves are asserted, so neither can rot.
  for (const rel of BOTH) {
    assert.match(read(rel), /openModal\('draw-room', \{ anchor: anchorOfEvent\(e\) \}\)/,
      `${rel} lost the DRAW ROOM door`);
  }
  // PRO's route, where it always was.
  assert.match(read('src/pages/ConfiguratorPage.jsx'), /modal === 'draw-room' && <DrawRoomModal \/>/);
  // Retail's route, made tonight.
  assert.match(uncomment(read('src/retail/design/Editors.jsx')), /is\('draw-room'\) && <DrawRoomModal \/>/);
  const copy = read('src/retail/design/room/DrawRoomModal.jsx');
  assert.match(copy, /name="draw-room"/, 'the copied window answers another name');
  // ─── AMENDED BY TURN 69 · F2 (A LICENSED DIVERGENCE) ────────────────────
  //
  // T67 held this copy to PRO's own line count and element count, which is the
  // right assertion for a file that is a copy. CLAUDE.md F2 licenses it to stop
  // being one, in as many words:
  //
  //   *"This REPLACES the current DrawRoomModal interaction in the retail
  //   copy; PRO's DrawRoomModal is NOT touched (not in EXEMPT) — retail's copy
  //   carries the new controls and says so in the PR."*
  //
  // So the two count assertions are replaced by the fence that now applies:
  // PRO's file is BYTE-FOR-BYTE what it was (it is not in EXEMPT, so it may not
  // move at all), and the copy is held to everything a copy is still held to —
  // its name, its skin, its repointed imports, and PRO's geometry, which is
  // `engine/drawRoom.js` and is untouched by either side.
  const pro = read('src/components/DrawRoomModal.jsx');
  assert.ok(!/data-draw-field/.test(pro),
    'PRO\'s DrawRoomModal is NOT in EXEMPT — F2 may not touch it');
  assert.match(pro, /data-draw-length="1"/, 'PRO kept its own field, where it always was');
  // The copy carries F2's controls, and the engine is the same engine.
  assert.match(copy, /data-draw-field="1"/, 'the copy lost F2\'s field at the click point');
  const engineNames = (t) => [...t.matchAll(/from '[^']*engine\/drawRoom\.js'/g)].length;
  assert.equal(engineNames(copy), engineNames(pro), 'the copy reads a different geometry');
  // …and it wears retail's skin, not PRO's.
  for (const m of copy.matchAll(/className="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/).filter(Boolean)) {
      assert.match(cls, /^pbi-re-/, `the copy still wears a PRO class: ${cls}`);
    }
  }
});

// ═══ F2 · THE CORNER LAW ════════════════════════════════════════════════════
//
// CLAUDE.md names three cases and they are the three tests below, in its own
// words and on its own fixture: *"slope R run 900 on wall 1 of a 4000×2500
// room → wall 2's height at the shared corner equals wall 1's end height (1800
// in T65's fixture); no slope → both corners full height; two slopes meeting in
// one corner → the lower wins (one ceiling cannot be two heights)."*

const ROOM = migrateRoom({ corners: rectCorners(4000, 2500), height: 2500 });
const NB = (i) => wallNeighbours(ROOM, i);
const SLOPE_R = {
  kind: 'slope', wall: 0, side: 'R', startHeight: 1800, run: 900,
};

test('F2 · a slope running INTO a corner pulls the neighbour down to the same height', () => {
  const walls = roomWalls(ROOM);
  assert.equal(walls.length, 4);
  assert.equal(walls[0].width, 4000, 'the fixture is not the 4000 wall');

  // Wall 1's own end height, through the reader every consumer already uses.
  const end = wallHeightAt(4000, [SLOPE_R], { wallWidth: 4000, wallHeight: 2500 });
  assert.equal(end, 1800, 'the slope does not reach 1800 at its own end');

  // THE LAW: wall 2's height at the SHARED corner is the same number.
  const wall2 = wallCornerHeights({
    elements: [SLOPE_R], neighbours: NB(1), wallIndex: 1, wallHeight: 2500,
  });
  assert.equal(wall2.start, 1800, 'wall 2 is still full height at the shared corner');
  assert.equal(wall2.end, 2500, 'wall 2 lost height at a corner nothing touches');

  // …and wall 1 agrees about the same point, which is what "one ceiling" means.
  const wall1 = wallCornerHeights({
    elements: [SLOPE_R], neighbours: NB(0), wallIndex: 0, wallHeight: 2500,
  });
  assert.equal(wall1.end, wall2.start, 'one ceiling is two heights at one corner');
  assert.equal(wall1.start, 2500, 'the far end of wall 1 lost its ceiling');
});

test('F2 · no slope — every corner is full height', () => {
  for (let i = 0; i < 4; i += 1) {
    assert.deepEqual(
      wallCornerHeights({ elements: [], neighbours: NB(i), wallIndex: i, wallHeight: 2500 }),
      { start: 2500, end: 2500 },
      `wall ${i + 1} invented a low corner`,
    );
    assert.deepEqual(
      impliedProfilesOnWall({ elements: [], neighbours: NB(i), wallIndex: i, wallHeight: 2500 }),
      [], `wall ${i + 1} implied a profile out of nothing`,
    );
  }
});

test('F2 · two slopes meeting in one corner — THE LOWER WINS', () => {
  const two = [SLOPE_R, {
    kind: 'slope', wall: 1, side: 'L', startHeight: 2100, run: 600,
  }];
  // Wall 1 says 1800 at its end; wall 2 says 2100 at its start; the corner is
  // ONE point and it is 1800 from both sides.
  assert.equal(ownHeightAtEnd(two, 0, 'end', 2500), 1800);
  assert.equal(ownHeightAtEnd(two, 1, 'start', 2500), 2100);
  assert.equal(cornerHeightAt({
    elements: two, neighbours: NB(0), wallIndex: 0, end: 'end', wallHeight: 2500,
  }), 1800);
  assert.equal(cornerHeightAt({
    elements: two, neighbours: NB(1), wallIndex: 1, end: 'start', wallHeight: 2500,
  }), 1800, 'the higher slope won — one ceiling cannot be two heights');
});

test('F2 · the implied profile is a CONSEQUENCE — read-only, derived, never stored', () => {
  const implied = impliedProfilesOnWall({
    elements: [SLOPE_R], neighbours: NB(1), wallIndex: 1, wallHeight: 2500,
  });
  assert.equal(implied.length, 1, 'the neighbour did not render the drop');
  const [p] = implied;
  assert.equal(p.kind, 'implied');
  assert.equal(p.implied, true, 'it could be mistaken for an element somebody put there');
  assert.equal(p.startHeight, 1800);
  assert.equal(p.run, 0, 'a level drop is a step, not a ramp');
  assert.equal(p.because, 0, 'it does not say which wall put it there');

  // A wall whose OWN slope already reaches the corner implies nothing: the
  // geometry is on the glass once, never twice.
  assert.deepEqual(impliedProfilesOnWall({
    elements: [SLOPE_R], neighbours: NB(0), wallIndex: 0, wallHeight: 2500,
  }), [], 'the wall with the slope drew its own slope a second time');

  // Nothing here mutates the list it was handed.
  const list = [SLOPE_R];
  const before = JSON.stringify(list);
  impliedProfilesOnWall({
    elements: list, neighbours: NB(1), wallIndex: 1, wallHeight: 2500,
  });
  assert.equal(JSON.stringify(list), before, 'a consequence was written into the stored list');
});

test('F2 · the room window SAYS it — read-only, in both apps', () => {
  for (const rel of BOTH) {
    const src = read(rel);
    assert.match(src, /impliedProfilesOnWall/, `${rel} does not read the corner law`);
    assert.match(src, /data-implied-profile=/, `${rel} does not show the implied profile`);
    assert.match(src, /data-low-corner=/, `${rel} does not mark the low corners on the plan`);
    // READ-ONLY: nothing in this window writes a wall element.
    assert.doesNotMatch(uncomment(src), /setWallSlopes/, `${rel} writes a consequence back`);
  }
});

test('F2 · the topology is the engine\'s, and it is a RING', () => {
  const n = roomWalls(ROOM).length;
  for (let i = 0; i < n; i += 1) {
    const nb = wallNeighbours(ROOM, i);
    assert.equal(nb.next.wall, (i + 1) % n);
    assert.equal(nb.prev.wall, (i - 1 + n) % n);
    assert.equal(nb.next.end, 'start', 'my end meets my neighbour\'s start');
    assert.equal(nb.prev.end, 'end');
  }
  // The wrap-around is real: wall 4's end is wall 1's start.
  assert.equal(wallNeighbours(ROOM, n - 1).next.wall, 0);
  assert.equal(wallNeighbours(ROOM, 0).prev.wall, n - 1);
  // Out of range answers null rather than a corner that is not there.
  assert.equal(wallNeighbours(ROOM, 99), null);
});
