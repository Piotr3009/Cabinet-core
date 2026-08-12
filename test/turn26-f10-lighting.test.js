// ─── TURN 26 · F10 — THE LIGHT COMES FROM THE CEILING ───────────────────────
//
// The owner's proposal, and his constraint in the same breath:
//
//   F10.1  "One broad ceiling source at real ceiling height above the tall
//          units, set back 1.5 m from the fronts, medium intensity."
//   F10.2  "**Whatever is added above is subtracted from the facing spots** —
//          the scene's total luminous contribution stays as it is today.
//          Compute it, do not eyeball it, and put the before/after sum in
//          `verify/t26/lighting.md`."
//   F10.3  "A brightness slider in the View menu scales every source
//          proportionally, state remembered."
//
// "Compute it, do not eyeball it" is what makes this a test rather than a
// screenshot. `engine/lighting.js` converts every lamp in the rig to ONE
// comparable quantity — irradiance at the point the whole rig is aimed at — and
// the identity below holds to six decimals at any room size and any camera fit.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import {
  balanceRig, brightnessScale, ceilingPosition, distanceBetween, irradianceAt, luminousSum,
  rigPositions,
} from '../src/engine/lighting.js';

const S = P.appearance.studio;
const read = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

/** A scene fit, in scene units — a metre is 1. */
const FIT = {
  centre: [0, 1.1, 0.3],
  distance: 3.9,
  frontZ: 0.9,
  ceilingY: 2.7,
  setback: 1.5,
};

const rig = (extra = {}) => balanceRig({ studio: S, ...FIT, ...extra });

// ─── F10.1 — WHERE IT HANGS ─────────────────────────────────────────────────

test('F10.1 — it is at the CEILING, set back 1.5 m from the fronts', () => {
  assert.equal(S.ceiling.enabled, true);
  assert.equal(S.ceiling.setbackMm, 1500, 'the owner’s own number');
  const at = ceilingPosition(FIT);
  assert.equal(at[1], FIT.ceilingY, 'at real ceiling height');
  assert.equal(at[2], FIT.frontZ - FIT.setback, '…and a metre and a half back from the fronts');
  assert.equal(at[0], FIT.centre[0], 'over the middle of what the rig is aimed at');
  // It is BEHIND the fronts, which is what "above the tall units" means: the
  // light comes down the face rather than up it.
  assert.ok(at[2] < FIT.frontZ);
});

test('F10.1 — it is BROAD: a wide cone, mostly penumbra', () => {
  // Tighter than this and it is a downlight; wider and it stops having a
  // direction at all and might as well be the ambient it is taking over from.
  assert.ok(S.ceiling.angle > 1, `${S.ceiling.angle} rad`);
  assert.ok(S.ceiling.penumbra >= 0.85, `${S.ceiling.penumbra}`);
  // …and WIDER than the jupiters it is balanced against, or it is a third spot.
  for (const s of S.spots) assert.ok(S.ceiling.angle > s.angle, 'broader than a jupiter');
});

test('F10.1 — its INTENSITY is derived, not typed: there is no candela in the profile', () => {
  // "Medium intensity" is a judgement, and the honest way to ship one is as a
  // fraction of something real. A number here would be a second answer to a
  // question `share` has already answered.
  assert.equal(S.ceiling.intensity, undefined);
  assert.equal(S.ceiling.share, 0.35);
  const balance = rig();
  assert.ok(balance.ceiling.intensity > 0, `${balance.ceiling.intensity}`);
  // It really is the candela that delivers the share from where it hangs.
  const d = distanceBetween(balance.ceiling.position, FIT.centre);
  const pos = rigPositions(S, FIT);
  const spotSum = S.spots.reduce((n, s, i) => n + irradianceAt(s.intensity, distanceBetween(pos.spots[i], FIT.centre)), 0);
  assert.ok(Math.abs(irradianceAt(balance.ceiling.intensity, d) - S.ceiling.share * spotSum) < 1e-9);
});

// ─── F10.2 — THE SUM DOES NOT MOVE ──────────────────────────────────────────

test('F10.2 — the total luminous contribution is EXACTLY what it was', () => {
  const balance = rig();
  assert.equal(balance.enabled, true);
  assert.ok(balance.before > 0, `${balance.before}`);
  assert.ok(Math.abs(balance.drift) < 1e-6, `drift ${balance.drift}`);
  assert.ok(Math.abs(balance.after - balance.before) < 1e-6);
  // …and it is a real subtraction: the jupiters ARE turned down.
  assert.equal(balance.spotScale, 1 - S.ceiling.share);
  assert.ok(balance.spotScale < 1 && balance.spotScale > 0, `${balance.spotScale}`);
});

test('F10.2 — and it holds at ANY room size and any camera fit', () => {
  // The identity is by construction rather than by tuning, so it survives a
  // galley and a six-metre kitchen without anybody re-balancing a candela.
  for (const distance of [1.5, 3.9, 9]) {
    for (const ceilingY of [2.4, 2.7, 3.2]) {
      for (const setback of [0.5, 1.5, 3]) {
        const balance = rig({ distance, ceilingY, setback });
        assert.ok(
          Math.abs(balance.drift) < 1e-6,
          `d=${distance} ceiling=${ceilingY} back=${setback}: drift ${balance.drift}`,
        );
      }
    }
  }
});

test('F10.2 — a rig with NO spots gets no ceiling source: there is nothing to take it from', () => {
  // The constraint, kept the other way round. A workshop that has turned the
  // jupiters off must not get a BRIGHTER room out of this feature.
  const bare = { ...S, spots: [] };
  const balance = balanceRig({ studio: bare, ...FIT });
  assert.equal(balance.enabled, false);
  assert.equal(balance.ceiling, null);
  assert.equal(balance.spotScale, 1);
  assert.equal(balance.after, balance.before);
});

test('F10.2 — the switch is a switch: off, the rig is turn 10’s to the digit', () => {
  const off = migrateCabinetProfile({
    ...P,
    appearance: {
      ...P.appearance,
      studio: { ...S, ceiling: { ...S.ceiling, enabled: false } },
    },
  }).appearance.studio;
  const balance = balanceRig({ studio: off, ...FIT });
  assert.equal(balance.enabled, false);
  assert.equal(balance.spotScale, 1, 'the jupiters keep every candela turn 10 measured');
  assert.equal(balance.after, luminousSum({ studio: off, ...FIT }).total);
});

test('F10.2 — the metric is stated, and it is per source', () => {
  // A single number nobody can check is not a computation. The ledger is per
  // lamp, which is what `verify/t26/lighting.md` prints.
  const { rows, total } = luminousSum({ studio: S, ...FIT });
  const names = rows.map((r) => r.role);
  for (const role of ['ambient', 'hemisphere', 'key', 'fill', 'rim', 'spot-0', 'spot-1']) {
    assert.ok(names.includes(role), `${role} is in the ledger`);
  }
  assert.ok(Math.abs(rows.reduce((n, r) => n + r.at, 0) - total) < 1e-5, 'the rows sum to the total');
  // A DIRECTIONAL's intensity IS its irradiance; a SPOT's falls off with
  // distance squared. Both facts are asserted, because the whole metric rests
  // on them.
  assert.equal(rows.find((r) => r.role === 'key').at, S.key);
  assert.equal(irradianceAt(38, 2), 38 / 4);
  assert.equal(irradianceAt(38, 4), 38 / 16);
});

test('F10.2 — the before/after is written down, in verify/t26/lighting.md', () => {
  const doc = readFileSync(new URL('../verify/t26/lighting.md', import.meta.url), 'utf8');
  const balance = rig();
  assert.match(doc, /before/i);
  assert.match(doc, /after/i);
  assert.ok(doc.includes(balance.before.toFixed(4)), `the before sum ${balance.before.toFixed(4)} is in the document`);
  assert.ok(doc.includes(balance.after.toFixed(4)), 'and the after');
  assert.match(doc, /irradiance at the subject/i, 'the metric is named');
  assert.match(doc, /0\.35/, 'and the share');
});

// ─── F10.3 — THE SLIDER ─────────────────────────────────────────────────────

test('F10.3 — the slider is one multiplier, clamped through the profile', () => {
  assert.deepEqual(S.brightness, {
    min: 0.5, max: 1.5, step: 0.05, default: 1,
  });
  assert.equal(brightnessScale(1, P), 1);
  assert.equal(brightnessScale(0.75, P), 0.75);
  assert.equal(brightnessScale(40, P), 1.5, 'a hand-edited key cannot blow the scene out');
  assert.equal(brightnessScale(-3, P), 0.5);
  assert.equal(brightnessScale('nonsense', P), 1, 'and neither can a corrupt one');
  assert.equal(brightnessScale(null, P), 1);
});

test('F10.3 — it scales EVERY source, so the ratios never move', () => {
  const view = read('3d/Scene.jsx');
  // Every lamp the rig mounts is multiplied by the same `gain`. A slider that
  // touched one of them would be a slider that re-lights the scene.
  for (const lamp of [
    /intensity=\{studio\.ambient \* gain\}/,
    /intensity=\{studio\.hemisphere\.intensity \* gain\}/,
    /intensity=\{studio\.key \* gain\}/,
    /intensity=\{studio\.fill \* gain\}/,
    /intensity=\{studio\.rim \* gain\}/,
    /intensity=\{s\.intensity \* balance\.spotScale \* gain\}/,
    /intensity=\{p\.intensity \* gain\}/,
    /intensity=\{balance\.ceiling\.intensity \* gain\}/,
  ]) assert.match(view, lamp, `a lamp is not scaled: ${lamp}`);
  // …and there is exactly ONE gain in the file.
  assert.equal((view.match(/const gain = /g) || []).length, 1);
});

test('F10.3 — it is in the View menu, and its state is remembered', () => {
  const bar = read('components/TopBar.jsx');
  assert.match(bar, /label: 'Brightness',/);
  assert.match(bar, /slider: \{/);
  assert.match(bar, /run: setBrightness,/);
  // The menu is DATA in this app, so a slider is a KIND of entry rather than a
  // component the View menu had to be rebuilt around.
  const menu = read('components/MenuBar.jsx');
  assert.match(menu, /if \(item\.slider\) return <SliderItem/);
  assert.match(menu, /type="range"/);
  // Remembered, like X-ray and the front dimensions.
  const store = read('stores/uiStore.js');
  assert.match(store, /const BRIGHTNESS_KEY = 'cc\.brightness';/);
  assert.match(store, /brightness: loadBrightness\(\),/);
  assert.match(store, /saveBrightness\(brightnessScale\(v, DEFAULT_CABINET_PROFILE\)\)/);
});

test('F10.3 — and it does not disturb the balance: the sum scales, it does not tilt', () => {
  // Turning the room up is not the same as adding light to one side of it. The
  // ratio between every pair of lamps is invariant under the slider, which is
  // what "proportionally" means and what keeps turn 10's measurements valid.
  const balance = rig();
  const ledger = (gain) => luminousSum({
    studio: {
      ...S,
      ambient: S.ambient * gain,
      key: S.key * gain,
      fill: S.fill * gain,
      rim: S.rim * gain,
      hemisphere: { ...S.hemisphere, intensity: S.hemisphere.intensity * gain },
      spots: S.spots.map((s) => ({ ...s, intensity: s.intensity * balance.spotScale * gain })),
      points: S.points.map((p) => ({ ...p, intensity: p.intensity * gain })),
    },
    ...FIT,
    ceiling: { intensity: balance.ceiling.intensity * gain, position: balance.ceiling.position },
  });
  const one = ledger(1);
  const half = ledger(0.5);
  assert.ok(Math.abs(half.total - one.total * 0.5) < 1e-5, 'the sum scales exactly');
  for (const row of one.rows) {
    const other = half.rows.find((r) => r.role === row.role);
    assert.ok(Math.abs(other.at - row.at * 0.5) < 1e-5, `${row.role} kept its share`);
  }
});
