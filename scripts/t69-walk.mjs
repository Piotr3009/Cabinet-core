#!/usr/bin/env node
// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 69) ───────────────────────
//
// `npm test` and `npm run build` can both be green while the thing on screen is
// wrong, because neither of them opens a browser. Every claim T69 makes about a
// PAGE ends in a frame under `verify/t69/`.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t69-walk.mjs --fresh f1 f2      start a ledger, run two
//   node scripts/t69-walk.mjs f3                 add to it
//
// THE HARDWARE IS SERVED FROM THE SILENT SHOWROOM (T23 R8): this container's
// egress answers ERR_TUNNEL to the real bucket, and the room WAITS on it — so
// the walk serves `test/fixtures/hardware-local/` and points the page at it
// through the one documented `localStorage['cc.hardwareBase']` knob.
//
// THE HARNESS BELOW IS T67's, unchanged but for the frame directory: one
// Chromium per section, a strictly increasing debug port, a real pointer for a
// hover and the browser's own input pipe for a typed field. A walk that
// re-invents its own driver is a walk that fails for its own reasons.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t69/', import.meta.url).pathname;
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
// A STRICTLY INCREASING PORT. T65's `(pid + 17n) % 300` can hand two sections
// the same number, and a Chromium that cannot bind its debug port never answers
// — which is a walk that HANGS rather than one that fails. One port per launch,
// in a band this process owns.
const nextPort = () => 9400 + ((process.pid % 40) * 12) + (seq += 1);
const showroom = await startFixtureServer({ port: 4400 + (process.pid % 80) });

async function open({ width = 1440, height = 900 } = {}) {
  const page = await launch({ width, height, port: nextPort() });
  page.ask = (expr) => page.evaluate(`return (${expr});`);
  page.text = (sel) => page.ask(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').trim()`);
  page.has = (sel) => page.ask(`Boolean(document.querySelector(${JSON.stringify(sel)}))`);
  page.count = (sel) => page.ask(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  page.box = (sel) => page.ask(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)});`
    + ' if (!el) return null; const r = el.getBoundingClientRect();'
    + ' return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; })()',
  );
  page.tap = async (sel) => {
    await page.evaluate(`document.querySelector(${JSON.stringify(sel)})?.click(); return true;`);
    await page.sleep(650);
  };
  /**
   * Type into a field the way a hand does: a REAL click for real focus, select
   * all, insert the text, then Tab to blur.
   *
   * `NumberField` commits on BLUR (Enter just blurs it), and a blur only fires
   * on an element that actually HAS focus. Setting `.value` through the native
   * setter and calling `el.blur()` looks right and commits nothing — which is
   * what the first run of this walk found, twice, before it stopped guessing
   * and used the browser's own input pipe.
   */
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

/** The room, ready — and T65 F1 means it may be EMPTY, so bounds may be null. */
async function room(page, step = null, { base = BASE, hash = '#/design' } = {}) {
  await page.showroom(`${base}retail.html${hash}`);
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout: 45000 });
  await page.sleep(2600);
  if (step) await page.tap(`[data-testid="cat-${step}"]`);
}

const units = (page) => page.ask('window.__cc.project.getState().units.map((u) => ({ id: u.id, w: Math.round(u.params.width), h: Math.round(u.params.height) }))');
const setWall = (page, mm) => page.evaluate(
  `(() => { const s = window.__cc.project.getState();`
  + ` s.setRoom({ ...s.project.room, corners: null, width: ${mm} }); return true; })()`,
);


/** Put a wardrobe in the empty room, the way a client does. */
async function withWardrobe(page) {
  await page.tap('[data-testid="cat-where"]');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.sleep(1500);
}

/** Click a PANEL on the stage the way the scene does — through the ui store. */
const select = (page, part) => page.evaluate(
  '(() => { const p = window.__cc.project.getState(); const u = p.units[0];'
  + ` const hit = (p.unitResult(u.id).panels || []).find((x) => x.part === ${JSON.stringify(part)});`
  + ' if (!hit) return null; window.__cc.ui.getState().selectElement(u.id, hit.id);'
  + ' return hit.id; })()',
);

// ─── PRO'S OWN PAGE, AND THE ROOM WINDOW IN IT ─────────────────────────────
//
// The room is PRO's `Settings ▸ Room setup`, which is the shared ui store's
// `room` modal — so it is opened the way the menu opens it, through the store,
// rather than by hunting for a menu item in a workshop bar.
async function proRoom(page) {
  await page.showroom(`${BASE}index.html`);
  await page.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
  // PRO opens on its START SCREEN, so the walk starts a project the way the
  // start screen does before it can ask for a window — T57's own `fresh`.
  await page.evaluate(
    '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
    + ' P.newProject("T69 · the night", { number: "69" });'
    + ' U.openEditor(); U.selectUnit(null); return true; })()',
  );
  await page.waitFor('window.__cc.views && (window.__cc.views.room || window.__cc.views.editor)',
    { timeout: 30000 });
  await page.sleep(1200);
  await page.evaluate(
    '(() => { window.__cc.ui.getState().openModal("room", {}); return true; })()',
  );
  await page.sleep(1800);
}

/** …and retail's, which is WHERE → EDIT THE ROOM. */
async function retailRoom(page) {
  await room(page, 'where');
  await page.tap('[data-testid="space-edit-room"]');
  await page.sleep(1600);
}

/**
 * HOVER, for real. React delegates `onMouseEnter` through the native
 * `mouseover`/`mouseout` pair at the root, so a dispatched `MouseEvent
 * ("mouseenter")` reaches nothing — and `.focus()` turned out to reach nothing
 * either on this build. What DOES work is the browser's own pointer: one
 * `Input.dispatchMouseEvent` of type `mouseMoved` at the element's centre,
 * which is a mouse arriving over it exactly as a hand's would.
 */
async function hover(page, selector) {
  const box = await page.box(selector);
  if (!box) return false;
  await page.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: box.x + Math.round(box.w / 2), y: box.y + Math.round(box.h / 2), buttons: 0,
  });
  await page.sleep(700);
  return true;
}

/**
 * Press a WALL in the plan, the way a hand does — the grab bar listens on
 * POINTERDOWN, so a synthetic `.click()` produces nothing.
 *
 * RETAIL'S JOB IS ONE WALL (`design.scope === 'wall'`, T64 F1.8), so its plan
 * draws ONE clickable segment and the two returns beside it are stubs, which
 * carry no number and no grab bar. The walk therefore asks the page which
 * walls it actually has rather than assuming four, and presses the last of
 * them — which is wall 2 in PRO's whole room and wall 1 in the client's.
 */
async function clickWall(page, wanted = null) {
  const walls = await page.ask('[...document.querySelectorAll("[data-plan-wall]")].map((e) => Number(e.dataset.planWall))');
  if (!Array.isArray(walls) || !walls.length) return null;
  const index = wanted != null && walls.includes(wanted) ? wanted : walls[walls.length - 1];
  await page.click(`[data-plan-wall="${index}"]`);
  await page.sleep(1000);
  return { index, walls };
}


/**
 * Press a CHIP by the word on it.
 *
 * `controls.jsx ChipRow` gives the ROW a testid and the chips none — they are
 * identified by what they say, which is also how a hand finds them. So the
 * walk finds them the same way rather than asking for an attribute the
 * component does not write.
 */
async function pickChip(page, row, label) {
  // `page.ask`, not `page.evaluate`: the harness's `evaluate` runs a STATEMENT
  // list and hands nothing back, so a press made through it reads as a press
  // that did not happen. (The first run of this walk reported exactly that,
  // three times, while the leaf widths beside it proved the chips had worked.)
  return page.ask(
    `(() => { const r = document.querySelector('[data-testid=${JSON.stringify(row)}]');`
    + ' if (!r) return false;'
    + ` const b = [...r.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(String(label))});`
    + ' if (!b || b.disabled) return false; b.click(); return true; })()',
  );
}

/** The wardrobe's own id, and its leaves — the engine's answer, off the page. */
const leaves = (page) => page.ask(
  '(() => { const p = window.__cc.project.getState(); const u = p.units[0]; if (!u) return null;'
  + ' return (p.unitResult(u.id).panels || []).filter((x) => x.role === "front")'
  + '.sort((a, b) => a.x - b.x).map((x) => Math.round(x.w)); })()',
);
const design = (page) => page.ask(
  '(() => { const d = window.__cc.project.getState().project.design;'
  + ' return { style: d.fronts?.style || null, handle: d.fronts?.handle?.type || null,'
  + ' front: d.fronts?.types?.[0]?.finish_id || d.fronts?.types?.[0]?.colour?.name || null,'
  + ' carcass: d.carcass?.types?.[0]?.finish_id || null, lights: Boolean(d.lighting?.on) }; })()',
);


// ═══ F1 · THE ROOM ASKS HOW MANY WALLS, AND APPLY ANSWERS ══════════════════
if (runs('f1')) {
  process.stdout.write('\n─── F1 · 1/2/3 WALLS, AND APPLY ───\n');
  const page = await open();
  await proRoom(page);
  await shot(page, 'f1-pro-room.png');

  const row = await page.count('[data-room-walls]');
  check('PRO\'s preset row offers three answers', row === 3, `${row} button(s)`);
  const labels = await page.ask(
    "[...document.querySelectorAll('[data-room-walls]')].map((b) => b.textContent.trim()).join(' · ')",
  );
  check('…and they are 1 WALL · 2 WALLS · 3 WALLS', /1 wall/i.test(labels) && /3 walls/i.test(labels), labels);
  check('DRAW ROOM… still stands last in the row', await page.has('[data-room-draw="1"]'));
  check('IMPORT DXF is gone from the row', !(await page.has('[data-import-dxf]')));

  await page.tap('[data-room-walls="three"]');
  const scope = await page.ask('window.__cc.project.getState().project.design.scope');
  check('pressing 3 WALLS writes the scope', scope === 'three', String(scope));
  await shot(page, 'f1-three-walls.png');

  // APPLY, on a room the guard REFUSES — the state that used to be silent.
  await page.evaluate(
    '(() => { const P = window.__cc.project.getState();'
    + ' const r = P.addUnit("WARDROBE", { params: { width: 2000, height: 2400, depth: 600 } });'
    + ' P.updateUnitParams(r.id, { width: 2000, height: 2400 }); return r.id; })()',
  );
  const live = await page.ask(
    "(() => { const b = document.querySelector('[data-room-apply=\"1\"]'); return b ? !b.disabled : null; })()",
  );
  check('APPLY is LIVE, never a dead grey rectangle', live === true, String(live));
  await shot(page, 'f1-apply-live.png');
  await page.close();
}

// ═══ F2 · THE LINE FOLLOWS THE MOUSE ═══════════════════════════════════════
if (runs('f2')) {
  process.stdout.write('\n─── F2 · DRAW ROOM ───\n');
  const page = await open();
  await room(page, 'where');
  await page.tap('[data-testid="space-edit-room"]');
  await page.sleep(900);
  await page.tap('[data-room-draw="1"]');
  await page.sleep(1200);
  check('the CAD window opens from the room', await page.has('[data-draw-canvas="1"]'));
  await shot(page, 'f2-draw-open.png');

  // A real pointer, moved across the canvas: the line must follow it with
  // nothing typed at all.
  const box = await page.box('[data-draw-canvas="1"]');
  if (box) {
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: box.x + Math.round(box.w * 0.8), y: box.y + Math.round(box.h * 0.5), buttons: 0,
    });
    await page.sleep(500);
    const ghost = await page.has('[data-draw-ghost="1"]');
    check('the wall follows the pointer before a key is pressed', ghost);
    await shot(page, 'f2-line-follows.png');

    // …and a CLICK opens the field AT THE CLICK POINT, inside the canvas.
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: box.x + Math.round(box.w * 0.8), y: box.y + Math.round(box.h * 0.5),
      button: 'left', clickCount: 1, buttons: 1,
    });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: box.x + Math.round(box.w * 0.8), y: box.y + Math.round(box.h * 0.5),
      button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(700);
    const field = await page.box('[data-draw-field="1"]');
    check('the input opens at the click point, INSIDE the canvas',
      Boolean(field) && field.x > box.x && field.x < box.x + box.w
        && field.y > box.y && field.y < box.y + box.h,
      JSON.stringify(field));
    await shot(page, 'f2-input-at-the-click.png');
  } else {
    check('the CAD canvas has a box on screen', false, 'no canvas');
  }
  await page.close();
}

// ═══ F3 · SLOPES, ART AND THE SILL ═════════════════════════════════════════
if (runs('f3')) {
  process.stdout.write('\n─── F3 · SLOPES AND THE WALL\'S ART ───\n');
  const page = await open();
  await room(page, 'where');
  await page.evaluate(
    '(() => { const P = window.__cc.project.getState();'
    + ' P.setWallSlopes([]);'
    + ' P.addWallSlope({ kind: "slope", wall: 0, side: "left", startHeight: 1800, run: 900 });'
    + ' P.addWallSlope({ kind: "slope", wall: 0, side: "right", startHeight: 1800, run: 900 });'
    + ' return true; })()',
  );
  const sides = await page.ask(
    '(window.__cc.project.getState().project.wallSlopes || []).map((s) => s.side).join("+")',
  );
  check('slope LEFT then RIGHT stores two sides, not two Rs', sides === 'L+R', sides);

  const again = await page.ask(
    '(() => { const P = window.__cc.project.getState();'
    + ' P.addWallSlope({ kind: "slope", wall: 0, side: "left", startHeight: 1500, run: 700 });'
    + ' return (window.__cc.project.getState().project.wallSlopes || []).length; })()',
  );
  check('a third press on the same side replaces rather than stacks', again === 2, String(again));

  // The elevation, with a door and a window on it — drawn, not rectangles.
  await page.tap('[data-testid="space-edit-room"]');
  await page.sleep(1600);
  // ADD DOOR and ADD WINDOW — the buttons a client presses, which is the only
  // road that exists: both spread the ENGINE's own `OPENING_DEFAULTS`, and
  // that is where the 850 lives.
  await page.tap('[data-elevation-add="door"]');
  await page.sleep(700);
  await page.tap('[data-elevation-add="window"]');
  await page.sleep(900);
  await shot(page, 'f3-elevation-art.png');
  const art = await page.count('[data-elevation-art="1"]');
  check('the openings are DRAWN — the grip is there and the art beside it', art >= 2, `${art} opening(s)`);

  // THE SILL, proved by what a client SEES rather than by a number in a field:
  // the door stands ON the floor and the window stands OFF it. In the drawing
  // the floor is the bottom, so the window's lower edge must sit ABOVE the
  // door's — which is exactly what a sill of 850 against a sill of 0 means.
  const feet = await page.ask(
    '(() => { const r = (k) => { const el = document.querySelector('
    + '`[data-elevation-kind="${k}"]`); if (!el) return null;'
    + ' const b = el.getBoundingClientRect(); return Math.round(b.bottom); };'
    + ' return { door: r("door"), window: r("window") }; })()',
  );
  check('the door stands on the floor and the window stands off it (the 850 sill)',
    Boolean(feet) && feet.door != null && feet.window != null && feet.window < feet.door,
    JSON.stringify(feet));
  await shot(page, 'f3-sill-850.png');
  await page.close();
}

// ═══ F4 · RAW MDF ══════════════════════════════════════════════════════════
if (runs('f4')) {
  process.stdout.write('\n─── F4 · RAW MDF ───\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.tap('[data-testid="cat-fronts"]');
  await page.sleep(1000);
  check('RAW stands among the front sources', await page.has('[data-front-source="raw"]'));
  await page.tap('[data-front-source="raw"]');
  await page.sleep(1200);
  const note = await page.text('[data-testid="material-raw-note"]');
  check('choosing RAW says its one sentence', /Unpainted/.test(note), note);
  const finish = await page.ask(
    '(() => { const P = window.__cc.project.getState();'
    + ' return P.project.design.fronts.types[0].source; })()',
  );
  check('…and the project is on the raw source', finish === 'raw', String(finish));
  await shot(page, 'f4-raw-chosen.png');
  await page.tap('[data-testid="cat-review"]');
  await page.sleep(1200);
  const summary = await page.text('[data-testid="estimate-summary"]');
  check('REVIEW names it', /Raw MDF/i.test(summary), summary.replace(/\s+/g, ' ').slice(0, 140));
  await shot(page, 'f4-review-names-it.png');
  await page.close();
}

// ═══ F5 · INSIDE OPENS THE DOORS ═══════════════════════════════════════════
if (runs('f5')) {
  process.stdout.write('\n─── F5 · INSIDE OPENS THE DOORS ───\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.evaluate('(() => { const P = window.__cc.project.getState(); P.addDoors(P.units[0].id); return true; })()');
  await page.sleep(900);
  const shut = await page.ask('JSON.stringify(window.__cc.ui.getState().openFronts)');
  await page.tap('[data-testid="cat-inside"]');
  await page.sleep(1600);
  const open1 = await page.ask(
    '(() => { const U = window.__cc.ui.getState(); const P = window.__cc.project.getState();'
    + ' const u = P.units[0]; const doors = (P.unitResult(u.id).panels || [])'
    + '   .filter((p) => p.part === "FRONT").map((p) => p.id);'
    + ' return doors.every((id) => (U.openFronts[u.id] || {})[id] > 0.5); })()',
  );
  check('entering INSIDE opens every door', open1 === true, String(open1));
  await shot(page, 'f5-inside-open.png');
  await page.tap('[data-testid="cat-fronts"]');
  await page.sleep(1500);
  const back = await page.ask('JSON.stringify(window.__cc.ui.getState().openFronts)');
  check('leaving puts back exactly what was there', back === shut, `${shut} → ${back}`);
  await shot(page, 'f5-restored.png');
  await page.close();
}

// ═══ F6 · THE BAY LIGHTS UP ════════════════════════════════════════════════
if (runs('f6')) {
  process.stdout.write('\n─── F6 · THE BAY UNDER THE POINTER ───\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.evaluate(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.updateUnitParams(u.id, { width: 1800 }); return true; })()',
  );
  await page.tap('[data-testid="cat-inside"]');
  await page.sleep(1200);
  await page.typeInto('[data-testid="inside-bays"]', '3');
  await page.sleep(1200);
  // The chip row IS the store's own bay list — asserted against `zonesOf`
  // rather than against the number typed, because the engine decides how many
  // bays a width and a divider count actually make and retail never guesses.
  // `[data-bay]` and not the testid prefix: the ROW carries
  // `inside-bay-chips`, which starts with the same letters and is not a chip.
  const chips = await page.count('[data-bay]');
  const zones = await page.ask(
    '(() => { const P = window.__cc.project.getState();'
    + ' return (P.zonesOf(P.units[0].id) || []).length; })()',
  );
  check('the chip row is the store\'s own bay list, one chip per bay',
    chips > 1 && chips === zones, `${chips} chip(s) · ${zones} bay(s)`);
  const box = await page.box('[data-testid="inside-bay-1"]');
  if (box) {
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: box.x + Math.round(box.w / 2), y: box.y + Math.round(box.h / 2), buttons: 0,
    });
    await page.sleep(600);
    const hint = await page.ask('window.__cc.ui.getState().zoneHint');
    check('hovering bay 2 writes the shared hint the scene draws from', hint === 1, String(hint));
    const lit = await page.ask(
      "document.querySelector('[data-testid=\"inside-bay-1\"]')?.getAttribute('data-on')",
    );
    check('…and the chip lights with it', lit === 'yes', String(lit));
    await shot(page, 'f6-bay-hover.png');
  } else {
    check('the bay chips are on screen', false, 'no chip');
  }
  await page.close();
}

// ═══ F7 · THE SHOE AND THE LIGHT ═══════════════════════════════════════════
if (runs('f7')) {
  process.stdout.write('\n─── F7 · THE SHOE DRAWER AND THE LIGHT ───\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  const before = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.addShelves(u.id, 2); P.setLighting({ on: true });'
    + ' const shelves = (P.unitResult(u.id).panels || []).filter((p) => p.role === "shelf");'
    + ' for (const s of shelves) P.addLightingItem({ unitId: u.id, kind: "shelf", ref: s.id });'
    // The store is re-read AFTER the writes: `P` is a snapshot, and a snapshot
    // taken before a `set` describes the room as it was.
    + ' const d = window.__cc.project.getState().project.design;'
    + ' return { on: d.lighting.on, strips: d.lighting.items.length }; })()',
  );
  check('the wardrobe is lit before the shoe', before.on === true && before.strips >= 2, JSON.stringify(before));
  await shot(page, 'f7-lit-before.png');
  const after = await page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.addShoeDrawer(u.id); const d = window.__cc.project.getState().project.design;'
    + ' return { on: d.lighting.on, strips: d.lighting.items.length }; })()',
  );
  check('adding the shoe drawer leaves the light ON and every strip stored',
    after.on === true && after.strips === before.strips, JSON.stringify(after));
  await shot(page, 'f7-lit-after-shoe.png');
  await page.close();
}

// ═══ F8 · EXTRAS, IN THE JOINER'S ORDER ════════════════════════════════════
if (runs('f8')) {
  process.stdout.write('\n─── F8 · THE JOINER\'S ORDER ───\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.tap('[data-testid="cat-extras"]');
  await page.sleep(1400);
  check('HANDLES stands in EXTRAS', await page.has('[data-testid="extras-handles"]'));
  check('ADD TOP BOX is gone from EXTRAS', !(await page.has('[data-testid="layout-add-top-box"]')));
  check('TO THE CEILING? asks the question', await page.has('[data-testid="extras-to-the-ceiling"]'));
  await shot(page, 'f8-extras.png');

  await page.evaluate(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.updateUnitParams(u.id, { height: 2000 }); P.addEndPanel(u.id, { side: "L" }); return true; })()',
  );
  await page.sleep(900);
  const order = await page.ask(
    '(() => { const P = window.__cc.project.getState();'
    + ' return JSON.stringify(P.closeToCeiling(P.units[0].id).order); })()',
  );
  const steps69 = JSON.parse(order);
  const lastUp = Math.max(...steps69.map((s, i) => (s.startsWith('end-panel') || s.startsWith('side-infill') ? i : -1)));
  check('vertical members first, the horizontal after',
    steps69.indexOf('top-infill') > lastUp, order);
  await shot(page, 'f8-closed-to-ceiling.png');

  // The swing, back in the door's dock.
  await page.evaluate(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' P.updateUnitParams(u.id, { width: 600 }); P.addDoors(u.id); return true; })()',
  );
  await page.sleep(900);
  await select(page, 'FRONT');
  await page.sleep(1400);
  check('the door swing is back in the dock', await page.has('[data-testid="dock-door-swing"]'));
  await shot(page, 'f8-door-swing.png');
  await page.close();
}

// ═══ F9 · A WARDROBE WIDENS BOTH WAYS ══════════════════════════════════════
if (runs('f9')) {
  process.stdout.write('\n─── F9 · WIDENING BOTH WAYS ───\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  // ─── THE SCENE ─────────────────────────────────────────────────────────
  //
  // Three wardrobes. The FIRST is parked at the wall by the store's own rules,
  // so it is the wall's anchor and not the subject; the SUBJECT is the middle
  // one, which has empty floor on its left and a neighbour hard on its right.
  // That is the owner's own case — *"beside an existing neighbour it grows
  // only right"* — and it is the one that could not be built by assuming a
  // coordinate.
  const moved = await page.ask(
    '(() => { const S = () => window.__cc.project.getState();'
    + ' const at = (id) => S().units.find((u) => u.id === id);'
    + ' const add = (w, x) => { const r = S().addUnit("WARDROBE",'
    + '     { params: { width: w, height: 2200, depth: 600 } });'
    + '   S().updateUnitParams(r.id, { width: w }); S().moveUnit(r.id, x, 1); return r.id; };'
    + ' const a = S().units[0]; S().updateUnitParams(a.id, { width: 800 });'
    + ' const mid = add(900, 1800);'
    + ' const mx = at(mid).position.x_mm; const mw = at(mid).params.width;'
    + ' const right = add(600, mx + mw + 60);'
    + ' const was = at(mid).position.x_mm;'
    + ' const room = at(right).position.x_mm - (was + at(mid).params.width);'
    + ' S().updateUnitParams(mid.id || mid, { width: at(mid).params.width + room + 400 });'
    + ' const now = at(mid);'
    + ' return { was: Math.round(was), x: Math.round(now.position.x_mm),'
    + '   w: Math.round(now.params.width), room: Math.round(room),'
    + '   rx: Math.round(at(right).position.x_mm),'
    + '   ax: Math.round(at(a.id).position.x_mm + at(a.id).params.width) }; })()',
  );
  check('with a neighbour hard on its right it takes the room on its LEFT',
    moved.x < moved.was && moved.w > 900, JSON.stringify(moved));
  check('…and it walks over neither neighbour',
    moved.x + moved.w <= moved.rx && moved.x >= moved.ax, JSON.stringify(moved));
  await shot(page, 'f9-widened-left.png');
  await page.close();
}

// ═══ F10 · THE ROOM COMES FIRST ════════════════════════════════════════════
if (runs('f10')) {
  process.stdout.write('\n─── F10 · WHERE ───\n');
  const page = await open();
  await room(page, 'where');
  await page.sleep(900);
  const order = await page.ask(
    '(() => { const p = document.querySelector(\'[data-testid="panel-where"]\');'
    + ' const r = p?.querySelector(\'[data-testid="space-edit-room"]\');'
    + ' const a = p?.querySelector(\'[data-testid="where-add-wardrobe"]\');'
    + ' if (!r || !a) return null;'
    + ' return { room: Math.round(r.getBoundingClientRect().top), add: Math.round(a.getBoundingClientRect().top) }; })()',
  );
  check('EDIT THE ROOM sits ABOVE ADD A WARDROBE on the glass',
    Boolean(order) && order.room < order.add, JSON.stringify(order));
  await shot(page, 'f10-where.png');
  await page.close();
}

// ═══ THE LAZY RUN ══════════════════════════════════════════════════════════
//
// The standing law: every step has an answer, and a client who presses NEXT
// seven times lands on an estimate. Tonight it is run again because F10 moved
// a control in WHERE and F8 moved two in EXTRAS.
if (runs('lazy')) {
  process.stdout.write('\n─── THE LAZY RUN ───\n');
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
// ═══ THE LEDGER ════════════════════════════════════════════════════════════
//
// Appended, not overwritten — this container runs one Chromium at a time
// comfortably and no more, so the walk is run in SECTIONS and each run adds
// its own block. The committed `walk.txt` is then one honest record of the
// runs that took the committed frames.
const fresh = process.argv.includes('--fresh');
const failed = steps.filter((s) => !s.ok);
const previous = !fresh && existsSync(`${SHOTS}walk.txt`)
  ? readFileSync(`${SHOTS}walk.txt`, 'utf8').replace(/\n?\d+ checks · \d+ failed\n*$/, '')
  : '';
const before = (previous.match(/^ (ok|FAIL) /gm) || []).length;
const beforeFailed = (previous.match(/^FAIL /gm) || []).length;
writeFileSync(`${SHOTS}walk.txt`, [
  previous || [
    '─── T69 · THE ACCEPTANCE WALK ───',
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
