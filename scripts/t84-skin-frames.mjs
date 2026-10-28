/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F1, THE SKIN'S PROOF: THE STUDIO FRAMED BESIDE THE DESIGNER'S STAGE-1 (CLAUDE.md T84 PART A, F1)
//
// CLAUDE.md T84 F1: "Proof: `verify/t84/f01-skin-1440.png`, `-1920.png`,
// `-1280.png` beside the designer's HTML at the same sizes
// (`verify/t84/astra/stage1-*.png` are the chat's own frames of her file); the
// report names every deviation in px." And THE NUMBERS: "all in
// `profile.ui.studio`; none typed in the UI without the owner".
//
// WHAT IT DOES, at 1280 x 800, 1440 x 900 and 1920 x 1080:
//   (1) OURS. The BUILT app's PRO editor (scripts/t74-harness.mjs `open`, `pro`)
//       on the Studio face as the profile ships it (`ui.studio.enabled` true; the
//       owner, 16:27: no switch). The stage is the T81 kitchen: the calls
//       scripts/t81-kitchen.mjs `t81Kitchen()` makes, recorded in node against
//       a recorder standing in for the store and replayed through the page's
//       own store, so the stage is that file's and nobody else's. The BUD 800
//       (unit 02) is selected by a REAL click on one of its pieces
//       (scripts/t75-harness.mjs `reachFree`: a pixel the canvas owns, where
//       the scene's raycaster meets that piece first), so the quick card
//       shows: `verify/t84/f01-skin-<w>.png`. Then Full settings, Pin and the
//       embedded panel's Carcass head, each a real click at its centre:
//       `verify/t84/f01-skin-<w>-full.png`.
//   (2) HERS. `verify/t84/astra/Cabinet-Core-PRO-Studio-Stage-1.html` (file://)
//       in the same Chromium at the same viewport, `?type=base` and
//       `?type=base&inspector=full&pin=1` (her own Prototype fixtures):
//       `verify/t84/f01-astra-<w>.png` and `f01-astra-<w>-full.png`.
//   (3) THE SAME BOXES on both pages, getBoundingClientRect and the computed
//       style: the top bar, the context strip, the rail and its buttons, the
//       scene slot, the inspector column, the card's head and rows (field
//       heights, row pitch, button heights), the status bar, the type sizes,
//       the radii; and the checks that the skin holds THE NUMBERS.
//   (4) A PIXEL RULER over every frame (where a box's shell-600 hairline is
//       drawn), and the chat's four frames of her file held against her file
//       rendered here at their own viewport (read off their pixels).
//   (5) THE LEDGER `verify/t84/f01-skin.md`: one table per size, ours against
//       hers in px, every difference given its reason (DEVIATIONS below);
//       where Stage-1 differs from THE NUMBERS, THE NUMBERS win and it says so.
//
// Nothing is patched: a difference is written down with its px and its reason,
// and a difference with no reason is printed UNEXPLAINED. The gestures are the
// browser's own input pipe (CDP Input.dispatchMouseEvent); the store only sets
// the stage. Everything this file writes is plain ASCII (no em or en dash).
//
//   E2E_URL=http://127.0.0.1:4191/ node scripts/t84-skin-frames.mjs
//   node scripts/t84-skin-frames.mjs --sizes 1440x900          one size (also T84_SIZES)
//   node scripts/t84-skin-frames.mjs --build --serve           build to --dist (dist), serve on E2E_PORT (4173)
//   node scripts/t84-skin-frames.mjs --out /tmp/x/              frames and ledger elsewhere (a patched build's proof)
//
// Chromium: /opt/pw-browsers (CHROME_PATH is set from it when unset); nothing
// is downloaded. Writes: verify/t84/f01-skin-*.png, verify/t84/f01-astra-*.png,
// verify/t84/f01-skin.md; scratch (her file at the chat's viewports) in a temp dir.

import {
  mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync,
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
const SIZES = String(opt('sizes', process.env.T84_SIZES || '1280x800,1440x900,1920x1080'))
  .split(',').map((s) => s.trim().match(/^(\d{3,4})x(\d{3,4})$/)).filter(Boolean)
  .map((m) => ({ W: Number(m[1]), H: Number(m[2]) }));
const PORT = Number(process.env.E2E_PORT || 4173);
const BASE = process.env.E2E_URL || `http://127.0.0.1:${PORT}/`;
const DIST = opt('dist', 'dist');
const OUT = String(opt('out', join(REPO, 'verify/t84/'))).replace(/\/?$/, '/');
const ASTRA = join(REPO, 'verify/t84/astra/Cabinet-Core-PRO-Studio-Stage-1.html');
const astraUrl = (query) => `file://${ASTRA}?${query}`;
const SCRATCH = mkdtempSync(join(tmpdir(), 't84-skin-'));
mkdirSync(OUT, { recursive: true });
let head = '(unknown)';
let cssAt = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }
try { cssAt = execFileSync('git', ['log', '-1', '--format=%h %s', '--', 'src/components/studio/studio.css'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }
const say = (line) => process.stdout.write(`${line}\n`);

// Chromium for scripts/cdp.mjs, which reads CHROME_PATH when it is first imported.
if (!process.env.CHROME_PATH) {
  try {
    const dir = readdirSync('/opt/pw-browsers').filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
    const bin = dir && [`/opt/pw-browsers/${dir}/chrome-linux64/chrome`, `/opt/pw-browsers/${dir}/chrome-linux/chrome`].find((p) => existsSync(p));
    if (bin) process.env.CHROME_PATH = bin;
  } catch { /* cdp.mjs says what it tried */ }
}
const { open, pro, showroomDown, settleCamera } = await import('./t74-harness.mjs');
const { clickWith, until, reachFree } = await import('./t75-harness.mjs');
const { studioWidths } = await import('../src/components/studio/lib/studioSkin.js');

// scripts/t74-harness.mjs `open` takes Chromium's DevTools port from this
// process's id (9500 + (pid % 40) * 12 + n). A port another browser already
// holds would hand this run that browser's page, so a busy one stops the run.
const PORTS = 9500 + ((process.pid % 40) * 12);
for (let n = 1; n <= 6; n += 1) {
  const busy = await fetch(`http://127.0.0.1:${PORTS + n}/json/version`).then(() => true, () => false);
  if (busy) {
    say(`DevTools port ${PORTS + n} (this process's block) is held by another browser; run again (a new pid takes another block).`);
    process.exit(2);
  }
}

// === THE BUILD AND THE SERVER (--build, --serve) ============================
let preview = null;
async function served() {
  try { const r = await fetch(BASE); return r.ok; } catch { return false; }
}
if (flag('build')) {
  say(`npx vite build --outDir ${DIST} --emptyOutDir ...`);
  execFileSync('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], { cwd: REPO, stdio: 'inherit' });
}
if (flag('serve') && !(await served())) {
  preview = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: REPO, stdio: 'ignore', detached: true });
  for (let t = 0; t < 120 && !(await served()); t += 1) await new Promise((r) => { setTimeout(r, 500); });
}
const stopPreview = () => { if (preview) { try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* gone */ } preview = null; } };
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopPreview(); process.exit(130); });
if (!(await served())) {
  say(`No app at ${BASE}: build it and serve it (npx vite build; npx vite preview --port ${PORT} --strictPort), pass --build --serve, or point E2E_URL at a served build.`);
  stopPreview();
  process.exit(2);
}
if (!existsSync(ASTRA)) {
  say(`The designer's file is not at ${ASTRA}.`);
  stopPreview();
  process.exit(2);
}

// === THE LEDGER =============================================================
const j = (v) => JSON.stringify(v);
// Plain ASCII: the app's own glyphs read off the page are spelt in ASCII here.
const ascii = (t) => String(t)
  .replace(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'g'), '-')
  .replace(new RegExp(String.fromCharCode(0xb7), 'g'), '.')
  .replace(new RegExp(String.fromCharCode(0xd7), 'g'), 'x')
  .replace(new RegExp(String.fromCharCode(0x2026), 'g'), '...')
  .replace(new RegExp(String.fromCharCode(0x203a), 'g'), '>')
  .replace(new RegExp(String.fromCharCode(0xb2), 'g'), '2')
  .replace(new RegExp(String.fromCharCode(0xb0), 'g'), ' deg')
  .replace(new RegExp(String.fromCharCode(0x2022), 'g'), '*')
  .replace(new RegExp(String.fromCharCode(0x2713), 'g'), 'v')
  .replace(new RegExp(String.fromCharCode(0x25b6), 'g'), '>')
  .replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const steps = [];
const frames = [];
const check = (size, gesture, ok, expect, got) => {
  const kind = ok ? 'PASS' : 'FAIL';
  steps.push({
    kind, size: `${size.W}x${size.H}`, gesture: ascii(gesture), expect: ascii(expect), got: ascii(got),
  });
  say(`${kind.padEnd(5)} [${size.W}x${size.H}] ${ascii(gesture)} | expect: ${ascii(expect)} | observed: ${ascii(got)}`);
  return Boolean(ok);
};
async function shot(page, name) {
  await page.sleep(400);
  await page.screenshot(`${OUT}${name}`);
  frames.push(name);
  say(`FRAME ${name}`);
}
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));

// === THE STAGE: scripts/t81-kitchen.mjs, ITS CALLS RECORDED, REPLAYED IN THE PAGE ===
// `t81Kitchen()` talks to `useProjectStore.getState()`; for the length of one
// call that getter hands it a recorder, which writes down every action by its
// name and arguments (an added unit answers a placeholder id). The page then
// makes the same calls on its own store, the placeholders swapped for the ids
// the page's `addUnit` gives back. Nothing in node keeps the kitchen.
async function recordT81Kitchen() {
  const { useProjectStore } = await import('../src/stores/projectStore.js');
  const K = await import('./t81-kitchen.mjs');
  const calls = [];
  let n = 0;
  const recorder = new Proxy({}, {
    get: (_, name) => (...args) => {
      const call = { name: String(name), args: JSON.parse(JSON.stringify(args)) };
      calls.push(call);
      if (name === 'addUnit') { n += 1; call.ret = `__t81unit${n}`; return { id: call.ret }; }
      return undefined;
    },
  });
  const real = useProjectStore.getState;
  useProjectStore.getState = () => recorder;
  let ids;
  try { ids = K.t81Kitchen(); } finally { useProjectStore.getState = real; }
  return { calls, ids };
}
const T81 = await recordT81Kitchen();
const replayT81 = (page) => page.ask(`(() => { const map = {};
  const sub = (v) => (typeof v === 'string' && map[v] ? map[v] : (Array.isArray(v) ? v.map(sub)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)])) : v)));
  for (const c of ${j(T81.calls)}) {
    const fn = window.__cc.project.getState()[c.name];
    if (typeof fn !== 'function') return { missing: c.name };
    const r = fn(...sub(c.args));
    if (c.ret) map[c.ret] = r && r.id;
  }
  return { map }; })()`);

// === THE PAGE-SIDE READERS ==================================================
// `read(x)`: an element's box (getBoundingClientRect, to 0.1 px) and the style
// the tables compare; `textRect(el)`: the box of an element's own words only
// (its text nodes, no icon), for a box her markup draws round words and ours
// round an icon and words.
const HELPERS = `const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const vis = (el) => Boolean(el && el.getClientRects && el.getClientRects().length);
  const r1 = (v) => Math.round(v * 10) / 10;
  const textRect = (el) => { if (!el) return null; const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let b = null;
    for (let n = walk.nextNode(); n; n = walk.nextNode()) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n);
      const r = rg.getBoundingClientRect(); if (!r.width) continue;
      b = b ? { l: Math.min(b.l, r.left), t: Math.min(b.t, r.top), r: Math.max(b.r, r.right), bt: Math.max(b.bt, r.bottom), words: b.words + n.textContent }
        : { l: r.left, t: r.top, r: r.right, bt: r.bottom, words: n.textContent }; }
    return b && { isRect: true, el, left: b.l, top: b.t, width: b.r - b.l, height: b.bt - b.t, words: b.words }; };
  const firstTextRect = (el) => { if (!el) return null; const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n);
      const r = rg.getBoundingClientRect(); if (r.width) return { isRect: true, el, left: r.left, top: r.top, width: r.width, height: r.height, words: n.textContent }; }
    return null; };
  const read = (t) => { if (!t) return null; const el = t.isRect ? t.el : t; if (!t.isRect && !vis(el)) return null;
    const r = t.isRect ? t : el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { x: r1(r.left), y: r1(r.top), w: r1(r.width), h: r1(r.height), fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight,
      ls: cs.letterSpacing, tt: cs.textTransform, ta: cs.textAlign, br: cs.borderTopLeftRadius, pl: cs.paddingLeft, pr: cs.paddingRight,
      pt: cs.paddingTop, gap: cs.columnGap, color: cs.color, bg: cs.backgroundColor, bc: cs.borderTopColor, bw: cs.borderTopWidth,
      ff: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      text: (t.isRect && t.words != null ? t.words : (el.innerText || el.textContent || '')).replace(/\\s+/g, ' ').trim().slice(0, 44) }; };`;

/** The boxes of `list` ([id, label, ours, hers]) on one page, `side` 'ours' or 'hers'. */
async function measure(page, list, side) {
  const items = list.map((b) => [b[0], side === 'ours' ? b[2] : b[3]]).filter(([, e]) => e);
  return page.ask(`(() => { ${HELPERS} const out = {};
    ${items.map(([id, e]) => `try { out[${j(id)}] = read(${e}); } catch (err) { out[${j(id)}] = { error: String((err && err.message) || err) }; }`).join('\n    ')}
    return out; })()`);
}

/** The card's rows, in order: each row's box, its label, its value's control. */
async function readRows(page, rowsExpr) {
  return page.ask(`(() => { ${HELPERS}
    return (${rowsExpr}).filter(vis).map((row) => {
      const lab = row.querySelector('.cc-label, label');
      const field = row.querySelector('input, select, .studio-value-action, .value-action, .studio-readonly-value, .readonly-value, button');
      const b = read(row); const l = read(lab); const f = read(field);
      return { label: l ? l.text : '', y: b.y, h: b.h, lfs: l && l.fs,
        field: f && { tag: field.tagName.toLowerCase(), cls: String(field.className || '').split(/\\s+/).filter((c) => /value|input|readonly/.test(c)).join('.'),
          x: f.x, y: f.y, w: f.w, h: f.h, fs: f.fs, br: f.br },
        buttons: [...row.querySelectorAll('button')].filter(vis).map((btn) => { const r = read(btn); return { text: r.text, h: r.h, w: r.w, br: r.br }; }) };
    }); })()`);
}

// The Studio's own controls and their scale, for the checks (THE NUMBERS hold).
const SCALE = `(() => { ${HELPERS}
  const tag = (el) => el.getAttribute('data-studio') || el.getAttribute('aria-label') || (el.innerText || el.value || '').trim().slice(0, 24) || el.tagName.toLowerCase();
  const pick = (sel) => qa(sel).filter(vis).map((el) => { const r = read(el); return { what: tag(el), h: r.h, w: r.w, br: r.br, fs: r.fs }; });
  return {
    fields: pick('[data-studio="card"] input.cc-input, [data-studio="card"] select.cc-input, [data-studio="card"] .studio-value-action'),
    cardButtons: pick('[data-studio="card"] button:not(.studio-value-action)'),
    railButtons: pick('[data-studio="rail"] button'),
    railWords: qa('[data-studio="rail"] .studio-rail-text').filter((e) => e.offsetWidth > 1).map((e) => e.textContent.trim()),
    topButtons: pick('[data-studio="topbar-undo"], [data-studio="topbar-redo"], [data-studio="topbar-save"], [data-studio="topbar-account"], [data-studio="topbar-bom"], .studio-legacy-menu nav[aria-label="Main menu"] > div > button'),
    labels: pick('[data-studio="card"] .studio-field-row > .cc-label'),
    skinText: q('[data-studio="card"]') ? getComputedStyle(q('[data-studio="card"]')).fontSize : null,
    docOverflow: Math.max(0, document.scrollingElement.scrollWidth - window.innerWidth),
    inspectorOverflow: (() => { const c = q('[data-studio="inspector"]'); return c ? Math.max(0, c.scrollWidth - c.clientWidth) : null; })(),
    panelOverflow: (() => { const p = q('[data-studio="inspector"] aside.cc-panel > div.overflow-y-auto'); return p ? Math.max(0, p.scrollWidth - p.clientWidth) : null; })(),
    cardOverflow: (() => { const p = q('[data-studio="card"] .studio-inspector-body'); return p ? Math.max(0, p.scrollWidth - p.clientWidth) : null; })(),
  }; })()`;

// === THE BOXES (id, what, OURS, HERS: page-side expressions of one element) ===
// The pairs are the contract's own (verify/t84/agents/CONTRACT.md 3 and 6: the
// Studio's class is her class with `studio-` in front, its hook `data-studio`).
const OUR_PANEL = 'q(\'[data-studio="inspector"] aside.cc-panel\')';
const QUICK_BOXES = [
  ['root', 'the face (root)', 'q(\'[data-studio="shell"]\')', 'q(\'.studio-pro\')'],
  ['topbar', 'top bar', 'q(\'[data-studio="topbar"]\')', 'q(\'header.topbar\')'],
  ['wordmark-icon', 'top bar: the wordmark\'s cube', 'q(\'[data-studio="topbar"] .studio-wordmark svg\')', 'q(\'header.topbar .wordmark svg\')'],
  ['wordmark-text', 'top bar: CABINET CORE (the words)', 'textRect(q(\'[data-studio="topbar"] .studio-wordmark\'))', 'textRect(q(\'header.topbar .wordmark .brand-text\'))'],
  ['pro-label', 'top bar: PRO', 'q(\'[data-studio="topbar"] .studio-pro-label\')', 'q(\'header.topbar .pro-label\')'],
  ['rule', 'top bar: the rule after PRO', 'q(\'[data-studio="topbar"] > span[aria-hidden]\')', 'q(\'header.topbar > .rule\')'],
  ['project-name', 'top bar: the project name', 'q(\'[data-studio="topbar"] .studio-project-name\')', 'q(\'header.topbar .project-name\')'],
  ['project-name-words', 'top bar: the name\'s words (its first line)', 'firstTextRect(q(\'[data-studio="topbar"] .studio-project-name\'))', 'firstTextRect(q(\'header.topbar .project-name\'))'],
  ['menus', 'top bar: the eight legacy menus', 'q(\'.studio-legacy-menu nav[aria-label="Main menu"]\')', 'q(\'nav.legacy-menu\')'],
  ['menu-file', 'top bar: File', 'qa(\'.studio-legacy-menu nav[aria-label="Main menu"] > div > button\')[0]', 'qa(\'nav.legacy-menu > button\')[0]'],
  ['menu-output', 'top bar: Output', 'qa(\'.studio-legacy-menu nav[aria-label="Main menu"] > div > button\').at(-1)', 'qa(\'nav.legacy-menu > button\').at(-1)'],
  ['undo', 'top bar: Undo', 'q(\'[data-studio="topbar-undo"]\')', 'q(\'header.topbar button[aria-label="Undo"]\')'],
  ['redo', 'top bar: Redo', 'q(\'[data-studio="topbar-redo"]\')', null],
  ['save', 'top bar: Save', 'q(\'[data-studio="topbar-save"]\')', 'q(\'header.topbar button[data-existing="Save"]\')'],
  ['brightness', 'top bar: Brightness', 'q(\'[data-studio="topbar-brightness"]\')', null],
  ['account', 'top bar: Account', 'q(\'[data-studio="topbar-account"]\')', null],
  ['bom', 'top bar: BOM', 'q(\'[data-studio="topbar-bom"]\')', null],
  ['context', 'context strip', 'q(\'[data-studio="breadcrumb"]\')', 'q(\'.context\')'],
  ['crumbs', 'context: the breadcrumb', 'q(\'[data-studio="breadcrumb"] .studio-breadcrumb\')', 'q(\'.context .breadcrumb\')'],
  ['crumb-current', 'context: the unit number (bold)', 'q(\'[data-studio="breadcrumb-current"]\')', 'q(\'.context .breadcrumb strong\')'],
  ['scope', 'context: "1 cabinet selected"', 'q(\'[data-studio="breadcrumb-count"]\')', 'q(\'.context .selection-scope\')'],
  ['show-inspector', 'context: show-inspector button', 'q(\'[data-studio="breadcrumb-show-inspector"]\')', 'q(\'#show-inspector\')'],
  ['workspace', 'workspace (rail | scene | inspector)', 'q(\'[data-studio="workspace"]\')', 'q(\'main.workspace\')'],
  ['rail', 'rail', 'q(\'[data-studio="rail"]\')', 'q(\'nav.rail\')'],
  ['rail-select', 'rail: Select', 'q(\'[data-studio="rail-select"]\')', 'q(\'nav.rail button[data-action="select"]\')'],
  ['rail-add', 'rail: Add', 'q(\'[data-studio="rail-add"]\')', 'q(\'nav.rail button[data-popup="library"]\')'],
  ['rail-room', 'rail: Room', 'q(\'[data-studio="rail-room"]\')', 'q(\'nav.rail button[data-existing="Room"]\')'],
  ['rail-materials', 'rail: Materials', 'q(\'[data-studio="rail-materials"]\')', 'q(\'nav.rail button[data-popup="materials"]\')'],
  ['rail-separator', 'rail: separator', 'q(\'[data-studio="rail"] .studio-rail-separator\')', 'q(\'nav.rail .rail-separator\')'],
  ['rail-check', 'rail: Check', 'q(\'[data-studio="rail-check"]\')', 'q(\'nav.rail button[data-existing="Project checks"]\')'],
  ['rail-badge', 'rail: Check\'s count', 'q(\'[data-studio="rail-check-badge"]\')', null],
  ['rail-caption', 'rail: WORKSPACE', 'q(\'[data-studio="rail"] .studio-rail-caption\')', 'q(\'nav.rail .rail-caption\')'],
  ['rail-design', 'rail: Design', 'q(\'[data-studio="rail-design"]\')', 'q(\'nav.rail .rail-bottom button[data-action="design"]\')'],
  ['rail-cnc', 'rail: CNC', 'q(\'[data-studio="rail-cnc"]\')', null],
  ['scene', 'scene slot', 'q(\'[data-studio="scene"]\')', 'q(\'section.scene-slot\')'],
  ['toggles', 'scene: the four toggles', 'q(\'[data-studio="scene-toggles"]\')', null],
  ['view', 'scene: View (top right)', 'q(\'[data-studio="view-menu"]\')', 'q(\'.scene-tools > button\')'],
  ['camera-bar', 'scene: the bar at the foot', 'q(\'[data-studio="camera-bar"]\')', 'q(\'.scene-links\')'],
  ['camera-3d', 'scene foot: 3D', 'q(\'[data-studio="scene-3d"]\')', 'q(\'#design-view\')'],
  ['drawings', 'scene foot: Drawings...', 'q(\'[data-studio="drawings"]\')', 'q(\'.scene-links button[data-existing="Drawings preview"]\')'],
  ['inspector', 'inspector column', 'q(\'[data-studio="inspector"]\')', 'q(\'aside.inspector\')'],
  ['card-head', 'card: head', 'q(\'[data-studio="card"] .studio-inspector-head\')', 'q(\'aside.inspector .inspector-head\')'],
  ['card-id', 'card: the unit number', 'q(\'[data-studio="card"] .studio-object-id\')', 'q(\'aside.inspector .object-id\')'],
  ['card-title', 'card: the title', 'q(\'[data-studio="card"] .studio-object-title h1\')', 'q(\'aside.inspector .object-title h1\')'],
  ['card-thumb', 'card: the thumb', 'q(\'[data-studio="card"] .studio-object-thumb\')', 'q(\'aside.inspector .object-thumb\')'],
  ['card-scope', 'card: the scope row', 'q(\'[data-studio="card"] .studio-scope-row\')', 'q(\'aside.inspector .scope-row\')'],
  ['card-pill', 'card: "This cabinet"', 'q(\'[data-studio="card"] .studio-scope-pill\')', 'q(\'aside.inspector .scope-pill\')'],
  ['card-body', 'card: body', 'q(\'[data-studio="card"] .studio-inspector-body\')', 'q(\'aside.inspector .inspector-body\')'],
  ['card-frame', 'card: the frame round the rows', 'q(\'[data-studio="card"] .studio-inspector-body > .cc-frame\')', 'q(\'aside.inspector .inspector-body > .cc-frame\')'],
  ['card-section', 'card: SIZE & SETUP', 'q(\'[data-studio="card"] .studio-card-section-title\')', 'q(\'aside.inspector .card-section-title\')'],
  ['card-inherit', 'card: "Height follows project default"', 'q(\'[data-studio="card"] .studio-inheritance\')', 'q(\'aside.inspector .inheritance\')'],
  ['card-open', 'card: Open cabinet (gold)', 'q(\'[data-studio="card-open-cabinet"]\')', 'q(\'aside.inspector .card-actions .cc-btn-gold\')'],
  ['card-full', 'card: Full settings', 'q(\'[data-studio="card-full-settings"]\')', 'q(\'aside.inspector .card-actions button[data-action="full"]\')'],
  ['card-bottom', 'card: foot', 'q(\'[data-studio="card"] .studio-inspector-bottom\')', 'q(\'aside.inspector .inspector-bottom\')'],
  ['card-hide', 'card foot: Hide settings', 'q(\'[data-studio="card-hide"]\')', 'q(\'aside.inspector .inspector-bottom button[data-action="hide-inspector"]\')'],
  ['statusbar', 'status bar', 'q(\'[data-studio="statusbar"]\')', 'q(\'footer.statusbar\')'],
  ['status-selection', 'status: the selection in words', 'q(\'[data-studio="statusbar-selection"]\')', 'q(\'footer.statusbar > span\')'],
  ['status-viewport', 'status: the viewport', 'q(\'[data-studio="statusbar-viewport"]\')', 'q(\'#viewport-size\')'],
];
const ROWS_OURS = 'qa(\'[data-studio="card"] [data-studio="card-row"]\')';
const ROWS_HERS = 'qa(\'aside.inspector .inspector-body .field-row\')';

// The type and the radius the card and the rail are drawn at (id, what, ours, hers, props).
const TYPE_QUICK = [
  ['t-skin', 'the face\'s base text', 'q(\'[data-studio="card"]\')', 'q(\'.studio-pro\')', ['fs', 'ff']],
  ['t-label', 'a row\'s label (Width)', `${ROWS_OURS}[0] && ${ROWS_OURS}[0].querySelector('.cc-label')`, `${ROWS_HERS}[0] && ${ROWS_HERS}[0].querySelector('.cc-label')`, ['fs', 'fw', 'color']],
  ['t-value', 'a number field (Width)', `${ROWS_OURS}[0] && ${ROWS_OURS}[0].querySelector('input')`, `${ROWS_HERS}[0] && ${ROWS_HERS}[0].querySelector('input')`, ['fs', 'h', 'br', 'ta', 'pr', 'bg', 'bc']],
  ['t-unit', 'the unit in the field (mm)', 'q(\'[data-studio="card"] .studio-unit\')', 'q(\'aside.inspector .value-wrap .unit\')', ['fs', 'color']],
  ['t-action', 'a summary value (Doors / Front type)', 'q(\'[data-studio="card"] .studio-value-action\')', 'q(\'aside.inspector .value-action\')', ['fs', 'h', 'br', 'bg', 'bc']],
  ['t-section', 'the section title', 'q(\'[data-studio="card"] .studio-card-section-title\')', 'q(\'aside.inspector .card-section-title\')', ['fs', 'ls', 'tt', 'color']],
  ['t-id', 'the unit number over the title', 'q(\'[data-studio="card"] .studio-object-id\')', 'q(\'aside.inspector .object-id\')', ['fs', 'ls', 'color']],
  ['t-title', 'the title', 'q(\'[data-studio="card"] .studio-object-title h1\')', 'q(\'aside.inspector .object-title h1\')', ['fs', 'fw', 'color']],
  ['t-scope', 'the scope row', 'q(\'[data-studio="card"] .studio-scope-row\')', 'q(\'aside.inspector .scope-row\')', ['fs', 'color']],
  ['t-pill', 'the scope pill', 'q(\'[data-studio="card"] .studio-scope-pill\')', 'q(\'aside.inspector .scope-pill\')', ['fs', 'br', 'bc']],
  ['t-inherit', 'the inheritance line', 'q(\'[data-studio="card"] .studio-inheritance\')', 'q(\'aside.inspector .inheritance\')', ['fs', 'color']],
  ['t-open', 'Open cabinet', 'q(\'[data-studio="card-open-cabinet"]\')', 'q(\'aside.inspector .card-actions .cc-btn-gold\')', ['fs', 'fw', 'h', 'br', 'bg', 'color']],
  ['t-full', 'Full settings', 'q(\'[data-studio="card-full-settings"]\')', 'q(\'aside.inspector .card-actions button[data-action="full"]\')', ['fs', 'h', 'br', 'bg', 'bc']],
  ['t-hide', 'Hide settings', 'q(\'[data-studio="card-hide"]\')', 'q(\'aside.inspector .inspector-bottom button[data-action="hide-inspector"]\')', ['h', 'w', 'br']],
  ['t-rail', 'a rail button (Select)', 'q(\'[data-studio="rail-select"]\')', 'q(\'nav.rail button[data-action="select"]\')', ['fs', 'h', 'br', 'bc', 'color']],
  ['t-caption', 'the rail\'s WORKSPACE', 'q(\'[data-studio="rail"] .studio-rail-caption\')', 'q(\'nav.rail .rail-caption\')', ['fs', 'ls', 'tt']],
  ['t-menu', 'a menu button (File)', 'qa(\'.studio-legacy-menu nav[aria-label="Main menu"] > div > button\')[0]', 'qa(\'nav.legacy-menu > button\')[0]', ['fs', 'h', 'br', 'pl', 'color']],
  ['t-save', 'Save', 'q(\'[data-studio="topbar-save"]\')', 'q(\'header.topbar button[data-existing="Save"]\')', ['fs', 'h', 'br', 'bg', 'bc']],
  ['t-wordmark', 'CABINET CORE', 'q(\'[data-studio="topbar"] .studio-wordmark\')', 'q(\'header.topbar .wordmark\')', ['fs', 'ls', 'color']],
  ['t-crumbs', 'the breadcrumb', 'q(\'[data-studio="breadcrumb"] .studio-breadcrumb\')', 'q(\'.context .breadcrumb\')', ['fs', 'color']],
  ['t-scopewords', '"1 cabinet selected"', 'q(\'[data-studio="breadcrumb-count"]\')', 'q(\'.context .selection-scope\')', ['fs', 'color']],
  ['t-status', 'the status bar', 'q(\'[data-studio="statusbar"]\')', 'q(\'footer.statusbar\')', ['fs', 'color', 'bg']],
];

const FULL_BOXES = [
  ['inspector', 'inspector column (full, pinned)', 'q(\'[data-studio="inspector"]\')', 'q(\'aside.inspector\')'],
  ['full-head', 'the panel\'s head', `${OUR_PANEL} && ${OUR_PANEL}.firstElementChild`, 'q(\'aside.inspector .full-head\')'],
  ['full-title', 'head: the title', `${OUR_PANEL} && ${OUR_PANEL}.firstElementChild.firstElementChild`, 'q(\'aside.inspector .full-head h2\')'],
  ['full-name', 'head: the unit\'s name field', `${OUR_PANEL} && ${OUR_PANEL}.firstElementChild.querySelector('input')`, null],
  ['pin', 'head: Pin', 'q(\'[data-studio="pin"]\')', 'q(\'aside.inspector .full-head button[data-action="pin"]\')'],
  ['back', 'head: back to quick settings', 'q(\'[data-studio="back-to-quick"]\')', 'q(\'aside.inspector .full-head button[data-action="quick"]\')'],
  ['full-x', 'head: the panel\'s own x', `${OUR_PANEL} && [...${OUR_PANEL}.firstElementChild.querySelectorAll('button')].at(-1)`, null],
  ['full-context', 'the unit line under the head', null, 'q(\'aside.inspector .technical-context\')'],
  ['full-body', 'the rows\' body (it scrolls)', `${OUR_PANEL} && ${OUR_PANEL}.querySelector(':scope > div.overflow-y-auto')`, 'q(\'aside.inspector .technical-slot\')'],
  ['full-section', 'the first section (Carcass)', 'q(\'[data-studio="inspector"] [data-section="Carcass"]\')', 'q(\'aside.inspector .technical-slot details.cc-frame\')'],
  ['full-section-head', 'its head', 'q(\'[data-studio="inspector"] [data-section="Carcass"] > button\')', 'q(\'aside.inspector .technical-slot details.cc-frame > summary\')'],
  ['full-field', 'its first field', 'qa(\'[data-studio="inspector"] [data-section="Carcass"] input\').filter(vis)[0]', 'q(\'aside.inspector .technical-slot details.cc-frame input\')'],
  ['full-bottom', 'the column\'s foot', null, 'q(\'aside.inspector .inspector-bottom\')'],
  ['statusbar', 'status bar', 'q(\'[data-studio="statusbar"]\')', 'q(\'footer.statusbar\')'],
];
const TYPE_FULL = [
  ['t-full-title', 'the head\'s title', `${OUR_PANEL} && ${OUR_PANEL}.firstElementChild.firstElementChild`, 'q(\'aside.inspector .full-head h2\')', ['fs', 'fw', 'tt']],
  ['t-pin', 'Pin', 'q(\'[data-studio="pin"]\')', 'q(\'aside.inspector .full-head button[data-action="pin"]\')', ['h', 'w', 'br', 'color', 'bc']],
  ['t-back', 'back to quick settings', 'q(\'[data-studio="back-to-quick"]\')', 'q(\'aside.inspector .full-head button[data-action="quick"]\')', ['fs', 'h', 'w', 'br']],
  ['t-section-head', 'a section\'s head', 'q(\'[data-studio="inspector"] [data-section="Carcass"] > button\')', 'q(\'aside.inspector .technical-slot details.cc-frame > summary\')', ['fs', 'h', 'tt']],
  ['t-full-field', 'a field in it', 'qa(\'[data-studio="inspector"] [data-section="Carcass"] input\').filter(vis)[0]', 'q(\'aside.inspector .technical-slot details.cc-frame input\')', ['fs', 'h', 'br']],
  ['t-full-label', 'a label in it', 'qa(\'[data-studio="inspector"] [data-section="Carcass"] label, [data-studio="inspector"] [data-section="Carcass"] .cc-label\').filter(vis)[0]', 'q(\'aside.inspector .technical-slot details.cc-frame .cc-label\')', ['fs', 'tt']],
  ['t-frame', 'the section\'s frame', 'q(\'[data-studio="inspector"] [data-section="Carcass"]\')', 'q(\'aside.inspector .technical-slot details.cc-frame\')', ['br', 'bc']],
];

// === THE VERDICTS: EVERY DIFFERENCE AND ITS REASON ==========================
// A deviation is named once (D1 ... D20, printed at the end of the ledger with
// its source); a table row cites it with the px it measured. Each reason below
// holds only when the measured differences are the ones it explains (`fits`):
// a box that moved for any other reason prints UNEXPLAINED. Her own numbers
// (her style sheet: the top bar's 14 / 10 padding, 10 / 7 gap, 2 / 1.5
// tracking, 6 / 3 rule margin, 8 / 0 menu margin, 8 / 6 menu padding above and
// at or below 1500; her wordmark's gap 9; her Output's chevron 16 and gap 7;
// her rule 18 high) are hers, read from her file; ours are measured.
const DEVIATIONS = [
  { id: 'D1', title: 'THE NUMBERS: the rail at 1280 is 56, icons only.', text: '`ui.studio.rail` is 112 with labels from 1440 and 56 below (PROPOSED, CLAUDE.md THE NUMBERS: "Stage-1 and her 1280 note"); her file keeps 112 with its words down to her 1150 query (96 below it). At 1280 the rail and each of its buttons are 56 px narrower (rail 56, buttons 39), the separator 31 against 87, no WORKSPACE caption, Check\'s count on the button\'s corner; the context strip\'s left padding is the rail and 16 (72 against 128), so the breadcrumb starts 56 px further left; the scene starts at 56. THE NUMBERS win.' },
  { id: 'D2', title: 'THE NUMBERS: the quick card at 1280 is 316.', text: '`ui.studio.inspector.quickNarrowPx` 316 below `quickNarrowBelowPx` 1440 (PROPOSED, the designer); her file keeps 344 down to her 1150 query. The column and everything in the card (head, scope row, body, frame, section title, inheritance line, Open cabinet, Full settings, foot) are 28 px narrower and stand 28 px further right; the rows keep their 42 px pitch and 30 px fields, the value column at its 136 px minimum (her `minmax(136px, 1.1fr)`; 148.3 at 344). The scene is 84 px wider (56 + 28). THE NUMBERS win.' },
  { id: 'D3', title: 'Her wider top bar above 1500 is not taken (1920 only).', text: 'Her `@media (max-width: 1500px)` narrows her top bar; ours keeps her narrow values at every width (wave 1 of this slice, DECISIONS TAKEN 2: no media query can read the profile, and the Studio\'s bar holds more than hers, D7): padding 10 (hers 14 above 1500), gap 7 (10), the wordmark\'s tracking 1.5 (2), the rule\'s margin 3 (6), the menus\' margin 0 (8), a menu button\'s side padding 6 (8), the name\'s max 180 (240). At 1920: the cube 4 px further left, CABINET CORE 6 px shorter (12 glyphs at 0.5), PRO 12, the rule 21, the name 30, the menus 111 px further left, each menu button 4 px narrower. Her 1500 is `inspector.fullNarrowBelowPx`, a profile number a style sheet cannot read in a query, so taking her wide bar needs a width signal from the shell (StudioShell.jsx, not this slice\'s file); not offered as a patch.' },
  { id: 'D4', title: 'The PRO label and the rule after it.', text: 'TopBar draws PRO beside the wordmark, at the bar\'s gap (7), where her PRO stands inside her wordmark at its gap (9): 2 px nearer. The rule is TopBar\'s own separator (`h-5 w-px bg-shell-600`): 20 px high with no margin, against her `.rule`, 18 high with 3 px either side at 1500 and below: 5 px nearer, 1 px higher, 2 px taller, and everything after it 8 px nearer. PATCH offered: `/tmp/claude-0/t84/patches/D1-studio.css.diff`, the top bar hunk (PRO 2 px further off the words, the rule 18 high with 3 px either side). Measured on a build of it at the three sizes: at 1280 and 1440 PRO -2 to 0, the rule -5, -1, +2 to 0, 0, 0, the name -8 to 0 (its own width stays, D5); at 1920 PRO -10, the rule -16, the name -22 (D3\'s part).' },
  { id: 'D5', title: 'The project name is the job\'s, on one line.', text: 'Ours is the open project\'s name ("T81 kitchen" and the unsaved dot after it), one line centred on the bar; hers is a sample name over a second line, "Sample project . Studio layout" (her fixture\'s words; the app holds no such line and CLAUDE.md F2 names none). Box 84.9 x 18.2 against 155 x 33.6; the name\'s words stand 7.7 px lower (centred, not the first of two lines); everything after the name moves with its width.' },
  { id: 'D6', title: 'The menus are the legacy MenuBar\'s own (LAW 1, ZERO KASOWANIA).', text: 'The eight menus are MenuBar mounted whole with `orderMenus(menus)`, compacted to 13 px and her 6 px padding (studio.css section 4); Output is a word where her Output carries a chevron (16 and a gap of 7): 23 px. File to Lighting are her widths to the 0.1 px at 1500 and below.' },
  { id: 'D7', title: 'The top bar\'s right group holds what CLAUDE.md F2 puts there.', text: 'F2: "then Undo and Redo (useHistoryStore, the same depth guards as the toolbar\'s), Save with its three states, Brightness (the same slider, the same state), Account, and BOM". Six controls where her Stage-1 shows Undo and Save; the group from Undo to BOM is 451.7 px against her 114.1 (117.1 above 1500), so Undo stands 337.6 px further left at 1280 and 1440 (330.6 at 1920); Redo, Brightness, Account and BOM have no counterpart in hers.' },
  { id: 'D8', title: 'A house button keeps the house\'s side padding.', text: 'studio.css takes the scale (32 high, 4 round, 13 px) into the house classes and leaves their side padding to the house (src/index.css: `.cc-btn` and `.cc-btn-gold` `px-3` 12, `.cc-btn-ghost` `px-2` 8; wave 1 of this slice, DECISIONS TAKEN 1, so S2\'s `px-2` chips keep theirs); hers is 10 on all three. Save, View and 3D are 4 px wider than hers, Drawings... 4 px narrower; View, right-aligned, stands 4 px further left. PATCH offered (the padding hunk): 10 px either side for the house buttons of the top bar and the scene\'s edge that carry no `px-` utility, outside a popup and not an icon button. Measured on a build of it: Save, View, 3D and Drawings... on her widths at every size (View on her box at 1440 and 1920), Account 73.3 and BOM 52.6 (4 narrower), the camera bar 424.6 wider than hers instead of 396.6 (Plan, Iso, A to D and Frame selection, which she does not draw, take her 10 too), the View menu\'s Navy / Red chips keep their 8, every button 32 high, no overflow.' },
  { id: 'D9', title: 'The gold button\'s weight.', text: 'The house\'s `.cc-btn-gold` is `font-medium`, 500 (src/index.css:25); her `.cc-btn-gold` is 600. Open cabinet (and BOM, which has no counterpart in hers) reads lighter; 0 px. PATCH offered (the weight hunk): 600 inside the skin; measured on a build of it: Open cabinet and BOM 600.' },
  { id: 'D10', title: 'The show-inspector button stands only while the inspector is hidden.', text: 'CLAUDE.md F2: "the panel-show button when the inspector is hidden" (SelectionBreadcrumb draws it in `none` only); her context strip draws it always, where it does nothing while the inspector shows. "1 cabinet selected" stands 40 px further right (her button 32 and the gap 8).' },
  { id: 'D11', title: 'The breadcrumb\'s words are the job\'s.', text: 'Ours "T81 kitchen > Wall A > 02" (S1: the project\'s name for the room, which has none; the wall by the drawing set\'s own letter; the unit\'s number), hers "Kitchen > Island > B07" (sample): 17.8 px longer; the bold number 7.7 px narrower ("02" against "B07").' },
  { id: 'D12', title: 'Check carries its count on the rail.', text: 'CLAUDE.md F2: "Check (`toggleCheck`, the badge `findingsToAct(checkFindings).length`, red when a red finding is in it)"; on this stage 2, red (two red #18 findings on DR01: the NL500 runner has no article in the catalogue, the engine\'s own sentence). Her Check carries none.' },
  { id: 'D13', title: 'CNC stands at the rail\'s foot.', text: 'CLAUDE.md F2: "The foot: Design (`setViewMode(\'3d\')`) and CNC (`setViewMode(\'cnc\')`)"; hers holds Design only. The caption and Design stand 40 px higher (one button and one gap, 32 + 8).' },
  { id: 'D14', title: 'The four toggles at the scene\'s top edge.', text: 'CLAUDE.md F6 (the designer\'s set of 17:01, PROPOSED, `ui.studio.sceneToggles`): X-ray, Hide fronts, Outlines, Open all; her Stage-1 has none. 317.4 x 44, centred on the scene\'s top, 12 px down.' },
  { id: 'D15', title: 'The bar at the scene\'s foot holds the camera.', text: 'CLAUDE.md F6: "`CameraBar` at the scene\'s foot: Plan, Iso, A, B, C, D, Frame selection, beside 3D | Drawings..."; hers is 3D and Drawings... only. 608.1 px against 211.5, both centred in the scene: 3D starts 198.3 px further left and Drawings... 202.3 further right where the scenes are one width (1440, 1920); the buttons\' paddings are D8\'s.' },
  { id: 'D16', title: 'The card\'s title and number are the cabinet\'s.', text: 'The title is the Library\'s row for the type ("Base units . Standard", S2\'s decision: the row after its group), the number the unit\'s ("02"); her base fixture reads "Drawer base cabinet" and "B07". The title block is 4.2 px wider (the longer words).' },
  { id: 'D17', title: 'A BUD has five rows (LAW 3, THE CARD NEVER LIES).', text: 'CLAUDE.md F3: "Base: Width . Height . Depth . Doors (...) . Drawers (...) . Plinth (...). BUD hides Drawers"; a row the type does not have is absent. Her base fixture shows six sample rows (Width, Height, Depth, Front type, Finish, Plinth). Rows 1 to 5 stand where hers do, 42 apart and 42 high, their fields 30 high; the frame and the body are 42 px shorter, so the inheritance line, Open cabinet and Full settings stand 42 px higher. Our Plinth row is the derived height and Remove (a 32 px button: `removePlinth`), where her sample row is a 30 px summary.' },
  { id: 'D18', title: 'The card\'s foot carries no words.', text: 'Ours holds Hide settings alone (S2); hers adds "Project defaults remain available". Same box, 57 high; Hide settings on her pixel.' },
  { id: 'D19', title: 'The status bar holds what CLAUDE.md F2 and F5 put there.', text: 'Changes (the re-homed drawer, first), the selection in words (S1: "02 . Base unit"), MOCK DATA MODE, the unsaved mark, the counters ("2 red"), the viewport; hers holds the selection ("B07 . This cabinet"), the viewport, "mm" and her Prototype button. Our selection\'s words start 103 px further right (after Changes); our viewport words end clear of the app\'s build stamp (App.jsx, fixed at the bottom right; S1), 186 px further left than hers.' },
  { id: 'D20', title: 'Full settings is RightPanel, embedded whole (LAW 2, DECISIONS 8).', text: 'CLAUDE.md LAW 2: "The full panel IS `RightPanel.jsx` embedded, every row, every section, the UnitNameField; no second header over it"; DECISIONS 8: the embedded panel keeps its own style tonight. So the head is the panel\'s, 45 high (hers 53): the type\'s label in the panel\'s 12 px capitals (hers "Full settings", 14 px), the UnitNameField, the host\'s Pin at the header\'s 28 px (hers 32) and Quick as a word (S3; hers an x), then the panel\'s own x; no unit line under the head and no foot (hers "B07 . Drawer base cabinet / Pinned . follows selection" and "No new panel tabs in Stage 1 / Open cabinet"), so the rows start 60.6 px higher and run to the status bar. The sections, rows and scale are the panel\'s own (Carcass, Add items, Section 1, Construction, Doors; fields 30 high at 14 px, 11 px capital labels, 8 px frames, gold at 70 % while open), not her sample\'s (13 px, 12 px labels, 4 px frames). The column is THE NUMBERS\' width, 360 at 1280 and 1440, 400 at 1920: hers to the pixel.' },
];
const DEV_IDS = new Set(DEVIATIONS.map((d) => d.id));

const near = (a, b, tol = 0.5) => Math.abs(Number(a) - Number(b)) <= tol;
const sameBox = (o, h) => near(o.x, h.x) && near(o.y, h.y) && near(o.w, h.w) && near(o.h, h.h);
const ok = (b) => Boolean(b && !b.error);
/** The measured differences are exactly these (every one not named is 0), to 0.6 px. */
const fits = (c, { dx = 0, dy = 0, dw = 0, dh = 0 } = {}, skip = []) => ok(c.o) && ok(c.h)
  && (skip.includes('x') || near(c.o.x - c.h.x, dx, 0.6)) && (skip.includes('y') || near(c.o.y - c.h.y, dy, 0.6))
  && (skip.includes('w') || near(c.o.w - c.h.w, dw, 0.6)) && (skip.includes('h') || near(c.o.h - c.h.h, dh, 0.6));
const r1 = (v) => Math.round(Number(v) * 10) / 10;
const sgn = (v) => { const r = r1(v); return r > 0 ? `+${r}` : `${r}`; };
// Her top bar above 1500 against at or below (her own style sheet, see above).
const herBar = (W) => (W > 1500 ? {
  pad: 14, gap: 10, track: 2, ruleMargin: 6, menuMargin: 8, menuPad: 8,
} : {
  pad: 10, gap: 7, track: 1.5, ruleMargin: 3, menuMargin: 0, menuPad: 6,
});
const OUR_BAR = {
  pad: 10, gap: 7, track: 1.5, ruleMargin: 0, menuMargin: 0, menuPad: 6,
};
const WORDMARK_GLYPHS = 'CABINET CORE'.length;
/** The geometry a size's reasons share, from the quick frames of both pages. */
function geometry(res) {
  const o = res.quick || {};
  const h = res.hers || {};
  const W = res.size.W;
  const her = herBar(W);
  const wide = W > 1500;
  const g = { W, wide, her };
  g.sR = ok(o.rail) && ok(h.rail) ? o.rail.w - h.rail.w : 0;
  g.sIx = ok(o.inspector) && ok(h.inspector) ? o.inspector.x - h.inspector.x : 0;
  g.sIw = ok(o.inspector) && ok(h.inspector) ? o.inspector.w - h.inspector.w : 0;
  const hr = res.hersRows || [];
  const or = res.quickRows || [];
  g.pitch = hr.length > 1 ? hr[1].y - hr[0].y : 42;
  g.rowShift = -(hr.length - or.length) * g.pitch;
  // The top bar, left to right (her numbers against ours).
  g.cube = OUR_BAR.pad - her.pad;
  g.words = -(her.track - OUR_BAR.track) * WORDMARK_GLYPHS;
  g.pro = g.cube + g.words + (OUR_BAR.gap - 9);
  g.rule = g.pro + OUR_BAR.gap + OUR_BAR.ruleMargin - (her.gap + her.ruleMargin);
  g.name = g.rule + OUR_BAR.ruleMargin + OUR_BAR.gap - (her.ruleMargin + her.gap);
  g.nameW = ok(o['project-name']) && ok(h['project-name']) ? o['project-name'].w - h['project-name'].w : 0;
  g.menus = g.name + g.nameW + OUR_BAR.gap + OUR_BAR.menuMargin - (her.gap + her.menuMargin);
  g.menuPad = 2 * (OUR_BAR.menuPad - her.menuPad);
  g.chevron = -(16 + 7);
  g.groupO = ok(o.undo) && ok(o.bom) ? o.bom.x + o.bom.w - o.undo.x : null;
  g.groupH = ok(h.undo) && ok(h.save) ? h.save.x + h.save.w - h.undo.x : null;
  g.sceneRight = ok(o.scene) && ok(h.scene) ? (o.scene.x + o.scene.w) - (h.scene.x + h.scene.w) : 0;
  g.sceneMid = ok(o.scene) && ok(h.scene) ? (o.scene.x + o.scene.w / 2) - (h.scene.x + h.scene.w / 2) : 0;
  g.studio = res.studio;
  return g;
}
const with2 = (g, text, xOnly = false) => (g.sIx ? `D2 (+${r1(g.sIx)} x${xOnly ? '' : `, ${r1(-g.sIx)} w`}), ${text}` : text);
const WHY = {
  'wordmark-icon': (c) => (c.g.wide && fits(c, { dx: c.g.cube }) ? `D3: her padding ${c.g.her.pad} above 1500, ours ${OUR_BAR.pad}: ${sgn(c.g.cube)} x` : null),
  'wordmark-text': (c) => (c.g.wide && fits(c, { dx: c.g.cube, dw: c.g.words }) ? `D3: her padding and her tracking ${c.g.her.track} above 1500 (ours ${OUR_BAR.track}, ${WORDMARK_GLYPHS} glyphs): ${sgn(c.g.cube)} x, ${sgn(c.g.words)} w` : null),
  'pro-label': (c) => (fits(c, { dx: c.g.pro }) ? `D4: ours at the bar's gap ${OUR_BAR.gap}, hers at her wordmark's 9${c.g.wide ? ', and D3' : ''}: ${sgn(c.g.pro)} x` : null),
  rule: (c) => (fits(c, { dx: c.g.rule, dy: -1, dh: 2 }) ? `D4: TopBar's separator, 20 high and no margin, against her 18 with ${c.g.her.ruleMargin} px either side${c.g.wide ? ', and D3' : ''}: ${sgn(c.g.rule)} x, -1 y, +2 h` : null),
  'project-name': (c) => (fits(c, { dx: c.g.name }, ['y', 'w', 'h']) ? `D5: the job's name on one line against her two-line sample (${sgn(c.o.w - c.h.w)} w, ${sgn(c.o.h - c.h.h)} h); x ${sgn(c.g.name)} by D4${c.g.wide ? ' and D3' : ''}` : null),
  'project-name-words': (c) => (fits(c, { dx: c.g.name, dy: c.o && c.h ? c.o.y - c.h.y : 0 }, ['w']) && near(c.o.h, c.h.h) ? `D5: "${c.o.text}" against "${c.h.text}" (${sgn(c.o.w - c.h.w)} w), centred, not the first of two lines (${sgn(c.o.y - c.h.y)} y); x ${sgn(c.g.name)} by D4${c.g.wide ? ' and D3' : ''}` : null),
  menus: (c) => (fits(c, { dx: c.g.menus, dw: c.g.chevron + 8 * c.g.menuPad }) ? `D6: her Output's chevron (${c.g.chevron} w)${c.g.wide ? `, D3: her menu padding ${c.g.her.menuPad} (${8 * c.g.menuPad} w over eight)` : ''}; x ${sgn(c.g.menus)}: the name's width (D5) and D4${c.g.wide ? ', D3' : ''}` : null),
  'menu-file': (c) => (fits(c, { dx: c.g.menus, dw: c.g.menuPad }) ? `${c.g.wide ? `D3: her menu padding ${c.g.her.menuPad} (${sgn(c.g.menuPad)} w); ` : ''}x ${sgn(c.g.menus)} with the menus (D4, D5${c.g.wide ? ', D3' : ''})` : null),
  'menu-output': (c) => (fits(c, { dx: c.g.menus + 7 * c.g.menuPad, dw: c.g.chevron + c.g.menuPad }) ? `D6: no chevron (${c.g.chevron} w)${c.g.wide ? `, D3: her padding (${sgn(c.g.menuPad)} w, and ${sgn(7 * c.g.menuPad)} x from the seven before it)` : ''}; x with the menus` : null),
  undo: (c) => (c.g.groupO != null && c.g.groupH != null && fits(c, { dx: -(c.g.groupO - c.g.groupH) + (c.g.her.pad - OUR_BAR.pad) }) ? `D7: the right group Undo to BOM ${r1(c.g.groupO)} wide, hers Undo to Save ${r1(c.g.groupH)}${c.g.wide ? '; D3: her padding 14' : ''}` : null),
  redo: (c) => (ok(c.o) && !ok(c.h) ? 'D7: Redo beside Undo (CLAUDE.md F2)' : null),
  brightness: (c) => (ok(c.o) && !ok(c.h) ? 'D7: the Brightness slider, the same state (CLAUDE.md F2)' : null),
  account: (c) => (ok(c.o) && !ok(c.h) ? 'D7: Account (CLAUDE.md F2)' : null),
  bom: (c) => (ok(c.o) && !ok(c.h) ? 'D7: BOM, the gold button that said Export (CLAUDE.md F2; the owner, 16:27, "tak")' : null),
  save: (c) => (fits(c, { dw: 4 }, ['x']) ? `D8: the house's padding 12 against her 10 (+4 w); x by D7 (${sgn(c.o.x - c.h.x)})` : null),
  crumbs: (c) => (fits(c, { dx: c.g.sR }, ['w']) ? `D11: the job's words (${sgn(c.o.w - c.h.w)} w)${c.g.sR ? `; D1: the strip's padding is the rail and 16 (${sgn(c.g.sR)} x)` : ''}` : null),
  'crumb-current': (c) => (fits(c, {}, ['x', 'w']) ? `D11: "${c.o.text}" against "${c.h.text}" (${sgn(c.o.w - c.h.w)} w), x after the words${c.g.sR ? ' and D1' : ''} (${sgn(c.o.x - c.h.x)})` : null),
  scope: (c) => (fits(c, { dx: 40 }) ? 'D10: no show-inspector button while the inspector shows (her 32 and gap 8: +40 x)' : null),
  'show-inspector': (c) => (!ok(c.o) && ok(c.h) ? 'D10: drawn only while the inspector is hidden (CLAUDE.md F2)' : null),
  rail: (c) => (c.g.sR && fits(c, { dw: c.g.sR }) ? `D1: rail ${r1(c.o.w)}, icons only, below ${c.g.studio.rail.labelsFromPx} (her ${r1(c.h.w)})` : null),
  'rail-select': (c) => (c.g.sR && fits(c, { dw: c.g.sR }) ? `D1 (${sgn(c.g.sR)} w)` : null),
  'rail-add': (c) => (c.g.sR && fits(c, { dw: c.g.sR }) ? `D1 (${sgn(c.g.sR)} w)` : null),
  'rail-room': (c) => (c.g.sR && fits(c, { dw: c.g.sR }) ? `D1 (${sgn(c.g.sR)} w)` : null),
  'rail-materials': (c) => (c.g.sR && fits(c, { dw: c.g.sR }) ? `D1 (${sgn(c.g.sR)} w)` : null),
  'rail-separator': (c) => (c.g.sR && fits(c, { dw: c.g.sR }) ? `D1 (${sgn(c.g.sR)} w)` : null),
  'rail-check': (c) => (c.g.sR && fits(c, { dw: c.g.sR }) ? `D1 (${sgn(c.g.sR)} w)` : null),
  'rail-badge': (c) => (ok(c.o) && !ok(c.h) ? `D12: Check's count, ${c.o.text}, red${c.g.sR ? ', on the button\'s corner (D1)' : ''}` : null),
  'rail-caption': (c) => {
    if (!ok(c.o) && ok(c.h) && c.g.sR) return 'D1: icons only, no caption';
    return fits(c, { dy: -40 }) ? 'D13: CNC under Design (32 + 8: -40 y)' : null;
  },
  'rail-design': (c) => (fits(c, { dy: -40, dw: c.g.sR }) ? `D13: CNC under it (-40 y)${c.g.sR ? `; D1 (${sgn(c.g.sR)} w)` : ''}` : null),
  'rail-cnc': (c) => (ok(c.o) && !ok(c.h) ? 'D13: CNC at the rail\'s foot (CLAUDE.md F2)' : null),
  scene: (c) => (fits(c, { dx: c.g.sR, dw: -(c.g.sR + c.g.sIw) }) ? `D1 (${sgn(c.g.sR)} x, ${sgn(-c.g.sR)} w) and D2 (${sgn(-c.g.sIw)} w)` : null),
  toggles: (c) => (ok(c.o) && !ok(c.h) ? 'D14: X-ray, Hide fronts, Outlines, Open all (CLAUDE.md F6)' : null),
  view: (c) => (fits(c, { dx: c.g.sceneRight - 4, dw: 4 }) ? `D8: the house's padding (+4 w), right-aligned (-4 x)${c.g.sceneRight ? `; D2: the scene's right edge ${sgn(c.g.sceneRight)}` : ''}` : null),
  'camera-bar': (c) => (ok(c.o) && ok(c.h) && fits(c, { dx: c.g.sceneMid - (c.o.w - c.h.w) / 2 }, ['w']) ? `D15: ten buttons against her two (${sgn(c.o.w - c.h.w)} w), centred (${sgn(c.o.x - c.h.x)} x${c.g.sceneMid ? `, of which ${sgn(c.g.sceneMid)} the scene's centre, D1 and D2` : ''})` : null),
  'camera-3d': (c) => (ok(c.o) && ok(c.h) && fits(c, { dx: (c.quickOurs['camera-bar'].x - c.quickHers['camera-bar'].x), dw: 4 }) ? 'D8: the house\'s padding (+4 w); x with the bar (D15)' : null),
  drawings: (c) => (fits(c, { dw: -4 }, ['x']) ? `D8: the house's ghost padding 8 against her 10 (-4 w); x at the bar's end (D15: ${sgn(c.o.x - c.h.x)})` : null),
  inspector: (c) => (c.mode === 'quick' && c.g.sIx && fits(c, { dx: c.g.sIx, dw: c.g.sIw }) ? `D2: the card ${r1(c.o.w)} below ${c.g.studio.inspector.quickNarrowBelowPx} (her ${r1(c.h.w)})` : null),
  'card-head': (c) => (c.g.sIx && fits(c, { dx: c.g.sIx, dw: c.g.sIw }) ? 'D2' : null),
  'card-scope': (c) => (c.g.sIx && fits(c, { dx: c.g.sIx, dw: c.g.sIw }) ? 'D2' : null),
  'card-section': (c) => (c.g.sIx && fits(c, { dx: c.g.sIx, dw: c.g.sIw }) ? 'D2' : null),
  'card-bottom': (c) => (c.g.sIx && fits(c, { dx: c.g.sIx, dw: c.g.sIw }) ? 'D2 (D18: the same box, no words in ours)' : null),
  'card-pill': (c) => (c.g.sIx && fits(c, { dx: c.g.sIx }) ? 'D2 (x only)' : null),
  'card-id': (c) => (fits(c, { dx: c.g.sIx }, ['w']) ? with2(c.g, `D16: the block's width is its title's ("${c.o.text}" over it; ${sgn(c.o.w - c.h.w)} w)`, true) : null),
  'card-title': (c) => (fits(c, { dx: c.g.sIx }, ['w']) ? with2(c.g, `D16: "${c.o.text}" against "${c.h.text}" (${sgn(c.o.w - c.h.w)} w)`, true) : null),
  'card-body': (c) => (fits(c, { dx: c.g.sIx, dw: c.g.sIw, dh: c.g.rowShift }) ? with2(c.g, `D17: one row fewer (${sgn(c.g.rowShift)} h)`) : null),
  'card-frame': (c) => (fits(c, { dx: c.g.sIx, dw: c.g.sIw, dh: c.g.rowShift }) ? with2(c.g, `D17: one row fewer (${sgn(c.g.rowShift)} h)`) : null),
  'card-inherit': (c) => (fits(c, { dx: c.g.sIx, dw: c.g.sIw, dy: c.g.rowShift }) ? with2(c.g, `D17: under five rows, not six (${sgn(c.g.rowShift)} y)`) : null),
  'card-open': (c) => (fits(c, { dx: c.g.sIx, dw: c.g.sIw, dy: c.g.rowShift }) ? with2(c.g, `D17 (${sgn(c.g.rowShift)} y); its weight is D9`) : null),
  'card-full': (c) => (fits(c, { dx: c.g.sIx, dw: c.g.sIw, dy: c.g.rowShift }) ? with2(c.g, `D17 (${sgn(c.g.rowShift)} y)`) : null),
  'status-selection': (c) => (fits(c, {}, ['x', 'w']) && c.o.x > c.h.x ? `D19: after Changes (${sgn(c.o.x - c.h.x)} x); "${c.o.text}" against "${c.h.text}" (${sgn(c.o.w - c.h.w)} w)` : null),
  'status-viewport': (c) => (fits(c, {}, ['x']) && c.o.x < c.h.x ? `D19: the counters after it, clear of the build stamp (${sgn(c.o.x - c.h.x)} x)` : null),
  // Full settings and pinned: RightPanel embedded whole (D20).
  'full:full-head': (c) => (fits(c, { dh: -8 }) ? 'D20: the panel\'s own head, 45 high (hers 53)' : null),
  'full:full-title': (c) => (ok(c.o) && ok(c.h) ? `D20: the panel's "${c.o.text}" in its 12 px capitals (hers "${c.h.text}", 14 px)` : null),
  'full:full-name': (c) => (ok(c.o) && !ok(c.h) ? 'D20: the UnitNameField in the panel\'s head (LAW 2)' : null),
  'full:pin': (c) => (fits(c, { dw: -4, dh: -4 }, ['x', 'y']) ? 'D20: the header\'s 28 px (hers 32); x and y in the panel\'s head' : null),
  'full:back': (c) => (fits(c, { dh: -4 }, ['x', 'y', 'w']) ? `D20: "${c.o.text}", a word (S3), where hers is an x (${sgn(c.o.w - c.h.w)} w, -4 h)` : null),
  'full:full-x': (c) => (ok(c.o) && !ok(c.h) ? 'D20: the panel\'s own x (one of the 649)' : null),
  'full:full-context': (c) => (!ok(c.o) && ok(c.h) ? 'D20: no line under the head (LAW 2: no second header)' : null),
  'full:full-body': (c) => (fits(c, {}, ['y', 'h']) ? `D20: no unit line, no foot: from ${r1(c.o.y)} to the status bar (${sgn(c.o.y - c.h.y)} y, ${sgn(c.o.h - c.h.h)} h)` : null),
  'full:full-section': (c) => (ok(c.o) && ok(c.h) ? 'D20: the panel\'s own Carcass section, open (its rows, not her sample\'s)' : null),
  'full:full-section-head': (c) => (ok(c.o) && ok(c.h) ? 'D20: the panel\'s section head (37 high, 16 px, its 10 px arrow)' : null),
  'full:full-field': (c) => (ok(c.o) && ok(c.h) && near(c.o.h, c.h.h) ? `D20: the panel's own field (${r1(c.o.w)} x ${r1(c.o.h)} in its grid; hers ${r1(c.h.w)} x ${r1(c.h.h)})` : null),
  'full:full-bottom': (c) => (!ok(c.o) && ok(c.h) ? 'D20: no foot under the panel (S3)' : null),
};
const TYPE_WHY = {
  't-open': ({ o, h }) => (ok(o) && ok(h) && o.fw === '500' && h.fw === '600' ? 'D9: the house\'s weight 500, hers 600' : null),
  't-caption': ({ o, h, g }) => (!ok(o) && ok(h) && g.sR ? 'D1: icons only, no caption' : null),
  't-menu': ({ o, h, g }) => (g.wide && ok(o) && ok(h) && o.pl === `${OUR_BAR.menuPad}px` && h.pl === `${g.her.menuPad}px` ? 'D3: her padding 8 above 1500' : null),
  't-wordmark': ({ o, h, g }) => (g.wide && ok(o) && ok(h) && o.ls === `${OUR_BAR.track}px` && h.ls === `${g.her.track}px` ? 'D3: her tracking 2 above 1500' : null),
  't-full-title': ({ o, h }) => (ok(o) && ok(h) ? 'D20: the panel\'s own title' : null),
  't-pin': ({ o, h }) => (ok(o) && ok(h) && near(o.h, 28) && near(h.h, 32) ? 'D20: the header\'s 28 px' : null),
  't-back': ({ o, h }) => (ok(o) && ok(h) ? 'D20: a word in the panel\'s 14 px (S3)' : null),
  't-section-head': ({ o, h }) => (ok(o) && ok(h) ? 'D20: the panel\'s section head' : null),
  't-full-field': ({ o, h }) => (ok(o) && ok(h) && near(o.h, h.h) ? 'D20: the panel\'s 14 px (30 high, as hers)' : null),
  't-full-label': ({ o, h }) => (ok(o) && ok(h) ? 'D20: the panel\'s 11 px capitals' : null),
  't-frame': ({ o, h }) => (ok(o) && ok(h) ? 'D20: the house\'s frame (8 round; gold 70 % while open)' : null),
};

function verdictOf(id, ctx) {
  const { o, h } = ctx;
  if (!ok(o) && !ok(h)) return { tag: 'ABSENT', text: 'on neither page' };
  const why = WHY[`${ctx.mode}:${id}`] || WHY[id];
  const reason = why ? why(ctx) : null;
  if (!ok(o) || !ok(h)) {
    return { tag: !ok(o) ? 'HERS ONLY' : 'OURS ONLY', text: reason || 'UNEXPLAINED' };
  }
  if (sameBox(o, h)) return { tag: '=', text: '' };
  return reason ? { tag: 'DIFF', text: reason } : { tag: 'UNEXPLAINED', text: '' };
}

// === THE PIXEL LAB (one blank page reads every PNG through a canvas) =======
const LAB = `window.__px = {};
  window.__load = async (id, url) => { const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    window.__px[id] = g.getImageData(0, 0, c.width, c.height); return [c.width, c.height]; };
  window.__near = (d, i, rgb, tol) => Math.abs(d[i] - rgb[0]) <= tol && Math.abs(d[i + 1] - rgb[1]) <= tol && Math.abs(d[i + 2] - rgb[2]) <= tol;
  window.__runs = (hits) => { const out = []; for (const v of hits) { const last = out[out.length - 1]; if (last && v === last[1] + 1) last[1] = v; else out.push([v, v]); } return out; };
  // A hairline is a LINE: a hit down the column counts only when the pixels 3 px
  // either side of it match too (a horizontal border), a hit across a row only
  // when the pixels 4 px above and below match too (a vertical border); a
  // glyph's grey edge is neither.
  window.__ruler = (id, x, scans, rgb, tol, H) => { const im = window.__px[id]; const W = im.width; const d = im.data; const rows = [];
    const at = (xx, yy) => (xx >= 0 && xx < W && yy >= 0 && yy < im.height ? window.__near(d, (yy * W + xx) * 4, rgb, tol) : false);
    for (let y = 0; y < H; y += 1) if (at(x, y) && at(x - 3, y) && at(x + 3, y)) rows.push(y);
    const cols = scans.map(([y, ranges]) => { const hits = []; for (const [a, b] of ranges) for (let xx = Math.max(0, a); xx <= Math.min(W - 1, b); xx += 1) if (at(xx, y) && at(xx, y - 4) && at(xx, y + 4)) hits.push(xx); return [y, window.__runs(hits)]; });
    return { rows: window.__runs(rows), cols }; };
  window.__lastHairline = (id, x, rgb, tol) => { const im = window.__px[id]; const W = im.width; const d = im.data;
    for (let y = im.height - 1; y >= 0; y -= 1) if (window.__near(d, (y * W + x) * 4, rgb, tol)) return y; return -1; };
  window.__uniform = (id, y0, y1, rgb, tol) => { const im = window.__px[id]; const W = im.width; const d = im.data; let n = 0; let of = 0;
    for (let y = Math.max(0, y0); y < Math.min(y1, im.height); y += 1) for (let x = 0; x < W; x += 1) { of += 1; if (window.__near(d, (y * W + x) * 4, rgb, tol)) n += 1; }
    return { n, of }; };
  window.__diff = (a, b, H, tol, regions) => { const A = window.__px[a]; const B = window.__px[b]; const W = Math.min(A.width, B.width); const HH = Math.min(H, A.height, B.height);
    let n = 0; let box = null; const per = regions.map(() => 0);
    for (let y = 0; y < HH; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * A.width + x) * 4; const k = (y * B.width + x) * 4;
      const m = Math.max(Math.abs(A.data[i] - B.data[k]), Math.abs(A.data[i + 1] - B.data[k + 1]), Math.abs(A.data[i + 2] - B.data[k + 2]));
      if (m > tol) { n += 1; box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
        regions.forEach((r, ri) => { if (x >= r[0] && x < r[2] && y >= r[1] && y < r[3]) per[ri] += 1; }); } }
    return { n, of: W * HH, box, per }; };
  true;`;
const SHELL_600 = [0x3e, 0x3e, 0x42];
let lab = null;
async function labLoad(id, file) {
  const b64 = readFileSync(file).toString('base64');
  return lab.ask(`window.__load(${j(id)}, ${j(`data:image/png;base64,${b64}`)})`);
}
/** Where the shell-600 hairlines are: down the column 6 px in from the right edge, and across four rows. */
async function rulerOf(id, W, H) {
  const yWork = Math.min(500, H - 120);
  const scans = [[24, [[0, W - 1]]], [64, [[0, W - 1]]], [yWork, [[0, 140], [W - 420, W - 1]]]];
  return lab.ask(`window.__ruler(${j(id)}, ${W - 6}, ${j(scans)}, ${j(SHELL_600)}, 3, ${H})`);
}
const runsText = (runs) => (runs.length ? runs.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ') : '(none)');

// === OUR FACE ===============================================================
const UI = 'window.__cc.ui.getState()';
const S = 'window.__cc.project.getState()';
const centre = (page, expr) => page.ask(`(() => { const el = (${expr}); if (!el || !el.getClientRects().length) return null;
  const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
/** A real click at the centre of a control (no scrolling: the frame is what a person sees). */
async function press(page, expr) {
  const at = await centre(page, expr);
  if (!at) return null;
  await clickWith(page, at.x, at.y);
  return at;
}
/** The pointer laid down on the status bar's empty middle, so no hover lights a control or a piece. */
async function restPointer(page, size) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(size.W * 0.55), y: size.H - 8 });
  await page.sleep(700);
}
// The room's own meshes that take no pointer (`raycast={null}`) make three's
// `intersectObjects` throw inside the shared pixel finder; the finder, never the
// app, is given a no-op for them first (scripts/t82-walk.mjs, t83-walk.mjs).
const safeRays = (page) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return 0; let n = 0;
  v.scene.traverse((o) => { if (typeof o.raycast !== 'function') { o.raycast = () => {}; n += 1; } }); return n; })()`);

async function selectByClick(page, unitId) {
  const done = `Boolean(${UI}.selectedUnitId === ${j(unitId)} && document.querySelector('[data-studio="card"][data-unit=${j(unitId)}]'))`;
  if (await page.ask(done)) return { ok: true, piece: '(already)', at: null };
  await safeRays(page);
  const pieces = await page.ask(`(() => { const r = ${S}.unitResult(${j(unitId)}); if (!r) return []; const pick = [];
    for (const f of [(p) => p.part === 'FRONT', (p) => p.role === 'front', (p) => p.id === 'TOP', (p) => p.role === 'side']) {
      for (const p of r.panels) if (p.box && f(p) && !(p.meta && p.meta.frontDecorationParent) && !pick.includes(p.id)) pick.push(p.id);
    }
    return pick; })()`);
  for (const pid of pieces.slice(0, 4)) {
    const at = await reachFree(page, unitId, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    if (await until(page, done, 4000)) return { ok: true, piece: pid, at };
  }
  return { ok: false, pieces };
}

async function ourFace(size) {
  const { W, H } = size;
  const res = { size };
  const page = await open({ width: W, height: H });
  try {
    await pro(page, { base: BASE });
    res.studio = await page.ask('(window.__cc.profile.getState().profile.ui || {}).studio || null');
    res.stamp = await page.ask('(document.querySelector("[data-build-stamp]") || { getAttribute: () => null }).getAttribute("data-build-stamp")');
    res.widths = res.studio ? studioWidths({ ui: { studio: res.studio } }, W) : null;
    const shell = await page.ask('Boolean(document.querySelector(\'[data-studio="shell"]\'))');
    check(size, 'the PRO editor opens on the Studio face, as the profile ships it (ui.studio.enabled, no switch)', shell && res.studio && res.studio.enabled === true,
      'the shell [data-studio="shell"] mounted, ui.studio.enabled true', j({ shell, enabled: res.studio && res.studio.enabled }));

    // THE STAGE: the T81 kitchen, scripts/t81-kitchen.mjs's own calls through the page's store.
    const staged = await replayT81(page);
    const ids = Object.fromEntries(Object.entries(T81.ids).map(([k, v]) => [k, staged.map ? staged.map[v] : null]));
    res.ids = ids;
    await page.sleep(1800);
    await settleCamera(page);
    res.units = await page.ask(`${S}.units.map((u) => ({ id: u.id, num: u.params.unit_num, type: u.type, w: u.params.width }))`);
    res.stage = res.units.map((u) => `${u.num} ${u.type} ${u.w}`).join(', ');
    check(size, `the stage: the ${T81.calls.length} calls of scripts/t81-kitchen.mjs t81Kitchen() through the page's own store`,
      !staged.missing && res.units.length === Object.keys(T81.ids).length,
      `${Object.keys(T81.ids).length} units on wall A`, staged.missing ? `the store has no ${staged.missing}` : res.stage);

    // THE GESTURE: the BUD 800 (02) selected by a real click on one of its pieces.
    const target = ids.b;
    const picked = await selectByClick(page, target);
    res.picked = picked;
    const card = await page.ask(`(() => { const c = document.querySelector('[data-studio="card"]'); return c ? { type: c.getAttribute('data-card-type'), unit: c.getAttribute('data-unit'),
      num: (c.querySelector('[data-card-unit-num]') || {}).textContent || null, element: ${UI}.selectedElement || null, mode: ${UI}.inspector } : null; })()`);
    res.card = card;
    check(size, `a real click on the BUD 800's ${picked.piece || 'piece'}${picked.at ? ` at (${picked.at.x}, ${picked.at.y})` : ''}: the quick card for it`,
      picked.ok && card && card.unit === target && card.type === 'base',
      'unit 02 selected, the inspector in quick, the card of kind base', j(card));
    await restPointer(page, size);
    await shot(page, `f01-skin-${W}.png`);
    res.quick = await measure(page, QUICK_BOXES, 'ours');
    res.quickRows = await readRows(page, ROWS_OURS);
    res.quickType = await measure(page, TYPE_QUICK.map((t) => t.slice(0, 4)), 'ours');
    res.quickScale = await page.ask(SCALE);
    res.findings = await page.ask(`(() => { const units = ${S}.units; const num = (id) => { const u = units.find((x) => x.id === id); return u ? u.params.unit_num : null; };
      return ${S}.runChecks().filter((f) => f.level === 'red' || f.level === 'yellow').map((f) => ({ level: f.level, check: f.check, unit: f.unitNum || num(f.unitId), message: f.message })); })()`);
    res.markers = await page.ask('[...document.querySelectorAll(\'[data-studio="marker"]\')].map((m) => ({ unit: m.getAttribute("data-unit"), text: m.textContent.trim(), red: m.classList.contains("is-red") }))');

    // FULL SETTINGS, PIN, THE CARCASS HEAD: three real clicks.
    const fullAt = await press(page, 'document.querySelector(\'[data-studio="card-full-settings"]\')');
    const full = await until(page, 'Boolean(document.querySelector(\'[data-studio="inspector"][data-mode="full"] aside.cc-panel\'))', 5000);
    const pinAt = full ? await press(page, 'document.querySelector(\'[data-studio="pin"]\')') : null;
    const pinned = await until(page, `${UI}.inspectorPinned === true && (document.querySelector('[data-studio="pin"]') || { getAttribute: () => null }).getAttribute('aria-pressed') === 'true'`, 5000);
    let carcassAt = null;
    if (await page.has('[data-studio="inspector"] [data-section="Carcass"][data-open="0"]')) {
      carcassAt = await press(page, 'document.querySelector(\'[data-studio="inspector"] [data-section="Carcass"] > button\')');
    }
    const carcass = await until(page, 'Boolean(document.querySelector(\'[data-studio="inspector"] [data-section="Carcass"][data-open="1"]\'))', 4000);
    check(size, `real clicks on Full settings${fullAt ? ` (${fullAt.x}, ${fullAt.y})` : ''}, Pin${pinAt ? ` (${pinAt.x}, ${pinAt.y})` : ''} and the panel's Carcass head${carcassAt ? ` (${carcassAt.x}, ${carcassAt.y})` : ''}`,
      Boolean(full && pinned && carcass), 'the embedded RightPanel in the column, pinned, Carcass open',
      j({ full: Boolean(full), pinned: Boolean(pinned), carcass: Boolean(carcass) }));
    await restPointer(page, size);
    await shot(page, `f01-skin-${W}-full.png`);
    res.full = await measure(page, FULL_BOXES, 'ours');
    res.fullType = await measure(page, TYPE_FULL.map((t) => t.slice(0, 4)), 'ours');
    res.fullScale = await page.ask(SCALE);
    res.errors = pageErrors(page);
  } catch (e) {
    check(size, 'our face to its end', false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    await shot(page, `f01-skin-${W}-failure.png`).catch(() => {});
    res.errors = pageErrors(page);
  }
  await page.close();
  return res;
}

// === HER FACE ===============================================================
async function herFace(astra, size, query, name) {
  await astra.send('Emulation.setDeviceMetricsOverride', {
    width: size.W, height: size.H, deviceScaleFactor: 1, mobile: false,
  });
  await astra.goto(astraUrl(query));
  await astra.sleep(900);
  if (name) await shot(astra, name);
  return astra.ask('document.querySelector(\'.studio-pro\') ? document.querySelector(\'.studio-pro\').getAttribute(\'data-inspector\') : null');
}

// === THE CHAT'S FRAMES OF HER FILE ==========================================
// Read off each frame: the card's unit number says which of her fixtures it is
// (W02 the wall, B07 the base, V01 the vanity); the black below the status bar
// says the viewport the chat's browser had (the frame is the screen, taller).
const CHAT = [
  { file: 'stage1-1280-quick.png', query: 'type=wall', what: 'quick card, W02 (her wall fixture)' },
  { file: 'stage1-1440-quick.png', query: 'type=base', what: 'quick card, B07 (her base fixture)' },
  { file: 'stage1-1440-full.png', query: 'type=base&inspector=full&pin=1', what: 'full settings, pinned, B07' },
  { file: 'stage1-1920-full.png', query: 'type=vanity&inspector=full&pin=1', what: 'full settings, pinned, V01 (her vanity fixture)' },
];

// === THE RUN ================================================================
const results = [];
for (const size of SIZES) {
  say(`\n=== ${size.W} x ${size.H} ===`);
  const ours = await ourFace(size);
  results.push(ours);
}
const astra = await open({ width: 1440, height: 900 });
for (const res of results) {
  const { size } = res;
  res.hersMode = await herFace(astra, size, 'type=base', `f01-astra-${size.W}.png`);
  res.hers = await measure(astra, QUICK_BOXES, 'hers');
  res.hersRows = await readRows(astra, ROWS_HERS);
  res.hersType = await measure(astra, TYPE_QUICK.map((t) => t.slice(0, 4)), 'hers');
  res.hersFullMode = await herFace(astra, size, 'type=base&inspector=full&pin=1', `f01-astra-${size.W}-full.png`);
  res.hersFull = await measure(astra, FULL_BOXES, 'hers');
  res.hersFullType = await measure(astra, TYPE_FULL.map((t) => t.slice(0, 4)), 'hers');
}
lab = await open({ width: 800, height: 600 });
await lab.evaluate(LAB);
for (const res of results) {
  const { W, H } = res.size;
  res.ruler = {};
  for (const [key, file] of [['ours', `f01-skin-${W}.png`], ['hers', `f01-astra-${W}.png`], ['oursFull', `f01-skin-${W}-full.png`], ['hersFull', `f01-astra-${W}-full.png`]]) {
    if (!existsSync(`${OUT}${file}`)) continue;
    await labLoad(key + W, `${OUT}${file}`);
    res.ruler[key] = await rulerOf(key + W, W, H);
  }
}
const chat = [];
const first0 = results.find((r) => r.studio) || null;
for (const c of CHAT) {
  const file = join(REPO, 'verify/t84/astra', c.file);
  if (!existsSync(file)) { chat.push({ ...c, missing: true }); continue; }
  const [W, Hframe] = await labLoad(`chat:${c.file}`, file);
  // Her page is 100dvh tall; below it the chat's frame is her body's ground
  // (#1a1a1a, the status bar's own colour). Its last hairline down the right
  // edge is the status bar's top border, so the candidate viewport is that row
  // and her status bar's height; her status bar PRINTS the viewport
  // (innerWidth x innerHeight), so the pixels of that bar, held against her
  // file rendered here at the candidate, confirm it or refute it.
  const lastHairline = await lab.ask(`window.__lastHairline(${j(`chat:${c.file}`)}, ${W - 6}, ${j(SHELL_600)}, 3)`);
  const statusPx = first0 && first0.studio ? first0.studio.bars.statusPx : 30;
  const vh = lastHairline + statusPx;
  const below = await lab.ask(`window.__uniform(${j(`chat:${c.file}`)}, ${vh}, ${Hframe}, [26, 26, 26], 2)`);
  const size = { W, H: vh };
  await herFace(astra, size, c.query, null);
  const regions = await astra.ask(`(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return [0, 0, 0, 0]; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    return [r('header.topbar'), r('.context'), r('nav.rail'), r('section.scene-slot'), r('aside.inspector'), r('footer.statusbar')]; })()`);
  const here = join(SCRATCH, `astra-${c.file}`);
  await astra.screenshot(here);
  await labLoad(`here:${c.file}`, here);
  const diff = await lab.ask(`window.__diff(${j(`chat:${c.file}`)}, ${j(`here:${c.file}`)}, ${vh}, 24, ${j(regions)})`);
  const rulerChat = await rulerOf(`chat:${c.file}`, W, vh);
  const rulerHere = await rulerOf(`here:${c.file}`, W, vh);
  chat.push({
    ...c, W, Hframe, vh, lastHairline, below, diff, regions, rulerChat, rulerHere,
  });
  say(`CHAT  ${c.file}: viewport ${W} x ${vh} (frame ${W} x ${Hframe}); ${diff.n} of ${diff.of} px differ from her file here (${c.query})`);
}
await lab.close();
await astra.close();
await showroomDown();
stopPreview();

// === THE CHECKS: THE SKIN HOLDS THE NUMBERS =================================
for (const res of results) {
  const { size } = res;
  const st = res.studio;
  const w = res.widths;
  const o = res.quick || {};
  const f = res.full || {};
  if (!st || !w || !res.quick) continue;
  const sc = res.quickScale;
  const fsc = res.fullScale;
  const px = (n) => `${n}px`;
  check(size, `top bar ${o.topbar && o.topbar.h} high`, o.topbar && near(o.topbar.h, st.bars.topPx), `bars.topPx ${st.bars.topPx}`, j(o.topbar && o.topbar.h));
  check(size, `context strip ${o.context && o.context.h} high`, o.context && near(o.context.h, st.bars.contextPx), `bars.contextPx ${st.bars.contextPx}`, j(o.context && o.context.h));
  check(size, `status bar ${o.statusbar && o.statusbar.h} high`, o.statusbar && near(o.statusbar.h, st.bars.statusPx), `bars.statusPx ${st.bars.statusPx}`, j(o.statusbar && o.statusbar.h));
  check(size, `rail ${o.rail && o.rail.w} wide, its words ${w.railLabels ? 'shown' : 'not drawn'}`,
    o.rail && near(o.rail.w, w.railPx) && (w.railLabels ? sc.railWords.length === 7 : sc.railWords.length === 0),
    `rail ${w.railPx} (${w.railLabels ? `labels from ${st.rail.labelsFromPx}` : `icons only below ${st.rail.labelsFromPx}`})`, `${o.rail && o.rail.w}; words: ${sc.railWords.join(', ') || 'none'}`);
  check(size, `the quick card's column ${o.inspector && o.inspector.w} wide`, o.inspector && near(o.inspector.w, w.quickPx),
    `inspector.quickPx ${w.quickPx} (${st.inspector.quickPx}, ${st.inspector.quickNarrowPx} below ${st.inspector.quickNarrowBelowPx})`, j(o.inspector && o.inspector.w));
  check(size, `the full panel's column ${f.inspector && f.inspector.w} wide`, f.inspector && near(f.inspector.w, w.fullPx),
    `inspector.fullPx ${w.fullPx} (${st.inspector.fullPx}, ${st.inspector.fullNarrowPx} below ${st.inspector.fullNarrowBelowPx})`, j(f.inspector && f.inspector.w));
  check(size, 'rail + scene + inspector = the window\'s width (quick)', o.rail && o.scene && o.inspector && near(o.rail.w + o.scene.w + o.inspector.w, size.W),
    `${size.W}`, `${o.rail && o.rail.w} + ${o.scene && o.scene.w} + ${o.inspector && o.inspector.w}`);
  const badField = sc.fields.filter((x) => !near(x.h, st.scale.fieldPx) || x.br !== px(st.scale.radiusPx) || x.fs !== px(st.scale.textPx));
  check(size, `every field of the card (${sc.fields.length}: ${sc.fields.map((x) => x.what).join(', ')}) ${st.scale.fieldPx} high, radius ${st.scale.radiusPx}, text ${st.scale.textPx}`,
    sc.fields.length > 0 && !badField.length, `scale.fieldPx ${st.scale.fieldPx}, radiusPx ${st.scale.radiusPx}, textPx ${st.scale.textPx}`, badField.length ? j(badField) : 'all');
  const buttons = [...sc.cardButtons, ...sc.railButtons, ...sc.topButtons];
  const badButton = buttons.filter((x) => !near(x.h, st.scale.buttonPx) || x.br !== px(st.scale.radiusPx));
  check(size, `every button of the card, the rail and the top bar (${buttons.length}) ${st.scale.buttonPx} high, radius ${st.scale.radiusPx}`,
    buttons.length > 0 && !badButton.length, `scale.buttonPx ${st.scale.buttonPx}, radiusPx ${st.scale.radiusPx}`, badButton.length ? j(badButton) : 'all');
  const badLabel = sc.labels.filter((x) => x.fs !== px(st.scale.textPx - 1));
  check(size, `the card's text ${sc.skinText}, its labels ${[...new Set(sc.labels.map((x) => x.fs))].join(', ')}`,
    sc.skinText === px(st.scale.textPx) && !badLabel.length, `scale.textPx ${st.scale.textPx}, labels ${st.scale.textPx - 1} (her 12 against her 13)`, `${sc.skinText}; ${badLabel.length ? j(badLabel) : 'labels all'}`);
  check(size, 'no horizontal scroll: the page, the inspector column, the card, the embedded panel', sc.docOverflow === 0 && sc.inspectorOverflow === 0 && sc.cardOverflow === 0
    && fsc && fsc.docOverflow === 0 && fsc.inspectorOverflow === 0 && fsc.panelOverflow === 0,
  '0 px over at each', j({
    page: sc.docOverflow, column: sc.inspectorOverflow, card: sc.cardOverflow, fullPage: fsc && fsc.docOverflow, fullColumn: fsc && fsc.inspectorOverflow, panel: fsc && fsc.panelOverflow,
  }));
}

// === THE LEDGER: verify/t84/f01-skin.md ======================================
const n1 = (v) => `${Math.round(Number(v) * 10) / 10}`;
const boxText = (b) => (b && !b.error ? `${n1(b.x)}, ${n1(b.y)}, ${n1(b.w)} x ${n1(b.h)}` : (b && b.error ? `error: ${b.error}` : '(none)'));
const signed = (v) => { const r = Math.round(v * 10) / 10; return r > 0 ? `+${r}` : `${r}`; };
const dText = (o, h) => (o && h && !o.error && !h.error ? [o.x - h.x, o.y - h.y, o.w - h.w, o.h - h.h].map(signed).join(', ') : '');
const cell = (t) => ascii(t).replace(/\|/g, '/');
const PROP_NAMES = {
  fs: 'size', fw: 'weight', lh: 'line', ls: 'tracking', tt: 'case', ta: 'align', br: 'radius', pl: 'pad-l', pr: 'pad-r', pt: 'pad-t', gap: 'gap', color: 'ink', bg: 'ground', bc: 'border', h: 'h', w: 'w', ff: 'font',
};
const rgbHex = (v) => { const m = String(v).match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/); if (!m) return v; const hex = `#${[m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('')}`; return m[4] != null && m[4] !== '1' ? `${hex}/${Math.round(Number(m[4]) * 100)}%` : hex; };
const propText = (b, props) => (b && !b.error ? props.map((p) => `${PROP_NAMES[p] || p} ${['color', 'bg', 'bc'].includes(p) ? rgbHex(b[p]) : (p === 'h' || p === 'w' ? n1(b[p]) : b[p])}`).join('; ') : '(none)');
const propSame = (o, h, props) => o && h && !o.error && !h.error && props.every((p) => (p === 'h' || p === 'w' ? near(o[p], h[p]) : String(o[p]) === String(h[p])));

const tally = { '=': 0, DIFF: 0, 'OURS ONLY': 0, 'HERS ONLY': 0, UNEXPLAINED: 0, ABSENT: 0 };
const cited = new Set();
const cite = (text) => { for (const m of String(text).matchAll(/\bD(\d{1,2})\b/g)) if (DEV_IDS.has(`D${m[1]}`)) cited.add(`D${m[1]}`); };
function boxTable(lines, list, res, mode) {
  const ours = mode === 'quick' ? res.quick : res.full;
  const hers = mode === 'quick' ? res.hers : res.hersFull;
  const g = geometry(res);
  lines.push('| Box | Ours (x, y, w x h) | Hers (x, y, w x h) | d (x, y, w, h) | Verdict |', '| - | - | - | - | - |');
  for (const [id, what] of list) {
    const o = ours ? ours[id] : null;
    const h = hers ? hers[id] : null;
    const v = verdictOf(id, {
      o, h, mode, g, size: res.size, W: res.size.W, H: res.size.H, ours, hers, quickOurs: res.quick || {}, quickHers: res.hers || {},
    });
    tally[v.tag] = (tally[v.tag] || 0) + 1;
    if (v.text === 'UNEXPLAINED') tally.UNEXPLAINED += 1;
    cite(v.text);
    lines.push(`| ${cell(what)} | ${boxText(o)} | ${boxText(h)} | ${dText(o, h)} | ${cell(v.tag === '=' ? '=' : `${v.tag}${v.text ? `: ${v.text}` : ''}`)} |`);
  }
}
function typeTable(lines, list, ours, hers, res, mode) {
  const g = geometry(res);
  lines.push('| Element | Ours | Hers | Verdict |', '| - | - | - | - |');
  for (const [id, what, , , props] of list) {
    const o = ours ? ours[id] : null;
    const h = hers ? hers[id] : null;
    const same = propSame(o, h, props);
    const why = TYPE_WHY[id];
    const reason = same || !why ? null : why({
      o, h, g, size: res.size, mode,
    });
    const text = same ? '=' : (reason ? `DIFF: ${reason}` : 'UNEXPLAINED');
    tally[same ? '=' : (reason ? 'DIFF' : 'UNEXPLAINED')] += 1;
    cite(text);
    lines.push(`| ${cell(what)} | ${cell(propText(o, props))} | ${cell(propText(h, props))} | ${cell(text)} |`);
  }
}
function rowsTable(lines, ours, hers) {
  lines.push('| # | Ours: label, top, h, pitch; the value | Hers: label, top, h, pitch; the value |', '| - | - | - |');
  const fmt = (rows, i) => {
    const r = rows && rows[i];
    if (!r) return '(no row)';
    const pitch = rows[i + 1] ? n1(rows[i + 1].y - r.y) : '-';
    const fld = r.field ? `${r.field.tag}${r.field.cls ? `.${r.field.cls}` : ''} ${n1(r.field.w)} x ${n1(r.field.h)}, text ${r.field.fs}, radius ${r.field.br}` : 'no value';
    const btn = r.buttons && r.buttons.length ? `; buttons ${r.buttons.map((b) => `${b.text || '(icon)'} ${n1(b.h)} high`).join(', ')}` : '';
    return `${r.label}, ${n1(r.y)}, ${n1(r.h)}, ${pitch}; ${fld}${btn}`;
  };
  const n = Math.max((ours || []).length, (hers || []).length);
  for (let i = 0; i < n; i += 1) lines.push(`| ${i + 1} | ${cell(fmt(ours, i))} | ${cell(fmt(hers, i))} |`);
}
// The ruler's rows: what each scan crosses, and the deviations a mismatch can
// only be (the boxes above say which, in px).
const RULER_WHY = [
  { what: 'the bars, the card\'s head and foot, the status bar', quick: () => [], full: () => ['D20'] },
  { what: 'PRO\'s left border, the rule, the bordered buttons', quick: (g) => ['D4', 'D7', 'D8', ...(g.wide ? ['D3'] : [])], full: (g) => ['D4', 'D7', 'D8', ...(g.wide ? ['D3'] : [])] },
  { what: 'the scope\'s left border', quick: () => ['D10'], full: () => ['D10'] },
  { what: 'the rail\'s and the inspector\'s borders', quick: (g) => (g.sR ? ['D1', 'D2'] : []), full: (g) => (g.sR ? ['D1'] : []) },
];
function rulerTable(lines, res) {
  const r = res.ruler || {};
  const W = res.size.W;
  lines.push('| Scan | Ours, quick | Hers, quick | Ours, full | Hers, full | Verdict |', '| - | - | - | - | - | - |');
  const g = geometry(res);
  const verdict = (i, a, b, c, d) => {
    const q = a === b ? 'quick =' : `quick: ${RULER_WHY[i].quick(g).join(', ') || 'UNEXPLAINED'}`;
    const f = c === d ? 'full =' : `full: ${RULER_WHY[i].full(g).join(', ') || 'UNEXPLAINED'}`;
    cite(`${q} ${f}`);
    return `${q}; ${f}`;
  };
  const rowsOf = (k) => (r[k] ? runsText(r[k].rows) : '(no frame)');
  const down = ['ours', 'hers', 'oursFull', 'hersFull'].map(rowsOf);
  lines.push(`| down the right edge, x ${W - 6} (each hairline's y): ${RULER_WHY[0].what} | ${down.join(' | ')} | ${verdict(0, ...down)} |`);
  const scanYs = r.ours ? r.ours.cols.map(([y]) => y) : [];
  for (const [i, y] of scanYs.entries()) {
    const c = (k) => (r[k] && r[k].cols[i] ? runsText(r[k].cols[i][1]) : '(no frame)');
    const row = ['ours', 'hers', 'oursFull', 'hersFull'].map(c);
    const where = ['the top bar', 'the context strip', 'the workspace'][i];
    lines.push(`| across ${where}, y ${y}${i === 2 ? ' (x 0 to 140 and the last 420)' : ''}: ${RULER_WHY[i + 1].what} | ${row.join(' | ')} | ${verdict(i + 1, ...row)} |`);
  }
}

const lines = [];
const first = results.find((r) => r.studio) || {};
lines.push(
  '# T84 F1 . THE SKIN, FRAMED: the Studio beside the designer\'s Stage-1 at 1280 x 800, 1440 x 900 and 1920 x 1080',
  '',
  `Written by \`scripts/t84-skin-frames.mjs\` ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC (CLAUDE.md T84 PART A, F1: "the report names every deviation in px").`,
  '',
  `- OURS: the built app at ${BASE} (build stamp \`${ascii(first.stamp || '?')}\`), the repo at HEAD \`${head}\` (studio.css last changed in \`${ascii(cssAt)}\`); the PRO editor on the Studio face as the profile ships it (\`ui.studio.enabled\` true, no switch). The stage: the T81 kitchen, the ${T81.calls.length} calls \`scripts/t81-kitchen.mjs\` \`t81Kitchen()\` makes, recorded in node and replayed through the page's own store: ${ascii(first.stage || '(not staged)')} on wall A. The gesture: the BUD 800 (unit 02) selected by a real click on one of its pieces; then Full settings, Pin and the embedded panel's Carcass head, each a real click at its centre.`,
  '- HERS: `verify/t84/astra/Cabinet-Core-PRO-Studio-Stage-1.html` (file://) in the same Chromium at the same viewport, her own fixtures `?type=base` and `?type=base&inspector=full&pin=1`.',
  '- TYPE: both pages ask for `system-ui` (hers in her style sheet, ours through tailwind.config.js `fontFamily.sans`); in this container it is Inter (`fc-match system-ui`), so a word is the same width on both sides.',
  '- Every number is CSS px off getBoundingClientRect, to 0.1; `d` is ours less hers; `=` means within 0.5 px on x, y, w and h; a type row is `=` when every property shown is the same.',
  '- A difference carries its reason (`DIFF: ...`, the deviations at the end, `D1` ... `Dn`); one with no reason would read UNEXPLAINED. THE NUMBERS win wherever Stage-1 differs from them.',
  '',
  '## THE NUMBERS, read off the running page (`profile.ui.studio`)',
  '',
  '| Number | Value |',
  '| - | - |',
);
if (first.studio) {
  const st = first.studio;
  lines.push(
    `| scale | text ${st.scale.textPx}, field ${st.scale.fieldPx}, button ${st.scale.buttonPx}, radius ${st.scale.radiusPx} |`,
    `| bars | top ${st.bars.topPx}, context ${st.bars.contextPx}, status ${st.bars.statusPx} |`,
    `| rail | ${st.rail.widePx} with labels from ${st.rail.labelsFromPx}, ${st.rail.narrowPx} icons only below |`,
    `| inspector | quick ${st.inspector.quickPx} (${st.inspector.quickNarrowPx} below ${st.inspector.quickNarrowBelowPx}), full ${st.inspector.fullPx} (${st.inspector.fullNarrowPx} below ${st.inspector.fullNarrowBelowPx}) |`,
    `| issues | warn ${st.issues.warn}, danger ${st.issues.danger}, text ${st.issues.textPx} |`,
  );
  for (const res of results.filter((r) => r.widths)) {
    lines.push(`| at ${res.size.W} x ${res.size.H} (studioWidths) | rail ${res.widths.railPx}${res.widths.railLabels ? ' with labels' : ' icons only'}, quick ${res.widths.quickPx}, full ${res.widths.fullPx} |`);
  }
}
lines.push('', '## The frames', '', '| Size | Ours, the quick card | Hers, `?type=base` | Ours, full and pinned | Hers, `?type=base&inspector=full&pin=1` |', '| - | - | - | - | - |');
for (const res of results) {
  const W = res.size.W;
  const has = (f) => (frames.includes(f) ? `\`${f}\`` : `(missing: ${f})`);
  lines.push(`| ${W} x ${res.size.H} | ${has(`f01-skin-${W}.png`)} | ${has(`f01-astra-${W}.png`)} | ${has(`f01-skin-${W}-full.png`)} | ${has(`f01-astra-${W}-full.png`)} |`);
}
lines.push('', '## The checks: the skin holds THE NUMBERS at every size', '', '```');
for (const s of steps) lines.push(`${s.kind.padEnd(5)} [${s.size}] ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`);
lines.push('```');

for (const res of results) {
  const { size } = res;
  const W = size.W;
  lines.push('', `## ${W} x ${size.H}`, '');
  if (res.widths) lines.push(`THE NUMBERS at this width: rail ${res.widths.railPx}${res.widths.railLabels ? ' with labels' : ', icons only'}, quick card ${res.widths.quickPx}, full panel ${res.widths.fullPx}. Her file at this width: rail ${res.hers && res.hers.rail ? n1(res.hers.rail.w) : '?'}, quick card ${res.hers && res.hers.inspector ? n1(res.hers.inspector.w) : '?'}, full panel ${res.hersFull && res.hersFull.inspector ? n1(res.hersFull.inspector.w) : '?'} (her media queries: 360 at 1500 and below, 96 / 316 at 1150 and below).`);
  if (res.card) lines.push('', `Ours shows unit ${ascii(res.card.num || '?')} (card \`${res.card.type}\`), selected by a real click on its piece \`${ascii(res.picked && res.picked.piece)}\`${res.picked && res.picked.at ? ` at (${res.picked.at.x}, ${res.picked.at.y})` : ''}; part selected: ${res.card.element ? ascii(j(res.card.element)) : 'none'}.`);
  lines.push('', '### Boxes, the quick card', '');
  boxTable(lines, QUICK_BOXES, res, 'quick');
  lines.push('', '### The card\'s rows (the field heights, the row pitch)', '');
  rowsTable(lines, res.quickRows, res.hersRows);
  lines.push('', '### Type and radius, the quick card', '');
  typeTable(lines, TYPE_QUICK, res.quickType, res.hersType, res, 'quick');
  lines.push('', '### Boxes, full settings and pinned', '');
  boxTable(lines, FULL_BOXES, res, 'full');
  lines.push('', '### Type and radius, full settings', '');
  typeTable(lines, TYPE_FULL, res.fullType, res.hersFullType, res, 'full');
  lines.push('', '### The pixel ruler (where a shell-600 hairline is drawn, read off the four frames)', '');
  rulerTable(lines, res);
  if (res.findings && res.findings.length) {
    lines.push('', `The scene's findings on this stage (the engine's \`runChecks\`, red and yellow, as the marker and the counters show them): ${res.findings.map((x) => `${x.level} #${x.check} on ${x.unit || 'the job'}: "${ascii(x.message)}"`).join('; ')}. Markers: ${res.markers.map((m) => `${m.text}${m.red ? ' red' : ' yellow'}`).join(', ') || 'none'}.`);
  }
  if (res.errors) lines.push('', `Console errors on our page: ${res.errors.length ? ascii(res.errors.slice(0, 3).join(' | ')) : 'none'}.`);
}

lines.push('', '## The chat\'s frames of her file (`verify/t84/astra/stage1-*.png`)', '');
lines.push('Each frame is the chat\'s screen, taller than the page it shows: her page is `100dvh` high and below it the frame is her body\'s ground (#1a1a1a). The viewport is read off the pixels: the last shell-600 hairline down the right edge is her status bar\'s top border, so the viewport ends a status bar below it; her status bar prints `innerWidth x innerHeight`, so its pixels against her file rendered here at that viewport confirm the reading. Her file is rendered here with the fixture the frame shows (the card\'s unit number: W02 wall, B07 base, V01 vanity) and the two are held pixel by pixel over the viewport (a pixel differs when a channel moves more than 24), region by region (her own boxes at that viewport), and by the ruler.', '');
lines.push('| Frame | Shows | Viewport off its pixels | Below it | Pixels that differ from her file here, by region | Ruler, the chat\'s frame | Ruler, her file here |', '| - | - | - | - | - | - | - |');
const REGION_NAMES = ['top bar', 'context', 'rail', 'scene', 'inspector', 'status bar'];
for (const c of chat) {
  if (c.missing) { lines.push(`| \`${c.file}\` | (missing) | | | | | |`); continue; }
  const pct = (100 * c.diff.n / c.diff.of).toFixed(2);
  const where = c.diff.per.map((n, i) => `${REGION_NAMES[i]} ${n}`).join(', ');
  const belowText = c.vh < c.Hframe ? `${c.Hframe - c.vh} rows, ${(100 * c.below.n / Math.max(1, c.below.of)).toFixed(1)} % #1a1a1a` : 'nothing (the frame is the viewport)';
  const rt = (r) => `down: ${runsText(r.rows)}; across y ${r.cols[2][0]}: ${runsText(r.cols[2][1])}`;
  lines.push(`| \`${c.file}\` | ${cell(c.what)}, \`?${c.query}\` | ${c.W} x ${c.vh} (frame ${c.W} x ${c.Hframe}; status hairline at ${c.lastHairline}) | ${belowText} | ${c.diff.n} of ${c.diff.of} (${pct} %): ${where} | ${cell(rt(c.rulerChat))} | ${cell(rt(c.rulerHere))} |`);
}

lines.push('', '## Every deviation, in px, and why', '');
lines.push('Each is named once; the tables above cite it with the px they measured at each size. NUMBERS: Stage-1 differs from THE NUMBERS and THE NUMBERS win (D1, D2). CLAUDE.md: the order of this turn asks for what her Stage-1 does not draw, or draws otherwise (D6, D7, D10, D12 to D15, D17, D19, D20). CONTENT: the real job against her sample\'s words (D5, D11, D16, D18). SKIN: the skin\'s own choice or the house\'s class kept (D3, D4, D8, D9); a patch is offered where the skin can take her value without touching a file it does not own (D4, D8, D9), measured on a build of it.', '');
for (const d of DEVIATIONS) {
  lines.push(`${d.id}. **${ascii(d.title)}** ${ascii(d.text)}${cited.has(d.id) ? '' : ' (Not met on this run.)'}`, '');
}
const pass = steps.filter((s) => s.kind === 'PASS').length;
const fail = steps.filter((s) => s.kind === 'FAIL').length;
const unexplained = lines.filter((l) => l.startsWith('|') && /UNEXPLAINED/.test(l)).length;
const secs = Math.round((Date.now() - T0) / 1000);
lines.push('', `SUMMARY: ${pass + fail} checks, ${pass} PASS, ${fail} FAIL; ${frames.length} frames; boxes and type rows: ${tally['=']} equal, ${tally.DIFF} differing with their reason, ${tally['OURS ONLY']} ours only, ${tally['HERS ONLY']} hers only; ${DEVIATIONS.length} deviations named, ${cited.size} met on this run; ${unexplained} table rows UNEXPLAINED; ${secs} s.`, '');
writeFileSync(`${OUT}f01-skin.md`, ascii(lines.join('\n')));
writeFileSync(join(SCRATCH, 'measure.json'), JSON.stringify({ results, chat }, null, 1));
say(`measurements: ${join(SCRATCH, 'measure.json')}`);
say(`\nSUMMARY: ${pass + fail} checks, ${pass} PASS, ${fail} FAIL; frames ${frames.join(', ')}; ${tally['=']} equal, ${tally.DIFF} differ with a reason, ${tally['OURS ONLY']} ours only, ${tally['HERS ONLY']} hers only; ${unexplained} table rows UNEXPLAINED; ledger ${OUT}f01-skin.md; ${secs} s`);
process.exit(fail ? 1 : 0);
