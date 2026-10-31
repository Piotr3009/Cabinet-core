/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F7 . ONE SAVE, ONE REQUEST (CLAUDE.md T-CC1a law 5). The owner, 30.10.2026: *"dopiero caly json powinien
// sie zapisac do DB przy nacisnieciu Zapisz lub co 5 minut automatycznie"*. Driven the way the joiner clicks: the
// real store, the real persistProject, a fake Joinery Core client on the window.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

const { useProjectStore } = await import('../src/stores/projectStore.js');
const { persistProject, itemPayload, tooLargeWords } = await import('../src/lib/persist.js');
const { SAVE_DEFAULTS, saveNumbers } = await import('../src/lib/saveNumbers.js');
const { DEFAULT_CABINET_PROFILE } = await import('../src/engine/profile.js');

/** A fake Joinery Core: every rpc recorded; `refuse` answers each with that error. */
function fakeJc({ refuse = null, row = { jc_pipeline_id: 'pl1', jc_project_id: null, jc_project_number: '2599' } } = {}) {
  const rpc = [];
  const reads = [];
  const client = {
    rpc: async (name, params) => {
      rpc.push({ name, params });
      if (refuse) return { data: null, error: { message: refuse } };
      if (name === 'cc_create_item') return { data: { id: 'srv-copy', name: params.p_name, revision: null, jc_project_number: '2599' }, error: null };
      return { data: { id: params.p_item_id, updated_at: '2026-10-31T12:00:00.000Z', revision: 'A' }, error: null };
    },
    from: (table) => {
      const q = {
        select: (cols) => { reads.push({ table, cols }); return q; }, eq: () => q,
        single: async () => ({ data: { id: 'srv-ten', ...row }, error: null }),
      };
      return q;
    },
  };
  return { client, rpc, reads };
}
async function withJc(client, fn) {
  if (client) globalThis.supabaseClient = client; else delete globalThis.supabaseClient;
  try { return await fn(); } finally { delete globalThis.supabaseClient; }
}

function tenUnitJob() {
  useProjectStore.getState().newProject('Ten units', { id: 'srv-ten', number: '2601', client: 'Mrs Kowalski' });
  for (let i = 0; i < 10; i += 1) {
    const r = useProjectStore.getState().addUnit(i % 2 ? 'BUD' : 'WARDROBE');
    assert.equal(r?.error ?? null, null);
  }
  assert.equal(useProjectStore.getState().units.length, 10);
  assert.equal(useProjectStore.getState().dirty, true);
}

test('F7 . a 10-unit job saves with exactly ONE cc_save_item: the item id, the whole item JSON, no profile', async () => {
  tenUnitJob();
  const jc = fakeJc();
  const res = await withJc(jc.client, () => persistProject({}));
  assert.equal(res.stored, true, res.message);
  assert.equal(res.tone, 'ok');
  assert.match(res.message, /^Saved \d\d:\d\d\.$/);
  assert.equal(jc.rpc.length, 1);
  const [{ name, params }] = jc.rpc;
  assert.equal(name, 'cc_save_item');
  assert.deepEqual(Object.keys(params).sort(), ['p_design', 'p_item_id', 'p_name']);
  assert.equal(params.p_item_id, 'srv-ten');
  assert.equal(params.p_name, 'Ten units');
  const d = params.p_design;
  for (const k of ['format', 'version', 'project', 'units', 'assignments']) assert.ok(k in d, `the design has ${k}`);
  assert.equal('profile' in d, false, 'never the profile');
  assert.equal(d.format, 'cabinet-core-project');
  assert.equal(d.units.length, 10);
  assert.equal('jc_project_id' in d.project, false, 'the binding lives in the row');
  assert.equal(jc.reads.length, 0, 'the save reads nothing');
  // markSaved after success: clean, and the row's updated_at remembered.
  assert.equal(useProjectStore.getState().dirty, false);
  assert.equal(useProjectStore.getState().project.savedAt, '2026-10-31T12:00:00.000Z');
  assert.equal(useProjectStore.getState().project.revision, 'A');
});

test('F7 . the design parses back through loadProject to the same units, byte for byte', async () => {
  tenUnitJob();
  const jc = fakeJc();
  await withJc(jc.client, () => persistProject({}));
  const before = JSON.stringify(useProjectStore.getState().units);
  const d = JSON.parse(JSON.stringify(jc.rpc[0].params.p_design));
  useProjectStore.getState().newProject('Somebody else', { id: 'srv-other' });
  useProjectStore.getState().loadProject(d.project, d.units);
  // loadProject's migrations stamp `shelf_schema: 2` on a unit that was never loaded (migrateUnitShelves): that
  // one key is the migration's, every key the save carried comes back byte-identical...
  const back = useProjectStore.getState().units.map((u) => {
    const { shelf_schema: _s, ...params } = u.params;
    return { ...u, params };
  });
  assert.equal(JSON.stringify(back), before);
  // ...and from then on the round trip is a fixed point: saved, loaded, saved again, byte for byte.
  const once = JSON.stringify(useProjectStore.getState().units);
  await withJc(jc.client, () => persistProject({}));
  const d2 = JSON.parse(JSON.stringify(jc.rpc[1].params.p_design));
  useProjectStore.getState().loadProject(d2.project, d2.units);
  assert.equal(JSON.stringify(d2.units), once);
  assert.equal(JSON.stringify(useProjectStore.getState().units), once);
});

test('F7 . a refused save leaves dirty true and the words; no Joinery Core says JC_OFFLINE', async () => {
  tenUnitJob();
  const r = await withJc(fakeJc({ refuse: 'Forbidden: not your item' }).client, () => persistProject({}));
  assert.equal(r.stored, false);
  assert.equal(r.tone, 'error');
  assert.equal(r.message, 'Not saved: Forbidden: not your item');
  assert.equal(useProjectStore.getState().dirty, true);
  const off = await withJc(null, () => persistProject({}));
  assert.equal(off.message, 'Not saved: Joinery Core did not answer. Your work is kept in this browser until it does.');
  assert.equal(useProjectStore.getState().dirty, true);
});

test('F7 . the size guard: a 4 MB body is refused in words and never sent', async () => {
  tenUnitJob();
  useProjectStore.setState((s) => ({ project: { ...s.project, note: 'x'.repeat(4 * 1024 * 1024) } }));
  const jc = fakeJc();
  const r = await withJc(jc.client, () => persistProject({}));
  assert.equal(jc.rpc.length, 0, 'no call');
  assert.equal(r.stored, false);
  assert.match(r.message, /^Not saved: This item is too large to save: 4\.0 MB\. A logo or a picture is riding in it\.$/);
  assert.equal(tooLargeWords('4.0'), 'This item is too large to save: 4.0 MB. A logo or a picture is riding in it.');
  assert.equal(useProjectStore.getState().dirty, true);
  // The ceiling is the profile's number: a profile that says 8 MB lets the same body through.
  const r8 = await withJc(jc.client, () => persistProject({ numbers: saveNumbers({ save: { maxBodyMb: 8 } }) }));
  assert.equal(r8.stored, true);
  assert.equal(jc.rpc.length, 1);
});

test('F7 . the numbers come from the profile: the defaults, a profile block wins key by key', () => {
  assert.deepEqual({ ...SAVE_DEFAULTS }, { autosaveMinutes: 5, keepaliveMaxKb: 64, maxBodyMb: 3.5, bufferMaxMb: 1 });
  assert.deepEqual(saveNumbers(DEFAULT_CABINET_PROFILE), { ...SAVE_DEFAULTS, ...(DEFAULT_CABINET_PROFILE.save || {}) });
  assert.equal(saveNumbers({ save: { autosaveMinutes: 2 } }).autosaveMinutes, 2);
  assert.equal(saveNumbers({ save: { autosaveMinutes: 2 } }).maxBodyMb, 3.5);
  assert.deepEqual(saveNumbers(null), { ...SAVE_DEFAULTS });
});

test('F7 . Save as new item: cc_create_item in the same Joinery Core project, then the same one save', async () => {
  tenUnitJob();
  const jc = fakeJc();
  const r = await withJc(jc.client, () => persistProject({ asName: 'Wardrobe bedroom 2' }));
  assert.equal(r.stored, true, r.message);
  assert.deepEqual(jc.reads.map((x) => x.table), ['cc_items'], 'the binding read once from the row');
  assert.doesNotMatch(jc.reads[0].cols, /design|\*/);
  assert.deepEqual(jc.rpc.map((c) => c.name), ['cc_create_item', 'cc_save_item']);
  assert.deepEqual(jc.rpc[0].params, { p_name: 'Wardrobe bedroom 2', p_pipeline_id: 'pl1' });
  assert.equal(jc.rpc[1].params.p_item_id, 'srv-copy');
  assert.equal(useProjectStore.getState().project.id, 'srv-copy');
  assert.equal(useProjectStore.getState().project.name, 'Wardrobe bedroom 2');
  assert.equal(useProjectStore.getState().dirty, false);
});

test('F7 . a job with no item is not saved, in words, and nothing is sent', async () => {
  useProjectStore.getState().newProject('Nobody');
  useProjectStore.setState((s) => ({ project: { ...s.project, id: null } }));
  const jc = fakeJc();
  const r = await withJc(jc.client, () => persistProject({}));
  assert.equal(jc.rpc.length, 0);
  assert.match(r.message, /^Not saved: this job has no item in Joinery Core yet/);
});

test('F7 . one builder, one request: the payload is the store\'s projectForSave; the import saves through persistProject', () => {
  tenUnitJob();
  const p = itemPayload({ at: 0 });
  assert.deepEqual(Object.keys(p.p_design), ['format', 'version', 'saved_at', 'app', 'project', 'units', 'assignments']);
  const road = code(read('src/lib/projectFileRoad.js'));
  assert.match(road, /await persistProject\(\{ storage, at, db \}\)/);
  assert.doesNotMatch(road, /cc_save_item/, 'the import has no request of its own');
  const persist = code(read('src/lib/persist.js'));
  assert.doesNotMatch(persist, /saveLocalProject|notOnShelf|cc_projects/, 'the shelf write and the cloud branch are gone');
  // cc_save_item is named in the save and in the keepalive of F8, nowhere else.
  const walk = (dir) => readdirSync(dir).flatMap((n) => {
    const abs = join(dir, n);
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
  const naming = walk(join(ROOT, 'src')).filter((abs) => /\.(js|jsx)$/.test(abs) && /'cc_save_item'/.test(code(readFileSync(abs, 'utf8'))))
    .map((abs) => abs.slice(ROOT.length)).sort();
  assert.ok(naming.includes('src/lib/persist.js'));
  assert.ok(naming.every((f) => ['src/lib/persist.js', 'src/lib/saveTriggers.js'].includes(f)), naming.join(', '));
});

test('F7 . no em or en dash in anything this F wrote', () => {
  for (const rel of ['src/lib/persist.js', 'src/lib/saveNumbers.js', 'test/turn-cc1a-f07-save.test.js']) {
    assert.doesNotMatch(read(rel), /[\u2013\u2014]/, rel);
  }
});
