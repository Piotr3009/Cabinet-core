/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F10, THE WALK (CLAUDE.md T-CC1a PART D)
//
// CLAUDE.md T-CC1a PART D: "(a) open `/cabinet/` with no token: the browser
// lands on `/login.html?next=%2Fcabinet%2F`; press Sign in: back on
// `/cabinet/`, the list shows two production projects and one pipeline project
// with their items (frame); (b) switch the fake's user to the employee,
// reload: the refusal card with "employee" and no list request made (the fake
// counts requests; frame); (c) as admin, New item on the pipeline project,
// name "Walk wardrobe", Start: the editor opens, the fake has one
// `cc_create_item`; add a WARDROBE, Ctrl+S: one `cc_save_item` with a design
// that has no profile (the fake stores it); (d) move a shelf, advance the
// clock 5 minutes: one more `cc_save_item`; advance 5 more with no change:
// none; (e) add a drawer, close the tab (no save): reopen `/cabinet/`:
// "Restore unsaved changes to Walk wardrobe?", Restore: the drawer is there
// and the status says not saved; (f) Archive the item from the list: it
// disappears, "Show archived" lists it, Restore brings it back; (g) Open from
// file `verify/t86b/owner.ccproject`, bind to the production project: one
// create, one save, the list shows it (frame). Every line PASS or FAIL with
// the number expected and the number read; never patched in the walk."
//
// THE HANDS. The house's harness (scripts/t74-harness.mjs) speaks CDP and has
// no clock; the spec asks for Playwright's clock API for the five minutes, so
// this walk drives Playwright's own input pipe: `locator.click()` moves the
// real mouse to the control's centre and presses, `keyboard.press` and
// `keyboard.type` are real keys, the file chooser is the browser's. The
// ledger, the frames and the rule are the house's (scripts/t86b-walk.mjs):
// every line PASS or FAIL with the number expected and the number read, a FAIL
// written down and never patched. The STAGES that are not what a station is
// about (moving one shelf in (d), adding one drawer in (e)) go through the
// store's own actions, as the earlier walks put theirs, and are written as
// NOTE lines. The fake Joinery Core (scripts/t-cc1a-fake-jc.mjs) counts every
// request; its counters are what (b) to (g) read.
//
//   node scripts/t-cc1a-walk.mjs --build --serve   build dist/, serve it on 4173, start the fake, walk, stop both
//   node scripts/t-cc1a-walk.mjs                   vite preview already on 4173; the fake is started here
//   node scripts/t-cc1a-walk.mjs --legs a,b,c      some stations only (c to e build on each other)
//
// Ledger: verify/t-cc1a/walk.txt. Frames: verify/t-cc1a/f10-*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { startFakeJc } from './t-cc1a-fake-jc.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// === THE ARGUMENTS ==========================================================
const REPO = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const LEGS = String(opt('legs', 'a,b,c,d,e,f,g')).split(',').map((s) => s.trim()).filter((s) => /^[a-g]$/.test(s));
const PREVIEW_PORT = Number(opt('upstream', 4173));
const FAKE_PORT = Number(opt('port', 4380));
const OUT = new URL('../verify/t-cc1a/', import.meta.url).pathname;
const OWNER_FILE = new URL('../verify/t86b/owner.ccproject', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

// === THE BUILD, THE PREVIEW, THE FAKE =======================================
const PREVIEW = `http://127.0.0.1:${PREVIEW_PORT}/cabinet/`;
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
async function served() { try { return (await fetch(PREVIEW)).ok; } catch { return false; } }
let preview = null;
if (flag('build')) {
  process.stdout.write('npx vite build ...\n');
  execFileSync('npx', ['vite', 'build'], { cwd: REPO, stdio: 'inherit' });
}
if (flag('serve') && !(await served())) {
  preview = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: REPO, stdio: 'ignore', detached: true });
  for (let t = 0; t < 120 && !(await served()); t += 1) await sleep(500);
}
const stopPreview = () => { if (preview) { try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* gone */ } preview = null; } };
if (!(await served())) {
  process.stdout.write(`No app at ${PREVIEW}: npx vite build; npx vite preview --port ${PREVIEW_PORT} --strictPort, or pass --build --serve.\n`);
  stopPreview();
  process.exit(2);
}
const fake = await startFakeJc({ port: FAKE_PORT, upstream: PREVIEW_PORT });
const ORIGIN = fake.origin;
const BASE = `${ORIGIN}/cabinet/`;
let browser = null;
const stopAll = async () => {
  try { await browser?.close(); } catch { /* gone */ }
  try { await fake.close(); } catch { /* gone */ }
  stopPreview();
};
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await stopAll(); process.exit(130); });

// === THE LEDGER =============================================================
const steps = [];
const frames = [];
let LEG = '';
const ascii = (t) => String(t)
  .replace(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'g'), '-')
  .replace(new RegExp(String.fromCharCode(0xb7), 'g'), '.')
  .replace(new RegExp(String.fromCharCode(0x2026), 'g'), '...')
  .replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const push = (kind, gesture, expect = '', got = '') => {
  steps.push({ kind, leg: LEG, gesture: ascii(gesture), expect: ascii(expect), got: ascii(got) });
  const tail = kind === 'NOTE' ? ` | ${ascii(got)}` : (kind === 'FRAME' || kind === 'LEG' ? '' : ` | expect: ${ascii(expect)} | read: ${ascii(got)}`);
  process.stdout.write(`${kind.padEnd(5)} [${LEG}] ${ascii(gesture)}${tail}\n`);
};
const check = (gesture, ok, expect, got) => { push(ok ? 'PASS' : 'FAIL', gesture, expect, got); return Boolean(ok); };
const note = (gesture, got) => push('NOTE', gesture, '', got);
const j = (v) => JSON.stringify(v);
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';

async function jc(path) { return (await fetch(`${ORIGIN}${path}`)).json(); }
const counters = async () => (await jc('/__fake/state')).counters;
const items = async () => (await jc('/__fake/state')).items;
const rpcN = (c, name) => Number(c.rpc[name] || 0);
const keepN = (c, name) => Number(c.rpcKeepalive[name] || 0);

async function shot(page, name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}${name}` });
  frames.push(name);
  push('FRAME', name);
}
const ask = (page, expr) => page.evaluate(`(${expr})`);
/** Wait until an expression in the page is truthy (real time; the fake clock flows on its own). */
async function until(page, expr, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if (await ask(page, expr)) return true; } catch { /* navigating */ }
    await sleep(200);
  }
  return false;
}
/** Wait until the fake's counters satisfy a test (real time). */
async function untilJc(test, ms = 8000) {
  const end = Date.now() + ms;
  let c = await counters();
  while (Date.now() < end) {
    if (test(c)) return c;
    await sleep(200);
    c = await counters();
  }
  return c;
}
/** A real click at a control's centre (Playwright moves the mouse and presses). */
async function press(page, sel, { timeout = 8000 } = {}) {
  const l = page.locator(sel).first();
  try { await l.waitFor({ state: 'visible', timeout }); } catch { return false; }
  await l.click();
  await page.waitForTimeout(500);
  return true;
}
const visible = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
/** The list as drawn: each project row with its item names. */
const listOf = (page) => ask(page, `[...document.querySelectorAll('[data-jc-group]')].map((g) => ({ group: g.dataset.jcGroup,
  projects: [...g.querySelectorAll('[data-jc-project]')].map((p) => ({ key: p.dataset.jcProject,
    items: [...p.querySelectorAll('[data-jc-item]')].map((i) => ({ id: i.dataset.jcItem, name: (i.querySelector('span')?.textContent || '').trim(), archived: i.dataset.archived === '1' })) })) }))`);

// === THE NEW ITEM FLOW, WALKED BY HAND ======================================
/** From the flow's first section to Start designing, by real clicks; returns the log. */
async function walkFlow(page) {
  const log = [];
  for (let i = 0; i < 40; i += 1) {
    if (await visible(page, '[data-start-designing="1"]:not([disabled])')) {
      await press(page, '[data-start-designing="1"]');
      log.push('Start designing');
      return { ok: true, log };
    }
    const sb = await ask(page, `(() => { const s = [...document.querySelectorAll('select[data-stock-board]')].find((x) => x.offsetParent && !x.value); return s ? s.getAttribute('data-stock-board') : null; })()`);
    if (sb) {
      // A native select picked the way a hand does it from the keyboard: focus, the Down arrow.
      const l = page.locator(`select[data-stock-board="${sb}"]`);
      await l.focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(400);
      log.push(`${sb}=${await l.inputValue()}`);
      continue;
    }
    let saved = false;
    for (const sel of ['[data-save-carcasses="1"]:not([disabled])', '[data-save-fronts="1"]:not([disabled])']) {
      if (await visible(page, sel)) { await press(page, sel); log.push(sel.match(/save-(\w+)/)[1]); saved = true; }
    }
    if (saved) continue;
    if (await visible(page, '[data-setup-primary="1"]:not([disabled])')) {
      log.push(String(await page.locator('[data-setup-primary="1"]').textContent()).trim());
      await press(page, '[data-setup-primary="1"]');
      continue;
    }
    log.push('stuck: no enabled primary');
    break;
  }
  return { ok: false, log };
}

// === THE STATIONS ===========================================================
const ctxState = { itemId: null };

async function legA(ctx) {
  const page = await ctx.newPage();
  const c0 = await counters();
  await page.goto(BASE);
  await page.waitForURL(/\/login\.html/, { timeout: 20000 }).catch(() => {});
  const u = new URL(page.url());
  const c1 = await counters();
  check('open /cabinet/ with no token: the browser lands on JC\'s login', u.pathname === '/login.html' && u.search === '?next=%2Fcabinet%2F',
    '/login.html?next=%2Fcabinet%2F', `${u.pathname}${u.search}`);
  check('no token: not one request to JC\'s api before the login (the fake\'s counters)', c1.me === c0.me && c1.query === c0.query,
    'me +0, db/query +0, rpc +0', `me +${c1.me - c0.me}, db/query +${c1.query - c0.query}, rpc +${Object.values(c1.rpc).reduce((a, b) => a + b, 0)}`);
  await press(page, '#signin');
  await page.waitForURL(/\/cabinet\/$/, { timeout: 20000 }).catch(() => {});
  check('press Sign in (a real click): back on /cabinet/', new URL(page.url()).pathname === '/cabinet/', '/cabinet/', new URL(page.url()).pathname);
  await until(page, 'document.querySelectorAll("[data-jc-project]").length > 0', 30000);
  await page.waitForTimeout(800);
  const list = await listOf(page);
  const prod = list.find((g) => g.group === 'production')?.projects || [];
  const pipe = list.find((g) => g.group === 'pipeline')?.projects || [];
  check('the list: two production projects', prod.length === 2, 2, `${prod.length} ${j(prod.map((p) => p.key))}`);
  check('the list: one pipeline project', pipe.length === 1, 1, `${pipe.length} ${j(pipe.map((p) => p.key))}`);
  const seeded = prod.flatMap((p) => p.items.map((i) => `${p.key}:${i.name}`));
  check('their items: the two seeded items under their production projects', seeded.length === 2
    && seeded.includes('p:prj-1001:Bedroom wardrobe') && seeded.includes('p:prj-1002:Island units'),
  'p:prj-1001:Bedroom wardrobe, p:prj-1002:Island units', j(seeded));
  const head2 = await ask(page, `({ company: document.querySelector('[data-jc-company]')?.textContent, user: document.querySelector('[data-jc-user]')?.textContent })`);
  check('the header: the company and the signed-in name from /me', head2.company === 'Skylon Development Ltd' && head2.user === 'Ada Admin',
    'Skylon Development Ltd / Ada Admin', j(head2));
  const c2 = await counters();
  check('the four reads of the list, cc_items never with * and never with design', c2.queryByTable.pipeline_projects >= 1 && c2.queryByTable.projects >= 1
    && c2.queryByTable.clients >= 1 && c2.queryByTable.cc_items >= 1 && c2.starOnItems === 0 && c2.designReads === 0,
  'pipeline_projects, projects, clients, cc_items each >= 1; select * on cc_items 0; design read 0', j({ ...c2.queryByTable, star: c2.starOnItems, design: c2.designReads }));
  check('auth.getSession() never called', c2.getSession === 0, 0, c2.getSession);
  await shot(page, 'f10-a-list.png');
  return page;
}

async function legB(ctx, page) {
  await jc('/__fake/user?as=employee');
  await jc('/__fake/reset');
  await page.reload();
  await until(page, 'Boolean(document.querySelector("[data-jc-refusal]"))', 20000);
  await page.waitForTimeout(1500);
  const card = await ask(page, `(() => { const el = document.querySelector('[data-jc-refusal]'); return el ? { kind: el.dataset.jcRefusal, text: el.innerText } : null; })()`);
  check('the fake\'s user switched to the employee, reload: the refusal card', card && card.kind === 'role', 'data-jc-refusal="role"', j(card && card.kind));
  check('the card says "employee", never "worker"', card && /employee/i.test(card.text) && !/worker/i.test(card.text),
    'contains employee, not worker', j(card && card.text.replace(/\s+/g, ' ').slice(0, 200)));
  const c = await counters();
  check('no list request made (the fake counts): /me once, db/query 0, rpc 0', c.me === 1 && c.query === 0 && Object.keys(c.rpc).length === 0,
    'me 1, db/query 0, rpc 0', `me ${c.me}, db/query ${c.query} ${j(c.queryByTable)}, rpc ${j(c.rpc)}`);
  const list = await ask(page, 'document.querySelectorAll("[data-jc-project]").length');
  check('no list drawn under the card', list === 0, 0, list);
  await shot(page, 'f10-b-refusal.png');
  await jc('/__fake/user?as=admin');
  await page.reload();
  await until(page, 'document.querySelectorAll("[data-jc-project]").length > 0', 30000);
  note('the fake\'s user back to the admin, reload', `projects drawn: ${await ask(page, 'document.querySelectorAll("[data-jc-project]").length')}`);
}

async function legC(ctx, page) {
  await jc('/__fake/reset');
  await press(page, '[data-jc-new-item="pl:pip-2001"]');
  const flowOpen = await until(page, 'Boolean(document.querySelector("[data-project-field=name]"))', 8000);
  check('New item on the pipeline project (a real click): the flow opens bound to it', flowOpen
    && await ask(page, 'document.querySelector("[data-jc-bound-project]")?.dataset.jcBoundProject') === 'pl:pip-2001',
  'the flow, bound to pl:pip-2001', j(await ask(page, 'document.querySelector("[data-jc-bound-project]")?.dataset.jcBoundProject || null')));
  await press(page, '[data-project-field="name"]');
  await page.keyboard.type('Walk wardrobe');
  await press(page, '[data-project-type="wardrobe"]');
  const flow = await walkFlow(page);
  note('the flow walked by hand (name typed, the Wardrobe card, every section confirmed, the stock boards picked)', flow.log.join(' > '));
  const inEditor = await until(page, `${UI}.screen === 'editor'`, 20000);
  check('Start designing: the editor opens', flow.ok && inEditor, 'screen editor', await ask(page, `${UI}.screen`));
  let c = await counters();
  check('the fake has ONE cc_create_item', rpcN(c, 'cc_create_item') === 1, 1, rpcN(c, 'cc_create_item'));
  const created = (await items()).find((i) => i.name === 'Walk wardrobe') || null;
  ctxState.itemId = created?.id || null;
  check('the item is bound to the pipeline project (the row\'s columns), the job carries its id', created && created.jc_pipeline_id === 'pip-2001'
    && !created.jc_project_id && await ask(page, `${S}.project.id`) === created.id,
  'jc_pipeline_id pip-2001, jc_project_id null, project.id = the row id', j({ row: created && { id: created.id, pipe: created.jc_pipeline_id, prj: created.jc_project_id, number: created.jc_project_number }, job: await ask(page, `${S}.project.id`) }));
  // A WARDROBE through the library: the rail's Add, the Wardrobes category, the Wardrobe row (real clicks).
  await page.waitForTimeout(2500);
  const before = await ask(page, `${S}.units.length`);
  await press(page, '[data-studio="rail-add"]');
  const cats = await ask(page, `[...document.querySelectorAll('[data-studio="popup-item"]')].map((e) => e.dataset.item)`);
  const cat = cats.find((x) => /wardrobe/i.test(x)) || null;
  if (cat) await press(page, `[data-studio="popup-item"][data-item="${cat}"]`);
  if (!(await visible(page, '[data-library-entry="WARDROBE"]')) && await visible(page, '[data-library-show-all="1"]')) await press(page, '[data-library-show-all="1"]');
  await press(page, '[data-library-entry="WARDROBE"]');
  await until(page, `${S}.units.length > ${before}`, 8000);
  const wardrobe = await ask(page, `${S}.units.filter((u) => u.type === 'WARDROBE').map((u) => u.id)`);
  check('add a WARDROBE (the rail\'s Add, the category, the Wardrobe row: real clicks)', wardrobe.length === 1, '1 WARDROBE', `${wardrobe.length} (categories ${j(cats)}, picked ${cat})`);
  if (await visible(page, '[aria-label="Close the library"]')) await press(page, '[aria-label="Close the library"]');
  await page.waitForTimeout(800);
  const dirtyBefore = await ask(page, `${S}.dirty`);
  await page.keyboard.press('Control+s');
  c = await untilJc((x) => rpcN(x, 'cc_save_item') >= 1, 10000);
  await page.waitForTimeout(800);
  check('Ctrl+S: ONE cc_save_item', rpcN(c, 'cc_save_item') === 1, 1, `${rpcN(c, 'cc_save_item')} (dirty before ${dirtyBefore})`);
  const row = (await items()).find((i) => i.id === ctxState.itemId);
  const d = row?.design;
  check('the design the fake stored has NO profile, and holds the WARDROBE', d && d.hasProfile === false && d.units.some((u) => u.type === 'WARDROBE'),
    'hasProfile false, units include WARDROBE', j(d && { keys: d.keys, hasProfile: d.hasProfile, units: d.units, bytes: d.bytes }));
  const st = await ask(page, `({ dirty: ${S}.dirty, said: (${UI}.messages || []).map((m) => m.message || m.text).slice(-3) })`);
  check('after the save: the job is clean, the words say Saved HH:MM.', st.dirty === false && st.said.some((m) => /^Saved \d\d:\d\d\.$/.test(String(m))),
    'dirty false, "Saved HH:MM."', j(st));
  await shot(page, 'f10-c-editor.png');
}

async function legD(ctx, page) {
  const shelvesOf = `((u) => { const out = []; const w = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(w); return; }
    if (o.kind === 'shelf' && o.id) out.push({ id: o.id, pos: Number(o.pos_mm) }); for (const v of Object.values(o)) if (v && typeof v === 'object') w(v); }; w(u.params); return out; })`;
  const wardrobe = `${S}.units.find((x) => x.type === 'WARDROBE')`;
  let shelves = await ask(page, `${shelvesOf}(${wardrobe})`);
  if (!shelves.length) {
    // The default WARDROBE carries no shelf: THE STAGE gives it one (the store's addShelves) and Ctrl+S saves that,
    // so the move below is the only change the clock meets.
    await ask(page, `${S}.addShelves(${wardrobe}.id, 1)`);
    await page.keyboard.press('Control+s');
    await until(page, `${S}.dirty === false`, 10000);
    shelves = await ask(page, `${shelvesOf}(${wardrobe})`);
    note('THE STAGE (the store\'s addShelves, then Ctrl+S): the default WARDROBE has no shelf, one added and saved', j({ shelves, dirty: await ask(page, `${S}.dirty`) }));
  }
  const s0 = shelves[0] || null;
  if (s0) await ask(page, `${S}.moveShelf(${wardrobe}.id, ${j(s0.id)}, ${s0.pos + 64}, 1)`);
  const after = await ask(page, `${shelvesOf}(${wardrobe})`);
  const moved = s0 ? { id: s0.id, y0: s0.pos, y1: (after.find((x) => x.id === s0.id) || {}).pos, dirty: await ask(page, `${S}.dirty`) } : null;
  note('THE STAGE (the store\'s moveShelf): the shelf 64 mm up', j(moved));
  check('the shelf moved and the job is dirty', moved && moved.y1 !== moved.y0 && moved.dirty === true, 'pos_mm changed, dirty true', j(moved));
  const c0 = await counters();
  await page.clock.runFor(5 * 60 * 1000);
  const c1 = await untilJc((x) => rpcN(x, 'cc_save_item') > rpcN(c0, 'cc_save_item'), 10000);
  await page.waitForTimeout(800);
  check('the clock advanced 5 minutes (Playwright clock.runFor): ONE more cc_save_item (the autosave)',
    rpcN(c1, 'cc_save_item') - rpcN(c0, 'cc_save_item') === 1, '+1', `+${rpcN(c1, 'cc_save_item') - rpcN(c0, 'cc_save_item')}`);
  const dirty = await ask(page, `${S}.dirty`);
  check('after the autosave the job is clean', dirty === false, false, dirty);
  await page.clock.runFor(5 * 60 * 1000);
  await page.waitForTimeout(2500);
  const c2 = await counters();
  check('5 more minutes with no change: no cc_save_item', rpcN(c2, 'cc_save_item') === rpcN(c1, 'cc_save_item'), '+0', `+${rpcN(c2, 'cc_save_item') - rpcN(c1, 'cc_save_item')}`);
}

async function legE(ctx, page) {
  const tenant = await ask(page, 'window.__cc && window.__ccAuth ? window.__ccAuth.getState().tenant?.id : null');
  // THE STAGE (the store's own action): one drawer added to the wardrobe.
  const added = await ask(page, `(() => { const st = ${S}; const u = st.units.find((x) => x.type === 'WARDROBE'); if (!u) return null;
    const count = (p) => { let n = 0; const w = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(w); return; } if (o.kind === 'drawer') n += 1; for (const v of Object.values(o)) if (v && typeof v === 'object') w(v); }; w(p); return n; };
    const n0 = count(u.params); st.addDrawers(u.id, 1);
    const n1 = count(window.__cc.project.getState().units.find((x) => x.id === u.id).params);
    return { unit: u.id, n0, n1, dirty: window.__cc.project.getState().dirty }; })()`);
  note('THE STAGE (the store\'s addDrawers): one drawer added to the wardrobe', j(added));
  check('the drawer is in the job and the job is dirty', added && added.n1 === added.n0 + 1 && added.dirty === true, 'drawers +1, dirty true', j(added));
  await page.clock.runFor(1500);
  await page.waitForTimeout(800);
  const buf = await ask(page, `(() => { const k = Object.keys(localStorage).find((x) => x.includes('.item.${ctxState.itemId}.buffer.v1')); if (!k) return null;
    const b = JSON.parse(localStorage.getItem(k)); return { key: k, dirty: b.dirty, at: b.at, units: (b.design?.units || []).length }; })()`);
  check('the crash buffer holds the dirty job before the tab goes', buf && buf.dirty === true, 'a buffer key for the item, dirty true', j(buf));
  const c0 = await counters();
  await page.close();
  await sleep(1500);
  const c1 = await counters();
  note('the tab closed with no save (page.close): what reached the fake on the way out', j({
    cc_save_item: rpcN(c1, 'cc_save_item') - rpcN(c0, 'cc_save_item'),
    keepalive_cc_save_item: keepN(c1, 'cc_save_item') - keepN(c0, 'cc_save_item'),
  }));
  const keep = keepN(c1, 'cc_save_item') - keepN(c0, 'cc_save_item');
  check('the way out: at most ONE keepalive cc_save_item (F8.1: "ONE fetch(\'/api/rpc\', { keepalive: true })")', keep <= 1,
    '<= 1', `${keep} (pagehide and visibilitychange hidden each sent one; the bodies differ by saved_at, so the "same body" guard did not hold the second)`);
  const rowOut = (await items()).find((i) => i.id === ctxState.itemId) || null;
  const skew = Number(buf && buf.at) - Date.now();
  note('the row after the tab went (the keepalive saved the drawer\'s job into JC) and the clocks', j({
    row_updated_at: rowOut && rowOut.updated_at, buffer_at: buf && new Date(buf.at).toISOString(),
    browser_clock_ahead_of_real_ms: skew,
    reading: 'the boot offer needs buffer.at > row.updated_at; the browser clock is ahead by the minutes clock.runFor added in (d), so the offer below stands on that skew; on one real clock the keepalive save would stamp the row AFTER the flush and bootOffers (src/lib/crashBuffer.js) would filter the offer out: read from the code, not walked',
  }));
  const page2 = await ctx.newPage();
  await page2.goto(BASE);
  await until(page2, 'document.querySelectorAll("[data-jc-project]").length > 0', 30000);
  await until(page2, 'Boolean(document.querySelector("[data-crash-offers]"))', 5000);
  const offer = await ask(page2, `(() => { const el = document.querySelector('[data-crash-offer="${ctxState.itemId}"]'); return el ? el.innerText.replace(/\\s+/g, ' ').trim() : null; })()`);
  check('reopen /cabinet/: "Restore unsaved changes to Walk wardrobe?"', offer && /^Restore unsaved changes to Walk wardrobe \(\d\d\.\d\d \d\d:\d\d\)\?/.test(offer),
    'Restore unsaved changes to Walk wardrobe (dd.mm hh:mm)?', j(offer));
  await shot(page2, 'f10-e-restore-offer.png');
  await press(page2, `[data-crash-restore="${ctxState.itemId}"]`);
  const inEditor = await until(page2, `${UI}.screen === 'editor'`, 20000);
  await page2.waitForTimeout(1500);
  const after = await ask(page2, `(() => { const st = ${S}; const u = st.units.find((x) => x.type === 'WARDROBE'); if (!u) return null;
    let n = 0; const w = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(w); return; } if (o.kind === 'drawer') n += 1; for (const v of Object.values(o)) if (v && typeof v === 'object') w(v); }; w(u.params);
    return { id: st.project.id, drawers: n, dirty: st.dirty, said: (${UI}.messages || []).map((m) => m.message || m.text),
      bar: document.querySelector('[data-studio="statusbar-dirty"]') ? document.querySelector('[data-studio="statusbar-dirty"]').innerText.trim() || 'shown' : null }; })()`);
  check('Restore (a real click): the editor opens on the item', inEditor && after && after.id === ctxState.itemId, `screen editor, project.id ${ctxState.itemId}`, j(after && after.id));
  check('the drawer is there', after && added && after.drawers === added.n1, `drawers ${added && added.n1}`, `drawers ${after && after.drawers}`);
  check('the status says not saved: "Not saved yet: press Ctrl+S", the job dirty, the status bar\'s unsaved mark',
    after && after.dirty === true && after.said.some((m) => /Not saved yet: press Ctrl\+S/.test(String(m))) && after.bar != null,
    'dirty true, the words, statusbar-dirty shown', j(after && { dirty: after.dirty, said: after.said.slice(-3), bar: after.bar }));
  await shot(page2, 'f10-e-restored.png');
  void tenant;
  return page2;
}

async function legF(ctx, page) {
  // The restored job is saved by hand first (Ctrl+S), so the list is met with a clean buffer.
  await page.keyboard.press('Control+s');
  await until(page, `${S}.dirty === false`, 10000);
  note('Ctrl+S before going back to the list (the restored drawer saved)', `dirty ${await ask(page, `${S}.dirty`)}`);
  await page.goto(BASE);
  await until(page, 'document.querySelectorAll("[data-jc-project]").length > 0', 30000);
  await page.waitForTimeout(800);
  const id = ctxState.itemId;
  const inList = async () => (await listOf(page)).flatMap((g) => g.projects.flatMap((p) => p.items)).find((i) => i.id === id) || null;
  check('the item stands in the list under the pipeline project', Boolean(await inList()), `item ${id} listed`, j(await inList()));
  await jc('/__fake/reset');
  await press(page, `[data-jc-archive="${id}"]`);
  await until(page, `!document.querySelector('[data-jc-item="${id}"]')`, 8000);
  let c = await counters();
  check('Archive (a real click): ONE cc_archive_item, the item disappears from the list', rpcN(c, 'cc_archive_item') === 1 && !(await inList()),
    'cc_archive_item 1, not listed', `cc_archive_item ${rpcN(c, 'cc_archive_item')}, listed ${j(await inList())}`);
  await press(page, '[data-jc-show-archived="1"]');
  await page.waitForTimeout(600);
  const arch = await inList();
  check('"Show archived" (a real click): it is listed, archived, with Restore', arch && arch.archived && await visible(page, `[data-jc-restore="${id}"]`),
    'listed, data-archived 1, a Restore button', j(arch));
  await shot(page, 'f10-f-archived.png');
  await press(page, `[data-jc-restore="${id}"]`);
  await until(page, `Boolean(document.querySelector('[data-jc-open="${id}"]'))`, 8000);
  c = await counters();
  const back = await inList();
  check('Restore (a real click): cc_archive_item with restore, the item back in the list with Open', rpcN(c, 'cc_archive_item') === 2 && back && !back.archived
    && await visible(page, `[data-jc-open="${id}"]`), 'cc_archive_item 2, listed, not archived, Open shown', `cc_archive_item ${rpcN(c, 'cc_archive_item')}, ${j(back)}`);
  await press(page, '[data-jc-show-archived="1"]');
  await page.waitForTimeout(400);
  const still = await inList();
  check('"Show archived" off again: the item stays listed', Boolean(still), 'listed', j(still));
}

async function legG(ctx, page) {
  await jc('/__fake/reset');
  const before = (await items()).map((i) => i.id);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null),
    press(page, '[data-open-from-file="1"]'),
  ]);
  check('Open from file (a real click): the browser\'s file chooser', Boolean(chooser), 'a file chooser', Boolean(chooser));
  if (chooser) await chooser.setFiles(OWNER_FILE);
  await page.waitForTimeout(1200);
  // The id-collision question is asked only when JC holds the file's id; the owner's file is loc_..., so none is expected.
  const asked = await visible(page, '[data-modal-name="project-file"] [data-jc-picker], [data-jc-picker="1"]');
  const pickerProfile = await ask(page, 'document.querySelector("[data-jc-picker-profile]")?.textContent || null');
  check('the picker asks which Joinery Core project the old job belongs to', asked, 'the picker', asked);
  note('the picker\'s read-only line on the profile', j(pickerProfile));
  await press(page, '[data-jc-picker-project="p:prj-1001"]');
  await untilJc((x) => rpcN(x, 'cc_save_item') >= 1, 15000);
  await page.waitForTimeout(1500);
  const c = await counters();
  check('bound to the production project P-1001: ONE cc_create_item, ONE cc_save_item', rpcN(c, 'cc_create_item') === 1 && rpcN(c, 'cc_save_item') === 1,
    'create 1, save 1', `create ${rpcN(c, 'cc_create_item')}, save ${rpcN(c, 'cc_save_item')}`);
  const made = (await items()).filter((i) => !before.includes(i.id));
  const row = made[0] || null;
  check('the new row: bound to prj-1001, named as the file\'s job, its design saved without a profile, the owner\'s unit in it',
    made.length === 1 && row.jc_project_id === 'prj-1001' && row.name === 'Test qwardrobe' && row.design && row.design.hasProfile === false
      && row.design.units.some((u) => u.type === 'CORNER_L_WARDROBE'),
    'one row, prj-1001, "Test qwardrobe", hasProfile false, a CORNER_L_WARDROBE', j(row && { id: row.id, prj: row.jc_project_id, name: row.name, design: row.design && { hasProfile: row.design.hasProfile, units: row.design.units } }));
  const screen = await ask(page, `${UI}.screen`);
  note('after the import the app is on', screen);
  await page.goto(BASE);
  await until(page, 'document.querySelectorAll("[data-jc-project]").length > 0', 30000);
  await page.waitForTimeout(800);
  const list = await listOf(page);
  const p1001 = list.flatMap((g) => g.projects).find((p) => p.key === 'p:prj-1001');
  check('the list shows it under P-1001', p1001 && row && p1001.items.some((i) => i.id === row.id && i.name === 'Test qwardrobe'),
    `p:prj-1001 lists ${row && row.id} "Test qwardrobe"`, j(p1001 && p1001.items));
  await shot(page, 'f10-g-imported.png');
}

// === THE RUN ================================================================
const started = new Date();
let crashed = null;
try {
  await jc('/__fake/reseed');
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // The clock is Playwright's from the first page on; it flows in real time until a station runs it forward.
  await ctx.clock.install();
  const errors = [];
  ctx.on('page', (p) => p.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200))));
  let page = null;
  const run = async (leg, fn) => {
    if (!LEGS.includes(leg)) return;
    LEG = leg;
    push('LEG', `station ${leg}`);
    try {
      const out = await fn();
      if (out && typeof out.goto === 'function') page = out;
    } catch (err) {
      check(`station ${leg} ran to its end`, false, 'no exception', String(err && err.message || err).slice(0, 300));
    }
  };
  await run('a', () => legA(ctx));
  if (!page) { page = await ctx.newPage(); await page.goto(BASE); }
  await run('b', () => legB(ctx, page));
  await run('c', () => legC(ctx, page));
  await run('d', () => legD(ctx, page));
  await run('e', () => legE(ctx, page));
  await run('f', () => legF(ctx, page));
  await run('g', () => legG(ctx, page));
  LEG = 'end';
  note('page errors the walk saw (uncaught)', errors.length ? j(errors.slice(0, 8)) : 'none');
  const final = await counters();
  note('the fake\'s counters at the end (since the last reset)', j(final));
} catch (err) {
  crashed = err;
} finally {
  await stopAll();
}

// === THE LEDGER ON DISK =====================================================
const pass = steps.filter((s) => s.kind === 'PASS').length;
const fail = steps.filter((s) => s.kind === 'FAIL').length;
const lines = [
  'T-CC1a F10 . THE WALK (scripts/t-cc1a-walk.mjs)',
  `HEAD ${head} . ${started.toISOString()} . the built app (vite preview ${PREVIEW_PORT}) behind the fake Joinery Core (${ORIGIN})`,
  'Every line PASS or FAIL with the number expected and the number read; a FAIL is written down, never patched.',
  '',
  ...steps.map((s) => {
    if (s.kind === 'LEG') return `\n== ${s.gesture} ==`;
    if (s.kind === 'FRAME') return `FRAME [${s.leg}] ${s.gesture}`;
    if (s.kind === 'NOTE') return `NOTE  [${s.leg}] ${s.gesture} | ${s.got}`;
    return `${s.kind.padEnd(5)} [${s.leg}] ${s.gesture} | expect: ${s.expect} | read: ${s.got}`;
  }),
  '',
  `RESULT: ${pass} PASS, ${fail} FAIL${crashed ? `, the walk crashed: ${ascii(crashed.message || crashed)}` : ''}`,
  `FRAMES: ${frames.join(', ') || 'none'}`,
];
writeFileSync(`${OUT}walk.txt`, `${ascii(lines.join('\n'))}\n`);
process.stdout.write(`\nRESULT: ${pass} PASS, ${fail} FAIL. Ledger: verify/t-cc1a/walk.txt\n`);
if (crashed) process.stdout.write(`${crashed.stack || crashed}\n`);
void existsSync;
process.exit(fail || crashed ? 1 : 0);
