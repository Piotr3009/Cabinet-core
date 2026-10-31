/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F10, THE FAKE JOINERY CORE FOR THE WALK (CLAUDE.md T-CC1a PART D)
//
// CLAUDE.md T-CC1a PART D: "a Node `http` server (no new dependency) that
// serves `/js/api-client.js` as a MINIMAL shim written here (apiFetch, rpc,
// supabaseClient.from with select/eq/order/limit/single/maybeSingle and
// thenable, rpc, auth.getSession that THROWS if called), `/login.html` (a page
// with one button that sets `authToken`, `currentSession`, `currentUser` in
// localStorage and follows `next`), `/api/auth/me`, `/api/db/query` and
// `/api/rpc` over an in-memory store seeded with one company, one admin, one
// employee, two production projects, one pipeline project and two items; it
// proxies every other path to `vite preview` at 4173 under `/cabinet/`, so the
// page runs on ONE origin as it will behind JC."
//
// It implements the lines of "WHAT THE OTHER SIDE GIVES" and nothing more.
// Where the real JC differs, T-JC1's PR is the truth. Two choices of this file
// the spec does not name, said here so nobody reads them as JC's: the shim's
// `/api/db/query` body is `{ table, select, filters, order, limit, single,
// maybeSingle, write }` and its `/api/rpc` body is `{ function, params }` (JC's own, the same
// shape CC's keepalive sends, src/lib/saveTriggers.js). Requests the shim
// makes carry `X-Fake-Shim: 1`, so a keepalive POST (which does not) is
// counted apart.
//
// The walk's handles (not JC's): GET /__fake/state (counters and the store,
// designs reduced to their keys), GET /__fake/reseed (the seed again,
// the admin again, the counters to zero), GET /__fake/user?as=admin|employee (who
// /api/auth/me says the token is), GET /__fake/reset (the counters to zero).
//
//   node scripts/t-cc1a-fake-jc.mjs [--port 4380] [--upstream 4173]
//   or: import { startFakeJc } from './t-cc1a-fake-jc.mjs'

import http from 'node:http';

// === THE SEED ===============================================================
const TENANT = { id: 'ten-skylon', name: 'Skylon Development Ltd' };
const USERS = {
  admin: {
    id: 'usr-admin', email: 'admin@skylon.test', full_name: 'Ada Admin', role: 'admin', tenant_id: TENANT.id,
    cabinet_core: true, cabinet_core_company: true,
  },
  employee: {
    id: 'usr-emp', email: 'emp@skylon.test', full_name: 'Eddie Employee', role: 'worker', tenant_id: TENANT.id,
    cabinet_core: false, cabinet_core_company: true,
  },
};
const ALLOWED_ROLES = new Set(['owner', 'admin', 'manager']);
const READABLE = new Set([
  'pipeline_projects', 'projects', 'clients', 'company_settings', 'cc_items', 'cc_item_revisions', 'cc_company_profile',
]);

function seed(now = Date.now()) {
  const iso = (minsAgo) => new Date(now - minsAgo * 60000).toISOString();
  return {
    clients: [
      { id: 'cli-1', company_name: 'Harbour Homes', contact_person: 'J. Harbour', address: '1 Quay Road' },
      { id: 'cli-2', company_name: 'Smith Family', contact_person: 'A. Smith', address: '2 Elm Close' },
    ],
    company_settings: [{ company_name: TENANT.name, company_address: '3 Mill Lane', logo_url: null }],
    projects: [
      { id: 'prj-1001', project_number: 'P-1001', name: 'Hall wardrobes', client_id: 'cli-1', site_address: '1 Quay Road', status: 'active', pipeline_id: null },
      { id: 'prj-1002', project_number: 'P-1002', name: 'Smith kitchen', client_id: 'cli-2', site_address: '2 Elm Close', status: 'active', pipeline_id: null },
    ],
    pipeline_projects: [
      { id: 'pip-2001', project_number: 'Q-2001', name: 'Loft wardrobes', client_id: 'cli-2', site_address: '2 Elm Close', status: 'active' },
    ],
    cc_items: [
      {
        id: 'itm-seed-1', tenant_id: TENANT.id, name: 'Bedroom wardrobe', revision: 'A', updated_at: iso(120), archived_at: null,
        jc_pipeline_id: null, jc_project_id: 'prj-1001', jc_project_number: 'P-1001', folder_name: 'P-1001 Bedroom wardrobe', design: {},
      },
      {
        id: 'itm-seed-2', tenant_id: TENANT.id, name: 'Island units', revision: 'A', updated_at: iso(60), archived_at: null,
        jc_pipeline_id: null, jc_project_id: 'prj-1002', jc_project_number: 'P-1002', folder_name: 'P-1002 Island units', design: {},
      },
    ],
    cc_item_revisions: [],
    cc_company_profile: [],
  };
}

// === THE SHIM (served as /js/api-client.js; a classic script) ===============
const SHIM = `/* Fake Joinery Core api-client (scripts/t-cc1a-fake-jc.mjs). Not JC's code: the minimal shim of CLAUDE.md T-CC1a PART D. */
(function () {
  var KEYS = ['authToken', 'currentSession', 'currentUser'];
  function token() { try { return localStorage.getItem('authToken'); } catch (e) { return null; } }
  async function apiFetch(endpoint, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json', 'X-Fake-Shim': '1' }, options.headers || {});
    var t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    var res;
    try { res = await fetch(endpoint, Object.assign({}, options, { headers: headers })); }
    catch (err) { return { data: null, error: { message: String(err && err.message || err) } }; }
    var body = null;
    try { body = await res.json(); } catch (e) { body = null; }
    if (res.status === 401) {
      KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      return { data: null, error: { message: (body && body.error) || 'Unauthorised', status: 401 } };
    }
    if (!res.ok) return { data: null, error: { message: (body && body.error) || res.statusText, status: res.status } };
    return { data: body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body, error: null };
  }
  function rpc(name, params) {
    return apiFetch('/api/rpc', { method: 'POST', body: JSON.stringify({ function: name, params: params || {} }) });
  }
  function from(table) {
    var q = { table: table, select: '*', filters: [], order: [], limit: null, single: false, maybeSingle: false, write: null };
    var b = {
      select: function (cols) { q.select = cols == null ? '*' : String(cols); return b; },
      eq: function (col, val) { q.filters.push({ op: 'eq', col: col, val: val }); return b; },
      neq: function (col, val) { q.filters.push({ op: 'neq', col: col, val: val }); return b; },
      is: function (col, val) { q.filters.push({ op: 'is', col: col, val: val }); return b; },
      in: function (col, val) { q.filters.push({ op: 'in', col: col, val: val }); return b; },
      order: function (col, o) { q.order.push({ col: col, ascending: !(o && o.ascending === false) }); return b; },
      limit: function (n) { q.limit = n; return b; },
      single: function () { q.single = true; return b; },
      maybeSingle: function () { q.maybeSingle = true; return b; },
      insert: function () { q.write = 'insert'; return b; },
      update: function () { q.write = 'update'; return b; },
      upsert: function () { q.write = 'upsert'; return b; },
      delete: function () { q.write = 'delete'; return b; },
      then: function (ok, ko) {
        return apiFetch('/api/db/query', { method: 'POST', body: JSON.stringify(q) }).then(ok, ko);
      },
    };
    return b;
  }
  function getSession() {
    try { navigator.sendBeacon('/__fake/getsession'); } catch (e) {}
    throw new Error('fake JC: Cabinet Core must never call supabaseClient.auth.getSession()');
  }
  var nope = function () { return Promise.resolve({ data: null, error: { message: 'storage: a later turn' } }); };
  window.apiFetch = apiFetch;
  window.rpc = rpc;
  window.supabaseClient = {
    auth: { getSession: getSession },
    from: from,
    rpc: rpc,
    storage: { from: function () { return { upload: nope, createSignedUrl: nope, download: nope }; } },
    channel: function () { var c = { on: function () { return c; }, subscribe: function () { return c; } }; return c; },
  };
})();
`;

const LOGIN = `<!doctype html><html><head><meta charset="utf-8"><title>Fake Joinery Core login</title></head>
<body style="font-family:sans-serif;padding:40px">
<h1>Joinery Core (fake, for the walk)</h1>
<button id="signin" style="font-size:18px;padding:10px 24px">Sign in</button>
<script>
document.getElementById('signin').addEventListener('click', function () {
  var who = 'admin';
  localStorage.setItem('authToken', 'fake-token-' + who + '-' + Date.now());
  localStorage.setItem('currentSession', JSON.stringify({ access_token: 'fake', expires_at: 0 }));
  localStorage.setItem('currentUser', JSON.stringify({ id: 'usr-admin', email: 'admin@skylon.test' }));
  var next = new URLSearchParams(location.search).get('next') || '/cabinet/';
  if (!/^\\/[^\\/]/.test(next)) next = '/cabinet/';
  location.replace(next);
});
</script></body></html>`;

// === THE SERVER =============================================================
export async function startFakeJc({ port = 4380, upstream = 4173, host = '127.0.0.1' } = {}) {
  let db = seed();
  let as = 'admin';
  let seq = 0;
  const counters = {
    me: 0, me401: 0, query: 0, queryByTable: {}, queryRefused: 0, writesRefused: 0, starOnItems: 0, designReads: 0,
    rpc: {}, rpcKeepalive: {}, rpcRefused: 0, getSession: 0, proxied: 0,
  };
  const log = [];
  const bump = (obj, k) => { obj[k] = (obj[k] || 0) + 1; };
  const reset = () => {
    for (const k of Object.keys(counters)) counters[k] = typeof counters[k] === 'number' ? 0 : {};
    log.length = 0;
  };

  const send = (res, status, body, type = 'application/json') => {
    const text = type === 'application/json' ? JSON.stringify(body) : body;
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(text);
  };
  const readBody = (req) => new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({ __bad: raw }); }
    });
  });
  const bearer = (req) => {
    const m = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/);
    return m && m[1] && m[1] !== 'null' ? m[1] : null;
  };
  const user = () => USERS[as];
  const allowed = () => ALLOWED_ROLES.has(user().role) && user().cabinet_core_company;

  const project = (row, cols) => {
    if (!cols || cols.trim() === '*') return { ...row };
    const out = {};
    for (const c of cols.split(',').map((s) => s.trim()).filter(Boolean)) out[c] = row[c] === undefined ? null : row[c];
    return out;
  };
  const cmp = (a, b) => (a == null ? -1 : b == null ? 1 : a < b ? -1 : a > b ? 1 : 0);

  function query(q) {
    const table = String(q.table || '');
    bump(counters.queryByTable, table);
    if (q.write) { counters.writesRefused += 1; return [403, { error: `Joinery Core refuses a ${q.write} on ${table} here: writes go through rpc.` }]; }
    if (!READABLE.has(table)) { counters.queryRefused += 1; return [403, { error: `Joinery Core does not serve ${table} to Cabinet Core.` }]; }
    if (table === 'cc_items' && String(q.select || '*').trim() === '*') counters.starOnItems += 1;
    if (table === 'cc_items' && /\bdesign\b/.test(String(q.select || ''))) counters.designReads += 1;
    let rows = (db[table] || []).slice();
    if (table === 'cc_items') rows = rows.filter((r) => r.tenant_id === TENANT.id);
    for (const f of q.filters || []) {
      if (f.op === 'eq') rows = rows.filter((r) => r[f.col] === f.val);
      else if (f.op === 'neq') rows = rows.filter((r) => r[f.col] !== f.val);
      else if (f.op === 'is') rows = rows.filter((r) => (r[f.col] ?? null) === f.val);
      else if (f.op === 'in') rows = rows.filter((r) => (f.val || []).includes(r[f.col]));
    }
    for (const o of [...(q.order || [])].reverse()) rows.sort((a, b) => (o.ascending ? 1 : -1) * cmp(a[o.col], b[o.col]));
    if (Number.isFinite(Number(q.limit)) && q.limit != null) rows = rows.slice(0, Number(q.limit));
    rows = rows.map((r) => project(r, q.select));
    if (q.single) return rows.length === 1 ? [200, { data: rows[0] }] : [406, { error: `Expected one row of ${table}, found ${rows.length}.` }];
    if (q.maybeSingle) return rows.length <= 1 ? [200, { data: rows[0] || null }] : [406, { error: `Expected at most one row of ${table}.` }];
    return [200, { data: rows }];
  }

  const strip = (r) => { const { design, ...rest } = r; return rest; };
  function rpcCall(name, p) {
    if (name === 'cc_create_item') {
      const both = p.p_pipeline_id && p.p_project_id;
      const none = !p.p_pipeline_id && !p.p_project_id;
      if (both || none) return [400, { error: 'An item belongs to exactly one project: a pipeline id or a project id.' }];
      const proj = p.p_project_id ? db.projects.find((x) => x.id === p.p_project_id) : db.pipeline_projects.find((x) => x.id === p.p_pipeline_id);
      if (!proj) return [404, { error: 'That project is not in Joinery Core.' }];
      seq += 1;
      const name = String(p.p_name || '').trim() || 'Untitled item';
      const row = {
        id: `itm-walk-${seq}`, tenant_id: TENANT.id, name, revision: 'A', updated_at: new Date().toISOString(), archived_at: null,
        jc_pipeline_id: p.p_pipeline_id || null, jc_project_id: p.p_project_id || null, jc_project_number: proj.project_number,
        folder_name: `${proj.project_number} ${name}`, design: {},
      };
      db.cc_items.push(row);
      return [200, { data: strip(row) }];
    }
    if (name === 'cc_save_item') {
      const row = db.cc_items.find((r) => r.id === p.p_item_id);
      if (!row) return [404, { error: 'That item is not in Joinery Core.' }];
      row.design = p.p_design && typeof p.p_design === 'object' ? p.p_design : {};
      if (p.p_name) row.name = String(p.p_name);
      const t = Math.max(Date.now(), Date.parse(row.updated_at || 0) + 1);
      row.updated_at = new Date(t).toISOString();
      return [200, { data: { id: row.id, updated_at: row.updated_at, revision: row.revision } }];
    }
    if (name === 'cc_archive_item') {
      const row = db.cc_items.find((r) => r.id === p.p_item_id);
      if (!row) return [404, { error: 'That item is not in Joinery Core.' }];
      row.archived_at = p.p_restore ? null : new Date().toISOString();
      return [200, { data: strip(row) }];
    }
    return [404, { error: `Joinery Core has no rpc ${name} for Cabinet Core.` }];
  }

  const designSummary = (d) => {
    if (!d || typeof d !== 'object') return null;
    const units = Array.isArray(d.units) ? d.units : [];
    return {
      keys: Object.keys(d),
      hasProfile: Object.prototype.hasOwnProperty.call(d, 'profile'),
      units: units.map((u) => ({ id: u.id, type: u.type })),
      projectName: d.project?.name ?? null,
      bytes: Buffer.byteLength(JSON.stringify(d)),
    };
  };
  const state = () => ({
    as,
    counters: JSON.parse(JSON.stringify(counters)),
    items: db.cc_items.map((r) => ({ ...strip(r), design: designSummary(r.design) })),
    log: log.slice(),
  });

  function proxy(req, res) {
    counters.proxied += 1;
    const up = http.request({
      host: '127.0.0.1', port: upstream, method: req.method, path: req.url,
      headers: { ...req.headers, host: `127.0.0.1:${upstream}` },
    }, (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res); });
    up.on('error', (err) => send(res, 502, `vite preview at ${upstream} did not answer: ${err.message}`, 'text/plain'));
    req.pipe(up);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);
    const path = url.pathname;
    try {
      if (path === '/js/api-client.js') return send(res, 200, SHIM, 'application/javascript');
      if (path === '/login.html') return send(res, 200, LOGIN, 'text/html');
      if (path === '/dashboard.html' || path === '/cabinet-core.html') return send(res, 200, `<!doctype html><h1>Joinery Core ${path} (fake)</h1>`, 'text/html');
      if (path === '/__fake/state') return send(res, 200, state());
      if (path === '/__fake/reset') { reset(); return send(res, 200, { ok: true }); }
      if (path === '/__fake/reseed') { db = seed(); seq = 0; as = 'admin'; reset(); return send(res, 200, { ok: true }); }
      if (path === '/__fake/user') {
        const want = url.searchParams.get('as');
        if (!USERS[want]) return send(res, 400, { error: 'as=admin|employee' });
        as = want;
        return send(res, 200, { as });
      }
      if (path === '/__fake/getsession') { counters.getSession += 1; return send(res, 204, ''); }
      if (path === '/api/auth/me') {
        counters.me += 1;
        if (!bearer(req)) { counters.me401 += 1; return send(res, 401, { error: 'Not signed in' }); }
        log.push({ at: Date.now(), path, as });
        return send(res, 200, { user: { ...user() }, organization: { id: TENANT.id, name: TENANT.name } });
      }
      if (path === '/api/db/query' && req.method === 'POST') {
        const q = await readBody(req);
        counters.query += 1;
        log.push({ at: Date.now(), path, table: q.table, select: q.select, as });
        if (!bearer(req)) return send(res, 401, { error: 'Not signed in' });
        if (!allowed()) { counters.queryRefused += 1; return send(res, 403, { error: 'Cabinet Core opens for owners, admins and managers.' }); }
        const [status, body] = query(q);
        return send(res, status, body);
      }
      if (path === '/api/rpc' && req.method === 'POST') {
        const body = await readBody(req);
        const name = String(body.function || '');
        const keep = req.headers['x-fake-shim'] !== '1';
        bump(keep ? counters.rpcKeepalive : counters.rpc, name);
        log.push({ at: Date.now(), path, rpc: name, keepalive: keep, as });
        if (!bearer(req)) return send(res, 401, { error: 'Not signed in' });
        if (!allowed()) { counters.rpcRefused += 1; return send(res, 403, { error: 'Cabinet Core opens for owners, admins and managers.' }); }
        const [status, out] = rpcCall(name, body.params || {});
        return send(res, status, out);
      }
      if (path.startsWith('/api/')) return send(res, 404, { error: `fake JC: no ${path}` });
      return proxy(req, res);
    } catch (err) {
      return send(res, 500, { error: String(err?.message || err) });
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  return {
    origin: `http://${host}:${port}`,
    state,
    reset,
    setUser: (who) => { as = who; },
    reseed: () => { db = seed(); seq = 0; reset(); },
    close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); }),
  };
}

// === THE COMMAND LINE =======================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? Number(argv[i + 1]) : d; };
  const fake = await startFakeJc({ port: opt('port', 4380), upstream: opt('upstream', 4173) });
  process.stdout.write(`fake Joinery Core at ${fake.origin} (proxying to 127.0.0.1:${opt('upstream', 4173)})\n`);
}
