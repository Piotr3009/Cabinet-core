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
import { readFileSync } from 'node:fs';
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
    assert.match(src, /<WallElevationModal key=\{wallOnShow\} wallIndex=\{wallOnShow\} \/>/,
      `${rel} does not dock the elevation`);
    // …and the room modal is still ONE `Modal`, not two.
    assert.equal((uncomment(src).match(/<Modal\b/g) || []).length, 1,
      `${rel} opens a second window`);
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
    assert.equal(call.replace(/\s+/g, ' ').trim(),
      '<WallElevationModal key={wallOnShow} wallIndex={wallOnShow} />',
      `${rel} passes the elevation editor something it has to learn`);
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
    assert.match(src, /const \[wallShown, setWallShown\] = useState\(0\)/, `${rel} has no wall of its own`);
    assert.match(src, /const wallOnShow = editable\.some\(\(w\) => w\.index === wallShown\)/,
      `${rel} can dock an editor on a wall the room has not got`);
    // The active wall is highlighted and NAMED, as the mockup draws it.
    assert.match(src, /Wall \{w\.index \+ 1\} · \{formatMm\(w\.width\)\}/, `${rel} does not label the wall`);
    assert.match(src, /data-plan-wall-active=/, `${rel} does not highlight the active wall`);
  }
});

test('F1 · the three tools stand beside the plan, and the two struck out are gone', () => {
  for (const rel of BOTH) {
    const src = read(rel);
    for (const hook of ['data-room-preset="rect"', 'data-room-draw="1"', 'data-import-dxf="1"']) {
      assert.ok(src.includes(hook), `${rel} lost ${hook}`);
    }
    assert.ok(!src.includes('data-room-preset="L"'), `${rel} still has L-shape`);
    assert.ok(!/data-insert-box/.test(src), `${rel} still has + Box`);
    // The WALL HEIGHT field is beside the plan, as the mockup asks.
    assert.ok(src.includes('Wall height (mm)') && src.includes('Room height (mm)'),
      `${rel} lost the height field`);
  }
  // …and the ENGINE kept both laws. Only the buttons went.
  const engine = read('src/engine/room.js');
  assert.match(engine, /export function lCorners/);
  assert.match(engine, /export const MIN_BOX_SIZE|MIN_BOX_SIZE =/);
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
  // It IS a copy: PRO's own length, PRO's own elements, repointed and reskinned.
  const pro = read('src/components/DrawRoomModal.jsx');
  assert.equal(copy.split('\n').length, pro.split('\n').length, 'the copy is not PRO\'s length');
  const count = (t) => (uncomment(t).match(/<[A-Za-z]/g) || []).length;
  assert.equal(count(copy), count(pro), 'the copy gained or lost an element');
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
