import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ceilingAt, ceilingPolyline, slopeBreakXs, isCut, slopeInfillMm, slopeMinimumMm,
} from '../src/lib/slopeLine.js';
import { wallHeightAt } from '../src/lib/wallElements.js';
import { roomWalls, wallsInScope } from '../src/engine/room.js';

// ─── TURN 46 · F1 — THE WALL CLOSES: THE STUB HONOURS THE SLOPE ─────────────
//
// The owner, 24.08.2026, screenshot in hand: *"sufit się ścina, ale ściana już
// nie — nie łączy się."*
//
// CLAUDE.md F1: *"The return stub at the slope's low end is `startHeight` tall,
// not `room.height` — `Room.jsx` passes the wall's slopes to stubs and the
// stub's own outline is cut by the SAME `ceilingAt` (a stub is a fragment of
// its wall; it inherits the wall's line over its x range). The gap in the
// owner's screenshot dies."*
//
// And the rule the whole turn stands on, from the header of CLAUDE.md:
// *"`ceilingAt(x)` is THAT function — write it ONCE … Two independent lerps in
// two files is the two-chain disease and fails the turn."*

const room = readFileSync(new URL('../src/3d/Room.jsx', import.meta.url), 'utf8');
const elements = readFileSync(new URL('../src/lib/wallElements.js', import.meta.url), 'utf8');

const WALL = { wallWidth: 4000, wallHeight: 2500 };
const R900 = [{ side: 'R', startHeight: 1200, run: 900 }];
const L900 = [{ side: 'L', startHeight: 1200, run: 900 }];

// ── the line itself ──

test('ceilingAt is flat until the run begins, then linear to startHeight', () => {
  assert.equal(ceilingAt(0, R900, WALL), 2500);
  assert.equal(ceilingAt(3100, R900, WALL), 2500, 'the knee is still full height');
  assert.equal(ceilingAt(3550, R900, WALL), 1850, 'half way down the run, half the drop');
  assert.equal(ceilingAt(4000, R900, WALL), 1200, 'the wall ends at startHeight');
});

test('…and it mirrors exactly on the L', () => {
  assert.equal(ceilingAt(0, L900, WALL), 1200);
  assert.equal(ceilingAt(450, L900, WALL), 1850);
  assert.equal(ceilingAt(900, L900, WALL), 2500);
  assert.equal(ceilingAt(4000, L900, WALL), 2500);
});

test('two slopes on one wall answer with the LOWEST of them', () => {
  const both = [...R900, ...L900];
  assert.equal(ceilingAt(0, both, WALL), 1200);
  assert.equal(ceilingAt(4000, both, WALL), 1200);
  assert.equal(ceilingAt(2000, both, WALL), 2500);
});

test('a nonsense slope degenerates rather than folding the wall inside out', () => {
  assert.equal(ceilingAt(2000, [{ side: 'R', startHeight: 9999, run: 900 }], WALL), 2500);
  assert.equal(ceilingAt(2000, [{ side: 'R', startHeight: 1200, run: 0 }], WALL), 2500);
  assert.equal(ceilingAt(2000, [{ side: 'R', startHeight: 1200, run: 99999 }], WALL), 1850,
    'a run longer than the wall is clamped to the wall');
});

test('x outside the wall is clamped, never extrapolated', () => {
  assert.equal(ceilingAt(-500, R900, WALL), ceilingAt(0, R900, WALL));
  assert.equal(ceilingAt(99999, R900, WALL), ceilingAt(4000, R900, WALL));
});

// ── ONE LERP: wallHeightAt is now a call into it ──

test('wallHeightAt gives the same numbers — and has no lerp of its own', () => {
  for (const x of [0, 500, 3100, 3325, 3550, 4000]) {
    assert.equal(wallHeightAt(x, R900, WALL), ceilingAt(x, R900, WALL), `x=${x}`);
  }
  assert.equal(elements.match(/\(h - s\.startHeight\)/g), null,
    'the lerp has left wallElements.js — one ceilingAt, imported');
  assert.match(elements, /import \{ ceilingAt \} from '\.\/slopeLine\.js'/);
});

test('the wall MESH has no lerp of its own either (the two-chain disease)', () => {
  assert.equal(room.includes('s.startHeight'), false, 'no startHeight arithmetic');
  assert.equal(room.includes('const cutOf'), false, 'the 24.08 chat-fix lerp is gone');
  assert.equal(/mm\(s\.run\)/.test(room), false, 'no run arithmetic in the mesh');
  assert.match(room, /import \{ ceilingAt, ceilingPolyline \} from '\.\.\/lib\/slopeLine\.js'/);
});

// ── the polyline the mesh traces ──

test('the polyline carries a vertex at the KNEE, not a sampled curve', () => {
  assert.deepEqual(ceilingPolyline({ slopes: R900, ...WALL }), [
    { x: 0, y: 2500 }, { x: 3100, y: 2500 }, { x: 4000, y: 1200 },
  ]);
  assert.deepEqual(slopeBreakXs(R900, WALL), [0, 3100, 4000]);
});

test('a flat wall traces exactly the rectangle it always traced', () => {
  assert.deepEqual(ceilingPolyline({ slopes: [], ...WALL }), [
    { x: 0, y: 2500 }, { x: 4000, y: 2500 },
  ]);
  assert.equal(isCut([], WALL), false);
  assert.equal(isCut(R900, WALL), true);
});

// ── F1 PROPER: the stub is a fragment of its wall ──

test('a stub asks for its OWN stretch of its wall line', () => {
  // The last 1000 mm of a 4000 wall whose ceiling drops over the last 900.
  const stub = ceilingPolyline({
    slopes: R900, ...WALL, from: 3000, to: 4000,
  });
  assert.deepEqual(stub, [
    { x: 3000, y: 2500 }, { x: 3100, y: 2500 }, { x: 4000, y: 1200 },
  ]);
});

test('…and the stretch away from the slope is untouched full height', () => {
  assert.deepEqual(ceilingPolyline({ slopes: R900, ...WALL, from: 0, to: 1000 }), [
    { x: 0, y: 2500 }, { x: 1000, y: 2500 },
  ]);
});

test('the 23.08 chat-fix is repaired BY NAME: no stub is handed slopes={[]}', () => {
  assert.equal(room.includes('slopes={wall.stub ? [] : slopesOnWall(wall.index)}'), false,
    'the line that blanked every stub is gone');
  assert.match(room, /slopes=\{slopesOnWall\(wall\.index\)\}/);
  assert.match(room, /xOffset=\{stubOffset\(wall\)\}/);
  assert.match(room, /spanWidth=\{fullWidthOf\(wall\.index\)\}/);
  assert.match(room, /capY=\{stubCap\(wall\)\}/);
  // …and NOTHING else about the stub changed: openings are still blanked,
  // because a 1000 mm return is not where anybody puts a window.
  assert.match(room, /openings=\{wall\.stub \? \[\] : openingsOnWall\(room, wall\.index\)\}/);
});

test('the return at the slope\'s low end is startHeight tall, not room.height', () => {
  // The one-wall scope: wall 0 plus two returns, exactly as engine/room.js cuts
  // them. The slope is on wall 0 and comes down at its RIGHT end, so the return
  // that meets corner 1 stands under a ceiling of `startHeight` over its whole
  // length — walking along a return does not move along wall 0's x at all.
  const model = {
    corners: [
      { x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 },
    ],
    height: 2500,
    wall_stub_mm: 1000,
  };
  const walls = roomWalls(model);
  const scoped = wallsInScope(model, 'wall');
  assert.equal(scoped.length, 3, 'the wall and its two returns');
  const main = scoped[0];
  const stubs = scoped.slice(1);
  assert.ok(stubs.every((w) => w.stub === true));

  const capOf = (w) => {
    const near = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
    const cornerX = (near(w.end, main.start) || near(w.start, main.start)) ? 0 : main.width;
    return ceilingAt(cornerX, R900, { wallWidth: main.width, wallHeight: model.height });
  };
  const caps = stubs.map(capOf).sort((a, b) => a - b);
  assert.deepEqual(caps, [1200, 2500],
    'the return under the low end is 1200 (startHeight); the far one is full height');
  assert.ok(walls.length === 4);
});

test('a stub carries its own wall\'s slope over its own x range', () => {
  // A slope on the RETURN itself (wall 1), whose stub keeps the wall's START:
  // the stub covers x 0…1000 of that wall, so an L slope bites it and an R
  // slope 3000 mm away does not.
  const onStub = ceilingPolyline({
    slopes: [{ side: 'L', startHeight: 900, run: 400 }],
    wallWidth: 3000, wallHeight: 2500, from: 0, to: 1000,
  });
  assert.deepEqual(onStub, [{ x: 0, y: 900 }, { x: 400, y: 2500 }, { x: 1000, y: 2500 }]);
});

// ── the two numbers the rest of the turn stands on ──

test('the scribe gap IS the project\'s infill — "jak ustawimy infill 40 to 40"', () => {
  assert.equal(slopeInfillMm({ infill: { sideWidth: 40 } }), 40);
  assert.equal(slopeInfillMm({ infill: { sideWidth: 0 } }), 0);
  assert.equal(slopeInfillMm(null), 0, 'no project, no gap invented');
});

test('the minimum is the owner\'s 400 unless the workshop has raised it', () => {
  assert.equal(slopeMinimumMm(null), 400);
  assert.equal(slopeMinimumMm({ checks: { slopeMinimumMm: 500 } }), 500);
  assert.equal(slopeMinimumMm({ checks: { slopeMinimumMm: 0 } }), 400, 'zero is not an answer');
});
