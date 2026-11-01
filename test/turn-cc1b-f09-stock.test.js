/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F9 . THE STOCK IS JOINERY CORE'S (law 6). The owner, 01.11.2026: *"materialy z JC (jego baza),
// przypisanie w CC"*; *"materials w JC ma wlasny UUID, i to samo musimy zrobic: przypisac UUID z JC do naszego
// materialu"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { register } from 'node:module';

// The client's own components, rendered as the browser renders them: the JSX through esbuild (Vite's own
// compiler, already in node_modules), the CSS stubbed (the house pattern of turn-cc1b-f03-database.test.js).
const ESB = new URL('../node_modules/esbuild/lib/main.js', import.meta.url).href;
register(`data:text/javascript,${encodeURIComponent(`
import esb from '${ESB}';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function load(url, context, next) {
  const path = url.split('?')[0];
  if (path.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  if (path.endsWith('.jsx')) {
    const file = fileURLToPath(path);
    const { code } = esb.transformSync(readFileSync(file, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: file });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return next(url, context);
}`)}`, import.meta.url);

const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { JC_OFFLINE } = await import('../src/lib/jcApi.js');
const {
  STOCK_COLUMNS, STOCK_EMPTY, loadJcStock, toMaterial, ccKindOf, categoryTree, filterStock,
} = await import('../src/lib/jcStock.js');
const { useMaterialAssignmentStore, GENERIC_MATERIALS, isJcMaterial, materialBadge } = await import('../src/stores/materialAssignmentStore.js');
const { STOCK_ITEMS, STOCK_CATEGORIES } = await import('./fixtures/jc-stock.js');
const { default: JcStockModal } = await import('../src/components/JcStockModal.jsx');

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
const M = () => useMaterialAssignmentStore.getState();

/** A fake JC client: records every from/select/order and answers the fixture rows (or an error). */
function fakeClient({ rows = { stock_items: STOCK_ITEMS, stock_categories: STOCK_CATEGORIES }, error = null } = {}) {
  const log = { selects: [], orders: [] };
  const from = (table) => {
    const chain = {
      select: (cols) => { log.selects.push({ table, cols }); return chain; },
      order: (k) => { log.orders.push([table, k]); return chain; },
      eq: () => chain,
      then: (res, rej) => Promise.resolve(error ? { data: null, error } : { data: rows[table] || [], error: null }).then(res, rej),
    };
    return chain;
  };
  return { log, client: { from } };
}
const withFake = async (fake, fn) => {
  globalThis.supabaseClient = fake.client;
  try { return await fn(); } finally { delete globalThis.supabaseClient; }
};
/** Render a component with the store's CURRENT state (a server render reads the initial state). */
function draw(Component) {
  const init = useMaterialAssignmentStore.getInitialState();
  const kept = { ...init };
  Object.assign(init, M());
  try { return renderToStaticMarkup(React.createElement(Component)); } finally {
    for (const k of Object.keys(init)) delete init[k];
    Object.assign(init, kept);
  }
}

test('F9.1 the two reads name exactly the columns of CLAUDE.md, in their order', async () => {
  const fake = fakeClient();
  const res = await withFake(fake, () => loadJcStock());
  assert.equal(res.error, null);
  assert.deepEqual(fake.log.selects, [
    { table: 'stock_items', cols: 'id, name, category, subcategory, unit, current_quantity, cost_per_unit, size, thickness, color, item_number, image_url, supplier_id' },
    { table: 'stock_categories', cols: 'id, name, type, parent_category_id, display_order' },
  ]);
  assert.deepEqual(fake.log.orders, [['stock_items', 'name'], ['stock_categories', 'display_order']]);
  assert.equal(STOCK_COLUMNS.stock_items, fake.log.selects[0].cols);
  assert.equal(res.items.length, STOCK_ITEMS.length);
  assert.equal(res.categories.length, STOCK_CATEGORIES.length);
});

test('F9.1 toMaterial maps the four fixture rows to the four kinds, the id IS the JC uuid', () => {
  const by = (start) => toMaterial(STOCK_ITEMS.find((r) => r.name.startsWith(start)));
  const board = by('Egger W980');
  assert.equal(board.category, 'board');
  assert.equal(board.thickness, 18);
  assert.equal(board.price, 38.5);
  assert.equal(board.id, board.jc_uuid);
  assert.equal(board.group, 'Sheet materials');
  assert.equal(board.subgroup, 'Melamine');
  assert.equal(board.item_number, 'EG-W980-18');
  assert.equal(board.stock, 10);
  assert.equal(by('ABS edging').category, 'edging');
  assert.equal(by('Blum Clip top Blumotion').category, 'hardware');
  assert.equal(by('Tin of paint').category, 'other');
  // A thin sheet word without a thickness over 3 mm is not a board.
  assert.equal(ccKindOf({ name: 'Veneer sample', thickness: 0.6 }), 'other');
  assert.equal(materialBadge(board), 'JC', 'every stock row wears the JC badge (the contract kept)');
  assert.equal(isJcMaterial(GENERIC_MATERIALS[0]), false, 'a generic placeholder is not JC stock');
});

test('F9.1 categoryTree builds the tenant\'s own tree from parent_category_id, in display_order', () => {
  const tree = categoryTree(STOCK_CATEGORIES);
  assert.deepEqual(tree.map((n) => n.name), ['Sheet materials', 'Edging', 'Ironmongery', 'Finishes']);
  assert.deepEqual(tree[0].children.map((n) => n.name), ['Melamine', 'MDF']);
  assert.deepEqual(tree[2].children.map((n) => n.name), ['Hinges', 'Runners']);
  const mats = STOCK_ITEMS.map(toMaterial);
  // The category filter: a parent stands for its children.
  assert.equal(filterStock(mats, { category: 'c3', tree }).length, 7);
  assert.equal(filterStock(mats, { category: 'c3a', tree }).length, 2);
  // The search narrows by name, item number, colour and size.
  assert.deepEqual(filterStock(mats, { q: 'hague' }).map((m) => m.name), ['Tin of paint, Hague Blue 2.5 L']);
  assert.deepEqual(filterStock(mats, { q: '71T6550' }).map((m) => m.item_number), ['71T6550']);
  assert.deepEqual(filterStock(mats, { q: '2440' }).map((m) => m.name), ['MDF 18 mm']);
});

test('F9.2 the store holds the three generics followed by every stock row, source jc', async () => {
  const fake = fakeClient();
  await withFake(fake, () => M().loadMaterials());
  const ids = M().materials.map((m) => m.id);
  assert.deepEqual(ids.slice(0, 3), ['generic-18', 'generic-22', 'generic-25']);
  assert.deepEqual(ids.slice(3), STOCK_ITEMS.map((r) => r.id));
  assert.equal(M().materialsSource, 'jc');
  assert.equal(M().stockError, null);
  assert.equal(M().stockCategories.length, STOCK_CATEGORIES.length);
  // The Stock window: the rows, the JC badge, read-only (no row is a button that assigns).
  const html = draw(JcStockModal);
  const words = text(html);
  assert.match(html, /data-jc-stock="1"/);
  assert.match(html, /cc-modal-wide/);
  for (const r of STOCK_ITEMS) assert.ok(words.includes(r.name), `${r.name} is listed`);
  assert.equal((html.match(/data-material-badge="JC"/g) || []).length, STOCK_ITEMS.length);
  assert.doesNotMatch(words, /Generic board/, 'the stock window lists Joinery Core rows only');
  assert.match(html, /data-material-search="1"/);
  assert.match(html, /All categories/);
});

test('F9.2 an empty stock is said in words with Open Stock; offline says JC_OFFLINE and Retry', async () => {
  await withFake(fakeClient({ rows: { stock_items: [], stock_categories: [] } }), () => M().loadMaterials());
  assert.equal(M().materialsSource, 'jc');
  let words = text(draw(JcStockModal));
  assert.ok(words.includes(STOCK_EMPTY), words);
  assert.match(draw(JcStockModal), /href="\/stock\.html"/);

  // No client at all: Joinery Core did not answer.
  const res = await M().loadMaterials();
  assert.equal(res.error, JC_OFFLINE);
  assert.equal(M().materialsSource, 'offline');
  words = text(draw(JcStockModal));
  assert.ok(words.includes(JC_OFFLINE), words);
  assert.ok(words.includes('Retry'));
  // A refusal in words is shown as JC said it.
  await withFake(fakeClient({ error: { message: 'Cabinet Core opens for owners, admins and managers' } }), () => M().loadMaterials());
  assert.equal(M().stockError, 'Cabinet Core opens for owners, admins and managers');
});

test('F9.2 src has no cc_materials read and no row of the deleted samples', () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(js|jsx|mjs)$/.test(name)) files.push(rel);
    }
  };
  walk('src');
  for (const rel of files) {
    let t = read(rel);
    // REWRITTEN BY T-CC2a F13 (CLAUDE.md T-CC2a F13.1: the old CC ids *"map through ONE table in catalogue.js to the
    // source and thickness they meant"*): the deleted samples' ids stand in that ONE table as KEYS, a migration and
    // never a material row; the table is taken out of the text before the sample list is looked for.
    if (rel === 'src/engine/catalogue.js') {
      const a = t.indexOf('export const OLD_CC_IDS');
      const b = t.indexOf('});', a);
      assert.ok(a > 0 && b > a, 'the one table of the old CC ids is in catalogue.js');
      assert.doesNotMatch(t.slice(a, b), /name:|price:|category:/, 'the table maps ids to a source and a thickness, never a material row');
      t = t.slice(0, a) + t.slice(b);
    }
    assert.doesNotMatch(t, /hw_hinge_clip|mat_mfc18_white|MOCK_MATERIALS/, `${rel} still carries the sample list`);
    assert.doesNotMatch(code(t), /cc_materials/, `${rel} still reads cc_materials`);
  }
  assert.doesNotMatch(read('src/stores/materialAssignmentStore.js'), /cc_materials/);
  assert.equal(GENERIC_MATERIALS.length, 3);
});
