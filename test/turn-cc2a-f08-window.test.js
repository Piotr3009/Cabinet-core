/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F8 . THE LINK MATERIALS WINDOW (laws 3, 7) and the window half of F9 (law 8). The owner, 01.11.2026:
// *"departamenty podzielone na gorze plyty, ironmongery etc etc, nie scrolowane"*; *"kod nie moze wybierac poprzez
// nazwe ... CC powinien miec swoja (nie widoczna) numeracje materialow"*; *"tylko podpowiedz od akceptacji tenanta"*.
// The window is driven the way the client clicks it: rendered by React (a small renderer over react-reconciler,
// no DOM), clicked and typed through its own handlers, Joinery Core stubbed through the link store's state, never the
// network.
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
const {
  DEPARTMENTS, SHEET_BRANDS, catalogueEntries, entriesOf, entryById,
} = await import('../src/engine/catalogue.js');
const { LINK_WORDS } = await import('../src/engine/bom.js');
const { parseDecorCatalogue, setDecorCatalogue, decorLabel, decorById } = await import('../src/engine/decors.js');
const { toMaterial, STOCK_EMPTY } = await import('../src/lib/jcStock.js');
const { LINKS_NOT_SET_UP } = await import('../src/lib/jcLinks.js');
const { rowToken } = await import('../src/lib/linkSuggest.js');
const { useMaterialLinkStore } = await import('../src/stores/materialLinkStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { default: LinkMaterialsModal } = await import('../src/components/LinkMaterialsModal.jsx');

// ── the decor pack the window's thumbnails and attributions read (the real file) ──
setDecorCatalogue(parseDecorCatalogue(
  JSON.parse(readFileSync(new URL('../public/decors/egger/egger-decors.json', import.meta.url), 'utf8')),
  { basePath: '/decors/egger/' },
));

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

// ── Joinery Core, as the link store holds it (stubbed through the store's state, never the network) ──
const row = (id, name, extra = {}) => toMaterial({
  id, name, category: 'Sheet materials', subcategory: 'Melamine', unit: 'sheet', current_quantity: 4, cost_per_unit: 41.5,
  size: '', thickness: null, color: '', item_number: '', image_url: null, supplier_id: null, ...extra,
});
const STOCK = [
  row('jc-oak-18', 'Egger H3325 ST28 Gladstone Oak 18mm', { thickness: '18', item_number: 'EG-H3325-18', image_url: 'https://jc.test/oak.png' }),
  row('jc-mdf-18', 'MDF 18 mm', { thickness: '18', item_number: 'MDF-18', subcategory: 'MDF', image_url: 'https://jc.test/mdf.png' }),
  row('jc-hinge', 'Blum CLIP top 110 hinge nickel', { category: 'Ironmongery', subcategory: 'Hinges', unit: 'pcs', item_number: '71B3550', cost_per_unit: 3.8 }),
  row('jc-paint', 'Paint, spray grade', { category: 'Finishes', subcategory: 'Paint', unit: 'L', cost_per_unit: 18 }),
];
const CATEGORIES = [
  { id: 'c1', name: 'Sheet materials', type: 'category', parent_category_id: null, display_order: 1 },
  { id: 'c1a', name: 'Melamine', type: 'subcategory', parent_category_id: 'c1', display_order: 1 },
  { id: 'c1b', name: 'MDF', type: 'subcategory', parent_category_id: 'c1', display_order: 2 },
  { id: 'c3', name: 'Ironmongery', type: 'category', parent_category_id: null, display_order: 2 },
];
const calls = { link: [], unlink: [], load: 0 };
function stubJc({ links = new Map(), status = 'ok', stock = STOCK } = {}) {
  calls.link = []; calls.unlink = []; calls.load = 0;
  useMaterialLinkStore.setState({
    links, stock, categories: CATEGORIES, status, error: null, stockStatus: status === 'offline' ? 'offline' : 'ok', stockError: null,
    companyName: 'Skylon Joinery LTD', rowErrors: {}, saving: {},
    load: async () => { calls.load += 1; return { status, error: null }; },
    // The store's own contract: one call, saved at once; the links stand in the store as saved.
    link: async (entries) => {
      calls.link.push(entries);
      useMaterialLinkStore.setState((s) => {
        const next = new Map(s.links);
        for (const e of entries) next.set(e.cc_material_id, { ...e });
        return { links: next };
      });
      return { ok: true, error: null, saved: entries.length };
    },
    unlink: async (id) => {
      calls.unlink.push(id);
      useMaterialLinkStore.setState((s) => { const next = new Map(s.links); next.delete(id); return { links: next }; });
      return { ok: true, error: null };
    },
  });
}
const open = (args = null) => useUiStore.setState({ modal: 'link-materials', modalArgs: args, modalStack: [] });
useProjectStore.getState().newProject?.({ id: 'it-link', name: 'Link walk', number: '2601' });

const OAK18 = entryById('sheet.egger.h3325_28.18');
const MDF18 = entryById('sheet.mdf.18');
const HINGE = entryById('hinge.blum.clip-top.110.nickel');
const rowOf = (root, entry) => one(root, by('data-link-row', rowToken(entry.id)));

test('F8.1 the maximised work window: Back to project top left, the title, whose links, the count and its bar', async () => {
  stubJc();
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  const shell = one(root, by('data-modal-name', 'link-materials'));
  assert.ok(shell, 'the shell window, by its registry name');
  assert.equal(shell.props['data-modal-maximised'], '1', 'opens maximised (SprayingPanel:96)');
  assert.match(shell.props.className, /cc-modal-wide/, 'the font floor of T-CC1b F12');
  const handle = one(shell, by('data-modal-handle'));
  const back = one(handle, by('data-link-back', '1'));
  assert.ok(back, 'Back to project sits in the header');
  const buttons = all(handle, (n) => n.type === 'button');
  assert.equal(buttons[0], back, 'it is the FIRST control, top left');
  assert.equal(textOf(back).trim(), 'Back to project');
  assert.doesNotMatch(back.props.className, /gold/, 'the way back is not gold');
  assert.ok(one(handle, by('data-modal-close', '1')), 'the shell\'s cross stays top right');
  const words = textOf(root);
  assert.ok(words.includes('Link materials'));
  assert.ok(words.includes('Every material Cabinet Core uses, linked once to your Joinery Core stock. Saved for Skylon Joinery LTD.'));
  const live = catalogueEntries().filter((e) => !e.retired).length;
  const count = one(root, by('data-link-count'));
  assert.equal(count.props['data-link-total'], String(live));
  assert.ok(textOf(count).includes(`0 of ${live} linked`));
  assert.ok(one(root, by('data-link-bar', '0')), 'the bar');
  await click(back);
  assert.equal(useUiStore.getState().modal, null, 'Back to project closes the window');
  await unmount();
});

test('F8.2 seven department tabs in order with "<linked> / <total>", green when all and amber otherwise', async () => {
  const links = new Map([[HINGE.id, { cc_material_id: HINGE.id, stock_item_id: 'jc-hinge' }]]);
  stubJc({ links });
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  const tabs = all(root, by('data-link-tab'));
  assert.deepEqual(tabs.map((t) => t.props['data-link-tab']), DEPARTMENTS.map((d) => d.id));
  assert.deepEqual(tabs.map((t) => textOf(t).split(/\s\d/)[0].trim()), DEPARTMENTS.map((d) => d.label));
  for (const t of tabs) {
    const total = entriesOf(t.props['data-link-tab']).length;
    const linked = t.props['data-link-tab'] === 'hinges' ? 1 : 0;
    const c = one(t, by('data-link-tab-count'));
    assert.equal(textOf(c).trim(), `${linked} / ${total}`, t.props['data-link-tab']);
    assert.equal(t.props['data-link-tab-tone'], linked === total ? 'all' : 'some');
    assert.match(c.props.className, linked === total ? /text-status-ok/ : /text-status-warn/);
  }
  // Tabs, never one scrolled list of every group: the Sheets tab draws only sheets.
  const rows = all(root, by('data-link-row'));
  assert.equal(rows.length, entriesOf('sheets', 'egger').length, 'the Sheets tab opens on Egger');
  await click(tabs.find((t) => t.props['data-link-tab'] === 'hinges'));
  assert.equal(all(root, by('data-link-row')).length, entriesOf('hinges').length);
  await unmount();
});

test('F8.2 under Sheets the brands, the three soon ones grey "Coming soon" and not clickable; the decor family chips', async () => {
  stubJc();
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  const brands = all(root, by('data-link-brand'));
  assert.deepEqual(brands.map((b) => b.props['data-link-brand']), SHEET_BRANDS.map((b) => b.id));
  const soon = brands.filter((b) => b.props['data-link-brand-soon'] === '1');
  assert.deepEqual(soon.map((b) => b.props['data-link-brand']), ['veneer', 'fenix', 'kronospan']);
  for (const b of soon) {
    assert.notEqual(b.type, 'button', 'a soon brand is not a button');
    assert.equal(b.props.onClick, undefined);
    assert.ok(textOf(b).includes('Coming soon'));
    assert.match(b.props.className, /opacity-50/);
  }
  const families = all(root, by('data-link-family')).filter((f) => f.props['data-link-family'] !== '');
  assert.ok(families.length >= 3, 'the decor families of lib/decorFamilies.js, as chips');
  assert.equal(all(root, (n) => n.type === 'select').length, 0, 'no select anywhere in the window');
  const oak = families.find((f) => f.props['data-link-family'] === 'oak');
  await click(oak);
  const shown = all(root, by('data-link-row')).length;
  assert.ok(shown > 0 && shown < entriesOf('sheets', 'egger').length, 'a family narrows the sheets');
  await click(brands.find((b) => b.props['data-link-brand'] === 'mdf'));
  assert.equal(all(root, by('data-link-row')).length, entriesOf('sheets', 'mdf').length);
  await unmount();
});

test('F8.3 a sheet row: the WHOLE decor picture at 40 px with decorLabel beside it, the name, the thickness; no id anywhere', async () => {
  stubJc({ links: new Map([[OAK18.id, { cc_material_id: OAK18.id, stock_item_id: 'jc-oak-18', sheet_width_mm: 2800, sheet_length_mm: 2070 }]]) });
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  const r = rowOf(root, OAK18);
  assert.ok(r);
  const img = one(r, (n) => n.type === 'img');
  assert.equal(img.props.src, decorById('H3325_28').thumb);
  assert.match(img.props.className, /object-contain/, 'the whole image, never cropped (decors.js licence)');
  assert.equal(img.props.style.width, 40);
  assert.ok(textOf(r).includes(decorLabel(decorById('H3325_28'))), 'EGGER, the code and the name beside it');
  assert.ok(textOf(r).includes(OAK18.name));
  assert.ok(textOf(r).includes('18 mm'));
  // The linked JC material: photo, number, name, price and unit, the status in green.
  assert.ok(textOf(r).includes('EG-H3325-18'));
  assert.ok(textOf(r).includes('Egger H3325 ST28 Gladstone Oak 18mm'));
  assert.ok(textOf(r).includes('£41.50 / sheet'));
  const words = one(r, by('data-link-words'));
  assert.equal(textOf(words).trim(), 'Linked');
  assert.match(words.props.className, /text-status-ok/);
  // A selected row is outlined gold.
  await click(r);
  assert.match(rowOf(root, OAK18).props.className, /outline-gold/);
  await unmount();
  // No id is shown anywhere (*"nie widoczna numeracja"*): every tab rendered as the browser renders it.
  for (const d of DEPARTMENTS) {
    open({ department: d.id });
    const html = renderToStaticMarkup(React.createElement(LinkMaterialsModal));
    for (const e of entriesOf(d.id)) {
      if (e.id.includes('.')) assert.ok(!html.includes(e.id), `${d.id}: the id ${e.id} is in the markup`);
      else assert.doesNotMatch(html, new RegExp(`\\b${e.id}\\b`), `${d.id}: the id ${e.id} is in the markup`);
    }
    assert.doesNotMatch(html, /(sheet|edge|hinge|runner|paint|stain)\.[a-z0-9-]+\.[a-z0-9._-]+/, `${d.id}: an id shape in the markup`);
  }
});

test('F8.3 the search narrows by decor code and clears with its cross; the three chips count', async () => {
  stubJc({ links: new Map([[OAK18.id, { cc_material_id: OAK18.id, stock_item_id: 'jc-oak-18' }]]) });
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  const egger = entriesOf('sheets', 'egger').length;
  assert.equal(one(root, by('data-link-search-clear')), null, 'no cross while nothing is typed');
  await type(one(root, by('data-link-search', '1')), 'h 3325');
  assert.equal(all(root, by('data-link-row')).length, 4, 'H3325 at 18, 19, 22 and 25 mm');
  const chip = (id) => one(root, by('data-link-filter', id));
  assert.equal(textOf(chip('all')).trim(), 'All 4');
  assert.equal(textOf(chip('not-linked')).trim(), 'Not linked 3');
  assert.equal(textOf(chip('used')).trim(), 'Used in this project 0');
  await click(chip('not-linked'));
  assert.equal(all(root, by('data-link-row')).length, 3);
  await click(chip('all'));
  await click(one(root, by('data-link-search-clear', '1')));
  assert.equal(one(root, by('data-link-search', '1')).props.value, '');
  assert.equal(all(root, by('data-link-row')).length, egger, 'the cross clears the search');
  await unmount();
});

test('F8.4 the right column is MaterialPicker: search with a cross, the tenant\'s categories as chips, a Link per row; Open Stock', async () => {
  stubJc();
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  const right = one(root, by('data-link-stock', '1'));
  assert.ok(one(right, by('data-material-list', 'link')), 'the one component the Stock window uses');
  assert.deepEqual(all(right, by('data-material-category-chip')).map((c) => textOf(c).trim()), ['All categories', 'Sheet materials', 'Ironmongery']);
  // REWRITTEN BY Ewa's P12 (the owner approved, 01.11.2026): the list opens on the kind of the tab (Boards on Sheets)
  // with "All kinds" one click away, as chips (no select in this window). It asserted every stock row at once.
  const kindChip = (k) => one(right, by('data-material-kind-chip', k));
  assert.deepEqual(all(right, by('data-material-kind-chip')).map((c) => textOf(c).trim()), ['Boards', 'All kinds']);
  assert.equal(kindChip('board').props['aria-pressed'], true, 'the Sheets tab preselects Boards');
  assert.deepEqual(all(right, by('data-material-link')).map((b) => b.props['data-material-link']), ['jc-oak-18', 'jc-mdf-18'], 'the two boards');
  assert.ok(one(right, by('data-material-thickness', 'jc-oak-18')) && textOf(one(right, by('data-material-thickness', 'jc-oak-18'))).includes('18 mm'), 'the thickness column');
  await click(kindChip('all'));
  assert.equal(all(right, by('data-material-link')).length, STOCK.length, 'All kinds: a Link button on every row');
  assert.ok(all(right, by('data-material-link')).every((b) => b.props.disabled), 'nothing to link until a material is chosen on the left');
  await type(one(right, by('data-material-search', '1')), 'hinge');
  assert.equal(all(right, by('data-material-link')).length, 1);
  await click(one(right, by('data-material-search-clear', '1')));
  assert.equal(all(right, by('data-material-link')).length, STOCK.length);
  await click(all(right, by('data-material-category-chip')).find((c) => textOf(c).trim() === 'Sheet materials'));
  assert.equal(all(right, by('data-material-link')).length, 2, 'Melamine and MDF are under Sheet materials');
  assert.ok(one(right, by('data-material-subcategory-chips', 'c1')), 'the subcategories under a chosen category');
  const words = textOf(right);
  assert.ok(words.includes('Not in the list? Add it to your Joinery Core stock first, then link it here.'));
  const stockLink = one(right, by('data-link-open-stock', '1'));
  assert.equal(stockLink.props.href, '/stock.html');
  assert.equal(stockLink.props.target, '_blank');
  assert.ok(!words.includes('Add to JC stock'), 'no "Add to JC stock" button (the owner, 13:28)');
  await unmount();
});

test('F8.5 a sheet cannot be linked without both sizes; the offcut is prefilled from the profile; one call saves it', async () => {
  stubJc();
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  await click(rowOf(root, OAK18));
  await click(one(root, by('data-material-link', 'jc-oak-18')));
  const form = () => one(root, by('data-link-form', 'sheet'));
  assert.ok(form(), 'the small form opens beside the row');
  assert.equal(one(form(), by('data-link-offcut', '1')).props.value, '10', 'profile.materials.sheetYield 1.10 shows 10');
  const save = () => one(form(), by('data-link-save', '1'));
  // REWRITTEN BY Ewa's P5 (the owner approved, 01.11.2026): Save link stays pressable; pressed with a size empty or out
  // of bounds, that field is outlined red with its words under it and nothing is saved. It asserted a disabled Save.
  const width = () => one(form(), by('data-link-sheet-width', '1'));
  const length = () => one(form(), by('data-link-sheet-length', '1'));
  const fieldWords = () => all(form(), by('data-link-field-error', '1')).map((n) => textOf(n).trim());
  assert.equal(save().props.disabled, false, 'Save link can be pressed');
  assert.deepEqual(fieldWords(), [], 'no words before a press');
  await click(save());
  assert.equal(calls.link.length, 0, 'empty, nothing went to Joinery Core');
  assert.deepEqual(fieldWords(), ['Required', 'Required'], 'both sizes say Required under them');
  assert.match(width().props.className, /border-status-danger/);
  assert.match(length().props.className, /border-status-danger/);
  assert.ok(one(form(), by('data-link-form-hint', '1')), 'the hint stays');
  await type(width(), '2440');
  await click(save());
  assert.equal(calls.link.length, 0, 'one size is not enough');
  assert.deepEqual(fieldWords(), ['Required']);
  await type(length(), '50');
  await click(save());
  assert.equal(calls.link.length, 0, 'a sheet of 50 mm is refused in words before the call');
  assert.ok(textOf(form()).includes('Whole millimetres, 100 to 6000'));
  assert.match(length().props.className, /border-status-danger/);
  assert.doesNotMatch(width().props.className, /border-status-danger/, 'a good size is not red');
  await type(length(), '1220');
  assert.deepEqual(fieldWords(), []);
  await click(save());
  assert.deepEqual(calls.link, [[{
    cc_material_id: OAK18.id, stock_item_id: 'jc-oak-18', sheet_width_mm: 2440, sheet_length_mm: 1220, yield: 1.1,
  }]], 'one call, the sizes and the yield');
  assert.equal(rowOf(root, OAK18).props['data-link-status'], 'linked');
  assert.equal(form(), null, 'the form closes');
  await unmount();
});

test('F8.5 a hinge links on one click; a paint asks for an optional coverage; Unlink clears; an error is said on the row', async () => {
  stubJc();
  open({ entryId: HINGE.id, from: 'bom' });
  const toasts = [];
  const notify = useUiStore.getState().notify;
  useUiStore.setState({ notify: (m, tone) => { toasts.push([m, tone]); } });
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  assert.equal(one(root, by('data-link-tab', 'hinges'))['props']['aria-selected'], true, 'opened at the clicked entry\'s tab');
  assert.equal(rowOf(root, HINGE).props['data-link-selected'], '1', '...and the entry selected');
  await click(one(root, by('data-material-link', 'jc-hinge')));
  assert.deepEqual(calls.link, [[{ cc_material_id: HINGE.id, stock_item_id: 'jc-hinge' }]]);
  assert.deepEqual(toasts, [['Saved for all projects', 'success']], 'from the BOM, the toast');
  assert.equal(rowOf(root, HINGE).props['data-link-status'], 'linked');
  await click(one(rowOf(root, HINGE), by('data-link-unlink', '1')));
  assert.deepEqual(calls.unlink, [HINGE.id]);
  assert.equal(rowOf(root, HINGE).props['data-link-status'], 'not-linked');
  assert.equal(textOf(one(rowOf(root, HINGE), by('data-link-words'))).trim(), LINK_WORDS.notLinked);
  // A refusal, in Joinery Core's words, on the row it was for.
  await React.act(async () => { useMaterialLinkStore.setState({ rowErrors: { [HINGE.id]: 'That stock item is not of your company.' } }); });
  assert.ok(textOf(one(rowOf(root, HINGE), by('data-link-row-error', '1'))).includes('That stock item is not of your company.'));
  // Paint: the coverage, optional.
  await click(one(root, by('data-link-tab', 'paint')));
  const paint = entryById('paint.bespoke');
  await click(rowOf(root, paint));
  await click(one(root, by('data-material-link', 'jc-paint')));
  const form = one(root, by('data-link-form', 'paint'));
  assert.ok(one(form, by('data-link-coverage', '1')));
  assert.ok(textOf(form).includes('Coverage (m² per litre)'));
  await click(one(form, by('data-link-save', '1')));
  assert.deepEqual(calls.link.at(-1), [{ cc_material_id: 'paint.bespoke', stock_item_id: 'jc-paint' }]);
  useUiStore.setState({ notify });
  await unmount();
});

test('F8.3 the photos open the enlarged view: the JC photo and the decor picture with its attribution', async () => {
  stubJc({ links: new Map([[OAK18.id, { cc_material_id: OAK18.id, stock_item_id: 'jc-oak-18' }]]) });
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  assert.equal(one(root, by('data-photo-card', '1')), null);
  await click(one(rowOf(root, OAK18), by('data-photo', 'jc')));
  let card = one(root, by('data-photo-card', '1'));
  assert.ok(card, 'the JC photo enlarged');
  assert.equal(one(card, (n) => n.type === 'img').props.src, 'https://jc.test/oak.png');
  assert.ok(textOf(card).includes('EG-H3325-18'));
  await click(one(one(root, by('data-modal-name', 'material-card')), by('data-modal-close', '1')));
  assert.equal(one(root, by('data-photo-card', '1')), null);
  await click(one(rowOf(root, OAK18), by('data-photo', 'decor')));
  card = one(root, by('data-photo-card', '1'));
  assert.ok(textOf(card).includes(decorLabel(decorById('H3325_28'))), 'the decor enlarged keeps its attribution beside it');
  await click(one(one(root, by('data-link-stock', '1')), by('data-photo', 'stock:jc-mdf-18')));
  assert.equal(one(one(root, by('data-modal-name', 'material-card')), (n) => n.type === 'img').props.src, 'https://jc.test/mdf.png');
  await unmount();
});

test('F8.6 the states in words: not set up (read only), offline (Retry), the empty stock (Open Stock)', async () => {
  stubJc({ status: 'not-set-up' });
  open({ entryId: HINGE.id });
  let m = await mount(React.createElement(LinkMaterialsModal));
  assert.ok(textOf(one(m.root, by('data-link-not-set-up', '1'))).includes(LINKS_NOT_SET_UP));
  assert.ok(all(m.root, by('data-material-link')).every((b) => b.props.disabled), 'the table is read only');
  await click(one(m.root, by('data-material-link', 'jc-hinge')));
  assert.equal(calls.link.length, 0);
  await m.unmount();

  stubJc({ status: 'offline' });
  useMaterialLinkStore.setState({ error: 'Joinery Core did not answer.' });
  open();
  m = await mount(React.createElement(LinkMaterialsModal));
  const off = one(m.root, by('data-link-offline', '1'));
  assert.ok(textOf(off).includes('Joinery Core did not answer.'));
  const before = calls.load;
  await click(one(off, by('data-link-retry', '1')));
  assert.equal(calls.load, before + 1, 'Retry reads Joinery Core again');
  await m.unmount();

  stubJc({ stock: [] });
  open();
  m = await mount(React.createElement(LinkMaterialsModal));
  const empty = one(m.root, by('data-link-stock-empty', '1'));
  assert.ok(textOf(empty).includes(STOCK_EMPTY));
  assert.equal(one(empty, by('data-link-open-stock', '1')).props.href, '/stock.html');
  await m.unmount();
});

test('F9.2 the window: "Suggested: <item>" and Accept in the row; nothing is saved before Accept; Accept all saves only the ticked', async () => {
  stubJc();
  open({ department: 'hinges' });
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  await flush();
  assert.equal(calls.link.length, 0, 'nothing is linked by opening the window');
  const sug = one(rowOf(root, HINGE), by('data-link-suggested', '1'));
  assert.ok(textOf(sug).includes('Suggested: Blum CLIP top 110 hinge nickel'));
  assert.equal(rowOf(root, HINGE).props['data-link-status'], 'not-linked', 'a suggestion is a sentence, never a link');
  await click(one(sug, by('data-link-accept', '1')));
  assert.deepEqual(calls.link, [[{ cc_material_id: HINGE.id, stock_item_id: 'jc-hinge' }]]);
  await unmount();

  // Sheets: Accept all lists the suggestions with a tick each and asks ONCE for the size of the ticked sheets.
  stubJc();
  open();
  const m = await mount(React.createElement(LinkMaterialsModal));
  await click(one(m.root, by('data-link-accept-all', '1')));
  const panel = one(m.root, by('data-link-accept-all-panel', '1'));
  const ticks = all(panel, by('data-link-accept-tick'));
  assert.ok(ticks.length >= 1);
  assert.ok(ticks.every((t) => t.props.checked), 'every suggestion ticked to start');
  const saveAll = () => one(one(m.root, by('data-link-accept-all-panel', '1')), by('data-link-accept-all-save', '1'));
  assert.equal(saveAll().props.disabled, true, 'a ticked sheet without its size cannot be saved');
  await type(one(panel, by('data-link-sheet-width', '1')), '2800');
  await type(one(one(m.root, by('data-link-accept-all-panel', '1')), by('data-link-sheet-length', '1')), '2070');
  const oakTick = all(one(m.root, by('data-link-accept-all-panel', '1')), by('data-link-accept-tick', rowToken(OAK18.id)))[0];
  assert.ok(oakTick, 'H3325 at 18 mm is suggested the Gladstone Oak 18 row');
  // Untick everything but the 18 mm oak: only the ticked one is saved.
  for (const t of all(one(m.root, by('data-link-accept-all-panel', '1')), by('data-link-accept-tick'))) {
    if (t.props['data-link-accept-tick'] !== rowToken(OAK18.id)) await type(t, false);
  }
  assert.equal(calls.link.length, 0, 'nothing saved before Link');
  await click(saveAll());
  assert.deepEqual(calls.link, [[{
    cc_material_id: OAK18.id, stock_item_id: 'jc-oak-18', sheet_width_mm: 2800, sheet_length_mm: 2070, yield: 1.1,
  }]]);
  await m.unmount();
});

// ─── Ewa's proposals P3 to P13, the owner approved them on 01.11.2026 (Julia's second slice) ───────────────────────

test('P3 under a linked sheet the numbers the purchase list counts with: "<w> x <l> mm, offcut <n> %"', async () => {
  const OAK19 = entryById('sheet.egger.h3325_28.19');
  stubJc({
    links: new Map([
      [OAK18.id, { cc_material_id: OAK18.id, stock_item_id: 'jc-oak-18', sheet_width_mm: 1220, sheet_length_mm: 2440, yield: '1.050' }],
      [OAK19.id, { cc_material_id: OAK19.id, stock_item_id: 'jc-oak-18', sheet_width_mm: 2800, sheet_length_mm: 2070, yield: null }],
    ]),
  });
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  assert.equal(textOf(one(rowOf(root, OAK18), by('data-link-sheet-size', '1'))).trim(), '1220 x 2440 mm, offcut 5 %', 'the link\'s own yield');
  assert.equal(textOf(one(rowOf(root, OAK19), by('data-link-sheet-size', '1'))).trim(), '2800 x 2070 mm, offcut 10 %', 'no yield on the link: the workshop\'s 1.10');
  assert.equal(one(rowOf(root, entryById('sheet.egger.h3325_28.22')), by('data-link-sheet-size')), null, 'a sheet not linked says no size');
  await unmount();
});

test('P4 the not set up line says whom to ask', async () => {
  stubJc({ status: 'not-set-up' });
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  assert.ok(textOf(one(root, by('data-link-not-set-up', '1'))).includes(`${LINKS_NOT_SET_UP} The list below is read only until it is. Ask your Joinery Core administrator.`));
  await unmount();
});

test('P6 "Accept all suggestions" counts only the rows shown (brand, family, search, filter)', async () => {
  stubJc();
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  const acceptAll = () => one(root, by('data-link-accept-all', '1'));
  assert.equal(textOf(acceptAll()).trim(), 'Accept all suggestions (1)', 'Egger: the H3325 18 mm row');
  await type(one(root, by('data-link-search', '1')), 'U999');
  assert.equal(acceptAll(), null, 'a search that hides the suggested row hides its Accept all');
  await click(one(root, by('data-link-search-clear', '1')));
  await click(one(root, by('data-link-brand', 'mdf')));
  assert.equal(textOf(acceptAll()).trim(), 'Accept all suggestions (1)', 'MDF: the MDF 18 row, never the Egger one');
  await click(acceptAll());
  const panel = one(root, by('data-link-accept-all-panel', '1'));
  assert.deepEqual(all(panel, by('data-link-accept-tick')).map((t) => t.props['data-link-accept-tick']), [rowToken(MDF18.id)]);
  assert.deepEqual(all(panel, by('data-link-accept-all-sheet')).map((n) => n.props['data-link-accept-all-sheet']), ['mdf'], 'one size, for the one brand ticked');
  await unmount();
});

test('P8 Unlink says "Unlinked for all projects" with Undo, and Undo saves the old link back with its sizes and yield', async () => {
  stubJc({ links: new Map([[OAK18.id, { cc_material_id: OAK18.id, stock_item_id: 'jc-oak-18', sheet_width_mm: 2800, sheet_length_mm: 2070, yield: '1.100' }]]) });
  open();
  const toasts = [];
  const notify = useUiStore.getState().notify;
  useUiStore.setState({ notify: (m, tone, opts) => { toasts.push({ m, tone, action: opts?.action || null }); } });
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  await click(one(rowOf(root, OAK18), by('data-link-unlink', '1')));
  assert.deepEqual(calls.unlink, [OAK18.id]);
  assert.equal(rowOf(root, OAK18).props['data-link-status'], 'not-linked');
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].m, 'Unlinked for all projects');
  assert.equal(toasts[0].tone, 'warn', 'the level that carries a button');
  assert.equal(toasts[0].action.label, 'Undo');
  await React.act(async () => { toasts[0].action.run(); });
  assert.deepEqual(calls.link, [[{
    cc_material_id: OAK18.id, stock_item_id: 'jc-oak-18', yield: 1.1, sheet_width_mm: 2800, sheet_length_mm: 2070,
  }]], 'the old link, as it stood');
  assert.equal(rowOf(root, OAK18).props['data-link-status'], 'linked');
  useUiStore.setState({ notify });
  await unmount();
});

test('P11 no automatic move after a one click link; "Next not linked" moves the selection when asked', async () => {
  stubJc();
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  await click(one(root, by('data-link-tab', 'hinges')));
  await click(rowOf(root, HINGE));
  await click(one(root, by('data-material-link', 'jc-hinge')));
  assert.deepEqual(calls.link, [[{ cc_material_id: HINGE.id, stock_item_id: 'jc-hinge' }]]);
  const target = () => one(root, by('data-link-target')).props['data-link-target'];
  assert.equal(target(), rowToken(HINGE.id), 'the selection stays on the hinge just linked');
  const list = entriesOf('hinges');
  const at = list.findIndex((e) => e.id === HINGE.id);
  const want = [...list.slice(at + 1), ...list.slice(0, at)].find((e) => e.id !== HINGE.id);
  await click(one(root, by('data-link-next', '1')));
  assert.equal(target(), rowToken(want.id), 'Next not linked: the next row of the list that is not linked');
  await unmount();
});

test('P12 the right column opens on the tab\'s kind, Paint finds the stock\'s paint; a sheet of another thickness is said in amber', async () => {
  stubJc();
  open({ department: 'paint' });
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  const right = () => one(root, by('data-link-stock', '1'));
  assert.equal(one(right(), by('data-material-kind-chip', 'paint')).props['aria-pressed'], true);
  assert.deepEqual(all(right(), by('data-material-link')).map((b) => b.props['data-material-link']), ['jc-paint'], 'a stock row that says Paint');
  await click(one(root, by('data-link-tab', 'hinges')));
  assert.equal(one(right(), by('data-material-kind-chip', 'hardware')).props['aria-pressed'], true);
  assert.deepEqual(all(right(), by('data-material-link')).map((b) => b.props['data-material-link']), ['jc-hinge']);
  await click(one(root, by('data-link-tab', 'consumables')));
  assert.equal(one(right(), by('data-material-kind-chips')), null, 'Consumables: every kind, no chips');
  assert.equal(all(right(), by('data-material-link')).length, STOCK.length);
  await click(one(root, by('data-link-tab', 'sheets')));
  const OAK19 = entryById('sheet.egger.h3325_28.19');
  await click(rowOf(root, OAK19));
  await click(one(root, by('data-material-link', 'jc-oak-18')));
  const warn = one(one(root, by('data-link-form', 'sheet')), by('data-link-thickness-warn', '1'));
  assert.equal(textOf(warn).trim(), 'This stock item is 18 mm, the material is 19 mm');
  assert.match(warn.props.className, /text-status-warn/);
  assert.equal(one(one(root, by('data-link-form', 'sheet')), by('data-link-save', '1')).props.disabled, false, 'it does not block');
  await click(rowOf(root, OAK18));
  await click(one(root, by('data-material-link', 'jc-oak-18')));
  assert.equal(one(one(root, by('data-link-form', 'sheet')), by('data-link-thickness-warn')), null, 'the same thickness says nothing');
  await unmount();
});

test('P13 "Search by name" on every tab but Sheets; "Not linked" stays on one line', async () => {
  stubJc();
  open();
  const { root, unmount } = await mount(React.createElement(LinkMaterialsModal));
  assert.equal(one(root, by('data-link-search', '1')).props.placeholder, 'Search by name or decor code');
  assert.match(one(rowOf(root, OAK18), by('data-link-words', '1')).props.className, /whitespace-nowrap/);
  for (const d of DEPARTMENTS.filter((x) => x.id !== 'sheets')) {
    await click(one(root, by('data-link-tab', d.id)));
    assert.equal(one(root, by('data-link-search', '1')).props.placeholder, 'Search by name', d.id);
  }
  await unmount();
});

test('P10 from the rail, on a project with entries not linked: the window opens on "Used in this project", and counts this project', async () => {
  const { purchaseBom } = await import('../src/engine/bom.js');
  const { migrateDesign } = await import('../src/engine/design.js');
  const { useCabinetProfileStore } = await import('../src/stores/cabinetProfileStore.js');
  useProjectStore.getState().newProject('Used walk', { id: 'it-used', number: '2605' });
  for (const t of ['BUD', 'BUDTALL']) useProjectStore.getState().addUnit(t, { params: { doors: true } });
  try {
    const st = useProjectStore.getState();
    const used = new Set(purchaseBom(st.allResults(), {
      links: new Map(), stock: STOCK, profile: useCabinetProfileStore.getState().profile, design: migrateDesign(st.project.design), bespoke: [],
    }).rows.map((r) => r.catalogueId).filter(Boolean));
    const leg = entryById('leg.adjustable');
    assert.ok(used.has(leg.id) && used.has('sheet.generic.18'), 'the job uses the legs and the generic 18 mm board');
    stubJc({ links: new Map([[leg.id, { cc_material_id: leg.id, stock_item_id: 'jc-hinge' }]]) });
    open();
    let m = await mount(React.createElement(LinkMaterialsModal));
    await flush();
    assert.equal(one(m.root, by('data-link-filter', 'used')).props['aria-pressed'], true, 'opens on Used in this project');
    // Sheets, Egger holds nothing this job uses: the window opens where the first one not linked is (Sheets, Generic).
    assert.equal(one(m.root, by('data-link-tab', 'sheets')).props['aria-selected'], true);
    assert.equal(one(m.root, by('data-link-brand', 'generic')).props['aria-pressed'], true);
    const rows = all(m.root, by('data-link-row'));
    assert.ok(rows.length > 0 && rows.every((r) => r.props['data-link-used'] === '1'), 'the rows this project uses');
    assert.ok(rows.some((r) => r.props['data-link-status'] !== 'linked'), 'among them one not linked');
    const pc = one(m.root, by('data-link-project-count'));
    assert.equal(pc.props['data-link-project-total'], String(used.size));
    assert.equal(textOf(pc).trim(), `This project: 1 of ${used.size} linked`);
    // Ewa's check of the UX frames: on "Used in this project" the tabs and the brands count THIS project.
    const usedEntries = [...used].map((id) => entryById(id)).filter(Boolean);
    const want = (dept) => {
      const es = usedEntries.filter((e) => e.department === dept);
      return { linked: es.filter((e) => e.id === leg.id).length, total: es.length };
    };
    for (const d of DEPARTMENTS) {
      const t = one(m.root, by('data-link-tab', d.id));
      const w = want(d.id);
      assert.equal(t.props['data-link-tab-scope'], 'project', d.id);
      assert.equal(textOf(one(t, by('data-link-tab-count'))).trim(), `${w.linked} / ${w.total}`, d.id);
      assert.equal(t.props['data-link-tab-tone'], w.total === 0 ? 'none' : w.linked === w.total ? 'all' : 'some', d.id);
    }
    const genericSheets = usedEntries.filter((e) => e.department === 'sheets' && (e.brand || 'generic') === 'generic').length;
    assert.equal(textOf(one(one(m.root, by('data-link-brand', 'generic')), by('data-link-brand-count'))).trim(), `0 / ${genericSheets}`);
    assert.equal(textOf(one(one(m.root, by('data-link-brand', 'egger')), by('data-link-brand-count'))).trim(), '0 / 0');
    // Moving to another tab keeps the project's view.
    await click(one(m.root, by('data-link-tab', leg.department)));
    assert.equal(one(m.root, by('data-link-filter', 'used')).props['aria-pressed'], true, 'the filter stays on Used in this project');
    assert.ok(all(m.root, by('data-link-row')).every((r) => r.props['data-link-used'] === '1'));
    assert.ok(all(m.root, by('data-link-row')).some((r) => r.props['data-link-row'] === rowToken(leg.id)));
    await click(one(m.root, by('data-link-filter', 'all')));
    assert.equal(one(m.root, by('data-link-filter', 'all')).props['aria-pressed'], true, 'the joiner\'s own choice stands');
    assert.equal(one(m.root, by('data-link-tab', 'sheets')).props['data-link-tab-scope'], 'catalogue', 'All: the catalogue\'s counts again');
    await click(one(m.root, by('data-link-tab', 'sheets')));
    assert.equal(one(one(m.root, by('data-link-brand', 'generic')), by('data-link-brand-count')), null, 'no project count on the brands');
    await m.unmount();
    // Opened at an entry (the BOM's Link): the filter is All, the entry in view.
    open({ entryId: HINGE.id, from: 'bom' });
    m = await mount(React.createElement(LinkMaterialsModal));
    await flush();
    assert.equal(one(m.root, by('data-link-filter', 'all')).props['aria-pressed'], true);
    await m.unmount();
    // Everything the job uses linked: the window opens on All.
    stubJc({ links: new Map([...used].map((id) => [id, { cc_material_id: id, stock_item_id: 'jc-hinge', sheet_width_mm: 2440, sheet_length_mm: 1220 }])) });
    open();
    m = await mount(React.createElement(LinkMaterialsModal));
    await flush();
    assert.equal(one(m.root, by('data-link-filter', 'all')).props['aria-pressed'], true);
    assert.equal(textOf(one(m.root, by('data-link-project-count'))).trim(), `This project: ${used.size} of ${used.size} linked`);
    await m.unmount();
  } finally {
    useProjectStore.getState().newProject?.({ id: 'it-link', name: 'Link walk', number: '2601' });
  }
});
