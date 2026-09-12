#!/usr/bin/env node
// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 67) ───────────────────────
//
// `npm test` and `npm run build` can both be green while the thing on screen is
// wrong, because neither of them opens a browser. Every claim T67 makes about a
// PAGE ends in a frame under `verify/t67/`.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t67-walk.mjs             every section
//   node scripts/t67-walk.mjs f1 f3       some of them
//
// THE HARDWARE IS SERVED FROM THE SILENT SHOWROOM (T23 R8): this container's
// egress answers ERR_TUNNEL to the real bucket, and the room WAITS on it — so
// the walk serves `test/fixtures/hardware-local/` and points the page at it
// through the one documented `localStorage['cc.hardwareBase']` knob. Without
// that the design room never finishes "Setting the room out…", which is what
// the first run of this file found.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t67/', import.meta.url).pathname;
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
    + ' P.newProject("T67 · the room in one window", { number: "67" });'
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

// ═══ F1 · THE ROOM IN ONE WINDOW ═══════════════════════════════════════════

if (runs('f1')) {
  process.stdout.write('\nF1 · the room in one window — plan on top, elevation below\n');

  // ── PRO ──
  const pro = await open();
  await proRoom(pro);
  const plan = await pro.box('[data-room-plan-half="1"]');
  const dock = await pro.box('[data-elevation-dock="1"]');
  check('PRO · the plan is drawn', Boolean(plan), JSON.stringify(plan));
  check('PRO · the elevation is docked BELOW it, in the same window',
    Boolean(dock) && Boolean(plan) && dock.y > plan.y, `plan y=${plan?.y} · dock y=${dock?.y}`);
  check('PRO · ONE window — the elevation brought no second shell to the screen',
    (await pro.count('[data-modal-shell]')) === 2, `${await pro.count('[data-modal-shell]')} shell(s) (the room, and the docked elevation inside it)`);
  check('PRO · the docked elevation draws no second row of navigation',
    (await pro.ask('[...document.querySelectorAll("[data-modal-footer]")].filter((e) => e.offsetParent !== null).length')) === 0,
    'no visible modal footer');
  check('PRO · the window\'s own Cancel/Apply stand at its foot',
    await pro.has('[data-room-actions="1"]'));
  check('PRO · no L-shape and no + Box', !(await pro.has('[data-room-preset="L"]')) && !(await pro.has('[data-insert-box="1"]')));
  check('PRO · the three tools stand beside the plan',
    (await pro.has('[data-room-preset="rect"]')) && (await pro.has('[data-room-draw="1"]'))
    && (await pro.has('[data-import-dxf="1"]')));
  await shot(pro, 'f1-pro-one-window.png');

  // …and a wall click swaps the elevation IN PLACE.
  const first = await pro.ask('document.querySelector(\'[data-elevation-dock="1"]\')?.dataset.elevationWall');
  const pressed = await clickWall(pro, 1);
  const after = await pro.ask('document.querySelector(\'[data-elevation-dock="1"]\')?.dataset.elevationWall');
  note('PRO\'s plan offers these walls', JSON.stringify(pressed?.walls));
  check('PRO · clicking wall 2 in the plan swaps the elevation below it',
    first === '0' && after === '1', `${first} → ${after}`);
  check('PRO · …and wall 2 is the one highlighted',
    (await pro.ask('document.querySelector(\'[data-plan-wall="1"]\')?.dataset.planWallActive')) === '1');
  await shot(pro, 'f1-pro-wall-2-clicked.png');

  // DRAW ROOM opens, from the new layout.
  await pro.tap('[data-room-draw="1"]');
  check('PRO · DRAW ROOM opens its window', await pro.has('[data-modal-name="draw-room"]'));
  await shot(pro, 'f1-pro-draw-room.png');
  await pro.close();

  // ── RETAIL ──
  const page = await open();
  await retailRoom(page);
  const rPlan = await page.box('[data-room-plan-half="1"]');
  const rDock = await page.box('[data-elevation-dock="1"]');
  check('retail · the same window, the same shape',
    Boolean(rPlan) && Boolean(rDock) && rDock.y > rPlan.y, `plan y=${rPlan?.y} · dock y=${rDock?.y}`);
  check('retail · no L-shape and no + Box',
    !(await page.has('[data-room-preset="L"]')) && !(await page.has('[data-insert-box="1"]')));
  await shot(page, 'f1-retail-one-window.png');
  const rPressed = await clickWall(page);
  note('retail\'s plan offers these walls — ONE WALL is the client\'s job (T64 F1.8)',
    JSON.stringify(rPressed?.walls));
  check('retail · the plan click chooses the wall the elevation is drawn from',
    rPressed && (await page.ask('document.querySelector(\'[data-elevation-dock="1"]\')?.dataset.elevationWall'))
      === String(rPressed.index), `wall ${rPressed?.index}`);
  await shot(page, 'f1-retail-wall-2-clicked.png');

  // THE BUTTON THAT HAD NO WINDOW.
  await page.tap('[data-room-draw="1"]');
  check('retail · DRAW ROOM opens the window it never had', await page.has('[data-modal-name="draw-room"]'));
  await shot(page, 'f1-retail-draw-room.png');
  await page.close();
}

// ═══ F2 · THE CORNER LAW ═══════════════════════════════════════════════════

if (runs('f2')) {
  process.stdout.write('\nF2 · one ceiling, so the heights agree at a corner\n');
  // PRO's whole room, because a CORNER needs two walls that meet: retail's job
  // is ONE WALL (T64 F1.8) and its two returns are stubs. The LAW is the
  // shared core's and both apps read the same functions.
  const page = await open();
  await proRoom(page);
  // A SLOPE on wall 1, written the way the elevation editor writes it.
  await page.evaluate(
    '(() => { const s = window.__cc.project.getState();'
    + ' s.setWallSlopes([{ id: "sl_walk", kind: "slope", wall: 0, side: "R", startHeight: 1800, run: 900 }]);'
    + ' return true; })()',
  );
  await page.sleep(1400);
  const low = await page.ask('[...document.querySelectorAll("[data-low-corner]")].map((e) => [e.dataset.lowCorner, e.dataset.lowCornerMm])');
  check('the plan marks the corner the ceiling comes down to',
    JSON.stringify(low).includes('1800'), JSON.stringify(low));
  await shot(page, 'f2-plan-low-corner.png');

  // …and the NEIGHBOUR says so, read-only, when it is the wall on show.
  await clickWall(page, 1);
  const said = await page.text('[data-implied-profile]');
  const mm = await page.ask('document.querySelector("[data-implied-profile]")?.dataset.impliedMm');
  check('wall 2 shows the implied profile it did not ask for',
    Number(mm) === 1800, `${mm} mm — ${said.replace(/\s+/g, ' ').slice(0, 120)}`);
  check('…and it names the wall that put it there',
    (await page.ask('document.querySelector("[data-implied-profile]")?.dataset.impliedBecause')) === '0');
  await shot(page, 'f2-neighbour-implied-profile.png');

  // THE 3D ROOM, with the slope in it — the room as the corner law leaves it.
  await page.evaluate('(() => { window.__cc.ui.getState().closeModal(); return true; })()');
  await page.sleep(2000);
  await shot(page, 'f2-3d-room-with-the-slope.png');
  note('the 3D room draws each wall from its own slopes — the corner law reaches '
    + 'it in one line of `src/3d/Room.jsx`, which tonight\'s licence does not name (SKIPPED, see the PR)');
  await page.close();
}

// ═══ F3 · WHAT — A CLEAN LIST AND ONE QUIET NOTE ═══════════════════════════

if (runs('f3')) {
  process.stdout.write('\nF3 · WHAT — the clean list, and the card\n');
  const page = await open();
  await room(page, 'what');
  const perTile = await page.count('[data-testid="what-tiles"] .pbi-chip-reason');
  check('not one tile carries a line of its own', perTile === 0, `${perTile} line(s)`);
  check('one note stands under the list', await page.has('[data-testid="what-note"]'));
  await shot(page, 'f3-clean-list.png');

  // OPEN THE CARD THE WAY A KEYBOARD DOES — which is the half CLAUDE.md names
  // (*"Keyboard-reachable"*) and the half a disabled chip cannot do for itself.
  // React listens on the native `focusin`, so `.focus()` is a real gesture
  // here; a synthetic `mouseenter` is not, because React delegates hover
  // through `mouseover`/`mouseout` and never sees a dispatched `mouseenter`.
  const focused = await page.ask(
    '(() => { const el = document.querySelector(\'[data-testid="coming-soon"]\');'
    + ' if (!el) return false; el.focus(); return document.activeElement === el; })()',
  );
  check('an inactive tile takes the keyboard\'s focus', focused === true);
  check('…and the mouse opens its card', await hover(page, '[data-testid="coming-soon"]'));
  const card = await page.text('[data-testid="coming-soon-card"]');
  check('an inactive tile says COMING SOON and gives the address',
    /Coming soon/i.test(card) && /Cabinetcore@gmail\.com/.test(card), card.replace(/\s+/g, ' ').slice(0, 120));
  await shot(page, 'f3-coming-soon-card.png');

  // A REAL press — the clipboard is gated on a user gesture, and a synthetic
  // `.click()` is not one.
  await page.click('[data-testid="coming-soon-copy"]');
  await page.sleep(700);
  const word = await page.text('[data-testid="coming-soon-copy"]');
  check('pressing COPY says COPIED', word === 'COPIED', word);
  await shot(page, 'f3-coming-soon-copied.png');
  await page.close();
}

// ═══ F4 · THE SOURCE BUTTON SAYS DECOR ═════════════════════════════════════

if (runs('f4')) {
  process.stdout.write('\nF4 · the source chip says DECOR\n');
  const page = await open();
  await room(page, 'inside');
  await withWardrobe(page);
  await page.tap('[data-testid="cat-inside"]');
  const carcass = await page.text('[data-carcass-source="egger"]');
  check('INSIDE · the carcass source chip reads DECOR', carcass === 'DECOR', carcass);
  await shot(page, 'f4-inside-decor.png');
  await page.tap('[data-testid="cat-fronts"]');
  const front = await page.text('[data-front-source="laminate"]');
  check('FRONTS · the colour row\'s source chip reads DECOR too', front === 'DECOR', front);
  await shot(page, 'f4-fronts-decor.png');
  // …and EGGER is still on the boards, INSIDE the picker window, where the
  // licence puts it — the owner struck the name off the BUTTON, not the board.
  await page.tap('[data-front-source="laminate"]');
  await page.sleep(700);
  await page.tap('[data-testid="material-slot-front"] [data-change-decor], [data-testid="material-slot-front"] [data-choose-decor]');
  await page.sleep(1400);
  check('the DECOR chip opens PRO\'s own tiled picker', await page.has('[data-decor-grid="1"]'));
  const tiles = await page.ask(
    '((document.querySelector(\'[data-decor-picker-modal]\')?.textContent || "").match(/EGGER/g) || []).length',
  );
  check('the EGGER name is still on the boards, inside the picker', tiles > 0, `${tiles} mention(s)`);
  await shot(page, 'f4-picker-egger-on-the-tiles.png');
  await page.close();
}

// ═══ F5 · THE DEFAULT DECOR ════════════════════════════════════════════════

if (runs('f5')) {
  process.stdout.write('\nF5 · a fresh design is H3325 Gladstone Oak\n');
  const page = await open();
  await room(page, 'what');
  await page.tap('[data-testid="cat-where"]');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.sleep(1800);
  const decor = await page.ask('window.__cc.project.getState().project.design.carcass.types[0].finish_id');
  check('the fresh design\'s carcass is H3325', /H3325/.test(String(decor)), String(decor));
  await shot(page, 'f5-fresh-design-front-view.png');
  await page.tap('[data-testid="cat-review"]');
  await page.sleep(1200);
  const summary = await page.text('[data-testid="estimate-summary"]');
  check('REVIEW names H3325', /H3325/.test(summary), summary.replace(/\s+/g, ' ').slice(0, 160));
  await shot(page, 'f5-review-names-h3325.png');
  await page.close();
}

// ═══ F6 · THE INSIDE COLOUR ROW IS GONE ════════════════════════════════════

if (runs('f6')) {
  process.stdout.write('\nF6 · the duplicate dies\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.tap('[data-testid="cat-inside"]');
  check('INSIDE has no INSIDE COLOUR row', !(await page.has('[data-testid="inside-colour"]')));
  check('…and the carcass slot is still the first thing in it',
    await page.has('[data-testid="inside-material"]'));
  await shot(page, 'f6-inside-without-the-row.png');
  // THE ONE PATH, driven the way a client drives it: open the slot's own
  // picker and press a board. Nothing else on this page can write the
  // interior finish now, which is the whole of F6.
  const before = await page.ask('window.__cc.project.getState().project.design.carcass.types[0].finish_id');
  await page.tap('[data-testid="inside-material"] [data-change-decor], [data-testid="inside-material"] [data-choose-decor]');
  await page.sleep(1200);
  check('the carcass slot opens PRO\'s own tiled picker', await page.has('[data-decor-grid="1"]'));
  await shot(page, 'f6-carcass-picker-open.png');
  const picked = await page.ask(
    '(() => { const t = [...document.querySelectorAll("[data-egger-tile]")]'
    + '   .find((e) => e.dataset.eggerTile !== "H3325_28");'
    + ' if (!t) return null; t.click(); return t.dataset.eggerTile; })()',
  );
  await page.sleep(1600);
  const after = await page.ask('window.__cc.project.getState().project.design.carcass.types[0].finish_id');
  check('the carcass picker is the one write path for the interior finish',
    Boolean(picked) && before !== after, `${before} → ${after} (picked ${picked})`);
  await shot(page, 'f6-carcass-picker-changes-the-interior.png');
  await page.close();
}

// ═══ F7 · THE LEFT COLUMN STAYS FOLDED ═════════════════════════════════════

if (runs('f7')) {
  process.stdout.write('\nF7 · left adds, right edits\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.evaluate(
    '(() => { const s = window.__cc.project.getState(); s.addDrawers(s.units[0].id, 3); return true; })()',
  );
  await page.sleep(1600);
  await page.tap('[data-testid="cat-inside"]');
  const count = await page.text('[data-testid="interior-count-drawers"]');
  check('the row says Drawers · 3', count === '3', count);
  for (const gone of ['drawers-count', 'drawers-insert', 'drawers-glass', 'drawers-front-height']) {
    check(`…and ${gone} does not expand beneath it`, !(await page.has(`[data-testid="${gone}"]`)));
  }
  await shot(page, 'f7-inside-column-short.png');

  await page.tap('[data-testid="interior-open-drawers"]');
  await page.sleep(1400);
  check('pressing the row docks the stack\'s controls on the RIGHT',
    await page.has('[data-testid="dock-rehomed"]'));
  for (const there of ['drawers-count', 'drawers-insert', 'drawers-glass']) {
    check(`…${there} is on the right`, await page.has(`[data-testid="dock-rehomed"] [data-testid="${there}"]`));
  }
  await shot(page, 'f7-stack-controls-docked-right.png');
  await page.close();
}

// ═══ F8 · THE RIGHT LIST IS NAMES ══════════════════════════════════════════

if (runs('f8')) {
  process.stdout.write('\nF8 · the list is names, not sentences\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.evaluate(
    '(() => { const s = window.__cc.project.getState(); const id = s.units[0].id;'
    + ' s.addDrawers(id, 3); s.addWatchDrawer(id); return true; })()',
  );
  await page.sleep(1800);
  await page.tap('[data-testid="cat-inside"]');
  await page.tap('[data-testid="interior-open-drawers"]');
  await page.sleep(1400);
  const names = await page.ask('[...document.querySelectorAll(\'[data-testid="dock-drawer-list"] [data-drawer-name]\')].map((e) => e.dataset.drawerName)');
  check('every drawer is a NAME', Array.isArray(names) && names.length >= 3, JSON.stringify(names));
  check('…and the accessories one is named', JSON.stringify(names).includes('Accessories drawer'), JSON.stringify(names));
  const said = await page.count('[data-testid="dock-drawer-list"] p');
  check('not one sentence stands in the list', said === 0, `${said} paragraph(s)`);
  await shot(page, 'f8-list-as-names.png');

  await page.tap('[data-testid="dock-drawer-1"]');
  await page.sleep(1300);
  check('clicking one opens ITS own detail', await page.has('[data-drawer-height]'));
  await shot(page, 'f8-one-drawer-open-with-its-sentence.png');
  await page.close();
}

// ═══ F9 · ACCESSORIES DRAWER, BOTH APPS ════════════════════════════════════

if (runs('f9')) {
  process.stdout.write('\nF9 · the accessories drawer, in PRO and in retail\n');
  // PRO, with the ROW actually on the screen — a start screen that says
  // nothing proves nothing, so the walk opens a project, adds a stack and
  // opens PRO's own "What goes inside" list.
  const pro = await open();
  await pro.showroom(`${BASE}index.html`);
  await pro.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
  await pro.evaluate(
    '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
    + ' P.newProject("T67 · the accessories drawer", { number: "67" });'
    + ' U.openEditor(); U.selectUnit(null); return true; })()',
  );
  await pro.waitFor('window.__cc.views && (window.__cc.views.room || window.__cc.views.editor)', { timeout: 30000 });
  await pro.sleep(1400);
  const made = await pro.ask(
    '(() => { const P = window.__cc.project.getState();'
    + ' const r = P.addUnit("WARDROBE"); const id = r?.id || r?.unit?.id'
    + '   || window.__cc.project.getState().units.slice(-1)[0]?.id;'
    + ' if (!id) return null; window.__cc.project.getState().addDrawers(id, 3);'
    + ' window.__cc.ui.getState().selectUnit(id); return id; })()',
  );
  await pro.sleep(1600);
  await pro.evaluate(
    '(() => { const id = window.__cc.project.getState().units.slice(-1)[0]?.id;'
    + ' window.__cc.ui.getState().openModal("add-items", { unitId: id }); return true; })()',
  );
  await pro.sleep(1400);
  const row = await pro.ask(
    '(() => { const el = [...document.querySelectorAll("[data-add-kind]")]'
    + '   .find((e) => e.dataset.addKind === "watch_drawer"); return el ? el.textContent.trim() : null; })()',
  );
  check('PRO\'s own list row says Accessories drawer',
    typeof row === 'string' && /Accessories drawer/.test(row), `${row} (unit ${made})`);
  const proSays = await pro.ask('(document.body.textContent.match(/Watch drawer/g) || []).length');
  check('…and nothing on PRO\'s page says "Watch drawer"', proSays === 0, `${proSays} mention(s)`);
  await shot(pro, 'f9-pro-accessories-drawer.png');
  await pro.close();

  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.evaluate(
    '(() => { const s = window.__cc.project.getState(); const id = s.units[0].id;'
    + ' s.addDrawers(id, 3); s.addWatchDrawer(id); return true; })()',
  );
  await page.sleep(1800);
  await page.tap('[data-testid="cat-inside"]');
  const text = await page.text('[data-testid="interior-watch"]');
  check('retail\'s INSIDE row says Accessories drawer', /Accessories drawer/.test(text), text.replace(/\s+/g, ' '));
  check('…and nothing on the page says Watch drawer',
    (await page.ask('(document.body.textContent.match(/Watch drawer/g) || []).length')) === 0);
  await shot(page, 'f9-retail-accessories-drawer.png');
  await page.close();
}

// ═══ F10 · THE ACCESSORIES LED AT 25% ══════════════════════════════════════
//
// ─── HOW THE BEFORE/AFTER PAIR IS HONEST ───────────────────────────────────
//
// The owner asked for *"the open accessories drawer before/after"*, and the
// CAP makes a fake BEFORE impossible on purpose: `src/3d/LedStrips.jsx` clamps
// whatever the profile asks for to 25%, so lifting the profile key in the
// browser changes nothing — which is the point, and which is why the first run
// of this walk produced two identical frames.
//
// So the pair is taken from TWO BUILDS of the same scene, by
// `scripts/t67-led-pair.sh`: the AFTER from the build that ships, and the
// BEFORE from a build with the constant and the key temporarily at 1 — which
// is exactly what the app did yesterday. Each frame says which it is, out of
// the page's own profile, so neither can be mislabelled.
//
//   node scripts/t67-walk.mjs f10          the shipped build → the AFTER frame
//   node scripts/t67-walk.mjs f10before    a build at 1      → the BEFORE frame

/** The whole fitting, open and lit — the scene both frames photograph. */
async function litAccessoriesDrawer(page) {
  await room(page);
  await withWardrobe(page);
  // THE WHOLE FITTING, the way a client builds it: a stack, the accessories
  // drawer on top of it, a shelf over that, and the glass in the shelf — which
  // is what BIRTHS the ring that lights the watches (`engine/cabinet.js`, the
  // T53 block). Without the pane there is no lamp to photograph.
  await page.evaluate(
    '(() => { const P = () => window.__cc.project.getState(); const id = P().units[0].id;'
    + ' P().addDrawers(id, 3); P().addWatchDrawer(id); P().addShelves(id, 1);'
    + ' const items = P().units.find((u) => u.id === id).params.sections[0].items;'
    + ' const top = items.filter((i) => i.kind === "drawer").slice(-1)[0];'
    + ' if (top) P().setWatchShelfGlass(id, top.id, true);'
    + ' return true; })()',
  );
  await page.sleep(2200);
  // OPEN THE DRAWER AND TURN THE LIGHT ON — a closed wardrobe shows neither.
  await page.evaluate(
    '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
    + ' const d = P.project.design || {};'
    + ' P.setDesign({ lighting: { ...(d.lighting || {}), on: true } });'
    + ' U.setHideFronts(true); return true; })()',
  );
  await page.sleep(1200);
  await page.tap('[data-testid="view-open-all"]');
  await page.sleep(900);
  await page.tap('[data-testid="view-inside"]');
  await page.sleep(2200);
  return page.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' const r = P.unitResult(u.id); const panes = (r.assemblies && r.assemblies.watchGlass) || [];'
    + ' return panes.map((p) => p.strip && p.strip.id); })()',
  );
}

const runningGain = (page) => page.ask(
  'window.__cc.profile.getState().profile.appearance.lighting.accessoryDrawerGain',
);

if (runs('f10')) {
  process.stdout.write('\nF10 · the accessories drawer\'s LED, at the owner\'s quarter\n');
  const page = await open();
  const lit = await litAccessoriesDrawer(page);
  check('the accessories drawer has its own aimed LED in the room',
    Array.isArray(lit) && lit.some((id) => /:watch-glass$/.test(String(id))), JSON.stringify(lit));
  const gain = await runningGain(page);
  check('the page is running at the owner\'s quarter', Math.abs(Number(gain) - 0.25) < 1e-9, String(gain));
  await shot(page, 'f10-accessories-led-after-25pc.png');
  await page.close();
}

if (runs('f10before')) {
  process.stdout.write('\nF10 · the SAME scene on a build with the cap at 1 — the BEFORE frame\n');
  const page = await open();
  const lit = await litAccessoriesDrawer(page);
  check('the same fitting, the same lamp', Array.isArray(lit) && lit.length > 0, JSON.stringify(lit));
  const gain = await runningGain(page);
  check('…and THIS build is the one at 1 — the frame is not mislabelled',
    Math.abs(Number(gain) - 1) < 1e-9, String(gain));
  await shot(page, 'f10-accessories-led-before-100pc.png');
  await page.close();
}

// ═══ THE LAZY CLIENT · FROM THE EMPTY ROOM TO ADD TO MY ESTIMATE ═══════════
//
// T66's own walk, at TONIGHT's defaults. *"Every step has a sensible answer
// already chosen. NEXT always works."*  Seven clicks, and the wardrobe it ends
// on is wine on H3325 Gladstone Oak (F5) rather than wine on walnut.

if (runs('lazy')) {
  process.stdout.write('\nLAZY · the empty room to ADD TO MY ESTIMATE, at the new defaults\n');
  const page = await open();
  await room(page, 'what');
  await shot(page, 'lazy-01-what.png');
  await page.tap('[data-testid="step-next"]');
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
  await shot(page, 'lazy-07-review.png');
  const summary = await page.text('[data-testid="estimate-summary"]');
  check('seven clicks end on a wine-on-H3325 wardrobe',
    /Wine Red/i.test(summary) && /H3325/.test(summary), summary.replace(/\s+/g, ' ').slice(0, 180));
  check('…and INSIDE asked its question ONCE — no INSIDE COLOUR row on the way past',
    !(await page.has('[data-testid="inside-colour"]')));
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

// ─── THE LEDGER IS APPENDED, NOT OVERWRITTEN ──────────────────────────────
//
// This container runs one Chromium at a time comfortably and no more: a walk
// that launches seventeen of them in one process starves and stops answering.
// So the walk is run in SECTIONS — which is what its own usage line has always
// offered — and each run APPENDS its own block to the ledger, so the committed
// `walk.txt` is one honest record of the runs that took the committed frames
// rather than the last run overwriting the rest.
//
//   node scripts/t67-walk.mjs --fresh f1 f2    start a new ledger
//   node scripts/t67-walk.mjs f3               add to it
const fresh = process.argv.includes('--fresh');
const failed = steps.filter((s) => !s.ok);
const previous = !fresh && existsSync(`${SHOTS}walk.txt`)
  ? readFileSync(`${SHOTS}walk.txt`, 'utf8').replace(/\n?\d+ checks · \d+ failed\n*$/, '')
  : '';
const before = (previous.match(/^ (ok|FAIL) /gm) || []).length;
const beforeFailed = (previous.match(/^FAIL /gm) || []).length;
writeFileSync(`${SHOTS}walk.txt`, [
  previous || [
    '─── T67 · THE ACCEPTANCE WALK ───',
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
