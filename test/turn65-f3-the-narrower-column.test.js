// ─── TURN 65 · F3 — COLUMN 2, TEN PER CENT NARROWER ─────────────────────────
//
// The owner: *"może na początek 10 procent zrób"*. OPTIONS gives the space back
// to the STAGE, which is the thing the client came to look at.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** The scale law, as `scale.css` states it: one number off the window width. */
const scaleAt = (w) => Math.min(1, 0.78 + (w - 1280) * 0.00017);
/** The LAST declaration of a token wins — layout B overrides layout A. */
const base = (css, name) => Number(
  (css.match(new RegExp(`${name}: calc\\((\\d+) \\* var\\(--pbi-scale\\)\\);(?![\\s\\S]*${name}: calc)`)) || [])[1],
);

test('F3 · the OPTIONS base is ten per cent off T64\'s, to the millimetre', () => {
  const scale = read('src/retail/styles/scale.css');
  const now = base(scale, '--pbi-col-options');
  assert.equal(now, 379, `the base is ${now}`);
  // 421 was T64's measured base; 421 × 0.9 = 378.9 → 379.
  assert.equal(now, Math.round(421 * 0.9));
});

test('F3 · …and the other two columns did NOT move — the space goes to the stage', () => {
  const scale = read('src/retail/styles/scale.css');
  assert.equal(base(scale, '--pbi-col-categories'), 89, 'the rail moved');
  assert.equal(base(scale, '--pbi-col-detail'), 446, 'the detail panel moved');
});

test('F3 · the scale law still governs — a base times one number, not a new mechanism', () => {
  const scale = read('src/retail/styles/scale.css');
  // The width is still `calc(<base> * var(--pbi-scale))`, like every other
  // dimension in this file. No media query, no second formula.
  assert.match(scale, /--pbi-col-options: calc\(379 \* var\(--pbi-scale\)\);/);
  assert.match(scale, /--pbi-scale: clamp\(0\.78px, calc\(0\.78px \+ \(100vw - 1280px\) \* 0\.00017\), 1px\);/);
  // At the two widths F3 names.
  assert.equal(Math.round(379 * scaleAt(1280)), 296);
  assert.equal(Math.round(379 * scaleAt(1440)), 306);
  // …which is ten per cent narrower at both.
  for (const w of [1280, 1440]) {
    const was = 421 * scaleAt(w);
    const now = 379 * scaleAt(w);
    assert.ok(Math.abs((now / was) - 0.9) < 0.002, `${w}: ${now / was}`);
  }
});

test('F3 · the copies\' markup is untouched — only the sheet could ever have changed', () => {
  // F3's escape hatch was *"fix the copy's own `pbi-re-*` widths — never the
  // copy's markup"*. It was not needed: the walk measured every label in both
  // copies at 1280 and at 1440 and found no clip and no word-by-word break, so
  // neither file was touched at all. That is asserted here rather than trusted:
  // the copies are held byte-for-byte to their originals by the fidelity test,
  // and this is the same claim said where F3 will be read.
  for (const [pro, retail] of [
    ['src/components/MaterialChoicePanel.jsx', 'src/retail/design/material/MaterialChoicePanel.jsx'],
    ['src/components/FrontStyleGallery.jsx', 'src/retail/design/material/FrontStyleGallery.jsx'],
  ]) {
    const lines = (t) => t.replace(/\n$/, '').split('\n').length;
    assert.equal(lines(read(retail)), lines(read(pro)), `${retail} is no longer the same shape as its original`);
  }
});

test('F3 · the walk measures it in a browser, and the script is committed', () => {
  const walk = read('scripts/t65-walk.mjs');
  assert.match(walk, /OPTIONS at \$\{width\} is the new base/, 'the walk does not measure the column');
  assert.match(walk, /for \(const width of \[1280, 1440\]\)/, 'the walk does not measure at both widths');
  const measure = read('scripts/t65-f3-measure.mjs');
  assert.match(measure, /scrollWidth > el\.clientWidth/, 'nothing measures a clip');
  assert.match(measure, /wordByWord/, 'nothing measures a word-by-word break');
});
