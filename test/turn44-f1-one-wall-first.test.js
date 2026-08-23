import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MIN_ELEMENT_MM, SLOPE_DEFAULTS, clampSlope, dragSlope, elevationElements, migrateSlope,
  moveOpening, slopePolygon, slopesOnWall, wallElevationIssues, wallHeightAt, wallSlopes,
} from '../src/lib/wallElements.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { roomWalls } from '../src/engine/room.js';
import { backStep } from '../src/lib/wizardSteps.js';

// ─── TURN 44 · F1 — ONE WALL FIRST, AND THE WALL GETS A FACE ────────────────
//
// CLAUDE.md, 23.08.2026: *"One wall is the FIRST card and the default focus;
// Whole room second. Copy unchanged."* … *"Choosing One wall opens the wall
// elevation modal (front view): fields width + height; the elevation redraws
// live."* … *"Store them on the wall model the Room path already uses — ONE
// wall schema, no twin."*
//
// The test F1 asks for by name is the STORE ROUND-TRIP of a wall carrying a
// door, a window and a slope, and it is the last block below. Everything above
// it is the arithmetic that round-trip stands on.

const flow = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../src/components/WallElevationModal.jsx', import.meta.url), 'utf8');

// ── the card order, and the copy that did NOT change ──

test('One wall is the FIRST card and takes the focus; Whole room is second', () => {
  const wallAt = flow.indexOf("['wall', 'One wall'");
  const roomAt = flow.indexOf("['room', 'Whole room'");
  assert.ok(wallAt > -1 && roomAt > -1, 'both cards are still there');
  assert.ok(wallAt < roomAt, 'One wall renders before Whole room');
  assert.match(flow, /autoFocus=\{i === 0\}/, 'the first card is the default focus');
});

test('the COPY is unchanged — F1 says so in as many words', () => {
  assert.match(flow, /'Straight to the canvas — walls come later'/);
  assert.match(flow, /'Four walls, a ceiling height, windows and doors'/);
});

test('choosing One wall opens the elevation at once', () => {
  assert.match(flow, /if \(id === 'wall'\) \{ setDesign\(\{ scope: 'wall' \}\); setStep\('wall'\); \}/);
  assert.match(flow, /<WallElevationModal/);
});

test('Back from the wall returns to the scope card, and never to the room editor', () => {
  assert.equal(backStep('wall', 'wall'), 'scope');
  assert.equal(backStep('settings', 'wall'), 'wall');
  assert.equal(backStep('settings', 'room'), 'room');
  assert.equal(backStep('room', 'room'), 'scope');
  assert.equal(backStep('info', 'wall'), 'info');
});

// ── the three tools, styled rather than bare ──

test('the elevation offers Add door · Add window · Add slope, as real buttons', () => {
  assert.match(modal, /data-elevation-add=\{id\}/, 'every tool carries the hook');
  for (const label of ['Add door', 'Add window', 'Add slope']) {
    assert.ok(modal.includes(`'${label}'`), `${label} is there`);
  }
  // …and in the owner's order: door, window, slope.
  assert.ok(modal.indexOf("'Add door'") < modal.indexOf("'Add window'"));
  assert.ok(modal.indexOf("'Add window'") < modal.indexOf("'Add slope'"));
  assert.match(modal, /border border-shell-600 rounded px-2\.5 py-2/, 'the tools are styled, not bare links');
  assert.match(modal, /function ToolArt/, 'each tool carries its own drawing');
});

test('the green Save is the only green control, and Back sits beside it', () => {
  assert.match(modal, /data-elevation-save="1"/);
  assert.match(modal, /border-emerald-500 text-emerald-400/);
  assert.match(modal, /data-elevation-back="1"/);
});

test('an element opens its own small modal, BESIDE it (rule 4)', () => {
  assert.match(modal, /onDoubleClick=\{\(\) => openElement\(el\)\}/);
  assert.match(modal, /anchorOfElement/);
  assert.match(modal, /data-element-modal=\{element\.kind\}/);
  // …and the slope's own three fields.
  assert.match(modal, /data-slope-side=\{id\}/);
  assert.match(modal, /data-slope-start="1"/);
  assert.match(modal, /data-slope-run="1"/);
});

// ── the arithmetic ──

test('a slope normalises: side is L or R, the numbers are real, no wall is no slope', () => {
  assert.equal(migrateSlope(null), null);
  const s = migrateSlope({ wall: 0, side: 'x', startHeight: '1800', run: -5 });
  assert.equal(s.side, 'R', 'anything that is not L is R');
  assert.equal(s.startHeight, 1800);
  assert.equal(s.run, 0, 'a negative run is no run');
  assert.equal(migrateSlope({ wall: 1, side: 'L' }).startHeight, SLOPE_DEFAULTS.startHeight);
});

test('a slope is clamped INTO its wall — never past the far end, never through the ceiling', () => {
  const s = clampSlope({ wall: 0, side: 'L', startHeight: 9000, run: 9000 }, { wallWidth: 3000, wallHeight: 2400 });
  assert.equal(s.run, 3000);
  assert.equal(s.startHeight, 2400);
});

test('the slope polygon is the piece of wall that is NOT there', () => {
  const left = slopePolygon({ wall: 0, side: 'L', startHeight: 1800, run: 900 }, { wallWidth: 4000, wallHeight: 2400 });
  assert.deepEqual(left, [{ x: 0, y: 1800 }, { x: 900, y: 2400 }, { x: 0, y: 2400 }]);
  const right = slopePolygon({ wall: 0, side: 'R', startHeight: 1800, run: 900 }, { wallWidth: 4000, wallHeight: 2400 });
  assert.deepEqual(right, [{ x: 4000, y: 1800 }, { x: 3100, y: 2400 }, { x: 4000, y: 2400 }]);
});

test('wallHeightAt reads the ceiling line — full height where no slope reaches', () => {
  const slopes = [{ wall: 0, side: 'R', startHeight: 1800, run: 1000 }];
  const box = { wallWidth: 4000, wallHeight: 2400 };
  assert.equal(wallHeightAt(0, slopes, box), 2400);
  assert.equal(wallHeightAt(3000, slopes, box), 2400, 'the slope starts exactly here');
  assert.equal(wallHeightAt(4000, slopes, box), 1800, 'and ends at the start height');
  assert.equal(wallHeightAt(3500, slopes, box), 2100, 'halfway down the run is halfway down the drop');
});

test('dragging a slope moves its RIDGE, in the direction the hand went', () => {
  const box = { wallWidth: 4000, wallHeight: 2400 };
  const right = { wall: 0, side: 'R', startHeight: 1800, run: 900 };
  assert.equal(dragSlope(right, -200, box).run, 1100, 'dragging left grows a right-hand slope');
  const left = { wall: 0, side: 'L', startHeight: 1800, run: 900 };
  assert.equal(dragSlope(left, 200, box).run, 1100, 'dragging right grows a left-hand slope');
});

test('a door only ever moves sideways; a window lifts and drops', () => {
  const box = { wallWidth: 4000, wallHeight: 2400 };
  const door = {
    kind: 'door', x_mm: 500, width: 900, height: 2040, sill: 0,
  };
  assert.deepEqual(moveOpening(door, { dxMm: 100, dyMm: 300 }, box), { x_mm: 600 });
  const win = {
    kind: 'window', x_mm: 500, width: 1200, height: 1400, sill: 900,
  };
  assert.deepEqual(moveOpening(win, { dxMm: 100, dyMm: 50 }, box), { x_mm: 600, sill: 950 });
  assert.equal(moveOpening(win, { dxMm: 9000 }, box).x_mm, 2800, 'never past the end of the wall');
  assert.equal(moveOpening(win, { dyMm: 9000 }, box).sill, 1000, 'never through the ceiling');
});

test('a wall with no width or no height has no elevation, and says so', () => {
  assert.deepEqual(wallElevationIssues({ wallWidth: 0, wallHeight: 2400 }), ['The wall has no width.']);
  assert.deepEqual(wallElevationIssues({ wallWidth: 4000, wallHeight: 0 }), ['The wall has no height.']);
  assert.deepEqual(wallElevationIssues({ wallWidth: 4000, wallHeight: 2400 }), []);
});

test('slopesOnWall answers about ONE wall and normalises what it hands back', () => {
  const list = [
    { id: 's1', wall: 0, side: 'R', run: 900 },
    { id: 's2', wall: 1, side: 'L', run: 500 },
    'rubbish',
  ];
  assert.equal(wallSlopes(list).length, 2, 'rubbish does not survive');
  assert.deepEqual(slopesOnWall(list, 1).map((s) => s.id), ['s2']);
});

// ── THE ROUND-TRIP F1 ASKS FOR, BY NAME ──

test('STORE ROUND-TRIP: a wall with a door, a window AND a slope survives', () => {
  const store = useProjectStore.getState();
  store.newProject('T44 wall', { number: '4400' });
  useProjectStore.getState().setDesign({ scope: 'wall' });

  // The wall itself: 4000 × 2400, through the ordinary room setter.
  const verdict = useProjectStore.getState().setRoom({ height: 2400 });
  assert.equal(verdict.ok, true);

  // A door and a window go on the ROOM's own opening list — the Room path's
  // schema, not a twin (F1).
  useProjectStore.getState().setRoom({
    openings: [
      {
        id: 'op_door', kind: 'door', wall: 0, x_mm: 400, width: 900, height: 2040, sill: 0,
      },
      {
        id: 'op_win', kind: 'window', wall: 0, x_mm: 1800, width: 1200, height: 1400, sill: 900,
      },
    ],
  });
  // …and the slope on the project, keyed by the SAME wall index.
  useProjectStore.getState().setWallSlopes([
    {
      id: 'sl_1', wall: 0, side: 'R', startHeight: 1700, run: 1000,
    },
  ]);

  const { project } = useProjectStore.getState();
  assert.equal(project.room.openings.length, 2);
  assert.equal(project.wallSlopes.length, 1);
  assert.equal(project.wallSlopes[0].side, 'R');
  assert.equal(project.wallSlopes[0].startHeight, 1700);

  // And the three of them come back out of ONE reader as one elevation.
  const wall = roomWalls(project.room)[0];
  const els = elevationElements({
    openings: project.room.openings,
    slopes: project.wallSlopes,
    wallIndex: 0,
    wallWidth: wall.width,
    wallHeight: project.room.height,
  });
  assert.deepEqual(els.map((e) => e.kind).sort(), ['door', 'slope', 'window']);
  const door = els.find((e) => e.kind === 'door');
  assert.equal(door.y, 0, 'a door stands on the floor');
  const win = els.find((e) => e.kind === 'window');
  assert.equal(win.y, 900, 'a window stands on its sill');
  assert.equal(els.find((e) => e.kind === 'slope').points.length, 3);
});

test('ROUND-TRIP part two: save the project, load it back, the three are still there', () => {
  const store = useProjectStore.getState();
  store.newProject('T44 wall B', { number: '4401' });
  useProjectStore.getState().setRoom({
    height: 2400,
    openings: [{
      id: 'op_w', kind: 'window', wall: 0, x_mm: 100, width: 800, height: 1000, sill: 900,
    }],
  });
  useProjectStore.getState().setWallSlopes([{
    id: 'sl_x', wall: 0, side: 'L', startHeight: 1500, run: 700,
  }]);

  const saved = JSON.parse(JSON.stringify(useProjectStore.getState().project));
  const savedUnits = JSON.parse(JSON.stringify(useProjectStore.getState().units));

  // Somewhere else entirely…
  useProjectStore.getState().newProject('another job');
  assert.equal(useProjectStore.getState().project.wallSlopes.length, 0, 'a new job starts straight');

  // …and back.
  useProjectStore.getState().loadProject(saved, savedUnits);
  const back = useProjectStore.getState().project;
  assert.equal(back.room.openings.length, 1);
  assert.equal(back.wallSlopes.length, 1);
  assert.equal(back.wallSlopes[0].side, 'L');
  assert.equal(back.wallSlopes[0].run, 700);
});

test('the element setters add, edit and remove one at a time', () => {
  useProjectStore.getState().newProject('T44 setters');
  useProjectStore.getState().addWallSlope({ wall: 0, side: 'R', startHeight: 1900, run: 800 });
  const [only] = useProjectStore.getState().project.wallSlopes;
  assert.ok(only.id);
  useProjectStore.getState().updateWallSlope(only.id, { side: 'L' });
  assert.equal(useProjectStore.getState().project.wallSlopes[0].side, 'L');
  assert.equal(useProjectStore.getState().project.wallSlopes[0].id, only.id, 'the id is not re-rolled');
  useProjectStore.getState().removeWallSlope(only.id);
  assert.equal(useProjectStore.getState().project.wallSlopes.length, 0);
});

test('the minimum element is stated once, and the elevation honours it', () => {
  assert.equal(MIN_ELEMENT_MM, 50);
  const [el] = elevationElements({
    openings: [{
      id: 'x', kind: 'window', wall: 0, x_mm: 0, width: 1, height: 1, sill: 0,
    }],
    wallIndex: 0,
    wallWidth: 3000,
    wallHeight: 2400,
  });
  assert.equal(el.w, MIN_ELEMENT_MM);
  assert.equal(el.h, MIN_ELEMENT_MM);
});
