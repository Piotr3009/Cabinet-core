import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { slopeHeightAt } from '../src/engine/puzzle.js';
import { panelSolids, clearPanelSolidCache } from '../src/3d/panelSolid.js';
import { elevationOutline } from '../src/engine/drawings/frontElevation.js';
import { mm } from '../src/3d/constants.js';

// ─── T55 · F1 — TOP INFILL UNDER THE RAKE: FOUR EXPLICIT CORNERS ────────────
//
// The parked fix from 30.08, now due. The owner's simplification, verbatim:
// *"prosty kawałek, zawijanie likwidujemy."*
//
// THE LAW (SKYLON_COMMON.lsp `SKY:infillCorners` — LISP first): under a rake
// the top infill is ONE straight board — FACE only — a parallelogram with
// plumb ends. The engine states its FOUR CORNER COORDINATES explicitly, in
// the room frame (`meta.corners`), and those four corners are the SINGLE
// SOURCE OF TRUTH for the 3-D mesh, the 2-D drawing and the DXF outline.
// Nothing downstream re-derives the shape.
//
// The corner maths is the slope sampling law that already lives in
// cabinet.js — `infReachAt` over the ceiling polyline (`slopeHeightAt` /
// `ceilReachAt`, the TOP PANEL / CORNICE precedent) — never a second sampler.
//
// Residual demanded by CLAUDE.md: < 0.001 mm against the ceiling line minus
// gaps, on the straight rake AND the T47 knee fixture.

const G = P.board.thickness;
const PARAMS = {
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  top_infill_mm: 40,
};
const H = PARAMS.height;
const W = PARAMS.width;
const INFILL = 40;

// The straight rake — the owner's audit scene — and the T47 knee fixture.
const STRAIGHT = { pts: [{ x: 0, y: 2000 }, { x: W, y: 1700 }], infill: INFILL };
const KNEE = { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: W, y: 1700 }], infill: INFILL };

const build = (cut) => computeCabinet({ ...PARAMS, slope_cut: cut }, P);
const facesOf = (r) => r.panels.filter((p) => /^INFILL-T-FACE(-\d+)?$/.test(p.id)
  && p.meta?.corners);

for (const [name, CUT] of [['straight rake', STRAIGHT], ['T47 knee fixture', KNEE]]) {
  const ceil = (x) => slopeHeightAt({ pts: CUT.pts }, x);

  test(`F1 · ${name} — the four corners land on the ceiling line, residual < 0.001 mm`, () => {
    const r = build(CUT);
    const faces = facesOf(r);
    assert.ok(faces.length >= 1, 'a raked strip exists and states its corners');
    let worst = 0;
    for (const face of faces) {
      const c = face.meta.corners;
      assert.equal(c.length, 4, 'four corners, exactly');
      const beta = (face.meta.slopeCut.deg * Math.PI) / 180;
      const resV = INFILL / Math.cos(beta);
      // Top corners on the ceiling; bottom corners one vertical reserve
      // below it — the ceiling line minus the strip's own reserve.
      for (const [i, expect] of [
        [3, ceil(c[3][0])], [2, ceil(c[2][0])],
        [0, ceil(c[0][0]) - resV], [1, ceil(c[1][0]) - resV],
      ]) {
        worst = Math.max(worst, Math.abs(c[i][1] - expect));
      }
      // Ends plumb BY CONSTRUCTION.
      assert.equal(c[0][0], c[3][0], 'left end plumb');
      assert.equal(c[1][0], c[2][0], 'right end plumb');
    }
    assert.ok(worst < 0.001, `worst corner residual ${worst.toFixed(6)} < 0.001 mm`);
  });

  test(`F1 · ${name} — the 3-D mesh IS the corners: every vertex on one of the four plumb/edge lines`, () => {
    clearPanelSolidCache();
    const r = build(CUT);
    for (const face of facesOf(r)) {
      const built = panelSolids(face, P.puzzle.layers, P);
      assert.ok(built?.solid, 'the corners solid exists');
      const pos = built.solid.attributes.position;
      const cx = face.box.x + face.box.w / 2;
      const cy = face.box.y + face.box.h / 2;
      const c = face.meta.corners;
      let worst = 0;
      for (let i = 0; i < pos.count; i += 1) {
        const wx = pos.getX(i) / mm(1) + cx;
        const wy = pos.getY(i) / mm(1) + cy;
        // The nearest stated corner — every mesh vertex IS one of the four.
        const d = Math.min(...c.map(([qx, qy]) => Math.hypot(wx - qx, wy - qy)));
        worst = Math.max(worst, d);
      }
      assert.ok(worst < 0.001,
        `${face.id}: every mesh vertex is a stated corner (worst ${worst.toFixed(6)} mm)`);
      // …and no tilt meta remains to rotate it away.
      assert.equal(face.meta.tilt_axis, undefined, 'the shear/rotation split is dead');
    }
  });

  test(`F1 · ${name} — the 2-D drawing traces the corners verbatim`, () => {
    const r = build(CUT);
    for (const face of facesOf(r)) {
      const segs = elevationOutline(face);
      assert.ok(Array.isArray(segs) && segs.length === 4, 'four segments, one loop');
      const c = face.meta.corners;
      for (let i = 0; i < 4; i += 1) {
        const b = c[(i + 1) % 4];
        assert.deepEqual(segs[i], [c[i][0], c[i][1], b[0], b[1]],
          `${face.id}: segment ${i} is corner→corner, no frame shift`);
      }
    }
  });

  test(`F1 · ${name} — the DXF outline is the same parallelogram, in the cut frame`, () => {
    const r = build(CUT);
    for (const face of facesOf(r)) {
      const out = face.cnc.outline;
      assert.equal(out.length, 4, 'four points on the sheet');
      const c = face.meta.corners;
      const beta = (face.meta.slopeCut.deg * Math.PI) / 180;
      // Long edges: |c1−c0| along the slope = the outline's bottom edge.
      const along = Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1]);
      const bottom = Math.hypot(out[1][0] - out[0][0], out[1][1] - out[0][1]);
      const over = face.meta.lengthOversize?.mm || 0;
      assert.ok(Math.abs(bottom - (along + over)) <= 0.01,
        `${face.id}: sheet bottom edge = the corners' own edge (+ site allowance)`);
      // Plumb ends lean by β inside the blank: |Δx| = cut height · tan β.
      const leanX = Math.abs(out[3][0] - out[0][0]);
      assert.ok(Math.abs(leanX - face.h * Math.tan(beta)) <= 0.01,
        `${face.id}: the plumb ends lean by β on the sheet`);
      assert.equal(face.cnc.drawn_h, face.h, 'cut height is the cut list\'s own');
    }
  });
}

// ─── THE FLAT TWIN — a level ceiling is byte-identical to before ────────────

test('F1 · a FLAT room\'s strip carries no corners and no cut — the board it always was', () => {
  const flat = computeCabinet(PARAMS, P);
  const face = flat.panels.find((p) => p.id === 'INFILL-T-FACE');
  assert.ok(face, 'the flat strip exists');
  assert.equal(face.meta.corners, undefined, 'no corners record');
  assert.equal(face.meta.slopeCut, undefined, 'no cut record');
  assert.deepEqual(face.cnc.outline,
    [[0, 0], [face.w, 0], [face.w, face.h], [0, face.h]], 'a plain rectangle');
});

// ─── AND THE LISP SAID IT FIRST (iron rule) ─────────────────────────────────

test('F1 · LISP is law: SKY:infillCorners stands in SKYLON_COMMON before the JS', () => {
  const common = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(common, /T55 - THE FOUR CORNERS, EXPLICIT/);
  assert.match(common, /\(defun SKY:infillCorners \(pts infill xA xB /);
  assert.match(common, /prosty kawalek, zawijanie/, 'the owner\'s sentence is written beside the law');
  void G;
  void H;
});
