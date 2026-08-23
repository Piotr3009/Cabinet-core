import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { visibleNodes, nodeVisible } from '../src/lib/wizardTabs.js';
import { NO_TABLE_NOTE } from '../src/lib/settingsSetsDb.js';
import { applySettingsSet, listSettingsSets, saveSettingsSet } from '../src/lib/settingsSets.js';
import { migrateDesign } from '../src/engine/design.js';

// ─── TURN 44 · F6 · F7 · F8 — THE LAST THREE TABS ───────────────────────────
//
// F6 (Hardware): all the existing choices, relocated; retail sees ONLY colour.
// F7 (Produkcja): factory-only — `Infill at the wall`, and the measurements
//                 and sheet sizes grouped PER CHOSEN MATERIAL.
// F8 (Podsumowanie): the summary, retail-filtered, and the finale that asks
//                 "Zapisać te ustawienia jako Twój standard?" once, at the end.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const HW = readFileSync(new URL('../src/components/WizardHardware.jsx', import.meta.url), 'utf8');
const FINALE = readFileSync(new URL('../src/components/SaveSettingsSetModal.jsx', import.meta.url), 'utf8');
const DB = readFileSync(new URL('../src/lib/settingsSetsDb.js', import.meta.url), 'utf8');
const STORE = readFileSync(new URL('../src/stores/settingsSetsStore.js', import.meta.url), 'utf8');
const SQL = readFileSync(new URL('../supabase/migrations/t44_settings_sets.sql', import.meta.url), 'utf8');

// ══ F6 ═════════════════════════════════════════════════════════════════════

test('F6 — every hardware row the surface had is on tab 4', () => {
  for (const hook of [
    'data-hardware-choice=', 'data-hinge-standard="1"', 'data-hinge-plate-pilot="1"',
    'data-shelf-sleeve="1"', 'data-runner-system="1"', 'data-runner-variant="1"',
  ]) {
    assert.ok(WIZ.includes(hook), `${hook} survived the move`);
  }
  assert.match(WIZ, /<HingeHardware/, 'the T19 hinge block came across whole');
  assert.match(WIZ, /tab === 'hardware' && \(/);
});

test('F6 — RETAIL SEES ONLY COLOUR', () => {
  assert.deepEqual(visibleNodes('hardware', 'retail').map((n) => n.id), ['hardware.colour']);
  // …and the component that draws the two colour questions knows the head.
  assert.match(HW, /export default function WizardHardware\(\{ audience = 'factory' \}\)/);
  assert.match(HW, /const retail = audience === 'retail';/);
  assert.match(WIZ, /<WizardHardware audience=\{audience\} \/>/);
  // The four workshop blocks are NOT BUILT for retail — no ghosts.
  for (const guard of ['{!retail && (']) assert.ok(HW.includes(guard));
  assert.equal((HW.match(/\{!retail && \(/g) || []).length, 4,
    'soft-close, push-to-open, the plinth line and the automat’s verdict');
  assert.doesNotMatch(HW, /disabled=\{retail\}/, 'nothing is greyed out — it is absent');
});

test('F6 — the two colour questions stay for BOTH heads', () => {
  const beforeGuards = HW.slice(0, HW.indexOf('{!retail && ('));
  assert.match(beforeGuards, /data-hinge-finish="1"/);
  assert.match(beforeGuards, /data-shelf-sleeve="1"/);
  assert.ok(nodeVisible('hardware.colour', 'retail'));
});

// ══ F7 ═════════════════════════════════════════════════════════════════════

test('F7 — Produkcja is factory-only, all of it', () => {
  assert.deepEqual(visibleNodes('production', 'retail'), []);
  assert.equal(visibleNodes('production', 'factory').length, 3);
});

test('F7 — `Infill at the wall` lives here (the owner’s own TBD, pt 5)', () => {
  assert.match(WIZ, /data-wizard-node="production\.infill"/);
  assert.match(WIZ, /data-infill-side-width="1"/);
  assert.match(WIZ, /data-settings-section="infill"/);
});

test('F7 — the measurements are grouped PER MATERIAL, by name', () => {
  assert.match(WIZ, /const materialBlocks = \[/);
  assert.match(WIZ, /data-material-block=\{b\.key\}/);
  // T45 F6: the block's title line is composed by `lib/productionNames.js` and
  // set FULL-SIZE — *"it is the information, not a footnote"* — so the label
  // and the suffix are now two fields the title puts together.
  assert.match(WIZ, /suffix: 'the carcass board',/);
  assert.match(WIZ, /suffix: 'the front board',/);
  assert.match(WIZ, /data-material-block-title=\{b\.key\}/);
  // the SAME rows and the SAME setters — a grouping is a `.map`
  assert.match(WIZ, /row: thicknessRows\.find\(\(r\) => r\.id === `carcass\$\{i \+ 1\}`\)/);
  assert.match(WIZ, /onCommit=\{\(v\) => commitMeasured\(b\.row, v\)\}/);
  assert.match(WIZ, /setSlotThickness\(b\.row\.id, \{ confirmed: e\.target\.checked \}\)/);
  // …and the sheet size stands with the material it is for — which as of T45
  // F6 is the MATERIAL STEP, not this tab (iron rule 4, by name).
  assert.match(WIZ, /data-front-sheets-assignment="1"/);
  assert.doesNotMatch(WIZ.slice(WIZ.indexOf("tab === 'production'")), /<SheetSizeRow/);
});

test('F7 — 2 carcass types → 2 carcass blocks, and the box gets its own', () => {
  // The list is built from the project's own types, so N is whatever N is.
  assert.match(WIZ, /\.\.\.carcassTypes\.map\(\(t, i\) => \(\{/);
  assert.match(WIZ, /\.\.\.frontTypes\.slice\(0, 2\)\.map\(\(t, i\) => \(\{/);
  assert.match(WIZ, /key: 'box',/);
  assert.match(WIZ, /data-box-gate-message="1"/, 'the drawer-box gate came with it');
});

// ══ F8 ═════════════════════════════════════════════════════════════════════

// ─── T45 F4 MOVED THE SUMMARY TO THE WIZARD'S STEP 6 ───────────────────────
// *"Wizard step `6. Hardware` REMOVED → replaced by `6. Summary`."* T44's
// settings-summary sub-tab and T44's hardware step were two endings to one
// walk; F4 keeps the one that shows the WHOLE project. The rules below are the
// same rules, asked of the screen that now carries them.
const SUMMARY = readFileSync(new URL('../src/components/WizardSummary.jsx', import.meta.url), 'utf8');

test('F8 — the summary is grouped by section and filtered by head', () => {
  assert.match(SUMMARY, /data-summary="1"/);
  assert.match(SUMMARY, /data-summary-section=\{node\}/);
  assert.match(SUMMARY, /data-summary-row=\{label\}/);
  assert.match(SUMMARY, /data-summary-change=\{node\}/, 'a wrong line is one click from its tab');
  // Every section is built through `nodeVisible(node)`, so a section a client
  // may not see is one that is NOT BUILT — the same filter the tabs use.
  assert.match(SUMMARY, /if \(!nodeVisible\(node, audience\)\) return null;/);
  assert.match(SUMMARY, /nodeVisible\('summary\.save-set', audience\)/);
});

test('F8 — the finale is its own modal, with the big Y/N and the name field', () => {
  assert.match(SUMMARY, /data-open-save-set="1"/);
  assert.match(SUMMARY, /<SaveSettingsSetModal/);
  assert.match(FINALE, /data-set-answer="yes"/);
  assert.match(FINALE, /data-set-answer="no"/);
  assert.match(FINALE, /data-set-name="1"/);
  assert.match(FINALE, /<Modal/, 'on the one shell — draggable, beside its trigger');
  assert.match(FINALE, /name="save-settings-set"/);
});

test('F8 — the payload is the WHOLE settings object', () => {
  assert.match(DB, /const payload = migrateDesign\(design\);/);
  assert.match(DB, /\.insert\(\{ name: .*, payload \}\)/);
  assert.match(SQL, /payload +jsonb not null/);
});

test('F8 — SQL PRZED push: the table, its RLS, and owner-only policies', () => {
  assert.match(SQL, /create table if not exists public\.cc_settings_sets/);
  assert.match(SQL, /id +uuid primary key default gen_random_uuid\(\)/);
  assert.match(SQL, /name +text not null/);
  assert.match(SQL, /created_at timestamptz not null default now\(\)/);
  assert.match(SQL, /alter table public\.cc_settings_sets enable row level security;/);
  for (const verb of ['select', 'insert', 'update', 'delete']) {
    assert.match(SQL, new RegExp(`create policy cc_settings_sets_${verb} on public\\.cc_settings_sets`));
  }
  assert.equal((SQL.match(/owner = auth\.uid\(\)/g) || []).length >= 4, true, 'owner-only, every verb');
  // idempotent, like every other migration in this house
  assert.match(SQL, /create index if not exists/);
  assert.match(SQL, /drop policy if exists/);
});

test('F8 — WITHOUT the SQL the app degrades gracefully, and says so in amber', () => {
  // One code path for mock mode, a dead network and a missing table.
  assert.match(DB, /if \(mock \|\| error \|\| !Array\.isArray\(data\)\) \{/);
  assert.match(DB, /source: 'local',/);
  assert.match(DB, /export const NO_TABLE_NOTE/);
  assert.match(NO_TABLE_NOTE, /t44_settings_sets\.sql/);
  assert.match(FINALE, /NO_TABLE_NOTE/);
  assert.match(WIZ, /supabase\/migrations\/t44_settings_sets\.sql and they follow the account/);
  // The local shelf is written FIRST and unconditionally.
  assert.match(STORE, /const result = saveSettingsSet\(get\(\)\.storage, \{ name, design, at \}\);\s*\n\s*set\(/);
  assert.match(STORE, /const db = await saveSettingsSetDb\(name, design\);/);
  assert.match(STORE, /source: db\.ok \? 'db' : 'local'/);
  // Nothing in the DB layer can throw: `withDb` never rejects, and every
  // function here returns a shape rather than raising.
  assert.doesNotMatch(DB, /throw /);
});

test('F8 — SAVE → RELOAD → the set is in F3’s dropdown and re-applies byte-equal', () => {
  // The round-trip F8 names, on the shelf that always exists — which is the
  // path a workshop without the migration walks, and the one under the table
  // when there is one (the store writes it first, always).
  const bin = new Map();
  const storage = {
    getItem: (k) => (bin.has(k) ? bin.get(k) : null),
    setItem: (k, v) => bin.set(k, v),
  };
  const design = migrateDesign({
    projectType: 'wardrobe',
    scope: 'wall',
    sheen: 25,
    infill: { sideWidth: 42 },
    cncCorner: 'square',
    fronts: { style: 'HJ', handle: null },
    drawerBoxes: { mode: 'ready' },
    heights: { tall: 2100, toeKick: 100 },
  });

  const { set, replaced } = saveSettingsSet(storage, { name: 'Nasz standard', design, at: 1 });
  assert.equal(replaced, false);
  assert.ok(set.id);

  // …reload: a fresh read of the same shelf, as a new session would do.
  const listed = listSettingsSets(storage);
  assert.deepEqual(listed.map((s) => s.name), ['Nasz standard'], 'it is in F3’s dropdown');

  // …and re-applying it puts every setting back, byte for byte, on top of a
  // project that has answered nothing. The two facts a set never carries are
  // the ones turn 7 named: which KIND of job it is, and how much of the room.
  const blank = migrateDesign({ projectType: 'kitchen', scope: 'room' });
  const applied = applySettingsSet(blank, { design });
  assert.equal(applied.projectType, 'kitchen', 'the set does not change what the job IS');
  assert.equal(applied.scope, 'room');
  const strip = (d) => JSON.stringify({ ...d, projectType: null, scope: null });
  assert.equal(strip(applied), strip(migrateDesign(design)), 'everything else is byte-equal');

  // Saving under the SAME name replaces rather than growing a second row.
  const again = saveSettingsSet(storage, { name: 'nasz standard', design, at: 2 });
  assert.equal(again.replaced, true);
  assert.equal(listSettingsSets(storage).length, 1);
});
