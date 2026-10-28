/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F8, THE WALK (CLAUDE.md T84 PART F)
//
// CLAUDE.md T84 F8: "`scripts/t84-walk.mjs`, real mouse, the built app, ledger
// `verify/t84/walk.txt`, frames `verify/t84/f08-*.png`, at 1280 x 800,
// 1440 x 900 and 1920 x 1080: (1) the T81 kitchen loaded, the shell up, every
// legacy menu opened and its leaves counted against the census; (2) a BUD
// clicked: the quick card, Width typed 920 refused in red with the engine's
// words, 760 applied, Undo, Redo; Doors to the panel's doors section; Full
// settings, Pin, another cabinet clicked and the panel following, a part
// double-clicked and the part window beside it (and the door window by the
// profile's conduct); (3) a finding made: the marker on the unit, the strip in
// the card, Show framing the unit, the counter on the status bar opening the
// filtered Check; (4) the four toggles and View, the camera bar A to D, Plan,
// Iso, Frame selection; (5) Add beside the rail and a corner L added from the
// library, its generic card with Arm A / Arm B; a mirror cabinet's card with
// its bays warning; (6) Materials, Output, Drawings preview; BOM in the top
// bar; (7) Escape, one level at a time, from a field edit to the cabinet
// selection; (8) the 1280 layout without horizontal scroll in the panel.
// Every frame compared with the designer's HTML at the same size in the ledger
// (what differs, in px, and why)." The owner, 27.10.2026: *"chcialbym jako
// uzytkownik widziec jakie beda zmiany"*, *"czy zadna funkcja nam nie zginie?
// np corners etc"*.
//
// THE GESTURES ARE REAL: the top bar's legacy menus (opened by a click, their
// submenus by a hover), the rail, the quick card's fields and rows, the
// panel's Pin and Quick, the scene's toggles, View and camera bar, the issue
// marker, strip and counters, the Library's groups and rows, the part and the
// door windows (double clicks on a piece's own pixel), the windows' x, and
// every Escape are the browser's own input pipe (CDP Input.dispatchMouseEvent
// / dispatchKeyEvent), aimed at a control's centre or at a piece's own pixel
// (scripts/t74-harness.mjs, scripts/t75-harness.mjs). THE STAGES that are not
// what a step is about (the T81 kitchen, the room's far corner bitten so one
// wall is 900 mm, a vanity, a shelf for the Escape ladder, the camera put in
// front of a cabinet) are the store's own actions, as scripts/t83-walk.mjs
// puts its stages; the engine and the scene are READ to say what happened
// (window.__cc). A FAIL is written down, never patched.
//
// THE DESIGNER'S FRAMES: every frame is followed by the same boxes measured on
// the designer's Stage-1 (verify/t84/astra/Cabinet-Core-PRO-Studio-Stage-1.html)
// in a second browser at the same viewport, with the fixture that matches the
// app's state (?type=base|wall|wardrobe|vanity|mirror|hawa|panel, &inspector=
// full&pin=1, &fixture=none|multi): the top bar, the context strip, the rail,
// the scene slot, the inspector, the status bar, the card's head, rows and
// actions; a NOTE says what differs in px and why.
//
//   node scripts/t84-walk.mjs --build --serve            build to --dist (dist), serve it on --port, walk, stop it
//   E2E_URL=http://127.0.0.1:4191/ node scripts/t84-walk.mjs      a build already served
//   node scripts/t84-walk.mjs --legs 1,2 --sizes 1440x900          some legs, some sizes (also T84_LEGS, T84_SIZES)
//   node scripts/t84-walk.mjs --out-dir /tmp/x/                     the ledger and the frames elsewhere
//
// Chromium: /opt/pw-browsers (CHROME_PATH is set from it when unset); nothing
// is downloaded. Ledger: verify/t84/walk.txt. Frames: verify/t84/f08-*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import {
  mkdirSync, mkdtempSync, writeFileSync, existsSync, readdirSync, readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

// === THE ARGUMENTS ==========================================================
const T0 = Date.now();
const REPO = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const LEGS = String(opt('legs', process.env.T84_LEGS || '1,2,3,4,5,6,7,8')).split(',').map((s) => s.trim()).filter((s) => /^[1-8]$/.test(s)).map(Number);
const SIZES = String(opt('sizes', process.env.T84_SIZES || '1280x800,1440x900,1920x1080')).split(',')
  .map((s) => s.trim().match(/^(\d{3,4})x(\d{3,4})$/)).filter(Boolean).map((m) => ({ w: Number(m[1]), h: Number(m[2]) }));
const PORT = Number(opt('port', process.env.E2E_PORT || 4173));
const BASE = String(process.env.E2E_URL || `http://127.0.0.1:${PORT}/`).replace(/\/?$/, '/');
const DIST = opt('dist', 'dist');
const OUT = String(opt('out-dir', opt('out', new URL('../verify/t84/', import.meta.url).pathname))).replace(/\/?$/, '/');
// The one size where every camera place is framed; the others frame A and Plan.
const CAMERA_ALL_AT = Number(opt('camera-frames-at', 1440));
mkdirSync(OUT, { recursive: true });
const SCRATCH = mkdtempSync(join(tmpdir(), 't84-walk-'));
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
  open, showroomDown, settleCamera, pointOn,
} = await import('./t74-harness.mjs');
const {
  key, clickWith, until, orbitFree,
} = await import('./t75-harness.mjs');
const { launch } = await import('./cdp.mjs');
// The pure halves the walk reads its expectations from (no React, no store).
const { lCorners, realWalls } = await import('../src/engine/room.js');
const { cardKindOf } = await import('../src/components/studio/lib/studioCards.js');

// === THE BUILD AND THE SERVER (--build, --serve) ============================
let preview = null;
async function served() {
  try { const r = await fetch(BASE); return r.ok; } catch { return false; }
}
if (flag('build')) {
  process.stdout.write(`npx vite build --outDir ${DIST} --emptyOutDir ...\n`);
  execFileSync('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], { cwd: REPO, stdio: 'inherit' });
}
if (flag('serve') && !(await served())) {
  preview = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: REPO, stdio: 'ignore', detached: true });
  for (let t = 0; t < 120 && !(await served()); t += 1) await new Promise((r) => { setTimeout(r, 500); });
}
const stopPreview = () => { if (preview) { try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* gone */ } preview = null; } };
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopPreview(); process.exit(130); });
if (!(await served())) {
  process.stdout.write(`No app at ${BASE}: build it and serve it (npx vite build; npx vite preview --port ${PORT} --strictPort), or pass --build --serve.\n`);
  stopPreview();
  process.exit(2);
}

// The census of main (P1): the parity the menus are counted against.
const CENSUS = JSON.parse(readFileSync(`${REPO}verify/t84/census-main.json`, 'utf8'));
const CENSUS_MENUS = CENSUS.live.topMenu;

// === THE LEDGER =============================================================
const steps = [];
const frames = [];
let LEG = 0;
let SIZE = { w: 0, h: 0 };
const sizeName = () => `${SIZE.w}`;
const ascii = (t) => String(t)
  .replace(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'g'), '-')
  .replace(new RegExp(String.fromCharCode(0xb7), 'g'), '.')
  .replace(new RegExp(String.fromCharCode(0xd7), 'g'), 'x')
  .replace(new RegExp(String.fromCharCode(0x2026), 'g'), '...')
  .replace(new RegExp(String.fromCharCode(0x203a), 'g'), '>')
  .replace(new RegExp(String.fromCharCode(0xb0), 'g'), ' deg')
  .replace(new RegExp(String.fromCharCode(0x2713), 'g'), 'v')
  .replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const push = (kind, F, gesture, expect = '', got = '') => {
  steps.push({
    kind, size: sizeName(), leg: LEG, F, gesture: ascii(gesture), expect: ascii(expect), got: ascii(got),
  });
  const tag = `[${sizeName()} ${LEG}]`;
  process.stdout.write(`${kind.padEnd(5)} ${tag} ${F} ${ascii(gesture)}${kind === 'NOTE' ? ` | ${ascii(got)}` : (kind === 'FRAME' || kind === 'LEG' || kind === 'SIZE' ? '' : ` | expect: ${ascii(expect)} | observed: ${ascii(got)}`)}\n`);
};
const check = (F, gesture, ok, expect, got) => { push(ok ? 'PASS' : 'FAIL', F, gesture, expect, got); return Boolean(ok); };
const note = (F, gesture, got) => push('NOTE', F, gesture, '', got);
const j = (v) => JSON.stringify(v);
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const HIST = 'window.__cc.history.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const T = 'window.__t84';
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));
const near = (a, b, tol = 0.6) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) <= tol;
const r3 = (v) => Math.round(Number(v) * 1000) / 1000;
const rgbOf = (hex) => {
  const m = String(hex || '').match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? `rgb(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)})` : null;
};

/** A hook a slice puts on the page (verify/t84/agents/CONTRACT.md 6): there, or a FAIL naming it and the slice. */
async function need(page, F, slice, what, selector) {
  const ok = await page.ask(`Boolean(${T}.first(${j(selector)}))`).catch(() => false);
  if (ok) return true;
  push('FAIL', F, `${what}: not on the page (slice ${slice})`, `the hook ${selector}`, 'absent');
  return false;
}

// === THE PAGE'S OWN READERS (injected; read-only) ===========================
// One function, stringified into the page, so no expression is escaped twice.
/* eslint-disable no-undef */
function pageLib() {
  const L = {};
  const css = (el) => (el ? getComputedStyle(el) : null);
  L.vis = (el) => Boolean(el) && el.getClientRects().length > 0 && css(el).visibility !== 'hidden' && css(el).display !== 'none';
  L.all = (sel) => [...document.querySelectorAll(sel)].filter(L.vis);
  L.first = (sel, text = null) => L.all(sel).find((e) => text == null || (e.textContent || '').replace(/\s+/g, ' ').trim().includes(text)) || null;
  L.rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
    };
  };
  L.centre = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height),
    };
  };
  L.text = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null);
  L.view = () => (window.__cc.views && window.__cc.views.room) || null;
  L.hidden = (o) => { for (let a = o; a; a = a.parent) { if (a.visible === false) return true; if (a.userData && a.userData.ccHelper) return true; } return false; };
  L.group = (id) => { const v = L.view(); let g = null; if (!v) return null; v.scene.traverse((o) => { if (!g && o.userData && o.userData.ccUnitId === id) g = o; }); return g; };
  /** The world box of the drawn meshes of some units (or of one piece of them). */
  L.box = (ids, panelId = null) => {
    const v = L.view(); if (!v) return null; const TH = v.three; const box = new TH.Box3();
    v.scene.updateMatrixWorld(true);
    v.scene.traverse((o) => {
      if (!o.isMesh || L.hidden(o)) return;
      let a = o; while (a && !(a.userData && a.userData.ccUnitId != null)) a = a.parent;
      if (!a || !ids.includes(a.userData.ccUnitId)) return;
      if (panelId != null && !(o.userData && o.userData.ccPanelId === panelId)) return;
      box.expandByObject(o);
    });
    return box.isEmpty() ? null : box;
  };
  /** A world box on the glass: its screen rectangle and how far into the frame its corners reach. */
  L.onGlass = (box) => {
    const v = L.view(); if (!v || !box) return null; const TH = v.three; const r = v.gl.domElement.getBoundingClientRect();
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity; let ndc = 0; let front = true;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new TH.Vector3(x, y, z).project(v.camera);
      if (p.z > 1) front = false;
      ndc = Math.max(ndc, Math.abs(p.x), Math.abs(p.y));
      const px = r.left + (p.x * 0.5 + 0.5) * r.width; const py = r.top + (-p.y * 0.5 + 0.5) * r.height;
      x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    }
    return {
      x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0), ndc: Math.round(ndc * 1000) / 1000, front,
    };
  };
  L.unitOnGlass = (ids, panelId = null) => L.onGlass(L.box(ids, panelId));
  /**
   * The box Frame selection fits (3d/renderCapture.js furnitureBounds over the
   * units' roots, components/studio/lib/cameraPresets.js unitRoots): every mesh
   * of the unit, a tool's subtree (ccHelper) and the hardware (ccNoBounds: the
   * legs, the handles, the hinges) left out.
   */
  L.fitBox = (ids) => {
    const v = L.view(); if (!v) return null; const TH = v.three; const box = new TH.Box3(); const one = new TH.Box3();
    const roots = []; const find = (o) => { if (!o || (o.userData && o.userData.ccHelper)) return; if (o.userData && o.userData.ccUnitId != null) { if (ids.includes(o.userData.ccUnitId)) roots.push(o); return; } for (const c of o.children) find(c); };
    find(v.scene);
    const walk = (o) => { if (!o || (o.userData && (o.userData.ccHelper || o.userData.ccNoBounds))) return; if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); one.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(one); } for (const c of o.children) walk(c); };
    for (const r of roots) { r.updateWorldMatrix(true, true); walk(r); }
    return box.isEmpty() ? null : box;
  };
  L.fitOnGlass = (ids) => L.onGlass(L.fitBox(ids));
  /** The camera: where it stands, where it looks, from the target to the eye as a unit vector. */
  L.pose = () => {
    const v = L.view(); if (!v) return null; const c = v.camera; const t = v.controls && v.controls.target;
    const p = [c.position.x, c.position.y, c.position.z]; const at = t ? [t.x, t.y, t.z] : [0, 0, 0];
    const d = [p[0] - at[0], p[1] - at[1], p[2] - at[2]]; const n = Math.hypot(...d) || 1;
    const R = (x) => Math.round(x * 1000) / 1000;
    return { pos: p.map(R), at: at.map(R), dir: d.map((x) => R(x / n)), dist: R(n) };
  };
  /** The STAGE camera: in front of some units, along the first one's own facing (its group's +z, out of its wall). */
  L.frameUnits = (ids, o) => {
    const v = L.view(); if (!v) return null; const TH = v.three;
    const g = L.group(ids[0]); if (!g) return null; g.updateMatrixWorld(true);
    const facing = new TH.Vector3(0, 0, 1).transformDirection(g.matrixWorld).setY(0).normalize();
    const box = L.box(ids); if (!box) return null;
    const c = box.getCenter(new TH.Vector3()); const s = box.getSize(new TH.Vector3());
    const across = new TH.Vector3(facing.z, 0, -facing.x);
    const r = Math.max(s.x, s.y, s.z) * 0.5 * (o.pad || 1.4); const fov = ((v.camera.fov || 45) * Math.PI) / 180;
    const d = r / Math.tan(fov / 2) + Math.min(s.x, s.z) / 2;
    const eye = c.clone().addScaledVector(facing, d).addScaledVector(across, d * (o.side || 0)).add(new TH.Vector3(0, d * (o.up || 0), 0));
    v.camera.position.copy(eye); v.controls.target.copy(c); v.controls.update();
    return { c: c.toArray().map((x) => Math.round(x * 1000)), eye: eye.toArray().map((x) => Math.round(x * 1000)) };
  };
  /** A pixel the canvas owns with no cabinet under it (scripts/t75-harness.mjs EMPTY). */
  L.empty = () => {
    const v = L.view(); if (!v) return null; const TH = v.three; const c = v.gl.domElement;
    const r = c.getBoundingClientRect(); const ray = new TH.Raycaster();
    for (const fy of [0.85, 0.78, 0.7, 0.3, 0.2]) for (const fx of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const px = Math.round(r.left + fx * r.width); const py = Math.round(r.top + fy * r.height);
      const el = document.elementFromPoint(px, py); if (!(el === c || (el && c.contains(el)))) continue;
      ray.setFromCamera(new TH.Vector2(fx * 2 - 1, -(fy * 2 - 1)), v.camera);
      let hits = [];
      try { hits = ray.intersectObjects(v.scene.children, true); } catch (e) { hits = []; }
      const hit = hits.find((h) => h.object.isMesh && h.object.visible);
      let unit = false; for (let a = hit && hit.object; a; a = a.parent) { if (a.userData && a.userData.ccUnitId) unit = true; }
      if (!unit) return { x: px, y: py };
    }
    return null;
  };
  /** Of a piece's pixels, the ones the canvas owns (no panel, popup or marker over them), the one nearest their middle (scripts/t75-harness.mjs FREE). */
  L.free = (points) => {
    const v = L.view(); if (!v) return null; const c = v.gl.domElement;
    const own = points.filter((p) => { const el = document.elementFromPoint(p.x, p.y); return el === c || (el && c.contains(el)); });
    if (!own.length) return null;
    const cx = own.reduce((s, p) => s + p.x, 0) / own.length; const cy = own.reduce((s, p) => s + p.y, 0) / own.length;
    own.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    return { x: own[0].x, y: own[0].y, n: own.length };
  };
  /** The room's meshes that take no pointer make three's raycast throw inside the finder (scripts/t82-walk.mjs). */
  L.safeRays = () => { const v = L.view(); if (!v) return 0; let n = 0; v.scene.traverse((o) => { if (typeof o.raycast !== 'function') { o.raycast = () => {}; n += 1; } }); return n; };
  /** One menu of the legacy MenuBar, read as scripts/t84-census.mjs reads it. */
  L.menuItems = (menu) => {
    if (!menu) return [];
    return [...menu.children].map((child) => {
      if (child.classList.contains('cc-divider')) return null;
      const slider = child.querySelector(':scope input[data-menu-slider]');
      if (slider) {
        const span = child.querySelector('span.flex-1'); const r = slider.getBoundingClientRect();
        return {
          label: (span ? span.textContent : '').trim(), slider: true, disabled: slider.disabled, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
        };
      }
      const b = child.querySelector(':scope > button[role="menuitem"]'); if (!b) return null;
      const span = b.querySelector('span.flex-1'); const r = b.getBoundingClientRect();
      return {
        label: (span ? span.textContent : b.textContent).trim(), sub: Boolean(b.querySelector('span[aria-hidden]')), disabled: b.disabled, soon: Boolean(b.querySelector('.cc-tag')), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
      };
    }).filter(Boolean);
  };
  L.topMenu = () => document.querySelector('nav[aria-label="Main menu"] [role="menu"]');
  L.subMenu = (k) => {
    const outer = L.topMenu(); if (!outer) return null;
    const holder = [...outer.children].filter((c) => !c.classList.contains('cc-divider'))[k];
    return holder ? holder.querySelector(':scope [role="menu"]') : null;
  };
  /** A card row's refused field, as the eye and the guard read it. */
  L.refused = (rowKey) => {
    const row = document.querySelector(`[data-studio="card"] [data-row="${rowKey}"]`); if (!row) return null;
    const w = row.querySelector('[data-studio="refused"]'); const input = row.querySelector('input'); const reason = row.querySelector('.studio-refused-reason');
    const cr = css(reason); const ci = css(input);
    return {
      wrapper: Boolean(w), refused: w ? w.getAttribute('data-refused') : null, refusal: w ? w.getAttribute('data-refusal') : null,
      reason: reason ? reason.textContent.trim() : null, value: input ? input.value : null, focused: document.activeElement === input,
      reasonFont: cr && cr.fontSize, reasonBg: cr && cr.backgroundColor, reasonColour: cr && cr.color,
      fieldBorder: ci && ci.borderTopColor, ariaInvalid: input ? input.getAttribute('aria-invalid') : null,
    };
  };
  /**
   * Who owns a window's own pixels: a grid of points inside its rectangle, each
   * asked of document.elementFromPoint; the ones another element stands over,
   * by that element's Studio hook (or its tag and class).
   */
  L.overWindow = (name) => {
    const w = L.all('[data-modal-shell="1"]').find((e) => e.getAttribute('data-modal-name') === name); if (!w) return null;
    const r = w.getBoundingClientRect(); const out = {}; let n = 0; let mine = 0; let messageLayer = 0;
    for (let i = 0; i < 7; i += 1) for (let k = 0; k < 9; k += 1) {
      const x = Math.round(r.left + 4 + ((r.width - 8) * i) / 6); const y = Math.round(r.top + 4 + ((r.height - 8) * k) / 8);
      if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
      n += 1; const el = document.elementFromPoint(x, y);
      if (el && w.contains(el)) { mine += 1; continue; }
      // The layer it stands on: the highest z-index among its positioned ancestors (lib/modalLayer.js's order).
      let z = 0; for (let a = el; a && a !== document.body; a = a.parentElement) { const zi = Number(getComputedStyle(a).zIndex); if (Number.isFinite(zi)) z = Math.max(z, zi); }
      const hook = el && el.closest('[data-studio]');
      const msg = el && el.closest('[data-message-history-toggle], [data-message-history-list]');
      const who = (msg ? 'the Changes control (Messages.jsx HistoryBar) ' : '') + (hook ? `[data-studio="${hook.getAttribute('data-studio')}"]` : (el ? `${el.tagName.toLowerCase()}.${String(el.className || '').split(' ').slice(0, 2).join('.')}` : 'none')) + ` z ${z}`;
      if (z >= 60) messageLayer += 1;
      out[who] = (out[who] || []).concat([[x, y]]).slice(0, 3);
    }
    return { points: n, mine, messageLayer, others: out };
  };
  /** The shell's own controls a window's rectangle meets, each said under it or over it (who owns its centre). */
  L.shellUnder = (name) => {
    const w = L.all('[data-modal-shell="1"]').find((e) => e.getAttribute('data-modal-name') === name); if (!w) return null;
    const r = w.getBoundingClientRect();
    const items = [...document.querySelectorAll('[data-studio="topbar"] button, [data-studio="topbar"] .studio-wordmark, [data-studio="topbar"] .studio-project-name, [data-studio="rail"] button, [data-studio="breadcrumb"] nav, [data-studio="statusbar"] button, [data-studio="statusbar"] [data-studio]')].filter(L.vis);
    return items.filter((e) => { const b = e.getBoundingClientRect(); return b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top; }).map((e) => {
      const b = e.getBoundingClientRect(); const cx = Math.round(b.left + b.width / 2); const cy = Math.round(b.top + b.height / 2);
      const said = e.getAttribute('data-studio') || L.text(e).slice(0, 18);
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return `${said}: partly under the window (its centre clear of it)`;
      const at = document.elementFromPoint(cx, cy);
      return `${said}: ${at && w.contains(at) ? 'under the window' : 'OVER the window'}`;
    });
  };
  /** The shell's boxes and the inspector's content, for the designer's comparison. */
  L.appBoxes = () => {
    const card = L.first('[data-studio="card"]');
    const insp = L.first('[data-studio="inspector"]');
    const aside = L.first('aside[data-panel-layout="embedded"]');
    const ui = window.__cc.ui.getState();
    const unit = ui.selectedUnitId ? window.__cc.project.getState().units.find((u) => u.id === ui.selectedUnitId) : null;
    const vb = L.first('[data-studio="view-menu"]'); const vs = vb ? getComputedStyle(vb) : null;
    return {
      viewStyle: vs ? { font: vs.fontSize, pad: `${vs.paddingLeft}/${vs.paddingRight}`, gap: vs.columnGap } : null,
      topbar: L.rect(L.first('[data-studio="topbar"]')),
      context: L.rect(L.first('[data-studio="breadcrumb"]')),
      rail: L.rect(L.first('[data-studio="rail"]')),
      scene: L.rect(L.first('[data-studio="scene"]')),
      inspector: L.rect(insp),
      status: L.rect(L.first('[data-studio="statusbar"]')),
      view: L.rect(L.first('[data-studio="view-menu"]')),
      links: L.rect(L.first('[data-studio="camera-bar"]')),
      head: card ? L.rect(card.querySelector('.studio-inspector-head')) : null,
      actions: card ? L.rect(card.querySelector('.studio-card-actions')) : null,
      fullHead: aside ? L.rect(aside.firstElementChild) : null,
      rows: card ? [...card.querySelectorAll('[data-studio="card-row"]')].filter(L.vis).map((r) => ({
        key: r.getAttribute('data-row'), label: L.text(r.querySelector('.cc-label')), refused: Boolean(r.querySelector('.studio-refused-reason')), kind: r.getAttribute('data-row-kind'), ...L.rect(r),
      })) : [],
      ...(() => {
        // What stands between the rows' frame and the actions, and where the rows end.
        const body = card ? card.querySelector('.studio-inspector-body') : null; if (!body) return { between: [], rowsBottom: null };
        const kids = [...body.children]; const fi = kids.findIndex((k) => k.classList.contains('cc-frame')); const ai = kids.findIndex((k) => k.classList.contains('studio-card-actions'));
        const nameOf = (k) => {
          if (k.hasAttribute('data-issue-unit')) return `issue strips x${k.querySelectorAll('[data-studio="issue-strip"]').length}`;
          if (k.hasAttribute('data-card-warning')) return 'warning'; if (k.hasAttribute('data-card-note')) return 'note';
          if (k.classList.contains('studio-inheritance')) return 'inheritance'; return (k.className || k.tagName).toString().split(' ')[0];
        };
        const fr = fi >= 0 ? kids[fi].getBoundingClientRect() : null;
        return { between: kids.slice(fi + 1, ai < 0 ? undefined : ai).filter(L.vis).map((k) => [nameOf(k), Math.round(k.getBoundingClientRect().height)]), rowsBottom: fr ? Math.round(fr.bottom) : null };
      })(),
      mode: insp ? insp.getAttribute('data-mode') : 'none',
      cardKind: card ? card.getAttribute('data-card-type') : null,
      unitType: unit ? unit.type : null,
      several: (ui.selectedUnitIds || []).length > 1,
      pinned: Boolean(ui.inspectorPinned),
      menus: L.all('nav[aria-label="Main menu"] > div > button').map((b) => [L.text(b), L.rect(b)]),
    };
  };
  window.__t84 = L;
  return true;
}
/** The same boxes on the designer's Stage-1 (verify/t84/astra/), read in the second browser. */
function astraLib() {
  const vis = (el) => Boolean(el) && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
  const rect = (el) => {
    if (!vis(el)) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
    };
  };
  const $ = (s) => document.querySelector(s);
  const quick = $('#inspector .inspector-head');
  const vb = $('.scene-tools button'); const vs = vb ? getComputedStyle(vb) : null;
  return {
    viewStyle: vs ? { font: vs.fontSize, pad: `${vs.paddingLeft}/${vs.paddingRight}`, gap: vs.columnGap } : null,
    topbar: rect($('.topbar')),
    context: rect($('.context')),
    rail: rect($('.rail')),
    scene: rect($('#scene-slot')),
    inspector: rect($('#inspector')),
    status: rect($('.statusbar')),
    view: rect($('.scene-tools button')),
    links: rect($('.scene-links')),
    head: rect(quick),
    actions: rect($('#inspector .card-actions')),
    fullHead: rect($('#inspector .full-head')),
    rows: quick ? [...document.querySelectorAll('#inspector .field-row')].filter(vis).map((r) => ({ label: ((r.querySelector('.cc-label') || {}).textContent || '').trim(), ...rect(r) })) : [],
    menus: [...document.querySelectorAll('.legacy-menu > button')].filter(vis).map((b) => [(b.textContent || '').trim(), rect(b)]),
    inspectorMode: document.getElementById('studio-pro').getAttribute('data-inspector'),
    ...(() => {
      const body = document.querySelector('#inspector .inspector-body'); if (!quick || !body) return { between: [], rowsBottom: null };
      const kids = [...body.children]; const fi = kids.findIndex((k) => k.classList.contains('cc-frame')); const ai = kids.findIndex((k) => k.classList.contains('card-actions'));
      const nameOf = (k) => (k.classList.contains('issue-strip') ? 'warning (her issue-strip)' : (k.classList.contains('inline-note') ? 'note' : (k.className || k.tagName).toString().split(' ')[0]));
      const fr = fi >= 0 ? kids[fi].getBoundingClientRect() : null;
      return { between: kids.slice(fi + 1, ai < 0 ? undefined : ai).filter(vis).map((k) => [nameOf(k), Math.round(k.getBoundingClientRect().height)]), rowsBottom: fr ? Math.round(fr.bottom) : null };
    })(),
  };
}
/* eslint-enable no-undef */
async function inject(page) { await page.ask(`(${pageLib.toString()})()`); }

// === THE HANDS (all real events) ============================================
/** The first visible element a selector names (with this text), pressed by a real click at its centre. */
async function press(page, selector, { text = null, wait = 0 } = {}) {
  const at = await page.ask(`${T}.centre(${T}.first(${j(selector)}, ${j(text)}))`);
  if (!at) return null;
  await clickWith(page, at.x, at.y);
  if (wait) await page.sleep(wait);
  return at;
}
async function moveTo(page, x, y, wait = 300) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await page.sleep(wait);
}
/** Select-all in the focused field: Ctrl+A with the editor's own selectAll command (scripts/t76-walk.mjs). */
async function selectAll(page) {
  const k = {
    key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k, commands: ['selectAll'] });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(120);
}
/** A number typed into a field: a real click on it, Ctrl+A, the digits, then Enter (unless asked not to). */
async function typeInto(page, selector, value, { enter = true, click = true } = {}) {
  if (click) {
    const at = await page.ask(`${T}.centre(${T}.first(${j(selector)}))`);
    if (!at) return { ok: false, why: `no ${selector} on the screen` };
    await clickWith(page, at.x, at.y);
  }
  await selectAll(page);
  await page.typeText(String(value));
  if (enter) await key(page, 'Enter');
  await page.sleep(700);
  return { ok: true, shown: await page.ask(`(${T}.first(${j(selector)}) || {}).value ?? null`) };
}
/** Tab, a real key, quickly. */
async function tab(page) {
  const k = {
    key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(45);
}
/**
 * A piece's own pixel a hand can click (scripts/t75-harness.mjs reachFree, for
 * several pieces at once): the scene's raycaster meets the piece first there
 * (scripts/t74-harness.mjs pointOn) and the page says the canvas owns it (no
 * panel, popup or marker over it). The camera as it stands first, for every
 * piece named; then turned by a real drag on the empty floor, and asked again.
 */
async function reachAny(page, unitId, panelIds, turns = [[0, 0], [120, 0], [-240, 0], [120, 120], [260, 0]]) {
  await page.ask(`${T}.safeRays()`);
  await settleCamera(page);
  for (const [dx, dy] of turns) {
    if (dx || dy) { if (!(await orbitFree(page, dx, dy))) continue; }
    for (const pid of panelIds) {
      const all = await pointOn(page, unitId, pid, { all: true, grid: 40 });
      if (!all || !all.points || !all.points.length) continue;
      const at = await page.ask(`${T}.free(${j(all.points)})`);
      if (at) return { ...at, pid };
    }
  }
  return null;
}
const reach = (page, unitId, panelId) => reachAny(page, unitId, [panelId]);
/**
 * How much of a piece a window stands over: the piece's own pixels (where the
 * scene's raycaster meets it first, scripts/t74-harness.mjs pointOn over a 40 x
 * 40 grid of its projected box) and, of them, those document.elementFromPoint
 * says the window owns.
 */
async function coveredBy(page, unitId, panelId, name) {
  await page.ask(`${T}.safeRays()`);
  const all = await pointOn(page, unitId, panelId, { all: true, grid: 40 });
  const pts = all && all.points ? all.points : [];
  const covered = await page.ask(`(() => { const w = ${T}.all('[data-modal-shell="1"]').find((e) => e.getAttribute('data-modal-name') === ${j(name)}); if (!w) return null;
    return ${j(pts)}.filter((p) => { const el = document.elementFromPoint(p.x, p.y); return Boolean(el && w.contains(el)); }).length; })()`);
  return { pixels: pts.length, covered };
}
/** The stage camera in front of some units, then let settle. */
async function frameUnits(page, ids, o = {}) {
  const r = await page.ask(`${T}.frameUnits(${j(ids)}, ${j({ side: 0.3, up: 0.3, pad: 1.4, ...o })})`);
  await page.sleep(400);
  await settleCamera(page);
  return r;
}
/** A unit selected by a real click on one of its pieces, the carcass first. */
async function clickUnit(page, unitId, prefer = ['BUL', 'BUR', 'TOP']) {
  const ids = await page.ask(`(() => { const r = ${S}.unitResult(${j(unitId)}); if (!r) return [];
    const all = r.panels.filter((p) => p.box).map((p) => p.id); const want = ${j(prefer)}.filter((k) => all.includes(k));
    const fronts = r.panels.filter((p) => p.box && (p.part === 'FRONT' || p.part === 'DRAWER-FRONT')).map((p) => p.id);
    return [...new Set([...want, ...fronts, ...all])]; })()`);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const at = await reachAny(page, unitId, ids.slice(0, 6));
    if (!at) return null;
    await clickWith(page, at.x, at.y);
    if (await until(page, `${UI}.selectedUnitId === ${j(unitId)}`, 4000)) return { pid: at.pid, at: { x: at.x, y: at.y } };
  }
  return null;
}
/** The windows on the screen (components/Modal.jsx data-modal-*). */
const windowsNow = (page) => page.ask(`${T}.all('[data-modal-shell="1"]').map((w) => ({ name: w.getAttribute('data-modal-name'), dock: w.getAttribute('data-modal-dock'), sticky: w.getAttribute('data-modal-sticky'), rect: ${T}.rect(w), title: ${T}.text(w.querySelector('h2')) }))`);
/** A window shut by its own x (a real click). */
async function closeWindow(page, name = null) {
  const sel = name ? `[data-modal-shell="1"][data-modal-name="${name}"] [data-modal-close="1"]` : '[data-modal-shell="1"] [data-modal-close="1"]';
  const at = await press(page, sel);
  await page.sleep(400);
  return Boolean(at);
}
/** Whatever is open shut, as a hand shuts it (the windows' x, the panels' x), before a leg. */
async function tidy(page) {
  for (let i = 0; i < 4; i += 1) {
    if (!(await page.ask(`Boolean(${T}.first('[data-modal-shell="1"] [data-modal-close="1"]'))`))) break;
    await closeWindow(page);
  }
  if (await page.ask(`${UI}.bomOpen === true`)) await press(page, '[data-studio="topbar-bom"]');
  if (await page.ask('Boolean(document.querySelector(\'[data-check-panel]\'))')) await press(page, '[data-check-panel] button[title="Close"]');
  if (await page.ask('Boolean(document.querySelector(\'[aria-label="Close the library"]\'))')) await press(page, '[aria-label="Close the library"]');
  if (await page.ask(`Boolean(${T}.topMenu())`)) await key(page, 'Escape');
  if (await page.ask('Boolean(document.querySelector(\'[data-studio="popup"]\'))')) await key(page, 'Escape');
}
const widthOf = (page, id) => page.ask(`(${S}.units.find((u) => u.id === ${j(id)}) || { params: {} }).params.width ?? null`);
const histDepth = (page) => page.ask(`${HIST}.past.length`);
const uiNow = (page) => page.ask(`(() => { const u = ${UI}; return { sel: u.selectedUnitId, sels: u.selectedUnitIds, el: u.selectedElement ? [u.selectedElement.unitId, u.selectedElement.elementRef] : null,
  inspector: u.inspector, pinned: u.inspectorPinned, modal: u.modal || null, args: u.modalArgs ? { panelId: u.modalArgs.panelId || null, unitId: u.modalArgs.unitId || null, kind: u.modalArgs.kind || null, unitIds: u.modalArgs.unitIds || null } : null,
  check: u.checkOpen, filter: u.checkFilter, bom: u.bomOpen, library: u.libraryCategory || null, panelOpen: u.panelOpen, viewMode: u.viewMode }; })()`);

// === THE MENUS, COUNTED (as scripts/t84-census.mjs counts them, by real clicks and hovers) ===
const NAV = 'nav[aria-label="Main menu"] > div > button';
async function countMenus(page, only = null) {
  const tops = await page.ask(`${T}.all(${j(NAV)}).map((b) => ${T}.text(b))`);
  const menus = [];
  for (const top of tops) {
    if (only && !only.includes(top)) continue;
    const topSel = `${NAV}`;
    const at = await page.ask(`${T}.centre(${T}.all(${j(topSel)}).find((b) => ${T}.text(b) === ${j(top)}))`);
    if (!at) { menus.push({ label: top, error: 'not on the screen', leaves: [] }); continue; }
    const modalBefore = await page.ask(`${UI}.modal || null`);
    await clickWith(page, at.x, at.y);
    await page.sleep(200);
    const dropped = await page.ask(`Boolean(${T}.topMenu())`);
    if (!dropped) {
      const opened = await page.ask(`${UI}.modal || null`);
      menus.push({
        label: top, kind: 'button', opens: opened, leaves: [{ path: top, label: top, opens: opened }],
      });
      if (opened && opened !== modalBefore) {
        if (!(await closeWindow(page, opened))) await key(page, 'Escape');
      }
      await page.sleep(300);
      continue;
    }
    const leaves = [];
    const first = await page.ask(`${T}.menuItems(${T}.topMenu())`);
    for (let k = 0; k < first.length; k += 1) {
      const it = first[k];
      if (!it.sub) {
        leaves.push({
          path: `${top} > ${it.label}`, label: it.label, slider: Boolean(it.slider), disabled: it.disabled, soon: Boolean(it.soon),
        });
        continue;
      }
      await moveTo(page, it.x, it.y, 350);
      const nested = await page.ask(`${T}.menuItems(${T}.subMenu(${k}))`);
      if (!nested.length) leaves.push({ path: `${top} > ${it.label}`, label: it.label, error: 'submenu did not open on hover' });
      for (const n of nested) {
        leaves.push({
          path: `${top} > ${it.label} > ${n.label}`, label: n.label, slider: Boolean(n.slider), disabled: n.disabled, soon: Boolean(n.soon), parent: it.label,
        });
      }
    }
    menus.push({ label: top, kind: 'dropdown', leaves });
    const again = await page.ask(`${T}.centre(${T}.all(${j(topSel)}).find((b) => ${T}.text(b) === ${j(top)}))`);
    if (again) await clickWith(page, again.x, again.y);
    if (await page.ask(`Boolean(${T}.topMenu())`)) await key(page, 'Escape');
  }
  return menus;
}

// === THE DESIGNER'S STAGE-1, AT THE SAME SIZE (a second browser) ===========
const ASTRA_FILE = `${REPO}verify/t84/astra/Cabinet-Core-PRO-Studio-Stage-1.html`;
let painter = null;
const astraCache = new Map();
async function astra(query) {
  const k = `${SIZE.w}x${SIZE.h}${query}`;
  if (astraCache.has(k)) return astraCache.get(k);
  if (!painter) painter = await launch({ width: SIZE.w, height: SIZE.h, port: 10100 + (process.pid % 300) });
  await painter.send('Emulation.setDeviceMetricsOverride', {
    width: SIZE.w, height: SIZE.h, deviceScaleFactor: 1, mobile: false,
  });
  await painter.goto(`file://${ASTRA_FILE}${query}`);
  await painter.sleep(500);
  const m = await painter.evaluate(`return (${astraLib.toString()})();`);
  astraCache.set(k, m);
  return m;
}
/** Which of her fixtures stands for the app's state now. */
function fixtureFor(app) {
  const kind = app.cardKind || (app.unitType ? cardKindOf(app.unitType) : 'base');
  const type = ['base', 'wall', 'wardrobe', 'vanity', 'mirror', 'hawa', 'panel'].includes(kind) ? kind : 'base';
  const parts = [`type=${type}`];
  if (app.mode === 'full') parts.push('inspector=full');
  if (app.pinned) parts.push('pin=1');
  if (!app.unitType) parts.push('fixture=none');
  else if (app.several) parts.push('fixture=multi');
  return { query: `?${parts.join('&')}`, kind, type };
}
const boxText = (b) => (b ? `${b.x},${b.y} ${b.w}x${b.h}` : 'none');
const sameBox = (a, b) => Boolean(a && b) && ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) <= 1);
const delta = (a, b) => (a && b ? ['x', 'y', 'w', 'h'].filter((k) => Math.abs(a[k] - b[k]) > 1).map((k) => `${k} ${a[k] - b[k] > 0 ? '+' : ''}${a[k] - b[k]}`).join(', ') : (a ? 'hers absent' : 'the app\'s absent'));

/**
 * Why a box differs from hers, by what is known: the profile's numbers
 * (CLAUDE.md THE NUMBERS, profile.ui.studio), her own media queries (her
 * file's <style>: 1500 and 1150 px), CLAUDE.md F3's card rows over her sample
 * fixtures, and the app's own surfaces that her prototype stands in for.
 */
function reasonFor(keyName, a, b, ctx) {
  const st = ctx.studio;
  const w = SIZE.w;
  const railWhy = w < st.rail.labelsFromPx
    ? `the rail is ${st.rail.narrowPx} px icons-only below ${st.rail.labelsFromPx} px (profile.ui.studio.rail, CLAUDE.md THE NUMBERS "112 with labels at 1440 and up, 56 icons below", PROPOSED); Stage-1 keeps 112 down to its 1150 px query`
    : null;
  const quickWhy = w < st.inspector.quickNarrowBelowPx
    ? `the quick card is ${st.inspector.quickNarrowPx} px below ${st.inspector.quickNarrowBelowPx} px (profile.ui.studio.inspector, CLAUDE.md F4 "344 px, 316 below 1440", PROPOSED); Stage-1 keeps 344 down to its 1150 px query`
    : null;
  switch (keyName) {
    case 'rail':
      if (a && b && a.w !== b.w && railWhy) return railWhy;
      break;
    case 'inspector':
      if (!a && b) return `the inspector is hidden ('${ctx.app.mode}': no column, CLAUDE.md F4 "none (hidden, the breadcrumb's button brings it back)"); her fixture always draws one`;
      if (a && b && ctx.app.mode === 'quick' && a.w !== b.w && quickWhy) return quickWhy;
      if (a && b && a.x !== b.x && Math.abs(a.w - b.w) <= 1) return 'the column ends at the screen\'s edge on both: the x follows the width difference above';
      break;
    case 'scene': {
      const bits = [];
      const ar = ctx.app.boxes.rail; const br = ctx.hers.rail;
      const ai = ctx.app.boxes.inspector; const bi = ctx.hers.inspector;
      if (ar && br && ar.w !== br.w) bits.push(`the rail's ${ar.w - br.w > 0 ? '+' : ''}${ar.w - br.w}`);
      if ((ai ? ai.w : 0) !== (bi ? bi.w : 0)) bits.push(`the inspector's ${(ai ? ai.w : 0) - (bi ? bi.w : 0) > 0 ? '+' : ''}${(ai ? ai.w : 0) - (bi ? bi.w : 0)}`);
      if (bits.length) return `the scene slot takes what the columns leave: ${bits.join(' and ')} px`;
      break;
    }
    case 'view': {
      const sa = ctx.app.viewStyle; const sb = ctx.hers.viewStyle;
      const styles = sa && sb ? ` (font ${sa.font} vs ${sb.font}, side padding ${sa.pad} vs ${sb.pad}, gap ${sa.gap} vs ${sb.gap})` : '';
      const sa2 = ctx.app.boxes.scene; const sb2 = ctx.hers.scene;
      const edge = sa2 && sb2 ? (sa2.x + sa2.w) - (sb2.x + sb2.w) : 0;
      if (a && b && Math.abs(a.w - b.w) > 1) return `the View button${styles}: the house cc-btn keeps its own side padding against her 10 px (D1's DECISIONS 1, verify/t84/agents/D1.md); its right edge stands on the scene slot's as hers (the slot's right edge ${edge > 0 ? '+' : ''}${edge} px)`;
      return 'the View button follows the scene slot\'s right edge (above)';
    }
    case 'links':
      return 'the camera bar: Stage-1 holds 3D and Drawings only (CLAUDE.md F6 adds Plan, Iso, A, B, C, D, Frame selection between them, PROPOSED)';
    case 'head':
      return 'the card head: the title is the Library\'s row and the unit number (S2: "Base units . Standard"); hers is a sample name';
    case 'actions':
      return 'the actions follow the rows above them (the row count and heights)';
    case 'fullHead':
      return 'one panel, one header (CLAUDE.md LAWS 2): the app\'s full head is RightPanel\'s own header with Pin and Quick in it; hers is a separate "Full settings" bar over a technical slot';
    default:
      break;
  }
  return 'not one of the profile\'s numbers nor a CLAUDE.md row: a deviation of the skin for D1 to read';
}

/** A frame of the whole page, then her same boxes and what differs. */
async function shot(page, nn, what, F = 'F8') {
  const name = `f08-${SIZE.w}-${String(nn).padStart(2, '0')}-${what}.png`;
  // The pointer parked on the status bar's empty middle, so no control is drawn in its hover state.
  await moveTo(page, Math.round(SIZE.w / 2), SIZE.h - 6, 200);
  await page.sleep(400);
  await page.screenshot(`${OUT}${name}`);
  frames.push(name);
  push('FRAME', F, name);
  await compareFrame(page, name).catch((e) => note('F8', `${name}: the designer's comparison`, `could not be made: ${e.message}`));
  return name;
}
async function compareFrame(page, name) {
  const app = await page.ask(`${T}.appBoxes()`);
  const fx = fixtureFor(app);
  const hers = await astra(fx.query);
  const studio = await page.ask(`${PROFILE}.ui.studio`);
  const ctx = {
    studio, app: { ...app, boxes: app }, hers,
  };
  const keys = ['topbar', 'context', 'rail', 'scene', 'inspector', 'status', 'view', 'links'];
  const same = [];
  const differ = [];
  for (const k of keys) {
    const a = app[k]; const b = hers[k];
    if (!a && !b) continue;
    if (sameBox(a, b)) { same.push(`${k} ${boxText(a)}`); continue; }
    differ.push(`${k}: app ${boxText(a)} vs hers ${boxText(b)} (${delta(a, b)}): ${reasonFor(k, a, b, ctx)}`);
  }
  const where = `${name} vs Stage-1 ${SIZE.w}x${SIZE.h} ${fx.query} (the app: inspector ${app.mode}${app.cardKind ? `, card ${app.cardKind}` : ''}${app.pinned ? ', pinned' : ''})`;
  note('F8', `${where}: equal within 1 px`, same.length ? same.join('; ') : 'nothing');
  for (const d of differ) note('F8', `${where}: differs`, d);
  // The card, row against row, where both draw one.
  if (app.mode === 'quick' && app.cardKind && hers.rows.length) {
    const al = app.rows.map((r) => r.label); const bl = hers.rows.map((r) => r.label);
    const rowWhy = `CLAUDE.md F3's ${app.cardKind} card${app.cardKind === 'generic' ? ' (her base fixture stands for it)' : ''} over her fixture's sample rows (the card never lies: a row the type does not have is absent)`;
    if (j(al) !== j(bl)) note('F8', `${where}: card rows differ`, `app ${al.length} [${al.join(', ')}] vs hers ${bl.length} [${bl.join(', ')}]: ${rowWhy}`);
    else note('F8', `${where}: card rows equal`, `[${al.join(', ')}]`);
    const ah = app.rows.map((r) => `${r.h}${r.refused ? ' (the refusal\'s sentence under it)' : ''}${r.kind === 'chips' || r.kind === 'covers' ? ` (${r.kind})` : ''}`); const bh = hers.rows.map((r) => r.h);
    const firstA = app.rows[0]; const firstB = hers.rows[0];
    const plain = app.rows.filter((r) => !r.refused && r.kind !== 'covers').map((r) => r.h);
    const oddRows = plain.filter((h) => !bh.includes(h));
    note('F8', `${where}: card row heights`, `app [${ah.join(', ')}] vs hers [${bh.join(', ')}]${oddRows.length ? ` (a row of the app's not of her heights: ${oddRows.join(', ')} px, the row's own control, chips or a select, taller than her read-only sample)` : ''}; the first row's top app ${firstA ? firstA.y : '-'} vs hers ${firstB ? firstB.y : '-'} (${firstA && firstB ? firstA.y - firstB.y : '-'} px: ${firstA && firstB && Math.abs(firstA.y - firstB.y) > 1 ? reasonFor('head', null, null, ctx) : 'level'})`);
    const insDw = (app.inspector ? app.inspector.w : 0) - (hers.inspector ? hers.inspector.w : 0);
    const listOf = (l) => (l.length ? l.map(([n, h]) => `${n} ${h}`).join(', ') : 'nothing');
    for (const k of ['head', 'actions']) {
      const a = app[k]; const b = hers[k];
      if (sameBox(a, b)) { note('F8', `${where}: ${k} equal within 1 px`, boxText(a)); continue; }
      const why = [];
      if (a && b && insDw && Math.abs((a.w - b.w) - insDw) <= 1) why.push(`its x and width follow the inspector column's ${insDw > 0 ? '+' : ''}${insDw} px (above)`);
      if (a && b && Math.abs(a.y - b.y) > 1 && k === 'actions') {
        why.push(`its top ${a.y - b.y > 0 ? '+' : ''}${a.y - b.y} px: the rows end app ${app.rowsBottom} vs hers ${hers.rowsBottom} (${app.rows.length} rows vs ${hers.rows.length}), then between the rows and the actions app [${listOf(app.between)}] vs hers [${listOf(hers.between)}] (the app's strip is F5's, the warning CLAUDE.md F3's, the inheritance line the card's own)`);
      }
      if (a && b && Math.abs(a.h - b.h) > 1) why.push(`its height ${a.h - b.h > 0 ? '+' : ''}${a.h - b.h} px: ${reasonFor(k, a, b, ctx)}`);
      note('F8', `${where}: ${k} differs`, `app ${boxText(a)} vs hers ${boxText(b)} (${delta(a, b)}): ${why.length ? why.join('; ') : reasonFor(k, a, b, ctx)}`);
    }
  }
  if (app.mode === 'full' && (app.fullHead || hers.fullHead)) {
    const a = app.fullHead; const b = hers.fullHead;
    if (sameBox(a, b)) note('F8', `${where}: full head equal within 1 px`, boxText(a));
    else note('F8', `${where}: full head differs`, `app ${boxText(a)} vs hers ${boxText(b)} (${delta(a, b)}): ${reasonFor('fullHead', a, b, ctx)}`);
  }
}

/** Several views of the scene slot on one sheet (the walk's own page, in the second browser). */
async function contactSheet(page, nn, what, shots) {
  const name = `f08-${SIZE.w}-${String(nn).padStart(2, '0')}-${what}.png`;
  const cols = 3;
  const cellW = Math.round(shots[0].w * shots[0].scale);
  const cellH = Math.round(shots[0].h * shots[0].scale) + 22;
  const W = cols * cellW + (cols + 1) * 8;
  const H = Math.ceil(shots.length / cols) * cellH + (Math.ceil(shots.length / cols) + 1) * 8;
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#1a1a1a;font:13px sans-serif;color:#f2f2f0">
    <div style="display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:8px;padding:8px">${shots.map((s) => `<figure style="margin:0"><img style="display:block;width:${cellW}px" src="data:image/png;base64,${s.data}"><figcaption style="height:22px;line-height:22px">${s.label}</figcaption></figure>`).join('')}</div></body></html>`;
  const file = join(SCRATCH, 'sheet.html');
  writeFileSync(file, html);
  if (!painter) painter = await launch({ width: W, height: H, port: 10100 + (process.pid % 300) });
  await painter.send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 1, mobile: false,
  });
  await painter.goto(`file://${file}`);
  await painter.sleep(600);
  await painter.screenshot(`${OUT}${name}`, {
    x: 0, y: 0, width: W, height: H, scale: 1,
  });
  frames.push(name);
  push('FRAME', 'F8', `${name} (${shots.map((s) => s.label).join(', ')}: each the scene slot after its press, at half size)`);
  // The shell stood as it stands now for every view on the sheet.
  await compareFrame(page, name).catch((e) => note('F8', `${name}: the designer's comparison`, `could not be made: ${e.message}`));
  return name;
}
/** The scene slot, captured now at a scale, for a contact sheet. */
async function sceneCapture(page, label, scale = 0.5) {
  const r = await page.ask(`${T}.rect(${T}.first('[data-studio="scene"]'))`);
  const { data } = await page.send('Page.captureScreenshot', {
    format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale },
  });
  return {
    label, data, w: r.w, h: r.h, scale,
  };
}

// === THE STAGES (the store's own actions: not what a step is about) ========
async function openStudio() {
  const page = await open({ width: SIZE.w, height: SIZE.h });
  await page.showroom(`${BASE}index.html`);
  await page.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
  await page.sleep(1500);
  if (!(await page.ask('Boolean(window.__cc.views && window.__cc.views.room)'))) {
    await page.ask(`(() => { ${S}.newProject('T84 walk'); const ui = ${UI}; ui.openEditor(); ui.closeModal(); ui.closeLibrary && ui.closeLibrary(); return true; })()`);
    await page.waitFor('window.__cc.views && window.__cc.views.room', { timeout: 45000 });
  }
  await page.sleep(2600);
  await inject(page);
  return page;
}
/** The T81 kitchen (scripts/t81-kitchen.mjs, through the page's store, as scripts/t83-walk.mjs stages it). */
async function stageKitchen(page) {
  const add = async (type, x) => page.ask(`(() => { const r = ${S}.addUnit(${j(type)}, { wall: 0, x: ${x} }); return r && r.id; })()`);
  await page.ask(`(() => { ${S}.setRoom({ corners: [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 3000 }, { x: 0, y: 3000 }], height: 2500 }); return true; })()`);
  const ids = {
    a: await add('BUD', 1000), b: await add('BUD', 1600), c: await add('BUDR2', 2400), w: await add('WUD', 1000),
  };
  await page.sleep(800);
  for (const [id, width] of [[ids.a, 600], [ids.b, 800], [ids.c, 500], [ids.w, 600]]) await page.ask(`(${S}.updateUnitParams(${j(id)}, { width: ${width} }), true)`);
  await page.ask(`(${S}.setDoors(${j(ids.a)}, { count: 1, hinge: 'L' }), true)`);
  await page.ask(`(${S}.setDoors(${j(ids.b)}, { count: 2, hinge: 'L' }), true)`);
  await page.ask(`(${S}.setDoors(${j(ids.w)}, { count: 1, hinge: 'L' }), true)`);
  await page.ask(`(${S}.addEndPanel(${j(ids.a)}, { side: 'L', thickness: 18 }), true)`);
  await page.ask(`(${S}.addPlinth(${j(ids.a)}), true)`);
  await page.ask(`(${S}.addWorktop(${j([ids.a, ids.b, ids.c])}), true)`);
  await page.ask(`(${S}.setFrontType('f1', { source: 'spray', material_id: 'generic-22' }), true)`);
  await page.ask(`(${S}.setFrontColour({ hex: '#7b8f7a', name: 'F&B Card Room Green', system: 'F&B' }, 'f1'), true)`);
  await page.ask(`(${S}.setDesign({ sheen: 30 }), true)`);
  await page.ask(`(${S}.setProjectHandle({ type: 'knob' }), true)`);
  await page.ask(`(${S}.setDesign({ inframe: true }), true)`);
  await page.ask(`(${UI}.clearSelection(), true)`);
  await page.sleep(1500);
  return ids;
}
async function ensureKitchen(page, ctx) {
  if (ctx.ids && await page.ask(`${S}.units.some((u) => u.id === ${j(ctx.ids.b)})`)) return ctx.ids;
  ctx.ids = await stageKitchen(page);
  return ctx.ids;
}
/**
 * The refusal's stage. engine/roomFit.js refuses a typed width only when it is
 * longer than the WALL (`wanted > wall width`); a neighbour CLAMPS the width
 * (projectStore updateUnitParams, its notice), it never refuses. So the room's
 * far corner is bitten 900 x 900 (engine/room.js lCorners): wall C (index 2) is
 * 900 mm, and a BUD stands on it at the first x the store accepts.
 */
async function ensureNib(page, ctx) {
  await ensureKitchen(page, ctx);
  if (ctx.nib && await page.ask(`${S}.units.some((u) => u.id === ${j(ctx.nib.id)})`)) return ctx.nib;
  const corners = lCorners(6000, 3000, 900, 900);
  await page.ask(`(() => { ${S}.setRoom({ corners: ${j(corners)}, height: 2500 }); return true; })()`);
  const walls = realWalls({ corners, height: 2500 });
  let placed = null;
  for (let x = 0; x <= 140 && !placed; x += 10) {
    const r = await page.ask(`(() => { const r = ${S}.addUnit('BUD', { wall: 2, x: ${x} }); return r && r.id ? r.id : null; })()`);
    if (r) placed = { id: r, x };
  }
  await page.ask(`(${UI}.clearSelection(), true)`);
  await page.sleep(1200);
  if (!placed) return null;
  const said = await page.ask(`(() => { const u = ${S}.units.find((q) => q.id === ${j(placed.id)}); const f920 = ${S}.roomFitRefusalFor(${j(placed.id)}, { width: 920 }); const f760 = ${S}.roomFitRefusalFor(${j(placed.id)}, { width: 760 });
    return { num: u.params.unit_num, width: u.params.width, x: u.position.x_mm, wall: u.position.wall, f920: f920 ? f920.message : null, f760: f760 ? f760.message : null }; })()`);
  ctx.nib = {
    ...placed, ...said, wallLen: Math.round(walls[2].width), corners,
  };
  return ctx.nib;
}
/** A vanity on wall A beside the kitchen (the store): the basin that enters a board (T83's Check #48). */
async function ensureVanity(page, ctx) {
  await ensureKitchen(page, ctx);
  if (ctx.vanity && await page.ask(`${S}.units.some((u) => u.id === ${j(ctx.vanity)})`)) return ctx.vanity;
  ctx.vanity = await page.ask(`(() => { const r = ${S}.addUnit('VANITY3', { wall: 0, x: 3600 }); return r && r.id ? r.id : (r && r.error) || null; })()`);
  await page.ask(`(${UI}.clearSelection(), true)`);
  await page.sleep(1500);
  return ctx.vanity;
}
/** The findings to act on, as the engine says them (engine/checks.js findingsToAct: every one but a note). */
const findingsNow = (page) => page.ask(`${S}.runChecks().filter((f) => f && f.level !== 'note').map((f) => ({ check: f.check, level: f.level, unitId: f.unitId || null, message: f.message || '', subject: f.subject ? { unitId: f.subject.unitId || null, panelId: f.subject.panelId || null } : null }))`);

// === LEG 1 . THE KITCHEN, THE SHELL, THE LEGACY MENUS COUNTED ===============
async function leg1(page, ctx) {
  const ids = await ensureKitchen(page, ctx);
  const units = await page.ask(`${S}.units.map((u) => [u.type, u.params.unit_num, 'wall ' + u.position.wall, 'x ' + u.position.x_mm, 'w ' + u.params.width])`);
  note('F2', 'THE STAGE: the T81 kitchen (scripts/t81-kitchen.mjs, through the page\'s store, as scripts/t83-walk.mjs stages it): a 6000 x 3000 room 2500 high, BUD 600 one door with END-L and plinth, BUD 800 a pair, BUDR2 500, WUD 600 over, the worktop, front f1 sprayed, the knob, in-frame', j(units));
  const studio = await page.ask(`${PROFILE}.ui.studio`);
  ctx.studio = studio;
  note('F2', 'the face: the factory entry and profile.ui.studio.enabled (the default; no switch in the UI, the owner\'s "nie, juz jest przy wyborze")', j({ entry: await page.ask('document.documentElement.getAttribute("data-app-entry")'), enabled: studio.enabled, doorWindow: studio.doorWindow }));
  const shell = await page.ask(`(() => { const R = (s) => ${T}.rect(${T}.first(s)); return { shell: R('[data-studio="shell"]'), topbar: R('[data-studio="topbar"]'), context: R('[data-studio="breadcrumb"]'), rail: R('[data-studio="rail"]'), scene: R('[data-studio="scene"]'),
    inspector: R('[data-studio="inspector"]'), status: R('[data-studio="statusbar"]'), mode: (document.querySelector('[data-studio="shell"]') || { getAttribute: () => null }).getAttribute('data-inspector'),
    railLabels: ${T}.all('[data-studio="rail"] .studio-rail-text').length, legacyToolbar: Boolean(document.querySelector('[data-open-all-doors="1"]')) || Boolean(document.querySelector('button[title="Bill of materials"]')),
    controls: ['topbar-undo', 'topbar-redo', 'topbar-save', 'topbar-brightness', 'topbar-account', 'topbar-bom', 'rail-select', 'rail-add', 'rail-room', 'rail-materials', 'rail-check', 'rail-design', 'rail-cnc', 'toggle-xray', 'toggle-hide-fronts', 'toggle-outlines', 'toggle-open-all', 'view-menu', 'camera-bar', 'statusbar'].filter((k) => !${T}.first('[data-studio="' + k + '"]')) }; })()`);
  const bars = studio.bars;
  const wantRail = SIZE.w >= studio.rail.labelsFromPx ? studio.rail.widePx : studio.rail.narrowPx;
  check('F2', 'the shell up ([data-studio="shell"]): the top bar, the context strip, the rail, the scene, the inspector, the status bar, in Stage-1\'s grid; the bars at the profile\'s heights (profile.ui.studio.bars)',
    shell.shell && shell.topbar && shell.context && shell.rail && shell.scene && shell.status && shell.topbar.h === bars.topPx && shell.context.h === bars.contextPx && shell.status.h === bars.statusPx
      && shell.shell.w === SIZE.w && shell.shell.h === SIZE.h && shell.status.y + shell.status.h === SIZE.h,
    `shell ${SIZE.w} x ${SIZE.h}; top ${bars.topPx}, context ${bars.contextPx}, status ${bars.statusPx}`, j(shell));
  check('F2', `the rail ${wantRail} px at ${SIZE.w} (profile.ui.studio.rail: ${studio.rail.widePx} with labels at ${studio.rail.labelsFromPx} and up, ${studio.rail.narrowPx} icons below)`,
    shell.rail && shell.rail.w === wantRail && (SIZE.w >= studio.rail.labelsFromPx ? shell.railLabels >= 6 : shell.railLabels === 0),
    `${wantRail} px, labels ${SIZE.w >= studio.rail.labelsFromPx ? 'shown' : 'none'}`, j({ rail: shell.rail, labels: shell.railLabels }));
  check('F2', 'every Studio home of the toolbar and the header on the page (CONTRACT 6 hooks), and the legacy canvas toolbar NOT drawn under Studio (F6: CanvasToolbar not rendered)',
    shell.controls.length === 0 && !shell.legacyToolbar, 'no hook missing; no [data-open-all-doors] / Bill of materials button', j({ missing: shell.controls, legacyToolbar: shell.legacyToolbar }));

  // EVERY LEGACY MENU, opened by a real click, its submenus by a real hover.
  await page.ask(`(${UI}.clearSelection(), true)`);
  const menus = await countMenus(page);
  const per = Object.fromEntries(menus.map((m) => [m.label, m.leaves.length]));
  const order = menus.map((m) => m.label);
  check('F7', 'the top bar\'s legacy MenuBar, WHOLE: the eight menus in the census\'s order (File, View, Library, Settings, Database, Spraying, Lighting, Output)', j(order) === j(CENSUS_MENUS.order), j(CENSUS_MENUS.order), j(order));
  for (const m of CENSUS_MENUS.menus) {
    const mine = menus.find((x) => x.label === m.label);
    const want = m.leaves.map((l) => l.path);
    const got = mine ? mine.leaves.map((l) => l.path) : [];
    const missing = want.filter((p) => !got.includes(p));
    const extra = got.filter((p) => !want.includes(p));
    check('F7', `${m.label}: opened by a real click${m.kind === 'dropdown' && m.leaves.some((l) => l.parent) ? ' (its submenus by a real hover)' : ''}, ${want.length} leaves path for path as census-main.json (main 9f5020f)`,
      mine && got.length === want.length && !missing.length,
      `${want.length}: ${want.join(' | ')}`, j({ count: got.length, missing, extra, opens: mine && mine.opens, disabled: mine ? mine.leaves.filter((l) => l.disabled).map((l) => l.label) : [] }));
  }
  const total = menus.reduce((s, m) => s + m.leaves.length, 0);
  check('F7', `the leaves in all: ${CENSUS_MENUS.total} (CLAUDE.md THE CENSUS: File 5, View 13, Library 4, Settings 5, Database 5, Spraying 1, Lighting 1, Output 14)`, total === CENSUS_MENUS.total && j(per) === j(CENSUS_MENUS.perMenu), `${CENSUS_MENUS.total} ${j(CENSUS_MENUS.perMenu)}`, `${total} ${j(per)}`);
  ctx.menus = menus;
  await frameUnits(page, [ids.a, ids.b, ids.c, ids.w], { side: 0.2, up: 0.25, pad: 1.25 });
  await shot(page, 1, 'kitchen-shell', 'F2');
}

// === LEG 2 . THE BUD'S CARD, THE REFUSAL, THE PANEL, PIN, THE WINDOWS =======
async function leg2(page, ctx) {
  const ids = await ensureKitchen(page, ctx);
  const nib = await ensureNib(page, ctx);
  if (!nib || !nib.f920 || nib.f760 || nib.x + 760 > nib.wallLen) {
    push('FAIL', 'F3', 'THE STAGE for the refusal: a BUD on a 900 mm wall where 920 is refused and 760 fits', 'f920 a sentence, f760 null, x + 760 <= 900', j(nib));
    return;
  }
  note('F3', `THE STAGE: the room refuses a typed width only when it is longer than the wall (engine/roomFit.js roomFitRefusal: wanted > wall width; a neighbour clamps, it never refuses, projectStore updateUnitParams), so no BUD of the kitchen can refuse 920 between its neighbours; the room's far corner is bitten 900 x 900 (engine/room.js lCorners) and a BUD placed on wall C (${nib.wallLen} mm) at x ${nib.x}, the first x the store accepts`,
    j({ unit: nib.num, id: nib.id, x: nib.x, width: nib.width, roomSays920: nib.f920, roomSays760: nib.f760 }));
  await frameUnits(page, [nib.id], { side: 0.3, up: 0.35, pad: 1.7 });
  const hit = await clickUnit(page, nib.id);
  await page.sleep(500);
  if (!(await need(page, 'F3', 'S2', 'the quick card', '[data-studio="card"]'))) return;
  const card = await page.ask(`(() => { const c = ${T}.first('[data-studio="card"]'); return c ? { type: c.getAttribute('data-card-type'), unit: c.getAttribute('data-unit'), num: ${T}.text(c.querySelector('[data-card-unit-num]')), title: ${T}.text(c.querySelector('h1')),
    rows: [...c.querySelectorAll('[data-studio="card-row"]')].map((r) => [r.getAttribute('data-row'), ${T}.text(r.querySelector('.cc-label'))]) } : null; })()`);
  const u0 = await uiNow(page);
  check('F3', `a BUD clicked (a real click on its ${hit ? hit.pid : '?'} pixel): it is selected and the inspector shows its quick card ([data-studio="card"][data-card-type="base"])`,
    hit && u0.sel === nib.id && u0.inspector === 'quick' && card && card.type === 'base' && card.unit === nib.id, `selected ${nib.num}, card base`, j({ hit, sel: u0.sel, inspector: u0.inspector, card: card && { type: card.type, unit: card.unit, num: card.num, title: card.title } }));
  const wantRows = [['width', 'Width'], ['height', 'Height'], ['depth', 'Depth'], ['doors', 'Doors'], ['plinth', 'Plinth']];
  check('F3', 'the BUD card, row for row: Width, Height, Depth, Doors, Plinth (CLAUDE.md F3 "Base: Width . Height . Depth . Doors . Drawers . Plinth ... BUD hides Drawers")',
    card && j(card.rows.map((r) => [r[0], (r[1] || '').replace(/custom$/, '').trim()])) === j(wantRows), j(wantRows.map((r) => r[1])), j(card && card.rows));

  // 920: REFUSED, IN RED, THE ENGINE'S OWN SENTENCE.
  const h0 = await histDepth(page);
  const t1 = await typeInto(page, '[data-studio="card"] input[data-card-field="width"]', 920);
  await page.sleep(300);
  const ref = await page.ask(`${T}.refused('width')`);
  const said = await page.ask(`(${S}.roomFitRefusalFor(${j(nib.id)}, { width: 920 }) || {}).message || null`);
  const w1 = await widthOf(page, nib.id);
  const h1 = await histDepth(page);
  check('F5', 'Width typed 920 (a real click on the field, Ctrl+A, the digits, Enter): REFUSED, the engine\'s own sentence at the field ([data-studio="refused"][data-refused="1"], data-refusal = roomFitRefusalFor\'s message), the typed 920 left on show, unapplied, nothing in the history',
    t1.ok && ref && ref.refused === '1' && said && ref.refusal === said && ref.reason === said && ref.value === '920' && w1 === 600 && h1 === h0,
    `"${said}"; width 600; history ${h0}`, j({ typed: t1, refused: ref && ref.refused, refusal: ref && ref.refusal, reason: ref && ref.reason, value: ref && ref.value, width: w1, history: h1 }));
  const danger = rgbOf(ctx.studio && ctx.studio.issues && ctx.studio.issues.danger);
  check('F5', `the refusal SEEN: the field's border and the sentence's ground the danger red (profile.ui.studio.issues.danger ${ctx.studio && ctx.studio.issues.danger}), the sentence ${ctx.studio && ctx.studio.issues.textPx} px, dark on it, aria-invalid`,
    ref && ref.fieldBorder === danger && ref.reasonBg === danger && ref.reasonFont === `${ctx.studio.issues.textPx}px` && ref.ariaInvalid === 'true',
    `${danger}, ${ctx.studio && ctx.studio.issues.textPx}px`, j(ref && { border: ref.fieldBorder, ground: ref.reasonBg, font: ref.reasonFont, ink: ref.reasonColour, ariaInvalid: ref.ariaInvalid }));
  await shot(page, 2, 'card-refused', 'F5');

  // 760: APPLIED (the caret is still in the field: Ctrl+A, the digits, Enter).
  const t2 = await typeInto(page, '[data-studio="card"] input[data-card-field="width"]', 760, { click: false });
  await page.sleep(300);
  const ref2 = await page.ask(`${T}.refused('width')`);
  const w2 = await widthOf(page, nib.id);
  const h2 = await histDepth(page);
  check('F5', 'then 760 typed in the same field (Ctrl+A, the digits, Enter): APPLIED, params.width 760, the red and the sentence gone, one step in the history',
    w2 === 760 && ref2 && !ref2.refused && !ref2.reason && h2 === h0 + 1, 'width 760, no refusal, history +1', j({ typed: t2.shown, width: w2, refused: ref2 && ref2.refused, reason: ref2 && ref2.reason, history: h2 }));
  // UNDO AND REDO, THE TOP BAR'S.
  if (await need(page, 'F2', 'S1', 'the top bar\'s Undo', '[data-studio="topbar-undo"]')) {
    await press(page, '[data-studio="topbar-undo"]');
    const wu = await widthOf(page, nib.id);
    check('F2', 'Undo on the top bar ([data-studio="topbar-undo"], a real click): the width back to 600', wu === 600, '600', String(wu));
    await press(page, '[data-studio="topbar-redo"]');
    const wr = await widthOf(page, nib.id);
    check('F2', 'Redo on the top bar ([data-studio="topbar-redo"], a real click): the width 760 again', wr === 760, '760', String(wr));
  }
  // DOORS > TO THE PANEL'S DOORS SECTION.
  if (await need(page, 'F3', 'S2', 'the Doors summary row', '[data-studio="card"] [data-row="doors"] button')) {
    const summary = await page.ask(`${T}.text(${T}.first('[data-studio="card"] [data-row="doors"] button'))`);
    await press(page, '[data-studio="card"] [data-row="doors"] button', { wait: 500 });
    const u3 = await uiNow(page);
    const doorsOpen = await page.ask('Boolean(document.querySelector(\'aside[data-panel-layout="embedded"] [data-section="Doors"][data-open="1"]\'))');
    check('F3', `the Doors summary row ("${summary}", a real click): the full panel at its doors section (inspector 'full', panelOpen.doors true, the embedded panel's Doors section open)`,
      u3.inspector === 'full' && u3.panelOpen && u3.panelOpen.doors === true && doorsOpen, 'full, doors open', j({ inspector: u3.inspector, doors: u3.panelOpen && u3.panelOpen.doors, section: doorsOpen }));
  }
  // BACK TO QUICK, THEN FULL SETTINGS, THEN PIN.
  if (await need(page, 'F4', 'S3', 'Back to quick settings', '[data-studio="back-to-quick"]')) {
    await press(page, '[data-studio="back-to-quick"]');
    const uq = await uiNow(page);
    check('F4', 'Quick in the panel\'s own header ([data-studio="back-to-quick"], a real click): the quick card again', uq.inspector === 'quick' && await page.ask('Boolean(document.querySelector(\'[data-studio="card"]\'))'), 'quick', uq.inspector);
  }
  if (await need(page, 'F3', 'S2', 'Full settings', '[data-studio="card-full-settings"]')) {
    await press(page, '[data-studio="card-full-settings"]');
    const uf = await uiNow(page);
    const headerCount = await page.ask('document.querySelectorAll(\'[data-studio="inspector"] aside[data-panel-layout="embedded"]\').length');
    check('F4', 'Full settings ([data-studio="card-full-settings"], a real click): RightPanel embedded in the column, ONE panel, its own header with the name field', uf.inspector === 'full' && headerCount === 1 && await page.ask(`Boolean(document.querySelector('[data-studio="inspector"] input[data-unit-name="${nib.id}"]'))`), 'full, one embedded aside', j({ inspector: uf.inspector, asides: headerCount }));
  }
  if (await need(page, 'F4', 'S3', 'Pin', '[data-studio="pin"]')) {
    await press(page, '[data-studio="pin"]');
    const up = await uiNow(page);
    const pressed = await page.ask('(document.querySelector(\'[data-studio="pin"]\') || { getAttribute: () => null }).getAttribute(\'aria-pressed\')');
    check('F4', 'Pin ([data-studio="pin"], a real click): aria-pressed true, inspectorPinned true, the panel full', pressed === 'true' && up.pinned === true && up.inspector === 'full', 'pressed, pinned', j({ pressed, pinned: up.pinned, inspector: up.inspector }));
  }
  // ANOTHER CABINET CLICKED: THE PANEL FOLLOWS.
  await frameUnits(page, [ids.b], { side: 0.25, up: 0.3, pad: 1.6 });
  const hitB = await clickUnit(page, ids.b);
  await page.sleep(500);
  const ub = await uiNow(page);
  const header = await page.ask(`(() => { const i = document.querySelector('[data-studio="inspector"] input[data-unit-name]'); return i ? { unit: i.getAttribute('data-unit-name'), value: i.value } : null; })()`);
  const pinKeys = await page.ask(`(() => { const u = ${UI}; const out = {}; for (const k of Object.keys(u)) { if (/pin|inspector/i.test(k) && typeof u[k] !== 'function') out[k] = u[k]; } return out; })()`);
  const holdsOld = await page.ask(`(() => { const u = ${UI}; return Object.keys(u).filter((k) => typeof u[k] !== 'function' && JSON.stringify(u[k] ?? null).includes(${j(nib.id)})); })()`);
  const bNum = await page.ask(`(${S}.units.find((u) => u.id === ${j(ids.b)}) || { params: {} }).params.unit_num`);
  check('F4', `another cabinet clicked (${bNum}, a real click on its ${hitB ? hitB.pid : '?'} pixel) while pinned: the panel FOLLOWS (selectedUnitId ${bNum}, the header's name field reads ${bNum}), the pin still on, no unit id kept by the pin`,
    hitB && ub.sel === ids.b && ub.inspector === 'full' && ub.pinned === true && header && header.unit === ids.b && header.value === bNum
      && Object.values(pinKeys).every((v) => typeof v === 'boolean' || ['quick', 'full', 'none'].includes(v)),
    `sel ${bNum}, name ${bNum}, pinned, the pin keys a mode and a yes`, j({ sel: ub.sel, inspector: ub.inspector, pinned: ub.pinned, header, pinKeys }));
  note('F4', `the ui store's keys that still hold the first BUD's id (${nib.num}) after the switch (none of them the pin's)`, j(holdsOld));
  await shot(page, 3, 'pinned-follows', 'F4');

  // A PART DOUBLE-CLICKED: ITS OWN WINDOW, BESIDE IT; THE PANEL ON ITS PARENT.
  await frameUnits(page, [ids.a], { side: -0.55, up: 0.25, pad: 1.8 });
  const endAt = await reach(page, ids.a, 'END-L');
  if (endAt) await page.dblclick(endAt.x, endAt.y);
  await until(page, `${UI}.modal === 'element'`, 5000);
  await page.sleep(800);
  await settleCamera(page);
  await page.sleep(600);
  const ue = await uiNow(page);
  const win = (await windowsNow(page)).find((w) => w.name === 'element') || null;
  const partBox = await page.ask(`${T}.unitOnGlass(${j([ids.a])}, 'END-L')`);
  const overlap = win && partBox ? Math.max(0, Math.min(win.rect.x + win.rect.w, partBox.x + partBox.w) - Math.max(win.rect.x, partBox.x)) * Math.max(0, Math.min(win.rect.y + win.rect.h, partBox.y + partBox.h) - Math.max(win.rect.y, partBox.y)) : null;
  const aNum = await page.ask(`(${S}.units.find((u) => u.id === ${j(ids.a)}) || { params: {} }).params.unit_num`);
  const headerA = await page.ask('(document.querySelector(\'[data-studio="inspector"] input[data-unit-name]\') || {}).value || null');
  check('F4', `a part double-clicked (the end panel END-L of ${aNum}, a real double click on its pixel): its own window opens ('element', END-L) and the pinned panel shows the part's parent (${aNum})`,
    Boolean(endAt) && ue.modal === 'element' && ue.args && ue.args.panelId === 'END-L' && ue.sel === ids.a && ue.pinned === true && headerA === aNum,
    `element / END-L; panel on ${aNum}; pinned`, j({ at: endAt, modal: ue.modal, args: ue.args, sel: ue.sel, header: headerA, pinned: ue.pinned }));
  const coverE = await coveredBy(page, ids.a, 'END-L', 'element');
  check('F4', 'the part window BESIDE its part (CLAUDE.md LAWS 4, after the camera\'s flight to the part): its rectangle does not overlap the part\'s own screen box, and none of the part\'s own pixels (the raycaster\'s pixels of END-L, then document.elementFromPoint) is under it',
    win && partBox && overlap === 0 && coverE.pixels > 0 && coverE.covered === 0, 'box overlap 0, 0 of its pixels covered', j({ window: win && win.rect, title: win && win.title, part: partBox, boxOverlapPx2: overlap, pixels: coverE }));
  const ownE = await page.ask(`${T}.overWindow('element')`);
  check('F4', 'the part window keeps its z-order (LAWS 4): nothing of the shell stands over it but the app\'s message layer (lib/modalLayer.js: message z 60 over a window\'s 40, on both faces); 63 points of its rectangle, document.elementFromPoint',
    ownE && ownE.mine + ownE.messageLayer === ownE.points, 'every point the window\'s own (or the message layer\'s)', j(ownE));
  await shot(page, 4, 'part-window', 'F4');
  await closeWindow(page, 'element');

  // THE DOOR WINDOW: T37'S CONDUCT, DOCKED LEFT, STICKY, FOLLOWING THE LEAF, ESCAPE-PROOF.
  note('F4', 'the door window\'s conduct: profile.ui.studio.doorWindow reads \'dock-left\' (T37: docked left, sticky, Escape off, following the clicked leaf); \'beside\' is SKIPPED WHOLE (verify/t84/DECISIONS.md 9: DoorModal.jsx is a retail copy, t78-copy --check would not stay CLEAN)', j({ doorWindow: ctx.studio && ctx.studio.doorWindow }));
  await frameUnits(page, [ids.b], { side: 0.15, up: 0.2, pad: 1.7 });
  const fl = await reach(page, ids.b, `${bNum}-FL`);
  if (fl) await page.dblclick(fl.x, fl.y);
  await until(page, `${UI}.modal === 'element'`, 5000);
  await page.sleep(1500);
  const ud = await uiNow(page);
  const dwin = (await windowsNow(page)).find((w) => w.name === 'element') || null;
  const leafBox = await page.ask(`${T}.unitOnGlass(${j([ids.b])}, ${j(`${bNum}-FL`)})`);
  const dOver = dwin && leafBox ? Math.max(0, Math.min(dwin.rect.x + dwin.rect.w, leafBox.x + leafBox.w) - Math.max(dwin.rect.x, leafBox.x)) * Math.max(0, Math.min(dwin.rect.y + dwin.rect.h, leafBox.y + leafBox.h) - Math.max(dwin.rect.y, leafBox.y)) : null;
  check('F4', `the door window: a real double click on the leaf ${bNum}-FL opens the piece's window docked at the screen's left edge (data-modal-dock="left", x 0), sticky, about that leaf`,
    Boolean(fl) && ud.modal === 'element' && ud.args && ud.args.panelId === `${bNum}-FL` && dwin && dwin.dock === 'left' && dwin.rect.x === 0 && dwin.sticky === '1',
    'docked left at x 0, sticky, the leaf its subject', j({ at: fl, args: ud.args, window: dwin }));
  const coverD = await coveredBy(page, ids.b, `${bNum}-FL`, 'element');
  check('F4', `the door window never stands over the door it is about (CLAUDE.md LAWS 4: "in BOTH it is sticky, follows the clicked leaf, and never stands over the door it is about"): none of ${bNum}-FL's own pixels (swung open, the cabinet framed in the middle of the scene) under the docked window`,
    dwin && leafBox && dOver === 0 && coverD.pixels > 0 && coverD.covered === 0, 'box overlap 0, 0 of its pixels covered',
    j({
      window: dwin && dwin.rect, leaf: leafBox, boxOverlapPx2: dOver, pixels: coverD, scene: await page.ask(`${T}.rect(${T}.first('[data-studio="scene"]'))`),
    }));
  const ownD = await page.ask(`${T}.overWindow('element')`);
  check('F4', 'the door window keeps its z-order (LAWS 4): nothing of the shell stands over it but the app\'s message layer (lib/modalLayer.js: message z 60 over a window\'s 40, on both faces); 63 points of its rectangle, document.elementFromPoint',
    ownD && ownD.mine + ownD.messageLayer === ownD.points, 'every point the window\'s own (or the message layer\'s)', j(ownD));
  note('F4', 'the shell\'s controls the docked door window meets (DECISIONS 9 names the rail; T37\'s window is the screen\'s full height), each under it or over it', j(await page.ask(`${T}.shellUnder('element')`)));
  const empty = await page.ask(`${T}.empty()`);
  if (empty) await clickWith(page, empty.x, empty.y);
  await page.sleep(500);
  const us = await uiNow(page);
  check('F4', 'a scene click (a real click on the empty floor) leaves the door window standing (sticky)', Boolean(empty) && us.modal === 'element' && us.args && us.args.panelId === `${bNum}-FL`, 'element still open', j({ at: empty, modal: us.modal, args: us.args, sel: us.sel }));
  const fr = await reach(page, ids.b, `${bNum}-FR`);
  if (fr) await page.dblclick(fr.x, fr.y);
  await until(page, `${UI}.modalArgs && ${UI}.modalArgs.panelId === ${j(`${bNum}-FR`)}`, 5000);
  await page.sleep(1200);
  const uf2 = await uiNow(page);
  const dwin2 = (await windowsNow(page)).find((w) => w.name === 'element') || null;
  check('F4', `the window FOLLOWS the leaf: a real double click on ${bNum}-FR, the same window, its subject the other leaf, still docked left`,
    Boolean(fr) && uf2.modal === 'element' && uf2.args && uf2.args.panelId === `${bNum}-FR` && dwin2 && dwin2.dock === 'left' && dwin2.rect.x === 0,
    `element / ${bNum}-FR, docked`, j({ at: fr, args: uf2.args, title: dwin2 && dwin2.title, rect: dwin2 && dwin2.rect }));
  await key(page, 'Escape');
  await page.sleep(400);
  const ux = await uiNow(page);
  check('F4', 'Escape (a real key) does not close the door window (its key is off, the Studio\'s Escape owner skips it: verify/t84/p1-escape.md E level 3)', ux.modal === 'element', 'element still open', j({ modal: ux.modal, el: ux.el, sel: ux.sel, pinned: ux.pinned }));
  note('F4', 'what that Escape did instead (one key event, one action)', j({ selectedElement: ux.el, selectedUnit: ux.sel }));
  await shot(page, 5, 'door-window', 'F4');
  await closeWindow(page, 'element');
  const uc = await uiNow(page);
  check('F4', 'the door window shut by its own x (a real click: the only way out of it, T37)', uc.modal === null, 'no window', String(uc.modal));
}

// === LEG 3 . A FINDING: THE MARKER, THE STRIP, SHOW, THE COUNTER ============
async function leg3(page, ctx) {
  const ids = await ensureKitchen(page, ctx);
  // Unpinned, so a cabinet's click brings its CARD (where the strip stands).
  if (await page.ask(`${UI}.inspectorPinned === true`)) {
    if (!(await page.ask('Boolean(document.querySelector(\'[data-studio="back-to-quick"]\'))'))) await press(page, '[data-studio="card-full-settings"]');
    await press(page, '[data-studio="back-to-quick"]');
    check('F4', 'Quick (a real click): the pin let go by its own road (showQuickSettings), the quick card back', await page.ask(`${UI}.inspectorPinned === false && ${UI}.inspector === 'quick'`), 'unpinned, quick', j(await uiNow(page)));
  }
  const vanity = await ensureVanity(page, ctx);
  let all = await findingsNow(page);
  let subject = all.filter((f) => f.unitId === vanity);
  const vNum = await page.ask(`(${S}.units.find((u) => u.id === ${j(vanity)}) || { params: {} }).params.unit_num`);
  note('F5', `THE STAGE: a VANITY3 on wall A at x 3600 (the store), as T83's walk made its Check #48; its findings to act on, the engine's (runChecks, findingsToAct)`, j(subject.map((f) => `#${f.check} ${f.level}: ${f.message}`)));
  let target = vanity; let tNum = vNum;
  if (!subject.length) {
    const other = all.find((f) => f.unitId);
    if (other) {
      target = other.unitId;
      tNum = await page.ask(`(${S}.units.find((u) => u.id === ${j(target)}) || { params: {} }).params.unit_num`);
      subject = all.filter((f) => f.unitId === target);
      note('F5', `no finding on the vanity: the walk takes ${tNum}'s instead (any red or yellow finding on one unit, the task's leave)`, j(subject.map((f) => `#${f.check} ${f.level}: ${f.message}`)));
    }
  }
  if (!subject.length) { push('FAIL', 'F5', 'a finding on one unit', 'one red or yellow finding', j(all)); return; }
  const level = subject.some((f) => f.level === 'red') ? 'red' : 'yellow';
  const ordered = [...subject.filter((f) => f.level === 'red'), ...subject.filter((f) => f.level === 'yellow')];
  // THE MARKER, beside the unit number in the scene.
  await frameUnits(page, [target], { side: 0.25, up: 0.45, pad: 2.2 });
  await page.sleep(800);
  if (!(await need(page, 'F5', 'S4', `the marker on ${tNum}`, `[data-studio="marker"][data-unit="${target}"]`))) return;
  const marker = await page.ask(`(() => { const m = ${T}.first('[data-studio="marker"][data-unit="${target}"]'); const cs = getComputedStyle(m); const icon = m.querySelector('.studio-icon'); const v = ${T}.view(); const TH = v.three; const u = ${S}.units.find((q) => q.id === ${j(target)});
    const g = ${T}.group(${j(target)}); let anchor = null; if (g && u) { const p = new TH.Vector3(u.params.width / 2000, u.params.height / 1000 + 0.1, u.params.depth / 2000).applyMatrix4(g.matrixWorld).project(v.camera); const r = v.gl.domElement.getBoundingClientRect(); anchor = { x: Math.round(r.left + (p.x * 0.5 + 0.5) * r.width), y: Math.round(r.top + (-p.y * 0.5 + 0.5) * r.height) }; }
    return { level: m.getAttribute('data-level'), count: Number(m.getAttribute('data-count')), cls: m.className, ground: cs.backgroundColor, font: cs.fontSize, icon: icon ? Math.round(icon.getBoundingClientRect().width) : null, rect: ${T}.rect(m), anchor, scene: ${T}.rect(${T}.first('[data-studio="scene"]')) }; })()`);
  const ground = rgbOf(level === 'red' ? ctx.studio.issues.danger : ctx.studio.issues.warn);
  check('F5', `the marker on ${tNum} ([data-studio="marker"]): a ${level} triangle (red when a red finding is in it, yellow for yellow only) with the count ${subject.length}, 13 px dark on the level's ground, the triangle ${ctx.studio.marker.sizePx} px`,
    marker.level === level && marker.count === subject.length && /is-(red|yellow)/.test(marker.cls) && marker.cls.includes(`is-${level}`) && marker.ground === ground && marker.font === `${ctx.studio.issues.textPx}px` && marker.icon === ctx.studio.marker.sizePx,
    `${level}, ${subject.length}, ${ground}, 13px, ${ctx.studio.marker.sizePx} px`, j(marker));
  const mx = marker.rect ? marker.rect.x + marker.rect.w / 2 : null;
  const my = marker.rect ? marker.rect.y + marker.rect.h : null;
  check('F5', 'the marker BESIDE the unit number: at the name chip\'s own anchor (the unit\'s top centre, 100 mm over it), lifted clear of the chip, inside the scene', marker.anchor && Math.abs(mx - marker.anchor.x) <= 3 && my <= marker.anchor.y && marker.anchor.y - my <= 40 && marker.rect.x >= marker.scene.x && marker.rect.x + marker.rect.w <= marker.scene.x + marker.scene.w,
    'centred on the anchor, its foot 0 to 40 px over it', j({ marker: marker.rect, anchor: marker.anchor, footOver: marker.anchor ? marker.anchor.y - my : null }));
  // Click = select the unit and show its card with the strip.
  await page.ask(`(${UI}.clearSelection(), true)`);
  await page.sleep(300);
  await press(page, `[data-studio="marker"][data-unit="${target}"]`, { wait: 500 });
  const um = await uiNow(page);
  const strips = await page.ask(`${T}.all('[data-studio="card"] [data-studio="issue-strip"]').map((s) => ({ level: s.getAttribute('data-level'), check: Number(s.getAttribute('data-check')), text: ${T}.text(s.querySelector('span')), ground: getComputedStyle(s).backgroundColor, font: getComputedStyle(s).fontSize }))`);
  const want = ordered.map((f) => ({ level: f.level, text: `#${f.check} ${String.fromCharCode(0xb7)} ${f.message}` }));
  check('F5', `a real click on the marker: ${tNum} selected and its card shows the strip ([data-studio="issue-strip"]) in the finding's own words, "#<check> . <message>", the red first`,
    um.sel === target && um.inspector === 'quick' && strips.length === want.length && strips.every((s, i) => s.level === want[i].level && s.text === want[i].text),
    j(want.map((w) => `${w.level}: ${w.text}`)), j({ sel: um.sel, inspector: um.inspector, strips: strips.map((s) => `${s.level}: ${s.text}`) }));
  check('F5', 'the strip SEEN: 13 px, dark on its level\'s ground (profile.ui.studio.issues)', strips.length && strips.every((s) => s.font === `${ctx.studio.issues.textPx}px` && s.ground === rgbOf(s.level === 'red' ? ctx.studio.issues.danger : ctx.studio.issues.warn)),
    '13px on warn / danger', j(strips.map((s) => [s.level, s.font, s.ground])));
  // SHOW: the camera frames the unit (moved away first: the stage camera on the kitchen).
  await frameUnits(page, [ids.a, ids.b], { side: -0.4, up: 0.3, pad: 1.4 });
  const before = await page.ask(`${T}.pose()`);
  const subjectPanel = ordered[0].subject && ordered[0].subject.panelId && (ordered[0].subject.unitId || target) === target ? ordered[0].subject.panelId : null;
  await press(page, '[data-studio="card"] [data-studio="issue-show"]', { wait: 600 });
  await settleCamera(page);
  const after = await page.ask(`${T}.pose()`);
  const onGlass = await page.ask(`${T}.unitOnGlass(${j([target])})`);
  const sceneR = await page.ask(`${T}.rect(${T}.first('[data-studio="scene"]'))`);
  const us = await uiNow(page);
  const moved = before && after ? Math.hypot(...after.pos.map((v, i) => v - before.pos[i])) : 0;
  const inside = onGlass && onGlass.front && onGlass.x >= sceneR.x - 1 && onGlass.y >= sceneR.y - 1 && onGlass.x + onGlass.w <= sceneR.x + sceneR.w + 1 && onGlass.y + onGlass.h <= sceneR.y + sceneR.h + 1;
  check('F5', `Show ([data-studio="issue-show"], a real click): the camera moves and frames ${tNum} (its screen box inside the scene slot)${subjectPanel ? `, and the finding's part ${subjectPanel} selected` : ''}`,
    moved > 0.05 && inside && us.sel === target && (!subjectPanel || (us.el && us.el[1] === subjectPanel)),
    'moved, the unit inside the scene slot', j({ moved: r3(moved), before, after, unit: onGlass, scene: sceneR, el: us.el }));
  await shot(page, 6, 'finding-strip', 'F5');
  // THE COUNTERS on the status bar, and the filtered Check.
  const levels = { red: all.filter((f) => f.level === 'red').length, yellow: all.filter((f) => f.level === 'yellow').length };
  const counters = await page.ask(`${T}.all('[data-studio="statusbar"] [data-studio^="counter-"]').map((c) => ({ hook: c.getAttribute('data-studio'), count: Number(c.getAttribute('data-count')), text: ${T}.text(c), ground: getComputedStyle(c).backgroundColor, font: getComputedStyle(c).fontSize }))`);
  const wantCounters = ['red', 'yellow'].filter((l) => levels[l]).map((l) => ({ hook: `counter-${l}`, text: `${levels[l]} ${l}` }));
  check('F5', `the counters on the status bar, in their colours: ${wantCounters.map((c) => c.text).join(' . ')} (the engine's findings to act on)`,
    j(counters.map((c) => [c.hook, c.text])) === j(wantCounters.map((c) => [c.hook, c.text])) && counters.every((c) => c.font === `${ctx.studio.issues.textPx}px` && c.ground === rgbOf(c.hook === 'counter-red' ? ctx.studio.issues.danger : ctx.studio.issues.warn)),
    j(wantCounters.map((c) => c.text)), j(counters));
  const lvl = level;
  if (await need(page, 'F5', 'S4', `the ${lvl} counter`, `[data-studio="counter-${lvl}"]`)) {
    await press(page, `[data-studio="counter-${lvl}"]`, { wait: 600 });
    const uc = await uiNow(page);
    const panel = await page.ask(`(() => { const p = document.querySelector('[data-check-panel]'); if (!p) return null; const f = p.querySelector('[data-check-filter]');
      return { filter: f ? f.getAttribute('data-check-filter') : null, levels: [...p.querySelectorAll('[data-check-finding]')].map((li) => li.getAttribute('data-check-level')), showAll: Boolean(p.querySelector('[data-check-show-all="1"]')) }; })()`);
    check('F5', `the ${lvl} counter (a real click): the Check opens filtered to ${lvl} (checkFilter, data-check-filter="${lvl}"), every row ${lvl}, "Show all" offered`,
      uc.check === true && uc.filter === lvl && panel && panel.filter === lvl && panel.levels.length === levels[lvl] && panel.levels.every((l) => l === lvl) && panel.showAll,
      `${levels[lvl]} rows, all ${lvl}, Show all`, j({ check: uc.check, filter: uc.filter, panel }));
    await shot(page, 7, 'check-filtered', 'F5');
    await press(page, '[data-check-show-all="1"]', { wait: 400 });
    const panelAll = await page.ask('[...document.querySelectorAll(\'[data-check-panel] [data-check-finding]\')].map((li) => li.getAttribute(\'data-check-level\'))');
    check('F5', 'Show all (a real click): every finding again, the filter back to all', await page.ask(`${UI}.checkFilter === 'all'`) && panelAll.length >= levels.red + levels.yellow, `${levels.red + levels.yellow} or more rows`, j({ filter: await page.ask(`${UI}.checkFilter`), rows: panelAll.length }));
    await press(page, '[data-check-panel] button[title="Close"]', { wait: 300 });
  }
  ctx.finding = { target, tNum, level };
}

// === LEG 4 . THE SCENE'S EDGE: THE TOGGLES, VIEW, THE CAMERA BAR ============
const WALL_LETTERS = ['a', 'b', 'c', 'd'];
async function leg4(page, ctx) {
  const ids = await ensureKitchen(page, ctx);
  await tidy(page);
  const flags = {
    'toggle-xray': `${UI}.xray`,
    'toggle-hide-fronts': `${UI}.hideFronts`,
    'toggle-outlines': `${UI}.showOutlines`,
    'toggle-open-all': `(document.querySelector('[data-studio="toggle-open-all"]') || { getAttribute: () => null }).getAttribute('aria-pressed') === 'true'`,
  };
  const openCount = `Object.values(${UI}.openFronts || {}).reduce((n, m) => n + Object.values(m || {}).filter((v) => Number(v) >= 0.99).length, 0)`;
  for (const [hook, flagExpr] of Object.entries(flags)) {
    if (!(await need(page, 'F6', 'S5', hook, `[data-studio="${hook}"]`))) continue;
    const before = await page.ask(`Boolean(${flagExpr})`);
    const open0 = await page.ask(openCount);
    await press(page, `[data-studio="${hook}"]`, { wait: 500 });
    const mid = await page.ask(`Boolean(${flagExpr})`);
    const midPressed = await page.ask(`(document.querySelector('[data-studio="${hook}"]') || { getAttribute: () => null }).getAttribute('aria-pressed')`);
    const label = await page.ask(`${T}.text(document.querySelector('[data-studio="${hook}"]'))`);
    const open1 = await page.ask(openCount);
    await press(page, `[data-studio="${hook}"]`, { wait: 500 });
    const after = await page.ask(`Boolean(${flagExpr})`);
    const open2 = await page.ask(openCount);
    const extra = hook === 'toggle-open-all' ? ` (fronts open ${open0} -> ${open1} -> ${open2})` : '';
    check('F6', `${hook} (a real click, then another): its store flag and aria-pressed turn ${before ? 'off' : 'on'} and back${extra}`,
      mid === !before && midPressed === String(!before) && after === before && (hook !== 'toggle-open-all' || (open1 > open0 && open2 < open1)),
      `${!before} then ${before}`, j({ before, mid, pressed: midPressed, label, after, open: [open0, open1, open2] }));
  }
  // VIEW: the nine.
  if (await need(page, 'F6', 'S5', 'View', '[data-studio="view-menu"]')) {
    await press(page, '[data-studio="view-menu"]', { wait: 300 });
    const rows = await page.ask(`${T}.all('[data-studio="popup"][data-kind="view"] [data-studio="popup-item"]').map((r) => [r.getAttribute('data-item'), ${T}.text(r).slice(0, 40)])`);
    const want = ['dimensions', 'frontDimensions', 'dimensionColour', 'props', 'measure', 'contourView', 'brightness', 'realisticLighting', 'light'];
    check('F6', 'View ([data-studio="view-menu"], a real click): its popup lists the nine, in CLAUDE.md F6\'s order (Dimensions, Front dimensions, Dimension colour, Props, Measure, Contour view, Brightness, Realistic lighting, Turn on the light)',
      j(rows.map((r) => r[0])) === j(want), want.join(', '), j(rows));
    await shot(page, 8, 'view-menu', 'F6');
    await press(page, '[data-studio="view-menu"]', { wait: 300 });
    check('F6', 'View pressed again (a real click): the popup shut', !(await page.ask('Boolean(document.querySelector(\'[data-studio="popup"][data-kind="view"]\'))')), 'shut', 'ok');
  }
  // THE CAMERA BAR: A to D, Plan, Iso, Frame selection.
  const room = await page.ask(`${S}.project.room`);
  const walls = realWalls(room);
  const sheet = [];
  const allFrames = SIZE.w === CAMERA_ALL_AT;
  let nn = 9;
  const go = async (hook, label, expectFn, frameIt) => {
    if (!(await need(page, 'F6', 'S5', label, `[data-studio="${hook}"]`))) return;
    const before = await page.ask(`${T}.pose()`);
    await press(page, `[data-studio="${hook}"]`, { wait: 400 });
    await settleCamera(page);
    const pose = await page.ask(`${T}.pose()`);
    const moved = before && pose ? Math.hypot(...pose.pos.map((v, i) => v - before.pos[i])) : 0;
    const res = expectFn(pose);
    check('F6', `${label} ([data-studio="${hook}"], a real click): the room's camera (window.__cc.views.room) moves to ${res.want}`, res.ok && (moved > 0.01 || res.already), res.want, j({ moved: r3(moved), pose, ...res.got }));
    if (frameIt === 'file') { await shot(page, nn, `camera-${hook.replace('camera-', '')}`, 'F6'); nn += 1; } else if (frameIt === 'sheet') sheet.push(await sceneCapture(page, label));
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  for (let i = 0; i < 4; i += 1) {
    const w = walls[i];
    if (!w) continue;
    const inward = [w.inward.x, 0, w.inward.y];
    await go(`camera-${WALL_LETTERS[i]}`, `Wall ${WALL_LETTERS[i].toUpperCase()}`, (p) => ({
      ok: p && dot(p.dir, inward) > 0.999,
      want: `square on to wall ${WALL_LETTERS[i].toUpperCase()} (${Math.round(w.width)} mm) from inside the room: the eye on its inward normal (${inward.join(', ')})`,
      got: { dot: p ? r3(dot(p.dir, inward)) : null },
    }), i === 0 ? 'file' : (allFrames ? 'sheet' : null));
  }
  await go('camera-plan', 'Plan', (p) => ({ ok: p && p.dir[1] > 0.999, want: 'straight down on the room (the eye over the target, dir y 1)', got: { dirY: p && p.dir[1] } }), 'file');
  const elev = Math.SQRT1_2 / Math.sqrt(1 + 0.5);
  await go('camera-iso', 'Iso', (p) => ({ ok: p && Math.abs(p.dir[1] - elev) < 0.01, want: `into the first run's corner along the cube's diagonal (dir y ${r3(elev)}, atan(1 / sqrt 2) up)`, got: { dirY: p && p.dir[1] } }), allFrames ? 'sheet' : null);
  // Frame selection: the selected cabinet fitted with the profile's margin.
  await clickUnit(page, ids.b);
  const margin = Number(ctx.studio.frameMargin) || 0;
  const wantNdc = 1 / (1 + margin);
  await go('camera-frame', 'Frame selection', (p) => ({ ok: true, want: `the selection fitted, ${Math.round(margin * 100)} % margin (the box's corners reach 1 / ${1 + margin} of the frame)`, got: {} }), null);
  const fit = await page.ask(`${T}.fitOnGlass(${j([ids.b])})`);
  const seen = await page.ask(`${T}.unitOnGlass(${j([ids.b])})`);
  // The box the bar fits is one of two: HEAD's (3d/renderCapture.js furnitureBounds: the hardware left out) or,
  // with the walk's patch for INT applied (F1-CameraBar.jsx.diff), the cabinet with its hardware. Either way the
  // box it fits reaches 1 / (1 + margin) of the frame; the NOTE below says what the eye gets.
  const fitted = fit && fit.front && Math.abs(fit.ndc - wantNdc) <= 0.01 ? 'the box without the hardware (furnitureBounds, HEAD)'
    : (seen && seen.front && Math.abs(seen.ndc - wantNdc) <= 0.01 ? 'the cabinet with its hardware' : null);
  check('F6', `Frame selection fits the selected cabinet: the box it frames reaches ${r3(wantNdc)} of the frame at the most (profile.ui.studio.frameMargin ${margin}): the corners of the box without the hardware (3d/renderCapture.js furnitureBounds) or of the cabinet with it`,
    Boolean(fitted), `ndc ${r3(wantNdc)} +/- 0.01 for one of the two`, j({ fitted, withoutHardware: fit, withHardware: seen }));
  const bars = await page.ask(`(() => { const s = ${T}.rect(${T}.first('[data-studio="scene"]')); const c = ${T}.rect(${T}.first('[data-studio="camera-bar"]')); const t = ${T}.rect(${T}.first('[data-studio="scene-toggles"]')); return { scene: s, cameraBar: c, toggles: t, coveredBelow: c ? s.y + s.h - c.y : null, coveredAbove: t ? t.y + t.h - s.y : null }; })()`);
  note('F6', `what the eye gets after Frame selection: the cabinet WITH its hardware (its legs, its knobs: ccNoBounds) reaches ndc ${seen && seen.ndc} (${seen && seen.ndc > 1 ? 'past the frame\'s edge: the feet cut' : 'inside the frame'}); the camera bar stands over the scene's lowest ${bars.coveredBelow} px and the toggles over its top ${bars.coveredAbove} px, while the ${Math.round(margin * 100)} % margin leaves about ${bars.scene ? Math.round((bars.scene.h / 2) * (1 - wantNdc)) : '?'} px at the top and the bottom`, j({ withHardware: seen, bars }));
  if (allFrames) {
    sheet.push(await sceneCapture(page, 'Frame selection'));
    await contactSheet(page, nn, 'camera-b-c-d-iso-frame', sheet);
    nn += 1;
  }
  ctx.nextFrame = nn;
}

// === LEG 5 . ADD BESIDE THE RAIL, A CORNER L, A MIRROR CABINET ==============
async function addFromOpenLibrary(page, group, entry) {
  const before = await page.ask(`${S}.units.map((u) => u.id)`);
  if (!(await page.ask(`Boolean(document.querySelector('[data-library-entry="${entry}"]'))`))) {
    if (await page.ask(`Boolean(document.querySelector('[data-library-group="${group}"]'))`)) await press(page, `[data-library-group="${group}"]`, { wait: 400 });
  }
  if (!(await page.ask(`Boolean(document.querySelector('[data-library-entry="${entry}"]'))`)) && await page.ask('Boolean(document.querySelector(\'[data-library-show-all="1"]\'))')) {
    await press(page, '[data-library-show-all="1"]', { wait: 400 });
    if (await page.ask(`Boolean(document.querySelector('[data-library-group="${group}"]'))`) && !(await page.ask(`Boolean(document.querySelector('[data-library-entry="${entry}"]'))`))) await press(page, `[data-library-group="${group}"]`, { wait: 400 });
  }
  if (!(await press(page, `[data-library-entry="${entry}"]`, { wait: 1200 }))) return { why: `no [data-library-entry="${entry}"] in the Library` };
  const added = await page.ask(`${S}.units.filter((u) => !${j(before)}.includes(u.id)).map((u) => ({ id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall, x: u.position.x_mm, w: u.params.width, h: u.params.height, d: u.params.depth }))`);
  return { unit: added[0] || null, added };
}
async function leg5(page, ctx) {
  await ensureKitchen(page, ctx);
  await tidy(page);
  await unpin(page);
  const vanity = await ensureVanity(page, ctx);
  if (!(await need(page, 'F7', 'S6', 'Add on the rail', '[data-studio="rail-add"]'))) return;
  await press(page, '[data-studio="rail-add"]', { wait: 400 });
  const add = await page.ask(`${T}.rect(${T}.first('[data-studio="rail-add"]'))`);
  const pop = await page.ask(`(() => { const p = ${T}.first('[data-studio="popup"][data-kind="add"]'); return p ? { rect: ${T}.rect(p), items: [...p.querySelectorAll('[data-studio="popup-item"]')].map((i) => [i.getAttribute('data-item'), ${T}.text(i.querySelector('span span') || i), i.disabled]) } : null; })()`);
  const gapPx = Number(ctx.studio.libraryGapPx);
  check('F7', `Add on the rail (a real click): its popup of the Library's categories (UNIT_CATEGORIES: Kitchen, Wardrobes, Saved sets, Sets) beside the button, ${gapPx} px off it (profile.ui.studio.libraryGapPx), level with it`,
    pop && j(pop.items.map((i) => i[0])) === j(['kitchen', 'wardrobe', 'sets', 'media']) && Math.abs(pop.rect.x - (add.x + add.w) - gapPx) <= 1 && Math.abs(pop.rect.y - add.y) <= 1,
    `gap ${gapPx}, top level`, j({ add, popup: pop, gap: pop ? pop.rect.x - (add.x + add.w) : null }));
  await press(page, '[data-studio="popup"][data-kind="add"] [data-studio="popup-item"][data-item="kitchen"]', { wait: 900 });
  const lib = await page.ask(`(() => { const l = document.querySelector('[data-library-list="1"]'); return l ? ${T}.rect(l.parentElement) : null; })()`);
  const scene = await page.ask(`${T}.rect(${T}.first('[data-studio="scene"]'))`);
  const gap = lib ? lib.x - (add.x + add.w) : null;
  const edge = scene ? scene.x - (add.x + add.w) : null;
  check('F7', `a category (Kitchen, a real click): the EXISTING Library opens beside the Add button, ${gapPx} px off it (the designer's 8, profile libraryGapPx) or held at the scene slot's edge it is drawn in (${edge} px off the button), level with it`,
    lib && (gap === gapPx || gap === Math.max(gapPx, edge)) && Math.abs(lib.y - add.y) <= 1 && await page.ask(`${UI}.libraryCategory === 'kitchen'`),
    `gap ${Math.max(gapPx, edge)} px, top ${add.y}`, j({ add, library: lib, gap, sceneEdgeGap: edge, top: lib && lib.y - add.y }));
  note('F7', `the Library's gap measured: ${gap} px from the Add button's right edge (${add.x + add.w}) to the panel's left (${lib && lib.x}); the scene slot starts at ${scene && scene.x}, so the panel cannot stand nearer than ${edge} px (S6 measured 9 at 1440)`, j({ gap, edge }));
  await shot(page, ctx.nextFrame || 11, 'add-library', 'F7');
  // A CORNER L FROM THE LIBRARY: its generic card, Arm A / Height / Arm B.
  await page.ask(`(${UI}.clearSelection(), true)`);
  const L = await addFromOpenLibrary(page, 'base-units', 'corner-l');
  await page.sleep(800);
  if (!L.unit) { push('FAIL', 'F3', 'Library > Base units > Corner L (a real click)', 'a CORNER_L_BASE in the room', L.why || j(L)); } else {
    ctx.corner = L.unit.id;
    const uL = await uiNow(page);
    const cardL = await page.ask(`(() => { const c = ${T}.first('[data-studio="card"]'); return c ? { type: c.getAttribute('data-card-type'), unit: c.getAttribute('data-unit'), rows: [...c.querySelectorAll('[data-studio="card-row"]')].map((r) => [r.getAttribute('data-row'), ${T}.text(r.querySelector('.cc-label'))]) } : null; })()`);
    check('F3', `a corner L from the Library (Base units > Corner L, real clicks): a ${L.unit.type} ${L.unit.num} in the room, selected, its card the GENERIC one`,
      L.unit.type === 'CORNER_L_BASE' && uL.sel === L.unit.id && cardL && cardL.type === 'generic' && cardL.unit === L.unit.id, 'CORNER_L_BASE, generic card', j({ unit: L.unit, sel: uL.sel, card: cardL && { type: cardL.type, unit: cardL.unit } }));
    const first3 = cardL ? cardL.rows.slice(0, 3).map((r) => (r[1] || '').replace(/custom$/, '').trim()) : [];
    check('F3', 'the corner\'s first three rows read Arm A, Height, Arm B (CLAUDE.md F3: "Arm A . Height . Arm B for a corner type"), the rest only what the type supports',
      j(first3) === j(['Arm A', 'Height', 'Arm B']), 'Arm A, Height, Arm B', j(cardL && cardL.rows));
    await frameUnits(page, [L.unit.id], { side: 0.3, up: 0.4, pad: 1.8 });
    await shot(page, (ctx.nextFrame || 11) + 1, 'corner-card', 'F3');
  }
  // A MIRROR CABINET OVER THE VANITY: its card with the bays warning.
  if (vanity && typeof vanity === 'string' && vanity.startsWith('u_')) {
    await frameUnits(page, [vanity], { side: 0.25, up: 0.3, pad: 1.9 });
    await clickUnit(page, vanity, ['BUL', 'BUR', 'TOP']);
  }
  if (!(await page.ask('Boolean(document.querySelector(\'[data-library-list="1"]\'))'))) {
    await press(page, '[data-studio="rail-add"]', { wait: 400 });
    await press(page, '[data-studio="popup"][data-kind="add"] [data-studio="popup-item"][data-item="kitchen"]', { wait: 900 });
  }
  const beside = await page.ask(`(() => { const t = document.querySelector('[data-library-list="1"]'); const p = t ? t.parentElement : null; const row = p ? [...p.querySelectorAll('span')].find((s) => /^Adding /.test((s.textContent || '').trim())) : null; return { selected: ${UI}.selectedUnitId, says: row ? row.textContent.trim() : null }; })()`);
  const M = await addFromOpenLibrary(page, 'bathroom', 'mirror-cabinet');
  await page.sleep(800);
  if (M.unit) {
    const v = vanity && typeof vanity === 'string' ? await page.ask(`(() => { const u = ${S}.units.find((q) => q.id === ${j(vanity)}); return u ? { x: u.position.x_mm, w: u.params.width, wall: u.position.wall } : null; })()`) : null;
    note('F3', 'where the mirror cabinet landed (the Library adds beside the selection, LibraryPanel.jsx; the walk selected the vanity first by a real click)', j({ before: { selected: beside.selected === vanity ? 'the vanity' : beside.selected, library: beside.says }, mirror: { x: M.unit.x, w: M.unit.w, wall: M.unit.wall, mount: M.unit.h }, vanity: v, centredOver: v ? Math.abs((M.unit.x + M.unit.w / 2) - (v.x + v.w / 2)) <= 1 : null }));
  }
  if (!M.unit) { push('FAIL', 'F3', 'Library > Bathroom > Mirror cabinet (a real click)', 'a MIRROR_CABINET in the room', M.why || j(M)); return; }
  ctx.mirror = M.unit.id;
  const uM = await uiNow(page);
  const cardM = await page.ask(`(() => { const c = ${T}.first('[data-studio="card"]'); return c ? { type: c.getAttribute('data-card-type'), unit: c.getAttribute('data-unit'), rows: [...c.querySelectorAll('[data-studio="card-row"]')].map((r) => r.getAttribute('data-row')), warning: ${T}.text(c.querySelector('[data-card-warning="1"]')) } : null; })()`);
  check('F3', `a mirror cabinet from the Library (Bathroom > Mirror cabinet, real clicks): ${M.unit.num} selected, its MIRROR card: Width, Height, Depth, Mount height, Bays, Recess, and the bays warning "Changing bays resets door widths to the kit defaults" (CLAUDE.md F3, kept)`,
    M.unit.type === 'MIRROR_CABINET' && uM.sel === M.unit.id && cardM && cardM.type === 'mirror' && j(cardM.rows) === j(['width', 'height', 'depth', 'mount-height', 'bays', 'recess']) && cardM.warning === 'Changing bays resets door widths to the kit defaults',
    'mirror card, six rows, the warning', j({ unit: M.unit, sel: uM.sel, card: cardM }));
  await frameUnits(page, [M.unit.id], { side: 0.2, up: 0.2, pad: 2.0 });
  await shot(page, (ctx.nextFrame || 11) + 2, 'mirror-card', 'F3');
  if (await page.ask('Boolean(document.querySelector(\'[aria-label="Close the library"]\'))')) await press(page, '[aria-label="Close the library"]');
}

// === LEG 6 . MATERIALS, OUTPUT, DRAWINGS (THE PREVIEW), BOM =================
async function leg6(page, ctx) {
  await ensureKitchen(page, ctx);
  await tidy(page);
  // A selection for Selected finishes (the mirror cabinet, or the kitchen's 02).
  const selId = ctx.mirror || ctx.ids.b;
  if (!(await page.ask(`${UI}.selectedUnitId === ${j(selId)}`))) {
    await frameUnits(page, [selId], { side: 0.2, up: 0.25, pad: 1.8 });
    await clickUnit(page, selId);
  }
  const want = [['selected-finishes', 'unit-finish'], ['project-finishes', 'design'], ['assign-materials', 'assign-materials'], ['stock', 'warehouse']];
  if (await need(page, 'F7', 'S6', 'Materials on the rail', '[data-studio="rail-materials"]')) {
    await press(page, '[data-studio="rail-materials"]', { wait: 400 });
    const items = await page.ask(`${T}.all('[data-studio="popup"][data-kind="materials"] [data-studio="popup-item"]').map((i) => [i.getAttribute('data-item'), ${T}.text(i), i.disabled])`);
    check('F7', 'Materials on the rail (a real click): its popup of the four existing windows (Selected finishes, Project finishes, Assign materials, Stock)', j(items.map((i) => i[0])) === j(want.map((w) => w[0])), want.map((w) => w[0]).join(', '), j(items));
    for (const [item, modal] of want) {
      if (!(await page.ask('Boolean(document.querySelector(\'[data-studio="popup"][data-kind="materials"]\'))'))) await press(page, '[data-studio="rail-materials"]', { wait: 400 });
      const sels = await page.ask(`${UI}.selectedUnitIds`);
      await press(page, `[data-studio="popup"][data-kind="materials"] [data-studio="popup-item"][data-item="${item}"]`, { wait: 800 });
      const u = await uiNow(page);
      check('F7', `Materials > ${item} (a real click): the existing window '${modal}' opens${item === 'selected-finishes' ? ' for the selected cabinets (the right-click Colour\'s own arguments)' : ''}, the popup shut`,
        u.modal === modal && (item !== 'selected-finishes' || j(u.args && u.args.unitIds) === j(sels)) && !(await page.ask('Boolean(document.querySelector(\'[data-studio="popup"][data-kind="materials"]\'))')),
        modal, j({ modal: u.modal, args: u.args, selected: sels }));
      if (!(await closeWindow(page))) await key(page, 'Escape');
      await page.sleep(300);
      if (await page.ask(`${UI}.modal`)) await key(page, 'Escape');
    }
  }
  // OUTPUT: the legacy Output menu, whole (DECISIONS 7).
  const out = await countMenus(page, ['Output']);
  const cen = CENSUS_MENUS.menus.find((m) => m.label === 'Output');
  const got = out[0] ? out[0].leaves.map((l) => l.path) : [];
  check('F7', `Output in the top bar (a real click, Drawings hovered): the legacy menu whole, ${cen.leaves.length} leaves path for path as the census (buildOutputMenu, the existing handlers)`,
    got.length === cen.leaves.length && cen.leaves.every((l) => got.includes(l.path)), `${cen.leaves.length}`, j({ count: got.length, disabled: out[0] ? out[0].leaves.filter((l) => l.disabled).map((l) => l.label) : [] }));
  // DRAWINGS...: THE PREVIEW, NOTHING DOWNLOADED.
  if (await need(page, 'F6', 'S5', 'Drawings... at the scene\'s foot', '[data-studio="drawings"]')) {
    await page.ask(`(() => { if (!window.__t84dl) { window.__t84dl = { blobs: 0, anchors: 0 }; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { window.__t84dl.blobs += 1; return o(b); };
      const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function click() { if (this.hasAttribute('download')) window.__t84dl.anchors += 1; return c.call(this); }; } window.__t84dl.blobs = 0; window.__t84dl.anchors = 0; return true; })()`);
    await press(page, '[data-studio="drawings"]', { wait: 600 });
    await until(page, `${UI}.modal === 'drawing'`, 6000);
    await page.sleep(2500);
    const u = await uiNow(page);
    const dl = await page.ask('window.__t84dl');
    check('F6', 'Drawings... ([data-studio="drawings"], a real click): the drawings PREVIEW opens (modal \'drawing\', kind \'walls\'), nothing exported or downloaded',
      u.modal === 'drawing' && u.args && u.args.kind === 'walls' && dl.anchors === 0, 'drawing / walls, 0 downloads', j({ modal: u.modal, args: u.args, downloads: dl }));
    await shot(page, (ctx.nextFrame || 11) + 3, 'drawings-preview', 'F6');
    if (!(await closeWindow(page, 'drawing'))) await key(page, 'Escape');
    await page.sleep(400);
  }
  // BOM IN THE TOP BAR.
  if (await need(page, 'F2', 'S1', 'BOM in the top bar', '[data-studio="topbar-bom"]')) {
    const label = await page.ask(`${T}.text(${T}.first('[data-studio="topbar-bom"]'))`);
    await press(page, '[data-studio="topbar-bom"]', { wait: 800 });
    const u = await uiNow(page);
    const bom = await page.ask('(() => { const t = document.querySelector(\'[data-bom-order-tab="1"]\'); const a = t ? t.closest(\'aside\') : null; return a ? window.__t84.rect(a) : null; })()');
    const insp = await page.ask(`${T}.rect(${T}.first('[data-studio="inspector"]'))`);
    check('F2', `BOM in the top bar ("${label}", the owner's "tak": Export renamed, the same setBomOpen; a real click): the BOM panel opens and the inspector column stays`,
      label === 'BOM' && u.bom === true && bom && insp && insp.w > 0, 'bomOpen, the BOM panel, the inspector there', j({ label, bomOpen: u.bom, bom, inspector: insp }));
    await shot(page, (ctx.nextFrame || 11) + 4, 'bom', 'F2');
    await press(page, '[data-studio="topbar-bom"]', { wait: 500 });
    check('F2', 'BOM pressed again (a real click): the panel shut', await page.ask(`${UI}.bomOpen === false`), 'bomOpen false', String(await page.ask(`${UI}.bomOpen`)));
  }
}

// === LEG 7 . ESCAPE, ONE LEVEL A PRESS, THE PIN NEVER TOUCHED ===============
/** Unpinned by the panel's own road (Quick: showQuickSettings), the quick card back. */
async function unpin(page) {
  if (!(await page.ask(`${UI}.inspectorPinned === true`))) return;
  if (!(await page.ask('Boolean(document.querySelector(\'[data-studio="back-to-quick"]\'))')) && await page.ask('Boolean(document.querySelector(\'[data-studio="card-full-settings"]\'))')) await press(page, '[data-studio="card-full-settings"]');
  if (await page.ask('Boolean(document.querySelector(\'[data-studio="back-to-quick"]\'))')) await press(page, '[data-studio="back-to-quick"]');
  else if (await page.ask('Boolean(document.querySelector(\'[data-studio="pin"]\'))')) await press(page, '[data-studio="pin"]');
}
async function leg7(page, ctx) {
  const ids = await ensureKitchen(page, ctx);
  await tidy(page);
  await unpin(page);
  // THE STAGE: a shelf in 02 (the store's addShelves) for a part a single click selects.
  const bNum = await page.ask(`(${S}.units.find((u) => u.id === ${j(ids.b)}) || { params: {} }).params.unit_num`);
  const shelfOf = () => page.ask(`((${S}.unitResult(${j(ids.b)}) || { panels: [] }).panels.find((p) => p.part === 'SHELF') || {}).id || null`);
  let shelf = await shelfOf();
  if (!shelf) {
    await page.ask(`(${S}.addShelves(${j(ids.b)}, 1), true)`);
    await page.sleep(1000);
    shelf = await shelfOf();
  }
  note('F7', `THE STAGE: a shelf in ${bNum} (projectStore addShelves), so a single click selects a part (engine/elements.js isMainViewElement); the fronts hidden by the scene's toggle (a real click) to reach it`, j({ shelf }));
  // THE LADDER, built by real gestures: the cabinet, its part, a closable window, a popup, a field edit.
  await frameUnits(page, [ids.b], { side: 0.12, up: 0.15, pad: 1.6 });
  const c1 = await clickUnit(page, ids.b);
  if (!(await page.ask(`${UI}.hideFronts === true`))) await press(page, '[data-studio="toggle-hide-fronts"]', { wait: 600 });
  await settleCamera(page);
  const sAt = shelf ? await reach(page, ids.b, shelf) : null;
  if (sAt) await clickWith(page, sAt.x, sAt.y);
  await page.sleep(500);
  // A closable window a press elsewhere does not shut: Lighting (sticky, Escape-closable), from the top bar;
  // moved by its own header (a real drag) when it stands over the View button.
  await press(page, `${NAV}`, { text: 'Lighting', wait: 900 });
  await until(page, `${UI}.modal === 'lighting'`, 4000);
  const viewFree = () => page.ask(`(() => { const b = ${T}.first('[data-studio="view-menu"]'); if (!b) return false; const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return Boolean(at && b.contains(at)); })()`);
  let moved = null;
  if (!(await viewFree())) {
    moved = await page.ask(`(() => { const w = ${T}.all('[data-modal-shell="1"]').find((e) => e.getAttribute('data-modal-name') === 'lighting'); const h = w && w.querySelector('[data-modal-handle="1"]'); if (!h) return null;
      const r = h.getBoundingClientRect(); const s = ${T}.rect(${T}.first('[data-studio="scene"]')); const wr = w.getBoundingClientRect();
      return { x: Math.round(r.left + 40), y: Math.round(r.top + r.height / 2), toX: Math.round(r.left + 40 + (s.x + 24 - wr.left)), toY: Math.round(r.top + r.height / 2 + (s.y + 60 - wr.top)) }; })()`);
    if (moved) await page.dragFromTo(moved.x, moved.y, moved.toX, moved.toY, { steps: 16 });
  }
  // The View popup (a real click).
  await press(page, '[data-studio="view-menu"]', { wait: 400 });
  // The card's Width field, reached by the keyboard (a press would shut the popup): Tab until it has the caret.
  const field = '[data-studio="card"] input[data-card-field="width"]';
  let tabs = 0;
  for (; tabs < 240; tabs += 1) {
    if (await page.ask(`document.activeElement === ${T}.first(${j(field)})`)) break;
    await tab(page);
  }
  const applied = await widthOf(page, ids.b);
  const focusedNow = await page.ask(`document.activeElement === ${T}.first(${j(field)})`);
  if (focusedNow) {
    await selectAll(page);
    await page.typeText('777');
    await page.sleep(300);
  }
  const pin0 = await page.ask(`${UI}.inspectorPinned`);
  const state = async () => page.ask(`(() => { const u = ${UI}; const f = ${T}.first(${j(field)}); return { field: f ? f.value : null, focused: document.activeElement === f, popup: Boolean(document.querySelector('[data-studio="popup"][data-kind="view"]')), window: u.modal || null,
    part: u.selectedElement ? u.selectedElement.elementRef : null, cabinet: u.selectedUnitId, pinned: u.inspectorPinned, inspector: u.inspector,
    width: (${S}.units.find((q) => q.id === ${j(ids.b)}) || { params: {} }).params.width }; })()`);
  const s0 = await state();
  const built = s0.focused && s0.field === '777' && s0.popup && s0.window === 'lighting' && s0.part === shelf && s0.cabinet === ids.b;
  check('F7', `the ladder built by real gestures: ${bNum} clicked (${c1 ? c1.pid : 'no click'}), its shelf ${shelf} clicked (the part), Lighting from the top bar (a sticky, closable window${moved ? ', moved aside by its header, a real drag, off the View button' : ''}), View (a popup), the card's Width reached by Tab (${tabs} presses) and 777 typed, not entered`,
    built, 'field 777 focused, popup, window lighting, part, cabinet', j({ ...s0, applied }));
  if (built) await shot(page, (ctx.nextFrame || 11) + 5, 'escape-ladder', 'F7');
  const ladder = [
    ['the field restored (777 abandoned, the applied width back, the caret gone); the popup, the window, the part, the cabinet kept', (s) => !s.focused && String(s.field) === String(applied) && s.width === applied && s.popup && s.window === 'lighting' && s.part === shelf && s.cabinet === ids.b],
    ['the popup closed; the window, the part, the cabinet kept', (s) => !s.popup && s.window === 'lighting' && s.part === shelf && s.cabinet === ids.b],
    ['the window closed; the part, the cabinet kept', (s) => !s.popup && s.window === null && s.part === shelf && s.cabinet === ids.b],
    ['the part let go; the cabinet kept', (s) => s.window === null && s.part === null && s.cabinet === ids.b],
    ['the cabinet let go: nothing selected', (s) => s.part === null && s.cabinet === null],
  ];
  if (built) {
    for (let i = 0; i < ladder.length; i += 1) {
      await key(page, 'Escape');
      await page.sleep(500);
      const s = await state();
      check('F7', `Escape ${i + 1} (a real key): ${ladder[i][0]}; the pin untouched (${pin0})`, ladder[i][1](s) && s.pinned === pin0, ladder[i][0], j(s));
    }
  } else if (s0.focused) {
    // Nothing typed may reach the cabinet: the field's own Escape restores it.
    await key(page, 'Escape');
  }
  await tidy(page);
  // THE PIN, NEVER UNPINNED: pinned, a part, then the cabinet, Escape by Escape.
  const c2 = await clickUnit(page, ids.b);
  if (await page.ask('Boolean(document.querySelector(\'[data-studio="card-full-settings"]\'))')) await press(page, '[data-studio="card-full-settings"]');
  if (await page.ask(`${UI}.inspectorPinned !== true`) && await page.ask('Boolean(document.querySelector(\'[data-studio="pin"]\'))')) await press(page, '[data-studio="pin"]');
  const sAt2 = shelf ? await reach(page, ids.b, shelf) : null;
  if (sAt2) await clickWith(page, sAt2.x, sAt2.y);
  await page.sleep(400);
  const p0 = await uiNow(page);
  await key(page, 'Escape');
  await page.sleep(400);
  const p1 = await uiNow(page);
  await key(page, 'Escape');
  await page.sleep(400);
  const p2 = await uiNow(page);
  check('F7', `pinned (${bNum} clicked, Full settings, Pin: real clicks) with the shelf selected (a real click): Escape lets go of the part, the next of the cabinet, and the pin stays on through both (never unpin), the panel still full`,
    c2 && p0.pinned === true && p0.inspector === 'full' && p0.el && p1.el === null && p1.sel === ids.b && p1.pinned === true && p2.sel === null && p2.pinned === true && p2.inspector === 'full',
    'part, then cabinet; pinned throughout', j({ click: c2 && c2.pid, before: [p0.el, p0.sel, p0.pinned, p0.inspector, p0.modal], one: [p1.el, p1.sel, p1.pinned], two: [p2.el, p2.sel, p2.pinned, p2.inspector] }));
  // Leave as found: unpinned, the fronts shown.
  if (await page.ask(`${UI}.inspectorPinned === true`) && await page.ask('Boolean(document.querySelector(\'[data-studio="pin"]\'))')) await press(page, '[data-studio="pin"]');
  if (await page.ask(`${UI}.hideFronts === true`)) await press(page, '[data-studio="toggle-hide-fronts"]', { wait: 400 });
}

// === LEG 8 . THE LAYOUT: NO HORIZONTAL SCROLL, THE EIGHT MENUS AT 1280 =====
async function leg8(page, ctx) {
  const ids = await ensureKitchen(page, ctx);
  await tidy(page);
  const doc = await page.ask('({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth, bodyScroll: document.body.scrollWidth })');
  check('F1', `no horizontal scroll at ${SIZE.w} x ${SIZE.h} (document.documentElement.scrollWidth <= innerWidth)`, doc.scroll <= doc.inner && doc.bodyScroll <= doc.inner, `<= ${SIZE.w}`, j(doc));
  // The embedded panel, every section opened by a real click on its head.
  await frameUnits(page, [ids.b], { side: 0.2, up: 0.25, pad: 1.7 });
  await clickUnit(page, ids.b);
  if (await page.ask('Boolean(document.querySelector(\'[data-studio="card-full-settings"]\'))')) await press(page, '[data-studio="card-full-settings"]');
  for (let pass = 0; pass < 2; pass += 1) {
    const shut = await page.ask('[...document.querySelectorAll(\'aside[data-panel-layout="embedded"] [data-section][data-open="0"]\')].map((s) => s.getAttribute(\'data-section\'))');
    for (const title of shut) {
      await page.ask(`(() => { const b = document.querySelector('aside[data-panel-layout="embedded"] [data-section=${j(title)}] > button'); if (b) b.scrollIntoView({ block: 'nearest' }); return true; })()`);
      await press(page, `aside[data-panel-layout="embedded"] [data-section=${j(title)}] > button`, { wait: 200 });
    }
  }
  const panel = await page.ask(`(() => { const a = document.querySelector('aside[data-panel-layout="embedded"]'); if (!a) return null; const body = a.querySelector(':scope > .overflow-y-auto');
    const over = [...a.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); const ar = a.getBoundingClientRect(); return r.width > 0 && (r.right > ar.right + 1 || r.left < ar.left - 1); }).slice(0, 5).map((e) => e.tagName + '.' + String(e.className).slice(0, 40));
    return { aside: [a.scrollWidth, a.clientWidth], body: body ? [body.scrollWidth, body.clientWidth] : null, width: Math.round(a.getBoundingClientRect().width), open: a.querySelectorAll('[data-section][data-open="1"]').length, shut: a.querySelectorAll('[data-section][data-open="0"]').length, over }; })()`);
  const wantFull = SIZE.w < ctx.studio.inspector.fullNarrowBelowPx ? ctx.studio.inspector.fullNarrowPx : ctx.studio.inspector.fullPx;
  check('F4', `the embedded panel at ${SIZE.w}: ${wantFull} px (profile.ui.studio.inspector), every section open (real clicks on their heads), NO horizontal scroll in it (aside[data-panel-layout="embedded"] scrollWidth <= clientWidth, and its scrolling body)`,
    panel && panel.aside[0] <= panel.aside[1] && (!panel.body || panel.body[0] <= panel.body[1]) && panel.shut === 0 && Math.abs(panel.width - wantFull) <= 1 && !panel.over.length,
    `${wantFull} px, no overflow`, j(panel));
  const doc2 = await page.ask('({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth })');
  check('F1', 'and still no horizontal scroll on the page with the full panel open', doc2.scroll <= doc2.inner, `<= ${SIZE.w}`, j(doc2));
  // The top bar's eight menus, all visible.
  const tops = await page.ask(`(() => { const bar = ${T}.first('[data-studio="topbar"]'); const br = bar.getBoundingClientRect(); const wrap = document.querySelector('.studio-legacy-menu');
    return { wrap: wrap ? [wrap.scrollWidth, wrap.clientWidth] : null, menus: ${T}.all(${j(NAV)}).map((b) => { const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { label: ${T}.text(b), x: Math.round(r.left), w: Math.round(r.width), inside: r.left >= br.left && r.right <= br.right && r.top >= br.top && r.bottom <= br.bottom, hit: at === b || b.contains(at) }; }),
      name: ${T}.rect(document.querySelector('.studio-project-name')), undo: ${T}.rect(${T}.first('[data-studio="topbar-undo"]')) }; })()`);
  const okTops = tops.menus.length === 8 && tops.menus.every((m) => m.inside && m.hit) && (!tops.wrap || tops.wrap[0] <= tops.wrap[1]);
  check('F2', `the top bar's eight legacy menus all visible at ${SIZE.w} (inside the bar, not clipped, each the element under its own centre)`, okTops, '8 visible', j(tops));
  if (await page.ask(`${UI}.inspectorPinned === true`)) await press(page, '[data-studio="pin"]');
}

// === THE WALK ===============================================================
const LEG_TITLES = {
  1: 'THE T81 KITCHEN LOADED, THE SHELL UP, EVERY LEGACY MENU OPENED AND COUNTED AGAINST THE CENSUS',
  2: 'A BUD CLICKED: THE QUICK CARD, 920 REFUSED IN RED, 760 APPLIED, UNDO, REDO; DOORS TO THE PANEL; FULL SETTINGS, PIN, THE PANEL FOLLOWING; THE PART WINDOW BESIDE ITS PART; THE DOOR WINDOW',
  3: 'A FINDING: THE MARKER ON THE UNIT, THE STRIP IN THE CARD, SHOW FRAMING THE UNIT, THE COUNTER OPENING THE FILTERED CHECK',
  4: 'THE SCENE\'S EDGE: THE FOUR TOGGLES, VIEW AND ITS NINE, THE CAMERA BAR A TO D, PLAN, ISO, FRAME SELECTION',
  5: 'ADD BESIDE THE RAIL: THE LIBRARY BESIDE THE BUTTON, A CORNER L AND ITS GENERIC CARD, A MIRROR CABINET AND ITS BAYS WARNING',
  6: 'MATERIALS AND ITS FOUR WINDOWS, OUTPUT WHOLE, DRAWINGS (THE PREVIEW), BOM IN THE TOP BAR',
  7: 'ESCAPE, ONE LEVEL A PRESS, FROM A FIELD EDIT TO THE CABINET; THE PIN NEVER TOUCHED',
  8: 'THE LAYOUT: NO HORIZONTAL SCROLL ON THE PAGE OR IN THE EMBEDDED PANEL, THE EIGHT MENUS VISIBLE',
};
const LEG_RUN = {
  1: leg1, 2: leg2, 3: leg3, 4: leg4, 5: leg5, 6: leg6, 7: leg7, 8: leg8,
};
const perSize = [];
for (const size of SIZES) {
  SIZE = size;
  LEG = 0;
  const t0 = Date.now();
  push('SIZE', 'F8', `SIZE ${size.w} x ${size.h}`);
  let page = null;
  const ctx = {};
  try {
    page = await openStudio();
    ctx.studio = await page.ask(`${PROFILE}.ui.studio`);
    note('F8', 'the build under the mouse', j({
      head, url: BASE, stamp: await page.ask('(document.querySelector("[data-build-stamp]") || { getAttribute: () => null }).getAttribute("data-build-stamp")'), viewport: `${size.w} x ${size.h}`,
    }));
  } catch (e) {
    push('FAIL', 'F8', `the page at ${size.w} x ${size.h}`, 'the PRO editor open', String(e && e.message));
  }
  if (page) {
    for (const n of LEGS) {
      LEG = n;
      push('LEG', 'F8', `LEG ${n} . ${LEG_TITLES[n]}`);
      try {
        await LEG_RUN[n](page, ctx);
      } catch (e) {
        check('F8', `leg ${n} to its end`, false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
        await page.screenshot(`${OUT}f08-${size.w}-leg${n}-failure.png`).then(() => { frames.push(`f08-${size.w}-leg${n}-failure.png`); push('FRAME', 'F8', `f08-${size.w}-leg${n}-failure.png`); }).catch(() => {});
        await tidy(page).catch(() => {});
      }
    }
    const errs = pageErrors(page);
    LEG = 0;
    note('F8', `console errors on the page at ${size.w}`, errs.length ? `${errs.length}: ${errs.slice(0, 4).join(' | ')}` : 'none');
    await page.close();
  }
  const mine = steps.filter((s) => s.size === `${size.w}`);
  perSize.push({
    size: `${size.w} x ${size.h}`, pass: mine.filter((s) => s.kind === 'PASS').length, fail: mine.filter((s) => s.kind === 'FAIL').length, note: mine.filter((s) => s.kind === 'NOTE').length, frames: mine.filter((s) => s.kind === 'FRAME').length, secs: Math.round((Date.now() - t0) / 1000),
  });
}
if (painter) await painter.close();
await showroomDown();
stopPreview();

const count = (k) => steps.filter((s) => s.kind === k).length;
const [pass, fail] = [count('PASS'), count('FAIL')];
const total = Math.round((Date.now() - T0) / 1000);
const summary = `SUMMARY: ${pass + fail} checks, ${pass} PASS, ${fail} FAIL, ${count('NOTE')} NOTE, ${frames.length} frames; ${total} s`;
writeFileSync(`${OUT}walk.txt`, ascii([
  'T84 WALK: STUDIO PRO, STAGE 1, THE SHELL, THE QUICK CARDS, THE PINNED PANEL, THE ERRORS YOU CAN SEE (scripts/t84-walk.mjs)',
  `walked ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, HEAD ${head}, ${BASE}, sizes ${SIZES.map((s) => `${s.w}x${s.h}`).join(', ')}, legs ${LEGS.join(',')}`,
  'Every line: PASS or FAIL (the F, the gesture, what CLAUDE.md expects, what the page showed), NOTE (a reading), FRAME (the file beside this one).',
  'The gestures are real clicks, double clicks, hovers and keys (CDP); the stages are the store\'s; every frame is followed by the designer\'s Stage-1 measured at the same size, the same boxes, and what differs.',
  'A FAIL is written down, never patched. The engine\'s own sentences are quoted as they are, their dash written as "-" (this ledger is plain ASCII).',
  '',
  ...steps.map((s) => {
    const tag = `[${s.size} ${s.leg}]`;
    if (s.kind === 'SIZE') return `\n=== ${s.gesture} ===`;
    if (s.kind === 'LEG') return `\n${s.gesture}`;
    if (s.kind === 'FRAME') return `FRAME  ${tag} ${s.gesture}`;
    if (s.kind === 'NOTE') return `NOTE   ${tag} ${s.F} ${s.gesture} | ${s.got}`;
    return `${s.kind.padEnd(6)} ${tag} ${s.F} ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
  }),
  '',
  'PER SIZE:',
  ...perSize.map((p) => `  ${p.size}: ${p.pass} PASS, ${p.fail} FAIL, ${p.note} NOTE, ${p.frames} frames, ${p.secs} s`),
  `FRAMES (${frames.length}): ${frames.join(', ')}`,
  summary,
  '',
].join('\n')));
process.stdout.write(`\n${perSize.map((p) => `${p.size}: ${p.pass} PASS ${p.fail} FAIL ${p.note} NOTE ${p.frames} frames ${p.secs} s`).join('\n')}\n${summary}; ledger ${OUT}walk.txt\n`);
process.exit(fail ? 1 : 0);
