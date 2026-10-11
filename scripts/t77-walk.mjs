#!/usr/bin/env node
// T77 · THE ACCEPTANCE WALK OF ORNATE A (CLAUDE.md T77 F7)
//
// CLAUDE.md T77 F7: *"`scripts/t77-walk.mjs` (GPT's `ornate-walk.mjs` folded
// into T76's harness; GPT's script is deleted after, one walk per turn),
// frames `verify/t77/fNN-*.png`, output `verify/t77/walk.txt`"*, and the five
// things it walks. Each is a section here, in F7's own order (the first PRO
// item is two sections, one per cabinet; GPT's walk also saved and reopened a
// PRO project, so that is the last section):
//
//   f01  PRO, a base unit: Fronts set to ORNATE_A_1 .. 4 in turn by the real
//        select; for each the solid, the mirror, the cut list, the CNC ZIP
//        (Reference, and once Full resolution, by the real select), and the
//        T71 drawing set
//   f02  PRO, a wardrobe: the same four styles, the same readings
//   f03  PRO, the L of T75 (a CORNER_L_BASE) with ORNATE_A_2: both leaves
//        carry the relief, door B still "opens first"
//   f04  PRO, refusals: a 250 x 400 leaf with ORNATE_A_1; a 12 mm board with
//        the default recipe (F4's Check)
//   f05  PRO, an old project: Herbal Hill opened, no relief, its cut list
//        byte-compared with the one the base build (405b98c) writes
//   f06  Retail: the FRONTS step's four Ornate tiles, a click changes the
//        leaf, no numeric field, MY ESTIMATE names the style, save, reload
//   f07  PRO, save and reload: an Ornate project round-trips
//
// The section numbers are the walk's own (CLAUDE.md T77's F1 to F8 are the
// turn's work; every section here proves F7).
//
// Every gesture is the browser's own input pipe (CDP
// `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent` / `Input.insertText`),
// aimed at a DOM control's centre or at a pixel where the scene's own
// raycaster says the piece is the nearest thing and the page says the canvas
// owns it (`t75-harness.mjs reachFree`). A native select is driven as T75's
// harness drives one (a real click, the arrows, Enter). A file the client
// loads is picked the way a file dialog picks it: a real click on the LOAD
// control opens the chooser, the browser reports it (CDP
// `Page.fileChooserOpened`) and the file is handed to that chooser. The store
// is READ to say what happened; it is never written to make something
// happen. Where the app offers no control for a gesture the walk says so as
// a NOTE.
//
// THE STAGE. T74's `pro()` sets the stage the way every walk since
// `scripts/e2e-turn18.mjs` has (a new project, the editor's own door), as
// T75's and T76's walks do. f05 opens its project from the start screen with
// a real click instead, as T76's f04 did: PRO has no file-open control, a
// saved project lives on the browser's shelf (localStorage `cc.library.v1`,
// the shape `lib/projectLibrary.js saveLocalProject` writes), so the Herbal
// Hill file, built by that very function from the T71 fixture, is put on the
// shelf the way a saved project sits there, and opened from the list.
//
// The hands are T74's and T75's (`t74-harness.mjs`, `t75-harness.mjs`,
// `cdp.mjs`, `fixture-server.mjs`), imported. T76's walk runs its sections
// when imported, so the helpers it wrote for the decorative fronts (a section
// opened, a unit selected, the library row, the BOM read, the CNC ZIP, the
// drawing set, the Herbal Hill shelf) are carried here and widened for the
// Ornate reference files.
//
//   npm run build && npx vite preview --port 4173 --strictPort
//   node scripts/t77-walk.mjs --fresh             every section, a new ledger
//   node scripts/t77-walk.mjs f04 f06             add to it (a rerun replaces its section)
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t77-walk.mjs ...   another port
//   T77_BASE_URL=http://127.0.0.1:4184/ ...       f05: a base build already served
//   T77_WALK_TMP=<dir> ...                        downloads and the base worktree
//   T77_STYLES=ORNATE_A_1,ORNATE_A_3 ...          f01/f02: only these styles
//
// Without T77_BASE_URL, f05 builds the base itself: a detached worktree at
// 405b98c (one commit after the PR #75 merge 2766045, the same code) in
// T77_WALK_TMP, `node_modules` linked, `npm run build`, served on port 4183,
// and removed (`git worktree remove --force`) when it is done.
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
const SHOTS = new URL('../verify/t77/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const TMP = process.env.T77_WALK_TMP || join(tmpdir(), `t77-walk-${process.pid}`);
mkdirSync(TMP, { recursive: true });
const BASE_SHA = '405b98c';
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

const ORDER = ['f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07'];
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);
const ORNATE = ['ORNATE_A_1', 'ORNATE_A_2', 'ORNATE_A_3', 'ORNATE_A_4'];
const STYLES = process.env.T77_STYLES ? process.env.T77_STYLES.split(',').filter((s) => ORNATE.includes(s)) : ORNATE;

// === THE LEDGER'S HANDS (T76's shape: the section named on every line) ======
const steps = [];
let current = '';
// The app's older sentences carry en and em dashes; the ledger quotes them
// with the dash ESCAPED, so the file this turn writes stays dash-free
// (CLAUDE.md LAWS) and the quote stays true (T74's, T75's and T76's `undash`).
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
/** Every file the walk measured, for the PR's size table. */
const sizes = [];
const mb = (n) => `${(n / 1e6).toFixed(2)} MB`;

// === WHAT THE WALK READS ====================================================
const S = 'window.__cc.project.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const LABELS = {
  F: 'Flat', ORNATE_A_1: 'Ornate A - Classic', ORNATE_A_2: 'Ornate A - Symmetric', ORNATE_A_3: 'Ornate A - Soft', ORNATE_A_4: 'Ornate A - Plain',
};
const ORNAMENT = (style) => (style === 'ORNATE_A_4' ? 'none' : 'procedural placeholder');
/** The BOM sentence F6 writes for a leaf that carries this style. */
const SENTENCE = (style) => `${style} · Slab; relief proposed, not production approved; ornament: ${ORNAMENT(style)}`;
const PROFILE_LAYERS = ['FRONT_REF_PROFILE_D3', 'FRONT_REF_PROFILE_D6', 'FRONT_REF_PROFILE_D9', 'FRONT_REF_PROFILE_D12'];
const recipeOf = async (page, style) => JSON.parse(await page.ask(`JSON.stringify(((${PROFILE}.front || {}).decoration || {})[${j(style)}] || null)`));
const referenceProfile = async (page) => JSON.parse(await page.ask(`JSON.stringify(((${PROFILE}.front || {}).decoration || {}).ornateReference || null)`));

/** A unit's fronts as the engine cut them, with the Ornate record's own fields. */
const unitNow = (page, unitId) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(unitId)});
  if (!u) return null; const r = P.unitResult(u.id);
  const fronts = r.panels.filter((p) => p.role === 'front' && !(p.meta && p.meta.frontDecorationParent));
  return { id: u.id, type: u.type, num: u.params.unit_num, w: u.params.width, h: u.params.height, frontType: u.params.front_type || null,
    stored: u.params.front_decoration || null,
    warnings: (r.warnings || []).map((w) => ({ code: w.code, panel: w.panel || null, message: w.message })),
    leaves: fronts.map((p) => { const d = p.meta && p.meta.frontDecoration; const op = d && d.operations && d.operations[0];
      const contours = (op && op.contours) || [];
      return { id: p.id, part: p.part, w: p.w, h: p.h, t: p.thickness,
        opensFirst: Boolean(p.meta && p.meta.opensFirst), note: (p.meta && p.meta.note) || null,
        deco: d ? { style: d.style, status: d.status, referenceOnly: d.referenceOnly === true,
          productionApproved: d.approval ? d.approval.productionApproved : null, approval: d.approval ? d.approval.status : null,
          ornament: d.ornament === undefined ? '(absent)' : d.ornament, mirror: d.parameters ? d.parameters.mirror : null,
          variant: d.parameters ? d.parameters.variant : null, innerRadiusMm: d.parameters ? d.parameters.innerRadiusMm : null,
          ops: d.operations.length, kind: op ? op.kind : null, layer: op ? op.layer : null, readiness: op ? op.readiness : null,
          vertices: op && op.surface ? op.surface.vertices.length : 0, triangles: op && op.surface ? op.surface.triangles.length : 0,
          profile: contours.filter((c) => c.kind === 'profile-level').length, ornamentContours: contours.filter((c) => c.kind === 'ornament-reference').length,
          contourLayers: [...new Set(contours.map((c) => c.layer))], depths: contours.filter((c) => c.kind === 'profile-level').map((c) => c.depth),
          pointCounts: op ? [op.points.length, ...contours.map((c) => c.points.length)] : [],
          problems: d.problems.map((x) => x.code + ': ' + x.message), codes: d.problems.map((x) => x.code), advisories: (d.advisories || []).map((x) => x.code),
        } : null };
    }) }; })()`);
/** A sample of the stored surface (the back datum), for the mirror's proof. */
const surfaceSample = (page, unitId, leafId, n = 240) => page.ask(`(() => { const r = ${S}.unitResult(${j(unitId)}); const p = r.panels.find((x) => x.id === ${j(leafId)});
  const d = p && p.meta && p.meta.frontDecoration; const op = d && d.operations && d.operations[0]; if (!op || !op.surface) return null;
  const v = op.surface.vertices; const W = Math.max(...d.outline.map((q) => q[0])); const step = Math.max(1, Math.floor(v.length / ${n}));
  const pick = []; for (let i = 0; i < v.length; i += step) pick.push(v[i]);
  return { W, count: v.length, triangles: op.surface.triangles.length, pick, firstTriangle: op.surface.triangles[0] }; })()`);

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

/** The recipe fields and the Ornate controls the PRO panel shows. */
const controlsNow = (page, style) => page.ask(`(() => { const vis = (e) => e && e.offsetParent;
  const fields = [...document.querySelectorAll('[data-decoration-field]')].filter(vis).map((e) => e.getAttribute('data-decoration-field'));
  const m = document.querySelector('[data-ornate-mirror="${style}"]'); const prop = document.querySelector('[data-ornate-proposal="${style}"]');
  const box = document.querySelector('[data-front-decoration="${style}"]');
  return { fields, numberInputs: box ? [...box.querySelectorAll('input')].filter((i) => i.type !== 'checkbox').length : null,
    mirror: m ? { checked: m.checked, label: m.getAttribute('aria-label'), visible: Boolean(vis(m)) } : null,
    proposal: prop ? prop.textContent.replace(/\\s+/g, ' ').trim() : null }; })()`);

// === THE HANDS THIS WALK NEEDS (all real events) ============================

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
/** DOORS' own button on a unit that has no leaf yet. */
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
/** A menu of the bar, then its items in turn, each found by its LABEL. */
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
/** The Front type select set by the real select, the engine and the scene let catch up. */
const FT = 'document.querySelector(\'[data-unit-front-type]\')';
async function setStyle(page, unitId, style, leafIds, { built = true } = {}) {
  await selectUnit(page, unitId);
  await sectionOpen(page, 'Carcass');
  const res = await choose(page, FT, style);
  const decorated = style !== 'F' && style !== 'S';
  await until(page, `(() => { const r = ${S}.unitResult(${j(unitId)}); const leaves = r.panels.filter((p) => ${j(leafIds)}.includes(p.id));
    return leaves.length > 0 && leaves.every((p) => ${decorated ? `p.meta && p.meta.frontDecoration && p.meta.frontDecoration.style === ${j(style)}` : '!(p.meta && p.meta.frontDecoration)'}); })()`, 12000);
  // The scene builds the decorated solid a frame or two later.
  if (built || !decorated) {
    for (let t = 0; t < 60; t += 1) {
      const m = await meshesOf(page, unitId, leafIds);
      if (m && leafIds.every((id) => m[id] && (decorated ? m[id].style === style : !m[id].style))) break;
      await page.sleep(300);
    }
  }
  await page.sleep(700);
  return res;
}
/** Wait until every leaf's solid is a new geometry (the scene rebuilt it). */
async function meshesRebuilt(page, unitId, leafIds, before, style) {
  for (let k = 0; k < 60; k += 1) {
    const mm = await meshesOf(page, unitId, leafIds);
    if (mm && leafIds.every((id) => mm[id] && mm[id].uuid !== (before[id] || {}).uuid && (!style || mm[id].style === style))) return mm;
    await page.sleep(300);
  }
  return meshesOf(page, unitId, leafIds);
}

// === DOWNLOADS: WHAT THE BROWSER SAVED ======================================
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

// === THE FRAMES: WHERE A THING IS ON THE GLASS ==============================
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
/** The camera brought in on the leaves by the wheel, OrbitControls' own gesture. */
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
    if (next && inView(rect) && !inView(next)) { await page.wheel(cx, cy, 120, 1); break; }
    rect = next;
  }
  await settleCamera(page);
  return leafRect(page, unitId, ids);
}
/** The camera flown to a piece by the app's own gesture: a 2klik on it. */
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
/** The camera turned by real drags on the empty floor until every leaf is in sight. */
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

// === THE CUT LIST, THE CNC ZIP, THE DRAWING SET: READ THROUGH THE UI ========
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

/** A ZIP the browser saved, opened: every name, its bytes, the DXF layers, the STL and JSON read. */
async function readZip(file) {
  const out = {
    file, names: [], bytes: {}, manifest: null, readinessName: null, readiness: null, layers: {}, stl: {}, json: {},
  };
  if (!file) return out;
  out.zipBytes = readFileSync(file).length;
  const zip = await JSZip.loadAsync(readFileSync(file));
  out.names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  for (const n of out.names) {
    const data = await zip.file(n).async('uint8array');
    out.bytes[n] = data.byteLength;
    if (/\.dxf$/i.test(n)) {
      const lines = Buffer.from(data).toString('utf8').split(/\r?\n/);
      const set = new Set();
      for (let i = 0; i + 1 < lines.length; i += 2) if (lines[i].trim() === '8') set.add(lines[i + 1].trim());
      out.layers[n] = [...set];
    }
    if (/\.stl$/i.test(n)) {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const head80 = Buffer.from(data.subarray(0, 80)).toString('latin1');
      const count = data.byteLength >= 84 ? view.getUint32(80, true) : -1;
      out.stl[n] = {
        bytes: data.byteLength, count, binary: data.byteLength === 84 + 50 * count && !/^solid/i.test(head80), header: head80.trimEnd(),
      };
    }
    if (/operations\.json$/.test(n) && n !== 'front-operations.json') out.json[n] = JSON.parse(Buffer.from(data).toString('utf8'));
  }
  if (zip.file('front-operations.json')) out.manifest = JSON.parse(await zip.file('front-operations.json').async('string'));
  out.readinessName = out.names.find((n) => /READINESS\.txt$/.test(n)) || null;
  if (out.readinessName) out.readiness = await zip.file(out.readinessName).async('string');
  return out;
}
const LEVEL = 'document.querySelector(\'[data-export-reference-level]\')';
const levelNow = (page) => page.ask(`(() => { const s = ${LEVEL}; return s ? { value: s.value, labels: [...s.options].map((o) => o.textContent.trim()), options: [...s.options].map((o) => o.value), visible: Boolean(s.offsetParent) } : null; })()`);
/**
 * The unit's CNC package as the joiner downloads it: View, CNC sheet, the
 * level of the Ornate reference files chosen in the panel's own select (when
 * asked), the unit's branch, DOWNLOAD ZIP (PER PANEL), the file opened.
 */
async function cncZip(page, unitId, { level = null, frontFrame = null, levelFrame = null } = {}) {
  const dir = await downloadsTo(page);
  await viewMode(page, 'CNC sheet');
  await until(page, `Boolean(document.querySelector('[data-cnc-branch="${unitId}"]'))`, 8000);
  const levelBefore = await levelNow(page);
  let chose = null;
  if (level && levelBefore && levelBefore.value !== level) chose = await choose(page, LEVEL, level);
  const levelAt = await levelNow(page);
  if (levelFrame) await elementFrame(page, 'document.querySelector(\'[data-ornate-reference-level]\')', levelFrame, { scale: 2 });
  if (await page.ask(`(document.querySelector('[data-cnc-branch="${unitId}"]') || { getAttribute: () => 'true' }).getAttribute('aria-expanded') !== 'true'`)) {
    await page.press(`[data-cnc-branch="${unitId}"]`);
  }
  let preview = null;
  if (frontFrame && await page.has('[data-testid="cnc-face-front"]')) {
    await page.press('[data-testid="cnc-face-front"]');
    await page.sleep(1200);
    if (await page.has('button[title="Fit the whole sheet"]')) await page.press('button[title="Fit the whole sheet"]');
    preview = await page.ask(`(() => { const text = document.body.innerText || ''; return { face: (document.querySelector('[data-cnc-face]') || { getAttribute: () => null }).getAttribute('data-cnc-face'),
      features: document.querySelectorAll('[data-cnc-decoration]').length, layers: ${j([...PROFILE_LAYERS, 'FRONT_REF_ORNAMENT', 'FRONT_REFERENCE_NO_CUT'])}.filter((l) => text.includes(l)),
      legend: (text.match(/Proposed relief contours are references[^.]*\\./) || [null])[0],
      proposalLabels: [...document.querySelectorAll('[data-cnc-front-proposal]')].map((e) => ({ id: e.getAttribute('data-cnc-front-proposal'),
        text: [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(),
        title: ((e.querySelector('title') || {}).textContent || '').trim(), fill: e.getAttribute('fill') })),
      blockedLabels: document.querySelectorAll('[data-cnc-front-blocked]').length }; })()`);
    // The pointer laid on the first profile contour (a real mouse move to a
    // pixel the page says the contour's own hit path owns): the sheet's hover
    // readout says what the line is.
    // On a tall leaf drawn small the four profile lines lie close and the
    // later one's hit path covers the earlier one, so each profile line is
    // tried in turn, along its length, until the page says the pixel is its.
    const at = await page.ask(`(() => { const els = [...document.querySelectorAll('[data-cnc-feature]')].filter((e) => /ornate-profile-\\d$/.test(e.getAttribute('data-cnc-feature') || ''));
      for (const el of els) { const L = el.getTotalLength(); const m = el.getScreenCTM();
        for (let k = 1; k < 40; k += 1) { const p = el.getPointAtLength(L * ((k * 0.37) % 1)); const q = new DOMPoint(p.x, p.y).matrixTransform(m);
          const x = Math.round(q.x); const y = Math.round(q.y); if (document.elementFromPoint(x, y) === el) return { x, y, id: el.getAttribute('data-cnc-feature') }; } }
      return null; })()`);
    if (at) {
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x - 6, y: at.y - 6 });
      await page.sleep(120);
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
      await page.sleep(700);
      preview.hover = await page.ask('(() => { const t = document.querySelector(\'[data-rollover-title]\'); const box = t && t.parentElement; return box ? { at: ' + j(at) + ', text: box.innerText.replace(/\\s+/g, \' \').trim() } : null; })()');
    }
    await shot(page, frontFrame);
    if (await page.has('[data-testid="cnc-face-back"]')) await page.press('[data-testid="cnc-face-back"]');
  }
  const btn = await boxOf(page, `(() => { const c = document.querySelector('[data-cnc-branch="${unitId}"]'); const box = c && c.parentElement && c.parentElement.parentElement;
    return box ? [...box.querySelectorAll('button')].find((b) => /Download ZIP \\(per panel\\)/.test(b.textContent)) : null; })()`);
  let file = null;
  if (btn) file = await captureDownload(dir, () => clickWith(page, btn.x, btn.y), page);
  const said = await lastSaid(page, 3);
  const out = {
    ...(await readZip(file)), said, levelBefore, levelAt, chose, preview,
  };
  await closeCheck(page);
  await dismissReds(page);
  await viewMode(page, '3D');
  await page.sleep(800);
  return out;
}

/** The reference files of one leaf in a ZIP, read and judged against F3, F4 and F6. */
function leafReference(z, unitNum, leaf, { level = 'reference', target = 4000000 } = {}) {
  const stemRe = new RegExp(`^ornate-reference/${unitNum}-${leaf.id.replace(/[-]/g, '\\-')}-\\d+-ORNATE-PROPOSED-`);
  const mine = z.names.filter((n) => stemRe.test(n));
  const dxf = mine.find((n) => /-FRONT\.dxf$/.test(n)) || null;
  const stl = mine.find((n) => /-RELIEF-1\.stl$/.test(n)) || null;
  const json = mine.find((n) => /-operations\.json$/.test(n)) || null;
  const spec = json ? z.json[json] : null;
  const total = [dxf, stl, json].reduce((s, n) => s + (n ? z.bytes[n] : 0), 0);
  const part = ((z.manifest && z.manifest.parts) || []).find((p) => p.panelId === leaf.id) || null;
  const listed = part && Array.isArray(part.referenceFiles) ? part.referenceFiles : [];
  return {
    mine,
    dxf,
    stl,
    json,
    spec,
    total,
    under: total > 0 && total < target,
    part,
    listed,
    listedOk: listed.length === 3 && listed.every((f) => f.referenceLevel === level && z.bytes[f.name] === f.bytes),
    dxfLayers: dxf ? z.layers[dxf] : [],
    stlInfo: stl ? z.stl[stl] : null,
  };
}

/**
 * The T71 drawing set as the window shows it: Output, Drawings, Preview, the
 * Set tab, every sheet in turn. On each "Front view" the decoration's own
 * entities (`data-cc="front-decoration"`) are counted, with the points each
 * path carries; on the cut list the leaf's own row is read.
 */
async function drawingSet(page, file, leafIds = []) {
  await menu(page, 'Output', 'Drawings', 'Preview');
  await until(page, 'window.__cc.ui.getState().modal === \'drawing\'', 5000);
  await page.press('[data-drawing-kind-tab="walls"]');
  await until(page, 'document.querySelectorAll(\'[data-wall-sheet]\').length > 0 || Boolean(document.querySelector(\'[data-wall-failed]\'))', 30000);
  const sheets = await page.ask('[...document.querySelectorAll(\'[data-wall-sheet]\')].map((b) => b.getAttribute(\'data-wall-sheet\'))');
  const counts = {};
  const pointCounts = [];
  const rows = {};
  let framed = false;
  for (const name of sheets) {
    const front = /Front view/.test(name);
    const cut = /cut/i.test(name);
    if (!front && !cut) continue;
    await page.press(`[data-wall-sheet="${name}"]`);
    await until(page, `(document.querySelector('[data-wall-sheet="${name}"]') || {}).getAttribute && document.querySelector('[data-wall-sheet="${name}"]').getAttribute('aria-pressed') === 'true'`, 4000);
    await page.sleep(1200);
    if (front) {
      counts[name] = await page.count('.cc-drawing [data-cc="front-decoration"]');
      pointCounts.push(...(await page.ask('[...document.querySelectorAll(\'.cc-drawing [data-cc="front-decoration"]\')].map((e) => ((e.getAttribute(\'d\') || \'\').match(/[ML]/g) || []).length)')));
      if (file && !framed && counts[name] > 0) {
        framed = true;
        await page.ask('(() => { const e = document.querySelector(\'.cc-drawing [data-cc="front-decoration"]\'); if (e) e.scrollIntoView({ block: \'center\' }); return true; })()');
        await page.sleep(300);
        const r = await page.ask(`(() => { const els = [...document.querySelectorAll('.cc-drawing [data-cc="front-decoration"]')]; const box = document.querySelector('.cc-drawing').getBoundingClientRect();
          let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
          for (const e of els) { const b = e.getBoundingClientRect(); x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom); }
          const w = x1 - x0; const h = y1 - y0; const m = Math.max(w, h) * 0.3 + 10;
          const cx0 = Math.max(box.left, x0 - m); const cy0 = Math.max(box.top, Math.max(0, y0 - m)); const cx1 = Math.min(box.right, x1 + m); const cy1 = Math.min(box.bottom, Math.min(window.innerHeight, y1 + m));
          return { x: cx0, y: cy0, w: cx1 - cx0, h: cy1 - cy0 }; })()`);
        const scale = Math.max(1, Math.min(4, 820 / Math.max(r.w, r.h)));
        await shot(page, file, {
          x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h), scale,
        });
      }
    }
    if (cut) {
      // The cut list prints each part on one line: id, qty, size, `t<board>`, state.
      for (const id of leafIds) {
        // The row's own words are the texts on its line inside its unit's block
        // (the smallest muted rectangle round the id): the next column's are not.
        rows[id] = await page.ask(`(() => { const texts = [...document.querySelectorAll('.cc-drawing text')];
          const me = texts.find((t) => t.textContent.trim() === ${j(id)}); if (!me) return null; const mx = Number(me.getAttribute('x')); const my = Number(me.getAttribute('y'));
          const box = [...document.querySelectorAll('.cc-drawing rect')].map((r) => ({ x: Number(r.getAttribute('x')), y: Number(r.getAttribute('y')), w: Number(r.getAttribute('width')), h: Number(r.getAttribute('height')) }))
            .filter((r) => r.x <= mx && mx <= r.x + r.w && r.y <= my && my <= r.y + r.h && r.h > 8).sort((a, b) => a.w * a.h - b.w * b.h)[0];
          const right = box ? box.x + box.w : mx + 90;
          return texts.filter((t) => t.getAttribute('y') === me.getAttribute('y') && Number(t.getAttribute('x')) >= mx - 0.01 && Number(t.getAttribute('x')) <= right + 0.01).map((t) => t.textContent.trim()); })()`);
      }
    }
  }
  if (file && !framed) await elementFrame(page, 'document.querySelector(\'.cc-drawing\')', file);
  const failed = await page.has('[data-wall-failed]');
  const close = await boxOf(page, '[...document.querySelectorAll(\'[data-modal-name="drawing"] button\')].find((b) => b.textContent.trim() === \'Close\')');
  if (close) await clickWith(page, close.x, close.y);
  await page.sleep(600);
  return {
    sheets, counts, failed, total: Object.values(counts).reduce((s, n) => s + n, 0), pointCounts, rows,
  };
}
const sameMultiset = (a, b) => j([...a].sort((x, y) => x - y)) === j([...b].sort((x, y) => x - y));

// === F01 / F02 · PRO: THE FOUR ORNATE STYLES ON A CABINET, BY THE REAL SELECT =
async function fourStyles(page, { tag, unitId, prefix, full = false, outputMenu = false }) {
  const u0 = await unitNow(page, unitId);
  const leafIds = u0.leaves.map((l) => l.id);
  const target = (await referenceProfile(page)) || {};
  const leafTarget = Number(target.leafTargetBytes) || 4000000;
  note(`${tag}: the cabinet and its leaves as the engine cut them`, `${u0.type} ${u0.num}, ${u0.w} wide; leaves ${u0.leaves.map((l) => `${l.id} ${l.w} x ${l.h} x ${l.t}`).join(', ')}; the reference files held to ${leafTarget} bytes a leaf (profile.front.decoration.ornateReference ${j(target)})`);
  // THE PLAIN LEAF, for the vertex count every decorated solid is read against.
  const plainSel = await setStyle(page, unitId, 'F', leafIds);
  const plain = await meshesOf(page, unitId, leafIds);
  const plainU = await unitNow(page, unitId);
  await closeIn(page, unitId, leafIds);
  check(`${tag}: Flat by the real select (a click, the arrows, Enter): a plain slab, no decoration`,
    plainSel.ok && plainSel.after.value === 'F' && plainU.leaves.every((l) => !l.deco),
    `select "${plainSel.after && plainSel.after.labels[plainSel.after.index]}"; meshes ${j(plain)}`);
  await leafFrame(page, unitId, leafIds, `${prefix}-plain.png`);
  for (const style of STYLES) {
    const sel = await setStyle(page, unitId, style, leafIds);
    const u = await unitNow(page, unitId);
    const m = await meshesOf(page, unitId, leafIds);
    const leaves = u.leaves;
    check(`${tag} ${style}: "${LABELS[style]}" chosen in the Front type select by a real click, the arrows and Enter; every leaf carries the relief, ready, a proposal (referenceOnly, not production approved)`,
      sel.ok && sel.after.value === style && sel.after.labels[sel.after.index] === LABELS[style] && leaves.length > 0
        && leaves.every((l) => l.deco && l.deco.style === style && l.deco.status === 'ready' && l.deco.referenceOnly && l.deco.productionApproved === false && l.deco.kind === 'relief' && l.deco.ops === 1),
      `select ${j(sel.before && sel.before.value)} -> ${j(sel.after && sel.after.value)} "${sel.after && sel.after.labels[sel.after.index]}"; ${leaves.map((l) => (l.deco ? `${l.id} ${l.deco.style} ${l.deco.status}, ${l.deco.kind} on ${l.deco.layer} (${l.deco.readiness}), approval ${l.deco.approval}, productionApproved ${l.deco.productionApproved}, surface ${l.deco.vertices} vertices / ${l.deco.triangles} triangles${l.deco.problems.length ? `; ${l.deco.problems.join(' / ')}` : ''}` : `${l.id} no decoration`)).join('; ')}`);
    check(`${tag} ${style}: the record names its ornament "${ORNAMENT(style)}" (F6) and carries the four profile levels 3/6/9/12`,
      leaves.every((l) => l.deco && l.deco.ornament === ORNAMENT(style) && l.deco.profile === 4 && j(l.deco.depths) === j([3, 6, 9, 12])
        && (style === 'ORNATE_A_4' ? l.deco.ornamentContours === 0 : l.deco.ornamentContours > 0)),
      leaves.map((l) => (l.deco ? `${l.id}: ornament ${j(l.deco.ornament)}, ${l.deco.profile} profile contours at ${l.deco.depths.join('/')}, ${l.deco.ornamentContours} ornament contours; layers ${l.deco.contourLayers.join(', ')}` : `${l.id}: none`)).join('; '));
    // THE SOLID.
    check(`${tag} ${style}: the leaf's solid shows the relief (the scene builds it from the record's surface: the geometry carries the style)`,
      leafIds.every((id) => m && m[id] && m[id].style === style && m[id].vertices > 1000 && m[id].vertices !== (plain[id] || {}).vertices),
      leafIds.map((id) => `${id}: ${m && m[id] ? `${m[id].vertices} vertices (plain ${(plain[id] || {}).vertices}), marked ${m[id].style}, ${m[id].depthMm} mm deep (plain ${(plain[id] || {}).depthMm})` : 'no mesh'}`).join('; '));
    // THE CONTROLS: NO NUMBER, ONE CHECKBOX.
    const ctl = await controlsNow(page, style);
    check(`${tag} ${style}: the unit panel offers no numeric recipe field, only the proposal sentence and "Mirror ornate pattern" (unticked)`,
      ctl.fields.length === 0 && ctl.numberInputs === 0 && ctl.mirror && ctl.mirror.visible && ctl.mirror.checked === false && /Proposed carved relief/.test(ctl.proposal || ''),
      j(ctl));
    await closeIn(page, unitId, leafIds);
    await shot(page, `${prefix}-${style}.png`);
    await leafFrame(page, unitId, leafIds, `${prefix}-${style}-leaf.png`);
    // THE MIRROR: a real click on the checkbox, the composition flips.
    const s0 = await surfaceSample(page, unitId, leafIds[0]);
    const mAt = await boxOf(page, `document.querySelector('[data-ornate-mirror="${style}"]')`);
    if (mAt) await clickWith(page, mAt.x, mAt.y);
    await until(page, `(() => { const u = ${S}.units.find((x) => x.id === ${j(unitId)}); return u && u.params.front_decoration && u.params.front_decoration.mirror === true; })()`, 6000);
    const mm = await meshesRebuilt(page, unitId, leafIds, m, style);
    const um = await unitNow(page, unitId);
    const s1 = await surfaceSample(page, unitId, leafIds[0]);
    const flipped = s0 && s1 && s0.count === s1.count && s0.pick.length === s1.pick.length
      && s0.pick.every((p, i) => Math.abs(s1.pick[i][0] - (s0.W - p[0])) < 1e-6 && Math.abs(s1.pick[i][1] - p[1]) < 1e-6 && Math.abs(s1.pick[i][2] - p[2]) < 1e-6);
    const ctlM = await controlsNow(page, style);
    check(`${tag} ${style}: "Mirror ornate pattern" ticked by a real click: the unit keeps mirror true, the record flips the composition (every sampled vertex x becomes width - x, y and depth kept) and the solid is built again`,
      mAt && ctlM.mirror && ctlM.mirror.checked && um.stored && um.stored.mirror === true && um.leaves.every((l) => l.deco && l.deco.mirror === true && l.deco.status === 'ready')
        && flipped && leafIds.every((id) => mm[id] && mm[id].uuid !== (m[id] || {}).uuid && mm[id].style === style),
      `checkbox ${ctlM.mirror && ctlM.mirror.checked}; stored mirror ${um.stored && um.stored.mirror}; record mirror ${um.leaves.map((l) => `${l.id} ${l.deco && l.deco.mirror}`).join(', ')}; ${s1 ? `${s0.pick.length} sampled vertices of ${s1.count} on ${leafIds[0]} (width ${s0.W}): first x ${Math.round(s0.pick[0][0] * 100) / 100} -> ${Math.round(s1.pick[0][0] * 100) / 100}, flipped ${flipped}` : 'no surface'}; solids ${leafIds.map((id) => `${id} a new geometry ${(mm[id] || {}).uuid !== (m[id] || {}).uuid}`).join(', ')}`);
    await leafFrame(page, unitId, leafIds, `${prefix}-${style}-mirror.png`);
    // Unticked again by a real click: the composition comes back as it was.
    const mAt2 = await boxOf(page, `document.querySelector('[data-ornate-mirror="${style}"]')`);
    if (mAt2) await clickWith(page, mAt2.x, mAt2.y);
    await until(page, `(() => { const u = ${S}.units.find((x) => x.id === ${j(unitId)}); return u && u.params.front_decoration && u.params.front_decoration.mirror === false; })()`, 6000);
    await meshesRebuilt(page, unitId, leafIds, mm, style);
    const s2 = await surfaceSample(page, unitId, leafIds[0]);
    check(`${tag} ${style}: unticked by a second real click: the record is the unmirrored one again, vertex for vertex`,
      s2 && j(s2.pick) === j(s0.pick) && j(s2.firstTriangle) === j(s0.firstTriangle), s2 ? `${s2.count} vertices; the sample ${j(s2.pick) === j(s0.pick) ? 'identical' : 'DIFFERS'}` : 'no surface');
    // THE CUT LIST NAMES THE LEAF WITH ITS CONSTRUCTION AND ITS STATE.
    const rows = await bomRead(page, `${prefix}-${style}-bom.png`);
    const leafRows = leafIds.map((id) => rows.find((r) => r.id === id));
    check(`${tag} ${style}: the cut list (BOM panel, Parts tab) names each leaf "${SENTENCE(style)}", State Cut`,
      leafRows.every((r) => r && r.construction === SENTENCE(style) && /relief proposed, not production approved/.test(r.construction) && r.state === 'Cut' && r.readiness === 'cut'),
      leafRows.map((r) => (r ? `${r.id}: "${r.construction}", State ${r.state} (${r.readiness}), ${r.w} x ${r.h}` : 'missing')).join('; '));
    const edge = await page.ask(`(() => { const a = ${BOM_ASIDE}; if (!a) return null; const r = a.getBoundingClientRect(); let worst = null;
      for (const c of a.querySelectorAll('td[data-readiness]')) { const range = document.createRange(); range.selectNodeContents(c); const t = range.getBoundingClientRect();
        const over = Math.round((t.right - r.right) * 10) / 10; if (!worst || over > worst.over) worst = { over, state: c.textContent.trim() }; }
      return { panel: Math.round(r.width), worst }; })()`);
    note(`${tag} ${style}: the BOM panel's State column against the panel's edge (T76 F7's reading, with the longer Ornate sentence)`,
      edge && edge.worst ? `panel ${edge.panel} px; the State that ends furthest right "${edge.worst.state}" ${edge.worst.over > 0 ? `${edge.worst.over} px PAST the edge` : `${-edge.worst.over} px inside`}` : 'no BOM table');
    await bomClose(page);
    // THE CNC ZIP, AT THE DEFAULT LEVEL.
    const first = style === STYLES[0];
    const z = await cncZip(page, unitId, {
      level: 'reference', frontFrame: (style === 'ORNATE_A_1' || style === 'ORNATE_A_2') ? `${prefix}-${style}-cnc-front.png` : null, levelFrame: first ? `${prefix}-cnc-level.png` : null,
    });
    check(`${tag} ${style}: the CNC panel offers the level of the reference files in its own select ("Reference (default)", "Full resolution"), standing at Reference, no numeric field`,
      z.levelAt && z.levelAt.visible && j(z.levelAt.labels) === j(['Reference (default)', 'Full resolution']) && z.levelAt.value === 'reference',
      `${j(z.levelAt)}${z.chose ? `; set by the real select from ${z.levelBefore && z.levelBefore.value}` : ''}`);
    if (z.preview) {
      check(`${tag} ${style}: the CNC sheet's front face (its own FRONT DECORATION button) draws the proposed reference: its own entities, the profile and ornament layers in the legend, "Proposed relief contours are references"; the pointer on a profile contour reads "Proposed relief reference", not approved for production`,
        z.preview.face === 'front' && z.preview.features > 4 && PROFILE_LAYERS.every((l) => z.preview.layers.includes(l)) && Boolean(z.preview.legend)
          && z.preview.hover && /Proposed relief reference/i.test(z.preview.hover.text) && /not approved for production/i.test(z.preview.hover.text), j(z.preview));
      // T77 F7 fixes · since F4 a relief that built is not a fault: the front
      // face labels each leaf "Proposed relief reference" in the reference
      // colour, never "Decoration blocked".
      check(`${tag} ${style}: on the CNC sheet's front face each leaf is labelled "Proposed relief reference" (the reference colour), and no leaf "Decoration blocked"`,
        leafIds.every((id) => (z.preview.proposalLabels || []).some((l) => l.id === id && l.text === 'Proposed relief reference')) && z.preview.blockedLabels === 0,
        j({ proposal: z.preview.proposalLabels, blocked: z.preview.blockedLabels }));
    }
    const backs = leafIds.filter((id) => z.names.some((n) => n === `${id}.dxf` || n.endsWith(`-${id}.dxf`)));
    const refs = u.leaves.map((l) => ({ leaf: l, r: leafReference(z, u.num, l, { level: 'reference', target: leafTarget }) }));
    check(`${tag} ${style}: the CNC ZIP (CNC sheet, the unit's branch, DOWNLOAD ZIP (PER PANEL)) holds the back DXF of each leaf, the ornate-reference/ folder (DXF, STL, JSON per leaf), READINESS.txt and front-operations.json`,
      z.file && backs.length === leafIds.length && refs.every((x) => x.r.dxf && x.r.stl && x.r.json) && Boolean(z.readinessName) && Boolean(z.manifest),
      `${z.file ? z.file.split('/').pop() : 'no download'} (${z.zipBytes || 0} bytes): ${z.names.map((n) => `${n} ${z.bytes[n]}`).join(', ')}`);
    check(`${tag} ${style}: the relief STL is BINARY (an 80 byte header that does not open with "solid", a uint32 count, 50 bytes a triangle)`,
      refs.every((x) => x.r.stlInfo && x.r.stlInfo.binary && x.r.stlInfo.count > 0),
      refs.map((x) => (x.r.stlInfo ? `${x.r.stl}: ${x.r.stlInfo.bytes} bytes = 84 + 50 x ${x.r.stlInfo.count}: ${x.r.stlInfo.binary}; header ${j(x.r.stlInfo.header.slice(0, 60))}` : `${x.leaf.id}: no STL`)).join('; '));
    check(`${tag} ${style}: each leaf's operations JSON says level "reference" (sampleMm ${target.sampleMm}), the ornament "${ORNAMENT(style)}", the leaf's ACTUAL board, no boardMm, reference-only, not production approved`,
      refs.every((x) => x.r.spec && x.r.spec.reference && x.r.spec.reference.level === 'reference' && x.r.spec.reference.sampleMm === target.sampleMm
        && x.r.spec.ornament === ORNAMENT(style) && x.r.spec.thicknessMm === x.leaf.t && !Object.hasOwn(x.r.spec.parameters || {}, 'boardMm')
        && x.r.spec.status === 'reference-only' && x.r.spec.productionApproved === false),
      refs.map((x) => (x.r.spec ? `${x.r.json}: level ${x.r.spec.reference && x.r.spec.reference.level} (sampleMm ${x.r.spec.reference && x.r.spec.reference.sampleMm}), ornament ${j(x.r.spec.ornament)}, thicknessMm ${x.r.spec.thicknessMm} (leaf ${x.leaf.t}), remaining ${x.r.spec.operations[0] && x.r.spec.operations[0].remainingThicknessMm}, boardMm printed ${Object.hasOwn(x.r.spec.parameters || {}, 'boardMm')}, status ${x.r.spec.status}` : `${x.leaf.id}: no JSON`)).join('; '));
    check(`${tag} ${style}: the reference DXF carries FRONT_REFERENCE_NO_CUT and the four FRONT_REF_PROFILE_D3/D6/D9/D12${style === 'ORNATE_A_4' ? ' (no ornament layer on Plain)' : ' and FRONT_REF_ORNAMENT'}; the back DXF carries none of them`,
      refs.every((x) => x.r.dxfLayers.includes('FRONT_REFERENCE_NO_CUT') && PROFILE_LAYERS.every((l) => x.r.dxfLayers.includes(l))
        && (style === 'ORNATE_A_4' ? !x.r.dxfLayers.includes('FRONT_REF_ORNAMENT') : x.r.dxfLayers.includes('FRONT_REF_ORNAMENT')))
        && leafIds.every((id) => { const n = z.names.find((x) => x === `${id}.dxf` || x.endsWith(`-${id}.dxf`)); return n && !(z.layers[n] || []).some((l) => /^FRONT_REF/.test(l)); }),
      `${refs.map((x) => `${x.r.dxf}: ${j(x.r.dxfLayers)}`).join('; ')}; back ${leafIds.map((id) => { const n = z.names.find((x) => x === `${id}.dxf` || x.endsWith(`-${id}.dxf`)); return `${n}: ${j(n ? z.layers[n] : null)}`; }).join('; ')}`);
    check(`${tag} ${style}: front-operations.json lists each leaf's three reference files with referenceLevel "reference" and the bytes the ZIP really holds; READINESS.txt names the reference line`,
      refs.every((x) => x.r.listedOk) && /Ornate proposed reference/.test(z.readiness || ''),
      `${refs.map((x) => `${x.leaf.id}: ${x.r.listed.map((f) => `${f.name.split('/').pop()} ${f.referenceLevel} ${f.bytes}`).join(', ')}`).join('; ')}; ${z.readinessName}: ${j(z.readiness)}`);
    for (const x of refs) {
      for (const n of [x.r.dxf, x.r.stl, x.r.json].filter(Boolean)) sizes.push({ context: `${tag} ${x.leaf.id} ${x.leaf.w} x ${x.leaf.h} x ${x.leaf.t} ${style} reference`, file: n, bytes: z.bytes[n] });
      sizes.push({ context: `${tag} ${x.leaf.id} ${style} reference: the three files`, file: '(total)', bytes: x.r.total });
      check(`${tag} ${style}: ${x.leaf.id}'s three reference files at the default level are under the F3 target (${leafTarget} bytes)`,
        x.r.under, `DXF ${x.r.dxf ? z.bytes[x.r.dxf] : 0} + STL ${x.r.stl ? z.bytes[x.r.stl] : 0} + JSON ${x.r.json ? z.bytes[x.r.json] : 0} = ${x.r.total} bytes (${mb(x.r.total)}), ${x.r.total < leafTarget ? `${leafTarget - x.r.total} under` : `${x.r.total - leafTarget} OVER`}; the ZIP ${z.zipBytes} bytes deflated`);
    }
    note(`${tag} ${style}: every file in the ZIP and its bytes`, z.names.map((n) => `${n} ${z.bytes[n]}`).join(', '));
    // FULL RESOLUTION, CHOSEN WITH THE REAL SELECT.
    if (full) {
      const zf = await cncZip(page, unitId, { level: 'full' });
      const fr = u.leaves.map((l) => ({ leaf: l, r: leafReference(zf, u.num, l, { level: 'full', target: leafTarget }) }));
      check(`${tag} ${style}: "Full resolution" chosen in the CNC panel's select by a real click, the arrows and Enter: the JSON says level "full" (sampleMm ${target.fullSampleMm}), front-operations.json says so too`,
        zf.chose && zf.chose.ok && zf.levelAt && zf.levelAt.value === 'full'
          && fr.every((x) => x.r.spec && x.r.spec.reference && x.r.spec.reference.level === 'full' && x.r.spec.reference.sampleMm === target.fullSampleMm && x.r.listedOk && x.r.stlInfo && x.r.stlInfo.binary),
        `select ${zf.levelBefore && zf.levelBefore.value} -> ${zf.levelAt && zf.levelAt.value}; ${fr.map((x) => `${x.leaf.id}: ${x.r.spec && x.r.spec.reference ? `level ${x.r.spec.reference.level}, sampleMm ${x.r.spec.reference.sampleMm}` : 'no JSON'}, STL ${x.r.stlInfo ? `${x.r.stlInfo.count} triangles` : 'none'}; DXF ${x.r.dxf ? zf.bytes[x.r.dxf] : 0} + STL ${x.r.stl ? zf.bytes[x.r.stl] : 0} + JSON ${x.r.json ? zf.bytes[x.r.json] : 0} = ${x.r.total} bytes (${mb(x.r.total)})`).join('; ')}; ZIP ${zf.zipBytes} bytes`);
      for (const x of fr) {
        for (const n of [x.r.dxf, x.r.stl, x.r.json].filter(Boolean)) sizes.push({ context: `${tag} ${x.leaf.id} ${x.leaf.w} x ${x.leaf.h} x ${x.leaf.t} ${style} full`, file: n, bytes: zf.bytes[n] });
        sizes.push({ context: `${tag} ${x.leaf.id} ${style} full: the three files`, file: '(total)', bytes: x.r.total });
      }
      // And back to the default, by the same select.
      await viewMode(page, 'CNC sheet');
      const back = await choose(page, LEVEL, 'reference');
      const lv = await levelNow(page);
      check(`${tag} ${style}: the select set back to "Reference (default)" by a real click, the arrows and Enter`, back.ok && lv && lv.value === 'reference', j(lv));
      await viewMode(page, '3D');
    }
    // OUTPUT > CNC / DXF: the selected unit's ZIP, the same reference files.
    if (outputMenu && style === STYLES[0]) {
      await selectUnit(page, unitId);
      const dir = await downloadsTo(page);
      const file = await captureDownload(dir, () => menu(page, 'Output', 'CNC / DXF'), page);
      const zo = await readZip(file);
      const ro = u.leaves.map((l) => ({ leaf: l, r: leafReference(zo, u.num, l, { level: 'reference', target: leafTarget }) }));
      check(`${tag} ${style}: Output, CNC / DXF (the menu, the selected unit) writes the same package: the back DXF, the reference folder at "reference", READINESS.txt, front-operations.json`,
        file && ro.every((x) => x.r.dxf && x.r.stl && x.r.json && x.r.spec.reference.level === 'reference' && x.r.listedOk) && zo.readinessName && zo.manifest
          && leafIds.every((id) => zo.names.some((n) => n === `${id}.dxf` || n.endsWith(`-${id}.dxf`))),
        `${file ? file.split('/').pop() : 'no download'}: ${zo.names.map((n) => `${n} ${zo.bytes[n]}`).join(', ')}`);
      await closeCheck(page);
      await dismissReds(page);
    }
    // THE T71 DRAWING SET.
    const d = await drawingSet(page, `${prefix}-${style}-drawing.png`, leafIds);
    const wantN = u.leaves.reduce((s, l) => s + (l.deco ? l.deco.pointCounts.length : 0), 0);
    const wantPts = u.leaves.flatMap((l) => (l.deco ? l.deco.pointCounts : []));
    check(`${tag} ${style}: the T71 drawing set draws the relief on the elevation (Output, Drawings, Preview, Set, the wall's Front view): the boundary, the four profile contours and every ornament contour, point for point`,
      !d.failed && d.total === wantN && wantN > 0 && sameMultiset(d.pointCounts, wantPts),
      `sheets ${d.sheets.length}; ${Object.entries(d.counts).map(([n, c]) => `"${n}" ${c} front-decoration entities`).join('; ')}; the leaves carry ${wantN} (${u.leaves.map((l) => `${l.id}: 1 boundary + ${l.deco ? l.deco.profile : 0} profile + ${l.deco ? l.deco.ornamentContours : 0} ornament`).join('; ')}); points per path ${sameMultiset(d.pointCounts, wantPts) ? 'the same as the record' : 'DIFFER from the record'}`);
    check(`${tag} ${style}: the set's cut list prints each leaf on its actual board (t${leaves[0].t}), never the board of the drawing (18)`,
      leafIds.every((id) => { const r = d.rows[id]; const l = leaves.find((x) => x.id === id); return r && r.includes(`t${l.t}`) && (l.t === 18 || !r.includes('t18')); }),
      leafIds.map((id) => `${id}: ${j(d.rows[id])}`).join('; '));
    await selectUnit(page, unitId);
  }
  return leafIds;
}

/** One PRO cabinet walked through the four styles, its page opened and closed. */
async function proCabinet({ title, section, add, label, type, tag, prefix, full, outputMenu }) {
  begin(section, title);
  const page = await open();
  try {
    await pro(page);
    note('build', `${await stamp(page)}; ${BASE}`);
    note('the stage: dimension figures hidden by the toolbar\'s own HIDE DIMENSIONS, so a frame shows the board', String(await hideDimensions(page)));
    const U = await addFromLibrary(page, add);
    check(label, U.ok && U.unit && U.unit.type === type, j(U.unit));
    if (U.unit) {
      const doors = await addDoors(page, U.unit.id);
      const u = await unitNow(page, U.unit.id);
      check('the cabinet has its leaves (DOORS, Add doors, when it came without)', u.leaves.length > 0, `${doors}; leaves ${u.leaves.map((l) => `${l.id} ${l.w} x ${l.h} x ${l.t}`).join(', ')}`);
      if (u.leaves.length) {
        await fourStyles(page, {
          tag, unitId: U.unit.id, prefix, full, outputMenu,
        });
      }
    }
  } catch (e) {
    check(`${section} walked to its end`, false, String(e && e.stack ? e.stack.split('\n').slice(0, 4).join(' ') : e));
    await shot(page, `${prefix}-failure.png`).catch(() => {});
  }
  const errs = pageErrors(page);
  // GPT's walk's own reading, kept: the page threw nothing and said no error.
  check('no runtime exception and no console error on the page', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

if (runs('f01')) {
  await proCabinet({
    title: 'PRO, A BASE UNIT: ORNATE_A_1 .. 4 BY THE REAL SELECT',
    section: 'f01',
    add: { category: 'Kitchen', path: ['base-units'], entry: 'door-base' },
    label: 'Library, Kitchen, Base units, Standard: a BUD in the room',
    type: 'BUD',
    tag: 'base',
    prefix: 'f01-base',
    full: true,
    outputMenu: true,
  });
}
if (runs('f02')) {
  await proCabinet({
    title: 'PRO, A WARDROBE: ORNATE_A_1 .. 4 BY THE REAL SELECT',
    section: 'f02',
    add: { category: 'Wardrobes', path: [], entry: 'WARDROBE' },
    label: 'Library, Wardrobes, Wardrobe: a WARDROBE in the room',
    type: 'WARDROBE',
    tag: 'wardrobe',
    prefix: 'f02-wardrobe',
    full: false,
    outputMenu: false,
  });
}

// === F03 · PRO, THE L OF T75 WITH ORNATE_A_2 ================================
if (runs('f03')) {
  begin('f03', 'PRO, THE L OF T75: A CORNER_L_BASE WITH ORNATE_A_2');
  const page = await open();
  try {
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
      check('DOORS, Add doors: the L\'s two leaves, door A and door B', A0 && B0, `${doors}; ${u0.leaves.map((l) => `${l.id} ${l.w} x ${l.h} x ${l.t}`).join(', ')}`);
      if (A0 && B0) {
        const leafIds = [A0.id, B0.id];
        const sel = await setStyle(page, id, 'ORNATE_A_2', leafIds);
        const u = await unitNow(page, id);
        const m = await meshesOf(page, id, leafIds);
        const A = u.leaves.find((l) => l.id === A0.id);
        const B = u.leaves.find((l) => l.id === B0.id);
        check('"Ornate A - Symmetric" chosen in the L\'s Front type select by a real click, the arrows and Enter: BOTH leaves carry the relief, ready',
          sel.ok && sel.after.value === 'ORNATE_A_2' && [A, B].every((l) => l.deco && l.deco.style === 'ORNATE_A_2' && l.deco.status === 'ready' && l.deco.ops === 1),
          `${[A, B].map((l) => `${l.id} ${l.w} x ${l.h} x ${l.t}: ${l.deco ? `${l.deco.style} ${l.deco.status}, ${l.deco.vertices} vertices, ${l.deco.profile} profile + ${l.deco.ornamentContours} ornament contours${l.deco.problems.length ? `; ${l.deco.problems.join(' / ')}` : ''}` : 'none'}`).join('; ')}`);
        check('both leaves\' solids show the relief (the scene\'s geometry carries ORNATE_A_2)', leafIds.every((x) => m[x] && m[x].style === 'ORNATE_A_2'),
          leafIds.map((x) => `${x}: ${m[x] ? `${m[x].vertices} vertices, ${m[x].style}` : 'no mesh'}`).join('; '));
        // What the L's own panel SAYS (UnitWarnings, the Carcass section the
        // select stands in): the lines the joiner reads, read off the page.
        const panelWords = await page.ask('[...document.querySelectorAll(\'[data-warning-code]\')].filter((e) => e.offsetParent).map((e) => ({ code: e.getAttribute(\'data-warning-code\'), text: e.textContent.replace(/\\s+/g, \' \').trim() }))');
        const opensLine = panelWords.filter((w) => w.code === 'CORNER_L_OPENS_FIRST' && /door B opens first/.test(w.text));
        check('door B still "opens first": the L\'s own panel says it in words (UnitWarnings), and the leaf and the unit carry it',
          opensLine.length === 1 && B.opensFirst && B.note === 'door B opens first' && u.warnings.some((w) => /door B opens first/.test(w.message)),
          `the panel: ${opensLine.map((w) => j(w.text)).join(' | ') || 'no such line'}; B opensFirst ${B.opensFirst}, note ${j(B.note)}; the unit: ${u.warnings.filter((w) => /opens first/.test(w.message)).map((w) => w.message).join(' | ')}`);
        // Each line once: the panel is read by a person, and a sentence said
        // twice is a fault the eye sees (the L's leaves are decorated by the
        // arm's own parent AND by the L's pass; both say their findings).
        const times = {};
        for (const w of panelWords) times[`${w.code} · ${w.text}`] = (times[`${w.code} · ${w.text}`] || 0) + 1;
        const twice = Object.entries(times).filter(([, n]) => n > 1);
        check('the L\'s own panel says each line once (no Ornate finding listed twice for a leaf)', panelWords.length > 0 && twice.length === 0,
          twice.length ? `${panelWords.length} lines on the panel; said more than once: ${twice.map(([t, n]) => `${n} x ${t.slice(0, 90)}`).join(' | ')}` : `${panelWords.length} lines, each once: ${panelWords.map((w) => w.code).join(', ')}`);
        await shot(page, 'f03-corner-l-ornate-a-2.png');
        const top = (await page.ask(`${S}.unitResult(${j(id)}).panels.filter((p) => p.role === 'top').map((p) => p.id)`))[0];
        const flown = top ? await focusPiece(page, id, top) : null;
        const seen = await turnToSee(page, id, leafIds);
        await closeIn(page, id, leafIds, { fillH: 0.5, fillW: 0.5 });
        note('the camera: a 2klik on the L\'s top board flies it there, real drags on the floor turn it into the corner', `2klik at ${flown ? `${flown.x},${flown.y} on ${top}` : 'none'}; turned ${seen.turned} px; pixels a hand could touch on A and B: ${seen.sight.join(' and ')}`);
        await leafFrame(page, id, leafIds, 'f03-corner-l-leaves.png');
        const rows = await bomRead(page, 'f03-corner-l-bom.png');
        const lr = leafIds.map((x) => rows.find((r) => r.id === x));
        check(`the cut list names both leaves "${SENTENCE('ORNATE_A_2')}", State Cut`, lr.every((r) => r && r.construction === SENTENCE('ORNATE_A_2') && r.state === 'Cut'),
          lr.map((r) => (r ? `${r.id}: "${r.construction}" ${r.state}` : 'missing')).join('; '));
        const opens = rows.filter((r) => /opens first/i.test(`${r.id} ${r.construction || ''} ${r.material || ''} ${r.head || ''}`));
        note('the BOM panel\'s Parts rows and door B', opens.length ? opens.map((r) => j(r)).join(' | ') : 'no Parts row carries "opens first"; the line rides the unit\'s warnings (read above), as T76 read it');
        await bomClose(page);
        const z = await cncZip(page, id);
        const refs = u.leaves.map((l) => ({ leaf: l, r: leafReference(z, u.num, l) }));
        check('the L\'s CNC ZIP: a back DXF for each leaf, each leaf\'s three reference files, READINESS.txt and front-operations.json with both parts',
          leafIds.every((x) => z.names.some((n) => n.endsWith(`${x}.dxf`))) && refs.every((x) => x.r.dxf && x.r.stl && x.r.json && x.r.stlInfo.binary && x.r.listedOk)
            && z.readinessName && z.manifest && z.manifest.parts.filter((p) => leafIds.includes(p.panelId)).length === 2,
          `${z.names.map((n) => `${n} ${z.bytes[n]}`).join(', ')}`);
        for (const x of refs) {
          for (const n of [x.r.dxf, x.r.stl, x.r.json].filter(Boolean)) sizes.push({ context: `the L ${x.leaf.id} ${x.leaf.w} x ${x.leaf.h} x ${x.leaf.t} ORNATE_A_2 reference`, file: n, bytes: z.bytes[n] });
          check(`${x.leaf.id}'s three reference files at the default level are under the F3 target (4000000 bytes)`, x.r.under, `${x.r.total} bytes (${mb(x.r.total)})`);
        }
        const d = await drawingSet(page, 'f03-corner-l-drawing.png', leafIds);
        const wantN = u.leaves.reduce((s, l) => s + (l.deco ? l.deco.pointCounts.length : 0), 0);
        check('the drawing set draws both leaves\' relief contours on the elevations', d.total === wantN && wantN > 0,
          `${Object.entries(d.counts).map(([n, c]) => `"${n}" ${c}`).join('; ')}; the two leaves carry ${wantN}`);
      }
    }
  } catch (e) {
    check('f03 walked to its end', false, String(e && e.stack ? e.stack.split('\n').slice(0, 4).join(' ') : e));
  }
  const errs = pageErrors(page);
  // GPT's walk's own reading, kept: the page threw nothing and said no error.
  check('no runtime exception and no console error on the page', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// === F04 · PRO, REFUSALS: A 250 x 400 LEAF; A 12 MM BOARD ==================
/** The Check panel opened by its own toolbar button: every finding's number, level and words. */
async function checkFindings(page, file = null) {
  if (!(await page.has('[data-check-panel]'))) await page.press('[data-check-button]');
  await until(page, 'Boolean(document.querySelector(\'[data-check-panel]\'))', 4000);
  await page.sleep(500);
  const all = await page.ask('[...document.querySelectorAll(\'[data-check-finding]\')].map((e) => ({ check: e.getAttribute(\'data-check-finding\'), level: e.getAttribute(\'data-check-level\'), text: e.textContent.replace(/\\s+/g, \' \').trim() }))');
  if (file) await elementFrame(page, 'document.querySelector(\'[data-check-panel]\')', file);
  await closeCheck(page);
  return all;
}
if (runs('f04')) {
  begin('f04', 'PRO, REFUSALS IN WORDS: A 250 x 400 LEAF, A 12 MM BOARD');
  const page = await open();
  try {
    await pro(page);
    note('build', `${await stamp(page)}; ${BASE}`);
    await hideDimensions(page);
    // (a) A 250 x 400 LEAF WITH ORNATE_A_1.
    const B = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'door-base' });
    check('Library, Kitchen, Base units, Standard: a BUD', B.ok && B.unit && B.unit.type === 'BUD', j(B.unit));
    if (B.unit) {
      const id = B.unit.id;
      await addDoors(page, id);
      await selectUnit(page, id);
      await sectionOpen(page, 'Carcass');
      // The leaf is the cabinet less its gaps: the width and the height are
      // typed (a real click, Ctrl+A, the digits, Enter) and the leaf read, and
      // typed once more by the difference when it is not yet 250 x 400.
      let u = await unitNow(page, id);
      const typed = [];
      for (const [field, wantLeaf, of] of [['width', 250, 'w'], ['height', 400, 'h']]) {
        let ask = wantLeaf + ((u[of] || 0) - ((u.leaves[0] || {})[of] || 0));
        for (let k = 0; k < 3; k += 1) {
          const t = await typeInto(page, `[data-unit-size-field="${field}"]`, ask);
          u = await unitNow(page, id);
          typed.push(`${field} ${ask} (field ${t.shown}) -> leaf ${u.leaves[0] && u.leaves[0][of]}`);
          const got = u.leaves[0] && u.leaves[0][of];
          if (got === wantLeaf || !got) break;
          ask += wantLeaf - got;
        }
      }
      const leaf0 = u.leaves[0];
      check('the cabinet sized by its own Width and Height fields (typed, never written): its leaf is 250 x 400',
        leaf0 && leaf0.w === 250 && leaf0.h === 400, `${typed.join('; ')}; unit ${u.w} x ${u.h}; leaves ${u.leaves.map((l) => `${l.id} ${l.w} x ${l.h} x ${l.t}`).join(', ')}; said ${j(await lastSaid(page, 2))}`);
      const leafIds = u.leaves.map((l) => l.id);
      const recipe = await recipeOf(page, 'ORNATE_A_1');
      const sel = await setStyle(page, id, 'ORNATE_A_1', leafIds, { built: false });
      await page.sleep(1200);
      const r = await unitNow(page, id);
      const l = r.leaves[0];
      check('"Ornate A - Classic" by the real select on the 250 x 400 leaf: refused in words (the radii do not fit), status blocked, no relief operation',
        sel.ok && sel.after.value === 'ORNATE_A_1' && l.deco && l.deco.status === 'blocked' && l.deco.ops === 0
          && l.deco.codes.some((c) => c === 'ORNATE_RADIUS_FIT' || c === 'ORNATE_TOO_SMALL'),
        `${l.id} ${l.w} x ${l.h}: ${l.deco ? `${l.deco.status}, ${l.deco.ops} ops; ${l.deco.problems.join(' / ')}` : 'none'}`);
      check('nothing is squeezed: the recipe the leaf carries is the profile\'s own (R150, frames 60 and 60), not a radius made to fit',
        l.deco && l.deco.innerRadiusMm === recipe.innerRadiusMm && r.stored && r.stored.innerRadiusMm === recipe.innerRadiusMm && r.stored.outerFrameMm === recipe.outerFrameMm,
        `record innerRadiusMm ${l.deco && l.deco.innerRadiusMm}; stored ${r.stored && `${r.stored.innerRadiusMm}, frames ${r.stored.outerFrameMm} / ${r.stored.innerFrameMm}`}; profile ${recipe.innerRadiusMm}`);
      const m = await meshesOf(page, id, leafIds);
      check('the scene draws the leaf as a plain slab (no relief, no squashed relief)', leafIds.every((x) => m[x] && !m[x].style), j(m));
      const words = await page.ask('[...document.querySelectorAll(\'[data-warning-code]\')].filter((e) => e.offsetParent).map((e) => e.getAttribute(\'data-warning-code\') + \': \' + e.textContent.replace(/\\s+/g, \' \').trim())');
      check('the unit\'s own panel says it, in words (UnitWarnings)', words.some((w) => /radii do not fit|leave no inner panel/.test(w)), j(words));
      await shot(page, 'f04-250x400-refused.png');
      await closeIn(page, id, leafIds, { fillH: 0.5, fillW: 0.3 });
      await leafFrame(page, id, leafIds, 'f04-250x400-leaf.png');
      const c9 = await checkFindings(page, 'f04-250x400-check.png');
      const mine = c9.filter((f) => f.text.includes(l.id) && /radii do not fit|leave no inner panel/.test(f.text));
      check('the Check (its toolbar button) names the refused leaf and why', mine.length > 0, j(mine.length ? mine : c9.slice(0, 4)));
      const rows = await bomRead(page, null);
      const row = rows.find((x) => x.id === l.id);
      // F6: every leaf that carries the style names its ornament in the BOM
      // sentence, a refused one too (the slab is cut; the refusal is the Check's).
      check(`the refused leaf's cut list line names its ornament: "${SENTENCE('ORNATE_A_1')}", State Cut (the slab is cut; the refusal is the Check's)`,
        row && row.construction === SENTENCE('ORNATE_A_1') && row.state === 'Cut', row ? `${row.id} "${row.construction}" ${row.w} x ${row.h}, State ${row.state}` : 'no row');
      await bomClose(page);

      // (b) A 12 MM BOARD WITH THE DEFAULT RECIPE (F4's Check). The leaf is
      // grown back to a size the recipe fits, so the board is the only fault.
      await selectUnit(page, id);
      await sectionOpen(page, 'Carcass');
      await typeInto(page, '[data-unit-size-field="width"]', 600);
      await typeInto(page, '[data-unit-size-field="height"]', 770);
      for (let t = 0; t < 40; t += 1) {
        const mm = await meshesOf(page, id, leafIds);
        if (mm && leafIds.every((x) => mm[x] && mm[x].style === 'ORNATE_A_1')) break;
        await page.sleep(300);
      }
      const ok25 = await unitNow(page, id);
      check('the same cabinet typed back to 600 x 770: the leaf carries ORNATE_A_1, ready, on its 25 mm board (and the Check is silent about the board)',
        ok25.leaves.every((x) => x.deco && x.deco.status === 'ready' && x.t === 25), ok25.leaves.map((x) => `${x.id} ${x.w} x ${x.h} x ${x.t}: ${x.deco && x.deco.status}`).join('; '));
      const silent = (await checkFindings(page)).filter((f) => /cuts 12 mm|needs a board of at least/.test(f.text));
      check('a 25 mm board is silently fine: no board finding in the Check', silent.length === 0, j(silent));
      // The board: Settings, Settings..., the Production step, Front 1's measured thickness typed 12.
      await menu(page, 'Settings', 'Settings');
      await until(page, 'window.__cc.ui.getState().modal === \'design\'', 6000);
      if (await page.has('[data-wizard-tab="production"]')) await page.press('[data-wizard-tab="production"]');
      await until(page, 'Boolean(document.querySelector(\'[data-slot-measured="front1"]\'))', 6000);
      const slot0 = await page.ask('(() => { const e = document.querySelector(\'[data-slot-measured="front1"]\'); const li = e && e.closest(\'[data-material-block]\'); return e ? { value: e.value, title: li ? (li.querySelector(\'[data-material-block-title]\') || {}).textContent : null, nominal: (document.querySelector(\'[data-slot-nominal="front1"]\') || {}).textContent } : null; })()');
      const t12 = slot0 ? await typeInto(page, '[data-slot-measured="front1"]', 12) : { ok: false };
      const gate = await page.has('[data-slot-thickness-gate="1"]');
      if (gate) await page.press('[data-slot-thickness-gate="1"] button');
      await elementFrame(page, 'document.querySelector(\'[data-settings-section="thickness"]\')', 'f04-board-12-settings.png', { maxH: 700 });
      note('the road to a 12 mm board: Settings, Settings..., Production, "Measurements, per material", Front 1\'s Measured field (the caliper of the board the doors are cut from; T24 F3)',
        `before ${j(slot0)}; typed ${j(t12.shown)}; identity gate asked ${gate}. The unit's Front (mm) select offers only the profile's ${j(await page.ask(`${PROFILE}.front.thicknessOptions`))}; the front boards on the materials list are ${j(await page.ask('(window.__cc.materials.getState().materials || []).filter((m) => m.category === \'front\').map((m) => m.name + \' \' + m.thickness)'))}. A 12 mm front board could also be added to the list (Database, Materials) and assigned in Settings; this walk takes the caliper, the shorter road the app offers to a 12 mm front`);
      const closeX = await boxOf(page, '[...document.querySelectorAll(\'[data-modal-name="design"] button\')].find((b) => b.textContent.trim() === \'×\' || b.getAttribute(\'aria-label\') === \'Close\' || b.getAttribute(\'title\') === \'Close\')');
      if (closeX) await clickWith(page, closeX.x, closeX.y);
      else await key(page, 'Escape');
      await page.sleep(1200);
      const b12 = await unitNow(page, id);
      const l12 = b12.leaves[0];
      const sentence = 'ORNATE_A_1 cuts 12 mm into the face and must leave 3 mm under it: it needs a board of at least 15 mm, and this one is 12 mm.';
      check('Front 1 measured at 12: the leaf is 12 mm and the relief is refused (FRONT_DECORATION_BOARD_TOO_THIN), no relief operation',
        l12 && l12.t === 12 && l12.deco && l12.deco.status === 'blocked' && l12.deco.ops === 0 && l12.deco.codes.includes('FRONT_DECORATION_BOARD_TOO_THIN'),
        `${l12 ? `${l12.id} ${l12.w} x ${l12.h} x ${l12.t}: ${l12.deco ? `${l12.deco.status}; ${l12.deco.problems.join(' / ')}` : 'none'}` : 'no leaf'}`);
      const m12 = await meshesOf(page, id, leafIds);
      check('…and the scene draws the leaf plain', leafIds.every((x) => m12[x] && !m12[x].style), j(m12));
      const f12 = await checkFindings(page, 'f04-board-12-check.png');
      const said12 = f12.filter((f) => f.text.includes(sentence));
      check('F4\'s Check speaks, red, in words, naming the leaf and the number: "ORNATE_A_1 cuts 12 mm into the face and must leave 3 mm under it: it needs a board of at least 15 mm, and this one is 12 mm."',
        said12.length > 0 && said12.every((f) => f.level === 'red' && f.text.includes(l12.id)), j(said12.length ? said12 : f12.slice(0, 4)));
      note('every finding the Check lists with the 12 mm fronts', f12.map((f) => `#${f.check} ${f.level}: ${f.text}`).join(' | '));
      await selectUnit(page, id);
      await sectionOpen(page, 'Carcass');
      const words12 = await page.ask('[...document.querySelectorAll(\'[data-warning-code]\')].filter((e) => e.offsetParent).map((e) => e.getAttribute(\'data-warning-code\') + \': \' + e.textContent.replace(/\\s+/g, \' \').trim())');
      note('the unit\'s own panel', j(words12));
      await shot(page, 'f04-board-12-refused.png');
      // What the CNC package carries for the refused leaf (DOWNLOAD ZIP (PER PANEL)).
      const z12 = await cncZip(page, id);
      const r12 = leafReference(z12, b12.num, l12);
      const part12 = ((z12.manifest && z12.manifest.parts) || []).find((p) => p.panelId === l12.id);
      check('the CNC ZIP of the refused 12 mm leaf ships no relief model: no reference DXF, no STL; the JSON (when written) says invalid-reference',
        z12.file && !r12.dxf && !r12.stl && (!r12.spec || r12.spec.status === 'invalid-reference'),
        `${z12.names.map((n) => `${n} ${z12.bytes[n]}`).join(', ') || 'no file'}; JSON ${r12.spec ? `status ${r12.spec.status}, problems ${j(r12.spec.problems)}` : 'none'}`);
      note('…and what the gate and the manifest say of that leaf', `back DXF ${z12.names.some((n) => n === `${l12.id}.dxf` || n.endsWith(`-${l12.id}.dxf`)) ? 'in the ZIP' : 'held out'}; manifest ${part12 ? `status ${part12.status}, exported ${part12.exported}, readiness ${part12.readiness}` : 'no part'}; the app said ${j(z12.said)}`);
      // READINESS.txt lists what the package hands the joiner short of a cut;
      // a refused relief hands no reference model, so it has no line there.
      check('…and its READINESS.txt claims no Ornate reference for the refused leaf (no DXF, no STL shipped for it)',
        !new RegExp(`${l12.id} Ornate proposed reference`).test(z12.readiness || ''), `${z12.readinessName || 'no READINESS.txt'}: ${j(z12.readiness)}`);
    }
  } catch (e) {
    check('f04 walked to its end', false, String(e && e.stack ? e.stack.split('\n').slice(0, 4).join(' ') : e));
    await shot(page, 'f04-failure.png').catch(() => {});
  }
  const errs = pageErrors(page);
  // GPT's walk's own reading, kept: the page threw nothing and said no error.
  check('no runtime exception and no console error on the page', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// === F05 · PRO, AN OLD PROJECT: HERBAL HILL, AGAINST THE BASE BUILD =========
/** The Herbal Hill file: the T71 fixture's project and units, put on a shelf by the app's own save code. */
async function herbalHillShelf({ id }) {
  const { HH_PROJECT, HH_ROOM, hhUnits } = await import('../test/fixtures/t71-herbal-hill.js');
  const { DEFAULT_CABINET_PROFILE } = await import('../src/engine/profile.js');
  const { memoryStorage, saveLocalProject, LIBRARY_KEY } = await import('../src/lib/projectLibrary.js');
  const shelf = memoryStorage();
  const project = { ...HH_PROJECT, id, room: HH_ROOM };
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
/** The base build, served: T77_BASE_URL, or a worktree at 405b98c built and served on 4183. */
async function baseServer() {
  if (process.env.T77_BASE_URL) return { url: process.env.T77_BASE_URL, how: 'T77_BASE_URL', close: async () => {} };
  const dir = join(TMP, 'base-worktree');
  if (!existsSync(join(dir, 'package.json'))) execFileSync('git', ['worktree', 'add', '--detach', dir, BASE_SHA], { cwd: REPO, stdio: 'ignore' });
  if (!existsSync(join(dir, 'node_modules'))) symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'));
  if (!existsSync(join(dir, 'dist', 'index.html'))) execFileSync('npm', ['run', 'build'], { cwd: dir, stdio: 'ignore' });
  const proc = spawn(process.execPath, [join(dir, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', '4183', '--strictPort', '--host', '127.0.0.1'], { cwd: dir, stdio: 'ignore' });
  const url = 'http://127.0.0.1:4183/';
  for (let i = 0; i < 80; i += 1) {
    if (await fetch(`${url}index.html`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => { setTimeout(r, 250); });
  }
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: dir }).toString().trim();
  return {
    url,
    how: `a detached worktree at ${sha} in T77_WALK_TMP, node_modules linked, npm run build, served on 4183`,
    close: async () => {
      proc.kill('SIGKILL');
      if (!process.env.T77_KEEP_BASE) {
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
  const state = opened ? await page.ask(`(() => { const P = ${S}; let decorated = 0; let ornate = 0; const leaves = [];
    for (const u of P.units) for (const p of P.unitResult(u.id).panels) { const d = p.meta && p.meta.frontDecoration; if (d || (p.meta && p.meta.frontDecorationParent)) decorated += 1; if (d && /^ORNATE_/.test(d.style || '')) ornate += 1; if (p.role === 'front') leaves.push(p.id); }
    return { name: P.project.name, units: P.units.length, style: (P.project.design && P.project.design.fronts && P.project.design.fronts.style) || null,
      decoration: (P.project.design && P.project.design.fronts && P.project.design.fronts.decoration) || null, decorated, ornate, leaves: leaves.length,
      unitRecipes: P.units.filter((u) => u.params.front_decoration).length }; })()`) : null;
  const meshes = opened ? await decoratedMeshes(page) : null;
  const build = await stamp(page);
  if (frame) await shot(page, frame);
  const csv = opened ? await cutListFile(page) : null;
  const bom = opened ? await bomCsvFile(page) : null;
  const errs = pageErrors(page);
  await page.close();
  return {
    opened, state, meshes, build, csv, bom, errs,
  };
}

if (runs('f05')) {
  begin('f05', 'PRO, AN OLD PROJECT: HERBAL HILL OPENED, NO RELIEF, THE CUT LIST BYTE FOR BYTE');
  let srv = null;
  try {
    const shelfHH = await herbalHillShelf({ id: 'loc_t77hh' });
    writeFileSync(join(TMP, 'herbal-hill.cc-library.v1.json'), shelfHH.json);
    note('the file: the T71 fixture (test/fixtures/t71-herbal-hill.js hhUnits, HH_PROJECT, HH_ROOM) saved by lib/projectLibrary.js saveLocalProject, the shelf PRO opens from',
      `T77_WALK_TMP/herbal-hill.cc-library.v1.json, ${shelfHH.json.length} bytes; PRO has no file-open control, so the file is put on the browser's shelf (localStorage ${shelfHH.key}) and opened from All projects by a real click`);
    const here = await herbalHillOn(BASE, shelfHH, 'f05-herbal-hill.png');
    check('this build: All projects, a real click on "3-7 Herbal Hill, 1st floor": the job opens, 13 units',
      here.opened && here.state && here.state.units === 13, `${here.build}; ${j(here.state)}`);
    check('no relief appears: no Ornate (or other decorated) panel in any unit, no decorated solid in the scene, no recipe anywhere',
      here.state && here.state.decorated === 0 && here.state.ornate === 0 && here.meshes && here.meshes.length === 0 && !here.state.decoration && here.state.unitRecipes === 0,
      `decorated panels ${here.state && here.state.decorated} (Ornate ${here.state && here.state.ornate}) of ${here.state && here.state.leaves} fronts; decorated meshes ${j(here.meshes)}; project recipe ${j(here.state && here.state.decoration)}`);
    srv = await baseServer();
    note('the base build', `${srv.how}; ${srv.url}`);
    const base = await herbalHillOn(srv.url, shelfHH, 'f05-herbal-hill-base.png');
    check(`the base build (${BASE_SHA}, the code of 2766045): the same file opened the same way, 13 units`, base.opened && base.state && base.state.units === 13, `${base.build}; ${j(base.state)}`);
    check('Output, Cutting list CSV: the cut list this build writes is byte for byte the base build\'s',
      here.csv && base.csv && Buffer.compare(here.csv.bytes, base.csv.bytes) === 0,
      `here ${here.csv && here.csv.bytes.length} bytes, ${here.csv && here.csv.bytes.toString('utf8').split(/\r\n/).filter(Boolean).length} lines; base ${base.csv && base.csv.bytes.length} bytes${here.csv && base.csv && Buffer.compare(here.csv.bytes, base.csv.bytes) ? `; differs: ${diffLines(base.csv.bytes, here.csv.bytes).join(' | ')}` : ''}`);
    check('…and the BOM panel\'s BOM CSV too (every line, every state), byte for byte',
      here.bom && base.bom && Buffer.compare(here.bom.bytes, base.bom.bytes) === 0,
      `here ${here.bom && here.bom.bytes.length} bytes; base ${base.bom && base.bom.bytes.length} bytes${here.bom && base.bom && Buffer.compare(here.bom.bytes, base.bom.bytes) ? `; differs: ${diffLines(base.bom.bytes, here.bom.bytes).join(' | ')}` : ''}`);
    check('no runtime exception and no console error on this build\'s page', here.errs.length === 0, here.errs.length ? here.errs.slice(0, 3).join(' | ') : 'none');
    if (base.errs.length) note(`console errors on ${base.build}`, base.errs.slice(0, 3).join(' | '));
  } catch (e) {
    check('the base build served and walked', false, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
  } finally {
    if (srv) await srv.close();
    const left = execFileSync('git', ['worktree', 'list'], { cwd: REPO }).toString().split('\n').filter(Boolean);
    note('worktrees after the section (the base one removed)', left.join(' | '));
  }
}

// === F06 · RETAIL: THE FRONTS STEP, THE FOUR ORNATE TILES ===================
/** The leaves of the retail wardrobe as a round trip must keep them. */
const retailLeaves = (page) => page.ask(`(() => { const P = ${S}; const u = P.units[0]; if (!u) return null; const r = P.unitResult(u.id);
  return JSON.stringify({ style: (P.project.design && P.project.design.fronts && P.project.design.fronts.style) || null,
    decoration: (P.project.design && P.project.design.fronts && P.project.design.fronts.decoration) || null,
    leaves: r.panels.filter((p) => p.role === 'front' && !(p.meta && p.meta.frontDecorationParent)).map((p) => { const d = p.meta && p.meta.frontDecoration; const op = d && d.operations[0];
      return { id: p.id, w: p.w, h: p.h, t: p.thickness, style: d ? d.style : null, status: d ? d.status : null, mirror: d ? d.parameters.mirror : null, ornament: d ? d.ornament : null,
        vertices: op && op.surface ? op.surface.vertices.length : 0, triangles: op && op.surface ? op.surface.triangles.length : 0, contours: op ? op.contours.length : 0 }; }) }); })()`);
if (runs('f06')) {
  begin('f06', 'RETAIL: THE FOUR ORNATE TILES, A CLICK CHANGES THE LEAF, NO NUMBER TO TYPE, MY ESTIMATE, SAVE AND RELOAD');
  const page = await open();
  try {
    await room(page);
    note('build', `${await stamp(page) || '(retail wears no stamp)'}; ${BASE}retail.html`);
    await withWardrobe(page);
    const [w] = await unitsNow(page);
    check('a wardrobe, through WHERE\'s own button', w && w.type === 'WARDROBE', j(w));
    await page.press('[data-testid="cat-fronts"]');
    if (w && !(await page.ask(`Boolean(${S}.units[0] && ${S}.units[0].params.doors)`))) await page.press('[data-testid="fronts-add-doors"]');
    const tiles = await page.ask('[...document.querySelectorAll(\'[data-testid^="fronts-style-"]\')].map((b) => b.getAttribute(\'data-testid\').replace(\'fronts-style-\', \'\')).filter((t) => /^[A-Z_0-9]+$/.test(t))');
    note('the FRONTS step\'s tiles, in its own order', tiles.join(', '));
    const { ORNATE_FRONT_ART } = await import('../src/engine/ornateFrontArt.js');
    const art = await page.ask(`Object.fromEntries(${j(ORNATE)}.map((s) => { const b = document.querySelector('[data-testid="fronts-style-' + s + '"]'); const svg = b && b.querySelector('svg');
      return [s, b ? { label: (b.querySelector('.pbi-style-name') || {}).textContent, disabled: b.disabled, refused: b.getAttribute('data-refused'), soon: b.getAttribute('data-soon'),
        art: svg ? svg.getAttribute('data-style-art') : null, paths: svg ? [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d')) : [], rects: svg ? svg.querySelectorAll('rect').length : 0 } : null]; }))`);
    const artOk = (s) => {
      const a = art[s]; const src = ORNATE_FRONT_ART[s] || [];
      return a && a.art === s && j(a.paths) === j(src.filter((bit) => bit.path).map((bit) => bit.path)) && a.rects === src.filter((bit) => bit.rect).length;
    };
    check('the four Ornate tiles stand on the step, live (not refused, not "soon"), each drawn from ornateFrontArt.js (its paths, one for one)',
      ORNATE.every((s) => tiles.includes(s) && art[s] && !art[s].disabled && art[s].refused === 'no' && artOk(s)),
      ORNATE.map((s) => `${s} "${art[s] && art[s].label}": ${art[s] ? `${art[s].paths.length} paths + ${art[s].rects} rects, the art's own ${artOk(s)}, disabled ${art[s].disabled}` : 'missing'}`).join('; '));
    // The frame shows the four tiles: the step is wheeled (a real wheel over
    // its list) until the last Ornate tile clears the BACK / NEXT bar.
    const where = () => page.ask(`(() => { const e = document.querySelector('[data-testid="fronts-style-ORNATE_A_4"]'); const p = document.querySelector('[data-testid="panel-fronts"]'); if (!e || !p) return null;
      const b = e.getBoundingClientRect(); const q = p.getBoundingClientRect(); const foot = [...document.querySelectorAll('button')].find((x) => /NEXT/.test(x.textContent) && x.offsetParent);
      const limit = foot ? foot.getBoundingClientRect().top - 24 : window.innerHeight - 120;
      return { bottom: b.bottom, limit, x: Math.round(q.left + q.width / 2), y: 420, left: q.left, width: q.width }; })()`);
    for (let k = 0, at = await where(); k < 4 && at && at.bottom > at.limit; k += 1, at = await where()) {
      await page.wheel(at.x, at.y, Math.min(600, Math.ceil(at.bottom - at.limit + 40)), 1);
    }
    const tilesAt = await where();
    if (tilesAt) {
      await shot(page, 'f06-retail-tiles.png', {
        x: 0, y: 0, width: Math.round(tilesAt.left + tilesAt.width + 8), height: 900, scale: 1,
      });
    } else await shot(page, 'f06-retail-tiles.png');
    const leafIds = (await unitNow(page, w.id)).leaves.map((l) => l.id);
    let prev = await meshesOf(page, w.id, leafIds);
    for (const style of ORNATE) {
      await page.press(`[data-testid="fronts-style-${style}"]`);
      await until(page, `(() => { const r = ${S}.unitResult(${S}.units[0].id); return r.panels.filter((p) => ${j(leafIds)}.includes(p.id)).every((p) => p.meta && p.meta.frontDecoration && p.meta.frontDecoration.style === ${j(style)}); })()`, 8000);
      const m = await meshesRebuilt(page, w.id, leafIds, prev, style);
      await page.sleep(500);
      const u = await unitNow(page, w.id);
      const recipe = await recipeOf(page, style);
      const design = await page.ask(`JSON.stringify((${S}.project.design || {}).fronts || null)`).then(JSON.parse);
      const sameRecipe = design && design.decoration && Object.keys(recipe).every((k) => j(design.decoration[k]) === j(recipe[k]));
      check(`retail ${style}: the "${art[style] && art[style].label}" tile pressed once: the owner's recipe (the profile's) on the job, every leaf ${style} and ready, the leaf's solid shows the relief`,
        design && design.style === style && sameRecipe && u.leaves.every((l) => l.deco && l.deco.style === style && l.deco.status === 'ready' && l.deco.ornament === ORNAMENT(style))
          && leafIds.every((id) => m[id] && m[id].style === style && m[id].uuid !== (prev[id] || {}).uuid),
        `design.fronts.style ${design && design.style}, recipe the profile's ${sameRecipe}; ${u.leaves.map((l) => `${l.id} ${l.w} x ${l.h} x ${l.t}: ${l.deco ? `${l.deco.style} ${l.deco.status}, ornament ${l.deco.ornament}${l.deco.problems.length ? ` (${l.deco.problems.join(' / ')})` : ''}` : 'none'}`).join(', ')}; solids ${leafIds.map((id) => `${id} ${(prev[id] || {}).vertices} -> ${(m[id] || {}).vertices} vertices (${(m[id] || {}).style})`).join(', ')}`);
      const fieldsHere = await page.ask(`({ numberInputs: document.querySelectorAll('input[type="number"]').length, recipeFields: document.querySelectorAll('[data-decoration-field]').length,
        stepInputs: [...document.querySelectorAll('[data-testid="panel-fronts"] input')].map((i) => i.getAttribute('data-testid') || i.getAttribute('aria-label') || i.type),
        line: ((document.querySelector('[data-testid="fronts-style-line"]') || {}).textContent || '').trim(),
        mirror: Boolean(document.querySelector('[data-testid="panel-fronts"] [data-ornate-mirror="${style}"]')) })`);
      check(`retail ${style}: no numeric field on the page (no input type=number, no recipe field); the step's only input is the "Mirror ornate pattern" checkbox`,
        fieldsHere.numberInputs === 0 && fieldsHere.recipeFields === 0 && fieldsHere.stepInputs.every((x) => x === 'Mirror ornate pattern') && fieldsHere.mirror, j(fieldsHere));
      // T77 F7 fixes · the walk found the sentence empty; STYLE_LINES now has one per Ornate style.
      check(`retail ${style}: the style's sentence under the list describes it (retail STYLE_LINES, Options.jsx)`,
        /moulding/.test(fieldsHere.line) && (style === 'ORNATE_A_4' ? /without the carved flowers/.test(fieldsHere.line) : /carved flower/.test(fieldsHere.line)), j(fieldsHere.line));
      await shot(page, `f06-retail-${style}.png`);
      prev = m;
    }
    // Classic again, mirrored by its checkbox, for the estimate and the round trip.
    await page.press('[data-testid="fronts-style-ORNATE_A_1"]');
    prev = await meshesRebuilt(page, w.id, leafIds, prev, 'ORNATE_A_1');
    const mAt = await boxOf(page, 'document.querySelector(\'[data-testid="panel-fronts"] [data-ornate-mirror="ORNATE_A_1"]\')');
    if (mAt) await clickWith(page, mAt.x, mAt.y);
    await until(page, `Boolean(((${S}.project.design || {}).fronts || {}).decoration && ${S}.project.design.fronts.decoration.mirror === true)`, 6000);
    const mm = await meshesRebuilt(page, w.id, leafIds, prev, 'ORNATE_A_1');
    const mir = JSON.parse(await retailLeaves(page));
    check('retail: "Ornate A - Classic" again, and "Mirror ornate pattern" ticked by a real click: the job\'s recipe and every leaf mirrored, the solid built again',
      mAt && mir.style === 'ORNATE_A_1' && mir.decoration && mir.decoration.mirror === true && mir.leaves.every((l) => l.mirror === true && l.status === 'ready')
        && leafIds.every((id) => mm[id] && mm[id].uuid !== (prev[id] || {}).uuid), j(mir));
    await shot(page, 'f06-retail-ORNATE_A_1-mirror.png');
    // MY ESTIMATE.
    await page.press('[data-testid="cat-review"]');
    const summary = await page.ask('[...document.querySelectorAll(\'[data-testid="estimate-summary"] .pbi-summary-row\')].map((r) => [...r.children].map((c) => c.textContent.trim()).join(\': \'))');
    note('REVIEW\'s summary', summary.join(' | '));
    await page.press('[data-testid="review-done"]');
    await until(page, 'Boolean(document.querySelector(\'[data-testid="estimate-row-1"]\'))', 45000);
    const rowOf = () => page.ask('[...(document.querySelector(\'[data-testid="estimate-row-1"]\') || { children: [] }).children].map((c) => c.textContent.trim()).filter(Boolean).join(\' | \')');
    const row = await rowOf();
    const label = art.ORNATE_A_1 && art.ORNATE_A_1.label;
    check(`DONE, ADD TO MY ESTIMATE: MY ESTIMATE lists the wardrobe with its style ("${label}")`, row && label && row.toUpperCase().includes(label.toUpperCase()), j(row));
    await shot(page, 'f06-retail-estimate.png');
    // SAVE THIS ESTIMATE: the file the browser saves.
    const dir = await downloadsTo(page);
    const saveAt = await boxOf(page, 'document.querySelector(\'[data-testid="estimate-save"]\')');
    const file = saveAt ? await captureDownload(dir, () => clickWith(page, saveAt.x, saveAt.y), page) : null;
    const savedText = file ? readFileSync(file, 'utf8') : '';
    check('SAVE THIS ESTIMATE (a real click): the browser saves a file carrying the style and the mirror',
      file && /ORNATE_A_1/.test(savedText) && /"mirror":\s*true/.test(savedText), `${file ? `${file.split('/').pop()}, ${savedText.length} bytes` : 'no download'}`);
    if (file) writeFileSync(`${SHOTS}f06-retail-estimate.json`, savedText);
    // RELOAD, then LOAD AN ESTIMATE by the file chooser the label opens.
    const before = await retailLeaves(page);
    const started = await page.ask('performance.timeOrigin');
    await page.send('Page.reload', { ignoreCache: true });
    await page.waitFor(`performance.timeOrigin !== ${started} && Boolean(document.querySelector('[data-testid="estimate-empty"]') || document.querySelector('[data-testid="estimate-row-1"]'))`, { timeout: 60000 });
    await page.sleep(1500);
    const afterReload = await page.ask('Boolean(document.querySelector(\'[data-testid="estimate-empty"]\'))');
    note('the page reloaded (the browser\'s own reload): MY ESTIMATE', afterReload ? 'empty (the estimate lives in the page until it is saved)' : 'still lists a row');
    let chooser = null;
    const onMsg = (e) => { const msg = JSON.parse(e.data); if (msg.method === 'Page.fileChooserOpened') chooser = msg.params; };
    page.socket.addEventListener('message', onMsg);
    await page.send('Page.setInterceptFileChooserDialog', { enabled: true });
    const loadAt = await boxOf(page, '(document.querySelector(\'[data-testid="detail-load"]\') || {}).parentElement || null');
    if (loadAt) await clickWith(page, loadAt.x, loadAt.y);
    for (let t = 0; t < 40 && !chooser; t += 1) await page.sleep(150);
    if (chooser && file) await page.send('DOM.setFileInputFiles', { files: [file], backendNodeId: chooser.backendNodeId });
    await page.send('Page.setInterceptFileChooserDialog', { enabled: false });
    page.socket.removeEventListener('message', onMsg);
    await until(page, 'Boolean(document.querySelector(\'[data-testid="estimate-row-1"]\'))', 30000);
    const row2 = await rowOf();
    check('LOAD AN ESTIMATE (a real click on the label opens the file chooser; the saved file is handed to it): MY ESTIMATE lists the wardrobe again with its style',
      chooser && row2 && row2.toUpperCase().includes((label || '').toUpperCase()), `chooser ${chooser ? `opened (${chooser.mode})` : 'never opened'}; row ${j(row2)}`);
    await page.press('[data-testid="estimate-edit-1"]');
    await page.waitFor('window.__cc && window.__cc.project && window.__cc.project.getState().units.length > 0 && Boolean(document.querySelector(\'[data-testid="cat-fronts"]\'))', { timeout: 60000 });
    await page.sleep(2000);
    await page.press('[data-testid="cat-fronts"]');
    for (let t = 0; t < 60; t += 1) {
      const mm2 = await meshesOf(page, (await unitsNow(page))[0].id, leafIds);
      if (mm2 && leafIds.every((id) => mm2[id] && mm2[id].style === 'ORNATE_A_1')) break;
      await page.sleep(300);
    }
    const after = await retailLeaves(page);
    const m2 = await meshesOf(page, (await unitsNow(page))[0].id, leafIds);
    check('EDIT: the reloaded wardrobe is the same, leaf for leaf (style, mirror, ornament, the surface\'s vertices and triangles), its solids drawn again',
      after === before && leafIds.every((id) => m2[id] && m2[id].style === 'ORNATE_A_1'), `${after === before ? 'identical' : `before ${before} | after ${after}`}; solids ${j(m2)}`);
    const tileOn = await page.ask('(document.querySelector(\'[data-testid="fronts-style-ORNATE_A_1"]\') || { getAttribute: () => null }).getAttribute(\'data-on\')');
    const mirrorOn = await page.ask('(document.querySelector(\'[data-testid="panel-fronts"] [data-ornate-mirror="ORNATE_A_1"]\') || {}).checked === true');
    check('…and the FRONTS step shows it: the Classic tile on, the mirror ticked', tileOn === 'yes' && mirrorOn, `tile ${tileOn}, mirror ${mirrorOn}`);
    await shot(page, 'f06-retail-reloaded.png');
  } catch (e) {
    check('f06 walked to its end', false, String(e && e.stack ? e.stack.split('\n').slice(0, 4).join(' ') : e));
    await shot(page, 'f06-failure.png').catch(() => {});
  }
  const errs = pageErrors(page);
  // GPT's walk's own reading, kept: the page threw nothing and said no error.
  check('no runtime exception and no console error on the page', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// === F07 · PRO, SAVE AND RELOAD: AN ORNATE PROJECT ROUND-TRIPS ==============
/** What a round trip must keep: each unit's stored recipe, each leaf's record, the cut rows. */
const roundTrip = (page) => page.ask(`(() => { const P = ${S}; return JSON.stringify(P.units.map((u) => { const r = P.unitResult(u.id);
  return { num: u.params.unit_num, type: u.type, frontType: u.params.front_type || null, stored: u.params.front_decoration || null,
    leaves: r.panels.filter((p) => p.meta && p.meta.frontDecoration).map((p) => { const d = p.meta.frontDecoration; const op = d.operations[0];
      return { id: p.id, w: p.w, h: p.h, t: p.thickness, style: d.style, status: d.status, parameters: d.parameters, ornament: d.ornament,
        vertices: op && op.surface ? op.surface.vertices.length : 0, triangles: op && op.surface ? op.surface.triangles.length : 0,
        firstVertex: op && op.surface ? op.surface.vertices[0] : null, contours: op ? op.contours.map((c) => c.layer + ':' + c.points.length) : [] }; }),
    csv: r.csvLines || [] }; })); })()`);
if (runs('f07')) {
  begin('f07', 'PRO, SAVE AND RELOAD: AN ORNATE PROJECT ROUND-TRIPS');
  const page = await open();
  try {
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
      await setStyle(page, B.unit.id, 'ORNATE_A_3', bl);
      const mb0 = await meshesOf(page, B.unit.id, bl);
      const mAt = await boxOf(page, 'document.querySelector(\'[data-ornate-mirror="ORNATE_A_3"]\')');
      if (mAt) await clickWith(page, mAt.x, mAt.y);
      await until(page, `(() => { const u = ${S}.units.find((x) => x.id === ${j(B.unit.id)}); return u && u.params.front_decoration && u.params.front_decoration.mirror === true; })()`, 6000);
      await meshesRebuilt(page, B.unit.id, bl, mb0, 'ORNATE_A_3');
      await setStyle(page, W.unit.id, 'ORNATE_A_4', wl);
      const b = await unitNow(page, B.unit.id);
      const w = await unitNow(page, W.unit.id);
      check('the base unit ORNATE_A_3 mirrored by its checkbox, the wardrobe ORNATE_A_4, both by the real controls',
        b.leaves.every((l) => l.deco && l.deco.style === 'ORNATE_A_3' && l.deco.mirror === true && l.deco.status === 'ready') && w.leaves.every((l) => l.deco && l.deco.style === 'ORNATE_A_4' && l.deco.status === 'ready'),
        `${b.leaves.map((l) => `${l.id} ${l.deco && l.deco.style} mirror ${l.deco && l.deco.mirror} ${l.deco && l.deco.status}`).join(', ')}; ${w.leaves.map((l) => `${l.id} ${l.deco && l.deco.style} ${l.deco && l.deco.status}`).join(', ')}`);
      const before = await roundTrip(page);
      const csv0 = await cutListFile(page);
      const rows0 = await bomRead(page, null);
      await bomClose(page);
      await shot(page, 'f07-before-save.png');
      const name = await page.ask(`${S}.project.name`);
      await page.press('[data-save-control]');
      const saved = await until(page, `!${S}.dirty`, 10000);
      check('SAVE (the top bar\'s own button): the project is saved, nothing left dirty', saved,
        `${j(await lastSaid(page, 1))}; save state ${await page.ask('(document.querySelector(\'[data-save-control]\') || {}).getAttribute(\'data-save-state\')')}`);
      await page.send('Page.reload', { ignoreCache: true });
      await page.sleep(2000);
      await page.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
      await until(page, '[...document.querySelectorAll(\'button\')].some((b) => b.offsetParent && /Recent/.test(b.textContent))', 20000);
      const shelfRow = await page.ask(`(() => { try { const s = JSON.parse(localStorage.getItem('cc.library.v1') || '{}'); const r = (s.projects || []).find((p) => p.name === ${j(name)});
        return r ? { id: r.id, units: (r.units || []).map((u) => ({ num: u.params.unit_num, frontType: u.params.front_type || null, recipe: u.params.front_decoration || null })) } : null; } catch (e) { return null; } })()`);
      const row = await boxOf(page, `[...document.querySelectorAll('li button')].find((b) => b.offsetParent && b.textContent.includes(${j(name)}))`);
      note('the page reloaded: the start screen, the saved job in Recent', `Recent row ${row ? 'listed' : 'missing'}`);
      const savedB = shelfRow && shelfRow.units.find((x) => x.num === b.num);
      const savedW = shelfRow && shelfRow.units.find((x) => x.num === w.num);
      check('the file SAVE wrote (the shelf row, lib/projectLibrary.js) carries both recipes as the panel set them',
        savedB && savedB.frontType === 'ORNATE_A_3' && savedB.recipe && savedB.recipe.mirror === true && savedW && savedW.frontType === 'ORNATE_A_4' && savedW.recipe && savedW.recipe.style === 'ORNATE_A_4',
        `${shelfRow ? shelfRow.id : 'no row'}: ${shelfRow ? shelfRow.units.map((x) => `${x.num} ${x.frontType} ${x.recipe ? `${x.recipe.style} variant ${x.recipe.variant} mirror ${x.recipe.mirror} ornament ${x.recipe.ornament}` : 'none'}`).join('; ') : ''}`);
      if (row) {
        await clickWith(page, row.x, row.y);
        await page.waitFor('window.__cc.views && window.__cc.views.room', { timeout: 45000 });
        await page.sleep(3000);
        for (let t = 0; t < 60; t += 1) {
          const m = await decoratedMeshes(page);
          if (m && [...bl, ...wl].every((id) => m.includes(id))) break;
          await page.sleep(300);
        }
        const after = await roundTrip(page);
        check('reopened by a real click on its row: every stored recipe, every leaf\'s record (the mirror, the ornament, the surface) and every cut line come back the same',
          after === before, `${before.length} characters before, ${after.length} after${after === before ? '' : `; before ${before.slice(0, 300)} | after ${after.slice(0, 300)}`}`);
        const csv1 = await cutListFile(page);
        check('Output, Cutting list CSV before the save and after the reload: byte for byte',
          csv0 && csv1 && Buffer.compare(csv0.bytes, csv1.bytes) === 0, `${csv0 && csv0.bytes.length} -> ${csv1 && csv1.bytes.length} bytes${csv0 && csv1 && Buffer.compare(csv0.bytes, csv1.bytes) ? `; ${diffLines(csv0.bytes, csv1.bytes).join(' | ')}` : ''}`);
        const rows1 = await bomRead(page, 'f07-reloaded-bom.png');
        const pick = (rs) => j(rs.filter((r) => r.id).map((r) => [r.unit, r.id, r.construction, r.w, r.h, r.qty, r.state]));
        check('the BOM panel\'s rows, constructions and States: the same', pick(rows0) === pick(rows1),
          `${rows1.filter((r) => r.construction).map((r) => `${r.id} "${r.construction}" ${r.state}`).join('; ')}`);
        await bomClose(page);
        const m = await decoratedMeshes(page);
        check('the reopened scene draws the relief solids again', [...bl, ...wl].every((id) => m.includes(id)), j(m));
        await shot(page, 'f07-reloaded.png');
      }
    }
  } catch (e) {
    check('f07 walked to its end', false, String(e && e.stack ? e.stack.split('\n').slice(0, 4).join(' ') : e));
    await shot(page, 'f07-failure.png').catch(() => {});
  }
  const errs = pageErrors(page);
  // GPT's walk's own reading, kept: the page threw nothing and said no error.
  check('no runtime exception and no console error on the page', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// === THE SIZES MEASURED (for the PR's table): beside the ledger, as JSON ====
if (sizes.length) {
  const file = `${SHOTS}walk-sizes.json`;
  let kept = [];
  try { kept = JSON.parse(readFileSync(file, 'utf8')); } catch { kept = []; }
  const fresh0 = process.argv.includes('--fresh');
  const mine = new Set(sizes.map((s) => s.context.split(' ')[0]));
  const merged = [...(fresh0 ? [] : kept.filter((s) => !mine.has(s.context.split(' ')[0]))), ...sizes];
  writeFileSync(file, `${JSON.stringify(merged, null, 1)}\n`);
}

// === THE LEDGER =============================================================
const fresh = process.argv.includes('--fresh');
const ledger = `${SHOTS}walk.txt`;
const HEAD = [
  'T77 · THE ACCEPTANCE WALK OF ORNATE A',
  '',
  'CLAUDE.md T77 F7, walked section by section against `npx vite preview` of',
  'the branch, the hardware served from the silent showroom. f01 and f02 are',
  'the PRO cabinets (a base unit, a wardrobe) through ORNATE_A_1 .. 4 by the',
  'real select; f03 the L of T75 with ORNATE_A_2; f04 the refusals (a 250 x',
  '400 leaf, a 12 mm board); f05 Herbal Hill against the base build',
  `(${BASE_SHA}); f06 retail's FRONTS step, MY ESTIMATE, save and reload; f07`,
  'a PRO save and reload. Every gesture is a REAL mouse or key event at a DOM',
  'control\'s centre or at a pixel the scene\'s own raycaster says the piece is',
  'under (and the page says the canvas owns); the store is only READ. A NOTE',
  'names a gesture the app offers no control for, or a reading worth keeping.',
  'Every reference file the browser downloaded is listed with its bytes in the',
  'section\'s lines, and again in walk-sizes.json beside this file. The frames',
  'beside this file are what the browser saw.',
  '',
].join('\n');
// The ledger keeps one block per section; a rerun of a section replaces its block.
const blocks = new Map();
if (!fresh && existsSync(ledger)) {
  let name = null;
  for (const line of readFileSync(ledger, 'utf8').split('\n')) {
    const m = line.match(/^=== (\w+) · /);
    if (m) { name = m[1].toLowerCase(); blocks.set(name, [line]); continue; }
    if (/^(TOTAL|SECTION|FRAMES) /.test(line)) { name = null; continue; }
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
const shots = readdirSync(SHOTS).filter((n) => /^f0[1-7]-.*\.png$/.test(n)).sort();
const pngs = shots.length;
// Every frame by name, under the section that took it (a frame's name opens
// with its section), so a reader can open the one a line speaks of. A frame
// this run took and the disk does not hold would be a lie in the ledger.
const lost = frames.filter((f) => !existsSync(`${SHOTS}${f}`));
if (lost.length) process.stdout.write(`FRAMES MISSING ON DISK: ${lost.join(', ')}\n`);
writeFileSync(ledger, [
  HEAD,
  ...names.flatMap((n) => [...blocks.get(n), '']),
  ...counts.map((c) => `SECTION ${c.n}: ${c.ok} ok, ${c.fail} FAIL, ${c.notes} notes`),
  `TOTAL ${total.ok + total.fail} checks · ${total.fail} failed · ${total.notes} notes`,
  `${total.ok} ok, ${total.fail} FAIL, ${total.notes} notes, ${pngs} frames`,
  '',
  ...names.map((n) => { const mine = shots.filter((f) => f.startsWith(`${n}-`)); return `FRAMES ${n} (${mine.length}): ${mine.join(', ')}`; }),
  '',
].join('\n'));
const failed = steps.filter((s) => !s.header && !s.note && !s.ok);
process.stdout.write(`\n${steps.filter((s) => !s.header && !s.note).length} checks · ${failed.length} failed · frames ${frames.join(', ')}\n`);
await showroomDown();
process.exit(failed.length ? 1 : 0);
