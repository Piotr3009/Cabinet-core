#!/usr/bin/env node
// T78 F21, THE ACCEPTANCE WALK OF THE SPRAYING PAGE (CLAUDE.md PART F)
//
// CLAUDE.md T78 F21, the walk: "the Herbal Hill fixture: the page lists every
// door, end panel and plinth of the job, the sum matches a hand sum of three
// parts (asserted), the end-panel card is open, the PDF downloads; a job with
// a veneer carcass shows Set 2."  PRO only (F21 names no retail).
//
// Every gesture is the browser's own input pipe (CDP, through the T74/T75
// harness): the Herbal Hill file is put on the browser's shelf by the app's
// own save code and opened from All projects by a real click (T77 f05's road),
// the menu is driven by real clicks on its entries, the window's buttons by
// real clicks at their centres. The store is only READ (window.__cc) to say
// what the page should show; a FAIL is written down, never patched.
//
// Sections:
//   f21a  Output > Spraying... opens the window; its lines vs the store's
//         doors, plinths, end panels; the hand sum of three parts; a card open
//   f21b  Export PDF: a file the browser saved, %PDF at its head
//   f21c  the top-level Spraying button opens the same window
//   f21d  a note typed into a line rides the project (if the store carries it)
//   f21e  a veneer carcass: Set 2 appears
//
//   npx vite preview --port 4173            (dist/ already built)
//   node scripts/t78-walk-f21.mjs           every section
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t78-walk-f21.mjs
//
// Frames: verify/t78/f21-walk-*.png. Ledger: verify/t78/walk-f21.txt (its own
// file, beside PART A's walk.txt). Plain ASCII in everything this file writes.

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  open, showroomUp, showroomDown, settleCamera, BASE,
} from './t74-harness.mjs';
import { clickWith, boxOf, until } from './t75-harness.mjs';

const REPO = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../verify/t78/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const TMP = process.env.T78_WALK_TMP || join(tmpdir(), `t78-walk-f21-${process.pid}`);
mkdirSync(TMP, { recursive: true });
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

const ORDER = ['f21a', 'f21b', 'f21c', 'f21d', 'f21e'];
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

// === THE LEDGER'S HANDS =====================================================
const steps = [];
const frames = [];
let current = '';
const ascii = (t) => String(t)
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const check = (gesture, ok, expect, got) => {
  steps.push({ section: current, gesture: ascii(gesture), ok: Boolean(ok), expect: ascii(expect), got: ascii(got) });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${ascii(gesture)} | expect: ${ascii(expect)} | observed: ${ascii(got)}\n`);
};
const note = (gesture, got) => {
  steps.push({ section: current, gesture: ascii(gesture), note: true, got: ascii(got) });
  process.stdout.write(`NOTE ${ascii(gesture)} | ${ascii(got)}\n`);
};
const begin = (name, title) => {
  current = name;
  steps.push({ section: name, header: title, at: new Date().toISOString().slice(0, 16).replace('T', ' ') });
  process.stdout.write(`\n=== ${name.toUpperCase()} ${title} ===\n`);
};
const shot = async (page, name, clip = null) => {
  await settleCamera(page);
  await page.screenshot(`${SHOTS}${name}`, clip);
  frames.push(name);
  steps.push({ section: current, frame: name });
  process.stdout.write(`      frame ${name}\n`);
  return name;
};
const j = (v) => JSON.stringify(v);
const near = (a, b, tol = 1e-3) => Math.abs(Number(a) - Number(b)) <= tol;
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));

// === WHAT THE WALK READS ====================================================
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const stamp = (page) => page.ask('(document.querySelector(\'[data-build-stamp]\') || {}).getAttribute ? document.querySelector(\'[data-build-stamp]\').getAttribute(\'data-build-stamp\') : ((document.body.innerText || \'\').match(/#\\d+ . [0-9-]+ [0-9:]+ UTC . [0-9a-f]{7}/) || [null])[0]');
const modalNow = (page) => page.ask(`${UI}.modal || null`);
/** The store's own count of the parts the page should list. */
const storeCounts = (page) => page.ask(`(() => { const P = ${S}; let doors = 0; let plinths = 0; let ends = 0; let drawerFronts = 0; let units = 0;
  for (const u of P.units) { units += 1; const r = P.unitResult(u.id); for (const p of r.panels) {
    if (p.part === 'FRONT' && p.role === 'front' && !(p.meta && p.meta.appliance)) doors += 1;
    if (p.part === 'PLINTH') plinths += 1; if (p.part === 'END-PANEL') ends += 1; if (p.part === 'DRAWER-FRONT') drawerFronts += 1; } }
  return { units, doors, plinths, ends, drawerFronts }; })()`);
/** One panel of one unit, for the hand sum: w, h, t. */
const panelOf = (page, num, part) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.params.unit_num === ${j(num)}); if (!u) return null;
  const p = P.unitResult(u.id).panels.find((x) => x.part === ${j(part)}); return p ? { w: p.w, h: p.h, t: p.thickness, id: p.id } : null; })()`);
/** The Spraying window as the DOM shows it: its lines, chips, cards, paint. */
const SPRAY = 'document.querySelector(\'[data-spraying]\')';
const pageNow = (page) => page.ask(`(() => { const root = ${SPRAY}; if (!root) return null;
  const lines = [...root.querySelectorAll('[data-spray-line]')].map((tr) => ({ key: tr.getAttribute('data-spray-line'), rule: tr.getAttribute('data-spray-rule'),
    qty: Number(tr.getAttribute('data-spray-qty')), m2: Number((tr.querySelector('[data-spray-m2]') || {}).getAttribute ? tr.querySelector('[data-spray-m2]').getAttribute('data-spray-m2') : 0),
    code: (tr.querySelector('[data-spray-code]') || {}).textContent || '', size: (tr.children[4] || {}).textContent || '' }));
  const cards = [...root.querySelectorAll('[data-spray-card]')].map((c) => ({ rule: c.getAttribute('data-spray-card'), open: c.getAttribute('data-spray-card-open') }));
  const chips = [...root.querySelectorAll('[data-spray-chip]')].map((c) => c.textContent.trim());
  const paint = [...root.querySelectorAll('[data-spray-paint]')].map((tr) => ({ colour: tr.getAttribute('data-spray-paint'), litres: tr.getAttribute('data-spray-litres'), tins: (tr.querySelector('[data-spray-tins]') || {}).getAttribute ? tr.querySelector('[data-spray-tins]').getAttribute('data-spray-tins') : null, priceMissing: (tr.querySelector('[data-spray-price-missing]') || {}).getAttribute ? tr.querySelector('[data-spray-price-missing]').getAttribute('data-spray-price-missing') : null }));
  const total = (root.querySelector('[data-spray-total]') || {}).getAttribute ? root.querySelector('[data-spray-total]').getAttribute('data-spray-total') : null;
  const sets = (root.querySelector('[data-spray-sets]') || {}).getAttribute ? root.querySelector('[data-spray-sets]').getAttribute('data-spray-sets') : null;
  const error = (root.querySelector('[data-spray-error]') || {}).textContent || null;
  return { lines, cards, chips, paint, total, sets, error }; })()`);
const sumQty = (lines, rule) => lines.filter((l) => l.rule === rule).reduce((s, l) => s + l.qty, 0);
const m2 = (mm2) => Math.round(mm2 / 1e6 * 1e4) / 1e4;

// === THE STAGE: HERBAL HILL ON THE SHELF, OPENED BY A REAL CLICK ============
async function herbalHillShelf({ id, veneer = false }) {
  const { HH_PROJECT, HH_ROOM, hhUnits } = await import('../test/fixtures/t71-herbal-hill.js');
  const { DEFAULT_CABINET_PROFILE } = await import('../src/engine/profile.js');
  const { DEFAULT_DESIGN } = await import('../src/engine/design.js');
  const { memoryStorage, saveLocalProject, LIBRARY_KEY } = await import('../src/lib/projectLibrary.js');
  const shelf = memoryStorage();
  const design = veneer
    ? { ...DEFAULT_DESIGN, carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: null, finish_id: null, source: 'veneer' }] } }
    : undefined;
  const project = { ...HH_PROJECT, name: veneer ? `${HH_PROJECT.name} (veneer carcass)` : HH_PROJECT.name, id, room: HH_ROOM, ...(design ? { design } : {}) };
  const units = hhUnits(DEFAULT_CABINET_PROFILE).map((u) => {
    const over = u.params.unit_num === '01' ? { end_panels: [{ side: 'L' }] } : (u.params.unit_num === '07' ? { end_panels: [{ side: 'R' }] } : {});
    return { ...u, params: { ...u.params, ...over } };
  });
  saveLocalProject(shelf, { project, units, at: Date.parse('2026-10-11T08:00:00Z') });
  return { key: LIBRARY_KEY, json: shelf.getItem(LIBRARY_KEY), name: project.name };
}
async function openFromShelf(page, base, shelf) {
  const show = await showroomUp();
  await page.goto(`${base}index.html`);
  await page.evaluate(`try { localStorage.setItem('cc.hardwareBase', ${j(show.url)}); localStorage.setItem(${j(shelf.key)}, ${j(shelf.json)}); } catch (e) {} return true;`);
  await page.evaluate('location.reload(); return true;');
  await page.sleep(1800);
  await page.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
  await until(page, '[...document.querySelectorAll(\'button\')].some((b) => b.offsetParent && /All projects/.test(b.textContent))', 20000);
  await page.press('button', 'All projects');
  const row = await boxOf(page, `[...document.querySelectorAll('li button')].find((b) => b.offsetParent && b.textContent.includes(${j(shelf.name)}))`);
  if (!row) return false;
  await clickWith(page, row.x, row.y);
  await page.waitFor('window.__cc.views && window.__cc.views.room', { timeout: 45000 });
  await page.sleep(3000);
  return true;
}
/** A menu of the bar, then its items in turn, each found by its LABEL. */
async function menu(page, name, ...items) {
  await page.click('nav[aria-label="Main menu"] > div > button', name, { exact: true });
  await page.sleep(350);
  for (const item of items) {
    const at = await boxOf(page, `[...document.querySelectorAll('[role="menuitem"]')].filter((b) => b.offsetParent)
      .find((b) => { const t = ((b.querySelector('span.flex-1') || b).textContent || '').trim(); return t === ${j(item)} || t.replace(/(\\u2026|\\.\\.\\.)$/, '') === ${j(item)}; })`);
    if (!at) throw new Error(`no menu item "${item}" under ${name}`);
    await clickWith(page, at.x, at.y);
    await page.sleep(300);
  }
}
async function closeWindow(page) {
  const x = await boxOf(page, `(() => { const m = document.querySelector('[data-modal-name="spraying"]'); return m ? [...m.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Close') : null; })()`);
  if (x) await clickWith(page, x.x, x.y);
  await page.sleep(400);
}
let downloadSeq = 0;
async function downloadsTo(page) {
  downloadSeq += 1;
  const dir = join(TMP, `downloads-${Date.now().toString(36)}-${downloadSeq}`);
  mkdirSync(dir, { recursive: true });
  try {
    await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir, eventsEnabled: true });
  } catch {
    await page.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
  }
  return dir;
}
async function captureDownload(dir, gesture, page, { waitMs = 60000 } = {}) {
  const before = new Set(readdirSync(dir));
  await gesture();
  for (let i = 0; i < waitMs / 250; i += 1) {
    const got = readdirSync(dir).filter((n) => !before.has(n) && !/\.crdownload$|\.tmp$/.test(n));
    if (got.length) { await page.sleep(400); return join(dir, got[0]); }
    await page.sleep(250);
  }
  return null;
}
const sprayOpen = (page) => until(page, `Boolean(${SPRAY})`, 8000).then(() => true).catch(() => false);

// === F21A, F21B, F21C, F21D: HERBAL HILL ====================================
async function herbalHillPages() {
  const page = await open();
  const shelf = await herbalHillShelf({ id: 'loc_t78f21hh' });
  try {
    begin('f21a', 'Output > Spraying... on Herbal Hill: every door, end panel and plinth, the hand sum, a card open');
    note('the build under the mouse', `${await stamp(page)}`);
    note('the file', `the T71 fixture (test/fixtures/t71-herbal-hill.js) with an end panel at each end of the base run (01 L, 07 R), saved by lib/projectLibrary.js saveLocalProject onto the browser shelf, ${shelf.json.length} bytes`);
    const opened = await openFromShelf(page, BASE, shelf);
    check('the project opened from All projects by a real click', opened, 'the room view', opened ? 'opened' : 'the row was not found');
    const counts = await storeCounts(page);
    note('the store: units, doors, plinths, end panels, drawer fronts', j(counts));
    await menu(page, 'Output', 'Spraying');
    const isOpen = await sprayOpen(page);
    check('Output > Spraying... opens the Spraying window', isOpen && (await modalNow(page)) === 'spraying', 'a shell window named spraying', `modal=${await modalNow(page)}, window ${isOpen ? 'present' : 'absent'}`);
    const now = await pageNow(page);
    check('the page built without an error line', now && !now.error, 'no [data-spray-error]', now ? (now.error || 'none') : 'no window');
    if (now) {
      check('every door of the job is on the list', sumQty(now.lines, 'door') === counts.doors, `${counts.doors} doors`, `${sumQty(now.lines, 'door')} on ${now.lines.filter((l) => l.rule === 'door').length} lines`);
      check('both end panels are on the list', sumQty(now.lines, 'end_panel') === counts.ends, `${counts.ends}`, `${sumQty(now.lines, 'end_panel')}`);
      check('every plinth is on the list', sumQty(now.lines, 'plinth') === counts.plinths, `${counts.plinths}`, `${sumQty(now.lines, 'plinth')}`);
      check('every drawer front is on the list', sumQty(now.lines, 'drawer_front') === counts.drawerFronts, `${counts.drawerFronts}`, `${sumQty(now.lines, 'drawer_front')}`);
      check('every line carries a paint code', now.lines.length > 0 && now.lines.every((l) => l.code.trim()), 'a code on each line', now.lines.map((l) => l.code).filter((v, i, a) => a.indexOf(v) === i).join(' | '));
      note('the colour chips of the information card', now.chips.join(' ; '));
      check('the information card says which sets are on', now.sets === '1', 'set 1 only (an EGGER carcass)', `data-spray-sets=${now.sets}`);
      // THE HAND SUM: a BUD door, the end panel, a plinth of unit 01.
      const door = await panelOf(page, '01', 'FRONT'); const end = await panelOf(page, '01', 'END-PANEL'); const plinth = await panelOf(page, '01', 'PLINTH');
      const hand = {
        door: m2(2 * door.w * door.h + 2 * (door.w + door.h) * door.t),
        end: m2(end.w * end.h + 2 * (end.w + end.h) * end.t + (end.w * end.h - (end.w - 200) * (end.h - 200))),
        plinth: m2(plinth.w * plinth.h + plinth.w * plinth.t),
      };
      // The page prints a size to a tenth (515.5 x 770 x 25); a rounded 516 found no line in the first run.
      const tenth = (v) => String(Math.round(Number(v) * 10) / 10);
      const lineOf = (rule, p) => now.lines.find((l) => l.rule === rule && l.size.startsWith(`${tenth(p.w)} x ${tenth(p.h)}`));
      const ld = lineOf('door', door); const le = lineOf('end_panel', end); const lp = lineOf('plinth', plinth);
      const each = (l) => (l ? l.m2 / l.qty : NaN);
      const got = [each(ld), each(le), each(lp)];
      const sum = got.reduce((a, b) => a + b, 0);
      const handSum = hand.door + hand.end + hand.plinth;
      check('the hand sum of three parts (door 2S+4E, end panel 1S+F100+4E, plinth 1S+TE) matches the page', ld && le && lp && near(sum, handSum, 3e-4),
        `${hand.door} + ${hand.end} + ${hand.plinth} = ${Math.round(handSum * 1e4) / 1e4} m2`, `${got.map((v) => Math.round(v * 1e4) / 1e4).join(' + ')} = ${Math.round(sum * 1e4) / 1e4} m2`);
      const totalDom = Number(now.total);
      const totalLines = now.lines.reduce((s, l) => s + l.m2, 0);
      check('the total is the sum of the lines', near(totalDom, totalLines, 2e-3), `${Math.round(totalLines * 1e3) / 1e3}`, `${totalDom}`);
      check('the end-panel card is open under the list', now.cards.some((c) => c.rule === 'end_panel' && c.open === '1'), 'a card for rule 7, open', j(now.cards));
      check('the plinth card is open too', now.cards.some((c) => c.rule === 'plinth' && c.open === '1'), 'a card for rule 13', j(now.cards.map((c) => c.rule)));
      check('PART C names the paint per colour and says the missing paint', now.paint.length >= 1 && now.paint.every((p) => Number(p.litres) > 0), 'litres and tins per colour', j(now.paint));
    }
    await shot(page, 'f21-walk-01-page.png');
    const win = await boxOf(page, '(() => { const m = document.querySelector(\'[data-modal-name="spraying"]\'); return m; })()');
    if (win) {
      const cards = await boxOf(page, `(() => { const c = ${SPRAY} && ${SPRAY}.querySelector('[data-spray-part-b]'); if (c) c.scrollIntoView({ block: 'start' }); return c; })()`);
      if (cards) await shot(page, 'f21-walk-02-cards.png');
    }
    const errs = pageErrors(page);
    check('no runtime exception on the page', errs.length === 0, 'none', errs.length ? errs.slice(0, 3).join(' | ') : 'none');

    begin('f21b', 'Export PDF: the browser saves a PDF');
    const dir = await downloadsTo(page);
    const btn = await boxOf(page, 'document.querySelector(\'[data-spray-export-pdf="1"]\')');
    check('the Export PDF button is on the window', Boolean(btn), 'a button [data-spray-export-pdf]', btn ? 'present' : 'absent');
    const file = btn ? await captureDownload(dir, () => clickWith(page, btn.x, btn.y), page) : null;
    const bytes = file ? readFileSync(file) : null;
    check('a file was saved', Boolean(file), 'one new file in the download folder', file ? file.split('/').pop() : 'nothing saved within 60 s');
    check('it is a PDF, named by the one naming law', Boolean(bytes) && bytes.subarray(0, 4).toString() === '%PDF' && /-spraying-\d{4}-\d{4}\.pdf$/.test(file || ''), '%PDF at the head, {project}-spraying-{DDMM-HHMM}.pdf', bytes ? `${bytes.length} bytes, head ${JSON.stringify(bytes.subarray(0, 4).toString())}, ${file.split('/').pop()}` : 'no file');
    const pagesInPdf = bytes ? (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length : 0;
    check('the PDF has the sheets of the page (elements, cards, paint)', pagesInPdf >= 3, 'at least 3 pages', `${pagesInPdf} pages`);
    await shot(page, 'f21-walk-03-exported.png');

    begin('f21c', 'the Spraying button of the bar opens the same window');
    await closeWindow(page);
    check('the window closed by its own Close', (await modalNow(page)) === null, 'no modal', `modal=${await modalNow(page)}`);
    await page.click('nav[aria-label="Main menu"] > div > button', 'Spraying', { exact: true });
    const again = await sprayOpen(page);
    check('the top-level Spraying button opens the Spraying window', again && (await modalNow(page)) === 'spraying', 'modal=spraying', `modal=${await modalNow(page)}`);
    await shot(page, 'f21-walk-04-from-the-bar.png');

    begin('f21d', 'a note typed into a line rides the project');
    const hasSetter = await page.ask(`typeof ${S}.setSprayNote === 'function'`);
    const input = await boxOf(page, `${SPRAY} && ${SPRAY}.querySelector('input[data-spray-note]')`);
    if (!hasSetter) {
      check('the store carries setSprayNote', false, 'a function', 'absent (the T78 F21 projectStore patch is not applied); the note column is read-only');
    } else {
      check('the first line has a note field', Boolean(input), 'an input [data-spray-note]', input ? 'present' : 'absent');
      if (input) {
        const key = await page.ask(`${SPRAY}.querySelector('input[data-spray-note]').getAttribute('data-spray-note')`);
        await clickWith(page, input.x, input.y);
        await page.send('Input.insertText', { text: 'two coats, check the back' });
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await page.sleep(400);
        const stored = await page.ask(`(${S}.project.sprayNotes || {})[${j(key)}] || null`);
        check('the typed note is in project.sprayNotes under the line key', stored === 'two coats, check the back', 'two coats, check the back', `${stored}`);
        await shot(page, 'f21-walk-05-note.png');
      }
    }
    await closeWindow(page);
  } catch (e) {
    check(`${current} walked to its end`, false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    await shot(page, `${current}-walk-failure.png`).catch(() => {});
  }
  await page.close();
}

// === F21E: A VENEER CARCASS SHOWS SET 2 =====================================
async function veneerPage() {
  const page = await open();
  try {
    begin('f21e', 'a job with a veneer carcass shows Set 2');
    const shelf = await herbalHillShelf({ id: 'loc_t78f21v', veneer: true });
    const opened = await openFromShelf(page, BASE, shelf);
    check('the veneer-carcass project opened', opened, 'the room view', opened ? 'opened' : 'not found');
    await menu(page, 'Output', 'Spraying');
    const isOpen = await sprayOpen(page);
    const now = isOpen ? await pageNow(page) : null;
    check('Set 2 is on in the information card', now && now.sets === '12', 'data-spray-sets=12', now ? `data-spray-sets=${now.sets}` : 'no window');
    check('carcass lines are on the list with their own codes', now && now.lines.some((l) => l.rule === 'carcass_set2' && /^1S/.test(l.code)), 'rule 19 lines, 1S + FE / 1S', now ? now.lines.filter((l) => l.rule === 'carcass_set2').map((l) => l.code).filter((v, i, a) => a.indexOf(v) === i).join(' | ') : 'none');
    check('PART C has a paint line for set 2', now && now.paint.length >= 2, 'two paint lines (set 1, set 2)', now ? `${now.paint.length}` : 'none');
    await shot(page, 'f21-walk-06-veneer-set2.png');
    const errs = pageErrors(page);
    check('no runtime exception on the page', errs.length === 0, 'none', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
    await closeWindow(page);
  } catch (e) {
    check(`${current} walked to its end`, false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    await shot(page, `${current}-walk-failure.png`).catch(() => {});
  }
  await page.close();
}

// === RUN ====================================================================
if (['f21a', 'f21b', 'f21c', 'f21d'].some(runs)) await herbalHillPages();
if (runs('f21e')) await veneerPage();
await showroomDown();

// === THE LEDGER =============================================================
const ledger = `${SHOTS}walk-f21.txt`;
const today = new Date().toISOString().slice(0, 10);
const HEAD = [
  `T78 F21 walk, ${today}, HEAD ${head}`,
  `(the app under the mouse: ${process.env.E2E_URL || 'http://127.0.0.1:4173/'}, its build stamp is the first NOTE of f21a)`,
  '',
  'CLAUDE.md T78 F21 (the spray schedule, its law, its page and the paint order),',
  'walked against npx vite preview of the branch (dist/), the hardware served',
  'from the silent showroom. Every gesture is a REAL mouse or key event at a DOM',
  'control\'s centre; the store is only READ. Line grammar:',
  '  PASS|FAIL  <section> | <gesture> | expect: <what was expected> | observed: <what was read>',
  '  NOTE       <section> | <reading> | <value>',
  '  FRAME      <section> | <file>  (the frame is beside this file)',
  'A FAIL is written down, never patched.',
  '',
].join('\n');
const blocks = new Map();
for (const name of new Set(steps.map((s) => s.section))) {
  const mine = steps.filter((s) => s.section === name);
  const top = mine.find((s) => s.header);
  blocks.set(name, [
    `=== ${name} ${top ? top.header : ''}`,
    `NOTE       ${name} | walked at | ${top ? top.at : ''} UTC, HEAD ${head}`,
    ...mine.filter((s) => !s.header).map((s) => {
      if (s.frame) return `FRAME      ${name} | ${s.frame}`;
      if (s.note) return `NOTE       ${name} | ${s.gesture} | ${s.got}`;
      return `${s.ok ? 'PASS' : 'FAIL'}       ${name} | ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
    }),
  ]);
}
const names = [...blocks.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
const counts = names.map((n) => {
  const lines = blocks.get(n);
  return { n, pass: lines.filter((x) => x.startsWith('PASS')).length, fail: lines.filter((x) => x.startsWith('FAIL')).length };
});
const total = counts.reduce((s, c) => ({ pass: s.pass + c.pass, fail: s.fail + c.fail }), { pass: 0, fail: 0 });
const lost = frames.filter((f) => !existsSync(`${SHOTS}${f}`));
writeFileSync(ledger, ascii([
  HEAD,
  ...names.flatMap((n) => [...blocks.get(n), '']),
  ...counts.map((c) => `SECTION ${c.n}: ${c.pass} pass, ${c.fail} fail`),
  `FRAMES (${frames.length}): ${frames.join(', ')}${lost.length ? ` (MISSING ON DISK: ${lost.join(', ')})` : ''}`,
  `F21: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail`,
  '',
].join('\n')));
process.stdout.write(`\nF21: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail\nledger ${ledger}\nframes ${frames.join(', ')}\n`);
