#!/usr/bin/env node
// T75 · THE ACCEPTANCE WALK, PARTS C TO F (KITCHEN KITS, WARDROBE KITS, SETS, STOCK)
//
// CLAUDE.md T75, LAWS: *"Test the way the client clicks.
// `scripts/t75-walk.mjs` (T74's pattern) uses a REAL mouse and the REAL
// buttons; the store is only read."*  TESTS AND PROOF: *"`scripts/t75-walk.mjs`,
// REAL mouse, for F2 to F5, F7 to F14, F16 to F18, F20, F21"*. Parts A and B
// (F2 to F11) are walked by `scripts/t75-walk.mjs`; this file walks the rest:
// F12, F13, F14 (PART C), F16, F17, F18 (PART D), F20 (PART E) and F21 (PART F),
// with the same ledger grammar, into `verify/t75/walk-cf.txt`.
//
// Every gesture below is the browser's own input pipe (CDP
// `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent` / `Input.insertText`),
// at a DOM control's centre, or at a pixel where the scene's own raycaster says
// the cabinet IS the nearest thing under the pointer and the page says the
// canvas owns it. The store is READ to say what happened; it is never written
// to make something happen. Where the app offers no control for a gesture the
// walk says so as a NOTE (or a FAIL when the spec asks for the control) and
// does not stand a store call in for the click.
//
// THE STAGE. PRO opens on its start screen; T74's `pro()` sets the stage the
// way `scripts/e2e-turn18.mjs` always has (a new project, the editor's own
// door). That is the stage, not a gesture any check below is about, for the
// kitchen sections (F12, F13, F14, the Sets shelf of F20, F21). A WARDROBE JOB
// (F16, F17, F18) and the MEDIA WALL job of F20 are NOT staged: PRO's own NEW
// PROJECT flow is walked by hand from the start screen's button to `Start
// designing` (`newProject` below), the type tile, One wall, the wall's Save,
// the settings sequence's Stock board chosen on the native <select> with the
// keyboard, both container Saves, every Next. Retail opens on its
// own room (T74's `room()`), and its first wardrobe comes through the WHERE
// step's own button.
//
//   npm run build && npx vite preview --port 4185
//   E2E_URL=http://127.0.0.1:4185/ node scripts/t75-walk-cf.mjs --fresh f12 f13
//   E2E_URL=http://127.0.0.1:4185/ node scripts/t75-walk-cf.mjs f14      (a rerun replaces its section)
//
// Sections: f12 f13 f14 f16 f17 f18 f20 f21 (all when none named).

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BASE, open, pro, room, withWardrobe, unitsNow, showroomDown, settleCamera, pointOn,
} from './t74-harness.mjs';

const SHOTS = new URL('../verify/t75/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const ORDER = ['f12', 'f13', 'f14', 'f16', 'f17', 'f18', 'f20', 'f21'];
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

// --- THE LEDGER'S HANDS (T74's, with the section named on every line) -------
const steps = [];
let current = '';
// The app's older sentences carry en and em dashes; the ledger quotes them
// with the dash ESCAPED, so the file this turn writes stays dash-free
// (CLAUDE.md LAWS) and the quote stays true (T74's `undash`).
const undash = (t) => String(t).replace(/\u2014/g, '\\u2014').replace(/\u2013/g, '\\u2013');
const check = (label, ok, detail = '') => {
  const d = undash(detail);
  steps.push({
    section: current, label: undash(label), ok: Boolean(ok), detail: d,
  });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${undash(label)}${d ? ` · ${d}` : ''}\n`);
};
const note = (label, detail = '') => {
  const d = undash(detail);
  steps.push({
    section: current, label: undash(label), ok: true, detail: d, note: true,
  });
  process.stdout.write(`  ·   ${undash(label)}${d ? ` · ${d}` : ''}\n`);
};
const begin = (name, title) => {
  current = name;
  steps.push({ section: name, header: title });
  process.stdout.write(`\n=== ${name.toUpperCase()} · ${title} ===\n`);
};
const shot = (page, file) => page.screenshot(`${SHOTS}${file}`);
const lastSaid = (page) => page.ask('(() => { const m = window.__cc.ui.getState().messages || []; return m.length ? m[m.length - 1].message : null; })()');
const allSaid = (page) => page.ask('(window.__cc.ui.getState().messages || []).map((m) => m.message)');
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|net::ERR|Failed to load resource/i.test(e));

// --- THE HANDS T74's HARNESS LACKS (copied, not imported: one walk, one file) --
const KEYS = {
  Enter: 13, Escape: 27, Tab: 9, Backspace: 8, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39,
};
/** A key through the browser's input pipe, the arrows included. */
async function key(page, name) {
  const code = KEYS[name];
  const k = {
    key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k });
  if (name === 'Enter') await page.send('Input.dispatchKeyEvent', { type: 'char', text: '\r', ...k });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(350);
}
/** A letter with Ctrl held (Ctrl+Z, Ctrl+A), through the browser's input pipe. */
async function ctrlKey(page, letter) {
  await page.key(letter, { ctrl: true });
  await page.sleep(700);
}
/** A REAL left click at one pixel with modifiers held (CDP bits: 2 Ctrl, 8 Shift). */
async function clickWith(page, x, y, modifiers = 0) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers });
  await page.sleep(60);
  await page.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1, modifiers,
  });
  await page.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0, modifiers,
  });
  await page.sleep(700);
}
/** The centre of the first element a page-side expression returns, scrolled into view. */
const boxOf = (page, expr) => page.ask(`(() => { const el = (${expr});
  if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
/** A visible element whose own text is EXACTLY `text`, among `sel`. */
const exactly = (sel, text) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((n) => n.offsetParent !== null && (n.textContent || '').trim() === ${JSON.stringify(text)})`;
/** A REAL click on what a page-side expression finds; false when it is not on the screen. */
async function tap(page, expr, modifiers = 0) {
  const at = await boxOf(page, expr);
  if (!at) return false;
  await clickWith(page, at.x, at.y, modifiers);
  return true;
}
/** Wait (up to `ms`) until a page-side expression is truthy; returns the last value. */
async function until(page, expr, ms = 8000) {
  let v = null;
  for (let t = 0; t < ms / 300; t += 1) {
    v = await page.ask(expr);
    if (v) return v;
    await page.sleep(300);
  }
  return v;
}
/** A field's text replaced the way a hand does it: a real click in it, Ctrl+A, the new text typed. */
async function typeInto(page, expr, text) {
  if (!(await tap(page, expr))) return false;
  await page.key('a', { ctrl: true });
  await page.sleep(150);
  await page.send('Input.insertText', { text: String(text) });
  await page.sleep(300);
  return true;
}

/**
 * The top bar's MENU, then an entry, then (when given) a submenu entry: real
 * clicks on the menu bar's own buttons (`MenuBar.jsx`: a click opens a menu,
 * a click on a submenu parent opens it).
 */
async function menu(page, top, item, sub = null) {
  if (!(await tap(page, exactly('nav[aria-label="Main menu"] > div > button', top)))) return `no "${top}" in the menu bar`;
  await page.sleep(250);
  if (!(await tap(page, `[...document.querySelectorAll('[role="menuitem"]')].find((n) => n.offsetParent !== null && (n.querySelector('span.flex-1')?.textContent || n.textContent || '').trim() === ${JSON.stringify(item)})`))) {
    return `no "${item}" under ${top}`;
  }
  if (sub) {
    await page.sleep(250);
    if (!(await tap(page, `[...document.querySelectorAll('[role="menuitem"]')].find((n) => n.offsetParent !== null && (n.querySelector('span.flex-1')?.textContent || n.textContent || '').trim() === ${JSON.stringify(sub)})`))) {
      return `no "${sub}" under ${top} > ${item}`;
    }
  }
  await page.sleep(600);
  return null;
}

/**
 * The library through its MENU: Library, then the category (Kitchen,
 * Wardrobes, Sets), then the group's flyout (Base units, Tall units), then a
 * nested group's flyout, then the row. Every step is a real click on a real
 * control. The panel stays open, as it does for a client building a run.
 * Returns null when the row was clicked, or what stood in the way.
 */
async function library(page, { category = 'Kitchen', groups = [], entry }) {
  const listed = () => page.has(`[data-library-entry="${entry}"]`);
  const showing = await page.ask('(() => { const l = document.querySelector(\'[data-library-list="1"]\'); return l ? ((l.parentElement.querySelector(".uppercase") || {}).textContent || "").trim() : null; })()');
  if (!showing || showing.toLowerCase() !== category.toLowerCase()) {
    const why = await menu(page, 'Library', category);
    if (why) return why;
  }
  for (const g of groups) {
    if (await listed()) break;
    if (!(await page.has(`[data-library-flyout="${g}"]`))) {
      if (!(await page.has(`[data-library-group="${g}"]`)) && await page.has('[data-library-show-all="1"]')) {
        await page.press('[data-library-show-all="1"]');
      }
      if (!(await page.has(`[data-library-group="${g}"]`))) return `no group "${g}" in the list`;
      await page.press(`[data-library-group="${g}"]`);
    }
  }
  if (!(await listed())) return `no row "${entry}" on the screen`;
  await page.press(`[data-library-entry="${entry}"]`);
  await page.sleep(1200);
  return null;
}
/** The library panel closed by its own X. */
async function closeLibrary(page) {
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
}
/** A unit added from the library; returns the new unit (the store READ after the click). */
async function addFromLibrary(page, spec) {
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  const why = await library(page, spec);
  const added = (await unitsNow(page)).filter((u) => !before.has(u.id));
  return { why, unit: added[0] || null, added, said: await lastSaid(page) };
}

// --- THE SCENE: A CABINET UNDER THE POINTER -----------------------------------
const FREE = `(function (points) {
  const v = window.__cc.views.room; const c = v.gl.domElement;
  const own = points.filter((p) => { const el = document.elementFromPoint(p.x, p.y); return el === c || (el && c.contains(el)); });
  if (!own.length) return null;
  const cx = own.reduce((s, p) => s + p.x, 0) / own.length; const cy = own.reduce((s, p) => s + p.y, 0) / own.length;
  own.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  return { x: own[0].x, y: own[0].y, n: own.length };
})`;
const EMPTY = `(() => { const v = window.__cc.views.room; const T = v.three; const c = v.gl.domElement;
  const r = c.getBoundingClientRect(); const ray = new T.Raycaster();
  for (const fy of [0.85, 0.92, 0.75, 0.3, 0.2]) for (const fx of [0.5, 0.35, 0.65, 0.2, 0.8]) {
    const px = Math.round(r.left + fx * r.width); const py = Math.round(r.top + fy * r.height);
    const el = document.elementFromPoint(px, py); if (!(el === c || (el && c.contains(el)))) continue;
    ray.setFromCamera(new T.Vector2(fx * 2 - 1, -(fy * 2 - 1)), v.camera);
    const hit = ray.intersectObjects(v.scene.children, true).find((h) => h.object.isMesh && h.object.visible);
    let unit = false; for (let a = hit && hit.object; a; a = a.parent) { if (a.userData && a.userData.ccUnitId) unit = true; }
    if (!unit) return { x: px, y: py };
  }
  return null; })()`;
/** The camera turned by a real drag on empty floor or wall (OrbitControls' own gesture). */
async function orbitFree(page, dx, dy = 0) {
  const at = await page.ask(EMPTY);
  if (!at) return false;
  await page.dragFromTo(at.x, at.y, at.x + dx, at.y + dy, { steps: 20 });
  await page.sleep(900);
  await settleCamera(page);
  return true;
}
/** A pixel of the piece `panelId` the canvas owns and the raycaster meets first, from some camera. */
async function reachFree(page, unitId, panelId) {
  await settleCamera(page);
  for (const [dx, dy] of [[0, 0], [120, 0], [-240, 0], [120, 120], [260, 0]]) {
    if (dx || dy) await orbitFree(page, dx, dy);
    const all = await pointOn(page, unitId, panelId, { all: true, grid: 40 });
    if (all && all.points && all.points.length) {
      const at = await page.ask(`${FREE}(${JSON.stringify(all.points)})`);
      if (at) return at;
    }
  }
  return null;
}
const S = 'window.__cc.project.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
/** The ids a hand can grab a cabinet by, best first: a front, the top, a side, the back. */
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${JSON.stringify(id)});
  if (!r) return []; const pick = [];
  for (const f of [(p) => p.role === 'front' || p.part === 'FRONT' || p.part === 'DRAWER-FRONT', (p) => p.id === 'TOP', (p) => p.id === 'BUL' || p.id === 'BUR',
    (p) => p.role === 'side', (p) => p.role === 'back']) {
    for (const p of r.panels) if (f(p) && !pick.includes(p.id)) pick.push(p.id);
  }
  return pick.length ? pick : r.panels.map((p) => p.id); })()`);
/** A real click on a cabinet (selects it); Ctrl held when asked. */
async function clickUnit(page, id, modifiers = 0, { right = false } = {}) {
  for (const pid of (await grabIds(page, id)).slice(0, 6)) {
    const at = await reachFree(page, id, pid);
    if (!at) continue;
    if (right) await page.rightclick(at.x, at.y);
    else await clickWith(page, at.x, at.y, modifiers);
    await page.sleep(500);
    return { ...at, by: pid };
  }
  return null;
}
/** A right-panel section opened by a real click on its header (when shut). */
async function section(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
/** Doors through the DOORS section's own button, on the selected unit. */
async function addDoorsHere(page) {
  if (!(await until(page, 'Boolean(document.querySelector(\'[data-section="Doors"]\'))', 4000))) return false;
  if (!(await section(page, 'Doors'))) return false;
  const has = await page.ask('[...document.querySelectorAll(\'button.cc-btn-gold\')].some((b) => b.offsetParent && /Add doors/.test(b.textContent))');
  if (!has) return false;
  await page.press('button.cc-btn-gold', 'Add doors');
  await page.sleep(800);
  return true;
}
/** The PRO right panel folded away by its own X, so the frame shows the room. */
async function framed(page, file) {
  if (await page.has('button[title="Close panel"]')) await page.press('button[title="Close panel"]');
  await settleCamera(page);
  await shot(page, file);
}
/** A unit read off the store: what it is, how big, and what the engine cut for it. */
const unitOf = (page, id) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${JSON.stringify(id)});
  if (!u) return null; const r = P.unitResult(u.id);
  return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall ?? 0, x: u.position.x_mm,
    w: u.params.width, h: u.params.height, d: u.params.depth, mount: u.params.mount_height ?? null,
    wallGap: u.params.wall_gap ?? null, doors: u.params.doors === true, hob: u.params.hob ?? null,
    apertures: u.params.apertures ? JSON.stringify(u.params.apertures) : null,
    panels: r.panels.map((p) => p.id), parts: r.panels.map((p) => p.part),
    warnings: (r.warnings || []).map((w) => w.code) }; })()`);
/** The BOM panel opened by the top bar's own Export button (it toggles the live BOM). */
async function openBom(page) {
  if (!(await page.has('[data-bom-purchase-tab="1"]'))) {
    await tap(page, exactly('header button', 'Export'));
    await until(page, 'Boolean(document.querySelector(\'[data-bom-purchase-tab="1"]\'))', 4000);
  }
  return page.has('[data-bom-purchase-tab="1"]');
}
async function closeBom(page) {
  if (await page.has('[data-bom-purchase-tab="1"]')) {
    await tap(page, `[...document.querySelectorAll('aside button')].find((b) => b.offsetParent && b.textContent.trim() === '×')`);
  }
}

// --- THE NEW PROJECT FLOW, WALKED BY HAND -------------------------------------
/**
 * PRO's own NEW PROJECT flow, from the start screen to `Start designing`, by
 * real clicks: New project, Next (the info step), the TYPE tile, Next, the One
 * wall card, the wall editor's Save, then the settings sequence's own Next
 * through every tab; on each container's stop the Stock board <select> is
 * chosen the way a hand does it on a native control (a real click on it, the
 * Down arrow to the first board, Enter), and the container's own Save is
 * pressed. Returns what happened at each step, and whether the editor opened.
 */
async function newProject(page, typeLabel) {
  const log = [];
  await page.showroom(`${BASE}index.html`);
  await page.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
  await page.sleep(1500);
  const step = () => page.ask('(() => { const w = document.querySelector("[data-wizard-step]"); return w ? w.dataset.wizardStep : null; })()');
  if (!(await tap(page, exactly('button', 'New project')))) return { ok: false, log: ['no New project button on the start screen'] };
  await until(page, 'Boolean(document.querySelector("[data-wizard-step=\\"info\\"]"))', 5000);
  log.push(`start screen > New project: step ${await step()}`);
  await tap(page, exactly('[data-modal-name="new-project"] button', 'Next'));
  await until(page, 'Boolean(document.querySelector("[data-wizard-step=\\"type\\"]"))', 5000);
  const tile = `[...document.querySelectorAll('[data-modal-name="new-project"] button')].find((b) => b.offsetParent && (b.querySelector('span')?.textContent || '').trim() === ${JSON.stringify(typeLabel)})`;
  if (!(await tap(page, tile))) return { ok: false, log: [...log, `no "${typeLabel}" tile`] };
  await tap(page, exactly('[data-modal-name="new-project"] button', 'Next'));
  await until(page, 'Boolean(document.querySelector("[data-wizard-step=\\"scope\\"]"))', 5000);
  log.push(`type "${typeLabel}" + Next: step ${await step()}, projectType ${await page.ask(`${S}.project.design.projectType`)}`);
  await page.press('[data-scope-card="wall"]');
  await until(page, 'Boolean(document.querySelector("[data-elevation-save=\\"1\\"]"))', 5000);
  await page.press('[data-elevation-save="1"]');
  await until(page, 'Boolean(document.querySelector("[data-wizard-tab-body]"))', 5000);
  log.push(`One wall + the wall's Save: step ${await step()}`);
  const picked = [];
  for (let i = 0; i < 30; i += 1) {
    if (await page.has('[data-start-designing="1"]')) break;
    const empty = await page.ask('(() => { const s = [...document.querySelectorAll("select[data-stock-board]")].find((x) => x.offsetParent && !x.value); return s ? s.dataset.stockBoard : null; })()');
    if (empty) {
      const sel = `document.querySelector('select[data-stock-board="${empty}"]')`;
      await tap(page, sel);
      await key(page, 'ArrowDown');
      await key(page, 'Enter');
      picked.push(`${empty}=${await page.ask(`${sel}.value`)}`);
      continue;
    }
    if (await page.has('[data-save-carcasses="1"]:not([disabled])')) { await page.press('[data-save-carcasses="1"]'); picked.push('Save carcasses'); continue; }
    if (await page.has('[data-save-fronts="1"]:not([disabled])')) { await page.press('[data-save-fronts="1"]'); picked.push('Save fronts'); continue; }
    if (await page.has('[data-tab-next="1"]:not([disabled])')) { await page.press('[data-tab-next="1"]'); continue; }
    break;
  }
  log.push(`settings: ${picked.join(', ')}; summary reached ${await page.has('[data-start-designing="1"]')}`);
  const blocked = await page.ask('(() => { const b = document.querySelector("[data-start-designing]"); return b ? (b.disabled ? (b.title || "disabled") : null) : "no Start designing"; })()');
  if (blocked) return { ok: false, log: [...log, `Start designing: ${blocked}`] };
  await page.press('[data-start-designing="1"]');
  const opened = await until(page, 'window.__cc.ui.getState().screen === "editor" && Boolean(window.__cc.views && window.__cc.views.room)', 20000);
  await page.sleep(2500);
  log.push(`Start designing: the editor ${opened ? 'opened' : 'did NOT open'}`);
  return { ok: Boolean(opened), log };
}

// --- DOWNLOADS: what a click hands the browser to save --------------------------
const DOWNLOADS = join(SHOTS, '.downloads');
async function downloadsOn(page) {
  rmSync(DOWNLOADS, { recursive: true, force: true });
  mkdirSync(DOWNLOADS, { recursive: true });
  try {
    await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS, eventsEnabled: true });
  } catch {
    await page.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS });
  }
}
/** The file the last click saved (waited for up to 6 s), as text, or null. */
async function downloaded(page, before = []) {
  for (let t = 0; t < 20; t += 1) {
    const now = readdirSync(DOWNLOADS).filter((f) => !before.includes(f) && !/\.crdownload$/.test(f));
    if (now.length) {
      await page.sleep(300);
      return { name: now[0], text: readFileSync(join(DOWNLOADS, now[0]), 'utf8') };
    }
    await page.sleep(300);
  }
  return null;
}
const filesNow = () => readdirSync(DOWNLOADS);

// =============================================================================
// F12 · THE APPLIANCE TOWER
// =============================================================================
if (runs('f12')) {
  begin('f12', 'THE APPLIANCE TOWER, ONE KIT, PARENT KIT_FRIDGE');
  const page = await open();
  await pro(page);
  const towers = [];
  for (const [entry, typeId, block] of [
    ['fridge-freezer', 'APPLIANCE_TALL', 'fridgeFreezer'],
    ['washer-dryer', 'APPLIANCE_TALL2', 'washerDryer'],
  ]) {
    const res = await addFromLibrary(page, { category: 'Kitchen', groups: ['tall-units'], entry });
    const row = await page.text(`[data-library-entry="${entry}"]`);
    const u = res.unit ? await unitOf(page, res.unit.id) : null;
    const defaults = await page.ask(`${PROFILE}.applianceTall.${block}.defaults`);
    // Each aperture's height where its role names it: its own number (washer,
    // dryer) or the number it points at (the fridge's is fridgeUnit's fridgeH).
    const wantH = await page.ask(`(() => { const P = ${PROFILE}; const at = (path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), P);
      return P.applianceTall.${block}.defaults.apertures.map((a) => { const r = P.applianceTall.roles[a.role];
        return { role: a.role, h: Number(r.h) > 0 ? Number(r.h) : at(r.hKey) }; }); })()`);
    check(`Library > Kitchen > Tall units > "${entry === 'fridge-freezer' ? 'Fridge freezer' : 'Washer + dryer'}": a real click adds ${typeId}`,
      u && u.type === typeId, res.why || `${JSON.stringify(u && { type: u.type, num: u.num })}; row "${row}"`);
    if (!u) continue;
    towers.push(u);
    check(`${typeId} · its width is the defaults block's (${defaults.width}), its prefix AT`,
      u.w === defaults.width && /^AT/.test(u.num), `w ${u.w}, h ${u.h}, d ${u.d}, num ${u.num}`);
    check(`${typeId} · its apertures are the defaults block's, in order, each at its role's height`,
      u.apertures === JSON.stringify(wantH),
      `unit ${u.apertures || '(none)'}; block ${JSON.stringify(defaults.apertures)} at the roles' heights ${JSON.stringify(wantH)}`);
    const fixed = u.panels.filter((p) => /^FIXED/.test(p));
    check(`${typeId} · the engine cut one fixed panel per aperture (KIT_FRIDGE's FIXED, stacked)`,
      fixed.length === defaults.apertures.length, `fixed panels ${JSON.stringify(fixed)}`);
    if (typeId === 'APPLIANCE_TALL2') {
      // The machine is the face: the one door starts on the highest machine.
      // Its door through the right panel's own Doors section (it is the
      // selection the library just made).
      await closeLibrary(page);
      const hung = await addDoorsHere(page);
      check('APPLIANCE_TALL2 · its door through the Doors section\'s own "Add doors" button', hung,
        hung ? '' : 'no Add doors button on the right panel');
      const faces = await page.ask(`(() => { const r = ${S}.unitResult(${JSON.stringify(u.id)});
        return { doors: r.panels.filter((p) => p.role === 'front').map((p) => ({ y: p.box.y, h: p.box.h })),
          fixed: r.panels.filter((p) => /^FIXED/.test(p.id)).map((p) => ({ id: p.id, y: p.box.y, h: p.box.h })) }; })()`);
      const top = Math.max(...faces.fixed.map((f) => f.y));
      check('APPLIANCE_TALL2 · no front over the washer and the dryer: the one door starts on the highest machine',
        faces.doors.length === 1 && faces.doors.every((d) => d.y >= top - 1), JSON.stringify(faces));
    }
  }
  await closeLibrary(page);
  // The BOM: the top bar's own Export button opens the live BOM; its Order tab
  // lists the ironmongery, its BOM tab the purchase list.
  if (await openBom(page)) {
    await tap(page, '[...document.querySelectorAll(\'[data-bom-order-tab="1"]\')][0]');
    await until(page, 'Boolean(document.querySelector(\'[data-bom-ironmongery="1"]\'))', 4000);
    const order = await page.ask(`[...document.querySelectorAll('[data-bom-ironmongery="1"] [data-bom-line="appliance"]')].map((l) => [...l.children].map((c) => c.textContent.replace(/\\s+/g, ' ').trim()).join(' | '))`);
    const labels = await page.ask(`${PROFILE}.applianceTall.roles`);
    const wantNames = [labels.fridge.label, labels.washer.label, labels.dryer.label];
    check('the BOM panel (Order tab) lists an appliance line per aperture: fridge freezer, washer, dryer',
      wantNames.every((n) => order.some((l) => l.includes(n))), JSON.stringify(order));
    await shot(page, 'f12-bom-order.png');
    await tap(page, '[...document.querySelectorAll(\'[data-bom-purchase-tab="1"]\')][0]');
    await until(page, 'Boolean(document.querySelector(\'[data-bom-purchase="1"]\'))', 4000);
    const line = await page.ask(`(() => { const row = [...document.querySelectorAll('[data-bom-purchase="1"] tr[data-bom-line]')]
      .find((r) => (r.cells[0]?.textContent || '').trim() === 'Appliance'); return row ? [...row.cells].map((c) => c.textContent.trim()) : null; })()`);
    check('the BOM tab (the purchase list) carries one "Appliance" line counting the three machines',
      line && Number(line[1]) === 3, JSON.stringify(line));
    await closeBom(page);
  } else {
    check('the top bar\'s Export opens the BOM panel', false, 'no [data-bom-purchase-tab] after the click');
  }
  // WIDTH FIXED: a base unit beside the towers, its Width typed so the run
  // ends short of the wall by less than the share-out gap; the share-out bar
  // the scene then offers is pressed, and the towers must keep their width.
  if (towers.length === 2) {
    const bud = await addFromLibrary(page, { category: 'Kitchen', groups: ['base-units'], entry: 'door-base' });
    await closeLibrary(page);
    const lay = await page.ask(`(() => { const P = ${S}; const c = P.project.room.corners; const len = Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y);
      const run = P.units.filter((u) => (u.position.wall ?? 0) === 0).map((u) => ({ id: u.id, type: u.type, x: u.position.x_mm, w: u.params.width }));
      return { len, run }; })()`);
    const b = bud.unit ? lay.run.find((u) => u.id === bud.unit.id) : null;
    const right = b && Math.max(...lay.run.map((u) => u.x + u.w)) === b.x + b.w;
    if (b && right) {
      const typed = b.w + (lay.len - (b.x + b.w)) - 200;
      await section(page, 'Carcass');
      await typeInto(page, 'document.querySelector(\'[data-unit-size-field="width"]\')', String(typed));
      await key(page, 'Enter');
      await page.sleep(1200);
      const bar = await until(page, 'document.querySelector(\'[data-share-out-go="1"]\') ? document.querySelector(\'[data-share-out-bar]\').dataset.shareOutBar : null', 5000);
      check(`a base unit beside them, its Width typed to ${typed}: the scene offers the share-out (under 400 mm left at the wall)`, Boolean(bar),
        `leftover ${bar}; run ${JSON.stringify(lay.run.map((u) => `${u.type} ${u.x}+${u.w}`))}`);
      if (bar) {
        await page.press('[data-share-out-go="1"]');
        await page.sleep(1500);
        const after = await page.ask(`${S}.units.filter((u) => (u.position.wall ?? 0) === 0).map((u) => ({ id: u.id, type: u.type, x: u.position.x_mm, w: u.params.width }))`);
        const tw = after.filter((u) => /^APPLIANCE_TALL/.test(u.type));
        const bu = after.find((u) => u.id === b.id);
        check('"Share it out equally": WIDTH FIXED, the towers keep their 600 and the base unit takes the leftover',
          tw.length === 2 && tw.every((u) => u.w === 600) && bu && bu.w > typed,
          `${JSON.stringify(after.map((u) => `${u.type} ${u.x}+${u.w}`))}; said ${JSON.stringify(await lastSaid(page))}`);
      }
    } else {
      note('widthFixed not walked: the base unit did not land at the right end of the towers\' run', JSON.stringify({ bud: bud.unit, run: lay.run }));
    }
  }
  await framed(page, 'f12-towers.png');
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// =============================================================================
// F13 · THE BASE UNIT WITH DRAWERS BEHIND ITS DOORS
// =============================================================================
if (runs('f13')) {
  begin('f13', 'THE BASE UNIT WITH DRAWERS BEHIND ITS DOORS');
  const page = await open();
  await pro(page);
  const res = await addFromLibrary(page, { category: 'Kitchen', groups: ['base-units'], entry: 'drawers-behind-doors' });
  const u0 = res.unit ? await unitOf(page, res.unit.id) : null;
  check('Library > Kitchen > Base units > "Drawers behind doors": a real click adds BUD_INT, prefix BI',
    u0 && u0.type === 'BUD_INT' && /^BI/.test(u0.num), res.why || JSON.stringify(u0 && { type: u0.type, num: u0.num, w: u0.w, h: u0.h, d: u0.d }));
  await closeLibrary(page);
  if (u0) {
    const id = u0.id;
    // The drawers through the right panel's own Add items: the kind, "Bare
    // boxes" (no front of their own: they live behind the door), the count the
    // field offers, Add.
    const opened = await section(page, 'Add items');
    const kind = opened && await page.has('[data-add-kind="drawers"]:not([disabled])');
    check('the right panel offers Add items > Drawers (internal) on it', kind,
      `section open ${opened}; kinds ${JSON.stringify(await page.ask('[...document.querySelectorAll("[data-add-kind]")].map((b) => b.dataset.addKind + (b.disabled ? " (off)" : ""))'))}`);
    if (kind) {
      await page.press('[data-add-kind="drawers"]');
      await page.press('[data-drawer-mount="internal"]');
      const count = await page.ask('(() => { const f = [...document.querySelectorAll(\'[data-add-items="1"] input\')].find((i) => i.offsetParent); return f ? f.value : null; })()');
      await tap(page, exactly('[data-add-items="1"] button.cc-btn-gold', 'Add'));
      await page.sleep(900);
      const drawers = await page.ask(`(${S}.units.find((x) => x.id === ${JSON.stringify(id)}).params.sections?.[0]?.items || []).filter((i) => i.kind === 'drawer').map((i) => i.mount || null)`);
      check(`Add with the count the field offers (${count}), "Bare boxes": the drawers are on the unit`,
        drawers.length === Number(count) && drawers.length > 0, `drawers ${JSON.stringify(drawers)}; said ${JSON.stringify(await lastSaid(page))}`);
    }
    const hung = await addDoorsHere(page);
    check('its door through the Doors section\'s own "Add doors" button', hung, hung ? '' : 'no Add doors button');
    const r = await page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${JSON.stringify(id)}); const r = P.unitResult(u.id);
      const door = r.panels.find((p) => p.role === 'front'); const bf = r.panels.find((p) => p.id === 'D1-BF');
      return { boxes: r.panels.filter((p) => /^D\\d+-DNO$/.test(p.id)).map((p) => p.id), faces: r.panels.filter((p) => p.part === 'DRAWER-FRONT').length,
        doors: r.panels.filter((p) => p.role === 'front').length, hinge: door && door.meta ? door.meta.hinge : null,
        dp: r.panels.filter((p) => /^DP/.test(p.id)).map((p) => p.id), fillers: r.panels.filter((p) => /^FILLER/.test(p.id)).map((p) => p.id),
        bf: bf ? { z: bf.box.z, d: bf.box.d } : null, depth: u.params.depth, frontT: u.params.front_t,
        setback: ${PROFILE}.wardrobe.drawers.setback,
        runners: (r.hardware.find((h) => h.role === 'runner_pairs') || {}).qty || 0 }; })()`);
    check('the drawers are cut as bare boxes behind the door: two boxes, no drawer front, one door',
      r.boxes.length === 2 && r.faces === 0 && r.doors === 1, JSON.stringify({ boxes: r.boxes, faces: r.faces, doors: r.doors }));
    check('the DP panel stands on the hinged side, a filler each side (the wardrobe\'s behind-door law)',
      r.dp.includes(r.hinge === 'L' ? 'DP-L' : 'DP-R') && r.fillers.length === 2, `hinge ${r.hinge}; DP ${JSON.stringify(r.dp)}; fillers ${JSON.stringify(r.fillers)}`);
    check('THE DOOR SETBACK: the box front stands back by the wardrobe\'s setback behind the door (z + d = depth - setback - front_t)',
      r.bf && Math.abs((r.bf.z + r.bf.d) - (r.depth - r.setback - r.frontT)) < 0.5,
      `D1-BF z ${r.bf && r.bf.z} + d ${r.bf && r.bf.d} = ${r.bf && r.bf.z + r.bf.d}; depth ${r.depth} - setback ${r.setback} - front ${r.frontT} = ${r.depth - r.setback - r.frontT}`);
    check('two runner pairs in the hardware', r.runners === 2, `runner_pairs ${r.runners}`);
    // The drawers behind the door, seen: the door opened by a real double click.
    const leaf = await page.ask(`(${S}.unitResult(${JSON.stringify(id)}).panels.find((p) => p.role === 'front') || {}).id || null`);
    const at = leaf ? await reachFree(page, id, leaf) : null;
    if (at) await page.dblclick(at.x, at.y);
    await page.sleep(1500);
    await framed(page, 'f13-drawers-behind-doors.png');
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// =============================================================================
// F14 · THE HOB UNIT
// =============================================================================
if (runs('f14')) {
  begin('f14', 'THE HOB UNIT');
  const page = await open();
  await pro(page);
  const base = await addFromLibrary(page, { category: 'Kitchen', groups: ['base-units'], entry: 'door-base' });
  check('a standard base unit beside it first (Library > Base units > Standard)', base.unit && base.unit.type === 'BUD', base.why || JSON.stringify(base.unit));
  const hobs = [];
  for (const [entry, typeId, boxes] of [['hob-drawer-3', 'BUDR_HOB', 2], ['hob-drawer-2', 'BUDR2_HOB', 1]]) {
    const res = await addFromLibrary(page, { category: 'Kitchen', groups: ['base-units', 'hob-drawer-unit'], entry });
    const u = res.unit ? await unitOf(page, res.unit.id) : null;
    check(`Library > Base units > Hob drawer unit > "${entry === 'hob-drawer-3' ? '3x' : '2x'}": a real click adds ${typeId}, prefix DR, hob on`,
      u && u.type === typeId && /^DR/.test(u.num) && u.hob === true, res.why || JSON.stringify(u && { type: u.type, num: u.num, hob: u.hob }));
    if (!u) continue;
    hobs.push(u);
    const r = await page.ask(`(() => { const r = ${S}.unitResult(${JSON.stringify(u.id)});
      const dummy = r.panels.find((p) => p.role === 'false_front');
      const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT');
      return { dummy: dummy ? { id: dummy.id, part: dummy.part, y: dummy.box.y, h: dummy.box.h, holes: r.drills.filter((d) => d.panel === dummy.id).length,
        readiness: dummy.meta && dummy.meta.readiness, fixing: dummy.meta && dummy.meta.fixing, drawer: dummy.meta ? dummy.meta.drawer ?? null : null } : null,
        top: Math.max(0, ...fronts.map((f) => f.box.y + f.box.h)),
        boxes: r.panels.filter((p) => /^D\\d+-DNO$/.test(p.id)).map((p) => p.id), fronts: fronts.length }; })()`);
    check(`${typeId} · the TOP front is a fixed dummy: FALSE-FRONT, role false_front, no holes, no drawer behind it, readiness geometry`,
      r.dummy && r.dummy.part === 'FALSE-FRONT' && r.dummy.holes === 0 && r.dummy.drawer == null && r.dummy.readiness === 'geometry'
        && r.dummy.y >= r.top - 1,
      `${JSON.stringify(r.dummy)}; drawer fronts below it reach ${r.top}`);
    check(`${typeId} · ${boxes} drawer box${boxes === 1 ? '' : 'es'} under the dummy, none behind it`,
      r.boxes.length === boxes, JSON.stringify(r.boxes));
    const room4hob = await page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${JSON.stringify(u.id)}); const r = P.unitResult(u.id);
      const box = r.panels.filter((p) => /^D\\d+-/.test(p.id) && p.part !== 'DRAWER-FRONT' && p.role !== 'false_front');
      return { top: Math.max(...box.map((p) => p.box.y + p.box.h)), height: u.params.height, clearance: ${PROFILE}.hob.clearanceMm }; })()`);
    check(`${typeId} · the highest box stays the hob's ${room4hob.clearance} mm below the top`,
      room4hob.top <= room4hob.height - room4hob.clearance, `box top ${room4hob.top}; carcass ${room4hob.height} - ${room4hob.clearance} = ${room4hob.height - room4hob.clearance}`);
  }
  await closeLibrary(page);
  // THE WORKTOP: the base unit clicked, the hob units Ctrl+clicked, the
  // selection panel's own "Add worktop" button.
  const ids = [base.unit && base.unit.id, ...hobs.map((h) => h.id)].filter(Boolean);
  if (ids.length >= 2) {
    const first = await clickUnit(page, ids[0]);
    for (const id of ids.slice(1)) await clickUnit(page, id, 2);
    const sel = await page.ask('window.__cc.ui.getState().selectedUnitIds || []');
    check(`all ${ids.length} selected by a click and Ctrl+clicks on the cabinets`, ids.every((id) => sel.includes(id)),
      `selected ${JSON.stringify(sel)}; first click by ${first && first.by}`);
    const label = await page.text('[data-add-worktop="1"]');
    if (label) await page.press('[data-add-worktop="1"]');
    const slabs = await page.ask(`${S}.worktopsOf().map((w) => ({ id: w.slabId || w.id, t: w.geometry && w.geometry.thickness,
      cutouts: (w.cutouts || []).map((c) => ({ kind: c.kind, unit: c.unitId || null, w: c.w, d: c.d, r: c.r, machined: c.machined, readiness: c.readiness })) }))`);
    const kinds = slabs.flatMap((s) => s.cutouts.map((c) => c.kind));
    check(`"${label}" lays the worktop, and it proposes a HOB cut-out over each hob unit`,
      slabs.length >= 1 && kinds.filter((k) => k === 'hob').length === hobs.length,
      `${JSON.stringify(slabs)}; said ${JSON.stringify(await lastSaid(page))}`);
    // The cut list carries the cut-out as a NOTE line under WT (the BOM panel's Parts tab).
    if (await openBom(page)) {
      await tap(page, exactly('aside button', 'Parts'));
      await page.sleep(600);
      const wt = await page.ask(`[...document.querySelectorAll('aside table tr')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim()).filter((t) => /hob cut-out|^WT /.test(t))`);
      check('the BOM panel\'s cut list (Parts) shows the worktop and its hob cut-out note', wt.some((t) => /hob cut-out/.test(t)), JSON.stringify(wt));
      await shot(page, 'f14-bom-hob-cutout.png');
      await closeBom(page);
    }
  } else {
    check('a base unit and the hob units to lay a worktop over', false, `ids ${JSON.stringify(ids)}`);
  }
  await framed(page, 'f14-hob-units-worktop.png');
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// =============================================================================
// PART D · THE WARDROBE KITS: one job, PRO through its own NEW PROJECT flow,
// retail through its own room
// =============================================================================
/** A PRO WARDROBE JOB by the New project flow, and its first wardrobe from the library. */
async function proWardrobeJob(page) {
  const job = await newProject(page, 'Wardrobe');
  check('PRO: NEW PROJECT > Wardrobe > One wall > the settings sequence > Start designing, all by hand: the editor opens on a wardrobe job',
    job.ok && (await page.ask(`${S}.project.design.projectType`)) === 'wardrobe', job.log.join(' | '));
  if (!job.ok) return null;
  const cat = await page.ask('window.__cc.ui.getState().libraryCategory');
  const res = await addFromLibrary(page, { category: 'Wardrobes', entry: 'WARDROBE' });
  check(`the library opens on Wardrobes (${cat}); its first row adds a WARDROBE`, res.unit && res.unit.type === 'WARDROBE',
    res.why || JSON.stringify(res.unit));
  return res.unit;
}
/** The pieces of a wardrobe job, read off the store: where each stands and where its front is. */
const pieces = (page) => page.ask(`(() => { const P = ${S}; const gap0 = Math.max(0, Number((${PROFILE}.room || {}).wallBackClearance) || 0);
  return P.units.map((u) => { const r = P.unitResult(u.id); const gap = (u.params.wall_gap != null && u.params.wall_gap !== '') ? Number(u.params.wall_gap) : gap0;
    return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall ?? 0, x: u.position.x_mm, w: u.params.width, h: u.params.height,
      d: u.params.depth, gap, front: gap + Number(u.params.depth), mount: u.params.mount_height ?? null, doors: u.params.doors === true,
      drawerFronts: r.panels.filter((p) => p.part === 'DRAWER-FRONT').length, leaves: r.panels.filter((p) => p.role === 'front').length,
      ep: (u.params.end_panels || []).map((e) => e.side).sort().join('') }; }); })()`);
/** Do two pieces stand side by side on one wall (a panel's thickness between them at most)? */
const beside = (a, b) => a && b && a.wall === b.wall
  && (Math.abs((a.x + a.w) - b.x) <= 30 || Math.abs((b.x + b.w) - a.x) <= 30);
/** Retail: the room, a wardrobe through WHERE's own button, then EXTRAS. */
async function retailWardrobe(page) {
  await room(page);
  await withWardrobe(page);
  await page.press('[data-testid="cat-extras"]');
  await page.sleep(800);
  const units = await pieces(page);
  check('RETAIL: a wardrobe through the WHERE step\'s own button, then the EXTRAS step', units.length === 1 && units[0].type === 'WARDROBE'
    && await page.has('[data-testid="extras-group-additions"]'), JSON.stringify(units.map((u) => [u.type, u.num])));
  return units[0] || null;
}
/** Retail: an EXTRAS button pressed; the new piece and what the step said. */
async function retailAdd(page, testid) {
  const before = new Set((await pieces(page)).map((u) => u.id));
  const label = await page.text(`[data-testid="${testid}"]`);
  if (!label) return { label: null, unit: null, said: 'no such button on the screen' };
  await page.press(`[data-testid="${testid}"]`);
  await page.sleep(1500);
  const unit = (await pieces(page)).find((u) => !before.has(u.id)) || null;
  const said = await page.text('[data-testid="layout-said"]');
  return { label, unit, said };
}

if (runs('f16')) {
  begin('f16', 'THE CHEST OF DRAWERS BETWEEN WARDROBES');
  const page = await open();
  const wardrobe = await proWardrobeJob(page);
  if (wardrobe) {
    const before = new Set((await pieces(page)).map((u) => u.id));
    // The count by the existing variants control: the drawer group's flyout.
    await library(page, { category: 'Wardrobes', groups: ['chest-of-drawers'], entry: 'chest-2' });
    const rows = await page.ask('[...document.querySelectorAll(\'[data-library-flyout="chest-of-drawers"] [data-library-entry]\')].map((b) => b.dataset.libraryEntry + ": " + b.textContent.replace(/\\s+/g, " ").trim())');
    check('Wardrobes > "Chest of drawers" flies out the variants control: 2x, 3x, 4x', rows.length === 3, JSON.stringify(rows));
    // (the click above already placed a 2x; the 3x is the default retail adds, so it is placed too)
    await library(page, { category: 'Wardrobes', groups: ['chest-of-drawers'], entry: 'chest-3' });
    await closeLibrary(page);
    const all = await pieces(page);
    const w = all.find((u) => u.id === wardrobe.id);
    const added = all.filter((u) => !before.has(u.id));
    const want = await page.ask(`${PROFILE}.wardrobeChest.defaults`);
    for (const [typeId, fronts] of [['WARDROBE_CHEST2', 2], ['WARDROBE_CHEST3', 3]]) {
      const c = added.find((u) => u.type === typeId);
      check(`PRO: the ${fronts}x row adds ${typeId}, prefix WC, ${fronts} drawer fronts, the defaults block's width and height`,
        c && /^WC/.test(c.num) && c.drawerFronts === fronts && c.w === want.width && c.h === want.height,
        c ? `${c.num} ${c.w} x ${c.h} x ${c.d}, ${c.drawerFronts} fronts; block ${JSON.stringify(want)}` : `added ${JSON.stringify(added.map((u) => u.type))}`);
      if (c) {
        check(`PRO: ${typeId} is born at the wardrobe's depth and gap, beside a wardrobe-job piece`,
          c.d === w.d && c.gap === w.gap && added.concat([w]).some((o) => o.id !== c.id && beside(c, o)),
          `chest d ${c.d} gap ${c.gap} x ${c.x}; wardrobe d ${w.d} gap ${w.gap} x ${w.x} w ${w.w}`);
      }
    }
    await framed(page, 'f16-pro-chests.png');
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page (PRO)', errs.slice(0, 3).join(' | '));
  await page.close();

  const shop = await open();
  const rw = await retailWardrobe(shop);
  if (rw) {
    const got = await retailAdd(shop, 'extras-add-chest');
    check(`RETAIL: EXTRAS "${got.label}" adds a WARDROBE_CHEST3 (the x3 default) beside the wardrobe`,
      got.label === 'ADD CHEST OF DRAWERS' && got.unit && got.unit.type === 'WARDROBE_CHEST3' && beside(got.unit, rw),
      got.unit ? `${got.unit.num} at x ${got.unit.x} w ${got.unit.w}; wardrobe x ${rw.x} w ${rw.w}; said "${got.said}"` : `said "${got.said}"`);
    if (got.unit) {
      check('RETAIL: the chest is as deep as the wardrobe, its three drawers cut', got.unit.d === rw.d && got.unit.drawerFronts === 3,
        `chest d ${got.unit.d}, wardrobe d ${rw.d}; ${got.unit.drawerFronts} drawer fronts`);
    }
    await shot(shop, 'f16-retail-chest.png');
  }
  const errs2 = pageErrors(shop);
  if (errs2.length) note('console errors on the page (retail)', errs2.slice(0, 3).join(' | '));
  await shop.close();
}

if (runs('f17')) {
  begin('f17', 'THE FLOATING DESK');
  const page = await open();
  const wardrobe = await proWardrobeJob(page);
  const deskChecks = async (p, d, w, who) => {
    const want = await p.ask(`${PROFILE}.wardrobeDesk.defaults`);
    check(`${who}: WARDROBE_DESK, prefix WD, one drawer, hung at mount_height ${want.mountHeight}, the defaults block's height`,
      d && d.type === 'WARDROBE_DESK' && /^WD/.test(d.num) && d.drawerFronts === 1 && d.mount === want.mountHeight && d.h === want.height,
      d ? `${d.num} ${d.w} x ${d.h} x ${d.d}, mount ${d.mount}, ${d.drawerFronts} drawer front(s)` : 'no desk');
    if (!d) return;
    check(`${who}: as deep as the wardrobe and its FRONT on the wardrobe's front (T74 F7's default), beside it`,
      d.d === w.d && Math.abs(d.front - w.front) < 0.5 && beside(d, w), `desk d ${d.d} front ${d.front} x ${d.x}; wardrobe d ${w.d} front ${w.front} x ${w.x} w ${w.w}`);
    const top = await p.ask(`(() => { const P = ${S}; const rec = (P.project.design.worktops || []).find((r) => (r.unitIds || []).includes(${JSON.stringify(d.id)}));
      const slab = (P.worktopsOf ? P.worktopsOf() : []).find((s) => (s.unitIds || (s.record && s.record.unitIds) || []).includes(${JSON.stringify(d.id)})) || (P.worktopsOf ? P.worktopsOf() : [])[0];
      return { rec: rec ? { kind: rec.kind || null, thickness: rec.thickness ?? null, units: rec.unitIds.length } : null,
        slab: slab ? { t: slab.geometry && slab.geometry.thickness, w: slab.geometry && slab.geometry.w, d: slab.geometry && slab.geometry.d } : null }; })()`);
    check(`${who}: it arrives with its own top: a worktop record of kind desk, ${want.topThickness} mm, and the slab is ${want.topThickness} thick`,
      top.rec && top.rec.kind === 'desk' && top.rec.thickness === want.topThickness && top.slab && top.slab.t === want.topThickness, JSON.stringify(top));
  };
  if (wardrobe) {
    const res = await addFromLibrary(page, { category: 'Wardrobes', entry: 'WARDROBE_DESK' });
    await closeLibrary(page);
    const all = await pieces(page);
    const d = res.unit ? all.find((u) => u.id === res.unit.id) : null;
    check('PRO: Wardrobes > the desk row, a real click', Boolean(d), res.why || JSON.stringify(res.unit));
    await deskChecks(page, d, all.find((u) => u.id === wardrobe.id), 'PRO');
    await framed(page, 'f17-pro-desk.png');
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page (PRO)', errs.slice(0, 3).join(' | '));
  await page.close();

  const shop = await open();
  const rw = await retailWardrobe(shop);
  if (rw) {
    const got = await retailAdd(shop, 'extras-add-desk');
    check(`RETAIL: EXTRAS "${got.label}" hangs a desk beside the wardrobe`, got.label === 'ADD DESK' && Boolean(got.unit),
      got.unit ? `${got.unit.type} ${got.unit.num}; said "${got.said}"` : `said "${got.said}"`);
    await deskChecks(shop, got.unit, (await pieces(shop)).find((u) => u.id === rw.id), 'RETAIL');
    await shot(shop, 'f17-retail-desk.png');
  }
  const errs2 = pageErrors(shop);
  if (errs2.length) note('console errors on the page (retail)', errs2.slice(0, 3).join(' | '));
  await shop.close();
}

if (runs('f18')) {
  begin('f18', 'THE LOW UNITS OF A WARDROBE JOB');
  const page = await open();
  const wardrobe = await proWardrobeJob(page);
  const want = { h: null };
  if (wardrobe) {
    want.h = (await page.ask(`${PROFILE}.wardrobeLow.defaults`)).height;
    const res = await addFromLibrary(page, { category: 'Wardrobes', entry: 'WARDROBE_LOW' });
    await closeLibrary(page);
    const all = await pieces(page);
    const l = res.unit ? all.find((u) => u.id === res.unit.id) : null;
    const w = all.find((u) => u.id === wardrobe.id);
    check(`PRO: Wardrobes > "Low unit" adds WARDROBE_LOW, prefix WL, its own low height (${want.h})`,
      l && l.type === 'WARDROBE_LOW' && /^WL/.test(l.num) && l.h === want.h, res.why || (l ? `${l.num} ${l.w} x ${l.h} x ${l.d}` : 'none'));
    if (l) {
      check('PRO: born at the wardrobe\'s depth and gap, beside it', l.d === w.d && l.gap === w.gap && beside(l, w),
        `low d ${l.d} gap ${l.gap} x ${l.x}; wardrobe d ${w.d} gap ${w.gap} x ${w.x} w ${w.w}`);
    }
    await framed(page, 'f18-pro-low-unit.png');
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page (PRO)', errs.slice(0, 3).join(' | '));
  await page.close();

  const shop = await open();
  const rw = await retailWardrobe(shop);
  if (rw) {
    const got = await retailAdd(shop, 'extras-add-low-unit');
    const h = (await shop.ask(`${PROFILE}.wardrobeLow.defaults`)).height;
    check(`RETAIL: EXTRAS "${got.label}" adds a WARDROBE_LOW beside the wardrobe, as deep as it, ${h} high`,
      got.label === 'ADD LOW UNIT' && got.unit && got.unit.type === 'WARDROBE_LOW' && got.unit.d === rw.d && got.unit.h === h && beside(got.unit, rw),
      got.unit ? `${got.unit.num} ${got.unit.w} x ${got.unit.h} x ${got.unit.d} at x ${got.unit.x}; wardrobe d ${rw.d} x ${rw.x} w ${rw.w}; said "${got.said}"` : `said "${got.said}"`);
    if (got.unit) {
      check('RETAIL: it arrives with its door on (the store\'s setDoors), cut as a leaf', got.unit.doors && got.unit.leaves >= 1,
        `doors ${got.unit.doors}, leaves ${got.unit.leaves}`);
    }
    await shot(shop, 'f18-retail-low-unit.png');
  }
  const errs2 = pageErrors(shop);
  if (errs2.length) note('console errors on the page (retail)', errs2.slice(0, 3).join(' | '));
  await shop.close();
}

// =============================================================================
// F20 · MULTI-UNIT SETS, AND FIVE OF THEM SHIPPED AS DATA
// =============================================================================
/** Units left to right along their wall, with what a set check needs. */
const runNow = (page) => page.ask(`(() => { const P = ${S}; return [...P.units].sort((a, b) => ((a.position.wall ?? 0) - (b.position.wall ?? 0)) || (a.position.x_mm - b.position.x_mm))
  .map((u) => ({ id: u.id, type: u.type, num: u.params.unit_num, x: u.position.x_mm, w: u.params.width, mount: u.params.mount_height ?? null,
    ep: (u.params.end_panels || []).map((e) => e.side).sort().join('') })); })()`);
const worktopRecords = (page) => page.ask(`(${S}.project.design.worktops || []).map((w) => ({ units: (w.unitIds || []).length, kind: w.kind || null, thickness: w.thickness ?? null }))`);

if (runs('f20')) {
  begin('f20', 'MULTI-UNIT SETS, AND FIVE OF THEM SHIPPED AS DATA');
  // --- (1) the Sets shelf in a kitchen job, the Sideboard, one undo ---
  const page = await open();
  await pro(page);
  const why = await menu(page, 'Library', 'Sets');
  const shelf = await page.ask('[...document.querySelectorAll(\'[data-shipped-sets="1"] [data-set]\')].map((b) => ({ id: b.dataset.set, name: (b.querySelector(".text-sm") || {}).textContent || "", text: b.innerText.replace(/\\s+/g, " ").trim() }))');
  const names = shelf.map((s) => s.name.trim());
  check('Library (top bar) > Sets: the shelf lists the five shipped sets, in the job types\' order',
    !why && JSON.stringify(names) === JSON.stringify(['Media wall', 'Sideboard', 'Vanity', 'Utility', 'Hallway']),
    why || JSON.stringify(shelf.map((s) => s.text)));
  const before = (await runNow(page)).length;
  const undoDepth0 = await page.ask('(window.__cc.history.getState().past || []).length');
  let saidSet = null;
  if (await page.has('[data-set="set-sideboard"]')) {
    await page.press('[data-set="set-sideboard"]');
    saidSet = await lastSaid(page);
    await page.sleep(1200);
  }
  const run = await runNow(page);
  check('a real click on "Sideboard": three units in, door, drawer, door, left to right',
    run.length === before + 3 && JSON.stringify(run.map((u) => u.type)) === JSON.stringify(['BUD', 'BUDR', 'BUD']),
    `${JSON.stringify(run.map((u) => `${u.num} ${u.type} x ${u.x} w ${u.w} ep ${u.ep || '-'}`))}; said ${JSON.stringify(saidSet)}`);
  check('end panels at both ends of the set (L on the first, R on the last)',
    run.length === 3 && run[0].ep.includes('L') && run[2].ep.includes('R'), JSON.stringify(run.map((u) => u.ep)));
  const tops = await worktopRecords(page);
  const slabs = await page.ask(`${S}.worktopsOf().map((w) => w.geometry && w.geometry.thickness)`);
  check('one 25 mm top over the three (the per-worktop thickness, F17\'s)',
    tops.length === 1 && tops[0].units === 3 && tops[0].thickness === 25 && slabs.length === 1 && slabs[0] === 25,
    `records ${JSON.stringify(tops)}; slabs ${JSON.stringify(slabs)}`);
  await closeLibrary(page);
  await framed(page, 'f20-sideboard.png');
  // Ctrl+Z, the real key, once.
  const undoDepth1 = await page.ask('(window.__cc.history.getState().past || []).length');
  await ctrlKey(page, 'z');
  await page.sleep(800);
  const after = await runNow(page);
  check('Ctrl+Z (the real key, pressed once) takes the whole set back in one step: units and top',
    after.length === before && (await worktopRecords(page)).length === 0,
    `units ${run.length} -> ${after.length}; undo stack ${undoDepth0} -> ${undoDepth1} (the set was ${undoDepth1 - undoDepth0} step); tops ${JSON.stringify(await worktopRecords(page))}`);
  let errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();

  // --- (2) NEW PROJECT > Media wall: the first plus offers the set ---
  const job = await open();
  const flow = await newProject(job, 'Media wall');
  check('NEW PROJECT > Media wall > One wall > the settings sequence > Start designing, all by hand',
    flow.ok && (await job.ask(`${S}.project.design.projectType`)) === 'media_wall', flow.log.join(' | '));
  if (flow.ok) {
    const plus = await job.ask(`(() => { const b = document.querySelector('[data-first-set]'); if (!b) return null;
      return { set: b.dataset.firstSet, aria: b.getAttribute('aria-label'), said: (b.nextElementSibling || {}).textContent || '' }; })()`);
    check('the first plus says "Add the Media wall set"', plus && plus.set === 'set-media-wall' && plus.aria === 'Add the Media wall set'
      && plus.said.trim() === 'Add the Media wall set', JSON.stringify(plus));
    await shot(job, 'f20-media-wall-first-plus.png');
    let saidPlus = null;
    if (plus) {
      await job.press('[data-first-set]');
      saidPlus = await lastSaid(job);
      await job.sleep(1500);
    }
    const mw = await runNow(job);
    const types = mw.map((u) => u.type);
    const wud = mw.find((u) => u.type === 'WUD');
    check('a real click on it inserts the set: two tall columns, the wall unit hung at 300 as the floating base, two shelf panels',
      types.filter((t) => t === 'BUDTALL').length === 2 && wud && wud.mount === 300 && types.filter((t) => t === 'FREE_PANEL').length === 2 && mw.length === 5,
      `${JSON.stringify(mw.map((u) => `${u.num} ${u.type} x ${u.x} w ${u.w}${u.mount != null ? ` mount ${u.mount}` : ''}`))}; said ${JSON.stringify(saidPlus)}`);
    await closeLibrary(job);
    await framed(job, 'f20-media-wall-in.png');

    // --- (3) two units selected, right-click, Save as a set ---
    const cols = mw.filter((u) => u.type === 'BUDTALL');
    if (cols.length === 2) {
      const a = await clickUnit(job, cols[0].id);
      const b = await clickUnit(job, cols[1].id, 2);
      const sel = await job.ask('window.__cc.ui.getState().selectedUnitIds || []');
      check('the two columns selected by a click and a Ctrl+click', cols.every((c) => sel.includes(c.id)),
        `selected ${JSON.stringify(sel)}; clicks by ${a && a.by}, ${b && b.by}`);
      const rc = await clickUnit(job, cols[0].id, 0, { right: true });
      const entry = await job.ask('(() => { const e = document.querySelector(\'[data-menu-entry="save-template"]\'); return e ? e.textContent.replace(/\\s+/g, " ").trim() : null; })()');
      check('a right-click on one of them: the menu offers "Save as a set (2)"', entry && entry.startsWith('Save as a set (2)'),
        `entry ${JSON.stringify(entry)}; right-click by ${rc && rc.by}`);
      if (entry) {
        await job.press('[data-menu-entry="save-template"]');
        await until(job, 'Boolean(document.querySelector(\'[data-modal-name="save-template"]\'))', 4000);
        const name = 'Walk columns';
        const typed = await typeInto(job, 'document.querySelector(\'[data-modal-name="save-template"] input\')', name);
        await tap(job, exactly('[data-modal-name="save-template"] button', 'Save'));
        await job.sleep(1200);
        const listed = await job.ask(`(() => { const list = document.querySelector('[data-library-list="1"]'); if (!list) return null;
          const head = (list.parentElement.querySelector('.uppercase') || {}).textContent || '';
          const row = [...list.querySelectorAll('button')].find((b) => (b.querySelector('.text-sm') || {}).textContent === ${JSON.stringify(name)});
          return { head, row: row ? row.innerText.replace(/\\s+/g, ' ').trim() : null }; })()`);
        check(`typed "${name}", Save: the Sets shelf opens and lists it as a set of 2 units`,
          typed && listed && listed.row && /2 units/.test(listed.row), `${JSON.stringify(listed)}; said ${JSON.stringify(await lastSaid(job))}`);
        await shot(job, 'f20-saved-set-on-the-shelf.png');
      }
    } else {
      check('two tall columns to select', false, JSON.stringify(types));
    }
  }
  errs = pageErrors(job);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await job.close();
}

// =============================================================================
// F21 · THE CSV CONTRACT WITH JOINERYCORE
// =============================================================================
if (runs('f21')) {
  begin('f21', 'THE CSV CONTRACT WITH JOINERYCORE');
  const page = await open();
  await pro(page);
  await downloadsOn(page);
  const bud = await addFromLibrary(page, { category: 'Kitchen', groups: ['base-units'], entry: 'door-base' });
  await closeLibrary(page);
  note('a base unit in the room so the job has a bill of materials', bud.unit ? `${bud.unit.type} ${bud.unit.id}` : bud.why);
  // A board assigned BY HAND first, from the BOM's own Assign… on the
  // purchase list: the project now names a stock row with a code.
  let part = null;
  let assigned = false;
  if (await openBom(page)) {
    await page.press('[data-bom-purchase-tab="1"]');
    part = await page.ask(`(() => { const row = [...document.querySelectorAll('[data-bom-purchase="1"] tr[data-bom-line]')]
      .find((r) => (r.cells[0]?.textContent || '').trim() === 'Carcase sides'); const b = row && row.querySelector('[data-bom-assign]'); return b ? b.dataset.bomAssign : null; })()`);
    if (part) {
      await tap(page, `[...document.querySelectorAll('[data-bom-purchase="1"] [data-bom-assign="${part}"]')][0]`);
      await until(page, `Boolean(document.querySelector('[data-material-picker="${part}"]'))`, 4000);
      if (await page.has(`[data-material-picker="${part}"]`)) {
        await page.press(`[data-material-picker="${part}"]`);
        if (await page.has('[data-material-option="mat_mfc18_white"]')) {
          await page.press('[data-material-option="mat_mfc18_white"]');
          assigned = true;
        }
      }
      await tap(page, exactly('button', 'Close'));
      await page.sleep(600);
    }
    const held = part ? await page.ask(`((window.__cc.materials.getState().data || {}).base || {})[${JSON.stringify(part)}]?.material_id || null`) : null;
    check('BOM > Assign… on "Carcase sides", the picker, "MFC White W980 18 mm": the board is assigned by hand (a stock row with a code)',
      assigned && held === 'mat_mfc18_white', `part ${part}; clicked ${assigned}; the record holds ${held}`);
  }
  await closeBom(page);
  const why = await menu(page, 'Database', 'Materials…');
  const opened = await until(page, 'Boolean(document.querySelector(\'[data-modal-name="warehouse"]\'))', 4000);
  check('Database > Materials… opens the warehouse', !why && opened, why || '');
  const labels = await page.ask(`(() => { const t = (s) => (document.querySelector(s) || {}).textContent || null;
    return { imp: t('[data-warehouse-import]'), proj: t('[data-warehouse-export-project]'), all: t('[data-warehouse-export-all]') }; })()`);
  check('its three buttons read "Import from JoineryCore (CSV)", "Export project list for JoineryCore (CSV)", "Export for JoineryCore (CSV)"',
    labels.imp && labels.imp.trim() === 'Import from JoineryCore (CSV)'
      && /^Export project list for JoineryCore \(CSV\) \(\d+\)$/.test((labels.proj || '').trim())
      && /^Export for JoineryCore \(CSV\) \(\d+\)$/.test((labels.all || '').trim()),
    JSON.stringify(labels));
  // IMPORT: a JoineryCore-shaped file, chosen through the browser's own file
  // chooser. The Import button is clicked for real; the chooser it opens is
  // intercepted and answered with the file, which is what a hand picking it does.
  const UP = join(SHOTS, '.upload');
  mkdirSync(UP, { recursive: true });
  const jcFile = join(UP, 'joinerycore-stock.csv');
  const uuid = '9F1C2A7E-75F2-4B0C-9D2E-0A1B2C3D4E5F';
  writeFileSync(jcFile, [
    'item_number,name,category,subcategory,size,thickness,color,unit,cost_per_unit,image_url,jc_uuid,notes',
    `JC-7501,MFC White W980 18 mm,sheets,MFC,2800 x 2070,18,White,sheet,"42,50",,${uuid},"Two lines:\nthe second survives"`,
  ].join('\r\n'));
  await page.send('Page.setInterceptFileChooserDialog', { enabled: true });
  await page.press('[data-warehouse-import]');
  const { root } = await page.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-modal-name="warehouse"] input[type="file"]' });
  if (nodeId) await page.send('DOM.setFileInputFiles', { nodeId, files: [jcFile] });
  await page.sleep(1500);
  const rows = await page.ask('(window.__cc.warehouse.getState().rows || []).map((r) => ({ item: r.item_number, name: r.name, cost: r.cost_per_unit, jc: r.jc_uuid, notes: r.notes, src: r.price_source }))');
  const row = rows.find((r) => r.name === 'MFC White W980 18 mm');
  check('Import from JoineryCore (CSV): the row lands by its jc_uuid, "42,50" read as 42.5, the two-line note whole',
    nodeId && row && Number(row.cost) === 42.5 && String(row.jc).toLowerCase() === uuid.toLowerCase() && /\n/.test(row.notes || ''),
    `${JSON.stringify(row)}; said ${JSON.stringify(await lastSaid(page))}`);
  await shot(page, 'f21-warehouse.png');
  // EXPORT: the catalogue, captured as the file the browser saves.
  const cols = 'item_number,name,category,subcategory,size,thickness,color,unit,cost_per_unit,image_url,jc_uuid,notes';
  let had = filesNow();
  await page.press('[data-warehouse-export-all]');
  const cat = await downloaded(page, had);
  const catLines = cat ? cat.text.split(/\r?\n/) : [];
  check('Export for JoineryCore (CSV): a file is saved, its header the twelve columns of the contract',
    cat && catLines[0] === cols, cat ? `${cat.name}: ${catLines[0]}` : 'no file saved');
  check('…and the imported row comes back out by identity: its jc_uuid, 42.5, the note',
    cat && cat.text.includes(uuid) && /,42\.5,/.test(cat.text) && cat.text.includes('the second survives'),
    cat ? JSON.stringify(cat.text.split(/\r?\n/).slice(1, 4)) : '');
  had = filesNow();
  const projLabel = (await page.text('[data-warehouse-export-project]')) || '';
  await page.press('[data-warehouse-export-project]');
  const proj = await downloaded(page, had);
  if (proj) {
    check('Export project list for JoineryCore (CSV): the project\'s rows, the same twelve columns', proj.text.split(/\r?\n/)[0] === cols,
      `${proj.name}: ${proj.text.split(/\r?\n/).slice(0, 3).join(' / ')}`);
  } else {
    note(`Export project list (${projLabel.trim()}): no file. The list is by IDENTITY (the jc_uuid of the stock rows the project's assignments name); `
      + 'the board assigned above is a mock stock row with no jc_uuid, so the project names no warehouse row and the app says so in words',
      JSON.stringify(await lastSaid(page)));
  }
  await key(page, 'Escape');
  if (await page.has('[data-modal-name="warehouse"]')) await tap(page, exactly('[data-modal-name="warehouse"] button', 'Close'));
  // THE PURCHASE LIST: the BOM panel's own Purchase CSV.
  if (await openBom(page)) {
    await page.press('[data-bom-purchase-tab="1"]');
    if (!(await page.has('[data-bom-purchase-export="1"]'))) await openBom(page);
    await page.press('[data-bom-purchase-tab="1"]');
    had = filesNow();
    await page.press('[data-bom-purchase-export="1"]');
    const buy = await downloaded(page, had);
    const lines = buy ? buy.text.split(/\r?\n/) : [];
    const head = lines.find((l) => l.startsWith('GROUP,')) || null;
    check('the BOM panel\'s "Purchase CSV" is saved with JC_UUID and CODE after PARTS',
      head === 'GROUP,MATERIAL,ASSIGNED,QTY,UNIT,SHEETS,UNIT_COST,LINE_COST,PARTS,JC_UUID,CODE', buy ? `${buy.name}: ${head}` : 'no file saved');
    const mfc = lines.find((l) => l.includes('MFC White W980 18 mm')) || null;
    check('the line assigned by hand carries the stock row\'s code in CODE', mfc && /,W980 SM$/.test(mfc), JSON.stringify(mfc));
    note('JC_UUID on a purchase line is the STOCK row\'s jc_uuid; the mock stock list carries none, so the column is empty here (the warehouse rows carry it, above)',
      JSON.stringify(lines.filter((l) => /,yes,/.test(l)).slice(0, 2)));
    await shot(page, 'f21-bom-purchase.png');
  } else {
    check('the top bar\'s Export opens the BOM panel', false, '');
  }
  rmSync(UP, { recursive: true, force: true });
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// =============================================================================
// THE LEDGER
// =============================================================================
const fresh = process.argv.includes('--fresh');
const ledger = `${SHOTS}walk-cf.txt`;
const HEAD = [
  'T75 · THE ACCEPTANCE WALK, PARTS C TO F (F12 to F14, F16 to F18, F20, F21)',
  '',
  'CLAUDE.md T75 TESTS AND PROOF, run section by section against',
  '`npx vite preview`, the hardware served from the silent showroom. Every',
  'gesture is a REAL mouse or key event at a DOM control\'s centre, or at a pixel',
  'the scene\'s own raycaster says the cabinet is under (and the page says the',
  'canvas owns); the store is only READ. A NOTE names a gesture the app offers',
  'no control for, or a reading worth keeping. The frames beside this file',
  '(fNN-*.png) are what the browser saw.',
  '',
].join('\n');
// The ledger keeps one block per section; a rerun of a section replaces its block.
const blocks = new Map();
if (!fresh && existsSync(ledger)) {
  let name = null;
  for (const line of readFileSync(ledger, 'utf8').split('\n')) {
    const m = line.match(/^=== (\w+) · /);
    if (m) { name = m[1].toLowerCase(); blocks.set(name, [line]); continue; }
    if (/^(TOTAL|SECTION) /.test(line)) { name = null; continue; }
    if (name && line.trim()) blocks.get(name).push(line);
  }
}
for (const name of new Set(steps.map((s) => s.section))) {
  const mine = steps.filter((s) => s.section === name);
  const head = mine.find((s) => s.header);
  blocks.set(name, [
    `=== ${name.toUpperCase()} · ${head ? head.header : ''}`,
    ...mine.filter((s) => !s.header).map((s) => `${s.note ? ' ·  ' : (s.ok ? ' ok ' : 'FAIL')} ${s.label}${s.detail ? ` · ${s.detail}` : ''}`),
  ]);
}
const names = [...blocks.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
const counts = names.map((n) => {
  const lines = blocks.get(n);
  return {
    n, ok: lines.filter((l) => l.startsWith(' ok ')).length, fail: lines.filter((l) => l.startsWith('FAIL')).length, notes: lines.filter((l) => l.startsWith(' ·  ')).length,
  };
});
const total = counts.reduce((s, c) => ({ ok: s.ok + c.ok, fail: s.fail + c.fail, notes: s.notes + c.notes }), { ok: 0, fail: 0, notes: 0 });
writeFileSync(ledger, undash([
  HEAD,
  ...names.flatMap((n) => [...blocks.get(n), '']),
  ...counts.map((c) => `SECTION ${c.n}: ${c.ok} ok, ${c.fail} FAIL, ${c.notes} notes`),
  `TOTAL ${total.ok + total.fail} checks · ${total.fail} failed · ${total.notes} notes`,
  '',
].join('\n')));
rmSync(DOWNLOADS, { recursive: true, force: true });
const failed = steps.filter((s) => !s.header && !s.note && !s.ok);
process.stdout.write(`\n${steps.filter((s) => !s.header && !s.note).length} checks · ${failed.length} failed\n`);
await showroomDown();
process.exit(failed.length ? 1 : 0);
