/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F11, THE WALK (CLAUDE.md T86B PART D)
//
// CLAUDE.md T86B F11: "`scripts/t86b-walk.mjs` on the built app, real mouse
// through the harness: (a) the owner's 4000 x 3000 room, a CORNER_L_BASE in the
// left corner, a BUD added at the arm's end on wall 3: no infill drawn between
// them, the plus beyond the BUD; (b) the owner's recess wardrobe, three drawers
// in the column, the Section shows Stack height and Partition rows with
// numbers; a shelf added above the cap spans side to side (frame); (c) a chest
// added "in the room": variant A, dragged by its carcass +300, rotated 90, its
// panel and slab following (three frames), variant B built beside (frame), the
// slab's Finish set to Sprayed RAL 3005 (frame), Overhang 20 typed and the slab
// grown; (d) a run of five with a leftover: the share-out bar shows ONE button,
// pressed, the run shared; (e) the bar shows five toggles and Dimensions flips
// the chains; the View popup lists seven; Settings holds the Dimension colour
// row, Red pressed, reload, still Red, Navy restored; (f) the two corners of F9
// after the fix, from the owner's camera (`f11-corners-after.png`). Every line
// PASS or FAIL with the number expected and the number read; never patched in
// the walk."
//
// THE GESTURES ARE REAL (scripts/t74-harness.mjs, scripts/t75-harness.mjs,
// CDP's own input pipe): the rail's Add and the library's rows, the hand
// hovering a cabinet so its pluses show and the plus clicked, a cabinet
// selected by a click on its own pixel, the right panel's sections, rows and
// fields, the chest DRAGGED by its carcass, the scene toggles and the View
// popup, the Settings window's row, the start screen's Open from file. THE
// STAGES that are not what a station is about (the room, the recess, the
// wardrobe's size, the run of five) are put through the store's own actions,
// as the earlier walks put theirs. The store and the engine are READ to say
// what happened (window.__cc). A FAIL is written down, never patched.
//
//   npx vite build; npx vite preview --port 4173 --strictPort &   then: node scripts/t86b-walk.mjs
//   node scripts/t86b-walk.mjs --build --serve     build dist/, serve it on 4173, walk, stop it
//   node scripts/t86b-walk.mjs --legs a,c          some stations only
//
// Chromium: /opt/pw-browsers (CHROME_PATH is set from it when unset); nothing
// is downloaded. Ledger: verify/t86b/walk.txt. Frames: verify/t86b/f11-*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import {
  mkdirSync, mkdtempSync, writeFileSync, existsSync, readdirSync, readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

// === THE ARGUMENTS ==========================================================
const REPO = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const LEGS = String(opt('legs', process.env.T86B_LEGS || 'a,b,c,d,e,f')).split(',').map((s) => s.trim()).filter((s) => /^[a-f]$/.test(s));
const PORT = Number(process.env.E2E_PORT || 4173);
const BASE = process.env.E2E_URL || `http://127.0.0.1:${PORT}/`;
const SCRATCH = mkdtempSync(join(tmpdir(), 't86b-walk-'));
const OUT = opt('out', new URL('../verify/t86b/', import.meta.url).pathname).replace(/\/?$/, '/');
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
  open, pro, showroomDown, settleCamera, localBox,
} = await import('./t74-harness.mjs');
const {
  key, clickWith, boxOf, until, reachFree, dragAlong, helperAt, orbitFree,
} = await import('./t75-harness.mjs');
const { computeCabinet } = await import('../src/engine/cabinet.js');
const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');
const { paramsForEngine } = await import('../src/stores/projectStore.js');
const { cornerLAdjacentSpan } = await import('../src/engine/runs.js');
const { roomWalls } = await import('../src/engine/room.js');

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
let LEG = '';
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
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));
const near = (a, b, tol = 0.6) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) <= tol;
const same = (a, b) => j(a) === j(b);
const r1 = (v) => Math.round(Number(v) * 10) / 10;
const G = P.board.thickness;
const CLR = P.carcass.shelfWidthClearance;

// === THE FRAMES =============================================================
async function shot(page, name, clip = null) {
  await page.sleep(500);
  await page.screenshot(`${OUT}${name}`, clip);
  frames.push(name);
  push('FRAME', 'F11', name);
}

// === THE HANDS (all real events) ============================================
/** The room's meshes that take no pointer get a no-op raycast for the walk's finder only (scripts/t85-walk.mjs). */
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
/** A button pressed by a real click at its centre; false when none is on the screen. */
async function pressIf(page, expr) {
  const at = await boxOf(page, expr);
  if (!at) return false;
  await clickWith(page, at.x, at.y);
  await page.sleep(700);
  return true;
}
/** A field typed into by the hand: a click into it, select all, the text, Enter. */
async function typeInto(page, expr, text) {
  const at = await boxOf(page, expr);
  if (!at) return false;
  await clickWith(page, at.x, at.y);
  await selectAll(page);
  await page.typeText(String(text));
  await key(page, 'Enter');
  await page.sleep(900);
  return true;
}
/** The pieces a hand can click a cabinet by: a side, the top, the bottom, a back, anything. */
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const pick = [];
  for (const f of [(p) => p.id === 'BUL' || p.id === 'BUR', (p) => /^TOP/.test(p.id), (p) => /^BOTTOM/.test(p.id), (p) => p.role === 'side', (p) => /^SIDE/.test(p.id), () => true]) {
    for (const p of r.panels) if (f(p) && !(p.meta && p.meta.frontDecorationParent) && !pick.includes(p.id)) pick.push(p.id); }
  return pick.slice(0, 8); })()`);
/** A unit selected by a real click on one of its carcass pieces, its right panel standing. */
async function selectUnit(page, unitId) {
  const ok = `${UI}.selectedUnitId === ${j(unitId)} && Boolean(document.querySelector('[data-section]'))`;
  if (await page.ask(ok)) return true;
  for (const pid of await grabIds(page, unitId)) {
    await safeRays(page);
    const at = await reachFree(page, unitId, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    if (await until(page, ok, 4000)) return true;
  }
  return false;
}
/** A section of the right panel opened by its own header (a real click), when it is shut. */
async function sectionOpen(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
/** The hand moved onto a piece of the unit (no press): the scene shows that run's pluses. */
async function hover(page, unitId) {
  for (const pid of await grabIds(page, unitId)) {
    await safeRays(page);
    const at = await reachFree(page, unitId, pid);
    if (!at) continue;
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
    await page.sleep(900);
    return { pid, at };
  }
  return null;
}
/** The plus sprites the scene draws (userData.ccAddPlus), their titles and clickable pixels (scripts/t78-walk.mjs). */
async function pluses(page) {
  const list = await page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return []; const out = [];
    v.scene.traverse((o) => { if (o.userData && o.userData.ccAddPlus && o.visible !== false) out.push({ title: (o.children[0] && o.children[0].name) || '' }); });
    return out; })()`);
  const pix = await helperAt(page, '(u) => u.ccAddPlus === true') || [];
  return list.map((s, i) => ({ ...s, px: pix[i] ? { x: pix[i].x, y: pix[i].y } : null, first: pix[i] ? pix[i].first : false }));
}
/** The library through the Studio rail: Add, the category, the group's flyout. Real clicks. */
async function libraryOpen(page, category, group) {
  if (!(await page.has(`[data-library-group="${group}"]`))) {
    await page.press('[data-studio="rail-add"]');
    await page.press(`[data-studio="popup-item"][data-item="${category}"]`);
    await page.sleep(600);
  }
  if (!(await page.has(`[data-library-group="${group}"]`)) && await page.has('[data-library-show-all="1"]')) await page.press('[data-library-show-all="1"]');
  if (await page.has(`[data-library-group="${group}"]`) && !(await page.has(`[data-library-flyout="${group}"]`))) await page.press(`[data-library-group="${group}"]`);
  return page.has(`[data-library-flyout="${group}"]`);
}
async function closeLibrary(page) {
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
}
/** What the page said: every notice the ui store took (scripts/t85-walk.mjs hearSaid). */
async function hearSaid(page) {
  await page.ask(`(() => { if (window.__t86bSaid) return true; window.__t86bSaid = [];
    window.__cc.ui.subscribe((s, p) => { if (s.messages === p.messages) return; for (const m of s.messages || []) if (!(p.messages || []).includes(m)) window.__t86bSaid.push({ message: m.message, level: m.level, tone: m.tone }); });
    return true; })()`);
}
const markSaid = (page) => page.ask('(window.__t86bSaid || []).length');
const saidSince = (page, mark) => page.ask(`(window.__t86bSaid || []).slice(${Number(mark) || 0})`);
const histDepth = (page) => page.ask(`${HIST}.past.length`);
const numberIn = (t) => { const m = String(t || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/g); return m ? Number(m[m.length - 1]) : null; };

/** A unit's group in the scene: its world centre in mm (x, z on the floor) and its world box. */
const groupOf = (page, unitId) => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; let g = null;
  v.scene.traverse((o) => { if (!g && o.userData && o.userData.ccUnitId === ${j(unitId)}) g = o; });
  if (!g) return null; g.updateMatrixWorld(true);
  const b = new T.Box3(); g.traverse((o) => { if (o.isMesh && o.visible !== false && !(o.userData && (o.userData.ccHelper || o.userData.ccNoBounds))) b.expandByObject(o); });
  const c = b.getCenter(new T.Vector3()); const s = b.getSize(new T.Vector3()); const R = (n) => Math.round(n * 10000) / 10;
  return { cx: R(c.x), cz: R(c.z), sx: R(s.x), sz: R(s.z), sy: R(s.y) }; })()`);
/** The worktop slabs the scene draws (userData.ccWorktopId): centre, size, the material's colour. */
const slabsOf = (page) => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const out = [];
  v.scene.traverse((o) => { if (!o.isMesh || !o.userData || !o.userData.ccWorktopId) return; o.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(o); const c = b.getCenter(new T.Vector3()); const s = b.getSize(new T.Vector3()); const R = (n) => Math.round(n * 10000) / 10;
    const m = [].concat(o.material)[0] || {};
    out.push({ id: o.userData.ccWorktopId, mm: o.userData.ccWorktopMm, cx: R(c.x), cz: R(c.z), sx: R(s.x), sz: R(s.z),
      colour: m.color ? '#' + m.color.getHexString() : null, type: m.type, roughness: m.roughness, clearcoat: m.clearcoat }); });
  return out; })()`);

// === STATION A . THE L'S ARM IS A NEIGHBOUR (F1) ============================
async function legA(page) {
  const st = await page.ask(`(() => { const st = () => window.__cc.project.getState();
    st().newProject('T86B walk a');
    st().setRoom({ corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }], height: 2500 });
    return st().project.room.corners.length; })()`);
  note('F1', 'THE STAGE (the store\'s own actions): a new project, the owner\'s 4000 x 3000 room 2500 high', `${st} walls`);
  await page.sleep(1500);
  const before = new Set(await page.ask(`${S}.units.map((u) => u.id)`));
  const opened = await libraryOpen(page, 'kitchen', 'base-units');
  if (opened) await page.press('[data-library-entry="corner-l"]');
  await page.sleep(1500);
  const lId = (await page.ask(`${S}.units.filter((u) => u.type === 'CORNER_L_BASE').map((u) => u.id)`)).find((id) => !before.has(id)) || null;
  await closeLibrary(page);
  const L = lId ? await page.ask(`(() => { const u = ${S}.units.find((x) => x.id === ${j(lId)}); return { num: u.params.unit_num, wall: u.position.wall, x: u.position.x_mm, w: u.params.width, d: u.params.depth, side: u.params.corner_side }; })()`) : null;
  check('F1', 'the rail\'s Add, Kitchen, Base units, Corner L (real clicks): a CORNER_L_BASE in the left corner of wall 1 (index 0)',
    L && L.wall === 0 && L.side === 'left', 'CORNER_L_BASE on wall index 0, corner_side left', j(L));
  if (!L) throw new Error('no L');
  await settleCamera(page);
  await page.sleep(1200);
  // The hand over the L: its pluses show; the corner plus (arm B, wall 4 = index 3) clicked.
  const hv = await hover(page, lId);
  let pl = await pluses(page);
  const titleB = new RegExp(`^Add a unit beside ${L.num} on wall (\\d+)$`);
  let pB = pl.find((p) => titleB.test(p.title)) || null;
  let clicked = false;
  for (const [dx, dy] of [[0, 0], [120, 0], [-240, 0], [120, 120]]) {
    if (dx || dy) { await orbitFree(page, dx, dy); await hover(page, lId); pl = await pluses(page); pB = pl.find((p) => titleB.test(p.title)) || null; }
    if (pB && pB.px && pB.first) {
      await clickWith(page, pB.px.x, pB.px.y);
      clicked = Boolean(await until(page, `${UI}.libraryInsert`, 4000));
      if (clicked) break;
    }
  }
  check('F1', `the hand over the L (${hv ? hv.pid : 'not reached'}) shows its pluses; the corner plus "Add a unit beside ${L.num} on wall 4" clicked (a real click), the library opens on that place`,
    clicked && pB && /on wall 4$/.test(pB.title), 'the plus on wall 4 (index 3), the library\'s insert point set', j({ plus: pB, clicked, titles: pl.map((p) => p.title) }));
  const before2 = new Set(await page.ask(`${S}.units.map((u) => u.id)`));
  if (clicked) {
    if (!(await page.has('[data-library-entry="door-base"]')) && await page.has('[data-library-group="base-units"]')) await page.press('[data-library-group="base-units"]');
    await page.press('[data-library-entry="door-base"]');
    await page.sleep(1500);
  }
  const budId = (await page.ask(`${S}.units.map((u) => u.id)`)).find((id) => !before2.has(id)) || null;
  await closeLibrary(page);
  // Where arm B ends on wall 4: the engine's own span (engine/runs.js cornerLAdjacentSpan, T78 F1), read in node off the page's unit and room.
  const lNow = await page.ask(`({ unit: ${S}.units.find((u) => u.id === ${j(lId)}), room: ${S}.project.room })`);
  const adj = cornerLAdjacentSpan(lNow.unit, roomWalls(lNow.room), P);
  const bud = budId ? await page.ask(`(() => { const st = ${S}; const u = st.units.find((x) => x.id === ${j(budId)}); const r = st.unitResult(u.id);
    return { type: u.type, num: u.params.unit_num, wall: u.position.wall, x: u.position.x_mm, w: u.params.width, infillL: u.params.side_infill_left_mm || 0, infillR: u.params.side_infill_right_mm || 0,
      infillPanels: r.panels.filter((p) => /INFILL/i.test(String(p.id)) || p.role === 'side_infill').map((p) => p.id) }; })()`) : null;
  const arm = await page.ask(`(() => { const st = ${S}; const l = st.units.find((u) => u.id === ${j(lId)}); const run = st.units.filter((u) => u.position.wall === 3 && u.id !== l.id);
    return run.map((u) => ({ id: u.id, x: u.position.x_mm, w: u.params.width })); })()`);
  note('F1', 'wall 4 (index 3) after the add, and the arm\'s span there (cornerLAdjacentSpan)', j({ run: arm, arm: adj }));
  const flushAt = bud ? bud.x + bud.w : null;
  check('F1', 'the BUD (Standard, door-base, pressed in the library the plus opened) on wall 4 at the arm\'s end',
    bud && bud.type === 'BUD' && bud.wall === 3, 'a BUD on wall index 3', j(bud));
  check('F1', 'NO INFILL toward the arm (law 1): side_infill_right_mm 0, no infill board in the engine\'s parts',
    bud && bud.infillR === 0 && bud.infillPanels.length === 0, 'side_infill_right_mm 0, infill panels []', j(bud && { infillR: bud.infillR, infillL: bud.infillL, panels: bud.infillPanels }));
  const meshes = budId ? await page.ask(`(() => { const v = window.__cc.views.room; let g = null; const ids = [];
    v.scene.traverse((o) => { if (!g && o.userData && o.userData.ccUnitId === ${j(budId)}) g = o; });
    if (!g) return null; g.traverse((o) => { if (o.isMesh && o.visible !== false && o.userData && o.userData.ccPanelId) ids.push(o.userData.ccPanelId); }); return [...new Set(ids)]; })()`) : null;
  check('F1', 'the scene: no infill drawn between the BUD and the arm (no INFILL mesh under the BUD\'s group)',
    Array.isArray(meshes) && !meshes.some((id) => /INFILL/i.test(id)), 'no mesh id matching INFILL', j(meshes));
  // Where the arm ends on wall 4: read off the L's own drawn boxes (the farthest along wall 4), against the BUD's right end.
  const lBox = await groupOf(page, lId);
  const bBox = budId ? await groupOf(page, budId) : null;
  note('F1', 'the L and the BUD drawn (world mm, the room centred on the origin)', j({ L: lBox, BUD: bBox }));
  check('F1', 'the BUD stands against the arm: its right end flush with the arm B end, the corner stop (cornerLAdjacentSpan .left)',
    bud && adj && adj.wall === 3 && near(flushAt, adj.left, 1), `x + w = ${adj && adj.left} on wall index ${adj && adj.wall}`, j({ x: bud && bud.x, w: bud && bud.w, end: flushAt }));
  // The plus beyond the BUD: the hand over the BUD, its left plus there, none between it and the arm.
  await settleCamera(page);
  await hover(page, budId);
  const pb = await pluses(page);
  const left = pb.find((p) => new RegExp(`^Add a unit to the left of ${bud ? bud.num : '?'}$`).test(p.title));
  const right = pb.find((p) => new RegExp(`^Add a unit to the right of ${bud ? bud.num : '?'}$`).test(p.title));
  check('F1', 'the hand over the BUD: the plus beyond it (its left, toward the wall), and no plus between it and the arm',
    Boolean(left) && !right, '"Add a unit to the left of <BUD>" drawn; no "to the right of <BUD>"', j(pb.map((p) => p.title)));
  await shot(page, 'f11-a-l-neighbour.png');
}

// === STATION B . THE COLUMN STACK'S NUMBERS, THE SHELF OVER THE CAP (F2, F3)
async function stageRecess(page) {
  return page.ask(`(() => { const st = () => window.__cc.project.getState();
    st().newProject('T86B walk b');
    st().setRoom({ corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }], height: 2500 });
    st().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 800, depth: 300 });
    const a = st().addUnit('WARDROBE', { wall: 0, x: 200 });
    st().updateUnitParams(a.id, { width: 1200, height: 2150, depth: 300 });
    st().moveUnit(a.id, 800, 1);
    const u = st().units.find((x) => x.id === a.id);
    return { id: a.id, x: u.position.x_mm, w: u.params.width, h: u.params.height, d: u.params.depth }; })()`);
}
/** The DRAWERS through the right panel: Add items, Drawers, Count 3, Columns Recess, Bare boxes, Add (scripts/t85-walk.mjs). */
async function drawersByRecess(page, unitId) {
  const done = { selected: await selectUnit(page, unitId) };
  done.addItems = await sectionOpen(page, 'Add items');
  if (!(await page.has('[data-drawer-columns]'))) await pressIf(page, '[...document.querySelectorAll(\'[data-add-kind="drawers"]\')].find((b) => b.offsetParent)');
  const cnt = await boxOf(page, '(() => { const l = [...document.querySelectorAll(\'[data-add-items] .cc-label\')].find((e) => e.offsetParent && e.textContent.trim() === \'Count\'); return l ? l.parentElement.querySelector(\'input\') : null; })()');
  if (cnt) {
    await clickWith(page, cnt.x, cnt.y);
    await selectAll(page);
    await page.typeText('3');
    await key(page, 'Enter');
  }
  done.recess = await pressIf(page, 'document.querySelector(\'[data-drawer-columns="recess"]\')');
  done.bare = await pressIf(page, 'document.querySelector(\'[data-drawer-mount="internal"]\')');
  done.add = await pressIf(page, '[...document.querySelectorAll(\'[data-add-items] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add\')');
  await page.sleep(1200);
  return done;
}
async function legB(page) {
  const s = await stageRecess(page);
  note('F2', 'THE STAGE (the store\'s own actions, T85\'s): the 4000 x 3000 room, the 800 x 300 recess at 1000 on wall 0, the wardrobe 1200 x 2150 x 300 at 800', j(s));
  await page.sleep(2500);
  await settleCamera(page);
  const id = s.id;
  const done = await drawersByRecess(page, id);
  const eng = await page.ask(`(() => { const st = ${S}; const u = st.units.find((x) => x.id === ${j(id)}); const r = st.unitResult(${j(id)});
    const items = (u.params.sections[0] || { items: [] }).items || [];
    const v1 = r.panels.find((p) => p.id === 'VPART-1');
    const fronts = r.panels.filter((p) => /^Z1D\\d+-F$|DRAWER-FRONT/.test(p.id) || (p.part === 'DRAWER-FRONT'));
    return { parts: items.filter((i) => i.kind === 'partition').map((i) => i.x_mm), drawers: items.filter((i) => i.kind === 'drawer').map((i) => i.zone),
      columnDrawers: ((r.assemblies && r.assemblies.columnDrawers) || []).map((c) => c.zone), stacks: (r.derived && r.derived.columnStacks) || null,
      capUnder: v1 && v1.box ? v1.box.y + v1.box.h : null }; })()`);
  check('F2', 'the wardrobe selected by a real click, Add items, Drawers, Count 3, Columns Recess, Bare boxes, Add: dividers 210 / 972, three drawers in Column 2',
    done.add && same(eng.parts, [210, 972]) && eng.drawers.length === 3 && eng.drawers.every((z) => z === 1), 'dividers [210, 972], 3 drawers zone 1', j({ done, parts: eng.parts, zones: eng.drawers }));
  const stack = eng.stacks && eng.stacks[1];
  check('F2', 'the engine: derived.columnStacks[1] written (drawerTotalH, partition_bottom_y = the cap\'s underside, where the dividers end)',
    stack && stack.drawerTotalH > 0 && near(stack.partition_bottom_y, eng.capUnder, 0.6), `partition_bottom_y ${eng.capUnder} (VPART-1 top)`, j({ stacks: eng.stacks, capUnder: eng.capUnder }));
  const sec = await page.ask(`[...document.querySelectorAll('[data-section]')].map((s) => s.getAttribute('data-section') + ':' + s.getAttribute('data-open'))`);
  const sectionTitle = (sec.find((t) => /^Section 1:/.test(t)) || 'Section 1:').split(':')[0];
  const opened = await sectionOpen(page, sectionTitle);
  const rows = await page.ask(`(() => { const h = document.querySelector('[data-column-stack-height="1"]'); const p = document.querySelector('[data-column-stack-partition="1"]');
    const t = (e) => (e ? e.textContent.replace(/\\s+/g, ' ').trim() : null); if (h) h.scrollIntoView({ block: 'center' }); return { height: t(h), partition: t(p) }; })()`);
  check('F2', `the Section (${sectionTitle} opened by its header) shows "Stack height" for Column 2 with the engine's number`,
    opened && rows.height && /^Stack height/.test(rows.height) && stack && near(numberIn(rows.height), stack.drawerTotalH, 0.6), `Stack height ${stack ? stack.drawerTotalH : '?'}`, j(rows.height));
  check('F2', 'the Section shows "Partition (locked, required above the stack)" for Column 2 with the engine\'s number',
    rows.partition && /^Partition \(locked, required above the stack\)/.test(rows.partition) && stack && near(numberIn(rows.partition), stack.partition_bottom_y, 0.6),
    `Partition (locked, required above the stack) ${stack ? stack.partition_bottom_y : '?'}`, j(rows.partition));
  await shot(page, 'f11-b-section-rows.png');
  // THE SHELF: Add items, Shelves, Bay 2 (the column), Add 1, Add.
  const before = await page.ask(`(${S}.units.find((u) => u.id === ${j(id)}).params.sections[0].items || []).filter((i) => i.kind === 'shelf').map((i) => i.id)`);
  await sectionOpen(page, 'Add items');
  await pressIf(page, '[...document.querySelectorAll(\'[data-add-kind="shelves"]\')].find((b) => b.offsetParent)');
  const offeredZones = await page.ask('[...document.querySelectorAll(\'[data-add-items] [data-zone]\')].filter((b) => b.offsetParent).map((b) => b.textContent.trim())');
  const bay = await pressIf(page, '[...document.querySelectorAll(\'[data-add-items] [data-zone="1"]\')].find((b) => b.offsetParent)');
  const added = await pressIf(page, '[...document.querySelectorAll(\'[data-add-items] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add\' && !b.disabled)');
  await page.sleep(1500);
  const sh = await page.ask(`(() => { const st = ${S}; const u = st.units.find((x) => x.id === ${j(id)}); const r = st.unitResult(u.id);
    const items = (u.params.sections[0].items || []).filter((i) => i.kind === 'shelf' && !${j(before)}.includes(i.id));
    const it = items[0]; if (!it) return null; const p = r.panels.find((q) => q.meta && q.meta.itemId === it.id) || r.panels.find((q) => /^SHELF/.test(q.id) && q.box && Math.abs(q.box.y - it.pos_mm) < 30);
    const pins = [...new Set(r.drills.filter((d) => d.kind === 'shelf' && Math.abs(d.y - (p ? p.box.y : it.pos_mm)) <= 60).map((d) => d.panel))].sort();
    return { item: { id: it.id, zone: it.zone, pos: it.pos_mm }, panel: p ? { id: p.id, x0: p.box.x, x1: p.box.x + p.box.w, y: p.box.y } : null, pins,
      red: r.warnings.filter((w) => w.level === 'error' || w.level === 'red').map((w) => w.code) }; })()`);
  const above = sh && sh.panel && sh.panel.y > eng.capUnder + G;
  check('F3', `Add items, Shelves, Bay 2, Add (real clicks; bays offered ${j(offeredZones)}): one shelf added in the column, above the cap`,
    bay && added && sh && sh.item.zone === 1 && above, `a shelf in zone 1 above ${eng.capUnder + G}`, j(sh && { item: sh.item, y: sh.panel && sh.panel.y }));
  check('F3', 'the shelf over the column spans the carcass side to side (law 3): x 20 to 1180 (the sides 18 less half the 4 clearance)',
    sh && sh.panel && near(sh.panel.x0, G + CLR / 2) && near(sh.panel.x1, 1200 - G - CLR / 2), `x ${G + CLR / 2} to ${1200 - G - CLR / 2}`, j(sh && sh.panel));
  check('F3', 'its supports are the sides (shelf pins on BUL and BUR at its height), nothing red',
    sh && same(sh.pins, ['BUL', 'BUR']) && sh.red.length === 0, 'pins [BUL, BUR], no red', j(sh && { pins: sh.pins, red: sh.red }));
  await settleCamera(page);
  await shot(page, 'f11-b-shelf-over-column.png');
}

// === STATION C . THE CHEST IN THE ROOM (F4, F5, F8) =========================
const islandNow = (page, islandId) => page.ask(`(() => { const st = ${S}; const i = (st.project.room.islands || []).find((x) => x.id === ${j(islandId)}); if (!i) return null;
  const on = st.units.filter((u) => u.position && u.position.island === i.id).map((u) => ({ id: u.id, type: u.type, face: u.position.face, wall: u.position.wall, w: u.params.width, h: u.params.height, d: u.params.depth }));
  const rec = (st.project.design.worktops || []).find((w) => w.island === i.id) || null;
  return { id: i.id, cx: i.cx, cy: i.cy, rotation: i.rotation, variant: i.chestIsland && i.chestIsland.variant, overhang: i.islandOverhangMm, on,
    worktop: rec ? { id: rec.id, finish: rec.finish || null, colour: rec.colour || null, sheen: rec.sheen ?? null } : null }; })()`);
/** The island's slab as the store resolves it (worktopsOf, the slab the scene draws): its plan size and overhang. */
const slabGeo = (page, islandId) => page.ask(`(() => { const sl = ${S}.worktopsOf().filter((w) => (w.geometry && w.geometry.island) === ${j(islandId)} || w.island === ${j(islandId)});
  return { n: sl.length, slabs: sl.map((w) => ({ id: w.id, w: w.geometry && w.geometry.w, d: w.geometry && w.geometry.d, overhang: w.geometry && w.geometry.overhang })) }; })()`);
/** The chest's own depth over its fronts (the island slab's law, test/turn86b-f05-chest-island-store.test.js): depth + doors.gap + front_t. */
const overFronts = (page, unitId) => page.ask(`(() => { const u = ${S}.units.find((x) => x.id === ${j(unitId)}); return Number(u.params.depth) + Number(window.__cc.profile.getState().profile.doors.gap) + Number(u.params.front_t || 0); })()`);
async function chestInRoom(page, variant) {
  const before = new Set(await page.ask(`(${S}.project.room.islands || []).map((i) => i.id)`));
  const opened = await libraryOpen(page, 'wardrobe', 'chest-of-drawers');
  const entry = await page.has('[data-library-chest-in-room="1"]');
  if (entry) await page.press('[data-library-chest-in-room="1"]');
  const popup = Boolean(await until(page, 'Boolean(document.querySelector(\'[data-chest-popup="1"]\'))', 4000));
  const pictures = await page.ask('[...document.querySelectorAll(\'[data-chest-popup="1"] [data-chest-variant]\')].map((b) => b.getAttribute(\'data-chest-variant\') + (b.querySelector(\'svg[data-chest-picture]\') ? \'+picture\' : \'\'))');
  if (popup) await page.press(`[data-chest-variant="${variant}"]`);
  await page.sleep(1800);
  await closeLibrary(page);
  const islandId = (await page.ask(`(${S}.project.room.islands || []).map((i) => i.id)`)).find((x) => !before.has(x)) || null;
  return {
    opened, entry, popup, pictures, islandId,
  };
}
async function legC(page) {
  await page.ask(`(() => { const st = () => window.__cc.project.getState();
    st().newProject('T86B walk c');
    st().setRoom({ corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }], height: 2500 });
    return true; })()`);
  note('F5', 'THE STAGE (the store\'s own actions): a new project, the 4000 x 3000 room', 'empty');
  await page.sleep(1500);
  const said0 = await markSaid(page);
  const a = await chestInRoom(page, 'panel');
  const isl = a.islandId ? await islandNow(page, a.islandId) : null;
  const chest = isl && isl.on.find((u) => u.face === 'A');
  const back = isl && isl.on.find((u) => u.face === 'B');
  check('F5', 'the rail\'s Add, Wardrobes, Chest of drawers flyout, "Chest in the room" (real clicks): the popup asks the variant with two pictures',
    a.entry && a.popup && same(a.pictures, ['panel+picture', 'double+picture']), 'the entry, the popup, [panel+picture, double+picture]', j(a));
  check('F5', 'A: back panel pressed: an island at the room\'s centre, the chest on face A, a FREE_PANEL on face B (the spec\'s C) of the chest\'s width and height',
    isl && isl.variant === 'panel' && chest && /^WARDROBE_CHEST/.test(chest.type) && back && back.type === 'FREE_PANEL' && back.w === chest.w && back.h === chest.h,
    'variant panel, chest on A, FREE_PANEL on B at the chest\'s w x h', j(isl));
  if (!isl || !chest) throw new Error('no chest island');
  const centre = await page.ask(`(() => { const c = ${S}.project.room.corners; const xs = c.map((p) => p.x); const ys = c.map((p) => p.y); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }; })()`);
  note('F5', 'the island record (core centre; the footprint centre is the chest\'s depth and the panel\'s about it)', j({ cx: isl.cx, cy: isl.cy, roomCentre: centre, said: await saidSince(page, said0) }));
  const backPanel = await page.ask(`(() => { const r = ${S}.unitResult(${j(back.id)}); return r.panels.map((p) => ({ id: p.id, w: p.w, h: p.h, t: p.thickness, box: p.box })); })()`);
  check('F4', 'the back panel\'s board: the chest\'s width x height x the project\'s board (18)',
    backPanel.length >= 1 && backPanel.some((p) => same([p.w, p.h].sort((x, y) => x - y), [chest.w, chest.h].sort((x, y) => x - y)) && (p.t === G || (p.box && Math.min(p.box.w, p.box.d) === G))),
    `${chest.w} x ${chest.h} x ${G}`, j(backPanel));
  const plinth = await page.ask(`(() => { const r = ${S}.unitResult(${j(chest.id)}); return r.panels.filter((p) => /PLINTH/.test(p.id)).map((p) => ({ id: p.id, box: p.box })); })()`);
  note('F4', 'the chest\'s plinth boards (law 5: set back on every exposed side)', j(plinth));
  const sl0 = await slabsOf(page);
  const ov0 = isl.overhang ?? 0;
  const slab0 = sl0.find((s) => isl.worktop && s.id === isl.worktop.id) || sl0[0] || null;
  const geo0 = await slabGeo(page, a.islandId);
  const deepA = (await overFronts(page, chest.id)) + G;
  check('F5', 'one worktop over the whole island: the slab the chest\'s width by the footprint over its fronts and the panel (depth + gap + front + 18) plus 2 x overhang (0 by default)',
    isl.worktop && sl0.length === 1 && geo0.n === 1 && near(geo0.slabs[0].w, chest.w + 2 * ov0, 1) && near(geo0.slabs[0].d, deepA + 2 * ov0, 1) && ov0 === 0,
    `1 slab ${chest.w + 2 * ov0} x ${deepA + 2 * ov0}, overhang 0`, j({ record: isl.worktop, store: geo0, drawn: sl0.map((s) => ({ id: s.id, sx: s.sx, sz: s.sz })) }));
  const issues = await page.ask(`(() => { const c = [...document.querySelectorAll('[data-studio^="counter-"]')].map((e) => e.getAttribute('data-studio') + ' ' + e.getAttribute('data-count'));
    const num = ${S}.units.find((u) => u.id === ${j(chest.id)}).params.unit_num;
    const mine = (${S}.runChecks() || []).filter((f) => (f.subject && f.subject.unitId) === ${j(chest.id)} || String(f.message || '').startsWith(num + ' '));
    const line = (f) => '#' + f.check + ' ' + f.level + ': ' + String(f.message || '').slice(0, 140);
    return { counters: c, red: mine.filter((f) => f.level === 'red').map(line), yellow: mine.filter((f) => f.level === 'yellow').map(line) }; })()`);
  const roomReds = issues.red.filter((t) => !/^#18 /.test(t));
  note('F5', 'the Check on the chest as born in the room (runChecks): every red and yellow finding on it', j(issues));
  check('F5', 'the chest standing free in the room: no red finding about where it stands (the #18 catalogue reds of the mock hardware data set aside, they are the runner\'s article, not the room)',
    roomReds.length === 0, '0 red about the room', j({ roomReds, catalogue: issues.red.length - roomReds.length }));
  const wallYellows = issues.yellow.filter((t) => /the wall/.test(t));
  check('F5', 'the chest standing free in the room: no finding reads a wall at its fronts (both its ends are in the room; frontClearance\'s "the wall: 3 mm. infill? (dust collection)" is for a bare wall)',
    wallYellows.length === 0, 'no "-> the wall" finding on the chest', j(wallYellows));
  await settleCamera(page);
  const g0 = { chest: await groupOf(page, chest.id), back: await groupOf(page, back.id), slab: slab0 };
  await shot(page, 'f11-c-1-chest-in-room.png');

  // DRAGGED BY ITS CARCASS +300 (along face A).
  const depth0 = await histDepth(page);
  let drag = null;
  for (const pid of await grabIds(page, chest.id)) {
    await safeRays(page);
    drag = await dragAlong(page, chest.id, pid, 300);
    if (drag) { drag.grab = pid; break; }
  }
  await page.sleep(1500);
  const isl1 = await islandNow(page, a.islandId);
  const g1 = { chest: await groupOf(page, chest.id), back: await groupOf(page, back.id), slab: (await slabsOf(page))[0] || null };
  const moved = isl1 ? Math.hypot(isl1.cx - isl.cx, isl1.cy - isl.cy) : null;
  const d = (k) => (g0[k] && g1[k] ? [r1(g1[k].cx - g0[k].cx), r1(g1[k].cz - g0[k].cz)] : null);
  const dc = d('chest'); const db = d('back'); const ds = d('slab');
  check('F5', `the chest DRAGGED by its carcass (${drag ? drag.grab : 'not reached'}, a real press, moves, release) +300 along face A: the island moved`,
    drag && near(moved, 300, 8), 'the island\'s core 300 (+- 8, the hand lands on whole pixels) from where it was', j({ moved: r1(moved), from: [isl.cx, isl.cy], to: isl1 && [isl1.cx, isl1.cy], drag }));
  check('F5', 'its panel and its slab followed: the drawn chest, back panel and slab moved by the same vector',
    dc && db && ds && near(dc[0], db[0], 2) && near(dc[1], db[1], 2) && near(dc[0], ds[0], 2) && near(dc[1], ds[1], 2) && Math.hypot(dc[0], dc[1]) > 250,
    'chest = panel = slab (+- 2 mm), about 300', j({ chest: dc, panel: db, slab: ds }));
  const steps = (await histDepth(page)) - depth0;
  const snaps = await page.ask(`${HIST}.past.slice(-${Math.max(1, steps)}).map((p) => { const i = ((p.project && p.project.room && p.project.room.islands) || (p.room && p.room.islands) || []).find((x) => x.id === ${j(a.islandId)}); return i ? [i.cx, i.cy] : null; })`);
  check('F5', 'the drag is ONE undo step (the snapshots the history took: the island\'s core in each)', steps === 1, '1 step, its snapshot the island where the drag began', j({ steps, snapshots: snaps, began: [isl.cx, isl.cy] }));
  await settleCamera(page);
  await shot(page, 'f11-c-2-dragged-300.png');

  // TURNED BY 90: the chest selected (a real click), its panel's Turn 90 degrees.
  const sel = await selectUnit(page, chest.id);
  await sectionOpen(page, 'Carcass');
  const rowThere = await page.has('[data-chest-island-rotate]');
  const turned = rowThere ? await pressIf(page, 'document.querySelector(\'[data-chest-island-rotate]\')') : false;
  await page.sleep(1500);
  const isl2 = await islandNow(page, a.islandId);
  const g2 = { chest: await groupOf(page, chest.id), back: await groupOf(page, back.id), slab: (await slabsOf(page))[0] || null };
  check('F5', `the chest selected (a real click ${sel}), its panel's "Turn 90 degrees" pressed: the island turned by 90`,
    turned && isl2 && ((isl2.rotation - isl1.rotation + 360) % 360) === 90, `rotation ${isl1 ? (isl1.rotation + 90) % 360 : '?'}`, j({ before: isl1 && isl1.rotation, after: isl2 && isl2.rotation, row: rowThere }));
  const dist = (g) => (g.chest && g.back ? r1(Math.hypot(g.chest.cx - g.back.cx, g.chest.cz - g.back.cz)) : null);
  check('F5', 'after the turn the panel still stands at the chest\'s back and the slab over both: the slab\'s plan turned (x and z swapped), chest-to-panel distance kept',
    g1.slab && g2.slab && near(g2.slab.sx, g1.slab.sz, 2) && near(g2.slab.sz, g1.slab.sx, 2) && near(dist(g1), dist(g2), 2),
    `slab ${g1.slab ? `${g1.slab.sz} x ${g1.slab.sx}` : '?'}, chest-panel ${dist(g1)}`, j({ slab: g2.slab && [g2.slab.sx, g2.slab.sz], dist: dist(g2) }));
  await settleCamera(page);
  await shot(page, 'f11-c-3-turned-90.png');

  // THE SLAB'S FINISH: Construction, the worktop row, Finish Sprayed panel, RAL 3005.
  await sectionOpen(page, 'Construction');
  const finishRow = await page.has('[data-worktop-finish]');
  const options = await page.ask('[...document.querySelectorAll(\'[data-worktop-finish-option]\')].map((b) => b.textContent.trim())');
  await pressIf(page, 'document.querySelector(\'[data-worktop-finish-option="spray"]\')');
  await page.sleep(800);
  const sw = await pressIf(page, '[...document.querySelectorAll(\'[data-worktop-spray] button[title]\')].find((b) => /RAL 3005/.test(b.title))');
  await page.sleep(1500);
  const isl3 = await islandNow(page, a.islandId);
  const sl3 = await slabsOf(page);
  check('F8', `Construction, the worktop's "Finish" (${j(options)}), "Sprayed panel" pressed, the RAL 3005 chip (real clicks): the record is sprayed in RAL 3005`,
    finishRow && same(options, ['Decor', 'Sprayed panel']) && sw && isl3.worktop && isl3.worktop.finish === 'spray' && isl3.worktop.colour && /3005|Burgundy/i.test(`${isl3.worktop.colour.name} ${isl3.worktop.colour.ral || ''}`),
    'finish spray, colour RAL 3005 (Burgundy Red #5e2028)', j(isl3.worktop));
  check('F8', 'the slab drawn through the sprayed surface (meshPhysicalMaterial) in the record\'s colour',
    sl3[0] && sl3[0].type === 'MeshPhysicalMaterial' && isl3.worktop.colour && sl3[0].colour === String(isl3.worktop.colour.hex).toLowerCase(),
    `MeshPhysicalMaterial ${isl3.worktop.colour ? isl3.worktop.colour.hex : '?'}`, j(sl3[0] && { type: sl3[0].type, colour: sl3[0].colour, roughness: sl3[0].roughness, clearcoat: sl3[0].clearcoat }));
  await settleCamera(page);
  await shot(page, 'f11-c-4-sprayed-ral3005.png');

  // THE OVERHANG: 20 typed into the worktop's Overhang (mm).
  const typed = await typeInto(page, 'document.querySelector(\'[data-worktop-overhang-field="1"]\') && (document.querySelector(\'[data-worktop-overhang-field="1"]\').tagName === \'INPUT\' ? document.querySelector(\'[data-worktop-overhang-field="1"]\') : document.querySelector(\'[data-worktop-overhang-field="1"] input\'))', '20');
  await page.sleep(1200);
  const isl4 = await islandNow(page, a.islandId);
  const geo3 = geo0;
  const geo4 = await slabGeo(page, a.islandId);
  const sl4 = await slabsOf(page);
  check('F8', 'Overhang (mm) 20 typed (a real click, select, 20, Enter): the island\'s islandOverhangMm 20 and the slab grown by 2 x 20 each way',
    typed && isl4.overhang === 20 && geo4.n === 1 && near(geo4.slabs[0].w, geo3.slabs[0].w + 40, 1) && near(geo4.slabs[0].d, geo3.slabs[0].d + 40, 1),
    `overhang 20; slab ${geo3.slabs[0].w + 40} x ${geo3.slabs[0].d + 40}`, j({ overhang: isl4.overhang, before: geo3.slabs[0], after: geo4.slabs[0], drawn: sl4[0] && [sl4[0].sx, sl4[0].sz] }));
  await settleCamera(page);
  await shot(page, 'f11-c-5-overhang-20.png');

  // VARIANT B BESIDE: a second chest in the room, B: back to back.
  const said1 = await markSaid(page);
  const b = await chestInRoom(page, 'double');
  const islB = b.islandId ? await islandNow(page, b.islandId) : null;
  const saidB = await saidSince(page, said1);
  let road = 'a second "Chest in the room", B: back to back';
  let built = islB;
  if (!islB) {
    note('F5', 'a second chest island at the room\'s centre was refused (the first stands there): the words said', j(saidB));
    // The island's own panel: the variant B button of the first island.
    await selectUnit(page, chest.id);
    await pressIf(page, 'document.querySelector(\'[data-chest-island-variant="double"]\')');
    await page.sleep(1500);
    built = await islandNow(page, a.islandId);
    road = 'the first island\'s own "B: back to back" in its panel';
  }
  if (built && isl4.worktop && isl4.worktop.finish === 'spray') {
    note('F8', 'FINDING: the slab\'s finish across the variant change (the store makes a new slab for the new pair)',
      j({ before: { id: isl4.worktop.id, finish: isl4.worktop.finish, colour: isl4.worktop.colour && isl4.worktop.colour.hex }, after: built.worktop }));
  }
  const fA = built && built.on.find((u) => u.face === 'A');
  const fB = built && built.on.find((u) => u.face === 'B');
  check('F5', `variant B built (${road}): a second chest on face B, back to back, the first's params; one slab over both`,
    built && built.variant === 'double' && fA && fB && fB.type === fA.type && fB.w === fA.w && fB.h === fA.h && fB.d === fA.d && built.worktop,
    'variant double, two chests of one size on A and B, a worktop record', j(built));
  if (built) {
    const geoB = await slabGeo(page, built.id);
    const ovB = built.overhang || 0;
    const deepB = fA ? 2 * (await overFronts(page, fA.id)) : null;
    check('F5', 'the slab over the back-to-back pair: one slab, the chest\'s width by twice its depth over its fronts, plus 2 x overhang',
      geoB.n === 1 && fA && near(geoB.slabs[0].w, fA.w + 2 * ovB, 1) && near(geoB.slabs[0].d, deepB + 2 * ovB, 1),
      fA ? `1 slab ${fA.w + 2 * ovB} x ${deepB + 2 * ovB} (overhang ${ovB})` : '?', j(geoB));
  }
  await settleCamera(page);
  await shot(page, 'f11-c-6-variant-b.png');
}

// === STATION D . ONE SHARE-OUT BUTTON (F6) ==================================
async function legD(page) {
  const s = await page.ask(`(() => { const st = () => window.__cc.project.getState();
    st().newProject('T86B walk d');
    st().setRoom({ corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }], height: 2500 });
    // From 40 (the corner's own clearance for a base unit; at 10 the store refuses in words).
    const ids = [];
    for (let k = 0; k < 5; k += 1) ids.push(st().addUnit('BUD', { wall: 0, x: 40 + 740 * k, params: { width: 740 } }).id);
    const run = st().units.map((u) => ({ id: u.id, wall: u.position.wall, x: u.position.x_mm, w: u.params.width }));
    return { ids, run }; })()`);
  note('F6', 'THE STAGE (the store\'s own actions): five BUDs of 740 on wall 1 (index 0) of the 4000 x 3000 room, a leftover at the wall', j(s.run));
  await page.sleep(2000);
  await settleCamera(page);
  // The last cabinet selected by a real click and its width typed one step: the settle offers the share-out.
  const last = s.ids[s.ids.length - 1];
  let bar = await until(page, 'document.querySelector(\'[data-share-out-bar]\') ? document.querySelector(\'[data-share-out-bar]\').getAttribute(\'data-share-out-bar\') : null', 3000);
  let how = 'the bar up after the stage';
  if (!bar) {
    await selectUnit(page, last);
    await sectionOpen(page, 'Carcass');
    await typeInto(page, 'document.querySelector(\'[data-unit-size-field="width"]\')', '720');
    bar = await until(page, 'document.querySelector(\'[data-share-out-bar]\') ? document.querySelector(\'[data-share-out-bar]\').getAttribute(\'data-share-out-bar\') : null', 5000);
    how = 'the last BUD selected (a real click), its Width typed 720 in Carcass';
  }
  const btns = await page.ask(`(() => { const b = document.querySelector('[data-share-out-bar]'); if (!b) return null;
    return { buttons: [...b.querySelectorAll('button')].map((x) => ({ go: x.hasAttribute('data-share-out-go'), dismiss: x.hasAttribute('data-share-out-dismiss'), text: x.textContent.replace(/\\s+/g, ' ').trim() })),
      extra: document.querySelectorAll('[data-share-out-extra]').length, each: b.getAttribute('data-share-out-each') }; })()`);
  const action = btns ? btns.buttons.filter((x) => !x.dismiss) : [];
  check('F6', `a run of five with a leftover (${how}): the share-out bar shows ONE button (and the house cross), no data-share-out-extra`,
    Boolean(bar) && action.length === 1 && action[0].go && btns.extra === 0, '1 action button [data-share-out-go], 0 [data-share-out-extra]', j({ leftover: bar, ...btns }));
  await shot(page, 'f11-d-share-out-bar.png');
  const each = btns ? Number(btns.each) : null;
  const depth0 = await histDepth(page);
  const pressed = await pressIf(page, 'document.querySelector(\'[data-share-out-go="1"]\')');
  await page.sleep(1500);
  const after = await page.ask(`${S}.units.filter((u) => u.position.wall === 0).sort((a, b) => a.position.x_mm - b.position.x_mm).map((u) => ({ x: u.position.x_mm, w: u.params.width }))`);
  check('F6', `the button pressed (a real click): the run shared, five cabinets each ${each} (the bar's number), none added, one undo step`,
    pressed && after.length === 5 && after.every((u) => near(u.w, each, 0.6)) && (await histDepth(page)) - depth0 === 1,
    `5 cabinets x ${each}`, j({ after, steps: (await histDepth(page)) - depth0 }));
  const barAfter = await page.has('[data-share-out-bar]');
  check('F6', 'after the share-out the bar is gone (no leftover to offer)', !barAfter, 'no [data-share-out-bar]', String(barAfter));
  await settleCamera(page);
  await shot(page, 'f11-d-shared.png');
}

// === STATION E . THE BAR, THE VIEW POPUP, THE INK IN SETTINGS (F7) ==========
const chainCount = (page) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; let n = 0;
  v.scene.traverse((o) => { if (o.userData && o.userData.ccDimensionChain && o.visible !== false) { let a = o; let vis = true; while (a) { if (a.visible === false) vis = false; a = a.parent; } if (vis) n += 1; } }); return n; })()`);
async function openSettings(page) {
  await page.press('[data-studio="rail-materials"]');
  await pressIf(page, 'document.querySelector(\'[data-studio="popup-item"][data-item="project-finishes"]\')');
  await until(page, 'Boolean(document.querySelector(\'[data-wizard-tab="settings"]\') || document.querySelector(\'[data-settings-dimension-colour]\'))', 6000);
  if (!(await page.has('[data-settings-dimension-colour]'))) await pressIf(page, 'document.querySelector(\'[data-wizard-tab="settings"]\')');
  return Boolean(await until(page, 'Boolean(document.querySelector(\'[data-settings-dimension-colour]\'))', 6000));
}
async function closeModal(page) {
  await key(page, 'Escape');
  await page.sleep(600);
  if (await page.ask(`Boolean(${UI}.modal)`)) await key(page, 'Escape');
}
async function legE(page) {
  await page.ask(`(() => { const st = () => window.__cc.project.getState();
    st().newProject('T86B walk e');
    st().setRoom({ corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }], height: 2500 });
    st().addUnit('BUD', { wall: 0, x: 600 }); st().addUnit('BUD', { wall: 0, x: 1200 });
    try { localStorage.removeItem('cc.dimensionColour'); } catch (e) {}
    return true; })()`);
  note('F7', 'THE STAGE (the store\'s own actions): two BUDs on wall 1; the remembered ink cleared', 'cc.dimensionColour removed');
  await page.sleep(2000);
  const bar = await page.ask('[...document.querySelectorAll(\'[data-studio="scene-toggles"] [data-toggle]\')].map((b) => b.getAttribute(\'data-toggle\'))');
  const barWant = ['dimensions', 'xray', 'hideFronts', 'outlines', 'openAll'];
  check('F7', 'the scene toggles bar: five, Dimensions first', same(bar, barWant), j(barWant), j(bar));
  const c0 = await chainCount(page);
  const p0 = await page.ask('(document.querySelector(\'[data-toggle="dimensions"]\') || { getAttribute: () => null }).getAttribute(\'aria-pressed\')');
  await page.press('[data-toggle="dimensions"]');
  await page.sleep(1500);
  const c1 = await chainCount(page);
  const p1 = await page.ask('(document.querySelector(\'[data-toggle="dimensions"]\') || { getAttribute: () => null }).getAttribute(\'aria-pressed\')');
  await page.press('[data-toggle="dimensions"]');
  await page.sleep(1500);
  const c2 = await chainCount(page);
  check('F7', 'Dimensions on the bar (two real clicks) flips the chains: drawn, then not, then drawn again (or the reverse)',
    p0 !== p1 && ((c0 > 0 && c1 === 0 && c2 > 0) || (c0 === 0 && c1 > 0 && c2 === 0)), 'the chain count flips between >0 and 0, aria-pressed flips', j({ pressed: [p0, p1], chains: [c0, c1, c2] }));
  await settleCamera(page);
  await shot(page, 'f11-e-bar-five.png');
  await page.press('[data-studio="view-menu"]');
  await until(page, 'Boolean(document.querySelector(\'[data-studio="popup"][data-kind="view"]\'))', 4000);
  const items = await page.ask('[...document.querySelectorAll(\'[data-studio="popup"][data-kind="view"] [data-studio="popup-item"]\')].map((b) => b.getAttribute(\'data-item\'))');
  const want = ['frontDimensions', 'props', 'measure', 'contourView', 'brightness', 'realisticLighting', 'light'];
  check('F7', 'the View popup (a real click on View): seven entries, Dimensions and Dimension colour gone', same(items, want), j(want), j(items));
  await shot(page, 'f11-e-view-seven.png');
  await key(page, 'Escape');
  await page.sleep(500);
  if (await page.has('[data-studio="popup"][data-kind="view"]')) await page.press('[data-studio="view-menu"]');
  const def = await page.ask(`${UI}.dimensionColour`);
  const opened = await openSettings(page);
  const node = await page.ask('(() => { const r = document.querySelector(\'[data-settings-dimension-colour]\'); const n = r && r.closest(\'[data-wizard-node]\'); return n ? n.getAttribute(\'data-wizard-node\') : null; })()');
  const opts = await page.ask('[...document.querySelectorAll(\'[data-settings-dimension-colour] [data-dimension-colour-option]\')].map((b) => b.textContent.trim())');
  check('F7', 'Settings (the rail\'s Materials, Project finishes, its Settings tab): ONE "Dimension colour" row in settings.dimensions, Navy / Red',
    opened && node === 'settings.dimensions' && same(opts, ['Navy', 'Red']) && (await page.count('[data-settings-dimension-colour]')) === 1,
    'row in settings.dimensions, [Navy, Red]', j({ opened, node, opts, default: def }));
  await pressIf(page, 'document.querySelector(\'[data-dimension-colour-option="navy"]\')');
  const navy0 = await page.ask(`({ ui: ${UI}.dimensionColour, stored: localStorage.getItem('cc.dimensionColour') })`);
  note('F7', `the house ink before (the profile's default ${def}); Navy pressed first (a real click) so Red is a change`, j(navy0));
  await pressIf(page, 'document.querySelector(\'[data-dimension-colour-option="red"]\')');
  const red = await page.ask(`({ ui: ${UI}.dimensionColour, stored: localStorage.getItem('cc.dimensionColour'), pressed: (document.querySelector('[data-dimension-colour-option="red"]') || { getAttribute: () => null }).getAttribute('aria-checked') })`);
  check('F7', 'Red pressed (a real click): the store\'s ink red, remembered in localStorage cc.dimensionColour',
    red.ui === 'red' && red.stored === 'red' && red.pressed === 'true', 'ui red, stored red, aria-checked true', j(red));
  await shot(page, 'f11-e-settings-red.png');
  await closeModal(page);
  // RELOAD: the page itself, then the editor's door again (the stage, as scripts/t74-harness.mjs pro opens it).
  // The browser's own reload (CDP Page.reload). The project has unsaved changes, so the page asks "leave the site?"
  // (beforeunload); the dialog is answered Leave, as the client answers it.
  const reloading = page.send('Page.reload', {}).catch(() => null);
  let leaveAnswered = false;
  for (let t = 0; t < 8; t += 1) {
    await page.sleep(400);
    try { await page.send('Page.handleJavaScriptDialog', { accept: true }); leaveAnswered = true; break; } catch { /* no dialog (yet) */ }
  }
  await Promise.race([reloading, page.sleep(5000)]);
  note('F7', 'the reload (CDP Page.reload), the beforeunload question answered Leave', String(leaveAnswered));
  await page.sleep(2500);
  await page.waitFor('window.__cc && window.__cc.project && window.__cc.ui', { timeout: 45000 });
  await page.sleep(1500);
  const afterReload = await page.ask(`({ ui: ${UI}.dimensionColour, stored: localStorage.getItem('cc.dimensionColour') })`);
  check('F7', 'reload: still Red (the ink read back from cc.dimensionColour at boot)', afterReload.ui === 'red', 'red', j(afterReload));
  await page.ask(`(() => { if (!(window.__cc.views && window.__cc.views.room)) { window.__cc.project.getState().newProject('T86B walk e2'); const ui = window.__cc.ui.getState(); ui.openEditor(); ui.closeModal(); ui.closeLibrary && ui.closeLibrary(); } return true; })()`);
  await page.waitFor('window.__cc.views && window.__cc.views.room', { timeout: 45000 });
  await page.sleep(2000);
  const reopened = await openSettings(page);
  const redShown = await page.ask('(document.querySelector(\'[data-dimension-colour-option="red"]\') || { getAttribute: () => null }).getAttribute(\'aria-checked\')');
  await pressIf(page, 'document.querySelector(\'[data-dimension-colour-option="navy"]\')');
  const navy = await page.ask(`({ ui: ${UI}.dimensionColour, stored: localStorage.getItem('cc.dimensionColour') })`);
  check('F7', 'after the reload the row shows Red pressed; Navy pressed (a real click) restores the house ink, remembered',
    reopened && redShown === 'true' && navy.ui === 'navy' && navy.stored === 'navy', 'Red aria-checked true; then ui navy, stored navy', j({ redShown, navy }));
  await closeModal(page);
}

// === STATION F . THE TWO CORNERS AFTER THE FIX (F9) =========================
const OWNER = JSON.parse(readFileSync(new URL('../verify/t86b/owner.ccproject', import.meta.url), 'utf8'));
function twoCornersFile() {
  const left = structuredClone(OWNER.units[0]);
  const right = structuredClone(OWNER.units[0]);
  right.id = 'u_t86b_right';
  right.params.corner_side = 'right';
  right.params.unit_num = 'CX02';
  right.position = { ...right.position, x_mm: 4000 - P.room.wallBackClearance - Number(right.params.width) };
  const f = structuredClone(OWNER);
  // The owner's room: a right L built first, then his left one (verify/t86b/corner-diagnosis.md, the case that failed).
  f.units = [right, left];
  const path = join(SCRATCH, 'two-corners.ccproject');
  writeFileSync(path, JSON.stringify(f));
  return { path, units: f.units };
}
function engineBoxes(unit) {
  const r = computeCabinet(paramsForEngine(unit, OWNER.project.design), P);
  return Object.fromEntries(r.panels.map((p) => [p.id, p.box]));
}
/** A drawn box stands in the engine's: through the board exactly, along its faces within one board (probe-f09-scene.mjs). */
function verdict(e, g) {
  const want = { x: [e.x, e.x + e.w], y: [e.y, e.y + e.h], z: [e.z, e.z + e.d] };
  const thin = ['x', 'y', 'z'].reduce((m, a) => ((want[a][1] - want[a][0]) < (want[m][1] - want[m][0]) ? a : m), 'x');
  for (const a of ['x', 'y', 'z']) {
    const [w0, w1] = want[a]; const [g0, g1] = g[a];
    if (a === thin ? (Math.abs(g0 - w0) > 0.6 || Math.abs(g1 - w1) > 0.6)
      : (g0 > w0 + 0.6 || g1 < w1 - 0.6 || g0 < w0 - 18.6 || g1 > w1 + 18.6)) return false;
  }
  return true;
}
async function legF(page) {
  const { path, units } = twoCornersFile();
  await page.send('DOM.enable');
  await page.send('Page.setInterceptFileChooserDialog', { enabled: true });
  const startBtn = await page.has('[data-open-from-file]');
  if (startBtn) await page.press('[data-open-from-file]');
  await page.waitFor('document.querySelector("[data-project-file-input]")', { timeout: 10000 });
  const { root } = await page.send('DOM.getDocument', { depth: 1 });
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-project-file-input]' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [path] });
  const answered = [];
  for (let t = 0; t < 30; t += 1) {
    await page.sleep(500);
    if (await page.has('[data-project-file-choice="replace"]')) { await page.press('[data-project-file-choice="replace"]'); answered.push('replace'); }
    if (await page.has('[data-project-file-choice="keep-settings"]')) { await page.press('[data-project-file-choice="keep-settings"]'); answered.push('keep-settings'); }
    if (await page.ask('Boolean(window.__cc && window.__cc.views && window.__cc.views.room)')) break;
  }
  await page.waitFor('window.__cc && window.__cc.views && window.__cc.views.room', { timeout: 45000 });
  await page.sleep(3000);
  const ids = await page.ask(`${S}.units.map((u) => u.id + ':' + u.params.corner_side)`);
  check('F9', 'the start screen\'s "Open from file" (a real click; the file handed to the app\'s own input): the owner\'s room with a right L built first, then his left L',
    startBtn && same(ids, ['u_t86b_right:right', `${OWNER.units[0].id}:left`]), `[u_t86b_right:right, ${OWNER.units[0].id}:left]`, j({ ids, answered }));
  for (const u of units) {
    const eng = engineBoxes(u);
    const bad = [];
    const rows = [];
    for (const [id, e] of Object.entries(eng)) {
      const g = await localBox(page, u.id, id);
      const ok = g && verdict(e, g);
      rows.push(`${id} ${ok ? 'ok' : 'OFF'}`);
      if (!ok) bad.push({ id, engine: [[e.x, e.x + e.w], [e.y, e.y + e.h], [e.z, e.z + e.d]], drawn: g ? [g.x, g.y, g.z] : null });
    }
    check('F9', `the ${u.params.corner_side} L (${u.id}): every board drawn where the engine put it (localBox in the unit's frame against computeCabinet through paramsForEngine)`,
      bad.length === 0 && rows.length > 0, `${rows.length} / ${rows.length} boards on the engine's boxes`, bad.length ? j(bad) : rows.join(', '));
  }
  // The owner's camera: from the front of the room, high, both corners of wall A (probe-f09-scene.mjs ownerCamera).
  await page.ask('(() => { window.dispatchEvent(new Event("resize")); return true; })()');
  await page.sleep(800);
  await page.ask(`(() => { const v = window.__cc.views.room; const c = v.camera;
    c.position.set(0, 5.0, 4.4); const t = v.controls && v.controls.target;
    if (t) { t.set(0, 0.7, -0.9); v.controls.update(); } else c.lookAt(0, 0.7, -0.9);
    return true; })()`);
  await page.sleep(1200);
  await settleCamera(page);
  await shot(page, 'f11-corners-after.png');
}

// === THE RUN ================================================================
const LEG_TITLES = {
  a: 'A . THE L\'S ARM IS A NEIGHBOUR: A CORNER_L_BASE IN THE LEFT CORNER, A BUD ON ITS CORNER PLUS (F1)',
  b: 'B . THE OWNER\'S RECESS WARDROBE: THE COLUMN STACK\'S ROWS IN THE SECTION, A SHELF OVER THE CAP (F2, F3)',
  c: 'C . THE CHEST IN THE ROOM: VARIANT A, DRAGGED +300, TURNED 90, SPRAYED RAL 3005, OVERHANG 20, VARIANT B (F4, F5, F8)',
  d: 'D . A RUN OF FIVE WITH A LEFTOVER: ONE SHARE-OUT BUTTON (F6)',
  e: 'E . FIVE ON THE BAR, SEVEN IN THE VIEW POPUP, THE INK IN SETTINGS REMEMBERED (F7)',
  f: 'F . THE TWO CORNERS AFTER THE FIX, FROM THE OWNER\'S CAMERA (F9)',
};
const LEG_RUN = {
  a: legA, b: legB, c: legC, d: legD, e: legE, f: legF,
};
for (const n of LEGS) {
  LEG = n;
  push('LEG', 'F11', `STATION ${LEG_TITLES[n]}`);
  let page = null;
  try {
    page = await open({ width: 1440, height: 900 });
    if (n === 'f') {
      await page.showroom(`${BASE}index.html`);
      await page.waitFor('document.querySelector("[data-open-from-file]")', { timeout: 45000 });
    } else {
      await pro(page, { base: BASE });
    }
    await hearSaid(page).catch(() => {});
    if (n === LEGS[0]) note('F11', 'the build under the mouse', `the repo's HEAD ${head}; url ${BASE}`);
    await LEG_RUN[n](page);
  } catch (e) {
    check('F11', `station ${n} to its end`, false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    if (page) await shot(page, `f11-${n}-failure.png`).catch(() => {});
  }
  if (page) {
    const errs = pageErrors(page);
    note('F11', `console errors on the page (station ${n})`, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
    await page.close();
  }
}
await showroomDown();
stopPreview();

const count = (k) => steps.filter((s) => s.kind === k).length;
const [pass, fail] = [count('PASS'), count('FAIL')];
writeFileSync(`${OUT}walk.txt`, ascii([
  'T86B WALK: THE LIST OF EIGHT, A REAL MOUSE THROUGH THE SIX STATIONS (scripts/t86b-walk.mjs)',
  `walked ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, HEAD ${head}, ${BASE}, stations ${LEGS.join(',')}`,
  'Every line: PASS or FAIL (the F, the gesture, what was expected, what was read), NOTE (a reading), FRAME (the file beside this one).',
  'The gestures are real clicks, hovers, drags, keys and typing (CDP); the stages are the store\'s; the numbers expected are the engine\'s and the spec\'s.',
  '',
  ...steps.map((s) => {
    if (s.kind === 'LEG') return `\n${s.gesture}`;
    if (s.kind === 'FRAME') return `FRAME  [${s.leg}] ${s.gesture}`;
    if (s.kind === 'NOTE') return `NOTE   [${s.leg}] ${s.F} ${s.gesture} | ${s.got}`;
    return `${s.kind.padEnd(6)} [${s.leg}] ${s.F} ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
  }),
  '',
  `FRAMES (${frames.length}): ${frames.join(', ')}`,
  `T86B: ${pass + fail} checks, ${pass} pass, ${fail} fail`,
  '',
].join('\n')));
process.stdout.write(`\nT86B: ${pass + fail} checks, ${pass} pass, ${fail} fail; ledger ${OUT}walk.txt; frames ${frames.join(', ')}\n`);
process.exit(fail ? 1 : 0);
