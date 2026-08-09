// ─── Turn 16, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn16.mjs
//
// CLAUDE.md F10 names the walk and this is it, in the order the turn built it:
//
//   1  Step 5: a BOARD on every front type, and the four "Same as fronts"
//   2  the element modal listing "Front 1 · …" and "Front 2 · …" separately
//   3  a shelf recoloured LIVE by an element override — before and after
//   4  CNC by material: sections named by their boards, three materials →
//      three groups, and no sprayed toggle anywhere
//   5  CNC far zoom: the labels stay inside their parts
//   6  door extend at 38 on one door, and over a multi-selection
//   7  a wall unit's door height and its panel height, edited independently
//   8  Settings Save: green after save, red after a change, green again
//   9  a renamed cabinet, renamed in the CNC tree and the BOM
//  10  the element editor's LIT detail — with luminance numbers (F7)
//  11  the wall-vs-base gloss measurement (F8)
//  12  an infill filled to the ceiling (F9)
//
// It MEASURES rather than trusting, exactly as turns 11–15 do. Where a claim is
// about geometry the number is read off the engine or off the live scene; where
// it is about the DOM, the rectangle is read out of the DOM; and where it is
// about LIGHT, the pixels are decoded from the screenshot (scripts/png.mjs) and
// the luminance is a number in verify/t16/measurements.json.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { decodePng, highlight, regionLuminance } from './png.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t16/', import.meta.url).pathname);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

/** The app's own stores and views, reached from the page (src/main.jsx). */
const P = 'window.__cc';

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name, clip = null) => page.screenshot(`${OUT}${name}.png`, clip);
  const measurements = {};

  /**
   * A screenshot, decoded, so a region of it can be MEASURED.
   *
   * At scale 1, deliberately: `page.screenshot` rescales a clipped capture ×3
   * by default (it is there so a 300 px canvas can be published at a size a
   * human can look at), and a rectangle read out of the DOM in CSS pixels does
   * not survive that. One pixel in, one pixel out.
   */
  const pixels = async (name, clip = null) => {
    const path = await shot(name, clip ? { ...clip, scale: 1 } : null);
    return decodePng(readFileSync(path));
  };

  const fresh = async (name) => {
    await page.evaluate(`
      ${P}.project.getState().newProject(${JSON.stringify(name)});
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      ${P}.ui.getState().resetSettingsSaved();
      return true;
    `);
    await page.sleep(600);
  };
  const openSettings = async () => {
    await page.evaluate(`${P}.ui.getState().openModal('design'); return true;`);
    await page.sleep(500);
  };

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Turn 16 walk');
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(800);

    // ══ 1. STEP 5: A BOARD ON EVERY FRONT TYPE, AND THE FOUR SWITCHES (F1) ══
    await openSettings();
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.setFrontTypes(2);
      s.setCarcassMaterial('c1', 'mat_mfc18_white');
      s.setFrontMaterial('f1', 'mat_mdf25_shaker');
      s.setFrontMaterial('f2', 'mat_mfc18_oak');
      return true;
    `);
    await page.sleep(400);
    const step5 = await page.evaluate(`
      const drops = [...document.querySelectorAll('[data-front-material]')]
        .map((el) => ({ type: el.dataset.frontMaterial, value: el.value, options: el.options.length }));
      const switches = [...document.querySelectorAll('[data-same-as-fronts]')]
        .map((el) => ({ role: el.dataset.sameAsFronts, on: el.checked }));
      return { drops, switches, block: Boolean(document.querySelector('[data-run-materials]')) };
    `);
    check('F1.1 every front TYPE has a MaterialStock dropdown, with a board in it',
      step5.drops.length === 2 && step5.drops.every((d) => d.value && d.options > 2),
      JSON.stringify(step5.drops));
    check('F1.2 four "Same as fronts" switches, all ON by default',
      step5.switches.length === 4 && step5.switches.every((s) => s.on),
      JSON.stringify(step5.switches.map((s) => s.role)));
    await page.evaluate(`
      document.querySelector('[data-settings-section="fronts"]').scrollIntoView({ block: 'center' });
      return true;
    `);
    await page.sleep(250);
    await shot('1a-step5-front-boards-and-switches');

    // ── the fourth material: the plinths get a board of their own ──
    await page.evaluate(`
      ${P}.project.getState().setRunMaterial('plinth', { sameAsFronts: false, material_id: 'mat_ply18_birch' });
      return true;
    `);
    await page.sleep(300);
    const own = await page.evaluate(`
      const box = document.querySelector('[data-same-as-fronts="plinth"]');
      const sel = document.querySelector('[data-run-material-stock="plinth"]');
      return { ticked: box ? box.checked : null, stock: sel ? sel.value : null };
    `);
    check('F1.2 unticking one shows its OWN dropdown, and it holds the board',
      own.ticked === false && own.stock === 'mat_ply18_birch', JSON.stringify(own));
    await shot('1b-plinths-on-their-own-board');

    // ══ 8. THE SAVE IS A STATE (F5) ═══════════════════════════════════════
    // Taken here, while Settings is open and the fronts have just been edited.
    const saveBefore = await page.evaluate(`
      const b = document.querySelector('[data-save-section="fronts"]');
      return {
        saved: b.dataset.saved, text: b.textContent.trim(),
        colour: getComputedStyle(b).color, className: b.className,
      };
    `);
    await page.click('[data-save-section="fronts"]');
    await page.sleep(300);
    const saveAfter = await page.evaluate(`
      const b = document.querySelector('[data-save-section="fronts"]');
      return {
        saved: b.dataset.saved, text: b.textContent.trim(),
        colour: getComputedStyle(b).color, className: b.className,
      };
    `);
    // Close Settings and open it again — turn 15's tick died here.
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(300);
    await openSettings();
    const saveReopened = await page.evaluate(`
      const b = document.querySelector('[data-save-section="fronts"]');
      return {
        saved: b.dataset.saved, text: b.textContent.trim(),
        colour: getComputedStyle(b).color, className: b.className,
      };
    `);
    await shot('8a-save-green-after-reopen');
    // …and now CHANGE something: it must go red.
    await page.evaluate(`${P}.project.getState().setFrontMaterial('f2', 'mat_mfc19_front'); return true;`);
    // The palette's colours are transitioned in CSS, so the button is read once
    // the transition has landed — a colour caught mid-fade is not a colour.
    await page.sleep(900);
    const saveDirty = await page.evaluate(`
      const b = document.querySelector('[data-save-section="fronts"]');
      return {
        saved: b.dataset.saved, text: b.textContent.trim(),
        colour: getComputedStyle(b).color, className: b.className,
      };
    `);
    await shot('8b-save-red-after-a-change');
    await page.click('[data-save-section="fronts"]');
    await page.sleep(300);
    const saveGreenAgain = await page.evaluate(`
      const b = document.querySelector('[data-save-section="fronts"]');
      return { saved: b.dataset.saved, text: b.textContent.trim() };
    `);
    await shot('8c-save-green-again');
    check('F5 Save: red → green on save, GREEN after closing and reopening Settings',
      saveBefore.saved === '0' && saveAfter.saved === '1' && saveReopened.saved === '1'
      && saveReopened.text.includes('✓'),
      JSON.stringify({ saveBefore, saveAfter, saveReopened }));
    check('F5 …RED again the moment anything changes, and green when saved again',
      saveDirty.saved === '0' && saveDirty.text === 'Save' && saveGreenAgain.saved === '1'
      && saveDirty.className !== saveReopened.className,
      JSON.stringify({ saveDirty, saveGreenAgain }));
    measurements.save = {
      before: saveBefore, after: saveAfter, reopened: saveReopened, dirty: saveDirty,
    };
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(300);

    // ══ 2 + 3. THE ELEMENT MODAL, AND AN OVERRIDE THAT REACHES THE PICTURE ══
    const built = await page.evaluate(`
      // Each call re-reads the store: zustand hands out a SNAPSHOT, so a state
      // captured before an action does not see what the action did.
      const { id } = ${P}.project.getState().addUnit('BUD');
      ${P}.project.getState().addShelves(id, 1);
      ${P}.project.getState().addPlinth(id);
      const s = ${P}.project.getState();
      const unit = s.units.find((u) => u.id === id);
      const shelf = s.unitResult(id).panels.find((p) => p.part === 'SHELF');
      return { id, shelfId: shelf ? shelf.id : null, name: unit ? unit.params.unit_num : null };
    `);
    await page.sleep(700);
    check('a cabinet with a shelf and a plinth is on the floor', Boolean(built.shelfId), JSON.stringify(built));

    // The element list, as the picker builds it.
    // The list, read out of the picker the owner actually uses.
    await page.evaluate(`
      const s = ${P}.project.getState();
      ${P}.ui.getState().selectUnit(${JSON.stringify(built.id)});
      ${P}.ui.getState().selectElement(${JSON.stringify(built.id)}, ${JSON.stringify(built.shelfId)});
      return true;
    `);
    await page.sleep(600);
    const picker = await page.evaluate(`
      const sel = document.querySelector('[data-element-material]');
      if (!sel) return null;
      return {
        options: [...sel.options].map((o) => ({ key: o.value, label: o.textContent.trim() })),
        value: sel.value,
      };
    `);
    const frontRows = (picker?.options || []).filter((o) => o.key.startsWith('front:'));
    check('F1.3 the element list shows one row PER FRONT TYPE, keyed by type',
      frontRows.length === 2 && frontRows.every((o) => /^Front [12] · /.test(o.label)),
      JSON.stringify(frontRows));
    measurements.elementChoices = picker?.options || null;
    await shot('2a-element-modal-front-types');

    // BEFORE: the shelf wears the carcass. Measured off the canvas.
    const shelfBox = await page.evaluate(`
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { x: Math.round(r.left + r.width * 0.42), y: Math.round(r.top + r.height * 0.45), width: 220, height: 140 };
    `);
    const beforePng = await pixels('3a-shelf-before-override', shelfBox);
    const beforeLum = regionLuminance(beforePng);

    // Front 2 is given a COLOUR as well as a board, so the change is one the
    // eye can see — CLAUDE.md F1.4's own example: "a shelf switched to Front
    // 2's board turns that colour on screen".
    await page.evaluate(`
      ${P}.project.getState().setFrontColour({ hex: '#7b1e28', name: '3005 Wine Red', system: 'RAL' }, 'f2');
      return true;
    `);
    await page.sleep(700);

    // Give the shelf front type 2's board — through the very picker the owner
    // uses, by key.
    const applied = await page.evaluate(`
      const sel = document.querySelector('[data-element-material]');
      if (!sel) return { error: 'no picker on screen' };
      const opt = [...sel.options].find((o) => o.value === 'front:f2');
      if (!opt) return { error: 'no Front 2 row', options: [...sel.options].map((o) => o.value) };
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { value: sel.value };
    `);
    await page.sleep(800);
    const overrideState = await page.evaluate(`
      const s = ${P}.project.getState();
      const unit = s.units.find((u) => u.id === ${JSON.stringify(built.id)});
      // A SHELF keeps its material on its ITEM (turn 9) and every other piece on
      // the unit's element overrides (turn 11); both arrive on the panel's meta,
      // which is what the BOM, the sheet and the picture all read.
      const item = (unit.params.sections?.[0]?.items || []).find((i) => i.kind === 'shelf') || null;
      const o = (unit.params.element_overrides || {})[${JSON.stringify(built.shelfId)}] || null;
      const panel = s.unitResult(unit.id).panels.find((p) => p.id === ${JSON.stringify(built.shelfId)});
      return { override: o, item, meta: panel ? panel.meta : null };
    `);
    const afterPng = await pixels('3b-shelf-after-override', shelfBox);
    const afterLum = regionLuminance(afterPng);
    check('F1.4 the override is stored by KEY and reaches the engine',
      applied?.value === 'front:f2' && overrideState.meta?.material_key === 'front:f2',
      JSON.stringify({ applied, stored: overrideState.item || overrideState.override, meta: overrideState.meta }));
    check('F1.4 …and the PICTURE changed where the shelf is',
      Math.abs(afterLum.mean - beforeLum.mean) > 1.5,
      `mean ${beforeLum.mean} → ${afterLum.mean} (Δ ${(afterLum.mean - beforeLum.mean).toFixed(1)})`);
    measurements.elementOverride = { before: beforeLum, after: afterLum, box: shelfBox };

    // ══ 6. DOOR EXTEND: ONE DOOR, AND A SELECTION (F4.1/F4.2) ══════════════
    const wall = await page.evaluate(`
      const ids = [];
      for (let i = 0; i < 3; i += 1) ids.push(${P}.project.getState().addUnit('WUD').id);
      for (const id of ids) ${P}.project.getState().addDoors(id);
      return ids;
    `);
    await page.sleep(700);
    // The single door's own modal, through the store's own selection.
    await page.evaluate(`
      const s = ${P}.project.getState();
      const id = ${JSON.stringify(wall[0])};
      const door = s.unitResult(id).panels.find((p) => p.part === 'FRONT');
      ${P}.ui.getState().selectUnit(id);
      ${P}.ui.getState().openModal('element', { unitId: id, panelId: door.id, anchor: null });
      return true;
    `);
    await page.sleep(600);
    const doorField = await page.evaluate(`
      const box = document.querySelector('[data-door-extend]');
      const num = document.querySelector('[data-door-extend-mm]');
      const note = document.querySelector('[data-door-height]');
      return {
        checked: box ? box.checked : null,
        value: num ? num.value : null,
        disabled: num ? num.disabled : null,
        doorHeight: note ? note.dataset.doorHeight : null,
      };
    `);
    await shot('6a-door-extend-single');
    check('F4.1 the single door carries the NUMBER, defaulting to 38',
      String(doorField.value) === '38', JSON.stringify(doorField));

    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.clearSelection();
      ${P}.ui.getState().selectUnit(${JSON.stringify(wall[0])});
      for (const id of ${JSON.stringify(wall.slice(1))}) ${P}.ui.getState().selectUnit(id, { additive: true });
      return true;
    `);
    await page.sleep(600);
    const multi = await page.evaluate(`
      const block = document.querySelector('[data-bulk-door-extend]');
      const num = block ? block.querySelector('[data-door-extend-mm]') : null;
      const apply = document.querySelector('[data-bulk="door-extend"]');
      return {
        present: Boolean(block),
        value: num ? num.value : null,
        apply: apply ? apply.textContent.trim() : null,
        count: document.querySelector('[data-multi-count]')?.dataset.multiCount || null,
      };
    `);
    await shot('6b-door-extend-multi');
    if (multi.present) {
      await page.click('[data-bulk="door-extend"]');
      await page.sleep(500);
    }
    const bulkResult = await page.evaluate(`
      const s = ${P}.project.getState();
      return ${JSON.stringify(wall)}.map((id) => s.units.find((u) => u.id === id).params.door_extend);
    `);
    check('F4.2 door extend exists over a MULTI-SELECTION, at 38, and applies to all',
      multi.present && String(multi.value) === '38' && bulkResult.every((v) => Number(v) === 38),
      JSON.stringify({ multi, bulkResult }));
    measurements.doorExtend = { single: doorField, multi, applied: bulkResult };

    // ══ 7. TWO INDEPENDENT HEIGHTS ON A WALL UNIT (F4.3) ══════════════════
    const heights = await page.evaluate(`
      const id = ${JSON.stringify(wall[0])};
      ${P}.project.getState().addEndPanel(id, { side: 'L' });
      const ep = () => (${P}.project.getState().units.find((u) => u.id === id).params.end_panels || [])[0];
      const before = {
        extend: ${P}.project.getState().units.find((u) => u.id === id).params.door_extend,
        below: ep().below_mm || 0,
      };
      ${P}.project.getState().setEndPanelBelow(id, ep().id, 120);
      const afterPanel = {
        extend: ${P}.project.getState().units.find((u) => u.id === id).params.door_extend,
        below: (${P}.project.getState().units.find((u) => u.id === id).params.end_panels || [])[0].below_mm,
      };
      ${P}.project.getState().updateUnitParams(id, { door_extend: 64 });
      const afterDoor = {
        extend: ${P}.project.getState().units.find((u) => u.id === id).params.door_extend,
        below: (${P}.project.getState().units.find((u) => u.id === id).params.end_panels || [])[0].below_mm,
      };
      const r = ${P}.project.getState().unitResult(id);
      const panel = r.panels.find((p) => p.part === 'END-PANEL');
      const door = r.panels.find((p) => p.part === 'FRONT');
      return { before, afterPanel, afterDoor, panelH: panel && panel.h, doorH: door && door.h, panelY: panel && panel.box.y };
    `);
    await page.sleep(600);
    await shot('7a-wall-unit-two-heights');
    check('F4.3 the panel\'s height and the door\'s extend move INDEPENDENTLY',
      heights.afterPanel.below === 120 && heights.afterPanel.extend === 38
      && heights.afterDoor.extend === 64 && heights.afterDoor.below === 120,
      JSON.stringify(heights));
    measurements.wallHeights = heights;

    // ══ 12. AN INFILL FILLED TO THE CEILING (F9) ══════════════════════════
    const infill = await page.evaluate(`
      const id = ${JSON.stringify(built.id)};
      ${P}.project.getState().moveUnit(id, 0, 0);
      ${P}.project.getState().setSideInfillPinned(id, 'L', true);
      const before = ${P}.project.getState().units.find((u) => u.id === id).params.side_infill_left_top_mm || 0;
      const top = ${P}.project.getState().sideInfillToCeiling(id, 'L');
      const unit = ${P}.project.getState().units.find((u) => u.id === id);
      const piece = ${P}.project.getState().unitResult(id).panels
        .find((p) => p.role === 'infill' && p.meta && p.meta.side === 'left');
      return {
        before,
        top,
        roomHeight: ${P}.project.getState().project.room.height,
        unitHeight: unit.params.height,
        pieceH: piece ? piece.h : null,
      };
    `);
    await page.sleep(800);
    await shot('12a-infill-to-the-ceiling');
    check('F9 a side infill runs to the ceiling, like the panel beside it',
      infill.top > 0 && infill.pieceH >= infill.unitHeight + infill.top - 1,
      JSON.stringify(infill));
    measurements.infill = infill;

    // ══ 9. A RENAMED CABINET (F6) ═════════════════════════════════════════
    const renamed = await page.evaluate(`
      const id = ${JSON.stringify(built.id)};
      const name = ${P}.project.getState().setUnitName(id, 'Island');
      const unit = ${P}.project.getState().units.find((u) => u.id === id);
      const result = ${P}.project.getState().unitResult(id);
      return { name, stored: unit.params.unit_num, engine: result.unitNum };
    `);
    await page.sleep(500);
    check('F6 the name is the owner\'s, and the engine takes it',
      renamed.name === 'Island' && renamed.engine === 'Island', JSON.stringify(renamed));

    // …and it is printed in the CNC tree and in the BOM.
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(900);
    const inTree = await page.evaluate(`
      const rows = [...document.querySelectorAll('aside button')].map((b) => b.textContent.trim());
      return rows.filter((t) => t.includes('Island'));
    `);
    await shot('9a-renamed-in-the-cnc-tree');
    check('F6 …and the CNC tree prints it', inTree.length > 0, JSON.stringify(inTree.slice(0, 3)));

    // ══ 4. CNC BY MATERIAL (F2) ═══════════════════════════════════════════
    await page.evaluate(`${P}.ui.getState().setCncView('material'); return true;`);
    await page.sleep(1200);
    // Frame the whole sheet before photographing it: switching the view
    // reshapes it, and a picture taken mid-fit shows a corner of it.
    await page.click('button', 'Fit').catch(() => {});
    await page.sleep(700);
    // …and nudge it down, so the SECTION CAPTIONS clear the floating toolbar.
    // The toolbar has hung over the top-left corner of the sheet since turn 11;
    // this is the photographer moving, not the drawing.
    const sheetCentre = await page.evaluate(`
      const r = document.querySelector('svg').getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    `);
    await page.mouse('mousePressed', sheetCentre.x, sheetCentre.y);
    await page.mouse('mouseMoved', sheetCentre.x, sheetCentre.y + 70);
    await page.mouse('mouseReleased', sheetCentre.x, sheetCentre.y + 70, { buttons: 0 });
    await page.sleep(500);
    const sections = await page.evaluate(`
      const nodes = [...document.querySelectorAll('[data-cnc-section]')];
      return nodes.map((n) => ({
        key: n.dataset.cncSection,
        caption: (n.querySelector('text') || {}).textContent || '',
      }));
    `);
    const sprayedButtons = await page.evaluate(`
      const text = document.body.innerText.toLowerCase();
      return {
        sprayed: text.includes('sprayed only'),
        nonSprayed: text.includes('non-sprayed'),
      };
    `);
    await shot('4a-cnc-by-material');
    check('F2.1 the sheet splits into one section per ASSIGNED material',
      sections.length >= 3 && sections.every((s) => s.key.startsWith('mat:') || s.key.startsWith('unassigned:')),
      JSON.stringify(sections.map((s) => s.caption.trim().slice(0, 40))));
    check('F2.1 …and there is NO sprayed / non-sprayed toggle anywhere on the view',
      !sprayedButtons.sprayed && !sprayedButtons.nonSprayed, JSON.stringify(sprayedButtons));
    measurements.cncSections = sections;

    // ══ 5. FAR ZOOM: THE LABELS STAY INSIDE THEIR PARTS (F3) ══════════════
    // Zoom IN to a cabinet first: at full-sheet zoom a 22 mm caption is under
    // the readability floor and is deliberately NOT drawn (F3), so a "labels
    // stay inside" claim has to be made where there are labels.
    const svgCentre = await page.evaluate(`
      const r = document.querySelector('svg').getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    `);
    await page.wheel(svgCentre.x, svgCentre.y, -240, 10);
    await page.sleep(600);
    const near = await page.evaluate(`
      const svg = document.querySelector('svg');
      const labels = [...svg.querySelectorAll('[data-part-label]')];
      const parts = [...svg.querySelectorAll('polygon')];
      let outside = 0;
      for (const label of labels) {
        const part = label.closest('g').querySelector('polygon');
        if (!part) continue;
        const a = label.getBoundingClientRect();
        const b = part.getBoundingClientRect();
        if (a.left < b.left - 1 || a.right > b.right + 1 || a.top < b.top - 1 || a.bottom > b.bottom + 1) outside += 1;
      }
      return {
        labels: labels.length, parts: parts.length, outside,
        size: labels[0] ? Number(labels[0].getAttribute('font-size')) : null,
      };
    `);
    await shot('5a-cnc-near-zoom');
    // Zoom OUT, hard — the owner's screenshot.
    const canvasCentre = await page.evaluate(`
      const r = document.querySelector('svg').getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    `);
    // …and then well past the fit, which is the owner's own screenshot: the
    // whole job on screen at once, where turn 11's screen-sized captions piled
    // onto each other and spilled outside their parts.
    await page.wheel(canvasCentre.x, canvasCentre.y, 240, 16);
    await page.sleep(700);
    const far = await page.evaluate(`
      const svg = document.querySelector('svg');
      const labels = [...svg.querySelectorAll('[data-part-label]')];
      // Does every label still sit inside the part it names? Compared in SCREEN
      // pixels, which is the only frame in which "spilling out" means anything.
      let outside = 0;
      for (const label of labels) {
        const part = label.closest('g').querySelector('polygon');
        if (!part) continue;
        const a = label.getBoundingClientRect();
        const b = part.getBoundingClientRect();
        if (a.left < b.left - 1 || a.right > b.right + 1 || a.top < b.top - 1 || a.bottom > b.bottom + 1) outside += 1;
      }
      return {
        labels: labels.length,
        outside,
        size: labels[0] ? Number(labels[0].getAttribute('font-size')) : null,
      };
    `);
    await shot('5b-cnc-far-zoom');
    check('F3 the part codes are drawn, and every one is INSIDE its own part',
      near.labels > 0 && near.outside === 0, JSON.stringify(near));
    check('F3 …and at FAR zoom none of them spills over a neighbour',
      far.outside === 0, JSON.stringify(far));
    check('F3 …and the caption is a SHEET size: it did not grow as the drawing shrank',
      near.size == null || far.size == null || far.size <= near.size + 0.001,
      JSON.stringify({ nearSize: near.size, farSize: far.size }));
    measurements.cncAnnotation = { near, far };

    // The BOM, with the renamed cabinet in it.
    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(600);
    await page.evaluate(`${P}.ui.getState().setBomOpen(true); return true;`).catch(() => {});
    await page.sleep(700);
    const bom = await page.evaluate(`
      const text = document.body.innerText;
      return { island: text.includes('Island') };
    `);
    await shot('9b-renamed-in-the-bom');
    check('F6 …and so does the BOM', bom.island, JSON.stringify(bom));
    await page.evaluate(`${P}.ui.getState().setBomOpen(false); return true;`).catch(() => {});
    await page.sleep(400);

    // ══ 10. THE ELEMENT EDITOR'S LIGHT (F7) ═══════════════════════════════
    //
    // MEASURED, as CLAUDE.md demands: the same detail region, with the rig the
    // two windows used to carry (ambient 0.75 + two directionals) and with the
    // turn-16 rig. The first is produced by turning the profile's rig back down
    // to those three numbers, which is exactly what "before" means here.
    const openEditor = async () => {
      await page.evaluate(`
        ${P}.ui.getState().openModal('cabinet', { unitId: ${JSON.stringify(built.id)}, anchor: null });
        return true;
      `);
      await page.sleep(1400);
      return page.evaluate(`
        const el = document.querySelector('[data-cabinet-canvas]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.left), y: Math.round(r.top),
          width: Math.round(r.width), height: Math.round(r.height),
        };
      `);
    };
    const setRig = async (rig) => {
      await page.evaluate(`
        const store = ${P}.profile.getState();
        const p = store.profile;
        store.setProfile({ ...p, appearance: { ...p.appearance, editorRig: ${JSON.stringify(rig)} } });
        return true;
      `);
      await page.sleep(900);
    };
    const shipped = await page.evaluate(`
      return JSON.parse(JSON.stringify(${P}.profile.getState().profile.appearance.editorRig));
    `);
    const OLD_RIG = {
      ambient: 0.75,
      hemisphere: { sky: '#ffffff', ground: '#ffffff', intensity: 0 },
      lamps: [
        { id: 'key', x: 1, y: 1.6, z: 1, intensity: 1.6 },
        { id: 'fill', x: -1, y: 0.6, z: -0.4, intensity: 0.5 },
      ],
    };
    const editorBox = await openEditor();
    // EXPLODE it: the machining is what has to read (dog bones, drilling, edge
    // profiles), and it is inside the cabinet until the cabinet comes apart.
    await page.click('[data-explode]').catch(() => {});
    await page.sleep(1600);
    // A DETAIL region: the middle of the canvas, where the parts are.
    const detail = {
      x: editorBox.x + Math.round(editorBox.width * 0.25),
      y: editorBox.y + Math.round(editorBox.height * 0.20),
      width: Math.round(editorBox.width * 0.50),
      height: Math.round(editorBox.height * 0.60),
    };
    // …measured over the FURNITURE and not the window's ground: the modal's
    // background is a flat #fafaf8, and a mean taken over it would report the
    // paper rather than the parts.
    const FURNITURE = { below: 244 };
    await setRig(OLD_RIG);
    const litBeforePng = await pixels('10a-editor-light-before', detail);
    const litBefore = regionLuminance(litBeforePng, null, FURNITURE);
    await setRig(shipped);
    const litAfterPng = await pixels('10b-editor-light-after', detail);
    const litAfter = regionLuminance(litAfterPng, null, FURNITURE);
    check('F7 the element editor is measurably brighter, and DETAIL reads',
      litAfter.mean > litBefore.mean * 1.05 && litAfter.dark <= litBefore.dark,
      `furniture mean ${litBefore.mean} → ${litAfter.mean} `
      + `(+${(100 * (litAfter.mean / Math.max(1, litBefore.mean) - 1)).toFixed(0)} %), `
      + `dark share ${litBefore.dark} → ${litAfter.dark}, p05 ${litBefore.p05} → ${litAfter.p05}`);
    measurements.editorLight = { region: detail, before: litBefore, after: litAfter, oldRig: OLD_RIG, rig: shipped };
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(500);

    // ══ 11. WALL UNITS versus BASE UNITS (F8) ═════════════════════════════
    //
    // DIAGNOSE FIRST. Read the actual door materials of a wall unit and a base
    // unit out of the live scene, then measure the highlight on each.
    // A CONTROLLED pair: one base unit and one wall unit ON THE SAME WALL, at
    // the same x, both with doors. The owner's comparison is exactly this one —
    // "the hanging units do not shine like the base units" — and it is only a
    // comparison if the two doors face the same way and are lit by the same rig
    // from the same side. A base unit standing at the far end of the room at an
    // angle to it is a different question.
    const pair = await page.evaluate(`
      ${P}.project.getState().newProject('Turn 16 gloss');
      ${P}.ui.getState().closeLibrary();
      const base = ${P}.project.getState().addUnit('BUD').id;
      ${P}.project.getState().moveUnit(base, 1200, 0);
      ${P}.project.getState().addDoors(base);
      const wall = ${P}.project.getState().addUnit('WUD').id;
      ${P}.project.getState().moveUnit(wall, 1200, 0);
      ${P}.project.getState().addDoors(wall);
      ${P}.ui.getState().clearSelection();
      return { base, wall };
    `);
    await page.sleep(1600);
    const scene = await page.evaluate(`
      const s = ${P}.project.getState();
      const base = s.units.find((u) => u.id === ${JSON.stringify(pair.base)});
      const wall = s.units.find((u) => u.id === ${JSON.stringify(pair.wall)});
      const readDoor = (unit) => {
        const r = s.unitResult(unit.id);
        const door = r.panels.find((p) => p.part === 'FRONT');
        return door ? { id: door.id, role: door.role, materialRole: door.material_role, exposed: door.finish_exposed } : null;
      };
      return { baseId: base && base.id, wallId: wall && wall.id, base: readDoor(base), wall: readDoor(wall) };
    `);
    // The MATERIALS, out of the LIVE SCENE — turn 13's own handle
    // (`window.__cc.views.room`, 3d/viewHandle.js), which is the harness
    // pattern CLAUDE.md F8 asks for. Every panel mesh carries its engine panel
    // id since this turn, so the reading can name the door it measured.
    const materialsInScene = await page.evaluate(`
      const view = ${P}.views && ${P}.views.room;
      if (!view || !view.scene) return { error: 'the room view is not mounted', seen: [] };
      const seen = [];
      const walk = (obj, unitId) => {
        if (!obj) return;
        if (obj.material && obj.geometry && obj.userData && obj.userData.ccPanelId) {
          const m = obj.material;
          seen.push({
            unitId,
            panelId: obj.userData.ccPanelId,
            role: obj.userData.ccRole,
            materialRole: obj.userData.ccMaterialRole,
            colour: m.color ? '#' + m.color.getHexString() : null,
            roughness: m.roughness,
            metalness: m.metalness,
            env: m.envMapIntensity,
            clearcoat: m.clearcoat,
            clearcoatRoughness: m.clearcoatRoughness,
          });
        }
        (obj.children || []).forEach((c) => walk(c, unitId));
      };
      const scan = (obj) => {
        if (!obj) return;
        if (obj.userData && obj.userData.ccUnitId) walk(obj, obj.userData.ccUnitId);
        else (obj.children || []).forEach(scan);
      };
      scan(view.scene);
      return { seen };
    `);

    // …and the pixels, on the DOORS THEMSELVES. Where each door is on screen
    // is computed from the live camera (the same handle, the same copy of
    // three), so the two readings are of the two doors and not of two bands of
    // a photograph that happen to contain them.
    const doorRects = await page.evaluate(`
      const view = ${P}.views && ${P}.views.room;
      if (!view) return null;
      const THREE = view.three;
      const canvas = view.gl.domElement;
      const r = canvas.getBoundingClientRect();
      const find = (unitId) => {
        let found = null;
        const walk = (obj, inUnit) => {
          if (!obj || found) return;
          const mine = inUnit || (obj.userData && obj.userData.ccUnitId === unitId);
          if (mine && obj.userData && obj.userData.ccRole === 'front' && obj.geometry) found = obj;
          (obj.children || []).forEach((c) => walk(c, mine));
        };
        walk(view.scene, false);
        return found;
      };
      const rectOf = (mesh) => {
        if (!mesh) return null;
        const box = new THREE.Box3().setFromObject(mesh);
        let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
        for (const x of [box.min.x, box.max.x]) {
          for (const y of [box.min.y, box.max.y]) {
            for (const z of [box.min.z, box.max.z]) {
              const v = new THREE.Vector3(x, y, z).project(view.camera);
              const sx = (v.x * 0.5 + 0.5) * r.width;
              const sy = (-v.y * 0.5 + 0.5) * r.height;
              minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
              minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
            }
          }
        }
        // A margin in, so the reading is the FACE and not its outline.
        const inset = 0.18;
        const w = maxX - minX; const h = maxY - minY;
        return {
          panelId: mesh.userData.ccPanelId,
          x: Math.round(minX + w * inset),
          y: Math.round(minY + h * inset),
          w: Math.round(w * (1 - inset * 2)),
          h: Math.round(h * (1 - inset * 2)),
        };
      };
      return {
        wall: rectOf(find(${JSON.stringify('WALLID')})),
        base: rectOf(find(${JSON.stringify('BASEID')})),
        canvas: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
      };
    `.replace('"WALLID"', JSON.stringify(scene.wallId)).replace('"BASEID"', JSON.stringify(scene.baseId)));

    const glossPng = await pixels('11a-wall-vs-base-gloss', doorRects?.canvas || null);
    const wallBand = doorRects?.wall ? highlight(glossPng, doorRects.wall) : null;
    const baseBand = doorRects?.base ? highlight(glossPng, doorRects.base) : null;

    // THE DIAGNOSIS: the door meshes of a wall unit and of a base unit, read
    // out of the live scene. Same colour, same roughness, same env probe, same
    // clearcoat → the material path is not the problem, and the difference the
    // owner sees is the RIG (F8's second branch).
    const doorMats = (materialsInScene.seen || []).filter((m) => m.role === 'front');
    const wallDoorMat = doorMats.find((m) => m.unitId === scene.wallId) || null;
    const baseDoorMat = doorMats.find((m) => m.unitId === scene.baseId) || null;
    const sameMaterial = Boolean(wallDoorMat && baseDoorMat)
      && wallDoorMat.colour === baseDoorMat.colour
      && wallDoorMat.roughness === baseDoorMat.roughness
      && wallDoorMat.env === baseDoorMat.env
      && wallDoorMat.clearcoat === baseDoorMat.clearcoat;
    measurements.gloss = {
      doors: scene,
      wallDoorMaterial: wallDoorMat,
      baseDoorMaterial: baseDoorMat,
      sameMaterial,
      rects: doorRects ? { wall: doorRects.wall, base: doorRects.base } : null,
      wallDoor: wallBand,
      baseDoor: baseBand,
      points: await page.evaluate(`
        return JSON.parse(JSON.stringify(${P}.profile.getState().profile.appearance.studio.points));
      `),
    };
    check('F8 DIAGNOSIS: a wall door and a base door are the SAME material',
      sameMaterial, JSON.stringify({ wall: wallDoorMat, base: baseDoorMat }));
    check('F8 the gloss is MEASURED on both doors (numbers, not impressions)',
      Boolean(wallBand && baseBand),
      wallBand && baseBand
        ? `wall door top-2 % ${wallBand.topMean} / mean ${wallBand.mean} vs `
          + `base door top-2 % ${baseBand.topMean} / mean ${baseBand.mean}`
        : 'no door on screen to measure');

    // ── the console has to be clean ──
    // The one 404 this app has always produced is the favicon it does not ship;
    // it is not a turn-16 error and the walk says so rather than hiding it.
    const errors = page.errors.filter((e) => !/favicon|ResizeObserver|status of 404/i.test(e));
    check('the console is clean', errors.length === 0, errors.slice(0, 3).join(' | '));

    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify({ steps, measurements }, null, 1)}\n`);
    const failed = steps.filter((s) => !s.ok);
    console.log(`\n${steps.length - failed.length}/${steps.length} checks passed`);
    if (failed.length) {
      console.log('FAILED:');
      for (const f of failed) console.log(`  - ${f.label} ${f.detail}`);
    }
    await page.close();
    process.exit(failed.length ? 1 : 0);
  } catch (e) {
    console.error(e);
    try {
      await page.screenshot(`${OUT}crash.png`);
      writeFileSync(`${OUT}measurements.json`, `${JSON.stringify({ steps, measurements, crash: String(e) }, null, 1)}\n`);
    } catch { /* the page may be gone */ }
    await page.close();
    process.exit(1);
  }
}

main();
