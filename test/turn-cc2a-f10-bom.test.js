/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F10 . THE BOM: MATERIALS AND COSTS (laws 3, 7, 9). The owner, 01.11.2026: *"chodzi o robienie listy
// materialow na dany projekt oraz listy kosztow"*; *"w liscie materialow bedziemy musieli dodac jeszcze add materialy
// bespoke (od klienta na przyklad inne ironmongery)"*; *"nie trafia do katalogu ale dodaje do listy zakupow pod
// bespoke"*. The BOM panel driven the way the client clicks it (the small renderer of turn-cc2a-f08), Joinery Core
// stubbed through the link store's state. The save, reload, crash buffer and CSV roads of `project.bespoke` are
// Marek's (projectStore, exporters): this file asserts what the panel writes through the store's own actions.
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
const { entryById } = await import('../src/engine/catalogue.js');
const { purchaseBom, incompleteWords, LINK_WORDS } = await import('../src/engine/bom.js');
const { toMaterial } = await import('../src/lib/jcStock.js');
const { loadHardwareCatalogues } = await import('../src/lib/hardwareCatalogue.js');
const { useMaterialLinkStore } = await import('../src/stores/materialLinkStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { useCabinetProfileStore } = await import('../src/stores/cabinetProfileStore.js');
const { default: BomPanel } = await import('../src/components/BomPanel.jsx');
const { default: LinkMaterialsModal } = await import('../src/components/LinkMaterialsModal.jsx');

// The hinge catalogue of record, as the app loads it at start (main.jsx): a hinge line has its product then.
loadHardwareCatalogues();

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


const row = (id, name, extra = {}) => toMaterial({
  id, name, category: 'Ironmongery', subcategory: 'Hinges', unit: 'pcs', current_quantity: 40, cost_per_unit: 3.8,
  size: '', thickness: null, color: '', item_number: '', image_url: null, supplier_id: null, ...extra,
});
const STOCK = [
  row('jc-hinge', 'Blum CLIP top 110 hinge nickel', { item_number: '71B3550', image_url: 'https://jc.test/hinge.png' }),
  row('jc-plate', 'Blum plate knock-in 5', { item_number: '173L6100', cost_per_unit: 1.2 }),
];
const calls = { link: [] };
function stubJc(links = new Map()) {
  calls.link = [];
  useMaterialLinkStore.setState({
    links, stock: STOCK, categories: [], status: 'ok', error: null, stockStatus: 'ok', stockError: null,
    companyName: 'Skylon Joinery LTD', rowErrors: {}, saving: {},
    load: async () => ({ status: 'ok', error: null }),
    link: async (entries) => {
      calls.link.push(entries);
      useMaterialLinkStore.setState((s) => {
        const next = new Map(s.links);
        for (const e of entries) next.set(e.cc_material_id, { ...e });
        return { links: next };
      });
      return { ok: true, error: null, saved: entries.length };
    },
    unlink: async () => ({ ok: true, error: null }),
  });
}

/** The configurator's own two mounts, side by side: the BOM panel, and the window when the store opens it. */
function Screen() {
  const modal = useUiStore((s) => s.modal);
  return React.createElement(React.Fragment, null,
    React.createElement(BomPanel, { onExportCsv() {}, onExportPdf() {}, onExportBom() {} }),
    modal === 'link-materials' ? React.createElement(LinkMaterialsModal) : null);
}

function job() {
  useUiStore.setState({ modal: null, modalArgs: null, modalStack: [] });
  useProjectStore.getState().newProject('BOM walk', { id: 'it-bom', number: '2602' });
  for (const t of ['BUD', 'BUDTALL']) useProjectStore.getState().addUnit(t, { params: { doors: true } });
}
const HINGE = entryById('hinge.blum.clip-top.110.nickel');
const lineOf = (root, name) => all(root, by('data-bom-line-status')).find((n) => textOf(n).includes(name)) || null;

test('F10.2 the Materials tab\'s board and hardware selects are gone with their handlers (the Deletion licence)', () => {
  const src = readFileSync(new URL('../src/components/BomPanel.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /<select/, 'no select in the BOM panel');
  for (const gone of ['setAssignment', 'setYield', 'boardChoices', 'hardwareChoices', 'materialDemand', 'hardwareDemand', 'demandCost', 'buildAssignLines', 'assignCount']) {
    assert.ok(!src.includes(gone), `${gone} is still in BomPanel.jsx`);
  }
  assert.match(src, /purchaseBom\(scoped, \{\n\s+links, stock: linkStock, profile, design: migrated, pricedAt, bespoke: bespoke \|\| \[\],\n\s+\}\)/, 'ONE purchase list, read through the links');
});

test('F10.1 every line: the entry\'s name, the quantity, the red words; Link opens the window at the clicked hinge\'s entry', async () => {
  job();
  stubJc();
  const toasts = [];
  const notify = useUiStore.getState().notify;
  useUiStore.setState({ notify: (m, tone) => { toasts.push([m, tone]); } });
  const { root, unmount } = await mount(React.createElement(Screen));
  await click(one(root, by('data-bom-purchase-tab', '1')));
  const line = lineOf(root, HINGE.name);
  assert.ok(line, 'the hinge is ONE line under its catalogue name (3 + 6 hinges, one product)');
  assert.equal(line.props['data-bom-line-status'], 'not-linked');
  assert.ok(textOf(line).includes('9 pcs'));
  assert.ok(textOf(line).includes(LINK_WORDS.notLinked));
  await click(one(line, by('data-bom-link', '1')));
  assert.equal(useUiStore.getState().modal, 'link-materials');
  assert.equal(useUiStore.getState().modalArgs.entryId, HINGE.id, 'the catalogue id, never a partId');
  assert.equal(useUiStore.getState().modalArgs.from, 'bom');
  // The window, at that entry: the Hinges tab and the hinge selected; one click on its stock row links it.
  assert.equal(one(root, by('data-link-tab', 'hinges')).props['aria-selected'], true);
  await click(one(root, by('data-material-link', 'jc-hinge')));
  assert.deepEqual(calls.link, [[{ cc_material_id: HINGE.id, stock_item_id: 'jc-hinge' }]]);
  assert.deepEqual(toasts, [['Saved for all projects', 'success']], 'the toast after a link made from the BOM');
  // Back in the BOM: the line carries the JC material and its cost.
  const linked = lineOf(root, HINGE.name);
  assert.equal(linked.props['data-bom-line-status'], 'linked');
  assert.ok(textOf(linked).includes('Blum CLIP top 110 hinge nickel'));
  assert.ok(textOf(linked).includes('71B3550'));
  assert.ok(textOf(linked).includes('34.20'), '9 x 3.80');
  assert.ok(one(linked, by('data-photo', 'bom-jc')), 'the JC photo, enlarged on click');
  useUiStore.setState({ notify });
  await unmount();
});

test('F10.4 the header "<n> of <m> lines linked" and the total with "Incomplete total, <n> lines not linked"', async () => {
  job();
  stubJc(new Map([[HINGE.id, { cc_material_id: HINGE.id, stock_item_id: 'jc-hinge' }]]));
  const { root, unmount } = await mount(React.createElement(Screen));
  const st = useProjectStore.getState();
  const want = purchaseBom(st.allResults(), {
    links: useMaterialLinkStore.getState().links, stock: STOCK, profile: useCabinetProfileStore.getState().profile, design: st.project.design, bespoke: [],
  });
  const lines = want.rows.filter((r) => !r.bespoke).length;
  const head = one(root, by('data-bom-link-count'));
  assert.equal(head.props['data-bom-link-count'], String(want.totals.linked));
  assert.ok(textOf(head).includes(`${want.totals.linked} of ${lines} lines linked`));
  assert.ok(want.totals.notLinked > 0);
  assert.ok(textOf(head).includes(incompleteWords(want.totals.notLinked)), 'the incomplete total said beside it');
  assert.equal(one(head, by('data-bom-header-total')).props['data-bom-header-total'], 'incomplete');
  await click(one(root, by('data-bom-purchase-tab', '1')));
  assert.ok(textOf(one(root, by('data-bom-total'))).includes(incompleteWords(want.totals.notLinked)));
  // The Materials tab: the same list, read only, with Link; no select, no price.
  await click(all(root, (n) => n.type === 'button').find((b) => textOf(b).trim() === 'Materials'));
  const mat = one(root, by('data-bom-materials-tab', '1'));
  assert.ok(one(mat, by('data-bom-lines', 'materials')));
  assert.ok(all(mat, by('data-bom-link', '1')).length > 0);
  assert.equal(all(root, (n) => n.type === 'select').length, 0);
  await unmount();
});

test('F10.3 Bespoke, this project only: add, name, unit chips, supplied by client, remove, through the store\'s own actions', async () => {
  job();
  stubJc();
  const { root, unmount } = await mount(React.createElement(Screen));
  await click(one(root, by('data-bom-purchase-tab', '1')));
  const block = () => one(root, by('data-bom-bespoke', '1'));
  assert.ok(textOf(block()).includes('Bespoke, this project only'));
  assert.deepEqual(all(block(), by('data-bom-bespoke-unit')).map((b) => b.props['data-bom-bespoke-unit']), []);
  await click(one(block(), by('data-bom-bespoke-add', '1')));
  let rows = useProjectStore.getState().project.bespoke;
  assert.equal(rows.length, 1, 'addBespoke wrote one row into the project');
  assert.deepEqual(all(block(), by('data-bom-bespoke-unit')).map((b) => b.props['data-bom-bespoke-unit']), ['pcs', 'm', 'm²', 'sheets', 'litres', 'set']);
  await type(one(block(), by('data-bom-bespoke-name', '1')), "Client's own handles");
  await click(one(block(), by('data-bom-bespoke-unit', 'set')));
  const qty = one(block(), by('data-bom-bespoke-qty', '1'));
  await type(qty, '4');
  await React.act(async () => { one(block(), by('data-bom-bespoke-qty', '1')).props.onBlur(); });
  const price = one(block(), by('data-bom-bespoke-price', '1'));
  await type(price, '12.5');
  await React.act(async () => { one(block(), by('data-bom-bespoke-price', '1')).props.onBlur(); });
  rows = useProjectStore.getState().project.bespoke;
  assert.deepEqual(
    { name: rows[0].name, unit: rows[0].unit, qty: rows[0].qty, price: rows[0].price, suppliedByClient: rows[0].suppliedByClient },
    { name: "Client's own handles", unit: 'set', qty: 4, price: 12.5, suppliedByClient: false },
  );
  assert.ok(textOf(one(block(), by('data-bom-bespoke-cost', '1'))).includes('50.00'));
  // On the purchase list, marked bespoke, never a catalogue entry.
  const st = useProjectStore.getState();
  const p = purchaseBom(st.allResults(), { links: new Map(), stock: STOCK, profile: useCabinetProfileStore.getState().profile, design: st.project.design, bespoke: rows });
  const b = p.rows.find((r) => r.bespoke);
  assert.equal(b.catalogueId, null);
  assert.equal(b.lineCost, 50);
  await type(one(block(), by('data-bom-bespoke-client', '1')), true);
  assert.equal(useProjectStore.getState().project.bespoke[0].suppliedByClient, true);
  assert.ok(textOf(one(block(), by('data-bom-bespoke-cost', '1'))).includes('0.00'), 'supplied by client: nothing to buy');
  await click(one(block(), by('data-bom-bespoke-remove', '1')));
  assert.equal(useProjectStore.getState().project.bespoke.length, 0, 'removeBespoke');
  await unmount();
});
