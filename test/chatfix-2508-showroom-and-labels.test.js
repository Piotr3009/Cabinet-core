import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile as mergeProfile } from '../src/engine/profile.js';

// ─── CHAT-FIX 25.08.2026 — THE SHOWROOM, AND HALF THE FALL-OFF ──────────────
//
// Two owner rulings, one session, both about what the eye sees.
//
//   *"4 reflektory takie skupione na szafe … ma byc jak w studio, jak
//   showroom … chce zeby polysk byl widoczny."*
//
//   *"pozostawienie takiego samego wymiaru dimension przy odsowaniu szafy nie
//   byl dobry pomysl … niech sie pomniejszaja przez pol … nie calkowicie jak
//   przedtem."*
//
// The lights are a rig change and the scene is a browser file, so what is
// asserted here is the CONTRACT: the profile's numbers, the merge, the gate on
// the jupiters, and the one band per run. The arithmetic that can be run
// without a browser — the label's fall-off — is run.

const SCENE = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
const LABEL = readFileSync(new URL('../src/3d/DimLabel.jsx', import.meta.url), 'utf8');

// ══ the bands ══════════════════════════════════════════════════════════════

test('the profile carries the band, and every number is named', () => {
  const b = P.appearance.studio.band;
  assert.ok(b, 'the band exists');
  for (const k of ['intensity', 'colour', 'aboveMm', 'forwardMm', 'widthMm', 'spillMm']) {
    assert.ok(b[k] !== undefined, `${k} is stated in the profile, not buried in JSX`);
  }
  assert.ok(b.aboveMm > 0 && b.widthMm > 0, 'a tube has a height above the run and a width');
});

test('a profile saved before today gains the band whole; a tuned one keeps its own', () => {
  // A REAL stored profile — `migrateCabinetProfile` rejects a stub outright
  // (no schema, no carcass) and hands back the defaults, which would make this
  // pass without proving anything.
  const stored = { ...P, appearance: { ...P.appearance, studio: { ...P.appearance.studio } } };
  delete stored.appearance.studio.band;
  const fresh = mergeProfile(stored);
  assert.deepEqual(fresh.appearance.studio.band, P.appearance.studio.band,
    'a profile stored before today gains every band key');

  const tunedIn = {
    ...P,
    appearance: {
      ...P.appearance,
      studio: { ...P.appearance.studio, band: { intensity: 5 } },
    },
  };
  const tuned = mergeProfile(tunedIn);
  assert.equal(tuned.appearance.studio.band.intensity, 5, 'a tuned tube wins');
  assert.equal(tuned.appearance.studio.band.aboveMm, P.appearance.studio.band.aboveMm,
    '…and the keys it did not name still arrive');
});

test('the jupiters are gated by a flag — and by evening the owner turned them back on', () => {
  // ─── AMENDED 25.08.2026, the same day ─────────────────────────────────────
  // This test was written when the spots were the suspect and shipped dark.
  // They were the wrong lamps: the four circles were `points`, and the owner,
  // once shown that: *"czyli spoty zaswiecamy spowrotem."* What this test is
  // really for is the GATE — that they can be switched without being deleted —
  // and that is what it now guards, at whatever the shipped default is.
  assert.equal(typeof P.appearance.studio.spotsOn, 'boolean', 'the flag exists');
  assert.equal(P.appearance.studio.spotsOn, true, 'and by the owner\'s evening ruling they are on');
  assert.ok(Array.isArray(P.appearance.studio.spots) && P.appearance.studio.spots.length > 0,
    'every one of them is in the rig, with its own numbers');
  assert.match(SCENE, /if \(studio\.spotsOn === false\) return \[\]/,
    'gated by the flag, not deleted');
  assert.match(SCENE, /<spotLight/, 'the element itself survives either way');
});

test('ONE band per run — grouped by wall, an empty wall gets none', () => {
  assert.match(SCENE, /const byWall = new Map\(\)/, 'runs are grouped by the wall they stand on');
  assert.match(SCENE, /\.filter\(\(r\) => r\.bounds\)/, 'a wall with no cabinets yields no band');
  assert.match(SCENE, /bands\.map\(\(b\) => \(/, 'and each run gets its own light');
  assert.match(SCENE, /rectAreaLight/, 'an AREA source — the point lights were the fault');
  assert.match(SCENE, /ccLight: 'band'/, 'tagged by role like every other lamp in the rig');
});

test('the band lies ALONG its run, and faces down', () => {
  assert.match(SCENE, /const alongX = width >= depth/,
    'whichever way the cabinets are longer is the way the tube hangs');
  assert.match(SCENE, /rotation=\{\[-Math\.PI \/ 2, 0, b\.alongX \? 0 : Math\.PI \/ 2\]\}/,
    'turned to face the floor, and turned again when the run runs the other way');
});

test('the key light is untouched — an area source casts no shadow', () => {
  assert.match(SCENE, /ccLight: 'key'/, 'the shadow-caster is still there');
  assert.match(SCENE, /castShadow/, 'and still casting');
});

// ══ the labels ═════════════════════════════════════════════════════════════

// The law, lifted out of the file so the arithmetic can be checked here: this
// is the same expression `halfWay` computes.
const REF = 3;
const MIN = 0.55;
const MAX = 1.8;
const halfWay = (d) => Math.min(MAX, Math.max(MIN, Math.sqrt(REF / Math.max(1e-3, d))));

test('a label shrinks HALF as fast as the world — not all, not none', () => {
  // `useScreenScale` computes `pxHeight × halfWay(d) × worldPerPixel(d)`, and
  // `worldPerPixel` is itself ∝ d. So the WORLD size is ∝ halfWay(d)·d and the
  // SCREEN size — world size divided by worldPerPixel again — is exactly
  // `halfWay(d)`, i.e. ∝ 1/√d. That is the number to check.
  const ratio = halfWay(2 * REF) / halfWay(REF);
  assert.ok(ratio > 0.6 && ratio < 0.8,
    `double the distance keeps about 70 % of the size — got ${ratio.toFixed(3)}`);
  assert.ok(ratio < 1, 'it DOES shrink — T48 pinned it and the captions collided');
  assert.ok(ratio > 0.5, 'but not the whole way, which is what it did before T48');
  // √2 exactly, which is what "half the fall-off" means in one number.
  assert.ok(Math.abs(ratio - 1 / Math.sqrt(2)) < 1e-9,
    'the ratio is 1/√2 — the perspective ratio would be 1/2, T48 gave 1');
});

test('at the reference depth the correction is neutral', () => {
  assert.equal(halfWay(REF), 1, 'so every caption size the owner tuned lands where he put it');
});

test('both ends are clamped — no specks far away, no banners up close', () => {
  assert.equal(halfWay(1000), MIN, 'a very far label stops shrinking');
  assert.equal(halfWay(0.001), MAX, 'and a very near one stops growing');
  assert.match(LABEL, /const MIN_FACTOR/);
  assert.match(LABEL, /const MAX_FACTOR/);
});

test('the law lives in DimLabel, where every consumer inherits it', () => {
  assert.match(LABEL, /function halfWay\(depth\)/, 'one function');
  assert.match(LABEL, /pxHeight \* halfWay\(depth\) \* worldPerPixel/,
    'applied in the one place the size is decided');
});
