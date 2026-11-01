/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F11 . PROJECT SETTINGS AND THE NEW ITEM (laws 2, 3). The owner, 01.11.2026: *"backs, plinths, drawer
// bottoms: domyslne, ale mamy mozliwosc zmienic na inne ... wyskoczy mu wybierz material z listy"*; *"jak dadza next
// next next to zeby im biale nie wyskoczylo"*; *"domyslny h3325 tabaco gladstone oak"*. The settings surface and the
// new-item flow driven the way the client clicks them (the small renderer of turn-cc2a-f08), Joinery Core stubbed
// through the link store's state and, for the item's birth, the fake client turn-cc1a-f05 uses.
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
const { entriesOf, entryById, catalogueIdOfBoard } = await import('../src/engine/catalogue.js');
const { buildBom, purchaseBom, LINK_WORDS } = await import('../src/engine/bom.js');
const { migrateDesign } = await import('../src/engine/design.js');
const { parseDecorCatalogue, setDecorCatalogue } = await import('../src/engine/decors.js');
const { toMaterial } = await import('../src/lib/jcStock.js');
const { useMaterialLinkStore } = await import('../src/stores/materialLinkStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { useCabinetProfileStore } = await import('../src/stores/cabinetProfileStore.js');
const { RAL_WINE_NAME, DEFAULT_CARCASS_DECOR } = await import('../src/retail/design/adapter.js');
const { default: SettingsPanel, SlotLink, DesignBoardSlots } = await import('../src/components/SettingsPanel.jsx');
const { default: NewProjectFlow } = await import('../src/components/NewProjectFlow.jsx');

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


// The decor pack the slots' thumbnails read (the real file).
setDecorCatalogue(parseDecorCatalogue(
  JSON.parse(readFileSync(new URL('../public/decors/egger/egger-decors.json', import.meta.url), 'utf8')),
  { basePath: '/decors/egger/' },
));

const P = () => useCabinetProfileStore.getState().profile;
const stock = [toMaterial({
  id: 'jc-oak', name: 'Gladstone Oak 18 board', category: 'Sheet materials', subcategory: 'Melamine', unit: 'sheet',
  current_quantity: 3, cost_per_unit: 52, size: '', thickness: '18', color: '', item_number: 'GO-18', image_url: null, supplier_id: null,
})];
function stubJc(links = new Map()) {
  useMaterialLinkStore.setState({
    links, stock, categories: [], status: 'ok', error: null, stockStatus: 'ok', stockError: null,
    companyName: 'Skylon Joinery LTD', rowErrors: {}, saving: {}, load: async () => ({ status: 'ok', error: null }),
  });
}
function job({ decor = 'egger:H3325_28' } = {}) {
  useUiStore.setState({ modal: null, modalArgs: null, modalStack: [] });
  useProjectStore.getState().newProject('Settings walk', { id: 'it-set', number: '2603' });
  const s = useProjectStore.getState();
  s.setCarcassSource('c1', 'egger');
  s.setCarcassFinish('c1', decor);
  for (const t of ['BUD', 'BUDR']) useProjectStore.getState().addUnit(t);
}
const OAK18 = 'sheet.egger.h3325_28.18';

test('F11.1 the three MaterialStock selects are gone with their handlers (the Deletion licence)', () => {
  const src = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');
  assert.ok(!src.includes('MaterialStock…'), 'no MaterialStock option left');
  for (const gone of ['assignBoard(', 'assignFrontBoard(', 'data-run-material-stock', 'setCarcassMaterial', 'setFrontMaterial', 'frontGate']) {
    assert.ok(!src.includes(gone), `${gone} is still in SettingsPanel.jsx`);
  }
  // The WHAT stays, and the Recompute or Keep gate of the source with it.
  assert.match(src, /const gateOrApply = \(typeId, thickness, label, apply\) => \{/);
  assert.match(src, /gateOrApply\(typeId, src\?\.thickness, src\?\.label \|\| 'that source', \(\) => setCarcassSource\(typeId, src\?\.id \|\| null\)\)/);
  assert.match(src, /data-thickness-gate="1"/);
});

test('F11.1 each board slot shows its entry and its link: red "Not linked" with Link, then "JC: <name>"', async () => {
  job();
  stubJc();
  const { root, unmount } = await mount(React.createElement(SettingsPanel));
  const slot = one(root, by('data-slot-link', 'carcass:c1'));
  assert.ok(slot, 'carcass 1 shows its slot line');
  assert.equal(slot.props['data-slot-link-status'], 'not-linked');
  assert.ok(textOf(slot).includes(entryById(OAK18).name), 'the entry the design resolves to, by its name');
  assert.ok(textOf(slot).includes(LINK_WORDS.notLinked));
  assert.match(one(slot, by('data-slot-link-words', '1')).props.className, /text-status-danger/);
  assert.equal(all(root, (n) => n.type === 'select' && Object.keys(n.props).some((k) => /material|stock/i.test(k))).length, 0, 'no stock select on the surface');
  await click(one(slot, by('data-slot-link-open', '1')));
  assert.equal(useUiStore.getState().modal, 'link-materials');
  assert.equal(useUiStore.getState().modalArgs.entryId, OAK18, 'Link opens the window at the slot\'s entry');
  // The same entry the cut list prints for the carcass sides (one source of a board, law 2).
  const st = useProjectStore.getState();
  const side = buildBom(st.allResults(), { design: st.project.design, profile: P() }).cutRows.find((r) => r.role === 'side');
  assert.equal(side?.catalogue_id, OAK18);
  await React.act(async () => { stubJc(new Map([[OAK18, { cc_material_id: OAK18, stock_item_id: 'jc-oak' }]])); });
  const linked = one(root, by('data-slot-link', 'carcass:c1'));
  assert.equal(linked.props['data-slot-link-status'], 'linked');
  assert.ok(textOf(linked).includes('JC: Gladstone Oak 18 board'));
  // Front 1 and the run pieces say theirs too.
  assert.ok(one(root, by('data-slot-link', 'front:f1')));
  assert.ok(one(root, by('data-slot-link', 'run:plinth')));
  await unmount();
});

test('F11.2 a back panel moved to another sheet of the same thickness moves in the cut list and the purchase list together', async () => {
  job();
  stubJc();
  const Slots = () => {
    const design = useProjectStore((s) => s.project.design);
    const setDesignBoard = useProjectStore((s) => s.setDesignBoard);
    return React.createElement(DesignBoardSlots, { design: migrateDesign(design), onChange: setDesignBoard });
  };
  const { root, unmount } = await mount(React.createElement(Slots));
  const back = () => one(root, by('data-board-slot', 'back'));
  assert.ok(textOf(back()).includes('Back panels'));
  assert.ok(textOf(one(root, by('data-board-slot', 'drawerBottom'))).includes('Drawer bottoms'));
  assert.equal(one(back(), by('data-board-slot-today', '1')).props['aria-pressed'], true, '"As today" by default');
  const t = Number(back().props['data-board-slot-thickness']);
  const st0 = useProjectStore.getState();
  const cut0 = buildBom(st0.allResults(), { design: st0.project.design, profile: P() }).cutRows.filter((r) => r.role === 'back');
  assert.ok(cut0.length > 0 && cut0.every((r) => Number(r.thickness) === t), `the back is cut at ${t} mm`);
  await click(one(back(), by('data-board-slot-other', '1')));
  // Only sheets of the thickness the engine cuts the back at: another thickness is never offered.
  const same = entriesOf('sheets').filter((e) => Number(e.thickness) === t);
  assert.equal(Number(one(back(), by('data-board-slot-list', 'back')).children.find((c) => c.props?.['data-board-slot-rows'])?.props['data-board-slot-rows']), same.length);
  await type(one(back(), by('data-board-slot-search', '1')), 'U999');
  const options = all(back(), by('data-board-slot-option', '1'));
  assert.equal(options.length, 1, 'the search narrows to the one black sheet at that thickness');
  await click(options[0]);
  const st = useProjectStore.getState();
  const chosen = catalogueIdOfBoard(migrateDesign(st.project.design).boards.back, P()).id;
  assert.equal(chosen, `sheet.egger.u999_12.${t}`, 'a board choice of the catalogue, stored in design.boards.back');
  const cut = buildBom(st.allResults(), { design: st.project.design, profile: P() }).cutRows.filter((r) => r.role === 'back');
  assert.ok(cut.every((r) => r.catalogue_id === chosen), 'the cut list cuts the backs from it');
  assert.deepEqual(cut.map((r) => [r.w, r.h, r.qty, r.thickness]), cut0.map((r) => [r.w, r.h, r.qty, r.thickness]), 'and nothing of the geometry moved');
  const p = purchaseBom(st.allResults(), { links: new Map(), stock, profile: P(), design: st.project.design, bespoke: [] });
  assert.ok(p.rows.find((r) => r.catalogueId === chosen), 'the purchase list buys it');
  assert.equal(one(back(), by('data-board-slot-other', '1')).props['aria-pressed'], true);
  await click(one(back(), by('data-board-slot-today', '1')));
  assert.equal(migrateDesign(useProjectStore.getState().project.design).boards.back, null, '"As today" again');
  await unmount();
});

test('F11.3 a new item starts on EGGER H3325 and sprayed RAL 3005, preselected; an old item keeps its own', async () => {
  const calls = [];
  const before = globalThis.supabaseClient;
  globalThis.supabaseClient = {
    from: () => { throw new Error('the birth reads nothing'); },
    rpc: (name, params) => {
      calls.push(name);
      return Promise.resolve({ data: { id: '0d3c2b1a-1111-4222-8333-444455556666', name: params.p_name, revision: null, jc_project_number: '2604', jc_pipeline_id: null, jc_project_id: params.p_project_id ?? null }, error: null });
    },
  };
  try {
    // An open item with a black kitchen of its own: the flow's birth must not be what it gets.
    useProjectStore.getState().newProject('Old', { id: 'old-1' });
    const { root, unmount } = await mount(React.createElement(NewProjectFlow, {
      jcProject: { id: 'prj-1', kind: 'project', key: 'project:prj-1', number: '2604', name: 'Smith kitchen', client: 'Smith' },
      onCancel() {}, onStart() {},
    }));
    await type(one(root, by('data-project-field', 'name')), 'Kitchen');
    await click(one(root, by('data-setup-primary', '1')));
    await flush();
    assert.deepEqual(calls, ['cc_create_item'], 'Joinery Core made the item');
    const d = migrateDesign(useProjectStore.getState().project.design);
    assert.equal(d.carcass.types[0].source, 'egger');
    assert.equal(d.carcass.types[0].finish_id, `egger:${DEFAULT_CARCASS_DECOR}`, 'H3325 ST28 Tobacco Gladstone Oak');
    assert.equal(d.fronts.types[0].source, 'spray');
    assert.equal(d.fronts.types[0].colour?.name, RAL_WINE_NAME, 'RAL 3005 Wine Red');
    assert.equal(d.fronts.types[0].colour?.system, 'RAL');
    const front = catalogueIdOfBoard({ source: d.fronts.types[0].source, thickness: 18 }, P()).id;
    assert.equal(front, 'sheet.mdf.18', 'on MDF 18');
    await unmount();
  } finally {
    if (before === undefined) delete globalThis.supabaseClient; else globalThis.supabaseClient = before;
  }
  // An old item opens as it was saved: its own carcass and fronts, never the new item's defaults.
  const file = JSON.parse(readFileSync(new URL('./fixtures/owner-projects/0003-black-kitchen-31.10.2026.ccproject', import.meta.url), 'utf8'));
  useProjectStore.getState().loadProject(file.project, file.units);
  const old = migrateDesign(useProjectStore.getState().project.design);
  assert.equal(old.carcass.types[0].finish_id, 'egger:H3171_12');
  assert.equal(old.fronts.types[0].colour?.name, '9005 Jet Black');
});

// ─── Ewa's proposals P3, P13 and P14, the owner approved them on 01.11.2026 (Julia's second slice) ─────────────────

test('P13 the board slot\'s default says what the part takes by default: "Default: <entry name>", never "As today"', async () => {
  job();
  stubJc();
  const Slots = () => {
    const design = useProjectStore((s) => s.project.design);
    const setDesignBoard = useProjectStore((s) => s.setDesignBoard);
    return React.createElement(DesignBoardSlots, { design: migrateDesign(design), onChange: setDesignBoard });
  };
  const { root, unmount } = await mount(React.createElement(Slots));
  const back = one(root, by('data-board-slot', 'back'));
  const today = one(back, by('data-board-slot-today', '1'));
  const named = textOf(one(back, by('data-slot-link'))).trim();
  const words = textOf(today).trim();
  assert.match(words, /^Default: /);
  assert.ok(named.startsWith(words.slice('Default: '.length)), `the default names the entry the slot shows (${words} / ${named})`);
  assert.equal(today.props.title, words, 'the whole name on hover when it is cut short');
  assert.ok(!textOf(root).includes('As today'), 'the turn\'s word is off the screen');
  await unmount();
});

test('P14 a board slot\'s thumbnail enlarges on click and does not choose the sheet; no button inside a button', async () => {
  job();
  stubJc();
  const Slots = () => {
    const design = useProjectStore((s) => s.project.design);
    const setDesignBoard = useProjectStore((s) => s.setDesignBoard);
    return React.createElement(DesignBoardSlots, { design: migrateDesign(design), onChange: setDesignBoard });
  };
  const { root, unmount } = await mount(React.createElement(Slots));
  const back = () => one(root, by('data-board-slot', 'back'));
  await click(one(back(), by('data-board-slot-other', '1')));
  await type(one(back(), by('data-board-slot-search', '1')), 'U999');
  const photo = one(back(), by('data-photo', 'board-slot'));
  assert.ok(photo, 'the thumbnail is a control of its own');
  assert.equal(photo.type, 'button');
  assert.equal(photo.props.title, 'Click to enlarge');
  assert.match(photo.props.className, /hover:outline/);
  const nested = (n, inside = false) => (n.type === 'button' && inside) || (n.children || []).some((c) => nested(c, inside || n.type === 'button'));
  assert.equal(nested(back()), false, 'no button nested in a button');
  await click(photo);
  assert.equal(migrateDesign(useProjectStore.getState().project.design).boards?.back ?? null, null, 'the click on the picture chose nothing');
  const card = one(root, by('data-photo-card', '1'));
  assert.ok(card, 'the enlarged view');
  assert.ok(textOf(card).includes('U999'), 'with the decor\'s attribution beside it');
  await unmount();
});

test('P3 the wizard\'s sheet size rows say they are for the CNC checks, not the sheets to buy', () => {
  const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
  const row = WIZ.slice(WIZ.indexOf('const sheetSizeRow ='), WIZ.indexOf('const slotPicker ='));
  for (const fam of ['carcasses', 'fronts']) {
    assert.match(row, new RegExp(`data-sheet-size-cnc-only="${fam}"[^>]*>\\s*This size is for the CNC sheet checks; the sheets to buy are counted from each material&apos;s link\\.`), fam);
  }
});

test('B1 words: the wizard says what counts as a board, the same words as the blocker of projectSettings.js', () => {
  const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
  assert.ok(!WIZ.includes('a colour or a decor alone does not'), 'the false words are gone');
  assert.ok(!WIZ.includes('Generic is also available'));
  const said = WIZ.split(': an EGGER decor, a sprayed colour, or a stock board. Generic counts.').length - 1;
  assert.equal(said, 3, 'the Next hint, the carcass line and the fronts line');
  assert.match(WIZ, /data-carcass-missing="1"[\s\S]{0,200}Choose a board for \$\{carcassMissing/);
  assert.match(WIZ, /data-fronts-missing="1"[\s\S]{0,200}Choose a board for \$\{frontsMissing/);
});
