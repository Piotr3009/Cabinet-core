/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F8 . FOUR TRIGGERS, ONE SAVE (CLAUDE.md T-CC1a law 6). The owner, 30.10.2026: *"dopiero caly json powinien
// sie zapisac do DB przy nacisnieciu Zapisz lub co 5 minut automatycznie"*. Fake timers, a fake window and
// document, a fake fetch; the real store and the real payload where the road reaches them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
mem.set('authToken', 'tok-123');

const {
  RPC_ENDPOINT, handleSaveKey, installSaveTriggers, isSaveKey, keepaliveSave, makeSaveFirst,
} = await import('../src/lib/saveTriggers.js');
const { SAVE_DEFAULTS, saveNumbers } = await import('../src/lib/saveNumbers.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { itemPayload } = await import('../src/lib/persist.js');

/** A fake page: a window and a document with listeners, an interval clock, a fetch that records. */
function fakePage() {
  const listeners = { win: new Map(), doc: new Map() };
  const on = (m) => ({
    addEventListener: (t, f) => m.set(t, f),
    removeEventListener: (t, f) => { if (m.get(t) === f) m.delete(t); },
  });
  const win = on(listeners.win);
  const doc = { ...on(listeners.doc), visibilityState: 'visible' };
  const intervals = [];
  const fetches = [];
  return {
    win, doc, intervals, fetches, listeners,
    setIntervalFn: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
    clearIntervalFn: () => {},
    fetchFn: (url, init) => { fetches.push({ url, init }); return Promise.resolve({ ok: true }); },
    fire: (where, type) => listeners[where].get(type)?.(),
  };
}
const flushAll = () => new Promise((r) => setTimeout(r, 0));

function rig({ dirty = true, item = true, payload = () => ({ p_item_id: 'srv-1', p_name: 'Job', p_design: { units: [] } }), numbers = SAVE_DEFAULTS } = {}) {
  const page = fakePage();
  const saves = [];
  let release = null;
  const flushes = [];
  const state = { dirty, item, hold: false };
  const off = installSaveTriggers({
    save: (o) => { saves.push(o); return state.hold ? new Promise((r) => { release = r; }) : Promise.resolve({ stored: true }); },
    isDirty: () => state.dirty,
    hasItem: () => state.item,
    buffer: { flush: () => { flushes.push(Date.now()); return true; } },
    payload,
    numbers,
    win: page.win, doc: page.doc, fetchFn: page.fetchFn, token: () => mem.get('authToken'),
    setIntervalFn: page.setIntervalFn, clearIntervalFn: page.clearIntervalFn,
  });
  return { page, saves, flushes, state, off, release: () => release?.() };
}

test('F8 . the autosave: every 5 minutes; a dirty item saves once, a clean one never', async () => {
  const r = rig();
  assert.equal(r.page.intervals.length, 1);
  assert.equal(r.page.intervals[0].ms, 5 * 60 * 1000, 'profile.save.autosaveMinutes');
  r.page.intervals[0].fn();
  await flushAll();
  assert.equal(r.saves.length, 1);
  assert.deepEqual(r.saves[0], { autosave: true });
  r.state.dirty = false;
  r.page.intervals[0].fn();
  await flushAll();
  assert.equal(r.saves.length, 1, 'a clean item: none');
  r.state.dirty = true; r.state.item = false;
  r.page.intervals[0].fn();
  await flushAll();
  assert.equal(r.saves.length, 1, 'no item open: none');
});

test('F8 . the autosave never starts a second save while one is in flight', async () => {
  const r = rig();
  r.state.hold = true;
  r.page.intervals[0].fn();
  await flushAll();
  r.page.intervals[0].fn();
  await flushAll();
  assert.equal(r.saves.length, 1, 'two ticks with a save in flight: one');
  r.release();
  await flushAll();
  r.state.hold = false;
  r.page.intervals[0].fn();
  await flushAll();
  assert.equal(r.saves.length, 2, 'once it settled, the next tick saves again');
});

test('F8 . Ctrl+S and Cmd+S: the default prevented and one save, when an item is open', () => {
  const saves = [];
  let prevented = 0;
  const key = (o) => ({ key: 's', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault: () => { prevented += 1; }, ...o });
  assert.equal(handleSaveKey(key({ ctrlKey: true }), { save: () => saves.push(1), hasItem: () => true }), true);
  assert.equal(handleSaveKey(key({ metaKey: true, key: 'S' }), { save: () => saves.push(1), hasItem: () => true }), true);
  assert.equal(saves.length, 2);
  assert.equal(prevented, 2);
  assert.equal(handleSaveKey(key({ ctrlKey: true }), { save: () => saves.push(1), hasItem: () => false }), true);
  assert.equal(saves.length, 2, 'no item: the browser\'s dialog is still kept away, nothing saved');
  assert.equal(isSaveKey(key({})), false);
  assert.equal(isSaveKey(key({ ctrlKey: true, altKey: true })), false);
  assert.equal(isSaveKey(key({ ctrlKey: true, key: 'z' })), false);
  // The page's key handler takes it beside Ctrl+Z, ahead of the field guard.
  const page = code(read('src/pages/ConfiguratorPage.jsx'));
  const at = page.indexOf('if (handleSaveKey(e, { save: saveNow');
  assert.ok(at > 0 && at < page.indexOf("if (tag === 'INPUT'") && at < page.indexOf("if (key === 'z' && !e.shiftKey)"));
});

test('F8 . pagehide with a 10 KB dirty body: the buffer written and ONE keepalive fetch to /api/rpc', () => {
  const body10 = { p_item_id: 'srv-1', p_name: 'Job', p_design: { note: 'x'.repeat(10 * 1024) } };
  const r = rig({ payload: () => body10 });
  r.page.fire('win', 'pagehide');
  assert.equal(r.flushes.length, 1, 'the buffer flushed');
  assert.equal(r.page.fetches.length, 1);
  const [{ url, init }] = r.page.fetches;
  assert.equal(url, '/api/rpc');
  assert.equal(RPC_ENDPOINT, '/api/rpc');
  assert.equal(init.method, 'POST');
  assert.equal(init.keepalive, true);
  assert.deepEqual(init.headers, { Authorization: 'Bearer tok-123', 'Content-Type': 'application/json' });
  // CHAT FIX 31.10.2026: JC's rpc.js reads `function`, not `name` (api/routes/rpc.js, js/api-client.js rpc()).
  assert.deepEqual(JSON.parse(init.body), { function: 'cc_save_item', params: body10 });
  // visibilitychange to hidden after it with the same body: not sent twice.
  r.page.doc.visibilityState = 'hidden';
  r.page.fire('doc', 'visibilitychange');
  assert.equal(r.flushes.length, 2);
  assert.equal(r.page.fetches.length, 1, 'the same body once');
});

test('F8 . one tab close is ONE keepalive even when the two events build different bodies (walk station e)', () => {
  let n = 0;
  const r = rig({ payload: () => ({ p_item_id: 'srv-1', p_name: 'Job', p_design: { saved_at: `t${(n += 1)}` } }) });
  r.page.doc.visibilityState = 'hidden';
  r.page.fire('doc', 'visibilitychange');
  r.page.fire('win', 'pagehide');
  assert.equal(r.flushes.length, 2, 'the buffer flushed on both events');
  assert.equal(r.page.fetches.length, 1, 'one leaving, one keepalive');
  // The joiner comes back to the tab and leaves again: one more.
  r.page.doc.visibilityState = 'visible';
  r.page.fire('doc', 'visibilitychange');
  r.page.doc.visibilityState = 'hidden';
  r.page.fire('doc', 'visibilitychange');
  assert.equal(r.page.fetches.length, 2, 'a new leaving after the page was visible again sends again');
});

test('F8 . pagehide with a 100 KB body: the buffer written and NO fetch; a clean item sends nothing', () => {
  const r = rig({ payload: () => ({ p_item_id: 'srv-1', p_name: 'Job', p_design: { note: 'x'.repeat(100 * 1024) } }) });
  r.page.fire('win', 'pagehide');
  assert.equal(r.flushes.length, 1);
  assert.equal(r.page.fetches.length, 0);
  const clean = rig({ dirty: false });
  clean.page.doc.visibilityState = 'hidden';
  clean.page.fire('doc', 'visibilitychange');
  assert.equal(clean.flushes.length, 1, 'the buffer is flushed whatever the flag');
  assert.equal(clean.page.fetches.length, 0);
  // visible again is not leaving.
  const back = rig();
  back.page.fire('doc', 'visibilitychange');
  assert.equal(back.flushes.length, 0);
});

test('F8 . the keepalive carries the same payload as the one save (the real store, the real builder)', () => {
  useProjectStore.getState().newProject('Keepalive', { id: 'srv-keep' });
  useProjectStore.getState().addUnit('BUD');
  assert.equal(useProjectStore.getState().dirty, true);
  const fetches = [];
  const out = keepaliveSave({
    payload: () => itemPayload({ stamp: false }), isDirty: () => useProjectStore.getState().dirty,
    hasItem: () => true, fetchFn: (u, i) => fetches.push({ u, i }),
  });
  assert.equal(out.sent, true);
  const sent = JSON.parse(fetches[0].i.body);
  assert.equal(sent.function, 'cc_save_item');
  assert.equal(sent.params.p_item_id, 'srv-keep');
  assert.equal('profile' in sent.params.p_design, false);
  assert.equal(sent.params.p_design.units.length, 1);
  assert.equal(useProjectStore.getState().dirty, true, 'building the keepalive marks nothing');
});

test('F8 . an export on a dirty item awaits one save first; a failed save says so and the export still runs', async () => {
  const order = [];
  let dirty = true;
  const said = [];
  const saveFirst = makeSaveFirst({
    isDirty: () => dirty, hasItem: () => true,
    save: async () => { order.push('save'); await flushAll(); return { stored: false, message: 'Not saved: Forbidden' }; },
    notify: (m, t) => said.push({ m, t }),
  });
  const onExport = () => { if (saveFirst(onExport)) return; order.push('export'); };
  onExport();
  assert.deepEqual(order, ['save'], 'the export waits');
  await flushAll(); await flushAll(); await flushAll();
  assert.deepEqual(order, ['save', 'export']);
  assert.deepEqual(said, [{ m: 'Not saved: Forbidden The export goes ahead from this browser.', t: 'warn' }]);
  dirty = false;
  onExport();
  assert.deepEqual(order, ['save', 'export', 'export'], 'a clean item exports at once, no save');
  // The export callbacks of the page each run behind it. AMENDED BY T-CC1b F5: `onDrawing` left with
  // the Output entries it served (*"Output tylko: cutting list, BOM PDF, labels 21 i 44"*, the owner,
  // 01.11.2026); the drawings leave from the Drawings window. Five callbacks remain, each behind the save.
  const page = code(read('src/pages/ConfiguratorPage.jsx'));
  assert.equal(page.includes('const onDrawing = useCallback('), false, 'the Output drawings road is gone');
  for (const [name, call] of [['onExportCsv', 'onExportCsv()'], ['onExportBom', 'onExportBom()'], ['onExportPdf', 'onExportPdf()'],
    ['onExportLabels', 'onExportLabels(opts)'], ['onExportDxfZip', 'onExportDxfZip(opts)']]) {
    const at = page.indexOf(`const ${name} = useCallback(`);
    assert.ok(at > 0, name);
    const body = page.slice(at, page.indexOf('}, [', at));
    assert.ok(body.includes(`if (saveFirst(() => ${call})) return;`), `${name} awaits the save`);
  }
});

test('F8 . the numbers come from the profile, none typed in the UI', () => {
  const r = rig({ numbers: saveNumbers({ save: { autosaveMinutes: 2, keepaliveMaxKb: 4 } }) });
  assert.equal(r.page.intervals[0].ms, 2 * 60 * 1000);
  r.state.dirty = true;
  // 10 KB is under the default ceiling and over this profile's 4 KB.
  const big = rig({ numbers: saveNumbers({ save: { keepaliveMaxKb: 4 } }), payload: () => ({ p_design: { note: 'x'.repeat(10 * 1024) } }) });
  big.page.fire('win', 'pagehide');
  assert.equal(big.page.fetches.length, 0);
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.match(page, /numbers: saveNumbers\(useCabinetProfileStore\.getState\(\)\.profile\)/);
  assert.doesNotMatch(code(read('src/lib/saveTriggers.js')), /\b(300000|65536)\b/);
});

test('F8 . the tab\'s own question is asked only when the buffer could not be flushed (App.jsx)', () => {
  const app = code(read('src/App.jsx'));
  assert.match(app, /if \(flushCrashBuffer\(\)\) return undefined;/);
  assert.match(app, /beforeunload/);
});

test('F8 . uninstall removes the listeners; no em or en dash in anything this F wrote', () => {
  const r = rig();
  r.off();
  assert.equal(r.page.listeners.win.size, 0);
  assert.equal(r.page.listeners.doc.size, 0);
  for (const rel of ['src/lib/saveTriggers.js', 'test/turn-cc1a-f08-triggers.test.js']) {
    assert.doesNotMatch(read(rel), /[\u2013\u2014]/, rel);
  }
});
