#!/usr/bin/env node
// T78 PARTS B AND C, THE ACCEPTANCE WALK (CLAUDE.md T78 F10 to F15)
//
// The blind corner's strip and blank (F10), the Hafele pull-out (F11), the
// glass in the door and its kind (F12, PRO and retail), the wide-angle hinge
// family (F13), the arch across a drawer stack and on a small door (F14) and
// the inner fronts of internal drawers (F15), walked with a REAL mouse in the
// pattern of scripts/t78-walk.mjs (PART A): every gesture is the browser's own
// input pipe (CDP Input.dispatchMouseEvent / Input.dispatchKeyEvent /
// Input.insertText) at a DOM control's centre or at a pixel the scene's own
// raycaster says the piece is under and the page says the canvas owns (T74's
// pointOn, T75's reachFree, dragAlong). A native <select> is driven the way
// T75's harness drives one (a real click, the arrows, Enter). The store is
// READ (window.__cc.project.getState(), window.__cc.ui.getState(),
// window.__cc.views.room.three) to say what happened; it is never written to
// make something happen. The ONE exception is the stage: a new project and the
// editor's own door through the store (T74's pro(), as every walk since
// scripts/e2e-turn18.mjs). A FAIL is written down, never patched.
//
// This file is self-contained beside the two harnesses (t74-harness.mjs,
// t75-harness.mjs); it does not import scripts/t78-walk.mjs, whose hands it
// copies, so the two walks can be edited apart.
//
// Five pages, six sections:
//   page 1  f10 a blind base dragged into the right corner of wall 1, Add doors:
//               BLANK and POST at once (cut list, BOM, scene); a Standard on
//               wall 2 dragged to the corner stops on the strip (face + 40),
//               carries the stop record; pulled away, the strip stays
//           f11 Add items, Blind corner pull-out: the line, the body, the
//               shelves stepped aside; and back
//   page 2  f12 a Glass unit: the pane centred on the leaf shut and open, the
//               BOM line Smoked glass 4 mm, Clear by the per-leaf select; then
//               retail: a wardrobe, FRONTS Glass, the GLASS list, Clear glass
//   page 3  f13 a Standard's leaf on the wide family: no rung at 25 (said, no
//               article), 19 by the Front (mm) select: 170, a 2klik past 90,
//               a neighbour on the hinge side: Check #33 names the door
//   page 4  f14 a Drawer unit x3 Arched: the top front a ready slice, the two
//               lower blocked by the back bore (said); a 300 WUD Arched: ready
//   page 5  f15 Drawers behind doors, Drawers 2: two inner fronts in the cut
//               list, the BOM and the scene; Open all, a 2klik on IF1: the
//               box rides out with it
//
//   npx vite preview --port 4185 --outDir <dist>     (built first, from HEAD)
//   E2E_URL=http://127.0.0.1:4185/ E2E_DIST=<dist>/ node scripts/t78-walk-bc.mjs --fresh
//   node scripts/t78-walk-bc.mjs f12 f13             the pages that hold them
//
// Ledger: verify/t78/walk-bc.txt. Frames: verify/t78/f10-walk-*.png and so on.
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
  key, clickWith, boxOf, choose, until, reachFree, orbitFree, dragAlong, helperAt,
} from './t75-harness.mjs';

const REPO = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../verify/t78/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.E2E_URL || 'http://127.0.0.1:4185/';
const DIST = process.env.E2E_DIST || `${REPO}dist/`;
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }
// The build under the mouse names its own HEAD when it was archived out of the
// repo (HEAD.txt beside its dist/); otherwise the repo's HEAD is the build's.
let built = head;
try { if (existsSync(`${DIST}../HEAD.txt`)) built = readFileSync(`${DIST}../HEAD.txt`, 'utf8').trim(); } catch { /* the repo's */ }

const ORDER = ['f10', 'f11', 'f12', 'f13', 'f14', 'f15'];
const PAGES = {
  1: ['f10', 'f11'], 2: ['f12'], 3: ['f13'], 4: ['f14'], 5: ['f15'],
};
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const pageWanted = (n) => want.length === 0 || PAGES[n].some((s) => want.includes(s));

// === THE LEDGER'S HANDS (t78-walk.mjs's) ====================================
const steps = [];
const frames = [];
let current = '';
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
const how = (sel) => (sel && sel.already ? 'already selected by the add' : (sel && sel.by ? `by ${sel.by}` : 'NOT selected'));
const r1 = (v) => (v == null ? null : Math.round(Number(v) * 10) / 10);
const near = (a, b, tol = 1) => Math.abs(Number(a) - Number(b)) <= tol;
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));

// === IS THE CANVAS ALIVE? (t78-walk.mjs's) ==================================
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
    dead ? `not walked: the scene is dead (${await sceneDeath(page)}); every gesture of this section needs the canvas` : String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
  await shot(page, `${name}-walk-failure.png`).catch(() => {});
}

// === WHAT THE WALK READS ====================================================
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const stamp = (page) => page.ask('(document.querySelector(\'[data-build-stamp]\') || {}).getAttribute ? document.querySelector(\'[data-build-stamp]\').getAttribute(\'data-build-stamp\') : ((document.body.innerText || \'\').match(/#?\\d* ?.? ?[0-9-]+ [0-9:]+ UTC( . [0-9a-f]{7})?/) || [null])[0]');
const roomNow = (page) => page.ask(`JSON.parse(JSON.stringify(${S}.project.room))`);
const profileNum = (page, path) => page.ask(`(() => { let v = ${PROFILE}; for (const k of ${j(path)}.split('.')) v = v == null ? v : v[k]; return v ?? null; })()`);
const wallLen = (room, i) => {
  const c = room.corners; const a = c[i]; const b = c[(i + 1) % c.length];
  return Math.hypot(b.x - a.x, b.y - a.y);
};
/** A unit as the store holds it and as the engine cuts it, the fields PARTS B and C ask about. */
const unitOf = (page, id) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(id)});
  if (!u) return null; const r = P.unitResult(u.id);
  const pick = (b) => (b ? { x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, d: b.d } : null);
  const deco = (p) => (p.meta && p.meta.frontDecoration ? { style: p.meta.frontDecoration.style || null, status: p.meta.frontDecoration.status || null,
    problems: (p.meta.frontDecoration.problems || []).map((q) => q.code), slice: Boolean(p.meta.frontDecoration.stack && p.meta.frontDecoration.stack.slice),
    stack: p.meta.frontDecoration.stack ? { fronts: p.meta.frontDecoration.stack.fronts, heightMm: p.meta.frontDecoration.stack.heightMm, offsetMm: p.meta.frontDecoration.stack.offsetMm } : null } : null);
  return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall ?? 0, x: u.position.x_mm,
    w: u.params.width, d: u.params.depth, h: u.params.height, mount: u.params.mount_height ?? null,
    frontT: u.params.front_t ?? ${PROFILE}.front.thickness, hingeParam: u.params.hinge ?? null,
    wallGap: (u.params.wall_gap != null && u.params.wall_gap !== '') ? Number(u.params.wall_gap) : Math.max(0, Number((${PROFILE}.room || {}).wallBackClearance) || 0),
    blindSide: u.params.blind_side ?? null, blindPullout: u.params.blind_pullout === true,
    cornerButtLeft: u.params.corner_butt_left_mm ?? null, cornerButtRight: u.params.corner_butt_right_mm ?? null,
    cornerPostLeft: u.params.corner_post_left_mm ?? null, cornerPostRight: u.params.corner_post_right_mm ?? null,
    cornerPostAt: u.params.corner_post_at_mm ?? null,
    frontType: u.params.front_type || null, doors: r.derived ? r.derived.doors : null, drawersParam: u.params.drawers ?? null,
    items: ((u.params.sections && u.params.sections[0] && u.params.sections[0].items) || []).map((i) => i.kind),
    panels: r.panels.map((p) => ({ id: p.id, part: p.part, role: p.role, w: p.w, h: p.h, t: p.thickness, box: pick(p.box), material: p.material_role || null,
      hinge: p.meta ? (p.meta.hinge || null) : null, hingeFamily: p.meta ? (p.meta.hingeFamily || null) : null, openAngleDeg: p.meta ? (p.meta.openAngleDeg ?? null) : null,
      glass: p.meta && p.meta.glass ? { kind: p.meta.glass.kind || null, paneMm: p.meta.glass.paneMm ?? null, aperture: p.meta.glass.aperture ? { w: p.meta.glass.aperture.w, h: p.meta.glass.aperture.h } : null } : null,
      inner: p.meta ? p.meta.inner === true : false, drawer: p.meta ? (p.meta.drawer ?? null) : null, deco: deco(p), at: p.meta ? (p.meta.at_mm ?? null) : null })),
    hardware: (r.hardware || []).map((h) => ({ role: h.role, qty: h.qty, unit: h.unit, label: h.label || null, spec: h.spec_label || null, article: h.spec && h.spec.article != null ? h.spec.article : null, angle: h.spec && h.spec.angle != null ? h.spec.angle : null })),
    kits: ((r.assemblies && r.assemblies.cornerKits) || []).map((k) => ({ kind: k.kind, placeholder: k.placeholder === true, trays: (k.trays || []).length })),
    warnings: (r.warnings || []).map((w) => ({ code: w.code, panel: w.panel || null, message: w.message })) }; })()`);
const modalNow = (page) => page.ask(`${UI}.modal || null`);
const selectedNow = (page) => page.ask(`${UI}.selectedUnitId || null`);
const messagesNow = (page) => page.ask(`(${UI}.messages || []).map((m) => ({ id: m.id, level: m.level, message: m.message, action: m.action ? m.action.label : null }))`);
async function recordSaid(page) {
  await page.ask(`(() => { if (window.__walkSaid) return true; window.__walkSaid = []; const seen = new Set();
    const take = (s) => { for (const m of (s.messages || [])) { if (!seen.has(m.id)) { seen.add(m.id); window.__walkSaid.push(m.level + ': ' + m.message); } } };
    take(window.__cc.ui.getState()); window.__cc.ui.subscribe(take); return true; })()`);
}
const saidCount = (page) => page.ask('(window.__walkSaid || []).length');
const saidSince = (page, from) => page.ask(`(window.__walkSaid || []).slice(${from})`);
/** The project's findings, as runChecks() returns them (the Check panel reads the same list). */
const checksNow = (page) => page.ask(`${S}.runChecks().map((f) => ({ check: f.check, level: f.level, unitId: f.unitId || null, panelId: f.panelId || null, message: f.message }))`);

/** Every mesh the scene draws a unit's pieces with, by ccPanelId, boxed in the UNIT's frame (t78-walk.mjs's meshesOf). */
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
/** The distinct ccPanelIds the scene draws for a unit whose id matches a regex (source given as a string). */
const meshIds = (page, unitId, re) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; const re = new RegExp(${j(re)}); const out = new Set();
  unit.traverse((o) => { if (o.isMesh && o.userData && typeof o.userData.ccPanelId === 'string' && re.test(o.userData.ccPanelId)) out.add(o.userData.ccPanelId); });
  return [...out].sort(); })()`);
/** The bought bodies the scene draws in a unit (ccKitBody), with their tray count and model slot. */
const kitBodies = (page, unitId) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; const out = [];
  unit.traverse((o) => { if (o.userData && o.userData.ccKitBody) { let meshes = 0; o.traverse((m) => { if (m.isMesh) meshes += 1; });
    out.push({ role: o.userData.ccKitBody, placeholder: o.userData.ccKitPlaceholder === true, trays: o.userData.ccPulloutTrays ?? o.userData.ccCarouselTrays ?? null, model: o.userData.ccKitModel ?? null, meshes }); } });
  return out; })()`);
/**
 * THE PANE AGAINST ITS LEAF: the leaf's mesh (the one with most vertices under
 * ccPanelId) and the pane's (ccGlassPane), both boxed in the UNIT's frame, the
 * distance of their centres, and the pane's material (colour, opacity), read
 * so a change of kind can be seen. Null when the unit is not drawn.
 */
const paneVsLeaf = (page, unitId, leafId) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return { why: 'unit not drawn' }; unit.updateMatrixWorld(true); const inv = new T.Matrix4().copy(unit.matrixWorld).invert();
  const r = (q) => Math.round(q * 10) / 10;
  const boxOf = (o) => { const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox;
    const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const p = new T.Vector3(x, y, z).applyMatrix4(o.matrixWorld).applyMatrix4(inv); const q = [p.x * 1000, p.y * 1000, p.z * 1000];
      for (let i = 0; i < 3; i += 1) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); } }
    return { lo: lo.map(r), hi: hi.map(r), centre: { x: r((lo[0] + hi[0]) / 2), y: r((lo[1] + hi[1]) / 2), z: r((lo[2] + hi[2]) / 2) }, size: { x: r(hi[0] - lo[0]), y: r(hi[1] - lo[1]), z: r(hi[2] - lo[2]) } }; };
  let leaf = null; let pane = null;
  unit.traverse((o) => { if (!o.isMesh || !o.userData) return;
    if (o.userData.ccPanelId === ${j(leafId)}) { const nv = o.geometry && o.geometry.attributes && o.geometry.attributes.position ? o.geometry.attributes.position.count : 0; if (!leaf || nv > leaf.nv) leaf = { o, nv }; }
    if (o.userData.ccGlassPane === ${j(leafId)}) pane = o; });
  if (!leaf) return { why: 'no leaf mesh ' + ${j(leafId)} }; if (!pane) return { why: 'no pane mesh (ccGlassPane) for ' + ${j(leafId)}, leaf: boxOf(leaf.o) };
  const L = boxOf(leaf.o); const Pn = boxOf(pane);
  const m = Array.isArray(pane.material) ? pane.material[0] : pane.material;
  // Is the pane inside the leaf's swing group (the same ancestor chain)?
  let a = pane.parent; let shared = false; while (a && a !== unit) { let b = leaf.o.parent; while (b && b !== unit) { if (b === a) shared = true; b = b.parent; } if (shared) break; a = a.parent; }
  return { leaf: L, pane: Pn, d: { x: r(Pn.centre.x - L.centre.x), y: r(Pn.centre.y - L.centre.y), z: r(Pn.centre.z - L.centre.z) },
    material: m ? { color: m.color ? '#' + m.color.getHexString() : null, opacity: m.opacity ?? null, roughness: m.roughness ?? null, normalMap: Boolean(m.normalMap) } : null,
    sharedGroup: shared }; })()`);
/**
 * THE SWING A LEAF WEARS: the nearest ancestor of the leaf's mesh that is
 * turned (MovingPanel's group: rotation.y = dir * amount * swing), in radians
 * and degrees; and, read off the matrices, the angle between the leaf's own x
 * and the unit's x (the face turned out of the front plane).
 */
const swingOf = (page, unitId, leafId) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return { why: 'unit not drawn' }; let leaf = null;
  unit.traverse((o) => { if (!o.isMesh || !o.userData || o.userData.ccPanelId !== ${j(leafId)}) return;
    const nv = o.geometry && o.geometry.attributes && o.geometry.attributes.position ? o.geometry.attributes.position.count : 0; if (!leaf || nv > leaf.nv) leaf = { o, nv }; });
  if (!leaf) return { why: 'no leaf mesh ' + ${j(leafId)} };
  let g = leaf.o.parent; let rotY = 0; let rotX = 0; let hops = 0;
  while (g && g !== unit) { if (Math.abs(g.rotation.y) > 1e-3 || Math.abs(g.rotation.x) > 1e-3) { rotY = g.rotation.y; rotX = g.rotation.x; break; } g = g.parent; hops += 1; }
  unit.updateMatrixWorld(true); leaf.o.updateMatrixWorld(true);
  const inv = new T.Matrix3().setFromMatrix4(new T.Matrix4().copy(unit.matrixWorld).invert());
  const dx = new T.Vector3(1, 0, 0).transformDirection(leaf.o.matrixWorld).applyMatrix3(inv).normalize();
  const r = (q) => Math.round(q * 100) / 100;
  return { rotY: r(rotY), rotX: r(rotX), deg: r((Math.abs(rotY) * 180) / Math.PI), faceDeg: r((Math.atan2(Math.abs(dx.z), Math.abs(dx.x)) * 180) / Math.PI), hops }; })()`);

// === THE HANDS THIS WALK NEEDS (all real events) ============================
async function selectAll(page) {
  const k = {
    key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k, commands: ['selectAll'] });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(120);
}
/** Every window shut the way a client shuts one: Escape, then Done / Close by a real click (t78-walk-de.mjs's). */
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
/** The pieces a hand can click a cabinet by: the top first, then a leaf, a side, the bottom. */
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const pick = [];
  for (const f of [(p) => p.id === 'TOP' || p.part === 'TOP', (p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT' || p.part === 'FALSE-FRONT', (p) => p.role === 'side', (p) => p.role === 'bottom', (p) => p.role === 'blind_blank', (p) => p.role === 'back', () => true]) {
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
/** DOORS' own button on a unit that has no leaf yet (t78-walk.mjs's). */
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
/**
 * A cabinet DRAGGED along its wall to its end (dir +1) or its start (dir -1):
 * real drags of up to 900 mm each on a piece a hand can reach, repeated until
 * the store's x stops moving (the wall end, a neighbour, a corner stop) or
 * the drags run out. Returns the x after every drag and the piece grabbed.
 */
async function dragToEnd(page, unitId, dir, { stepMm = 900, maxDrags = 7 } = {}) {
  const xs = []; let by = null; let drags = 0;
  for (let i = 0; i < maxDrags; i += 1) {
    const u0 = await unitOf(page, unitId);
    let d = null;
    for (const pid of (await grabIds(page, unitId)).slice(0, 6)) {
      d = await dragAlong(page, unitId, pid, dir * stepMm);
      if (d) { by = pid; break; }
    }
    if (!d) break;
    drags += 1;
    await page.sleep(500);
    const u1 = await unitOf(page, unitId);
    xs.push(r1(u1.x));
    if (near(u0.x, u1.x, 0.5)) break;
  }
  return { xs, by, drags };
}
/** The plus sprites the scene draws (t78-walk.mjs's), each with its title and the pixel it projects to. */
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
/** A plus found by its title, brought within reach and CLICKED (t78-walk.mjs's). */
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
/**
 * A pixel on a piece a hand can 2KLIK: T75's reachFree, less every pixel that
 * lies on a PLUS SPRITE the scene draws over a selected cabinet (the inner
 * plus at a leaf's centre, 3d/AddPlus.jsx). T74's FIND asks the raycaster for
 * meshes only, so it calls the leaf the first thing under a pixel where r3f's
 * own picking meets the sprite first and hands the clicks to the plus (the
 * f13 probe: a 2klik at the leaf's centre opened nothing, with the unit
 * selected; the same pixel swung the leaf with nothing selected).
 */
async function reachPiece(page, unitId, panelId) {
  await settleCamera(page);
  for (const [dx, dy] of [[0, 0], [120, 0], [-240, 0], [120, 120], [260, 0]]) {
    if (dx || dy) await orbitFree(page, dx, dy);
    const all = await pointOn(page, unitId, panelId, { all: true, grid: 40 });
    if (!(all && all.points && all.points.length)) continue;
    const plus = (await helperAt(page, '(u) => u.ccAddPlus === true || u.ccHelper === true')) || [];
    const far = all.points.filter((p) => plus.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 30));
    const at = await page.ask(`(function (points) { const v = window.__cc.views.room; const c = v.gl.domElement;
      const own = points.filter((p) => { const el = document.elementFromPoint(p.x, p.y); return el === c || (el && c.contains(el)); });
      if (!own.length) return null; const cx = own.reduce((s, p) => s + p.x, 0) / own.length; const cy = own.reduce((s, p) => s + p.y, 0) / own.length;
      own.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy)); return { x: own[0].x, y: own[0].y, n: own.length }; })(${j(far.length ? far : all.points)})`);
    if (at) return { ...at, awayFromPlus: far.length > 0, pluses: plus.length };
  }
  return null;
}
/** A leaf swung by a 2klik where a hand can reach it; the window it opens shut by its own key. */
async function dblclickLeaf(page, unitId, panelId, settleMs = 1800) {
  const at = await reachPiece(page, unitId, panelId);
  if (!at) return null;
  await page.dblclick(at.x, at.y);
  await page.sleep(settleMs);
  const shut = await closeModals(page);
  return { at, shut };
}
/** The toolbar's Open all / Close all (data-open-all-doors), pressed; what it read before. */
async function openAll(page) {
  const state = await page.ask('(() => { const b = document.querySelector(\'[data-open-all-doors="1"]\'); return b ? { there: true, disabled: b.disabled, pressed: b.getAttribute(\'aria-pressed\') === \'true\', text: b.textContent.trim() } : { there: false }; })()');
  // Pressed only when it reads "Open all": a door the app already swung open
  // (a drawer added behind it opens it, T58's covers law) would be shut by it.
  if (state.there && !state.disabled && !state.pressed) { await page.press('[data-open-all-doors="1"]'); await page.sleep(1800); return { ...state, pressed: true, by: 'pressed' }; }
  return { ...state, by: state.pressed ? 'already open (not pressed)' : 'not pressed' };
}
/** The right panel's warnings list (UnitWarnings: data-warning-code), as drawn. */
const warningsDrawn = (page) => page.ask('[...document.querySelectorAll(\'[data-unit-warnings] [data-warning-code]\')].map((li) => li.getAttribute(\'data-warning-code\') + \': \' + li.textContent.replace(/\\s+/g, \' \').trim().slice(0, 160))');
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
    const m = (s[1] || '').match(/^([\\d.]+)\\s*(\\S*)/); return { role: li.getAttribute('data-bom-line'), label: s[0] || '', qty: m ? Number(m[1]) : null, unit: m ? m[2] : null, spec: s[2] || '', yellow: li.getAttribute('data-bom-yellow') === '1', text: li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 200) }; })`);
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
/** A frame clipped to the screen rectangle some pieces cover (with a margin), scaled up (t78-walk.mjs's). */
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
/** The stage: PRO's editor on a new project, the walk's "said" recorder on, the build and the room written down. */
async function stage(page, what) {
  await pro(page, { base: BASE });
  await recordSaid(page);
  note('the build under the mouse', `${await stamp(page) || 'no stamp read'}; built from HEAD ${built}; the repo's HEAD ${head}; url ${BASE}`);
  const room = await roomNow(page);
  check(`a new project (the stage for ${what}), its room`, wallLen(room, 0) === 4000 && wallLen(room, 1) === 3000,
    'a 4000 x 3000 room', `${room.corners.length} walls: ${room.corners.map((c, i) => `wall ${i + 1} ${wallLen(room, i)}`).join(', ')}; height ${room.height}`);
  return room;
}

// ============================================================================
// PAGE 1: f10 THE STRIP AND THE BLANK, f11 THE HAFELE PULL-OUT
// ============================================================================
if (pageWanted(1)) {
  const page = await open();
  let blind = null; let bud = null;
  try {
    begin('f10', 'THE 40 MM CORNER STRIP AND THE BLANK ARE THE BLIND KIT\'S OWN PARTS');
    const room = await stage(page, 'the blind corner');
    const B = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'blind-corner' });
    blind = B.unit ? await unitOf(page, B.unit.id) : null;
    check('Library, Kitchen, Base units, Blind corner (the real row)', blind && blind.type === 'BLIND_BASE',
      'a BLIND_BASE on wall 1', blind ? `${blind.type} ${blind.num} on wall ${blind.wall + 1} at x ${blind.x}, ${blind.w} x ${blind.h} x ${blind.d}, blind_side ${blind.blindSide}, front_t ${blind.frontT}, wall gap ${blind.wallGap}` : `row pressed ${B.ok}, nothing added`);
    if (!blind) throw new Error('no blind base');
    if (!(await sceneCheck(page, 'after the blind base is drawn'))) throw new Error(DEAD);
    // INTO THE RIGHT CORNER OF WALL 1, BY REAL DRAGS.
    const sel = await selectUnit(page, blind.id);
    const drag = await dragToEnd(page, blind.id, +1);
    const b1 = await unitOf(page, blind.id);
    // THE STOP AT A WALL'S END is the side infill's (turn 4, BACKLOG #15; projectStore
    // wallMarginOf): the design's infill.sideWidth when one is made, never less than
    // the wall clearance. The blind lands ON it (the magnet), blind_side turned to the corner.
    const sideInfill = await page.ask(`Math.max(0, Number((${S}.project.design.infill || {}).sideWidth) || 0)`);
    const wallClear = await profileNum(page, 'room.wallBackClearance');
    const margin = Math.max(sideInfill, wallClear);
    const endX = wallLen(room, 0) - margin - b1.w;
    check(`the blind selected (${how(sel)}), dragged along wall 1 to its end (${drag.drags} drag(s) of 900 by ${drag.by || 'nothing in reach'})`, drag.drags > 0 && near(b1.x, endX, 1) && b1.blindSide === 'right',
      `x_mm = ${wallLen(room, 0)} - the wall-end stop ${margin} (the side infill's width ${sideInfill}, never under the wall clearance ${wallClear}; wallMarginOf) - width ${b1.w} = ${endX}: the right corner of wall 1; blind_side turned to right`,
      `x after each drag ${j(drag.xs)}; blind_side now ${b1.blindSide}; said ${j(await saidSince(page, 0))}`);
    const added = await addDoors(page, blind.id);
    const b2 = await unitOf(page, blind.id);
    const blank = b2.panels.find((p) => p.role === 'blind_blank') || null;
    const post = b2.panels.find((p) => p.part === 'CORNER-POST') || null;
    check(`DOORS, Add doors (${added})`, b2.panels.some((p) => p.part === 'FRONT') && blank && post && post.w === 40 && post.t === b2.frontT && post.material === 'front' && post.id === `${b2.num}-POST`,
      `one leaf; the blank ${b2.num}-BLANK and the strip ${b2.num}-POST (40 x front_t ${b2.frontT}, front material) cut at once, no neighbour yet`,
      `leaves ${j(b2.panels.filter((p) => p.part === 'FRONT').map((p) => p.id))}; blank ${blank ? `${blank.id} ${blank.w} x ${blank.h} x ${blank.t} (${blank.material})` : 'NONE'}; post ${post ? `${post.id} ${post.w} x ${post.h} x ${post.t} (${post.material}), at_mm ${post.at}, box ${j(post.box)}` : 'NONE'}; corner_post_at_mm ${b2.cornerPostAt}`);
    const parts = await bomParts(page);
    const blankRows = parts ? parts.rows.filter((r) => /-BLANK$/.test(r.id)) : [];
    const postRows = parts ? parts.rows.filter((r) => /-POST$/.test(r.id)) : [];
    check('BOM (the Bill of materials button), Parts: BOTH the blank and the strip', blankRows.length === 1 && postRows.length === 1 && /\b40\b/.test(`${postRows[0] ? `${postRows[0].w} ${postRows[0].h}` : ''}`),
      'one -BLANK row and one -POST row 40 wide', `blank rows ${j(blankRows.map((r) => r.text))}; post rows ${j(postRows.map((r) => r.text))}`);
    await bomFrame(page, 'f10-walk-02-bom-blank-post.png');
    await bomClose(page);
    const postMeshes = await meshIds(page, blind.id, '-POST$');
    const blankMeshes = await meshIds(page, blind.id, '-BLANK$');
    check('the scene draws the strip', postMeshes && postMeshes.length === 1, 'one mesh whose ccPanelId ends with -POST', `post meshes ${j(postMeshes)}; blank meshes ${j(blankMeshes)}`);
    await shot(page, 'f10-walk-01-blind-alone.png');
    await pieceFrame(page, blind.id, [`${b2.num}-POST`, `${b2.num}-BLANK`], 'f10-walk-01-blind-close.png');
    // THE SECOND RUN: A STANDARD ON WALL 2, DRAGGED TO THE CORNER.
    const A = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'door-base' });
    bud = A.unit ? await unitOf(page, A.unit.id) : null;
    check('Library, Kitchen, Base units, Standard', bud && bud.type === 'BUD', 'a BUD', bud ? `${bud.num} on wall ${bud.wall + 1} at x ${bud.x}, width ${bud.w}` : 'nothing added');
    if (!bud) throw new Error('no BUD');
    const selB = await selectUnit(page, bud.id);
    await sectionOpen(page, 'Carcass');
    const wallSel = await choose(page, byLabel('Carcass', 'Wall', 'select'), '1');
    await until(page, `(${S}.units.find((u) => u.id === ${j(bud.id)}) || { position: {} }).position.wall === 1`, 4000);
    await page.sleep(600);
    const bOnWall2 = await unitOf(page, bud.id);
    check(`the BUD selected (${how(selB)}), Carcass, the Wall select set to wall 2 by the real select (${wallSel.ok ? `"${wallSel.label}"` : wallSel.why})`, wallSel.ok && bOnWall2.wall === 1,
      'position.wall 1 (wall 2)', `wall ${bOnWall2.wall + 1} at x ${bOnWall2.x}; select after ${j(wallSel.after && wallSel.after.value)}; said ${j(await saidSince(page, 0)).slice(0, 300)}`);
    const addedB = await addDoors(page, bud.id);
    const said0 = await saidCount(page);
    const dragB = await dragToEnd(page, bud.id, -1);
    const b3 = await unitOf(page, blind.id);
    const u3 = await unitOf(page, bud.id);
    const faceA = b3.wallGap + b3.d + (await profileNum(page, 'doors.gap')) + b3.frontT;
    const stop = faceA + 40;
    check(`Add doors on it (${addedB}); dragged along wall 2 toward the corner (${dragB.drags} drag(s) by ${dragB.by || 'nothing in reach'})`, dragB.drags > 0 && near(u3.x, stop, 1),
      `x_mm = the blind's face ${r1(faceA)} (gap ${b3.wallGap} + depth ${b3.d} + door gap + front ${b3.frontT}) + 40 = ${r1(stop)}`, `x after each drag ${j(dragB.xs)}; final x ${u3.x}; said ${j(await saidSince(page, said0))}`);
    check('the stop record on the second run, the strip on the kit', u3.cornerButtLeft === 40 && u3.cornerPostLeft == null && typeof b3.cornerPostAt === 'number' && u3.panels.filter((p) => p.role === 'corner_post').length === 0 && b3.panels.filter((p) => p.part === 'CORNER-POST').length === 1,
      'the BUD: corner_butt_left_mm 40, no corner_post_left_mm, no post of its own; the blind: corner_post_at_mm a number, one CORNER-POST still',
      `BUD corner_butt_left_mm ${u3.cornerButtLeft}, corner_post_left_mm ${u3.cornerPostLeft}, its corner_post boards ${u3.panels.filter((p) => p.role === 'corner_post').length}; blind corner_post_at_mm ${b3.cornerPostAt}, CORNER-POST boards ${b3.panels.filter((p) => p.part === 'CORNER-POST').length} (at_mm ${j(b3.panels.filter((p) => p.part === 'CORNER-POST').map((p) => p.at))})`);
    const found = await checksNow(page);
    note('the Check after the second run (no #27 open corner expected)', `${found.length} finding(s): ${j(found.map((f) => `#${f.check} ${f.level}: ${f.message.slice(0, 90)}`))}`);
    await shot(page, 'f10-walk-03-second-run.png');
    await pieceFrame(page, blind.id, [`${b2.num}-POST`], 'f10-walk-03-strip-close.png');
    // PULLED AWAY: THE STRIP STAYS.
    const said1 = await saidCount(page);
    let pull = null;
    for (const pid of (await grabIds(page, bud.id)).slice(0, 6)) { pull = await dragAlong(page, bud.id, pid, 1200); if (pull) { pull.by = pid; break; } }
    await page.sleep(700);
    const b4 = await unitOf(page, blind.id);
    const u4 = await unitOf(page, bud.id);
    const postMeshes2 = await meshIds(page, blind.id, '-POST$');
    check(`the BUD dragged 1200 away from the corner (${pull ? `by ${pull.by}` : 'nothing in reach'})`, pull && u4.x > stop + 100 && u4.cornerButtLeft == null && b4.cornerPostAt == null && b4.panels.some((p) => p.part === 'CORNER-POST') && postMeshes2 && postMeshes2.length === 1,
      'the stop record gone from the BUD and corner_post_at_mm from the blind; the strip STAYS in the cut list and the scene (it is the kit\'s)',
      `BUD x ${u4.x}, corner_butt_left_mm ${u4.cornerButtLeft}; blind corner_post_at_mm ${b4.cornerPostAt}, CORNER-POST boards ${b4.panels.filter((p) => p.part === 'CORNER-POST').length} (at_mm ${j(b4.panels.filter((p) => p.part === 'CORNER-POST').map((p) => p.at))}); post meshes ${j(postMeshes2)}; said ${j(await saidSince(page, said1))}`);
    await shot(page, 'f10-walk-04-pulled-away.png');
  } catch (e) {
    await ended(page, 'f10', e);
  }

  try {
    begin('f11', 'THE HAFELE BLIND-CORNER PULL-OUT: a line and a body, the shelves step aside, and back');
    if (!blind) throw new Error('no blind base from f10');
    if (!(await alive(page))) throw new Error(DEAD);
    // A SHELF FIRST (a library blind carries none), so the pull-out has one to step aside.
    const sel = await selectUnit(page, blind.id);
    const opened = await sectionOpen(page, 'Add items');
    if (await page.has('[data-add-kind="shelves"]')) await page.press('[data-add-kind="shelves"]');
    const shelfCount = await boxOf(page, '(() => { const s = [...document.querySelectorAll(\'[data-section="Add items"] span.cc-label\')].find((x) => x.textContent.trim() === \'Add\' && x.parentElement.querySelector(\'input\')); return s ? s.parentElement.querySelector(\'input\') : null; })()');
    if (shelfCount) {
      await clickWith(page, shelfCount.x, shelfCount.y);
      await typeNumber(page, 1);
      const add = await boxOf(page, '[...document.querySelectorAll(\'[data-section="Add items"] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add\')');
      if (add) await clickWith(page, add.x, add.y);
      await until(page, `${S}.unitResult(${j(blind.id)}).panels.some((p) => p.part === 'SHELF')`, 5000);
      await page.sleep(900);
    }
    const bS = await unitOf(page, blind.id);
    const shelves0 = await meshIds(page, blind.id, '^SHELF');
    check(`the blind selected (${how(sel)}), Add items (${opened}), Shelves, 1, Add`, shelfCount && bS.panels.some((p) => p.part === 'SHELF') && shelves0 && shelves0.length > 0,
      'one SHELF board in the cut list and drawn', `count field ${shelfCount ? 'typed' : 'NOT FOUND'}; shelves cut ${j(bS.panels.filter((p) => p.part === 'SHELF').map((p) => p.id))}; drawn ${j(shelves0)}`);
    await sectionOpen(page, 'Add items');
    const rowThere = await page.has('[data-add-kind="blind_pullout"]');
    if (rowThere) await page.press('[data-add-kind="blind_pullout"]');
    const btn = await boxOf(page, 'document.querySelector(\'[data-corner-kit="blind_pullout"]\')');
    const label = btn ? await page.text('[data-corner-kit="blind_pullout"]') : null;
    check('the Blind corner pull-out row of Add items', rowThere && btn, 'the row [data-add-kind=blind_pullout] and its button [data-corner-kit=blind_pullout]',
      `row ${rowThere}; button ${btn ? `"${label}" at ${btn.x},${btn.y}` : 'NOT FOUND'}`);
    if (btn) {
      const said0 = await saidCount(page);
      await clickWith(page, btn.x, btn.y);
      await until(page, `(${S}.units.find((u) => u.id === ${j(blind.id)}) || { params: {} }).params.blind_pullout === true`, 4000);
      await page.sleep(1000);
      const b1 = await unitOf(page, blind.id);
      const bodies = await kitBodies(page, blind.id);
      const body = (bodies || []).find((b) => b.role === 'blind_pullout') || null;
      const shelves1 = await meshIds(page, blind.id, '^SHELF');
      const lines = await bomOrder(page);
      const line = lines.find((l) => l.role === 'blind_pullout') || null;
      check(`"${label}" (a real click)`, b1.blindPullout && b1.kits.some((k) => k.kind === 'blind_pullout' && k.placeholder) && body && body.trays === 2 && shelves1 && shelves1.length === 0 && line && line.label === 'Hafele blind corner pull-out' && line.qty === 1,
        'params.blind_pullout true; a BOM line "Hafele blind corner pull-out" x1; a scene body with ccKitBody blind_pullout (two trays, a placeholder); the SHELF meshes gone',
        `blind_pullout ${b1.blindPullout}; kits ${j(b1.kits)}; bodies ${j(bodies)}; shelves drawn ${j(shelves1)}; shelves cut ${j(b1.panels.filter((p) => p.part === 'SHELF').map((p) => p.id))}; BOM ${sayLines(lines, ['blind_pullout'])}; engine line ${j(b1.hardware.filter((h) => h.role === 'blind_pullout'))}; warnings ${j(b1.warnings.map((w) => w.code))}; said ${j(await saidSince(page, said0))}`);
      await bomFrame(page, 'f11-walk-02-bom.png');
      await bomClose(page);
      await shot(page, 'f11-walk-01-fitted.png');
      await pieceFrame(page, blind.id, [`${b1.num}-BLANK`, 'TOP', 'BOTTOM'], 'f11-walk-01-fitted-close.png');
      // AND BACK.
      await selectUnit(page, blind.id);
      await sectionOpen(page, 'Add items');
      if (!(await page.has('[data-corner-kit="blind_pullout"]')) && await page.has('[data-add-kind="blind_pullout"]')) await page.press('[data-add-kind="blind_pullout"]');
      const btn2 = await boxOf(page, 'document.querySelector(\'[data-corner-kit="blind_pullout"]\')');
      const label2 = btn2 ? await page.text('[data-corner-kit="blind_pullout"]') : null;
      if (btn2) await clickWith(page, btn2.x, btn2.y);
      await until(page, `(${S}.units.find((u) => u.id === ${j(blind.id)}) || { params: {} }).params.blind_pullout !== true`, 4000);
      await page.sleep(1000);
      const b2 = await unitOf(page, blind.id);
      const bodies2 = await kitBodies(page, blind.id);
      const shelves2 = await meshIds(page, blind.id, '^SHELF');
      const lines2 = await bomOrder(page);
      check(`the same button again ("${label2}")`, btn2 && !b2.blindPullout && !(bodies2 || []).some((b) => b.role === 'blind_pullout') && shelves2 && shelves2.length === (shelves0 || []).length && shelves2.length > 0 && sumQty(lines2, 'blind_pullout') === 0,
        'the pull-out is taken out: no line, no body, the SHELF boards back as before', `blind_pullout ${b2.blindPullout}; bodies ${j(bodies2)}; shelves drawn ${j(shelves2)} (before ${j(shelves0)}); BOM ${sayLines(lines2, ['blind_pullout'])}`);
      await bomClose(page);
      await shot(page, 'f11-walk-03-removed.png');
    }
  } catch (e) {
    await ended(page, 'f11', e);
  }
  const errs = pageErrors(page);
  note('page 1: console errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// ============================================================================
// PAGE 2: f12 THE GLASS IS IN THE DOOR; SMOKE BY DEFAULT, WITH A CHOICE (PRO, THEN RETAIL)
// ============================================================================
if (pageWanted(2)) {
  const page = await open();
  try {
    begin('f12', 'THE GLASS IS IN THE DOOR, SMOKE BY DEFAULT, WITH A CHOICE: PRO, then retail');
    await stage(page, 'the glass unit');
    const G = await addFromLibrary(page, { category: 'Kitchen', path: ['wall-units'], entry: 'glass-unit' });
    let g = G.unit ? await unitOf(page, G.unit.id) : null;
    check('Library, Kitchen, Wall units, Glass unit (the real row)', g && g.type === 'WUD_GLASS', 'a WUD_GLASS', g ? `${g.type} ${g.num} on wall ${g.wall + 1} at x ${g.x}, ${g.w} x ${g.h} x ${g.d}, mount ${g.mount}, front_type ${g.frontType}` : `row pressed ${G.ok}, nothing added`);
    if (!g) throw new Error('no glass unit');
    if (!(await sceneCheck(page, 'after the glass unit is drawn'))) throw new Error(DEAD);
    const added = await addDoors(page, g.id);
    g = await unitOf(page, g.id);
    const leaf = g.panels.find((p) => p.part === 'FRONT' && p.glass) || null;
    check(`DOORS, Add doors (${added})`, leaf && leaf.glass.kind === 'smoke' && leaf.glass.paneMm === 4,
      'one glazed leaf whose meta.glass.kind is smoke (the owner\'s default), pane 4 mm', `leaves ${j(g.panels.filter((p) => p.part === 'FRONT').map((p) => `${p.id} ${p.w} x ${p.h} x ${p.t} glass ${j(p.glass)}`))}`);
    if (!leaf) throw new Error('no glazed leaf');
    let pv = null;
    for (let t = 0; t < 20; t += 1) { pv = await paneVsLeaf(page, g.id, leaf.id); if (pv && pv.pane) break; await page.sleep(300); }
    const centred = (p) => p && p.pane && Math.abs(p.d.x) <= 1 && Math.abs(p.d.y) <= 1 && Math.abs(p.d.z) <= 1;
    check('the pane in the SCENE, shut, measured in the unit frame', centred(pv) && pv.sharedGroup && near(pv.pane.size.x, leaf.glass.aperture.w, 1) && near(pv.pane.size.y, leaf.glass.aperture.h, 1),
      `the pane mesh (ccGlassPane) centred on the leaf mesh within 1 mm, the aperture's size (${leaf.glass.aperture.w} x ${leaf.glass.aperture.h}), inside the leaf's own swing group`,
      pv ? (pv.why ? pv.why : `leaf centre ${j(pv.leaf.centre)} (size ${j(pv.leaf.size)}); pane centre ${j(pv.pane.centre)} (size ${j(pv.pane.size)}); d ${j(pv.d)}; shared swing group ${pv.sharedGroup}; material ${j(pv.material)}`) : 'nothing read');
    const smoke = pv && pv.material ? pv.material : null;
    await shot(page, 'f12-walk-01-shut.png');
    await pieceFrame(page, g.id, [leaf.id], 'f12-walk-01-shut-close.png');
    // OPEN BY A 2KLIK ON THE LEAF.
    const open2 = await dblclickLeaf(page, g.id, leaf.id);
    const pvOpen = await paneVsLeaf(page, g.id, leaf.id);
    const moved = pv && pvOpen && pvOpen.pane ? Math.hypot(pvOpen.leaf.centre.x - pv.leaf.centre.x, pvOpen.leaf.centre.z - pv.leaf.centre.z) : 0;
    const sw = await swingOf(page, g.id, leaf.id);
    check(`a 2klik on the leaf (${open2 ? `pixel ${open2.at.x},${open2.at.y}${open2.shut.seen.length ? `; the ${open2.shut.seen.join(', ')} window shut by ${open2.shut.by}` : ''}` : 'NOT IN REACH'}), 1.8 s later`, open2 && centred(pvOpen) && moved > 50,
      'the leaf swung (its centre travels over 50 mm) and the pane still centred on it within 1 mm: it moves with the door',
      pvOpen ? (pvOpen.why ? pvOpen.why : `leaf centre ${j(pvOpen.leaf.centre)} (moved ${r1(moved)}); pane centre ${j(pvOpen.pane.centre)}; d ${j(pvOpen.d)}; swing ${j(sw)}`) : 'nothing read');
    await shot(page, 'f12-walk-02-open.png');
    await pieceFrame(page, g.id, [leaf.id], 'f12-walk-02-open-close.png');
    // SHUT AGAIN, THE SAME WAY.
    await dblclickLeaf(page, g.id, leaf.id, 1500);
    const lines = await bomOrder(page);
    const glassLine = lines.find((l) => l.role === 'glass_pane') || null;
    check('BOM, Order tab, Ironmongery: the glass line', glassLine && glassLine.label === 'Smoked glass 4 mm' && glassLine.qty === 1,
      '"Smoked glass 4 mm" x1', `${sayLines(lines, ['glass_pane'])}; engine ${j(g.hardware.filter((h) => h.role === 'glass_pane'))}`);
    await bomFrame(page, 'f12-walk-03-bom-smoke.png');
    await bomClose(page);
    // CLEAR, BY THE PER-LEAF SELECT.
    const sel = await selectUnit(page, g.id);
    await sectionOpen(page, 'Carcass');
    await sectionOpen(page, 'Doors');
    const there = await page.has(`[data-door-glass="${leaf.id}"]`);
    const res = there ? await choose(page, `document.querySelector('[data-door-glass="${leaf.id}"]')`, 'clear') : { ok: false, why: `control not found: [data-door-glass="${leaf.id}"]` };
    await until(page, `(${S}.unitResult(${j(g.id)}).panels.find((p) => p.id === ${j(leaf.id)}) || { meta: {} }).meta.glass && ${S}.unitResult(${j(g.id)}).panels.find((p) => p.id === ${j(leaf.id)}).meta.glass.kind === 'clear'`, 5000);
    await page.sleep(900);
    const g2 = await unitOf(page, g.id);
    const leaf2 = g2.panels.find((p) => p.id === leaf.id);
    let pv2 = null;
    for (let t = 0; t < 20; t += 1) { pv2 = await paneVsLeaf(page, g.id, leaf.id); if (pv2 && pv2.material && smoke && pv2.material.color !== smoke.color) break; await page.sleep(300); }
    const lines2 = await bomOrder(page);
    const glassLine2 = lines2.find((l) => l.role === 'glass_pane') || null;
    check(`the glass unit selected (${how(sel)}); the Per leaf row's glass select set to Clear by the real select (${res.ok ? `"${res.label}"` : res.why})`,
      res.ok && leaf2 && leaf2.glass.kind === 'clear' && glassLine2 && glassLine2.label === 'Clear glass 4 mm' && pv2 && pv2.material && smoke && (pv2.material.color !== smoke.color || pv2.material.opacity !== smoke.opacity),
      'meta.glass.kind clear; the BOM line "Clear glass 4 mm"; the pane\'s material colour or opacity changed from the smoke one',
      `select ${j(res.after && res.after.value)} (options ${j(res.before && res.before.options)}); kind ${leaf2 ? leaf2.glass.kind : '?'}; BOM ${sayLines(lines2, ['glass_pane'])}; pane material smoke ${j(smoke)} -> clear ${j(pv2 && pv2.material)}`);
    await bomFrame(page, 'f12-walk-04-bom-clear.png');
    await bomClose(page);
    await shot(page, 'f12-walk-04-clear.png');
  } catch (e) {
    await ended(page, 'f12', e);
  }
  const errs = pageErrors(page);
  note('page 2 (PRO): console errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();

  // RETAIL: WHERE, a wardrobe; FRONTS, Glass; the GLASS list; Clear glass.
  const rp = await open();
  try {
    current = 'f12';
    await rp.showroom(`${BASE}retail.html#/design`);
    await rp.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout: 45000 });
    await rp.sleep(2600);
    await rp.press('[data-testid="cat-where"]');
    await rp.press('[data-testid="where-add-wardrobe"]');
    await rp.sleep(1800);
    const units = await unitsNow(rp);
    const w = units[0] ? await unitOf(rp, units[0].id) : null;
    check('retail.html#/design: WHERE, Add a wardrobe (real clicks)', w && /WARDROBE/.test(w.type), 'a wardrobe in the room', w ? `${w.type} ${w.num}, ${w.w} x ${w.h} x ${w.d}, doors ${w.doors}` : 'nothing added');
    if (!w) throw new Error('no wardrobe');
    if (!(await sceneCheck(rp, 'after the wardrobe is drawn'))) throw new Error(DEAD);
    await rp.press('[data-testid="cat-fronts"]');
    await rp.sleep(900);
    const glRow = await rp.ask('(() => { const b = document.querySelector(\'[data-testid="fronts-style-GL"]\'); return b ? { there: true, disabled: b.disabled, soon: b.getAttribute(\'data-soon\'), refused: b.getAttribute(\'data-refused\'), on: b.getAttribute(\'data-on\') } : { there: false }; })()');
    if (glRow.there && !glRow.disabled) await rp.press('[data-testid="fronts-style-GL"]');
    await until(rp, 'Boolean(document.querySelector(\'[data-testid="fronts-glass"]\'))', 5000);
    await rp.sleep(900);
    const list = await rp.ask('(() => { const l = document.querySelector(\'[data-testid="fronts-glass"]\'); if (!l) return null; return [...l.querySelectorAll(\'button\')].map((b) => ({ id: b.getAttribute(\'data-testid\'), on: b.getAttribute(\'data-on\'), text: b.textContent.trim() })); })()');
    const w1 = await unitOf(rp, w.id);
    const rLeaf = w1.panels.find((p) => p.part === 'FRONT' && p.glass) || null;
    check(`FRONTS, the Glass style (${glRow.there ? `row there, disabled ${glRow.disabled}, soon ${glRow.soon}, refused ${glRow.refused}` : 'row NOT THERE'})`, glRow.there && !glRow.disabled && list && list.length === 3 && list.some((r) => r.id === 'fronts-glass-smoke' && r.on === 'yes') && rLeaf && rLeaf.glass.kind === 'smoke',
      'the GLASS list ([data-testid=fronts-glass]) with three rows, Smoked on; the wardrobe\'s leaves glazed smoke', `list ${j(list)}; leaves ${j(w1.panels.filter((p) => p.part === 'FRONT').map((p) => `${p.id} glass ${j(p.glass)}`))}`);
    await shot(rp, 'f12-walk-05-retail-glass.png');
    const paneBefore = rLeaf ? await paneVsLeaf(rp, w.id, rLeaf.id) : null;
    const glassBefore = await rp.ask(`${S}.project.design.fronts ? (${S}.project.design.fronts.glassKind ?? null) : null`);
    if (await rp.has('[data-testid="fronts-glass-clear"]')) await rp.press('[data-testid="fronts-glass-clear"]');
    await until(rp, `${S}.project.design.fronts && ${S}.project.design.fronts.glassKind === 'clear'`, 5000);
    await rp.sleep(900);
    const glassAfter = await rp.ask(`${S}.project.design.fronts ? (${S}.project.design.fronts.glassKind ?? null) : null`);
    let paneAfter = null;
    for (let t = 0; t < 20; t += 1) { paneAfter = rLeaf ? await paneVsLeaf(rp, w.id, rLeaf.id) : null; if (paneAfter && paneAfter.material && paneBefore && paneBefore.material && paneAfter.material.color !== paneBefore.material.color) break; await rp.sleep(300); }
    const w2 = await unitOf(rp, w.id);
    const rLeaf2 = rLeaf ? w2.panels.find((p) => p.id === rLeaf.id) : null;
    check('Clear glass (a real click on the row)', glassAfter === 'clear' && rLeaf2 && rLeaf2.glass.kind === 'clear' && paneBefore && paneAfter && paneBefore.material && paneAfter.material && (paneAfter.material.color !== paneBefore.material.color || paneAfter.material.opacity !== paneBefore.material.opacity),
      'design.fronts.glassKind clear; the leaf\'s meta.glass.kind clear; the retail scene\'s pane material changed', `glassKind ${j(glassBefore)} -> ${j(glassAfter)}; leaf kind ${rLeaf2 ? rLeaf2.glass.kind : '?'}; pane material ${j(paneBefore && paneBefore.material)} -> ${j(paneAfter && paneAfter.material)}; pane centred ${paneAfter && paneAfter.d ? j(paneAfter.d) : '?'}`);
    await shot(rp, 'f12-walk-06-retail-clear.png');
  } catch (e) {
    await ended(rp, 'f12', e);
  }
  const rerrs = pageErrors(rp);
  note('page 2 (retail): console errors', rerrs.length ? rerrs.slice(0, 3).join(' | ') : 'none');
  await rp.close();
}

// ============================================================================
// PAGE 3: f13 WIDE-ANGLE HINGES (155 / 170)
// ============================================================================
if (pageWanted(3)) {
  const page = await open();
  try {
    begin('f13', 'WIDE-ANGLE HINGES: no rung at 25 (said), 170 at 19, a 2klik past 90, Check #33 names the door');
    const room = await stage(page, 'the wide hinge');
    const A = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'door-base' });
    let bud = A.unit ? await unitOf(page, A.unit.id) : null;
    check('Library, Kitchen, Base units, Standard', bud && bud.type === 'BUD', 'a BUD', bud ? `${bud.num} on wall ${bud.wall + 1} at x ${bud.x}, width ${bud.w}, front_t ${bud.frontT}` : 'nothing added');
    if (!bud) throw new Error('no BUD');
    if (!(await sceneCheck(page, 'after the BUD is drawn'))) throw new Error(DEAD);
    const added = await addDoors(page, bud.id);
    bud = await unitOf(page, bud.id);
    const leaf = bud.panels.find((p) => p.part === 'FRONT') || null;
    check(`DOORS, Add doors (${added})`, leaf && bud.panels.filter((p) => p.part === 'FRONT').length === 1 && leaf.hingeFamily == null,
      'one leaf, the standard family (no hingeFamily on the record)', `leaves ${j(bud.panels.filter((p) => p.part === 'FRONT').map((p) => `${p.id} hinge ${p.hinge} family ${p.hingeFamily} angle ${p.openAngleDeg}`))}`);
    if (!leaf) throw new Error('no leaf');
    // THE HINGE SIDE MUST BE FREE OF THE WALL FOR THE SWING TO READ: a leaf at a wall stops square (T78 F13 test).
    const atWall = (leaf.hinge === 'L' && bud.x - bud.wallGap < 40) || (leaf.hinge === 'R' && wallLen(room, bud.wall) - (bud.x + bud.w) - bud.wallGap < 40);
    if (atWall) {
      let d = null;
      for (const pid of (await grabIds(page, bud.id)).slice(0, 6)) { d = await dragAlong(page, bud.id, pid, leaf.hinge === 'L' ? 800 : -800); if (d) { d.by = pid; break; } }
      await page.sleep(600);
      bud = await unitOf(page, bud.id);
      note(`the leaf is hinged ${leaf.hinge} against the wall: the BUD dragged 800 along the wall (${d ? `by ${d.by}` : 'NOT IN REACH'})`, `x now ${bud.x}`);
    }
    const sel = await selectUnit(page, bud.id);
    await sectionOpen(page, 'Carcass');
    await sectionOpen(page, 'Doors');
    const there = await page.has(`[data-door-hinge-family="${leaf.id}"]`);
    const res = there ? await choose(page, `document.querySelector('[data-door-hinge-family="${leaf.id}"]')`, 'wide') : { ok: false, why: `control not found: [data-door-hinge-family="${leaf.id}"]` };
    await until(page, `(${S}.unitResult(${j(bud.id)}).panels.find((p) => p.id === ${j(leaf.id)}) || { meta: {} }).meta.hingeFamily === 'wide'`, 5000);
    await page.sleep(900);
    const b1 = await unitOf(page, bud.id);
    const l1 = b1.panels.find((p) => p.id === leaf.id);
    const noRung = b1.warnings.find((w) => w.code === 'HINGE_WIDE_NO_RUNG') || null;
    const drawn = await warningsDrawn(page);
    const lines = await bomOrder(page);
    const hingeLines = lines.filter((l) => l.role === 'hinges');
    const engineHinges = b1.hardware.filter((h) => h.role === 'hinges');
    check(`the BUD selected (${how(sel)}); the Per leaf row's hinge family select set to Wide-angle by the real select (${res.ok ? `"${res.label}"` : res.why}), the house 25 mm front`,
      res.ok && l1 && l1.hingeFamily === 'wide' && noRung && /25 mm front/.test(noRung.message) && drawn.some((d) => /^HINGE_WIDE_NO_RUNG/.test(d)) && engineHinges.length >= 1 && engineHinges.every((h) => h.article == null),
      'meta.hingeFamily wide; the warning HINGE_WIDE_NO_RUNG in the unit\'s warnings (the file as read has no rung above 24; owner to confirm) and drawn in the panel; the hinge line without an article',
      `family ${l1 ? l1.hingeFamily : '?'}, angle ${l1 ? l1.openAngleDeg : '?'}; warnings ${j(b1.warnings.map((w) => `${w.code}: ${w.message.slice(0, 100)}`))}; drawn ${j(drawn)}; engine hinge lines ${j(engineHinges)}; BOM ${j(hingeLines.map((l) => l.text))}`);
    await bomFrame(page, 'f13-walk-01-bom-no-rung.png');
    await bomClose(page);
    await domFrame(page, 'document.querySelector(\'[data-unit-warnings]\')', 'f13-walk-01-warning-no-rung.png');
    // 19 BY THE UNIT'S FRONT (MM) SELECT (Carcass): what the unit itself offers.
    await selectUnit(page, bud.id);
    await sectionOpen(page, 'Carcass');
    const ft = await choose(page, byLabel('Carcass', 'Front (mm)', 'select'), '19');
    await until(page, `(${S}.units.find((u) => u.id === ${j(bud.id)}) || { params: {} }).params.front_t === 19`, 5000);
    await page.sleep(900);
    const b2u = await unitOf(page, bud.id);
    const l2u = b2u.panels.find((p) => p.id === leaf.id);
    const engineHinges2 = b2u.hardware.filter((h) => h.role === 'hinges');
    check(`the unit's Front (mm) select set to 19 by the real select (${ft.ok ? `"${ft.label}"` : ft.why})`, ft.ok && b2u.frontT === 19 && l2u && l2u.t === 19 && l2u.hingeFamily === 'wide' && l2u.openAngleDeg === 170 && !b2u.warnings.some((w) => w.code === 'HINGE_WIDE_NO_RUNG') && engineHinges2.some((h) => h.angle === 170 && h.article),
      'params.front_t 19 and the leaf cut 19 thick; meta.openAngleDeg 170 (the wide family\'s rung to 21); no HINGE_WIDE_NO_RUNG; the hinge line with the 170 article',
      `params.front_t ${b2u.frontT}; the leaf cut ${l2u ? l2u.t : '?'} thick, family ${l2u ? l2u.hingeFamily : '?'}, angle ${l2u ? l2u.openAngleDeg : '?'}; warnings ${j(b2u.warnings.map((w) => `${w.code}: ${w.message.slice(0, 90)}`))}; engine hinge lines ${j(engineHinges2)}${l2u && l2u.t !== 19 ? '; DIAGNOSIS: the leaf is cut from the PROJECT front slot, not the unit param: stores/projectStore.js paramsForEngine passes thickness_slots (projectThicknesses, the profile nominal 25 when nobody measured) and engine/cabinet.js:702-709 resolves front1 = slotT(front1, frontT) over params.front_t, so the select at components/RightPanel.jsx:420 writes a number the engine never reads for the leaf (one law, two answers for one board)' : ''}`);
    await bomFrame(page, 'f13-walk-02-bom-unit-select.png');
    await bomClose(page);
    // 19 BY THE PROJECT'S MEASURED FRONT SLOT (Settings, Settings..., the thickness slots): the number the engine computes from.
    await page.press('nav[aria-label="Main menu"] > div > button', 'Settings');
    await page.sleep(300);
    await page.press('[role="menuitem"]', 'Settings');
    const modalUp = await until(page, `${UI}.modal === 'design'`, 5000);
    await page.sleep(900);
    const tabs = await page.ask('[...document.querySelectorAll(\'[data-wizard-tab]\')].map((b) => ({ id: b.getAttribute(\'data-wizard-tab\'), disabled: b.disabled, state: b.getAttribute(\'data-tab-state\') }))');
    let field = await boxOf(page, 'document.querySelector(\'[data-slot-measured="front1"]\')');
    let tabUsed = 'the tab it opened on';
    for (const t of tabs) {
      if (field) break;
      if (t.disabled) continue;
      await page.press(`[data-wizard-tab="${t.id}"]`);
      await page.sleep(500);
      field = await boxOf(page, 'document.querySelector(\'[data-slot-measured="front1"]\')');
      if (field) tabUsed = `the ${t.id} tab`;
    }
    const was = field ? await page.ask('document.querySelector(\'[data-slot-measured="front1"]\').value') : null;
    const said1 = await saidCount(page);
    if (field) { await clickWith(page, field.x, field.y); await typeNumber(page, 19); }
    let gate = null;
    if (await page.has('[data-thickness-gate-apply="1"]')) { gate = await page.text('[data-thickness-gate-apply="1"]'); await page.press('[data-thickness-gate-apply="1"]'); await page.sleep(900); }
    const slotNow = await page.ask(`((${S}.project.design.thickness || {}).slots || {}).front1 ? JSON.stringify(${S}.project.design.thickness.slots.front1) : null`);
    const shutS = await closeModals(page);
    await page.sleep(900);
    const b2s = await unitOf(page, bud.id);
    const l2s = b2s.panels.find((p) => p.id === leaf.id);
    const engineHinges2s = b2s.hardware.filter((h) => h.role === 'hinges');
    const lines2 = await bomOrder(page);
    check(`Settings, Settings... (modal ${modalUp ? 'design' : 'NOT opened'}), the Front 1 measured field (data-slot-measured=front1, ${field ? `found on ${tabUsed}, was ${was}` : 'NOT FOUND'}) clicked, 19, Enter${gate ? `, the gate's "${gate}" pressed` : ''}, the window shut by ${shutS.by || 'nothing (not open)'}`,
      modalUp && field && b2s.frontT === 19 && l2s && l2s.t === 19 && l2s.hingeFamily === 'wide' && l2s.openAngleDeg === 170 && !b2s.warnings.some((w) => w.code === 'HINGE_WIDE_NO_RUNG') && engineHinges2s.some((h) => h.angle === 170 && h.article),
      'design.thickness.slots.front1.measured 19; the leaf cut 19; meta.openAngleDeg 170; no HINGE_WIDE_NO_RUNG; the hinge line with the 170 article (71T6550, owner to confirm)',
      `tabs ${j(tabs.map((t) => t.id))}; slot front1 ${slotNow}; params.front_t ${b2s.frontT}; the leaf cut ${l2s ? l2s.t : '?'} thick, family ${l2s ? l2s.hingeFamily : '?'}, angle ${l2s ? l2s.openAngleDeg : '?'}; warnings ${j(b2s.warnings.map((w) => w.code))}; engine hinge lines ${j(engineHinges2s)}; BOM ${j(lines2.filter((l) => l.role === 'hinges').map((l) => l.text))}; said ${j(await saidSince(page, said1))}`);
    await bomFrame(page, 'f13-walk-02-bom-170.png');
    await bomClose(page);
    const l2 = l2s;
    const b2 = b2s;
    // THE SWING: A 2KLIK, 1.5 S (read after the window it opens is shut, as f12 reads it).
    const sw0 = await swingOf(page, bud.id, leaf.id);
    const at = await reachPiece(page, bud.id, leaf.id);
    if (at) await page.dblclick(at.x, at.y);
    await page.sleep(1500);
    const swRaw = await swingOf(page, bud.id, leaf.id);
    const shut = await closeModals(page);
    await page.sleep(600);
    const sw1 = await swingOf(page, bud.id, leaf.id);
    check(`a 2klik on the leaf (${at ? `pixel ${at.x},${at.y}${at.awayFromPlus ? ', off the plus sprite' : ''}` : 'NOT IN REACH'}), 1.5 s later${shut.seen.length ? ` (the ${shut.seen.join(', ')} window shut by ${shut.by})` : ''}`, at && sw1 && !sw1.why && Math.abs(sw1.rotY) > Math.PI / 2,
      'the leaf\'s swing group rotation.y past pi/2 (over 90 degrees), toward 170', `shut ${j(sw0)}; 1.5 s after the 2klik (window up) ${j(swRaw)}; after the window shut ${j(sw1)}`);
    await shot(page, 'f13-walk-03-open-170.png');
    await pieceFrame(page, bud.id, [leaf.id, 'TOP'], 'f13-walk-03-open-170-close.png');
    // SHUT, THE SAME WAY; THEN A NEIGHBOUR ON THE HINGE SIDE.
    const at2 = await reachPiece(page, bud.id, leaf.id);
    if (at2) { await page.dblclick(at2.x, at2.y); await page.sleep(1500); await closeModals(page); }
    const side = (l2 && l2.hinge) || leaf.hinge;
    const titleRe = new RegExp(`^Add a unit to the ${side === 'R' ? 'right' : 'left'} of ${b2.num}$`);
    const said0 = await saidCount(page);
    const cp = await clickPlus(page, titleRe);
    let row = { ok: false, unit: null };
    if (cp.ok) row = await pressRow(page, 'base-units', 'door-base');
    const nb = row.unit ? await unitOf(page, row.unit.id) : null;
    await closeLibrary(page);
    const addedN = nb ? await addDoors(page, nb.id) : 'no neighbour';
    const b3 = await unitOf(page, bud.id);
    const flush = nb && (side === 'R' ? near(nb.x, b3.x + b3.w, 1) : near(nb.x + nb.w, b3.x, 1));
    const found = await checksNow(page);
    const f33 = found.filter((f) => f.check === 33);
    const mine = f33.find((f) => f.panelId === leaf.id || (f.message || '').includes(leaf.id)) || null;
    check(`the plus "${titleRe.source.replace(/[\\^$]/g, '')}" clicked (${cp.ok ? `pixel ${cp.plus.px.x},${cp.plus.px.y}` : cp.why}), Standard in the library it opened, Add doors on it (${addedN})`, cp.ok && nb && flush && mine && mine.level === 'yellow' && /at 170 degrees its free edge swings/.test(mine.message),
      `a BUD flush on the leaf's hinge side (${side}); runChecks() carries #33 naming ${leaf.id}: "at 170 degrees its free edge swings N mm past its hinge edge and its neighbour stands M mm away"`,
      `${nb ? `neighbour ${nb.num} at x ${nb.x}..${r1(nb.x + nb.w)} (the wide door at ${b3.x}..${r1(b3.x + b3.w)}, hinge ${side})` : 'no neighbour added'}; #33 findings ${j(f33.map((f) => `${f.panelId}: ${f.message.slice(0, 160)}`))}; all ${j(found.map((f) => `#${f.check}`))}; said ${j(await saidSince(page, said0))}`);
    if (await page.has('[data-check-button]')) {
      await page.press('[data-check-button]');
      await until(page, 'Boolean(document.querySelector(\'[data-check-panel]\'))', 4000);
      const drawnFindings = await page.ask('[...document.querySelectorAll(\'[data-check-finding]\')].map((li) => li.getAttribute(\'data-check-finding\') + \': \' + li.textContent.replace(/\\s+/g, \' \').trim().slice(0, 200))');
      note('the Check panel (its toolbar button, a real click)', j(drawnFindings));
      await shot(page, 'f13-walk-04-check-33.png');
      if (await page.has('[data-check-panel]')) await page.press('[data-check-button]');
    } else {
      await shot(page, 'f13-walk-04-neighbour.png');
    }
  } catch (e) {
    await ended(page, 'f13', e);
  }
  const errs = pageErrors(page);
  note('page 3: console errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// ============================================================================
// PAGE 4: f14 THE ARCH ACROSS A DRAWER STACK, AND ON A SMALL DOOR
// ============================================================================
if (pageWanted(4)) {
  const page = await open();
  try {
    begin('f14', 'ONE ARCH ACROSS A DRAWER STACK (the top front a ready slice, the lower ones blocked and said); A 300 WUD ARCHED');
    await stage(page, 'the arch');
    const D = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units', 'drawer-unit'], entry: 'drawer-3' });
    let d = D.unit ? await unitOf(page, D.unit.id) : null;
    check('Library, Kitchen, Base units, Drawer unit, 3 (the real row)', d && d.type === 'BUDR', 'a BUDR (x3)', d ? `${d.type} ${d.num} on wall ${d.wall + 1} at x ${d.x}, ${d.w} x ${d.h} x ${d.d}, fronts ${j(d.panels.filter((p) => p.part === 'DRAWER-FRONT').map((p) => p.id))}` : `row pressed ${D.ok}, nothing added`);
    if (!d) throw new Error('no BUDR');
    if (!(await sceneCheck(page, 'after the drawer unit is drawn'))) throw new Error(DEAD);
    const sel = await selectUnit(page, d.id);
    await sectionOpen(page, 'Carcass');
    const res = await choose(page, 'document.querySelector(\'[data-unit-front-type]\')', 'A');
    await until(page, `(() => { const r = ${S}.unitResult(${j(d.id)}); const fs = r.panels.filter((p) => p.part === 'DRAWER-FRONT'); return fs.length === 3 && fs.every((p) => p.meta && p.meta.frontDecoration && p.meta.frontDecoration.style === 'A'); })()`, 12000);
    await page.sleep(1200);
    d = await unitOf(page, d.id);
    const fronts = d.panels.filter((p) => p.part === 'DRAWER-FRONT').sort((a, b) => a.box.y - b.box.y);
    const top = fronts[2] || null; const lower = fronts.slice(0, 2);
    const backBore = d.warnings.filter((w) => w.code === 'FRONT_DECORATION_BACK_BORE');
    const drawn = await warningsDrawn(page);
    check(`the BUDR selected (${how(sel)}); Front type set to Arched by the real select (${res.ok ? `"${res.label}"` : res.why})`,
      res.ok && fronts.length === 3 && top && top.deco && top.deco.status === 'ready' && top.deco.slice && top.deco.stack && top.deco.stack.fronts === 3
        && lower.length === 2 && lower.every((f) => f.deco && f.deco.status === 'blocked' && f.deco.slice && f.deco.problems.length > 0 && f.deco.problems.every((c) => c === 'FRONT_DECORATION_BACK_BORE'))
        && lower.every((f) => backBore.some((w) => w.panel === f.id)) && drawn.some((x) => /^FRONT_DECORATION_BACK_BORE/.test(x)),
      'three fronts, every one a SLICE of one arch on the stack (stack.fronts 3): the top front ready (the crown), the two lower blocked with FRONT_DECORATION_BACK_BORE only (the recess reaches the box\'s front fixing on the house 25 board), said in the unit\'s warnings and drawn in the panel',
      `fronts ${j(fronts.map((f) => ({ id: f.id, y: f.box.y, h: f.h, deco: f.deco })))}; warnings ${j(d.warnings.map((w) => `${w.code} ${w.panel || ''}`))}; drawn ${j(drawn)}`);
    await shot(page, 'f14-walk-01-stack.png');
    await pieceFrame(page, d.id, fronts.map((f) => f.id), 'f14-walk-02-stack-close.png');
    await domFrame(page, 'document.querySelector(\'[data-unit-warnings]\')', 'f14-walk-03-warnings.png');
    // A 300 WUD, ARCHED.
    const W = await addFromLibrary(page, { category: 'Kitchen', path: ['wall-units'], entry: 'wall' });
    let w = W.unit ? await unitOf(page, W.unit.id) : null;
    check('Library, Kitchen, Wall units, Standard', w && w.type === 'WUD', 'a WUD', w ? `${w.num} on wall ${w.wall + 1} at x ${w.x}, ${w.w} x ${w.h}, mount ${w.mount}` : 'nothing added');
    if (!w) throw new Error('no WUD');
    const selW = await selectUnit(page, w.id);
    await sectionOpen(page, 'Carcass');
    const wf = await boxOf(page, 'document.querySelector(\'[data-section="Carcass"] [data-unit-size-field="width"]\')');
    const said0 = await saidCount(page);
    if (wf) { await clickWith(page, wf.x, wf.y); await typeNumber(page, 300); }
    await until(page, `(${S}.units.find((u) => u.id === ${j(w.id)}) || { params: {} }).params.width === 300`, 5000);
    w = await unitOf(page, w.id);
    check(`the WUD selected (${how(selW)}); Carcass, the Width field (data-unit-size-field=width) clicked, 300, Enter`, wf && w.w === 300, 'params.width 300', `field ${wf ? 'typed' : 'NOT FOUND'}; width ${w.w}; said ${j(await saidSince(page, said0))}`);
    const addedW = await addDoors(page, w.id);
    await selectUnit(page, w.id);
    await sectionOpen(page, 'Carcass');
    const resW = await choose(page, 'document.querySelector(\'[data-unit-front-type]\')', 'A');
    await until(page, `(() => { const r = ${S}.unitResult(${j(w.id)}); const fs = r.panels.filter((p) => p.part === 'FRONT'); return fs.length >= 1 && fs.every((p) => p.meta && p.meta.frontDecoration && p.meta.frontDecoration.style === 'A'); })()`, 12000);
    await page.sleep(1200);
    w = await unitOf(page, w.id);
    const wl = w.panels.find((p) => p.part === 'FRONT') || null;
    check(`DOORS, Add doors (${addedW}); Front type Arched by the real select (${resW.ok ? `"${resW.label}"` : resW.why})`, resW.ok && wl && wl.deco && wl.deco.status === 'ready' && wl.deco.problems.length === 0,
      'the 300 wide leaf\'s decoration ready (the A recipe applies at any leaf size; the semicircle fits)', `leaf ${wl ? `${wl.id} ${wl.w} x ${wl.h}, deco ${j(wl.deco)}` : 'NONE'}; warnings ${j(w.warnings.map((x) => x.code))}`);
    await shot(page, 'f14-walk-04-wud-300.png');
    if (wl) await pieceFrame(page, w.id, [wl.id], 'f14-walk-04-wud-300-close.png');
  } catch (e) {
    await ended(page, 'f14', e);
  }
  const errs = pageErrors(page);
  note('page 4: console errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// ============================================================================
// PAGE 5: f15 INTERNAL DRAWERS GET FRONTS
// ============================================================================
if (pageWanted(5)) {
  const page = await open();
  try {
    begin('f15', 'INTERNAL DRAWERS GET FRONTS: two inner fronts in the cut list, the BOM and the scene; the box rides its front');
    await stage(page, 'the inner fronts');
    const U = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'drawers-behind-doors' });
    let u = U.unit ? await unitOf(page, U.unit.id) : null;
    check('Library, Kitchen, Base units, Drawers behind doors (the real row)', u && u.type === 'BUD_INT', 'a BUD_INT', u ? `${u.type} ${u.num} on wall ${u.wall + 1} at x ${u.x}, drawers param ${u.drawersParam}, items ${j(u.items)}, inner fronts cut ${j(u.panels.filter((p) => p.role === 'drawer_front').map((p) => p.id))}` : `row pressed ${U.ok}, nothing added`);
    if (!u) throw new Error('no BUD_INT');
    if (!(await sceneCheck(page, 'after the unit is drawn'))) throw new Error(DEAD);
    const added = await addDoors(page, u.id);
    note(`DOORS (${added})`, `leaves ${j((await unitOf(page, u.id)).panels.filter((p) => p.part === 'FRONT').map((p) => p.id))}`);
    const sel = await selectUnit(page, u.id);
    const opened = await sectionOpen(page, 'Add items');
    const rowBtn = await page.ask('(() => { const b = document.querySelector(\'[data-add-kind="drawers"]\'); return b ? { there: true, disabled: b.disabled, text: b.textContent.replace(/\\s+/g, \' \').trim() } : { there: false }; })()');
    if (rowBtn.there && !rowBtn.disabled) await page.press('[data-add-kind="drawers"]');
    const countAt = await boxOf(page, byLabel('Add items', 'Count', 'input'));
    check(`the unit selected (${how(sel)}), Add items open (${opened}), the Drawers (internal) row`, rowBtn.there && !rowBtn.disabled && countAt,
      'the row [data-add-kind=drawers] enabled, its Count field on the screen', `row ${j(rowBtn)}; count field ${countAt ? `at ${countAt.x},${countAt.y}` : 'NOT FOUND'}`);
    if (!countAt) throw new Error('no Count field');
    const said0 = await saidCount(page);
    await clickWith(page, countAt.x, countAt.y);
    await typeNumber(page, 2);
    const add = await boxOf(page, '[...document.querySelectorAll(\'[data-section="Add items"] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add\')');
    if (add) await clickWith(page, add.x, add.y);
    await until(page, `(() => { const x = ${S}.units.find((q) => q.id === ${j(u.id)}); return x && ((x.params.sections && x.params.sections[0] && x.params.sections[0].items) || []).filter((i) => i.kind === 'drawer').length === 2; })()`, 6000);
    await page.sleep(1200);
    u = await unitOf(page, u.id);
    const inner = u.panels.filter((p) => p.role === 'drawer_front');
    const ids = [`${u.num}-IF1`, `${u.num}-IF2`];
    check(`Count 2 (typed, Enter), Add (${add ? 'clicked' : 'button NOT FOUND'})`, u.items.filter((k) => k === 'drawer').length === 2 && inner.length === 2 && ids.every((id) => inner.some((p) => p.id === id)) && inner.every((p) => p.inner && p.part === 'DRAWER-FRONT' && p.material === 'front' && p.t === u.frontT),
      `two drawer items; two inner fronts ${ids.join(' and ')} (role drawer_front, part DRAWER-FRONT, meta.inner, front material, ${u.frontT} thick)`, `items ${j(u.items)}; inner fronts ${j(inner.map((p) => `${p.id} ${p.w} x ${p.h} x ${p.t} (${p.material}) inner ${p.inner} drawer ${p.drawer}`))}; said ${j(await saidSince(page, said0))}`);
    const parts = await bomParts(page);
    const ifRows = parts ? parts.rows.filter((r) => /-IF\d$/.test(r.id)) : [];
    check('BOM, Parts: the inner front rows', ifRows.length === 2 && ids.every((id) => ifRows.some((r) => r.id === id)), `rows ${ids.join(', ')}`, `rows ${j(ifRows.map((r) => r.text))}`);
    await bomFrame(page, 'f15-walk-02-bom.png');
    await bomClose(page);
    const sceneIf = await meshIds(page, u.id, '-IF\\d$');
    check('the scene draws them', sceneIf && sceneIf.length === 2, 'two meshes whose ccPanelId ends with -IF1 / -IF2', j(sceneIf));
    await shot(page, 'f15-walk-01-shut.png');
    // OPEN ALL, THEN A 2KLIK ON IF1: THE BOX RIDES OUT WITH IT.
    const oa = await openAll(page);
    const before = await meshesOf(page, u.id, [ids[0], 'D1-SL', 'D1-SR', ids[1], 'D2-SL']);
    const at = await reachPiece(page, u.id, ids[0]);
    if (at) await page.dblclick(at.x, at.y);
    await page.sleep(1800);
    const shut = await closeModals(page);
    const after = await meshesOf(page, u.id, [ids[0], 'D1-SL', 'D1-SR', ids[1], 'D2-SL']);
    const dz = (id) => (before && after && before[id] && after[id] ? r1(after[id].centre.z - before[id].centre.z) : null);
    const front = dz(ids[0]); const box = dz('D1-SL'); const boxR = dz('D1-SR'); const other = dz(ids[1]);
    check(`Open all (${oa.there ? `read "${oa.text}", ${oa.by}` : 'button NOT THERE'}), a 2klik on ${ids[0]} (${at ? `pixel ${at.x},${at.y}` : 'NOT IN REACH'}), 1.8 s later${shut.seen.length ? ` (the ${shut.seen.join(', ')} window shut by ${shut.by})` : ''}`,
      at && front != null && front > 50 && box != null && near(box, front, 1) && (boxR == null || near(boxR, front, 1)) && (other == null || Math.abs(other) < 0.5),
      'the inner front travels out of the wall (z over 50 mm) and the box side D1-SL travels the same: the box rides its front; drawer 2 stays',
      `dz: ${ids[0]} ${front}, D1-SL ${box}, D1-SR ${boxR}, ${ids[1]} ${other}; before ${j(before && before[ids[0]] ? before[ids[0]].centre : null)}, after ${j(after && after[ids[0]] ? after[ids[0]].centre : null)}`);
    await shot(page, 'f15-walk-03-box-out.png');
    await pieceFrame(page, u.id, [ids[0], ids[1], 'D1-SL'], 'f15-walk-03-box-out-close.png');
  } catch (e) {
    await ended(page, 'f15', e);
  }
  const errs = pageErrors(page);
  note('page 5: console errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// === THE LEDGER (t78-walk.mjs's grammar) ====================================
const fresh = process.argv.includes('--fresh');
const ledger = `${SHOTS}walk-bc${VARIANT}.txt`;
const today = new Date().toISOString().slice(0, 10);
const HEAD = [
  `T78 PART B+C walk, ${today}, HEAD ${built}${VARIANT ? ` (VARIANT${VARIANT}: ${ascii(process.env.T78_WALK_NOTE || 'an experiment, not HEAD')})` : ''}`,
  `(the repo's HEAD when the walk ran: ${head}; the app under the mouse: ${BASE}, built from HEAD ${built}; its build stamp is the first NOTE of each section)`,
  '',
  'CLAUDE.md T78 PART B (F10, F11) and PART C (F12 to F15), walked section by',
  'section against npx vite preview of a build of HEAD (git archive, npm run',
  'build), the hardware served from the silent showroom. Every gesture is a REAL',
  'mouse or key event at a DOM control\'s centre or at a pixel the scene\'s own',
  'raycaster says the thing is under (and the page says the canvas owns); the',
  'store is only READ. Line grammar:',
  '  PASS|FAIL  <section> | <gesture> | expect: <what was expected> | observed: <what was read>',
  '  NOTE       <section> | <reading> | <value>',
  '  FRAME      <section> | <file>  (the frame is beside this file)',
  'A FAIL is written down, never patched.',
  '',
].join('\n');
const blocks = new Map();
if (!fresh && existsSync(ledger)) {
  let name = null;
  for (const line of readFileSync(ledger, 'utf8').split('\n')) {
    const m = line.match(/^=== (f\d\d) /);
    if (m) { name = m[1]; blocks.set(name, [line]); continue; }
    if (/^(PART B\+C:|SECTION |FRAMES )/.test(line)) { name = null; continue; }
    if (name && line.trim()) blocks.get(name).push(line);
  }
}
for (const name of new Set(steps.map((s) => s.section))) {
  const mine = steps.filter((s) => s.section === name);
  const top = mine.find((s) => s.header);
  blocks.set(name, [
    `=== ${name} ${top ? top.header : ''}`,
    `NOTE       ${name} | walked at | ${top ? top.at : ''} UTC, HEAD ${built} (repo ${head})`,
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
const framesOf = (n) => blocks.get(n).filter((x) => x.startsWith('FRAME')).map((x) => x.split(' | ').pop().trim());
const lost = names.flatMap(framesOf).filter((f) => !existsSync(`${SHOTS}${f}`));
if (lost.length) process.stdout.write(`FRAMES MISSING ON DISK: ${lost.join(', ')}\n`);
writeFileSync(ledger, ascii([
  HEAD,
  ...names.flatMap((n) => [...blocks.get(n), '']),
  ...counts.map((c) => `SECTION ${c.n}: ${c.pass} pass, ${c.fail} fail`),
  ...names.map((n) => { const mine = framesOf(n); return `FRAMES ${n} (${mine.length}): ${mine.join(', ')}${lost.some((f) => mine.includes(f)) ? ' (MISSING ON DISK: ' + mine.filter((f) => lost.includes(f)).join(', ') + ')' : ''}`; }),
  `PART B+C: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail`,
  '',
].join('\n')));
const failed = steps.filter((s) => !s.header && !s.note && !s.frame && !s.ok);
process.stdout.write(`\nPART B+C: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail\nfailed this run: ${failed.length}; frames ${frames.join(', ')}\n`);
await showroomDown();
process.exit(failed.length ? 1 : 0);
