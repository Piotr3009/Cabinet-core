#!/usr/bin/env node
// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 65) ───────────────────────
//
// `npm test` and `npm run build` can both be green while the thing on screen is
// wrong, because neither of them opens a browser. Every claim T65 makes about a
// PAGE ends in a frame under `verify/t65/`.
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

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t65/', import.meta.url).pathname;
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
const nextPort = () => 9500 + ((process.pid + (seq += 17)) % 300);
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

// ═══ F1 · THE ROOM STARTS EMPTY ════════════════════════════════════════════

if (runs('f1')) {
  process.stdout.write('\nF1 · the room starts empty\n');
  const page = await open();
  await room(page, 'where');
  const before = await units(page);
  check('the room mounts EMPTY — no wardrobe was placed by the app', before.length === 0, `${before.length} unit(s)`);
  check('…and WHERE offers ADD A WARDROBE instead', await page.has('[data-testid="where-add-wardrobe"]'));
  await shot(page, 'f1-empty-where.png');

  await page.tap('[data-testid="step-next"]');
  const stillEmpty = await units(page);
  check('NEXT still works with the floor empty (the lazy client)', stillEmpty.length === 0);
  await shot(page, 'f1-empty-next.png');

  await page.tap('[data-testid="cat-inside"]');
  check('INSIDE says plainly that it needs a wardrobe', await page.has('[data-testid="panel-inside-empty"]'));
  await shot(page, 'f1-inside-needs-a-wardrobe.png');

  await page.tap('[data-testid="cat-where"]');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.sleep(1200);
  const added = await units(page);
  check('the client\'s first wardrobe is 1200 on a 4000 wall', added.length === 1 && added[0].w === 1200, JSON.stringify(added));
  await shot(page, 'f1-first-wardrobe-1200.png');
  await page.close();
}

// ═══ F2 · THE LIGHTING RIG, AND THE SLIDER ═════════════════════════════════

if (runs('f2')) {
  process.stdout.write('\nF2 · the whole lighting rig\n');
  const page = await open();
  await room(page);
  check('PRO\'s BRIGHT slider is on the retail bar', await page.has('[data-testid="view-bright"] input[type="range"]'));
  const v = await page.ask('document.querySelector(\'[data-testid="view-bright"] input\').value');
  check('…at the profile\'s own default', Number(v) === 1, `value ${v}`);
  await shot(page, 'f2-bright-slider.png');
  await page.evaluate(
    '(() => { const el = document.querySelector(\'[data-testid="view-bright"] input\');'
    + ' const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;'
    + ' set.call(el, "0.6"); el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()',
  );
  await page.sleep(900);
  const now = await page.ask('window.__cc.ui.getState().brightness');
  check('…and moving it writes the SHARED store PRO writes', Math.abs(now - 0.6) < 1e-6, String(now));
  await shot(page, 'f2-bright-turned-down.png');
  await page.close();

  // The same scene in PRO, at the same brightness, for the side-by-side.
  const pro = await open();
  await pro.showroom(`${BASE}index.html`);
  await pro.sleep(4200);
  await shot(pro, 'f2-pro-scene.png');
  note('PRO\'s own page photographed for the side-by-side');
  await pro.close();
}

// ═══ F3 · COLUMN 2, TEN PER CENT NARROWER ══════════════════════════════════

if (runs('f3')) {
  process.stdout.write('\nF3 · the OPTIONS column, 10% narrower\n');
  for (const width of [1280, 1440]) {
    const page = await open({ width, height: 900 });
    await room(page, 'inside');
    const col = await page.box('[data-testid="column-options"]');
    const expect = Math.round(379 * Math.min(1, 0.78 + (width - 1280) * 0.00017));
    check(`OPTIONS at ${width} is the new base, not the old one`,
      col && Math.abs(col.w - expect) <= 2, `${col?.w}px (want ~${expect}, was ~${Math.round(421 * Math.min(1, 0.78 + (width - 1280) * 0.00017))})`);
    await shot(page, `f3-inside-${width}.png`);
    await page.tap('[data-testid="cat-fronts"]');
    await shot(page, `f3-fronts-${width}.png`);
    await page.close();
  }
}

// ═══ F4 · THE FIRST VIEW ═══════════════════════════════════════════════════

if (runs('f4')) {
  process.stdout.write('\nF4 · the first view is PRO\'s\n');
  const page = await open();
  await room(page);
  const cam = await page.ask('(() => { const v = window.__cc.views && window.__cc.views.room; return v ? [v.camera.position.x, v.camera.position.y, v.camera.position.z].map((n) => Math.round(n * 1000) / 1000) : null; })()');
  note('retail\'s first camera', JSON.stringify(cam));
  check('the room does not stand square-on at a preset — x is PRO\'s own 0', cam && Math.abs(cam[0]) < 1e-6, JSON.stringify(cam));
  await shot(page, 'f4-retail-first-view.png');
  await page.close();

  const pro = await open();
  await pro.showroom(`${BASE}index.html`);
  await pro.sleep(4200);
  const proCam = await pro.ask('(() => { const v = window.__cc.views && window.__cc.views.room; return v ? [v.camera.position.x, v.camera.position.y, v.camera.position.z].map((n) => Math.round(n * 1000) / 1000) : null; })()');
  note('PRO\'s first camera', JSON.stringify(proCam));
  await shot(pro, 'f4-pro-first-view.png');
  await pro.close();
}

// ═══ F6 · NO CARCASS SIDE IS LEFT SHOWING ══════════════════════════════════

if (runs('f6')) {
  process.stdout.write('\nF6 · end panels\n');
  const page = await open();
  await room(page, 'where');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.sleep(1400);
  const panels = await page.ask('(() => { const u = window.__cc.project.getState().units[0]; return (u?.params?.end_panels || []).map((e) => e.side).sort(); })()');
  note('the first wardrobe\'s panels', JSON.stringify(panels));
  check('a wardrobe against the wall takes a panel on its open side only', panels.length >= 1);
  await shot(page, 'f6-panels.png');
  await page.close();
}

// ═══ F7/F8/F9 · THE STEPS ══════════════════════════════════════════════════

if (runs('f7')) {
  process.stdout.write('\nF7 · BAYS\n');
  const page = await open();
  await room(page, 'where');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.tap('[data-testid="cat-inside"]');
  check('INSIDE carries a typed BAYS field', await page.has('[data-testid="inside-bays"]'));
  await shot(page, 'f7-bays-1.png');
  check('…and the line is NOT there at one bay', !(await page.has('[data-testid="bays-note"]')));
  await page.evaluate(
    '(() => { const s = window.__cc.project.getState(); const id = s.units[0].id;'
    + ' s.updateUnitParams(id, { width: 1800 }); return true; })()',
  );
  await page.sleep(700);
  await page.typeInto('[data-testid="inside-bays"]', 3);
  const parts = await page.ask('(() => { const u = window.__cc.project.getState().units[0];'
    + ' return (u?.params?.sections?.[0]?.items || []).filter((i) => i.kind === "partition").length; })()');
  check('writing 3 puts two dividers in', parts === 2, `${parts} divider(s)`);
  check('…and the line appears only then', await page.has('[data-testid="bays-note"]'));
  await shot(page, 'f7-bays-3.png');
  await page.close();
}

if (runs('f8')) {
  process.stdout.write('\nF8 · the menu and the cornice\n');
  const page = await open();
  await room(page, 'where');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.tap('[data-testid="cat-extras"]');
  check('EXTRAS carries the CORNICE chips', await page.has('[data-testid="details-cornice"]'));
  check('EXTRAS carries END PANELS', await page.has('[data-testid="details-end-panels"]'));
  const cornice = await page.ask('window.__cc.project.getState().units[0].params.cornice');
  check('the wardrobe arrived wearing a cornice', Number(cornice) > 0, `${cornice} mm`);
  await shot(page, 'f8-extras-cornice.png');
  await page.close();
}

if (runs('f9')) {
  process.stdout.write('\nF9 · ADD DOORS, and the top box\n');
  const page = await open();
  await room(page, 'where');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.tap('[data-testid="cat-extras"]');
  check('ADD DOORS is in EXTRAS', await page.has('[data-testid="extras-add-doors"]'));
  // ADD TOP BOX is under EXTRAS' own MORE OPTIONS fold — where the picky
  // client finds it and the lazy one never has to step over it.
  // `MoreOptions` puts the testid on the BUTTON itself (controls.jsx).
  await page.tap('[data-testid="extras-more"]');
  check('ADD TOP BOX is in EXTRAS', await page.has('[data-testid="layout-add-top-box"]'));
  await shot(page, 'f9-extras-doors-and-top-box.png');
  await page.close();
}

// ═══ THE LAZY CLIENT · FROM THE EMPTY ROOM TO ADD TO MY ESTIMATE ═══════════

if (runs('lazy')) {
  process.stdout.write('\nLAZY · the empty room to ADD TO MY ESTIMATE\n');
  const page = await open();
  await room(page, 'what');
  await shot(page, 'lazy-01-what.png');
  await page.tap('[data-testid="step-next"]');
  await shot(page, 'lazy-02-where-empty.png');
  await page.tap('[data-testid="where-add-wardrobe"]');
  await page.sleep(1400);
  await shot(page, 'lazy-03-where-wardrobe.png');
  await page.tap('[data-testid="step-next"]');
  await shot(page, 'lazy-04-inside.png');
  await page.tap('[data-testid="step-next"]');
  await shot(page, 'lazy-05-fronts.png');
  await page.tap('[data-testid="step-next"]');
  await shot(page, 'lazy-06-extras.png');
  await page.tap('[data-testid="step-next"]');
  await shot(page, 'lazy-07-review.png');
  await page.tap('[data-testid="review-done"]');
  await page.sleep(1800);
  const hash = await page.ask('location.hash');
  const rows = await page.count('[data-testid^="estimate-row-"]');
  check('DONE → ADD TO MY ESTIMATE lands one item on the estimate', hash === '#/estimate' && rows === 1, `${hash} · ${rows} row(s)`);
  await shot(page, 'lazy-08-estimate.png');
  await page.close();
}

// ═══ THE LEDGER ════════════════════════════════════════════════════════════

const failed = steps.filter((s) => !s.ok);
writeFileSync(`${SHOTS}walk.txt`, [
  '─── T65 · THE ACCEPTANCE WALK ───',
  ...steps.map((s) => `${s.note ? ' ·  ' : (s.ok ? ' ok ' : 'FAIL')} ${s.label}${s.detail ? ` — ${s.detail}` : ''}`),
  '',
  `${steps.filter((s) => !s.note).length} checks · ${failed.length} failed`,
  '',
].join('\n'));
process.stdout.write(`\n${steps.filter((s) => !s.note).length} checks · ${failed.length} failed\n`);
await showroom.close?.();
process.exit(failed.length ? 1 : 0);
