// ─── Turn 16: A SPRAYED CARCASS IS SPRAYED (the owner's "shine" report) ─────
//
// The report was that the sheen slider "only sets the first colour — the second
// one does not reflect the light". Measured in the browser, both FRONTS
// answered the slider correctly; what never answered was a carcass whose source
// is `sprayed`.
//
// Two lines, one cause. `resolveFinishes` built the carcass slot out of board
// ids alone and never looked at `design.colour.carcass`, so a carcass sprayed
// wine red resolved to the profile's broken white — and since it came back as a
// BOARD, `surfaceFor` gave it melamine's fixed roughness and the slider had
// nothing to move. The front side had had the answer since turn 9: a sprayed
// colour is a finish, ahead of any board.
//
// These tests pin the pair, and the sizes of the two claims that matter to the
// workshop: that `finish_exposed` — the engine's spray-booth flag, which the cut
// list and the CNC output are built on — is NOT what changed.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateDesign, resolveFinishes, roughnessFromSheen } from '../src/engine/design.js';
import { isFinishExposed } from '../src/engine/cabinet.js';
import { surfaceFor } from '../src/3d/materials.js';

/** A project whose carcass type 1 is sprayed in `hex`. */
function sprayedCarcassDesign(hex) {
  const d = migrateDesign({});
  d.carcass.types[0] = {
    ...d.carcass.types[0], source: 'sprayed', finish_id: null,
  };
  d.colour.carcass = { system: 'custom', hex, name: hex };
  return d;
}

test('a sprayed carcass resolves to its own colour, not the profile board', () => {
  const d = sprayedCarcassDesign('#7a1f2b');
  const { carcass } = resolveFinishes(null, d, P);

  assert.equal(carcass.kind, 'spray', 'the carcass slot carries the spray, as the front slot does');
  assert.equal(carcass.hex, '#7a1f2b');
});

test('a carcass on a BOARD is untouched by the spray route', () => {
  const d = migrateDesign({});
  // Whatever the shipped default is, it is not a spray and it does not become
  // one because a colour happens to be sitting in the project.
  d.colour.carcass = { system: 'custom', hex: '#7a1f2b', name: '#7a1f2b' };
  const { carcass } = resolveFinishes(null, d, P);

  assert.notEqual(carcass.kind, 'spray');
});

test('the sheen moves a sprayed CARCASS surface, not only a front', () => {
  const d = sprayedCarcassDesign('#7a1f2b');
  const finishes = resolveFinishes(null, d, P);

  // A carcass side: not finish-exposed — it does not go to the booth because of
  // where it sits — but the board it is cut from is lacquer.
  const side = (sheen) => surfaceFor({
    role: 'side', materialRole: 'carcass', finishExposed: false, finishes, profile: P, sheen,
  });

  assert.equal(side(100).roughness, roughnessFromSheen(100, P), 'gloss follows the slider');
  assert.equal(side(5).roughness, roughnessFromSheen(5, P), 'matt follows the slider');
  assert.notEqual(side(100).roughness, side(5).roughness, 'the two ends are not the same surface');
  assert.equal(side(50).sprayed, true);
});

test('a sprayed carcass refuses the environment probe, like every sprayed piece', () => {
  const d = sprayedCarcassDesign('#7a1f2b');
  const finishes = resolveFinishes(null, d, P);
  const side = surfaceFor({
    role: 'side', materialRole: 'carcass', finishExposed: false, finishes, profile: P, sheen: 60,
  });

  assert.equal(side.envMapIntensity, P.appearance.spray?.envMapIntensity ?? 0);
  // `colour` is a THREE.Color, and a carcass side carries the profile's own
  // shading for its role — so the assertion is that the colour CAME FROM the
  // spray, not that it is the hex untouched.
  const white = surfaceFor({
    role: 'side',
    materialRole: 'carcass',
    finishExposed: false,
    finishes: resolveFinishes(null, migrateDesign({}), P),
    profile: P,
    sheen: 60,
  });
  assert.notEqual(side.colour.getHexString(), white.colour.getHexString(),
    'a carcass sprayed wine red is not the profile board');
  assert.ok(side.colour.r > side.colour.g && side.colour.r > side.colour.b,
    'and it is red, which is what was asked for');
});

test('a carcass wearing a DECOR is still a decor, sheen or no sheen', () => {
  const decor = P.appearance.finishes?.find((f) => f.kind === 'decor' && f.texture);
  if (!decor) return; // no decor in this profile — nothing to assert against

  const d = migrateDesign({});
  d.carcass.types[0] = { ...d.carcass.types[0], source: 'decor', finish_id: decor.id };
  const finishes = resolveFinishes(null, d, P);
  const side = surfaceFor({
    role: 'side', materialRole: 'carcass', finishExposed: false, finishes, profile: P, sheen: 100,
  });

  assert.equal(side.sprayed, false, 'a foil board is a foil board');
});

test('the spray-booth flag itself is unchanged — the cut list is not touched', () => {
  // The five roles turn 11 settled. If this list ever changes it is a decision
  // about the WORKSHOP, and it does not get made by a rendering fix.
  for (const role of ['front', 'infill', 'plinth', 'end_panel', 'mask']) {
    assert.equal(isFinishExposed(role), true, `${role} goes to the booth`);
  }
  for (const role of ['side', 'shelf', 'back', 'bottom', 'top']) {
    assert.equal(isFinishExposed(role), false, `${role} does not`);
  }
});

// ─── Turn 16: THE LOW PAIR OF LIGHTS ────────────────────────────────────────
//
// The owner asked for a second pair below the worktop — "at about 500, both
// sides, not so strong, just enough to throw a glow". The rig is data
// (profile.appearance.studio.points) and the scene maps it, so the request is a
// pair of entries and nothing in the renderer.

test('the studio rig has a low pair at 500 mm, weaker than the eye-level pair', () => {
  const pts = P.appearance.studio.points;
  const eye = pts.filter((p) => p.yMm === 1650);
  const low = pts.filter((p) => p.yMm === 500);

  assert.equal(eye.length, 2, 'the eye-level pair is still a pair');
  assert.equal(low.length, 2, 'and there is a low pair beside it');

  // Symmetrical about the subject, exactly as the pair above is.
  assert.deepEqual(low.map((p) => p.x).sort((a, b) => a - b), eye.map((p) => p.x).sort((a, b) => a - b));

  for (const p of low) {
    assert.ok(p.intensity > 0, 'a light that is off is not a light');
    assert.ok(p.intensity < Math.min(...eye.map((e) => e.intensity)), 'the low pair is the quieter one');
  }
});

test('every light in the rig is physical — nothing is a bare unit-one number', () => {
  for (const p of P.appearance.studio.points) {
    assert.ok(p.intensity >= 1, 'three r0.180 decays with distance squared: sub-unit values are invisible');
    assert.ok(typeof p.colour === 'string' && p.colour.startsWith('#'));
  }
});
