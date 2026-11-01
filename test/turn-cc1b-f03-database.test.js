/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F3 . THE DATABASE MENU DIES. The owner, 01.11.2026: *"Database: Company defaults do Settings,
// Database niepotrzebne, wszystko jest w JC, Assign materials juz jest po lewej"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { register } from 'node:module';

// The client's own components, rendered as the browser renders them: the JSX
// through esbuild (Vite's own compiler, already in node_modules), the CSS
// stubbed, and MenuBar able to draw every menu OPEN (`globalThis.__openMenus`),
// so a door inside a dropdown is a door the markup holds.
const ESB = new URL('../node_modules/esbuild/lib/main.js', import.meta.url).href;
register(`data:text/javascript,${encodeURIComponent(`
import esb from '${ESB}';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const OPEN_MENUS = "import Real from './MenuBar.jsx?real'; import { createElement as h } from 'react';"
  + "const tree = (items) => h('div', { role: 'menu' }, (items || []).filter((i) => i && !i.divider).map((i, k) => h('div', { key: k }, h('button', { role: 'menuitem', title: i.hint || '' }, i.label), i.items ? tree(i.items) : null)));"
  + "export default function MenuBar(props) { if (!globalThis.__openMenus) return h(Real, props);"
  + " return h('nav', { 'aria-label': 'Main menu' }, props.menus.map((m, k) => h('div', { key: k }, h('button', { 'data-top-menu': m.label }, m.label), m.items ? tree(m.items) : null))); }";
export async function load(url, context, next) {
  const path = url.split('?')[0];
  if (path.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  if (path.endsWith('/components/MenuBar.jsx') && !url.endsWith('?real')) return { format: 'module', source: OPEN_MENUS, shortCircuit: true };
  if (path.endsWith('.jsx')) {
    const file = fileURLToPath(path);
    const { code } = esb.transformSync(readFileSync(file, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: file });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return next(url, context);
}`)}`, import.meta.url);

const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
/** The source without its comments: a tombstone naming the dead is not the dead. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
/** Render a component the client sees, with every menu drawn open when asked. */
const STORES = await Promise.all([
  import('../src/stores/projectStore.js').then((m) => m.useProjectStore),
  import('../src/stores/uiStore.js').then((m) => m.useUiStore),
  import('../src/stores/authStore.js').then((m) => m.useAuthStore),
]);
function draw(Component, props = {}, { openMenus = false } = {}) {
  // A server render reads a store's INITIAL state; the client reads what it holds now, so does this
  // (the initial object is lent the current keys for the one render, and given its own back after).
  const kept = STORES.map((s) => ({ ...s.getInitialState() }));
  for (const s of STORES) Object.assign(s.getInitialState(), s.getState());
  globalThis.__openMenus = openMenus;
  try { return renderToStaticMarkup(React.createElement(Component, props)); } finally {
    globalThis.__openMenus = false;
    STORES.forEach((s, i) => {
      const init = s.getInitialState();
      for (const k of Object.keys(init)) delete init[k];
      Object.assign(init, kept[i]);
    });
  }
}
/** The visible text of a piece of markup. */
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
/** Every file under a directory, recursively. */
function walk(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((n) => {
    const rel = `${dir}/${n}`;
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
  });
}
/** The two dashes, made here so this file carries neither. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
/** No em or en dash, and never the word for an employee JC rule 6.1 forbids, in a file this turn wrote. */
function houseLaws(rel) {
  const t = read(rel);
  assert.doesNotMatch(t, DASHES, `${rel}: an em or en dash`);
  assert.doesNotMatch(t, new RegExp(`\\b${'wor'}${'ker'}\\b`, 'i'), `${rel}: the forbidden word`);
  assert.ok(t.startsWith(read('src/lib/visualNumbers.js').split('\n').slice(0, 8).join('\n')), `${rel}: the Skylon header`);
}

const { default: TopBar } = await import('../src/components/TopBar.jsx');
const { default: RailMenu } = await import('../src/components/studio/RailMenus.jsx');
const topMenu = await import('../src/lib/topMenu.js');
const { useUiStore } = await import('../src/stores/uiStore.js');

const anchor = { left: 0, top: 0, width: 40, height: 40 };

test('F3 . MENU_ORDER has no Database and no Library; the bar draws neither', () => {
  assert.deepEqual(topMenu.MENU_ORDER, ['File', 'View', 'Settings', 'Spraying', 'Lighting', 'Output']);
  const tops = [...draw(TopBar, { variant: 'studio' }, { openMenus: true }).matchAll(/data-top-menu="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(tops, ['File', 'View', 'Settings', 'Spraying', 'Lighting', 'Output']);
});

test('F3 . the Settings menu has "Company defaults..." third, after Settings... and Room setup..., before Snap', () => {
  const html = draw(TopBar, { variant: 'studio' }, { openMenus: true });
  const settings = html.slice(html.indexOf('data-top-menu="Settings"'), html.indexOf('data-top-menu="Spraying"'));
  const items = [...settings.matchAll(/role="menuitem"[^>]*>([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(items.slice(0, 4), ['Settings…', 'Room setup…', 'Company defaults…', 'Snap']);
  // The same call the Database entry made: the same window, beside the click.
  const src = code(read('src/components/TopBar.jsx'));
  assert.match(src, /label: 'Company defaults…',[\s\S]{0,200}run: \(e\) => openModal\('company-defaults', \{ anchor: anchorOfEvent\(e\) \}\)/);
});

test('F3 . the rail\'s Materials popup has "Assign materials..." and "Stock...", written in place', () => {
  useUiStore.setState({ selectedUnitIds: [] });
  const html = draw(RailMenu, { kind: 'materials', anchor, onClose: () => {} });
  const rows = [...html.matchAll(/data-item="([^"]+)"/g)].map((m) => m[1]);
  // REWRITTEN by T-CC2a F8.7: "Link materials..." stands FIRST, the four rows of T-CC1b follow it unchanged.
  assert.deepEqual(rows, ['link-materials', 'selected-finishes', 'project-finishes', 'assign-materials', 'stock']);
  assert.ok(text(html).includes('Assign materials…'));
  assert.ok(text(html).includes('Stock…'));
  const src = code(read('src/components/studio/RailMenus.jsx'));
  assert.match(src, /openModal\('assign-materials', \{ anchor: anchorOfEvent\(e\) \}\)/);
  // F9.3: Stock... opens Joinery Core's stock, replacing the warehouse window it opened before.
  assert.match(src, /openModal\('jc-stock', \{ anchor: anchorOfEvent\(e\) \}\)/);
  assert.doesNotMatch(src, /openModal\('warehouse'/);
  assert.match(code(read('src/pages/ConfiguratorPage.jsx')), /\{modal === 'jc-stock' && <JcStockModal \/>\}/);
});

test('F3 . src/ has no buildDatabaseMenu', () => {
  assert.equal(topMenu.buildDatabaseMenu, undefined);
  const hits = walk('src').filter((f) => /\.(jsx?|mjs)$/.test(f) && read(f).includes('buildDatabaseMenu'));
  assert.deepEqual(hits, []);
});

test('F3 . no element with text "Clients..." or "Projects..." renders anywhere in the Studio frame', () => {
  useUiStore.setState({ selectedUnitIds: [] });
  const html = draw(TopBar, { variant: 'studio' }, { openMenus: true })
    + draw(RailMenu, { kind: 'add', anchor, onClose: () => {} })
    + draw(RailMenu, { kind: 'materials', anchor, onClose: () => {} });
  for (const gone of ['Clients…', 'Projects…', 'Clients...', 'Projects...']) {
    assert.equal([...html.matchAll(/>([^<]*)</g)].some(([, t]) => t.trim() === gone), false, `${gone} renders`);
  }
  assert.doesNotMatch(html, /data-top-menu="Database"/);
});

test('F3 . the house laws on this F\'s new file', () => {
  houseLaws('test/turn-cc1b-f03-database.test.js');
});
