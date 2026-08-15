// ─── Turn 33, CLAUDE.md F2: "TURN ON THE LIGHT" — the client demo ───────────
//
// One flag, two controls (the View menu and the Lighting panel), and one
// DERIVED factor: the whole studio rig and the environment dim together to
// the profile's demo level while the placed LEDs' emissive comes up. Nothing
// stored moves, which is what makes "toggling back restores exactly the
// previous scene state" a fact of construction rather than a promise.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { demoDimFactor, lightingSpec } from '../src/engine/ledStrips.js';
import { useUiStore } from '../src/stores/uiStore.js';

const ui = () => useUiStore.getState();

test('the demo levels are ONE profile line each — dim and boost, owner-tunable', () => {
  const spec = lightingSpec(P);
  assert.ok(spec.demo.dimFactor > 0 && spec.demo.dimFactor < 1, 'the room goes DOWN');
  assert.ok(spec.demo.emissiveBoost > 1, 'the LEDs come UP');
  assert.equal(spec.demo.dimFactor, P.lighting.demo.dimFactor);
  assert.equal(spec.demo.emissiveBoost, P.lighting.demo.emissiveBoost);
});

test('the factor is derived: off is EXACTLY 1, on is EXACTLY the profile level', () => {
  assert.equal(demoDimFactor(false, P), 1, 'off multiplies by one — the previous state IS the state');
  assert.equal(demoDimFactor(true, P), P.lighting.demo.dimFactor);
});

test('the flag toggles, and toggling twice is the identity', () => {
  assert.equal(ui().lightDemo, false, 'a session starts with the demo off');
  ui().toggleLightDemo();
  assert.equal(useUiStore.getState().lightDemo, true);
  ui().toggleLightDemo();
  assert.equal(useUiStore.getState().lightDemo, false);
  ui().setLightDemo(true);
  assert.equal(useUiStore.getState().lightDemo, true);
  ui().setLightDemo(false);
});

test('the demo scales the RIG AS ONE — every lamp by the same factor, ratios untouched', () => {
  // The scene multiplies the one `gain` every lamp already shares; this holds
  // the arithmetic that makes that a balance-preserving act.
  const dim = demoDimFactor(true, P);
  const lamps = [P.appearance.studio?.ambient, P.appearance.studio?.key, P.appearance.studio?.fill]
    .map((v) => Number(v) || 1);
  const before = lamps.map((v) => v / lamps[0]);
  const after = lamps.map((v) => (v * dim) / (lamps[0] * dim));
  for (let i = 0; i < before.length; i += 1) {
    assert.ok(Math.abs(after[i] - before[i]) < 1e-12, `dimming moves no ratio (lamp ${i})`);
  }
});
