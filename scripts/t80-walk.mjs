/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F12, THE WALK OF THE BRITISH FRAME (CLAUDE.md T80 PART G)
//
// CLAUDE.md T80 F12: "PRO, real mouse: new project, Settings, FRONTS:
// In-frame; a run of BUD 600 (one door) + BUD 800 (pair) + BUDR2 500, end
// panel L, plinth, WUD 600 above; front type sprayed 22 (F&B Card Room Green
// as the mockup, sheen 30); frames verify/t80/f12-01-three-quarter.png,
// f12-02-elevation.png, f12-03-junction-low.png, f12-04-top-filler.png,
// f12-05-wall-unit.png, each from the mockup script's camera so the owner
// compares like with like; f12-06-cnc-frame.png, f12-07-bom.png,
// f12-08-section.png, f12-09-check.png (the project with an 18 mm front
// type: #40 red), f12-10-off.png (the switch back to Lay-on: today's
// picture). Output verify/t80/walk.txt."
//
// THE GESTURES THIS TURN ADDS ARE REAL: the Settings menu and its FRONTS row
// (In-frame, then Lay-on), the canvas toolbar's CNC and BOM and Check, the
// Output menu's Drawing set and its section picker are the browser's own
// input pipe (CDP Input.dispatchMouseEvent / dispatchKeyEvent), aimed at a
// control's centre. THE STAGE is the mockup script's own
// (scripts/chatfix-2110-mockup-inframe-final.mjs): the four cabinets, their
// widths and doors, the end panel, the plinth, the worktop, the front type
// and its colour and sheen are put through the store's own actions, as that
// script put them, so the frames stand over the very kitchen the owner
// approved; the five cameras are that script's numbers (a view, never the
// project). The engine is READ to say what happened (window.__cc). A FAIL is
// written down, never patched.
//
//   npx vite build                       (dist/, from this tree)
//   npx vite preview --port 4173         (in the background)
//   node scripts/t80-walk.mjs            the walk, a new ledger
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t80-walk.mjs   another port
//
// Chromium: scripts/cdp.mjs finds /opt/pw-browsers (or CHROME_PATH); nothing
// is downloaded. Ledger: verify/t80/walk.txt. Frames: verify/t80/f12-*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { open, pro, showroomDown } from './t74-harness.mjs';
import {
  key, clickWith, boxOf, until, choose,
} from './t75-harness.mjs';

const REPO = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../verify/t80/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

// === THE LEDGER =============================================================
const steps = [];
const frames = [];
const ascii = (t) => String(t)
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const check = (gesture, ok, expect, got) => {
  steps.push({ kind: ok ? 'PASS' : 'FAIL', gesture: ascii(gesture), expect: ascii(expect), got: ascii(got) });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${ascii(gesture)} | expect: ${ascii(expect)} | observed: ${ascii(got)}\n`);
  return Boolean(ok);
};
const note = (gesture, got) => {
  steps.push({ kind: 'NOTE', gesture: ascii(gesture), got: ascii(got) });
  process.stdout.write(`NOTE ${ascii(gesture)} | ${ascii(got)}\n`);
};
const j = (v) => JSON.stringify(v);
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const modalNow = (page) => page.ask(`${UI}.modal || null`);
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));

async function shot(page, name, clip = null) {
  await page.sleep(500);
  await page.screenshot(`${SHOTS}${name}`, clip);
  frames.push(name);
  steps.push({ kind: 'FRAME', gesture: name });
  process.stdout.write(`      frame ${name}\n`);
}
/** A DOM element framed, clipped with a margin. */
async function domFrame(page, expr, file, pad = 12, scale = 1.5) {
  const r = await page.ask(`(() => { const el = (${expr}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
  if (!r || r.w < 4) return shot(page, file);
  return shot(page, file, {
    x: Math.max(0, Math.round(r.x - pad)), y: Math.max(0, Math.round(r.y - pad)), width: Math.round(r.w + 2 * pad), height: Math.round(Math.min(r.h + 2 * pad, 900)), scale,
  });
}

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
/** Settings, Settings...: the FRONTS row's button pressed (a real click), the window shut. */
async function frontsRow(page, option) {
  const opened = await menu(page, 'Settings', 'Settings');
  // The window is the stepped settings (5.1 to 5.6); the row stands in 5.3 Fronts, under the Sheen.
  if (!(await page.has('[data-inframe-row="1"]'))) {
    const step = await boxOf(page, '[...document.querySelectorAll(\'[role="dialog"] button, [data-modal-shell] button\')].find((b) => b.offsetParent && /Fronts$/.test(b.textContent.trim()) && /^5\\.3/.test(b.textContent.trim()))');
    if (step) await clickWith(page, step.x, step.y);
    // ...and in its last node (fronts.shine, under the Sheen): the step's own Next, pressed until the row stands.
    for (let i = 0; i < 5 && !(await page.has('[data-inframe-row="1"]')); i += 1) {
      const next = await boxOf(page, '[...document.querySelectorAll(\'[role="dialog"] button, [data-modal-shell] button\')].find((b) => b.offsetParent && /^Next/.test(b.textContent.trim()) && !/Hardware/.test(b.textContent))');
      if (!next) break;
      await clickWith(page, next.x, next.y);
      await page.sleep(500);
    }
  }
  await until(page, 'Boolean(document.querySelector(\'[data-inframe-row="1"]\'))', 6000);
  const row = await page.has('[data-inframe-row="1"]');
  const lit = await page.ask('[...document.querySelectorAll(\'[data-inframe-option]\')].filter((b) => b.getAttribute(\'aria-pressed\') === \'true\').map((b) => b.getAttribute(\'data-inframe-option\'))');
  const hint = await page.text('[data-inframe-hint="1"]');
  const tip = await page.ask('(document.querySelector(\'[data-inframe-hint="1"]\') || { getAttribute: () => null }).getAttribute(\'title\')');
  if (row) await page.press(`[data-inframe-option="${option}"]`);
  await page.sleep(900);
  const after = await page.ask('[...document.querySelectorAll(\'[data-inframe-option]\')].filter((b) => b.getAttribute(\'aria-pressed\') === \'true\').map((b) => b.getAttribute(\'data-inframe-option\'))');
  await closeModals(page);
  return { opened, row, lit, hint, tip, after };
}
/** A canvas toolbar button by its own title or text, a real click at its centre. */
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

// === WHAT THE WALK READS ====================================================
/** The run's frame, the openings, the stile between A and B, the fronts, the WUD's frame: off the engine. */
const engineNow = (page, ids) => page.ask(`(() => { const P = ${S}; const ids = ${j(ids)};
  const r = (id) => P.unitResult(id); const f = (id) => r(id).panels.filter((p) => p.role === 'frame');
  const fronts = (id) => r(id).panels.filter((p) => p.role === 'front').map((p) => ({ id: p.id, w: p.w, h: p.h, t: p.thickness, z: p.box.z, d: p.box.d }));
  const one = (id) => { const x = f(id)[0]; return x ? { id: x.id, w: x.w, h: x.h, t: x.thickness, box: x.box, openings: x.meta.inframe.openings.map((o) => [o.w, o.h]), stiles: x.meta.inframe.stiles, filler: x.meta.inframe.fillerNote || null } : null; };
  const ep = r(ids.a).panels.find((p) => p.role === 'end_panel');
  return { inframe: P.project.design.inframe === true, run: one(ids.a), wud: one(ids.w), members: [ids.b, ids.c].map((id) => f(id).length),
    fronts: { a: fronts(ids.a), b: fronts(ids.b), c: fronts(ids.c), w: fronts(ids.w) },
    endPanel: ep ? { w: ep.w, h: ep.h, box: ep.box } : null,
    worktop: (P.worktopsOf()[0] || {}).geometry ? { y: P.worktopsOf()[0].geometry.y, h: P.worktopsOf()[0].geometry.h, d: P.worktopsOf()[0].geometry.d } : null,
    depth: P.units.find((u) => u.id === ids.a).params.depth };
})()`);

/** The world boxes of the cabinets (the carcass only), as the mockup script read them. */
const worldBoxes = (page, ids) => page.ask(`(() => {
  const v = window.__cc.views.room; const T = v.three; const ids = ${j(ids)};
  const units = {}; for (const id of ids) units[id] = new T.Box3();
  v.scene.traverse((o) => {
    if (!o.isMesh || !o.userData) return;
    let at = o; while (at && at.userData.ccUnitId == null) at = at.parent;
    const uid = at && at.userData.ccUnitId; if (!uid || !units[uid]) return;
    const role = String(o.userData.ccRole || ''); const mr = o.userData.ccMaterialRole;
    if (/end.?panel|worktop|plinth|frame/i.test(role) || /plinth|FRAME/i.test(String(o.userData.ccPanelId || ''))) return;
    if (mr === 'front' || !o.userData.ccPanelId) return;
    units[uid].expandByObject(o);
  });
  const out = {}; for (const id of ids) out[id] = [units[id].min.toArray(), units[id].max.toArray()];
  return out; })()`);
const cam = (page, x, y, z, tx, ty, tz) => page.ask(`(() => { const v = window.__cc.views.room; v.camera.position.set(${x}, ${y}, ${z}); v.controls.target.set(${tx}, ${ty}, ${tz}); v.controls.update(); return true; })()`);

// === THE WALK ===============================================================
const page = await open({ width: 1440, height: 900 });
const P = S;
try {
  await pro(page, { base: BASE });
  note('the build under the mouse', `the repo's HEAD ${head}; url ${BASE}`);

  // --- THE STAGE (the mockup script's own) ---------------------------------
  const add = async (type, x) => page.ask(`(() => { const r = ${P}.addUnit(${j(type)}, { wall: 0, x: ${x} }); return r && r.id; })()`);
  const ids = { a: await add('BUD', 1000), b: await add('BUD', 1600), c: await add('BUDR2', 2400), w: await add('WUD', 1000) };
  await page.sleep(800);
  for (const [id, width] of [[ids.a, 600], [ids.b, 800], [ids.c, 500], [ids.w, 600]]) await page.ask(`${P}.updateUnitParams(${j(id)}, { width: ${width} })`);
  await page.ask(`${P}.setDoors(${j(ids.a)}, { count: 1, hinge: 'L' })`);
  await page.ask(`${P}.setDoors(${j(ids.b)}, { count: 2, hinge: 'L' })`);
  await page.ask(`${P}.setDoors(${j(ids.w)}, { count: 1, hinge: 'L' })`);
  await page.ask(`${P}.addEndPanel(${j(ids.a)}, { side: 'L', thickness: 18 })`);
  await page.ask(`${P}.addPlinth(${j(ids.a)})`);
  const wt = await page.ask(`${P}.addWorktop(${j([ids.a, ids.b, ids.c])})`);
  await page.ask(`${P}.setFrontType('f1', { source: 'spray', material_id: 'generic-22' })`);
  await page.ask(`${P}.setFrontColour({ hex: '#7b8f7a', name: 'F&B Card Room Green', system: 'F&B' }, 'f1')`);
  await page.ask(`${P}.setDesign({ sheen: 30 })`);
  await page.sleep(1200);
  note('THE STAGE (scripts/chatfix-2110-mockup-inframe-final.mjs, through the store\'s own actions)',
    `BUD 600 one door, BUD 800 a pair, BUDR2 500, WUD 600 one door over the BUD 600; END-L 18 on the BUD 600; plinth; worktop ${j(wt && (wt.ok ?? wt))}; front type f1 spray, board generic-22, F&B Card Room Green, sheen 30`);
  const units = await page.ask(`${P}.units.map((u) => [u.type, u.params.unit_num, u.position.x_mm, u.params.width, u.params.height])`);
  note('the units', j(units));
  const off0 = await engineNow(page, ids);
  check('the stage, lay-on (in-frame OFF)', !off0.inframe && !off0.run && !off0.wud, 'no frame, the design lay-on',
    `inframe ${off0.inframe}; frames ${j([off0.run, off0.wud])}; BUD 600 door ${j(off0.fronts.a)}`);

  // --- SETTINGS, FRONTS: IN-FRAME (a real click) ----------------------------
  const on = await frontsRow(page, 'inframe');
  check('Settings > Settings...: the FRONTS row, Lay-on lit', on.row && j(on.lit) === j(['layon']), 'the row present, Lay-on pressed', `row ${on.row}; lit ${j(on.lit)}`);
  check('the hint under it (CLAUDE.md F2\'s words)', on.hint === 'In-frame: one routed frame per run, 38 mm, fronts set in it with 3 mm, hinges on the side.',
    'In-frame: one routed frame per run, 38 mm, fronts set in it with 3 mm, hinges on the side.', `${on.hint}; tooltip ${on.tip}`);
  check('In-frame (British) pressed (a real click)', j(on.after) === j(['inframe']), 'In-frame lit', `lit ${j(on.after)}`);
  await until(page, `${P}.project.design.inframe === true`, 4000);
  const E = await engineNow(page, ids);
  note('the engine under in-frame', j({ run: E.run && { w: E.run.w, h: E.run.h, openings: E.run.openings, stiles: E.run.stiles }, wud: E.wud && { w: E.wud.w, h: E.wud.h }, fronts: E.fronts }));
  check('the run\'s frame (BUD 600 + 800 + 500 + END-L 18 + 1: the width the run reports)', E.run && E.run.w === 1920 && E.run.h === 808 && E.run.t === 25,
    '1920 x 808, 25 thick', E.run ? `${E.run.w} x ${E.run.h}, ${E.run.t} thick, at ${j(E.run.box)}` : 'no frame');
  check('one board for the run: the members carry none', j(E.members) === j([0, 0]), 'BUD 800 and BUDR2 500 carry no frame of their own', j(E.members));
  check('the stile between A and B', E.run && E.run.stiles[1] === 38, '38', E.run ? j(E.run.stiles) : 'none');
  check('the openings', E.run && j(E.run.openings) === j([[562, 732], [762, 732], [462, 732]]), '562 x 732 / 762 x 732 / 462 x 732', E.run ? j(E.run.openings) : 'none');
  const doorA = E.fronts.a[0]; const pair = E.fronts.b;
  check('the doors', doorA && doorA.w === 556 && doorA.h === 726 && pair.length === 2 && pair.every((d) => d.w === 376.5 && d.h === 726),
    '556 x 726 and two of 376.5 x 726', `${j(E.fronts.a.map((d) => [d.w, d.h]))} ${j(pair.map((d) => [d.w, d.h]))}`);
  check('the fronts 22, their face on the frame\'s face, 3 of air behind', [...E.fronts.a, ...E.fronts.b, ...E.fronts.c].every((d) => d.t === 22 && d.z === E.depth + 3 && d.z + d.d === E.depth + 25),
    `t 22, z ${E.depth} + 3, face ${E.depth} + 25`, j([...E.fronts.a, ...E.fronts.b, ...E.fronts.c].map((d) => [d.id, d.t, d.z, d.d])));
  check('the WUD\'s frame', E.wud && E.wud.w === 602 && E.wud.h === 758, '602 x 758', E.wud ? `${E.wud.w} x ${E.wud.h}` : 'none');
  check('the filler, a note on the run', E.run && E.run.filler === 'Site filler 19 mm x 1900 under the worktop (joiner, not supplied)',
    'Site filler 19 mm x 1900 under the worktop (joiner, not supplied)', E.run ? String(E.run.filler) : 'none');
  check('the worktop on the frame (19 higher than lay-on)', E.worktop && off0.worktop && Math.abs(E.worktop.y - off0.worktop.y - 19) < 0.01,
    `lay-on y + 19 (${off0.worktop && off0.worktop.y} + 19)`, j({ layon: off0.worktop, inframe: E.worktop }));
  check('the end panel to the frame: its face on the frame\'s face (D + 25), 19 taller', E.endPanel && off0.endPanel && Math.abs(E.endPanel.box.z + E.endPanel.box.d - (E.depth + 25)) < 0.01 && Math.abs(E.endPanel.h - off0.endPanel.h - 19) < 0.01,
    `face at ${E.depth} + 25, height lay-on + 19`, j({ layon: off0.endPanel && { face: off0.endPanel.box.z + off0.endPanel.box.d, h: off0.endPanel.h }, inframe: E.endPanel && { face: E.endPanel.box.z + E.endPanel.box.d, h: E.endPanel.h } }));

  // --- THE FIVE FRAMES, FROM THE MOCKUP SCRIPT'S CAMERA ---------------------
  await key(page, 'Escape');
  await page.ask(`(() => { const u = ${UI}; if (u.selectUnit) u.selectUnit(null); if (u.closeRightPanel) u.closeRightPanel(); return true; })()`);
  await page.sleep(1500);
  const frameMesh = await page.ask(`(() => { const v = window.__cc.views.room; let n = 0; let holes = null; v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId === 'FRAME') { n += 1; holes = o.geometry && o.geometry.attributes && o.geometry.attributes.position ? o.geometry.attributes.position.count : null; } }); return { n, holes }; })()`);
  check('the frame in 3D: ONE mesh (the board, its openings cut)', frameMesh.n >= 1, 'a FRAME mesh in the room', j(frameMesh));
  const G = await worldBoxes(page, [ids.a, ids.b, ids.c, ids.w]);
  const base = G[ids.a]; const last = G[ids.c]; const wall = G[ids.w];
  const x0 = base[0][0]; const x1 = last[1][0]; const zF = base[1][2]; const cx = (x0 + x1) / 2;
  await cam(page, cx + 1.6, 1.5, zF + 2.9, cx, 1.0, zF); await page.sleep(1200);
  await shot(page, 'f12-01-three-quarter.png');
  await cam(page, cx, 1.1, zF + 3.2, cx, 1.1, zF); await page.sleep(1200);
  await shot(page, 'f12-02-elevation.png');
  const xj = base[1][0];
  await cam(page, xj + 0.7, 0.5, zF + 1.5, xj, 0.3, zF); await page.sleep(1200);
  await shot(page, 'f12-03-junction-low.png');
  const yt = base[1][1];
  await cam(page, x1 + 0.55, yt + 0.25, zF + 0.45, x1, yt - 0.02, zF - 0.15); await page.sleep(1200);
  await shot(page, 'f12-04-top-filler.png');
  const wc = (wall[0][0] + wall[1][0]) / 2;
  await cam(page, wc + 0.9, wall[0][1] - 0.2, zF + 1.6, wc, (wall[0][1] + wall[1][1]) / 2, zF); await page.sleep(1200);
  await shot(page, 'f12-05-wall-unit.png');

  // --- THE CNC VIEW (a real click on the toolbar's CNC) ---------------------
  const cnc = await viewMode(page, 'cnc');
  await until(page, 'Boolean(document.querySelector(\'[data-cnc-part="FRAME"]\'))', 6000);
  const part = await page.ask(`(() => { const g = document.querySelector('[data-cnc-part="FRAME"]'); if (!g) return null;
    const label = document.querySelector('[data-part-label="FRAME"]'); const arrow = document.querySelector('[data-edge-arrow="FRAME"]');
    return { label: label ? label.textContent.replace(/\\s+/g, ' ').trim() : null, arrow: arrow ? arrow.getAttribute('data-edge-side') : null, note: (document.querySelector('[data-part-note="FRAME"]') || {}).textContent || null }; })()`);
  check('CNC (the toolbar\'s own button): the FRAME on the sheet, its label, its EDGE arrow', cnc && part && /FRAME/.test(part.label || '') && part.arrow === 'down',
    'the FRAME part, labelled, the arrow down (the bottom rail)', j(part));
  await domFrame(page, 'document.querySelector(\'[data-cnc-part="FRAME"]\')', 'f12-06-cnc-frame.png', 30, 3);
  await viewMode(page, '3d');

  // --- THE BOM (a real click on the toolbar's BOM) ---------------------------
  await toolbar(page, '[...document.querySelectorAll(\'button[title="Bill of materials"]\')].find((b) => b.offsetParent)');
  await until(page, `${UI}.bomOpen === true`, 5000);
  await page.sleep(1200);
  const bom = await page.ask('(() => { const t = document.body.innerText || \'\'; return { frame: /In-frame frames|FRAME/.test(t), note: (t.match(/Site filler 19 mm x \\d+ under the worktop \\(joiner, not supplied\\)/) || [null])[0] }; })()');
  check('BOM: the frame\'s line and the filler note', bom.frame && Boolean(bom.note), 'In-frame frames listed; the note', j(bom));
  const bomEl = 'document.querySelector(\'[data-bom-panel]\') || [...document.querySelectorAll(\'aside\')].find((a) => /Bill of materials|BOM/.test(a.textContent))';
  await domFrame(page, bomEl, 'f12-07-bom.png', 4, 1);
  // Shut by the panel's own x (the toolbar's BOM button stands under the open panel).
  await toolbar(page, `(() => { const a = [...document.querySelectorAll('aside, div')].find((x) => x.offsetParent && /BILL OF MATERIALS/i.test((x.firstElementChild || x).textContent || '') && x.getBoundingClientRect().width > 300 && x.getBoundingClientRect().width < 800);
    return a ? [...a.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim() === '\u00d7') : null; })()`);
  await until(page, `${UI}.bomOpen !== true`, 4000);
  check('the BOM shut by its own x', await page.ask(`${UI}.bomOpen !== true`), 'the panel gone', String(await page.ask(`${UI}.bomOpen`)));

  // --- THE SECTION (Output > Drawings > Drawing set (PDF), the section through 01) ---
  // Output > Drawings > Preview... opens the drawing window ('Drawing set (PDF)' saves the file at once); its
  // walls tab is the set on the glass, with its own "One more section through" picker.
  const opened = await menu(page, 'Output', 'Drawings');
  if (opened) {
    await page.press('[role="menuitem"]', 'Preview');
    await page.sleep(1500);
  }
  if (await page.has('[data-drawing-kind-tab="walls"]')) await page.press('[data-drawing-kind-tab="walls"]');
  await until(page, 'Boolean(document.querySelector(\'[data-section-aa="1"]\'))', 8000);
  const num01 = await page.ask(`${P}.units.find((u) => u.id === ${j(ids.a)}).params.unit_num`);
  const picked = await choose(page, 'document.querySelector(\'[data-section-aa="1"]\')', ids.a);
  note('One more section through: 01 (the native select, a real click, the arrows, Enter)', j({ ok: picked.ok, label: picked.label, after: picked.after && picked.after.value, num01 }));
  await page.sleep(2000);
  // Walk the sheets to the one carrying the timber.
  let timber = false;
  const sheets = await page.ask('[...document.querySelectorAll(\'[data-wall-sheet]\')].map((b) => b.getAttribute(\'data-wall-sheet\'))');
  for (const name of [...sheets].reverse()) {
    await page.press(`[data-wall-sheet="${name}"]`);
    await page.sleep(1200);
    timber = await page.ask('[...document.querySelectorAll(\'svg text\')].some((t) => /site filler 19 \\(timber\\)/.test(t.textContent))');
    if (timber) { note('the sheet with the section', name); break; }
  }
  check('the section: a piece of timber over the carcass, named "site filler 19 (timber)"', timber, 'the label on the sheet', `${timber}; sheets ${j(sheets)}`);
  // The station through 01, clipped round the timber's own label and drawn up (the sheet is an A3 on the glass).
  const at = await page.ask(`(() => { const t = [...document.querySelectorAll('svg text')].find((x) => /site filler 19 \\(timber\\)/.test(x.textContent));
    if (!t) return null; const b = t.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  if (at) {
    await shot(page, 'f12-08-section.png', {
      x: Math.max(0, Math.round(at.x - 130)), y: Math.max(0, Math.round(at.y - 60)), width: 200, height: 170, scale: 4,
    });
  } else await shot(page, 'f12-08-section.png');
  await closeModals(page);

  // --- #40 RED: THE FRONT TYPE BACK TO 18 (the stage), THE CHECK (a real click) ---
  await page.ask(`${P}.setFrontType('f1', { material_id: null })`);
  await page.sleep(1200);
  const findings = await checkOpen(page);
  const red40 = findings.find((f) => f.n === 40);
  check('Check: #40 red, in CLAUDE.md\'s words', red40 && red40.level === 'red' && /In-frame fronts are 22 mm: front type f1 is 18 mm\. Change the front material or switch back to lay-on\./.test(red40.text),
    '#40 red: In-frame fronts are 22 mm: front type f1 is 18 mm. Change the front material or switch back to lay-on.', j(red40 || findings.slice(0, 3)));
  const left = await page.ask('[...document.querySelectorAll(\'[data-inframe-check]\')].map((b) => b.getAttribute(\'data-inframe-check\') + \' \' + b.getAttribute(\'data-check-level\'))');
  check('the same in the left column (InframeWarnings)', left.includes('40 red'), '40 red', j(left));
  await cam(page, cx, 1.1, zF + 3.2, cx, 1.1, zF); await page.sleep(1200);
  await shot(page, 'f12-09-check.png');
  await checkClose(page);
  await page.ask(`${P}.setFrontType('f1', { material_id: 'generic-22' })`);
  await page.sleep(800);

  // --- THE SWITCH BACK: LAY-ON (a real click) --------------------------------
  const back = await frontsRow(page, 'layon');
  check('Settings: Lay-on pressed', j(back.after) === j(['layon']), 'Lay-on lit', j(back.after));
  await until(page, `${P}.project.design.inframe !== true`, 4000);
  const off = await engineNow(page, ids);
  check('in-frame OFF is today: no frame, the lay-on doors', !off.run && !off.wud && j(off.fronts) === j(off0.fronts),
    'no frame; every front as before the switch', j({ run: off.run, fronts: off.fronts.a }));
  check('the worktop and the end panel back where they were', j(off.worktop) === j(off0.worktop) && j(off.endPanel) === j(off0.endPanel),
    j({ worktop: off0.worktop, endPanel: off0.endPanel && off0.endPanel.box }), j({ worktop: off.worktop, endPanel: off.endPanel && off.endPanel.box }));
  await key(page, 'Escape');
  await page.ask(`(() => { const u = ${UI}; if (u.closeRightPanel) u.closeRightPanel(); return true; })()`);
  await cam(page, cx + 1.6, 1.5, zF + 2.9, cx, 1.0, zF); await page.sleep(1200);
  await shot(page, 'f12-10-off.png');
} catch (e) {
  check('the walk to its end', false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
  await shot(page, 'f12-walk-failure.png').catch(() => {});
}
const errs = pageErrors(page);
note('console errors on the page', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
await page.close();
await showroomDown();

const pass = steps.filter((s) => s.kind === 'PASS').length;
const fail = steps.filter((s) => s.kind === 'FAIL').length;
writeFileSync(`${SHOTS}walk.txt`, ascii([
  'T80 WALK: THE BRITISH FRAME, ONE BOARD PER RUN (scripts/t80-walk.mjs)',
  `walked ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, HEAD ${head}, ${BASE}`,
  'Every line: PASS or FAIL (the gesture, what was expected, what was read), NOTE (a reading), FRAME (the file beside this one).',
  'The gestures this turn adds are real clicks; the stage is the mockup script\'s own, through the store; the cameras are its numbers.',
  '',
  ...steps.map((s) => {
    if (s.kind === 'FRAME') return `FRAME  ${s.gesture}`;
    if (s.kind === 'NOTE') return `NOTE   ${s.gesture} | ${s.got}`;
    return `${s.kind}   ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
  }),
  '',
  `FRAMES (${frames.length}): ${frames.join(', ')}`,
  `T80: ${pass + fail} steps, ${pass} pass, ${fail} fail`,
  '',
].join('\n')));
process.stdout.write(`\nT80: ${pass + fail} steps, ${pass} pass, ${fail} fail; frames ${frames.join(', ')}\n`);
process.exit(fail ? 1 : 0);
