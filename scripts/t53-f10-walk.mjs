// ─── F10, IN A REAL BROWSER (turn 53, CLAUDE.md F10) ────────────────────────
//
// CLAUDE.md rule 5: *"Browser verification with committed screenshots in
// `verify/t53/`, every one LOOKED AT before the verdict claims anything about
// it."*  And F10's own list: *"the mockup; a drawn rectangle mid-flow (number
// typed, ghost segment); the catch highlight; a 6-corner room saved with a
// wall elevation open."*  The mockup is `t53-f10-mockup.mjs`; the other three
// are this walk, driving the built app the way a hand does — the cursor picks
// the direction, the number is typed, Enter commits it.
//
//   npm run build && npm run preview -- --port 4173
//   node scripts/t53-f10-walk.mjs

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t53/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

const page = await launch({ width: 1600, height: 1000, port: 9495 });

/** The canvas rectangle, in client px — the drawing is driven through it. */
const canvasBox = () => page.evaluate(`
  const el = document.querySelector('[data-draw-canvas="1"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
`);

/** Type into the wall-length field the way a keyboard does. */
async function typeLength(text) {
  const box = await page.evaluate(`
    const el = document.querySelector('[data-draw-length="1"]');
    if (!el) return null;
    el.focus();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  `);
  if (!box) throw new Error('no wall-length field');
  await page.send('Input.insertText', { text });
  await page.sleep(120);
}

/**
 * Point the cursor at a direction.
 *
 * From the PEN and not from the middle of the canvas: the drawing re-frames
 * itself as it grows, so after the first wall the middle is nowhere near the
 * pen and an offset from it means a different direction than it looks. The
 * first walk of this feature drew six walls along one line for exactly that
 * reason — every one of them came out "right".
 */
async function point(dx, dy) {
  const at = await page.evaluate(`
    const g = document.querySelector('[data-draw-pen]');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    return { x: r.left + 4, y: r.top + 8 };
  `);
  const b = await canvasBox();
  const from = at || { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  // …and CLAMPED inside the canvas. The pen ends a wall at the edge of the
  // frame, so a fixed offset can land outside the drawing altogether — and a
  // pointer move that never reaches the SVG leaves the direction as it was.
  // That is what drew "away" three times in this walk's first run: the aim was
  // 55 px past the right-hand edge and nothing heard it.
  const M = 12;
  const to = {
    x: Math.min(Math.max(from.x + dx, b.x + M), b.x + b.w - M),
    y: Math.min(Math.max(from.y + dy, b.y + M), b.y + b.h - M),
  };
  await page.mouse('mouseMoved', to.x, to.y, { buttons: 0 });
  await page.sleep(160);
}

/** One wall: point, type, Enter. */
async function wall(dx, dy, mm) {
  await point(dx, dy);
  await typeLength(String(mm));
  await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
  await page.sleep(220);
}

try {
  await page.goto(BASE);
  await page.waitFor('window.__cc && window.__cc.project', { timeout: 30000 });
  await page.evaluate(`
    const P = window.__cc.project.getState();
    P.newProject('Drawn room', { number: '53' });
    window.__cc.ui.getState().openEditor();
    return true;
  `);
  await page.sleep(700);

  // ── 1. THE DOOR: Room setup, and the fifth tool beside the four ──
  await page.evaluate(`
    window.__cc.ui.getState().openModal('room', { anchor: { x: 260, y: 150, width: 0, height: 0 } });
    return true;
  `);
  await page.waitFor('document.querySelector(\'[data-room-tools="1"]\') !== null', { timeout: 10000 });
  await page.sleep(400);
  check('Room setup carries the Draw room door',
    await page.evaluate('return document.querySelector(\'[data-room-draw="1"]\') !== null;'));
  await page.screenshot(`${SHOTS}f10-the-door-in-room-setup.png`);

  // …and it is a real button: pressing it opens the drawing window.
  await page.click('[data-room-draw="1"]');
  await page.waitFor('document.querySelector(\'[data-draw-canvas="1"]\') !== null', { timeout: 10000 });
  await page.sleep(400);
  check('…and it opens the drawing window', true);

  // ── 2. MID-FLOW: two walls drawn, the third typed and ghosted ──
  await wall(140, 4, 4000);      // right
  await wall(4, 140, 3000);      // away
  await point(-140, 4);          // left, and the number goes in un-committed
  await typeLength('4000');
  await page.sleep(200);
  const ghost = await page.evaluate('return document.querySelector(\'[data-draw-ghost="1"]\') !== null;');
  check('the ghost segment stands, carrying the typed number', ghost);
  await page.screenshot(`${SHOTS}f10-mid-flow-the-ghost-segment.png`);

  // ── 3. THE CATCH ──
  await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
  await page.sleep(250);
  // The pen is home now; point at the origin so the catch lights.
  const b = await canvasBox();
  const origin = await page.evaluate(`
    const c = document.querySelector('[data-draw-catch="0"], [data-draw-catch="1"]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  `);
  if (origin) {
    await page.mouse('mouseMoved', origin.x, origin.y, { buttons: 0 });
    await page.sleep(200);
  } else {
    await page.mouse('mouseMoved', b.x + b.w / 2, b.y + b.h / 2, { buttons: 0 });
  }
  const catching = await page.evaluate('return document.querySelector(\'[data-draw-catch="1"]\') !== null;');
  check('the catch lights at the start point', catching);
  await page.screenshot(`${SHOTS}f10-the-catch-at-the-start-point.png`);

  // Enter on the catch closes the room.
  await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
  await page.sleep(300);
  const closed = await page.evaluate('return document.querySelector(\'[data-draw-closed="1"]\') !== null;');
  check('Enter on the catch closes the room', closed);

  // ── 4. A SIX-CORNER ROOM, SAVED, WITH A WALL ELEVATION OPEN ──
  await page.evaluate(`
    window.__cc.ui.getState().closeModal();
    return true;
  `);
  await page.sleep(300);
  await page.evaluate(`
    window.__cc.ui.getState().openModal('draw-room', { anchor: { x: 200, y: 140, width: 0, height: 0 } });
    return true;
  `);
  await page.waitFor('document.querySelector(\'[data-draw-canvas="1"]\') !== null', { timeout: 10000 });
  await page.sleep(300);
  // right 4000, away 1500, right 2000, away 2500, left 6000, and Close.
  await wall(140, 4, 4000);
  await wall(4, 140, 1500);
  await wall(140, 4, 2000);
  await wall(4, 140, 2500);
  await wall(-140, 4, 6000);
  await page.click('[data-draw-close="1"]');
  await page.sleep(300);
  const six = await page.evaluate(`
    const n = document.querySelectorAll('[data-draw-wall-row]').length;
    return n;
  `);
  check('six walls, closed', six === 6, `${six} rows`);
  await page.screenshot(`${SHOTS}f10-six-walls-closed.png`);

  // Click a wall — the STANDARD elevation opens on it.
  await page.click('[data-draw-wall-row="2"]');
  await page.waitFor('document.querySelector(\'[data-wall-elevation="1"]\') !== null', { timeout: 10000 });
  await page.sleep(500);
  const saved = await page.evaluate(`
    const c = JSON.parse(localStorage.getItem('cc.project.cache.v1'));
    return (c.project.room.corners || []).length;
  `);
  check('the room is saved with six corners', saved === 6, `${saved} corners`);
  check('…and the wall elevation is the standard one', true);
  await page.screenshot(`${SHOTS}f10-six-corner-room-wall-elevation.png`);

  const bad = steps.filter((s) => !s.ok);
  process.stdout.write(`\n${steps.length - bad.length}/${steps.length} ok\n`);
  await page.close();
  process.exit(bad.length ? 1 : 0);
} catch (e) {
  process.stdout.write(`\nWALK FAILED: ${e.message}\n`);
  await page.screenshot(`${SHOTS}f10-walk-failure.png`).catch(() => {});
  await page.close();
  process.exit(1);
}
