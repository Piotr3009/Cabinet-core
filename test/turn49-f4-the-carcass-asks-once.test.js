import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { sheetOptionIdFor, sheetSizeForFamily } from '../src/engine/checks.js';
import { WIZARD_NODES, hiddenNodes, nodeVisible } from '../src/lib/wizardTabs.js';
import { SURVIVORS, survivors } from '../scripts/t49-classify.mjs';

// ─── TURN 49 · F4 — THE CARCASS ASKS ONCE ───────────────────────────────────
//
// The owner, 25.08.2026: *"przy carcasach jest 2 stopnie wybierania … a
// dlaczego nie dodac rozmiar plyty w pierwszym modalu i drugi usunac, jeden
// mniej bedzie."*
//
// The walk was: pick Egger, then a stock board, then THE STOCK BOARD AGAIN with
// the sheet size beside it. The middle screen asked nothing the first had not
// asked; only the sheet was new.
//
// And the warning that came with the order, which is iron rule 3's case in
// point and this turn's most likely failure: *"jest funkcja wyboru materials
// size, jumbo etc — tez trzeba bedzie przeniesc do pierwszego wyboru
// materialow, INACZEJ ZNIKNIE NAM TA FUNKCJA."*

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const PANEL = readFileSync(new URL('../src/components/MaterialChoicePanel.jsx', import.meta.url), 'utf8');
const SETTINGS = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');

// ══ the stop is gone ═══════════════════════════════════════════════════════

test('F4 — the carcass walk is count → one dialog per type → the CNC corner', () => {
  const stops = WIZ.slice(WIZ.indexOf('const carcStops = ['), WIZ.indexOf('const carcAt ='));
  assert.match(stops, /'count',/);
  assert.match(stops, /\.\.\.carcassTypes\.map\(\(t\) => t\.id\),/);
  assert.match(stops, /'summary',/);
  assert.doesNotMatch(stops, /'sheets'/, 'the second stop is gone');
  // …and its screen with it.
  assert.doesNotMatch(WIZ, /carcAt === 'sheets'/);
  assert.doesNotMatch(WIZ, /if \(stop === 'sheets'\) return 'Sheets assignment';[\s\S]{0,400}carcassTypes\.find/);
});

test('F4 — the dialog AFTER it is untouched: *"to tak musi byc, to zostaw"*', () => {
  assert.match(WIZ, /carcAt === 'summary'/);
  assert.match(WIZ, /data-cnc-corner="1"/);
  assert.match(WIZ, /data-cnc-corner-option=\{id\}/);
  assert.match(WIZ, /\['dogbone', 'Dog-bone \(CNC\)'\], \['square', 'Square \(hand-chisel\)'\]/);
  assert.match(WIZ, /<JoineryPreview profile=\{profile\} joinery=\{joinery\} \/>/);
  assert.match(WIZ, /data-save-carcasses="1"/);
});

// ══ nothing is lost, only moved ════════════════════════════════════════════

test('F4 — every control the removed stop owned answers to its own hook', () => {
  const rows = survivors((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'))
    .filter((r) => r.was === 'carcases · sheets');
  assert.equal(rows.length, 4, 'the four the stop owned');
  for (const r of rows) assert.ok(r.found, `${r.control} — ${r.hook} is in no file`);
  // The list is not a comment: it is what `--survivors` prints and what the PR
  // quotes, and the sheet size is deliberately its FIRST row.
  assert.equal(SURVIVORS[0].control, 'Sheet size (jumbo etc.)');
});

test('F4 — the SIZE control keeps every option it has today, jumbo included', () => {
  // The row is the SAME component the Settings menu draws — imported, never
  // copied — so "every option" is the profile's own list and cannot drift.
  assert.match(WIZ, /import \{ HingeHardware, SheetSizeRow \} from '\.\/SettingsPanel\.jsx'/);
  assert.match(SETTINGS, /export function SheetSizeRow\(/);
  const ids = P.cnc.sheetOptions.map((o) => o.id);
  assert.deepEqual(ids, ['jumbo', 'standard', 'tenfoot', 'other']);
  assert.equal(P.cnc.sheetOptions.find((o) => o.id === 'jumbo').width, 2070);
  assert.equal(P.cnc.sheetOptions.find((o) => o.id === 'jumbo').height, 2800);
  // …and `Other…` still means "the two numbers below are typed".
  assert.match(SETTINGS, /data-sheet-width=\{family\}/);
  assert.match(SETTINGS, /data-sheet-height=\{family\}/);
});

test('F4 — and it writes exactly what the removed stop wrote', () => {
  const row = WIZ.slice(WIZ.indexOf('const sheetSizeRow ='), WIZ.indexOf('const slotPicker ='));
  assert.match(row, /family="carcasses"/);
  assert.match(row, /sheetCarcass: size/);
  assert.match(row, /data-sheets-assignment="1"/);
  assert.match(row, /data-sheet-assign=\{t\.id\}/);
  assert.match(row, /data-wizard-node="carcases\.sheets"/);
  // The engine reads the same field it always did — nothing about the resolver
  // moved, which is why a project set up through the new single dialog produces
  // the same record as the old two.
  const jumbo = { width: 2070, height: 2800 };
  const withJumbo = { ...P, cnc: { ...P.cnc, sheetCarcass: jumbo } };
  assert.deepEqual(sheetSizeForFamily(withJumbo, 'carcasses'), jumbo);
  assert.equal(sheetOptionIdFor(withJumbo, 'carcasses'), 'jumbo');
  // …and the fronts' own answer is untouched by the carcasses' (F6 moves that
  // one; this proves the two families never shared a field).
  assert.notDeepEqual(sheetSizeForFamily(withJumbo, 'fronts'), jumbo);
});

test('F4 — the node kept its id, its tab and its audience', () => {
  const node = WIZARD_NODES.find((n) => n.id === 'carcases.sheets');
  assert.ok(node, 'the node survives the merge');
  assert.equal(node.tab, 'carcases');
  assert.equal(node.audience, 'factory');
  assert.equal(nodeVisible('carcases.sheets', 'factory'), true);
  assert.ok(hiddenNodes('retail').includes('carcases.sheets'), 'a sheet size is still a workshop fact');
});

test('F4 — the panel has a place for it, under the board it is a sheet of', () => {
  assert.match(PANEL, /sheetSize = null/);
  assert.match(PANEL, /\{boardSelect\}[\s\S]{0,160}\{sheetSize\}/, 'the sheet stands UNDER the board');
  assert.match(WIZ, /sheetSize=\{sheets \? sheetSizeRow\(kind, t\) : null\}/);
  // The carcass dialog asks for it; the front dialog is F6's.
  const call = WIZ.slice(WIZ.indexOf("slotPicker('carcass', carcTypeAt, {"), WIZ.indexOf("carcAt === 'summary'"));
  assert.match(call, /sheets: true,/);
});
