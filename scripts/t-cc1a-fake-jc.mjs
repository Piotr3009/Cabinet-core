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
// T-CC1b F16.1 (CLAUDE.md T-CC1b PART E): THE FAKE GROWS AND LOSES NOTHING.
// The owner, 01.11.2026: *"materialy z JC (jego baza)"*, *"logo domyslne z JC"*,
// *"przyjmiemy GPT, open AI, zaprojektuj polaczenie"*. Three more reads
// (`stock_categories`: Sheets with Melamine and MDF, Hardware with Hinges and
// Runners, Consumables; `stock_items`: eight rows; `company_settings.logo_url`
// pointing at a PNG served here at /fake/logo.png) and ONE endpoint, `POST
// /api/ai/visualise`: 401 without a token, 403 for the employee, 503 when the
// fake runs with `--no-ai-key`, else one PNG (a 64 by 64 tinted square written
// here, no file) after `--ai-delay-ms` (300), every call counted per token
// (`counters.ai`). Two more handles: GET /__fake/tenant?id=<uuid> (the uuid
// /api/auth/me names as the organisation; the rows of the old uuid move with
// it, so the same items stay listed) and GET /__fake/ai?key=0|1&delay=<ms>.
// The tenant is T-CC1a's `ten-skylon` unless `--tenant <uuid>` (or
// `startFakeJc({ tenantId })`) says otherwise; T-CC1a's walk is unchanged.
//
// T-CC2a F4.3 (CLAUDE.md T-CC2a, WHAT JOINERY CORE GIVES): THE FAKE GROWS AGAIN
// AND LOSES NOTHING. The owner, 01.11.2026: *"zebysmy przypisali pewne materialy
// na stale nie do projektu, tylko na stale"*. One more read, `cc_material_links`
// (the tenant's rows only, every column but tenant_id), seeded with two links
// (MDF 18 to the fake's MDF 18 row at 2440 x 1220, a hinge to the Blum 110 row),
// and the two functions with every refusal of the contract: 22023 for a bad
// argument (an id off ^[a-z0-9][a-z0-9._-]{0,119}$, a yield outside 1.0 to 3.0, a
// sheet size outside 100 to 6000 mm, a coverage outside 0.1 to 100, a `sheet.` id
// without both sizes, a list not of 1 to 500), 42501 for a stock row that is not
// this company's. Two more stock rows (MDF 18 and an Egger H3325 18 mm board, for
// a suggestion). `CC_FAKE_NO_LINKS=1` (or `--no-links`, or GET /__fake/links?on=0)
// answers 403 for the read and both functions: the SQL of T-JC3a not run. The
// shim passes a refusal's `code` beside its words.
//
//   node scripts/t-cc1a-fake-jc.mjs [--port 4380] [--upstream 4173] [--tenant <uuid>] [--no-ai-key] [--ai-delay-ms 300] [--no-links]
//   or: import { startFakeJc } from './t-cc1a-fake-jc.mjs'

import http from 'node:http';
import { deflateSync } from 'node:zlib';

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
  // T-CC1b: the tenant's stock (CLAUDE.md T-CC1b, WHAT JOINERY CORE GIVES).
  'stock_items', 'stock_categories',
  // T-CC2a: the company's material links (CLAUDE.md T-CC2a, WHAT JOINERY CORE GIVES).
  'cc_material_links',
]);

/** T-CC1b F16.1 . the company's logo, served by the fake (company_settings.logo_url). */
const LOGO_PATH = '/fake/logo.png';

// === A PNG WRITTEN HERE (no file, no dependency) ============================
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
/** A w by h RGB PNG: `paint(x, y) -> [r, g, b]`. */
function png(w, h, paint) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x += 1) raw.set(paint(x, y), row + 1 + x * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/** The logo: a dark square with a gold bar, 64 by 64. */
const LOGO_PNG = png(64, 64, (x, y) => (y > 24 && y < 40 && x > 8 && x < 56 ? [201, 162, 74] : [32, 36, 44]));
/** The AI picture: a 64 by 64 square, tinted by the call (three calls, three tints, so a pick is seen). */
const TINTS = [[176, 132, 92], [96, 140, 120], [110, 120, 168]];
const aiPicture = (n) => {
  const [r, g, b] = TINTS[(n - 1) % TINTS.length];
  return `data:image/png;base64,${png(64, 64, (x, y) => {
    const shade = 0.75 + 0.25 * ((x + y) / 126);
    return [Math.round(r * shade), Math.round(g * shade), Math.round(b * shade)];
  }).toString('base64')}`;
};

// === THE TENANT'S STOCK (T-CC1b F16.1) ======================================
function stockSeed() {
  const cat = (id, name, type, parent, order) => ({ id, name, type, parent_category_id: parent, display_order: order });
  const row = (n, name, category, subcategory, unit, cost, extra = {}) => ({
    id: `5e0c4b1a-7f2d-4c3e-9a8b-${String(n).padStart(12, '0')}`, name, category, subcategory, unit,
    current_quantity: 20, min_quantity: 2, cost_per_unit: cost, size: '', thickness: null, color: '',
    item_number: '', image_url: null, supplier_id: null, notes: '', ...extra,
  });
  return {
    stock_categories: [
      cat('sc-sheets', 'Sheets', 'category', null, 1),
      cat('sc-melamine', 'Melamine', 'subcategory', 'sc-sheets', 1),
      cat('sc-mdf', 'MDF', 'subcategory', 'sc-sheets', 2),
      cat('sc-hardware', 'Hardware', 'category', null, 2),
      cat('sc-hinges', 'Hinges', 'subcategory', 'sc-hardware', 1),
      cat('sc-runners', 'Runners', 'subcategory', 'sc-hardware', 2),
      cat('sc-consumables', 'Consumables', 'category', null, 3),
    ],
    stock_items: [
      row(1, 'Egger W1000 Premium White melamine 18 mm', 'Sheets', 'Melamine', 'sheet', 38.5,
        { thickness: '18', color: 'White', size: '2800 x 2070', item_number: 'EG-W1000-18' }),
      row(2, 'Egger H1145 Natural Bardolino Oak melamine 18 mm', 'Sheets', 'Melamine', 'sheet', 52,
        { thickness: '18', color: 'Oak', size: '2800 x 2070', item_number: 'EG-H1145-18' }),
      row(3, 'MDF 22 mm', 'Sheets', 'MDF', 'sheet', 34.9, { thickness: '22', size: '2440 x 1220', item_number: 'MDF-22' }),
      row(4, 'ABS edging white 22 x 1', 'Consumables', null, 'm', 0.55, { thickness: '1', color: 'White', item_number: 'ABS-22-1' }),
      row(5, 'Blum Clip top Blumotion 110 hinge', 'Hardware', 'Hinges', 'pcs', 3.8, { item_number: '71B3550' }),
      row(6, 'Blum Clip top 155 hinge', 'Hardware', 'Hinges', 'pcs', 5.1, { item_number: '71T6550' }),
      row(7, 'Blum Movento runner pair 500', 'Hardware', 'Runners', 'pairs', 6.9, { size: '500', item_number: '760H5000S' }),
      row(8, 'Paint, Hague Blue 2.5 L', 'Consumables', null, 'tin', 42, { color: 'Hague Blue' }),
      // T-CC2a F4.3: the MDF 18 the seed link points at, and an Egger board a suggestion finds by its decor code.
      row(9, 'MDF 18 mm', 'Sheets', 'MDF', 'sheet', 29.5, { thickness: '18', size: '2440 x 1220', item_number: 'MDF-18' }),
      row(10, 'Egger H3325 ST28 Tobacco Gladstone Oak 18 mm', 'Sheets', 'Melamine', 'sheet', 61,
        { thickness: '18', color: 'Oak', size: '2800 x 2070', item_number: 'EG-H3325-18' }),
    ],
  };
}

function seed(now = Date.now()) {
  const iso = (minsAgo) => new Date(now - minsAgo * 60000).toISOString();
  return {
    clients: [
      { id: 'cli-1', company_name: 'Harbour Homes', contact_person: 'J. Harbour', address: '1 Quay Road' },
      { id: 'cli-2', company_name: 'Smith Family', contact_person: 'A. Smith', address: '2 Elm Close' },
    ],
    company_settings: [{ company_name: TENANT.name, company_address: '3 Mill Lane', logo_url: LOGO_PATH }],
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
    ...stockSeed(),
    cc_material_links: linkSeed(iso(30)),
  };
}

// === THE COMPANY'S LINKS (T-CC2a F4.3) ======================================
/** The two seed links: catalogue ids of src/engine/catalogueData.js, stock rows of the seed above. */
export const SEED_LINKS = {
  mdf18: { cc_material_id: 'sheet.mdf.18', stock_item_id: '5e0c4b1a-7f2d-4c3e-9a8b-000000000009', sheet_width_mm: 1220, sheet_length_mm: 2440 },
  hinge: { cc_material_id: 'hinge.blum.clip-top-blumotion.110', stock_item_id: '5e0c4b1a-7f2d-4c3e-9a8b-000000000005' },
};
/** A stock row of ANOTHER company: never readable here; linking it is refused 42501. */
export const FOREIGN_STOCK_ID = 'f0f0f0f0-0000-4000-8000-0000000000aa';

function linkSeed(at) {
  const row = (l) => ({
    tenant_id: TENANT.id, yield: null, sheet_width_mm: null, sheet_length_mm: null, coverage_m2_per_l: null,
    updated_by: USERS.admin.id, updated_at: at, ...l,
  });
  return [row(SEED_LINKS.mdf18), row(SEED_LINKS.hinge)];
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
    if (!res.ok) return { data: null, error: { message: (body && body.error) || res.statusText, status: res.status, code: (body && body.code) || null } };
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
export async function startFakeJc({
  port = 4380, upstream = 4173, host = '127.0.0.1', tenantId = TENANT.id, aiKey = true, aiDelayMs = 300,
  links = process.env.CC_FAKE_NO_LINKS !== '1',
} = {}) {
  // T-CC2a F4.3 . false: the SQL of T-JC3a not run (403 for the read and both functions).
  const linksOn = { on: links !== false };
  // T-CC1b F16.1 . the tenant's uuid is the fake's to switch (walk station g); T-CC1a's stays the default.
  let tenant = TENANT.id;
  const ai = { key: aiKey !== false, delayMs: Math.max(0, Number(aiDelayMs) || 0) };
  const seeded = () => {
    const fresh = seed();
    for (const r of fresh.cc_items) r.tenant_id = tenant;
    for (const r of fresh.cc_material_links) r.tenant_id = tenant;
    return fresh;
  };
  const setTenant = (id) => {
    const next = String(id || '').trim();
    if (!next) return tenant;
    for (const r of db.cc_items) if (r.tenant_id === tenant) r.tenant_id = next;
    for (const r of db.cc_material_links) if (r.tenant_id === tenant) r.tenant_id = next;
    tenant = next;
    return tenant;
  };
  let db = seed();
  setTenant(tenantId);
  let as = 'admin';
  let seq = 0;
  const counters = {
    me: 0, me401: 0, query: 0, queryByTable: {}, queryRefused: 0, writesRefused: 0, starOnItems: 0, designReads: 0,
    rpc: {}, rpcKeepalive: {}, rpcRefused: 0, getSession: 0, proxied: 0,
    // T-CC1b: the AI calls per token, their answers by status, and the logo fetches.
    ai: {}, aiStatus: {}, logo: 0,
    // T-CC2a: links saved and cleared, refusals by code.
    linksSaved: 0, linksCleared: 0, linkRefused: {},
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
  const sleepMs = (ms) => new Promise((r) => { setTimeout(r, ms); });
  const cmp = (a, b) => (a == null ? -1 : b == null ? 1 : a < b ? -1 : a > b ? 1 : 0);

  function query(q) {
    const table = String(q.table || '');
    bump(counters.queryByTable, table);
    if (q.write) { counters.writesRefused += 1; return [403, { error: `Joinery Core refuses a ${q.write} on ${table} here: writes go through rpc.` }]; }
    if (!READABLE.has(table) || (table === 'cc_material_links' && !linksOn.on)) { counters.queryRefused += 1; return [403, { error: `Joinery Core does not serve ${table} to Cabinet Core.` }]; }
    if (table === 'cc_items' && String(q.select || '*').trim() === '*') counters.starOnItems += 1;
    if (table === 'cc_items' && /\bdesign\b/.test(String(q.select || ''))) counters.designReads += 1;
    let rows = (db[table] || []).slice();
    if (table === 'cc_items') rows = rows.filter((r) => r.tenant_id === tenant);
    if (table === 'cc_material_links') {
      rows = rows.filter((r) => r.tenant_id === tenant);
      if (/\btenant_id\b/.test(String(q.select || '*')) || String(q.select || '*').trim() === '*') counters.starOnLinks = (counters.starOnLinks || 0) + 1;
    }
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
        id: `itm-walk-${seq}`, tenant_id: tenant, name, revision: 'A', updated_at: new Date().toISOString(), archived_at: null,
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
    if (name === 'cc_save_material_links' || name === 'cc_clear_material_link') return linkCall(name, p);
    return [404, { error: `Joinery Core has no rpc ${name} for Cabinet Core.` }];
  }

  // T-CC2a F4.3 . the two functions of T-JC3a, with every refusal of the contract (same codes, same rules).
  const LINK_ID = /^[a-z0-9][a-z0-9._-]{0,119}$/;
  const refuse = (code, error) => { bump(counters.linkRefused, code); return [code === '42501' ? 403 : 400, { error, code }]; };
  const inRange = (v, lo, hi) => v == null || (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi);
  function linkCall(name, p) {
    if (!linksOn.on) return [403, { error: `Joinery Core has no rpc ${name} for Cabinet Core.` }];
    if (name === 'cc_clear_material_link') {
      const id = String(p.p_cc_material_id || '');
      if (!LINK_ID.test(id)) return refuse('22023', `"${id}" is not a Cabinet Core material id.`);
      const before = db.cc_material_links.length;
      db.cc_material_links = db.cc_material_links.filter((r) => !(r.tenant_id === tenant && r.cc_material_id === id));
      const cleared = db.cc_material_links.length < before;
      if (cleared) counters.linksCleared += 1;
      return [200, { data: { cleared } }];
    }
    const list = p.p_links;
    if (!Array.isArray(list) || list.length < 1 || list.length > 500) return refuse('22023', 'Send between 1 and 500 links at a time.');
    const mine = new Set(db.stock_items.map((r) => r.id));
    for (const l of list) {
      const id = String(l?.cc_material_id || '');
      if (!LINK_ID.test(id)) return refuse('22023', `"${id}" is not a Cabinet Core material id.`);
      if (!inRange(l.yield, 1.0, 3.0)) return refuse('22023', 'The offcut allowance must be between 0 and 200 % (a yield of 1.0 to 3.0).');
      if (!inRange(l.sheet_width_mm, 100, 6000) || !inRange(l.sheet_length_mm, 100, 6000)) return refuse('22023', 'A sheet size must be between 100 and 6000 mm.');
      if (!inRange(l.coverage_m2_per_l, 0.1, 100)) return refuse('22023', 'The coverage must be between 0.1 and 100 m2 per litre.');
      if (id.startsWith('sheet.') && (l.sheet_width_mm == null || l.sheet_length_mm == null)) return refuse('22023', 'A sheet needs both its width and its length.');
      if (!l.stock_item_id || !mine.has(String(l.stock_item_id))) return refuse('42501', 'That stock item is not in your company\'s Joinery Core stock.');
    }
    const at = new Date().toISOString();
    for (const l of list) {
      const row = {
        tenant_id: tenant, cc_material_id: String(l.cc_material_id), stock_item_id: String(l.stock_item_id),
        yield: l.yield ?? null, sheet_width_mm: l.sheet_width_mm ?? null, sheet_length_mm: l.sheet_length_mm ?? null,
        coverage_m2_per_l: l.coverage_m2_per_l ?? null, updated_by: user().id, updated_at: at,
      };
      const i = db.cc_material_links.findIndex((r) => r.tenant_id === tenant && r.cc_material_id === row.cc_material_id);
      if (i >= 0) db.cc_material_links[i] = row; else db.cc_material_links.push(row);
    }
    counters.linksSaved += list.length;
    return [200, { data: { saved: list.length } }];
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
    tenant,
    ai: { ...ai },
    counters: JSON.parse(JSON.stringify(counters)),
    items: db.cc_items.map((r) => ({ ...strip(r), design: designSummary(r.design) })),
    links: { on: linksOn.on, rows: db.cc_material_links.filter((r) => r.tenant_id === tenant).map(({ tenant_id, ...r }) => r) },
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
      if (path === '/__fake/reseed') { db = seeded(); seq = 0; as = 'admin'; reset(); return send(res, 200, { ok: true }); }
      if (path === LOGO_PATH) {
        counters.logo += 1;
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'Content-Length': LOGO_PNG.length });
        return res.end(LOGO_PNG);
      }
      if (path === '/__fake/tenant') {
        const id = url.searchParams.get('id');
        if (!id) return send(res, 400, { error: 'id=<tenant uuid>' });
        return send(res, 200, { tenant: setTenant(id) });
      }
      if (path === '/__fake/ai') {
        if (url.searchParams.has('key')) ai.key = url.searchParams.get('key') !== '0';
        if (url.searchParams.has('delay')) ai.delayMs = Math.max(0, Number(url.searchParams.get('delay')) || 0);
        return send(res, 200, { ...ai });
      }
      if (path === '/__fake/links') {
        if (url.searchParams.has('on')) linksOn.on = url.searchParams.get('on') !== '0';
        return send(res, 200, { on: linksOn.on });
      }
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
        return send(res, 200, { user: { ...user(), tenant_id: tenant }, organization: { id: tenant, name: TENANT.name } });
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
      if (path === '/api/ai/visualise' && req.method === 'POST') {
        // T-CC1b F13 and F16.1: the AI picture through Joinery Core (T-JC2a's endpoint, the fake's lines only).
        const body = await readBody(req);
        const who = bearer(req);
        bump(counters.ai, who || '(no token)');
        log.push({ at: Date.now(), path, as, bytes: String(body.image || '').length, size: body.size, quality: body.quality });
        const answer = (status, out) => { bump(counters.aiStatus, String(status)); return send(res, status, out); };
        if (!who) return answer(401, { error: 'Not signed in' });
        if (!allowed()) return answer(403, { error: 'AI visualisation opens for owners, admins and managers of a listed company.' });
        if (!ai.key) return answer(503, { error: 'AI visualisation is not configured for this server yet.' });
        const started = Date.now();
        await sleepMs(ai.delayMs);
        return answer(200, { image: aiPicture(counters.ai[who]), model: 'fake-image-model', seconds: (Date.now() - started) / 1000 });
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
    setTenant,
    setAi: ({ key, delayMs } = {}) => {
      if (key !== undefined) ai.key = key !== false;
      if (delayMs !== undefined) ai.delayMs = Math.max(0, Number(delayMs) || 0);
      return { ...ai };
    },
    reseed: () => { db = seeded(); seq = 0; reset(); },
    setLinks: (on) => { linksOn.on = on !== false; return linksOn.on; },
    close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); }),
  };
}

// === THE COMMAND LINE =======================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? Number(argv[i + 1]) : d; };
  const word = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  const fake = await startFakeJc({
    port: opt('port', 4380), upstream: opt('upstream', 4173), tenantId: word('tenant', TENANT.id),
    aiKey: !argv.includes('--no-ai-key'), aiDelayMs: opt('ai-delay-ms', 300),
    links: !argv.includes('--no-links') && process.env.CC_FAKE_NO_LINKS !== '1',
  });
  process.stdout.write(`fake Joinery Core at ${fake.origin} (proxying to 127.0.0.1:${opt('upstream', 4173)})\n`);
}
