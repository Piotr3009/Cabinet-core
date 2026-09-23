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

// ─── THE DRAWING WINDOW'S OWN HANDS (F3, F4) ──────────────────────────────
/** The pen, on the glass: the centre of its own cross. */
const penAt = (page) => page.ask(`(() => { const g = document.querySelector('[data-draw-pen]'); if (!g) return null;
  const a = g.querySelectorAll('line')[0].getBoundingClientRect();
  return { x: Math.round(a.left + a.width / 2), y: Math.round(a.top + a.height / 2) }; })()`);
/** A real click on the drawing, `dx, dy` pixels from the pen, the mouse coming from the pen's side. */
async function clickFromPen(page, dx, dy) {
  const p = await penAt(page);
  if (!p) return null;
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + dx * 0.66, y: p.y + dy * 0.66 });
  await page.sleep(120);
  await page.clickAt(p.x + dx, p.y + dy);
  return p;
}
/** The length field and what is in it, as the browser holds it. */
const fieldNow = (page) => page.ask(`(() => { const f = document.querySelector('[data-draw-length]');
  return f ? { focused: document.activeElement === f, value: f.value } : null; })()`);
/** The walls drawn so far, each by the length its own label prints (the solid ink lines of the path). */
const drawnWalls = (page) => page.ask(`[...document.querySelectorAll('[data-draw-canvas] line[stroke="#090A09"], [data-draw-canvas] line[stroke="#e9e4d8"]')]
  .map((l) => (l.parentNode.querySelector('text') || {}).textContent || '').map((t) => t.replace(/[^0-9]/g, ''))`);

// ═══ F3 · THE WALL LENGTH FIELD OPENS FOCUSED, ITS NUMBER SELECTED ═════════
if (runs('f3')) {
  process.stdout.write('\n─── F3 · THE WALL LENGTH FIELD, FOCUSED AND SELECTED ───\n');
  // RETAIL: the length is a label at the click (T69 F2), and that is the field.
  {
    const side = 'retail';
    const page = await open();
    await room(page);
    await page.press('[data-testid="cat-where"]');
    await page.press('[data-testid="space-edit-room"]');
    await page.press('[data-room-draw="1"]');
    await page.sleep(900);
    // 1 · a click on the drawing: the field opens with the focus and the drawn number.
    await clickFromPen(page, 180, 0);
    const f1 = await fieldNow(page);
    check(`${side} · a real click on the drawing opens the length field WITH the focus and the drawn number`,
      f1 && f1.focused && /^\d+$/.test(f1.value), JSON.stringify(f1));
    await shot(page, `f03-${side}-field-focused.png`);
    // 2 · typing replaces the whole number (it was selected), Enter commits it.
    await page.typeText('3500');
    const f2 = await fieldNow(page);
    check(`${side} · typing 3500 REPLACES the number (it was selected), no mouse`, f2 && f2.value === '3500', JSON.stringify(f2));
    await page.pressKey('Enter');
    const w1 = await drawnWalls(page);
    check(`${side} · Enter draws the typed wall`, w1.length === 1 && w1[0] === '3500', JSON.stringify(w1));
    // 3 · a click and Enter with nothing typed: the length drawn with the mouse.
    await clickFromPen(page, 0, 140);
    const f3 = await fieldNow(page);
    await page.pressKey('Enter');
    const w2 = await drawnWalls(page);
    check(`${side} · Enter with nothing typed confirms the length drawn with the mouse`,
      w2.length === 2 && f3 && w2[1] === f3.value, `field held ${f3?.value}; walls ${JSON.stringify(w2)}`);
    // 4 · Escape cancels: the field goes and no wall is drawn.
    await clickFromPen(page, -180, 0);
    await page.typeText('1234');
    await page.pressKey('Escape');
    const f4 = await fieldNow(page);
    const w3 = await drawnWalls(page);
    check(`${side} · Escape cancels: no wall is drawn from the typed number`, w3.length === 2 && (!f4 || f4.value !== '1234'),
      `walls ${JSON.stringify(w3)}; field ${JSON.stringify(f4)}`);
    check(`${side} · …and the drawing window is still open (Escape took the number, not the window)`,
      await page.has('[data-draw-room="1"]'));
    await shot(page, `f03-${side}-after-escape.png`);
    await page.close();
  }
  // PRO: the mouse AIMS and the one Wall length field on the right takes the
  // number (PRO never grew T69 F2's label at the click). The law is the same
  // field's: the focus is in it from the start, a refused number stays
  // selected so the next keys replace it, Enter draws, Escape cancels.
  {
    const side = 'pro';
    const page = await open();
    await pro(page);
    await page.press('button', 'Settings');
    await page.press('button', 'Room setup');
    await page.press('[data-room-draw="1"]');
    await page.sleep(900);
    const f0 = await fieldNow(page);
    check(`${side} · the Wall length field has the focus the moment the drawing opens`, f0 && f0.focused, JSON.stringify(f0));
    const p = await penAt(page);
    if (p) await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + 160, y: p.y });
    await page.sleep(200);
    await page.typeText('3500');
    await page.pressKey('Enter');
    const w1 = await drawnWalls(page);
    check(`${side} · typed 3500 and Enter, no mouse on the field: the wall is drawn`, w1.length === 1 && w1[0] === '3500', JSON.stringify(w1));
    const f1 = await fieldNow(page);
    check(`${side} · …and the focus stays in the field for the next wall`, f1 && f1.focused, JSON.stringify(f1));
    // A refused number stays SELECTED: the next keys replace it.
    await page.typeText('5');
    await page.pressKey('Enter');
    await page.typeText('2800');
    const f2 = await fieldNow(page);
    check(`${side} · a refused number stays selected, so typing replaces it`, f2 && f2.value === '2800', JSON.stringify(f2));
    await page.pressKey('Escape');
    const f3 = await fieldNow(page);
    check(`${side} · Escape cancels the typed number and the drawing stays open`,
      f3 && f3.value === '' && await page.has('[data-draw-room="1"]') && (await drawnWalls(page)).length === 1, JSON.stringify(f3));
    await shot(page, `f03-${side}-field.png`);
    await page.close();
  }
}

// ═══ F4 · A NEW ROOM REPLACES THE OLD ONE ══════════════════════════════════
if (runs('f4')) {
  process.stdout.write('\n─── F4 · A NEW ROOM REPLACES THE OLD ONE ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  const roomNow = () => page.ask(`(() => { const P = window.__cc.project.getState(); const r = P.project.room || {};
    return { corners: (r.corners || []).map((c) => Math.round(c.x) + ',' + Math.round(c.y)).join(' '),
      openings: (r.openings || []).length, boxes: (r.boxes || []).length,
      slopes: (P.project.wallSlopes || []).length, units: P.units.length }; })()`);
  await page.press('[data-testid="space-edit-room"]');
  await page.sleep(900);
  await page.press('[data-elevation-add="window"]');
  await page.press('[data-elevation-add="slope-right"]');
  await page.sleep(600);
  const old = await roomNow();
  check('the old room carries a window and a slope, put there by the elevation\'s own buttons',
    old.openings >= 1 && old.slopes >= 1, JSON.stringify(old));
  await page.press('[data-room-draw="1"]');
  await page.sleep(900);
  for (const [dx, dy, mm] of [[180, 0, 3600], [0, 140, 2800], [-180, 0, 3600]]) {
    await clickFromPen(page, dx, dy);
    await page.typeText(String(mm));
    await page.pressKey('Enter');
  }
  await page.press('[data-draw-close="1"]');
  await page.press('[data-draw-save="1"]');
  await page.sleep(1500);
  const fresh = await roomNow();
  check('a drawn room REPLACES the old: its window and slope are gone, the cabinet stays',
    fresh.openings === 0 && fresh.slopes === 0 && fresh.boxes === 0 && fresh.units === old.units
      && fresh.corners === '0,0 3600,0 3600,2800 0,2800',
    `${JSON.stringify(old)} -> ${JSON.stringify(fresh)}`);
  const underneath = await page.has('[data-room-apply="1"]');
  check('the room window is not left open under the drawing with the old outline', !underneath);
  await shot(page, 'f04-new-room.png');
  await page.close();
}

// ═══ F5 · SETUP ROOM "3 WALLS" IS A U ════════════════════════════════════
if (runs('f5')) {
  process.stdout.write('\n─── F5 · 3 WALLS IS A U: LEFT, FRONT, RIGHT ───\n');
  for (const side of ['pro', 'retail']) {
    const page = await open();
    if (side === 'pro') {
      await pro(page);
      await page.press('button', 'Settings');
      await page.press('button', 'Room setup');
    } else {
      await room(page);
      await page.press('[data-testid="cat-where"]');
      await page.press('[data-testid="space-edit-room"]');
    }
    await page.press('[data-room-walls="three"]');
    if (await page.has('[data-room-apply="1"]')) await page.press('[data-room-apply="1"]');
    await page.sleep(1500);
    if (side === 'retail') await roomView(page);
    // What the scene draws: each wall group's centre and length, and on which
    // side of the room the camera stands.
    const seen = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const out = [];
      v.scene.traverse((o) => { if (!o.userData || o.userData.ccWall == null) return;
        const b = new T.Box3().setFromObject(o); if (b.isEmpty()) return;
        const c = b.getCenter(new T.Vector3()); const s = b.getSize(new T.Vector3());
        out.push({ x: c.x * 1000, z: c.z * 1000, len: Math.max(s.x, s.z) * 1000 }); });
      const cam = v.camera.position; return { walls: out, cam: { x: cam.x * 1000, z: cam.z * 1000 } }; })()`);
    const scope = await page.ask('(window.__cc.project.getState().project.design || {}).scope || null');
    // A FULL wall spans its side of the room; the returns on the open side are shorter (T51's stubs).
    const xs = seen.walls.map((w) => w.x); const zs = seen.walls.map((w) => w.z);
    const spanX = Math.max(...xs) - Math.min(...xs); const spanZ = Math.max(...zs) - Math.min(...zs);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    const alongX = (w) => Math.abs(w.z - cz) > Math.abs(w.x - cx);
    const long = seen.walls.filter((w) => w.len >= 0.95 * (alongX(w) ? spanX : spanZ));
    // The room's four sides, as a compass from its centre; the camera's side is the one it looks in from.
    const sideOf = (x, z) => (Math.abs(x - cx) > Math.abs(z - cz) ? (x > cx ? 'right' : 'left') : (z > cz ? 'near' : 'far'));
    const sides = long.map((w) => sideOf(w.x, w.z)).sort();
    const camSide = sideOf(seen.cam.x, seen.cam.z);
    check(`${side} · 3 WALLS draws a U: the far wall, the right and the LEFT; the side the camera looks in from is open`,
      scope === 'three' && long.length === 3 && !sides.includes(camSide)
        && ['far', 'left', 'right'].every((k) => sides.includes(k)) && camSide === 'near',
      `scope ${scope}; full walls ${JSON.stringify(sides)}; returns ${seen.walls.length - long.length}; camera on the ${camSide} side`);
    await shot(page, `f05-${side}-three-walls-u.png`);
    await page.close();
  }
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

// ═══ F7 · ADD WALL UNIT, FOR WARDROBES ═════════════════════════════════════
/** A dimension figure's pixel: the pick box of row `key` in the chain named `chain`. */
const figureAt = (page, chain, key) => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three;
  let group = null; v.scene.traverse((o) => { if (!group && o.userData && o.userData.ccDimensionChain === ${JSON.stringify(chain)}) group = o; });
  if (!group) return null; let m = null;
  group.traverse((o) => { if (!m && o.userData && o.userData.ccDimensionPick === ${JSON.stringify(key)}) m = o; });
  if (!m) return null; m.updateMatrixWorld(true);
  const c = new T.Box3().setFromObject(m).getCenter(new T.Vector3()).project(v.camera);
  if (c.z > 1) return null; const r = v.gl.domElement.getBoundingClientRect();
  return { x: Math.round(r.left + (c.x + 1) / 2 * r.width), y: Math.round(r.top + (1 - c.y) / 2 * r.height) }; })()`);
const wallUnitState = (page) => page.ask(`(() => { const P = window.__cc.project.getState(); const prof = window.__cc.profile.getState().profile;
  const gap0 = (prof && prof.room && prof.room.wallBackClearance) || 0;
  const pick = (u) => u && ({ id: u.id, type: u.type, num: u.params.unit_num, x: u.position.x_mm, wall: u.position.wall ?? 0,
    w: u.params.width, h: u.params.height, d: u.params.depth, mount: u.params.mount_height ?? null,
    gap: u.params.wall_gap ?? gap0, align: u.params.depth_align || 'back',
    ep: (u.params.end_panels || []).map((e) => e.side).sort().join('') });
  const w = P.units.find((u) => u.type === 'WARDROBE'); const h = P.units.find((u) => u.type === 'WARDROBE_WALL');
  return { wardrobe: pick(w), wall: pick(h) }; })()`);

if (runs('f7')) {
  process.stdout.write('\n─── F7 · ADD WALL UNIT ───\n');
  // ── RETAIL: EXTRAS' own button ──────────────────────────────────────────
  {
    const page = await open();
    await room(page);
    await withWardrobe(page);
    const before = await wallUnitState(page);
    await page.press('[data-testid="cat-extras"]');
    await page.press('[data-testid="extras-add-wall-unit"]');
    await page.sleep(1500);
    const after = await wallUnitState(page);
    // The two carcass TOPS as the scene draws them: the world top of each one's TOP board.
    const tops = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const out = {};
      v.scene.traverse((o) => { if (!o.isMesh || !o.userData || o.userData.ccPanelId !== 'TOP') return;
        let a = o; while (a && !(a.userData && a.userData.ccUnitId)) a = a.parent; if (!a) return;
        const b = new T.Box3().setFromObject(o); out[a.userData.ccUnitId] = Math.round(b.max.y * 10000) / 10; });
      return out; })()`);
    check('retail · EXTRAS\' ADD WALL UNIT hangs a wall unit (its own type) on the wardrobe\'s wall',
      after.wall && after.wall.type === 'WARDROBE_WALL' && after.wall.wall === after.wardrobe.wall, JSON.stringify(after.wall));
    check('retail · …beside the wardrobe, as deep as it', after.wall && after.wall.d === after.wardrobe.d
      && (after.wall.x >= after.wardrobe.x + after.wardrobe.w || after.wall.x + after.wall.w <= after.wardrobe.x),
      `wardrobe x${after.wardrobe.x} w${after.wardrobe.w} d${after.wardrobe.d}; wall unit x${after.wall?.x} d${after.wall?.d}`);
    check('retail · …and its TOP is level with the wardrobe\'s',
      after.wall && tops[after.wall.id] != null && Math.abs(tops[after.wall.id] - tops[after.wardrobe.id]) < 0.5,
      `carcass tops in the scene: wardrobe ${tops[after.wardrobe.id]} mm, wall unit ${tops[after.wall?.id]} mm`);
    check('retail · the wardrobe\'s side KEEPS its panel beside the wall unit', before.wardrobe.ep === after.wardrobe.ep,
      `end panels ${before.wardrobe.ep} -> ${after.wardrobe.ep}`);
    await roomView(page);
    await shot(page, 'f07-retail-wall-unit.png');
    // Its three figures, by the real 2klik.
    const id = after.wall.id;
    const edit = async (chain, key, typed, what) => {
      let at = await figureAt(page, chain, key);
      if (!at) { await orbit(page, 120, 0); at = await figureAt(page, chain, key); }
      if (!at) { check(`retail · the ${what} figure is on the screen`, false, `${chain}/${key} not drawn in view`); return null; }
      // Where the caret goes, recorded while it happens, so a miss says who took it.
      await page.ask(`(() => { window.__t74fo = []; if (!window.__t74foOn) { window.__t74foOn = true;
        const log = (kind) => (e) => (window.__t74fo || []).push(kind + ':' + ((e.target && e.target.getAttribute && (e.target.getAttribute('data-testid') || e.target.getAttribute('id'))) || (e.target && e.target.tagName) || '?'));
        document.addEventListener('focusout', log('out'), true); document.addEventListener('focusin', log('in'), true); } return true; })()`);
      await page.dblclick(at.x, at.y);
      // The hand waits for the window to stand before it types, as a person does.
      for (let i = 0; i < 30; i += 1) {
        if (await page.ask('Boolean(document.activeElement && document.activeElement.closest && document.activeElement.closest(\'[data-unit-size]\'))')) break;
        await page.sleep(100);
      }
      const open = await page.ask('window.__cc.ui.getState().modal || null');
      const focused = await page.ask(`(() => { const a = document.activeElement; return a ? (a.getAttribute('data-unit-size-width') ? 'width' : a.getAttribute('data-unit-size-height') ? 'height' : a.getAttribute('data-unit-size-depth') ? 'depth' : a.tagName) : null; })()`);
      const args = await page.ask('JSON.stringify((window.__cc.ui.getState().modalArgs || {}).field || null)');
      check(`retail · a real 2klik on its ${what} figure opens the size window, ${what} focused`, open === 'unit-size' && focused === what,
        `modal ${open} for ${args}; focus ${focused}; clicked ${at.x},${at.y}${focused === what ? '' : `; caret ${await page.ask('JSON.stringify(window.__t74fo)')}`}`);
      if (open === 'unit-size' && typed != null) {
        await page.typeText(String(typed));
        await page.pressKey('Enter');
        await page.sleep(900);
      }
      return open;
    };
    await edit(`w-${id}`, 'w', 500, 'width');
    let s1 = await wallUnitState(page);
    check('retail · …typed 500: the width is 500', s1.wall.w === 500, `w ${s1.wall.w}`);
    await edit(`h-${id}`, 'h', 600, 'height');
    s1 = await wallUnitState(page);
    check('retail · …typed 600: the height is 600', s1.wall.h === 600, `h ${s1.wall.h}`);
    await edit(`d-${id}`, 'd', 350, 'depth');
    s1 = await wallUnitState(page);
    check('retail · …typed 350: the depth is 350, its back still on the wardrobe\'s line (BACK)', s1.wall.d === 350 && s1.wall.gap === s1.wardrobe.gap,
      `d ${s1.wall.d}; gap ${s1.wall.gap} vs wardrobe ${s1.wardrobe.gap}`);
    const opened = await edit(`d-${id}`, 'd', null, 'depth');
    if (opened === 'unit-size') {
      await page.press('[data-unit-size-align-to="front"]');
      const s2 = await wallUnitState(page);
      check('retail · FRONT: its front stands on the wardrobe\'s front line',
        s2.wall.align === 'front' && s2.wall.gap + s2.wall.d === s2.wardrobe.gap + s2.wardrobe.d,
        `gap ${s2.wall.gap} + d ${s2.wall.d} vs ${s2.wardrobe.gap} + ${s2.wardrobe.d}`);
      await shot(page, 'f07-retail-front-aligned.png');
      await page.press('[data-unit-size-align-to="back"]');
      const s3 = await wallUnitState(page);
      check('retail · BACK: its back returns to the wardrobe\'s back line', s3.wall.align === 'back' && s3.wall.gap === s3.wardrobe.gap,
        `gap ${s3.wall.gap}`);
    }
    await page.close();
  }
  // ── PRO: the library's wardrobe category ───────────────────────────────
  {
    const page = await open();
    await pro(page);
    const openWardrobes = async () => {
      await page.press('button', 'Library');
      await page.press('button', 'Wardrobes');
      await page.sleep(500);
      if (!(await page.has('[data-library-entry="WARDROBE"]')) && await page.has('[data-library-show-all="1"]')) {
        await page.press('[data-library-show-all="1"]');
      }
    };
    await openWardrobes();
    await page.press('[data-library-entry="WARDROBE"]');
    await page.sleep(1200);
    if (!(await page.has('[data-library-entry="WARDROBE_WALL"]'))) await openWardrobes();
    const listed = await page.has('[data-library-entry="WARDROBE_WALL"]');
    check('pro · the library\'s wardrobe category lists the wall unit', listed);
    if (listed) {
      await page.press('[data-library-entry="WARDROBE_WALL"]');
      await page.sleep(1500);
      const s = await wallUnitState(page);
      check('pro · added from the library beside the selected wardrobe: as deep as it, its top level with it',
        s.wall && s.wall.d === s.wardrobe.d && s.wall.wall === s.wardrobe.wall
          && (s.wall.x >= s.wardrobe.x + s.wardrobe.w || s.wall.x + s.wall.w <= s.wardrobe.x),
        JSON.stringify(s));
      await shot(page, 'f07-pro-library.png');
    }
    await page.close();
  }
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
