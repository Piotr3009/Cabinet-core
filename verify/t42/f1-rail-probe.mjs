#!/usr/bin/env node
// ─── T42 · F1 — THE RAIL, FINISHED: PROVED ON THE PANEL LIST AND THE SCENE ──
//
//     npm run build && npx vite preview --port 4173 &
//     node verify/t42/f1-rail-probe.mjs [--out verify/t42/]
//
// The owner, 19.08.2026, after the fourth broken rail: *"mamy w dupie stare
// rzeczy … nie patrzymy na przeszłość w ogóle."*
//
// IRON RULE 6, THE T41 LESSON MADE PERMANENT: *"PROVE THE THING, NOT THE
// FIELD. Every rail test in this turn asserts the ENGINE'S PANEL LIST or the
// drawn scene, never the item list alone."* T41's own probe asked the ITEM
// list — which said "no shelf", and was true — while the PANEL list carried a
// RAIL-PART the owner had refused three times. So nothing below is satisfied
// by a `mount` string:
//
//   1  ADD A ROD ON ITS OWN → the PANEL LIST has no RAIL-PART, the scene draws
//      a rod, and the rod carries an address of its own.
//   2  DRAG IT, with a real pointer → the ITEM's `pos_mm` moves and the DRAWN
//      rod moves with it. Then the arithmetic on its own: +100 mm in, +100 mm
//      out, read off the scene.
//   3  DOUBLE-CLICK IT, with a real pointer → the HANGING RAIL window opens on
//      the rod's own item — not the shelf modal, because there is no shelf.
//   4  ADD ONE WITH A SHELF → the fix shelf IS cut, the rod hangs `drop` under
//      it, and double-clicking the rod opens the SHELF (T37, untouched).
//
// One browser per phase, for the reason T41 wrote down: a phase that wedges
// must not take the walk with it.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { launch } from '../../scripts/cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const argOf = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('.', import.meta.url).pathname);
const P = 'window.__cc';

const lines = [];
const say = (s = '') => { lines.push(s); process.stdout.write(`${s}\n`); };
const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  say(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
};

let PORT = 9451;
async function withPage(fn) {
  PORT += 1;
  const page = await launch({ port: PORT });
  try { return await fn(page); } finally { await page.close(); }
}

/** A fresh wardrobe on the floor, selected, with the room ready to be clicked. */
const seed = async (page, name) => {
  await page.goto(BASE);
  await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
  const made = await page.evaluate(`
    const S = () => ${P}.project.getState();
    S().newProject(${JSON.stringify(name)});
    ${P}.ui.getState().openEditor();
    ${P}.ui.getState().closeModal();
    ${P}.ui.getState().closeLibrary();
    ${P}.ui.getState().setCheckOpen(false);
    // THE FRONTS COME OFF. A closed door stands between the pointer and the
    // rod, and every gesture below is a REAL one — so a walk that clicked
    // through a door would be measuring the door. This is the toolbar's own
    // "Hide fronts", the same switch a joiner presses to see inside.
    ${P}.ui.getState().setHideFronts(true);
    const w = S().addUnit('WARDROBE');
    S().updateUnitParams(w.id, { width: 900, height: 2150, doors: { count: 2 } });
    ${P}.ui.getState().selectUnit(w.id);
    return { id: w.id, num: S().units[0].params.unit_num };
  `);
  await page.sleep(900);
  return made;
};

/** Where the ROD is on the glass, and what it says about itself. */
const rodOnGlass = (page) => page.evaluate(`
  const v = ${P}.views.room;
  const THREE = v.three;
  v.scene.updateMatrixWorld(true);
  let mesh = null;
  v.scene.traverse((o) => {
    if (!mesh && o.isMesh && o.userData && o.userData.ccRailPanelId) mesh = o;
  });
  if (!mesh) return null;
  const b = new THREE.Box3().expandByObject(mesh);
  const c = b.getCenter(new THREE.Vector3());
  const p = new THREE.Vector3(c.x, c.y, b.max.z).project(v.camera);
  const r = v.gl.domElement.getBoundingClientRect();
  return {
    x: r.left + ((p.x + 1) / 2) * r.width,
    y: r.top + ((1 - p.y) / 2) * r.height,
    panelId: mesh.userData.ccRailPanelId,
    mount: mesh.userData.ccRailMount,
    itemId: mesh.userData.ccRailItemId,
    worldY: c.y,
  };
`);

/** What the ENGINE says — the PANEL LIST first, which is the whole point. */
const engineSays = (page, unitId) => page.evaluate(`
  const S = ${P}.project.getState();
  const r = S.unitResult(${JSON.stringify(unitId)});
  const items = (S.units.find((u) => u.id === ${JSON.stringify(unitId)})
    .params.sections?.[0]?.items) || [];
  return {
    railParts: r.panels.filter((p) => p.part === 'RAIL-PART').map((p) => p.id),
    shelfPanels: r.panels.filter((p) => p.part === 'SHELF').map((p) => p.id),
    panelCount: r.panels.length,
    rail: r.assemblies.rail,
    partitionScrews: r.drills.filter((d) => d.kind === 'rail_partition_screw').length,
    brackets: r.drills.filter((d) => d.kind === 'rail_bracket').map((d) => [d.panel, d.y]),
    items: items.map((i) => ({ id: i.id, kind: i.kind, mount: i.mount ?? null, pos_mm: i.pos_mm })),
  };
`);

async function main() {
  mkdirSync(OUT, { recursive: true });
  say('─── T42 · F1 — the rail, finished ─────────────────────────────────────');
  say(`app: ${BASE}`);
  say('');

  // ═══ 1 + 2 + 3 — A ROD ON ITS OWN ══════════════════════════════════════
  await withPage(async (page) => {
    say('1 — ADD ITEMS ▸ hanger rail, ON ITS OWN');
    const unit = await seed(page, 'T42 · a rod on its own');
    await page.evaluate(`
      ${P}.project.getState().addHangerRail(${JSON.stringify(unit.id)}, { withShelf: false });
      return true;
    `);
    await page.sleep(900);

    const said = await engineSays(page, unit.id);
    say(`      items:        ${JSON.stringify(said.items)}`);
    say(`      RAIL-PART:    ${JSON.stringify(said.railParts)}`);
    say(`      SHELF panels: ${JSON.stringify(said.shelfPanels)}`);
    say(`      rail:         y=${said.rail?.y}  mount=${said.rail?.mount}  itemId=${said.rail?.itemId}  support=${said.rail?.support}`);
    say(`      drills:       bracket ${JSON.stringify(said.brackets)}  ·  partitioner screws ${said.partitionScrews}`);

    check('THE PANEL LIST carries NO RAIL-PART — not the item list, the PANEL list',
      said.railParts.length === 0, JSON.stringify(said.railParts));
    check('…and no shelf was added behind his back either',
      said.shelfPanels.length === 0, JSON.stringify(said.shelfPanels));
    check('the engine says it is ALONE, and names the item it belongs to',
      said.rail?.mount === 'alone' && Boolean(said.rail?.itemId), JSON.stringify(said.rail?.mount));
    check('the SIDE FLANGE is drilled — one bracket screw per side, at the axis',
      said.brackets.length === 2 && said.brackets.every(([, y]) => Math.abs(y - said.rail.y) < 1e-6)
      && said.partitionScrews === 0, JSON.stringify(said.brackets));

    const rod = await rodOnGlass(page);
    say(`      on the glass: ${JSON.stringify(rod)}`);
    check('and the SCENE draws a rod that knows its own address',
      Boolean(rod) && rod.mount === 'alone' && rod.panelId === rod.itemId
      && rod.itemId === said.rail.itemId, JSON.stringify(rod && rod.panelId));

    // The picture CLAUDE.md asks for: the 3-D and the panel list side by side.
    // SECTION 1 is the unit's own interior list — opened with a real pointer,
    // so the frame shows what a joiner sees: one hanger rail, and no shelf
    // under it that nobody asked for.
    await page.click('[data-section="Section 1"] button');
    await page.sleep(500);
    const listed = await page.evaluate(`
      const t = document.body.innerText;
      return { hanger: t.includes('Hanger rail'), pieces: (t.match(/(\\d+) pieces/) || [])[1] || null };
    `);
    check('the INTERIOR LIST on screen shows the rail and nothing under it',
      listed.hanger === true, JSON.stringify(listed));
    await page.screenshot(join(OUT, 'f1a-rail-alone-no-shelf-in-panels.png'));
    say('      shot: f1a-rail-alone-no-shelf-in-panels.png');
    say('');

    // ═══ 2 — DRAG IT, WITH A REAL POINTER ════════════════════════════════
    say('2 — drag the rod by hand');
    const before = { pos: said.items.find((i) => i.kind === 'hanger').pos_mm, y: said.rail.y };
    if (rod) {
      await page.mouse('mouseMoved', rod.x, rod.y);
      await page.send('Input.dispatchMouseEvent', {
        type: 'mousePressed', x: rod.x, y: rod.y, button: 'left', clickCount: 1, buttons: 1,
      });
      // Up the glass is up the cabinet: three real moves, then a real release.
      for (const dy of [30, 60, 90]) {
        await page.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved', x: rod.x, y: rod.y - dy, button: 'left', buttons: 1,
        });
        await page.sleep(80);
      }
      await page.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', x: rod.x, y: rod.y - 90, button: 'left', clickCount: 1, buttons: 0,
      });
      await page.sleep(600);
    }
    const after = await engineSays(page, unit.id);
    const nowPos = after.items.find((i) => i.kind === 'hanger').pos_mm;
    say(`      pos_mm ${before.pos} → ${nowPos}    rod y ${before.y} → ${after.rail.y}`);
    check('the DRAG wrote the item’s pos_mm and the rod moved UP with it',
      nowPos > before.pos && after.rail.y > before.y
      && Math.abs((nowPos - before.pos) - (after.rail.y - before.y)) < 1e-6,
      `Δpos ${nowPos - before.pos} · Δy ${after.rail.y - before.y}`);
    check('…and STILL no RAIL-PART after the drag', after.railParts.length === 0,
      JSON.stringify(after.railParts));

    say('');

    // ═══ 3 — DOUBLE-CLICK IT ═════════════════════════════════════════════
    say('3 — double-click the tube');
    // The arithmetic above moved the rod three times through the store. Give
    // React the frame it needs to draw it there before asking the GLASS where
    // it is — a walk that reads a stale projection clicks at where the rod
    // used to be, which is a walk measuring its own impatience.
    await page.sleep(700);
    const at = await rodOnGlass(page);
    say(`      rod now at y=${at && Math.round(at.worldY * 1000)} mm, on the glass at ${at && Math.round(at.x)},${at && Math.round(at.y)}`);
    if (at) {
      await page.dblclick(at.x, at.y);
      await page.sleep(800);
    }
    const opened = await page.evaluate(`
      const u = ${P}.ui.getState();
      const el = document.querySelector('[data-rail-modal]');
      return {
        modal: u.modal,
        railItemId: u.modalArgs && u.modalArgs.railItemId,
        onGlass: Boolean(el),
        subject: el ? el.getAttribute('data-rail-modal') : null,
        title: document.body.innerText.includes('Hanging rail'),
        height: document.querySelector('[data-rail-height]') ? 'yes' : 'no',
        drawn: document.querySelector('[data-rail-drawn-y]')
          ? document.querySelector('[data-rail-drawn-y]').textContent.trim() : null,
      };
    `);
    say(`      window: ${JSON.stringify(opened)}`);
    check('the HANGING RAIL window opened, on the rod’s OWN item — not a shelf modal',
      opened.modal === 'rail' && opened.onGlass && opened.subject === at?.itemId
      && opened.title && opened.height === 'yes', JSON.stringify(opened.modal));
    check('…and it reads the rod’s height back off the engine, not off the field',
      Boolean(opened.drawn && /\d/.test(opened.drawn)), String(opened.drawn));
    await page.screenshot(join(OUT, 'f1b-rail-alone-dragged-and-edited.png'));
    say('      shot: f1b-rail-alone-dragged-and-edited.png');
    say('');

    // ═══ 2b — THE ARITHMETIC, AFTER EVERY POINTER GESTURE IS DONE ════════
    //
    // Deliberately LAST. It moves the rod three times through the store, and a
    // pointer gesture that followed it would be aiming at a projection taken
    // before React had drawn the move — which is a walk measuring its own
    // impatience rather than the app.
    say('2b — the drag, as arithmetic: +100 mm in, +100 mm out');
    const arith = await page.evaluate(`
      const S = ${P}.project.getState();
      const unitId = ${JSON.stringify(unit.id)};
      const items = S.units.find((u) => u.id === unitId).params.sections[0].items;
      const rail = items.find((i) => i.kind === 'hanger');
      const drawnY = () => window.__ccHardware3d.hardwareInstances(
        S.unitResult(unitId), ${P}.profile.getState().profile,
      ).rails[0].y;
      S.updateItem(unitId, rail.id, { pos_mm: 900 });
      const a = drawnY();
      S.updateItem(unitId, rail.id, { pos_mm: 1000 });
      const b = drawnY();
      return { at900: a, at1000: b, delta: b - a };
    `);
    say(`      pos_mm 900 → drawn ${arith.at900} mm ;  pos_mm 1000 → drawn ${arith.at1000} mm ;  Δ ${arith.delta}`);
    check('SET pos_mm 100 mm HIGHER → THE DRAWN ROD MOVES 100 mm', arith.delta === 100,
      `${arith.at900} → ${arith.at1000}`);
    say('');
  });

  // ═══ 4 — THE ASSEMBLY IS UNTOUCHED ═════════════════════════════════════
  await withPage(async (page) => {
    say('4 — and the ASSEMBLY is exactly what T37 left');
    const unit = await seed(page, 'T42 · with a shelf');
    await page.evaluate(`
      ${P}.project.getState().addHangerRail(${JSON.stringify(unit.id)}, { withShelf: true });
      return true;
    `);
    await page.sleep(900);
    const said = await engineSays(page, unit.id);
    say(`      RAIL-PART: ${JSON.stringify(said.railParts)}   SHELF: ${JSON.stringify(said.shelfPanels)}`);
    say(`      rail: y=${said.rail?.y} mount=${said.rail?.mount} shelfItemId=${said.rail?.shelfItemId}`);
    const shelf = await page.evaluate(`
      const S = ${P}.project.getState();
      const r = S.unitResult(${JSON.stringify(unit.id)});
      const rail = r.assemblies.rail;
      const board = r.panels.find((p) => p.part === 'SHELF' && p.meta.itemId === rail.shelfItemId);
      return { shelfY: board ? board.box.y : null, rodY: rail.y };
    `);
    check('the FIX SHELF is cut, and the rod hangs the bracket drop below it',
      said.shelfPanels.length === 1 && shelf.shelfY - shelf.rodY === 40,
      `shelf ${shelf.shelfY} · rod ${shelf.rodY}`);
    check('and it cuts no RAIL-PART either — neither kind does, ever',
      said.railParts.length === 0 && said.partitionScrews === 0, JSON.stringify(said.railParts));

    const rod = await rodOnGlass(page);
    check('an ASSEMBLY’s rod still names the SHELF it rides (T37, untouched)',
      Boolean(rod) && rod.mount === 'shelf' && said.shelfPanels.includes(rod.panelId),
      JSON.stringify(rod && rod.panelId));
    if (rod) {
      await page.dblclick(rod.x, rod.y);
      await page.sleep(800);
    }
    const opened = await page.evaluate(`
      const u = ${P}.ui.getState();
      return { modal: u.modal, panelId: u.modalArgs && u.modalArgs.panelId, rider: Boolean(document.querySelector('[data-rail-rider]')) };
    `);
    say(`      window: ${JSON.stringify(opened)}`);
    check('…and double-clicking it opens the SHELF’s window, which says it carries a rail',
      opened.modal === 'element' && said.shelfPanels.includes(opened.panelId) && opened.rider,
      JSON.stringify(opened));
    say('');
  });

  const failed = steps.filter((s) => !s.ok);
  say('─── VERDICT ───────────────────────────────────────────────────────────');
  say(`${steps.length - failed.length} / ${steps.length} checks passed`);
  for (const f of failed) say(`  FAILED: ${f.label}   ${f.detail}`);
  writeFileSync(join(OUT, 'f1-rail-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  say(`WALK ERROR: ${e.stack || e.message}`);
  writeFileSync(join(OUT, 'f1-rail-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(1);
});
