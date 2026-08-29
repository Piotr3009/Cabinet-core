// ─── T53 · F4 — BUL/BUR ON THE SLOPE: THE WEDGE WAS NEVER TAKEN OFF ───────
//
// The owner, 27.08.2026, screenshot in hand:
//
//   *"zamiast BUL obciąć pod kątem pasującym do wieńca, to się nachodzą
//   materiały na siebie."*
//   *"wygląda na to, że cięcia istniejące na BUL i BUR są odwrotnie — zobacz
//   SS."*
//   …and the correction that scopes it: *"nie cięcie wieńca — on już jest
//   dobrze cięty. BUL i BUR."*
//
// ─── THE DIAGNOSIS, AND IT IS NOT A MIRRORED SIGN ─────────────────────────
//
// The ENGINE's numbers were right all along, and this file measures them: the
// side's top at each of its two faces is the roof board's own UNDERSIDE there
// (`ceiling − G/cos β`), and the HIGH one is always on the PEAK side. Nothing
// about `sideUnder`, `isLeft` or the blank/short-face pick is reversed.
//
// What was wrong is one condition in `3d/panelSolid.js`. The wedge is taken off
// by `bevelTopEdge`, and it was gated on `panel.cnc.slopeCut` — which a SIDE
// NEVER HAS. A side's CNC outline is deliberately a square blank (a three-axis
// machine cannot cut a bevel, so the angle rides the part's record instead), so
// that gate was null on every BUL and BUR ever built and `bevelTopEdge` had
// never run. The blank stood square at the PEAK across its whole 18 mm — proud
// of the roof line at the low face, overlapping the board that should lie flat
// on it. It reads as "the cut is on the wrong side" because the high edge is on
// BOTH sides.
//
// THE OVERLAP IS GONE BY CUTTING, NOT BY ADDING — the house law, 27.08:
// *"nie pozwalamy na nachodzenie się materiałów na siebie."*  No patch piece.
//
// T54-F1 AMENDED (28.08.2026): the carcass is no longer cut on the ceiling
// polyline itself — `slope_cut.pts` is now THE CEILING, and everything carcass
// (sides included) is cut on cutReach(x) = ceil(x) − infill/cos β per segment.
// So the side's top at each face is now `cutReach − G/cos β`, not
// `ceiling − G/cos β` as the diagnosis above states; the direction law and the
// blank/short-face pick are untouched. The history above is left as written.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const G = P.board?.thickness ?? 18;
const W = 600;
// T54-F1 AMENDED (28.08.2026): named, because the fixture's infill is now
// load-bearing — it is the strip's CUT height and lowers the carcass line.
const INFILL = 20;

/** A wardrobe under a rake, cut on its own width. */
function underARake(pts) {
  return computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: W,
    height: 2150,
    slope_cut: {
      axis: 'width', infill: INFILL, low: pts[0].y >= pts[pts.length - 1].y ? 'R' : 'L', pts,
    },
  }, P);
}

const lineAt = (pts, x) => {
  for (let i = 1; i < pts.length; i += 1) {
    if (x <= pts[i].x + 1e-9) {
      const a = pts[i - 1];
      const b = pts[i];
      const span = b.x - a.x;
      return span > 1e-9 ? a.y + ((b.y - a.y) * (x - a.x)) / span : a.y;
    }
  }
  return pts[pts.length - 1].y;
};

// T54-F1 AMENDED (28.08.2026): the carcass CUT line — the ceiling lowered by
// infill/cos β on its own segment (both fixtures are single-segment, so no
// mitred knee arises here). This is the line sides, roof and back now consume.
const cutLineAt = (pts, x) => {
  for (let i = 1; i < pts.length; i += 1) {
    if (x <= pts[i].x + 1e-9) {
      const a = pts[i - 1];
      const b = pts[i];
      const span = b.x - a.x;
      if (span <= 1e-9) return a.y - INFILL;
      const cosB = span / Math.hypot(span, b.y - a.y);
      return a.y + ((b.y - a.y) * (x - a.x)) / span - INFILL / cosB;
    }
  }
  return pts[pts.length - 1].y - INFILL;
};

const FALLS_RIGHT = [{ x: 0, y: 2000 }, { x: W, y: 1400 }];
const FALLS_LEFT = [{ x: 0, y: 1400 }, { x: W, y: 2000 }];

// ─── THE ENGINE'S NUMBERS ─────────────────────────────────────────────────

for (const [name, pts] of [['falls to the right', FALLS_RIGHT], ['falls to the left', FALLS_LEFT]]) {
  test(`F4 — ${name}: the blank's high point is toward the PEAK, on BOTH sides`, () => {
    const r = underARake(pts);
    const peakLeft = lineAt(pts, 0) > lineAt(pts, W);
    for (const [id, xa, xb] of [['BUL', 0, G], ['BUR', W - G, W]]) {
      const p = r.panels.find((q) => q.id === id);
      assert.ok(p?.meta?.slopeCut?.bevel3d, `${id} states its two faces`);
      const { a, b } = p.meta.slopeCut.bevel3d;
      // `a` is the LOWER-x face, `b` the higher — which is the frame the scene
      // interpolates in, so the two must be stated that way round.
      assert.ok(a >= 0 && b >= 0);
      const highAtLowerX = a >= b;
      assert.equal(highAtLowerX, peakLeft,
        `${id}: the high face is the one nearer the peak`);
      // …and the blank really is the high one.
      assert.equal(Math.round(p.box.h * 100) / 100, Math.round(Math.max(a, b) * 100) / 100,
        `${id}: the board leaves the machine as tall as its highest corner`);
      assert.equal(Math.round(p.meta.slopeCut.low * 100) / 100,
        Math.round(Math.min(a, b) * 100) / 100,
        `${id}: …and the SHORT face is the number the joiner measures`);
    }
  });

  test(`F4 — ${name}: each face sits on the roof board's own underside`, () => {
    const r = underARake(pts);
    const roof = r.panels.find((q) => q.id === 'TOP' && q.meta?.slopeCut?.roof);
    assert.ok(roof, 'there is a roof board');
    const drop = Number(roof.meta.verticalFootprint);
    assert.ok(drop > G, `${drop} mm — G / cos β, thicker in the vertical than the board is`);
    for (const [id, xa, xb] of [['BUL', 0, G], ['BUR', W - G, W]]) {
      const { a, b } = r.panels.find((q) => q.id === id).meta.slopeCut.bevel3d;
      // T54-F1 AMENDED (28.08.2026): the roof rides the carcass CUT line
      // (ceiling − infill/cos β), so the side's face meets ITS underside there
      // — expectation lowered from lineAt to cutLineAt, tolerance unchanged.
      assert.ok(Math.abs(a - (cutLineAt(pts, xa) - drop)) < 0.01,
        `${id} at x=${xa}: ${a} is the carcass cut line less the board's own footprint`);
      assert.ok(Math.abs(b - (cutLineAt(pts, xb) - drop)) < 0.01,
        `${id} at x=${xb}: ${b} likewise`);
    }
  });
}

// ─── AND THE ROOM ACTUALLY CUTS IT ────────────────────────────────────────

test('F4 — the SCENE takes the wedge off: the gate is the record, not the outline', async () => {
  const { panelSolids } = await import('../src/3d/panelSolid.js');
  const { joineryLayers } = await import('../src/engine/joinery.js');
  const layers = joineryLayers(P);
  const r = underARake(FALLS_RIGHT);

  for (const [id, xa, xb] of [['BUL', 0, G], ['BUR', W - G, W]]) {
    const p = r.panels.find((q) => q.id === id);
    // The thing that was null for every side ever built.
    assert.equal(p.cnc.slopeCut, undefined,
      `${id}'s CNC outline is a square blank — by design, and that is what killed the gate`);
    const { solid } = panelSolids(p, layers, P, r.drills);
    assert.ok(solid, `${id} builds a machined solid`);

    const pos = solid.attributes.position;
    // Back into the panel's own millimetres: the geometry is centred on the box.
    const MM = 1000;
    let hiLeft = -Infinity;
    let hiRight = -Infinity;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i) * MM + (p.box.x + p.box.w / 2);
      const y = pos.getY(i) * MM + (p.box.y + p.box.h / 2);
      if (Math.abs(x - xa) < 0.05) hiLeft = Math.max(hiLeft, y);
      if (Math.abs(x - xb) < 0.05) hiRight = Math.max(hiRight, y);
    }
    const { a, b } = p.meta.slopeCut.bevel3d;
    assert.ok(Math.abs(hiLeft - a) < 0.1,
      `${id}: the solid's top at x=${xa} is ${hiLeft.toFixed(2)}, the engine says ${a}`);
    assert.ok(Math.abs(hiRight - b) < 0.1,
      `${id}: the solid's top at x=${xb} is ${hiRight.toFixed(2)}, the engine says ${b}`);
    // THE OVERLAP: before tonight both faces stood at the blank.
    assert.ok(Math.abs(hiLeft - hiRight) > 1,
      `${id}: the two faces are ${Math.abs(hiLeft - hiRight).toFixed(2)} mm apart — the wedge is off`);
  }
});

test('F4 — no wedge stands proud of the roof line: the house overlap law', () => {
  for (const pts of [FALLS_RIGHT, FALLS_LEFT]) {
    const r = underARake(pts);
    const roof = r.panels.find((q) => q.id === 'TOP' && q.meta?.slopeCut?.roof);
    const drop = Number(roof.meta.verticalFootprint);
    for (const [id, xa, xb] of [['BUL', 0, G], ['BUR', W - G, W]]) {
      const { a, b } = r.panels.find((q) => q.id === id).meta.slopeCut.bevel3d;
      for (const [x, y] of [[xa, a], [xb, b]]) {
        // T54-F1 AMENDED (28.08.2026): the roof line is now the carcass CUT
        // line, so the bound is TIGHTENED from lineAt to cutLineAt — a side
        // that only cleared the old ceiling-based line would now fail.
        assert.ok(y <= cutLineAt(pts, x) - drop + 0.01,
          `${id} at x=${x}: ${y} never reaches into the board above it`);
      }
    }
  }
});

test('F4 — a straight cabinet has no bevel and is the board it always was', () => {
  const r = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'W01' }, P);
  for (const id of ['BUL', 'BUR']) {
    const p = r.panels.find((q) => q.id === id);
    assert.equal(p.meta?.slopeCut, undefined, `${id} states no cut`);
  }
});

test('F4 — the roof board is NOT touched: “on już jest dobrze cięty”', () => {
  const r = underARake(FALLS_RIGHT);
  const roof = r.panels.find((q) => q.id === 'TOP' && q.meta?.slopeCut?.roof);
  // Its own numbers, unchanged: L = span/cos β, L_MAX = L + G·tan β.
  // T54-F1 AMENDED (28.08.2026): the same formulas now ride the carcass CUT
  // line; a uniform per-segment lowering keeps β and the span, so every number
  // below stands as it did — asserted unchanged on purpose.
  const deg = roof.meta.slopeCut.deg;
  const rad = (deg * Math.PI) / 180;
  assert.ok(Math.abs(roof.meta.slopeCut.faceLen - W / Math.cos(rad)) < 0.01, 'L');
  assert.ok(Math.abs(roof.meta.slopeCut.blankLen
    - (W / Math.cos(rad) + G * Math.tan(rad))) < 0.01, 'L_MAX');
  assert.ok(Math.abs(roof.meta.verticalFootprint - G / Math.cos(rad)) < 0.01, 'the footprint');
});

// ─── THE LAW IS IN THE LISP, FIRST ────────────────────────────────────────

test('F4 — the direction is stated in SKYLON_COMMON before any of this', () => {
  const lisp = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(lisp, /THE HIGH POINT OF THE BLANK IS ALWAYS TOWARD THE PEAK/);
  assert.match(lisp, /\(defun SKY:sideBevelFaces /);
  assert.match(lisp, /\(defun SKY:sideBevelOverlap /);
  assert.match(lisp, /THE ROOF BOARD IS CORRECT\. DO NOT TOUCH IT\./);
});
