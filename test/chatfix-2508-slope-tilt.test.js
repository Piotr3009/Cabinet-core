import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// ─── CHAT-FIX 25.08.2026 — THE BOARDS THAT LEAN ─────────────────────────────
//
// The owner, screenshot in hand: *"dziwne boxy mi sie robia zamiast normalnie
// pochyly top."*
//
// The roof board shipped as its own ENVELOPE — the AABB over the tilted board
// — with nothing in the meta to lean it, so the scene drew a crate. The top
// infill had half the mechanism (`tilt_deg`, no pivot) and the only lean in
// the scene turned about X, the shoe shelf's axis, where the slope needs Z.
//
// Now: the box is the LEVEL BOARD ITSELF, and the meta says the lean — signed
// deg (CCW about Z), the axis by name, the pivot on the line the piece hangs
// from. This test does the rotation BY HAND and demands the ends land on the
// line, which is the whole of the claim.
//
// ─── T54-F1 AMENDMENT (28.08.2026) — THIS FILE HELD THE FAULT GREEN ─────────
//
// The chat-fix wrote "the pivot is the line the piece hangs from" and then
// hung ALL THREE pieces — TOP, INFILL-T-FACE, INFILL-T-SHELF — from the SAME
// line, and this file asserted exactly that. The owner's audit measured the
// consequence (spadek w prawo, β = 26.5651°, infill 40, W = 600, ceiling
// 2000 → 1700), and the BEFORE table is committed here so the next reader
// knows what this looked like when it was wrong:
//
//     TOP-top → ceiling      0.00    (should be one 40-band down)
//     TOP ∩ INFILL-T-FACE   18 mm    overlap, the full length
//     INFILL-T-SHELF        congruent with TOP
//     FACE-bottom → cut    +4.72 mm  short (40 along the slope ≠ 40 vertical)
//
// The law now (SKYLON_COMMON.lsp T54 section, LISP first): `slope_cut.pts` is
// the CEILING; `cutReach(x) = ceil(x) − infill / cos β` is the CARCASS line.
// The TOP hangs from `cutReach` (roof line = cutReach capped at H), the FACE
// alone keeps the ceiling pivot with the reserve as its own cut height, and
// the SHELF sits UNDER the roof at `cutReach − G / cos β`. Every assertion
// below is amended to that law by name; amended ≠ deleted.

const G = P.board.thickness;
const PARAMS = {
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  side_infill_left_mm: 40,
  side_infill_right_mm: 40,
  top_infill_mm: 40,
};
const H = PARAMS.height;
const W = PARAMS.width;

// One straight fall, left-high: β = 45° exactly. The reserve the carcass now
// gives up below the ceiling: infill / cos β = 40·√2.
const INFILL = 40;
const RESERVE_45 = INFILL / Math.cos(Math.PI / 4);
const FALL = {
  slope_cut: { pts: [{ x: 0, y: H - 150 }, { x: W, y: H - 150 - W }], infill: INFILL },
};

const build = (over = {}) => computeCabinet({ ...PARAMS, ...over }, P);
const byId = (r, id) => r.panels.find((p) => p.id === id);

// Rotate (x, y) about pivot by deg CCW — the same arithmetic the scene's
// group does, in the same convention.
const spin = ([x, y], pivot, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - pivot.x;
  const dy = y - pivot.y;
  return [pivot.x + dx * Math.cos(a) - dy * Math.sin(a),
    pivot.y + dx * Math.sin(a) + dy * Math.cos(a)];
};

test('the roof board is a LEVEL BOARD plus a lean — not an envelope', () => {
  const r = build(FALL);
  const top = byId(r, 'TOP');
  assert.ok(top, 'one segment, so the plain TOP');
  assert.equal(top.box.h, G, 'the box is G thick — the envelope crate is gone');
  assert.equal(top.meta.tilt_axis, 'z');
  assert.ok(top.meta.tilt_pivot, 'and it has a pivot');
  const m = top.meta.slopeCut;
  assert.ok(Math.abs(top.box.w - m.faceLen) < 0.01, 'the box is the face length');
  // Fall to the RIGHT: the lean is clockwise, so the signed deg is negative.
  assert.ok(top.meta.tilt_deg < 0, 'a fall to the right leans clockwise');
  assert.ok(Math.abs(Math.abs(top.meta.tilt_deg) - m.deg) < 1e-6,
    'its magnitude is the segment\'s own β');
  // T54-F1 AMENDED (28.08.2026): the pivot is the CUT line at the low end —
  // the ceiling less the reserve — never the ceiling itself.
  const ceilLow = H - 150 - W;
  assert.ok(Math.abs(top.meta.tilt_pivot.y - (ceilLow - RESERVE_45)) < 0.01,
    'TOP pivots on cutReach = ceiling − infill / cos β');
});

test('rotated BY HAND, the board\'s top edge lands on the CUT line at BOTH ends', () => {
  const r = build(FALL);
  const top = byId(r, 'TOP');
  const pv = top.meta.tilt_pivot;
  const deg = top.meta.tilt_deg;
  const b = top.box;
  // The board's top edge, level, before the scene leans it.
  const nearTop = [pv.x, b.y + b.h];
  const farTop = [deg < 0 ? b.x : b.x + b.w, b.y + b.h];
  const [, nearY] = spin(nearTop, pv, deg);
  const [farX, farY] = spin(farTop, pv, deg);
  // T54-F1 AMENDED (28.08.2026): the line the roof lands on is the CARCASS
  // cut line — the ceiling lowered by the reserve — stated here from the
  // FIXTURE's own numbers, not from the engine's record, so the assertion
  // cannot follow the fault around.
  const cutLineAt = (x) => {
    const ceil = (H - 150) - x * ((H - 150) - (H - 150 - W)) / W;
    return ceil - RESERVE_45;
  };
  assert.ok(Math.abs(nearY - cutLineAt(pv.x)) < 0.05, 'near top corner on the cut line');
  assert.ok(Math.abs(farY - cutLineAt(farX)) < 0.05, 'far top corner on the cut line');
  // …and the vertical footprint of the leant board is G / cos β — which is
  // exactly what the cut sides were bevelled to, so the underside SITS.
  const beta = (Math.abs(deg) * Math.PI) / 180;
  assert.ok(Math.abs(G / Math.cos(beta) - top.meta.verticalFootprint) < 0.01,
    'underside meets the bevelled sides to the millimetre');
});

test('a fall to the LEFT is the mirror — positive lean, pivot at x = 0', () => {
  // The sign is where a lean dies: mirror the fall and demand the mirror lean.
  const r = build({ slope_cut: { pts: [{ x: 0, y: H - 150 - W }, { x: W, y: H - 150 }], infill: INFILL } });
  const top = byId(r, 'TOP');
  assert.equal(top.meta.tilt_axis, 'z');
  // T54-F1 AMENDED (28.08.2026): pivot y = cutReach(0), one reserve below the
  // ceiling's low end.
  assert.equal(top.meta.tilt_pivot.x, 0);
  assert.ok(Math.abs(top.meta.tilt_pivot.y - ((H - 150 - W) - RESERVE_45)) < 0.01,
    'pivot on the cut line, not the ceiling');
  assert.ok(Math.abs(top.meta.tilt_deg - 45) < 0.01, 'counter-clockwise this way');
  const [fx, fy] = spin([top.box.x + top.box.w, top.box.y + top.box.h],
    top.meta.tilt_pivot, top.meta.tilt_deg);
  assert.ok(Math.abs(fx - W) < 1e-3 && Math.abs(fy - ((H - 150) - RESERVE_45)) < 1e-3,
    'the far end lands on the cut line\'s high end');
});

test('at a knee the LEVEL segment carries no lean and keeps its board-box', () => {
  // 2300 → 1700 on the ceiling; the CARCASS line is that less the reserve,
  // and it clamps at H where it still clears the cabinet — flat, then the
  // 45° fall: TOP-1 and TOP-2. (T54-F1: the crossing moved with the line.)
  const r = build({ slope_cut: { pts: [{ x: 0, y: H + 150 }, { x: W, y: H - 450 }], infill: INFILL } });
  const flat = byId(r, 'TOP-1');
  const fall = byId(r, 'TOP-2');
  assert.ok(flat && fall, 'one board per segment');
  assert.equal(flat.meta.tilt_deg, undefined, 'level: nothing to lean');
  assert.equal(flat.meta.tilt_axis, undefined);
  assert.equal(flat.box.h, G, 'and its box was the board already');
  assert.equal(fall.meta.tilt_axis, 'z');
  assert.ok(fall.meta.tilt_deg < 0, 'the sloped one leans clockwise');
  assert.ok(Math.abs(fall.meta.tilt_pivot.x - W) < 1e-6, 'pivot at the low right');
  assert.ok(Math.abs(fall.meta.tilt_pivot.y - ((H - 450) - RESERVE_45)) < 0.01,
    'T54-F1: and one reserve below the ceiling');
});

test('the TRIO hangs on THREE lines — face on the ceiling, roof on the cut, shelf under the roof', () => {
  // T54-F1 AMENDED (28.08.2026): the chat-fix version of this test was called
  // "the top infill face and shelf lean the same way, hung from the ceiling"
  // and asserted the very stack the owner measured. The trio's law now:
  const r = build(FALL);
  const face = byId(r, 'INFILL-T-FACE');
  const shelf = byId(r, 'INFILL-T-SHELF');
  const top = byId(r, 'TOP');
  for (const p of [face, shelf]) {
    assert.ok(p, 'the piece exists');
    assert.equal(p.meta.tilt_axis, 'z', 'about Z');
    assert.ok(p.meta.tilt_pivot, 'with a pivot');
    assert.ok(p.meta.tilt_deg < 0, 'clockwise under this fall');
    // The box's top edge starts AT its own pivot — each piece hangs from its
    // OWN line now, so this holds for all three and the lines differ.
    assert.ok(Math.abs((p.box.y + p.box.h) - p.meta.tilt_pivot.y) < 0.01,
      `${p.id}: top edge under its own pivot`);
  }
  const ceilLow = H - 150 - W;
  assert.ok(Math.abs(face.meta.tilt_pivot.y - ceilLow) < 0.01,
    'FACE alone keeps the ceiling pivot');
  assert.equal(face.box.h, INFILL,
    'and its band is the reserve — the 40 is the CUT size (veto: "40 w pionie")');
  assert.ok(Math.abs(top.meta.tilt_pivot.y - (ceilLow - RESERVE_45)) < 0.01,
    'TOP pivots one reserve down');
  assert.ok(Math.abs(shelf.meta.tilt_pivot.y
    - (ceilLow - RESERVE_45 - G / Math.cos(Math.PI / 4))) < 0.01,
    'SHELF pivots under the roof: cutReach − G / cos β (veto: "shelf pod wieńcem")');
});

test('no slope — no lean anywhere, and the shoe shelf keeps its own', () => {
  const flat = build();
  for (const p of flat.panels.filter((q) => q.part === 'TOP' || q.id.startsWith('INFILL-T'))) {
    assert.equal(p.meta?.tilt_axis, undefined, `${p.id}: flat carcass, no axis`);
  }
  // The shoe shelf's T33 lean is untouched: deg + pivot, NO axis (x by default).
  const shoe = build({ wardrobe: { ...PARAMS.wardrobe, shoeShelves: 1 } })
    .panels.find((p) => p.id.startsWith('SHOE'));
  if (shoe && shoe.meta?.tilt_deg) {
    assert.equal(shoe.meta.tilt_axis, undefined, 'shoe shelf: still the x lean');
    assert.ok(shoe.meta.tilt_pivot, 'shoe shelf: still its pivot');
  }
});
