/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F7 (CLAUDE.md T84 PART E): THE PARITY GATE, NOT ONE FUNCTION LOST
//
// The owner, 27.10.2026, 22:13: *"czy zadna funkcja nam nie zginie? np corners
// etc"*; 22:19: *"wiem ze silnik jako tako nie ruszamy ale funkcje w menu musza
// sie zachowac wszystkie"*. CLAUDE.md T84 PART E: *"THE PARITY TEST
// `test/turn84-f07-parity.test.js` (S6 with S7): reads
// `verify/t84/census-main.json` and the SOURCE of the Studio components and
// asserts: every menu leaf of the census is rendered by the shell's MenuBar
// with the same label and handler name (the `menus` array is one module,
// `lib/studioMenus.js` or TopBar's own, imported by both faces); every toolbar
// control of the census has a Studio home (a table in the test: label, today's
// handler, the Studio component); every header control; the 22 context
// actions untouched (the file's hash); the 26 modal kinds still opened by name
// somewhere in `src`; the library categories and type counts equal."*
//
// THE CENSUS ITSELF counts the branch's source: scripts/t84-census.mjs
// --static-only (P1's machine, its own counting rules, no browser) is run
// against census-main.json, so this gate and the census can never count two
// different ways. Its live half (`--studio`, `--legacy`) needs the built app:
// INT runs it, and once its files are written the last test below holds them.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync, readFileSync, readdirSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { UNIT_CATEGORIES, UNIT_TYPES } from '../src/engine/types.js';
import { KITCHEN_LIBRARY, WARDROBE_LIBRARY, flattenLibrary } from '../src/engine/library.js';
import { SHIPPED_SETS } from '../src/engine/sets.js';
import { buildDatabaseMenu } from '../src/lib/topMenu.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const sha = (p) => createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex');
const MAIN = JSON.parse(read('verify/t84/census-main.json'));
// The two dashes this turn never writes, made here so this file carries neither.
const EM_DASH = String.fromCharCode(0x2014);
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${EM_DASH}]`);

// === THE CENSUS'S OWN STATIC HALF, ON THIS TREE ==============================

const NOW = (() => {
  const out = join(tmpdir(), `t84-f07-parity-${process.pid}-${Date.now()}.json`);
  const run = spawnSync(process.execPath, ['scripts/t84-census.mjs', '--static-only', '--write', out], {
    cwd: ROOT, encoding: 'utf8', timeout: 120000,
  });
  let json = null;
  try { json = JSON.parse(readFileSync(out, 'utf8')); } catch { json = null; }
  rmSync(out, { force: true });
  return {
    status: run.status, stdout: run.stdout || '', stderr: run.stderr || '', json,
  };
})();

// === A SMALL READER OF THE SOURCE ===========================================

/** The source without its comments (strings and templates left whole). */
function code(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') { const e = text.indexOf('\n', i); i = e < 0 ? text.length : e; continue; }
    if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; continue; }
    if (c === '\'' || c === '"' || c === '`') {
      let k = i + 1;
      while (k < text.length && text[k] !== c) k += text[k] === '\\' ? 2 : 1;
      out += text.slice(i, k + 1);
      i = k + 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/** The index of the brace closing the one at `open` (strings skipped). */
function closeBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\'' || c === '"' || c === '`') {
      let k = i + 1;
      while (k < text.length && text[k] !== c) k += text[k] === '\\' ? 2 : 1;
      i = k;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * The body of the function a position stands in: the innermost enclosing
 * `{ ... }` that is a function's (after `=>`, or after the parameters of a
 * named function), never an `if` / `for` block or an attribute's expression.
 */
function functionAround(text, at) {
  let depth = 0;
  for (let i = at; i >= 0; i -= 1) {
    const c = text[i];
    if (c === '}') { depth += 1; continue; }
    if (c !== '{') continue;
    if (depth > 0) { depth -= 1; continue; }
    const before = text.slice(0, i).trimEnd();
    let isBody = before.endsWith('=>');
    if (!isBody && before.endsWith(')')) {
      let d = 0;
      let k = before.length - 1;
      for (; k >= 0; k -= 1) {
        if (before[k] === ')') d += 1;
        else if (before[k] === '(') { d -= 1; if (d === 0) break; }
      }
      const word = (/([\w$]+)\s*$/.exec(before.slice(0, k)) || [])[1] || '';
      isBody = !['if', 'for', 'while', 'switch', 'catch', 'with'].includes(word);
    }
    if (isBody) {
      const end = closeBrace(text, i);
      if (end > at) return text.slice(i, end + 1);
    }
  }
  return '';
}

/** Every place a hook is written as a string in a file's code (comments left out). */
function hookPlaces(text, hook) {
  const out = [];
  for (const q of ['\'', '"']) {
    let k = text.indexOf(`${q}${hook}${q}`);
    while (k >= 0) { out.push(k); k = text.indexOf(`${q}${hook}${q}`, k + 1); }
  }
  return out;
}

/** The PRO source files (src, the retail tree left out), each with its text. */
function proFiles(dir = 'src') {
  const out = [];
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (p !== 'src/retail') out.push(...proFiles(p)); } else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}
const PRO = proFiles();

// === 1 · THE TOP MENU: 48 LEAVES, BY LABEL AND HANDLER, THROUGH ONE ARRAY ====

test('F7 parity · the census of this tree, static half, is GREEN against census-main.json', () => {
  assert.ok(NOW.json, `the census did not run:\n${NOW.stdout}\n${NOW.stderr}`);
  assert.equal(NOW.status, 0, `the census found RED rows:\n${NOW.stdout}`);
  assert.match(NOW.stdout, /\bGREEN\b/);
  const red = (NOW.json.comparison?.rows || []).filter((r) => /^RED/.test(r.status));
  assert.deepEqual(red.map((r) => `${r.key}: ${r.was} -> ${r.value} ${r.status}`), []);
});

test('F7 parity · every top-menu leaf of the census, by label and by the SAME handler and call', () => {
  const was = MAIN.static.topMenu.leaves;
  const now = new Map((NOW.json?.static?.topMenu?.leaves || []).map((l) => [l.path, l]));
  assert.equal(was.length, 48);
  for (const leaf of was) {
    const mine = now.get(leaf.path);
    assert.ok(mine, `GONE: ${leaf.path}`);
    assert.equal(mine.label, leaf.label, `${leaf.path}: label`);
    assert.equal(mine.handler, leaf.handler, `${leaf.path}: handler`);
    assert.equal(mine.call, leaf.call, `${leaf.path}: call`);
    assert.equal(mine.bound, leaf.bound, `${leaf.path}: what TopBar hands the builder`);
    assert.equal(mine.page, leaf.page, `${leaf.path}: what the page hands TopBar`);
  }
  assert.deepEqual(NOW.json.static.topMenu.order, MAIN.static.topMenu.order, 'the owner\'s menu order moved');
});

test('F7 parity · ONE menus array, TopBar\'s own, drawn by the same MenuBar in both faces', () => {
  const top = read('src/components/TopBar.jsx');
  const topCode = code(top);
  // One module holds the array: TopBar's own (lib/studioMenus.js was not made).
  assert.equal(existsSync(join(ROOT, 'src/lib/studioMenus.js')), false, 'a second home for the menus');
  assert.equal((topCode.match(/\bconst menus\s*=\s*\[/g) || []).length, 1, 'TopBar declares its menus once');
  // Every MenuBar in PRO is TopBar's, and each is handed that one array in the owner's order.
  for (const file of PRO) {
    const text = code(read(file));
    const bars = text.match(/<MenuBar\b[^>]*\/>/g) || [];
    if (file === 'src/components/TopBar.jsx') {
      assert.ok(bars.length >= 1, 'TopBar draws no MenuBar');
      for (const b of bars) assert.equal(b.replace(/\s+/g, ' '), '<MenuBar menus={orderMenus(menus)} />');
    } else {
      assert.deepEqual(bars, [], `${file} draws a MenuBar of its own`);
      assert.doesNotMatch(text, /\bmenus\s*=\s*\[\s*\{\s*label:/, `${file} builds a second menus array`);
    }
  }
  // The Studio's top bar is the same component, `variant="studio"`, and its
  // header draws that same MenuBar (directly, or through TopBar's own helper).
  assert.match(topCode, /\bvariant\b/, 'TopBar has no Studio variant');
  const at = hookPlaces(topCode, 'topbar')[0];
  assert.ok(at >= 0, 'the Studio top bar (data-studio="topbar") is not in TopBar.jsx');
  const header = functionAround(topCode, at);
  const drawn = /<MenuBar menus=\{orderMenus\(menus\)\} \/>/.test(header)
    || [...header.matchAll(/\{\s*([\w$]+)\(\)\s*\}/g)].some(([, fn]) => {
      const def = new RegExp(`const ${fn} = \\(\\) => \\{[\\s\\S]*?<MenuBar menus=\\{orderMenus\\(menus\\)\\} \\/>`).exec(topCode);
      return Boolean(def);
    });
  assert.ok(drawn, 'the Studio top bar does not draw the legacy MenuBar with the one menus array');
  // ...and the page hands the shell that bar (after INT integrates F2).
  const page = code(read('src/pages/ConfiguratorPage.jsx'));
  assert.match(page, /<TopBar\b[\s\S]{0,600}?variant=(?:"studio"|\{[^}]*'studio'[^}]*\})/, 'the page does not mount the Studio top bar');
});

test('F7 parity · the Output is the legacy Output, whole, and nothing in the Studio builds a second one', () => {
  // verify/t84/DECISIONS.md 7: one Output, the top bar's MenuBar's.
  const builders = PRO.filter((f) => /\bbuildOutputMenu\(/.test(code(read(f))));
  assert.deepEqual(builders.filter((f) => f !== 'src/lib/outputMenu.js'), ['src/components/TopBar.jsx']);
  assert.equal(MAIN.static.topMenu.perMenu.Output, 14);
  assert.equal(NOW.json?.static?.topMenu?.perMenu?.Output, 14);
});

// === 2 · THE 14 SCENE-TOOLBAR CONTROLS, EACH AT ITS STUDIO HOME ==============
//
// CanvasToolbar stays in the tree for the legacy face (CLAUDE.md T84 F6) and
// is not drawn under Studio, so each of its fourteen has a home in the Studio:
// the census's name, today's handler (census-main.json), the Studio component,
// the hook it carries there (verify/t84/agents/CONTRACT.md section 6) and the
// handler as that home calls it. The handler must stand in the same function
// as the hook: the control's own, not somewhere else in the file.

const TOOLBAR_HOMES = [
  ['Undo', 'undo', 'src/components/TopBar.jsx', 'topbar-undo', /\bundo\b/],
  ['Redo', 'redo', 'src/components/TopBar.jsx', 'topbar-redo', /\bredo\b/],
  ['Show dimensions', 'toggleDimensions', 'src/components/studio/SceneViewMenu.jsx', 'view-menu', /\btoggleDimensions\b/],
  ['Front dimensions', 'toggleFrontDimensions', 'src/components/studio/SceneViewMenu.jsx', 'view-menu', /\btoggleFrontDimensions\b/],
  ['Outlines', 'toggleOutlines', 'src/components/studio/SceneToggles.jsx', 'toggle-outlines', /\btoggleOutlines\b/],
  ['X-ray', 'toggleXray', 'src/components/studio/SceneToggles.jsx', 'toggle-xray', /\btoggleXray\b/],
  ['Props', 'toggleProps', 'src/components/studio/SceneViewMenu.jsx', 'view-menu', /\btoggleProps\b/],
  ['Hide fronts', 'toggleHideFronts', 'src/components/studio/SceneToggles.jsx', 'toggle-hide-fronts', /\btoggleHideFronts\b/],
  ['Measure', 'toggleRuler', 'src/components/studio/SceneViewMenu.jsx', 'view-menu', /\btoggleRuler\b/],
  ['Open all / Close all', 'toggleAllFronts(doorEntries)', 'src/components/studio/SceneToggles.jsx', 'toggle-open-all', /toggleAllFronts\(doorEntries\)/],
  ['BOM', 'setBomOpen(!bomOpen)', 'src/components/TopBar.jsx', 'topbar-bom', /setBomOpen\(!bomOpen\)/],
  ['Check . N', 'toggleCheck', 'src/components/studio/StudioRail.jsx', 'rail-check', /\btoggleCheck\b/],
  ['3D', 'setViewMode(\'3d\')', 'src/components/studio/StudioRail.jsx', 'rail-design', /setViewMode\('3d'\)/],
  ['CNC', 'setViewMode(\'cnc\')', 'src/components/studio/StudioRail.jsx', 'rail-cnc', /setViewMode\('cnc'\)/],
];

test('F7 parity · the home table names the census\'s fourteen, by name and by handler, in its order', () => {
  assert.deepEqual(
    TOOLBAR_HOMES.map(([name, handler]) => [name, handler]),
    MAIN.static.toolbar.controls.map((c) => [c.name, c.handler]),
  );
  // The legacy face keeps all fourteen (ZERO KASOWANIA): the census's own reading of CanvasToolbar.jsx.
  assert.deepEqual(
    (NOW.json?.static?.toolbar?.controls || []).map((c) => c.handler),
    MAIN.static.toolbar.controls.map((c) => c.handler),
  );
});

/** A control at its Studio home: the file, the hook in its code, the handler in the same function. */
function atHome(file, hook, handler) {
  assert.ok(existsSync(join(ROOT, file)), `${file} is not there yet`);
  const text = code(read(file));
  const places = hookPlaces(text, hook);
  assert.ok(places.length > 0, `${file} carries no '${hook}'`);
  const found = places.some((at) => handler.test(functionAround(text, at)));
  assert.ok(found, `${file}: '${hook}' and ${handler} are not in the same function`);
}

for (const [name, handler, file, hook, pattern] of TOOLBAR_HOMES) {
  test(`F7 parity · toolbar "${name}" (${handler}) lives at ${file.split('/').pop()} [${hook}]`, () => {
    atHome(file, hook, pattern);
  });
}

test('F7 parity · the View menu holds the four toolbar switches it re-homes, by their ids', () => {
  const view = code(read('src/components/studio/SceneViewMenu.jsx'));
  for (const [id, pattern] of [['dimensions', /run: toggleDimensions/], ['frontDimensions', /run: toggleFrontDimensions/],
    ['props', /run: toggleProps/], ['measure', /run: toggleRuler/]]) {
    assert.match(view, new RegExp(`'${id}'`), `View lists no ${id}`);
    const at = view.search(new RegExp(`\\n\\s+${id}: \\{`));
    assert.ok(at >= 0, `View has no entry for ${id}`);
    assert.match(view.slice(at, closeBrace(view, view.indexOf('{', at)) + 1), pattern, `View's ${id} calls something else`);
  }
});

// === 3 · THE 7 HEADER CONTROLS, AT THEIRS ====================================

const HEADER_HOMES = [
  ['CABINET CORE', 'leaveProject', 'src/components/TopBar.jsx', 'studio-wordmark', /onClick=\{leaveProject\}/],
  ['project name (rename)', 'setEditing(true)', 'src/components/TopBar.jsx', 'studio-project-name', /setEditing\(true\)[\s\S]*|setProjectName/],
  ['Save', 'save', 'src/components/TopBar.jsx', 'topbar-save', /onClick=\{save\}/],
  ['MOCK DATA MODE', null, 'src/components/studio/StatusBar.jsx', 'statusbar', /<MockModeBadge\b/],
  ['Bright', 'setBrightness(Number(e.target.value))', 'src/components/TopBar.jsx', 'topbar-brightness', /setBrightness\(Number\(e\.target\.value\)\)/],
  ['Account', 'onAuth', 'src/components/TopBar.jsx', 'topbar-account', /onClick=\{onAuth\}/],
  ['Export (= BOM)', 'setBomOpen(!bomOpen)', 'src/components/TopBar.jsx', 'topbar-bom', /setBomOpen\(!bomOpen\)/],
];

test('F7 parity · the header table names the census\'s seven, by name and by handler', () => {
  assert.deepEqual(
    HEADER_HOMES.map(([name, handler]) => [name, handler]),
    MAIN.static.header.controls.map((c) => [c.name, c.handler]),
  );
});

for (const [name, handler, file, hook, pattern] of HEADER_HOMES) {
  test(`F7 parity · header "${name}" lives at ${file.split('/').pop()} [${hook}]`, () => {
    atHome(file, hook, pattern);
  });
}

test('F7 parity · the project name keeps its rename and its end of edit; the gold button says BOM with the same call', () => {
  const top = code(read('src/components/TopBar.jsx'));
  const names = hookPlaces(top, 'studio-project-name').map((at) => functionAround(top, at));
  assert.ok(names.some((f) => /setEditing\(true\)/.test(f)), 'the Studio name lost its rename');
  assert.ok(names.some((f) => /setProjectName\(e\.target\.value\)/.test(f)), 'the Studio name lost its typing');
  assert.ok(names.some((f) => /e\.key === 'Enter' \|\| e\.key === 'Escape'\) setEditing\(false\)/.test(f)), 'the edit no longer ends on Enter and Escape');
  const bom = hookPlaces(top, 'topbar-bom').map((at) => functionAround(top, at));
  assert.ok(bom.some((f) => /'BOM'/.test(f) && /setBomOpen\(!bomOpen\)/.test(f)), 'the gold button is not BOM with the same call');
  // The badge stands on the status bar, the legacy header keeps its own (S1's own test says "nowhere else").
  assert.match(code(read('src/components/studio/StatusBar.jsx')), /<MockModeBadge \/>/);
});

// === 4 · THE RIGHT-CLICK MENU AND THE 26 WINDOWS, UNTOUCHED ==================

test('F7 parity · the 22 right-click actions untouched: the two files byte for byte as on main', () => {
  assert.equal(MAIN.static.context.rowsPresent, 22);
  assert.equal(sha('src/lib/contextActions.js'), MAIN.static.context.sha256, 'lib/contextActions.js moved (FROZEN 6)');
  assert.equal(sha('src/components/ContextMenu.jsx'), MAIN.static.context.component.sha256, 'ContextMenu.jsx moved (FROZEN 6)');
});

test('F7 parity · the 26 window kinds are each still opened by name from a PRO file', () => {
  assert.equal(MAIN.static.modalKinds.count, 26);
  const opened = new Map();
  for (const file of PRO) {
    for (const m of read(file).matchAll(/\b(?:openModal|pushModal)\(\s*'([a-z0-9-]+)'/g)) {
      opened.set(m[1], [...(opened.get(m[1]) || []), file]);
    }
  }
  const gone = MAIN.static.modalKinds.kinds.map((k) => k.kind).filter((k) => !opened.has(k));
  assert.deepEqual(gone, [], `no PRO file opens: ${gone.join(', ')}`);
});

// === 5 · THE LIBRARY ==========================================================

test('F7 parity · the library: the same categories, labels, type slots and types; the same registry and sets', () => {
  const was = MAIN.static.library;
  assert.deepEqual(
    UNIT_CATEGORIES.map((c) => ({
      id: c.id, label: c.label, count: c.types.length, types: [...c.types],
    })),
    was.categories.map((c) => ({
      id: c.id, label: c.label, count: c.count, types: c.types,
    })),
  );
  assert.equal(UNIT_CATEGORIES.reduce((s, c) => s + c.types.length, 0), was.typeSlots);
  assert.equal(new Set(UNIT_CATEGORIES.flatMap((c) => c.types)).size, was.distinctTypes);
  assert.equal(Object.keys(UNIT_TYPES).length, was.unitTypes);
  assert.equal(flattenLibrary(KITCHEN_LIBRARY).length, was.registryLeafCount.kitchen);
  assert.equal(flattenLibrary(WARDROBE_LIBRARY).length, was.registryLeafCount.wardrobe);
  assert.deepEqual(SHIPPED_SETS.map((s) => s.id), was.shippedSets.map((s) => s.id));
});

// === 6 · THE RAIL'S POPUPS: A SECOND ROAD, NEVER A SECOND LAW ================

const RAIL = code(read('src/components/studio/RailMenus.jsx'));

test('F7 parity · Add lists UNIT_CATEGORIES as the Library menu does, and calls what it calls', () => {
  assert.match(RAIL, /import \{ UNIT_CATEGORIES \} from '\.\.\/\.\.\/engine\/types\.js'/);
  assert.match(RAIL, /UNIT_CATEGORIES\.map\(/, 'the categories are typed, not read');
  assert.match(RAIL, /disabled=\{c\.soon\}/);
  assert.match(RAIL, /\{c\.soon && <span className="cc-tag">soon<\/span>\}/);
  // The Library menu's own call (census: Library > X is `setLibraryCategory(c.id)`) and the panel's own position.
  const library = MAIN.static.topMenu.leaves.filter((l) => l.menu === 'Library');
  assert.equal(library.length, 4);
  for (const l of library) assert.equal(l.handler, 'setLibraryCategory(c.id)');
  assert.match(RAIL, /setLibraryCategory\(c\.id\)/);
  assert.match(RAIL, /setLibraryPos\(/);
  // The place the scene's "+" chose is never cleared by placing the panel.
  assert.match(RAIL, /const keepPlace = Boolean\(libraryInsert\) && libraryCategory === c\.id;/);
  assert.match(RAIL, /if \(!keepPlace\) setLibraryCategory\(c\.id\);/);
  assert.doesNotMatch(RAIL, /clearLibraryInsert|openLibraryToInsert/, 'the rail touches the "+" path');
  // Beside the button by the profile's number, in the scene slot's coordinates, clamped with the panel's own size.
  assert.match(RAIL, /libraryBesideAdd\(button, frame, gapPx\)/);
  assert.match(RAIL, /panel\?\.offsetParent \|\| document\.querySelector\('\[data-studio="scene"\]'\)/);
  assert.match(RAIL, /studio\?\.libraryGapPx/);
});

test('F7 parity · Add\'s hints are the Library menu\'s own, word for word (a dash written as a colon)', () => {
  const top = read('src/components/TopBar.jsx');
  const at = top.indexOf('UNIT_CATEGORIES.map((c) => ({');
  assert.ok(at >= 0, 'TopBar no longer maps UNIT_CATEGORIES for its Library menu');
  const region = code(top.slice(at, top.indexOf('run: () => setLibraryCategory(c.id)', at)));
  const words = (text) => [...text.matchAll(/'([^']{6,})'/g)].map((m) => m[1].split(EM_DASH).map((s) => s.trim()).join(': '));
  const legacy = words(region);
  assert.equal(legacy.length, 3, `the Library menu's hints: ${legacy.join(' | ')}`);
  const hintFn = RAIL.slice(RAIL.indexOf('function categoryHint'), RAIL.indexOf('function databaseEntry'));
  assert.deepEqual(words(hintFn), legacy);
  // ...and the count, the same template.
  assert.match(region, /`\$\{c\.types\.length\} type\$\{c\.types\.length === 1 \? '' : 's'\}`/);
  assert.match(hintFn, /`\$\{c\.types\.length\} type\$\{c\.types\.length === 1 \? '' : 's'\}`/);
});

test('F7 parity · Materials opens the four existing windows, each as its first road opens it', () => {
  const top = code(read('src/components/TopBar.jsx'));
  const menu = code(read('src/components/ContextMenu.jsx'));
  // Selected finishes: the right-click Colour's own window and arguments.
  assert.match(menu, /openModal\('unit-finish', \{ unitIds: ids, anchor: menuAnchor\(\) \}\)/);
  assert.match(RAIL, /openModal\('unit-finish', \{ unitIds: \[\.\.\.chosen\], anchor: anchorOfEvent\(e\) \}\)/);
  assert.match(RAIL, /disabled: chosen\.length === 0/);
  // Project finishes, Assign materials, Stock: Settings..., Database > Assign materials..., Database > Materials...
  for (const kind of ['design', 'assign-materials', 'warehouse']) {
    assert.match(top, new RegExp(`openModal\\('${kind}', \\{ anchor: anchorOfEvent\\(e\\) \\}\\)`), `TopBar no longer opens ${kind}`);
    assert.match(RAIL, new RegExp(`openModal\\('${kind}', \\{ anchor: anchorOfEvent\\(e\\) \\}\\)`), `Materials does not open ${kind}`);
  }
  // Nothing else: four windows, by the CONTRACT's popup hooks.
  assert.deepEqual([...RAIL.matchAll(/\bid: '([a-z-]+)'/g)].map((m) => m[1]),
    ['selected-finishes', 'project-finishes', 'assign-materials', 'stock']);
  assert.equal((RAIL.match(/openModal\('/g) || []).length, 4);
});

test('F7 parity · Materials reads the Database menu\'s own words for the two windows it shares', () => {
  const noop = () => {};
  const only = (handlers) => buildDatabaseMenu(handlers).items.filter((i) => !i.disabled);
  const stock = only({ onMaterials: noop });
  const assign = only({ onAssignMaterials: noop });
  assert.equal(stock.length, 1);
  assert.equal(assign.length, 1);
  assert.equal(stock[0].label, MAIN.static.topMenu.leaves.find((l) => l.bound === 'openModal(\'warehouse\')').label);
  assert.equal(assign[0].label, MAIN.static.topMenu.leaves.find((l) => l.bound === 'openModal(\'assign-materials\')').label);
  assert.match(RAIL, /databaseEntry\(\{ onMaterials: noop \}\)/);
  assert.match(RAIL, /databaseEntry\(\{ onAssignMaterials: noop \}\)/);
  assert.match(RAIL, /label: assign\.label/);
});

test('F7 parity · the rail popups are Studio popups: hooked, closed outside, closed by the one Escape owner', () => {
  assert.match(RAIL, /data-studio="popup"/);
  assert.match(RAIL, /data-kind=\{kind\}/);
  assert.match(RAIL, /data-studio="popup-item"/);
  assert.match(RAIL, /className=\{`studio-popup studio-skin fixed \$\{LAYER_CLASS\.menu\}`\}/);
  assert.match(RAIL, /registerStudioPopup\(close\)/);
  assert.match(RAIL, /window\.addEventListener\('pointerdown', onDown, true\)/);
  assert.match(RAIL, /placeBesideAnchor\(\{/);
  assert.match(RAIL, /prefer: 'right'/);
  // The Output is not drawn here (DECISIONS 7), and no Studio file renders a MenuBar.
  assert.doesNotMatch(RAIL, /buildOutputMenu|<MenuBar/);
  // The rail's own contract: it asks for exactly these two (StudioRail.jsx).
  const railSrc = code(read('src/components/studio/StudioRail.jsx'));
  assert.match(railSrc, /toggleMenu\('add', e\)/);
  assert.match(railSrc, /toggleMenu\('materials', e\)/);
});

// CLAUDE.md T84 LAWS: *"no em or en dash; the Skylon header on every new
// file"*, TESTS AND PROOF: *"NEW_FILES; the Skylon header; no em or en dash"*.
// NEW_FILES (test/turn77-f5-no-copyright-line.test.js) checks a listed file's
// header only, so the dash gate S7 proposed for the turn's code is held here:
// every file under src/components/studio/, the turn's tests, its scripts and
// its classifier fragments (FROZEN 8: the designer's files in verify/t84/astra/
// are hers, and no gate scans them).
test('F7 parity · every T84 code file opens with the Skylon header and carries no em or en dash', () => {
  const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
  const files = [
    ...walk('src/components/studio'),
    ...readdirSync(join(ROOT, 'test')).filter((f) => /^turn84-.*\.test\.js$/.test(f)).map((f) => `test/${f}`),
    ...readdirSync(join(ROOT, 'scripts')).filter((f) => /^t84-.*\.mjs$/.test(f)).map((f) => `scripts/${f}`),
    ...readdirSync(join(ROOT, 'scripts/t78-classify.d')).filter((f) => /^f45-t84-.*\.mjs$/.test(f)).map((f) => `scripts/t78-classify.d/${f}`),
  ];
  for (const mine of ['src/components/studio/RailMenus.jsx', 'src/components/studio/lib/studioEscape.js',
    'test/turn84-f07-parity.test.js', 'test/turn84-f07-escape.test.js']) {
    assert.ok(files.includes(mine), `${mine} is not among the files scanned`);
  }
  const bare = files.filter((f) => !read(f).startsWith('/*\n * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.\n'));
  assert.deepEqual(bare, [], `no Skylon header: ${bare.join(', ')}`);
  const dashed = files.filter((f) => DASHES.test(read(f)));
  assert.deepEqual(dashed, [], `an em or en dash in: ${dashed.join(', ')}`);
});

// === 7 · THE LIVE CENSUS, ONCE INT HAS RUN IT ON THE BUILT BRANCH ============

for (const mode of ['studio', 'legacy']) {
  const file = `verify/t84/census-${mode}.json`;
  const ran = existsSync(join(ROOT, file));
  test(`F7 parity · the live census --${mode} equals census-main.json (the 13 panels, 649) with no RED row`, {
    skip: ran ? false : `${file} is not written yet: INT runs node scripts/t84-census.mjs --${mode} on the built branch`,
  }, () => {
    const live = JSON.parse(read(file));
    assert.equal(live.mode, mode);
    assert.equal(live.partial, false);
    for (const type of MAIN.types) {
      const was = MAIN.live.panels[type];
      const now = live.live.panels[type];
      assert.ok(now, `${type}: no panel counted`);
      assert.equal(now.visible, was.visible, `${type}: ${was.visible} visible controls on main, ${now.visible} now`);
      assert.deepEqual(now.sections.map((s) => [s.title, s.controls]), was.sections.map((s) => [s.title, s.controls]), `${type}: a section moved`);
    }
    assert.equal(live.live.panelTotal, 649);
    const red = (live.comparison?.rows || []).filter((r) => /^RED/.test(r.status));
    assert.deepEqual(red.map((r) => `${r.key}: ${r.was} -> ${r.value} ${r.status}`), []);
  });
}
