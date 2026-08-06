import test from 'node:test';
import assert from 'node:assert/strict';

import { formatMm, formatMmPair, snap, roundTo } from '../src/engine/format.js';
import { commitNumber, formatNumber } from '../src/lib/numberField.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import { distanceLabel } from '../src/engine/dimensions.js';

// ─── 0.5 mm end to end (BACKLOG #33, turn 5 F1) ───
//
// The engine always computed exactly; the SCREEN was the liar. Every place
// that showed a millimetre ran its own `Math.round`, so a 196.5 mm filler read
// 197 and a shelf row at 704.7 read 705 — numbers a joiner then cut to.
//
// This file pins the ONE rule the whole app now formats through, the field that
// has to be able to accept a half, and the snap that has to be able to land on
// one.

const MM_STEP = DEFAULT_CABINET_PROFILE.editor.mmStep;

test('the display rule: whole numbers whole, halves halved, the rest to a tenth', () => {
  // whole → no decimal point at all
  assert.equal(formatMm(197), '197');
  assert.equal(formatMm(197.0), '197');
  assert.equal(formatMm(0), '0');

  // halves → the half is SHOWN. This is the whole point of the phase.
  assert.equal(formatMm(196.5), '196.5');
  assert.equal(formatMm(-196.5), '-196.5');
  assert.equal(formatMm(0.5), '0.5');

  // anything else → one decimal (a shelf row off the LISP even-spacing formula)
  assert.equal(formatMm(704.6666), '704.7');
  assert.equal(formatMm(704.04), '704');
  assert.equal(formatMm(196.96), '197', 'a tenth that rounds up to whole prints whole');
});

test('a value that is not a number is not a zero', () => {
  for (const v of [null, undefined, '', 'abc', NaN, Infinity]) {
    assert.equal(formatMm(v), '', `${String(v)} must not print as a dimension`);
  }
  assert.equal(formatMm(null, { dash: '—' }), '—');
});

test('negative dust prints as 0, never as "-0"', () => {
  assert.equal(formatMm(-0), '0');
  assert.equal(formatMm(-0.004), '0');
});

test('the unit suffix and the pair are the same rule, not a second one', () => {
  assert.equal(formatMm(196.5, { unit: true }), '196.5 mm');
  assert.equal(formatMmPair(600, 719.5), '600 × 719.5');
  assert.equal(formatMmPair(600, 719.5, '×'), '600×719.5');
});

test('the distance arrows caption through that same rule', () => {
  // Turn 3 rounded here (`${Math.round(mm)} mm`), which is exactly how a half
  // millimetre vanished between the arrow on the drawing and the cut list.
  assert.equal(distanceLabel(196.5), '196.5 mm');
  assert.equal(distanceLabel(1234), '1234 mm');
  assert.equal(distanceLabel(1234.42), '1234.4 mm');
});

// ─── the snap ───

test('snapping to 0.5 really lands on halves, with no binary dust', () => {
  assert.equal(snap(196.7, MM_STEP), 196.5);
  assert.equal(snap(196.3, MM_STEP), 196.5);
  assert.equal(snap(196.24, MM_STEP), 196);
  assert.equal(snap(-196.7, MM_STEP), -196.5);

  // The value must be EXACTLY a half — a drag that produced 196.50000000000003
  // would put fourteen decimals in a field the moment the pointer stopped.
  for (let i = 0; i < 400; i += 1) {
    const v = snap(i * 0.37 + 0.123, MM_STEP);
    assert.equal(v, Number(v.toFixed(1)), `${v} carries representation dust`);
    assert.equal((v * 2) % 1, 0, `${v} is not a half`);
  }
});

test('the other snap steps still behave (1 mm and the 32 mm system)', () => {
  assert.deepEqual(DEFAULT_CABINET_PROFILE.editor.snapSteps, [0.5, 1, 32]);
  assert.equal(snap(196.7, 1), 197);
  assert.equal(snap(196.4, 1), 196);
  assert.equal(snap(200, 32), 192);
  assert.equal(snap(0, 0), 0, 'no step = no quantisation');
  assert.equal(snap(196.7, 0), 196.7);
});

// ─── the field ───

test('a millimetre field accepts, commits and shows back a half', () => {
  const typed = commitNumber({ text: '196.5', current: 200, step: MM_STEP });
  assert.equal(typed.value, 196.5);
  assert.equal(typed.ok, true);
  assert.equal(typed.reverted, false);
  assert.equal(formatNumber(typed.value, { step: MM_STEP }), '196.5',
    'what goes back in the box is what was typed');

  // A comma is still a decimal point — a UK bench and a Polish keyboard.
  assert.equal(commitNumber({ text: '196,5', current: 200, step: MM_STEP }).value, 196.5);

  // Off-grid values land on the nearest half rather than on the nearest whole.
  assert.equal(commitNumber({ text: '249.6', current: 200, step: MM_STEP }).value, 249.5);
  assert.equal(commitNumber({ text: '249.8', current: 200, step: MM_STEP }).value, 250);
});

test('the limits still apply once, on commit, to a half as to a whole', () => {
  const low = commitNumber({ text: '99.5', current: 200, min: 100, max: 600, step: MM_STEP });
  assert.equal(low.value, 100);
  assert.equal(low.clamped, true);
  const ok = commitNumber({ text: '100.5', current: 200, min: 100, max: 600, step: MM_STEP });
  assert.equal(ok.value, 100.5);
  assert.equal(ok.clamped, false);
});

test('a field with no step is unchanged — whole numbers, or free decimals', () => {
  assert.equal(commitNumber({ text: '249.6', current: 200 }).value, 250, 'degrees, counts');
  assert.equal(commitNumber({ text: '1.15', current: 1, integer: false }).value, 1.15, 'the BOM yield');
  assert.equal(formatNumber(249.6), '250');
  assert.equal(formatNumber(1.15, { integer: false }), '1.15');
});

test('roundTo still rounds half away from zero (the CSV contract)', () => {
  assert.equal(roundTo(2.5, 0), 3);
  assert.equal(roundTo(-2.5, 0), -3);
  assert.equal(roundTo(2.195, 2), 2.2);
});
