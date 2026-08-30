import test from 'node:test';
import assert from 'node:assert/strict';

import { jpullLayers, jpullKey, rampDepths } from '../src/3d/jpullProfile.js';
import { jpullSpec } from '../src/engine/handles.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

// ─── TURN 57 · F3 — THE J RENDERS AS GEOMETRY, NOT AS A STRIPE ─────────────
//
// The owner: *"nie zapomnij o cieniowaniu po routerowaniu, zeby bylo widac
// cien."*
//
// So the recess is REAL MATERIAL THAT IS GONE. The board is extruded as three
// slabs through its own thickness — the lip out to the edge, the slot with
// 40 mm taken off, the rear leg set back by the relief — so every wall is a
// surface with a normal and the renderer draws the shadow for free.
//
// WHICH HOME, and the choice is named: this project has TWO front-solid
// builders that never meet (`shakerSolid.js` for `meta.frontType === 'S'`,
// `panelSolid.js` for everything else), so "extend one of them" has no single
// answer. The PROFILE is the home — `3d/jpullProfile.js`, a pure producer of
// outlines and depths — and the builder that owns the board calls it. This
// file tests the producer, which is the part both builders share.

const spec = jpullSpec(P);
const RECT = [[0, 0], [500, 0], [500, 2100], [0, 2100]];
const base = {
  outline: RECT, w: 500, h: 2100, thickness: 18, profile: spec,
};

const xs = (pts) => pts.map((p) => p[0]);
const ys = (pts) => pts.map((p) => p[1]);

test('F3 — a J board is THREE slabs, and they add up to the board', () => {
  const layers = jpullLayers({ ...base, edge: 'L', from: 700, to: 1200 });
  assert.equal(layers.length, 3, 'the lip, the slot and the rear leg');
  assert.equal(layers[0].z0, 0, 'the lip is the face you look at');
  assert.equal(layers[0].depth, spec.lipT);
  assert.equal(layers[1].z0, spec.lipT);
  assert.equal(layers[1].depth, spec.slotW);
  assert.equal(layers[2].z0, spec.lipT + spec.slotW);
  // The leg takes whatever is left of the board, so an 18 mm section drawn on
  // a 22 mm board is still one board and not a 4 mm gap.
  assert.equal(layers[2].depth, 18 - spec.lipT - spec.slotW);
  const total = layers.reduce((n, l) => n + l.depth, 0);
  assert.ok(Math.abs(total - 18) < 1e-9, 'no gap and no overlap through the thickness');
});

test('F3 — the LIP goes right out to the edge; the others are pulled back', () => {
  const [lip, slot, leg] = jpullLayers({ ...base, edge: 'L', from: 700, to: 1200 });
  assert.deepEqual(lip.pts, RECT, 'the lip is the board, untouched — it is what you see');
  assert.equal(Math.max(...xs(slot.pts)), 500, 'the far edge of the board does not move');
  // The notch reaches the slot's full depth, and the leg's the relief's.
  const slotDeep = xs(slot.pts).filter((x) => x > 0 && x < 500);
  const legDeep = xs(leg.pts).filter((x) => x > 0 && x < 500);
  assert.ok(Math.abs(Math.max(...slotDeep) - spec.slotDepth) < 1e-9, '40 mm of slot');
  assert.ok(Math.abs(Math.max(...legDeep) - spec.reliefMm) < 1e-9, '30 mm of relief');
  assert.ok(spec.slotDepth > spec.reliefMm, 'the slot runs deeper than the relief');
});

test('F3 — the notch lives ONLY over the run, and the rest of the board is untouched', () => {
  const [, slot] = jpullLayers({ ...base, edge: 'L', from: 700, to: 1200 });
  const cut = slot.pts.filter((p) => p[0] > 1e-6 && p[0] < 499);
  assert.ok(cut.length > 8, 'the notch is really there');
  for (const [, y] of cut) {
    assert.ok(y >= 700 - 1e-6 && y <= 1200 + 1e-6, `a cut vertex at ${y} is outside the run`);
  }
  // …and every corner of the original board survives it.
  for (const corner of RECT) {
    assert.ok(slot.pts.some((p) => p[0] === corner[0] && p[1] === corner[1]),
      `the board's corner ${JSON.stringify(corner)} was lost`);
  }
});

test('F3 — the ends RAMP ON AN ARC, tangent to the edge — never a square stop', () => {
  const ramp = rampDepths(40, 25);
  assert.equal(ramp[0].s, 0);
  assert.equal(ramp[0].d, 0, 'it starts flush with the edge');
  assert.ok(Math.abs(ramp[ramp.length - 1].d - 40) < 1e-9, 'and reaches full depth at the radius');
  // TANGENT: over the first tenth of the radius the cutter has already taken
  // most of a straight line's share, which is what an arc does and a chamfer
  // does not. A straight ramp would be d/depth = s/r exactly.
  const early = ramp[1];
  assert.ok(early.d / 40 > early.s / 25, 'the lead-in is curved, not a straight chamfer');
  // …and it is monotonic, so the cutter never backs out and in again.
  for (let i = 1; i < ramp.length; i += 1) assert.ok(ramp[i].d >= ramp[i - 1].d);
});

test('F3 — a run too short for two lead-ins gets the lead-ins it has room for', () => {
  const [, slot] = jpullLayers({ ...base, edge: 'L', from: 700, to: 730 });
  const cut = slot.pts.filter((p) => p[0] > 1e-6 && p[0] < 499);
  assert.ok(cut.length > 0, 'a 30 mm run is still machined');
  for (const [, y] of cut) assert.ok(y >= 700 - 1e-6 && y <= 730 + 1e-6);
  // It still eases in and out — a clamped run does not snap to square ends.
  assert.ok(new Set(cut.map((p) => p[0])).size > 2, 'more than one depth: it ramps');
});

test('F3 — a TOP edge is pulled back across the WHOLE width, with no ramps', () => {
  const [lip, slot, leg] = jpullLayers({ ...base, edge: 'TOP' });
  assert.deepEqual(lip.pts, RECT);
  assert.deepEqual(slot.pts, [[0, 0], [500, 0], [500, 2100 - spec.slotDepth], [0, 2100 - spec.slotDepth]]);
  assert.deepEqual(leg.pts, [[0, 0], [500, 0], [500, 2100 - spec.reliefMm], [0, 2100 - spec.reliefMm]]);
  // The tool enters off one end of the board and leaves off the other, so
  // there is nothing to ease into — which is why a base door has no lead-in.
  assert.equal(new Set(ys(slot.pts)).size, 2, 'a straight step, all the way across');
});

test('F3 — the RIGHT edge notches inward from w, the LEFT outward from 0', () => {
  const [, right] = jpullLayers({ ...base, edge: 'R', from: 700, to: 1200 });
  const [, left] = jpullLayers({ ...base, edge: 'L', from: 700, to: 1200 });
  const rCut = xs(right.pts).filter((x) => x > 1e-6 && x < 500 - 1e-6);
  const lCut = xs(left.pts).filter((x) => x > 1e-6 && x < 500 - 1e-6);
  assert.ok(Math.min(...rCut) >= 500 - spec.slotDepth - 1e-6, 'the R notch is at the far edge');
  assert.ok(Math.max(...lCut) <= spec.slotDepth + 1e-6, 'the L notch is at the near edge');
});

test('F3 — a board too thin for the section is not drawn at all', () => {
  // Lip + slot is 14.212; a 12 mm board cannot hold it, and half a J is worse
  // than none — it would be a hole through the door.
  assert.equal(jpullLayers({ ...base, thickness: 12, edge: 'TOP' }), null);
  assert.equal(jpullLayers({ ...base, thickness: 14.212, edge: 'TOP' }), null, 'and neither can an exact fit');
  assert.ok(jpullLayers({ ...base, thickness: 15, edge: 'TOP' }), 'a 15 mm board holds it with a thin leg');
});

test('F3 — no edge, no profile, no outline: nothing is drawn', () => {
  assert.equal(jpullLayers({ ...base, edge: null }), null);
  assert.equal(jpullLayers({ ...base, edge: 'TOP', profile: null }), null);
  assert.equal(jpullLayers({ ...base, outline: [[0, 0], [1, 1]], edge: 'TOP' }), null);
});

test('F3 — the cache token moves with every number that changes the SHAPE', () => {
  const a = jpullKey({ edge: 'L', from: 700, to: 1200, profile: spec });
  const b = jpullKey({ edge: 'R', from: 700, to: 1200, profile: spec });
  const c = jpullKey({ edge: 'L', from: 700, to: 900, profile: spec });
  const d = jpullKey({ edge: 'L', from: 700, to: 1200, profile: { ...spec, rampR: 40 } });
  assert.equal(new Set([a, b, c, d]).size, 4, 'four different boards, four keys');
  assert.equal(jpullKey({ edge: null }), '', 'and a front with no J adds nothing to any key');
  assert.equal(jpullKey(null), '');
});
