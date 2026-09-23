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

// ═══ F6 · THE SECOND SHOE DRAWER, SET BY ITS MOUNTING HEIGHT ═════════════
if (runs('f6')) {
  process.stdout.write('\n─── F6 · THE SECOND SHOE DRAWER, BY ITS MOUNTING HEIGHT ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // Two shoe drawers, each through INSIDE's own button.
  for (let k = 0; k < 2; k += 1) {
    if (!(await page.has('[data-add-shoe-box="1"]'))) {
      if (!(await page.has('[data-add-kind="shoe_box"]'))) await page.press('[data-testid="cat-inside"]');
      await page.press('[data-add-kind="shoe_box"]');
    }
    await page.press('[data-add-shoe-box="1"]');
    await page.sleep(1300);
  }
  const [unit] = await unitsNow(page);
  const stack = async () => page.ask(`(() => { const P = window.__cc.project.getState();
    const u = P.units.find((x) => x.id === ${JSON.stringify(unit.id)});
    const r = P.unitResult(u.id);
    return u.params.sections[0].items.filter((i) => i.kind === 'drawer').sort((a, b) => a.index - b.index)
      .map((i) => { const f = r.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta && p.meta.drawer === i.index);
        const ramp = r.panels.find((p) => p.part === 'SHOE-RAMP' && p.meta && p.meta.drawer === i.index);
        return { index: i.index, variant: i.variant || 'plain', pos: i.pos_mm ?? null,
          front: f ? { id: f.id, y: f.box.y, top: f.box.y + f.box.h, h: f.box.h } : null, ramp: Boolean(ramp) }; }); })()`);
  const two = await stack();
  check('two shoe drawers, both added through INSIDE\'s real button',
    two.length === 2 && two.every((d) => d.variant === 'shoe' && d.ramp),
    two.map((d) => `${d.index}:${d.variant} front ${d.front?.y}..${d.front?.top} ramp ${d.ramp}`).join(' | '));
  check('the second arrives stacked tight on the first; the first is on the bottom',
    two.length === 2 && Math.abs(two[1].front.y - two[0].front.top - 3) < 0.5 && two[0].front.y < 40,
    `first ${two[0]?.front?.y}, second ${two[1]?.front?.y}`);
  // The doors open so the drawer fronts are under the pointer (INSIDE opens them; OPEN ALL where it has not).
  await page.sleep(1200);
  const doorsOpen = await page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(unit.id)});
    const o = (window.__cc.ui.getState().openFronts || {})[${JSON.stringify(unit.id)}] || {};
    return r.panels.filter((p) => p.part === 'FRONT').every((p) => (o[p.id] || 0) > 0); })()`);
  if (!doorsOpen && await page.has('[data-testid="view-open-all"]')) await page.press('[data-testid="view-open-all"]');
  await page.sleep(1500);
  await shot(page, 'f06-two-shoe-drawers.png');

  if (two.length === 2) {
    const front2 = two[1].front.id;
    const at = await reach(page, unit.id, front2);
    if (!at) {
      check('the second drawer\'s front is in reach of the pointer', false, 'no camera tried shows it');
    } else {
      // A REAL drag straight up on the second front.
      await page.dragFromTo(at.x, at.y, at.x, at.y - 90, { steps: 14 });
      await page.sleep(1200);
      const dragged = await stack();
      check('a real drag UP on the second front raises it by its mounting height',
        dragged[1].pos != null && dragged[1].front.y > two[1].front.y + 20,
        `pos_mm ${dragged[1].pos}; front ${two[1].front.y} -> ${dragged[1].front.y}`);
      check('…its own height is unchanged, and the first has not moved',
        dragged[1].front.h === two[1].front.h && dragged[0].front.y === two[0].front.y,
        `h ${two[1].front.h} -> ${dragged[1].front.h}; first ${two[0].front.y} -> ${dragged[0].front.y}`);
      check('…and both still carry their ramps', dragged.every((d) => d.ramp));
      // Selected, the scene shows the DISTANCE between the drawers.
      const pick = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; let m = null;
        v.scene.traverse((o) => { if (!m && o.userData && o.userData.ccDimensionPick === 'drawer-gap') m = o; });
        if (!m) return null; m.updateMatrixWorld(true);
        const b = new T.Box3().setFromObject(m); const c = b.getCenter(new T.Vector3()).project(v.camera);
        const r = v.gl.domElement.getBoundingClientRect();
        return { x: Math.round(r.left + (c.x + 1) / 2 * r.width), y: Math.round(r.top + (1 - c.y) / 2 * r.height) }; })()`);
      check('the second drawer selected, the scene draws the distance between the two drawers',
        Boolean(pick), pick ? `figure at ${pick.x},${pick.y}` : 'no drawer-gap figure in the scene');
      await shot(page, 'f06-dragged-distance.png');
      if (pick) {
        await page.clickAt(pick.x, pick.y);
        await page.sleep(500);
        const field = await page.has('[data-spacing-field="drawer-gap"]');
        check('a real click on the distance opens its field', field);
        if (field) {
          await page.typeText('300');
          await page.pressKey('Enter');
          await page.sleep(1200);
          const typed = await stack();
          const gap = typed[1].front.y - typed[0].front.top;
          check('typing 300 puts the second drawer 300 mm over the first', Math.abs(gap - 300) < 0.5,
            `gap ${gap}; pos_mm ${typed[1].pos}`);
          await shot(page, 'f06-distance-typed.png');
        }
      }
      // The clamp: a long drag DOWN stops tight on the first.
      const again = await reach(page, unit.id, front2);
      if (again) {
        await page.dragFromTo(again.x, again.y, again.x, again.y + 600, { steps: 20 });
        await page.sleep(1200);
        const low = await stack();
        check('a long drag DOWN stops tight on the first drawer (the one clamp)',
          Math.abs(low[1].front.y - low[0].front.top - 3) < 0.5, `second front ${low[1].front.y}, first top ${low[0].front.top}`);
      }
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
