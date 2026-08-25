import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ceilingPolyline, slopeCutLine, slopeInfillMm } from '../src/lib/slopeLine.js';

// ─── TURN 47 · F6 — THE GHOST LINE (CLAUDE.md F6) ───────────────────────────
//
//   *"During a drag into a slope zone, a ghost line shows the cut-to-be. It
//   reads `ceilingAt` — the same one, no second chain. FIRST TO FALL."*
//
// It did not fall. A cabinet driving under a slope is about to lose its top
// corner, and until tonight there was nothing on the screen that said so — the
// cut arrived when the hand let go.
//
// The whole of this feature is one claim, and it is the claim the turn is
// about: THE LINE THE GHOST DRAWS IS THE LINE THE ENGINE CUTS. So this file
// asserts the two are the same numbers, and that the view computes none of
// them itself.

const view = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
const room = readFileSync(new URL('../src/3d/Room.jsx', import.meta.url), 'utf8');

test('the ghost reads the ONE ceilingAt, imported — no second chain', () => {
  assert.match(view, /import \{ ceilingPolyline, slopeInfillMm \} from '\.\.\/lib\/slopeLine\.js';/);
  // …and it invents nothing: no gradient, no start height, no lerp of its own.
  const own = view.slice(view.indexOf('const ghost = useMemo'),
    view.indexOf('unit.position?.x_mm, wall.width, W, baseY]);'));
  assert.equal(/startHeight/.test(own), false, 'the view never reads a slope\'s numbers');
  assert.equal(/\bslope\.run\b|\.startHeight\b/.test(own), false, 'nor divides one by the other');
  // The wall mesh reads the same function, which is the point of it existing.
  assert.match(room, /import \{ ceilingAt, ceilingPolyline \} from '\.\.\/lib\/slopeLine\.js';/);
});

test('it is a HELD signal — it appears on pointerdown and is gone on release', () => {
  assert.match(view, /const \[dragging, setDragging\] = useState\(false\);/);
  assert.match(view, /drag\.current = \{ offset: alongMm\(hit\) - unit\.position\.x_mm \};\n\s*setDragging\(true\);/);
  assert.match(view, /drag\.current = null;\n\s*setDragging\(false\);/);
  // …and nothing is drawn at all when it is not being held.
  assert.match(view, /if \(!dragging\) return null;/);
});

test('it is a HELPER: out of the camera\'s bounds and out of every render', () => {
  const comp = view.slice(view.indexOf('function SlopeGhost'), view.indexOf('function DashedGuide'));
  assert.match(comp, /userData=\{\{ ccHelper: true \}\}/);
  assert.match(comp, /lineDashedMaterial/);
  assert.match(comp, /computeLineDistances/, 'three.js will not dash a line for you');
  assert.match(comp, /geometry\.dispose\(\)/, 'and a helper that leaks a geometry per drag is a leak');
});

test('THE CLAIM: the ghost\'s points ARE the engine\'s cut, to the millimetre', () => {
  // The view's own arithmetic, restated here from the source's own shape:
  //   ceilingPolyline over the unit's span, less the project infill, less the
  //   carcass base. `slopeCutLine` does the same three subtractions for the
  //   engine. If the two ever drift, this is what says so.
  const wall = { wallWidth: 4000, wallHeight: 2500 };
  const slopes = [{ side: 'R', startHeight: 300, run: 900 }];
  const design = { infill: { sideWidth: 40 } };
  const gap = slopeInfillMm(design);
  const x0 = 2800;
  const W = 600;
  const baseY = 100;

  const ghost = ceilingPolyline({ slopes, ...wall, from: x0, to: x0 + W })
    .map((q) => ({ x: q.x - x0, y: Math.max(0, q.y - gap - baseY) }));
  const engine = slopeCutLine({
    slopes, ...wall, x: x0, width: W, infill: gap, floorY: baseY,
  });
  assert.deepEqual(ghost, engine.pts);
  // …and it BENDS: this unit straddles the knee at 3100 (the wall is 4000 and
  // the run is its last 900), so there are three points and the middle one is
  // the ceiling's own bend.
  assert.equal(ghost.length, 3);
  assert.equal(ghost[0].x, 0);
  assert.equal(ghost[1].x, 3100 - x0, 'the knee, in the unit\'s own frame');
  assert.equal(ghost[0].y, ghost[1].y, 'flat up to the knee');
  assert.ok(ghost[2].y < ghost[1].y, 'and falling after it');
});

test('…and nothing is drawn where there is nothing to warn about', () => {
  const wall = { wallWidth: 4000, wallHeight: 2500 };
  const slopes = [{ side: 'R', startHeight: 300, run: 900 }];
  // A unit well clear of the run: the polyline is flat at the room height, the
  // view's own guard drops it, and `slopeCutLine` answers null for the engine.
  const flat = ceilingPolyline({ slopes, ...wall, from: 100, to: 700 });
  assert.equal(flat.every((q) => q.y >= 2500 - 1e-6), true);
  assert.equal(slopeCutLine({ slopes, ...wall, x: 100, width: 600, infill: 40 }), null);
  // The guard, in the view's own words.
  assert.match(view, /if \(!line\.some\(\(q\) => q\.y < h - 1e-6\)\) return null;/);
  assert.match(view, /if \(!slopes\.length\) return null;/);
});
