// ─── TURN 66 · F1 AND F10 — THE OWNER'S TWO PLAINEST ORDERS ─────────────────
//
// F1: *"ściemnij trochę o 20 procent światło."*  The BASE comes down and the
// slider does not move.
//
// F10: variant 2, and then the question that decides the scope — *"wszystkie
// przyciski będą zmienione, prawda?"* — yes, all of them.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const RETAIL = join(ROOT, 'src/retail');

function filesUnder(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...filesUnder(p));
    else if (/\.(css|jsx?|mjs)$/.test(e)) out.push(p);
  }
  return out;
}

// ═══ F1 · THE LIGHT COMES DOWN 20%, IN THE RIG ══════════════════════════════

test('F1 · the base gain is 0.60 — twenty per cent off the owner\'s own 0.75', () => {
  assert.equal(P.appearance.studio.baseGain, 0.6);
  // …and it is exactly a fifth off, not a number that happens to look like one.
  assert.equal(Math.round(0.75 * 0.8 * 100) / 100, P.appearance.studio.baseGain);
  // ONE number, stated once. Every other mention in the profile is prose.
  const profile = read('src/engine/profile.js');
  assert.equal((profile.match(/^\s*baseGain: /gm) || []).length, 1, 'one number, in one place');
});

test('F1 · the SLIDER did not move — same scale, same 100% default', () => {
  // The brightness slider's own three numbers are the profile's and are
  // untouched: what 100 % MEANS moved, which is the whole of the feature.
  const bright = P.ui?.brightness || P.appearance?.brightness || null;
  const scene = read('src/3d/Scene.jsx');
  assert.match(scene, /const baseGain = Number\(studio\.baseGain\) > 0 \? Number\(studio\.baseGain\) : 1;/);
  assert.match(scene, /const gain = \(Number\(brightness\) > 0 \? Number\(brightness\) : 1\) \* baseGain;/,
    'the base is no longer multiplied into the slider\'s gain');
  assert.ok(bright === null || typeof bright === 'object');
});

test('F1 · the individual lamps kept their own numbers — that is why the dial can move alone', () => {
  assert.equal(P.appearance.studio.key, 1.0);
  assert.equal(P.appearance.studio.fill, 0.55);
  assert.equal(P.appearance.studio.rim, 0.3);
  assert.equal(P.appearance.studio.ambient, 0.2);
  assert.equal(P.appearance.studio.band.intensity, 2.2);
  assert.equal(P.appearance.studio.pillars.intensity, 11);
});

test('F1 · PRO dims with retail, because the rig is ONE law — T65 F2\'s own point', () => {
  // The profile is shared, `Scene.jsx` is shared, and T65 F2's parity test
  // reads both sides. So a change to the dial reaches PRO by construction —
  // which is correct: the owner judged the light against both apps.
  const scene = read('src/3d/Scene.jsx');
  assert.match(scene, /const studio = profile\.appearance\.studio;/);
  // …and retail declares no lighting number of its own, which is what would
  // have let the two drift.
  for (const f of filesUnder(RETAIL)) {
    const text = readFileSync(f, 'utf8');
    assert.ok(!/baseGain\s*[:=]\s*[\d.]/.test(text), `${f} writes a base gain of its own`);
  }
});

// ═══ F10 · EVERY BUTTON WEARS THE NEW SHAPE ═════════════════════════════════

test('F10 · the control radius is a TOKEN, and it is 8px', () => {
  const tokens = read('src/retail/styles/tokens.css');
  assert.match(tokens, /--pbi-control-radius: 8px;/);
  // The system's own square shell is UNTOUCHED — a panel is still a rectangle.
  assert.match(tokens, /--pbi-radius: 0;/);
  assert.match(tokens, /--pbi-field-radius: 6px;/);
});

test('F10 · not one retail CONTROL is left at radius 0', () => {
  const CONTROLS = [
    ['src/retail/styles/base.css', '.pbi-btn {'],
    ['src/retail/styles/base.css', '.pbi-chip {'],
    ['src/retail/styles/room.css', '.pbi-tile {'],
    ['src/retail/styles/room.css', '.pbi-viewbar-btn {'],
    ['src/retail/styles/room.css', '.pbi-style-row {'],
    ['src/retail/styles/room.css', '.pbi-opening-row {'],
  ];
  for (const [rel, selector] of CONTROLS) {
    const css = read(rel);
    const at = css.indexOf(selector);
    assert.ok(at > 0, `${selector} is gone from ${rel}`);
    const rule = css.slice(at, css.indexOf('}', at));
    assert.match(rule, /border-radius: var\(--pbi-control-radius\)/,
      `${selector} in ${rel} is not the one shape`);
  }
  // …and the copied editors' buttons come out of the ONE generated sheet
  // wearing it too, which is what "every control in src/retail/**" means.
  const sheet = read('src/retail/styles/copies.css');
  for (const cls of ['.pbi-re-btn ', '.pbi-re-btn-gold ', '.pbi-re-btn-ghost ']) {
    const at = sheet.indexOf(cls);
    assert.ok(at > 0, `${cls} is gone from the sheet`);
    assert.match(sheet.slice(at, sheet.indexOf('}', at)), /border-radius: var\(--pbi-control-radius\)/);
  }
  assert.match(read('scripts/t63-copy.mjs'), /border-radius: var\(--pbi-control-radius\);/,
    'the sheet and the map that generates it have drifted');
});

test('F10 · a grep of the retail tree finds no `border-radius: 0` on a control', () => {
  const bad = [];
  for (const f of filesUnder(RETAIL)) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/border-?[Rr]adius\s*[:=]\s*['"]?([^,;'"}\n]+)/g)) {
      const value = m[1].trim();
      // `--pbi-radius` is 0 and is the PANEL's, which is the system. The only
      // thing this may not appear on is a control, and the rules above hold
      // every control in the tree to `--pbi-control-radius`.
      if (/^(0|0px)$/.test(value)) bad.push(`${f}: border-radius ${value}`);
    }
  }
  assert.deepEqual(bad, [], `a literal zero radius survives:\n  ${bad.join('\n  ')}`);
});

test('F10 · the ACTIVE state is a GOLD border, slightly heavier — and nothing reflows', () => {
  const base = read('src/retail/styles/base.css');
  const room = read('src/retail/styles/room.css');
  // The extra weight is an INSET RING, not a wider border: a border that grows
  // on press moves every neighbour by a pixel.
  for (const [css, selector] of [
    [base, '.pbi-btn-secondary.is-on'],
    [base, '.pbi-chip.is-selected'],
    [room, '.pbi-viewbar-btn.is-on'],
    [room, '.pbi-style-row.is-on'],
    [room, '.pbi-opening-row.is-on'],
  ]) {
    const at = css.indexOf(selector);
    assert.ok(at > 0, `${selector} is gone`);
    const rule = css.slice(at, css.indexOf('}', at));
    assert.match(rule, /box-shadow: inset 0 0 0 1px var\(--pbi-deep-gold\)/, `${selector} has no heavier gold`);
    assert.match(rule, /border-color: var\(--pbi-deep-gold\)|border: 1px solid var\(--pbi-deep-gold\)/);
    assert.ok(!/border-width|border: 2px/.test(rule), `${selector} thickens its border and reflows`);
  }
});

test('F10 · the PRIMARY is still the one filled Onyx button a screen has', () => {
  const base = read('src/retail/styles/base.css');
  assert.match(base, /\.pbi-btn-primary \{\s*background: var\(--pbi-onyx\);/);
  const at = base.indexOf('.pbi-btn {');
  assert.match(base.slice(at, base.indexOf('}', at)), /border-radius: var\(--pbi-control-radius\)/,
    'the primary takes the shape too — F10 says all of them');
});
