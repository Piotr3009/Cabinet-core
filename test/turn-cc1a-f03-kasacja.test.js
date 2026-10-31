/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F3 . THE KASACJA OF THE LOGIN, THE MOCK MODE AND THE CLOUD ROAD (law 2). The owner, 30.10.2026: *"oczywiscie
// do CC laczysz sie tylko przez JC"*. Physical deletions, never gates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as cloud from '../src/lib/cloudSync.js';
import * as warehouseDb from '../src/lib/warehouseDb.js';
import { useMaterialAssignmentStore } from '../src/stores/materialAssignmentStore.js';
import { useWarehouseStore } from '../src/stores/warehouseStore.js';

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

/** A fake Joinery Core that counts every request of any kind: table reads and writes, rpc, apiFetch, fetch. */
function countingJc() {
  const calls = [];
  const chain = (table) => new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') return (res) => res({ data: [], error: null });
      return (...args) => { calls.push(`${table}.${String(prop)}(${args.length})`); return chain(table); };
    },
    apply: () => chain(table),
  });
  const m = new Map([['authToken', 'tok']]);
  return {
    calls,
    g: {
      supabaseClient: { from: (t) => { calls.push(`from:${t}`); return chain(t); }, rpc: (n) => { calls.push(`rpc:${n}`); return chain(n); }, auth: {} },
      apiFetch: async (e) => { calls.push(`apiFetch:${e}`); return { data: null, error: null }; },
      rpc: async (n) => { calls.push(`rpc:${n}`); return { data: null, error: null }; },
      fetch: async (u) => { calls.push(`fetch:${u}`); return { ok: true, json: async () => ({}) }; },
      localStorage: { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) },
    },
  };
}
async function withJc(fake, fn) {
  const keys = Object.keys(fake.g);
  const before = Object.fromEntries(keys.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const k of keys) Object.defineProperty(globalThis, k, { value: fake.g[k], configurable: true, writable: true });
  try { return await fn(); } finally {
    for (const k of keys) { if (before[k]) Object.defineProperty(globalThis, k, before[k]); else delete globalThis[k]; }
  }
}
const settle = (ms) => new Promise((r) => { setTimeout(r, ms); });

test('F3 . the two files are gone whole, and the manifest holds no row for them', () => {
  for (const rel of ['src/components/AuthModal.jsx', 'src/components/MockModeBadge.jsx', 'src/lib/supabase.js']) {
    assert.ok(!existsSync(join(ROOT, rel)), `${rel} is still on disk`);
  }
  const manifest = read('test/turn59-f1-the-switch.test.js');
  const frozen = manifest.slice(manifest.indexOf('const FROZEN = {'), manifest.indexOf('\n};', manifest.indexOf('const FROZEN = {')));
  const exempt = manifest.slice(manifest.indexOf('const EXEMPT = {'), manifest.indexOf('\n};', manifest.indexOf('const EXEMPT = {')));
  const deleted = manifest.slice(manifest.indexOf('const DELETED = {'), manifest.indexOf('\n};', manifest.indexOf('const DELETED = {')));
  for (const name of ['AuthModal', 'MockModeBadge']) {
    assert.doesNotMatch(frozen, new RegExp(`'src/components/${name}\\.jsx'`), `${name} is still frozen`);
    assert.doesNotMatch(exempt, new RegExp(`\\n  'src/components/${name}\\.jsx'`), `${name} is still exempt`);
    assert.match(deleted, new RegExp(`'src/components/${name}\\.jsx': 'T-CC1a F3 [^\\n]*oczywiscie do CC laczysz sie tylko przez JC`), `${name} is not named in DELETED with the owner's words`);
  }
});

test('F3 . src/ names no AuthModal, MockModeBadge, isMockMode, scheduleCloudSave, nor the cloud list', () => {
  const bad = [];
  for (const abs of filesUnder(join(ROOT, 'src'))) {
    const rel = abs.slice(ROOT.length);
    const text = readFileSync(abs, 'utf8');
    for (const word of ['AuthModal', 'MockModeBadge', 'isMockMode', 'scheduleCloudSave', 'MOCK_REASON']) {
      if (text.includes(word)) bad.push(`${rel}: ${word}`);
    }
    if (/\b(listProjects|loadAssignments|saveAssignments|signInWithPassword|onAuthStateChange)\b/.test(code(text))) bad.push(`${rel}: a cloud road`);
  }
  assert.deepEqual(bad, []);
  for (const gone of ['listProjects', 'loadProject', 'saveProject', 'deleteProject', 'loadAssignments', 'saveAssignments', 'getSession', 'signIn', 'signUp', 'signOut', 'onAuthChange']) {
    assert.ok(!(gone in cloud), `cloudSync still exports ${gone}`);
  }
  // The company defaults stay in the file until T-CC1b (FROZEN 4).
  assert.equal(typeof cloud.loadCompanyDefaults, 'function');
  assert.equal(typeof cloud.saveCompanyDefaults, 'function');
  for (const gone of ['saveMaterialDb', 'saveManyDb', 'removeMaterialDb']) assert.ok(!(gone in warehouseDb), `warehouseDb still exports ${gone}`);
  assert.doesNotMatch(code(read('src/stores/materialAssignmentStore.js')), /cloudSync|cloudLoad|cloudSave/);
  assert.doesNotMatch(code(read('src/lib/persist.js')), /cloudSync|saveCloudProject|jcApi/);
  assert.doesNotMatch(code(read('src/components/TopBar.jsx')), /onAuth|drawAccount|topbar-account/, 'the Account button is gone');
  assert.doesNotMatch(code(read('src/pages/ConfiguratorPage.jsx')), /'auth'/, 'nothing opens the auth window');
  // Nothing imports supabase-js any more (retail included), so the package left package.json too.
  assert.ok(!('@supabase/supabase-js' in (JSON.parse(read('package.json')).dependencies || {})), 'supabase-js is still a dependency');
});

test('F3 . ten assignment changes on a live fake JC make no network call at all', async () => {
  const fake = countingJc();
  await withJc(fake, async () => {
    const s = useMaterialAssignmentStore.getState();
    s.setProject('item-1');
    for (let i = 0; i < 10; i += 1) {
      const st = useMaterialAssignmentStore.getState();
      if (i % 2 === 0) st.setAssignment('side', `mat_${i}`, 1.0);
      else st.setYield('side', 1 + i / 100);
    }
    await settle(700); // past the old 600 ms debounce
  });
  assert.deepEqual(fake.calls, [], 'the assignments ride project.assignments alone');
  assert.equal(useMaterialAssignmentStore.getState().assignmentFor('side')?.material_id, 'mat_8', 'the changes landed in memory');
});

test('F3 . the warehouse changes on a live fake JC make no network call at all; the rows stay local', async () => {
  const fake = countingJc();
  await withJc(fake, async () => {
    const st = () => useWarehouseStore.getState();
    useWarehouseStore.setState({ rows: [] });
    const a = st().addMaterial({ name: 'Oak 18' });
    const b = st().addMaterial({ name: 'Birch 18', subcategory: 'Ply' });
    st().updateMaterial(a.id, { cost_per_unit: 42 });
    st().renameSubcategory('Ply', 'Plywood');
    st().importRows([{ name: 'MDF 18', jc_uuid: 'u-1' }]);
    st().removeMaterial(b.id);
    await settle(50);
    assert.deepEqual(st().rows.map((r) => r.name).sort(), ['MDF 18', 'Oak 18']);
  });
  assert.deepEqual(fake.calls, [], 'not one write leaves the browser');
});

test('F3 . no em or en dash in anything this F wrote', () => {
  for (const rel of ['test/turn-cc1a-f03-kasacja.test.js', 'src/lib/cloudSync.js', 'scripts/t78-classify.d/f51-t-cc1a-f03.mjs']) {
    assert.doesNotMatch(read(rel), /[\u2013\u2014]/, rel);
  }
});
