import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ceilingPolyline, slopeCutLine, slopeInfillMm } from '../src/lib/slopeLine.js';
import { carcassCutPts } from '../src/engine/puzzle.js';

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
//
// T54-F1 AMENDED (28.08.2026): the line the engine cuts is no longer the
// ceiling minus a vertical infill — `slope_cut.pts` is now THE CEILING (minus
// floorY only), the infill rides beside it on the record, and the carcass is
// cut on `cutReach = ceilReach − infill / cos β` per segment
// (`engine/puzzle.js carcassCutPts`). The CLAIM is unchanged and the numbers
// below are recomputed to the new law: the ghost draws `carcassCutPts` of the
// ceiling with the project infill — the engine's own lowering, not a second
// arithmetic.

const view = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
const room = readFileSync(new URL('../src/3d/Room.jsx', import.meta.url), 'utf8');

test('the ghost reads the ONE ceilingAt, imported — no second chain', () => {
  assert.match(view, /import \{ ceilingPolyline, slopeInfillMm \} from '\.\.\/lib\/slopeLine\.js';/);
  // …and it invents nothing: no gradient, no start height, no lerp of its own.
  const own = view.slice(view.indexOf('const ghost = useMemo'),
    view.indexOf('unit.position?.x_mm, wall.width, W, baseY]);'));
  assert.equal(/startHeight/.test(own), false, 'the view never reads a slope\'s numbers');
  assert.equal(/\bslope\.run\b|\.startHeight\b/.test(own), false, 'nor divides one by the other');
  // T54-F1 AMENDED (28.08.2026): the lowering from ceiling to carcass line is
  // the ENGINE's own `carcassCutPts`, imported — the view still invents no
  // arithmetic of its own, and now not even the subtraction.
  assert.match(view, /import \{ carcassCutPts \} from '\.\.\/engine\/puzzle\.js';/);
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
  //   ceilingPolyline over the unit's span, into the unit's frame (less the
  //   carcass base), then the engine's own `carcassCutPts` with the project
  //   infill. If the view and the engine ever drift, this is what says so.
  //
  // T54-F1 AMENDED (28.08.2026): the old restatement subtracted the infill
  // VERTICALLY at every vertex (q.y − gap − baseY) and matched `slopeCutLine`,
  // which did the same — the one-line law the owner's audit caught stacking
  // three boards. Now `slopeCutLine` hands down the CEILING (minus floorY
  // only) with the infill riding beside it, and the carcass line is
  // `carcassCutPts` of it: each segment lowered by `infill / cos β`, knees at
  // the mitred-offset intersection.
  const wall = { wallWidth: 4000, wallHeight: 2500 };
  const slopes = [{ side: 'R', startHeight: 300, run: 900 }];
  const design = { infill: { sideWidth: 40 } };
  const gap = slopeInfillMm(design);
  const x0 = 2800;
  const W = 600;
  const baseY = 100;

  const ghost = carcassCutPts({
    pts: ceilingPolyline({ slopes, ...wall, from: x0, to: x0 + W })
      .map((q) => ({ x: q.x - x0, y: q.y - baseY })),
  }, gap).map((q) => ({ x: q.x, y: Math.max(0, q.y) }));
  const engine = slopeCutLine({
    slopes, ...wall, x: x0, width: W, infill: gap, floorY: baseY,
  });
  // T54-F1 AMENDED (28.08.2026): the record's pts are the CEILING in the
  // unit's frame — no infill subtracted — and the infill rides beside them.
  // Hand-computed: room 2500, knee at 3100 (wall 4000, run its last 900),
  // ceiling at 3400 = 300 + 2200·600/900 = 1766.6667; all less baseY 100.
  assert.deepEqual(engine.pts, [
    { x: 0, y: 2400 }, { x: 300, y: 2400 }, { x: 600, y: 1666.6667 },
  ]);
  assert.equal(engine.infill, gap, 'the 40 rides on the record, unsubtracted');
  // THE CLAIM itself, same rigor as before: the ghost's points ARE the carcass
  // line the engine cuts from this record — `carcassCutPts` of its own pts
  // with its own infill — number for number.
  assert.deepEqual(ghost, carcassCutPts(engine, engine.infill));
  // …and it BENDS: this unit straddles the knee, so there are three points.
  assert.equal(ghost.length, 3);
  assert.equal(ghost[0].x, 0);
  // T54-F1 AMENDED (28.08.2026): the carcass knee is no longer the ceiling's
  // own bend at 300 — it is the intersection of the two LOWERED segments (the
  // mitred offset), which lands LEFT of the ceiling knee. Hand-computed:
  // rake m = 2200/900 down; cos β = 900/√(900²+2200²); reserve = 40/cos β =
  // 105.6432; knee shift = (reserve − 40)/m = 26.8541 → x = 273.1459.
  const m = (2400 - 1666.6667) / 300;
  const reserve = gap * Math.hypot(300, 2400 - 1666.6667) / 300;
  assert.ok(Math.abs(reserve - 105.6432) < 0.01, 'the worked reserve, restated');
  assert.ok(ghost[1].x < 300, 'the knee shifts toward the flat side');
  assert.ok(Math.abs(ghost[1].x - (300 - (reserve - gap) / m)) < 1e-9,
    'the knee, at the mitred-offset intersection, in the unit\'s own frame');
  assert.equal(ghost[0].y, ghost[1].y, 'flat up to the knee');
  assert.ok(Math.abs(ghost[0].y - (2400 - gap)) < 1e-9,
    'flat stretch lowered by exactly the infill — cos β = 1, the degenerate case');
  assert.ok(Math.abs(ghost[2].y - (1666.6667 - reserve)) < 1e-9,
    'raked end lowered by infill / cos β — the strip\'s cut height on the slope');
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
