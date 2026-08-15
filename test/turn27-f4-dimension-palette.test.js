// ─── TURN 27 F4 — the dimensions go back to black ───────────────────────────
//
// R12's first debt. Turn 26 was asked to give shelves, sides and fronts the
// partition chain's BEHAVIOUR; it also repainted every label on the way — the
// quiet dark plate the chain had carried since turn 17 became a white halo and
// the line's own ink. The owner did not ask for that and does not want it.
//
//   F4.1  the pre-turn-26 appearance is back — the dark label background and
//         the palette that went with it — as the SINGLE style, now used by
//         every surface.
//   F4.2  the unification stays: one component, one geometry, 0.5 mm, chains
//         lying on the floor. Only the paint returns.
//   F4.3  the palette is read from the PROFILE, so a workshop changes a value
//         and not a component.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { dimensionStyle, dimensionSet } from '../src/engine/dimensionArrows.js';
import { formatDimension } from '../src/engine/format.js';

const chain = readFileSync(new URL('../src/3d/DimensionChain.jsx', import.meta.url), 'utf8');

// ─── F4.1 / F4.3 — the palette, and where it lives ──────────────────────────

test('F4.3 the palette is in the profile, and it is turn 17’s own two tones', () => {
  assert.ok(P.hoverDimensions.label, 'the label block is there');
  // The app's own shell and the ink it prints in — unchanged since turn 17,
  // which is what "restore" means as a fact rather than as an intention.
  assert.equal(P.hoverDimensions.label.plate, '#1c1c1a');
  assert.equal(P.hoverDimensions.label.ink, '#e8e4dc');
  assert.equal(P.hoverDimensions.label.plateAlpha, 0.9);
  // Dark ground, light ink — the two the eye actually distinguishes.
  const luma = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    // eslint-disable-next-line no-bitwise
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };
  assert.ok(luma(P.hoverDimensions.label.plate) < 0.2, 'the background is DARK — the debt being paid');
  assert.ok(luma(P.hoverDimensions.label.ink) > 0.8, '…and the type on it is light');
});

test('F4.3 `dimensionStyle` reads it through, so every surface gets one answer', () => {
  const style = dimensionStyle(P);
  assert.equal(style.labelPlate, P.hoverDimensions.label.plate);
  assert.equal(style.labelInk, P.hoverDimensions.label.ink);
  assert.equal(style.labelAlpha, P.hoverDimensions.label.plateAlpha);
  // A workshop that changes the value gets the change everywhere, in one call.
  const mine = migrateCabinetProfile({
    ...P,
    hoverDimensions: { ...P.hoverDimensions, label: { plate: '#101820', ink: '#f4f4f0', plateAlpha: 0.75 } },
  });
  const theirs = dimensionStyle(mine);
  assert.equal(theirs.labelPlate, '#101820');
  assert.equal(theirs.labelInk, '#f4f4f0');
  assert.equal(theirs.labelAlpha, 0.75);
  // …and a stored profile that names ONE of the two keeps the other, which is
  // the key-by-key merge every nested block in `migrateCabinetProfile` gets.
  const half = migrateCabinetProfile({
    ...P, hoverDimensions: { ...P.hoverDimensions, label: { ink: '#ffffff' } },
  });
  assert.equal(dimensionStyle(half).labelInk, '#ffffff');
  assert.equal(dimensionStyle(half).labelPlate, '#1c1c1a', 'the plate it did not mention');
  // …and a profile that says nothing still gets the house palette.
  const bare = dimensionStyle({});
  assert.equal(bare.labelPlate, '#1c1c1a');
  assert.equal(bare.labelInk, '#e8e4dc');
});

// ─── F4.1 — the single style, on the one component ──────────────────────────

test('F4.1 the PLATE is the default and carries no halo; the halo lives ONLY behind the hover switch', () => {
  // ─── RE-RULED 15.08.2026 (evening) ─────────────────────────────────────
  // R12's plate stays THE look for every standing chain. What changed is the
  // owner's own ruling on the MOMENTARY labels: "jak najeżdżamy… można
  // usunąć czarne tło? bo nam zasłania sporo" — so `labelGround: 'bare'`
  // exists for hover alone, and the white halo may appear ONLY inside that
  // branch. The default path must still paint the plate and never stroke.
  const srcText = readFileSync(new URL('../src/3d/DimensionChain.jsx', import.meta.url), 'utf8');
  const body = srcText.slice(srcText.indexOf('function DimensionValue'));
  const bareAt = body.indexOf("const bare = style.labelGround === 'bare';");
  assert.ok(bareAt > 0, 'the switch exists');
  assert.match(body, /if \(!bare\) \{[\s\S]{0,600}?fillRect/, 'the plate is painted on the default path');
  const firstStroke = body.indexOf('strokeText');
  assert.ok(firstStroke > bareAt, 'no stroke before the switch — the plate path cannot halo');
  assert.match(body, /if \(bare\) \{\n\s*c\.lineJoin/, 'halo settings live behind the bare switch');
});

test('F4.1 the INK is the plate’s, not the line’s — as it was before turn 26', () => {
  // The chain's `colour` override reaches the STROKES (a selected cabinet's
  // gold, the room's navy or red) and never the number, which is exactly how
  // the partition chain behaved. A gold word on a near-black plate is not a
  // measurement anybody reads.
  // Turn 31 (CLAUDE.md F8) gave `Value` an optional `onPick` — the invisible
  // catchment that makes the FIGURE double-clickable. The property this
  // asserts is unchanged and is the one that matters: `colour` is NOT among
  // the props the value receives, so the chain's ink never reaches the number.
  const value = chain.slice(chain.indexOf('<Value'), chain.indexOf('<Value') + 260);
  assert.match(value, /row=\{row\}/);
  assert.match(value, /style=\{style\}/);
  assert.ok(!/colour=/.test(value), 'the chain’s ink reached the number');
  assert.match(chain, /colour=\{ink\}/, 'the strokes still take it');
});

// ─── F4.2 — the unification stays ───────────────────────────────────────────

test('F4.2 one component: nothing else in the scene draws a dimension value', () => {
  // Turn 26's R11 guard, restated for the paint: the label is drawn in ONE
  // place, so "the palette" is a single decision and not four.
  const plates = ['../src/3d/DistanceArrows.jsx', '../src/3d/HoverDimensions.jsx', '../src/3d/UnitView.jsx'];
  for (const file of plates) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /labelPlate|labelInk/, `${file} does not paint a dimension label`);
  }
  assert.equal((chain.match(/CanvasTexture/g) || []).length, 1, 'one label texture, in one component');
});

test('F4.2 the geometry, the precision and the planes are untouched', () => {
  const style = dimensionStyle(P);
  // 0.5 mm (turn 26, F4.3) — a 3 mm gap and a 2.5 mm one are two numbers.
  assert.equal(formatDimension(2.5), '2.5');
  assert.equal(formatDimension(3), '3');
  // One geometry: the pure `dimensionSet`, arrowheads and all.
  const rows = dimensionSet([{ key: 'a', from: [0, 0], to: [600, 0], offset: 14 }], style);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].value, 600);
  assert.ok(rows[0].segments.length >= 7, 'two extensions, the line and four arrow strokes');
  assert.equal(rows[0].text.value, '600');
  // Both planes still exist on the one component (F4.2's floor-lying chains).
  assert.match(chain, /plane === 'xz' \? \[mu, at, mv\] : \[mu, mv, at\]/);
});
