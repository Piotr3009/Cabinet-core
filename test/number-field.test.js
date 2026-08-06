// ─── The numeric field's buffer (BACKLOG #2) ───
//
// The bug was per-keystroke normalisation: typing "250" into a field with a
// 100 mm minimum went 2 → 100 → "1002" → 1002 → clamped again, so the value
// could not be typed at all.
//
// What is tested here is the rule the component follows: NOTHING happens while
// the text is being typed, and the parse/round/clamp happens ONCE, on commit.
// The component itself is then only focus and keys.

import test from 'node:test';
import assert from 'node:assert/strict';

import { commitNumber, formatNumber } from '../src/lib/numberField.js';

const DR = { min: 100, max: 600 };

test('a value the old field could not accept types straight through', () => {
  // The exact sequence that used to fight back. Each keystroke is only text —
  // there is no commit until the user says so, so nothing is clamped mid-word.
  for (const half of ['2', '25']) {
    assert.equal(commitNumber({ text: half, current: 200, ...DR }).clamped, true,
      'a half-typed value WOULD be clamped — which is why it is not committed');
  }
  const done = commitNumber({ text: '250', current: 200, ...DR });
  assert.deepEqual(done, { value: 250, ok: true, clamped: false, reverted: false });
});

test('commit rounds to whole mm, and clamps once', () => {
  assert.equal(commitNumber({ text: '249.6', current: 200, ...DR }).value, 250);
  assert.equal(commitNumber({ text: '249,6', current: 200, ...DR }).value, 250, 'a comma is a decimal point');

  const low = commitNumber({ text: '40', current: 200, ...DR });
  assert.equal(low.value, 100);
  assert.equal(low.clamped, true);

  const high = commitNumber({ text: '9000', current: 200, ...DR });
  assert.equal(high.value, 600);
  assert.equal(high.clamped, true);

  // No limits given: the number stands as typed.
  assert.equal(commitNumber({ text: '4321', current: 0 }).value, 4321);
});

test('nothing usable typed = the stored value comes back, untouched', () => {
  for (const text of ['', '   ', '-', '.', 'abc', 'NaN']) {
    const r = commitNumber({ text, current: 200, ...DR });
    assert.equal(r.value, 200, `"${text}" must not change the stored value`);
    assert.equal(r.ok, false);
    assert.equal(r.reverted, true);
  }
});

test('a field that is allowed to be empty reports null rather than reverting', () => {
  const r = commitNumber({ text: '', current: 200, allowEmpty: true });
  assert.deepEqual(r, { value: null, ok: true, clamped: false, reverted: false });
  // …and a blank field with no stored value is not a zero either.
  assert.equal(commitNumber({ text: '', current: null }).value, null);
});

test('non-integer fields keep their decimals (the BOM yield coefficient)', () => {
  const r = commitNumber({ text: '1.15', current: 1, min: 1, integer: false });
  assert.equal(r.value, 1.15);
  assert.equal(commitNumber({ text: '1.15', current: 1, min: 1 }).value, 1, 'an integer field rounds it');
  assert.equal(commitNumber({ text: '0.5', current: 1, min: 1, integer: false }).value, 1, 'still clamped');
});

test('formatNumber is what the field shows after a commit', () => {
  assert.equal(formatNumber(249.6), '250');
  assert.equal(formatNumber(1.15, { integer: false }), '1.15');
  assert.equal(formatNumber(1.1500, { integer: false }), '1.15', 'no trailing zeros to retype around');
  assert.equal(formatNumber(null), '');
  assert.equal(formatNumber(undefined), '');
  assert.equal(formatNumber('abc'), '');
});
