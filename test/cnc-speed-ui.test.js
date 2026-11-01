/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// CNC SPEED, THE INTERFACE HALF (01.11.2026, the owner: *"1 - ok, 2 - ok, 3 - ok, 4 - ok"*; J5 21:43:
// *"nie no po co w widoku cnc nam pasek 3d etc?"*). Measured on the owner's Black Kitchen: a wheel step
// 2.7 to 3.6 s, a hover 1.2 to 1.6 s, a short pan 9 s, nearly all of it the label anchors of every part
// asked again on every render of the CNC sheet (components/CncView.jsx Part).
//   J1  the anchors of a part are asked once per panel and label size: a zoom, a pan, a hover and a
//       return to the sheet ask for nothing new (counted, the sheet driven the way the hand drives it);
//   J2  the BOM's red warning reads the ONE shared Check (lib/checkFindings.js), the same findings;
//   J3  under the CNC sheet the hidden room draws no beat; under an editor window it keeps its slow
//       beat; leaving the sheet draws the room at once;
//   J4  the Check's triangles over the cabinets are not drawn on the CNC sheet;
//   J5  on the CNC sheet the scene toggles are not mounted and the camera bar keeps Drawings... alone.
// React's own reconciler over plain objects (the small renderer of turn-cc2a-f10); the calls are
// counted by a loader hook that wraps the very functions the sheet imports, nothing in src/ is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

const ESB = new URL('../node_modules/esbuild/lib/main.js', import.meta.url).href;
register(`data:text/javascript,${encodeURIComponent(`
import esb from '${ESB}';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// The functions counted, by the file that imports them and the module it imports them from.
const COUNT = {
  'src/components/CncView.jsx': { '../engine/cnc/labelAnchor.js': ['labelAnchors'], '../engine/cnc/dxf.js': ['panelLabelBlock'] },
};
const FAKE = {
  'src/3d/frameDemand.jsx': {
    '@react-three/fiber': 'export const useThree = (pick) => pick(globalThis.__three); export const useFrame = (fn) => { globalThis.__three.frame = fn; };',
  },
  'src/components/studio/UnitIssueMarker.jsx': {
    '@react-three/drei': 'export const Html = ({ children }) => children;',
  },
};
const of = (table, parent) => Object.entries(table).find(([file]) => parent && parent.split('?')[0].endsWith(file))?.[1];
export async function resolve(specifier, context, next) {
  const fake = of(FAKE, context.parentURL)?.[specifier];
  if (fake) return { url: 'data:text/javascript,' + encodeURIComponent(fake), shortCircuit: true };
  const names = of(COUNT, context.parentURL)?.[specifier];
  if (names) {
    const real = await next(specifier, context);
    return { ...real, url: real.url + '?count=' + names.join(','), shortCircuit: true };
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  const [path, query = ''] = url.split('?');
  if (query.startsWith('count=')) {
    const names = query.slice(6).split(',');
    const source = ['import * as real from ' + JSON.stringify(path) + ';', 'export * from ' + JSON.stringify(path) + ';']
      .concat(names.map((n) => 'export function ' + n + '(...a) { const c = globalThis.__calls; c[' + JSON.stringify(n) + '] = (c[' + JSON.stringify(n) + '] || 0) + 1; return real.' + n + '(...a); }'))
      .join('\\n');
    return { format: 'module', source, shortCircuit: true };
  }
  if (path.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  if (path.endsWith('.jsx')) {
    const file = fileURLToPath(path);
    const { code } = esb.transformSync(readFileSync(file, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: file });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return next(url, context);
}`)}`, import.meta.url);

globalThis.__calls = {};
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
globalThis.fetch = () => new Promise(() => {});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = globalThis.window || {
  innerWidth: 1600, innerHeight: 1000, location: { search: '', hash: '' }, addEventListener() {}, removeEventListener() {},
};
globalThis.document = globalThis.document || {
  hidden: false, activeElement: null, addEventListener() {}, removeEventListener() {}, body: {},
};
// The sheet measures its own box (lib/sheetView.js useElementSize): it is handed one, at once.
const SHEET_PX = { width: 1200, height: 800 };
globalThis.ResizeObserver = class {
  constructor(cb) { this.cb = cb; }
  observe() { this.cb([{ contentRect: SHEET_PX }]); }
  disconnect() {}
  unobserve() {}
};

const React = await import('react');
const { default: createReconciler } = await import('react-reconciler');
const { ConcurrentRoot, DefaultEventPriority, NoEventPriority } = await import('react-reconciler/constants.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const { useMaterialLinkStore } = await import('../src/stores/materialLinkStore.js');
const { useCheckFindings } = await import('../src/lib/checkFindings.js');
const { migrateRoom, rectCorners } = await import('../src/engine/room.js');
const { default: CncView } = await import('../src/components/CncView.jsx');
const { default: BomPanel } = await import('../src/components/BomPanel.jsx');
const { default: FrameDemand } = await import('../src/3d/frameDemand.jsx');
const { default: UnitIssueMarker } = await import('../src/components/studio/UnitIssueMarker.jsx');
const { default: CameraBar } = await import('../src/components/studio/CameraBar.jsx');

// ── a small renderer: React's own reconciler over plain objects, so a press is the element's own handler ──
let prio = NoEventPriority;
const RECT = { left: 0, top: 0, right: SHEET_PX.width, bottom: SHEET_PX.height, width: SHEET_PX.width, height: SHEET_PX.height, x: 0, y: 0 };
const host = (type, props) => ({
  type, props, children: [], parent: null, style: {}, isConnected: true, listeners: {},
  getBoundingClientRect: () => RECT, getClientRects: () => [RECT], focus() {}, blur() {}, scrollTo() {},
  contains: () => false, querySelectorAll: () => [], closest: () => null, getAttribute: () => null,
  addEventListener(name, fn) { this.listeners[name] = fn; },
  removeEventListener(name, fn) { if (this.listeners[name] === fn) delete this.listeners[name]; },
  setPointerCapture() {}, releasePointerCapture() {},
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

async function mount(element) {
  const root = host('#root', {});
  const c = R.createContainer(root, ConcurrentRoot, null, false, null, '', () => {}, () => {}, () => {}, null);
  await React.act(async () => { R.updateContainer(element, c, null, null); });
  return { root, unmount: () => React.act(async () => { R.updateContainer(null, c, null, null); }) };
}
const all = (n, pred, out = []) => {
  if (n && n.type !== '#text' && pred(n)) out.push(n);
  for (const k of n?.children || []) all(k, pred, out);
  return out;
};
const one = (n, pred) => all(n, pred)[0] || null;
const textOf = (n) => (n.type === '#text' ? n.text : (n.children || []).map(textOf).join(' ')).replace(/\s+/g, ' ');
const by = (attr, value) => (n) => n.props?.[attr] !== undefined && (value === undefined || String(n.props[attr]) === String(value));
const act = (fn) => React.act(async () => { await fn(); });
const calls = (name) => globalThis.__calls[name] || 0;
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();

/** A kitchen with a pair of carcasses 10 mm apart (Check #11, red), a tall wardrobe and a wall unit. */
function kitchen() {
  useUiStore.setState({
    modal: null, modalArgs: null, modalStack: [], cncHiddenUnits: {}, cncHiddenParts: {}, cncFocusPart: null,
  });
  store().loadProject({
    id: null, name: 'cnc-speed', room: migrateRoom({ height: 2700, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
  const a = store().addUnit('BUD', { wall: 0, x: 1200 });
  const b = store().addUnit('BUD', { wall: 0, x: 1810 });
  const w = store().addUnit('WARDROBE', { wall: 0, x: 100 });
  store().updateUnitParams(w.id, { width: 900, height: 2460, doors: { count: 2 } });
  store().addShelves(w.id, 1);
  const t = store().addUnit('BUDTALL', { wall: 0, x: 3000 });
  for (const u of [a, b, w, t]) assert.ok(u?.id, `a unit stands: ${u?.error || ''}`);
  return { a: a.id, b: b.id, w: w.id, t: t.id };
}

// ═══ J1 · THE ANCHORS, ONCE PER PANEL AND LABEL ════════════════════════════════

test('J1 · a zoom, a pan, a hover and a return to the sheet ask no part for its anchors again', async () => {
  kitchen();
  ui().setViewMode('cnc');
  const before = { anchors: calls('labelAnchors'), labels: calls('panelLabelBlock') };
  const view = await mount(React.createElement(CncView, { onExportDxfZip: () => {} }));
  const svg = one(view.root, (n) => n.type === 'svg');
  assert.ok(svg, 'the sheet is drawn');
  const parts = all(view.root, by('data-cnc-part'));
  assert.ok(parts.length > 10, `the kitchen's parts are on the sheet (${parts.length})`);
  const seen = calls('labelAnchors') - before.anchors;
  // Each part asks once for its caption and once for its note, whatever the sheet re-rendered on the way in.
  assert.ok(seen > 0 && seen <= parts.length * 2, `the first drawing asks each part at most twice (${seen} for ${parts.length})`);
  const box0 = svg.props.viewBox;

  /** One gesture: the anchors asked during it, and the label blocks (one per part render, so the parts DID render). */
  const during = async (gesture) => {
    const a0 = calls('labelAnchors');
    const l0 = calls('panelLabelBlock');
    await act(gesture);
    return { anchors: calls('labelAnchors') - a0, renders: calls('panelLabelBlock') - l0 };
  };
  const wheel = (deltaY) => svg.listeners.wheel({
    deltaY, clientX: SHEET_PX.width * 0.4, clientY: SHEET_PX.height * 0.4, preventDefault() {},
  });

  // The wheel, in and out about one point: the sheet re-renders every part, the anchors are not asked.
  // (A step that shows or hides a label asks that part once for its new label size, never again: the
  // first pair of steps visits both zooms, every later step finds them.)
  await during(() => wheel(-120));
  await during(() => wheel(120));
  for (const deltaY of [-120, 120, -120, 120]) {
    const step = await during(() => wheel(deltaY));
    assert.ok(step.renders >= parts.length, `the zoom re-rendered the parts (${step.renders})`);
    assert.equal(step.anchors, 0, `a zoom step asked ${step.anchors} anchors`);
  }
  assert.notEqual(svg.props.viewBox, box0, 'the wheel moved the view');

  // A pan: armed, past the threshold, four moves, released.
  const pan = await during(async () => {
    svg.props.onPointerDown({ button: 0, clientX: 400, clientY: 300, pointerId: 1, currentTarget: svg });
    for (let i = 1; i <= 4; i += 1) {
      svg.props.onPointerMove({ clientX: 400 + 20 * i, clientY: 300 + 10 * i, pointerId: 1, currentTarget: svg });
    }
    svg.props.onPointerUp?.({ clientX: 480, clientY: 340, pointerId: 1, currentTarget: svg });
  });
  assert.ok(pan.renders >= parts.length, `the pan re-rendered the parts (${pan.renders})`);
  assert.equal(pan.anchors, 0, `a pan asked ${pan.anchors} anchors`);

  // A hover over a machined feature: the rollover shows, nothing is asked.
  const feature = one(view.root, (n) => n.props?.['data-cnc-feature'] !== undefined && typeof n.props.onPointerEnter === 'function');
  assert.ok(feature, 'a feature to hover');
  const hover = await during(() => feature.props.onPointerEnter({ clientX: 500, clientY: 300 }));
  assert.ok(one(view.root, by('data-cnc-rollover')), 'the rollover is up');
  assert.ok(hover.renders >= parts.length, `the hover re-rendered the parts (${hover.renders})`);
  assert.equal(hover.anchors, 0, `a hover asked ${hover.anchors} anchors`);
  const away = await during(() => feature.props.onPointerLeave({}));
  assert.equal(away.anchors, 0);

  // Leaving the sheet and coming back: the same panels, the anchors they already have.
  await view.unmount();
  let again = null;
  const back = await during(async () => { again = await mount(React.createElement(CncView, { onExportDxfZip: () => {} })); });
  assert.ok(back.renders >= parts.length, 'the sheet is drawn again');
  assert.equal(back.anchors, 0, `the return asked ${back.anchors} anchors`);
  await again.unmount();
});

test('J1 · a changed part is a new panel and is asked again; the sheet draws the same words in the same place', async () => {
  const ids = kitchen();
  ui().setViewMode('cnc');
  const view = await mount(React.createElement(CncView, { onExportDxfZip: () => {} }));
  const labels = () => all(view.root, by('data-part-label')).map((n) => `${n.props['data-part-label']}@${n.props.x},${n.props.y}`);
  const first = labels();
  assert.ok(first.length > 0);
  const width = store().units.find((u) => u.id === ids.t).params.width;
  const a0 = calls('labelAnchors');
  await act(() => store().updateUnitParams(ids.t, { width: width + 50 }));
  assert.ok(calls('labelAnchors') > a0, 'the widened cabinet\'s parts are new panels and are asked');
  assert.notDeepEqual(labels(), first, 'the widened cabinet moved its captions');
  // Back to its width: new panels again, asked again, and every caption where it stood (never a stale anchor).
  const a1 = calls('labelAnchors');
  await act(() => store().updateUnitParams(ids.t, { width }));
  assert.ok(calls('labelAnchors') > a1);
  assert.deepEqual(labels(), first);
  await view.unmount();
});

test('J1 · on the owner\'s Black Kitchen (31.10.2026, the job of the diagnosis): a wheel step, a pan and a hover ask nothing', async () => {
  const file = JSON.parse(read('test/fixtures/owner-projects/0003-black-kitchen-31.10.2026.ccproject'));
  useUiStore.setState({ modal: null, modalArgs: null, modalStack: [], cncHiddenUnits: {}, cncHiddenParts: {}, cncFocusPart: null });
  store().loadProject(JSON.parse(JSON.stringify(file.project)), JSON.parse(JSON.stringify(file.units)));
  assert.equal(store().units.length, 10, 'the owner\'s ten units');
  ui().setViewMode('cnc');
  const a0 = calls('labelAnchors');
  const view = await mount(React.createElement(CncView, { onExportDxfZip: () => {} }));
  const svg = one(view.root, (n) => n.type === 'svg');
  const parts = all(view.root, by('data-cnc-part')).length;
  assert.ok(parts > 50, `the kitchen's parts (${parts})`);
  assert.ok(calls('labelAnchors') - a0 <= parts * 2, 'each part asked at most twice on the way in');
  const count = async (gesture) => {
    const c0 = calls('labelAnchors');
    const r0 = calls('panelLabelBlock');
    const t0 = performance.now();
    await act(gesture);
    return { anchors: calls('labelAnchors') - c0, renders: calls('panelLabelBlock') - r0, ms: performance.now() - t0 };
  };
  const wheel = (deltaY) => () => svg.listeners.wheel({ deltaY, clientX: 480, clientY: 320, preventDefault() {} });
  await count(wheel(-120));
  await count(wheel(120));
  const steps = [];
  for (const d of [-120, 120, -120, 120]) steps.push(await count(wheel(d)));
  for (const step of steps) {
    assert.ok(step.renders >= parts, 'the step re-rendered the parts');
    assert.equal(step.anchors, 0, `a wheel step asked ${step.anchors} anchors`);
  }
  const pan = await count(() => {
    svg.props.onPointerDown({ button: 0, clientX: 400, clientY: 300, pointerId: 1, currentTarget: svg });
    for (let i = 1; i <= 4; i += 1) svg.props.onPointerMove({ clientX: 400 + 20 * i, clientY: 300, pointerId: 1, currentTarget: svg });
    svg.props.onPointerUp?.({ clientX: 480, clientY: 300, pointerId: 1, currentTarget: svg });
  });
  assert.equal(pan.anchors, 0, `a pan asked ${pan.anchors} anchors`);
  const feature = one(view.root, (n) => n.props?.['data-cnc-feature'] !== undefined && typeof n.props.onPointerEnter === 'function');
  const hover = await count(() => feature.props.onPointerEnter({ clientX: 500, clientY: 300 }));
  assert.equal(hover.anchors, 0, `a hover asked ${hover.anchors} anchors`);
  if (process.env.CNC_SPEED_TIMES) {
    console.log(`J1 Black Kitchen: ${parts} parts; wheel ${steps.map((x) => x.ms.toFixed(0)).join(', ')} ms; pan ${pan.ms.toFixed(0)} ms; hover ${hover.ms.toFixed(0)} ms`);
  }
  await view.unmount();
});

test('J1 · the source: the two reads go through the one cache, keyed by the panel object and the label size', () => {
  const view = read('src/components/CncView.jsx');
  assert.match(view, /const ANCHORS = new WeakMap\(\);/);
  assert.match(view, /function partAnchors\(panel, key, args\) \{/);
  assert.match(view, /partAnchors\(panel, `caption\|\$\{captionH\}`, \{ captionH \}\)\.caption/);
  assert.match(view, /partAnchors\(panel, `note\|\$\{noteSize\}\|\$\{noteBlockH\}`, \{ noteSize, noteBlockH \}\)\.noteCentre/);
  assert.equal((view.match(/labelAnchors\(/g) || []).length, 1, 'one call of labelAnchors left, inside the cache');
});

// ═══ J2 · THE BOM READS THE ONE CHECK ══════════════════════════════════════════

function Probe() {
  const findings = useCheckFindings();
  return React.createElement('i', { 'data-probe': findings.length });
}

test('J2 · the BOM\'s red warning is the shared Check\'s reds: opening the BOM and changing the job run the Check once for the app', async () => {
  const ids = kitchen();
  ui().setViewMode('3d');
  useMaterialLinkStore.setState({ load: async () => ({ status: 'ok', error: null }) });
  const real = store().runChecks;
  let runs = 0;
  useProjectStore.setState({ runChecks: () => { runs += 1; return real(); } });
  try {
    const reds = real().filter((f) => f.level === 'red');
    assert.ok(reds.length > 0, 'no red: this job proves nothing');
    // The Check is already on screen (the status bar, the badge): one run.
    const probe = await mount(React.createElement(Probe));
    assert.equal(runs, 1);
    // The BOM opens: no run of its own.
    const bom = await mount(React.createElement(BomPanel, { onExportCsv() {}, onExportPdf() {}, onExportBom() {} }));
    assert.equal(runs, 1, 'the BOM ran the Check again');
    await act(() => one(bom.root, by('data-bom-order-tab')).props.onClick());
    const warning = one(bom.root, by('data-bom-red-warning'));
    assert.ok(warning, 'the red warning stands at the top of the Order');
    assert.equal(Number(warning.props['data-bom-red-warning']), reds.length, 'the same reds as the Check');
    assert.match(textOf(warning), new RegExp(`Check holds ${reds.length} RED finding`));
    // A change: the Check runs once for both readers.
    await act(() => store().updateUnitParams(ids.w, { width: 950 }));
    assert.equal(runs, 2, `one change, ${runs - 1} runs`);
    const now = real().filter((f) => f.level === 'red');
    assert.equal(Number(one(bom.root, by('data-bom-red-warning'))?.props['data-bom-red-warning'] ?? 0), now.length);
    await bom.unmount();
    await probe.unmount();
  } finally {
    useProjectStore.setState({ runChecks: real });
  }
});

test('J2 · the source: BomPanel calls no runChecks of its own', () => {
  const bom = read('src/components/BomPanel.jsx');
  assert.doesNotMatch(bom, /runChecks/);
  assert.match(bom, /import \{ useCheckFindings \} from '\.\.\/lib\/checkFindings\.js';/);
  assert.match(bom, /const checkFindings = useCheckFindings\(\);/);
  assert.match(bom, /checkFindings\.filter\(\(f\) => f\.level === 'red'\)/);
});

// ═══ J3 · NO BEAT UNDER THE CNC SHEET ══════════════════════════════════════════

test('J3 · under the CNC sheet the hidden room draws nothing; under an editor window its slow beat; back from the sheet at once', async () => {
  kitchen();
  ui().setViewMode('3d');
  const three = {
    gl: { domElement: { addEventListener() {}, removeEventListener() {} }, shadowMap: { autoUpdate: true, needsUpdate: false } },
    frames: 0,
    clock: { getDelta() {} },
    scene: {},
    camera: {},
  };
  three.invalidate = () => { three.frames += 1; };
  globalThis.__three = three;
  // The beat is the component's own setInterval of 500 ms: held here, so a test second is a call.
  const realInterval = globalThis.setInterval;
  let beat = null;
  globalThis.setInterval = (fn, ms, ...rest) => (ms === 500 ? ((beat = fn), 0) : realInterval(fn, ms, ...rest));
  const view = await mount(React.createElement(FrameDemand, { onHeld: null }));
  globalThis.setInterval = realInterval;
  assert.equal(typeof beat, 'function', 'the beat is set');
  const beats = (n) => { const f0 = three.frames; for (let i = 0; i < n; i += 1) beat(); return three.frames - f0; };

  // The CNC sheet: three seconds, not one frame (it was one every 1.5 s).
  await act(() => ui().setViewMode('cnc'));
  assert.equal(beats(6), 0, 'the hidden room drew under the CNC sheet');
  assert.equal(beats(12), 0);

  // Back to Design: the room is drawn at once.
  let f0 = three.frames;
  await act(() => ui().setViewMode('3d'));
  assert.ok(three.frames > f0, 'no frame on the way back from the sheet');

  // An editor window over Design: the slow beat, as before (one frame each 1.5 s).
  await act(() => useUiStore.setState({ modal: 'cabinet' }));
  assert.equal(beats(6), 2, 'the slow beat under an editor window');

  // From the sheet back to an editor still open: the room is still drawn once at once.
  await act(() => useUiStore.setState({ viewMode: 'cnc' }));
  assert.equal(beats(6), 0);
  f0 = three.frames;
  await act(() => useUiStore.setState({ viewMode: '3d' }));
  assert.ok(three.frames > f0, 'leaving the sheet under an editor drew nothing');
  await act(() => useUiStore.setState({ modal: null }));
  await view.unmount();
});

// ═══ J4 · NO TRIANGLES ON THE CNC SHEET ════════════════════════════════════════

test('J4 · the Check\'s marker stands over its cabinet in Design and is not drawn on the CNC sheet', async () => {
  const ids = kitchen();
  ui().setViewMode('3d');
  const unit = store().units.find((u) => u.id === ids.b);
  const view = await mount(React.createElement(UnitIssueMarker, { unit, position: [0, 0, 0] }));
  const marker = () => one(view.root, (n) => n.props?.['data-studio'] === 'marker');
  assert.ok(marker(), 'the red pair carries its marker in Design');
  assert.equal(marker().props['data-level'], 'red');
  await act(() => ui().setViewMode('cnc'));
  // Compared as a yes or no: a failing assert would print the whole node tree it holds.
  assert.equal(Boolean(marker()), false, 'a marker stands on the CNC sheet');
  assert.equal(all(view.root, (n) => n.type === 'group').length, 0, 'nothing of it stays in the scene');
  await act(() => ui().setViewMode('3d'));
  assert.ok(marker(), 'back in Design the marker is back');
  assert.equal(marker().props['data-level'], 'red');
  await view.unmount();
});

// ═══ J5 · THE SCENE'S BARS LEAVE THE CNC SHEET ════════════════════════════════

test('J5 · on the CNC sheet the camera bar is Drawings... alone, with its opener; in Design the whole bar', async () => {
  kitchen();
  const opened = [];
  const onDrawings = (e) => opened.push(e);
  const hooks = (root) => all(root, (n) => typeof n.props?.['data-studio'] === 'string' && n.type === 'button').map((n) => n.props['data-studio']);

  ui().setViewMode('3d');
  const design = await mount(React.createElement(CameraBar, { onDrawings }));
  assert.deepEqual(hooks(design.root), ['scene-3d', 'camera-plan', 'camera-iso', 'camera-a', 'camera-b', 'camera-c', 'camera-d', 'camera-frame', 'drawings']);
  await design.unmount();

  ui().setViewMode('cnc');
  const sheet = await mount(React.createElement(CameraBar, { onDrawings, cncSheet: true }));
  assert.deepEqual(hooks(sheet.root), ['drawings'], 'only Drawings... on the CNC sheet');
  const drawings = one(sheet.root, (n) => n.props?.['data-studio'] === 'drawings');
  assert.equal(drawings.props.disabled, false);
  assert.match(textOf(drawings), /Drawings…/);
  await act(() => drawings.props.onClick({ currentTarget: drawings }));
  assert.equal(opened.length, 1, 'Drawings... opens the window from the CNC sheet');
  assert.equal(one(sheet.root, by('data-cnc-sheet')).props['data-cnc-sheet'], '1');
  await sheet.unmount();
});

test('J5 · the page: the toggles are not mounted on the CNC sheet, the bar is handed cncSheet; the way back stays', () => {
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.match(page, /\{viewMode !== 'cnc' && <SceneToggles \/>\}\s*<CameraBar cncSheet=\{viewMode === 'cnc'\} onDrawings=\{\(e\) => openModal\('drawing', \{ kind: 'walls', anchor: anchorOfEvent\(e\) \}\)\} \/>/);
  assert.equal((page.match(/openModal\('drawing'/g) || []).length, 1, 'one opener of the Drawings window');
  // The 3D button leaves with the bar: Design is the rail's and the View menu's.
  assert.match(read('src/components/studio/StudioRail.jsx'), /hook="rail-design"\s*pressed=\{viewMode === '3d'\}\s*onClick=\{\(\) => setViewMode\('3d'\)\}/);
  assert.match(read('src/components/TopBar.jsx'), /\{ label: '3D', checked: viewMode === '3d', run: \(\) => setViewMode\('3d'\) \}/);
});

// ═══ THE HOUSE LAWS ON WHAT THIS PASS WROTE ═══════════════════════════════════

test('the house laws: the Skylon header, no em or en dash, never the forbidden word', () => {
  const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
  const header = read('src/lib/jcLinks.js').split('\n').slice(0, 8).join('\n');
  const self = read('test/cnc-speed-ui.test.js');
  assert.ok(self.startsWith(header), 'the Skylon header');
  assert.doesNotMatch(self, DASHES);
  assert.doesNotMatch(self, new RegExp(`\\b${'wor'}${'ker'}\\b`, 'i'));
  // The blocks this pass added to the five files it edited carry no dash either.
  for (const [rel, from] of [
    ['src/components/CncView.jsx', 'CNC SPEED J1'],
    ['src/components/BomPanel.jsx', 'CNC SPEED J2'],
    ['src/3d/frameDemand.jsx', 'CNC SPEED J3'],
    ['src/components/studio/UnitIssueMarker.jsx', 'CNC SPEED J4'],
    ['src/pages/ConfiguratorPage.jsx', 'CNC SPEED J5'],
    ['src/components/studio/CameraBar.jsx', 'CNC SPEED J5'],
  ]) {
    const lines = read(rel).split('\n');
    const at = lines.findIndex((l) => l.includes(from));
    assert.ok(at >= 0, `${rel} names ${from}`);
    // The comment block that names the point, to its last comment line.
    let end = at;
    while (end + 1 < lines.length && /^\s*\/\//.test(lines[end + 1])) end += 1;
    assert.doesNotMatch(lines.slice(at, end + 1).join('\n'), DASHES, `${rel}: a dash in ${from}`);
  }
});
