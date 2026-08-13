// ─── TURN 29 F4 — dimension typography: a third bigger, half the weight ─────
//
// The owner, verbatim: *"napisy troszeczkę za małe — jakby były o 30% większe
// ale o połowę mniej tłuste na tych wymiarowaniach wszędzie, to by było
// super."*
//
// ONE PLACE. R11 gives the app one dimension component and it owns every
// caption — chains, ladders, front labels and the live drag readout all draw
// their numbers through `3d/DimensionChain.jsx`, so "everywhere" is a single
// edit and not a sweep. The three numbers live in the profile beside the two
// inks (rule 3: nothing in the view is a bare number), and this file asserts
// the RATIOS rather than the values, because what the owner asked for is a
// relationship to what was there before.
//
// Nothing else about the plate changes: same dark ground, same ink, same alpha,
// same square corners, same layout laws from turn 28 F8.3/F8.4.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { dimensionStyle } from '../src/engine/dimensionArrows.js';

const CHAIN = readFileSync(new URL('../src/3d/DimensionChain.jsx', import.meta.url), 'utf8');

// What turn 25 shipped and turn 27 kept, which is what "30% bigger" is bigger
// than and "half as fat" is half of.
const BEFORE = { heightM: 0.044, pixels: 38, weight: 600 };

test('F4 the rendered label is a THIRD bigger — the number the eye measures', () => {
  const style = dimensionStyle(P);
  assert.ok(Math.abs(style.labelHeight / BEFORE.heightM - 1.3) < 1e-9,
    `${style.labelHeight} is ${(style.labelHeight / BEFORE.heightM).toFixed(3)}× 0.044`);
  // …and it is the SPRITE's height, not the canvas's: a bigger canvas at the
  // same world size is a sharper label of exactly the same size, which is not
  // what was asked for.
  assert.match(CHAIN, /const h = style\.labelHeight;/);
  assert.match(CHAIN, /scale=\{\[w, h, 1\]\}/);
  assert.doesNotMatch(CHAIN, /const h = 0\.0\d+;/, 'no literal size left in the component');
});

test('F4 the weight is HALVED, and it is the same family', () => {
  const style = dimensionStyle(P);
  assert.equal(style.labelWeight, BEFORE.weight / 2, '600 → 300');
  // A light cut of the same monospace stack — the owner asked for less fat,
  // not for a different face.
  assert.match(CHAIN, /\$\{style\.labelWeight\} \$\{size\}px ui-monospace, Menlo, Consolas, monospace/);
  assert.doesNotMatch(CHAIN, /`600 /, 'the old weight is gone');
});

test('F4 the canvas grows with it, so the label is bigger rather than softer', () => {
  const style = dimensionStyle(P);
  // 38 × 1.3 = 49.4; a canvas font size is an integer number of pixels.
  assert.equal(style.labelPixels, Math.round(BEFORE.pixels * 1.3));
  assert.match(CHAIN, /const size = style\.labelPixels;/);
  // …and the plate's padding and tracking are FRACTIONS of the type, so the
  // ground grows with the glyphs instead of tightening round them. 16 px on
  // 38 is the padding turn 25 drew.
  assert.ok(Math.abs(style.labelPad - 16 / 38) < 0.005, 'the same proportion as before');
  assert.equal(style.labelTracking, 0.09, 'and the app’s own letter-spacing');
  assert.match(CHAIN, /const pad = Math\.round\(size \* style\.labelPad\);/);
  assert.match(CHAIN, /const tracking = size \* style\.labelTracking;/);
});

test('F4 nothing else about the plate moved', () => {
  const style = dimensionStyle(P);
  assert.equal(style.labelPlate, '#1c1c1a', 'turn 27’s ground');
  assert.equal(style.labelInk, '#e8e4dc', '…and its ink');
  assert.equal(style.labelAlpha, 0.9);
  // Square corners and no stroke — the plate IS the edge (turn 27, R12).
  assert.match(CHAIN, /c\.fillRect\(0, 0, width, height\)/);
  assert.doesNotMatch(CHAIN, /strokeRect|shadowBlur|roundRect/);
  // The geometry, the offsets and the plane rules are turn 26's and turn 28's.
  assert.match(CHAIN, /const lift = mm\(style\.strokeMm \* 3\);/);
  assert.match(CHAIN, /plane === 'xz' \? \[u, at \+ lift, v\] : \[u, v, at \+ lift\]/);
});

test('F4 it is ONE place, because there is one dimension component', () => {
  // R11's own guard, re-stated for the type: no other module rasterises a
  // dimension's caption, so "everywhere a dimension speaks" is this file.
  const style = dimensionStyle(P);
  assert.ok(style.labelPixels > 0 && style.labelWeight > 0 && style.labelHeight > 0);
  // The three numbers reach the component only through `dimensionStyle`: the
  // profile is named in a comment and reached in no line of code.
  const code = CHAIN.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /hoverDimensions|profile\./, 'the component reads the STYLE, not the profile');
  for (const key of ['labelPixels', 'labelWeight', 'labelHeight', 'labelPad', 'labelTracking']) {
    assert.match(CHAIN, new RegExp(`style\\.${key}`), `${key} is read from the style`);
  }
});

test('F4 a partial or older stored profile still gets a readable label', () => {
  // `dimensionStyle` is defensive by design — a profile saved before these
  // keys existed must not produce NaN and render an invisible caption.
  const bare = dimensionStyle({});
  assert.equal(bare.labelPixels, 49);
  assert.equal(bare.labelWeight, 300);
  assert.ok(Math.abs(bare.labelHeight - 0.0572) < 1e-9);
  assert.ok(Math.abs(bare.labelPad - 0.42) < 1e-9);
  assert.equal(bare.labelTracking, 0.09);
});
