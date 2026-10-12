#!/usr/bin/env node
// T78 PARTS D AND E, THE ACCEPTANCE WALK (CLAUDE.md T78 F17 to F20)
//
// The hood (F17), the AVENTOS lifts (F18), the company's joint system and the
// dowels (F19), biscuits and Cabineo 8 / 12 (F20), walked in PRO (the main app
// at /) with a REAL mouse, in the pattern of scripts/t78-walk.mjs (PART A):
// every gesture is the browser's own input pipe (CDP Input.dispatchMouseEvent
// / Input.dispatchKeyEvent / Input.insertText) at a DOM control's centre or at
// a pixel the scene's own raycaster says the piece is under and the page says
// the canvas owns (T74's pointOn, T75's reachFree). A native <select> is driven
// the way T75's harness drives one (a real click, the arrows, Enter). The store
// is READ (window.__cc.project.getState(), window.__cc.ui.getState(),
// window.__cc.views.room.three) to say what happened; it is never written to
// make something happen. The ONE exception is the stage: a new project and the
// editor's own door through the store (T74's pro(), as every walk since
// scripts/e2e-turn18.mjs), and in f19 a SECOND new project the same way, after
// the company row is set, because the point of F19 is what a NEW project
// inherits. A FAIL is written down, never patched.
//
// This file is self-contained beside the two harnesses (t74-harness.mjs,
// t75-harness.mjs); it does not import scripts/t78-walk.mjs, whose hands it
// copies, so the two walks can be edited apart.
//
// Two pages, four sections:
//   page 1  f17 the hob, the hood over it, the clearance proposal and Check #34,
//               the one click, the gas hob, the canopy and the short hood
//           f18 a WUD's Front opens: HK top (lift, cups gone, the AVENTOS lines,
//               the leaf lifted), HL (refused for 720), HF (two halves folding)
//   page 2  f19 Database > Company defaults > Joints = Dowels; a new project's
//               BUD cuts dowels with no unit key; Puzzle overrides; the dowel
//               gate refuses the CNC export
//           f20 Biscuit, Cabineo 12 (the pockets from the outside face, the
//               NOTE row, the connector and cap lines, the Cabineo gate),
//               Cabineo 8, Puzzle
//
//   npx vite preview --port 4174 --outDir <dist>     (built first)
//   E2E_URL=http://127.0.0.1:4174/ E2E_DIST=<dist>/ node scripts/t78-walk-de.mjs --fresh
//   node scripts/t78-walk-de.mjs f19 f20             the page that holds them
//
// Ledger: verify/t78/walk-de.txt. Frames: verify/t78/f17-walk-*.png and so on.
// Everything this file writes is plain ASCII (CLAUDE.md LAWS: no em or en
// dash); a sentence the app says with a dash is quoted with the dash escaped.

import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  open, pro, unitsNow, showroomDown, settleCamera, pointOn,
} from './t74-harness.mjs';
import {
  key, clickWith, boxOf, choose, until, reachFree, orbitFree, dragAlong,
} from './t75-harness.mjs';

const REPO = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../verify/t78/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.E2E_URL || 'http://127.0.0.1:4174/';
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

const ORDER = ['f17', 'f18', 'f19', 'f20'];
const PAGES = { 1: ['f17', 'f18'], 2: ['f19', 'f20'] };
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const pageWanted = (n) => want.length === 0 || PAGES[n].some((s) => want.includes(s));

// === THE LEDGER'S HANDS =====================================================
// Every line: "<SECTION> <nn> PASS|FAIL | <gesture> | expect: <...> | observed: <...>".
const steps = [];
const frames = [];
let current = '';
const counters = {};
const ascii = (t) => String(t)
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const check = (gesture, ok, expect, got) => {
  counters[current] = (counters[current] || 0) + 1;
  steps.push({
    section: current, n: counters[current], gesture: ascii(gesture), ok: Boolean(ok), expect: ascii(expect), got: ascii(got),
  });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${current.toUpperCase()} ${String(counters[current]).padStart(2, '0')} ${ascii(gesture)} | expect: ${ascii(expect)} | observed: ${ascii(got)}\n`);
};
const note = (gesture, got) => {
  steps.push({
    section: current, gesture: ascii(gesture), note: true, got: ascii(got),
  });
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
const how = (sel) => (sel && sel.already ? 'already selected by the add' : (sel && sel.by ? `by ${sel.by}` : 'NOT selected'));
const r1 = (v) => (v == null ? null : Math.round(Number(v) * 10) / 10);
const near = (a, b, tol = 1) => Math.abs(Number(a) - Number(b)) <= tol;
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));

// === IS THE CANVAS ALIVE? (t78-walk.mjs's) ==================================
const DIST = process.env.E2E_DIST || `${REPO}dist/`;
const DEAD = 'SCENE DEAD';
const alive = (page) => page.ask('Boolean(window.__cc && window.__cc.views && window.__cc.views.room && window.__cc.views.room.three)');
async function mapToSource(text) {
  const m = String(text).match(/assets\/([^/:)]+\.js):(\d+):(\d+)/);
  if (!m) return null;
  try {
    const { TraceMap, originalPositionFor } = await import('@jridgewell/trace-mapping');
    const map = new TraceMap(JSON.parse(readFileSync(`${DIST}assets/${m[1]}.map`, 'utf8')));
    const pos = originalPositionFor(map, { line: Number(m[2]), column: Number(m[3]) });
    return pos && pos.source ? `${pos.source.replace(/^(\.\.\/)+/, '')}:${pos.line}:${pos.column}` : null;
  } catch { return null; }
}
async function sceneDeath(page) {
  const e = page.errors.find((x) => /ReferenceError|TypeError|RangeError|Error:/.test(x) && !/favicon|manifest|supabase|showroom|fonts\.g/i.test(x));
  if (!e) return 'no page error recorded';
  const lines = e.split('\n');
  const src = await mapToSource(lines.find((x) => /assets\//.test(x)) || '');
  return `${lines[0]}${lines[1] ? ` ${lines[1].trim()}` : ''}${src ? ` -> ${src}` : ''}`;
}
async function sceneCheck(page, when) {
  const ok = await alive(page);
  check(`the room canvas ${when}`, ok, 'the scene alive (window.__cc.views.room.three)', ok ? 'alive' : `DEAD: ${await sceneDeath(page)}`);
  return ok;
}
async function ended(page, name, e) {
  const dead = e && e.message === DEAD;
  check(`${name} walked to its end`, false, dead ? 'the canvas alive for the gestures below' : 'no exception',
    dead ? `not walked: the scene is dead (${await sceneDeath(page)})` : String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
  await shot(page, `${name}-walk-failure.png`).catch(() => {});
}

// === WHAT THE WALK READS ====================================================
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const stamp = (page) => page.ask('(document.querySelector(\'[data-build-stamp]\') || {}).getAttribute ? document.querySelector(\'[data-build-stamp]\').getAttribute(\'data-build-stamp\') : ((document.body.innerText || \'\').match(/#\\d+ . [0-9-]+ [0-9:]+ UTC . [0-9a-f]{7}/) || [null])[0]');
const roomNow = (page) => page.ask(`JSON.parse(JSON.stringify(${S}.project.room))`);
const designNow = (page) => page.ask(`JSON.parse(JSON.stringify(${S}.project.design.joints || null))`);
const profileNum = (page, path) => page.ask(`(() => { let v = ${PROFILE}; for (const k of ${j(path)}.split('.')) v = v == null ? v : v[k]; return v ?? null; })()`);
const modalNow = (page) => page.ask(`${UI}.modal || null`);
const selectedNow = (page) => page.ask(`${UI}.selectedUnitId || null`);
const messagesNow = (page) => page.ask(`(${UI}.messages || []).map((m) => ({ id: m.id, level: m.level, message: m.message, action: m.action ? m.action.label : null }))`);
async function recordSaid(page) {
  await page.ask(`(() => { if (window.__walkSaid) return true; window.__walkSaid = []; const seen = new Set();
    const take = (s) => { for (const m of (s.messages || [])) { if (!seen.has(m.id)) { seen.add(m.id); window.__walkSaid.push(m.level + ': ' + m.message + (m.action ? ' [' + m.action.label + ']' : '')); } } };
    take(window.__cc.ui.getState()); window.__cc.ui.subscribe(take); return true; })()`);
}
const saidCount = (page) => page.ask('(window.__walkSaid || []).length');
const saidSince = (page, from) => page.ask(`(window.__walkSaid || []).slice(${from})`);
/** A unit as the store holds it and as the engine cuts it, the fields PARTS D and E ask about. */
const unitOf = (page, id) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(id)});
  if (!u) return null; const r = P.unitResult(u.id);
  const pick = (b) => (b ? { x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, d: b.d } : null);
  const plain = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));
  return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall ?? 0, x: u.position.x_mm,
    w: u.params.width, d: u.params.depth, h: u.params.height, mount: u.params.mount_height ?? null,
    hob: u.params.hob === true, hobKind: u.params.hob_kind || null, frontSystem: u.params.front_system || null,
    jointsParam: u.params.joints_system ?? null,
    doors: r.derived ? r.derived.doors : null, lift: r.derived ? plain(r.derived.lift) : null, joints: r.derived ? plain(r.derived.joints) : null,
    panels: r.panels.map((p) => ({ id: p.id, part: p.part, role: p.role, w: p.w, h: p.h, t: p.thickness, box: pick(p.box),
      machinedFace: p.meta ? (p.meta.machinedFace || null) : null, label: p.meta ? (p.meta.label || null) : null,
      lift: p.meta && p.meta.lift ? { system: p.meta.lift.system, parent: p.meta.lift.parent || null, child: p.meta.lift.child || null } : null,
      hinge: p.meta ? (p.meta.hinge || null) : null, outlinePts: p.cnc && p.cnc.outline ? p.cnc.outline.length : null,
      pockets: p.cnc && p.cnc.pockets ? p.cnc.pockets.map((k) => k.kind || k.layer || 'pocket') : [],
      holes: p.cnc && p.cnc.holes ? p.cnc.holes.length : 0 })),
    drillKinds: Object.entries((r.drills || []).reduce((acc, d) => { acc[d.kind] = (acc[d.kind] || 0) + 1; return acc; }, {})).map(([k, n]) => k + ' x' + n),
    hardware: (r.hardware || []).map((h) => ({ role: h.role, qty: h.qty, unit: h.unit, label: h.label || null, spec: h.spec_label || null })),
    warnings: (r.warnings || []).map((w) => w.code + ': ' + w.message) }; })()`);
/** Every mesh the scene draws a unit's pieces with (t78-walk.mjs's meshesOf): the box in the UNIT's frame. */
const meshesOf = (page, unitId, ids) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; unit.updateMatrixWorld(true); const inv = new T.Matrix4().copy(unit.matrixWorld).invert();
  const want = ${j(ids)}; const out = {}; const r = (q) => Math.round(q * 10) / 10;
  unit.traverse((o) => { if (!o.isMesh || !o.userData || !want.includes(o.userData.ccPanelId)) return;
    const g = o.geometry; const nv = (g && g.attributes && g.attributes.position) ? g.attributes.position.count : 0;
    const prev = out[o.userData.ccPanelId]; if (prev && prev.vertices >= nv) return;
    if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox;
    const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const p = new T.Vector3(x, y, z).applyMatrix4(o.matrixWorld).applyMatrix4(inv); const q = [p.x * 1000, p.y * 1000, p.z * 1000];
      for (let i = 0; i < 3; i += 1) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); } }
    out[o.userData.ccPanelId] = { vertices: nv, kind: g.type,
      unit: { x: [r(lo[0]), r(hi[0])], y: [r(lo[1]), r(hi[1])], z: [r(lo[2]), r(hi[2])] },
      unitSize: { x: r(hi[0] - lo[0]), y: r(hi[1] - lo[1]), z: r(hi[2] - lo[2]) },
      centre: { x: r((lo[0] + hi[0]) / 2), y: r((lo[1] + hi[1]) / 2), z: r((lo[2] + hi[2]) / 2) }, visible: o.visible }; });
  return out; })()`);
/** The bought bodies the scene draws in a unit (ccKitBody / ccLiftBody), counted. */
const kitBodies = (page, unitId) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; const out = [];
  unit.traverse((o) => { const k = o.userData && (o.userData.ccKitBody || o.userData.ccLiftBody || o.userData.ccBody); if (k) { let meshes = 0; o.traverse((m) => { if (m.isMesh) meshes += 1; }); out.push({ role: String(k), placeholder: o.userData.ccKitPlaceholder === true, meshes }); } });
  return out; })()`);

// === THE HANDS THIS WALK NEEDS (all real events) ============================
async function selectAll(page) {
  const k = {
    key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k, commands: ['selectAll'] });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(120);
}
/**
 * Every window shut the way a client shuts one: Escape (Modal.jsx's own key),
 * then the window's Done / Close / x by a real click (the cabinet editor has
 * opted Escape out, T37-F4c). What was open and what shut it is returned for
 * the ledger; the store is asked only when no button is on the screen, and
 * the ledger says so.
 */
async function closeModals(page) {
  const seen = []; let by = null;
  for (let i = 0; i < 4; i += 1) {
    const m = await modalNow(page);
    if (!m) break;
    seen.push(m);
    await key(page, 'Escape');
    if (!(await modalNow(page))) { by = by || 'Escape'; continue; }
    const btn = await boxOf(page, '[...document.querySelectorAll(\'[data-modal-shell] button\')].find((b) => b.offsetParent && (b.textContent.trim() === \'Done\' || b.textContent.trim() === \'Close\' || /^Close/.test(b.getAttribute(\'title\') || \'\')))');
    if (btn) { await clickWith(page, btn.x, btn.y); by = by || 'its Done / Close button'; }
    else { await page.ask(`${UI}.closeModal(); true`); by = 'THE STORE (no button on the screen)'; }
    await page.sleep(400);
  }
  return { seen, by };
}
async function typeNumber(page, value) {
  await selectAll(page);
  await page.typeText(String(value));
  await key(page, 'Enter');
  await page.sleep(900);
}
async function sectionOpen(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
async function closeLibrary(page) {
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
}
/** A row of the library through its MENU, its category and every flyout on the way (t78-walk.mjs's). */
async function addFromLibrary(page, { category = 'Kitchen', path = [], entry }) {
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  const listed = () => page.has(`[data-library-entry="${entry}"]`);
  if (await modalNow(page)) await closeModals(page);
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
  const said0 = await saidCount(page);
  await page.press(`[data-library-entry="${entry}"]`);
  await page.sleep(1300);
  const added = (await unitsNow(page)).filter((u) => !before.has(u.id) && u.type !== 'FREE_PANEL');
  await closeLibrary(page);
  return { ok: true, unit: added[0] || null, said: await saidSince(page, said0) };
}
const selectedIs = (unitId) => `${UI}.selectedUnitId === ${j(unitId)} && !${UI}.selectedElement && Boolean(document.querySelector('[data-section="Carcass"]'))`;
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const pick = [];
  for (const f of [(p) => p.id === 'TOP' || p.part === 'TOP', (p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT' || p.part === 'FALSE-FRONT', (p) => p.role === 'side', (p) => p.role === 'bottom', (p) => p.role === 'back', () => true]) {
    for (const p of r.panels) if (f(p) && !(p.meta && p.meta.frontDecorationParent) && !pick.includes(p.id)) pick.push(p.id); }
  return pick; })()`);
/** A unit SELECTED by a real click on one of its pieces, its right panel standing. */
async function selectUnit(page, unitId) {
  if (await page.ask(selectedIs(unitId))) return { already: true };
  if (await modalNow(page)) await closeModals(page);
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  let last = null;
  for (const pid of (await grabIds(page, unitId)).slice(0, 8)) {
    const at = await reachFree(page, unitId, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    last = { ...at, by: pid };
    if (await until(page, selectedIs(unitId), 3000)) return last;
  }
  return last;
}
/** DOORS' own button on a unit that has no leaf yet (t78-walk.mjs's addDoors): a library unit arrives without one. */
async function addDoors(page, unitId) {
  const has = (await unitOf(page, unitId)).panels.some((p) => p.part === 'FRONT');
  if (has) return 'had leaves';
  await selectUnit(page, unitId);
  if (!(await sectionOpen(page, 'Doors'))) return 'no Doors section';
  const btn = await page.ask('[...document.querySelectorAll(\'button.cc-btn-gold\')].some((b) => b.offsetParent && /Add doors/.test(b.textContent))');
  if (!btn) return 'no Add doors button';
  await page.press('button.cc-btn-gold', 'Add doors');
  await until(page, `${S}.unitResult(${j(unitId)}).panels.some((p) => p.part === 'FRONT')`, 5000);
  await page.sleep(900);
  return 'Add doors pressed';
}
/** A control in a right-panel section found by the sentence over it (span.cc-label). */
const byLabel = (section, label, tag) => `(() => { const s = [...document.querySelectorAll('[data-section="${section}"] span.cc-label')].find((x) => x.textContent.trim() === ${j(label)}); return s ? s.parentElement.querySelector(${j(tag)}) : null; })()`;
/** The top bar: a menu, then its item (both real clicks). */
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
/** The Check panel, opened by the toolbar's own button; its findings read. */
async function checkOpen(page) {
  if (!(await page.has('[data-check-panel]'))) await page.press('[data-check-button]');
  await until(page, 'Boolean(document.querySelector(\'[data-check-panel]\'))', 4000);
  return page.ask(`[...document.querySelectorAll('[data-check-finding]')].map((li) => ({ n: Number(li.getAttribute('data-check-finding')), level: li.getAttribute('data-check-level'),
    text: li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 300), actions: [...li.querySelectorAll('[data-check-action]')].map((b) => b.getAttribute('data-check-action') + ': ' + b.textContent.trim()) }))`);
}
async function checkClose(page) {
  if (await page.has('[data-check-panel]')) await page.press('[data-check-button]');
}
/** The right panel clipped, scaled up (a frame of a row). */
async function domFrame(page, expr, file, pad = 12) {
  const r = await page.ask(`(() => { const el = (${expr}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
  if (!r || r.w < 4) return shot(page, file);
  return shot(page, file, {
    x: Math.max(0, Math.round(r.x - pad)), y: Math.max(0, Math.round(r.y - pad)), width: Math.round(r.w + 2 * pad), height: Math.round(Math.min(r.h + 2 * pad, 900)), scale: 2,
  });
}

// === THE BOM PANEL, READ THROUGH ITS OWN TABS (t78-walk.mjs's) ==============
const BOM_ASIDE = '[...document.querySelectorAll(\'aside\')].find((a) => /Bill of materials/.test(a.textContent))';
async function bomOpen(page) {
  if (await modalNow(page)) await closeModals(page);
  if (!(await page.ask(`Boolean(${BOM_ASIDE})`))) await page.press('button[title="Bill of materials"]');
  await until(page, `Boolean(${BOM_ASIDE})`, 6000);
}
async function bomParts(page) {
  await bomOpen(page);
  const tab = await boxOf(page, `(() => { const a = ${BOM_ASIDE}; return a ? [...a.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Parts') : null; })()`);
  if (tab) await clickWith(page, tab.x, tab.y);
  await until(page, `Boolean(${BOM_ASIDE}) && Boolean((${BOM_ASIDE}).querySelector('tbody tr'))`, 6000);
  return page.ask(`(() => { const a = ${BOM_ASIDE}; if (!a) return null;
    let head = ''; const rows = [...a.querySelectorAll('tbody tr')].map((tr) => { const td = [...tr.querySelectorAll('td')]; if (td.length < 6) { head = (tr.textContent.trim().match(/^(\\S+)/) || ['', ''])[1]; return { head: tr.textContent.trim().slice(0, 120) }; }
      const cell = td[1]; const id = ((cell.childNodes[0] && cell.childNodes[0].textContent) || cell.textContent || '').trim();
      return { unit: td[0].textContent.trim() || head, id, material: td[2].getAttribute('title') || td[2].textContent.trim(), w: td[3].textContent.trim(), h: td[4].textContent.trim(), qty: td[5].textContent.trim(), text: tr.textContent.replace(/\\s+/g, ' ').trim().slice(0, 240) }; });
    return { rows, text: (a.innerText || '').replace(/\\s+/g, ' ') }; })()`);
}
async function bomOrder(page) {
  await bomOpen(page);
  if (await page.has('[data-bom-order-tab]')) await page.press('[data-bom-order-tab]');
  await until(page, 'Boolean(document.querySelector(\'[data-bom-ironmongery]\'))', 6000);
  return page.ask(`[...document.querySelectorAll('[data-bom-ironmongery] li[data-bom-line]')].map((li) => { const s = [...li.querySelectorAll('span')].map((x) => x.textContent.trim());
    const m = (s[1] || '').match(/^([\\d.]+)\\s*(\\S*)/); return { role: li.getAttribute('data-bom-line'), label: s[0] || '', qty: m ? Number(m[1]) : null, unit: m ? m[2] : null, spec: s[2] || '', yellow: li.getAttribute('data-bom-yellow') === '1' }; })`);
}
async function bomFrame(page, file) {
  const r = await page.ask(`(() => { const a = ${BOM_ASIDE}; if (!a) return null; const b = a.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
  if (!r) return shot(page, file);
  return shot(page, file, {
    x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(Math.min(r.h, 900)), scale: 1,
  });
}
async function bomClose(page) {
  const x = await boxOf(page, `(() => { const a = ${BOM_ASIDE}; return a ? [...a.querySelectorAll('button')].find((b) => b.textContent.trim() === '\\u00d7') : null; })()`);
  if (x) await clickWith(page, x.x, x.y);
}
const sumQty = (lines, role) => lines.filter((l) => l.role === role).reduce((n, l) => n + (Number(l.qty) || 0), 0);
const sayLines = (lines, roles) => lines.filter((l) => roles.includes(l.role)).map((l) => `${l.role} "${l.label}" ${l.qty} ${l.unit}${l.spec ? ` (${l.spec})` : ''}`).join('; ') || `none of ${roles.join(', ')}`;

/** A frame clipped to the screen rectangle some pieces cover (with a margin), scaled up. */
async function pieceFrame(page, unitId, ids, file) {
  await settleCamera(page);
  const r = await page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
    let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
    if (!unit) return null; const want = ${j(ids)}; const box = new T.Box3(); let any = false; unit.updateMatrixWorld(true);
    unit.traverse((o) => { if (o.isMesh && o.userData && want.includes(o.userData.ccPanelId)) { box.expandByObject(o); any = true; } });
    if (!any) return null; const c = v.gl.domElement.getBoundingClientRect();
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new T.Vector3(x, y, z).project(v.camera); const px = c.left + (p.x * 0.5 + 0.5) * c.width; const py = c.top + (-p.y * 0.5 + 0.5) * c.height;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    const aside = [...document.querySelectorAll('aside')].map((a) => a.getBoundingClientRect()).filter((a) => a.width > 0 && a.left > c.left + c.width / 2).map((a) => a.left);
    return { x0, y0, x1, y1, left: c.left, top: c.top, right: Math.min(c.right, ...aside), bottom: c.bottom }; })()`);
  if (!r) return shot(page, file);
  const mx = Math.max(60, (r.x1 - r.x0) * 0.25 + 24); const my = Math.max(60, (r.y1 - r.y0) * 0.25 + 24);
  const x = Math.max(r.left, r.x0 - mx); const y = Math.max(r.top, r.y0 - my);
  const x2 = Math.min(r.right, r.x1 + mx); const y2 = Math.min(r.bottom, r.y1 + my);
  const width = Math.max(60, x2 - x); const height = Math.max(60, y2 - y);
  const scale = Math.max(1, Math.min(2, 760 / Math.max(width, height)));
  return shot(page, file, {
    x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), scale,
  });
}
/**
 * A pixel on a LEAF that a 2klik reaches: T74's finder leaves helpers out of
 * its ray (a helper is not a piece), but the gold plus the scene draws at a
 * leaf's centre TAKES the pointer (f18's first walk: a 2klik at the leaf's
 * centre swung nothing). So every visible object, sprites and helpers
 * included, is in this ray, the pixel counts only when the leaf itself is the
 * first thing hit and the page hands it to the canvas, and the one nearest a
 * point a third down from the top of the good set wins (off the centre).
 */
const LEAF_PX = `(function (unitId, panelId) {
  const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three; let target = null;
  v.scene.traverse((o) => { if (target || !o.isMesh || !o.userData || o.userData.ccPanelId !== panelId) return;
    let a = o; while (a && !(a.userData && a.userData.ccUnitId)) a = a.parent; if (a && a.userData.ccUnitId === unitId) target = o; });
  if (!target) return null; const c = v.gl.domElement; const r = c.getBoundingClientRect();
  const hidden = (o) => { for (let a = o; a; a = a.parent) if (a.visible === false) return true; return false; };
  const box = new T.Box3().setFromObject(target); const xs = []; const ys = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const p = new T.Vector3(x, y, z).project(v.camera); xs.push(p.x); ys.push(p.y); }
  const ray = new T.Raycaster(); const good = []; const N = 40;
  for (let i = 1; i < N; i += 1) for (let j = 1; j < N; j += 1) {
    const nx = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * i / N; const ny = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * j / N;
    const px = Math.round(r.left + (nx * 0.5 + 0.5) * r.width); const py = Math.round(r.top + (-ny * 0.5 + 0.5) * r.height);
    if (px < r.left + 4 || px > r.right - 4 || py < r.top + 4 || py > r.bottom - 4) continue;
    const el = document.elementFromPoint(px, py); if (!(el === c || (el && c.contains(el)))) continue;
    ray.setFromCamera(new T.Vector2(((px - r.left) / r.width) * 2 - 1, -(((py - r.top) / r.height) * 2 - 1)), v.camera);
    const hits = ray.intersectObjects(v.scene.children, true).filter((h) => (h.object.isMesh || h.object.isSprite) && !hidden(h.object));
    if (hits.length && hits[0].object === target) good.push({ x: px, y: py });
  }
  if (!good.length) return null;
  const x0 = Math.min(...good.map((p) => p.x)); const x1 = Math.max(...good.map((p) => p.x)); const y0 = Math.min(...good.map((p) => p.y)); const y1 = Math.max(...good.map((p) => p.y));
  const ax = (x0 + x1) / 2; const ay = y0 + (y1 - y0) * 0.3;
  good.sort((a, b) => Math.hypot(a.x - ax, a.y - ay) - Math.hypot(b.x - ax, b.y - ay));
  return { x: good[0].x, y: good[0].y, n: good.length };
})`;
async function leafPixel(page, unitId, panelId) {
  await settleCamera(page);
  for (const [dx, dy] of [[0, 0], [120, 0], [-240, 0], [120, 120], [260, 0]]) {
    if (dx || dy) await orbitFree(page, dx, dy);
    const at = await page.ask(`${LEAF_PX}(${j(unitId)}, ${j(panelId)})`);
    if (at) return at;
  }
  return null;
}
/** A leaf swung by the app's own gesture: a 2klik on it where a hand can reach it; the toolbar's Open all when no pixel is in reach. */
async function openLeaf(page, unitId, panelId) {
  const at = await leafPixel(page, unitId, panelId);
  if (at) { await page.dblclick(at.x, at.y); await page.sleep(1800); const shut = await closeModals(page); return { by: `a 2klik at ${at.x},${at.y}${shut.seen.length ? ` (the ${shut.seen.join(', ')} window it opened shut by ${shut.by})` : ''}` }; }
  if (await page.has('[data-open-all-doors="1"]:not([disabled])')) { await page.press('[data-open-all-doors="1"]'); await page.sleep(1800); return { by: 'the toolbar\'s Open all (no pixel of the leaf in reach)' }; }
  return null;
}
async function shutLeaves(page) {
  if (await page.ask('(() => { const b = document.querySelector(\'[data-open-all-doors="1"]\'); return b && b.getAttribute(\'aria-pressed\') === \'true\'; })()')) { await page.press('[data-open-all-doors="1"]'); await page.sleep(900); }
  else if (await page.has('[data-open-all-doors="1"]:not([disabled])')) { await page.press('[data-open-all-doors="1"]'); await page.sleep(600); await page.press('[data-open-all-doors="1"]'); await page.sleep(900); }
}
/** The Front opens select (data-front-system) set by the real select; what the engine then says. */
async function frontSystem(page, unitId, value) {
  await selectUnit(page, unitId);
  await sectionOpen(page, 'Carcass');
  await sectionOpen(page, 'Doors');
  if (!(await page.has('[data-front-system="1"]'))) return { ok: false, why: 'control not found: [data-front-system]' };
  const res = await choose(page, 'document.querySelector(\'[data-front-system="1"]\')', value);
  await until(page, `(${S}.units.find((u) => u.id === ${j(unitId)}) || { params: {} }).params.front_system === ${j(value === 'hinged' ? null : value)}`, 5000);
  await page.sleep(900);
  res.said = await page.ask('(document.querySelector(\'[data-front-system-said="1"]\') || {}).textContent || null');
  res.warnings = await page.ask('[...document.querySelectorAll(\'[data-unit-warnings] li\')].map((li) => li.getAttribute(\'data-warning-code\') + \': \' + li.textContent.trim())');
  return res;
}
/** The joints row's button (data-joints) pressed by the real mouse; the status read back. */
async function jointsPress(page, unitId, system) {
  await selectUnit(page, unitId);
  await sectionOpen(page, 'Construction');
  const btn = await boxOf(page, `document.querySelector('[data-joints-row] [data-joints=${j(system)}]')`);
  if (!btn) return { ok: false, why: `control not found: [data-joints=${system}]` };
  const disabled = await page.ask(`document.querySelector('[data-joints-row] [data-joints=${j(system)}]').disabled`);
  await clickWith(page, btn.x, btn.y);
  await until(page, `(${S}.units.find((u) => u.id === ${j(unitId)}) || { params: {} }).params.joints_system === ${j(system)}`, 4000);
  await page.sleep(900);
  return { ok: true, disabled, ...(await jointsRow(page)) };
}
const jointsRow = (page) => page.ask(`(() => { const row = document.querySelector('[data-joints-row]'); if (!row) return { status: null, lit: null };
  const lit = [...row.querySelectorAll('[data-joints]')].filter((b) => b.classList.contains('cc-btn-gold')).map((b) => b.getAttribute('data-joints'));
  return { status: (row.querySelector('[data-joints-status]') || {}).textContent || null, lit, disabled: [...row.querySelectorAll('[data-joints]')].filter((b) => b.disabled).map((b) => b.getAttribute('data-joints')) }; })()`);
/** Output > CNC / DXF on the selected unit: what the app said (the refusal, or the files). */
async function cncExport(page) {
  const said0 = await saidCount(page);
  const ok = await menu(page, 'Output', 'CNC / DXF');
  await page.sleep(2500);
  const shut = await closeModals(page);
  return { ok, said: await saidSince(page, said0), shut };
}

// ============================================================================
// PAGE 1: f17 THE HOOD, f18 THE LIFTS
// ============================================================================
if (pageWanted(1)) {
  const page = await open();
  let hob = null; let hood = null;
  try {
    begin('f17', 'THE HOOD: CANOPY OR SHORT, WITH THE CLEARANCE PROPOSED');
    await pro(page, { base: BASE });
    await recordSaid(page);
    note('the build under the mouse', `${await stamp(page) || 'no stamp read'}; node HEAD ${head}; app ${BASE}`);
    const room = await roomNow(page);
    note('the stage', `a new project through the store (T74 pro()); room ${room.corners.map((c, i) => { const b = room.corners[(i + 1) % room.corners.length]; return `wall ${i + 1} ${Math.round(Math.hypot(b.x - c.x, b.y - c.y))}`; }).join(', ')}, height ${room.height}`);
    const want650 = await profileNum(page, 'hood.clearance.induction');
    const want750 = await profileNum(page, 'hood.clearance.gas');
    note('the profile\'s numbers (hood.clearance)', `induction ${want650}, gas ${want750}; wallUnit mountHeight ${await profileNum(page, 'wallUnit.defaults.mountHeight')}; hoodShort ${j(await profileNum(page, 'hoodShort.defaults'))}; hoodCanopy ${j(await profileNum(page, 'hoodCanopy.defaults'))}`);
    // THE HOB: Library, Kitchen, Base units, Hob drawer unit, 3x.
    const H = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units', 'hob-drawer-unit'], entry: 'hob-drawer-3' });
    hob = H.unit ? await unitOf(page, H.unit.id) : null;
    check('Library, Kitchen, Base units, Hob drawer unit, 3x (the real rows)', hob && hob.type === 'BUDR_HOB' && hob.hob,
      'a BUDR_HOB on a wall with params.hob true (the hob flag the Check reads)', hob ? `${hob.type} ${hob.num} on wall ${hob.wall + 1} at x ${hob.x}, ${hob.w} x ${hob.h} x ${hob.d}, hob ${hob.hob}, hob_kind ${hob.hobKind || 'unset (induction)'}` : `row pressed ${H.ok}, nothing added; said ${j(H.said)}`);
    if (!hob) throw new Error('no hob');
    if (!(await sceneCheck(page, 'after the hob is drawn'))) throw new Error(DEAD);
    // THE HOOD over it: Library, Kitchen, Wall units, Hood unit. The library
    // places beside the selection; a hood that lands beside the hob is DRAGGED
    // over it along the wall with the real mouse.
    const said0 = await saidCount(page);
    const D = await addFromLibrary(page, { category: 'Kitchen', path: ['wall-units'], entry: 'hood-unit' });
    hood = D.unit ? await unitOf(page, D.unit.id) : null;
    check('Library, Kitchen, Wall units, Hood unit', hood && hood.type === 'WUD_HOOD' && hood.wall === hob.wall,
      'a WUD_HOOD on the hob\'s wall at the wall line', hood ? `${hood.type} ${hood.num} on wall ${hood.wall + 1} at x ${hood.x}..${r1(hood.x + hood.w)}, mount ${hood.mount}, ${hood.w} x ${hood.h} x ${hood.d}; the hob spans x ${hob.x}..${r1(hob.x + hob.w)}` : `row pressed ${D.ok}, nothing added; said ${j(D.said)}`);
    if (!hood) throw new Error('no hood');
    const overlaps = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0;
    if (!overlaps(hood, hob)) {
      const grab = hood.panels.find((p) => p.part === 'FRONT') || hood.panels[0];
      const dx = hob.x - hood.x;
      const drag = await dragAlong(page, hood.id, grab.id, dx);
      await page.sleep(1200);
      hood = await unitOf(page, hood.id);
      check(`the hood landed beside the hob: a REAL drag along the wall by ${dx} mm (grabbed ${grab.id})`, drag && overlaps(hood, hob),
        `the hood over the hob (x spans overlap)`, `drag ${drag ? `${j(drag.from)} -> ${j(drag.to)}` : 'no pixel of the hood in reach'}; hood now x ${hood.x}..${r1(hood.x + hood.w)}; hob x ${hob.x}..${r1(hob.x + hob.w)}`);
    }
    await page.sleep(800);
    const msgs = await messagesNow(page);
    const said = await saidSince(page, said0);
    const prop = said.find((m) => /^yellow: .*hood's underside/.test(m) && /\[Raise hood to \d+ mm\]/.test(m)) || null;
    const findings = await checkOpen(page);
    const f34 = findings.find((f) => f.n === 34) || null;
    check('the hood over the hob: the yellow proposal (recorded off the ui store as it was said) and Check #34 (the Check panel opened by its toolbar button)',
      prop && f34 && f34.actions.some((a) => /raise-hood: Raise hood to \d+ mm/.test(a)) && new RegExp(`asks ${want650} mm`).test(f34.text),
      `a yellow "<hood>: the hood's underside is N mm over the hob's worktop (<hob>); induction asks ${want650} mm..." with a button "Raise hood to M mm", and #34 Hood clearance over the hob saying the same (N = the hood's mount ${hood.mount ?? 1500} less the worktop top over the hob, the hob's ${hob.h} on its plinth plus the T75 slab; M = that top + ${want650}; engine/hoodClearance.js)`,
      `messages ${j(msgs.map((m) => `${m.level}: ${m.message}${m.action ? ` [${m.action}]` : ''}`))}; Check findings ${j(findings)}; said since the hood ${j(said)}`);
    await shot(page, 'f17-walk-01-proposal-and-check.png');
    // THE ONE CLICK, on the Check panel's own button.
    const raise = f34 ? await boxOf(page, 'document.querySelector(\'[data-check-finding="34"] [data-check-action="raise-hood"]\')') : null;
    const toMm = f34 ? Number((f34.actions.find((a) => /raise-hood/.test(a)) || '').match(/to (\d+(?:\.\d+)?) mm/)?.[1]) : null;
    if (raise) await clickWith(page, raise.x, raise.y);
    await page.sleep(1200);
    const flight = await page.ask(`(() => { const u = ${UI}; const a = u.modalArgs || {}; const unit = ${S}.units.find((x) => x.id === a.unitId); return { modal: u.modal || null, unitId: a.unitId || null, unitNum: unit ? unit.params.unit_num : null, selected: u.selectedUnitId || null, title: (document.querySelector('[data-modal-shell] h2, [data-modal-shell] header') || {}).textContent || null }; })()`);
    await shot(page, 'f17-walk-02-after-the-click.png');
    const hood2 = await unitOf(page, hood.id);
    const findings2 = await checkOpen(page);
    note('what the Check row\'s button opened (the flight to the subject)', `window ${flight.modal} for unit ${flight.unitNum} (${flight.unitId}); selected ${flight.selected}; the finding's subject was the hood ${hood.num} (${hood.id})${flight.unitId && flight.unitId !== hood.id ? '; THE WINDOW IS NOT THE HOOD\'S' : ''}`);
    const shut = await closeModals(page);
    await checkClose(page);
    const selH = await selectUnit(page, hood.id);
    await sectionOpen(page, 'Carcass');
    const mountField = await page.ask(`(() => { const i = ${byLabel('Carcass', 'Mount height', 'input')}; return i ? i.value : null; })()`);
    check(`the Check row's button "Raise hood to ${toMm} mm" clicked with the real mouse (then the ${shut.seen.join(', ') || 'no'} window shut by ${shut.by || 'nothing'}; the hood selected ${how(selH)})`, raise && toMm != null && near(hood2.mount, toMm, 0.6) && !findings2.some((f) => f.n === 34) && near(Number(mountField), toMm, 0.6),
      `the hood's mount_height becomes ${toMm}; the RightPanel's Mount height reads it; the #34 row goes`,
      `button ${raise ? `at ${raise.x},${raise.y}` : 'NOT IN THE DOM'}; mount_height ${hood2.mount}; Mount height field "${mountField}"; Check findings after ${j(findings2.map((f) => `#${f.n}`))}; messages ${j((await messagesNow(page)).map((m) => `${m.level}: ${m.message.slice(0, 90)}`))}`);
    await shot(page, 'f17-walk-02-raised.png');
    // THE GAS HOB: the Hob select on the hob unit.
    await checkClose(page);
    const selHob = await selectUnit(page, hob.id);
    await sectionOpen(page, 'Carcass');
    const hobSel = await page.ask(`Boolean(${byLabel('Carcass', 'Hob', 'select')})`);
    const said1 = await saidCount(page);
    const gas = hobSel ? await choose(page, byLabel('Carcass', 'Hob', 'select'), 'gas') : { ok: false, why: 'control not found: the Hob select (label "Hob" in Carcass)' };
    await until(page, `(${S}.units.find((u) => u.id === ${j(hob.id)}) || { params: {} }).params.hob_kind === 'gas'`, 4000);
    await page.sleep(1200);
    const hob2 = await unitOf(page, hob.id);
    const said2 = await saidSince(page, said1);
    const prop2 = said2.find((m) => /^yellow: .*gas asks/.test(m) && /\[Raise hood to \d+ mm\]/.test(m)) || null;
    await domFrame(page, 'document.querySelector(\'[data-section="Carcass"]\')', 'f17-walk-03-hob-select.png');
    const findings3 = await checkOpen(page);
    const f34b = findings3.find((f) => f.n === 34) || null;
    check(`the hob selected (${how(selHob)}), Carcass, the Hob select set to Gas by the real select (${gas.ok ? `"${gas.label}"` : gas.why})`,
      gas.ok && hob2.hobKind === 'gas' && f34b && new RegExp(`gas asks ${want750} mm`).test(f34b.text) && prop2,
      `hob_kind gas; the clearance asked becomes ${want750}: a new #34 and a new yellow with "Raise hood to ${r1(hob.h + 38 + want750)} mm"`,
      `hob_kind ${hob2.hobKind}; #34 ${f34b ? j(f34b) : 'none'}; yellow ${prop2 ? `"${prop2}"` : 'none'}; said since ${j(said2)}`);
    await shot(page, 'f17-walk-03-gas.png');
    await checkClose(page);
    // THE CANOPY AND THE SHORT HOOD beside the hood.
    await selectUnit(page, hood.id);
    const C = await addFromLibrary(page, { category: 'Kitchen', path: ['wall-units'], entry: 'hood-canopy' });
    const canopy = C.unit ? await unitOf(page, C.unit.id) : null;
    const front = canopy ? canopy.panels.find((p) => p.id === 'CANOPY-FRONT') : null;
    const sides = canopy ? canopy.panels.filter((p) => p.role === 'side') : [];
    const bottom = canopy ? canopy.panels.find((p) => p.role === 'bottom') : null;
    const top = canopy ? canopy.panels.find((p) => p.role === 'top') : null;
    const proj = await profileNum(page, 'hoodCanopy.defaults.bottomProjectionMm');
    check('the hood selected, Library, Kitchen, Wall units, Hood canopy', canopy && canopy.type === 'WUD_HOOD_CANOPY' && front && front.part === 'FALSE-FRONT' && sides.length === 2 && sides.every((s) => s.outlinePts != null && s.outlinePts > 4) && bottom && top && bottom.box && top.box && bottom.box.d > top.box.d,
      `a WUD_HOOD_CANOPY: CANOPY-FRONT (FALSE-FRONT, front material) sloping, two trapezoid sides (an outline that is not the rectangle's four points), the bottom ${proj} deeper than the top, no door`,
      canopy ? `${canopy.type} ${canopy.num} at x ${canopy.x}, mount ${canopy.mount}, ${canopy.w} x ${canopy.h} x ${canopy.d}; doors ${canopy.doors}; front ${front ? `${front.id} ${front.part} ${front.w} x ${front.h} x ${front.t}` : 'NONE'}; sides ${j(sides.map((s) => `${s.id} outline ${s.outlinePts} pts, box d ${s.box && s.box.d}`))}; bottom d ${bottom && bottom.box && bottom.box.d}, top d ${top && top.box && top.box.d}; hardware ${j(canopy.hardware.map((h) => `${h.role} x${h.qty}`))}` : `row pressed ${C.ok}, nothing added; said ${j(C.said)}`);
    const SH = await addFromLibrary(page, { category: 'Kitchen', path: ['wall-units'], entry: 'hood-unit-short' });
    const short = SH.unit ? await unitOf(page, SH.unit.id) : null;
    const wallLine = (await profileNum(page, 'wallUnit.defaults.mountHeight')) + (await profileNum(page, 'wallUnit.defaults.height'));
    await checkClose(page);
    await selectUnit(page, short ? short.id : hood.id);
    await sectionOpen(page, 'Carcass');
    const shortMount = await page.ask(`(() => { const i = ${byLabel('Carcass', 'Mount height', 'input')}; return i ? i.value : null; })()`);
    check('Library, Kitchen, Wall units, Hood unit, short', short && short.type === 'WUD_HOOD_SHORT' && near(short.mount, 1560, 0.6) && near(short.mount + short.h, wallLine, 0.6) && near(Number(shortMount), 1560, 0.6),
      `a WUD_HOOD_SHORT hung at 1560 (the RightPanel's Mount height says so), 660 high, its top on the wall line ${wallLine}`,
      short ? `${short.type} ${short.num} at x ${short.x}, mount ${short.mount} (field "${shortMount}"), ${short.w} x ${short.h} x ${short.d}: top at ${r1(short.mount + short.h)}; doors ${short.doors}` : `row pressed ${SH.ok}, nothing added; said ${j(SH.said)}`);
    await shot(page, 'f17-walk-04-canopy-and-short.png');
    if (canopy) {
      // The slope reads from the side: the camera turned by a real drag on empty floor, then the canopy close up.
      const turned = await orbitFree(page, 200, -60);
      note('the camera turned to see the canopy\'s slope (a real drag on empty floor)', `turned ${turned}`);
      await pieceFrame(page, canopy.id, canopy.panels.map((p) => p.id), 'f17-walk-05-canopy-close.png');
    }
    // THE BOM: the canopy's boards.
    if (canopy) {
      const parts = await bomParts(page);
      const mine = parts ? parts.rows.filter((r) => r.unit === canopy.num) : [];
      const frontRow = mine.find((r) => r.id === 'CANOPY-FRONT') || null;
      check('BOM (the Bill of materials button), Parts: the canopy\'s rows', frontRow && mine.length >= 5,
        'a CANOPY-FRONT row of the front material and the carcass boards (two sides, bottom, top, back)', `${mine.length} row(s) of ${canopy.num}: ${j(mine.map((r) => `${r.id} ${r.material} ${r.w} x ${r.h} x${r.qty}`))}`);
      await bomFrame(page, 'f17-walk-06-bom-canopy.png');
      await bomClose(page);
    }
  } catch (e) {
    await ended(page, 'f17', e);
  }

  try {
    begin('f18', 'LIFT-UP WALL UNITS, BLUM AVENTOS: HK top lifts, HL refuses the 720, HF folds');
    if (!(await alive(page))) throw new Error(DEAD);
    const W = await addFromLibrary(page, { category: 'Kitchen', path: ['wall-units'], entry: 'wall' });
    const doorsAdded = W.unit ? await addDoors(page, W.unit.id) : 'no unit';
    const wud = W.unit ? await unitOf(page, W.unit.id) : null;
    const leaf = wud ? `${wud.num}-F` : null;
    check(`Library, Kitchen, Wall units, Standard; DOORS, Add doors (${doorsAdded})`, wud && wud.type === 'WUD' && wud.w === 600 && wud.h === 720 && wud.doors === 1 && wud.panels.some((p) => p.id === leaf),
      `a WUD 600 x 720 with one door ${leaf || '<num>-F'} (a library unit arrives without a leaf; the Doors section's own button adds it)`, wud ? `${wud.type} ${wud.num} at x ${wud.x}, ${wud.w} x ${wud.h} x ${wud.d}, mount ${wud.mount}, doors ${wud.doors}, leaves ${j(wud.panels.filter((p) => p.part === 'FRONT').map((p) => p.id))}, hinges line ${j(wud.hardware.filter((h) => /hinge/.test(h.role)).map((h) => `${h.role} x${h.qty}`))}, drills ${j(wud.drillKinds)}` : `row pressed ${W.ok}, nothing added; said ${j(W.said)}`);
    if (!wud) throw new Error('no WUD');
    const hinged = wud.hardware.filter((h) => h.role === 'hinges').reduce((n, h) => n + Number(h.qty || 0), 0);
    // HK TOP.
    const hk = await frontSystem(page, wud.id, 'hk');
    const u1 = await unitOf(page, wud.id);
    const leaf1 = u1.panels.find((p) => p.id === leaf) || null;
    const lines1 = await bomOrder(page);
    check(`the WUD selected, Front opens (data-front-system) set to HK top by the real select (${hk.ok ? `"${hk.label}"` : hk.why})`,
      hk.ok && u1.frontSystem === 'hk' && u1.lift && u1.lift.system === 'hk' && u1.lift.article && u1.lift.holes === 0 && leaf1 && leaf1.lift && leaf1.lift.system === 'hk' && !leaf1.hinge && !u1.hardware.some((h) => h.role === 'hinges') && sumQty(lines1, 'lift_unit') >= 1 && sumQty(lines1, 'lift_caps') >= 1 && sumQty(lines1, 'lift_bracket') >= 1 && sumQty(lines1, 'hinges') === 0,
      `front_system hk; derived.lift hk with a set article and zero holes; the leaf carries meta.lift and no hinge; the hinge line (was x${hinged}) and the cups go; the BOM Order tab shows lift_unit, lift_caps, lift_bracket`,
      `front_system ${u1.frontSystem}; derived.lift ${u1.lift ? `${u1.lift.system} ${u1.lift.label} set ${u1.lift.article}, caps ${u1.lift.caps_article}, bracket ${u1.lift.bracket_article}, angle ${u1.lift.angle_deg}, holes ${u1.lift.holes}, refused ${u1.lift.refused}` : 'none'}; leaf ${leaf1 ? `${leaf1.id} lift ${j(leaf1.lift)} hinge ${leaf1.hinge}` : 'MISSING'}; engine hardware ${j(u1.hardware.map((h) => `${h.role} x${h.qty}`))}; drills ${j(u1.drillKinds)}; BOM ${sayLines(lines1, ['lift_unit', 'lift_arm', 'lift_caps', 'lift_bracket', 'hinges'])}`);
    check('the engine\'s sentence under the select (data-front-system-said)', hk.said && /AVENTOS HK/.test(hk.said) && /zero holes/.test(hk.said), 'names AVENTOS HK top, its set, the front weight and "zero holes"', j(hk.said));
    note('the unit\'s warnings with HK top on the 720 WUD (the panel\'s list)', j(hk.warnings));
    await bomFrame(page, 'f18-walk-02-bom-hk.png');
    await bomClose(page);
    await shot(page, 'f18-walk-01-hk-shut.png');
    // THE LIFT: the leaf swings up about its top edge.
    const before = await meshesOf(page, wud.id, [leaf]);
    const opened = await openLeaf(page, wud.id, leaf);
    const after = await meshesOf(page, wud.id, [leaf]);
    const b = before && before[leaf]; const a = after && after[leaf];
    // About the TOP edge: after the swing the box's LOWEST point is the pivot
    // edge (the top edge, less the leaf's thickness turned), its highest the
    // free edge above the carcass, and the free edge stands out of the wall.
    const pivotStays = b && a && near(a.unit.y[0], b.unit.y[1], 30);
    const freeUp = b && a && (a.unit.y[1] - b.unit.y[1]) > 150;
    const outward = b && a && (a.unit.z[1] - b.unit.z[1]) > 200;
    const deg = u1.lift ? Number(u1.lift.angle_deg) : null;
    const expectY = deg && b ? r1(b.unit.y[1] + b.unitSize.y * Math.sin(((deg - 90) * Math.PI) / 180)) : null;
    const expectZ = deg && b ? r1(b.unit.z[1] + b.unitSize.y * Math.cos(((deg - 90) * Math.PI) / 180)) : null;
    check(`the leaf opened by the app's own gesture (${opened ? opened.by : 'NO gesture reached it'})`, opened && pivotStays && freeUp && outward,
      `the leaf lifts about its TOP edge: the pivot edge stays at the carcass top (within 30 mm), the free edge rises over 150 mm above it and swings out over 200 mm (HK top ${deg} degrees: the free edge about y ${expectY}, z ${expectZ})`,
      `before ${b ? `y ${j(b.unit.y)} z ${j(b.unit.z)}` : 'no mesh'}; after ${a ? `y ${j(a.unit.y)} z ${j(a.unit.z)}` : 'no mesh'}`);
    await shot(page, 'f18-walk-03-hk-open.png');
    await pieceFrame(page, wud.id, [leaf, 'TOP', 'BUL', 'BUR'], 'f18-walk-03-hk-open-close.png');
    const bodies = await kitBodies(page, wud.id);
    note('the bodies the scene draws on the HK unit (ccKitBody / ccLiftBody)', j(bodies));
    await shutLeaves(page);
    // HL: refused for a 720 cabinet (KH 300 to 580).
    const hl = await frontSystem(page, wud.id, 'hl');
    const u2 = await unitOf(page, wud.id);
    const cab = (hl.warnings || []).find((w) => /^LIFT_CABINET/.test(w)) || null;
    check(`Front opens set to HL (${hl.ok ? `"${hl.label}"` : hl.why})`, hl.ok && u2.frontSystem === 'hl' && cab && /300 to 580/.test(cab) && /720/.test(cab),
      'a refusal in words in the unit\'s warnings (LIFT_CABINET): AVENTOS HL fits a cabinet 300 to 580 mm high; this one is 720 mm',
      `front_system ${u2.frontSystem}; derived.lift ${u2.lift ? `${u2.lift.system} set ${u2.lift.article} refused ${u2.lift.refused}` : 'none'}; warnings on the panel ${j(hl.warnings)}; engine warnings ${j(u2.warnings.filter((w) => /^LIFT/.test(w)))}; said ${j(hl.said)}`);
    await domFrame(page, '(document.querySelector(\'[data-unit-warnings]\') || document.querySelector(\'[data-section="Carcass"]\') || {}).closest ? (document.querySelector(\'[data-unit-warnings]\') || document.querySelector(\'[data-section="Carcass"]\')).closest(\'aside\') : null', 'f18-walk-04-hl-refusal.png');
    // HF: two halves, F-UP and F-LOW.
    const hf = await frontSystem(page, wud.id, 'hf');
    const u3 = await unitOf(page, wud.id);
    const up = u3.panels.find((p) => p.id === `${wud.num}-F-UP`) || null;
    const low = u3.panels.find((p) => p.id === `${wud.num}-F-LOW`) || null;
    const lines3 = await bomOrder(page);
    check(`Front opens set to HF (${hf.ok ? `"${hf.label}"` : hf.why})`, hf.ok && u3.frontSystem === 'hf' && up && low && up.lift && up.lift.child === low.id && low.lift && low.lift.parent === up.id && !u3.panels.some((p) => p.id === leaf) && sumQty(lines3, 'lift_unit') >= 1,
      `two halves ${wud.num}-F-UP (the parent) and ${wud.num}-F-LOW (hung on the upper), the one leaf gone, the HF lift lines in the BOM`,
      `front_system ${u3.frontSystem}; leaves ${j(u3.panels.filter((p) => p.part === 'FRONT').map((p) => `${p.id} ${p.w} x ${p.h} lift ${j(p.lift)}`))}; derived.lift ${u3.lift ? `${u3.lift.system} set ${u3.lift.article} arm ${u3.lift.arm_article} hinges ${u3.lift.hinges} fold ${u3.lift.halves ? j(u3.lift.halves) : ''}` : 'none'}; BOM ${sayLines(lines3, ['lift_unit', 'lift_arm', 'lift_caps', 'lift_bracket', 'lift_hinges', 'hinges'])}; said ${j(hf.said)}`);
    await bomClose(page);
    const upId = `${wud.num}-F-UP`; const lowId = `${wud.num}-F-LOW`;
    const before3 = await meshesOf(page, wud.id, [upId, lowId]);
    const opened3 = up ? await openLeaf(page, wud.id, upId) : null;
    const after3 = await meshesOf(page, wud.id, [upId, lowId]);
    const d = (id, k, i) => (before3 && after3 && before3[id] && after3[id] ? r1(after3[id].unit[k][i] - before3[id].unit[k][i]) : null);
    const lowMoved = after3 && after3[lowId] && before3 && before3[lowId] && (Math.abs(d(lowId, 'y', 0)) > 100 || Math.abs(d(lowId, 'z', 1)) > 100);
    const upMoved = after3 && after3[upId] && before3 && before3[upId] && (Math.abs(d(upId, 'z', 1)) > 100);
    check(`the upper half opened by the app's own gesture (${opened3 ? opened3.by : 'NO gesture reached it'})`, opened3 && upMoved && lowMoved,
      'the upper half swings up about the carcass top and the lower half folds with it (both meshes move over 100 mm)',
      `F-UP: dy top ${d(upId, 'y', 1)}, dy bottom ${d(upId, 'y', 0)}, dz out ${d(upId, 'z', 1)}; F-LOW: dy top ${d(lowId, 'y', 1)}, dy bottom ${d(lowId, 'y', 0)}, dz out ${d(lowId, 'z', 1)}; before ${j(before3)}`);
    await shot(page, 'f18-walk-05-hf-open.png');
    await pieceFrame(page, wud.id, [upId, lowId, 'TOP', 'BUL', 'BUR'], 'f18-walk-05-hf-open-close.png');
    await shutLeaves(page);
    const findings = await checkOpen(page);
    const f35 = findings.filter((f) => f.n === 35);
    const f4 = findings.filter((f) => f.n === 4 && new RegExp(`${wud.num}-F`).test(f.text));
    check('the Check panel on the HF unit: no door-weight finding (#4) on a lift leaf (the lift carries it; it has no hinges by design)', f4.length === 0,
      'no #4 row naming WU-F-UP / WU-F-LOW', f4.length ? j(f4.map((f) => f.text)) : 'none');
    const room = await roomNow(page);
    note('Check #35 (a lift leaf against the ceiling, a cornice, the unit above)', `${f35.length ? j(f35) : 'silent'}; room height ${room.height}, the WUD top at ${r1((u3.mount ?? 1500) + u3.h)}, HF rise ${u3.lift ? u3.lift.rise_mm : '?'}; all findings ${j(findings.map((f) => `#${f.n} ${f.text.slice(0, 80)}`))}`);
    await shot(page, 'f18-walk-06-check.png');
    await checkClose(page);
  } catch (e) {
    await ended(page, 'f18', e);
  }
  const errs = pageErrors(page);
  note('page 1: console errors', errs.length ? errs.slice(0, 4).join(' | ') : 'none');
  await page.close();
}

// ============================================================================
// PAGE 2: f19 THE COMPANY'S CHOICE AND THE DOWELS, f20 BISCUITS AND CABINEO
// ============================================================================
if (pageWanted(2)) {
  const page = await open();
  let bud = null;
  try {
    begin('f19', 'DOWELS 6 MM EVERY 250, MINIMUM TWO; THE COMPANY CHOOSES THE SYSTEM');
    await pro(page, { base: BASE });
    await recordSaid(page);
    note('the build under the mouse', `${await stamp(page) || 'no stamp read'}; node HEAD ${head}; app ${BASE}`);
    note('the profile\'s dowel (joints.dowel)', j(await profileNum(page, 'joints.dowel')));
    // DATABASE > COMPANY DEFAULTS.
    const opened = await menu(page, 'Database', 'Company defaults');
    const modal = await until(page, `${UI}.modal === 'company-defaults' && Boolean(document.querySelector('[data-company-field="joints_system"] select'))`, 5000);
    const anon = await page.ask('(document.querySelector(\'[data-company-anonymous="1"]\') || {}).textContent || null');
    check('Database, Company defaults (the menu, real clicks)', opened && modal, 'the Company defaults window with its Joints select (data-company-field=joints_system)',
      `menu item ${opened}; modal ${await modalNow(page)}; account note: ${j(anon)}`);
    if (!modal) throw new Error('no company defaults modal');
    const res = await choose(page, 'document.querySelector(\'[data-company-field="joints_system"] select\')', 'dowel');
    await page.sleep(600);
    const saveState = await page.ask('(() => { const b = document.querySelector(\'[data-company-save="1"]\'); return b ? { text: b.textContent.trim(), disabled: b.disabled } : null; })()');
    check(`the Joints select set to Dowels by the real select (${res.ok ? `"${res.label}"` : res.why})`, res.ok && res.after && res.after.value === 'dowel',
      'the select reads dowel (the row is set locally; Save needs an account and says so)', `select ${j(res.after && res.after.value)}; options ${j(res.after && res.after.labels)}; Save button ${j(saveState)}`);
    await domFrame(page, 'document.querySelector(\'[data-modal-name="company-defaults"]\') || document.querySelector(\'[data-company-defaults="1"]\')', 'f19-walk-01-company-defaults.png');
    const closeBtn = await boxOf(page, '[...document.querySelectorAll(\'[data-modal-name="company-defaults"] button, [data-modal-shell] button\')].find((b) => b.offsetParent && b.textContent.trim() === \'Close\')');
    if (closeBtn) await clickWith(page, closeBtn.x, closeBtn.y); else await key(page, 'Escape');
    await page.sleep(500);
    // A NEW PROJECT, the stage set again (the store, as pro() sets it), so what
    // a NEW project inherits from the row is what is read.
    await page.ask(`(() => { ${S}.newProject('T78 walk DE, after the company row'); const ui = ${UI}; ui.openEditor(); ui.closeModal(); ui.closeLibrary && ui.closeLibrary(); return true; })()`);
    await page.waitFor('window.__cc.views && window.__cc.views.room', { timeout: 45000 });
    await page.sleep(2000);
    const design = await designNow(page);
    note('the new project (the stage, through the store): design.joints', j(design));
    const B = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'door-base' });
    bud = B.unit ? await unitOf(page, B.unit.id) : null;
    check('Library, Kitchen, Base units, Standard', bud && bud.type === 'BUD', 'a BUD', bud ? `${bud.type} ${bud.num} at x ${bud.x}, ${bud.w} x ${bud.h} x ${bud.d}` : `row pressed ${B.ok}, nothing added`);
    if (!bud) throw new Error('no BUD');
    if (!(await sceneCheck(page, 'after the BUD is drawn'))) throw new Error(DEAD);
    const sel = await selectUnit(page, bud.id);
    const cons = await sectionOpen(page, 'Construction');
    const row = await jointsRow(page);
    const pitch = await profileNum(page, 'joints.dowel.pitchMm');
    check(`the BUD selected (${how(sel)}), Construction (${cons}): the Joints row`, row.status && /^\d+ dowels, \d+ edge bores by hand/.test(row.status) && /the dowel pattern is proposed, not confirmed by the owner: the CNC export refuses it/.test(row.status) && j(row.lit) === j(['dowel']) && bud.jointsParam == null && bud.joints && bud.joints.system === 'dowel' && (design && design.system === 'dowel'),
      `status "N dowels, N edge bores by hand \\u00b7 the dowel pattern is proposed, not confirmed by the owner: the CNC export refuses it", the Dowel button lit, NO params.joints_system on the unit (the company row through the project's design.joints.system = dowel; pitch ${pitch})`,
      `status ${j(row.status)}; lit ${j(row.lit)}; disabled ${j(row.disabled)}; params.joints_system ${j(bud.jointsParam)}; derived.joints ${j(bud.joints && { system: bud.joints.system, dowels: bud.joints.dowels, edge_bores: bud.joints.edge_bores, gate: bud.joints.gate, joints: bud.joints.joints })}; design.joints ${j(design)}; warnings ${j(bud.warnings)}`);
    await domFrame(page, 'document.querySelector(\'[data-joints-row]\')', 'f19-walk-02-joints-row-dowel.png');
    // PUZZLE, by the unit's own button: an override.
    const pz = await jointsPress(page, bud.id, 'puzzle');
    const bud2 = await unitOf(page, bud.id);
    check(`Puzzle clicked on the unit's row (${pz.ok ? 'a real click' : pz.why})`, pz.ok && bud2.jointsParam === 'puzzle' && /^Skylon puzzle/.test(pz.status || '') && j(pz.lit) === j(['puzzle']) && !(bud2.joints && bud2.joints.system === 'dowel'),
      'params.joints_system puzzle (the unit overrides the company), status "Skylon puzzle: tabs, sockets and dog bones", Puzzle lit', `params.joints_system ${j(bud2.jointsParam)}; status ${j(pz.status)}; lit ${j(pz.lit)}; derived.joints ${j(bud2.joints)}`);
    await domFrame(page, 'document.querySelector(\'[data-joints-row]\')', 'f19-walk-03-joints-row-puzzle.png');
    // DOWEL again, then the CNC export: refused in words.
    const dw = await jointsPress(page, bud.id, 'dowel');
    const bud3 = await unitOf(page, bud.id);
    const ex = await cncExport(page);
    const refusal = (ex.said || []).find((s) => /dowel pattern is proposed, not confirmed by the owner/.test(s)) || null;
    check(`Dowel clicked again (${dw.ok ? dw.status : dw.why}); Output, CNC / DXF (the menu, real clicks)`, dw.ok && bud3.joints && bud3.joints.system === 'dowel' && ex.ok && refusal && !(ex.said || []).some((s) => /DXF files exported/.test(s)),
      'the export refused in words: "the dowel pattern is proposed, not confirmed by the owner"; no ZIP', `menu ${ex.ok}; said ${j(ex.said)}; derived.joints ${bud3.joints ? bud3.joints.system : 'none'}`);
    await shot(page, 'f19-walk-04-cnc-refused.png');
    await checkClose(page);
  } catch (e) {
    await ended(page, 'f19', e);
  }

  try {
    begin('f20', 'BISCUITS ON THE CARCASS, AND CABINEO 8 / 12 FROM THE OUTSIDE FACE');
    if (!bud) throw new Error('no BUD from f19');
    if (!(await alive(page))) throw new Error(DEAD);
    for (const m of (await messagesNow(page))) if (m.level === 'error' || m.level === 'warn') { /* the yellows go on a click away */ }
    // BISCUIT.
    const bi = await jointsPress(page, bud.id, 'biscuit');
    const b1 = await unitOf(page, bud.id);
    check(`Biscuit clicked (${bi.ok ? 'a real click' : bi.why})`, bi.ok && b1.joints && b1.joints.system === 'biscuit' && /^\d+ biscuit sets, \d+ screws, the marks on the sides . the owner's own set, no gate$/.test(bi.status || '') && j(bi.lit) === j(['biscuit']),
      'status "N biscuit sets, N screws, the marks on the sides \\u00b7 the owner\'s own set, no gate", Biscuit lit, no warning', `status ${j(bi.status)}; lit ${j(bi.lit)}; derived.joints ${j(b1.joints && { system: b1.joints.system, sets: b1.joints.sets, screws: b1.joints.screws })}; warnings ${j(b1.warnings)}`);
    await domFrame(page, 'document.querySelector(\'[data-joints-row]\')', 'f20-walk-01-joints-row-biscuit.png');
    // CABINEO 12.
    const c12 = await jointsPress(page, bud.id, 'cabineo12');
    const b2 = await unitOf(page, bud.id);
    const top = b2.panels.find((p) => p.id === 'TOP') || null;
    const bottom = b2.panels.find((p) => p.id === 'BOTTOM') || null;
    const outsideBoards = b2.panels.filter((p) => p.machinedFace === 'outside').map((p) => p.id);
    check(`Cabineo 12 clicked (${c12.ok ? 'a real click' : c12.why})`, c12.ok && b2.joints && b2.joints.system === 'cabineo12' && /^Cabineo 12: \d+ pockets from the outside face, \d+ holes in the sides . the Cabineo pattern is proposed, not confirmed by the owner: the CNC export refuses it$/.test(c12.status || '') && j(c12.lit) === j(['cabineo12']) && top && top.machinedFace === 'outside' && bottom && bottom.machinedFace === 'outside' && top.pockets.length > 0,
      'status "Cabineo 12: N pockets from the outside face, N holes in the sides \\u00b7 the Cabineo pattern is proposed, not confirmed by the owner: the CNC export refuses it"; TOP and BOTTOM carry meta.machinedFace outside and the pockets',
      `status ${j(c12.status)}; lit ${j(c12.lit)}; derived.joints ${j(b2.joints && { system: b2.joints.system, variant: b2.joints.variant, pockets: b2.joints.pockets, holes: b2.joints.holes, gate: b2.joints.gate, mounting: b2.joints.mounting, machining: b2.joints.machining })}; outside-face boards ${j(outsideBoards)}; TOP ${top ? `label ${top.label}, pockets ${j(top.pockets)}` : 'MISSING'}; sides' holes ${j(b2.panels.filter((p) => p.role === 'side').map((p) => `${p.id} ${p.holes} holes`))}; drills ${j(b2.drillKinds)}; warnings ${j(b2.warnings)}`);
    await domFrame(page, 'document.querySelector(\'[data-joints-row]\')', 'f20-walk-02-joints-row-cabineo12.png');
    // THE SCENE'S GATE CAPTION over the unit (UnitView.jsx, userData.ccDowelGate): what it says on a Cabineo unit.
    const badge = await page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; let g = null;
      v.scene.traverse((o) => { if (!g && o.userData && o.userData.ccDowelGate === ${j(bud.id)}) g = o; });
      if (!g) return { present: false }; const texts = []; g.traverse((o) => { if (typeof o.text === 'string') texts.push(o.text); if (o.userData && typeof o.userData.text === 'string') texts.push(o.userData.text); if (o.name && /[a-z]/i.test(o.name)) texts.push('name:' + o.name); });
      return { present: true, texts: [...new Set(texts)] }; })()`);
    check('the scene\'s gate caption over the Cabineo 12 unit (the label the 3D draws while the gate is shut)', badge && badge.present && (badge.texts || []).some((t) => /Cabineo/.test(t)),
      'a caption naming the system that is cut (Cabineo 12: proposed, not confirmed)', `${badge ? (badge.present ? `present; texts the scene exposes ${j(badge.texts)}` : 'NOT drawn') : 'no scene'}; the source (src/3d/UnitView.jsx:3289) prints the constant "Dowels: proposed, not confirmed" for every system with a gate; the frame f20-walk-03-scene-cabineo12.png shows it`);
    // THE TOP FROM ABOVE: the camera turned by a real drag on empty floor.
    const turned = await orbitFree(page, 0, -220);
    const topAt = await pointOn(page, bud.id, 'TOP');
    if (topAt) { await page.wheel(topAt.x, topAt.y, -120, 12); await settleCamera(page); }
    const topMesh = await meshesOf(page, bud.id, ['TOP']);
    note('the camera turned to look down on the TOP (a real drag upward on empty floor, then the wheel over the TOP)', `turned ${turned}; TOP under the pointer ${topAt ? `at ${topAt.x},${topAt.y}` : 'NO (not the first thing under any pixel from this camera)'}; TOP mesh ${topMesh && topMesh.TOP ? `${topMesh.TOP.kind} ${topMesh.TOP.vertices} vertices (a carved board has more than a box's 24)` : 'none'}`);
    await pieceFrame(page, bud.id, ['TOP'], 'f20-walk-03-top-from-above.png');
    await shot(page, 'f20-walk-03-scene-cabineo12.png');
    // THE BOM: the NOTE row and the order lines.
    const parts = await bomParts(page);
    const noteRow = parts ? parts.rows.find((r) => /NOTE: Cabineo 12/.test(r.text) || /cabineo/i.test(r.id)) : null;
    const lines = await bomOrder(page);
    check('BOM, Parts: the Cabineo NOTE row; Order: the connector and cap lines', noteRow && /OUTSIDE FACE UP/i.test(noteRow.material || noteRow.text) && sumQty(lines, 'cabineo_connector') > 0 && sumQty(lines, 'cabineo_cap') > 0 && lines.some((l) => l.role === 'cabineo_connector' && /Cabineo 12/.test(`${l.label} ${l.spec}`)),
      'a NOTE row naming Cabineo 12, the pockets cut from the OUTSIDE face (OUTSIDE FACE UP) and the gate; cabineo_connector and cabineo_cap lines naming Cabineo 12',
      `note row ${noteRow ? j({ id: noteRow.id, material: noteRow.material }) : 'NONE'}; order ${sayLines(lines, ['cabineo_connector', 'cabineo_cap', 'cabineo_insert'])}`);
    await bomFrame(page, 'f20-walk-04-bom-cabineo12.png');
    await bomClose(page);
    // THE CNC EXPORT: refused naming the Cabineo pattern.
    await selectUnit(page, bud.id);
    const ex = await cncExport(page);
    const refusal = (ex.said || []).find((s) => /Cabineo pattern is proposed, not confirmed by the owner/.test(s)) || null;
    check('Output, CNC / DXF on the Cabineo 12 unit', ex.ok && refusal && !(ex.said || []).some((s) => /DXF files exported/.test(s)),
      'refused in words: "the Cabineo pattern is proposed, not confirmed by the owner"; no ZIP', `menu ${ex.ok}; said ${j(ex.said)}`);
    await shot(page, 'f20-walk-05-cnc-refused.png');
    await checkClose(page);
    // CABINEO 8.
    const c8 = await jointsPress(page, bud.id, 'cabineo8');
    const b3 = await unitOf(page, bud.id);
    const lines8 = await bomOrder(page);
    check(`Cabineo 8 clicked (${c8.ok ? 'a real click' : c8.why})`, c8.ok && b3.joints && b3.joints.system === 'cabineo8' && /^Cabineo 8: /.test(c8.status || '') && lines8.some((l) => l.role === 'cabineo_connector' && /Cabineo 8\b/.test(`${l.label} ${l.spec}`)),
      'status "Cabineo 8: ..." and the connector line says Cabineo 8', `status ${j(c8.status)}; lit ${j(c8.lit)}; order ${sayLines(lines8, ['cabineo_connector', 'cabineo_cap'])}`);
    await bomFrame(page, 'f20-walk-06-bom-cabineo8.png');
    await bomClose(page);
    // PUZZLE AGAIN.
    const pz = await jointsPress(page, bud.id, 'puzzle');
    const b4 = await unitOf(page, bud.id);
    check(`Puzzle clicked again (${pz.ok ? 'a real click' : pz.why})`, pz.ok && /^Skylon puzzle/.test(pz.status || '') && j(pz.lit) === j(['puzzle']) && !b4.panels.some((p) => p.machinedFace === 'outside') && !b4.hardware.some((h) => /cabineo/.test(h.role)),
      'the puzzle back: no outside-face board, no Cabineo line', `status ${j(pz.status)}; lit ${j(pz.lit)}; outside-face boards ${j(b4.panels.filter((p) => p.machinedFace === 'outside').map((p) => p.id))}; hardware ${j(b4.hardware.map((h) => h.role))}`);
    await domFrame(page, 'document.querySelector(\'[data-joints-row]\')', 'f20-walk-07-joints-row-puzzle.png');
  } catch (e) {
    await ended(page, 'f20', e);
  }
  const errs = pageErrors(page);
  note('page 2: console errors', errs.length ? errs.slice(0, 4).join(' | ') : 'none');
  await page.close();
}

// === THE LEDGER =============================================================
const fresh = process.argv.includes('--fresh');
const ledger = `${SHOTS}walk-de.txt`;
const today = new Date().toISOString().slice(0, 10);
const HEAD = [
  `T78 PARTS D AND E walk, ${today}, HEAD ${head}`,
  `(the app under the mouse: ${BASE}; its build stamp is the first NOTE of f17 and of f19)`,
  '',
  'CLAUDE.md T78 PART D (F17, F18) and PART E (F19, F20), walked section by section',
  'against npx vite preview of the branch (a dist built from the working tree),',
  'the hardware served from the silent showroom. Every gesture is a REAL mouse or',
  'key event at a DOM control\'s centre or at a pixel the scene\'s own raycaster',
  'says the thing is under (and the page says the canvas owns); the store is only',
  'READ, except to set the stage (a new project and the editor\'s door, T74 pro(),',
  'and in f19 a second new project after the company row is set). Line grammar:',
  '  <SECTION> <nn> PASS|FAIL | <gesture> | expect: <what was expected> | observed: <what was read>',
  '  <SECTION> -- NOTE  | <reading> | <value>',
  '  <SECTION> -- FRAME | <file>  (the frame is beside this file)',
  'A FAIL is written down, never patched.',
  '',
].join('\n');
const blocks = new Map();
if (!fresh && existsSync(ledger)) {
  let name = null;
  for (const line of readFileSync(ledger, 'utf8').split('\n')) {
    const m = line.match(/^=== (f\d\d) /);
    if (m) { name = m[1]; blocks.set(name, [line]); continue; }
    if (/^(PARTS D AND E:|SECTION |FRAMES )/.test(line)) { name = null; continue; }
    if (name && line.trim()) blocks.get(name).push(line);
  }
}
for (const name of new Set(steps.map((s) => s.section))) {
  const mine = steps.filter((s) => s.section === name);
  const top = mine.find((s) => s.header);
  const N = name.toUpperCase();
  blocks.set(name, [
    `=== ${name} ${top ? top.header : ''}`,
    `${N} -- NOTE  | walked at | ${top ? top.at : ''} UTC, HEAD ${head}`,
    ...mine.filter((s) => !s.header).map((s) => {
      if (s.frame) return `${N} -- FRAME | ${s.frame}`;
      if (s.note) return `${N} -- NOTE  | ${s.gesture} | ${s.got}`;
      return `${N} ${String(s.n).padStart(2, '0')} ${s.ok ? 'PASS' : 'FAIL'} | ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
    }),
  ]);
}
const names = [...blocks.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
const counts = names.map((n) => {
  const lines = blocks.get(n);
  return { n, pass: lines.filter((x) => /^F\d\d \d\d PASS/.test(x)).length, fail: lines.filter((x) => /^F\d\d \d\d FAIL/.test(x)).length };
});
const total = counts.reduce((s, c) => ({ pass: s.pass + c.pass, fail: s.fail + c.fail }), { pass: 0, fail: 0 });
const framesOf = (n) => blocks.get(n).filter((x) => /^F\d\d -- FRAME/.test(x)).map((x) => x.split(' | ').pop().trim());
const lost = names.flatMap(framesOf).filter((f) => !existsSync(`${SHOTS}${f}`));
if (lost.length) process.stdout.write(`FRAMES MISSING ON DISK: ${lost.join(', ')}\n`);
writeFileSync(ledger, ascii([
  HEAD,
  ...names.flatMap((n) => [...blocks.get(n), '']),
  ...counts.map((c) => `SECTION ${c.n}: ${c.pass} pass, ${c.fail} fail`),
  ...names.map((n) => { const mine = framesOf(n); return `FRAMES ${n} (${mine.length}): ${mine.join(', ')}${lost.some((f) => mine.includes(f)) ? ' (MISSING ON DISK: ' + mine.filter((f) => lost.includes(f)).join(', ') + ')' : ''}`; }),
  `PARTS D AND E: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail`,
  '',
].join('\n')));
const failed = steps.filter((s) => !s.header && !s.note && !s.frame && !s.ok);
process.stdout.write(`\nPARTS D AND E: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail\nfailed this run: ${failed.length}; frames ${frames.join(', ')}\n`);
await showroomDown();
process.exit(failed.length ? 1 : 0);
