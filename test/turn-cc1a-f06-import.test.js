/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F6 . OPEN FROM FILE IS THE IMPORT ROAD (the owner's answer 10). The owner, 31.10.2026, 01:06: *"w
// przyszlosci nie bedzie save to file, po co?"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// The browser's storage, with a workshop profile already on this computer, BEFORE any store loads.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const { DEFAULT_CABINET_PROFILE } = await import('../src/engine/profile.js');
store.set('cc.profile.v1', JSON.stringify(DEFAULT_CABINET_PROFILE));
const PROFILE_BEFORE = store.get('cc.profile.v1');

const { itemDesign, openProjectFromFile, PROFILE_NOT_IMPORTED, saveItem } = await import('../src/lib/projectFileRoad.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { useCabinetProfileStore } = await import('../src/stores/cabinetProfileStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');

const OWNER_TEXT = read('verify/t86b/owner.ccproject');
const OWNER = JSON.parse(OWNER_TEXT);
const SERVER_ID = '0b7d4d7e-1111-4c2a-9d55-6a1e2f3c4d5e';
const PRODUCTION = { key: 'p:p1', kind: 'production', id: 'p1', number: '2601', name: 'Bedroom wardrobes', client: 'Mrs Kowalski' };

/** A fake Joinery Core: the four list reads answer, every rpc is recorded; cc_create_item and cc_save_item answer as T-JC1 says. */
function fakeJc({ items = [] } = {}) {
  const rpc = [];
  const reads = [];
  const from = (table) => {
    const chain = {
      select: (cols) => { reads.push({ table, cols }); return chain; },
      eq: () => chain, order: () => chain, limit: () => chain, single: () => chain, maybeSingle: () => chain,
      then: (res, rej) => Promise.resolve({ data: table === 'cc_items' ? items : [], error: null }).then(res, rej),
    };
    return chain;
  };
  return {
    rpc,
    reads,
    client: {
      from,
      rpc: (name, params) => {
        rpc.push({ name, params });
        if (name === 'cc_create_item') {
          return Promise.resolve({ data: { id: SERVER_ID, name: params.p_name, revision: null, jc_project_number: '2601', jc_project_id: params.p_project_id ?? null, jc_pipeline_id: params.p_pipeline_id ?? null }, error: null });
        }
        if (name === 'cc_save_item') return Promise.resolve({ data: { id: params.p_item_id, updated_at: '2026-10-31T12:00:00Z', revision: null }, error: null });
        return Promise.resolve({ data: null, error: { message: `unexpected ${name}` } });
      },
      auth: { getSession: () => { throw new Error('CC never calls getSession'); } },
    },
  };
}
async function withClient(client, fn) {
  const before = globalThis.supabaseClient;
  globalThis.supabaseClient = client;
  try { return await fn(); } finally { if (before === undefined) delete globalThis.supabaseClient; else globalThis.supabaseClient = before; }
}

test('F6 · the owner\'s file imported against a fake JC: cc_create_item then cc_save_item, once each', async () => {
  const jc = fakeJc();
  const said = [];
  const notify = useUiStore.getState().notify;
  useUiStore.setState({ notify: (m, t) => said.push({ m, t }) });
  const asked = [];
  let res;
  try {
    res = await withClient(jc.client, () => openProjectFromFile({
      picked: { name: 'owner.ccproject', text: OWNER_TEXT },
      pickProject: async (opts) => { asked.push(opts); return PRODUCTION; },
      ask: async () => { throw new Error('no collision: the question is not asked'); },
    }));
  } finally { useUiStore.setState({ notify }); }
  assert.equal(res, 'opened');
  assert.deepEqual(jc.rpc.map((c) => c.name), ['cc_create_item', 'cc_save_item'], 'one create, ONE save');
  assert.deepEqual(jc.rpc[0].params, { p_name: OWNER.project.name, p_project_id: 'p1' });
  const save = jc.rpc[1].params;
  assert.equal(save.p_item_id, SERVER_ID, 'the server\'s id replaced the file\'s');
  assert.equal(save.p_name, OWNER.project.name);
  const design = save.p_design;
  assert.equal('profile' in design, false, 'the saved design has no profile key');
  assert.deepEqual(Object.keys(design).sort(), ['app', 'assignments', 'format', 'project', 'saved_at', 'units', 'version']);
  assert.equal(design.format, 'cabinet-core-project');
  assert.equal(design.project.id, SERVER_ID);
  assert.notEqual(design.project.id, OWNER.project.id);
  assert.equal(design.units.length, OWNER.units.length);
  // The unit's params are byte-identical to the file's, key for key. The one key the store's load adds is the
  // migration's own schema stamp (migrateUnits writes shelf_schema: 2 on a unit that has none), named here: the
  // save is built from the store in ONE place (law 5), so it carries what the next Ctrl+S would carry.
  for (let i = 0; i < OWNER.units.length; i += 1) {
    const { shelf_schema: stamp, ...rest } = design.units[i].params;
    const file = OWNER.units[i].params;
    assert.equal(JSON.stringify(Object.fromEntries(Object.keys(file).map((k) => [k, rest[k]]))), JSON.stringify(file),
      'the unit\'s params are byte-identical to the file\'s');
    assert.deepEqual(Object.keys(rest).sort(), Object.keys(file).sort(), 'no other key added or lost');
    assert.equal(stamp ?? file.shelf_schema, 2);
  }
  // The picker was told the file carries settings, which are not imported; the words say so.
  assert.equal(asked.length, 1);
  assert.equal(asked[0].profileNote, Boolean(OWNER.profile));
  if (OWNER.profile) assert.ok(said.some((x) => x.t === 'ok' && x.m.includes(PROFILE_NOT_IMPORTED)));
  const p = useProjectStore.getState().project;
  assert.equal(p.id, SERVER_ID);
  assert.equal(p.number, '2601');
  assert.equal(p.client, 'Mrs Kowalski');
  assert.equal(p.savedAt, '2026-10-31T12:00:00Z');
  assert.equal(useProjectStore.getState().dirty, false);
});

test('F6 · the local profile (cc.profile.v1) is unchanged by the import', () => {
  assert.equal(store.get('cc.profile.v1'), PROFILE_BEFORE);
  assert.equal(JSON.stringify(useCabinetProfileStore.getState().profile) === JSON.stringify(OWNER.profile) && OWNER.profile
    && JSON.stringify(OWNER.profile) !== JSON.stringify(DEFAULT_CABINET_PROFILE), false, 'the file\'s settings were not applied');
  const road = code(read('src/lib/projectFileRoad.js'));
  assert.doesNotMatch(road, /setProfile|takeProfile|migrateCabinetProfile/);
});

test('F6 · Cancel in the picker makes nothing; a refused create loads nothing and says so', async () => {
  const jc = fakeJc();
  useProjectStore.getState().newProject('Before', { id: 'srv-before' });
  const cancelled = await withClient(jc.client, () => openProjectFromFile({
    picked: { name: 'owner.ccproject', text: OWNER_TEXT }, pickProject: async () => null,
  }));
  assert.equal(cancelled, 'cancelled');
  assert.deepEqual(jc.rpc, []);
  const refusing = fakeJc();
  refusing.client.rpc = (name, params) => { refusing.rpc.push({ name, params }); return Promise.resolve({ data: null, error: { message: 'Forbidden' } }); };
  const said = [];
  const notify = useUiStore.getState().notify;
  useUiStore.setState({ notify: (m, t) => said.push({ m, t }) });
  try {
    const r = await withClient(refusing.client, () => openProjectFromFile({
      picked: { name: 'owner.ccproject', text: OWNER_TEXT }, pickProject: async () => PRODUCTION,
    }));
    assert.equal(r, 'refused');
  } finally { useUiStore.setState({ notify }); }
  assert.deepEqual(refusing.rpc.map((c) => c.name), ['cc_create_item']);
  assert.equal(useProjectStore.getState().project.id, 'srv-before', 'nothing loaded');
  assert.match(said[0].m, /not imported\. Forbidden/);
});

test('F6 · a file saved from a JC item asks the id-collision question; Replace saves into that item, no create', async () => {
  const text = JSON.stringify({ ...OWNER, project: { ...OWNER.project, id: 'srv-existing' } });
  const jc = fakeJc({ items: [{ id: 'srv-existing', name: 'Existing', revision: 'A', updated_at: '2026-10-30T10:00:00Z', archived_at: null, jc_pipeline_id: null, jc_project_id: 'p1', jc_project_number: '2601' }] });
  const seen = [];
  const r = await withClient(jc.client, () => openProjectFromFile({
    picked: { name: 'x.ccproject', text },
    ask: async ({ questions }) => { seen.push(questions); return { mode: 'replace', takeProfile: false }; },
    pickProject: async () => { throw new Error('Replace binds to the item it already is'); },
  }));
  assert.equal(r, 'opened');
  assert.equal(seen[0].collision.id, 'srv-existing');
  assert.equal(seen[0].profile, null, 'the settings are never asked');
  assert.deepEqual(jc.rpc.map((c) => c.name), ['cc_save_item']);
  assert.equal(jc.rpc[0].params.p_item_id, 'srv-existing');
});

test('F6 · both entries take the import road: the picker for the project, the read-only words in it', () => {
  const start = code(read('src/components/StartScreen.jsx'));
  assert.match(start, /openProjectFromFile\(\{\s*picked, anchor, storage, ask: askProjectFile, pickProject, list: known,\s*\}\)/);
  const top = code(read('src/components/TopBar.jsx'));
  assert.match(top, /pickProject: askJcProject,/);
  const picker = code(read('src/components/jc/JcProjectPicker.jsx'));
  assert.match(picker, /PROFILE_NOT_IMPORTED/);
  assert.match(picker, /data-jc-picker-search="1"/, 'embedded list plus a search, never search-only');
  assert.match(picker, /rows\.map\(\(p\) =>/);
  assert.equal(PROFILE_NOT_IMPORTED, 'This file carries workshop settings; they are not imported (the company numbers live in Joinery Core from T-CC1b)');
});

test('F6 · the one save helper (PART C folds it into persistProject): the item JSON has no profile; a refusal stays unsaved', async () => {
  useProjectStore.getState().newProject('Helper', { id: 'srv-helper', number: '2601' });
  const d = itemDesign();
  assert.equal('profile' in d, false);
  assert.equal(d.project.id, 'srv-helper');
  useProjectStore.getState().setProjectName('Helper, changed');
  assert.equal(useProjectStore.getState().dirty, true);
  const offline = await withClient(undefined, () => saveItem());
  assert.equal(offline.ok, false);
  assert.match(offline.error, /Joinery Core did not answer/);
  assert.equal(useProjectStore.getState().dirty, true, 'a refused save leaves the item dirty');
  const jc = fakeJc();
  const ok = await withClient(jc.client, () => saveItem());
  assert.equal(ok.ok, true);
  assert.deepEqual(jc.rpc.map((c) => [c.name, c.params.p_item_id, c.params.p_name]), [['cc_save_item', 'srv-helper', 'Helper, changed']]);
  assert.equal(useProjectStore.getState().dirty, false);
});
