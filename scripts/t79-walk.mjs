/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79, THE ACCEPTANCE WALK OF THE OWNER'S LIST OF 18.10 (CLAUDE.md T79 F1 to F18)
//
// CLAUDE.md T79 TESTS AND PROOF: "scripts/t79-walk.mjs, REAL mouse, PRO and
// retail where retail is named, frames verify/t79/fNN-*.png, output
// verify/t79/walk.txt". Every F's "Walk:" line is a section here; F13, F15 and
// F17 name no walk (their proof is the suite), so they have none.
//
// Every gesture is the browser's own input pipe (CDP Input.dispatchMouseEvent
// / Input.dispatchKeyEvent / Input.insertText), aimed at a DOM control's
// centre or at a pixel where the scene's own raycaster says the thing is the
// nearest drawn object and the page says the canvas owns the pixel (T74's
// pointOn, T75's reachFree, helperAt). A native select is driven as T75's
// harness drives one (a real click, the arrows, Enter). The store is READ to
// say what happened (window.__cc.project.getState(), window.__cc.ui.getState(),
// window.__cc.views.room.three); it is never written to make something
// happen. The ONE exception is T74's pro(): a new project and the editor's own
// door through the store, as every walk since scripts/e2e-turn18.mjs. A FAIL
// is written down, never patched.
//
// THE SCAFFOLDING (written 18.10 while F1 to F18 were being built in other
// trees). Each section is ONE function on ONE page: the STAGE (everything that
// exists today, real clicks) and then a block marked `// T79 ACTION:` that
// names the new control by the data-* hook it is expected to carry, the
// gesture, and the state and frames that prove it. Until the F lands the
// action writes a TODO line into the ledger (never a PASS, never a FAIL);
// `--act` runs the action code that is already written (the gestures that
// exist today with the T79 expectation), so after integration a section is
// finished by checking the hook name and passing --act. F7 is a CHECK of code
// already on main, so its section is COMPLETE and always runs to its verdict.
//
// THE ACTIONS (written 18.10 against the integrated tree, F1 to F18 less F17,
// skipped whole). Every section's action is written with the control the F
// really added (data-message-history-toggle / -list / -row, data-above-divider
// in the Add items WINDOW the inner plus opens, the only Add items that draws
// the hover slab, data-drawer-columns, data-testid notch-help, cut-edge,
// edge-notch-ask and the ccNotchEdge handles, data-centre-between and its
// -step, data-restore-sleeve-rows, the two Output entries, the retail
// size-wall-gap field) and is run with --act; the store is still only read.
// F8's refusal is Check #36 (CLAUDE.md said #32, which T76 F4 holds).
//
// Sections (one page each, so any one can be rerun alone):
//   f01  PRO   a wardrobe, a shelf added (it says nothing), overlay drawers
//              added: the grey message and where it stands; Output, Cutting
//              list CSV: the red and yellow that stay, framed;
//              T79: bottom-left column, the history bar, its list
//   f02  PRO   a 1200 wardrobe, a FIX shelf at 1000, a divider under it, Add
//              items on Shelves (Bay 1 / Bay 2); T79: the third button
//   f03  PRO   a 1200 wardrobe, Add items on Drawers, Bare boxes, 3;
//              T79: COLUMNS 2, the divider and the one cap by themselves
//   f04  PRO   a BUD 600, CUT CORNER, the lit BL corner, the notch window;
//              T79: HEIGHT -300, the help line, the top-anchored cut
//   f05  PRO   a BUD 600, CUT CORNER row and the notch window;
//              T79: CUT EDGE, the edge window, BB and TB
//   f06  PRO   a BUD 600, the notch window (BL 200 x 200 full);
//              T79: Enter, the BACK's dia 3 rows 14 again, the CNC frame
//   f07  PRO   a BUD 600, notch BL 200 x 200 full, then the same corner 300
//              high, Output > CNC / DXF each time: on CORNER_4MM one open
//              3-vertex polyline per inner corner, no closed shape, ACI 53
//              (the 1710h law). COMPLETE.
//   f08  PRO   a recess band over x 310..600 of a BUD 600, the notch window;
//              T79: BL cut, the extension stands beside it; the band moved
//              over the notch: refused, Check #36 visible
//   f09  PRO   a BUD 600 with END-R, a recess band to its right edge;
//              T79: END-R's outline follows BUR's, the 3D frame
//   f10  RETAIL a wardrobe wholly in a 300 recess, SIZE on FROM THE WALL;
//              T79: 100 / 300 / 350, the recess shrinks then goes, 3 frames
//   f11  PRO   a wardrobe, a shelf, a rail alone; T79: the toggle gone, the
//              rail dragged toward the shelf snaps 50 under it (the guide);
//              with Alt held it does not
//   f12  PRO   a wardrobe, a FIX shelf at 600, three shelves above it, one
//              selected (Center all on the screen); T79: Center between,
//              Escape, BOTTOM + TOP refused, FIX + TOP centred
//   f14  PRO   a BUDR x3 in the CNC view; T79: the box pockets on BOX-FRONT
//              and BOX-BACK, the part detail of BOX-BACK (right click,
//              Edit cabinet..., Explode, a double click in the editor)
//   f16  PRO   a BUD whose shelf's +50 row meets a hinge cup, Check #1's
//              Remove the +50 mm sleeve row clicked; T79: Restore sleeve rows
//   f18  PRO   the Output menu open; T79: the two Part labels entries, each
//              clicked, the PDF saved and its pages counted
//
//   npx vite build                               (dist/, from this tree)
//   npx vite preview --port 4173                 (in the background)
//   node scripts/t79-walk.mjs --fresh            every section, a new ledger
//   node scripts/t79-walk.mjs f07 f10            those sections (a rerun replaces their blocks)
//   node scripts/t79-walk.mjs --act f06          run the written T79 action too
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t79-walk.mjs ...   another port
//   E2E_DIST=<dist>/ ...                         the dist/ the preview serves (sourcemaps)
//
// Chromium: scripts/cdp.mjs finds /opt/pw-browsers/chromium-1194 (or
// CHROME_PATH); nothing is downloaded. Ledger: verify/t79/walk.txt. Frames:
// verify/t79/fNN-*.png (fNN-stage.png is the stage of a section).
// Everything this file writes is plain ASCII (CLAUDE.md LAWS: no em or en
// dash); a sentence the app says with a dash is written with the dash escaped.

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import JSZip from 'jszip';
import {
  open, pro, unitsNow, showroomDown, settleCamera, FIND,
} from './t74-harness.mjs';
import {
  key, clickWith, boxOf, until,
} from './t75-harness.mjs';
import { dxfFileName } from '../src/engine/cnc/dxf.js';

const REPO = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../verify/t79/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const DIST = process.env.E2E_DIST || `${REPO}dist/`;
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

const ORDER = ['f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07', 'f08', 'f09', 'f10', 'f11', 'f12', 'f14', 'f16', 'f18'];
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const unknown = want.filter((w) => !ORDER.includes(w));
if (unknown.length) {
  process.stdout.write(`unknown section(s): ${unknown.join(', ')}; the sections are ${ORDER.join(' ')}\n`);
  process.exit(2);
}
const runs = (name) => want.length === 0 || want.includes(name);
const ACT = process.argv.includes('--act');

// === THE LEDGER'S HANDS =====================================================
// Every line: the gesture, what was expected, what was observed, PASS or FAIL;
// a NOTE is a reading; a TODO is a T79 action not walked yet (its hook, the
// gesture, what proves it).
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
  return Boolean(ok);
};
const note = (gesture, got) => {
  steps.push({
    section: current, gesture: ascii(gesture), note: true, got: ascii(got),
  });
  process.stdout.write(`NOTE ${ascii(gesture)} | ${ascii(got)}\n`);
};
const todo = (gesture, proves) => {
  steps.push({
    section: current, gesture: ascii(gesture), todo: true, got: ascii(proves),
  });
  process.stdout.write(`TODO ${ascii(gesture)} | proves: ${ascii(proves)}\n`);
};
const begin = (name, title) => {
  current = name;
  steps.push({ section: name, header: title, at: new Date().toISOString().slice(0, 16).replace('T', ' ') });
  process.stdout.write(`\n=== ${name.toUpperCase()} ${title} ===\n`);
};
const shot = async (page, name, clip = null) => {
  await settleCamera(page).catch(() => {});
  await page.screenshot(`${SHOTS}${name}`, clip);
  frames.push(name);
  steps.push({ section: current, frame: name });
  process.stdout.write(`      frame ${name}\n`);
  return name;
};
/** A frame at once, the camera not waited for (a grey message lives greyMs, 3000). */
const shotNow = async (page, name, clip = null) => {
  await page.screenshot(`${SHOTS}${name}`, clip);
  frames.push(name);
  steps.push({ section: current, frame: name });
  process.stdout.write(`      frame ${name}\n`);
  return name;
};
const j = (v) => JSON.stringify(v);
const r1 = (v) => (v == null ? null : Math.round(Number(v) * 10) / 10);
const near = (a, b, tol = 1) => Math.abs(Number(a) - Number(b)) <= tol;
const how = (sel) => (sel && sel.already ? 'already selected' : (sel && sel.by ? `by ${sel.by}` : 'NOT selected'));
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));

/**
 * THE T79 ACTION GATE. `hook` is the selector the new control is expected to
 * carry (null for an F with no control of its own, whose action is a gesture
 * that exists today); `act` is the written action, or null where it is still
 * to be written. Without --act the action runs only when its hook is on the
 * page; otherwise one TODO line says what to click and what proves it.
 */
async function t79Action(page, { hook = null, gesture, proves, act = null }) {
  const present = hook ? await page.has(hook) : false;
  if (act && (ACT || present)) {
    note('T79 ACTION', `${gesture} (${present ? `hook ${hook} on the page` : '--act'})`);
    await act();
    return true;
  }
  todo(`T79 ACTION: ${gesture}`, `${proves}${hook ? ` [hook ${hook} ${present ? 'IS on the page: write or run the action' : 'not on the page yet'}]` : ' [no hook: run with --act after integration]'}`);
  return false;
}

// === THE SCENE HANDS, RAYCAST-SAFE (T74's pointOn, T75's reachFree, orbitFree, helperAt) ===
//
// MEASURED 18.10 (f08's first run): with a recess in the room, every ray the
// T74 / T75 hands cast through the whole scene died with "TypeError:
// r.raycast is not a function". 3d/Room.jsx draws the alcove (and a chimney)
// with `raycast={null}` so the pointer passes through them, and three's
// Raycaster.intersectObjects calls `object.raycast` on every descendant. The
// app never casts through the whole scene (react-three-fiber casts only at
// the objects with handlers), so nothing a client does breaks; only the
// walk's finder did. So the finder here is T74's FIND and T75's EMPTY,
// helperAt and reachFree, word for word, with ONE change: the ray visits the
// tree itself and skips an object whose raycast is not a function (three's
// own order: layers, raycast, the children, sorted by distance). Nothing in
// the page is changed; the helper rides window.__walkHit.
const HIT = `(window.__walkHit = window.__walkHit || function (ray, roots) { const out = [];
  const visit = (o) => { if (typeof o.raycast === 'function' && (!o.layers || o.layers.test(ray.layers))) { try { o.raycast(ray, out); } catch (e) { /* not pickable */ } }
    for (const c of (o.children || [])) visit(c); };
  for (const r of roots) visit(r); out.sort((a, b) => a.distance - b.distance); return out; })`;
const FIND_SAFE = FIND.split('ray.intersectObjects(v.scene.children, true)').join('window.__walkHit(ray, v.scene.children)');
if (FIND_SAFE === FIND) throw new Error('t74-harness FIND changed: the raycast-safe finder could not be derived');
const pointOn = (page, unitId, panelId, opts = {}) => page.ask(`(${HIT}, ${FIND_SAFE}(${j(unitId)}, ${j(panelId)}, ${j(opts)}))`);
/** A pixel of the canvas with no cabinet under it (T75's EMPTY). */
const EMPTY = `(() => { ${HIT}; const v = window.__cc.views.room; const T = v.three; const c = v.gl.domElement;
  const r = c.getBoundingClientRect(); const ray = new T.Raycaster();
  for (const fy of [0.85, 0.92, 0.75, 0.3, 0.2]) for (const fx of [0.5, 0.35, 0.65, 0.2, 0.8]) {
    const px = Math.round(r.left + fx * r.width); const py = Math.round(r.top + fy * r.height);
    const el = document.elementFromPoint(px, py); if (!(el === c || (el && c.contains(el)))) continue;
    ray.setFromCamera(new T.Vector2(fx * 2 - 1, -(fy * 2 - 1)), v.camera);
    const hit = window.__walkHit(ray, v.scene.children).find((h) => h.object.isMesh && h.object.visible);
    let unit = false; for (let a = hit && hit.object; a; a = a.parent) { if (a.userData && a.userData.ccUnitId) unit = true; }
    if (!unit) return { x: px, y: py };
  }
  return null; })()`;
/** Of a piece's pixels, the one nearest their middle that the CANVAS owns in the page (T75's FREE). */
const FREE = `(function (points) {
  const v = window.__cc.views.room; const c = v.gl.domElement;
  const own = points.filter((p) => { const el = document.elementFromPoint(p.x, p.y); return el === c || (el && c.contains(el)); });
  if (!own.length) return null;
  const cx = own.reduce((s, p) => s + p.x, 0) / own.length; const cy = own.reduce((s, p) => s + p.y, 0) / own.length;
  own.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  return { x: own[0].x, y: own[0].y, n: own.length };
})`;
/** The camera turned by a REAL drag on empty floor or wall. */
async function orbitFree(page, dx, dy = 0) {
  const at = await page.ask(EMPTY);
  if (!at) return false;
  await page.dragFromTo(at.x, at.y, at.x + dx, at.y + dy, { steps: 20 });
  await page.sleep(900);
  await settleCamera(page);
  return true;
}
/** A piece's clickable pixel from some camera a client would use, on a pixel the canvas owns. */
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
/**
 * SEVERAL pieces' clickable pixels from ONE camera (a two-pick gesture must not
 * turn the camera between its picks): the camera turned by real drags until
 * every piece named has a pixel the canvas owns.
 */
async function reachMany(page, unitId, panelIds) {
  await settleCamera(page);
  for (const [dx, dy] of [[0, 0], [0, 120], [120, 0], [-240, 0], [0, -200], [260, 0]]) {
    if (dx || dy) await orbitFree(page, dx, dy);
    const out = {};
    for (const id of panelIds) {
      const all = await pointOn(page, unitId, id, { all: true, grid: 40 });
      const at = all && all.points && all.points.length ? await page.ask(`${FREE}(${JSON.stringify(all.points)})`) : null;
      if (!at) break;
      out[id] = at;
    }
    if (Object.keys(out).length === panelIds.length) return out;
  }
  return null;
}
/** The cabinet editor's own scene (window.__cc.views.editor): T74's finder and T75's FREE, pointed at it. */
const FIND_EDITOR = FIND_SAFE.split('window.__cc.views.room').join('window.__cc.views.editor');
const FREE_EDITOR = FREE.split('window.__cc.views.room').join('window.__cc.views.editor');
if (FIND_EDITOR === FIND_SAFE || FREE_EDITOR === FREE) throw new Error('the editor finder could not be derived');
async function reachInEditor(page, panelId) {
  for (let t = 0; t < 5; t += 1) {
    const all = await page.ask(`(${HIT}, ${FIND_EDITOR}(null, ${j(panelId)}, { all: true, grid: 48 }))`);
    const at = all && all.points && all.points.length ? await page.ask(`${FREE_EDITOR}(${JSON.stringify(all.points)})`) : null;
    if (at) return at;
    // The editor's camera turned by a real drag that starts on its empty background (a corner of its canvas).
    const c = await page.ask('(() => { const v = window.__cc.views && window.__cc.views.editor; if (!v) return null; const r = v.gl.domElement.getBoundingClientRect(); return { x: Math.round(r.left + 24), y: Math.round(r.top + r.height - 24) }; })()');
    if (!c) return null;
    await page.dragFromTo(c.x, c.y, c.x + [140, -280, 140, 0, 200][t], c.y + [0, 0, -120, 160, 0][t], { steps: 18 });
    await page.sleep(900);
  }
  return null;
}
/** A pixel where the scene's raycaster meets a HELPER first (a lit notch corner), found by its userData (T75's helperAt). */
const helperAt = (page, match) => page.ask(`(() => { ${HIT};
  const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  const want = (u) => { try { return (${match})(u); } catch (e) { return false; } };
  const targets = []; v.scene.traverse((o) => { if (o.userData && want(o.userData) && o.visible !== false) targets.push(o); });
  if (!targets.length) return null;
  const r = v.gl.domElement.getBoundingClientRect(); const ray = new T.Raycaster();
  const out = [];
  for (const t of targets) {
    t.updateMatrixWorld(true);
    const c = new T.Vector3().setFromMatrixPosition(t.matrixWorld).project(v.camera);
    if (c.z > 1 || c.x < -1 || c.x > 1 || c.y < -1 || c.y > 1) continue;
    const px = { x: Math.round(r.left + (c.x * 0.5 + 0.5) * r.width), y: Math.round(r.top + (-c.y * 0.5 + 0.5) * r.height) };
    ray.setFromCamera(new T.Vector2(((px.x - r.left) / r.width) * 2 - 1, -(((px.y - r.top) / r.height) * 2 - 1)), v.camera);
    const hits = window.__walkHit(ray, v.scene.children).filter((h) => h.object.visible !== false && (h.object.isMesh || h.object.isSprite));
    const mine = hits.find((h) => h.object === t);
    if (!mine) continue;
    out.push({ x: px.x, y: px.y, first: hits[0].object === t, data: JSON.stringify(t.userData) });
  }
  return out;
})()`);

/** helperAt, the targets restricted to ONE cabinet's own group (the inner plus: every plus wears ccAddPlus). */
const helperInUnit = (page, unitId, match) => page.ask(`(() => { ${HIT};
  const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  const want = (u) => { try { return (${match})(u); } catch (e) { return false; } };
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; const targets = []; unit.traverse((o) => { if (o.userData && want(o.userData) && o.visible !== false) targets.push(o); });
  const r = v.gl.domElement.getBoundingClientRect(); const ray = new T.Raycaster(); const out = [];
  for (const t of targets) {
    t.updateMatrixWorld(true);
    const c = new T.Vector3().setFromMatrixPosition(t.matrixWorld).project(v.camera);
    if (c.z > 1 || c.x < -1 || c.x > 1 || c.y < -1 || c.y > 1) continue;
    const px = { x: Math.round(r.left + (c.x * 0.5 + 0.5) * r.width), y: Math.round(r.top + (-c.y * 0.5 + 0.5) * r.height) };
    ray.setFromCamera(new T.Vector2(((px.x - r.left) / r.width) * 2 - 1, -(((px.y - r.top) / r.height) * 2 - 1)), v.camera);
    const hits = window.__walkHit(ray, v.scene.children).filter((h) => h.object.visible !== false && (h.object.isMesh || h.object.isSprite));
    const el = document.elementFromPoint(px.x, px.y); const own = el === v.gl.domElement || (el && v.gl.domElement.contains(el));
    if (!hits.find((h) => h.object === t)) continue;
    out.push({ x: px.x, y: px.y, first: hits[0].object === t && own });
  }
  return out;
})()`);

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
/** A section's end by exception: a dead scene is said as such; anything else is the stack's first lines. */
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
const stamp = (page) => page.ask('(document.querySelector(\'[data-build-stamp]\') || {}).getAttribute ? document.querySelector(\'[data-build-stamp]\').getAttribute(\'data-build-stamp\') : ((document.body.innerText || \'\').match(/#?\\d* ?.? ?[0-9-]+ [0-9:]+ UTC( . [0-9a-f]{7})?/) || [null])[0]');
const roomNow = (page) => page.ask(`JSON.parse(JSON.stringify(${S}.project.room))`);
const profileNum = (page, path) => page.ask(`(() => { let v = ${PROFILE}; for (const k of ${j(path)}.split('.')) v = v == null ? v : v[k]; return v ?? null; })()`);
const wallLen = (room, i) => {
  const c = room.corners; const a = c[i]; const b = c[(i + 1) % c.length];
  return Math.hypot(b.x - a.x, b.y - a.y);
};
const modalNow = (page) => page.ask(`${UI}.modal || null`);
const selectedNow = (page) => page.ask(`${UI}.selectedUnitId || null`);
const elementNow = (page) => page.ask(`(() => { const e = ${UI}.selectedElement; return e ? JSON.parse(JSON.stringify(e)) : null; })()`);
/** Every message the ui store ever showed on this page (greys expire, yellows go on a click away), by a subscription. */
async function recordSaid(page) {
  await page.ask(`(() => { if (window.__walkSaid) return true; window.__walkSaid = []; const seen = new Set();
    const take = (s) => { for (const m of (s.messages || [])) { if (!seen.has(m.id)) { seen.add(m.id); window.__walkSaid.push(m.level + ': ' + m.message); } } };
    take(window.__cc.ui.getState()); window.__cc.ui.subscribe(take); return true; })()`);
}
const saidCount = (page) => page.ask('(window.__walkSaid || []).length');
const saidSince = (page, from) => page.ask(`(window.__walkSaid || []).slice(${from})`);
/** The messages on the glass now: level, text, and where each box stands in the viewport. */
// (a message column is position: fixed, so offsetParent is null: the box's own size says it is drawn)
const messagesOnGlass = (page) => page.ask(`[...document.querySelectorAll('[data-message]')].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).map((el) => { const r = el.getBoundingClientRect();
  const col = el.closest('[data-messages]'); return { id: el.getAttribute('data-message'), level: el.getAttribute('data-message-level'), text: el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 140),
    column: col ? col.getAttribute('data-messages') : null, left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), vw: window.innerWidth, vh: window.innerHeight }; })`);
/**
 * Every message box as it ARRIVES on the glass, by a MutationObserver (read
 * only): its level, column and box at insertion. A grey lives greyMs (3000)
 * and a scene rebuild can hold the main thread longer than that, so a poll
 * after the gesture can find it already gone; the observer cannot miss it.
 */
async function recordGlass(page) {
  await page.ask(`(() => { if (window.__walkGlass) return true; window.__walkGlass = []; const seen = new Set();
    const take = (el) => { const id = el.getAttribute('data-message'); if (!id || seen.has(id)) return; const r = el.getBoundingClientRect(); if (!(r.width > 0)) return; seen.add(id);
      const col = el.closest('[data-messages]'); window.__walkGlass.push({ id, level: el.getAttribute('data-message-level'), column: col ? col.getAttribute('data-messages') : null,
        text: el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 140), left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), vw: window.innerWidth, vh: window.innerHeight }); };
    new MutationObserver(() => { document.querySelectorAll('[data-message]').forEach(take); }).observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('[data-message]').forEach(take); return true; })()`);
}
const glassCount = (page) => page.ask('(window.__walkGlass || []).length');
const glassSince = (page, from) => page.ask(`(window.__walkGlass || []).slice(${from})`);
/** The Check's findings, off the store (read). */
const checksNow = (page) => page.ask(`${S}.runChecks().map((f) => ({ check: f.check, level: f.level, unitId: f.unitId || null, panelId: f.panelId || null, message: f.message }))`);

/**
 * A unit as the store holds it and as the engine cuts it: the fields T79
 * asks about (items, panels with their notch and extension stamps, the dia 3
 * screws per board, the derived extension, the warnings).
 */
const unitOf = (page, id) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(id)});
  if (!u) return null; const r = P.unitResult(u.id);
  const pick = (b) => (b ? { x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, d: b.d } : null);
  const items = ((u.params.sections && u.params.sections[0] && u.params.sections[0].items) || []).map((i) => ({ id: i.id, kind: i.kind, zone: i.zone ?? null,
    pos: i.pos_mm ?? null, x: i.x_mm ?? null, variant: i.variant || i.shelf_type || null, mount: i.mount || null, front: i.front_mm ?? null, dropped: i.sleeves_dropped || null }));
  const screws = {}; for (const d of (r.drills || [])) { if (d.kind === 'screw') screws[d.panel] = (screws[d.panel] || 0) + 1; }
  return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall ?? 0, x: u.position.x_mm,
    w: u.params.width, d: u.params.depth, h: u.params.height, depthFull: u.params.depth_full ?? null, recess: u.params.recess_mm ?? null,
    wallGap: u.params.wall_gap ?? null, notch: u.params.notch || null, edgeNotch: u.params.edgeNotch || null, joints: u.params.joints_system || null,
    jointsCut: r.derived && r.derived.joints ? (r.derived.joints.system || null) : null,
    endPanels: (u.params.end_panels || []).map((e) => e.side), items,
    panels: r.panels.map((p) => ({ id: p.id, part: p.part, role: p.role, w: p.w, h: p.h, t: p.thickness, box: pick(p.box),
      notch: p.meta && p.meta.notch ? JSON.parse(JSON.stringify(p.meta.notch)) : null, ext: p.meta && p.meta.extension ? true : false,
      cncNotch: p.cnc && p.cnc.notch ? JSON.parse(JSON.stringify(p.cnc.notch)) : null, outlinePts: p.cnc && p.cnc.outline ? p.cnc.outline.length : null,
      marks: p.cnc && p.cnc.marks ? p.cnc.marks.filter((m) => m.layer === 'CORNER_4MM').length : 0,
      pockets: p.cnc && p.cnc.pockets ? p.cnc.pockets.length : 0, holes: p.cnc && p.cnc.holes ? p.cnc.holes.length : 0,
      // A Cabineo pocket is one skim (cnc.pockets kind cabineo_recess) over three dia 15 lobes (drills kind cabineo_pocket).
      cabPockets: p.cnc && p.cnc.pockets ? p.cnc.pockets.filter((k) => k.kind === 'cabineo_recess').length : 0,
      cabLobes: (r.drills || []).filter((d) => d.panel === p.id && d.kind === 'cabineo_pocket').length,
      cabLobeX: [...new Set((r.drills || []).filter((d) => d.panel === p.id && d.kind === 'cabineo_pocket').map((d) => d.x))].sort((a, b) => a - b),
      cabHoles: (r.drills || []).filter((d) => d.panel === p.id && (d.kind === 'cabineo_hole' || /^CABINEO_HOLE/.test(d.layer || ''))).length,
      edge: p.meta && p.meta.edgeNotch ? true : false,
      machinedFace: p.meta ? (p.meta.machinedFace || null) : null })),
    screws, extension: r.derived && r.derived.extension ? JSON.parse(JSON.stringify({ boards: r.derived.extension.boards, x0: r.derived.extension.x0, x1: r.derived.extension.x1, z0: r.derived.extension.z0, z1: r.derived.extension.z1, d: r.derived.extension.d, refused: r.derived.extension.refused || null })) : null,
    notchBoards: r.derived && r.derived.notch ? (r.derived.notch.boards || null) : null,
    edgeCut: r.derived && r.derived.edgeNotch ? JSON.parse(JSON.stringify(r.derived.edgeNotch)) : null,
    boxCabineo: r.derived && r.derived.boxCabineo ? JSON.parse(JSON.stringify(r.derived.boxCabineo)) : null,
    cabineoBom: (r.hardware || []).filter((h) => /cabineo/.test(h.role || '')).map((h) => h.role + ' ' + h.qty),
    warnings: (r.warnings || []).map((w) => w.code + ': ' + w.message) }; })()`);
const sayPanels = (u, re) => u.panels.filter((p) => re.test(p.id)).map((p) => `${p.id} ${r1(p.w)}x${r1(p.h)}`).join(', ') || 'none';

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
/** A number typed into the focused field, the digits selected first; Enter commits. */
async function typeNumber(page, value) {
  await selectAll(page);
  await page.typeText(String(value));
  await key(page, 'Enter');
  await page.sleep(700);
}
/** A field clicked (a real click at its centre) and a number typed into it. */
async function typeInto(page, expr, value) {
  const at = await boxOf(page, expr);
  if (!at) return false;
  await clickWith(page, at.x, at.y);
  await typeNumber(page, value);
  return true;
}
/** A field clicked and a number typed, NO Enter (a form whose Enter submits takes its last field's Enter only). */
async function typeOnly(page, expr, value) {
  const at = await boxOf(page, expr);
  if (!at) return false;
  await clickWith(page, at.x, at.y);
  await selectAll(page);
  await page.typeText(String(value));
  return true;
}
/** The visible text of the first element a page-side expression returns. */
const textOf = (page, expr) => page.ask(`(() => { const el = (${expr}); return el ? el.textContent.replace(/\\s+/g, ' ').trim() : null; })()`);
/** Every window shut the way a client shuts one: Escape, then Done / Close / Cancel by a real click. */
async function closeModals(page) {
  const seen = []; let by = null;
  for (let i = 0; i < 4; i += 1) {
    const m = await modalNow(page);
    if (!m) break;
    seen.push(m);
    await key(page, 'Escape');
    if (!(await modalNow(page))) { by = by || 'Escape'; continue; }
    const btn = await boxOf(page, '[...document.querySelectorAll(\'[data-modal-shell] button, [role="dialog"] button\')].find((b) => b.offsetParent && (/^(Done|Close|Cancel)$/.test(b.textContent.trim()) || /^Close/.test(b.getAttribute(\'title\') || \'\')))');
    if (btn) { await clickWith(page, btn.x, btn.y); by = by || 'its Done / Close / Cancel button'; }
    await page.sleep(400);
  }
  return { seen, by, left: await modalNow(page) };
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
const LIB = {
  wardrobe: { category: 'Wardrobes', path: [], entry: 'WARDROBE' },
  bud: { category: 'Kitchen', path: ['base-units'], entry: 'door-base' },
  budr: { category: 'Kitchen', path: ['base-units', 'drawer-unit'], entry: 'drawer-3' },
};
const selectedIs = (unitId) => `${UI}.selectedUnitId === ${j(unitId)} && !${UI}.selectedElement && Boolean(document.querySelector('[data-section="Carcass"]'))`;
/** The pieces a hand can click a cabinet by: the top first, then a leaf, a side, the bottom. */
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const pick = [];
  for (const f of [(p) => p.id === 'TOP' || p.part === 'TOP', (p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT', (p) => p.role === 'side', (p) => p.role === 'bottom', (p) => p.role === 'back', () => true]) {
    for (const p of r.panels) if (f(p) && !(p.meta && p.meta.frontDecorationParent) && !pick.includes(p.id)) pick.push(p.id); }
  return pick; })()`);
/** A unit SELECTED by a real click on one of its pieces, its right panel standing. */
async function selectUnit(page, unitId) {
  if (await page.ask(selectedIs(unitId))) return { already: true };
  if (await modalNow(page)) await closeModals(page);
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  if (await page.ask(selectedIs(unitId))) return { already: true, by: 'Escape off the piece' };
  let last = null;
  for (const pid of (await grabIds(page, unitId)).slice(0, 8)) {
    const at = await reachFree(page, unitId, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    last = { ...at, by: pid };
    if (await until(page, selectedIs(unitId), 3000)) return last;
    if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
    if (await page.ask(selectedIs(unitId))) return { ...last, by: `${pid}, then Escape off the piece` };
  }
  return last;
}
/**
 * A PIECE selected (the element, not the cabinet) by a real click where the
 * scene says it is the nearest thing; a second click when the first only took
 * the cabinet. The fronts are hidden first by the toolbar's own button when a
 * leaf stands in front of the interior.
 */
async function selectPiece(page, unitId, panelId) {
  const is = () => page.ask(`(() => { const e = ${UI}.selectedElement; return Boolean(e) && e.unitId === ${j(unitId)} && e.elementRef === ${j(panelId)}; })()`);
  if (await is()) return { already: true };
  for (let t = 0; t < 3; t += 1) {
    const at = await reachFree(page, unitId, panelId);
    if (!at) return null;
    await clickWith(page, at.x, at.y);
    await until(page, `Boolean(${UI}.selectedElement)`, 1500);
    if (await is()) return { ...at, by: panelId, clicks: t + 1 };
  }
  return null;
}
/** The toolbar's Hide fronts, pressed when the fronts are drawn (so the interior can be clicked). */
async function hideFronts(page) {
  const on = await page.ask('(() => { const b = document.querySelector(\'[data-hide-fronts="1"]\'); return b ? b.getAttribute(\'aria-pressed\') : null; })()');
  if (on === 'true') return 'already hidden';
  if (!(await page.has('[data-hide-fronts="1"]'))) return 'no Hide fronts button';
  await page.press('[data-hide-fronts="1"]');
  await page.sleep(700);
  return 'hidden by the toolbar button';
}
/** A control in a right-panel section found by the sentence over it (span.cc-label). */
const byLabel = (section, label, tag) => `(() => { const s = [...document.querySelectorAll('[data-section="${section}"] span.cc-label')].find((x) => x.textContent.trim() === ${j(label)}); return s ? s.parentElement.querySelector(${j(tag)}) : null; })()`;
/** The selected piece's own section (Selected piece) and a field in it by its label. */
const pieceField = (label, tag = 'input') => `(() => { const sec = [...document.querySelectorAll('section')].find((x) => /Selected piece/.test(x.textContent)); if (!sec) return null;
  const s = [...sec.querySelectorAll('span.cc-label')].find((x) => x.textContent.trim() === ${j(label)}); return s ? s.parentElement.querySelector(${j(tag)}) : null; })()`;
/** A size of a cabinet typed into the Carcass field (data-unit-size-field), the cabinet selected first. */
async function setSize(page, unitId, keyName, value) {
  await selectUnit(page, unitId);
  await sectionOpen(page, 'Carcass');
  const ok = await typeInto(page, `document.querySelector('[data-unit-size-field="${keyName}"]')`, value);
  await page.sleep(500);
  return ok;
}
/** The top bar: a menu, then its item (both real clicks). */
async function menu(page, top, item = null) {
  if (await modalNow(page)) await closeModals(page);
  await page.press('nav[aria-label="Main menu"] > div > button', top);
  await page.sleep(300);
  if (item == null) return true;
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
/** The Check panel shut by its own x (the toolbar's Check button can stand under the panel); a window it opened shut first. */
async function checkClose(page) {
  if (!(await page.has('[data-check-panel]'))) return;
  // A finding's button flies to its piece and opens the piece's window, whose
  // backdrop takes the next press: that window is shut first.
  if (await modalNow(page)) await closeModals(page);
  const x = await boxOf(page, '[...document.querySelectorAll(\'[data-check-panel] button[title="Close"]\')].find((b) => b.offsetParent)');
  const under = x ? await page.ask(`(() => { const el = document.elementFromPoint(${x.x}, ${x.y}); return el ? el.tagName + '.' + String(el.className || '').slice(0, 30) + ' "' + (el.textContent || '').trim().slice(0, 20) + '"' : null; })()`) : null;
  if (x) await clickWith(page, x.x, x.y);
  else await page.press('[data-check-button]');
  const shut = await until(page, '!document.querySelector(\'[data-check-panel]\')', 3000);
  if (!shut) process.stdout.write(`      (the Check's x at ${j(x)}, under the pointer ${under}; checkOpen ${await page.ask(`${UI}.checkOpen`)})\n`);
}
/** A DOM element framed, clipped with a margin and scaled up. */
async function domFrame(page, expr, file, pad = 12, scale = 2) {
  const r = await page.ask(`(() => { const el = (${expr}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
  if (!r || r.w < 4) return shot(page, file);
  return shot(page, file, {
    x: Math.max(0, Math.round(r.x - pad)), y: Math.max(0, Math.round(r.y - pad)), width: Math.round(r.w + 2 * pad), height: Math.round(Math.min(r.h + 2 * pad, 900)), scale,
  });
}
/** A frame clipped to the screen rectangle some pieces cover (with a margin), scaled up (t78-walk.mjs's). */
async function pieceFrame(page, unitId, ids, file) {
  await settleCamera(page);
  const r = await page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
    let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
    if (!unit) return null; const want = ${j(ids)}; const box = new T.Box3(); let any = false; unit.updateMatrixWorld(true);
    unit.traverse((o) => { if (o.isMesh && o.userData && (want.length === 0 || want.includes(o.userData.ccPanelId))) { box.expandByObject(o); any = true; } });
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
 * The view mode (3D | CNC): the canvas toolbar's own button when the page
 * hands its pixel to it (the Check panel can stand over it), otherwise the top
 * bar's View, 3D / CNC sheet. Both are real clicks.
 */
async function viewMode(page, mode) {
  if (await page.ask(`${UI}.viewMode === ${j(mode)}`)) return { ok: true, by: 'already' };
  const label = mode === 'cnc' ? 'CNC' : '3D';
  const at = await page.ask(`(() => { const b = [...document.querySelectorAll('[role="group"][aria-label="View mode"] button')].find((x) => x.offsetParent && x.textContent.trim() === ${j(label)});
    if (!b) return null; const r = b.getBoundingClientRect(); const x = Math.round(r.left + r.width / 2); const y = Math.round(r.top + r.height / 2);
    const el = document.elementFromPoint(x, y); return el === b || b.contains(el) ? { x, y } : null; })()`);
  let by = null;
  if (at) { await clickWith(page, at.x, at.y); by = 'the toolbar button'; } else {
    await page.click('nav[aria-label="Main menu"] > div > button', 'View', { exact: true });
    await page.sleep(350);
    const item = await boxOf(page, `[...document.querySelectorAll('[role="menuitem"]')].filter((b) => b.offsetParent)
      .find((b) => ((b.querySelector('span.flex-1') || b).textContent || '').trim() === ${j(mode === 'cnc' ? 'CNC sheet' : '3D')})`);
    if (item) { await clickWith(page, item.x, item.y); by = 'View menu'; } else await key(page, 'Escape');
  }
  await until(page, `${UI}.viewMode === ${j(mode)}`, 4000);
  await page.sleep(1200);
  return { ok: await page.ask(`${UI}.viewMode === ${j(mode)}`), by };
}

// === THE STAGE PIECES =======================================================
/** PRO's editor on a new project, the "said" recorder on, the build and the room written down. */
async function stagePro(page, what) {
  await pro(page, { base: BASE });
  await recordSaid(page);
  note('the build under the mouse', `${await stamp(page) || 'no stamp read'}; the repo's HEAD ${head}; url ${BASE}`);
  const room = await roomNow(page);
  note(`a new project (the stage for ${what}), its room`, `${room.corners.length} walls: ${room.corners.map((c, i) => `wall ${i + 1} ${wallLen(room, i)}`).join(', ')}; height ${room.height}`);
  return room;
}
/** A cabinet from the library's real row, its width typed when one is asked for. */
async function placeUnit(page, kind, { width = null } = {}) {
  const res = await addFromLibrary(page, LIB[kind]);
  let u = res.unit ? await unitOf(page, res.unit.id) : null;
  check(`Library, ${LIB[kind].category}${LIB[kind].path.length ? `, ${LIB[kind].path.join(', ')}` : ''}, ${LIB[kind].entry} (the real row)`, Boolean(u),
    `a ${kind} in the room`, u ? `${u.type} ${u.num} on wall ${u.wall + 1} at x ${u.x}, ${u.w} x ${u.h} x ${u.d}` : `row pressed ${res.ok}, nothing added; said ${j(res.said)}`);
  if (!u) throw new Error(`no ${kind}`);
  if (!(await sceneCheck(page, `after the ${kind} is drawn`))) throw new Error(DEAD);
  if (width != null && u.w !== width) {
    const sel = await selectUnit(page, u.id);
    const typed = await setSize(page, u.id, 'width', width);
    await until(page, `(${S}.units.find((x) => x.id === ${j(u.id)}) || { params: {} }).params.width === ${width}`, 4000);
    u = await unitOf(page, u.id);
    check(`selected (${how(sel)}), Carcass, Width typed ${width}, Enter`, typed && u.w === width, `width ${width}`, `width ${u.w}; x ${u.x}`);
  }
  return u;
}
/** Add items, Shelves, a count, Add: through the section's own controls; `zone` presses Bay N first. */
async function addShelvesUi(page, unitId, count, { zone = null } = {}) {
  await selectUnit(page, unitId);
  const opened = await sectionOpen(page, 'Add items');
  if (!(await page.has('[data-add-kind="shelves"][aria-expanded="true"]'))) await page.press('[data-add-kind="shelves"]');
  if (zone != null && await page.has(`[data-zone="${zone}"]`)) await page.press(`[data-zone="${zone}"]`);
  const field = '(() => { const s = [...document.querySelectorAll(\'[data-section="Add items"] span.cc-label\')].find((x) => x.textContent.trim() === \'Add\' && x.parentElement.querySelector(\'input\')); return s ? s.parentElement.querySelector(\'input\') : null; })()';
  const before = (await unitOf(page, unitId)).items.filter((i) => i.kind === 'shelf').length;
  const typed = await typeInto(page, field, count);
  const add = await boxOf(page, '[...document.querySelectorAll(\'[data-section="Add items"] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add\' && !b.disabled)');
  const said0 = await saidCount(page);
  if (add) await clickWith(page, add.x, add.y);
  await until(page, `((${S}.units.find((x) => x.id === ${j(unitId)}).params.sections || [])[0] || { items: [] }).items.filter((i) => i.kind === 'shelf').length > ${before}`, 5000);
  await page.sleep(700);
  const u = await unitOf(page, unitId);
  return {
    opened, typed, pressed: Boolean(add), added: u.items.filter((i) => i.kind === 'shelf').length - before, unit: u, said: await saidSince(page, said0),
  };
}
/** The shelf item's engine panel id (SHELF-n) by its item id (the panel whose box sits at the item's pos). */
const shelfPanelOf = (page, unitId, itemId) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(unitId)});
  const r = P.unitResult(u.id); const p = r.panels.find((q) => q.part === 'SHELF' && q.meta && (q.meta.itemId === ${j(itemId)} || q.meta.item === ${j(itemId)} || q.meta.id === ${j(itemId)}));
  if (p) return p.id; const it = (u.params.sections[0].items || []).find((i) => i.id === ${j(itemId)});
  const q = it ? r.panels.find((x) => x.part === 'SHELF' && x.box && Math.abs(x.box.y - it.pos_mm) < 1) : null; return q ? q.id : null; })()`);
/**
 * A shelf put at a stored height (pos_mm) and made FIX: its Height field first
 * (the interior datum, pos - G; a FIX shelf is screwed and its Height field is
 * disabled), then its FIX chip.
 */
async function fixShelfAt(page, unitId, itemId, posMm) {
  const pid = await shelfPanelOf(page, unitId, itemId);
  const sel = pid ? await selectPiece(page, unitId, pid) : null;
  const G = Number(await page.ask(`(${S}.units.find((x) => x.id === ${j(unitId)}) || { params: {} }).params.board_t || 18`));
  const typed = posMm == null ? null : await typeInto(page, pieceField('Height'), posMm - G);
  await page.sleep(500);
  let chip = false;
  if (await page.has('[data-shelf-type-chip="fix"]')) { await page.press('[data-shelf-type-chip="fix"]'); chip = true; }
  await page.sleep(500);
  const u = await unitOf(page, unitId);
  const it = u.items.find((i) => i.id === itemId) || null;
  return {
    pid, sel, chip, typed, item: it, G,
  };
}
/** A shelf's Height field typed (pos_mm stored = field + G), the shelf selected by a real click. */
async function shelfAt(page, unitId, itemId, posMm) {
  const pid = await shelfPanelOf(page, unitId, itemId);
  const sel = pid ? await selectPiece(page, unitId, pid) : null;
  const G = Number(await page.ask(`(${S}.units.find((x) => x.id === ${j(unitId)}) || { params: {} }).params.board_t || 18`));
  const typed = await typeInto(page, pieceField('Height'), posMm - G);
  await page.sleep(600);
  const it = (await unitOf(page, unitId)).items.find((i) => i.id === itemId) || null;
  return {
    pid, sel, typed, item: it, G,
  };
}
/** Add items, Vertical partition, its one button. */
async function addPartitionUi(page, unitId) {
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  await selectUnit(page, unitId);
  await sectionOpen(page, 'Add items');
  if (!(await page.has('[data-add-kind="partition"][aria-expanded="true"]'))) await page.press('[data-add-kind="partition"]');
  const said0 = await saidCount(page);
  const btn = await boxOf(page, '[...document.querySelectorAll(\'[data-section="Add items"] button\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add a vertical partition\')');
  if (btn) await clickWith(page, btn.x, btn.y);
  await until(page, `((${S}.units.find((x) => x.id === ${j(unitId)}).params.sections || [])[0] || { items: [] }).items.some((i) => i.kind === 'partition')`, 4000);
  await page.sleep(600);
  return { pressed: Boolean(btn), said: await saidSince(page, said0) };
}
/**
 * CUT CORNER (the Carcass row's real button), the lit corner clicked where the
 * scene says it is the first thing under the pointer (the camera turned by
 * real drags until it is), the notch window open at the click. T75 F7's walk.
 */
async function openNotchWindow(page, unitId, corner = 'BL') {
  const relight = async () => {
    await selectUnit(page, unitId);
    await sectionOpen(page, 'Carcass');
    if (await page.has('[data-testid="cut-corner"]') && !(await page.ask(`${UI}.notchPick`))) await page.press('[data-testid="cut-corner"]');
  };
  await relight();
  const lit = await until(page, `${UI}.notchPick`, 3000);
  await settleCamera(page);
  let handles = await helperAt(page, `(u) => u.ccNotchCorner === ${j(corner)}`);
  const turns = [[0, 160], [0, 160], [120, 0], [-240, 0], [0, -120]];
  for (let t = 0; t < turns.length && !(handles && handles.some((x) => x.first)); t += 1) {
    await orbitFree(page, turns[t][0], turns[t][1]);
    if (!(await page.ask(`${UI}.notchPick`))) await relight();
    await settleCamera(page);
    handles = await helperAt(page, `(u) => u.ccNotchCorner === ${j(corner)}`);
  }
  const h = handles && handles.find((x) => x.first);
  if (h) await clickWith(page, h.x, h.y);
  const asked = h ? await until(page, 'Boolean(document.querySelector(\'[data-testid="notch-ask"]\'))', 3000) : false;
  const fields = await page.ask('[...document.querySelectorAll(\'[data-testid="notch-ask"] [data-notch-field]\')].map((e) => e.getAttribute(\'data-notch-field\') + \'=\' + e.value)');
  const help = await page.ask('(() => { const f = document.querySelector(\'[data-testid="notch-ask"]\'); const p = f ? [...f.querySelectorAll(\'p\')].find((x) => /WIDTH/.test(x.textContent)) : null; return p ? p.textContent.trim() : null; })()');
  return {
    lit, handle: h || null, handles: (handles || []).length, asked: Boolean(asked), fields, help,
  };
}
/**
 * CUT EDGE (T79 F5, the Carcass row's second button), the lit edge's handle
 * clicked where the scene says it is the first thing under the pointer
 * (userData.ccNotchEdge, 3d/NotchEdges.jsx), the edge window open at the click.
 */
async function openEdgeWindow(page, unitId, edge) {
  const relight = async () => {
    await selectUnit(page, unitId);
    await sectionOpen(page, 'Carcass');
    if (await page.has('[data-testid="cut-edge"]') && !(await page.ask(`${UI}.edgeNotchPick`))) await page.press('[data-testid="cut-edge"]');
  };
  await relight();
  const lit = await until(page, `${UI}.edgeNotchPick`, 3000);
  await settleCamera(page);
  const find = () => helperAt(page, `(u) => u.ccNotchEdge === ${j(edge)}`);
  let handles = await find();
  const turns = [[0, 160], [0, 160], [120, 0], [-240, 0], [0, -120]];
  for (let t = 0; t < turns.length && !(handles && handles.some((x) => x.first)); t += 1) {
    await orbitFree(page, turns[t][0], turns[t][1]);
    if (!(await page.ask(`${UI}.edgeNotchPick`))) await relight();
    await settleCamera(page);
    handles = await find();
  }
  const h = handles && handles.find((x) => x.first);
  if (h) await clickWith(page, h.x, h.y);
  const asked = h ? await until(page, 'Boolean(document.querySelector(\'[data-testid="edge-notch-ask"]\'))', 3000) : false;
  const form = await page.ask('(() => { const f = document.querySelector(\'[data-testid="edge-notch-ask"]\'); if (!f) return null; return { edge: f.getAttribute(\'data-edge-notch-edge\'), fields: [...f.querySelectorAll(\'input[data-edge-notch-field]\')].map((e) => e.getAttribute(\'data-edge-notch-field\') + \'=\' + e.value), choices: [...f.querySelectorAll(\'[data-edge-notch-choice]\')].map((b) => b.getAttribute(\'data-edge-notch-choice\')), help: (f.querySelector(\'[data-testid="edge-notch-help"]\') || {}).textContent || null }; })()');
  return {
    lit, handle: h || null, handles: (handles || []).length, asked: Boolean(asked), form,
  };
}
/** The notch window's CUT (Enter in WIDTH, as T75's walk), the engine's answer read. */
async function cutNotch(page, unitId) {
  const said0 = await saidCount(page);
  await key(page, 'Enter');
  await page.sleep(1200);
  const u = await unitOf(page, unitId);
  return { u, said: await saidSince(page, said0), refusal: await page.ask('(document.querySelector(\'[data-testid="notch-said"]\') || {}).textContent || null') };
}
/**
 * A RECESS on a wall through PRO's own Room setup: Settings, Room setup..., the
 * elevation's Top view, Add recess, its row, Width, From the left, Depth (and
 * Bottom / Top when asked), Done; the room window shut by its own button.
 */
async function recessPro(page, {
  x, width, depth, bottom = null, top = null, wall = null,
}) {
  const said0 = await saidCount(page);
  const opened = await menu(page, 'Settings', 'Room setup');
  await until(page, 'Boolean(document.querySelector(\'[data-elevation-dock]\'))', 5000);
  return recessInElevation(page, {
    x, width, depth, bottom, top, opened, said0, wantWall: wall,
  });
}
/** The docked elevation's Top view, Add recess, the numbers typed in its window (PRO and retail share the copy). */
async function recessInElevation(page, {
  x, width, depth, bottom = null, top = null, opened = true, said0 = 0, wantWall = null,
}) {
  const dockWall = () => page.ask('(() => { const d = document.querySelector(\'[data-elevation-dock]\'); return d ? Number(d.getAttribute(\'data-elevation-wall\')) : null; })()');
  // The dock shows the wall the plan above it chose; the unit's wall is clicked in the plan when it shows another.
  if (wantWall != null && await dockWall() !== wantWall) {
    const wl = await boxOf(page, `document.querySelector('[data-plan-wall="${wantWall}"]') || document.querySelector('[data-wall-label="${wantWall}"]')`);
    if (wl) await clickWith(page, wl.x, wl.y);
    await until(page, `(() => { const d = document.querySelector('[data-elevation-dock]'); return d && Number(d.getAttribute('data-elevation-wall')) === ${wantWall}; })()`, 3000);
  }
  const wall = await dockWall();
  if (await page.has('[data-wall-view-option="top"]')) await page.press('[data-wall-view-option="top"]');
  const before = await page.ask(`(${S}.project.wallSlopes || []).filter((e) => e.kind === 'recess').map((e) => e.id)`);
  if (await page.has('[data-elevation-add="recess"]')) await page.press('[data-elevation-add="recess"]');
  await until(page, `(${S}.project.wallSlopes || []).filter((e) => e.kind === 'recess').length > ${before.length}`, 4000);
  const id = await page.ask(`((${S}.project.wallSlopes || []).find((e) => e.kind === 'recess' && !${j(before)}.includes(e.id)) || {}).id || null`);
  if (id && await page.has(`[data-elevation-row="${id}"]`)) await page.press(`[data-elevation-row="${id}"]`);
  const win = await until(page, 'Boolean(document.querySelector(\'[data-element-modal="recess"]\'))', 3000);
  const typed = {};
  if (win) {
    typed.width = await typeInto(page, 'document.querySelector(\'[data-plan-width="1"]\')', width);
    typed.x = await typeInto(page, 'document.querySelector(\'[data-plan-x="1"]\')', x);
    typed.depth = await typeInto(page, 'document.querySelector(\'[data-plan-depth="1"]\')', depth);
    if (bottom != null) typed.bottom = await typeInto(page, 'document.querySelector(\'[data-plan-bottom="1"]\')', bottom);
    if (top != null) typed.top = await typeInto(page, 'document.querySelector(\'[data-plan-top="1"]\')', top);
  }
  const rec = id ? await page.ask(`JSON.parse(JSON.stringify((${S}.project.wallSlopes || []).find((e) => e.id === ${j(id)}) || null))`) : null;
  return {
    opened, wall, id, window: Boolean(win), typed, recess: rec, said: await saidSince(page, said0),
  };
}
/** The recess window's Done, then the room window's own Apply (the elevation writes the wall live; Apply shuts the room window). */
async function recessDone(page) {
  // Docked in the room window (Room setup, T67) the element window's footer is
  // taken out of the flow and its numbers commit on Enter; a free-standing one
  // shows its Done.
  const done = await page.ask('[...document.querySelectorAll(\'[data-element-done="1"]\')].some((b) => b.offsetParent !== null && b.getBoundingClientRect().width > 0)');
  if (done) await page.press('[data-element-done="1"]');
  let by = null;
  if (await page.has('[data-room-apply="1"]')) { await page.press('[data-room-apply="1"]'); by = 'Apply'; }
  const rest = await closeModals(page);
  return {
    by, roomOpen: await page.has('[data-elevation-dock]'), ...rest,
  };
}
/** A download folder for this page, and the file a gesture saves into it. */
let downloadSeq = 0;
async function downloadsTo(page) {
  downloadSeq += 1;
  const dir = join(tmpdir(), `t79-walk-${process.pid}-${Date.now().toString(36)}-${downloadSeq}`);
  mkdirSync(dir, { recursive: true });
  try {
    await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir, eventsEnabled: true });
  } catch {
    await page.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
  }
  return dir;
}
async function captureDownload(dir, gesture, page, { waitMs = 30000 } = {}) {
  const before = new Set(readdirSync(dir));
  await gesture();
  for (let i = 0; i < waitMs / 250; i += 1) {
    const got = readdirSync(dir).filter((n) => !before.has(n) && !/\.crdownload$|\.tmp$/.test(n));
    if (got.length) { await page.sleep(400); return join(dir, got[0]); }
    await page.sleep(250);
  }
  return null;
}

// === THE DXF, READ (R12: POLYLINE + VERTEX + SEQEND; LWPOLYLINE read too) ===
/**
 * The entities of one DXF by group-code pairs: the LAYER table (name -> ACI),
 * every polyline (layer, closed flag, vertices; an R12 POLYLINE is the
 * engine's spelling of an LWPOLYLINE, cnc/dxf.js header) and every LINE.
 */
function parseDxf(text) {
  const raw = String(text).split(/\r?\n/);
  const pairs = [];
  for (let i = 0; i + 1 < raw.length; i += 2) pairs.push([Number(raw[i].trim()), raw[i + 1].trim()]);
  const layers = {};
  const polys = [];
  const lines = [];
  let i = 0;
  let section = null;
  while (i < pairs.length) {
    const [c, v] = pairs[i];
    if (c === 0 && v === 'SECTION') { section = pairs[i + 1] ? pairs[i + 1][1] : null; i += 2; continue; }
    if (c === 0 && v === 'LAYER' && section === 'TABLES') {
      let name = null; let aci = null; i += 1;
      while (i < pairs.length && pairs[i][0] !== 0) { if (pairs[i][0] === 2) name = pairs[i][1]; if (pairs[i][0] === 62) aci = Number(pairs[i][1]); i += 1; }
      if (name) layers[name] = aci;
      continue;
    }
    if (c === 0 && v === 'POLYLINE' && section === 'ENTITIES') {
      let layer = null; let flags = 0; i += 1;
      while (i < pairs.length && pairs[i][0] !== 0) { if (pairs[i][0] === 8) layer = pairs[i][1]; if (pairs[i][0] === 70) flags = Number(pairs[i][1]); i += 1; }
      const pts = [];
      while (i < pairs.length && pairs[i][0] === 0 && pairs[i][1] === 'VERTEX') {
        let x = null; let y = null; i += 1;
        while (i < pairs.length && pairs[i][0] !== 0) { if (pairs[i][0] === 10) x = Number(pairs[i][1]); if (pairs[i][0] === 20) y = Number(pairs[i][1]); i += 1; }
        pts.push([x, y]);
      }
      if (i < pairs.length && pairs[i][1] === 'SEQEND') { i += 1; while (i < pairs.length && pairs[i][0] !== 0) i += 1; }
      polys.push({ kind: 'POLYLINE', layer, closed: (flags & 1) === 1, pts });
      continue;
    }
    if (c === 0 && v === 'LWPOLYLINE' && section === 'ENTITIES') {
      let layer = null; let flags = 0; const pts = []; let x = null; i += 1;
      while (i < pairs.length && pairs[i][0] !== 0) {
        const [cc, vv] = pairs[i];
        if (cc === 8) layer = vv; if (cc === 70) flags = Number(vv);
        if (cc === 10) x = Number(vv); if (cc === 20) pts.push([x, Number(vv)]);
        i += 1;
      }
      polys.push({ kind: 'LWPOLYLINE', layer, closed: (flags & 1) === 1, pts });
      continue;
    }
    if (c === 0 && v === 'LINE' && section === 'ENTITIES') {
      let layer = null; i += 1;
      while (i < pairs.length && pairs[i][0] !== 0) { if (pairs[i][0] === 8) layer = pairs[i][1]; i += 1; }
      lines.push({ layer });
      continue;
    }
    i += 1;
  }
  return { layers, polys, lines };
}
/** Re-entrant vertices of a closed outline (the walk's own cross product against the signed area). */
function reentrant(pts) {
  const n = (pts || []).length;
  if (n < 4) return [];
  let a2 = 0;
  for (let k = 0; k < n; k += 1) { const [x1, y1] = pts[k]; const [x2, y2] = pts[(k + 1) % n]; a2 += x1 * y2 - x2 * y1; }
  const out = [];
  for (let k = 0; k < n; k += 1) {
    const p = pts[(k + n - 1) % n]; const v = pts[k]; const q = pts[(k + 1) % n];
    const cross = (v[0] - p[0]) * (q[1] - v[1]) - (v[1] - p[1]) * (q[0] - v[0]);
    if (cross * a2 < 0) out.push(v);
  }
  return out;
}

/**
 * THE ROD DRAGGED (T42 F1's gesture): a real press on the tube where the
 * scene says it is the first thing under the pointer (userData.ccRailItemId),
 * moves in steps to the pixel the wanted axis height projects to (straight up
 * or down in the unit's own frame), a frame while it is still held (the
 * magnet's guide is drawn then), the release. Returns the axis height in the
 * unit frame before and after, read off the tube's mesh.
 */
async function railDrag(page, unitId, itemId, targetAxisMm, frame = null, { modifiers = 0 } = {}) {
  const axis = () => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
    let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
    let tube = null; if (unit) unit.traverse((o) => { if (!tube && o.userData && o.userData.ccRailItemId === ${j(itemId)}) tube = o; });
    if (!tube) return null; unit.updateMatrixWorld(true); const p = new T.Vector3().setFromMatrixPosition(tube.matrixWorld);
    const q = p.clone().applyMatrix4(new T.Matrix4().copy(unit.matrixWorld).invert()); return Math.round(q.y * 10000) / 10; })()`);
  const before = await axis();
  let at = null;
  for (const [dx, dy] of [[0, 0], [120, 0], [-240, 0], [0, 120]]) {
    if (dx || dy) await orbitFree(page, dx, dy);
    const hits = await helperAt(page, `(u) => u.ccRailItemId === ${j(itemId)}`);
    at = (hits || []).find((h) => h.first) || null;
    if (at) break;
  }
  if (!at || before == null) return { ok: false, why: at ? 'no tube mesh' : 'the tube is never the first thing under the pointer', before };
  const to = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three;
    let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
    let tube = null; unit.traverse((o) => { if (!tube && o.userData && o.userData.ccRailItemId === ${j(itemId)}) tube = o; });
    unit.updateMatrixWorld(true); const local = new T.Vector3().setFromMatrixPosition(tube.matrixWorld).applyMatrix4(new T.Matrix4().copy(unit.matrixWorld).invert());
    local.y = ${Number(targetAxisMm)} / 1000; const w = local.applyMatrix4(unit.matrixWorld).project(v.camera); const r = v.gl.domElement.getBoundingClientRect();
    return { x: Math.round(r.left + (w.x * 0.5 + 0.5) * r.width), y: Math.round(r.top + (-w.y * 0.5 + 0.5) * r.height) }; })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, modifiers });
  await page.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1, buttons: 1, modifiers,
  });
  const n = 16;
  for (let i = 1; i <= n; i += 1) {
    const x = at.x + ((to.x - at.x) * i) / n; const y = at.y + ((to.y - at.y) * i) / n;
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x, y, button: 'left', buttons: 1, modifiers,
    });
    await page.sleep(45);
  }
  await page.sleep(500);
  const held = await axis();
  // The rod's guide (T79 F11: userData.ccRailMagnet, the caught axis) and its label, read while the rod is in the hand.
  const guide = await page.ask(`(() => { const v = window.__cc.views.room; let g = null; v.scene.traverse((o) => { if (!g && o.userData && (o.userData.ccRailMagnet != null || o.userData.ccMagnet != null)) g = o.userData.ccRailMagnet ?? o.userData.ccMagnet; }); return g; })()`);
  // The frame while the rod is still in the hand (the guide lives only then), clipped to the cabinet.
  if (frame) await pieceFrame(page, unitId, [], frame);
  await page.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1, buttons: 0, modifiers,
  });
  await page.sleep(900);
  return {
    ok: true, from: at, to, before, held, after: await axis(), guide,
  };
}

// ============================================================================
// THE SECTIONS
// ============================================================================

/** One page per section: opened, walked, its console errors written down, closed. */
async function onPage(name, title, body, { width = 1440, height = 900 } = {}) {
  if (!runs(name)) return;
  const page = await open({ width, height });
  begin(name, title);
  try {
    await body(page);
  } catch (e) {
    await ended(page, name, e);
  }
  const errs = pageErrors(page);
  note('console errors on the page', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await page.close();
}

// --- F1 . MESSAGES GO TO THE LEFT, AND KEEP A HISTORY -----------------------
await onPage('f01', 'MESSAGES GO TO THE LEFT, AND KEEP A HISTORY (PRO)', async (page) => {
  await stagePro(page, 'the messages');
  const w = await placeUnit(page, 'wardrobe');
  // THE STAGE: a shelf added through Add items (the owner's own gesture; what
  // it says today is written down), then a change that does say something in
  // grey (Add items, Overlay drawers, Add: the "N x H mm overlay drawers added"
  // sentence), read off the glass at once (a grey leaves after greyMs).
  const greyMs = await profileNum(page, 'ui.messages.greyMs');
  const add = await addShelvesUi(page, w.id, 1);
  note('Add items, Shelves, 1, Add: what it said', `added ${add.added}; said ${j(add.said)}; on the glass ${j(await messagesOnGlass(page))}`);
  await selectUnit(page, w.id);
  await sectionOpen(page, 'Add items');
  if (!(await page.has('[data-add-kind="overlay_drawers"][aria-expanded="true"]')) && await page.has('[data-add-kind="overlay_drawers"]')) await page.press('[data-add-kind="overlay_drawers"]');
  await recordGlass(page);
  const said0 = await saidCount(page);
  const g0 = await glassCount(page);
  const od = await boxOf(page, 'document.querySelector(\'[data-add-overlay-drawers="1"]\')');
  if (od) await clickWith(page, od.x, od.y);
  await until(page, `(window.__walkGlass || []).length > ${g0}`, 4000);
  const glass = await glassSince(page, g0);
  check('Add items, Overlay drawers, Add (real clicks): a grey message on the glass', Boolean(od) && glass.length > 0,
    'a message box shown (level info/ok), read as it arrives', `button ${Boolean(od)}; said ${j(await saidSince(page, said0))}; arrived on the glass ${j(glass)}`);
  const g = glass[0] || null;
  note('where the grey message stands (read as it arrived)', g ? `column "${g.column}", level ${g.level}, box ${g.left},${g.top} .. ${g.right},${g.bottom} in a ${g.vw} x ${g.vh} viewport; greyMs ${greyMs}` : 'no message box read');
  // THE FRAME. Under SwiftShader a capture takes about 6 s, longer than a grey
  // lives (greyMs 3000), so the grey's place is the DOM reading above. The
  // frame is of messages that STAY: Output, Cutting list CSV raises a red
  // (the Check) and a yellow (boards unassigned) beside its grey, and today
  // they stand at the bottom-centre over the room, which is the owner's
  // complaint as a picture.
  await settleCamera(page);
  await downloadsTo(page);
  const s1 = await saidCount(page);
  await menu(page, 'Output', 'Cutting list CSV');
  await until(page, '[...document.querySelectorAll(\'[data-message]\')].some((el) => el.getBoundingClientRect().width > 0)', 2500);
  const t0 = Date.now();
  await shotNow(page, 'f01-stage.png');
  const glass2 = await messagesOnGlass(page);
  note('Output, Cutting list CSV (real clicks): what stays, framed', `said ${j(await saidSince(page, s1))}; frame taken in ${Date.now() - t0} ms; on the glass after it ${j(glass2.map((m) => `${m.column} ${m.level} ${m.left},${m.top}..${m.right},${m.bottom}`))}`);
  // T79 ACTION: F1 moves every level to ONE bottom-left column
  // ([data-messages="left"], expected; max-w-[26rem]) and adds the history bar
  // ([data-messages-history], expected: a one-line cc-panel reading
  // "Changes . N" at the very bottom-left; its click toggles the list
  // [data-messages-history-list] with a Clear button [data-messages-history-clear];
  // Escape collapses it). PROVES: the box read above has left < 0.3 * vw and
  // bottom > 0.75 * vh, inside the column, above the bar; the bar's count is
  // the number of messages shown since the page opened (window.__walkSaid);
  // the open list has the newest row first with HH:MM and the level dot.
  // Frames: f01-left.png (the message at the bottom-left), f01-history.png
  // (the list open).
  await t79Action(page, {
    hook: '[data-message-history-toggle]',
    gesture: 'add a shelf (the owner\'s gesture), then Output, Cutting list CSV (red, yellow and grey); read every [data-message] as it arrived, in [data-messages="left"] at the bottom-left; click the Changes bar [data-message-history-toggle]; read [data-message-history-list]; Escape',
    proves: 'every message box left < 0.3 vw, in the column anchored at the bottom-left; history rows = data-message-history = messages shown, newest first, HH:MM; Escape collapses; frames f01-left.png, f01-history.png',
    act: async () => {
      // The Check panel the stage's export opened stands over the right panel: shut by its own x first, so the shelf is really added.
      await checkClose(page);
      const add2 = await addShelvesUi(page, w.id, 1);
      check('Add items, Shelves, 1, Add (the owner\'s gesture, the Check panel shut first): the shelf added, and what it says', add2.typed && add2.pressed && add2.added === 1,
        'one shelf added by the real clicks (F1 moves the messages; it adds none to a shelf)', `section open ${add2.opened}, typed ${add2.typed}, Add pressed ${add2.pressed}; added ${add2.added}; shelves at ${j(add2.unit.items.filter((i) => i.kind === 'shelf').map((i) => `${i.pos} ${i.variant || ''}`.trim()))}; boards ${j(add2.unit.panels.filter((p) => /^SHELF|PARTITION/.test(p.id) && p.box).map((p) => `${p.id} y ${r1(p.box.y)}`))}; said ${j(add2.said)}`);
      // The three levels at once: Output, Cutting list CSV again (its red, yellow and grey), framed at once (a grey lives greyMs).
      const g1 = await glassCount(page);
      const s2 = await saidCount(page);
      await menu(page, 'Output', 'Cutting list CSV');
      await until(page, `(window.__walkGlass || []).length > ${g1}`, 3000);
      await shotNow(page, 'f01-left.png');
      const now = await messagesOnGlass(page);
      const col = await page.ask('(() => { const c = document.querySelector(\'[data-messages="left"]\'); if (!c) return null; const r = c.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), vw: window.innerWidth, vh: window.innerHeight }; })()');
      note('Output, Cutting list CSV again: what it said, and what stands on the glass after the frame', `said ${j(await saidSince(page, s2))}; on the glass ${j(now.map((m) => `${m.column} ${m.level} ${m.left},${m.top}..${m.right},${m.bottom}`))}; the column ${j(col)}`);
      // Every message box this page ever drew, read as it arrived (the MutationObserver), and those on the glass now.
      const all = await glassSince(page, 0);
      const off = all.filter((m) => !(m.column === 'left' && m.left < 0.3 * m.vw && m.bottom <= m.vh));
      const levels = [...new Set(all.map((m) => m.level))].sort();
      check('every message this page drew (grey, yellow, red) stood in the ONE bottom-left column', all.length > 0 && off.length === 0 && col && col.left < 0.05 * col.vw && col.bottom > 0.95 * col.vh && levels.length === 3,
        'each [data-message] inside [data-messages="left"], its left < 0.3 vw; the column at left-3 bottom-3; the three levels seen',
        `${all.length} box(es), levels ${j(levels)}; off the column ${j(off)}; the column ${j(col)}; the first ${j(all[0] || null)}`);
      const nearest = now.length ? now.reduce((a, b) => (b.bottom > a.bottom ? b : a)) : null;
      check('the message nearest the bar stands at the bottom-left, nothing at the centre', nearest && nearest.left < 0.3 * nearest.vw && nearest.bottom > 0.75 * nearest.vh && now.every((m) => m.right < 0.5 * m.vw + 60),
        'left < 0.3 vw, bottom > 0.75 vh; no box reaching past the middle of the screen', j(now));
      // THE CHANGES BAR: a real click on it, the list read, Escape.
      const bar = await page.text('[data-message-history-toggle]');
      const count = Number(await page.ask('(document.querySelector(\'[data-message-history]\') || { getAttribute: () => null }).getAttribute(\'data-message-history\')'));
      await page.press('[data-message-history-toggle]');
      const open = await until(page, 'Boolean(document.querySelector(\'[data-message-history-list]\'))', 2000);
      const rows = await page.ask('[...document.querySelectorAll(\'[data-message-history-row]\')].map((li) => ({ level: li.getAttribute(\'data-message-history-level\'), text: li.textContent.replace(/\\s+/g, \' \').trim().slice(0, 110) }))');
      const ats = await page.ask(`(${UI}.history || []).map((h) => h.at)`);
      const newestFirst = ats.every((t, k) => k === 0 || Number(t) <= Number(ats[k - 1]));
      const shown = (await page.ask('[...new Set((window.__walkSaid || []))]')).length;
      check('the Changes bar clicked: the list of the changes shown, newest first, HH:MM and the level', open && rows.length === count && rows.length > 0 && rows.length >= Math.min(shown, 50) && rows.every((r) => /^\d\d:\d\d/.test(r.text) && /^(red|yellow|grey)$/.test(r.level)) && newestFirst && /^Changes . \d+/.test(bar),
        `"Changes . N" with N = the rows = data-message-history (${count}), at least the ${shown} message(s) shown on this page, newest first, each "HH:MM" and its level`,
        `bar "${bar}"; open ${Boolean(open)}; ${rows.length} rows, newest first ${newestFirst}: ${j(rows.slice(0, 5))}`);
      await shot(page, 'f01-history.png');
      await key(page, 'Escape');
      const closed = await page.ask('(document.querySelector(\'[data-message-history]\') || { getAttribute: () => null }).getAttribute(\'data-message-history-open\')');
      check('Escape collapses the list', closed === 'false' && !(await page.has('[data-message-history-list]')), 'data-message-history-open false, the list gone', `open ${closed}`);
    },
  });
});

// --- F2 . A FULL-WIDTH SHELF ABOVE THE DIVIDER -------------------------------
await onPage('f02', 'A FULL-WIDTH SHELF ABOVE THE DIVIDER, THE THIRD BUTTON (PRO)', async (page) => {
  await stagePro(page, 'the shelf above the divider');
  const w = await placeUnit(page, 'wardrobe', { width: 1200 });
  const hid = await hideFronts(page);
  // A shelf, made FIX and set at 1000 (stored pos_mm, its underside).
  const add = await addShelvesUi(page, w.id, 1);
  const shelf = add.unit.items.find((i) => i.kind === 'shelf') || null;
  const fx = shelf ? await fixShelfAt(page, w.id, shelf.id, 1000) : null;
  check(`fronts ${hid}; Add items, Shelves, 1, Add; the shelf clicked (${fx && fx.sel ? `by ${fx.sel.by || 'already'}` : 'NOT selected'}), Height ${fx ? 1000 - fx.G : '?'} (the interior datum), FIX chip`,
    fx && fx.item && near(fx.item.pos, 1000, 0.5) && /fix/i.test(String(fx.item.variant || '')),
    'one FIX shelf, pos_mm 1000', `shelf ${j(fx && fx.item)}; chip ${fx && fx.chip}; typed ${fx && fx.typed}`);
  // The divider under it: Add items, Vertical partition (it runs from the base to the first FIX shelf above it).
  const part = await addPartitionUi(page, w.id);
  const u = await unitOf(page, w.id);
  const vp = u.panels.filter((p) => /^VPART|PARTITION-V|^VP/.test(p.id) || p.role === 'partition');
  const vtop = vp.length && vp[0].box ? vp[0].box.y + vp[0].box.h : null;
  check('Add items, Vertical partition, Add a vertical partition (real clicks)', part.pressed && u.items.some((i) => i.kind === 'partition') && vtop != null && near(vtop, 1000, 0.5),
    'a partition item; the divider from the base to the FIX shelf\'s underside (1000)', `items ${j(u.items.map((i) => `${i.kind}${i.pos != null ? '@' + i.pos : ''}${i.x != null ? ' x' + i.x : ''}`))}; boards ${j(vp.map((p) => `${p.id} x ${p.box && p.box.x} y ${p.box && p.box.y}..${p.box && r1(p.box.y + p.box.h)}`))}; said ${j(part.said)}`);
  // Add items on Shelves: today the bays only.
  await selectUnit(page, w.id);
  await sectionOpen(page, 'Add items');
  if (!(await page.has('[data-add-kind="shelves"][aria-expanded="true"]'))) await page.press('[data-add-kind="shelves"]');
  const bays = await page.ask('[...document.querySelectorAll(\'[data-section="Add items"] [data-zone]\')].map((b) => b.getAttribute(\'data-zone\') + \': \' + b.textContent.trim())');
  check('Add items, Shelves on the divided wardrobe: the bay picker', bays.length === 2, 'Bay 1 . N and Bay 2 . N', j(bays));
  await shot(page, 'f02-stage.png');
  await domFrame(page, 'document.querySelector(\'[data-section="Add items"]\')', 'f02-stage-buttons.png');
  // T79 ACTION: F2 adds a third button after the bays, `Above divider . <light>`
  // ([data-above-divider], expected; shown only when the divider ends below
  // the top). Hover it: the canvas highlights the band from span.to + G to the
  // top underside (onZoneHover('above'), UnitView). Type 2 in Add, press Add.
  // PROVES: two new shelf items with zone null, pos between 1018 and the top
  // underside with equal gaps (evenShelfPositions), none below 1018; the
  // three buttons framed (f02-buttons.png), the result f02-above.png.
  await t79Action(page, {
    hook: '[data-above-divider]',
    gesture: 'hover [data-above-divider] (the band lit), click it, Add 2, Add',
    proves: 'two zone:null shelves between 1018 and the top underside, equal gaps; frames f02-buttons.png, f02-above.png',
    act: async () => {
      // The right panel's Add items, Shelves: the bays and the third button (this panel draws no hover slab, for the bays
      // either: it mounts AddItems without onZoneHover, so the slab is the Add items WINDOW's, opened by the inner plus).
      const buttons = await page.ask('[...document.querySelectorAll(\'[data-section="Add items"] [data-zone], [data-section="Add items"] [data-above-divider]\')].map((b) => b.textContent.trim())');
      check('the right panel\'s Add items, Shelves: the third button after the bays', buttons.length === 3 && /^Bay 1/.test(buttons[0]) && /^Bay 2/.test(buttons[1]) && /^Above divider/.test(buttons[2]),
        'Bay 1 . N, Bay 2 . N, Above divider . N', j(buttons));
      await domFrame(page, 'document.querySelector(\'[data-section="Add items"]\')', 'f02-buttons.png');
      // The inner plus on the selected wardrobe (a real click where the scene says it is first): the Add items window.
      if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
      await selectUnit(page, w.id);
      let plus = await helperInUnit(page, w.id, '(u) => u.ccAddPlus === true');
      for (const [dx, dy] of [[120, 0], [-240, 0], [0, 120]]) { if (plus && plus.some((p) => p.first)) break; await orbitFree(page, dx, dy); await selectUnit(page, w.id); plus = await helperInUnit(page, w.id, '(u) => u.ccAddPlus === true'); }
      const hit = plus && plus.find((p) => p.first);
      if (hit) await clickWith(page, hit.x, hit.y);
      const W8 = '[data-modal-name="add-items"]';
      const win = await until(page, `Boolean(document.querySelector('${W8}'))`, 3000);
      if (win && !(await page.has(`${W8} [data-add-kind="shelves"][aria-expanded="true"]`))) await page.press(`${W8} [data-add-kind="shelves"]`);
      const inWin = await page.ask(`[...document.querySelectorAll('${W8} [data-zone], ${W8} [data-above-divider]')].map((b) => b.textContent.trim())`);
      await page.hover(`${W8} [data-above-divider]`);
      await page.sleep(600);
      const lit = await page.ask(`(() => { const v = window.__cc.views.room; let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(w.id)}) unit = o; });
        const slabs = []; if (unit) unit.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccHelper && o.geometry && o.geometry.type === 'BoxGeometry' && o.material && o.material.transparent) { const g = o.geometry.parameters; const p = o.position; slabs.push({ w: Math.round(g.width * 1000), h: Math.round(g.height * 1000), y0: Math.round((p.y - g.height / 2) * 1000), y1: Math.round((p.y + g.height / 2) * 1000) }); } });
        return { hint: ${UI}.zoneHint, slabs }; })()`);
      const G = fx ? fx.G : 18;
      const band = lit.slabs.find((sl) => near(sl.y0, 1000 + G, 1) && sl.h > 500) || null;
      check(`the inner plus clicked (${hit ? `pixel ${hit.x},${hit.y}` : 'NOT reached'}), the Add items window, Shelves, the third button pointed at (a real hover): the opening above the divider lit`,
        win && inWin.length === 3 && lit.hint === 'above' && band,
        `the window's Bay 1, Bay 2, Above divider; zoneHint 'above'; a full-width slab from ${1000 + G} (the FIX shelf's top face) to the top underside`,
        `window ${Boolean(win)}; buttons ${j(inWin)}; zoneHint ${j(lit.hint)}; slabs ${j(lit.slabs)}`);
      await shotNow(page, 'f02-above-lit.png');
      await page.press(`${W8} [data-above-divider]`);
      const hint = await textOf(page, `document.querySelector('${W8} [data-above-divider-hint]')`);
      const before = (await unitOf(page, w.id)).items.filter((i) => i.kind === 'shelf').map((i) => i.id);
      const field = `(() => { const s = [...document.querySelectorAll('${W8} span.cc-label')].find((x) => x.textContent.trim() === 'Add' && x.parentElement.querySelector('input')); return s ? s.parentElement.querySelector('input') : null; })()`;
      const typed = await typeInto(page, field, 2);
      const addBtn = await boxOf(page, `[...document.querySelectorAll('${W8} button.cc-btn-gold')].find((b) => b.offsetParent && b.textContent.trim() === 'Add' && !b.disabled)`);
      const s0 = await saidCount(page);
      if (addBtn) await clickWith(page, addBtn.x, addBtn.y);
      await until(page, `((${S}.units.find((x) => x.id === ${j(w.id)}).params.sections || [])[0] || { items: [] }).items.filter((i) => i.kind === 'shelf').length > ${before.length}`, 4000);
      await page.sleep(700);
      const u2 = await unitOf(page, w.id);
      const fresh = u2.items.filter((i) => i.kind === 'shelf' && !before.includes(i.id)).sort((a, b) => a.pos - b.pos);
      const topPanel = u2.panels.find((p) => p.id === 'TOP');
      const top = topPanel && topPanel.box ? topPanel.box.y : u2.h - G;
      // Clear gaps: the FIX shelf's top face, each new shelf (pos is its underside, + G its top face), the TOP's underside.
      const faces = [1000 + G, ...fresh.flatMap((i) => [i.pos, i.pos + G]), top];
      const gaps = []; for (let k = 0; k + 1 < faces.length; k += 2) gaps.push(r1(faces[k + 1] - faces[k]));
      const boards = fresh.map((i) => u2.panels.find((p) => p.part === 'SHELF' && p.box && near(p.box.y, i.pos, 0.5))).filter(Boolean);
      const vp = u2.panels.find((p) => /^VPART/.test(p.id));
      check(`Above divider pressed (hint "${hint}"), Add ${typed ? 2 : '?'} typed, Add`, fresh.length === 2 && fresh.every((i) => i.zone == null && i.pos >= 1000 + G) && gaps.length === 3 && Math.max(...gaps) - Math.min(...gaps) <= 1
        && boards.length === 2 && boards.every((p) => near(p.box.x, G, 3) && near(p.box.x + p.box.w, u2.w - G, 3)) && vp && near(vp.box.y + vp.box.h, 1000, 0.5),
        `two zone:null shelves between ${1000 + G} and the top underside ${top}, equal clear gaps, each board across the full width (x ${G}..${u2.w - G}, the shelf's side clearance aside), over the divider; the divider still ends at 1000`,
        `new ${j(fresh.map((i) => ({ id: i.id, zone: i.zone, pos: i.pos })))}; clear gaps ${j(gaps)}; boards ${j(boards.map((p) => `${p.id} x ${p.box.x}..${r1(p.box.x + p.box.w)} y ${p.box.y}`))}; divider ${vp ? `${vp.id} y ${vp.box.y}..${r1(vp.box.y + vp.box.h)}` : 'none'}; said ${j(await saidSince(page, s0))}`);
      if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
      await pieceFrame(page, w.id, [], 'f02-above.png');
    },
  });
});

// --- F3 . INTERNAL DRAWERS: 1 OR 2 COLUMNS ------------------------------------
await onPage('f03', 'INTERNAL DRAWERS: 1 OR 2 COLUMNS, THE DIVIDER AND THE CAP COME BY THEMSELVES (PRO)', async (page) => {
  await stagePro(page, 'the drawer columns');
  const w = await placeUnit(page, 'wardrobe', { width: 1200 });
  await selectUnit(page, w.id);
  await sectionOpen(page, 'Add items');
  if (!(await page.has('[data-add-kind="drawers"][aria-expanded="true"]'))) await page.press('[data-add-kind="drawers"]');
  if (await page.has('[data-drawer-mount="internal"]')) await page.press('[data-drawer-mount="internal"]');
  const count = '(() => { const s = [...document.querySelectorAll(\'[data-section="Add items"] span.cc-label\')].find((x) => x.textContent.trim() === \'Count\' && x.parentElement.querySelector(\'input\')); return s ? s.parentElement.querySelector(\'input\') : null; })()';
  const typed = await typeInto(page, count, 3);
  const state = await page.ask(`(() => { const m = document.querySelector('[data-drawer-mount="internal"]'); const c = (${count}); return { internal: m ? m.classList.contains('border-gold') : null, count: c ? c.value : null,
    zones: [...document.querySelectorAll('[data-drawer-zone]')].length, columns: Boolean(document.querySelector('[data-drawer-columns]')) }; })()`);
  check('the wardrobe selected, Add items, Drawers, Bare boxes, Count 3 (real clicks and keys)', typed && state.internal && String(state.count) === '3' && state.zones === 0,
    'the internal mount lit, 3 in Count, no Which bay picker (zones 0: no partition yet)', j(state));
  await shot(page, 'f03-stage.png');
  await domFrame(page, 'document.querySelector(\'[data-section="Add items"]\')', 'f03-stage-drawers.png');
  // T79 ACTION: F3 shows COLUMNS 1 | 2 beside HOW MANY on the internal mount of a
  // unit with no partition ([data-drawer-columns="1"] / [data-drawer-columns="2"],
  // expected) with the hint "2 columns: a divider mid-width, a stack in each
  // column, one fixed shelf over both." Press 2, then Add. PROVES (one undo):
  // a partition item at W / 2 (left face (W - G) / 2), three drawers in zone 0
  // and three in zone 1; the engine's ONE full-width PARTITION board x18..1182
  // over both stacks and VPART from the cap's top face to the top (never
  // through a box); Ctrl+Z takes all of it back in one step. Frames
  // f03-columns.png (3D, fronts hidden) and f03-cnc.png (CNC view).
  await t79Action(page, {
    hook: '[data-drawer-columns="2"]',
    gesture: 'click [data-drawer-columns="2"], Add; then Ctrl+Z once and Ctrl+Y',
    proves: 'partition at W/2, 3 + 3 drawers in zones 0 and 1, one PARTITION board x18..1182, VPART from its top face up; one undo; frames f03-columns.png, f03-cnc.png',
    act: async () => {
      const offered = await page.ask('[...document.querySelectorAll(\'[data-drawer-columns]\')].map((b) => b.getAttribute(\'data-drawer-columns\') + \':\' + b.getAttribute(\'aria-pressed\'))');
      await page.press('[data-drawer-columns="2"]');
      const hint = await textOf(page, 'document.querySelector(\'[data-drawer-columns-hint]\')');
      const pressed = await page.ask('(document.querySelector(\'[data-drawer-columns="2"]\') || { getAttribute: () => null }).getAttribute(\'aria-pressed\')');
      check('COLUMNS beside Count (1 and 2), 2 pressed (a real click): its hint', offered.length === 2 && pressed === 'true' && /2 columns: a divider mid-width, a stack in each column, one fixed shelf over both\./.test(hint || ''),
        'COLUMNS 1 | 2, 2 pressed, the hint "2 columns: a divider mid-width, a stack in each column, one fixed shelf over both."', `offered ${j(offered)}; 2 pressed ${pressed}; hint "${hint}"`);
      await domFrame(page, 'document.querySelector(\'[data-section="Add items"]\')', 'f03-columns-ask.png');
      const addBtn = await boxOf(page, '[...document.querySelectorAll(\'[data-section="Add items"] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add\' && !b.disabled)');
      const s0 = await saidCount(page);
      if (addBtn) await clickWith(page, addBtn.x, addBtn.y);
      await until(page, `((${S}.units.find((x) => x.id === ${j(w.id)}).params.sections || [])[0] || { items: [] }).items.filter((i) => i.kind === 'drawer').length >= 6`, 5000);
      await page.sleep(1200);
      const u = await unitOf(page, w.id);
      const G = 18;
      const parts = u.items.filter((i) => i.kind === 'partition');
      const drawers = u.items.filter((i) => i.kind === 'drawer');
      const caps = u.panels.filter((p) => p.part === 'PARTITION' || /-PART$/.test(p.id));
      const cap = caps.length === 1 ? caps[0] : null;
      const vp = u.panels.find((p) => /^VPART/.test(p.id)) || null;
      const boxes = u.panels.filter((p) => p.role === 'drawer_box' || /^D\d+-|^Z\d+-D/.test(p.id));
      // Material never enters material: no box overlaps the divider (x) below the cap.
      const through = vp ? boxes.filter((p) => p.box && p.box.x < vp.box.x + vp.box.w - 1e-6 && vp.box.x < p.box.x + p.box.w - 1e-6 && p.box.y < vp.box.y + vp.box.h - 1e-6 && vp.box.y < p.box.y + p.box.h - 1e-6).map((p) => p.id) : [];
      check('COLUMNS 2, Add (a real click): the divider, two stacks and ONE fixed board over both, by themselves',
        parts.length === 1 && near(parts[0].x, (u.w - G) / 2, 0.5) && drawers.filter((i) => i.zone === 0).length === 3 && drawers.filter((i) => i.zone === 1).length === 3
          && cap && near(cap.box.x, G, 0.5) && near(cap.box.x + cap.box.w, u.w - G, 0.5) && vp && near(vp.box.y, G, 0.5) && near(vp.box.y + vp.box.h, cap.box.y, 0.5) && through.length === 0,
        `one partition at x ${(u.w - G) / 2} (mid-width), 3 drawers in zone 0 and 3 in zone 1, ONE cap PARTITION x ${G}..${u.w - G}, VPART from the base (${G}) to the cap's underside, no box crossed`,
        `partitions ${j(parts.map((i) => i.x))}; drawers ${j(drawers.map((i) => `z${i.zone}`))}; caps ${j(caps.map((p) => `${p.id} x ${p.box && p.box.x}..${p.box && r1(p.box.x + p.box.w)} y ${p.box && p.box.y}`))}; divider ${vp ? `${vp.id} y ${vp.box.y}..${r1(vp.box.y + vp.box.h)}` : 'none'}; boxes through the divider ${j(through)}; said ${j(await saidSince(page, s0))}; warnings ${j(u.warnings)}`);
      if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
      await hideFronts(page);
      await pieceFrame(page, w.id, [], 'f03-columns.png');
      await selectUnit(page, w.id);
      const cnc = await viewMode(page, 'cnc');
      const sheet = await page.ask('[...document.querySelectorAll(\'[data-cnc-part]\')].map((g) => g.getAttribute(\'data-cnc-part\'))');
      check(`the CNC view (${cnc.by}): the cap and the divider on the sheet`, cnc.ok && sheet.includes('PARTITION') && sheet.some((id) => /^VPART/.test(id)),
        'PARTITION and VPART-1 among the sheet\'s parts', `${sheet.length} parts: ${sheet.join(', ')}`);
      await shot(page, 'f03-cnc.png');
      await viewMode(page, '3d');
      // ONE undo takes the divider and both stacks back; ONE redo returns them (the store's one batch).
      await page.sleep(800);
      await page.key('z', { ctrl: true });
      await page.sleep(1200);
      const undone = await unitOf(page, w.id);
      const back = (x) => `${x.items.filter((i) => i.kind === 'partition').length} partition(s), ${x.items.filter((i) => i.kind === 'drawer').length} drawer(s)`;
      check('Ctrl+Z once (the keyboard): the divider and both stacks go together', undone.items.filter((i) => i.kind === 'partition' || i.kind === 'drawer').length === 0,
        '0 partitions, 0 drawers after ONE undo', back(undone));
      await page.key('y', { ctrl: true });
      await page.sleep(1200);
      const redone = await unitOf(page, w.id);
      check('Ctrl+Y once: all of it back', redone.items.filter((i) => i.kind === 'partition').length === 1 && redone.items.filter((i) => i.kind === 'drawer').length === 6,
        '1 partition, 6 drawers after ONE redo', back(redone));
    },
  });
});

// --- F4 / F5 / F6 . THE NOTCH WINDOW ON A BUD 600 ------------------------------
/** The stage F4, F5 and F6 share: a BUD 600 from the library, CUT CORNER, the lit BL corner, the notch window. */
async function notchStage(page, name) {
  await stagePro(page, `the notch (${name})`);
  const b = await placeUnit(page, 'bud', { width: 600 });
  const w = await openNotchWindow(page, b.id, 'BL');
  check(`the BUD selected, Carcass, CUT CORNER (the real button), the lit BL corner clicked (${w.handle ? `pixel ${w.handle.x},${w.handle.y}` : 'not reached'})`,
    w.lit === b.id && w.asked, 'the notch window [data-testid=notch-ask] open, WIDTH 200, DEPTH 200, HEIGHT full',
    `notchPick ${w.lit}; BL handles ${w.handles}; window ${w.asked}; fields ${j(w.fields)}; help "${w.help}"`);
  return { b, w };
}

await onPage('f04', 'THE NOTCH FROM THE TOP, A NEGATIVE HEIGHT (PRO)', async (page) => {
  const { b, w } = await notchStage(page, 'f04');
  note('the help line in the notch window', w.help || 'none read');
  await shot(page, 'f04-stage.png');
  await domFrame(page, 'document.querySelector(\'[data-testid="notch-ask"]\')', 'f04-stage-window.png');
  // T79 ACTION: F4: the HEIGHT field [data-notch-field="height"] takes -300;
  // the help line reads "WIDTH along the back, DEPTH into the carcass, HEIGHT
  // from the floor; 0 runs top to bottom; a negative HEIGHT cuts from the top
  // (e.g. -500)." Type -300 in HEIGHT, press CUT [data-testid="notch-cut"].
  // PROVES: params.notch {corner BL, w 200, d 200, h -300}; BUL's cnc.notch fc
  // x0y1 (the corner at the TOP), the TOP cut (not the BOTTOM), a FLOOR board
  // under the cut instead of a LID over it, the LISP NUMBERS of D21 board by
  // board (test/turn79-f04); the refusal below minInteriorMm in words. Frames
  // f04-top-3d.png and f04-top-cnc.png.
  await t79Action(page, {
    hook: null,
    gesture: 'the help line names a negative HEIGHT; HEIGHT -300 typed, CUT',
    proves: 'notch h -300; BUL notch at x0y1; TOP cut, FLOOR under the cut; frames f04-top-3d.png, f04-top-cnc.png',
    act: async () => {
      const help = await textOf(page, 'document.querySelector(\'[data-testid="notch-ask"] [data-testid="notch-help"]\')');
      check('the notch window\'s help line (the small information)', help === 'WIDTH along the back, DEPTH into the carcass, HEIGHT from the floor; 0 runs top to bottom; a negative HEIGHT cuts from the top (e.g. -500).',
        '"WIDTH along the back, DEPTH into the carcass, HEIGHT from the floor; 0 runs top to bottom; a negative HEIGHT cuts from the top (e.g. -500)."', help || 'none');
      const typed = await typeInto(page, 'document.querySelector(\'[data-testid="notch-ask"] [data-notch-field="height"]\')', -300);
      await page.sleep(900);
      const u = await unitOf(page, b.id);
      const by = (id) => u.panels.find((p) => p.id === id) || null;
      const [bul, bur, top, bottom, back, floor] = ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'FLOOR'].map(by);
      const said = await page.ask('(document.querySelector(\'[data-testid="notch-said"]\') || {}).textContent || null');
      check(`HEIGHT -300 typed (${typed ? 'a real click and keys' : 'NOT typed'}), Enter: the notch cut from the TOP`,
        u.notch && u.notch.corner === 'BL' && u.notch.h === -300 && j(u.notchBoards) === j(['RETURN', 'STEP', 'FLOOR']) && !by('LID')
          && bul && bul.cncNotch && bul.cncNotch.fc === 'x1y1' && bul.cncNotch.nh === 300 && top && top.cncNotch && top.cncNotch.fc === 'x0y1'
          && bottom && !bottom.cncNotch && !bottom.notch && back && back.cncNotch && back.cncNotch.fc === 'x0y1' && floor && near(floor.w, 200, 0.5) && near(floor.h, 200, 0.5) && bur && !bur.cncNotch,
        'params.notch BL 200 x 200 h -300; boards RETURN, STEP, FLOOR (no LID); BUL cnc.notch x1y1 (its rear TOP corner) 200 x 300; the TOP cut (x0y1), the BOTTOM the parent\'s; the BACK x0y1; FLOOR 200 x 200; BUR untouched',
        `notch ${j(u.notch)}; boards ${j(u.notchBoards)} (${sayPanels(u, /^(RETURN|STEP|LID|FLOOR)$/)}); BUL ${j(bul && bul.cncNotch)}; TOP ${j(top && top.cncNotch)}; BOTTOM ${j(bottom && bottom.cncNotch)}; BACK ${j(back && back.cncNotch)}; BUR ${j(bur && bur.cncNotch)}; refusal ${j(said)}; warnings ${j(u.warnings)}`);
      await orbitFree(page, -160, 60);
      await pieceFrame(page, b.id, [], 'f04-top-3d.png');
      await selectUnit(page, b.id);
      const cnc = await viewMode(page, 'cnc');
      await shot(page, 'f04-top-cnc.png');
      if (cnc.ok) await domFrame(page, 'document.querySelector(\'[data-cnc-part="BUL"]\')', 'f04-top-cnc-bul.png', 16, 2);
      await viewMode(page, '3d');
    },
  });
});

await onPage('f05', 'THE HORIZONTAL NOTCH, ALL FOUR EDGES OF THE SIDE (PRO)', async (page) => {
  const { b } = await notchStage(page, 'f05');
  await shot(page, 'f05-stage.png');
  // The CUT CORNER row itself (where CUT EDGE is to stand), framed with the window shut.
  await closeModals(page);
  await selectUnit(page, b.id);
  await sectionOpen(page, 'Carcass');
  const row = await page.ask(`[...document.querySelectorAll('[data-notch-row="${b.id}"] button')].map((x) => (x.getAttribute('data-testid') || '?') + ': ' + x.textContent.trim())`);
  note('the notch row', j(row));
  await domFrame(page, `document.querySelector('[data-notch-row="${b.id}"]')`, 'f05-stage-row.png', 16, 3);
  // T79 ACTION: F5: a second button in NotchRow, CUT EDGE ([data-testid="cut-edge"],
  // expected), opening EdgeNotchWindow ([data-testid="edge-notch-ask"],
  // expected: EDGE with the four TB / BB / TF / BF, DEPTH, HEIGHT, the help
  // line "A rebate along the whole edge: skirting at the bottom-back, coving at
  // the top-back."); the scene lights the four horizontal edges of the unit
  // (userData.ccNotchEdge, expected, as ccNotchCorner for the corners). Pick
  // BB, DEPTH 20, HEIGHT 120, CUT; then TB 50 / 100 on a second BUD.
  // PROVES: params.edgeNotch {edge BB, d 20, h 120}; BUL / BUR carry the L
  // corner d x h at the back-bottom with ONE open CORNER_4MM L per inner
  // corner; the BACK shorter by 120 from the bottom; the BOTTOM narrower by
  // 20 at the back; no closing boards; a corner notch overlapping it refused
  // in words. Frames f05-bb-3d.png, f05-bb-cnc.png, f05-tb-3d.png, f05-tb-cnc.png.
  await t79Action(page, {
    hook: '[data-testid="cut-edge"]',
    gesture: 'CUT EDGE, the BB edge lit and clicked (or picked in EDGE), DEPTH 20, HEIGHT 120, CUT; then TB 50 / 100',
    proves: 'edgeNotch BB 20 x 120: BUL/BUR L corners, one CORNER_4MM L each, BACK -120, BOTTOM -20 at the back; frames f05-bb-*.png, f05-tb-*.png',
    act: async () => {
      const u0 = await unitOf(page, b.id);
      const parent = Object.fromEntries(u0.panels.map((p) => [p.id, p]));
      const row2 = await page.ask(`[...document.querySelectorAll('[data-edge-notch-row="${b.id}"] button')].map((x) => (x.getAttribute('data-testid') || '?') + ': ' + x.textContent.trim())`);
      await domFrame(page, `document.querySelector('[data-notch-row="${b.id}"]').parentElement`, 'f05-row.png', 16, 3);
      /** One edge cut through the window: the edge's handle clicked, DEPTH and HEIGHT typed, Enter. */
      const cutEdge = async (edge, d, h) => {
        const win = await openEdgeWindow(page, b.id, edge);
        check(`CUT EDGE (the real button), the lit ${edge} handle clicked (${win.handle ? `pixel ${win.handle.x},${win.handle.y}` : 'not reached'}): the edge window`,
          win.lit === b.id && win.asked && win.form && win.form.edge === edge && j(win.form.choices) === j(['TB', 'BB', 'TF', 'BF'])
            && win.form.help === 'A rebate along the whole edge: skirting at the bottom-back, coving at the top-back.',
          `[data-testid=edge-notch-ask] open on EDGE ${edge}, the four TB BB TF BF, DEPTH, HEIGHT, the help line`,
          `edgeNotchPick ${win.lit}; ${edge} handles ${win.handles}; window ${win.asked}; form ${j(win.form)}`);
        if (!win.asked) return null;
        if (edge === 'BB') await domFrame(page, 'document.querySelector(\'[data-testid="edge-notch-ask"]\')', 'f05-window.png', 12, 2);
        const tD = await typeOnly(page, 'document.querySelector(\'[data-testid="edge-notch-ask"] [data-edge-notch-field="depth"]\')', d);
        const tH = await typeOnly(page, 'document.querySelector(\'[data-testid="edge-notch-ask"] [data-edge-notch-field="height"]\')', h);
        const s0 = await saidCount(page);
        await key(page, 'Enter');
        await page.sleep(1200);
        const said = await page.ask('(document.querySelector(\'[data-testid="edge-notch-said"]\') || {}).textContent || null');
        return {
          u: await unitOf(page, b.id), typed: tD && tH, said, msgs: await saidSince(page, s0), open: await page.has('[data-testid="edge-notch-ask"]'),
        };
      };
      const by = (u, id) => u.panels.find((p) => p.id === id) || null;
      // (a) BB 20 x 120: a skirting board at the back of the floor.
      const bb = await cutEdge('BB', 20, 120);
      if (bb) {
        const u = bb.u; const [bul, bur, bottom, back, top] = ['BUL', 'BUR', 'BOTTOM', 'BACK', 'TOP'].map((id) => by(u, id));
        check('DEPTH 20, HEIGHT 120 typed, Enter: the BB rebate along the whole width',
          u.edgeNotch && u.edgeNotch.edge === 'BB' && u.edgeNotch.d === 20 && u.edgeNotch.h === 120 && !bb.open && !bb.said
            && bul && j(bul.cncNotch) === j({ fc: 'x1y0', nw: 20, nh: 120 }) && bul.marks === 1 && bur && j(bur.cncNotch) === j({ fc: 'x0y0', nw: 20, nh: 120 }) && bur.marks === 1
            && back && near(back.h, parent.BACK.h - 120, 0.5) && bottom && near(Math.min(bottom.w, bottom.h), Math.min(parent.BOTTOM.w, parent.BOTTOM.h) - 20, 0.5)
            && top && near(top.w, parent.TOP.w, 0.5) && near(top.h, parent.TOP.h, 0.5) && u.panels.length === u0.panels.length,
          'params.edgeNotch BB 20 / 120; BUL x1y0 and BUR x0y0, 20 x 120, one CORNER_4MM L each; the BACK 120 shorter; the BOTTOM 20 narrower at the back; the TOP the parent\'s; no closing boards',
          `edgeNotch ${j(u.edgeNotch)}; derived ${j(u.edgeCut)}; BUL ${j(bul && bul.cncNotch)} marks ${bul && bul.marks}; BUR ${j(bur && bur.cncNotch)} marks ${bur && bur.marks}; BACK ${back && `${back.w}x${back.h}`} (was ${parent.BACK.w}x${parent.BACK.h}); BOTTOM ${bottom && `${bottom.w}x${bottom.h}`} (was ${parent.BOTTOM.w}x${parent.BOTTOM.h}); boards ${u.panels.length} (were ${u0.panels.length}); refusal ${j(bb.said)}; said ${j(bb.msgs)}`);
        await orbitFree(page, -200, 80);
        await pieceFrame(page, b.id, [], 'f05-bb-3d.png');
        await selectUnit(page, b.id);
        const cnc = await viewMode(page, 'cnc');
        await shot(page, 'f05-bb-cnc.png');
        if (cnc.ok) await domFrame(page, 'document.querySelector(\'[data-cnc-part="BUL"]\')', 'f05-bb-cnc-bul.png', 16, 2);
        await viewMode(page, '3d');
      }
      // (b) TB 50 x 100 (a coving), cut on the same BUD: the one edge notch the unit carries is replaced.
      const tb = await cutEdge('TB', 50, 100);
      if (tb) {
        const u = tb.u; const [bul, bur, bottom, back, top] = ['BUL', 'BUR', 'BOTTOM', 'BACK', 'TOP'].map((id) => by(u, id));
        check('the TB handle, DEPTH 50, HEIGHT 100, Enter: the coving rebate replaces the skirting',
          u.edgeNotch && u.edgeNotch.edge === 'TB' && u.edgeNotch.d === 50 && u.edgeNotch.h === 100 && !tb.open && !tb.said
            && bul && j(bul.cncNotch) === j({ fc: 'x1y1', nw: 50, nh: 100 }) && bul.marks === 1 && bur && bur.cncNotch && bur.cncNotch.fc === 'x0y1' && bur.marks === 1
            && back && near(back.h, parent.BACK.h - 100, 0.5) && top && near(Math.min(top.w, top.h), Math.min(parent.TOP.w, parent.TOP.h) - 50, 0.5)
            && bottom && near(bottom.w, parent.BOTTOM.w, 0.5) && near(bottom.h, parent.BOTTOM.h, 0.5) && u.panels.length === u0.panels.length,
          'params.edgeNotch TB 50 / 100; BUL x1y1 and BUR x0y1, 50 x 100, one CORNER_4MM L each; the BACK 100 shorter; the TOP 50 narrower at the back; the BOTTOM the parent\'s again; no closing boards',
          `edgeNotch ${j(u.edgeNotch)}; derived ${j(u.edgeCut)}; BUL ${j(bul && bul.cncNotch)} marks ${bul && bul.marks}; BUR ${j(bur && bur.cncNotch)} marks ${bur && bur.marks}; BACK ${back && `${back.w}x${back.h}`}; TOP ${top && `${top.w}x${top.h}`} (was ${parent.TOP.w}x${parent.TOP.h}); BOTTOM ${bottom && `${bottom.w}x${bottom.h}`}; refusal ${j(tb.said)}; said ${j(tb.msgs)}`);
        await orbitFree(page, -120, -60);
        await pieceFrame(page, b.id, [], 'f05-tb-3d.png');
        await selectUnit(page, b.id);
        const cnc = await viewMode(page, 'cnc');
        await shot(page, 'f05-tb-cnc.png');
        if (cnc.ok) await domFrame(page, 'document.querySelector(\'[data-cnc-part="BUL"]\')', 'f05-tb-cnc-bul.png', 16, 2);
        await viewMode(page, '3d');
      }
      note('the CUT EDGE row', j(row2));
    },
  });
});

await onPage('f06', 'THE DIA 3 ROWS ON THE BACK ARE NOT LOST TO A NOTCH OR A RECESS (PRO)', async (page) => {
  const { b } = await notchStage(page, 'f06');
  const u0 = await unitOf(page, b.id);
  note('the BACK\'s dia 3 screws before the cut', `${u0.screws.BACK || 0} (BUL ${u0.screws.BUL || 0}, BUR ${u0.screws.BUR || 0})`);
  await shot(page, 'f06-stage.png');
  // T79 ACTION: F6 has no control of its own: the cut is the window's CUT (Enter
  // in WIDTH, BL 200 x 200 full). PROVES: the BACK keeps 14 dia 3 screws (the
  // column on the notched edge now runs along the RETURN), BUL / BUR 6 / 6;
  // the CNC view of the BACK shows them (DrillRings); today the column is
  // dropped (10). Frame f06-back-cnc.png. The recess case (rows on all four
  // window edges) is test/turn79-f06's, not a walk.
  await t79Action(page, {
    hook: null,
    gesture: 'Enter in the notch window (BL 200 x 200 full); the CNC view, the BACK framed',
    proves: 'BACK dia 3 screws 14 (BUL 6, BUR 6); frame f06-back-cnc.png',
    act: async () => {
      const cut = await cutNotch(page, b.id);
      check('Enter cuts BL 200 x 200 full: the BACK keeps its fourteen', cut.u.notch && (cut.u.screws.BACK || 0) === 14 && (cut.u.screws.BUL || 0) === 6 && (cut.u.screws.BUR || 0) === 6,
        'BACK 14, BUL 6, BUR 6', `notch ${j(cut.u.notch)}; screws ${j(cut.u.screws)}; said ${j(cut.said)}`);
      await viewMode(page, 'cnc');
      await domFrame(page, 'document.querySelector(\'[data-cnc-part="BACK"]\')', 'f06-back-cnc.png', 16, 2);
      await viewMode(page, '3d');
    },
  });
});

// --- F7 . THE CORNER MARK: A CHECK, NOT A CHANGE (COMPLETE) ------------------
/**
 * THE 1710h LAW IN THE FILE: Output > CNC / DXF on the selected unit (the menu,
 * real clicks; Export anyway clicked when the gate holds parts back), the ZIP
 * opened, and on every DXF the CORNER_4MM entities counted against the inner
 * corners of that board's NOMINAL outline (meta.notch.outline for a cut side,
 * plan or shelf; the BACK's cnc.outline when it is part-height), counted by
 * this walk's own cross product, not the engine's. Returns the verdict.
 */
async function cornerMarkCheck(page, unitId, tag) {
  const u = await unitOf(page, unitId);
  const nominal = await page.ask(`(() => { const r = ${S}.unitResult(${j(unitId)}); const out = {};
    for (const p of r.panels) { if (!p.meta || !p.meta.notch) continue; let pts = p.meta.notch.outline || null;
      if (!pts && p.part === 'BACK' && p.cnc && p.cnc.notch) pts = p.cnc.outline; out[p.id] = pts ? pts.map((q) => [q[0], q[1]]) : null; }
    return out; })()`);
  const expected = {};
  for (const [id, pts] of Object.entries(nominal)) expected[id] = pts ? reentrant(pts).length : 0;
  note(`${tag}: the inner corners each notched board must carry, from its nominal outline`, j(expected));
  const legMm = await profileNum(page, 'cnc.cornerMark.legMm');
  const outlineLayer = await profileNum(page, 'puzzle.layers.outline');
  const layerName = (await profileNum(page, 'puzzle.layers.cornerMark')) || 'CORNER_4MM';
  const dir = await downloadsTo(page);
  const said0 = await saidCount(page);
  let file = await captureDownload(dir, () => menu(page, 'Output', 'CNC / DXF'), page);
  // The export gate may hold a part back (its message carries Export anyway, a real click on it).
  const anyway = await boxOf(page, '[...document.querySelectorAll(\'[data-message-action]\')].find((b) => b.offsetParent && /Export anyway/.test(b.textContent))');
  if (anyway) {
    const second = await captureDownload(dir, () => clickWith(page, anyway.x, anyway.y), page);
    note(`${tag}: the export gate held parts back, Export anyway clicked`, `first ZIP ${file ? file.split('/').pop() : 'none'}; second ${second ? second.split('/').pop() : 'none'}`);
    if (second) file = second;
  }
  const said = await saidSince(page, said0);
  check(`${tag}: Output, CNC / DXF (the menu, real clicks): the browser saves a ZIP`, Boolean(file) && /\.zip$/i.test(file || ''),
    'one .zip in the download folder', `${file ? file.split('/').pop() : 'nothing saved within 30 s'}; said ${j(said)}`);
  if (!file) return { ok: false, perBoard: [] };
  const zip = await JSZip.loadAsync(readFileSync(file));
  const names = Object.keys(zip.files).filter((n) => /\.dxf$/i.test(n));
  note(`${tag}: the ZIP`, `${names.length} DXF files: ${names.join(', ')}`);
  const perBoard = [];
  let closedAll = 0; let linesAll = 0; let aciSeen = null; let total = 0; let lawOk = true;
  const missing = Object.entries(expected).filter(([id, n]) => n > 0 && !names.includes(dxfFileName(u.num, id))).map(([id]) => id);
  for (const n of names) {
    const dxf = parseDxf(await zip.files[n].async('string'));
    if (dxf.layers[layerName] != null) aciSeen = dxf.layers[layerName];
    const marks = dxf.polys.filter((p) => p.layer === layerName);
    const lines = dxf.lines.filter((l) => l.layer === layerName).length;
    const closed = marks.filter((p) => p.closed).length;
    const panelId = u.panels.map((p) => p.id).find((id) => dxfFileName(u.num, id) === n) || null;
    const outline = dxf.polys.filter((p) => p.layer === outlineLayer && p.closed).sort((x, y) => y.pts.length - x.pts.length)[0] || null;
    const onVertex = (q) => Boolean(outline && outline.pts.some((v) => Math.abs(v[0] - q[0]) < 0.01 && Math.abs(v[1] - q[1]) < 0.01));
    const shapes = marks.map((m) => {
      const [p0, v, p2] = m.pts;
      const l1 = p0 && v ? Math.hypot(p0[0] - v[0], p0[1] - v[1]) : 0;
      const l2 = p2 && v ? Math.hypot(p2[0] - v[0], p2[1] - v[1]) : 0;
      const dot = p0 && v && p2 ? ((p0[0] - v[0]) * (p2[0] - v[0]) + (p0[1] - v[1]) * (p2[1] - v[1])) / ((l1 * l2) || 1) : 1;
      return {
        open: !m.closed, vertices: m.pts.length, legs: [r1(l1), r1(l2)], square: Math.abs(dot) < 1e-3, onCorner: v ? onVertex(v) : false, corner: v ? v.map(r1) : null, kind: m.kind,
      };
    });
    const corners = new Set(shapes.map((x) => j(x.corner))).size;
    const want = panelId && expected[panelId] != null ? expected[panelId] : 0;
    const good = shapes.every((x) => x.open && x.vertices === 3 && x.square && x.onCorner && x.legs.every((l) => l > 0 && l <= legMm + 1e-6))
      && marks.length === want && corners === marks.length && closed === 0 && lines === 0;
    if (marks.length || want) {
      perBoard.push({
        file: n, panel: panelId, want, marks: marks.length, corners, closed, lines, shapes, good,
      });
    }
    if (!good) lawOk = false;
    closedAll += closed; linesAll += lines; total += marks.length;
  }
  for (const p of perBoard) {
    check(`${tag}: ${p.file} (${p.panel || 'no panel'}) on ${layerName}`, p.good,
      `${p.want} open polyline(s) of 3 vertices, one per inner corner, the middle vertex ON the outline's corner, legs square and <= ${legMm}; no closed shape, no LINE`,
      `${p.marks} polyline(s) at ${p.corners} corner(s): ${j(p.shapes)}; closed ${p.closed}; LINEs ${p.lines}`);
  }
  const expTotal = Object.values(expected).reduce((x, y) => x + y, 0);
  const ok = lawOk && missing.length === 0 && total === expTotal && closedAll === 0 && linesAll === 0 && aciSeen === 53;
  check(`${tag}: the layer row and the totals`, ok,
    `${expTotal} open L polylines on ${Object.values(expected).filter((x) => x > 0).length} board(s), none closed, no LINE, every board with an inner corner in the ZIP, layer ${layerName} ACI 53`,
    `${total} open L polyline(s) on ${perBoard.filter((p) => p.marks).length} board(s); closed ${closedAll}; LINEs ${linesAll}; boards missing from the ZIP ${j(missing)}; ACI ${aciSeen}`);
  return {
    ok, total, expTotal, closedAll, linesAll, aci: aciSeen, perBoard, layerName,
  };
}

// --- F7 . THE CORNER MARK: A CHECK, NOT A CHANGE (COMPLETE) ------------------
await onPage('f07', 'THE CORNER MARK: ONE OPEN L PER INNER CORNER ON CORNER_4MM (PRO, a check)', async (page) => {
  const { b } = await notchStage(page, 'f07');
  // (a) THE WALK'S CASE: BL 200 x 200, full height (the window's defaults, Enter).
  const cut = await cutNotch(page, b.id);
  const u = cut.u;
  check('Enter in the notch window: BL 200 x 200 full is cut', u.notch && u.notch.corner === 'BL' && u.notch.w === 200 && u.notch.d === 200 && !u.notch.h,
    'params.notch BL 200 x 200, h 0', `notch ${j(u.notch)}; boards stamped ${j(u.panels.filter((p) => p.notch).map((p) => p.id))}; refusal ${j(cut.refusal)}; said ${j(cut.said)}`);
  await shot(page, 'f07-stage.png');
  const full = await cornerMarkCheck(page, b.id, 'full height');
  if (await page.has('[data-check-panel]')) await checkClose(page);
  const cnc = await viewMode(page, 'cnc');
  await shot(page, 'f07-cnc.png');
  const marked = full.perBoard.find((p) => p.marks) || null;
  if (cnc.ok && marked && marked.panel) await domFrame(page, `document.querySelector('[data-cnc-part="${marked.panel}"]')`, 'f07-cnc-part.png', 16, 2);
  await viewMode(page, '3d');
  // (b) A PART-HEIGHT NOTCH, the same corner 300 high (the window reopened on
  // BL, HEIGHT typed): BUL, the BOTTOM and the BACK are L-shaped now.
  const w2 = await openNotchWindow(page, b.id, 'BL');
  let part = null;
  if (w2.asked) {
    await typeInto(page, 'document.querySelector(\'[data-testid="notch-ask"] [data-notch-field="height"]\')', 300);
    await page.sleep(900);
    if (await page.has('[data-testid="notch-ask"]')) await page.press('[data-testid="notch-cut"]');
    await page.sleep(900);
  }
  const u2 = await unitOf(page, b.id);
  check('CUT CORNER again, the lit BL corner, HEIGHT 300 typed, Enter: a part-height notch', u2.notch && u2.notch.h === 300,
    'params.notch BL 200 x 200 x 300', `window ${w2.asked} (${j(w2.fields)}); notch ${j(u2.notch)}; boards ${sayPanels(u2, /RETURN|STEP|LID/)}`);
  if (u2.notch && u2.notch.h === 300) {
    part = await cornerMarkCheck(page, b.id, 'part height 300');
    if (await page.has('[data-check-panel]')) await checkClose(page);
    const cnc2 = await viewMode(page, 'cnc');
    await shot(page, 'f07-cnc-part-height.png');
    const bul = part.perBoard.find((p) => p.panel === 'BUL' && p.marks) || part.perBoard.find((p) => p.marks);
    if (cnc2.ok && bul && bul.panel) await domFrame(page, `document.querySelector('[data-cnc-part="${bul.panel}"]')`, `f07-cnc-${bul.panel.toLowerCase()}.png`, 16, 2);
    await viewMode(page, '3d');
  }
  const both = full.ok && (!part || part.ok);
  check('F7 VERDICT: the 1710h law in the exported DXF', both && part != null,
    'on CORNER_4MM exactly one open polyline of three vertices per inner corner, no closed shape, layer aci 53, for the full-height and the part-height notch',
    `full height: ${full.total} open L(s) for ${full.expTotal} inner corner(s), closed ${full.closedAll}, LINEs ${full.linesAll}, aci ${full.aci}`
    + `${part ? `; part height 300: ${part.total} open L(s) for ${part.expTotal} inner corner(s) (${part.perBoard.filter((p) => p.marks).map((p) => `${p.panel} ${p.marks}`).join(', ')}), closed ${part.closedAll}, LINEs ${part.linesAll}, aci ${part.aci}` : '; part height not walked'}`
    + `; ${both ? 'F7 verified, no change' : 'THE LAW DOES NOT HOLD'}`);
});

// --- F8 . A NOTCH AND A RECESS ON THE SAME CARCASS ---------------------------
/** A BUD 600 and a recess over [unit.x + from, unit.x + to] of its wall (depth 150, floor to ceiling unless a band is asked). */
async function budInRecess(page, {
  from, to, depth = 150, bottom = null, top = null, endPanel = null,
}) {
  const b = await placeUnit(page, 'bud', { width: 600 });
  let endBefore = null;
  if (endPanel) {
    await selectUnit(page, b.id);
    await sectionOpen(page, 'Construction');
    const label = endPanel === 'R' ? '+ Right' : '+ Left';
    const btn = await boxOf(page, `[...document.querySelectorAll('[data-section="Construction"] button')].find((x) => x.offsetParent && x.textContent.trim() === ${j(label)} && !x.disabled)`);
    if (btn) await clickWith(page, btn.x, btn.y);
    await until(page, `(${S}.units.find((x) => x.id === ${j(b.id)}).params.end_panels || []).some((e) => e.side === ${j(endPanel)})`, 4000);
    const ue = await unitOf(page, b.id);
    check(`Construction, End panels, ${label} (a real click)`, ue.endPanels.includes(endPanel), `end_panels has ${endPanel}`, `end_panels ${j(ue.endPanels)}; boards ${sayPanels(ue, /^END/)}`);
    endBefore = ue.panels.find((p) => /^END/.test(p.id)) || null;
  }
  const x0 = b.x + from;
  const rc = await recessPro(page, {
    x: x0, width: to - from, depth, bottom, top, wall: b.wall,
  });
  await recessDone(page);
  await page.sleep(900);
  const u = await unitOf(page, b.id);
  check(`Settings, Room setup..., the elevation's Top, Add recess, its row: Width ${to - from}, From the left ${x0}, Depth ${depth}${bottom != null ? `, Bottom ${bottom}` : ''}${top != null ? `, Top ${top}` : ''}; Done`,
    rc.recess && near(rc.recess.x_mm, x0, 0.5) && near(rc.recess.width, to - from, 0.5) && near(rc.recess.depth, depth, 0.5) && rc.wall === b.wall,
    `a recess on wall ${b.wall + 1} over x ${x0}..${x0 + to - from} (the unit's ${from}..${to}), ${depth} deep`,
    `room window ${rc.opened}; elevation wall ${rc.wall}; recess ${j(rc.recess)}; typed ${j(rc.typed)}; unit x ${u.x}..${u.x + u.w}, depth ${u.d}, recess_mm ${u.recess}; extension ${j(u.extension)}; warnings ${j(u.warnings)}; said ${j(rc.said)}`);
  return { b: u, recess: rc.recess, endBefore };
}

await onPage('f08', 'A NOTCH AND A RECESS ON THE SAME CARCASS (PRO)', async (page) => {
  await stagePro(page, 'the notch and the recess');
  const { b } = await budInRecess(page, { from: 310, to: 910 });
  note('the extension before any notch (the band 310..600 of the unit, KIT_RECESS)', `extension ${j(b.extension)}; boards ${sayPanels(b, /RETURN|EXT|FLOOR|LID/)}`);
  const w = await openNotchWindow(page, b.id, 'BL');
  check('CUT CORNER, the lit BL corner (real clicks): the notch window', w.asked, 'the notch window open', `window ${w.asked}; fields ${j(w.fields)}`);
  await shot(page, 'f08-stage.png');
  // T79 ACTION: F8: Enter cuts BL 200 x 200 full on the carcass that already
  // grows into the recess (band 310..600, no overlap with the notch's 0..200
  // along the back). PROVES: params.notch BL AND derived.extension both stand
  // (RETURN-L ... EXT-BACK beside NOTCH-RETURN / STEP), the extension's BACK
  // pieces cut from the notched BACK; Check carries no #32. Then the overlap
  // case (recess x from 100): Check #32 EXTENSION_REFUSED visible with "The
  // recess cannot be cut: the corner cut stands where the recess band is;
  // move one of them." Frame f08-both.png (3D of both).
  await t79Action(page, {
    hook: null,
    gesture: 'Enter in the notch window (BL 200 x 200 full)',
    proves: 'notch BL and derived.extension both cut (no overlap), no Check #32; overlap -> #32 EXTENSION_REFUSED in words; frame f08-both.png',
    act: async () => {
      const cut = await cutNotch(page, b.id);
      const found = await checksNow(page);
      const u = cut.u;
      const ids = u.panels.map((p) => p.id);
      const grown = u.panels.filter((p) => p.ext).map((p) => p.id);
      const bul = u.panels.find((p) => p.id === 'BUL');
      const bur = u.panels.find((p) => p.id === 'BUR');
      check('Enter in the notch window: the notch AND the recess extension, both cut',
        u.notch && u.notch.corner === 'BL' && j(u.notchBoards) === j(['RETURN', 'STEP']) && u.extension && (u.extension.boards || []).includes('EXT-BACK')
          && ['RETURN', 'STEP', 'EXT-BACK'].every((id) => ids.includes(id)) && (u.extension.boards || []).every((id) => ids.includes(id))
          && bul && bul.notch && near(bul.w, b.d - 18 - 200, 0.5) && bur && bur.w > (b.d - 18) && !u.extension.refused && !u.warnings.some((x) => /REFUSED/.test(x)) && !found.some((f) => f.check === 36),
        'params.notch BL; the notch\'s RETURN and STEP AND the extension\'s boards (EXT-BACK among them) all cut; BUL notched (a full-height notch: 200 narrower), BUR grown into the band; no refusal, no Check #36',
        `notch ${j(u.notch)} (boards ${j(u.notchBoards)}); extension ${j(u.extension)}; boards ${sayPanels(u, /RETURN|STEP|LID|EXT|FLOOR/)}; grown ${j(grown)}; BUL ${bul && `${bul.w}x${bul.h} ${j(bul.cncNotch)}`}; BUR ${bur && `${bur.w}x${bur.h}`}; warnings ${j(u.warnings)}; checks ${j(found.map((f) => `#${f.check}`))}`);
      await hideFronts(page);
      await orbitFree(page, 220, 120);
      await pieceFrame(page, b.id, [], 'f08-both.png');
      // THE OVERLAP: the same recess moved to the unit's 100..700 (its band now meets the notch's 0..200 along the back),
      // through Settings, Room setup, the recess row, From the left.
      const rid = await page.ask(`((${S}.project.wallSlopes || []).find((e) => e.kind === 'recess') || {}).id || null`);
      const s0 = await saidCount(page);
      await menu(page, 'Settings', 'Room setup');
      await until(page, 'Boolean(document.querySelector(\'[data-elevation-dock]\'))', 5000);
      if (await page.has('[data-wall-view-option="top"]')) await page.press('[data-wall-view-option="top"]');
      if (rid && await page.has(`[data-elevation-row="${rid}"]`)) await page.press(`[data-elevation-row="${rid}"]`);
      const win = await until(page, 'Boolean(document.querySelector(\'[data-element-modal="recess"]\'))', 3000);
      const moved = win ? await typeInto(page, 'document.querySelector(\'[data-plan-x="1"]\')', u.x + 100) : false;
      await recessDone(page);
      await page.sleep(1200);
      const u2 = await unitOf(page, b.id);
      const rec = await page.ask(`JSON.parse(JSON.stringify((${S}.project.wallSlopes || []).find((e) => e.id === ${j(rid)}) || null))`);
      const findings = await checkOpen(page);
      const f36 = findings.find((f) => f.n === 36) || null;
      check(`Settings, Room setup..., the recess row, From the left ${u.x + 100} typed (${moved ? 'real keys' : 'NOT typed'}), Done: the band meets the notch, refused in words, VISIBLE in Check`,
        rec && near(rec.x_mm, u.x + 100, 0.5) && u2.notch && j(u2.notchBoards) === j(['RETURN', 'STEP']) && (!u2.extension || (u2.extension.refused && !(u2.extension.boards || []).length)) && !u2.panels.some((p) => p.ext || /^(RETURN-[LR]|EXT-)/.test(p.id)) && u2.warnings.some((x) => /^EXTENSION_REFUSED: The recess cannot be cut: the corner cut stands where the recess band is; move one of them\./.test(x))
          && f36 && f36.level === 'red' && /The recess cannot be cut: the corner cut stands where the recess band is; move one of them\./.test(f36.text),
        'the notch stands (RETURN, STEP), no extension board cut (derived.extension refused); EXTENSION_REFUSED "The recess cannot be cut: the corner cut stands where the recess band is; move one of them."; Check #36 red with that sentence',
        `recess ${j(rec)}; notch ${j(u2.notch)} (boards ${j(u2.notchBoards)}); extension ${j(u2.extension)}; boards ${sayPanels(u2, /RETURN|STEP|LID|EXT|FLOOR/)}; grown ${j(u2.panels.filter((p) => p.ext).map((p) => p.id))}; warnings ${j(u2.warnings)}; Check ${j(findings.map((f) => `#${f.n} ${f.level}`))}; #36 ${j(f36 && f36.text)}; said ${j(await saidSince(page, s0))}`);
      await shot(page, 'f08-overlap-check.png');
      await checkClose(page);
    },
  });
});

// --- F9 . THE END PANEL FOLLOWS ITS SIDE INTO THE RECESS ---------------------
await onPage('f09', 'THE END PANEL FOLLOWS ITS SIDE INTO THE RECESS AND INTO THE NOTCH (PRO)', async (page) => {
  await stagePro(page, 'the end panel in the recess');
  const { b, endBefore } = await budInRecess(page, { from: 310, to: 910, endPanel: 'R' });
  const end = b.panels.find((p) => /^END/.test(p.id) || p.part === 'END-PANEL') || null;
  const bur = b.panels.find((p) => p.id === 'BUR') || null;
  note('END-R and BUR in the recess band', `END ${end ? `${end.id} ${r1(end.w)} x ${r1(end.h)}, outline ${end.outlinePts} pts, cnc.notch ${j(end.cncNotch)}` : 'none'}; BUR ${bur ? `${r1(bur.w)} x ${r1(bur.h)}, outline ${bur.outlinePts} pts, cnc.notch ${j(bur.cncNotch)}` : 'none'}; extension ${j(b.extension)}`);
  await shot(page, 'f09-stage.png');
  // T79 ACTION: F9 has no control: the END panel is cut by the SAME outline as
  // the side it covers. PROVES: END-R's cnc.notch (+ also) equals BUR's grown
  // outline (the band tested against -padL..W+padR); a notched BUL's END-L
  // takes its cnc.notch; wholly inside a recess the END panel's depth equals
  // the carcass depth (depth_full + recess_mm); its BOM area follows. Frame
  // f09-end-3d.png from the recess side (the camera turned by a real drag).
  await t79Action(page, {
    hook: null,
    gesture: 'read END-R against BUR; turn the camera to the recess side (a real drag), frame',
    proves: 'END-R outline = BUR outline (cnc.notch and also); frame f09-end-3d.png',
    act: async () => {
      const u = await unitOf(page, b.id);
      const e = u.panels.find((p) => /^END/.test(p.id) || p.part === 'END-PANEL');
      const side = u.panels.find((p) => p.id === 'BUR');
      // BUR grows into the band by what the recess gives it; the END panel must grow by the same.
      const G = 18;
      const grow = side ? r1(side.w - (u.d - G)) : null;
      const endGrow = e && endBefore ? r1(e.w - endBefore.w) : null;
      check('END-R takes BUR\'s outline (it grows into the recess with the side)', e && side && grow > 0 && near(endGrow, grow, 0.5) && j(e.cncNotch) === j(side.cncNotch) && e.outlinePts === side.outlinePts,
        `END-R deeper by what BUR gained (${grow}), the same cnc.notch and outline points`,
        `END ${j(e && { w: e.w, n: e.cncNotch, pts: e.outlinePts })} (before the recess ${endBefore ? endBefore.w : '?'}, grew ${endGrow}); BUR ${j(side && { w: side.w, n: side.cncNotch, pts: side.outlinePts })} (grew ${grow})`);
      await orbitFree(page, -200, 0);
      await pieceFrame(page, b.id, [], 'f09-end-3d.png');
    },
  });
});

// --- F10 . THE RECESS GIVES WAY TO THE STAND-OFF (RETAIL) ---------------------
await onPage('f10', 'THE RECESS GIVES WAY TO THE STAND-OFF (RETAIL)', async (page) => {
  await page.showroom(`${BASE}retail.html#/design`);
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout: 45000 });
  await page.sleep(2600);
  await recordSaid(page);
  note('the build under the mouse', `${await stamp(page) || 'no stamp read'}; the repo's HEAD ${head}; url ${BASE}retail.html#/design`);
  await page.press('[data-testid="cat-where"]');
  await page.press('[data-testid="where-add-wardrobe"]');
  await page.sleep(1800);
  const units = await unitsNow(page);
  let w = units[0] ? await unitOf(page, units[0].id) : null;
  check('retail.html#/design: WHERE, Add a wardrobe (real clicks)', w && /WARDROBE/.test(w.type), 'a wardrobe in the room',
    w ? `${w.type} ${w.num} on wall ${w.wall + 1} at x ${w.x}, ${w.w} x ${w.h} x ${w.d}, wall_gap ${w.wallGap}` : 'nothing added');
  if (!w) throw new Error('no wardrobe');
  if (!(await sceneCheck(page, 'after the wardrobe is drawn'))) throw new Error(DEAD);
  // A 300 recess wider than the wardrobe, around it: WHERE, the room's own Edit, the elevation's Top, Add recess.
  if (!(await page.has('[data-testid="space-edit-room"]'))) await page.press('[data-testid="cat-where"]');
  const said0 = await saidCount(page);
  if (await page.has('[data-testid="space-edit-room"]')) await page.press('[data-testid="space-edit-room"]');
  await until(page, 'Boolean(document.querySelector(\'[data-elevation-dock]\'))', 6000);
  const rc = await recessInElevation(page, {
    x: Math.max(0, w.x - 100), width: w.w + 200, depth: 300, said0, wantWall: w.wall,
  });
  await recessDone(page);
  await page.sleep(1200);
  w = await unitOf(page, w.id);
  check(`WHERE, Edit room, Top, Add recess, its row: Width ${w.w + 200}, From the left ${Math.max(0, w.x - 100)}, Depth 300; Done (real clicks and keys)`,
    rc.recess && near(rc.recess.depth, 300, 0.5) && Number(w.recess) > 0,
    'the wardrobe wholly inside a 300 recess: recess_mm > 0 and its depth grown',
    `elevation wall ${rc.wall}; recess ${j(rc.recess)}; typed ${j(rc.typed)}; wardrobe x ${w.x}, depth ${w.d} (full ${w.depthFull}), recess_mm ${w.recess}, wall_gap ${w.wallGap}; said ${j(rc.said)}`);
  // SIZE, FROM THE WALL: the field the owner slides.
  await page.press('[data-testid="cat-size"]');
  await page.sleep(900);
  const field = await page.ask('(() => { const f = document.querySelector(\'[data-testid="size-wall-gap"]\'); const i = f ? (f.matches(\'input\') ? f : f.querySelector(\'input\')) : null; return i ? { value: i.value, min: i.getAttribute(\'min\'), max: i.getAttribute(\'max\') } : null; })()');
  check('SIZE (the real tab): the FROM THE WALL field', Boolean(field), '[data-testid=size-wall-gap] on the glass', `field ${j(field)}`);
  note('what FROM THE WALL reads in the recess', `${field ? field.value : '?'} (adapter wallGapOfUnit, T79 F10: the wall gap with the derived recess_mm taken as 0; recess_mm ${w.recess}; the store's params.wall_gap ${w.wallGap})`);
  await shot(page, 'f10-stage.png');
  // T79 ACTION: F10 has no control: FROM THE WALL is typed 100, then 300, then
  // 350 (click [data-testid="size-wall-gap"], select, type, Enter). PROVES,
  // through effectiveRecessDepth = depth - (nominal stand-off with recess_mm
  // 0): 100 -> recess_mm 200 (depth = depth_full + 200, a frame
  // f10-standoff-100.png); 300 -> no recess_mm, no extension, the wardrobe
  // stands off the wall in front of the recess (f10-standoff-300.png); 350 ->
  // the same, no extension record (f10-standoff-350.png). Note the field's
  // bounds above: a max under 350 is the room refusing first, in words.
  await t79Action(page, {
    hook: null,
    gesture: 'FROM THE WALL typed 100, 300, 350 (Enter each)',
    proves: '100 -> recess_mm 200; 300 -> none; 350 -> none and no extension; frames f10-standoff-100/300/350.png',
    act: async () => {
      // At the standard stand-off (room.wallBackClearance 10) the 300 recess is 290 for this wardrobe.
      const std = await unitOf(page, w.id);
      check('at the standard stand-off (nothing typed): the recess less the stand-off', near(std.recess, 290, 0.5) && near(std.d, Number(std.depthFull) + 290, 0.5),
        'recess_mm 290 (300 - 10), depth = depth_full + 290', `wall_gap ${std.wallGap}; recess_mm ${std.recess}; depth ${std.d} (full ${std.depthFull}); FROM THE WALL reads ${field ? field.value : '?'}`);
      const input = '(() => { const f = document.querySelector(\'[data-testid="size-wall-gap"]\'); return f ? (f.matches(\'input\') ? f : f.querySelector(\'input\')) : null; })()';
      // The nominal depth, kept in depth_full while a recess stands (the store takes it back with the recess).
      const full0 = Number(std.depthFull ?? std.d);
      const wantRecess = { 100: 200, 300: null, 350: null };
      for (const gap of [100, 300, 350]) {
        const s0 = await saidCount(page);
        const typed = await typeInto(page, input, gap);
        await page.sleep(900);
        const u = await unitOf(page, w.id);
        const reads = await page.ask(`(() => { const i = ${input}; return i ? i.value : null; })()`);
        const exp = wantRecess[gap];
        check(`SIZE, FROM THE WALL clicked, ${gap} typed (${typed ? 'real keys' : 'NOT typed'}), Enter`,
          (exp == null ? !(Number(u.recess) > 0) && !u.extension && near(u.d, full0, 0.5) : near(u.recess, exp, 0.5) && near(u.d, full0 + exp, 0.5)) && near(u.wallGap, gap, 0.5),
          exp == null ? `wall_gap ${gap}; no recess_mm, no extension, depth ${full0} (the nominal: the wardrobe stands off the wall in front of the recess)` : `wall_gap ${gap}; recess_mm ${exp} (300 - ${gap}), depth ${full0} + ${exp}`,
          `wall_gap ${u.wallGap}; recess_mm ${u.recess}; depth ${u.d} (full ${u.depthFull}); extension ${j(u.extension)}; the field reads ${reads}; said ${j(await saidSince(page, s0))}`);
        await shot(page, `f10-standoff-${gap}.png`);
      }
    },
  });
});

// --- F11 . THE RAIL IS ALONE, AND IT SNAPS 50 MM UNDER A SHELF ----------------
await onPage('f11', 'THE RAIL IS ALONE, AND IT SNAPS 50 MM UNDER A SHELF (PRO)', async (page) => {
  await stagePro(page, 'the rail');
  const w = await placeUnit(page, 'wardrobe');
  await hideFronts(page);
  const add = await addShelvesUi(page, w.id, 1);
  const shelf = add.unit.items.find((i) => i.kind === 'shelf') || null;
  const at = shelf ? await shelfAt(page, w.id, shelf.id, 1600) : null;
  check('Add items, Shelves, 1, Add; the shelf clicked, Height typed (pos 1600)', at && at.item && near(at.item.pos, 1600, 0.5),
    'one shelf at pos_mm 1600', `shelf ${j(at && at.item)}`);
  // The rail through Add items, Hanger rail (T79 F11 deleted the with-or-without-shelf toggle; Rail alone is pressed only if it is still there).
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  await selectUnit(page, w.id);
  await sectionOpen(page, 'Add items');
  if (!(await page.has('[data-add-kind="hanger"][aria-expanded="true"]'))) await page.press('[data-add-kind="hanger"]');
  const toggle = await page.ask('Boolean(document.querySelector(\'[data-rail-with-shelf]\')) || Boolean(document.querySelector(\'[data-rail-alone]\'))');
  if (await page.has('[data-rail-alone="1"]')) await page.press('[data-rail-alone="1"]');
  await domFrame(page, 'document.querySelector(\'[data-section="Add items"]\')', 'f11-stage-addrail.png');
  const said0 = await saidCount(page);
  const btn = await boxOf(page, '[...document.querySelectorAll(\'[data-section="Add items"] button.cc-btn-gold\')].find((b) => b.offsetParent && b.textContent.trim() === \'Add hanger rail\')');
  if (btn) await clickWith(page, btn.x, btn.y);
  await until(page, `((${S}.units.find((x) => x.id === ${j(w.id)}).params.sections || [])[0] || { items: [] }).items.some((i) => i.kind === 'rail' || i.kind === 'hanger')`, 4000);
  await page.sleep(800);
  const u = await unitOf(page, w.id);
  const rail = u.items.find((i) => i.kind === 'rail' || i.kind === 'hanger') || null;
  const railPanels = u.panels.filter((p) => /RAIL|HANGER/i.test(p.id) || /rail/i.test(String(p.role || '')));
  check(`Add items, Hanger rail${toggle ? ', Rail alone (the toggle F11 deletes)' : ''}, Add hanger rail (real clicks)`, Boolean(rail),
    'a rail item in the wardrobe (no shelf added with it)', `rail ${j(rail)}; items ${j(u.items.map((i) => i.kind))}; rail boards ${j(railPanels.map((p) => `${p.id} y ${p.box && p.box.y}`))}; toggle on the glass ${toggle}; said ${j(await saidSince(page, said0))}`);
  note('the magnet numbers', `editor.shelfMagnetMm ${await profileNum(page, 'editor.shelfMagnetMm')}; hardware.hanger.belowShelfMm ${await profileNum(page, 'hardware.hanger.belowShelfMm')} (F11's new number)`);
  await shot(page, 'f11-stage.png');
  // T79 ACTION: F11: (1) kasacja: [data-rail-with-shelf], [data-rail-alone]
  // and [data-rail-assembly-hint] are GONE from Add items, Add hanger rail adds
  // the rail alone; (2) the magnet: the rail (its mesh, ccPanelId of the rail
  // record above) grabbed with a real press and dragged up toward the shelf
  // at 1600: within editor.shelfMagnetMm (10) of underside - belowShelfMm
  // (1600 - 50 = 1550, measured the way moveRail measures) it lands on 1550,
  // moveRail reports `magnet`, and the DashedGuide with its mm label is drawn
  // (UnitView, as the shelf magnet's); Alt held refuses the snap. Frame
  // f11-magnet.png with the guide on the glass (taken before the release).
  await t79Action(page, {
    hook: null,
    gesture: 'the toggle gone; the rail dragged (real press, moves, release) to within 10 of 1550',
    proves: 'no [data-rail-with-shelf]/[data-rail-alone]; the rail lands at 1550 (shelf underside - 50), the guide drawn; frame f11-magnet.png',
    act: async () => {
      const hint = await page.has('[data-rail-assembly-hint]');
      const sayAdd = (await saidSince(page, said0)).join(' | ');
      check('the with-or-without-shelf proposal is gone: no toggle, no hint, the rail added ALONE and it says where the drag settles it', !toggle && !hint && rail && rail.mount !== 'shelf' && railPanels.length === 0
        && /Rail added\. Drag it near a shelf and it settles 50 mm under it; Alt refuses\./.test(sayAdd),
        'no [data-rail-with-shelf] / [data-rail-alone] / [data-rail-assembly-hint]; no board with the rail; "Rail added. Drag it near a shelf and it settles 50 mm under it; Alt refuses."',
        `toggle ${toggle}; hint ${hint}; rail ${j(rail)}; rail boards ${railPanels.length}; said "${sayAdd}"`);
      const below = Number(await profileNum(page, 'hardware.hanger.belowShelfMm')) || 50;
      const want = 1600 - below;
      const drag = await railDrag(page, w.id, rail.id, want + 6, 'f11-magnet.png');
      const it = (await unitOf(page, w.id)).items.find((i) => i.id === rail.id) || null;
      check(`the rail dragged (a real press on the tube, moves, release) to ${want + 6}, 6 from the catch`, drag.ok && it && drag.after != null && near(drag.after, want, 0.5) && near(drag.held, want, 0.5) && near(drag.guide, want, 0.5),
        `the rail's axis caught at ${want} (the shelf's underside 1600 - ${below}) while held and after the release; the guide (ccRailMagnet) drawn at ${want} while held`,
        `${j(drag)}; item ${j(it)}`);
      // Alt held for the whole drag: the proposal refused, the rod goes where the hand put it.
      const alt = await railDrag(page, w.id, rail.id, want + 6, 'f11-alt.png', { modifiers: 1 });
      const it2 = (await unitOf(page, w.id)).items.find((i) => i.id === rail.id) || null;
      check(`the same drag to ${want + 6} with Alt held: the catch refused`, alt.ok && alt.after != null && Math.abs(alt.after - want) >= 3 && near(alt.after, want + 6, 3) && alt.guide == null,
        `the axis near ${want + 6}, not ${want}; no guide while held`, `${j(alt)}; item ${j(it2)}`);
    },
  });
});

// --- F12 . CENTRE BETWEEN TWO ELEMENTS --------------------------------------
await onPage('f12', 'CENTRE BETWEEN TWO ELEMENTS (PRO)', async (page) => {
  await stagePro(page, 'centre between');
  const w = await placeUnit(page, 'wardrobe');
  await hideFronts(page);
  const add = await addShelvesUi(page, w.id, 1);
  const first = add.unit.items.find((i) => i.kind === 'shelf') || null;
  const fx = first ? await fixShelfAt(page, w.id, first.id, 600) : null;
  check('Add items, Shelves, 1, Add; the shelf clicked, Height (pos 600), FIX chip', fx && fx.item && near(fx.item.pos, 600, 0.5) && /fix/i.test(String(fx.item.variant || '')),
    'a FIX shelf at pos_mm 600', `shelf ${j(fx && fx.item)}`);
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  const add3 = await addShelvesUi(page, w.id, 3);
  const above = add3.unit.items.filter((i) => i.kind === 'shelf' && i.id !== (first && first.id));
  check('Add items, Shelves, 3, Add', add3.added === 3 && above.every((i) => i.pos > 600),
    'three adjustable shelves above the FIX one', `added ${add3.added}; ${j(above.map((i) => `${i.id}@${i.pos}`))}; said ${j(add3.said)}`);
  // The three put UNEVEN (they arrive evenly spread, which would hide what
  // centring does): each clicked, its Height typed, 700, 820, 1900.
  const uneven = [700, 820, 1900];
  const ordered = [...above].sort((p, q) => p.pos - q.pos);
  // Bottom up: a shelf is clamped between its neighbours, so the lowest moves down first.
  for (let k = 0; k < ordered.length; k += 1) {
    if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
    await shelfAt(page, w.id, ordered[k].id, uneven[k]);
  }
  const now3 = (await unitOf(page, w.id)).items.filter((i) => i.kind === 'shelf' && i.id !== (first && first.id)).map((i) => i.pos).sort((p, q) => p - q);
  check('the three clicked in turn, their Height typed 700, 820, 1900', j(now3) === j(uneven), 'pos_mm 700, 820, 1900', j(now3));
  // One of the three selected: Center all stands at the bottom of its menu.
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  const pick = ordered[0] || null;
  const pid = pick ? await shelfPanelOf(page, w.id, pick.id) : null;
  const sel = pid ? await selectPiece(page, w.id, pid) : null;
  const centreAll = await page.has('[data-centre-shelves="1"]');
  check(`a shelf above clicked (${sel ? `by ${sel.by || 'already'}` : 'NOT selected'}): its menu with Center all`, Boolean(sel) && centreAll,
    '[data-centre-shelves] on the glass', `element ${j(await elementNow(page))}; Center all ${centreAll}`);
  note('the selected shelf\'s SET BACK (T79 F13 names no walk; read where it shows)', `${j(await page.ask('[...document.querySelectorAll(\'section\')].filter((x) => /Selected piece/.test(x.textContent)).flatMap((x) => [...x.querySelectorAll(\'button\')].map((b) => b.textContent.trim())).filter((t) => /mm$|^Flush$/.test(t))'))}; the shelf board ${j(await page.ask(`(() => { const r = ${S}.unitResult(${j(w.id)}); const p = r.panels.find((q) => q.id === ${j(pid)}); return p ? { w: p.w, h: p.h, d: p.box && p.box.d, front: p.meta && p.meta.front_mm != null ? p.meta.front_mm : null } : null; })()`))}; the unit depth ${w.d}`);
  await shot(page, 'f12-stage.png');
  await domFrame(page, 'document.querySelector(\'[data-centre-shelves="1"]\').closest(\'section\')', 'f12-stage-menu.png');
  // T79 ACTION: F12: `Center between` beside Center all ([data-centre-between],
  // expected; same width). Click it: uiStore.centreBetween {unitId, lower:
  // null, upper: null} and the panel says "Pick the lower element"; a real
  // click on the FIX shelf (lower), "Pick the upper element"; a real click
  // on the TOP (upper). PROVES: the three adjustable shelves between 618 (the
  // FIX shelf's top face) and the TOP's underside are spread with equal gaps
  // (evenShelfPositions, mmStep snap); picks in two bays, a FIX shelf between
  // the picks, or no shelf between are each refused in words; Escape
  // cancels. Frames f12-pick-lower.png, f12-between.png.
  await t79Action(page, {
    hook: '[data-centre-between]',
    gesture: 'Center between, a real click on the FIX shelf, a real click on the TOP',
    proves: 'the three shelves between 618 and the TOP underside at equal gaps; refusals in words; frames f12-pick-lower.png, f12-between.png',
    act: async () => {
      const G = fx.G;
      const fixPid = await shelfPanelOf(page, w.id, first.id);
      const mode = () => page.ask(`(() => { const c = ${UI}.centreBetween; return c ? JSON.parse(JSON.stringify(c)) : null; })()`);
      const step = () => page.ask('(() => { const p = document.querySelector(\'[data-centre-between-step]\'); return p ? p.getAttribute(\'data-centre-between-step\') + \': \' + p.textContent.trim() : null; })()');
      const posNow = async () => (await unitOf(page, w.id)).items.filter((i) => i.kind === 'shelf' && i.id !== first.id).map((i) => i.pos).sort((p, q) => p - q);
      const side = await page.ask('(() => { const a = document.querySelector(\'[data-centre-shelves="1"]\'); const b = document.querySelector(\'[data-centre-between="1"]\'); if (!a || !b) return null; const x = a.getBoundingClientRect(); const y = b.getBoundingClientRect(); return { all: Math.round(x.width), between: Math.round(y.width), row: Math.abs(x.top - y.top) < 2 }; })()');
      check('Center between stands beside Center all, the same width', side && side.row && Math.abs(side.all - side.between) <= 1, 'one row, equal widths', j(side));
      // (1) Armed, then Escape: the picking ends, nothing moves.
      await page.press('[data-centre-between="1"]');
      const armed = await mode();
      const s1 = await step();
      await key(page, 'Escape');
      const after = await mode();
      check('Center between (a real click) arms the two picks; Escape cancels', armed && armed.unitId === w.id && !armed.lower && /^lower: Pick the lower element$/.test(s1 || '') && after == null && j(await posNow()) === j(uneven),
        'centreBetween {unitId, lower null, upper null}, "Pick the lower element"; after Escape null, the shelves where they were', `armed ${j(armed)}; step "${s1}"; after Escape ${j(after)}; shelves ${j(await posNow())}`);
      // (2) The picks BOTTOM then TOP: the FIX shelf stands between them, refused in words.
      if (!(await page.has('[data-centre-between="1"]'))) await selectPiece(page, w.id, await shelfPanelOf(page, w.id, ordered[0].id));
      let px = await reachMany(page, w.id, ['BOTTOM', 'TOP']);
      const s2 = await saidCount(page);
      await page.press('[data-centre-between="1"]');
      if (px) { await clickWith(page, px.BOTTOM.x, px.BOTTOM.y); await clickWith(page, px.TOP.x, px.TOP.y); }
      await page.sleep(800);
      const refused = await saidSince(page, s2);
      check(`Center between, a real click on the BOTTOM, a real click on the TOP (${px ? 'both reached' : 'NOT reached'})`, px && refused.some((m) => /A fixed shelf stands between your picks; centring stops at it\./.test(m)) && j(await posNow()) === j(uneven),
        'refused in words: "A fixed shelf stands between your picks; centring stops at it."; nothing moved', `said ${j(refused)}; shelves ${j(await posNow())}; mode ${j(await mode())}`);
      // (3) The picks FIX shelf then TOP: the three shelves between them spread with equal clear gaps.
      if (!(await page.has('[data-centre-between="1"]'))) await selectPiece(page, w.id, await shelfPanelOf(page, w.id, ordered[0].id));
      px = await reachMany(page, w.id, [fixPid, 'TOP']);
      await page.press('[data-centre-between="1"]');
      const s3 = await saidCount(page);
      if (px) await clickWith(page, px[fixPid].x, px[fixPid].y);
      await page.sleep(500);
      const mid = await mode();
      const s4 = await step();
      check(`the first pick, a real click on the FIX shelf ${fixPid}`, mid && mid.lower === fixPid && !mid.upper && /^upper: Pick the upper element$/.test(s4 || ''),
        `centreBetween.lower ${fixPid}; the panel says "Pick the upper element"`, `mode ${j(mid)}; step "${s4}"`);
      await shotNow(page, 'f12-pick-lower.png');
      if (px) await clickWith(page, px.TOP.x, px.TOP.y);
      await page.sleep(900);
      const u = await unitOf(page, w.id);
      const ys = u.items.filter((i) => i.kind === 'shelf' && i.id !== first.id).map((i) => i.pos).sort((p, q) => p - q);
      const topPanel = u.panels.find((p) => p.id === 'TOP');
      const topUnder = topPanel && topPanel.box ? topPanel.box.y : u.h - G;
      const ladder = [600 + G, ...ys.map((y) => [y, y + G]).flat(), topUnder];
      const gaps = []; for (let k = 0; k + 1 < ladder.length; k += 2) gaps.push(r1(ladder[k + 1] - ladder[k]));
      const fixNow = u.items.find((i) => i.id === first.id);
      check('the second pick, a real click on the TOP: the shelves between the picks centred', ys.length === 3 && Math.max(...gaps) - Math.min(...gaps) <= 1 && fixNow && fixNow.pos === 600 && (await mode()) == null,
        `equal clear gaps between ${600 + G} (the FIX shelf's top face) and the TOP's underside ${topUnder}; the FIX shelf still at 600; the mode ended`,
        `positions ${j(ys)}; clear gaps ${j(gaps)}; FIX ${fixNow && fixNow.pos}; mode ${j(await mode())}; said ${j(await saidSince(page, s3))}`);
      await shot(page, 'f12-between.png');
    },
  });
});

// --- F14 . THE DRAWER BOX IS ON CABINEO 12 ----------------------------------
await onPage('f14', 'THE DRAWER BOX IS ON CABINEO 12 (PRO)', async (page) => {
  await stagePro(page, 'the box Cabineo');
  const d = await placeUnit(page, 'budr');
  const u = await unitOf(page, d.id);
  const box = u.panels.filter((p) => /BOX|DRAWER-SIDE/.test(p.part || '') || /BOX|DS/.test(p.id));
  note('the drawer box boards (cnc pockets / holes per board, Cabineo skims and dia 15 lobes, dia 5 holes)', j(box.map((p) => `${p.id} ${p.part} ${r1(p.w)}x${r1(p.h)} pockets ${p.pockets} holes ${p.holes} cabineo ${p.cabPockets}/${p.cabLobes}/${p.cabHoles} face ${p.machinedFace}`)));
  note('the unit\'s joint system', `params.joints_system ${u.joints}; the system the engine cut (derived.joints) ${u.jointsCut}; the company row (project.design.joints) ${j(await page.ask(`JSON.parse(JSON.stringify(${S}.project.design.joints || null))`))}; F14's gate opens on params.joints_system named or injected by paramsForEngine`);
  await selectUnit(page, d.id);
  const cnc = await viewMode(page, 'cnc');
  const parts = await page.ask('[...document.querySelectorAll(\'[data-cnc-part]\')].map((g) => g.getAttribute(\'data-cnc-part\'))');
  check(`the BUDR selected, CNC (${cnc.by}, a real click)`, cnc.ok && parts.length > 0, 'the CNC sheet of the unit', `viewMode cnc ${cnc.ok}; ${parts.length} parts: ${parts.join(', ')}`);
  await shot(page, 'f14-stage.png');
  // T79 ACTION: F14 has no control (the law is automatic). PROVES, on the
  // store-built BUDR (the project injects joints_system): BOX-FRONT and
  // BOX-BACK each carry 4 Cabineo pockets (cabineo_pocket dia 15, three
  // lobes, face outside, meta.machinedFace 'outside', OUTSIDE FACE UP on the
  // sheet) at 25 and 178 from the wall's top (wall 203 > 100: two per
  // joint); each DRAWER-SIDE 4 cabineo_hole dia 5 depth 12 at the same
  // heights from the side's top; the bottom none; the two facade pilot holes
  // where they were; the BOM line cabineo_connector 8 per box; the summary's
  // box {joints 4, pockets 8, holes 8}. Frames f14-box-cnc.png (the sheet)
  // and f14-box-back.png (the part detail of BOX-BACK: a 2klik on its part
  // in the CNC view, or its row).
  await t79Action(page, {
    hook: null,
    gesture: 'the CNC sheet read: BOX-FRONT / BOX-BACK pockets and DRAWER-SIDE holes; BOX-BACK part detail opened',
    proves: 'box Cabineo 12: 2 per joint at 25 / 178 from the top, 8 pockets and 8 holes per box, outside face up; frames f14-box-cnc.png, f14-box-back.png',
    act: async () => {
      const u2 = await unitOf(page, d.id);
      const fronts = u2.panels.filter((p) => /BOX-FRONT|BOX-BACK/.test(p.part || p.id));
      // Two joints per wall (one at each end); a wall over 100 high takes two connectors per joint, one up to 100 takes one.
      const sides = u2.panels.filter((p) => p.part === 'DRAWER-SIDE');
      const bottoms = u2.panels.filter((p) => /DNO|DRAWER-BOTTOM/.test(p.id + ' ' + (p.part || '')));
      const per = (p) => (p.h > 100 ? 4 : 2);
      const d1bf = fronts.find((p) => p.id === 'D1-BF') || null;
      check('the box walls carry the Cabineo 12 pockets from outside, the sides the dia 5 holes, the bottom none', fronts.length > 0
        && fronts.every((p) => p.cabPockets === per(p) && p.cabLobes === 3 * per(p) && p.machinedFace === 'outside')
        // a side's holes follow ITS box's wall height (D1-SL with D1-BF), the set-out is the wall's
        && sides.every((p) => { const wall = fronts.find((f) => f.id.split('-')[0] === p.id.split('-')[0]); return wall && p.cabHoles === per(wall); })
        && bottoms.every((p) => p.cabPockets === 0 && p.cabLobes === 0 && p.cabHoles === 0)
        && d1bf && j(d1bf.cabLobeX) === j([25, 178]),
        'BOX-FRONT / BOX-BACK: 4 pockets (12 dia 15 lobes) on a wall over 100 high, 2 (6) on one up to 100, machinedFace outside; D1-BF (203 high) at 25 and 178 from its top; each DRAWER-SIDE as many cabineo_hole; the bottoms none',
        `walls ${j(fronts.map((p) => `${p.id} ${r1(p.w)}x${r1(p.h)} pockets ${p.cabPockets} lobes ${p.cabLobes} at x ${j(p.cabLobeX)} face ${p.machinedFace}`))}; sides ${j(sides.map((p) => `${p.id} ${r1(p.w)}x${r1(p.h)} holes ${p.cabHoles}`))}; bottoms ${j(bottoms.map((p) => `${p.id} ${p.cabPockets}/${p.cabLobes}/${p.cabHoles}`))}`);
      check('the unit\'s summary and BOM: derived.boxCabineo, the cabineo_connector line', u2.boxCabineo && u2.boxCabineo.joints === 12 && u2.boxCabineo.pockets === 20 && u2.boxCabineo.holes === 20 && u2.cabineoBom.some((x) => /^cabineo_connector 20$/.test(x)),
        'boxCabineo {joints 12, pockets 20, holes 20} (8 + 8 + 4); BOM cabineo_connector 20', `boxCabineo ${j(u2.boxCabineo)}; BOM ${j(u2.cabineoBom)}`);
      note('the Check on this BUDR (read): what the red count on the toolbar is', j((await checksNow(page)).map((f) => `#${f.check} ${f.level} ${f.panelId || ''}: ${String(f.message).slice(0, 120)}`)));
      await shot(page, 'f14-box-cnc.png');
      const bb = fronts.find((p) => p.id === 'D1-BB') || fronts.find((p) => /BACK/.test(p.part || p.id));
      if (bb) await domFrame(page, `document.querySelector('[data-cnc-part="${bb.id}"]')`, 'f14-box-back-sheet.png', 16, 2);
      // THE PART DETAIL of BOX-BACK: the cabinet's own window (a real right click on the cabinet, Edit cabinet...),
      // Explode, and a real double click on D1-BB in the editor's own scene.
      await viewMode(page, '3d');
      const at = await reachFree(page, d.id, 'TOP') || await reachFree(page, d.id, 'BUL');
      if (at) await page.rightclick(at.x, at.y);
      const menuUp = await until(page, 'Boolean(document.querySelector(\'[data-menu-entry="edit-cabinet"]\'))', 3000);
      if (menuUp) await page.press('[data-menu-entry="edit-cabinet"]');
      const editor = await until(page, 'Boolean(window.__cc.views && window.__cc.views.editor && document.querySelector(\'[data-explode="1"]\'))', 8000);
      if (editor) { await page.press('[data-explode="1"]'); await page.sleep(2200); }
      const px = editor ? await reachInEditor(page, bb ? bb.id : 'D1-BB') : null;
      if (px) await page.dblclick(px.x, px.y);
      const detail = px ? await until(page, 'Boolean(document.querySelector(\'[data-modal-name="part-detail"]\'))', 6000) : false;
      await page.sleep(1500);
      const said = await page.ask(`(() => { const a = ${UI}.modalArgs; return { modal: ${UI}.modal, panelId: a && a.panelId ? a.panelId : null, title: ((document.querySelector('[data-modal-name="part-detail"]') || {}).textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80) }; })()`);
      // The part detail's own layer list (data-legend-layer rows, each with its count): the pockets it draws, against what the engine cut.
      const layers = detail ? await page.ask('Object.fromEntries([...document.querySelectorAll(\'[data-modal-name="part-detail"] [data-legend-layer]\')].map((r) => [r.getAttribute(\'data-legend-layer\'), Number((r.querySelector(\'span.tabular-nums\') || {}).textContent || 0)]))') : {};
      const wantLobes = bb ? bb.cabLobes : null; const wantSkims = bb ? bb.cabPockets : null;
      check(`the BUDR right-clicked (${at ? `pixel ${at.x},${at.y}` : 'NOT reached'}), Edit cabinet..., Explode, ${bb ? bb.id : 'BOX-BACK'} double-clicked in the editor (${px ? `pixel ${px.x},${px.y}` : 'NOT reached'}): its part detail shows the box pockets`,
        detail && said.panelId === (bb ? bb.id : 'D1-BB') && wantLobes > 0 && layers.CABINEO_POCKET_15MM === wantLobes && layers.CABINEO_RECESS === wantSkims,
        `the part-detail window of ${bb ? bb.id : 'BOX-BACK'}; its layer list CABINEO_POCKET_15MM ${wantLobes} and CABINEO_RECESS ${wantSkims} (the engine's dia 15 lobes and skims on that board)`,
        `menu ${Boolean(menuUp)}; editor ${Boolean(editor)}; window ${Boolean(detail)}; ${j(said)}; layers ${j(layers)}`);
      if (detail) await domFrame(page, 'document.querySelector(\'[data-modal-name="part-detail"]\')', 'f14-box-back.png', 8, 1);
      else await shot(page, 'f14-box-back.png');
      await closeModals(page);
    },
  });
  await viewMode(page, '3d');
});

// --- F16 . RESTORE SLEEVE ROWS, THE BUTTON -----------------------------------
await onPage('f16', 'RESTORE SLEEVE ROWS, THE BUTTON (PRO)', async (page) => {
  await stagePro(page, 'the sleeve rows');
  const b = await placeUnit(page, 'bud');
  // A door first (the hinge rows are the leaf's).
  await selectUnit(page, b.id);
  if (await sectionOpen(page, 'Doors') && await page.ask('[...document.querySelectorAll(\'button.cc-btn-gold\')].some((x) => x.offsetParent && /Add doors/.test(x.textContent))')) {
    await page.press('button.cc-btn-gold', 'Add doors');
    await until(page, `${S}.unitResult(${j(b.id)}).panels.some((p) => p.part === 'FRONT')`, 5000);
  }
  await hideFronts(page);
  const hinge = await page.ask(`(() => { const r = ${S}.unitResult(${j(b.id)}); const h = (r.drillSummary && r.drillSummary.hinge_centers) || []; return h.slice(); })()`);
  const add = await addShelvesUi(page, b.id, 1);
  const shelf = add.unit.items.find((i) => i.kind === 'shelf') || null;
  // The seat row 50 under the highest hinge: the +50 row meets the cup, the 0 and -50 rows do not.
  const hingeY = hinge.length ? Math.max(...hinge.map(Number)) : null;
  const target = hingeY != null ? hingeY - 50 : null;
  const at = shelf && target != null ? await shelfAt(page, b.id, shelf.id, target) : null;
  const rows = await page.ask(`(() => { const r = ${S}.unitResult(${j(b.id)}); return { pins: (r.drillSummary && r.drillSummary.shelf_pin_row_y) || [], clusters: (r.drillSummary && r.drillSummary.shelf_cluster_y) || [] }; })()`);
  check(`Doors, Add doors; Add items, Shelves, 1, Add; the shelf clicked, Height typed so its seat is 50 under the highest hinge (${hingeY})`,
    at && at.item && near(at.item.pos, target, 0.5), `shelf pos_mm ${target}`, `hinges ${j(hinge)}; shelf ${j(at && at.item)}; pin rows ${j(rows.pins)}; clusters ${j(rows.clusters)}`);
  // Check #1's own button drops the +50 row (a real click in the Check panel).
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  const findings = await checkOpen(page);
  const f1 = findings.find((f) => f.n === 1) || null;
  const drop = await boxOf(page, '[...document.querySelectorAll(\'[data-check-panel] [data-check-action="drop-sleeve-row"]\')].find((b) => b.offsetParent)');
  const under = drop ? await page.ask(`(() => { const el = document.elementFromPoint(${drop.x}, ${drop.y}); return el ? (el.getAttribute('data-check-action') || el.tagName + ' ' + (el.textContent || '').trim().slice(0, 40)) : null; })()`) : null;
  if (drop) await clickWith(page, drop.x, drop.y);
  await until(page, `(((${S}.units.find((x) => x.id === ${j(b.id)}).params.sections || [])[0] || { items: [] }).items.find((i) => i.kind === 'shelf') || {}).sleeves_dropped`, 4000);
  await page.sleep(600);
  note('the drop-sleeve-row button and what the page hands its pixel to', `${j(drop)}; under the pointer: ${under}`);
  const it = (await unitOf(page, b.id)).items.find((i) => i.id === (shelf && shelf.id)) || null;
  check('Check (the toolbar button): #1 SHELF x HINGE, "Remove the +50 mm sleeve row" clicked', f1 && drop && it && Array.isArray(it.dropped) && it.dropped.length > 0,
    'the finding with its drop-sleeve-row button; the shelf item sleeves_dropped [50]', `finding ${j(f1)}; button ${Boolean(drop)}; dropped ${j(it && it.dropped)}`);
  await checkClose(page);
  note('the Check panel after its x', (await page.has('[data-check-panel]')) ? 'STILL OPEN' : 'shut');
  // The shelf selected again: its Type row (shelf-type), where the restore button is to stand.
  const pid = shelf ? await shelfPanelOf(page, b.id, shelf.id) : null;
  const sel = pid ? await selectPiece(page, b.id, pid) : null;
  const typeRow = await page.has('[data-shelf-type="1"]');
  check(`the shelf clicked again (${sel ? `by ${sel.by || 'already'}` : 'NOT selected'}): its Type row`, typeRow, '[data-shelf-type] in the piece\'s menu', `element ${j(await elementNow(page))}; type row ${typeRow}`);
  await shot(page, 'f16-stage.png');
  if (typeRow) await domFrame(page, 'document.querySelector(\'[data-shelf-type="1"]\').closest(\'section\')', 'f16-stage-menu.png');
  // T79 ACTION: F16: under the Type chips, `Restore sleeve rows`
  // ([data-restore-sleeve-rows], expected; cc-btn w-full), shown only while
  // item.sleeves_dropped has a row. Click it. PROVES: sleeves_dropped [] on
  // the item, the cluster back in shelf_cluster_y, Check #1 back with its
  // drop button, and the button gone from the menu. Frames f16-restore.png
  // (the button) and f16-restored.png (after).
  await t79Action(page, {
    hook: '[data-restore-sleeve-rows]',
    gesture: 'click [data-restore-sleeve-rows]',
    proves: 'sleeves_dropped [] and the button gone; frames f16-restore.png, f16-restored.png',
    act: async () => {
      const label = await textOf(page, 'document.querySelector(\'[data-restore-sleeve-rows]\')');
      await domFrame(page, 'document.querySelector(\'[data-restore-sleeve-rows]\').closest(\'section\')', 'f16-restore.png');
      const before = await page.ask(`(() => { const r = ${S}.unitResult(${j(b.id)}); return (r.drillSummary && r.drillSummary.shelf_cluster_y) || []; })()`);
      const typeBefore = ((await unitOf(page, b.id)).items.find((i) => i.id === shelf.id) || {}).variant || null;
      // Where the press lands: every Restore button on the page, and what the page hands its centre pixel to.
      const aim = await page.ask(`(() => { const all = [...document.querySelectorAll('[data-restore-sleeve-rows]')].map((el) => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const x = Math.round(r.left + r.width / 2); const y = Math.round(r.top + r.height / 2); const at = document.elementFromPoint(x, y);
        return { x, y, w: Math.round(r.width), h: Math.round(r.height), visible: el.offsetParent !== null, under: at ? (at.getAttribute('data-restore-sleeve-rows') ? 'the Restore button' : at.tagName + ' ' + (at.getAttribute('data-shelf-type-chip') || '') + ' "' + (at.textContent || '').trim().slice(0, 30) + '"') : null }; }); return all; })()`);
      note('the Restore sleeve rows button(s) and what the page hands the centre pixel to', j(aim));
      await page.press('[data-restore-sleeve-rows]');
      await page.sleep(600);
      const it2 = (await unitOf(page, b.id)).items.find((i) => i.id === shelf.id);
      const after = await page.ask(`(() => { const r = ${S}.unitResult(${j(b.id)}); return (r.drillSummary && r.drillSummary.shelf_cluster_y) || []; })()`);
      const pinsAfter = await page.ask(`(() => { const r = ${S}.unitResult(${j(b.id)}); return { pins: (r.drillSummary && r.drillSummary.shelf_pin_row_y) || [], screws: (r.drills || []).filter((d) => /shelf/.test(d.kind || '')).length, kinds: [...new Set((r.drills || []).map((d) => d.kind))] }; })()`);
      const elementAfter = await elementNow(page);
      const gone = !(await page.has('[data-restore-sleeve-rows]'));
      check(`"${label}" (a real click under the Type chips)`, label === 'Restore sleeve rows' && it2 && (!it2.dropped || it2.dropped.length === 0) && gone && j(after) === j(rows.clusters),
        'sleeves_dropped empty, the whole sleeve cluster back (as before the drop), the button gone from the menu', `dropped ${j(it2 && it2.dropped)}; clusters before ${j(before)}, after ${j(after)} (the first reading ${j(rows.clusters)}); button gone ${gone}; the item after ${j(it2)}; pin rows after ${j(pinsAfter)}; selected ${j(elementAfter)}`);
      if (it2 && it2.variant !== typeBefore) {
        const wrap = await page.ask('(() => { const c = document.querySelector(\'[data-shelf-type="1"]\'); const l = c ? c.closest(\'label\') : null; return l ? { label: true, first: (l.querySelector(\'button\') || {}).textContent || null } : { label: false }; })()');
        note('WHY the shelf changed type (diagnosis, read only; the app is not patched)', `the Type before the press ${typeBefore}, after ${it2.variant}. The Type row stands inside a <label> (ElementProperties.jsx Field: ${j(wrap)}); the Restore button is inside that label, and its click empties sleeves_dropped, which unmounts the button during its own click, so the browser's label activation forwards the click to the label's first labelable control, the Fix chip: one real click restores the rows AND makes the shelf FIX, and a FIX shelf takes no sleeves (the store's restoreSleeveRows alone keeps the shelf adjustable and the cluster [570, 620, 670], node probe of 18.10)`);
      }
      await shot(page, 'f16-restored.png');
    },
  });
});

// --- F18 . 21 OR 44 PER SHEET, TWO MENU ENTRIES ------------------------------
await onPage('f18', '21 OR 44 PER SHEET, TWO MENU ENTRIES (PRO)', async (page) => {
  await stagePro(page, 'the labels');
  await placeUnit(page, 'bud');
  await menu(page, 'Output');
  const items = await page.ask('[...document.querySelectorAll(\'[role="menuitem"]\')].filter((b) => b.offsetParent).map((b) => b.textContent.replace(/\\s+/g, \' \').trim().slice(0, 120))');
  const labels = items.filter((t) => /label/i.test(t));
  check('the top bar\'s Output (a real click): the menu open', items.length > 0, 'the Output items, a Part labels entry among them', `${items.length} items; labels entries ${j(labels)}`);
  await shot(page, 'f18-stage.png');
  await domFrame(page, '[...document.querySelectorAll(\'[role="menu"]\')].find((m) => m.offsetParent) || document.querySelector(\'[role="menuitem"]\').parentElement', 'f18-stage-menu.png', 12, 2);
  // T79 ACTION: F18: two entries, `Part labels . 21 per sheet (Avery L7160)`
  // and `Part labels . 44 per sheet` ([role=menuitem] by their text), each
  // calling onExportLabels({sheet}); the stale hint "44 per page" corrected.
  // PROVES: both entries on the menu (frame f18-menu.png); each one clicked
  // saves a PDF (downloadsTo / captureDownload) whose page count matches the
  // 3x7 and 4x11 grids for the project's label count.
  await t79Action(page, {
    hook: null,
    gesture: 'Output: the two Part labels entries; each clicked, the PDF saved',
    proves: 'two entries (21 / 44 per sheet); the PDFs\' page counts match 3x7 and 4x11; frame f18-menu.png',
    act: async () => {
      const two = labels.filter((t) => /21 per sheet|44 per sheet/.test(t));
      check('the two Part labels entries', two.length === 2 && /^Part labels . 21 per sheet \(Avery L7160\)/.test(two[0]) && /^Part labels . 44 per sheet/.test(two[1]) && !labels.some((t) => /44 per page/.test(t)),
        '"Part labels . 21 per sheet (Avery L7160)" and "Part labels . 44 per sheet"; no stale "44 per page"', j(labels));
      await domFrame(page, '[...document.querySelectorAll(\'[role="menu"]\')].find((m) => m.offsetParent) || document.querySelector(\'[role="menuitem"]\').parentElement', 'f18-menu.png', 12, 2);
      await key(page, 'Escape');
      // Each entry clicked (the menu, real clicks): the PDF the browser saves, its pages counted.
      for (const [entry, per, grid] of [['21 per sheet', 21, '3 x 7'], ['44 per sheet', 44, '4 x 11']]) {
        const dir = await downloadsTo(page);
        const s0 = await saidCount(page);
        const file = await captureDownload(dir, () => menu(page, 'Output', `Part labels \u00b7 ${entry}`), page);
        const said = await saidSince(page, s0);
        const words = said.map((m) => m.match(/(\d+) labels on (\d+) pages?, (\d+) per sheet/)).find(Boolean) || null;
        const pdf = file ? readFileSync(file).toString('latin1') : '';
        const pages = (pdf.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
        const labelsN = words ? Number(words[1]) : null;
        check(`Output, Part labels . ${entry} (real clicks): the PDF`, Boolean(file) && /\.pdf$/i.test(file || '') && words && Number(words[3]) === per && pages === Number(words[2]) && pages === Math.ceil(labelsN / per),
          `a .pdf saved; ${per} per sheet (${grid}); its page count = ceil(labels / ${per})`,
          `${file ? file.split('/').pop() : 'nothing saved within 30 s'}; ${pages} page(s) in the file; said ${j(said)}`);
      }
    },
  });
  await key(page, 'Escape');
});

// === THE LEDGER =============================================================
const fresh = process.argv.includes('--fresh');
const ledger = `${SHOTS}walk.txt`;
const today = new Date().toISOString().slice(0, 10);
const HEAD = [
  `T79 walk, ${today}, HEAD ${head}`,
  `(the app under the mouse: ${BASE}, its build stamp is the first NOTE of each section)`,
  '',
  'CLAUDE.md T79 (F1 to F18), walked section by section against npx vite preview',
  'of this tree (dist/), the hardware served from the silent showroom. Every',
  'gesture is a REAL mouse or key event at a DOM control\'s centre or at a pixel',
  'the scene\'s own raycaster says the thing is under (and the page says the',
  'canvas owns); the store is only READ. Line grammar:',
  '  PASS|FAIL  <section> | <gesture> | expect: <what was expected> | observed: <what was read>',
  '  NOTE       <section> | <reading> | <value>',
  '  TODO       <section> | T79 ACTION: <gesture> | proves: <what> [hook]',
  '  FRAME      <section> | <file>  (the frame is beside this file)',
  'A FAIL is written down, never patched. A TODO is an action not walked (the',
  'scaffolding of 18.10 wrote one per F before it landed); with --act every',
  'section\'s action runs, so a TODO is left only where a run had no --act.',
  '',
].join('\n');
// One block per section; a rerun of a section replaces its block.
const blocks = new Map();
if (!fresh && existsSync(ledger)) {
  let name = null;
  for (const line of readFileSync(ledger, 'utf8').split('\n')) {
    const m = line.match(/^=== (f\d\d) /);
    if (m) { name = m[1]; blocks.set(name, [line]); continue; }
    if (/^(T79:|SECTION |FRAMES )/.test(line)) { name = null; continue; }
    if (name && line.trim()) blocks.get(name).push(line);
  }
}
for (const name of new Set(steps.map((s) => s.section))) {
  const mine = steps.filter((s) => s.section === name);
  const top = mine.find((s) => s.header);
  blocks.set(name, [
    `=== ${name} ${top ? top.header : ''}`,
    `NOTE       ${name} | walked at | ${top ? top.at : ''} UTC, HEAD ${head}${ACT ? ', --act' : ''}`,
    ...mine.filter((s) => !s.header).map((s) => {
      if (s.frame) return `FRAME      ${name} | ${s.frame}`;
      if (s.note) return `NOTE       ${name} | ${s.gesture} | ${s.got}`;
      if (s.todo) return `TODO       ${name} | ${s.gesture} | proves: ${s.got}`;
      return `${s.ok ? 'PASS' : 'FAIL'}       ${name} | ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
    }),
  ]);
}
const names = [...blocks.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
const counts = names.map((n) => {
  const lines = blocks.get(n);
  return {
    n,
    pass: lines.filter((x) => x.startsWith('PASS')).length,
    fail: lines.filter((x) => x.startsWith('FAIL')).length,
    todo: lines.filter((x) => x.startsWith('TODO')).length,
  };
});
const total = counts.reduce((s, c) => ({ pass: s.pass + c.pass, fail: s.fail + c.fail, todo: s.todo + c.todo }), { pass: 0, fail: 0, todo: 0 });
const framesOf = (n) => blocks.get(n).filter((x) => x.startsWith('FRAME')).map((x) => x.split(' | ').pop().trim());
const lost = names.flatMap(framesOf).filter((f) => !existsSync(`${SHOTS}${f}`));
if (lost.length) process.stdout.write(`FRAMES MISSING ON DISK: ${lost.join(', ')}\n`);
writeFileSync(ledger, ascii([
  HEAD,
  ...names.flatMap((n) => [...blocks.get(n), '']),
  ...counts.map((c) => `SECTION ${c.n}: ${c.pass} pass, ${c.fail} fail, ${c.todo} todo`),
  ...names.map((n) => { const mine = framesOf(n); return `FRAMES ${n} (${mine.length}): ${mine.join(', ')}${lost.some((f) => mine.includes(f)) ? ` (MISSING ON DISK: ${mine.filter((f) => lost.includes(f)).join(', ')})` : ''}`; }),
  `T79: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail, ${total.todo} T79 actions still to walk`,
  '',
].join('\n')));
const failed = steps.filter((s) => !s.header && !s.note && !s.frame && !s.todo && !s.ok);
process.stdout.write(`\nT79: ${total.pass + total.fail} steps, ${total.pass} pass, ${total.fail} fail, ${total.todo} todo\nfailed this run: ${failed.length}; frames ${frames.join(', ')}\n`);
await showroomDown();
process.exit(failed.length ? 1 : 0);
