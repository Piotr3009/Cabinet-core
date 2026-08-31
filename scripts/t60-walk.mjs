// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 60) ───────────────────────
//
// Every claim this turn makes about a PAGE ends in a frame, and this script is
// what takes it. The rule turns 5, 58b and 59 all learned the hard way: `npm
// test` and `npm run build` can be green while the thing on screen is wrong,
// because neither of them opens a browser.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t60-walk.mjs             every section
//   node scripts/t60-walk.mjs f3          one of them
//
// ─── AND F1'S FRAMES ARE THREE SEPARATE BROWSERS ───────────────────────────
//
// CLAUDE.md F1: *"each shot in its OWN browser window at that width (the t59
// walk's lesson 5: device-metrics emulation does not move `window.innerWidth`)."*
//
// That lesson is load-bearing here more than anywhere: `--pbi-scale` is
// `clamp(…100vw…)`, and `Emulation.setDeviceMetricsOverride` changes what the
// page is PAINTED at without changing the viewport CSS reads. A walk that used
// it would photograph three identical rooms and report three different scales.
// So F1 launches a browser per width, and closes it.
//
// THE CAMERA IS PLACED, NEVER NUDGED — T57's rule, kept.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t60/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

// A port derived from this process's own id — t59's lesson 4: a fixed port
// attaches to a browser somebody else left running, and photographs whatever
// bundle was on disk when THAT one started.
let seq = 0;
const nextPort = () => 9600 + ((process.pid + (seq += 7)) % 280);

/** One browser, one width, and everything a walk needs bolted to it. */
async function open({ width = 1600, height = 1000 } = {}) {
  const page = await launch({ width, height, port: nextPort() });
  // The cache is not your friend here: `cdp.mjs` spawns Chromium without a
  // `--user-data-dir`, so every walk shares the machine's disk cache and a
  // frame of last build's JavaScript is worse than no frame at all.
  await page.send('Network.enable', {});
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  page.ask = (expr) => page.evaluate(`return (${expr});`);
  page.text = (sel) => page.ask(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').trim()`);
  page.has = (sel) => page.ask(`Boolean(document.querySelector(${JSON.stringify(sel)}))`);
  page.count = (sel) => page.ask(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  page.css = (sel, prop) => page.ask(
    `getComputedStyle(document.querySelector(${JSON.stringify(sel)})).getPropertyValue(${JSON.stringify(prop)}).trim()`,
  );
  /**
   * MOVE A SLIDER THE WAY A HAND WOULD.
   *
   * React holds a `_valueTracker` on every controlled input, so assigning
   * `el.value` and firing an event is a change React never sees — it compares
   * against the tracker and decides nothing happened. The native setter is
   * what a real gesture goes through, and clearing the tracker is what makes
   * React look again. Both are guarded: a browser that does not expose the
   * descriptor gets the plain assignment rather than a thrown walk.
   */
  page.slide = (sel, to) => page.evaluate(
    `const el = document.querySelector(${JSON.stringify(sel)});`
    + ' if (!el) return null;'
    + ` const want = String(${JSON.stringify(String(to))});`
    + ' const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");'
    + ' if (d && d.set) d.set.call(el, want); else el.value = want;'
    + ' if (el._valueTracker) el._valueTracker.setValue("");'
    + ' el.dispatchEvent(new Event("input", { bubbles: true }));'
    + ' el.dispatchEvent(new Event("change", { bubbles: true }));'
    + ' return el.value;',
  );
  page.box = (sel) => page.ask(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)});`
    + ' if (!el) return null; const r = el.getBoundingClientRect();'
    + ' return { w: Math.round(r.width), h: Math.round(r.height),'
    + ' x: Math.round(r.x), y: Math.round(r.y) }; })()',
  );
  return page;
}

/** Go to a hash route and wait for the app to have drawn it. */
async function route(page, path, settle = 900) {
  await page.evaluate(`window.location.hash = ${JSON.stringify(path)}; return true;`);
  await page.sleep(settle);
}

/** Wait for the wardrobe to exist and the renderer to have a scene. */
async function stageReady(page, timeout = 40000) {
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout });
  await page.waitFor('window.__cc.pbi.render.bounds() !== null', { timeout });
  // The EGGER pack arrives over the network and re-renders the boards when it
  // does; a frame taken before that is a frame of a half-dressed wardrobe.
  await page.sleep(3500);
}

const shot = (page, file) => page.screenshot(`${SHOTS}${file}`);

// ═══ F1 · THE SCALE LAW — THREE WIDTHS, THREE BROWSERS ═════════════════════
if (runs('f1')) {
  process.stdout.write('\nF1 — THE SCALE LAW: ONE NUMBER, EVERY DIMENSION\n');
  const WIDTHS = [
    { w: 2560, h: 1400, want: 1, file: 'f1-scale-2560.png' },
    { w: 1728, h: 1080, want: 0.86, file: 'f1-scale-1728.png' },
    { w: 1280, h: 860, want: 0.78, file: 'f1-scale-1280.png' },
  ];
  const seen = [];
  for (const at of WIDTHS) {
    // eslint-disable-next-line no-await-in-loop
    const page = await open({ width: at.w, height: at.h });
    try {
      // eslint-disable-next-line no-await-in-loop
      await page.goto(`${BASE}retail.html#/design`);
      // eslint-disable-next-line no-await-in-loop
      await stageReady(page);

      // eslint-disable-next-line no-await-in-loop
      const inner = await page.ask('window.innerWidth');
      check(`${at.w}: the browser really is that wide`, Math.abs(inner - at.w) <= 30, `innerWidth ${inner}`);

      // ─── THE SCALE IS MEASURED, NOT ASKED FOR ───────────────────────────
      //
      // `getComputedStyle().getPropertyValue('--pbi-scale')` hands back the
      // TOKEN STREAM for an unregistered custom property — the literal
      // `clamp(0.78px, calc(…), 1px)` — not the length it resolves to. So the
      // scale is read the only way that proves anything: off two dimensions
      // that are drawn from it, which must agree with each other and with the
      // arithmetic. A property that had gone invalid would show up here as two
      // numbers that do not.
      // eslint-disable-next-line no-await-in-loop
      const rail = await page.box('[data-testid="column-categories"]');
      // eslint-disable-next-line no-await-in-loop
      const detail = await page.box('[data-testid="column-detail"]');
      const scale = rail.w / 187;
      const alsoScale = detail.w / 300;
      check(`${at.w}: the RAIL is 187 × the scale`, Math.abs(rail.w - 187 * at.want) <= 2,
        `${rail.w}px, wanted ${Math.round(187 * at.want)}`);
      check(`${at.w}: the DETAIL column agrees with it`, Math.abs(scale - alsoScale) < 0.02,
        `rail says ${scale.toFixed(3)}, detail says ${alsoScale.toFixed(3)}`);
      check(`${at.w}: --pbi-scale is ${at.want}`, Math.abs(scale - at.want) < 0.02, scale.toFixed(4));

      // No text under 11px — the floor, read off the glass rather than the CSS.
      // eslint-disable-next-line no-await-in-loop
      const smallest = await page.ask(
        '(() => { let min = 99; for (const el of document.querySelectorAll('
        + '"[data-testid=\\"design-room\\"] *")) {'
        + ' if (!el.firstChild || el.firstChild.nodeType !== 3 || !el.textContent.trim()) continue;'
        + ' const px = parseFloat(getComputedStyle(el).fontSize); if (px && px < min) min = px; }'
        + ' return Math.round(min * 100) / 100; })()',
      );
      check(`${at.w}: nothing under 11px`, smallest >= 10.99, `smallest ${smallest}px`);

      // eslint-disable-next-line no-await-in-loop
      const scroll = await page.ask('document.documentElement.scrollWidth <= window.innerWidth + 1');
      check(`${at.w}: the room does not scroll sideways`, scroll);

      // …and every one of PRO's tools is ON the glass rather than past its
      // edge. The bar wraps; nothing is hidden behind an overflow.
      // eslint-disable-next-line no-await-in-loop
      const offscreen = await page.ask(
        '(() => { const bar = document.querySelector(\'[data-testid="view-bar"]\');'
        + ' const r = bar.getBoundingClientRect(); const out = [];'
        + ' for (const b of bar.querySelectorAll("button")) { const q = b.getBoundingClientRect();'
        + ' if (q.right > r.right + 1 || q.left < r.left - 1) out.push(b.dataset.testid); }'
        + ' return out; })()',
      );
      check(`${at.w}: every view tool is on the glass`, offscreen.length === 0, offscreen.join(' '));

      // eslint-disable-next-line no-await-in-loop
      await shot(page, at.file);
      seen.push({ width: at.w, scale, rail: rail.w, smallest });
    } finally {
      // eslint-disable-next-line no-await-in-loop
      await page.close?.();
    }
  }
  check('the scale actually moves with the glass',
    seen.length === 3 && seen[0].scale > seen[1].scale && seen[1].scale > seen[2].scale,
    seen.map((s) => `${s.width}→${s.scale}`).join(' '));
  check('…and the RAIL moves with it',
    seen.length === 3 && seen[0].rail > seen[2].rail,
    seen.map((s) => `${s.width}→${s.rail}px`).join(' '));
}

// ═══ F2 · THE VIEW BAR ═════════════════════════════════════════════════════
if (runs('f2')) {
  process.stdout.write('\nF2 — THE VIEW BAR: PRO\'S TOOLS, ONE FOR ONE\n');
  const page = await open({ width: 1920, height: 1080 });
  try {
    await page.goto(`${BASE}retail.html#/design`);
    await stageReady(page);

    const ENTRIES = ['front', 'inside', 'room', 'dimensions', 'front-dimensions', 'outlines',
      'xray', 'props', 'hide-fronts', 'measure', 'open-all', 'lights', 'reset', 'fullscreen'];
    for (const id of ENTRIES) {
      // eslint-disable-next-line no-await-in-loop
      check(`the bar carries ${id}`, await page.has(`[data-testid="view-${id}"]`));
    }
    for (const id of ['bom', 'check', 'cnc']) {
      // eslint-disable-next-line no-await-in-loop
      check(`…and NOT ${id}`, !(await page.has(`[data-testid="view-${id}"]`)));
    }
    await shot(page, 'f2-viewbar.png');

    // DIMENSIONS: the flag AND the glass. The whole point of the channels.
    const before = await page.ask('window.__cc.pbi.render.helperCount ? 1 : 0');
    await page.click('[data-testid="view-dimensions"]');
    await page.sleep(1200);
    check('SHOW DIMENSIONS lights up',
      (await page.ask('document.querySelector(\'[data-testid="view-dimensions"]\').dataset.active')) === 'yes');
    check('…and it says HIDE now',
      (await page.text('[data-testid="view-dimensions"]')).toLowerCase().includes('hide'));
    await shot(page, 'f2-viewbar-dimensions.png');
    await page.click('[data-testid="view-dimensions"]');
    await page.sleep(600);
    check('…and back off', before !== null);

    // X-RAY: the boards go translucent and the contour holds them together.
    await page.click('[data-testid="view-xray"]');
    await page.sleep(1400);
    check('X-RAY lights up',
      (await page.ask('document.querySelector(\'[data-testid="view-xray"]\').dataset.active')) === 'yes');
    await shot(page, 'f2-viewbar-xray.png');
    await page.click('[data-testid="view-xray"]');
    await page.sleep(600);

    // OUTLINES: dead in t59, alive now.
    await page.click('[data-testid="view-outlines"]');
    await page.sleep(1000);
    check('OUTLINES lights up',
      (await page.ask('document.querySelector(\'[data-testid="view-outlines"]\').dataset.active')) === 'yes');
    await shot(page, 'f2-viewbar-outlines.png');
    await page.click('[data-testid="view-outlines"]');
    await page.sleep(600);

    // OPEN ALL / CLOSE ALL — the label flips with the doors.
    const shut = await page.text('[data-testid="view-open-all"]');
    await page.click('[data-testid="view-open-all"]');
    await page.sleep(1400);
    const open = await page.text('[data-testid="view-open-all"]');
    check('OPEN ALL becomes CLOSE ALL', shut !== open, `${shut} → ${open}`);
    await page.click('[data-testid="view-open-all"]');
    await page.sleep(1200);

    // MEASURE: the ruler is mounted and takes the canvas.
    await page.click('[data-testid="view-measure"]');
    await page.sleep(900);
    check('MEASURE lights up',
      (await page.ask('document.querySelector(\'[data-testid="view-measure"]\').dataset.active')) === 'yes');
    await shot(page, 'f2-viewbar-measure.png');
    await page.click('[data-testid="view-measure"]');
    await page.sleep(500);

    // FULL SCREEN: the bar stays, plus a way back and SAVE IMAGE.
    await page.click('[data-testid="view-fullscreen"]');
    await page.sleep(1200);
    check('full screen hides the columns', !(await page.has('[data-testid="column-categories"]')));
    check('the bar stays, with a way back', await page.has('[data-testid="view-back"]'));
    check('and it carries SAVE IMAGE', await page.has('[data-testid="view-save-image"]'));
    await shot(page, 'f2-viewbar-fullscreen.png');
    await page.click('[data-testid="view-back"]');
    await page.sleep(1000);
    check('and BACK TO DESIGN restores the columns', await page.has('[data-testid="column-categories"]'));
  } finally {
    await page.close?.();
  }
}

// ═══ F3 · THE NINE ELEMENT MENUS ═══════════════════════════════════════════
if (runs('f3')) {
  process.stdout.write('\nF3 — A MENU FOR EVERY ELEMENT\n');
  const page = await open({ width: 1920, height: 1080 });
  try {
    await page.goto(`${BASE}retail.html#/design`);
    await stageReady(page);

    /** Open a menu the way the INTERIOR list does, and photograph it. */
    const viaList = async (row, file, label) => {
      await page.click('[data-testid="cat-interior"]');
      await page.sleep(400);
      if (await page.has(`[data-testid="interior-add-${row}"]`)) {
        await page.click(`[data-testid="interior-add-${row}"]`);
        await page.sleep(1100);
      }
      const arrow = `[data-testid="interior-open-${row}"]`;
      if (!(await page.has(arrow))) { check(`${label}: nothing to open`, false); return false; }
      await page.click(arrow);
      await page.sleep(900);
      const duty = await page.ask('document.querySelector(\'[data-testid="column-detail"]\').dataset.duty');
      const menu = await page.ask('document.querySelector(\'[data-testid="column-detail"]\').dataset.menu');
      check(`${label} opens its own menu`, duty === 'detail', `menu=${menu}`);
      if (file) await shot(page, file);
      return true;
    };

    // WARDROBE — reached by clicking the carcass, which is PRO's own turn-13
    // verdict: a click on a cabinet selects the CABINET.
    await page.click('[data-testid="cat-layout"]');
    await page.sleep(500);
    await shot(page, 'f3-options-layout.png');

    check('the DOORS and BAYS rows are two different controls',
      (await page.has('[data-testid="layout-doors"]')) && (await page.has('[data-testid="layout-bays"]')));

    // THE WARDROBE'S OWN MENU — the carcass is a SELECTION rather than an
    // element in the shared core, so this is its door.
    await page.click('[data-testid="layout-open-wardrobe"]');
    await page.sleep(900);
    check('THIS WARDROBE opens the wardrobe menu',
      (await page.ask('document.querySelector(\'[data-testid="column-detail"]\').dataset.menu')) === 'wardrobe');
    check('…with the three sliders', (await page.has('[data-testid="wardrobe-width"]'))
      && (await page.has('[data-testid="wardrobe-height"]')) && (await page.has('[data-testid="wardrobe-depth"]')));
    check('…DOORS and BAYS apart', (await page.has('[data-testid="wardrobe-doors"]'))
      && (await page.has('[data-testid="wardrobe-bays"]')));
    check('…the plinth', await page.has('[data-testid="wardrobe-plinth"]'));
    check('…the decor swatches', await page.has('[data-testid="wardrobe-carcass"]'));
    check('…and RENAME', await page.has('[data-testid="wardrobe-name"]'));
    await shot(page, 'f3-wardrobe.png');
    await page.click('[data-testid="detail-done"]');
    await page.sleep(500);

    // SHELF — the owner's own example, and it must move.
    if (await viaList('shelves', 'f3-shelf.png', 'SHELF')) {
      const has = await page.has('[data-testid="shelf-height"]');
      check('the shelf has a height slider', has);
      if (has) {
        const at = await page.ask('Number(document.querySelector(\'[data-testid="shelf-height"]\').value)');
        const min = await page.ask('Number(document.querySelector(\'[data-testid="shelf-height"]\').min)');
        const max = await page.ask('Number(document.querySelector(\'[data-testid="shelf-height"]\').max)');
        check('…with the engine\'s own ends', max > min, `${min}…${max}, at ${at}`);
        // AND IT MOVES: the owner's whole sentence about column 7.
        //   *"Nie może być możliwości nieprzesunięcia się półki."*
        await page.slide('[data-testid="shelf-height"]', Math.round(min + (max - min) * 0.28));
        await page.sleep(1100);
        const now = await page.ask('Number(document.querySelector(\'[data-testid="shelf-height"]\').value)');
        check('THE SHELF MOVES', now !== at, `${at} → ${now}`);
        await shot(page, 'f3-shelf-moved.png');
      }
      check('CENTRE THIS BAY is there', await page.has('[data-testid="shelf-centre"]'));
      check('…and REMOVE', await page.has('[data-testid="shelf-remove"]'));
      await page.click('[data-testid="detail-done"]');
      await page.sleep(500);
    }

    await viaList('drawers', 'f3-drawers.png', 'DRAWERS');
    check('HOW MANY is a chip row', await page.has('[data-testid="drawers-count"]'));
    check('TOP DRAWER INSERT is a chip row', await page.has('[data-testid="drawers-insert"]'));
    check('GLASS TOP is a chip row', await page.has('[data-testid="drawers-glass"]'));
    await page.click('[data-testid="detail-done"]');
    await page.sleep(400);

    await viaList('hanger', 'f3-rail.png', 'HANGING RAIL');
    check('MOUNTED chips', await page.has('[data-testid="rail-mount"]'));
    check('…and the rod on a shelf says whose height it is',
      (await page.has('[data-testid="rail-follows"]')) || (await page.has('[data-testid="rail-height"]')));
    await page.click('[data-testid="detail-done"]');
    await page.sleep(400);

    await viaList('watch', 'f3-watch.png', 'WATCH DRAWER');
    check('four layout chips with their drawings',
      (await page.count('[data-testid="watch-layout"] svg')) === 4);
    check('FINISH is the T58 pair', await page.has('[data-testid="watch-finish"]'));
    await page.click('[data-testid="detail-done"]');
    await page.sleep(400);

    await viaList('pulldown_rail', 'f3-pulldown.png', 'PULL-DOWN RAIL');
    await page.click('[data-testid="detail-done"]');
    await page.sleep(400);

    await page.click('[data-testid="cat-fronts"]');
    await page.sleep(500);
    await shot(page, 'f3-options-fronts.png');

    // ─── THE OWNER'S OWN GESTURE ──────────────────────────────────────────
    //
    //   *"jak naciśniemy na drzwi to się pojawi drzwi, jak na szafę to na
    //   szafę, jak na półkę to półkę."*
    //
    // So: a real click on the STAGE, on the front-most thing in the middle of
    // it, which on a shut wardrobe is a leaf. This is the path t59 could never
    // complete — every stage click fell through to the placeholder — and it is
    // the one the whole of F3 is about.
    // FRONT, so the wardrobe is square in the middle of the canvas and the
    // centre of it is a leaf rather than a wall. The camera is PLACED through
    // the app's own preset and never nudged — T57's rule.
    await page.click('[data-testid="view-front"]');
    await page.sleep(1600);
    const canvas = await page.box('[data-testid="stage-canvas"]');
    const cx = canvas.x + Math.round(canvas.w / 2);
    const cy = canvas.y + Math.round(canvas.h / 2);
    await page.mouse('mouseMoved', cx, cy, { buttons: 0 });
    await page.mouse('mousePressed', cx, cy);
    await page.mouse('mouseReleased', cx, cy, { buttons: 0 });
    await page.sleep(1200);
    const clicked = await page.ask('document.querySelector(\'[data-testid="column-detail"]\').dataset.menu');
    check('a click in the STAGE opens that element\'s menu', Boolean(clicked), `menu=${clicked || 'none'}`);
    if (clicked) {
      await shot(page, `f3-stage-click-${clicked}.png`);
      if (clicked === 'door') {
        check('…and a DOOR gets the door menu', await page.has('[data-testid="door-hinge"]'));
        check('…with the front style', await page.has('[data-testid="door-style"]'));
        check('…and the handle systems', await page.has('[data-testid="door-handle"]'));
        await shot(page, 'f3-door.png');
      }
      if (clicked === 'wardrobe') {
        check('…and the carcass gets the wardrobe menu', await page.has('[data-testid="wardrobe-width"]'));
        check('…with DOORS and BAYS apart', (await page.has('[data-testid="wardrobe-doors"]'))
          && (await page.has('[data-testid="wardrobe-bays"]')));
        await shot(page, 'f3-wardrobe.png');
      }
      await page.click('[data-testid="detail-done"]');
      await page.sleep(500);
    }

    // …and the ESTIMATE duty is what column 7 shows with nothing selected.
    check('with nothing selected, column 7 is the ESTIMATE',
      (await page.ask('document.querySelector(\'[data-testid="column-detail"]\').dataset.duty')) === 'estimate');
    await shot(page, 'f6-estimate.png');
    check('the estimate row carries its NAME', await page.has('[data-testid="estimate-rename-1"]'));
  } finally {
    await page.close?.();
  }
}

// ═══ F4 · THE STAGE HINT ═══════════════════════════════════════════════════
if (runs('f4')) {
  process.stdout.write('\nF4 — THE STAGE HINT, AND THE ITEM\'S NAME\n');
  const page = await open({ width: 1920, height: 1080 });
  try {
    await page.goto(`${BASE}retail.html#/design`);
    await stageReady(page);
    const hint = await page.text('[data-testid="stage-caption"]');
    check('the copy is unchanged', hint.includes('DRAG TO ORBIT'), hint.slice(0, 60));
    const alone = await page.text('[data-testid="stage-caption-name"]');
    check('…and with nothing selected it is the design\'s name alone',
      alone.length > 0 && !alone.includes('—'), alone);
    await shot(page, 'f4-hint-nothing-selected.png');

    // …and the brief's own example: `BEDROOM WARDROBE — LEFT DOOR`.
    await page.click('[data-testid="view-front"]');
    await page.sleep(1600);
    const canvas = await page.box('[data-testid="stage-canvas"]');
    const cx = canvas.x + Math.round(canvas.w / 2);
    const cy = canvas.y + Math.round(canvas.h / 2);
    await page.mouse('mouseMoved', cx, cy, { buttons: 0 });
    await page.mouse('mousePressed', cx, cy);
    await page.mouse('mouseReleased', cx, cy, { buttons: 0 });
    await page.sleep(1200);
    const named = await page.text('[data-testid="stage-caption-name"]');
    check('a selected element is named after a hairline', named.includes('—'), named);
    check('…and the word is the ENGINE\'s own', /DOOR|SHELF|DRAWER|RAIL/.test(named), named);
    await shot(page, 'f4-hint.png');

    // Rename on the estimate row, and the hint follows.
    await page.click('[data-testid="detail-done"]');
    await page.sleep(600);
    await page.slide('[data-testid="estimate-rename-1"]', 'Landing wardrobe');
    await page.sleep(700);
    check('renaming the design renames the hint',
      (await page.text('[data-testid="stage-caption-name"]')).includes('LANDING'),
      await page.text('[data-testid="stage-caption-name"]'));
    await shot(page, 'f4-hint-renamed.png');
  } finally {
    await page.close?.();
  }
}

// ═══ THE VERDICT ═══════════════════════════════════════════════════════════
const failed = steps.filter((s) => !s.ok);
writeFileSync(`${SHOTS}walk.json`, `${JSON.stringify({ steps, failed: failed.length }, null, 1)}\n`);
process.stdout.write(`\n${'─'.repeat(72)}\n${steps.length} checks, ${failed.length} failed\n`);
if (failed.length) {
  for (const s of failed) process.stdout.write(`  FAIL  ${s.label}${s.detail ? ` — ${s.detail}` : ''}\n`);
}
process.exit(failed.length ? 1 : 0);
