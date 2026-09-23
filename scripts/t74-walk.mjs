#!/usr/bin/env node
// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 74) ───────────────────────
//
// CLAUDE.md T74, LAWS: *"Test the way the client clicks. `scripts/t74-walk.mjs`
// uses a REAL mouse (`page.mouse.click` / `page.mouse.dblclick` / drags at the
// piece's projected screen point through `window.__cc.views`) and adds pieces
// through the REAL buttons. Never `selectElement` or a store call standing in
// for a click: T72's walk did that and hid two faults the owner then found by
// hand."*
//
// So every gesture below is the browser's own input pipe (CDP
// `Input.dispatchMouseEvent`, pressed and released at one pixel, or moved
// between two), aimed at a pixel where the scene's own raycaster says the piece
// IS the nearest thing under the pointer. The store is READ to say what
// happened; it is never written to make something happen.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t74-walk.mjs --fresh f1 f2      start a ledger, run two
//   node scripts/t74-walk.mjs f3                 add to it
//
// THE HARNESS IS T72's (one Chromium per section, a strictly increasing debug
// port, the hardware served from the silent showroom), with the real mouse
// helpers this turn's law asks for.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  open, room, pro, withWardrobe, pointOn, reach, orbit, roomView, unitIds, unitsNow, modalNow,
  showroomDown,
} from './t74-harness.mjs';

const SHOTS = new URL('../verify/t74/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` · ${detail}` : ''}\n`);
};
const note = (label, detail = '') => {
  steps.push({ label, ok: true, detail, note: true });
  process.stdout.write(`  ·   ${label}${detail ? ` · ${detail}` : ''}\n`);
};
const shot = (page, file) => page.screenshot(`${SHOTS}${file}`);

// ═══ F1 · THE SIDE ASKS: ANY WARDROBE, A SMALL MODAL AT THE CLICK ══════════
if (runs('f1')) {
  process.stdout.write('\n─── F1 · THE SIDE ASKS, BESIDE THE POINTER ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // The second wardrobe through EXTRAS' own button.
  await page.press('[data-testid="cat-extras"]');
  await page.press('[data-testid="extras-add-wardrobe"]');
  await page.sleep(1500);
  const units = await unitsNow(page);
  check('two wardrobes, both added through the real buttons', units.length === 2, JSON.stringify(units));
  await page.press('[data-testid="cat-where"]');
  await roomView(page);
  await orbit(page, 120, 0);

  for (const [n, u] of units.entries()) {
    const sides = ['BUL', 'BUR'].filter((part) => !u.ep.includes(part === 'BUL' ? 'L' : 'R'));
    let asked = false;
    for (const part of sides) {
      const at = await reach(page, u.id, part);
      if (!at) { note(`wardrobe ${n + 1} ${part}: not in reach of any camera tried`); continue; }
      await page.clickAt(at.x, at.y);
      const modal = await modalNow(page);
      const box = await page.box('[data-modal-name="add-panel"] [data-testid="add-panel-ask"]');
      const shell = await page.box('[data-modal-shell][data-modal-name="add-panel"]')
        || await page.box('[data-modal-name="add-panel"]');
      const dock = await page.ask('document.querySelector(\'[data-testid="column-detail"]\')?.getAttribute("data-open") || null');
      const near = shell ? Math.hypot(Math.max(0, shell.x - at.x, at.x - (shell.x + shell.w)),
        Math.max(0, shell.y - at.y, at.y - (shell.y + shell.h))) : null;
      check(`wardrobe ${n + 1} · a real click on its bare ${part} opens ADD END PANEL?`,
        modal === 'add-panel' && box, `click at ${at.x},${at.y}; modal ${modal}`);
      check(`wardrobe ${n + 1} · …the small modal stands near the pointer`, near !== null && near < 420,
        `shell ${JSON.stringify(shell)}, ${near === null ? '?' : Math.round(near)} px from the click`);
      check(`wardrobe ${n + 1} · …and the right-hand panel does not open`, dock !== 'yes', `data-open ${dock}`);
      await shot(page, `f01-ask-wardrobe${n + 1}-${part}.png`);
      // A click ELSEWHERE: the empty top-left of the stage.
      const before = JSON.stringify(await unitsNow(page));
      const canvas = await page.box('[data-testid="stage-canvas"]');
      await page.clickAt(canvas.x + 30, canvas.y + 30);
      check(`wardrobe ${n + 1} · a click elsewhere closes it`, !(await modalNow(page)) && !(await page.has('[data-modal-name="add-panel"]')));
      check(`wardrobe ${n + 1} · …and adds nothing`, JSON.stringify(await unitsNow(page)) === before);
      asked = true;
      break;
    }
    if (!asked) check(`wardrobe ${n + 1} · a bare side was clicked`, false, 'no bare side in reach');
  }

  // YES on a side with room, and the store's refusal on one without.
  const [a, b] = units;
  const at = await reach(page, a.id, 'BUR');
  if (at) {
    await page.clickAt(at.x, at.y);
    await page.press('[data-testid="add-panel-yes"]');
    const said = await page.text('[data-testid="add-panel-said"]');
    check('between two flush wardrobes, YES is refused in the store\'s own words, inside the modal',
      /No room for a/.test(said) && (await modalNow(page)) === 'add-panel', said);
    await shot(page, 'f01-refused-between.png');
    await page.press('[data-testid="add-panel-no"]');
    check('NO closes it', !(await modalNow(page)));
  } else {
    note('the side between the two could not be reached from the camera');
  }
  const bare = b.ep.includes('R') ? (a.ep.includes('L') ? null : [a.id, 'BUL']) : [b.id, 'BUR'];
  if (bare) {
    const p = await reach(page, bare[0], bare[1]);
    if (p) {
      await page.clickAt(p.x, p.y);
      await page.press('[data-testid="add-panel-yes"]');
      const after = (await unitsNow(page)).find((u) => u.id === bare[0]);
      const dock = await page.ask('document.querySelector(\'[data-testid="column-detail"]\')?.getAttribute("data-editor") || null');
      check('YES on an outer side: the panel goes on, the modal closes, the panel\'s own menu opens',
        after.ep.includes(bare[1] === 'BUL' ? 'L' : 'R') && !(await modalNow(page)) && dock === 'end-panel',
        `${bare[1]} → ep ${after.ep}; dock ${dock}`);
      await shot(page, 'f01-yes-panel-menu.png');
    }
  }
  await page.close();
}

// ═══ THE LEDGER ═══════════════════════════════════════════════════════════
const fresh = process.argv.includes('--fresh');
const failed = steps.filter((s) => !s.ok);
const previous = !fresh && existsSync(`${SHOTS}walk.txt`)
  ? readFileSync(`${SHOTS}walk.txt`, 'utf8').replace(/\n?\d+ checks · \d+ failed\n*$/, '')
  : '';
const before = (previous.match(/^ (ok|FAIL) /gm) || []).length;
const beforeFailed = (previous.match(/^FAIL /gm) || []).length;
writeFileSync(`${SHOTS}walk.txt`, [
  previous || [
    '─── T74 · THE ACCEPTANCE WALK ───',
    '',
    'The owner\'s list of 23.09 and the two T73 retests, run section by section',
    'against `npx vite preview --port 4173`, the hardware served from the silent',
    'showroom. Every gesture is a REAL mouse or key event at a pixel the scene\'s',
    'own raycaster says the piece is under; the store is only READ. The frames',
    'beside this file are what the browser saw.',
    '',
  ].join('\n'),
  ...steps.map((s) => `${s.note ? ' ·  ' : (s.ok ? ' ok ' : 'FAIL')} ${s.label}${s.detail ? ` · ${s.detail}` : ''}`),
  '',
  `${before + steps.filter((s) => !s.note).length} checks · ${beforeFailed + failed.length} failed`,
  '',
].join('\n'));
process.stdout.write(`\n${steps.filter((s) => !s.note).length} checks · ${failed.length} failed\n`);
await showroomDown();
process.exit(failed.length ? 1 : 0);
