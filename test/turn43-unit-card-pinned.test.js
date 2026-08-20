// ─── TURN 43, IRON RULE 4: THE UNIT CARD DOES NOT MOVE ──────────────────────
//
// *"The card is a workshop sheet and its hidden lines are its value. Pin it: a
// test renders the card SVG for a fixture unit BEFORE and AFTER and asserts
// byte-identity — with exactly TWO licensed deltas, named in the test:
//   (a) when the project carries a shaker frame, the card's shaker inset moves
//       to it (F2 fixes the card's lie too);
//   (b) stroke-widths follow the F4 pen map.
// Geometry otherwise byte-identical."*
//
// THE BEFORE IS A MEASUREMENT, NOT A MEMORY. `test/fixtures/t43-unit-card.mjs`
// prints the card of one fixture BUDR deterministically — fixed params, fixed
// paper, fixed date, no clock — and `t43-unit-card-before.svg` beside it is
// what that file printed on the branch point (38a8483), before a line of T43
// existed. Regenerate the BEFORE on any commit with
//
//     node test/fixtures/t43-unit-card.mjs
//
// This turn's licence is a licence to change TWO things. Everything else the
// card draws — every rectangle, every dimension, every hidden line, every
// coordinate — has to come out of the renderer character for character.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { PEN } from '../src/engine/drawings/layers.js';
import { shakerSpec } from '../src/engine/shaker.js';
import { buildUnitCard } from '../src/engine/drawings/unitCard.js';
import { T43_CARD_RESULT, t43CardSvg } from './fixtures/t43-unit-card.mjs';

const BEFORE = readFileSync(new URL('./fixtures/t43-unit-card-before.svg', import.meta.url), 'utf8');

/** The one licensed channel, closed: every stroke weight replaced by a token. */
const withoutWeights = (svg) => svg.replace(/stroke-width="[\d.]+"/g, 'stroke-width="*"');

/** Every weight in the file, in document order. */
const weightsOf = (svg) => [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));

test('iron rule 4 — the card\'s GEOMETRY is byte-identical to the branch point', () => {
  const after = t43CardSvg();
  // Not "the same number of rectangles" and not "the same bounds": the same
  // STRING, with the one licensed channel masked out. Anything at all that
  // moved a coordinate, dropped an entity, added one, or changed a colour or a
  // dash fails here and names itself in the diff.
  assert.equal(withoutWeights(after), withoutWeights(BEFORE),
    'the unit card does not move (delta (b) — stroke width — is masked; nothing else may differ)');
});

test('iron rule 4, DELTA (b) — the only thing that changed is the pen weight', () => {
  const before = weightsOf(BEFORE);
  const after = weightsOf(t43CardSvg());
  assert.equal(before.length, after.length, 'the same number of strokes, in the same order');
  const ladder = new Set(Object.values(PEN));
  const moved = [];
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] === after[i]) continue;
    moved.push(`${before[i]} → ${after[i]}`);
    assert.ok(ladder.has(after[i]), `${after[i]} is a rung of the ISO pen ladder`);
  }
  // Printed rather than counted: the audit reads this list by hand, and a
  // silent count would be exactly the kind of claim this turn is about.
  // eslint-disable-next-line no-console
  if (moved.length) console.log(`      card stroke deltas: ${[...new Set(moved)].join(', ')}`);
});

test('iron rule 4, DELTA (a) — the card\'s shaker inset moves to the PROJECT', () => {
  const inner = (frame) => {
    const card = buildUnitCard(T43_CARD_RESULT, {
      unitNum: '01', frontType: 'S', profile: P, arrangement: 'projection', shakerFrame: frame,
    });
    const rects = card.entities.filter((e) => e.kind === 'rect' && e.layer === 'DOORS');
    const insets = [];
    for (const a of rects) {
      for (const b of rects) {
        if (a === b) continue;
        const left = a.x - b.x;
        const right = (b.x + b.w) - (a.x + a.w);
        const down = a.y - b.y;
        const up = (b.y + b.h) - (a.y + a.h);
        if (left <= 0 || right <= 0 || down <= 0 || up <= 0) continue;
        if (Math.abs(left - right) > 1e-6 || Math.abs(left - down) > 1e-6 || Math.abs(left - up) > 1e-6) continue;
        insets.push(Math.round(left * 1000) / 1000);
      }
    }
    return [...new Set(insets)];
  };
  // No project: the profile default, which is what the card drew before
  // tonight and is why the pin above holds.
  assert.deepEqual(inner(null), [shakerSpec(P).frameWidth]);
  // A project that says 85: the card says 85. That is the licensed delta, and
  // it is the fix — the card told the same lie the wall sheet did.
  assert.deepEqual(inner(85), [85]);
});

test('iron rule 4 — and the card still carries its HIDDEN LINES, which are its value', () => {
  const after = t43CardSvg();
  const dashed = [...after.matchAll(/<[a-z]+[^>]*stroke-dasharray[^>]*>/g)];
  assert.ok(dashed.length > 0, 'a card without hidden lines is not a workshop sheet');
  assert.equal(dashed.length, [...BEFORE.matchAll(/<[a-z]+[^>]*stroke-dasharray[^>]*>/g)].length,
    'and exactly as many of them as before');
});
