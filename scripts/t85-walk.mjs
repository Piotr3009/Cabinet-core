/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T85 F5, THE WALK (CLAUDE.md T85 PART D)
//
// CLAUDE.md T85 PART D: "`scripts/t85-walk.mjs` on the built app (vite
// preview 4173), real mouse through `scripts/t74-harness.mjs` (pro, roomView,
// FIND; the raycast fallback for objects without `raycast`, as
// `verify/t84/walk.txt` notes): the owner's room with the 800 x 300 recess,
// the 1200 x 300 wardrobe, drawers through the Section's RECESS answer; then
// DRAG the cabinet along the wall by its carcass through the five cases (A both
// in, B left edge out, C right edge out, the 15 mm case, D out of the band), a
// frame at each with the store's numbers in `walk.txt` (dividers' x, box span
// and depth, panels present, the notice's text); the CNC sheet of case A with
// the RETURN's pockets and the board's holes framed; the 558 cabinet out of the
// band; a door double-clicked open at 90; the hinge in the view silver. Every
// line PASS or FAIL with the number expected and the number read; never
// patched in the walk."
//
// The owner, 30.10.2026: *"jak mamy szuflady w recess to juz sie tak nie
// przesuwa, tylko przy przesunieciu calej szafy szuflady znikaja a zostaja
// dividery ktore sie robia do samej gory, nie powinno tak byc"*; *"znikaja z
// szufladami, bo to sa dividery do szuflad"*; *"default zawiasy prosze zrob 90
// stopni ... i silver prosze"*.
//
// THE GESTURES ARE REAL: the cabinet selected by a click on its own pixel, the
// Add items section and its Drawers row, the Count typed, the Columns
// question's third answer (Recess), Bare boxes and Add pressed, the cabinet
// DRAGGED along its wall by its carcass (scripts/t75-harness.mjs dragAlong: the
// pixel the scene's raycaster says is the carcass, let go where the wanted
// millimetres project), the rail's CNC and Design buttons, Ctrl+Z, a double
// click on a door's pixel: the browser's own input pipe (CDP). THE STAGES that
// are not what the walk is about (the room, the recess, the wardrobe's size,
// the 558 wardrobe's doors) are put through the store's own actions, as the
// earlier walks put theirs. The store and the engine are READ to say what
// happened (window.__cc). A FAIL is written down, never patched.
//
// THE NUMBERS. A hand lands on whole pixels, so the cabinet stands where the
// drag let it go (a few millimetres off the aim at this camera). The walls,
// the dividers' x and the box span expected at each case are therefore read
// off the engine for the x the cabinet reached: the band the engine cuts
// (`derived.extension`), the walls of KIT_RECESS.lsp D29 (`recessColWalls`,
// imported from src/engine/extension.js, the owner's 30), the box wall to wall
// (`recessColBoxSpan`, less the runner's 5 each side); the depth 440 and the
// notice's sentence are the owner's (CLAUDE.md PART B). Where the drag lands
// on the mockup's own x the mockup's numbers are the same numbers.
//
//   npx vite build; npx vite preview --port 4173 --strictPort &   then: node scripts/t85-walk.mjs
//   node scripts/t85-walk.mjs --build --serve     build dist/, serve it on 4173, walk, stop it
//   node scripts/t85-walk.mjs --legs 2            some legs only
//
// Chromium: /opt/pw-browsers (CHROME_PATH is set from it when unset); nothing
// is downloaded. Ledger: verify/t85/walk.txt. Frames: verify/t85/f05-*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import {
  mkdirSync, mkdtempSync, writeFileSync, existsSync, readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

// === THE ARGUMENTS ==========================================================
const REPO = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const LEGS = String(opt('legs', process.env.T85_LEGS || '1,2')).split(',').map((s) => s.trim()).filter((s) => /^[12]$/.test(s)).map(Number);
const PORT = Number(process.env.E2E_PORT || 4173);
const BASE = process.env.E2E_URL || `http://127.0.0.1:${PORT}/`;
const SCRATCH = mkdtempSync(join(tmpdir(), 't85-walk-'));
const OUT = opt('out', new URL('../verify/t85/', import.meta.url).pathname).replace(/\/?$/, '/');
mkdirSync(OUT, { recursive: true });
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
  key, clickWith, boxOf, until, reachFree, dragAlong,
} = await import('./t75-harness.mjs');
const { launch } = await import('./cdp.mjs');
const X = await import('../src/engine/extension.js');
const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');

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
const HIST = 'window.__cc.history.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));
const near = (a, b, tol = 0.6) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) <= tol;
const same = (a, b) => j(a) === j(b);
const W = 1200;
const G = 18;
const RUNNER = 5;
const DEPTH = 440;
const MIN_SIDE = P.recess?.minColumnSideMm ?? 30;
const NOTICE_TWO = 'W01: the recess left the cabinet; its 3 drawers and the two dividers that held them are gone. Add drawers again where the cabinet stands.';

// === THE FRAMES =============================================================
async function shot(page, name, clip = null) {
  await page.sleep(500);
  await page.screenshot(`${OUT}${name}`, clip);
  frames.push(name);
  push('FRAME', 'F5', name);
}
/**
 * One part of the CNC sheet framed from the sheet's own SVG (scripts/t82-walk.mjs cncPartFrame): the root <svg>
 * cloned with its viewBox set to the part's box, painted on the sheet's dark ground at 1400 px wide in a second
 * browser, so the layer legend floating over the window is not in the picture.
 */
let painter = null;
async function cncPartFrame(page, partId, name) {
  const got = await page.ask(`(() => { const g = document.querySelector('[data-cnc-part=${j(partId)}]'); if (!g) return null;
    let root = g.ownerSVGElement; while (root && root.ownerSVGElement) root = root.ownerSVGElement; if (!root) return null;
    const b = g.getBBox(); const m = root.getScreenCTM().inverse().multiply(g.getScreenCTM());
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => { const q = root.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(m); });
    const xs = pts.map((q) => q.x); const ys = pts.map((q) => q.y); const w = Math.max(...xs) - Math.min(...xs); const h = Math.max(...ys) - Math.min(...ys); const pad = 0.06 * Math.max(w, h);
    const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, w + 2 * pad, h + 2 * pad]; const W = 1400; const H = Math.min(2400, Math.max(200, Math.round(W * vb[3] / vb[2])));
    const c = root.cloneNode(true); c.setAttribute('viewBox', vb.join(' ')); c.setAttribute('width', String(W)); c.setAttribute('height', String(H)); c.removeAttribute('style'); c.removeAttribute('class');
    c.setAttribute('preserveAspectRatio', 'xMidYMid meet');
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
  push('FRAME', 'F5', `${name} (the CNC sheet's own SVG round the part ${partId}, ${got.W} x ${got.H})`);
  return true;
}

// === THE HANDS (all real events) ============================================
/**
 * The room's meshes that take no pointer (Room.jsx: a recess's or a chimney's faces, `raycast={null}`) make
 * three's `intersectObjects` throw inside the shared pixel finder (verify/t84/walk.txt, scripts/t82-walk.mjs
 * safeRays). The walk's finder, never the app, is given a no-op for them before every reach: r3f casts only at
 * objects with handlers, so what the pointer meets in the app is unchanged.
 */
const safeRays = (page) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return 0; let n = 0;
  v.scene.traverse((o) => { if (typeof o.raycast !== 'function') { o.raycast = () => {}; n += 1; } }); return n; })()`);
/** Select-all in the focused field: Ctrl+A with the editor's own selectAll command. (scripts/t76-walk.mjs) */
async function selectAll(page) {
  const k = {
    key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k, commands: ['selectAll'] });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(120);
}
/** Ctrl+Z through the browser's input pipe, the page's own shortcut (ConfiguratorPage.jsx: undo). */
async function ctrlZ(page) {
  await page.ask('(() => { const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) a.blur(); return true; })()');
  const k = {
    key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, nativeVirtualKeyCode: 90, modifiers: 2,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(1500);
}
/** A button pressed by a real click at its centre; false when none is on the screen. */
async function pressIf(page, expr) {
  const at = await boxOf(page, expr);
  if (!at) return false;
  await clickWith(page, at.x, at.y);
  await page.sleep(700);
  return true;
}
/** A unit selected by a real click on one of its carcass pieces, its right panel standing. */
async function selectUnit(page, unitId) {
  const ok = `${UI}.selectedUnitId === ${j(unitId)} && Boolean(document.querySelector('[data-section]'))`;
  if (await page.ask(ok)) return true;
  for (const pid of ['BUL', 'BUR', 'TOP', 'BOTTOM']) {
    await safeRays(page);
    const at = await reachFree(page, unitId, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    if (await until(page, ok, 4000)) return true;
  }
  return false;
}
/** The DRAWERS through the right panel: Add items, Drawers, Count 3, Columns Recess, Bare boxes, Add (real clicks). */
async function drawersByRecess(page, unitId) {
  const done = { selected: await selectUnit(page, unitId) };
  if (await page.has('[data-section="Add items"][data-open="0"]')) await page.press('[data-section="Add items"] > button');
  done.addItems = await page.has('[data-section="Add items"][data-open="1"]');
  if (!(await page.has('[data-drawer-columns]'))) await pressIf(page, '[...document.querySelectorAll(\'[data-add-kind="drawers"]\')].find((b) => b.offsetParent)');
  done.offered = await page.ask('[...document.querySelectorAll(\'[data-drawer-columns]\')].filter((b) => b.offsetParent).map((b) => b.getAttribute(\'data-drawer-columns\'))');
  const cnt = await boxOf(page, '(() => { const l = [...document.querySelectorAll(\'[data-add-items] .cc-label\')].find((e) => e.offsetParent && e.textContent.trim() === \'Count\'); return l ? l.parentElement.querySelector(\'input\') : null; })()');
  if (cnt) {
    await clickWith(page, cnt.x, cnt.y);
    await selectAll(page);
    await page.typeText('3');
    await key(page, 'Enter');
  }
  done.count = await page.ask('(() => { const l = [...document.querySelectorAll(\'[data-add-items] .cc-label\')].find((e) => e.offsetParent && e.textContent.trim() === \'Count\'); return l ? l.parentElement.querySelector(\'input\').value : null; })()');
  done.recess = await pressIf(page, 'document.querySelector(\'[data-drawer-columns="recess"]\')');
  done.recessPressed = await page.ask('(document.querySelector(\'[data-drawer-columns="recess"]\') || { getAttribute: () => null }).getAttribute(\'aria-pressed\')');
  done.bare = await pressIf(page, 'document.querySelector(\'[data-drawer-mount="internal"]\')');
  done.add = await pressIf(page, '[...document.querySelectorAll(\'[data-add-items] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add\')');
  await page.sleep(1200);
  return done;
}
/**
 * The cabinet DRAGGED along its wall to x `target` by its carcass (a real press, moves, release), a second drag
 * for what the first left when the hand is more than `tol` off. Returns where it stood, the drags made.
 */
async function dragTo(page, unitId, target, { tol = 4, tries = 2 } = {}) {
  const made = [];
  for (let k = 0; k < tries; k += 1) {
    const x0 = await page.ask(`${S}.units.find((u) => u.id === ${j(unitId)}).position.x_mm`);
    if (k > 0 && Math.abs(x0 - target) <= tol) break;
    let d = null;
    for (const pid of ['BUL', 'BUR', 'TOP', 'BOTTOM']) {
      await safeRays(page);
      d = await dragAlong(page, unitId, pid, target - x0);
      if (d) { made.push({ grab: pid, from: d.from, to: d.to, wasX: x0 }); break; }
    }
    if (!d) break;
    await page.sleep(1200);
  }
  const x = await page.ask(`${S}.units.find((u) => u.id === ${j(unitId)}).position.x_mm`);
  return { x, made };
}
/** What the page said: every notice the ui store took (messages expire, so they are collected). (scripts/t82-walk.mjs) */
async function hearSaid(page) {
  await page.ask(`(() => { if (window.__t85Said) return true; window.__t85Said = [];
    window.__cc.ui.subscribe((s, p) => { if (s.messages === p.messages) return; for (const m of s.messages || []) if (!(p.messages || []).includes(m)) window.__t85Said.push({ message: m.message, level: m.level, tone: m.tone }); });
    return true; })()`);
}
const markSaid = (page) => page.ask('(window.__t85Said || []).length');
const saidSince = (page, mark) => page.ask(`(window.__t85Said || []).slice(${Number(mark) || 0})`);

// === WHAT THE WALK READS ====================================================
/** The store's items and the engine's column of one unit, as the page holds them. */
const stateOf = (page, unitId) => page.ask(`(() => { const st = ${S}; const u = st.units.find((x) => x.id === ${j(unitId)}); if (!u) return null;
  const r = st.unitResult(u.id); const items = (u.params.sections[0] || { items: [] }).items || [];
  const P = (id) => { const p = r.panels.find((q) => q.id === id); return p ? { w: p.w, h: p.h, box: p.box } : null; };
  const ext = r.derived && r.derived.extension;
  const sl = r.panels.filter((p) => /^Z\\d+D\\d+-SL$/.test(p.id)); const sr = r.panels.filter((p) => /^Z\\d+D\\d+-SR$/.test(p.id));
  return {
    x: u.position.x_mm, wall: u.position.wall, w: u.params.width, h: u.params.height, d: u.params.depth,
    parts: items.filter((i) => i.kind === 'partition').map((i) => ({ id: i.id, x: i.x_mm, front: i.front_mm ?? null, marked: Boolean(i.meta && i.meta.recessColumn) })).sort((a, b) => a.x - b.x),
    drawers: items.filter((i) => i.kind === 'drawer').map((i) => ({ id: i.id, zone: i.zone ?? null, marked: Boolean(i.meta && i.meta.recessColumn) })),
    band: ext ? { x0: ext.x0, x1: ext.x1, z0: ext.z0, z1: ext.z1, d: ext.d } : null,
    column: ext && ext.column ? ext.column : null,
    panels: r.panels.map((p) => p.id),
    vparts: r.panels.filter((p) => /^VPART/.test(p.id)).map((p) => ({ id: p.id, x: p.box && p.box.x, y: p.box && p.box.y, h: p.box && p.box.h, w: p.w, ph: p.h })),
    returns: r.panels.filter((p) => /^RETURN-/.test(p.id)).map((p) => ({ id: p.id, w: p.w, h: p.h, readiness: p.meta && p.meta.readiness, fixing: p.meta && p.meta.fixing })),
    boxes: sl.map((p) => { const q = sr.find((s) => s.id === p.id.replace(/-SL$/, '-SR')); return { id: p.id, depth: p.w, x0: p.box && p.box.x, x1: q && q.box ? q.box.x + q.box.w : null }; }),
    top: P('TOP'), bottom: P('BOTTOM'),
    warnings: r.warnings.map((w) => ({ code: w.code, message: String(w.message || '').slice(0, 220) })),
  }; })()`);
const histDepth = (page) => page.ask(`${HIST}.past.length`);

/** What D29 asks of the store and the engine at the x the cabinet reached (read off the engine's own band). */
function expectedAt(st) {
  if (!st.band || !(st.band.x1 > 0 && st.band.x0 < W)) return { walls: null };
  const walls = X.recessColWalls(W, G, st.band.x0, st.band.x1, MIN_SIDE);
  const dividers = [];
  if (walls[0][0] === 'DIVIDER') dividers.push(walls[0][1] - G);
  if (walls[1][0] === 'DIVIDER') dividers.push(walls[1][1]);
  const span = X.recessColBoxSpan(walls);
  return { walls, dividers, box: [span[0] + RUNNER, span[1] - RUNNER] };
}

/** One case of the mockup: the drag, the frame, the numbers. */
async function walkCase(page, id, { tag, title, target, kinds, file, mockup = null }) {
  const mark = await markSaid(page);
  const depth0 = await histDepth(page);
  const moved = await dragTo(page, id, target);
  await page.sleep(800);
  const st = await stateOf(page, id);
  const said = await saidSince(page, mark);
  check('F5', `CASE ${tag} (${title}): the cabinet DRAGGED along its wall by its carcass (a real press, ${moved.made.length} drag(s), the grab ${moved.made.map((m) => m.grab).join(', ')})`,
    near(st.x, target, 6), `x ${target} (+- 6, the hand lands on whole pixels)`, j({ x: st.x, drags: moved.made }));
  note('F5', `CASE ${tag}: the history`, j({ undoStepsAdded: (await histDepth(page)) - depth0 }));
  const exp = expectedAt(st);
  if (kinds) {
    // The engine writes `column.walls` where D29 b stands (a SIDE or a RETURN wall); D22's own pair (two DIVIDER
    // walls) is read off `column.dividers`, the two VPARTs, as test/turn85-f02-engine.test.js reads it.
    const pairRead = st.column && !st.column.walls && same(kinds, ['DIVIDER', 'DIVIDER']) && same(st.column.dividers, ['VPART-1', 'VPART-2']);
    check('F5', `CASE ${tag}: the column's walls (D29), the engine's derived.extension.column (walls, or D22's pair of dividers)`,
      st.column && same(exp.walls.map((w) => w[0]), kinds) && (pairRead || same(st.column.walls, exp.walls)),
      `${j(exp.walls)} (kinds ${j(kinds)}; recessColWalls(1200, 18, ${st.band && st.band.x0}, ${st.band && st.band.x1}, ${MIN_SIDE}))`,
      j(st.column && (st.column.walls || { dividers: st.column.dividers })));
    const marked = st.parts.filter((p) => p.marked);
    check('F5', `CASE ${tag}: the store's dividers (meta.recessColumn) on the recess's edges, at the face`,
      same(marked.map((p) => p.x), exp.dividers) && marked.every((p) => !p.front),
      `x ${j(exp.dividers)}, front_mm 0`, j(marked.map((p) => [p.x, p.front])));
    check('F5', `CASE ${tag}: the engine's VPART dividers, one per DIVIDER wall`,
      st.vparts.length === exp.dividers.length && same(st.vparts.map((v) => v.x).sort((a, b) => a - b), exp.dividers),
      `${exp.dividers.length} at x ${j(exp.dividers)}`, j(st.vparts.map((v) => ({ id: v.id, x: v.x, h: v.h }))));
    check('F5', `CASE ${tag}: three drawer boxes, wall to wall (the box span less the runner's 5) and ${DEPTH} deep`,
      st.drawers.length === 3 && st.boxes.length === 3 && st.boxes.every((b) => near(b.x0, exp.box[0]) && near(b.x1, exp.box[1]) && b.depth === DEPTH),
      `3 drawers, box ${j(exp.box)}, depth ${DEPTH}`, j({ drawers: st.drawers.length, boxes: st.boxes }));
    if (mockup && near(st.x, target, 0.5)) {
      check('F5', `CASE ${tag}: at the mockup's own x ${target}, the mockup's numbers (test/turn85-f03-follow.test.js)`,
        same(st.parts.filter((p) => p.marked).map((p) => p.x), mockup), `dividers ${j(mockup)}`, j(st.parts.map((p) => p.x)));
    }
  }
  note('F5', `CASE ${tag}: the panels present`, st.panels.filter((p) => /^(VPART|RETURN|PARTITION|BOTTOM|TOP|BUL|BUR|Z\d+-FILLER|Z\d+D1-SL)/.test(p)).join(' '));
  note('F5', `CASE ${tag}: the engine's warnings`, st.warnings.length ? st.warnings.map((w) => `${w.code}: ${w.message}`).join(' | ') : 'none');
  note('F5', `CASE ${tag}: the notices said`, said.length ? said.map((s) => `${s.level || s.tone}: ${s.message}`).join(' | ') : 'none');
  await settleCamera(page);
  await shot(page, file);
  return { st, exp, said };
}

// === LEG 1 . THE OWNER'S WARDROBE THROUGH THE FIVE CASES ====================
async function stage(page, depth) {
  return page.ask(`(() => { const st = () => window.__cc.project.getState();
    st().newProject('T85 walk');
    st().setRoom({ corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }], height: 2500 });
    const recess = st().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 800, depth: 300 });
    const a = st().addUnit('WARDROBE', { wall: 0, x: 200 });
    st().updateUnitParams(a.id, { width: 1200, height: 2150, depth: ${depth} });
    st().moveUnit(a.id, 800, 1);
    const u = st().units.find((x) => x.id === a.id);
    return { id: a.id, recess, x: u.position.x_mm, w: u.params.width, h: u.params.height, d: u.params.depth, num: u.params.unit_num }; })()`);
}

async function leg1(page) {
  const s = await stage(page, 300);
  note('F5', 'THE STAGE (the store\'s own actions, as the earlier walks stage theirs): a 4000 x 3000 room 2500 high, the 800 x 300 recess at 1000 on wall 0, the wardrobe 1200 x 2150 x 300 at 800 (the recess 200 in from its left side)', j(s));
  await page.sleep(2500);
  await settleCamera(page);
  const id = s.id;
  const done = await drawersByRecess(page, id);
  const st0 = await stateOf(page, id);
  check('F5', 'the cabinet selected by a real click on its carcass, Add items opened, Drawers, the Columns question with its third answer Recess (data-drawer-columns="recess"), Count 3, Bare boxes, Add',
    done.selected && done.addItems && same(done.offered, ['1', '2', 'recess']) && done.recess && done.recessPressed === 'true' && done.add,
    'selected, the answers ["1","2","recess"], Recess pressed, Add pressed', j(done));
  check('F5', 'addRecessDrawers (D28): two dividers on the recess\'s edges (210, 972) and three drawers in Column 2, every one marked meta.recessColumn',
    same(st0.parts.map((p) => [p.x, p.marked]), [[210, true], [972, true]]) && st0.drawers.length === 3 && st0.drawers.every((d) => d.marked && d.zone === 1),
    '[[210,true],[972,true]], 3 drawers zone 1 marked', j({ parts: st0.parts.map((p) => [p.x, p.marked]), drawers: st0.drawers }));
  check('F5', 'as born: the drawers 440 deep between the dividers (box 233..967)', st0.boxes.length === 3 && st0.boxes.every((b) => b.depth === DEPTH && b.x0 === 233 && b.x1 === 967),
    'depth 440, box [233, 967]', j(st0.boxes));
  await shot(page, 'f05-0-drawers-added.png');

  // CASE A: +80, both edges in.
  const a = await walkCase(page, id, {
    tag: 'A', title: 'both edges in, +80', target: 880, kinds: ['DIVIDER', 'DIVIDER'], file: 'f05-a-both-in.png', mockup: [130, 892],
  });
  check('F5', 'CASE A: the RETURNs on Cabineo (D30): RETURN-L and RETURN-R cut parts, readiness cut, fixing Cabineo',
    a.st.returns.length === 2 && a.st.returns.every((r) => r.readiness === 'cut' && /cabineo/.test(String(r.fixing))),
    'RETURN-L, RETURN-R: readiness cut, fixing cabineo12', j(a.st.returns));
  check('F5', 'CASE A: no warning on the column (the dividers stand on the edges)', !a.st.warnings.some((w) => /RECESS|DRAWERS/.test(w.code)), 'no RECESS_* / DRAWERS_*', j(a.st.warnings.map((w) => w.code)));

  // THE CNC SHEET OF CASE A: the rail's CNC (a real click), RETURN-L's pockets, the board's holes.
  const eng = await page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const d = r.drills || [];
    const of = (panel, kind) => d.filter((x) => x.panel === panel && (!kind || x.kind === kind)).map((x) => [x.x, x.y]);
    const joints = ((r.derived.extension || {}).returnCabineo || {}).joints || [];
    return { pocketsL: of('RETURN-L', 'cabineo_pocket'), pocketsR: of('RETURN-R', 'cabineo_pocket'), drillsL: of('RETURN-L').length,
      holes: of('PARTITION', 'cabineo_hole'), drillsBoard: of('PARTITION').length, joints: joints.map((x) => x.name),
      hw: (r.hardware || []).filter((h) => /cabineo/.test(h.role || '')).map((h) => [h.role, h.qty, h.label]) }; })()`);
  const band = a.st.band || { x0: 0, x1: 0 };
  const wantHoleX = [band.x0 - 12.5, band.x1 - 23.5];
  check('F5', 'CASE A: the engine\'s RETURN-L pockets (D30): six Cabineo pocket drills at x 50 and 240 from its end (cabineoPositions(290))',
    eng.pocketsL.length === 6 && same([...new Set(eng.pocketsL.map((p) => p[0]))], [50, 240]) && eng.pocketsR.length === 6,
    'RETURN-L 6 at x [50, 240], RETURN-R 6', j({ L: eng.pocketsL, R: eng.pocketsR.length }));
  check('F5', 'CASE A: the board over the drawers (PARTITION) carries the 5 mm holes: four, y 50 and 240, x on the RETURNs (the band\'s edges less 12.5 and 23.5, as the F2 fixture\'s 197.5 / 966.5 on 210 / 990)',
    eng.holes.length === 4 && same([...new Set(eng.holes.map((h) => h[0]))].sort((p, q) => p - q), wantHoleX) && same([...new Set(eng.holes.map((h) => h[1]))].sort((p, q) => p - q), [50, 240]),
    `4 holes, x ${j(wantHoleX)}, y [50, 240]`, j(eng.holes));
  note('F5', 'CASE A: the RETURN joints and the BOM\'s Cabineo lines', j({ joints: eng.joints, hardware: eng.hw }));
  const toCnc = await pressIf(page, 'document.querySelector(\'[data-studio="rail-cnc"]\')');
  await until(page, `${UI}.viewMode === 'cnc' && document.querySelectorAll('[data-cnc-part]').length > 0`, 10000);
  await page.sleep(1500);
  // The sheet hides a hole under profile.annotation's minSymbolPx at the whole sheet's zoom (CncView.jsx showSymbol);
  // the joiner zooms in to read a 5 mm hole: the toolbar's own + (real clicks) until the board's holes are drawn.
  let zooms = 0;
  while (zooms < 10 && (await page.ask('(() => { const g = document.querySelector(\'[data-cnc-part="PARTITION"]\'); return g ? g.querySelectorAll(\'[data-cnc-feature^="hole-"]\').length : -1; })()')) < eng.drillsBoard) {
    if (!(await pressIf(page, '[...document.querySelectorAll(\'button[title="Zoom in"]\')].find((b) => b.offsetParent)'))) break;
    zooms += 1;
  }
  note('F5', 'the CNC sheet zoomed in by its own + (real clicks) to read the 5 mm holes', `${zooms} clicks`);
  const sheet = await page.ask(`(() => { const ids = [...document.querySelectorAll('[data-cnc-part]')].map((g) => g.getAttribute('data-cnc-part'));
    const feats = (pid) => { const g = document.querySelector('[data-cnc-part=' + JSON.stringify(pid) + ']'); return g ? g.querySelectorAll('[data-cnc-feature^="hole-"]').length : null; };
    return { mode: ${UI}.viewMode, parts: ids.length, hasReturnL: ids.includes('RETURN-L'), hasReturnR: ids.includes('RETURN-R'), hasBoard: ids.includes('PARTITION'),
      holesOnReturnL: feats('RETURN-L'), holesOnBoard: feats('PARTITION') }; })()`);
  check('F5', 'the CNC sheet (the rail\'s CNC, a real click): RETURN-L and RETURN-R ON the sheet as cut parts, every drill of RETURN-L drawn on it',
    toCnc && sheet.mode === 'cnc' && sheet.hasReturnL && sheet.hasReturnR && sheet.holesOnReturnL === eng.drillsL,
    `RETURN-L, RETURN-R on the sheet, RETURN-L ${eng.drillsL} drills drawn`, j(sheet));
  // INT, 30.10.2026: the sheet never draws a Cabineo dia 5 counterpart hole (T78 F20, engine/machining.js
  // CABINEO_HOLE_5MM draw: false, "the sheet prints no depth for it ... drawn as a circle on the face by
  // 3d/PartMachining.jsx"): the board's four are the engine's drills and the record's, and the sheet shows none, as
  // it shows none on any side of a Cabineo carcass. The first run expected them drawn and read 0 (verify/t85/walk.txt).
  check('F5', 'the CNC sheet: the board over the drawers (PARTITION) on the sheet; its four Cabineo dia 5 holes in the engine\'s drills, none drawn on the sheet (T78 F20: CABINEO_HOLE_5MM is never drawn there)',
    sheet.hasBoard && eng.holes.length === 4 && sheet.holesOnBoard === eng.drillsBoard - eng.holes.length,
    `PARTITION on the sheet, 4 Cabineo holes in the engine, ${eng.drillsBoard - 4} drawn`, j({ onSheet: sheet.holesOnBoard, engine: eng.drillsBoard, cabineoHoles: eng.holes.length }));
  await shot(page, 'f05-a-cnc-sheet.png');
  if (sheet.hasReturnL) await cncPartFrame(page, 'RETURN-L', 'f05-a-cnc-return-l.png');
  if (sheet.hasBoard) await cncPartFrame(page, 'PARTITION', 'f05-a-cnc-board.png');
  await pressIf(page, 'document.querySelector(\'[data-studio="rail-design"]\')');
  await until(page, `${UI}.viewMode === '3d' && Boolean(window.__cc.views && window.__cc.views.room)`, 10000);
  await page.sleep(2000);
  await settleCamera(page);

  // CASE B: the cabinet to the right, the recess's left edge outside its left side.
  const b = await walkCase(page, id, {
    tag: 'B', title: 'the left edge out, the cabinet to 1400', target: 1400, kinds: ['SIDE', 'DIVIDER'], file: 'f05-b-left-out.png', mockup: [372],
  });
  check('F5', 'CASE B: one divider left, the other gone with nothing said (D29 b, the side is the wall), the drawers in Column 1',
    b.st.parts.filter((p) => p.marked).length === 1 && b.st.drawers.every((d) => d.zone === 0) && !b.said.length,
    '1 marked divider, drawers zone 0, no notice', j({ parts: b.st.parts, zones: b.st.drawers.map((d) => d.zone), said: b.said }));

  // CASE C: the cabinet to the left, the recess's right edge outside its right side (the mirror of B).
  const c = await walkCase(page, id, {
    tag: 'C', title: 'the right edge out, the cabinet to 400', target: 400, kinds: ['DIVIDER', 'SIDE'], file: 'f05-c-right-out.png', mockup: [610],
  });
  check('F5', 'CASE C: back over the carcass the column is whole again on its way (a marked divider put back where its edge is), then the right one leaves: one divider, the drawers in Column 2',
    c.st.parts.filter((p) => p.marked).length === 1 && c.st.drawers.every((d) => d.zone === 1),
    '1 marked divider, drawers zone 1', j({ parts: c.st.parts, zones: c.st.drawers.map((d) => d.zone) }));

  // THE 15 MM CASE: the band 15 + 10 in from the left side, the bay beside the side under the owner's 30.
  const r = await walkCase(page, id, {
    tag: '15', title: 'the left edge 15 inside, the cabinet to 985', target: 985, kinds: ['RETURN', 'DIVIDER'], file: 'f05-r15-return.png', mockup: [787],
  });
  const full = r.st.band ? X.recessColReturnFull(r.st.h, G, r.st.band.z1, r.st.band.d) : null;
  const retL = r.st.returns.find((q) => q.id === 'RETURN-L');
  check('F5', 'CASE 15: the RETURN-L of D29 b full height is the column\'s wall (recessColReturnFull), the dead pocket a NOTE (RECESS_DEAD_POCKET, never red)',
    Boolean(retL) && full && retL.h === full[1] && r.st.warnings.some((w) => w.code === 'RECESS_DEAD_POCKET') && !r.st.warnings.some((w) => /DRAWERS_SHALLOW|DRAWERS_TOO/.test(w.code)),
    `RETURN-L ${full ? full.join(' x ') : '?'}, the warning RECESS_DEAD_POCKET`, j({ RETURN_L: retL, warnings: r.st.warnings.map((w) => w.code) }));

  // BACK TO A, so the cabinet leaves the band from the owner's own case with both dividers.
  const a2 = await walkCase(page, id, {
    tag: 'A again', title: 'both edges in again, the cabinet back to 880', target: 880, kinds: ['DIVIDER', 'DIVIDER'], file: 'f05-a2-both-in-again.png', mockup: [130, 892],
  });
  const beforeD = JSON.stringify(await page.ask(`${S}.units`));
  const depthBeforeD = await histDepth(page);

  // CASE D: out of the band. 300 deep: the drawers and their two dividers go, the notice in the owner's words.
  const d = await walkCase(page, id, {
    tag: 'D', title: 'out of the band, the cabinet to 2200', target: 2200, kinds: null, file: 'f05-d-out.png',
  });
  check('F5', 'CASE D: the band no longer over the carcass (the engine cuts no recess column)', !d.st.column && !(d.st.band && d.st.band.x1 > 0 && d.st.band.x0 < W),
    'no column, no band over the carcass', j({ band: d.st.band, column: d.st.column }));
  check('F5', 'CASE D: the drawers AND the two dividers that held them gone (D29 c, 300 deep: the carcass alone cannot hold them)',
    d.st.drawers.length === 0 && d.st.parts.filter((p) => p.marked).length === 0 && !d.st.panels.some((p) => /^VPART|^Z\d+D\d+/.test(p)),
    'drawers 0, marked dividers 0, no VPART, no drawer box', j({ drawers: d.st.drawers.length, parts: d.st.parts, panels: d.st.panels }));
  const told = d.said.filter((m) => /recess left the cabinet/.test(m.message));
  check('F5', 'CASE D: the notice said, once, in the owner\'s words (info)', told.length === 1 && told[0].message === NOTICE_TWO,
    NOTICE_TWO, j(d.said));
  const onScreen = await page.ask(`document.body.innerText.includes(${j(NOTICE_TWO.slice(0, 40))})`);
  note('F5', 'CASE D: the notice on the screen when read', String(onScreen));
  check('F5', 'CASE D: the drag and the removal are ONE undo step', (await histDepth(page)) - depthBeforeD === 1,
    '1 step', String((await histDepth(page)) - depthBeforeD));

  // Ctrl+Z: one key, the cabinet where the drag began, its column whole.
  await ctrlZ(page);
  const u = await stateOf(page, id);
  const back = JSON.stringify(await page.ask(`${S}.units`)) === beforeD;
  check('F5', 'Ctrl+Z after case D (a real key): the drawers and the two dividers back, the cabinet where the drag began',
    back && u.drawers.length === 3 && same(u.parts.filter((p) => p.marked).map((p) => p.x), a2.exp.dividers) && near(u.x, a2.st.x, 0.01),
    `units identical to before the drag; x ${a2.st.x}, dividers ${j(a2.exp.dividers)}, 3 drawers`, j({ identical: back, x: u.x, parts: u.parts.map((p) => p.x), drawers: u.drawers.length }));
  await settleCamera(page);
  await shot(page, 'f05-d-undo.png');
}

// === LEG 2 . THE 558 CABINET OUT OF THE BAND, THE DOOR AT 90, THE SILVER HINGE
async function leg2(page) {
  const s = await stage(page, 558);
  note('F5', 'THE STAGE (the store\'s own actions): the same room and recess, the wardrobe 1200 x 2150 x 558 at 800', j(s));
  await page.sleep(2500);
  await settleCamera(page);
  const id = s.id;
  const done = await drawersByRecess(page, id);
  const st0 = await stateOf(page, id);
  check('F5', 'the 558 wardrobe: drawers through the RECESS answer (real clicks), the two dividers 210 / 972, three drawers',
    done.add && same(st0.parts.map((p) => [p.x, p.marked]), [[210, true], [972, true]]) && st0.drawers.length === 3,
    '[[210,true],[972,true]], 3 drawers', j({ done, parts: st0.parts, drawers: st0.drawers.length }));
  const mark = await markSaid(page);
  const moved = await dragTo(page, id, 2200, { tries: 1 });
  await page.sleep(1000);
  const st = await stateOf(page, id);
  const said = await saidSince(page, mark);
  check('F5', 'the 558 dragged out of the band by its carcass (a real drag)', near(st.x, 2200, 6) && !st.column, 'x 2200 (+- 6), no column', j({ x: st.x, drags: moved.made, column: st.column }));
  check('F5', 'the 558 out of the band: the drawers stay (D27, the ladder holds them), at the carcass\'s depth 440, no notice',
    st.drawers.length === 3 && st.boxes.length === 3 && st.boxes.every((b) => b.depth === DEPTH) && !said.some((m) => /recess left/.test(m.message)),
    `3 drawers, depth ${DEPTH}, no notice`, j({ drawers: st.drawers.length, boxes: st.boxes, said }));
  const inner = st.top && st.bottom ? Math.round((st.top.box.y - (st.bottom.box.y + st.bottom.box.h)) * 10) / 10 : null;
  check('F5', 'the 558 out of the band: the two dividers stay as the column\'s walls, full height (BOTTOM to TOP), as any two-divider column stack',
    st.parts.filter((p) => p.marked).length === 2 && st.vparts.length === 2 && st.vparts.every((v) => near(v.h, inner, 1)),
    `2 dividers, each ${inner} high (TOP.y - BOTTOM top)`, j({ parts: st.parts.map((p) => p.x), vparts: st.vparts }));
  note('F5', 'the 558: the engine\'s warnings', st.warnings.length ? st.warnings.map((w) => `${w.code}: ${w.message}`).join(' | ') : 'none');
  await settleCamera(page);
  await shot(page, 'f05-558-out.png');

  // THE DOOR: two doors on the 558 (a stage), one double-clicked open on its own pixel.
  await page.ask(`${S}.setDoors(${j(id)}, { count: 2, hinge: 'L' })`);
  await page.sleep(2500);
  await settleCamera(page);
  const fronts = await page.ask(`${S}.unitResult(${j(id)}).panels.filter((p) => p.part === 'FRONT' && p.box).map((p) => ({ id: p.id, w: p.w, h: p.h, t: p.thickness, hinge: p.meta && p.meta.hinge, openAngleDeg: p.meta && p.meta.openAngleDeg }))`);
  note('F5', 'the doors (a stage: setDoors count 2): the leaves and the hinge\'s own catalogue angle on each (meta.openAngleDeg, for the BOM and Check #8)', j(fronts));
  const leaf = fronts[0];
  let at = null;
  if (leaf) { await safeRays(page); at = await reachFree(page, id, leaf.id); }
  if (at) await page.dblclick(at.x, at.y);
  await page.sleep(3500);
  const swing = leaf ? await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; let g = null; let m = null;
    v.scene.traverse((o) => { if (!g && o.userData && o.userData.ccUnitId === ${j(id)}) g = o; });
    if (!g) return null; g.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccPanelId === ${j(leaf.id)}) m = o; });
    if (!m) return null; g.updateMatrixWorld(true);
    const qg = new T.Quaternion(); g.getWorldQuaternion(qg); const qm = new T.Quaternion(); m.getWorldQuaternion(qm);
    const rel = qg.clone().invert().multiply(qm); const ax = new T.Vector3(1, 0, 0).applyQuaternion(rel);
    return { deg: Math.round(Math.abs(Math.atan2(ax.z, ax.x)) * 180 / Math.PI * 10) / 10, open: (${UI}.openFronts || {})[${j(id)}] || null }; })()`) : null;
  const want = await page.ask(`${PROFILE}.doors.openAngle`);
  check('F5', `a door double-clicked open (a real double click on ${leaf ? leaf.id : 'its'} pixel): the leaf turned in the view to the profile's swing, not the hinge's catalogue angle`,
    Boolean(at) && swing && near(swing.deg, 90, 1) && want === 90,
    `90 (profile.doors.openAngle ${want}); the hinge's catalogue ${leaf ? leaf.openAngleDeg : '?'} not drawn`, j({ at, swing }));
  await settleCamera(page);
  await shot(page, 'f05-door-open-90.png');

  // THE HINGE IN THE VIEW: the plated members' material, the profile's nickel, and a frame of it.
  const nickel = await page.ask(`(() => { const c = ${PROFILE}.hardware.hinge.cliptop; const f = (c.finishes || []).find((x) => x.id === c.defaultFinish) || {}; return { def: c.defaultFinish, material: f.material || null }; })()`);
  const hinge = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const mats = []; const box = new T.Box3(); let n = 0;
    v.scene.traverse((o) => { if (!o.isMesh || o.visible === false) return; let a = o; let hp = null; while (a) { if (a.userData && a.userData.ccHingePanel !== undefined) { hp = a.userData.ccHingePanel; break; } a = a.parent; }
      if (hp === null || hp === undefined || hp !== ${j(leaf ? leaf.id : '')}) return; n += 1; box.expandByObject(o);
      for (const mt of [].concat(o.material || [])) mats.push({ name: mt.name || '', colour: mt.color ? '#' + mt.color.getHexString() : null, metalness: mt.metalness, roughness: mt.roughness }); });
    if (!n) return { meshes: 0 };
    const c = box.getCenter(new T.Vector3()); const s = box.getSize(new T.Vector3()); const r = Math.max(s.x, s.y, s.z) * 2.2 + 0.05;
    v.camera.position.set(c.x + r * 0.6, c.y + r * 0.35, c.z + r); v.controls.target.copy(c); v.controls.update();
    const uniq = []; for (const m of mats) if (!uniq.some((u) => u.colour === m.colour && u.metalness === m.metalness)) uniq.push(m);
    return { meshes: n, materials: uniq }; })()`);
  const rgb = (h) => (h ? [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16)) : null);
  const want3 = rgb(nickel.material && nickel.material.colour);
  const metal = (hinge.materials || []).find((m) => m.metalness >= 0.5 && want3 && rgb(m.colour).every((c, i) => Math.abs(c - want3[i]) <= 3));
  check('F5', 'the hinge in the view silver: the default finish nickel, its plated members drawn in nickel\'s colour and metal (profile.hardware.hinge.cliptop)',
    nickel.def === 'nickel' && Boolean(metal) && near(metal.metalness, nickel.material.metalness, 0.01) && near(metal.roughness, nickel.material.roughness, 0.01),
    `nickel ${nickel.material ? `${nickel.material.colour} metalness ${nickel.material.metalness} roughness ${nickel.material.roughness}` : '?'}`, j(hinge));
  await settleCamera(page);
  await page.sleep(1500);
  await shot(page, 'f05-hinge-silver.png');
}

// === THE RUN ================================================================
const LEG_TITLES = {
  1: 'THE OWNER\'S 1200 x 2150 x 300 WARDROBE BEFORE THE 800 x 300 RECESS: DRAWERS BY RECESS, DRAGGED THROUGH A, B, C, THE 15 MM CASE, A, D; THE CNC SHEET OF A; CTRL+Z',
  2: 'THE 558 WARDROBE OUT OF THE BAND; A DOOR OPENED TO 90; THE HINGE SILVER',
};
const LEG_RUN = { 1: leg1, 2: leg2 };
for (const n of LEGS) {
  LEG = n;
  push('LEG', 'F5', `LEG ${n} . ${LEG_TITLES[n]}`);
  let page = null;
  try {
    page = await open({ width: 1440, height: 900 });
    await pro(page, { base: BASE });
    await hearSaid(page);
    if (n === LEGS[0]) note('F5', 'the build under the mouse', `the repo's HEAD ${head}; url ${BASE}`);
    await LEG_RUN[n](page);
  } catch (e) {
    check('F5', `leg ${n} to its end`, false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    if (page) await shot(page, `f05-leg${n}-failure.png`).catch(() => {});
  }
  if (page) {
    const errs = pageErrors(page);
    note('F5', `console errors on the page (leg ${n})`, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
    await page.close();
  }
}
if (painter) await painter.close();
await showroomDown();
stopPreview();

const count = (k) => steps.filter((s) => s.kind === k).length;
const [pass, fail] = [count('PASS'), count('FAIL')];
writeFileSync(`${OUT}walk.txt`, ascii([
  'T85 WALK: THE RECESS COLUMN FOLLOWS THE RECESS, THE RETURNS ON CABINEO, THE DOORS OPEN TO 90 (scripts/t85-walk.mjs)',
  `walked ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, HEAD ${head}, ${BASE}, legs ${LEGS.join(',')}`,
  'Every line: PASS or FAIL (the F, the gesture, what was expected, what was read), NOTE (a reading), FRAME (the file beside this one).',
  'The gestures are real clicks, drags, double clicks and keys (CDP); the stages are the store\'s; the expected walls are the engine\'s (recessColWalls) at the x the drag reached.',
  '',
  ...steps.map((s) => {
    if (s.kind === 'LEG') return `\n${s.gesture}`;
    if (s.kind === 'FRAME') return `FRAME  [${s.leg}] ${s.gesture}`;
    if (s.kind === 'NOTE') return `NOTE   [${s.leg}] ${s.F} ${s.gesture} | ${s.got}`;
    return `${s.kind.padEnd(6)} [${s.leg}] ${s.F} ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
  }),
  '',
  `FRAMES (${frames.length}): ${frames.join(', ')}`,
  `T85: ${pass + fail} checks, ${pass} pass, ${fail} fail`,
  '',
].join('\n')));
process.stdout.write(`\nT85: ${pass + fail} checks, ${pass} pass, ${fail} fail; ledger ${OUT}walk.txt; frames ${frames.join(', ')}\n`);
process.exit(fail ? 1 : 0);
