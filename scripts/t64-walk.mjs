// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 64) ───────────────────────
//
// Every claim this turn makes about a PAGE ends in a frame. `npm test` and
// `npm run build` can both be green while the thing on screen is wrong,
// because neither of them opens a browser — turns 5, 58b, 59, 60, 61, 62 and
// 63 all learnt that the same way.
//
//   npm run build && npx vite preview --port 4173
//   (cd /tmp/t64-base && npx vite build && npx vite preview --port 4175)   the "before"
//   node scripts/t64-walk.mjs             every section
//   node scripts/t64-walk.mjs f1          one of them
//
// ─── WHAT THIS WALK HAS TO PROVE ───────────────────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, 6: *"Playwright walk: every F's frames,
// committed, plus one full lazy-client run — six NEXT clicks from a fresh
// start to ADD TO MY ESTIMATE, as a numbered frame sequence lazy-01.png …
// lazy-07.png."* F1's eight items each REPRODUCE the fault on the base build
// (origin/main, served on 4175) before the fix is photographed on this one —
// one before/after pair per item. F2 photographs each step at its default;
// F3 a panel before and after, the rail, a primary beside a secondary; F4
// the layout at rest, the panel slid in, and both at 1280; F5 the page with
// two items, EDIT landing in DESIGN, and ADD TO MY ESTIMATE returning with
// three.
//
// THE HARDWARE IS SERVED FROM THE SILENT SHOWROOM (T23 R8): this container's
// egress policy answers 403 to the real bucket, so the walk serves
// `test/fixtures/hardware-local/` and points BOTH pages at it through the one
// documented `localStorage['cc.hardwareBase']` knob.
//
// THE CAMERA IS PLACED, NEVER NUDGED — T57's rule, kept.
// THE PORT IS DERIVED FROM THE PID — t59's lesson 4.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const BEFORE = process.env.BEFORE_URL || 'http://127.0.0.1:4175/';
const SHOTS = new URL('../verify/t64/', import.meta.url).pathname;
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
const nextPort = () => 9600 + ((process.pid + (seq += 13)) % 240);

// The showroom, once, for every section.
const showroom = await startFixtureServer({ port: 4300 + (process.pid % 90) });

async function open({ width = 1440, height = 900 } = {}) {
  const page = await launch({ width, height, port: nextPort() });
  page.ask = (expr) => page.evaluate(`return (${expr});`);
  page.text = (sel) => page.ask(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').trim()`);
  page.has = (sel) => page.ask(`Boolean(document.querySelector(${JSON.stringify(sel)}))`);
  page.count = (sel) => page.ask(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  page.box = (sel) => page.ask(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)});`
    + ' if (!el) return null; const r = el.getBoundingClientRect();'
    + ' return { w: Math.round(r.width), h: Math.round(r.height),'
    + ' x: Math.round(r.x), y: Math.round(r.y) }; })()',
  );
  page.clickAt = async (x, y) => {
    await page.mouse('mouseMoved', x, y, { buttons: 0, clickCount: 0 });
    await page.mouse('mousePressed', x, y);
    await page.mouse('mouseReleased', x, y);
  };
  page.key = async (key) => {
    const vk = key === 'Delete' ? 46 : (key === 'Escape' ? 27 : 0);
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyDown', key, code: key, windowsVirtualKeyCode: vk,
    });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key });
    await page.sleep(700);
  };
  /** Click the button whose text is this word, inside this root. */
  page.clickText = async (rootSel, word) => {
    const at = await page.ask(
      `(() => { const root = document.querySelector(${JSON.stringify(rootSel)}) || document;`
      + ` const want = ${JSON.stringify(String(word))};`
      + ' const hit = [...root.querySelectorAll("button")]'
      + '   .find((c) => (c.textContent || "").trim() === want);'
      + ' if (!hit) return null; hit.scrollIntoView({ block: "center" }); const r = hit.getBoundingClientRect();'
      + ' return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()',
    );
    if (!at) return false;
    await page.clickAt(at.x, at.y);
    await page.sleep(700);
    return true;
  };
  page.showroom = async (url) => {
    await page.goto(url);
    await page.evaluate(`try { localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); } catch (e) {} return true;`);
    await page.evaluate('location.reload(); return true;');
    await page.sleep(1500);
  };
  return page;
}

/** Wait for the wardrobe to exist and the renderer to have a scene. */
async function stageReady(page, timeout = 45000) {
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout });
  await page.waitFor('window.__cc.pbi.render.bounds() !== null', { timeout });
  await page.sleep(3200);
}

const shot = (page, file) => page.screenshot(`${SHOTS}${file}`);

/** Open the design room on a step / category. */
async function room(page, step = null, { base = BASE, hash = '#/design' } = {}) {
  await page.showroom(`${base}retail.html${hash}`);
  await stageReady(page);
  if (step) {
    await page.click(`[data-testid="cat-${step}"]`);
    await page.sleep(700);
  }
}

const unitIds = (page) => page.ask('window.__cc.project.getState().units.map((u) => u.id)');
const shelvesIn = (page, id) => page.ask(`(window.__cc.project.getState().units.find((u) => u.id === ${JSON.stringify(id)})?.params.sections[0].items || []).filter((i) => i.kind === 'shelf').map((i) => i.pos_mm)`);
const frontsOf = (page, id) => page.ask(`window.__cc.project.getState().unitResult(${JSON.stringify(id)}).panels.filter((p) => p.part === 'FRONT').length`);
const ledSprites = (page) => page.ask(
  '(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return -1;'
  + ' let n = 0; v.scene.traverse((o) => { if (o.isSprite && o.userData && o.userData.ccHelper) n += 1; }); return n; })()',
);
const camera = (page) => page.ask(`(() => { const v = window.__cc.views.room; const b = window.__cc.pbi.render.bounds();
  const cx = (b.min[0] + b.max[0]) / 2; return { dx: Math.abs(v.camera.position.x - cx), z: v.camera.position.z - b.max[2], y: v.camera.position.y }; })()`);

/** The centre of the stage — where the wardrobe's door is. */
async function stageCentre(page) {
  const b = await page.box('[data-testid="stage-canvas"]');
  return { x: Math.round(b.x + b.w * 0.5), y: Math.round(b.y + b.h * 0.55) };
}

/** Press ADD in PRO's AddItems (copied) for a kind, on whichever page. */
async function addThroughList(page, kind) {
  await page.evaluate(`(() => { const row = document.querySelector('[data-add-kind="${kind}"]'); if (row) row.click(); return true; })(); return true;`);
  await page.sleep(500);
  const ok = await page.clickText('[data-testid="interior-pro-list"]', 'Add');
  await page.sleep(1200);
  return ok;
}

// ═══ F1 · THE SMALL THINGS THAT BROKE — BEFORE (4175) AND AFTER (4173) ═══════
if (runs('f1')) {
  process.stdout.write('\nF1 — THE SMALL THINGS THAT BROKE\n');

  // ─── F1.1 · DELETE ─────────────────────────────────────────────────────
  for (const [tag, base] of [['before', BEFORE], ['after', BASE]]) {
    const page = await open();
    try {
      await room(page, null, { base });
      const [id] = await unitIds(page);
      const c = await stageCentre(page);
      await page.clickAt(c.x, c.y);
      await page.sleep(900);
      const sel = await page.ask('window.__cc.ui.getState().selectedElement');
      const before = await frontsOf(page, id);
      await page.key('Delete');
      await page.sleep(800);
      const after = await frontsOf(page, id);
      await shot(page, `f1-delete-${tag}.png`);
      if (tag === 'before') {
        check('F1.1 BEFORE — a door selected, Delete pressed, the door STAYS (the fault)', sel && after === before, `${before} → ${after} fronts`);
      } else {
        check('F1.1 AFTER — Delete takes the selected door, through PRO\'s removeFront', sel && after < before, `${before} → ${after} fronts`);
        // …and refuses the last wardrobe, in the reasons file's sentence.
        await page.evaluate(`window.__cc.ui.getState().clearElement(); window.__cc.ui.getState().selectUnit(${JSON.stringify(id)}); return true;`);
        await page.key('Delete');
        const said = await page.text('[data-testid="stage-said"]');
        const units = await page.count('[data-testid="stage-canvas"]') && (await unitIds(page)).length;
        check('F1.1 AFTER — Delete on the only wardrobe is REFUSED with a sentence', units === 1 && /only wardrobe/i.test(said), said);
      }
    } finally { await page.close?.(); }
  }

  // ─── F1.2 · THE PLUS ADDS TO THE WARDROBE IT WAS PRESSED ON ─────────────
  for (const [tag, base] of [['before', BEFORE], ['after', BASE]]) {
    const page = await open();
    try {
      await room(page, null, { base });
      const [a] = await unitIds(page);
      // A second wardrobe beside the first, then the INNER PLUS on B — which
      // is `selectUnit(B)` + the INSIDE/INTERIOR step (Scene.jsx onAddItems).
      const b = await page.evaluate(`const s = window.__cc.project.getState(); const r = s.addUnit('WARDROBE', { near: ${JSON.stringify(a)}, side: 'R' }); return r && r.id;`);
      await page.sleep(1500);
      await page.evaluate(`window.__cc.ui.getState().selectUnit(${JSON.stringify(b)}); return true;`);
      await page.click(tag === 'before' ? '[data-testid="cat-interior"]' : '[data-testid="cat-inside"]');
      await page.sleep(900);
      await addThroughList(page, 'shelves');
      const inA = (await shelvesIn(page, a)).length;
      const inB = (await shelvesIn(page, b)).length;
      await page.click('[data-testid="view-open-all"]').catch(() => {});
      await page.sleep(1200);
      await shot(page, `f1-plus-${tag}.png`);
      if (tag === 'before') check('F1.2 BEFORE — plus on B, the shelf lands in A (the fault)', inA === 1 && inB === 0, `A ${inA} · B ${inB}`);
      else check('F1.2 AFTER — plus on B, the shelf lands in B', inB === 1 && inA === 0, `A ${inA} · B ${inB}`);
    } finally { await page.close?.(); }
  }

  // ─── F1.3 · THE LED ICONS' LAW ──────────────────────────────────────────
  {
    const before = await open();
    try {
      await room(before, null, { base: BEFORE });
      const n = await ledSprites(before);
      await shot(before, 'f1-led-before.png');
      check('F1.3 BEFORE — LED icons with the lighting panel CLOSED (the fault)', n >= 2, `${n} icons`);
    } finally { await before.close?.(); }
    const page = await open();
    try {
      await room(page);
      const closed = await ledSprites(page);
      await shot(page, 'f1-led-after-closed.png');
      check('F1.3 AFTER — panel closed → no icons', closed === 0, `${closed} icons`);
      // A shelf, so there is a shelf slot; then LIGHTS opens PRO's panel.
      await page.evaluate(`window.__cc.project.getState().addShelves(window.__cc.project.getState().units[0].id, 1); return true;`);
      await page.sleep(800);
      await page.click('[data-testid="view-lights"]');
      await page.sleep(1500);
      const off = await ledSprites(page);
      check('F1.3 AFTER — panel open, light OFF → an icon on every slot (shelf, L, R, plinth, top, under top)', off === 6, `${off} icons`);
      await shot(page, 'f1-led-after-open-off.png');
      await page.click('[data-lighting-on]');
      await page.sleep(1200);
      const on = await ledSprites(page);
      check('F1.3 AFTER — light ON → icons hidden; ON is visualisation only', on === 0, `${on} icons`);
      await shot(page, 'f1-led-after-on.png');
      await page.click('[data-lighting-off]');
      await page.sleep(600);
      check('F1.3 AFTER — OFF again → the icons return', (await ledSprites(page)) === 6);
      await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
    } finally { await page.close?.(); }
  }

  // ─── F1.4 · SHELVES GO IN CENTRED ───────────────────────────────────────
  for (const [tag, base] of [['before', BEFORE], ['after', BASE]]) {
    const page = await open();
    try {
      await room(page, tag === 'before' ? 'interior' : 'inside', { base });
      const [id] = await unitIds(page);
      await addThroughList(page, 'shelves');
      await addThroughList(page, 'shelves');
      const pos = (await shelvesIn(page, id)).sort((x, y) => x - y);
      await page.click('[data-testid="view-open-all"]');
      await page.sleep(1200);
      await shot(page, `f1-shelves-${tag}.png`);
      const spacing = pos.length === 2 ? pos[1] - pos[0] : 0;
      if (tag === 'before') check('F1.4 BEFORE — the second shelf halves the biggest opening: a quarter up (the fault)', pos.length === 2 && spacing < 600, pos.join(', '));
      else check('F1.4 AFTER — two shelves, three equal openings — the KIT\'s ladder', pos.length === 2 && spacing > 600, pos.join(', '));
    } finally { await page.close?.(); }
  }

  // ─── F1.5 · THE J-PULL RENDERS ──────────────────────────────────────────
  for (const [tag, base] of [['before', BEFORE], ['after', BASE]]) {
    const page = await open();
    try {
      await room(page, 'fronts', { base });
      const [id] = await unitIds(page);
      if (tag === 'before') await page.clickText('[data-testid="fronts-style"]', 'J-PULL');
      else await page.clickText('[data-testid="fronts-opening"]', 'J-PULL HANDLELESS');
      await page.sleep(1500);
      const stamped = await page.ask(`window.__cc.project.getState().unitResult(${JSON.stringify(id)}).panels.filter((p) => p.part === 'FRONT' && p.meta && p.meta.jpull).length`);
      const handle = await page.ask('JSON.stringify(window.__cc.project.getState().project.design.fronts.handle)');
      await shot(page, `f1-jpull-${tag}.png`);
      if (tag === 'before') check('F1.5 BEFORE — J-PULL chosen as a STYLE: no handle written, nothing stamped, nothing drawn (the fault)', stamped === 0, `handle ${handle} · ${stamped} leaves stamped`);
      else check('F1.5 AFTER — J-pull chosen as the OPENING: handle jpull written as PRO writes it, every leaf stamped', stamped > 0 && /jpull/.test(handle), `handle ${handle} · ${stamped} leaves stamped`);
    } finally { await page.close?.(); }
  }

  // ─── F1.6 · DEFAULT VIEW FROM THE FRONT ─────────────────────────────────
  for (const [tag, base] of [['before', BEFORE], ['after', BASE]]) {
    const page = await open();
    try {
      await room(page, null, { base });
      const cam = await camera(page);
      await shot(page, `f1-front-${tag}.png`);
      if (tag === 'before') check('F1.6 BEFORE — the first camera is the ROOM corner, off to one side (the fault)', cam.dx > 0.5, `off-centre by ${cam.dx.toFixed(2)} m`);
      else {
        check('F1.6 AFTER — the first camera is FRONT: square on the centre line', cam.dx < 0.01 && cam.z > 0, `off-centre by ${cam.dx.toFixed(3)} m · ${cam.z.toFixed(2)} m in front`);
        check('F1.6 AFTER — the bar lights FRONT', (await page.ask('document.querySelector(\'[data-testid="view-front"]\').dataset.active')) === 'yes');
      }
    } finally { await page.close?.(); }
  }

  // ─── F1.7 · DOORS AND BAYS LEAVE THE MAIN MENU ──────────────────────────
  {
    const before = await open();
    try {
      await room(before, 'layout', { base: BEFORE });
      const rows = (await before.has('[data-testid="layout-doors"]')) && (await before.has('[data-testid="layout-bays"]'));
      await shot(before, 'f1-doors-before.png');
      check('F1.7 BEFORE — DOORS and BAYS on LAYOUT, the main menu (the fault)', rows);
    } finally { await before.close?.(); }
    const page = await open();
    try {
      await room(page, 'where');
      const gone = !(await page.has('[data-testid="layout-doors"]')) && !(await page.has('[data-testid="cat-layout"]'));
      check('F1.7 AFTER — no DOORS, no BAYS, no LAYOUT on the rail', gone);
      await page.click('[data-testid="where-more"]');
      await page.sleep(400);
      await page.click('[data-testid="layout-open-wardrobe"]');
      await page.sleep(1200);
      const advanced = await page.has('[data-testid="wardrobe-advanced"] [data-testid="wardrobe-doors"]')
        && await page.has('[data-testid="wardrobe-advanced"] [data-testid="wardrobe-bays"]');
      const line = await page.text('[data-testid="wardrobe-advanced-line"]');
      check('F1.7 AFTER — both rows under Advanced in the wardrobe\'s EDIT, with the line', advanced && /We set the doors for this width/.test(line), line);
      await page.evaluate('document.querySelector(\'[data-testid="wardrobe-advanced"]\').scrollIntoView({ block: "center" }); return true;');
      await page.sleep(400);
      await shot(page, 'f1-doors-after.png');
    } finally { await page.close?.(); }
  }

  // ─── F1.8 · ONE WALL ────────────────────────────────────────────────────
  {
    const before = await open();
    try {
      await room(before, 'space', { base: BEFORE });
      await shot(before, 'f1-onewall-before.png');
      check('F1.8 BEFORE — WALLS 1 | 2 chips on YOUR SPACE', await before.has('[data-testid="space-walls"]'));
    } finally { await before.close?.(); }
    const page = await open();
    try {
      await room(page, 'where');
      await shot(page, 'f1-onewall-after.png');
      check('F1.8 AFTER — no WALLS chips, no WALL 2 WIDTH; the wall and the ceiling only',
        !(await page.has('[data-testid="space-walls"]')) && !(await page.has('[data-testid="space-wall2"]'))
        && (await page.has('[data-testid="space-wall"]')) && (await page.has('[data-testid="space-ceiling"]')));
      const scope = await page.ask('window.__cc.project.getState().project.design.scope');
      check('F1.8 AFTER — the scope is one wall', scope === 'wall', scope);
    } finally { await page.close?.(); }
  }
}

// ═══ F2 · THE STEPS, IN THE OWNER'S ORDER ══════════════════════════════════
if (runs('f2')) {
  process.stdout.write('\nF2 — THE SIX STEPS\n');
  const page = await open();
  try {
    await room(page);
    const tiles = await page.ask('[...document.querySelectorAll(\'[data-testid^="cat-"]\')].map((b) => b.dataset.testid.slice(4))');
    check('the rail is the six steps, in order', tiles.join(',') === 'what,where,inside,fronts,extras,review', tiles.join(','));
    for (const step of ['what', 'where', 'inside', 'fronts', 'extras', 'review']) {
      await page.click(`[data-testid="cat-${step}"]`);
      await page.sleep(900);
      const on = await page.ask(`document.querySelector('[data-testid="cat-${step}"]').classList.contains('is-on')`);
      const panel = await page.has(`[data-testid="panel-${step}"]`);
      check(`${step.toUpperCase()} — the tile lights, the panel stands, at its default`, on && panel);
      await shot(page, `f2-${step}.png`);
    }
    // Step 3, the owner's "najważniejsze": the carcass material ABOVE the rows.
    await page.click('[data-testid="cat-inside"]');
    await page.sleep(800);
    const material = await page.box('[data-testid="inside-material"] [data-material-panel]');
    const rows = await page.box('[data-testid="interior-pro-list"]');
    check('INSIDE opens on the carcass material — PRO\'s slot — ABOVE the interior rows', material && rows && material.y < rows.y, `slot y${material?.y} · rows y${rows?.y}`);
    const src = await page.count('[data-testid="inside-material"] [data-carcass-source]');
    check('…with every carcass source the profile names, on one line', src >= 3, `${src} sources`);
    const wrapped = await page.ask('(() => { const seg = document.querySelector(\'[data-testid="inside-material"] [data-source-seg]\'); const bs = [...seg.querySelectorAll("button")]; const tops = new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top))); return tops.size; })()');
    check('…and the source strip does not wrap', wrapped === 1, `${wrapped} row(s)`);
    await shot(page, 'f2-inside-material-first.png');
    // NEXT always works: the defaults are already standing.
    const defaults = await page.ask(`(() => { const s = window.__cc.project.getState(); const d = s.project.design; const u = s.units[0];
      return { style: d.fronts.style, handle: d.fronts.handle, front: d.fronts.types[0] && d.fronts.types[0].finish_id, carcass: d.carcass.types[0] && d.carcass.types[0].finish_id, width: Math.round(u.params.width), lights: d.lighting.on }; })()`);
    check('the lazy client\'s answers stand before any click: shaker · push · house decor · white inside · fills the wall · lights off',
      defaults.style === 'S' && defaults.handle === null && defaults.front && defaults.carcass && defaults.width > 3000 && !defaults.lights, JSON.stringify(defaults));
  } finally { await page.close?.(); }
}

// ═══ F3 · POSH ═════════════════════════════════════════════════════════════
if (runs('f3')) {
  process.stdout.write('\nF3 — POSH\n');
  const before = await open();
  try {
    await room(before, 'details', { base: BEFORE });
    await shot(before, 'f3-panel-before.png');
    const b = await before.ask('(() => { const el = document.querySelector(".pbi-btn"); if (!el) return null; const s = getComputedStyle(el); return { size: s.fontSize, track: s.letterSpacing, h: Math.round(el.getBoundingClientRect().height) }; })()');
    note('BEFORE — a button', b ? `${b.size} · tracked ${b.track} · ${b.h}px tall` : 'none on screen');
  } finally { await before.close?.(); }
  const page = await open();
  try {
    await room(page, 'extras');
    await shot(page, 'f3-panel-after.png');
    await shot(page, 'f3-rail.png');
    const tile = await page.box('[data-testid="cat-what"]');
    check('rail tiles are square, 64px at 1440', tile && tile.w === tile.h && Math.abs(tile.w - 64) <= 1, `${tile?.w}×${tile?.h}`);
    const icon = await page.box('[data-testid="cat-what"] svg');
    check('…icon 20px', icon && Math.abs(icon.w - 20) <= 1, `${icon?.w}px`);
    const word = await page.ask('getComputedStyle(document.querySelector(\'[data-testid="cat-what"] .pbi-tile-word\')).fontSize');
    check('…one word at 11px', word === '11px', word);
    const active = await page.ask('(() => { const s = getComputedStyle(document.querySelector(".pbi-tile.is-on")); return { under: s.borderBottomColor, bg: s.backgroundColor }; })()');
    check('the active tile is a gold hairline underline, not a filled block', /128, 106, 68/.test(active.under) && !/128, 106, 68/.test(active.bg), JSON.stringify(active));
    // A primary beside a secondary: the step nav.
    const primary = await page.ask('(() => { const el = document.querySelector(\'[data-testid="step-next"]\'); const s = getComputedStyle(el); return { size: s.fontSize, track: s.letterSpacing, radius: s.borderRadius, h: Math.round(el.getBoundingClientRect().height), bg: s.backgroundColor, family: s.fontFamily.split(",")[0] }; })()');
    const secondary = await page.ask('(() => { const el = document.querySelector(\'[data-testid="step-back"]\'); const s = getComputedStyle(el); return { size: s.fontSize, track: s.letterSpacing, radius: s.borderRadius, h: Math.round(el.getBoundingClientRect().height), border: s.borderColor, bg: s.backgroundColor }; })()');
    check('PRIMARY: filled Onyx, square, 12px·0.08em, 44px at 1440 (36 at scale)', /9, 10, 9/.test(primary.bg) && primary.radius === '0px' && Math.abs(primary.h - 36) <= 1 && /0\.96px|0\.9[0-9]px|1px/.test(primary.track), JSON.stringify(primary));
    check('SECONDARY: outlined, hairline, square, 12px, small = 36px at 1440 (29 at scale)', !/9, 10, 9\)$/.test(secondary.bg) && secondary.radius === '0px' && Math.abs(secondary.h - 29) <= 1, JSON.stringify(secondary));
    await page.evaluate('document.querySelector(\'[data-testid="step-nav"]\').scrollIntoView(); return true;');
    await shot(page, 'f3-buttons.png');
    // The copies inherit through the generated sheet: PRO's own window, reskinned.
    await page.click('[data-testid="extras-more"]');
    await page.sleep(400);
    await page.click('[data-testid="extras-open-lighting"]');
    await page.sleep(1500);
    const copyBtn = await page.ask('(() => { const el = document.querySelector("[data-lighting-panel] .pbi-re-btn"); if (!el) return null; const s = getComputedStyle(el); return { radius: s.borderRadius, size: s.fontSize, track: s.letterSpacing }; })()');
    check('a copied PRO window\'s buttons are square and 12px tracked — through pbi-re-btn, never its markup', copyBtn && copyBtn.radius === '0px' && copyBtn.size === '12px', JSON.stringify(copyBtn));
    await shot(page, 'f3-copy-reskinned.png');
    await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
  } finally { await page.close?.(); }
}

// ═══ F4 · LAYOUT B ═════════════════════════════════════════════════════════
if (runs('f4')) {
  process.stdout.write('\nF4 — LAYOUT B\n');
  for (const width of [1440, 1280]) {
    const page = await open({ width, height: width === 1440 ? 900 : 800 });
    try {
      await room(page);
      const rail = await page.box('[data-testid="column-categories"]');
      const options = await page.box('[data-testid="column-options"]');
      const stage = await page.box('[data-testid="stage-canvas"]');
      const detail = await page.box('[data-testid="column-detail"]');
      const price = await page.text('[data-testid="total-price"]');
      const link = await page.text('[data-testid="nav-estimate"]');
      check(`${width} — rail ${rail?.w} · options ${options?.w} · stage ${stage?.w}; the detail is off the stage's right edge`,
        rail && options && stage && detail && detail.x >= stage.x + stage.w - 1, `detail x${detail?.x} w${detail?.w}`);
      if (width === 1440) {
        check('1440 — the owner\'s numbers: rail 72, options ~340, detail ~360', rail.w === 72 && Math.abs(options.w - 340) <= 2 && Math.abs(detail.w - 360) <= 2, `${rail.w} · ${options.w} · ${detail.w}`);
      }
      check(`${width} — the top bar's right end: "${price} · ${link}"`, /Price on request/.test(price) && /MY ESTIMATE \(\d+\)/.test(link));
      await shot(page, `f4-layout-${width}.png`);
      // A click on a door slides the panel in, over the stage.
      const c = await stageCentre(page);
      await page.clickAt(c.x, c.y);
      await page.sleep(1100);
      const open_ = await page.ask('document.querySelector(\'[data-testid="column-detail"]\').dataset.open');
      const slid = await page.box('[data-testid="column-detail"]');
      check(`${width} — a click on a door slides the DETAIL in, over the stage`, open_ === 'yes' && slid.x + slid.w <= stage.x + stage.w + 1 && slid.x > stage.x, `x${slid?.x} w${slid?.w}`);
      await shot(page, `f4-panel-in-${width}.png`);
      // DONE slides it out; so does the empty stage.
      await page.click('[data-testid="detail-done"]');
      await page.sleep(700);
      check(`${width} — DONE slides it out`, (await page.ask('document.querySelector(\'[data-testid="column-detail"]\').dataset.open')) === 'no');
      await page.clickAt(c.x, c.y);
      await page.sleep(900);
      await page.clickAt(stage.x + 30, stage.y + 30);
      await page.sleep(900);
      check(`${width} — a click on the empty stage slides it out`, (await page.ask('document.querySelector(\'[data-testid="column-detail"]\').dataset.open')) === 'no');
    } finally { await page.close?.(); }
  }
}

// ═══ F5 · MY ESTIMATE ══════════════════════════════════════════════════════
if (runs('f5')) {
  process.stdout.write('\nF5 — MY ESTIMATE\n');
  const page = await open();
  try {
    await room(page, 'review');
    // Item 1: DONE → ADD TO MY ESTIMATE.
    await page.click('[data-testid="review-done"]');
    await page.sleep(2000);
    check('DONE → ADD TO MY ESTIMATE lands on the estimate page with one item',
      (await page.ask('location.hash')) === '#/estimate' && (await page.count('[data-testid^="estimate-row-"]')) === 1);
    // Item 2: ADD ANOTHER WARDROBE → the room in add mode, at step 1 → six clicks.
    await page.click('[data-testid="add-another"]');
    await stageReady(page);
    check('ADD ANOTHER WARDROBE opens DESIGN in ADD mode, at step 1', /ADD A WARDROBE/.test(await page.text('[data-testid="options-title"]')) && (await page.has('[data-testid="panel-what"]')));
    for (let i = 0; i < 5; i += 1) { await page.click('[data-testid="step-next"]'); await page.sleep(500); }
    await page.evaluate('const el = document.querySelector(\'[data-testid="estimate-name"]\'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "Hall wardrobe"); el.dispatchEvent(new Event("input", { bubbles: true })); return true;');
    await page.sleep(300);
    await page.click('[data-testid="review-done"]');
    await page.sleep(2000);
    const two = await page.count('[data-testid^="estimate-row-"]');
    check('the page lists two items, each with its thumbnail, room, size, fronts and Price on request',
      two === 2 && (await page.count('[data-testid="estimate-thumb"]')) === 2 && /Price on request/.test(await page.text('[data-testid="estimate-row-2"]')));
    check('…and the top bar counts them', /MY ESTIMATE \(2\)/.test(await page.text('[data-testid="nav-estimate"]')));
    await shot(page, 'f5-page-two-items.png');
    // EDIT → the room in EDIT mode with the right title.
    await page.click('[data-testid="estimate-edit-2"]');
    await stageReady(page);
    const title = await page.text('[data-testid="options-title"]');
    check('EDIT lands in DESIGN in edit mode, titled "EDIT — Hall wardrobe"', title === 'EDIT — Hall wardrobe', title);
    await page.click('[data-testid="cat-review"]');
    await page.sleep(800);
    check('…and REVIEW\'s button reads SAVE CHANGES', (await page.text('[data-testid="review-done"]')) === 'SAVE CHANGES');
    await shot(page, 'f5-edit-landing.png');
    await page.click('[data-testid="review-done"]');
    await page.sleep(1800);
    check('SAVE CHANGES returns to the page, still two items', (await page.count('[data-testid^="estimate-row-"]')) === 2);
    // Item 3: DUPLICATE, then ADD TO MY ESTIMATE from a fresh design → three.
    await page.click('[data-testid="add-another"]');
    await stageReady(page);
    await page.click('[data-testid="cat-review"]');
    await page.sleep(800);
    await page.click('[data-testid="review-done"]');
    await page.sleep(2000);
    const three = await page.count('[data-testid^="estimate-row-"]');
    check('ADD TO MY ESTIMATE returns to the page with three', three === 3, `${three} rows`);
    await shot(page, 'f5-three-items.png');
    // × takes one out, DUPLICATE puts one back — the store's own two.
    await page.click('[data-testid="estimate-remove-3"]');
    await page.sleep(500);
    await page.click('[data-testid="estimate-duplicate-1"]');
    await page.sleep(500);
    check('× and DUPLICATE are the list\'s own', (await page.count('[data-testid^="estimate-row-"]')) === 3 && /\(copy\)/.test(await page.text('[data-testid="estimate-name-2"]')));
    await page.click('[data-testid="estimate-quote"]');
    await page.sleep(600);
    check('REQUEST A QUOTE is the whole list\'s, over the page', await page.has('[data-testid="quote-overlay"]'));
    await shot(page, 'f5-quote.png');
  } finally { await page.close?.(); }
}

// ═══ THE LAZY CLIENT — SIX CLICKS TO A FINISHED WARDROBE ═══════════════════
if (runs('lazy')) {
  process.stdout.write('\nTHE LAZY CLIENT — six clicks\n');
  const page = await open();
  try {
    await room(page);
    await shot(page, 'lazy-01.png');
    const steps6 = ['where', 'inside', 'fronts', 'extras', 'review'];
    for (let i = 0; i < steps6.length; i += 1) {
      await page.click('[data-testid="step-next"]');
      await page.sleep(1100);
      const at = await page.ask('document.querySelector(\'[data-testid="column-options"]\').dataset.category');
      check(`click ${i + 1} · NEXT → ${steps6[i].toUpperCase()}`, at === steps6[i], at);
      await shot(page, `lazy-0${i + 2}.png`);
    }
    await page.click('[data-testid="review-done"]');
    await page.sleep(2200);
    const rows = await page.count('[data-testid^="estimate-row-"]');
    check('click 6 · DONE → ADD TO MY ESTIMATE — a finished wardrobe in the estimate', (await page.ask('location.hash')) === '#/estimate' && rows === 1, `${rows} item(s)`);
    await shot(page, 'lazy-07.png');
  } finally { await page.close?.(); }
}

// ═══ THE VERDICT ═══════════════════════════════════════════════════════════
showroom.close?.();
const failed = steps.filter((s) => !s.ok);
writeFileSync(`${SHOTS}walk.json`, `${JSON.stringify({ steps, failed: failed.length }, null, 1)}\n`);
process.stdout.write(`\n${'─'.repeat(72)}\n${steps.length} checks, ${failed.length} failed\n`);
if (failed.length) {
  for (const s of failed) process.stdout.write(`  FAIL  ${s.label}${s.detail ? ` — ${s.detail}` : ''}\n`);
}
process.exit(failed.length ? 1 : 0);
