/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F14 . THE OLD WINDOW, READ ONLY FOR ONE TURN. The owner, 01.11.2026: *"zgadzam sie z Ola i Kamilem"* (the
// old window's deletion and the export wait for T-CC2b). The Assign materials window driven the way the client clicks
// it (the small renderer of test/turn-cc2a-f08-window.test.js, React's own reconciler): the banner and its button;
// every control pressed, the blob as saved; the door "Assign materials..." still on the rail.
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
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { default: createReconciler } = await import('react-reconciler');
const { ConcurrentRoot, DefaultEventPriority, NoEventPriority } = await import('react-reconciler/constants.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { useMaterialAssignmentStore } = await import('../src/stores/materialAssignmentStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const { default: AssignMaterialsModal, READ_ONLY_WORDS } = await import('../src/components/AssignMaterialsModal.jsx');
const { default: RailMenu } = await import('../src/components/studio/RailMenus.jsx');

// ── a small renderer: React's own reconciler over plain objects, so a click is the button's own onClick ──
let prio = NoEventPriority;
const RECT = { left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0 };
const host = (type, props) => ({
  type, props, children: [], parent: null, style: {}, isConnected: true,
  getBoundingClientRect: () => RECT, getClientRects: () => [RECT], focus() {}, blur() {}, scrollTo() {},
  contains: () => false, querySelectorAll: () => [], closest: () => null, getAttribute: () => null,
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
globalThis.window = globalThis.window || {
  innerWidth: 1600, innerHeight: 1000, addEventListener() {}, removeEventListener() {},
};
globalThis.document = globalThis.document || {
  activeElement: null, addEventListener() {}, removeEventListener() {}, body: {},
};
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} disconnect() {} unobserve() {} };
// The decor pack is already in the registry (above); the window's own fetch of it never answers here.
globalThis.fetch = () => new Promise(() => {});

async function mount(element) {
  const root = host('#root', {});
  const c = R.createContainer(root, ConcurrentRoot, null, false, null, '', () => {}, () => {}, () => {}, null);
  await React.act(async () => { R.updateContainer(element, c, null, null); });
  return { root, unmount: () => React.act(async () => { R.updateContainer(null, c, null, null); }) };
}
const all = (n, pred, out = []) => {
  if (n.type !== '#text' && n !== null && pred(n)) out.push(n);
  for (const k of n.children || []) all(k, pred, out);
  return out;
};
const one = (n, pred) => all(n, pred)[0] || null;
const textOf = (n) => (n.type === '#text' ? n.text : (n.children || []).map(textOf).join(' ')).replace(/\s+/g, ' ');
const by = (attr, value) => (n) => n.props?.[attr] !== undefined && (value === undefined || String(n.props[attr]) === String(value));
const ev = (n) => ({
  preventDefault() {}, stopPropagation() {}, currentTarget: n, target: { value: '' }, button: 0,
});
const click = (n) => React.act(async () => { n.props.onClick?.(ev(n)); });
const type = (n, value) => React.act(async () => { n.props.onChange?.({ ...ev(n), target: { value, checked: value } }); });
const flush = () => React.act(async () => { await new Promise((r) => setTimeout(r, 0)); });

const OWNER = JSON.parse(readFileSync(new URL('./fixtures/owner-projects/0003-black-kitchen-31.10.2026.ccproject', import.meta.url), 'utf8'));
const BLOB = {
  schema: 3,
  base: { carcase_side: { material_id: '5e0c4b1a-7f2d-4c3e-9a8b-000000000001', yield: 1.1 } },
  overrides: {},
  customParts: [{ id: 'cp_dowels', name: 'Dowels 8 x 40', unit: 'pcs', qtyPerUnit: 12 }],
  auto: {},
  hardware: { 'hinges|Clip top 110': { material_id: '5e0c4b1a-7f2d-4c3e-9a8b-000000000005' } },
};
const blobNow = () => JSON.stringify(useMaterialAssignmentStore.getState().data);

function openJob() {
  useProjectStore.getState().loadProject({ ...JSON.parse(JSON.stringify(OWNER.project)), id: 'old-window', assignments: BLOB }, JSON.parse(JSON.stringify(OWNER.units)));
  useUiStore.setState({ modal: 'assign-materials', modalArgs: null, modalStack: [] });
}

test('F14.1 · the banner says the window is replaced and read only, with "Open Link materials"', () => {
  openJob();
  assert.equal(READ_ONLY_WORDS, 'Replaced by Link materials. This window is read only until the next update.');
  const html = renderToStaticMarkup(React.createElement(AssignMaterialsModal));
  assert.ok(html.includes(READ_ONLY_WORDS), 'the banner');
  assert.match(html, /data-assign-open-link="1"[^>]*>Open Link materials</);
  assert.match(html, /data-assign-read-only="1"/);
  // The lists stay visible: the demand table and the stock column are drawn.
  assert.match(html, /data-assign-materials="1"/);
});

test('P2 · read only, the old window\'s count is grey: the only red count is the BOM\'s', () => {
  openJob();
  const html = renderToStaticMarkup(React.createElement(AssignMaterialsModal));
  const head = html.match(/<div class="([^"]*)" data-assign-counter="(\d+)"[^>]*data-assign-counter-tone="([a-z]+)"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(head, 'the header count is drawn');
  assert.ok(Number(head[2]) > 0, 'the owner project has lines not assigned');
  assert.equal(head[3], 'grey');
  assert.doesNotMatch(head[1], /status-danger/, 'no red box');
  assert.doesNotMatch(head[4], /status-danger/, 'no red words');
  assert.match(head[4], /Not assigned materials: \d+ lines?/, 'the words stay, readable');
});

test('F14.2 · every control of the window pressed: the blob stays as saved; "Open Link materials" opens the new window', async () => {
  openJob();
  const before = blobNow();
  const { root, unmount } = await mount(React.createElement(AssignMaterialsModal));
  await flush();
  assert.equal(blobNow(), before, 'opening the window writes nothing (no automatics, no schema adoption)');
  const open = one(root, by('data-assign-open-link', '1'));
  assert.ok(open, 'the button is drawn');
  const controls = all(root, (n) => (n.type === 'button' || n.type === 'input' || n.type === 'select' || n.type === 'tr' || n.type === 'td')
    && (typeof n.props?.onClick === 'function' || typeof n.props?.onChange === 'function') && n !== open);
  assert.ok(controls.length > 5, `the window has controls to press (${controls.length})`);
  let pressed = 0;
  for (const n of controls) {
    if (!n.isConnected) continue;
    if (n.props.onClick) { await click(n); pressed += 1; }
    if (n.props.onChange) { await type(n, n.type === 'input' ? '2' : 'x'); pressed += 1; }
    assert.equal(blobNow(), before, `a control changed the blob: ${n.type} ${JSON.stringify(Object.keys(n.props).filter((k) => k.startsWith('data-')))}`);
  }
  assert.ok(pressed > 5);
  // The assign, clear, automatics and family controls are disabled where they are drawn.
  for (const n of all(root, (x) => x.props?.['data-assign-auto-run'] !== undefined || x.props?.['data-custom-add'] !== undefined)) {
    assert.equal(n.props.disabled, true, 'disabled');
  }
  await click(open);
  assert.equal(useUiStore.getState().modal, 'link-materials', 'Open Link materials opens the window that replaced this one');
  assert.equal(blobNow(), before);
  await unmount();
});

test('F14.2 · the door "Assign materials..." is still on the rail, below "Link materials..."', () => {
  useUiStore.setState({ selectedUnitIds: [] });
  const html = renderToStaticMarkup(React.createElement(RailMenu, { kind: 'materials', anchor: { x: 0, y: 0 }, onClose: () => {} }));
  const rows = [...html.matchAll(/data-item="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(rows.indexOf('link-materials') === 0, rows.join(','));
  assert.ok(rows.indexOf('assign-materials') > rows.indexOf('link-materials'), rows.join(','));
  assert.ok(html.includes('Assign materials…'));
});
