import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// ─── T54 · F2 — THE PEAK: BUR CUT ON THE SLOPE LIKE BUL, THE PATCH DIES ────
//
// The owner, screenshot in hand: *"lewy czyli dolny skos działa super, górny
// znowu jakieś małe kawałki — po prostu przedłuż wieniec i wywal jakiś mały
// kawałek z BUR. tylko na BUR, nie na BUL."* Corrected on the mockup:
// *"wieniec zielony ok i do wieńca dochodzi BUR i tyle, i ucięty pod skosem
// dokładnie tak samo jak BUL."*
//
// THE GRAVES, NAMED (licence 1):
//   1. the CAPPED ROOF STUB — where the cut line crossed the cabinet's height
//      inside the peak side's own G, `roofLinePts`' cap emitted a flat TOP-n
//      NARROWER THAN ITS OWN THICKNESS between the crossing and the outer
//      face. Killed by the peak merge (cabinet.js `roofPeakMerge`,
//      SKY:roofPeakPts — LISP first): the rake runs through to the outer
//      face and the side is bevelled clean at β.
//   2. the RUN-SIDE STRIP SEGMENT born at the roof's cap-crossing — the
//      strip's `infBreaks` read the CAPPED roof line where the strip hangs
//      from the CEILING, so a phantom knee split a small strip piece off at
//      the peak. Killed with F1's `infBreaks` fix (the strip breaks at the
//      ceiling's own knees and nowhere else).
//
// The census below is PERMANENT (F2.5): the band [cutReach − 120, ceilReach]
// over the peak-side G of width may hold exactly the peak side, TOP, the
// strip, its shelf, and a side filler. Anything else is the owner's kawałek.

const G = P.board.thickness;
const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01', top_infill_mm: 40 };
const H = PARAMS.height;
const W = PARAMS.width;
const INFILL = 40;

// The scenes vary only the line; the infill is the owner's 40 throughout.
const build = (pts, over = {}) => computeCabinet({
  ...PARAMS, ...over, slope_cut: { infill: INFILL, pts },
}, P);

const spin = ([x, y], pivot, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - pivot.x;
  const dy = y - pivot.y;
  return [pivot.x + dx * Math.cos(a) - dy * Math.sin(a),
    pivot.y + dx * Math.sin(a) + dy * Math.cos(a)];
};
const spunCorners = (p) => {
  const b = p.box;
  const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
  if (!p.meta?.tilt_deg || !p.meta?.tilt_pivot) return corners;
  return corners.map((c) => spin(c, p.meta.tilt_pivot, p.meta.tilt_deg));
};

/** Does a polygon enter the axis-aligned band with real area? */
const entersBand = (poly, x1, x2, y1, y2) => {
  const xs = poly.map((q) => q[0]);
  const ys = poly.map((q) => q[1]);
  return Math.min(...xs) < x2 - 1e-6 && Math.max(...xs) > x1 + 1e-6
    && Math.min(...ys) < y2 - 1e-6 && Math.max(...ys) > y1 + 1e-6;
};

// The allowed census, EXACTLY (F2.1) — plus the three pieces the band's own
// datum necessarily grazes, each with its reason on the line: the BACK is cut
// ON cutReach (the band's floor is drawn 120 below its own top edge), and the
// FRONT/DRAWER-FRONT leaves stop a gap below the same line (F3 asserts their
// own band). None of the three can be the owner's kawałek — each spans its
// whole opening and is cut by the very line the band is measured from.
const ALLOWED = [
  /^BU[LR]$/,
  /^TOP(-\d+)?$/,
  /^INFILL-T-FACE(-\d+)?$/,
  /^INFILL-T-SHELF(-\d+)?$/,
  /^INFILL-[LR]-(FACE|ARM)$/,
  /^BACK$/,
  /^\d+-F[LR]?$/,
  /^\d+-B\d$/,
  /^\d+-DF\d+$/,
];

/** The census: every panel in the band over the peak-side G, minus ALLOWED. */
function census(r, peakSide, ceilAt, reserve) {
  const [x1, x2] = peakSide === 'R' ? [W - G, W] : [0, G];
  const midCut = ceilAt((x1 + x2) / 2) - reserve;
  const y1 = midCut - 120;
  const y2 = ceilAt(peakSide === 'R' ? W : 0) + 1;
  return (r.panels || [])
    .filter((p) => p.box && entersBand(spunCorners(p), x1, x2, y1, y2))
    .filter((p) => !ALLOWED.some((rx) => rx.test(p.id)))
    .map((p) => p.id);
}

// Both rakes, peak at left and at right — each with the CARCASS line
// (ceiling − infill/cosβ) crossing the cabinet's height INSIDE the peak
// side's own G (the owner's screenshot case: the stub the merge kills).
// rise 710 over 600 ⇒ β = 49.8°, reserve 61.98; y0 = H − 636 puts the
// crossing at x ≈ 589.8 — ten millimetres from the outer face.
const RISE = 710;
const SCENES = [
  ['peak at the RIGHT, rising rake', [{ x: 0, y: H - 636 }, { x: W, y: H - 636 + RISE }], 'R'],
  ['peak at the LEFT, falling rake', [{ x: 0, y: H - 636 + RISE }, { x: W, y: H - 636 }], 'L'],
];

for (const [name, pts, peak] of SCENES) {
  const ceilAt = (x) => pts[0].y + ((pts[1].y - pts[0].y) * x) / W;
  const beta = Math.atan(Math.abs(pts[1].y - pts[0].y) / W);
  const reserve = INFILL / Math.cos(beta);

  test(`F2.1 · ${name} — the census of the peak band is exactly the allowed list`, () => {
    const r = build(pts);
    const found = census(r, peak, ceilAt, reserve);
    assert.deepEqual(found, [], `nothing but the allowed census at the peak — found [${found}]`);
  });

  test(`F2.1 · ${name} — the sub-G roof stub is DEAD: no board narrower than its own thickness`, () => {
    const r = build(pts);
    const tops = r.panels.filter((p) => p.part === 'TOP');
    for (const t of tops) {
      const span = t.meta?.slopeCut?.span ?? t.box.w;
      assert.ok(span > G + 1e-6, `${t.id} spans ${span} — a board is wider than its own thickness`);
    }
    // …and the raked board REACHES the peak-side outer face (przedłuż wieniec).
    const raked = tops.find((t) => (t.meta?.slopeCut?.deg ?? 0) > 1);
    assert.ok(raked, 'the rake is a board');
    assert.equal(peak === 'R' ? raked.meta.slopeCut.to : raked.meta.slopeCut.from,
      peak === 'R' ? W : 0, 'roof end x = side outer x');
  });

  test(`F2.3 · ${name} — the peak side is bevelled at β, meeting the roof's underside (≤ 0.01)`, () => {
    const r = build(pts);
    const side = r.panels.find((p) => p.id === (peak === 'R' ? 'BUR' : 'BUL'));
    const roof = r.panels.filter((p) => p.part === 'TOP')
      .find((t) => (t.meta?.slopeCut?.deg ?? 0) > 1);
    const drop = roof.meta.verticalFootprint;
    const bevel = side.meta.slopeCut.bevel3d;
    assert.ok(bevel, 'the peak side carries a bevel — ucięty pod skosem, jak BUL');
    assert.ok(Math.abs(bevel.a - bevel.b) > 1, 'and it is a real bevel, not a square top');
    const [xa, xb] = peak === 'R' ? [W - G, W] : [0, G];
    for (const [face, x] of [[bevel.a, xa], [bevel.b, xb]]) {
      const want = Math.min(H, ceilAt(x) - reserve - drop);
      assert.ok(Math.abs(face - want) <= 0.01,
        `side top face at x=${x} on the roof's underside (got ${face}, want ${want.toFixed(4)})`);
    }
    // The angle is the segment's own β, stated on the piece.
    assert.ok(side.meta.slopeCut.angles.some((q) => Math.abs(q.deg - (beta * 180) / Math.PI) < 0.05),
      'angle stated');
  });

  test(`F2.4 · ${name} — CNC cuts the LONGER version, read off the sheet`, () => {
    const r = build(pts);
    for (const id of ['BUL', 'BUR']) {
      const side = r.panels.find((p) => p.id === id);
      if (!side.meta?.slopeCut?.bevel3d) continue;
      const { a, b } = side.meta.slopeCut.bevel3d;
      assert.ok(Math.abs(side.h - Math.max(a, b)) <= 0.01,
        `${id}: the blank is the TALL corner — na CNC zawsze tnij dłuższą wersję`);
      assert.ok(Math.abs(side.cnc.drawn_h - side.h) <= 0.01, `${id}: and the sheet draws it`);
    }
  });
}

// ─── ROOF ENDS AT THE OUTER FACES on an ordinary uncapped rake, both rakes ──

test('F2.2 · a raked stretch that ends at a side runs to that side\'s OUTER face — both rakes, both ends', () => {
  for (const pts of [
    [{ x: 0, y: 2000 }, { x: W, y: 1400 }],
    [{ x: 0, y: 1400 }, { x: W, y: 2000 }],
  ]) {
    const r = computeCabinet({ ...PARAMS, slope_cut: { infill: INFILL, pts } }, P);
    const top = r.panels.find((p) => p.id === 'TOP');
    assert.equal(top.meta.slopeCut.from, 0, 'from the LEFT outer face (x = 0, not G)');
    assert.equal(top.meta.slopeCut.to, W, 'to the RIGHT outer face (x = W, not W − G)');
  }
});

// ─── FLAT STRETCHES UNCHANGED: a capped flat WIDER than G is furniture ──────

test('F2.2 · a capped flat stretch wider than G stays: two boards, no merge', () => {
  // The carcass line crosses H well inside the cabinet: the flat piece from
  // the crossing to the wall is a real board and stays one.
  const r = computeCabinet({
    ...PARAMS,
    slope_cut: { infill: INFILL, pts: [{ x: 0, y: H - 500 }, { x: W, y: H + 500 }] },
  }, P);
  const tops = r.panels.filter((p) => p.part === 'TOP');
  assert.equal(tops.length, 2, 'the rake and the flat, one board each');
  const flat = tops.find((t) => (t.meta.slopeCut.deg ?? 0) < 1e-6);
  assert.ok(flat, 'the flat capped stretch survives');
  assert.ok(flat.meta.slopeCut.span > G, 'and it is wider than the side\'s G');
});

// ─── AND THE LISP SAID IT FIRST ─────────────────────────────────────────────

test('F2 · LISP is law: the peak rule stands in SKYLON_COMMON', () => {
  const common = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(common, /THE PEAK: NO THIRD PIECE/);
  assert.match(common, /\(defun SKY:roofPeakPts \(szer wys pts G /);
  assert.match(common, /przedluz wieniec/);
  assert.match(common, /dokladnie tak samo jak BUL/);
});
