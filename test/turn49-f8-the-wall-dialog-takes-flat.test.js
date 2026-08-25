import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  TWO_SLOPES_NOTE, flatFieldShown, flatFromRun, flatRunSum, runFromFlat,
} from '../src/lib/slopeFlat.js';
import { migrateSlope, slopesOnWall } from '../src/lib/wallElements.js';
import { ceilingAt } from '../src/lib/slopeLine.js';

// ─── TURN 49 · F8 — THE WALL DIALOG TAKES FLAT ──────────────────────────────
//
// A slope is entered today as `run` — the length of the fall. The architect
// gives the FLAT stretch instead: the distance from the opposite corner to
// where the slope begins, with `flat + run = wall width`. Type either, the
// other follows; the sum is always the wall.
//
// And the owner's own second ruling: *"flat jest ok chyba. poza tym jak beda 2
// skosy to wtedy skosy musisz dac a nie flat."* With slopes at both ends there
// is no single flat stretch to name, and a field that means two things is worse
// than a field that means one.

const WALL = readFileSync(new URL('../src/components/WallElevationModal.jsx', import.meta.url), 'utf8');

// ══ the arithmetic ═════════════════════════════════════════════════════════

test('F8 — flat + run = wall width, typed either way', () => {
  const W = 4000;
  assert.equal(flatFromRun(900, W), 3100);
  assert.equal(runFromFlat(3100, W), 900);
  // Round trip, on the workshop's own half-millimetres.
  for (const run of [0, 0.5, 250, 999.5, 2000, 3999.5, 4000]) {
    const flat = flatFromRun(run, W);
    assert.equal(runFromFlat(flat, W), run, `run ${run}`);
    assert.equal(flatRunSum(flat, run), W, `sum at run ${run}`);
  }
});

test('F8 — the sum is ALWAYS the wall, even when the number typed is not', () => {
  const W = 3000;
  // A run longer than the wall leaves no flat — 0, never a negative.
  assert.equal(flatFromRun(5000, W), 0);
  assert.equal(runFromFlat(-500, W), W);
  assert.equal(flatFromRun(-1, W), W);
  // A wall of nothing has neither.
  assert.equal(flatFromRun(900, 0), 0);
  assert.equal(runFromFlat(900, 0), 0);
  // …and nonsense in is the wall out, not NaN.
  assert.equal(flatFromRun(undefined, W), W);
  assert.equal(runFromFlat('abc', W), W);
});

test('F8 — the Flat field steps aside at the SECOND slope', () => {
  assert.equal(flatFieldShown(0), true);
  assert.equal(flatFieldShown(1), true);
  assert.equal(flatFieldShown(2), false);
  assert.equal(flatFieldShown(3), false);
  assert.match(TWO_SLOPES_NOTE, /each is entered by its own run/);
});

test('F8 — and "two slopes" is counted on THIS wall, by the reader that already exists', () => {
  const list = [
    { id: 's1', kind: 'slope', wall: 0, side: 'L', startHeight: 1800, run: 800 },
    { id: 's2', kind: 'slope', wall: 0, side: 'R', startHeight: 1800, run: 900 },
    { id: 's3', kind: 'slope', wall: 1, side: 'R', startHeight: 1800, run: 900 },
  ];
  assert.equal(slopesOnWall(list, 0).length, 2, 'wall 0 has both');
  assert.equal(flatFieldShown(slopesOnWall(list, 0).length), false);
  assert.equal(slopesOnWall(list, 1).length, 1, 'wall 1 has one of its own');
  assert.equal(flatFieldShown(slopesOnWall(list, 1).length), true);
});

// ══ the dialog draws it ════════════════════════════════════════════════════

test('F8 — the dialog takes Flat, and writes the RUN', () => {
  assert.match(WALL, /data-slope-flat="1"/);
  assert.match(WALL, /value=\{flatFromRun\(element\.run, wallWidth\)\}/);
  assert.match(WALL, /onCommit=\{\(v\) => onSlope\(\{ run: runFromFlat\(v, wallWidth\) \}\)\}/);
  // The run field is untouched and still writes the run directly.
  assert.match(WALL, /data-slope-run="1"/);
  assert.match(WALL, /onCommit=\{\(v\) => onSlope\(\{ run: v \}\)\}/);
  // Both are gated on the same rule, and the wall's own slope count feeds it.
  assert.match(WALL, /\{flatFieldShown\(slopeCount\) && \(/);
  assert.match(WALL, /slopeCount=\{slopesHere\.length\}/);
  assert.match(WALL, /slopesOnWall\(storedSlopes, wallIndex\)/);
});

test('F8 — and it says so, in one short line, when the second slope appears', () => {
  assert.match(WALL, /data-slope-note="flat"/);
  assert.match(WALL, /data-slope-note="two-slopes"/);
  assert.match(WALL, /\{TWO_SLOPES_NOTE\}/);
});

// ══ what F8 does NOT touch ═════════════════════════════════════════════════

test('F8 — nothing is STORED but the run', () => {
  // `flat` is a way of typing a run. It is never written to a slope record —
  // `migrateSlope` is the whitelist, and it has not grown a field.
  const s = migrateSlope({
    id: 's1', wall: 0, side: 'R', startHeight: 1800, run: 900, flat: 3100,
  });
  assert.deepEqual(Object.keys(s).sort(), ['id', 'kind', 'run', 'side', 'startHeight', 'wall']);
  assert.equal(s.run, 900);
  assert.equal(s.flat, undefined);
  // …and the surface never writes one either.
  assert.doesNotMatch(WALL, /onSlope\(\{ flat/);
});

test('F8 — ceilingAt, the cut line and the engine are exactly what they were', () => {
  // The same slope, asked the same question, gives the same answers as it did
  // before this turn: the geometry reads `run` and has never heard of `flat`.
  const slopes = [{ id: 's1', kind: 'slope', wall: 0, side: 'R', startHeight: 1800, run: 900 }];
  const at = (x) => ceilingAt(x, slopes, { wallWidth: 4000, wallHeight: 2400 });
  assert.equal(at(0), 2400, 'the flat end is the full height');
  assert.equal(at(3100), 2400, '…right up to where the fall begins');
  assert.equal(at(4000), 1800, 'and the far corner is the start height');
  // The knee really is at `flat`, which is the whole claim the field makes.
  assert.equal(flatFromRun(900, 4000), 3100);
  assert.ok(at(3500) < 2400 && at(3500) > 1800, 'and it falls between them');
});
