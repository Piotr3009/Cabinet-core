// ─── Turn 14, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn14.mjs
//
// CLAUDE.md F11 names thirteen highlights and this is those thirteen, in the
// order the turn built them:
//
//   1  the F1.1 PAIR invariant, in ONE step
//   2  the top infill REMOVED by unchecking it
//   3  the FRIDGE backs on the dog bones
//   4  the infill stopping at a ceiling-height end panel AND at a side infill
//   5  the door modal, with Door extend in it
//   6  the masking panel under a three-unit run, and a fourth unit docking
//   7  the context menu: order, the framed first entry, the gold dividers
//   8  the detail modal, with a hovered SCREWS_3MM highlighted
//   9  a door OPEN in the editor
//  10  a spur panel removed, and the BOM reflecting it
//  11  the eye-level glint at a NORMAL viewing angle
//  12  a wall dragged 20 → typed 202 → moved exactly 202
//  13  an inserted box blocking a unit
//
// It MEASURES rather than trusting, exactly as turns 11–13 do. Where a claim is
// about geometry the number is read off the engine or off the live scene; where
// it is about the DOM, the rectangle is read out of the DOM. A screenshot alone
// would only prove that something was drawn.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t14/', import.meta.url).pathname);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};
const note = (label, detail) => console.log(`  ··  ${label} — ${detail}`);

/** The app's own stores and views, reached from the page (src/main.jsx). */
const P = 'window.__cc';

/**
 * Where a cabinet is ON THE SCREEN, projected through the room's own camera —
 * turn 13's helper, unchanged, because the aim is the same: a click aimed at a
 * named cabinet rather than at a hopeful fraction of the canvas.
 */
const PROJECT_UNIT = `
  const screenOf = (unitId, frac = 0.35) => {
    const v = ${P}.views.room;
    let group = null;
    v.scene.traverse((o) => { if (!group && o.userData?.ccUnitId === unitId) group = o; });
    if (!group) return null;
    group.updateWorldMatrix(true, true);
    let sx = 0; let sz = 0; let n = 0;
    let lo = Infinity; let hi = -Infinity;
    group.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (!o.geometry.boundingSphere) return;
      const c = o.geometry.boundingSphere.center.clone();
      o.localToWorld(c);
      const r = o.geometry.boundingSphere.radius;
      sx += c.x; sz += c.z; n += 1;
      lo = Math.min(lo, c.y - r); hi = Math.max(hi, c.y + r);
    });
    if (!n) return null;
    const p = new v.three.Vector3(sx / n, lo + (hi - lo) * frac, sz / n).project(v.camera);
    const r = v.gl.domElement.getBoundingClientRect();
    return {
      x: Math.round(r.left + ((p.x + 1) / 2) * r.width),
      y: Math.round(r.top + ((1 - p.y) / 2) * r.height),
      onScreen: p.x > -1 && p.x < 1 && p.y > -1 && p.y < 1,
    };
  };
`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name) => page.screenshot(`${OUT}${name}.png`);
  const measurements = {};

  /** A real left click at a point on the canvas, with modifiers if asked. */
  const clickAt = async (x, y, modifiers = 0) => {
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x, y, modifiers,
    });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1, modifiers,
    });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0, modifiers,
    });
    await page.sleep(200);
  };
  const fresh = async (name) => {
    await page.evaluate(`
      ${P}.project.getState().newProject(${JSON.stringify(name)});
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      return true;
    `);
    await page.sleep(700);
  };

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Turn 14 walk');
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(900);

    // ══ 1. THE PAIR, IN ONE STEP (F1.1 / F11) ════════════════════════════════
    //
    // CLAUDE.md asks for both invariants pinned as a PAIR in ONE step, so the
    // pendulum cannot swing again: a click on a wall empties the selection, and
    // a click on a cabinet THROUGH a wall selects that cabinet. Three gestures,
    // one verdict.
    const pairUnits = await page.evaluate(`
      const store = ${P}.project.getState();
      const a = store.addUnit('BUD');
      const b = store.addUnit('BUD');
      return { a: a.id, b: b.id };
    `);
    await page.sleep(900);
    const aimA = await page.evaluate(`${PROJECT_UNIT} return screenOf(${JSON.stringify(pairUnits.a)}, 0.35);`);
    const aimB = await page.evaluate(`${PROJECT_UNIT} return screenOf(${JSON.stringify(pairUnits.b)}, 0.35);`);
    const wallAim = await page.evaluate(`
      const r = ${P}.views.room.gl.domElement.getBoundingClientRect();
      return { x: Math.round(r.left + r.width * 0.5), y: Math.round(r.top + r.height * 0.14) };
    `);
    const selectionAfter = async () => page.evaluate(`return JSON.stringify(${P}.ui.getState().selectedUnitIds);`);

    await page.evaluate(`${P}.ui.getState().clearSelection(); return true;`);
    await clickAt(aimA.x, aimA.y);
    const afterCabinet = JSON.parse(await selectionAfter());
    await clickAt(aimB.x, aimB.y, 2);              // 2 = Ctrl, CDP's own mask
    const afterCtrl = JSON.parse(await selectionAfter());
    await clickAt(wallAim.x, wallAim.y);
    const afterWall = JSON.parse(await selectionAfter());

    const pairOk = afterCabinet.length === 1 && afterCabinet[0] === pairUnits.a
      && afterCtrl.length === 2 && afterWall.length === 0;
    check('F1.1 THE PAIR: a cabinet through a wall selects; Ctrl grows the set; a wall empties it',
      pairOk, JSON.stringify({ afterCabinet, afterCtrl, afterWall }));
    measurements.pair = { afterCabinet, afterCtrl, afterWall, aimA, aimB, wallAim };
    await clickAt(aimA.x, aimA.y);
    await page.sleep(300);
    await shot('1a-pair-invariant');

    // ══ 2. THE TOP INFILL COMES OFF (F1.2) ═══════════════════════════════════
    await fresh('F1.2');
    const infill = await page.evaluate(`
      const store = ${P}.project.getState();
      const ids = [];
      for (let i = 0; i < 3; i += 1) ids.push(store.addUnit('WUD').id);
      ${P}.project.getState().addTopInfill(ids[0]);
      const has = () => ids.map((id) => {
        const r = ${P}.project.getState().unitResult(id);
        return r.panels.some((p) => p.part === 'INFILL' && p.meta?.side === 'top');
      });
      const before = has();
      // The MIDDLE cabinet of the run — the one whose own flag turn 6 cleared
      // while the run put the piece straight back.
      const removed = ${P}.project.getState().removeTopInfill(ids[1]);
      return { ids, before, after: has(), removed };
    `);
    check('F1.2 unchecking the top infill on a run MEMBER takes the run’s piece off',
      infill.before.some(Boolean) && !infill.after.some(Boolean) && infill.removed === 3,
      JSON.stringify(infill));
    measurements.topInfillRemoval = infill;
    await page.sleep(600);
    await shot('2a-top-infill-removed');

    // ══ 3. THE FRIDGE BACKS, ON THE BONES (F2) ═══════════════════════════════
    await fresh('F2');
    const fridge = await page.evaluate(`
      const store = ${P}.project.getState();
      const { id } = store.addUnit('FRIDGE');
      const r = ${P}.project.getState().unitResult(id);
      const at = (pid) => { const p = r.panels.find((x) => x.id === pid); return p && { y: p.box.y, h: p.box.h }; };
      const H = r.panels.find((p) => p.id === 'BUL').box.h;
      return {
        id, H, rail1: at('RAIL1'), rail2: at('RAIL2'), back: at('BACK'),
        tabs: [95, H / 2, H - 95],
      };
    `);
    const railsOk = fridge.rail1.y === 0
      && Math.abs((fridge.rail2.y + 95) - fridge.H / 2) < 0.01
      && Math.abs((fridge.back.y + fridge.back.h) - fridge.H) < 0.01;
    check('F2 RAIL1 is flush with the bottom, RAIL2 hangs on the middle tenon, BACK reaches the top',
      railsOk, JSON.stringify(fridge));
    measurements.fridge = fridge;
    await page.evaluate(`${P}.ui.getState().setXray(true); ${P}.ui.getState().selectUnit(${JSON.stringify(fridge.id)}); return true;`);
    await page.sleep(900);
    await shot('3a-fridge-backs-on-the-bones');
    await page.evaluate(`${P}.ui.getState().setXray(false); return true;`);

    // ══ 4. THE INFILL ENDS AT WHAT IS IN THE WAY (F3) ════════════════════════
    await fresh('F3');
    const termination = await page.evaluate(`
      const store = ${P}.project.getState();
      const tall = store.addUnit('BUDTALL').id;
      ${P}.project.getState().moveUnit(tall, 1000, 0);
      const ep = ${P}.project.getState().addEndPanel(tall, { side: 'R' });
      const edge = (() => {
        const u = ${P}.project.getState().units.find((x) => x.id === tall);
        const t = (u.params.end_panels || [])[0];
        return u.position.x_mm + u.params.width + (t?.thickness || u.params.front_t);
      })();
      const a = store.addUnit('WUD').id;
      ${P}.project.getState().moveUnit(a, edge, 0);
      const b = store.addUnit('WUD').id;
      ${P}.project.getState().moveUnit(b, edge + 600, 0);
      ${P}.project.getState().addTopInfill(a);
      const endsOf = () => {
        const r = ${P}.project.getState().unitResult(a);
        const face = r.panels.find((p) => p.id === 'INFILL-T-FACE');
        const x = ${P}.project.getState().units.find((u) => u.id === a).position.x_mm;
        return face && { ends: face.meta.ends, from: Math.round(face.box.x + x) };
      };
      const before = endsOf();
      ${P}.project.getState().endPanelToCeiling(tall, ep.id);
      const after = endsOf();
      return { tall, a, b, edge: Math.round(edge), before, after };
    `);
    // The OTHER case gets a room of its own: a tall unit parked at its stop
    // against the left wall, so the gap beside it becomes a scribe filler.
    await fresh('F3.2');
    const filler = await page.evaluate(`
      const store = ${P}.project.getState();
      const solo = store.addUnit('BUDTALL').id;
      ${P}.project.getState().moveUnit(solo, -9000, 0);
      ${P}.project.getState().addTopInfill(solo);
      const read = () => {
        const r = ${P}.project.getState().unitResult(solo);
        const f = r.panels.find((p) => p.id === 'INFILL-T-FACE');
        const x = ${P}.project.getState().units.find((u) => u.id === solo).position.x_mm;
        return f && { ends: f.meta.ends, from: Math.round(f.box.x + x), gap: ${P}.project.getState().units.find((u) => u.id === solo).params.side_infill_left_mm };
      };
      const before = read();
      ${P}.project.getState().sideInfillToCeiling(solo, 'L');
      return { solo, before, after: read() };
    `);
    check('F3.1 a wall-unit run STOPS at a tall cabinet’s ceiling-height end panel',
      termination.before.ends.left === 'open' && termination.after.ends.left === 'end-panel'
      && termination.after.from === termination.edge, JSON.stringify(termination.after));
    check('F3.2 a tall unit’s infill ENDS ON a side filler taken to the ceiling',
      filler.before.from === 0 && filler.after.from > 0
      && filler.after.from === filler.before.gap,
      JSON.stringify({ before: filler.before, after: filler.after }));
    measurements.termination = { ...termination, filler };
    await page.evaluate(`${P}.ui.getState().selectUnit(${JSON.stringify(filler.solo)}); return true;`);
    await page.sleep(800);
    await shot('4a-infill-stops-at-panel-and-filler');

    // ══ 5. THE DOOR MODAL, WITH DOOR EXTEND (F4) ═════════════════════════════
    await fresh('F4');
    const doorUnit = await page.evaluate(`
      const store = ${P}.project.getState();
      const { id } = store.addUnit('WUD');
      // A wall unit arrives without its doors; hanging them is what the plus
      // and the context menu do, and it is what makes a DOOR modal possible.
      ${P}.project.getState().addDoors(id);
      const r = ${P}.project.getState().unitResult(id);
      const door = r.panels.find((p) => p.part === 'FRONT');
      if (!door) return { id, door: null };
      ${P}.ui.getState().openModal('element', { unitId: id, panelId: door.id, at: { x: 900, y: 420 } });
      return { id, door: door.id };
    `);
    await page.sleep(600);
    const doorModal = await page.evaluate(`
      const el = document.querySelector('[data-door-extend]');
      const title = [...document.querySelectorAll('div')].map((d) => d.textContent || '')
        .find((t) => t.startsWith('W01 ·') || t.includes('· Door'));
      return {
        hasExtend: Boolean(el),
        checked: el ? el.checked : null,
        label: el ? el.closest('label')?.textContent?.trim() || '' : '',
        title: title || null,
      };
    `);
    check('F4.2 the DOOR modal carries Door extend — it is a door property now',
      doorModal.hasExtend && /Door extend/.test(doorModal.label), JSON.stringify(doorModal));
    measurements.doorModal = doorModal;
    await shot('5a-door-modal-with-door-extend');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);

    // ══ 6. THE MASKING PANEL UNDER A RUN (F5) ════════════════════════════════
    await fresh('F5');
    const mask = await page.evaluate(`
      const store = ${P}.project.getState();
      const ids = [];
      // Placed by hand at 500 / 1100 / 1700 so all FOUR fit on a 4 m wall: the
      // automatic placement centres the first one and the fourth would be
      // pushed round a corner, which is a different test.
      for (let i = 0; i < 3; i += 1) {
        const id = store.addUnit('WUD').id;
        ${P}.project.getState().moveUnit(id, 500 + i * 600, 0);
        ids.push(id);
      }
      for (const id of ids) ${P}.project.getState().addBottomMask(id);
      const boardOf = (id) => {
        const r = ${P}.project.getState().unitResult(id);
        const p = r.panels.find((x) => x.part === 'MASK');
        return p && { w: p.w, h: p.h, material: p.material_role };
      };
      const three = { owner: boardOf(ids[0]), members: ids.slice(1).map(boardOf) };
      // …and a FOURTH docks onto it.
      const fourth = store.addUnit('WUD').id;
      ${P}.project.getState().moveUnit(fourth, 500 + 3 * 600, 0);
      ${P}.project.getState().addBottomMask(fourth);
      return { ids, fourth, three, four: boardOf(ids[0]), fourthOwn: boardOf(fourth) };
    `);
    check('F5 three wall units carry ONE board; a fourth docking EXTENDS it',
      mask.three.owner && mask.three.members.every((m) => m === null)
      && mask.four.w === mask.three.owner.w + 600 && !mask.fourthOwn
      && mask.three.owner.material === 'front',
      JSON.stringify({ three: mask.three.owner, four: mask.four }));
    measurements.mask = mask;
    await page.evaluate(`
      ${P}.ui.getState().clearSelection();
      const v = ${P}.views.room;
      v.camera.position.set(0.2, 0.9, 3.2);
      if (v.controls) { v.controls.target.set(0.2, 1.5, 0); v.controls.update(); }
      return true;
    `);
    await page.sleep(700);
    await shot('6a-masking-panel-under-a-run');

    // ══ 7. THE CONTEXT MENU (F6) ═════════════════════════════════════════════
    await fresh('F6');
    const menuUnit = await page.evaluate(`
      const store = ${P}.project.getState();
      const { id } = store.addUnit('WUD');
      ${P}.ui.getState().selectUnit(id);
      ${P}.ui.getState().openContextMenu({ x: 700, y: 360, unitId: id });
      return id;
    `);
    await page.sleep(400);
    const menu = await page.evaluate(`
      const entries = [...document.querySelectorAll('[data-menu-entry]')].map((b) => b.dataset.menuEntry);
      const dividers = [...document.querySelectorAll('[data-menu-divider]')].map((d) => d.dataset.menuDivider);
      const first = document.querySelector('[data-menu-entry="edit-cabinet"]');
      const style = first ? getComputedStyle(first) : null;
      return {
        entries,
        dividers,
        firstIsEdit: entries[0] === 'edit-cabinet',
        lastIsDimensions: entries[entries.length - 1] === 'dimensions',
        hinges: entries.includes('hinges'),
        framed: style ? { border: style.borderTopWidth, colour: style.borderTopColor } : null,
        dividerColour: (() => {
          const d = document.querySelector('[data-menu-divider]');
          return d ? getComputedStyle(d).borderTopColor : null;
        })(),
      };
    `);
    check('F6 Edit cabinet FIRST and framed, dimensions LAST, hinges gone, gold rules between the sections',
      menu.firstIsEdit && menu.lastIsDimensions && !menu.hinges
      && menu.dividers.length >= 3 && parseFloat(menu.framed.border) > 0,
      JSON.stringify(menu));
    measurements.menu = menu;
    await shot('7a-context-menu-order-and-dividers');
    await page.evaluate(`${P}.ui.getState().closeContextMenu(); return true;`);

    // ══ 8. THE DETAIL MODAL, WITH A HOVERED SCREWS_3MM (F7) ══════════════════
    await fresh('F7');
    const detail = await page.evaluate(`
      const store = ${P}.project.getState();
      const { id } = store.addUnit('WARDROBE');
      const r = ${P}.project.getState().unitResult(id);
      ${P}.ui.getState().openModal('part-detail', { unitId: id, panelId: 'BUL' });
      return { id, drills: r.drills.filter((d) => d.panel === 'BUL' && d.layer === 'SCREWS_3MM').length };
    `);
    await page.sleep(900);
    const hover = await page.evaluate(`
      const legend = [...document.querySelectorAll('[data-legend-layer]')].map((b) => b.dataset.legendLayer);
      const screws = document.querySelector('[data-legend-layer="SCREWS_3MM"]');
      if (!screws) return { legend, hasScrews: false, at: null };
      const r = screws.getBoundingClientRect();
      return { legend, hasScrews: true, at: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } };
    `);
    // A REAL pointer move: React derives onPointerEnter from `pointerover`, so a
    // synthetic `pointerenter` — which does not bubble — is a gesture the app
    // never hears. The walk uses the mouse the app is driven by.
    if (hover.at) {
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hover.at.x, y: hover.at.y });
    }
    await page.sleep(350);
    const noted = await page.evaluate(`
      const el = document.querySelector('[data-part-note]');
      const paths = [...document.querySelectorAll('[data-machining]')];
      const widths = paths.map((p) => Number(p.getAttribute('stroke-width')));
      return {
        note: el ? el.textContent.trim() : null,
        paths: paths.length,
        lit: widths.filter((w) => w >= 3).length,
        dimmed: paths.filter((p) => Number(p.getAttribute('opacity')) < 1).length,
      };
    `);
    check('F7 the detail modal draws the part, and a hovered SCREWS_3MM lights up and says what it is',
      hover.hasScrews && noted.paths > 0 && noted.lit === 1 && /Screws ⌀3/.test(noted.note || ''),
      JSON.stringify({ ...hover, ...noted }));
    measurements.detail = { ...detail, ...hover, ...noted };
    await shot('8a-part-detail-screws-highlighted');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);

    // ══ 9 + 10. THE EDITOR: DOORS OPEN, AND A SPUR PANEL REMOVED (F8) ════════
    await fresh('F8');
    const editor = await page.evaluate(`
      const store = ${P}.project.getState();
      const { id } = store.addUnit('FRIDGE');
      // Doors are hung rather than assumed (turn 13, F5.3) — and F8.1 is about
      // opening one, so there has to be one.
      ${P}.project.getState().addDoors(id);
      ${P}.ui.getState().openModal('cabinet', { unitId: id });
      return id;
    `);
    await page.sleep(1200);
    await page.click('[data-open-doors]');
    await page.sleep(900);
    const opened = await page.evaluate(`
      const btn = document.querySelector('[data-open-doors]');
      return { label: btn ? btn.textContent.trim() : null };
    `);
    check('F8.1 the editor OPENS the doors', opened.label === 'Close doors', JSON.stringify(opened));
    await shot('9a-door-open-in-the-editor');

    const spur = await page.evaluate(`
      const id = ${JSON.stringify(editor)};
      const store = ${P}.project.getState();
      const rowsOf = () => {
        const r = ${P}.project.getState().unitResult(id);
        return r.panels.map((p) => p.id);
      };
      const before = rowsOf();
      const took = store.removeElement(id, 'SPURS');
      const after = rowsOf();
      const r = ${P}.project.getState().unitResult(id);
      return {
        took,
        before: before.includes('SPURS'),
        after: after.includes('SPURS'),
        removedParts: r.derived.removed_parts || null,
        csv: r.csvLines.some((l) => /,SPURS,/.test(l)),
      };
    `);
    check('F8.2 a spur panel is removed as a design-layer override, and the cut list follows',
      spur.before && !spur.after && spur.took === 'override'
      && Array.isArray(spur.removedParts) && !spur.csv, JSON.stringify(spur));
    measurements.spur = spur;
    await page.sleep(700);
    await shot('10a-spur-panel-removed');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);

    // ══ 11. THE EYE-LEVEL GLINT (F9) ═════════════════════════════════════════
    await fresh('F9');
    const lights = await page.evaluate(`
      const store = ${P}.project.getState();
      for (let i = 0; i < 3; i += 1) store.addUnit('BUD');
      store.setDesign({ colour: { front: { hex: '#2E3946', name: 'Slate', system: 'RAL' } }, sheen: 75 });
      return true;
    `);
    await page.sleep(1400);
    const glint = await page.evaluate(`
      const v = ${P}.views.room;
      const found = [];
      v.scene.traverse((o) => {
        if (o.userData?.ccLight !== 'point') return;
        o.updateWorldMatrix(true, false);
        found.push({
          y: Math.round(o.position.y * 1000),
          i: o.intensity,
          shadow: Boolean(o.castShadow),
        });
      });
      // Stand at eye level, three metres out — a NORMAL viewing angle.
      v.camera.position.set(0.6, 1.65, 3.0);
      if (v.controls) { v.controls.target.set(0.6, 0.75, 0); v.controls.update(); }
      v.camera.lookAt(0.6, 0.75, 0);
      return { found };
    `);
    check('F9 the eye-level pair is in the scene at 1650 mm, physical, casting nothing',
      glint.found.length === 2 && glint.found.every((l) => l.y === 1650 && l.i >= 10 && !l.shadow),
      JSON.stringify(glint.found));
    measurements.glint = glint;
    await page.sleep(900);
    await shot('11a-eye-level-glint');

    // ══ 12. A WALL DRAGGED 20, THEN TYPED 202 (F10.1 / F10.2) ════════════════
    await fresh('F10');
    await page.evaluate(`${P}.ui.getState().openModal('room', {}); return true;`);
    await page.sleep(600);
    const planBox = await page.evaluate(`
      const svg = document.querySelector('[data-room-plan]');
      const wall = document.querySelector('[data-plan-wall="0"]');
      if (!svg || !wall) return null;
      const s = svg.getBoundingClientRect();
      const w = wall.getBoundingClientRect();
      return {
        svg: { x: s.left, y: s.top, w: s.width, h: s.height },
        wall: { x: w.left + w.width / 2, y: w.top + w.height / 2 },
      };
    `);
    const roomBefore = await page.evaluate(`
      const r = ${P}.project.getState().project.room;
      return JSON.stringify(r.corners.map((c) => [c.x, c.y]));
    `);
    note('F10 the plan', JSON.stringify(planBox));
    // A short DRAG on the wall — the gesture — and then the number, typed.
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: planBox.wall.x, y: planBox.wall.y });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: planBox.wall.x, y: planBox.wall.y, button: 'left', clickCount: 1, buttons: 1,
    });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: planBox.wall.x, y: planBox.wall.y - 3, buttons: 1,
    });
    await page.sleep(150);
    const afterDrag = await page.evaluate(`
      const svgWalls = ${P}.__roomDraftWidth || null;
      const el = document.querySelector('[data-plan-wall="0"]');
      return { moved: Boolean(el) };
    `);
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: planBox.wall.x, y: planBox.wall.y - 3, button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(150);
    for (const ch of ['2', '0', '2']) {
      await page.key(ch, { code: `Digit${ch}`, windowsVirtualKeyCode: 48 + Number(ch) });
    }
    const chip = await page.evaluate(`
      const el = document.querySelector('[data-typed-distance]');
      return el ? el.textContent.trim() : null;
    `);
    await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
    await page.sleep(300);
    await shot('12a-wall-typed-202');
    await page.click('button', 'Apply');
    await page.sleep(500);
    const roomAfter = await page.evaluate(`
      const r = ${P}.project.getState().project.room;
      const walls = r.corners;
      return JSON.stringify({ corners: walls.map((c) => [c.x, c.y]), depth: Math.max(...walls.map((c) => c.y)) - Math.min(...walls.map((c) => c.y)) });
    `);
    const before = JSON.parse(roomBefore);
    const after = JSON.parse(roomAfter);
    const grew = Math.round(after.depth - (Math.max(...before.map((c) => c[1])) - Math.min(...before.map((c) => c[1]))));
    check('F10.2 the wall was dragged, then TYPED 202 — and it moved exactly 202',
      chip === '202 mm ⏎' && grew === 202, JSON.stringify({ chip, grew, after: after.depth }));
    measurements.wallTyped = {
      chip, grew, before, after, afterDrag,
    };

    // ══ 13. AN INSERTED BOX BLOCKING A UNIT (F10.3) ══════════════════════════
    await fresh('F10.3');
    const box = await page.evaluate(`
      const store = ${P}.project.getState();
      // The cabinet FIRST — it lands in the middle of the wall — and then the
      // chimney is built to the right of it, which is the order a joiner meets
      // this in: the room is measured after the kitchen is drawn.
      const first = store.addUnit('BUD');
      const from = ${P}.project.getState().units[0].position.x_mm;
      const room = ${P}.project.getState().project.room;
      const boxX = from + 600 + 500;
      ${P}.project.getState().setRoom({ ...room, boxes: [{ id: 'chimney', x: boxX, y: 0, w: 500, d: 400 }] });
      // Slid hard right: it must STOP at the box rather than pass through it.
      ${P}.project.getState().moveUnit(first.id, 9999, 0);
      const stopped = ${P}.project.getState().units.map((u) => ({ id: u.id, x: u.position.x_mm }))[0];
      return {
        from, boxX, stopped, room: ${P}.project.getState().project.room.boxes,
      };
    `);
    check('F10.3 a cabinet slid at an inserted box STOPS at it',
      box.stopped.x > box.from && box.stopped.x + 600 <= box.boxX && box.room.length === 1,
      JSON.stringify(box));
    measurements.box = box;
    await page.evaluate(`
      const v = ${P}.views.room;
      v.camera.position.set(0.4, 2.4, 3.4);
      if (v.controls) { v.controls.target.set(0.4, 0.4, 0); v.controls.update(); }
      v.camera.lookAt(0.4, 0.4, 0);
      return true;
    `);
    await page.sleep(800);
    await shot('13a-box-blocking-a-unit');

    // ── the verdict ─────────────────────────────────────────────────────────
    const failed = steps.filter((s) => !s.ok);
    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify({ steps, measurements }, null, 2)}\n`);
    console.log(`\n${steps.length - failed.length}/${steps.length} checks passed`);
    if (page.errors.length) console.log('page errors:', page.errors.slice(0, 5));
    if (failed.length) process.exitCode = 1;
  } finally {
    await page.close();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
