/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F4, THE INSPECTOR HOST (CLAUDE.md T84 PART B)
//
// CLAUDE.md T84 F4: "Tests `test/turn84-f04-inspector.test.js`: RightPanel's
// source has the `layout` and `headerActions` props on every branch; the
// embedded layout has no `absolute right-0`; the pin's reducer follows the
// selection and never stores an id; the commit-before-switch in the store."
//
// The source is read, never imported (node cannot load JSX); the store is
// imported and driven by its own actions. Two pieces of InspectorHost.jsx are
// written as self-contained functions (`followSections`, `guardAnswer`) so this
// file can cut them out and run them as written, the way the census evaluates
// TopBar's own `menus` array (scripts/t84-census.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as UI from '../src/stores/uiStore.js';

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');

const HEADER = [
  '/*',
  ' * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.',
  ' *',
  ' * This file is proprietary and confidential. Unauthorised copying,',
  ' * modification, distribution or use of this file, in whole or in part,',
  ' * by any means including automated tools and AI systems, is strictly',
  ' * prohibited without prior written permission from Skylon Development Ltd.',
  ' */',
].join('\n');

/** main's overlay aside, the class string the legacy face draws (RightPanel.jsx 257, 268, 285; MultiUnitPanel.jsx 132). */
const OVERLAY = 'absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 ${LAYER_CLASS.panel} flex flex-col';
/** A class that makes an element a stacking context or a containing block for fixed children (verify/t84/p1-host.md B 13). */
const TRAPS = /(?:^|\s)(?:-?z-|transform|translate-|rotate-|scale-|skew-|filter|blur|backdrop-|will-change|contain-|isolate|opacity-|perspective|mix-blend|sticky\b|fixed\b)/;

/** The function `name` as written in `src`: its text from `function name(` to its closing brace. */
function cut(src, name) {
  const at = src.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `function ${name} is in the source`);
  const open = src.indexOf('{', src.indexOf(')', at));
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(at, i + 1);
    }
  }
  throw new Error(`function ${name} never closes`);
}
// eslint-disable-next-line no-new-func
const run = (src, name) => new Function(`return (${cut(src, name)});`)();

/** The text of RightPanel's `if (<head>) { ... }` branch, braces matched. */
function branch(src, head) {
  const at = src.indexOf(head);
  assert.ok(at >= 0, `${head} is in RightPanel.jsx`);
  const open = src.indexOf('{', at + head.length - 1);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(at, i + 1);
    }
  }
  throw new Error(`${head} never closes`);
}

const panel = () => read('src/components/RightPanel.jsx');
const multi = () => read('src/components/MultiUnitPanel.jsx');
const host = () => read('src/components/studio/InspectorHost.jsx');

// ─── 1. RIGHTPANEL: THE HOST ADAPTATION (verify/t84/p1-host.md C) ──────────

test('F4 · RightPanel takes the two props, overlay by default, and its overlay aside is main\'s class string to the byte', () => {
  const src = panel();
  assert.match(src, /export default function RightPanel\(\{ layout = 'overlay', headerActions = null \} = \{\}\) \{/);
  assert.ok(src.includes(`overlay: \`${OVERLAY}\`,`), 'the overlay aside is the class string the legacy face has always drawn');
  const embedded = src.match(/embedded: '([^']+)',/);
  assert.ok(embedded, 'the embedded aside is one literal');
  assert.equal(embedded[1], 'relative h-full w-full min-w-0 cc-panel rounded-none border-0 flex flex-col');
  assert.doesNotMatch(embedded[1], /absolute|right-0|top-0|bottom-0|w-\[/, 'embedded: no position offsets, no width of its own');
  assert.doesNotMatch(embedded[1], TRAPS, 'embedded: no stacking context, no containing block for the windows inside');
  assert.match(src, /const embedded = layout === 'embedded';\n\s+const asideClass = embedded \? PANEL_ASIDE\.embedded : PANEL_ASIDE\.overlay;/);
  // No aside of the panel is left laying itself over the canvas by hand.
  assert.equal((src.match(/<aside className=\{`absolute right-0/g) || []).length, 0);
  assert.equal((src.match(/<aside className=\{asideClass\} data-panel-layout=\{asideLayout\}>/g) || []).length, 3);
});

test('F4 · every branch honours layout and headerActions: CNC, nothing selected, several cabinets, one cabinet', () => {
  const src = panel();
  const cnc = branch(src, "if (viewMode === 'cnc') {");
  assert.match(cnc, /<aside className=\{asideClass\} data-panel-layout=\{asideLayout\}>/);
  assert.match(cnc, /<PanelHeader title="CNC sheet" onClose=\{closeRightPanel\} actions=\{headerActions\} layout=\{layout\} \/>/);
  assert.match(cnc, /<CncTree \/>/, 'the CNC tree, as before');
  const none = branch(src, 'if (!unit) {');
  assert.match(none, /<aside className=\{asideClass\} data-panel-layout=\{asideLayout\}>/);
  assert.match(none, /<PanelHeader title="Parameters" onClose=\{closeRightPanel\} actions=\{headerActions\} layout=\{layout\} \/>/);
  const several = branch(src, 'if (selectedUnitIds.length > 1) {');
  assert.match(several, /return <MultiUnitPanel ids=\{selectedUnitIds\} onClose=\{closeRightPanel\} layout=\{layout\} headerActions=\{headerActions\} \/>;/);
  assert.match(src, /<aside className=\{asideClass\} data-panel-layout=\{asideLayout\}>\n\s+<PanelHeader title=\{type\.label\} onClose=\{closeRightPanel\} actions=\{headerActions\} layout=\{layout\}>/);
  assert.match(src, /<UnitNameField unit=\{unit\} units=\{units\} \/>\n\s+<\/PanelHeader>/, 'the name field stays the header\'s own child');
});

test('F4 · ONE header: the host\'s actions stand INSIDE PanelHeader, before the x; embedded, the title gives way, the x stays', () => {
  const src = panel();
  const head = cut(src, 'PanelHeader');
  assert.match(head, /function PanelHeader\(\{\n\s+title, onClose, children = null, actions = null, layout = 'overlay',\n\}\) \{/);
  // The overlay header is main's, element for element.
  assert.match(head, /: <span className="text-xs uppercase tracking-wide text-ink-200 shrink-0">\{title\}<\/span>\}/);
  // Embedded: the title truncates with its whole label in its title; the name field and the actions keep their width.
  assert.match(head, /\? <span className="text-xs uppercase tracking-wide text-ink-200 min-w-0 truncate" title=\{title\}>\{title\}<\/span>/);
  assert.match(head, /\{embedded && children \? <span className="flex items-center shrink-0">\{children\}<\/span> : children\}/);
  assert.match(head, /<span className="flex-1" \/>\n\s+\{actions\}\n\s+<button type="button" className="cc-btn-ghost" onClick=\{onClose\} title="Close panel">×<\/button>/,
    'the actions, then the x: one of the 649, kept (verify/t84/p1-census.md)');
  assert.equal((head.match(/<div /g) || []).length, 1, 'one header row, no second bar');
});

test('F4 · the duplicate inline ElementSection is suppressed in the embedded layout ONLY; the three windows are the host\'s there', () => {
  const src = panel();
  assert.match(src, /\{element && !embedded && \(\n\s+<ElementSection unit=\{unit\} element=\{element\} onClose=\{clearElement\} \/>/);
  assert.match(src, /function ElementSection\(\{ unit, element, onClose \}\)/, 'the part editor is untouched');
  for (const name of ['NotchModal', 'EdgeNotchModal', 'MirrorBackModal']) {
    assert.match(src, new RegExp(`export function ${name}\\(\\) \\{`), `${name} is exported for the host`);
    assert.match(src, new RegExp(`\\{!embedded && <${name} \\/>\\}`), `${name}: the overlay draws it, the embedded layout leaves it to the host`);
    assert.equal((src.match(new RegExp(`<${name} />`, 'g')) || []).length, 1, `${name} is drawn in one place of RightPanel`);
  }
});

test('F4 · the host adaptation adds no control to the panel sources (the census\' 173 control tags, rule 7)', () => {
  const tags = (text) => (text.match(/<(?:NumberField|select|button|input|textarea)\b/g) || []).length;
  // CHAT FIX 28.10.2026, 23:26 AMENDED (KIT_RECESS.lsp D27): ONE control, not the host's, added to the Section's
  // drawer row: Remove (data-remove-dropped-drawers) beside a full-width stack the carcass cannot hold, the only way
  // to take away drawers that are not cut and have no board to click. The owner, on a wardrobe 1200 x 2150 x 300
  // before a recess: *"nie da sie tego zrobic why ?"*. The host adaptation still adds none: 108 + 1.
  assert.equal(tags(panel()), 109, 'RightPanel.jsx');
  assert.equal(tags(multi()), 16, 'MultiUnitPanel.jsx');
});

test('F4 · MultiUnitPanel takes the same two props on its own aside and header', () => {
  const src = multi();
  assert.match(src, /export default function MultiUnitPanel\(\{\n\s+ids, onClose, layout = 'overlay', headerActions = null,\n\}\) \{/);
  assert.match(src, /const embedded = layout === 'embedded';/);
  assert.ok(src.includes(`: \`${OVERLAY}\`}`), 'the overlay aside is main\'s');
  const embedded = src.match(/\? '([^']+)'\n/);
  assert.ok(embedded, 'the embedded aside is one literal');
  assert.equal(embedded[1], 'relative h-full w-full min-w-0 cc-panel rounded-none border-0 flex flex-col');
  assert.doesNotMatch(embedded[1], TRAPS);
  assert.match(src, /data-panel-layout=\{embedded \? 'embedded' : 'overlay'\}/);
  assert.match(src, /<\/h2>\n\s+\{headerActions\}\n\s+<button type="button" className="cc-btn-ghost" title="Close" onClick=\{onClose\}>×<\/button>/);
});

// ─── 2. THE HOST ────────────────────────────────────────────────────────────

test('F4 · InspectorHost: a new file with the owner\'s header, no dash, no number of THE NUMBERS typed', () => {
  const src = host();
  assert.ok(src.startsWith(`${HEADER}\n// T84 F4, THE INSPECTOR HOST (CLAUDE.md T84 PART B)\n`));
  assert.doesNotMatch(src, /[\u2013\u2014\u2018\u2019\u201c\u201d]/, 'no em or en dash, no curly quote');
  assert.match(src, /import \{ studioWidths \} from '\.\/lib\/studioSkin\.js';/);
  assert.match(src, /const width = mode === 'full' \? widths\.fullPx : widths\.quickPx;/, 'the widths are the profile\'s, through studioSkin');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const n of [344, 316, 400, 360, 1440, 1500, 13, 30, 32]) {
    assert.doesNotMatch(code, new RegExp(`\\b${n}\\b`), `${n} is the profile's, never typed here`);
  }
});

test('F4 · the column: its hooks, its widths, the card in quick, the panel embedded in full, nothing in none', () => {
  const src = host();
  assert.match(src, /import RightPanel, \{ EdgeNotchModal, MirrorBackModal, NotchModal \} from '\.\.\/RightPanel\.jsx';/);
  assert.match(src, /import QuickSelectionCard from '\.\/QuickSelectionCard\.jsx';/);
  assert.match(src, /className="studio-inspector [^"]*"\n\s+data-studio="inspector"\n\s+data-mode=\{mode\}/);
  assert.doesNotMatch(src.match(/className="studio-inspector [^"]*"/)[0], /studio-skin/,
    'the embedded RightPanel is not inside a .studio-skin (verify/t84/DECISIONS.md 8)');
  assert.match(src, /const column = mode === 'none' \? null : \(/, '\'none\': no column');
  assert.match(src, /<QuickSelectionCard\n\s+key=\{unitId\}\n\s+unitId=\{unitId\}\n\s+strip=\{renderStrip \? renderStrip\(unitId\) : null\}\n\s+Field=\{Field\}\n\s+\/>/);
  assert.match(src, /const card = shows === 'one' && mode === 'quick';/);
  assert.match(src, /const fullOne = shows === 'one' && mode === 'full';/);
  assert.match(src, /const panel = shows === 'cnc' \|\| shows === 'several' \|\| fullOne \|\| \(shows === 'nothing' && pinned\);/,
    'CNC, several cabinets, one cabinet in full, and nothing selected while pinned: RightPanel embedded');
  assert.match(src, /if \(viewMode === 'cnc'\) shows = 'cnc';\n\s+else if \(unitType && several\) shows = 'several';\n\s+else if \(unitType\) shows = 'one';/);
  // In full, the strip of F5, then the panel: no bar over it but the issue strip.
  const full = src.slice(src.indexOf('{fullOne && renderStrip ?'), src.indexOf('<RightPanel\n'));
  assert.match(full, /renderStrip\(unitId\)/);
  assert.match(src, /<RightPanel\n\s+layout="embedded"\n\s+headerActions=\{<HostActions pinned=\{pinned\} back=\{mode !== 'quick' \|\| pinned\} \/>\}\n\s+\/>/);
  assert.equal((src.match(/<RightPanel\b/g) || []).length, 1, 'one RightPanel, at one place in the tree');
  assert.match(src, /<h2>Select a cabinet or part<\/h2>/);
  assert.doesNotMatch(src, /<header\b|studio-full-head|<aside\b/, 'one panel, one header: the host draws no header of its own');
  for (const cls of src.match(/className=(?:"[^"]*"|\{`[^`]*`\})/g)) {
    assert.doesNotMatch(cls.replace(/^className=/, ''), TRAPS, `${cls}: no stacking context, no containing block`);
  }
});

test('F4 · Pin and Back to quick settings: inside RightPanel\'s header, the store\'s own actions, apart from the census', () => {
  const src = host();
  const actions = cut(src, 'HostActions');
  assert.match(actions, /<span className="flex items-center gap-1 shrink-0" data-studio-host="1">/);
  assert.match(actions, /data-studio="pin"\n\s+data-studio-host="1"\n\s+aria-pressed=\{pinned\}/);
  assert.match(actions, /onClick=\{\(\) => toggleInspectorPin\(\)\}/);
  assert.match(actions, /const toggleInspectorPin = useUiStore\(\(s\) => s\.toggleInspectorPin\);/);
  assert.match(actions, /data-studio="back-to-quick"\n\s+data-studio-host="1"/);
  assert.match(actions, /onClick=\{\(\) => showQuickSettings\(\)\}/);
  assert.match(actions, /const showQuickSettings = useUiStore\(\(s\) => s\.showQuickSettings\);/);
  assert.match(src, /const BACK_WORDS = 'Back to quick settings';/);
  assert.match(src, /const PIN_WORDS = 'Keep panel open and follow selection';/, 'the designer\'s own label');
});

test('F4 · the three windows: mounted ONCE by the host, whatever the column shows and with no column', () => {
  const src = host();
  const out = src.slice(src.lastIndexOf('  return (\n    <>'));
  for (const name of ['NotchModal', 'EdgeNotchModal', 'MirrorBackModal']) {
    assert.equal((src.match(new RegExp(`<${name} />`, 'g')) || []).length, 1, `${name}: one copy`);
    assert.match(out, new RegExp(`\\n\\s+<${name} />\\n`), `${name} stands in the host's last return, outside the column`);
  }
  assert.match(out, /^ {2}return \(\n {4}<>\n {6}\{column\}\n/, 'the column first, then the three, unconditionally');
});

test('F4 · Pin never freezes an id: the host reads the selection, keeps types only, and is the store\'s guard while mounted', () => {
  const src = host();
  assert.match(src, /const unitId = useUiStore\(\(s\) => s\.selectedUnitId\);/);
  assert.match(src, /const pinned = useUiStore\(\(s\) => s\.inspectorPinned\);/);
  assert.doesNotMatch(src, /useState\(|useReducer\(|pinned(?:Unit)?Id|locked(?:Unit)?Id|frozen(?:Unit)?Id/, 'no unit id kept by the host');
  assert.match(src, /sections: new Map\(\), scroll: new Map\(\), type: unitType, scrolled: null,/, 'per TYPE');
  assert.match(src, /useUiStore\.getState\(\)\.setSelectionGuard\(guard\);\n\s+return \(\) => useUiStore\.getState\(\)\.clearSelectionGuard\(guard\);/);
  assert.match(src, /return guardAnswer\(rootRef\.current, document\.activeElement, gone\);/);
  assert.match(src, /followSections\(m, state, prev, typeOfUnit, useUiStore\.getState\(\)\.setPanelSection\);/);
  // The scroll is the panel's own scrolling body, read and set; nothing hidden, nothing restyled.
  assert.match(src, /root\.querySelector\('aside\[data-panel-layout="embedded"\] > \.overflow-y-auto'\)/);
  assert.doesNotMatch(src, /\.style\.|\.hidden\s*=|classList|display\s*:\s*'none'/, 'no DOM query that hides children');
});

// ─── 3. THE PER-TYPE SECTIONS, RUN AS WRITTEN ──────────────────────────────

test('F4 · the open sections kept per type: filed under the old type, the new type\'s set restored through setPanelSection', () => {
  const followSections = run(host(), 'followSections');
  const types = { A: 'BUD', B: 'WUD', C: 'BUD', D: 'WUD' };
  const typeOf = (id) => types[id] ?? null;
  const calls = [];
  const setPanelSection = (id, open) => calls.push([id, open]);
  const at = (id, open) => ({ selectedUnitId: id, panelOpen: open });
  const memory = { sections: new Map(), type: 'BUD' };

  // A (BUD, Doors open) to B (WUD, never seen): BUD's set filed, nothing restored.
  assert.equal(followSections(memory, at('B', { carcass: false, doors: true }), at('A', { carcass: false, doors: true }), typeOf, setPanelSection), 'WUD');
  assert.deepEqual(calls, []);
  assert.deepEqual(memory.sections.get('BUD'), { carcass: false, doors: true });
  // On B the joiner opens Carcass and folds Doors; B to C (BUD): WUD filed, BUD's set back.
  followSections(memory, at('C', { carcass: true, doors: false }), at('B', { carcass: true, doors: false }), typeOf, setPanelSection);
  assert.deepEqual(calls, [['carcass', false], ['doors', true]]);
  assert.deepEqual(memory.sections.get('WUD'), { carcass: true, doors: false });
  // C to A, the same type: nothing to restore.
  calls.length = 0;
  followSections(memory, at('A', { carcass: false, doors: true }), at('C', { carcass: false, doors: true }), typeOf, setPanelSection);
  assert.deepEqual(calls, []);
  // To nothing: filed; then D (WUD): WUD's set comes back.
  followSections(memory, at(null, { carcass: false, doors: true }), at('A', { carcass: false, doors: true }), typeOf, setPanelSection);
  assert.equal(memory.type, null);
  followSections(memory, at('D', { carcass: false, doors: true }), at(null, { carcass: false, doors: true }), typeOf, setPanelSection);
  assert.deepEqual(calls, [['carcass', true], ['doors', false]]);
  // The same cabinet: nothing at all.
  calls.length = 0;
  const before = new Map(memory.sections);
  followSections(memory, at('D', { carcass: true }), at('D', { carcass: false }), typeOf, setPanelSection);
  assert.deepEqual(calls, []);
  assert.deepEqual(memory.sections, before);
  // A cabinet deleted under the panel is filed under the type it had.
  delete types.D;
  followSections(memory, at('A', { carcass: true, doors: true }), at('D', { carcass: true, doors: true }), typeOf, setPanelSection);
  assert.deepEqual(memory.sections.get('WUD'), { carcass: true, doors: true });
  // Types only, never an id.
  for (const key of memory.sections.keys()) assert.ok(['BUD', 'WUD'].includes(key), `${key} is a type`);
});

// ─── 4. THE GUARD'S ANSWER, RUN AS WRITTEN ─────────────────────────────────

test('F4 · the guard: the field with the caret blurs FIRST (it commits to its own cabinet), then a refusal holds the selection', () => {
  const guardAnswer = run(host(), 'guardAnswer');
  const REFUSED = '[data-studio="refused"][data-refused="1"]';
  const SENTENCE = 'WIDTH: 920 does not fit, the wall leaves 860 (an engine sentence, as given)';
  const log = [];
  const column = (inside) => ({
    refused: null,
    contains: (el) => inside.includes(el),
    querySelector(sel) { log.push(`query ${sel}`); return sel === REFUSED ? this.refused : null; },
  });
  const element = (tag, onBlur = null) => ({
    tagName: tag,
    blur() { log.push(`blur ${tag}`); if (onBlur) onBlur(); },
    focus() { log.push(`focus ${tag}`); },
  });

  assert.deepEqual(guardAnswer(null, null, false), { ok: true }, 'no column (none): nothing to hold');

  // A valid typed width: the blur commits it, and the selection moves.
  let input = element('INPUT');
  let root = column([input]);
  assert.deepEqual(guardAnswer(root, input, false), { ok: true });
  assert.deepEqual(log, ['blur INPUT', `query ${REFUSED}`]);

  // An invalid one: its blur marks the wrapper refused there and then, so the answer is no, in the engine's words.
  log.length = 0;
  root = column([]);
  input = element('INPUT', () => {
    root.refused = { getAttribute: (n) => (n === 'data-refusal' ? SENTENCE : null) };
  });
  root.contains = (el) => el === input;
  assert.deepEqual(guardAnswer(root, input, false), { ok: false, reason: SENTENCE });
  assert.deepEqual(log, ['blur INPUT', `query ${REFUSED}`], 'the blur first, the refusal read after it');

  // A refusal already standing holds the selection with no field focused; nothing moves the caret.
  log.length = 0;
  assert.deepEqual(guardAnswer(root, null, false), { ok: false, reason: SENTENCE });
  assert.deepEqual(log, [`query ${REFUSED}`]);

  // Only a field INSIDE the column, and only a field, is blurred.
  log.length = 0;
  const outside = element('INPUT');
  const button = element('BUTTON');
  root = column([button]);
  assert.deepEqual(guardAnswer(root, outside, false), { ok: true });
  assert.deepEqual(guardAnswer(root, button, false), { ok: true });
  assert.ok(!log.some((l) => l.startsWith('blur')), 'a field elsewhere, or a button, is left alone');

  // A cabinet deleted under its card: nothing to commit to, nothing held.
  log.length = 0;
  root = column([input]);
  root.refused = { getAttribute: () => SENTENCE, querySelector: () => null };
  assert.deepEqual(guardAnswer(root, input, true), { ok: true });
  assert.deepEqual(log, []);
});

// ─── 5. THE STORE: THE PIN'S REDUCER AND THE COMMIT BEFORE THE SWITCH ──────
// (INT's uiStore additions, verify/t84/agents/CONTRACT.md 4.)

const ui = () => UI.useUiStore.getState();
const fresh = () => UI.useUiStore.setState({
  selectedUnitId: null,
  selectedUnitIds: [],
  selectedSection: null,
  selectedElement: null,
  selectedElements: [],
  centreBetween: null,
  inspector: 'quick',
  inspectorPinned: false,
  selectionGuard: null,
});

/** Every path in the store's data (functions left out) that holds `id`. */
function holding(state, id) {
  const found = [];
  const walk = (value, path, depth) => {
    if (value === id) { found.push(path); return; }
    if (depth > 4 || value == null || typeof value !== 'object') return;
    for (const [k, v] of Object.entries(value)) if (typeof v !== 'function') walk(v, `${path}.${k}`, depth + 1);
  };
  for (const [k, v] of Object.entries(state)) if (typeof v !== 'function') walk(v, k, 0);
  return found.sort();
}

test('F4 · inspectorAfterSelect: pinned stays where it is, unpinned comes back to the quick card, and it answers a MODE', () => {
  const { inspectorAfterSelect } = UI;
  assert.equal(typeof inspectorAfterSelect, 'function', 'exported by src/stores/uiStore.js');
  for (const mode of ['quick', 'full', 'none']) {
    assert.equal(inspectorAfterSelect({ inspector: mode, inspectorPinned: true }, true), mode, `pinned in ${mode}`);
    assert.equal(inspectorAfterSelect({ inspector: mode, inspectorPinned: false }, true), 'quick', `unpinned in ${mode}: the designer's prototype`);
    assert.equal(inspectorAfterSelect({ inspector: mode, inspectorPinned: false }, false), mode, `nothing changed in ${mode}`);
  }
  const answer = inspectorAfterSelect({ inspector: 'full', inspectorPinned: true, selectedUnitId: 'U7' }, true);
  assert.equal(answer, 'full');
  assert.ok(['quick', 'full', 'none'].includes(answer), 'a mode, never an id');
});

test('F4 · the pin follows the selection: another cabinet, several, none, and no store key but the selection holds an id', () => {
  fresh();
  assert.equal(ui().inspector, 'quick');
  assert.equal(ui().inspectorPinned, false);
  ui().toggleInspectorPin();
  assert.equal(ui().inspectorPinned, true);
  assert.equal(ui().inspector, 'full', 'Pin keeps the full panel');
  ui().selectUnit('U1');
  assert.equal(ui().selectedUnitId, 'U1');
  assert.equal(ui().inspector, 'full');
  ui().selectUnit('U2');
  assert.equal(ui().selectedUnitId, 'U2', 'FOLLOWS the selection');
  assert.equal(ui().inspector, 'full');
  assert.deepEqual(holding(ui(), 'U2'), ['selectedUnitId', 'selectedUnitIds.0'], 'the pin froze no id');
  assert.deepEqual(holding(ui(), 'U1'), [], 'the cabinet left behind is held nowhere');
  ui().selectUnit('U3', { additive: true });
  assert.deepEqual(ui().selectedUnitIds, ['U2', 'U3'], 'several: MultiUnitPanel');
  assert.equal(ui().inspector, 'full');
  ui().selectElement('U4', 'SHELF-1');
  assert.equal(ui().selectedUnitId, 'U4', 'a part of another cabinet: the panel goes to its parent');
  assert.equal(ui().inspector, 'full');
  ui().clearSelection();
  assert.equal(ui().selectedUnitId, null);
  assert.equal(ui().inspector, 'full', 'pinned with nothing: the panel stays (its empty branch)');
  assert.equal(ui().inspectorPinned, true, 'nothing in the selection unpins');
  // Unpinned, a new cabinet brings the quick card back.
  ui().toggleInspectorPin();
  assert.equal(ui().inspectorPinned, false);
  assert.equal(ui().inspector, 'full');
  ui().selectUnit('U5');
  assert.equal(ui().inspector, 'quick');
});

test('F4 · the inspector\'s roads: Full settings, Back to quick settings, hide and show, and the panel\'s own open and x', () => {
  fresh();
  ui().showFullSettings();
  assert.equal(ui().inspector, 'full');
  ui().toggleInspectorPin();
  ui().showQuickSettings();
  assert.deepEqual([ui().inspector, ui().inspectorPinned], ['quick', false], 'back to quick settings unpins');
  ui().hideInspector();
  assert.equal(ui().inspector, 'none');
  ui().showInspector();
  assert.equal(ui().inspector, 'quick');
  ui().toggleInspectorPin();
  ui().hideInspector();
  ui().showInspector();
  assert.equal(ui().inspector, 'full', 'pinned: back to the full panel');
  // verify/t84/p1-host.md F: every legacy road that opens the panel shows it in Studio; its x hides it.
  ui().closeRightPanel();
  assert.deepEqual([ui().rightPanelOpen, ui().inspector], [false, 'none']);
  ui().openRightPanel();
  assert.deepEqual([ui().rightPanelOpen, ui().inspector], [true, 'full']);
  fresh();
});

test('F4 · commit before switch: the guard is asked BEFORE the set; no changes nothing, yes moves, the same cabinet never asks', () => {
  fresh();
  ui().selectUnit('A');
  const seen = [];
  let answer = { ok: false, reason: 'WIDTH: the engine\'s sentence' };
  const guard = () => { seen.push(ui().selectedUnitId); return answer; };
  ui().setSelectionGuard(guard);
  assert.equal(ui().selectionGuard, guard);

  const before = UI.useUiStore.getState();
  assert.equal(ui().selectUnit('B'), false, 'refused: selectUnit says so');
  assert.equal(ui().clearSelection(), false, 'refused: clearSelection says so');
  assert.equal(ui().selectElement('B', 'SHELF-1'), false, 'refused: a part of another cabinet');
  assert.equal(UI.useUiStore.getState(), before, 'the store did not change at all');
  assert.deepEqual(seen, ['A', 'A', 'A'], 'asked while the selection still stood on A');

  // The same cabinet (or a part of it) never asks: nothing is about to move.
  seen.length = 0;
  ui().selectUnit('A');
  ui().selectElement('A', 'SHELF-1');
  assert.deepEqual(seen, []);
  assert.deepEqual(ui().selectedElement, { unitId: 'A', elementRef: 'SHELF-1' });

  // Yes: the selection moves.
  answer = { ok: true };
  ui().selectUnit('B');
  assert.equal(ui().selectedUnitId, 'B');
  assert.deepEqual(seen, ['A']);

  // Only its own owner takes the guard away; with none, everything moves as on main.
  ui().clearSelectionGuard(() => ({ ok: false }));
  assert.equal(ui().selectionGuard, guard, 'another function does not clear it');
  ui().clearSelectionGuard(guard);
  assert.equal(ui().selectionGuard, null);
  answer = { ok: false };
  ui().clearSelection();
  assert.equal(ui().selectedUnitId, null, 'no guard: the legacy face, unchanged');
  fresh();
});

// ─── 6. THE COLUMN'S STYLE (D1's studio.css, the final state) ──────────────

test('F4 · studio.css gives the inspector column no stacking context and no containing block for the windows inside it', () => {
  const rel = 'src/components/studio/studio.css';
  assert.ok(existsSync(new URL(rel, ROOT)), `${rel} (D1, F1) is written`);
  const css = read(rel).replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) => sel.split(',').some((s) => /\.studio-inspector(?![\w-])[^\s>+~]*$/.test(s.trim())));
  assert.ok(rules.length > 0, 'studio.css styles .studio-inspector');
  for (const [, sel, body] of rules) {
    const decls = body.toLowerCase();
    assert.doesNotMatch(decls, /(?:^|;)\s*(?:z-index\s*:\s*(?!auto)|transform\s*:\s*(?!none)|translate\s*:|rotate\s*:|scale\s*:|filter\s*:\s*(?!none)|backdrop-filter\s*:|perspective\s*:|contain\s*:\s*(?!none)|will-change\s*:|isolation\s*:\s*isolate|mix-blend-mode\s*:)/,
      `${sel.trim()}: a stacking context or a containing block traps the windows the host mounts`);
    assert.doesNotMatch(decls, /@apply[^;]*(?:\sz-|\stransform|\sfilter|\sbackdrop-|\swill-change|\scontain-|\sisolate)/, `${sel.trim()}: the same, through @apply`);
  }
});
