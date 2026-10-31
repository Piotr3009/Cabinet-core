/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F4 . THE START SCREEN IS JOINERY CORE'S PROJECT LIST (law 3). The owner, 30.10.2026: *"w cc musimy
// zapisywac na glownej stronie; projekty dzielimy na itemy; kazdy projekt dodany to folder w JC"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JC_OFFLINE } from '../src/lib/jcApi.js';
import {
  LIST_COLUMNS, LIST_GROUPS, LIST_STATUS, RECENT_LIMIT, allProjects, archiveItem, groupItems, itemKey, listView, loadJcList,
  projectKey, projectRow, pushRecent, readRecent, recentKey,
} from '../src/lib/jcList.js';
import { memoryStorage } from '../src/lib/projectLibrary.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const ROWS = {
  pipeline_projects: [{ id: 'pl1', project_number: 'PL-007', name: 'Loft study', client_id: 'c2', site_address: '', status: 'active' }],
  projects: [
    { id: 'p2', project_number: '2602', name: 'Hampstead kitchen', client_id: 'c1', site_address: '', status: 'active', pipeline_id: null },
    { id: 'p1', project_number: '2601', name: 'Bedroom wardrobes', client_id: 'c2', site_address: '', status: 'active', pipeline_id: null },
  ],
  clients: [{ id: 'c1', company_name: 'Okafor Ltd' }, { id: 'c2', company_name: 'Mrs Kowalski' }],
  cc_items: [
    { id: 'i1', name: 'Kitchen run', revision: 'A', updated_at: '2026-10-30T10:00:00Z', archived_at: null, jc_pipeline_id: null, jc_project_id: 'p2', jc_project_number: '2602' },
    { id: 'i2', name: 'Island', revision: null, updated_at: '2026-10-31T10:00:00Z', archived_at: null, jc_pipeline_id: null, jc_project_id: 'p2', jc_project_number: '2602' },
    { id: 'i3', name: 'Study desk', revision: null, updated_at: '2026-10-29T10:00:00Z', archived_at: null, jc_pipeline_id: 'pl1', jc_project_id: null, jc_project_number: 'PL-007' },
    { id: 'i4', name: 'Old pantry', revision: 'B', updated_at: '2026-10-01T10:00:00Z', archived_at: '2026-10-20T10:00:00Z', jc_pipeline_id: null, jc_project_id: 'p2', jc_project_number: '2602' },
  ],
};

/** A fake JC client that records every from/select/eq/order/single and answers from ROWS (or an error). */
function fakeClient({ rows = ROWS, error = null, single = null } = {}) {
  const log = { selects: [], rpc: [], eqs: [], orders: [] };
  const from = (table) => {
    const q = { table, select: null, eq: [], order: [], single: false };
    const chain = {
      select: (cols) => { q.select = cols; log.selects.push({ table, cols }); return chain; },
      eq: (k, v) => { q.eq.push([k, v]); log.eqs.push([table, k, v]); return chain; },
      order: (k, o) => { q.order.push([k, o]); log.orders.push([table, k, o?.ascending]); return chain; },
      limit: () => chain,
      single: () => { q.single = true; return chain; },
      maybeSingle: () => { q.single = true; return chain; },
      then: (res, rej) => {
        if (error) return Promise.resolve({ data: null, error }).then(res, rej);
        if (q.single) return Promise.resolve({ data: single, error: single ? null : { message: 'not found' } }).then(res, rej);
        return Promise.resolve({ data: rows[table] || [], error: null }).then(res, rej);
      },
    };
    log.last = q;
    return chain;
  };
  return {
    log,
    client: {
      from,
      rpc: (name, params) => { log.rpc.push({ name, params }); return Promise.resolve({ data: { ok: true }, error: null }); },
      auth: { getSession: () => { throw new Error('never'); } },
    },
  };
}
async function withClient(client, fn) {
  const before = globalThis.supabaseClient;
  globalThis.supabaseClient = client;
  try { return await fn(); } finally { if (before === undefined) delete globalThis.supabaseClient; else globalThis.supabaseClient = before; }
}

test('F4 · the four reads are named with their columns; the LIST read of cc_items has no * and no design', async () => {
  const fake = fakeClient();
  const list = await withClient(fake.client, () => loadJcList());
  assert.equal(list.error, null);
  const byTable = Object.fromEntries(fake.log.selects.map((s) => [s.table, s.cols]));
  assert.deepEqual(Object.keys(byTable).sort(), ['cc_items', 'clients', 'pipeline_projects', 'projects']);
  assert.equal(byTable.pipeline_projects, 'id, project_number, name, client_id, site_address, status');
  assert.equal(byTable.projects, 'id, project_number, name, client_id, site_address, status, pipeline_id');
  assert.equal(byTable.clients, 'id, company_name');
  assert.equal(byTable.cc_items, 'id, name, revision, updated_at, archived_at, jc_pipeline_id, jc_project_id, jc_project_number');
  for (const s of fake.log.selects) {
    if (s.table !== 'cc_items') continue;
    assert.doesNotMatch(s.cols, /\*/);
    assert.doesNotMatch(s.cols, /design/);
  }
  assert.deepEqual(LIST_COLUMNS.cc_items, byTable.cc_items);
  // The list's filter (PROPOSED): status 'active' on both project tables, ordered by project_number desc.
  assert.equal(LIST_STATUS, 'active');
  assert.deepEqual(fake.log.eqs.sort(), [['pipeline_projects', 'status', 'active'], ['projects', 'status', 'active']]);
  assert.deepEqual(fake.log.orders.filter(([t]) => t !== 'cc_items').sort(),
    [['pipeline_projects', 'project_number', false], ['projects', 'project_number', false]]);
  assert.equal(list.clients.get('c1'), 'Okafor Ltd');
  assert.equal(list.production.length, 2);
  assert.equal(list.pipeline.length, 1);
});

test('F4 · grouping: two items under their production project, one under the pipeline project; Production first', async () => {
  const fake = fakeClient();
  const list = await withClient(fake.client, () => loadJcList());
  assert.equal(projectKey('production', 'p2'), 'p:p2');
  assert.equal(projectKey('pipeline', 'pl1'), 'pl:pl1');
  assert.equal(itemKey(ROWS.cc_items[2]), 'pl:pl1');
  assert.deepEqual(LIST_GROUPS.map((x) => x.label), ['Production', 'Pipeline'], 'PROPOSED order');
  assert.deepEqual(projectRow('production', ROWS.projects[0], list.clients),
    { key: 'p:p2', kind: 'production', id: 'p2', number: '2602', name: 'Hampstead kitchen', client: 'Okafor Ltd' });
  const g = groupItems(list.items.filter((it) => !it.archived_at));
  assert.deepEqual(g.get('p:p2').map((it) => it.id), ['i2', 'i1'], 'newest first');
  assert.deepEqual(g.get('pl:pl1').map((it) => it.id), ['i3']);
  const view = listView(list);
  assert.deepEqual(view.map((x) => x.label), ['Production', 'Pipeline']);
  const kitchen = view[0].projects.find((p) => p.id === 'p2');
  assert.equal(kitchen.number, '2602');
  assert.equal(kitchen.client, 'Okafor Ltd');
  assert.equal(kitchen.items.length, 2);
  assert.equal(view[0].projects.find((p) => p.id === 'p1').items.length, 0, 'a project without items: No items yet');
  assert.equal(view[1].projects[0].items[0].name, 'Study desk');
  assert.deepEqual(allProjects(list).map((p) => p.key), ['p:p2', 'p:p1', 'pl:pl1'], 'Production first, number desc');
});

test('F4 · an archived item is hidden until Show archived; Archive and Restore are cc_archive_item', async () => {
  const fake = fakeClient();
  const list = await withClient(fake.client, () => loadJcList());
  const ids = (v) => v.flatMap((g) => g.projects.flatMap((p) => p.items.map((it) => it.id)));
  assert.ok(!ids(listView(list)).includes('i4'));
  assert.ok(ids(listView(list, { showArchived: true })).includes('i4'));
  await withClient(fake.client, () => archiveItem('i1'));
  await withClient(fake.client, () => archiveItem('i4', { restore: true }));
  assert.deepEqual(fake.log.rpc, [
    { name: 'cc_archive_item', params: { p_item_id: 'i1', p_restore: false } },
    { name: 'cc_archive_item', params: { p_item_id: 'i4', p_restore: true } },
  ]);
  const src = code(read('src/components/StartScreen.jsx'));
  assert.match(src, /Show archived/);
  assert.match(src, /Restore/);
  assert.match(src, /archiveItem\(item\.id, \{ restore \}\)/);
});

test('F4 · the search narrows by client name (and by number, project name and item name)', async () => {
  const fake = fakeClient();
  const list = await withClient(fake.client, () => loadJcList());
  const kow = listView(list, { query: 'kowalski' });
  assert.deepEqual(kow.flatMap((g) => g.projects.map((p) => p.id)), ['p1', 'pl1']);
  assert.deepEqual(listView(list, { query: '2602' }).flatMap((g) => g.projects.map((p) => p.id)), ['p2']);
  const island = listView(list, { query: 'island' });
  assert.deepEqual(island.flatMap((g) => g.projects.flatMap((p) => p.items.map((it) => it.id))), ['i2']);
});

test('F4 · the JC error path: the words, never an empty list in silence; the screen offers Retry', async () => {
  const none = await withClient(undefined, () => loadJcList());
  assert.equal(none.error, JC_OFFLINE);
  const refused = await withClient(fakeClient({ error: { message: 'Forbidden: Cabinet Core is not enabled' } }).client, () => loadJcList());
  assert.equal(refused.error, 'Forbidden: Cabinet Core is not enabled');
  assert.deepEqual(listView({ ...refused }).flatMap((g) => g.projects), []);
  const src = code(read('src/components/StartScreen.jsx'));
  assert.match(src, /list\?\.error && \(/);
  assert.match(src, /\{list\.error\}/);
  assert.match(src, />Retry</);
  assert.doesNotMatch(src, /nextProjectNumber|deleteLocalProject|listLocalProjects|cc\.library/);
});

test('F4 · Recent is the last five opened ITEM ids per tenant, under cc.<tenant>.recent.v1', () => {
  const s = memoryStorage();
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'b']) pushRecent(s, 't1', id);
  assert.equal(recentKey('t1'), 'cc.t1.recent.v1');
  assert.deepEqual(readRecent(s, 't1'), ['b', 'f', 'e', 'd', 'c']);
  assert.equal(RECENT_LIMIT, 5);
  assert.deepEqual(readRecent(s, 't2'), [], 'another tenant sees none of it');
});

test('F4 · the header shows the company and the signed-in name from /me', () => {
  const src = code(read('src/components/StartScreen.jsx'));
  assert.match(src, /useAuthStore\(\(s\) => s\.tenant\)/);
  assert.match(src, /tenant\?\.name/);
  assert.match(src, /user\?\.full_name/);
});

const OWNER = JSON.parse(read('verify/t86b/owner.ccproject'));

test('F4 · openItem reads the design by id (one read) and loadProject receives the inner project and units', async () => {
  const design = { format: 'cabinet-core-project', version: 1, project: { ...OWNER.project, jc_tenant_id: 'x', jc_project_id: 'y' }, units: OWNER.units, assignments: null };
  const row = { id: 'srv-1', name: 'Owner wardrobe', revision: 'A', design, jc_pipeline_id: null, jc_project_id: 'p1', jc_project_number: '2601', updated_at: '2026-10-31T09:00:00Z' };
  const fake = fakeClient({ single: row });
  const original = useProjectStore.getState().loadProject;
  const seen = [];
  useProjectStore.setState({ loadProject: (p, u) => { seen.push({ p, u }); return original(p, u); } });
  try {
    const res = await withClient(fake.client, () => useProjectStore.getState().openItem('srv-1', { client: 'Mrs Kowalski' }));
    assert.deepEqual(res, { ok: true, error: null });
  } finally { useProjectStore.setState({ loadProject: original }); }
  assert.equal(fake.log.selects.length, 1, 'ONE read');
  assert.equal(fake.log.selects[0].table, 'cc_items');
  assert.equal(fake.log.selects[0].cols, 'id, name, revision, design, jc_pipeline_id, jc_project_id, jc_project_number, updated_at');
  assert.deepEqual(fake.log.last.eq, [['id', 'srv-1']]);
  assert.equal(seen.length, 1);
  assert.equal(JSON.stringify(seen[0].u), JSON.stringify(OWNER.units), 'the design\'s units, as they are');
  assert.equal(seen[0].p.room.height, OWNER.project.room.height, 'the inner project');
  assert.equal(seen[0].p.jc_tenant_id, undefined, 'the design\'s binding fields are ignored');
  assert.equal(seen[0].p.jc_project_id, undefined);
  const { project, dirty, units } = useProjectStore.getState();
  assert.equal(project.id, 'srv-1');
  assert.equal(project.name, 'Owner wardrobe');
  assert.equal(project.number, '2601');
  assert.equal(project.client, 'Mrs Kowalski');
  assert.equal(project.savedAt, '2026-10-31T09:00:00Z');
  assert.equal(units.length, OWNER.units.length);
  assert.equal(dirty, false, 'markSaved');
});

test('F4 · a newer design version is refused in words and nothing loads', async () => {
  useProjectStore.getState().newProject('Before');
  const row = { id: 'srv-2', name: 'Future', revision: null, design: { format: 'cabinet-core-project', version: 9, project: OWNER.project, units: OWNER.units }, jc_project_number: '2601', updated_at: 'x' };
  const res = await withClient(fakeClient({ single: row }).client, () => useProjectStore.getState().openItem('srv-2'));
  assert.equal(res.ok, false);
  assert.match(res.error, /newer Cabinet Core \(version 9\)/);
  assert.equal(useProjectStore.getState().project.name, 'Before');
  assert.equal(useProjectStore.getState().units.length, 0);
});

test('F4 · the number and the client are read-only: setProjectInfo edits the item name alone', () => {
  useProjectStore.getState().newProject('Item', { id: 'srv-3', number: '2601', client: 'Okafor Ltd' });
  useProjectStore.getState().setProjectInfo({ name: 'Renamed', number: '9999', client: 'Someone' });
  const p = useProjectStore.getState().project;
  assert.deepEqual([p.name, p.number, p.client], ['Renamed', '2601', 'Okafor Ltd']);
});
