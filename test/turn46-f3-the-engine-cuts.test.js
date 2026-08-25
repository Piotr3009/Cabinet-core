import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  sidePanelGeometry, slopeCutActive, slopeHeightAt, trimGeometryOnSlope, trimOutlineOnSlope,
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
  // ─── T47 AMENDS THIS, TWICE, AND SAYS WHY ──────────────────────────────
  //
  // F2, the owner: *"BUL i BUR przedluzony do czubka skosu i ustawione ciecie
  // pod skosem."* T46 dropped a side to the LOWER of the ceiling at its two
  // faces and threw the wedge above it away. T47 runs it up to the PEAK and
  // takes the wedge off as a BEVEL, whose angle the board states.
  //
  // F3, the same owner: *"boki sa w tym przypadku pod wiencem a nie obok."* The
  // top board LIES ON the sides now, so a side stops at that board's UNDERSIDE
  // — the ceiling less its VERTICAL FOOTPRINT `G / cos β`, which is 18 under a
  // level board and 40.25 under this one's 63.4°.
  //
  // So the LEFT side, under the flat stretch of roof at 2150, stops at 2132 —
  // and it IS cut now, where T46 left it untouched, because there is a board on
  // top of it. And the RIGHT side stops at 1195.75: the ceiling's peak over its
  // own 18 mm (1236) less that 40.25.
  assert.equal(bul.h, 2132);
  assert.equal(bul.cnc.drawn_h, 2132);
  assert.deepEqual(bul.meta.slopeCut, {
    h: 2132,
    full: 2150,
    topAt: 2132,
    angles: [{ from: 0, to: 18, deg: 0 }],
    low: 2132,
    // Chat-fix 25.08.2026: the top edge at each face, for the scene's wedge.
    // Level board over this side, so both faces sit at the same 2132.
    bevel3d: { a: 2132, b: 2132 },
  });
  assert.equal(bur.h, 1195.7508);
  assert.equal(bur.cnc.drawn_h, 1195.7508);
  assert.deepEqual(bur.meta.slopeCut, {
    h: 1195.7508,
    full: 2150,
    topAt: 1195.7508,
    angles: [{ from: 582, to: 600, deg: 63.4349 }],
    low: 1159.7508,
    // …and here the wedge is real: inner face at the peak, outer at the low —
    // their difference is G·tan 63.4349° = 36, which is `h − low` exactly.
    bevel3d: { a: 1195.7508, b: 1159.7508 },
  });
  assert.equal(bur.box.h, 1195.7508, 'and the 3-D box is the same board');
  assert.ok(bur.cnc.outline.every(([, y]) => y <= 1195.7508 + 1e-9), 'nothing above the blank');
});

// ─── T47-F2 REVERSES THIS ONE, AND SAYS WHY ───────────────────────────────
//
// T46 cut a side to the LOWER of the ceiling at its two faces and called it the
// conservative reading: "the other one is 36 mm of carcass through the
// plaster". That is true of a board with a SQUARE top and false of one with a
// bevel — and the owner asked for the bevel by name. So the board that leaves
// the machine is the BLANK, as tall as its HIGHEST corner, and the wedge comes
// off at the angle the piece states. Nothing goes through the plaster, because
// the finished top face is the ceiling.
test('…and a side runs UP to the peak, with the wedge taken off as a bevel', () => {
  // The line falls 1200 over 600 — one 63.4349° run, under the carcass at both
  // ends, so the roof is ONE board and its vertical footprint is 18/cos β =
  // 40.2492. Each side stops at that board's underside: the ceiling's peak over
  // its own 18 mm, less 40.2492.
  const r = computeCabinet({ ...PARAMS, slope_cut: { y0: 2000, y1: 800, infill: 40 } }, P);
  const bul = panelOf(r, 'BUL');
  const bur = panelOf(r, 'BUR');
  const foot = 18 / Math.cos(Math.atan(1200 / 600));
  const at = (x) => 2000 - (1200 * x) / 600;
  for (const [panelId, xa, xb] of [['BUL', 0, G], ['BUR', 600 - G, 600]]) {
    const p = panelOf(r, panelId);
    assert.ok(Math.abs(p.h - (Math.max(at(xa), at(xb)) - foot)) < 1e-3, `${panelId} blank ${p.h}`);
    assert.ok(Math.abs(p.meta.slopeCut.low - (Math.min(at(xa), at(xb)) - foot)) < 1e-3,
      `${panelId} short face ${p.meta.slopeCut.low}`);
    assert.equal(p.meta.slopeCut.angles[0].deg, 63.4349);
    // The wedge the bevel takes off is `G · tan β` whatever the board stops
    // under — the footprint moves both faces down together.
    assert.ok(Math.abs((p.h - p.meta.slopeCut.low) - G * 2) < 1e-3, `${panelId} wedge`);
  }
  assert.equal(bul.h, 1959.7508);
  assert.equal(bur.h, 795.7508);
});

// ─── T47-F3 REPLACES THIS ONE OUTRIGHT (CLAUDE.md licence 2) ──────────────
//
// T46 dropped the top board flat to the low end and left the triangle above it
// open. The owner rejected it BY NAME: *"jak chcesz zeby szafa wygladala z
// wiencem poziomym jak jest skos?"* — and CLAUDE.md's second named licence says
// the old behaviour does not survive behind a flag. The board is a ROOF: it
// lies ON the sides, spans the FULL width, and there is one per segment.
// T47's own file proves the numbers; what is kept here is that the LID is gone.
test('THE TOP IS A ROOF — the flat lid at the low end is gone', () => {
  const r = cutWardrobe();
  const plain = panelOf(plainWardrobe(), 'TOP');
  const tops = r.panels.filter((p) => p.role === 'top');
  assert.equal(tops.length, 2, 'the roof line bends at the pentagon\'s knee, so two boards');
  assert.deepEqual(tops.map((p) => p.id), ['TOP-1', 'TOP-2']);
  // Not one of them is the old lid: it was `internalWidth` wide, between the
  // sides, with tabs and dog bones, sitting level at 1200 − G.
  for (const top of tops) {
    assert.notEqual(top.box.y, 1200 - G);
    assert.equal(top.meta.slopeCut.roof, true);
    assert.equal(top.cnc.outline.length, 4, 'a plain rectangle: no tabs');
    assert.equal(top.cnc.pockets.length, 0, 'and NO DOG BONES');
  }
  // The two together span the FULL width, not the `W − 2G` between the sides.
  assert.equal(tops[0].box.x, 0);
  assert.equal(tops[1].box.x + tops[1].box.w, 600);
  assert.ok(plain.w < 600, 'where the old lid was the internal width');
});

// ─── T47-F3 AMENDS THIS ───────────────────────────────────────────────────
// ─── OVERRULED, 25.08.2026 ──────────────────────────────────────────────────
//
// This test held CLAUDE.md F3's sentence — "the top's sockets sit where the
// roof board lands, on the angled edge" — and the owner, screenshot in hand,
// struck that sentence down: *"bul lub bur nadal ma dog bonesy, a mowilismy ze
// jak jest skos to dog bonesy znikaja."* The roof board carries no tab, so a
// socket there catches nothing and its bones surface on a visible edge for
// nothing. Under a roof the row is OFF — the KIT_SINK flag, not a new
// mechanism — and the assertion flips with the law.
test('…and the cut side drills NO top-board socket row — the joint is not a puzzle', () => {
  const r = cutWardrobe();
  for (const id of ['BUL', 'BUR']) {
    const p = panelOf(r, id);
    const socketYs = p.cnc.pockets
      .filter((k) => k.layer === P.puzzle.layers.socket)
      .map((k) => Math.max(k.y1, k.y2));
    assert.equal(socketYs.some((y) => y > p.h - P.board.thickness), false,
      `${id}: no socket row at the cut edge — saw ${socketYs.join(', ') || 'none'}`);
    assert.equal(socketYs.some((y) => y > p.h + 1e-6), false,
      `${id}: nothing left above the cut`);
  }
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
  // T47-F3: the lid became two roof boards, and BUL is cut now too — there is
  // a board lying on it (`boki … pod wiencem`).
  assert.deepEqual(stamped, ['01-F', 'BACK', 'BUL', 'BUR', 'TOP-1', 'TOP-2'].sort());
  // …and a panel the cut never reached carries nothing, so it stays identical.
  assert.equal(panelOf(r, 'BOTTOM').meta?.slopeCut, undefined);
  // The CUT SIZE moves with it, which is what `partSignature` is keyed on.
  assert.notEqual(panelOf(r, 'BUR').cnc.drawn_h, panelOf(plainWardrobe(), 'BUR').cnc.drawn_h);
});

// ─── T47-F3 AMENDS THIS, AND THE MECHANISM SURVIVES ───────────────────────
//
// T46's MEASURED FAULT: with the top board level at the low end, the TALL
// side's socket row no longer broke its edge — it was a pocket wholly inside
// the board, and a cut-out is traced the OTHER way round or the cutter offsets
// to the wrong side of the line. Check #9 said so in the app before any test
// did, and `cutout` is the field this house already has for it.
//
// T47's roof board lies ON the side, so that row is back ON THE EDGE and no
// longer needs the flag — `topInterior` is how the engine says which it is, and
// `sidePanelGeometry` still cuts an interior row as a cut-out for any caller
// that asks for one. What the edge guard has to say is the part that matters,
// and it still has nothing.
test('a socket row on the board\'s edge is an EDGE socket, and the guard agrees', () => {
  const r = cutWardrobe();
  const bul = panelOf(r, 'BUL');
  const sockets = bul.cnc.pockets.filter((p) => p.layer === P.puzzle.layers.socket);
  assert.equal(sockets.some((p) => p.cutout === true), false,
    'the row breaks the edge again, so it is not traced as a cut-out');
  // The mechanism is still there for a row that really is interior.
  const interior = sidePanelGeometry({
    w: 550, h: 2150, G, side: 'L', puzzle: P.puzzle, topAt: 1200,
  }).pockets.filter((p) => p.layer === P.puzzle.layers.socket && p.cutout === true);
  assert.equal(interior.length, 2, 'an interior row is still a cut-out');
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
