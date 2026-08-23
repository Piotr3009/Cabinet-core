import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  WIZARD_NODES, WIZARD_STEP_NO, WIZARD_TABS, tabNumber, visibleTabs,
} from '../src/lib/wizardTabs.js';
import { stepsInScope } from '../src/lib/wizardSteps.js';
import { polishHits, polishInCode, polishInComments } from '../scripts/t45-polish-grep.mjs';

// ─── TURN 45 · F8 — THE NUMBERING, AND THE ENGLISH SWEEP ────────────────────
//
// CLAUDE.md, 23.08.2026:
//
//   *"Sub-tabs numbered `5.1 … 5.6` in the strip.
//   Every Polish string shipped by T44 goes English, BY NAME:
//   `Ustawienia → Settings`, `Produkcja → Production`,
//   `Podsumowanie → Summary`, `Ile kolorów frontów? → How many front
//   colours?`, the save-set finale → `Save these as your standard?` — and a
//   grep for Polish diacritics in `src/components/` returns only comments."*
//
// The law was ours and we broke it ourselves. He laughed at us. Rightly.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const FINALE = readFileSync(new URL('../src/components/SaveSettingsSetModal.jsx', import.meta.url), 'utf8');
const TABS = readFileSync(new URL('../src/lib/wizardTabs.js', import.meta.url), 'utf8');

// ══ the numbering ═══════════════════════════════════════════════════════════

test('F8 — the sub-tabs are 5.1 … 5.N, because they ARE step 5', () => {
  assert.equal(WIZARD_STEP_NO, 5);
  // The prefix is not a literal somebody typed: the walk really does put the
  // settings fifth, whichever of the room/wall stops this job actually has.
  for (const scope of ['room', 'wall']) {
    assert.equal(stepsInScope(scope).indexOf('settings') + 1, WIZARD_STEP_NO, `${scope} scope`);
  }
  assert.equal(tabNumber(1), '5.1');
  assert.equal(tabNumber(6), '5.6');
  assert.deepEqual(
    visibleTabs('factory').map((t) => tabNumber(t.n)),
    ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6'],
  );
  // Retail loses Production and Lighting — both workshop tabs — and RENUMBERS,
  // so there is no hole where 5.5 was.
  assert.deepEqual(
    visibleTabs('retail').map((t) => tabNumber(t.n)),
    ['5.1', '5.2', '5.3', '5.4'],
  );
});

test('F8 — the strip prints it and the DOM stamps it', () => {
  assert.match(WIZ, /data-tab-number=\{tabNumber\(t\.n\)\}/);
  assert.match(WIZ, /\{tabNumber\(t\.n\)\} \{t\.label\}/);
  assert.doesNotMatch(WIZ, /\{t\.n\}\. \{t\.label\}/, 'the bare 1…6 that competed with the step numbers');
});

// ══ the English sweep, BY NAME ═════════════════════════════════════════════

test('F8 — Ustawienia → Settings, Produkcja → Production', () => {
  assert.deepEqual(
    WIZARD_TABS.map((t) => t.label),
    ['Settings', 'Carcases', 'Fronts', 'Hardware', 'Production', 'Lighting'],
  );
  // The IDS went with the labels: an id a reader has to translate is a comment
  // that lies, and every one of them is a `data-` hook somebody greps for.
  assert.deepEqual(
    WIZARD_TABS.map((t) => t.id),
    ['settings', 'carcases', 'fronts', 'hardware', 'production', 'lighting'],
  );
  for (const n of WIZARD_NODES) {
    assert.doesNotMatch(n.id, /ustawienia|produkcja|podsumowanie/, `${n.id} is still Polish`);
    assert.doesNotMatch(n.tab, /ustawienia|produkcja|podsumowanie/, `${n.tab} is still Polish`);
  }
  // …and the hints the strip shows on hover are English too.
  for (const t of WIZARD_TABS) {
    assert.equal(polishHits(t.hint).filter((h) => !h.comment).length, 0, `${t.id}'s hint`);
  }
});

test('F8 — Podsumowanie → Summary', () => {
  // T45 F4 folded the settings' own summary into the wizard's step 6; the word
  // it is called there is English.
  assert.equal(WIZARD_TABS.some((t) => t.label === 'Podsumowanie'), false);
  const FLOW = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');
  assert.match(FLOW, /summary: 'Summary',/);
  assert.match(FLOW, /Next — summary/);
});

test('F8 — Ile kolorów frontów? → How many front colours?', () => {
  assert.match(WIZ, /How many front colours\?/);
  assert.match(WIZ, /How many carcass material types\?/, '…and the carcasses’ own question with it');
  // The owner's words survive in the COMMENT above the block, which is where
  // the evidence belongs.
  assert.doesNotMatch(WIZ, /<p className="text-sm text-ink-100">Ile /);
});

test('F8 — the save-set finale → Save these as your standard?', () => {
  assert.match(FINALE, /<p className="text-base text-ink-50">Save these as your standard\?<\/p>/);
  const SUM = readFileSync(new URL('../src/components/WizardSummary.jsx', import.meta.url), 'utf8');
  assert.match(SUM, /Save these as your standard\?/, 'and the button that opens it says the same');
});

// ══ the grep itself ════════════════════════════════════════════════════════

test('F8 — a grep for Polish diacritics in src/components/ returns ONLY comments', () => {
  const bad = polishInCode('src/components');
  assert.deepEqual(
    bad.map((h) => `${h.file}:${h.line}  ${h.text.slice(0, 80)}`),
    [],
    'a Polish string is still shipping',
  );
  // …and the owner's own words are STILL THERE, in the comments, in numbers.
  // A sweep that had "passed" by deleting the evidence would be the worse bug.
  const kept = polishInComments('src/components');
  assert.ok(kept.length > 100, `only ${kept.length} comment lines survive — was the evidence deleted?`);
});

test('F8 — src/lib is clean too, and the sweep can tell a comment from a string', () => {
  assert.deepEqual(polishInCode('src/lib').map((h) => `${h.file}:${h.line}`), []);
  // The classifier itself, on the two shapes this repository actually has.
  const sample = [
    '// the owner: \u201cwyb\u00f3r\u201d',            // a line comment
    '/* a block:',
    '   "gubimy si\u0119" */',
    "const shipped = 'Zapisa\u0107';",                   // a STRING — code
    "const clean = 'Save these as your standard?';",
  ].join('\n');
  const hits = polishHits(sample);
  assert.equal(hits.length, 3);
  assert.deepEqual(hits.map((h) => h.comment), [true, true, false]);
});

test('F8 — the tree file itself carries no Polish outside its own quotations', () => {
  assert.equal(polishHits(TABS).filter((h) => !h.comment).length, 0);
});
