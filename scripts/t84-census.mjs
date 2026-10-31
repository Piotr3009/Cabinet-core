/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 P1 (a), THE CENSUS (CLAUDE.md T84 PART P (a); the parity gate of F7)
//
// CLAUDE.md T84 PART P (a): "THE CENSUS of main: `scripts/t84-census.mjs`
// drives the BUILT app (the CDP harness of `scripts/cdp.mjs`, as
// `t83-walk.mjs` does) and writes `verify/t84/census-main.json`: the menu
// leaves of every top menu by label and by the handler's name ...; the 14
// toolbar buttons by label; the 7 header controls; the 22 context actions by
// id (`lib/contextActions.js`); the 26 modal kinds (`openModal('x')` in src);
// the library types per category (`UNIT_CATEGORIES`); and, for the thirteen
// default units below placed on wall A at x 1200 and selected, with every
// panel section opened by `setPanelSection(id, true)` ..., the count of
// VISIBLE controls (`button, input, select, textarea` with `offsetParent !==
// null`) inside the right panel and per section." The owner, 27.10.2026:
// *"przelicz ile teraz mamy funkcji w menu i ile bedzie pozniej ... nie pisz
// mi okolo tylko dokladnie"*; 22:19: *"wiem ze silnik jako tako nie ruszamy
// ale funkcje w menu musza sie zachowac wszystkie"*.
//
// TWO HALVES. The STATIC half reads the source with fs and imports only the
// plain data modules (engine/profile.js, engine/types.js, engine/library.js,
// engine/sets.js, lib/outputMenu.js, lib/topMenu.js, lib/contextActions.js):
// no React. TopBar's `menus` array literal is cut out of TopBar.jsx by a small
// lexer and evaluated with stand-ins for every name it reads, so each leaf's
// `run` is the source's own function. The LIVE half drives the built app with
// the shared hands (scripts/t74-harness.mjs open, the PRO editor opened as
// its `pro()` opens it, scripts/cdp.mjs underneath): the menus are opened by
// real clicks and their submenus by real hovers and counted as drawn; the
// toolbar and the header are counted as drawn; the thirteen panels are
// counted as the owner's probe of 22:23 counted them
// (verify/t84/census-main-panels.txt, reproduced line for line).
//
//   node scripts/t84-census.mjs --build --serve      build dist/, serve it on E2E_PORT (4173), count, stop it
//   node scripts/t84-census.mjs --build --serve --out-dir /tmp/x --port 4184
//                                                    a private build in /tmp/x, served on 4184
//   node scripts/t84-census.mjs --legacy             the branch with profile.ui.studio.enabled false
//                                                    (writes verify/t84/census-legacy.json)
//   node scripts/t84-census.mjs --studio             ... enabled true, the inspector in 'full'
//                                                    (writes verify/t84/census-studio.json)
//   node scripts/t84-census.mjs --static-only        the source half only, no browser
//   node scripts/t84-census.mjs --write <path>       the JSON somewhere else
//   node scripts/t84-census.mjs --size 1280x800      another viewport (1440 x 900 by default)
//   node scripts/t84-census.mjs --types BUD,WUD      some panel rows only (a partial run writes no
//                                                    default file; give --write to keep it)
//   node scripts/t84-census.mjs --menus-source <f>   the file that holds `const menus = [` (TopBar.jsx
//                                                    by default; F7 may move it to lib/studioMenus.js)
//   node scripts/t84-census.mjs --legacy --verbose   every compared row, the EQUAL ones too
//   E2E_URL=http://127.0.0.1:4184/ node scripts/t84-census.mjs      another server
//
// THE MODES. `main` (no flag) counts the app as it opens: on main that is the
// only face there is. `--legacy` sets `profile.ui.studio.enabled = false` and
// `--studio` sets it true, both through `window.__cc.profile.setState` BEFORE
// the editor opens; `--studio` also calls `ui.showFullSettings?.()` after every
// selectUnit (the inspector's 'full' mode, which mounts the embedded
// RightPanel). On main both flags are no-ops: the flag is read by nothing.
// In every mode a control inside an element carrying `[data-studio-host]` is
// NOT one of the panel's own: it is counted apart as `hostControls` (zero on
// main).
//
// THE STUDIO HOMES (T84 F7, S6). Under `--studio` the canvas toolbar is not
// drawn (F6) and the header's controls are re-homed (F2), so the live toolbar
// and header are counted AT THEIR STUDIO HOMES, each found by its hook
// (verify/t84/agents/CONTRACT.md section 6) and reported with its home: Undo,
// Redo and BOM on the top bar; Show dimensions, Front dimensions, Props and
// Measure among the scene toggles when the profile's list names them, else in
// View (opened by a real click, its rows counted); Outlines, X-ray, Hide fronts
// and Open all / Close all among the toggles; Check on the rail; 3D and CNC at
// the rail's foot; and, of the header, the wordmark, the project name, Save,
// Bright, Account and BOM (Export renamed, the same call) on the top bar, the
// MockModeBadge on the status bar. A toggle the profile has taken off the edge
// and View does not hold is looked for in the top menu's drawn leaves (its
// legacy road). `--legacy` and `main` count as before.
//
// THE COMPARISON. When verify/t84/census-main.json exists and this run writes
// anywhere else, every row is compared with it and printed: a PANEL row (the
// thirteen totals, their sections and the sum) must be EQUAL (CLAUDE.md F7:
// "both must equal `census-main.json`"); every other count must be the SAME
// OR LARGER (THE CENSUS: "a smaller one is RED"); the context file's sha256
// must be equal (FROZEN 6). In `--studio` the live toolbar and header rows are
// the counts AT THEIR STUDIO HOMES (above), gated like every other count, and a
// control main had that is at no home is RED by name (`homesMissing`); F7's
// parity test holds the same homes in the source.
// Beside the counts, the items themselves: a menu path, a toolbar or header
// handler, a context id, a modal kind or a library type that main had and this
// run has not is RED by name, and so is a leaf whose call moved (LAWS 1: "by
// label and by the SAME handler"); a guard spelt differently is printed only.
// Any RED row exits 1. The main run is also held against THE CENSUS of 22:23
// (the numbers of CLAUDE.md, below) and says which differs.
//
// THE COUNTING RULES, each the one that reproduces THE CENSUS of 22:23:
//  1. A top-menu LEAF is an entry that acts: a dropdown item with no items of
//     its own, a submenu's child, a slider item (View > Brightness), and a
//     top-level entry with `run` and no `items` (Spraying, Lighting). A
//     submenu parent (View > Dimension colour, Settings > Snap, Output >
//     Drawings) and a divider are not. Dynamic leaves are expanded from their
//     data: profile.dimensions.colours, UNIT_CATEGORIES,
//     profile.editor.snapSteps, DRAWING_KINDS.
//  2. A leaf's HANDLER is read off its `run`: the name passed (`run:
//     toggleOutlines`), or the first call in the arrow's own source with its
//     first argument when that is a literal or a name (`openModal('save-as')`,
//     `setLibraryCategory(c.id)`; the event `e` is dropped). For Output and
//     Database it is the builder's own prop (`onRender`, `onDrawing(d.id)`,
//     `onExportDxf`, `onMaterials`), and BOUND is what TopBar hands that prop
//     (`onExportDxfZip`, `setBomOpen(true)`, `openModal('warehouse')`), PAGE
//     what ConfiguratorPage hands TopBar (`onRender` is `openModal('render')`).
//     CALL is the run invoked once with stand-ins, its arguments as passed
//     (`setLibraryCategory('kitchen')`).
//  3. A TOOLBAR control is a `<button` of components/CanvasToolbar.jsx (the
//     mapped 3D | CNC pair expanded from its array); its handler is its
//     onClick, its guard its `disabled` as written. Live: the buttons of the
//     bar that holds `[data-undo="1"]` and `[data-open-all-doors="1"]`.
//  4. A HEADER control is TopBar's own, outside the MenuBar: CABINET CORE, the
//     project name (the button and its edit field are ONE control), Save, the
//     MockModeBadge (shown in mock mode), Bright, Account, Export.
//  5. The CONTEXT actions are read off `menuActions` itself, run in node over
//     every UNIT_TYPE with and without a front and a drawer under the pointer:
//     25 ids from 20 `actions.push(` sites. THE CENSUS's 22 rows name 24 of
//     them: the cornice ladder (cornice-0 / -70 / -100) is ONE row and
//     "End panel - both sides" (end-panel-B) is not named; the rows are
//     checked, the ids are listed, the file's sha256 is kept.
//  6. A MODAL KIND is a distinct literal in `openModal('x'` or `pushModal('x'`
//     anywhere in src (whitespace and new lines allowed after the paren).
//  7. PANEL SOURCE TAGS: every occurrence of `<NumberField`, `<select`,
//     `<button`, `<input`, `<textarea` followed by a word boundary in the raw
//     file text, COMMENTS INCLUDED: that gives 108 / 49 / 16 = 173. Two of
//     ElementProperties.jsx's seven `<select` stand in `//` comments (on main,
//     lines 345 and 771); with block and whole-line comments stripped the
//     three files hold 108 / 47 / 16 = 171, kept beside it as `code`.
//  8. A PANEL count: the aside that holds `[data-unit-name="<id>"]`; its
//     `button, input, select, textarea` with `offsetParent !== null`, minus
//     those under `[data-studio-host]`; per tag in the order first met in the
//     DOM (`input:<type>`); LABELS are the `.cc-label` elements in it (the
//     owner's `labels=`; the `<label>` tags are kept apart as `labelTags`);
//     per section, every `section[data-section]` in it, its `data-open`
//     ("null" where the section is not a Section component: Pocket door,
//     Attach) and its own visible controls (the head's button included).
//
// Chromium: /opt/pw-browsers (CHROME_PATH is set from it when unset); nothing
// is downloaded. Everything this file writes is plain ASCII (no em or en
// dash): the JSON escapes any other character as \uXXXX.

import {
  readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

// === THE ARGUMENTS ==========================================================
const T0 = Date.now();
const REPO = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
if (flag('studio') && flag('legacy')) {
  process.stdout.write('--studio and --legacy are two runs, not one.\n');
  process.exit(2);
}
const MODE = flag('studio') ? 'studio' : (flag('legacy') ? 'legacy' : 'main');
const STATIC_ONLY = flag('static-only');
const PORT = Number(opt('port', process.env.E2E_PORT || 4173));
const BASE = process.env.E2E_URL || `http://127.0.0.1:${PORT}/`;
const OUT_DIR_ARG = opt('out-dir', null);
const OUT_DIR = OUT_DIR_ARG ? (isAbsolute(OUT_DIR_ARG) ? OUT_DIR_ARG : join(REPO, OUT_DIR_ARG)) : join(REPO, 'dist');
const [VW, VH] = String(opt('size', '1440x900')).toLowerCase().split('x').map(Number);
const SIZE = { width: Number.isFinite(VW) && VW > 0 ? VW : 1440, height: Number.isFinite(VH) && VH > 0 ? VH : 900 };
const PANEL_TYPES = ['BUD', 'BUDR', 'WUD', 'WARDROBE', 'VANITY2', 'MIRROR_CABINET', 'CORNER_L_BASE',
  'HAWA_POCKET', 'BLIND_BASE', 'PANTRY', 'BUD_INT', 'WUD_HOOD', 'FREE_PANEL'];
const TYPES_ARG = opt('types', '');
const TYPES = TYPES_ARG
  ? TYPES_ARG.split(',').map((s) => s.trim().toUpperCase()).filter((s) => PANEL_TYPES.includes(s))
  : PANEL_TYPES;
const PARTIAL = STATIC_ONLY || TYPES.length !== PANEL_TYPES.length;
const SECTION_IDS = ['carcass', 'add', 'contents', 'construction', 'doors', 'vanity', 'mirror'];
const MAIN_JSON = join(REPO, 'verify/t84/census-main.json');
const OWNER_PANELS = join(REPO, 'verify/t84/census-main-panels.txt');
const DEFAULT_WRITE = {
  main: MAIN_JSON,
  legacy: join(REPO, 'verify/t84/census-legacy.json'),
  studio: join(REPO, 'verify/t84/census-studio.json'),
}[MODE];
const WRITE_ARG = opt('write', null);
const WRITE = WRITE_ARG ? (isAbsolute(WRITE_ARG) ? WRITE_ARG : join(REPO, WRITE_ARG)) : (PARTIAL ? null : DEFAULT_WRITE);
const MENUS_SOURCE = opt('menus-source', null);
const rel = (p) => relative(REPO, p) || '.';
const src = (p) => readFileSync(join(REPO, p), 'utf8');
const j = (v) => JSON.stringify(v);
let head = '(unknown)';
let headShort = '(unknown)';
let branch = '(unknown)';
try {
  head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO }).toString().trim();
  headShort = head.slice(0, 7);
  branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: REPO }).toString().trim();
} catch { /* not a checkout */ }

// THE CENSUS of 22:23 (CLAUDE.md T84, THE CENSUS, main 9a441f13): the numbers
// the main run is held against. Copied from CLAUDE.md, never measured here.
const CENSUS_2223 = {
  topMenu: {
    total: 48, File: 5, View: 13, Library: 4, Settings: 5, Database: 5, Spraying: 1, Lighting: 1, Output: 14,
  },
  toolbar: 14,
  header: 7,
  context: 22,
  library: { kitchen: 36, wardrobe: 15, total: 51 },
  modalKinds: 26,
  panels: {
    BUD: 53, BUDR: 39, WUD: 58, WARDROBE: 53, VANITY2: 50, MIRROR_CABINET: 62, CORNER_L_BASE: 52,
    HAWA_POCKET: 45, BLIND_BASE: 53, PANTRY: 57, BUD_INT: 53, WUD_HOOD: 39, FREE_PANEL: 35, total: 649,
  },
  panelSources: {
    'RightPanel.jsx': 108, 'ElementProperties.jsx': 49, 'MultiUnitPanel.jsx': 16, total: 173,
  },
};

// === ASCII, FOR EVERYTHING WRITTEN AND PRINTED ==============================
const asciiJson = (value) => `${JSON.stringify(value, null, 2)
  .replace(/[^\x00-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}\n`;
const ASCII_WORDS = [
  [0x2026, '...'], [0x00b7, '.'], [0x00d7, 'x'], [0x00b0, ' deg'], [0x2013, '-'], [0x2014, '-'],
  [0x201c, '"'], [0x201d, '"'], [0x2018, '\''], [0x2019, '\''], [0x25b8, '>'], [0x2713, 'v'],
  [0x21b6, '(undo)'], [0x21b7, '(redo)'], [0x00b2, '2'], [0x2022, '*'], [0x26a0, '(!)'],
];
const ascii = (t) => {
  let s = String(t);
  for (const [code, word] of ASCII_WORDS) s = s.split(String.fromCharCode(code)).join(word);
  return s.replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
};
const say = (line = '') => process.stdout.write(`${ascii(line)}\n`);

// === THE SOURCE READER: strings, templates, comments, brackets ==============
function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i += 1) if (text.charCodeAt(i) === 10) n += 1;
  return n;
}
function skipQuoted(text, i) {
  const q = text[i];
  let k = i + 1;
  while (k < text.length) {
    if (text[k] === '\\') { k += 2; continue; }
    if (text[k] === q || text[k] === '\n') return k + 1;
    k += 1;
  }
  return k;
}
function skipTemplate(text, i) {
  let k = i + 1;
  while (k < text.length) {
    const c = text[k];
    if (c === '\\') { k += 2; continue; }
    if (c === '`') return k + 1;
    if (c === '$' && text[k + 1] === '{') { k = closeOf(text, k + 1) + 1; continue; }
    k += 1;
  }
  return k;
}
/** Walks the CODE of `text` (no strings, templates or comments), calling `visit(i, c)`. */
function walkCode(text, visit, from = 0, to = text.length) {
  let i = from;
  while (i < to) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') { const e = text.indexOf('\n', i); i = e < 0 ? to : e; continue; }
    if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? to : e + 2; continue; }
    if (c === '\'' || c === '"') { i = skipQuoted(text, i); continue; }
    if (c === '`') { i = skipTemplate(text, i); continue; }
    if (visit(i, c) === false) return i;
    i += 1;
  }
  return i;
}
/** The index of the bracket closing the one at `open`. */
function closeOf(text, open) {
  const want = { '[': ']', '{': '}', '(': ')' };
  const stack = [];
  let found = -1;
  walkCode(text, (i, c) => {
    if (want[c]) stack.push(want[c]);
    else if (c === ']' || c === '}' || c === ')') {
      if (stack.pop() !== c) throw new Error(`unbalanced ${c} at line ${lineOf(text, i)}`);
      if (!stack.length) { found = i; return false; }
    }
    return true;
  }, open);
  if (found < 0) throw new Error(`no close for ${text[open]} at line ${lineOf(text, open)}`);
  return found;
}
/** Splits the inside of a bracket pair at its top-level `sep`. */
function topLevelSplit(text, sep = ',') {
  const parts = [];
  let depth = 0;
  let start = 0;
  walkCode(text, (i, c) => {
    if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) depth -= 1;
    else if (c === sep && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
    return true;
  });
  parts.push(text.slice(start));
  return parts.map((s) => stripComments(s).trim()).filter(Boolean);
}
/** Block comments and comments that hold a whole line, gone (strings left alone). */
function stripComments(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') { const e = text.indexOf('\n', i); i = e < 0 ? text.length : e; continue; }
    if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; continue; }
    if (c === '\'' || c === '"') { const e = skipQuoted(text, i); out += text.slice(i, e); i = e; continue; }
    if (c === '`') { const e = skipTemplate(text, i); out += text.slice(i, e); i = e; continue; }
    out += c;
    i += 1;
  }
  return out;
}
/**
 * The text with every comment blanked to spaces (its newlines kept), the same
 * length, so a position found in it is the same position in the text. Every
 * search for CODE (`return (`, `function X(`, `menus = [`, a `<button`) runs
 * in it, so a comment that names code (T84 F2's TopBar: "each is a function
 * with its own `return (`") is never read as code. (T84 F7, S6.)
 */
function blankComments(text) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') { const e = text.indexOf('\n', i); const end = e < 0 ? text.length : e; out += blank(text.slice(i, end)); i = end; continue; }
    if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); const end = e < 0 ? text.length : e + 2; out += blank(text.slice(i, end)); i = end; continue; }
    if (c === '\'' || c === '"') { const e = skipQuoted(text, i); out += text.slice(i, e); i = e; continue; }
    if (c === '`') { const e = skipTemplate(text, i); out += text.slice(i, e); i = e; continue; }
    out += c;
    i += 1;
  }
  return out;
}
/** `key: value` of an object literal's top level (shorthand `key` gives key: key). */
function propsOf(objectText) {
  const inner = objectText.trim().replace(/^\{/, '').replace(/\}$/, '');
  const props = {};
  for (const part of topLevelSplit(inner)) {
    if (part.startsWith('...')) continue;
    let colon = -1;
    let depth = 0;
    walkCode(part, (i, c) => {
      if ('([{'.includes(c)) depth += 1;
      else if (')]}'.includes(c)) depth -= 1;
      else if (c === ':' && depth === 0) { colon = i; return false; }
      return true;
    });
    if (colon < 0) { props[part.trim()] = part.trim(); continue; }
    props[part.slice(0, colon).trim().replace(/^['"]|['"]$/g, '')] = part.slice(colon + 1).trim();
  }
  return props;
}
/** Every object literal in `text` that has a `label` key, with its props as written. */
function labelledLiterals(text) {
  const out = [];
  walkCode(text, (i, c) => {
    if (c !== '{') return true;
    let end;
    try { end = closeOf(text, i); } catch { return true; }
    const props = propsOf(text.slice(i, end + 1));
    if (props.label) out.push(props);
    return true;
  });
  return out;
}
/** A JSX tag's attributes as written: { name: '{expr}' | '"text"' | true }, and where the tag ends. */
function jsxTag(text, at) {
  let i = at + 1;
  while (i < text.length && /[\w.$]/.test(text[i])) i += 1;
  const name = text.slice(at + 1, i);
  const attrs = {};
  while (i < text.length) {
    while (/\s/.test(text[i])) i += 1;
    if (text[i] === '/' && text[i + 1] === '>') return { name, attrs, end: i + 2, selfClosing: true };
    if (text[i] === '>') return { name, attrs, end: i + 1, selfClosing: false };
    if (text[i] === '{') { const e = closeOf(text, i); i = e + 1; continue; }
    const m = /^[\w:-]+/.exec(text.slice(i));
    if (!m) { i += 1; continue; }
    const key = m[0];
    i += key.length;
    if (text[i] !== '=') { attrs[key] = true; continue; }
    i += 1;
    if (text[i] === '{') {
      const e = closeOf(text, i);
      attrs[key] = text.slice(i + 1, e).trim();
      i = e + 1;
    } else if (text[i] === '"' || text[i] === '\'') {
      const e = skipQuoted(text, i);
      attrs[key] = text.slice(i, e);
      i = e;
    }
  }
  return { name, attrs, end: text.length, selfClosing: false };
}
const squash = (s) => String(s).replace(/\s+/g, ' ').trim();
/** [start, end] of the body of `function <name>(...) {...}` in `text`, or the whole text. */
function functionBody(text, name) {
  const m = new RegExp(`function\\s+${name}\\s*\\(`).exec(blankComments(text));
  if (!m) return [0, text.length];
  const paren = text.indexOf('(', m.index);
  const brace = text.indexOf('{', closeOf(text, paren));
  return [brace, closeOf(text, brace)];
}
/** Every `<tag` of `names` in text[from, to), JSX comments skipped, with its attributes. */
function jsxTagsIn(text, from, to, names) {
  const out = [];
  const plain = blankComments(text);
  const re = new RegExp(`<(${names.join('|')})\\b`, 'g');
  re.lastIndex = from;
  let m;
  while ((m = re.exec(text)) && m.index < to) {
    if (plain[m.index] !== '<') { re.lastIndex = m.index + 1; continue; }
    const before = text.lastIndexOf('{/*', m.index);
    if (before >= 0 && text.indexOf('*/}', before) > m.index) { re.lastIndex = text.indexOf('*/}', before) + 3; continue; }
    const tag = jsxTag(text, m.index);
    out.push({ ...tag, at: m.index, line: lineOf(text, m.index) });
    re.lastIndex = tag.end;
  }
  return out;
}
/**
 * The handler of an arrow, as written: `(e) => openModal('save-as', {...})`
 * gives `openModal('save-as')`; a first argument that is not a literal or a
 * name keeps the whole call; the event `e` is dropped.
 */
function handlerOfSource(fnText) {
  const t = squash(fnText);
  const arrow = t.indexOf('=>');
  if (arrow < 0) return t;
  let body = t.slice(arrow + 2).trim();
  if (body.startsWith('{')) body = body.slice(1).trim();
  if (body.startsWith('(') && body.endsWith(')')) body = body.slice(1, -1).trim();
  const m = /^([\w$.]+?)(\?\.)?\(/.exec(body);
  if (!m) return body;
  const name = m[1];
  const open = m[0].length - 1;
  let close;
  try { close = closeOf(body, open); } catch { return body; }
  const args = topLevelSplit(body.slice(open + 1, close));
  if (!args.length || (args.length === 1 && args[0] === 'e')) return name;
  const first = args[0];
  if (/^('[^']*'|"[^"]*"|-?[\d.]+|true|false|null|[\w$]+(\.[\w$]+)*)$/.test(first) && first !== 'e') return `${name}(${first})`;
  return `${name}(${squash(body.slice(open + 1, close))})`;
}
/** A call as it was made: literal arguments, the event and a bare `{ anchor }` dropped. */
function fmtCall({ name, args }) {
  const shown = [];
  for (const a of args) {
    if (a && typeof a === 'object' && a.__fakeEvent) continue;
    if (a && typeof a === 'object' && Object.keys(a).every((k) => k === 'anchor')) continue;
    if (typeof a === 'string') shown.push(`'${a}'`);
    else if (a && typeof a === 'object') {
      shown.push(`{ ${Object.entries(a).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : String(v)}`).join(', ')} }`);
    } else shown.push(String(a));
  }
  return shown.length ? `${name}(${shown.join(', ')})` : name;
}

// === STATIC (1): THE TOP MENU ===============================================
const FAKE_EVENT = Object.freeze({
  __fakeEvent: true, currentTarget: null, target: null, preventDefault() {}, stopPropagation() {},
});
function standIns() {
  const calls = [];
  const made = new Map();
  const spy = (name) => {
    if (!made.has(name)) {
      const fn = function standIn(...args) { calls.push({ name, args }); return undefined; };
      Object.defineProperty(fn, 'name', { value: name });
      Object.defineProperty(fn, '__standIn', { value: name });
      made.set(name, fn);
    }
    return made.get(name);
  };
  return { calls, spy };
}
/** Runs `run` once and says what it called. */
function observe(run, calls) {
  if (typeof run !== 'function') return { handler: null, call: null, calls: [] };
  if (run.__standIn) {
    const before = calls.length;
    run(FAKE_EVENT);
    return { handler: run.__standIn, call: run.__standIn, calls: calls.slice(before).map(fmtCall) };
  }
  const before = calls.length;
  try { run(FAKE_EVENT); } catch (e) { return { handler: handlerOfSource(run.toString()), call: `(threw: ${e.message})`, calls: [] }; }
  const made = calls.slice(before).map(fmtCall);
  return { handler: handlerOfSource(run.toString()), call: made[0] || null, calls: made };
}
function leavesOf(menu, calls, path = [menu.label]) {
  const out = [];
  if (!menu.items || !menu.items.length) {
    if (typeof menu.run === 'function') out.push({ path: path.join(' > '), label: menu.label, ...observe(menu.run, calls), kind: 'button', disabled: Boolean(menu.disabled) });
    return out;
  }
  for (const item of menu.items) {
    if (!item || item.divider) continue;
    if (Array.isArray(item.items) && item.items.length) {
      out.push(...leavesOf({ ...item, label: item.label }, calls, [...path, item.label]).map((l) => ({ ...l, parent: item.label, parentDisabled: Boolean(item.disabled) })));
      continue;
    }
    out.push({
      path: [...path, item.label].join(' > '),
      label: item.label,
      ...observe(item.run, calls),
      kind: item.slider ? 'slider' : 'item',
      disabled: Boolean(item.disabled),
      soon: Boolean(item.soon),
      checked: item.checked == null ? null : Boolean(item.checked),
    });
  }
  return out;
}
/** The params a builder destructures, read off its own source. */
function paramsOf(fn) {
  const t = fn.toString();
  const open = t.indexOf('{');
  const close = closeOf(t, open);
  return topLevelSplit(t.slice(open + 1, close)).map((p) => p.split('=')[0].trim());
}
/** What ConfiguratorPage hands TopBar, prop by prop. */
function pageBindings() {
  const text = src('src/pages/ConfiguratorPage.jsx');
  const at = blankComments(text).indexOf('<TopBar');
  if (at < 0) return {};
  const { attrs } = jsxTag(text, at);
  const out = {};
  for (const [k, v] of Object.entries(attrs)) out[k] = typeof v === 'string' ? handlerOfSource(v) : v;
  return out;
}
async function staticTopMenu() {
  const { DEFAULT_CABINET_PROFILE: profile } = await import('../src/engine/profile.js');
  const { UNIT_CATEGORIES } = await import('../src/engine/types.js');
  const { buildOutputMenu, DRAWING_KINDS } = await import('../src/lib/outputMenu.js');
  const { buildDatabaseMenu, orderMenus, MENU_ORDER } = await import('../src/lib/topMenu.js');
  const candidates = MENUS_SOURCE ? [MENUS_SOURCE] : ['src/components/TopBar.jsx', 'src/lib/studioMenus.js'];
  let file = null;
  let text = null;
  let at = -1;
  for (const c of candidates) {
    if (!existsSync(join(REPO, c))) continue;
    const t = src(c);
    const k = blankComments(t).search(/\bmenus\s*=\s*\[/);
    if (k >= 0) { file = c; text = t; at = t.indexOf('[', k); break; }
  }
  if (!file) return { file: null, error: `no \`menus = [\` in ${candidates.join(' or ')}`, menus: [], leaves: [], total: 0 };
  const arrayText = text.slice(at, closeOf(text, at) + 1);
  // PASS A: TopBar's own names. State reads the census state (3D, no contour,
  // nothing dirty); every other name is a stand-in that records its calls.
  const A = standIns();
  const state = {
    profile,
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
    dimensionColour: profile.appearance?.dimensions?.colour ?? null,
    brightness: 1,
    realisticLighting: true,
    lightOn: false,
    xray: false,
    hideFronts: false,
    snapStep: 1,
    bomOpen: false,
    anchorOfEvent: () => undefined,
  };
  const scope = new Proxy({}, {
    has: (t, k) => typeof k === 'string' && (k in state || !(k in globalThis)),
    get: (t, k) => {
      if (k === Symbol.unscopables) return undefined;
      if (k in state) return state[k];
      return A.spy(String(k));
    },
  });
  // eslint-disable-next-line no-new-func
  const menus = new Function('__scope', `with (__scope) { return (${arrayText}); }`)(scope);
  const ordered = orderMenus(menus);
  const leaves = ordered.flatMap((m) => leavesOf(m, A.calls).map((l) => ({ menu: m.label, ...l })));
  // PASS B: the builders' own props, named after their parameters.
  const B = standIns();
  const named = (fn) => Object.fromEntries(paramsOf(fn).map((p) => [p, B.spy(p)]));
  const byProp = new Map();
  for (const built of [buildOutputMenu(named(buildOutputMenu)), buildDatabaseMenu(named(buildDatabaseMenu))]) {
    for (const l of leavesOf(built, B.calls)) byProp.set(l.path, l);
  }
  const page = pageBindings();
  // The guards as written: TopBar's literal, and the two builders' own.
  const literals = [
    ...labelledLiterals(arrayText).map((p) => ({ ...p, from: file })),
    ...labelledLiterals(buildDatabaseMenu.toString()).map((p) => ({ ...p, from: 'src/lib/topMenu.js' })),
    ...labelledLiterals(buildOutputMenu.toString()).map((p) => ({ ...p, from: 'src/lib/outputMenu.js' })),
  ];
  const guardOf = (leaf, run) => {
    const lit = literals.find((p) => /^['"]/.test(p.label) && p.label.slice(1, -1) === leaf.label)
      || literals.find((p) => p.run && run && squash(p.run) === squash(run.toString()))
      || literals.find((p) => p.run && squash(p.run) === squash(leaf.handler || ''))
      // A mapped entry whose `run` is written inside a ternary (Output > Drawings).
      || literals.find((p) => p.run && run && !/^['"]/.test(p.label) && squash(p.run).includes(squash(run.toString())));
    return lit ? {
      disabledWhen: lit.disabled || null, checkedWhen: lit.checked || null, soonWhen: lit.soon || null, from: lit.from,
    } : { disabledWhen: null, checkedWhen: null, soonWhen: null, from: null };
  };
  // The runs again, to match each leaf to its literal by its own source text.
  const runs = new Map();
  const collect = (m, path = [m.label]) => {
    if (!m.items || !m.items.length) { runs.set(path.join(' > '), m.run); return; }
    for (const it of m.items) {
      if (!it || it.divider) continue;
      if (Array.isArray(it.items) && it.items.length) collect(it, [...path, it.label]);
      else runs.set([...path, it.label].join(' > '), it.run);
    }
  };
  for (const m of ordered) collect(m);
  const out = leaves.map((l) => {
    const viaBuilder = byProp.get(l.path);
    // What TopBar hands the builder's prop, and what ConfiguratorPage hands TopBar for it.
    const boundName = String(l.call || '').split('(')[0];
    return {
      menu: l.menu,
      path: l.path,
      label: l.label,
      kind: l.kind,
      handler: viaBuilder ? viaBuilder.handler : l.handler,
      call: viaBuilder ? (viaBuilder.call || null) : (l.call || null),
      bound: viaBuilder ? (l.call || null) : null,
      page: viaBuilder && boundName && page[boundName] ? page[boundName] : null,
      enabledAtCensusState: !(l.disabled || l.parentDisabled),
      soon: Boolean(l.soon),
      ...guardOf(l, runs.get(l.path)),
      ...(l.parent ? { parent: l.parent, parentDisabledWhen: (literals.find((p) => /^['"]/.test(p.label) && p.label.slice(1, -1) === l.parent) || {}).disabled || null } : {}),
    };
  });
  const perMenu = {};
  for (const m of ordered) perMenu[m.label] = out.filter((l) => l.menu === m.label).length;
  return {
    file,
    line: lineOf(text, at),
    builders: ['src/lib/topMenu.js buildDatabaseMenu', 'src/lib/outputMenu.js buildOutputMenu'],
    order: ordered.map((m) => m.label),
    menuOrder: MENU_ORDER,
    pageBindings: page,
    perMenu,
    total: out.length,
    leaves: out,
  };
}

// === STATIC (2): THE SCENE TOOLBAR ==========================================
const TOOLBAR_NAMES = [
  ['undo', 'Undo'], ['redo', 'Redo'], ['toggleDimensions', 'Show dimensions'],
  ['toggleFrontDimensions', 'Front dimensions'], ['toggleOutlines', 'Outlines'], ['toggleXray', 'X-ray'],
  ['toggleProps', 'Props'], ['toggleHideFronts', 'Hide fronts'], ['toggleRuler', 'Measure'],
  ['toggleAllFronts', 'Open all / Close all'], ['setBomOpen', 'BOM'], ['toggleCheck', 'Check . N'],
  ["setViewMode('3d')", '3D'], ["setViewMode('cnc')", 'CNC'],
];
function censusName(handler) {
  const hit = TOOLBAR_NAMES.find(([h]) => handler === h || handler.startsWith(`${h}(`) || handler === `${h}()`);
  return hit ? hit[1] : null;
}
/** A button's children: its plain text, and the string literals of its `{...}` parts. */
function childrenText(text, from) {
  const end = text.indexOf('</button>', from);
  const raw = text.slice(from, end < 0 ? from : end);
  let plain = '';
  const literals = [];
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === '{') {
      const e = closeOf(raw, i);
      const expr = stripComments(raw.slice(i + 1, e));
      for (const m of expr.matchAll(/'([^']*)'/g)) if (m[1]) literals.push(m[1]);
      i = e + 1;
      continue;
    }
    plain += raw[i];
    i += 1;
  }
  return { text: squash(plain) || null, alternatives: literals.length ? literals : null };
}
function staticToolbar() {
  const file = 'src/components/CanvasToolbar.jsx';
  const text = src(file);
  const [from, to] = functionBody(text, 'CanvasToolbar');
  const controls = [];
  for (const found of jsxTagsIn(text, from, to, ['button'])) {
    const i = found.at;
    const tag = found;
    const kids = childrenText(text, tag.end);
    const onClick = typeof tag.attrs.onClick === 'string' ? tag.attrs.onClick : null;
    const before = text.slice(Math.max(0, i - 260), i);
    const mapped = /\{(\[\[[^\]]*\](?:\s*,\s*\[[^\]]*\])*\])\.map\(\(\[(\w+),\s*(\w+)\]\)\s*=>\s*\(\s*$/.exec(before);
    const base = {
      line: lineOf(text, i),
      disabled: typeof tag.attrs.disabled === 'string' ? squash(tag.attrs.disabled) : null,
      pressed: typeof tag.attrs['aria-pressed'] === 'string' ? squash(tag.attrs['aria-pressed']) : null,
      data: Object.keys(tag.attrs).filter((k) => k.startsWith('data-')),
    };
    if (mapped) {
      // The 3D | CNC pair: one button in the source, one control per row of its array.
      // eslint-disable-next-line no-new-func
      const rows = new Function(`return (${mapped[1]});`)();
      for (const row of rows) {
        const sub = (s) => (s == null ? s : s.replace(new RegExp(`\\b${mapped[2]}\\b`, 'g'), `'${row[0]}'`).replace(new RegExp(`\\b${mapped[3]}\\b`, 'g'), `'${row[1]}'`));
        const handler = handlerOfSource(sub(onClick));
        controls.push({
          ...base, handler, name: censusName(handler) || row[1], text: row[1], alternatives: null, pressed: sub(base.pressed), mappedFrom: mapped[1],
        });
      }
    } else {
      const handler = onClick ? (/^[\w$]+$/.test(onClick) ? onClick : handlerOfSource(onClick)) : null;
      controls.push({
        ...base, handler, name: censusName(handler || '') || kids.text, text: kids.text, alternatives: kids.alternatives,
      });
    }
  }
  return { file, component: 'CanvasToolbar', count: controls.length, controls };
}

// === STATIC (3): THE HEADER =================================================
function staticHeader() {
  const file = 'src/components/TopBar.jsx';
  const text = src(file);
  // Every `return (` of the component (F2 may give TopBar a Studio variant):
  // its JSX tags, the controls then deduplicated by handler.
  const [from, to] = functionBody(text, 'TopBar');
  const tags = [];
  const returns = [];
  const plain = blankComments(text);
  for (let r = plain.indexOf('return (', from); r >= 0 && r < to; r = plain.indexOf('return (', r + 8)) {
    const open = plain.indexOf('(', r);
    const close = closeOf(text, open);
    returns.push(lineOf(text, r));
    for (const t of jsxTagsIn(text, open, close, ['button', 'input', 'MockModeBadge', 'MenuBar'])) {
      tags.push({ ...t, kids: t.name === 'button' ? childrenText(text, t.end) : null });
    }
  }
  const controls = [];
  const nameInput = tags.find((t) => t.name === 'input' && /setProjectName/.test(String(t.attrs.onChange || '')));
  for (const t of tags) {
    if (t.name === 'MenuBar' || t === nameInput) continue;
    if (t.name === 'MockModeBadge') {
      controls.push({
        name: 'MOCK DATA MODE', tag: 'MockModeBadge', line: t.line, handler: null, display: 'components/MockModeBadge.jsx, shown when isMockMode',
      });
      continue;
    }
    const raw = t.name === 'input' ? t.attrs.onChange : t.attrs.onClick;
    const handler = typeof raw === 'string' ? (/^[\w$]+$/.test(raw) ? raw : handlerOfSource(raw)) : null;
    const row = {
      tag: t.name, type: typeof t.attrs.type === 'string' ? t.attrs.type.replace(/['"]/g, '') : null, line: t.line, handler, text: t.kids ? t.kids.text : null,
    };
    if (handler === 'leaveProject') row.name = 'CABINET CORE';
    else if (/setEditing\(true\)/.test(handler || '')) {
      row.name = 'project name (rename)';
      row.edit = nameInput ? {
        line: nameInput.line, onChange: handlerOfSource(nameInput.attrs.onChange), onKeyDown: squash(nameInput.attrs.onKeyDown || ''), onBlur: squash(nameInput.attrs.onBlur || ''),
      } : null;
    } else if (handler === 'save') row.name = 'Save';
    else if (/setBrightness/.test(handler || '')) row.name = 'Bright';
    else if (handler === 'onAuth') row.name = 'Account';
    else if (/setBomOpen/.test(handler || '')) row.name = 'Export (= BOM)';
    else row.name = row.text;
    row.disabled = typeof t.attrs.disabled === 'string' ? squash(t.attrs.disabled) : null;
    controls.push(row);
  }
  // One control per handler: a variant that draws the same control again is the same control.
  const seen = new Map();
  for (const c of controls) {
    const k = c.handler || c.tag;
    if (seen.has(k)) seen.get(k).alsoAtLines.push(c.line);
    else seen.set(k, { ...c, alsoAtLines: [] });
  }
  const unique = [...seen.values()];
  return {
    file, component: 'TopBar', returnsAtLines: returns, count: unique.length, controls: unique, pageBindings: pageBindings(),
  };
}

// === STATIC (4): THE CONTEXT ACTIONS ========================================
const CENSUS_CONTEXT_ROWS = [
  ['Edit cabinet...', ['edit-cabinet']], ['Edit drawer...', ['edit-drawer']], ['Rename', ['rename']],
  ['End panel L', ['end-panel-L']], ['End panel R', ['end-panel-R']], ['Top infill', ['top-infill']],
  ['Top cornice (the height ladder)', ['cornice-*']], ['Side infill', ['side-infill']],
  ['Pin infill L', ['pin-infill-L']], ['Pin infill R', ['pin-infill-R']], ['Bottom mask', ['bottom-mask']],
  ['Plinth', ['plinth']], ['Upstand', ['upstand']], ['Drawer fronts', ['drawer-fronts']],
  ['Unit colour', ['unit-colour']], ['Save as template', ['save-template']], ['Center shelves', ['center-shelves']],
  ['Rotate 90 deg', ['rotate-90']], ['Back to wall', ['back-to-wall']], ['Side to wall', ['side-to-wall']],
  ['Close all fronts', ['close-fronts']], ['Delete', ['delete']],
];
async function staticContext() {
  const file = 'src/lib/contextActions.js';
  const text = src(file);
  const sha256 = createHash('sha256').update(readFileSync(join(REPO, file))).digest('hex');
  const { menuActions } = await import('../src/lib/contextActions.js');
  const { UNIT_TYPES, defaultParamsFor } = await import('../src/engine/types.js');
  const { DEFAULT_CABINET_PROFILE: profile } = await import('../src/engine/profile.js');
  const seen = new Map();
  for (const type of Object.keys(UNIT_TYPES)) {
    let params;
    try { params = defaultParamsFor(type, profile); } catch { continue; }
    for (const panelPart of [null, 'FRONT', 'DRAWER-FRONT']) {
      for (const panelDrawer of [null, 1]) {
        const unit = { id: 'u1', type, params: { ...params, unit_num: '01' }, position: { wall: 0, x_mm: 0, rotation_deg: 0 } };
        for (const a of menuActions({ unit, panelPart, panelDrawer, store: {}, profile })) {
          const row = seen.get(a.id) || { id: a.id, label: a.label, group: a.group, types: new Set(), frontOnly: true, drawerOnly: true };
          row.types.add(type);
          if (panelPart == null) row.frontOnly = false;
          if (panelDrawer == null) row.drawerOnly = false;
          seen.set(a.id, row);
        }
      }
    }
  }
  const all = Object.keys(UNIT_TYPES).length;
  const ids = [...seen.values()].map((r) => ({
    id: r.id,
    label: r.label,
    group: r.group,
    offeredOnTypes: r.types.size,
    when: r.frontOnly ? 'a front under the pointer' : (r.drawerOnly ? 'a drawer under the pointer' : (r.types.size === all ? 'every type' : `${r.types.size} of ${all} types`)),
  }));
  const has = (id) => (id.endsWith('*') ? ids.some((r) => r.id.startsWith(id.slice(0, -1))) : ids.some((r) => r.id === id));
  const rows = CENSUS_CONTEXT_ROWS.map(([name, want]) => ({
    name, ids: want.flatMap((w) => (w.endsWith('*') ? ids.filter((r) => r.id.startsWith(w.slice(0, -1))).map((r) => r.id) : [w])), present: want.every(has),
  }));
  const named = new Set(rows.flatMap((r) => r.ids));
  return {
    file,
    sha256,
    pushSites: (text.match(/actions\.push\(/g) || []).length,
    ids,
    idCount: ids.length,
    censusRows: rows,
    rowsPresent: rows.filter((r) => r.present).length,
    notNamedByCensus: ids.filter((r) => !named.has(r.id)).map((r) => r.id),
    component: { file: 'src/components/ContextMenu.jsx', sha256: createHash('sha256').update(readFileSync(join(REPO, 'src/components/ContextMenu.jsx'))).digest('hex') },
  };
}

// === STATIC (5): THE MODAL KINDS ============================================
function filesUnder(dir) {
  const out = [];
  for (const e of readdirSync(join(REPO, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...filesUnder(p));
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}
function staticModalKinds() {
  const kinds = new Map();
  for (const f of filesUnder('src')) {
    const text = src(f);
    for (const m of text.matchAll(/\b(openModal|pushModal)\(\s*'([a-z0-9-]+)'/g)) {
      const k = kinds.get(m[2]) || { kind: m[2], openedAt: [], pro: 0, retail: 0 };
      k.openedAt.push(`${f}:${lineOf(text, m.index)} ${m[1]}`);
      if (f.startsWith('src/retail/')) k.retail += 1; else k.pro += 1;
      kinds.set(m[2], k);
    }
  }
  const list = [...kinds.values()].sort((a, b) => a.kind.localeCompare(b.kind));
  return {
    rule: "a distinct literal in openModal('x' or pushModal('x' anywhere in src",
    count: list.length,
    proOnly: list.filter((k) => k.pro > 0).length,
    kinds: list,
  };
}

// === STATIC (6): THE LIBRARY ================================================
async function staticLibrary() {
  const { UNIT_CATEGORIES, UNIT_TYPES } = await import('../src/engine/types.js');
  const { KITCHEN_LIBRARY, WARDROBE_LIBRARY, flattenLibrary } = await import('../src/engine/library.js');
  const { SHIPPED_SETS } = await import('../src/engine/sets.js');
  const categories = UNIT_CATEGORIES.map((c) => ({
    id: c.id, label: c.label, count: c.types.length, types: [...c.types], saved: Boolean(c.saved), sets: Boolean(c.sets), soon: Boolean(c.soon),
  }));
  const slots = categories.reduce((s, c) => s + c.count, 0);
  const distinct = new Set(categories.flatMap((c) => c.types));
  const inMany = [...distinct].filter((t) => categories.filter((c) => c.types.includes(t)).length > 1);
  const leaves = (entries) => flattenLibrary(entries).map((e) => ({
    id: e.id, kind: e.kind, typeId: e.typeId ?? null, label: e.label || null, variant: e.variant || null,
  }));
  return {
    file: 'src/engine/types.js UNIT_CATEGORIES; src/engine/library.js; src/engine/sets.js',
    categories,
    typeSlots: slots,
    distinctTypes: distinct.size,
    unitTypes: Object.keys(UNIT_TYPES).length,
    inMoreThanOneCategory: inMany,
    registryLeaves: { kitchen: leaves(KITCHEN_LIBRARY), wardrobe: leaves(WARDROBE_LIBRARY) },
    registryLeafCount: { kitchen: flattenLibrary(KITCHEN_LIBRARY).length, wardrobe: flattenLibrary(WARDROBE_LIBRARY).length },
    shippedSets: SHIPPED_SETS.map((s) => ({ id: s.id, name: s.name })),
  };
}

// === STATIC (7): THE PANEL SOURCES' CONTROL TAGS ============================
function staticPanelSources() {
  const files = ['src/components/RightPanel.jsx', 'src/components/ElementProperties.jsx', 'src/components/MultiUnitPanel.jsx'];
  const tags = ['NumberField', 'select', 'button', 'input', 'textarea'];
  const per = {};
  let total = 0;
  let code = 0;
  for (const f of files) {
    const raw = src(f);
    const stripped = stripComments(raw);
    const count = (text) => Object.fromEntries(tags.map((t) => [t, (text.match(new RegExp(`<${t}\\b`, 'g')) || []).length]));
    const r = count(raw);
    const c = count(stripped);
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    const inComments = [];
    raw.split('\n').forEach((line, n) => {
      const t = line.trim();
      if ((t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*')) && /<(NumberField|select|button|input|textarea)\b/.test(t)) inComments.push(n + 1);
    });
    per[f.split('/').pop()] = {
      file: f, ...r, total: sum(r), code: { ...c, total: sum(c) }, linesWithATagInAComment: inComments,
    };
    total += sum(r);
    code += sum(c);
  }
  return {
    rule: 'raw occurrences of <NumberField|<select|<button|<input|<textarea followed by a word boundary, comments included',
    files: per,
    total,
    codeTotal: code,
  };
}

// === THE STUDIO HOMES (T84 F7, S6): WHERE EACH CONTROL LIVES UNDER STUDIO ====
// The census's own names (TOOLBAR_NAMES, staticHeader), each with its Studio
// home and the hook it carries there (verify/t84/agents/CONTRACT.md section 6;
// test/turn84-f07-parity.test.js holds the same homes in the source). `toggle`
// is the scene toggle's hook when the profile's list puts it on the edge,
// `view` its row in View (`data-item`), `menu` its legacy road in the top
// menu's drawn leaves, looked for last.
const STUDIO_TOOLBAR_HOMES = [
  ['Undo', 'top bar', { hook: 'topbar-undo' }],
  ['Redo', 'top bar', { hook: 'topbar-redo' }],
  ['Show dimensions', 'View', { toggle: 'toggle-dimensions', view: 'dimensions', menu: 'View > Dimensions' }],
  ['Front dimensions', 'View', { toggle: 'toggle-front-dimensions', view: 'frontDimensions', menu: 'View > Show front dimensions' }],
  ['Outlines', 'scene toggles', { toggle: 'toggle-outlines', menu: 'View > Outlines' }],
  ['X-ray', 'scene toggles', { toggle: 'toggle-xray', menu: 'View > X-ray' }],
  ['Props', 'View', { toggle: 'toggle-props', view: 'props' }],
  ['Hide fronts', 'scene toggles', { toggle: 'toggle-hide-fronts', menu: 'View > Hide fronts' }],
  ['Measure', 'View', { toggle: 'toggle-measure', view: 'measure' }],
  ['Open all / Close all', 'scene toggles', { toggle: 'toggle-open-all' }],
  ['BOM', 'top bar', { hook: 'topbar-bom' }],
  ['Check . N', 'rail', { hook: 'rail-check' }],
  ['3D', 'rail foot', { hook: 'rail-design' }],
  ['CNC', 'rail foot', { hook: 'rail-cnc' }],
];
const STUDIO_HEADER_HOMES = [
  ['CABINET CORE', 'top bar', '[data-studio="topbar"] .studio-wordmark'],
  ['project name (rename)', 'top bar', '[data-studio="topbar"] .studio-project-name'],
  ['Save', 'top bar', '[data-studio="topbar-save"]'],
  ['MOCK DATA MODE', 'status bar', null],
  ['Bright', 'top bar', '[data-studio="topbar-brightness"]'],
  ['Account', 'top bar', '[data-studio="topbar-account"]'],
  ['Export (= BOM)', 'top bar', '[data-studio="topbar-bom"]'],
];

// === THE LIVE HALF ==========================================================
async function liveHalf() {
  if (!process.env.CHROME_PATH) {
    try {
      const dir = readdirSync('/opt/pw-browsers').filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
      const bin = dir && [`/opt/pw-browsers/${dir}/chrome-linux64/chrome`, `/opt/pw-browsers/${dir}/chrome-linux/chrome`].find((p) => existsSync(p));
      if (bin) process.env.CHROME_PATH = bin;
    } catch { /* cdp.mjs says what it tried */ }
  }
  const { open, showroomDown } = await import('./t74-harness.mjs');

  // --- the build and the server (--build, --serve) ---
  let preview = null;
  const served = async () => { try { const r = await fetch(BASE); return r.ok; } catch { return false; } };
  if (flag('build')) {
    say(`npx vite build${OUT_DIR_ARG ? ` --outDir ${OUT_DIR} --emptyOutDir` : ''} ...`);
    execFileSync('npx', ['vite', 'build', ...(OUT_DIR_ARG ? ['--outDir', OUT_DIR, '--emptyOutDir'] : [])], { cwd: REPO, stdio: 'inherit' });
  }
  if (flag('serve') && !(await served())) {
    preview = spawn('npx', ['vite', 'preview', '--outDir', OUT_DIR, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: REPO, stdio: 'ignore', detached: true });
    for (let t = 0; t < 120 && !(await served()); t += 1) await new Promise((r) => { setTimeout(r, 500); });
  }
  const stopPreview = () => { if (preview) { try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* gone */ } preview = null; } };
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopPreview(); process.exit(130); });
  if (!(await served())) {
    say(`No app at ${BASE}: build it and serve it (npx vite build; npx vite preview --port ${PORT} --strictPort), or pass --build --serve.`);
    stopPreview();
    process.exit(2);
  }

  const page = await open(SIZE);
  const UI = 'window.__cc.ui.getState()';
  const P = 'window.__cc.project.getState()';
  const live = { url: BASE, viewport: SIZE };
  try {
    // --- the PRO editor, opened as t74-harness pro() opens it; the flag set first ---
    await page.showroom(`${BASE}index.html`);
    await page.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
    await page.sleep(1500);
    if (MODE !== 'main') {
      live.flagSet = await page.ask(`(() => { const S = window.__cc.profile; S.setState((s) => ({ profile: { ...s.profile, ui: { ...s.profile.ui, studio: { ...(s.profile.ui.studio || {}), enabled: ${MODE === 'studio'} } } } }));
        return S.getState().profile.ui.studio; })()`);
    }
    if (!(await page.ask('Boolean(window.__cc.views && window.__cc.views.room)'))) {
      await page.ask(`(() => { ${P}.newProject('T84 census'); const ui = ${UI}; ui.openEditor(); ui.closeModal(); ui.closeLibrary && ui.closeLibrary(); return true; })()`);
      await page.waitFor('window.__cc.views && window.__cc.views.room', { timeout: 45000 });
    }
    await page.sleep(2600);
    live.buildStamp = await page.ask('(document.querySelector("[data-build-stamp]") || { getAttribute: () => null }).getAttribute("data-build-stamp")');
    live.appEntry = await page.ask('document.documentElement.getAttribute("data-app-entry")');
    live.studioFlag = await page.ask('(window.__cc.profile.getState().profile.ui || {}).studio || null');

    // --- real hands ---
    const centre = (expr) => page.ask(`(() => { const el = (${expr}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
    const mouseTo = async (at) => { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y }); await page.sleep(160); };
    const clickAt = async (at) => {
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
      await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1, buttons: 1 });
      await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1, buttons: 0 });
      await page.sleep(350);
    };

    // --- (live 1) THE MENUS, opened by real clicks, submenus by real hovers ---
    await page.ask(`(() => { const ui = ${UI}; ui.clearSelection(); ui.setViewMode('3d'); ui.setContourView && ui.setContourView(false); return true; })()`);
    const NAV = 'nav[aria-label="Main menu"]';
    const tops = await page.ask(`[...document.querySelectorAll('${NAV} > div > button')].map((b) => (b.textContent || '').replace(/\\s+/g, ' ').trim())`);
    const readItems = (menuExpr) => page.ask(`(() => { const menu = (${menuExpr}); if (!menu) return [];
      return [...menu.children].map((child) => {
        if (child.classList.contains('cc-divider')) return null;
        const slider = child.querySelector(':scope input[data-menu-slider]');
        if (slider) { const span = child.querySelector('span.flex-1'); const r = slider.getBoundingClientRect(); return { label: (span ? span.textContent : '').trim(), slider: true, disabled: slider.disabled, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
        const b = child.querySelector(':scope > button[role="menuitem"]'); if (!b) return null;
        const span = b.querySelector('span.flex-1'); const r = b.getBoundingClientRect();
        return { label: (span ? span.textContent : b.textContent).trim(), sub: Boolean(b.querySelector('span[aria-hidden]')), disabled: b.disabled, soon: Boolean(b.querySelector('.cc-tag')), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }).filter(Boolean); })()`);
    const menus = [];
    for (const top of tops) {
      const topExpr = `[...document.querySelectorAll('${NAV} > div > button')].find((b) => (b.textContent || '').replace(/\\s+/g, ' ').trim() === ${j(top)})`;
      const at = await centre(topExpr);
      if (!at) { menus.push({ label: top, error: 'not on the screen', leaves: [] }); continue; }
      const modalBefore = await page.ask(`${UI}.modal || null`);
      await clickAt(at);
      const dropped = await page.ask(`Boolean(document.querySelector('${NAV} [role="menu"]'))`);
      if (!dropped) {
        const opened = await page.ask(`${UI}.modal || null`);
        menus.push({
          label: top, kind: 'button', opens: opened, leaves: [{ path: top, label: top, opens: opened }],
        });
        if (opened && opened !== modalBefore) await page.ask(`(${UI}.closeModal(), true)`);
        await page.sleep(300);
        continue;
      }
      const leaves = [];
      const first = await readItems(`document.querySelector('${NAV} [role="menu"]')`);
      for (let k = 0; k < first.length; k += 1) {
        const it = first[k];
        if (!it.sub) { leaves.push({ path: `${top} > ${it.label}`, label: it.label, slider: Boolean(it.slider), disabled: it.disabled, soon: Boolean(it.soon) }); continue; }
        await mouseTo({ x: it.x, y: it.y });
        const nested = await readItems(`(() => { const outer = document.querySelector('${NAV} [role="menu"]'); if (!outer) return null;
          const holder = [...outer.children].filter((c) => !c.classList.contains('cc-divider'))[${k}];
          return holder ? holder.querySelector(':scope [role="menu"]') : null; })()`);
        if (!nested.length) leaves.push({ path: `${top} > ${it.label}`, label: it.label, error: 'submenu did not open on hover' });
        for (const n of nested) leaves.push({ path: `${top} > ${it.label} > ${n.label}`, label: n.label, slider: Boolean(n.slider), disabled: n.disabled, soon: Boolean(n.soon), parent: it.label });
      }
      menus.push({ label: top, kind: 'dropdown', leaves });
      const again = await centre(topExpr);
      if (again) await clickAt(again);
      if (await page.ask(`Boolean(document.querySelector('${NAV} [role="menu"]'))`)) await page.pressKey('Escape');
    }
    live.topMenu = {
      order: tops,
      perMenu: Object.fromEntries(menus.map((m) => [m.label, m.leaves.length])),
      total: menus.reduce((s, m) => s + m.leaves.length, 0),
      menus,
    };

    // --- (live 2) THE HEADER and (live 3) THE TOOLBAR, as drawn ---
    // Under --studio, at their Studio homes (THE STUDIO HOMES, above); else as
    // they are drawn today.
    if (MODE === 'studio') {
      const VIEW_POPUP = '[data-studio="popup"][data-kind="view"]';
      const VIEW_ROWS = `${VIEW_POPUP} [data-studio="popup-item"]`;
      const describe = (selector) => page.ask(`(() => { const e = document.querySelector(${j(selector)}); if (!e || !e.getClientRects().length) return null;
        return { text: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40), title: (e.getAttribute('title') || '').slice(0, 80), disabled: Boolean(e.disabled), pressed: e.getAttribute('aria-pressed') }; })()`);
      // View, opened by a real click and read; then shut again by the same button.
      let viewRows = [];
      const viewAt = await centre('document.querySelector(\'[data-studio="view-menu"]\')');
      if (viewAt) {
        await clickAt(viewAt);
        viewRows = await page.ask(`[...document.querySelectorAll(${j(VIEW_ROWS)})].map((e) => ({ item: e.getAttribute('data-item'), text: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60), title: (e.getAttribute('title') || '').slice(0, 80), disabled: Boolean(e.disabled), pressed: e.getAttribute('aria-checked') }))`);
        if (await page.ask(`Boolean(document.querySelector(${j(VIEW_POPUP)}))`)) await clickAt(viewAt);
        if (await page.ask(`Boolean(document.querySelector(${j(VIEW_POPUP)}))`)) await page.pressKey('Escape');
      }
      const drawnPaths = new Set(live.topMenu.menus.flatMap((m) => m.leaves.map((l) => l.path)));
      const toolbar = [];
      for (const [name, home, where] of STUDIO_TOOLBAR_HOMES) {
        let found = null;
        let at = home;
        let selector = null;
        if (where.hook) { selector = `[data-studio="${where.hook}"]`; found = await describe(selector); }
        if (!found && where.toggle) {
          selector = `[data-studio="${where.toggle}"]`;
          found = await describe(selector);
          if (found) at = 'scene toggles';
        }
        if (!found && where.view) {
          const row = viewRows.find((r) => r.item === where.view);
          if (row) { found = row; at = 'View'; selector = `${VIEW_ROWS}[data-item="${where.view}"]`; }
        }
        if (!found && where.menu && drawnPaths.has(where.menu)) { found = { text: where.menu }; at = 'top menu'; selector = where.menu; }
        toolbar.push({
          name, home: at, selector, found: Boolean(found), ...(found || {}),
        });
      }
      const header = [];
      for (const [name, home, selector] of STUDIO_HEADER_HOMES) {
        const found = selector
          ? await describe(selector)
          : await page.ask(`(() => { const b = [...document.querySelectorAll('[data-studio="statusbar"] span')].find((s) => /^mock data mode$/i.test((s.textContent || '').trim()) && s.getClientRects().length);
            return b ? { text: b.textContent.trim(), title: (b.getAttribute('title') || '').slice(0, 80) } : null; })()`);
        header.push({
          name, home, selector: selector || '[data-studio="statusbar"] MockModeBadge', found: Boolean(found), ...(found || {}),
        });
      }
      const badges = await page.ask(`[...document.querySelectorAll('span')].filter((s) => /^mock data mode$/i.test((s.textContent || '').trim()) && s.getClientRects().length)
        .map((s) => { const home = s.closest('header, footer, aside, [data-studio-status], [data-studio-shell]'); return home ? (home.tagName.toLowerCase() + (home.getAttribute('data-studio-status') != null ? '[data-studio-status]' : '')) : 'other'; })`);
      live.toolbar = {
        found: true, atStudioHomes: true, count: toolbar.filter((c) => c.found).length, controls: toolbar, viewRows: viewRows.length, viewItems: viewRows.map((r) => r.item),
      };
      live.header = {
        found: true, atStudioHomes: true, count: header.filter((c) => c.found).length, controls: header, badges, badgeInHeader: false,
      };
      for (const c of [...toolbar, ...header]) say(`  ${c.found ? 'home ' : 'NONE '} ${c.name.padEnd(24)} ${c.home.padEnd(14)} ${c.selector || ''}`);
    } else {
      live.header = await page.ask(`(() => { const nav = document.querySelector('${NAV}'); const h = nav && nav.closest('header');
        const badges = [...document.querySelectorAll('span')].filter((s) => /^mock data mode$/i.test((s.textContent || '').trim()) && s.offsetParent !== null)
          .map((s) => { const home = s.closest('header, footer, aside, [data-studio-status], [data-studio-shell]'); return home ? (home.tagName.toLowerCase() + (home.getAttribute('data-studio-status') != null ? '[data-studio-status]' : '')) : 'other'; });
        if (!h) return { found: false, badges };
        const ctrls = [...h.querySelectorAll('button, input, select, textarea')].filter((e) => !nav.contains(e) && e.offsetParent !== null)
          .map((e) => ({ tag: e.tagName.toLowerCase(), type: e.getAttribute('type') || null, text: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40), title: (e.getAttribute('title') || '').slice(0, 80) }));
        const badge = [...h.querySelectorAll('span')].some((s) => /^mock data mode$/i.test((s.textContent || '').trim()));
        return { found: true, controls: ctrls, badgeInHeader: badge, badges, count: ctrls.length + (badge ? 1 : 0) }; })()`);
      live.toolbar = await page.ask(`(() => { const u = [...document.querySelectorAll('[data-undo="1"]')].find((b) => b.parentElement && b.parentElement.querySelector('[data-open-all-doors="1"]'));
        const bar = u && u.parentElement; if (!bar) return { found: false, count: 0, controls: [] };
        const controls = [...bar.querySelectorAll('button')].map((b) => ({ text: (b.textContent || '').replace(/\\s+/g, ' ').trim(), title: (b.getAttribute('title') || '').slice(0, 80), disabled: b.disabled, pressed: b.getAttribute('aria-pressed') }));
        return { found: true, count: controls.length, controls }; })()`);
    }

    // --- (live 4) THE THIRTEEN PANELS ---
    const panelCount = (id) => page.ask(`(() => {
      const fields = [...document.querySelectorAll('[data-unit-name=' + JSON.stringify(${j(id)}) + ']')];
      const aside = fields.map((f) => f.closest('aside')).find((a) => a && a.querySelector('section[data-section]')) || (fields[0] && fields[0].closest('aside'));
      if (!aside) return null;
      const host = (e) => Boolean(e.closest('[data-studio-host]')) && aside.contains(e.closest('[data-studio-host]'));
      const shown = (e) => e.offsetParent !== null;
      const all = [...aside.querySelectorAll('button, input, select, textarea')].filter(shown);
      const own = all.filter((e) => !host(e));
      const tags = {};
      for (const e of own) { const k = e.tagName === 'INPUT' ? 'input:' + (e.getAttribute('type') || 'text') : e.tagName.toLowerCase(); tags[k] = (tags[k] || 0) + 1; }
      const sections = [...aside.querySelectorAll('section[data-section]')].map((s) => ({
        title: s.getAttribute('data-section'), open: s.getAttribute('data-open'),
        controls: [...s.querySelectorAll('button, input, select, textarea')].filter((e) => shown(e) && !host(e)).length,
        nested: Boolean(s.parentElement && s.parentElement.closest('section[data-section]')),
      }));
      const inSections = new Set(); for (const s of aside.querySelectorAll('section[data-section]')) for (const e of s.querySelectorAll('button, input, select, textarea')) inSections.add(e);
      const outside = own.filter((e) => !inSections.has(e)).map((e) => ({ tag: e.tagName.toLowerCase(), text: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30), title: (e.getAttribute('title') || '').slice(0, 60), name: e.getAttribute('data-unit-name') ? 'name' : null }));
      const asides = [...document.querySelectorAll('aside')].map((a) => ({ cls: (a.className || '').toString().slice(0, 60), labels: [...a.querySelectorAll('.cc-label')].filter(shown).length, ctrls: [...a.querySelectorAll('button, input, select, textarea')].filter(shown).length }));
      return {
        visible: own.length, tags, labels: [...aside.querySelectorAll('.cc-label')].filter(shown).length,
        labelTags: [...aside.querySelectorAll('label')].filter(shown).length,
        hostControls: all.length - own.length, sections, outside, asideClass: (aside.className || '').toString(), asides,
        width: Math.round(aside.getBoundingClientRect().width),
      }; })()`);
    const panels = {};
    for (const type of TYPES) {
      const placed = await page.ask(`(() => {
        const ui = ${UI}; ui.clearSelection(); ui.closeModal(); ui.closeLibrary && ui.closeLibrary(); ui.setBomOpen(false); ui.setCheckOpen && ui.setCheckOpen(false);
        ${P}.newProject('T84 census');
        const res = ${P}.addUnit(${j(type)}, { wall: 0, x: 1200 }) || {};
        if (!res.id) return { error: res.error || 'addUnit gave no id' };
        const u = ${P}.units.find((x) => x.id === res.id);
        return { id: res.id, wall: u.position.wall, x: u.position.x_mm, num: u.params.unit_num };
      })()`);
      if (!placed.id) { panels[type] = { error: placed.error }; say(`${type.padEnd(16)} NOT PLACED: ${placed.error}`); continue; }
      await page.ask(`(() => { const ui = ${UI}; ui.selectUnit(${j(placed.id)}); ui.openRightPanel(); ui.setViewMode('3d');
        ${MODE === 'studio' ? `if (typeof ui.showFullSettings === 'function') ui.showFullSettings();` : ''}
        for (const id of ${j(SECTION_IDS)}) window.__cc.ui.getState().setPanelSection(id, true);
        return true; })()`);
      let last = null;
      let now = null;
      let steady = 0;
      for (let t = 0; t < 30 && steady < 2; t += 1) {
        await page.sleep(400);
        now = await panelCount(placed.id);
        const key = now ? `${now.visible}|${now.sections.map((s) => s.controls).join(',')}` : null;
        steady = key && key === last ? steady + 1 : 0;
        last = key;
      }
      const sel = await page.ask(`${UI}.selectedUnitId === ${j(placed.id)}`);
      panels[type] = now ? { unitId: placed.id, num: placed.num, position: { wall: placed.wall, x: placed.x }, sel, ...now } : { unitId: placed.id, sel, error: 'no panel aside holds [data-unit-name]' };
      const line = now
        ? `${type.padEnd(16)} sel=${sel} visible=${now.visible} ${j(now.tags)} labels=${now.labels} sections=${now.sections.map((s) => `${s.title}:${s.open}:${s.controls}`).join('|')}`
        : `${type.padEnd(16)} sel=${sel} NO PANEL`;
      panels[type].line = line;
      say(line);
    }
    live.panels = panels;
    live.panelTotal = TYPES.reduce((s, t) => s + (panels[t] && Number.isFinite(panels[t].visible) ? panels[t].visible : 0), 0);
    live.errors = page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e)).slice(0, 20);
  } finally {
    await page.close();
    await showroomDown();
    stopPreview();
  }
  return live;
}

// === THE OWNER'S PROBE OF 22:23, LINE FOR LINE ==============================
function againstOwnerFile(live) {
  if (!live || !live.panels || !existsSync(OWNER_PANELS)) return null;
  const lines = readFileSync(OWNER_PANELS, 'utf8').split('\n').filter((l) => /^[A-Z_0-9]+\s+sel=/.test(l));
  const rows = [];
  for (const l of lines) {
    const type = l.split(/\s+/)[0];
    const mine = live.panels[type];
    if (!mine || !mine.line) { rows.push({ type, owner: l.trim(), now: null, same: false }); continue; }
    rows.push({ type, owner: l.trim(), now: mine.line.trim(), same: squash(l) === squash(mine.line) });
  }
  const asides = readFileSync(OWNER_PANELS, 'utf8').split('\n').find((l) => /^\s+asides:/.test(l)) || null;
  const firstType = TYPES[0];
  const mineAsides = live.panels[firstType] && live.panels[firstType].asides ? `asides: ${j(live.panels[firstType].asides)}` : null;
  return {
    file: rel(OWNER_PANELS),
    rows,
    reproduced: rows.length > 0 && rows.every((r) => r.same),
    asides: asides ? { owner: asides.trim(), now: mineAsides, same: Boolean(mineAsides) && squash(asides) === squash(mineAsides) } : null,
  };
}

// === THE ROWS, AND THE COMPARISON ===========================================
function rowsOf(c) {
  const rows = [];
  const add = (key, value, gate) => { if (value != null) rows.push({ key, value, gate }); };
  const s = c.static || {};
  if (s.topMenu) {
    add('static.topMenu.leaves', s.topMenu.total, 'atLeast');
    for (const [m, n] of Object.entries(s.topMenu.perMenu || {})) add(`static.topMenu.${m}`, n, 'atLeast');
  }
  if (s.toolbar) add('static.toolbar.controls', s.toolbar.count, 'atLeast');
  if (s.header) add('static.header.controls', s.header.count, 'atLeast');
  if (s.context) {
    add('static.context.censusRows', s.context.rowsPresent, 'atLeast');
    add('static.context.ids', s.context.idCount, 'atLeast');
    add('static.context.sha256', s.context.sha256, 'hash');
    add('static.contextMenu.sha256', s.context.component && s.context.component.sha256, 'hash');
  }
  if (s.modalKinds) add('static.modalKinds', s.modalKinds.count, 'atLeast');
  if (s.library) {
    for (const cat of s.library.categories || []) add(`static.library.${cat.id}`, cat.count, 'atLeast');
    add('static.library.typeSlots', s.library.typeSlots, 'atLeast');
    add('static.library.distinctTypes', s.library.distinctTypes, 'atLeast');
    add('static.library.registryLeaves', (s.library.registryLeafCount.kitchen || 0) + (s.library.registryLeafCount.wardrobe || 0), 'atLeast');
    add('static.library.shippedSets', (s.library.shippedSets || []).length, 'atLeast');
  }
  if (s.panelSources) {
    for (const [f, v] of Object.entries(s.panelSources.files || {})) add(`static.panelSources.${f}`, v.total, 'atLeast');
    add('static.panelSources.total', s.panelSources.total, 'atLeast');
  }
  const l = c.live;
  if (l) {
    if (l.topMenu) {
      add('live.topMenu.leaves', l.topMenu.total, 'atLeast');
      for (const [m, n] of Object.entries(l.topMenu.perMenu || {})) add(`live.topMenu.${m}`, n, 'atLeast');
    }
    // T84 F7 (S6): under --studio counted at their Studio homes, and gated as
    // every other count; a --studio file written before the homes were counted
    // is printed only, as it was.
    const studio = c.mode === 'studio';
    const homes = (x) => Boolean(x && x.atStudioHomes);
    if (l.toolbar) add('live.toolbar.controls', l.toolbar.count, studio && !homes(l.toolbar) ? 'info' : 'atLeast');
    if (l.header) add('live.header.controls', l.header.count == null ? 0 : l.header.count, studio && !homes(l.header) ? 'info' : 'atLeast');
    for (const [type, p] of Object.entries(l.panels || {})) {
      add(`live.panel.${type}`, Number.isFinite(p.visible) ? p.visible : -1, 'exact');
      for (const sec of p.sections || []) add(`live.panel.${type}.${sec.title}`, sec.controls, 'exact');
      add(`live.panel.${type}.hostControls`, p.hostControls, 'info');
    }
    if (l.panels && Object.keys(l.panels).length === PANEL_TYPES.length) add('live.panel.total', l.panelTotal, 'exact');
  }
  return rows;
}
// ─── T-CC1a F3 · TWO HEADER CONTROLS AND ONE WINDOW DELETED, BY NAME ──────────
// The owner, 30.10.2026: *"oczywiscie do CC laczysz sie tylko przez JC"*. Mock
// mode and CC's own login are a kasacja (physical deletion, never a gate): the
// MOCK DATA MODE badge, the Account button (onAuth) and the 'auth' window it
// opened leave main's census here, by name, so ZERO KASOWANIA still holds for
// every other control and a deletion is never mistaken for a lost function.
const KASACJA_T_CC1A = { header: ['MOCK DATA MODE', 'Account'], modalKinds: ['auth'] };
function withoutKasacja(was) {
  const s = was && was.static;
  if (!s) return was;
  const out = { ...was, static: { ...s } };
  if (s.header) {
    const controls = (s.header.controls || []).filter((c) => !KASACJA_T_CC1A.header.includes(c.name));
    out.static.header = { ...s.header, controls, count: s.header.count - ((s.header.controls || []).length - controls.length) };
  }
  if (s.modalKinds) {
    const kinds = (s.modalKinds.kinds || []).filter((k) => !KASACJA_T_CC1A.modalKinds.includes(k.kind));
    out.static.modalKinds = { ...s.modalKinds, kinds, count: s.modalKinds.count - ((s.modalKinds.kinds || []).length - kinds.length) };
  }
  return out;
}
function compare(now, wasWhole) {
  const was = withoutKasacja(wasWhole);
  const before = new Map(rowsOf(was).map((r) => [r.key, r]));
  const out = [];
  for (const r of rowsOf(now)) {
    const b = before.get(r.key);
    if (!b) { out.push({ ...r, was: null, status: 'NEW' }); continue; }
    let status = 'EQUAL';
    if (r.gate === 'hash') status = r.value === b.value ? 'EQUAL' : 'RED (changed)';
    else if (r.value === b.value) status = 'EQUAL';
    else if (r.gate === 'info') status = 'MOVED (not gated)';
    else if (r.gate === 'exact') status = 'RED (not equal)';
    else status = r.value > b.value ? 'LARGER' : 'RED (smaller)';
    out.push({ ...r, was: b.value, status });
    before.delete(r.key);
  }
  for (const b of before.values()) {
    const studioOnly = now.mode === 'studio' && /^live\.(toolbar|header)\./.test(b.key);
    const partial = now.partial && /^live\.panel\./.test(b.key);
    const skipped = (now.staticOnly && /^live\./.test(b.key)) || partial;
    out.push({
      ...b, was: b.value, value: null, status: skipped ? 'NOT RUN' : (studioOnly || b.gate === 'info' ? 'GONE (not gated)' : 'RED (row gone)'),
    });
  }
  return [...out, ...identityRows(now, was)];
}
/**
 * ZERO KASOWANIA by NAME, not only by count (CLAUDE.md LAWS 1: "Every control
 * of THE CENSUS stays, by label and by the SAME handler"): what main had that
 * this run has not, item by item. A missing item or a leaf whose call moved is
 * RED; a guard written differently is printed and not gated (the same guard
 * can be spelt two ways once the menus array moves house).
 */
function identityRows(now, was) {
  const rows = [];
  const add = (key, items, gate = 'zero', word = 'missing') => rows.push({
    key, value: items.length, was: 0, gate, detail: items.slice(0, 12), status: items.length ? (gate === 'zero' ? `RED (${word})` : 'MOVED (not gated)') : 'EQUAL',
  });
  const S = now.static || {};
  const W = was.static || {};
  if (S.topMenu && W.topMenu) {
    const here = new Map((S.topMenu.leaves || []).map((l) => [l.path, l]));
    add('static.topMenu.pathsMissing', (W.topMenu.leaves || []).filter((l) => !here.has(l.path)).map((l) => l.path));
    add('static.topMenu.callsMoved', (W.topMenu.leaves || []).filter((l) => here.has(l.path))
      .filter((l) => here.get(l.path).call !== l.call || here.get(l.path).bound !== l.bound)
      .map((l) => `${l.path}: ${l.call}${l.bound ? ` -> ${l.bound}` : ''} became ${here.get(l.path).call}${here.get(l.path).bound ? ` -> ${here.get(l.path).bound}` : ''}`), 'zero', 'moved');
    add('static.topMenu.guardsRewritten', (W.topMenu.leaves || []).filter((l) => here.has(l.path))
      .filter((l) => (here.get(l.path).disabledWhen || null) !== (l.disabledWhen || null))
      .map((l) => `${l.path}: ${l.disabledWhen} became ${here.get(l.path).disabledWhen}`), 'info');
  }
  if (now.live && now.live.topMenu && was.live && was.live.topMenu) {
    const drawn = new Set(now.live.topMenu.menus.flatMap((m) => m.leaves.map((l) => l.path)));
    add('live.topMenu.pathsMissing', was.live.topMenu.menus.flatMap((m) => m.leaves.map((l) => l.path)).filter((p) => !drawn.has(p)));
  }
  // T84 F7 (S6): under --studio every toolbar and header control of main has a
  // Studio home; one that has none is RED by name.
  for (const part of ['toolbar', 'header']) {
    const x = now.live && now.live[part];
    if (now.mode === 'studio' && x && x.atStudioHomes) {
      add(`live.${part}.homesMissing`, (x.controls || []).filter((c) => !c.found).map((c) => `${c.name}: not at its home (${c.home}, ${c.selector || 'no hook'})`));
    }
  }
  if (S.toolbar && W.toolbar) {
    const here = new Set((S.toolbar.controls || []).map((c) => c.handler));
    add('static.toolbar.handlersMissing', (W.toolbar.controls || []).filter((c) => !here.has(c.handler)).map((c) => `${c.name}: ${c.handler}`));
  }
  if (S.header && W.header) {
    const here = new Set((S.header.controls || []).map((c) => c.handler));
    add('static.header.handlersMissing', (W.header.controls || []).filter((c) => !here.has(c.handler)).map((c) => `${c.name}: ${c.handler}`));
  }
  if (S.context && W.context) {
    const here = new Set((S.context.ids || []).map((r) => r.id));
    add('static.context.idsMissing', (W.context.ids || []).filter((r) => !here.has(r.id)).map((r) => r.id));
  }
  if (S.modalKinds && W.modalKinds) {
    const here = new Set((S.modalKinds.kinds || []).map((k) => k.kind));
    add('static.modalKinds.missing', (W.modalKinds.kinds || []).filter((k) => !here.has(k.kind)).map((k) => k.kind));
  }
  if (S.library && W.library) {
    const missing = [];
    for (const c of W.library.categories || []) {
      const mine = (S.library.categories || []).find((x) => x.id === c.id);
      if (!mine) { missing.push(`category ${c.id}`); continue; }
      for (const t of c.types) if (!mine.types.includes(t)) missing.push(`${c.id}/${t}`);
    }
    add('static.library.typesMissing', missing);
  }
  return rows;
}
function against2223(c) {
  const rows = [];
  const add = (row, claude, now) => rows.push({ row, claude, now, equal: claude === now });
  const s = c.static || {};
  if (s.topMenu) {
    add('top menu leaves (static)', CENSUS_2223.topMenu.total, s.topMenu.total);
    for (const m of Object.keys(CENSUS_2223.topMenu).filter((k) => k !== 'total')) add(`  ${m}`, CENSUS_2223.topMenu[m], s.topMenu.perMenu[m] ?? null);
  }
  if (c.live && c.live.topMenu) add('top menu leaves (drawn)', CENSUS_2223.topMenu.total, c.live.topMenu.total);
  if (s.toolbar) add('scene toolbar (source)', CENSUS_2223.toolbar, s.toolbar.count);
  if (c.live && c.live.toolbar) add('scene toolbar (drawn)', CENSUS_2223.toolbar, c.live.toolbar.count);
  if (s.header) add('header (source)', CENSUS_2223.header, s.header.count);
  if (c.live && c.live.header) add('header (drawn)', CENSUS_2223.header, c.live.header.count ?? null);
  if (s.context) add('right-click rows', CENSUS_2223.context, s.context.rowsPresent);
  if (s.library) {
    const cat = (id) => (s.library.categories.find((x) => x.id === id) || {}).count ?? null;
    add('library Kitchen', CENSUS_2223.library.kitchen, cat('kitchen'));
    add('library Wardrobes', CENSUS_2223.library.wardrobe, cat('wardrobe'));
    add('library types (slots)', CENSUS_2223.library.total, s.library.typeSlots);
  }
  if (s.modalKinds) add('modal kinds', CENSUS_2223.modalKinds, s.modalKinds.count);
  if (s.panelSources) {
    for (const f of ['RightPanel.jsx', 'ElementProperties.jsx', 'MultiUnitPanel.jsx']) add(`panel source tags ${f}`, CENSUS_2223.panelSources[f], s.panelSources.files[f] ? s.panelSources.files[f].total : null);
    add('panel source tags total', CENSUS_2223.panelSources.total, s.panelSources.total);
  }
  if (c.live && c.live.panels) {
    for (const t of TYPES) add(`panel ${t}`, CENSUS_2223.panels[t], c.live.panels[t] && Number.isFinite(c.live.panels[t].visible) ? c.live.panels[t].visible : null);
    if (!PARTIAL) add('panel total', CENSUS_2223.panels.total, c.live.panelTotal);
  }
  return rows;
}

// === THE RUN ================================================================
const census = {
  what: 'T84 P1 (a), THE CENSUS (CLAUDE.md T84 PART P); scripts/t84-census.mjs',
  mode: MODE,
  partial: PARTIAL,
  staticOnly: STATIC_ONLY,
  commit: head,
  commitShort: headShort,
  branch,
  takenAt: new Date().toISOString(),
  node: process.version,
  viewport: SIZE,
  types: TYPES,
  static: {},
};
say(`T84 CENSUS, mode ${MODE}, ${branch} ${headShort}${STATIC_ONLY ? ', static only' : ''}${PARTIAL && !STATIC_ONLY ? `, types ${TYPES.join(',')}` : ''}`);
census.static.topMenu = await staticTopMenu();
census.static.toolbar = staticToolbar();
census.static.header = staticHeader();
census.static.context = await staticContext();
census.static.modalKinds = staticModalKinds();
census.static.library = await staticLibrary();
census.static.panelSources = staticPanelSources();
say(`static: top menu ${census.static.topMenu.total} (${Object.entries(census.static.topMenu.perMenu || {}).map(([k, v]) => `${k} ${v}`).join(', ')}), toolbar ${census.static.toolbar.count}, header ${census.static.header.count}, right-click rows ${census.static.context.rowsPresent} (ids ${census.static.context.idCount}), modal kinds ${census.static.modalKinds.count}, library ${census.static.library.categories.map((c) => `${c.label} ${c.count}`).join(', ')}, panel source tags ${census.static.panelSources.total}`);
if (!STATIC_ONLY) {
  census.live = await liveHalf();
  census.ownerProbe2223 = againstOwnerFile(census.live);
  say(`live: top menu ${census.live.topMenu.total} drawn, toolbar ${census.live.toolbar.count}, header ${census.live.header.count ?? 'n/a'}${census.live.toolbar.atStudioHomes ? ' (at their Studio homes)' : ''}, panels ${census.live.panelTotal}`);
  if (census.ownerProbe2223) say(`owner's probe of 22:23 (${census.ownerProbe2223.file}): ${census.ownerProbe2223.reproduced ? 'REPRODUCED line for line' : 'DIFFERS'}`);
}
census.against2223 = against2223(census);
census.tookSeconds = Math.round((Date.now() - T0) / 1000);

let red = 0;
if (MODE === 'main' && (!WRITE || WRITE === MAIN_JSON)) {
  say('');
  say('vs THE CENSUS of 22:23 (CLAUDE.md, main 9a441f13):');
  for (const r of census.against2223) say(`  ${r.row.padEnd(42)} ${String(r.claude).padStart(5)} ${String(r.now).padStart(5)}  ${r.equal ? 'EQUAL' : 'DIFFERS'}`);
}
if (existsSync(MAIN_JSON) && WRITE !== MAIN_JSON) {
  const was = JSON.parse(readFileSync(MAIN_JSON, 'utf8'));
  const rows = compare(census, was);
  census.comparison = { against: rel(MAIN_JSON), againstCommit: was.commit, rows };
  red = rows.filter((r) => /^RED/.test(r.status)).length;
  say('');
  say(`vs ${rel(MAIN_JSON)} (${was.mode} at ${String(was.commit).slice(0, 7)}):`);
  for (const r of rows) {
    if ((r.status === 'EQUAL' || r.status === 'NOT RUN') && !flag('verbose')) continue;
    say(`  ${r.key.padEnd(48)} ${String(r.was).slice(0, 12).padStart(12)} ${String(r.value).slice(0, 12).padStart(12)}  ${r.status}`);
    for (const d of r.detail || []) say(`      ${d}`);
  }
  const notRun = rows.filter((r) => r.status === 'NOT RUN').length;
  say(`  ${rows.filter((r) => r.status === 'EQUAL').length} rows EQUAL, ${rows.filter((r) => r.status === 'LARGER').length} LARGER, ${red} RED${notRun ? `, ${notRun} NOT RUN` : ''}${flag('verbose') ? '' : ' (EQUAL and NOT RUN rows hidden; --verbose shows them)'}`);
}
if (WRITE) {
  mkdirSync(dirname(WRITE), { recursive: true });
  writeFileSync(WRITE, asciiJson(census));
  say(`wrote ${rel(WRITE)}`);
} else {
  say('a partial run writes nothing (give --write <path> to keep it)');
}
say(`${red ? 'RED' : 'GREEN'} in ${census.tookSeconds} s`);
process.exit(red ? 1 : 0);
