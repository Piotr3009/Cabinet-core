#!/usr/bin/env node
// ─── Turn 44 acceptance walk — ONE WIZARD WALK, EVERY SCREEN SHOT ───────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn44.mjs [--out verify/t44/]
//
// CLAUDE.md, iron rule 6: *"Proofs `verify/t44/` — a probe drives the wizard
// end-to-end with real pointer input, screenshots every tab and submodal."*
// And the execution order: *"Probe woven through (one wizard walk, every
// screen shot)."* So this is ONE walk, from the start screen to the canvas,
// and the named proofs fall out of it in the order the owner meets them.
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R4  a claim is proven by asking the APP — `window.__ccT44` publishes this
//       turn's four readers, and the DOM audit reads the rendered page.
//   R6  a console error fails the step it happened in.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { pixelDifference, sideBySide } from './compose.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t44/', import.meta.url).pathname);

// ─── R1'S GUARD, AND ITS ONE NAMED EXEMPTION ────────────────────────────────
//
// Every POINTER and KEY gesture in this walk is a CDP input event. The guard
// below enforces it the way T34's and T36's do — by grepping this file for the
// synthetic-event pattern.
//
// The exemption is the NATIVE `<select>` and the NATIVE `<input type=range>`.
// A headless Chromium's option list is drawn by the platform and cannot be
// clicked through the protocol, and a range thumb dragged by 1 px of mouse
// travel is not a value anybody can assert on. The house has driven both this
// way since turn 16 (`e2e-turn16.mjs`, the material picker). What makes it a
// LICENCE rather than a hole is that there is exactly ONE function that does
// it, it is named for what it is, and the guard proves the pattern appears
// nowhere else in the file.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
// `lastIndexOf`, because the two markers are also NAMED in the paragraph above
// — a guard that matched its own prose would be a guard that proves nothing.
const EXEMPT_FROM = SELF.lastIndexOf('const setNativeValue =');
const EXEMPT_TO = SELF.lastIndexOf('// ─── end of the native-control exemption');
const occurrences = (text) => text.split(`.${BANNED}`).length - 1;
if (EXEMPT_FROM < 0 || EXEMPT_TO < EXEMPT_FROM) {
  throw new Error('R1: the native-control exemption is not where the guard expects it.');
}
if (occurrences(SELF) !== occurrences(SELF.slice(EXEMPT_FROM, EXEMPT_TO))) {
  throw new Error(`R1: a gesture outside setNativeValue is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const shots = [];
const P = 'window.__cc';

const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i, /cc_settings_sets/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1250 });

  let errorMark = 0;
  const consoleSince = () => realErrors(page.errors.slice(errorMark));
  const check = (label, ok, detail = '') => {
    const errs = consoleSince();
    errorMark = page.errors.length;
    const clean = errs.length === 0;
    steps.push({
      label,
      ok: Boolean(ok) && clean,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      ...(clean ? {} : { console: errs.slice(0, 4) }),
    });
    const line = `${Boolean(ok) && clean ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`;
    // eslint-disable-next-line no-console
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
  };

  /** A proof picture, and the assertion that it is not an empty frame (R3). */
  const shot = async (name, subject = null) => {
    let present = true;
    let detail = 'not asked';
    if (subject) {
      const seen = await page.evaluate(`
        const want = ${JSON.stringify(subject)};
        const out = {};
        if (want.dom) {
          const el = document.querySelector(want.dom);
          out.dom = Boolean(el && el.getClientRects().length);
        }
        if (want.all) out.all = want.all.every((sel) => {
          const el = document.querySelector(sel);
          return Boolean(el && el.getClientRects().length);
        });
        if (want.text) out.text = (document.body.innerText || '').includes(want.text);
        if (want.none) out.none = want.none.every((sel) => !document.querySelector(sel));
        if (want.count) out.count = document.querySelectorAll(want.count[0]).length >= want.count[1];
        return out;
      `);
      present = Object.values(seen).every(Boolean);
      detail = JSON.stringify(seen);
    }
    await page.screenshot(`${OUT}${name}.png`);
    shots.push({ name, subject, present, detail });
    if (!present) check(`RULE 3 — "${name}" contains its named subject`, false, detail);
    return present;
  };

  /**
   * Type a number into a field the way a joiner does: a REAL triple-click to
   * select what is in it, real text insertion, and a real Enter to commit.
   * `Input.insertText` is the browser's own text-entry path, which is what R1
   * asks for; a `value =` assignment would never reach React.
   */
  const typeInto = async (selector, text, { enter = true } = {}) => {
    const box = await page.click(selector);
    for (const clickCount of [1, 2, 3]) {
      await page.mouse('mousePressed', box.x, box.y, { clickCount });
      await page.mouse('mouseReleased', box.x, box.y, { buttons: 0, clickCount });
    }
    await page.send('Input.insertText', { text: String(text) });
    // Some fields COMMIT on Enter and their window closes with them — the set
    // name is one, and a walk that pressed Enter there could never photograph
    // the button it was about to press.
    if (enter) await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
    await page.sleep(260);
    return box;
  };

  /**
   * THE NATIVE-CONTROL EXEMPTION (see R1's guard at the top of this file).
   *
   * A `<select>`'s option list and a range thumb are drawn by the platform;
   * neither can be driven through the protocol in a headless window. This sets
   * the value through the element's own prototype setter — which is what React
   * reads — and then fires the one event the control would have fired itself.
   * It is used for `select` and `range` and for nothing else, and the guard
   * proves the pattern appears nowhere but here.
   */
  const setNativeValue = async (selector, value, kind = 'select') => page.evaluate(`
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const proto = ${JSON.stringify(kind)} === 'select'
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, ${JSON.stringify(String(value))});
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.value;
  `);
  // ─── end of the native-control exemption ───────────────────────────────────

  /** The first real option of a select, chosen through the same one helper. */
  const pickFirstOption = async (selector) => {
    const value = await page.evaluate(`
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const opt = [...el.options].find((o) => o.value);
      return opt ? opt.value : null;
    `);
    if (value == null) return null;
    await setNativeValue(selector, value, 'select');
    await page.sleep(240);
    return value;
  };

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);
  const ui = (expr) => page.evaluate(`const u = ${P}.ui.getState(); return (${expr});`);
  /**
   * Switch the head. While the wizard stands open the HEADER's own toggle is
   * behind it — a modal shell closes on a pointer-down outside itself — so the
   * tab bar carries a twin of the very same app-level state (one value, two
   * controls, the brightness slider's own pattern). This prefers whichever of
   * the two is actually on screen.
   */
  const setAudience = async (who) => {
    const inWizard = await page.evaluate(
      `return Boolean(document.querySelector('[data-wizard-settings] [data-audience-option="${who}"]'));`,
    );
    await page.click(inWizard
      ? `[data-wizard-settings] [data-audience-option="${who}"]`
      : `[data-audience-option="${who}"]`);
    await page.sleep(260);
  };

  /** Open the flow from the start screen, on a clean shelf. */
  const openWizard = async (audience = 'factory') => {
    await page.goto(BASE);
    await page.waitFor('document.querySelector("[data-build-stamp]")');
    await page.evaluate('try { localStorage.clear(); } catch (e) { /* private */ } return true;');
    await page.goto(BASE);
    await page.waitFor('document.querySelector("[data-audience-toggle]")');
    await setAudience(audience);
    await page.click('button', 'New project');
    await page.waitFor('document.querySelector("[data-modal-name=\\"new-project\\"]")');
  };

  /** Walk steps 1 and 2 and land on the SCOPE card. */
  const toScope = async (typeLabel) => {
    await page.click('button', 'Next');            // 1 · info
    await page.sleep(150);
    await page.click('button', typeLabel);         // 2 · type
    await page.sleep(120);
    await page.click('button', 'Next');
    await page.waitFor('document.querySelector("[data-scope-card]")');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // F1 · ONE WALL IS THE FIRST CARD, AND THE WALL GETS A FACE
  // ══════════════════════════════════════════════════════════════════════════
  await openWizard('factory');
  await toScope('Wardrobe');

  const scopeOrder = await page.evaluate(`
    const cards = [...document.querySelectorAll('[data-scope-card]')].map((c) => c.dataset.scopeCard);
    const focused = document.activeElement && document.activeElement.dataset
      ? document.activeElement.dataset.scopeCard : null;
    return { cards, focused };
  `);
  check('F1 — One wall is the FIRST card', scopeOrder.cards[0] === 'wall', JSON.stringify(scopeOrder.cards));
  check('F1 — …and it is the default focus', scopeOrder.focused === 'wall', `focus=${scopeOrder.focused}`);
  await shot('f1-one-wall-first', { dom: '[data-scope-first]', text: 'One wall' });

  await page.click('[data-scope-card="wall"]');
  await page.waitFor('document.querySelector("[data-wall-elevation]")');
  check('F1 — choosing One wall opens the elevation at once', true, 'wall-elevation is on screen');

  // the wall's own two numbers, typed
  await typeInto('[data-wall-width]', 3600);
  await typeInto('[data-wall-height]', 2500);
  const wall = await store('({ h: s.project.room.height, w: s.project.room.corners[1].x })');
  check('F1 — the elevation redraws live off the room the app stores', wall.h === 2500 && wall.w === 3600, JSON.stringify(wall));

  // the three tools, in the owner's order
  await page.click('[data-elevation-add="door"]');
  await page.sleep(140);
  await page.click('[data-elevation-add="window"]');
  await page.sleep(140);
  await page.click('[data-elevation-add="slope"]');
  await page.sleep(180);

  const onWall = await store(`({
    openings: s.project.room.openings.length,
    slopes: s.project.wallSlopes.length,
    kinds: s.project.room.openings.map((o) => o.kind).sort(),
  })`);
  check('F1 — a door, a window AND a slope are on the wall', onWall.openings === 2 && onWall.slopes === 1, JSON.stringify(onWall));

  // DRAG the window along the wall, with a real pointer
  const before = await store("s.project.room.openings.find((o) => o.kind === 'window').x_mm");
  const winBox = await page.evaluate(`
    const el = document.querySelector('[data-elevation-kind="window"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  `);
  if (winBox) {
    await page.mouse('mouseMoved', winBox.x, winBox.y, { buttons: 0 });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: winBox.x, y: winBox.y, button: 'left', clickCount: 1, buttons: 1,
    });
    for (const dx of [12, 24, 36, 48]) {
      await page.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', x: winBox.x + dx, y: winBox.y, button: 'left', buttons: 1,
      });
      await page.sleep(40);
    }
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: winBox.x + 48, y: winBox.y, button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(220);
  }
  const after = await store("s.project.room.openings.find((o) => o.kind === 'window').x_mm");
  check('F1 — an element DRAGS along the wall, under a real pointer', after > before, `${before} → ${after} mm`);

  // …and double-clicking one opens its own small window, BESIDE it.
  //
  // The DOOR is the one double-clicked, and that is not an accident: a
  // rectangle's centre is inside the rectangle, and a right-angled triangle's
  // bounding-box centre sits exactly ON its hypotenuse — a pointer aimed there
  // is aimed at the edge of the shape. The slope is opened from its row a
  // moment later, through the same `openElement`, and its three fields are
  // photographed there.
  const doorBox = await page.evaluate(`
    const el = document.querySelector('[data-elevation-kind="door"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  `);
  // The window was dragged across the door a moment ago and they overlap; the
  // later shape is on top. So the door is opened by its own free left end,
  // which is what a hand would aim at too.
  if (doorBox) await page.dblclick(doorBox.left + (doorBox.right - doorBox.left) * 0.12, doorBox.y);
  await page.sleep(320);
  const elementModal = await page.evaluate(`
    const m = document.querySelector('[data-modal-name="wall-element"]');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return {
      kind: (m.querySelector('[data-element-modal]') || {}).dataset
        ? m.querySelector('[data-element-modal]').dataset.elementModal : null,
      left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      anchored: m.dataset.modalAnchored,
      draggable: Boolean(m.querySelector('[data-modal-handle]')),
    };
  `);
  check('F1 — double-click opens the element’s own modal',
    Boolean(elementModal && elementModal.kind === 'door'), JSON.stringify(elementModal));
  const overlaps = Boolean(elementModal && doorBox
    && elementModal.left < doorBox.right && elementModal.right > doorBox.left
    && elementModal.top < doorBox.bottom && elementModal.bottom > doorBox.top);
  check('F1 — …draggable, anchored, and NOT covering the element it is about (rule 4)',
    Boolean(elementModal && elementModal.draggable && elementModal.anchored === '1') && !overlaps,
    JSON.stringify({ modal: elementModal && Math.round(elementModal.left), door: doorBox && Math.round(doorBox.right), overlaps }));
  await shot('f1-element-modal-door', { all: ['[data-element-x]', '[data-element-w]'] });
  await page.click('[data-element-done]');
  await page.sleep(220);

  // the SLOPE's own three fields, opened from its row through the same handler
  await page.evaluate(`
    const row = [...document.querySelectorAll('[data-elevation-row]')]
      .find((b) => (b.textContent || '').includes('slope'));
    if (row) row.scrollIntoView({ block: 'center' });
    return Boolean(row);
  `);
  const slopeRow = await page.evaluate(`
    const row = [...document.querySelectorAll('[data-elevation-row]')]
      .find((b) => (b.textContent || '').includes('slope'));
    if (!row) return null;
    const r = row.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  `);
  if (slopeRow) {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await page.send('Input.dispatchMouseEvent', {
        type, x: slopeRow.x, y: slopeRow.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1, buttons: 1,
      });
    }
    await page.sleep(320);
  }
  const slopeModal = await page.evaluate(`
    return {
      open: Boolean(document.querySelector('[data-element-modal="slope"]')),
      side: Boolean(document.querySelector('[data-slope-side]')),
      start: Boolean(document.querySelector('[data-slope-start]')),
      run: Boolean(document.querySelector('[data-slope-run]')),
    };
  `);
  check('F1 — a slope’s own modal carries side · start height · run',
    Object.values(slopeModal).every(Boolean), JSON.stringify(slopeModal));
  await page.click('[data-slope-side="L"]');
  await page.sleep(200);
  const flipped = await store('s.project.wallSlopes[0].side');
  check('F1 — …and the side really flips', flipped === 'L', `side=${flipped}`);
  await shot('f1-wall-elevation-editor', {
    all: ['[data-wall-elevation-svg]', '[data-elevation-kind="door"]', '[data-elevation-kind="window"]',
      '[data-elevation-kind="slope"]', '[data-element-modal="slope"]'],
  });

  await page.click('[data-element-done]');
  await page.sleep(200);

  // Back returns WITHOUT losing the wall (F1), and forward again
  await page.click('[data-elevation-back]');
  await page.sleep(250);
  const kept = await store('({ openings: s.project.room.openings.length, slopes: s.project.wallSlopes.length })');
  check('F1 — Back keeps the wall', kept.openings === 2 && kept.slopes === 1, JSON.stringify(kept));
  await page.click('[data-scope-card="wall"]');
  await page.waitFor('document.querySelector("[data-elevation-save]")');
  await page.click('[data-elevation-save]');
  await page.waitFor('document.querySelector("[data-wizard-settings]")');
  check('F1 — the green Save goes on to Project settings', true, 'step 4 is on screen');

  // ══════════════════════════════════════════════════════════════════════════
  // F2 · THE SHELL — TABS, SEQUENCE, VISIBILITY
  // ══════════════════════════════════════════════════════════════════════════
  const tabsNow = () => page.evaluate(`
    return [...document.querySelectorAll('[data-wizard-tab]')].map((t) => ({
      id: t.dataset.wizardTab, n: t.dataset.tabNumber, state: t.dataset.tabState, disabled: t.disabled,
    }));
  `);
  const factoryTabs = await tabsNow();
  check('F2 — six tabs, numbered, in the owner’s order',
    factoryTabs.map((t) => t.id).join(',') === 'ustawienia,carcases,fronts,hardware,produkcja,podsumowanie',
    factoryTabs.map((t) => `${t.n}${t.id[0]}`).join(' '));
  check('F2 — a tab ahead of the walk is not a place you can be',
    factoryTabs.slice(1).every((t) => t.disabled), 'five ahead, five disabled');
  await shot('f2-tab-1-ustawienia', { dom: '[data-wizard-tab-body="ustawienia"]', text: 'Ustawienia' });

  // ─── F3 · tab 1, for a WARDROBE ───
  const wardrobeDims = await page.evaluate(`
    return [...document.querySelectorAll('[data-dimension]')].map((d) => d.dataset.dimension).sort();
  `);
  check('F3 — a wardrobe is NOT asked the three kitchen heights',
    !wardrobeDims.includes('base') && !wardrobeDims.includes('wall') && !wardrobeDims.includes('wallMount'),
    wardrobeDims.join(','));
  const seeded = await store('({ tall: s.project.design.heights.tall, toe: s.project.design.heights.toeKick })');
  check('F3 — the wardrobe opens at 2100 / 100 (the owner’s baked-in defaults)',
    seeded.tall === 2100 && seeded.toe === 100, JSON.stringify(seeded));
  const readOnly = await page.evaluate(`
    const n = document.querySelector('[data-wizard-node="ustawienia.identity"] input');
    return n ? n.readOnly : null;
  `);
  check('F3 — Number and Client are read-only in the wizard', readOnly === true, `readOnly=${readOnly}`);
  const setDropdown = await page.evaluate(`
    const s = document.querySelector('[data-settings-set-select]');
    return s ? { options: s.options.length, first: s.options[0].textContent } : null;
  `);
  check('F3 — the saved set is a dropdown, default “Default settings”',
    Boolean(setDropdown && setDropdown.first === 'Default settings'), JSON.stringify(setDropdown));
  const removals = await page.evaluate(`
    return {
      keepAs: Boolean(document.querySelector('[data-set-name]')),
      roomSetup: Boolean(document.querySelector('[data-room-setup]')),
    };
  `);
  check('F3 — the two licensed removals are gone from this screen',
    removals.keepAs === false && removals.roomSetup === false, JSON.stringify(removals));
  await shot('f3-ustawienia-wardrobe', { dom: '[data-wizard-node="ustawienia.dimensions"]', none: ['[data-dimension="base"]'] });

  // ══════════════════════════════════════════════════════════════════════════
  // F4 · CARCASES — the counting question, the submodals, the picker
  // ══════════════════════════════════════════════════════════════════════════
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"carcases\\"]")');
  await page.click('[data-carcass-count="2"]');
  await page.sleep(250);
  const types = await store('s.project.design.carcass.types.length');
  check('F4 — “Ile typów materiału carcase?” · 2 → two types', types === 2, `types=${types}`);
  const dots = await page.evaluate('return document.querySelectorAll("[data-carcass-dot]").length;');
  check('F4 — the walk grows a dot per submodal', dots === 5, `dots=${dots} (count · 2 types · sheets · summary)`);
  await shot('f4-carcases-count', { dom: '[data-carcass-dots]', text: 'Ile typów materiału carcase?' });

  // ── submodal 1 · Laminat, the big tiles and the live search ──
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-carcass-submodal]")');
  await page.waitFor('document.querySelector("[data-egger-tile]")', { timeout: 15000 });
  const tile = await page.evaluate(`
    const t = document.querySelector('[data-egger-tile] img, [data-egger-tile] span');
    const r = t ? t.getBoundingClientRect() : null;
    const panel = document.querySelector('[data-material-panel]');
    const body = document.querySelector('[data-wizard-tab-body]');
    return {
      swatch: r ? Math.round(r.height) : 0,
      tiles: document.querySelectorAll('[data-egger-tile]').length,
      panelWidth: panel ? Math.round(panel.getBoundingClientRect().width) : 0,
      bodyWidth: body ? Math.round(body.getBoundingClientRect().width) : 0,
      // What the panel is allowed to fill — its own container's content box.
      roomWidth: panel && panel.parentElement
        ? Math.round(panel.parentElement.clientWidth) : 0,
      floating: panel ? getComputedStyle(panel).position : null,
    };
  `);
  check('F4 — the swatch is at least the owner’s 96 px', tile.swatch >= 96, `${tile.swatch} px`);
  check('F4 — the panel is FULL WIDTH and does not float',
    tile.panelWidth >= tile.roomWidth - 2 && tile.floating === 'static'
      && tile.panelWidth > tile.bodyWidth * 0.9,
    `panel ${tile.panelWidth} of ${tile.roomWidth} available (tab body ${tile.bodyWidth}), position:${tile.floating}`);
  await shot('f4-picker-large', { count: ['[data-egger-tile]', 8], dom: '[data-decor-search]' });

  // the search FILTERS AS YOU TYPE
  const beforeSearch = tile.tiles;
  await page.click('[data-decor-search]');
  await page.send('Input.insertText', { text: 'H1180' });
  await page.sleep(420);
  const afterSearch = await page.evaluate('return document.querySelectorAll("[data-egger-tile]").length;');
  check('F4 — the search actually filters, as you type', afterSearch > 0 && afterSearch < beforeSearch,
    `${beforeSearch} → ${afterSearch} tiles for "H1180"`);
  await shot('f4-picker-search', { count: ['[data-egger-tile]', 1], dom: '[data-decor-search]' });
  const firstTile = await page.click('[data-egger-tile]');
  check('F4 — a tile is choosable', Boolean(firstTile), 'clicked');
  await page.sleep(220);

  // …and SPRAY draws no tile at all
  await page.click('[data-material-category="sprayed"]');
  await page.sleep(300);
  const sprayHas = await page.evaluate(`
    return {
      list: Boolean(document.querySelector('[data-spray-list]')),
      select: Boolean(document.querySelector('[data-spray-select]')),
      tiles: document.querySelectorAll('[data-egger-tile]').length,
      images: document.querySelectorAll('[data-material-panel] img').length,
    };
  `);
  check('F4 — SPRAY IS A LIST AND RENDERS ZERO TILES',
    sprayHas.list && sprayHas.select && sprayHas.tiles === 0 && sprayHas.images === 0,
    JSON.stringify(sprayHas));
  await shot('f4-submodal-1-spray-is-a-list', { all: ['[data-spray-select]'], none: ['[data-egger-tile]'] });

  // back to laminate, pick a board, and answer the drawers question
  await page.click('[data-material-category="egger"]');
  await page.sleep(300);
  await pickFirstOption('[data-stock-board]');
  await page.click('[data-drawer-boxes-option="ready"]');
  await page.sleep(200);
  const drawerMode = await store('s.project.design.drawerBoxes.mode');
  check('F4 — the drawers question closes the submodal and writes the BOM’s flag',
    drawerMode === 'ready', `mode=${drawerMode}`);
  await shot('f4-submodal-1-carcass', { all: ['[data-material-panel]', '[data-drawer-boxes]'] });

  // ── submodal 2 · the SECOND type, which is the whole point of N ──
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-carcass-submodal=\\"c2\\"]")');
  await page.sleep(400);
  await pickFirstOption('[data-stock-board]');
  await shot('f4-two-types-flow', { all: ['[data-carcass-submodal="c2"]', '[data-carcass-dot="c2"]'] });
  const twoRows = await page.evaluate(`
    const rows = ${P}.project.getState().project.design.carcass.types;
    return rows.map((t) => ({ id: t.id, material: t.material_id, finish: t.finish_id }));
  `);
  check('F4 — two types carry two material rows the BOM can read',
    twoRows.length === 2 && twoRows.every((r) => r.material), JSON.stringify(twoRows));

  // ── the sheets assignment, then the summary ──
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-sheets-assignment]")');
  await shot('f4-sheets-assignment', { count: ['[data-sheet-assign]', 2] });
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-carcass-chosen]")');
  await shot('f4-carcases-summary', { all: ['[data-carcass-chosen]', '[data-save-carcasses]'] });
  await page.click('[data-save-carcasses]');
  await page.sleep(220);

  // ══════════════════════════════════════════════════════════════════════════
  // F5 · FRONTS — the same procedure, then type, opening and shine
  // ══════════════════════════════════════════════════════════════════════════
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"fronts\\"]")');
  await shot('f5-fronts-count', { dom: '[data-wizard-fronts]', text: 'Ile kolorów frontów?' });
  // ANSWER the question rather than walking past it: until it is answered the
  // project carries no front type of its own and the card on screen is the
  // surface's own "Front 1" stand-in.
  await page.click('[data-front-count="1"]');
  await page.sleep(250);
  const frontTypes = await store('s.project.design.fronts.types.length');
  check('F5 — “Ile kolorów frontów?” · 1 → one front type on the project',
    frontTypes === 1, `types=${frontTypes}`);
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-front-submodal]")');
  await page.sleep(500);
  // Spraying is the DEFAULT front source (the 15.08 rebuild's own ruling), so
  // this submodal opens on the LIST — which is exactly the screen the owner
  // said must never grow tiles. Choose a colour from it, and a board under it.
  const sprayColour = await page.evaluate(`
    const sel = document.querySelector('[data-spray-select]');
    if (!sel) return null;
    const opt = [...sel.options].find((o) => o.value);
    return opt ? { value: opt.value, name: opt.textContent } : null;
  `);
  if (sprayColour) await setNativeValue('[data-spray-select]', sprayColour.value, 'select');
  await page.sleep(300);
  const frontColour = await store('(s.project.design.fronts.types[0] || {}).colour || null');
  check('F5 — a colour picked from the spray LIST reaches the front',
    Boolean(frontColour && frontColour.hex), JSON.stringify(frontColour));
  await shot('f5-submodal-front', { all: ['[data-material-panel]', '[data-spray-select]'], none: ['[data-egger-tile]'] });
  await pickFirstOption('[data-stock-board]');
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-front-opening]")');

  // the four openings, and what each of them WRITES
  const openings = await page.evaluate(`
    return [...document.querySelectorAll('[data-front-opening-option]')].map((b) => b.dataset.frontOpeningOption);
  `);
  check('F5 — the opening options are exactly the owner’s four',
    openings.join(',') === 'push,handles,knobs,jhandle', openings.join(','));
  await page.click('[data-front-opening-option="knobs"]');
  await page.sleep(220);
  const knob = await store('s.project.design.fronts.handle');
  check('F5 — Knobs writes the handle record the engine already fits',
    knob && knob.type === 'knob', JSON.stringify(knob));
  await page.click('[data-front-opening-option="jhandle"]');
  await page.sleep(220);
  const jstyle = await store('({ style: s.project.design.fronts.style, handle: s.project.design.fronts.handle })');
  check('F5 — J-handle IS the shape, and takes the handle off',
    jstyle.style === 'HJ' && jstyle.handle === null, JSON.stringify(jstyle));
  await page.click('[data-front-opening-option="push"]');
  await page.sleep(220);
  const push = await store('({ variant: s.project.design.runners.variant, style: s.project.design.fronts.style })');
  check('F5 — Push-to-open IS the MOVENTO TIP-ON variant, and the shape comes back',
    push.variant === 'T' && push.style !== 'HJ', JSON.stringify(push));

  // ── THE SHINE, and it reaches the material ──
  const setSheen = (value) => setNativeValue('[data-front-shine] input[type="range"]', value, 'range');
  await setSheen(5);
  await page.sleep(280);
  const matt = await page.evaluate(`
    const d = ${P}.project.getState().project.design;
    const p = ${P}.profile.getState().profile;
    return { sheen: d.sheen, roughness: window.__ccT34.design.roughnessFromSheen(d.sheen, p) };
  `);
  await shot('f5-shine-matte', { dom: '[data-front-shine]' });
  await setSheen(100);
  await page.sleep(280);
  const gloss = await page.evaluate(`
    const d = ${P}.project.getState().project.design;
    const p = ${P}.profile.getState().profile;
    return { sheen: d.sheen, roughness: window.__ccT34.design.roughnessFromSheen(d.sheen, p) };
  `);
  await shot('f5-shine-gloss', { dom: '[data-front-shine]' });
  check('F5 — the shine REACHES the material: 5 % → 0.95, 100 % → 0.00 roughness',
    matt.roughness > 0.9 && gloss.roughness < 0.05,
    `${matt.sheen}% → ${matt.roughness.toFixed(2)} · ${gloss.sheen}% → ${gloss.roughness.toFixed(2)}`);
  const shineDiff = pixelDifference(`${OUT}f5-shine-matte.png`, `${OUT}f5-shine-gloss.png`);
  check('F5 — …and the two are different pictures, not the same one twice',
    shineDiff > 0, `${(shineDiff * 100).toFixed(2)} % of pixels differ`);
  sideBySide(`${OUT}f5-shine-matte.png`, `${OUT}f5-shine-gloss.png`, `${OUT}f5-fronts-and-shine.png`,
    [`MATTE 5% ROUGHNESS ${matt.roughness.toFixed(2)}`, `SHINE 100% ROUGHNESS ${gloss.roughness.toFixed(2)}`]);
  shots.push({ name: 'f5-fronts-and-shine', subject: 'composed', present: true, detail: 'matte | shine' });

  await shot('f5-fronts-tail', { all: ['[data-front-opening]', '[data-front-shine]', '[data-save-fronts]'] });
  await page.click('[data-save-fronts]');
  await page.sleep(220);

  // ══════════════════════════════════════════════════════════════════════════
  // F6 · HARDWARE   F7 · PRODUKCJA   F8 · PODSUMOWANIE
  // ══════════════════════════════════════════════════════════════════════════
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"hardware\\"]")');
  const hardwareFactory = await page.evaluate(`
    return [...document.querySelectorAll('[data-wizard-node]')].map((n) => n.dataset.wizardNode);
  `);
  check('F6 — the factory sees every hardware row',
    hardwareFactory.includes('hardware.hinge-standard') && hardwareFactory.includes('hardware.runners'),
    hardwareFactory.join(' '));
  await shot('f6-hardware-factory', { all: ['[data-hinge-standard]', '[data-runner-variant]', '[data-shelf-sleeve]'] });

  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"produkcja\\"]")');
  const blocks = await page.evaluate(`
    return [...document.querySelectorAll('[data-material-block]')].map((b) => b.dataset.materialBlock);
  `);
  check('F7 — one block per chosen material, named, not a pile of six',
    blocks.includes('carcass1') && blocks.includes('carcass2') && blocks.includes('front1') && blocks.includes('box'),
    blocks.join(','));
  await shot('f7-produkcja-per-material', { count: ['[data-material-block]', 4], dom: '[data-infill-side-width]' });

  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-summary]")');
  const groups = await page.evaluate(`
    return [...document.querySelectorAll('[data-summary-group]')].map((g) => g.dataset.summaryGroup);
  `);
  check('F8 — the summary is grouped by tab', groups.length === 5, groups.join(','));
  await shot('f8-podsumowanie', { count: ['[data-summary-group]', 5] });

  // ── the finale, and the round trip ──
  await page.click('[data-open-save-set]');
  await page.waitFor('document.querySelector("[data-save-set-modal]")');
  await shot('f8-save-set-modal', { all: ['[data-set-name]', '[data-set-answer="yes"]', '[data-set-answer="no"]'] });
  await typeInto('[data-set-name]', 'T44 walk standard', { enter: false });
  await page.sleep(150);
  await page.click('[data-set-answer="yes"]');
  await page.sleep(600);
  const savedSets = await page.evaluate(`
    const st = ${P}.ui.getState();
    return { sets: JSON.parse(localStorage.getItem('cc.settingsSets.v1') || '{"sets":[]}').sets.map((s) => s.name) };
  `);
  check('F8 — the set is saved (locally, with no table — the named skip)',
    savedSets.sets.includes('T44 walk standard'), savedSets.sets.join(','));

  // ══════════════════════════════════════════════════════════════════════════
  // F2 · THE RETAIL DOM AUDIT — zero factory-flagged nodes
  // ══════════════════════════════════════════════════════════════════════════
  await setAudience('retail');
  await page.sleep(350);
  const retailTabs = await tabsNow();
  check('F2 — retail loses Produkcja and the rest renumber',
    retailTabs.length === 5 && !retailTabs.some((t) => t.id === 'produkcja')
      && retailTabs.map((t) => t.n).join(',') === '1,2,3,4,5',
    retailTabs.map((t) => `${t.n}${t.id}`).join(' '));
  // Stand on the SAME tab the factory shot was taken on, so the two halves of
  // the comparison are the same screen read by two heads.
  await page.click('[data-wizard-tab="ustawienia"]');
  await page.sleep(300);
  await shot('f2-retail-ustawienia', {
    all: ['[data-wizard-tabs]', '[data-wizard-node="ustawienia.dimensions"]'],
    none: ['[data-wizard-tab="produkcja"]', '[data-settings-set-select]'],
  });
  sideBySide(`${OUT}f2-tab-1-ustawienia.png`, `${OUT}f2-retail-ustawienia.png`, `${OUT}f2-tabs-and-retail.png`,
    ['FACTORY 6 TABS', 'RETAIL 5 TABS']);
  shots.push({ name: 'f2-tabs-and-retail', subject: 'composed', present: true, detail: 'factory | retail' });

  // Walk EVERY retail tab and count the factory nodes on each one.
  const hiddenIds = await page.evaluate('return window.__ccT44.tabs.hiddenNodes("retail");');
  let strays = [];
  for (const id of ['ustawienia', 'carcases', 'fronts', 'hardware', 'podsumowanie']) {
    // Every tab has been walked by now, so every tab is clickable — which is
    // F2's own rule ("tabs stay clickable once visited") doing the work.
    await page.click(`[data-wizard-tab="${id}"]`);
    await page.sleep(320);
    const onScreen = await page.evaluate(`
      return [...document.querySelectorAll('[data-wizard-node]')].map((n) => n.dataset.wizardNode);
    `);
    strays = strays.concat(onScreen.filter((n) => hiddenIds.includes(n)));
    if (id === 'hardware') {
      await shot('f6-hardware-retail', { dom: '[data-wizard-node="hardware.colour"]', none: ['[data-hinge-standard]', '[data-runner-variant]'] });
    }
  }
  check('F2 — RETAIL RENDERS ZERO FACTORY NODES (DOM audit, every tab)',
    strays.length === 0, strays.length ? strays.join(',') : `0 of ${hiddenIds.length} hidden ids on screen`);
  sideBySide(`${OUT}f6-hardware-factory.png`, `${OUT}f6-hardware-retail.png`, `${OUT}f6-hardware-factory-vs-retail.png`,
    ['FACTORY ALL ROWS', 'RETAIL COLOUR ONLY']);
  shots.push({ name: 'f6-hardware-factory-vs-retail', subject: 'composed', present: true, detail: 'factory | retail' });

  // ══════════════════════════════════════════════════════════════════════════
  // F2 · TAB RETURN KEEPS STATE  +  F3 · WARDROBE vs KITCHEN
  // ══════════════════════════════════════════════════════════════════════════
  await setAudience('factory');
  await page.sleep(300);
  await page.click('[data-wizard-tab="fronts"]');
  await page.sleep(300);
  const beforeReturn = await page.evaluate(`
    const b = document.querySelector('[data-wizard-tab-body]');
    return { tab: b ? b.dataset.wizardTabBody : null,
      sheen: ${P}.project.getState().project.design.sheen };
  `);
  await page.click('[data-wizard-tab="ustawienia"]');
  await page.sleep(250);
  await page.click('[data-wizard-tab="fronts"]');
  await page.sleep(300);
  const afterReturn = await page.evaluate(`
    const b = document.querySelector('[data-wizard-tab-body]');
    return { tab: b ? b.dataset.wizardTabBody : null,
      sheen: ${P}.project.getState().project.design.sheen,
      types: ${P}.project.getState().project.design.carcass.types.length };
  `);
  check('F2 — a tab returned to keeps its state',
    afterReturn.tab === 'fronts' && afterReturn.sheen === beforeReturn.sheen && afterReturn.types === 2,
    JSON.stringify(afterReturn));

  // …RELOAD, and the set is in F3's dropdown and re-applies
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-audience-toggle]")');
  await page.click('button', 'New project');
  await page.waitFor('document.querySelector("[data-modal-name=\\"new-project\\"]")');
  await toScope('Wardrobe');
  await page.click('[data-scope-card="wall"]');
  await page.waitFor('document.querySelector("[data-elevation-save]")');
  await page.click('[data-elevation-save]');
  await page.waitFor('document.querySelector("[data-settings-set-select]")');
  const reloaded = await page.evaluate(`
    const sel = document.querySelector('[data-settings-set-select]');
    return [...sel.options].map((o) => o.textContent);
  `);
  check('F8 — after a RELOAD the set is in the dropdown',
    reloaded.includes('T44 walk standard'), reloaded.join(' | '));
  const setId = await page.evaluate(`
    const sel = document.querySelector('[data-settings-set-select]');
    const opt = [...sel.options].find((o) => o.textContent === 'T44 walk standard');
    return opt ? opt.value : null;
  `);
  const applied = setId ? await setNativeValue('[data-settings-set-select]', setId, 'select') : null;
  await page.sleep(500);
  const reapplied = await store('({ sheen: s.project.design.sheen, mode: s.project.design.drawerBoxes.mode, types: s.project.design.carcass.types.length })');
  check('F8 — …and re-applies the settings it was saved from',
    applied && reapplied.sheen === 100 && reapplied.mode === 'ready' && reapplied.types === 2,
    JSON.stringify(reapplied));
  await shot('f8-save-set-roundtrip', { dom: '[data-settings-set-select]', text: 'T44 walk standard' });

  // …and the KITCHEN, for F3's side-by-side
  await openWizard('factory');
  await toScope('Kitchen');
  await page.click('button', 'Next — room setup');
  await page.waitFor('document.querySelector("[data-modal-name=\\"room\\"]")');
  await page.click('button', 'Apply');
  await page.waitFor('document.querySelector("[data-wizard-settings]")');
  const kitchenDims = await page.evaluate(`
    return [...document.querySelectorAll('[data-dimension]')].map((d) => d.dataset.dimension);
  `);
  check('F3 — a KITCHEN is asked all three of them',
    ['base', 'wall', 'wallMount'].every((k) => kitchenDims.includes(k)), kitchenDims.join(','));
  await shot('f3-ustawienia-kitchen', { dom: '[data-dimension="wallMount"]' });
  sideBySide(`${OUT}f3-ustawienia-wardrobe.png`, `${OUT}f3-ustawienia-kitchen.png`,
    `${OUT}f3-ustawienia-wardrobe-vs-kitchen.png`,
    ['WARDROBE 3 DIMENSIONS', 'KITCHEN 6 DIMENSIONS']);
  const differs = pixelDifference(`${OUT}f3-ustawienia-wardrobe.png`, `${OUT}f3-ustawienia-kitchen.png`);
  check('F3 — the two heads of tab 1 really are different pictures', differs > 0.01,
    `${(differs * 100).toFixed(1)} % of pixels differ`);
  shots.push({ name: 'f3-ustawienia-wardrobe-vs-kitchen', subject: 'composed', present: true, detail: 'wardrobe | kitchen' });

  // ══════════════════════════════════════════════════════════════════════════
  // THE SHELL CONTRACT, AND THE CONSOLE
  // ══════════════════════════════════════════════════════════════════════════
  const faults = await page.evaluate('return window.__cc.modalFaults().map((f) => f.message);');
  check('RULE 4 — no modal opened without knowing what it is about',
    faults.length === 0, faults.slice(0, 2).join(' | ') || 'none');

  const missing = shots.filter((s) => !s.present).map((s) => s.name);
  check('RULE 3 — every screenshot contains its named subject', missing.length === 0, missing.join(','));

  const failed = steps.filter((s) => !s.ok);
  const report = {
    turn: 44,
    base: BASE,
    steps,
    shots,
    ok: failed.length === 0,
  };
  writeFileSync(`${OUT}report.json`, `${JSON.stringify(report, null, 2)}\n`);

  // eslint-disable-next-line no-console
  console.log(`\n${steps.length - failed.length}/${steps.length} checks, ${shots.length} proofs → ${OUT}`);
  if (failed.length) {
    // eslint-disable-next-line no-console
    console.log(`FAILED:\n${failed.map((f) => `  · ${f.label} — ${f.detail}`).join('\n')}`);
  }
  await page.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
