// ─── TURN 69 · F3 — SLOPES MAKE SENSE, AND THE WALL WEARS REAL ART ─────────
//
// CLAUDE.md, F3, verbatim:
//
//   *"**Probe**: add slope L, then R, on one wall … Fix to the law: L draws at
//   the LEFT end, R at the RIGHT; one slope per side per wall; the corner law
//   (T67) still arbitrates meetings."*
//   *"**Door and window get drawings** — ToolArt-style vector art in the
//   elevation (a door with a leaf line, a window with sill and panes), not the
//   present rectangles. No photos."*
//   *"**Window sill default: 850 mm** from the floor (`OPENING_DEFAULTS`)."*
//
// The probe is `scripts/t69-f3-probe.mjs`; `verify/t69/f3-probe.md` is the
// diagnosis, committed before the cut, and `-after.md` the proof.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { OPENING_DEFAULTS, clampOpening, rectCorners } from '../src/engine/room.js';
import {
  SLOPE_DEFAULTS, slopeSide, migrateSlope, oneSlopePerSide, slopesOnWall,
  slopePolygon, wallHeightAt, wallCornerHeights,
} from '../src/lib/wallElements.js';
import { doorArt, windowArt, openingArt, panesOf } from '../src/lib/openingArt.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();
const WALL = { wallWidth: 4000, wallHeight: 2500 };

// ═══ 1 · THE SIDE, FROM ANY WAY OF SAYING IT ════════════════════════════════

test('F3 · the two buttons\' own words reach the two ends of the wall', () => {
  // This is the probe's VERDICT 1, made permanent. `WallElevationModal.jsx`
  // passes 'left' and 'right'; before tonight both normalised to 'R'.
  assert.equal(slopeSide('left'), 'L');
  assert.equal(slopeSide('right'), 'R');
  assert.equal(slopeSide('L'), 'L');
  assert.equal(slopeSide('R'), 'R');
  // A record that names NO side still gets the house's default and nothing else.
  assert.equal(slopeSide(undefined), SLOPE_DEFAULTS.side);
  assert.equal(migrateSlope({ wall: 0, side: 'left' }).side, 'L');
});

test('F3 · L eats the LEFT end and R the RIGHT — read off the polygons', () => {
  const end = (side) => {
    const xs = slopePolygon({ wall: 0, side, startHeight: 1800, run: 900 }, WALL).map((p) => p.x);
    return Math.max(...xs) <= WALL.wallWidth / 2 ? 'LEFT' : 'RIGHT';
  };
  assert.equal(end('L'), 'LEFT');
  assert.equal(end('R'), 'RIGHT');
});

// ═══ 2 · ONE SLOPE PER SIDE PER WALL ════════════════════════════════════════

test('F3 · a second slope on a side replaces the first, and the last wins', () => {
  const a = { id: 'a', kind: 'slope', wall: 0, side: 'L', startHeight: 1800, run: 900 };
  const b = { id: 'b', kind: 'slope', wall: 0, side: 'L', startHeight: 1400, run: 1200 };
  const kept = oneSlopePerSide([a, b]);
  assert.equal(kept.length, 1, 'two slopes stacked on one side');
  assert.equal(kept[0].id, 'b', 'the first press won — a person expects the last');
});

test('F3 · one per SIDE, not one per wall, and other walls are their own', () => {
  const kept = oneSlopePerSide([
    { id: 'a', kind: 'slope', wall: 0, side: 'L', startHeight: 1800, run: 900 },
    { id: 'b', kind: 'slope', wall: 0, side: 'R', startHeight: 1700, run: 800 },
    { id: 'c', kind: 'slope', wall: 1, side: 'L', startHeight: 1600, run: 700 },
  ]);
  assert.deepEqual(kept.map((s) => s.id), ['a', 'b', 'c']);
});

test('F3 · a recess and a chimney are not a ceiling — they pass through', () => {
  const kept = oneSlopePerSide([
    { id: 'r1', kind: 'recess', wall: 0, x_mm: 100, width: 900, depth: 300 },
    { id: 'r2', kind: 'recess', wall: 0, x_mm: 1200, width: 900, depth: 300 },
    { id: 's', kind: 'slope', wall: 0, side: 'L', startHeight: 1800, run: 900 },
  ]);
  assert.equal(kept.filter((e) => e.kind === 'recess').length, 2);
  assert.deepEqual(kept.map((e) => e.id), ['r1', 'r2', 's'], 'the order moved');
});

test('F3 · the STORE holds the law, through every door it is written by', () => {
  const press = (side) => S().addWallSlope({
    kind: 'slope', wall: 0, side, startHeight: 1800, run: 900,
  });
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().setWallSlopes([]);

  press('left');
  press('right');
  let held = slopesOnWall(S().project.wallSlopes, 0);
  assert.deepEqual(held.map((s) => s.side), ['L', 'R'], 'L then R is not two sides');

  press('left');
  held = slopesOnWall(S().project.wallSlopes, 0);
  assert.equal(held.length, 2, 'a third press stacked a slope');

  // …and the wall is genuinely low at BOTH ends and full in the middle.
  const at = (x) => Math.round(wallHeightAt(x, S().project.wallSlopes, WALL));
  assert.equal(at(0), 1800, 'the left end is not low');
  assert.equal(at(4000), 1800, 'the right end is not low');
  assert.equal(at(2000), 2500, 'the middle lost its ceiling');

  // DRAGGING one across meets the same law.
  const [left] = held;
  S().updateWallSlope(left.id, { side: 'R' });
  assert.equal(slopesOnWall(S().project.wallSlopes, 0).length, 1,
    'a slope dragged onto an occupied side stacked instead of replacing');
});

test('F3 · the T67 corner law still arbitrates meetings — nothing here touched it', () => {
  // Two slopes running into one corner: the LOWER wins. Untouched by tonight.
  const heights = wallCornerHeights({
    elements: [
      { id: 'a', kind: 'slope', wall: 0, side: 'R', startHeight: 1900, run: 900 },
      { id: 'b', kind: 'slope', wall: 1, side: 'L', startHeight: 1500, run: 900 },
    ],
    neighbours: { prev: { index: 3 }, next: { index: 1 } },
    wallIndex: 0,
    wallHeight: 2500,
  });
  assert.ok(heights, 'the corner law stopped answering');
});

// ═══ 3 · THE SILL ═══════════════════════════════════════════════════════════

test('F3 · a window starts 850 mm off the floor, and a door still starts on it', () => {
  assert.equal(OPENING_DEFAULTS.window.sill, 850);
  assert.equal(OPENING_DEFAULTS.door.sill, 0);
  const room = { corners: rectCorners(4000, 3000), height: 2500 };
  const w = clampOpening({ kind: 'window', wall: 0, x_mm: 200, width: 1200, height: 1400 }, room);
  assert.equal(w.sill, 850, 'a window with no sill typed does not take the default');
  // A sill that WAS typed is still the client's own.
  assert.equal(clampOpening({ kind: 'window', wall: 0, x_mm: 0, sill: 1100 }, room).sill, 1100);
  // …and a door has no sill however hard it is asked.
  assert.equal(clampOpening({ kind: 'door', wall: 0, x_mm: 0, sill: 900 }, room).sill, 0);
});

// ═══ 4 · THE ART ════════════════════════════════════════════════════════════

test('F3 · a door is drawn as a door — a leaf line and a knob, no photo', () => {
  const parts = doorArt(900, 2040, { hand: 'L' });
  const roles = parts.map((p) => p.role);
  assert.ok(roles.includes('frame'), 'no reveal');
  assert.ok(roles.includes('leaf'), 'no leaf');
  assert.ok(roles.includes('knob'), 'no knob');
  // THE LEAF LINE: a line, vertical, inside the opening — that is the thing
  // that makes a door read as a door.
  const leafLine = parts.find((p) => p.kind === 'line' && p.role === 'leaf');
  assert.ok(leafLine, 'the leaf is a filled box and nothing else');
  assert.equal(leafLine.x1, leafLine.x2, 'the leaf line is not vertical');
  assert.ok(leafLine.x1 > 0 && leafLine.x1 < 900, 'the leaf line is outside the opening');
  // …and the knob is on the side the hinges are NOT.
  const knobL = doorArt(900, 2040, { hand: 'L' }).find((p) => p.role === 'knob');
  const knobR = doorArt(900, 2040, { hand: 'R' }).find((p) => p.role === 'knob');
  assert.ok(knobL.x > 450 && knobR.x < 450, 'the knob does not follow the hand');
  // NOTHING is an image.
  assert.ok(parts.every((p) => p.kind === 'rect' || p.kind === 'line'), 'a photo got in');
});

test('F3 · a window is drawn as a window — a sill that oversails, and panes', () => {
  const parts = windowArt(1200, 1400);
  const sill = parts.find((p) => p.role === 'sill');
  assert.ok(sill, 'no sill');
  assert.ok(sill.x < 0 && sill.w > 1200, 'the sill does not oversail the reveal');
  assert.ok(sill.y < 0, 'the sill is not UNDER the window');
  assert.ok(parts.some((p) => p.role === 'glass'), 'no glass');
  // The panes are READ off the opening, not asked for.
  assert.deepEqual(panesOf(1200, 1400), { cols: 2, rows: 2 });
  assert.deepEqual(panesOf(600, 600), { cols: 1, rows: 1 }, 'a small window got a grid');
  assert.deepEqual(panesOf(9000, 9000), { cols: 4, rows: 4 }, 'the pane count ran away');
  const bars = parts.filter((p) => p.kind === 'line').length;
  assert.equal(bars, 2, 'a 2×2 window is one bar each way');
  assert.ok(parts.every((p) => p.kind === 'rect' || p.kind === 'line'), 'a photo got in');
});

test('F3 · the art is SHARED, and the elevation supplies only ink', () => {
  const art = read('src/lib/openingArt.js');
  assert.ok(!/#[0-9a-fA-F]{3,8}/.test(art), 'the shared art invented a colour of its own');
  assert.ok(!/from 'react'/.test(art), 'the shared art became a component');

  const copy = read('src/retail/design/room/WallElevationModal.jsx');
  assert.match(copy, /import \{ openingArt \}/, 'the elevation draws its own door again');
  assert.match(copy, /const ART_INK = \{/, 'the elevation has no ink table');
  for (const role of ['frame', 'leaf', 'glass', 'sill', 'knob']) {
    assert.ok(copy.includes(`  ${role}: {`), `the ink table has no ${role}`);
  }
  // The GRIP did not move: every gesture and hook the element had, it has.
  for (const hook of ['data-elevation-element', 'data-elevation-kind', 'onPointerDown', 'onDoubleClick']) {
    assert.ok(copy.includes(hook), `the drawn opening lost ${hook}`);
  }
  // An unknown kind draws nothing rather than guessing.
  assert.deepEqual(openingArt({ kind: 'recess', w: 900, h: 300 }), []);
});

test('F3 · PRO\'s elevation is untouched — it is not in EXEMPT', () => {
  const pro = read('src/components/WallElevationModal.jsx');
  assert.ok(!/openingArt/.test(pro), 'F3 reached into a frozen file');
  assert.ok(!/ART_INK/.test(pro), 'F3 reached into a frozen file');
});
