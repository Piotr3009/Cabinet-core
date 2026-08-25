import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';

// ─── CHAT-FIX 25.08.2026 (evening) — THE PILLARS ────────────────────────────
//
// The morning's fix gassed the SPOTS, and it gassed the wrong lamps: the four
// hot circles on the owner's screenshot were `points` — the eye-level pair at
// 1650 and the low pair at 500, both `decay: 2`. The spots hang high and wash
// downward; the points stand at eye and door height, which is why they printed
// circles on the fronts.
//
// The owner would not have them simply turned off, and he is right:
// *"jak zgasisz dolne to nie bedzie polysku na kuchni."* A specular highlight
// is the MIRROR of its source (T14's own reasoning), so a lamp above the units
// reflects off a vertical door into the FLOOR, not into the eye.
//
// His answer, and it is better than three horizontal tubes:
//
//   *"a jakby zamiast kolek dał od góry do dołu pas światła, coś jak ledy w
//   szafie, ale na ścianie? wtedy będzie widoczne na każdej wysokości."*
//
// A VERTICAL slab spans every eye height at once. Two per run, one past each
// end, floor to ceiling — both his calls — standing IN FRONT of the fronts,
// because a reflection shows what faces the door.

const SCENE = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');

test('the jupiters are back on — the owner: "spoty zaswiecamy spowrotem"', () => {
  assert.equal(P.appearance.studio.spotsOn, true);
  assert.match(SCENE, /if \(studio\.spotsOn === false\) return \[\]/,
    'and the flag stays, so they can be taken out again without hunting');
});

test('the points are OFF and still there — the pillars took their job', () => {
  assert.equal(P.appearance.studio.pointsOn, false, 'dark by default');
  assert.ok(Array.isArray(P.appearance.studio.points) && P.appearance.studio.points.length >= 4,
    'both pairs still in the rig, with the numbers T14 and T16 tuned');
  assert.match(SCENE, /studio\.pointsOn === false \? \[\] : \(studio\.points \|\| \[\]\)/,
    'gated, not deleted');
  assert.match(SCENE, /<pointLight/, 'the element survives for the day he asks');
});

test('the profile carries the pillars, and every number is named', () => {
  const p = P.appearance.studio.pillars;
  assert.ok(p, 'the pillars exist');
  for (const k of ['intensity', 'colour', 'widthMm', 'forwardMm', 'spread', 'count', 'side']) {
    assert.ok(p[k] !== undefined, `${k} is in the profile, not buried in JSX`);
  }
  assert.ok(p.forwardMm > 0, 'they stand IN FRONT of the fronts — a reflection needs facing');
});

test('a stored profile gains the pillars whole; a tuned one keeps its own', () => {
  const stored = { ...P, appearance: { ...P.appearance, studio: { ...P.appearance.studio } } };
  delete stored.appearance.studio.pillars;
  assert.deepEqual(migrateCabinetProfile(stored).appearance.studio.pillars,
    P.appearance.studio.pillars, 'an older profile gains every key');

  const tuned = migrateCabinetProfile({
    ...P,
    appearance: {
      ...P.appearance,
      studio: { ...P.appearance.studio, pillars: { intensity: 9 } },
    },
  });
  assert.equal(tuned.appearance.studio.pillars.intensity, 9, 'a tuned pillar wins');
  assert.equal(tuned.appearance.studio.pillars.widthMm, P.appearance.studio.pillars.widthMm,
    '…and the keys it did not name still arrive');
});

test('ONE per run by default, from the side — the owner\'s correction', () => {
  // The mirrored pair read as decor: *"przez to że są symetryczne wydają się
  // jakby były częścią mebla, a nie są."* A real room reflects from one side.
  assert.equal(P.appearance.studio.pillars.count, 1, 'one, not a mirrored pair');
  assert.equal(P.appearance.studio.pillars.side, 'right', 'and it stands on the right');
  assert.ok(P.appearance.studio.pillars.spread > 1,
    'out PAST the end of the run, toward the side wall — so it fires along the fronts');
  assert.match(SCENE, /const sides = count === 2 \? \[-1, 1\] : \[first\]/,
    'the count is a number, so the pair is one word away');
  assert.match(SCENE, /for \(const side of sides\)/, 'and the loop follows it');
  assert.match(SCENE, /side \* \(width \/ 2\) \* spread/, 'position is a share of the half-length');
  assert.match(SCENE, /rectAreaLight/, 'an AREA source — a point is what printed the circles');
});

test('floor to ceiling, and centred on that height', () => {
  assert.match(SCENE, /const height = roomHeight > 0 \? roomHeight : mm\(2700\)/,
    'the room\'s own height, with a fallback for a room that has none');
  assert.match(SCENE, /height \/ 2/, 'a slab is positioned at its centre, so half the height');
});

test('they AIM across the run, at the far end — not straight out', () => {
  // The owner: *"czy słupy świecą na wprost jak są w rogach, czy pod kątem 45
  // stopni, czyli w kierunku przeciwnego narożnika?"* Straight out is the
  // weakest setting for gloss: FRESNEL means a grazing angle reflects more, so
  // a pillar raking the whole length returns a highlight in every front along
  // it, where a perpendicular one lights its own patch alone.
  //
  // No fixed rotation any more — the angle falls out of the geometry, so a six
  // metre kitchen and a 600 vanity each get their own.
  assert.match(SCENE, /const target = alongX/, 'each pillar has a target');
  assert.match(SCENE, /centre\[0\] - side \* \(width \/ 2\)/,
    'and it is the far END of its own run — not the far pillar');
  assert.ok(!SCENE.includes('rotation={[0, p.alongX ? 0 : Math.PI / 2, 0]}'),
    'the fixed rotation is gone');
  assert.match(SCENE, /light\.lookAt\(target\[0\], target\[1\], target\[2\]\)/,
    'three works the angle out — lookAt turns a LIGHT so its −Z faces the target');
  assert.match(SCENE, /bounds\.max\[2\] \+ forward/, 'stood off the fronts, not behind them');
});

test('the aim is HORIZONTAL — a tilted pillar would light the floor', () => {
  assert.match(SCENE, /\? \[centre\[0\] - side \* \(width \/ 2\), height \/ 2/,
    'the target sits at the pillar\'s own height');
});

test('the pillars run at the scale area lights actually need', () => {
  assert.equal(P.appearance.studio.pillars.intensity, 22,
    'the LED halos read correctly at 22; the first cut guessed 3.2');
});

test('the bands and the key light are untouched by this fix', () => {
  assert.match(SCENE, /ccLight: 'band'/, 'the overhead bands stay — they carry the spread');
  assert.match(SCENE, /ccLight: 'key'/, 'and the key still casts the shadows');
});

// ─── CHAT-FIX 25.08.2026 (late) — THE TABLES THE AREA LIGHTS NEED ───────────
//
// The pillars went in facing the wrong way, that was fixed, and the owner
// still saw nothing: *"dalej nie widzę słupów światła w odbiciu."*
//
// The cause was older than either. A RectAreaLight needs the LTC lookup
// tables, and `RectAreaLightUniformsLib.init()` was called from ONE place —
// inside `LedStrips`, behind `strips.length && lightOn`. That was correct
// when the LED halos were the only area lights in the app. The showroom rig
// added two more kinds and inherited the dependency: a kitchen with no LED in
// it never loaded the tables, so every band and every pillar lit nothing and
// reflected in nothing, with no error anywhere.

const LED = readFileSync(new URL('../src/3d/LedStrips.jsx', import.meta.url), 'utf8');

test('the LTC tables are loadable by anyone who draws an area light', () => {
  assert.match(LED, /export function ensureLtc\(\)/,
    'no longer private to the strips');
  assert.match(LED, /RectAreaLightUniformsLib\.init\(\)/, 'and it is still what loads them');
  assert.match(LED, /let ltcReady = false/, 'once per app, not per light');
});

test('the rig loads them itself the moment it has a band or a pillar', () => {
  assert.match(SCENE, /import \{ ensureLtc \} from '\.\/LedStrips\.jsx'/,
    'the rig asks for them by name');
  assert.match(SCENE, /if \(bands\.length \|\| pillars\.length\) ensureLtc\(\)/,
    'loaded when there is an area light to draw');
  assert.match(SCENE, /\[bands\.length, pillars\.length\]/,
    'and only when that changes — a project with neither pays nothing');
});
