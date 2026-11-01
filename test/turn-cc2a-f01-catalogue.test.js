/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F1 . ONE CATALOGUE, IDS THAT NEVER CHANGE (CLAUDE.md T-CC2a law 1).
// The owner, 01.11.2026, 12:50: *"CC powinien miec swoja (nie widoczna)
// numeracje materialow, a nazwa tylko sie wyswietla"*; 12:34: *"kazdy material
// musi miec identyfikator ... nie moze byc po nazwie"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

import {
  DEPARTMENTS, SHEET_BRANDS, catalogueEntries, entryById, entriesOf, catalogueIdOfBoard, catalogueIdOfLine,
} from '../src/engine/catalogue.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url).pathname;
const LEDGER = JSON.parse(readFileSync(join(ROOT, 'test/fixtures/catalogue-ids.v1.json'), 'utf8'));
const DECORS = JSON.parse(readFileSync(join(ROOT, 'public/decors/egger/egger-decors.json'), 'utf8')).decors;
const ID_RULE = /^[a-z0-9][a-z0-9._-]{0,119}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCRIPT = join(ROOT, 'scripts/t-cc2a-catalogue.mjs');
const meaningOf = (e) => Object.fromEntries(['department', 'brand', 'kind', 'decorId', 'thickness', 'role', 'articleNo']
  .filter((k) => e[k] != null).map((k) => [k, e[k]]));

test('F1.1 · the seven departments in the window\'s order, the six sheet brands with three soon', () => {
  assert.deepEqual(DEPARTMENTS.map((d) => d.id), ['sheets', 'hinges', 'runners', 'ironmongery', 'internal', 'paint', 'consumables']);
  assert.deepEqual(DEPARTMENTS.map((d) => d.label), ['Sheets', 'Hinges', 'Runners', 'Ironmongery', 'Internal fittings', 'Paint', 'Consumables']);
  assert.deepEqual(SHEET_BRANDS.map((b) => b.id), ['egger', 'mdf', 'generic', 'veneer', 'fenix', 'kronospan']);
  assert.deepEqual(SHEET_BRANDS.filter((b) => b.soon).map((b) => b.id), ['veneer', 'fenix', 'kronospan']);
  for (const b of SHEET_BRANDS.filter((x) => x.soon)) assert.equal(entriesOf('sheets', b.id).length, 0, `${b.id} has no entries tonight`);
  for (const d of DEPARTMENTS) assert.ok(entriesOf(d.id).length > 0, `${d.id} holds entries`);
});

test('F1.2 · ids unique, every id the JC rule, none the shape of a uuid; every entry its department and unit', () => {
  const all = catalogueEntries();
  assert.ok(Object.isFrozen(all) && Object.isFrozen(all[0]), 'the catalogue is frozen');
  const ids = all.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'ids unique');
  for (const e of all) {
    assert.match(e.id, ID_RULE, e.id);
    assert.doesNotMatch(e.id, UUID, e.id);
    assert.ok(DEPARTMENTS.some((d) => d.id === e.department), `${e.id}: department`);
    assert.ok(['sheet', 'edging', 'hardware', 'paint', 'other'].includes(e.kind), `${e.id}: kind`);
    assert.ok(e.name && e.unit, `${e.id}: name and unit`);
    assert.equal(entryById(e.id), e);
  }
});

test('F1.3 · the sheets: every Egger decor at every thickness of the profile, MDF, the three generics, an edging a decor', () => {
  const t = [...new Set([...P.projectSettings.boardThicknessOptions, ...P.board.thicknessOptions, ...P.front.thicknessOptions])].sort((a, b) => a - b);
  assert.deepEqual(t, [18, 19, 22, 25], 'the union of the profile\'s three lists');
  assert.equal(DECORS.length, 85);
  assert.equal(entriesOf('sheets', 'egger').length, 85 * 4);
  assert.deepEqual(entriesOf('sheets', 'mdf').map((e) => e.thickness), [18, 19, 22, 25]);
  assert.deepEqual(entriesOf('sheets', 'generic').map((e) => e.thickness), [18, 22, 25]);
  const store = readFileSync(join(ROOT, 'src/stores/materialAssignmentStore.js'), 'utf8');
  for (const t of [18, 22, 25]) assert.match(store, new RegExp(`id: 'generic-${t}'.*thickness: ${t}`), `the store's generic ${t}`);
  assert.equal(catalogueEntries().filter((e) => e.kind === 'edging').length, 85);
  // *"nazwa musi byc numer decoru w nazwie"*: a sheet name holds its decor code and texture.
  for (const d of DECORS) {
    for (const th of t) {
      const e = entryById(`sheet.egger.${d.id.toLowerCase()}.${th}`);
      assert.ok(e, `${d.id} at ${th}`);
      assert.ok(e.name.includes(d.code) && e.name.includes(d.texture), `${e.name} holds ${d.code} ${d.texture}`);
      assert.equal(e.decorId, d.id);
    }
  }
  assert.equal(entryById('sheet.egger.h3325_28.18').name, 'Egger H3325 ST28 Tobacco Gladstone Oak, 18 mm');
  for (const id of ['paint.bespoke', 'paint.primer', 'paint.solvent', 'stain.bespoke', 'lacquer']) assert.equal(entryById(id)?.department, 'paint', id);
});

test('F1.4 · the ledger: every id issued tonight is present with the same meaning, and the catalogue holds no id it lacks', () => {
  const ids = Object.keys(LEDGER.ids);
  assert.ok(ids.length >= 588, `the ledger holds ${ids.length}`);
  for (const id of ids) {
    const e = entryById(id);
    assert.ok(e, `ledger id ${id} is in the catalogue (an id is never deleted)`);
    assert.deepEqual(meaningOf(e), LEDGER.ids[id], `${id} keeps its meaning`);
  }
  for (const e of catalogueEntries()) assert.ok(LEDGER.ids[e.id], `${e.id} is in the ledger`);
});

test('F1.5 · the script run twice writes the same file, and it only ever APPENDS', () => {
  const clean = execFileSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' });
  assert.match(clean, /data CLEAN; ledger CLEAN/, 'the file on disk IS what the sources write');

  const dir = mkdtempSync(join(tmpdir(), 'cc2a-cat-'));
  const data = join(dir, 'catalogueData.js');
  const ledger = join(dir, 'catalogue-ids.v1.json');
  const original = readFileSync(join(ROOT, 'src/engine/catalogueData.js'), 'utf8');
  // An older file: the last two entries not yet issued, and one line the sources no longer produce (retired, kept).
  const lines = original.split('\n');
  const close = lines.lastIndexOf(']);');
  const older = [...lines.slice(0, close - 2),
    "  { id: 'sheet.egger.retired_1.18', department: 'sheets', brand: 'egger', kind: 'sheet', name: 'An old decor, 18 mm', decorId: 'RETIRED_1', thickness: 18, unit: 'm²', retired: true },",
    ...lines.slice(close)].join('\n');
  writeFileSync(data, older);
  copyFileSync(join(ROOT, 'test/fixtures/catalogue-ids.v1.json'), ledger);
  const env = { ...process.env, CC_CATALOGUE_DATA: data, CC_CATALOGUE_LEDGER: ledger };
  execFileSync(process.execPath, [SCRIPT], { env, encoding: 'utf8' });
  const once = readFileSync(data, 'utf8');
  assert.ok(once.startsWith(older.slice(0, older.lastIndexOf(']);'))), 'every line written before is kept, byte for byte');
  assert.ok(once.includes("id: 'sheet.egger.retired_1.18'"), 'a line the sources no longer produce stays');
  for (const l of lines.slice(close - 2, close)) assert.ok(once.includes(l), 'the missing entries are appended');
  execFileSync(process.execPath, [SCRIPT], { env, encoding: 'utf8' });
  assert.equal(readFileSync(data, 'utf8'), once, 'a second run writes the identical file');
});

test('F1.6 · a retired entry stays in the catalogue and leaves the window', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cc2a-ret-'));
  mkdirSync(join(dir, 'engine'));
  const src = readFileSync(join(ROOT, 'src/engine/catalogueData.js'), 'utf8')
    .replace("{ id: 'sheet.mdf.19', department: 'sheets'", "{ id: 'sheet.mdf.19', retired: true, department: 'sheets'");
  writeFileSync(join(dir, 'engine/catalogueData.js'), src);
  writeFileSync(join(dir, 'engine/projectSettings.js'), `export * from '${join(ROOT, 'src/engine/projectSettings.js')}';\n`);
  copyFileSync(join(ROOT, 'src/engine/catalogue.js'), join(dir, 'engine/catalogue.js'));
  const copy = await import(join(dir, 'engine/catalogue.js'));
  assert.ok(copy.entryById('sheet.mdf.19')?.retired, 'retired, and still found by its id');
  assert.ok(copy.catalogueEntries().some((e) => e.id === 'sheet.mdf.19'));
  assert.ok(!copy.entriesOf('sheets', 'mdf').some((e) => e.id === 'sheet.mdf.19'), 'the window no longer offers it');
});

test('F1.7 · law 1: renaming every entry in a copy of the data changes no id and no BOM line key', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cc2a-ren-'));
  mkdirSync(join(dir, 'engine'));
  const renamed = readFileSync(join(ROOT, 'src/engine/catalogueData.js'), 'utf8')
    .replace(/name: '((?:[^'\\]|\\.)*)'/g, (m, n) => `name: 'Renamed ${n.length}'`);
  assert.notEqual(renamed, readFileSync(join(ROOT, 'src/engine/catalogueData.js'), 'utf8'));
  writeFileSync(join(dir, 'engine/catalogueData.js'), renamed);
  writeFileSync(join(dir, 'engine/projectSettings.js'), `export * from '${join(ROOT, 'src/engine/projectSettings.js')}';\n`);
  copyFileSync(join(ROOT, 'src/engine/catalogue.js'), join(dir, 'engine/catalogue.js'));
  const copy = await import(join(dir, 'engine/catalogue.js'));
  assert.ok(copy.entryById('sheet.mdf.18').name.startsWith('Renamed'), 'the names changed');
  const boards = [
    { source: 'egger', finish_id: 'egger:H3325_28', thickness: 18 }, { source: 'spray', thickness: 25 },
    { source: 'raw', thickness: 18 }, { source: null, thickness: 22 }, { source: 'laminate', finishId: 'egger:U999_12', thickness: 19 },
  ];
  for (const b of boards) assert.deepEqual(copy.catalogueIdOfBoard(b, P), catalogueIdOfBoard(b, P), JSON.stringify(b));
  const lines = [
    { role: 'hinges', spec: { angle: 155, finish: 'nickel', family: '71B7550' }, spec_label: '3 per door' },
    { role: 'runner_pairs', spec: { system: '760H', nl: 500, variant: 'T' } },
    { role: 'cabineo_connector', spec: { variant: '12', mounting: 'flush' } },
    { role: 'led_strip', label: 'LED strip 3000 K' },
    { role: 'edging', decorId: 'H3325_28' }, { role: 'paint' },
  ];
  for (const l of lines) {
    const a = copy.catalogueIdOfLine(l);
    const b = catalogueIdOfLine(l);
    assert.ok(a.id, JSON.stringify(l));
    assert.equal(a.id, b.id, `${l.role}: the same id, whatever the name says`);
    assert.equal(`cat:${a.id}`, `cat:${b.id}`, 'the same BOM line key');
  }
});

test('F1 · no em or en dash in the catalogue, the script, or the ledger', () => {
  for (const rel of ['src/engine/catalogue.js', 'src/engine/catalogueData.js', 'scripts/t-cc2a-catalogue.mjs', 'test/fixtures/catalogue-ids.v1.json']) {
    assert.doesNotMatch(readFileSync(join(ROOT, rel), 'utf8'), /[\u2013\u2014]/, rel);
  }
});
