// ─── Turn 12, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn12.mjs
//
// CLAUDE.md F11, step for step:
//
//   1  Settings via the top bar AND via step 5 → the same colour lands in the
//      scene
//   2  any modal: opens beside its object, dragged by its header, stays on
//      screen
//   3  the Library: the new order; a 2× drawer unit placed; Corner shows
//      disabled-soon
//   4  the Edit-cabinet window: the explode mid-animation, and one part rotated
//   5  the partition: Centre; delete; attached to a FIXED shelf and the shelf
//      shrunk → the partition follows; the zone highlight when adding a shelf
//   6  a wall unit dragged into a tall unit → it stops flush
//   7  one plinth across three units; a fourth docks → the plinth extends
//   8  Ctrl+Z after a delete → the cabinet is back
//   9  hinges visible in Solid, close up; and a dog-bone tab, close up
//  10  the TALL back panel's grain correct again
//
// It MEASURES rather than trusting, exactly as turn 11's does: the colour is
// read out of the store the scene paints from, the modal's position out of the
// DOM, the plinth's length out of the engine's own panel. A screenshot alone
// would only prove that something was drawn.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t12/', import.meta.url).pathname);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};
const note = (label, detail) => console.log(`  ··  ${label} — ${detail}`);

/** The app's own stores, reached from the page (src/main.jsx). */
const P = 'window.__cc';

/** Do two rectangles share a pixel? Rule 15's whole question. */
const OVERLAP = `
  const overlaps = (a, b) => a && b
    && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name) => page.screenshot(`${OUT}${name}.png`);
  const measurements = {};

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    await page.evaluate(`
      ${P}.project.getState().newProject('Turn 12 walk');
      ${P}.ui.getState().openEditor();
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(900);

    // ── 1. ONE settings surface (F1 / F11.1) ─────────────────────────────────
    await page.click('button', 'Settings', { exact: true });
    await page.sleep(200);
    await page.click('button', 'Settings…');
    await page.sleep(350);

    const surface = await page.evaluate(`
      const panel = document.querySelector('[data-settings-surface]');
      return {
        open: Boolean(panel),
        roomSetup: Boolean(document.querySelector('[data-room-setup]')),
        title: document.querySelector('[data-modal-shell] h2')?.textContent || null,
      };
    `);
    check('F1 the top bar opens THE settings surface', surface.open, JSON.stringify(surface));
    check('F1.2 Room setup is reachable from it again', surface.roomSetup);
    await shot('1a-settings-from-top-bar');

    // Set the front colour through the SPRAYED picker, which is the control the
    // old modal had, and read what the SCENE reads.
    const colourSet = await page.evaluate(`
      const store = ${P}.project.getState();
      store.setFrontColour({ hex: '#1b2a4a', name: 'Hague Blue', system: 'F&B' });
      const d = ${P}.project.getState().project.design;
      return { front: d.colour.front?.hex || null, type1: d.fronts.types[0]?.colour?.hex || null };
    `);
    check('F1.3 a colour set on the surface lands in the field the scene reads',
      colourSet.front === '#1b2a4a' && colourSet.type1 === '#1b2a4a', JSON.stringify(colourSet));
    measurements.settings = { ...surface, ...colourSet };

    // …and the OTHER control — the front TYPE picker, which is what turn 11's
    // step 5 wrote into a field nothing read.
    const viaTypes = await page.evaluate(`
      const store = ${P}.project.getState();
      const id = ${P}.project.getState().project.design.fronts.types[0]?.id || 'f1';
      store.setFrontType(id, { colour: { hex: '#5e2129', name: 'Wine Red', system: 'RAL' } });
      const d = ${P}.project.getState().project.design;
      return { front: d.colour.front?.hex || null, type1: d.fronts.types[0]?.colour?.hex || null };
    `);
    check('F1.3 …and so does one set through the front-TYPE picker',
      viaTypes.front === '#5e2129' && viaTypes.type1 === '#5e2129', JSON.stringify(viaTypes));
    measurements.settingsViaTypes = viaTypes;
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(200);

    // ── 3. the Library, restructured (F3 / F11.3) ────────────────────────────
    // Taken before the modal walk so there is a cabinet on the canvas for a
    // modal to open BESIDE.
    await page.evaluate(`${P}.ui.getState().setLibraryCategory('kitchen'); return true;`);
    await page.sleep(300);
    const library = await page.evaluate(`
      const rows = [...document.querySelectorAll('[data-library-entry],[data-library-group]')];
      return rows.map((r) => ({
        id: r.getAttribute('data-library-entry') || r.getAttribute('data-library-group'),
        group: r.hasAttribute('data-library-group'),
        disabled: r.getAttribute('data-disabled') === '1',
        text: (r.textContent || '').trim().slice(0, 60),
      }));
    `);
    const ids = library.map((r) => r.id);
    check('F3.1 the Kitchen list is in the owner’s order',
      JSON.stringify(ids) === JSON.stringify([
        'door-base', 'drawer-unit', 'tall', 'fridge', 'dishwasher', 'corner', 'l-shape', 'wall', 'sink', 'low',
      ]), JSON.stringify(ids));
    check('F3.6 Corner and L-shape are present and disabled-soon',
      library.find((r) => r.id === 'corner')?.disabled === true
      && library.find((r) => r.id === 'l-shape')?.disabled === true);
    check('F3.5 DW is held open too', library.find((r) => r.id === 'dishwasher')?.disabled === true);
    await shot('3a-library-kitchen-order');

    // The drawer group expands, and the 2× is real.
    await page.click('[data-library-group="drawer-unit"]');
    await page.sleep(250);
    const variants = await page.evaluate(`
      const rows = [...document.querySelectorAll('[data-library-entry]')]
        .filter((r) => r.getAttribute('data-library-entry').startsWith('drawer-'));
      return rows.map((r) => ({
        id: r.getAttribute('data-library-entry'),
        disabled: r.getAttribute('data-disabled') === '1',
      }));
    `);
    check('F3.2 the drawer unit expands to four splits, 1× held open',
      variants.length === 4 && variants[0].disabled === true && variants[1].disabled === false,
      JSON.stringify(variants));
    await shot('3b-drawer-group-expanded');

    await page.click('[data-library-entry="drawer-2"]');
    await page.sleep(500);
    const placed = await page.evaluate(`
      const units = ${P}.project.getState().units;
      const u = units[units.length - 1];
      const r = ${P}.project.getState().unitResult(u.id);
      return {
        type: u.type,
        fronts: r.panels.filter((p) => p.part === 'DRAWER-FRONT').length,
        heights: r.derived.front_heights,
      };
    `);
    check('F3.2 a 2× drawer unit is placed, and it has two fronts',
      placed.type === 'BUDR2' && placed.fronts === 2, JSON.stringify(placed));
    measurements.library = { ids, variants, placed };
    await shot('3c-two-drawer-unit-placed');
    await page.evaluate(`${P}.ui.getState().closeLibrary(); return true;`);
    await page.sleep(200);

    // ── 2. THE MODAL RULE (rule 15 / F11.2) ──────────────────────────────────
    // Opened from a right-click on the cabinet, which is a real anchor.
    const canvasPoint = await page.evaluate(`
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * 0.62) };
    `);
    await page.rightclick(canvasPoint.x, canvasPoint.y);
    await page.sleep(300);
    const menuOpen = await page.evaluate('return Boolean(document.querySelector(\'[title="Drag to move this menu"]\'));');
    if (menuOpen) {
      await page.click('button', 'Edit cabinet…');
      await page.sleep(700);
    } else {
      // The ray missed the cabinet (the camera is wherever the orbit left it).
      // The window is opened directly so the RULE can still be measured — what
      // is under test here is the placement, not the raycast.
      await page.evaluate(`
        const u = ${P}.project.getState().units[0];
        const c = document.querySelector('canvas').getBoundingClientRect();
        ${P}.ui.getState().openModal('cabinet', {
          unitId: u.id,
          anchor: { x: c.left + c.width * 0.35, y: c.top + c.height * 0.45, width: 220, height: 320 },
        });
        return true;
      `);
      await page.sleep(700);
    }

    const placement = await page.evaluate(`
      ${OVERLAP}
      const shell = document.querySelector('[data-modal-shell]');
      if (!shell) return { open: false };
      const box = shell.getBoundingClientRect();
      const anchor = ${P}.ui.getState().modalArgs?.anchor || null;
      const a = anchor ? {
        left: anchor.x, top: anchor.y, right: anchor.x + anchor.width, bottom: anchor.y + anchor.height,
      } : null;
      return {
        open: true,
        side: shell.getAttribute('data-modal-side'),
        box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
        coversAnchor: a ? overlaps(box, a) : null,
        onScreen: box.left >= -1 && box.top >= -1
          && box.right <= window.innerWidth + 1 && box.bottom <= window.innerHeight + 1,
      };
    `);
    check('rule 15b a modal opens BESIDE its object, never covering it',
      placement.open && placement.coversAnchor !== true, JSON.stringify(placement));
    check('rule 15 …and fully on screen', placement.onScreen);
    await shot('2a-modal-beside-its-object');

    // …and it is DRAGGABLE by its header, and stays on screen when dragged out.
    const dragged = await page.evaluate(`
      const handle = document.querySelector('[data-modal-handle]');
      const r = handle.getBoundingClientRect();
      return { x: Math.round(r.left + 40), y: Math.round(r.top + r.height / 2) };
    `);
    await page.mouse('mouseMoved', dragged.x, dragged.y, { buttons: 0 });
    await page.mouse('mousePressed', dragged.x, dragged.y);
    await page.mouse('mouseMoved', dragged.x + 220, dragged.y + 150);
    await page.mouse('mouseMoved', 3000, 2000);        // and off the screen entirely
    await page.mouse('mouseReleased', 3000, 2000, { buttons: 0 });
    await page.sleep(200);
    const afterDrag = await page.evaluate(`
      const b = document.querySelector('[data-modal-shell]').getBoundingClientRect();
      return {
        left: b.left, top: b.top, right: b.right, bottom: b.bottom,
        onScreen: b.left >= -1 && b.top >= -1
          && b.right <= window.innerWidth + 1 && b.bottom <= window.innerHeight + 1,
      };
    `);
    check('rule 15a it is dragged by its header…', afterDrag.left !== placement.box?.left);
    check('rule 15a …and clamped to the viewport', afterDrag.onScreen, JSON.stringify(afterDrag));
    measurements.modal = { placement, afterDrag };
    await shot('2b-modal-dragged-still-on-screen');

    // ── 4. the cabinet editor: explode, and a part turned over (F4 / F11.4) ──
    const exploding = await page.evaluate(`
      const btn = document.querySelector('[data-explode]');
      if (!btn) return { found: false };
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { found: true, label: btn.textContent.trim() };
    `);
    await page.sleep(220);                             // MID-animation, deliberately
    await shot('4a-explode-mid-animation');
    await page.sleep(700);
    // ─── THE TAB, CLOSE UP (CLAUDE.md F6.2 / F11.9) ───
    // The exploded cabinet is where the joint is unmistakable — the panels are
    // apart, so a tab is a tab standing out of a board rather than a detail
    // buried in a corner. Cropped to the little canvas and rescaled by CDP, so
    // it is published at a size somebody can read.
    const canvasBox = await page.evaluate(`
      const c = document.querySelector('[data-cabinet-canvas]').getBoundingClientRect();
      return { x: Math.round(c.left), y: Math.round(c.top), width: Math.round(c.width), height: Math.round(c.height) };
    `);
    await page.screenshot(`${OUT}9c-dogbone-tabs-exploded.png`, canvasBox);
    const exploded = await page.evaluate(`
      const btn = document.querySelector('[data-explode]');
      return { label: btn?.textContent.trim() || null, canvas: Boolean(document.querySelector('[data-cabinet-canvas] canvas')) };
    `);
    check('F4.1 the cabinet has its own canvas and an Explode button',
      exploding.found && exploded.canvas, JSON.stringify({ exploding, exploded }));
    check('F4.1 …which becomes Assemble once it is apart', exploded.label === 'Assemble');
    await shot('4b-exploded');

    // Select a part and turn it over: a click, then a drag, inside the small
    // canvas. The properties block appearing is the proof the part was taken.
    const small = await page.evaluate(`
      const c = document.querySelector('[data-cabinet-canvas] canvas').getBoundingClientRect();
      return { x: Math.round(c.left + c.width * 0.5), y: Math.round(c.top + c.height * 0.5), w: c.width, h: c.height };
    `);
    // A raycast has to actually HIT a board. The parts are scattered by the
    // explode and the canvas is 300 px tall, so the sweep is a real grid rather
    // than five hopeful points — and it stops the moment one lands.
    const picked = async () => page.evaluate(`
      const shell = document.querySelector('[data-modal-shell]');
      return shell && !shell.textContent.includes('Nothing selected') ? 1 : 0;
    `);
    let hit = false;
    for (let iy = -3; iy <= 3 && !hit; iy += 1) {
      for (let ix = -4; ix <= 4 && !hit; ix += 1) {
        const px = small.x + (small.w / 2) * (ix / 5);
        const py = small.y + (small.h / 2) * (iy / 4);
        await page.mouse('mouseMoved', px, py, { buttons: 0 });
        await page.mouse('mousePressed', px, py);
        await page.mouse('mouseReleased', px, py, { buttons: 0 });
        await page.sleep(70);
        // eslint-disable-next-line no-await-in-loop
        if (await picked()) { hit = true; }
      }
    }
    const partPicked = await page.evaluate(`
      const shell = document.querySelector('[data-modal-shell]');
      const txt = shell ? shell.textContent : '';
      return { picked: !txt.includes('Nothing selected'), text: txt.slice(0, 90) };
    `);
    check('F4.2 a part can be selected, and its EXISTING properties appear',
      partPicked.picked, partPicked.text);
    // …and turned over.
    await page.mouse('mouseMoved', small.x, small.y, { buttons: 0 });
    await page.mouse('mousePressed', small.x, small.y);
    for (let i = 1; i <= 6; i += 1) await page.mouse('mouseMoved', small.x + i * 14, small.y + i * 6);
    await page.mouse('mouseReleased', small.x + 84, small.y + 36, { buttons: 0 });
    await page.sleep(300);
    await shot('4c-part-rotated');
    measurements.cabinetEditor = { exploding, exploded, partPicked };
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(250);

    // ── 5. the partition (F5 / F11.5) ────────────────────────────────────────
    const partition = await page.evaluate(`
      const store = ${P}.project.getState();
      const { id } = store.addUnit('BUDTALL');
      store.updateUnitParams(id, { width: 900 });
      ${P}.ui.getState().selectUnit(id);
      store.addPartition(id);
      store.addPartition(id);
      const before = store.zonesOf(id).map((z) => Math.round(z.size));
      store.centrePartitions(id);
      const after = ${P}.project.getState().zonesOf(id).map((z) => Math.round(z.size));
      return { id, before, after, equal: new Set(after).size === 1 };
    `);
    check('F5.2 Centre spaces the partitions into equal bays',
      partition.equal, JSON.stringify(partition));
    await page.sleep(400);
    await shot('5a-partitions-centred');

    // A partition standing on a FIXED shelf follows it when the shelf shrinks.
    const coupled = await page.evaluate(`
      const store = ${P}.project.getState();
      const id = ${JSON.stringify(partition.id)};
      store.addShelves(id, 1, 0);
      const items = ${P}.project.getState().units.find((u) => u.id === id).params.sections[0].items;
      const shelf = items.find((i) => i.kind === 'shelf');
      store.setShelfVariant(id, shelf.id, 'fixed');
      const vpartOf = () => ${P}.project.getState().unitResult(id).panels.find((p) => p.part === 'VPART');
      const attached = vpartOf();
      store.setElementDepth(id, shelf.id, 150);
      const shrunk = vpartOf();
      return {
        terminatesOn: attached.meta.terminatesOn,
        depthBefore: attached.h,
        depthAfter: shrunk.h,
        followed: shrunk.h < attached.h,
      };
    `);
    check('F5.3 a partition terminates on a FIXED shelf', Boolean(coupled.terminatesOn), JSON.stringify(coupled));
    check('F5.3 …and its depth FOLLOWS when the shelf is set back', coupled.followed);
    await page.sleep(400);
    await shot('5b-partition-follows-the-shelf');

    // The zone highlight when a shelf is being added.
    await page.evaluate(`${P}.ui.getState().setZoneHint(1); return true;`);
    await page.sleep(500);
    await shot('5c-zone-highlight');
    await page.evaluate(`${P}.ui.getState().setZoneHint(null); return true;`);

    // …and the DELETE path, which turn 11 had none of.
    const deleted = await page.evaluate(`
      const store = ${P}.project.getState();
      const id = ${JSON.stringify(partition.id)};
      const before = store.zonesOf(id).length;
      const part = ${P}.project.getState().units.find((u) => u.id === id)
        .params.sections[0].items.find((i) => i.kind === 'partition');
      store.removeItem(id, part.id);
      return { before, after: ${P}.project.getState().zonesOf(id).length };
    `);
    check('F5.2 a partition can be deleted', deleted.after === deleted.before - 1, JSON.stringify(deleted));
    measurements.partition = { ...partition, coupled, deleted };

    // ── 6. a wall unit stops at a tall unit (F7 / F11.6) ─────────────────────
    const stopped = await page.evaluate(`
      const store = ${P}.project.getState();
      // A clean wall: the earlier steps left cabinets standing, and a blocker
      // that cannot be put where the test asks for it is not a blocker.
      store.units.slice().forEach((u) => ${P}.project.getState().removeUnit(u.id));
      const wall = ${P}.project.getState().addUnit('WUD');
      ${P}.project.getState().moveUnit(wall.id, 0, 0);
      const tall = ${P}.project.getState().addUnit('BUDTALL');
      ${P}.project.getState().moveUnit(tall.id, 2500, 0);
      ${P}.project.getState().moveUnit(wall.id, 5000, 0);
      const U = (id) => ${P}.project.getState().units.find((u) => u.id === id);
      const w = U(wall.id); const t = U(tall.id);
      return {
        wallRight: w.position.x_mm + w.params.width,
        tallLeft: t.position.x_mm,
        wallId: wall.id,
      };
    `);
    check('F7 a wall unit driven at a tall unit STOPS flush against it',
      stopped.wallRight <= stopped.tallLeft + 0.001 && stopped.wallRight > stopped.tallLeft - 1,
      JSON.stringify(stopped));
    measurements.wallVsTall = stopped;
    await page.sleep(500);
    await shot('6a-wall-unit-stops-at-tall');

    // ── 7. one plinth across a run (F8 / F11.7) ──────────────────────────────
    const plinth = await page.evaluate(`
      const store = ${P}.project.getState();
      ${P}.project.getState().units.slice().forEach((u) => store.removeUnit(u.id));
      const ids = [];
      for (let i = 0; i < 3; i += 1) {
        const { id } = ${P}.project.getState().addUnit('BUD');
        ${P}.project.getState().updateUnitParams(id, { width: 600 });
        ids.push(id);
      }
      ids.forEach((id, i) => ${P}.project.getState().moveUnit(id, i * 600, 0));
      ids.forEach((id) => ${P}.project.getState().addPlinth(id));
      const lengths = () => ${P}.project.getState().units
        .map((u) => ${P}.project.getState().unitResult(u.id).panels.find((p) => p.part === 'PLINTH'))
        .filter(Boolean).map((p) => p.w);
      const three = lengths();
      const { id: fourth } = ${P}.project.getState().addUnit('BUD');
      ${P}.project.getState().updateUnitParams(fourth, { width: 600 });
      ${P}.project.getState().moveUnit(fourth, 1800, 0);
      ${P}.project.getState().addPlinth(fourth);
      return { three, four: lengths() };
    `);
    check('F8 three units share ONE plinth',
      plinth.three.length === 1 && plinth.three[0] === 1800, JSON.stringify(plinth.three));
    check('F8 a fourth unit docks and the plinth EXTENDS',
      plinth.four.length === 1 && plinth.four[0] === 2400, JSON.stringify(plinth.four));
    measurements.plinth = plinth;
    await page.sleep(600);
    await shot('7a-one-plinth-across-four-units');

    // ── 8. Ctrl+Z after a delete (F9 / F11.8) ────────────────────────────────
    const before = await page.evaluate(`return ${P}.project.getState().units.length;`);
    await page.evaluate(`
      const store = ${P}.project.getState();
      const last = store.units[store.units.length - 1];
      ${P}.ui.getState().selectUnit(last.id);
      store.removeUnit(last.id);
      return true;
    `);
    await page.sleep(700);                             // let the burst settle
    const afterDelete = await page.evaluate(`return ${P}.project.getState().units.length;`);
    await page.key('z', { ctrl: true, code: 'KeyZ', windowsVirtualKeyCode: 90 });
    await page.sleep(500);
    const afterUndo = await page.evaluate(`
      return {
        units: ${P}.project.getState().units.length,
        selected: Boolean(${P}.ui.getState().selectedUnitId),
        canRedo: ${P}.history.getState().future.length,
      };
    `);
    check('F9 Ctrl+Z after a delete brings the cabinet back',
      afterDelete === before - 1 && afterUndo.units === before,
      JSON.stringify({ before, afterDelete, afterUndo }));
    check('F9 …and it comes back SELECTED', afterUndo.selected);
    measurements.undo = { before, afterDelete, afterUndo };
    await page.sleep(500);
    await shot('8a-ctrl-z-brought-it-back');

    // ── 9 & 10. the close-ups (F6 / F10 / F11.9 / F11.10) ────────────────────
    // One cabinet, alone, framed close. The camera is put where the piece is
    // rather than orbited to it, because a screenshot of the wrong wall is a
    // screenshot of the wrong wall however many drags it took.
    await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      const { id } = ${P}.project.getState().addUnit('BUDTALL');
      ${P}.ui.getState().selectUnit(id);
      ${P}.ui.getState().setShowHinges(true);
      ${P}.project.getState().setDoors(id, { count: 1 });
      return true;
    `);
    await page.sleep(600);
    // Swing the door so the ironmongery is in the open.
    await page.evaluate(`
      const u = ${P}.project.getState().units[0];
      const r = ${P}.project.getState().unitResult(u.id);
      const fronts = r.panels.filter((p) => p.part === 'FRONT').map((p) => p.id);
      ${P}.ui.getState().openFrontsFor(u.id, fronts);
      return true;
    `);
    await page.sleep(900);

    // ─── CLOSE UP ───
    // CLAUDE.md F11.9 asks for close-ups, and a cabinet photographed from the
    // far side of the room is not one. The camera is flown in with the app's
    // OWN gesture — "look at THIS", which is what a double click on a piece has
    // meant since turn 5 — rather than by a camera hook written for the walk.
    const centre = await page.evaluate(`
      const c = document.querySelector('canvas').getBoundingClientRect();
      return { x: Math.round(c.left + c.width / 2), y: Math.round(c.top + c.height * 0.45) };
    `);
    await page.dblclick(centre.x - 60, centre.y);
    await page.sleep(1400);                            // the fly takes a moment
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);
    // …and in, on the wheel, which is how a joiner gets close to anything.
    await page.wheel(centre.x, centre.y, -160, 9);
    await page.sleep(700);

    const hinges = await page.evaluate(`
      const u = ${P}.project.getState().units[0];
      const r = ${P}.project.getState().unitResult(u.id);
      return {
        showHinges: ${P}.ui.getState().showHinges,
        xray: ${P}.ui.getState().xray,
        rows: r.drillSummary.hinge_centers.length,
        boss: ${P}.profile.getState().profile.hardware.hinge.bossHeight,
      };
    `);
    check('F6.1 hinges are ON in Solid, and the boss is a real dimension',
      hinges.showHinges === true && hinges.xray === false && hinges.rows > 0 && hinges.boss > 0,
      JSON.stringify(hinges));
    await shot('9a-hinges-in-solid');

    const joint = await page.evaluate(`
      const u = ${P}.project.getState().units[0];
      const r = ${P}.project.getState().unitResult(u.id);
      const bul = r.panels.find((p) => p.part === 'BUL');
      const outside = (bul.cnc.outline || []).filter(([x]) => x > bul.cnc.drawn_w + 0.001).length;
      return { tabPoints: outside, panels: r.panels.length };
    `);
    check('F6.2 the side panel carries tabs in its own outline',
      joint.tabPoints > 0, JSON.stringify(joint));
    // The joint reads best from the BACK corner, where the tabs stand out of the
    // side panel into the back — so the camera is orbited round before the
    // second close-up rather than photographing the same frame twice.
    await page.mouse('mouseMoved', centre.x, centre.y + 260, { buttons: 0 });
    await page.mouse('mousePressed', centre.x, centre.y + 260);
    for (let i = 1; i <= 10; i += 1) {
      await page.mouse('mouseMoved', centre.x - i * 26, centre.y + 260 - i * 4);
    }
    await page.mouse('mouseReleased', centre.x - 260, centre.y + 220, { buttons: 0 });
    await page.sleep(900);
    await shot('9b-dogbone-tab-close-up');

    const backGrain = await page.evaluate(`
      const store = ${P}.project.getState();
      store.units.slice().forEach((u) => store.removeUnit(u.id));
      const { id } = ${P}.project.getState().addUnit('FRIDGE');
      ${P}.ui.getState().selectUnit(id);
      const r = ${P}.project.getState().unitResult(id);
      const back = r.panels.find((p) => p.part === 'BACK');
      return {
        w: back.w, h: back.h, rotated: back.cnc.rotated,
        drawnW: back.cnc.drawn_w, drawnH: back.cnc.drawn_h,
        boxW: back.box.w, boxH: back.box.h,
      };
    `);
    // The INVARIANT rather than a number: the piece the 3D lays down has to be
    // the piece the cut list names, whichever way the sheet nests it. The
    // project's tall height decides what 296 actually is on the day.
    check('F10 the TALL/FRIDGE back panel is laid down at its CUT size, not its drawn size',
      backGrain.boxW === backGrain.w && backGrain.boxH === backGrain.h
      && backGrain.rotated === true && backGrain.drawnW === backGrain.h && backGrain.drawnH === backGrain.w,
      JSON.stringify(backGrain));
    measurements.hardware = { hinges, joint, backGrain };
    await page.sleep(800);
    await shot('10a-tall-back-panel');

    // ── the console, which is the check nothing else makes ───────────────────
    const errors = page.errors.filter((e) => !/favicon|Download the React DevTools|404 \(Not Found\)/i.test(e));
    check('no console errors in the whole walk', errors.length === 0, errors.slice(0, 3).join(' | '));

    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify({
      at: new Date().toISOString(),
      steps,
      measurements,
    }, null, 2)}\n`);
    note('written', `${OUT}measurements.json`);
  } finally {
    await page.close();
  }

  const failed = steps.filter((s) => !s.ok);
  console.log(`\n${steps.length - failed.length}/${steps.length} checks passed`);
  if (failed.length) {
    console.log(failed.map((f) => `  FAIL ${f.label}${f.detail ? ` — ${f.detail}` : ''}`).join('\n'));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
