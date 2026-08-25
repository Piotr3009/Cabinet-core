import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { finishById, roughnessFromSheen } from '../src/engine/design.js';
import { getVeneers, veneerFinishId } from '../src/engine/veneers.js';
import { surfaceFor } from '../src/3d/materials.js';

// ─── TURN 49 · F9 — THE SHEEN MOVES VENEER TOO ──────────────────────────────
//
// The owner, 25.08.2026: *"suwak powinien dzialac tylko na spray i veneer, nie
// na laminat — na laminat zostaw jak jest."*
//
// `3d/materials.js` gated the roughness on `sprayed`, which is "does this piece
// go to the SPRAY BOOTH". A veneered piece does not — it is a timber face — but
// it IS lacquered, and the gloss of that lacquer is this number and is ordered
// from the same supplier as the doors'. So a veneer could not answer the slider
// at all, and a real board in the workshop had a picture that never changed.
//
// A laminate keeps what it has. A foil board arrives from the factory with its
// own finish on it and no slider changes that.

const MATS = readFileSync(new URL('../src/3d/materials.js', import.meta.url), 'utf8');
const SLIDER = readFileSync(new URL('../src/components/SheenSlider.jsx', import.meta.url), 'utf8');

const SPRAY = { id: 'spray:test', kind: 'spray', hex: '#F2F0EC' };
const VENEER = finishById(P, veneerFinishId(getVeneers()[0]));
const LAMINATE = finishById(P, 'dark_walnut');

/** One piece, one finish, one sheen — everything else held still. */
const roughnessAt = (finish, sheen) => surfaceFor({
  role: 'front',
  materialRole: 'front',
  finishExposed: false,
  finishes: { carcass: finish, front: finish },
  finish,
  profile: P,
  sheen,
}).roughness;

test('F9 — the three finishes really are three different kinds', () => {
  assert.equal(SPRAY.kind, 'spray');
  assert.ok(VENEER, 'the veneer catalogue answered');
  assert.equal(VENEER.kind, 'veneer');
  assert.ok(LAMINATE, 'the decor catalogue answered');
  assert.equal(LAMINATE.kind, 'decor');
  assert.ok(LAMINATE.texture, 'a laminate is a foil with a picture on it');
});

test('F9 — SPRAY moves, as it always has', () => {
  const matt = roughnessAt(SPRAY, 5);
  const gloss = roughnessAt(SPRAY, 100);
  assert.equal(matt, roughnessFromSheen(5, P));
  assert.equal(gloss, roughnessFromSheen(100, P));
  assert.notEqual(matt, gloss);
});

test('F9 — VENEER moves too, and that is the change', () => {
  const matt = roughnessAt(VENEER, 5);
  const gloss = roughnessAt(VENEER, 100);
  assert.equal(matt, roughnessFromSheen(5, P), 'dead matt lacquer on a timber face');
  assert.equal(gloss, roughnessFromSheen(100, P), 'and full gloss on the same one');
  assert.notEqual(matt, gloss);
  // The surface says so out loud, so a scene or a test can ask rather than
  // infer it from a number.
  const s = surfaceFor({
    role: 'front', materialRole: 'front', finishes: { carcass: VENEER, front: VENEER },
    finish: VENEER, profile: P, sheen: 60,
  });
  assert.equal(s.sheenDriven, true);
  // …and it is NOT called sprayed: a veneer takes no orange peel, no gun
  // metalness and keeps the room's own reflection.
  assert.equal(s.sprayed, false);
  assert.equal(s.metalness, P.appearance.materials.melamine.metalness);
  assert.equal(s.envMapIntensity, 1);
  assert.equal(s.normalScale, 1);
});

test('F9 — LAMINATE does not move: *"na laminat zostaw jak jest"*', () => {
  const matt = roughnessAt(LAMINATE, 5);
  const gloss = roughnessAt(LAMINATE, 100);
  assert.equal(matt, gloss, 'the slider must not reach a foil board');
  assert.equal(matt, P.appearance.materials.melamine.roughness, 'it keeps the board family’s own number');
  const s = surfaceFor({
    role: 'front', materialRole: 'front', finishes: { carcass: LAMINATE, front: LAMINATE },
    finish: LAMINATE, profile: P, sheen: 100,
  });
  assert.equal(s.sheenDriven, false);
  assert.equal(s.sprayed, false);
});

test('F9 — a piece that goes to the booth still answers, whatever it is faced in', () => {
  // `finish_exposed` is the engine's own flag and it is untouched: a door, an
  // end panel, an infill and a plinth are sprayed BECAUSE OF WHERE THEY SIT.
  const s = (sheen) => surfaceFor({
    role: 'end_panel',
    materialRole: 'front',
    finishExposed: true,
    finishes: { carcass: SPRAY, front: SPRAY },
    profile: P,
    sheen,
  });
  assert.notEqual(s(5).roughness, s(100).roughness);
  assert.equal(s(60).sprayed, true);
});

test('F9 — the gate is one named line, and the formula did not move', () => {
  assert.match(MATS, /const veneered = !isDecor && finish\?\.kind === 'veneer';/);
  assert.match(MATS, /const sheenDriven = sprayed \|\| veneered;/);
  assert.match(MATS, /roughness: sheenDriven && sheen != null \? roughnessFromSheen\(sheen, profile\) : pbr\.roughness/);
  // Only the ROUGHNESS widened. The three things `sprayed` decides — the probe,
  // the metalness and the gun's orange peel — still ask `sprayed`.
  assert.match(MATS, /metalness: sprayed \?/);
  assert.match(MATS, /envMapIntensity: sprayed \?/);
  assert.match(MATS, /normalScale: sprayed \?/);
});

test('F9 — and the slider says what it does', () => {
  assert.match(SLIDER, /Sprayed and veneered surfaces/);
  assert.match(SLIDER, /A laminate keeps the finish it came with/);
  assert.match(SLIDER, /data-sheen-scope="1"/);
});
