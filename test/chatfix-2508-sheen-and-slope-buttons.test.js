import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateDesign, resolveFinishes, projectSheen } from '../src/engine/design.js';
import { surfaceFor } from '../src/3d/materials.js';
import { computeCabinet } from '../src/engine/cabinet.js';

// ─── CHAT-FIX 25.08.2026 — DEAD MATT MUST NOT SHINE ─────────────────────────
//
// The owner, at 5 % on the slider: *"nadal sie swieci … jak dam 5 procent
// polysku to spray sie swieci."*
//
// T49 widened the slider to veneer but moved only ROUGHNESS. `clearcoat` stayed
// pinned at the lacquer's 0.35 with a `clearcoatRoughness` of 0.12 — and a
// clearcoat is a SECOND, mirror-smooth layer laid OVER the paint. Roughening
// the paint beneath it changes nothing about what that layer reflects, so dead
// matt kept a gloss coat sitting on top of it.
//
// Physically a dead matt lacquer has no gloss coat. So the coat now rides the
// same `1 − sheen/max` the roughness does. Deliberately NOT touched:
// `envMapIntensity` (the 0.25 is the neutral-studio hotfix of 08.08, a weak
// probe rather than a mirror), metalness, and the orange peel — one cause, one
// change.

// The same fixture and the same helper `test/sheen.test.js` uses — one door,
// one carcass, read through `surfaceFor` exactly as the scene reads it.
const unit = () => ({ id: 'u1', type: 'BUD', position: { wall: 0, x_mm: 0 }, params: {} });
const full = () => computeCabinet({
  type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01',
  doors: { count: 1, hinge: 'L' }, shelves: 1, plinth: true,
}, P);
const surfaces = (design, opts = {}) => {
  const finishes = resolveFinishes(unit(), design, P);
  const out = new Map();
  for (const p of full().panels) {
    out.set(p.id, surfaceFor({
      role: p.role,
      materialRole: p.material_role,
      finishExposed: p.finish_exposed,
      finishes,
      profile: P,
      sheen: projectSheen(design, P),
      ...opts,
    }));
  }
  return out;
};
const spray = migrateDesign({ colour: { front: { hex: '#f4f4f0', name: 'White', system: 'RAL' } } });
const surf = (sheen) => surfaces(spray, { frontColour: '#f4f4f0', sheen }).get('01-F');

test('at 5 % the gloss coat is all but gone — dead matt does not shine', () => {
  const matt = surf(5);
  const gloss = surf(100);
  assert.ok(matt.clearcoat < gloss.clearcoat * 0.1,
    `dead matt keeps almost no coat — got ${matt.clearcoat} against ${gloss.clearcoat}`);
  assert.ok(matt.clearcoat <= P.appearance.materials.lacquer.clearcoat * 0.06,
    'and it is a fraction of the lacquer number, not the whole of it');
});

test('at full gloss the coat is the profile\'s own lacquer number, untouched', () => {
  assert.ok(Math.abs(surf(100).clearcoat - P.appearance.materials.lacquer.clearcoat) < 1e-9,
    'the top of the scale is exactly what the profile says a lacquer is');
});

test('the coat follows the same curve as the roughness — one number, one source', () => {
  const max = P.appearance?.sheen?.max ?? 100;
  for (const s of [5, 25, 60, 100]) {
    const got = surf(s);
    const expected = P.appearance.materials.lacquer.clearcoat * (1 - got.roughness);
    assert.ok(Math.abs(got.clearcoat - expected) < 1e-9,
      `sheen ${s} of ${max}: coat ${got.clearcoat} tracks roughness ${got.roughness}`);
  }
});

test('a LAMINATE is untouched — the slider does not reach it at either end', () => {
  const decor = migrateDesign({ finish: { carcass: 'broken_white', front: 'light_oak' } });
  const matt = surfaces(decor, { sheen: 5 }).get('01-F');
  const gloss = surfaces(decor, { sheen: 100 }).get('01-F');
  assert.equal(matt.sheenDriven, false, 'a foil answers no slider');
  assert.equal(matt.clearcoat, gloss.clearcoat,
    'and its coat is the same at 5 % as at 100 % — the owner: "na laminat zostaw jak jest"');
  assert.equal(matt.roughness, gloss.roughness, 'as is its roughness');
});

test('the probe, the metalness and the peel still ask `sprayed` — nothing else moved', () => {
  const mats = readFileSync(new URL('../src/3d/materials.js', import.meta.url), 'utf8');
  assert.match(mats, /envMapIntensity: sprayed \?/, 'the 08.08 hotfix stands');
  assert.match(mats, /metalness: sprayed \?/);
  assert.match(mats, /normalScale: sprayed \?/);
  assert.equal(surf(5).envMapIntensity, 0.25, 'a quarter of a neutral studio, at any sheen');
});

// ─── CHAT-FIX 25.08.2026 — THE SIDE IS THE BUTTON ───────────────────────────
//
// The owner: *"nawet sie nie domyslilem ze trzeba nacisnac 2 razy zeby dodac
// drugi skos — powinien byc przycisk lewy i prawy skos."*

const modal = readFileSync(new URL('../src/components/WallElevationModal.jsx', import.meta.url), 'utf8');

test('the elevation names the SIDE on the button, and refuses to stack two', () => {
  assert.match(modal, /addSlope\('left'\)/, 'a left button that adds a LEFT slope');
  assert.match(modal, /addSlope\('right'\)/, 'and a right one');
  assert.match(modal, /const addSlope = \(side = SLOPE_DEFAULTS\.side\)/,
    'the side is an argument, not a default nobody can see');
  assert.match(modal, /const hasSlopeOn = \(side\)/, 'and a side that is taken is known');
  assert.match(modal, /already has a left slope/, 'the disabled button says why');
});

test('the element window is twice the width it was', () => {
  assert.match(modal, /width="w-\[640px\]"/, 'the owner: "modal powieksz x 2 bo mamy miejsce"');
  assert.ok(!modal.includes('width="w-[320px]"'), 'and the old strip is gone');
});
