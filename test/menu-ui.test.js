/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// THE RIGHT-CLICK MENU TURN (the owner's boards, 01.11.2026), the interface
// half: J1 the menu as drawn (280 px, the 13 px header, one tick column, the
// square, the circles, the mixed state, the submenu, Delete alone), J2 the
// "..." icon at the top of the right panel (*"na gorze prawego panelu"*), J3
// the Mac (*"Na Macu Ctrl + klik to menu, nie zaznaczanie"*), J4 the iPad (the
// finger held 0,5 s, and "Select several", *"9 - ok"*).
//
// The menu is driven the way the client clicks it: rendered by React (a small
// renderer over react-reconciler, no DOM), its rows clicked through their own
// handlers, the entries the real lib/contextActions.js gives for real cabinets
// of the real project store. The platform and the long press are pure and are
// asked as written; the scene's own handlers are read from their source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

const ESB = new URL('../node_modules/esbuild/lib/main.js', import.meta.url).href;
register(`data:text/javascript,${encodeURIComponent(`
import esb from '${ESB}';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function load(url, context, next) {
  const path = url.split('?')[0];
  if (path.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  if (path.endsWith('.jsx')) {
    const file = fileURLToPath(path);
    const { code } = esb.transformSync(readFileSync(file, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: file });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return next(url, context);
}`)}`, import.meta.url);

const mem = new Map();
globalThis.localStorage = globalThis.localStorage || {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
// The window the menu listens on: its listeners are kept, so a press outside and Escape can be sent.
const listeners = new Map();
globalThis.window = globalThis.window || {};
Object.assign(globalThis.window, {
  innerWidth: 1600,
  innerHeight: 1000,
  addEventListener: (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
  removeEventListener: (type, fn) => { listeners.get(type)?.delete(fn); },
});
globalThis.document = globalThis.document || {
  activeElement: null, addEventListener() {}, removeEventListener() {}, body: {}, querySelector: () => null,
};
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} disconnect() {} unobserve() {} };

const React = await import('react');
const { default: createReconciler } = await import('react-reconciler');
const { ConcurrentRoot, DefaultEventPriority, NoEventPriority } = await import('react-reconciler/constants.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { menuTitle } = await import('../src/lib/contextActions.js');
const {
  default: ContextMenu, ActionsMenuButton, menuFromButton, splitDanger, kindOf,
} = await import('../src/components/ContextMenu.jsx');
const { placeMenuUnderAnchor, placeSubmenu, clampMenuPosition } = await import('../src/lib/menuPlacement.js');
const {
  LONG_PRESS_MS, LONG_PRESS_SLOP_PX, additiveClick, isMacLike, isTouchLike, isTouchPress, menuOnlyClick,
  startLongPress, swallowClickAfterRelease,
} = await import('../src/lib/platform.js');
const platform = {
  LONG_PRESS_MS, LONG_PRESS_SLOP_PX, additiveClick, isMacLike, isTouchLike, isTouchPress, menuOnlyClick,
  startLongPress, swallowClickAfterRelease,
};

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

// ── a small renderer: React's own reconciler over plain objects, so a click is the row's own onClick ──
let prio = NoEventPriority;
let RECT = { left: 0, top: 0, right: 280, bottom: 600, width: 280, height: 600, x: 0, y: 0 };
const host = (type, props) => ({
  type, props, children: [], parent: null, style: {}, isConnected: true,
  getBoundingClientRect: () => RECT, getClientRects: () => [RECT], focus() {}, blur() {}, scrollTo() {},
  contains: () => false, querySelectorAll: () => [], querySelector: () => null, closest: () => null, getAttribute: () => null,
});
const put = (p, c, before) => {
  c.parent = p;
  const i = p.children.indexOf(c);
  if (i >= 0) p.children.splice(i, 1);
  const j = before ? p.children.indexOf(before) : -1;
  if (j >= 0) p.children.splice(j, 0, c); else p.children.push(c);
};
const drop = (p, c) => { const i = p.children.indexOf(c); if (i >= 0) p.children.splice(i, 1); };
const R = createReconciler({
  isPrimaryRenderer: false, warnsIfNotActing: false, supportsMutation: true, supportsPersistence: false, supportsHydration: false,
  createInstance: (type, props) => host(type, props),
  createTextInstance: (text) => ({ type: '#text', text, parent: null }),
  appendInitialChild: put, appendChild: put, insertBefore: put, appendChildToContainer: put, insertInContainerBefore: put,
  removeChild: drop, removeChildFromContainer: drop,
  commitUpdate(inst, type, oldProps, newProps) { inst.props = newProps; },
  commitTextUpdate(t, o, n) { t.text = n; },
  finalizeInitialChildren: () => false, commitMount() {}, getPublicInstance: (i) => i, prepareForCommit: () => null,
  resetAfterCommit() {}, preparePortalMount() {}, shouldSetTextContent: () => false, clearContainer() {},
  getRootHostContext: () => ({}), getChildHostContext: () => ({}), hideInstance() {}, unhideInstance() {},
  hideTextInstance() {}, unhideTextInstance() {}, scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1,
  getInstanceFromNode: () => null, beforeActiveInstanceBlur() {}, afterActiveInstanceBlur() {}, detachDeletedInstance() {},
  prepareScopeUpdate() {}, getInstanceFromScope: () => null, shouldAttemptEagerTransition: () => false, trackSchedulerEvent() {},
  resolveEventType: () => null, resolveEventTimeStamp: () => -1.1, requestPostPaintCallback() {}, maySuspendCommit: () => false,
  preloadInstance: () => true, startSuspendingCommit() {}, suspendInstance() {}, waitForCommitToBeReady: () => null,
  NotPendingTransition: null, HostTransitionContext: React.createContext(null),
  setCurrentUpdatePriority(p) { prio = p; }, getCurrentUpdatePriority: () => prio,
  resolveUpdatePriority: () => (prio !== NoEventPriority ? prio : DefaultEventPriority), resetFormInstance() {},
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function mount(element) {
  const root = host('#root', {});
  const c = R.createContainer(root, ConcurrentRoot, null, false, null, '', () => {}, () => {}, () => {}, null);
  await React.act(async () => { R.updateContainer(element, c, null, null); });
  return { root, unmount: () => React.act(async () => { R.updateContainer(null, c, null, null); }) };
}
const all = (n, pred, out = []) => {
  if (n.type !== '#text' && pred(n)) out.push(n);
  for (const k of n.children || []) all(k, pred, out);
  return out;
};
const one = (n, pred) => all(n, pred)[0] || null;
const textOf = (n) => (n.type === '#text' ? n.text : (n.children || []).map(textOf).join(' ')).replace(/\s+/g, ' ').trim();
const by = (attr, value) => (n) => n.props?.[attr] !== undefined && (value === undefined || String(n.props[attr]) === String(value));
const entry = (root, id) => one(root, (n) => n.props?.['data-menu-entry'] === id);
const ev = (n, extra = {}) => ({
  preventDefault() {}, stopPropagation() {}, currentTarget: n, target: n, button: 0, pointerType: 'mouse', ...extra,
});
const click = (n, extra) => React.act(async () => { n.props.onClick?.(ev(n, extra)); });
const key = (n, k) => React.act(async () => { n.props.onKeyDown?.(ev(n, { key: k })); });
const cls = (n) => String(n?.props?.className || '');

// ── the cabinets: the real store, real kits ──
const P = () => useProjectStore.getState();
const U = () => useUiStore.getState();
function fresh() {
  U().closeContextMenu();
  U().clearSelection();
  U().setSelectSeveral(false);
  useProjectStore.setState({ units: [] });
}
function wardrobes(n) {
  fresh();
  const ids = [];
  for (let i = 0; i < n; i += 1) {
    const res = P().addUnit('WARDROBE', i ? { near: ids[i - 1], side: 'R' } : {});
    assert.ok(res?.id, `wardrobe ${i + 1} was not added: ${res?.error || ''}`);
    ids.push(res.id);
  }
  return ids;
}
const unitOf = (id) => P().units.find((u) => u.id === id);
async function openOn(unitId, extra = {}) {
  await React.act(async () => { U().openContextMenu({ x: 300, y: 200, unitId, panelId: null, part: null, drawer: null, ...extra }); });
}

// ═══ J1 · THE MENU AS DRAWN ═════════════════════════════════════════════════

test('J1 · 280 px wide, the header 13 px with menuTitle\'s words, a scroll safety net, one 16 px tick column in every row', async () => {
  const [id] = wardrobes(1);
  U().selectUnit(id);
  const view = await mount(React.createElement(ContextMenu));
  await openOn(id);
  const box = one(view.root, by('data-context-menu', '1'));
  assert.ok(box, 'the menu did not open');
  assert.match(cls(box), /\bw-\[280px\]/);
  assert.doesNotMatch(cls(box), /w-\[180px\]/);
  assert.match(cls(box), /max-h-\[calc\(100vh-16px\)\]/);
  assert.ok(one(box, (n) => /\bcc-scroll\b/.test(cls(n))), 'no house scroll class inside the menu');
  const head = one(box, by('data-menu-header', '1'));
  assert.match(cls(head), /text-\[13px\]/);
  assert.equal(head.props.title, 'Drag to move this menu');
  assert.equal(typeof head.props.onPointerDown, 'function', 'the header no longer drags');
  assert.equal(textOf(head), menuTitle({ unit: unitOf(id), units: [unitOf(id)] }));
  // Every row (command, toggle, choice, submenu) has exactly one tick column, 16 px wide.
  const rows = all(box, (n) => n.props?.['data-menu-entry'] !== undefined);
  assert.ok(rows.length >= 8, `only ${rows.length} rows`);
  for (const row of rows) {
    const ticks = all(row, by('data-menu-tick', '1'));
    assert.equal(ticks.length, 1, `${row.props['data-menu-entry']} has ${ticks.length} tick columns`);
    assert.match(cls(ticks[0]), /\bw-4\b/);
    assert.match(cls(ticks[0]), /\bshrink-0\b/);
  }
  // The rows are 32 px for a mouse and 44 px for a finger; the items 14 px.
  const plinth = entry(box, 'plinth');
  assert.match(cls(plinth), /\bmin-h-8\b/);
  assert.match(cls(plinth), /\[@media\(pointer:coarse\)\]:min-h-11/);
  assert.match(cls(plinth), /\btext-sm\b/);
  // No typed tick or dot is left from the old menu, and no dash.
  const text = textOf(box);
  for (const ch of ['✓', '· Plinth', EM, EN]) assert.ok(!text.includes(ch), `the menu prints ${JSON.stringify(ch)}`);
  await view.unmount();
});

test('J1 · a toggle is a 12 px square: gold with a drawn tick when on, an empty 1 px outline when off', async () => {
  const [id] = wardrobes(1);
  P().addPlinth(id);
  U().selectUnit(id);
  const view = await mount(React.createElement(ContextMenu));
  await openOn(id);
  const on = entry(view.root, 'plinth');
  assert.equal(on.props.role, 'menuitemcheckbox');
  assert.equal(on.props['aria-checked'], true);
  const sq = one(on, by('data-toggle'));
  assert.equal(sq.props['data-toggle'], 'on');
  assert.match(cls(sq), /\bw-3 h-3\b/);
  assert.match(cls(sq), /\bbg-gold\b/);
  const tick = sq.children[0];
  assert.match(cls(tick), /border-r-2 border-b-2/);
  assert.match(cls(tick), /rotate-45/);
  const off = entry(view.root, 'top-infill');
  assert.equal(off.props['aria-checked'], false);
  const empty = one(off, by('data-toggle'));
  assert.equal(empty.props['data-toggle'], 'off');
  assert.match(cls(empty), /\bborder border-ink-400\b/);
  assert.equal(empty.children.length, 0);
  // A command row has the column and nothing in it.
  const save = entry(view.root, 'save-template');
  assert.equal(one(save, by('data-menu-tick', '1')).children.length, 0);
  await view.unmount();
});

test('J1 · a choice is its label then circles, each a real button at least 32 px high; four or more go under the label', async () => {
  const [id] = wardrobes(1);
  U().selectUnit(id);
  const view = await mount(React.createElement(ContextMenu));
  await openOn(id);
  const cornice = entry(view.root, 'cornice');
  assert.equal(cornice.props['data-menu-kind'], 'choice');
  assert.equal(cornice.props['data-choice-layout'], 'inline');
  const segs = all(cornice, (n) => n.type === 'button');
  assert.ok(segs.length >= 2, 'the cornice has no options');
  for (const s of segs) {
    assert.equal(s.props.role, 'menuitemradio');
    assert.match(cls(s), /\bh-8\b/, 'a segment is under 32 px');
    assert.match(cls(s), /\[@media\(pointer:coarse\)\]:h-11/);
    assert.match(cls(s), /min-w-\[44px\]/);
    assert.equal(all(s, by('data-radio')).length, 1, 'a segment without its circle');
  }
  // One chosen: the wardrobe's own cornice.
  const chosen = segs.filter((s) => s.props['aria-checked'] === true);
  assert.equal(chosen.length, 1);
  assert.equal(one(chosen[0], by('data-radio')).props['data-radio'], 'on');
  assert.match(cls(one(chosen[0], by('data-radio'))), /rounded-full border border-gold/);
  // End panels: four options, under the label at the full width.
  const ends = entry(view.root, 'end-panels');
  assert.equal(ends.props['data-choice-layout'], 'stacked');
  assert.equal(all(ends, (n) => n.type === 'button').length, 4);
  assert.deepEqual(all(ends, (n) => n.type === 'button').map((b) => textOf(b)), ['None', 'Left', 'Right', 'Both']);
  await view.unmount();
});

test('J1 · a choice option runs its own act on click and the menu closes', async () => {
  const [id] = wardrobes(1);
  U().selectUnit(id);
  const view = await mount(React.createElement(ContextMenu));
  await openOn(id);
  const left = one(entry(view.root, 'end-panels'), by('data-menu-option', 'L'));
  await click(left);
  assert.equal(U().contextMenu, null, 'the menu stayed open');
  assert.ok((unitOf(id).params.end_panels || []).some((ep) => ep.side === 'L'), 'Left fitted no left end panel');
  await view.unmount();
});

test('J1 · mixed: a gold outline with a drawn bar (never a dash), aria mixed, and a choice with no circle chosen', async () => {
  const ids = wardrobes(3);
  // Per cabinet (the plinth and the infill are a RUN's, and a run of three agrees with itself):
  // the scribe fillers off on one of the three, the cornice changed on another.
  P().setSideInfillEnabled(ids[0], false);
  U().selectUnit(ids[0]);
  U().selectUnit(ids[1], { additive: true });
  U().selectUnit(ids[2], { additive: true });
  const view = await mount(React.createElement(ContextMenu));
  await openOn(ids[1]);
  const head = one(view.root, by('data-menu-header', '1'));
  assert.equal(textOf(head), '3 cabinets selected');
  const fillers = entry(view.root, 'side-infill');
  assert.equal(fillers.props['aria-checked'], 'mixed');
  const sq = one(fillers, by('data-toggle'));
  assert.equal(sq.props['data-toggle'], 'mixed');
  assert.match(cls(sq), /\bborder border-gold\b/);
  assert.doesNotMatch(cls(sq), /\bbg-gold\b/);
  const bar = sq.children[0];
  assert.match(cls(bar), /h-\[2px\]/);
  assert.match(cls(bar), /\bbg-gold\b/);
  assert.equal(all(sq, (n) => n.type === '#text').length, 0, 'the bar is typed, not drawn');
  assert.match(textOf(fillers), /Scribe fillers at the wall \(2 of 3\)/);
  for (const ch of [EM, EN]) assert.ok(!textOf(fillers).includes(ch));
  // End panels that disagree (a left one on one cabinet only): no circle chosen, never a guess.
  P().addEndPanel(ids[0], { side: 'L' });
  await openOn(ids[1]);
  const ends = entry(view.root, 'end-panels');
  assert.ok((unitOf(ids[0]).params.end_panels || []).some((ep) => ep.side === 'L'), 'the left end panel was not fitted');
  assert.equal(all(ends, (n) => n.props?.['aria-checked'] === true).length, 0, 'a guess was drawn as chosen');
  assert.equal(all(ends, by('data-radio', 'on')).length, 0);
  assert.equal(all(ends, by('data-radio', 'off')).length, 4);
  await view.unmount();
});

test('J1 · Delete is red and alone at the bottom, under a line; groups are parted by a 1 px line', async () => {
  const ids = wardrobes(2);
  U().selectUnit(ids[0]);
  U().selectUnit(ids[1], { additive: true });
  const view = await mount(React.createElement(ContextMenu));
  await openOn(ids[1]);
  const body = one(view.root, by('data-menu-body', '1'));
  const groups = body.children.filter((n) => n.props?.['data-menu-group'] !== undefined);
  const last = groups[groups.length - 1];
  assert.equal(last.props['data-menu-group'], 'danger');
  const rows = all(last, (n) => n.props?.['data-menu-entry'] !== undefined);
  assert.deepEqual(rows.map((r) => r.props['data-menu-entry']), ['delete'], 'Delete does not stand alone');
  assert.match(cls(rows[0]), /\btext-status-danger\b/);
  assert.equal(textOf(rows[0]), 'Delete 2 cabinets');
  assert.ok(one(last, by('data-menu-divider', 'danger')), 'no line over Delete');
  for (const g of groups.slice(1)) {
    const line = one(g, by('data-menu-divider'));
    assert.ok(line, `the ${g.props['data-menu-group']} group has no line over it`);
    assert.match(cls(line), /\bborder-t\b/);
  }
  assert.equal(one(groups[0], by('data-menu-divider')), null, 'a line over the first group');
  await view.unmount();
});

test('J1 · splitDanger moves every danger row last, whatever group it was given; kindOf reads older actions', () => {
  const groups = [
    { id: 'a', actions: [{ id: 'x' }, { id: 'del', danger: true }] },
    { id: 'b', actions: [{ id: 'gone', danger: true }] },
    { id: 'c', title: 'Cabinet W02', actions: [{ id: 'y' }] },
  ];
  const { body, danger } = splitDanger(groups);
  assert.deepEqual(body.map((g) => g.id), ['a', 'c']);
  assert.deepEqual(body[0].actions.map((a) => a.id), ['x']);
  assert.equal(body[1].title, 'Cabinet W02');
  assert.deepEqual(danger.map((a) => a.id), ['del', 'gone']);
  assert.equal(kindOf({ kind: 'choice' }), 'choice');
  assert.equal(kindOf({ checked: false }), 'toggle');
  assert.equal(kindOf({}), 'command');
});

test('J1 · a door: the part menu, a small grey group title, and All cabinet actions as a submenu (click, Right opens, Left closes)', async () => {
  const [id] = wardrobes(1);
  P().addDoorsBulk([id]);
  const door = (P().unitResult(id)?.panels || []).find((p) => p.part === 'FRONT');
  assert.ok(door, 'the wardrobe has no door to click');
  U().selectUnit(id);
  const view = await mount(React.createElement(ContextMenu));
  await openOn(id, { panelId: door.id, part: 'FRONT' });
  const head = one(view.root, by('data-menu-header', '1'));
  assert.match(textOf(head), /^Door /);
  const title = one(view.root, by('data-menu-group-title', '1'));
  assert.ok(title, 'no group title');
  assert.match(textOf(title), /^Cabinet /);
  assert.match(cls(title), /text-\[11px\]/);
  assert.match(cls(title), /\buppercase\b/);
  assert.match(cls(title), /\btext-ink-400\b/);
  const row = entry(view.root, 'cabinet-actions');
  assert.equal(row.props['data-menu-kind'], 'submenu');
  assert.equal(row.props['aria-haspopup'], 'menu');
  assert.equal(row.props['aria-expanded'], false);
  assert.ok(one(row, (n) => n.type === 'svg'), 'no chevron');
  assert.equal(one(view.root, by('data-context-submenu')), null, 'the submenu is open before it is asked for');
  // Right arrow opens it beside the menu, with the whole cabinet menu in it.
  await key(row, 'ArrowRight');
  let sub = one(view.root, by('data-context-submenu', 'cabinet-actions'));
  assert.ok(sub, 'Right did not open the submenu');
  assert.equal(entry(view.root, 'cabinet-actions').props['aria-expanded'], true);
  assert.match(cls(sub), /w-\[280px\]/);
  assert.ok(entry(sub, 'plinth'), 'the submenu is not the cabinet menu');
  assert.equal(textOf(entry(sub, 'delete')), 'Delete');
  // Left closes it and the menu stays.
  await key(sub, 'ArrowLeft');
  assert.equal(one(view.root, by('data-context-submenu')), null, 'Left did not close the submenu');
  assert.ok(U().contextMenu, 'Left closed the whole menu');
  // A click opens it as well; an entry inside runs and closes everything.
  await click(entry(view.root, 'cabinet-actions'));
  sub = one(view.root, by('data-context-submenu', 'cabinet-actions'));
  assert.ok(sub, 'a click did not open the submenu');
  const before = unitOf(id).params.plinth === true;
  await click(entry(sub, 'plinth'));
  assert.equal(U().contextMenu, null);
  assert.equal(unitOf(id).params.plinth === true, !before, 'the submenu\'s Plinth did nothing');
  await view.unmount();
});

test('J1 · a disabled row is grey, says its reason as its title, and does nothing when clicked', async () => {
  const [id] = wardrobes(1);
  P().setSideInfillEnabled(id, false);
  U().selectUnit(id);
  const view = await mount(React.createElement(ContextMenu));
  await openOn(id);
  const pin = entry(view.root, 'pin-infill-L');
  assert.equal(pin.props['aria-disabled'], 'true');
  assert.match(cls(pin), /\btext-ink-400\b/);
  assert.match(cls(pin), /cursor-not-allowed/);
  assert.match(pin.props.title, /turn them on first/);
  await click(pin);
  assert.ok(U().contextMenu, 'a disabled row closed the menu');
  assert.notEqual(unitOf(id).params.side_infill_left_pinned, true);
  await view.unmount();
});

test('J1 · Escape and a press outside still close it; the header still drags it', async () => {
  const [id] = wardrobes(1);
  U().selectUnit(id);
  const view = await mount(React.createElement(ContextMenu));
  await openOn(id);
  assert.ok(listeners.get('keydown')?.size, 'no Escape listener');
  await React.act(async () => { for (const fn of listeners.get('keydown')) fn({ key: 'Escape' }); });
  assert.equal(U().contextMenu, null);
  await openOn(id);
  await React.act(async () => { for (const fn of [...listeners.get('pointerdown')]) fn({}); });
  assert.equal(U().contextMenu, null);
  await view.unmount();
  const src = read('src/components/ContextMenu.jsx');
  assert.match(src, /onPointerDown=\{startDrag\}/);
  assert.match(src, /if \(e\.key === 'Escape'\) closeContextMenu\(\);/);
});

// ═══ J1 / J2 · WHERE IT STANDS ══════════════════════════════════════════════

test('J2 · placeMenuUnderAnchor: the menu hangs under the button, right edges level; above when below has no room; always on screen', () => {
  const viewport = { width: 1600, height: 1000 };
  const btn = { x: 1500, y: 60, width: 32, height: 32 };
  const a = placeMenuUnderAnchor({ anchor: btn, width: 280, height: 500, viewport });
  assert.equal(a.left + 280, 1532, 'the right edges are not level');
  assert.equal(a.top, 96);
  assert.equal(a.flippedY, false);
  const low = placeMenuUnderAnchor({ anchor: { x: 1500, y: 900, width: 32, height: 32 }, width: 280, height: 500, viewport });
  assert.equal(low.flippedY, true);
  assert.equal(low.top, 900 - 4 - 500);
  const edge = placeMenuUnderAnchor({ anchor: { x: 10, y: 60, width: 32, height: 32 }, width: 280, height: 500, viewport });
  assert.equal(edge.left, 8, 'it ran off the left edge');
  const tall = placeMenuUnderAnchor({ anchor: btn, width: 280, height: 2000, viewport });
  assert.equal(tall.top, 8);
});

test('J1 · placeSubmenu: beside the menu at the row, to the left when the right has no room, slid up off the bottom', () => {
  const viewport = { width: 1600, height: 1000 };
  const menu = { x: 300, y: 100, width: 280, height: 400 };
  const row = { x: 300, y: 380, width: 280, height: 32 };
  const r = placeSubmenu({ menu, row, size: { width: 280, height: 500 }, viewport });
  assert.equal(r.side, 'right');
  assert.equal(r.left, 300 + 280 - 4);
  assert.equal(r.top, 376);
  const l = placeSubmenu({ menu: { ...menu, x: 1300 }, row, size: { width: 280, height: 500 }, viewport });
  assert.equal(l.side, 'left');
  assert.equal(l.left, 1300 - 280 + 4);
  const down = placeSubmenu({ menu, row: { ...row, y: 900 }, size: { width: 280, height: 500 }, viewport });
  assert.equal(down.top, 1000 - 500 - 8);
  // The pointer's own placement is unchanged.
  assert.deepEqual(clampMenuPosition({ x: 100, y: 100, width: 280, height: 300, viewport }),
    { left: 100, top: 100, flippedX: false, flippedY: false });
});

// ═══ J2 · THE ICON AT THE TOP OF THE RIGHT PANEL ════════════════════════════

test('J2 · the "..." icon: an aria-labelled 32 px button (44 px for a finger) that opens the SAME menu for the selection, under it', async () => {
  const ids = wardrobes(3);
  U().selectUnit(ids[0]);
  U().selectUnit(ids[2], { additive: true });
  const btnView = await mount(React.createElement(ActionsMenuButton));
  const btn = one(btnView.root, by('data-menu-icon', '1'));
  assert.ok(btn, 'no icon with a cabinet selected');
  assert.equal(btn.type, 'button');
  assert.equal(btn.props['aria-label'], 'Actions');
  assert.ok(btn.props.title && btn.props.title.length > 0, 'no title');
  assert.equal(btn.props['aria-haspopup'], 'menu');
  assert.match(cls(btn), /\bw-8 h-8\b/);
  assert.match(cls(btn), /\[@media\(pointer:coarse\)\]:w-11/);
  assert.match(cls(btn), /\[@media\(pointer:coarse\)\]:h-11/);
  // A press on the icon does not reach the menu's own "press outside closes".
  let stopped = false;
  btn.props.onPointerDown({ stopPropagation: () => { stopped = true; } });
  assert.ok(stopped);
  RECT = { left: 1500, top: 60, right: 1532, bottom: 92, width: 32, height: 32, x: 1500, y: 60 };
  await click(btn);
  const asked = U().contextMenu;
  assert.equal(asked.unitId, U().selectedUnitId, 'not the primary of the selection');
  assert.equal(asked.from, 'icon');
  assert.deepEqual(asked.anchor, { x: 1500, y: 60, width: 32, height: 32 });
  assert.equal(asked.panelId, null);
  assert.equal(asked.part, null);
  // The menu it opens is the scene's menu, for the two selected, hung under the icon.
  RECT = { left: 0, top: 0, right: 280, bottom: 500, width: 280, height: 500, x: 0, y: 0 };
  const view = await mount(React.createElement(ContextMenu));
  const box = one(view.root, by('data-context-menu', '1'));
  assert.equal(textOf(one(box, by('data-menu-header', '1'))), '2 cabinets selected');
  const want = placeMenuUnderAnchor({ anchor: asked.anchor, width: 280, height: 500, viewport: { width: 1600, height: 1000 } });
  assert.equal(box.props.style.left, want.left);
  assert.equal(box.props.style.top, want.top);
  assert.ok(entry(box, 'plinth'));
  assert.equal(textOf(entry(box, 'delete')), 'Delete 2 cabinets');
  // A second press on the icon closes it.
  await click(one(btnView.root, by('data-menu-icon', '1')));
  assert.equal(U().contextMenu, null);
  await view.unmount();
  await btnView.unmount();
  // Nothing selected: nothing to act on, no icon.
  U().clearSelection();
  const empty = await mount(React.createElement(ActionsMenuButton));
  assert.equal(one(empty.root, by('data-menu-icon', '1')), null);
  await empty.unmount();
  RECT = { left: 0, top: 0, right: 280, bottom: 600, width: 280, height: 600, x: 0, y: 0 };
});

test('J2 · menuFromButton is the scene\'s request plus the button\'s rectangle', () => {
  assert.deepEqual(menuFromButton('u7', { left: 10, top: 20, width: 32, height: 32 }), {
    x: 42, y: 52, unitId: 'u7', panelId: null, part: null, drawer: null, from: 'icon',
    anchor: { x: 10, y: 20, width: 32, height: 32 },
  });
});

test('J2 · the icon stands in the right panel\'s header for one cabinet and for several, never in the CNC view', () => {
  const host = read('src/components/studio/InspectorHost.jsx');
  assert.match(host, /import \{ ActionsMenuButton \} from '\.\.\/ContextMenu\.jsx';/);
  assert.match(host, /\{menu \? <ActionsMenuButton \/> : null\}/);
  assert.match(host, /headerActions=\{<HostActions pinned=\{pinned\} menu=\{shows === 'one' \|\| shows === 'several'\} \/>\}/);
  assert.match(host, /if \(viewMode === 'cnc'\) shows = 'cnc';/);
  // The several cabinets panel draws the host's actions in its own header, before its x.
  const multi = read('src/components/MultiUnitPanel.jsx');
  assert.match(multi, /\{headerActions\}\n\s+<button type="button" className="cc-btn-ghost" title="Close" onClick=\{onClose\}>/);
  // …and the one cabinet panel in its header, after the name.
  assert.match(read('src/components/RightPanel.jsx'), /<span className="flex-1" \/>\n\s+\{actions\}/);
});

// ═══ J3 · THE MAC ═══════════════════════════════════════════════════════════

test('J3 · isMacLike: a Mac and an iPad (both names it has used), not Windows, not Linux, not a missing navigator', () => {
  assert.equal(platform.isMacLike({ platform: 'MacIntel' }), true);
  assert.equal(platform.isMacLike({ platform: 'iPad' }), true);
  assert.equal(platform.isMacLike({ platform: 'iPhone' }), true);
  assert.equal(platform.isMacLike({ userAgentData: { platform: 'macOS' }, platform: '' }), true);
  assert.equal(platform.isMacLike({ platform: 'Win32' }), false);
  assert.equal(platform.isMacLike({ userAgentData: { platform: 'Windows' } }), false);
  assert.equal(platform.isMacLike({ platform: 'Linux x86_64' }), false);
  assert.equal(platform.isMacLike(null), false);
});

test('J3 · on a Mac only Cmd adds and Ctrl+click is the menu alone; on Windows and Linux Ctrl adds as before', () => {
  const ctrl = { ctrlKey: true };
  const cmd = { metaKey: true };
  const none = {};
  // Mac.
  assert.equal(platform.additiveClick(ctrl, ctrl, true), false, 'Ctrl added on a Mac');
  assert.equal(platform.additiveClick(cmd, cmd, true), true, 'Cmd did not add on a Mac');
  assert.equal(platform.menuOnlyClick(ctrl, ctrl, true), true);
  assert.equal(platform.menuOnlyClick({ ctrlKey: true, metaKey: true }, {}, true), false);
  assert.equal(platform.menuOnlyClick(cmd, cmd, true), false);
  // Windows and Linux: unchanged (Ctrl, or the meta key, adds; nothing is menu only).
  assert.equal(platform.additiveClick(ctrl, ctrl, false), true);
  assert.equal(platform.additiveClick(cmd, cmd, false), true);
  assert.equal(platform.additiveClick(none, none, false), false);
  assert.equal(platform.menuOnlyClick(ctrl, ctrl, false), false);
  // The NATIVE event is asked first: react-three-fiber's own event carries no modifier.
  assert.equal(platform.additiveClick({ ctrlKey: true }, {}, false), true);
  assert.equal(platform.additiveClick({ metaKey: true }, {}, true), true);
  // Shift means nothing here (it pulls a free panel off the wall, and only that).
  assert.equal(platform.additiveClick({ shiftKey: true }, {}, false), false);
  assert.equal(platform.additiveClick({ shiftKey: true }, {}, true), false);
});

test('J3 · the scene asks lib/platform.js and no longer reads Ctrl or Cmd itself; Shift keeps its one meaning', () => {
  const view = read('src/3d/UnitView.jsx');
  assert.doesNotMatch(view, /native\.ctrlKey \|\| native\.metaKey/, 'a modifier is still read by hand');
  assert.match(view, /import \{\n\s+additiveClick, isTouchPress, menuOnlyClick, startLongPress, swallowClickAfterRelease,\n\} from '\.\.\/lib\/platform\.js';/);
  // The cabinet's press: the platform's hand, or "Select several".
  assert.match(view, /const native = e\.nativeEvent \|\| e;\n\s+const additive = additiveClick\(native, e\) \|\| useUiStore\.getState\(\)\.selectSeveral === true;\n\s+onSelect\(\{ additive \}\);\n\s+if \(additive\) return;/);
  // The piece's press: the platform's hand.
  assert.match(view, /const native = e\.nativeEvent \|\| e;\n\s+const additive = additiveClick\(native, e\);\n\s+if \(additive\) \{/);
  // A Mac's Ctrl+click does nothing on the press, before anything else reads it.
  const press = view.indexOf('THE RIGHT-CLICK MENU TURN, J3: CTRL+CLICK ON A MAC');
  assert.ok(press > 0);
  const body = view.slice(press, press + 900);
  assert.match(body, /if \(menuOnlyClick\(e\.nativeEvent \|\| e, e\)\) return;\n\s+if \(edgeHandleBehind\(e\)\) return;/);
  // The right click itself is as it was: it selects a cabinet outside the set, then opens the menu.
  assert.match(view, /if \(!selected\) onSelect\(\);\n\s+if \(onContextMenu\) \{\n\s+onContextMenu\(\{/);
  // Shift: the free panel off the wall, unchanged.
  assert.match(view, /shiftKey: Boolean\(native\.shiftKey \|\| e\.shiftKey\),/);
});

// ═══ J4 · THE IPAD ══════════════════════════════════════════════════════════

/** A target with listeners, and timers that the test runs by hand. */
function rig() {
  const target = new EventTarget();
  const queue = [];
  const timers = {
    set: (fn, ms) => { const t = { fn, ms, live: true }; queue.push(t); return t; },
    clear: (t) => { if (t) t.live = false; },
  };
  const run = () => { for (const t of queue.splice(0)) if (t.live) t.fn(); };
  const send = (type, props = {}) => target.dispatchEvent(Object.assign(new Event(type), props));
  return {
    target, timers, run, send, queue,
  };
}

test('J4 · a finger held still for 0.5 s opens the menu once, at the finger', () => {
  assert.equal(platform.LONG_PRESS_MS, 500);
  assert.equal(platform.LONG_PRESS_SLOP_PX, 8);
  const r = rig();
  const fired = [];
  platform.startLongPress({
    x: 100, y: 200, pointerId: 7, target: r.target, timers: r.timers, onFire: (at) => fired.push(at),
  });
  assert.equal(r.queue[0].ms, 500);
  r.send('pointermove', { pointerId: 7, clientX: 105, clientY: 204 }); // under 8 px: still holding
  r.run();
  assert.deepEqual(fired, [{ x: 100, y: 200 }]);
  r.run();
  assert.equal(fired.length, 1);
});

test('J4 · a tap stays a tap: a lift, a cancel, 8 px of travel or a second finger before 0.5 s open nothing', () => {
  for (const [why, act] of [
    ['lifted', (r) => r.send('pointerup', { pointerId: 1 })],
    ['cancelled', (r) => r.send('pointercancel', { pointerId: 1 })],
    ['travelled 8 px', (r) => r.send('pointermove', { pointerId: 1, clientX: 108, clientY: 100 })],
    ['a second finger', (r) => r.send('pointerdown', { pointerId: 2, clientX: 300, clientY: 300 })],
  ]) {
    const r = rig();
    let fired = 0;
    platform.startLongPress({
      x: 100, y: 100, pointerId: 1, target: r.target, timers: r.timers, onFire: () => { fired += 1; },
    });
    // The arming press itself reaching the target (it bubbles on) is not a second finger.
    r.send('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
    act(r);
    r.run();
    assert.equal(fired, 0, `it fired though the finger ${why}`);
  }
});

test('J4 · one press arms one long press: the boards behind the touched one do not arm a second', () => {
  const r = rig();
  let fired = 0;
  const args = {
    x: 0, y: 0, pointerId: 9, target: r.target, timers: r.timers, onFire: () => { fired += 1; },
  };
  platform.startLongPress(args);
  platform.startLongPress(args);
  r.run();
  assert.equal(fired, 1);
  // Once it has fired the pointer is free again for the next press.
  platform.startLongPress(args);
  r.run();
  assert.equal(fired, 2);
});

/**
 * A window over a canvas, as the browser runs a click: the window's capture
 * listeners first, then (unless one stopped it) the canvas, where the scene
 * hears it. Written here because node's own EventTarget has no tree.
 */
function windowOverCanvas() {
  const capture = new Set();
  const plain = new Map();
  const win = {
    addEventListener(type, fn, cap) { if (cap) capture.add([type, fn]); else plain.set(fn, type); },
    removeEventListener(type, fn, cap) {
      if (cap) { for (const e of capture) if (e[0] === type && e[1] === fn) capture.delete(e); } else plain.delete(fn);
    },
  };
  let canvasHeard = 0;
  const send = (type) => {
    let stopped = false;
    const event = { type, stopPropagation: () => { stopped = true; }, stopImmediatePropagation: () => { stopped = true; }, preventDefault() {} };
    for (const [t, fn] of [...capture]) if (t === type && !stopped) fn(event);
    if (!stopped && type === 'click') canvasHeard += 1;
  };
  return { win, send, heard: () => canvasHeard, listening: () => capture.size };
}

test('J4 · the click the lift brings after the menu opened is swallowed once, before the scene hears it, and only once', () => {
  const queue = [];
  const timers = { set: (fn) => { const t = { fn, live: true }; queue.push(t); return t; }, clear: (t) => { if (t) t.live = false; } };
  const w = windowOverCanvas();
  platform.swallowClickAfterRelease({ target: w.win, timers });
  assert.equal(w.listening(), 2, 'the guard is not listening at the window');
  w.send('pointerup');
  w.send('click');
  assert.equal(w.heard(), 0, 'the lift\'s click reached the scene');
  w.send('click');
  assert.equal(w.heard(), 1, 'a later click was swallowed too');
  assert.equal(w.listening(), 0, 'the guard was left behind');
  // A click that never comes leaves nothing behind: the guard goes after the lift.
  const w2 = windowOverCanvas();
  queue.length = 0;
  platform.swallowClickAfterRelease({ target: w2.win, timers });
  w2.send('pointerup');
  for (const t of queue.splice(0)) if (t.live) t.fn();
  assert.equal(w2.listening(), 0);
  w2.send('click');
  assert.equal(w2.heard(), 1);
});

test('J4 · only a finger or a pen arms it; a mouse has its right button', () => {
  assert.equal(platform.isTouchPress({ pointerType: 'touch' }), true);
  assert.equal(platform.isTouchPress({ pointerType: 'pen' }), true);
  assert.equal(platform.isTouchPress({ pointerType: 'mouse' }), false);
  assert.equal(platform.isTouchPress({}), false);
  assert.equal(platform.isTouchLike({ matchMedia: () => ({ matches: true }) }), true);
  assert.equal(platform.isTouchLike({ matchMedia: () => ({ matches: false }) }), false);
  assert.equal(platform.isTouchLike(null), false);
});

test('J4 · the scene: every board arms the long press, which opens the SAME menu at the finger; the browser\'s touch menu is not a second road', () => {
  const view = read('src/3d/UnitView.jsx');
  const at = view.indexOf('const armLongPress = (e, p) => {');
  assert.ok(at > 0, 'no long press in the scene');
  const fn = view.slice(at, at + 1400);
  assert.match(fn, /if \(!onContextMenu \|\| !isTouchPress\(native\)\) return;/);
  assert.match(fn, /startLongPress\(\{/);
  assert.match(fn, /window\.dispatchEvent\(new window\.PointerEvent\('pointercancel', \{ pointerId: native\.pointerId \}\)\);/);
  assert.match(fn, /swallowClickAfterRelease\(\);/);
  assert.match(fn, /if \(!ui\.selectedUnitIds\.includes\(unit\.id\)\) onSelect\(\{ additive: ui\.selectSeveral === true \}\);/);
  assert.match(fn, /onContextMenu\(\{\n\s+x,\n\s+y,\n\s+panelId: p\.id,\n\s+part: p\.part,/);
  // Armed on the press, before the piece or the cabinet takes it.
  assert.match(view, /armLongPress\(e, p\);\n\s+if \(useUiStore\.getState\(\)\.selectSeveral === true\) \{ startDrag\(e\); return; \}\n\s+if \(isElement\) \{/);
  // The menu event a touch screen sends by itself is ignored (the hold opened it).
  assert.match(view, /e\.nativeEvent\?\.preventDefault\?\.\(\);\n(\s+\/\/.*\n)+\s+if \(isTouchPress\(e\.nativeEvent \|\| e\)\) return;/);
  // The scene's own open call is the one the right click has always used.
  assert.match(read('src/3d/Scene.jsx'), /onContextMenu=\{\(menu\) => openContextMenu\(\{ \.\.\.menu, unitId: unit\.id \}\)\}/);
});

test('J4 · Select several: one yes or no in the store, off by default, changing no selection by itself', () => {
  fresh();
  const ids = wardrobes(2);
  U().selectUnit(ids[0]);
  assert.equal(U().selectSeveral, false);
  U().toggleSelectSeveral();
  assert.equal(U().selectSeveral, true);
  assert.deepEqual(U().selectedUnitIds, [ids[0]], 'switching it on moved the selection');
  // While it is on, the scene's press is the tick Ctrl+click is: the second cabinet joins.
  U().selectUnit(ids[1], { additive: U().selectSeveral });
  assert.deepEqual(U().selectedUnitIds, [ids[0], ids[1]]);
  U().selectUnit(ids[0], { additive: U().selectSeveral });
  assert.deepEqual(U().selectedUnitIds, [ids[1]], 'a second touch did not take it out');
  U().setSelectSeveral(false);
  assert.equal(U().selectSeveral, false);
  assert.deepEqual(U().selectedUnitIds, [ids[1]], 'switching it off moved the selection');
  U().setSelectSeveral('yes');
  assert.equal(U().selectSeveral, false, 'only true switches it on');
});

// ═══ THE TEAM'S RULES ON THIS SLICE ═════════════════════════════════════════

test('the new files open with the Skylon header; nothing this slice wrote carries an em or en dash or the word worker', () => {
  for (const f of ['src/lib/platform.js', 'test/menu-ui.test.js']) {
    assert.ok(read(f).startsWith('/*\n * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.\n'), `${f} has no Skylon header`);
    assert.ok(!read(f).includes(EM) && !read(f).includes(EN), `${f} carries a dash`);
    assert.doesNotMatch(read(f).replace(/the word worker/g, ''), /\bworker\b/i);
  }
  // The slice's own blocks in the shared files: from their first line to the end of the block.
  const menu = read('src/components/ContextMenu.jsx');
  const rows = menu.slice(menu.indexOf('// ─── THE RIGHT-CLICK MENU TURN, J1: THE ROWS'));
  assert.ok(rows.length > 1000);
  assert.ok(!rows.includes(EM) && !rows.includes(EN), 'a dash in the menu\'s new rows');
  const place = read('src/lib/menuPlacement.js');
  const mine = place.slice(place.indexOf('// THE RIGHT-CLICK MENU TURN (01.11.2026), J1 and J2.'), place.indexOf('/**\n * One axis of it.'));
  assert.ok(mine.length > 500 && !mine.includes(EM) && !mine.includes(EN));
  const ui = read('src/stores/uiStore.js');
  const flag = ui.slice(ui.indexOf('THE RIGHT-CLICK MENU TURN (01.11.2026), J4: SELECT SEVERAL'), ui.indexOf('  clearSelection: () => {'));
  assert.ok(flag.length > 200 && !flag.includes(EM) && !flag.includes(EN));
});
