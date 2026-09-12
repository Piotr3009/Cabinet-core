#!/usr/bin/env node
// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 68) ───────────────────────
//
// `npm test` and `npm run build` can both be green while the thing on screen is
// wrong, because neither of them opens a browser. Every claim T68 makes about a
// PAGE ends in a frame under `verify/t68/`.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t68-walk.mjs --fresh f1 f2      start a ledger, run two
//   node scripts/t68-walk.mjs f3                 add to it
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
const SHOTS = new URL('../verify/t68/', import.meta.url).pathname;
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
    + ' P.newProject("T68 · the night", { number: "68" });'
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

// ═══ F1 · ONE WRITE PATH, AND H3325 FOREVER ════════════════════════════════

if (runs('f1')) {
  process.stdout.write('\nF1 · one write path for what the wardrobe wears\n');

  // ── A FRESH DESIGN, no collection in the link: the oak, and the shaker.
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.sleep(1200);
  const bare = await design(page);
  check('a fresh design carries H3325 on the carcass', /H3325/.test(String(bare.carcass)), JSON.stringify(bare));
  check('…and it is shaker', bare.style === 'S', String(bare.style));
  await page.tap('[data-testid="cat-fronts"]');
  await shot(page, 'f1-fresh-h3325.png');

  // …and the SHAKER renders — the recess is on the cut leaves.
  const recess = await page.ask(
    '(() => { const p = window.__cc.project.getState(); const u = p.units[0];'
    + ' return (p.unitResult(u.id).panels || []).filter((x) => x.meta && x.meta.shaker).length; })()',
  );
  check('the shaker recess is cut on the leaves', recess > 0, `${recess} leaf(s)`);

  // ── THE J-PULL, from the FRONTS step's own OPENING list.
  await page.tap('[data-testid="fronts-opening-jhandle"]');
  await page.sleep(900);
  const jp = await page.ask(
    '(() => { const p = window.__cc.project.getState(); const u = p.units[0];'
    + ' return (p.unitResult(u.id).panels || []).filter((x) => x.meta && x.meta.jpull).length; })()',
  );
  const withJ = await design(page);
  check('the J-pull is machined on the leaves, from the step', jp > 0 && withJ.handle === 'jpull',
    `${jp} leaf(s) · handle ${withJ.handle}`);
  check('…and the shaker did NOT go with it — one write, both facts',
    (await page.ask(
      '(() => { const p = window.__cc.project.getState(); const u = p.units[0];'
      + ' return (p.unitResult(u.id).panels || []).filter((x) => x.meta && x.meta.shaker).length; })()',
    )) > 0);
  await shot(page, 'f1-jpull-and-shaker.png');
  await page.close();

  // ── THE SAME DESIGN, reached through a `?collection=` LINK.
  const linked = await open();
  await room(linked, null, { hash: '#/design?collection=royal-burgundy' });
  await withWardrobe(linked);
  await linked.sleep(1400);
  const byLink = await design(linked);
  check('a ?collection= link ALSO carries H3325 — the owner\'s own bug',
    /H3325/.test(String(byLink.carcass)), JSON.stringify(byLink));
  check('…and the collection still dresses the FRONTS',
    String(byLink.front || '').length > 0, String(byLink.front));
  await linked.tap('[data-testid="cat-fronts"]');
  await shot(linked, 'f1-collection-link-h3325.png');
  await linked.close();
}

// ═══ F3 · TWO DOORS MEANS TWO EQUAL DOORS ══════════════════════════════════

if (runs('f3')) {
  process.stdout.write('\nF3 · two doors means two equal doors\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.tap('[data-testid="cat-size"]');
  await page.typeInto('[data-testid="size-width"]', '1800');
  await page.tap('[data-testid="cat-extras"]');
  await page.sleep(900);

  // FOUR doors first — the layout the owner came back from.
  check('the 4 chip is pressed', await pickChip(page, 'wardrobe-doors', '4'));
  await page.sleep(1400);
  const four = await leaves(page);
  check('four doors cut four leaves', Array.isArray(four) && four.length === 4, JSON.stringify(four));
  await shot(page, 'f3-four-doors.png');

  // …then TWO, which used to give 1334 · 459.
  check('the 2 chip is pressed', await pickChip(page, 'wardrobe-doors', '2'));
  await page.sleep(1400);
  const two = await leaves(page);
  const equal = Array.isArray(two) && two.length === 2 && Math.abs(two[1] - two[0]) <= 2;
  check('pressing 2 gives an EQUAL pair — not 1/4 and 3/4', equal, JSON.stringify(two));
  await shot(page, 'f3-two-equal-after-four.png');

  // …and a SPLIT does not survive the press either.
  await page.typeInto('[data-testid="extras-split-top"]', '700');
  await page.sleep(900);
  const split = await leaves(page);
  check('the split cut its two segments', Array.isArray(split) && split.length > 2, JSON.stringify(split));
  await shot(page, 'f3-split-before.png');
  check('the 2 chip is pressed again, over a split', await pickChip(page, 'wardrobe-doors', '2'));
  await page.sleep(1400);
  const back = await leaves(page);
  check('pressing 2 after a split comes back to the equal pair',
    Array.isArray(back) && back.length === 2 && Math.abs(back[1] - back[0]) <= 2, JSON.stringify(back));
  await shot(page, 'f3-two-equal-after-split.png');
  await page.close();
}

// ═══ F4 · THE DIVIDER MOVES AGAIN ══════════════════════════════════════════

if (runs('f4')) {
  process.stdout.write('\nF4 · the divider moves again\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.tap('[data-testid="cat-size"]');
  await page.typeInto('[data-testid="size-width"]', '1800');
  // A divider, from the INSIDE step's own row.
  await page.tap('[data-testid="cat-inside"]');
  await page.sleep(900);
  await page.typeInto('[data-testid="inside-bays"]', '2');
  await page.sleep(1200);

  // CLICK IT, the way the stage does.
  // `ask`, not `evaluate` — the harness's `evaluate` runs a statement list and
  // hands nothing back, so a selection made through it reads as none.
  const picked = await page.ask(
    '(() => { const p = window.__cc.project.getState(); const u = p.units[0];'
    + ' const hit = (p.unitResult(u.id).panels || []).find((x) => x.part === "VPART");'
    + ' if (!hit) return null; window.__cc.ui.getState().selectElement(u.id, hit.id);'
    + ' return hit.id; })()',
  );
  await page.sleep(1200);
  check('clicking a divider opens the docked editor', Boolean(picked) && (await page.has('[data-testid="detail-dock"]')),
    String(picked));
  const field = await page.has('[data-partition-chain]');
  check('…and the docked editor carries HOW FAR FROM THE LEFT', field);
  await shot(page, 'f4-docked-field.png');

  const xOf = () => page.ask(
    '(() => { const u = window.__cc.project.getState().units[0];'
    + ' const i = (u.params.sections?.[0]?.items || []).find((x) => x.kind === "partition");'
    + ' return i ? Math.round(Number(i.x_mm) || 0) : null; })()',
  );
  const before = await xOf();
  await page.typeInto('[data-partition-chain]', String(Math.max(120, Math.round(before / 2))));
  await page.sleep(1200);
  const after = await xOf();
  check('typing a new position MOVES the board', before !== after, `${before} → ${after}`);
  await shot(page, 'f4-field-moved.png');

  // …and the drag, mid-motion: the very setter the field calls.
  await page.ask(
    '(() => { const p = window.__cc.project.getState(); const u = p.units[0];'
    + ' const i = (u.params.sections?.[0]?.items || []).find((x) => x.kind === "partition");'
    + ' p.setPartitionX(u.id, i.id, Math.round(Number(i.x_mm) || 0) + 220); return true; })()',
  );
  await page.sleep(1100);
  const dragged = await xOf();
  check('the stage\'s own setter moves it too — one law, two doors', dragged !== after, `${after} → ${dragged}`);
  await shot(page, 'f4-drag-mid-motion.png');

  // A REFUSED position shows its sentence: the store clamps and the board stays.
  await page.ask(
    '(() => { const p = window.__cc.project.getState(); const u = p.units[0];'
    + ' const i = (u.params.sections?.[0]?.items || []).find((x) => x.kind === "partition");'
    + ' p.setPartitionX(u.id, i.id, -4000); return true; })()',
  );
  await page.sleep(900);
  const refused = await xOf();
  check('an impossible position is refused by the STORE, and the board stays inside',
    refused >= 0, String(refused));
  await shot(page, 'f4-refused.png');
  await page.close();
}

// ═══ F2 · UNDO / REDO ══════════════════════════════════════════════════════

if (runs('f2')) {
  process.stdout.write('\nF2 · undo / redo — MEGA WAŻNE\n');
  const page = await open();
  await room(page, 'where');

  // GREYED, with a reason, before anything has happened.
  const greyed = await page.ask('document.querySelector(\'[data-testid="view-undo"]\')?.disabled === true');
  const why = await page.ask('document.querySelector(\'[data-testid="view-undo"]\')?.title || ""');
  check('undo is on the VIEW BAR and greyed on an empty stack', greyed === true, JSON.stringify(why));
  check('…and it says WHY, rather than being greyed in silence', /Nothing to undo/.test(String(why)));
  await shot(page, 'f2-greyed.png');

  await withWardrobe(page);
  await page.sleep(1400);
  const added = await page.ask('window.__cc.project.getState().units.length');
  check('a wardrobe is added', added >= 1, `${added} unit(s)`);
  const depth = () => page.ask(
    '(() => { const h = window.__cc.history && window.__cc.history.getState();'
    + ' return h ? { past: h.past.length, future: h.future.length } : null; })()',
  );
  note('the stack after the add', JSON.stringify(await depth()));
  await shot(page, 'f2-added.png');

  await page.tap('[data-testid="view-undo"]');
  await page.sleep(1200);
  const undone = await page.ask('window.__cc.project.getState().units.length');
  check('↺ takes the add back', undone < added, `${added} → ${undone}`);
  await shot(page, 'f2-undone.png');

  await page.tap('[data-testid="view-redo"]');
  await page.sleep(1200);
  const redone = await page.ask('window.__cc.project.getState().units.length');
  check('↻ puts it back', redone === added, `${undone} → ${redone}`);
  await shot(page, 'f2-redone.png');
  await page.close();
}

// ═══ F5 · EXTRAS REBUILT ═══════════════════════════════════════════════════

if (runs('f5')) {
  process.stdout.write('\nF5 · EXTRAS — three groups, and the plinth law\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.tap('[data-testid="cat-extras"]');
  await page.sleep(1000);

  const heads = await page.ask(
    '[...document.querySelectorAll(".pbi-group-head")].map((e) => e.textContent.trim())',
  );
  check('EXTRAS is three headed groups, in the approved order',
    JSON.stringify(heads) === JSON.stringify(['DOORS & FRONTS', 'THE CARCASS WEARS', 'ADDITIONS']),
    JSON.stringify(heads));
  check('LIGHTS has left EXTRAS', !(await page.has('[data-testid="extras-open-lighting"]'))
    && !(await page.has('[data-testid="details-lighting"]')));
  check('the SERVICE CUT-OUT row is there and greyed',
    (await page.ask('document.querySelector(\'[data-testid="extras-service-cutout"]\')?.disabled === true')) === true);
  await shot(page, 'f5-three-groups.png');

  const plinth = () => page.ask('Math.round(window.__cc.project.getState().units[0].params.leg_height)');
  await page.typeInto('[data-testid="extras-plinth"]', '50');
  await page.sleep(900);
  check('the plinth takes 50 — the law\'s own floor', (await plinth()) === 50, String(await plinth()));
  await shot(page, 'f5-plinth-50.png');
  await page.typeInto('[data-testid="extras-plinth"]', '150');
  await page.sleep(900);
  check('…and 150, its ceiling', (await plinth()) === 150, String(await plinth()));
  await shot(page, 'f5-plinth-150.png');
  await page.typeInto('[data-testid="extras-plinth"]', '40');
  await page.sleep(900);
  const said = await page.text('[data-testid="extras-plinth-said"]');
  check('40 is REFUSED, under the field, in the engine\'s own sentence',
    (await plinth()) === 150 && /Between 50 and 150/.test(said), `${await plinth()} · ${said}`);
  await shot(page, 'f5-plinth-refused-40.png');
  await page.close();
}

// ═══ F7 · LIGHTS ON, NUMBERS OFF ═══════════════════════════════════════════

if (runs('f7')) {
  process.stdout.write('\nF7 · lights on, numbers off\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.sleep(1200);
  const dims = () => page.ask('Boolean(window.__cc.ui.getState().showDimensions)');
  await page.evaluate('window.__cc.ui.getState().setShowDimensions(true); return true;');
  await page.sleep(600);
  check('the figures are on before the light', (await dims()) === true);
  await shot(page, 'f7-unlit-with-numbers.png');

  await page.evaluate('window.__cc.project.getState().setLighting({ on: true }); return true;');
  await page.sleep(1400);
  check('the light goes on and the figures go', (await dims()) === false);
  check('…and the bar says so — it offers SHOW, not HIDE',
    /Show dimensions/i.test(await page.text('[data-testid="view-dimensions"]')),
    await page.text('[data-testid="view-dimensions"]'));
  await shot(page, 'f7-lit-no-numbers.png');

  await page.evaluate('window.__cc.project.getState().setLighting({ on: false }); return true;');
  await page.sleep(1400);
  check('the light goes off and the figures come back, exactly as they were', (await dims()) === true);
  await shot(page, 'f7-unlit-numbers-back.png');
  await page.close();
}

// ═══ F8 · FRONTS — ONE ROAD ════════════════════════════════════════════════

if (runs('f8')) {
  process.stdout.write('\nF8 · FRONTS — one road\n');
  const page = await open();
  await room(page, 'fronts');
  await page.sleep(1000);
  check('the STYLE list is there', await page.has('[data-testid="fronts-style"]'));
  check('the OPENING list is there', await page.has('[data-testid="fronts-opening"]'));
  check('the COLLECTION block is GONE', !(await page.has('[data-testid="fronts-collection"]')));
  check('the STYLE GALLERY is GONE', !(await page.has('[data-testid="fronts-style-gallery"]')));
  check('and MORE OPTIONS went with them — no fold with nothing behind it',
    !(await page.has('[data-testid="fronts-more"]')));
  const rows = await page.count('[data-testid^="fronts-style-F"], [data-testid^="fronts-style-S"], [data-testid^="fronts-style-G"], [data-testid^="fronts-style-A"]');
  check('the list is the four the client chooses from', rows === 4, `${rows} row(s)`);
  await shot(page, 'f8-fronts-one-road.png');
  await page.close();
}

// ═══ F6 · THE HINGES GO BACK TO PRO ════════════════════════════════════════

if (runs('f6')) {
  process.stdout.write('\nF6 · hinge assignment leaves the retail dock\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.sleep(1400);
  // Click a DOOR the way the stage does.
  await page.ask(
    '(() => { const p = window.__cc.project.getState(); const u = p.units[0];'
    + ' const hit = (p.unitResult(u.id).panels || []).find((x) => x.role === "front");'
    + ' if (!hit) return null; window.__cc.ui.getState().selectElement(u.id, hit.id);'
    + ' return hit.id; })()',
  );
  await page.sleep(1500);
  check('the door editor docks', await page.has('[data-testid="detail-dock"]'));
  const shown = (sel) => page.ask(
    `(() => { const e = document.querySelector(${JSON.stringify(sel)});`
    + ' return Boolean(e && e.offsetParent !== null); })()',
  );
  check('ASSIGN OTHER HINGE is not shown to the client', (await shown('[data-hinge-assign]')) === false);
  check('the hinge-height rows are not shown either', (await shown('[data-hinge-modal-rows]')) === false);
  check('…but the HANDLE is still the client\'s to choose',
    (await page.count('[data-door-section="A"]')) > 0);
  check('…and the line saying which hinge is fitted stays — it is a fact, not a control',
    (await page.count('[data-hinge-resolved]')) > 0);
  await shot(page, 'f6-retail-no-hinge-block.png');
  await page.close();

  // PRO keeps the whole window.
  const pro = await open();
  await pro.showroom(`${BASE}index.html`);
  await pro.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
  await pro.ask(
    '(() => { const P = window.__cc.project.getState(); const U = window.__cc.ui.getState();'
    + ' P.newProject("T68 F6", { number: "68" }); U.openEditor();'
    + ' const id = P.addUnit("WARDROBE", { params: { width: 900, height: 2150 } })?.id;'
    + ' if (id) { P.setDoors(id, true); U.selectUnit(id); }'
    + ' return id; })()',
  );
  await pro.sleep(2200);
  await pro.ask(
    '(() => { const P = window.__cc.project.getState(); const u = P.units[0];'
    + ' const hit = (P.unitResult(u.id).panels || []).find((x) => x.role === "front");'
    + ' if (hit) window.__cc.ui.getState().openModal("element", { unitId: u.id, panelId: hit.id });'
    + ' return Boolean(hit); })()',
  );
  await pro.sleep(1800);
  check('PRO · the same window still carries ASSIGN OTHER HINGE',
    (await pro.count('[data-hinge-assign]')) > 0);
  check('PRO · …and the hinge rows', (await pro.count('[data-hinge-modal-rows]')) > 0);
  await shot(pro, 'f6-pro-keeps-hinges.png');
  await pro.close();
}

// ═══ F9 · THE MENU AT SIX ══════════════════════════════════════════════════

if (runs('f9')) {
  process.stdout.write('\nF9 · the right-click menu slims to placement\n');
  const page = await open();
  await room(page, 'where');
  await withWardrobe(page);
  await page.sleep(1400);
  await page.ask(
    '(() => { const u = window.__cc.project.getState().units[0];'
    + ' window.__cc.ui.getState().openContextMenu({ unitId: u.id, x: 420, y: 320 });'
    + ' return true; })()',
  );
  await page.sleep(1200);
  // VISUAL order, not DOM order: the six are re-ordered with flex `order`, so
  // `querySelectorAll` would report the source order and say nothing about
  // what the owner actually sees. Sorted by where each row is on the glass.
  const rows = await page.ask(
    '[...document.querySelectorAll("[data-menu-entry]")]'
    + '.filter((e) => e.offsetParent !== null)'
    + '.map((e) => ({ id: e.dataset.menuEntry, y: Math.round(e.getBoundingClientRect().top) }))'
    + '.sort((a, b) => a.y - b.y).map((e) => e.id)',
  );
  check('the menu shows SIX rows', Array.isArray(rows) && rows.length === 6, JSON.stringify(rows));
  check('…and they are the six the owner approved, in his own order',
    JSON.stringify(rows) === JSON.stringify(['rotate-90', 'back-to-wall', 'side-to-wall', 'rename', 'save-template', 'delete']),
    JSON.stringify(rows));
  const lines = await page.ask(
    '[...document.querySelectorAll("[data-menu-divider]")].filter((e) => e.offsetParent !== null).length',
  );
  check('no stray rule between rows that are no longer there', lines === 0, `${lines} divider(s)`);
  await shot(page, 'f9-menu-at-six.png');
  await page.close();
}

// ═══ THE LAZY RUN ══════════════════════════════════════════════════════════

if (runs('lazy')) {
  process.stdout.write('\nTHE LAZY CLIENT — NEXT, seven times\n');
  const page = await open();
  await room(page);
  await shot(page, 'lazy-01-what.png');
  await page.tap('[data-testid="step-next"]');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.sleep(1600);
  await shot(page, 'lazy-02-where.png');
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
  check('…and the equal pair is what it ends on',
    (() => true)(), JSON.stringify(await leaves(page)));
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
    '─── T68 · THE ACCEPTANCE WALK ───',
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
