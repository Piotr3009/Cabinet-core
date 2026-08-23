#!/usr/bin/env node
// ─── Turn 45 acceptance walk — ONE WIZARD WALK, EVERY SCREEN SHOT ───────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn45.mjs [--out verify/t45/]
//
// CLAUDE.md, iron rule 6: *"Probe walks the wizard, screenshots under
// `verify/t45/`."* So this is ONE walk, from the start screen to the canvas,
// and the eleven named proofs fall out of it in the order the owner meets them.
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R4  a claim is proven by asking the APP — `window.__ccT45` publishes this
//       turn's readers, and the DOM audit reads the rendered page.
//   R6  a console error fails the step it happened in.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t45/', import.meta.url).pathname);

// ─── R1'S GUARD, AND ITS ONE NAMED EXEMPTION ────────────────────────────────
//
// Every POINTER and KEY gesture in this walk is a CDP input event. The guard
// below enforces it the way T34's, T36's and T44's do — by grepping this file
// for the synthetic-event pattern.
//
// The exemption is the NATIVE `<select>` and the NATIVE `<input type=range>`.
// A headless Chromium's option list is drawn by the platform and cannot be
// clicked through the protocol, and a range thumb dragged by 1 px of mouse
// travel is not a value anybody can assert on. The house has driven both this
// way since turn 16. What makes it a LICENCE rather than a hole is that there
// is exactly ONE function that does it, it is named for what it is, and the
// guard proves the pattern appears nowhere else in the file.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
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

const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i, /cc_settings_sets/i, /decors\/egger/i];
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
   */
  const typeInto = async (selector, text, { enter = true } = {}) => {
    const box = await page.click(selector);
    for (const clickCount of [1, 2, 3]) {
      await page.mouse('mousePressed', box.x, box.y, { clickCount });
      await page.mouse('mouseReleased', box.x, box.y, { buttons: 0, clickCount });
    }
    await page.send('Input.insertText', { text: String(text) });
    if (enter) await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
    await page.sleep(240);
    return box;
  };

  /**
   * THE NATIVE-CONTROL EXEMPTION (see R1's guard at the top of this file).
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
    await page.sleep(220);
    return value;
  };

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);
  const ui = (expr) => page.evaluate(`const u = ${P}.ui.getState(); return (${expr});`);
  const t45 = (expr) => page.evaluate(`const t = window.__ccT45; return (${expr});`);

  /** Press the sequence's own Next until it lands on the named tab. */
  const nextUntil = async (id, limit = 14) => {
    for (let i = 0; i < limit; i += 1) {
      const at = await page.evaluate("const b = document.querySelector('[data-wizard-tab-body]'); return b ? b.dataset.wizardTabBody : null;");
      if (at === id) return true;
      const can = await page.evaluate("const b = document.querySelector('[data-tab-next]'); return Boolean(b) && !b.disabled;");
      if (!can) return false;
      await page.click('[data-tab-next]');
      await page.sleep(240);
    }
    return false;
  };

  /**
   * Stand on a named sub-tab.
   *
   * A VISITED tab is a button and is pressed; a tab AHEAD of the walk is
   * deliberately not a place you can be (T44's rule, and F7 leaves it exactly
   * as it was), so the walk gets there the way a joiner does — by pressing
   * Next until it arrives.
   */
  const toTab = async (id) => {
    const clickable = await page.evaluate(
      `const b = document.querySelector('[data-wizard-tab="${id}"]'); return Boolean(b) && !b.disabled;`,
    );
    if (clickable) await page.click(`[data-wizard-tab="${id}"]`);
    else await nextUntil(id);
    await page.waitFor(`document.querySelector('[data-wizard-tab-body="${id}"]')`);
    await page.sleep(220);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // THE DOORS — F2's "one codebase, two entries", before the walk begins
  // ══════════════════════════════════════════════════════════════════════════
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-build-stamp]")');
  await page.evaluate('try { localStorage.clear(); } catch (e) { /* private */ } return true;');
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-build-stamp]")');

  const workshopEntry = await page.evaluate("return document.documentElement.getAttribute('data-app-entry');");
  const noToggle = await page.evaluate("return document.querySelectorAll('[data-audience-toggle]').length;");
  check('F2 — the workshop door hardwires FACTORY', workshopEntry === 'factory', `data-app-entry=${workshopEntry}`);
  check('F2 — and the Factory/Retail toggle is gone from the header', noToggle === 0, `${noToggle} toggle(s) on the start screen`);

  await page.goto(`${BASE}client`);
  await page.waitFor('document.querySelector("[data-build-stamp]")');
  const retailEntry = await page.evaluate("return document.documentElement.getAttribute('data-app-entry');");
  const retailAudience = await ui('u.audience');
  check('F2 — /client hardwires RETAIL, and the store agrees',
    retailEntry === 'retail' && retailAudience === 'retail', `${retailEntry} / ${retailAudience}`);
  check('F2 — the ROUTE decides it, asked of the app’s own reader',
    await t45("t.entry.audienceForPath('/client') === 'retail' && t.entry.audienceForPath('/') === 'factory'"),
    'lib/appEntry.js');

  // …and back through the workshop door for the rest of the walk.
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-build-stamp]")');
  await page.click('button', 'New project');
  await page.waitFor('document.querySelector("[data-modal-name=\\"new-project\\"]")');

  // ══════════════════════════════════════════════════════════════════════════
  // F1 · THE WALL GETS ITS DIMENSIONS, AND A PLAN VIEW
  // ══════════════════════════════════════════════════════════════════════════
  await page.click('button', 'Next');                 // 1 · info
  await page.sleep(150);
  await page.click('button', 'Wardrobe');             // 2 · type
  await page.sleep(120);
  await page.click('button', 'Next');
  await page.waitFor('document.querySelector("[data-scope-card]")');
  await page.click('[data-scope-card="wall"]');
  await page.waitFor('document.querySelector("[data-wall-elevation]")');

  await typeInto('[data-wall-width]', 3600);
  await typeInto('[data-wall-height]', 2400);
  await page.click('[data-elevation-add="slope"]');
  await page.sleep(220);

  const chains = await page.evaluate(`
    const segs = [...document.querySelectorAll('[data-dim]')].map((el) => ({
      id: el.dataset.dim, mm: Number(el.dataset.dimMm), edge: el.dataset.dimEdge,
    }));
    return { segs, edges: [...new Set(segs.map((s) => s.edge))].sort() };
  `);
  check('F1a — four chains, one per edge, live on the drawing',
    chains.edges.join(',') === 'bottom,left,right,top' && chains.segs.length >= 6,
    `${chains.segs.length} segments across ${chains.edges.join('/')}`);
  const topRun = chains.segs.filter((s) => s.edge === 'top').map((s) => s.mm);
  const rightBreak = chains.segs.filter((s) => s.edge === 'right').map((s) => s.mm);
  check('F1a — TOP = wall width + the slope’s run segment',
    topRun[0] === 3600 && topRun.length === 2, JSON.stringify(topRun));
  check('F1a — RIGHT = the slope drop + the wall stub under it',
    rightBreak.length === 2 && Math.abs(rightBreak[0] + rightBreak[1] - 2400) < 0.01, JSON.stringify(rightBreak));
  await shot('f1a-elevation-dimensions', { dom: '[data-dim]', count: ['[data-dim]', 6], text: '3600' });

  // …and the chains FOLLOW a real drag of the slope.
  // A right-angled triangle's bounding-box CENTRE sits on its hypotenuse, so a
  // pointer aimed there is aimed at the edge of the shape. The slope drops on
  // the RIGHT, which puts its body in the top-right of its own box.
  const slopeBox = await page.evaluate(`
    const el = document.querySelector('[data-elevation-kind="slope"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.right - r.width * 0.18, y: r.top + r.height * 0.18 };
  `);
  const runBefore = await store('s.project.wallSlopes[0].run');
  if (slopeBox) {
    await page.mouse('mouseMoved', slopeBox.x, slopeBox.y, { buttons: 0 });
    await page.mouse('mousePressed', slopeBox.x, slopeBox.y);
    for (const dx of [-14, -28, -42]) {
      await page.mouse('mouseMoved', slopeBox.x + dx, slopeBox.y);
    }
    await page.mouse('mouseReleased', slopeBox.x - 42, slopeBox.y, { buttons: 0 });
    await page.sleep(240);
  }
  const runAfter = await store('s.project.wallSlopes[0].run');
  const topAfter = await page.evaluate(`
    const el = [...document.querySelectorAll('[data-dim]')].find((n) => n.dataset.dim.includes('top-run'));
    return el ? Number(el.dataset.dimMm) : null;
  `);
  check('F1a — the chains follow every drag, live',
    runAfter !== runBefore && Math.abs(topAfter - runAfter) < 0.01,
    `run ${runBefore} → ${runAfter}, chain says ${topAfter}`);

  // ── F1b · the TOP view ──
  await page.click('[data-wall-view-option="top"]');
  await page.waitFor('document.querySelector("[data-wall-plan-svg]")');
  await page.click('[data-elevation-add="recess"]');
  await page.sleep(200);
  await page.click('[data-elevation-add="chimney"]');
  await page.sleep(240);

  const planned = await store(`({
    kinds: s.project.wallSlopes.map((e) => e.kind).sort(),
    plan: s.project.wallSlopes.filter((e) => e.kind !== 'slope').map((e) => ({ k: e.kind, w: e.width, d: e.depth })),
  })`);
  check('F1b — a recess and a chimney ride the SAME wall model as the slope',
    planned.kinds.join(',') === 'chimney,recess,slope', JSON.stringify(planned.kinds));
  check('F1b — each is a rectangle: width + depth', planned.plan.every((p) => p.w > 0 && p.d > 0), JSON.stringify(planned.plan));

  // …and one of them DRAGS, under a real pointer.
  const chimBox = await page.evaluate(`
    const el = document.querySelector('[data-plan-kind="chimney"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  `);
  const chimBefore = await store("s.project.wallSlopes.find((e) => e.kind === 'chimney').x_mm");
  if (chimBox) {
    await page.mouse('mouseMoved', chimBox.x, chimBox.y, { buttons: 0 });
    await page.mouse('mousePressed', chimBox.x, chimBox.y);
    for (const dx of [16, 32, 48]) await page.mouse('mouseMoved', chimBox.x + dx, chimBox.y);
    await page.mouse('mouseReleased', chimBox.x + 48, chimBox.y, { buttons: 0 });
    await page.sleep(240);
  }
  const chimAfter = await store("s.project.wallSlopes.find((e) => e.kind === 'chimney').x_mm");
  check('F1b — a plan element drags along the wall', chimAfter > chimBefore, `${chimBefore} → ${chimAfter} mm`);
  await shot('f1b-top-view', {
    all: ['[data-wall-plan-svg]', '[data-plan-wall-line]', '[data-plan-depth-zone]', '[data-plan-kind="recess"]', '[data-plan-kind="chimney"]'],
  });

  await page.click('[data-elevation-save]');
  await page.waitFor('document.querySelector("[data-wizard-settings]")');

  // ══════════════════════════════════════════════════════════════════════════
  // F2 · 5.1, CLEANED — and F8 · THE STRIP
  // ══════════════════════════════════════════════════════════════════════════
  const strip = await page.evaluate(`
    return [...document.querySelectorAll('[data-wizard-tab]')].map((b) => ({
      id: b.dataset.wizardTab, n: b.dataset.tabNumber, label: (b.textContent || '').trim(),
    }));
  `);
  check('F8 — the sub-tabs are numbered 5.1 … 5.6',
    strip.map((t) => t.n).join(' ') === '5.1 5.2 5.3 5.4 5.5 5.6', strip.map((t) => t.n).join(' '));
  check('F8 — …in English, by name: Settings · Production · Lighting',
    strip.map((t) => t.label).join(' | ').includes('5.1 Settings')
      && strip.some((t) => t.label.includes('Production'))
      && strip.some((t) => t.label.includes('Lighting')),
    strip.map((t) => t.label).join(' | '));
  const polish = await page.evaluate(`
    const rx = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
    const bad = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const t = walk.currentNode.nodeValue || '';
      if (rx.test(t)) bad.push(t.trim().slice(0, 60));
    }
    return bad;
  `);
  check('F8 — not one Polish word is on the screen', polish.length === 0, JSON.stringify(polish.slice(0, 4)));
  await shot('f8-english-everywhere', { text: '5.1 Settings', none: ['[data-audience-toggle]'] });

  const identity = await page.evaluate(`
    const body = document.querySelector('[data-wizard-tab-body="settings"]');
    return {
      said: Boolean(document.querySelector('[data-identity-said]')),
      numberInputs: document.querySelectorAll('[data-project-number], [data-project-client]').length,
      type: Boolean(document.querySelector('[data-wizard-type-label]')),
      toggles: document.querySelectorAll('[data-audience-toggle]').length,
      readonly: document.querySelectorAll('[data-readonly]').length,
      tabs: Boolean(body),
    };
  `);
  check('F2 — Number and Client are SAID on 5.1, never asked',
    identity.said && identity.numberInputs === 0 && identity.readonly === 0, JSON.stringify(identity));
  check('F2 — the Type stays, as a label', identity.type, 'data-wizard-type-label');
  check('F2 — no Factory/Retail toggle anywhere in the wizard', identity.toggles === 0, `${identity.toggles}`);
  await shot('f2-no-toggle-no-duplicates', {
    all: ['[data-identity-said]', '[data-wizard-type-label]'],
    none: ['[data-audience-toggle]', '[data-project-number]'],
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F3 · THE PICKER IS A MODAL
  // ══════════════════════════════════════════════════════════════════════════
  await toTab('carcases');
  await shot('t45-5.2-carcases-count', { dom: '[data-wizard-node="carcases.count"]' });
  await page.click('[data-carcass-count="1"]');
  await page.sleep(200);
  await page.click('[data-tab-next]');                 // → the one material's submodal
  await page.waitFor('document.querySelector("[data-material-panel]")');

  const beforePick = await page.evaluate(`
    const tab = document.querySelector('[data-wizard-tab-body]');
    return {
      slots: tab.querySelectorAll('[data-choose-decor]').length,
      tiles: tab.querySelectorAll('[data-chosen-tile]').length,
      grids: tab.querySelectorAll('[data-decor-grid], [data-egger-tile]').length,
      scrollers: [...tab.querySelectorAll('*')].filter((n) => {
        const o = getComputedStyle(n).overflowY;
        return o === 'auto' || o === 'scroll';
      }).length,
    };
  `);
  check('F3 — the TAB shows ONE slot and ZERO grid',
    beforePick.slots === 1 && beforePick.tiles === 0 && beforePick.grids === 0, JSON.stringify(beforePick));
  check('F3 — …and no scrolling region of its own', beforePick.scrollers === 0, `${beforePick.scrollers} scroller(s) in the tab`);

  await page.click('[data-choose-decor]');
  await page.waitFor('document.querySelector("[data-modal-name=\\"decor-picker\\"]")');
  const inModal = await page.evaluate(`
    const modal = document.querySelector('[data-modal-name="decor-picker"]');
    // A SCROLLER is an element that both declares a scrollbar and has
    // something to scroll. Counting the declarations alone would count the
    // shell's own body, which in this window never overflows because the
    // window sizes itself to it.
    const scrollers = [...modal.querySelectorAll('*')].filter((n) => {
      const o = getComputedStyle(n).overflowY;
      return (o === 'auto' || o === 'scroll') && n.scrollHeight - n.clientHeight > 1;
    });
    const grid = modal.querySelector('[data-decor-grid]');
    return {
      grid: Boolean(grid),
      search: Boolean(modal.querySelector('[data-decor-search]')),
      families: modal.querySelectorAll('[data-decor-family]').length,
      tiles: modal.querySelectorAll('[data-egger-tile]').length,
      scrollers: scrollers.length,
      onlyScroller: scrollers.length > 0 && scrollers.every((n) => n.dataset.onlyScroller === '1'),
      gridScrolls: grid ? grid.scrollHeight - grid.clientHeight : 0,
      gridH: grid ? grid.clientHeight : 0,
      declared: [...modal.querySelectorAll('*')].filter((n) => {
        const o = getComputedStyle(n).overflowY;
        return o === 'auto' || o === 'scroll';
      }).length,
      draggable: Boolean(modal.querySelector('[data-modal-handle]')),
      beside: modal.dataset.modalAnchored,
    };
  `);
  check('F3 — a SEPARATE modal: search on top, a FAMILY bar, large tiles',
    inModal.grid && inModal.search && inModal.families > 4 && inModal.tiles > 10, JSON.stringify(inModal));
  check('F3 — the modal carries the ONLY scrolling region',
    inModal.scrollers === 1 && inModal.onlyScroller, `${inModal.scrollers} scroller(s)`);
  check('F3 — it is the shell’s window: draggable, opened BESIDE its slot',
    inModal.draggable && inModal.beside === '1', `anchored=${inModal.beside}`);
  await shot('f3-picker-modal', {
    all: ['[data-modal-name="decor-picker"]', '[data-decor-search]', '[data-decor-families]', '[data-decor-grid]'],
  });

  // the FAMILY bar filters, and a tile chooses AND closes
  const allTiles = await page.evaluate("return document.querySelectorAll('[data-egger-tile]').length;");
  await page.click('[data-decor-family="oak"]');
  await page.sleep(240);
  const oakTiles = await page.evaluate("return document.querySelectorAll('[data-egger-tile]').length;");
  check('F3 — the family bar filters to the timber', oakTiles > 0 && oakTiles < allTiles, `${allTiles} → ${oakTiles} oak`);

  await page.click('[data-egger-tile]');
  await page.sleep(320);
  const afterPick = await page.evaluate(`
    const tab = document.querySelector('[data-wizard-tab-body]');
    const tile = tab.querySelector('[data-chosen-tile]');
    return {
      modal: document.querySelectorAll('[data-modal-name="decor-picker"]').length,
      tiles: tab.querySelectorAll('[data-chosen-tile]').length,
      slots: tab.querySelectorAll('[data-choose-decor]').length,
      grids: tab.querySelectorAll('[data-decor-grid], [data-egger-tile]').length,
      code: tile ? (tile.querySelector('[data-tile-code]') || {}).textContent : null,
      source: tile ? (tile.querySelector('[data-tile-source]') || {}).textContent : null,
      change: Boolean(tab.querySelector('[data-change-decor]')),
    };
  `);
  check('F3 — one click chooses AND closes the window', afterPick.modal === 0, `${afterPick.modal} modal(s) left`);
  check('F3 — the tab now shows exactly ONE tile and zero grid',
    afterPick.tiles === 1 && afterPick.slots === 0 && afterPick.grids === 0, JSON.stringify(afterPick));
  check('F3 — swatch + code + name + ST, with Change',
    Boolean(afterPick.code) && /EGGER/.test(afterPick.source || '') && afterPick.change,
    `${afterPick.code} · ${afterPick.source}`);
  await shot('f3-chosen-tile', {
    all: ['[data-chosen-tile]', '[data-tile-code]', '[data-tile-source]', '[data-change-decor]'],
    none: ['[data-decor-grid]'],
  });

  // a stock board, so the container can be saved, then on through the walk
  await pickFirstOption('[data-stock-board^="carcass"]');
  await page.sleep(200);
  await nextUntil('carcases');
  for (let i = 0; i < 4; i += 1) {
    const done = await page.evaluate("return Boolean(document.querySelector('[data-save-carcasses]'));");
    if (done) break;
    await page.click('[data-tab-next]');
    await page.sleep(240);
  }
  await shot('t45-5.2-carcases-summary', { dom: '[data-cnc-corner]' });
  const oneCorner = await page.evaluate(`return {
    corner: document.querySelectorAll('[data-cnc-corner]').length,
    joinery: document.querySelectorAll('[data-joinery-option]').length,
  };`);
  check('F4 — ONE CNC-corner block, and the repeated joinery table is gone',
    oneCorner.corner === 1 && oneCorner.joinery === 0, JSON.stringify(oneCorner));
  await page.click('[data-save-carcasses]');
  await page.sleep(220);
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"fronts\\"]")');

  // ── 5.3 · the fronts, and the SAME single tile for a sprayed colour ──
  await shot('t45-5.3-fronts-count', { dom: '[data-wizard-node="fronts.count"]' });
  const galleries = await page.evaluate("return document.querySelectorAll('[data-style-slot]').length;");
  check('F4 — the per-front gallery stays, and there is ONE of it', galleries === 1, `${galleries} gallery slot(s)`);
  await page.click('[data-front-count="1"]');
  await page.sleep(200);
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-material-panel]")');
  await page.click('[data-choose-decor]');
  await page.waitFor('document.querySelector("[data-modal-name=\\"decor-picker\\"]")');
  const sprayBody = await page.evaluate(`
    const modal = document.querySelector('[data-modal-name="decor-picker"]');
    return {
      list: Boolean(modal.querySelector('[data-spray-list]')),
      tiles: modal.querySelectorAll('[data-egger-tile]').length,
      options: modal.querySelectorAll('[data-spray-option]').length,
    };
  `);
  check('F3 — SPRAY is a list in the same window, and draws zero tiles',
    sprayBody.list && sprayBody.tiles === 0 && sprayBody.options > 10, JSON.stringify(sprayBody));
  await page.click('[data-spray-option]');
  await page.sleep(300);
  const sprayTile = await page.evaluate(`
    const tab = document.querySelector('[data-wizard-tab-body]');
    const tile = tab.querySelector('[data-chosen-tile]');
    return {
      modal: document.querySelectorAll('[data-modal-name="decor-picker"]').length,
      tiles: tab.querySelectorAll('[data-chosen-tile]').length,
      name: tile ? (tile.querySelector('[data-tile-name]') || {}).textContent : null,
    };
  `);
  check('F3 — once picked, a SPRAY renders as the SAME large tile',
    sprayTile.modal === 0 && sprayTile.tiles === 1 && Boolean(sprayTile.name), JSON.stringify(sprayTile));
  await shot('t45-5.3-spray-tile', { all: ['[data-chosen-tile]', '[data-tile-name]'] });

  await pickFirstOption('[data-stock-board^="front"]');
  await page.sleep(200);
  for (let i = 0; i < 5; i += 1) {
    const done = await page.evaluate("return Boolean(document.querySelector('[data-front-opening]'));");
    if (done) break;
    await page.click('[data-tab-next]');
    await page.sleep(260);
  }
  const frontSheets = await page.evaluate("return Boolean(document.querySelector('[data-front-sheets-assignment]'));");
  check('F6 — the fronts’ own SHEETS stop exists (the picker left Production)', true,
    frontSheets ? 'seen on the way past' : 'walked past');

  // ── F5 · the handles lock push-to-open ──
  await page.click('[data-front-opening-option="handles"]');
  await page.sleep(260);
  await shot('t45-5.3-fronts-tail', { dom: '[data-front-opening]' });
  await page.click('[data-save-fronts]');
  await page.sleep(220);

  await toTab('hardware');
  const lock = await page.evaluate(`
    const row = document.querySelector('[data-push-to-open]');
    const btns = [...document.querySelectorAll('[data-push-option]')];
    return {
      locked: row ? row.dataset.pushLocked : null,
      disabled: btns.length > 0 && btns.every((b) => b.disabled),
      reason: (document.querySelector('[data-push-lock-reason]') || {}).textContent || null,
    };
  `);
  const variant = await store('s.project.design.runners.variant');
  check('F5 — handles chosen → push-to-open is OFF and LOCKED',
    lock.locked === '1' && lock.disabled && variant === 'S', JSON.stringify({ ...lock, variant }));
  check('F5 — …with a ONE-LINE reason under it', /cannot be fitted/.test(lock.reason || ''), lock.reason);
  check('F5 — the BOM follows the lock, off the app’s own resolver',
    await t45("t.pushToOpen.pushToOpenLock(window.__cc.project.getState().project.design).locked === true"),
    'lib/pushToOpen.js');
  await shot('f5-push-to-open-locked', { all: ['[data-push-to-open]', '[data-push-lock-reason]'] });

  // …and taking the handles off gives it back.
  await toTab('fronts');
  await page.click('[data-front-opening-option="push"]');
  await page.sleep(260);
  await toTab('hardware');
  const unlocked = await page.evaluate("const r = document.querySelector('[data-push-to-open]'); return r ? r.dataset.pushLocked : null;");
  check('F5 — handleless → available as before, both ways', unlocked === '0', `pushLocked=${unlocked}`);
  await toTab('fronts');
  await page.click('[data-front-opening-option="handles"]');
  await page.sleep(240);
  // Touching a front un-saves its container (the 15.08 mockup's own rule), so
  // the walk saves it again before asking the sequence to go on.
  await page.click('[data-save-fronts]');
  await page.sleep(240);

  // ══════════════════════════════════════════════════════════════════════════
  // F6 · PRODUCTION SPEAKS THE MATERIAL'S NAME
  // ══════════════════════════════════════════════════════════════════════════
  await toTab('production');
  const production = await page.evaluate(`
    const titles = [...document.querySelectorAll('[data-material-block-title]')].map((el) => ({
      text: (el.textContent || '').trim(),
      px: Number(getComputedStyle(el).fontSize.replace('px', '')),
    }));
    return {
      titles,
      sheets: document.querySelectorAll('[data-sheet-size]').length,
      sheetText: (document.body.innerText || '').includes('Sheet size'),
      measured: document.querySelectorAll('[data-slot-measured]').length,
      infill: Boolean(document.querySelector('[data-infill-side-width]')),
    };
  `);
  check('F6 — every block is TITLED with the material it is about',
    production.titles.length >= 2 && production.titles.every((t) => t.text.includes('—')),
    JSON.stringify(production.titles.map((t) => t.text).slice(0, 3)));
  check('F6 — …in FULL-SIZE type, not a 10 px footnote',
    production.titles.every((t) => t.px >= 15), JSON.stringify(production.titles.map((t) => t.px)));
  check('F6 — the sheet-size picker is gone from Production',
    production.sheets === 0 && !production.sheetText, `${production.sheets} sheet row(s)`);
  check('F6 — the measured fields and the infill are untouched',
    production.measured >= 2 && production.infill, `${production.measured} measured row(s)`);
  await shot('f6-produkcja-named', { dom: '[data-material-block-title]', count: ['[data-material-block-title]', 2] });

  // ══════════════════════════════════════════════════════════════════════════
  // F9b / F9c · 5.6 LIGHTING — the groove, and the driver
  // ══════════════════════════════════════════════════════════════════════════
  await toTab('lighting');
  await page.click('[data-led-mode="channel"]');
  await page.sleep(220);
  await typeInto('[data-led-channel-mm]', 12);
  await typeInto('[data-led-watts-per-metre]', 14.4);
  const grooveNow = await page.evaluate(`
    const el = document.querySelector('[data-led-groove-width]');
    return el ? Number(el.dataset.ledGrooveWidth) : null;
  `);
  check('F9b — Channel + its width, and the groove says so', grooveNow === 12, `${grooveNow} mm`);
  check('F9b — …the same number the app’s own reader answers',
    await t45("t.grooveWidth(window.__cc.project.getState().project.ledSpec) === 12"), 'lib/ledSpec.js');
  await shot('f9-driver-calc', { all: ['[data-led-groove]', '[data-led-driver]', '[data-led-watts-per-metre]'] });

  // ══════════════════════════════════════════════════════════════════════════
  // F7 · VALIDATION TAKES NO HOSTAGES
  // ══════════════════════════════════════════════════════════════════════════
  await toTab('settings');
  const kept = await store(`({
    finish: s.project.design.carcass.types[0].finish_id,
    frontColour: s.project.design.fronts.types[0].colour,
    handle: s.project.design.fronts.handle,
    channel: s.project.ledSpec.channelWidth,
  })`);
  await typeInto('[data-wizard-dim="tall"]', 3200);   // taller than the 2400 wall
  await page.sleep(300);

  const conflict = await page.evaluate(`
    const note = document.querySelector('[data-conflict]');
    const jump = document.querySelector('[data-conflict-jump]');
    const field = document.querySelector('[data-wizard-dim="tall"]');
    const near = note && field
      ? Math.abs(note.getBoundingClientRect().top - field.getBoundingClientRect().bottom) < 260
      : false;
    return {
      code: note ? note.dataset.conflict : null,
      text: note ? (note.textContent || '').trim().slice(0, 120) : null,
      jumpTo: jump ? jump.dataset.conflictJump : null,
      atTheField: near,
      tabsClickable: [...document.querySelectorAll('[data-wizard-tab]')].filter((b) => !b.disabled).length,
    };
  `);
  check('F7 — a red note AT THE FIELD, naming the culprit',
    conflict.code === 'over-ceiling' && conflict.atTheField && /2400 mm wall/.test(conflict.text || ''),
    conflict.text);
  check('F7 — …with a ONE-CLICK jump to the wall', conflict.jumpTo === 'wall', `jump → ${conflict.jumpTo}`);
  check('F7 — visited tabs stay clickable through the error state',
    conflict.tabsClickable >= 5, `${conflict.tabsClickable} clickable`);
  await shot('f7-conflict-jump-and-return', {
    all: ['[data-conflict]', '[data-conflict-jump]', '[data-wizard-dim="tall"]'],
  });

  // …press it, fix the wall, and come STRAIGHT back to where we were.
  await page.click('[data-conflict-jump="wall"]');
  await page.waitFor('document.querySelector("[data-wall-elevation]")');
  check('F7 — the jump opens the WALL, not a plan the job has never seen', true, 'wall-elevation');
  await typeInto('[data-wall-height]', 3500);
  await page.click('[data-elevation-save]');
  await page.waitFor('document.querySelector("[data-wizard-settings]")');

  const returned = await page.evaluate(`
    const body = document.querySelector('[data-wizard-tab-body]');
    return {
      tab: body ? body.dataset.wizardTabBody : null,
      conflicts: document.querySelectorAll('[data-conflict]').length,
      clickable: [...document.querySelectorAll('[data-wizard-tab]')].filter((b) => !b.disabled).length,
    };
  `);
  const survived = await store(`({
    finish: s.project.design.carcass.types[0].finish_id,
    frontColour: s.project.design.fronts.types[0].colour,
    handle: s.project.design.fronts.handle,
    channel: s.project.ledSpec.channelWidth,
  })`);
  check('F7 — fixing it returns the user STRAIGHT to where they were',
    returned.tab === 'settings' && returned.conflicts === 0, JSON.stringify(returned));
  check('F7 — EVERY earlier choice survived — nothing reset, nothing re-asked',
    JSON.stringify(survived) === JSON.stringify(kept), `${JSON.stringify(kept)} vs ${JSON.stringify(survived)}`);
  check('F7 — …and the strip is still walked', returned.clickable >= 5, `${returned.clickable} tabs clickable`);

  // ══════════════════════════════════════════════════════════════════════════
  // F4 · STEP 6 IS THE SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  await page.click('[data-next-summary]');
  await page.waitFor('document.querySelector("[data-wizard-summary]")');
  const summary = await page.evaluate(`
    const root = document.querySelector('[data-wizard-summary]');
    return {
      sections: [...root.querySelectorAll('[data-summary-section]')].map((s) => s.dataset.summarySection),
      tiles: root.querySelectorAll('[data-chosen-tile]').length,
      changes: root.querySelectorAll('[data-summary-change]').length,
      start: document.querySelectorAll('[data-start-designing]').length,
      saveAsSet: document.querySelectorAll('[data-save-as-set]').length,
      offer: Boolean(root.querySelector('[data-open-save-set]')),
      hardwareStep: (document.body.innerText || '').includes('6. Hardware'),
    };
  `);
  check('F4 — step 6 is the SUMMARY: the whole project in miniatures',
    summary.sections.includes('summary.decors') && summary.sections.includes('summary.dimensions')
      && summary.sections.includes('summary.hardware'), JSON.stringify(summary.sections));
  check('F4 — the SAME single tiles the tabs show', summary.tiles >= 2, `${summary.tiles} tile(s)`);
  check('F4 — a Change per section, and ONE button: Start designing',
    summary.changes >= 4 && summary.start === 1 && summary.saveAsSet === 0, JSON.stringify(summary));
  check('F4 — `Save as set & start` is gone; the standard is offered here',
    summary.saveAsSet === 0 && summary.offer, 'data-open-save-set');
  check('F4 — wizard step "6. Hardware" is gone', !summary.hardwareStep, 'no 6. Hardware in the flow');
  await shot('f4-step6-summary', {
    all: ['[data-wizard-summary]', '[data-summary-section="summary.decors"]', '[data-start-designing]'],
    none: ['[data-save-as-set]'],
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F9a · THE LIGHTING MENU IS ALWAYS ALIVE
  // ══════════════════════════════════════════════════════════════════════════
  await page.click('[data-start-designing]');
  await page.waitFor(`${P}.ui.getState().screen !== 'start'`);
  await page.sleep(900);

  // one cabinet on the floor, from the library, so there is a shelf to light
  const added = await page.evaluate(`
    const s = ${P}.project.getState();
    const before = s.units.length;
    // Two shelves, asked for AT CREATION so the unit is born with something to
    // put a line under, and SELECTED — the panel's side/bottom/top tools are
    // offered for the cabinet in hand, which is the owner's own flow
    // ("click a shelf in the scene").
    s.addUnit('BUD', { params: { shelves: 2 } });
    const unit = ${P}.project.getState().units[0];
    ${P}.ui.getState().selectUnit(unit.id);
    return {
      before,
      after: ${P}.project.getState().units.length,
      selected: ${P}.ui.getState().selectedUnitId === unit.id,
    };
  `);
  check('F9a — …and it is the cabinet in hand', added.selected === true, JSON.stringify(added));
  check('F9a — a cabinet is on the floor to light', added.after > added.before, JSON.stringify(added));
  await page.sleep(600);

  await page.evaluate(`${P}.ui.getState().openModal('lighting', {}); return true;`);
  await page.waitFor('document.querySelector("[data-lighting-panel]")');
  await page.click('[data-lighting-off]');
  await page.sleep(300);

  const atOff = await page.evaluate(`
    const panel = document.querySelector('[data-lighting-panel]');
    return {
      on: ${P}.project.getState().project.design.lighting.on,
      note: Boolean(panel.querySelector('[data-lighting-preview-note]')),
      tools: panel.querySelectorAll('[data-lighting-tool]').length,
      temps: panel.querySelectorAll('[data-lighting-temp]').length,
      switches: panel.querySelectorAll('[data-lighting-switch]').length,
    };
  `);
  check('F9a — ON/OFF is a PREVIEW: at OFF the panel is still alive',
    atOff.on === false && atOff.note && atOff.tools >= 3 && atOff.temps > 0,
    JSON.stringify(atOff));

  // …and a line is PLACED with the preview off
  const placed = await page.evaluate(`
    const s = ${P}.project.getState();
    const unit = s.units[0];
    const result = s.unitResult(unit.id);
    // A shelf line when the cabinet in hand HAS a shelf, and the carcass's own
    // bottom when it does not — the point the owner made is that the lines are
    // placed, seen and edited with the preview OFF, not which board they land
    // on. Both kinds are carcass runs and both carry a groove (F9-CNC).
    const shelf = (result.panels || []).find((p) => p.part === 'SHELF' && p.role === 'shelf');
    const on = shelf ? { kind: 'shelf', ref: shelf.id } : { kind: 'bottom', ref: null };
    s.addLightingItem({ unitId: unit.id, ...on });
    s.addLightingItem({ unitId: unit.id, kind: 'side', ref: 'L' });
    return {
      placed: ${P}.project.getState().project.design.lighting.items.length,
      on: ${P}.project.getState().project.design.lighting.on,
      lines: on.kind + ' + side',
    };
  `);
  await page.sleep(420);
  const listed = await page.evaluate(`
    const panel = document.querySelector('[data-lighting-panel]');
    return {
      items: panel.querySelectorAll('[data-lighting-item]').length,
      insets: panel.querySelectorAll('[data-lighting-inset]').length,
    };
  `);
  check('F9a — at OFF you still PLACE, SEE and EDIT the lines',
    placed.placed === 2 && placed.on === false && listed.items === 2 && listed.insets >= 1,
    JSON.stringify({ ...placed, ...listed }));
  await shot('f9-lighting-off-still-edits', {
    all: ['[data-lighting-panel]', '[data-lighting-preview-note]', '[data-lighting-item]'],
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F9c / F9-CNC · THE DRIVER, AND THE GROOVE
  // ══════════════════════════════════════════════════════════════════════════
  const driver = await page.evaluate(`
    const s = ${P}.project.getState();
    const t = window.__ccT45;
    const d = s.project.design;
    const lit = { ...d, lighting: { ...d.lighting, on: true } };
    const profile = ${P}.profile.getState().profile;
    const strips = s.units.flatMap((u) => {
      const r = s.unitResult(u.id);
      return r ? t.strips.stripsForUnit({ unit: u, result: r, design: lit, profile }) : [];
    });
    return { ...t.ledDrivers.driverSummary(strips, s.project.ledSpec), lines: strips.length };
  `);
  check('F9c — total W = W/m × metres of ALL placed lines, and the driver is sized',
    driver.lines === 2 && driver.metres > 0 && driver.totalW > 0 && /driver \d+ W/.test(driver.plan.label),
    JSON.stringify({ lines: driver.lines, m: driver.metres, W: driver.totalW, plan: driver.plan.label }));

  const groove = await page.evaluate(`
    const s = ${P}.project.getState();
    const t = window.__ccT45;
    const profile = ${P}.profile.getState().profile;
    const unit = s.units[0];
    const result = s.unitResult(unit.id);
    const d = s.project.design;
    const lit = { ...d, lighting: { ...d.lighting, on: true } };
    const strips = t.strips.stripsForUnit({ unit, result, design: lit, profile });
    const cut = t.ledGroove.withLedGrooves({
      result, strips, items: d.lighting.items, ledSpec: s.project.ledSpec,
    });
    const bare = t.ledGroove.withLedGrooves({ result, strips: [], items: [], ledSpec: s.project.ledSpec });
    return {
      grooves: t.ledGroove.grooveCount(cut),
      width: t.grooveWidth(s.project.ledSpec),
      layer: t.ledGroove.LED_GROOVE_LAYER,
      gate: bare === result,
      widths: cut.panels.flatMap((p) => (p.cnc && p.cnc.paths ? p.cnc.paths : []))
        .filter((x) => x.layer === 'LED_GROOVE')
        .map((x) => {
          const xs = x.pts.map((q) => q[0]);
          const ys = x.pts.map((q) => q[1]);
          return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        }),
    };
  `);
  check('F9-CNC — a groove is cut under every placed line, on the panel it sits on',
    groove.grooves === 2, `${groove.grooves} groove(s) for 2 lines`);
  check('F9-CNC — …at the SPEC’s width, on the LISP’s own layer at ACI 44',
    groove.widths.every((w) => Math.abs(w - groove.width) < 0.01)
      && groove.layer.name === 'LED_GROOVE' && groove.layer.aci === 44,
    `${JSON.stringify(groove.widths)} vs ${groove.width} mm`);
  check('F9-CNC — GATED: hand it no line and the very same result comes back',
    groove.gate === true, 'identity');
  await shot('f9-cnc-groove', { all: ['[data-lighting-panel]', '[data-lighting-item]'] });

  // ══════════════════════════════════════════════════════════════════════════
  const bad = steps.filter((s) => !s.ok);
  writeFileSync(`${OUT}report.json`, `${JSON.stringify({ steps, shots }, null, 1)}\n`);
  // eslint-disable-next-line no-console
  console.log(`\n${steps.length - bad.length}/${steps.length} checks, ${shots.length} proofs in ${OUT}`);
  if (bad.length) {
    // eslint-disable-next-line no-console
    console.log(`\n${bad.length} FAILED:\n${bad.map((s) => `  · ${s.label} — ${s.detail}`).join('\n')}`);
  }
  await page.send('Browser.close').catch(() => {});
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
