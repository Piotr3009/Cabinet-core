import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  rectGeometry, slopeCutActive, slopeCutPts, slopeHeightAt, slopePeakBetween, slopeReachAt,
  slopeSegDeg, slopeSegments, slopeValleyBetween, subSlopeCut, trimGeometryOnSlope,
  trimOutlineOnSlope,
} from '../src/engine/puzzle.js';
import {
  ceilingPolyline, cutEnds, cutHeightAt, cutPeak, cutPoints, cutValley, slopeCutLine,
} from '../src/lib/slopeLine.js';

// ─── TURN 47 · F1 — THE LINE BENDS (CLAUDE.md F1) ───────────────────────────
//
// The owner, 24.08.2026, screenshot in hand:
//
//   *"jak sie konczy skos to powinno sie zalamywac kat tam gdzie sie zalamuje a
//   nie od konca do konca szafy… w tym przypadku powinno byc czesc prosta i od
//   momentu zalamania skos taki sam jak reszta skosu, nie moze byc od konca do
//   konca szafy bo nie mamy ten sam skos i to nie zadziala."*
//
// T46 sampled the ceiling at the unit's two edges and handed the engine a
// STRAIGHT LINE. Where the ceiling bends inside the cabinet's own width that
// line is a fiction — it bevels the boards at an angle the wall does not have —
// and the owner named it as a production defect. So the cut becomes the
// CEILING'S OWN POLYLINE.
//
// T54-F1 AMENDED (28.08.2026): `slope_cut.pts` is now literally the CEILING
// (`slopeCutLine` no longer subtracts the infill; it rides beside the pts as
// the record's `infill` field) and the CARCASS is cut on the lowered line
// cutReach(x) = ceil(x) − infill/cos β per segment (`carcassCutPts`) — at a
// knee the lowered vertex is the mitred intersection of the two lowered
// segments, so its x may shift off the ceiling's own knee x. The polyline law
// of this file is untouched; the expected NUMBERS in the cabinet-level blocks
// below are restated on the lowered line. With infill 0 the two lines are one.
//
// CLAUDE.md asks for four proofs, and they are the four blocks below.

const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];

// ═══ 1 · THE SAFETY NET ══════════════════════════════════════════════════════
//
//   *"a unit under one straight run — outline IDENTICAL to T46, vertex for
//   vertex … prove that, it is the safety net for this whole rewrite."*
//
// T46's algorithm is RE-IMPLEMENTED here rather than remembered: two heights, a
// single lerp, a single half-plane clip, its own `cross` solve and its own
// dedupe. It is a copy of the code this turn replaced, so an assertion that the
// two agree is an assertion against T46 itself and not against a comment about
// T46. If a later turn changes the polyline walk, THIS is what fails first.

/** engine/puzzle.js at b83b113, verbatim. */
function t46SlopeHeightAt({ w, hL, hR }, x) {
  const width = Number(w) || 0;
  if (!(width > 0)) return Number(hL) || 0;
  const t = Math.min(Math.max(Number(x) || 0, 0), width) / width;
  return Number(hL) + (Number(hR) - Number(hL)) * t;
}

/** engine/puzzle.js at b83b113, verbatim. */
function t46TrimOutline(outline, { w, h, hL, hR }) {
  const pts = Array.isArray(outline) ? outline : [];
  const active = Number(hL) < (Number(h) || 0) - 1e-9 || Number(hR) < (Number(h) || 0) - 1e-9;
  if (!pts.length || !active) return outline;
  const at = (x) => t46SlopeHeightAt({ w, hL, hR }, x);
  const under = (p) => p[1] <= at(p[0]) + 1e-9;
  const cross = (a, b) => {
    const fa = a[1] - at(a[0]);
    const fb = b[1] - at(b[0]);
    const d = fa - fb;
    if (Math.abs(d) < 1e-12) return [b[0], at(b[0])];
    const t = Math.min(Math.max(fa / d, 0), 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const out = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ain = under(a);
    const bin = under(b);
    if (ain) out.push(a);
    if (ain !== bin) out.push(cross(a, b));
  }
  const round4 = (v) => Math.round(v * 1e4) / 1e4;
  const clean = [];
  for (const p of out) {
    const last = clean[clean.length - 1];
    if (last && Math.abs(last[0] - p[0]) < 1e-9 && Math.abs(last[1] - p[1]) < 1e-9) continue;
    clean.push([round4(p[0]), round4(p[1])]);
  }
  const first = clean[0];
  const last = clean[clean.length - 1];
  if (clean.length > 1 && first && last
    && Math.abs(first[0] - last[0]) < 1e-9 && Math.abs(first[1] - last[1]) < 1e-9) clean.pop();
  return clean;
}

test('SAFETY NET — a two-point line is T46, vertex for vertex, on every branch', () => {
  const cases = [
    // w, h, hL, hR — the four answers SKY:slopeCutPts has always had
    [600, 2150, 2400, 2400],   // nothing to trim
    [600, 2150, 2000, 1500],   // trapezium
    [600, 2150, 2400, 1500],   // pentagon, low on the right
    [600, 2150, 1500, 2400],   // pentagon, low on the left, mirrored
    [900, 2150, 2150, 900],    // the knee exactly on the tall corner
    [900, 2150, 900, 2150],
    [1200, 700, 690, 10],      // a shallow cabinet under a steep ceiling
    [17, 2150, 2149.5, 2148],  // a sliver, to catch a rounding difference
  ];
  for (const [w, h, hL, hR] of cases) {
    const was = t46TrimOutline(rect(w, h), { w, h, hL, hR });
    const now = trimOutlineOnSlope(rect(w, h), { w, h, hL, hR });
    assert.deepEqual(now, was, `w${w} h${h} ${hL}→${hR}`);
    // …and stating the SAME line as two explicit points changes nothing.
    const spelt = trimOutlineOnSlope(rect(w, h), {
      w, h, pts: [{ x: 0, y: hL }, { x: w, y: hR }],
    });
    assert.deepEqual(spelt, was, `w${w} h${h} ${hL}→${hR} spelt as points`);
  }
});

test('SAFETY NET — …and the HEIGHT at every x is T46\'s own arithmetic, to the bit', () => {
  for (const [w, hL, hR] of [[600, 2400, 1200], [17, 2149.5, 2148], [1200, 700, 10]]) {
    for (let i = 0; i <= 40; i += 1) {
      const x = (w * i) / 40;
      assert.equal(
        slopeHeightAt({ w, hL, hR }, x),
        t46SlopeHeightAt({ w, hL, hR }, x),
        `x=${x} on ${w} ${hL}→${hR}`,
      );
    }
  }
});

test('SAFETY NET — a tabbed side panel keeps every tab T46 kept', () => {
  // The side panel's outline runs OUTSIDE [0, w]: its three tabs stick out past
  // the back edge by G. T46 clamped the line there and so does T47.
  const w = 582;
  const h = 2150;
  const tabbed = [
    [0, 0], [w, 0], [w, 300], [w + 18, 300], [w + 18, 380], [w, 380],
    [w, 1100], [w + 18, 1100], [w + 18, 1180], [w, 1180],
    [w, 1900], [w + 18, 1900], [w + 18, 1980], [w, 1980], [w, h], [0, h],
  ];
  for (const [hL, hR] of [[2150, 2150], [1500, 1500], [2400, 1000], [1000, 2400]]) {
    assert.deepEqual(
      trimOutlineOnSlope(tabbed, { w, h, hL, hR }),
      t46TrimOutline(tabbed, { w, h, hL, hR }),
      `tabs under ${hL}→${hR}`,
    );
  }
});

test('SAFETY NET — the whole cabinet, panel for panel, under one straight run', () => {
  // The engine's own output, not a helper's: the T46 spelling `{y0, y1}` and
  // the T47 spelling `{pts}` describe the same line and must cut the same
  // cabinet to the last hundredth, on every board.
  const pair = computeCabinet({ ...PARAMS, slope_cut: { y0: 2400, y1: 1200, infill: 40 } }, P);
  const line = computeCabinet({
    ...PARAMS,
    slope_cut: { pts: [{ x: 0, y: 2400 }, { x: 600, y: 1200 }], infill: 40 },
  }, P);
  assert.deepEqual(line.panels, pair.panels);
  assert.deepEqual(line.drills, pair.drills);
  assert.deepEqual(line.csvLines, pair.csvLines);
});

// ═══ 2 · A UNIT STRADDLING A KNEE ════════════════════════════════════════════
//
//   *"the vertex is IN the panel's outline at the knee's own x, and the two
//   segments carry the two different angles."*

const KNEE = {
  // 900 wide. Flat at 2000 to x = 300, then falling to 1400 at 900.
  pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }],
  infill: 40,
};

test('THE KNEE IS IN THE BOARD, at the knee\'s own x', () => {
  const out = trimOutlineOnSlope(rect(900, 2150), { w: 900, h: 2150, pts: KNEE.pts });
  assert.deepEqual(out, [[0, 0], [900, 0], [900, 1400], [300, 2000], [0, 2000]]);
  const knee = out.find((p) => p[0] === 300);
  assert.ok(knee, 'the vertex is there');
  assert.equal(knee[1], 2000, 'and it is at the ceiling\'s own height');
});

test('…and the two segments carry the two DIFFERENT angles', () => {
  const segs = slopeSegments({ w: 900, h: 2150, pts: KNEE.pts });
  assert.equal(segs.length, 2);
  assert.equal(segs[0].deg, 0, 'the flat part is flat');
  assert.equal(Math.round(segs[1].deg * 10) / 10, 45, '600 across, 600 down');
  // The fiction T46 would have drawn: ONE angle, corner to corner, and it is
  // neither of the two the wall actually has.
  assert.equal(Math.round(slopeSegDeg(900, -600) * 10) / 10, 33.7);
});

test('…and the height at a point is read INSIDE the containing segment', () => {
  const cut = { w: 900, h: 2150, pts: KNEE.pts };
  assert.equal(slopeHeightAt(cut, 150), 2000, 'still flat at 150');
  assert.equal(slopeHeightAt(cut, 300), 2000, 'the knee itself');
  assert.equal(slopeHeightAt(cut, 600), 1700, 'half way down the fall');
  // T46's answer at the same x, from the same two ends — 66 mm of plaster.
  assert.equal(t46SlopeHeightAt({ w: 900, hL: 2000, hR: 1400 }, 600), 1600);
});

test('a cabinet under the knee: the BACK carries the vertex and says where it is', () => {
  // T54-F1 AMENDED (28.08.2026): the carcass is cut on cutReach = ceiling −
  // infill/cos β per segment, so the BACK's knee is the MITRED intersection of
  // the two lowered segments, no longer the ceiling's own (300, 2000). Flat
  // run: 2000 − 40 = 1960. 45° fall: 2000 − 40/cos 45° = 2000 − 56.5685 lands
  // the lowered fall on y = 1943.4315 − (x − 300), which meets 1960 at
  // x = 300 − 40·(√2 − 1) = 283.4315.
  const r = computeCabinet({ ...PARAMS, width: 900, slope_cut: KNEE }, P);
  const back = r.panels.find((p) => p.id === 'BACK');
  assert.deepEqual(back.meta.slopeCut.knees, [283.4315], 'the record names the bend');
  assert.ok(back.cnc.outline.some(([x, y]) => x === 283.4315 && y === 1960),
    `the knee is a corner of the board: ${JSON.stringify(back.cnc.outline)}`);
  assert.equal(back.cnc.outline.length, 5);
});

test('NOTHING assumes five corners — a ceiling that bends twice makes seven', () => {
  const twice = {
    pts: [
      { x: 0, y: 1600 }, { x: 300, y: 2000 }, { x: 900, y: 2000 }, { x: 1200, y: 1500 },
    ],
    infill: 40,
  };
  const out = trimOutlineOnSlope(rect(1200, 2150), { w: 1200, h: 2150, pts: twice.pts });
  assert.equal(out.length, 6, 'four on the line, two on the floor');
  const r = computeCabinet({ ...PARAMS, width: 1200, slope_cut: twice }, P);
  const back = r.panels.find((p) => p.id === 'BACK');
  // T54-F1 AMENDED (28.08.2026): the BACK's knees are the mitred-offset
  // intersections of the lowered segments, not the ceiling's [300, 900].
  // Rise 3-4-5 (cos = 0.6): drop 40/0.6 = 66.6667, so y = 1533.3333 + (4/3)x
  // meets the lowered flat (2000 − 40 = 1960) at x = 320 exactly. Fall
  // 3-5-√34 (cos = 300/√340000): drop 77.746, so y = 1922.254 − (5/3)(x − 900)
  // meets 1960 at x = 877.3524.
  assert.deepEqual(back.meta.slopeCut.knees, [320, 877.3524]);
  assert.equal(back.meta.slopeCut.corners, back.cnc.outline.length);
  assert.ok(back.cnc.outline.length > 5, `${back.cnc.outline.length} corners`);
});

// ═══ 3 · TWO SLOPES IN ONE UNIT ══════════════════════════════════════════════
//
//   *"a unit under an L slope and an R slope at once — descends, runs flat,
//   descends. No separate code path."*

test('TWO SLOPES: the line descends, runs flat, and descends again', () => {
  const wall = {
    slopes: [
      { side: 'L', startHeight: 1800, run: 800 },
      { side: 'R', startHeight: 1600, run: 700 },
    ],
    wallWidth: 3000,
    wallHeight: 2600,
  };
  // The whole wall, so both slopes are inside one unit.
  const line = slopeCutLine({ ...wall, x: 0, width: 3000, infill: 40, floorY: 0 });
  assert.equal(line.pts.length, 4, 'two ends and two knees');
  const ys = line.pts.map((p) => p.y);
  assert.ok(ys[0] < ys[1], 'it rises off the left slope');
  assert.equal(ys[1], ys[2], 'and runs FLAT between the two runs');
  assert.ok(ys[3] < ys[2], 'and falls again into the right one');
  assert.deepEqual(line.pts.map((p) => p.x), [0, 800, 2300, 3000]);
  // No separate code path: it is the same `ceilingPolyline` the wall mesh
  // traces, minus the scribe gap, and nothing else.
  // T54-F1 AMENDED (28.08.2026): the scribe gap is NOT subtracted here any
  // more — subtracting the 40 vertically and handing the result down as both
  // ceiling and carcass line is the stack the owner's audit measured. The pts
  // are the CEILING itself (minus floorY only) and the infill rides BESIDE
  // them on the record; the engine lowers per segment (`carcassCutPts`,
  // infill / cos β).
  const raw = ceilingPolyline({ ...wall, from: 0, to: 3000 });
  assert.deepEqual(line.pts, raw.map((p) => ({ x: p.x, y: p.y })));
  assert.equal(line.infill, 40, 'the scribe gap rides on the record, unspent');
});

test('TWO SLOPES: the cabinet under it is cut on all three segments', () => {
  const cut = {
    pts: [{ x: 0, y: 1760 }, { x: 800, y: 2560 }, { x: 2300, y: 2560 }, { x: 3000, y: 1560 }],
    infill: 40,
  };
  const r = computeCabinet({ ...PARAMS, width: 3000, slope_cut: cut }, P);
  const back = r.panels.find((p) => p.id === 'BACK');
  // The cabinet is 2150 high, so the flat middle is ABOVE it and only the two
  // falls bite: the board is a hexagon with its top edge flat in the middle.
  const top = back.cnc.outline.filter(([, y]) => y > 1900);
  assert.ok(top.length >= 2, `the middle stays full height: ${JSON.stringify(back.cnc.outline)}`);
  // T54-F1 AMENDED (28.08.2026): the pts are now the CEILING and the carcass
  // is cut on cutReach = ceiling − infill/cos β per segment, so the board's
  // ends sit BELOW the handed 1760/1560. Left rise is 45° (800 across, 800
  // up): 1760 − 40/cos 45° = 1760 − 56.5685 = 1703.4315. Right fall is 700
  // across, 1000 down (cos = 700/√1490000): 1560 − 69.7517 = 1490.2483.
  assert.ok(back.cnc.outline.some(([, y]) => Math.abs(y - 1703.4315) < 1e-6), 'the left end is cut');
  assert.ok(back.cnc.outline.some(([, y]) => Math.abs(y - 1490.2483) < 1e-6), 'and so is the right');
  // Both LOW points are ends here, but the machinery answers the question of
  // the whole line rather than of its ends (a valley between two ridges is the
  // case that is not an end).
  assert.equal(slopeValleyBetween({ w: 3000, pts: cut.pts }, 0, 3000), 1560);
  assert.equal(slopePeakBetween({ w: 3000, pts: cut.pts }, 0, 3000), 2560);
});

// ═══ 4 · A FLAT CEILING — THE GATE ═══════════════════════════════════════════
//
//   *"a unit under a flat ceiling — `slope_cut` absent, engine byte-identical."*

test('THE GATE: a flat ceiling resolves to NULL and the key is never written', () => {
  const flat = slopeCutLine({
    slopes: [], wallWidth: 4000, wallHeight: 2600, x: 100, width: 600, infill: 40,
  });
  assert.equal(flat, null);
  // …and a wall WITH a slope, over a stretch the slope does not reach.
  const away = slopeCutLine({
    slopes: [{ side: 'R', startHeight: 1400, run: 900 }],
    wallWidth: 4000, wallHeight: 2600, x: 100, width: 600, infill: 40,
  });
  assert.equal(away, null);
});

test('THE GATE: the engine refuses a half-stated line rather than guessing', () => {
  const bad = [
    { pts: [] }, { pts: [{ x: 0, y: 2000 }] }, { pts: [{ x: 0, y: NaN }, { x: 600, y: 1200 }] },
    { pts: [{ x: 0, y: -5 }, { x: 600, y: 1200 }] }, { y0: 2400 }, { y1: 1200 }, {}, null, 7,
  ];
  const plain = computeCabinet({ ...PARAMS }, P);
  for (const slope_cut of bad) {
    const r = computeCabinet({ ...PARAMS, slope_cut }, P);
    assert.deepEqual(r.panels, plain.panels, `${JSON.stringify(slope_cut)} must not cut`);
  }
});

test('THE GATE: a cut ABOVE the cabinet leaves every outline the SAME ARRAY', () => {
  // Not merely equal — identical by reference, which is what makes a DXF, a
  // fingerprint and a sheet unable to move.
  const geom = rectGeometry(600, 2150);
  const above = { w: 600, h: 2150, pts: [{ x: 0, y: 2400 }, { x: 300, y: 2300 }, { x: 600, y: 2200 }] };
  assert.equal(slopeCutActive(above), false);
  assert.equal(trimOutlineOnSlope(geom.outline, above), geom.outline);
  assert.equal(trimGeometryOnSlope(geom, above), geom);
});

// ═══ THE MACHINERY ITSELF ════════════════════════════════════════════════════

test('slopeCutPts reads the line, and reads the pair as the two vertices it was', () => {
  assert.deepEqual(slopeCutPts({ w: 600, hL: 2400, hR: 1200 }),
    [{ x: 0, y: 2400 }, { x: 600, y: 1200 }]);
  assert.deepEqual(slopeCutPts({ w: 600, pts: [{ x: 600, y: 1 }, { x: 0, y: 2 }] }),
    [{ x: 0, y: 2 }, { x: 600, y: 1 }], 'and it sorts left to right');
  assert.equal(slopeCutPts(null), null);
  assert.equal(slopeCutPts({ w: 600 }), null);
});

test('cutHeightAt, cutEnds, cutValley and cutPeak all read the one line', () => {
  const cut = { pts: KNEE.pts };
  assert.equal(cutHeightAt(cut, 600), 1700);
  assert.equal(cutHeightAt(cut, -50), 2000, 'before the line it holds its first value');
  assert.equal(cutHeightAt(cut, 5000), 1400, 'and after it, its last');
  assert.deepEqual(cutEnds(cut), { low: 'R', tall: 'L', lowY: 1400, tallY: 2000 });
  assert.equal(cutValley(cut), 1400);
  assert.equal(cutPeak(cut), 2000);
  // …and `cutEnds` still reads a T46 pair, which is what "keeps working" means.
  assert.deepEqual(cutEnds({ x0: 0, x1: 600, y0: 2400, y1: 1200 }),
    { low: 'R', tall: 'L', lowY: 1200, tallY: 2400 });
  assert.deepEqual(cutPoints({ x0: 0, x1: 600, y0: 2400, y1: 1200 }),
    [{ x: 0, y: 2400 }, { x: 600, y: 1200 }]);
});

test('subSlopeCut hands a piece its OWN stretch of the same line', () => {
  const cut = { w: 900, h: 2150, pts: KNEE.pts };
  const leaf = subSlopeCut(cut, 200, 800);
  assert.deepEqual(leaf.pts, [{ x: 0, y: 2000 }, { x: 100, y: 2000 }, { x: 600, y: 1500 }],
    'the knee survives, re-origined');
  const dropped = subSlopeCut(cut, 200, 800, { dy: 100 });
  assert.deepEqual(dropped.pts.map((p) => p.y), [1900, 1900, 1400]);
});

test('slopeReachAt extends the END RUN for a piece standing outside the cabinet', () => {
  const cut = { w: 900, h: 2150, pts: KNEE.pts };
  // Beyond the right edge the ceiling keeps falling at 1 in 1.
  assert.equal(slopeReachAt(cut, 940), 1360);
  // …and before the left edge the flat run stays flat.
  assert.equal(slopeReachAt(cut, -40), 2000);
  // Inside, it is exactly `slopeHeightAt` and nothing else.
  for (const x of [0, 150, 300, 600, 900]) {
    assert.equal(slopeReachAt(cut, x), slopeHeightAt(cut, x));
  }
  // The plain reader HOLDS its ends — which is what every carcass board wants.
  assert.equal(slopeHeightAt(cut, 940), 1400);
});
