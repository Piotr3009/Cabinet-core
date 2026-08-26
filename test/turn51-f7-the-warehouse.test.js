// ─── T51 · F7 — THE MATERIALS WAREHOUSE ─────────────────────────────────────
//
// As mocked up and agreed with the owner on 25.08.2026. `Database ▸ Materials`
// opens the warehouse, not the design modal.
//
// Every claim CLAUDE.md F7 makes is asserted here, in its own order, because
// F7 is a list of promises rather than one rule and a list is exactly the kind
// of feature that ships four fifths of itself.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  CATEGORIES, CSV_COLUMNS, JC_NOTICE, OTHERS, PRICE_IMPORT, PRICE_TYPED,
  categoryOf, departmentCounts, departmentLabel, fromCsv, importSummary,
  materialsFilename, mergeImport, migrateMaterial, newMaterial,
  projectMaterialNames, renameSubcategory, rowsOfDepartment, subcategoriesInUse,
  toCsv, usedInProject,
} from '../src/engine/warehouse.js';

const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const PANEL = read('components/WarehouseModal.jsx');
const STORE = read('stores/warehouseStore.js');
const DB = read('lib/warehouseDb.js');
const TOPBAR = read('components/TopBar.jsx');
const SQL = readFileSync(new URL('../supabase/migrations/t51_warehouse.sql', import.meta.url), 'utf8');

const AT = new Date(2026, 7, 26, 8, 30);

// ─── the model ─────────────────────────────────────────────────────────────

test('F7 — the model is Production Core’s twelve, in PC’s order', () => {
  assert.deepEqual(CSV_COLUMNS, [
    'item_number', 'name', 'category', 'subcategory', 'size', 'thickness',
    'color', 'unit', 'cost_per_unit', 'image_url', 'jc_uuid', 'notes',
  ]);
  const m = migrateMaterial({ name: 'x' });
  for (const c of CSV_COLUMNS) assert.ok(c in m, `the row is missing ${c}`);
});

test('F7 — `id` and `price_source` are OURS and are NOT in the CSV', () => {
  // A column PC does not know would break *"the same columns as PC so the two
  // files interchange"* the first time somebody opened one file in the other.
  assert.ok(!CSV_COLUMNS.includes('id'));
  assert.ok(!CSV_COLUMNS.includes('price_source'));
  assert.match(toCsv([]).split('\r\n')[0], /^item_number,name,category/);
});

test('F7 — the owner’s nine categories, and Others for a row with none', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.id), [
    'sheets', 'timber', 'hinges', 'runners', 'other_hardware',
    'bead', 'drawer_pins', 'paints', 'consumables',
  ]);
  assert.equal(categoryOf({ category: 'sheets' }), 'sheets');
  assert.equal(categoryOf({ category: 'Other Hardware' }), 'other_hardware', 'spelt as a human would');
  assert.equal(categoryOf({}), OTHERS.id, 'a row with no category lands in Others');
  assert.equal(categoryOf({ category: 'nonsense' }), OTHERS.id);
  assert.equal(departmentLabel(OTHERS.id), 'Others');
});

test('F7 — the item number is automatic, and never worn twice', () => {
  const rows = [];
  for (let i = 0; i < 3; i += 1) rows.push(newMaterial(rows, { name: `m${i}` }));
  assert.deepEqual(rows.map((r) => r.item_number), ['0001', '0002', '0003']);
  // Delete the middle one and the next is 0004, not 0003 again — T40's law.
  const gapped = [rows[0], rows[2]];
  assert.equal(newMaterial(gapped, { name: 'next' }).item_number, '0004');
});

test('F7 — departments carry counts, Others included', () => {
  const rows = [
    newMaterial([], { name: 'a', category: 'sheets' }),
    newMaterial([], { name: 'b', category: 'sheets' }),
    newMaterial([], { name: 'c' }),
  ];
  const counts = departmentCounts(rows);
  assert.equal(counts.find((d) => d.id === 'sheets').count, 2);
  assert.equal(counts.find((d) => d.id === 'others').count, 1);
  assert.equal(counts.length, CATEGORIES.length + 1, 'every department is listed, even at zero');
  assert.equal(rowsOfDepartment(rows, 'sheets').length, 2);
});

// ─── subcategories are FLAT ────────────────────────────────────────────────

test('F7 — a subcategory is a text field, one level, renameable in bulk', () => {
  const rows = [
    newMaterial([], { name: 'a', subcategory: 'Egger' }),
    newMaterial([], { name: 'b', subcategory: 'Egger' }),
    newMaterial([], { name: 'c', subcategory: 'Kronospan' }),
  ];
  assert.deepEqual(subcategoriesInUse(rows), ['Egger', 'Kronospan']);
  const renamed = renameSubcategory(rows, 'Egger', 'Egger UK');
  assert.deepEqual(renamed.map((r) => r.subcategory), ['Egger UK', 'Egger UK', 'Kronospan'],
    'every row that wore the old name, in one pass');
  // A string, never a tree.
  assert.equal(typeof rows[0].subcategory, 'string');
});

// ─── the CSV, both ways ────────────────────────────────────────────────────

test('F7 — a CSV round-trips, commas and quotes included', () => {
  const rows = [newMaterial([], {
    name: 'MDF, 18mm "premium"', category: 'sheets', subcategory: 'Egger',
    size: '2800 × 2070', thickness: 18, color: 'White', unit: 'sheet',
    cost_per_unit: 42.5, notes: 'line one, line two',
  })];
  const back = fromCsv(toCsv(rows));
  assert.equal(back.error, null);
  assert.equal(back.rows.length, 1);
  for (const c of CSV_COLUMNS) {
    assert.equal(String(back.rows[0][c] ?? ''), String(rows[0][c] ?? ''), `${c} did not survive`);
  }
});

test('F7 — a file whose columns are in another order still reads', () => {
  const back = fromCsv('name,cost_per_unit,category\r\n18mm MDF,42,sheets\r\n');
  assert.equal(back.error, null);
  assert.equal(back.rows[0].name, '18mm MDF');
  assert.equal(back.rows[0].cost_per_unit, 42);
  assert.equal(back.rows[0].category, 'sheets');
});

test('F7 — and a file that is not a materials CSV is refused, not guessed at', () => {
  assert.match(fromCsv('a,b,c\r\n1,2,3\r\n').error, /does not look like a materials CSV/);
  assert.match(fromCsv('').error, /empty/);
});

// ─── the import: overwrite, never duplicate ────────────────────────────────

test('F7 — an import matches on jc_uuid and OVERWRITES, never adds a second', () => {
  const existing = [
    newMaterial([], { name: '18mm MDF', category: 'sheets', jc_uuid: 'u-1', cost_per_unit: 42 }),
    newMaterial([], { name: 'Blum hinge', category: 'hinges', jc_uuid: 'u-2' }),
  ];
  const result = mergeImport(existing, [
    { name: '18mm MDF (2026 price)', category: 'sheets', jc_uuid: 'u-1', cost_per_unit: 50 },
    { name: 'Brand new thing', category: 'timber', jc_uuid: 'u-9' },
  ]);
  assert.equal(result.rows.length, 3, 'ONE row was replaced, one was added');
  assert.equal(result.updated, 1);
  assert.equal(result.added, 1);
  const mdf = result.rows.filter((r) => r.jc_uuid === 'u-1');
  assert.equal(mdf.length, 1, 'never a second row for one uuid');
  assert.equal(mdf[0].name, '18mm MDF (2026 price)', 'and it is the incoming row');
  // The warehouse's OWN fields survive: the id and the code are what a shelf
  // label says, and an import must not renumber the shelf.
  assert.equal(mdf[0].id, existing[0].id);
  assert.equal(mdf[0].item_number, existing[0].item_number);
});

test('F7 — a row with NO uuid is a new row, never a name match', () => {
  // Matching on name as well would cost a warehouse its integrity the first
  // time two suppliers both sell "18mm MDF".
  const existing = [newMaterial([], { name: '18mm MDF', jc_uuid: 'u-1' })];
  const result = mergeImport(existing, [{ name: '18mm MDF' }]);
  assert.equal(result.rows.length, 2);
  assert.equal(result.added, 1);
  assert.equal(result.updated, 0);
});

test('F7 — a hand-typed price is overwritten and SAID, never silently', () => {
  // *"the record says WHICH, so a re-import cannot silently overwrite a
  // hand-typed figure without saying so."*
  const typed = newMaterial([], { name: 'MDF', jc_uuid: 'u-1', cost_per_unit: 42 });
  assert.equal(typed.price_source, PRICE_TYPED, 'a row typed here is typed');
  const result = mergeImport([typed], [{ name: 'MDF', jc_uuid: 'u-1', cost_per_unit: 50 }]);
  assert.deepEqual(result.repriced, [{ name: 'MDF', item_number: typed.item_number, was: 42, now: 50 }]);
  assert.equal(result.rows[0].cost_per_unit, 50, 'the import IS applied — silence would be the other fault');
  assert.equal(result.rows[0].price_source, PRICE_IMPORT, 'and the record now says where it came from');
  assert.match(importSummary(result), /1 hand-typed price changed/);
});

test('F7 — a price that CAME from an import moves without a word', () => {
  const imported = migrateMaterial({ name: 'MDF', jc_uuid: 'u-1', cost_per_unit: 42, price_source: PRICE_IMPORT });
  const result = mergeImport([imported], [{ name: 'MDF', jc_uuid: 'u-1', cost_per_unit: 50 }]);
  assert.deepEqual(result.repriced, [], 'nobody typed it, so nobody is being overruled');
});

test('F7 — and the app SAYS that linking needs the JC list first', () => {
  assert.match(JC_NOTICE, /needs the JC list imported first/i);
  assert.match(PANEL, /data-warehouse-jc-note="1"/);
  assert.match(PANEL, /\{JC_NOTICE\}/);
});

// ─── the two exports (decision 3) ──────────────────────────────────────────

test('F7 — TWO exports, and the filename is CLAUDE.md’s own', () => {
  assert.equal(
    materialsFilename({ project: 'Anderson Kitchen', now: AT }),
    'Cabinet Core - Anderson Kitchen - 2026-08-26 08-30 - materials.csv',
  );
  // The CATALOGUE has no project to name — it is the whole warehouse.
  assert.equal(
    materialsFilename({ kind: 'catalogue', now: AT }),
    'Cabinet Core - Full catalogue - 2026-08-26 08-30 - materials.csv',
  );
  // A project name a file system would refuse comes out clean.
  assert.equal(
    materialsFilename({ project: 'Smith / kitchen 2', now: AT }),
    'Cabinet Core - Smith kitchen 2 - 2026-08-26 08-30 - materials.csv',
  );
  assert.match(PANEL, /data-warehouse-export-all/);
  assert.match(PANEL, /data-warehouse-export-project/);
});

test('F7 — the shopping list is what THIS project uses', () => {
  const rows = [
    newMaterial([], { name: '18mm MDF', jc_uuid: 'u-1' }),
    newMaterial([], { name: 'Egger H1234', jc_uuid: 'u-2' }),
    newMaterial([], { name: 'Something else' }),
  ];
  // Matched on the name the project's own records carry…
  const used = usedInProject(rows, { names: ['18 mm mdf', 'EGGER H1234'] });
  assert.deepEqual(used.map((r) => r.name).sort(), ['18mm MDF', 'Egger H1234'],
    'case and spacing are not a supplier difference');
  // …and gathered by WALKING the project rather than from a list of paths that
  // would go stale the next time the design grew a material field.
  const names = projectMaterialNames({ carcass: { board: '18mm MDF' } }, { fronts: ['Egger H1234'] });
  assert.ok(names.includes('18mm MDF') && names.includes('Egger H1234'));
});

// ─── the table, the RLS, and the offline promise ───────────────────────────

test('F7 — its OWN table, with RLS, and the migration is run by hand', () => {
  assert.match(DB, /const TABLE = 'cc_warehouse';/);
  assert.doesNotMatch(DB, /from\('cc_materials'\)/, 'not shared with the assignment stock list');
  assert.match(SQL, /create table if not exists public\.cc_warehouse/);
  assert.match(SQL, /alter table public\.cc_warehouse enable row level security/);
  for (const op of ['select', 'insert', 'update', 'delete']) {
    assert.match(SQL, new RegExp(`create policy cc_warehouse_${op}`), `no ${op} policy`);
  }
  // jc_uuid is unique per owner, so a double row cannot be made even if the
  // import went from two tabs at once.
  assert.match(SQL, /create unique index if not exists cc_warehouse_owner_jc_idx/);
  // Iron rule 7: nothing in the app runs this.
  assert.match(SQL, /Piotr odpala go RĘCZNIE/);
});

test('F7 — it degrades: the warehouse opens, says so, and loses no typed row', () => {
  // Every DB call answers `{ ok|rows, source, error }` and never throws —
  // `withDb` already makes mock mode, a dead network and a missing table one
  // code path.
  assert.match(DB, /source: 'local'/);
  assert.doesNotMatch(DB, /throw /);
  // The local shelf is written FIRST, and the load MERGES rather than replaces.
  assert.match(STORE, /put: \(rows\) => \{\s*\n\s*saveShelf\(rows\);/);
  assert.match(STORE, /const mine = here\.filter\(\(r\) => !fromDb\.has\(r\.id\)\);/);
  assert.match(STORE, /if \(mine\.length\) await saveManyDb\(mine\);/, 'and pushes them up when the signal returns');
  // …and the surface says it out loud.
  assert.match(PANEL, /data-warehouse-offline="1"/);
});

// ─── the door ──────────────────────────────────────────────────────────────

test('F7 — Database ▸ Materials opens the WAREHOUSE, not the design modal', () => {
  assert.match(TOPBAR, /onMaterials: \(e\) => openModal\('warehouse'/);
  assert.doesNotMatch(TOPBAR, /onMaterials: \(e\) => openModal\('design'/);
  assert.match(read('pages/ConfiguratorPage.jsx'), /modal === 'warehouse' && <WarehouseModal \/>/);
});

test('F7 — the screen is the owner’s own layout', () => {
  // *"List with departments down the left and counts, a photo per row, code
  // under the name, and a draggable card on click with the picture enlarged."*
  assert.match(PANEL, /data-warehouse-departments="1"/);
  assert.match(PANEL, /data-warehouse-count=\{d\.id\}/);
  assert.match(PANEL, /<Thumb url=\{r\.image_url\}/, 'a photo per row');
  assert.match(PANEL, /THE CODE UNDER THE NAME/);
  assert.match(PANEL, /<Thumb url=\{material\.image_url\} alt=\{material\.name\} size=\{140\}/, 'the picture enlarged');
  // The card is a shell WINDOW, so it is draggable without this file knowing
  // how to drag anything (rule 15).
  assert.match(PANEL, /<Modal\s*\n\s*name="material-card"/);
});
