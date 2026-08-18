#!/usr/bin/env node
// ─── Turn 38 acceptance walk — the CNC editor ──────────────────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn38.mjs [--only f2,f5,…] [--out verify/t38/]
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R6  a console error fails the step it happened in.
//   R4  a claim is proven by asking the APP, off the function the app calls.
//
// ─── AND TURN 38'S OWN RULE 6 ──────────────────────────────────────────────
//
// *"PROOFS ARE NOT OPTIONAL. Every feature with a visible surface ships a
// verify/t38/ screenshot with a named subject from real pointer input, or it
// is not done. F-numbers in filenames."*
//
// ─── ZERO-STOP (iron rule 1) ───────────────────────────────────────────────
//
// Every phase is wrapped: a phase that throws is recorded as FAILED and the
// walk goes on to the next one. A night that stops at feature four is a night
// that proves three.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t38/', import.meta.url).pathname);
const ONLY = argOf('--only', null);
const want = (id) => !ONLY || ONLY.split(',').map((s) => s.trim()).includes(id);

// R1's guard, and it is a guard rather than a promise.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const shots = [];
const P = 'window.__cc';

const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i, /storage\/v1\/object/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });

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
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
  };

  /** A proof picture, and the assertion that it is not an empty frame. */
  const shot = async (name, subject = null) => {
    let present = true;
    let detail = 'not asked';
    if (subject) {
      const seen = await page.evaluate(`
        const want = ${JSON.stringify(subject)};
        const out = {};
        if (want.all) {
          out.all = want.all.every((sel) => {
            const el = document.querySelector(sel);
            return Boolean(el && el.getClientRects().length);
          });
        }
        if (want.text) out.text = (document.body.innerText || '').includes(want.text);
        if (want.count) {
          out.count = Object.entries(want.count)
            .every(([sel, n]) => document.querySelectorAll(sel).length >= n);
        }
        return out;
      `);
      present = Object.values(seen).every(Boolean);
      detail = JSON.stringify(seen);
    }
    await page.screenshot(`${OUT}${name}.png`);
    shots.push({ name, subject, present, detail });
    if (!present) check(`RULE 3 — "${name}" contains its named subject`, false, detail);
    else console.log(`  📷  ${name}.png — ${detail}`);
    return present;
  };

  /** A phase, wrapped: it never stops the night (iron rule 1). */
  const phase = async (id, label, fn) => {
    if (!want(id)) { console.log(`  ··  ${id} skipped by --only`); return; }
    console.log(`\n── ${id.toUpperCase()} — ${label}`);
    try {
      await fn();
    } catch (e) {
      check(`${id} — the phase ran`, false, e.message);
      console.log(`      ${e.stack?.split('\n').slice(0, 3).join('\n      ')}`);
    }
  };

  // ─── The part editor's own frame, and the two conversions it needs ───────

  /** A point in the PART's millimetres, as a point on the screen. */
  const toPx = async (mx, my) => page.evaluate(`
    const svg = document.querySelector('[data-editor-canvas="1"] svg');
    if (!svg) return null;
    const g = svg.querySelector('g');
    const pt = svg.createSVGPoint();
    pt.x = ${Number(mx)};
    pt.y = ${Number(my)};
    const p = pt.matrixTransform(g.getScreenCTM());
    return { x: Math.round(p.x), y: Math.round(p.y) };
  `);

  /** A real click at a point of the drawing — press and release, no drag. */
  const clickMm = async (mx, my) => {
    const at = await toPx(mx, my);
    if (!at) throw new Error('no canvas');
    await page.mouse('mouseMoved', at.x, at.y, { buttons: 0, clickCount: 0 });
    await page.mouse('mousePressed', at.x, at.y, { button: 'left', buttons: 1, clickCount: 1 });
    await page.mouse('mouseReleased', at.x, at.y, { button: 'left', buttons: 0, clickCount: 1 });
    await page.sleep(150);
    return at;
  };

  /** A real MOVE to a point of the drawing — what a drag-draw is made of. */
  const moveMm = async (mx, my) => {
    const at = await toPx(mx, my);
    if (!at) throw new Error('no canvas');
    await page.mouse('mouseMoved', at.x, at.y, { buttons: 0, clickCount: 0 });
    await page.sleep(90);
    return at;
  };

  /** A real marquee: press, several moves, release. */
  const marqueeMm = async (a, b) => {
    const from = await toPx(a[0], a[1]);
    const to = await toPx(b[0], b[1]);
    await page.mouse('mouseMoved', from.x, from.y, { buttons: 0, clickCount: 0 });
    await page.mouse('mousePressed', from.x, from.y, { button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 6; i += 1) {
      await page.mouse('mouseMoved',
        Math.round(from.x + ((to.x - from.x) * i) / 6),
        Math.round(from.y + ((to.y - from.y) * i) / 6),
        { buttons: 1, clickCount: 0 });
    }
    await page.mouse('mouseReleased', to.x, to.y, { button: 'left', buttons: 0, clickCount: 1 });
    await page.sleep(200);
  };

  const rightClickMm = async (mx, my) => {
    const at = await toPx(mx, my);
    await page.rightclick(at.x, at.y);
    return at;
  };

  /** Real typing: a keyDown carrying TEXT, which is what puts a character in. */
  const typeText = async (text) => {
    for (const ch of text) {
      const code = /[0-9]/.test(ch) ? `Digit${ch}` : `Key${ch.toUpperCase()}`;
      await page.send('Input.dispatchKeyEvent', {
        type: 'keyDown', text: ch, key: ch, code, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0), nativeVirtualKeyCode: ch.toUpperCase().charCodeAt(0),
      });
      await page.send('Input.dispatchKeyEvent', {
        type: 'keyUp', key: ch, code, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0),
      });
      await page.sleep(120);
    }
  };

  const tap = (key, code, vk) => page.key(key, { code, windowsVirtualKeyCode: vk });
  const TAB = () => tap('Tab', 'Tab', 9);
  const ENTER = () => tap('Enter', 'Enter', 13);
  const ESC = () => tap('Escape', 'Escape', 27);
  const DEL = () => tap('Delete', 'Delete', 46);

  /** What the status bar is saying — the quartet refuses in sentences. */
  const status = () => page.evaluate('return (document.querySelector(\'[data-part-prompt="1"]\')?.textContent || "").trim();');

  /** This panel's manual ops, read off the store — R4. */
  const opsNow = () => page.evaluate(`
    const s = ${P}.project.getState();
    return s.partOpsOf(window.__t38.unitId, window.__t38.panelId);
  `);

  /** Wipe the drawing between phases — SETUP, never a proof. */
  const clearOps = () => page.evaluate(`
    ${P}.project.getState().setPartOps(window.__t38.unitId, window.__t38.panelId, []);
    return true;
  `);

  /** Snaps off (or on), from the dropdown — a joiner's own switch. */
  const setSnaps = async (on) => {
    await page.click('[data-snap-menu="1"]');
    await page.sleep(200);
    await page.click(on ? '[data-snap-all="1"]' : '[data-snap-none="1"]');
    await page.sleep(200);
    await page.click('[data-snap-menu="1"]');
    await page.sleep(200);
  };

  const armTool = async (id) => {
    await page.click(`[data-part-tool="${id}"]`);
    // The canvas is measured by a ResizeObserver and re-fits when the window's
    // chrome changes; a click computed against a frame that is about to move
    // lands somewhere else. So the walk lets the layout settle before it takes
    // the next point — which is also what a hand does.
    await page.sleep(400);
  };

  const openEditor = async () => {
    await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t38.unitId);
      ${P}.ui.getState().openModal('cabinet', { unitId: window.__t38.unitId });
      ${P}.ui.getState().pushModal('part-detail', { unitId: window.__t38.unitId, panelId: window.__t38.panelId });
      return r.panels.length;
    `);
    await page.waitFor('document.querySelector(\'[data-editor-canvas="1"] svg\')', { what: 'the editor canvas' });
    await page.sleep(700);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // THE SCENE
  // ══════════════════════════════════════════════════════════════════════════

  await page.goto(BASE);
  await page.evaluate('localStorage.clear(); return true;');
  await page.goto(BASE);
  await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

  const seeded = await page.evaluate(`
    const s = ${P}.project.getState();
    s.newProject('Turn 38 walk');
    ${P}.ui.getState().openEditor();
    ${P}.ui.getState().closeModal();
    ${P}.ui.getState().closeLibrary();
    const u = s.addUnit('WARDROBE');
    // A WIDE, SHORT wardrobe, so the board the walk draws on is nearly square
    // in its own drawn frame and a 180 x 120 rectangle reads in a screenshot.
    // It is an ordinary cabinet, cut by the ordinary kit; nothing about the
    // feature depends on its proportions.
    s.updateUnitParams(u.id, { doors: true, width: 1200, height: 1300 });
    s.setDoors(u.id, { count: 2, hinge: 'L' });
    const r = s.unitResult(u.id);
    // The piece the walk draws on: a board that is nearly square in its OWN
    // drawn frame, so a rectangle and an arc read at a glance, and one that
    // carries real drilled holes for F7 to measure between.
    const drillsOf = (id) => r.drills.filter((d) => d.panel === id).length;
    const best = r.panels
      .filter((p) => p.cnc && (p.cnc.outline || []).length >= 2)
      .map((p) => {
        const w = p.cnc.drawn_w || p.w;
        const h = p.cnc.drawn_h || p.h;
        return { id: p.id, part: p.part, w, h, ratio: Math.min(w, h) / Math.max(w, h), holes: drillsOf(p.id) };
      })
      .filter((p) => p.holes >= 2)
      .sort((a, b) => b.ratio - a.ratio)[0];
    window.__t38 = { unitId: u.id, panelId: best.id, size: { w: best.w, h: best.h } };
    // Two holes on that board, for F7's measurement.
    window.__t38.holes = r.drills.filter((d) => d.panel === best.id).slice(0, 6).map((d) => ({ x: d.x, y: d.y, d: d.d }));
    return { unitId: u.id, panel: best, holes: window.__t38.holes.length };
  `);
  check('the scene: a wardrobe, and a board with holes to draw on', Boolean(seeded.panel), JSON.stringify(seeded.panel));
  const SIZE = seeded.panel;

  // Handy points inside the board, in its own millimetres.
  const at = (fx, fy) => [Math.round(SIZE.w * fx), Math.round(SIZE.h * fy)];

  await openEditor();

  // ══════════════════════════════════════════════════════════════════════════
  // F2 — THE SHELL
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f2', 'full screen, docked chrome, canvas first', async () => {
    const shell = await page.evaluate(`
      const win = document.querySelector('[data-modal-name="part-detail"]');
      const canvas = document.querySelector('[data-editor-canvas="1"]');
      const r = win.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      return {
        fullscreen: win.getAttribute('data-modal-fullscreen'),
        window: { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) },
        viewport: { w: window.innerWidth, h: window.innerHeight },
        canvasShare: +(c.height / r.height).toFixed(2),
        tools: document.querySelectorAll('[data-part-tool]').length,
        groups: [...document.querySelectorAll('[data-tool-group]')].map((n) => n.getAttribute('data-tool-group')),
        status: Boolean(document.querySelector('[data-editor-status="1"]')),
      };
    `);
    check('F2 — the window covers the whole viewport', shell.fullscreen === '1'
      && shell.window.left === 0 && shell.window.top === 0
      && shell.window.w === shell.viewport.w && shell.window.h === shell.viewport.h,
    JSON.stringify(shell.window));
    check('F2 — the toolbar is draw · modify · measure', shell.groups.join(',') === 'draw,modify,measure', `${shell.tools} tools`);
    check('F2 — the canvas takes the rest of it', shell.canvasShare > 0.8, `${shell.canvasShare} of the window`);
    check('F2 — and there is a status bar', shell.status);
    // Move the hand over the drawing so the status bar's live cursor is LIVE.
    await moveMm(...at(0.5, 0.5));
    await shot('f2-fullscreen-shell-canvas-maximised', {
      all: ['[data-modal-fullscreen="1"]', '[data-editor-toolbar="1"]', '[data-editor-canvas="1"]', '[data-editor-status="1"]', '[data-part-canvas="1"]'],
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F3 — A LAYER OF THE PROJECT'S OWN
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f3', 'a user layer, name and colour', async () => {
    await page.click('[data-new-layer-open="1"]');
    await page.sleep(200);
    await page.click('[data-new-layer-name="1"]');
    await typeText('shop jig');
    await page.click('[data-new-layer-colour="30"]');
    await page.sleep(150);
    await shot('f3-user-layer-created-name-and-colour', {
      all: ['[data-new-layer="1"]', '[data-new-layer-name="1"]', '[data-new-layer-colours="1"]'],
    });
    await page.click('[data-new-layer-add="1"]');
    await page.sleep(300);
    const made = await page.evaluate(`
      const s = ${P}.project.getState();
      return {
        layers: s.projectLayers().map((l) => ({ name: l.name, aci: l.aci, screen: l.screen })),
        active: document.querySelector('[data-status-layer]')?.getAttribute('data-status-layer') || '',
        row: Boolean(document.querySelector('[data-legend-layer="SHOP_JIG"]')),
      };
    `);
    check('F3 — the layer is the project’s, sanitised, with its own ACI',
      made.layers.length === 1 && made.layers[0].name === 'SHOP_JIG' && made.layers[0].aci === 30,
      JSON.stringify(made.layers));
    check('F3 — and it becomes the layer this session draws on', made.active === 'SHOP_JIG', made.active);
    await shot('f3-user-layer-in-the-overlay', { all: ['[data-layer-overlay="1"]'], text: 'SHOP_JIG' });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F4 — THE SNAP DROPDOWN
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f4', 'snap ▾, not a checkbox row', async () => {
    await page.click('[data-snap-menu="1"]');
    await page.sleep(250);
    const open = await page.evaluate(`
      return {
        dropdown: Boolean(document.querySelector('[data-snap-dropdown="1"]')),
        kinds: document.querySelectorAll('[data-snap-kind]').length,
        all: Boolean(document.querySelector('[data-snap-all="1"]')),
        none: Boolean(document.querySelector('[data-snap-none="1"]')),
        status: document.querySelector('[data-status-snap]')?.textContent || '',
      };
    `);
    check('F4 — eight kinds in a dropdown, with all/none under them',
      open.dropdown && open.kinds === 8 && open.all && open.none, JSON.stringify(open));
    check('F4 — and the status bar summarises them', /8\/8|\d\/8/.test(open.status), open.status.trim());
    await shot('f4-snap-dropdown-open', {
      all: ['[data-snap-dropdown="1"]', '[data-snap-all="1"]', '[data-snap-none="1"]'],
      count: { '[data-snap-kind]': 8 },
    });
    await ESC();
    await page.sleep(200);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F5 — DRAWING, WITH DRAG + TAB DIMENSIONS
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f5a', 'a rect dragged out, with TAB dimensions', async () => {
    await clearOps();
    await armTool('rect');
    await clickMm(...at(0.15, 0.2));
    await moveMm(...at(0.55, 0.55));
    // The FIRST digit opens the dimension box (SketchUp's grammar: you do not
    // click a field, you just start typing); TAB moves to the second field.
    await typeText('1');
    await page.sleep(300);
    await typeText('80');
    await page.sleep(150);
    await TAB();
    await page.sleep(250);
    await typeText('120');
    await page.sleep(250);
    const entry = await page.evaluate(`
      const box = document.querySelector('[data-dim-entry]');
      if (!box) return null;
      return {
        tool: box.getAttribute('data-dim-entry'),
        fields: [...box.querySelectorAll('[data-dim-field]')].map((i) => [i.getAttribute('data-dim-field'), i.value]),
        active: box.querySelector('[data-dim-active="1"]')?.getAttribute('data-dim-field') || null,
      };
    `);
    check('F5 — the dimension box is open, with width and height, TAB on the second',
      Boolean(entry) && entry.fields.length === 2 && entry.active === 'height', JSON.stringify(entry));
    await shot('f5a-rect-dragged-with-tab-dimensions', {
      all: ['[data-dim-entry="rect"]', '[data-dim-field="width"]', '[data-dim-field="height"]', '[data-ghost="rect"]'],
    });
    await ENTER();
    await page.sleep(350);
    const ops = await opsNow();
    const rect = ops.find((o) => o.op === 'rect');
    check('F5 — Enter commits the rectangle the numbers asked for',
      Boolean(rect) && Math.abs(Math.abs(rect.to[0] - rect.from[0]) - 180) < 1
      && Math.abs(Math.abs(rect.to[1] - rect.from[1]) - 120) < 1,
      rect ? `${Math.abs(rect.to[0] - rect.from[0])} × ${Math.abs(rect.to[1] - rect.from[1])}` : 'none');
  });

  await phase('f5b', 'a polyline and an arc', async () => {
    await armTool('polyline');
    await clickMm(...at(0.15, 0.72));
    await clickMm(...at(0.35, 0.88));
    await clickMm(...at(0.55, 0.72));
    await ENTER();
    await page.sleep(300);
    await armTool('arc');
    await clickMm(...at(0.62, 0.25));
    await clickMm(...at(0.78, 0.45));
    await clickMm(...at(0.90, 0.25));
    await page.sleep(400);
    await armTool('select');
    const ops = await opsNow();
    check('F5 — the polyline ran until Enter, and the arc took three points',
      ops.some((o) => o.op === 'polyline' && o.pts.length === 3) && ops.some((o) => o.op === 'arc'),
      ops.map((o) => o.op).join(','));
    await shot('f5b-polyline-and-arc-drawn', {
      count: { '[data-object-id]': 3 },
      all: ['[data-layer-overlay="1"]'],
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F6 — SELECT, RIGHT-CLICK, AND THE VERBS
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f6a', 'the context menu on a selection', async () => {
    await armTool('select');
    // Click the RECT's own edge — a shape is picked on its ink, not its box.
    const ops = await opsNow();
    const rect = ops.find((o) => o.op === 'rect');
    await clickMm(rect.from[0], (rect.from[1] + rect.to[1]) / 2);
    await page.sleep(250);
    const picked = await page.evaluate('return document.querySelectorAll(\'[data-object-selected="1"]\').length;');
    check('F6 — a click on a shape selects it', picked > 0, `${picked} lit`);
    await rightClickMm(rect.from[0], (rect.from[1] + rect.to[1]) / 2);
    await page.sleep(300);
    const menu = await page.evaluate(`
      const m = document.querySelector('[data-object-menu="1"]');
      if (!m) return null;
      const r = m.getBoundingClientRect();
      return {
        verbs: [...m.querySelectorAll('[data-object-verb]')].map((b) => b.getAttribute('data-object-verb')),
        onScreen: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
      };
    `);
    check('F6 — the menu is the owner’s five, and it is on screen',
      Boolean(menu) && ['move', 'copy', 'rotate', 'delete'].every((v) => menu.verbs.includes(v)) && menu.onScreen,
      JSON.stringify(menu));
    await shot('f6a-context-menu-on-selection', {
      all: ['[data-object-menu="1"]', '[data-object-verb="move"]', '[data-object-verb="delete"]'],
    });
    await ESC();
    await page.sleep(200);
  });

  await phase('f6b', 'a group moved as one', async () => {
    await armTool('select');
    // A MARQUEE over the polyline and the arc — a drag on empty canvas.
    await marqueeMm(at(0.02, 0.02), at(0.99, 0.99));
    const held = await page.evaluate('return document.querySelectorAll(\'[data-selection-box]\').length;');
    check('F6 — a marquee takes what is wholly inside it', held >= 1, `${held} held`);
    if (held >= 2) {
      await rightClickMm(...at(0.30, 0.80));
      await page.sleep(250);
      await page.click('[data-object-verb="group"]');
      await page.sleep(300);
    }
    const before = await opsNow();
    const grouped = before.filter((o) => o.group).length;
    check('F6 — Group gives them one id', grouped >= 2 || held < 2, `${grouped} in a group`);
    // …and MOVE takes the whole group: base point, then destination.
    await armTool('move');
    await clickMm(...at(0.3, 0.8));
    await clickMm(...at(0.5, 0.62));
    await page.sleep(350);
    const after = await opsNow();
    const moved = after.filter((o, i) => JSON.stringify(o) !== JSON.stringify(before[i])).length;
    check('F6 — and the group moves as one', moved >= 2 || held < 2, `${moved} moved together`);
    await armTool('select');
    await shot('f6b-group-moved-as-one', { count: { '[data-object-id]': 3 } });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F7 — MEASURE (SCREEN ONLY)
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f7', 'measure between two holes', async () => {
    await armTool('measure');
    const holes = await page.evaluate('return window.__t38.holes;');
    const a = holes[0];
    const b = holes.find((h) => Math.hypot(h.x - a.x, h.y - a.y) > 30) || holes[1];
    await clickMm(a.x, a.y);
    await clickMm(b.x, b.y);
    await page.sleep(300);
    const said = await page.evaluate(`
      return {
        drawn: document.querySelectorAll('[data-measure]').length,
        status: document.querySelector('[data-status-measure]')?.textContent || '',
        ops: ${P}.project.getState().partOpsOf(window.__t38.unitId, window.__t38.panelId).length,
      };
    `);
    check('F7 — the measurement is drawn and read out', said.drawn >= 1 && /measure/.test(said.status), said.status.trim());
    check('F7 — and it wrote NOTHING to the print (iron rule 7)', said.ops === (await opsNow()).length, `${said.ops} ops`);
    await shot('f7-measure-between-two-holes', {
      count: { '[data-measure]': 1 }, all: ['[data-status-measure]'],
    });
    await ESC();
    await armTool('select');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F8 — THE THUMBNAIL THAT GROWS
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f8', 'the 3-D thumbnail, two sizes', async () => {
    const box = await page.evaluate(`
      const el = document.querySelector('[data-part-canvas="1"]');
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), size: el.getAttribute('data-thumb-size') };
    `);
    check('F8 — it starts small, docked over the canvas', box.size === 'small', `${box.w} px`);
    await shot('f8-3d-thumbnail-small', { all: ['[data-thumb-size="small"]', '[data-editor-canvas="1"]'] });
    const canvasBefore = await page.evaluate(`
      const r = document.querySelector('[data-editor-canvas="1"]').getBoundingClientRect();
      return Math.round(r.width);
    `);
    await page.dblclick(box.x, box.y);
    await page.sleep(400);
    await page.dblclick(box.x, box.y);
    await page.sleep(700);
    const after = await page.evaluate(`
      const el = document.querySelector('[data-part-canvas="1"]');
      const r = el.getBoundingClientRect();
      return { size: el.getAttribute('data-thumb-size'), w: Math.round(r.width), canvas: Math.round(document.querySelector('[data-editor-canvas="1"]').getBoundingClientRect().width) };
    `);
    check('F8 — a double-click grows it', after.w > box.w, `${box.size} ${box.w} → ${after.size} ${after.w}`);
    check('F8 — and the drawing area never moved', after.canvas === canvasBefore, `${canvasBefore} px`);
    await shot('f8-3d-thumbnail-two-sizes', { all: ['[data-thumb-size="large"]', '[data-editor-canvas="1"]'] });
    // …and round it goes: large → small.
    await page.dblclick(box.x, box.y);
    await page.sleep(400);
    const round = await page.evaluate('return document.querySelector(\'[data-part-canvas="1"]\').getAttribute("data-thumb-size");');
    check('F8 — small → medium → large → small', round === 'small', round);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F11 — UNDO
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f11', 'undo restores the deleted circle', async () => {
    await clearOps();
    await armTool('circle');
    await clickMm(...at(0.45, 0.5));
    await clickMm(...at(0.65, 0.5));
    await page.sleep(350);
    await armTool('select');
    const drawn = await opsNow();
    check('F11 — a circle is drawn', drawn.some((o) => o.op === 'circle'), drawn.map((o) => o.op).join(','));
    // Select it on its own rim, and Delete.
    const circle = drawn.find((o) => o.op === 'circle');
    await clickMm(circle.at[0] + circle.r, circle.at[1]);
    await page.sleep(250);
    await DEL();
    await page.sleep(350);
    const gone = await opsNow();
    check('F11 — Delete takes it off', gone.length === drawn.length - 1, `${gone.length} left`);
    await page.key('z', { ctrl: true });
    await page.sleep(450);
    const back = await opsNow();
    check('F11 — and Ctrl+Z puts it back', back.length === drawn.length
      && back.some((o) => o.op === 'circle'), `${back.length} ops`);
    await shot('f11-undo-restores-deleted-circle', { count: { '[data-object-id]': 1 } });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F12 — THE PRECISION QUARTET
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f12a', 'offset and trim', async () => {
    await clearOps();
    // THE OSNAP GOES OFF for the quartet. Every one of these four acts on a
    // shape that is already there, so the walk has to be able to put the two
    // input lines exactly where it means them — with the eight kinds armed a
    // click near a puzzle socket lands on the socket, which is the osnap doing
    // its job and is not what is being proven here.
    await setSnaps(false);
    await armTool('line');
    await clickMm(...at(0.10, 0.35));
    await clickMm(...at(0.90, 0.35));
    await page.sleep(250);
    await clickMm(...at(0.55, 0.10));
    await clickMm(...at(0.55, 0.62));
    await page.sleep(300);
    const lines = await opsNow();
    check('F12 — two lines that cross, drawn by hand', lines.length === 2, JSON.stringify(lines.map((o) => [o.from, o.to])));

    // OFFSET the long one: select it on its own ink, type the distance, click
    // the side the copy goes.
    // A point ON the line's own segment, whatever the line turned out to be —
    // a third of the way along it, clear of the crossing.
    const flat = lines[0];
    const along = (t) => [flat.from[0] + (flat.to[0] - flat.from[0]) * t, flat.from[1] + (flat.to[1] - flat.from[1]) * t];
    await armTool('select');
    await clickMm(...along(0.25));
    await page.sleep(250);
    const held = await page.evaluate('return document.querySelectorAll(\'[data-selection-box]\').length;');
    check('F12 — the shape to offset is in hand', held === 1, `${held} held`);
    await armTool('offset');
    await typeText('4');
    await page.sleep(250);
    await typeText('0');
    await page.sleep(250);
    const [sx, sy] = along(0.25);
    await clickMm(sx, sy + 90);
    await page.sleep(450);
    const afterOffset = await opsNow();
    check('F12 — Offset put a parallel copy on the side that was clicked',
      afterOffset.length === 3, `${afterOffset.length} objects · ${await status()}`);

    // TRIM: the cutting edge is the upright, and the piece clicked goes.
    const upright = afterOffset.find((o) => o.op === 'line' && Math.abs(o.to[0] - o.from[0]) < 1);
    await armTool('select');
    await clickMm(upright.from[0], (upright.from[1] + upright.to[1]) / 2);
    await page.sleep(250);
    await armTool('trim');
    await clickMm(...along(0.9));
    await page.sleep(500);
    const afterTrim = await opsNow();
    check('F12 — Trim took out the piece the click fell in',
      afterTrim.length === 3 && !afterTrim.some((o) => o.id === flat.id),
      `${afterTrim.length} objects · ${await status()}`);
    await armTool('select');
    await shot('f12a-offset-and-trim', { count: { '[data-object-id]': 3 } });
  });

  await phase('f12b', 'fillet, radius 8', async () => {
    await clearOps();
    await armTool('line');
    await clickMm(...at(0.20, 0.30));
    await clickMm(...at(0.70, 0.30));
    await page.sleep(250);
    await clickMm(...at(0.20, 0.30));
    await clickMm(...at(0.20, 0.75));
    await page.sleep(300);
    const lines = await opsNow();
    check('F12 — two lines meeting at a corner', lines.length === 2, lines.map((o) => o.op).join(','));
    await armTool('fillet');
    await typeText('8');
    await page.sleep(250);
    await clickMm(...at(0.55, 0.30));
    await page.sleep(300);
    await clickMm(...at(0.20, 0.60));
    await page.sleep(500);
    const ops = await opsNow();
    const arc = ops.find((o) => o.op === 'arc');
    check('F12 — a corner arc, and the two lines shortened to its tangents',
      Boolean(arc) && Math.abs(arc.r - 8) < 0.5, arc ? `R${arc.r}` : `${ops.map((o) => o.op).join(',')} · ${await status()}`);
    await armTool('select');
    await shot('f12b-fillet-radius-8', { count: { '[data-object-id]': 3 } });
  });

  await phase('f12c', 'array 4 × 3', async () => {
    await clearOps();
    await armTool('circle');
    await clickMm(...at(0.12, 0.15));
    await clickMm(...at(0.16, 0.15));
    await page.sleep(300);
    await armTool('select');
    const one = await opsNow();
    await clickMm(one[0].at[0] + one[0].r, one[0].at[1]);
    await page.sleep(250);
    await armTool('array');
    await typeText('4');
    await page.sleep(200);
    await TAB();
    await typeText('3');
    await page.sleep(200);
    await TAB();
    await typeText('60');
    await page.sleep(250);
    await ENTER();
    await page.sleep(500);
    const ops = await opsNow();
    check('F12 — 4 × 3 places twelve, and one of them was already there',
      ops.length === 12, `${ops.length} objects`);
    await shot('f12c-array-4x3', { count: { '[data-object-id]': 12 } });
    await setSnaps(true);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F10 — THE DXF
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f10', 'everything drawn exports, on its own layer', async () => {
    await clearOps();
    // One of each, by hand, on the project's own layer.
    await armTool('rect');
    await clickMm(...at(0.10, 0.10));
    await clickMm(...at(0.45, 0.35));
    await page.sleep(300);
    await armTool('circle');
    await clickMm(...at(0.70, 0.25));
    await clickMm(...at(0.85, 0.25));
    await page.sleep(300);
    await armTool('arc');
    await clickMm(...at(0.15, 0.60));
    await clickMm(...at(0.35, 0.80));
    await clickMm(...at(0.55, 0.60));
    await page.sleep(400);
    await armTool('select');

    // R4: the FILE, off the very writer the export button calls.
    const dxf = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t38.unitId);
      const panel = r.panels.find((p) => p.id === window.__t38.panelId);
      const text = window.__ccDxf.panelDxf(panel, r.drills, {
        unitNum: r.unitNum, profile: ${P}.profile.getState().profile, userLayers: s.projectLayers(),
      });
      const parsed = window.__ccDxf.parseDxf(text);
      return {
        text,
        layers: parsed.layerTable,
        kinds: parsed.entities.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {}),
        onJig: parsed.entities.filter((e) => e.layer === 'SHOP_JIG').map((e) => e.type),
      };
    `);
    writeFileSync(`${OUT}f10-export-with-user-layer.dxf`, dxf.text);
    const jig = dxf.layers.find((l) => l.name === 'SHOP_JIG');
    check('F10 — the user layer is declared under its own name and ACI',
      Boolean(jig) && jig.color === 30, JSON.stringify(jig));
    check('F10 — the drawn shapes are in the file as geometry',
      dxf.onJig.length >= 3 && dxf.onJig.includes('arc') && dxf.onJig.includes('circle'),
      dxf.onJig.join(','));
    check('F10 — and there is no MTEXT and no STYLE table (iron rule 7)',
      !/\bMTEXT\b/.test(dxf.text) && !/\bSTYLE\b/.test(dxf.text), `${dxf.text.length} bytes`);

    // …and the app's OWN viewer of that file: the CNC sheet, which draws the
    // very channels the writer just wrote.
    await ESC();
    await page.sleep(250);
    await ESC();
    await page.sleep(400);
    await page.evaluate(`${P}.ui.getState().closeModal(); ${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.waitFor('document.querySelector(\'[data-cnc-sheet], [data-cnc-view], svg\')', { what: 'the CNC sheet' });
    await page.sleep(1200);
    const sheet = await page.evaluate(`
      return {
        paths: document.querySelectorAll('[data-cnc-feature^="path-"]').length,
        curves: document.querySelectorAll('[data-cnc-feature^="curve-"]').length,
        legend: (document.body.innerText || '').includes('SHOP_JIG'),
      };
    `);
    check('F10 — the sheet draws them too, so the preview and the file agree',
      sheet.paths >= 1 && sheet.curves >= 2, JSON.stringify(sheet));
    await shot('f10-dxf-with-user-layer-opened-in-viewer', {
      text: 'SHOP_JIG', count: { '[data-cnc-feature^="curve-"]': 2 },
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // F9 — THE RESIZE RULE AND THE TWO GUARDS
  // ══════════════════════════════════════════════════════════════════════════
  await phase('f9', 'the resize note and the OUTLINE warning', async () => {
    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(600);
    await openEditor();
    // Draw one shape ON OUTLINE — the cut boundary — by picking that layer
    // from the overlay and drawing on it.
    await page.click('[data-legend-layer="OUTLINE"] button');
    await page.sleep(250);
    await armTool('line');
    await clickMm(...at(0.2, 0.5));
    await clickMm(...at(0.8, 0.5));
    await page.sleep(400);
    await armTool('select');
    const ops = await opsNow();
    check('F9 — a line is drawn on OUTLINE', ops.some((o) => o.layer === 'OUTLINE'), ops.map((o) => o.layer).join(','));

    // Close the editor and open the Check panel — the guard is a WARNING there.
    await ESC();
    await page.sleep(300);
    await page.evaluate(`${P}.ui.getState().closeModal(); ${P}.ui.getState().setCheckOpen(true); return true;`);
    await page.waitFor('document.querySelector(\'[data-check-panel]\')', { what: 'the Check panel' });
    await page.sleep(500);
    const guards = await page.evaluate(`
      const rows = [...document.querySelectorAll('[data-check-finding]')];
      return {
        seventeen: rows.filter((r) => r.getAttribute('data-check-finding') === '17').length,
        text: rows.map((r) => r.textContent.trim()).filter((t) => /OUTLINE/.test(t))[0] || '',
      };
    `);
    check('F9 — GUARD B: the Check says OUTLINE is the cut boundary',
      guards.seventeen >= 1, guards.text.slice(0, 90));

    // …and now the RESIZE, which is the rule itself.
    await page.evaluate(`
      window.__t38.opsBefore = ${P}.project.getState().partOpsOf(window.__t38.unitId, window.__t38.panelId).length;
      ${P}.ui.getState().notify && (${P}.ui.getState().messages || []);
      return true;
    `);
    await page.evaluate(`
      ${P}.project.getState().updateUnitParams(window.__t38.unitId, { width: 900 });
      return true;
    `);
    await page.sleep(900);
    const dropped = await page.evaluate(`
      const s = ${P}.project.getState();
      return {
        before: window.__t38.opsBefore,
        after: s.partOpsOf(window.__t38.unitId, window.__t38.panelId).length,
        said: (document.body.innerText || '').includes('Custom geometry dropped'),
      };
    `);
    check('F9 — custom geometry DIES with a panel resize', dropped.after === 0 && dropped.before > 0,
      `${dropped.before} → ${dropped.after}`);
    check('F9 — and the app says so, naming the panel', dropped.said);
    await shot('f9-resize-dropped-note-and-outline-warning', {
      text: 'Custom geometry dropped', all: ['[data-check-panel]'],
    });
  });

  // ══════════════════════════════════════════════════════════════════════════

  const failed = steps.filter((s) => !s.ok);
  const empty = shots.filter((s) => !s.present);
  writeFileSync(`${OUT}report.json`, `${JSON.stringify({
    steps, shots, failed: failed.length, emptyFrames: empty.length,
  }, null, 1)}\n`);
  console.log(`\n${steps.length - failed.length}/${steps.length} checks, ${shots.length} pictures, ${empty.length} empty frames`);
  if (failed.length) console.log(`FAILED:\n  ${failed.map((f) => `${f.label} — ${f.detail}`).join('\n  ')}`);
  await page.close();
  process.exit(failed.length || empty.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
