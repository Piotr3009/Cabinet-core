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

// One straight fall, left-high: β = 45° exactly.
const FALL = {
  slope_cut: { pts: [{ x: 0, y: H - 150 }, { x: W, y: H - 150 - W }], infill: 40 },
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
});

test('rotated BY HAND, the board\'s top edge lands on the roof line at BOTH ends', () => {
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
  // Near end: the pivot IS on the line, and the top corner above it stays put
  // horizontally to within the wedge — assert the LINE at both rotated ends.
  const lineAt = (x) => {
    // The roof line from the engine's own record: through the pivot at β.
    const beta = (Math.abs(deg) * Math.PI) / 180;
    const s = deg < 0 ? -Math.tan(beta) : Math.tan(beta);
    return pv.y + s * (x - pv.x);
  };
  assert.ok(Math.abs(nearY - lineAt(pv.x)) < 0.05, 'near top corner on the line');
  assert.ok(Math.abs(farY - lineAt(farX)) < 0.05, 'far top corner on the line');
  // …and the vertical footprint of the leant board is G / cos β — which is
  // exactly what the cut sides were bevelled to, so the underside SITS.
  const beta = (Math.abs(deg) * Math.PI) / 180;
  assert.ok(Math.abs(G / Math.cos(beta) - top.meta.verticalFootprint) < 0.01,
    'underside meets the bevelled sides to the millimetre');
});

test('a fall to the LEFT is the mirror — positive lean, pivot at x = 0', () => {
  // The sign is where a lean dies: mirror the fall and demand the mirror lean.
  const r = build({ slope_cut: { pts: [{ x: 0, y: H - 150 - W }, { x: W, y: H - 150 }], infill: 40 } });
  const top = byId(r, 'TOP');
  assert.equal(top.meta.tilt_axis, 'z');
  assert.deepEqual(top.meta.tilt_pivot, { x: 0, y: H - 150 - W });
  assert.ok(Math.abs(top.meta.tilt_deg - 45) < 0.01, 'counter-clockwise this way');
  const [fx, fy] = spin([top.box.x + top.box.w, top.box.y + top.box.h],
    top.meta.tilt_pivot, top.meta.tilt_deg);
  assert.ok(Math.abs(fx - W) < 1e-3 && Math.abs(fy - (H - 150)) < 1e-3,
    'the far end lands on the line\'s high end');
});

test('at a knee the LEVEL segment carries no lean and keeps its board-box', () => {
  // 2300 → 1700 clamps at H: flat to x = 150, then 45° down — TOP-1 and TOP-2.
  const r = build({ slope_cut: { pts: [{ x: 0, y: H + 150 }, { x: W, y: H - 450 }], infill: 40 } });
  const flat = byId(r, 'TOP-1');
  const fall = byId(r, 'TOP-2');
  assert.ok(flat && fall, 'one board per segment');
  assert.equal(flat.meta.tilt_deg, undefined, 'level: nothing to lean');
  assert.equal(flat.meta.tilt_axis, undefined);
  assert.equal(flat.box.h, G, 'and its box was the board already');
  assert.equal(fall.meta.tilt_axis, 'z');
  assert.ok(fall.meta.tilt_deg < 0, 'the sloped one leans clockwise');
  assert.ok(Math.abs(fall.meta.tilt_pivot.x - W) < 1e-6, 'pivot at the low right');
});

test('the top infill face and shelf lean the same way, hung from the ceiling', () => {
  const r = build(FALL);
  for (const base of ['INFILL-T-FACE', 'INFILL-T-SHELF']) {
    const p = byId(r, base) || byId(r, `${base}-1`);
    assert.ok(p, `${base} exists`);
    assert.equal(p.meta.tilt_axis, 'z', `${base}: about Z`);
    assert.ok(p.meta.tilt_pivot, `${base}: with a pivot`);
    assert.ok(p.meta.tilt_deg < 0, `${base}: clockwise under this fall`);
    // The pivot hangs on the ceiling line and the box's top edge starts AT it.
    assert.ok(Math.abs((p.box.y + p.box.h) - p.meta.tilt_pivot.y) < 0.01, `${base}: top edge under the pivot`);
  }
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
