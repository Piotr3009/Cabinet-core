/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F25, THE WALK (CLAUDE.md T82 PART F)
//
// CLAUDE.md T82 F25: "Real mouse, built app (`npx vite build` and preview),
// ledger `verify/t82/walk.txt`, frames `verify/t82/f25-*.png`: (1) Library,
// HAWA pocket beside a BUD 500 on a 580 run ... (2) Library, Vanity 3
// drawers ... (3) Settings, Fronts FL, profile reed 20 ... (4) a free panel
// dragged up by 200 with a real mouse ... (5) Output, Drawings: the logo
// chosen and on the sheet, the fronts sheet's chain 363 . 3 . 360 and the
// knob of 30 on every door, the base plan's plinth as one dashed line, the
// section with the traced runner; the exported PDF read back and its pages
// counted." The owner, 25.10.2026: *"zaczniemy od hawa dodanie"*, *"pozniej
// dodajemy vanity unit"*, *"bardziej chcialem grab and move"*, *"musze miec
// dzisiaj profesjonalne rysunki dla klientow"*.
//
// THE GESTURES ARE REAL: the library's menu, its groups and rows, the right
// panel's buttons and fields, the Settings window's steps and tiles, the
// canvas toolbar (Open all, BOM, Check, CNC), the drag of a panel in the room,
// the Drawings window's tabs, sheet buttons, logo chooser and PDF button are
// the browser's own input pipe (CDP Input.dispatchMouseEvent /
// dispatchKeyEvent), aimed at a control's centre or at a piece's own pixel
// (scripts/t74-harness.mjs, scripts/t75-harness.mjs). THE STAGES that are not
// what a leg is about (the room, a chimney, the T81 kitchen of leg 5) are put
// through the store's own actions, as scripts/t81-walk.mjs puts its kitchen.
// The engine and the scene are READ to say what happened (window.__cc). Every
// sheet is read off the glass (`.cc-drawing svg`) and framed from that very
// string at 4 px per paper mm. A FAIL is written down, never patched.
//
// A HOOK a slice has to put on the page (CLAUDE.md T82 THE AGENTS, verify/t82/
// agents/F1.md "WHAT EACH LEG NEEDS") is asked for by name before the leg uses
// it: absent, the step is a FAIL naming the hook and the slice (a WAIT with
// --prep, the night's harness proof before the slices land).
//
// THE NUMBERS THE LEGS EXPECT are the engine's laws as the slices cut them:
// leg 1 on an 18 front (the stage's front type), the pocket 22 + 55 + 22, the
// door TB 572.5, T1 567 (the 560 track caps it), M 100.5, E1 472
// (KIT_HAWA.lsp, not CLAUDE.md's 592 or 599); the 750 door on the 580 run M 278
// and no #38; #38 where HAWA refuses (the BUD made 400 deep, KT1 under 414);
// #37 for a base run's door (TH 721.5 under HAWA's 1200). Leg 2: the U splits
// the top box's back in two and notches its bottom; two basins at columns 2
// need the width #48 names. Leg 3: a drawer front's reeds meet its back
// screws and are refused in words. Leg 5: the traced runner on the BUDR2 at
// 460 (the NL500 T of the 558 has no model, E4).
//
//   node scripts/t82-walk.mjs --build --serve     build dist/, serve it on E2E_PORT (4173), walk, stop it
//   npx vite build; npx vite preview --port 4173 --strictPort &   then: node scripts/t82-walk.mjs
//   node scripts/t82-walk.mjs --legs 1,5          some legs only (also T82_LEGS=1,5)
//   node scripts/t82-walk.mjs --prep              a missing hook is WAIT; ledger and frames to a scratch folder
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t82-walk.mjs      another server
//
// Chromium: /opt/pw-browsers (CHROME_PATH is set from it when unset); nothing
// is downloaded. Ledger: verify/t82/walk.txt. Frames: verify/t82/f25-*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import {
  mkdirSync, mkdtempSync, writeFileSync, existsSync, readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { deflateSync, crc32 } from 'node:zlib';

// === THE ARGUMENTS ==========================================================
const REPO = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const PREP = flag('prep');
const LEGS = String(opt('legs', process.env.T82_LEGS || '1,2,3,4,5')).split(',').map((s) => s.trim()).filter((s) => /^[0-5]$/.test(s)).map(Number);
const PORT = Number(process.env.E2E_PORT || 4173);
const BASE = process.env.E2E_URL || `http://127.0.0.1:${PORT}/`;
// The frames' page, the logo file and the exported PDF are the walk's own scratch, never the ledger's.
const SCRATCH = mkdtempSync(join(tmpdir(), 't82-walk-'));
const OUT = opt('out', PREP ? join(SCRATCH, 'verify-t82/') : new URL('../verify/t82/', import.meta.url).pathname).replace(/\/?$/, '/');
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
  open, pro, showroomDown, settleCamera, localBox,
} = await import('./t74-harness.mjs');
const {
  key, clickWith, boxOf, until, choose, reachFree, dragAlong,
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

// === THE LEDGER =============================================================
const steps = [];
const frames = [];
let LEG = 0;
const ascii = (t) => String(t)
  .replace(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'g'), '-')
  .replace(new RegExp(String.fromCharCode(0xb7), 'g'), '.')
  .replace(new RegExp(String.fromCharCode(0xd7), 'g'), 'x')
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
const near = (a, b, tol = 0.6) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) <= tol;

/**
 * A hook a slice puts on the page (verify/t82/agents/F1.md): there, or the
 * step is written down as not landed, with the hook and the slice named.
 */
async function need(page, F, slice, what, expr) {
  const ok = await page.ask(`Boolean(${expr})`).catch(() => false);
  if (ok) return true;
  push(PREP ? 'WAIT' : 'FAIL', F, `${what}: not on the page yet (slice ${slice})`, `the hook ${expr}`, 'absent');
  return false;
}

// === THE FRAMES =============================================================
async function shot(page, name, clip = null) {
  await page.sleep(500);
  await page.screenshot(`${OUT}${name}`, clip);
  frames.push(name);
  push('FRAME', 'F25', name);
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
  push('FRAME', 'F25', `${name} (${wMm} x ${hMm} mm at ${PX_PER_MM} px per mm: ${W} x ${H})`);
}
/**
 * One part of the CNC sheet framed from the sheet's own SVG: the root <svg> cloned with its viewBox set to
 * the part's box in the root's user space (the pan and zoom included), painted on the sheet's dark ground at
 * 1400 px wide in the second browser. A clip of the window would catch the layer legend floating over it.
 */
async function cncPartFrame(page, partId, name) {
  const got = await page.ask(`(() => { const g = document.querySelector('[data-cnc-part=${j(partId)}]'); if (!g) return null;
    let root = g.ownerSVGElement; while (root && root.ownerSVGElement) root = root.ownerSVGElement; if (!root) return null;
    const b = g.getBBox(); const m = root.getScreenCTM().inverse().multiply(g.getScreenCTM());
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => { const q = root.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(m); });
    const xs = pts.map((q) => q.x); const ys = pts.map((q) => q.y); const w = Math.max(...xs) - Math.min(...xs); const h = Math.max(...ys) - Math.min(...ys); const pad = 0.06 * Math.max(w, h);
    const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, w + 2 * pad, h + 2 * pad]; const W = 1400; const H = Math.max(200, Math.round(W * vb[3] / vb[2]));
    const c = root.cloneNode(true); c.setAttribute('viewBox', vb.join(' ')); c.setAttribute('width', String(W)); c.setAttribute('height', String(H)); c.removeAttribute('style'); c.removeAttribute('class');
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); return { svg: c.outerHTML, W, H }; })()`);
  if (!got) return shot(page, name);
  if (!painter) painter = await launch({ width: got.W, height: got.H, port: 9600 + Math.floor(Math.random() * 300) });
  await painter.send('Emulation.setDeviceMetricsOverride', {
    width: got.W, height: got.H, deviceScaleFactor: 1, mobile: false,
  });
  const file = join(SCRATCH, 'cnc.html');
  writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#131313">${got.svg}</body></html>`);
  await painter.goto(`file://${file}`);
  await painter.sleep(300);
  await painter.screenshot(`${OUT}${name}`, {
    x: 0, y: 0, width: got.W, height: got.H, scale: 1,
  });
  frames.push(name);
  push('FRAME', 'F25', `${name} (the CNC sheet's own SVG round the part ${partId}, ${got.W} x ${got.H})`);
}
/** The room camera put in front of some units (wall 1 faces +z), so a frame shows them whole. */
const frameOn = (page, ids, { side = 0.35, up = 0.22, pad = 1.35 } = {}) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three; const ids = ${j(ids)};
  const box = new T.Box3(); v.scene.traverse((o) => { if (!o.isMesh || o.visible === false) return; let a = o; while (a && (!a.userData || a.userData.ccUnitId == null)) a = a.parent;
    if (a && ids.includes(a.userData.ccUnitId)) box.expandByObject(o); });
  if (box.isEmpty()) return null; const c = box.getCenter(new T.Vector3()); const s = box.getSize(new T.Vector3());
  const r = Math.max(s.x, s.y) * 0.5 * ${pad}; const fov = ((v.camera.fov || 45) * Math.PI) / 180; const d = r / Math.tan(fov / 2) + s.z;
  v.camera.position.set(c.x + d * ${side}, c.y + d * ${up}, c.z + d); v.controls.target.copy(c); v.controls.update();
  return { c: c.toArray().map((x) => Math.round(x * 1000)), s: s.toArray().map((x) => Math.round(x * 1000)) }; })()`);

// === THE HANDS (all real events) ============================================
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
/** A button pressed by a real click at its centre; false when none is on the screen. */
async function pressIf(page, expr) {
  const at = await boxOf(page, expr);
  if (!at) return false;
  await clickWith(page, at.x, at.y);
  await page.sleep(700);
  return true;
}
/** A right-panel section opened by a real click on its header (when shut). */
async function sectionOpen(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`) || page.has(`[data-section="${title}"]:not([data-open])`);
}
/** A right-panel section whose title matches (the slices name theirs, e.g. "Pocket door", "Vanity"). */
const sectionLike = (re) => `[...document.querySelectorAll('[data-section]')].find((s) => s.offsetParent && new RegExp(${j(re.source)}, ${j(re.flags)}).test(s.getAttribute('data-section')))`;
async function sectionLikeOpen(page, re) {
  const title = await page.ask(`((${sectionLike(re)}) || { getAttribute: () => null }).getAttribute('data-section')`);
  if (!title) return null;
  await sectionOpen(page, title);
  return title;
}

/**
 * The room's own meshes that take no pointer (Room.jsx: a chimney's faces and
 * edges, `raycast={null}`) make three's `intersectObjects` throw inside the
 * shared pixel finder (scripts/t74-harness.mjs FIND, t75-harness.mjs EMPTY),
 * which casts over the whole scene. The walk's finder, never the app, is given
 * a no-op for them before every reach: r3f casts only at objects with
 * handlers, so what the pointer meets in the app is unchanged.
 */
const safeRays = (page) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return 0; let n = 0;
  v.scene.traverse((o) => { if (typeof o.raycast !== 'function') { o.raycast = () => {}; n += 1; } }); return n; })()`);
async function reach(page, unitId, panelId) {
  await safeRays(page);
  return reachFree(page, unitId, panelId);
}

/** The pieces a hand can click a cabinet by, a leaf first. (scripts/t76-walk.mjs) */
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); if (!r) return []; const pick = [];
  for (const f of [(p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT' || p.id === 'FP' || /^POCKET-(DOOR|B|A)$/.test(p.part || p.id), (p) => p.role === 'front', (p) => p.id === 'TOP', (p) => p.role === 'side', (p) => p.role === 'back']) {
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
 * at each). The row is found by its id or by its words, so a slice's row is
 * met however it was filed. Returns the unit the click added.
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
  const added = await page.ask(`${S}.units.filter((u) => !${j([...before])}.includes(u.id)).map((u) => ({ id: u.id, type: u.type, num: u.params.unit_num, x: u.position.x_mm, wall: u.position.wall, w: u.params.width, h: u.params.height, d: u.params.depth }))`);
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
async function viewMode(page, mode) {
  if (await page.ask(`${UI}.viewMode === ${j(mode)}`)) return true;
  const label = mode === 'cnc' ? 'CNC' : '3D';
  await toolbar(page, `[...document.querySelectorAll('[role="group"][aria-label="View mode"] button')].find((x) => x.offsetParent && x.textContent.trim() === ${j(label)})`);
  await until(page, `${UI}.viewMode === ${j(mode)}`, 5000);
  await page.sleep(1500);
  return page.ask(`${UI}.viewMode === ${j(mode)}`);
}
async function checkOpen(page) {
  if (!(await page.has('[data-check-panel]'))) await toolbar(page, '[...document.querySelectorAll(\'[data-check-button]\')].find((b) => b.offsetParent)');
  await until(page, 'Boolean(document.querySelector(\'[data-check-panel]\'))', 5000);
  await page.sleep(800);
  return page.ask(`[...document.querySelectorAll('[data-check-finding]')].map((li) => ({ n: Number(li.getAttribute('data-check-finding')), level: li.getAttribute('data-check-level'), text: li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 300) }))`);
}
async function checkClose(page) {
  if (!(await page.has('[data-check-panel]'))) return;
  const x = await boxOf(page, '[...document.querySelectorAll(\'[data-check-panel] button[title="Close"]\')].find((b) => b.offsetParent)');
  if (x) await clickWith(page, x.x, x.y); else await page.press('[data-check-button]');
  await until(page, '!document.querySelector(\'[data-check-panel]\')', 3000);
}
/** The BOM opened by the toolbar's own button; its text, and each tab's named (Order, BOM) pressed in turn (real clicks). */
async function bomText(page, tabs = []) {
  await toolbar(page, '[...document.querySelectorAll(\'button[title="Bill of materials"]\')].find((b) => b.offsetParent)');
  await until(page, `${UI}.bomOpen === true`, 5000);
  await page.sleep(1200);
  let text = await page.ask('document.body.innerText || \'\'');
  for (const tab of tabs) {
    if (!(await page.has(tab))) continue;
    await page.press(tab);
    await page.sleep(1200);
    text += `\n${await page.ask('document.body.innerText || \'\'')}`;
  }
  return text;
}
/** The BOM shut by its own x (the toolbar's BOM button stands under the open panel). (scripts/t80-walk.mjs) */
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

/** What the page said since the mark: every notice the ui store took (messages expire, so they are collected). */
async function hearSaid(page) {
  await page.ask(`(() => { if (window.__t82Said) return true; window.__t82Said = [];
    window.__cc.ui.subscribe((s, p) => { if (s.messages === p.messages) return; for (const m of s.messages || []) if (!(p.messages || []).includes(m)) window.__t82Said.push({ message: m.message, level: m.level, tone: m.tone }); });
    return true; })()`);
}
const markSaid = (page) => page.ask('(window.__t82Said || []).length');
const saidSince = (page, mark) => page.ask(`(window.__t82Said || []).slice(${Number(mark) || 0})`);

// === WHAT THE WALK READS ====================================================
const unitRow = (page, id) => page.ask(`(() => { const u = ${S}.units.find((x) => x.id === ${j(id)}); if (!u) return null;
  return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall, x: u.position.x_mm, w: u.params.width, h: u.params.height, d: u.params.depth,
    mount: u.params.mount_height ?? null, inset: u.params.inset_back_mm || 0, wallGap: u.params.wall_gap ?? null, facing: u.params.panel_facing || null, tilt: u.params.panel_tilt_deg ?? null,
    length: u.params.panel_length ?? null, boardT: u.params.board_t ?? null, pocket: u.params.pocket || null, columns: u.params.columns ?? null, sinks: u.params.sinks ?? null,
    floating: u.params.floating ?? null, floatHeight: u.params.float_height_mm ?? null }; })()`);
/** The engine's parts of a unit, as the page's store cuts them. */
const partsOf = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); if (!r) return null;
  return r.panels.map((p) => ({ id: p.id, part: p.part, role: p.role, w: p.w, h: p.h, t: p.thickness, box: p.box || null,
    outline: (p.cnc && Array.isArray(p.cnc.outline)) ? p.cnc.outline.length : null,
    deco: p.meta && p.meta.frontDecoration ? { style: p.meta.frontDecoration.style, status: p.meta.frontDecoration.status, parameters: p.meta.frontDecoration.parameters,
      kinds: [...new Set(p.meta.frontDecoration.operations.map((o) => o.kind))], ops: p.meta.frontDecoration.operations.length,
      reeds: p.meta.frontDecoration.operations.filter((o) => o.kind === 'reed').length,
      reedAt: p.meta.frontDecoration.operations.filter((o) => o.kind === 'reed' && Array.isArray(o.centreline) && o.centreline.length).map((o) => o.centreline[0]),
      problems: (p.meta.frontDecoration.problems || []).map((x) => x.code + ': ' + x.message) } : null })); })()`);
/**
 * Every mesh of a unit in the room, its box in the PLAN's millimetres (x along wall 1 from
 * the room's corner, y up from the floor, z out of wall 1: the world is the room centred on
 * its origin, Room.jsx 189), by its piece id, and the basins by their own mark (Basin.jsx: a
 * group whose `userData.ccBasin` is the vanity's id, mounted with the worktop, not in the unit).
 */
const sceneOf = (page, unitId) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  const cs = (${S}.project.room || {}).corners || []; const xs = cs.map((c) => c.x); const ys = cs.map((c) => c.y);
  const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0; const cz = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
  const out = {}; let basins = 0; const seen = new Set();
  const hidden = (o) => { for (let a = o; a; a = a.parent) if (a.visible === false) return true; return false; };
  v.scene.updateMatrixWorld(true);
  v.scene.traverse((o) => { if (!o.isMesh || hidden(o)) return; let a = o; while (a && (!a.userData || a.userData.ccUnitId == null)) a = a.parent;
    let basin = null; for (let b = o; b; b = b.parent) if (b.userData && b.userData.ccBasin != null) { basin = b; break; }
    const mine = (a && a.userData.ccUnitId === ${j(unitId)}) || (basin && basin.userData.ccBasin === ${j(unitId)});
    if (!mine) return;
    if (basin && !seen.has(basin.uuid)) { seen.add(basin.uuid); basins += 1; }
    const k = basin ? 'BASIN-' + basin.uuid.slice(0, 8) : (o.userData && o.userData.ccPanelId);
    if (!k) return; const b = new T.Box3().setFromObject(o);
    const plan = (q) => [q.x * 1000 + cx, q.y * 1000, q.z * 1000 + cz]; const mn = plan(b.min); const mx = plan(b.max); const p = out[k];
    out[k] = p ? { min: p.min.map((x, i) => Math.min(x, mn[i])), max: p.max.map((x, i) => Math.max(x, mx[i])) } : { min: mn, max: mx }; });
  for (const k of Object.keys(out)) { out[k].min = out[k].min.map((x) => Math.round(x * 10) / 10); out[k].max = out[k].max.map((x) => Math.round(x * 10) / 10); out[k].size = out[k].max.map((x, i) => Math.round((x - out[k].min[i]) * 10) / 10); }
  return { pieces: out, basins }; })()`);
const findingsNow = (page) => page.ask('[...document.querySelectorAll(\'[data-warning-code]\')].filter((e) => e.offsetParent).map((e) => e.getAttribute(\'data-warning-code\'))');

// === WHAT A SHEET SAYS, READ OFF ITS SVG (scripts/t81-walk.mjs) ============
const num = (tag, attr) => Number((tag.match(new RegExp(`\\b${attr}="(-?[\\d.]+)"`)) || [])[1]);
const tagsOn = (svg, kind, layer, { legend = false } = {}) => [...String(svg).matchAll(new RegExp(`<${kind}\\b[^>]*data-layer="${layer}"[^>]*>`, 'g'))]
  .map((m) => m[0]).filter((t) => legend || !/data-cc="(legend|key-plan)"/.test(t));
const anyOn = (svg, layer) => ['line', 'rect', 'path', 'circle', 'text', 'image'].reduce((n, k) => n + tagsOn(svg, k, layer).length, 0);
const leavesOf = (svg) => tagsOn(svg, 'rect', 'DOORS').filter((t) => !/data-cc=/.test(t))
  .map((t) => ({
    x: num(t, 'x'), y: num(t, 'y'), w: num(t, 'width'), h: num(t, 'height'),
  }));
const linesOf = (svg, layer, opts) => tagsOn(svg, 'line', layer, opts).map((t) => ({
  x1: num(t, 'x1'), y1: num(t, 'y1'), x2: num(t, 'x2'), y2: num(t, 'y2'), dashed: /stroke-dasharray/.test(t), tag: t,
}));
const textsOn = (svg, layer) => [...String(svg).matchAll(new RegExp(`<text\\b([^>]*data-layer="${layer}"[^>]*)>([^<]*)</text>`, 'g'))]
  .filter((m) => !/data-cc="(legend|key-plan)"/.test(m[1])).map((m) => ({ x: num(m[1], 'x'), y: num(m[1], 'y'), text: m[2].trim(), tag: m[1] }));
/** The sheet's scale, from the first text that says one ("1:20", "SCALE 1:20 @ A3"). */
const sheetScale = (svg) => {
  for (const m of String(svg).matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)) {
    const s = m[1].match(/\b1\s*:\s*(\d{1,3})\b/);
    if (s) return Number(s[1]);
  }
  return null;
};
const dataCc = (svg, value) => [...String(svg).matchAll(new RegExp(`<[a-z]+\\b[^>]*data-cc="${value}"[^>]*>`, 'g'))].map((m) => m[0]);

// === THE STAGES (the store's own actions: not what a leg is about) ==========
const stageRoom = (page, w, d, h) => page.ask(`(() => { ${S}.setRoom({ corners: [{ x: 0, y: 0 }, { x: ${w}, y: 0 }, { x: ${w}, y: ${d} }, { x: 0, y: ${d} }], height: ${h} }); return true; })()`);
/** The T81 kitchen (scripts/t81-kitchen.mjs, through the page's store), the knob left to the caller. */
async function stageT81Kitchen(page, { inframe = true, knob = false } = {}) {
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

/** A small PNG logo, 96 x 64 (3:2, so "keeping its ratio" can be read off the sheet), written by hand. */
function logoPng(file) {
  const W = 96; const H = 64;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y += 1) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x += 1) {
      const o = y * (W * 4 + 1) + 1 + x * 4;
      const edge = x < 3 || y < 3 || x >= W - 3 || y >= H - 3;
      const band = Math.abs((x - 12) - (y * 1.1)) < 7;
      const [r, g, b] = edge ? [27, 42, 74] : (band ? [196, 160, 82] : [245, 242, 235]);
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  return { file, w: W, h: H };
}

/**
 * A real drag of a piece UP by `upMm`, on the plane the app drags a free panel on: the vertical
 * plane through the panel's OWN back line (CLAUDE.md F16), which is its unit group's origin plane
 * (D1's report: `scripts/t75-harness.mjs AIM` with depthMm 0 for a panel).
 */
const AIM_UP = `(function (unitId, panelId, fromX, fromY, upMm) {
  const v = window.__cc.views.room; const T = v.three; let g = null; let mesh = null;
  v.scene.traverse((o) => { if (!g && o.userData && o.userData.ccUnitId === unitId) g = o; });
  if (!g) return null; g.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === panelId) mesh = o; });
  if (!mesh) return null; g.updateMatrixWorld(true);
  const inward = new T.Vector3(0, 0, 1).transformDirection(g.matrixWorld).normalize();
  const origin = new T.Vector3().setFromMatrixPosition(g.matrixWorld);
  const plane = new T.Plane().setFromNormalAndCoplanarPoint(inward, origin);
  const r = v.gl.domElement.getBoundingClientRect();
  const ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(((fromX - r.left) / r.width) * 2 - 1, -(((fromY - r.top) / r.height) * 2 - 1)), v.camera);
  const hit = new T.Vector3(); if (!ray.ray.intersectPlane(plane, hit)) return null;
  const px = (p) => { const q = p.clone().project(v.camera); return { x: r.left + (q.x * 0.5 + 0.5) * r.width, y: r.top + (-q.y * 0.5 + 0.5) * r.height }; };
  const to = px(hit.clone().add(new T.Vector3(0, upMm / 1000, 0))); const a = px(hit); const b = px(hit.clone().add(new T.Vector3(0, 0.001, 0)));
  // The drop at the exact point (CDP takes a fractional pixel), so the hand asks for 200 and not a pixel's rounding of it.
  return { x: Math.round(to.x * 100) / 100, y: Math.round(to.y * 100) / 100, pxPerMm: Math.hypot(b.x - a.x, b.y - a.y) };
})`;
async function dragUp(page, unitId, panelId, upMm) {
  const at = await reach(page, unitId, panelId);
  if (!at) return null;
  const to = await page.ask(`${AIM_UP}(${j(unitId)}, ${j(panelId)}, ${at.x}, ${at.y}, ${Number(upMm)})`);
  if (!to) return null;
  await page.dragFromTo(at.x, at.y, to.x, to.y, { steps: 24 });
  await page.sleep(800);
  return { from: at, to };
}

// === LEG 1 · HAWA, THE POCKET DOOR (F2, F3, F6) ============================
/** The engine's own figures of a pocket (`unitResult(id).hawa`, A2's one derivation), its first door. */
const hawaOf = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const h = r && r.hawa; if (!h) return null; const d = (h.doors || [])[0] || {};
  return { widthMm: h.widthMm, KT: h.KT, panelT: h.panel && h.panel.t, S: d.S, TB: d.TB, TH: d.TH, T1: d.T1, M: d.M, E1: d.E1, KT1: d.KT1, cls: d.cls, covers: d.covers, unitNums: d.unitNums,
    refusals: (h.refusals || []).map((x) => x.n + ': ' + x.message), notes: (h.notes || []).map((x) => x.n + ': ' + x.message) }; })()`);
/** The right panel's figure k of the POCKET DOOR section, read off the glass. */
const figureOf = (page, k) => page.ask(`(() => { const e = [...document.querySelectorAll('[data-pocket-figure-value="${k}"]')].find((x) => x.offsetParent); if (!e) return null; const m = (e.textContent || '').replace(/,/g, '').match(/-?\\d+(?:\\.\\d+)?/); return m ? Number(m[0]) : null; })()`);
const doorBoxOf = async (page, id) => { const s = await sceneOf(page, id); const k = s && Object.keys(s.pieces).find((x) => /POCKET-DOOR/.test(x)); return k ? s.pieces[k] : null; };
const doorTOf = (page, id) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; let t = null; v.scene.traverse((o) => { if (t == null && o.userData && o.userData.ccPocketDoor != null) { let a = o; while (a && (!a.userData || a.userData.ccUnitId == null)) a = a.parent; if (a && a.userData.ccUnitId === ${j(id)}) t = o.userData.ccPocketDoorT; } }); return t; })()`);
async function leg1(page) {
  await stageRoom(page, 6000, 3000, 2500);
  // THE STAGE: the project's fronts on an 18 board (a new PRO job's front type is 25), so the pocket's
  // panels take the owner's 22 (*"jesli jest 18 mm to daj zawsze 22 mm"*) and the door is the LISP's 572.5.
  await page.ask(`${S}.setFrontType('f1', { material_id: 'generic-18' })`);
  await page.sleep(600);
  note('F2', 'THE STAGE: a 6000 x 3000 room 2500 high; front type f1 on the generic 18 board (the store)', j(await page.ask(`(() => { const t = ((${S}.project.design.fronts || {}).types || [])[0] || {}; return { id: t.id, material: t.material_id }; })()`)));
  // A BUD 500 on a 580 run: the library's own row, its Width and Depth typed.
  const bud = await addFromLibrary(page, { category: 'Kitchen', groups: ['base-units'], ids: ['door-base'] });
  check('F2', 'Library > Kitchen > Base units > Standard (real clicks): a BUD in the room', bud.unit && bud.unit.type === 'BUD', 'one BUD', j(bud.unit || bud.why));
  if (!bud.unit) return;
  await closeLibrary(page);
  const budId = bud.unit.id;
  await selectUnit(page, budId);
  await sectionOpen(page, 'Carcass');
  const tw = await typeInto(page, '[data-unit-size-field="width"]', 500);
  const td = await typeInto(page, '[data-unit-size-field="depth"]', 580);
  const b0 = await unitRow(page, budId);
  check('F2', 'its Width typed 500 and its Depth 580 (a real click, Ctrl+A, the digits, Enter)', b0.w === 500 && b0.d === 580, '500 x 580', `fields ${j([tw.shown, td.shown])}; unit ${j([b0.x, b0.w, b0.h, b0.d])}`);

  // THE POCKET, from the library (the BUD selected: the row puts the pocket beside it).
  const pk = await addFromLibrary(page, { category: 'Kitchen', ids: ['hawa-pocket'], label: /HAWA pocket/i });
  if (!pk.unit) { push(PREP ? 'WAIT' : 'FAIL', 'F2', 'Library: the row "HAWA pocket (Concepta III)" (slices A2, B4)', 'a HAWA_POCKET in the room', pk.why || 'no unit'); return; }
  await closeLibrary(page);
  await page.sleep(1200);
  const pocketId = pk.unit.id;
  check('F2', `Library: "HAWA pocket (Concepta III)" (row ${pk.entry}, a real click): a HAWA_POCKET in the room`, pk.unit.type === 'HAWA_POCKET', 'HAWA_POCKET', j(pk.unit));
  let p0 = await unitRow(page, pocketId);
  let budNow = await unitRow(page, budId);
  const besideNow = () => near(p0.x, budNow.x + budNow.w) || near(p0.x + p0.w, budNow.x);
  if (!besideNow()) {
    const gapRight = p0.x - (budNow.x + budNow.w);
    const gapLeft = budNow.x - (p0.x + p0.w);
    const delta = Math.abs(gapRight) <= Math.abs(gapLeft) ? -gapRight : gapLeft;
    await safeRays(page);
    const drag = await dragAlong(page, pocketId, (await grabIds(page, pocketId))[0], delta);
    note('F2', `the library put the pocket at x ${p0.x}, not beside the BUD (${budNow.x} to ${budNow.x + budNow.w}): a real drag along the wall by ${delta}`, j(drag));
    await page.sleep(1200);
    p0 = await unitRow(page, pocketId);
    budNow = await unitRow(page, budId);
  }
  const parts = await partsOf(page, pocketId);
  const pocketParts = (parts || []).filter((p) => /^POCKET-/.test(p.part || '') || /^POCKET-/.test(p.id || ''));
  const named = (re) => pocketParts.filter((p) => re.test(p.id) || re.test(p.part || ''));
  const panels = named(/^POCKET-(A|B)(-[LR])?$/);
  const door = named(/^POCKET-DOOR/)[0];
  check('F2', 'the pocket\'s cut parts: POCKET-A, POCKET-B, POCKET-TOP, POCKET-BOTTOM, POCKET-DOOR (one door: A and B)', ['POCKET-A', 'POCKET-B', 'POCKET-TOP', 'POCKET-BOTTOM', 'POCKET-DOOR'].every((n) => named(new RegExp(`^${n}`)).length > 0),
    'the five parts', j(pocketParts.map((p) => `${p.id} ${p.w} x ${p.h} x ${p.t}`)));
  const S0 = door ? door.t : null;
  check('F2', 'the pocket panels in the FRONT material, 22 on an 18 front (*"jesli jest 18 mm to daj zawsze 22 mm"*): 22 + 55 + 22 = 99 wide', S0 === 18 && panels.length === 2 && panels.every((p) => p.t === 22) && near(p0.w, 99),
    'door S 18, panels 22, width 99', j({ S: S0, panels: panels.map((p) => [p.id, p.t]), width: p0.w }));
  check('F2', 'the pocket stands beside the BUD on the run\'s line, as high and as deep as the BUD lets it', besideNow() && near(p0.h, budNow.h, 1),
    `beside, ${budNow.h} high`, j({ pocket: [p0.x, p0.w, p0.h, p0.d], bud: [budNow.x, budNow.w, budNow.h, budNow.d] }));

  // THE RIGHT PANEL: POCKET DOOR.
  await selectUnit(page, pocketId);
  if (!(await need(page, 'F2', 'A3', 'the right panel\'s POCKET DOOR section', sectionLike(/pocket/i)))) return;
  const handWanted = near(p0.x, budNow.x + budNow.w) ? 'L' : 'R';
  const handNow = async () => page.ask('((document.querySelector(\'[data-pocket-hand]\') || { getAttribute: () => null }).getAttribute(\'data-pocket-hand\'))');
  const h0 = await handNow();
  if (h0 !== handWanted && await page.has(`[data-pocket-hand-chip="${handWanted}"]`)) await page.press(`[data-pocket-hand-chip="${handWanted}"]`);
  const covers = await page.ask('[...document.querySelectorAll(\'[data-pocket-covers-side]\')].map((e) => e.getAttribute(\'data-pocket-covers-side\') + \': \' + e.textContent.replace(/\\s+/g, \' \').trim())');
  const p1 = await unitRow(page, pocketId);
  check('F2', `POCKET DOOR: Doors 1, Hand ${handWanted} (the BUD on that side), Push by default (*"5 - tak"*), Door covers the BUD`, p1.pocket && p1.pocket.doors === 1 && p1.pocket.hand === handWanted && p1.pocket.push === true && covers.some((c) => c.startsWith(`${handWanted}:`) && c.includes(budNow.num)),
    j({ doors: 1, hand: handWanted, push: true, covers: budNow.num }), j({ hand: [h0, await handNow()], pocket: p1.pocket, covers }));
  const F = {
    TB: await figureOf(page, 'TB'), T1: await figureOf(page, 'T1'), M: await figureOf(page, 'M'), E1: await figureOf(page, 'E1'),
  };
  const H1 = await hawaOf(page, pocketId);
  const Z3 = Number(await page.ask(`((${PROFILE}.hawa || {}).gaps || {}).Z3 ?? 3`));
  note('F3', 'the engine\'s figures (unitResult(id).hawa, the LISP\'s mirror)', j(H1));
  check('F3', 'the right panel reads the engine\'s door: TB 572.5 on the BUD 500 and an 18 front (KIT_HAWA.lsp\'s rule; CLAUDE.md\'s 592 and 599 read the share otherwise), T1 567 (the 560 track caps it on the 580 cabinet), M 100.5, E1 472',
    F.TB === 572.5 && F.T1 === 567 && F.M === 100.5 && F.E1 === 472 && H1 && H1.TB === F.TB && H1.T1 === F.T1 && H1.M === F.M && H1.E1 === F.E1,
    'TB 572.5, T1 567, M 100.5, E1 472', j({ panel: F, engine: H1 && [H1.TB, H1.T1, H1.M, H1.E1] }));
  check('F3', 'the kit\'s own words hold on the glass: T1 = TB + 92 + Z3 - M, E1 = TB - M; 414 <= T1 <= 567, S + 3 <= M <= TB - 320; the door the engine cuts is TB wide',
    near(F.T1, F.TB + 92 + Z3 - F.M) && near(F.E1, F.TB - F.M) && F.T1 >= 414 && F.T1 <= 567 && F.M >= S0 + 3 && F.M <= F.TB - 320 && door && near(door.w, F.TB),
    `T1 ${F.TB + 92 + Z3 - F.M}, E1 ${F.TB - F.M}, M in ${S0 + 3}..${F.TB - 320}`, j({ ...F, door: door && [door.w, door.h, door.t] }));
  await domFrame(page, sectionLike(/pocket/i), 'f25-03-hawa-panel.png', 8, 1.5);

  // THE ROOM: CLOSED, THEN OPEN (the panel's Door row, a real click), then the viewer's Open all.
  await key(page, 'Escape');
  await frameOn(page, [budId, pocketId], { side: 0.3, up: 0.25 });
  await settleCamera(page);
  const closed = await doorBoxOf(page, pocketId);
  check('F6', 'the door closed: across the pocket and the BUD, TB along the wall, S thick, 3 in front of the fronts\' plane', closed && near(closed.size[0], F.TB, 1) && closed.size[2] < 40, `x ${F.TB}, z < 40`, j(closed));
  await shot(page, 'f25-01-hawa-closed.png');
  await selectUnit(page, pocketId);
  if (await need(page, 'F6', 'A5', 'the right panel\'s Door: Closed / Open row', 'document.querySelector(\'[data-pocket-door="open"]\')')) {
    await page.press('[data-pocket-door="open"]');
    await until(page, `(() => { const e = document.querySelector('[data-pocket-door-open]'); return e && e.getAttribute('data-pocket-door-open') === '1'; })()`, 4000);
    for (let t = 0; t < 30 && (await doorTOf(page, pocketId)) < 0.999; t += 1) await page.sleep(300);
    const tOpen = await doorTOf(page, pocketId);
    await key(page, 'Escape');
    await frameOn(page, [budId, pocketId], { side: 0.75, up: 0.55 });
    await settleCamera(page);
    const opened = await doorBoxOf(page, pocketId);
    check('F6', 'Door: Open (a real click): the door turned 90 degrees about its hinge edge and slid E1 into the pocket, its leading edge M proud', tOpen >= 0.999 && opened && opened.size[0] < 40 && near(opened.size[2], F.TB, 1) && closed && near(opened.max[2] - closed.min[2], F.M, 25),
      `the room's t 1, x < 40, z ${F.TB}, out to about M ${F.M} past the shut face`, j({ t: tOpen, opened, proud: opened && closed ? r1(opened.max[2] - closed.min[2]) : null }));
    await shot(page, 'f25-02-hawa-open.png');
    await selectUnit(page, pocketId);
    await page.press('[data-pocket-door="closed"]');
    for (let t = 0; t < 30 && (await doorTOf(page, pocketId)) > 0.001; t += 1) await page.sleep(300);
    await key(page, 'Escape');
  }
  const allBtn = '[...document.querySelectorAll(\'[data-open-all-doors="1"]\')].find((b) => b.offsetParent && !b.disabled)';
  const all = await toolbar(page, allBtn);
  for (let t = 0; t < 30 && (await doorTOf(page, pocketId)) < 0.999; t += 1) await page.sleep(300);
  const viaAll = await doorBoxOf(page, pocketId);
  check('F6', 'the viewer\'s Open all (a real click) slides the pocket door in too', all && viaAll && viaAll.size[0] < 40, 'the door in the pocket', j({ pressed: all, t: await doorTOf(page, pocketId), door: viaAll && viaAll.size }));
  if (all) await toolbar(page, allBtn);
  for (let t = 0; t < 30 && (await doorTOf(page, pocketId)) > 0.001; t += 1) await page.sleep(300);

  // A 750 DOOR ASKED: the BUD widened by its own field until the door the engine cuts is 750. On the 580 run
  // T1 is capped 567 by the track and M = 750 + 95 - 567 = 278 <= TB - 320 = 430: HAWA allows it, no #38.
  await selectUnit(page, budId);
  await sectionOpen(page, 'Carcass');
  let H = await hawaOf(page, pocketId);
  let width = 500 + (750 - (H ? H.TB : 572.5));
  for (let k = 0; k < 3; k += 1) {
    await typeInto(page, '[data-unit-size-field="width"]', width);
    H = await hawaOf(page, pocketId);
    if (!H || near(H.TB, 750, 0.01)) break;
    width += 750 - H.TB;
  }
  const b750 = await unitRow(page, budId);
  const p750 = await unitRow(page, pocketId);
  note('F3', 'the BUD\'s Width typed so the door is 750 (read back off the engine)', j({ bud: [b750.x, b750.w], pocket: [p750.x, p750.w], door: H && [H.TB, H.T1, H.M, H.E1] }));
  const f750 = await checkOpen(page);
  check('F3', 'the 750 door on the 580 run: M 278 proud, T1 567 (the 560 track caps it), deep enough: no #38 (*"raczej zawsze wystaja troche wiec nie ma problemu"*)', H && near(H.TB, 750, 0.01) && H.M === 278 && H.T1 === 567 && !f750.some((f) => f.n === 38) && !H.refusals.some((x) => /^38:/.test(x)),
    'TB 750, M 278, T1 567, no #38', j({ door: H && [H.TB, H.T1, H.M, H.E1], refusals: H && H.refusals, findings: f750.filter((f) => [37, 38, 47].includes(f.n)) }));
  // The door of a BASE run is TH 721.5 high: HAWA's table (160704) starts at 1200, so the kit refuses the
  // height in words (#37) and cuts the door as asked (the room refuses, the engine never squashes).
  const c37 = f750.filter((f) => f.n === 37);
  const c47 = f750.filter((f) => f.n === 47);
  check('F3', 'the base run\'s door is under HAWA\'s 1200 high: the Check says #37 in words (TH 1200 to 2700), red, the door cut as asked', c37.length > 0 && c37[0].level === 'red' && /TH \d+(\.\d+)? \(1200 to 2700\)/.test(c37[0].text) && H && H.TH < 1200,
    '#37 with the height', j({ c37, TH: H && H.TH }));
  check('F2', 'the panels 22 on the 18 front said as the owner asked (#47 "HAWA pocket panels 22: the hardware panel needs 19 mm minimum"), a note, not a fault', c47.length > 0 && c47[0].level !== 'red' && /19 mm/.test(c47[0].text),
    '#47 in words', j(c47));
  await checkClose(page);
  // #38 WHERE HAWA REFUSES: the same BUD made shallow (Depth 400: KT1 under 414, the hardware's shortest T1).
  await selectUnit(page, budId);
  await sectionOpen(page, 'Carcass');
  const d400 = await typeInto(page, '[data-unit-size-field="depth"]', 400);
  const H400 = await hawaOf(page, pocketId);
  const f400 = await checkOpen(page);
  const c38 = f400.filter((f) => f.n === 38);
  check('F3', 'the BUD typed 400 deep: KT1 400 is under HAWA\'s 414, the Check (a real click) says #38 in words, red, and the door is not squashed', d400.shown === '400' && c38.length > 0 && c38[0].level === 'red' && /HAWA/i.test(c38[0].text) && H400 && near(H400.TB, 750, 0.01),
    '#38 red in words, TB still 750', j({ c38, engine: H400 && { TB: H400.TB, KT1: H400.KT1, refusals: H400.refusals } }));
  await shot(page, 'f25-04-hawa-check38.png');
  await checkClose(page);
  await selectUnit(page, pocketId);
  const said38 = await page.ask('[...document.querySelectorAll(\'[data-pocket-refusal]\')].filter((e) => e.offsetParent).map((e) => e.getAttribute(\'data-pocket-refusal\') + \': \' + e.textContent.trim())');
  check('F3', 'the POCKET DOOR section says the same refusal under its figures', said38.some((x) => x.startsWith('38:')), '38 on the panel', j(said38));
}

// === LEG 2 · THE VANITY (F8 to F14) =========================================
/** The boxes whose trap's U is cut: the bottom notched (its outline more than a rectangle) and its back in two pieces. */
const uBoxesOf = (parts) => parts.filter((p) => p.part === 'DRAWER-BOTTOM' && p.outline > 4).map((b) => {
  const tag = b.id.replace(/-DNO$/, '');
  return { bottom: b.id, outline: b.outline, backs: parts.filter((p) => p.id.startsWith(`${tag}-BB-`)).map((p) => `${p.id} ${p.w} x ${p.h}`) };
});
async function leg2(page) {
  await stageRoom(page, 5000, 3000, 2500);
  const v = await addFromLibrary(page, {
    category: 'Kitchen', groups: ['bathroom'], ids: ['vanity-3'], label: /Vanity unit, 3 drawers/i,
  });
  if (!v.unit) { push(PREP ? 'WAIT' : 'FAIL', 'F14', 'Library: the group "Bathroom", the row "Vanity unit, 3 drawers" (slice B4)', 'a VANITY3 in the room', v.why || 'no unit'); return; }
  await closeLibrary(page);
  await page.sleep(1500);
  const id = v.unit.id;
  check('F14', `Library > Kitchen > Bathroom > "Vanity unit, 3 drawers" (row ${v.entry}, a real click): a VANITY3, 900 x 600 x 500`, v.unit.type === 'VANITY3' && v.unit.w === 900 && v.unit.h === 600 && v.unit.d === 500, 'VANITY3 900 x 600 x 500', j(v.unit));
  const u0 = await unitRow(page, id);
  const clearance = Number(await page.ask(`(${PROFILE}.room || {}).wallBackClearance ?? 0`));
  const voidMm = Number(await page.ask(`(${PROFILE}.vanity || {}).serviceVoidMm ?? 80`));
  const G = Number(await page.ask(`(${PROFILE}.board || {}).thickness ?? 18`));
  const parts = await partsOf(page, id);
  const rails = parts.filter((p) => /^RAIL-(TOP|BOTTOM)$/.test(p.id));
  const fronts = parts.filter((p) => p.part === 'DRAWER-FRONT');
  check('F9', `the engine: three equal overlay fronts, RAIL-TOP and RAIL-BOTTOM 100 high in the board's ${G}, no BACK (*"nie ma plecow ... tylko sa poziome poprzeczki"*)`, fronts.length === 3 && new Set(fronts.map((f) => f.h)).size === 1
    && rails.length === 2 && rails.every((r) => near(r.h, 100) && near(r.t, G)) && !parts.some((p) => p.part === 'BACK'),
  `3 equal fronts, 2 rails 100 x ${G}, no BACK`, j({ fronts: fronts.map((f) => [f.id, f.w, f.h]), rails: rails.map((r) => [r.id, r.w, r.h, r.t]), back: parts.filter((p) => p.part === 'BACK').map((p) => p.id) }));
  check('F8', `wall_gap = the clearance ${clearance} + the service void ${voidMm} (*"3 - 80"*)`, near(u0.wallGap, clearance + voidMm), `${clearance + voidMm}`, `${u0.wallGap}`);
  const sc = await sceneOf(page, id);
  const sides = Object.entries(sc ? sc.pieces : {}).filter(([k]) => /^(BUL|BUR)$/.test(k)).map(([, b]) => b);
  const railBoxes = Object.entries(sc ? sc.pieces : {}).filter(([k]) => /^RAIL-/.test(k));
  // The carcass's back line is the rails' back face (they stand where KIT_BUDR's back stands, the sides butting them).
  check('F12', 'the room: the carcass stands the void off the wall (its back line, the two rails, at plan z = wall_gap), both rails drawn 100 high, no back between them', railBoxes.length === 2 && railBoxes.every(([, b]) => near(b.min[2], u0.wallGap, 1.5) && near(b.size[1], 100, 1)) && sides.length === 2 && sides.every((b) => b.min[2] >= u0.wallGap - 0.5) && !Object.keys(sc.pieces).includes('BACK'),
    `the rails' back at z ${u0.wallGap}, 100 high; no BACK`, j({ rails: railBoxes.map(([k, b]) => [k, b.min[2], b.size[1], b.size[2]]), sides: sides.map((b) => b.min[2]) }));
  const tops = await page.ask(`${S}.worktopsOf().filter((w) => (w.unitIds || []).includes(${j(id)})).map((w) => ({ id: w.id, d: w.geometry && w.geometry.d, h: w.geometry && w.geometry.h }))`);
  check('F10', 'the worktop at birth, over the vanity, its depth reaching the wall over the void (*"5 - blat osobny element jak worktop"*)', tops.length === 1 && tops[0].d >= u0.d + voidMm, `one worktop, d >= ${u0.d} + ${voidMm}`, j(tops));
  check('F11', 'one basin at birth (Sinks 1), set into the top', sc && sc.basins === 1, '1 basin', `${sc && sc.basins}`);
  const U1 = uBoxesOf(parts);
  check('F8', 'the trap\'s U in the top drawer\'s box (*"wyciecie u dookola"*): its bottom notched, its back in two pieces either side of the trap', U1.length === 1 && U1[0].backs.length === 2, 'one box: a notched bottom, two back pieces', j(U1));
  // The basin seen through the top: the camera over the front, looking down into the bowl.
  await key(page, 'Escape');
  await frameOn(page, [id], { side: 0.25, up: 1.1, pad: 1.5 });
  await settleCamera(page);
  await shot(page, 'f25-05-vanity-room.png');

  // THE RIGHT PANEL: VANITY, then Section 1's Columns.
  await selectUnit(page, id);
  const title = await sectionLikeOpen(page, /^vanity$/i);
  if (!(await need(page, 'F14', 'B4', 'the right panel\'s Vanity section', sectionLike(/^vanity$/i)))) return;
  note('F14', 'the right panel\'s section', title);
  const pressHook = async (F, sel, what) => { if (!(await need(page, F, 'B4', what, `[...document.querySelectorAll('${sel}')].find((e) => e.offsetParent)`))) return false; await page.press(sel); await page.sleep(1500); return true; };
  if (!(await page.ask('Boolean([...document.querySelectorAll(\'[data-drawer-columns-count="2"]\')].find((e) => e.offsetParent))'))) await sectionOpen(page, 'Section 1');
  await pressHook('F9', '[data-drawer-columns-count="2"]', 'Section 1\'s Columns 2');
  await pressHook('F11', '[data-vanity-sinks-count="2"]', 'Vanity\'s Sinks 2');
  const p2 = await partsOf(page, id);
  const u2 = await unitRow(page, id);
  const bottoms = p2.filter((p) => p.part === 'DRAWER-BOTTOM');
  check('F9', 'Columns 2 (a real click): a divider mid-width and six boxes, three equal fronts a column (*"patrz szafa"*)', u2.columns === 2 && p2.some((p) => /DIVIDER/.test(p.id)) && bottoms.length === 6 && new Set(p2.filter((p) => p.part === 'DRAWER-FRONT').map((f) => f.h)).size === 1,
    'DIVIDER, 6 boxes, equal fronts', j({ columns: u2.columns, divider: p2.filter((p) => /DIVIDER/.test(p.id)).map((p) => [p.id, p.w, p.h]), boxes: bottoms.length }));
  const U2 = uBoxesOf(p2);
  check('F8', 'Sinks 2 at columns 2: the U in each column\'s top box', u2.sinks === 2 && U2.length === 2 && U2.every((b) => b.backs.length === 2), 'two boxes cut', j(U2));
  // Two 520 basins over a 900 vanity at columns 2 run past the slab: the Check says so and names the width.
  let f48 = await checkOpen(page);
  // #48 says two things in words (worktop.js fitBasins; KIT_VANITY.lsp D25): basins the TOP cannot hold (and
  // the width that holds them), and a bowl that meets what stands under the top (and the deepest that clears).
  const WIDTH_48 = /make the vanity (\d+) wide/;
  const BOWL_48 = /deepest bowl that clears/;
  const c48 = f48.filter((f) => f.n === 48);
  const widthSaid = c48.find((f) => WIDTH_48.test(f.text));
  const wide = widthSaid ? Number(widthSaid.text.match(WIDTH_48)[1]) : NaN;
  check('F11', 'two 520 basins do not fit the top of the 900 vanity at columns 2: the Check says it in words (#48) and names the width, nothing squashed', Boolean(widthSaid) && widthSaid.level !== 'red' && Number.isFinite(wide),
    '#48 with the width', j(c48));
  await checkClose(page);
  if (Number.isFinite(wide)) {
    await selectUnit(page, id);
    await sectionOpen(page, 'Carcass');
    await typeInto(page, '[data-unit-size-field="width"]', wide);
  }
  const u2b = await unitRow(page, id);
  await key(page, 'Escape');
  await frameOn(page, [id], { side: 0.25, up: 1.1, pad: 1.5 });
  await settleCamera(page);
  const sc2 = await sceneOf(page, id);
  f48 = await checkOpen(page);
  check('F11', `the Width typed ${wide} as the Check said: two basins at the column centres, #48's width sentence gone`, u2b.w === wide && sc2 && sc2.basins === 2 && !f48.some((f) => f.n === 48 && WIDTH_48.test(f.text)),
    '2 basins, no #48 width', j({ w: u2b.w, basins: sc2 && sc2.basins, c48: f48.filter((f) => f.n === 48) }));
  const bowl = f48.filter((f) => f.n === 48 && BOWL_48.test(f.text));
  note('F11', 'a bowl that meets what stands under the top is said in #48 (KIT_VANITY.lsp D25), with the deepest that clears; never clamped', bowl.length ? `${bowl[0].level}: ${bowl[0].text}` : 'none said');
  await checkClose(page);
  await shot(page, 'f25-06-vanity-columns2-sinks2.png');

  // FLOATING AT 300.
  await selectUnit(page, id);
  await sectionLikeOpen(page, /^vanity$/i);
  if (await pressHook('F13', '[data-vanity-mount-choice="floating"]', 'Vanity\'s Stands: Floating')) {
    if (await need(page, 'F13', 'B4', 'the Height from the floor field', 'document.querySelector(\'[data-vanity-float-height="1"]\')')) await typeInto(page, '[data-vanity-float-height="1"]', 300);
  }
  const u3 = await unitRow(page, id);
  const p3 = await partsOf(page, id);
  await key(page, 'Escape');
  await frameOn(page, [id], { side: 0.5, up: 0.15, pad: 1.6 });
  await settleCamera(page);
  const sc3 = await sceneOf(page, id);
  const sides3 = Object.entries(sc3 ? sc3.pieces : {}).filter(([k]) => /^(BUL|BUR)$/.test(k)).map(([, b]) => b);
  check('F13', 'Floating (a real click) at 300: no plinth, no legs, the carcass hung 300 off the floor', u3.floating === true && u3.floatHeight === 300 && !p3.some((p) => p.part === 'PLINTH') && sides3.length === 2 && sides3.every((b) => near(b.min[1], 300, 1.5)),
    'floating, 300, no PLINTH, the sides from y 300', j({ floating: u3.floating, h: u3.floatHeight, plinth: p3.filter((p) => p.part === 'PLINTH').length, sides: sides3.map((b) => b.min[1]) }));
  await shot(page, 'f25-07-vanity-floating.png');
  const bom = await bomText(page, ['[data-bom-order-tab="1"]', '[data-bom-purchase-tab="1"]']);
  const hangers = (bom.match(/[^\n]*hanger[^\n]*/i) || [null])[0];
  check('F13', 'the BOM (the toolbar\'s own button, its Order and BOM tabs): the hanging brackets, 2 (*"6 - do BOM tez"*)', Boolean(hangers), 'a hanger line', String(hangers));
  await bomClose(page);
  const fz = await checkOpen(page);
  const c45 = fz.filter((f) => f.n === 45);
  check('F12', 'Check: the service void a note (#45 "Service void 80 behind the vanity for the pipes"), never a fault', c45.length > 0 && c45.every((f) => f.level === 'note') && /Service void 80/.test(c45[0].text), '#45, a note', j(c45));
  await checkClose(page);
  // The CNC sheet: the U on the top boxes' bottoms.
  const cnc = await viewMode(page, 'cnc');
  const uParts = uBoxesOf(await partsOf(page, id));
  const drawn = [];
  for (const b of uParts) {
    drawn.push(await page.ask(`(() => { const g = document.querySelector('[data-cnc-part=${j(b.bottom)}]'); if (!g) return { id: ${j(b.bottom)}, on: false };
      const poly = [...g.querySelectorAll('polygon')].map((x) => (x.getAttribute('points') || '').trim().split(/\\s+/).length); return { id: ${j(b.bottom)}, on: true, points: poly }; })()`));
  }
  // A part's OUTLINE is the first polygon it draws (CncView.jsx: the outline, then the holes; a hole is a 15-point polygon).
  const outlineOk = (d) => d.on && d.points.length > 0 && d.points[0] > 4 && d.points[0] === (uParts.find((b) => b.bottom === d.id) || {}).outline;
  check('F8', 'CNC (the toolbar\'s own button): the U on each top box\'s bottom, drawn by the outline road (the outline polygon is the engine\'s, more than 4 points)', cnc && drawn.length === 2 && drawn.every(outlineOk),
    'two bottoms, each outline the engine\'s', j(drawn.map((d) => ({ ...d, engine: (uParts.find((b) => b.bottom === d.id) || {}).outline }))));
  if (uParts[0]) await cncPartFrame(page, uParts[0].bottom, 'f25-08-vanity-cnc-u.png');
  else await shot(page, 'f25-08-vanity-cnc-u.png');
  await viewMode(page, '3d');
}

// === LEG 3 · THE CLOUD: FLUTED AS REEDS (F15) ===============================
async function settingsFronts(page) {
  await menu(page, 'Settings', 'Settings');
  if (!(await page.has('[data-style-slot]'))) {
    const step = await boxOf(page, '[...document.querySelectorAll(\'[role="dialog"] button, [data-modal-shell] button\')].find((b) => b.offsetParent && /Fronts$/.test(b.textContent.trim()) && /^5\\.3/.test(b.textContent.trim()))');
    if (step) await clickWith(page, step.x, step.y);
    await page.sleep(800);
  }
  return until(page, 'Boolean([...document.querySelectorAll(\'[data-style-slot]\')].find((b) => b.offsetParent))', 6000);
}
async function leg3(page) {
  const ids = await stageT81Kitchen(page, { inframe: false, knob: true });
  note('F15', 'THE STAGE: the T81 kitchen, lay-on, the knob (scripts/t81-kitchen.mjs, through the store)', j(await page.ask(`${S}.units.map((u) => [u.type, u.params.unit_num, u.position.x_mm, u.params.width])`)));
  const opened = await settingsFronts(page);
  check('F15', 'Settings > Settings... > 5.3 Fronts (real clicks): the front types\' style slots', opened, 'the slots', String(opened));
  if (!opened) return;
  await page.press('[data-style-slot="f1"]');
  await until(page, 'Boolean(document.querySelector(\'[data-style-tile="FL"]\'))', 5000);
  await page.press('[data-style-tile="FL"]');
  await until(page, 'Boolean(document.querySelector(\'[data-front-decoration="FL"]\'))', 5000);
  await page.sleep(800);
  check('F15', 'the style tile Fluted (a real click): the FL controls under the slot', await page.has('[data-front-decoration="FL"]'), 'data-front-decoration FL', String(await page.has('[data-front-decoration="FL"]')));
  if (!(await need(page, 'F15', 'C1', 'the FL profile select (groove / reed)', 'document.querySelector(\'[data-decoration-field="fluteProfile"]\')'))) { await closeModals(page); return; }
  const prof = await page.ask('(document.querySelector(\'[data-decoration-field="fluteProfile"]\') || {}).value');
  check('F15', 'the profile is reed by default (*"daj wariant b czyli na styk"*)', prof === 'reed', 'reed', String(prof));
  if (prof !== 'reed') await choose(page, 'document.querySelector(\'[data-decoration-field="fluteProfile"]\')', 'reed');
  if (await need(page, 'F15', 'C1', 'the reed diameter row (the ladder and the field)', 'document.querySelector(\'[data-decoration-field="reedDiameterMm"]\')')) {
    const ladder = await page.ask('[...document.querySelectorAll(\'[data-reed-ladder]\')].filter((b) => b.offsetParent).map((b) => b.getAttribute(\'data-reed-ladder\'))');
    if (ladder.includes('20')) await page.press('[data-reed-ladder="20"]'); else await typeInto(page, '[data-decoration-field="reedDiameterMm"]', 20);
    await page.sleep(800);
    const shown = await page.ask('(document.querySelector(\'[data-decoration-field="reedDiameterMm"]\') || {}).value');
    check('F15', 'the reed diameter 20 by its ladder (a real click; *"do tego daj ustawienie srednicy walkow tez"*): the ladder 16, 20, 25 beside the free field', Number(shown) === 20 && j(ladder) === j(['16', '20', '25']), 'ladder 16 / 20 / 25, the field 20', j({ ladder, shown }));
  }
  await domFrame(page, 'document.querySelector(\'[data-front-decoration="FL"]\')', 'f25-09-reed-settings.png', 10, 2);
  await closeModals(page);
  await page.sleep(1500);
  const inset = Number(await page.ask(`((((${PROFILE}.front || {}).decoration || {}).FL) || {}).grooveInsetMm ?? 50`));
  const leaves = [];
  for (const k of ['a', 'b', 'c', 'w']) for (const p of (await partsOf(page, ids[k])).filter((x) => (x.part === 'FRONT' || x.part === 'DRAWER-FRONT') && !/-(AM|STRIP)/.test(x.id))) leaves.push({ unit: k, ...p });
  const want = (p) => Math.floor((p.w - 2 * inset) / 20 + 1e-6);
  // The law is geometric: the valleys one diameter apart (touching, no flat between), the row centred on the
  // leaf (the remainder split), and as many as the field holds (one cutter path per valley: N - 1 between N
  // reeds, N + 1 with the two at the margins; the ledger says which the engine cut).
  const reedLaw = (p) => {
    if (!p.deco || p.deco.style !== 'FL' || p.deco.parameters.fluteProfile !== 'reed' || Number(p.deco.parameters.reedDiameterMm) !== 20 || p.deco.reeds < 1) return false;
    const xs = p.deco.reedAt.map((c) => Number(c[0])).sort((a, b) => a - b);
    const ys = p.deco.reedAt.map((c) => Number(c[1])).sort((a, b) => a - b);
    const along = (xs[xs.length - 1] - xs[0]) >= (ys[ys.length - 1] - ys[0]) ? xs : ys;
    const span = along === xs ? p.w : p.h;
    const steps = along.slice(1).map((c, i) => c - along[i]);
    return along.length > 1 && steps.every((d) => near(d, 20, 0.05)) && near(along[0] + along[along.length - 1], span, 0.6) && Math.abs(p.deco.reeds - want(p)) <= 1;
  };
  // A leaf the reeds cannot be cut on (a drawer front: its back fixing screws, T76's back-bore law) is refused
  // in words and cut plain, never squashed: the walk reads the refusal where the engine gives it.
  const refused = leaves.filter((p) => p.deco && p.deco.status === 'blocked');
  const cut = leaves.filter((p) => !refused.includes(p));
  check('F15', `every door FL reed 20 (*"daj wariant b czyli na styk"*): the valleys 20 apart, the row centred, (w - 2 x ${inset}) / 20 reeds and their two margin valleys`, cut.length >= 4 && cut.every(reedLaw),
    'the reed law on every leaf the engine cuts', j(cut.map((p) => `${p.id} ${p.w} x ${p.h}: ${p.deco ? `${p.deco.parameters.fluteProfile} ${p.deco.parameters.reedDiameterMm}, ${p.deco.reeds} valleys (formula ${want(p)} reeds), first ${j(p.deco.reedAt[0])}, ok ${reedLaw(p)}` : 'none'}`)));
  const words = await page.ask(`${S}.allResults().flatMap((e) => (e.result.warnings || []).filter((w) => /FRONT_DECORATION/.test(w.code)).map((w) => w.code + ': ' + w.message))`);
  check('F15', `a leaf the reeds cannot be cut on is refused in words, never squashed (${refused.length} refused here: ${refused.map((p) => p.id).join(', ') || 'none'}); a remainder the diameter does not divide is said`, refused.every((p) => p.deco.reeds === 0 && words.some((w) => w.includes(`${p.id}:`))) && cut.filter((p) => !near(((p.w - 2 * inset) / 20) % 1, 0, 1e-6)).every((p) => words.some((w) => /REMAINDER/.test(w) && w.includes(`${p.id}:`))),
    'each refused leaf named in a warning', j({ refused: refused.map((p) => `${p.id} ${p.w} x ${p.h} ${p.deco.status}: ${p.deco.problems.slice(0, 2).join(' | ')}`), words: words.slice(0, 4) }));
  note('F15', 'the board left under the valley, the front less the radius (#46 "Reeds leave N mm under the valley" when under 10)', j(leaves.map((p) => [p.id, p.t, r1(p.t - 10)]).slice(0, 4)));
  // The room: the reeds on the face.
  await frameOn(page, [ids.a], { side: 0.25, up: 0.1, pad: 1.1 });
  await settleCamera(page);
  const reedMeshes = await page.ask(`(() => { const v = window.__cc.views.room; const out = []; v.scene.traverse((o) => { const d = o.isMesh && o.geometry && o.geometry.userData && o.geometry.userData.frontDecoration; if (d) { const n = o.geometry.attributes && o.geometry.attributes.position ? o.geometry.attributes.position.count : 0; out.push({ id: o.userData && o.userData.ccPanelId, style: d.style, vertices: n }); } }); return out; })()`);
  // The room builds each leaf's solid from the engine's record (frontDecorationSolid.js marks the style; the
  // valleys are the engine's swept surfaces): every FL leaf of the base and wall units a decorated solid.
  const flLeaves = cut.map((p) => p.id);
  check('F15', 'the room draws the reeds: every reeded leaf a decorated solid (frontDecorationSolid, marked FL), built from the reed record', flLeaves.length > 0 && flLeaves.every((pid) => reedMeshes.some((m) => m.id === pid && m.style === 'FL')),
    `the solids of ${flLeaves.join(', ')}`, j(reedMeshes.slice(0, 8)));
  await shot(page, 'f25-10-reed-room.png');
  // The fronts sheet.
  const names = await openSet(page);
  const fronts = await sheetOnGlass(page, names.find((n) => /Fronts$/.test(n)));
  const deco = dataCc(fronts, 'front-decoration');
  const totalReeds = leaves.reduce((s, p) => s + (p.deco ? p.deco.reeds : 0), 0);
  check('F15', 'the fronts sheet draws the reeds as T81 draws the grooves (front-decoration entities, at least one per reed)', deco.length >= totalReeds && totalReeds > 0, `>= ${totalReeds}`, `${deco.length}`);
  await frameOf(fronts, 'f25-11-reed-fronts-sheet.png');
  await closeModals(page);
}

// === LEG 4 · THE FREE PANEL IN HAND (F16 to F19) ============================
async function leg4(page) {
  await stageRoom(page, 5000, 3000, 2500);
  const chimney = await page.ask(`${S}.addWallSlope({ kind: 'chimney', wall: 0, x_mm: 2500, width: 600, depth: 350 })`);
  note('F17', 'THE STAGE: a 5000 x 3000 room 2500 high, a chimney on wall 1 at x 2500, 600 wide, 350 deep (the store)', j({ chimney }));
  const fp = await addFromLibrary(page, { category: 'Kitchen', groups: ['extras'], ids: ['free-standing-panels'] });
  check('F16', 'Library > Kitchen > Extras > Free-standing panel (real clicks): a FREE_PANEL in the room', fp.unit && fp.unit.type === 'FREE_PANEL', 'FREE_PANEL', j(fp.unit || fp.why));
  if (!fp.unit) return;
  await closeLibrary(page);
  const id = fp.unit.id;
  await key(page, 'Escape');
  await frameOn(page, [id], { side: 0.15, up: 0.2, pad: 2.6 });
  await settleCamera(page);
  note('F25', 'the room\'s pointerless meshes (a chimney\'s faces, Room.jsx raycast null) given a no-op for the walk\'s pixel finder', String(await safeRays(page)));
  // UP BY 200, A REAL DRAG.
  const before = await unitRow(page, id);
  const drag = await dragUp(page, id, 'FP', 200);
  const after = await unitRow(page, id);
  const tol = drag && drag.to.pxPerMm ? Math.max(3, 1.5 / drag.to.pxPerMm) : 3;
  check('F16', `the panel grabbed and dragged UP 200 by a real mouse (mount_height read back, within one pixel: ${r1(tol)} mm)`, drag && near((after.mount || 0) - (before.mount || 0), 200, tol) && after.x === before.x,
    `mount ${(before.mount || 0) + 200}, x ${before.x}`, j({ before: [before.mount, before.x], after: [after.mount, after.x], drag }));
  await shot(page, 'f25-12-panel-dragged-up.png');
  // ON THE CHIMNEY'S FRONT (Attach, the typed road), THEN 1200 LONG.
  await selectUnit(page, id);
  if (!(await need(page, 'F17', 'chat-fix 25.10 (FROZEN 5)', 'the Attach select', 'document.querySelector(\'[data-attach-select="1"]\')'))) return;
  const key0 = `obstacle:${chimney}:front`;
  const picked = await choose(page, 'document.querySelector(\'[data-attach-select="1"]\')', key0);
  const onFront = await unitRow(page, id);
  check('F17', 'Attach to: the chimney\'s front (the native select, a real click, the arrows, Enter)', picked.ok && onFront.x === 2500 && onFront.inset === 340, 'x 2500, inset 340', j({ picked: picked.label || picked.why, unit: [onFront.x, onFront.inset, onFront.mount] }));
  // The Length field: on the right panel, or on the piece (a double click picks it).
  if (!(await page.has('[data-free-panel-length="1"]'))) {
    const at = await reach(page, id, 'FP');
    if (at) { await page.dblclick(at.x, at.y); await page.sleep(1500); }
  }
  if (!(await need(page, 'F17', 'the house (ElementProperties)', 'the panel\'s Length field', 'document.querySelector(\'[data-free-panel-length="1"]\')'))) return;
  const mark = await markSaid(page);
  const len = await typeInto(page, '[data-free-panel-length="1"]', 1200);
  const grown = await unitRow(page, id);
  const said = await saidSince(page, mark);
  const codes = await findingsNow(page);
  check('F17', 'Length typed 1200 on the chimney\'s front: 1200, no notice, x 2500 kept, no UNIT_OVERLAP', near(grown.length ?? grown.w, 1200) && said.length === 0 && grown.x === 2500 && !codes.includes('UNIT_OVERLAP'),
    '1200, silent, x 2500', j({ field: len.shown, length: grown.length, w: grown.w, x: grown.x, said, codes }));
  await frameOn(page, [id], { side: 0.3, up: 0.25, pad: 1.6 });
  await settleCamera(page);
  await shot(page, 'f25-13-panel-chimney-1200.png');
  // THICKNESS 36, VISIBLE.
  if (!(await page.has('[data-free-panel-thickness="1"]'))) {
    const at = await reach(page, id, 'FP');
    if (at) { await page.dblclick(at.x, at.y); await page.sleep(1500); }
  }
  const ladder = await page.ask('[...document.querySelectorAll(\'[data-free-panel-thickness-step]\')].filter((b) => b.offsetParent).map((b) => b.getAttribute(\'data-free-panel-thickness-step\'))');
  note('F18', 'the thickness ladder beside the field (PROPOSED 18, 22, 25, 30, 36; slice D2)', j(ladder));
  const thick = ladder.includes('36') ? (await page.press('[data-free-panel-thickness-step="36"]'), { ok: true, via: 'ladder' }) : await typeInto(page, '[data-free-panel-thickness="1"]', 36);
  await page.sleep(1200);
  const fpPart = (await partsOf(page, id)).find((p) => p.id === 'FP');
  const lb = await localBox(page, id, 'FP');
  const thin = lb ? Math.min(lb.x[1] - lb.x[0], lb.y[1] - lb.y[0], lb.z[1] - lb.z[0]) : null;
  const t36 = await unitRow(page, id);
  check('F18', 'Thickness 36: the engine\'s board 36 and box 36, the room\'s board 36, the length kept', fpPart && fpPart.t === 36 && fpPart.box && near(fpPart.box.d, 36) && near(thin, 36, 0.6) && near(t36.length ?? t36.w, 1200),
    'FP t 36, box.d 36, the mesh 36 thick', j({ thick, part: fpPart && { t: fpPart.t, d: fpPart.box && fpPart.box.d }, mesh: lb, thin, length: t36.length ?? t36.w }));
  await key(page, 'Escape');
  await frameOn(page, [id], { side: 0.65, up: 0.3, pad: 1.4 });
  await settleCamera(page);
  await shot(page, 'f25-14-panel-thickness-36.png');
}

// === LEG 5 · THE DRAWINGS FOR THE CLIENT (F20 to F24) =======================
async function chooseLogo(page, file) {
  let chooser = null;
  const onMsg = (e) => { try { const msg = JSON.parse(e.data); if (msg.method === 'Page.fileChooserOpened') chooser = msg.params; } catch { /* not ours */ } };
  page.socket.addEventListener('message', onMsg);
  await page.send('Page.setInterceptFileChooserDialog', { enabled: true });
  // "Choose image" is a label over a hidden file input (DrawingModal.jsx): the click on the label opens the chooser.
  const at = await boxOf(page, '[...document.querySelectorAll(\'[data-title-block-logo-choose="1"]\')].find((b) => b.offsetParent)');
  if (at) await clickWith(page, at.x, at.y);
  for (let t = 0; t < 40 && !chooser; t += 1) await page.sleep(150);
  if (chooser) await page.send('DOM.setFileInputFiles', { files: [file], backendNodeId: chooser.backendNodeId });
  await page.send('Page.setInterceptFileChooserDialog', { enabled: false });
  page.socket.removeEventListener('message', onMsg);
  await page.sleep(2000);
  return Boolean(chooser);
}
const logoImages = (svg) => dataCc(svg, 'logo').filter((t) => /^<image\b/.test(t) && /data-layer="SHEET_MUTED"/.test(t));
async function leg5(page) {
  const ids = await stageT81Kitchen(page, { inframe: true, knob: false });
  const handle = await page.ask(`(() => { const d = ${S}.project.design || {}; return { handle: d.handle ?? null, handles: (d.hardware || {}).handles ?? null, runners: d.runners ?? null }; })()`);
  note('F22', 'THE STAGE: the T81 kitchen, in-frame, NO handle chosen (scripts/t81-kitchen.mjs with knob false, through the store)', j({ units: await page.ask(`${S}.units.map((u) => [u.type, u.params.unit_num, u.params.width, u.params.depth])`), handle }));
  const logo = logoPng(join(SCRATCH, 'logo.png'));
  let names = await openSet(page);
  note('F25', 'the sheet buttons', j(names));
  // THE LOGO: the title block opened, "Choose image" (a real click; the PNG handed to the chooser it opens).
  if (await page.has('[data-title-block="1"]') && !(await page.ask('document.querySelector(\'[data-title-block="1"]\').open'))) await page.press('[data-title-block="1"] > summary');
  let logoOn = false;
  if (await need(page, 'F20', 'E1', 'the title block\'s LOGO row, "Choose image"', 'document.querySelector(\'[data-title-block-logo-choose="1"]\')')) {
    const opened = await chooseLogo(page, logo.file);
    const preview = await page.has('[data-title-block-logo="1"]');
    check('F20', 'Title block > Logo > "Choose image" (a real click): the file chooser opened, took the PNG, the row shows it', opened && preview, 'a chooser, the preview', j({ opened, preview }));
    await domFrame(page, 'document.querySelector(\'[data-title-block="1"]\')', 'f25-15-logo-row.png', 8, 1.5);
    logoOn = opened;
  }
  // THE SHEETS, every one pressed; the logo on each title block.
  const svgs = {};
  const logos = [];
  for (const n of names) {
    svgs[n] = await sheetOnGlass(page, n);
    const imgs = logoImages(svgs[n]);
    logos.push({ sheet: n, n: imgs.length, wh: imgs[0] ? [num(imgs[0], 'width'), num(imgs[0], 'height')] : null });
  }
  if (logoOn) {
    check('F20', 'the logo on every sheet\'s title block: one image on SHEET_MUTED (data-cc logo), fitted into the 24 x 24 box keeping its 3:2 (24 x 16)', logos.every((l) => l.n === 1 && l.wh && near(l.wh[0], 24, 0.01) && near(l.wh[1], 16, 0.01)),
      'one 24 x 16 image per sheet', j(logos));
  }
  // THE FRONTS SHEET: FRONT . GAP . FRONT, LEAF . GAP . LEAF, the knob of 30 on every leaf.
  const frontsName = names.find((n) => /Fronts$/.test(n));
  const fronts = svgs[frontsName] || '';
  const dims = textsOn(fronts, 'DIMENSIONS').map((t) => t.text);
  check('F21', 'the BUDR2\'s height chain FRONT . GAP . FRONT: 363 . 3 . 360 read off the glass (*"nie pokazuje dokladnie wymiarow frontow i przerw"*), no 366', dims.includes('363') && dims.includes('360') && dims.includes('3') && !dims.includes('366'),
    '363, 3, 360; no 366', j(dims));
  check('F21', 'the BUD 800\'s width chain LEAF . GAP . LEAF: 376.5 . 3 . 376.5', dims.filter((d) => d === '376.5').length >= 2 && dims.filter((d) => d === '3').length >= 2, '376.5 twice and the gaps', j(dims.filter((d) => /^(376\.5|3)$/.test(d))));
  const leaves = leavesOf(fronts);
  const knobs = tagsOn(fronts, 'circle', 'HANDLES').map((t) => ({ cx: num(t, 'cx'), cy: num(t, 'cy'), r: num(t, 'r') }));
  const scale = sheetScale(fronts);
  const bare = leaves.filter((l) => !knobs.some((k) => k.cx > l.x && k.cx < l.x + l.w && k.cy > l.y && k.cy < l.y + l.h));
  check('F22', `no handle chosen: the default knob of 30 on every leaf (*"nie widac wogole zeby bylo jakiekolwiek handles"*), HANDLES circles of r 15 / ${scale || '?'}`, leaves.length === 6 && bare.length === 0 && knobs.length >= leaves.length && scale && knobs.every((k) => near(k.r, 15 / scale, 0.02)),
    `6 leaves, each a knob of r ${scale ? r1(1500 / scale) / 100 : '?'}`, j({ leaves: leaves.length, knobs: knobs.length, bare: bare.length, radii: [...new Set(knobs.map((k) => k.r))], scale }));
  await frameOf(fronts, 'f25-16-fronts-sheet.png');
  // THE BASE PLAN: the plinth as ONE dashed line on PLINTH_HIDDEN.
  const plan = svgs[names.find((n) => /base units/i.test(n))] || '';
  const ph = linesOf(plan, 'PLINTH_HIDDEN');
  const shelvesDashed = linesOf(plan, 'SHELVES').filter((l) => l.dashed);
  const horiz = (l) => Math.abs(l.y1 - l.y2) < 0.01;
  const overlap = (a, b) => Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2)) - Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2)) > 1;
  const doubled = ph.filter(horiz).filter((a) => [...ph, ...shelvesDashed].filter(horiz).some((b) => b !== a && overlap(a, b) && Math.abs(a.y1 - b.y1) > 0.05 && Math.abs(a.y1 - b.y1) < 2.5));
  const legendRow = ['line', 'rect', 'path'].some((k) => tagsOn(plan, k, 'PLINTH_HIDDEN', { legend: true }).some((t) => /data-cc="legend"/.test(t)));
  check('F24', 'the base plan: the plinth ONE dashed line on PLINTH_HIDDEN (*"bedzie jedna linia typu przerywana a nie podwojna"*), no second face beside it, its legend row', ph.length > 0 && ph.every((l) => l.dashed) && doubled.length === 0 && legendRow,
    'dashed PLINTH_HIDDEN, single, in the legend', j({ plinthHidden: ph.length, dashed: ph.filter((l) => l.dashed).length, doubled: doubled.length, shelvesDashed: shelvesDashed.length, legend: legendRow }));
  await frameOf(plan, 'f25-17-plan-base.png');
  // THE SECTION AT THE KITCHEN'S 558: the BUDR2 orders the NL500 T, which has no model (E4: none in the bucket).
  const secName = names.find((n) => /Sections/.test(n));
  const runners558 = linesOf(svgs[secName] || '', 'RUNNERS').length;
  note('F23', 'the section A-A at the kitchen\'s 558: the BUDR2\'s NL500 T has no model in the bucket (E4), so the BOM\'s symbol stands (RUNNERS lines)', `${runners558}`);
  await closeModals(page);
  // THE SECTION WITH THE TRACED RUNNER: the BUDR2 at 460 (a 390 box, the NL400 T, traced), its Depth typed in the right panel.
  await selectUnit(page, ids.c);
  await sectionOpen(page, 'Carcass');
  const d460 = await typeInto(page, '[data-unit-size-field="depth"]', 460);
  const box = await page.ask(`(() => { const r = ${S}.unitResult(${j(ids.c)}); const rs = (r.hardware || []).filter((h) => /runner|movento|NL\\d/i.test(JSON.stringify(h))).map((h) => h.label || h.name || h.article || h.role).slice(0, 4); return { d: ${S}.units.find((u) => u.id === ${j(ids.c)}).params.depth, runners: rs }; })()`);
  note('F23', 'the BUDR2\'s Depth typed 460 (a real click, Ctrl+A, the digits, Enter): its runner', j({ field: d460.shown, ...box }));
  await key(page, 'Escape');
  names = await openSet(page);
  const sec = await sheetOnGlass(page, names.find((n) => /Sections/.test(n)));
  const runners460 = linesOf(sec, 'RUNNERS').length;
  check('F23', 'the section A-A through the BUDR2 at 460: the MOVENTO NL400 T\'s traced side silhouette, not the symbol (*"dalem ci przeciez dxf z dokladnymi rysunkami"*; many RUNNERS lines where the symbol has a few)', runners460 >= 40 && runners460 > 4 * Math.max(1, runners558),
    `40 or more RUNNERS lines (the symbol at 558: ${runners558})`, `${runners460}`);
  await frameOf(sec, 'f25-18-section.png');
  // THE PDF: Drawing set (PDF), a real click; its pages counted; the logo embedded on each.
  await page.ask('(() => { if (!window.__t82Blobs) { window.__t82Blobs = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { window.__t82Blobs.push(b); return o(b); }; } return true; })()');
  await page.press('[data-wall-drawings-pdf="1"]');
  await until(page, 'window.__t82Blobs.some((b) => b.type === \'application/pdf\' || b.size > 50000)', 120000);
  const pdf64 = await page.ask(`(async () => { const b = window.__t82Blobs.filter((x) => x.type === 'application/pdf' || x.size > 50000).pop(); if (!b) return null;
    const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 1) s += String.fromCharCode(u[i]); return btoa(s); })()`);
  if (pdf64) {
    const file = join(SCRATCH, 'walk-set.pdf');
    writeFileSync(file, Buffer.from(pdf64, 'base64'));
    let info = ''; let imgs = '';
    try { info = execFileSync('pdfinfo', [file]).toString(); } catch (e) { info = `pdfinfo: ${e.message}`; }
    try { imgs = execFileSync('pdfimages', ['-list', file]).toString(); } catch (e) { imgs = `pdfimages: ${e.message}`; }
    const pages = Number((info.match(/^Pages:\s+(\d+)/m) || [])[1]);
    const rows = imgs.split('\n').slice(2).map((l) => l.trim().split(/\s+/)).filter((c) => c.length > 5);
    const logoPages = new Set(rows.filter((c) => Number(c[3]) === logo.w && Number(c[4]) === logo.h).map((c) => c[0]));
    let text = '';
    try { text = execFileSync('pdftotext', ['-layout', file, '-']).toString(); } catch { /* the count is enough */ }
    check('F25', 'the PDF (the window\'s "Drawing set (PDF)", a real click), read back: one page per sheet', pages === names.length, `${names.length}`, `${pages} pages, ${Buffer.from(pdf64, 'base64').length} bytes`);
    if (logoOn) check('F20', 'the PDF embeds the logo on every page (pdfimages: the 96 x 64 PNG, one per page)', logoPages.size === pages, `${pages}`, `${logoPages.size} pages carry it`);
    note('F25', 'pdfinfo', info.trim().split('\n').filter((l) => /^(Pages|Page size|Producer|Title)/.test(l)).map((l) => l.replace(/\s+/g, ' ')).join('; '));
    note('F21', 'the PDF\'s own text carries the chain figures (pdftotext)', j({ '363': /\b363\b/.test(text), '360': /\b360\b/.test(text), '376.5': /376\.5/.test(text) }));
  } else check('F25', 'the PDF exported', false, 'the file', 'no blob');
  await closeModals(page);
  // THE LOGO REMEMBERED ON THIS COMPUTER: the page reloaded (the browser's own), the stage again, the set opened.
  // The job is unsaved, so the page asks before it goes (App.jsx's beforeunload): the walk answers Leave, as a
  // client does, for as long as the reload and the new job take.
  if (logoOn) {
    let asked = 0;
    const onDialog = (e) => { try { const m = JSON.parse(e.data); if (m.method === 'Page.javascriptDialogOpening') { asked += 1; page.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } } catch { /* not ours */ } };
    page.socket.addEventListener('message', onDialog);
    await page.send('Page.reload', { ignoreCache: true });
    await page.sleep(3000);
    await pro(page, { base: BASE });
    page.socket.removeEventListener('message', onDialog);
    note('F20', 'the browser\'s reload; the page\'s "leave this page?" answered Leave', `${asked} question(s)`);
    await stageT81Kitchen(page, { inframe: true, knob: false });
    const names2 = await openSet(page);
    const again = await sheetOnGlass(page, names2.find((n) => /Fronts$/.test(n)));
    check('F20', 'after a reload, a new job: the logo is still on the sheet (kept with the company on this computer)', logoImages(again).length === 1, 'the image', `${logoImages(again).length}`);
    await closeModals(page);
  }
}

// === LEG 0 · THE HARNESS PROVED ON TODAY'S APP (--legs 0, never in the default run) ===
// What the five legs read (the world axes of the room, a carcass's back line
// at its wall gap, a carcass's foot at its legs, a part's outline polygon on
// the CNC sheet, the BOM's and the Check's text, a section found by its
// title) is read here off kits that exist today, so a FAIL in a leg is the
// slice's and never the walk's own arithmetic.
async function leg0(page) {
  await stageRoom(page, 5000, 3000, 2500);
  const id = await page.ask(`(() => { const r = ${S}.addUnit('BUDR', { wall: 0, x: 1000 }); return r && r.id; })()`);
  await page.sleep(1500);
  const u = await unitRow(page, id);
  const clearance = Number(await page.ask(`(${PROFILE}.room || {}).wallBackClearance ?? 0`));
  const legH = Number(await page.ask(`${S}.units.find((x) => x.id === ${j(id)}).params.leg_height ?? 100`));
  const sc = await sceneOf(page, id);
  const sides = Object.entries(sc ? sc.pieces : {}).filter(([k]) => /^(BUL|BUR)$/.test(k)).map(([, b]) => b);
  check('F25', 'the room\'s axes in plan mm: a BUDR at x 1000 stands its sides from x 1000, their back at the wall gap (z) and their foot on the legs (y)', sides.length === 2 && near(Math.min(...sides.map((b) => b.min[0])), 1000, 1.5) && sides.every((b) => near(b.min[2], u.wallGap ?? clearance, 1.5) && near(b.min[1], legH, 1.5)),
    `x 1000, z ${u.wallGap ?? clearance}, y ${legH}`, j(sides.map((b) => [b.min[0], b.min[2], b.min[1]])));
  const parts = await partsOf(page, id);
  note('F25', 'the engine\'s parts and their outline points (a rectangle is 4 or 5)', j(parts.filter((p) => /DRAWER-(BOX-BACK|BOTTOM)/.test(p.part)).map((p) => [p.id, p.outline])));
  await frameOn(page, [id]);
  await settleCamera(page);
  await shot(page, 'f25-selftest-room.png');
  check('F25', 'a unit selected by a real click on its own pixel, its right panel standing', await selectUnit(page, id), 'selected', String(await page.ask(`${UI}.selectedUnitId`)));
  const title = await sectionLikeOpen(page, /carcass/i);
  check('F25', 'a right-panel section found by its title and opened', title === 'Carcass', 'Carcass', String(title));
  await key(page, 'Escape');
  const bom = await bomText(page);
  check('F25', 'the BOM read by the toolbar\'s own button', /BUDR|DR01|drawer/i.test(bom), 'the drawer unit in it', `${bom.length} chars`);
  await bomClose(page);
  const f = await checkOpen(page);
  check('F25', 'the Check opened by its own button and read', Array.isArray(f), 'its findings', j(f.slice(0, 3)));
  await checkClose(page);
  const cnc = await viewMode(page, 'cnc');
  const back = parts.find((p) => p.part === 'DRAWER-BOX-BACK');
  const poly = back ? await page.ask(`(() => { const g = document.querySelector('[data-cnc-part=${j(back.id)}]'); if (!g) return null; return [...g.querySelectorAll('polygon')].map((x) => (x.getAttribute('points') || '').trim().split(/\\s+/).length); })()`) : null;
  note('F25', 'the CNC sheet\'s parts (data-cnc-part)', j(await page.ask('[...document.querySelectorAll(\'[data-cnc-part]\')].map((g) => g.getAttribute(\'data-cnc-part\') + \':\' + g.getAttribute(\'data-cnc-part-face\') + \':\' + g.querySelectorAll(\'polygon\').length).slice(0, 40)')));
  check('F25', 'CNC (the toolbar\'s own button): a drawer box back on the sheet, its outline a polygon', cnc && Array.isArray(poly) && poly.length > 0, 'a polygon', j({ part: back && back.id, poly }));
  if (back) await cncPartFrame(page, back.id, 'f25-selftest-cnc.png');
  await viewMode(page, '3d');
}

// === THE WALK ===============================================================
const LEG_TITLES = {
  0: 'THE HARNESS PROVED ON TODAY\'S APP (a BUDR: the axes, the right panel, the BOM, the Check, the CNC sheet)',
  1: 'HAWA CONCEPTA III: THE POCKET BESIDE A BUD 500 ON A 580 RUN',
  2: 'THE VANITY, 3 DRAWERS: THE VOID, THE RAILS, THE WORKTOP, THE BASIN, COLUMNS 2, SINKS 2, FLOATING, THE U',
  3: 'SETTINGS, FRONTS FL, PROFILE REED 20: THE ROOM AND THE FRONTS SHEET',
  4: 'THE FREE PANEL IN HAND: UP 200, ON THE CHIMNEY\'S FRONT 1200, THICKNESS 36',
  5: 'OUTPUT, DRAWINGS: THE LOGO, THE CHAINS, THE KNOB, THE PLINTH, THE TRACED RUNNER, THE PDF',
};
const LEG_RUN = {
  0: leg0, 1: leg1, 2: leg2, 3: leg3, 4: leg4, 5: leg5,
};
for (const n of LEGS) {
  LEG = n;
  push('LEG', 'F25', `LEG ${n} · ${LEG_TITLES[n]}`);
  let page = null;
  try {
    page = await open({ width: 1440, height: 900 });
    await pro(page, { base: BASE });
    await hearSaid(page);
    if (n === LEGS[0]) note('F25', 'the build under the mouse', `the repo's HEAD ${head}; url ${BASE}${PREP ? '; --prep' : ''}`);
    await LEG_RUN[n](page);
  } catch (e) {
    check('F25', `leg ${n} to its end`, false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    if (page) await shot(page, `f25-leg${n}-failure.png`).catch(() => {});
  }
  if (page) {
    const errs = pageErrors(page);
    note('F25', `console errors on the page (leg ${n})`, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
    await page.close();
  }
}
if (painter) await painter.close();
await showroomDown();
stopPreview();

const count = (k) => steps.filter((s) => s.kind === k).length;
const [pass, fail, wait] = [count('PASS'), count('FAIL'), count('WAIT')];
writeFileSync(`${OUT}walk.txt`, ascii([
  'T82 WALK: HAWA, THE VANITY, THE CLOUD, THE PANEL IN HAND, THE DRAWINGS FOR THE CLIENT (scripts/t82-walk.mjs)',
  `walked ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, HEAD ${head}, ${BASE}, legs ${LEGS.join(',')}${PREP ? ', --prep' : ''}`,
  'Every line: PASS or FAIL (the F, the gesture, what was expected, what was read), WAIT (a hook not landed yet, --prep only), NOTE (a reading), FRAME (the file beside this one).',
  'The gestures are real clicks, drags and keys; the stages are the store\'s; every sheet is read off the glass and framed from that very SVG at 4 px per paper mm.',
  '',
  ...steps.map((s) => {
    if (s.kind === 'LEG') return `\n${s.gesture}`;
    if (s.kind === 'FRAME') return `FRAME  [${s.leg}] ${s.gesture}`;
    if (s.kind === 'NOTE') return `NOTE   [${s.leg}] ${s.F} ${s.gesture} | ${s.got}`;
    return `${s.kind.padEnd(6)} [${s.leg}] ${s.F} ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
  }),
  '',
  `FRAMES (${frames.length}): ${frames.join(', ')}`,
  `T82: ${pass + fail + wait} steps, ${pass} pass, ${fail} fail${wait ? `, ${wait} wait` : ''}`,
  '',
].join('\n')));
process.stdout.write(`\nT82: ${pass + fail + wait} steps, ${pass} pass, ${fail} fail${wait ? `, ${wait} wait` : ''}; ledger ${OUT}walk.txt; frames ${frames.join(', ')}\n`);
process.exit(fail ? 1 : 0);
