/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F2 . THE SESSION AND THE REFUSAL SCREEN (law 1). The owner, 31.10.2026, 09:08: *"warunek: tylko przez JC po
// zalogowaniu, nie dziala skopiowany url wklejony przez byle kogo"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JC_OFFLINE } from '../src/lib/jcApi.js';
import {
  SIGNED_OUT_ELSEWHERE, loginUrl, onSignedOutFlush, refusalCard, useAuthStore,
} from '../src/stores/authStore.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function memoryStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

/** A fake Joinery Core: the window's three globals, counting every call; getSession THROWS if CC ever calls it. */
function fakeJc({ token = 'tok', me = null, meError = null } = {}) {
  const calls = { apiFetch: [], signOut: 0, getSession: 0 };
  const g = {
    localStorage: memoryStorage(token ? { authToken: token, currentSession: '{}', currentUser: '{}' } : {}),
    apiFetch: async (endpoint, options) => {
      calls.apiFetch.push(endpoint);
      if (meError) return { data: null, error: meError };
      return { data: me, error: null };
    },
    supabaseClient: {
      auth: {
        getSession: () => { calls.getSession += 1; throw new Error('CC must never call supabaseClient.auth.getSession'); },
        signOut: async () => { calls.signOut += 1; return { error: null }; },
      },
      from: () => { throw new Error('no table read belongs to the session'); },
    },
  };
  const replaced = [];
  const location = { replace: (url) => replaced.push(url) };
  return { g, calls, replaced, location };
}

async function run(fake, fn) {
  const keys = Object.keys(fake.g);
  const before = Object.fromEntries(keys.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const k of keys) Object.defineProperty(globalThis, k, { value: fake.g[k], configurable: true, writable: true });
  useAuthStore.setState({ status: 'booting', refusal: null, user: null, tenant: null, message: null });
  try { return await fn(); } finally {
    for (const k of keys) { if (before[k]) Object.defineProperty(globalThis, k, before[k]); else delete globalThis[k]; }
  }
}

const me = (user, organization = { id: 't-sky', name: 'Skylon' }) => ({ user: { id: 'u1', email: 'a@b.c', full_name: 'Ann Admin', tenant_id: 't-sky', ...user }, organization });

test('F2 . no token: location.replace to JC\'s login with next=/cabinet/, and apiFetch is never called', async () => {
  const f = fakeJc({ token: null });
  await run(f, async () => {
    assert.equal(await useAuthStore.getState().init({ location: f.location }), 'redirect');
  });
  assert.deepEqual(f.replaced, ['/login.html?next=%2Fcabinet%2F']);
  assert.equal(loginUrl(), '/login.html?next=%2Fcabinet%2F');
  assert.deepEqual(f.calls.apiFetch, [], 'not one request');
  assert.equal(useAuthStore.getState().status, 'booting', 'nothing is drawn on the way to the login');
});

test('F2 . no token, the default location: the same road through globalThis.location', async () => {
  const f = fakeJc({ token: null });
  f.g.location = f.location;
  await run(f, async () => { await useAuthStore.getState().init(); });
  assert.deepEqual(f.replaced, ['/login.html?next=%2Fcabinet%2F']);
});

test('F2 . /me says employee of a listed company: refused \'role\', the card says employee and never worker', async () => {
  const f = fakeJc({ me: me({ role: 'worker', cabinet_core: false, cabinet_core_company: true }) });
  await run(f, async () => { assert.equal(await useAuthStore.getState().init({ location: f.location }), 'refused'); });
  const s = useAuthStore.getState();
  assert.equal(s.status, 'refused');
  assert.equal(s.refusal, 'role');
  assert.deepEqual(f.calls.apiFetch, ['/api/auth/me'], 'the one request, and no list after it');
  assert.equal(f.calls.signOut, 0);
  const card = refusalCard(s);
  const words = `${card.title} ${card.line} ${card.actions.map((a) => a.label).join(' ')}`;
  assert.equal(card.title, 'Cabinet Core opens for owners, admins and managers');
  assert.match(words, /employee/);
  assert.doesNotMatch(words, /worker/i);
  assert.match(card.line, /Ask an admin of Skylon/);
  assert.deepEqual(card.actions, [{ label: 'Back to Joinery Core', href: '/dashboard.html' }]);
});

test('F2 . /me says the company is not listed: refused \'company\', with the Coming soon link', async () => {
  const f = fakeJc({ me: me({ role: 'owner', cabinet_core: false, cabinet_core_company: false }, { id: 't-x', name: 'Oak Ltd' }) });
  await run(f, async () => { await useAuthStore.getState().init({ location: f.location }); });
  const s = useAuthStore.getState();
  assert.equal(s.refusal, 'company');
  const card = refusalCard(s);
  assert.equal(card.title, 'Cabinet Core is coming soon for Oak Ltd');
  assert.equal(card.line, 'It is in testing with one workshop today.');
  assert.deepEqual(card.actions.map((a) => [a.label, a.href]), [['What is Cabinet Core', '/cabinet-core.html'], ['Back to Joinery Core', '/dashboard.html']]);
});

test('F2 . /me network error: offline with the words and a Retry, and no sign-out on the fake client', async () => {
  const f = fakeJc({ meError: { message: 'Failed to fetch' } });
  await run(f, async () => { assert.equal(await useAuthStore.getState().init({ location: f.location }), 'offline'); });
  const s = useAuthStore.getState();
  assert.equal(s.status, 'offline');
  assert.equal(f.calls.signOut, 0);
  assert.deepEqual(f.replaced, []);
  const card = refusalCard(s);
  assert.equal(card.title, 'Joinery Core did not answer');
  assert.equal(card.line, JC_OFFLINE);
  assert.deepEqual(card.actions, [{ label: 'Try again', retry: true }]);
});

test('F2 . /me 401: JC\'s login again (JC\'s script cleared the keys), no card', async () => {
  const f = fakeJc({ meError: { message: 'Unauthorized', status: 401 } });
  await run(f, async () => { assert.equal(await useAuthStore.getState().init({ location: f.location }), 'redirect'); });
  assert.deepEqual(f.replaced, ['/login.html?next=%2Fcabinet%2F']);
});

test('F2 . /me admin of a listed company: ready, tenant.id and user.role set; getSession never called', async () => {
  const f = fakeJc({ me: me({ role: 'admin', cabinet_core: true, cabinet_core_company: true }) });
  await run(f, async () => { assert.equal(await useAuthStore.getState().init({ location: f.location }), 'ready'); });
  const s = useAuthStore.getState();
  assert.equal(s.status, 'ready');
  assert.equal(s.tenant.id, 't-sky');
  assert.equal(s.tenant.name, 'Skylon');
  assert.equal(s.user.role, 'admin');
  assert.equal(s.user.full_name, 'Ann Admin');
  assert.deepEqual(s.flags, { cabinetCore: true, cabinetCoreCompany: true });
  assert.equal(f.calls.getSession, 0, 'supabaseClient.auth.getSession is never called by CC');
});

test('F2 . signed out in another tab: the flushes run first, then the offline card says so', () => {
  const order = [];
  const off = onSignedOutFlush(() => order.push('flush'));
  useAuthStore.setState({ status: 'ready' });
  useAuthStore.subscribe((s, p) => { if (s.status !== p.status) order.push(s.status); });
  useAuthStore.getState().signedOutElsewhere();
  off();
  assert.deepEqual(order, ['flush', 'offline']);
  assert.equal(useAuthStore.getState().message, SIGNED_OUT_ELSEWHERE);
  assert.equal(refusalCard(useAuthStore.getState()).title, 'You were signed out of Joinery Core');
});

test('F2 . the store holds no login of its own: no signIn, signUp, signOut, projects; no getSession anywhere in CC', () => {
  const s = useAuthStore.getState();
  for (const k of ['signIn', 'signUp', 'signOut', 'projects', 'refreshProjects']) assert.ok(!(k in s), `no ${k}`);
  assert.doesNotMatch(code(read('src/stores/authStore.js')), /getSession|cloudSync|companyDefaults/);
});

test('F2 . main.jsx: the session first, App.jsx and the card imported dynamically; the storage event signs out', () => {
  const main = code(read('src/main.jsx'));
  assert.doesNotMatch(main, /^import App from/m, 'App.jsx is no static import');
  assert.match(main, /await import\('\.\/App\.jsx'\)/);
  assert.match(main, /await import\('\.\/components\/jc\/RefusalScreen\.jsx'\)/);
  assert.match(main, /useAuthStore\.getState\(\)\.init\(\);/);
  assert.ok(main.indexOf("status === 'ready'") < main.indexOf("import('./App.jsx')"), 'App only on ready');
  assert.match(main, /addEventListener\('storage'/);
  assert.match(main, /e\.key === 'authToken'/);
  assert.match(main, /signedOutElsewhere\(\)/);
  const app = code(read('src/App.jsx'));
  assert.match(app, /useCompanyDefaultsStore\.getState\(\)\.load\(\)/, 'the company row is asked by App after ready');
  assert.match(app, /beforeunload/, 'the leaving question stays until F8 replaces it');
  const card = read('src/components/jc/RefusalScreen.jsx');
  assert.match(card, /refusalCard\(\{ status, refusal, tenant, message \}\)/);
  assert.doesNotMatch(code(card), /worker/i);
});

test('F2 . no em or en dash in anything this F wrote', () => {
  for (const rel of ['src/stores/authStore.js', 'src/components/jc/RefusalScreen.jsx', 'test/turn-cc1a-f02-session.test.js']) {
    assert.doesNotMatch(read(rel), /[\u2013\u2014]/, rel);
  }
});
