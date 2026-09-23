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
  showroomDown, localBox,
} from './t74-harness.mjs';
import { decodePng, regionLuminance } from './png.mjs';

const SHOTS = new URL('../verify/t74/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
// The app's older sentences (a store refusal quoted in a detail) carry en and
// em dashes; the ledger quotes them exactly with the dash ESCAPED, so the file
// this turn writes stays dash-free (CLAUDE.md LAWS) and the quote stays true.
const undash = (t) => String(t).replace(/\u2014/g, '\\u2014').replace(/\u2013/g, '\\u2013');
const check = (label, ok, detail = '') => {
  detail = undash(detail);
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` · ${detail}` : ''}\n`);
};
const note = (label, detail = '') => {
  detail = undash(detail);
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

// ═══ F2 · FELT: WINE RED, IN THE ROOM LIGHT ═══════════════════════════════
// *"red raczej zrób kolor wine red, nie krzykliwa czerwień."*  CLAUDE.md: the
// frame of the open tray in the room light must read as wine, not as red. The
// felt's pixels are sampled where the scene's own raycaster says the base is
// the nearest thing, and read as a colour: red leading, and DARK (a wine), not
// bright (a loud red).
if (runs('f2')) {
  process.stdout.write('\n─── F2 · THE WINE FELT, IN THE ROOM LIGHT ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // The accessories drawer goes ON TOP of a stack (*"dodajesz normalne
  // szuflady i później masz..."*), so the drawers first, by INSIDE's own Add.
  await page.press('[data-testid="cat-inside"]');
  await page.press('[data-add-kind="drawers"]');
  await page.click('[data-add-items="1"] button.pbi-re-btn-gold', 'Add', { exact: true });
  await page.sleep(1500);
  await page.press('[data-add-kind="watch_drawer"]');
  await page.press('[data-add-watch-drawer="1"]');
  await page.sleep(1500);
  const [unit] = await unitsNow(page);
  const ids = await page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(unit.id)});
    const base = r.panels.find((p) => p.part === 'WATCH-BASE'); if (!base) return null;
    const n = base.meta && base.meta.drawer;
    const front = r.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta && p.meta.drawer === n);
    return { base: base.id, front: front ? front.id : null }; })()`);
  check('an accessories drawer through INSIDE\'s own button', Boolean(ids && ids.front), JSON.stringify(ids));
  if (ids && ids.front) {
    const at = await reach(page, unit.id, ids.front);
    if (at) await page.dblclick(at.x, at.y);
    await page.sleep(1600);
    const win = '[data-editor="watch-layout"] ';
    check('a real 2klik on its front opens its window', await page.has('[data-editor="watch-layout"]'),
      at ? `clicked ${Math.round(at.x)},${Math.round(at.y)}` : 'front not in reach');
    if (await page.has(`${win}[data-watch-finish="felt"]`)) {
      await page.press(`${win}[data-watch-finish="felt"]`);
      await page.sleep(800);
      const chip = await page.ask(`(() => { const el = document.querySelector('${win}[data-watch-felt="red"]');
        return el ? (el.getAttribute('title') || el.getAttribute('aria-label') || el.textContent || '').trim() : null; })()`);
      check('the chip that was "Red" reads Wine red', /wine red/i.test(chip || ''), chip);
      await page.press(`${win}[data-watch-felt="red"]`);
      await page.sleep(900);
      await shot(page, 'f02-wine-chip.png');
    }
    const said = await page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(unit.id)});
      const base = r.panels.find((p) => p.part === 'WATCH-BASE');
      return { felt: base && base.meta ? base.meta.watch_felt || null : null, bom: JSON.stringify(r).includes('Wine red felt base') }; })()`);
    check('the base wears the felt `red` (the id saved jobs keep), and the BOM reads "Wine red felt base"',
      said.felt === 'red' && said.bom, JSON.stringify(said));
    await page.pressKey?.('Escape');
    await page.sleep(700);
    // The 2klik that opened the window also slid the drawer out (a front
    // keeps its slide), and the doors stand open. The tray OPEN, in the room
    // light: the room camera (the FRONT preset would shut every front), the
    // slide let finish on the frame clock, a real click on the empty floor
    // (the client's own way of letting go; the ledger says whether it did),
    // and the camera raised a little at a time until it looks into the tray.
    const open = await page.ask(`((window.__cc.ui.getState().openFronts || {})[${JSON.stringify(unit.id)}] || {})[${JSON.stringify(ids.front)}] || 0`);
    check('the same 2klik slid the tray out', open > 0, `open ${open}`);
    let last = null;
    for (let t = 0; t < 30; t += 1) {
      await page.sleep(400);
      const b = await localBox(page, unit.id, ids.base);
      if (last && b && Math.abs(b.z[1] - last.z[1]) < 0.5) break;
      last = b;
    }
    const empty = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three;
      const r = v.gl.domElement.getBoundingClientRect(); const ray = new T.Raycaster();
      for (const fy of [0.92, 0.85, 0.2]) for (const fx of [0.9, 0.1, 0.8, 0.2]) {
        ray.setFromCamera(new T.Vector2(fx * 2 - 1, -(fy * 2 - 1)), v.camera);
        const hit = ray.intersectObjects(v.scene.children, true).find((h) => h.object.isMesh && h.object.visible);
        let unit = false; for (let a = hit && hit.object; a; a = a.parent) { if (a.userData && a.userData.ccUnitId) unit = true; }
        if (!unit) return { x: Math.round(r.left + fx * r.width), y: Math.round(r.top + fy * r.height) };
      }
      return null; })()`);
    if (empty) await page.clickAt(empty.x, empty.y);
    await page.sleep(900);
    note('let go by a real click on the empty floor', `selected ${await page.ask('JSON.stringify(window.__cc.ui.getState().selectedUnitId || null)')}; tray out to z ${last ? last.z[1] : '?'}`);
    let spot = null;
    for (const dy of [40, 40, 40]) {
      await orbit(page, 0, dy);
      spot = await pointOn(page, unit.id, ids.base);
      if (spot) break;
    }
    const path = `${SHOTS}f02-wine-felt.png`;
    await page.screenshot(path);
    const seen = spot ? await pointOn(page, unit.id, ids.base, { all: true, grid: 60 }) : null;
    if (!seen) {
      check('the open tray\'s felt is in sight of the room camera', false);
    } else {
      // Every pixel of the tray where the felt is the nearest thing, read one
      // by one, and the MEDIAN taken (the lit felt, not a pocket's shadow).
      const png = decodePng(readFileSync(path));
      const px = seen.points.map(({ x, y }) => {
        const i = (y * png.width + x) * png.channels;
        return [png.data[i], png.data[i + 1], png.data[i + 2]];
      });
      const med = (k) => { const v = px.map((q) => q[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
      const [r, g, b] = [med(0), med(1), med(2)];
      const mx = Math.max(r, g, b) / 255; const mn = Math.min(r, g, b) / 255;
      const light = (mx + mn) / 2;
      const hue = mx === mn ? 0 : (r / 255 === mx ? ((g - b) / 255 / (mx - mn) + 6) % 6 : 0) * 60;
      const redLeads = r > g * 1.3 && r > b * 1.2 && (hue >= 330 || hue <= 20);
      check('the open tray\'s felt in the room light reads as WINE: red leads, and dark (lightness under 35 %), not a loud red',
        redLeads && light < 0.35, `median of ${px.length} felt pixels rgb(${r}, ${g}, ${b}) · hue ${Math.round(hue)} · lightness ${Math.round(light * 100)} %`);
    }
  }
  await page.close();
}

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
    // The two carcass TOPS as the scene draws them: the world top of each one's
    // TOP board, read once the new unit's meshes stand where they will stand
    // (two reads 400 ms apart agree; a fresh mesh draws a frame at its origin).
    const readTops = () => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const out = {};
      v.scene.traverse((o) => { if (!o.isMesh || !o.userData || o.userData.ccPanelId !== 'TOP') return;
        let a = o; while (a && !(a.userData && a.userData.ccUnitId)) a = a.parent; if (!a) return;
        a.updateMatrixWorld(true);
        const b = new T.Box3().setFromObject(o); out[a.userData.ccUnitId] = Math.round(b.max.y * 10000) / 10; });
      return out; })()`);
    let tops = await readTops();
    for (let t = 0; t < 20; t += 1) {
      await page.sleep(400);
      const again = await readTops();
      const same = after.wall && again[after.wall.id] != null && again[after.wall.id] === tops[after.wall.id];
      tops = again;
      if (same) break;
    }
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

// ═══ F8 · THE SLOPED SHOE DRAWER BOTTOM TRAVELS WITH ITS DRAWER ═══════════
if (runs('f8')) {
  process.stdout.write('\n─── F8 · THE SHOE RAMP TRAVELS WITH ITS DRAWER ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.press('[data-testid="cat-inside"]');
  await page.press('[data-add-kind="shoe_box"]');
  await page.press('[data-add-shoe-box="1"]');
  await page.sleep(1500);
  const [unit] = await unitsNow(page);
  const ids = await page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(unit.id)});
    const ramp = r.panels.find((p) => p.part === 'SHOE-RAMP'); if (!ramp) return null; const n = ramp.meta.drawer;
    const pick = (f) => (r.panels.find(f) || {}).id || null;
    return { ramp: ramp.id, floor: pick((p) => p.part === 'DRAWER-BOTTOM' && p.meta && p.meta.drawer === n),
      front: pick((p) => p.part === 'DRAWER-FRONT' && p.meta && p.meta.drawer === n) }; })()`);
  check('a shoe drawer through INSIDE\'s own button, with its ramp', Boolean(ids), JSON.stringify(ids));
  if (ids) {
    const doorsOpen = await page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(unit.id)});
      const o = (window.__cc.ui.getState().openFronts || {})[${JSON.stringify(unit.id)}] || {};
      return r.panels.filter((p) => p.part === 'FRONT').every((p) => (o[p.id] || 0) > 0); })()`);
    if (!doorsOpen && await page.has('[data-testid="view-open-all"]')) await page.press('[data-testid="view-open-all"]');
    await page.sleep(1500);
    const shut = { ramp: await localBox(page, unit.id, ids.ramp), floor: await localBox(page, unit.id, ids.floor) };
    check('shut: the ramp stands ON its drawer floor, not through it',
      shut.ramp && shut.floor && shut.ramp.y[0] >= shut.floor.y[1] - 1, `ramp low ${shut.ramp?.y[0]}, floor top ${shut.floor?.y[1]}`);
    const at = await reach(page, unit.id, ids.front);
    if (!at) {
      check('the shoe drawer\'s front is in reach of the pointer', false);
    } else {
      // The drawer slides on the frame clock (about 400 ms a frame headless,
      // slower still under load), so the walk waits for it to come to rest,
      // up to 12 s, instead of reading it at a fixed moment.
      const rest = async (done) => {
        let last = null;
        for (let t = 0; t < 30; t += 1) {
          await page.sleep(400);
          const now = { ramp: await localBox(page, unit.id, ids.ramp), floor: await localBox(page, unit.id, ids.floor) };
          if (last && done(now) && Math.abs(now.floor.z[1] - last.floor.z[1]) < 0.5) return now;
          last = now;
        }
        return last;
      };
      await page.dblclick(at.x, at.y);
      const open = await rest((b) => b.floor.z[1] - shut.floor.z[1] > 200);
      const rampOut = open.ramp.z[1] - shut.ramp.z[1];
      const floorOut = open.floor.z[1] - shut.floor.z[1];
      check('a real 2klik opens the drawer: the ramp comes out WITH it, as far as its floor',
        floorOut > 200 && Math.abs(rampOut - floorOut) < 2, `floor out ${Math.round(floorOut)} mm, ramp out ${Math.round(rampOut)} mm`);
      check('…and, open, it is still on its floor', open.ramp.y[0] >= open.floor.y[1] - 1,
        `ramp low ${open.ramp.y[0]}, floor top ${open.floor.y[1]}`);
      await shot(page, 'f08-open.png');
      const back = (await reach(page, unit.id, ids.front)) || at;
      await page.dblclick(back.x, back.y);
      const again = (await rest((b) => Math.abs(b.floor.z[1] - shut.floor.z[1]) < 2)).ramp;
      check('a second 2klik shuts it, and the ramp goes back in with it',
        Math.abs(again.z[1] - shut.ramp.z[1]) < 2, `ramp front ${again.z[1]} (shut ${shut.ramp.z[1]})`);
    }
  }
  await page.close();
}

// ═══ F11 · OUT OF THE CORNER, THE DOORS AND THE DIVIDER COME BACK ═════════
if (runs('f11')) {
  process.stdout.write('\n─── F11 · PULLED AWAY FROM THE CORNER ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.press('[data-testid="space-edit-room"]');
  await page.press('[data-elevation-add="slope-right"]');
  await page.sleep(500);
  if (await page.has('[data-room-apply="1"]')) await page.press('[data-room-apply="1"]');
  await page.sleep(800);
  if (await page.has('[data-modal-name="room"]')) await page.pressKey('Escape');
  await page.sleep(600);
  const [unit] = await unitsNow(page);
  const state = () => page.ask(`(() => { const P = window.__cc.project.getState(); const u = P.units.find((x) => x.id === ${JSON.stringify(unit.id)});
    const r = P.unitResult(u.id); const leaves = r.panels.filter((p) => p.part === 'FRONT');
    const items = (u.params.sections && u.params.sections[0] && u.params.sections[0].items) || [];
    return { x: Math.round(u.position.x_mm), doors: JSON.stringify(u.params.doors), bay: JSON.stringify(u.params.bay_doors ?? null),
      hinges: leaves.map((p) => (p.meta.hinge || '?') + (p.meta.hingeForced ? '!' : '')).join(' '),
      partitions: items.filter((i) => i.kind === 'partition').length, record: Boolean(u.params.slope_door_auto) }; })()`);
  const leafOf = () => page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(unit.id)});
    const f = r.panels.filter((p) => p.part === 'FRONT'); return f.length ? f[0].id : null; })()`);
  const before = await state();
  let leaf = await leafOf();
  let at = leaf ? await pointOn(page, unit.id, leaf) : null;
  if (!at) {
    check('a door leaf under the pointer', false);
  } else {
    await page.dragFromTo(at.x, at.y, at.x + 700, at.y, { steps: 30 });
    await page.sleep(1200);
    const inCorner = await state();
    check('a real drag into the corner: the automat forces the hinge and adds the door partition (as before)',
      inCorner.x > before.x && inCorner.hinges.includes('!') && inCorner.partitions > 0 && inCorner.record,
      `${JSON.stringify(before)} -> ${JSON.stringify(inCorner)}`);
    await shot(page, 'f11-in-the-corner.png');
    leaf = await leafOf();
    at = leaf ? await reach(page, unit.id, leaf) : null;
    if (at) {
      await page.dragFromTo(at.x, at.y, at.x - 900, at.y, { steps: 30 });
      await page.sleep(1200);
      const out = await state();
      check('a real drag back out: the doors, their hinge sides and the partition are as they were before the corner',
        out.x < inCorner.x && out.doors === before.doors && out.bay === before.bay && out.hinges === before.hinges
          && out.partitions === before.partitions && !out.record,
        `${JSON.stringify(inCorner)} -> ${JSON.stringify(out)}`);
      await shot(page, 'f11-pulled-away.png');
    } else {
      check('the door leaf in reach after the push', false);
    }
  }
  await page.close();
}

// ═══ F12 · THE J-PULL IS SEEN, ALWAYS ══════════════════════════════════════
if (runs('f12')) {
  process.stdout.write('\n─── F12 · THE J GROOVE ON THE GLASS ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.press('[data-testid="cat-extras"]');
  if (!(await page.ask('(() => { const u = window.__cc.project.getState().units[0]; return Boolean(u && u.params.doors); })()'))) {
    await page.press('[data-testid="extras-add-doors"]');
  }
  await page.press('[data-testid="extras-handle-jpull"]');
  await page.sleep(1500);
  const [unit] = await unitsNow(page);
  const patches = () => page.ask(`(() => { const P = window.__cc.project.getState(); const r = P.unitResult(${JSON.stringify(unit.id)});
    const leaf = r.panels.find((p) => p.part === 'FRONT' && p.cnc && p.cnc.jpull && p.cnc.jpull.edge); if (!leaf) return null;
    const v = window.__cc.views.room; const T = v.three; let mesh = null; let unitG = null;
    v.scene.traverse((o) => { if (o.userData && o.userData.ccUnitId === ${JSON.stringify(unit.id)}) unitG = o; });
    if (unitG) unitG.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === leaf.id) mesh = o; });
    if (!mesh) return null;
    const jp = leaf.meta.jpull || {}; const b = leaf.box;
    const from = ((jp.run && jp.run.from) != null ? jp.run.from : 0) - b.h / 2;
    const to = ((jp.run && jp.run.to) != null ? jp.run.to : b.h) - b.h / 2;
    const edgeX = jp.edge === 'L' ? -b.w / 2 : (jp.edge === 'R' ? b.w / 2 : 0);
    const inward = jp.edge === 'L' ? 1 : -1; const zFace = b.d / 2;
    mesh.updateMatrixWorld(true);
    const r0 = v.gl.domElement.getBoundingClientRect();
    const scr = (x, y, z) => { const p = new T.Vector3(x / 1000, y / 1000, z / 1000).applyMatrix4(mesh.matrixWorld).project(v.camera);
      return { x: r0.left + (p.x * 0.5 + 0.5) * r0.width, y: r0.top + (-p.y * 0.5 + 0.5) * r0.height }; };
    const rect = (x0, x1, y0, y1, z) => { const pts = [scr(x0, y0, z), scr(x1, y0, z), scr(x0, y1, z), scr(x1, y1, z)];
      const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
    const mid0 = from + (to - from) * 0.2; const mid1 = from + (to - from) * 0.8;
    const g0 = edgeX + inward * 6; const g1 = edgeX + inward * 26; const f0 = edgeX + inward * 60; const f1 = edgeX + inward * 120;
    return { groove: rect(Math.min(g0, g1), Math.max(g0, g1), mid0, mid1, zFace), face: rect(Math.min(f0, f1), Math.max(f0, f1), mid0, mid1, zFace),
      cast: mesh.castShadow, receive: mesh.receiveShadow }; })()`);
  const seen = async (condition, file) => {
    await page.sleep(1300);
    const p = await patches();
    const path = `${SHOTS}${file}`;
    await page.screenshot(path);
    if (!p) { check(`${condition}: the J leaf is drawn`, false); return; }
    const png = decodePng(readFileSync(path));
    const g = regionLuminance(png, p.groove);
    const f = regionLuminance(png, p.face);
    const contrast = f.mean ? Math.abs(f.mean - g.mean) / f.mean : 0;
    check(`${condition}: the groove reads against its door (at least 10 % apart), and the door takes the scene's shadows`,
      contrast >= 0.1 && p.cast && p.receive, `groove ${g.mean}, face ${f.mean}, ${Math.round(contrast * 1000) / 10} %`);
  };
  await page.press('[data-testid="view-front"]');
  await seen('doors shut, front camera', 'f12-shut.png');
  await page.press('[data-testid="view-open-all"]');
  await page.sleep(1600);
  await page.press('[data-testid="view-open-all"]');
  await page.sleep(1600);
  await seen('shut again (OPEN ALL twice)', 'f12-shut-again.png');
  await roomView(page);
  await orbit(page, 90, 0);
  await seen('the room camera, after a real orbit', 'f12-orbit.png');
  await page.close();
}

// ═══ F13 · THE FREE PANEL, "INSERT PANEL" ═════════════════════════════════
if (runs('f13')) {
  process.stdout.write('\n─── F13 · INSERT PANEL ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  const panels = () => page.ask(`window.__cc.project.getState().units.filter((u) => u.type === 'FREE_PANEL')
    .map((u) => ({ id: u.id, num: u.params.unit_num, x: u.position.x_mm, w: u.params.width, h: u.params.height, d: u.params.depth,
      m: u.params.mount_height, facing: u.params.panel_facing, tilt: u.params.panel_tilt_deg }))`);
  await page.press('[data-testid="cat-extras"]');
  await page.press('[data-testid="extras-insert-panel"]');
  await page.sleep(1500);
  let fps = await panels();
  const sel = await page.ask('JSON.stringify(window.__cc.ui.getState().selectedElement)');
  check('INSERT PANEL (EXTRAS\' real button) puts one board in the room, selected, its menu on the right',
    fps.length === 1 && /"FP"/.test(sel) && await page.has('[data-free-panel-orientation]'),
    `${JSON.stringify(fps)}; selected ${sel}`);
  // Its orientation, by the menu's own chip.
  await page.press('[data-free-panel-facing="across"]');
  await page.sleep(900);
  fps = await panels();
  check('a real click on ACROSS THE WALL turns it across the wall (a side, 18 wide, its length out into the room)',
    fps[0].facing === 'across' && fps[0].w === 18 && fps[0].d === 800, JSON.stringify(fps[0]));
  // A second one, laid flat. The walk waits for the second board (up to 8 s)
  // before it touches the menu, so HORIZONTAL is pressed on the NEW board; if
  // none comes, what stood under the pointer is written down.
  const under = await page.ask(`(() => { const el = document.querySelector('[data-testid="extras-insert-panel"]');
    if (!el) return 'no button'; const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return top === el || el.contains(top) ? 'the button' : (top ? top.outerHTML.slice(0, 120) : 'nothing'); })()`);
  await page.press('[data-testid="extras-insert-panel"]');
  for (let t = 0; t < 20 && (await panels()).length < 2; t += 1) await page.sleep(400);
  if ((await panels()).length < 2) note('the second INSERT PANEL did not land; under the pointer', under);
  await page.press('[data-free-panel-tilt-to="90"]');
  await page.sleep(900);
  fps = await panels();
  const flat = fps.find((f) => f.tilt === 90);
  check('a second INSERT PANEL, and HORIZONTAL lays it flat', fps.length === 2 && flat && flat.h === 18,
    JSON.stringify(fps));
  await roomView(page);
  // Moved UP by its floor figure (the T73 F3 field): click, type, Enter.
  if (flat) {
    const fig = await figureAt(page, `free-panel-${flat.id}`, 'fp-floor');
    if (!fig) {
      check('the flat panel\'s floor figure is on the screen', false, 'not drawn in view');
    } else {
      await page.clickAt(fig.x, fig.y);
      await page.sleep(500);
      const field = await page.has('[data-spacing-field="fp-floor"]');
      check('a real click on its floor figure opens the field', field);
      if (field) {
        await page.typeText('400');
        await page.pressKey('Enter');
        await page.sleep(1000);
        const after = (await panels()).find((f) => f.id === flat.id);
        check('typing 400 raises it 400 mm off the floor', after.m === 400, JSON.stringify(after));
      }
    }
    await shot(page, 'f13-two-panels.png');
    // THE PROPOSAL: a real drag of the flat panel toward the upright one; the
    // store is READ each step to know when a drop would be caught.
    const upright = (await panels()).find((f) => f.id !== flat.id);
    const at = await reach(page, flat.id, 'FP');
    if (!at) {
      check('the flat panel is in reach of the pointer', false);
    } else {
      const drag = async ({ alt }) => {
        const start = await reach(page, flat.id, 'FP');
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x, y: start.y });
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: start.x, y: start.y, button: 'left', clickCount: 1, buttons: 1 });
        let proposal = null; let drawn = false; let x = start.x;
        for (let i = 0; i < 200 && !proposal; i += 1) {
          x -= 3;
          await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: start.y, button: 'left', buttons: 1 });
          await page.sleep(60);
          proposal = await page.ask(`window.__cc.project.getState().freePanelProposal(${JSON.stringify(flat.id)})`);
        }
        await page.sleep(300);
        drawn = await page.ask(`(() => { let n = 0; window.__cc.views.room.scene.traverse((o) => { if (o.userData && o.userData.ccSnapProposal != null) n += 1; }); return n; })()`);
        const before = (await panels()).find((f) => f.id === flat.id).x;
        if (!alt) await shot(page, 'f13-snap-proposal.png');
        await page.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased', x, y: start.y, button: 'left', clickCount: 1, buttons: 0, modifiers: alt ? 1 : 0,
        });
        await page.sleep(900);
        const after = (await panels()).find((f) => f.id === flat.id).x;
        return { proposal, drawn, before, after };
      };
      const took = await drag({ alt: false });
      check('dragged near the upright one, the scene draws the PROPOSAL (the panel stays under the hand)',
        took.proposal && took.drawn > 0 && took.before !== took.proposal.left,
        `proposal ${JSON.stringify(took.proposal)}; lines ${took.drawn}; x under the hand ${took.before}`);
      check('…and the drop TAKES it: the panel is caught on the edge', took.proposal && Math.abs(took.after - took.proposal.left) < 0.6,
        `x ${took.before} -> ${took.after}`);
      // Brought back with Alt held on the drop.

      const refused = await drag({ alt: true });
      check('the same drag dropped with Alt held REFUSES it: the panel stays where the hand left it',
        refused.proposal && Math.abs(refused.after - refused.before) < 0.6 && Math.abs(refused.after - refused.proposal.left) > 0.6,
        `proposal ${JSON.stringify(refused.proposal)}; x ${refused.before} -> ${refused.after}`);
      note('the upright panel it was caught on', JSON.stringify(upright));
    }
    // 2KLIK: PRO's own piece editor.
    const board = await reach(page, flat.id, 'FP');
    if (board) {
      await page.dblclick(board.x, board.y);
      await page.sleep(2500);
      const open = await page.ask('window.__cc.ui.getState().modal || null');
      check('a real 2klik on the board opens PRO\'s piece editor (the copied window)',
        open === 'part-detail' && await page.has('[data-modal-name="part-detail"]'), `modal ${open}`);
      await shot(page, 'f13-piece-editor.png');
      await page.pressKey('Escape');
      await page.sleep(600);
    }
  }
  // MOVED ALONG THE WALL BY ITS LEFT FIGURE: a real drag first, so there is a
  // gap to measure, then the figure clicked and 150 typed.
  if (flat) {
    const grab = await reach(page, flat.id, 'FP');
    if (grab) await page.dragFromTo(grab.x, grab.y, grab.x + 60, grab.y, { steps: 10, modifiers: 1 });
    await page.sleep(700);
    const gapFig = await figureAt(page, `free-panel-${flat.id}`, 'fp-left');
    if (!gapFig) {
      check('its LEFT figure is on the screen once it stands clear of its neighbour', false, JSON.stringify((await panels()).find((f) => f.id === flat.id)));
    } else {
      const left = await page.ask(`(() => { const P = window.__cc.project.getState(); const u = P.units.find((x) => x.id === ${JSON.stringify(flat.id)});
        return P.units.filter((x) => x.id !== u.id && (x.position.wall ?? 0) === (u.position.wall ?? 0))
          .map((x) => x.position.x_mm + x.params.width + ((x.params.end_panels || []).some((e) => e.side === 'R') ? 18 : 0))
          .filter((r) => r <= u.position.x_mm + 1e-6).reduce((a, b) => Math.max(a, b), 0); })()`);
      await page.clickAt(gapFig.x, gapFig.y);
      await page.sleep(500);
      const field = await page.has('[data-spacing-field="fp-left"]');
      if (field) {
        await page.typeText('150');
        await page.pressKey('Enter');
        await page.sleep(900);
      }
      const moved = (await panels()).find((f) => f.id === flat.id);
      check('a real click on its LEFT figure and 150 typed: it stands 150 mm clear of what is on its left',
        field && Math.abs(moved.x - (left + 150)) < 0.6, `field ${field}; x ${moved.x}, left neighbour at ${left}`);
    }
  }
  const cut = await page.ask(`window.__cc.project.getState().units.flatMap((u) => window.__cc.project.getState().unitResult(u.id).csvLines || []).filter((l) => /,FP,/.test(l))`);
  check('the cut list carries each board, like any board', cut.length === 2, JSON.stringify(cut));
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
