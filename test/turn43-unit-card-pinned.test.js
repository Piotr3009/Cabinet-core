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
import { projectRun } from '../src/engine/drawings/projector.js';
import { T43_CARD_RESULT, T43_CARD_UNIT, t43CardSvg } from './fixtures/t43-unit-card.mjs';

const BEFORE = readFileSync(new URL('./fixtures/t43-unit-card-before.svg', import.meta.url), 'utf8');

/** The one licensed channel, closed: every stroke weight replaced by a token. */
const withoutWeights = (svg) => svg.replace(/stroke-width="[\d.]+"/g, 'stroke-width="*"');

/** Every weight in the file, in document order. */
const weightsOf = (svg) => [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));

test('iron rule 4 (T81 F9) · the card\'s GEOMETRY is the projector\'s, for this one cabinet, and nothing of its own', () => {
  const W = Number(T43_CARD_RESULT.params.width);
  const member = { unit: T43_CARD_UNIT, result: T43_CARD_RESULT, x: 0, base: 0, top: Number(T43_CARD_RESULT.params.height), width: W };
  const group = { wall: 0, members: [member] };
  const m = P.drawings.card.runMargin;
  const of = (view, mode) => projectRun(group, { view, mode, profile: P, clipX: [-m, W + m], frontTypeOf: () => 'S' }).entities
    .filter((e) => e.kind !== 'text').length;
  const projected = of('front', 'fronts') + of('front', 'no-fronts') + of('top-of-card', 'fronts');
  const card = buildUnitCard(T43_CARD_RESULT, { unitNum: '01', frontType: 'S', profile: P, arrangement: 'projection', unit: T43_CARD_UNIT });
  // The building is the card's own context, as a sheet's floor is: the wall behind the plan, one line.
  const geometry = card.entities.filter((e) => e.kind !== 'text' && e.layer !== 'DIMENSIONS' && e.layer !== 'VIEW_TITLE' && e.layer !== 'BUILDING');
  assert.equal(card.entities.filter((e) => e.layer === 'BUILDING').length, 1, 'the wall behind the plan');
  assert.equal(geometry.length, projected, 'the three views, stroke for stroke, and no composer\'s rectangle beside them');
  assert.notEqual(withoutWeights(t43CardSvg()), withoutWeights(BEFORE), 'and the branch point\'s card is history');
});

test('iron rule 4, DELTA (b) · every weight on the card is a rung of the ISO pen ladder', () => {
  const ladder = new Set(Object.values(PEN));
  const after = weightsOf(t43CardSvg());
  assert.ok(after.length > 0);
  for (const w of after) assert.ok(ladder.has(w), `${w} is a rung of the ISO pen ladder`);
  // The branch point's weights, for the record the audit reads.
  // eslint-disable-next-line no-console
  console.log(`      card weights: ${[...new Set(after)].sort((a, b) => a - b).join(', ')} (branch point: ${[...new Set(weightsOf(BEFORE))].sort((a, b) => a - b).join(', ')})`);
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

// AMENDED 22.10.2026 (T81 F9): the card's FRONT is the fronts the room shows
// and nothing behind them (*"bez przebijania carcasow, tylko to co widac za
// frontami"*); what the hidden lines said is on the CARCASS view, solid, the
// boards themselves, where the room shows them with the fronts off.
test('iron rule 4 (T81 F9) · what the hidden lines said, the CARCASS view draws solid', () => {
  const card = buildUnitCard(T43_CARD_RESULT, { unitNum: '01', frontType: 'S', profile: P, arrangement: 'projection', unit: T43_CARD_UNIT });
  const inside = T43_CARD_RESULT.panels.filter((p) => p.box && (p.part === 'DRAWER-SIDE' || p.role === 'shelf'));
  assert.ok(inside.length > 0, 'the fixture has an inside to show');
  for (const p of inside) {
    assert.ok(card.entities.some((e) => e.src === `${T43_CARD_UNIT.id}:${p.id}` && e.solid && !e.hidden), `${p.id}, solid`);
  }
  assert.equal(card.entities.filter((e) => e.hidden && e.layer !== 'DIMENSIONS').length, 0, 'no line through a front');
  // The branch point's card drew them dashed behind its fronts.
  assert.ok([...BEFORE.matchAll(/<[a-z]+[^>]*stroke-dasharray[^>]*>/g)].length > 0);
});
