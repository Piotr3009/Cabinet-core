/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F16.2, THE WALK (CLAUDE.md T-CC1b PART E)
//
// CLAUDE.md T-CC1b F16.2: "(a) sign in as admin, open the item "Walk wardrobe"
// of the fake: the header shows the item name and under it the JC number and
// project name to the RIGHT of the menus; the bar lists File, View, Settings,
// Spraying, Lighting, Output and no Library, no Database; ONE "View" (frame);
// (b) click "Back to Joinery Core": the browser lands on `/dashboard.html`
// (the fake answers a page); back; (c) the rail's Add lists Kitchen,
// Wardrobes, Bathroom, Sets, Saved sets, Media wall (soon), Hallway (soon),
// Office (soon); open Bathroom: four kits; open Kitchen, Wall units, AVENTOS
// lift-up: four rows; add "HK, stay lift" (frame); (d) Output shows four
// entries (frame); (e) Drawings: no Card, no Front only, the sheet list with
// "Visualisation, left" and "Visualisation, right", the company logo in the
// title block (frame); press Generate on the AI card: three pictures arrive,
// "Use this one" on the second: "Visualisation, AI" appears ticked; Export
// PDF: one download whose page count equals the ticked sheets (read with the
// suite's PDF reader; frame); (f) rail Materials, Assign materials...: the six
// groups, the hinge lines (two specs after the AVENTOS unit joined), every
// chip "Not assigned"; assign the 110 hinge from the right list: the chip
// turns; the header says "<n> of <m> lines assigned" (frame); Output, BOM PDF:
// the PDF text holds "Not assigned materials" (frame); (g) switch the fake's
// tenant to another uuid, reload, open the item, select a front: the gallery
// has no ornate style (frame). Every line PASS or FAIL with the number
// expected and the number read; never patched in the walk."
//
// THE HANDS. The house's harness (scripts/t74-harness.mjs) speaks CDP and has
// no download road; stations (e) and (f) read two downloaded PDFs, so this
// walk drives Playwright's own input pipe, as T-CC1a's walk does
// (scripts/t-cc1a-walk.mjs): `locator.click()` moves the real mouse to the
// control's centre and presses, keys are real keys, a download is the
// browser's. The ledger, the frames and the rule are the house's: every line
// PASS or FAIL with the number expected and the number read, a FAIL written
// down and never patched. The STAGES that are not what a station is about
// (the item "Walk wardrobe" made through T-CC1a's New item flow; doors fitted
// so the hinges and the lift are in the demand; a unit selected) go through
// the app's own flow or the store's own actions and are written as NOTE
// lines. The fake Joinery Core (scripts/t-cc1a-fake-jc.mjs, grown by F16.1)
// counts every request; its counters are what (b) to (g) read. The PDF pages
// are counted as the suite counts them (test/turn79-f18-label-sheets.test.js:
// every `/Type /Page` object that is not the `/Pages` tree).
//
//   node scripts/t-cc1b-walk.mjs --build --serve   build dist/, serve it on 4173, start the fake, walk, stop both
//   node scripts/t-cc1b-walk.mjs                   vite preview already on 4173; the fake is started here
//   node scripts/t-cc1b-walk.mjs --legs a,c,d      some stations only (a makes the item the others open)
//
// Ledger: verify/t-cc1b/walk.txt. Frames: verify/t-cc1b/f16-*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const FAKE_PORT = Number(opt('port', 4381));
const OUT = new URL('../verify/t-cc1b/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

// The two tenants of the walk: Skylon Joinery LTD (CLAUDE.md T-CC1b, THE NUMBERS) and another workshop.
const SKYLON = 'b663e012-1ae6-45d8-b720-7bcc26baffc2';
const OTHER = '7d2e4c90-31a5-4b8e-9f06-2c5d8e1a0b47';
const ITEM = 'Walk wardrobe';
const PIPELINE = 'pl:pip-2001';
const HINGE_110 = '5e0c4b1a-7f2d-4c3e-9a8b-000000000005';

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
const fake = await startFakeJc({ port: FAKE_PORT, upstream: PREVIEW_PORT, tenantId: SKYLON, aiDelayMs: 300 });
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
/** A real click at a control's centre (Playwright moves the mouse and presses). */
async function press(page, sel, { timeout = 8000 } = {}) {
  const l = page.locator(sel).first();
  try { await l.waitFor({ state: 'visible', timeout }); } catch { return false; }
  await l.click();
  await page.waitForTimeout(500);
  return true;
}
const visible = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
/** A top menu by its words, clicked open. */
const TOP = 'nav[aria-label="Main menu"] > div > button';
async function openTop(page, label) {
  const l = page.locator(TOP, { hasText: new RegExp(`^\\s*${label}\\s*$`) }).first();
  try { await l.waitFor({ state: 'visible', timeout: 5000 }); } catch { return false; }
  await l.click();
  await page.waitForTimeout(400);
  return true;
}
/** The open dropdown's entries, as the joiner reads them. */
const openMenuItems = (page) => ask(page, `[...document.querySelectorAll('nav[aria-label="Main menu"] [role="menu"] > div > [role="menuitem"]')]
  .filter((b) => b.offsetParent).map((b) => b.textContent.trim())`);
/** The pages of a PDF counted in its BYTES (the suite's reader, test/turn79-f18-label-sheets.test.js). */
const pdfPages = (bytes) => (bytes.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
/** A click that makes a download; returns the bytes (or null). */
async function download(page, clickIt, ms = 30000) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: ms }).catch(() => null), clickIt()]);
  if (!dl) return null;
  const path = await dl.path().catch(() => null);
  return path ? { bytes: readFileSync(path), name: dl.suggestedFilename() } : null;
}

// === THE NEW ITEM FLOW, WALKED BY HAND (T-CC1a's, scripts/t-cc1a-walk.mjs) ==
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

  // THE STAGE: "Walk wardrobe" is made through T-CC1a's New item flow on the pipeline project, a WARDROBE added, Ctrl+S.
  await press(page, `[data-jc-new-item="${PIPELINE}"]`);
  await until(page, 'Boolean(document.querySelector("[data-project-field=name]"))', 8000);
  await press(page, '[data-project-field="name"]');
  await page.keyboard.type(ITEM);
  if (await visible(page, '[data-project-type="wardrobe"]')) await press(page, '[data-project-type="wardrobe"]');
  const flow = await walkFlow(page);
  await until(page, `${UI}.screen === 'editor'`, 20000);
  const created = (await items()).find((i) => i.name === ITEM) || null;
  ctxState.itemId = created?.id || null;
  await ask(page, `${S}.addUnit('WARDROBE')`);
  await page.keyboard.press('Control+s');
  await untilJc((x) => rpcN(x, 'cc_save_item') >= 1, 10000);
  note('THE STAGE (T-CC1a\'s New item flow by hand, a WARDROBE through the store, Ctrl+S)',
    `${flow.log.join(' > ')} | item ${ctxState.itemId} | units ${await ask(page, `${S}.units.map((u) => u.type).join(',')`)}`);

  // Open it from the list, as the joiner does tomorrow.
  await page.goto(BASE);
  const opened = ctxState.itemId ? await openItem(page, ctxState.itemId) : false;
  check(`open the item "${ITEM}" of the fake (Open, a real click): the editor shows it`, opened, `project.id ${ctxState.itemId}`, await ask(page, `${S}.project.id`));
  await page.waitForTimeout(1500);

  const job = await ask(page, `(() => { const el = document.querySelector('[data-studio="topbar-job"]'); const line = document.querySelector('[data-studio="topbar-job-project"]');
    const nav = document.querySelector('nav[aria-label="Main menu"]'); if (!el || !nav) return null; const a = el.getBoundingClientRect(); const n = nav.getBoundingClientRect();
    return { text: el.innerText.replace(/\\s+/g, ' ').trim(), project: line ? line.innerText.trim() : null, left: Math.round(a.left), navRight: Math.round(n.right),
      lineBelow: line ? line.getBoundingClientRect().top >= a.top + 4 : false }; })()`);
  check('the header: the item\'s name, and under it the JC number and project name', job && job.text.includes(ITEM) && /Q-2001/.test(job.project || '')
    && /Loft wardrobes/.test(job.project || '') && job.lineBelow, `"${ITEM}", then "Q-2001 ... Loft wardrobes" below it`, j(job));
  check('the job block stands to the RIGHT of the menus', job && job.left > job.navRight, 'job.left > menus.right', j(job && { left: job.left, navRight: job.navRight }));
  const bar = await ask(page, `[...document.querySelectorAll('${TOP}')].map((b) => b.textContent.trim())`);
  const want = ['File', 'View', 'Settings', 'Spraying', 'Lighting', 'Output'];
  check('the bar lists File, View, Settings, Spraying, Lighting, Output', want.every((w) => bar.includes(w)), j(want), j(bar));
  check('no Library and no Database on the bar', !bar.includes('Library') && !bar.includes('Database'), 'neither', j(bar));
  const views = await ask(page, `[...document.querySelectorAll('button, [role="button"], summary')].filter((b) => b.offsetParent && /^\\s*View\\s*$/.test(b.textContent)).length`);
  check('ONE "View" on the screen (the scene corner\'s dropdown is gone)', views === 1, 1, views);
  await shot(page, 'f16-a-header.png');
  return page;
}

async function legB(ctx, page) {
  const at = page.url();
  const ok = await press(page, '[data-studio="topbar-back-jc"]');
  await page.waitForURL(/\/dashboard\.html/, { timeout: 15000 }).catch(() => {});
  const u = new URL(page.url());
  check('click "Back to Joinery Core" (a real click): the browser lands on /dashboard.html', ok && u.pathname === '/dashboard.html', '/dashboard.html', `${ok ? '' : 'no button; '}${u.pathname}`);
  const words = await ask(page, 'document.body.innerText.slice(0, 80)');
  note('the fake\'s dashboard page answers', j(words));
  await page.goBack().catch(() => {});
  await page.waitForURL(/\/cabinet\//, { timeout: 15000 }).catch(() => {});
  check('back: on /cabinet/ again', new URL(page.url()).pathname.startsWith('/cabinet/'), '/cabinet/', `${new URL(page.url()).pathname} (was ${new URL(at).pathname})`);
  const reopened = ctxState.itemId ? await openItem(page, ctxState.itemId) : false;
  note('the item opened again from the list for the next stations', String(reopened));
}

async function legC(ctx, page) {
  await press(page, '[data-studio="rail-add"]');
  const fams = await ask(page, `[...document.querySelectorAll('[data-studio="popup-item"]')].map((e) => ({ id: e.dataset.item, label: (e.querySelector('span span')?.textContent || e.textContent).trim(), soon: e.dataset.soon === '1' }))`);
  const labels = fams.map((f) => f.label);
  const want = ['Kitchen', 'Wardrobes', 'Bathroom', 'Sets', 'Saved sets', 'Media wall', 'Hallway', 'Office'];
  check('the rail\'s Add lists every family in the owner\'s order', j(labels) === j(want), j(want), j(labels));
  const soon = fams.filter((f) => f.soon).map((f) => f.label);
  check('Media wall, Hallway, Office held open (soon)', j(soon) === j(['Media wall', 'Hallway', 'Office']), 'Media wall, Hallway, Office', j(soon));
  await press(page, '[data-studio="popup-item"][data-item="bathroom"]');
  await page.waitForTimeout(600);
  const bath = await ask(page, `[...document.querySelectorAll('[data-library-list] [data-library-entry]')].filter((e) => e.offsetParent).map((e) => e.dataset.libraryEntry)`);
  check('open Bathroom: four kits', bath.length === 4, 4, `${bath.length} ${j(bath)}`);
  if (await visible(page, '[aria-label="Close the library"]')) await press(page, '[aria-label="Close the library"]');
  await press(page, '[data-studio="rail-add"]');
  await press(page, '[data-studio="popup-item"][data-item="kitchen"]');
  await press(page, '[data-library-group="wall-units"]');
  await press(page, '[data-library-group="aventos"]');
  await page.waitForTimeout(500);
  const rows = await ask(page, `[...document.querySelectorAll('[data-library-entry^="wud-h"]')].filter((e) => e.offsetParent).map((e) => ({ id: e.dataset.libraryEntry, label: e.querySelector('div')?.textContent.trim() }))`);
  check('open Kitchen, Wall units, AVENTOS lift-up: four rows', rows.length === 4, 4, j(rows));
  const before = await ask(page, `${S}.units.length`);
  await press(page, '[data-library-entry="wud-hk"]');
  await until(page, `${S}.units.length > ${before}`, 8000);
  const wud = await ask(page, `${S}.units.filter((u) => u.type === 'WUD').map((u) => ({ id: u.id, system: u.params.front_system }))`);
  check('add the HK row (a real click): a WUD whose front_system is hk', wud.some((u) => u.system === 'hk'), 'a WUD, front_system hk', j(wud));
  if (await visible(page, '[aria-label="Close the library"]')) await press(page, '[aria-label="Close the library"]');
  // THE STAGE: doors are the last step (SPEC 4.10); every unit is given its front, so the lift and the hinges are demand.
  const fitted = await ask(page, `${S}.units.map((u) => ${S}.addDoors(u.id).count)`);
  note('THE STAGE (the store\'s addDoors on every unit)', j(fitted));
  await shot(page, 'f16-c-aventos.png');
}

async function legD(ctx, page) {
  await openTop(page, 'Output');
  const out = await openMenuItems(page);
  check('Output shows four entries', out.length === 4, 4, `${out.length} ${j(out)}`);
  await shot(page, 'f16-d-output.png');
  await page.keyboard.press('Escape');
}

async function legE(ctx, page) {
  await jc('/__fake/reset');
  await press(page, '[data-studio="drawings"]');
  await until(page, 'Boolean(document.querySelector("[data-wall-sheets]"))', 15000);
  await page.waitForTimeout(1500);
  const buttons = await ask(page, `[...document.querySelectorAll('[data-modal-name="drawing"] button, [role="dialog"] button')].map((b) => b.textContent.trim())`);
  check('Drawings: no Card, no Front only', !buttons.some((b) => /^card$/i.test(b) || /front only/i.test(b)), 'neither', j(buttons.filter((b) => /card|front/i.test(b))));
  const sheets = await ask(page, `[...document.querySelectorAll('[data-wall-sheet-pick]')].map((e) => e.dataset.wallSheetPick)`);
  check('the sheet list holds "Visualisation, left" and "Visualisation, right"', sheets.includes('Visualisation, left') && sheets.includes('Visualisation, right'),
    'both', j(sheets));
  const logo = await ask(page, `(() => { const el = document.querySelector('[data-title-block-logo]'); const img = document.querySelector('[data-title-block-field="company.logo"] img');
    return { kind: el?.dataset.titleBlockLogo || null, src: img ? img.getAttribute('src').slice(0, 40) : null }; })()`);
  const c0 = await counters();
  check('the company logo in the title block (company_settings.logo_url, fetched from the fake)', logo.kind === 'company' && Boolean(logo.src) && c0.logo >= 0,
    'data-title-block-logo="company", an image', j({ ...logo, logoFetches: c0.logo }));
  await shot(page, 'f16-e-drawings.png');

  const gen = await press(page, '[data-ai-generate="1"]');
  await until(page, 'Number(document.querySelector("[data-ai-pictures]")?.dataset.aiPictures) >= 3', 30000);
  const pics = await ask(page, 'Number(document.querySelector("[data-ai-pictures]")?.dataset.aiPictures || 0)');
  const c1 = await counters();
  const calls = Object.values(c1.ai).reduce((a, b) => a + b, 0);
  check('press Generate on the AI card (a real click): three pictures arrive, three calls to /api/ai/visualise', gen && pics === 3 && calls === 3,
    'pictures 3, calls 3', `pictures ${pics}, calls ${calls} ${j(c1.ai)} ${j(c1.aiStatus)}`);
  await press(page, '[data-ai-use="2"]');
  await page.waitForTimeout(800);
  const ai = await ask(page, `(() => { const p = document.querySelector('[data-wall-sheet-pick="Visualisation, AI"]'); return p ? { checked: p.checked ?? p.getAttribute('aria-pressed') } : null; })()`);
  check('"Use this one" on the second: "Visualisation, AI" appears ticked', ai && (ai.checked === true || ai.checked === 'true'), 'listed and ticked', j(ai));
  const ticked = await ask(page, 'Number(document.querySelector("[data-wall-drawings-pdf]")?.dataset.wallDrawingsPages || 0)');
  const pdf = await download(page, () => press(page, '[data-wall-drawings-pdf="1"]'), 60000);
  const pages = pdf ? pdfPages(pdf.bytes) : 0;
  check('Export PDF (a real click): one download whose page count equals the ticked sheets', pdf && pages === ticked && ticked > 0,
    `${ticked} pages`, pdf ? `${pages} pages (${pdf.name}, ${pdf.bytes.length} bytes)` : 'no download');
  if (pdf) writeFileSync(`${OUT}f16-e-drawings.pdf`, pdf.bytes);
  await shot(page, 'f16-e-ai.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

async function legF(ctx, page) {
  await press(page, '[data-studio="rail-materials"]');
  await press(page, '[data-studio="popup-item"][data-item="assign-materials"]');
  await until(page, 'Boolean(document.querySelector("[data-assign-materials]"))', 15000);
  await until(page, 'Number(document.querySelector("[data-material-rows]")?.dataset.materialRows || 0) > 0', 15000);
  await page.waitForTimeout(800);
  const groups = await ask(page, `[...document.querySelectorAll('[data-assign-group]')].map((g) => ({ id: g.dataset.assignGroup, lines: Number(g.dataset.assignGroupLines), missing: Number(g.dataset.assignGroupMissing) }))`);
  check('Assign materials...: the six groups', groups.length === 6, 6, j(groups.map((g) => g.id)));
  const hinges = await ask(page, `[...document.querySelectorAll('[data-assign-group="hinges"] [data-assign-line]')].map((l) => l.dataset.assignLine)`);
  check('the hinge lines: a line per specification', hinges.length >= 1, '>= 1 (one per spec)', `${hinges.length} ${j(hinges)}`);
  const chips = await ask(page, `({ lines: document.querySelectorAll('[data-assign-line]').length, chips: document.querySelectorAll('[data-assign-chip="not-assigned"]').length,
    assigned: document.querySelectorAll('[data-assign-line][data-assign-assigned="1"]').length })`);
  check('every chip "Not assigned"', chips.lines > 0 && chips.chips === chips.lines - chips.assigned && chips.assigned === 0, `chips = lines, assigned 0`, j(chips));
  const line = hinges[0] || null;
  if (line) await press(page, `[data-assign-line="${line}"]`);
  await press(page, `[data-material-option="${HINGE_110}"]`);
  await page.waitForTimeout(800);
  const turned = line ? await ask(page, `document.querySelector('[data-assign-line="${line}"]')?.dataset.assignAssigned || null`) : null;
  check('assign the 110 hinge from the right list (real clicks): the chip turns', turned === '1', 'data-assign-assigned 1', j({ line, turned }));
  const counter = await ask(page, `(() => { const el = document.querySelector('[data-assign-counter]'); return el ? { text: el.innerText.replace(/\\s+/g, ' ').trim(), missing: el.dataset.assignCounter, total: el.dataset.assignTotal } : null; })()`);
  const m = counter && counter.text.match(/(\d+) of (\d+) lines assigned/);
  check('the header says "<n> of <m> lines assigned"', m && Number(m[1]) >= 1 && Number(m[2]) === Number(counter.total), '<n> of <m> lines assigned', j(counter));
  await shot(page, 'f16-f-assign.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await openTop(page, 'Output');
  const pdf = await download(page, () => press(page, 'nav[aria-label="Main menu"] [role="menuitem"]:has-text("BOM PDF")'), 60000);
  const text = pdf ? pdf.bytes.toString('latin1') : '';
  check('Output, BOM PDF (a real click): the PDF text holds "Not assigned materials"', /Not assigned materials/.test(text), 'Not assigned materials',
    pdf ? `${pdf.name}, ${pdf.bytes.length} bytes, ${(text.match(/Not assigned materials/g) || []).length} times` : 'no download');
  if (pdf) writeFileSync(`${OUT}f16-f-bom.pdf`, pdf.bytes);
  await shot(page, 'f16-f-bom.png');
}

async function legG(ctx, page) {
  const frontStyles = `(() => { const s = document.querySelector('select[data-unit-front-type]'); return s ? [...s.options].map((o) => o.value) : null; })()`;
  const selectFront = async () => {
    // THE STAGE: the WUD selected through the store (the scene's own click is the T74 walks' business).
    await ask(page, `(() => { const u = ${S}.units.find((x) => x.type === 'WUD') || ${S}.units[0]; ${UI}.selectUnit(u.id); return u.id; })()`);
    // The front type stands inside the inspector's Carcass section, folded by default: the real mouse opens it
    // (amended after the first run, which read the folded section as no styles; the app was not touched).
    if (!(await ask(page, 'Boolean(document.querySelector("select[data-unit-front-type]"))'))) {
      await page.getByRole('button', { name: /^\s*carcass/i }).first().click().catch(() => {});
    }
    await until(page, 'Boolean(document.querySelector("select[data-unit-front-type]"))', 8000);
    return ask(page, frontStyles);
  };
  const skylon = (await selectFront()) || [];
  const ornateSky = skylon.filter((v) => /^ORNATE_/.test(v));
  check('as Skylon Joinery: the front\'s styles offer the four ornate ones', ornateSky.length === 4, 4, j(ornateSky));
  await jc(`/__fake/tenant?id=${OTHER}`);
  await page.goto(BASE);
  const opened = ctxState.itemId ? await openItem(page, ctxState.itemId) : false;
  const me = await ask(page, 'window.__cc.auth?.getState?.().tenant?.id || null').catch(() => null);
  note('the fake\'s tenant switched to another uuid, reload, the item opened', j({ opened, tenant: me }));
  const other = (await selectFront()) || [];
  const ornate = other.filter((v) => /^ORNATE_/.test(v));
  check('another tenant: select a front: no ornate style offered', other.length > 0 && ornate.length === 0, 'styles listed, 0 ornate', `${other.length} styles, ornate ${j(ornate)}`);
  await shot(page, 'f16-g-other-tenant.png');
  await jc(`/__fake/tenant?id=${SKYLON}`);
}

const started = new Date();
let crashed = null;
try {
  await jc('/__fake/reseed');
  await jc(`/__fake/tenant?id=${SKYLON}`);
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
  LEG = 'end';
  note('page errors the walk saw (uncaught)', errors.length ? j(errors.slice(0, 8)) : 'none');
  note('the fake\'s counters at the end (since the last reset)', j(await counters()));
} catch (err) {
  crashed = err;
} finally {
  await stopAll();
}

const pass = steps.filter((s) => s.kind === 'PASS').length;
const fail = steps.filter((s) => s.kind === 'FAIL').length;
const lines = [
  'T-CC1b F16 . THE WALK (scripts/t-cc1b-walk.mjs)',
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
process.stdout.write(`\nRESULT: ${pass} PASS, ${fail} FAIL. Ledger: verify/t-cc1b/walk.txt\n`);
if (crashed) process.stdout.write(`${crashed.stack || crashed}\n`);
process.exit(fail || crashed ? 1 : 0);
