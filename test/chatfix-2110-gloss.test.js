/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 21.10.2026 · THE GLOSS RIDE ───────────────────────────────────
//
// The owner, 21.10.2026 (20:15): *"nie mamy w ogole polysku, czy mozemy zrobic
// polysk od 0 do 100 procent? przeanalizuj prosze"*; shown the two ways
// (20:31): *"1 - wariant A"* (the neutral studio, never the room), *"minimum 5
// zostaw"*, *"3 - chat zip"*.
//
// MEASURED before the fix (verify/chatfix-2110/): a RAL 5008 door at 5 % and
// at 100 % differed by one unit of brightness in 255. The slider moved the
// roughness and a coat capped at the lacquer's 0.35 over a probe pinned at a
// quarter of a 64 px blur. Now six profile numbers (`appearance.gloss`) ride
// the sheen on a sprayed or veneered piece: the coat to 1.0, its roughness
// from 0.5 to 0.03, the probe's weight from the 08.08 quarter to 1.0, over a
// 256 px studio. The studio stays neutral grey, so a sprayed colour stays the
// colour (turn 8); laminate, raw MDF and the hardware keep every number.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { surfaceFor } from '../src/3d/materials.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { roughnessFromSheen, sheenSteps, clampSheen } from '../src/engine/design.js';
import { LICENSED } from '../scripts/t78-classify.d/f39-owner-2110.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const OWNER = 'nie mamy w ogole polysku';

const finishes = { front: { kind: 'spray', hex: '#2f3b4c' }, carcass: { kind: 'melamine', hex: '#ffffff' } };
const spray = (sheen) => surfaceFor({
  role: 'front', materialRole: 'front', finishExposed: true, finishes, profile: P, frontColour: { hex: '#2f3b4c' }, sheen,
});

test('the six numbers live in the profile, PROPOSED with his words; a stored profile from before today gains them whole', () => {
  const GL = P.appearance.gloss;
  assert.deepEqual(GL, { coatMax: 1.0, coatRoughnessMin: 0.03, coatRoughnessMax: 0.5, envMin: 0.25, envMax: 1.0, probeSize: 256 });
  assert.equal(GL.envMin, P.appearance.spray.envMapIntensity, 'the floor of the probe is the 08.08 quarter itself');
  const src = read('src/engine/profile.js');
  assert.ok(src.includes(OWNER), 'his words beside the numbers');
  assert.ok(src.includes('*"wariant A"*') && src.includes('*"minimum 5 zostaw"*'));
  const old = migrateCabinetProfile({ ...P, appearance: { ...P.appearance, gloss: undefined } });
  assert.deepEqual(old.appearance.gloss, GL, 'migrated key by key');
  const tuned = migrateCabinetProfile({ ...P, appearance: { ...P.appearance, gloss: { coatMax: 0.8 } } });
  assert.deepEqual(tuned.appearance.gloss, { ...GL, coatMax: 0.8 }, 'a workshop that tuned one keeps it');
  // The scale is untouched: 5 to 100 in fives (*"minimum 5 zostaw"*).
  assert.deepEqual([P.appearance.sheenScale.min, P.appearance.sheenScale.max, P.appearance.sheenScale.step], [5, 100, 5]);
  assert.equal(sheenSteps(P)[0], 5);
  assert.equal(clampSheen(0, P), 5);
});

test('the ride: at 5 % no mirror, at 100 % a sharp full coat over the studio at full weight; the roughness as it has been since T49', () => {
  const GL = P.appearance.gloss;
  const matt = spray(5);
  const full = spray(100);
  assert.deepEqual([matt.roughness, full.roughness], [0.95, 0], 'the roughness formula did not move');
  assert.ok(matt.clearcoat <= 0.05 + 1e-9 && matt.clearcoatRoughness >= 0.47, `dead matt: coat ${matt.clearcoat}, its roughness ${matt.clearcoatRoughness}`);
  assert.ok(Math.abs(full.clearcoat - GL.coatMax) < 1e-9);
  assert.ok(Math.abs(full.clearcoatRoughness - GL.coatRoughnessMin) < 1e-9);
  assert.ok(Math.abs(full.envMapIntensity - GL.envMax) < 1e-9);
  assert.ok(Math.abs(matt.envMapIntensity - (GL.envMin + (GL.envMax - GL.envMin) * 0.05)) < 1e-9);
  // Monotone, one source: every stop up the slider is at least as glossy on every number.
  let prev = null;
  for (const s of sheenSteps(P)) {
    const got = spray(s);
    const gloss = 1 - roughnessFromSheen(s, P);
    assert.ok(Math.abs(got.clearcoat - GL.coatMax * gloss) < 1e-6, `${s}: coat`);
    assert.ok(Math.abs(got.clearcoatRoughness - (GL.coatRoughnessMax + (GL.coatRoughnessMin - GL.coatRoughnessMax) * gloss)) < 1e-6, `${s}: coat roughness`);
    assert.ok(Math.abs(got.envMapIntensity - (GL.envMin + (GL.envMax - GL.envMin) * gloss)) < 1e-6, `${s}: probe`);
    if (prev) {
      assert.ok(got.clearcoat >= prev.clearcoat && got.clearcoatRoughness <= prev.clearcoatRoughness && got.envMapIntensity >= prev.envMapIntensity && got.roughness <= prev.roughness, `${s}: monotone`);
    }
    prev = got;
  }
  assert.equal(full.metalness, 0, 'a lacquer is not a metal');
  assert.equal(full.normalScale, 0, 'the peel is as the 08.08 hotfix left it');
});

test('what the slider does not reach keeps every number: a laminate, a raw board, a lacquered piece with no sheen handed in, the melamine carcass', () => {
  const L = P.appearance.materials.lacquer;
  const laminate = (sheen) => surfaceFor({
    role: 'front', materialRole: 'front', finishExposed: true,
    finishes: { front: { kind: 'decor', hex: '#a0a0a0', texture: 'x', repeatMm: 100 }, carcass: finishes.carcass }, profile: P, sheen,
  });
  for (const s of [5, 100]) {
    const l = laminate(s);
    assert.equal(l.sheenDriven, false);
    assert.deepEqual([l.roughness, l.clearcoat, l.clearcoatRoughness, l.envMapIntensity], [L.roughness, L.clearcoat, L.clearcoatRoughness, 1], `laminate at ${s}: the family numbers`);
  }
  const raw = surfaceFor({
    role: 'front', materialRole: 'front', finishExposed: true,
    finishes: { front: { kind: 'raw', hex: '#c8b89a', roughness: 0.95 }, carcass: finishes.carcass }, profile: P, sheen: 100,
    finish: { kind: 'raw', hex: '#c8b89a', roughness: 0.95 },
  });
  assert.deepEqual([raw.clearcoat, raw.clearcoatRoughness, raw.envMapIntensity], [0, 1, 0], 'raw MDF: no coat, no probe (T69 F4)');
  const noSheen = surfaceFor({ role: 'front', materialRole: 'front', finishExposed: true, finishes, profile: P, frontColour: { hex: '#2f3b4c' } });
  assert.deepEqual([noSheen.clearcoat, noSheen.clearcoatRoughness, noSheen.envMapIntensity], [L.clearcoat, L.clearcoatRoughness, P.appearance.spray.envMapIntensity], 'no sheen handed in: the lacquer family and the 08.08 quarter, as before');
  const side = surfaceFor({ role: 'side', materialRole: 'carcass', finishExposed: false, finishes, profile: P, sheen: 100 });
  assert.deepEqual([side.sprayed, side.clearcoat, side.envMapIntensity], [false, P.appearance.materials.melamine.clearcoat, 1], 'a melamine side reflects the room, and should');
});

test('a veneer rides with the spray (T49 F9 holds); its probe stays the board\'s full weight', () => {
  const veneer = (sheen) => surfaceFor({
    role: 'front', materialRole: 'front', finishExposed: true,
    finishes: { front: { kind: 'decor', hex: '#a0a0a0' }, carcass: finishes.carcass }, profile: P, sheen, veneered: true,
  });
  assert.equal(veneer(100).sheenDriven, true);
  assert.ok(Math.abs(veneer(100).clearcoat - P.appearance.gloss.coatMax) < 1e-9);
  assert.ok(veneer(5).clearcoat < 0.06);
  assert.equal(veneer(100).envMapIntensity, 1, 'not sprayed: the board\'s own probe weight');
});

test('the studio probe is built at the profile\'s resolution; the lights are untouched; the files are licensed with his words', () => {
  const scene = read('src/3d/Scene.jsx');
  assert.match(scene, /pmrem\.fromScene\(room, 0\.04, 0\.1, 100, \{ size: probeSize \}\)/);
  assert.match(scene, /appearance\?\.gloss\?\.probeSize/);
  assert.match(scene, /size=\{profile\.appearance\.gloss\?\.probeSize\}/, 'the room scene passes it; the editor windows read the profile themselves');
  assert.match(scene, /new RoomEnvironment\(\)/, 'still the neutral box: wariant A');
  assert.doesNotMatch(scene, /CubeCamera/, 'no probe of the room itself');
  const mats = read('src/3d/materials.js');
  assert.match(mats, /envMapIntensity: sprayed \?/, 'the 08.08 signature stands');
  assert.match(mats, /const GL = A\.gloss \|\| \{\};/);
  for (const file of ['src/3d/materials.js', 'src/3d/Scene.jsx', 'src/engine/profile.js']) {
    assert.ok(LICENSED[file]?.why.includes(OWNER), `${file} licensed with his words`);
  }
  // The hardware's own probe (T24 F12) is not this one.
  assert.match(read('src/3d/hardwareEnv.js'), /size: 64/);
});
