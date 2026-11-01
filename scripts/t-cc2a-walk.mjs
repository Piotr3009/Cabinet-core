/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a, THE WALK (CLAUDE.md T-CC2a TESTS AND PROOF)
//
// CLAUDE.md T-CC2a TESTS AND PROOF: "`scripts/t-cc2a-walk.mjs` against the fake
// (link a sheet with sizes, link a hinge, unlink, accept a suggestion, a BOM
// with one line not linked, a bespoke row, the not-set-up switch, a new item on
// H3325 and RAL 3005) with frames under `verify/t-cc2a/`".
//
// The owner, 01.11.2026, 12:09: *"zebysmy przypisali pewne materialy na stale
// nie do projektu, tylko na stale i wtedy cokolwiek sobie wygeneruje projekt to
// ma albo juz przypisane materialy albo jest napisane materials not assigned"*.
//
// THE STATIONS (legs a to h):
//   (a) sign in as admin; a NEW item "Walk links" through T-CC1a's New item flow
//       on the pipeline project: Carcass 1 EGGER H3325 and Front 1 sprayed RAL
//       3005 (F11.3); a BUD and a WARDROBE with their doors; Ctrl+S.
//   (b) the rail's Materials menu: "Link materials..." first; the window: Back
//       to project top left, the seven tabs with counts, the Sheets brands with
//       three "Coming soon", the header count, MDF 18 Linked, no id text (F8).
//   (c) accept a suggestion: H3325, Accept, the sheet size both required (F9).
//   (d) link a sheet by hand with its sizes and offcut (F8.5, law 6).
//   (e) link a hinge on one click (F8.5).
//   (f) unlink it (F8.5).
//   (g) the BOM with lines not linked, Link from a line, the toast "Saved for
//       all projects"; a bespoke row saved with the item (F10).
//   (h) the not-set-up switch (F4, F8.6), and the old Assign window read only
//       with its way to the new one (F14).
//
// THE HANDS (T-CC1b's walk, scripts/t-cc1b-walk.mjs, whole): Playwright's own
// input pipe, `locator.click()` moves the real mouse to the control's centre
// and presses, keys are real keys. A press on a DISABLED control is the mouse
// at its centre (`page.mouse.click`), so a refusal is read the way a joiner
// meets it. The ledger, the frames and the rule are the house's: every line
// PASS or FAIL with the number expected and the number read, a FAIL written
// down and never patched. The STAGES that are not what a station is about (the
// units added, their doors fitted) go through the store's own actions and are
// written as NOTE lines. The fake Joinery Core (scripts/t-cc1a-fake-jc.mjs,
// grown by T-CC2a F4.3) counts every request and holds the company's links;
// its state is what the stations read beside the page. The link store is not
// published on window.__cc (src/main.jsx), so the links are read through the
// window's own markup and the fake's /__fake/state only. The rows of the
// window carry a token of the catalogue id, never the id (rowToken of
// src/lib/linkSuggest.js, imported here: one road, no copy).
//
//   node scripts/t-cc2a-walk.mjs --serve            serve dist/ on 4173 (built only when missing), start the fake, walk, stop both
//   node scripts/t-cc2a-walk.mjs --build --serve    build dist/ first
//   node scripts/t-cc2a-walk.mjs                    vite preview already on 4173; the fake is started here
//   node scripts/t-cc2a-walk.mjs --legs a,b,c       some stations only (a makes the item the others open)
//
// Ledger: verify/t-cc2a/walk.txt. Frames: verify/t-cc2a/*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { startFakeJc } from './t-cc1a-fake-jc.mjs';
import { CATALOGUE_DATA } from '../src/engine/catalogueData.js';
import { rowToken } from '../src/lib/linkSuggest.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// === THE ARGUMENTS ==========================================================
const REPO = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const LEGS = String(opt('legs', 'a,b,c,d,e,f,g,h')).split(',').map((s) => s.trim()).filter((s) => /^[a-h]$/.test(s));
const PREVIEW_PORT = Number(opt('upstream', 4173));
const FAKE_PORT = Number(opt('port', 4391));
const OUT = new URL('../verify/t-cc2a/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

// The tenant of the walk: Skylon Joinery LTD (CLAUDE.md T-CC1b, THE NUMBERS), as T-CC1b's walk uses it.
const SKYLON = 'b663e012-1ae6-45d8-b720-7bcc26baffc2';
const ITEM = 'Walk links';
const PIPELINE = 'pl:pip-2001';
/** The fake's stock rows (scripts/t-cc1a-fake-jc.mjs stockSeed): n = 1..10. */
const STOCK = (n) => `5e0c4b1a-7f2d-4c3e-9a8b-${String(n).padStart(12, '0')}`;
// The catalogue entries the stations touch (src/engine/catalogueData.js; ids never shown, tokens clicked).
const H3325_18 = 'sheet.egger.h3325_28.18';
const MDF18 = 'sheet.mdf.18';
const MDF22 = 'sheet.mdf.22';
const HINGE155 = 'hinge.blum.clip-top.155.nickel';
const tok = (id) => rowToken(id);
const ENTRY = new Map(CATALOGUE_DATA.map((e) => [e.id, e]));
const BY_NAME = new Map(CATALOGUE_DATA.map((e) => [e.name, e]));
const NOT_SET_UP = 'Material links are not set up in Joinery Core yet.';
const READ_ONLY = 'Replaced by Link materials. This window is read only until the next update.';
/** The regex of the station (b): no catalogue id shape in the window's text. */
const ID_SHAPE = /\b(sheet|edge|hinge|runner|paint|stain)\.[a-z0-9._-]+/;

// === THE BUILD, THE PREVIEW, THE FAKE =======================================
const PREVIEW = `http://127.0.0.1:${PREVIEW_PORT}/cabinet/`;
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
async function served() { try { return (await fetch(PREVIEW)).ok; } catch { return false; } }
let preview = null;
if (flag('build') || (flag('serve') && !existsSync(`${REPO}dist/index.html`))) {
  process.stdout.write('npx vite build ...\n');
  execFileSync('npx', ['vite', 'build'], { cwd: REPO, stdio: 'inherit' });
}
if (flag('serve') && !(await served())) {
  preview = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: REPO, stdio: 'ignore', detached: true });
  for (let t = 0; t < 120 && !(await served()); t += 1) await sleep(500);
}
const stopPreview = () => { if (preview) { try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* gone */ } preview = null; } };
if (!(await served())) {
  process.stdout.write(`No app at ${PREVIEW}: npx vite build; npx vite preview --port ${PREVIEW_PORT} --strictPort, or pass --serve.\n`);
  stopPreview();
  process.exit(2);
}
const fake = await startFakeJc({ port: FAKE_PORT, upstream: PREVIEW_PORT, tenantId: SKYLON, links: true });
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
  .replace(new RegExp(String.fromCharCode(0xa3), 'g'), 'GBP ')
  .replace(new RegExp(String.fromCharCode(0x2715), 'g'), 'x')
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
const fakeState = () => jc('/__fake/state');
const counters = async () => (await fakeState()).counters;
const items = async () => (await fakeState()).items;
const linkRows = async () => (await fakeState()).links.rows;
const rpcN = (c, name) => Number(c.rpc[name] || 0);
/** The design the fake holds for an item, read the way JC serves it (one select through /api/db/query). */
async function savedDesign(id) {
  const res = await fetch(`${ORIGIN}/api/db/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake-token-walk', 'X-Fake-Shim': '1' },
    body: JSON.stringify({ table: 'cc_items', select: 'id, design', filters: [{ op: 'eq', col: 'id', val: id }], maybeSingle: true }),
  });
  const body = await res.json().catch(() => null);
  return body?.data?.design || null;
}

async function shot(page, name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}${name}` });
  frames.push(name);
  push('FRAME', name);
}
const ask = (page, expr) => page.evaluate(`(${expr})`);
/** Wait until an expression in the page is truthy (real time). */
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
/** Wait until the fake's link rows satisfy a test (real time). */
async function untilRows(test, ms = 8000) {
  const end = Date.now() + ms;
  let rows = await linkRows();
  while (Date.now() < end) {
    if (test(rows)) return rows;
    await sleep(200);
    rows = await linkRows();
  }
  return rows;
}
/** A real click at a control's centre (Playwright moves the mouse and presses). */
async function press(page, sel, { timeout = 8000 } = {}) {
  const l = page.locator(sel).first();
  try { await l.waitFor({ state: 'visible', timeout }); } catch { return false; }
  await l.click();
  await page.waitForTimeout(500);
  return true;
}
/** The mouse at a control's centre, pressed, whether the control is enabled or not (a refusal is read as met). */
async function mousePress(page, sel) {
  const l = page.locator(sel).first();
  try { await l.waitFor({ state: 'visible', timeout: 5000 }); } catch { return false; }
  await l.scrollIntoViewIfNeeded().catch(() => {});
  const box = await l.boundingBox();
  if (!box) return false;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(600);
  return true;
}
/** Click a field, select what is in it, type the words (real keys). */
async function typeInto(page, sel, text) {
  if (!(await press(page, sel))) return false;
  await page.keyboard.press('Control+A');
  await page.keyboard.type(String(text));
  await page.waitForTimeout(300);
  return true;
}
const visible = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);

// === THE NEW ITEM FLOW, WALKED BY HAND (T-CC1a's, scripts/t-cc1b-walk.mjs) ==
// One addition of this walk: the first time a carcass and a front board step stand on the screen, the
// design is read and the screen framed (`peek`), BEFORE the walk touches the step.
async function walkFlow(page, peek = async () => {}) {
  const log = [];
  for (let i = 0; i < 40; i += 1) {
    if (await visible(page, '[data-start-designing="1"]:not([disabled])')) {
      await peek('summary');
      await press(page, '[data-start-designing="1"]');
      log.push('Start designing');
      return { ok: true, log };
    }
    const sb = await ask(page, `(() => { const s = [...document.querySelectorAll('select[data-stock-board]')].find((x) => x.offsetParent && !x.value); return s ? s.getAttribute('data-stock-board') : null; })()`);
    if (sb) {
      await peek(sb.split(':')[0]);
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

/** From the list, the item opened by its Open button (a real click); true when the editor shows it. */
async function openItem(page, id) {
  await until(page, 'document.querySelectorAll("[data-jc-project]").length > 0', 30000);
  await page.waitForTimeout(600);
  // A restore question of the crash buffer is answered Discard, so the saved row is what opens.
  for (let k = 0; k < 5 && await visible(page, '[data-crash-discard]'); k += 1) await press(page, '[data-crash-discard]');
  const ok = await press(page, `[data-jc-open="${id}"]`);
  return ok && until(page, `${UI}.screen === 'editor' && ${S}.project.id === ${j(id)}`, 20000);
}

/** Carcass 1 and Front 1 of the design on the screen, as the store holds them. */
const boardsOf = (page) => ask(page, `(() => { const d = ${S}.project.design || {};
  const c = ((d.carcass && d.carcass.types) || [])[0] || null; const f = ((d.fronts && d.fronts.types) || [])[0] || null;
  return { carcass: c && { id: c.id, label: c.label || null, source: c.source || null, finish_id: c.finish_id || null },
    front: f && { id: f.id, label: f.label || null, source: f.source || null, colour: f.colour ? [f.colour.system, f.colour.name].filter(Boolean).join(' ') : null, thickness: f.thickness ?? null } }; })()`);
const isH3325 = (b) => Boolean(b?.carcass && b.carcass.finish_id === 'egger:H3325_28' && b.carcass.source === 'egger');
const isRal3005 = (b) => Boolean(b?.front && /^spray/.test(String(b.front.source || '')) && /3005/.test(String(b.front.colour || '')));

// === THE LINK MATERIALS WINDOW ==============================================
const WIN = '[data-modal-name="link-materials"]';
const rowSel = (id) => `${WIN} [data-link-row="${tok(id)}"]`;
/** A row's first cell (the Cabinet Core material): a click there chooses the row and never lands on its Accept. */
const rowCell = (id) => `${rowSel(id)} > td:first-child`;
const rowState = (page, id) => ask(page, `(() => { const el = document.querySelector(${j(rowSel(id))}); if (!el) return null;
  const w = el.querySelector('[data-link-words]'); const s = el.querySelector('[data-link-suggested]');
  return { status: el.dataset.linkStatus, words: w ? w.innerText.trim() : null, selected: el.dataset.linkSelected,
    suggested: s ? s.innerText.replace(/\\s+/g, ' ').trim() : null, error: el.querySelector('[data-link-row-error]')?.innerText || null }; })()`);
/** The window is up and its first read (stock and links) has answered. */
const windowReady = (page, ms = 20000) => until(page, `Boolean(document.querySelector('[data-link-materials]')) && !document.querySelector('[data-link-loading]')`, ms);
async function openLinkWindow(page) {
  await press(page, '[data-studio="rail-materials"]');
  const ok = await press(page, '[data-studio="popup-item"][data-item="link-materials"]');
  return ok && windowReady(page);
}

// === THE STATIONS ===========================================================
const ctxState = { itemId: null };

async function legA(ctx) {
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForURL(/\/login\.html/, { timeout: 20000 }).catch(() => {});
  await press(page, '#signin');
  await page.waitForURL(/\/cabinet\/$/, { timeout: 20000 }).catch(() => {});
  await until(page, 'document.querySelectorAll("[data-jc-project]").length > 0', 30000);
  check('sign in as admin (a real click on the fake\'s login): the list of Joinery Core', await ask(page, 'document.querySelectorAll("[data-jc-project]").length') > 0,
    'projects listed', await ask(page, 'document.querySelectorAll("[data-jc-project]").length'));
  // The build the walk is walking: its stamp, and whether src/ moved between that commit and HEAD.
  const stamp = await ask(page, `document.querySelector('[data-build-stamp]')?.dataset.buildStamp || null`);
  const sha = String(stamp || '').match(/\b[0-9a-f]{7,40}\b/)?.[0] || null;
  let srcDelta = '(not read)';
  if (sha) { try { srcDelta = execFileSync('git', ['diff', '--stat', sha, 'HEAD', '--', 'src', 'public', 'index.html', 'vite.config.js'], { cwd: REPO }).toString().trim() || 'none'; } catch { srcDelta = '(git could not compare)'; } }
  note('the build walked (data-build-stamp) and the app files changed between it and HEAD', j({ stamp, head, srcDelta }));

  // T-CC1a's New item flow on the pipeline project, by hand; the first carcass and front steps are read and framed.
  await press(page, `[data-jc-new-item="${PIPELINE}"]`);
  await until(page, 'Boolean(document.querySelector("[data-project-field=name]"))', 8000);
  await press(page, '[data-project-field="name"]');
  await page.keyboard.type(ITEM);
  const seen = {};
  const flow = await walkFlow(page, async (kind) => {
    if (seen[kind]) return;
    seen[kind] = await boardsOf(page);
    if (kind === 'carcass') await shot(page, 'f11-new-item.png');
    if (kind === 'front') await shot(page, 'f11-new-item-front.png');
  });
  note('the New item flow by hand (T-CC1a\'s, the primary pressed, an empty Stock board select given its first option)', flow.log.join(' > '));
  check('the wizard\'s carcass step, before any hand: Carcass 1 is EGGER H3325 (finish_id egger:H3325_28, source egger)', isH3325(seen.carcass),
    'egger:H3325_28 / egger', j(seen.carcass && seen.carcass.carcass));
  check('the wizard\'s front step, before any hand: Front 1 is sprayed RAL 3005', isRal3005(seen.front), 'source spray, colour holds 3005', j(seen.front && seen.front.front));
  await until(page, `${UI}.screen === 'editor'`, 20000);
  const created = (await items()).find((i) => i.name === ITEM) || null;
  ctxState.itemId = created?.id || null;
  const born = await boardsOf(page);
  check(`the new item "${ITEM}" in the editor: Carcass 1 EGGER H3325, Front 1 sprayed RAL 3005`, flow.ok && isH3325(born) && isRal3005(born),
    'egger:H3325_28 / egger; spray / 3005', j({ item: ctxState.itemId, ...born }));

  // THE STAGE: a BUD and a WARDROBE through the store, their doors fitted (SPEC 4.10: doors last), so hinges are bought.
  await ask(page, `${S}.addUnit('BUD')`);
  await ask(page, `${S}.addUnit('WARDROBE')`);
  const fitted = await ask(page, `${S}.units.map((u) => ({ type: u.type, doors: ${S}.addDoors(u.id).count }))`);
  note('THE STAGE (the store\'s addUnit BUD and WARDROBE, addDoors on each)', j(fitted));
  const c0 = await counters();
  await page.keyboard.press('Control+s');
  const c1 = await untilJc((x) => rpcN(x, 'cc_save_item') > rpcN(c0, 'cc_save_item'), 10000);
  check('Ctrl+S (real keys): the fake counts one cc_save_item', rpcN(c1, 'cc_save_item') === rpcN(c0, 'cc_save_item') + 1,
    rpcN(c0, 'cc_save_item') + 1, rpcN(c1, 'cc_save_item'));

  // Open it from the list, as the joiner does tomorrow: the boards are the saved item's.
  await page.goto(BASE);
  const opened = ctxState.itemId ? await openItem(page, ctxState.itemId) : false;
  await page.waitForTimeout(1200);
  const again = await boardsOf(page);
  const units = await ask(page, `${S}.units.map((u) => u.type).join(',')`);
  check(`open "${ITEM}" from the list (Open, a real click): the same boards and units`, opened && isH3325(again) && isRal3005(again) && units === 'BUD,WARDROBE',
    'H3325 / RAL 3005; BUD,WARDROBE', j({ opened, ...again, units }));
  return page;
}

async function legB(ctx, page) {
  await press(page, '[data-studio="rail-materials"]');
  const menu = await ask(page, `[...document.querySelectorAll('[data-studio="popup-item"]')].filter((e) => e.offsetParent)
    .map((e) => ({ id: e.dataset.item, label: (e.querySelector('span span')?.textContent || e.textContent).trim() }))`);
  const ids = menu.map((m) => m.id);
  const firstLabel = ascii(menu[0]?.label || '');
  check('rail Materials: "Link materials..." is the FIRST row', ids[0] === 'link-materials' && firstLabel === 'Link materials...', 'Link materials... first', j(menu.map((m) => m.label)));
  check('"Assign materials..." still below it', ids.indexOf('assign-materials') > 0, 'index > 0', ids.indexOf('assign-materials'));
  await press(page, '[data-studio="popup-item"][data-item="link-materials"]');
  const ready = await windowReady(page);
  check('click Link materials... (a real click): the window opens and reads the stock and the links', ready, 'window, no "Reading..." line',
    j(await ask(page, `({ window: Boolean(document.querySelector('[data-link-materials]')), loading: Boolean(document.querySelector('[data-link-loading]')) })`)));
  await page.waitForTimeout(800);

  const top = await ask(page, `(() => { const shell = document.querySelector(${j(WIN)}); const back = shell && shell.querySelector('[data-link-back]');
    const h2 = shell && shell.querySelector('[data-modal-handle] h2'); const close = shell && shell.querySelector('[data-modal-close]'); if (!shell || !back) return null;
    const s = shell.getBoundingClientRect(); const b = back.getBoundingClientRect(); const c = close ? close.getBoundingClientRect() : null;
    return { back: back.innerText.trim(), title: h2 ? h2.innerText.replace(/\\s+/g, ' ').trim() : null, dx: Math.round(b.left - s.left), dy: Math.round(b.top - s.top),
      shellW: Math.round(s.width), closeDx: c ? Math.round(s.right - c.right) : null }; })()`);
  check('"Back to project" top left of the window', top && top.back === 'Back to project' && top.dx < 120 && top.dy < 60, 'Back to project, within 120 x 60 px of the top left corner', j(top));
  check('the title "Link materials" (the shell\'s cross top right)', top && /Link materials/.test(top.title || '') && top.closeDx != null && top.closeDx < 60, 'Link materials; the close within 60 px of the right', j(top && { title: top.title, closeDx: top.closeDx }));

  const tabs = await ask(page, `[...document.querySelectorAll('[data-link-tab]')].map((b) => ({ id: b.dataset.linkTab, label: (b.firstChild && b.firstChild.textContent || '').trim(),
    count: b.querySelector('[data-link-tab-count]')?.innerText.trim() || '', tone: b.dataset.linkTabTone, selected: b.getAttribute('aria-selected') }))`);
  const want = ['Sheets', 'Hinges', 'Runners', 'Ironmongery', 'Internal fittings', 'Paint', 'Consumables'];
  check('seven tabs in order', j(tabs.map((t) => t.label)) === j(want), j(want), j(tabs.map((t) => t.label)));
  check('each tab with "<linked> / <total>"', tabs.length === 7 && tabs.every((t) => /^\d+ \/ \d+$/.test(t.count)), 'n / m on all seven', j(tabs.map((t) => `${t.label} ${t.count} ${t.tone}`)));

  const brands = await ask(page, `[...document.querySelectorAll('[data-link-brand]')].map((b) => ({ id: b.dataset.linkBrand, tag: b.tagName,
    label: (b.firstChild && b.firstChild.textContent || '').trim(), soon: b.dataset.linkBrandSoon === '1', words: b.querySelector('.cc-tag')?.textContent.trim() || null,
    disabled: b.getAttribute('aria-disabled'), pressed: b.getAttribute('aria-pressed') }))`);
  const soon = brands.filter((b) => b.soon);
  check('the Sheets brands: Egger, MDF, Generic, then Veneer, Fenix, Kronospan "Coming soon"', j(brands.map((b) => b.label)) === j(['Egger', 'MDF', 'Generic', 'Veneer', 'Fenix', 'Kronospan'])
    && j(soon.map((b) => b.label)) === j(['Veneer', 'Fenix', 'Kronospan']) && soon.every((b) => b.words === 'Coming soon'),
  'six brands, the last three Coming soon', j(brands.map((b) => `${b.label}${b.soon ? ` (${b.words})` : ''}`)));
  await mousePress(page, `${WIN} [data-link-brand="veneer"]`);
  const after = await ask(page, `({ egger: document.querySelector('[data-link-brand="egger"]')?.getAttribute('aria-pressed'), veneerTag: document.querySelector('[data-link-brand="veneer"]')?.tagName })`);
  check('Veneer pressed with the mouse: not clickable (no button, the brand stays Egger)', soon.every((b) => b.tag !== 'BUTTON' && b.disabled === 'true') && after.egger === 'true',
    'not a button, aria-disabled, Egger still pressed', j({ soon: soon.map((b) => `${b.label}:${b.tag}:${b.disabled}`), ...after }));

  const head1 = await ask(page, `(() => { const el = document.querySelector('[data-link-count]'); return el ? { n: Number(el.dataset.linkCount), m: Number(el.dataset.linkTotal), text: el.innerText.replace(/\\s+/g, ' ').trim() } : null; })()`);
  const rows0 = await linkRows();
  check('the header "<n> of <m> linked", n >= 2 (the two seed links)', head1 && head1.n >= 2 && head1.text === `${head1.n} of ${head1.m} linked`,
    `n >= 2 (the fake holds ${rows0.length})`, j(head1));

  // No catalogue id in the window's text, on every tab (the owner: *"nie widoczna numeracja"*).
  const leaks = [];
  for (const t of tabs) {
    await press(page, `${WIN} [data-link-tab="${t.id}"]`);
    const text = await ask(page, `document.querySelector(${j(WIN)})?.innerText || ''`);
    const m = text.match(ID_SHAPE);
    leaks.push(`${t.id}:${m ? m[0] : 'none'}`);
  }
  check('no catalogue id text in the window\'s innerText, on every one of the seven tabs', leaks.every((l) => l.endsWith(':none')), 'none on all seven', j(leaks));

  await press(page, `${WIN} [data-link-tab="sheets"]`);
  await press(page, `${WIN} [data-link-brand="mdf"]`);
  const mdf = await rowState(page, MDF18);
  check('Sheets, MDF: the MDF 18 row reads "Linked" (the seed link)', mdf && mdf.status === 'linked' && mdf.words === 'Linked', 'linked, Linked', j(mdf));
  await shot(page, 'f08-window.png');
}

async function legC(ctx, page) {
  if (!(await visible(page, '[data-link-materials]'))) await openLinkWindow(page);
  await press(page, `${WIN} [data-link-tab="sheets"]`);
  await press(page, `${WIN} [data-link-brand="egger"]`);
  await typeInto(page, `${WIN} [data-link-search]`, 'H3325');
  await page.waitForTimeout(600);
  const shown = await ask(page, `[...document.querySelectorAll('${WIN} [data-link-table] [data-link-row]')].map((r) => r.dataset.linkRow)`);
  const wantRows = [18, 19, 22, 25].map((t) => tok(`sheet.egger.h3325_28.${t}`));
  check('search "H3325" (real keys): the four H3325 rows, 18, 19, 22, 25 mm', j(shown) === j(wantRows), 4, `${shown.length} ${j(shown)}`);
  const r18 = await rowState(page, H3325_18);
  const others = [];
  for (const t of [19, 22, 25]) others.push((await rowState(page, `sheet.egger.h3325_28.${t}`))?.suggested || null);
  check('the 18 mm row: "Suggested: <the fake\'s row 10>" with Accept; 19, 22 and 25 mm none (thickness)',
    r18 && r18.suggested === 'Suggested: Egger H3325 ST28 Tobacco Gladstone Oak 18 mm Accept' && others.every((o) => o === null),
    'Suggested: Egger H3325 ST28 Tobacco Gladstone Oak 18 mm, Accept; others none', j({ r18: r18 && r18.suggested, others }));
  check('a suggestion is not a link (law 8): the row still "Not linked"', r18 && r18.status === 'not-linked' && r18.words === 'Not linked', 'not-linked', j(r18 && { status: r18.status, words: r18.words }));
  await shot(page, 'f09-suggestion.png');

  const c0 = await counters();
  await press(page, `${rowSel(H3325_18)} [data-link-accept]`);
  const FORM = `${WIN} [data-link-form-row="${tok(H3325_18)}"]`;
  const form = await ask(page, `(() => { const f = document.querySelector(${j(FORM)}); if (!f) return null; const v = (s) => f.querySelector(s)?.value ?? null;
    return { kind: f.querySelector('[data-link-form]')?.dataset.linkForm, width: v('[data-link-sheet-width]'), length: v('[data-link-sheet-length]'), offcut: v('[data-link-offcut]'),
      to: f.querySelector('[data-link-form] .text-gold')?.innerText || null }; })()`);
  check('Accept (a real click): the sheet form asks for the size, both empty, the offcut prefilled 10', form && form.kind === 'sheet' && form.width === '' && form.length === '' && form.offcut === '10',
    'sheet form, width "", length "", offcut 10', j(form));
  const rpc0 = rpcN(await counters(), 'cc_save_material_links');
  check('nothing saved on Accept alone (law 8)', rpc0 === rpcN(c0, 'cc_save_material_links'), rpcN(c0, 'cc_save_material_links'), rpc0);
  await typeInto(page, `${FORM} [data-link-sheet-length]`, '2440');
  await mousePress(page, `${FORM} [data-link-save]`);
  const refused = await ask(page, `(() => { const f = document.querySelector(${j(FORM)}); if (!f) return null;
    return { disabled: f.querySelector('[data-link-save]')?.disabled ?? null, hint: f.querySelector('[data-link-form-hint]')?.innerText.trim() || null,
      required: [...f.querySelectorAll('[data-link-field-error]')].map((e) => e.innerText.trim()).join(' | ') || null }; })()`);
  const rpc1 = rpcN(await counters(), 'cc_save_material_links');
  const r18b = await rowState(page, H3325_18);
  check('Save link with the width empty (the mouse on it): refused in words, nothing sent',
    // UX turn (Ewa P5): Save link stays enabled; pressed with a size empty it says what is missing under the field and sends nothing.
    refused && refused.disabled === false && /Required/.test(refused.required || '') && rpc1 === rpc0 && r18b.status === 'not-linked',
    'Save enabled, "Required" under the empty width, 0 calls, Not linked', j({ ...refused, calls: rpc1 - rpc0, status: r18b && r18b.status }));
  await shot(page, 'f09-suggestion-form.png');
  await typeInto(page, `${FORM} [data-link-sheet-width]`, '1220');
  await press(page, `${FORM} [data-link-save]`);
  const rows = await untilRows((rs) => rs.some((r) => r.cc_material_id === H3325_18));
  await page.waitForTimeout(500);
  const r18c = await rowState(page, H3325_18);
  const link = rows.find((r) => r.cc_material_id === H3325_18) || null;
  check('type 1220 and 2440, Save link: the row reads "Linked"', r18c && r18c.status === 'linked' && r18c.words === 'Linked', 'linked, Linked', j(r18c && { status: r18c.status, words: r18c.words }));
  check('the fake holds the link: sheet.egger.h3325_28.18 to row 10, 1220 x 2440', link && link.stock_item_id === STOCK(10) && link.sheet_width_mm === 1220 && link.sheet_length_mm === 2440,
    `${STOCK(10)}, 1220, 2440`, j(link));
  note('the yield the form sent with the prefilled offcut (10 %)', j(link && link.yield));
  await shot(page, 'f09-suggestion-linked.png');
  await press(page, `${WIN} [data-link-search-clear]`);
  const cleared = await ask(page, `({ q: document.querySelector('${WIN} [data-link-search]')?.value ?? null, rows: document.querySelectorAll('${WIN} [data-link-table] [data-link-row]').length,
    cross: Boolean(document.querySelector('${WIN} [data-link-search-clear]')) })`);
  check('the clear cross (a real click) empties the search and the list comes back whole', cleared.q === '' && cleared.rows > 4 && !cleared.cross, 'q "", rows > 4, cross gone', j(cleared));
}

async function legD(ctx, page) {
  if (!(await visible(page, '[data-link-materials]'))) await openLinkWindow(page);
  await press(page, `${WIN} [data-link-tab="sheets"]`);
  await press(page, `${WIN} [data-link-brand="mdf"]`);
  await press(page, rowCell(MDF22));
  const sel = await ask(page, `({ row: document.querySelector(${j(rowSel(MDF22))})?.dataset.linkSelected, target: document.querySelector('${WIN} [data-link-target]')?.dataset.linkTarget,
    linking: document.querySelector('${WIN} [data-link-target]')?.innerText.replace(/\\s+/g, ' ').trim() })`);
  check('the MDF brand, the 22 mm row chosen (a real click): selected, "Linking: MDF, 22 mm"', sel.row === '1' && sel.target === tok(MDF22) && /MDF, 22 mm/.test(sel.linking || ''),
    `selected, target ${tok(MDF22)}`, j(sel));
  await press(page, `${WIN} [data-material-link="${STOCK(3)}"]`);
  const FORM = `${WIN} [data-link-form-row="${tok(MDF22)}"]`;
  const form = await ask(page, `(() => { const f = document.querySelector(${j(FORM)}); return f ? { kind: f.querySelector('[data-link-form]')?.dataset.linkForm, to: f.querySelector('[data-link-form] .text-gold')?.innerText || null } : null; })()`);
  check('Link on the stock row "MDF 22 mm" (row 3): the sheet form, to MDF 22 mm', form && form.kind === 'sheet' && form.to === 'MDF 22 mm', 'sheet, MDF 22 mm', j(form));
  await typeInto(page, `${FORM} [data-link-sheet-width]`, '1220');
  await typeInto(page, `${FORM} [data-link-sheet-length]`, '2440');
  await typeInto(page, `${FORM} [data-link-offcut]`, '10');
  await shot(page, 'f08-link-sheet-form.png');
  await press(page, `${FORM} [data-link-save]`);
  const rows = await untilRows((rs) => rs.some((r) => r.cc_material_id === MDF22));
  await page.waitForTimeout(500);
  const st = await rowState(page, MDF22);
  const link = rows.find((r) => r.cc_material_id === MDF22) || null;
  check('1220 x 2440, offcut 10 %, Save link: the row reads "Linked"', st && st.status === 'linked' && st.words === 'Linked', 'linked, Linked', j(st && { status: st.status, words: st.words }));
  check('the fake holds sheet.mdf.22 to row 3, 1220 x 2440, yield 1.1', link && link.stock_item_id === STOCK(3) && link.sheet_width_mm === 1220 && link.sheet_length_mm === 2440 && Number(link.yield) === 1.1,
    `${STOCK(3)}, 1220, 2440, yield 1.1`, j(link));
  await shot(page, 'f08-link-sheet.png');
}

async function legE(ctx, page) {
  if (!(await visible(page, '[data-link-materials]'))) await openLinkWindow(page);
  await press(page, `${WIN} [data-link-tab="hinges"]`);
  const present = await visible(page, rowSel(HINGE155));
  check(`the Hinges tab lists "${ENTRY.get(HINGE155).name}"`, present, 'the row', String(present));
  await press(page, rowCell(HINGE155));
  const c0 = await counters();
  await press(page, `${WIN} [data-material-link="${STOCK(6)}"]`);
  const c1 = await untilJc((x) => rpcN(x, 'cc_save_material_links') > rpcN(c0, 'cc_save_material_links'));
  await page.waitForTimeout(500);
  const formSeen = await ask(page, `document.querySelectorAll('${WIN} [data-link-form]').length`);
  const st = await rowState(page, HINGE155);
  check('Link on row 6 "Blum Clip top 155 hinge" (one real click): Linked, no form', st && st.status === 'linked' && st.words === 'Linked' && formSeen === 0,
    'linked, Linked, 0 forms', j({ ...(st || {}), forms: formSeen }));
  check('the fake counts one more cc_save_material_links call', rpcN(c1, 'cc_save_material_links') === rpcN(c0, 'cc_save_material_links') + 1,
    rpcN(c0, 'cc_save_material_links') + 1, rpcN(c1, 'cc_save_material_links'));
  const link = (await linkRows()).find((r) => r.cc_material_id === HINGE155) || null;
  check('the fake holds the hinge link to row 6, no sheet size', link && link.stock_item_id === STOCK(6) && link.sheet_width_mm == null, STOCK(6), j(link));
  await shot(page, 'f08-link-hinge.png');
}

async function legF(ctx, page) {
  if (!(await visible(page, '[data-link-materials]'))) await openLinkWindow(page);
  await press(page, `${WIN} [data-link-tab="hinges"]`);
  const c0 = await counters();
  await press(page, `${rowSel(HINGE155)} [data-link-unlink]`);
  const c1 = await untilJc((x) => Number(x.linksCleared || 0) > Number(c0.linksCleared || 0));
  await page.waitForTimeout(500);
  const st = await rowState(page, HINGE155);
  check('Unlink on the same hinge row (a real click): "Not linked"', st && st.status === 'not-linked' && st.words === 'Not linked', 'not-linked, Not linked', j(st));
  check('the fake counts linksCleared 1', Number(c1.linksCleared) === 1, 1, c1.linksCleared);
  const rows = await linkRows();
  check('the fake\'s rows lost that link', !rows.some((r) => r.cc_material_id === HINGE155), 'absent', j(rows.map((r) => r.cc_material_id)));
  await shot(page, 'f08-unlink.png');
}

/** The BOM's purchase lines, in DOM order, with the department each stands under. */
const bomLines = (page) => ask(page, `(() => { const out = []; let group = null;
  for (const tr of document.querySelectorAll('table[data-bom-lines="bom"] > tbody > tr')) {
    if (tr.dataset.bomGroup) { group = tr.dataset.bomGroup; out.push(null); continue; }
    if (!tr.hasAttribute('data-bom-line-status')) { out.push(null); continue; }
    const name = tr.querySelector('td span'); const w = tr.querySelector('[data-bom-words]');
    out.push({ group, status: tr.dataset.bomLineStatus, name: name ? name.textContent.trim() : '', nameRed: name ? name.className.includes('text-status-danger') : false,
      words: w ? w.innerText.trim() : null, wordsRed: w ? w.className.includes('text-status-danger') : false, wordsColour: w ? getComputedStyle(w).color : null,
      link: Boolean(tr.querySelector('[data-bom-link]')) });
  } return out; })()`);

async function legG(ctx, page) {
  if (await visible(page, '[data-link-materials]')) await press(page, `${WIN} [data-link-back]`);
  const closed = await until(page, '!document.querySelector("[data-link-materials]")', 5000);
  check('"Back to project" (a real click): the window closes', closed, 'closed', String(closed));
  await press(page, '[data-studio="topbar-bom"]');
  await press(page, '[data-bom-purchase-tab="1"]');
  await until(page, 'Boolean(document.querySelector("[data-bom-purchase]"))', 8000);
  await until(page, 'document.querySelectorAll("table[data-bom-lines=bom] [data-bom-line-status]").length > 0', 10000);
  await page.waitForTimeout(800);
  const all = await bomLines(page);
  const lines = all.filter(Boolean);
  const red = lines.filter((l) => l.status === 'not-linked' && l.words === 'Not linked' && l.wordsRed && l.link);
  check('the BOM\'s purchase list (top bar BOM, tab BOM): at least one line "Not linked" in red with a Link button', red.length >= 1,
    '>= 1', `${red.length} of ${lines.length} lines; e.g. ${j(red.slice(0, 2).map((l) => ({ name: l.name, colour: l.wordsColour })))}`);
  const headText = async () => ask(page, `(() => { const el = document.querySelector('[data-bom-link-count]'); return el ? { text: el.innerText.replace(/\\s+/g, ' ').trim(), n: el.dataset.bomLinkCount, m: el.dataset.bomLinkTotal } : null; })()`);
  const h0 = await headText();
  const hm = h0 && h0.text.match(/(\d+) of (\d+) lines linked/);
  const hk = h0 && h0.text.match(/Incomplete total, (\d+) (line|lines) not linked/);
  check('the header "<n> of <m> lines linked" and "Incomplete total, <k> lines not linked", k = m - n',
    hm && hk && Number(hk[1]) === Number(hm[2]) - Number(hm[1]) && hk[2] === (Number(hk[1]) === 1 ? 'line' : 'lines'),
    'n of m lines linked; Incomplete total, m - n lines not linked', j(h0));
  const notLinkedLines = lines.filter((l) => l.status === 'not-linked').map((l) => `${l.group}: ${l.name}`);
  note('the lines not linked (department: name)', j(notLinkedLines));
  await shot(page, 'f10-bom.png');

  // Link from a line: the 155 hinge unlinked in (f), else the first hinge or sheet line not linked.
  const want155 = ENTRY.get(HINGE155).name;
  let at = all.findIndex((l) => l && l.name === want155 && l.status === 'not-linked' && l.link);
  if (at < 0) at = all.findIndex((l) => l && (l.group === 'hinges' || l.group === 'sheets') && l.status === 'not-linked' && l.link);
  const line = at >= 0 ? all[at] : null;
  check('the line to Link: the 155 hinge unlinked in (f)', line && line.name === want155, want155, j(line && { group: line.group, name: line.name }));
  if (!line) return;
  const entry = BY_NAME.get(line.name) || null;
  const c0 = await counters();
  await page.locator('table[data-bom-lines="bom"] > tbody > tr').nth(at).locator('[data-bom-link]').click();
  await windowReady(page);
  await page.waitForTimeout(800);
  const opened = await ask(page, `(() => { const el = document.querySelector('${WIN} [data-link-selected="1"]'); const tab = document.querySelector('${WIN} [data-link-tab][aria-selected="true"]');
    if (!el) return { row: null, tab: tab ? tab.dataset.linkTab : null }; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { row: el.dataset.linkRow, name: el.querySelector('td div div')?.textContent.trim() || null, tab: tab ? tab.dataset.linkTab : null,
      outline: [cs.outlineStyle, cs.outlineWidth, cs.outlineColor].join(' '), inView: r.top >= 0 && r.bottom <= innerHeight,
      target: document.querySelector('${WIN} [data-link-target]')?.dataset.linkTarget || null }; })()`);
  check('Link on that line (a real click): the window opens at that entry (the selected row\'s token is the line\'s)',
    entry && opened.row === tok(entry.id) && opened.target === tok(entry.id) && opened.tab === entry.department,
    `row ${entry ? tok(entry.id) : '?'} (${line.name}), tab ${entry?.department}`, j(opened));
  check('the selected row is outlined gold and in view', /solid/.test(opened.outline || '') && /rgb\(170, 142, 104\)/.test(opened.outline || '') && opened.inView,
    'outline solid, the house gold rgb(170, 142, 104), in view', j({ outline: opened.outline, inView: opened.inView }));
  const stockFor = { hinges: 6, sheets: 1, consumables: 4 }[entry?.department] || 5;
  await press(page, `${WIN} [data-material-link="${STOCK(stockFor)}"]`);
  if (await visible(page, `${WIN} [data-link-form-row]`)) {
    // A sheet or a paint asks first (the fallback line only; the 155 hinge links on one click).
    await typeInto(page, `${WIN} [data-link-form-row] [data-link-sheet-width]`, '1220').catch(() => {});
    await typeInto(page, `${WIN} [data-link-form-row] [data-link-sheet-length]`, '2440').catch(() => {});
    await press(page, `${WIN} [data-link-form-row] [data-link-save]`);
  }
  const toastSeen = await until(page, `[...document.querySelectorAll('[data-message]')].some((m) => /Saved for all projects/.test(m.innerText))`, 5000);
  const toast = await ask(page, `(() => { const m = [...document.querySelectorAll('[data-message]')].find((x) => /Saved for all projects/.test(x.innerText)); if (!m) return null;
    const r = m.getBoundingClientRect(); const was = m.style.pointerEvents; m.style.pointerEvents = 'auto';
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); m.style.pointerEvents = was;
    return { text: m.innerText.trim(), level: m.dataset.messageLevel, onTop: Boolean(hit && (m === hit || m.contains(hit))), at: [Math.round(r.left), Math.round(r.top)] }; })()`);
  const c1 = await counters();
  const nextChoice = await ask(page, `document.querySelector('${WIN} [data-link-target]')?.innerText.replace(/\\s+/g, ' ').trim() || null`);
  note('after the link made from the BOM, what the window holds chosen for the next Link', j(nextChoice));
  check(`link it there (row ${stockFor}, a real click): the toast "Saved for all projects" appears`, toastSeen && toast && toast.text === 'Saved for all projects',
    'Saved for all projects', j(toast));
  check('the toast stands on top of the window (not under it)', toast && toast.onTop, 'on top at its centre', j(toast && { onTop: toast.onTop, at: toast.at }));
  check('one cc_save_material_links call for that link', rpcN(c1, 'cc_save_material_links') === rpcN(c0, 'cc_save_material_links') + 1,
    rpcN(c0, 'cc_save_material_links') + 1, rpcN(c1, 'cc_save_material_links'));
  await shot(page, 'f10-toast.png');
  await press(page, `${WIN} [data-link-back]`);
  await until(page, '!document.querySelector("[data-link-materials]")', 5000);
  await page.waitForTimeout(600);
  const back = (await bomLines(page)).filter(Boolean).find((l) => l.name === line.name) || null;
  const h1 = await headText();
  check('back in the BOM: that line is linked now and the header counts one more', back && back.status === 'linked' && Number(h1?.n) === Number(h0?.n) + 1,
    `linked; ${Number(h0?.n) + 1} linked`, j({ status: back && back.status, header: h1 && h1.text }));

  // The bespoke block: "Bespoke, this project only".
  const block = await ask(page, `document.querySelector('[data-bom-bespoke]')?.querySelector('span')?.textContent.trim() || null`);
  check('the block "Bespoke, this project only" under the lines', block === 'Bespoke, this project only', 'Bespoke, this project only', j(block));
  await press(page, '[data-bom-bespoke-add="1"]');
  await until(page, 'document.querySelectorAll("[data-bom-bespoke-row]").length === 1', 5000);
  const ROW = '[data-bom-bespoke-row]';
  await typeInto(page, `${ROW} [data-bom-bespoke-name]`, 'Client handles');
  await typeInto(page, `${ROW} [data-bom-bespoke-qty]`, '6');
  await page.keyboard.press('Enter');
  await press(page, `${ROW} [data-bom-bespoke-unit="pcs"]`);
  await typeInto(page, `${ROW} [data-bom-bespoke-price]`, '4.5');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  const typed = await ask(page, `(() => { const r = document.querySelector('${ROW}'); if (!r) return null; return { name: r.querySelector('[data-bom-bespoke-name]')?.value,
    qty: r.querySelector('[data-bom-bespoke-qty]')?.value, unit: r.querySelector('[data-bom-bespoke-unit][aria-pressed="true"]')?.dataset.bomBespokeUnit || null,
    price: r.querySelector('[data-bom-bespoke-price]')?.value, cost: r.querySelector('[data-bom-bespoke-cost]')?.innerText.trim(),
    inBlock: Boolean(r.closest('[data-bom-bespoke]')) }; })()`);
  const store = await ask(page, `(${S}.project.bespoke || []).map((b) => ({ name: b.name, qty: b.qty, unit: b.unit, price: b.price, client: Boolean(b.suppliedByClient) }))`);
  check('Add bespoke item, "Client handles", 6, pcs, 4.5 (real clicks and keys): the row in the Bespoke block, 27.00',
    typed && typed.inBlock && typed.name === 'Client handles' && Number(typed.qty) === 6 && typed.unit === 'pcs' && Number(typed.price) === 4.5 && typed.cost === '27.00'
    && store.length === 1 && store[0].name === 'Client handles' && store[0].qty === 6 && store[0].unit === 'pcs' && store[0].price === 4.5,
    'Client handles, 6, pcs, 4.5, 27.00; one row in project.bespoke', j({ typed, store }));
  const lineTotal = await ask(page, `document.querySelector('[data-bom-total]')?.innerText.replace(/\\s+/g, ' ').trim() || null`);
  note('the project total line with the bespoke row in it', j(lineTotal));
  await shot(page, 'f10-bespoke.png');
  const s0 = await counters();
  await page.keyboard.press('Control+s');
  const s1 = await untilJc((x) => rpcN(x, 'cc_save_item') > rpcN(s0, 'cc_save_item'), 10000);
  check('Ctrl+S (real keys): one cc_save_item', rpcN(s1, 'cc_save_item') === rpcN(s0, 'cc_save_item') + 1, rpcN(s0, 'cc_save_item') + 1, rpcN(s1, 'cc_save_item'));
  const design = ctxState.itemId ? await savedDesign(ctxState.itemId) : null;
  const saved = (design?.project?.bespoke || []).map((b) => ({ name: b.name, qty: b.qty, unit: b.unit, price: b.price }));
  check('the fake\'s saved design (cc_items.design, one select) carries project.bespoke with that row',
    saved.length === 1 && saved[0].name === 'Client handles' && saved[0].qty === 6 && saved[0].unit === 'pcs' && saved[0].price === 4.5,
    '[Client handles, 6, pcs, 4.5]', j(saved));
  const links = design ? JSON.stringify(design).match(/cc_material_id|stock_item_id/g) : null;
  check('the saved design holds no link (law 3: a project never holds one)', design && !links, 'no cc_material_id, no stock_item_id', j(links));
  await press(page, '[data-studio="topbar-bom"]');
}

async function legH(ctx, page) {
  await jc('/__fake/links?on=0');
  const q0 = await counters();
  await page.goto(BASE);
  const opened = ctxState.itemId ? await openItem(page, ctxState.itemId) : false;
  note('the fake\'s links switched off (GET /__fake/links?on=0), reload, the item opened again', j({ opened }));
  await page.waitForTimeout(800);
  const ready = await openLinkWindow(page);
  await page.waitForTimeout(800);
  const words = await ask(page, `document.querySelector('[data-link-not-set-up]')?.innerText.replace(/\\s+/g, ' ').trim() || null`);
  check('open Link materials: "Material links are not set up in Joinery Core yet."', ready && (words || '').includes(NOT_SET_UP), NOT_SET_UP, j(words));
  const enabledCount = () => ask(page, `(() => { const w = document.querySelector('[data-link-materials]'); if (!w) return null;
    const n = (s) => [...w.querySelectorAll(s)].filter((b) => !b.disabled).length;
    return { link: n('[data-material-link]'), linkButtons: w.querySelectorAll('[data-material-link]').length, accept: n('[data-link-accept]'), acceptAll: n('[data-link-accept-all]'),
      change: n('[data-link-change]'), unlink: n('[data-link-unlink]'), save: n('[data-link-save]') }; })()`);
  const e0 = await enabledCount();
  await press(page, `${WIN} [data-link-tab="sheets"]`);
  await press(page, `${WIN} [data-link-brand="mdf"]`);
  await press(page, rowCell(MDF18));
  const e1 = await enabledCount();
  const zero = (e) => e && e.link === 0 && e.accept === 0 && e.acceptAll === 0 && e.change === 0 && e.unlink === 0 && e.save === 0;
  check('no Link button enabled (read only), before and after a row is chosen', zero(e0) && zero(e1) && e1.linkButtons > 0,
    'every Link, Accept, Change, Unlink, Save disabled', j({ before: e0, afterChoosing: e1 }));
  const q1 = await counters();
  note('the fake refused the links read (403, the SQL of T-JC3a not run)', j({ linksReads: Number(q1.queryByTable.cc_material_links || 0) - Number(q0.queryByTable.cc_material_links || 0), refused: q1.queryRefused - q0.queryRefused }));
  await shot(page, 'f08-not-set-up.png');
  await jc('/__fake/links?on=1');
  await press(page, `${WIN} [data-link-not-set-up] [data-link-retry]`);
  const back = await until(page, `!document.querySelector('[data-link-not-set-up]') && !document.querySelector('[data-link-loading]')`, 10000);
  const head1 = await ask(page, `(() => { const el = document.querySelector('[data-link-count]'); return el ? Number(el.dataset.linkCount) : null; })()`);
  const rows = await linkRows();
  check('the switch on again (GET /__fake/links?on=1), Retry (a real click): the links are read, the count is the fake\'s', back && head1 === rows.length,
    `not-set-up gone, ${rows.length} linked`, j({ gone: back, linked: head1 }));

  await press(page, `${WIN} [data-link-back]`);
  await until(page, '!document.querySelector("[data-link-materials]")', 5000);
  await press(page, '[data-studio="rail-materials"]');
  await press(page, '[data-studio="popup-item"][data-item="assign-materials"]');
  await until(page, 'Boolean(document.querySelector("[data-assign-replaced]"))', 15000);
  await page.waitForTimeout(800);
  const banner = await ask(page, `(() => { const b = document.querySelector('[data-assign-replaced]'); return b ? { words: b.querySelector('span')?.innerText.trim() || null,
    button: b.querySelector('[data-assign-open-link]')?.innerText.trim() || null, readOnly: document.querySelector('[data-assign-materials]')?.dataset.assignReadOnly } : null; })()`);
  check('Assign materials...: the banner "Replaced by Link materials. This window is read only until the next update."', banner && banner.words === READ_ONLY && banner.readOnly === '1',
    READ_ONLY, j(banner));
  await shot(page, 'f14-old-window.png');
  await press(page, '[data-assign-open-link="1"]');
  const opened2 = await windowReady(page, 10000);
  const both = await ask(page, `({ link: Boolean(document.querySelector('[data-link-materials]')), assign: Boolean(document.querySelector('[data-assign-materials]')) })`);
  check('"Open Link materials" (a real click) opens the new window', opened2 && both.link, 'the Link materials window', j(both));
  if (await visible(page, '[data-link-materials]')) await press(page, `${WIN} [data-link-back]`);
}

/**
 * A PROBE, written as NOTE lines only (no station asserts it): the owner's own case of F11.3, *"jak dadza next
 * next next zeby im biale nie wyskoczylo"*. A second new item walked with the primary button ONLY (the Stock board
 * selects never touched): does it reach the editor, and on which boards? What stops it is written in its words.
 */
async function probeNextOnly(ctx) {
  const page = await ctx.newPage();
  await page.goto(BASE);
  await until(page, 'document.querySelectorAll("[data-jc-project]").length > 0', 30000);
  for (let k = 0; k < 5 && await visible(page, '[data-crash-discard]'); k += 1) await press(page, '[data-crash-discard]');
  await press(page, `[data-jc-new-item="${PIPELINE}"]`);
  await until(page, 'Boolean(document.querySelector("[data-project-field=name]"))', 8000);
  await press(page, '[data-project-field="name"]');
  await page.keyboard.type('Walk next only');
  const log = [];
  let reached = false;
  for (let i = 0; i < 40; i += 1) {
    if (await visible(page, '[data-start-designing="1"]:not([disabled])')) {
      await press(page, '[data-start-designing="1"]');
      log.push('Start designing');
      reached = await until(page, `${UI}.screen === 'editor'`, 20000);
      break;
    }
    if (await visible(page, '[data-setup-primary="1"]:not([disabled])')) {
      log.push(String(await page.locator('[data-setup-primary="1"]').textContent()).trim());
      await press(page, '[data-setup-primary="1"]');
      continue;
    }
    const words = await ask(page, `[...document.querySelectorAll('[role="status"], .cc-setup-review-notice, [data-setup-blocker]')].filter((e) => e.offsetParent)
      .map((e) => e.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean).slice(0, 4)`);
    log.push(`stuck: ${j(words)}`);
    break;
  }
  const boards = await boardsOf(page);
  note('PROBE: a second new item, the primary button ONLY (Next, Next, Next; no Stock board chosen)', log.join(' > '));
  note('PROBE: where it ended and on which boards', j({ editor: reached, ...boards }));
  await page.close().catch(() => {});
}

const started = new Date();
let crashed = null;
try {
  await jc('/__fake/reseed');
  await jc(`/__fake/tenant?id=${SKYLON}`);
  await jc('/__fake/links?on=1');
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
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
  await run('h', () => legH(ctx, page));
  if (LEGS.includes('a')) { LEG = 'probe'; push('LEG', 'probe (Next only)'); try { await probeNextOnly(ctx); } catch (err) { note('PROBE ran to its end', String(err && err.message || err).slice(0, 300)); } }
  LEG = 'end';
  note('page errors the walk saw (uncaught)', errors.length ? j(errors.slice(0, 8)) : 'none');
  const end = await fakeState();
  note('the fake\'s link rows at the end', j(end.links.rows.map((r) => `${r.cc_material_id} -> ${r.stock_item_id.slice(-2)}${r.sheet_width_mm ? ` ${r.sheet_width_mm}x${r.sheet_length_mm}` : ''}${r.yield ? ` y${r.yield}` : ''}`)));
  note('the fake\'s counters at the end (since the reseed)', j(end.counters));
} catch (err) {
  crashed = err;
} finally {
  await stopAll();
}

const pass = steps.filter((s) => s.kind === 'PASS').length;
const fail = steps.filter((s) => s.kind === 'FAIL').length;
const lines = [
  'T-CC2a . THE WALK (scripts/t-cc2a-walk.mjs)',
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
process.stdout.write(`\nRESULT: ${pass} PASS, ${fail} FAIL. Ledger: verify/t-cc2a/walk.txt\n`);
if (crashed) process.stdout.write(`${crashed.stack || crashed}\n`);
process.exit(fail || crashed ? 1 : 0);
