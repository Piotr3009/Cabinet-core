import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { carcassCutPts, slopeHeightAt } from '../src/engine/puzzle.js';
import { runInfillParams } from '../src/engine/runs.js';

// ─── T54 · F1 — THE TRIO: roof, strip, shelf — EACH ON ITS OWN LINE ────────
//
// The owner's audit, 28.08.2026, measured (spadek w prawo, β = 26.5651°,
// infill 40, W = 600, ceiling 2000 → 1700): TOP, INFILL-T-FACE and
// INFILL-T-SHELF all carried tilt_pivot = (600, 1700) — the CEILING at the
// low end — and after rotation ALL THREE laid their top edge ON the ceiling.
//
// THE BEFORE, committed so the next reader knows what this looked like when
// it was wrong (F1.6):
//
//     TOP-top → ceiling      0.00    (should be one 40-band down)
//     TOP ∩ INFILL-T-FACE   18 mm    of overlap, the full length
//     INFILL-T-SHELF        congruent with TOP
//     FACE-bottom → cut    +4.72 mm  short (40 along the slope ≠ 40 vertical)
//
// That is the owner's *"infill powyżej skosu odwrotnie ustawiony"*, and it
// breaks the house overlap law (Petros, 27.08): *"nie pozwalamy na nachodzenie
// się materiałów na siebie, chyba że ja sobie tego zażyczę."*
//
// THE LAW (SKYLON_COMMON.lsp T54 section — LISP first, iron rule 3):
//
//   ceilReach(x) = ceil(x)                      — the ceiling (slope_cut.pts).
//   cutReach(x)  = ceil(x) − infill / cos β(x)  — the carcass CUT line.
//
//   INFILL-T-FACE  pivot (x_lo, ceilReach(x_lo)); cut height = infill.
//   TOP            pivot (x_lo, cutReach(x_lo)).
//   INFILL-T-SHELF pivot (x_lo, cutReach(x_lo) − G/cos β) — UNDER the roof.
//
// Every tolerance below is 0.01 mm unless stated (drawing parity: 0.05).

const G = P.board.thickness;
const PARAMS = {
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  top_infill_mm: 40,
};
const H = PARAMS.height;
const W = PARAMS.width;
const INFILL = 40;
const T = P.autoParts.topInfill.thickness ?? G;

// The owner's audit scene — and its mirror, because F1.6 demands both rakes.
const AUDIT_R = { pts: [{ x: 0, y: 2000 }, { x: W, y: 1700 }], infill: INFILL };
const AUDIT_L = { pts: [{ x: 0, y: 1700 }, { x: W, y: 2000 }], infill: INFILL };

const build = (cut) => computeCabinet({ ...PARAMS, slope_cut: cut }, P);
const byId = (r, id) => r.panels.find((p) => p.id === id);

/** ceil(x) for a straight two-point line. */
const ceilAt = (cut) => (x) => {
  const [a, b] = cut.pts;
  return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
};
const betaOf = (cut) => Math.atan(Math.abs(cut.pts[1].y - cut.pts[0].y) / W);
const cutReachAt = (cut) => {
  const at = ceilAt(cut);
  const res = INFILL / Math.cos(betaOf(cut));
  return (x) => at(x) - res;
};

// Rotate (x, y) about pivot by deg CCW — the scene's own arithmetic
// (3d/UnitView.jsx: T(pivot) · Rz(deg) · T(−pivot)).
const spin = ([x, y], pivot, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - pivot.x;
  const dy = y - pivot.y;
  return [pivot.x + dx * Math.cos(a) - dy * Math.sin(a),
    pivot.y + dx * Math.sin(a) + dy * Math.cos(a)];
};

/** A panel's four elevation corners, rotated as the scene rotates them. */
const spunCorners = (p) => {
  const b = p.box;
  const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
  if (!p.meta?.tilt_deg || !p.meta?.tilt_pivot) return corners;
  return corners.map((c) => spin(c, p.meta.tilt_pivot, p.meta.tilt_deg));
};

/** The y of the line through two rotated corners, at x. */
const edgeAt = (a, b) => (x) => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);

/** Sutherland–Hodgman clip of polygon by convex polygon, then shoelace area. */
function overlapArea(subject, clipPoly) {
  const area = (poly) => Math.abs(poly.reduce((s, [x1, y1], i) => {
    const [x2, y2] = poly[(i + 1) % poly.length];
    return s + x1 * y2 - x2 * y1;
  }, 0)) / 2;
  // Ensure the clip polygon is counter-clockwise for a consistent inside test.
  const ccw = (poly) => (poly.reduce((s, [x1, y1], i) => {
    const [x2, y2] = poly[(i + 1) % poly.length];
    return s + x1 * y2 - x2 * y1;
  }, 0) >= 0 ? poly : [...poly].reverse());
  let out = subject;
  const clip = ccw(clipPoly);
  for (let i = 0; i < clip.length && out.length; i += 1) {
    const A = clip[i];
    const B = clip[(i + 1) % clip.length];
    const inside = ([x, y]) => (B[0] - A[0]) * (y - A[1]) - (B[1] - A[1]) * (x - A[0]) >= -1e-9;
    const cross = (p, q) => {
      const t = ((A[0] - p[0]) * (A[1] - B[1]) - (A[1] - p[1]) * (A[0] - B[0]))
        / ((q[0] - p[0]) * (A[1] - B[1]) - (q[1] - p[1]) * (A[0] - B[0]));
      return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
    };
    const next = [];
    for (let j = 0; j < out.length; j += 1) {
      const p = out[j];
      const q = out[(j + 1) % out.length];
      if (inside(p)) {
        next.push(p);
        if (!inside(q)) next.push(cross(p, q));
      } else if (inside(q)) next.push(cross(p, q));
    }
    out = next;
  }
  return out.length >= 3 ? area(out) : 0;
}

for (const [name, CUT] of [['fall to the RIGHT (the audit scene)', AUDIT_R], ['fall to the LEFT (the mirror)', AUDIT_L]]) {
  const at = ceilAt(CUT);
  const cutAt = cutReachAt(CUT);
  const xLo = CUT.pts[0].y < CUT.pts[1].y ? 0 : W;
  const stations = [0, W / 2, W];

  test(`F1.1 · ${name} — the FACE: top on ceilReach, bottom on cutReach, three stations`, () => {
    const r = build({ slope_cut: CUT }.slope_cut);
    const face = byId(r, 'INFILL-T-FACE');
    assert.ok(face, 'the strip exists');
    assert.equal(face.box.h, INFILL, 'its band is the reserve — the cut height');
    assert.equal(face.h, INFILL + P.autoParts.fillerOversize,
      '+20 scribe oversize on the ceiling edge, as today');
    // The pivot: the CEILING at the low end — this piece alone keeps it.
    assert.ok(Math.abs(face.meta.tilt_pivot.x - xLo) < 1e-6);
    assert.ok(Math.abs(face.meta.tilt_pivot.y - at(xLo)) < 0.01);
    const [c0, c1, c2, c3] = spunCorners(face);
    const topEdge = edgeAt(c3, c2);
    const bottomEdge = edgeAt(c0, c1);
    for (const x of stations) {
      assert.ok(Math.abs(topEdge(x) - at(x)) <= 0.01, `FACEtop on ceilReach at ${x}`);
      assert.ok(Math.abs(bottomEdge(x) - cutAt(x)) <= 0.01, `FACEbottom on cutReach at ${x}`);
    }
  });

  test(`F1.2 · ${name} — the TOP: pivot and top face on cutReach — and FACEbottom − TOPtop = 0, by name`, () => {
    const r = build({ slope_cut: CUT }.slope_cut);
    const top = byId(r, 'TOP');
    assert.ok(top, 'one segment, the plain TOP');
    assert.ok(Math.abs(top.meta.tilt_pivot.x - xLo) < 1e-6);
    assert.ok(Math.abs(top.meta.tilt_pivot.y - cutAt(xLo)) < 0.01,
      'TOP pivots on the CUT line, not the ceiling');
    const [, , t2, t3] = spunCorners(top);
    const topEdge = edgeAt(t3, t2);
    for (const x of stations) {
      assert.ok(Math.abs(topEdge(x) - cutAt(x)) <= 0.01, `TOPtop on cutReach at ${x}`);
    }
    // FACEbottom − TOPtop = 0 — the two lines are ONE line, asserted by name.
    const face = byId(r, 'INFILL-T-FACE');
    const [f0, f1] = spunCorners(face);
    const faceBottom = edgeAt(f0, f1);
    for (const x of stations) {
      assert.ok(Math.abs(faceBottom(x) - topEdge(x)) <= 0.01, `FACEbottom − TOPtop = 0 at ${x}`);
    }
  });

  test(`F1.3 · ${name} — under a RAKE the SHELF does not exist (T55 law, 29.08)`, () => {
    // AMENDED 29.08.2026, the owner's simplification after seven passes at
    // this family: *"dodaj pod skosem deskę jak prosty infill BEZ ZAWIJANIA
    // ... usuń to wszystko z infillami pod skosem."* Under a rake the infill
    // is the FACE STRIP ALONE; board B — the wrap this test used to place
    // under the roof — is a LEVEL-stretch piece only. The old body (pivot at
    // cutReach − G/cos β, top on the roof's underside) stays in history as
    // the T54-F1 resolution it was; the law it measured is now retired
    // together with the piece.
    const r = build({ slope_cut: CUT }.slope_cut);
    assert.equal(byId(r, 'INFILL-T-SHELF'), undefined,
      'no shelf under a rake — not in the room, not on the sheet, not in the bill');
  });

  test(`F1.4 · ${name} — DISJOINT, the Petros law, measured as geometry`, () => {
    const r = build({ slope_cut: CUT }.slope_cut);
    // AMENDED 29.08.2026 (T55 law): the shelf left the rake, so the Petros
    // measurement runs on the DUET that remains.
    const trio = ['TOP', 'INFILL-T-FACE'].map((id) => byId(r, id));
    for (let i = 0; i < trio.length; i += 1) {
      for (let j = i + 1; j < trio.length; j += 1) {
        const area = overlapArea(spunCorners(trio[i]), spunCorners(trio[j]));
        // Shared edges allowed: the pieces' numbers are each rounded to 4 dp
        // at their own source, so a shared 670 mm edge can carry a rounding
        // sliver of up to ~0.07 mm² (0.0001 mm × length) — never a band.
        assert.ok(area <= 0.1,
          `${trio[i].id} ∩ ${trio[j].id} has area ${area.toFixed(4)} — shared edges only`);
      }
    }
  });

  test(`F1.5 · ${name} — the SIDES consume cutReach: blank top = peak(cutReach − footprint), nothing above cutReach`, () => {
    const r = build({ slope_cut: CUT }.slope_cut);
    const beta = betaOf(CUT);
    const foot = G / Math.cos(beta);
    for (const [id, a, b] of [['BUL', 0, G], ['BUR', W - G, W]]) {
      const side = byId(r, id);
      const peak = Math.max(cutAt(a), cutAt(b)) - foot;
      assert.ok(Math.abs(side.h - Math.min(H, peak)) < 0.01,
        `${id} blank top = peak of (cutReach − footprint) over its own two faces`);
      assert.ok(side.meta.slopeCut.angles.every((q) => Math.abs(q.deg
        - (beta * 180) / Math.PI) < 0.01), `${id} angle stated`);
      // Nothing pokes above cutReach anywhere over the side's own G.
      for (const x of [a, (a + b) / 2, b]) {
        assert.ok(side.h <= cutAt(x) + 0.01, `${id} under cutReach at ${x}`);
      }
    }
    // …and the BACK is cut on the same line: its blank is the taller cut end.
    const back = byId(r, 'BACK');
    assert.ok(Math.abs(back.h - Math.min(H, Math.max(cutAt(0), cutAt(W)))) < 0.01,
      'the back stops on cutReach too');
  });

  test(`F1.8 · ${name} — parity: elevation meta and DXF extents land on the rotated corners (0.05)`, () => {
    const r = build({ slope_cut: CUT }.slope_cut);
    // AMENDED 29.08.2026 (T55 law): the shelf does not exist under a rake,
    // so parity is claimed for the two boards that do.
    for (const id of ['TOP', 'INFILL-T-FACE']) {
      const p = byId(r, id);
      const said = p.meta.elevation;
      assert.ok(Array.isArray(said) && said.length >= 4, `${id} publishes its elevation`);
      const spun = spunCorners(p);
      // The elevation is stated in the BOX's own frame. The TOP's ends are
      // cut VERTICALLY (its section is a parallelogram) while the rotated box
      // ends square, so the parity claim is about the two LONG EDGES: the
      // drawing's top and bottom edges lie on the rotated board's own lines,
      // at all three stations, to 0.05 (the DXF audit's own tolerance).
      //
      // AMENDED, chat-fix 29.08.2026: the strip's and the shelf's elevation is
      // now the FITTED PARALLELOGRAM in the box's LEVEL frame (ends plumb
      // after the lean — the owner's "wąsik" audit), so those two are LEANT
      // here exactly as the scene leans them before the long-edge comparison.
      // The TOP's elevation was already stated leant (25.08) and passes as it
      // stands. The DXF half below is UNTOUCHED — the blank stays the blank.
      const stated = said
        .map(([ex, ey]) => [p.box.x + ex, p.box.y + ey])
        .map((q) => (id === 'TOP' ? q
          : spin(q, p.meta.tilt_pivot, p.meta.tilt_deg)));
      const statedBottom = edgeAt(stated[0], stated[1]);
      const statedTop = edgeAt(stated[3], stated[2]);
      const spunBottom = edgeAt(spun[0], spun[1]);
      const spunTop = edgeAt(spun[3], spun[2]);
      for (const x of stations) {
        assert.ok(Math.abs(statedTop(x) - spunTop(x)) <= 0.05,
          `${id}: the drawing's top edge is the leant board's at ${x}`);
        assert.ok(Math.abs(statedBottom(x) - spunBottom(x)) <= 0.05,
          `${id}: …and its underside at ${x}`);
      }
      // DXF extents: the cut piece is the blank the sheet gives up — in the
      // SHEET's own frame (the TOP is drawn TURNED, so the drawn dims are the
      // authority, exactly as `cnc/dxf.js` writes them).
      assert.ok(p.cnc.outline.length >= 4, `${id} has a sheet outline`);
      const xs = p.cnc.outline.map((q) => q[0]);
      const ys = p.cnc.outline.map((q) => q[1]);
      const dw = p.cnc.drawn_w ?? p.w;
      const dh = p.cnc.drawn_h ?? p.h;
      assert.ok(Math.abs((Math.max(...xs) - Math.min(...xs)) - dw) <= 0.05
        && Math.abs((Math.max(...ys) - Math.min(...ys)) - dh) <= 0.05,
      `${id}: DXF extents are the blank`);
      assert.ok(Math.abs(Math.max(dw, dh) - p.w) <= 0.05 && Math.abs(Math.min(dw, dh) - p.h) <= 0.05,
        `${id}: and the blank is the cut list's own pair`);
    }
  });
}

// ─── F1.7 · THE RUN PATH IS THE SAME TRIO ───────────────────────────────────
//
// A two-knee polyline over three cabinets: the run's own ceiling (T53-F3b)
// descends, runs flat, and descends again. Every SEGMENT of the strip must
// pass the three-station assertions on ITS OWN two lines.

test('F1.7 · the run: every segment of a two-knee polyline passes the three stations', () => {
  const RUN_CEIL = [
    { x: 0, y: 1800 }, { x: 650, y: 2400 }, { x: 1300, y: 2400 }, { x: 1950, y: 1800 },
  ];
  const spans = [0, 650, 1300].map((from, i) => ({ id: `u${i}`, width: 650, from }));
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 650,
    run_top_infill: {
      role: 'owner',
      offset: 0,
      length: 1950,
      faceH: 40,
      shelfDepth: P.autoParts.topInfill.shelfDepth,
      thickness: P.autoParts.topInfill.thickness,
      ends: { left: 'wall', right: 'wall' },
      returns: {},
      mitre: { left: 0, right: 0 },
      ceiling: RUN_CEIL,
      ceilingInfill: INFILL,
      unitIds: spans.map((s) => s.id),
      spans,
    },
  }, P);
  const faces = r.panels.filter((p) => /^INFILL-T-FACE-\d$/.test(p.id));
  assert.equal(faces.length, 3, 'one strip piece per ceiling segment — the knees split, nothing else');
  const ceil = (x) => slopeHeightAt({ pts: RUN_CEIL }, x);
  let worst = 0;
  for (const face of faces) {
    const m = face.meta.slopeCut;
    if (!m) {
      // The flat middle hangs from the CEILING, exactly as a raked piece does —
      // the one law that lets the two meet at a knee.
      assert.ok(Math.abs((face.box.y + face.box.h) - ceil(face.box.x)) < 0.01,
        'a level segment tops out on the ceiling above it, not on the carcass');
      continue;
    }
    const beta = (m.deg * Math.PI) / 180;
    const res = INFILL / Math.cos(beta);
    const [c0, c1, c2, c3] = spunCorners(face);
    const topEdge = edgeAt(c3, c2);
    const bottomEdge = edgeAt(c0, c1);
    const from = face.meta.tilt_deg < 0 ? face.meta.tilt_pivot.x - m.span : face.meta.tilt_pivot.x;
    for (const x of [from, from + m.span / 2, from + m.span]) {
      worst = Math.max(worst, Math.abs(topEdge(x) - ceil(x)), Math.abs(bottomEdge(x) - (ceil(x) - res)));
      assert.ok(Math.abs(topEdge(x) - ceil(x)) <= 0.01, `segment top on the run ceiling at ${x}`);
      assert.ok(Math.abs(bottomEdge(x) - (ceil(x) - res)) <= 0.01, `segment bottom one reserve down at ${x}`);
    }
    assert.equal(face.box.h, INFILL, 'each raked piece is the reserve band');
  }
  // The knee joins — half the angle between neighbours — are unchanged law.
  const joined = faces.filter((p) => p.meta.mitre?.left != null || p.meta.mitre?.right != null);
  assert.ok(joined.length >= 2, 'the knee joins survive');
  assert.equal(r.panels.filter((p) => /^INFILL-T-SHELF/.test(p.id)).length, 0,
    'no shelf board anywhere — the piece is one plain board per segment');
  assert.ok(worst <= 0.01, `worst residual ${worst.toFixed(4)} ≤ 0.01`);
});

test('F1.7 · the store hands the run its reserve beside its ceiling', () => {
  // `runInfillParams` with a runCutOf that answers pts + infill — the shape
  // `slopeCutLine` returns — must put BOTH on the owner's element.
  const units = [{
    id: 'u1',
    type: 'WARDROBE',
    params: { ...defaultParamsFor('WARDROBE', P), width: 650, top_infill_mm: 40 },
    position: { wall: 0, x_mm: 0, rotation_deg: 0 },
  }];
  const out = runInfillParams(units, {
    walls: [{ width: 4000 }],
    roomHeight: 2500,
    frontFaceDepthOf: () => 0,
    runCutOf: () => ({ axis: 'width', pts: [{ x: 0, y: 2400 }, { x: 650, y: 2000 }], infill: 40, low: 'R' }),
  }, P);
  const owner = out.get('u1');
  assert.ok(owner && owner.role === 'owner');
  assert.ok(Array.isArray(owner.ceiling), 'the ceiling travels');
  assert.equal(owner.ceilingInfill, 40, 'and the reserve travels BESIDE it (T54-F1)');
});

// ─── THE LIB HANDS THE CEILING NOW ──────────────────────────────────────────

test('F1 · slopeCutLine hands the CEILING minus floorY — the infill rides beside the pts', async () => {
  const { slopeCutLine } = await import('../src/lib/slopeLine.js');
  const cut = slopeCutLine({
    slopes: [{ side: 'R', startHeight: 1400, run: 2000 }],
    wallWidth: 4000,
    wallHeight: 2500,
    x: 3400,
    width: 600,
    infill: 40,
    floorY: 100,
  });
  assert.ok(cut);
  // ceilingAt(3400) = 1400 + 1100·(600/2000) = 1730; at 4000 = 1400.
  assert.equal(cut.pts[0].y, 1730 - 100, 'the ceiling less the carcass floor — NOT less the infill');
  assert.equal(cut.pts[1].y, 1400 - 100);
  assert.equal(cut.infill, 40, 'the reserve rides on the record');
});

// ─── AND THE LISP SAID IT FIRST (iron rule 3) ───────────────────────────────

test('F1 · LISP is law: the trio law stands in SKYLON_COMMON before the JS', () => {
  const common = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(common, /THE TRIO: TWO REACH FUNCTIONS, NOT ONE/);
  assert.match(common, /\(defun SKY:ceilReachAt \(pts x\)/);
  assert.match(common, /\(defun SKY:cutReachDrop \(infill deg\)/);
  assert.match(common, /\(defun SKY:carcassCutPts \(pts infill /);
  assert.match(common, /\(defun SKY:trioFacePivot \(pts x_lo\)/);
  assert.match(common, /\(defun SKY:trioRoofPivot \(pts infill x_lo\)/);
  assert.match(common, /\(defun SKY:trioShelfPivot \(pts infill G x_lo\)/);
  assert.match(common, /40 w pionie/, 'the owner\'s veto line is written beside the ruling');
  assert.match(common, /shelf pod wiencem/, '…and the shelf ruling\'s');
  // The T47 words the law corrects are AMENDED, not erased.
  assert.match(common, /T54 CORRECTION \(28\.08\.2026\)/);
  assert.match(common, /already less the scribe gap/, 'the history stays');
  // …and the JS mirrors the arithmetic.
  const off = carcassCutPts({ pts: [{ x: 0, y: 2000 }, { x: 600, y: 1700 }] }, 40);
  assert.ok(Math.abs(off[0].y - (2000 - 40 / Math.cos(Math.atan(0.5)))) < 1e-9);
  assert.ok(Math.abs(off[1].y - (1700 - 40 / Math.cos(Math.atan(0.5)))) < 1e-9);
  // A knee between two betas meets at the INTERSECTION of the lowered lines.
  const knee = carcassCutPts({ pts: [{ x: 0, y: 2100 }, { x: 300, y: 2100 }, { x: 900, y: 1500 }] }, 40);
  assert.equal(knee.length, 3);
  assert.ok(Math.abs(knee[0].y - 2060) < 1e-9, 'flat segment drops exactly the infill');
  assert.ok(knee[1].x < 300, 'the mitred vertex moves INTO the flat side');
  assert.ok(Math.abs(knee[1].y - 2060) < 1e-9, 'and sits on the flat lowered line');
});
