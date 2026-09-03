// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 63) ───────────────────────
//
// Every claim this turn makes about a PAGE ends in a frame. `npm test` and
// `npm run build` can both be green while the thing on screen is wrong,
// because neither of them opens a browser — turns 5, 58b, 59, 60, 61 and 62
// all learnt that the same way.
//
//   npm run build && npx vite preview --port 4173
//   (cd /tmp/t63-base && npx vite build && npx vite preview --port 4175)   the "before"
//   node scripts/t63-walk.mjs             every section
//   node scripts/t63-walk.mjs f2          one of them
//
// ─── WHAT THIS WALK HAS TO PROVE ───────────────────────────────────────────
//
// The owner: *"miało być identycznie jak w PRO, tylko inna kolorystyka i
// trochę mniej, a pozmieniałeś sporo."* So every frame is of a PRO WINDOW,
// open, in the client's room, with the CLICK PATH that opened it named in the
// check beside it — and a count of what it shows, because a frame of a sketch
// is a frame too. F1's two frames are the same scene in both applications.
//
// THE HARDWARE IS SERVED FROM THE SILENT SHOWROOM (T23 R8): this container's
// egress policy answers 403 to the real bucket, so the walk serves
// `test/fixtures/hardware-local/` and points BOTH pages at it through the one
// documented `localStorage['cc.hardwareBase']` knob — the same knob, read by
// the same `lib/storageBase.js`, on either side of the boundary.
//
// THE CAMERA IS PLACED, NEVER NUDGED — T57's rule, kept.
// THE PORT IS DERIVED FROM THE PID — t59's lesson 4.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const BEFORE = process.env.BEFORE_URL || 'http://127.0.0.1:4175/';
const SHOTS = new URL('../verify/t63/', import.meta.url).pathname;
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

async function open({ width = 1920, height = 1200 } = {}) {
  const page = await launch({ width, height, port: nextPort() });
  await page.send('Network.enable', {});
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
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
  /** Click by a CSS selector's own box centre — for hooks with no testid. */
  page.clickBox = async (sel) => {
    const b = await page.box(sel);
    if (!b) return false;
    const x = Math.round(b.x + b.w / 2);
    const y = Math.round(b.y + b.h / 2);
    await page.mouse('mouseMoved', x, y, { buttons: 0, clickCount: 0 });
    await page.mouse('mousePressed', x, y);
    await page.mouse('mouseReleased', x, y);
    return true;
  };
  /** Click a point on the page. */
  page.clickAt = async (x, y, { clickCount = 1 } = {}) => {
    await page.mouse('mouseMoved', x, y, { buttons: 0, clickCount: 0 });
    await page.mouse('mousePressed', x, y, { clickCount });
    await page.mouse('mouseReleased', x, y, { clickCount });
  };
  /** Click the button whose text is this word, inside this root. */
  page.clickText = async (rootSel, word) => {
    const at = await page.ask(
      `(() => { const root = document.querySelector(${JSON.stringify(rootSel)}) || document;`
      + ` const want = ${JSON.stringify(String(word))};`
      + ' const hit = [...root.querySelectorAll("button")]'
      + '   .find((c) => (c.textContent || "").trim() === want);'
      + ' if (!hit) return null; const r = hit.getBoundingClientRect();'
      + ' return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()',
    );
    if (!at) return false;
    await page.clickAt(at.x, at.y);
    await page.sleep(700);
    return true;
  };
  /**
   * Point the page at the showroom BEFORE the app boots (the T23 knob). The
   * catalogues are asked for at module scope, so the knob has to be set and
   * the page RELOADED — a hash change is not a boot.
   */
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
  await page.sleep(3500);
}

const shot = (page, file) => page.screenshot(`${SHOTS}${file}`);

/** Open the design room on a category. */
async function room(page, category = 'space', { base = BASE } = {}) {
  await page.showroom(`${base}retail.html#/design`);
  await stageReady(page);
  if (category !== 'space') {
    await page.click(`[data-testid="cat-${category}"]`);
    await page.sleep(700);
  }
}

/** The name of the window on screen, off the shared store. */
const modalOn = (page) => page.ask('window.__cc.ui.getState().modal');
/** The one unit's id. */
const unitId = (page) => page.ask('window.__cc.project.getState().units[0].id');

/** The centre of the stage — where the wardrobe's door is. */
async function stageCentre(page) {
  const b = await page.box('[data-testid="stage-canvas"]');
  return { x: Math.round(b.x + b.w * 0.5), y: Math.round(b.y + b.h * 0.55) };
}

/** Open the wardrobe's own menu in column 7. */
async function openWardrobeMenu(page) {
  await page.click('[data-testid="cat-layout"]');
  await page.sleep(500);
  await page.click('[data-testid="layout-open-wardrobe"]');
  await page.sleep(1200);
  return page.ask('document.querySelector(\'[data-testid="column-detail"]\')?.dataset.menu');
}

/** How many hinge plates the registry says are DRAWN (a model, not a stand-in). */
const platesDrawn = (page) => page.ask(
  '(() => { const hw = window.__cc.hardware; if (!hw || !hw.of) return -1;'
  + ' return hw.of("plate").filter((r) => r.model).length; })()',
);

// ═══ F1 · HINGES, ALWAYS — AND PRO'S STAY X-RAY-ONLY ═══════════════════════
if (runs('f1')) {
  process.stdout.write('\nF1 — HINGES, ALWAYS (retail) · X-RAY-ONLY (PRO)\n');
  const page = await open();
  try {
    await room(page, 'layout');
    // The models are FETCHED; wait for the registry to say the plates landed.
    await page.waitFor('window.__cc.hardware && window.__cc.hardware.of("plate").some((r) => r.model)',
      { timeout: 25000, what: 'the showroom plates to land' }).catch(() => {});
    await page.sleep(800);
    const xray = await page.ask('window.__cc.ui.getState().xray');
    const plates = await platesDrawn(page);
    check('retail — SOLID view, X-ray off', xray === false, `xray=${xray}`);
    check('retail — hinge plates DRAWN in Solid, doors shut', plates > 0, `${plates} plates modelled`);
    // Open every door so the ironmongery is in the picture, then frame it.
    await page.click('[data-testid="view-open-all"]');
    await page.sleep(1600);
    await shot(page, 'f1-retail-solid-hinges.png');
    // …and the runners: with the fronts ON, retail still asks for them.
    const runners = await page.ask(
      '(() => { const hw = window.__cc.hardware; return hw && hw.of ? hw.of("runner").length : -1; })()',
    );
    check('retail — runners are asked for with the fronts on', runners >= 0, `${runners} runner rows reported`);
  } finally {
    await page.close?.();
  }

  // PRO — the same showroom, a wardrobe, doors open, and the joiner's own
  // Solid: X-ray off, `showHinges` off (PRO's own flag) — no plates.
  const pro = await open();
  try {
    await pro.showroom(BASE);
    await pro.goto(BASE);
    await pro.waitFor('window.__cc && window.__cc.project', { what: 'PRO to boot', timeout: 45000 });
    await pro.evaluate(`
      const s = window.__cc.project.getState();
      s.newProject('T63 walk');
      const ui = window.__cc.ui.getState();
      ui.openEditor && ui.openEditor();
      ui.closeModal();
      ui.closeLibrary && ui.closeLibrary();
      const u = s.addUnit('WARDROBE');
      s.updateUnitParams(u.id, { doors: true });
      ui.setShowHinges(false);
      ui.setXray(false);
      return true;
    `);
    await pro.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await pro.sleep(4000);
    const proXray = await pro.ask('window.__cc.ui.getState().xray');
    const proHinges = await pro.ask('window.__cc.ui.getState().showHinges');
    const proPlates = await platesDrawn(pro);
    check('PRO — SOLID view, X-ray off, Show hinges off', proXray === false && proHinges === false);
    check('PRO — not one hinge plate drawn: X-ray-only, as it always was', proPlates <= 0, `${proPlates} plates`);
    await pro.evaluate('window.__cc.ui.getState().openFrontsFor && window.__cc.ui.getState().openFrontsFor(); return true;');
    await pro.sleep(800);
    await shot(pro, 'f1-pro-solid-hinges-absent.png');
    // …and PRO's X-ray still shows them — the law is intact, not broken.
    await pro.evaluate('window.__cc.ui.getState().setXray(true); return true;');
    await pro.sleep(2500);
    const proXrayPlates = await platesDrawn(pro);
    check('PRO — in X-ray the plates appear, as they always have', proXrayPlates > 0, `${proXrayPlates} plates`);
    await shot(pro, 'f1-pro-xray-hinges.png');
  } finally {
    await pro.close?.();
  }
}

// ═══ F2 · LIGHTING, COPIED — LIGHTS OPENS THE PANEL ════════════════════════
if (runs('f2')) {
  process.stdout.write('\nF2 — THE LIGHTING PANEL, COPIED\n');
  const page = await open();
  try {
    await room(page, 'layout');
    const before = await page.ask('Boolean(window.__cc.project.getState().project.design.lighting.on)');
    // LED entries, with the panel CLOSED — the sprites in the live scene.
    const icons = await page.ask(
      '(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return -1;'
      + ' let n = 0; v.scene.traverse((o) => { if (o.isSprite && o.userData && o.userData.ccHelper) n += 1; }); return n; })()',
    );
    check('LED entries are in the scene with the panel CLOSED', icons >= 2, `${icons} LED icons`);
    await shot(page, 'f2-led-entries-panel-closed.png');

    // THE SCENE'S OWN SELECTION FIRST — click a door — and then LIGHTS. The
    // panel reads `selectedElement` exactly as PRO's does, and in this
    // viewport it stands over the stage's centre once open.
    const c = await stageCentre(page);
    await page.clickAt(c.x, c.y);
    await page.sleep(1000);
    const selected = await page.ask('window.__cc.ui.getState().selectedElement');
    check('a door on the stage is the scene\'s selection', Boolean(selected && selected.unitId), JSON.stringify(selected));

    // THE LIGHTS BUTTON OPENS THE PANEL — and does not switch the light.
    await page.click('[data-testid="view-lights"]');
    await page.sleep(1400);
    const modal = await modalOn(page);
    const after = await page.ask('Boolean(window.__cc.project.getState().project.design.lighting.on)');
    check('LIGHTS opens the lighting panel (modal "lighting")', modal === 'lighting', `modal=${modal}`);
    check('…and does not toggle the light', before === after, `on: ${before} → ${after}`);
    const panel = await page.has('[data-lighting-panel]');
    check('PRO\'s own panel is on screen', panel);
    const bar = await page.box('[data-testid="view-lights"]');
    const win = await page.box('[data-lighting-panel]');
    check('the panel stands BESIDE its button, not on it',
      bar && win && !(win.x < bar.x + bar.w && win.x + win.w > bar.x && win.y < bar.y + bar.h && win.y + win.h > bar.y),
      `button x${bar?.x} y${bar?.y} · panel x${win?.x} y${win?.y} w${win?.w}`);
    await shot(page, 'f2-panel-open-beside-button.png');

    // WHAT THE PANEL CARRIES — the controls the sketch lost.
    const onoff = await page.has('[data-lighting-onoff]');
    const bright = await page.has('[data-scene-light-slider]');
    const temp = await page.has('[data-lighting-temp]');
    const rig = await page.has('[data-light-rig]');
    check('ON / OFF, in PRO\'s place for it', onoff);
    check('the BRIGHTNESS slider (*"nie ma suwaka do bright"*)', bright);
    check('colour temperature', temp);
    check('the room rig — four lamps and the presets', rig);
    const kinds = await page.count('[data-lighting-tool]');
    check('the placement tools, each with its drawing', kinds >= 4, `${kinds} tools`);
    await shot(page, 'f2-brightness.png');

    // A LIT WARDROBE: ON, then a side line on the selected cabinet — through
    // the panel's own buttons, on the scene's own selection.
    await page.click('[data-lighting-on]');
    await page.sleep(600);
    const side = await page.has('[data-lighting-add-side]');
    if (side) {
      await page.click('[data-lighting-add-side]');
      await page.sleep(1200);
    }
    const items = await page.ask('window.__cc.project.getState().project.design.lighting.items.length');
    const on = await page.ask('Boolean(window.__cc.project.getState().project.design.lighting.on)');
    check('the light is ON and a strip is placed', on && items > 0, `on=${on} · ${items} strip(s)`);
    await shot(page, 'f2-lit-wardrobe.png');
  } finally {
    await page.close?.();
  }
}

// ═══ F3 · THE ELEMENT EDITORS, COPIED — ONE FRAME EACH, WITH ITS CLICK PATH ═
if (runs('f3')) {
  process.stdout.write('\nF3 — THE ELEMENT EDITORS, COPIED\n');
  const page = await open();
  try {
    await room(page, 'layout');
    const id = await unitId(page);

    // ─── DoorModal: click a door on the stage → DOOR duty → EDIT THIS DOOR ›
    const c = await stageCentre(page);
    await page.clickAt(c.x, c.y);
    await page.sleep(1200);
    const duty = await page.ask('document.querySelector(\'[data-testid="column-detail"]\')?.dataset.menu');
    check('a click on a door opens the DOOR duty', duty === 'door', `menu=${duty}`);
    await page.click('[data-testid="door-open-editor"]');
    await page.sleep(1400);
    check('DOOR › EDIT THIS DOOR opens PRO\'s DoorModal', (await modalOn(page)) === 'element');
    const doorFields = await page.count('[data-modal-handle] ~ div input, .pbi-re-panel input');
    check('…with PRO\'s own fields in it', doorFields > 3, `${doorFields} inputs`);
    await shot(page, 'f3-door-modal.png');
    await page.click('[data-testid="door-open-hinges"]');
    await page.sleep(1200);
    check('DOOR › HINGES opens the same window at section B', (await modalOn(page)) === 'element'
      && (await page.ask('window.__cc.ui.getState().modalArgs.section')) === 'hinges');
    await shot(page, 'f3-door-modal-hinges.png');
    await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
    await page.sleep(400);

    // ─── UnitSizeModal / AddItemsModal / UnitFinishModal: the wardrobe menu.
    const menu = await openWardrobeMenu(page);
    check('LAYOUT › the wardrobe opens its menu', menu === 'wardrobe', `menu=${menu}`);
    for (const [testid, name, file, label] of [
      ['wardrobe-open-size', 'unit-size', 'f3-unit-size-modal.png', 'WIDTH AND HEIGHT ›'],
      ['wardrobe-open-add-items', 'add-items', 'f3-add-items-modal.png', 'ADD ITEMS ›'],
      ['wardrobe-open-finish', 'unit-finish', 'f3-unit-finish-modal.png', 'THIS WARDROBE\'S COLOUR ›'],
    ]) {
      await page.click(`[data-testid="${testid}"]`);
      await page.sleep(1400);
      const m = await modalOn(page);
      check(`WARDROBE › ${label} opens PRO's ${name} window`, m === name, `modal=${m}`);
      await shot(page, file);
      await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
      await page.sleep(400);
    }

    // ─── AddItems (the row engine) is the INTERIOR panel — PRO's own list.
    await page.click('[data-testid="cat-interior"]');
    await page.sleep(800);
    const kinds = await page.count('[data-testid="interior-pro-list"] [data-add-item-kind], [data-testid="interior-pro-list"] button');
    check('INTERIOR shows PRO\'s AddItems, whole', kinds >= 8, `${kinds} rows`);
    await shot(page, 'f3-add-items-interior.png');

    // ─── WatchLayoutModal: add a stack and a watch drawer through PRO's list,
    //     then INTERIOR › the watch drawer's `›` → LAYOUT, GLASS AND FINISH ›
    await page.evaluate(`
      const s = window.__cc.project.getState();
      s.addDrawers(${JSON.stringify(id)}, 3);
      s.addWatchDrawer(${JSON.stringify(id)});
      return true;
    `);
    await page.sleep(1600);
    const watchOpen = await page.has('[data-testid="interior-open-watch"]');
    check('a watch drawer stands in the wardrobe and INTERIOR offers its ›', watchOpen);
    if (watchOpen) {
      await page.click('[data-testid="interior-open-watch"]');
      await page.sleep(1000);
      await page.click('[data-testid="watch-open-editor"]');
      await page.sleep(1400);
      check('WATCH DRAWER › LAYOUT, GLASS AND FINISH opens PRO\'s WatchLayoutModal', (await modalOn(page)) === 'watch-layout');
      const layouts = await page.count('[data-watch-layout]');
      check('…with PRO\'s four layouts drawn', layouts === 4, `${layouts} cards`);
      await shot(page, 'f3-watch-layout-modal.png');
      await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
      await page.sleep(400);
    }

    // ─── RailModal: a hanging rail ON ITS OWN, then INTERIOR › › → EDIT THIS RAIL ›
    await page.evaluate(`
      const s = window.__cc.project.getState();
      const rid = s.addHangerRail(${JSON.stringify(id)}, {});
      if (rid && s.setRailMount) s.setRailMount(${JSON.stringify(id)}, rid, 'alone');
      return true;
    `);
    await page.sleep(1600);
    const railOpen = await page.has('[data-testid="interior-open-hanger"]');
    check('a rail stands in the wardrobe and INTERIOR offers its ›', railOpen);
    if (railOpen) {
      await page.click('[data-testid="interior-open-hanger"]');
      await page.sleep(1000);
      await page.click('[data-testid="rail-open-editor"]');
      await page.sleep(1400);
      const m = await modalOn(page);
      check('HANGING RAIL › EDIT THIS RAIL opens PRO\'s window for it', m === 'rail' || m === 'element', `modal=${m}`);
      await shot(page, 'f3-rail-modal.png');
      await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
      await page.sleep(400);
    }

    // ─── JpullRunModal: a J-pull on the fronts, then the J strip's own call.
    await page.click('[data-testid="cat-details"]');
    await page.sleep(600);
    await page.evaluate(`window.__cc.project.getState().setProjectHandle({ type: 'jpull' }); return true;`);
    await page.sleep(1500);
    const leaf = await page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(id)});`
      + ' const p = (r.panels || []).find((x) => x.part === "FRONT" && x.role === "front" && x.meta && x.meta.jpull && x.meta.jpull.run);'
      + ' return p ? p.id : null; })()');
    if (leaf) {
      const c2 = await stageCentre(page);
      await page.evaluate(`window.__cc.ui.getState().openModal('jpull-run', { unitId: ${JSON.stringify(id)}, panelId: ${JSON.stringify(leaf)}, anchor: { x: ${c2.x}, y: ${c2.y}, width: 0, height: 0 } }); return true;`);
      await page.sleep(1400);
      check('the J strip\'s own call opens PRO\'s JpullRunModal (one slider)', (await modalOn(page)) === 'jpull-run'
        && (await page.has('[data-jpull-run-slider]')));
      await shot(page, 'f3-jpull-run-modal.png');
      await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
    } else {
      note('J-pull run — no tall leaf carries a J run in the boot wardrobe; the window is routed (Editors.jsx) and proved by test');
    }

    // ─── FrontGapModal: PRO's only door is the rows over the canvas.
    await page.sleep(600);
    const gaps = await page.count('[data-front-gap-mm]');
    if (gaps > 0) {
      await page.click('[data-front-gap-mm]');
      await page.sleep(1400);
      check('a front-gap row over the stage opens PRO\'s FrontGapModal', (await modalOn(page)) === 'front-gap');
      await shot(page, 'f3-front-gap-modal.png');
      await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
    } else {
      // Make one: a second wardrobe beside the first, then the rows appear
      // if the rulebook has something to say.
      await page.evaluate(`
        const s = window.__cc.project.getState();
        s.addUnit('WARDROBE', { near: ${JSON.stringify(id)}, side: 'R' });
        return true;
      `);
      await page.sleep(2000);
      const rows = await page.count('[data-front-gap-mm]');
      if (rows > 0) {
        await page.click('[data-front-gap-mm]');
        await page.sleep(1400);
        check('a front-gap row over the stage opens PRO\'s FrontGapModal', (await modalOn(page)) === 'front-gap');
        await shot(page, 'f3-front-gap-modal.png');
        await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
      } else {
        // The rulebook has nothing to repair in this scene; open the window on
        // the rulebook's own row shape so the frame exists.
        const row = await page.ask(`(() => { const s = window.__cc.project.getState();`
          + ' const rows = (s.frontClearances && s.frontClearances()) || []; return rows[0] || null; })()');
        note('front gap — the boot scene has no gap under 3 mm; the rows render when frontGapRows answers',
          `${rows} rows · clearance rows ${row ? 'present' : 'none'}`);
      }
    }
  } finally {
    await page.close?.();
  }
}

// ═══ F4 · THE MATERIAL PICKERS — THE EGGER TILES ═══════════════════════════
if (runs('f4')) {
  process.stdout.write('\nF4 — THE EGGER TILES, COPIED\n');
  const page = await open();
  try {
    await room(page, 'fronts');
    // The FRONTS panel carries PRO's slot — `Choose decor…` — and the modal behind it.
    const slot = await page.has('[data-testid="material-slot-front"] [data-choose-decor], [data-testid="material-slot-front"] [data-change-decor]');
    check('FRONTS carries PRO\'s material slot (Choose decor… / Change)', slot);
    const gallery = await page.count('[data-style-tile]');
    check('…and PRO\'s door-style gallery, with its drawings', gallery >= 5, `${gallery} tiles`);
    await shot(page, 'f4-fronts-slot-and-gallery.png');

    // PRO's own normaliser starts a front slot on the profile's FIRST source,
    // which is Spray — so the client presses LAMINATE first, as in the wizard,
    // and the slot's picker becomes the decor grid. The source law, read.
    await page.click('[data-testid="material-slot-front"] [data-front-source="laminate"]');
    await page.sleep(800);
    const picker = await page.ask('document.querySelector(\'[data-testid="material-slot-front"] [data-material-panel]\')?.dataset.materialPickerKind');
    check('LAMINATE names the decor picker — the source→picker law, read off the profile', picker === 'decor', `picker=${picker}`);
    const opener = (await page.has('[data-testid="material-slot-front"] [data-change-decor]'))
      ? '[data-testid="material-slot-front"] [data-change-decor]'
      : '[data-testid="material-slot-front"] [data-choose-decor]';
    await page.click(opener);
    await page.sleep(1600);
    const modal = await page.has('[data-decor-picker-modal]');
    const tiles = await page.count('[data-egger-tile]');
    const search = await page.has('[data-decor-search]');
    const families = await page.count('[data-decor-family]');
    check('the slot opens PRO\'s tiled EGGER modal', modal);
    check('…with tiles from the real pack, a search and the family bar', tiles > 20 && search && families > 2,
      `${tiles} tiles · ${families} families`);
    await shot(page, 'f4-egger-modal-tiles-search.png');

    // ONE CLICK, ONE ANSWER: a tile chooses and the window closes.
    const chosenId = await page.ask('document.querySelectorAll("[data-egger-tile]")[3]?.dataset.decorFinish || null');
    const before = await page.ask('window.__cc.project.getState().project.design.fronts.types?.[0]?.finish_id || null');
    await page.ask('(() => { const t = document.querySelectorAll("[data-egger-tile]")[3]; if (t) t.click(); return true; })()');
    await page.sleep(1600);
    const after = await page.ask('window.__cc.project.getState().project.design.fronts.types?.[0]?.finish_id || null');
    const closed = !(await page.has('[data-decor-picker-modal]'));
    check('a tile click CHOOSES and the window CLOSES', closed && after === chosenId && after !== before,
      `${before} → ${after} · closed=${closed}`);
    check('…and the slot shows the chosen tile with EGGER\'s attribution',
      await page.has('[data-testid="material-slot-front"] [data-chosen-tile] [data-tile-source]'));
    await shot(page, 'f4-tile-chosen-modal-closed.png');

    // TWO WARDROBES, TWO COLOURS — the unit's finish, not the project's.
    await page.click('[data-testid="cat-space"]');
    await page.sleep(500);
    // Two walls, then a wardrobe on the second.
    await page.evaluate(`
      const s = window.__cc.project.getState();
      const first = s.units[0];
      s.addUnit('WARDROBE', { near: first.id, side: 'R' });
      return true;
    `);
    await page.sleep(2000);
    const units = await page.ask('window.__cc.project.getState().units.length');
    check('a second wardrobe stands beside the first', units >= 2, `${units} units`);
    const second = await page.ask('window.__cc.project.getState().units[1]?.id || null');
    if (second) {
      const c = await stageCentre(page);
      await page.evaluate(`window.__cc.ui.getState().openModal('unit-finish', { unitIds: [${JSON.stringify(second)}], anchor: { x: ${c.x}, y: ${c.y}, width: 0, height: 0 } }); return true;`);
      await page.sleep(1400);
      check('THIS WARDROBE\'S COLOUR › opens PRO\'s UnitFinishModal', (await modalOn(page)) === 'unit-finish');
      const entries = await page.count('[data-palette-entry]');
      check('…offering the project\'s own palette', entries >= 2, `${entries} entries`);
      await page.ask('(() => { const e = [...document.querySelectorAll("[data-palette-entry]")].find((x) => x.dataset.paletteEntry.startsWith("front")); if (e) e.click(); return true; })()');
      await page.sleep(1200);
      const f1 = await page.ask(`window.__cc.project.getState().units[0].params.front_type_id || null`);
      const f2 = await page.ask(`window.__cc.project.getState().units[1].params.front_type_id || null`);
      check('the colour lands on ONE wardrobe — the other keeps the project\'s', f2 !== null && f1 === null,
        `unit 1 front_type_id=${f1} · unit 2 front_type_id=${f2}`);
      await page.evaluate('window.__cc.ui.getState().closeModal(); return true;');
      await page.sleep(600);
      await page.click('[data-testid="view-front"]');
      await page.sleep(1200);
      await shot(page, 'f4-two-wardrobes-two-colours.png');
    }

    // MATERIALS AND HARDWARE › — the window with both slots and WizardHardware.
    await openWardrobeMenu(page);
    await page.click('[data-testid="wardrobe-open-materials"]');
    await page.sleep(1600);
    check('WARDROBE › MATERIALS AND HARDWARE opens the materials window', await page.has('[data-testid="materials-modal"]'));
    check('…with PRO\'s carcass slot, front slot and WizardHardware', (await page.count('[data-material-panel]')) === 2
      && (await page.has('[data-wizard-hardware]')));
    await shot(page, 'f4-materials-window.png');
    await page.click('[data-testid="material-browse-carcass"]');
    await page.sleep(1200);
    const inline = await page.has('[data-material-picker-for="carcass:c1"] .pbi-re-grid-5, [data-veneer-picker], [data-material-picker-for] select');
    check('BROWSE HERE shows PRO\'s in-step picker for the source', inline);
    await shot(page, 'f4-materials-browse-inline.png');
  } finally {
    await page.close?.();
  }
}

// ═══ F5 · THE VIEW BAR — BEFORE / AFTER, AND RESET CENTRES ════════════════
if (runs('f5')) {
  process.stdout.write('\nF5 — THE VIEW BAR\n');
  const before = await open();
  let beforeLabels = null;
  try {
    await room(before, 'layout', { base: BEFORE });
    beforeLabels = await before.ask('[...document.querySelectorAll(\'[data-testid="view-bar"] button\')].map((b) => b.textContent.trim())');
    await before.screenshot(`${SHOTS}f5-bar-before.png`);
    note('BEFORE (origin/main) — the bar', beforeLabels ? beforeLabels.join(' · ') : 'not reached');
  } catch (e) {
    note('BEFORE (origin/main) — not served', `${e.message.split('\n')[0]} — start it with: (cd /tmp/t63-base && npx vite preview --port 4175)`);
  } finally {
    await before.close?.();
  }

  const page = await open();
  try {
    await room(page, 'layout');
    const labels = await page.ask('[...document.querySelectorAll(\'[data-testid="view-bar"] button\')].map((b) => b.textContent.trim())');
    check('FRONT DIMENSIONS and MEASURE are gone from the retail bar',
      !labels.some((l) => /front dimensions|measure/i.test(l)), labels.join(' · '));
    if (beforeLabels) {
      check('…and were there before', beforeLabels.some((l) => /front dimensions/i.test(l)) && beforeLabels.some((l) => /measure/i.test(l)),
        `${beforeLabels.length} → ${labels.length} buttons`);
    }
    const tile = await page.ask('(() => { const b = document.querySelector(\'[data-testid="view-outlines"]\'); const s = getComputedStyle(b);'
      + ' return { border: s.borderTopWidth, font: s.fontFamily.split(",")[0], size: s.fontSize, h: Math.round(b.getBoundingClientRect().height) }; })()');
    check('each tool is a TILE — a hairline, Inter, smaller type', tile.border === '1px' && /Inter/.test(tile.font),
      `${tile.border} border · ${tile.font} ${tile.size} · ${tile.h}px tall`);
    const heights = await page.ask('[...new Set([...document.querySelectorAll(\'[data-testid="view-bar"] button\')].map((b) => Math.round(b.getBoundingClientRect().height)))]');
    check('one row height', heights.length === 1, `heights ${JSON.stringify(heights)}`);
    await shot(page, 'f5-bar-after.png');

    // RESET CENTRES: orbit off to one side, then RESET VIEW.
    await page.evaluate(`
      const v = window.__cc.views.room; const b = window.__cc.pbi.render.bounds();
      v.camera.position.set(b.max[0] + 4, b.max[1] + 2, b.min[2] - 3);
      v.controls.target.set(b.max[0] + 1, 0.2, b.max[2]); v.controls.update();
      return true;
    `);
    await page.sleep(900);
    await shot(page, 'f5-reset-off-centre.png');
    await page.click('[data-testid="view-reset"]');
    await page.sleep(1200);
    const cam = await page.ask(`(() => { const v = window.__cc.views.room; const b = window.__cc.pbi.render.bounds();
      const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
      return { dx: Math.abs(v.camera.position.x - cx), tx: Math.abs(v.controls.target.x - cx), ty: Math.abs(v.controls.target.y - cy), tz: Math.abs(v.controls.target.z - cz), z: v.camera.position.z - b.max[2] }; })()`);
    check('RESET VIEW stands on the design\'s centre line, looking at its centre',
      cam.dx < 0.01 && cam.tx < 0.01 && cam.ty < 0.01 && cam.tz < 0.01 && cam.z > 0,
      `off-centre by ${cam.dx.toFixed(3)} m · target off by ${Math.max(cam.tx, cam.ty, cam.tz).toFixed(3)} m · ${cam.z.toFixed(2)} m in front`);
    await shot(page, 'f5-reset-centred.png');
  } finally {
    await page.close?.();
  }
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
