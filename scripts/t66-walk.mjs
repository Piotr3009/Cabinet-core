#!/usr/bin/env node
// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 65) ───────────────────────
//
// `npm test` and `npm run build` can both be green while the thing on screen is
// wrong, because neither of them opens a browser. Every claim T65 makes about a
// PAGE ends in a frame under `verify/t66/`.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t65-walk.mjs             every section
//   node scripts/t65-walk.mjs f1 f3       some of them
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
const SHOTS = new URL('../verify/t66/', import.meta.url).pathname;
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

// ═══ F1 · THE LIGHT COMES DOWN 20% ═════════════════════════════════════════

if (runs('f1')) {
  process.stdout.write('\nF1 · the light comes down twenty per cent, in the rig\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // The rig the PAGE is actually running at — read off the store's own resolved
  // profile, which is what `Scene.jsx` reads. `window.__cc.project` is what the
  // retail mount registers (`main-retail.jsx`).
  const gain = await page.ask(
    '(() => (window.__cc.profile'
    + ' ? window.__cc.profile.getState().profile.appearance.studio.baseGain : null))()',
  );
  note('the base gain the page is running at', String(gain));
  const slider = await page.ask('document.querySelector(\'[data-testid="view-bright"] input\')?.value');
  check('the BRIGHT slider is still at its 100 %', Number(slider) === 1, `value ${slider}`);
  check('…and the base is the new 0.60', gain != null && Math.abs(Number(gain) - 0.6) < 1e-9, String(gain));
  await shot(page, 'f1-after-060-at-100.png');
  // The SAME scene at the slider's own 100 % is the "before/after" pair the
  // brief asks for: the only thing that moved is the base, so turning the
  // slider up by 1/0.8 puts the picture back where it was.
  await page.evaluate(
    '(() => { const el = document.querySelector(\'[data-testid="view-bright"] input\');'
    + ' const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;'
    + ' set.call(el, "1.25"); el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()',
  );
  await page.sleep(1200);
  await shot(page, 'f1-before-the-same-scene-at-125.png');
  note('1.25 × 0.60 = 0.75 — the same light T65 shipped, for the side-by-side');
  await page.close();
}

// ═══ F2 · SIZE — THE THIRD TILE ════════════════════════════════════════════

if (runs('f2')) {
  process.stdout.write('\nF2 · SIZE, the third tile\n');
  const page = await open();
  await room(page);
  const tiles = await page.ask('[...document.querySelectorAll(\'[data-testid^="cat-"]\')].map((e) => e.dataset.testid.slice(4))');
  check('the rail is SEVEN tiles, SIZE third',
    JSON.stringify(tiles) === JSON.stringify(['what', 'where', 'size', 'inside', 'fronts', 'extras', 'review']),
    JSON.stringify(tiles));
  await page.tap('[data-testid="cat-size"]');
  check('SIZE says plainly that it needs a wardrobe', await page.has('[data-testid="panel-size-empty"]'));
  await shot(page, 'f2-size-empty.png');

  await withWardrobe(page);
  await page.tap('[data-testid="cat-size"]');
  const fields = await page.count('[data-testid^="size-"]');
  check('SIZE holds the three typed fields', fields === 3, `${fields} field(s)`);
  await shot(page, 'f2-size-three-fields.png');

  // A REFUSED width — the room's own sentence, under the field.
  await page.typeInto('[data-testid="size-width"]', 9000);
  const said = await page.text('[data-testid="size-width-said"]');
  check('a refused width shows the ROOM\'s own sentence', said.length > 10, said || '(nothing said)');
  await shot(page, 'f2-size-refused.png');
  await page.close();
}

// ═══ F3 · ONE EDITOR ON THE RIGHT ══════════════════════════════════════════

if (runs('f3')) {
  process.stdout.write('\nF3 · one editor on the right\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // Something to click: a stack of drawers, added through PRO's own list.
  await page.evaluate(
    '(() => { const s = window.__cc.project.getState(); s.addDrawers(s.units[0].id, 3); return true; })()',
  );
  await page.sleep(1500);

  await select(page, 'DRAWER-FRONT');
  await page.sleep(900);
  const open1 = await page.ask('document.querySelector(\'[data-testid="column-detail"]\')?.dataset.open');
  const editor1 = await page.ask('document.querySelector(\'[data-testid="column-detail"]\')?.dataset.editor');
  check('a drawer clicked docks its editor', open1 === 'yes', `open=${open1} editor=${editor1}`);
  const floating = await page.count('[data-modal-shell]:not(.pbi-dock [data-modal-shell])');
  check('…and NO floating element window stands beside it', floating === 0, `${floating} floating window(s)`);
  check('the docked editor is PRO\'s own piece panel', await page.has('[data-testid="detail-dock"] [data-element-actions]'));
  await shot(page, 'f3-drawer-docked.png');

  // THE WORKSHOP FIELDS — absent, and the flag is what makes them so.
  const weight = await page.count('[data-testid="detail-dock"] [data-piece-weight]');
  const move = await page.count('[data-testid="detail-dock"] [data-element-move]');
  const boards = await page.ask(
    '[...document.querySelectorAll(\'[data-testid="detail-dock"] label\')]'
    + '.filter((l) => l.offsetParent !== null && l.querySelector("select")).length',
  );
  check('the workshop fields are not on screen', weight + move + boards === 0,
    `weight ${weight} · move ${move} · board pickers ${boards}`);
  await shot(page, 'f3-no-workshop-fields.png');

  // A SWAP — the panel never closes between one element and the next.
  await select(page, 'FRONT');
  await page.sleep(900);
  const open2 = await page.ask('document.querySelector(\'[data-testid="column-detail"]\')?.dataset.open');
  const editor2 = await page.ask('document.querySelector(\'[data-testid="column-detail"]\')?.dataset.editor');
  check('a door swaps in place', open2 === 'yes' && editor2 === 'element', `open=${open2} editor=${editor2}`);
  check('…and the door\'s own window is PRO\'s, docked', await page.has('[data-testid="detail-dock"] [data-door-modal]'));
  await shot(page, 'f3-door-swap.png');

  // A CARCASS CLICK — the panel slides out.
  await select(page, 'BUL');
  await page.sleep(900);
  const open3 = await page.ask('document.querySelector(\'[data-testid="column-detail"]\')?.dataset.open');
  check('a click on the carcass closes the panel', open3 === 'no', `open=${open3}`);
  await shot(page, 'f3-carcass-closes.png');
  await page.close();
}

// ═══ F4 · FRONTS — A LIST, NOT A MOSAIC ════════════════════════════════════

if (runs('f4')) {
  process.stdout.write('\nF4 · FRONTS is a list\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.tap('[data-testid="cat-fronts"]');
  const rows = await page.count('[data-testid="fronts-style"] .pbi-style-row');
  check('STYLE is four rows in one column', rows === 4, `${rows} row(s)`);
  const stacked = await page.ask(
    '(() => { const r = [...document.querySelectorAll(\'[data-testid="fronts-style"] .pbi-style-row\')]'
    + '.map((e) => Math.round(e.getBoundingClientRect().x)); return new Set(r).size; })()',
  );
  check('…and they all start at the same x — a list, not a mosaic', stacked === 1, `${stacked} column(s)`);
  check('SHAKER is selected, so its FRAME WIDTH field is under the list',
    await page.has('[data-testid="fronts-frame-width"]'));
  check('the sentences are BELOW the list, in one block', await page.has('[data-testid="fronts-style-notes"]'));
  const soon = await page.ask('document.querySelector(\'[data-testid="fronts-style-G"]\')?.dataset.soon');
  check('GROOVED is a greyed ROW', soon === 'yes', `soon=${soon}`);
  await shot(page, 'f4-fronts-list-shaker.png');

  await page.tap('[data-testid="fronts-style-F"]');
  check('SLAB selected → the frame field goes', !(await page.has('[data-testid="fronts-frame-width"]')));
  await shot(page, 'f4-fronts-list-slab.png');

  const cols = await page.ask(
    '(() => { const r = [...document.querySelectorAll(\'[data-testid="fronts-opening"] .pbi-opening-row\')]'
    + '.map((e) => Math.round(e.getBoundingClientRect().width)); return { n: r.length, widths: new Set(r).size }; })()',
  );
  check('OPENING is four rows of one width', cols.n === 4 && cols.widths === 1, JSON.stringify(cols));
  await shot(page, 'f4-opening-column.png');
  await page.close();
}

// ═══ F5 · THE SHOWROOM DEFAULT ═════════════════════════════════════════════

if (runs('f5')) {
  process.stdout.write('\nF5 · wine on walnut\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  const design = await page.ask('(() => { const d = window.__cc.project.getState().project.design;'
    + ' return { source: d.fronts.types[0].source, colour: d.fronts.types[0].colour,'
    + ' carcass: d.carcass.types[0].finish_id }; })()');
  check('the fronts are SPRAYED RAL 3005 Wine Red',
    design.source === 'spray' && design.colour?.name === '3005 Wine Red', JSON.stringify(design.colour));
  check('the carcass is the named walnut', String(design.carcass || '').includes('H3710'), String(design.carcass));
  await page.tap('[data-testid="cat-review"]');
  await page.sleep(1200);
  const summary = await page.text('[data-testid="estimate-summary"]');
  check('the REVIEW summary names both', /Wine Red/i.test(summary) && /Walnut/i.test(summary),
    summary.replace(/\s+/g, ' ').slice(0, 160));
  await shot(page, 'f5-review-names-them.png');
  await page.evaluate('document.querySelector(\'[data-testid="view-front"]\')?.click(); return true;');
  await page.sleep(1400);
  await shot(page, 'f5-wine-on-walnut-front.png');
  await page.close();
}

// ═══ F6 · BAYS — ONE ROW, ONE NAME ═════════════════════════════════════════

if (runs('f6')) {
  process.stdout.write('\nF6 · one row, one name\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.tap('[data-testid="cat-inside"]');
  const label = await page.ask(
    '(() => { const f = document.querySelector(\'[data-testid="inside-bays"]\');'
    + ' return f ? f.closest(".pbi-field-row").querySelector(".pbi-label")?.textContent.trim() : null; })()',
  );
  check('the row is named VERTICAL PARTITIONS (BAYS)', /VERTICAL PARTITIONS \(BAYS\)/i.test(label || ''), String(label));
  const count = await page.count('[data-testid="inside-bays"]');
  check('…and there is exactly ONE entry', count === 1, `${count} control(s)`);
  await shot(page, 'f6-bays-one-row.png');
  const tail = await page.ask(
    '(() => { const p = document.querySelector(\'[data-testid="panel-inside"]\');'
    + ' return p ? p.textContent.trim().slice(-140) : null; })()',
  );
  note('the foot of the panel', String(tail).replace(/\s+/g, ' '));
  await shot(page, 'f6-inside-foot.png');
  await page.close();
}

// ═══ F7 · SPLIT DOOR — INTO EXTRAS ═════════════════════════════════════════

if (runs('f7')) {
  process.stdout.write('\nF7 · the split door, in EXTRAS\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.tap('[data-testid="cat-extras"]');
  check('SPLIT DOOR (TOP SEGMENT) is in EXTRAS', await page.has('[data-testid="extras-split-top"]'));
  await shot(page, 'f7-extras-split.png');
  await page.typeInto('[data-testid="extras-split-top"]', 900);
  const segs = await page.ask('(() => { const p = window.__cc.project.getState(); const u = p.units[0];'
    + ' return (p.unitResult(u.id).panels || []).filter((x) => x.meta && x.meta.split).length; })()');
  check('typing a top segment splits the leaf', segs >= 2, `${segs} segment(s)`);
  await shot(page, 'f7-split-on-the-stage.png');

  // …and with no doors at all it says so instead.
  await page.evaluate('(() => { const s = window.__cc.project.getState();'
    + ' s.setDoors(s.units[0].id, false); return true; })()');
  await page.sleep(1200);
  const said = await page.text('[data-testid="extras-split-said"]');
  check('with no doors it greys with the engine\'s own reason', said.length > 10, said || '(nothing said)');
  await shot(page, 'f7-split-greyed.png');
  await page.close();
}

// ═══ F8 · WHERE — THE ROOM IS NOT HIDDEN ═══════════════════════════════════

if (runs('f8')) {
  process.stdout.write('\nF8 · the room is not hidden\n');
  const page = await open();
  await room(page, 'where');
  const visible = await page.ask(
    '(() => { const b = document.querySelector(\'[data-testid="space-edit-room"]\');'
    + ' return b ? b.offsetParent !== null : false; })()',
  );
  check('EDIT THE ROOM is on screen without opening anything', visible === true);
  check('…and WHERE has no MORE OPTIONS fold left', !(await page.has('[data-testid="where-more"]')));
  await shot(page, 'f8-where-room-in-plain-sight.png');
  await page.close();
}

// ═══ F9 · THE VIEW OPENS DRESSED ═══════════════════════════════════════════

if (runs('f9')) {
  process.stdout.write('\nF9 · the view opens dressed\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  const flags = await page.ask('(() => { const u = window.__cc.ui.getState();'
    + ' return { dims: u.showDimensions, outlines: u.showOutlines, xray: u.xray,'
    + ' contour: u.contourView, ruler: u.ruler }; })()');
  check('DIMENSIONS and OUTLINES are on at mount', flags.dims === true && flags.outlines === true, JSON.stringify(flags));
  check('…and the three TOOLS are still off', !flags.xray && !flags.contour && !flags.ruler, JSON.stringify(flags));
  const lit = await page.ask(
    '(() => [...document.querySelectorAll(".pbi-viewbar-btn.is-on")]'
    + '.map((e) => e.textContent.trim()).join(" · "))()',
  );
  check('…and the two buttons SHOW the on state',
    /HIDE DIMENSIONS/i.test(String(lit)) && /OUTLINES/i.test(String(lit)), String(lit));
  await shot(page, 'f9-first-mount-dressed.png');
  await page.close();
}

// ═══ F10 · EVERY BUTTON WEARS THE NEW SHAPE ════════════════════════════════

if (runs('f10')) {
  process.stdout.write('\nF10 · every button wears the new shape\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // EXTRAS is the step with a CHIP on it — the lighting, the plinth, the
  // cornice — so the probe stands where every family of control is on screen
  // at once, which is what "a panel of buttons in every state" means.
  await page.tap('[data-testid="cat-extras"]');
  const radii = await page.ask(
    '(() => { const out = {};'
    + ' for (const [name, sel] of [["button", ".pbi-btn"], ["chip", ".pbi-chip"],'
    + ' ["rail tile", ".pbi-tile"], ["view-bar tile", ".pbi-viewbar-btn"]]) {'
    + '   const el = document.querySelector(sel);'
    + '   out[name] = el ? getComputedStyle(el).borderRadius : null; }'
    + ' return out; })()',
  );
  check('every control is 8px',
    Object.values(radii).length === 4 && Object.values(radii).every((v) => v === '8px'),
    JSON.stringify(radii));
  await shot(page, 'f10-buttons-every-state.png');
  await page.tap('[data-testid="cat-fronts"]');
  const copyRadius = await page.ask(
    '(() => { const el = document.querySelector(\'[data-testid="fronts-material"] .pbi-re-btn\');'
    + ' return el ? getComputedStyle(el).borderRadius : null; })()',
  );
  check('…and so does a COPIED editor\'s button', copyRadius === '8px', String(copyRadius));
  await shot(page, 'f10-copied-editor-shape.png');
  await page.close();
}

// ═══ F11 · COLUMN 2, THE SECOND TEN PER CENT ═══════════════════════════════

if (runs('f11')) {
  process.stdout.write('\nF11 · the OPTIONS column, twenty per cent narrower\n');
  for (const width of [1280, 1440]) {
    const page = await open({ width, height: 900 });
    await room(page);
    await withWardrobe(page);
    await page.tap('[data-testid="cat-inside"]');
    const col = await page.box('[data-testid="column-options"]');
    const expect = Math.round(337 * Math.min(1, 0.78 + (width - 1280) * 0.00017));
    check(`OPTIONS at ${width} is the new base, not T65's`,
      col && Math.abs(col.w - expect) <= 2,
      `${col?.w}px (want ~${expect}, T65 shipped ~${Math.round(379 * Math.min(1, 0.78 + (width - 1280) * 0.00017))})`);
    await shot(page, `f11-inside-${width}.png`);
    await page.tap('[data-testid="cat-fronts"]');
    await shot(page, `f11-fronts-${width}.png`);
    await page.close();
  }
}

// ═══ THE LAZY CLIENT · FROM THE EMPTY ROOM TO ADD TO MY ESTIMATE ═══════════

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
  check('seven clicks end on a wine-on-walnut wardrobe',
    /Wine Red/i.test(summary) && /Walnut/i.test(summary), summary.replace(/\s+/g, ' ').slice(0, 160));
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
//   node scripts/t66-walk.mjs --fresh f1 f2    start a new ledger
//   node scripts/t66-walk.mjs f3               add to it
const fresh = process.argv.includes('--fresh');
const failed = steps.filter((s) => !s.ok);
const previous = !fresh && existsSync(`${SHOTS}walk.txt`)
  ? readFileSync(`${SHOTS}walk.txt`, 'utf8').replace(/\n?\d+ checks · \d+ failed\n*$/, '')
  : '';
const before = (previous.match(/^ (ok|FAIL) /gm) || []).length;
const beforeFailed = (previous.match(/^FAIL /gm) || []).length;
writeFileSync(`${SHOTS}walk.txt`, [
  previous || [
    '─── T66 · THE ACCEPTANCE WALK ───',
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
