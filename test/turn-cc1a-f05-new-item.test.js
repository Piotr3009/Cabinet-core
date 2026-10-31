/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F5 . NEW ITEM BINDS TO A JC PROJECT (law 4). The owner, 30.10.2026: *"automatyczne polaczenie danego
// projektu do danego pipelinu lub production projektu"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { JC_OFFLINE } from '../src/lib/jcApi.js';
import { createItem, startItem } from '../src/lib/jcList.js';
import { memoryStorage, saveLocalProject } from '../src/lib/projectLibrary.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
function filesUnder(dir) {
  const out = [];
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...filesUnder(p));
    else if (/\.(js|jsx|mjs)$/.test(p)) out.push(p);
  }
  return out;
}

const UUID = '6f1c2a9e-3b4d-4e5f-8a7b-0c1d2e3f4a5b';
const PIPELINE = { key: 'pl:pl1', kind: 'pipeline', id: 'pl1', number: 'PL-007', name: 'Loft study', client: 'Mrs Kowalski' };
const PRODUCTION = { key: 'p:p2', kind: 'production', id: 'p2', number: '2602', name: 'Hampstead kitchen', client: 'Okafor Ltd' };

/** A fake JC whose rpc records every call; `cc_create_item` answers a row without design, or the given error. */
function fakeJc({ error = null } = {}) {
  const calls = [];
  return {
    calls,
    client: {
      from: () => { throw new Error('New item reads nothing'); },
      rpc: (name, params) => {
        calls.push({ name, params });
        if (error) return Promise.resolve({ data: null, error });
        const number = params.p_project_id ? '2602' : 'PL-007';
        return Promise.resolve({ data: { id: UUID, name: params.p_name, revision: null, jc_project_number: number, jc_pipeline_id: params.p_pipeline_id ?? null, jc_project_id: params.p_project_id ?? null }, error: null });
      },
    },
  };
}
async function withClient(client, fn) {
  const before = globalThis.supabaseClient;
  if (client === undefined) delete globalThis.supabaseClient; else globalThis.supabaseClient = client;
  try { return await fn(); } finally { if (before === undefined) delete globalThis.supabaseClient; else globalThis.supabaseClient = before; }
}
/** The flow's own act, as commitProject runs it: startItem with the store's newProject. */
const click = (name, project) => startItem({ name, project, newProject: useProjectStore.getState().newProject });

test('F5 · opened from a pipeline project: cc_create_item with p_pipeline_id and no p_project_id', async () => {
  const jc = fakeJc();
  const res = await withClient(jc.client, () => click('Study desk', PIPELINE));
  assert.equal(res.ok, true);
  assert.deepEqual(jc.calls, [{ name: 'cc_create_item', params: { p_name: 'Study desk', p_pipeline_id: 'pl1' } }]);
  assert.equal('p_project_id' in jc.calls[0].params, false);
});

test('F5 · opened from a production project: p_project_id and no p_pipeline_id; the record is the server\'s', async () => {
  useProjectStore.getState().newProject('Before');
  const jc = fakeJc();
  const res = await withClient(jc.client, () => click('Kitchen', PRODUCTION));
  assert.equal(res.ok, true);
  assert.deepEqual(jc.calls, [{ name: 'cc_create_item', params: { p_name: 'Kitchen', p_project_id: 'p2' } }]);
  const p = useProjectStore.getState().project;
  assert.equal(p.id, UUID, 'the id is the server\'s uuid');
  assert.equal(p.number, '2602', 'the number is the returned jc_project_number');
  assert.equal(p.client, 'Okafor Ltd', 'the client is the project\'s');
  assert.equal(p.name, 'Kitchen');
  assert.equal(p.jc_tenant_id, undefined, 'the binding lives in the row, not in the design');
  assert.equal(p.jc_project_id, undefined);
});

test('F5 · a 403 leaves no record and gives the words; JC not answering the same', async () => {
  useProjectStore.getState().newProject('Before', { id: 'srv-before' });
  const refused = await withClient(fakeJc({ error: { message: 'Cabinet Core is not enabled for this company' } }).client, () => click('Kitchen', PRODUCTION));
  assert.deepEqual(refused, { ok: false, row: null, error: 'Cabinet Core is not enabled for this company' });
  assert.equal(useProjectStore.getState().project.id, 'srv-before', 'nothing created locally');
  const offline = await withClient(undefined, () => createItem({ name: 'Kitchen', project: PRODUCTION }));
  assert.deepEqual(offline, { row: null, error: JC_OFFLINE });
  assert.equal(useProjectStore.getState().project.name, 'Before');
});

test('F5 · the flow shows the project read-only, types the item name alone, and runs startItem', () => {
  const flow = code(read('src/components/NewProjectFlow.jsx'));
  assert.match(flow, /title="New item"/);
  assert.match(flow, /data-jc-project-field=\{key\} readOnly/);
  assert.match(flow, /placeholder="Kitchen, Wardrobe bedroom 2 \.\.\."/);
  assert.match(flow, /data-project-field="name" required/);
  assert.doesNotMatch(flow, /data-project-field=\{key\}/, 'number and client are not typed');
  assert.doesNotMatch(flow, /initialNumber|Import from Joinery Core/);
  assert.match(flow, /startItem\(\{/);
  assert.match(flow, /if \(!born\.ok\) \{ setRefusal\(born\.error\); return; \}/);
  const start = code(read('src/components/StartScreen.jsx'));
  assert.match(start, /jcProject=\{flow\.project\}/);
});

test('F5 · the item name is editable in the editor where the project name was (the top bar\'s title field)', () => {
  const top = code(read('src/components/TopBar.jsx'));
  assert.match(top, /onChange=\{\(e\) => setProjectName\(e\.target\.value\)\}/);
  useProjectStore.getState().newProject('Kitchen', { id: UUID, number: '2602' });
  useProjectStore.getState().setProjectName('Kitchen island');
  assert.equal(useProjectStore.getState().project.name, 'Kitchen island');
});

test('F5 · grep of src/ finds no loc_ id minting; the shelf keeps no job under an invented id', () => {
  for (const abs of filesUnder(join(ROOT, 'src'))) {
    assert.doesNotMatch(readFileSync(abs, 'utf8'), /loc_/, `${abs.slice(ROOT.length)} names loc_`);
  }
  const row = saveLocalProject(memoryStorage(), { project: { id: null, name: 'X' }, units: [], at: 1 });
  assert.equal(row.stored, false);
  assert.equal(row.id, null);
});
