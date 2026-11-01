/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F5 . OUTPUT SHRINKS (law 5) and SAME DOORS (law 1), proven here. The owner, 01.11.2026: *"na dole
// Drawings dobre, ale myli sie z Output; Output zmniejszyc"*; answer 2: the Output buttons *"zostaja"*; answer 3:
// *"BOM pdf to export listy materialow w pdf (malo potrzebny ale niech U maja)"*; *"Output tylko: cutting list,
// BOM PDF, labels 21 i 44"*.
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
const { default: CameraBar } = await import('../src/components/studio/CameraBar.jsx');
const { default: SceneToggles } = await import('../src/components/studio/SceneToggles.jsx');
const { default: CncView } = await import('../src/components/CncView.jsx');
const { buildOutputMenu } = await import('../src/lib/outputMenu.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');

const anchor = { left: 0, top: 0, width: 40, height: 40 };
const OUTPUT = ['Cutting list CSV', 'BOM PDF', 'Part labels · 21 per sheet (Avery L7160)', 'Part labels · 44 per sheet'];

/** The Studio frame's surfaces a door can stand on, drawn as the client sees them, every menu open. */
function studioFrame() {
  useProjectStore.getState().newProject('Doors job', { id: 'd-1', number: 'P-9', client: 'C', jcProjectName: 'Hall' });
  // One cabinet, so the CNC workspace draws its sheet and its toolbar (an empty job draws a sentence).
  const placed = useProjectStore.getState().addUnit('BUD');
  assert.ok(placed.id, `a base unit stands: ${placed.error || ''}`);
  useUiStore.setState({ selectedUnitIds: [] });
  return {
    top: draw(TopBar, { variant: 'studio', onExportCsv() {}, onExportPdf() {}, onExportLabels() {} }, { openMenus: true }),
    edge: draw(SceneToggles) + draw(CameraBar, { onDrawings: () => {} }),
    add: draw(RailMenu, { kind: 'add', anchor, onClose: () => {} }),
    materials: draw(RailMenu, { kind: 'materials', anchor, onClose: () => {} }),
    cnc: draw(CncView, { onExportDxfZip: () => {} }),
    drawings: read('src/components/DrawingModal.jsx'),
  };
}
const menuOf = (html, label) => {
  const at = html.indexOf(`data-top-menu="${label}"`);
  const next = html.indexOf('data-top-menu="', at + 10);
  return html.slice(at, next < 0 ? html.indexOf('</nav>', at) : next);
};
const items = (html) => [...html.matchAll(/role="menuitem"[^>]*>([^<]+)</g)].map((m) => m[1]);

test('F5 . the Output menu has the four labels and no other', () => {
  const { top } = studioFrame();
  assert.deepEqual(items(menuOf(top, 'Output')), OUTPUT);
  assert.deepEqual(buildOutputMenu({}).items.map((i) => i.label), OUTPUT);
  assert.equal(buildOutputMenu({}).items.find((i) => i.label === 'BOM PDF').hint,
    'The materials list of the job as a PDF: parts, materials, hardware');
});

test('F5 . buildOutputMenu is called with the cutting list, the BOM PDF and the labels handlers only', () => {
  const top = code(read('src/components/TopBar.jsx'));
  assert.match(top, /buildOutputMenu\(\{ onExportCsv, onExportPdf, onExportLabels \}\)/);
  assert.doesNotMatch(top, /onRender|onDrawing|onExportDxf|onOpenBom|onOpenSpraying/);
  const page = code(read('src/pages/ConfiguratorPage.jsx'));
  const tag = page.slice(page.indexOf('<TopBar'), page.indexOf('/>', page.indexOf('<TopBar')));
  assert.deepEqual([...tag.matchAll(/\b(on\w+)=/g)].map((m) => m[1]), ['onExportCsv', 'onExportPdf', 'onExportLabels']);
  // The handlers run what they ran: the CSV, the BOM PDF and each paper.
  const fired = [];
  const menu = buildOutputMenu({ onExportCsv: () => fired.push('csv'), onExportPdf: () => fired.push('pdf'), onExportLabels: ({ sheet }) => fired.push(sheet) });
  for (const i of menu.items) i.run();
  assert.deepEqual(fired, ['csv', 'pdf', 'L7160', 'generic44']);
});

// SAME DOORS (law 1): every door reachable before this turn, by label, and where it stands now.
// `null` is a door the Deletion licence names; the owner's words are beside each.
const DOORS = [
  // Output, before: fourteen leaves.
  ['Output > Render...', 'drawings', /Render\.\.\./, 'the Drawings window, F8.1'],
  ['Output > Drawings > Preview...', null, null, '*"usunac card 3D view i front only"*'],
  ['Output > Drawings > Unit card (PDF)', null, null, '*"usunac card 3D view i front only"*'],
  ['Output > Drawings > Unit card (SVG)', null, null, '*"usunac card 3D view i front only"*'],
  ['Output > Drawings > All units (PDF)', null, null, '*"usunac przyciski all units i drawing set pdf, tylko export pdf"*'],
  ['Output > Drawings > Drawing set (PDF)', 'drawings', /Export PDF/, 'the Drawings window\'s one export'],
  ['Output > Drawings > Drawing set (DXF)', 'drawings', /Wall DXF/, 'the Drawings window, PROPOSED kept'],
  ['Output > CNC / DXF', 'cnc', /data-cnc-export="1"[^>]*>Export CNC \/ DXF</, 'the CNC workspace'],
  ['Output > Cutting list CSV', 'output', 'Cutting list CSV', 'Output'],
  ['Output > BOM PDF', 'output', 'BOM PDF', 'Output'],
  ['Output > Part labels · 21 per sheet (Avery L7160)', 'output', 'Part labels · 21 per sheet (Avery L7160)', 'Output'],
  ['Output > Part labels · 44 per sheet', 'output', 'Part labels · 44 per sheet', 'Output'],
  ['Output > Bill of materials...', 'top', /data-studio="topbar-bom">BOM</, 'the top bar\'s BOM button'],
  ['Output > Spraying...', 'top', /data-top-menu="Spraying">Spraying</, 'the Spraying menu'],
  // The camera bar's Drawings... opens the window that holds the set, the angles, the render and the AI card.
  ['Drawings...', 'edge', /Drawings…|Drawings\.\.\./, 'the camera bar'],
  // Database, before: five.
  ['Database > Materials...', 'materials', /data-item="stock"/, 'the rail\'s Stock..., F9.3'],
  ['Database > Assign materials...', 'materials', /data-item="assign-materials"/, 'the rail'],
  ['Database > Company defaults...', 'settings', 'Company defaults…', 'Settings'],
  ['Database > Clients...', null, null, '*"wszystko jest w JC"*'],
  ['Database > Projects...', null, null, '*"wszystko jest w JC"*'],
  // Library, before: four; the rail lists them and more.
  ['Library > Kitchen', 'add', /data-item="kitchen"/, 'the rail\'s Add'],
  ['Library > Wardrobes', 'add', /data-item="wardrobe"/, 'the rail\'s Add'],
  ['Library > Saved sets', 'add', /data-item="sets"/, 'the rail\'s Add'],
  ['Library > Sets', 'add', /data-item="media"/, 'the rail\'s Add'],
];

test('F5 . SAME DOORS: every door is found by label in the rendered Studio frame, or is deleted by name', () => {
  const f = studioFrame();
  const surface = {
    top: f.top, edge: f.edge, add: f.add, materials: f.materials, cnc: f.cnc, drawings: f.drawings,
    output: items(menuOf(f.top, 'Output')).join('\n'), settings: items(menuOf(f.top, 'Settings')).join('\n'),
  };
  const licence = read('CLAUDE.md').slice(read('CLAUDE.md').indexOf('## DELETION LICENCE'));
  for (const [door, where, pattern, home] of DOORS) {
    if (!where) {
      assert.ok(home.startsWith('*"'), `${door}: a deletion carries the owner's words`);
      continue;
    }
    const found = typeof pattern === 'string' ? surface[where].includes(pattern) : pattern.test(surface[where]);
    assert.ok(found, `${door}: not found on ${home}`);
  }
  assert.match(licence, /Clients\.\.\. and Projects\.\.\., die/, 'the licence names the two that die');
  assert.match(licence, /the six Output entries named in F5\.1/);
});

test('F5 . the CNC workspace carries "Export CNC / DXF", calling today\'s onExportDxfZip', () => {
  assert.match(code(read('src/pages/ConfiguratorPage.jsx')), /<CncView onExportDxfZip=\{onExportDxfZip\} \/>/);
  const src = code(read('src/components/CncView.jsx'));
  assert.match(src, /export default function CncView\(\{ onExportDxfZip = null \} = \{\}\)/);
  assert.match(src, /onClick=\{\(\) => onExportDxfZip\(\)\}/);
  assert.doesNotMatch(draw(CncView), /data-cnc-export/, 'no handler, no door that does nothing');
});

test('F5 . the page\'s Output drawing road left with its entries', () => {
  const page = code(read('src/pages/ConfiguratorPage.jsx'));
  assert.doesNotMatch(page, /const onDrawing = useCallback\(|booklet|exportBookletPdf|unitCardSheet/);
});

test('F5 . the house laws on this F\'s new file', () => {
  houseLaws('test/turn-cc1b-f05-output.test.js');
});
