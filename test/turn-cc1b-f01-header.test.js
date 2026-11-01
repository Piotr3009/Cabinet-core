/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F1 . THE HEADER (law 2, THE FRAME SAYS WHOSE JOB IT IS). The owner, 31.10.2026, over his screenshot:
// the project name standing before the File menu *"wprowadza w blad"*; it belongs *"po prawej, z numerem
// projektu JC i nazwa"*; 01.11, answer 6: *"srodkowe prawo, wyraznie oddzielone od menu"*; and *"duzy
// przycisk Return to Joinery Core"*.
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

const { useProjectStore } = await import('../src/stores/projectStore.js');
const { default: TopBar } = await import('../src/components/TopBar.jsx');
const { default: StartScreen } = await import('../src/components/StartScreen.jsx');
const { BACK_TO_JC_LABEL, JC_DASHBOARD, goToJoineryCore, jobProjectLine } = await import('../src/lib/topMenu.js');

function bindItem({ name = 'Walk wardrobe', number = 'P-1042', jcProjectName = 'Smith kitchen', client = 'Smith Ltd' } = {}) {
  useProjectStore.getState().newProject(name, { id: 'item-1', number, client, jcProjectName });
}

// REWRITTEN BY THE UX TURN, U1: Back to Joinery Core moves from the last place of the bar to the
// FIRST, before the wordmark, gold as before (the owner: *"zostaje zloty, tylko na lewo"*; *"serio
// zawsze back przyciski sa raczej po lewej, taka zasada i przyzwyczajenie"*).
test('F1 . the Studio bar: Back to Joinery Core first, then the wordmark, the menus, the job block (item name, number and JC project), then Save', () => {
  bindItem();
  const html = draw(TopBar, { variant: 'studio' });
  const at = (needle) => html.indexOf(needle);
  const back = at('data-studio="topbar-back-jc"');
  const wordmark = at('class="studio-wordmark"');
  const menus = at('aria-label="Main menu"');
  const job = at('data-studio="topbar-job"');
  const save = at('data-studio="topbar-save"');
  assert.ok(back > 0 && wordmark > back && menus > wordmark && job > menus && save > job, `the DOM order: back ${back}, wordmark ${wordmark}, menus ${menus}, job ${job}, save ${save}`);
  // Back to Joinery Core is the FIRST control of the bar.
  const head = html.slice(0, html.lastIndexOf('<button', back));
  assert.equal((head.match(/<button\b/g) || []).length, 0, 'no control before the way back');
  assert.match(head, /^<header data-studio="topbar" class="studio-topbar[^"]*"[^>]*>$/, 'the button opens the header');
  assert.match(html.slice(back), /^data-studio="topbar-back-jc"[^>]*><span aria-hidden="true">‹<\/span> Back to Joinery Core<\/button>/, 'the arrow (hidden from a screen reader), then the words');
  assert.match(html.slice(html.lastIndexOf('<button', back), back), /class="cc-btn-gold/, 'a gold button, as before');
  // Nothing of the way back stands at the end of the bar any more.
  assert.match(html, /data-studio="topbar-bom"[^>]*>BOM<\/button><\/header>$/, 'BOM ends the bar');
  // The job block: line one the ITEM's name, line two `<number> . <JC project name> . <client>`, read-only.
  const block = html.slice(job, save);
  assert.match(block, /class="studio-project-name"[^>]*>Walk wardrobe</);
  assert.match(block, /data-studio="topbar-job-project" title="Joinery Core project: read-only here">P-1042 · Smith kitchen · Smith Ltd</);
  // Nothing of the job stands before the menus any more.
  assert.equal(html.slice(0, menus).includes('Walk wardrobe'), false, 'the name before File misleads');
});

test('F1 . the job block shows the number alone when the JC project\'s name is unknown', () => {
  assert.equal(jobProjectLine({ number: 'P-7', jcProjectName: '', client: 'X' }), 'P-7');
  assert.equal(jobProjectLine({ number: 'P-7', jcProjectName: 'Hall', client: '' }), 'P-7 · Hall');
  bindItem({ jcProjectName: '' });
  assert.match(draw(TopBar, { variant: 'studio' }), /data-studio="topbar-job-project"[^>]*>P-1042</);
  // The binding rides the store only: the item JSON never carries it (T-CC1a F4.3).
  bindItem();
  assert.equal(useProjectStore.getState().project.jcProjectName, 'Smith kitchen');
});

test('F1 . the legacy bar draws what it drew: no job block, no way back, its controls in today\'s order', () => {
  bindItem();
  const html = draw(TopBar, {});
  assert.doesNotMatch(html, /topbar-job|topbar-back-jc|Back to Joinery Core|studio-job/);
  // Its children, in main's order: wordmark, rule, menus, rule, the name, Save, spacer, Bright, Export.
  const order = [
    '>CABINET CORE</button>', 'class="h-5 w-px bg-shell-600"', 'aria-label="Main menu"', '>Walk wardrobe<',
    'data-save-control="1"', 'class="flex-1"', 'data-brightness-control="1"', '>Export</button>',
  ].map((n) => html.indexOf(n));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), `the legacy order: ${order}`);
  assert.match(html, /^<header class="h-12 shrink-0 bg-shell-900 border-b border-shell-600 flex items-center px-4 gap-3 [^"]*">/);
});

test('F1 . Back on a dirty item saves first (today\'s road), then the browser goes to Joinery Core\'s dashboard', () => {
  const body = code(read('src/components/TopBar.jsx'));
  const back = body.slice(body.indexOf('const backToJc = async () => {'), body.indexOf('const drawBackToJc'));
  assert.match(back, /if \(dirty\) await save\(\);\s*goToJoineryCore\(\);/, 'the save is awaited before the browser leaves');
  assert.match(code(read('src/components/TopBar.jsx')), /const save = async \(\) => \{[\s\S]*?await persistProject\(\{ project, units \}\)/, 'save is persistProject');
  const went = [];
  goToJoineryCore({ assign: (url) => went.push(url) });
  assert.deepEqual(went, ['/dashboard.html']);
  assert.equal(JC_DASHBOARD, '/dashboard.html');
  assert.equal(BACK_TO_JC_LABEL, 'Back to Joinery Core');
});

test('F1 . the start screen shows the same button, the same words, the same target', () => {
  const html = draw(StartScreen);
  const head = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert.match(head, /<button type="button" class="cc-btn-gold[^"]*" data-start-back-jc="1">Back to Joinery Core<\/button>$/, 'the last of the header');
  assert.match(code(read('src/components/StartScreen.jsx')), /data-start-back-jc="1" onClick=\{\(\) => goToJoineryCore\(\)\}/);
});

test('F1 . the start screen hands the bound project\'s name into the store on Open, Restore and Save as new item', () => {
  const src = code(read('src/components/StartScreen.jsx'));
  assert.match(src, /openItem\(item\.id, \{ client: project\?\.client \|\| '', jcProjectName: project\?\.name \|\| '' \}\)/, 'Open');
  assert.match(src, /jcProjectName: projectOfItem\(list, offer\.item\)\?\.name \|\| ''/, 'Restore, from the loaded list');
  assert.match(src, /client: project\.client \|\| '', jcProjectName: project\.name \|\| ''/, 'Save as new item');
});

test('F1 . studio.css: the job block\'s three rules; the name no longer gives its width to the menus', () => {
  const css = read('src/components/studio/studio.css');
  for (const sel of ['.studio-pro .studio-job {', '.studio-pro .studio-job::before {', '.studio-pro .studio-job-project {']) {
    assert.ok(css.includes(sel), sel);
  }
  const rule = (sel) => css.slice(css.indexOf(sel), css.indexOf('}', css.indexOf(sel)));
  assert.match(rule('.studio-pro .studio-job::before {'), /background: theme\('colors\.shell\.600'\);/);
  assert.match(rule('.studio-pro .studio-job::before {'), /height: 24px;/);
  assert.match(rule('.studio-pro .studio-job-project {'), /color: theme\('colors\.ink\.400'\);/);
  assert.doesNotMatch(rule('.studio-pro .studio-project-name {'), /max-width/);
});

test('F1 . the house laws on this F\'s new file', () => {
  houseLaws('test/turn-cc1b-f01-header.test.js');
});
