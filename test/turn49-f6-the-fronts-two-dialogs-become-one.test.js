import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { sheetOptionIdFor, sheetSizeForFamily } from '../src/engine/checks.js';
import { WIZARD_NODES, hiddenNodes } from '../src/lib/wizardTabs.js';
import { survivors } from '../scripts/t49-classify.mjs';

// ─── TURN 49 · F6 — THE FRONTS' SECOND AND THIRD DIALOGS BECOME ONE ─────────
//
// *"modal front nr 2 i 3 moze byc polaczony … tak samo jak Carcases."*
//
// Same treatment, same reason: the third stop re-drew the stock-board select
// the colour dialog had already drawn for the type the joiner was standing in,
// and only the sheet was new. So the stop goes and the sheet stands under the
// board in the colour dialog — every control surviving the move (rule 3).
//
// This is the one feature the night was allowed to sacrifice. It did not fall.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');

test('F6 — the fronts walk is count → one dialog per colour → the tail', () => {
  const stops = WIZ.slice(WIZ.indexOf('const frontStops = ['), WIZ.indexOf('const frontAt ='));
  assert.match(stops, /'count',/);
  assert.match(stops, /\.\.\.frontTypes\.map\(\(t\) => t\.id\),/);
  assert.match(stops, /'tail',/);
  assert.doesNotMatch(stops, /'sheets'/, 'the third stop is gone');
  assert.doesNotMatch(WIZ, /frontAt === 'sheets'/);
  // Neither family has a sheets stop left, which is what "tak samo jak
  // Carcases" means.
  assert.doesNotMatch(WIZ, /carcAt === 'sheets'/);
});

test('F6 — every control the removed stop owned answers to its own hook', () => {
  const rows = survivors((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'))
    .filter((r) => r.was === 'fronts · sheets');
  assert.equal(rows.length, 4);
  for (const r of rows) assert.ok(r.found, `${r.control} — ${r.hook} is in no file`);
});

test('F6 — the sheet row is in the colour dialog, writing what it always wrote', () => {
  const row = WIZ.slice(WIZ.indexOf('const sheetSizeRow ='), WIZ.indexOf('const slotPicker ='));
  assert.match(row, /family="fronts"/);
  assert.match(row, /sheetFronts: size/);
  assert.match(row, /data-front-sheets-assignment="1"/);
  assert.match(row, /data-front-sheet-assign=\{t\.id\}/);
  assert.match(row, /data-wizard-node="fronts\.sheets"/);
  // The front dialog asks for it, exactly as the carcass one does.
  const call = WIZ.slice(WIZ.indexOf("slotPicker('front', frontTypeAt, {"), WIZ.indexOf("frontAt === 'tail'"));
  assert.match(call, /sheets: true,/);
  // …and the engine's resolver is untouched: jumbo on the fronts is jumbo on
  // the fronts, and the carcasses' own answer does not move with it.
  const jumbo = { width: 2070, height: 2800 };
  const withJumbo = { ...P, cnc: { ...P.cnc, sheetFronts: jumbo } };
  assert.deepEqual(sheetSizeForFamily(withJumbo, 'fronts'), jumbo);
  assert.equal(sheetOptionIdFor(withJumbo, 'fronts'), 'jumbo');
  assert.notDeepEqual(sheetSizeForFamily(withJumbo, 'carcasses'), jumbo);
});

test('F6 — the node kept its id, its tab and its audience', () => {
  const node = WIZARD_NODES.find((n) => n.id === 'fronts.sheets');
  assert.ok(node);
  assert.equal(node.tab, 'fronts');
  assert.equal(node.audience, 'factory');
  assert.ok(hiddenNodes('retail').includes('fronts.sheets'));
});

test('F6 — the TAIL is untouched: opening, shine, styles, run materials, chosen', () => {
  const tail = WIZ.slice(WIZ.indexOf("{frontAt === 'tail' && ("), WIZ.indexOf('data-save-fronts="1"'));
  assert.match(tail, /data-front-opening="1"/);
  assert.match(tail, /data-front-shine="1"/);
  assert.match(tail, /<SheenSlider design=\{design\} setDesign=\{setDesign\} profile=\{profile\} \/>/);
  assert.match(tail, /data-new-style="1"/);
  assert.match(tail, /data-door-styles="1"/);
  assert.match(tail, /data-run-materials="1"/);
  assert.match(tail, /data-fronts-chosen="1"/);
  assert.match(WIZ, /data-save-fronts="1"/);
});
