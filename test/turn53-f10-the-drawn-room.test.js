// ─── T53 · F10 — THE DRAWN ROOM, CAD-STYLE, CLOSED LIKE REAL WALLS ─────────
//
// The owner, 27.08.2026:
//
//   *"teraz rysowanie — prawdziwe room, od nowa, robimy jak w CAD: linia od
//   punktu zero, rysujesz w którym kierunku i wpisujesz numer, enter — i linia
//   narysowana. później następna linia, kierunek zawsze 90 stopni, i to samo:
//   wpisujesz milimetry, enter, etc. na końcu ostatnią linię łapiesz i łączysz
//   — zawsze łączysz, taki catch, żeby pokój był zawsze połączony (jak w życiu
//   ściany). później klikamy na ścianę i się pokazuje ściana w pionie (jak
//   'one wall') i edycja: okno, drzwi, skosy — w standardzie. modal 2× większy
//   — rysowanie."*
//
// CLAUDE.md's own assertion, quoted so the test cannot drift from the brief:
//
//   *"Assert: draw 4000 → 3000 → 4000 → catch = the same room `rectCorners
//   (4000, 3000)` makes, byte-equal corners; undo removes a segment;
//   self-cross refuses; a 6-corner outline saves and its six walls each open
//   the elevation."*
//
// The geometry is `engine/drawRoom.js` and nothing else — no React, no store,
// no three.js — which is the whole reason a CAD flow can be argued here at all.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';

import {
  DIRS, dirOf, dirFromCursor, newPath, penOf, addSegment, undoSegment,
  catchesStart, closePath, pathFaults, cornersOfPath, pathBounds, MIN_SEGMENT_MM,
} from '../src/engine/drawRoom.js';
import {
  migrateRoom, rectCorners, roomWalls, MIN_WALL_LENGTH,
} from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/** His own sequence, typed the way he types it. */
function drawHisRoom() {
  let p = newPath();
  for (const [dir, len] of [['E', 4000], ['S', 3000], ['W', 4000]]) {
    const res = addSegment(p, dir, len);
    assert.equal(res.error, undefined, res.error || '');
    p = res.path;
  }
  return p;
}

// ─── THE MOCKUP CAME FIRST, AND IT IS COMMITTED ────────────────────────────

test('F10 — the mockup is on disk, as F10’s own first order', () => {
  const png = new URL('../verify/t53/f10-mockup.png', import.meta.url);
  assert.ok(existsSync(png), 'verify/t53/f10-mockup.png');
  assert.ok(statSync(png).size > 20_000, 'and it is a picture, not a stub');
  // It is REBUILDABLE — a screenshot nobody can re-shoot is a screenshot that
  // rots the first time the window changes.
  assert.ok(existsSync(new URL('../scripts/t53-f10-mockup.mjs', import.meta.url)));
});

// ─── HIS SEQUENCE, TO THE MILLIMETRE ───────────────────────────────────────

test('F10 — 4000 → 3000 → 4000 → catch is byte-equal to rectCorners(4000, 3000)', () => {
  const p = drawHisRoom();
  // The catch: the pen is 3000 from home on one axis, so it bites.
  assert.equal(catchesStart(p, { x: 0, y: 3000 }, 250), false, 'not from the far corner');
  const home = closePath(p);
  assert.equal(home.error, undefined);
  assert.equal(home.added, 1, 'aligned with the origin — ONE wall home');
  const corners = cornersOfPath(home.path);
  assert.deepEqual(corners, rectCorners(4000, 3000), 'byte-equal');
  assert.deepEqual(pathFaults(home.path), [], 'and nothing wrong with it');
  // …and the room engine makes the same four walls of it.
  const walls = roomWalls(migrateRoom({ height: 2500, corners }));
  assert.equal(walls.length, 4);
  assert.deepEqual(walls.map((w) => Math.round(w.width)), [4000, 3000, 4000, 3000]);
});

test('F10 — the catch bites near home and nowhere else', () => {
  const p = drawHisRoom();
  assert.equal(catchesStart(p, { x: 0, y: 0 }, 250), true, 'on it');
  assert.equal(catchesStart(p, { x: 0, y: 240 }, 250), true, 'within the catch');
  assert.equal(catchesStart(p, { x: 0, y: 260 }, 250), false, 'outside it');
  // It cannot bite before there is a room to close.
  assert.equal(catchesStart(newPath(), { x: 0, y: 0 }, 250), false);
  assert.equal(catchesStart(addSegment(newPath(), 'E', 1000).path, { x: 0, y: 0 }, 250), false,
    'one wall is not a room');
});

test('F10 — Close, where the pen is NOT aligned, comes home as an L of two', () => {
  // A four-wall path whose pen is off both axes.
  let p = newPath();
  for (const [dir, len] of [['E', 4000], ['S', 3000], ['W', 1500], ['N', 1000]]) {
    p = addSegment(p, dir, len).path;
  }
  const home = closePath(p);
  assert.equal(home.added, 2, 'an L');
  const corners = cornersOfPath(home.path);
  assert.equal(corners.length, 6, 'six corners, and every turn a right angle');
  for (let i = 0; i < corners.length; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    assert.ok(Math.abs(a.x - b.x) < 1e-6 || Math.abs(a.y - b.y) < 1e-6,
      `wall ${i + 1} is not ortho`);
  }
  assert.deepEqual(pathFaults(home.path), []);
});

test('F10 — Close never lays the closing wall on a wall that is already there', () => {
  // THE BUG THIS FEATURE FOUND IN ITSELF. A U — out, down, and part-way back —
  // has two ortho ways home, and the obvious one (turn on the axis the last
  // wall did not run along) puts the closing wall straight down the first
  // wall. That doubled corner does not TURN, so `cornersOfPath` absorbed it
  // and a 3000 mm room came out 1200 mm wide with nothing anywhere saying so.
  let p = newPath();
  p = addSegment(p, 'E', 3000).path;
  p = addSegment(p, 'S', 2000).path;
  p = addSegment(p, 'W', 1200).path;
  const home = closePath(p);
  assert.equal(home.error, undefined, home.error || '');
  assert.equal(home.added, 2);
  // The OTHER turn is taken, and the room is the one that was drawn: the
  // 1200 wall and the wall home are one 3000 wall, which is what the pen means
  // when it stops half-way along a side.
  assert.deepEqual(cornersOfPath(home.path), rectCorners(3000, 2000));
  assert.deepEqual(pathFaults(home.path), []);
});

test('F10 — …and a wall that doubles back is NAMED, not absorbed', () => {
  // The same shape, closed by hand the wrong way — which is what any caller
  // that builds its own path can still do.
  const doubled = [
    { x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2000 },
    { x: 1800, y: 2000 }, { x: 1800, y: 0 }, { x: 0, y: 0 },
  ];
  const faults = pathFaults(doubled);
  assert.ok(faults.length, 'it is refused');
  assert.match(faults[0], /doubles back/);
  // Which is the fault the corner list alone could never report: it makes a
  // perfectly good little rectangle out of it.
  assert.equal(cornersOfPath(doubled).length, 4);
});

test('F10 — Close refuses to invent a room out of fewer than three walls', () => {
  assert.match(closePath(newPath()).error, /at least three walls/);
  assert.match(closePath(addSegment(newPath(), 'E', 2000).path).error, /at least three walls/);
});

// ─── UNDO ──────────────────────────────────────────────────────────────────

test('F10 — undo removes a segment, and never the origin', () => {
  const p = drawHisRoom();
  assert.equal(p.length, 4);
  const back = undoSegment(p);
  assert.equal(back.length, 3);
  assert.deepEqual(back, p.slice(0, 3));
  let one = newPath();
  one = undoSegment(one);
  assert.equal(one.length, 1, 'the pen stays at 0,0');
  assert.deepEqual(penOf(one), { x: 0, y: 0 });
});

// ─── VALIDATION: *"zero/negative lengths refuse; self-crossing refuses"* ────

test('F10 — a zero, a negative and a too-short wall are all refused, with the number', () => {
  const p = newPath();
  assert.match(addSegment(p, 'E', 0).error, /millimetres/);
  assert.match(addSegment(p, 'E', -400).error, /millimetres/);
  assert.match(addSegment(p, 'E', '').error, /millimetres/);
  assert.match(addSegment(p, 'E', 'four thousand').error, /millimetres/);
  const short = addSegment(p, 'E', 60);
  assert.match(short.error, /60 mm is shorter than the 100 mm/);
  assert.equal(MIN_SEGMENT_MM, MIN_WALL_LENGTH,
    'the floor is the ROOM engine’s own — one number, not two that agree');
  // …and a direction nobody picked.
  assert.match(addSegment(p, 'NE', 1000).error, /direction/);
});

test('F10 — a self-crossing outline refuses, and says which two walls fold', () => {
  // A bow-tie: out, down, back past the start, and home.
  const bow = [
    { x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2000 },
    { x: -1000, y: 2000 }, { x: -1000, y: -1000 }, { x: 1500, y: -1000 },
    { x: 1500, y: 1000 }, { x: 0, y: 1000 }, { x: 0, y: 0 },
  ];
  const faults = pathFaults(bow);
  assert.ok(faults.length, 'it is refused');
  assert.match(faults[0], /cross|fold/, faults.join(' · '));
});

test('F10 — a room needs four walls, and a wall under the floor is named', () => {
  assert.deepEqual(pathFaults([{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }, { x: 0, y: 0 }]),
    ['A room needs at least four walls.']);
  const nicked = [
    { x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 },
    { x: 40, y: 3000 }, { x: 0, y: 3000 }, { x: 0, y: 0 },
  ];
  // The 40 mm nick is colinear, so the corner list drops it rather than
  // shipping a wall nobody can build — which is the honest answer.
  assert.deepEqual(cornersOfPath(nicked), rectCorners(4000, 3000));
});

// ─── ORTHO: *"kierunek zawsze 90 stopni"* ──────────────────────────────────

test('F10 — the cursor picks one of four, and the bigger component wins', () => {
  assert.equal(dirFromCursor(1200, 300).id, 'E');
  assert.equal(dirFromCursor(-1200, 300).id, 'W');
  assert.equal(dirFromCursor(300, 1200).id, 'S');
  assert.equal(dirFromCursor(300, -1200).id, 'N');
  assert.equal(dirFromCursor(0, 0).id, 'E', 'a dead tie still answers');
  assert.equal(DIRS.length, 4, 'four, and no fifth');
  for (const d of DIRS) {
    assert.equal(dirOf(d.id), d);
    assert.equal(Math.abs(d.dx) + Math.abs(d.dy), 1, 'unit, on one axis');
  }
  assert.equal(dirOf('NE'), null);
  // Every segment a drawing makes is therefore ortho, whatever the hand did.
  let p = newPath();
  for (const [dx, dy] of [[900, 12], [7, 800], [-950, -3]]) {
    p = addSegment(p, dirFromCursor(dx, dy).id, 1000).path;
  }
  for (let i = 1; i < p.length; i += 1) {
    assert.ok(Math.abs(p[i].x - p[i - 1].x) < 1e-6 || Math.abs(p[i].y - p[i - 1].y) < 1e-6);
  }
});

test('F10 — the bounds frame the drawing, empty or not', () => {
  assert.deepEqual(pathBounds([]), {
    minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, depth: 0,
  });
  const b = pathBounds(drawHisRoom());
  assert.deepEqual([b.minX, b.minY, b.maxX, b.maxY], [0, 0, 4000, 3000]);
  assert.deepEqual([b.width, b.depth], [4000, 3000]);
});

// ─── IT SAVES WHERE `migrateRoom` ALREADY LOOKS ────────────────────────────

test('F10 — a drawn rectangle becomes the project’s room, end to end', () => {
  const store = () => useProjectStore.getState();
  store().loadProject({
    id: null, name: 'T53 F10', number: '53', client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(3000, 2000) }), design: {},
  }, []);
  const home = closePath(drawHisRoom());
  const verdict = store().setRoom({ corners: cornersOfPath(home.path) });
  assert.equal(verdict.ok, true, verdict.message || '');
  assert.deepEqual(store().project.room.corners, rectCorners(4000, 3000));
  // …and a cabinet goes into it, which is what "furnished" means.
  const added = store().addUnit('BUD');
  assert.ok(added.id, added.error || '');
  assert.equal(store().units.length, 1);
});

test('F10 — a SIX-corner outline saves, and each of its six walls has an elevation to open', () => {
  const store = () => useProjectStore.getState();
  store().loadProject({
    id: null, name: 'T53 F10 · L', number: '53', client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(3000, 2000) }), design: {},
  }, []);
  // An L, drawn the way he draws it: right, away, right, away, left, home.
  let p = newPath();
  for (const [dir, len] of [['E', 4000], ['S', 1500], ['E', 2000], ['S', 2500], ['W', 6000]]) {
    p = addSegment(p, dir, len).path;
  }
  const home = closePath(p);
  assert.equal(home.added, 1);
  const corners = cornersOfPath(home.path);
  assert.equal(corners.length, 6, 'six corners');
  assert.deepEqual(pathFaults(home.path), []);

  const verdict = store().setRoom({ corners });
  assert.equal(verdict.ok, true, verdict.message || '');
  const walls = roomWalls(migrateRoom(store().project.room));
  assert.equal(walls.length, 6, 'six walls');
  // "Each opens the elevation" is, in this app, exactly this: the elevation
  // editor is handed a `wallIndex` and reads `roomWalls[wallIndex]` for its
  // width and the room's height. Every one of the six answers.
  for (let i = 0; i < walls.length; i += 1) {
    assert.ok(walls[i].width >= MIN_WALL_LENGTH, `wall ${i + 1} has a width`);
    assert.ok(Number(store().project.room.height) > 0, 'and the room has a height');
  }
});

// ─── THE WINDOW ────────────────────────────────────────────────────────────

test('F10 — the window is the shell’s, draggable, opening beside the button', () => {
  const jsx = src('src/components/DrawRoomModal.jsx');
  assert.ok(jsx.includes('name="draw-room"'), 'it goes through the shell');
  assert.ok(jsx.includes('anchor={anchor}'), '…with an anchor, so it opens beside');
  assert.ok(jsx.includes("const anchorFromStore = useUiStore((s) => s.modalArgs?.anchor)"),
    'read from the opener, never invented');
  // *"modal 2× większy"* — measured on the DRAWING, which is what he asked to
  // be bigger: the elevation's canvas is 560 × 300 and this one is 800 × 430.
  assert.ok(jsx.includes('const VIEW_W = 800;') && jsx.includes('const VIEW_H = 430;'));
  const elev = src('src/components/WallElevationModal.jsx');
  assert.ok(elev.includes('const VIEW_W = 560;') && elev.includes('const VIEW_H = 300;'));
  assert.ok(800 * 430 >= 2 * 560 * 300, 'twice the area, at least');
  assert.ok(jsx.includes('w-[1160px]'), 'and the window grows to hold it');

  // The registry knows it, and the page renders it.
  const layer = src('src/lib/modalLayer.js');
  assert.ok(layer.includes("'draw-room': { about: 'project', label: 'Draw room' }"));
  const page = src('src/pages/ConfiguratorPage.jsx');
  assert.ok(page.includes("{modal === 'draw-room' && <DrawRoomModal />}"));
});

test('F10 — the drawing window does no geometry of its own', () => {
  const jsx = src('src/components/DrawRoomModal.jsx');
  // Everything that measures comes from the engine…
  for (const fn of ['addSegment', 'undoSegment', 'closePath', 'catchesStart', 'pathFaults', 'cornersOfPath', 'dirFromCursor']) {
    assert.ok(jsx.includes(fn), fn);
  }
  assert.ok(jsx.includes("from '../engine/drawRoom.js'"));
  // …and nothing in the window re-derives a corner list or a wall length rule.
  assert.ok(!/const\s+MIN_[A-Z_]*\s*=\s*\d/.test(jsx), 'no restated minimum');
  assert.ok(!jsx.includes('Math.round(len / '), 'no snapping of its own');
});

test('F10 — the field takes Enter, Backspace undoes, and the ✕ is there (house rule)', () => {
  const jsx = src('src/components/DrawRoomModal.jsx');
  assert.ok(jsx.includes("if (e.key === 'Enter')"), 'Enter commits the wall');
  assert.ok(jsx.includes("if (e.key === 'Backspace' && !typed)"), 'Backspace takes the last off');
  assert.ok(jsx.includes('data-draw-length-clear="1"'), 'the ✕ on the field');
  assert.ok(jsx.includes('aria-label="Clear"'));
  assert.ok(jsx.includes('data-draw-undo="1"') && jsx.includes('data-draw-close="1"')
    && jsx.includes('data-draw-save="1"'), 'the three buttons the mockup promised');
  // The catch, and Enter on it.
  assert.ok(jsx.includes('if (catching && !typed.trim()) { close(); return; }'));
  assert.ok(jsx.includes('data-draw-catch='));
});

test('F10 — clicking a wall opens the STANDARD elevation, unchanged', () => {
  const jsx = src('src/components/DrawRoomModal.jsx');
  assert.ok(jsx.includes("import WallElevationModal from './WallElevationModal.jsx';"),
    'the existing editor, not a second one');
  assert.ok(jsx.includes('wallIndex={wall}'), 'handed the wall that was clicked');
  assert.ok(jsx.includes('data-draw-wall={i}'), 'the wall in the top view is the target');
  assert.ok(jsx.includes('data-draw-wall-row={i}'), '…and the row beside it');
  // No window-over-window (T45's rule): the elevation REPLACES this one.
  assert.ok(/if \(wall !== null\) \{[\s\S]{0,400}return \(\s*<WallElevationModal/.test(jsx));
  // A wall that is not in the PROJECT has no elevation, so the click saves.
  assert.ok(jsx.includes('const res = saved ? { ok: true } : save();'));
});

test('F10 — the simple width/height path is untouched, and Draw room stands beside it', () => {
  const room = src('src/components/RoomModal.jsx');
  // F1's four tools, all still there.
  for (const t of ['data-room-preset="rect"', 'data-room-preset="L"', 'data-insert-box="1"', 'Import DXF plan']) {
    assert.ok(room.includes(t), t);
  }
  assert.ok(room.includes('data-room-draw="1"'), 'and the fifth door');
  assert.ok(room.includes("openModal('draw-room', { anchor: anchorOfEvent(e) })"),
    'which opens beside its own button');
});

test('F10 — the copy is English, end to end (T44’s failure is not repeated)', () => {
  const jsx = src('src/components/DrawRoomModal.jsx');
  // Strip the quoted brief — his own words are Polish and they are the SPEC.
  // His own words are the SPEC and they are quoted throughout — in comments.
  // What has to be English is what a joiner READS, so the comments come out
  // before the check rather than the check being softened.
  const body = jsx.slice(jsx.indexOf('export default function'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(body), 'no Polish in the UI');
  for (const phrase of ['Wall length', 'Undo wall', 'Save room', 'The room is always closed']) {
    assert.ok(jsx.includes(phrase), phrase);
  }
});
