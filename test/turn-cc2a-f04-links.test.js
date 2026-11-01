/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F4 . THE LINKS CLIENT (law 3: A LINK IS THE COMPANY'S). The owner, 01.11.2026: *"najwazniejsze zeby te
// linki sie nigdy klientowi nie rozlaczyly z jego DB"*. Driven through the real `withDb` (lib/jcApi.js) against the
// fake Joinery Core of scripts/t-cc1a-fake-jc.mjs on a port of its own: the read, the two functions, every refusal.
import test from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const { startFakeJc, SEED_LINKS, FOREIGN_STOCK_ID } = await import('../scripts/t-cc1a-fake-jc.mjs');
const {
  LINK_COLUMNS, LINKS_NOT_SET_UP, LINKS_PER_CALL, LINK_NOT_SAVED, loadLinks, saveLinks, clearLink,
} = await import('../src/lib/jcLinks.js');
const { JC_OFFLINE } = await import('../src/lib/jcApi.js');
const { useMaterialLinkStore } = await import('../src/stores/materialLinkStore.js');

const PORT = 43917;
const fake = await startFakeJc({ port: PORT, upstream: 1 });
const ORIGIN = fake.origin;

/** JC's client as the shim draws it: `from(table).select()` to /api/db/query, `rpc` to /api/rpc, errors in words. */
function shimClient() {
  async function post(path, body) {
    const res = await fetch(`${ORIGIN}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Fake-Shim': '1', Authorization: 'Bearer tok-admin' },
      body: JSON.stringify(body),
    });
    let out = null;
    try { out = await res.json(); } catch { out = null; }
    if (!res.ok) return { data: null, error: { message: out?.error || res.statusText, status: res.status, code: out?.code || null } };
    return { data: out && Object.prototype.hasOwnProperty.call(out, 'data') ? out.data : out, error: null };
  }
  return {
    from(table) {
      const q = { table, select: '*', filters: [], order: [], limit: null };
      const b = {
        select(cols) { q.select = cols; return b; },
        order(col, o) { q.order.push({ col, ascending: !(o && o.ascending === false) }); return b; },
        then(ok, ko) { return post('/api/db/query', q).then(ok, ko); },
      };
      return b;
    },
    rpc(name, params) { return post('/api/rpc', { function: name, params: params || {} }); },
  };
}

globalThis.supabaseClient = shimClient();
mem.set('authToken', 'tok-admin');
const stockId = (n) => `5e0c4b1a-7f2d-4c3e-9a8b-${String(n).padStart(12, '0')}`;
const lastSelect = () => fake.state().log.filter((l) => l.table === 'cc_material_links').pop();

test.after(() => fake.close());

test('F4.1 · the read names its columns, every column but tenant_id, and gives the seed links', async () => {
  fake.reseed();
  const res = await loadLinks();
  assert.equal(res.status, 'ok');
  assert.equal(res.error, null);
  assert.equal(lastSelect().select, LINK_COLUMNS);
  assert.deepEqual(LINK_COLUMNS.split(',').map((s) => s.trim()),
    ['cc_material_id', 'stock_item_id', 'yield', 'sheet_width_mm', 'sheet_length_mm', 'coverage_m2_per_l', 'updated_by', 'updated_at']);
  assert.ok(!/tenant_id/.test(LINK_COLUMNS));
  assert.equal(res.links.size, 2);
  const mdf = res.links.get(SEED_LINKS.mdf18.cc_material_id);
  assert.equal(mdf.stock_item_id, SEED_LINKS.mdf18.stock_item_id);
  assert.equal(mdf.sheet_width_mm, 1220);
  assert.equal(mdf.sheet_length_mm, 2440);
});

test('F4.1 · 501 links are two calls of cc_save_material_links (500 per call)', async () => {
  fake.reseed();
  assert.equal(LINKS_PER_CALL, 500);
  const links = Array.from({ length: 501 }, (_, i) => ({ cc_material_id: `hinge.walk.${i}`, stock_item_id: stockId(5) }));
  const res = await saveLinks(links);
  assert.equal(res.error, null);
  assert.equal(res.calls, 2);
  assert.equal(res.saved, 501);
  assert.equal(fake.state().counters.rpc.cc_save_material_links, 2);
});

test('F4.1 · a sheet without its sizes is refused 22023 and the words reach the store, on the row', async () => {
  fake.reseed();
  useMaterialLinkStore.setState({ links: new Map(), rowErrors: {}, status: 'idle' });
  const out = await useMaterialLinkStore.getState().link([{ cc_material_id: 'sheet.mdf.22', stock_item_id: stockId(3) }]);
  assert.equal(out.ok, false);
  assert.equal(out.error, 'A sheet needs both its width and its length.');
  assert.equal(useMaterialLinkStore.getState().rowErrors['sheet.mdf.22'], 'A sheet needs both its width and its length.');
  assert.equal(useMaterialLinkStore.getState().links.has('sheet.mdf.22'), false);
  assert.equal(fake.state().counters.linkRefused['22023'], 1);
  // The other 22023 rules, each in its words.
  const bad = [
    [{ cc_material_id: 'Bad Id', stock_item_id: stockId(3) }, /is not a Cabinet Core material id/],
    [{ cc_material_id: 'sheet.mdf.22', stock_item_id: stockId(3), sheet_width_mm: 50, sheet_length_mm: 2440 }, /between 100 and 6000 mm/],
    [{ cc_material_id: 'sheet.mdf.22', stock_item_id: stockId(3), sheet_width_mm: 1220, sheet_length_mm: 2440, yield: 3.5 }, /yield of 1.0 to 3.0/],
    [{ cc_material_id: 'paint.bespoke', stock_item_id: stockId(8), coverage_m2_per_l: 0.01 }, /coverage must be between/],
  ];
  for (const [link, words] of bad) {
    const r = await saveLinks([link]);
    assert.match(String(r.error), words);
    assert.equal(r.status, 'refused');
  }
});

test('F4.1 · a stock row of another company is refused 42501, in its words', async () => {
  fake.reseed();
  const r = await saveLinks([{ cc_material_id: 'sheet.mdf.18', stock_item_id: FOREIGN_STOCK_ID, sheet_width_mm: 1220, sheet_length_mm: 2440 }]);
  assert.equal(r.status, 'refused');
  assert.equal(r.error, 'That stock item is not in your company\'s Joinery Core stock.');
  assert.equal(fake.state().counters.linkRefused['42501'], 1);
  const seeded = fake.state().links.rows.find((x) => x.cc_material_id === 'sheet.mdf.18');
  assert.equal(seeded.stock_item_id, SEED_LINKS.mdf18.stock_item_id, 'nothing was overwritten by the refused call');
});

test('F4.2 · link then unlink through the store: one call each, the store follows, nothing in a project', async () => {
  fake.reseed();
  useMaterialLinkStore.setState({ links: new Map(), rowErrors: {}, status: 'idle' });
  await useMaterialLinkStore.getState().load({ force: true });
  const s0 = useMaterialLinkStore.getState();
  assert.equal(s0.status, 'ok');
  assert.equal(s0.links.size, 2);
  assert.ok(s0.stock.length >= 10, 'the stock is read with the links');
  const ok = await s0.link([{ cc_material_id: 'sheet.mdf.22', stock_item_id: stockId(3), sheet_width_mm: 1220, sheet_length_mm: 2440, yield: 1.1 }]);
  assert.equal(ok.ok, true);
  assert.equal(useMaterialLinkStore.getState().links.get('sheet.mdf.22').sheet_length_mm, 2440);
  assert.equal(fake.state().links.rows.length, 3);
  const un = await useMaterialLinkStore.getState().unlink('sheet.mdf.22');
  assert.equal(un.ok, true);
  assert.equal(useMaterialLinkStore.getState().links.has('sheet.mdf.22'), false);
  assert.equal(fake.state().links.rows.length, 2);
  const again = await clearLink('sheet.mdf.22');
  assert.equal(again.cleared, false, 'clearing a link that is not there answers cleared: false');
  // The store holds no project and writes none.
  assert.ok(!('project' in useMaterialLinkStore.getState()));
});

test('F4.1 · CC_FAKE_NO_LINKS (the SQL not run): "not set up" in words, never a throw', async () => {
  fake.reseed();
  fake.setLinks(false);
  try {
    const read = await loadLinks();
    assert.equal(read.status, 'not-set-up');
    assert.equal(read.error, LINKS_NOT_SET_UP);
    assert.equal(read.links.size, 0);
    const save = await saveLinks([{ cc_material_id: 'sheet.mdf.18', stock_item_id: stockId(9), sheet_width_mm: 1220, sheet_length_mm: 2440 }]);
    assert.equal(save.status, 'not-set-up');
    assert.equal(save.error, LINKS_NOT_SET_UP);
    const clear = await clearLink('sheet.mdf.18');
    assert.equal(clear.status, 'not-set-up');
    useMaterialLinkStore.setState({ status: 'idle' });
    await useMaterialLinkStore.getState().load({ force: true });
    assert.equal(useMaterialLinkStore.getState().status, 'not-set-up');
    assert.equal(useMaterialLinkStore.getState().error, LINKS_NOT_SET_UP);
    assert.ok(useMaterialLinkStore.getState().stock.length >= 10, 'the stock still reads');
  } finally {
    fake.setLinks(true);
  }
});

test('F4.1 · the env switch CC_FAKE_NO_LINKS=1 starts the fake without the JC half', async () => {
  process.env.CC_FAKE_NO_LINKS = '1';
  const off = await startFakeJc({ port: PORT + 1, upstream: 1 });
  delete process.env.CC_FAKE_NO_LINKS;
  try {
    assert.equal(off.state().links.on, false);
  } finally {
    await off.close();
  }
});

test('F4.1 · Joinery Core not answering: JC_OFFLINE in words, never a throw', async () => {
  const keep = globalThis.supabaseClient;
  delete globalThis.supabaseClient;
  try {
    const read = await loadLinks();
    assert.equal(read.status, 'offline');
    assert.equal(read.error, JC_OFFLINE);
    const save = await saveLinks([{ cc_material_id: 'sheet.mdf.18', stock_item_id: stockId(9) }]);
    // INT, after Ewa's check (O4): JC_OFFLINE says the work is kept in this browser; a link is not, so a save says so.
    assert.equal(save.error, LINK_NOT_SAVED);
    assert.equal(save.status, 'offline');
    assert.equal((await clearLink('sheet.mdf.18')).error, LINK_NOT_SAVED);
    const thrown = { cc_material_id: 'x', stock_item_id: 'y' };
    const viaThrow = await saveLinks([thrown], { db: async () => { throw new Error('boom'); } }).catch(() => 'threw');
    assert.notEqual(viaThrow, 'threw');
  } finally {
    globalThis.supabaseClient = keep;
  }
});

test('F4.3 · the fake\'s two seed links name entries of the catalogue and rows of the fake\'s stock', async () => {
  const { entryById } = await import('../src/engine/catalogue.js');
  fake.reseed();
  const rows = fake.state().links.rows;
  assert.equal(rows.length, 2);
  for (const l of Object.values(SEED_LINKS)) {
    assert.ok(entryById(l.cc_material_id), `${l.cc_material_id} is a catalogue entry`);
    assert.ok(rows.some((r) => r.cc_material_id === l.cc_material_id && r.stock_item_id === l.stock_item_id));
  }
  assert.equal(entryById(SEED_LINKS.mdf18.cc_material_id).department, 'sheets');
  assert.equal(entryById(SEED_LINKS.hinge.cc_material_id).department, 'hinges');
});
