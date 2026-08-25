#!/usr/bin/env node
// ─── Turn 49 acceptance walk — THE WIZARD STOPS ASKING TWICE ────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn49.mjs [--out verify/t49/] [--before]
//
// CLAUDE.md iron rule 5: *"Every screenshot LOOKED AT — and `verify/t49/`
// shows each merged dialog BEFORE and AFTER, so the owner can see for himself
// that nothing went missing."*
//
// So this script has TWO modes and one walk:
//
//   --before   run against a T48 build. It walks to the two dialogs this turn
//              merges and photographs BOTH stops of each — the material dialog
//              and the sheets stop behind it, for the carcasses and again for
//              the fronts. Four frames, and they are the "before".
//   (default)  run against this branch. The same two dialogs are photographed
//              as the ONE screen they have become, and the rest of tonight's
//              named proofs fall out of the walk in the order the owner meets
//              them.
//
// The rules are the house's, unchanged:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it, with the one
//       named exemption every walk since T16 has carried: a native <select>
//       and a native <input type=range> cannot be driven through the protocol).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R4  a claim is proven by asking the APP — `window.__ccT49` publishes
//       tonight's four laws, and the stores answer for the rest.
//   R6  a console error fails the step it happened in.

import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t49/', import.meta.url).pathname);
const BEFORE = args.includes('--before');

// ─── R1'S GUARD, AND ITS ONE NAMED EXEMPTION ────────────────────────────────
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
const IGNORED = [
  /favicon\.ico/i, /supabase\.co/i, /cc_settings_sets/i, /decors\/egger/i, /textures/i, /beforeunload/i,
];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

let page = null;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const log = `${OUT}${BEFORE ? 'walk-before.log' : 'walk.log'}`;
  writeFileSync(log, `T49 ${BEFORE ? 'BEFORE (T48 build)' : 'acceptance'} walk — THE WIZARD STOPS ASKING TWICE\n`);
  page = await launch({ width: 1600, height: 1250 });

  let errorMark = 0;
  const check = (label, ok, detail = '') => {
    const errs = realErrors(page.errors.slice(errorMark));
    errorMark = page.errors.length;
    const clean = errs.length === 0;
    const row = {
      label,
      ok: Boolean(ok) && clean,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      ...(clean ? {} : { console: errs.slice(0, 4) }),
    };
    steps.push(row);
    const line = `${row.ok ? '  ok' : 'FAIL'}  ${label}${row.detail ? ` — ${row.detail}` : ''}`;
    // eslint-disable-next-line no-console
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
    appendFileSync(log, `${line}\n`);
  };

  /** A proof picture, and the assertion that it is not an empty frame (R3). */
  const shot = async (name, subject = null, note = '') => {
    let present = true;
    let detail = 'not asked';
    if (subject) {
      const seen = await page.evaluate(`
        const want = ${JSON.stringify(subject)};
        const out = {};
        if (want.dom) { const el = document.querySelector(want.dom); out.dom = Boolean(el && el.getClientRects().length); }
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
    shots.push({ name: `${name}.png`, note, present, detail });
    appendFileSync(log, `  shot ${name}.png — ${note} ${detail}\n`);
    if (!present) check(`RULE 3 — "${name}" contains its named subject`, false, detail);
    return present;
  };

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

  /** THE NATIVE-CONTROL EXEMPTION (see R1's guard at the top of this file). */
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
  const t49 = (expr) => page.evaluate(`const t = window.__ccT49; return (${expr});`);

  /**
   * ─── F3'S OWN MEASUREMENT: HOW MANY ROWS OF NAVIGATION ARE ON SCREEN ──────
   *
   * A ROW is a footer of buttons. The count is what F3 rules on — *"exactly one
   * row of navigation is visible at any moment"* — and the two BACKS and two
   * NEXTS beside it are the owner's own words for what he saw.
   *
   * The shell's `← Back` beside a title is deliberately counted separately:
   * it is part of a window's HEADER, not a row, and where it appears it goes to
   * the same place its footer's Back does.
   */
  const navRows = () => page.evaluate(`
    const vis = (el) => Boolean(el && el.getClientRects().length);
    // A row is a footer that NAVIGATES — one that carries a step of the walk:
    // Back, Next, Apply, Save, Done, Start designing, Update and save. A footer
    // whose only button is CANCEL is not one: abandoning the whole job is not a
    // step of the walk, it has no twin in the sequence's row, and no hand
    // reaching for "Back" lands on a word that says "Cancel". What F3 rules on
    // is the pair of buttons that DID have twins, and that is what this counts.
    const isNav = (b) => /^(Back|Next|Apply|Save|Done|Start|Update|Remove)/
      .test((b.textContent || '').trim());
    const footers = [...document.querySelectorAll('[data-modal-footer], [data-wizard-nav]')]
      .filter(vis)
      .filter((f) => [...f.querySelectorAll('button')].some(isNav));
    const buttons = [...document.querySelectorAll('button')].filter(vis);
    const words = (rx) => buttons.filter((b) => rx.test((b.textContent || '').trim())).length;
    return {
      rows: footers.length,
      kinds: footers.map((f) => (f.dataset.wizardNav ? 'sequence' : 'modal')),
      backs: words(/^Back$/),
      nexts: words(/^Next/),
      cancels: words(/^Cancel$/),
      headerBacks: [...document.querySelectorAll('[data-modal-back]')].filter(vis).length,
    };
  `);

  const oneRow = async (where) => {
    const n = await navRows();
    check(`F3 — one row of navigation on ${where}`,
      n.rows === 1 && n.backs <= 1 && n.nexts <= 1,
      `${n.rows} nav row(s) [${n.kinds.join('+') || 'none'}], ${n.backs} Back, ${n.nexts} Next`
      + ` (Cancel: ${n.cancels}, header ← Back: ${n.headerBacks})`);
    return n;
  };

  const nextUntil = async (id, limit = 16) => {
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

  // ═══ 0 — a clean app, through the workshop door ═══════════════════════════
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-build-stamp]")');
  await page.evaluate('try { localStorage.clear(); } catch (e) { /* private */ } return true;');
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-build-stamp]")');
  await page.click('button', 'New project');
  await page.waitFor('document.querySelector("[data-modal-name=\\"new-project\\"]")');

  // ═══ 1 — F1 · the scope arrives as ONE WALL ══════════════════════════════
  if (!BEFORE) {
    check('F1 — the app agrees the default scope is One Wall',
      await t49("t.steps.DEFAULT_SCOPE === 'wall'"), 'lib/wizardSteps.js DEFAULT_SCOPE');
    await oneRow('step 1 · Project');
  }
  await page.click('button', 'Next');                    // 1 · info
  await page.sleep(200);
  const scopeAtCreate = await store("s.project.design && s.project.design.scope");
  if (!BEFORE) {
    check('F1 — the project is created as a ONE WALL job, before step 3 is reached',
      scopeAtCreate === 'wall', `design.scope = ${scopeAtCreate}`);
  }
  await page.click('button', 'Kitchen');                 // 2 · type — a ROOM type
  await page.sleep(160);
  await page.click('button', 'Next');
  await page.waitFor('document.querySelector("[data-scope-card]")');
  const lit = await page.evaluate(`
    const wall = document.querySelector('[data-scope-card="wall"]');
    const room = document.querySelector('[data-scope-card="room"]');
    const on = (el) => Boolean(el && el.className.includes('border-gold'));
    return { wall: on(wall), room: on(room), first: wall && wall.dataset.scopeFirst === '1' };
  `);
  if (!BEFORE) {
    check('F1 — One Wall is lit on arrival, even for a KITCHEN (which suggests a room)',
      lit.wall && !lit.room && lit.first, JSON.stringify(lit));
    await shot('f1-scope-one-wall', { dom: '[data-scope-card="wall"]', text: 'One wall' },
      'step 3 · the scope arrives answered — One wall, for a kitchen');
    await oneRow('step 3 · Scope');
  }

  // ═══ 2 — F2 · the room step has no canned shapes ═════════════════════════
  if (!BEFORE) {
    await page.click('[data-scope-card="room"]');
    await page.sleep(200);
    await page.click('button', 'Next — room setup');
    await page.waitFor('document.querySelector("[data-room-plan]")');
    const room = await page.evaluate(`
      return {
        door: (document.querySelector('[data-room-door]') || {}).dataset
          ? document.querySelector('[data-room-door]').dataset.roomDoor : null,
        presets: document.querySelectorAll('[data-room-presets]').length,
        boxButton: document.querySelectorAll('[data-insert-box]').length,
        plan: document.querySelectorAll('[data-room-plan]').length,
      };
    `);
    check('F2 — the wizard’s room step draws NO canned shapes and no + Box',
      room.door === 'wizard' && room.presets === 0 && room.boxButton === 0 && room.plan === 1,
      JSON.stringify(room));
    await shot('f2-room-step-no-canned-boxes',
      { dom: '[data-room-plan]', none: ['[data-room-presets]', '[data-insert-box]'] },
      'the room editor through the WIZARD door — the plan, and no Rectangle / L-shape / + Box');
    await oneRow('the room step');
    // …and back to the scope, to take the wall this time.
    await page.click('button', 'Cancel');
    await page.waitFor('document.querySelector("[data-scope-card]")');
    await page.sleep(160);
  }

  // ═══ 3 — the wall, and F8 ════════════════════════════════════════════════
  await page.click('[data-scope-card="wall"]');
  await page.waitFor('document.querySelector("[data-wall-elevation]")');
  await typeInto('[data-wall-width]', 3600);
  await typeInto('[data-wall-height]', 2400);

  if (!BEFORE) {
    await page.click('[data-elevation-add="slope"]');
    await page.sleep(260);
    const slopeBox = await page.evaluate(`
      const el = document.querySelector('[data-elevation-kind="slope"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.right - r.width * 0.18, y: r.top + r.height * 0.18 };
    `);
    await page.dblclick(slopeBox.x, slopeBox.y);
    await page.waitFor('document.querySelector("[data-element-modal=\\"slope\\"]")');

    // F3, the stack's half: the elevation's own footer is NOT under this one.
    const stacked = await page.evaluate(`
      const vis = (el) => Boolean(el && el.getClientRects().length);
      return [...document.querySelectorAll('[data-modal-footer]')].filter(vis).length;
    `);
    check('F3 — the wall dialog’s footer is hidden while its element window is open',
      stacked === 1, `${stacked} modal footer(s) on screen — the element window’s, and nothing under it`);
    check('F3 — and the shell says so, on the window underneath',
      await page.evaluate(`
        const el = document.querySelector('[data-modal-name="wall-elevation"]');
        return el ? el.dataset.modalCovered : null;
      `) === '1', 'data-modal-covered');

    // F8, one slope: Flat is asked, and it is the wall minus the run.
    const flatShown = await page.evaluate(`
      const f = document.querySelector('[data-slope-flat]');
      return f ? Number(f.value) : null;
    `);
    const run0 = await store('s.project.wallSlopes[0].run');
    check('F8 — the dialog asks for FLAT, and it is wall − run',
      flatShown != null && Math.abs(flatShown + run0 - 3600) < 0.01,
      `flat ${flatShown} + run ${run0} = ${flatShown + run0} (wall 3600)`);
    await shot('f8-flat-one-slope',
      { all: ['[data-slope-flat]', '[data-slope-run]'], text: 'Flat' },
      'ONE slope — Flat and Run together, and they add up to the wall');

    // …typed the other way: FLAT in, RUN follows.
    await typeInto('[data-slope-flat]', 2400);
    const run1 = await store('s.project.wallSlopes[0].run');
    check('F8 — typing FLAT writes the RUN, and the sum is still the wall',
      Math.abs(run1 - 1200) < 0.01, `flat 2400 → run ${run1}`);
    check('F8 — and the app’s own arithmetic agrees',
      await t49('t.slopeFlat.runFromFlat(2400, 3600) === 1200 && t.slopeFlat.flatFromRun(1200, 3600) === 2400'),
      'lib/slopeFlat.js');
    await shot('f8-flat-typed-run-follows',
      { all: ['[data-slope-flat]', '[data-slope-run]'] },
      'Flat typed as 2400 on a 3600 wall — the Run field followed to 1200');

    // …and a SECOND slope: Flat steps aside.
    await page.click('[data-element-done="1"]');
    await page.sleep(200);
    await page.click('[data-elevation-add="slope"]');
    await page.sleep(280);
    const second = await page.evaluate(`
      const els = [...document.querySelectorAll('[data-elevation-kind="slope"]')];
      const el = els[els.length - 1];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.right - r.width * 0.18, y: r.top + r.height * 0.18, n: els.length };
    `);
    await page.dblclick(second.x, second.y);
    await page.waitFor('document.querySelector("[data-element-modal=\\"slope\\"]")');
    // Both slopes start on the RIGHT, so they land on top of each other and the
    // drawing shows one triangle. The owner's case is a fall at BOTH ends —
    // that is the whole reason there is no single flat stretch left — so this
    // one goes to the LEFT, and the picture then shows what the note is about.
    await page.click('[data-slope-side="L"]');
    await page.sleep(260);
    const twoSlopes = await page.evaluate(`
      return {
        flat: document.querySelectorAll('[data-slope-flat]').length,
        run: document.querySelectorAll('[data-slope-run]').length,
        note: (document.querySelector('[data-slope-note]') || {}).dataset
          ? document.querySelector('[data-slope-note]').dataset.slopeNote : null,
      };
    `);
    check('F8 — with TWO slopes the Flat field steps aside, and each is entered by its own run',
      twoSlopes.flat === 0 && twoSlopes.run === 1 && twoSlopes.note === 'two-slopes',
      JSON.stringify({ ...twoSlopes, onWall: second.n }));
    const sides = await store('s.project.wallSlopes.filter((e) => e.kind === "slope").map((e) => e.side).sort().join("")');
    check('F8 — and the wall really carries one fall at each end', sides === 'LR', `sides: ${sides}`);
    await shot('f8-two-slopes-flat-steps-aside',
      { dom: '[data-slope-note="two-slopes"]', none: ['[data-slope-flat]'], text: 'own run' },
      'TWO slopes, one at each end — no Flat field, and the one short line that says why');
    await page.click('[data-element-done="1"]');
    await page.sleep(200);
    await oneRow('the wall step');
  }

  // ═══ 4 — into the settings sequence ══════════════════════════════════════
  await page.click('[data-elevation-save="1"]');
  await page.waitFor('document.querySelector("[data-wizard-settings]")');
  await page.sleep(240);
  if (!BEFORE) await oneRow('step 5 · Project settings (5.1)');

  if (!BEFORE) {
    // ─── F7's OTHER HALF, PROVED WHERE IT MATTERS ──────────────────────────
    // *"A NEW project keeps its chain — the steps carry each other and skipping
    // one would leave a hole."* Standing on 5.1 of a job that has just been
    // created, every tab AHEAD is not yet a place you can be. The EDIT door's
    // own answer is measured further down this walk, on the same attribute.
    const chain = await page.evaluate(`
      const strip = document.querySelector('[data-wizard-tabs]');
      return {
        jumpable: strip ? strip.dataset.wizardJumpable : null,
        tabs: [...document.querySelectorAll('[data-wizard-tab]')].map((b) => ({
          n: b.dataset.tabNumber, jump: b.dataset.tabJump, disabled: b.disabled,
        })),
      };
    `);
    const ahead = chain.tabs.filter((t) => t.n !== '5.1');
    check('F7 — a NEW project keeps its chain: every tab ahead of the walk is shut',
      chain.jumpable === '0' && ahead.length >= 4 && ahead.every((t) => t.jump === '0' && t.disabled),
      `${chain.tabs.map((t) => `${t.n}${t.jump === '1' ? '✓' : '✗'}`).join(' ')}`);
    await shot('f7-new-project-keeps-its-chain',
      { dom: '[data-wizard-tabs]', text: '5.1 Settings' },
      'a NEW project on 5.1 — the tabs ahead are not yet places you can be');
  }

  await nextUntil('carcases');
  await page.waitFor('document.querySelector("[data-carcass-container]")');
  await page.sleep(200);

  // ── the CARCASSES: count → the material dialog(s) ──
  await shot(BEFORE ? 'before-carc-1-count' : 'after-carc-1-count',
    { dom: '[data-carcass-dots]', text: 'How many carcass material types?' },
    'carcasses · stop 1 — how many types');
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-carcass-submodal]")');
  await page.sleep(260);
  await pickFirstOption('[data-stock-board^="carcass:"]');

  const carcDialog = await page.evaluate(`
    const box = document.querySelector('[data-carcass-submodal]');
    return {
      board: box ? box.querySelectorAll('[data-stock-board]').length : 0,
      sheet: box ? box.querySelectorAll('[data-sheet-family="carcasses"]').length : 0,
      options: box ? [...box.querySelectorAll('[data-sheet-option]')].map((b) => b.textContent.trim()) : [],
      stops: [...document.querySelectorAll('[data-carcass-dot]')].map((b) => b.dataset.carcassDot),
    };
  `);
  if (BEFORE) {
    check('BEFORE — the carcass material dialog has the board and NO sheet size',
      carcDialog.board === 1 && carcDialog.sheet === 0, JSON.stringify(carcDialog));
    await shot('before-carc-2-material-dialog',
      { dom: '[data-carcass-submodal]', all: ['[data-stock-board]'] },
      'carcasses · DIALOG 2 (T48) — the board, and no sheet size');
    await page.click('[data-tab-next]');
    await page.waitFor('document.querySelector("[data-sheets-assignment]")');
    await page.sleep(240);
    await shot('before-carc-3-sheets-stop',
      { dom: '[data-sheets-assignment]', all: ['[data-sheet-family="carcasses"]'], text: 'Sheets assignment' },
      'carcasses · DIALOG 3 (T48) — the board AGAIN, and the sheet size');
  } else {
    check('F4 — the carcass dialog carries the board AND the sheet size, in one screen',
      carcDialog.board === 1 && carcDialog.sheet === 1, JSON.stringify(carcDialog));
    check('F4 — and the SIZE control keeps every option, jumbo included',
      carcDialog.options.some((t) => /Jumbo/i.test(t)) && carcDialog.options.length >= 4,
      carcDialog.options.join(' | '));
    check('F4 — the second stop is gone: count → one per type → the CNC corner',
      carcDialog.stops.join(',') === 'count,c1,summary', carcDialog.stops.join(','));
    await shot('after-carc-2-merged-dialog',
      { dom: '[data-carcass-submodal]', all: ['[data-stock-board]', '[data-sheet-family="carcasses"]'], text: 'Jumbo' },
      'carcasses · THE MERGED DIALOG — the board and the sheet size (jumbo among them) in one place');
    await oneRow('5.2 Carcases · the material dialog');
  }

  // ── the CNC corner, untouched, and the save ──
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-cnc-corner]")');
  await page.sleep(220);
  if (!BEFORE) {
    await shot('f4-carc-3-cnc-corner-untouched',
      { dom: '[data-cnc-corner]', all: ['[data-cnc-corner-option="dogbone"]'] },
      'the dialog AFTER it — dog bones and the CNC corner, untouched');
  }
  await page.click('[data-save-carcasses="1"]');
  await page.sleep(220);
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-fronts-container]")');
  await page.sleep(240);

  // ── the FRONTS: F5's counting step, then the colour dialog(s) ──
  const frontCount = await page.evaluate(`
    const box = document.querySelector('[data-wizard-node="fronts.count"]');
    return {
      heading: box ? (box.querySelector('[data-fronts-heading]') || {}).textContent : null,
      sources: box ? box.querySelectorAll('[data-front-source]').length : 0,
      styles: box ? box.querySelectorAll('[data-style-slot]').length : 0,
      counts: box ? box.querySelectorAll('[data-front-count]').length : 0,
    };
  `);
  if (!BEFORE) {
    check('F5 — the first fronts step asks for TYPES AND COLOURS, and asks it big',
      /How many types and colours\?/.test(String(frontCount.heading)), String(frontCount.heading));
    check('F5 — the NUMBER and the TYPE are on it; no colour picker, no laminate list',
      frontCount.counts === 3 && frontCount.styles >= 1 && frontCount.sources === 0,
      JSON.stringify(frontCount));
    await shot('f5-fronts-types-first',
      { dom: '[data-wizard-node="fronts.count"]', text: 'How many types and colours?', none: ['[data-front-source]'] },
      'fronts · stop 1 — the number and the type, and nothing about colour');
  }
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-front-submodal]")');
  await page.sleep(260);
  await pickFirstOption('[data-stock-board^="front:"]');

  const frontDialog = await page.evaluate(`
    const box = document.querySelector('[data-front-submodal]');
    return {
      board: box ? box.querySelectorAll('[data-stock-board]').length : 0,
      sheet: box ? box.querySelectorAll('[data-sheet-family="fronts"]').length : 0,
      options: box ? [...box.querySelectorAll('[data-sheet-option]')].map((b) => b.textContent.trim()) : [],
      strip: box ? box.querySelectorAll('[data-front-source]').length : 0,
      stops: [...document.querySelectorAll('[data-front-dot]')].map((b) => b.dataset.frontDot),
    };
  `);
  if (BEFORE) {
    check('BEFORE — the front colour dialog has the board and NO sheet size',
      frontDialog.board === 1 && frontDialog.sheet === 0, JSON.stringify(frontDialog));
    await shot('before-front-2-colour-dialog',
      { dom: '[data-front-submodal]', all: ['[data-stock-board]'] },
      'fronts · DIALOG 2 (T48) — the colour and the board, and no sheet size');
    await page.click('[data-tab-next]');
    await page.waitFor('document.querySelector("[data-front-sheets-assignment]")');
    await page.sleep(240);
    await shot('before-front-3-sheets-stop',
      { dom: '[data-front-sheets-assignment]', all: ['[data-sheet-family="fronts"]'], text: 'Sheets assignment' },
      'fronts · DIALOG 3 (T48) — the board AGAIN, and the sheet size');
  } else {
    check('F6 — the front dialog carries the colour, the board AND the sheet size',
      frontDialog.board === 1 && frontDialog.sheet === 1 && frontDialog.strip === 3,
      JSON.stringify(frontDialog));
    check('F6 — with every sheet option, jumbo included',
      frontDialog.options.some((t) => /Jumbo/i.test(t)), frontDialog.options.join(' | '));
    check('F6 — the third stop is gone: count → one per colour → the tail',
      frontDialog.stops.join(',') === 'count,f1,tail', frontDialog.stops.join(','));
    check('F5 — and the source strip is HERE, full width, where the colour is chosen',
      frontDialog.strip === 3, `${frontDialog.strip} category buttons in the dialog`);
    await shot('after-front-2-merged-dialog',
      { dom: '[data-front-submodal]', all: ['[data-sheet-family="fronts"]', '[data-source-seg]'], text: 'Jumbo' },
      'fronts · THE MERGED DIALOG — the category strip, the colour, the board and the sheet size');
    await oneRow('5.3 Fronts · the colour dialog');
  }

  if (BEFORE) {
    writeFileSync(`${OUT}report-before.json`, `${JSON.stringify({ steps, shots }, null, 1)}\n`);
    return;
  }

  // ── the tail, F9's sheen, and the fronts' save ──
  await page.click('[data-tab-next]');
  await page.waitFor('document.querySelector("[data-front-shine]")');
  await page.sleep(240);
  const sheen = await page.evaluate(`
    const t = window.__ccT49;
    const P = window.__cc.profile.getState().profile;
    const spray = { id: 'spray:x', kind: 'spray', hex: '#F2F0EC' };
    const veneer = t.finishById(P, t.veneers.veneerFinishId(t.veneers.getVeneers()[0]));
    const laminate = t.finishById(P, 'dark_walnut');
    const r = (finish, sheenValue) => t.surface.surfaceFor({
      role: 'front', materialRole: 'front', finishes: { carcass: finish, front: finish },
      finish, profile: P, sheen: sheenValue,
    }).roughness;
    return {
      spray: [r(spray, 5), r(spray, 100)],
      veneer: [r(veneer, 5), r(veneer, 100)],
      laminate: [r(laminate, 5), r(laminate, 100)],
    };
  `);
  check('F9 — SPRAY moves with the slider', sheen.spray[0] !== sheen.spray[1], JSON.stringify(sheen.spray));
  check('F9 — VENEER moves too', sheen.veneer[0] !== sheen.veneer[1], JSON.stringify(sheen.veneer));
  check('F9 — and LAMINATE does not', sheen.laminate[0] === sheen.laminate[1], JSON.stringify(sheen.laminate));
  await shot('f9-sheen-says-what-it-does',
    { dom: '[data-sheen-scope]', text: 'Sprayed and veneered surfaces' },
    'the slider, saying what it drives — and that a laminate keeps its own finish');

  await page.click('[data-save-fronts="1"]');
  await page.sleep(220);

  // ═══ 5 — F3 · the one row all the way to the summary ═════════════════════
  const walked = [];
  for (let i = 0; i < 8; i += 1) {
    const n = await navRows();
    const at = await page.evaluate("const b = document.querySelector('[data-wizard-tab-body]'); return b ? b.dataset.wizardTabBody : null;");
    walked.push(`${at}:${n.rows}/${n.backs}B/${n.nexts}N`);
    if (n.rows !== 1 || n.backs > 1 || n.nexts > 1) break;
    const can = await page.evaluate("const b = document.querySelector('[data-tab-next]'); return Boolean(b) && !b.disabled;");
    if (!can) break;
    await page.click('[data-tab-next]');
    await page.sleep(260);
    if (await page.evaluate("return Boolean(document.querySelector('[data-start-designing]'));")) break;
  }
  check('F3 — one row, one Back, one Next, on every tab of step 5', walked.every((w) => /:1\/[01]B\/[01]N$/.test(w)), walked.join('  '));
  await shot('f3-one-row-at-the-summary',
    { dom: '[data-start-designing]', count: ['[data-wizard-nav]', 0] },
    'step 6 · the summary — the wizard’s own footer, and nothing under it');
  await oneRow('step 6 · Summary');

  // ═══ 6 — into the app, and F7's EDIT door ════════════════════════════════
  await page.click('[data-start-designing="1"]');
  await page.waitFor(`${P}.ui.getState().screen !== 'start'`, { what: 'the editor' });
  await page.sleep(500);

  await page.click('nav button', 'Settings');
  await page.sleep(240);
  await page.click('[role="menuitem"], button', 'Settings…');
  await page.waitFor('document.querySelector("[data-modal-name=\\"design\\"]")');
  await page.sleep(300);

  const jumpable = await page.evaluate(`
    return [...document.querySelectorAll('[data-wizard-tab]')].map((b) => ({
      id: b.dataset.wizardTab, n: b.dataset.tabNumber, jump: b.dataset.tabJump, disabled: b.disabled,
    }));
  `);
  check('F7 — through the EDIT door every tab is a place you can be',
    jumpable.length >= 4 && jumpable.every((t) => t.jump === '1' && !t.disabled),
    jumpable.map((t) => `${t.n}${t.jump === '1' ? '✓' : '✗'}`).join(' '));
  await shot('f7-edit-door-every-tab-live',
    { dom: '[data-wizard-tabs]', all: ['[data-update-and-save]'] },
    'the EDIT door — 5.1 … 5.6 all live, and Update and save in the footer');

  // 5.1 → 5.4, in ONE move.
  await page.click('[data-wizard-tab="hardware"]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"hardware\\"]")');
  await page.sleep(240);
  const at54 = await page.evaluate("const b = document.querySelector('[data-wizard-tab-body]'); return b ? b.dataset.wizardTabBody : null;");
  check('F7 — 5.1 → 5.4 in one move', at54 === 'hardware', `landed on ${at54}`);
  await shot('f7-jumped-5-1-to-5-4',
    { dom: '[data-wizard-tab-body="hardware"]', all: ['[data-update-and-save]'] },
    '5.4 Hardware, reached in one click from 5.1 — and the commit button is right there');

  // …and back the other way, which is what "in any order, back and forth" means.
  await page.click('[data-wizard-tab="settings"]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"settings\\"]")');
  await page.sleep(200);
  await page.click('[data-wizard-tab="lighting"]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"lighting\\"]")');
  await page.sleep(200);
  const backAndForth = await page.evaluate("const b = document.querySelector('[data-wizard-tab-body]'); return b ? b.dataset.wizardTabBody : null;");
  check('F7 — back and forth, in any order', backAndForth === 'lighting', `5.4 → 5.1 → 5.6, landed on ${backAndForth}`);

  // …and Update and save COMMITS from where the user stands. A real EDIT
  // first, typed on 5.1, so `dirty` has somewhere to fall from: a save asserted
  // on a project that was already clean asserts nothing.
  await page.click('[data-wizard-tab="settings"]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"settings\\"]")');
  await page.sleep(220);
  await typeInto('[data-dimension="toeKick"]', 120);
  const plinth = await store('s.project.design && s.project.design.heights && s.project.design.heights.toeKick');
  check('F7 — an edit made on 5.1 reaches the project', Number(plinth) === 120, `toeKick = ${plinth}`);
  // …and then jump straight to 5.6 and commit from THERE, without walking back.
  await page.click('[data-wizard-tab="lighting"]');
  await page.waitFor('document.querySelector("[data-wizard-tab-body=\\"lighting\\"]")');
  await page.sleep(200);
  const dirtyBefore = await store('s.dirty');
  check('F7 — the edit left the project dirty', dirtyBefore === true, `dirty = ${dirtyBefore}`);
  const canSave = await page.evaluate("const b = document.querySelector('[data-update-and-save]'); return Boolean(b) && !b.disabled;");
  check('F7 — a finished setup may commit', canSave, `Update and save enabled: ${canSave}`);
  await page.click('[data-update-and-save="1"]');
  await page.sleep(900);
  const savedState = await page.evaluate(`
    const s = ${P}.project.getState();
    const u = ${P}.ui.getState();
    return { dirty: s.dirty, savedAt: Boolean(s.project.updated_at || s.project.id), modal: u.modal };
  `);
  check('F7 — Update and save commits from 5.6 and closes, without walking the chain',
    dirtyBefore === true && savedState.dirty === false && savedState.modal !== 'design',
    `dirty ${dirtyBefore} → ${savedState.dirty}, modal ${savedState.modal}`);
  const kept = await store('s.project.design && s.project.design.heights && s.project.design.heights.toeKick');
  check('F7 — and the change it committed is the one that was typed on 5.1',
    Number(kept) === 120, `toeKick = ${kept}`);
  await shot('f7-updated-and-saved',
    { text: 'Project saved' },
    'after Update and save — the project is on the shelf and the window has gone');

  writeFileSync(`${OUT}report.json`, `${JSON.stringify({ steps, shots }, null, 1)}\n`);
  const failed = steps.filter((s) => !s.ok);
  appendFileSync(log, `\n${steps.length - failed.length}/${steps.length} checks passed\n`);
  // eslint-disable-next-line no-console
  console.log(`\n${steps.length - failed.length}/${steps.length} checks passed, ${shots.length} shots`);
}

main()
  .then(async () => { if (page) await page.send('Browser.close').catch(() => {}); })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    if (page) {
      await page.screenshot(`${OUT}CRASH.png`).catch(() => {});
      await page.send('Browser.close').catch(() => {});
    }
    process.exitCode = 1;
  });
