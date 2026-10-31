/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F9 . NOTHING IS LOST IN A CRASH (CLAUDE.md T-CC1a law 7). The owner, 30.10.2026: *"moje zdanie to powinno
// sie wszystko zapisywac na pamiec podreczna, dopiero caly json powinien sie zapisac do DB przy nacisnieciu Zapisz
// lub co 5 minut automatycznie"*. The real store writing a fake browser storage; the boot question's own list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** A browser's localStorage: getItem / setItem / removeItem / key / length. */
function fakeStorage() {
  const m = new Map();
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}
const mem = fakeStorage();
globalThis.localStorage = mem;

const {
  bootOffers, bufferKey, bufferOffWords, clearOtherTenants, listBuffers, offerQuestion, readBuffer, writeBuffer,
  RESTORED_WORDS,
} = await import('../src/lib/crashBuffer.js');
const { useProjectStore, flushCrashBuffer } = await import('../src/stores/projectStore.js');
const { useAuthStore } = await import('../src/stores/authStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const { persistProject } = await import('../src/lib/persist.js');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TENANT = 'tenant-a';
useAuthStore.setState({ tenant: { id: TENANT, name: 'Skylon' } });

function job(id = 'srv-1') {
  useProjectStore.getState().newProject('Wardrobe bedroom 2', { id, number: '2601' });
  useProjectStore.getState().addUnit('WARDROBE');
}

test('F9 . an edit writes the buffer under the tenant and item key within 250 ms', async () => {
  job('srv-edit');
  await wait(300);
  const key = bufferKey(TENANT, 'srv-edit');
  assert.equal(key, 'cc.tenant-a.item.srv-edit.buffer.v1');
  const b = readBuffer(mem, key);
  assert.ok(b, 'written');
  assert.equal(b.dirty, true);
  assert.equal(b.savedAt, null);
  assert.equal(typeof b.at, 'number');
  assert.equal(b.design.format, 'cabinet-core-project');
  assert.equal('profile' in b.design, false);
  assert.equal(b.design.units.length, 1);
  assert.equal([...mem.m.keys()].some((k) => /cc\.project\.cache/.test(k)), false, 'the old cache key is never written');
  // At most once per 250 ms: a burst of edits writes once.
  let writes = 0;
  const set = mem.setItem;
  mem.setItem = (k, v) => { if (k === key) writes += 1; set(k, v); };
  for (let i = 0; i < 5; i += 1) useProjectStore.getState().setProjectName(`Burst ${i}`);
  await wait(300);
  mem.setItem = set;
  assert.equal(writes, 1);
  assert.equal(readBuffer(mem, key).design.project.name, 'Burst 4');
});

test('F9 . a save marks the buffer dirty: false (markSaved writes it once more)', async () => {
  job('srv-save');
  const rpc = [];
  globalThis.supabaseClient = { rpc: async (name, params) => { rpc.push(name); return { data: { id: params.p_item_id, updated_at: '2026-10-31T12:00:00Z', revision: 'A' }, error: null }; } };
  try {
    const r = await persistProject({});
    assert.equal(r.stored, true);
  } finally { delete globalThis.supabaseClient; }
  const b = readBuffer(mem, bufferKey(TENANT, 'srv-save'));
  assert.equal(b.dirty, false, 'at once, no throttle');
  assert.equal(b.savedAt, '2026-10-31T12:00:00Z');
});

test('F9 . a dirty buffer newer than the row is offered at boot; Restore reproduces the edited units byte for byte', async () => {
  job('srv-crash');
  useProjectStore.getState().addUnit('BUD');
  flushCrashBuffer();
  const edited = JSON.stringify(useProjectStore.getState().units);
  const at = readBuffer(mem, bufferKey(TENANT, 'srv-crash')).at;
  // The tab dies. A new boot: the store is something else, the list loads.
  useProjectStore.getState().newProject('Something else', { id: 'srv-else' });
  const row = { id: 'srv-crash', name: 'Wardrobe bedroom 2', revision: 'A', updated_at: new Date(at - 60000).toISOString(), archived_at: null, jc_project_number: '2601' };
  const offers = bootOffers({ storage: mem, tenantId: TENANT, items: [row] });
  const mine = offers.filter((o) => o.itemId === 'srv-crash');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].exists, true);
  assert.match(offerQuestion(mine[0]), /^Restore unsaved changes to Wardrobe bedroom 2 \(\d\d\.\d\d \d\d:\d\d\)\?$/);
  // Restore, as the start screen runs it: the buffer's design under the row, dirty.
  const res = useProjectStore.getState().openItemDesign(mine[0].item, mine[0].design, { client: 'Mrs Kowalski', dirty: true });
  assert.equal(res.ok, true);
  // loadProject's migrations stamp `shelf_schema: 2` on a unit never loaded before (migrateUnitShelves, as in F7):
  // that one key is the migration's; every key the edit wrote comes back byte for byte.
  const back = useProjectStore.getState().units.map((u) => {
    const { shelf_schema: _s, ...params } = u.params;
    return { ...u, params };
  });
  assert.equal(JSON.stringify(back), edited, 'the edited units, byte for byte');
  assert.equal(useProjectStore.getState().dirty, true, 'opened unsaved, never saved in silence');
  assert.equal(useProjectStore.getState().project.id, 'srv-crash');
  assert.equal(useProjectStore.getState().project.savedAt, row.updated_at);
  assert.equal(RESTORED_WORDS, 'Not saved yet: press Ctrl+S');
  const start = code(read('src/components/StartScreen.jsx'));
  assert.match(start, /openItemDesign\(offer\.item, offer\.design, \{[\s\S]*?dirty: true,/);
  assert.match(start, /notify\(RESTORED_WORDS, 'warn'\)/);
  assert.match(start, /bootOffers\(\{ storage, tenantId: tenant\.id, items: list\.items \}\)/);
});

test('F9 . an older buffer is not offered; a clean one is not; Discard clears it; a gone item offers Save as new item', () => {
  const s = fakeStorage();
  const design = { format: 'cabinet-core-project', version: 1, project: { name: 'Old' }, units: [] };
  writeBuffer(s, bufferKey(TENANT, 'old'), { dirty: true, at: Date.parse('2026-10-30T10:00:00Z'), design });
  writeBuffer(s, bufferKey(TENANT, 'clean'), { dirty: false, at: Date.parse('2026-10-31T10:00:00Z'), design });
  writeBuffer(s, bufferKey(TENANT, 'gone'), { dirty: true, at: Date.parse('2026-10-31T10:00:00Z'), design: { ...design, project: { name: 'Gone job' } } });
  const items = [
    { id: 'old', name: 'Old', updated_at: '2026-10-31T09:00:00Z', archived_at: null },
    { id: 'clean', name: 'Clean', updated_at: '2026-10-30T09:00:00Z', archived_at: null },
  ];
  const offers = bootOffers({ storage: s, tenantId: TENANT, items });
  assert.deepEqual(offers.map((o) => [o.itemId, o.exists, o.name]), [['gone', false, 'Gone job']]);
  const start = code(read('src/components/StartScreen.jsx'));
  assert.match(start, /offer\.exists \?/);
  assert.match(start, />Save as new item</);
  assert.match(start, /createItem\(\{ name: offer\.name, project \}\)/);
  assert.match(start, /clearBuffer\(storage, offer\.key\)/);
  // Discard: the start screen's clearBuffer.
  const { clearBuffer } = { clearBuffer: (st, k) => st.removeItem(k) };
  clearBuffer(s, offers[0].key);
  assert.equal(readBuffer(s, bufferKey(TENANT, 'gone')), null);
  assert.deepEqual(bootOffers({ storage: s, tenantId: TENANT, items }), []);
});

test('F9 . a 2 MB design is not buffered, and the words appear', async () => {
  const said = [];
  const notify = useUiStore.getState().notify;
  useUiStore.setState({ notify: (m, t) => said.push({ m, t }) });
  try {
    job('srv-big');
    flushCrashBuffer();
    assert.ok(readBuffer(mem, bufferKey(TENANT, 'srv-big')));
    useProjectStore.setState((st) => ({ project: { ...st.project, note: 'x'.repeat(2 * 1024 * 1024) } }));
    const before = readBuffer(mem, bufferKey(TENANT, 'srv-big'));
    assert.equal(flushCrashBuffer(), false);
    assert.deepEqual(said, [{ m: 'Crash buffer off: the item is over 1 MB', t: 'warn' }]);
    assert.deepEqual(readBuffer(mem, bufferKey(TENANT, 'srv-big')), before, 'the big design was not written');
    assert.equal(flushCrashBuffer(), false);
    assert.equal(said.length, 1, 'said once, when the buffer goes off');
  } finally { useUiStore.setState({ notify }); }
  assert.equal(bufferOffWords(1), 'Crash buffer off: the item is over 1 MB');
  const r = writeBuffer(fakeStorage(), 'k', { design: { note: 'x'.repeat(2 * 1024 * 1024) } }, { maxMb: 1 });
  assert.deepEqual(r, { ok: false, error: 'Crash buffer off: the item is over 1 MB' });
  const full = { setItem: () => { throw Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' }); } };
  assert.match(writeBuffer(full, 'k', { design: {} }).error, /storage for the app is full/);
});

test('F9 . a buffer of tenant A is not listed for tenant B and is cleared', () => {
  const s = fakeStorage();
  const design = { project: { name: 'A job' }, units: [] };
  writeBuffer(s, bufferKey('tenant-a', 'x1'), { dirty: true, at: Date.now(), design });
  writeBuffer(s, bufferKey('tenant-b', 'y1'), { dirty: true, at: Date.now(), design });
  s.setItem('cc.profile.v1', '{}');
  assert.deepEqual(listBuffers(s, 'tenant-b').map((b) => b.itemId), ['y1']);
  const offers = bootOffers({ storage: s, tenantId: 'tenant-b', items: [] });
  assert.deepEqual(offers.map((o) => o.itemId), ['y1']);
  assert.equal(readBuffer(s, bufferKey('tenant-a', 'x1')), null, "tenant A's buffer cleared");
  assert.equal(s.getItem('cc.profile.v1'), '{}', 'nothing else touched');
  assert.deepEqual(clearOtherTenants(s, 'tenant-b'), []);
});

test('F9 . the module-load read is gone: the store opens blank; the key and the old cache are named nowhere in src/', () => {
  const store = code(read('src/stores/projectStore.js'));
  assert.doesNotMatch(store, /loadCache|const cached\b/);
  assert.match(store, /onSignedOutFlush\(\(\) => \{ flushCrashBuffer\(\); \}\)/, 'a sign-out elsewhere flushes first');
  assert.match(store, /markSaved: \(project\) => \{ set\(\(s\) => \(\{ project: project \|\| s\.project, dirty: false \}\)\); flushCrashBuffer\(\); \}/);
  for (const rel of ['src/stores/projectStore.js', 'src/stores/persistence.js', 'src/lib/crashBuffer.js']) {
    assert.doesNotMatch(read(rel), /cc\.project\.cache\.v1/, rel);
  }
});

test('F9 . no em or en dash in anything this F wrote', () => {
  for (const rel of ['src/lib/crashBuffer.js', 'test/turn-cc1a-f09-crash-buffer.test.js']) {
    assert.doesNotMatch(read(rel), /[\u2013\u2014]/, rel);
  }
});
