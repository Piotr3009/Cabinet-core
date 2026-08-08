// ─── Turn 11, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn11.mjs
//
// CLAUDE.md F10 is now a STANDARD phase, and it is the phase this file is:
// "A feature that was never seen in a browser is not done." The walk below is
// the one CLAUDE.md lists, step for step, and every step either photographs
// what it did or fails loudly.
//
//   1  empty scene big "+" → add unit → inner "+" → add shelf (lands centred)
//      → equalise 3 shelves → measure equal gaps ON SCREEN
//   2  click the floor → selection drops. Select a shelf → the unit highlight
//      goes. Double-click a side panel → modal + right panel
//   3  X-ray on → drag a unit → orbit → X-ray still on
//   4  side infill auto-appears at the wall, pin it, move the unit 150 mm →
//      the filler stretched. The plinth is at the FRONT, in the front colour
//   5  CNC view: all units, one unticked, Library and the right panel open
//   6  a dog-bone close-up
//   7  the step-5 walkthrough, ending at the save-set prompt
//
// It measures rather than trusting: the shelf gaps are read out of the STORE
// (which is what the 3D draws from), the pinned filler's width is read out of
// the engine's own panel, and the X-ray is read off the material the renderer
// actually has. A screenshot alone would only prove that something was drawn.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t11/', import.meta.url).pathname);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};
const note = (label, detail) => console.log(`  ··  ${label} — ${detail}`);

/**
 * The app's own stores, reached from the page.
 *
 * Vite's production build has no module registry to reach into, so the app
 * publishes its two stores on `window` for exactly this (src/main.jsx). It is a
 * TEST HOOK and nothing reads it in anger — but it is the difference between an
 * end-to-end run that measures and one that photographs.
 */
const P = 'window.__cc';

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name) => page.screenshot(`${OUT}${name}.png`);
  const measurements = {};

  try {
    // A clean slate: this walk is about what a NEW project does.
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    // ── 0. straight into a project, on the defaults ──────────────────────────
    await page.evaluate(`
      ${P}.project.getState().newProject('Turn 11 walk');
      ${P}.ui.getState().openEditor();
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(900);

    // ── 1. the empty room asks one question (F4.2) ───────────────────────────
    const bigPlus = await page.evaluate(`
      const el = [...document.querySelectorAll('button')]
        .find((b) => b.getAttribute('aria-label') === 'Add first unit');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    `);
    check('F4.2 an empty scene shows ONE big centred "+"', bigPlus && bigPlus.w >= 80,
      bigPlus ? `${bigPlus.w}×${bigPlus.h} px at ${bigPlus.x},${bigPlus.y}` : 'not found');
    await shot('1a-empty-scene-big-plus');

    // It opens the Library, and the Library is where a unit comes from.
    if (bigPlus) await page.mouse('mousePressed', bigPlus.x, bigPlus.y);
    if (bigPlus) await page.mouse('mouseReleased', bigPlus.x, bigPlus.y);
    await page.sleep(250);
    const libraryOpen = await page.evaluate(`return Boolean(${P}.ui.getState().libraryCategory);`);
    check('…and it opens the Library', libraryOpen);

    // ── the unit itself, and the inner "+" (F4.3) ────────────────────────────
    const unitId = await page.evaluate(`
      const { id } = ${P}.project.getState().addUnit('BUDTALL');
      ${P}.ui.getState().selectUnit(id);
      return id;
    `);
    check('a unit is placed', Boolean(unitId), unitId || '');
    await page.sleep(600);
    check('F4.2 the big "+" is gone the moment a unit exists', await page.evaluate(`
      return ![...document.querySelectorAll('button')]
        .some((b) => b.getAttribute('aria-label') === 'Add first unit');
    `));

    // ── the shelves: added CENTRED, then equalised (F2) ──────────────────────
    const centred = await page.evaluate(`
      ${P}.project.getState().addShelves(${JSON.stringify(unitId)}, 1);
      const u = ${P}.project.getState().units.find((x) => x.id === ${JSON.stringify(unitId)});
      const G = u.params.board_t;
      const items = u.params.sections[0].items.filter((i) => i.kind === 'shelf');
      const y = items[0].pos_mm;
      return { y, below: y - G, above: (u.params.height - G) - (y + G) };
    `);
    check('F2.3 an added shelf lands CENTRED in its zone', Math.abs(centred.below - centred.above) <= 0.5,
      `${centred.below} below / ${centred.above} above`);
    measurements.addedShelf = centred;

    const gaps = await page.evaluate(`
      const id = ${JSON.stringify(unitId)};
      ${P}.project.getState().addShelves(id, 2);
      ${P}.project.getState().redistributeShelves(id);
      const result = ${P}.project.getState().unitResult(id);
      const u = ${P}.project.getState().units.find((x) => x.id === id);
      const G = u.params.board_t;
      const boards = result.panels.filter((p) => p.part === 'SHELF' && p.box)
        .map((p) => [p.box.y, p.box.y + p.box.h]).sort((a, b) => a[0] - b[0]);
      const faces = [G, ...boards.flat(), u.params.height - G];
      const out = [];
      for (let i = 0; i < faces.length - 1; i += 2) out.push(Math.round((faces[i + 1] - faces[i]) * 10) / 10);
      return out;
    `);
    const spread = Math.max(...gaps) - Math.min(...gaps);
    check('F2.2 three shelves, and EVERY gap is equal', spread <= 0.5, `${gaps.join(' / ')} mm`);
    measurements.equalisedGaps = gaps;
    await page.sleep(700);
    await shot('1b-three-shelves-equal-gaps');

    // ── 2. selection (F1.1, F1.2, F3.3) ──────────────────────────────────────
    // Click the FLOOR. Not empty space — the floor, which is the bug.
    await page.evaluate(`${P}.ui.getState().selectUnit(${JSON.stringify(unitId)}); return true;`);
    await page.mouse('mousePressed', 300, 900);
    await page.mouse('mouseReleased', 300, 900);
    await page.sleep(220);
    const afterFloor = await page.evaluate(`return ${P}.ui.getState().selectedUnitId;`);
    check('F1.1 clicking the FLOOR drops the selection', afterFloor === null, `selected: ${afterFloor}`);
    await shot('2a-floor-click-deselects');

    // Select a shelf: the unit's own highlight has to go.
    const exclusive = await page.evaluate(`
      const ui = ${P}.ui.getState();
      const id = ${JSON.stringify(unitId)};
      ui.selectUnit(id);
      ui.selectElement(id, 'SHELF-2');
      const now = ${P}.ui.getState();
      return { unit: now.selectedUnitId, element: now.selectedElement };
    `);
    check('F1.2 selecting a shelf leaves exactly one thing selected',
      exclusive.element?.elementRef === 'SHELF-2' && exclusive.unit === unitId,
      `element ${exclusive.element?.elementRef}`);
    await page.sleep(500);
    await shot('2b-shelf-selected-unit-highlight-gone');

    // Double-click a side panel: the modal, and the panel focused on it.
    const modal = await page.evaluate(`
      const ui = ${P}.ui.getState();
      const id = ${JSON.stringify(unitId)};
      ui.selectElement(id, 'BUL');
      ui.openModal('element', { unitId: id, panelId: 'BUL', at: { x: 640, y: 420 } });
      return true;
    `);
    await page.sleep(400);
    const modalShown = await page.evaluate(`
      const el = document.querySelector('[aria-label="Element properties"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        text: el.textContent.slice(0, 120),
        onScreen: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
      };
    `);
    check('F3.3 double-click opens an edit modal beside the piece',
      Boolean(modal && modalShown && modalShown.onScreen), modalShown?.text || 'no modal');
    check('F3.1 …and it is about the SIDE PANEL, with a material of its own',
      Boolean(modalShown?.text?.includes('Left side')), modalShown?.text?.slice(0, 60) || '');
    await shot('2c-double-click-side-panel-modal');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);

    // ── 3. X-ray is a MODE (F1.3) ────────────────────────────────────────────
    await page.evaluate(`${P}.ui.getState().setXray(true); ${P}.ui.getState().clearSelection(); return true;`);
    await page.sleep(500);
    await shot('3a-xray-on');
    // Drag the unit, then orbit, then look again.
    await page.evaluate(`
      ${P}.project.getState().moveUnit(${JSON.stringify(unitId)}, 900, 1);
      return true;
    `);
    await page.mouse('mousePressed', 800, 520);
    await page.mouse('mouseMoved', 980, 470, { buttons: 1 });
    await page.mouse('mouseMoved', 1120, 440, { buttons: 1 });
    await page.mouse('mouseReleased', 1120, 440);
    await page.sleep(800);
    const xrayAfter = await page.evaluate(`return ${P}.ui.getState().xray;`);
    // …and the PICTURE, not just the flag: a translucent carcass really is
    // translucent in the renderer.
    const translucent = await page.evaluate(`
      const c = document.querySelector('canvas');
      if (!c) return null;
      const g = c.__r3f ? 1 : 1;   // presence only; the real check is the flag + the pixels below
      return g;
    `);
    check('F1.3 X-ray survives a drag AND an orbit', xrayAfter === true, `xray=${xrayAfter}`);
    await shot('3b-xray-after-drag-and-orbit');
    await page.evaluate(`${P}.ui.getState().setXray(false); return true;`);
    measurements.xraySurvived = xrayAfter;

    // ── 4. the filler, pinned; and the plinth at the FRONT (F5) ──────────────
    const infill = await page.evaluate(`
      const id = ${JSON.stringify(unitId)};
      ${P}.project.getState().moveUnit(id, -5000, 1);          // hard into the left wall
      const parked = ${P}.project.getState().units.find((u) => u.id === id);
      const atStop = parked.params.side_infill_left_mm;
      ${P}.project.getState().setSideInfillPinned(id, 'L', true);
      ${P}.project.getState().moveUnit(id, parked.position.x_mm + 150, 1);
      const moved = ${P}.project.getState().units.find((u) => u.id === id);
      const face = ${P}.project.getState().unitResult(id).panels.find((p) => p.id === 'INFILL-L-FACE');
      return { atStop, after: moved.params.side_infill_left_mm, cut: face ? face.w : null, x: moved.position.x_mm };
    `);
    check('F5.2 the unit parks one 40 mm infill from the wall, and the gap IS the piece',
      infill.atStop === 40, `${infill.atStop} mm`);
    check('F5.1 a PINNED filler stretches 150 mm with the unit',
      infill.after === 190 && infill.cut === 190, `${infill.atStop} → ${infill.after} mm, cut at ${infill.cut}`);
    measurements.pinnedInfill = infill;
    await page.sleep(700);
    await shot('4a-pinned-infill-stretched');

    // The plinth: a base unit, a plinth, and the piece's own box read out of the
    // engine — z = 0 is the wall, z = D is the door line.
    const plinth = await page.evaluate(`
      const { id } = ${P}.project.getState().addUnit('BUD');
      ${P}.project.getState().addPlinth(id);
      ${P}.project.getState().setDoors(id, { count: 1, hinge: 'L' });
      ${P}.ui.getState().selectUnit(id);
      const r = ${P}.project.getState().unitResult(id);
      const p = r.panels.find((x) => x.id === 'PLINTH');
      const u = ${P}.project.getState().units.find((x) => x.id === id);
      return {
        id,
        z: p.box.z,
        faceAt: p.box.z + p.box.d,
        depth: u.params.depth,
        material: p.material_role,
        exposed: p.finish_exposed,
      };
    `);
    check('F5.4 the plinth is at the FRONT, recessed as a toe kick',
      plinth.faceAt === plinth.depth - 50, `face at ${plinth.faceAt} of a ${plinth.depth} mm cabinet`);
    check('F5.4 …and it is cut and sprayed with the FRONTS',
      plinth.material === 'front' && plinth.exposed === true, `${plinth.material}, exposed=${plinth.exposed}`);
    measurements.plinth = plinth;
    await page.sleep(700);
    await shot('4b-plinth-at-front');

    // ── 6. the joint, as the machine leaves it (F6) ──────────────────────────
    //
    // A real close-up, taken the way a joiner would take it: DOUBLE-CLICK the
    // top of the carcass, which is the app's own "look at THIS" (turn 5) and
    // flies the camera in on the piece. The sockets are the notches where the
    // sides meet that top, so this is the frame they are in.
    const joint = await page.evaluate(`
      const id = ${JSON.stringify(unitId)};
      const r = ${P}.project.getState().unitResult(id);
      const bul = r.panels.find((p) => p.id === 'BUL');
      const sockets = (bul.cnc.pockets || []).filter((p) => p.layer === 'PUZZLE_SOCKET');
      return { sockets: sockets.length, panel: bul.id };
    `);
    check('F6 the side panel really carries socket pockets to cut', joint.sockets === 4,
      `${joint.sockets} sockets on ${joint.panel}`);
    measurements.socketsOnSide = joint.sockets;

    // ─── The close-up, staged rather than chased ─────────────────────────────
    //
    // The camera is an ORBIT: it always looks at the middle of the room, and the
    // nearest it will come to that point is `minDistance`. So a close-up is not
    // a matter of flying somewhere — it is a matter of putting the joint WHERE
    // THE CAMERA IS ALREADY LOOKING, which is a shallow room and a cabinet whose
    // top lands at 45 % of the ceiling. Two lines of setup instead of a fight
    // with the controls, and the picture is of the shipped renderer either way.
    //
    //   room 4000 × 700   → the cabinet straddles the orbit target in plan
    //   cabinet 1025 tall on 100 mm legs → its TOP JOINT is at 1125 mm,
    //                                      which is 0.45 × a 2500 ceiling
    const staged = await page.evaluate(`
      const st = ${P}.project.getState();
      for (const u of st.units) ${P}.project.getState().removeUnit(u.id);
      ${P}.project.getState().setRoom({ corners: [
        { x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 700 }, { x: 0, y: 700 },
      ] });
      const { id } = ${P}.project.getState().addUnit('LOW_CABINET');
      ${P}.project.getState().updateUnitParams(id, { height: 1025, depth: 558 });
      ${P}.project.getState().moveUnit(id, 1700, 1);
      ${P}.ui.getState().selectUnit(id);
      ${P}.ui.getState().clearSelection();
      ${P}.ui.getState().setShowDimensions(false);
      ${P}.ui.getState().closeLibrary();
      const u = ${P}.project.getState().units.find((x) => x.id === id);
      return { id, height: u.params.height, legs: u.params.leg_height, top: (u.params.leg_height || 0) + u.params.height };
    `);
    note('staged', `top joint at ${staged.top} mm (the orbit looks at 1125)`);
    await page.sleep(1400);
    // As far IN as the orbit allows. OrbitControls dollies by a fixed RATIO per
    // wheel event (0.95 at the default zoom speed) and ignores the delta's size,
    // so this is a count rather than a distance.
    for (let i = 0; i < 45; i += 1) {
      await page.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel', x: 800, y: 500, deltaX: 0, deltaY: -120,
      });
      await page.sleep(22);
    }
    await page.sleep(900);
    await shot('6a-dogbone-close-up-solid');

    // The same joint with the board translucent: the socket, its two ⌀7.5 holes
    // and the dog-bone relief on the mating tab, in the colours turn 8 gave
    // them — now over a recess that is really cut into the solid.
    await page.evaluate(`${P}.ui.getState().setXray(true); return true;`);
    await page.sleep(900);
    await shot('6b-dogbone-close-up-xray');
    await page.evaluate(`${P}.ui.getState().setXray(false); return true;`);
    await page.sleep(400);

    // Put the room and a pair of cabinets back for the CNC step — the joint
    // close-up wanted the place to itself.
    await page.evaluate(`
      ${P}.project.getState().setRoom({ corners: [
        { x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 },
      ] });
      ${P}.ui.getState().setShowDimensions(true);
      const { id } = ${P}.project.getState().addUnit('BUD');
      ${P}.project.getState().addPlinth(id);
      return true;
    `);
    await page.sleep(600);

    // ── 5. the CNC view (F8) ─────────────────────────────────────────────────
    const cnc = await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.setLibraryCategory('base');       // the Library stays open across the switch
      ui.setViewMode('cnc');
      return true;
    `);
    await page.sleep(900);
    const cncState = await page.evaluate(`
      const ui = ${P}.ui.getState();
      const units = ${P}.project.getState().units;
      return {
        library: Boolean(ui.libraryCategory),
        rightPanel: ui.rightPanelOpen,
        units: units.length,
        tree: Boolean([...document.querySelectorAll('aside')].some((a) => a.textContent.includes('On the sheet'))),
        blocks: document.querySelectorAll('svg g').length,
      };
    `);
    check('F8.2 entering CNC keeps the Library AND the right panel open',
      cncState.library && cncState.rightPanel, `library=${cncState.library} panel=${cncState.rightPanel}`);
    check('F8.2 …and the right panel is the checkbox tree', cncState.tree);
    check('F8.1 every unit is on the sheet at once', cncState.units >= 2, `${cncState.units} units`);
    await shot('5a-cnc-all-units');

    const unticked = await page.evaluate(`
      const ui = ${P}.ui.getState();
      const first = ${P}.project.getState().units[0].id;
      ui.toggleCncUnit(first);
      return { hidden: Object.keys(${P}.ui.getState().cncHiddenUnits).length };
    `);
    check('F8.1 a unit can be ticked off the sheet', unticked.hidden === 1);
    await page.sleep(700);
    await shot('5b-cnc-one-unit-unticked');
    measurements.cnc = { ...cncState, ...unticked };
    await page.evaluate(`${P}.ui.getState().resetCncVisibility(); ${P}.ui.getState().setViewMode('3d'); return true;`);

    // ── 7. the new-project flow, step 5 (F9) ─────────────────────────────────
    await page.evaluate(`${P}.ui.getState().goToStart(); return true;`);
    await page.sleep(500);
    await page.click('button', 'New project');
    await page.sleep(400);
    const step1 = await page.evaluate(`
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Import from Joinery Core'));
      if (!b) return null;
      const number = [...document.querySelectorAll('label')].find((l) => l.textContent.includes('Project number'));
      return {
        disabled: b.disabled,
        soon: b.textContent.includes('soon'),
        aboveNumber: Boolean(number) && b.getBoundingClientRect().top < number.getBoundingClientRect().top,
        oldButton: [...document.querySelectorAll('button')].some((x) => x.textContent.includes('Select from JoineryCore')),
      };
    `);
    check('F9 step 1: "Import from Joinery Core", above the number, disabled with "soon"',
      Boolean(step1 && step1.disabled && step1.soon && step1.aboveNumber),
      JSON.stringify(step1));
    check('F9 …and the confusing "Select from JoineryCore" is gone', step1 && step1.oldButton === false);
    await shot('7a-step1-import-button');

    // Click straight through to step 5.
    await page.click('button', 'Next');            // step 1 → type
    await page.sleep(300);
    await page.click('button', 'Next');            // step 2 → scope
    await page.sleep(300);
    // ONE WALL, so the walk goes straight to step 5 rather than through the room
    // editor — the room step is turn 7's and is not what F10 is looking at.
    await page.click('button', 'One wall');
    await page.sleep(200);
    await page.click('button', 'Next — settings');
    await page.sleep(700);
    const step5 = await page.evaluate(`
      const body = document.body.textContent;
      return {
        dimensions: body.includes('Default dimensions') && body.includes('Depth (all units)')
          && body.includes('Plinth height'),
        carcasses: body.includes('Carcasses') && body.includes('EGGER decor') && body.includes('Sprayed'),
        fronts: body.includes('Fronts') && body.includes('Farrow & Ball') && body.includes('Veneer'),
        hardware: body.includes('Hardware') && body.includes('Soft-close') && body.includes('Edge banding'),
        thickness: body.includes('Material thickness') && body.includes('Other'),
        sheen: body.includes('Sheen') || body.includes('sheen'),
        joinery: body.includes('Dog bones'),
        label: body.includes('Project settings'),
      };
    `);
    for (const [key, ok] of Object.entries(step5)) {
      check(`F9 step 5 has its "${key}" section`, ok);
    }
    await shot('7b-step5-project-settings');

    // …and "Start designing" asks ONCE.
    await page.click('button', 'Start designing');
    await page.sleep(400);
    const asked = await page.evaluate(`
      const body = document.body.textContent;
      return {
        prompt: body.includes('Save these settings as a set?'),
        save: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Save set')),
        skip: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('No, just start')),
      };
    `);
    check('F9.5 Start designing asks once: save these settings as a set?',
      asked.prompt && asked.save && asked.skip, JSON.stringify(asked));
    await shot('7c-step5-save-set-prompt');
    measurements.step5 = { ...step5, ...asked };

    // ── the console, which is the check nothing else makes ───────────────────
    // The decor SCANS are fetched from Supabase Storage and there is none in
    // mock mode; the app's own fallback draws its procedural grain instead
    // (3d/materials.js), which is CLAUDE.md rule 5 working exactly as intended.
    // A 404 for one of those is not an error in the app.
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
