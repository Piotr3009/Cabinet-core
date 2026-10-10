#!/usr/bin/env node
// T76 · THE ACCEPTANCE WALK OF THE DECORATIVE FRONTS (CLAUDE.md T76 F7)
//
// CLAUDE.md T76 F7: *"`scripts/t76-walk.mjs` (T75's harness), frames
// `verify/t76/fNN-*.png`, output `verify/t76/walk.txt`"*, and the six things
// it walks. Each is a section here, in F7's own order (the PRO item is two
// sections, one per cabinet):
//
//   f01  PRO, a base unit: Fronts set to G, GF, A, AH, FL, AM in turn by the
//        real select; for each the solid, the recipe controls, one number
//        typed, the cut list, the CNC ZIP and the T71 drawing set
//   f02  PRO, a wardrobe: the same six styles, the same readings
//   f03  PRO, the L of T75: a CORNER_L_BASE with G fronts
//   f04  PRO, an old project: Herbal Hill opened, no decoration, its cut list
//        byte-compared with the one the base build (b810560) writes
//   f05  PRO, refusals: an arch too low for its rise; a 25 pitch on a 100 leaf
//   f06  Retail: the FRONTS step, each tile once, no numeric field, MY ESTIMATE
//   f07  PRO, save and reload: a decorated project round-trips
//
// The section numbers are the walk's own (CLAUDE.md T76's F1 to F8 are the
// turn's work; every section here proves F7).
//
// Every gesture is the browser's own input pipe (CDP
// `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent` / `Input.insertText`),
// aimed at a DOM control's centre or at a pixel where the scene's own
// raycaster says the piece is the nearest thing and the page says the canvas
// owns it (`t75-harness.mjs reachFree`). A native select is driven as T75's
// harness drives one (a real click, the arrows, Enter). The store is READ to
// say what happened; it is never written to make something happen. Where the
// app offers no control for a gesture the walk says so as a NOTE.
//
// THE STAGE. PRO opens on its start screen; T74's `pro()` sets the stage the
// way every walk since `scripts/e2e-turn18.mjs` has (a new project, the
// editor's own door), as T75's walk does. That is the stage, not a gesture
// any check below is about. f04 opens its project from the start screen with
// a real click instead, and f07 reopens its saved one the same way after the
// page is reloaded: PRO has no file-open control, a saved project lives on
// the browser's shelf (localStorage `cc.library.v1`, the shape
// `lib/projectLibrary.js saveLocalProject` writes), so f04 puts the Herbal
// Hill file, built by that very function from the T71 fixture, on the shelf
// the way a saved project sits there, and opens it from the list. The
// toolbar's own HIDE DIMENSIONS is pressed at the start of the PRO sections,
// so a frame shows the board and not the figures over it.
//
// The hands are T74's and T75's (`t74-harness.mjs`, `t75-harness.mjs`,
// `cdp.mjs`, `fixture-server.mjs`), imported. T75's walk keeps its small
// helpers (a section opened, a unit selected, the library row) inside
// `t75-walk.mjs`, which runs its sections when imported; the ones below are
// this walk's own, written for the decorative fronts.
//
//   npm run build && npx vite preview --port 4173 --strictPort
//   node scripts/t76-walk.mjs --fresh             every section, a new ledger
//   node scripts/t76-walk.mjs f04 f06             add to it (a rerun replaces its section)
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t76-walk.mjs ...   another port
//   T76_BASE_URL=http://127.0.0.1:4184/ ...       f04: a base build already served
//   T76_WALK_TMP=<dir> ...                        downloads and the base worktree
//
// Without T76_BASE_URL, f04 builds the base itself: a detached worktree at
// b810560 in T76_WALK_TMP, `node_modules` linked, `npm run build`, served on
// port 4183, and removed (`git worktree remove --force`) when it is done.
//
// Sections: f01 f02 f03 f04 f05 f06 f07 (all when none named).

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, symlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import JSZip from 'jszip';
import {
  open, pro, room, withWardrobe, unitsNow, showroomUp, showroomDown, settleCamera, pointOn, BASE,
} from './t74-harness.mjs';
import {
  key, clickWith, boxOf, choose, until, reachFree, orbitFree,
} from './t75-harness.mjs';

const REPO = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../verify/t76/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const TMP = process.env.T76_WALK_TMP || join(tmpdir(), `t76-walk-${process.pid}`);
mkdirSync(TMP, { recursive: true });
const BASE_SHA = 'b810560';
// The commit the walk starts at (each section's "walked at" line names it);
// the build stamp each section reads off the page names the bundle itself.
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

const ORDER = ['f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07'];
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

// ─── THE LEDGER'S HANDS (T75's shape: the section named on every line) ──────
const steps = [];
let current = '';
// The app's older sentences carry en and em dashes; the ledger quotes them
// with the dash ESCAPED, so the file this turn writes stays dash-free
// (CLAUDE.md LAWS) and the quote stays true (T74's and T75's `undash`).
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
  steps.push({ section: name, header: title, at: new Date().toISOString().slice(0, 16).replace('T', ' ') });
  process.stdout.write(`\n=== ${name.toUpperCase()} · ${title} ===\n`);
};
const frames = [];
const shot = async (page, file, clip = null) => {
  await page.screenshot(`${SHOTS}${file}`, clip);
  frames.push(file);
  return file;
};
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));
const j = (v) => JSON.stringify(v);
const lastSaid = (page, n = 3) => page.ask(`(window.__cc.ui.getState().messages || []).slice(-${n}).map((m) => m.message)`);
const stamp = (page) => page.ask('((document.body.innerText || \'\').match(/#\\d+ · [0-9-]+ [0-9:]+ UTC · [0-9a-f]{7}/) || [null])[0]');

// ─── WHAT THE WALK READS ──────────────────────────────────────────────────
const S = 'window.__cc.project.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const LABELS = {
  F: 'Flat', S: 'Shaker', G: 'Grooved', GF: 'Grooved with frame', A: 'Arched', AH: 'Arched handleless', GL: 'Glass', FL: 'Fluted', AM: 'Applied moulding',
};
/** The numbers the PRO recipe controls show, per FrontDecorationControls.jsx FIELD_LABELS. */
const FIELD_KEYS = ['frameMm', 'recessDepthMm', 'grooveWidthMm', 'fluteDiameterMm', 'grooveDepthMm', 'groovePitchMm', 'grooveInsetMm', 'mouldingInsetMm', 'mouldingWidthMm', 'mouldingProjectionMm'];
const recipeOf = async (page, style) => JSON.parse(await page.ask(`JSON.stringify(((${PROFILE}.front || {}).decoration || {})[${j(style)}] || null)`));

/** A unit's fronts as the engine cut them, and what rides with them. */
const unitNow = (page, unitId) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(unitId)});
  if (!u) return null; const r = P.unitResult(u.id);
  const r1 = (v) => Math.round(v * 10) / 10;
  const fronts = r.panels.filter((p) => p.role === 'front' && !(p.meta && p.meta.frontDecorationParent));
  return { id: u.id, type: u.type, num: u.params.unit_num, w: u.params.width, h: u.params.height, frontType: u.params.front_type || null,
    stored: u.params.front_decoration || null,
    warnings: (r.warnings || []).map((w) => ({ code: w.code, panel: w.panel || null, message: w.message })),
    strips: r.panels.filter((p) => p.meta && p.meta.frontDecorationParent).map((p) => ({ id: p.id, parent: p.meta.frontDecorationParent, w: p.w, h: p.h, t: p.thickness })),
    csv: r.csvLines || [],
    leaves: fronts.map((p) => { const d = p.meta && p.meta.frontDecoration;
      const recess = d && d.operations.find((o) => o.id === 'panel-recess');
      const bb = (pts) => { const xs = pts.map((q) => q[0]); const ys = pts.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(r1).join(','); };
      return { id: p.id, part: p.part, w: p.w, h: p.h, t: p.thickness,
        opensFirst: Boolean(p.meta && p.meta.opensFirst), note: (p.meta && p.meta.note) || null,
        deco: d ? { style: d.style, status: d.status, parameters: d.parameters, ops: d.operations.length,
          kinds: [...new Set(d.operations.map((o) => o.kind))], tools: [...new Set(d.operations.map((o) => o.tool && o.tool.kind))],
          layers: [...new Set(d.operations.map((o) => o.layer))], additions: d.additions.map((a) => r1(a.length)),
          problems: d.problems.map((x) => x.code + ': ' + x.message), advisories: (d.advisories || []).map((x) => x.code),
          recess: recess ? bb(recess.points) : null,
          centres: d.operations.filter((o) => o.centreline).map((o) => r1(o.centreline[0][0])),
          section: (d.operations.find((o) => o.crossSection) || {}).crossSection ? (() => { const c = d.operations.find((o) => o.crossSection).crossSection; return { kind: c.kind, width: c.width, depth: c.depth, radius: c.radius || null }; })() : null,
        } : null };
    }) }; })()`);

/** The meshes the scene draws a unit's leaves with: the vertex count, the solid's own mark, its depth. */
const meshesOf = (page, unitId, ids) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; const want = ${j(ids)}; const out = {};
  unit.traverse((o) => { if (!o.isMesh || !o.userData || !want.includes(o.userData.ccPanelId)) return;
    const g = o.geometry; const n = (g && g.attributes && g.attributes.position) ? g.attributes.position.count : 0;
    const prev = out[o.userData.ccPanelId]; if (prev && prev.vertices >= n) return;
    if (!g.boundingBox) g.computeBoundingBox();
    out[o.userData.ccPanelId] = { vertices: n, uuid: g.uuid, style: (g.userData && g.userData.frontDecoration) ? g.userData.frontDecoration.style : null,
      depthMm: g.boundingBox ? Math.round((g.boundingBox.max.z - g.boundingBox.min.z) * 10000) / 10 : null, visible: o.visible }; });
  return out; })()`);

/** Every leaf the room draws with a decorated solid, whatever unit it is in. */
const decoratedMeshes = (page) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const out = [];
  v.scene.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.userData && o.geometry.userData.frontDecoration) out.push(o.userData && o.userData.ccPanelId); });
  return out; })()`);

/** The recipe fields the PRO panel shows, by key. */
const fieldsNow = (page) => page.ask(`Object.fromEntries([...document.querySelectorAll('[data-decoration-field]')].filter((e) => e.offsetParent).map((e) => [e.getAttribute('data-decoration-field'), e.value]))`);

// ─── THE HANDS THIS WALK NEEDS (all real events) ───────────────────────────

/** Select-all in the focused field: Ctrl+A with the editor's own selectAll command. */
async function selectAll(page) {
  const k = {
    key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k, commands: ['selectAll'] });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(120);
}
/** A number typed into a field: a real click on it, Ctrl+A, the digits, Enter. */
async function typeInto(page, selector, value) {
  const at = await boxOf(page, `document.querySelector(${j(selector)})`);
  if (!at) return { ok: false, why: `no ${selector} on the screen` };
  await clickWith(page, at.x, at.y);
  await selectAll(page);
  await page.typeText(String(value));
  await key(page, 'Enter');
  await page.sleep(900);
  const shown = await page.ask(`(document.querySelector(${j(selector)}) || {}).value ?? null`);
  return { ok: true, shown };
}
/** A right-panel section opened by a real click on its header (when shut). */
async function sectionOpen(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
/** The pieces a hand can click a cabinet by, a leaf first. */
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const pick = [];
  for (const f of [(p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT', (p) => p.role === 'front', (p) => p.id === 'TOP', (p) => p.role === 'side', (p) => p.role === 'back']) {
    for (const p of r.panels) if (f(p) && !(p.meta && p.meta.frontDecorationParent) && !pick.includes(p.id)) pick.push(p.id);
  }
  return pick.length ? pick : r.panels.map((p) => p.id); })()`);
const selectedIs = (unitId) => `window.__cc.ui.getState().selectedUnitId === ${j(unitId)} && !window.__cc.ui.getState().selectedElement && Boolean(document.querySelector('[data-section="Carcass"]'))`;
/** A unit selected by a real click on one of its pieces, its right panel standing. */
async function selectUnit(page, unitId) {
  if (await page.ask(selectedIs(unitId))) return true;
  // A piece picked (a 2klik's leftover) is let go first: a click on the top
  // bar's empty middle takes the caret out of any field, then Escape, the
  // app's own key for "let the piece go".
  if (await page.ask('Boolean(window.__cc.ui.getState().selectedElement)')) {
    const blank = await boxOf(page, 'document.querySelector(\'header > div.flex-1\')');
    if (blank) await clickWith(page, blank.x, blank.y);
    await key(page, 'Escape');
  }
  for (const pid of (await grabIds(page, unitId)).slice(0, 5)) {
    const at = await reachFree(page, unitId, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    if (await until(page, selectedIs(unitId), 4000)) return true;
  }
  return false;
}
/** A row of the library, through its MENU, its category and every flyout on the way. */
async function addFromLibrary(page, { category = 'Kitchen', path = [], entry }) {
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  const listed = () => page.has(`[data-library-entry="${entry}"]`);
  if (!(await listed())) {
    await page.press('nav[aria-label="Main menu"] > div > button', 'Library');
    await page.press('[role="menuitem"]', category);
    await page.sleep(500);
    for (const g of path) {
      if (await listed()) break;
      if (!(await page.has(`[data-library-flyout="${g}"]`))) await page.press(`[data-library-group="${g}"]`);
    }
    if (!(await listed()) && await page.has('[data-library-show-all="1"]')) {
      await page.press('[data-library-show-all="1"]');
      for (const g of path) if (!(await listed()) && !(await page.has(`[data-library-flyout="${g}"]`))) await page.press(`[data-library-group="${g}"]`);
    }
  }
  if (!(await listed())) return { ok: false, unit: null };
  await page.press(`[data-library-entry="${entry}"]`);
  await page.sleep(1300);
  const added = (await unitsNow(page)).filter((u) => !before.has(u.id) && u.type !== 'FREE_PANEL');
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
  return { ok: true, unit: added[0] || null };
}
/** DOORS' own button on a unit that has no leaf yet (it finishes the unit: the selection goes). */
async function addDoors(page, unitId) {
  const has = (await unitNow(page, unitId)).leaves.length > 0;
  if (has) return 'had leaves';
  await selectUnit(page, unitId);
  if (!(await sectionOpen(page, 'Doors'))) return 'no Doors section';
  const btn = await page.ask('[...document.querySelectorAll(\'button.cc-btn-gold\')].some((b) => b.offsetParent && /Add doors/.test(b.textContent))');
  if (!btn) return 'no Add doors button';
  await page.press('button.cc-btn-gold', 'Add doors');
  await page.sleep(900);
  return 'Add doors pressed';
}
/**
 * A menu of the bar, then its items in turn (a submenu opens on its own
 * click). An item is found by its LABEL (MenuBar's `span.flex-1`), so a tick
 * or a submenu arrow beside it does not change which one the hand presses;
 * a label ending in an ellipsis is matched by its words.
 */
async function menu(page, name, ...items) {
  await page.click('nav[aria-label="Main menu"] > div > button', name, { exact: true });
  await page.sleep(350);
  for (const item of items) {
    const at = await boxOf(page, `[...document.querySelectorAll('[role="menuitem"]')].filter((b) => b.offsetParent)
      .find((b) => { const t = ((b.querySelector('span.flex-1') || b).textContent || '').trim(); return t === ${j(item)} || t.replace(/(…|\\.\\.\\.)$/, '') === ${j(item)}; })`);
    if (!at) throw new Error(`no menu item "${item}" under ${name}`);
    await clickWith(page, at.x, at.y);
    await page.sleep(300);
  }
}
const viewMode = async (page, item) => { await menu(page, 'View', item); await page.sleep(1500); };
/** The Check panel shut by its own X (an export opens it when something is found). */
async function closeCheck(page) {
  if (await page.has('[data-check-panel] button[title="Close"]')) await page.press('[data-check-panel] button[title="Close"]');
}
/** A RED message stays until it is clicked (T31): each one clicked away by its own body. */
async function dismissReds(page) {
  for (let i = 0; i < 6; i += 1) {
    const at = await boxOf(page, 'document.querySelector(\'[data-message-dismiss]\')');
    if (!at) break;
    await clickWith(page, at.x, at.y);
  }
}
/** The toolbar's own button that hides the dimension figures, so a frame shows the board. */
async function hideDimensions(page) {
  if (await page.ask('[...document.querySelectorAll(\'button\')].some((b) => b.offsetParent && b.textContent.trim() === \'Hide dimensions\')')) {
    await page.click('button', 'Hide dimensions', { exact: true });
    await page.sleep(500);
    return true;
  }
  return false;
}

// ─── DOWNLOADS: WHAT THE BROWSER SAVED ─────────────────────────────────────
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
/** Run a gesture and return the file it made the browser save (or null). */
async function captureDownload(dir, gesture, page) {
  const before = new Set(readdirSync(dir));
  await gesture();
  for (let i = 0; i < 120; i += 1) {
    const got = readdirSync(dir).filter((n) => !before.has(n) && !/\.crdownload$|\.tmp$/.test(n));
    if (got.length) { await page.sleep(300); return join(dir, got[0]); }
    await page.sleep(250);
  }
  return null;
}

// ─── THE FRAMES: WHERE A THING IS ON THE GLASS ─────────────────────────────
/** The screen rectangle the leaves cover, off the live camera. */
const leafRect = (page, unitId, ids) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; const want = ${j(ids)}; const box = new T.Box3(); let any = false;
  unit.updateMatrixWorld(true);
  unit.traverse((o) => { if (o.isMesh && o.userData && want.includes(o.userData.ccPanelId)) { box.expandByObject(o); any = true; } });
  if (!any) return null; const r = v.gl.domElement.getBoundingClientRect();
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const p = new T.Vector3(x, y, z).project(v.camera);
    const px = r.left + (p.x * 0.5 + 0.5) * r.width; const py = r.top + (-p.y * 0.5 + 0.5) * r.height;
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
  const aside = [...document.querySelectorAll('aside')].map((a) => a.getBoundingClientRect()).filter((a) => a.width > 0 && a.left > r.left + r.width / 2).map((a) => a.left);
  return { x0, y0, x1, y1, left: r.left, top: r.top, right: Math.min(r.right, ...aside), bottom: r.bottom, cw: r.width, ch: r.height };
})()`);
/**
 * The camera brought in on the leaves by the wheel, OrbitControls' own
 * gesture, one notch at a time at the leaves' middle, until they fill the
 * share of the view asked for or the camera stops closing in.
 */
async function closeIn(page, unitId, ids, { fillH = 0.62, fillW = 0.42, notches = 36 } = {}) {
  await settleCamera(page);
  let rect = await leafRect(page, unitId, ids);
  let last = 0;
  const inView = (r) => r.y1 < r.bottom - 6 && r.y0 > r.top + 6 && r.x0 > r.left + 6 && r.x1 < r.right - 6;
  for (let i = 0; i < notches && rect; i += 1) {
    const h = rect.y1 - rect.y0; const w = rect.x1 - rect.x0;
    if (h >= fillH * rect.ch || w >= fillW * rect.cw) break;
    if (i > 2 && Math.abs(h - last) < 0.5) break;
    last = h;
    const cx = Math.round((rect.x0 + rect.x1) / 2); const cy = Math.round((rect.y0 + rect.y1) / 2);
    await page.wheel(cx, cy, -120, 1);
    await settleCamera(page);
    const next = await leafRect(page, unitId, ids);
    // The camera closes in on the room's middle, so the leaf can slide out
    // of the view before it fills it: one notch back out, and stop there.
    if (next && inView(rect) && !inView(next)) { await page.wheel(cx, cy, 120, 1); break; }
    rect = next;
  }
  await settleCamera(page);
  return leafRect(page, unitId, ids);
}
/**
 * The camera flown to a piece by the app's own gesture: a 2klik on it
 * (T5's "look at THIS", `UnitView.jsx onFocus`); a window it opens is shut
 * by its own X.
 */
async function focusPiece(page, unitId, pieceId) {
  const at = await reachFree(page, unitId, pieceId);
  if (!at) return null;
  await page.dblclick(at.x, at.y);
  await page.sleep(1500);
  const modal = await page.ask('window.__cc.ui.getState().modal || null');
  if (modal) {
    const x = await boxOf(page, `[...document.querySelectorAll('[data-modal-name="${modal}"] button')].find((b) => b.textContent.trim() === '×')`);
    if (x) await clickWith(page, x.x, x.y);
  }
  await settleCamera(page);
  return { ...at, modal };
}
/** How many pixels of each leaf the pointer could touch from where the camera stands. */
const sightOf = async (page, unitId, ids) => {
  const out = [];
  for (const id of ids) {
    const r = await pointOn(page, unitId, id, { all: true, grid: 30 });
    out.push(r ? r.n : 0);
  }
  return out;
};
/**
 * The camera turned by real drags on the empty floor (T75's `orbitFree`)
 * until every leaf is in sight; the best of the turns tried is where it
 * ends. Returns the pixels each leaf shows.
 */
async function turnToSee(page, unitId, ids, turns = [-150, -150, 450, 150]) {
  let pos = 0; let best = { pos: 0, sight: await sightOf(page, unitId, ids) };
  for (const dx of turns) {
    if (Math.min(...best.sight) > 400) break;
    if (!(await orbitFree(page, dx, 0))) break;
    pos += dx;
    const sight = await sightOf(page, unitId, ids);
    if (Math.min(...sight) > Math.min(...best.sight)) best = { pos, sight };
  }
  if (pos !== best.pos) await orbitFree(page, best.pos - pos, 0);
  return { turned: best.pos, sight: await sightOf(page, unitId, ids) };
}
/** A frame close on the leaves: their rectangle with a margin, the canvas's part of it. */
async function leafFrame(page, unitId, ids, file) {
  await settleCamera(page);
  const r = await leafRect(page, unitId, ids);
  if (!r) return shot(page, file);
  const mx = (r.x1 - r.x0) * 0.12 + 12; const my = (r.y1 - r.y0) * 0.08 + 12;
  const x = Math.max(r.left, r.x0 - mx); const y = Math.max(r.top, r.y0 - my);
  const x2 = Math.min(r.right, r.x1 + mx); const y2 = Math.min(r.bottom, r.y1 + my);
  const width = Math.max(40, x2 - x); const height = Math.max(40, y2 - y);
  const scale = Math.max(1, Math.min(2, 760 / Math.max(width, height)));
  return shot(page, file, {
    x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), scale,
  });
}
/** A frame of one element's own rectangle (a panel, a modal's drawing). */
async function elementFrame(page, expr, file, { scale = 1, maxH = null } = {}) {
  const r = await page.ask(`(() => { const el = (${expr}); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
  if (!r || r.w < 4 || r.h < 4) return shot(page, file);
  return shot(page, file, {
    x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.w), height: Math.round(maxH ? Math.min(r.h, maxH) : r.h), scale,
  });
}

// ─── THE CUT LIST, THE CNC ZIP, THE DRAWING SET: READ THROUGH THE UI ───────
const BOM_ASIDE = '[...document.querySelectorAll(\'aside\')].find((a) => /Bill of materials/.test(a.textContent))';
/** The BOM panel's Parts tab, per-unit rows: id, construction label, material, size, qty, State. */
async function bomRead(page, file) {
  if (!(await page.ask(`Boolean(${BOM_ASIDE})`))) await page.press('button[title="Bill of materials"]');
  await until(page, `Boolean(${BOM_ASIDE}) && Boolean((${BOM_ASIDE}).querySelector('tbody tr'))`, 6000);
  const rows = await page.ask(`(() => { const a = ${BOM_ASIDE}; if (!a) return null;
    return [...a.querySelectorAll('tbody tr')].map((tr) => { const td = [...tr.querySelectorAll('td')]; if (td.length < 9) return { head: tr.textContent.trim() };
      const cell = td[1]; const id = ((cell.childNodes[0] && cell.childNodes[0].textContent) || '').trim(); const man = cell.querySelector('[data-front-manufacturing]');
      return { unit: td[0].textContent.trim(), id, construction: man ? man.textContent.trim() : null, material: td[2].textContent.trim(),
        w: td[3].textContent.trim(), h: td[4].textContent.trim(), qty: td[5].textContent.trim(), state: td[8].textContent.trim(), readiness: td[8].getAttribute('data-readiness') }; }); })()`);
  if (file) {
    // The list is wheeled to its end (the leaves, their strips and the NOTE
    // are the unit's last rows), then the panel is framed as far as its rows go.
    const list = await page.ask(`(() => { const a = ${BOM_ASIDE}; const l = a && a.querySelector('.overflow-y-auto'); if (!l) return null; const b = l.getBoundingClientRect();
      return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2), over: l.scrollHeight - l.clientHeight }; })()`);
    if (list && list.over > 0) await page.wheel(list.x, list.y, Math.min(400, list.over + 40), Math.ceil((list.over + 40) / 400) + 1);
    const last = await page.ask(`(() => { const a = ${BOM_ASIDE}; const trs = a ? [...a.querySelectorAll('tbody tr')] : []; const b = trs.length ? trs[trs.length - 1].getBoundingClientRect() : null; const t = a ? a.getBoundingClientRect() : null; return t && b ? { x: t.left, y: t.top, w: t.width, h: Math.min(t.height, b.bottom - t.top + 12) } : null; })()`);
    if (last) await shot(page, file, { x: Math.round(last.x), y: Math.round(last.y), width: Math.round(last.w), height: Math.round(last.h), scale: 1 });
  }
  return rows || [];
}
async function bomClose(page) {
  const x = await boxOf(page, `(() => { const a = ${BOM_ASIDE}; return a ? [...a.querySelectorAll('button')].find((b) => b.textContent.trim() === '×') : null; })()`);
  if (x) await clickWith(page, x.x, x.y);
}

/**
 * The unit's CNC package as the joiner downloads it: View, CNC sheet, the
 * unit's branch in the tree, DOWNLOAD ZIP (PER PANEL) (T25's per-unit ZIP,
 * `cncExport.js exportUnitDxfZip`), the file the browser saved, opened.
 */
async function cncZip(page, unitId, { frontFrame = null } = {}) {
  const dir = await downloadsTo(page);
  await viewMode(page, 'CNC sheet');
  await until(page, `Boolean(document.querySelector('[data-cnc-branch="${unitId}"]'))`, 8000);
  if (await page.ask(`(document.querySelector('[data-cnc-branch="${unitId}"]') || { getAttribute: () => 'true' }).getAttribute('aria-expanded') !== 'true'`)) {
    await page.press(`[data-cnc-branch="${unitId}"]`);
  }
  if (frontFrame && await page.has('[data-testid="cnc-face-front"]')) {
    await page.press('[data-testid="cnc-face-front"]');
    await page.sleep(900);
    await shot(page, frontFrame);
    if (await page.has('[data-testid="cnc-face-back"]')) await page.press('[data-testid="cnc-face-back"]');
  }
  const btn = await boxOf(page, `(() => { const c = document.querySelector('[data-cnc-branch="${unitId}"]'); const box = c && c.parentElement && c.parentElement.parentElement;
    return box ? [...box.querySelectorAll('button')].find((b) => /Download ZIP \\(per panel\\)/.test(b.textContent)) : null; })()`);
  let file = null;
  if (btn) file = await captureDownload(dir, () => clickWith(page, btn.x, btn.y), page);
  const said = await lastSaid(page, 3);
  const out = {
    file, names: [], manifest: null, readinessName: null, readiness: null, said,
  };
  if (file) {
    const zip = await JSZip.loadAsync(readFileSync(file));
    out.names = Object.keys(zip.files);
    if (zip.file('front-operations.json')) out.manifest = JSON.parse(await zip.file('front-operations.json').async('string'));
    out.readinessName = out.names.find((n) => /READINESS\.txt$/.test(n)) || null;
    if (out.readinessName) out.readiness = await zip.file(out.readinessName).async('string');
    // Every DXF's layers, off its own group code 8 lines (a DXF is text).
    out.layers = {};
    for (const n of out.names.filter((x) => /\.dxf$/i.test(x))) {
      const lines = (await zip.file(n).async('string')).split(/\r?\n/);
      const set = new Set();
      for (let i = 0; i + 1 < lines.length; i += 2) if (lines[i].trim() === '8') set.add(lines[i + 1].trim());
      out.layers[n] = [...set];
    }
  }
  await closeCheck(page);
  await dismissReds(page);
  await viewMode(page, '3D');
  await page.sleep(800);
  return out;
}

/**
 * The T71 drawing set as the window shows it: Output, Drawings, Preview, the
 * Set tab, every "Front view" sheet in turn; the decoration's own entities
 * (`data-cc="front-decoration"`, `drawings/frontDecorationDrawing.js`) counted
 * on each.
 */
async function drawingSet(page, file) {
  await menu(page, 'Output', 'Drawings', 'Preview');
  await until(page, 'window.__cc.ui.getState().modal === \'drawing\'', 5000);
  await page.press('[data-drawing-kind-tab="walls"]');
  await until(page, 'document.querySelectorAll(\'[data-wall-sheet]\').length > 0 || Boolean(document.querySelector(\'[data-wall-failed]\'))', 20000);
  const sheets = await page.ask('[...document.querySelectorAll(\'[data-wall-sheet]\')].map((b) => b.getAttribute(\'data-wall-sheet\'))');
  const fronts = sheets.filter((n) => /Front view/.test(n));
  const counts = {};
  let framed = false;
  for (const name of fronts) {
    await page.press(`[data-wall-sheet="${name}"]`);
    await until(page, `(document.querySelector('[data-wall-sheet="${name}"]') || {}).getAttribute && document.querySelector('[data-wall-sheet="${name}"]').getAttribute('aria-pressed') === 'true'`, 4000);
    await page.sleep(900);
    counts[name] = await page.count('.cc-drawing [data-cc="front-decoration"]');
    if (file && !framed && counts[name] > 0) {
      framed = true;
      await page.ask('(() => { const e = document.querySelector(\'.cc-drawing [data-cc="front-decoration"]\'); if (e) e.scrollIntoView({ block: \'center\' }); return true; })()');
      await page.sleep(300);
      const r = await page.ask(`(() => { const els = [...document.querySelectorAll('.cc-drawing [data-cc="front-decoration"]')]; const box = document.querySelector('.cc-drawing').getBoundingClientRect();
        let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
        for (const e of els) { const b = e.getBoundingClientRect(); x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom); }
        const w = x1 - x0; const h = y1 - y0; const m = Math.max(w, h) * 0.45 + 10;
        const cx0 = Math.max(box.left, x0 - m); const cy0 = Math.max(box.top, Math.max(0, y0 - m)); const cx1 = Math.min(box.right, x1 + m); const cy1 = Math.min(box.bottom, Math.min(window.innerHeight, y1 + m));
        return { x: cx0, y: cy0, w: cx1 - cx0, h: cy1 - cy0 }; })()`);
      const scale = Math.max(1, Math.min(4, 820 / Math.max(r.w, r.h)));
      await shot(page, file, {
        x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h), scale,
      });
    }
  }
  if (file && !framed) await elementFrame(page, 'document.querySelector(\'.cc-drawing\')', file);
  const failed = await page.has('[data-wall-failed]');
  const close = await boxOf(page, '[...document.querySelectorAll(\'[data-modal-name="drawing"] button\')].find((b) => b.textContent.trim() === \'Close\')');
  if (close) await clickWith(page, close.x, close.y);
  await page.sleep(600);
  return {
    sheets, fronts, counts, failed, total: Object.values(counts).reduce((s, n) => s + n, 0),
  };
}

// ═══ F01 / F02 · PRO: THE SIX STYLES ON A CABINET, BY THE REAL SELECT ═══════
const FT = 'document.querySelector(\'[data-unit-front-type]\')';
/** The number each style's walk types (one per style), and what it becomes. */
const TYPED = {
  G: ['groovePitchMm', 100], GF: ['groovePitchMm', 60], A: ['frameMm', 80], AH: ['frameMm', 80], FL: ['groovePitchMm', 25], AM: ['mouldingInsetMm', 80],
};
/** The Front type select set by the real select, the engine and the scene let catch up. */
async function setStyle(page, unitId, style, leafIds) {
  await selectUnit(page, unitId);
  await sectionOpen(page, 'Carcass');
  const res = await choose(page, FT, style);
  const decorated = style !== 'F' && style !== 'S';
  await until(page, `(() => { const r = ${S}.unitResult(${j(unitId)}); const leaves = r.panels.filter((p) => ${j(leafIds)}.includes(p.id));
    return leaves.length > 0 && leaves.every((p) => ${decorated ? `p.meta && p.meta.frontDecoration && p.meta.frontDecoration.style === ${j(style)}` : '!(p.meta && p.meta.frontDecoration)'}); })()`, 8000);
  // The scene builds the decorated solid a frame or two later.
  for (let t = 0; t < 30; t += 1) {
    const m = await meshesOf(page, unitId, leafIds);
    if (m && leafIds.every((id) => m[id] && (decorated ? m[id].style === style : !m[id].style))) break;
    await page.sleep(300);
  }
  await page.sleep(700);
  return res;
}

async function sixStyles(page, { tag, unitId, prefix }) {
  const u0 = await unitNow(page, unitId);
  const leafIds = u0.leaves.map((l) => l.id);
  note(`${tag}: the cabinet and its leaves as the engine cut them`, `${u0.type} ${u0.num}, ${u0.w} wide; leaves ${u0.leaves.map((l) => `${l.id} ${l.w} x ${l.h} x ${l.t}`).join(', ')}`);
  // THE PLAIN LEAF, for the vertex count every decorated solid is read against.
  const plainSel = await setStyle(page, unitId, 'F', leafIds);
  const plain = await meshesOf(page, unitId, leafIds);
  const plainU = await unitNow(page, unitId);
  await closeIn(page, unitId, leafIds);
  check(`${tag}: Flat by the real select (a click, the arrows, Enter): a plain slab, no decoration, no recipe controls`,
    plainSel.ok && plainSel.after.value === 'F' && plainU.leaves.every((l) => !l.deco) && Object.keys(await fieldsNow(page)).length === 0,
    `select "${plainSel.after && plainSel.after.labels[plainSel.after.index]}"; meshes ${j(plain)}`);
  await leafFrame(page, unitId, leafIds, `${prefix}-plain.png`);
  for (const style of ['G', 'GF', 'A', 'AH', 'FL', 'AM']) {
    const recipe = await recipeOf(page, style);
    const sel = await setStyle(page, unitId, style, leafIds);
    const u = await unitNow(page, unitId);
    const m = await meshesOf(page, unitId, leafIds);
    const leaves = u.leaves;
    check(`${tag} ${style}: "${LABELS[style]}" chosen in the Front type select by a real click, the arrows and Enter; every leaf cut ${style}, ready`,
      sel.ok && sel.after.value === style && leaves.length > 0 && leaves.every((l) => l.deco && l.deco.style === style && l.deco.status === 'ready'),
      `select ${j(sel.before && sel.before.value)} -> ${j(sel.after && sel.after.value)}; ${leaves.map((l) => `${l.id} ${l.deco ? `${l.deco.style} ${l.deco.status}, ${l.deco.ops} ops (${l.deco.kinds.join('/') || 'none'}), ${l.deco.additions.length} strips` : 'no decoration'}`).join('; ')}`);
    // THE SOLID.
    check(`${tag} ${style}: the leaf's solid shows the pattern (the scene builds it with frontDecorationGeometry: the geometry carries the style)`,
      leafIds.every((id) => m && m[id] && m[id].style === style && m[id].vertices !== (plain[id] || {}).vertices),
      leafIds.map((id) => `${id}: ${m && m[id] ? `${m[id].vertices} vertices (plain ${(plain[id] || {}).vertices}), marked ${m[id].style}, ${m[id].depthMm} mm deep (plain ${(plain[id] || {}).depthMm})` : 'no mesh'}`).join('; '));
    if (style === 'G' || style === 'GF') {
      const l = leaves[0];
      check(`${tag} ${style}: the groove is a V (kind vgroove, tool kind v, ${recipe.grooveWidthMm} wide x ${recipe.grooveDepthMm} deep at the mouth)`,
        l.deco && l.deco.kinds.includes('vgroove') && l.deco.tools.includes('v') && l.deco.section && l.deco.section.kind === 'v'
          && l.deco.section.width === recipe.grooveWidthMm && l.deco.section.depth === recipe.grooveDepthMm,
        `kinds ${j(l.deco && l.deco.kinds)}, tools ${j(l.deco && l.deco.tools)}, layers ${j(l.deco && l.deco.layers)}, section ${j(l.deco && l.deco.section)}`);
    }
    if (style === 'AM') {
      check(`${tag} AM: four strips per leaf, cut parts of their own ${recipe.mouldingProjectionMm} mm stock, raised on the face in the solid`,
        leaves.every((l) => u.strips.filter((s) => s.parent === l.id).length === 4 && u.strips.filter((s) => s.parent === l.id).every((s) => s.t === recipe.mouldingProjectionMm))
          && leafIds.every((id) => m[id] && m[id].depthMm > (plain[id] || {}).depthMm),
        `${u.strips.map((s) => `${s.id} ${s.w} x ${s.h} x ${s.t}`).join(', ')}; solid depth ${leafIds.map((id) => `${id} ${m[id] && m[id].depthMm} mm`).join(', ')}`);
    }
    if (style === 'A' || style === 'AH') {
      const adv = u.warnings.filter((w) => w.code === 'FRONT_DECORATION_BOARD');
      note(`${tag} ${style}: the owner's board is ${recipe.boardMm} and this front is ${leaves[0].t}: the recipe is cut as asked and the advisory rides the unit (Check #32)`,
        adv.map((w) => w.message).join(' | ') || 'no advisory');
    }
    // THE RECIPE CONTROLS SHOW THE PROFILE'S NUMBERS.
    const fields = await fieldsNow(page);
    const shown = FIELD_KEYS.filter((k) => Object.hasOwn(recipe, k));
    const mism = shown.filter((k) => Number(fields[k]) !== recipe[k]);
    check(`${tag} ${style}: the recipe controls show the profile's numbers (profile.front.decoration.${style})`,
      shown.length > 0 && mism.length === 0 && shown.every((k) => Object.hasOwn(fields, k)),
      `${shown.map((k) => `${k} ${fields[k]} (profile ${recipe[k]})`).join(', ')}${fields.grooveDirection ? `, direction ${fields.grooveDirection}` : ''}; not a field: ${Object.keys(recipe).filter((k) => !FIELD_KEYS.includes(k) && k !== 'grooveDirection').map((k) => `${k} ${recipe[k]}`).join(', ') || 'none'}`);
    if (style === 'AH') {
      const said = await page.ask('((document.querySelector(\'[data-front-decoration="AH"] p\') || {}).textContent || \'\').trim()');
      check(`${tag} AH: the controls say the J-pull is chosen separately, under Opening (the recipe is A's)`,
        /defaults\. Choose the J-pull separately in Opening\.$/.test(said) && j(recipe) === j(await recipeOf(page, 'A')),
        `${j(said)}; AH ${j(recipe)}`);
    }
    await closeIn(page, unitId, leafIds);
    await shot(page, `${prefix}-${style}.png`);
    // ONE NUMBER TYPED: THE PATTERN REGENERATES.
    const [fieldKey, typed] = TYPED[style];
    const before = { u: leaves, m };
    const t = await typeInto(page, `[data-decoration-field="${fieldKey}"]`, typed);
    await until(page, `(() => { const u = ${S}.units.find((x) => x.id === ${j(unitId)}); return u && u.params.front_decoration && Number(u.params.front_decoration[${j(fieldKey)}]) === ${typed}; })()`, 5000);
    for (let k = 0; k < 30; k += 1) {
      const mm = await meshesOf(page, unitId, leafIds);
      if (mm && leafIds.every((id) => mm[id] && mm[id].uuid !== (m[id] || {}).uuid)) break;
      await page.sleep(300);
    }
    await page.sleep(500);
    const after = await unitNow(page, unitId);
    const m2 = await meshesOf(page, unitId, leafIds);
    const a0 = before.u[0].deco; const a1 = after.leaves[0].deco;
    const moved = a1 && a0 && (a1.ops !== a0.ops || a1.recess !== a0.recess || j(a1.additions) !== j(a0.additions));
    check(`${tag} ${style}: ${fieldKey} typed ${typed} (a real click, Ctrl+A, the digits, Enter): the unit keeps the typed number and the pattern is built again`,
      t.ok && Number(t.shown) === typed && after.stored && Number(after.stored[fieldKey]) === typed && a1.parameters[fieldKey] === typed && a1.status === 'ready' && moved
        && leafIds.every((id) => m2[id] && m2[id].uuid !== (m[id] || {}).uuid && m2[id].style === style),
      `field shows ${j(t.shown)}; stored ${fieldKey} ${after.stored && after.stored[fieldKey]}; ops ${a0 && a0.ops} -> ${a1 && a1.ops}${a0 && a0.recess ? `, recess ${a0.recess} -> ${a1.recess}` : ''}${a0 && a0.additions.length ? `, strips ${j(a0.additions)} -> ${j(a1.additions)}` : ''}${a0 && a0.centres.length ? `, first centres ${a0.centres.slice(0, 3).join('/')} -> ${a1.centres.slice(0, 3).join('/')}` : ''}; solid ${leafIds.map((id) => `${id} ${(m[id] || {}).vertices} -> ${(m2[id] || {}).vertices} vertices, a new geometry ${(m2[id] || {}).uuid !== (m[id] || {}).uuid}`).join('; ')}`);
    await leafFrame(page, unitId, leafIds, `${prefix}-${style}-typed.png`);
    // THE CUT LIST NAMES THE LEAF WITH ITS CONSTRUCTION AND ITS STATE.
    const rows = await bomRead(page, `${prefix}-${style}-bom.png`);
    const leafRows = leafIds.map((id) => rows.find((r) => r.id === id));
    check(`${tag} ${style}: the cut list (BOM panel, Parts tab, the unit's own rows) names each leaf with its construction and its State`,
      leafRows.every((r) => r && r.construction && r.construction.startsWith(`${style} · `) && r.state === 'Cut' && r.readiness === 'cut'),
      leafRows.map((r) => (r ? `${r.id}: "${r.construction}", State ${r.state} (${r.readiness}), ${r.w} x ${r.h}` : 'missing')).join('; '));
    // THE STATE COLUMN ENDS INSIDE THE PANEL (T75 F22's column; the walk of
    // f0c51f1 measured it pushed past the edge with AM, fixed in 025331f by a
    // shorter construction label). Where each State's own WORDS end against
    // the panel's right edge, and which cell is the widest.
    const edge = await page.ask(`(() => { const a = ${BOM_ASIDE}; if (!a) return null; const r = a.getBoundingClientRect();
      const table = a.querySelector('table'); const tb = table ? table.getBoundingClientRect() : null;
      const heads = table ? [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim()) : [];
      const idOf = (tr) => ((tr && tr.children[1] && tr.children[1].childNodes[0] && tr.children[1].childNodes[0].textContent) || '').trim();
      let worst = null;
      for (const c of a.querySelectorAll('td[data-readiness]')) {
        const range = document.createRange(); range.selectNodeContents(c); const t = range.getBoundingClientRect();
        const over = Math.round((t.right - r.right) * 10) / 10;
        if (!worst || over > worst.over) worst = { over, id: idOf(c.closest('tr')), state: c.textContent.trim() };
      }
      const cols = {}; let widest = null;
      for (const tr of table ? table.querySelectorAll('tbody tr') : []) {
        const tds = [...tr.children]; if (tds.length < 9) continue;
        tds.forEach((td, i) => { const w = Math.round(td.getBoundingClientRect().width); const h = heads[i] || String(i);
          if (!cols[h] || w > cols[h]) cols[h] = w;
          if (!widest || w > widest.w) widest = { w, column: h, row: idOf(tr), text: td.textContent.trim().slice(0, 60) }; });
      }
      return { panel: Math.round(r.width), table: tb ? Math.round(tb.width) : null, worst, widest, cols, cells: a.querySelectorAll('td[data-readiness]').length }; })()`);
    check(`${tag} ${style}: the BOM panel's State column ends inside the panel (every State readable without scrolling sideways)`,
      edge && edge.worst && edge.worst.over <= 0,
      edge && edge.worst ? `panel ${edge.panel} px, table ${edge.table} px; the State that ends furthest right: ${edge.worst.id} "${edge.worst.state}", ${edge.worst.over > 0 ? `${edge.worst.over} px PAST the edge` : `${-edge.worst.over} px inside`}; the widest cell: ${edge.widest.column} of ${edge.widest.row} "${edge.widest.text}" ${edge.widest.w} px; widest per column ${Object.entries(edge.cols).map(([k, v]) => `${k} ${v}`).join(', ')}` : 'no BOM table');
    if (style === 'AM') {
      const strips = rows.filter((r) => /-MOULDING-/.test(r.id || ''));
      const notes = rows.filter((r) => / strips$/.test(r.id || ''));
      check(`${tag} AM: four strip lines per leaf, each "Applied strip, 45/45 mitres", cut; and the gluing a NOTE line of its own, Fit on site (APPLIED-STRIPS)`,
        leafIds.every((id) => strips.filter((r) => r.id.startsWith(`${id}-MOULDING-`) && /^Applied strip, \d+\/\d+ mitres$/.test(r.construction || '') && r.state === 'Cut').length === 4
          && notes.some((r) => r.id === `${id} strips` && r.readiness === 'manual' && r.state === 'Fit on site')),
        `${strips.map((r) => `${r.id} ${r.w} x ${r.h} "${r.construction}" ${r.state}`).join('; ')}; ${notes.map((r) => `${r.id}: ${r.material} · ${r.state}`).join('; ')}`);
      note(`${tag} AM: which view was read`, 'the BOM panel\'s Parts tab, per-unit rows (one row per part); the merged cut list may join identical strips as qty 2');
    }
    await bomClose(page);
    // THE CNC ZIP.
    const z = await cncZip(page, unitId, { frontFrame: style === 'G' || style === 'AM' ? `${prefix}-${style}-cnc-front.png` : null });
    const backs = leafIds.filter((id) => z.names.some((n) => n === `${id}.dxf` || n.endsWith(`-${id}.dxf`)));
    const frontsDxf = leafIds.filter((id) => z.names.some((n) => n === `${id}-FRONT.dxf` || n.endsWith(`-${id}-FRONT.dxf`)));
    const parts = (z.manifest && z.manifest.parts) || [];
    const opsReady = parts.every((p) => p.readiness === 'cut' && p.operations.every((o) => o.readiness === 'cut'));
    check(`${tag} ${style}: the CNC ZIP (CNC sheet, the unit's branch, DOWNLOAD ZIP (PER PANEL)) holds the back DXF and a FRONT DXF per decorated leaf, and front-operations.json`,
      z.file && backs.length === leafIds.length && frontsDxf.length === leafIds.length && Boolean(z.manifest)
        && parts.length === leafIds.length && parts.every((p) => p.style === style && p.status === 'ready') && opsReady,
      `${z.file ? z.file.split('/').pop() : 'no download'}: ${z.names.join(', ')}; manifest parts ${parts.map((p) => `${p.panelId} ${p.style} ${p.status}, readiness ${p.readiness}, ${p.operations.length} ops (${[...new Set(p.operations.map((o) => `${o.kind}/${o.tool && o.tool.kind}/${o.readiness}`))].join(' ')})`).join('; ')}`);
    const dxfOf = (id, front) => z.names.find((n) => n === `${id}${front ? '-FRONT' : ''}.dxf` || n.endsWith(`-${id}${front ? '-FRONT' : ''}.dxf`));
    const leafLayers = after.leaves.map((l) => ({
      id: l.id, back: (z.layers || {})[dxfOf(l.id, false)] || [], front: (z.layers || {})[dxfOf(l.id, true)] || [], ops: l.deco ? l.deco.layers : [],
    }));
    // The back DXF keeps the LISP's own door layers (FRONT_HINGES_35MM is the
    // hinge cup's, a back-face bore); what it must not carry is the
    // decoration's: the reference outline or a pocket, V or flute layer.
    const decoLayer = (ly, ops) => ly === 'FRONT_REFERENCE_NO_CUT' || ops.includes(ly) || /^FRONT_(POCKET|VGROOVE|FLUTE)_/.test(ly);
    check(`${tag} ${style}: the FRONT DXF carries the pattern on its own layers (and the reference outline); the back DXF carries none of them`,
      leafLayers.every((x) => x.front.includes('FRONT_REFERENCE_NO_CUT') && x.ops.every((ly) => x.front.includes(ly)) && !x.back.some((ly) => decoLayer(ly, x.ops))),
      leafLayers.map((x) => `${x.id}: FRONT DXF layers ${j(x.front)}; back DXF layers ${j(x.back)}`).join('; '));
    if (style === 'AM') {
      check(`${tag} AM: the ZIP carries READINESS.txt (the gluing is not cut, T75's law) and a DXF per strip; the manifest says the fixing is manual and the strips cut`,
        Boolean(z.readinessName) && /strips|APPLIED/i.test(z.readiness || '') && z.names.filter((n) => /-MOULDING-/.test(n)).length === 4 * leafIds.length
          && parts.every((p) => p.additions.length === 4 && p.additions.every((a) => a.readiness === 'manual') && p.appliedParts.length === 4 && p.appliedParts.every((a) => a.readiness === 'cut')),
        `${z.readinessName}: ${j(z.readiness)}; strips ${z.names.filter((n) => /-MOULDING-/.test(n)).join(', ')}`);
    } else {
      note(`${tag} ${style}: no READINESS.txt in this ZIP, T75's rule (written only when a line is not cut, and every line here is cut)`,
        `READINESS ${z.readinessName || 'absent'}; the app said ${j(z.said)}`);
    }
    // THE T71 DRAWING SET.
    const d = await drawingSet(page, `${prefix}-${style}-drawing.png`);
    const expected = before.u.reduce((s, l) => s + (l.deco ? l.deco.ops + l.deco.additions.length : 0), 0);
    const wantN = after.leaves.reduce((s, l) => s + (l.deco ? l.deco.ops + l.deco.additions.length : 0), 0);
    check(`${tag} ${style}: the T71 drawing set draws the pattern on the elevation (Output, Drawings, Preview, Set, the wall's Front view)`,
      !d.failed && d.total === wantN && wantN > 0,
      `sheets ${d.sheets.length}; ${Object.entries(d.counts).map(([n, c]) => `"${n}" ${c} front-decoration entities`).join('; ')}; the leaves carry ${wantN} contours (${expected} before the typed number)`);
    await selectUnit(page, unitId);
  }
  return leafIds;
}

if (runs('f01')) {
  begin('f01', 'PRO, A BASE UNIT: G, GF, A, AH, FL, AM BY THE REAL SELECT');
  const page = await open();
  await pro(page);
  note('build', `${await stamp(page)}; ${BASE}`);
  note('the stage: dimension figures hidden by the toolbar\'s own HIDE DIMENSIONS, so a frame shows the board', String(await hideDimensions(page)));
  const B = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'door-base' });
  check('Library, Kitchen, Base units, Standard: a BUD in the room', B.ok && B.unit && B.unit.type === 'BUD', j(B.unit));
  if (B.unit) {
    const doors = await addDoors(page, B.unit.id);
    const u = await unitNow(page, B.unit.id);
    check('DOORS, Add doors: the base unit has its leaf', u.leaves.length > 0, `${doors}; leaves ${u.leaves.map((l) => l.id).join(', ')}`);
    if (u.leaves.length) await sixStyles(page, { tag: 'base', unitId: B.unit.id, prefix: 'f01-base' });
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

if (runs('f02')) {
  begin('f02', 'PRO, A WARDROBE: G, GF, A, AH, FL, AM BY THE REAL SELECT');
  const page = await open();
  await pro(page);
  note('build', `${await stamp(page)}; ${BASE}`);
  note('the stage: dimension figures hidden by the toolbar\'s own HIDE DIMENSIONS', String(await hideDimensions(page)));
  const W = await addFromLibrary(page, { category: 'Wardrobes', path: [], entry: 'WARDROBE' });
  check('Library, Wardrobes, Wardrobe: a WARDROBE in the room', W.ok && W.unit && W.unit.type === 'WARDROBE', j(W.unit));
  if (W.unit) {
    const doors = await addDoors(page, W.unit.id);
    const u = await unitNow(page, W.unit.id);
    check('the wardrobe has its leaves (DOORS, Add doors, when it came without)', u.leaves.length > 0, `${doors}; leaves ${u.leaves.map((l) => `${l.id} ${l.w} x ${l.h}`).join(', ')}`);
    if (u.leaves.length) await sixStyles(page, { tag: 'wardrobe', unitId: W.unit.id, prefix: 'f02-wardrobe' });
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F03 · PRO, THE L OF T75 WITH G FRONTS ═════════════════════════════════
if (runs('f03')) {
  begin('f03', 'PRO, THE L OF T75: A CORNER_L_BASE WITH G FRONTS');
  const page = await open();
  await pro(page);
  note('build', `${await stamp(page)}; ${BASE}`);
  await hideDimensions(page);
  const L = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'corner-l' });
  check('Library, Kitchen, Base units, Corner L: a CORNER_L_BASE in a room corner', L.ok && L.unit && L.unit.type === 'CORNER_L_BASE', j(L.unit));
  if (L.unit) {
    const id = L.unit.id;
    const doors = await addDoors(page, id);
    const u0 = await unitNow(page, id);
    const A0 = u0.leaves.find((l) => /-A-F$/.test(l.id));
    const B0 = u0.leaves.find((l) => /-B-F$/.test(l.id));
    check('DOORS, Add doors: the L\'s two leaves, door A and door B', A0 && B0, `${doors}; ${u0.leaves.map((l) => `${l.id} ${l.w} x ${l.h}`).join(', ')}`);
    if (A0 && B0) {
      const leafIds = [A0.id, B0.id];
      const sel = await setStyle(page, id, 'G', leafIds);
      const u = await unitNow(page, id);
      const m = await meshesOf(page, id, leafIds);
      const A = u.leaves.find((l) => l.id === A0.id);
      const B = u.leaves.find((l) => l.id === B0.id);
      check('"Grooved" chosen in the L\'s Front type select by a real click, the arrows and Enter: BOTH leaves decorated G, ready',
        sel.ok && sel.after.value === 'G' && [A, B].every((l) => l.deco && l.deco.style === 'G' && l.deco.status === 'ready' && l.deco.ops > 0),
        `${[A, B].map((l) => `${l.id} ${l.w} x ${l.h}: ${l.deco ? `${l.deco.style} ${l.deco.status}, ${l.deco.ops} V grooves (${l.deco.kinds.join('/')})` : 'none'}`).join('; ')}`);
      check('both leaves\' solids show the grooves (the scene\'s geometry carries G)', leafIds.every((x) => m[x] && m[x].style === 'G'),
        leafIds.map((x) => `${x}: ${m[x] ? `${m[x].vertices} vertices, ${m[x].style}` : 'no mesh'}`).join('; '));
      check('door B still "opens first": the leaf says so and the unit carries the line the BOM prints',
        B.opensFirst && B.note === 'door B opens first' && u.warnings.some((w) => /door B opens first/.test(w.message)),
        `B opensFirst ${B.opensFirst}, note ${j(B.note)}; ${u.warnings.filter((w) => /opens first/.test(w.message)).map((w) => w.message).join(' | ')}`);
      await shot(page, 'f03-corner-l-G.png');
      // The L stands in a corner: the camera is flown to it by a 2klik on its
      // top board (the app's own "look at THIS") and turned by real drags on
      // the floor until both leaves face it.
      const top = (await page.ask(`${S}.unitResult(${j(id)}).panels.filter((p) => p.role === 'top').map((p) => p.id)`))[0];
      const flown = top ? await focusPiece(page, id, top) : null;
      const seen = await turnToSee(page, id, leafIds);
      await closeIn(page, id, leafIds, { fillH: 0.5, fillW: 0.5 });
      note('the camera: a 2klik on the L\'s top board flies it there, real drags on the floor turn it into the corner', `2klik at ${flown ? `${flown.x},${flown.y} on ${top}` : 'none'}; turned ${seen.turned} px; pixels a hand could touch on A and B: ${seen.sight.join(' and ')}`);
      await leafFrame(page, id, leafIds, 'f03-corner-l-G-leaves.png');
      const rows = await bomRead(page, 'f03-corner-l-bom.png');
      const lr = leafIds.map((x) => rows.find((r) => r.id === x));
      check('the cut list names both leaves "G · Routed slab...", State Cut', lr.every((r) => r && /^G · /.test(r.construction || '') && r.state === 'Cut'),
        lr.map((r) => (r ? `${r.id}: "${r.construction}" ${r.state}` : 'missing')).join('; '));
      await bomClose(page);
      const z = await cncZip(page, id);
      check('the L\'s CNC ZIP: a back DXF and a FRONT DXF for each leaf, and front-operations.json with both parts',
        leafIds.every((x) => z.names.some((n) => n.endsWith(`${x}.dxf`)) && z.names.some((n) => n.endsWith(`${x}-FRONT.dxf`))) && z.manifest && z.manifest.parts.length === 2,
        `${z.names.join(', ')}; parts ${(z.manifest ? z.manifest.parts : []).map((p) => `${p.panelId} ${p.style} ${p.status}`).join(', ')}`);
      const d = await drawingSet(page, 'f03-corner-l-drawing.png');
      const wantN = u.leaves.reduce((s, l) => s + (l.deco ? l.deco.ops : 0), 0);
      check('the drawing set draws both leaves\' grooves on the elevations', d.total === wantN && wantN > 0,
        `${Object.entries(d.counts).map(([n, c]) => `"${n}" ${c}`).join('; ')}; the two leaves carry ${wantN}`);
    }
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F04 · PRO, AN OLD PROJECT: HERBAL HILL, AGAINST THE BASE BUILD ═══════
/** The Herbal Hill file: the T71 fixture's project and units, put on a shelf by the app's own save code. */
async function herbalHillShelf({ id, style = null }) {
  const { HH_PROJECT, HH_ROOM, hhUnits } = await import('../test/fixtures/t71-herbal-hill.js');
  const { DEFAULT_CABINET_PROFILE } = await import('../src/engine/profile.js');
  const { memoryStorage, saveLocalProject, LIBRARY_KEY } = await import('../src/lib/projectLibrary.js');
  const shelf = memoryStorage();
  const project = {
    ...HH_PROJECT, id, room: HH_ROOM, ...(style ? { name: `${HH_PROJECT.name} (style ${style} named alone)`, design: { fronts: { style } } } : {}),
  };
  saveLocalProject(shelf, { project, units: hhUnits(DEFAULT_CABINET_PROFILE), at: Date.parse('2026-10-10T08:00:00Z') });
  return { key: LIBRARY_KEY, json: shelf.getItem(LIBRARY_KEY), name: project.name };
}
/** PRO's start screen with this shelf on it, and the project opened by a real click on its row. */
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
/** Output, Cutting list CSV: the file the app writes, as bytes. */
async function cutListFile(page) {
  const dir = await downloadsTo(page);
  const file = await captureDownload(dir, () => menu(page, 'Output', 'Cutting list CSV'), page);
  await closeCheck(page);
  await dismissReds(page);
  return file ? { file, bytes: readFileSync(file) } : null;
}
/** The BOM panel's own BOM CSV button: the file, as bytes. */
async function bomCsvFile(page) {
  const dir = await downloadsTo(page);
  if (!(await page.ask(`Boolean(${BOM_ASIDE})`))) await page.press('button[title="Bill of materials"]');
  await until(page, `Boolean(${BOM_ASIDE})`, 5000);
  const at = await boxOf(page, 'document.querySelector(\'[data-bom-export="1"]\')');
  const file = at ? await captureDownload(dir, () => clickWith(page, at.x, at.y), page) : null;
  await bomClose(page);
  await closeCheck(page);
  await dismissReds(page);
  return file ? { file, bytes: readFileSync(file) } : null;
}
const diffLines = (a, b) => {
  const x = a.toString('utf8').split(/\r?\n/); const y = b.toString('utf8').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < Math.max(x.length, y.length) && out.length < 4; i += 1) if (x[i] !== y[i]) out.push(`line ${i + 1}: base ${j(x[i])} / here ${j(y[i])}`);
  return out;
};
/** The base build, served: T76_BASE_URL, or a worktree at b810560 built and served on 4183. */
async function baseServer() {
  if (process.env.T76_BASE_URL) return { url: process.env.T76_BASE_URL, how: 'T76_BASE_URL', close: async () => {} };
  const dir = join(TMP, 'base-worktree');
  if (!existsSync(join(dir, 'package.json'))) execFileSync('git', ['worktree', 'add', '--detach', dir, BASE_SHA], { cwd: REPO, stdio: 'ignore' });
  if (!existsSync(join(dir, 'node_modules'))) symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'));
  if (!existsSync(join(dir, 'dist', 'index.html'))) execFileSync('npm', ['run', 'build'], { cwd: dir, stdio: 'ignore' });
  const proc = spawn(process.execPath, [join(dir, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', '4183', '--strictPort'], { cwd: dir, stdio: 'ignore' });
  const url = 'http://127.0.0.1:4183/';
  for (let i = 0; i < 80; i += 1) {
    if (await fetch(`${url}index.html`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => { setTimeout(r, 250); });
  }
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: dir }).toString().trim();
  return {
    url,
    how: `a detached worktree at ${head} in T76_WALK_TMP, node_modules linked, npm run build, served on 4183`,
    close: async () => {
      proc.kill('SIGKILL');
      if (!process.env.T76_KEEP_BASE) {
        try { execFileSync('git', ['worktree', 'remove', '--force', dir], { cwd: REPO, stdio: 'ignore' }); } catch { /* reported below */ }
        try { execFileSync('git', ['worktree', 'prune'], { cwd: REPO, stdio: 'ignore' }); } catch { /* never fatal */ }
      }
    },
  };
}
/** One opening of a shelf on one build: what the room shows and the two files the app writes. */
async function herbalHillOn(base, shelf, frame) {
  const page = await open();
  const opened = await openFromShelf(page, base, shelf);
  const state = opened ? await page.ask(`(() => { const P = ${S}; let decorated = 0; const leaves = [];
    for (const u of P.units) for (const p of P.unitResult(u.id).panels) { if (p.meta && (p.meta.frontDecoration || p.meta.frontDecorationParent)) decorated += 1; if (p.role === 'front') leaves.push(p.id); }
    return { name: P.project.name, units: P.units.length, style: (P.project.design && P.project.design.fronts && P.project.design.fronts.style) || null,
      decoration: (P.project.design && P.project.design.fronts && P.project.design.fronts.decoration) || null, decorated, leaves: leaves.length,
      unitRecipes: P.units.filter((u) => u.params.front_decoration).length }; })()`) : null;
  const meshes = opened ? await decoratedMeshes(page) : null;
  const build = await stamp(page);
  if (frame) await shot(page, frame);
  const csv = opened ? await cutListFile(page) : null;
  const bom = opened ? await bomCsvFile(page) : null;
  let activation = null;
  if (opened && state && state.style && state.style !== 'S') {
    // The opt-in rule's button, where a client meets it: the unit's own panel.
    const first = (await unitsNow(page))[0];
    if (first && await selectUnit(page, first.id)) {
      await sectionOpen(page, 'Carcass');
      activation = await page.ask(`(() => { const b = document.querySelector('[data-decoration-activate]'); const s = ${FT};
        return b ? { style: b.getAttribute('data-decoration-activate'), text: b.textContent.trim(), said: ((b.parentElement.querySelector('p') || {}).textContent || '').trim(),
          select: s ? s.options[s.selectedIndex].textContent.trim() : null } : null; })()`);
      if (frame) await shot(page, frame.replace('.png', '-activate.png'));
    }
  }
  const errs = pageErrors(page);
  await page.close();
  return {
    opened, state, meshes, build, csv, bom, activation, errs,
  };
}

if (runs('f04')) {
  begin('f04', 'PRO, AN OLD PROJECT: HERBAL HILL OPENED, NO DECORATION, THE CUT LIST BYTE FOR BYTE');
  const shelfHH = await herbalHillShelf({ id: 'loc_t76hh' });
  const shelfG = await herbalHillShelf({ id: 'loc_t76hhg', style: 'G' });
  writeFileSync(join(TMP, 'herbal-hill.cc-library.v1.json'), shelfHH.json);
  writeFileSync(join(TMP, 'herbal-hill-style-G.cc-library.v1.json'), shelfG.json);
  note('the file: the T71 fixture (test/fixtures/t71-herbal-hill.js hhUnits, HH_PROJECT, HH_ROOM) saved by lib/projectLibrary.js saveLocalProject, the shelf PRO opens from',
    `T76_WALK_TMP/herbal-hill.cc-library.v1.json, ${shelfHH.json.length} bytes; PRO has no file-open control, so the file is put on the browser's shelf (localStorage ${shelfHH.key}) and opened from All projects by a real click`);
  const here = await herbalHillOn(BASE, shelfHH, 'f04-herbal-hill.png');
  check('this build: All projects, a real click on "3-7 Herbal Hill, 1st floor": the job opens, 13 units',
    here.opened && here.state && here.state.units === 13, `${here.build}; ${j(here.state)}`);
  check('…no decoration appears: no decorated panel in any unit, no decorated solid in the scene, no recipe anywhere',
    here.state && here.state.decorated === 0 && here.meshes && here.meshes.length === 0 && !here.state.decoration && here.state.unitRecipes === 0,
    `decorated panels ${here.state && here.state.decorated} of ${here.state && here.state.leaves} fronts; decorated meshes ${j(here.meshes)}; project recipe ${j(here.state && here.state.decoration)}`);
  let srv = null;
  try {
    srv = await baseServer();
    note('the base build', `${srv.how}; ${srv.url}`);
    const base = await herbalHillOn(srv.url, shelfHH, 'f04-herbal-hill-base.png');
    check('the base build (b810560): the same file opened the same way, 13 units', base.opened && base.state && base.state.units === 13, `${base.build}; ${j(base.state)}`);
    check('Output, Cutting list CSV: the cut list this build writes is byte for byte the base build\'s',
      here.csv && base.csv && Buffer.compare(here.csv.bytes, base.csv.bytes) === 0,
      `here ${here.csv && here.csv.bytes.length} bytes, ${here.csv && here.csv.bytes.toString('utf8').split(/\r\n/).filter(Boolean).length} lines; base ${base.csv && base.csv.bytes.length} bytes${here.csv && base.csv && Buffer.compare(here.csv.bytes, base.csv.bytes) ? `; differs: ${diffLines(base.csv.bytes, here.csv.bytes).join(' | ')}` : ''}`);
    check('…and the BOM panel\'s BOM CSV too (every line, every state), byte for byte',
      here.bom && base.bom && Buffer.compare(here.bom.bytes, base.bom.bytes) === 0,
      `here ${here.bom && here.bom.bytes.length} bytes; base ${base.bom && base.bom.bytes.length} bytes${here.bom && base.bom && Buffer.compare(here.bom.bytes, base.bom.bytes) ? `; differs: ${diffLines(base.bom.bytes, here.bom.bytes).join(' | ')}` : ''}`);
    // THE OPT-IN RULE ON THE SAME JOB: a decorative style NAMED alone (no recipe).
    const hereG = await herbalHillOn(BASE, shelfG, 'f04-herbal-hill-style-G.png');
    const baseG = await herbalHillOn(srv.url, shelfG, null);
    check('the same job saved with the project style G named alone (no recipe): no machining appears, the unit panel offers ACTIVATE DECORATIVE FRONT',
      hereG.opened && hereG.state && hereG.state.style === 'G' && hereG.state.decorated === 0 && hereG.meshes.length === 0 && hereG.activation && hereG.activation.style === 'G',
      `${j(hereG.state)}; decorated meshes ${j(hereG.meshes)}; button ${j(hereG.activation)}`);
    check('…and its cut list is byte for byte the base build\'s',
      hereG.csv && baseG.csv && Buffer.compare(hereG.csv.bytes, baseG.csv.bytes) === 0,
      `here ${hereG.csv && hereG.csv.bytes.length} bytes; base ${baseG.csv && baseG.csv.bytes.length} bytes${hereG.csv && baseG.csv && Buffer.compare(hereG.csv.bytes, baseG.csv.bytes) ? `; differs: ${diffLines(baseG.csv.bytes, hereG.csv.bytes).join(' | ')}` : ''}`);
    for (const r of [here, base, hereG, baseG]) if (r.errs.length) note(`console errors on ${r.build}`, r.errs.slice(0, 3).join(' | '));
  } catch (e) {
    check('the base build served and walked', false, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
  } finally {
    if (srv) await srv.close();
    const left = execFileSync('git', ['worktree', 'list'], { cwd: REPO }).toString().split('\n').filter(Boolean);
    note('worktrees after the section (the base one removed)', left.join(' | '));
  }
}

// ═══ F05 · PRO, REFUSALS: THE ARCH TOO LOW, THE 25 PITCH ON A 100 LEAF ═════
if (runs('f05')) {
  begin('f05', 'PRO, REFUSALS IN WORDS, NEVER A SQUASH, NEVER A CLAMP');
  const page = await open();
  await pro(page);
  note('build', `${await stamp(page)}; ${BASE}`);
  await hideDimensions(page);
  // (a) A 300 WIDE DRAWER UNIT IN A: every drawer front too low for the semicircle.
  const D = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units', 'drawer-unit'], entry: 'drawer-4' });
  check('Library, Kitchen, Base units, Drawer unit, 4x: a BUDR4', D.ok && D.unit && D.unit.type === 'BUDR4', j(D.unit));
  if (D.unit) {
    const id = D.unit.id;
    await selectUnit(page, id);
    await sectionOpen(page, 'Carcass');
    const typed = await typeInto(page, '[data-unit-size-field="width"]', 300);
    const u0 = await unitNow(page, id);
    check('its Width typed 300 (a real click, Ctrl+A, 300, Enter): the drawer fronts are 297 wide', u0.w === 300 && u0.leaves.every((l) => l.w < 300),
      `field ${j(typed.shown)}; ${u0.leaves.map((l) => `${l.id} ${l.w} x ${l.h}`).join(', ')}; said ${j(await lastSaid(page, 1))}`);
    const leafIds = u0.leaves.map((l) => l.id);
    const sel = await setStyle(page, id, 'A', []);
    await page.sleep(800);
    const u = await unitNow(page, id);
    const arch = u.leaves.filter((l) => l.deco && l.deco.status === 'blocked' && l.deco.problems.some((p) => /^FRONT_DECORATION_ARCH: /.test(p)));
    check('"Arched" by the real select on a 300 wide drawer unit: every front is refused in words (FRONT_DECORATION_ARCH), never squashed to an ellipse',
      sel.ok && sel.after.value === 'A' && arch.length === u.leaves.length && arch.every((l) => /never squashed to an ellipse/.test(l.deco.problems.join(' ')) && l.deco.ops === 0),
      `${u.leaves.map((l) => `${l.id} ${l.w} x ${l.h}: ${l.deco ? `${l.deco.status}, ${l.deco.ops} ops; ${l.deco.problems.join(' / ')}` : 'none'}`).join(' || ')}`);
    const words = await page.ask('[...document.querySelectorAll(\'[data-warning-code="FRONT_DECORATION_ARCH"]\')].map((e) => e.textContent.trim())');
    check('the unit\'s own panel says it, in words (UnitWarnings, FRONT_DECORATION_ARCH)', words.length === leafIds.length && words.every((w) => /semicircular arch/.test(w)),
      `${words.length} lines; first ${j(words[0])}`);
    await shot(page, 'f05-arch-refused.png');
    const m = await meshesOf(page, id, leafIds);
    check('…and the scene draws the fronts as plain slabs (no squashed arch is drawn)', leafIds.every((x) => m[x] && !m[x].style), j(m));
    if (!(await page.has('[data-check-panel]'))) await page.press('[data-check-button]');
    await until(page, 'Boolean(document.querySelector(\'[data-check-panel]\'))', 4000);
    const c9 = await page.ask('[...document.querySelectorAll(\'[data-check-finding="9"]\')].map((e) => e.textContent.trim())');
    check('the Check (its toolbar button) names the refused recipe: #9, one per front', c9.filter((t) => /semicircular arch/.test(t)).length === leafIds.length,
      `${c9.length} #9 rows; first ${j(c9[0])}`);
    await elementFrame(page, 'document.querySelector(\'[data-check-panel]\')', 'f05-arch-check.png');
    await closeCheck(page);
    // Its own leaf under the CLAUDE.md wording: a 300 mm wide A leaf whose inner height is under the rise.
    const l0 = u.leaves[0];
    note('which leaf: the drawer fronts of a 300 wide BUDR4 (a door leaf of a 300 wide cabinet is tall enough for its semicircle: inner 177, rise 88.5)',
      `${l0.id} ${l0.w} x ${l0.h}: inner ${l0.w - 120} x ${l0.h - 120} after the 60 frame, rise ${(l0.w - 120) / 2}`);
  }
  // (b) THE 25 PITCH ON A 100 LEAF.
  const B = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'door-base' });
  check('Library, Kitchen, Base units, Standard: a second BUD', B.ok && B.unit && B.unit.type === 'BUD', j(B.unit));
  if (B.unit) {
    const id = B.unit.id;
    await addDoors(page, id);
    await selectUnit(page, id);
    await sectionOpen(page, 'Carcass');
    const typed = await typeInto(page, '[data-unit-size-field="width"]', 103);
    let u0 = await unitNow(page, id);
    const said = await lastSaid(page, 1);
    check('its Width typed 103: the leaf is 100 wide (the door gap off each side)', u0.w === 103 && u0.leaves.length === 1 && u0.leaves[0].w === 100,
      `field ${j(typed.shown)}; width ${u0.w}; ${u0.leaves.map((l) => `${l.id} ${l.w} x ${l.h}`).join(', ')}; said ${j(said)}`);
    if (u0.w !== 103) note('the narrowest the app lets a hand make here', `width ${u0.w}; ${j(said)}`);
    u0 = await unitNow(page, id);
    const leafIds = u0.leaves.map((l) => l.id);
    await setStyle(page, id, 'G', leafIds);
    const g = await unitNow(page, id);
    const l1 = g.leaves[0];
    note(`"Grooved" on the ${l1.w} leaf with the owner's numbers (margin 60 a side, V every 80)`, `${l1.deco ? `${l1.deco.status}; ${l1.deco.problems.join(' / ')}` : 'none'}`);
    const t25 = await typeInto(page, '[data-decoration-field="groovePitchMm"]', 25);
    await page.sleep(700);
    const p = await unitNow(page, id);
    const l2 = p.leaves[0];
    check('groove pitch typed 25 on the 100 leaf: refused in words, the typed 25 kept (the field, the unit\'s recipe, the engine\'s record), never clamped',
      Number(t25.shown) === 25 && p.stored && p.stored.groovePitchMm === 25 && l2.deco && l2.deco.parameters.groovePitchMm === 25
        && l2.deco.status === 'blocked' && l2.deco.ops === 0 && l2.deco.problems.length > 0,
      `field ${j(t25.shown)}; stored ${p.stored && p.stored.groovePitchMm}; record ${l2.deco && l2.deco.parameters.groovePitchMm}; ${l2.deco && l2.deco.status}: ${l2.deco && l2.deco.problems.join(' / ')}`);
    note('what refuses it: the owner\'s margin, 60 a side on a 100 leaf, leaves no groove region (a 25 pitch against a 4 mm V is itself valid)',
      l2.deco ? l2.deco.problems.join(' / ') : '');
    const words = await page.ask('[...document.querySelectorAll(\'[data-warning-code^="FRONT_DECORATION_"]\')].map((e) => e.getAttribute(\'data-warning-code\') + \': \' + e.textContent.trim())');
    check('the unit\'s panel says it in words', words.some((w) => /FRONT_DECORATION_TOO_SMALL|FRONT_DECORATION_PITCH/.test(w)), j(words));
    await shot(page, 'f05-pitch-25-refused.png');
    if (!(await page.has('[data-check-panel]'))) await page.press('[data-check-button]');
    await until(page, 'Boolean(document.querySelector(\'[data-check-panel]\'))', 4000);
    const mine = new RegExp(`(^|\\s)${l2.id.replace(/[-]/g, '\\-')}:`);
    const c9 = (await page.ask('[...document.querySelectorAll(\'[data-check-finding="9"]\')].map((e) => e.textContent.trim())')).filter((x) => mine.test(x));
    check('the Check names it: #9 for this leaf', c9.length > 0, j(c9));
    await closeCheck(page);
    // CLAUDE.md T76 F5: the LINE of a refused recipe is the slab's, and it is cut.
    const rowsB = await bomRead(page, null);
    const rowB = rowsB.find((r) => r.id === l2.id);
    check('the refused leaf\'s cut list line is the slab\'s: State Cut (F5: the refusal is the Check\'s, the line is the slab\'s)',
      rowB && rowB.readiness === 'cut' && rowB.state === 'Cut', rowB ? `${rowB.id} "${rowB.construction}" ${rowB.w} x ${rowB.h}, State ${rowB.state}` : 'no row');
    await bomClose(page);
    const zb = await cncZip(page, id);
    note('the refused leaf in the CNC package (DOWNLOAD ZIP (PER PANEL)): what the gate let through, and what the app said',
      `${zb.names.join(', ') || 'no file'}; manifest ${zb.manifest ? zb.manifest.parts.map((p) => `${p.panelId} ${p.style} ${p.status}, exported ${p.exported}, readiness ${p.readiness}, ${p.operations.length} ops`).join('; ') : 'none'}; said ${j(zb.said)}`);
    await selectUnit(page, id);
    await sectionOpen(page, 'Carcass');
    const t10 = await typeInto(page, '[data-decoration-field="grooveInsetMm"]', 10);
    await page.sleep(700);
    const q = await unitNow(page, id);
    const l3 = q.leaves[0];
    const gaps = l3.deco ? l3.deco.centres.slice(1).map((c, i) => Math.round((c - l3.deco.centres[i]) * 10) / 10) : [];
    check('the margin typed 10: the same 25 is cut as typed, V centres 25 apart (not clamped, not moved)',
      Number(t10.shown) === 10 && l3.deco && l3.deco.status === 'ready' && l3.deco.ops > 1 && gaps.every((x) => Math.abs(Math.abs(x) - 25) < 0.01),
      `${l3.deco && l3.deco.status}, ${l3.deco && l3.deco.ops} grooves at x ${l3.deco && l3.deco.centres.join(', ')}; spacing ${gaps.join(', ')}`);
    // A 100 leaf is a sliver from the room's camera: a 2klik on its side flies the camera there.
    const side = (await page.ask(`${S}.unitResult(${j(id)}).panels.filter((p) => p.role === 'side').map((p) => p.id)`))[0];
    if (side) await focusPiece(page, id, side);
    await closeIn(page, id, leafIds, { fillH: 0.55, fillW: 0.3 });
    await leafFrame(page, id, leafIds, 'f05-pitch-25-honoured.png');
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F06 · RETAIL: THE FRONTS STEP, EACH TILE ONCE ═════════════════════════
if (runs('f06')) {
  begin('f06', 'RETAIL: THE FRONTS STEP, EACH TILE ONCE, NO NUMBER TO TYPE, MY ESTIMATE');
  const page = await open();
  await room(page);
  note('build', `${await stamp(page) || '(retail wears no stamp)'}; ${BASE}retail.html`);
  await withWardrobe(page);
  const [w] = await unitsNow(page);
  check('a wardrobe, through WHERE\'s own button', w && w.type === 'WARDROBE', j(w));
  await page.press('[data-testid="cat-fronts"]');
  if (w && !(await page.ask(`Boolean(${S}.units[0] && ${S}.units[0].params.doors)`))) await page.press('[data-testid="fronts-add-doors"]');
  const tiles = await page.ask('[...document.querySelectorAll(\'[data-testid^="fronts-style-"]\')].map((b) => b.getAttribute(\'data-testid\').replace(\'fronts-style-\', \'\')).filter((t) => /^[A-Z]+$/.test(t))');
  note('the FRONTS step\'s tiles, in its own order (F, S and GL are there, plain or shaker or glass)', tiles.join(', '));
  check('the six decorative tiles are on the step, and no slim shaker', ['G', 'GF', 'FL', 'A', 'AH', 'AM'].every((t) => tiles.includes(t)) && !tiles.includes('SS'), tiles.join(', '));
  const thumbs = await page.ask('[...document.querySelectorAll(\'[data-testid^="fronts-style-"] svg\')].length');
  note('each tile wears its drawing (frontStyleArt.js through FrontThumb)', `${thumbs} drawings`);
  const u0 = await unitNow(page, w.id);
  const leafIds = u0.leaves.map((l) => l.id);
  // THE SHAKER: its FRAME WIDTH is the one number the step offers, and only under S.
  if (!(await page.has('[data-testid="fronts-style-S"][data-on="yes"]'))) await page.press('[data-testid="fronts-style-S"]');
  const sField = await page.has('[data-testid="fronts-frame-width"]');
  check('under S (the shaker) the FRAME WIDTH field stands: the shaker\'s own frame, T33 F8 (the "slim" is this number)', sField, `fronts-frame-width ${sField}`);
  const sMesh = await meshesOf(page, w.id, leafIds);
  let prev = sMesh;
  let prevStyle = 'S';
  const skin = await page.ask(`${PROFILE}.front.decorationMinSkinMm`);
  for (const style of ['G', 'GF', 'FL', 'A', 'AH', 'AM']) {
    const rowState = await page.ask(`(() => { const b = document.querySelector('[data-testid="fronts-style-${style}"]'); return b ? { disabled: b.disabled, refused: b.getAttribute('data-refused'), greyed: b.classList.contains('is-soon'), on: b.getAttribute('data-on') } : null; })()`);
    if (style === 'A' || style === 'AH') {
      // THE ROW THESE DOORS CANNOT TAKE (025331f): greyed and disabled, its
      // refusal in words under the list; the recipe is not shrunk and the
      // door is not swapped (CLAUDE.md T76 F4). A real click on it must
      // change nothing.
      const recipe = await recipeOf(page, style);
      const read = () => page.ask(`JSON.stringify({ fronts: (${S}.project.design || {}).fronts || null, units: ${S}.units.map((u) => ({ type: u.params.front_type || null, recipe: u.params.front_decoration || null })) })`);
      const before = await read();
      const u1 = await unitNow(page, w.id);
      const m1 = await meshesOf(page, w.id, leafIds);
      await page.press(`[data-testid="fronts-style-${style}"]`);
      await page.sleep(900);
      const after = await read();
      const u2 = await unitNow(page, w.id);
      const m2 = await meshesOf(page, w.id, leafIds);
      const doors = u1.leaves[0] && u1.leaves[0].t;
      check(`retail ${style}: on ${doors} mm doors the "${LABELS[style]}" row is offered greyed and disabled (disabled, data-refused yes, is-soon)`,
        rowState && rowState.disabled === true && rowState.refused === 'yes' && rowState.greyed && rowState.on === 'no', j(rowState));
      check(`retail ${style}: a real click on the greyed row changes nothing: the style stays ${prevStyle}, no decoration written, the leaves and their solids as they were`,
        after === before && j(u2.leaves.map((l) => l.deco && [l.deco.style, l.deco.status, l.deco.ops])) === j(u1.leaves.map((l) => l.deco && [l.deco.style, l.deco.status, l.deco.ops]))
          && leafIds.every((id) => m2[id] && m1[id] && m2[id].uuid === m1[id].uuid && m2[id].style === prevStyle),
        `design.fronts ${after === before ? 'unchanged' : `changed: ${before.slice(0, 160)} -> ${after.slice(0, 160)}`}; leaves ${u2.leaves.map((l) => `${l.id} ${l.deco ? `${l.deco.style} ${l.deco.status}` : 'none'}`).join(', ')}; solids ${leafIds.map((id) => `${id} ${(m2[id] || {}).style}, the same geometry ${(m2[id] || {}).uuid === (m1[id] || {}).uuid}`).join(', ')}`);
      const sentence = await page.text(`[data-testid="fronts-style-refused-${style}"]`);
      const need = Number(recipe.recessDepthMm || 0) + Number(recipe.grooveDepthMm || 0) + Number(skin);
      const words = `${LABELS[style].toUpperCase()} is routed into a door at least ${need} mm thick; these doors are ${doors} mm, so it cannot be cut in them.`;
      check(`retail ${style}: the refusal stands under the list in words, the engine's numbers in it (the recess ${recipe.recessDepthMm} and the ${skin} mm skin against the ${doors} mm doors)`,
        sentence === words, `${j(sentence)}${sentence === words ? '' : `; expected ${j(words)}`}`);
      const fieldsHereR = await page.ask('({ numberInputs: document.querySelectorAll(\'input[type="number"]\').length, recipeFields: document.querySelectorAll(\'[data-decoration-field]\').length, stepInputs: [...document.querySelectorAll(\'[data-testid="panel-fronts"] input\')].map((i) => i.getAttribute(\'data-testid\') || i.type) })');
      check(`retail ${style}: no numeric field on the page`, fieldsHereR.numberInputs === 0 && fieldsHereR.recipeFields === 0 && fieldsHereR.stepInputs.length === 0, j(fieldsHereR));
      // The frame shows the greyed row and its sentence: the step is wheeled
      // (a real wheel over it) until the sentence is in view.
      // The step's own scroller (.pbi-options) ends under the BACK / NEXT bar,
      // so the sentence is brought up to clear it.
      const where = () => page.ask(`(() => { const e = document.querySelector('[data-testid="fronts-style-refused-${style}"]'); const p = document.querySelector('[data-testid="panel-fronts"]'); if (!e || !p) return null;
        const b = e.getBoundingClientRect(); const q = p.getBoundingClientRect(); const foot = [...document.querySelectorAll('button')].find((x) => /NEXT/.test(x.textContent) && x.offsetParent);
        const limit = foot ? foot.getBoundingClientRect().top - 24 : window.innerHeight - 120;
        return { top: b.top, bottom: b.bottom, limit, x: Math.round(q.left + q.width / 2), y: 420 }; })()`);
      for (let k = 0, at = await where(); k < 3 && at && at.bottom > at.limit; k += 1, at = await where()) {
        await page.wheel(at.x, at.y, Math.min(600, Math.ceil(at.bottom - at.limit + 40)), 1);
      }
      const shown = await where();
      note(`retail ${style}: the frame shows the greyed row and its sentence (the step wheeled by a real wheel until the sentence clears the BACK / NEXT bar)`,
        shown ? `sentence at y ${Math.round(shown.top)} to ${Math.round(shown.bottom)}, the bar from y ${Math.round(shown.limit + 24)}` : 'no sentence');
      await shot(page, `f06-retail-${style}-refused.png`);
      continue;
    }
    check(`retail ${style}: the "${LABELS[style]}" row is offered live (not disabled, not refused)`,
      rowState && rowState.disabled === false && rowState.refused === 'no' && !rowState.greyed, j(rowState));
    await page.press(`[data-testid="fronts-style-${style}"]`);
    await until(page, `(() => { const r = ${S}.unitResult(${S}.units[0].id); return r.panels.filter((p) => ${j(leafIds)}.includes(p.id)).every((p) => p.meta && p.meta.frontDecoration && p.meta.frontDecoration.style === ${j(style)}); })()`, 6000);
    for (let t = 0; t < 30; t += 1) {
      const mm = await meshesOf(page, w.id, leafIds);
      if (mm && leafIds.every((id) => mm[id] && mm[id].style === style)) break;
      await page.sleep(300);
    }
    await page.sleep(600);
    const u = await unitNow(page, w.id);
    const m = await meshesOf(page, w.id, leafIds);
    const recipe = await recipeOf(page, style);
    const design = await page.ask(`JSON.stringify((${S}.project.design || {}).fronts || null)`).then(JSON.parse);
    const fieldsHere = await page.ask('({ numberInputs: document.querySelectorAll(\'input[type="number"]\').length, recipeFields: document.querySelectorAll(\'[data-decoration-field]\').length, stepInputs: [...document.querySelectorAll(\'[data-testid="panel-fronts"] input\')].map((i) => i.getAttribute(\'data-testid\') || i.type), frame: Boolean(document.querySelector(\'[data-testid="fronts-frame-width"]\')) })');
    const sameRecipe = design && design.decoration && Object.keys(recipe).every((k) => design.decoration[k] === recipe[k]);
    const blocked = u.leaves.filter((l) => l.deco && l.deco.status !== 'ready');
    // Where a recipe is refused, does the step say so in words the client reads?
    const stepWords = blocked.length ? await page.ask('(document.querySelector(\'[data-testid="panel-fronts"]\') || {}).innerText || \'\'') : '';
    const sayIt = blocked.length ? blocked.flatMap((l) => l.deco.problems.map((p) => p.replace(/^[A-Z_]+: /, ''))).filter((p) => stepWords.includes(p)) : [];
    check(`retail ${style}: the "${LABELS[style]}" tile pressed once: the owner's recipe (the profile's) on the job, every leaf ${style} and ready, the leaf's solid shows it`,
      design && design.style === style && sameRecipe && u.leaves.every((l) => l.deco && l.deco.style === style && l.deco.status === 'ready')
        && leafIds.every((id) => m[id] && m[id].style === style && m[id].uuid !== (prev[id] || {}).uuid),
      `recipe ${j(design && design.decoration)}; ${u.leaves.map((l) => `${l.id} ${l.w} x ${l.h} x ${l.t}: ${l.deco ? `${l.deco.style} ${l.deco.status} ${l.deco.ops} ops ${l.deco.additions.length} strips${l.deco.problems.length ? ` (${l.deco.problems.join(' / ')})` : ''}` : 'none'}`).join(', ')}; solids ${leafIds.map((id) => `${id} ${(prev[id] || {}).vertices} -> ${(m[id] || {}).vertices} vertices (${(m[id] || {}).style})`).join(', ')}${blocked.length ? `; the FRONTS step words the refusal: ${sayIt.length ? j(sayIt) : 'no'}` : ''}`);
    check(`retail ${style}: no numeric field on the page (no input type=number, no recipe field, no input in the FRONTS step)`,
      fieldsHere.numberInputs === 0 && fieldsHere.recipeFields === 0 && fieldsHere.stepInputs.length === 0 && !fieldsHere.frame, j(fieldsHere));
    await shot(page, `f06-retail-${style}.png`);
    prev = m;
    prevStyle = style;
  }
  // MY ESTIMATE.
  await page.press('[data-testid="cat-review"]');
  const summary = await page.ask('[...document.querySelectorAll(\'[data-testid="estimate-summary"] .pbi-summary-row\')].map((r) => [...r.children].map((c) => c.textContent.trim()).join(\': \'))');
  note('REVIEW\'s summary', summary.join(' | '));
  await page.press('[data-testid="review-done"]');
  await until(page, 'Boolean(document.querySelector(\'[data-testid="estimate-row-1"]\'))', 30000);
  const row = await page.ask('[...(document.querySelector(\'[data-testid="estimate-row-1"]\') || { children: [] }).children].map((c) => c.textContent.trim()).filter(Boolean).join(\' | \')');
  const head = await page.ask('[...document.querySelectorAll(\'button, a\')].map((b) => b.textContent.trim()).find((t) => /^MY ESTIMATE/.test(t)) || null');
  check('DONE, ADD TO MY ESTIMATE: MY ESTIMATE lists the wardrobe with its style name ("Applied moulding"), and nowhere "Arched"', /Applied moulding/.test(row || '') && !/Arched/i.test(row || ''),
    `${j(head)}; row ${j(row)}`);
  await shot(page, 'f06-retail-estimate.png');
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F07 · PRO, SAVE AND RELOAD: A DECORATED PROJECT ROUND-TRIPS ═══════════
/** What a round trip must keep: each unit's stored recipe, each leaf's record, the cut rows. */
const roundTrip = (page) => page.ask(`(() => { const P = ${S}; return JSON.stringify(P.units.map((u) => { const r = P.unitResult(u.id);
  return { num: u.params.unit_num, type: u.type, frontType: u.params.front_type || null, stored: u.params.front_decoration || null,
    leaves: r.panels.filter((p) => p.meta && (p.meta.frontDecoration || p.meta.frontDecorationParent)).map((p) => ({ id: p.id, w: p.w, h: p.h, t: p.thickness,
      deco: p.meta.frontDecoration ? { style: p.meta.frontDecoration.style, status: p.meta.frontDecoration.status, parameters: p.meta.frontDecoration.parameters,
        ops: p.meta.frontDecoration.operations.map((o) => o.layer + ':' + o.points.length), additions: p.meta.frontDecoration.additions.map((a) => a.length) } : null,
      parent: p.meta.frontDecorationParent || null })),
    csv: r.csvLines || [] }; })); })()`);
if (runs('f07')) {
  begin('f07', 'PRO, SAVE AND RELOAD: A DECORATED PROJECT ROUND-TRIPS');
  const page = await open();
  await pro(page);
  note('build', `${await stamp(page)}; ${BASE}`);
  await hideDimensions(page);
  const B = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'door-base' });
  const W = await addFromLibrary(page, { category: 'Wardrobes', path: [], entry: 'WARDROBE' });
  check('a base unit and a wardrobe from the library', B.unit && W.unit, `${j(B.unit)}; ${j(W.unit)}`);
  if (B.unit && W.unit) {
    await addDoors(page, B.unit.id);
    await addDoors(page, W.unit.id);
    const bl = (await unitNow(page, B.unit.id)).leaves.map((l) => l.id);
    const wl = (await unitNow(page, W.unit.id)).leaves.map((l) => l.id);
    await setStyle(page, B.unit.id, 'GF', bl);
    const t = await typeInto(page, '[data-decoration-field="groovePitchMm"]', 60);
    await setStyle(page, W.unit.id, 'AM', wl);
    const b = await unitNow(page, B.unit.id);
    const w = await unitNow(page, W.unit.id);
    check('the base unit GF with its groove pitch typed 60, the wardrobe AM, both by the real controls',
      b.leaves.every((l) => l.deco && l.deco.style === 'GF' && l.deco.parameters.groovePitchMm === 60) && w.leaves.every((l) => l.deco && l.deco.style === 'AM'),
      `field ${j(t.shown)}; ${b.leaves.map((l) => `${l.id} ${l.deco && l.deco.style} pitch ${l.deco && l.deco.parameters.groovePitchMm}, ${l.deco && l.deco.ops} ops`).join(', ')}; ${w.leaves.map((l) => `${l.id} ${l.deco && l.deco.style} ${l.deco && l.deco.additions.length} strips`).join(', ')}`);
    const before = await roundTrip(page);
    const csv0 = await cutListFile(page);
    const rows0 = await bomRead(page, null);
    await bomClose(page);
    await shot(page, 'f07-before-save.png');
    const name = await page.ask(`${S}.project.name`);
    await page.press('[data-save-control]');
    const saved = await until(page, `!${S}.dirty`, 6000);
    check('SAVE (the top bar\'s own button): the project is saved, nothing left dirty', saved,
      `${j(await lastSaid(page, 1))}; save state ${await page.ask('(document.querySelector(\'[data-save-control]\') || {}).getAttribute(\'data-save-state\')')}`);
    // RELOAD: the page itself, then the start screen's own row.
    await page.send('Page.reload', { ignoreCache: true });
    await page.sleep(2000);
    await page.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
    await until(page, '[...document.querySelectorAll(\'button\')].some((b) => b.offsetParent && /Recent/.test(b.textContent))', 20000);
    const cachedUnits = await page.ask(`${S}.units.length`);
    const shelfRow = await page.ask(`(() => { try { const s = JSON.parse(localStorage.getItem('cc.library.v1') || '{}'); const r = (s.projects || []).find((p) => p.name === ${j(name)});
      return r ? { id: r.id, units: (r.units || []).map((u) => ({ num: u.params.unit_num, frontType: u.params.front_type || null, recipe: u.params.front_decoration || null })) } : null; } catch (e) { return null; } })()`);
    const row = await boxOf(page, `[...document.querySelectorAll('li button')].find((b) => b.offsetParent && b.textContent.includes(${j(name)}))`);
    note('the page reloaded: the start screen, the saved job in Recent (the store keeps the editor\'s own cache of the last session until a project is opened)',
      `Recent row ${row ? 'listed' : 'missing'}; units in the cached store ${cachedUnits}`);
    const savedB = shelfRow && shelfRow.units.find((x) => x.num === b.num);
    const savedW = shelfRow && shelfRow.units.find((x) => x.num === w.num);
    check('the file SAVE wrote (the shelf row, lib/projectLibrary.js) carries both recipes as the panel set them',
      savedB && savedB.frontType === 'GF' && savedB.recipe && savedB.recipe.groovePitchMm === 60 && savedW && savedW.frontType === 'AM' && savedW.recipe && savedW.recipe.style === 'AM',
      `${shelfRow ? shelfRow.id : 'no row'}: ${shelfRow ? shelfRow.units.map((x) => `${x.num} ${x.frontType} ${j(x.recipe)}`).join('; ') : ''}`);
    if (row) {
      await clickWith(page, row.x, row.y);
      await page.waitFor('window.__cc.views && window.__cc.views.room', { timeout: 45000 });
      await page.sleep(3000);
      const after = await roundTrip(page);
      check('reopened by a real click on its row: every stored recipe, every leaf\'s record and every cut line come back the same',
        after === before, `${before.length} characters before, ${after.length} after${after === before ? '' : `; before ${before.slice(0, 300)} | after ${after.slice(0, 300)}`}`);
      const csv1 = await cutListFile(page);
      check('Output, Cutting list CSV before the save and after the reload: byte for byte',
        csv0 && csv1 && Buffer.compare(csv0.bytes, csv1.bytes) === 0, `${csv0 && csv0.bytes.length} -> ${csv1 && csv1.bytes.length} bytes${csv0 && csv1 && Buffer.compare(csv0.bytes, csv1.bytes) ? `; ${diffLines(csv0.bytes, csv1.bytes).join(' | ')}` : ''}`);
      const rows1 = await bomRead(page, 'f07-reloaded-bom.png');
      const pick = (rs) => j(rs.filter((r) => r.id).map((r) => [r.unit, r.id, r.construction, r.w, r.h, r.qty, r.state]));
      check('the BOM panel\'s rows, constructions and States: the same', pick(rows0) === pick(rows1),
        `${rows1.filter((r) => r.construction).map((r) => `${r.id} "${r.construction}" ${r.state}`).join('; ')}; notes ${rows1.filter((r) => / strips$/.test(r.id || '')).map((r) => `${r.id} ${r.state}`).join(', ')}`);
      await bomClose(page);
      const m = await decoratedMeshes(page);
      check('the reopened scene draws the decorated solids again', [...bl, ...wl].every((id) => m.includes(id)), j(m));
      await shot(page, 'f07-reloaded.png');
    }
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ THE LEDGER ═══════════════════════════════════════════════════════════
const fresh = process.argv.includes('--fresh');
const ledger = `${SHOTS}walk.txt`;
const HEAD = [
  'T76 · THE ACCEPTANCE WALK OF THE DECORATIVE FRONTS',
  '',
  'CLAUDE.md T76 F7, walked section by section against `npx vite preview` of',
  'the branch, the hardware served from the silent showroom. f01 and f02 are',
  'the PRO cabinets (a base unit, a wardrobe) through G, GF, A, AH, FL and AM',
  'by the real select; f03 the L of T75; f04 Herbal Hill against the base',
  'build (b810560); f05 the refusals; f06 retail\'s FRONTS step; f07 save and',
  'reload. Every gesture is a REAL mouse or key event at a DOM control\'s',
  'centre or at a pixel the scene\'s own raycaster says the piece is under',
  '(and the page says the canvas owns); the store is only READ. A NOTE names',
  'a gesture the app offers no control for, or a reading worth keeping.',
  'The frames beside this file are what the browser saw.',
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
  const top = mine.find((s) => s.header);
  blocks.set(name, [
    `=== ${name.toUpperCase()} · ${top ? top.header : ''}`,
    ` ·   walked at ${head} · ${top ? top.at : new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
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
writeFileSync(ledger, [
  HEAD,
  ...names.flatMap((n) => [...blocks.get(n), '']),
  ...counts.map((c) => `SECTION ${c.n}: ${c.ok} ok, ${c.fail} FAIL, ${c.notes} notes`),
  `TOTAL ${total.ok + total.fail} checks · ${total.fail} failed · ${total.notes} notes`,
  '',
].join('\n'));
const failed = steps.filter((s) => !s.header && !s.note && !s.ok);
process.stdout.write(`\n${steps.filter((s) => !s.header && !s.note).length} checks · ${failed.length} failed · frames ${frames.join(', ')}\n`);
await showroomDown();
process.exit(failed.length ? 1 : 0);
