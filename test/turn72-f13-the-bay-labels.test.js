// ─── TURN 72 · F13 — THE BAY WIDTH LABELS: THIN AND BLACK ───────────────────
//
// The owner, 22.09.2026, thirteenth of fourteen:
//
//   *"te napisy zostaw jak są; chodziło mi o napisy pomiędzy vertical
//   przegrodami, są teraz białe i gruba czcionka; to tylko zmień."*
//
// CLAUDE.md F13: *"Only the hover bay-width labels (`HoverDimensions.jsx`, the
// `hoverDimensions.label` block: plate `#1c1c1a`, ink `#e8e4dc`) change: no
// plate, black ink, the light weight kept. Every other dimension label on the
// scene stays exactly as it is. Profile numbers only; the migration keeps a
// saved profile's other keys."*
//
// WHAT WAS ACTUALLY ON HIS SCREEN. The bay chain has carried no dark plate
// since the chat fix of 15.08 — it passes `labelGround: 'bare'`. What `bare`
// draws instead is a WHITE HALO round every glyph, `max(4, 16% of the type)`
// wide, under an ink that is itself near-white (`#e8e4dc`). That halo is both
// halves of his sentence: it is the white, and it is what makes a 300-weight
// cut read as a heavy one. So "no plate" here means no ground of any kind —
// plate and halo both — and the ink goes black. The WEIGHT is not touched.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { dimensionStyle } from '../src/engine/dimensionArrows.js';

const src = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');
const hover = src('3d/HoverDimensions.jsx');
/** The file with its prose taken off: this turn argues in comments, and a
 *  comment that names a key is not a second caller of it. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const chain = src('3d/DimensionChain.jsx');

const luma = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  // eslint-disable-next-line no-bitwise
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

/** The style the VPART branch of `HoverDimensions` hands to the ONE chain. */
function bayStyle(profile = P) {
  const style = dimensionStyle(profile);
  return { ...style, labelGround: 'bare', labelInk: style.labelBayInk, labelHalo: style.labelBayHalo };
}

// ─── THE TWO NUMBERS ARE IN THE PROFILE ─────────────────────────────────────

test('F13 the bay label is a profile number, not a hex in a component', () => {
  const label = P.hoverDimensions.label;
  assert.equal(label.bayInk, '#101010', 'black ink for the widths between partitions');
  assert.equal(label.bayHaloAlpha, 0, 'and no ground of any kind behind them');
  // "the light weight kept" — F13 names the one thing that does NOT move.
  assert.equal(label.weight, 300);
});

test('F13 `dimensionStyle` reads both of them through, like every other number', () => {
  const style = dimensionStyle(P);
  assert.equal(style.labelBayInk, P.hoverDimensions.label.bayInk);
  assert.equal(style.labelBayHalo, P.hoverDimensions.label.bayHaloAlpha);
  // A workshop that wants a different black changes a value, not a component.
  const mine = migrateCabinetProfile({
    ...P,
    hoverDimensions: { ...P.hoverDimensions, label: { ...P.hoverDimensions.label, bayInk: '#202020' } },
  });
  assert.equal(dimensionStyle(mine).labelBayInk, '#202020');
});

test('F13 the migration keeps a saved profile’s other keys', () => {
  // A job saved before tonight: it names two of the label's keys and knows
  // nothing about the bay. It opens with its own two intact and the new pair
  // filled in from the defaults — *"the migration keeps a saved profile's
  // other keys"*.
  const saved = migrateCabinetProfile({
    ...P,
    hoverDimensions: { ...P.hoverDimensions, label: { plate: '#101820', weight: 500 } },
  });
  assert.equal(saved.hoverDimensions.label.plate, '#101820', 'his plate survives');
  assert.equal(saved.hoverDimensions.label.weight, 500, '…and his weight');
  assert.equal(saved.hoverDimensions.label.ink, P.hoverDimensions.label.ink, 'the untouched keys come from the defaults');
  assert.equal(saved.hoverDimensions.label.bayInk, '#101010');
  assert.equal(saved.hoverDimensions.label.bayHaloAlpha, 0);
});

// ─── NO PLATE, BLACK INK, THE LIGHT WEIGHT KEPT ─────────────────────────────

test('F13 the bay label has no plate', () => {
  const style = bayStyle();
  // Two grounds, and the caption wears neither: the dark plate is off because
  // the ground is `bare` (15.08), and the white halo is off because its
  // opacity is zero (tonight). `DimensionChain` draws a ground only when one
  // of those two says so, so this pair IS "no plate" as a fact.
  assert.equal(style.labelGround, 'bare', 'no dark plate');
  assert.equal(style.labelHalo, 0, 'and no white halo either');
  assert.match(chain, /const haloed = bare && halo > 0;/, 'the halo is drawn only when it is asked for');
  assert.match(chain, /if \(haloed\) c\.strokeText\(ch,/, '…and the stroke itself is gated on the same answer');
  assert.match(chain, /const halo = Number\.isFinite\(Number\(style\.labelHalo\)\)/, 'the opacity is the style’s, not a literal');
  assert.doesNotMatch(chain, /rgba\(255,255,255,0\.9\)/, 'the 0.9 literal is gone — it is a profile number now');
});

test('F13 the bay label is black, and still the light cut', () => {
  const style = bayStyle();
  assert.ok(luma(style.labelInk) < 0.1, `the figures print black (luma ${luma(style.labelInk).toFixed(3)})`);
  assert.equal(style.labelWeight, 300, 'the weight he did not ask about does not move');
  assert.equal(style.labelPixels, dimensionStyle(P).labelPixels, 'nor the size');
  assert.equal(style.labelHeight, dimensionStyle(P).labelHeight);
});

// ─── AND NOTHING ELSE ON THE SCENE MOVES ────────────────────────────────────

test('F13 every other dimension label stays exactly as it is', () => {
  const style = dimensionStyle(P);
  // Turn 27's palette, untouched: the standing chains and the PDF.
  assert.equal(style.labelPlate, '#1c1c1a');
  assert.equal(style.labelInk, '#e8e4dc');
  assert.equal(style.labelAlpha, 0.9);
  // …and the halo every OTHER bare caption has worn since 15.08 is the same
  // 0.9 that used to be the literal in the component.
  assert.equal(style.labelHalo, 0.9);
  // The aura's own bare captions ask for nothing but the ground.
  assert.match(src('3d/Hardware.jsx'), /labelGround: 'bare'/);
  assert.doesNotMatch(code(src('3d/Hardware.jsx')), /labelBayInk|labelHalo/);
});

test('F13 only the VPART branch is repainted', () => {
  // The bay flag is set where the bay gaps are built, and nowhere else.
  assert.equal((code(hover).match(/bay: true/g) || []).length, 1);
  assert.match(hover, /return \{ rows, z, mid: y, own, bay: true \};/);
  // The piece rows (a shelf's clear gaps, a side's interior — turn 25) return
  // WITHOUT it, so they fall to the plain `bare` ground they already had.
  const pieceReturn = hover.slice(hover.indexOf('const set = pieceHoverRows'), hover.indexOf('// What a bay is bounded BY'));
  assert.doesNotMatch(pieceReturn, /bay/);
  // One place decides, and it decides on that flag alone.
  assert.match(
    hover,
    /const ground = drawing\.bay\s*\?\s*\{ labelGround: 'bare', labelInk: style\.labelBayInk, labelHalo: style\.labelBayHalo \}\s*:\s*\{ labelGround: 'bare' \};/,
  );
  assert.equal((code(hover).match(/labelBayInk/g) || []).length, 1, 'one caller reads the bay ink');
  // R11 holds: this component still hands its rows to the ONE chain.
  assert.equal((hover.match(/<DimensionChain/g) || []).length, 1);
  assert.match(hover, /style=\{\{ \.\.\.style, \.\.\.ground \}\}/);
});
