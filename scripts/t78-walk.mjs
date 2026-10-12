#!/usr/bin/env node
// T78 PART A, THE ACCEPTANCE WALK OF THE L CORNER (CLAUDE.md T78 F1 to F9)
//
// CLAUDE.md T78 TESTS AND PROOF: "scripts/t78-walk.mjs, REAL mouse, PRO and
// retail where retail is named, frames verify/t78/fNN-*.png, output
// verify/t78/walk.txt". PART A names no retail, so every section here is PRO,
// the main app at /.
//
// Every gesture is the browser's own input pipe (CDP Input.dispatchMouseEvent
// / Input.dispatchKeyEvent / Input.insertText), aimed at a DOM control's
// centre or at a pixel where the scene's own raycaster says the thing is the
// nearest drawn object and the page says the canvas owns the pixel (T74's
// pointOn, T75's reachFree, helperAt and figureFree). A native select is
// driven as T75's harness drives one (a real click, the arrows, Enter). The
// store is READ to say what happened (window.__cc.project.getState(),
// window.__cc.ui.getState(), window.__cc.views.room.three); it is never
// written to make something happen. A FAIL is written down, never patched.
//
// THE STAGE. T74's pro() sets the stage the way every walk since
// scripts/e2e-turn18.mjs has (a new project, the editor's own door); PRO's
// default room is 4000 x 3000 and the walk reads and records it. The L is
// placed by the REAL library row (Library, Kitchen, Base units, Corner L), as
// T75 f04, T77 f03 and the T78 probes placed it.
//
// Four pages, nine sections (one per F of PART A):
//   page 1  f01 the pluses left and right of the L, a Standard by each
//           f02 the L worktop (shape L) and the L mask (MASK-L) under a wall L
//           f03 an Arched door B is front_t thick in the scene and the cut list
//           f04 the grain of TOP-L runs along wall A like a BUD top beside it
//   page 2  f05 the ARM B figure, a 2klik, 1100, Enter
//           f06 a wall L follows the base; arm A 1600 splits it at the 700 leaf
//   page 3  f07 three drawer rows on the L: six fronts, SPACE CORNER x3, the row runs out on the diagonal
//   page 4  f08 the bi-fold corner door: B hangs on A, the bought hinge line, A swings and B rides
//           f09 the carousel: a line and a body, the shelves step aside, and back
//
//   npx vite preview --port 4173            (dist/ already built)
//   node scripts/t78-walk.mjs --fresh       every section, a new ledger
//   node scripts/t78-walk.mjs f05 f06       the page that holds them (a rerun replaces their blocks)
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t78-walk.mjs ...   another port
//
// Everything this file writes is plain ASCII (CLAUDE.md LAWS: no em or en
// dash); a sentence the app says with a dash is quoted with the dash escaped.

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  open, pro, unitsNow, showroomDown, settleCamera, pointOn,
} from './t74-harness.mjs';
import {
  key, clickWith, boxOf, choose, until, reachFree, orbitFree, helperAt, figureFree,
} from './t75-harness.mjs';

const REPO = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../verify/t78/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

const ORDER = ['f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07', 'f08', 'f09'];
const PAGES = { 1: ['f01', 'f02', 'f03', 'f04'], 2: ['f05', 'f06'], 3: ['f07'], 4: ['f08', 'f09'] };
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const pageWanted = (n) => want.length === 0 || PAGES[n].some((s) => want.includes(s));

// === THE LEDGER'S HANDS =====================================================
// Every line: the gesture, what was expected, what was observed, PASS or FAIL.
const steps = [];
const frames = [];
let current = '';
/** Plain ASCII, whatever the app said: dashes become '-', anything else above 0x7e is escaped. */
const ascii = (t) => String(t)
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const check = (gesture, ok, expect, got) => {
  steps.push({
    section: current, gesture: ascii(gesture), ok: Boolean(ok), expect: ascii(expect), got: ascii(got),
  });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${ascii(gesture)} | expect: ${ascii(expect)} | observed: ${ascii(got)}\n`);
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
// A VARIANT run (T78_WALK_VARIANT=<tag>, T78_WALK_NOTE=<what it is>) writes
// its own ledger walk-<tag>.txt and frames fNN-walk-<tag>-*.png beside the
// plain ones, so a walk of an experiment never overwrites the walk of HEAD.
const VARIANT = process.env.T78_WALK_VARIANT ? `-${process.env.T78_WALK_VARIANT.replace(/[^A-Za-z0-9]+/g, '-')}` : '';
const shot = async (page, name, clip = null) => {
  const file = name.replace(/^(f\d\d-walk)/, `$1${VARIANT}`);
  await settleCamera(page);
  await page.screenshot(`${SHOTS}${file}`, clip);
  frames.push(file);
  steps.push({ section: current, frame: file });
  process.stdout.write(`      frame ${file}\n`);
  return file;
};
const j = (v) => JSON.stringify(v);
/** How a unit came to be selected, for the ledger. */
const how = (sel) => (sel && sel.already ? 'already selected by the add' : (sel && sel.by ? `by ${sel.by}` : 'NOT selected'));
const r1 = (v) => (v == null ? null : Math.round(Number(v) * 10) / 10);
const near = (a, b, tol = 1) => Math.abs(Number(a) - Number(b)) <= tol;
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));

// === IS THE CANVAS ALIVE? ===================================================
// The room view is React's; a render that throws inside a UnitView tears the
// whole Canvas down and `window.__cc.views.room` is gone. Every gesture on the
// scene needs it, so each section asks first and writes the answer down, with
// the error that killed it mapped from the bundle to the source line through
// the served build's own sourcemap (E2E_DIST names its dist/, default the
// repo's), so the FAIL carries a File:line and not a minified name.
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
/** A section's end by exception: a dead scene is said as such; anything else is the stack's first lines. */
async function ended(page, name, e) {
  const dead = e && e.message === DEAD;
  check(`${name} walked to its end`, false, dead ? 'the canvas alive for the gestures below' : 'no exception',
    dead ? `not walked: the scene is dead (${await sceneDeath(page)}); every gesture of this section needs the canvas` : String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
  await shot(page, `${name}-walk-failure.png`).catch(() => {});
}

// === WHAT THE WALK READS ====================================================
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const stamp = (page) => page.ask('(document.querySelector(\'[data-build-stamp]\') || {}).getAttribute ? document.querySelector(\'[data-build-stamp]\').getAttribute(\'data-build-stamp\') : ((document.body.innerText || \'\').match(/#\\d+ . [0-9-]+ [0-9:]+ UTC . [0-9a-f]{7}/) || [null])[0]');
const roomNow = (page) => page.ask(`JSON.parse(JSON.stringify(${S}.project.room))`);
const profileNum = (page, path) => page.ask(`(() => { let v = ${PROFILE}; for (const k of ${j(path)}.split('.')) v = v == null ? v : v[k]; return v ?? null; })()`);
const wallLen = (room, i) => {
  const c = room.corners; const a = c[i]; const b = c[(i + 1) % c.length];
  return Math.hypot(b.x - a.x, b.y - a.y);
};
/** A unit as the store holds it and as the engine cuts it, the fields PART A asks about. */
const unitOf = (page, id) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(id)});
  if (!u) return null; const r = P.unitResult(u.id); const lc = (r.derived && r.derived.corner_l) || null;
  const pick = (b) => (b ? { x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, d: b.d } : null);
  return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall ?? 0, x: u.position.x_mm,
    w: u.params.width, d: u.params.depth, h: u.params.height, mount: u.params.mount_height ?? null,
    frontT: u.params.front_t ?? ${PROFILE}.front.thickness,
    wallGap: (u.params.wall_gap != null && u.params.wall_gap !== '') ? Number(u.params.wall_gap) : Math.max(0, Number((${PROFILE}.room || {}).wallBackClearance) || 0),
    cornerSide: u.params.corner_side ?? null, arm: lc ? lc.arm : null, lside: lc ? lc.side : null,
    doorsMode: lc ? (lc.doors_mode || null) : null, lDrawers: lc ? (lc.drawers || 0) : 0,
    cornerDoors: u.params.corner_doors ?? null, carousel: u.params.carousel === true, bottomMask: u.params.bottom_mask === true,
    frontType: u.params.front_type || null, doors: r.derived ? r.derived.doors : null,
    armsAuto: u.params.corner_arms_auto || null, armsOwn: u.params.corner_arms_own === true,
    items: ((u.params.sections && u.params.sections[0] && u.params.sections[0].items) || []).map((i) => i.kind),
    panels: r.panels.map((p) => ({ id: p.id, part: p.part, role: p.role, w: p.w, h: p.h, t: p.thickness, box: pick(p.box),
      grain: p.cnc ? (p.cnc.grain ?? null) : null, deco: p.meta && p.meta.frontDecoration ? p.meta.frontDecoration.style : null,
      bifold: p.meta && p.meta.bifold ? p.meta.bifold : null, hinge: p.meta ? (p.meta.hinge || null) : null })),
    hardware: (r.hardware || []).map((h) => ({ role: h.role, qty: h.qty, unit: h.unit, label: h.label || null, spec: h.spec_label || null })),
    kits: ((r.assemblies && r.assemblies.cornerKits) || []).map((k) => ({ kind: k.kind, placeholder: k.placeholder === true, trays: (k.trays || []).length })),
    warnings: (r.warnings || []).map((w) => w.code + ': ' + w.message) }; })()`);
/** One panel record whole, as the engine emitted it. */
const fullPanel = (page, unitId, panelId) => page.ask(`JSON.parse(JSON.stringify(${S}.unitResult(${j(unitId)}).panels.find((p) => p.id === ${j(panelId)}) || null))`);
const worktopsNow = (page) => page.ask(`${S}.worktopsOf().map((w) => ({ slab: w.slabId || w.id, wall: w.geometry && w.geometry.wall,
  x: w.geometry && w.geometry.x, w: w.geometry && w.geometry.w, d: w.geometry && w.geometry.d,
  shape: (w.geometry && w.geometry.shape) || null, points: ((w.geometry && w.geometry.outline) || w.outline || []).length,
  outline: ((w.geometry && w.geometry.outline) || w.outline || []).map((p) => p.map((q) => Math.round(q * 10) / 10)),
  joint: w.joint ? JSON.stringify(w.joint) : null }))`);
const recordsNow = (page) => page.ask(`(${S}.project.design.worktops || []).map((w) => ({ id: w.id, units: w.unitIds.length, kind: w.kind || null }))`);
const modalNow = (page) => page.ask(`${UI}.modal || null`);
const selectedNow = (page) => page.ask(`${UI}.selectedUnitId || null`);
const messagesNow = (page) => page.ask(`(${UI}.messages || []).map((m) => ({ id: m.id, level: m.level, message: m.message, action: m.action ? m.action.label : null }))`);
/** Every message the ui store ever showed on this page (yellows go on a click away, greys expire), by a subscription. */
async function recordSaid(page) {
  await page.ask(`(() => { if (window.__walkSaid) return true; window.__walkSaid = []; const seen = new Set();
    const take = (s) => { for (const m of (s.messages || [])) { if (!seen.has(m.id)) { seen.add(m.id); window.__walkSaid.push(m.level + ': ' + m.message); } } };
    take(window.__cc.ui.getState()); window.__cc.ui.subscribe(take); return true; })()`);
}
const saidCount = (page) => page.ask('(window.__walkSaid || []).length');
const saidSince = (page, from) => page.ask(`(window.__walkSaid || []).slice(${from})`);

/**
 * Every mesh the scene draws a unit's pieces with, by ccPanelId: the geometry's
 * own box (mm) and the same box in the UNIT's frame (x along wall A, y up, z
 * out of wall A). Where a piece is drawn by two meshes (a carved leaf and its
 * tray) the one with more vertices speaks. (The F3 probe's meshesOf.)
 */
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
    const wp = new T.Vector3().setFromMatrixPosition(o.matrixWorld);
    out[o.userData.ccPanelId] = { vertices: nv, kind: g.type, style: (g.userData && g.userData.frontDecoration) ? g.userData.frontDecoration.style : null,
      ownSize: { w: r((b.max.x - b.min.x) * 1000), h: r((b.max.y - b.min.y) * 1000), depthMm: r((b.max.z - b.min.z) * 1000) },
      unit: { x: [r(lo[0]), r(hi[0])], y: [r(lo[1]), r(hi[1])], z: [r(lo[2]), r(hi[2])] },
      unitSize: { x: r(hi[0] - lo[0]), y: r(hi[1] - lo[1]), z: r(hi[2] - lo[2]) },
      centre: { x: r((lo[0] + hi[0]) / 2), y: r((lo[1] + hi[1]) / 2), z: r((lo[2] + hi[2]) / 2) },
      world: { x: r(wp.x * 1000), y: r(wp.y * 1000), z: r(wp.z * 1000) }, visible: o.visible }; });
  return out; })()`);
/** The distinct ccPanelIds the scene draws for a unit whose id matches a regex (source given as a string). */
const meshIds = (page, unitId, re) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; const re = new RegExp(${j(re)}); const out = new Set();
  unit.traverse((o) => { if (o.isMesh && o.userData && typeof o.userData.ccPanelId === 'string' && re.test(o.userData.ccPanelId)) out.add(o.userData.ccPanelId); });
  return [...out].sort(); })()`);
/** The bought bodies the scene draws in a unit (ccKitBody), with the carousel's tray count and model slot. */
const kitBodies = (page, unitId) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; const out = [];
  unit.traverse((o) => { if (o.userData && o.userData.ccKitBody) { let meshes = 0; o.traverse((m) => { if (m.isMesh) meshes += 1; });
    out.push({ role: o.userData.ccKitBody, placeholder: o.userData.ccKitPlaceholder === true, trays: o.userData.ccCarouselTrays ?? null, model: o.userData.ccKitModel ?? null, meshes }); } });
  return out; })()`);
/**
 * THE GRAIN A MESH WEARS: the decor texture's quarter turn (tex.rotation, set by
 * 3d/materials.js applyDecorTransform), what kind of picture it is (a scan
 * <img>, whose figure runs down its V; the procedural <canvas>, whose figure
 * runs along its U), the ccTurnedY mark, and from those the direction the
 * FIGURE runs in the UNIT's frame (x = along the unit's own wall, z = out of
 * it), as the eye sees it.
 */
const grainOf = (page, unitId, panelId) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; let mesh = null;
  unit.traverse((o) => { if (!o.isMesh || !o.userData || o.userData.ccPanelId !== ${j(panelId)}) return;
    const nv = o.geometry && o.geometry.attributes && o.geometry.attributes.position ? o.geometry.attributes.position.count : 0;
    if (!mesh || nv > mesh.nv) mesh = { o, nv }; });
  if (!mesh) return { why: 'no mesh ' + ${j(panelId)} };
  const o = mesh.o; const mats = Array.isArray(o.material) ? o.material : [o.material];
  const m = mats.find((x) => x && x.map) || mats[0]; if (!m || !m.map) return { why: 'no decor map on ' + ${j(panelId)}, materials: mats.length, color: m && m.color ? '#' + m.color.getHexString() : null };
  const tex = m.map; const img = tex.image; const kind = img ? (img.tagName ? img.tagName.toLowerCase() : (img.constructor && img.constructor.name) || 'image') : 'none';
  const imageAxis = kind === 'canvas' ? 'u' : 'v';
  const rotate = Math.abs(((tex.rotation % Math.PI) + Math.PI) % Math.PI - Math.PI / 2) < 0.01;
  // The figure runs along the picture's own grain axis; the quarter turn swaps the picture's u and v on the board.
  const alongLocalX = (imageAxis === 'u') !== rotate;
  unit.updateMatrixWorld(true); o.updateMatrixWorld(true);
  const local = alongLocalX ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 0, 1);
  const world = local.clone().transformDirection(o.matrixWorld);
  const inv = new T.Matrix3().setFromMatrix4(new T.Matrix4().copy(unit.matrixWorld).invert());
  const inUnit = world.clone().applyMatrix3(inv).normalize();
  const r = (q) => Math.round(q * 100) / 100;
  return { rotation: r(tex.rotation), repeat: [r(tex.repeat.x), r(tex.repeat.y)], image: kind, imageAxis, turnedY: o.userData.ccTurnedY ?? null,
    figureInUnit: { x: r(inUnit.x), y: r(inUnit.y), z: r(inUnit.z) }, along: Math.abs(inUnit.x) > Math.abs(inUnit.z) ? 'x (along the unit\\'s wall)' : 'z (out of the wall)' }; })()`);

// === THE HANDS THIS WALK NEEDS (all real events) ============================
/** Select-all in the focused field: Ctrl+A with the editor's own selectAll command (T77's). */
async function selectAll(page) {
  const k = {
    key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k, commands: ['selectAll'] });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(120);
}
/** A right-panel section opened by a real click on its header (when shut). */
async function sectionOpen(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
async function closeLibrary(page) {
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
}
/** A row of the library through its MENU, its category and every flyout on the way (T77's). */
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
  await closeLibrary(page);
  return { ok: true, unit: added[0] || null };
}
/** The L from the library's real row: Library, Kitchen, Base units, Corner L. */
const placeL = (page) => addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'corner-l' });
/** A row of the library a PLUS opened (the panel is already up; the menu would clear the insert point). */
async function pressRow(page, group, entry) {
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  const listed = () => page.has(`[data-library-entry="${entry}"]`);
  if (!(await listed()) && await page.has(`[data-library-group="${group}"]`)) await page.press(`[data-library-group="${group}"]`);
  if (!(await listed()) && await page.has('[data-library-show-all="1"]')) await page.press('[data-library-show-all="1"]');
  if (!(await listed()) && await page.has(`[data-library-group="${group}"]`)) await page.press(`[data-library-group="${group}"]`);
  if (!(await listed())) return { ok: false, unit: null };
  await page.press(`[data-library-entry="${entry}"]`);
  await page.sleep(1300);
  const added = (await unitsNow(page)).filter((u) => !before.has(u.id) && u.type !== 'FREE_PANEL');
  return { ok: true, unit: added[0] || null };
}
const selectedIs = (unitId) => `${UI}.selectedUnitId === ${j(unitId)} && !${UI}.selectedElement && Boolean(document.querySelector('[data-section="Carcass"]'))`;
/** The pieces a hand can click a cabinet by: the top first (an L has no leaf at first), then a leaf, a side, the bottom. */
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const pick = [];
  for (const f of [(p) => p.id === 'TOP' || p.part === 'TOP' || p.part === 'TOP-L', (p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT', (p) => p.role === 'side', (p) => p.role === 'bottom', (p) => p.role === 'back', () => true]) {
    for (const p of r.panels) if (f(p) && !(p.meta && p.meta.frontDecorationParent) && !pick.includes(p.id)) pick.push(p.id); }
  return pick; })()`);
/** A unit SELECTED by a real click on one of its pieces, its right panel standing. */
async function selectUnit(page, unitId) {
  if (await page.ask(selectedIs(unitId))) return { already: true };
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  if (await modalNow(page)) await key(page, 'Escape');
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
/** DOORS' own button on a unit that has no leaf yet (T77's). */
async function addDoors(page, unitId) {
  const has = (await unitOf(page, unitId)).panels.some((p) => p.part === 'FRONT');
  if (has) return 'had leaves';
  await selectUnit(page, unitId);
  if (!(await sectionOpen(page, 'Doors'))) return 'no Doors section';
  const btn = await page.ask('[...document.querySelectorAll(\'button.cc-btn-gold\')].some((b) => b.offsetParent && /Add doors/.test(b.textContent))');
  if (!btn) return 'no Add doors button';
  await page.press('button.cc-btn-gold', 'Add doors');
  await page.sleep(900);
  return 'Add doors pressed';
}
/** A number typed into the focused field, the digits selected first; Enter commits. */
async function typeNumber(page, value) {
  await selectAll(page);
  await page.typeText(String(value));
  await key(page, 'Enter');
  await page.sleep(900);
}
/** The toolbar's Show dimensions, when the figures are hidden. */
async function showDimensions(page) {
  if (await page.ask('[...document.querySelectorAll(\'button\')].some((b) => b.offsetParent && b.textContent.trim() === \'Show dimensions\')')) {
    await page.click('button', 'Show dimensions', { exact: true });
    await page.sleep(600);
    return 'shown by the toolbar button';
  }
  return 'already shown';
}
/**
 * THE PLUS SPRITES the scene draws (userData.ccAddPlus, 3d/AddPlus.jsx), each
 * with its title (the sentence the cursor says), its world position and the
 * pixel its centre projects to; `first` says the scene's raycaster meets it
 * before anything drawn, `canvas` that the page hands that pixel to the canvas
 * (and not to a panel lying over it). helperAt and this traverse visit the
 * sprites in the same order, so the two lists line up.
 */
async function pluses(page) {
  const list = await page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return []; const T = v.three; const out = [];
    v.scene.traverse((o) => { if (o.userData && o.userData.ccAddPlus && o.visible !== false) { o.updateMatrixWorld(true);
      const p = new T.Vector3().setFromMatrixPosition(o.matrixWorld);
      out.push({ wx: Math.round(p.x * 1000), wy: Math.round(p.y * 1000), wz: Math.round(p.z * 1000), title: (o.children[0] && o.children[0].name) || '' }); } });
    return out; })()`);
  const pix = await helperAt(page, '(u) => u.ccAddPlus === true') || [];
  const canvas = await page.ask(`(${j(pix.map((p) => [p.x, p.y]))}).map(([x, y]) => { const v = window.__cc.views.room; const c = v.gl.domElement; const el = document.elementFromPoint(x, y); return el === c || (el && c.contains(el)); })`);
  return list.map((s, i) => ({
    ...s, px: pix[i] ? { x: pix[i].x, y: pix[i].y } : null, first: pix[i] ? pix[i].first : false, canvas: pix[i] ? Boolean(canvas[i]) : false,
  }));
}
/** A plus in PLAN millimetres and in a wall's frame (u along the wall from its start, near = the distance out of it). */
function plusInWall(room, s, wallIndex) {
  const xs = room.corners.map((c) => c.x); const ys = room.corners.map((c) => c.y);
  const centre = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const plan = { x: s.wx + centre.x, y: s.wz + centre.y };
  const a = room.corners[wallIndex]; const b = room.corners[(wallIndex + 1) % room.corners.length];
  const len = Math.hypot(b.x - a.x, b.y - a.y); const ax = (b.x - a.x) / len; const ay = (b.y - a.y) / len;
  const u = (plan.x - a.x) * ax + (plan.y - a.y) * ay;
  const nearMm = Math.abs(-(plan.x - a.x) * ay + (plan.y - a.y) * ax);
  return { u: r1(u), near: r1(nearMm), plan: { x: r1(plan.x), y: r1(plan.y) } };
}
/** A plus found by its title, brought within reach (the right panel folded by its X, the camera turned) and CLICKED. */
async function clickPlus(page, titleRe) {
  const find = async () => (await pluses(page)).find((p) => titleRe.test(p.title)) || null;
  let p = await find();
  if (!p) return { ok: false, why: 'no such plus on the scene', seen: (await pluses(page)).map((s) => s.title) };
  const tries = [[0, 0], [120, 0], [-240, 0], [120, 120], [260, 0]];
  for (const [dx, dy] of tries) {
    if (dx || dy) { await orbitFree(page, dx, dy); p = await find(); }
    if (p && p.px && p.first && p.canvas) {
      await clickWith(page, p.px.x, p.px.y);
      const insert = await until(page, `${UI}.libraryInsert`, 4000);
      return { ok: Boolean(insert), plus: p, insert };
    }
    if (p && p.px && p.first && !p.canvas && await page.has('button[title="Close panel"]')) {
      await page.press('button[title="Close panel"]');
      p = await find();
      if (p && p.px && p.first && p.canvas) {
        await clickWith(page, p.px.x, p.px.y);
        const insert = await until(page, `${UI}.libraryInsert`, 4000);
        return { ok: Boolean(insert), plus: p, insert, panelClosed: true };
      }
    }
  }
  return { ok: false, why: 'the plus is drawn but never the first thing under the pointer on a pixel the canvas owns', plus: p };
}

// === THE BOM PANEL, READ THROUGH ITS OWN TABS ===============================
const BOM_ASIDE = '[...document.querySelectorAll(\'aside\')].find((a) => /Bill of materials/.test(a.textContent))';
async function bomOpen(page) {
  if (!(await page.ask(`Boolean(${BOM_ASIDE})`))) await page.press('button[title="Bill of materials"]');
  await until(page, `Boolean(${BOM_ASIDE})`, 6000);
}
/** The Parts tab's rows (id, material, size, qty) and the whole tab's text. */
async function bomParts(page) {
  await bomOpen(page);
  const tab = await boxOf(page, `(() => { const a = ${BOM_ASIDE}; return a ? [...a.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Parts') : null; })()`);
  if (tab) await clickWith(page, tab.x, tab.y);
  await until(page, `Boolean(${BOM_ASIDE}) && Boolean((${BOM_ASIDE}).querySelector('tbody tr'))`, 6000);
  return page.ask(`(() => { const a = ${BOM_ASIDE}; if (!a) return null;
    const rows = [...a.querySelectorAll('tbody tr')].map((tr) => { const td = [...tr.querySelectorAll('td')]; if (td.length < 6) return { head: tr.textContent.trim().slice(0, 120) };
      const cell = td[1]; const id = ((cell.childNodes[0] && cell.childNodes[0].textContent) || cell.textContent || '').trim();
      return { unit: td[0].textContent.trim(), id, material: td[2].textContent.trim(), w: td[3].textContent.trim(), h: td[4].textContent.trim(), qty: td[5].textContent.trim(), text: tr.textContent.replace(/\\s+/g, ' ').trim().slice(0, 200) }; });
    return { rows, text: (a.innerText || '').replace(/\\s+/g, ' ') }; })()`);
}
/** The Order tab's ironmongery lines: role (data-bom-line), label, qty, the article or spec. */
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
  const mx = (r.x1 - r.x0) * 0.25 + 24; const my = (r.y1 - r.y0) * 0.25 + 24;
  const x = Math.max(r.left, r.x0 - mx); const y = Math.max(r.top, r.y0 - my);
  const x2 = Math.min(r.right, r.x1 + mx); const y2 = Math.min(r.bottom, r.y1 + my);
  const width = Math.max(60, x2 - x); const height = Math.max(60, y2 - y);
  const scale = Math.max(1, Math.min(2, 760 / Math.max(width, height)));
  return shot(page, file, {
    x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), scale,
  });
}
/** A unit's leaf ids (A and B) by its number. */
const leafIds = (u) => ({ A: `${u.num}-A-F`, B: `${u.num}-B-F` });
/** Where a unit's arm B ends on wall B, and which wall that is, from the store's own numbers. */
function armBEnd(room, l) {
  const n = room.corners.length;
  const wallB = l.cornerSide === 'right' ? (l.wall + 1) % n : (l.wall - 1 + n) % n;
  const lenB = wallLen(room, wallB);
  // The left hand: arm B occupies the END of wall B; the right hand: its START.
  return { wallB, lenB, end: l.cornerSide === 'right' ? l.wallGap + l.d : lenB - l.wallGap - l.d };
}

// ============================================================================
// PAGE 1: f01 THE PLUSES, f02 THE WORKTOP AND THE MASK, f03 THE DOOR, f04 THE GRAIN
// ============================================================================
if (pageWanted(1)) {
  const page = await open();
  let l = null; let budA = null;
  try {
    begin('f01', 'NOTHING CAN BE ADDED LEFT OF AN L: the plus on wall B, a Standard by each arm');
    await pro(page);
    await recordSaid(page);
    note('the build under the mouse', `${await stamp(page) || 'no stamp read'}; node HEAD ${head}`);
    const room = await roomNow(page);
    check('a new project (the stage), its room', wallLen(room, 0) === 4000 && wallLen(room, 1) === 3000,
      'a 4000 x 3000 room', `${room.corners.length} walls: ${room.corners.map((c, i) => `wall ${i + 1} ${wallLen(room, i)}`).join(', ')}; height ${room.height}`);
    const L = await placeL(page);
    l = L.unit ? await unitOf(page, L.unit.id) : null;
    check('Library, Kitchen, Base units, Corner L (the real row)', l && l.type === 'CORNER_L_BASE',
      'a CORNER_L_BASE in a room corner', l ? `${l.type} ${l.num} on wall ${l.wall + 1} at x ${l.x}, arm A ${l.w}, arm B ${l.d}, arm ${l.arm}, corner_side ${l.cornerSide}, wall gap ${l.wallGap}` : `row pressed ${L.ok}, nothing added`);
    if (!l) throw new Error('no L');
    if (!(await sceneCheck(page, 'after the L is drawn'))) throw new Error(DEAD);
    await shot(page, 'f01-walk-01-the-l.png');
    const B = armBEnd(room, l);
    const pl0 = await pluses(page);
    const titleB = new RegExp(`^Add a unit beside ${l.num} on wall (\\d+)$`);
    const titleA = new RegExp(`^Add a unit to the (left|right) of ${l.num}$`);
    const pB = pl0.find((p) => titleB.test(p.title)) || null;
    const pA = pl0.find((p) => titleA.test(p.title)) || null;
    const wallOfB = pB ? Number(pB.title.match(titleB)[1]) - 1 : null;
    const posB = pB ? plusInWall(room, pB, B.wallB) : null;
    const posA = pA ? plusInWall(room, pA, l.wall) : null;
    const armAEnd = l.cornerSide === 'right' ? l.x : l.x + l.w;
    check('the scene, the L alone: the plus sprites it draws (addPlusPoints through Scene.jsx AddPluses)',
      pB && wallOfB === B.wallB && posB && Math.abs(posB.u - B.end) < 150 && pA && posA && Math.abs(posA.u - armAEnd) < 150,
      `a corner plus on wall ${B.wallB + 1} (wall B) at arm B's end (u ${r1(B.end)} = ${B.lenB} - gap ${l.wallGap} - arm B ${l.d}), and a run plus on wall ${l.wall + 1} at arm A's end (x ${r1(armAEnd)})`,
      `${pl0.filter((p) => /^Add a unit (to the|beside)/.test(p.title)).length} run plus(es): ${pl0.filter((p) => /^Add a unit (to the|beside)/.test(p.title)).map((p) => `"${p.title}" at plan ${j(plusInWall(room, p, /on wall (\d+)/.test(p.title) ? Number(p.title.match(/on wall (\d+)/)[1]) - 1 : l.wall).plan)}`).join('; ')}${pB ? `; wall B plus: u ${posB.u}, ${posB.near} out of wall ${B.wallB + 1}` : '; NO plus on wall B'}${pA ? `; wall A plus: u ${posA.u}, ${posA.near} out of wall ${l.wall + 1}` : '; NO plus on wall A'}`);
    await shot(page, 'f01-walk-02-pluses.png');
    // THE WALL-B PLUS, CLICKED; STANDARD.
    let said0 = await saidCount(page);
    const cb = await clickPlus(page, titleB);
    let rowB = { ok: false, unit: null };
    if (cb.ok) rowB = await pressRow(page, 'base-units', 'door-base');
    const b = rowB.unit ? await unitOf(page, rowB.unit.id) : null;
    const flushB = b && b.wall === B.wallB && (l.cornerSide === 'right' ? near(b.x, B.end) : near(b.x + b.w, B.end));
    check(`a real click on the wall-B plus (${cb.plus && cb.plus.px ? `pixel ${cb.plus.px.x},${cb.plus.px.y}` : 'not reached'}), then Standard in the library it opened`,
      flushB, `a BUD on wall ${B.wallB + 1} flush with arm B's end: ${l.cornerSide === 'right' ? `x = ${r1(B.end)}` : `x + width = ${r1(B.end)}`} (within 1 mm)`,
      `${cb.ok ? `library insert ${j(cb.insert)}${cb.panelClosed ? ' (the right panel folded by its X first)' : ''}` : `plus not clicked: ${cb.why}${cb.seen ? ` (titles seen: ${j(cb.seen)})` : ''}`}; row pressed ${rowB.ok}; ${b ? `BUD ${b.num} on wall ${b.wall + 1} at x ${b.x}..${r1(b.x + b.w)}` : 'nothing added'}; said ${j(await saidSince(page, said0))}`);
    await closeLibrary(page);
    await shot(page, 'f01-walk-03-wall-b-added.png');
    // THE WALL-A PLUS, CLICKED; STANDARD.
    said0 = await saidCount(page);
    const ca = await clickPlus(page, titleA);
    let rowA = { ok: false, unit: null };
    if (ca.ok) rowA = await pressRow(page, 'base-units', 'door-base');
    budA = rowA.unit ? await unitOf(page, rowA.unit.id) : null;
    const flushA = budA && budA.wall === l.wall && (l.cornerSide === 'right' ? near(budA.x + budA.w, armAEnd) : near(budA.x, armAEnd));
    check(`a real click on the wall-A plus (${ca.plus && ca.plus.px ? `pixel ${ca.plus.px.x},${ca.plus.px.y}` : 'not reached'}), then Standard`,
      flushA, `a BUD on wall ${l.wall + 1} flush with arm A's end (x ${r1(armAEnd)})`,
      `${ca.ok ? `library insert ${j(ca.insert)}` : `plus not clicked: ${ca.why}`}; row pressed ${rowA.ok}; ${budA ? `BUD ${budA.num} on wall ${budA.wall + 1} at x ${budA.x}..${r1(budA.x + budA.w)}` : 'nothing added'}; said ${j(await saidSince(page, said0))}`);
    await closeLibrary(page);
    await shot(page, 'f01-walk-04-wall-a-added.png');
  } catch (e) {
    await ended(page, 'f01', e);
  }

  try {
    begin('f02', 'THE L WORKTOP IS L-SHAPED, THE L MASK IS ONE L BOARD');
    if (!l) throw new Error('no L from f01');
    if (!(await alive(page))) throw new Error(DEAD);
    const sel = await selectUnit(page, l.id);
    const opened = await sectionOpen(page, 'Construction');
    const rowThere = await page.has('[data-add-worktop-one="1"]');
    check(`the L selected by a real click (${how(sel)}), Construction open: the Worktop row offers Add worktop`,
      opened && rowThere, 'the row [data-add-worktop-one]', `selected ${await selectedNow(page) === l.id}; Construction ${opened}; row ${rowThere}; rows ${j(await page.ask('[...document.querySelectorAll(\'[data-worktop-row]\')].map((r) => r.getAttribute(\'data-worktop-row\') + \': \' + r.textContent.replace(/\\s+/g, \' \').trim().slice(0, 60))'))}`);
    if (rowThere) {
      let said0 = await saidCount(page);
      await page.press('[data-add-worktop-one="1"]');
      await page.sleep(900);
      const recs = await recordsNow(page);
      const slabs = await worktopsNow(page);
      const lSlab = slabs.find((s) => s.shape === 'L') || null;
      check('Add worktop on the L', recs.length === 1 && recs[0].kind === 'L' && recs[0].units === 1 && lSlab && lSlab.points >= 6,
        'one record of kind L over the L alone; one slab whose geometry.shape is L with a closed L outline (six vertices by test/turn78-f02; CLAUDE.md F2 wrote eight)',
        `records ${j(recs)}; slabs ${j(slabs.map((s) => ({ slab: s.slab, wall: s.wall, shape: s.shape, points: s.points, w: s.w, d: s.d })))}; outline ${lSlab ? j(lSlab.outline) : 'none'}; said ${j(await saidSince(page, said0))}`);
      await shot(page, 'f02-walk-01-worktop.png');
      const parts = await bomParts(page);
      const wtRows = parts ? parts.rows.filter((r) => /worktop/i.test(r.text || r.head || '')) : [];
      const lShaped = parts ? /L-shaped/.test(parts.text) : false;
      check('BOM (the Bill of materials button), Parts: the L worktop line', wtRows.length > 0 && lShaped,
        'a worktop line naming the L slab L-shaped (its true area)', `${wtRows.length} worktop row(s): ${j(wtRows.map((r) => r.text || r.head).slice(0, 3))}; "L-shaped" on the panel: ${lShaped}`);
      await bomFrame(page, 'f02-walk-02-bom-worktop.png');
      await bomClose(page);
    }
    // THE WALL L, AND ITS MASK.
    await selectUnit(page, l.id);
    const W = await addFromLibrary(page, { category: 'Kitchen', path: ['wall-units'], entry: 'corner-l-wall' });
    const w = W.unit ? await unitOf(page, W.unit.id) : null;
    check('the L selected, Library, Kitchen, Wall units, Corner L wall', w && w.type === 'CORNER_L_WALL' && w.wall === l.wall && w.cornerSide === l.cornerSide,
      'a CORNER_L_WALL in the same corner at the wall level', w ? `${w.type} ${w.num} on wall ${w.wall + 1} at x ${w.x}, arms ${w.w} / ${w.d}, corner_side ${w.cornerSide}, mount ${w.mount}, arms auto ${j(w.armsAuto)}` : `row pressed ${W.ok}, nothing added`);
    if (w) {
      const selW = await selectUnit(page, w.id);
      await sectionOpen(page, 'Construction');
      const btn = await boxOf(page, '[...document.querySelectorAll(\'[data-section="Construction"] button\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add masking panel\')');
      const saidM = await saidCount(page);
      if (btn) await clickWith(page, btn.x, btn.y);
      await until(page, `(${S}.units.find((u) => u.id === ${j(w.id)}) || { params: {} }).params.bottom_mask === true`, 4000);
      const w2 = await unitOf(page, w.id);
      const mask = w2.panels.find((p) => p.part === 'MASK') || null;
      check(`the wall L selected (${how(selW)}), Construction, Add masking panel (a real click)`,
        btn && w2.bottomMask && mask && mask.id === 'MASK-L',
        'bottom_mask on; the cut list carries MASK-L, one L board', `button ${btn ? 'clicked' : 'NOT FOUND'}; bottom_mask ${w2.bottomMask}; mask ${mask ? `${mask.id} ${mask.w} x ${mask.h} x ${mask.t}` : 'none'}; said ${j(await saidSince(page, saidM))}`);
      const parts = await bomParts(page);
      const maskRows = parts ? parts.rows.filter((r) => r.id === 'MASK-L' || /MASK-L/.test(r.text || '')) : [];
      check('BOM, Parts: the MASK-L line', maskRows.length === 1, 'one MASK-L row', `${maskRows.length} row(s): ${j(maskRows.map((r) => r.text))}`);
      await bomFrame(page, 'f02-walk-03-bom-mask.png');
      await bomClose(page);
      await shot(page, 'f02-walk-04-wall-l-mask.png');
    }
  } catch (e) {
    await ended(page, 'f02', e);
  }

  try {
    begin('f03', 'AN L DOOR WITH A DECORATIVE FRONT IS front_t THICK (Arched)');
    if (!l) throw new Error('no L from f01');
    if (!(await alive(page))) throw new Error(DEAD);
    const added = await addDoors(page, l.id);
    await until(page, `${S}.unitResult(${j(l.id)}).panels.some((p) => p.part === 'FRONT')`, 5000);
    const ids = leafIds(l);
    const l1 = await unitOf(page, l.id);
    check(`DOORS, Add doors (${added})`, l1.panels.some((p) => p.id === ids.A) && l1.panels.some((p) => p.id === ids.B),
      `the L's two leaves ${ids.A} and ${ids.B}`, `leaves ${j(l1.panels.filter((p) => p.part === 'FRONT').map((p) => `${p.id} ${p.w} x ${p.h} x ${p.t}`))}`);
    await selectUnit(page, l.id);
    await sectionOpen(page, 'Carcass');
    const res = await choose(page, 'document.querySelector(\'[data-unit-front-type]\')', 'A');
    const deco = await until(page, `(() => { const r = ${S}.unitResult(${j(l.id)}); const ls = r.panels.filter((p) => [${j(ids.A)}, ${j(ids.B)}].includes(p.id));
      return ls.length === 2 && ls.every((p) => p.meta && p.meta.frontDecoration && p.meta.frontDecoration.style === 'A'); })()`, 12000);
    let m = null;
    for (let t = 0; t < 40; t += 1) {
      m = await meshesOf(page, l.id, [ids.A, ids.B]);
      if (m && m[ids.A] && m[ids.B] && m[ids.A].style === 'A' && m[ids.B].style === 'A') break;
      await page.sleep(300);
    }
    const l2 = await unitOf(page, l.id);
    const A = l2.panels.find((p) => p.id === ids.A); const Bp = l2.panels.find((p) => p.id === ids.B);
    const ft = l2.frontT;
    const mB = m && m[ids.B]; const mA = m && m[ids.A];
    check(`Front type select set to Arched by the real select (${res.ok ? `"${res.label}"` : res.why})`, res.ok && deco && Bp && Bp.deco === 'A' && A && A.deco === 'A',
      'both leaves carry the A recipe', `select ${j(res.after && res.after.value)}; records ${A ? `${A.id} ${A.deco}` : '?'}, ${Bp ? `${Bp.id} ${Bp.deco}` : '?'}; scene styles ${mA ? mA.style : '?'}, ${mB ? mB.style : '?'}`);
    check('door B in the SCENE, measured in the unit frame (x along wall A)', mB && near(mB.unitSize.x, ft, 1) && Bp && near(mB.unitSize.z, Bp.w, 1.5),
      `a solid ${ft} thick along x (front_t), its width ${Bp ? Bp.w : '?'} along z, not 300+`,
      mB ? `${mB.kind} ${mB.vertices} vertices: x ${mB.unit.x[0]}..${mB.unit.x[1]} (${mB.unitSize.x} thick), z ${mB.unit.z[0]}..${mB.unit.z[1]} (${mB.unitSize.z} wide), y ${mB.unit.y[0]}..${mB.unit.y[1]}` : 'no mesh for door B');
    check('door A in the SCENE, the same', mA && near(mA.unitSize.z, ft, 1) && A && near(mA.unitSize.x, A.w, 1.5),
      `a solid ${ft} thick along z, its width ${A ? A.w : '?'} along x`,
      mA ? `${mA.kind} ${mA.vertices} vertices: x ${mA.unit.x[0]}..${mA.unit.x[1]} (${mA.unitSize.x}), z ${mA.unit.z[0]}..${mA.unit.z[1]} (${mA.unitSize.z} thick)` : 'no mesh for door A');
    const parts = await bomParts(page);
    const leafRows = parts ? parts.rows.filter((r) => r.id === ids.A || r.id === ids.B) : [];
    check('the cut list (the BOM Parts rows) states both leaves at front_t', A && Bp && A.t === ft && Bp.t === ft && leafRows.length === 2,
      `thickness ${ft} on both records and two rows on the panel`, `records ${A ? `${A.id} t ${A.t}` : '?'}, ${Bp ? `${Bp.id} t ${Bp.t}` : '?'}; panel rows ${j(leafRows.map((r) => r.text))}`);
    await bomClose(page);
    await shot(page, 'f03-walk-A.png');
    await pieceFrame(page, l.id, [ids.A, ids.B], 'f03-walk-A-leaves.png');
  } catch (e) {
    await ended(page, 'f03', e);
  }

  try {
    begin('f04', 'THE GRAIN OF THE L BOARDS RUNS ALONG WALL A (the owner\'s quarter turn)');
    if (!l) throw new Error('no L from f01');
    if (!(await alive(page))) throw new Error(DEAD);
    const l3 = await unitOf(page, l.id);
    const top = l3.panels.find((p) => p.id === 'TOP-L') || null;
    const shelf = l3.panels.find((p) => /^SHELF-L/.test(p.id)) || null;
    const gTop = await grainOf(page, l.id, 'TOP-L');
    const gShelf = shelf ? await grainOf(page, l.id, shelf.id) : null;
    const gBud = budA ? await grainOf(page, budA.id, 'TOP') : null;
    const budTop = budA ? (await unitOf(page, budA.id)).panels.find((p) => p.id === 'TOP') : null;
    note('the engine\'s statement (panel.cnc.grain, the drawn frame) and the boxes',
      `TOP-L ${top ? `grain ${top.grain}, ${top.w} x ${top.h} x ${top.t}, box ${j(top.box)}` : 'missing'}; ${shelf ? `${shelf.id} grain ${shelf.grain}, ${shelf.w} x ${shelf.h}` : 'no SHELF-L'}; BUD TOP ${budTop ? `grain ${budTop.grain}, ${budTop.w} x ${budTop.h}` : 'no BUD on wall A'}`);
    // THE ENGINE THE SCENE DRAWS FROM, read in node: the same three functions
    // 3d/materials.js decorPlacement runs for every board (grainRun,
    // decorMapping, the quarter turn), on the panel records the store holds.
    // The source is the repo's src/ (T78_ENGINE_SRC names another checkout).
    try {
      const SRC = process.env.T78_ENGINE_SRC || `${REPO}src/`;
      const { DECOR_GRAIN_TEXTURE, decorMapping, grainRun } = await import(`${SRC}engine/decors.js`);
      const { decorPlacement } = await import(`${SRC}3d/materials.js`);
      const { DEFAULT_CABINET_PROFILE: P } = await import(`${SRC}engine/profile.js`);
      const SCAN = { texture: 'oak.jpg', scanAlongGrainMm: 1200 };
      const TILE = { texture: DECOR_GRAIN_TEXTURE, repeatMm: 900 };
      const read = (p) => {
        if (!p) return null;
        const run = grainRun(p);
        return {
          id: p.id, axis: run.axis, lengthMm: run.lengthMm, acrossMm: run.acrossMm,
          grainAxis: decorMapping(p.box, run.lengthMm, run.axis).grainAxis,
          oldTie: decorMapping(p.box, run.lengthMm).grainAxis,
          rotateTile: decorPlacement(TILE, p, P)?.rotate ?? null, rotateScan: decorPlacement(SCAN, p, P)?.rotate ?? null,
        };
      };
      const pTop = await fullPanel(page, l.id, 'TOP-L');
      const pBud = budA ? await fullPanel(page, budA.id, 'TOP') : null;
      const eT = read(pTop); const eB = read(pBud);
      check('the engine the scene draws from (grainRun, decorMapping, decorPlacement on the store\'s TOP-L and the BUD TOP beside it)',
        eT && eB && eT.axis === 'w' && eT.grainAxis === 'u' && eT.rotateTile === eB.rotateTile && eT.rotateScan === eB.rotateScan && eT.oldTie === 'v',
        'TOP-L: the figure along box.w (x, wall A), grainAxis u, the same quarter turn as the BUD top for both picture families; the old tie-break (no axis) gave v, along wall B: the 90 degrees the owner asked for',
        `TOP-L ${j(eT)}; BUD TOP ${j(eB)}`);
    } catch (e) {
      note('the engine reading could not be made in node', String(e && e.message));
    }
    const readable = gTop && !gTop.why && gBud && !gBud.why;
    if (readable) {
      const same = gTop.along === gBud.along && Math.abs(gTop.rotation - gBud.rotation) < 0.01 && gTop.image === gBud.image;
      check('TOP-L\'s decor texture in the scene against the BUD TOP\'s beside it on wall A',
        same && /^x/.test(gTop.along),
        'the figure runs along wall A (the unit\'s x) on TOP-L, the same way as on the BUD top beside it (test/turn78-f04: "the same quarter turn as the BUD top"); the brief\'s phrase "differs by 90 degrees from a plain BUD\'s TOP" is the pre-F4 state (the tie fell to v, along wall B), not the law',
        `TOP-L: map.rotation ${gTop.rotation}, repeat ${j(gTop.repeat)}, picture ${gTop.image} (grain along its ${gTop.imageAxis}), ccTurnedY ${gTop.turnedY}, figure in the unit frame ${j(gTop.figureInUnit)} = ${gTop.along}; BUD TOP: rotation ${gBud.rotation}, picture ${gBud.image}, figure ${j(gBud.figureInUnit)} = ${gBud.along}${gShelf && !gShelf.why ? `; ${shelf.id}: rotation ${gShelf.rotation}, figure ${j(gShelf.figureInUnit)} = ${gShelf.along}` : ''}`);
    } else {
      note('the grain readout: eye only (no decor map readable on the mesh), see the frame f04-walk-grain.png',
        `TOP-L ${j(gTop)}; BUD TOP ${j(gBud)}`);
    }
    await shot(page, 'f04-walk-grain.png');
    await pieceFrame(page, l.id, ['TOP-L'], 'f04-walk-grain-top-l.png');
  } catch (e) {
    await ended(page, 'f04', e);
  }
  const errs = pageErrors(page);
  note('page 1: console errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// ============================================================================
// PAGE 2: f05 THE ARMS, f06 THE WALL L FOLLOWS AND SPLITS
// ============================================================================
if (pageWanted(2)) {
  const page = await open();
  let l = null;
  try {
    begin('f05', 'THE L GROWS LEFT AND RIGHT ON ITS OWN: the ARM B figure, a 2klik, 1100');
    await pro(page);
    await recordSaid(page);
    const L = await placeL(page);
    l = L.unit ? await unitOf(page, L.unit.id) : null;
    check('a fresh project, Library, Kitchen, Base units, Corner L', l && l.type === 'CORNER_L_BASE', 'a CORNER_L_BASE',
      l ? `${l.num} on wall ${l.wall + 1}, arms ${l.w} / ${l.d}, arm ${l.arm}, corner_side ${l.cornerSide}` : 'nothing added');
    if (!l) throw new Error('no L');
    if (!(await sceneCheck(page, 'after the L is drawn'))) throw new Error(DEAD);
    const sel = await selectUnit(page, l.id);
    const dims = await showDimensions(page);
    const fig = await figureFree(page, `d-${l.id}`, 'd', { turns: [[0, 0], [120, 0], [-240, 0], [120, 120], [260, 0], [0, -120]] });
    check(`the L selected (${how(sel)}; dimensions ${dims}): the ARM B figure (chain d-<unitId>, row d) where a hand can click it`,
      fig && fig.x != null, 'a pixel on the figure\'s pick box, the first thing under the pointer, the canvas\'s own', j(fig));
    await shot(page, 'f05-walk-01-chain.png');
    if (fig && fig.x != null) {
      await page.dblclick(fig.x, fig.y);
      const modal = await until(page, `${UI}.modal === 'unit-size' && Boolean(document.querySelector('#size-d-${l.id}'))`, 4000);
      await page.sleep(600);
      const state = await page.ask(`(() => { const f = document.querySelector('#size-d-${l.id}'); const box = document.querySelector('[data-unit-size]');
        return { focused: Boolean(f) && document.activeElement === f, value: f ? f.value : null, labels: box ? [...box.querySelectorAll('label > span.cc-label')].map((s) => s.textContent.trim()) : [] }; })()`);
      check('a 2klik on the ARM B figure', modal && state.focused && state.labels.includes('Arm A') && state.labels.includes('Arm B'),
        'the size window opens focused on the ARM B field (#size-d-<unitId>); its fields read Arm A, Height, Arm B', `modal ${await modalNow(page)}; field ${j(state)}`);
      await shot(page, 'f05-walk-02-size-window.png');
      if (modal) {
        if (!state.focused) {
          const at = await boxOf(page, `document.querySelector('#size-d-${l.id}')`);
          if (at) await clickWith(page, at.x, at.y);
        }
        await typeNumber(page, 1100);
        const l2 = await unitOf(page, l.id);
        check('1100, Enter', l2.d === 1100 && l2.w === l.w && l2.arm === l.arm,
          `params.depth 1100 (arm B), width ${l.w} unchanged (arm A), the arm depth ${l.arm} unchanged`, `width ${l2.w}, depth ${l2.d}, arm ${l2.arm}; modal after ${await modalNow(page)}; said ${j(await saidSince(page, 0))}`);
        await shot(page, 'f05-walk-03-arm-b-1100.png');
      }
    } else {
      check('the ARM B figure 2klicked', false, 'control found', `control not found: the pick box of chain d-${l.id}, row d (${j(fig)})`);
    }
  } catch (e) {
    await ended(page, 'f05', e);
  }

  try {
    begin('f06', 'THE WALL L FOLLOWS THE BASE L, AND SPLITS ABOVE 700');
    if (!l) throw new Error('no L from f05');
    if (!(await alive(page))) throw new Error(DEAD);
    const leafMax = await profileNum(page, 'corner.wallLeafMaxMm');
    const base0 = await unitOf(page, l.id);
    await selectUnit(page, l.id);
    const W = await addFromLibrary(page, { category: 'Kitchen', path: ['wall-units'], entry: 'corner-l-wall' });
    const w = W.unit ? await unitOf(page, W.unit.id) : null;
    const follows = w && w.armsAuto && w.armsAuto.from === l.id;
    const noSplit = w && w.armsAuto && (w.armsAuto.split || []).length === 0;
    check('the base L selected, Library, Kitchen, Wall units, Corner L wall', w && w.type === 'CORNER_L_WALL' && w.wall === l.wall && w.cornerSide === l.cornerSide && follows && (noSplit ? (w.w === base0.w && w.d === base0.d) : true),
      `a CORNER_L_WALL in the same corner taking the base's arms ${base0.w} / ${base0.d} (corner_arms_auto from the base), unless a leaf would pass ${leafMax}`,
      w ? `${w.num} on wall ${w.wall + 1} at x ${w.x}, arms ${w.w} / ${w.d}, arm depth ${w.arm}, mount ${w.mount}, corner_arms_auto ${j(w.armsAuto)}; messages ${j((await messagesNow(page)).map((m) => `${m.level}: ${m.message}${m.action ? ` [${m.action}]` : ''}`))}` : `row pressed ${W.ok}, nothing added`);
    await shot(page, 'f06-walk-01-wall-l.png');
    if (w) {
      // ARM A OF THE BASE TO 1600, BY ITS FIGURE.
      await selectUnit(page, l.id);
      await showDimensions(page);
      const fig = await figureFree(page, `w-${l.id}`, 'w', { turns: [[0, 0], [120, 0], [-240, 0], [120, 120], [260, 0]] });
      check('the base L selected: its ARM A figure (chain w-<unitId>, row w) in reach', fig && fig.x != null, 'a clickable pixel', j(fig));
      if (fig && fig.x != null) {
        const said0 = await saidCount(page);
        await page.dblclick(fig.x, fig.y);
        const modal = await until(page, `${UI}.modal === 'unit-size' && Boolean(document.querySelector('#size-w-${l.id}'))`, 4000);
        await page.sleep(600);
        const focused = await page.ask(`document.activeElement === document.querySelector('#size-w-${l.id}')`);
        if (modal && !focused) {
          const at = await boxOf(page, `document.querySelector('#size-w-${l.id}')`);
          if (at) await clickWith(page, at.x, at.y);
        }
        if (modal) await typeNumber(page, 1600);
        await page.sleep(800);
        const l2 = await unitOf(page, l.id);
        const w2 = await unitOf(page, w.id);
        const msgs = await messagesNow(page);
        const prop = msgs.find((m) => /proposed beside it/.test(m.message) && m.action) || null;
        const nums = prop ? (prop.message.match(/stops at (\d+(?:\.\d+)?) mm and a (\d+(?:\.\d+)?) mm wall unit/) || []) : [];
        const kept = nums[1] != null ? Number(nums[1]) : null; const rem = nums[2] != null ? Number(nums[2]) : null;
        const leafA = w2.w - w2.arm;
        check(`a 2klik on the base's ARM A figure, 1600, Enter (window ${modal ? 'opened' : 'NOT opened'}, field ${focused ? 'focused' : 'clicked by hand'})`,
          l2.w === 1600 && w2.armsAuto && w2.armsAuto.from === l.id && ((w2.w === 1600 && leafA <= leafMax) || (prop && kept != null && w2.w === kept && near(kept + rem, 1600, 0.6) && (w2.armsAuto.split || []).includes('A'))),
          `the base's arm A 1600; the wall L follows: equal when its leaf stays under ${leafMax}, else the wall L stops where the leaf is ${leafMax} and a yellow proposes the remainder with one button "Add N mm wall unit"`,
          `base arms ${l2.w} / ${l2.d}; wall L arms ${w2.w} / ${w2.d} (arm depth ${w2.arm}, opening less arm ${r1(leafA)}), corner_arms_auto ${j(w2.armsAuto)}; ${prop ? `yellow: "${prop.message}" button "${prop.action}"` : 'no proposal message'}; all messages ${j(msgs.map((m) => `${m.level}: ${m.message.slice(0, 80)}`))}; said since ${j(await saidSince(page, said0))}`);
        await shot(page, 'f06-walk-02-proposal.png');
        if (prop) {
          const before = new Set((await unitsNow(page)).map((u) => u.id));
          const btn = await boxOf(page, `document.querySelector('[data-message-action=${j(prop.id)}]')`);
          if (btn) await clickWith(page, btn.x, btn.y);
          await page.sleep(900);
          const added = (await unitsNow(page)).filter((u) => !before.has(u.id));
          const nu = added[0] ? await unitOf(page, added[0].id) : null;
          const w3 = await unitOf(page, w.id);
          const flush = nu && nu.wall === w3.wall && (w3.cornerSide === 'right' ? near(nu.x + nu.w, w3.x, 0.6) : near(nu.x, w3.x + w3.w, 0.6));
          check(`the yellow's button "${prop.action}" clicked with the real mouse`, btn && nu && nu.type === 'WUD' && flush && near(nu.w, rem, 0.6),
            `a WUD ${rem} wide added beside the wall L on wall ${w3.wall + 1}, flush with its arm A end`,
            `button ${btn ? `at ${btn.x},${btn.y}` : 'NOT IN THE DOM'}; ${nu ? `${nu.type} ${nu.num} on wall ${nu.wall + 1} at x ${nu.x}..${r1(nu.x + nu.w)}, width ${nu.w}, mount ${nu.mount}` : 'nothing added'}; wall L x ${w3.x}..${r1(w3.x + w3.w)}; said ${j(await saidSince(page, said0))}`);
          await shot(page, 'f06-walk-03-remainder-added.png');
        }
      }
    }
  } catch (e) {
    await ended(page, 'f06', e);
  }
  const errs = pageErrors(page);
  note('page 2: console errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// ============================================================================
// PAGE 3: f07 DRAWERS IN THE L (SPACE CORNER)
// ============================================================================
if (pageWanted(3)) {
  const page = await open();
  try {
    begin('f07', 'DRAWERS IN THE L: two boxes a row, one L front, the SPACE CORNER kit, the diagonal');
    await pro(page);
    await recordSaid(page);
    const L = await placeL(page);
    const l = L.unit ? await unitOf(page, L.unit.id) : null;
    check('a fresh project, Library, Kitchen, Base units, Corner L', l && l.type === 'CORNER_L_BASE', 'a CORNER_L_BASE', l ? `${l.num}, arms ${l.w} / ${l.d}, arm ${l.arm}, hand ${l.cornerSide}` : 'nothing added');
    if (!l) throw new Error('no L');
    if (!(await sceneCheck(page, 'after the L is drawn'))) throw new Error(DEAD);
    const sel = await selectUnit(page, l.id);
    const opened = await sectionOpen(page, 'Add items');
    const rowBtn = await page.ask('(() => { const b = document.querySelector(\'[data-add-kind="drawers"]\'); return b ? { there: true, disabled: b.disabled, text: b.textContent.replace(/\\s+/g, \' \').trim() } : { there: false }; })()');
    if (rowBtn.there && !rowBtn.disabled) await page.press('[data-add-kind="drawers"]');
    const countAt = await boxOf(page, '(() => { const s = [...document.querySelectorAll(\'[data-section="Add items"] span.cc-label\')].find((x) => x.textContent.trim() === \'Count\'); return s ? s.parentElement.querySelector(\'input\') : null; })()');
    check(`the L selected (${how(sel)}), Add items open (${opened}), the Drawers row`, rowBtn.there && !rowBtn.disabled && countAt,
      'the row [data-add-kind=drawers] enabled, its Count field on the screen', `row ${j(rowBtn)}; count field ${countAt ? `at ${countAt.x},${countAt.y}` : 'NOT FOUND'}`);
    if (countAt) {
      const said0 = await saidCount(page);
      await clickWith(page, countAt.x, countAt.y);
      await typeNumber(page, 3);
      const add = await boxOf(page, '[...document.querySelectorAll(\'[data-section="Add items"] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add\')');
      if (add) await clickWith(page, add.x, add.y);
      await until(page, `(() => { const u = ${S}.units.find((x) => x.id === ${j(l.id)}); return u && ((u.params.sections && u.params.sections[0] && u.params.sections[0].items) || []).filter((i) => i.kind === 'drawer').length === 3; })()`, 6000);
      await page.sleep(1200);
      const l1 = await unitOf(page, l.id);
      const drawers = l1.items.filter((k) => k === 'drawer').length;
      const fronts = l1.panels.filter((p) => p.part === 'DRAWER-FRONT');
      check(`Count 3 (typed, Enter), Add (${add ? 'clicked' : 'button NOT FOUND'})`, drawers === 3 && l1.lDrawers === 3 && fronts.length === 6 && fronts.filter((p) => /-A-F\d$/.test(p.id)).length === 3,
        'three drawer items in sections[0]; the engine cuts six DRAWER-FRONT boards, three per arm, and no door', `items ${j(l1.items)}; corner_l.drawers ${l1.lDrawers}; fronts ${j(fronts.map((p) => p.id))}; doors left ${l1.panels.filter((p) => p.part === 'FRONT').length}; said ${j(await saidSince(page, said0))}`);
      const sceneFronts = await meshIds(page, l.id, '-[AB]-F\\d$');
      check('the scene draws the stack', sceneFronts && sceneFronts.length === 6 && sceneFronts.filter((id) => /-B-F\d$/.test(id)).length === 3,
        'six DRAWER-FRONT meshes, three per arm', j(sceneFronts));
      const lines = await bomOrder(page);
      check('BOM, Order tab, Ironmongery', sumQty(lines, 'space_corner') === 3 && sumQty(lines, 'runner_pairs') === 6,
        'SPACE CORNER kit x3 (one a row) and runner pairs x6 (two boxes a row)', `${sayLines(lines, ['space_corner', 'runner_pairs'])}; engine hardware ${j(l1.hardware.filter((h) => ['space_corner', 'runner_pairs'].includes(h.role)).map((h) => `${h.role} ${h.qty} ${h.label || ''} ${h.spec || ''}`))}`);
      await bomFrame(page, 'f07-walk-02-bom.png');
      await bomClose(page);
      await shot(page, 'f07-walk-01-stack-shut.png');
      // THE MOTION: a 2klik on one front of row 2 runs the whole row out on the diagonal.
      const num = l1.num;
      const ids = [`${num}-A-F2`, `${num}-B-F2`, 'D2A-SL', 'D2B-SL', `${num}-A-F1`];
      const before = await meshesOf(page, l.id, ids);
      const at = await reachFree(page, l.id, `${num}-A-F2`);
      if (at) await page.dblclick(at.x, at.y);
      await page.sleep(1800);
      const after = await meshesOf(page, l.id, ids);
      const moved = (id) => (before && after && before[id] && after[id]
        ? { dx: r1(after[id].centre.x - before[id].centre.x), dz: r1(after[id].centre.z - before[id].centre.z), dy: r1(after[id].centre.y - before[id].centre.y) } : null);
      const row = ids.slice(0, 4).map((id) => ({ id, ...moved(id) }));
      const still = moved(`${num}-A-F1`);
      const diag = row.every((m) => m.dx != null && Math.abs(m.dx) > 50 && near(Math.abs(m.dx), Math.abs(m.dz), 1) && Math.abs(m.dy) < 0.5);
      const sameWay = row.every((m) => m.dx != null && Math.sign(m.dx) === Math.sign(row[0].dx) && Math.sign(m.dz) === Math.sign(row[0].dz));
      check(`a 2klik on ${num}-A-F2 (${at ? `pixel ${at.x},${at.y}` : 'NOT IN REACH'}), 1.8 s later`, at && diag && sameWay && still && Math.abs(still.dx) < 0.5 && Math.abs(still.dz) < 0.5,
        'both fronts and both boxes of row 2 displaced along the diagonal: x and z change by the same amount (over 50 mm), nothing else; row 1 stays',
        `row 2: ${j(row)}; row 1 front ${j(still)}`);
      await shot(page, 'f07-walk-03-row-open.png');
    }
  } catch (e) {
    await ended(page, 'f07', e);
  }
  const errs = pageErrors(page);
  note('page 3: console errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// ============================================================================
// PAGE 4: f08 THE BI-FOLD CORNER DOOR, f09 THE CAROUSEL
// ============================================================================
if (pageWanted(4)) {
  const page = await open();
  let l = null;
  try {
    begin('f08', 'THE BI-FOLD CORNER DOOR: B hangs on A, a line and a body, A swings and B rides');
    await pro(page);
    await recordSaid(page);
    const L = await placeL(page);
    l = L.unit ? await unitOf(page, L.unit.id) : null;
    check('a fresh project, Library, Kitchen, Base units, Corner L', l && l.type === 'CORNER_L_BASE', 'a CORNER_L_BASE', l ? `${l.num}, arms ${l.w} / ${l.d}, arm ${l.arm}, hand ${l.cornerSide}` : 'nothing added');
    if (!l) throw new Error('no L');
    if (!(await sceneCheck(page, 'after the L is drawn'))) throw new Error(DEAD);
    const added = await addDoors(page, l.id);
    await until(page, `${S}.unitResult(${j(l.id)}).panels.some((p) => p.part === 'FRONT')`, 5000);
    const ids = leafIds(l);
    await selectUnit(page, l.id);
    await sectionOpen(page, 'Carcass');
    await sectionOpen(page, 'Doors');
    const selThere = await page.has('[data-corner-doors]');
    const res = selThere ? await choose(page, 'document.querySelector(\'[data-corner-doors]\')', 'bifold') : { ok: false, why: 'control not found: [data-corner-doors]' };
    await until(page, `(${S}.unitResult(${j(l.id)}).derived.corner_l || {}).doors_mode === 'bifold'`, 5000);
    await page.sleep(800);
    const l1 = await unitOf(page, l.id);
    const Bp = l1.panels.find((p) => p.id === ids.B); const A = l1.panels.find((p) => p.id === ids.A);
    const saidUnder = await page.ask('(document.querySelector(\'[data-corner-doors-said]\') || {}).textContent || null');
    check(`DOORS, Add doors (${added}); the Corner doors select set to Bi-fold (${res.ok ? `"${res.label}"` : res.why})`, res.ok && l1.doorsMode === 'bifold' && Bp && Bp.bifold && Bp.bifold.parent === ids.A && A && A.bifold && A.bifold.child === ids.B,
      'corner_doors bifold: door B hangs on door A (meta.bifold parent / child)', `select ${j(res.after && res.after.value)}; doors_mode ${l1.doorsMode}; A.bifold ${j(A && A.bifold)}; B.bifold ${j(Bp && Bp.bifold)}, B hinge ${Bp && Bp.hinge}`);
    check('the sentence under the select (data-corner-doors-said)', saidUnder && /no hole/.test(saidUnder), 'names the bought hinge and says "no hole"', j(saidUnder));
    const lines = await bomOrder(page);
    check('BOM, Order tab, Ironmongery', sumQty(lines, 'bifold_hinges') === 3 && sumQty(lines, 'hinges') === 3,
      'the CLIP top 60 degree bi-fold corner hinge x3 and the carcass hinges x3 (not 6)', `${sayLines(lines, ['bifold_hinges', 'hinges'])}; engine hardware ${j(l1.hardware.filter((h) => /hinge/.test(h.role)).map((h) => `${h.role} ${h.qty} ${h.spec || h.label || ''}`))}`);
    await bomFrame(page, 'f08-walk-03-bom.png');
    await bomClose(page);
    await shot(page, 'f08-walk-01-shut.png');
    // THE SWING: a 2klik on door A; B rides.
    const before = await meshesOf(page, l.id, [ids.A, ids.B]);
    const at = await reachFree(page, l.id, ids.A);
    if (at) await page.dblclick(at.x, at.y);
    await page.sleep(2000);
    if (await modalNow(page)) await key(page, 'Escape');
    const after = await meshesOf(page, l.id, [ids.A, ids.B]);
    const d = (id, k) => (before && after && before[id] && after[id] ? r1(after[id].centre[k] - before[id].centre[k]) : null);
    const bMoved = before && after && before[ids.B] && after[ids.B] && Math.hypot(d(ids.B, 'x'), d(ids.B, 'z')) > 50;
    const aMoved = before && after && before[ids.A] && after[ids.A] && Math.hypot(d(ids.A, 'x'), d(ids.A, 'z')) > 50;
    // The carcass footprint: arm A along x (z 0..arm), arm B along z (x 0..arm), both hands.
    const W = l1.w; const D = l1.d; const arm = l1.arm;
    const armA = { x: [0, W], z: [0, arm] };
    const armB = l1.cornerSide === 'right' ? { x: [W - arm, W], z: [0, D] } : { x: [0, arm], z: [0, D] };
    const overlaps = (b, r) => b.x[1] > r.x[0] + 1 && b.x[0] < r.x[1] - 1 && b.z[1] > r.z[0] + 1 && b.z[0] < r.z[1] - 1;
    const bOut = after && after[ids.B] ? !overlaps(after[ids.B].unit, armA) && !overlaps(after[ids.B].unit, armB) : false;
    check(`a 2klik on door A (${at ? `pixel ${at.x},${at.y}` : 'NOT IN REACH'}), 2 s later`, at && aMoved && bMoved && bOut,
      'door B\'s mesh moves with A (its centre travels over 50 mm) and after the swing B\'s box lies outside the carcass footprint (arm A z 0..arm, arm B x 0..arm)',
      `A centre moved dx ${d(ids.A, 'x')} dz ${d(ids.A, 'z')}; B centre moved dx ${d(ids.B, 'x')} dz ${d(ids.B, 'z')}; B box after ${after && after[ids.B] ? `x ${j(after[ids.B].unit.x)} z ${j(after[ids.B].unit.z)}` : 'none'}; footprint arm ${arm}, W ${W}, D ${D}; B outside ${bOut}`);
    await shot(page, 'f08-walk-02-open.png');
  } catch (e) {
    await ended(page, 'f08', e);
  }

  try {
    begin('f09', 'THE CAROUSEL: a line and a body in the corner square, the shelves step aside, and back');
    if (!l) throw new Error('no L from f08');
    if (!(await alive(page))) throw new Error(DEAD);
    // A SHELF FIRST (a fresh L from the library carries none), through Add
    // items, Shelves: the count field, Enter, the gold Add; so the carousel has
    // a shelf to step aside.
    const sel = await selectUnit(page, l.id);
    const opened = await sectionOpen(page, 'Add items');
    if (await page.has('[data-add-kind="shelves"]')) await page.press('[data-add-kind="shelves"]');
    const shelfCount = await boxOf(page, '(() => { const s = [...document.querySelectorAll(\'[data-section="Add items"] span.cc-label\')].find((x) => x.textContent.trim() === \'Add\' && x.parentElement.querySelector(\'input\')); return s ? s.parentElement.querySelector(\'input\') : null; })()');
    if (shelfCount) {
      await clickWith(page, shelfCount.x, shelfCount.y);
      await typeNumber(page, 1);
      const add = await boxOf(page, '[...document.querySelectorAll(\'[data-section="Add items"] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add\')');
      if (add) await clickWith(page, add.x, add.y);
      await until(page, `${S}.unitResult(${j(l.id)}).panels.some((p) => /^SHELF-L/.test(p.id))`, 5000);
      await page.sleep(900);
    }
    const lS = await unitOf(page, l.id);
    const shelves0 = await meshIds(page, l.id, '^SHELF-L');
    check(`the L selected (${how(sel)}), Add items (${opened}), Shelves, 1, Add`, shelfCount && lS.panels.some((p) => /^SHELF-L/.test(p.id)) && shelves0 && shelves0.length > 0,
      'one SHELF-L board in the cut list and drawn', `count field ${shelfCount ? 'typed' : 'NOT FOUND'}; shelves cut ${j(lS.panels.filter((p) => /^SHELF-L/.test(p.id)).map((p) => p.id))}; drawn ${j(shelves0)}`);
    await sectionOpen(page, 'Add items');
    const rowThere = await page.has('[data-add-kind="carousel"]');
    if (rowThere) await page.press('[data-add-kind="carousel"]');
    const btn = await boxOf(page, 'document.querySelector(\'[data-corner-kit="carousel"]\')');
    check('the Carousel row of Add items', rowThere && btn, 'the row [data-add-kind=carousel] and its button [data-corner-kit=carousel]',
      `row ${rowThere}; button ${btn ? `"${await page.text('[data-corner-kit="carousel"]')}" at ${btn.x},${btn.y}` : 'NOT FOUND'}; shelves drawn before ${j(shelves0)}`);
    if (btn) {
      const said0 = await saidCount(page);
      await clickWith(page, btn.x, btn.y);
      await until(page, `(${S}.units.find((u) => u.id === ${j(l.id)}) || { params: {} }).params.carousel === true`, 4000);
      await page.sleep(1000);
      const l1 = await unitOf(page, l.id);
      const bodies = await kitBodies(page, l.id);
      const car = (bodies || []).find((b) => b.role === 'carousel') || null;
      const shelves1 = await meshIds(page, l.id, '^SHELF-L');
      const lines = await bomOrder(page);
      check('Add carousel (a real click)', l1.carousel && l1.kits.some((k) => k.kind === 'carousel' && k.placeholder) && car && car.trays === 2 && shelves1 && shelves1.length === 0 && sumQty(lines, 'carousel') === 1,
        'params.carousel true; a BOM line Carousel x1 (bought); a scene body with ccKitBody carousel and ccCarouselTrays 2; the SHELF-L meshes gone',
        `carousel ${l1.carousel}; kits ${j(l1.kits)}; bodies ${j(bodies)}; shelves drawn ${j(shelves1)}; BOM ${sayLines(lines, ['carousel'])}; engine line ${j(l1.hardware.filter((h) => h.role === 'carousel'))}; said ${j(await saidSince(page, said0))}`);
      await bomFrame(page, 'f09-walk-02-bom.png');
      await bomClose(page);
      await shot(page, 'f09-walk-01-carousel.png');
      await pieceFrame(page, l.id, ['TOP-L', 'BOTTOM-L'], 'f09-walk-01-carousel-close.png');
      // AND BACK.
      await selectUnit(page, l.id);
      await sectionOpen(page, 'Add items');
      if (!(await page.has('[data-corner-kit="carousel"]')) && await page.has('[data-add-kind="carousel"]')) await page.press('[data-add-kind="carousel"]');
      const btn2 = await boxOf(page, 'document.querySelector(\'[data-corner-kit="carousel"]\')');
      const label2 = btn2 ? await page.text('[data-corner-kit="carousel"]') : null;
      if (btn2) await clickWith(page, btn2.x, btn2.y);
      await until(page, `(${S}.units.find((u) => u.id === ${j(l.id)}) || { params: {} }).params.carousel !== true`, 4000);
      await page.sleep(1000);
      const l2 = await unitOf(page, l.id);
      const bodies2 = await kitBodies(page, l.id);
      const shelves2 = await meshIds(page, l.id, '^SHELF-L');
      const lines2 = await bomOrder(page);
      check(`the same button again ("${label2}")`, btn2 && !l2.carousel && !(bodies2 || []).some((b) => b.role === 'carousel') && shelves2 && shelves2.length === (shelves0 || []).length && shelves2.length > 0 && sumQty(lines2, 'carousel') === 0,
        'the carousel is taken out: no line, no body, the SHELF-L boards back as before', `carousel ${l2.carousel}; bodies ${j(bodies2)}; shelves drawn ${j(shelves2)} (before ${j(shelves0)}); BOM ${sayLines(lines2, ['carousel'])}`);
      await bomClose(page);
      await shot(page, 'f09-walk-03-removed.png');
    }
  } catch (e) {
    await ended(page, 'f09', e);
  }
  const errs = pageErrors(page);
  note('page 4: console errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// === THE LEDGER =============================================================
const fresh = process.argv.includes('--fresh');
const ledger = `${SHOTS}walk${VARIANT}.txt`;
const today = new Date().toISOString().slice(0, 10);
const HEAD = [
  `T78 PART A walk, ${today}, HEAD 8bb4eee${VARIANT ? ` (VARIANT${VARIANT}: ${ascii(process.env.T78_WALK_NOTE || 'an experiment, not HEAD')})` : ''}`,
  `(the repo's HEAD when the walk ran: ${head}; the app under the mouse: ${process.env.E2E_URL || 'http://127.0.0.1:4173/'}, its build stamp is the first NOTE of f01)`,
  '',
  'CLAUDE.md T78 PART A (F1 to F9), walked section by section against npx vite',
  'preview of the branch (dist/), the hardware served from the silent showroom.',
  'Every gesture is a REAL mouse or key event at a DOM control\'s centre or at a',
  'pixel the scene\'s own raycaster says the thing is under (and the page says',
  'the canvas owns); the store is only READ. Line grammar:',
  '  PASS|FAIL  <section> | <gesture> | expect: <what was expected> | observed: <what was read>',
  '  NOTE       <section> | <reading> | <value>',
  '  FRAME      <section> | <file>  (the frame is beside this file)',
  'A FAIL is written down, never patched.',
  '',
].join('\n');
// One block per section; a rerun of a section replaces its block.
const blocks = new Map();
if (!fresh && existsSync(ledger)) {
  let name = null;
  for (const line of readFileSync(ledger, 'utf8').split('\n')) {
    const m = line.match(/^=== (f\d\d) /);
    if (m) { name = m[1]; blocks.set(name, [line]); continue; }
    if (/^(PART A:|SECTION |FRAMES )/.test(line)) { name = null; continue; }
    if (name && line.trim()) blocks.get(name).push(line);
  }
}
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
// The frames of every block (this run's and the kept ones), as the blocks name them, checked against the disk.
const framesOf = (n) => blocks.get(n).filter((x) => x.startsWith('FRAME')).map((x) => x.split(' | ').pop().trim());
const lost = names.flatMap(framesOf).filter((f) => !existsSync(`${SHOTS}${f}`));
if (lost.length) process.stdout.write(`FRAMES MISSING ON DISK: ${lost.join(', ')}\n`);
writeFileSync(ledger, ascii([
  HEAD,
  ...names.flatMap((n) => [...blocks.get(n), '']),
  ...counts.map((c) => `SECTION ${c.n}: ${c.pass} pass, ${c.fail} fail`),
  ...names.map((n) => { const mine = framesOf(n); return `FRAMES ${n} (${mine.length}): ${mine.join(', ')}${lost.some((f) => mine.includes(f)) ? ' (MISSING ON DISK: ' + mine.filter((f) => lost.includes(f)).join(', ') + ')' : ''}`; }),
  `PART A: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail`,
  '',
].join('\n')));
const failed = steps.filter((s) => !s.header && !s.note && !s.frame && !s.ok);
process.stdout.write(`\nPART A: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail\nfailed this run: ${failed.length}; frames ${frames.join(', ')}\n`);
await showroomDown();
process.exit(failed.length ? 1 : 0);
