/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F1 . ONE CLIENT, AND IT IS JC'S (law 2). The owner, 30.10.2026: *"oczywiscie do CC laczysz sie tylko przez JC"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  JC_OFFLINE, hasToken, isJcOffline, jcClient, jcFetch, withDb,
} from '../src/lib/jcApi.js';
import { configuredStorageBase } from '../src/lib/storageBase.js';

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

function memoryStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

function withGlobals(globals, fn) {
  const before = {};
  for (const k of Object.keys(globals)) {
    before[k] = Object.getOwnPropertyDescriptor(globalThis, k);
    Object.defineProperty(globalThis, k, { value: globals[k], configurable: true, writable: true });
  }
  const restore = () => {
    for (const k of Object.keys(globals)) {
      if (before[k]) Object.defineProperty(globalThis, k, before[k]);
      else delete globalThis[k];
    }
  };
  let out;
  try { out = fn(); } catch (e) { restore(); throw e; }
  if (out && typeof out.then === 'function') return out.finally(restore);
  restore();
  return out;
}

test('F1 . withDb reaches JC\'s client off the window and returns its data', async () => {
  const seen = [];
  const fake = {
    from(table) { seen.push(table); return { select: async (cols) => ({ data: [{ id: 'r1', cols }], error: null }) }; },
  };
  await withGlobals({ supabaseClient: fake }, async () => {
    assert.equal(jcClient(), fake);
    const res = await withDb((db) => db.from('cc_items').select('id, name'), []);
    assert.deepEqual(res, { data: [{ id: 'r1', cols: 'id, name' }], error: null, mock: false });
    assert.deepEqual(seen, ['cc_items']);
    const refused = await withDb(async () => ({ data: null, error: { message: 'no' } }), 'fallback');
    assert.deepEqual(refused, { data: 'fallback', error: { message: 'no' }, mock: false });
    const thrown = await withDb(async () => { throw new Error('dead'); }, 7);
    assert.equal(thrown.data, 7);
    assert.equal(thrown.mock, false);
    assert.equal(thrown.error.message, 'dead');
  });
});

test('F1 . without JC\'s client: { mock: true } and the mock value, never a throw', async () => {
  await withGlobals({ supabaseClient: undefined }, async () => {
    assert.equal(jcClient(), null);
    let called = false;
    const res = await withDb(() => { called = true; }, ['m']);
    assert.deepEqual(res, { data: ['m'], error: null, mock: true });
    assert.equal(called, false);
  });
});

test('F1 . jcFetch goes through JC\'s apiFetch, and says JC_OFFLINE in words when it is not there', async () => {
  const calls = [];
  await withGlobals({ apiFetch: async (e, o) => { calls.push([e, o]); return { data: { ok: 1 }, error: null }; } }, async () => {
    assert.deepEqual(await jcFetch('/api/auth/me'), { data: { ok: 1 }, error: null });
    assert.deepEqual(calls, [['/api/auth/me', {}]]);
  });
  await withGlobals({ apiFetch: undefined }, async () => {
    const res = await jcFetch('/api/auth/me');
    assert.equal(res.data, null);
    assert.equal(res.error.message, JC_OFFLINE);
  });
  assert.equal(JC_OFFLINE, 'Joinery Core did not answer. Your work is kept in this browser until it does.');
});

test('F1 . the token is JC\'s own key; offline is no client or no token', () => {
  withGlobals({ localStorage: memoryStorage({ authToken: 'tok' }), supabaseClient: {} }, () => {
    assert.equal(hasToken(), true);
    assert.equal(isJcOffline(), false);
  });
  withGlobals({ localStorage: memoryStorage({}), supabaseClient: {} }, () => {
    assert.equal(hasToken(), false);
    assert.equal(isJcOffline(), true);
  });
  withGlobals({ localStorage: memoryStorage({ authToken: 'tok' }), supabaseClient: undefined }, () => {
    assert.equal(isJcOffline(), true);
  });
});

test('F1 . src/ holds no client of its own: no createClient, no isMockMode, no anon key, no supabase-js', () => {
  assert.ok(!existsSync(join(ROOT, 'src/lib/supabase.js')), 'src/lib/supabase.js is deleted (kasacja)');
  const bad = [];
  for (const abs of filesUnder(join(ROOT, 'src'))) {
    const text = readFileSync(abs, 'utf8');
    const rel = abs.slice(ROOT.length);
    if (/createClient/.test(text)) bad.push(`${rel}: createClient`);
    if (/isMockMode/.test(text)) bad.push(`${rel}: isMockMode`);
    if (/VITE_SUPABASE_ANON_KEY/.test(text)) bad.push(`${rel}: VITE_SUPABASE_ANON_KEY`);
    if (/@supabase\/supabase-js/.test(code(text))) bad.push(`${rel}: @supabase/supabase-js`);
    if (/from ['"][./]*(lib\/)?supabase\.js['"]/.test(code(text))) bad.push(`${rel}: imports supabase.js`);
  }
  assert.deepEqual(bad, []);
  assert.doesNotMatch(read('.env.example'), /VITE_SUPABASE_ANON_KEY/);
  assert.match(read('.env.example'), /^VITE_HARDWARE_STORAGE_URL=/m);
});

test('F1 . the storage root: VITE_HARDWARE_STORAGE_URL first, VITE_SUPABASE_URL second, none when both unset', () => {
  const pub = '/storage/v1/object/public';
  assert.equal(configuredStorageBase({ VITE_HARDWARE_STORAGE_URL: 'https://h.example.co/', VITE_SUPABASE_URL: 'https://s.example.co' }), `https://h.example.co${pub}`);
  assert.equal(configuredStorageBase({ VITE_SUPABASE_URL: 'https://s.example.co' }), `https://s.example.co${pub}`);
  assert.equal(configuredStorageBase({}), '');
});

test('F1 . vite builds under /cabinet/, and index.html loads JC\'s client before the module script', () => {
  const config = read('vite.config.js');
  assert.match(config, /base: '\/cabinet\/'/);
  assert.match(config, /open: '\/cabinet\/start\.html'/);
  for (const entry of ['index.html', 'retail.html', 'start.html']) assert.match(config, new RegExp(`entry\\('${entry.replace('.', '\\.')}'\\)`));
  const html = read('index.html');
  const jc = html.indexOf('<script src="/js/api-client.js?v=9"></script>');
  const mod = html.indexOf('<script type="module" src="/src/main.jsx"></script>');
  assert.ok(jc > 0, 'the JC script tag is there');
  assert.ok(mod > jc, 'and it stands before the module script');
});

test('F1 . no em or en dash in anything this F wrote', () => {
  for (const rel of ['src/lib/jcApi.js', 'test/turn-cc1a-f01-client.test.js', '.env.example', 'scripts/t78-classify.d/f51-t-cc1a-f01.mjs']) {
    assert.doesNotMatch(read(rel), /[\u2013\u2014]/, rel);
  }
});
