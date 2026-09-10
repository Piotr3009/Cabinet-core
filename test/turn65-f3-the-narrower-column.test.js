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

// ─── FINISHED BY T66 F11 ────────────────────────────────────────────────────
//
// The owner asked for TWENTY per cent originally and T65 took ten on his *"na
// początek"*. Tonight the other ten comes off the SAME base — 421 × 0.8 =
// 336.8 → 337 — so the arithmetic this test guards is one line different and
// the law is the same law: the base is a fraction of T64's measured 421, taken
// to the millimetre, and the space goes to the STAGE.
test('F3 · the OPTIONS base is twenty per cent off T64\'s, to the millimetre', () => {
  const scale = read('src/retail/styles/scale.css');
  const now = base(scale, '--pbi-col-options');
  assert.equal(now, 337, `the base is ${now}`);
  // 421 was T64's measured base; 421 × 0.8 = 336.8 → 337.
  assert.equal(now, Math.round(421 * 0.8));
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
  assert.match(scale, /--pbi-col-options: calc\(337 \* var\(--pbi-scale\)\);/);
  assert.match(scale, /--pbi-scale: clamp\(0\.78px, calc\(0\.78px \+ \(100vw - 1280px\) \* 0\.00017\), 1px\);/);
  // At the two widths F3 names.
  assert.equal(Math.round(337 * scaleAt(1280)), 263);
  assert.equal(Math.round(337 * scaleAt(1440)), 272);
  // …which is twenty per cent narrower at both (T66 F11's second ten).
  for (const w of [1280, 1440]) {
    const was = 421 * scaleAt(w);
    const now = 337 * scaleAt(w);
    assert.ok(Math.abs((now / was) - 0.8) < 0.002, `${w}: ${now / was}`);
  }
});

test('F3 · the copies\' markup is untouched — only the sheet could ever have changed', () => {
  // F3's escape hatch was *"fix the copy's own `pbi-re-*` widths — never the
  // copy's markup"*. At 379 it was not needed.
  //
  // ─── AND AT 337 IT WAS ─────────────────────────────────────────────────
  // T66 F11's measure found the copied CHOSEN TILE crushing EGGER's mandatory
  // attribution to a 17-px ellipsis and the source strip breaking "EGGER
  // decor" over three lines. Both were fixed exactly where the escape hatch
  // says — in the WIDTHS, as two rules in `room.css` scoped to the options
  // column — and the MARKUP is still untouched, which is what this test has
  // always been for and is asserted below.
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
  // ─── T66 F11 · AND THE MEASURE WAS PUT RIGHT ───────────────────────────
  // T65's probe divided an element's BOX height by its line height, which
  // counts an element's own padding as a second line — it reported a one-line
  // button as two, and (worse) reported an empty column as clean because the
  // room had never finished loading. T66's serves the silent showroom and
  // counts lines with a Range's own client rects, which is what the browser
  // actually laid out. Both scripts are committed; the new one is the one F11
  // was measured with, and its output is in `verify/t66/`.
  const t66 = read('scripts/t66-f11-measure.mjs');
  assert.match(t66, /startFixtureServer/, 'the measure does not serve the silent showroom');
  assert.match(t66, /range\.getClientRects\(\)\.length/, 'the line count is still the padding-inflated one');
  assert.match(t66, /for \(const width of WIDTHS\)/);
});
