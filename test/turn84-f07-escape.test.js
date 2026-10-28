/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F7 (CLAUDE.md T84 PART E): ESCAPE, ONE OWNER, ONE ACTION PER PRESS
//
// CLAUDE.md T84 PART E: *"`lib/studioEscape.js`: one keydown owner for the
// shell: P1's order, one event one action, the door window's conduct by the
// profile, never unpin; the existing listeners keep their own windows (the
// shell does not re-implement the Modal's Escape, it yields to it: a handled
// event does not also clear the selection under it)."*  The order is P1's
// (verify/t84/p1-escape.md E): a focused edit or a local operation, the topmost
// submenu or popup, a closable window, a scene operation, the part, the cabinet.
//
// The module is pure but for its installer, so the order is proved on plain
// snapshots, and the installer on an EventTarget standing in for `window`
// (Node has no DOM). Every hook the document reader looks for is held to the
// component that draws it, so a renamed hook fails here and not in a walk.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ESCAPE_LEVELS, SHELL_ACTIONS,
  registerStudioPopup, studioPopupsOpen, closeTopStudioPopup,
  isFieldTarget, readEscapeDom, escapeSnapshot, escapeStep, installStudioEscape,
} from '../src/components/studio/lib/studioEscape.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const ESC = { key: 'Escape' };
const decide = (parts) => escapeStep(escapeSnapshot({ event: ESC, ...parts }));
const DOOR = { name: 'element', door: true, covered: false, workspace: false };
const ROOM = { name: 'room', door: false, covered: false, workspace: false };

// === THE TABLE: one snapshot, one step ======================================

const CABINET = { selectedUnitId: 'u1' };
const PART = { selectedUnitId: 'u1', selectedElement: { unitId: 'u1', elementRef: 'SHELF-1' } };
const CASES = [
  ['nothing selected, nothing open', {}, 0, null, null],
  ['a cabinet selected', { ui: CABINET }, 6, 'shell', 'clearSelection'],
  ['a piece selected: the piece goes, the cabinet stays', { ui: PART }, 5, 'shell', 'clearElement'],
  ['a field has the caret, over everything', {
    ui: { ...PART, contextMenu: {}, libraryCategory: 'kitchen' }, dom: { field: true, menu: true, windows: [ROOM] },
  }, 1, 'own', null],
  ['a refused card value stands (its field cancels it)', { ui: PART, dom: { refusal: true, menu: true } }, 1, 'own', null],
  ['Center between, its piece panel open', { ui: { ...PART, centreBetween: { unitId: 'u1' } }, dom: { centreBetweenListener: true } }, 1, 'own', null],
  ['Center between, no panel left', { ui: { ...PART, centreBetween: { unitId: 'u1' } } }, 1, 'shell', 'cancelCentreBetween'],
  ['the top menu open over a cabinet (today: both go, p1-escape.md D 1)', { ui: CABINET, dom: { menu: true } }, 2, 'own', null],
  ['the right-click menu over a cabinet (D 4)', { ui: { ...CABINET, contextMenu: { x: 1 } } }, 2, 'own', null],
  ['a library flyout', { ui: { ...CABINET, libraryCategory: 'kitchen' }, dom: { libraryFlyout: true } }, 2, 'own', null],
  ['the material picker', { ui: CABINET, dom: { materialPicker: true, windows: [ROOM] } }, 2, 'own', null],
  ['a rail popup (registered): the shell closes it', { ui: CABINET, dom: { studioPopups: 1 }, popups: 1 }, 2, 'shell', 'closePopup'],
  ['the View popup (answers its own key)', { ui: CABINET, dom: { studioPopups: 1 } }, 2, 'own', null],
  ['the Changes list (D 5)', { ui: { ...CABINET, historyOpen: true }, dom: { historyList: true } }, 2, 'own', null],
  ['the Changes flag, no list drawn', { ui: { ...CABINET, historyOpen: true } }, 2, 'shell', 'closeHistory'],
  ['a window over a cabinet (D 2)', { ui: CABINET, dom: { windows: [ROOM] } }, 3, 'own', null],
  ['the Library over a cabinet (D 3)', { ui: { ...CABINET, libraryCategory: 'kitchen' } }, 3, 'own', null],
  ['the island plan (D 7)', { ui: { ...CABINET, islandPlan: { cx: 0 } } }, 3, 'own', null],
  ['the door window and its leaf: the leaf goes, the window stays (case 7)', { ui: PART, dom: { windows: [DOOR] } }, 5, 'shell', 'clearElement'],
  ['the door window and its cabinet: the cabinet goes, the window stays (case 7b)', { ui: CABINET, dom: { windows: [DOOR] } }, 6, 'shell', 'clearSelection'],
  ['the door window and another window: the other answers', { ui: PART, dom: { windows: [DOOR, ROOM] } }, 3, 'own', null],
  ['a workspace window covered by another: the top one answers', {
    ui: CABINET, dom: { windows: [{ name: 'room', door: false, covered: true, workspace: true }, ROOM] },
  }, 3, 'own', null],
  ['Measure on, over a piece (D 6: its own key)', { ui: { ...PART, rulerOn: true } }, 4, 'own', null],
  ['the corners lit for a cut', { ui: { ...CABINET, notchPick: 'u1' } }, 4, 'shell', 'stopNotchPick'],
  ['the edges lit for a cut', { ui: { ...CABINET, edgeNotchPick: 'u1' } }, 4, 'shell', 'stopEdgeNotchPick'],
];

for (const [name, parts, level, owner, action] of CASES) {
  test(`F7 Escape order · ${name}`, () => {
    const step = decide(parts);
    assert.equal(step.level, level, `${name}: level ${step.level} (${step.why})`);
    assert.equal(step.step, level ? ESCAPE_LEVELS[level - 1] : 'none');
    assert.equal(step.owner, owner, `${name}: owner ${step.owner}`);
    assert.equal(step.action, action, `${name}: action ${step.action}`);
    assert.ok(typeof step.why === 'string' && step.why.length > 8, 'every step says why');
  });
}

test('F7 Escape order · only Escape, and an answered press is left alone', () => {
  assert.equal(escapeStep(escapeSnapshot({ event: { key: 'Enter' }, ui: CABINET })).owner, null);
  assert.equal(escapeStep(escapeSnapshot({ event: { key: 'Escape', defaultPrevented: true }, ui: CABINET })).action, null);
  assert.equal(escapeStep(escapeSnapshot({ event: { key: 'Escape', cancelBubble: true }, ui: CABINET })).action, null);
  assert.equal(escapeStep(escapeSnapshot({ event: { key: 'Escape', isComposing: true }, ui: CABINET })).owner, 'own');
  assert.equal(escapeStep(null).level, 0);
});

// === THE ORDER, OVER EVERY KIND OF PRESS ====================================

// Which level each fact belongs to (p1-escape.md E), written apart from the
// module so the module is held to the table and not to itself.
const LEVEL_OF = {
  composing: 1, field: 1, refusal: 1, centreBetween: 1,
  ownPopup: 2, otherPopup: 2, menu: 2, contextMenu: 2, libraryFlyout: 2, materialPicker: 2, history: 2,
  window: 3, library: 3, islandPlan: 3,
  ruler: 4, notchPick: 4, edgeNotchPick: 4,
  part: 5,
  cabinet: 6,
};
const FACTS = Object.keys(LEVEL_OF);

test('F7 Escape · one press, one step: the first active level owns it, over 6000 mixed presses', () => {
  let seed = 84;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const counts = new Map();
  for (let n = 0; n < 6000; n += 1) {
    const s = { key: 'Escape', handled: false, centreBetweenListener: rnd() < 0.5, historyList: rnd() < 0.5 };
    for (const f of FACTS) s[f] = rnd() < 0.18;
    const step = escapeStep(s);
    const active = FACTS.filter((f) => s[f]).map((f) => LEVEL_OF[f]);
    const want = active.length ? Math.min(...active) : 0;
    assert.equal(step.level, want, `facts ${FACTS.filter((f) => s[f]).join(',')}: level ${step.level}, want ${want}`);
    // Exactly one answer: the shell names one action from its list, or none.
    if (step.owner === 'shell') assert.ok(SHELL_ACTIONS.includes(step.action), `${step.action} is not a shell action`);
    else assert.equal(step.action, null);
    counts.set(step.level, (counts.get(step.level) || 0) + 1);
  }
  for (const level of [1, 2, 3, 4, 5, 6]) assert.ok(counts.get(level) > 0, `level ${level} was never reached by the sweep`);
});

test('F7 Escape · never unpin: nothing the shell may do touches the inspector or its pin', () => {
  for (const a of SHELL_ACTIONS) assert.doesNotMatch(a, /pin|inspector|quick|full/i, `${a} reaches the inspector`);
  const code = read('src/components/studio/lib/studioEscape.js').replace(/^\s*(\/\/|\*|\/\*).*$/gm, '');
  assert.doesNotMatch(code, /inspectorPinned|toggleInspectorPin|showQuickSettings|setInspector|hideInspector|showFullSettings/);
});

// === THE DOOR WINDOW: T37'S CONDUCT, ITS KEY OFF ==============================
//
// CLAUDE.md LAWS 4 makes the door window's conduct the profile's ('beside' or
// 'dock-left', sticky and Escape-proof in both). Tonight it keeps T37's in both
// faces (verify/t84/DECISIONS.md 9: DoorModal.jsx is a retail copy, so its
// conduct is not edited), and the profile says so: 'dock-left'. Either way the
// door window is not a closable window, and the snapshot never asks which.

test('F7 Escape · the door window keeps T37\'s conduct and its key off; the shell steps past it', () => {
  assert.equal(P.ui?.studio?.doorWindow, 'dock-left', 'the profile promises a conduct the door window does not have');
  const door = read('src/components/DoorModal.jsx');
  assert.match(door, /dock=\{isDoor \? 'left' : null\}/);
  assert.match(door, /sticky=\{isDoor\}/);
  assert.match(door, /escapeCloses=\{!isDoor\}/);
  // The window answers no Escape, so the press goes to the leaf, then to the cabinet.
  assert.equal(decide({ ui: PART, dom: { windows: [DOOR] } }).step, 'part');
  assert.equal(decide({ ui: CABINET, dom: { windows: [DOOR] } }).step, 'cabinet');
  assert.equal(decide({ ui: {}, dom: { windows: [DOOR] } }).step, 'none');
  // The module reads no conduct at all.
  assert.doesNotMatch(read('src/components/studio/lib/studioEscape.js').replace(/^\s*\/\/.*$/gm, ''), /\.doorWindow\b/);
});

// === THE STUDIO'S POPUPS ======================================================

test('F7 Escape · a rail popup registers its close; the topmost one is closed, once', () => {
  const closed = [];
  const offA = registerStudioPopup(() => closed.push('a'));
  const offB = registerStudioPopup(() => closed.push('b'));
  assert.equal(studioPopupsOpen(), 2);
  assert.equal(closeTopStudioPopup(), true);
  assert.deepEqual(closed, ['b']);
  offB();
  offA();
  offA();
  assert.equal(studioPopupsOpen(), 0);
  assert.equal(closeTopStudioPopup(), false);
  assert.equal(typeof registerStudioPopup(null), 'function');
  assert.equal(studioPopupsOpen(), 0);
});

// === THE INSTALLER: ONE LISTENER, CAPTURE, ONE ACTION, NOTHING AFTER IT ======

/** An Escape the way a browser hands it over, on a stand-in for `window`. */
function press(target, key = 'Escape') {
  const ev = new Event('keydown', { cancelable: true });
  Object.defineProperty(ev, 'key', { value: key });
  target.dispatchEvent(ev);
  return ev;
}

/** The store's own action names, each a spy, plus the state the press reads. */
function storeWith(state = {}) {
  const calls = [];
  const spy = (name) => () => { calls.push(name); };
  const ui = { ...state };
  for (const name of ['cancelCentreBetween', 'closeHistory', 'stopNotchPick', 'stopEdgeNotchPick', 'clearElement',
    'clearSelection', 'toggleInspectorPin', 'showQuickSettings', 'hideInspector', 'closeModal', 'closeLibrary',
    'closeContextMenu', 'setRuler', 'clearRuler']) ui[name] = spy(name);
  return { ui, calls };
}

test('F7 Escape installer · one capture listener; a shell step is one action and nothing after it runs', () => {
  const win = new EventTarget();
  const { ui, calls } = storeWith(PART);
  const off = installStudioEscape({ getUi: () => ui, getDom: () => ({}), target: win, doc: null });
  // A listener added after the shell's, standing for the page's own Escape or a menu's.
  let after = 0;
  win.addEventListener('keydown', () => { after += 1; }, true);
  win.addEventListener('keydown', () => { after += 1; });
  press(win);
  assert.deepEqual(calls, ['clearElement'], 'one press, one action');
  assert.equal(after, 0, 'a listener after the shell acted on the same press');
  // A key that is not Escape is nobody's business here.
  press(win, 'a');
  assert.deepEqual(calls, ['clearElement']);
  assert.equal(after, 2);
  off();
  press(win);
  assert.deepEqual(calls, ['clearElement'], 'the removal left a listener behind');
});

test('F7 Escape installer · an owner\'s step is left to its owner: nothing done, nothing stopped', () => {
  for (const [name, state, dom] of [
    ['a field', PART, { field: true }],
    ['the top menu', PART, { menu: true }],
    ['a window', PART, { windows: [ROOM] }],
    ['the Library', { ...PART, libraryCategory: 'kitchen' }, {}],
    ['Measure', { ...PART, rulerOn: true }, {}],
    ['the View popup', PART, { studioPopups: 1 }],
  ]) {
    const win = new EventTarget();
    const { ui, calls } = storeWith(state);
    const off = installStudioEscape({ getUi: () => ui, getDom: () => dom, target: win, doc: null });
    let owner = 0;
    win.addEventListener('keydown', () => { owner += 1; });
    const ev = press(win);
    assert.deepEqual(calls, [], `${name}: the shell acted under its owner`);
    assert.equal(owner, 1, `${name}: the owner did not get the press`);
    assert.equal(ev.defaultPrevented, false);
    off();
  }
});

test('F7 Escape installer · a press an earlier listener answered is left alone', () => {
  const win = new EventTarget();
  win.addEventListener('keydown', (e) => e.stopPropagation(), true);
  const { ui, calls } = storeWith(CABINET);
  const off = installStudioEscape({ getUi: () => ui, getDom: () => ({}), target: win, doc: null });
  press(win);
  assert.deepEqual(calls, [], 'the cabinet was dropped under a handled press');
  off();
});

test('F7 Escape installer · the rail popup is closed by the shell, the cabinet under it stays', () => {
  const win = new EventTarget();
  const { ui, calls } = storeWith(CABINET);
  let closed = 0;
  const offPopup = registerStudioPopup(() => { closed += 1; });
  // The page draws the popup while it is registered (RailMenus.jsx does both).
  const off = installStudioEscape({
    getUi: () => ui, getDom: () => ({ studioPopups: studioPopupsOpen() }), target: win, doc: null,
  });
  press(win);
  assert.equal(closed, 1);
  assert.deepEqual(calls, []);
  offPopup();
  press(win);
  assert.deepEqual(calls, ['clearSelection'], 'the next press steps out of the cabinet');
  off();
});

test('F7 Escape installer · one level per press, part then cabinet, the pin never touched', () => {
  const win = new EventTarget();
  const state = { ...PART, inspectorPinned: true, inspector: 'full' };
  const { ui, calls } = storeWith(state);
  ui.clearElement = () => { calls.push('clearElement'); state.selectedElement = null; };
  ui.clearSelection = () => { calls.push('clearSelection'); state.selectedUnitId = null; };
  const steps = [];
  const off = installStudioEscape({
    getUi: () => ({ ...ui, ...state }), getDom: () => ({ windows: [DOOR] }), target: win, doc: null, onStep: (s) => steps.push(s.step),
  });
  press(win);
  press(win);
  press(win);
  assert.deepEqual(calls, ['clearElement', 'clearSelection']);
  assert.deepEqual(steps, ['part', 'cabinet', 'none']);
  assert.equal(state.inspectorPinned, true);
  off();
});

test('F7 Escape installer · an action can be named by the caller, and only a shell action', () => {
  const win = new EventTarget();
  const { ui } = storeWith({ ...CABINET, notchPick: 'u1' });
  const mine = [];
  const off = installStudioEscape({
    getUi: () => ui, getDom: () => ({}), target: win, doc: null, actions: { stopNotchPick: (u, ctx) => mine.push([typeof u.stopNotchPick, ctx.event.key]) },
  });
  press(win);
  assert.deepEqual(mine, [['function', 'Escape']]);
  off();
  assert.equal(typeof installStudioEscape({ getUi: () => ui, target: null }), 'function', 'no window: a harmless removal');
});

// === WHAT THE DOCUMENT READER LOOKS FOR, AND WHO DRAWS IT ====================

test('F7 Escape · the document reader: a fake page, every fact', () => {
  const el = (attrs = {}, inner = {}) => ({
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    querySelector: (sel) => inner[sel] || null,
  });
  const present = {
    '[data-studio="refused"][data-refused="1"]': el(),
    'nav[aria-label="Main menu"] [role="menu"]': el(),
    '[data-message-history-list]': el(),
  };
  const shells = [
    el({ 'data-modal-name': 'element', 'data-modal-covered': '0' }, { '[data-door-modal-sections="B,A"]': el() }),
    el({ 'data-modal-name': 'room', 'data-modal-covered': '1', 'data-modal-workspace': '1' }),
  ];
  const doc = {
    querySelector: (sel) => present[sel] || null,
    querySelectorAll: (sel) => (sel === '[data-modal-shell="1"]' ? shells : (sel === '[data-studio="popup"]' ? [el(), el()] : [])),
  };
  const dom = readEscapeDom({ target: { tagName: 'BUTTON' } }, doc);
  assert.equal(dom.field, false);
  assert.equal(dom.refusal, true);
  assert.equal(dom.menu, true);
  assert.equal(dom.historyList, true);
  assert.equal(dom.libraryFlyout, false);
  assert.equal(dom.studioPopups, 2);
  assert.deepEqual(dom.windows, [
    { name: 'element', door: true, covered: false, workspace: false },
    { name: 'room', door: false, covered: true, workspace: true },
  ]);
  assert.deepEqual(readEscapeDom({ target: null }, null), {});
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT', 'input']) assert.equal(isFieldTarget({ tagName: tag }), true);
  assert.equal(isFieldTarget({ tagName: 'DIV', isContentEditable: true }), true);
  for (const t of [{ tagName: 'BUTTON' }, { tagName: 'DIV' }, null, 'INPUT']) assert.equal(isFieldTarget(t), false);
});

test('F7 Escape · every hook the reader looks for is drawn by the component it names', () => {
  const HOOKS = [
    ['src/components/studio/RefusedField.jsx', /data-studio="refused"/, /data-refused=/],
    ['src/components/ElementProperties.jsx', /data-centre-between="1"/, /aria-pressed=\{Boolean\(centreBetween\)\}/],
    ['src/components/MenuBar.jsx', /aria-label="Main menu"/, /role="menu"/],
    ['src/components/LibraryPanel.jsx', /data-library-flyout=/],
    ['src/components/MaterialPicker.jsx', /data-material-picker-panel="1"/],
    ['src/components/Messages.jsx', /data-message-history-list/],
    ['src/components/Modal.jsx', /data-modal-shell="1"/, /data-modal-name=/, /data-modal-covered=/, /data-modal-workspace=/],
    ['src/components/DoorModal.jsx', /data-door-modal-sections=\{isDoor \? 'B,A' : 'A'\}/],
    ['src/components/studio/RailMenus.jsx', /data-studio="popup"/, /registerStudioPopup\(/],
    ['src/components/studio/SceneViewMenu.jsx', /data-studio="popup"/],
  ];
  for (const [file, ...patterns] of HOOKS) {
    const text = read(file);
    for (const p of patterns) assert.match(text, p, `${file} no longer draws ${p}`);
  }
  // The store fields the snapshot reads are the store's own (uiStore.js).
  const store = read('src/stores/uiStore.js');
  for (const field of ['centreBetween', 'contextMenu', 'historyOpen', 'libraryCategory', 'islandPlan', 'modal', 'rulerOn',
    'notchPick', 'edgeNotchPick', 'selectedElement', 'selectedUnitId']) {
    assert.match(store, new RegExp(`\\n  ${field}: `), `uiStore has no ${field}`);
  }
  for (const action of SHELL_ACTIONS.filter((a) => a !== 'closePopup')) {
    assert.match(store, new RegExp(`\\n  ${action}: `), `uiStore has no ${action}: the shell would call nothing`);
  }
});

test('F7 Escape · the module is pure: no React, no store, no DOM at import, no dash', () => {
  const text = read('src/components/studio/lib/studioEscape.js');
  assert.doesNotMatch(text, /^import /m, 'the Escape module imports something');
  assert.ok(text.startsWith('/*\n * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.\n'), 'no Skylon header');
  assert.doesNotMatch(text, new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`), 'an em or en dash');
  // Imported above in a process with no `window` and no `document`: it read neither.
  assert.equal(typeof globalThis.document, 'undefined');
});

// === THE PAGE (after INT integrates F7) =====================================

test('F7 Escape · the page installs the one owner under the Studio face and turns its own Escape off there (after INT integrates F7)', () => {
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.match(page, /import \{[^}]*\binstallStudioEscape\b[^}]*\} from '\.\.\/components\/studio\/lib\/studioEscape\.js'/);
  const call = page.search(/installStudioEscape\(\{/);
  assert.ok(call >= 0, 'the page does not install the Escape owner');
  assert.match(page.slice(call, call + 240), /getUi:\s*(?:useUiStore\.getState|\(\)\s*=>\s*useUiStore\.getState\(\))/);
  assert.match(page.slice(Math.max(0, call - 240), call), /\bstudio\b/, 'the owner is installed outside the Studio face');
  // The page's own branch (turn 9) stands for the legacy face and yields under Studio.
  const at = page.indexOf("if (e.key === 'Escape') {");
  assert.ok(at >= 0, 'the page lost its own Escape branch (the legacy face needs it)');
  let depth = 0;
  let end = at;
  for (let i = page.indexOf('{', at); i < page.length; i += 1) {
    if (page[i] === '{') depth += 1;
    else if (page[i] === '}') { depth -= 1; if (depth === 0) { end = i; break; } }
  }
  const branch = page.slice(at, end + 1);
  assert.match(branch, /if \(studio\) return;/, 'the page still drops the selection itself under the Studio face');
  assert.match(branch, /clearElement\(\)/);
  assert.match(branch, /clearSelection\(\)/);
});
