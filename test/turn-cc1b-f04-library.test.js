/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F4 . THE LIBRARY IS THE RAIL'S, EVERY FAMILY (law 4). The owner, 01.11.2026: *"Library powinno byc
// po lewej, w menu kitchen, rozwijac prawy panel"*; *"po co blokowac wyspe w pokoju albo mala szafe w kuchni"*;
// *"wszystkie rodzaje po lewej, czesc coming soon"*; *"Add po lewej dobre, ale uporzadkowac: lazienki w
// kuchniach itd."*.
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
const { default: LibraryPanel } = await import('../src/components/LibraryPanel.jsx');
const { default: NewProjectFlow } = await import('../src/components/NewProjectFlow.jsx');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const {
  BATHROOM_LIBRARY, KITCHEN_LIBRARY, WARDROBE_LIBRARY, flattenLibrary, libraryTypeIds,
} = await import('../src/engine/library.js');
const { UNIT_CATEGORIES, categoryOf, getCategory } = await import('../src/engine/types.js');

const anchor = { left: 0, top: 0, width: 40, height: 40 };
const BATH = ['VANITY2', 'VANITY3', 'VANITY4', 'MIRROR_CABINET'];
const FAMILIES = ['Kitchen', 'Wardrobes', 'Bathroom', 'Sets', 'Saved sets', 'Media wall', 'Hallway', 'Office'];

/** The rail's Add, as the client sees it: every row, its words, whether it can be pressed. */
function addRows() {
  const html = draw(RailMenu, { kind: 'add', anchor, onClose: () => {} });
  return [...html.matchAll(/<button([^>]*)data-item="([^"]+)"([^>]*)>([\s\S]*?)<\/button>/g)].map(([, a, id, b, inner]) => ({
    id, label: (inner.match(/<span class="block truncate">([^<]+)<\/span>/) || [])[1], disabled: /disabled=""/.test(a + b), text: text(inner),
  }));
}

test('F4 . the Studio bar has no "Library" menu; the rail\'s Add is the one door', () => {
  const html = draw(TopBar, { variant: 'studio' }, { openMenus: true });
  assert.doesNotMatch(html, /data-top-menu="Library"/);
  assert.doesNotMatch(code(read('src/components/TopBar.jsx')), /label: 'Library'|UNIT_CATEGORIES|setLibraryCategory/);
});

test('F4 . the rail\'s Add lists Kitchen, Wardrobes, Bathroom, Sets, Saved sets and the three soon rows, in order', () => {
  const rows = addRows();
  assert.deepEqual(rows.map((r) => r.label), FAMILIES);
  for (const r of rows.slice(0, 5)) assert.equal(r.disabled, false, `${r.label} opens`);
  // A soon family is a greyed row with its reason, and opens nothing.
  for (const r of rows.slice(5)) {
    assert.equal(r.disabled, true, `${r.label} is held open`);
    assert.ok(r.text.includes('Coming soon') && r.text.includes('soon'), `${r.label} says why`);
  }
  assert.match(code(read('src/components/studio/RailMenus.jsx')), /onClick=\{\(\) => \{ if \(!c\.soon\) choose\(c\); \}\}/);
});

test('F4 . Bathroom holds the four bathroom kits; Kitchen and Wardrobes hold none of them', () => {
  assert.deepEqual(getCategory('bathroom').types, BATH);
  assert.equal(getCategory('bathroom').entries, BATHROOM_LIBRARY);
  for (const id of BATH) {
    assert.equal(categoryOf(id).id, 'bathroom', `${id} answers bathroom`);
    assert.equal(libraryTypeIds(KITCHEN_LIBRARY).includes(id), false, `${id} in Kitchen`);
    assert.equal(libraryTypeIds(WARDROBE_LIBRARY).includes(id), false, `${id} in Wardrobes`);
  }
  // The panel the Bathroom row opens shows the four, as a client sees them.
  useProjectStore.getState().newProject('Bathroom job', { id: 'b-1', number: 'P-1', client: 'C' });
  useUiStore.setState({ libraryCategory: 'bathroom' });
  const panel = draw(LibraryPanel);
  const rows = [...panel.matchAll(/data-library-entry="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(rows, flattenLibrary(BATHROOM_LIBRARY).map((e) => e.id));
  assert.ok(text(panel).includes('Mirror cabinet'));
  useUiStore.setState({ libraryCategory: null });
});

test('F4 . a kitchen item and a wardrobe item both see every family, and every family all its entries', () => {
  for (const projectType of ['kitchen', 'wardrobe']) {
    useProjectStore.getState().newProject(`${projectType} job`, { id: `i-${projectType}`, number: 'P-2', client: 'C', design: { projectType } });
    assert.deepEqual(addRows().map((r) => r.label), FAMILIES, `${projectType} item`);
    for (const category of ['kitchen', 'wardrobe']) {
      useUiStore.setState({ libraryCategory: category });
      const shown = [...draw(LibraryPanel).matchAll(/data-library-(?:entry|group)="([^"]+)"/g)].map((m) => m[1]);
      // Every top-level entry of the family, the kitchen's cargo in a wardrobe job and the wardrobe in a kitchen job.
      assert.deepEqual(shown.filter((id) => getCategory(category).entries.some((e) => e.id === id)), getCategory(category).entries.map((e) => e.id), `${category} in a ${projectType} item`);
      assert.doesNotMatch(draw(LibraryPanel), /data-library-show-all/);
    }
  }
  useUiStore.setState({ libraryCategory: null });
  assert.equal(UNIT_CATEGORIES.length, 8);
});

test('F4 . a library row\'s own params ride into addUnit (the AVENTOS rows of F15)', () => {
  const src = code(read('src/components/LibraryPanel.jsx'));
  assert.match(src, /entry\.params \? onAdd\(entry\.typeId, \{ params: \{ \.\.\.entry\.params \} \}\) : onAdd\(entry\.typeId\)/);
  // handleAdd spreads the options into the store's own addUnit, which takes `params`.
  assert.match(src, /const \{ id, error, wall \} = addUnit\(typeId, \{[\s\S]*?\.\.\.opts,\s*\}\);/);
});

test('F4 . New item shows "Start from": the tiles are a heights preset, never a gate', () => {
  const html = draw(NewProjectFlow, {
    jcProject: { key: 'p:1', kind: 'production', id: '1', number: 'P-1', name: 'Smith', client: 'Smith Ltd' }, onCancel() {}, onStart() {},
  });
  assert.match(html, /<section data-start-from="1"><h2>Start from<\/h2><p class="cc-setup-help">Only the starting heights\. Every family of units is in the library whatever you pick\.<\/p>/);
  assert.doesNotMatch(html, /What are you making\?/);
});

test('F4 . the house laws on this F\'s new file', () => {
  houseLaws('test/turn-cc1b-f04-library.test.js');
});
