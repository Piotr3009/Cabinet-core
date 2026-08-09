// ─── Turn 14, F9: the eye-level pair ────────────────────────────────────────
//
// The owner's finding is geometric rather than a matter of taste: the gloss
// reads only at STEEP angles, because every strong light in the rig is high. A
// specular highlight is the mirror of its source, so a source at three metres
// and a viewer at 1.65 can only meet on a vertical door when the viewer is
// looking up at it — which is not how anybody looks at a kitchen.
//
// What node can hold is the SPEC: two lights, symmetric, at an absolute height,
// physical intensity, warm, and casting nothing. The picture itself is the
// browser walk's, at sheen 60–90, on an orbit at normal viewing angles.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const allPoints = P.appearance.studio.points;

// ─── Turn 16: THE RIG GREW A SECOND PAIR, SO THIS FILE NAMES ITS OWN ────────
// Turn 14's claims are about the EYE-LEVEL pair and every one of them still
// holds unchanged. What no longer holds is the assumption that the eye pair is
// the whole rig: the owner asked for a low pair at 500 (test/sprayed-carcass-
// sheen.test.js pins that one), so this file selects the pair it is about
// instead of taking the array whole. Nothing here was weakened — the same
// assertions run against the same two lights.
const points = allPoints.filter((p) => p.yMm === 1650);

test('F9.1 — there is a SYMMETRIC PAIR, left and right of centre', () => {
  assert.equal(points.length, 2, 'a pair — one light gives a highlight on one side of the room');
  const [left, right] = [...points].sort((a, b) => a.x - b.x);
  assert.ok(left.x < 0 && right.x > 0, 'one each side of centre');
  assert.equal(Math.abs(left.x), Math.abs(right.x), 'and symmetric about it');
  assert.ok(Math.abs(right.x - 0.35) < 1e-9, `CLAUDE.md asks for x ≈ ±0.35, got ${right.x}`);
  assert.equal(left.z, right.z);
  assert.ok(Math.abs(left.z - 0.7) < 1e-9, `and z ≈ 0.7, got ${left.z}`);
});

test('F9.1 — the height is ABSOLUTE, in millimetres, and it is eye level', () => {
  for (const p of points) {
    assert.equal(p.yMm, 1650, 'eyes do not scale with the kitchen');
    assert.equal(p.y, undefined, 'so this one is not a rig-distance fraction');
    // x and z still are — the pair opens out with the job without rising.
    assert.ok(Math.abs(p.x) < 1 && Math.abs(p.z) < 1, 'x and z stay fractions');
  }
});

test('F9.1 — the intensities are PHYSICAL, and warm white', () => {
  for (const p of points) {
    assert.ok(p.intensity >= 10 && p.intensity < 20,
      `decay 2 means a working value at a few metres is in the teens — got ${p.intensity}`);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(p.colour.slice(i, i + 2), 16));
    assert.ok(r >= g && g > b, `${p.colour} is not a warm white (${r},${g},${b})`);
    assert.ok(r > 240, 'and it is a WHITE, not a colour');
  }
});

test('F9.1 — they cast NOTHING: the shadow budget is untouched', () => {
  // Deliberately EVERY point light, not just the eye pair: the budget is a
  // property of the rig, so a pair added later has to answer to it too.
  for (const p of allPoints) {
    assert.notEqual(p.castShadow, true, 'a point light casting a shadow is six depth passes');
  }
  // The budget is the one turn 10 set, and the pair does not eat into it: the
  // key and the jupiters are the only casters, and they are counted in the view.
  assert.equal(P.appearance.studio.shadowCasters, 2);
  assert.equal(P.appearance.studio.keyCastsShadow, true);
  const casting = (P.appearance.studio.spots || []).filter((s) => s.castShadow).length;
  assert.ok(casting + 1 <= P.appearance.studio.shadowCasters, 'the budget still balances');
});

test('F9.1 — the lightScale role a render rebalances by still exists', () => {
  // The pair is tagged `ccLight: 'point'` in the view (3d/Scene.jsx), and the
  // render pass rebalances by role (3d/renderCapture.js). The role has to be a
  // key a still can reach, or the pair is unreachable from a render.
  assert.ok(Object.hasOwn(P.render.lightScale, 'point'), 'the role is in the render’s own table');
  assert.equal(P.render.lightScale.point, 1, 'and a still ships neutral, as turn 10 left it');
});

test('F9 — the point reach still covers them', () => {
  // A falloff cutoff shorter than the distance from the rig centre to eye level
  // would switch the pair off silently on a big job.
  assert.ok(P.appearance.studio.pointReach >= 2, `${P.appearance.studio.pointReach}`);
});
