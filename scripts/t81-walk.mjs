/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F10, THE WALK OF THE DRAWINGS (CLAUDE.md T81 PART G)
//
// CLAUDE.md T81 F10: "PRO, real mouse: the T80 walk's kitchen, in-frame ON;
// Output > Drawings > Preview; every sheet pressed in order and shot
// full-sheet at 4 px per paper mm (verify/t81/f10-01-3d.png ...
// f10-09-cut-list.png), then the same kitchen in-frame OFF
// (f10-10-fronts-layon.png, f10-11-sections-layon.png), then the unit card of
// 01 (f10-12-card.png); the PDF exported and its page count read
// (f10-13-pdf.txt). Output verify/t81/walk.txt." The owner, 22.10.2026
// (22:57): *"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na cabinet core"*.
//
// THE GESTURES ARE REAL: the Settings menu and its FRONTS row (In-frame, then
// Lay-on), the Output menu's Drawings and Preview, the drawing window's kind
// tabs, every sheet button in its order and the Drawing set (PDF) button are
// the browser's own input pipe (CDP Input.dispatchMouseEvent), aimed at a
// control's centre. THE STAGE is the T80 walk's kitchen plus the project's
// knob (verify/t81/DECISIONS.md 4), put through the store's own actions as
// scripts/t81-kitchen.mjs puts it. Every sheet is READ OFF THE GLASS: the SVG
// the window shows (`.cc-drawing svg`), and its frame is that very string
// drawn at 4 px per paper millimetre in a second browser tab. The engine's
// own counts (the hinges the ladder hangs) are read from the same stage in
// node (scripts/t81-kitchen.mjs, engine/hardware3d.js); the drill summary's
// handles from the page's own store. A FAIL is written down, never patched.
//
//   npx vite build                       (dist/, from this tree)
//   npx vite preview --port 4173         (in the background)
//   node scripts/t81-walk.mjs            the walk, a new ledger
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t81-walk.mjs   another port
//
// Chromium: scripts/cdp.mjs finds /opt/pw-browsers (or CHROME_PATH); nothing
// is downloaded. Ledger: verify/t81/walk.txt. Frames: verify/t81/f10-*.png.
// Everything this file writes is plain ASCII (no em or en dash).

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { open, pro, showroomDown } from './t74-harness.mjs';
import {
  key, clickWith, boxOf, until,
} from './t75-harness.mjs';
import { launch } from './cdp.mjs';
import { t81Kitchen, setArgs } from './t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';

const REPO = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../verify/t81/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const PX_PER_MM = 4;
// The frames' page and the exported PDF are the walk's own scratch, never the ledger's.
const SCRATCH = mkdtempSync(join(tmpdir(), 't81-walk-'));
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

// === THE LEDGER =============================================================
const steps = [];
const frames = [];
const ascii = (t) => String(t)
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/[\u00b7]/g, '.')
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

// === THE FRAME: the glass's own SVG, drawn at 4 px per paper mm =============
let painter = null;
async function frameOf(svg, name) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const wMm = vb ? Number(vb[1]) : 420;
  const hMm = vb ? Number(vb[2]) : 297;
  const W = Math.round(wMm * PX_PER_MM);
  const H = Math.round(hMm * PX_PER_MM);
  if (!painter) painter = await launch({ width: W, height: H, port: 9600 + Math.floor(Math.random() * 300) });
  await painter.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const sized = svg.replace(/width="([\d.]+)mm" height="([\d.]+)mm"/, `width="${W}" height="${H}"`);
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff">${sized}</body></html>`;
  const file = join(SCRATCH, 'frame.html');
  writeFileSync(file, html);
  await painter.goto(`file://${file}`);
  await painter.sleep(300);
  await painter.screenshot(`${SHOTS}${name}`, { x: 0, y: 0, width: W, height: H, scale: 1 });
  frames.push(name);
  steps.push({ kind: 'FRAME', gesture: `${name} (${wMm} x ${hMm} mm at ${PX_PER_MM} px per mm: ${W} x ${H})` });
  process.stdout.write(`      frame ${name}\n`);
}

// === WHAT A SHEET SAYS, READ OFF ITS SVG ====================================
const num = (tag, attr) => Number((tag.match(new RegExp(`\\b${attr}="(-?[\\d.]+)"`)) || [])[1]);
// The sheet's own conventions (the legend's swatches, the key plan's band) wear a
// geometry ink by name (`data-cc`), and a census of the drawing leaves them out.
const tagsOn = (svg, kind, layer, { legend = false } = {}) => [...svg.matchAll(new RegExp(`<${kind}\\b[^>]*data-layer="${layer}"[^>]*>`, 'g'))]
  .map((m) => m[0]).filter((t) => legend || !/data-cc="(legend|key-plan)"/.test(t));
const anyOn = (svg, layer) => ['line', 'rect', 'path', 'circle', 'text'].reduce((n, k) => n + tagsOn(svg, k, layer).length, 0);
/** The leaves: the DOORS rects with no detail tag (the shaker field and the decorations carry one). */
const leavesOf = (svg) => tagsOn(svg, 'rect', 'DOORS').filter((t) => !/data-cc=/.test(t))
  .map((t) => ({ x: num(t, 'x'), y: num(t, 'y'), w: num(t, 'width'), h: num(t, 'height') }));
const linesOf = (svg, layer) => tagsOn(svg, 'line', layer).map((t) => ({ x1: num(t, 'x1'), y1: num(t, 'y1'), x2: num(t, 'x2'), y2: num(t, 'y2') }));
const unitNumbers = (svg) => [...svg.matchAll(/<text\b[^>]*data-layer="UNIT_NUMBER"(?![^>]*data-cc="legend")[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

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
/** The top bar: a menu, then its item (both real clicks). (scripts/t80-walk.mjs) */
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
/** Settings, Settings...: the FRONTS row's button pressed (a real click), the window shut. (scripts/t80-walk.mjs) */
async function frontsRow(page, option) {
  await menu(page, 'Settings', 'Settings');
  if (!(await page.has('[data-inframe-row="1"]'))) {
    const step = await boxOf(page, '[...document.querySelectorAll(\'[role="dialog"] button, [data-modal-shell] button\')].find((b) => b.offsetParent && /Fronts$/.test(b.textContent.trim()) && /^5\\.3/.test(b.textContent.trim()))');
    if (step) await clickWith(page, step.x, step.y);
    for (let i = 0; i < 5 && !(await page.has('[data-inframe-row="1"]')); i += 1) {
      const next = await boxOf(page, '[...document.querySelectorAll(\'[role="dialog"] button, [data-modal-shell] button\')].find((b) => b.offsetParent && /^Next/.test(b.textContent.trim()) && !/Hardware/.test(b.textContent))');
      if (!next) break;
      await clickWith(page, next.x, next.y);
      await page.sleep(500);
    }
  }
  await until(page, 'Boolean(document.querySelector(\'[data-inframe-row="1"]\'))', 6000);
  const row = await page.has('[data-inframe-row="1"]');
  if (row) await page.press(`[data-inframe-option="${option}"]`);
  await page.sleep(900);
  const after = await page.ask('[...document.querySelectorAll(\'[data-inframe-option]\')].filter((b) => b.getAttribute(\'aria-pressed\') === \'true\').map((b) => b.getAttribute(\'data-inframe-option\'))');
  await closeModals(page);
  return { row, after };
}
/** Output > Drawings > Preview..., then the window's Set tab (real clicks). */
async function openSet(page) {
  const opened = await menu(page, 'Output', 'Drawings');
  if (opened && await page.ask('[...document.querySelectorAll(\'[role="menuitem"]\')].some((b) => b.offsetParent && /Preview/.test(b.textContent))')) {
    await page.press('[role="menuitem"]', 'Preview');
  }
  await until(page, 'Boolean(document.querySelector(\'[data-drawing-kind-tab="walls"]\'))', 8000);
  await page.press('[data-drawing-kind-tab="walls"]');
  await until(page, 'document.querySelectorAll(\'[data-wall-sheet]\').length > 0', 15000);
  await page.sleep(1500);
  return page.ask('[...document.querySelectorAll(\'[data-wall-sheet]\')].map((b) => b.getAttribute(\'data-wall-sheet\'))');
}
/** One sheet's button pressed (a real click); the SVG the window then shows. */
async function sheetOnGlass(page, name) {
  await page.press(`[data-wall-sheet=${j(name)}]`);
  await page.sleep(1200);
  await until(page, `(() => { const b = document.querySelector('[data-wall-sheet=${j(name).replace(/'/g, "\\'")}]'); return Boolean(document.querySelector('.cc-drawing svg')); })()`, 8000);
  return page.ask('(document.querySelector(\'.cc-drawing svg\') || { outerHTML: \'\' }).outerHTML');
}

// === THE ENGINE'S OWN COUNTS, FROM THE SAME STAGE (node) ====================
function engineCounts(inframe) {
  const P = getCabinetProfile();
  t81Kitchen({ inframe });
  const a = setArgs();
  let hinges = 0; let leaves = 0; let knobs = 0;
  for (const e of a.entries.filter((x) => Number(x.unit.position?.wall ?? 0) === 0)) {
    const fronts = e.result.panels.filter((p) => p.box && (p.part === 'FRONT' || p.part === 'DRAWER-FRONT'));
    leaves += fronts.length;
    const doors = new Set(fronts.filter((p) => p.part === 'FRONT' && !p.meta?.swingZ && !p.meta?.faceX).map((p) => p.id));
    hinges += hardwareInstances(e.result, P).hinges.filter((h) => doors.has(h.panelId)).length;
    for (const h of e.result.drillSummary?.handles || []) knobs += (h.holes || [[h.x, h.y]]).length;
  }
  return { hinges, leaves, knobs };
}

const OWNER_ORDER = [
  '3D', 'Wall A · Fronts', 'Wall A · Without fronts', 'Wall A · X-ray',
  'Plan · base units', 'Plan · wall units', 'Wall A · Sections A-A', 'Visualisation', 'Cut list and materials',
];
const FILES = ['f10-01-3d.png', 'f10-02-fronts.png', 'f10-03-no-fronts.png', 'f10-04-xray.png', 'f10-05-plan-base.png',
  'f10-06-plan-wall.png', 'f10-07-sections.png', 'f10-08-visualisation.png', 'f10-09-cut-list.png'];

// === THE WALK ===============================================================
const page = await open({ width: 1440, height: 900 });
try {
  await pro(page, { base: BASE });
  note('the build under the mouse', `the repo's HEAD ${head}; url ${BASE}`);

  // --- THE STAGE (scripts/t81-kitchen.mjs, through the store's own actions) ---
  const add = async (type, x) => page.ask(`(() => { const r = ${S}.addUnit(${j(type)}, { wall: 0, x: ${x} }); return r && r.id; })()`);
  const ids = { a: await add('BUD', 1000), b: await add('BUD', 1600), c: await add('BUDR2', 2400), w: await add('WUD', 1000) };
  await page.sleep(800);
  for (const [id, width] of [[ids.a, 600], [ids.b, 800], [ids.c, 500], [ids.w, 600]]) await page.ask(`${S}.updateUnitParams(${j(id)}, { width: ${width} })`);
  await page.ask(`${S}.setDoors(${j(ids.a)}, { count: 1, hinge: 'L' })`);
  await page.ask(`${S}.setDoors(${j(ids.b)}, { count: 2, hinge: 'L' })`);
  await page.ask(`${S}.setDoors(${j(ids.w)}, { count: 1, hinge: 'L' })`);
  await page.ask(`${S}.addEndPanel(${j(ids.a)}, { side: 'L', thickness: 18 })`);
  await page.ask(`${S}.addPlinth(${j(ids.a)})`);
  await page.ask(`${S}.addWorktop(${j([ids.a, ids.b, ids.c])})`);
  await page.ask(`${S}.setFrontType('f1', { source: 'spray', material_id: 'generic-22' })`);
  await page.ask(`${S}.setFrontColour({ hex: '#7b8f7a', name: 'F&B Card Room Green', system: 'F&B' }, 'f1')`);
  await page.ask(`${S}.setDesign({ sheen: 30 })`);
  await page.ask(`${S}.setProjectHandle({ type: 'knob' })`);
  await page.sleep(1200);
  const units = await page.ask(`${S}.units.map((u) => [u.type, u.params.unit_num, u.position.x_mm, u.params.width])`);
  note('THE STAGE (the T80 walk\'s kitchen and the project\'s knob, through the store)', j(units));

  // --- SETTINGS, FRONTS: IN-FRAME (a real click) ----------------------------
  const on = await frontsRow(page, 'inframe');
  await until(page, `${S}.project.design.inframe === true`, 4000);
  check('Settings > Settings...: FRONTS, In-frame pressed (a real click)', on.row && j(on.after) === j(['inframe']), 'In-frame lit', j(on.after));

  // --- OUTPUT > DRAWINGS > PREVIEW, THE SET, EVERY SHEET IN ORDER ------------
  const E = engineCounts(true);
  note('the engine\'s own counts for wall A (node, the same stage): leaves, hinges the ladder hangs on doors, knob holes', j(E));
  const knobsOnPage = await page.ask(`${S}.allResults().filter((e) => Number(e.unit.position.wall || 0) === 0).reduce((n, e) => n + (e.result.drillSummary?.handles || []).reduce((k, h) => k + ((h.holes && h.holes.length) || 1), 0), 0)`);
  note('the drill summary\'s handles on the page', String(knobsOnPage));
  const names = await openSet(page);
  check('the sheet buttons, in the owner\'s order (*"najpierw 3d ... a na koncu wizualizacja"*)', j(names) === j(OWNER_ORDER), j(OWNER_ORDER), j(names));
  const svgs = {};
  for (let i = 0; i < names.length; i += 1) {
    const svg = await sheetOnGlass(page, names[i]);
    svgs[names[i]] = svg;
    check(`sheet ${String(i + 1).padStart(2, '0')} pressed: ${names[i]}`, svg.length > 1000 && /data-cc-drawing=/.test(svg), 'its SVG on the glass', `${svg.length} chars`);
    await frameOf(svg, FILES[i] || `f10-${String(i + 1).padStart(2, '0')}-sheet.png`);
  }
  const at = (name) => svgs[name] || '';

  // The fronts sheet.
  const fronts = at('Wall A · Fronts');
  const leaves = leavesOf(fronts);
  check('fronts: one door rectangle per leaf', leaves.length === E.leaves, `${E.leaves} leaves`, `${leaves.length} rects`);
  const carcass = linesOf(fronts, 'CARCASE');
  const inside = leaves.filter((r) => carcass.some((l) => Math.min(l.x1, l.x2) > r.x + 0.05 && Math.max(l.x1, l.x2) < r.x + r.w - 0.05
    && Math.min(l.y1, l.y2) > r.y + 0.05 && Math.max(l.y1, l.y2) < r.y + r.h - 0.05));
  check('fronts: no carcass line inside any leaf (*"bez przebijania carcasow"*)', inside.length === 0, 'none', `${inside.length} leaves with a carcass line inside`);
  const bars = tagsOn(fronts, 'rect', 'HINGE_MARK');
  check('fronts: the hinge bars, one per hinge the engine hangs', bars.length === E.hinges, `${E.hinges}`, `${bars.length}`);
  const knobs = tagsOn(fronts, 'circle', 'HANDLES');
  check('fronts: the knob circles, one per drilled handle', knobs.length === knobsOnPage && knobs.length === E.knobs, `${knobsOnPage}`, `${knobs.length}`);
  check('fronts: the frame under in-frame', anyOn(fronts, 'FRAME_BOARD') > 0, 'FRAME_BOARD on the sheet', `${anyOn(fronts, 'FRAME_BOARD')} entities`);
  // Without fronts.
  const bare = at('Wall A · Without fronts');
  check('without fronts: no DOORS entity', anyOn(bare, 'DOORS') === 0, '0', `${anyOn(bare, 'DOORS')}`);
  check('without fronts: the drawer boxes', anyOn(bare, 'SHELVES') > 0, 'SHELVES on the sheet', `${anyOn(bare, 'SHELVES')}`);
  // X-ray.
  const xray = at('Wall A · X-ray');
  check('X-ray: XRAY_FRONT and XRAY_CARCASE, and no painter\'s white', anyOn(xray, 'XRAY_FRONT') > 0 && anyOn(xray, 'XRAY_CARCASE') > 0 && anyOn(xray, 'MASK') === 0,
    'both greys, no MASK', j({ front: anyOn(xray, 'XRAY_FRONT'), carcass: anyOn(xray, 'XRAY_CARCASE'), mask: anyOn(xray, 'MASK') }));
  // The base plan.
  const planBase = at('Plan · base units');
  const dashed = tagsOn(planBase, 'line', 'SHELVES').filter((t) => /stroke-dasharray/.test(t));
  check('base plan: the plinth a dashed line, never solid', dashed.length >= 4, 'its dashed edges', `${dashed.length} dashed SHELVES lines`);
  check('base plan: the knife\'s bars', /stroke-width="0\.7"/.test(planBase), 'cut bars at 0.7', String(/stroke-width="0\.7"/.test(planBase)));
  // The sections.
  const sections = names.find((n) => /Sections/.test(n));
  check('sections: the runners beyond the cut', anyOn(at(sections), 'RUNNERS') > 0, 'RUNNERS on the sheet', `${anyOn(at(sections), 'RUNNERS')}`);
  check('sections: the timber filler of T80', /site filler 19 \(timber\)/.test(at(sections)), 'site filler 19 (timber)', String(/site filler 19 \(timber\)/.test(at(sections))));
  // The unit numbers.
  for (const n of ['3D', 'Wall A · Fronts', 'Wall A · Without fronts', 'Wall A · X-ray', 'Plan · base units', 'Plan · wall units', sections]) {
    const nums = [...new Set(unitNumbers(at(n)))].sort();
    check(`unit numbers on ${n}`, nums.length > 0, 'the units it shows numbered', j(nums));
  }
  // Layers: one group per layer.
  const groups = [...fronts.matchAll(/<g data-layer="([A-Z_]+)">/g)].map((m) => m[1]);
  check('the SVG is one group per layer (*"kazdy kolor zrob inny layer"*)', groups.length > 5 && new Set(groups).size === groups.length, 'one <g> per layer', j(groups));

  // --- THE PDF: Drawing set (PDF), a real click; its pages counted ------------
  await page.ask(`(() => { if (!window.__t81Blobs) { window.__t81Blobs = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { window.__t81Blobs.push(b); return o(b); }; } return true; })()`);
  await page.press('[data-wall-drawings-pdf="1"]');
  await until(page, 'window.__t81Blobs.some((b) => b.type === \'application/pdf\' || b.size > 50000)', 60000);
  const pdf64 = await page.ask(`(async () => { const b = window.__t81Blobs.filter((x) => x.type === 'application/pdf' || x.size > 50000).pop(); if (!b) return null;
    const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 1) s += String.fromCharCode(u[i]); return btoa(s); })()`);
  let pdfReport = 'no PDF';
  if (pdf64) {
    const file = join(SCRATCH, 'walk-set.pdf');
    writeFileSync(file, Buffer.from(pdf64, 'base64'));
    let info = '';
    try { info = execFileSync('pdfinfo', [file]).toString(); } catch (e) { info = `pdfinfo: ${e.message}`; }
    const pages = Number((info.match(/^Pages:\s+(\d+)/m) || [])[1]);
    const layers = (Buffer.from(pdf64, 'base64').toString('latin1').match(/\/Type \/OCG \/Name \(([A-Z_]+)\)/g) || []).map((s) => s.replace(/.*\(([A-Z_]+)\)/, '$1'));
    pdfReport = [
      'T81 F10 · the set\'s PDF, exported by a real click on the window\'s "Drawing set (PDF)" button and read back',
      `bytes: ${Buffer.from(pdf64, 'base64').length}`,
      `pages: ${pages} (the sheet buttons: ${names.length})`,
      `layers (optional content groups): ${layers.join(', ')}`,
      '',
      'pdfinfo:',
      info.trim(),
      '',
    ].join('\n');
    check('the PDF: one page per sheet', pages === names.length, `${names.length}`, `${pages}`);
    check('the PDF: the layers a reader can switch', layers.length > 5, 'an OCG per ink', j(layers));
  } else check('the PDF exported', false, 'the file', 'no blob');
  writeFileSync(`${SHOTS}f10-13-pdf.txt`, ascii(pdfReport));
  frames.push('f10-13-pdf.txt');

  // --- THE UNIT CARD OF 01 (the window's Card tab, a real click) -------------
  await page.press('[data-drawing-kind-tab="unit-card"]');
  await page.sleep(1500);
  const card = await page.ask('(document.querySelector(\'.cc-drawing svg\') || { outerHTML: \'\' }).outerHTML');
  check('the card of 01: the Fronts row says the colour once', /F&amp;B Card Room Green spray/.test(card) && !/F&amp;B F&amp;B/.test(card), 'F&B Card Room Green spray', (card.match(/F&amp;B[^<]*/) || ['none'])[0]);
  check('the card of 01: the frame clipped, the hinge bars, the knob', anyOn(card, 'FRAME_BOARD') > 0 && tagsOn(card, 'rect', 'HINGE_MARK').length > 0 && tagsOn(card, 'circle', 'HANDLES').length > 0,
    'FRAME_BOARD, HINGE_MARK, a knob', j({ frame: anyOn(card, 'FRAME_BOARD'), bars: tagsOn(card, 'rect', 'HINGE_MARK').length, knobs: tagsOn(card, 'circle', 'HANDLES').length }));
  await frameOf(card, 'f10-12-card.png');
  await closeModals(page);

  // --- THE SAME KITCHEN, LAY-ON (a real click) -------------------------------
  const off = await frontsRow(page, 'layon');
  await until(page, `${S}.project.design.inframe !== true`, 4000);
  check('Settings: Lay-on pressed (a real click)', j(off.after) === j(['layon']), 'Lay-on lit', j(off.after));
  const E2 = engineCounts(false);
  const names2 = await openSet(page);
  const fronts2 = await sheetOnGlass(page, names2.find((n) => /Fronts$/.test(n)));
  check('lay-on fronts: no frame', anyOn(fronts2, 'FRAME_BOARD') === 0, '0 FRAME_BOARD', `${anyOn(fronts2, 'FRAME_BOARD')}`);
  check('lay-on fronts: one door rectangle per leaf', leavesOf(fronts2).length === E2.leaves, `${E2.leaves}`, `${leavesOf(fronts2).length}`);
  check('lay-on fronts: the hinge bars', tagsOn(fronts2, 'rect', 'HINGE_MARK').length === E2.hinges, `${E2.hinges}`, `${tagsOn(fronts2, 'rect', 'HINGE_MARK').length}`);
  await frameOf(fronts2, 'f10-10-fronts-layon.png');
  const sections2 = await sheetOnGlass(page, names2.find((n) => /Sections/.test(n)));
  check('lay-on sections: no frame, no timber', anyOn(sections2, 'FRAME_BOARD') === 0 && !/site filler/.test(sections2), 'neither', j({ frame: anyOn(sections2, 'FRAME_BOARD'), timber: /site filler/.test(sections2) }));
  await frameOf(sections2, 'f10-11-sections-layon.png');
  await closeModals(page);
} catch (e) {
  check('the walk to its end', false, 'no exception', String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
  await page.screenshot(`${SHOTS}f10-walk-failure.png`).catch(() => {});
}
const errs = pageErrors(page);
note('console errors on the page', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
await page.close();
if (painter) await painter.close();
await showroomDown();

const pass = steps.filter((s) => s.kind === 'PASS').length;
const fail = steps.filter((s) => s.kind === 'FAIL').length;
writeFileSync(`${SHOTS}walk.txt`, ascii([
  'T81 WALK: THE DRAWINGS ARE THE MODEL (scripts/t81-walk.mjs)',
  `walked ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, HEAD ${head}, ${BASE}`,
  'Every line: PASS or FAIL (the gesture, what was expected, what was read), NOTE (a reading), FRAME (the file beside this one).',
  'The gestures are real clicks; every sheet is read off the glass and framed from that very SVG at 4 px per paper mm.',
  '',
  ...steps.map((s) => {
    if (s.kind === 'FRAME') return `FRAME  ${s.gesture}`;
    if (s.kind === 'NOTE') return `NOTE   ${s.gesture} | ${s.got}`;
    return `${s.kind}   ${s.gesture} | expect: ${s.expect} | observed: ${s.got}`;
  }),
  '',
  `FRAMES (${frames.length}): ${frames.join(', ')}`,
  `T81: ${pass + fail} steps, ${pass} pass, ${fail} fail`,
  '',
].join('\n')));
process.stdout.write(`\nT81: ${pass + fail} steps, ${pass} pass, ${fail} fail; frames ${frames.join(', ')}\n`);
process.exit(fail ? 1 : 0);
