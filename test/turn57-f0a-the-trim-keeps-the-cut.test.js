import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { shakerFrameMm } from '../src/engine/shaker.js';

// ─── TURN 57 · F0a — A TRIM MUST NOT FLATTEN A SLOPE-CUT LEAF ───────────────
//
// The owner's live symptom, 30.08.2026: the shaker "phantom sheet" appears the
// EXACT MOMENT the wall-clearance message fires. Two things that have nothing
// to do with each other, arriving together, which is always one thing.
//
// THE CHAIN THAT PULLS THE TRIGGER. A front edge enters `neighbourReachMm`
// (200) of a wall → the clearance engine wakes → the yellow message AND the
// store's auto-heal apply a micro-trim in the SAME recompute ("gaps should fix
// themselves", T32). 1.5 mm is enough.
//
// THE CAUSE, one line. `src/engine/cabinet.js`, the `front_edge_trim` applier:
//
//     pnl.cnc = { ...pnl.cnc, ...rectGeometry(w, pnl.h) };
//
// `rectGeometry` overwrites the outline with a FULL RECTANGLE — on a slope-cut
// leaf too, whose outline WAS the cut polygon. `cnc.slopeCut` survives the
// overwrite, so `3d/shakerSolid.js` reads "cut" beside a rectangular outline
// and builds a full-height tray with a diagonal pocket inside it. That tray is
// the phantom sheet.
//
// THE LAW. After trimming, a leaf that carries `slopeCut` recomputes its
// outline FROM ITS OWN CEILING LINE at its NEW span — through `frontSlopeAt`,
// the sampler that already cuts every leaf at birth, and NOT through a second
// sampler written for the trim. The refreshed outline, pts, leaf height and
// `meta.slopeCut` land on the piece; the shaker pocket pass runs after and
// follows the new outline with no extra work.
//
// FLAT leaves keep `rectGeometry` byte for byte — which is every trimmed front
// in every project in a room with a level ceiling, and is asserted below.

const CEILING = [{ x: 0, y: 1300 }, { x: 520, y: 2200 }, { x: 1000, y: 2200 }];
/** The ceiling's own gradient over its first run: 900 mm of rise in 520. */
const CEIL_GRADIENT = 900 / 520;

const BASE = {
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  width: 1000,
  height: 2200,
  depth: 600,
  front_type: 'S',
  door_count: 2,
  slope_cut: { pts: CEILING, infill: 40 },
};

const run = (over = {}) => computeCabinet({ ...BASE, ...over }, P);
const frontOf = (r, id) => r.panels.find((p) => p.id === id);

/** Four corners of an axis-aligned box — the shape the bug produced. */
const isRectangle = (outline) => {
  if (!Array.isArray(outline) || outline.length !== 4) return false;
  const xs = new Set(outline.map((p) => p[0]));
  const ys = new Set(outline.map((p) => p[1]));
  return xs.size === 2 && ys.size === 2;
};

/** The one edge of a cut outline that is neither vertical nor horizontal. */
const diagonalOf = (outline) => {
  const edges = outline.map((p, i) => [p, outline[(i + 1) % outline.length]]);
  return edges.filter(([a, b]) => Math.abs(a[0] - b[0]) > 1e-6 && Math.abs(a[1] - b[1]) > 1e-6);
};

/** Perpendicular distance from a point to the line through a → b. */
const perpDistance = ([ax, ay], [bx, by], [px, py]) => {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.abs(dx * (py - ay) - dy * (px - ax)) / Math.hypot(dx, dy);
};

// ─── THE REPRODUCTION ───────────────────────────────────────────────────────
//
// W1000 H2200 D600 shaker wardrobe, two doors, the ceiling above, and 1.5 mm
// taken off `01-FL`'s room-RIGHT edge — which is exactly what the auto-heal
// applies when the leaf comes within 200 mm of a wall.

test('F0a — the trimmed leaf is still a CUT POLYGON, not a rectangle', () => {
  const bare = frontOf(run(), '01-FL');
  assert.equal(bare.cnc.outline.length, 4, 'untrimmed: the cut polygon');
  assert.ok(!isRectangle(bare.cnc.outline), 'untrimmed: not a rectangle to begin with');

  const cut = frontOf(run({ front_edge_trim: { '01-FL': { left: 0, right: 1.5 } } }), '01-FL');
  assert.equal(cut.w, 495.5, 'the trim did take its 1.5 mm off the width');
  assert.ok(
    !isRectangle(cut.cnc.outline),
    `the trimmed leaf collapsed to a rectangle: ${JSON.stringify(cut.cnc.outline)}`,
  );
  // The bug's fingerprint, named so a regression cannot hide behind "4 corners":
  // every top vertex at one height, which is what `rectGeometry` writes.
  const tops = cut.cnc.outline.map((p) => p[1]).filter((y) => y > 1);
  assert.ok(
    new Set(tops).size > 1,
    `every top vertex sits at one height — the phantom sheet: ${JSON.stringify(tops)}`,
  );
});

test('F0a — the refreshed diagonal is PARALLEL to the ceiling over the trimmed span', () => {
  const cut = frontOf(run({ front_edge_trim: { '01-FL': { left: 0, right: 1.5 } } }), '01-FL');
  const diagonals = diagonalOf(cut.cnc.outline);
  assert.equal(diagonals.length, 1, 'exactly one raked edge');
  const [[ax, ay], [bx, by]] = diagonals[0];
  const gradient = Math.abs((by - ay) / (bx - ax));
  // Over the leaf's own span, the two lines may not part by a hundredth of a
  // millimetre — which is the tolerance a joiner would notice and the machine
  // would cut.
  const driftOverSpan = Math.abs(gradient - CEIL_GRADIENT) * Math.abs(bx - ax);
  assert.ok(
    driftOverSpan < 0.01,
    `the diagonal is not the ceiling's own line: drift ${driftOverSpan} mm over the span`,
  );
});

test('F0a — the leaf is re-cut at its NEW span, and says so on the piece', () => {
  const cut = frontOf(run({ front_edge_trim: { '01-FL': { left: 0, right: 1.5 } } }), '01-FL');
  // The leaf spanned unit-x 1.5 → 498.5. Taking 1.5 off the room-RIGHT edge
  // leaves 1.5 → 497.0, and the ceiling at 497 is lower than at 498.5:
  // and the app's own cut line — the ceiling offset by the infill reserve,
  // rounded to 4 dp once by `carcassCutLineOf` and sampled ever after — runs
  // 1220.0444 → 2160 over 0 → 543.0855. At x = 497 that is 2080.2366, less the
  // 3 mm door gap: 2077.2366, where the untrimmed leaf reached 2079.8328.
  assert.equal(cut.meta.slopeCut.roomR, 2077.2366, 'the high corner came DOWN with the edge');
  assert.equal(cut.meta.slopeCut.roomL, 1219.6406, 'the untouched edge did not move');
  assert.equal(cut.h, 2077.2366, 'the leaf height is the new tall corner');
  assert.equal(cut.box.h, 2077.2366, 'and the box in the room agrees with it');
  assert.equal(cut.meta.slopeCut.tall, 2077.2366);
  assert.equal(cut.meta.slopeCut.low, 1219.6406);
  assert.equal(cut.meta.slopeCut.corners, 4);
  assert.equal(cut.meta.slopeCut.gap, 3, 'the same 3 mm that stands between two doors');
  assert.deepEqual(cut.meta.slopeCut.knees, [], 'no knee inside this leaf');
  // The angle is stated in the UNIT's own x, over the span that is LEFT.
  assert.deepEqual(cut.meta.slopeCut.angles, [{ from: 1.5, to: 497, deg: 59.9816 }]);
  // …and the SHEET's own copy of the line — the inside mirror, x from the
  // leaf's bottom RIGHT — is refreshed with it. A stale `pts` beside a fresh
  // outline is the same disagreement the bug was.
  assert.deepEqual(cut.cnc.slopeCut, {
    pts: [{ x: 0, y: 2077.2366 }, { x: 495.5, y: 1219.6406 }],
    hL: 2077.2366,
    hR: 1219.6406,
  });
  assert.deepEqual(cut.cnc.outline, [[0, 0], [495.5, 0], [495.5, 1219.6406], [0, 2077.2366]]);
  assert.equal(cut.cnc.drawn_w, 495.5, 'the sheet caption draws the board that exists');
  assert.equal(cut.cnc.drawn_h, 2077.2366);
  assert.deepEqual(cut.meta.edgeTrim, { left: 0, right: 1.5 }, 'and it still says it was trimmed');
});

test('F0a — the shaker pocket keeps a TRUE 60 mm frame, perpendicular to the diagonal', () => {
  const cut = frontOf(run({ front_edge_trim: { '01-FL': { left: 0, right: 1.5 } } }), '01-FL');
  const pocket = cut.cnc.pockets.find((p) => p.layer === 'SHAKER_PANEL_POCKET');
  assert.ok(pocket, 'the shaker front is still machined');
  const frame = shakerFrameMm(null, P);
  assert.equal(frame, 60, 'the house frame, for the arithmetic below');

  // The pocket's own raked edge, and the leaf's. The frame between them is
  // measured PERPENDICULAR to the cut — a 60 mm vertical drop across a 60°
  // rake is a 30 mm frame, and that is the mistake this asserts against.
  const leafDiagonal = diagonalOf(cut.cnc.outline)[0];
  const pocketPts = pocket.points;
  const pocketDiagonal = diagonalOf(pocketPts)[0];
  assert.ok(pocketDiagonal, 'the pocket is raked too, not squared off');

  for (const p of pocketDiagonal) {
    const d = perpDistance(leafDiagonal[0], leafDiagonal[1], p);
    assert.ok(
      Math.abs(d - frame) < 0.01,
      `the frame under the rake measures ${d} mm, not ${frame}`,
    );
  }
  // …and the pocket lies INSIDE the board it is cut in — the phantom's other
  // half was a pocket hanging in air above the true outline.
  const topOfBoard = Math.max(...cut.cnc.outline.map((p) => p[1]));
  assert.ok(Math.max(...pocketPts.map((p) => p[1])) <= topOfBoard + 1e-6);
});

test('F0a — the hinge cups stay on the TALL edge, and stay where they were bored', () => {
  const bare = frontOf(run(), '01-FL');
  const cut = frontOf(run({ front_edge_trim: { '01-FL': { left: 0, right: 1.5 } } }), '01-FL');

  assert.equal(bare.meta.hinge, 'R', 'the full-height edge is the room-RIGHT one');
  assert.equal(cut.meta.hinge, 'R', 'a 1.5 mm trim does not re-hand a door already bored');
  assert.equal(cut.meta.hingeForced, true, 'and the slope still forces it');

  // Rule 9 stands: "the drilling pattern is untouchable" — the cups travel with
  // the edge, they are not re-spaced because the board got 1.5 mm narrower.
  assert.deepEqual(cut.meta.cupY, bare.meta.cupY, 'the ladder is the ladder');
  assert.deepEqual(cut.meta.slopeCut.hinges, { was: 6, now: 6 });

  // The hinge stile is the SHEET's x = 0 end — the tall one — and every cup,
  // plate screws included, is still on board there.
  const stile = cut.cnc.slopeCut.pts[0];
  assert.equal(stile.x, 0);
  assert.ok(stile.y > cut.cnc.slopeCut.pts[1].y, 'x = 0 is the tall end of the sheet');
  const margin = P.hinges.cups.screwOffsetY;
  for (const y of cut.meta.cupY) {
    assert.ok(y >= 0 && y + margin <= stile.y, `a cup at ${y} runs off the stile`);
  }
});

// ─── THE FLAT TWIN — BYTE FOR BYTE WHAT MAIN CUTS ───────────────────────────
//
// Every trimmed front in every project in a level room comes through this
// path, and not one byte of it may move. The numbers below were read off
// `main` at 6d89238 before the fix and are pasted here as literals on purpose:
// a helper that recomputed them would move with the code it is guarding.

test('F0a — the FLAT twin under the same trim is byte-identical to main', () => {
  const flat = frontOf(
    run({ slope_cut: null, front_edge_trim: { '01-FL': { left: 0, right: 1.5 } } }),
    '01-FL',
  );
  assert.equal(flat.w, 495.5);
  assert.equal(flat.h, 2197);
  assert.deepEqual(flat.cnc.outline, [[0, 0], [495.5, 0], [495.5, 2197], [0, 2197]]);
  assert.equal(flat.cnc.slopeCut, undefined, 'no line, no record of one');
  assert.equal(flat.meta.slopeCut, undefined);
  assert.deepEqual(flat.meta.edgeTrim, { left: 0, right: 1.5 });
  assert.equal(flat.edging.len_m, 5.388, 'the banding length main writes, untouched');
  assert.equal(flat.box.h, 2197, 'a flat leaf keeps the height it was born with');
});

test('F0a — an untrimmed slope-cut leaf is byte-identical to main', () => {
  const bare = frontOf(run(), '01-FL');
  assert.deepEqual(bare.cnc.outline, [[0, 0], [497, 0], [497, 1219.6406], [0, 2079.8328]]);
  assert.equal(bare.h, 2079.8328);
  assert.equal(bare.meta.slopeCut.roomR, 2079.8328);
  assert.equal(bare.meta.edgeTrim, undefined, 'nothing was applied to it');
});

// ─── BOTH EDGES, AND A KNEE ─────────────────────────────────────────────────

test('F0a — a trim on BOTH edges re-cuts from both ends', () => {
  const cut = frontOf(
    run({ front_edge_trim: { '01-FL': { left: 2, right: 1.5 } } }),
    '01-FL',
  );
  assert.equal(cut.w, 493.5, '497 − 2 − 1.5');
  assert.ok(!isRectangle(cut.cnc.outline), 'still a cut polygon');
  // The span is now 3.5 → 497.0 in the unit's own x, and BOTH ends moved.
  //   ceil(3.5) = 1300 + 900·3.5/520 = 1306.0577; − 79.9556 − 3 = 1223.1021
  assert.deepEqual(cut.meta.slopeCut.angles, [{ from: 3.5, to: 497, deg: 59.9816 }]);
  assert.equal(cut.meta.slopeCut.roomL, 1223.1021, 'the LEFT edge moved in and rose');
  assert.equal(cut.meta.slopeCut.roomR, 2077.2366, 'the RIGHT edge moved in and fell');
  assert.equal(cut.h, 2077.2366);
  assert.equal(cut.box.x, 3.5, 'and the leaf stands 2 mm further into the room');
  const [[ax, ay], [bx, by]] = diagonalOf(cut.cnc.outline)[0];
  const drift = Math.abs(Math.abs((by - ay) / (bx - ax)) - CEIL_GRADIENT) * Math.abs(bx - ax);
  assert.ok(drift < 0.01, `parallel to the ceiling: drift ${drift} mm`);
});

test('F0a — a trim on the KNEE leaf keeps the knee', () => {
  // `01-FR` spans 501.5 → 998.5 and the ceiling's knee at x = 520 falls inside
  // it: room-frame knee at 41.5855, a raked stretch and then a level one.
  const bare = frontOf(run(), '01-FR');
  assert.deepEqual(bare.meta.slopeCut.knees, [41.5855], 'the untrimmed leaf has its knee');
  assert.equal(bare.cnc.outline.length, 5, 'five corners: the knee is a vertex');

  const cut = frontOf(run({ front_edge_trim: { '01-FR': { left: 1.5, right: 0 } } }), '01-FR');
  assert.equal(cut.w, 495.5);
  assert.equal(cut.cnc.outline.length, 5, 'the knee survives the trim as a vertex');
  assert.deepEqual(cut.meta.slopeCut.knees, [40.0855], 'and it moved in with the edge, 1.5 mm');
  assert.equal(cut.meta.slopeCut.angles.length, 2, 'two runs: the rake, then the level');
  assert.equal(cut.meta.slopeCut.angles[1].deg, 0, 'the second run is the flat ceiling');
  // The RAKED stretch is still the ceiling's own gradient.
  assert.equal(cut.meta.slopeCut.angles[0].deg, 59.9816);
});

test('F0a — a trim that leaves the cut INACTIVE cuts the leaf plain, and says so', () => {
  // Take the whole raked stretch off `01-FR`'s room-LEFT edge: what is left
  // stands wholly under the LEVEL ceiling, so there is no cut on it at all.
  const cut = frontOf(run({ front_edge_trim: { '01-FR': { left: 60, right: 0 } } }), '01-FR');
  assert.equal(cut.w, 437);
  assert.ok(isRectangle(cut.cnc.outline), 'nothing rakes it any more — it is a rectangle');
  assert.equal(cut.cnc.slopeCut, undefined, 'and it no longer claims a line');
  assert.equal(cut.meta.slopeCut, undefined);
  assert.deepEqual(cut.meta.edgeTrim, { left: 60, right: 0 });
});
