#!/usr/bin/env node
// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 70) ───────────────────────
//
// `npm test` and `npm run build` can both be green while the thing on screen is
// wrong, because neither opens a browser. Every claim T70 makes about a PAGE
// ends in a frame under `verify/t70/`.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t70-walk.mjs --fresh f1 f2      start a ledger, run two
//   node scripts/t70-walk.mjs f3                 add to it
//
// THE HARNESS IS T69's, unchanged but for the frame directory and the sections:
// one Chromium per section, a strictly increasing debug port, a REAL pointer
// for a hover (React delegates `mouseover` at the root, so a dispatched
// `mouseenter` reaches nothing) and the browser's own input pipe for a typed
// field. A walk that re-invents its driver fails for its own reasons.
//
// THE HARDWARE IS SERVED FROM THE SILENT SHOWROOM (T23 R8).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t70/', import.meta.url).pathname;
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
const nextPort = () => 9400 + ((process.pid % 40) * 12) + (seq += 1);
const showroom = await startFixtureServer({ port: 4400 + (process.pid % 80) });

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

/** T69's pointer, verbatim — a real mouse arriving over an element. */
async function hover(page, selector) {
  const box = await page.box(selector);
  if (!box) return false;
  await page.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: box.x + Math.round(box.w / 2), y: box.y + Math.round(box.h / 2), buttons: 0,
  });
  await page.sleep(700);
  return true;
}

/** Press a CHIP by the word on it — `ChipRow` gives the ROW the testid. */
async function pickChip(page, row, label) {
  return page.ask(
    `(() => { const r = document.querySelector('[data-testid=${JSON.stringify(row)}]');`
    + ' if (!r) return false;'
    + ` const b = [...r.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(String(label))});`
    + ' if (!b || b.disabled) return false; b.click(); return true; })()',
  );
}

const unit0 = (page) => page.ask('window.__cc.project.getState().units[0]?.id || null');
const params0 = (page) => page.ask('window.__cc.project.getState().units[0]?.params || null');
const design = (page) => page.ask(
  '(() => { const d = window.__cc.project.getState().project.design;'
  + ' return { sheen: d.sheen ?? null, types: (d.fronts?.types || []).length }; })()',
);

// ═══ F1 · THE SHOE BOX IS ONE MOVING THING ════════════════════════════════
if (runs('f1')) {
  process.stdout.write('\n─── F1 · NO SHELF ABOVE, AND THE SKOS TRAVELS ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);

  // Two plain drawers, then the shoe drawer on top — the client's own order.
  const built = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.addDrawers(u.id, 2, "overlay", 200); const id = P.addShoeDrawer(u.id);'
    + ' const r = P.unitResult(u.id);'
    + ' return { shoe: id, parts: r.panels.filter((p) => p.part === "PARTITION").length,'
    + ' ramp: r.panels.filter((p) => p.part === "SHOE-RAMP").length,'
    + ' divs: r.panels.filter((p) => p.part === "SHOE-DIVIDER").length,'
    + ' screws: (r.drills || []).filter((d) => d.kind === "partition_screw").length,'
    + ' said: (r.warnings || []).filter((w) => w.code === "SHOE_STACK_UNCAPPED").map((w) => w.message)[0] || "" }; })()',
  );
  check('a shoe drawer on top of the stack leaves NO capping board', built && built.parts === 0,
    `${built?.parts} PARTITION panel(s)`);
  check('…and no confirmats for a board nobody cut', built && built.screws === 0,
    `${built?.screws} partition_screw hole(s)`);
  check('the insert is cut — one ramp, two lanes', built && built.ramp === 1 && built.divs === 2,
    `${built?.ramp} ramp · ${built?.divs} dividers`);
  check('the cut list SAYS the stack is open', /carries nothing above it/.test(built?.said || ''),
    (built?.said || '').slice(0, 110));
  await page.tap('[data-testid="cat-inside"]');
  await page.sleep(900);
  await shot(page, 'f1-no-shelf-above.png');

  // …and the SKOS travels: open the shoe drawer's front and read what moves.
  const rides = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
    + ' const u = P.units[0]; const r = P.unitResult(u.id);'
    + ' const top = Math.max(...r.panels.filter((p) => p.part === "DRAWER-FRONT").map((p) => Number(p.meta.drawer)));'
    + ' const face = r.panels.find((p) => p.part === "DRAWER-FRONT" && Number(p.meta.drawer) === top);'
    + ' U.openFrontsFor(u.id, [face.id]); return { top, face: face.id }; })()',
  ).catch(() => null);
  const motion = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' const r = P.unitResult(u.id); const top = Math.max(...r.panels'
    + '.filter((p) => p.part === "DRAWER-FRONT").map((p) => Number(p.meta.drawer)));'
    + ' const mine = r.panels.filter((p) => Number(p.meta && p.meta.drawer) === top);'
    + ' const roles = [...new Set(mine.map((p) => p.role))];'
    + ' return { top, roles, ramp: mine.some((p) => p.part === "SHOE-RAMP") }; })()',
  );
  note('the shoe drawer is the top of its stack', `drawer ${motion?.top}`);
  check('its ramp and dividers answer to the SAME drawer index',
    Boolean(motion?.ramp) && (motion?.roles || []).includes('shoe_insert'),
    (motion?.roles || []).join(' · '));
  if (rides) note('its front was opened on the stage', rides.face);
  const travels = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
    + ' const u = P.units[0]; const r = P.unitResult(u.id);'
    + ' const open = (U.openFronts || {})[u.id] || {};'
    + ' const top = Math.max(...r.panels.filter((p) => p.part === "DRAWER-FRONT").map((p) => Number(p.meta.drawer)));'
    + ' const face = r.panels.find((p) => p.part === "DRAWER-FRONT" && Number(p.meta.drawer) === top);'
    + ' const amount = Number(open[face.id]) || 0;'
    + ' const parts = r.panels.filter((p) => Number(p.meta && p.meta.drawer) === top'
    + ' && (p.role === "drawer_box" || p.role === "shoe_insert")).map((p) => p.part);'
    + ' return { amount, parts: [...new Set(parts)] }; })()',
  );
  check('the FRONT is open, and the ramp is in the set that rides with it',
    travels && travels.amount > 0 && travels.parts.includes('SHOE-RAMP')
    && travels.parts.includes('SHOE-DIVIDER'),
    `open ${travels?.amount} · ${(travels?.parts || []).join(', ')}`);
  await page.sleep(1400);
  await shot(page, 'f1-skos-travels.png');
  await page.close();
}

// ═══ F2 · THE LEFT COLUMN STOPS SPECIFYING ════════════════════════════════
if (runs('f2')) {
  process.stdout.write('\n─── F2 · COUNT · HEIGHT · ADD, AND NOTHING ELSE ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.tap('[data-testid="cat-inside"]');
  await page.sleep(1000);
  await page.tap('[data-add-kind="drawers"]');
  await page.sleep(900);
  await shot(page, 'f2-inside-drawers-row.png');

  const col = '[data-testid="interior-pro-list"] ';
  const mount = await page.shown(`${col}[data-drawer-mount="overlay"]`);
  const variant = await page.shown(`${col}[data-drawer-variant="belt_tie"]`);
  check('WITH FRONTS / BARE BOXES are gone from the column',
    mount === null || mount.visible === false || mount.box === 0, JSON.stringify(mount));
  check('STANDARD / BELT-TIE / +GLASS are gone from the column',
    variant === null || variant.visible === false || variant.box === 0, JSON.stringify(variant));
  const chips = await page.ask(
    `(() => { const c = document.querySelector('[data-testid="interior-pro-list"]');`
    + ' if (!c) return null; const on = [...c.querySelectorAll("[data-drawer-mount],[data-drawer-variant]")]'
    + '.filter((e) => e.getBoundingClientRect().height > 0).length;'
    + ' return { inDom: c.querySelectorAll("[data-drawer-mount],[data-drawer-variant]").length, onScreen: on }; })()',
  );
  // FIVE hooks, not six: the disabled INSET chip carries no `data-drawer-*` of
  // its own in PRO's file — it is the third button of the MOUNT row, and the
  // rule hides the row, so it goes with them. Counted separately below rather
  // than assumed.
  check('…hidden, NOT cut — every hooked chip is still in the DOM',
    chips && chips.inDom === 5 && chips.onScreen === 0, JSON.stringify(chips));
  const inset = await page.ask(
    `(() => { const c = document.querySelector('[data-testid="interior-pro-list"]');`
    + ' const b = [...c.querySelectorAll("button")].find((x) => /^Inset/.test(x.textContent.trim()));'
    + ' if (!b) return null; return { inDom: true, h: Math.round(b.getBoundingClientRect().height) }; })()',
  );
  check('…and the disabled INSET chip goes with its row', inset && inset.inDom && inset.h === 0,
    JSON.stringify(inset));
  const para = await page.ask(
    `(() => { const c = document.querySelector('[data-testid="interior-pro-list"]');`
    + ' const p = [...c.querySelectorAll("p")].find((x) => /Stacked from the bottom/.test(x.textContent));'
    + ' if (!p) return null; return { inDom: true, h: Math.round(p.getBoundingClientRect().height) }; })()',
  );
  check('…and the paragraph under them left the column too', para && para.inDom && para.h === 0,
    JSON.stringify(para));
  const add = await page.ask(
    `(() => { const c = document.querySelector('[data-testid="interior-pro-list"]');`
    + ' const btn = [...c.querySelectorAll("button")].find((b) => b.textContent.trim() === "Add");'
    + ' const fields = [...c.querySelectorAll("span")].map((s) => s.textContent.trim())'
    + '.filter((t) => t === "Count" || t === "Height");'
    + ' return { add: Boolean(btn && btn.getBoundingClientRect().height > 0), fields }; })()',
  );
  check('COUNT · HEIGHT · ADD are all still there',
    add && add.add && add.fields.includes('Count') && add.fields.includes('Height'), JSON.stringify(add));
  await page.close();
}

// ═══ F3 · THE DOCK TELLS YOU WHAT FITS INSIDE ═════════════════════════════
if (runs('f3')) {
  process.stdout.write('\n─── F3 · THE SPEC AND THE INNER BOX HEIGHT ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.evaluate(
    '(() => { const P = window.__cc.project.getState();'
    + ' P.addDrawers(P.units[0].id, 3, "overlay", 200); return true; })()',
  );
  await page.tap('[data-testid="cat-inside"]');
  await page.sleep(1200);
  await page.tap('[data-interior-open="drawers"]');
  await page.sleep(1600);
  await shot(page, 'f3-dock-spec.png');

  check('the dock carries FRONTS OR BARE BOXES', await page.has('[data-testid="drawers-mount"]'));
  check('…and WHAT THE BOXES CARRY', await page.has('[data-testid="drawers-variant"]'));
  check('…and the paragraph that stood under them', await page.has('[data-testid="drawers-stack-law"]'),
    (await page.text('[data-testid="drawers-stack-law"]')).slice(0, 110));
  check('…and the INNER BOX HEIGHT beside the front height',
    await page.has('[data-testid="dock-inner-heights"]'));
  const line = await page.text('[data-testid="dock-inner-1"]');
  check('the quiet line reads "front N · inside N"', /^front \d+ · inside \d+$/.test(line), line);

  // THE NUMBER IS THE ENGINE'S — asked of the engine, on the page.
  const truth = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' const r = P.unitResult(u.id);'
    + ' const mine = r.panels.filter((p) => p.box && Number(p.meta && p.meta.drawer) === 1 && p.role === "drawer_box");'
    + ' const sides = mine.filter((p) => p.part === "DRAWER-SIDE").sort((a, b) => a.box.x - b.box.x);'
    + ' const bot = mine.find((p) => p.part === "DRAWER-BOTTOM");'
    + ' if (!sides.length || !bot) return null;'
    + ' const l = sides[0]; return Math.round((l.box.y + l.box.h) - (bot.box.y + bot.box.h)); })()',
  );
  check('…and it is the ENGINE\'s own clear height, not a number retail typed',
    line.endsWith(`inside ${truth}`), `${line} vs engine ${truth}`);

  // And the mount chip really writes the stack.
  const pressed = await pickChip(page, 'drawers-mount', 'BARE BOXES');
  await page.sleep(1200);
  const mounts = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' return (u.params.sections[0].items || []).filter((i) => i.kind === "drawer")'
    + '.map((i) => i.mount).join(","); })()',
  );
  check('BARE BOXES writes the WHOLE stack', pressed && /^internal(,internal)*$/.test(mounts), mounts);
  await shot(page, 'f3-bare-boxes.png');
  await page.close();
}

// ═══ F4 · DOORS ON THE FIRST LINE ═════════════════════════════════════════
if (runs('f4')) {
  process.stdout.write('\n─── F4 · ADD DOORS / REMOVE DOORS, UNDER STYLE ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.tap('[data-testid="cat-fronts"]');
  await page.sleep(1200);
  await shot(page, 'f4-fronts-first-line.png');

  const order = await page.ask(
    '(() => { const col = document.querySelector(\'[data-testid="column-options"]\');'
    + ' const at = (s) => { const e = col.querySelector(s); return e ? Math.round(e.getBoundingClientRect().y) : null; };'
    + ' return { style: at(\'[data-testid="fronts-style"]\'), add: at(\'[data-testid="fronts-add-doors"]\'),'
    + ' opening: at(\'[data-testid="fronts-opening"]\'), colour: at(\'[data-testid="fronts-material"]\') }; })()',
  );
  check('the pair stands UNDER the style list', order && order.add > order.style, JSON.stringify(order));
  check('…and ABOVE everything else in the step',
    order && order.add < order.opening && order.add < order.colour, JSON.stringify(order));

  // ─── AND THE CLIENT'S WARDROBE ARRIVES WITH DOORS ────────────────────────
  //
  // Measured here rather than assumed: `adapter.addFirstWardrobe` — the WHERE
  // step's own ADD A WARDROBE — presses `setDoorCount(id, 1)` as it places the
  // cabinet, so a client is looking at a closed wardrobe. That makes REMOVE the
  // live half on arrival, which is the state the row has to read correctly or
  // it is two dead buttons. So the walk presses them in the client's own order.
  const fronts = () => page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' return P.unitResult(u.id).panels.filter((p) => p.role === "front").length; })()',
  );
  const state = () => page.ask(
    '(() => ({ add: !document.querySelector(\'[data-testid="fronts-add-doors"]\').disabled,'
    + ' remove: !document.querySelector(\'[data-testid="fronts-remove-doors"]\').disabled }))()',
  );
  const before = await params0(page);
  check('a client\'s wardrobe ARRIVES with doors (WHERE hangs them as it places it)',
    before?.doors === true, `doors:${before?.doors} · ${await fronts()} leaf/leaves`);
  const on = await state();
  check('so REMOVE is live and ADD is refused, with a reason',
    on && on.remove === true && on.add === false, JSON.stringify(on));
  await shot(page, 'f4-doors-on.png');

  await page.tap('[data-testid="fronts-remove-doors"]');
  await page.sleep(1400);
  const off = await params0(page);
  check('REMOVE DOORS takes them off — and the engine cuts no leaf',
    off?.doors !== true && (await fronts()) === 0, `doors:${off?.doors}`);
  const nowOff = await state();
  check('…and the pair swaps over: ADD live, REMOVE refused',
    nowOff && nowOff.add === true && nowOff.remove === false, JSON.stringify(nowOff));
  await shot(page, 'f4-doors-off.png');

  await page.tap('[data-testid="fronts-add-doors"]');
  await page.sleep(1400);
  const back = await params0(page);
  check('ADD DOORS hangs them again — the same store path EXTRAS presses',
    back?.doors === true && (await fronts()) > 0, `doors:${back?.doors} · ${await fronts()} leaf/leaves`);
  await page.close();
}

// ═══ F5 · SHEEN, AND MORE THAN ONE COLOUR ═════════════════════════════════
if (runs('f5')) {
  process.stdout.write('\n─── F5 · THE SHEEN BAND AND THE COLOUR ROWS ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.tap('[data-testid="cat-fronts"]');
  await page.sleep(1200);

  const bands = await page.ask(
    `(() => { const r = document.querySelector('[data-testid="fronts-sheen"]');`
    + ' if (!r) return null; return [...r.querySelectorAll("button")].map((b) => b.textContent.trim()); })()',
  );
  check('the sheen row offers the ENGINE\'s own six words',
    Array.isArray(bands) && bands.length === 6 && /DEAD MATT/i.test(bands[0]) && /GLOSS/i.test(bands[5]),
    (bands || []).join(' · '));
  check('…and it is not a slider', (await page.count('[data-testid="column-options"] input[type="range"]')) === 0);
  await shot(page, 'f5-sheen.png');
  const pressed = await pickChip(page, 'fronts-sheen', 'GLOSS');
  await page.sleep(1000);
  const d = await design(page);
  check('pressing GLOSS writes the design\'s own sheen', pressed && d.sheen === 100, `sheen ${d.sheen}`);

  // …and the colours.
  const rows0 = await page.count('[data-testid="fronts-colour-rows"] button');
  check('a fresh design carries ONE colour row — ALL FRONTS', rows0 === 1, `${rows0} row(s)`);
  await page.tap('[data-testid="fronts-colour-add"]');
  await page.sleep(1100);
  const rows1 = await page.count('[data-testid="fronts-colour-rows"] button');
  const d1 = await design(page);
  check('+ ADD A SECOND COLOUR grows the project\'s own type list',
    rows1 === 2 && d1.types === 2, `${rows1} row(s) · ${d1.types} type(s)`);
  check('…and the row it opened has its own picker', await page.has('[data-testid="fronts-colour-picker"]'));
  await shot(page, 'f5-second-colour.png');

  // Give it a colour, then click a front on the stage the way the scene does.
  await page.ask(
    `(() => { const p = document.querySelector('[data-testid="fronts-colour-picker"]');`
    + ' const sw = p ? p.querySelector("button[title]") : null; if (!sw) return false; sw.click(); return true; })()',
  );
  await page.sleep(900);
  await page.evaluate(
    '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
    + ' const u = P.units[0]; P.setDoors(u.id, true);'
    + ' const f = P.unitResult(u.id).panels.find((x) => x.role === "front");'
    + ' if (f) U.selectElement(u.id, f.id); return true; })()',
  );
  await page.sleep(1400);
  const worn = await page.ask('window.__cc.project.getState().units[0]?.params?.front_type_id || null');
  check('clicking a front while the row is up gives THAT wardrobe the colour',
    worn === 'f2', String(worn));
  await shot(page, 'f5-colour-on-a-front.png');

  await page.tap('[data-testid="cat-review"]');
  await page.sleep(1400);
  const summary = await page.text('[data-testid="estimate-summary"]');
  check('REVIEW names every colour used', /Front finish 2/i.test(summary),
    (summary.match(/FRONT FINISH 2[^A-Z]{0,90}/i) || [''])[0].replace(/\s+/g, ' '));
  await shot(page, 'f5-review-names-colours.png');
  await page.close();
}

// ═══ F6 · THE BAY LIGHTS UP UNDER THE POINTER ═════════════════════════════
if (runs('f6')) {
  process.stdout.write('\n─── F6 · THE BAY, UNDER A REAL POINTER ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.evaluate(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.updateUnitParams(u.id, { width: 1800 }); return true; })()',
  );
  await page.tap('[data-testid="cat-inside"]');
  await page.sleep(1000);
  // `NumberField` puts the testid on the INPUT itself (`controls.jsx`), so the
  // selector is the input and not a wrapper.
  await page.typeInto('input[data-testid="inside-bays"]', 3);
  await page.sleep(1400);

  // THE CLIENT'S OWN STATE: nothing clicked on the stage. This is what the
  // probe convicted, so the walk puts it back deliberately.
  await page.evaluate('(() => { window.__cc.ui.getState().clearSelection(); return true; })()');
  await page.sleep(500);
  const before = await page.ask(
    '(() => { const U = window.__cc.ui.getState();'
    + ' return { hint: U.zoneHint, selected: U.selectedUnitId }; })()',
  );
  note('the client has clicked no wardrobe', `selectedUnitId=${before?.selected}`);
  await shot(page, 'f6-before-hover.png');

  const moved = await hover(page, '[data-testid="inside-bay-1"]');
  const after = await page.ask(
    '(() => { const U = window.__cc.ui.getState(); const P = window.__cc.project.getState();'
    + ' const u = P.units[0]; const drawn = U.selectedUnitId === u.id ? U.zoneHint : null;'
    + ' return { hint: U.zoneHint, selected: U.selectedUnitId, drawn,'
    + ' lit: !!document.querySelector(\'[data-testid="inside-bay-1"][data-on="yes"]\') }; })()',
  );
  check('a real pointer over the chip writes the hint', moved && after.hint === 1, `zoneHint=${after?.hint}`);
  check('…and it reaches the cabinet the chip is about', after?.selected != null, String(after?.selected));
  check('SO THE SCENE DRAWS IT — the fault the owner reported is gone',
    after?.drawn === 1, `Scene would pass ${after?.drawn}`);
  check('the chip lights with the bay — one integer, both read it', after?.lit === true);
  await shot(page, 'f6-bay-hover.png');
  await page.close();
}

// ═══ THE LAZY RUN ═════════════════════════════════════════════════════════
if (runs('lazy')) {
  process.stdout.write('\n─── THE LAZY RUN · SIX CLICKS TO A WARDROBE ───\n');
  const page = await open();
  await room(page);
  await shot(page, 'lazy-01-what.png');
  await page.tap('[data-testid="step-next"]');
  await page.sleep(900);
  await shot(page, 'lazy-02-where.png');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.sleep(1500);
  await page.tap('[data-testid="step-next"]');
  await shot(page, 'lazy-03-size.png');
  await page.tap('[data-testid="step-next"]');
  await shot(page, 'lazy-04-inside.png');
  await page.tap('[data-testid="step-next"]');
  await shot(page, 'lazy-05-fronts.png');
  await page.tap('[data-testid="step-next"]');
  await shot(page, 'lazy-06-extras.png');
  await page.tap('[data-testid="step-next"]');
  await page.sleep(1200);
  await shot(page, 'lazy-07-review.png');
  const summary = await page.text('[data-testid="estimate-summary"]');
  check('seven clicks end on a wardrobe with a summary', summary.length > 20,
    summary.replace(/\s+/g, ' ').slice(0, 180));
  await page.tap('[data-testid="review-done"]');
  await page.sleep(1800);
  const hash = await page.ask('location.hash');
  const rows = await page.count('[data-testid^="estimate-row-"]');
  check('DONE → ADD TO MY ESTIMATE lands one item on the estimate',
    hash === '#/estimate' && rows === 1, `${hash} · ${rows} row(s)`);
  await shot(page, 'lazy-08-estimate.png');
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
    '─── T70 · THE ACCEPTANCE WALK ───',
    '',
    'Run section by section against `npx vite preview --port 4173`, the hardware',
    'served from the silent showroom (T23 R8). Every line below is a real browser',
    'reading the real build; the frames beside this file are what it saw.',
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
