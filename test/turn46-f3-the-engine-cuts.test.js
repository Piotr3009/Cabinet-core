import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  slopeCutActive, slopeHeightAt, trimGeometryOnSlope, trimOutlineOnSlope,
} from '../src/engine/puzzle.js';
import { canonical, dump } from '../scripts/t46-classify.mjs';
import { slopeCutLine } from '../src/lib/slopeLine.js';
import { resultFindings } from '../src/engine/cnc/edgeGuard.js';

// ─── TURN 46 · F3 — THE ENGINE CUTS THE CARCASS (gated, LISP-shaped) ────────
//
// CLAUDE.md F3:
//   *"`paramsForEngine` hands the unit a `slopeCut` — the ceiling line in
//   UNIT-LOCAL x (two points), already minus infill — only when the unit
//   stands in a slope zone."*
//   *"Tests (the thing): a WARDROBE with a fixture `slopeCut` → the panel list
//   holds pentagon sides with the asserted vertices, a lowered top, a cut back;
//   WITHOUT `slopeCut` → byte-identical to today (the gate)."*
//
// THE FIXTURE CUT, used here and in `verify/t46/f3-vertices.txt`:
//   a 600 mm wide wardrobe, ceiling line 2400 mm at its left edge falling to
//   1200 mm at its right, both already less the 40 mm scribe. H is 2150, so
//   the line crosses the carcass top at x = 125 and the shape is a PENTAGON.

const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const CUT = { y0: 2400, y1: 1200, infill: 40 };
const W = PARAMS.width;
const H = PARAMS.height;
const G = PARAMS.board_t ?? P.board.thickness;

const cutWardrobe = () => computeCabinet({ ...PARAMS, slope_cut: CUT }, P);
const plainWardrobe = () => computeCabinet({ ...PARAMS }, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);

// ═══ THE GATE ═══════════════════════════════════════════════════════════════

test('WITHOUT slopeCut the six standard configs are byte-identical', () => {
  // The classifier's own dump, run here so the gate is asserted by the SUITE
  // and not only by a script somebody has to remember to run.
  const d = dump();
  assert.deepEqual(Object.keys(d).sort(), ['BUD', 'BUDR', 'BUDR4', 'PANTRY', 'WARDROBE', 'WUD']);
  assert.deepEqual({
    WARDROBE: d.WARDROBE.sha256,
    BUD: d.BUD.sha256,
    WUD: d.WUD.sha256,
    BUDR: d.BUDR.sha256,
    BUDR4: d.BUDR4.sha256,
    PANTRY: d.PANTRY.sha256,
  }, {
    WARDROBE: 'f49a8c107dd6e66908412262c8c0c91613fe9d1523cce844b7ce68648a1f37c3',
    BUD: '44d091b837b08075fd155719253b85b9cc8c65437395a1d8b2f31b80d3b2db4c',
    WUD: '3b7ea2c4db6bce384bae7e3d1cd30d1a118179f78faa317a44dac65add1abfb7',
    BUDR: '1919de3c261de0c14b0a4ac8d29e8575cb368c33cf0f4afe69c48094322252c2',
    BUDR4: '583bdd7183cef63272186f3a6f8d4910cce8694c4feb93277f0826c29b2c2f17',
    PANTRY: '4df94682e4f80424aa770ffad3e5e143eb8e14902372ec2193fd4acb9e452289',
  });
});

test('nonsense in the channel is NULL, and null is the gate', () => {
  const plain = canonical(plainWardrobe());
  for (const bad of [null, undefined, 0, '', 'yes', {}, { y0: 2000 }, { y0: 2000, y1: 'x' },
    { y0: 0, y1: 0 }, { y0: -100, y1: -200 }, []]) {
    assert.equal(canonical(computeCabinet({ ...PARAMS, slope_cut: bad }, P)), plain,
      `slope_cut: ${JSON.stringify(bad)} must cut nothing`);
  }
});

test('an uncut panel keeps the SAME outline array, not merely an equal one', () => {
  const rect = [[0, 0], [600, 0], [600, 2000], [0, 2000]];
  assert.equal(trimOutlineOnSlope(rect, {
    w: 600, h: 2000, hL: 2100, hR: 2100,
  }), rect, 'identity, so nothing downstream can move');
  const geom = { outline: rect, pockets: [], holes: [] };
  assert.equal(trimGeometryOnSlope(geom, {
    w: 600, h: 2000, hL: 2001, hR: 5000,
  }), geom);
  assert.equal(slopeCutActive({ h: 2000, hL: 2000, hR: 2000 }), false, 'flush is not a cut');
  assert.equal(slopeCutActive({ h: 2000, hL: 2000, hR: 1999 }), true);
});

// ═══ THE SHAPE — 1:1 WITH SKY:slopeCutPts ═══════════════════════════════════

const common = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');

test('the three branches are the LISP\'s three branches, to the last decimal', () => {
  const rect = [[0, 0], [600, 0], [600, 2000], [0, 2000]];
  // NOTHING TO TRIM — the plain rectangle
  assert.deepEqual(trimOutlineOnSlope(rect, { w: 600, h: 2000, hL: 2400, hR: 2100 }), rect);
  // THE TRAPEZIUM — under the ceiling at both edges
  assert.deepEqual(trimOutlineOnSlope(rect, { w: 600, h: 2000, hL: 1900, hR: 1300 }),
    [[0, 0], [600, 0], [600, 1300], [0, 1900]]);
  // THE PENTAGON — the low end on the RIGHT, its top corner trimmed.
  // The LISP's knee: kx = szer·(wys − hL)/(hR − hL) = 600·(2000−2400)/(1200−2400) = 200
  assert.deepEqual(trimOutlineOnSlope(rect, { w: 600, h: 2000, hL: 2400, hR: 1200 }),
    [[0, 0], [600, 0], [600, 1200], [200, 2000], [0, 2000]]);
  // …and mirrored
  assert.deepEqual(trimOutlineOnSlope(rect, { w: 600, h: 2000, hL: 1200, hR: 2400 }),
    [[0, 0], [600, 0], [600, 2000], [400, 2000], [0, 1200]]);
  // The LISP states the same knee, and it is the file this port follows.
  assert.match(common, /\* szer \(\/ \(- wys hL\) d\)/);
});

test('the height across a panel is one straight line and nothing else', () => {
  const at = (x) => slopeHeightAt({ w: 600, hL: 2400, hR: 1200 }, x);
  assert.equal(at(0), 2400);
  assert.equal(at(300), 1800);
  assert.equal(at(600), 1200);
  assert.equal(at(-50), 2400, 'clamped, never extrapolated');
  assert.equal(at(9999), 1200);
});

test('a hole or a pocket left in air goes with the board it was in', () => {
  const geom = {
    outline: [[0, 0], [600, 0], [600, 2000], [0, 2000]],
    pockets: [{ x1: 0, y1: 100, x2: 50, y2: 150 }, { x1: 550, y1: 1800, x2: 600, y2: 1850 }],
    holes: [{ x: 300, y: 100 }, { x: 590, y: 1900 }],
  };
  const trimmed = trimGeometryOnSlope(geom, {
    w: 600, h: 2000, hL: 2400, hR: 1200,
  });
  assert.equal(trimmed.pockets.length, 1, 'the pocket above the line is gone');
  assert.equal(trimmed.holes.length, 1, 'so is the hole');
  assert.equal(trimmed.holes[0].y, 100);
});

// ═══ THE CARCASS ════════════════════════════════════════════════════════════

test('the ceiling line arrives in UNIT-LOCAL x, already minus the infill', () => {
  const line = slopeCutLine({
    slopes: [{ side: 'R', startHeight: 300, run: 900 }],
    wallWidth: 4000,
    wallHeight: 2500,
    x: 3200,
    width: 600,
    infill: 40,
    floorY: 100,
  });
  // T47 (licence 1): the return is `{pts}` now, and this unit stands under ONE
  // straight run — so it is TWO points, and they are T46's own two numbers to
  // the fourth decimal. That is the safety net, asserted where T46 asserted it.
  assert.equal(line.pts.length, 2, 'one straight run is two vertices');
  assert.equal(line.pts[0].x, 0, 'x is the UNIT\'s own, not the wall\'s');
  assert.equal(line.pts[1].x, 600);
  assert.equal(line.pts[0].y, 2115.5556, 'ceiling 2255.56 less 40 scribe less 100 legs');
  assert.equal(line.pts[1].y, 648.8889, 'ceiling 788.89 at the far edge, less the same two');
  assert.equal(line.infill, 40);
  assert.equal(line.low, 'R');
});

test('THE SIDES: the low one is cut, the tall one keeps full height', () => {
  const r = cutWardrobe();
  const bul = panelOf(r, 'BUL');
  const bur = panelOf(r, 'BUR');
  // The line at the LEFT side's two faces is 2400 and 2364 — both over the
  // 2150 carcass, so BUL keeps every millimetre it had. F3: "the tall edge
  // keeps full height."
  assert.equal(bul.h, H);
  assert.equal(bul.cnc.drawn_h, H);
  assert.equal(bul.meta?.slopeCut, undefined, 'an uncut side is stamped with nothing');
  // The RIGHT side stands where the ceiling is 1200: "vertical edge at the LOW
  // end equals the cut height there."
  assert.equal(bur.h, 1200);
  assert.equal(bur.cnc.drawn_h, 1200);
  assert.deepEqual(bur.meta.slopeCut, { h: 1200, full: 2150, topAt: 1200 });
  assert.equal(bur.box.h, 1200, 'and the 3-D box is the same board');
  assert.ok(bur.cnc.outline.every(([, y]) => y <= 1200 + 1e-9), 'nothing left above the line');
});

test('…and a side is cut to the LOWER of the ceiling at its two faces', () => {
  // A steeper line, so the 18 mm of board thickness matters: at x=0 the ceiling
  // is 2000 and at x=G it is 2000 − 1200·18/600 = 1964. The board is cut to
  // 1964 — the conservative reading, because the other one is 36 mm of carcass
  // through the plaster.
  const r = computeCabinet({ ...PARAMS, slope_cut: { y0: 2000, y1: 800, infill: 40 } }, P);
  assert.equal(panelOf(r, 'BUL').h, 1964);
  assert.equal(panelOf(r, 'BUR').h, 800);
});

test('THE TOP drops to the height of the lowest cut side, full depth', () => {
  const r = cutWardrobe();
  const plain = panelOf(plainWardrobe(), 'TOP');
  const top = panelOf(r, 'TOP');
  assert.equal(top.w, plain.w, 'the BOARD does not change…');
  assert.equal(top.h, plain.h, '…same width, same depth');
  assert.deepEqual(top.cnc.outline, plain.cnc.outline, 'nor its tabs');
  assert.equal(top.box.y, 1200 - G, 'only where it SITS: level at the low end');
  assert.deepEqual(top.meta.slopeCut, { level: 1200, full: 2150 });
});

test('…and the tall side takes the top\'s socket row part-way up its face', () => {
  const r = cutWardrobe();
  const bul = panelOf(r, 'BUL');
  const socketYs = bul.cnc.pockets
    .filter((p) => p.layer === P.puzzle.layers.socket)
    .map((p) => Math.max(p.y1, p.y2));
  assert.ok(socketYs.some((y) => Math.abs(y - (1200 + P.puzzle.socketOvershoot)) < 1e-6),
    `the top row sits at the level top (1200), not at 2150 — saw ${socketYs.join(', ')}`);
  assert.equal(socketYs.some((y) => y > 2100), false, 'and there is no row left up at the carcass top');
});

test('THE BACK is cut on the same diagonal — and it is the PENTAGON', () => {
  const r = cutWardrobe();
  const back = panelOf(r, 'BACK');
  // line(x) = 2400 − 2x over a 600 mm back; it crosses H = 2150 at x = 125.
  assert.deepEqual(back.cnc.outline, [[0, 0], [600, 0], [600, 1200], [125, 2150], [0, 2150]]);
  assert.equal(back.cnc.outline.length, 5, 'five corners: a pentagon');
  assert.equal(back.h, H, 'its cut rectangle is still the full height at the tall edge');
  // T47: `knees` joins the record — EMPTY here, because this unit stands
  // under one straight run. A cabinet the ceiling bends over lists the x of
  // every bend, and its back is a hexagon or better.
  assert.deepEqual(back.meta.slopeCut, {
    y0: 2400, y1: 1200, full: 2150, corners: 5, knees: [],
  });
});

test('…a trapezium when the ceiling is under the carcass at BOTH edges', () => {
  const r = computeCabinet({ ...PARAMS, slope_cut: { y0: 2000, y1: 1400, infill: 40 } }, P);
  const back = panelOf(r, 'BACK');
  assert.deepEqual(back.cnc.outline, [[0, 0], [600, 0], [600, 1400], [0, 2000]]);
  assert.equal(back.h, 2000);
  assert.equal(back.meta.slopeCut.corners, 4);
});

test('NO HOLE IN AIR: not one drill sits above its own panel\'s cut top', () => {
  for (const cut of [CUT, { y0: 2000, y1: 800 }, { y0: 900, y1: 2400 }]) {
    const r = computeCabinet({ ...PARAMS, slope_cut: cut, shelves: 4 }, P);
    const topOf = new Map(r.panels.map((p) => [p.id, Number(p.cnc?.drawn_h) || p.h]));
    const orphans = r.drills.filter((d) => topOf.has(d.panel) && d.y > topOf.get(d.panel) + 1e-6);
    assert.deepEqual(orphans, [], `${JSON.stringify(cut)} left ${orphans.length} holes in air`);
  }
});

test('every CUT panel\'s fingerprint carries the cut (T41\'s suite law)', () => {
  const r = cutWardrobe();
  const stamped = r.panels.filter((p) => p.meta?.slopeCut).map((p) => p.id).sort();
  // F4 adds the door to the list: the front is cut on the same line and its
  // fingerprint carries the cut too.
  assert.deepEqual(stamped, ['01-F', 'BACK', 'BUR', 'TOP'].sort());
  // …and a panel the cut never reached carries nothing, so it stays identical.
  assert.equal(panelOf(r, 'BUL').meta?.slopeCut, undefined);
  assert.equal(panelOf(r, 'BOTTOM').meta?.slopeCut, undefined);
  // The CUT SIZE moves with it, which is what `partSignature` is keyed on.
  assert.notEqual(panelOf(r, 'BUR').cnc.drawn_h, panelOf(plainWardrobe(), 'BUR').cnc.drawn_h);
});

test('the lowered socket row is a CUT-OUT, and the edge guard agrees', () => {
  // MEASURED FAULT, found by the browser walk: with the top board level at the
  // low end, the TALL side's socket row no longer breaks its edge — it is a
  // pocket wholly inside the board, and a cut-out is traced the OTHER way round
  // or the cutter offsets to the wrong side of the line. Check #9 said so in
  // the app before any test did. `cutout` is the field this house already has
  // for exactly that (`cnc/dxf.js pocketPoints`, T34's shoe-box groove).
  const r = cutWardrobe();
  const bul = panelOf(r, 'BUL');
  const sockets = bul.cnc.pockets.filter((p) => p.layer === P.puzzle.layers.socket);
  const lowered = sockets.filter((p) => p.cutout === true);
  assert.equal(lowered.length, 2, 'the two top-row sockets are cut-outs');
  for (const p of lowered) {
    assert.ok(Math.max(p.y1, p.y2) < bul.h, 'and they are inside the board, not on its edge');
  }
  assert.deepEqual(resultFindings(r), [], 'the edge guard has nothing to say');
  // …and with no cut not one socket carries the field, so nothing moves.
  for (const p of panelOf(plainWardrobe(), 'BUL').cnc.pockets) {
    assert.equal(p.cutout, undefined);
  }
  assert.deepEqual(resultFindings(plainWardrobe()), []);
});

test('a cabinet standing under a ceiling higher than itself is not cut at all', () => {
  const r = computeCabinet({ ...PARAMS, slope_cut: { y0: 3000, y1: 2600, infill: 40 } }, P);
  assert.equal(canonical(r), canonical(plainWardrobe()),
    'the line is above the carcass everywhere, so nothing moves');
});
