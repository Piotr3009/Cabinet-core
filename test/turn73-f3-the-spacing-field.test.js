// ─── TURN 73 · F3 · THE SPACING CHIP OPENS A REAL FIELD ────────────────────
//
// The owner, 23.09.2026, testing T72 points 2 and 3:
//
//   *"2klik na wymiar otwiera malutkie pole, którego nie widać i nie mam jak
//   wpisać; powinien tam być numer default i zaznaczone, że jak chcemy to się
//   wpisuje albo zatwierdza."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/3d/SpacingChain.jsx`, 'utf8');

test('T73 F3 · the field is readable: its own size, not a page class that retail does not load', () => {
  assert.doesNotMatch(src, /className="cc-input w-20/, 'the tiny PRO class is back');
  assert.match(src, /width: 96,/);
  assert.match(src, /height: 36,/);
  assert.match(src, /fontSize: 16,/);
  assert.match(src, /border: '2px solid #806A44'/, 'the gold edge is missing');
});

test('T73 F3 · it opens with the figure in it, selected, so typing replaces it and Enter confirms', () => {
  assert.match(src, /setDraft\(String\(Math\.round\(found\.value\)\)\)/, 'the field does not open with the figure');
  assert.match(src, /fieldRef\.current\?\.select\(\)/, 'the figure is not selected');
  assert.match(src, /onFocus=\{\(e\) => e\.currentTarget\.select\(\)\}/);
  assert.match(src, /if \(e\.key === 'Enter'\) \{ e\.preventDefault\(\); commit\(\); \}/);
  assert.match(src, /if \(e\.key === 'Escape'\)/);
});

test('T73 F3 · digits only, and the unit is printed beside the number', () => {
  assert.match(src, /replace\(\/\[\^\\d\]\/g, ''\)/);
  assert.match(src, /<span style=\{SPACING_FIELD_UNIT\}>mm<\/span>/);
});
