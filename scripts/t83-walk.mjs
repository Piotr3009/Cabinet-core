/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F12, THE WALK (CLAUDE.md T83 PART D)
//
// CLAUDE.md T83 F12: "`scripts/t83-walk.mjs`, real mouse, the built app, ledger
// `verify/t83/walk.txt`, frames `verify/t83/f12-*.png`: (1) Library > Bathroom >
// Mirror cabinet: the cabinet in the room over a vanity, the stiles lit, the
// doors opened (the viewer's Open all), the back clicked and "Mirror on the
// back?" answered Yes, Recess 155 typed, Panels bottom off; the BOM read (LED
// panels 2, mirror m2, glass 15); the fronts sheet with the stiles; (2) Vanity
// 3 drawers: sides 500 deep at the wall, the boxes on the shorter runner, the
// worktop to the wall; Columns 2 and Sinks 1: the gap between the top boxes
// read, the top left drawer opened (box and front together); the basin 250
// from the back, no #48 clash; (3) the base plan of the T81 kitchen: 01, 02,
// DR01 left to right under wall A, the section marker; the Set tab with only
// Fronts ticked, the PDF read back with one page." The owner, 25.10.2026:
// *"teraz zaprojektujmy dokladnie to co masz na rysunku szafka wiszaca"*,
// *"carcas powinien byc do sciany"*, *"przekroj z gory pokazuje jakby logike z
// dolu czyli lustrzane odbicie, sprawdz dokladnie"*, *"daj mozliwosc
// exportowania tylko naprzyklad frontow"*.
//
// THE GESTURES ARE REAL: the library's menu, its groups and rows, the right
// panel's buttons and fields, the canvas toolbar (Open all, BOM, Check), the
// click on the cabinet's back, the double click on a drawer's face, the
// Drawings window's tabs, sheet buttons, check boxes and PDF button are the
// browser's own input pipe (CDP Input.dispatchMouseEvent / dispatchKeyEvent),
// aimed at a control's centre or at a piece's own pixel (scripts/t74-harness.mjs,
// scripts/t75-harness.mjs). THE STAGES that are not what a leg is about (the
// room, the vanity under the mirror cabinet, the T81 kitchen) are put through
// the store's own actions, as scripts/t81-walk.mjs and t82-walk.mjs put theirs.
// The engine and the scene are READ to say what happened (window.__cc). Every
// sheet is read off the glass (`.cc-drawing svg`) and framed from that very
// string at 4 px per paper mm. A FAIL is written down, never patched.
//
// WHERE CLAUDE.md AND THE ENGINE DISAGREE (the slices' reports,
// verify/t83/agents/): the step is written with CLAUDE.md's expectation and it
// FAILS if the page disagrees, with a NOTE carrying the engine's sentence
// (leg 2: "no #48 clash", V2 reports the bowl enters the top boxes; leg 3:
// E1's F10 put wall A at the TOP of a true plan, CLAUDE.md wrote "at the
// bottom", so the step reads "01, 02, DR01 left to right under wall A, as on
// the fronts sheet" and a NOTE says where wall A stands).
//
//   node scripts/t83-walk.mjs --build --serve     build dist/, serve it on E2E_PORT (4173), walk, stop it
//   npx vite build; npx vite preview --port 4173 --strictPort &   then: node scripts/t83-walk.mjs
//   node scripts/t83-walk.mjs --legs 1,3          some legs only (also T83_LEGS=1,3)
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t83-walk.mjs      another server
//
// Chromium: /opt/pw-browsers (CHROME_PATH is set from it when unset); nothing
// is downloaded. Ledger: verify/t83/walk.txt. Frames: verify/t83/f12-*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import {
  mkdirSync, mkdtempSync, writeFileSync, existsSync, readdirSync, copyFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

// === THE ARGUMENTS ==========================================================
const T0 = Date.now();
const REPO = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const LEGS = String(opt('legs', process.env.T83_LEGS || '1,2,3')).split(',').map((s) => s.trim()).filter((s) => /^[1-3]$/.test(s)).map(Number);
const PORT = Number(process.env.E2E_PORT || 4173);
const BASE = process.env.E2E_URL || `http://127.0.0.1:${PORT}/`;
// The frames' page and the exported PDF are the walk's own scratch, never the ledger's.
const SCRATCH = mkdtempSync(join(tmpdir(), 't83-walk-'));
const OUT = opt('out', new URL('../verify/t83/', import.meta.url).pathname).replace(/\/?$/, '/');
mkdirSync(OUT, { recursive: true });
const PX_PER_MM = 4;
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

// Chromium for scripts/cdp.mjs, which reads CHROME_PATH when it is first imported.
if (!process.env.CHROME_PATH) {
  try {
    const dir = readdirSync('/opt/pw-browsers').filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
    const bin = dir && [`/opt/pw-browsers/${dir}/chrome-linux64/chrome`, `/opt/pw-browsers/${dir}/chrome-linux/chrome`].find((p) => existsSync(p));
    if (bin) process.env.CHROME_PATH = bin;
  } catch { /* cdp.mjs says what it tried */ }
}
const {
  open, pro, showroomDown, settleCamera,
} = await import('./t74-harness.mjs');
const {
  key, clickWith, boxOf, until, reachFree,
} = await import('./t75-harness.mjs');
const { launch } = await import('./cdp.mjs');

// === THE BUILD AND THE SERVER (--build, --serve) ============================
let preview = null;
async function served() {
  try { const r = await fetch(BASE); return r.ok; } catch { return false; }
}
if (flag('build')) {
  process.stdout.write('npx vite build ...\n');
  execFileSync('npx', ['vite', 'build'], { cwd: REPO, stdio: 'inherit' });
}
if (flag('serve') && !(await served())) {
  preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: REPO, stdio: 'ignore', detached: true });
  for (let t = 0; t < 120 && !(await served()); t += 1) await new Promise((r) => { setTimeout(r, 500); });
}
const stopPreview = () => { if (preview) { try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* gone */ } preview = null; } };
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopPreview(); process.exit(130); });
if (!(await served())) {
  process.stdout.write(`No app at ${BASE}: build it and serve it (npx vite build; npx vite preview --port ${PORT} --strictPort), or pass --build --serve.\n`);
  stopPreview();
  process.exit(2);
}
const TWALK = Date.now();

// === THE LEDGER =============================================================
const steps = [];
const frames = [];
let LEG = 0;
const ascii = (t) => String(t)
  .replace(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'g'), '-')
  .replace(new RegExp(String.fromCharCode(0xb7), 'g'), '.')
  .replace(new RegExp(String.fromCharCode(0xd7), 'g'), 'x')
  .replace(new RegExp(String.fromCharCode(0xb2), 'g'), '2')
  .replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const push = (kind, F, gesture, expect = '', got = '') => {
  steps.push({
    kind, leg: LEG, F, gesture: ascii(gesture), expect: ascii(expect), got: ascii(got),
  });
  process.stdout.write(`${kind.padEnd(5)} [${LEG}] ${F} ${ascii(gesture)}${kind === 'NOTE' ? ` | ${ascii(got)}` : (kind === 'FRAME' || kind === 'LEG' ? '' : ` | expect: ${ascii(expect)} | observed: ${ascii(got)}`)}\n`);
};
const check = (F, gesture, ok, expect, got) => { push(ok ? 'PASS' : 'FAIL', F, gesture, expect, got); return Boolean(ok); };
const note = (F, gesture, got) => push('NOTE', F, gesture, '', got);
const j = (v) => JSON.stringify(v);
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const modalNow = (page) => page.ask(`${UI}.modal || null`);
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));
const r1 = (v) => Math.round(Number(v) * 10) / 10;
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const near = (a, b, tol = 0.6) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) <= tol;

/**
 * A hook a slice puts on the page (verify/t83/agents/*.md): there, or the step
 * is written down as missing, with the hook and the slice named.
 */
async function need(page, F, slice, what, expr) {
  const ok = await page.ask(`Boolean(${expr})`).catch(() => false);
  if (ok) return true;
  push('FAIL', F, `${what}: not on the page (slice ${slice})`, `the hook ${expr}`, 'absent');
  return false;
}

// === THE FRAMES =============================================================
async function shot(page, name, clip = null) {
  await page.sleep(500);
  await page.screenshot(`${OUT}${name}`, clip);
  frames.push(name);
  push('FRAME', 'F12', name);
}
/** A DOM element framed, clipped with a margin. */
async function domFrame(page, expr, file, pad = 12, scale = 1.5) {
  const r = await page.ask(`(() => { const el = (${expr}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
  if (!r || r.w < 4) return shot(page, file);
  return shot(page, file, {
    x: Math.max(0, Math.round(r.x - pad)), y: Math.max(0, Math.round(r.y - pad)), width: Math.round(r.w + 2 * pad), height: Math.round(Math.min(r.h + 2 * pad, 900)), scale,
  });
}
/** The glass's own SVG, drawn at 4 px per paper mm in a second browser (scripts/t81-walk.mjs). */
let painter = null;
async function frameOf(svg, name) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const wMm = vb ? Number(vb[1]) : 420;
  const hMm = vb ? Number(vb[2]) : 297;
  const W = Math.round(wMm * PX_PER_MM);
  const H = Math.round(hMm * PX_PER_MM);
  if (!painter) painter = await launch({ width: W, height: H, port: 9600 + Math.floor(Math.random() * 300) });
  await painter.send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 1, mobile: false,
  });
  const sized = svg.replace(/width="([\d.]+)mm" height="([\d.]+)mm"/, `width="${W}" height="${H}"`);
  const file = join(SCRATCH, 'frame.html');
  writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff">${sized}</body></html>`);
  await painter.goto(`file://${file}`);
  await painter.sleep(300);
  await painter.screenshot(`${OUT}${name}`, {
    x: 0, y: 0, width: W, height: H, scale: 1,
  });
  frames.push(name);
  push('FRAME', 'F12', `${name} (${wMm} x ${hMm} mm at ${PX_PER_MM} px per mm: ${W} x ${H})`);
}
/** The room camera put in front of some units (wall 1 faces +z), so a frame shows them whole. (scripts/t82-walk.mjs) */
const frameOn = (page, ids, { side = 0.35, up = 0.22, pad = 1.35 } = {}) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three; const ids = ${j(ids)};
  const box = new T.Box3(); v.scene.traverse((o) => { if (!o.isMesh || o.visible === false) return; let a = o; while (a && (!a.userData || a.userData.ccUnitId == null)) a = a.parent;
    if (a && ids.includes(a.userData.ccUnitId)) box.expandByObject(o); });
  if (box.isEmpty()) return null; const c = box.getCenter(new T.Vector3()); const s = box.getSize(new T.Vector3());
  const r = Math.max(s.x, s.y) * 0.5 * ${pad}; const fov = ((v.camera.fov || 45) * Math.PI) / 180; const d = r / Math.tan(fov / 2) + s.z;
  v.camera.position.set(c.x + d * ${side}, c.y + d * ${up}, c.z + d); v.controls.target.copy(c); v.controls.update();
  return { c: c.toArray().map((x) => Math.round(x * 1000)), s: s.toArray().map((x) => Math.round(x * 1000)) }; })()`);

// === THE HANDS (all real events; scripts/t82-walk.mjs) ======================
async function closeModals(page) {
  for (let i = 0; i < 4; i += 1) {
    if (!(await modalNow(page))) return true;
    await key(page, 'Escape');
    if (!(await modalNow(page))) return true;
    const btn = await boxOf(page, '[...document.querySelectorAll(\'[data-modal-shell] button, [role="dialog"] button\')].find((b) => b.offsetParent && (/^(Done|Close|Cancel)$/.test(b.textContent.trim()) || /^Close/.test(b.getAttribute(\'title\') || \'\')))');
    if (btn) await clickWith(page, btn.x, btn.y);
    await page.sleep(400);
  }
  return !(await modalNow(page));
}
/** The top bar: a menu, then its item (both real clicks). (scripts/t80-walk.mjs) */
async function menu(page, top, item) {
  if (await modalNow(page)) await closeModals(page);
  await page.press('nav[aria-label="Main menu"] > div > button', top);
  await page.sleep(300);
  const there = await page.ask(`[...document.querySelectorAll('[role="menuitem"]')].some((b) => b.offsetParent && (b.textContent || '').includes(${j(item)}))`);
  if (!there) { await key(page, 'Escape'); return false; }
  await page.press('[role="menuitem"]', item);
  await page.sleep(900);
  return true;
}
/** Select-all in the focused field: Ctrl+A with the editor's own selectAll command. (scripts/t76-walk.mjs) */
async function selectAll(page) {
  const k = {
    key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k, commands: ['selectAll'] });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(120);
}
/** A number typed into a field: a real click on it, Ctrl+A, the digits, Enter. (scripts/t76-walk.mjs) */
async function typeInto(page, selector, value) {
  const at = await boxOf(page, `[...document.querySelectorAll(${j(selector)})].find((e) => e.offsetParent)`);
  if (!at) return { ok: false, why: `no ${selector} on the screen` };
  await clickWith(page, at.x, at.y);
  await selectAll(page);
  await page.typeText(String(value));
  await key(page, 'Enter');
  await page.sleep(900);
  const shown = await page.ask(`([...document.querySelectorAll(${j(selector)})].find((e) => e.offsetParent) || {}).value ?? null`);
  return { ok: true, shown };
}
/** A right-panel section opened by a real click on its header (when shut). */
async function sectionOpen(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`) || page.has(`[data-section="${title}"]:not([data-open])`);
}
/** The first visible element a selector names, pressed by a real click at its centre; false when none. */
async function pressVisible(page, selector) {
  const at = await boxOf(page, `[...document.querySelectorAll(${j(selector)})].find((e) => e.offsetParent && !e.disabled)`);
  if (!at) return false;
  await clickWith(page, at.x, at.y);
  await page.sleep(900);
  return true;
}

/**
 * The room's own meshes that take no pointer (`raycast={null}`) make three's
 * `intersectObjects` throw inside the shared pixel finder; the walk's finder,
 * never the app, is given a no-op for them before every reach (scripts/t82-walk.mjs).
 */
const safeRays = (page) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return 0; let n = 0;
  v.scene.traverse((o) => { if (typeof o.raycast !== 'function') { o.raycast = () => {}; n += 1; } }); return n; })()`);
async function reach(page, unitId, panelId) {
  await safeRays(page);
  return reachFree(page, unitId, panelId);
}
/** The pieces a hand can click a cabinet by, a leaf first. (scripts/t76-walk.mjs) */
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); if (!r) return []; const pick = [];
  for (const f of [(p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT', (p) => p.role === 'front', (p) => p.id === 'TOP', (p) => p.role === 'side', (p) => p.role === 'back']) {
    for (const p of r.panels) if (p.box && f(p) && !(p.meta && p.meta.frontDecorationParent) && !pick.includes(p.id)) pick.push(p.id);
  }
  return pick.length ? pick : r.panels.filter((p) => p.box).map((p) => p.id); })()`);
const selectedIs = (unitId) => `${UI}.selectedUnitId === ${j(unitId)} && Boolean(document.querySelector('[data-section]'))`;
/** A unit selected by a real click on one of its pieces, its right panel standing. (scripts/t76-walk.mjs) */
async function selectUnit(page, unitId) {
  if (await page.ask(selectedIs(unitId))) return true;
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  for (const pid of (await grabIds(page, unitId)).slice(0, 5)) {
    const at = await reach(page, unitId, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    if (await until(page, selectedIs(unitId), 4000)) return true;
  }
  return false;
}

/**
 * A row of the library through its MENU: Library, the category, then the
 * groups named, then every group on the list, then "Show all" (a real click
 * at each). Returns the unit the click added. (scripts/t82-walk.mjs)
 */
async function addFromLibrary(page, {
  category = 'Kitchen', groups = [], ids = [], label = null,
}) {
  const before = new Set(await page.ask(`${S}.units.map((u) => u.id)`));
  const match = `((e) => { const ids = ${j(ids)}; const re = ${label ? `new RegExp(${j(label.source)}, ${j(label.flags)})` : 'null'};
    return Boolean(e.offsetParent) && e.getAttribute('data-disabled') !== '1' && !e.hasAttribute('data-library-group')
      && (ids.includes(e.getAttribute('data-library-entry')) || Boolean(re && re.test((e.textContent || '').replace(/\\s+/g, ' ').trim()))); })`;
  const found = () => page.ask(`(() => { const e = [...document.querySelectorAll('[data-library-entry]')].find(${match}); return e ? e.getAttribute('data-library-entry') : null; })()`);
  const showing = await page.ask('(() => { const l = document.querySelector(\'[data-library-list="1"]\'); return l ? ((l.parentElement.querySelector(".uppercase") || {}).textContent || "").trim() : null; })()');
  if (!showing || showing.toLowerCase() !== category.toLowerCase()) {
    if (!(await menu(page, 'Library', category))) return { why: `no Library > ${category}` };
  }
  let id = await found();
  const tried = [];
  for (let pass = 0; pass < 2 && !id; pass += 1) {
    const listed = await page.ask('[...document.querySelectorAll(\'[data-library-group]\')].filter((b) => b.offsetParent).map((b) => b.getAttribute(\'data-library-group\'))');
    for (const g of [...new Set([...groups, ...listed])]) {
      if (id) break;
      if (!(await page.has(`[data-library-group="${g}"]`))) continue;
      const openNow = await page.ask(`(document.querySelector('[data-library-group="${g}"]') || { getAttribute: () => null }).getAttribute('aria-expanded') === 'true'`);
      if (!openNow) await page.press(`[data-library-group="${g}"]`);
      tried.push(g);
      id = await found();
      if (!id) {
        const nested = await page.ask(`[...document.querySelectorAll('[data-library-flyout="${g}"] [data-library-group]')].filter((b) => b.offsetParent).map((b) => b.getAttribute('data-library-group'))`);
        for (const n of nested) {
          if (id) break;
          await page.press(`[data-library-group="${n}"]`);
          tried.push(`${g}/${n}`);
          id = await found();
        }
      }
      if (!id && await page.ask(`(document.querySelector('[data-library-group="${g}"]') || { getAttribute: () => null }).getAttribute('aria-expanded') === 'true'`)) await page.press(`[data-library-group="${g}"]`);
    }
    if (!id && pass === 0 && await page.has('[data-library-show-all="1"]')) { await page.press('[data-library-show-all="1"]'); tried.push('Show all'); } else break;
  }
  if (!id) return { why: `no row ${label ? label.source : ids.join('/')} (groups tried: ${tried.join(', ') || 'none'})` };
  await page.press(`[data-library-entry="${id}"]`);
  await page.sleep(1500);
  const added = await page.ask(`${S}.units.filter((u) => !${j([...before])}.includes(u.id)).map((u) => ({ id: u.id, type: u.type, num: u.params.unit_num, x: u.position.x_mm, wall: u.position.wall, w: u.params.width, h: u.params.height, d: u.params.depth, mount: u.params.mount_height ?? null }))`);
  return { entry: id, unit: added[0] || null, added };
}
async function closeLibrary(page) {
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
}

/** A canvas toolbar button by an expression, a real click at its centre. (scripts/t80-walk.mjs) */
async function toolbar(page, expr) {
  const at = await boxOf(page, expr);
  if (!at) return false;
  await clickWith(page, at.x, at.y);
  await page.sleep(900);
  return true;
}
const OPEN_ALL = '[...document.querySelectorAll(\'[data-open-all-doors="1"]\')].find((b) => b.offsetParent && !b.disabled)';
async function checkOpen(page) {
  if (!(await page.has('[data-check-panel]'))) await toolbar(page, '[...document.querySelectorAll(\'[data-check-button]\')].find((b) => b.offsetParent)');
  await until(page, 'Boolean(document.querySelector(\'[data-check-panel]\'))', 5000);
  await page.sleep(800);
  return page.ask(`[...document.querySelectorAll('[data-check-finding]')].map((li) => ({ n: Number(li.getAttribute('data-check-finding')), level: li.getAttribute('data-check-level'), text: li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 400) }))`);
}
async function checkClose(page) {
  if (!(await page.has('[data-check-panel]'))) return;
  const x = await boxOf(page, '[...document.querySelectorAll(\'[data-check-panel] button[title="Close"]\')].find((b) => b.offsetParent)');
  if (x) await clickWith(page, x.x, x.y); else await page.press('[data-check-button]');
  await until(page, '!document.querySelector(\'[data-check-panel]\')', 3000);
}
/** The BOM opened by the toolbar's own button, then its Order tab (real clicks); every order line, its words and its quantity. */
async function bomOrderLines(page) {
  await toolbar(page, '[...document.querySelectorAll(\'button[title="Bill of materials"]\')].find((b) => b.offsetParent)');
  await until(page, `${UI}.bomOpen === true`, 5000);
  await page.sleep(1000);
  if (await page.has('[data-bom-order-tab="1"]')) await page.press('[data-bom-order-tab="1"]');
  await until(page, 'Boolean(document.querySelector(\'[data-bom-order="1"]\'))', 5000);
  await page.sleep(800);
  return page.ask(`[...document.querySelectorAll('[data-bom-order="1"] [data-bom-line]')].map((li) => { const s = li.querySelectorAll('span');
    const q = ((s[1] || {}).textContent || '').trim(); const m = q.replace(/,/g, '').match(/-?\\d+(?:\\.\\d+)?/);
    return { role: li.getAttribute('data-bom-line'), label: ((s[0] || {}).textContent || '').trim(), qty: m ? Number(m[0]) : null, unit: q.replace(/^-?[\\d.,]+\\s*/, ''), spec: ((s[2] || {}).textContent || '').trim() }; })`);
}
/** The BOM shut by its own x. (scripts/t80-walk.mjs) */
async function bomClose(page) {
  if (!(await page.ask(`${UI}.bomOpen === true`))) return;
  await toolbar(page, `(() => { const a = [...document.querySelectorAll('aside, div')].find((x) => x.offsetParent && /BILL OF MATERIALS/i.test((x.firstElementChild || x).textContent || '') && x.getBoundingClientRect().width > 300 && x.getBoundingClientRect().width < 800);
    return a ? [...a.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim() === String.fromCharCode(0xd7)) : null; })()`);
  await until(page, `${UI}.bomOpen !== true`, 4000);
}

/** Output > Drawings > Preview..., then the window's Set tab (real clicks). (scripts/t81-walk.mjs) */
async function openSet(page) {
  const opened = await menu(page, 'Output', 'Drawings');
  if (opened && await page.ask('[...document.querySelectorAll(\'[role="menuitem"]\')].some((b) => b.offsetParent && /Preview/.test(b.textContent))')) {
    await page.press('[role="menuitem"]', 'Preview');
  }
  await until(page, 'Boolean(document.querySelector(\'[data-drawing-kind-tab="walls"]\'))', 8000);
  if (await page.has('[data-drawing-kind-tab="walls"]')) await page.press('[data-drawing-kind-tab="walls"]');
  await until(page, 'document.querySelectorAll(\'[data-wall-sheet]\').length > 0', 20000);
  await page.sleep(1500);
  return page.ask('[...document.querySelectorAll(\'[data-wall-sheet]\')].map((b) => b.getAttribute(\'data-wall-sheet\'))');
}
/** One sheet's button pressed (a real click); the SVG the window then shows. */
async function sheetOnGlass(page, name) {
  if (!name) return '';
  await page.press(`[data-wall-sheet=${j(name)}]`);
  await page.sleep(1200);
  await until(page, 'Boolean(document.querySelector(\'.cc-drawing svg\'))', 8000);
  return page.ask('(document.querySelector(\'.cc-drawing svg\') || { outerHTML: \'\' }).outerHTML');
}

// === WHAT THE WALK READS ====================================================
const unitRow = (page, id) => page.ask(`(() => { const u = ${S}.units.find((x) => x.id === ${j(id)}); if (!u) return null;
  return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall, x: u.position.x_mm, w: u.params.width, h: u.params.height, d: u.params.depth,
    mount: u.params.mount_height ?? null, wallGap: u.params.wall_gap ?? null, recess: u.params.recess_mm ?? null, columns: u.params.columns ?? null, sinks: u.params.sinks ?? null,
    mirror: u.params.mirror || null }; })()`);
/** The engine's parts of a unit, as the page's store cuts them. */
const partsOf = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); if (!r) return null;
  return r.panels.map((p) => ({ id: p.id, part: p.part, role: p.role, w: p.w, h: p.h, t: p.thickness, box: p.box || null,
    meta: { drawer: p.meta && p.meta.drawer, column: p.meta && p.meta.column, mc: p.meta && p.meta.mirrorCabinet ? p.meta.mirrorCabinet.role : null, glass: Boolean(p.meta && p.meta.glassShelf) } })); })()`);
/**
 * Every mesh of a unit in the room, its box in the PLAN's millimetres (x along wall 1 from
 * the room's corner, y up from the floor, z out of wall 1), by its piece id, and the basins
 * by their own mark (Basin.jsx `ccBasin`, with `ccBasinMm`). (scripts/t82-walk.mjs)
 */
const sceneOf = (page, unitId) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  const cs = (${S}.project.room || {}).corners || []; const xs = cs.map((c) => c.x); const ys = cs.map((c) => c.y);
  const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0; const cz = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
  const out = {}; const basins = []; const seen = new Set();
  const hidden = (o) => { for (let a = o; a; a = a.parent) if (a.visible === false) return true; return false; };
  v.scene.updateMatrixWorld(true);
  v.scene.traverse((o) => { if (!o.isMesh || hidden(o)) return; let a = o; while (a && (!a.userData || a.userData.ccUnitId == null)) a = a.parent;
    let basin = null; for (let b = o; b; b = b.parent) if (b.userData && b.userData.ccBasin != null) { basin = b; break; }
    const mine = (a && a.userData.ccUnitId === ${j(unitId)}) || (basin && basin.userData.ccBasin === ${j(unitId)});
    if (!mine) return;
    if (basin && !seen.has(basin.uuid)) { seen.add(basin.uuid); basins.push(basin.userData.ccBasinMm || null); }
    const k = basin ? 'BASIN-' + basin.uuid.slice(0, 8) : (o.userData && o.userData.ccPanelId);
    if (!k) return; const b = new T.Box3().setFromObject(o);
    const plan = (q) => [q.x * 1000 + cx, q.y * 1000, q.z * 1000 + cz]; const mn = plan(b.min); const mx = plan(b.max); const p = out[k];
    out[k] = p ? { min: p.min.map((x, i) => Math.min(x, mn[i])), max: p.max.map((x, i) => Math.max(x, mx[i])) } : { min: mn, max: mx }; });
  for (const k of Object.keys(out)) { out[k].min = out[k].min.map((x) => Math.round(x * 100) / 100); out[k].max = out[k].max.map((x) => Math.round(x * 100) / 100); out[k].size = out[k].max.map((x, i) => Math.round((x - out[k].min[i]) * 100) / 100); }
  return { pieces: out, basins }; })()`);

/**
 * The mirror cabinet in the room (3d/MirrorCabinet.jsx, 3d/mirrorCabinetRoom.js): the group's own
 * record (`ccMirrorRoom`), each door's board and its mirror (`ccDoorMirror`, a mesh in the leaf's
 * swing group) in plan mm, the LED stiles' boxes and their light, the back's panes (`ccMirrorBackPane`).
 */
const mirrorRoom = (page, unitId) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  const cs = (${S}.project.room || {}).corners || []; const xs = cs.map((c) => c.x); const ys = cs.map((c) => c.y);
  const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0; const cz = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
  const R = (n) => Math.round(n * 100) / 100;
  const plan = (o) => { const b = new T.Box3().setFromObject(o); return { min: [R(b.min.x * 1000 + cx), R(b.min.y * 1000), R(b.min.z * 1000 + cz)], max: [R(b.max.x * 1000 + cx), R(b.max.y * 1000), R(b.max.z * 1000 + cz)] }; };
  v.scene.updateMatrixWorld(true);
  let grp = null; let unit = null;
  v.scene.traverse((o) => { if (!grp && o.userData && o.userData.ccMirrorCabinet === ${j(unitId)}) grp = o; if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return { group: Boolean(grp), info: grp ? grp.userData.ccMirrorRoom : null };
  const isDoor = (m) => m.isMesh && m.userData && /-F\\d+$/.test(String(m.userData.ccPanelId || ''));
  const mirrors = [];
  unit.traverse((o) => { if (!o.isMesh || !o.userData || o.userData.ccDoorMirror == null) return; let leaf = null;
    for (let a = o.parent; a && !leaf; a = a.parent) { a.traverse((m) => { if (!leaf && isDoor(m)) leaf = m.userData.ccPanelId; }); if (a === unit) break; }
    mirrors.push({ leaf, face: o.userData.ccDoorMirror, box: plan(o) }); });
  const stiles = []; unit.traverse((o) => { if (o.isMesh && o.userData && /^STILE-/.test(String(o.userData.ccPanelId || ''))) { const mt = Array.isArray(o.material) ? o.material[0] : o.material;
    stiles.push({ id: o.userData.ccPanelId, box: plan(o), emissive: mt && mt.emissive ? '#' + mt.emissive.getHexString() : null, intensity: mt ? mt.emissiveIntensity : null }); } });
  const panes = []; v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccMirrorBackPane) { let a = o; while (a && a !== grp) a = a.parent; if (a === grp) panes.push({ id: o.userData.ccMirrorBackPane, box: plan(o) }); } });
  const strips = []; v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccMirrorLed) { let a = o; while (a && a !== grp) a = a.parent; if (a === grp) { const mt = o.material; strips.push({ kind: o.userData.ccMirrorLed, intensity: mt ? mt.emissiveIntensity : null }); } } });
  return { group: Boolean(grp), info: grp ? grp.userData.ccMirrorRoom : null, mirrors, stiles, panes, strips }; })()`);

// === WHAT A SHEET SAYS, READ OFF ITS SVG (scripts/t81-walk.mjs, t82-walk.mjs) ===
const num = (tag, attr) => Number((tag.match(new RegExp(`\\b${attr}="(-?[\\d.]+)"`)) || [])[1]);
const tagsOn = (svg, kind, layer, { legend = false } = {}) => [...String(svg).matchAll(new RegExp(`<${kind}\\b[^>]*data-layer="${layer}"[^>]*>`, 'g'))]
  .map((m) => m[0]).filter((t) => legend || !/data-cc="(legend|key-plan)"/.test(t));
const anyOn = (svg, layer) => ['line', 'rect', 'path', 'circle', 'text', 'image'].reduce((n, k) => n + tagsOn(svg, k, layer).length, 0);
const rectsOn = (svg, layer) => tagsOn(svg, 'rect', layer).filter((t) => !/data-cc=/.test(t))
  .map((t) => ({
    x: num(t, 'x'), y: num(t, 'y'), w: num(t, 'width'), h: num(t, 'height'),
  }));
const linesOf = (svg, layer, opts) => tagsOn(svg, 'line', layer, opts).map((t) => ({
  x1: num(t, 'x1'), y1: num(t, 'y1'), x2: num(t, 'x2'), y2: num(t, 'y2'), dashed: /stroke-dasharray/.test(t), tag: t,
}));
const textsOn = (svg, layer) => [...String(svg).matchAll(new RegExp(`<text\\b([^>]*data-layer="${layer}"[^>]*)>([^<]*)</text>`, 'g'))]
  .filter((m) => !/data-cc="(legend|key-plan)"/.test(m[1])).map((m) => ({ x: num(m[1], 'x'), y: num(m[1], 'y'), text: m[2].trim(), tag: m[1] }));
/** Closed paths of a layer with their points (an arrowhead is three). */
const pathsOn = (svg, layer) => tagsOn(svg, 'path', layer).map((t) => {
  const d = (t.match(/\bd="([^"]*)"/) || [])[1] || '';
  const pts = [...d.matchAll(/[ML]\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  return { pts, closed: /Z\s*$/.test(d.trim()), tag: t };
});
/** The sheet's scale, from the first text that says one ("1:15 @ A3"). */
const sheetScale = (svg) => {
  for (const m of String(svg).matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)) {
    const s = m[1].match(/\b1\s*:\s*(\d{1,3})\b/);
    if (s) return Number(s[1]);
  }
  return null;
};
/**
 * The closed axis-aligned rectangles a layer's lines make (a board the elevation draws as
 * four lines: a panel round, a LED stile), in paper mm.
 */
function rectsFromLines(lines, tol = 0.02) {
  const H = lines.filter((l) => Math.abs(l.y1 - l.y2) < tol).map((l) => ({ y: l.y1, a: Math.min(l.x1, l.x2), b: Math.max(l.x1, l.x2) }));
  const V = lines.filter((l) => Math.abs(l.x1 - l.x2) < tol).map((l) => ({ x: l.x1, a: Math.min(l.y1, l.y2), b: Math.max(l.y1, l.y2) }));
  const out = [];
  const seen = new Set();
  for (let i = 0; i < H.length; i += 1) {
    for (let k = 0; k < H.length; k += 1) {
      const p = H[i]; const q = H[k];
      if (!(q.y > p.y + tol) || Math.abs(p.a - q.a) > tol || Math.abs(p.b - q.b) > tol) continue;
      const side = (x) => V.some((v) => Math.abs(v.x - x) < tol && Math.abs(v.a - p.y) < tol && Math.abs(v.b - q.y) < tol);
      if (!side(p.a) || !side(p.b)) continue;
      const r = {
        x: r2(p.a), y: r2(p.y), w: r2(p.b - p.a), h: r2(q.y - p.y),
      };
      const kx = `${r.x},${r.y},${r.w},${r.h}`;
      if (!seen.has(kx)) { seen.add(kx); out.push(r); }
    }
  }
  return out;
}

// === THE STAGES (the store's own actions: not what a leg is about) ==========
const stageRoom = (page, w, d, h) => page.ask(`(() => { ${S}.setRoom({ corners: [{ x: 0, y: 0 }, { x: ${w}, y: 0 }, { x: ${w}, y: ${d} }, { x: 0, y: ${d} }], height: ${h} }); return true; })()`);
/** The T81 kitchen (scripts/t81-kitchen.mjs, through the page's store), as scripts/t81-walk.mjs stages it. (scripts/t82-walk.mjs) */
async function stageT81Kitchen(page, { inframe = true, knob = true } = {}) {
  const add = async (type, x) => page.ask(`(() => { const r = ${S}.addUnit(${j(type)}, { wall: 0, x: ${x} }); return r && r.id; })()`);
  await stageRoom(page, 6000, 3000, 2500);
  const ids = {
    a: await add('BUD', 1000), b: await add('BUD', 1600), c: await add('BUDR2', 2400), w: await add('WUD', 1000),
  };
  await page.sleep(800);
  for (const [id, width] of [[ids.a, 600], [ids.b, 800], [ids.c, 500], [ids.w, 600]]) await page.ask(`${S}.updateUnitParams(${j(id)}, { width: ${width} })`);
  await page.ask(`${S}.setDoors(${j(ids.a)}, { count: 1, hinge: 'L' })`);
  await page.ask(`${S}.setDoors(${j(ids.b)}, { count: 2, hinge: 'L' })`);
  await page.ask(`${S}.setDoors(${j(ids.w)}, { count: 1, hinge: 'L' })`);
  await page.ask(`${S}.addEndPanel(${j(ids.a)}, { side: 'L', thickness: 18 })`);
  await page.ask(`${S}.addPlinth(${j(ids.a)})`);
  await page.ask(`${S}.addWorktop(${j([ids.a, ids.b, ids.c])})`);
  await page.ask(`${S}.setFrontType('f1', { source: 'spray', material_id: 'generic-22' })`);
  await page.ask(`${S}.setFrontColour({ hex: '#7b8f7a', name: 'F&B Card Room Green', system: 'F&B' }, 'f1')`);
  await page.ask(`${S}.setDesign({ sheen: 30 })`);
  if (knob) await page.ask(`${S}.setProjectHandle({ type: 'knob' })`);
  if (inframe) await page.ask(`${S}.setDesign({ inframe: true })`);
  await page.sleep(1500);
  return ids;
}

/** Wait until the room's piece boxes stop changing (a door's swing, a drawer's slide). */
async function settleScene(page, unitId, ms = 8000) {
  let last = j(await sceneOf(page, unitId));
  for (let t = 0; t < ms / 400; t += 1) {
    await page.sleep(400);
    const now = j(await sceneOf(page, unitId));
    if (now === last) return JSON.parse(now);
    last = now;
  }
  return JSON.parse(last);
}

// === LEG 1 . THE MIRROR CABINET (F1 to F5) ==================================
async function leg1(page) {
  await stageRoom(page, 5000, 3000, 2500);
  // THE STAGE: the vanity the cabinet hangs over (leg 2 walks the vanity's own row).
  const vanityId = await page.ask(`(() => { const r = ${S}.addUnit('VANITY3', { wall: 0, x: 2050 }); return r && r.id; })()`);
  await page.sleep(1500);
  const van = await unitRow(page, vanityId);
  note('F12', 'THE STAGE: a 5000 x 3000 room 2500 high, a VANITY3 on wall A at x 2050 (the store)', j({ id: van && van.id, num: van && van.num, x: van && van.x, w: van && van.w, h: van && van.h, d: van && van.d }));
  await frameOn(page, [vanityId]);
  await settleCamera(page);
  const sel = await selectUnit(page, vanityId);
  note('F12', 'the vanity selected by a real click on its own pixel, so the library row hangs the new unit over it (LibraryPanel: beside the selection)', String(sel));

  // LIBRARY > BATHROOM > MIRROR CABINET (real clicks).
  const mc = await addFromLibrary(page, {
    category: 'Kitchen', groups: ['bathroom'], ids: ['mirror-cabinet'], label: /^Mirror cabinet/i,
  });
  if (!mc.unit) { push('FAIL', 'F5', 'Library > Kitchen > Bathroom > "Mirror cabinet" (slice M3, library.js row mirror-cabinet)', 'a MIRROR_CABINET in the room', mc.why || 'no unit'); return; }
  await closeLibrary(page);
  await page.sleep(1500);
  const id = mc.unit.id;
  const vNow = await unitRow(page, vanityId);
  const centred = near(mc.unit.x + mc.unit.w / 2, vNow.x + vNow.w / 2, 1);
  check('F5', `Library > Kitchen > Bathroom > "Mirror cabinet" (row ${mc.entry}, a real click): a MIRROR_CABINET 1350 x 1100 x 215 at 1250 off the floor, over the vanity`,
    mc.unit.type === 'MIRROR_CABINET' && mc.unit.w === 1350 && mc.unit.h === 1100 && mc.unit.d === 215 && mc.unit.mount === 1250 && mc.unit.wall === vNow.wall && centred,
    'MIRROR_CABINET 1350 x 1100 x 215, mount 1250, centred over VU01', j({ unit: mc.unit, vanity: [vNow.num, vNow.x, vNow.w], centres: [mc.unit.x + mc.unit.w / 2, vNow.x + vNow.w / 2] }));

  // THE KIT, as the page's engine cuts it (M1).
  const parts = await partsOf(page, id);
  const role = (r) => parts.filter((p) => p.meta.mc === r);
  const doors = role('door');
  const stiles = role('stile');
  const panels = role('panel');
  const glass = parts.filter((p) => p.meta.glass);
  check('F2', 'the engine\'s kit: three mirror doors 327 / 477 / 327 x 937 (330 / 480 / 330 less the gaps, the 100 box and the 30 panels), two LED stiles 75 x 22, four panels round 30 reaching 237 deep, fifteen glass shelves 6, the bottom box, the back',
    doors.length === 3 && j(doors.map((d) => d.w)) === j([327, 477, 327]) && doors.every((d) => d.h === 937 && d.box && near(d.box.d, 22, 0.01))
      && stiles.length === 2 && stiles.every((s) => s.w === 75 && s.box && near(s.box.d, 22, 0.01)) && panels.length === 4 && panels.every((p) => p.t === 30 && p.box && near(p.box.d, 237, 0.01))
      && glass.length === 15 && glass.every((g) => g.t === 6) && parts.some((p) => p.id === 'BOX-TOP') && parts.some((p) => p.id === 'BOX-FRONT') && parts.some((p) => p.id === 'BACK'),
    'doors 327/477/327 x 937 x 22, stiles 75 x 22, panels 30 x 237 deep, 15 glass 6, BOX-TOP, BOX-FRONT, BACK',
    j({
      doors: doors.map((d) => `${d.id} ${d.w}x${d.h}x${d.box && d.box.d}`), stiles: stiles.map((s) => `${s.id} ${s.w}x${s.h}x${s.box && s.box.d} ${s.role}`), panels: panels.map((p) => `${p.id} t${p.t} d${p.box && p.box.d}`), glass: glass.length, box: parts.filter((p) => /^BOX-/.test(p.id)).map((p) => p.id),
    }));

  // THE ROOM (M2): the group, the solids by id, the door 18 + 4, the stiles flush and lit.
  await key(page, 'Escape');
  await frameOn(page, [id, vanityId], { side: 0.3, up: 0.1, pad: 1.25 });
  await settleCamera(page);
  const sc0 = await settleScene(page, id);
  const room0 = await mirrorRoom(page, id);
  if (!(await need(page, 'F3', 'M2', 'the room\'s mirror cabinet group (userData ccMirrorCabinet, ccMirrorRoom)', `(() => { let f = false; window.__cc.views.room.scene.traverse((o) => { if (o.userData && o.userData.ccMirrorCabinet === ${j(id)}) f = true; }); return f; })()`))) return;
  const drawnIds = Object.keys(sc0.pieces);
  const kitIds = parts.filter((p) => p.box).map((p) => p.id);
  check('F3', 'the room draws the kit: every part the engine cuts is a solid in the room by its own id', kitIds.every((k) => drawnIds.includes(k)), `${kitIds.length} parts drawn`, j({ missing: kitIds.filter((k) => !drawnIds.includes(k)), drawn: drawnIds.length }));
  const doorDepth = (doorId) => {
    const b = sc0.pieces[doorId]; const m = (room0.mirrors || []).find((x) => x.leaf === doorId);
    return b && m ? r2(Math.max(b.max[2], m.box.max[2]) - Math.min(b.min[2], m.box.min[2])) : null;
  };
  const doorZ = doors.map((d) => ({ id: d.id, board: sc0.pieces[d.id] && sc0.pieces[d.id].size[2], with: doorDepth(d.id), face: ((room0.mirrors || []).find((x) => x.leaf === d.id) || { box: { max: [] } }).box.max[2] }));
  check('F3', 'each mirror door in the room is its board 18 and its mirror 4: 22 thick', doorZ.length === 3 && doorZ.every((d) => near(d.board, 18, 0.05) && near(d.with, 22, 0.05)), 'board 18, door 22', j(doorZ));
  const stileFaces = (room0.stiles || []).map((s) => ({ id: s.id, face: s.box.max[2], w: r2(s.box.max[0] - s.box.min[0]), d: r2(s.box.max[2] - s.box.min[2]) }));
  const faceMm = doorZ.length ? doorZ[0].face : null;
  check('F3', 'the LED stiles 75 wide, 22 deep, their face at the mirror\'s face (*"na rowno z drzwiami, nie wcisniete"*: z equal to 0.01)', stileFaces.length === 2 && stileFaces.every((s) => near(s.w, 75, 0.05) && near(s.d, 22, 0.05) && near(s.face, faceMm, 0.01)) && doorZ.every((d) => near(d.face, faceMm, 0.01)),
    `stile face z = mirror face z ${faceMm}`, j({ stiles: stileFaces, mirrorFaces: doorZ.map((d) => d.face) }));
  const lit = room0.info && room0.info.lit;
  const design = await page.ask(`(() => { const d = ${S}.project.design || {}; return d.lighting ?? null; })()`);
  check('F3', 'the stiles lit: an emissive warm white 4000 K on both LED stiles (the room\'s ccMirrorRoom: stiles 2)', room0.info && room0.info.stiles === 2 && (room0.stiles || []).length === 2 && room0.stiles.every((s) => s.emissive && s.emissive !== '#000000' && Number(s.intensity) > 0),
    'two stiles, emissive, intensity > 0', j({ info: room0.info, stiles: (room0.stiles || []).map((s) => [s.id, s.emissive, s.intensity]) }));
  note('F3', 'the stiles glow full only with the project\'s light switch on (mirrorLedGlow: on, the house emissive times the boost; off, the whisper): what the room reads now', j({ lit, switch: design, intensity: (room0.stiles || []).map((s) => s.intensity), strips: room0.strips }));
  const wt = await page.ask(`${S}.worktopsOf().filter((w) => (w.unitIds || []).includes(${j(vanityId)})).map((w) => ({ y: w.geometry && w.geometry.y, h: w.geometry && w.geometry.h }))`);
  const bottomY = Math.min(...Object.values(sc0.pieces).map((b) => b.min[1]));
  note('F12', 'the cabinet over the vanity: its underside off the floor, the vanity\'s worktop top, the gap between (CLAUDE.md: 1250 off the floor, 400 over the top on the architect\'s drawing)', j({ underside: bottomY, worktopTop: wt[0] ? r1(Number(wt[0].y) + Number(wt[0].h)) : null, gap: wt[0] ? r1(bottomY - (Number(wt[0].y) + Number(wt[0].h))) : null }));
  await shot(page, 'f12-01-mirror-closed.png');

  // THE VIEWER'S OPEN ALL (the canvas toolbar, a real click): the three doors swing open.
  const pressed = await toolbar(page, OPEN_ALL);
  const sc1 = await settleScene(page, id);
  const openState = await page.ask(`${UI}.openFronts[${j(id)}] || {}`);
  const swung = doors.map((d) => ({ id: d.id, open: openState[d.id] ?? null, z: sc1.pieces[d.id] && sc1.pieces[d.id].size[2], x: sc1.pieces[d.id] && sc1.pieces[d.id].size[0] }));
  check('F3', 'the viewer\'s Open all (a real click): the three mirror doors swing open', pressed && swung.every((d) => Number(d.open) >= 0.99 && d.z > 150), 'openFronts 1 and each door turned out of its plane (z > 150)', j({ pressed, doors: swung }));
  await frameOn(page, [id], { side: 0.45, up: 0.15, pad: 1.4 });
  await settleCamera(page);
  await shot(page, 'f12-02-mirror-open.png');

  // THE BACK CLICKED (a real click on the BACK's own pixel, the doors open): "Mirror on the back?", Yes.
  await frameOn(page, [id], { side: 0.04, up: 0.03, pad: 1.15 });
  await settleCamera(page);
  let asked = false;
  let at = null;
  for (let attempt = 0; attempt < 2 && !asked; attempt += 1) {
    at = await reach(page, id, 'BACK');
    if (!at) break;
    await clickWith(page, at.x, at.y);
    asked = Boolean(await until(page, `${UI}.modal === 'mirror-back' && Boolean([...document.querySelectorAll('[data-testid="mirror-back-ask"]')].find((e) => e.offsetParent))`, 4000));
  }
  const question = await page.ask('(([...document.querySelectorAll(\'[data-testid="mirror-back-question"]\')].find((e) => e.offsetParent) || {}).textContent || \'\').trim()');
  check('F3', 'the cabinet\'s BACK clicked (a real click on its pixel, *"klikasz na plecy i wyskakuje ci opcja chcesz lustro na plecach?"*): the window asks "Mirror on the back?"', asked && question === 'Mirror on the back?',
    '"Mirror on the back?" (mirror-back-ask)', j({ at, modal: await modalNow(page), question, selected: await page.ask(`${UI}.selectedUnitId`) }));
  // The window and the cabinet behind it: the canvas clipped round the modal's own shell.
  if (asked) await domFrame(page, '(([...document.querySelectorAll(\'[data-testid="mirror-back-ask"]\')].find((e) => e.offsetParent)) || document.body).closest(\'[data-modal-shell]\')', 'f12-03-mirror-back-ask.png', 160, 1.25);
  else await shot(page, 'f12-03-mirror-back-ask.png');
  if (asked) {
    await page.press('[data-testid="mirror-back-yes"]');
    await page.sleep(1500);
  }
  const u1 = await unitRow(page, id);
  const room1 = await mirrorRoom(page, id);
  const backPanes = await page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const b = r && r.panels.find((p) => p.id === 'BACK'); return b && b.meta && b.meta.mirrorBack ? b.meta.mirrorBack.panes.map((pn) => [pn.bay, pn.w, pn.h]) : []; })()`);
  check('F3', 'Yes (a real click): params.mirror.mirror_back true, the window shut, a mirror pane a bay on the back\'s inside face in the room (ccMirrorBackPane)', asked && u1.mirror && u1.mirror.mirror_back === true && !(await modalNow(page)) && backPanes.length === 3 && (room1.panes || []).length === 3 && room1.info && room1.info.panes === 3,
    'mirror_back true, 3 panes in the engine and the room', j({ mirror_back: u1.mirror && u1.mirror.mirror_back, modal: await modalNow(page), engine: backPanes, room: (room1.panes || []).map((p) => p.id), info: room1.info && room1.info.panes }));

  // The doors shut again (Open all, a real click) so the recess is read on a closed cabinet.
  if (pressed) await toolbar(page, OPEN_ALL);
  const sc2 = await settleScene(page, id);

  // RECESS 155 TYPED (the MIRROR CABINET section, a real click, Ctrl+A, the digits, Enter).
  await selectUnit(page, id);
  if (!(await need(page, 'F5', 'M3', 'the right panel\'s MIRROR CABINET section', 'document.querySelector(\'[data-section="Mirror cabinet"]\')'))) return;
  await sectionOpen(page, 'Mirror cabinet');
  if (await need(page, 'F5', 'M3', 'the Recess field', '[...document.querySelectorAll(\'[data-mirror-recess="1"]\')].find((e) => e.offsetParent)')) {
    const typed = await typeInto(page, '[data-mirror-recess="1"]', 155);
    const rec = await page.ask(`((${S}.unitResult(${j(id)}).derived || {}).mirror || {}).recess || null`);
    const sc3 = await settleScene(page, id);
    const room3 = await mirrorRoom(page, id);
    const dz = ['BACK', 'PANEL-L', 'BUL', 'MC01-F2', 'STILE-1'].map((k) => [k, sc2.pieces[k] && sc3.pieces[k] ? r2(sc3.pieces[k].min[2] - sc2.pieces[k].min[2]) : null]);
    const u3 = await unitRow(page, id);
    check('F5', 'Recess typed 155 (the MIRROR CABINET section, a real click, Ctrl+A, the digits, Enter): the engine stands the carcass 60 proud and the mirror face 82 (depth - recess)', typed.shown === '155' && u3.recess === 155 && rec && rec.mm === 155 && rec.proudMm === 60 && rec.faceProudMm === 82,
      'recess_mm 155, proudMm 60, faceProudMm 82', j({ field: typed.shown, recess_mm: u3.recess, derived: rec }));
    check('F3', 'the room moves the whole cabinet 155 into the wall: every solid 155 nearer the wall, ccMirrorRoom.recessMm 155', room3.info && room3.info.recessMm === 155 && dz.every(([, d]) => near(d, -155, 0.05)),
      'each piece z - 155, recessMm 155', j({ dz, info: room3.info }));
    await key(page, 'Escape');
    await frameOn(page, [id], { side: 1.1, up: 0.15, pad: 1.3 });
    await settleCamera(page);
    await shot(page, 'f12-04-mirror-recess.png');
  }

  // PANELS: BOTTOM OFF (a real click on the panel chip).
  await selectUnit(page, id);
  await sectionOpen(page, 'Mirror cabinet');
  if (await need(page, 'F5', 'M3', 'the Panels chips', '[...document.querySelectorAll(\'[data-mirror-panel="bottom"]\')].find((e) => e.offsetParent)')) {
    await pressVisible(page, '[data-mirror-panel="bottom"]');
    await page.sleep(800);
    const u4 = await unitRow(page, id);
    const p4 = await partsOf(page, id);
    const sc4 = await settleScene(page, id);
    const chips = await page.ask('(([...document.querySelectorAll(\'[data-mirror-panels]\')].find((e) => e.offsetParent)) || { getAttribute: () => null }).getAttribute(\'data-mirror-panels\')');
    check('F5', 'Panels: bottom off (a real click): params.mirror.panels.bottom false, no PANEL-BOTTOM cut or drawn, L, R and top kept', u4.mirror && u4.mirror.panels && u4.mirror.panels.bottom === false && !p4.some((p) => p.id === 'PANEL-BOTTOM') && !sc4.pieces['PANEL-BOTTOM'] && ['PANEL-L', 'PANEL-R', 'PANEL-TOP'].every((k) => p4.some((p) => p.id === k)),
      'panels L R top, no PANEL-BOTTOM', j({ panels: u4.mirror && u4.mirror.panels, chips, parts: p4.filter((p) => /^PANEL-/.test(p.id)).map((p) => p.id), drawn: Object.keys(sc4.pieces).filter((k) => /^PANEL-/.test(k)) }));
  }

  // THE BOM (the canvas toolbar's BOM, its Order tab; real clicks).
  await key(page, 'Escape');
  const lines = await bomOrderLines(page);
  const mine = (r) => lines.filter((l) => l.role === r);
  const led = mine('mirror_led_panel');
  const mir = mine('mirror_m2');
  const gl = mine('mirror_glass_shelf');
  const area = await page.ask(`((${S}.unitResult(${j(id)}).derived || {}).mirror || {}).mirrorArea || null`);
  const wantM2 = area ? Math.round(((Number(area.doors_m2) || 0) + (Number(area.back_m2) || 0)) * 1e4) / 1e4 : null;
  check('F4', 'the BOM (the toolbar\'s own button, its Order tab): "LED light panel, made to measure, 4000 K, 75 x H", 2 in all', led.length > 0 && led.every((l) => /^LED light panel, made to measure, 4000 K, 75 x \d+(\.\d+)?$/.test(l.label)) && led.reduce((s, l) => s + l.qty, 0) === 2,
    '2 pcs, 75 x H', j(led));
  check('F4', 'the BOM: "Mirror 4 mm" in m2, the doors and the back (the back asked Yes)', mir.length === 1 && /^Mirror 4 mm$/.test(mir[0].label) && /m/.test(mir[0].unit) && near(mir[0].qty, wantM2, 0.0006) && area && area.doors_m2 > 0 && area.back_m2 > 0 && /doors and the back/.test(mir[0].spec),
    `${wantM2} m2 (doors ${area && area.doors_m2} + back ${area && area.back_m2})`, j(mir));
  check('F4', 'the BOM: "Glass shelf 6 mm toughened, W x D", 15 in all (two sizes: the 330 bays and the 480 bay)', gl.length > 0 && gl.every((l) => /^Glass shelf 6 mm toughened, [\d.]+ x [\d.]+$/.test(l.label)) && gl.reduce((s, l) => s + l.qty, 0) === 15,
    '15 pcs', j(gl));
  note('F4', 'the cabinet\'s other order lines (strips, driver, hinges, pins, hangers)', j(lines.filter((l) => ['led_strip', 'mirror_led_driver', 'hinges', 'shelf_pins', 'vanity_hangers'].includes(l.role)).map((l) => `${l.label}: ${l.qty} ${l.unit}`)));
  await domFrame(page, 'document.querySelector(\'[data-bom-order="1"]\')', 'f12-05-mirror-bom.png', 10, 1.5);
  await bomClose(page);

  // OUTPUT > DRAWINGS: THE FRONTS SHEET OF WALL A (M3).
  const names = await openSet(page);
  note('F5', 'the sheet buttons', j(names));
  const frontsName = names.find((n) => /^Wall A . Fronts$/.test(n)) || names.find((n) => /Fronts$/.test(n));
  const svg = await sheetOnGlass(page, frontsName);
  const scale = sheetScale(svg);
  const engDoors = (await partsOf(page, id)).filter((p) => p.meta.mc === 'door');
  const engPanels = (await partsOf(page, id)).filter((p) => p.meta.mc === 'panel');
  const engStiles = (await partsOf(page, id)).filter((p) => p.meta.mc === 'stile');
  const leaves = rectsOn(svg, 'DOORS');
  const mirrorLeaves = engDoors.map((d) => leaves.find((l) => near(l.w * scale, d.w, 1) && near(l.h * scale, d.h, 1))).filter(Boolean);
  const stileRects = rectsFromLines(linesOf(svg, 'LED_STILE'));
  const panelRects = rectsFromLines(linesOf(svg, 'DOORS'));
  const panelFound = engPanels.map((p) => {
    const W = p.id === 'PANEL-TOP' || p.id === 'PANEL-BOTTOM' ? p.box.w : p.box.w;
    const H = p.box.h;
    return { id: p.id, on: panelRects.some((r) => near(r.w * scale, W, 1) && near(r.h * scale, H, 1)) };
  });
  const nums = textsOn(svg, 'UNIT_NUMBER').map((t) => t.text);
  check('F5', `the fronts sheet "${frontsName}" (a real click): the three mirror doors drawn as leaves (${engDoors.map((d) => d.w).join(' / ')} x ${engDoors[0] && engDoors[0].h} at 1:${scale})`, scale && engDoors.length === 3 && engDoors.every((d) => leaves.some((l) => near(l.w * scale, d.w, 1) && near(l.h * scale, d.h, 1))),
    'three DOORS leaves the doors\' size', j({ scale, leaves: leaves.map((l) => [r1(l.w * scale), r1(l.h * scale)]), matched: mirrorLeaves.length }));
  check('F5', 'the two stiles on their own ink LED_STILE (warm yellow, one ink one layer), each 75 x the door height', anyOn(svg, 'LED_STILE') > 0 && stileRects.length === 2 && engStiles.length === 2 && stileRects.every((r) => near(r.w * scale, 75, 1) && near(r.h * scale, engStiles[0].h, 1)),
    'LED_STILE: two rectangles 75 x H', j({ entities: anyOn(svg, 'LED_STILE'), rects: stileRects.map((r) => [r1(r.w * scale), r1(r.h * scale)]), colour: (tagsOn(svg, 'line', 'LED_STILE')[0] || '').match(/stroke="([^"]+)"/)?.[1] || null }));
  check('F5', 'the panels round drawn (L, R and top; bottom taken off above) and the unit number MC01', panelFound.length === 3 && panelFound.every((p) => p.on) && nums.includes('MC01'),
    'PANEL-L, PANEL-R, PANEL-TOP outlined; MC01', j({ panels: panelFound, numbers: nums }));
  await frameOf(svg, 'f12-06-mirror-fronts-sheet.png');
  await closeModals(page);
}

// === LEG 2 . THE VANITY MADE RIGHT (F6 to F9) ===============================
async function leg2(page) {
  await stageRoom(page, 5000, 3000, 2500);
  const v = await addFromLibrary(page, {
    category: 'Kitchen', groups: ['bathroom'], ids: ['vanity-3'], label: /Vanity unit, 3 drawers/i,
  });
  if (!v.unit) { push('FAIL', 'F6', 'Library > Kitchen > Bathroom > "Vanity unit, 3 drawers"', 'a VANITY3 in the room', v.why || 'no unit'); return; }
  await closeLibrary(page);
  await page.sleep(1500);
  const id = v.unit.id;
  check('F6', `Library > Kitchen > Bathroom > "Vanity unit, 3 drawers" (row ${v.entry}, a real click): a VANITY3, 900 x 600 x 500`, v.unit.type === 'VANITY3' && v.unit.w === 900 && v.unit.h === 600 && v.unit.d === 500, 'VANITY3 900 x 600 x 500', j(v.unit));
  const u0 = await unitRow(page, id);
  const clearance = Number(await page.ask(`(${PROFILE}.room || {}).wallBackClearance ?? 10`));
  const voidMm = Number(await page.ask(`(${PROFILE}.vanity || {}).serviceVoidMm ?? 80`));
  await key(page, 'Escape');
  await frameOn(page, [id], { side: 1.1, up: 0.35, pad: 1.5 });
  await settleCamera(page);
  const sc = await settleScene(page, id);
  const P = sc.pieces;
  const rails = ['RAIL-TOP', 'RAIL-BOTTOM'].map((k) => [k, P[k] ? P[k].min[2] : null]);
  const sides = ['BUL', 'BUR'].map((k) => [k, P[k] ? P[k].max[2] : null]);
  check('F6', `the carcass to the wall (*"carcas powinien byc do sciany"*): wall_gap the house's ${clearance} (no void in it), the rails' back at the wall line + ${clearance}, the sides' front 500 out from there`,
    (u0.wallGap == null || near(u0.wallGap, clearance)) && rails.every(([, z]) => near(z, clearance, 0.05)) && sides.every(([, z]) => near(z, clearance + 500, 0.05)),
    `wall_gap ${clearance}; rails z ${clearance}; sides to z ${clearance + 500}`, j({ wall_gap: u0.wallGap, rails, sides }));
  const parts = await partsOf(page, id);
  const boxSides = parts.filter((p) => p.part === 'DRAWER-SIDE');
  const runner = await page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const h = (r.hardware || []).find((x) => x.role === 'runner_pairs'); return h ? { qty: h.qty, spec: h.spec && { length: h.spec.length_mm, nl: h.spec.nl }, label: h.spec_label } : null; })()`);
  const boxBack = Math.min(...boxSides.map((p) => p.box.z));
  check('F6', `the void ${voidMm} INSIDE: the drawer boxes on the shorter runner (box 390, runner NL 400, the rung at or under 500 - ${voidMm}), their backs ${voidMm} or more off the carcass back`, boxSides.length === 6 && boxSides.every((p) => near(p.box.d, 390, 0.01)) && runner && runner.spec.nl === 400 && runner.spec.length === 390 && boxBack >= voidMm,
    'boxes 390, NL 400, box back >= 80', j({ sides: [...new Set(boxSides.map((p) => p.box.d))], boxBackZ: boxBack, roomBoxBack: P['D1-SL'] ? P['D1-SL'].min[2] : null, runner }));
  const tops = await page.ask(`(() => { const ws = ${S}.worktopsOf().filter((w) => (w.unitIds || []).includes(${j(id)})); const out = [];
    for (const w of ws) { let mesh = null; window.__cc.views.room.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccWorktopId === w.id) mesh = o; });
      let z = null; if (mesh) { const T = window.__cc.views.room.three; const cs = (${S}.project.room || {}).corners || []; const ys = cs.map((c) => c.y); const cz = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
        const b = new T.Box3().setFromObject(mesh); z = [Math.round((b.min.z * 1000 + cz) * 10) / 10, Math.round((b.max.z * 1000 + cz) * 10) / 10]; }
      out.push({ id: w.id, d: w.geometry && w.geometry.d, room: z }); } return out; })()`);
  check('F6', 'the worktop to the wall over the carcass, as any run\'s: 548 deep, its back at the wall', tops.length === 1 && tops[0].d === 548 && tops[0].room && near(tops[0].room[0], 0, 1) && near(tops[0].room[1] - tops[0].room[0], 548, 1),
    'one worktop d 548 from z 0', j(tops));
  const c0 = await checkOpen(page);
  const c0n = c0.filter((f) => [39, 45, 48].includes(f.n));
  note('F8', 'the Check on the vanity as born (columns 1, one basin; a real click): its #39, #45, #48', j(c0n));
  await checkClose(page);
  await shot(page, 'f12-07-vanity-wall.png');

  // COLUMNS 2 AND SINKS 1 (real clicks on the right panel).
  await selectUnit(page, id);
  if (!(await page.ask('Boolean([...document.querySelectorAll(\'[data-drawer-columns-count="2"]\')].find((e) => e.offsetParent))'))) await sectionOpen(page, 'Section 1');
  if (!(await page.ask('Boolean([...document.querySelectorAll(\'[data-drawer-columns-count="2"]\')].find((e) => e.offsetParent))'))) {
    const t = await page.ask('[...document.querySelectorAll(\'[data-section]\')].map((s) => s.getAttribute(\'data-section\'))');
    for (const s of t) { if (await page.ask('Boolean([...document.querySelectorAll(\'[data-drawer-columns-count="2"]\')].find((e) => e.offsetParent))')) break; await sectionOpen(page, s); }
  }
  const col2 = await need(page, 'F7', 'T82 (RightPanel Columns row)', 'the Columns 1 / 2 row', '[...document.querySelectorAll(\'[data-drawer-columns-count="2"]\')].find((e) => e.offsetParent)')
    && await pressVisible(page, '[data-drawer-columns-count="2"]');
  await sectionOpen(page, 'Vanity');
  const sink1 = await need(page, 'F7', 'T82 (RightPanel Vanity section)', 'the Sinks row', '[...document.querySelectorAll(\'[data-vanity-sinks-count="1"]\')].find((e) => e.offsetParent)')
    && await pressVisible(page, '[data-vanity-sinks-count="1"]');
  await page.sleep(1200);
  const u2 = await unitRow(page, id);
  const p2 = await partsOf(page, id);
  const pid = (k) => p2.find((p) => p.id === k);
  const L = pid('Z1D3-SR'); const Rt = pid('Z2D3-SL'); const div = pid('DIVIDER');
  const gap = L && Rt ? { from: r1(L.box.x + L.box.w), to: r1(Rt.box.x), w: r1(Rt.box.x - (L.box.x + L.box.w)), centre: r1((L.box.x + L.box.w + Rt.box.x) / 2) } : null;
  const topFronts = p2.filter((p) => p.part === 'DRAWER-FRONT');
  check('F7', 'Columns 2 and Sinks 1 (real clicks): the two top boxes narrowed toward the centre, the gap between them 350 to 550, 200, centred on 450 (*"zmniejszmy szuflady na szerokosc ... pomiedzy szufladami zrobi sie miejsce na syfon"*)',
    col2 && sink1 && u2.columns === 2 && u2.sinks === 1 && gap && gap.from === 350 && gap.to === 550 && gap.w === 200 && gap.centre === 450,
    'gap 350 .. 550 = 200, centre 450', j({ columns: u2.columns, sinks: u2.sinks, gap, boxes: ['Z1D3-SL', 'Z1D3-SR', 'Z2D3-SL', 'Z2D3-SR'].map((k) => [k, pid(k) && pid(k).box.x]) }));
  const sc2 = await settleScene(page, id);
  const xu = u2.x;
  const roomGap = sc2.pieces['Z1D3-SR'] && sc2.pieces['Z2D3-SL'] ? [r1(sc2.pieces['Z1D3-SR'].max[0] - xu), r1(sc2.pieces['Z2D3-SL'].min[0] - xu)] : null;
  check('F7', 'the room draws the same gap: Z1D3-SR ends at 350, Z2D3-SL starts at 550 (the unit\'s own x)', roomGap && near(roomGap[0], 350, 0.1) && near(roomGap[1], 550, 0.1), '[350, 550]', j(roomGap));
  check('F7', 'the short divider: from the bottom to the underside of the top row (400), the top row\'s fronts wide as the columns rule has them', div && div.box && near(div.box.y + div.box.h, 400, 0.5) && div.box.h < u2.h - 100 && new Set(topFronts.map((f) => f.w)).size === 1,
    'DIVIDER from the BOTTOM to 400 (not the TOP), every front the same width', j({ divider: div && { high: div.box.h, y0: div.box.y, y1: div.box.y + div.box.h, deep: div.box.d }, carcass: u2.h, fronts: topFronts.map((f) => `${f.id} ${f.w}`) }));
  await frameOn(page, [id], { side: 0.2, up: 0.9, pad: 1.5 });
  await settleCamera(page);
  await shot(page, 'f12-08-vanity-gap.png');

  // THE TOP LEFT DRAWER OPENED (a real double click on its face): its box and its face, nothing of column 2.
  await key(page, 'Escape');
  await frameOn(page, [id], { side: 0.15, up: 0.25, pad: 1.4 });
  await settleCamera(page);
  const before = await settleScene(page, id);
  const face = 'VU01-Z1D3-F';
  const faceId = p2.find((p) => p.part === 'DRAWER-FRONT' && p.meta.drawer === 3 && p.meta.column === 1);
  const fid = faceId ? faceId.id : face;
  const atF = await reach(page, id, fid);
  if (atF) await page.dblclick(atF.x, atF.y);
  await page.sleep(800);
  const after = await settleScene(page, id, 10000);
  const openNow = await page.ask(`${UI}.openFronts[${j(id)}] || {}`);
  const moved = Object.keys(after.pieces).filter((k) => before.pieces[k] && Math.abs(after.pieces[k].min[2] - before.pieces[k].min[2]) > 20);
  const box1 = p2.filter((p) => p.meta.drawer === 3 && p.meta.column === 1 && p.role === 'drawer_box').map((p) => p.id);
  const travel = moved.length ? r1(after.pieces[moved[0]].min[2] - before.pieces[moved[0]].min[2]) : null;
  check('F9', `double click on the top LEFT drawer's face ${fid} (a real double click on its pixel): its box (${box1.join(', ')}) and its face come out together, nothing of column 2 moves (*"jedna sie otwiera carcas tylko a druga front tylko"*)`,
    Boolean(atF) && Number(openNow[fid]) > 0 && [...box1, fid].every((k) => moved.includes(k)) && !moved.some((k) => /^Z2|Z2D/.test(k)) && moved.every((k) => [...box1, fid].includes(k)),
    `moved = ${[...box1, fid].join(', ')}`, j({ at: atF, open: openNow, moved, travel }));
  await shot(page, 'f12-09-vanity-drawer-open.png');
  await closeModals(page);

  // THE BASIN 250 FROM THE BACK; THE CHECK (a real click): CLAUDE.md's "no #48 clash".
  const trap = await page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const v = r && r.derived && r.derived.vanity; return v ? { wasteFromBackMm: v.trap && v.trap.wasteFromBackMm, wastes: v.trap && v.trap.wastes, cut: (v.top && v.top.cutouts || []).map((c) => ({ x: c.x, z: c.z })) } : null; })()`);
  const basin = (after.basins || [])[0] || null;
  const railBack = after.pieces['RAIL-TOP'] ? after.pieces['RAIL-TOP'].min[2] : null;
  check('F8', 'the basin 50 forward (*"umywalki przesun bardziej do przodu o jakies 50 mm"*): its waste 250 from the carcass back, in the engine and in the room', trap && trap.wasteFromBackMm === 250 && basin && railBack != null && near(basin.cz - railBack, 250, 0.5),
    'waste 250 from the back', j({ engine: trap, room: basin && { cz: basin.cz, railBack, fromBack: r1(basin.cz - railBack) } }));
  const fz = await checkOpen(page);
  const c48 = fz.filter((f) => f.n === 48);
  check('F8', 'the Check (a real click) at columns 2, sinks 1: no #48 clash (CLAUDE.md PART D: "the basin 250 from the back, no #48 clash"; *"material nigdy nie wchodzi w drugi material"*)', c48.length === 0,
    'no #48', j(c48));
  if (c48.length) note('F8', 'the engine\'s own sentence (V2: "THE NUMBERS DISAGREE": at 250 the bowl reaches the top boxes; the waste 270 or a bowl 115 deep clears, the owner\'s to set)', c48.map((f) => `${f.level}: ${f.text}`).join(' | '));
  await shot(page, 'f12-10-vanity-check.png');
  await checkClose(page);
}

// === LEG 3 . THE DRAWINGS (F10, F11) ========================================
async function leg3(page) {
  const ids = await stageT81Kitchen(page, { inframe: true, knob: true });
  const units = await page.ask(`${S}.units.map((u) => [u.id, u.type, u.params.unit_num, u.position.x_mm, u.params.width])`);
  note('F10', 'THE STAGE: the T81 kitchen, BUD 600, BUD 800, BUDR2 500 from the left on wall A, WUD 600 over (scripts/t81-kitchen.mjs through the page\'s store)', j(units.map((u) => u.slice(1))));
  // The engine's section station for wall A, from the same stage in node (scripts/t81-kitchen.mjs).
  let station = null;
  try {
    const K = await import('./t81-kitchen.mjs');
    const { getCabinetProfile } = await import('../src/engine/profile.js');
    const { wallGroups } = await import('../src/engine/drawings/wallElevation.js');
    const { sectionStations } = await import('../src/engine/drawings/setSection.js');
    K.t81Kitchen({ inframe: true, knob: true });
    const g = wallGroups(K.setArgs().entries, getCabinetProfile()).find((x) => x.wall === 0);
    const [st] = sectionStations(g);
    station = st ? { letter: st.letter, x: st.x, unit: st.member && st.member.result && st.member.result.unitNum } : null;
  } catch (e) { station = { why: String(e && e.message) }; }
  note('F10', 'the engine\'s section station on wall A (setSection.js sectionStations, the same stage in node)', j(station));

  const names = await openSet(page);
  note('F10', 'the sheet buttons', j(names));
  const planName = names.find((n) => /base units/i.test(n));
  const frontsName = names.find((n) => /^Wall A . Fronts$/.test(n));
  const fronts = await sheetOnGlass(page, frontsName);
  const plan = await sheetOnGlass(page, planName);
  const want = ['01', '02', 'DR01'];
  const numsOf = (svg) => textsOn(svg, 'UNIT_NUMBER').filter((t) => want.includes(t.text));
  const pn = numsOf(plan);
  const fn = numsOf(fronts);
  const xsOf = (arr) => want.map((n) => (arr.find((t) => t.text === n) || {}).x);
  const px = xsOf(pn);
  const fx = xsOf(fn);
  const label = textsOn(plan, 'BUILDING').filter((t) => /^WALL [A-D]$/.test(t.text));
  const wallA = label.find((t) => t.text === 'WALL A');
  const below = wallA && pn.length === 3 && pn.every((t) => t.y > wallA.y);
  const inc = (xs) => xs.every(Number.isFinite) && xs[0] < xs[1] && xs[1] < xs[2];
  check('F10', `the base plan "${planName}" off the glass (a real click): 01, 02, DR01 left to right under wall A, as on the fronts sheet (*"przekroj z gory pokazuje jakby logike z dolu czyli lustrzane odbicie"*)`, pn.length === 3 && inc(px) && inc(fx) && below,
    '01 < 02 < DR01 on the plan and on the fronts sheet; the numbers under WALL A', j({ plan: pn.map((t) => [t.text, t.x, t.y]), fronts: fn.map((t) => [t.text, t.x]), wallA: wallA && [wallA.x, wallA.y] }));
  const where = Object.fromEntries(label.map((t) => [t.text.slice(5), [t.x, t.y]]));
  note('F10', 'where wall A stands (E1\'s F10: a true plan looking down, wall A at the TOP with its label above its line, B right, C bottom, D left; CLAUDE.md\'s "wall A at the bottom" was the mirror)', j({ labels: where, aTop: where.A && where.C ? where.A[1] < where.C[1] : null, bRight: where.B && where.D ? where.B[0] > where.D[0] : null }));
  // THE SECTION MARKER A-A: the two arrowheads on the knife's line, where the section is cut, looking along the wall to its end.
  const xL = Math.min(...label.map((t) => t.x));
  const xR = Math.max(...label.map((t) => t.x));
  const heads = pathsOn(plan, 'FRAME').filter((p) => p.closed && p.pts.length === 3 && p.pts.every(([x]) => x > xL && x < xR));
  const letters = textsOn(plan, 'FRAME').filter((t) => station && t.text === station.letter && t.x > xL && t.x < xR);
  const centre = (uid) => { const u = units.find((r) => r[0] === uid); return u ? u[3] + u[4] / 2 : null; };
  const [ua, uc] = [centre(ids.a), centre(ids.c)];
  const [pa, pc] = [pn.find((t) => t.text === '01'), pn.find((t) => t.text === 'DR01')];
  const wantX = station && Number.isFinite(station.x) && pa && pc ? r2(pa.x + ((pc.x - pa.x) * (station.x - ua)) / (uc - ua)) : null;
  const headInfo = heads.map((h) => { const base = [(h.pts[1][0] + h.pts[2][0]) / 2, (h.pts[1][1] + h.pts[2][1]) / 2]; return { tip: h.pts[0], base: base.map(r2), look: Math.sign(h.pts[0][0] - base[0]) }; });
  const knife = linesOf(plan, 'FRAME').filter((l) => l.dashed && Math.abs(l.x1 - l.x2) < 0.01 && l.x1 > xL && l.x1 < xR).map((l) => [l.x1, l.y1, l.y2]);
  check('F10', `the section marker ${station && station.letter}-${station && station.letter} where the section is cut (the engine's station x ${station && station.x}, through ${station && station.unit}), its two arrows looking toward wall A's end, the letter behind each`,
    wantX != null && heads.length === 2 && headInfo.every((h) => near(h.base[0], wantX, 0.5) && h.look === 1) && letters.length === 2 && letters.every((l) => l.x < wantX),
    `two arrowheads at paper x ${wantX}, pointing +x, letters behind`, j({ heads: headInfo, letters: letters.map((l) => [l.x, l.y]), knife }));
  await frameOf(plan, 'f12-11-plan-base.png');

  // THE SET TAB: None, only "Wall A . Fronts" ticked, "Drawing set (PDF)" (real clicks), the PDF read back.
  if (!(await need(page, 'F11', 'E1', 'the Set tab\'s None button', '[...document.querySelectorAll(\'[data-wall-sheets-none="1"]\')].find((e) => e.offsetParent)'))) return;
  await pressVisible(page, '[data-wall-sheets-none="1"]');
  const none = await page.ask('Number((document.querySelector(\'[data-wall-sheets-picked]\') || { getAttribute: () => -1 }).getAttribute(\'data-wall-sheets-picked\'))');
  const pick = `[data-wall-sheet-pick=${j(frontsName)}]`;
  if (!(await need(page, 'F11', 'E1', `the check box of "${frontsName}"`, `document.querySelector(${j(pick)})`))) return;
  await pressVisible(page, pick);
  const picked = await page.ask(`(() => { const c = [...document.querySelectorAll('[data-wall-sheet-pick]')]; return { ticked: c.filter((x) => x.checked).map((x) => x.getAttribute('data-wall-sheet-pick')), of: c.length,
    picked: Number(document.querySelector('[data-wall-sheets-picked]').getAttribute('data-wall-sheets-picked')), pages: Number((document.querySelector('[data-wall-drawings-pdf="1"]') || { getAttribute: () => -1 }).getAttribute('data-wall-drawings-pages')),
    said: ((document.querySelector('[data-wall-sheets-picked] span') || {}).textContent || '').trim() }; })()`);
  check('F11', `the Set tab: None (a real click), then the check box of "${frontsName}" (a real click): one sheet ticked of ${picked.of}, the PDF button counts 1`, none === 0 && j(picked.ticked) === j([frontsName]) && picked.picked === 1 && picked.pages === 1,
    `none 0, then [${frontsName}], picked 1, pages 1`, j({ afterNone: none, ...picked }));
  await domFrame(page, '(document.querySelector(\'[data-wall-sheets-picked]\') || {}).parentElement', 'f12-12-set-tab.png', 10, 1.5);
  await page.ask('(() => { if (!window.__t83Blobs) { window.__t83Blobs = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { window.__t83Blobs.push(b); return o(b); }; } return true; })()');
  await pressVisible(page, '[data-wall-drawings-pdf="1"]');
  await until(page, 'window.__t83Blobs.some((b) => b.type === \'application/pdf\' || b.size > 50000)', 120000);
  const pdf64 = await page.ask(`(async () => { const b = window.__t83Blobs.filter((x) => x.type === 'application/pdf' || x.size > 50000).pop(); if (!b) return null;
    const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 1) s += String.fromCharCode(u[i]); return btoa(s); })()`);
  if (!pdf64) { check('F11', 'the PDF exported (Drawing set (PDF), a real click)', false, 'the file', 'no blob'); return; }
  const file = join(SCRATCH, 'walk-fronts.pdf');
  writeFileSync(file, Buffer.from(pdf64, 'base64'));
  let info = ''; let text = '';
  try { info = execFileSync('pdfinfo', [file]).toString(); } catch (e) { info = `pdfinfo: ${e.message}`; }
  try { text = execFileSync('pdftotext', ['-layout', file, '-']).toString(); } catch (e) { text = `pdftotext: ${e.message}`; }
  const pages = Number((info.match(/^Pages:\s+(\d+)/m) || [])[1]);
  const sheetCell = (text.match(/\b(\d{2})\s*\/\s*(\d{2})\b/g) || []).map((s) => s.replace(/\s+/g, ' '));
  check('F11', '"Drawing set (PDF)" (a real click), the file read back (pdfinfo, pdftotext): one page, its SHEET cell "01 / 01", the fronts of wall A on it', pages === 1 && sheetCell.includes('01 / 01') && /Fronts/i.test(text),
    '1 page, 01 / 01', j({ pages, sheet: sheetCell, bytes: Buffer.from(pdf64, 'base64').length, fronts: /Fronts/i.test(text) }));
  note('F11', 'pdfinfo', info.trim().split('\n').filter((l) => /^(Pages|Page size|Producer|Title)/.test(l)).map((l) => l.replace(/\s+/g, ' ')).join('; '));
  note('F11', 'the drawing number kept on the page (E1: the set\'s own "02 . Wall A . Fronts")', j((text.match(/[^\n]*\b0\d\s*.\s*Wall A[^\n]*/) || [''])[0].trim().replace(/\s+/g, ' ').slice(0, 120)));
  try {
    execFileSync('pdftoppm', ['-png', '-r', '60', '-f', '1', '-l', '1', '-singlefile', file, join(SCRATCH, 'pdf-page')]);
    copyFileSync(join(SCRATCH, 'pdf-page.png'), `${OUT}f12-13-pdf-page.png`);
    frames.push('f12-13-pdf-page.png');
    push('FRAME', 'F12', 'f12-13-pdf-page.png (the exported PDF\'s one page, pdftoppm at 60 dpi)');
  } catch (e) { note('F12', 'the PDF page framed', `pdftoppm: ${e.message}`); }
  await closeModals(page);
}

// === THE WALK ===============================================================
const LEG_TITLES = {
  1: 'THE MIRROR CABINET: LIBRARY > BATHROOM > MIRROR CABINET OVER A VANITY, THE STILES LIT, OPEN ALL, THE BACK ASKED, RECESS 155, PANELS BOTTOM OFF, THE BOM, THE FRONTS SHEET',
  2: 'THE VANITY MADE RIGHT: THE CARCASS TO THE WALL, THE SHORTER RUNNER, THE WORKTOP; COLUMNS 2 AND SINKS 1: THE GAP, THE TOP LEFT DRAWER OPENED, THE BASIN 250, THE CHECK',
  3: 'THE DRAWINGS: THE BASE PLAN OF THE T81 KITCHEN, THE SECTION MARKER, THE SET TAB WITH ONLY FRONTS TICKED, THE PDF READ BACK',
};
const LEG_RUN = { 1: leg1, 2: leg2, 3: leg3 };
const errorsByLeg = {};
for (const n of LEGS) {
  LEG = n;
  push('LEG', 'F12', `LEG ${n} . ${LEG_TITLES[n]}`);
  let page = null;
  try {
    page = await open({ width: 1440, height: 900 });
    await pro(page, { base: BASE });
    if (n === LEGS[0]) note('F12', 'the build under the mouse', `the repo's HEAD ${head}; url ${BASE}`);
    await LEG_RUN[n](page);
  } catch (e) {
    check('F12', `leg ${n} to its end`, false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    if (page) await shot(page, `f12-leg${n}-failure.png`).catch(() => {});
  }
  if (page) {
    const errs = pageErrors(page);
    errorsByLeg[n] = errs.length;
    note('F12', `console errors on the page (leg ${n})`, errs.length ? `${errs.length}: ${errs.slice(0, 3).join(' | ')}` : 'none');
    await page.close();
  }
}
if (painter) await painter.close();
await showroomDown();
stopPreview();

const count = (k) => steps.filter((s) => s.kind === k).length;
const [pass, fail] = [count('PASS'), count('FAIL')];
const secs = Math.round((Date.now() - TWALK) / 1000);
const total = Math.round((Date.now() - T0) / 1000);
const summary = `SUMMARY: ${pass + fail} steps, ${pass} PASS, ${fail} FAIL`;
writeFileSync(`${OUT}walk.txt`, ascii([
  'T83 WALK: THE MIRROR CABINET, THE VANITY MADE RIGHT, THE PLAN THAT IS NOT A MIRROR (scripts/t83-walk.mjs)',
  `walked ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, HEAD ${head}, ${BASE}, legs ${LEGS.join(',')}; the walk ${secs} s (${total} s with the build and the server)`,
  'Every line: PASS or FAIL (the F, the gesture, what CLAUDE.md expects, what the page showed), NOTE (a reading), FRAME (the file beside this one).',
  'The gestures are real clicks, double clicks and keys; the stages are the store\'s; every sheet is read off the glass and framed from that very SVG at 4 px per paper mm.',
  'A FAIL is written down, never patched; where CLAUDE.md and the engine disagree the step keeps CLAUDE.md\'s words and a NOTE carries the engine\'s.',
  '',
  ...steps.map((s) => {
    if (s.kind === 'LEG') return `\n${s.gesture}`;
    if (s.kind === 'FRAME') return `FRAME  [${s.leg}] ${s.gesture}`;
    if (s.kind === 'NOTE') return `NOTE   [${s.leg}] ${s.F} ${s.gesture} | ${s.got}`;
    return `${s.kind.padEnd(6)} [${s.leg}] ${s.F} ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
  }),
  '',
  `CONSOLE ERRORS PER LEG: ${LEGS.map((n) => `leg ${n} ${errorsByLeg[n] ?? '?'}`).join(', ')}`,
  `FRAMES (${frames.length}): ${frames.join(', ')}`,
  summary,
  '',
].join('\n')));
process.stdout.write(`\n${summary}; the walk ${secs} s (${total} s in all); ledger ${OUT}walk.txt; frames ${frames.join(', ')}\n`);
process.exit(fail ? 1 : 0);
