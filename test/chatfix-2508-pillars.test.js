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
  for (const k of ['intensity', 'colour', 'widthMm', 'forwardMm', 'outsetMm']) {
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

test('TWO per run, one past each end — the owner\'s count', () => {
  assert.match(SCENE, /for \(const side of \[-1, 1\]\)/, 'one at each end of the run');
  assert.match(SCENE, /outsetMm \?\? 200/, 'stepped out past the last cabinet');
  assert.match(SCENE, /ccLight: 'pillar'/, 'tagged by role like every other lamp');
  assert.match(SCENE, /rectAreaLight/, 'an AREA source — a point is what printed the circles');
});

test('floor to ceiling, and centred on that height', () => {
  assert.match(SCENE, /const height = roomHeight > 0 \? roomHeight : mm\(2700\)/,
    'the room\'s own height, with a fallback for a room that has none');
  assert.match(SCENE, /height \/ 2/, 'a slab is positioned at its centre, so half the height');
});

test('they FACE the fronts, and turn with the run', () => {
  assert.match(SCENE, /rotation=\{\[0, p\.alongX \? Math\.PI : -Math\.PI \/ 2, 0\]\}/,
    'a half turn for a run along x, a quarter for one along z');
  assert.match(SCENE, /bounds\.max\[2\] \+ forward/, 'stood off the fronts, not behind them');
});

test('the bands and the key light are untouched by this fix', () => {
  assert.match(SCENE, /ccLight: 'band'/, 'the overhead bands stay — they carry the spread');
  assert.match(SCENE, /ccLight: 'key'/, 'and the key still casts the shadows');
});
