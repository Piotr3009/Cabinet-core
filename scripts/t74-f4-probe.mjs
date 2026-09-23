#!/usr/bin/env node
// ─── T74 F4 · THE PROBE: A NEW ROOM ON TOP OF THE OLD ONE ───────────────────
//
// The owner, 23.09.2026 (list point 2): *"Przy tworzeniu nowego pokoju po
// starym jeden nachodzi na drugi zamiast resetu."*
//
// CLAUDE.md T74 F4: *"PROBE first, real mouse: draw a room, then start a new
// room and draw it. Record what the store holds (corners, walls, openings,
// boxes, slopes) and what the scene draws, before and after. Commit the
// table."*
//
// Every gesture is a real mouse or key event: the room editor is opened by its
// own button, a window and a slope are put on the wall by the elevation's own
// buttons, the room is DRAWN by clicking on the drawing and typing the length
// into the field that opens there, and saved by SAVE ROOM. The store and the
// scene are only READ.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t74-f4-probe.mjs [--out verify/t74/f04-probe.md]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const outArg = process.argv.indexOf('--out');
const OUT = new URL(`../${outArg > 0 ? process.argv[outArg + 1] : 'verify/t74/f04-probe.md'}`, import.meta.url).pathname;
const SHOTS = new URL('../verify/t74/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const page = await launch({ width: 1440, height: 900, port: 9600 + (process.pid % 200) });
page.ask = (expr) => page.evaluate(`return (${expr});`);
const press = async (sel) => { await page.click(sel); await page.sleep(700); };
const clickAt = async (x, y) => {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await page.sleep(80);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 });
  await page.sleep(500);
};
const key = async (k, code) => {
  const e = { key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...e });
  if (k === 'Enter') await page.send('Input.dispatchKeyEvent', { type: 'char', text: '\r', ...e });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...e });
  await page.sleep(450);
};

/** The pen, on the glass: the centre of its own cross. */
const pen = () => page.ask(`(() => { const g = document.querySelector('[data-draw-pen]'); if (!g) return null;
  const r = g.getBoundingClientRect(); const lines = g.querySelectorAll('line');
  const a = lines[0].getBoundingClientRect(); return { x: Math.round(a.left + a.width / 2), y: Math.round(a.top + a.height / 2) }; })()`);

/** One wall: point the mouse that way from the pen, click, type the length, Enter. */
async function wall(dx, dy, mm) {
  const p = await pen();
  const x = p.x + dx; const y = p.y + dy;
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - dx / 3, y: y - dy / 3 });
  await page.sleep(120);
  await clickAt(x, y);
  // The field opened at the click with the drawn length selected: the typed
  // number replaces it (T74 F3), and Enter draws the wall.
  await page.send('Input.insertText', { text: String(mm) });
  await page.sleep(200);
  await key('Enter', 13);
}

/** THE STORE AND THE SCENE, read. */
const state = () => page.ask(`(() => {
  const P = window.__cc.project.getState(); const room = P.project.room || {};
  const v = window.__cc.views && window.__cc.views.room; const seen = { walls: 0, wallPlan: 0, roomBox: 0 };
  const faces = [];
  if (v) v.scene.traverse((o) => { const u = o.userData || {};
    if (u.ccWall != null) { seen.walls += 1; faces.push(String(u.ccWall)); }
    if (u.ccWallPlan != null) seen.wallPlan += 1; if (u.ccRoomBox != null) seen.roomBox += 1; });
  const plan = document.querySelectorAll('[data-plan-wall]').length;
  return {
    corners: (room.corners || []).map((c) => Math.round(c.x) + ',' + Math.round(c.y)).join(' '),
    walls: (room.corners || []).length,
    openings: (room.openings || []).map((o) => o.kind + '@w' + o.wall + ':' + Math.round(o.x_mm)).join(' ') || '(none)',
    boxes: (room.boxes || []).length,
    slopes: (P.project.wallSlopes || []).map((s) => (s.kind || 'slope') + '@w' + s.wall + (s.side ? ':' + s.side : '')).join(' ') || '(none)',
    scope: (P.project.design && P.project.design.scope) || 'room',
    units: P.units.length,
    sceneWalls: seen.walls, sceneWallPlan: seen.wallPlan, sceneRoomBox: seen.roomBox,
    roomWindowPlanWalls: plan,
  };
})()`);

const rows = [];
const record = async (when) => { const s = await state(); rows.push({ when, ...s }); process.stdout.write(`${when}: ${JSON.stringify(s)}\n`); };

// ── THE CLIENT'S ROOM ─────────────────────────────────────────────────────
await page.goto(`${BASE}retail.html#/design`);
await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout: 45000 });
await page.sleep(2600);
await press('[data-testid="cat-where"]');
await press('[data-testid="where-add-wardrobe"]');
await page.sleep(1200);
await record('0 · the default room, one wardrobe');

// The OLD room gets a window and a slope, through the elevation's own buttons.
await press('[data-testid="space-edit-room"]');
await page.sleep(900);
await press('[data-elevation-add="window"]');
await press('[data-elevation-add="slope-right"]');
await page.sleep(600);
await record('1 · the old room: a window and a slope on wall 1');
await page.screenshot(`${SHOTS}f04-probe-1-old-room.png`);

// ── DRAW A ROOM (A) ───────────────────────────────────────────────────────
await press('[data-room-draw="1"]');
await page.sleep(900);
await wall(180, 0, 5000);
await wall(0, 140, 3500);
await wall(-180, 0, 5000);
await press('[data-draw-close="1"]');
await page.screenshot(`${SHOTS}f04-probe-2-drawn-A.png`);
await press('[data-draw-save="1"]');
await page.sleep(1500);
await record('2 · room A drawn and saved (5000 x 3500)');
await page.screenshot(`${SHOTS}f04-probe-3-after-A.png`);

// ── START A NEW ROOM AND DRAW IT (B) ──────────────────────────────────────
// The room window is where DRAW ROOM lives; in the client's room it is still
// open under the drawing, so the same button is pressed again.
if (!(await page.ask('Boolean(document.querySelector(\'[data-room-draw="1"]\'))'))) {
  await press('[data-testid="cat-where"]');
  await press('[data-testid="space-edit-room"]');
}
await record('3 · the room window again, before the new room');
await page.screenshot(`${SHOTS}f04-probe-4-room-window-again.png`);
await press('[data-room-draw="1"]');
await page.sleep(900);
await wall(180, 0, 3600);
await wall(0, 140, 2800);
await wall(-180, 0, 3600);
await press('[data-draw-close="1"]');
await press('[data-draw-save="1"]');
await page.sleep(1500);
await record('4 · room B drawn and saved (3600 x 2800)');
await page.screenshot(`${SHOTS}f04-probe-5-after-B.png`);
// …and what the room window under it says, and does, if APPLY is pressed.
const applyThere = await page.ask('Boolean(document.querySelector(\'[data-room-apply="1"]\'))');
if (applyThere) {
  await press('[data-room-apply="1"]');
  await page.sleep(1200);
  await record('5 · APPLY pressed in the room window left under the drawing');
  await page.screenshot(`${SHOTS}f04-probe-6-after-apply.png`);
}
await page.close();

// ── THE TABLE ─────────────────────────────────────────────────────────────
const cols = ['when', 'corners', 'openings', 'slopes', 'boxes', 'scope', 'units', 'sceneWalls', 'sceneWallPlan', 'sceneRoomBox', 'roomWindowPlanWalls'];
const md = [
  '# T74 F4 · the probe: a new room on top of the old one',
  '',
  'The owner, 23.09.2026: *"Przy tworzeniu nowego pokoju po starym jeden nachodzi na drugi zamiast resetu."*',
  '',
  `Run by \`node scripts/t74-f4-probe.mjs\` against \`npx vite preview --port 4173\` (retail, \`retail.html#/design\`).`,
  'Every step is a real click or key: EDIT THE ROOM, the elevation\'s ADD WINDOW and SLOPE RIGHT, DRAW ROOM, a click',
  'on the drawing and the length typed into the field that opens there, CLOSE, SAVE ROOM. The store and the scene',
  'are only read. `sceneWalls` counts the wall groups the scene draws (`userData.ccWall`), `roomWindowPlanWalls` the',
  'walls the room window\'s own plan draws (`data-plan-wall`).',
  '',
  `| ${cols.join(' | ')} |`,
  `|${cols.map(() => '---').join('|')}|`,
  ...rows.map((r) => `| ${cols.map((c) => String(r[c]).replace(/\|/g, '/')).join(' | ')} |`),
  '',
];
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, md.join('\n'));
process.stdout.write(`\nwritten ${OUT}\n`);
process.exit(0);
