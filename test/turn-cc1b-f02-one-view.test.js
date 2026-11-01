/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F2 . ONE VIEW (law 3). The owner, 01.11.2026: *"dwa menu View, jedno wystarczy, menu wystarczy"*
// (the top bar's View stays, the scene corner's dropdown goes); answer 3: *"tak te przyciski zostaja sa mega
// przydatne"* (the quick toggles at the scene's edge stay). SAME DOORS: the nine the dropdown had are found.
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
const { default: SceneToggles } = await import('../src/components/studio/SceneToggles.jsx');
const { default: CameraBar } = await import('../src/components/studio/CameraBar.jsx');
const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');

/** The scene's edge and the top bar, as the Studio frame draws them (ConfiguratorPage.jsx `sceneEdge`). */
function frame(openMenus = false) {
  return draw(TopBar, { variant: 'studio' }, { openMenus }) + draw(SceneToggles) + draw(CameraBar, { onDrawings: () => {} });
}

test('F2 . the dropdown is deleted, file, import and mount', () => {
  assert.equal(existsSync(join(ROOT, 'src/components/studio/SceneViewMenu.jsx')), false);
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.doesNotMatch(page, /SceneViewMenu/);
  // SceneToggles and CameraBar (with Drawings...) stay exactly where they were. CNC speed J5
  // (01.11.2026, the owner 21:43): on the CNC sheet the toggles are not mounted and the bar keeps
  // Drawings... alone (test/cnc-speed-ui.test.js); in Design both stand as before.
  assert.match(page, /\{viewMode !== 'cnc' && <SceneToggles \/>\}\s*<CameraBar cncSheet=\{viewMode === 'cnc'\} onDrawings=/);
});

test('F2 . src/ names no SceneViewMenu, not even in a comment', () => {
  const hits = walk('src').filter((f) => /\.(jsx?|mjs|css)$/.test(f) && read(f).includes('SceneViewMenu'));
  assert.deepEqual(hits, []);
});

test('F2 . SAME DOORS: the nine labels of the deleted menu are found on the two surviving surfaces', () => {
  const toggles = text(draw(SceneToggles));
  // Dimensions, Front dimensions, Props and Measure on the quick toggles (the profile's list draws them).
  for (const id of ['dimensions', 'frontDimensions', 'props', 'measure']) {
    assert.ok(P.ui.studio.sceneToggles.includes(id), `the toggles' list draws ${id}`);
  }
  for (const label of ['Show dimensions', 'Front dimensions', 'Props', 'Measure']) {
    assert.ok(toggles.includes(label), `the toggles show "${label}"`);
  }
  // Dimension colour, Contour view, Brightness, Realistic lighting and Turn on the light in the top bar's View.
  const html = draw(TopBar, { variant: 'studio' }, { openMenus: true });
  const view = html.slice(html.indexOf('data-top-menu="View"'), html.indexOf('data-top-menu="Settings"'));
  for (const label of ['Dimension colour', 'Contour view', 'Brightness', 'Realistic lighting', 'Turn on the light']) {
    assert.ok(text(view).includes(label), `the View menu shows "${label}"`);
  }
});

test('F2 . the Studio frame renders ONE element whose text is "View" with aria-haspopup', () => {
  const html = frame(false);
  const views = [...html.matchAll(/<(\w+)\b([^>]*)>([^<]*)<\/\1>/g)]
    .filter(([, , attrs, inner]) => inner.trim() === 'View' && /aria-haspopup=/.test(attrs));
  assert.equal(views.length, 1, 'one View');
  assert.doesNotMatch(html, /data-studio="view-menu"|data-kind="view"/, 'no second View anywhere');
});

test('F2 . the house laws on this F\'s new file', () => {
  houseLaws('test/turn-cc1b-f02-one-view.test.js');
});
