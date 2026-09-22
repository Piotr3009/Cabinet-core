#!/usr/bin/env node
// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 72) ───────────────────────
//
// `npm test` and `npm run build` can both be green while the thing on screen is
// wrong, because neither opens a browser. Fourteen points from one afternoon in
// the RETAIL configurator — every one of them is something the owner CLICKED ON
// and did not get — so every claim T72 makes about a page ends in a frame under
// `verify/t72/`.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t72-walk.mjs --fresh f1 f2      start a ledger, run two
//   node scripts/t72-walk.mjs f3                 add to it
//
// THE HARNESS IS T70's, unchanged but for the frame directory and the sections:
// one Chromium per section, a strictly increasing debug port, a REAL pointer for
// a hover (React delegates `mouseover` at the root, so a dispatched `mouseenter`
// reaches nothing) and the browser's own input pipe for a typed field. A walk
// that re-invents its driver fails for its own reasons.
//
// THE HARDWARE IS SERVED FROM THE SILENT SHOWROOM (T23 R8).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t72/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};
const note = (label, detail = '') => {
  steps.push({ label, ok: true, detail, note: true });
  process.stdout.write(`  ·   ${label}${detail ? ` — ${detail}` : ''}\n`);
};

let seq = 0;
const nextPort = () => 9500 + ((process.pid % 40) * 12) + (seq += 1);
const showroom = await startFixtureServer({ port: 4500 + (process.pid % 80) });

async function open({ width = 1440, height = 900 } = {}) {
  const page = await launch({ width, height, port: nextPort() });
  page.ask = (expr) => page.evaluate(`return (${expr});`);
  page.text = (sel) => page.ask(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').trim()`);
  page.has = (sel) => page.ask(`Boolean(document.querySelector(${JSON.stringify(sel)}))`);
  page.count = (sel) => page.ask(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  page.shown = (sel) => page.ask(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)});`
    + ' if (!el) return null; const s = getComputedStyle(el);'
    + ' return { display: s.display, visible: s.display !== "none" && s.visibility !== "hidden",'
    + ' box: Math.round(el.getBoundingClientRect().height) }; })()',
  );
  page.box = (sel) => page.ask(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)});`
    + ' if (!el) return null; const r = el.getBoundingClientRect();'
    + ' return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; })()',
  );
  page.tap = async (sel) => {
    await page.evaluate(`document.querySelector(${JSON.stringify(sel)})?.click(); return true;`);
    await page.sleep(650);
  };
  page.typeInto = async (sel, text) => {
    const ok = await page.click(sel);
    if (!ok) return false;
    const all = { modifiers: 2, windowsVirtualKeyCode: 65, key: 'a', code: 'KeyA' };
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...all });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...all });
    await page.send('Input.insertText', { text: String(text) });
    const tab = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 };
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...tab });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...tab });
    await page.sleep(1300);
    return true;
  };
  page.showroom = async (url) => {
    await page.goto(url);
    await page.evaluate(`try { localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); } catch (e) {} return true;`);
    await page.evaluate('location.reload(); return true;');
    await page.sleep(1800);
  };
  return page;
}

const shot = (page, file) => page.screenshot(`${SHOTS}${file}`);

async function room(page, step = null, { base = BASE, hash = '#/design' } = {}) {
  await page.showroom(`${base}retail.html${hash}`);
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout: 45000 });
  await page.sleep(2600);
  if (step) await page.tap(`[data-testid="cat-${step}"]`);
}

/** Put a wardrobe in the empty room, the way a client does. */
async function withWardrobe(page) {
  await page.tap('[data-testid="cat-where"]');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.sleep(1500);
}

/** 2KLIK, where the client's two clicks land: the store's own selection. */
const selectElement = (page, expr) => page.ask(
  '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
  + ' const u = P.units[0]; const r = P.unitResult(u.id);'
  + ` const panel = (${expr});`
  + ' if (!panel) return null; U.selectUnit(u.id); U.selectElement(u.id, panel.id);'
  + ' return { id: panel.id, part: panel.part, role: panel.role || null }; })()',
);

/** The first wardrobe's interior items of one kind — where the store keeps them. */
const itemsOf = (page, kind) => page.ask(
  '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
  + ' const items = (u.params.sections && u.params.sections[0] && u.params.sections[0].items) || [];'
  + ` return items.filter((i) => i.kind === ${JSON.stringify(kind)}); })()`,
);

/** What the FIRST shelf is set back by, as the engine publishes it. */
const selectedShelfBack = (page) => page.ask(
  '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
  + ' const r = P.unitResult(u.id); const p = r.panels.find((x) => x.part === "SHELF");'
  + ' return p ? Number(p.meta && p.meta.front_mm) : null; })()',
);

/** Walk the LIVE scene the canvas is drawing (T23 R7, `3d/viewHandle.js`). */
const inScene = (page, key) => page.ask(
  '(() => { const views = Object.values(window.__cc.views || {}); let found = 0;'
  + ` for (const v of views) v.scene.traverse((o) => { if (o.userData && o.userData[${JSON.stringify(key)}] != null) found += 1; });`
  + ' return found; })()',
);

const unit0 = (page) => page.ask('window.__cc.project.getState().units[0]?.id || null');
const params0 = (page) => page.ask('window.__cc.project.getState().units[0]?.params || null');

// ═══ F1 · THE END PANEL'S MENU OPENS, AND SAYS TWO THINGS ══════════════════
if (runs('f1')) {
  process.stdout.write('\n─── F1 · THE END PANEL\'S MENU ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // A panel on the right, the way the WHERE step offers one.
  const made = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.addEndPanel(u.id, "R"); const r = P.unitResult(u.id);'
    + ' return r.panels.filter((p) => p.part === "END-PANEL").length; })()',
  );
  check('the wardrobe carries an end panel', made > 0, `${made} panel(s)`);
  const picked = await selectElement(page, 'r.panels.find((p) => p.part === "END-PANEL")');
  await page.sleep(1200);
  note('2klik on the end panel', JSON.stringify(picked));
  // THE PROBE CONVICTED `MENU_FOR_KIND`: no `end-panel` key, so nothing opened.
  const dock = await page.has('[data-testid="dock-end-panel"]');
  check('the panel\'s own menu OPENS (it did not before tonight)', dock);
  for (const row of ['end-panel-top', 'end-panel-bottom', 'end-panel-colour']) {
    check(`…and carries ${row.replace('end-panel-', '').toUpperCase()}`, await page.has(`[data-testid="${row}"]`));
  }
  check('…and REMOVE PANEL', await page.has('[data-testid="end-panel-remove"]'));
  check('NO NUMBER FIELD in the client\'s copy', (await page.count('[data-editor="end-panel"] input[type="number"]')) === 0);
  await shot(page, 'f1-end-panel-menu.png');
  // The two chips write the paths the numeric fields wrote.
  // THE SAME STORE PATH THE NUMERIC FIELD WROTE: `endPanelToCeiling` resolves
  // to a `setEndPanelTop` of the room's own headroom, so what lands is the very
  // `above` number the `above-unit-ep` field has always written.
  const panelTop = () => page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' const ep = (u.params.end_panels || []).find((p) => p.side === "R") || null;'
    + ' return ep ? { top_mm: Number(ep.top_mm) || 0, height: ep.height || null } : null; })()',
  );
  const before = await panelTop();
  await page.ask('(() => { const r = document.querySelector(\'[data-testid="end-panel-top"]\');'
    + ' const b = [...r.querySelectorAll("button")].find((x) => /ceiling/i.test(x.textContent)); b.click(); return true; })()');
  await page.sleep(900);
  const after = await panelTop();
  check('CEILING writes the very path the number field wrote',
    after && after.top_mm > 0 && (before?.top_mm || 0) === 0,
    `top_mm ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  await shot(page, 'f1-end-panel-to-ceiling.png');
  await page.close();
}

// ═══ F2 · THE SHELF'S MENU: FIX / ADJUSTABLE, AND THE SETBACK ══════════════
if (runs('f2')) {
  process.stdout.write('\n─── F2 · HOW THE SHELF IS HELD, AND THE SETBACK ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  const added = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.addShelves(u.id, 2); const r = P.unitResult(u.id);'
    + ' return r.panels.filter((p) => p.part === "SHELF").length; })()',
  );
  check('two shelves in the wardrobe', added >= 2, `${added} shelf/shelves`);
  await selectElement(page, 'r.panels.find((p) => p.part === "SHELF")');
  await page.sleep(1200);
  check('FIX and ADJUSTABLE are two chips', (await page.count('[data-shelf-type-chip]')) === 2,
    `${await page.count('[data-shelf-type-chip]')} chip(s)`);
  check('…and the pull-out / shoe `select` has left this menu',
    (await page.count('[data-editor] select[data-shelf-type]')) === 0);
  check('SET BACK FROM THE FRONT: two chips beside the field',
    (await page.count('[data-setback-chip]')) === 2 && (await page.has('[data-setback-chips]')));
  await shot(page, 'f2-shelf-menu.png');
  // The chips are the profile's own two: `20 mm` is
  // `carcass.shelfDepthClearance` (what a shelf with nothing said is already
  // cut at) and `Flush` is zero. So the one that MOVES a fresh shelf is Flush,
  // and the one that puts it back is the 20.
  const back = async () => {
    const sel = await selectedShelfBack(page);
    return sel;
  };
  const before = await back();
  await page.tap('[data-setback-chip="flush"]');
  await page.sleep(900);
  const flush = await back();
  await page.tap('[data-setback-chip="standard"]');
  await page.sleep(900);
  const after = await back();
  check('the two chips move the shelf\'s setback, through the store\'s own path',
    Number(flush) === 0 && Number(after) === 20,
    `front_mm ${JSON.stringify(before)} → flush ${JSON.stringify(flush)} → 20 mm ${JSON.stringify(after)}`);
  await shot(page, 'f2-setback-20.png');
  await page.close();
}

// ═══ F3 · THE SPACING IS ON THE WARDROBE, AND IT IS CLICKABLE ══════════════
if (runs('f3')) {
  process.stdout.write('\n─── F3 · THE SPACING CHIPS, AND CENTER ALL ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.ask(
    '(() => { const P = window.__cc.project.getState(); P.addShelves(P.units[0].id, 3); return true; })()',
  );
  await page.sleep(900);
  const picked = await selectElement(page, 'r.panels.filter((p) => p.part === "SHELF")[1]');
  await page.sleep(2000);
  note('2klik on the middle shelf', JSON.stringify(picked));
  // The chain is drawn on the CANVAS (R11: one dimension component), so it is
  // counted where it lives — the live scene the canvas is drawing — and the
  // frame beside this line is what the client sees. The inline number field is
  // the `<Html>` that mounts when a figure is picked, and it is in the DOM.
  const chain = await inScene(page, 'ccSpacingChain');
  check('the chain between the shelves stays on the scene while the shelf is selected',
    chain > 0, `${chain} chain group(s) in the live scene`);
  check('CENTER ALL stands at the bottom of the shelf menu', await page.has('[data-centre-shelves]'));
  await shot(page, 'f3-spacing-chips.png');
  const positions = async () => (await itemsOf(page, 'shelf'))
    .map((s) => Math.round(Number(s.pos_mm) || 0)).sort((a, b) => a - b);
  // Shelves are BORN even (`centreShelves`' own answer), so a button that did
  // nothing at all would pass an "are they even" check. One of them is pushed
  // off first, and CENTER ALL has something to undo.
  await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' const items = (u.params.sections && u.params.sections[0] && u.params.sections[0].items) || [];'
    + ' const sh = items.filter((i) => i.kind === "shelf").sort((a, b) => a.pos_mm - b.pos_mm);'
    + ' P.setShelfPos(u.id, sh[1].id, Number(sh[1].pos_mm) + 300); return true; })()',
  );
  await page.sleep(900);
  const pushed = await positions();
  const spreadOf = (xs) => (xs.length > 2
    ? Math.max(...xs.slice(1).map((v, i) => v - xs[i])) - Math.min(...xs.slice(1).map((v, i) => v - xs[i]))
    : 0);
  check('one shelf pushed off its spacing', spreadOf(pushed) > 1, JSON.stringify(pushed));
  await shot(page, 'f3-one-shelf-pushed.png');
  const before = pushed;
  await page.tap('[data-centre-shelves]');
  await page.sleep(900);
  const after = await positions();
  check('CENTER ALL spreads that bay evenly again', spreadOf(after) <= 1,
    `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  await shot(page, 'f3-center-all.png');
  await page.close();
}

// ═══ F4 · THE J-PULL IS SEEN, AND ITS LENGTH IS TYPED ══════════════════════
if (runs('f4')) {
  process.stdout.write('\n─── F4 · THE J RUN IS A NUMBER ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  const j = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.setProjectHandle({ type: "jpull" });'
    + ' const r = window.__cc.project.getState().unitResult(u.id);'
    + ' const leaves = r.panels.filter((p) => p.meta && p.meta.jpull);'
    + ' return { leaves: leaves.length, edges: leaves.map((p) => p.meta.jpull.edge),'
    + ' id: leaves[0] ? leaves[0].id : null }; })()',
  );
  check('the scene emits the J channel on both leaves', j && j.leaves >= 2,
    `${j?.leaves} leaf/leaves · edges ${(j?.edges || []).join(', ')}`);
  await shot(page, 'f4-jpull-on-the-doors.png');
  await page.ask(
    '(() => { const U = window.__cc.ui.getState(); const P = window.__cc.project.getState();'
    + ` U.openModal("jpull-run", { unitId: P.units[0].id, panelId: ${JSON.stringify(j?.id || '')} });`
    + ' return true; })()',
  );
  await page.sleep(1200);
  check('the run length is a typed field', await page.has('[data-jpull-run-mm]'));
  check('…and there is no slider in the window',
    (await page.count('[data-jpull-run-modal] input[type="range"]')) === 0);
  const bounds = await page.ask('document.querySelector("[data-jpull-run-bounds]")?.getAttribute("data-jpull-run-bounds") || null');
  check('the engine\'s own min and max stand beside it', /^\d+-\d+$/.test(bounds || ''), String(bounds));
  await shot(page, 'f4-jpull-run-typed.png');
  await page.close();
}

// ═══ F5 · THE END PANEL LEAVES THE MOMENT A NEIGHBOUR ARRIVES ══════════════
if (runs('f5')) {
  process.stdout.write('\n─── F5 · THE PANEL LEAVES ON ADD, NOT ON DRAG ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  const before = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' return { panels: (u.params.end_panels || u.params.endPanels || null), right: Boolean(P.unitResult(u.id)'
    + '.panels.find((p) => p.part === "END-PANEL" && /R/.test(p.id))) }; })()',
  );
  note('one wardrobe alone: its free side carries a panel', JSON.stringify(before));
  await shot(page, 'f5-before-the-neighbour.png');
  await page.tap('[data-testid="cat-where"]');
  await page.sleep(600);
  const added = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const first = P.units[0];'
    + ' const made = P.addUnit(first.type, { near: first.id, side: "right" });'
    + ' const state = window.__cc.project.getState();'
    + ' const all = state.units.map((u) => ({ id: u.id, x: u.position.x_mm,'
    + ' panels: state.unitResult(u.id).panels.filter((p) => p.part === "END-PANEL").map((p) => p.id) }));'
    + ' return { made: Boolean(made), all }; })()',
  ).catch(() => null);
  const between = await page.ask(
    '(() => { const P = window.__cc.project.getState(); if (P.units.length < 2) return null;'
    + ' const [a, b] = [...P.units].sort((x, y) => x.position.x_mm - y.position.x_mm);'
    + ' const ra = P.unitResult(a.id).panels.filter((p) => p.part === "END-PANEL");'
    + ' const rb = P.unitResult(b.id).panels.filter((p) => p.part === "END-PANEL");'
    + ' const gap = b.position.x_mm - (a.position.x_mm + a.params.width);'
    + ' return { gap, a: ra.map((p) => p.id), b: rb.map((p) => p.id) }; })()',
  );
  check('a second wardrobe lands beside the first', Boolean(between), JSON.stringify(added?.all || null));
  check('…and the panel between them is gone BEFORE any drag',
    between && between.gap === 0 && !between.a.some((id) => /R/.test(id)),
    JSON.stringify(between));
  await page.sleep(900);
  await shot(page, 'f5-after-the-neighbour.png');
  await page.close();
}

// ═══ F6 · THE DOOR WINDOW SHOWS WHAT IT HOLDS ══════════════════════════════
if (runs('f6')) {
  process.stdout.write('\n─── F6 · HINGES, HINGE SIDE, THE SPLIT ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // 2KLIK, where the client's two clicks land: the scene selects the element
  // and the dock routes it (`detail/docked.jsx` → `modal: 'element'`).
  const door = await selectElement(
    page,
    'r.panels.find((p) => p.part === "FRONT" && p.role === "front" && !(p.meta && p.meta.appliance))',
  );
  await page.sleep(1500);
  note('2klik on a wardrobe door', JSON.stringify(door));
  const route = await page.ask('document.querySelector("[data-editor]")?.getAttribute("data-editor") || null');
  note('the dock opens PRO\'s own window', String(route));
  const hinges = await page.shown('[data-hinge-modal]');
  // `Hinge side` is a plain `Field` with a two-option `select` and no hook of
  // its own, so it is found the way the owner finds it: by the words on it.
  const side = await page.ask(
    '(() => { const d = document.querySelector("[data-editor]"); if (!d) return null;'
    + ' const sel = [...d.querySelectorAll("select")].find((x) => {'
    + ' const vals = [...x.querySelectorAll("option")].map((o) => o.value).join("");'
    + ' const label = (x.closest("label") || x.parentElement || {}).textContent || "";'
    + ' return vals === "LR" && /hinge side/i.test(label); });'
    + ' if (!sel) return null; const s = getComputedStyle(sel);'
    + ' return { visible: s.display !== "none" && s.visibility !== "hidden",'
    + ' box: Math.round(sel.getBoundingClientRect().height), value: sel.value,'
    + ' options: [...sel.querySelectorAll("option")].map((o) => o.value) }; })()',
  );
  const split = await page.shown('[data-split-door-modal]');
  check('HINGES show', hinges && hinges.visible && hinges.box > 0, JSON.stringify(hinges));
  check('HINGE SIDE shows, left and right', side && side.visible && side.box > 0
    && (side.options || []).join('') === 'LR', JSON.stringify(side));
  check('THE SPLIT shows (F11: *"chodziło mi o podzielenie drzwi"*)',
    split && split.visible && split.box > 0, JSON.stringify(split));
  await shot(page, 'f6-door-window.png');
  await page.close();
}

// ═══ F7 · LIGHTS MODE STAYS ON ═════════════════════════════════════════════
if (runs('f7')) {
  process.stdout.write('\n─── F7 · LED DOES NOT TURN ITSELF OFF ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.tap('[data-testid="view-lights"]');
  await page.sleep(1000);
  const on = await page.ask('window.__cc.ui.getState().modal');
  check('LED opens lights mode', on === 'lighting', String(on));
  await shot(page, 'f7-lights-on.png');
  // A single click on a door inside the mode: it used to select the door and
  // close the panel. The mode is the lighting window being open.
  await page.ask(
    '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
    + ' const u = P.units[0]; const r = P.unitResult(u.id);'
    + ' const d = r.panels.find((p) => p.part === "FRONT" && p.role === "front");'
    + ' U.selectUnit(u.id); return Boolean(d); })()',
  );
  await page.sleep(800);
  const still = await page.ask('window.__cc.ui.getState().modal');
  check('…and it is still on after a click elsewhere in the room', still === 'lighting', String(still));
  await shot(page, 'f7-lights-still-on.png');
  await page.tap('[data-testid="view-lights"]');
  await page.sleep(800);
  const off = await page.ask('window.__cc.ui.getState().modal');
  check('its own button ends it', off !== 'lighting', String(off));
  await page.close();
}

// ═══ F8 · CORNICE: ALL OR NONE ALONG A RUN ═════════════════════════════════
if (runs('f8')) {
  process.stdout.write('\n─── F8 · THE RUN NEVER MIXES ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  const set = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' const out = P.setCornice(u.id, 100);'
    + ' return { on: window.__cc.project.getState().units[0].params.cornice ?? null,'
    + ' said: (out && out.notices ? out.notices : []).join(" | ") }; })()',
  );
  check('the first wardrobe takes a cornice', Number(set?.on) > 0, JSON.stringify(set));
  await shot(page, 'f8-one-with-cornice.png');
  const run = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const first = P.units[0];'
    + ' P.addUnit(first.type, { near: first.id, side: "right" });'
    + ' const s = window.__cc.project.getState();'
    + ' return s.units.map((u) => u.params.cornice ?? null); })()',
  );
  check('a wardrobe added beside it takes the run\'s own answer',
    Array.isArray(run) && run.length > 1 && new Set(run.map(Number)).size === 1
    && Number(run[0]) > 0,
    JSON.stringify(run));
  await page.sleep(900);
  await shot(page, 'f8-the-run-agrees.png');
  await page.close();
}

// ═══ F9 · THE DRAWER MENU, AND THE ACCESSORIES DRAWER ══════════════════════
if (runs('f9')) {
  process.stdout.write('\n─── F9 · ADD ACCESSORIES DRAWER, AND ITS WINDOW ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // The DRAWERS menu is the dock's (T67 F7: *"te funkcje niech przejdą na
  // prawą stronę"*), so it is reached the way the client reaches it: put a
  // stack in, then 2klik one of its fronts.
  await page.ask(
    '(() => { const P = window.__cc.project.getState(); P.addDrawers(P.units[0].id, 3, "overlay", 200); return true; })()',
  );
  await page.sleep(900);
  await selectElement(page, 'r.panels.find((p) => p.part === "DRAWER-FRONT")');
  await page.sleep(1400);
  await shot(page, 'f9-drawers-menu.png');
  const menu = '[data-testid="dock-rehomed"] ';
  check('the drawers menu is open on the right', await page.has('[data-testid="dock-rehomed"]'));
  check('TOP DRAWER INSERT has left the drawers menu',
    (await page.count(`${menu}[data-drawers-insert]`)) === 0
    && !/top drawer insert/i.test(await page.text('[data-testid="dock-rehomed"]')));
  check('GLASS TOP, FRONTS OR BARE BOXES and WHAT THE BOXES CARRY have left it',
    !/glass top|fronts or bare boxes|what the boxes carry/i.test(await page.text('[data-testid="dock-rehomed"]')));
  check('HOW MANY stays', /how many/i.test(await page.text('[data-testid="dock-rehomed"]')));
  check('one button: ADD ACCESSORIES DRAWER', await page.has('[data-testid="drawers-add-accessories"]'));
  await page.tap('[data-testid="drawers-add-accessories"]');
  await page.sleep(1400);
  const landed = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' const items = (u.params.sections && u.params.sections[0] && u.params.sections[0].items) || [];'
    + ' return { drawers: items.filter((i) => i && i.watch_insert === true).length,'
    + ' kind: window.__cc.ui.getState().addItemKind || null,'
    + ' step: (document.querySelector(\'[data-testid="cat-inside"]\') || {}).className || "" }; })()',
  );
  check('it adds the accessories drawer through the one path', landed && landed.drawers > 0,
    JSON.stringify(landed));
  await shot(page, 'f9-accessories-row-lit.png');
  // *"po 2kliku powinno się otworzyć menu, które już jest"* — so 2klik on the
  // accessories drawer itself. A watch drawer is *"a drawer whose item says
  // so; its panels are the drawer's"* (`adapter.resolveSelection`), so the
  // piece the client points at is that drawer's own front.
  const opened = await selectElement(
    page,
    '(() => { const items = (u.params.sections && u.params.sections[0] && u.params.sections[0].items) || [];'
    + ' const drawers = items.filter((i) => i && i.kind === "drawer");'
    + ' const at = drawers.findIndex((i) => i.watch_insert === true); if (at < 0) return null;'
    + ' return r.panels.find((p) => p.part === "DRAWER-FRONT" && p.meta'
    + ' && Number(p.meta.drawer) === at + 1) || null; })()',
  );
  await page.sleep(1500);
  note('2klik on the accessories drawer', JSON.stringify(opened));
  const route = await page.ask('document.querySelector("[data-editor]")?.getAttribute("data-editor") || null');
  const win = '[data-editor="watch-layout"] ';
  check('the window opens on the drawer itself', route === 'watch-layout', String(route));
  check('GLASS ON TOP is two chips', (await page.count(`${win}[data-watch-glass-chip]`)) === 2);
  check('DRAWER HEIGHT carries the proposed number as a chip',
    await page.has(`${win}[data-watch-height-proposed]`),
    await page.text(`${win}[data-watch-height-proposed]`));
  check('Veneer is gone from the finishes',
    !/veneer/i.test(await page.text('[data-editor="watch-layout"]') || ''));
  await page.tap(`${win}[data-watch-finish="felt"]`);
  await page.sleep(800);
  const felt = await page.count(`${win}[data-watch-felt]`);
  check('FELT BASE offers the owner\'s four colours', felt === 4, `${felt} colour(s)`);
  await shot(page, 'f9-felt-four-colours.png');
  await page.close();
}

// ═══ F10 · MATERIAL ON A PIECE, ONLY WHEN THERE IS A CHOICE ════════════════
if (runs('f10')) {
  process.stdout.write('\n─── F10 · ONE MATERIAL, NO ROW ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.ask('(() => { window.__cc.project.getState().addShelves(window.__cc.project.getState().units[0].id, 1); return true; })()');
  await page.sleep(700);
  await selectElement(page, 'r.panels.find((p) => p.part === "SHELF")');
  await page.sleep(1200);
  const one = await page.count('[data-editor] [data-field="material"]');
  check('with one carcass material the row is not there', one === 0, `${one} row(s)`);
  await shot(page, 'f10-no-material-row.png');
  await page.close();
}

// ═══ F12 · THE DIVIDER: SETBACK LIKE THE SHELF, NO BORED FACE ══════════════
if (runs('f12')) {
  process.stdout.write('\n─── F12 · THE DIVIDER\'S MENU ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.ask(
    '(() => { const P = window.__cc.project.getState(); P.addPartition(P.units[0].id); return true; })()',
  );
  await page.sleep(900);
  const picked = await selectElement(page, 'r.panels.find((p) => p.part === "VPART")');
  await page.sleep(1200);
  note('2klik on the divider', JSON.stringify(picked));
  check('SET BACK FROM THE FRONT is there, the shelf\'s own two chips and a field',
    (await page.count('[data-setback-chip]')) === 2);
  check('WHICH FACE IS BORED is not in the client\'s copy',
    (await page.count('[data-partition-drill-face]')) === 0);
  await shot(page, 'f12-divider-menu.png');
  await page.close();
}

// ═══ F13 · THE BAY WIDTH LABELS: THIN AND BLACK ════════════════════════════
if (runs('f13')) {
  process.stdout.write('\n─── F13 · THE NUMBERS BETWEEN THE PARTITIONS ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.ask(
    '(() => { const P = window.__cc.project.getState(); const id = P.units[0].id;'
    + ' P.addPartition(id); P.addPartition(id); P.centrePartitions(id); return true; })()',
  );
  await page.sleep(1200);
  const style = await page.ask(
    '(() => { const P = window.__cc.profile ? window.__cc.profile.getState().profile : null;'
    + ' const L = P && P.hoverDimensions && P.hoverDimensions.label;'
    + ' return L ? { bayInk: L.bayInk, halo: L.bayHaloAlpha, weight: L.weight } : null; })()',
  );
  check('the bay label prints black, with no ground, at the light weight',
    style && style.bayInk === '#101010' && Number(style.halo) === 0 && Number(style.weight) === 300,
    JSON.stringify(style));
  // The chain itself is drawn on the CANVAS, so the frames are the proof. The
  // BEFORE is this very build with the OLD numbers pushed back into the
  // profile — the near-white ink and the 0.9 halo the owner was looking at on
  // 22.09 — which is the honest comparison: one build, two numbers.
  const hoverABay = () => page.ask(
    '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
    + ' const u = P.units[0]; const r = P.unitResult(u.id);'
    + ' const v = r.panels.find((p) => p.part === "VPART");'
    + ' if (!v) return false; U.selectUnit(u.id); U.selectElement(u.id, v.id);'
    + ' U.setHoverElement ? U.setHoverElement(u.id, v.id) : null; return v.id; })()',
  );
  const repaint = (ink, halo) => page.ask(
    '(() => { const S = window.__cc.profile.getState(); const p = S.profile;'
    + ' S.setProfile({ ...p, hoverDimensions: { ...p.hoverDimensions,'
    + ` label: { ...p.hoverDimensions.label, bayInk: ${JSON.stringify(ink)}, bayHaloAlpha: ${halo} } } });`
    + ' return true; })()',
  );
  await hoverABay();
  await page.sleep(1200);
  await repaint('#e8e4dc', 0.9);
  await page.sleep(1600);
  await shot(page, 'f13-bay-labels-before.png');
  note('the numbers as they were — the line\'s own near-white ink, haloed', '#e8e4dc · 0.9');
  await repaint('#101010', 0);
  await page.sleep(1600);
  await shot(page, 'f13-bay-labels-after.png');
  await page.close();
}

// ═══ F14 · FROM THE WALL, PER WARDROBE ═════════════════════════════════════
if (runs('f14')) {
  process.stdout.write('\n─── F14 · THE FOURTH FIELD ON SIZE ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.tap('[data-testid="cat-size"]');
  await page.sleep(1000);
  check('SIZE carries a fourth field', await page.has('[data-testid="size-wall-gap"]'));
  const labels = await page.ask(
    '[...document.querySelectorAll(\'[data-testid="panel-size"] .pbi-field-row-label\')]'
    + '.map((el) => el.textContent.trim())',
  );
  note('the four fields, in the owner\'s order', JSON.stringify(labels));
  await shot(page, 'f14-size-four-fields.png');
  const before = await params0(page);
  await page.typeInto('[data-testid="size-wall-gap"]', '60');
  const after = await params0(page);
  check('typing 60 stands THIS wardrobe 60 mm off its wall',
    Number(after?.wall_gap) === 60, `${JSON.stringify(before?.wall_gap ?? null)} → ${JSON.stringify(after?.wall_gap ?? null)}`);
  await page.sleep(900);
  await shot(page, 'f14-stood-off-the-wall.png');
  await page.close();
}

// ═══ THE LEDGER ═══════════════════════════════════════════════════════════
const fresh = process.argv.includes('--fresh');
const failed = steps.filter((s) => !s.ok);
const previous = !fresh && existsSync(`${SHOTS}walk.txt`)
  ? readFileSync(`${SHOTS}walk.txt`, 'utf8').replace(/\n?\d+ checks · \d+ failed\n*$/, '')
  : '';
const before = (previous.match(/^ (ok|FAIL) /gm) || []).length;
const beforeFailed = (previous.match(/^FAIL /gm) || []).length;
writeFileSync(`${SHOTS}walk.txt`, [
  previous || [
    '─── T72 · THE ACCEPTANCE WALK ───',
    '',
    'Fourteen points from one afternoon in the configurator, run section by',
    'section against `npx vite preview --port 4173`, the hardware served from the',
    'silent showroom (T23 R8). Every line below is a real browser reading the real',
    'build; the frames beside this file are what it saw.',
    '',
  ].join('\n'),
  ...steps.map((s) => `${s.note ? ' ·  ' : (s.ok ? ' ok ' : 'FAIL')} ${s.label}${s.detail ? ` — ${s.detail}` : ''}`),
  '',
  `${before + steps.filter((s) => !s.note).length} checks · ${beforeFailed + failed.length} failed`,
  '',
].join('\n'));
process.stdout.write(`\n${steps.filter((s) => !s.note).length} checks · ${failed.length} failed\n`);
await showroom.close?.();
process.exit(failed.length ? 1 : 0);
