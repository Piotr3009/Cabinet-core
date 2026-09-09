// ─── TURN 65 · F2 — THE WHOLE LIGHTING RIG, NOT JUST THE SLIDER ─────────────
//
// The owner: *"retail jest za jasna … zapomniałeś o natężeniu naświetlenia —
// kopia identycznie jak w PRO, włącznie z ustawieniem jasności etc."*
//
// CLAUDE.md F2: *"A test that asserts, number by number, that the retail rig
// equals PRO's. That test is the thing that stops this drifting again."*
//
// It asserts three things, in this order: every number is the same; there is
// only ONE place any of them could come from; and the client can now reach the
// one input that a joiner always could.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { brightnessScale } from '../src/engine/lighting.js';
import { rows, retailWritesNothing } from '../scripts/t65-light-rig.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

// ═══ 1 · NUMBER BY NUMBER ═══════════════════════════════════════════════════

test('F2 · every lighting number retail resolves equals PRO\'s — row by row', () => {
  const list = rows();
  assert.ok(list.length >= 30, `the walk found only ${list.length} numbers`);
  for (const r of list) {
    assert.equal(r.retail, r.pro, `${r.what} differs: PRO ${r.pro} vs retail ${r.retail} (${r.source})`);
    assert.equal(r.same, true, `${r.what} is marked different`);
  }
});

test('F2 · the eleven the owner named are all in the table, and baseGain is his own 0.75', () => {
  const by = new Map(rows().map((r) => [r.what, r]));
  for (const name of [
    'baseGain', 'ambient', 'key', 'fill', 'rim', 'exposure (tone mapping)',
    'shadowPadding', 'band.intensity', 'spotsOn', 'environment.intensity',
    'brightness (default)',
  ]) {
    assert.ok(by.has(name), `the walk missed ${name}`);
  }
  // The owner's own decision of 25.08.2026, quoted in the profile: *"teraz 100
  // to niech będzie jakby teraz było 75"*.
  assert.equal(P.appearance.studio.baseGain, 0.75, 'the owner\'s baseGain moved');
  assert.equal(by.get('baseGain').retail, '0.75');
});

// ═══ 2 · THERE IS ONLY ONE SOURCE ══════════════════════════════════════════

test('F2 · one Scene, one profile — retail declares no lighting number of its own', () => {
  // `Scene.jsx` reads the rig straight off the shared profile; a retail copy
  // of this line is what "drift" would look like.
  assert.ok(/const studio = profile\.appearance\.studio;/.test(code('src/3d/Scene.jsx')),
    'Scene no longer reads the rig from the profile');
  const writers = retailWritesNothing();
  assert.deepEqual(writers, [], `retail writes a lighting number in: ${writers.join(', ')}`);
});

test('F2 · the environment probe is the neutral RoomEnvironment in both — no HDRI, and not "improved"', () => {
  const scene = code('src/3d/Scene.jsx');
  assert.ok(/new RoomEnvironment\(\)/.test(scene), 'the neutral probe went');
  assert.ok(!/RGBELoader|\.hdr\b|EquirectangularReflectionMapping/.test(scene),
    'an HDRI probe was added — a tinted probe shifts white fronts (the profile says why)');
});

// ═══ 3 · THE ONE INPUT THE CLIENT COULD NOT REACH ══════════════════════════

test('F2 · PRO\'s BRIGHT slider is on the retail bar — same store, same setter, same three numbers', () => {
  const retail = read('src/retail/design/ViewBar.jsx');
  const pro = read('src/components/TopBar.jsx');
  // The same control, by the marker PRO's own label carries.
  assert.ok(/data-brightness-control="1"/.test(pro), 'PRO lost its slider');
  assert.ok(/data-brightness-control="1"/.test(retail), 'retail has no BRIGHT slider');
  // The same STATE and the same SETTER — not a retail mirror of the value.
  assert.ok(/useUiStore\(\(s\) => s\.brightness\)/.test(retail), 'retail reads some other value');
  assert.ok(/useUiStore\(\(s\) => s\.setBrightness\)/.test(retail), 'retail writes through some other setter');
  // The same three numbers, out of the same profile block, in both files.
  for (const key of ['min', 'max', 'step']) {
    assert.ok(new RegExp(`brightness\\.${key}`).test(pro), `PRO stopped reading brightness.${key}`);
    assert.ok(new RegExp(`B\\.${key}|brightness\\.${key}`).test(retail), `retail hard-codes brightness ${key}`);
  }
  // It is a RANGE input in both: T62's no-slider law is about dimensions.
  assert.ok(/type="range"/.test(retail), 'the copy is not a slider');
});

test('F2 · the slider is bounded by the profile, and "nothing said" is the profile default', () => {
  const B = P.appearance.studio.brightness;
  assert.equal(brightnessScale(undefined, P), B.default, 'an unset value is not the default');
  assert.equal(brightnessScale(99, P), B.max, 'the slider is not clamped at the top');
  assert.equal(brightnessScale(0, P), B.min, 'the slider is not clamped at the bottom');
  // …and the retail mount is why the client needed the control: persistence is
  // off there, so the value resolves to the default on every single load.
  assert.ok(/setPersistence\('none'\)/.test(code('src/retail/main-retail.jsx')),
    'the retail mount no longer runs without persistence');
});
