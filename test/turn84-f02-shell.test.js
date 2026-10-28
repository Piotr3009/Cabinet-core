/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F2, THE SHELL (CLAUDE.md T84 PART A, F2): the tests of the shell.
//
// CLAUDE.md T84 F2, the list this file answers: *"the shell mounts only on the
// factory entry; the legacy `menus` array is rendered through the same
// `MenuBar` with the same length as TopBar's (read from source: the test
// imports nothing from React); the BOM button calls `setBomOpen`; Undo and
// Redo are the history store's; the MockModeBadge is in the status bar and
// nowhere else."*  Components are READ (node cannot load JSX); the pure module
// (components/studio/lib/studioFace.js) and the engine are imported.
//
// Three groups read INT's integration and are written to its final state
// (verify/t84/agents/CONTRACT.md sections 1 and 5): App.jsx hands the page
// the face, ConfiguratorPage draws StudioShell only under it, and the two
// patches of this slice (TopBar.jsx's `variant`, Messages.jsx's HistoryBar)
// are applied.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  breadcrumbOf, isStudioFace, libraryBesideAdd, projectLibraryCategory, railCheckBadge,
  selectionCountWords, statusSelectionWords, unitPlace, viewportWords,
} from '../src/components/studio/lib/studioFace.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { audienceForPath } from '../src/lib/appEntry.js';
import { buildDatabaseMenu, MENU_ORDER, orderMenus } from '../src/lib/topMenu.js';
import { buildOutputMenu, DRAWING_KINDS } from '../src/lib/outputMenu.js';
import { getUnitType, UNIT_CATEGORIES } from '../src/engine/types.js';
import { roomWalls } from '../src/engine/room.js';
import { findingsToAct } from '../src/engine/checks.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const TOP = read('src/components/TopBar.jsx');
const TOOLBAR = read('src/components/CanvasToolbar.jsx');
const MESSAGES = read('src/components/Messages.jsx');
const SHELL = read('src/components/studio/StudioShell.jsx');
const RAIL = read('src/components/studio/StudioRail.jsx');
const CRUMB = read('src/components/studio/SelectionBreadcrumb.jsx');
const STATUS = read('src/components/studio/StatusBar.jsx');
const FACE = read('src/components/studio/lib/studioFace.js');
const CENSUS = JSON.parse(read('verify/t84/census-main.json'));

/** The index of the bracket closing the one at `open`; strings, templates and comments skipped. */
function closeOf(text, open) {
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  let i = open;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') { i = text.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2) + 2; continue; }
    if (c === '\'' || c === '"') {
      let k = i + 1;
      while (k < text.length && text[k] !== c) k += text[k] === '\\' ? 2 : 1;
      i = k + 1;
      continue;
    }
    if (c === '`') {
      let k = i + 1;
      while (k < text.length && text[k] !== '`') {
        if (text[k] === '\\') { k += 2; continue; }
        if (text[k] === '$' && text[k + 1] === '{') { k = closeOf(text, k + 1) + 1; continue; }
        k += 1;
      }
      i = k + 1;
      continue;
    }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === ')' || c === ']' || c === '}') {
      assert.equal(stack.pop(), c, `unbalanced ${c}`);
      if (!stack.length) return i;
    }
    i += 1;
  }
  throw new Error('no closing bracket');
}

/** The source of `if (studio) { ... }` (the Studio layout) and of the last `return (` (the legacy one). */
function layoutsOfTopBar() {
  const at = TOP.indexOf('  if (studio) {');
  assert.ok(at > 0, 'TopBar draws a Studio layout under `if (studio)`');
  const studio = TOP.slice(at, closeOf(TOP, TOP.indexOf('{', at)) + 1);
  const from = TOP.indexOf('  return (', at + studio.length);
  assert.ok(from > 0, 'and the legacy layout after it');
  const legacy = TOP.slice(from, closeOf(TOP, TOP.indexOf('(', from)) + 1);
  return { studio, legacy };
}

/** A `const <name> = () => { ... };` helper of TopBar, as written. */
function helperOf(name) {
  const at = TOP.indexOf(`const ${name} = () => {`);
  assert.ok(at > 0, `TopBar writes ${name} once`);
  return TOP.slice(at, closeOf(TOP, TOP.indexOf('{', at + name.length + 10)) + 1);
}

// ═══ 1. THE FACE: THE SHELL MOUNTS ONLY ON THE FACTORY ENTRY ═══════════════════

test('F2 · isStudioFace: the factory entry with ui.studio.enabled, and nothing else', () => {
  const on = { ui: { studio: { enabled: true } } };
  const off = { ui: { studio: { enabled: false } } };
  assert.equal(isStudioFace('factory', on), true);
  assert.equal(isStudioFace('factory', off), false, 'the owner turns the face back by the profile');
  assert.equal(isStudioFace('retail', on), false, 'the retail entry never wears it');
  assert.equal(isStudioFace('factory', {}), false, 'a profile that says nothing about Studio is the legacy face');
  assert.equal(isStudioFace('factory', null), false);
  assert.equal(isStudioFace(undefined, on), false);
  assert.equal(isStudioFace('factory', { ui: { studio: { enabled: 'true' } } }), false, 'true, not a truthy word');
  // The doors, as lib/appEntry.js reads them.
  assert.equal(isStudioFace(audienceForPath('/'), on), true);
  assert.equal(isStudioFace(audienceForPath('/client'), on), false);
  assert.equal(isStudioFace(audienceForPath('/client/kitchens'), on), false);
});

test('F2 · the profile says Studio is PRO\'s face (*"nie, juz jest przy wyborze"*), and no button says otherwise', () => {
  assert.equal(P.ui.studio.enabled, true, 'THE NUMBERS: enabled true, CONFIRMED');
  assert.equal(isStudioFace('factory', P), true);
  assert.equal(isStudioFace('retail', P), false);
  // No switch in the UI: nothing in the shell writes the flag.
  for (const [name, src] of [['StudioShell', SHELL], ['StudioRail', RAIL], ['SelectionBreadcrumb', CRUMB], ['StatusBar', STATUS], ['TopBar', TOP]]) {
    assert.ok(!/studio\s*:\s*\{[^}]*enabled/.test(src) && !/setProfile/.test(src), `${name} writes the Studio flag`);
  }
});

test('F2 · App.jsx hands the page the face (final state, INT\'s F2 integration)', () => {
  const app = read('src/App.jsx');
  assert.match(app, /import \{ isStudioFace \} from '\.\/components\/studio\/lib\/studioFace\.js';/);
  assert.match(app, /isStudioFace\(audience,/, 'the face is the entry\'s and the profile\'s');
  assert.match(app, /<ConfiguratorPage studio=\{/, 'and the page is told');
  assert.ok(!/<StudioShell\b/.test(app), 'App draws no shell of its own');
  const at = app.indexOf("if (screen === 'start') {");
  assert.ok(at > 0);
  const start = app.slice(at, closeOf(app, app.indexOf('{', at + 20)) + 1);
  assert.ok(!/studio/i.test(start), 'the start screen never wears the face');
});

test('F2 · ConfiguratorPage draws StudioShell only under the face (final state, INT\'s F2 integration)', () => {
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.match(page, /import StudioShell from '\.\.\/components\/studio\/StudioShell\.jsx';/);
  assert.match(page, /export default function ConfiguratorPage\(\{\s*studio = false/);
  // The code, its comments set aside (they may name the shell in words).
  const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const uses = [...code.matchAll(/\bStudioShell\b/g)].map((m) => m.index)
    .filter((i) => !code.slice(code.lastIndexOf('\n', i), i).includes('import'));
  assert.ok(uses.length >= 1, 'the page draws the shell');
  for (const i of uses) {
    const before = code.slice(Math.max(0, i - 80), i);
    assert.match(before, /\bstudio\s*(?:\?|&&)\s*(?:\(\s*)?(?:<\s*)?$/, `StudioShell drawn without the face: ...${before}`);
  }
  assert.match(page, /<TopBar[\s\S]{0,80}variant=\{studio \? 'studio'/, 'the top bar is told its layout');
});

test('F2 · the retail entry never mounts the shell: no retail file reaches components/studio', () => {
  const walk = (dir) => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const hits = walk(join(ROOT, 'src/retail'))
    .filter((f) => /\.(js|jsx|mjs)$/.test(f))
    .filter((f) => /components\/studio\/|StudioShell|studioFace/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits, []);
});

// ═══ 2. THE TOP BAR: THE SAME `menus`, THE SAME MenuBar, BOTH LAYOUTS ══════════

test('F2 · TopBar has ONE `menus` array and ONE MenuBar, drawn by both layouts', () => {
  assert.equal([...TOP.matchAll(/\bconst menus = \[/g)].length, 1, 'one array (the census lexes it out of this file)');
  assert.equal([...TOP.matchAll(/<MenuBar\b/g)].length, 1, 'one MenuBar element, never a copy');
  assert.match(helperOf('drawMenuBar'), /<MenuBar menus=\{orderMenus\(menus\)\} \/>/, 'the whole array, in the owner\'s order');
  const { studio, legacy } = layoutsOfTopBar();
  assert.match(studio, /<div className="studio-legacy-menu[^"]*">\{drawMenuBar\(\)\}<\/div>/, 'the Studio bar holds the legacy menus WHOLE');
  assert.equal([...legacy.matchAll(/\{drawMenuBar\(\)\}/g)].length, 1, 'and the legacy bar draws the same one');
  assert.match(TOP, /const studio = variant === 'studio';/);
  assert.match(TOP, /variant = null,/, 'absent, the bar of today');
});

test('F2 · the array the two layouts draw is the census\'s 48 leaves, menu for menu', () => {
  const k = TOP.search(/\bconst menus = \[/);
  const open = TOP.indexOf('[', k);
  const arrayText = TOP.slice(open, closeOf(TOP, open) + 1);
  const calls = [];
  const state = {
    profile: P,
    UNIT_CATEGORIES,
    buildOutputMenu,
    buildDatabaseMenu,
    DRAWING_KINDS,
    viewMode: '3d',
    contourView: false,
    dirty: false,
    showOutlines: true,
    showDimensions: false,
    showFrontDimensions: false,
    dimensionColour: null,
    brightness: 1,
    realisticLighting: true,
    lightOn: false,
    xray: false,
    hideFronts: false,
    snapStep: 1,
    bomOpen: false,
  };
  const scope = new Proxy({}, {
    has: (t, key) => typeof key === 'string' && (key in state || !(key in globalThis)),
    get: (t, key) => {
      if (key === Symbol.unscopables) return undefined;
      if (key in state) return state[key];
      return (...args) => { calls.push({ name: String(key), args }); };
    },
  });
  // eslint-disable-next-line no-new-func
  const menus = new Function('__scope', `with (__scope) { return (${arrayText}); }`)(scope);
  const ordered = orderMenus(menus);
  assert.deepEqual(ordered.map((m) => m.label), MENU_ORDER, 'File / View / Library / Settings / Database / Spraying / Lighting / Output');
  // The census's rule 1: an entry that acts (a dropdown item with no items of
  // its own, a submenu's child, a slider item, a top-level entry with run).
  const leaves = (menu) => {
    if (!menu.items || !menu.items.length) return typeof menu.run === 'function' ? 1 : 0;
    return menu.items.filter((it) => it && !it.divider)
      .reduce((n, it) => n + (Array.isArray(it.items) && it.items.length ? leaves(it) : 1), 0);
  };
  const perMenu = Object.fromEntries(ordered.map((m) => [m.label, leaves(m)]));
  assert.deepEqual(perMenu, CENSUS.static.topMenu.perMenu, 'every menu keeps its leaves');
  assert.equal(Object.values(perMenu).reduce((a, b) => a + b, 0), CENSUS.static.topMenu.total);
  assert.equal(CENSUS.static.topMenu.total, 48);
});

test('F2 · every header control is written once and drawn by both layouts', () => {
  const { studio, legacy } = layoutsOfTopBar();
  // The T31 law: one definition, four doors (New, Open, Close, the badge).
  assert.equal([...TOP.matchAll(/leaveProject/g)].length, 5);
  assert.equal([...TOP.matchAll(/\bgoToStart\b/g)].length, 3);
  for (const [helper, handler] of [
    ['drawWordmark', 'onClick={leaveProject}'],
    ['drawProjectName', 'onClick={() => setEditing(true)}'],
    ['drawSave', 'onClick={save}'],
    ['drawBrightness', 'onChange={(e) => setBrightness(Number(e.target.value))}'],
    ['drawAccount', 'onClick={onAuth}'],
    ['drawBom', 'onClick={() => setBomOpen(!bomOpen)}'],
  ]) {
    assert.equal(TOP.split(handler).length - 1, 1, `${handler} is written once`);
    assert.ok(helperOf(helper).includes(handler), `${helper} carries ${handler}`);
    assert.ok(studio.includes(`{${helper}()}`), `the Studio layout draws ${helper}`);
    assert.ok(legacy.includes(`{${helper}()}`), `the legacy layout draws ${helper}`);
  }
  // The census reads the header's controls out of every `return (`: each
  // helper has its own.
  for (const helper of ['drawWordmark', 'drawProjectName', 'drawSave', 'drawBrightness', 'drawAccount', 'drawBom']) {
    assert.match(helperOf(helper), /\{\n\s+return \(/, `${helper} returns through \`return (\``);
  }
  // The Studio order (CLAUDE.md T84 F2) and the legacy order (today's).
  const order = (src, names) => names.map((n) => src.indexOf(n));
  const s = order(studio, ['{drawWordmark()}', '>PRO<', '{drawProjectName()}', '{drawMenuBar()}', '<StudioHistory />', '{drawSave()}', '{drawBrightness()}', '{drawAccount()}', '{drawBom()}']);
  assert.ok(s.every((v, i) => v > 0 && (i === 0 || v > s[i - 1])), `the Studio bar's order: ${s}`);
  const l = order(legacy, ['{drawWordmark()}', '{drawMenuBar()}', '{drawProjectName()}', '{drawSave()}', '<MockModeBadge />', '{drawBrightness()}', '{drawAccount()}', '{drawBom()}']);
  assert.ok(l.every((v, i) => v > 0 && (i === 0 || v > l[i - 1])), `the legacy bar's order: ${l}`);
  assert.ok(!legacy.includes('StudioHistory') && !legacy.includes('PRO<'), 'the legacy bar gains nothing');
  assert.match(studio, /<header\b/, 'the Studio top bar is a <header> (the census finds it by its menu nav)');
  assert.match(studio, /style=\{\{ height: 'var\(--studio-top\)' \}\}/, 'its height is the profile\'s');
});

test('F2 · the gold button: BOM on the Studio bar, the same setBomOpen call (*"tak"*)', () => {
  const bom = helperOf('drawBom');
  assert.match(bom, /className="cc-btn-gold"/);
  assert.match(bom, /onClick=\{\(\) => setBomOpen\(!bomOpen\)\}/, 'the call of today');
  assert.match(bom, /\{studio \? 'BOM' : 'Export'\}/, 'renamed on the Studio bar, the legacy bar unchanged');
  assert.match(bom, /data-studio=\{studio \? 'topbar-bom' : undefined\}/);
  assert.match(TOP, /const bomOpen = useUiStore\(\(s\) => s\.bomOpen\);/);
  assert.match(TOP, /const setBomOpen = useUiStore\(\(s\) => s\.setBomOpen\);/);
  // Output > Bill of materials... is still the other road to the same panel.
  assert.match(TOP, /onOpenBom: \(\) => setBomOpen\(true\),/);
});

test('F2 · Undo and Redo on the Studio bar are the history store\'s, with the toolbar\'s guards and titles', () => {
  assert.match(TOP, /import \{ useHistoryStore \} from '\.\.\/stores\/historyStore\.js';/);
  const at = TOP.indexOf('function StudioHistory() {');
  assert.ok(at > 0);
  const body = TOP.slice(at, closeOf(TOP, TOP.indexOf('{', at + 10)) + 1);
  for (const line of [
    'const undoDepth = useHistoryStore((s) => s.past.length);',
    'const redoDepth = useHistoryStore((s) => s.future.length);',
    'const undo = useHistoryStore((s) => s.undo);',
    'const redo = useHistoryStore((s) => s.redo);',
  ]) {
    assert.ok(body.includes(line), `StudioHistory: ${line}`);
    assert.ok(TOOLBAR.includes(line), `the toolbar reads the same: ${line}`);
  }
  for (const piece of ['disabled={undoDepth === 0}', 'disabled={redoDepth === 0}', 'onClick={() => undo()}', 'onClick={() => redo()}']) {
    assert.ok(body.includes(piece), `StudioHistory: ${piece}`);
    assert.ok(TOOLBAR.includes(piece), `the toolbar's own: ${piece}`);
  }
  // The titles: the toolbar's, a colon where its Undo title carries a dash.
  const titleOf = (src, depth) => {
    const i = src.indexOf(`title={${depth} ?`);
    return src.slice(i, src.indexOf('\n', i));
  };
  assert.equal(titleOf(body, 'undoDepth'), titleOf(TOOLBAR, 'undoDepth').replace(' \u2014 ', ': '));
  assert.equal(titleOf(body, 'redoDepth'), titleOf(TOOLBAR, 'redoDepth'));
  assert.match(body, /data-studio="topbar-undo"/);
  assert.match(body, /data-studio="topbar-redo"/);
  const { studio, legacy } = layoutsOfTopBar();
  assert.ok(studio.includes('<StudioHistory />') && !legacy.includes('<StudioHistory'), 'drawn by the Studio bar only');
});

// ═══ 3. THE MOCK DATA BADGE: ON THE STATUS BAR, AND NOWHERE ELSE IN STUDIO ═════

test('F2 · MockModeBadge is in the status bar and nowhere else in the Studio face', () => {
  assert.match(STATUS, /import MockModeBadge from '\.\.\/MockModeBadge\.jsx';/);
  assert.equal([...STATUS.matchAll(/<MockModeBadge \/>/g)].length, 1);
  const { studio, legacy } = layoutsOfTopBar();
  assert.ok(!studio.includes('MockModeBadge'), 'the Studio top bar does not draw it');
  assert.equal([...legacy.matchAll(/<MockModeBadge \/>/g)].length, 1, 'the legacy bar keeps it');
  for (const helper of ['drawWordmark', 'drawMenuBar', 'drawProjectName', 'drawSave', 'drawBrightness', 'drawAccount', 'drawBom']) {
    assert.ok(!helperOf(helper).includes('MockModeBadge'), `${helper} does not carry it into the Studio bar`);
  }
  const dir = join(ROOT, 'src/components/studio');
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  const elsewhere = walk(dir).filter((f) => /\.jsx?$/.test(f) && !f.endsWith('StatusBar.jsx'))
    .filter((f) => /<MockModeBadge\b/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(elsewhere, [], 'no other Studio surface draws it');
  // Its home, as the census finds it: a <footer> carrying data-studio-status.
  assert.match(STATUS, /<footer\s[^>]*data-studio="statusbar"[^>]*data-studio-status=""/);
});

// ═══ 4. THE SHELL: SLOTS, THE PROFILE'S NUMBERS, NOTHING FROM A LATER F ════════

test('F2 · StudioShell takes slots and imports nothing from a later F', () => {
  assert.match(SHELL, /export default function StudioShell\(\{\s*topBar = null,\s*inspector = null,\s*sceneEdge = null,\s*statusExtras = null,\s*renderRailMenu = null,\s*children = null,\s*\}\)/);
  const later = /InspectorHost|QuickSelectionCard|\/cards\/|IssueStrip|RefusedField|UnitIssueMarker|studioIssues|SceneToggles|SceneViewMenu|CameraBar|cameraPresets|RailMenus|studioEscape|studioCards/;
  for (const [name, src] of [['StudioShell', SHELL], ['StudioRail', RAIL], ['SelectionBreadcrumb', CRUMB], ['StatusBar', STATUS]]) {
    const imports = src.split('\n').filter((l) => /^import\b/.test(l)).join('\n');
    assert.ok(!later.test(imports), `${name} imports a later F:\n${imports}`);
  }
  assert.match(SHELL, /import '\.\/studio\.css';/);
  assert.match(SHELL, /import \{ studioCssVars, studioWidths \} from '\.\/lib\/studioSkin\.js';/);
  assert.equal([...SHELL.matchAll(/<StudioIcons \/>/g)].length, 1, 'the sprite, once');
  // Its rows: the top bar, the breadcrumb, the workspace, the status bar.
  const rows = ['{topBar}', '<SelectionBreadcrumb />', 'data-studio="workspace"', '<StatusBar extras={statusExtras}'].map((x) => SHELL.indexOf(x));
  assert.ok(rows.every((v, i) => v > 0 && (i === 0 || v > rows[i - 1])), `the four rows in order: ${rows}`);
  const cols = ['<StudioRail', 'data-studio="scene"', '{inspector}'].map((x) => SHELL.indexOf(x));
  assert.ok(cols.every((v, i) => v > 0 && (i === 0 || v > cols[i - 1])), `rail | scene | inspector: ${cols}`);
  assert.match(SHELL, /renderMenu=\{renderRailMenu\}/);
  assert.match(SHELL, /<div ref=\{sceneRef\} data-studio="scene" className="studio-scene relative overflow-hidden[^"]*">\s*\{children\}\s*\{sceneEdge\}\s*<\/div>/,
    'the existing scene layer, then the scene edge, in a relative slot');
});

test('F2 · the shell\'s lengths are the profile\'s, through studioSkin; the inspector column is 0 when absent or hidden', () => {
  assert.match(SHELL, /gridTemplateRows: 'var\(--studio-top\) var\(--studio-context\) minmax\(0, 1fr\) var\(--studio-status\)'/);
  assert.match(SHELL, /gridTemplateColumns: 'var\(--studio-rail\) minmax\(0, 1fr\) var\(--studio-inspector\)'/);
  assert.match(SHELL, /const column = inspector && mode !== 'none' \? mode : 'none';/);
  assert.match(SHELL, /studioCssVars\(profile, \{ viewportWidth: viewport\.width, inspector: column \}\)/);
  assert.match(SHELL, /studioWidths\(profile, viewport\.width\)/);
  assert.match(SHELL, /data-inspector=\{mode \|\| 'quick'\}/, 'the root says the store\'s mode');
  assert.match(SHELL, /className="studio-pro\b/);
  assert.match(SHELL, /window\.addEventListener\('resize', onResize\)/, 're-read on resize');
  assert.match(RAIL, /profile\.ui\.studio\.libraryGapPx/, 'the Library\'s gap is the profile\'s');
  // None of THE NUMBERS typed in a component.
  const numbers = /\b(?:48|34|30|112|56|344|316|400|360|1440|1500|1280|800)px\b|\[(?:48|34|30|112|56|344|316|400|360)px\]/;
  for (const [name, src] of [['StudioShell', SHELL], ['StudioRail', RAIL], ['SelectionBreadcrumb', CRUMB], ['StatusBar', STATUS]]) {
    assert.ok(!numbers.test(src), `${name} types one of THE NUMBERS: ${src.match(numbers)}`);
  }
});

test('F2 · the shell\'s DOM hooks (CONTRACT section 6)', () => {
  for (const hook of ['shell', 'scene', 'workspace']) assert.ok(SHELL.includes(`data-studio="${hook}"`), hook);
  for (const hook of ['rail', 'rail-select', 'rail-add', 'rail-room', 'rail-materials', 'rail-check', 'rail-design', 'rail-cnc']) {
    assert.ok(RAIL.includes(`"${hook}"`), hook);
  }
  for (const hook of ['breadcrumb', 'breadcrumb-show-inspector']) assert.ok(CRUMB.includes(`data-studio="${hook}"`), hook);
  assert.ok(STATUS.includes('data-studio="statusbar"'));
  const top = layoutsOfTopBar().studio;
  assert.ok(top.includes('data-studio="topbar"'));
  for (const hook of ['topbar-save', 'topbar-brightness', 'topbar-account', 'topbar-bom']) {
    assert.ok(TOP.includes(`data-studio={studio ? '${hook}' : undefined}`), `${hook}, on the Studio layout only`);
  }
});

// ═══ 5. THE RAIL ══════════════════════════════════════════════════════════════

test('F2 · the rail: 5 + 2, each the existing store action', () => {
  assert.match(RAIL, /const onSelect = \(\) => \{ closeMenu\(\); closeLibrary\(\); \};/, 'Select: the Library shut, its insertion cleared by the store (closeLibrary)');
  assert.match(RAIL, /pressed=\{!libraryCategory\}/, 'Select is pressed while no Library is open');
  assert.match(RAIL, /onClick=\{\(e\) => openModal\('room', \{ anchor: anchorOfEvent\(e\) \}\)\}/, 'Room: the Room setup window, beside the button');
  assert.match(RAIL, /onClick=\{toggleCheck\}/);
  assert.match(RAIL, /pressed=\{checkOpen\}/);
  assert.match(RAIL, /const badge = railCheckBadge\(useCheckFindings\(\)\);/, 'the Check panel\'s own list');
  assert.match(RAIL, /onClick=\{\(\) => setViewMode\('3d'\)\}/);
  assert.match(RAIL, /onClick=\{\(\) => setViewMode\('cnc'\)\}/);
  assert.match(RAIL, /pressed=\{viewMode === '3d'\}/);
  assert.match(RAIL, /pressed=\{viewMode === 'cnc'\}/);
  // The toolbar's 3D | CNC pair has no guard; the rail's foot adds none.
  assert.ok(!/disabled=\{[^}]*\}\s*\n?\s*onClick=\{\(\) => setViewMode/.test(RAIL));
  // Add and Materials: the rail's popups through the slot (F7), drawn in the shell's popup layer.
  assert.match(RAIL, /renderMenu\(menu\.kind, \{ anchor: menu\.anchor, onClose: closeMenu \}\)/);
  assert.match(RAIL, /anchor: e\.currentTarget\.getBoundingClientRect\(\)/, 'the anchor is the button\'s DOMRect');
  assert.match(RAIL, /createPortal\(popup, popupLayer\)/);
  // ...and before F7: Add opens the Library beside the button at the job's
  // category; Materials is disabled and says why.
  assert.match(RAIL, /const onAdd = \(e\) => \(renderMenu \? toggleMenu\('add', e\) : openLibraryBeside\(e\)\);/);
  assert.match(RAIL, /if \(!libraryCategory\) setLibraryCategory\(projectLibraryCategory\(design\)\);/);
  assert.match(RAIL, /disabled=\{!renderMenu\}/);
  assert.match(RAIL, /labels=\{labels\}/);
  assert.match(SHELL, /labels=\{widths\.railLabels\}/, 'labels when studioWidths says so');
  // The labels are CLAUDE.md's.
  for (const label of ['Select', 'Add', 'Room', 'Materials', 'Check', 'Design', 'CNC']) {
    assert.ok(RAIL.includes(`label="${label}"`), label);
  }
});

test('F2 · the rail\'s Check badge is the toolbar\'s count, red when a red finding is in it', () => {
  const fixture = [
    { level: 'red', unitId: 'a', message: 'r' },
    { level: 'yellow', unitId: 'a', message: 'y' },
    { level: 'note', unitId: 'b', message: 'n' },
  ];
  assert.deepEqual(railCheckBadge(fixture), { count: 2, red: true });
  assert.equal(railCheckBadge(fixture).count, findingsToAct(fixture).length, 'the toolbar\'s `findingsToAct(...).length`');
  assert.deepEqual(railCheckBadge(fixture.slice(1)), { count: 1, red: false });
  assert.deepEqual(railCheckBadge([{ level: 'note' }]), { count: 0, red: false }, 'a note asks nothing');
  assert.deepEqual(railCheckBadge([]), { count: 0, red: false });
  assert.deepEqual(railCheckBadge(undefined), { count: 0, red: false });
  assert.match(TOOLBAR, /const checkCount = findingsToAct\(checkFindings\)\.length;/, 'the toolbar counts the same way');
});

test('F2 · Add opens the Library at the job\'s category, beside the button, in the scene\'s coordinates', () => {
  assert.equal(projectLibraryCategory(undefined), 'kitchen', 'an unknown job is the default type');
  assert.equal(projectLibraryCategory({ projectType: 'wardrobe' }), 'wardrobe');
  assert.equal(projectLibraryCategory({ projectType: 'vanity' }), 'kitchen');
  assert.ok(UNIT_CATEGORIES.some((c) => c.id === projectLibraryCategory({ projectType: 'hallway' })));
  // The page's first plus asks the same.
  assert.match(read('src/pages/ConfiguratorPage.jsx'), /getProjectType\(migrateDesign\(design\)\.projectType\)/);
  // 8 px off the button's right edge, its top level with the button's, in the slot's coordinates.
  assert.deepEqual(libraryBesideAdd({ left: 8, top: 134, right: 104 }, { left: 96, top: 82 }, 8), { x: 16, y: 52 });
  assert.deepEqual(libraryBesideAdd({ left: 8, top: 134, right: 104 }, { left: 112, top: 82 }, 8), { x: 0, y: 52 });
  assert.deepEqual(libraryBesideAdd({ left: 8, top: 40, right: 104 }, { left: 104, top: 82 }, 8), { x: 8, y: 0 }, 'never above the slot');
  assert.equal(P.ui.studio.libraryGapPx, 8, 'THE NUMBERS: the Library 8 px off the button');
});

// ═══ 6. THE BREADCRUMB AND THE STATUS BAR'S WORDS ═════════════════════════════

test('F2 · the selection in CLAUDE.md\'s words: 1 cabinet, 2 cabinets, nothing', () => {
  assert.equal(selectionCountWords(0), 'Nothing selected');
  assert.equal(selectionCountWords(1), '1 cabinet selected');
  assert.equal(selectionCountWords(2), '2 cabinets selected');
  assert.equal(selectionCountWords(7), '7 cabinets selected');
  assert.equal(selectionCountWords(undefined), 'Nothing selected');
});

test('F2 · a wall by the drawing set\'s letter, an island\'s face by the room\'s own label', () => {
  const walls = roomWalls(undefined);
  assert.deepEqual(unitPlace(walls, { position: { wall: 0 } }), { kind: 'wall', label: 'Wall A' });
  assert.deepEqual(unitPlace(walls, { position: { wall: 3 } }), { kind: 'wall', label: 'Wall D' });
  assert.deepEqual(unitPlace(walls, { position: {} }), { kind: 'wall', label: 'Wall A' }, 'no wall said is wall 0, as the store reads it');
  const room = {
    islands: [{
      id: 'isl1', cx: 2000, cy: 2000, w: 2400, d: 900, rotation: 0,
    }],
  };
  const withIsland = roomWalls(room);
  const face = withIsland.find((w) => w.island);
  assert.ok(face, 'the fixture room has an island');
  const place = unitPlace(withIsland, { position: { wall: face.index } });
  assert.equal(place.kind, 'island');
  assert.equal(place.label, `Island 1 \u00b7 face ${face.face}`);
});

test('F2 · the breadcrumb: the project, the place, the unit number in bold', () => {
  const units = [
    { id: 'a', type: 'BUD', params: { unit_num: '01' }, position: { wall: 1 } },
    { id: 'b', type: 'WUD', params: { unit_num: 'WU01' }, position: { wall: 1 } },
    { id: 'c', type: 'BUD', params: { unit_num: '02' }, position: { wall: 2 } },
  ];
  const one = breadcrumbOf({ projectName: 'Hampstead', units, selectedUnitIds: ['a'], selectedUnitId: 'a' });
  assert.deepEqual(one, {
    crumbs: ['Hampstead', 'Wall B'], current: '01', count: 1, words: '1 cabinet selected',
  });
  const two = breadcrumbOf({ projectName: 'Hampstead', units, selectedUnitIds: ['a', 'b'], selectedUnitId: 'b' });
  assert.deepEqual(two, {
    crumbs: ['Hampstead', 'Wall B'], current: '2 cabinets', count: 2, words: '2 cabinets selected',
  });
  const apart = breadcrumbOf({ projectName: 'Hampstead', units, selectedUnitIds: ['a', 'c'], selectedUnitId: 'c' });
  assert.deepEqual(apart.crumbs, ['Hampstead'], 'two walls: the place is not one of them');
  const none = breadcrumbOf({ projectName: 'Hampstead', units, selectedUnitIds: [], selectedUnitId: null });
  assert.deepEqual(none, {
    crumbs: ['Hampstead'], current: null, count: 0, words: 'Nothing selected',
  });
  const gone = breadcrumbOf({ projectName: 'Hampstead', units, selectedUnitIds: ['zz'], selectedUnitId: 'zz' });
  assert.equal(gone.count, 0, 'a deleted cabinet is not selected');
  // The component shows the button only while the inspector is hidden, and it only shows it.
  assert.match(CRUMB, /\{inspector === 'none' && \(/);
  assert.match(CRUMB, /onClick=\{\(\) => showInspector\?\.\(\)\}/);
  assert.ok(!/toggleInspectorPin|setInspector\(|hideInspector/.test(CRUMB), 'the breadcrumb never pins or hides');
  assert.match(CRUMB, /<strong\b/, 'the unit number in bold');
});

test('F2 · the status bar: the selection in words, the Changes drawer re-homed, the viewport size', () => {
  const units = [
    { id: 'a', type: 'BUD', params: { unit_num: '01' }, position: { wall: 0 } },
    { id: 'b', type: 'WUD', params: { unit_num: 'WU01' }, position: { wall: 0 } },
  ];
  assert.equal(statusSelectionWords({ units, selectedUnitIds: ['a'], selectedUnitId: 'a' }), `01 \u00b7 ${getUnitType('BUD').label}`);
  assert.equal(statusSelectionWords({ units, selectedUnitIds: ['a', 'b'], selectedUnitId: 'b' }), 'Shared selection');
  assert.equal(statusSelectionWords({ units, selectedUnitIds: [], selectedUnitId: null }), 'No selection');
  assert.equal(viewportWords(1440, 900), '1440 x 900');
  assert.equal(viewportWords(1280.4, 799.6), '1280 x 800');
  // The order of the bar.
  const order = ['<ChangesDrawer />', 'data-studio="statusbar-selection"', '<MockModeBadge />', 'data-studio="statusbar-dirty"', '{extras}', 'data-studio="statusbar-viewport"']
    .map((x) => STATUS.indexOf(x));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), `the status bar's order: ${order}`);
  assert.match(STATUS, /\{dirty && \(/, 'the dirty marker while there is unsaved work');
  assert.match(STATUS, /title="Unsaved changes"/, 'in the Save control\'s own words');
});

// ═══ 7. THE CHANGES BAR, THE SAME COMPONENT, RE-HOMED (final state: the Messages.jsx patch) ═

test('F2 · Messages.jsx exports its HistoryBar, and the column stops drawing it inside the shell', () => {
  assert.match(MESSAGES, /export function HistoryBar\(\) \{/);
  assert.match(MESSAGES, /export const ChangesBarRehomed = createContext\(false\);/);
  assert.match(MESSAGES, /export default function Messages\(\{ children = null, history = true \}\) \{/);
  assert.match(MESSAGES, /const rehomed = useContext\(ChangesBarRehomed\);/);
  assert.match(MESSAGES, /\{history && !rehomed && <HistoryBar \/>\}/);
  assert.equal([...MESSAGES.matchAll(/<HistoryBar \/>/g)].length, 1, 'one place draws it');
  // The bar's body is untouched (T79 F1's own asserts read it).
  assert.match(MESSAGES, /`Changes · \$\{history\.length\} \$\{open \? '▾' : '▴'\}`/);
  assert.match(MESSAGES, /e\.key === 'Escape'\) closeHistory\(\)/);
  // The status bar draws the same component, its list opening upward.
  assert.match(STATUS, /import \{ HistoryBar \} from '\.\.\/Messages\.jsx';/);
  assert.equal([...STATUS.matchAll(/<HistoryBar \/>/g)].length, 1);
  assert.match(STATUS, /className="absolute left-0 bottom-0 h-full flex flex-col justify-end/, 'it grows upward from the bar');
  assert.match(SHELL, /import \{ ChangesBarRehomed \} from '\.\.\/Messages\.jsx';/);
  assert.match(SHELL, /<ChangesBarRehomed\.Provider value>/);
});

// ═══ 8. THE HOUSE RULES ═══════════════════════════════════════════════════════

test('F2 · every new file opens with the Skylon header; nothing this slice wrote carries a dash or a curly quote', () => {
  const header = read('scripts/t83-walk.mjs').split('\n').slice(0, 8).join('\n');
  const mine = {
    'src/components/studio/StudioShell.jsx': SHELL,
    'src/components/studio/StudioRail.jsx': RAIL,
    'src/components/studio/SelectionBreadcrumb.jsx': CRUMB,
    'src/components/studio/StatusBar.jsx': STATUS,
    'src/components/studio/lib/studioFace.js': FACE,
    'test/turn84-f02-shell.test.js': read('test/turn84-f02-shell.test.js'),
  };
  const banned = /[\u2013\u2014\u2018\u2019\u201c\u201d]/;
  for (const [rel, src] of Object.entries(mine)) {
    assert.ok(src.startsWith(`${header}\n`), `${rel} does not open with the header`);
    assert.ok(!banned.test(src), `${rel}: ${src.match(banned)}`);
  }
  // The patched blocks of TopBar.jsx and Messages.jsx: what this slice wrote there.
  const ifAt = TOP.indexOf('  if (studio) {');
  const topBlock = TOP.slice(TOP.indexOf('// \u2500\u2500\u2500 T84 F2 (CLAUDE.md PART A): ONE SET OF CONTROLS'), closeOf(TOP, TOP.indexOf('{', ifAt)) + 1);
  const historyBlock = TOP.slice(TOP.indexOf('// \u2500\u2500\u2500 T84 F2 (CLAUDE.md PART A): UNDO AND REDO'));
  const msgBlock = MESSAGES.slice(MESSAGES.indexOf('// \u2500\u2500\u2500 T84 F2'), MESSAGES.indexOf('// \u2500\u2500\u2500 T79 F1 \u00b7 THE CHANGES BAR'));
  for (const [what, block] of [['TopBar, the shared controls and the Studio bar', topBlock], ['TopBar, StudioHistory', historyBlock], ['Messages, ChangesBarRehomed', msgBlock]]) {
    assert.ok(block.length > 200, `${what} is there`);
    assert.ok(!banned.test(block), `${what}: ${block.match(banned)}`);
  }
});
