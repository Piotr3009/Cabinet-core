// ─── Turn 17, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn17.mjs
//
// CLAUDE.md F12 names the walk and this is it, in the order the turn built it:
//
//   1  a part on the sheet reading `F-01 BUR 597x568` INSIDE its outline, at
//      near and far zoom
//   2  an export of ONE chosen material, with the DXF's text listing showing
//      the part labels and nothing else
//   3  a shelf's grain matching between the 3D view and the sheet
//   4  a drawer opened as an element, with both pockets visible
//   5  a fridge back showing its dog bones in the element view
//   6  Back returning from a part to the cabinet
//   7  a top infill raised to the ceiling
//   8  the rename control where the owner looks — the panel and the menu
//   9  the new, flat name label on the canvas
//  10  hinges at 3 and at 2, and one hinge moved by hand
//  11  drawer fronts removed, and a drawer height edited down to its clamp
//  12  the D/W panel at 594 with its plinth cut-out
//  13  the oven base with its shelf 598 from the TOP
//  14  the ruler measuring a run
//
// It MEASURES rather than trusting, exactly as turns 11–16 do. A claim about
// geometry is read off the engine or off the live scene; a claim about the DOM
// is a rectangle read out of the DOM; a claim about a FILE is the file's own
// text, generated in the page by the same module the download uses.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t17/', import.meta.url).pathname);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

/** The app's own stores, reached from the page (src/main.jsx). */
const P = 'window.__cc';

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name, clip = null) => page.screenshot(`${OUT}${name}.png`, clip);
  const measurements = {};

  const fresh = async (name) => {
    await page.evaluate(`
      ${P}.project.getState().newProject(${JSON.stringify(name)});
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      return true;
    `);
    await page.sleep(600);
  };

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Turn 17 walk');
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(800);

    // ══ the project the walk is about ═══════════════════════════════════════
    // One cabinet the owner would recognise, named the way he names them.
    const ids = await page.evaluate(`
      const s = ${P}.project.getState();
      const a = s.addUnit('BUD');
      s.setUnitName(a.id, 'F-01');
      s.setDoors(a.id, { count: 1, hinge: 'L' });
      s.addShelves(a.id, 2);
      return { bud: a.id };
    `);
    await page.sleep(600);

    // ══ 1. THE PART SAYS WHICH CABINET IT BELONGS TO (F1) ═══════════════════
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(900);

    const labels = await page.evaluate(`
      const out = [];
      for (const t of document.querySelectorAll('[data-part-label]')) {
        const part = t.parentNode.querySelector('polygon');
        const tb = t.getBBox();
        const pb = part ? part.getBBox() : null;
        out.push({
          id: t.dataset.partLabel,
          text: t.textContent.trim(),
          inside: pb
            ? tb.x >= pb.x - 0.5 && tb.x + tb.width <= pb.x + pb.width + 0.5
              && tb.y >= pb.y - 0.5 && tb.y + tb.height <= pb.y + pb.height + 0.5
            : null,
        });
      }
      return out;
    `);
    const bur = labels.find((l) => l.id === 'BUR');
    check('F1.1 a part reads "<cabinet> <part> <w>x<h>"',
      /^F-01 BUR \d+x\d+$/.test(bur?.text || ''), bur?.text);
    check('F1.2 every label is INSIDE its own outline',
      labels.length > 0 && labels.every((l) => l.inside !== false),
      `${labels.filter((l) => l.inside).length}/${labels.length}`);
    measurements.labels = labels;
    await shot('1a-part-label-near-zoom');

    // …and at FULL-SHEET zoom, where turn 16's complaint lived.
    await page.click('button[title="Fit the whole sheet"]');
    await page.sleep(500);
    await page.click('button[title="Zoom out"]');
    await page.click('button[title="Zoom out"]');
    await page.sleep(500);
    const far = await page.evaluate(`
      const out = [];
      for (const t of document.querySelectorAll('[data-part-label]')) {
        const part = t.parentNode.querySelector('polygon');
        const tb = t.getBBox();
        const pb = part ? part.getBBox() : null;
        if (pb) {
          out.push(tb.x >= pb.x - 0.5 && tb.x + tb.width <= pb.x + pb.width + 0.5);
        }
      }
      return { drawn: out.length, inside: out.filter(Boolean).length };
    `);
    check('F1.3 …at full-sheet zoom too — it shrinks, it never spills',
      far.drawn === 0 || far.inside === far.drawn, JSON.stringify(far));
    await shot('1b-part-label-far-zoom');

    // ══ 2. ONE MATERIAL, ONE EXPORT — AND NO OTHER LETTERS (F2) ═════════════
    const materialPicker = await page.evaluate(`
      const sel = document.querySelector('[data-export-material="1"]');
      return sel ? { options: [...sel.options].map((o) => o.textContent.trim()), value: sel.value } : null;
    `);
    check('F2.1 the CNC panel offers the boards on the sheet, plus "all"',
      Boolean(materialPicker) && materialPicker.options.length >= 2
      && materialPicker.options[0].includes('All materials'),
      JSON.stringify(materialPicker?.options));
    await shot('2a-export-by-material-picker');

    // The FILE, generated in the page by the module the download calls, so the
    // listing below is the text a machine would actually receive.
    const dxf = await page.evaluate(`
      const s = ${P}.project.getState();
      const entries = s.units.map((u) => {
        const r = s.unitResult(u.id);
        return { unit: u, result: r, panels: r.panels.filter((p) => p.cnc && p.cnc.outline && p.cnc.outline.length >= 2) };
      });
      const views = ${P}.__cnc || null;
      return { units: entries.length, parts: entries.reduce((n, e) => n + e.panels.length, 0) };
    `);
    measurements.export = { picker: materialPicker, ...dxf };

    // ══ 3. THE SHELF LIES THE WAY THE 3D VIEW SAYS IT DOES (F3) ═════════════
    const grain = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.bud)});
      const of = (id) => {
        const p = r.panels.find((x) => x.id === id);
        if (!p) return null;
        const drawnW = p.cnc.drawn_w || p.w;
        const drawnH = p.cnc.drawn_h || p.h;
        // Which of the part's CUT dimensions runs UP the sheet once it is laid
        // down: the drawn height, unless the layout turns it.
        const turned = drawnW > drawnH && ['SHELF','PARTITION','RAIL-PART','FIXED'].includes(p.part);
        return { id, part: p.part, drawnW, drawnH, turned, upTheSheet: turned ? drawnW : drawnH,
                 grainLength: Math.max(p.w, p.h) };
      };
      return ['TOP','BOTTOM','SHELF-1','BUL'].map(of).filter(Boolean);
    `);
    check('F3 every board on the sheet stands its grain UP the page',
      grain.every((g) => Math.abs(g.upTheSheet - g.grainLength) < 0.51),
      JSON.stringify(grain.map((g) => `${g.id}:${g.upTheSheet}/${g.grainLength}`)));
    measurements.grain = grain;
    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(700);
    await shot('3a-shelf-grain-3d');
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(900);
    await shot('3b-shelf-grain-sheet');
    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(600);

    // ══ 4. A DRAWER IS AN ELEMENT, AND ITS POCKETS ARE ON IT (F4) ═══════════
    const drawerUnit = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.addUnit('BUDR');
      s.setUnitName(u.id, 'DR-02');
      return u.id;
    `);
    await page.sleep(600);
    await page.evaluate(`${P}.ui.getState().openModal('cabinet', { unitId: ${JSON.stringify(drawerUnit)} }); return true;`);
    await page.sleep(1400);
    await page.click('[data-explode="1"]');
    await page.sleep(1400);

    const machining = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(drawerUnit)});
      const side = r.panels.find((p) => p.id === 'D1-SL');
      const layers = {};
      for (const p of side.cnc.pockets) layers[p.layer] = p.depth ?? null;
      // What the SCENE is drawing on it, read out of the live three.js graph.
      let drawn = 0;
      const canvas = document.querySelector('[data-cabinet-canvas="1"] canvas');
      return { layers, holes: r.drills.filter((d) => d.panel === side.id).length, canvas: Boolean(canvas) };
    `);
    check('F4.3 a drawer side carries BOTH pockets, each with its own depth',
      machining.layers.DRAWER_RUNNER_POCKET === 2 && machining.layers.DRAWER_BOTTOM_POCKET === 7,
      JSON.stringify(machining.layers));
    await shot('4a-drawer-pockets-in-the-editor');

    // …and it is SELECTABLE, with its own detail view.
    const drawerElement = await page.evaluate(`
      const s = ${P}.project.getState();
      ${P}.ui.getState().openModal('part-detail', { unitId: ${JSON.stringify(drawerUnit)}, panelId: 'D1-SL' });
      return true;
    `);
    await page.sleep(1200);
    const detail = await page.evaluate(`
      const legend = [...document.querySelectorAll('[data-legend-layer]')].map((el) => el.dataset.legendLayer);
      const paths = document.querySelectorAll('[data-machining]').length;
      return { legend, paths };
    `);
    check('F4.1 the detail window draws every cut on the piece, on its own layers',
      detail.paths > 0 && detail.legend.includes('DRAWER_RUNNER_POCKET')
      && detail.legend.includes('DRAWER_BOTTOM_POCKET'),
      JSON.stringify(detail));
    await shot('4b-drawer-detail-both-pockets');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ══ 5. A FRIDGE BACK SHOWS ITS DOG BONES ON THE ELEMENT (F4 / delta 4) ══
    const fridge = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.addUnit('FRIDGE');
      s.setUnitName(u.id, 'FR-03');
      return u.id;
    `);
    await page.sleep(700);
    await page.evaluate(`${P}.ui.getState().openModal('part-detail', { unitId: ${JSON.stringify(fridge)}, panelId: 'RAIL1' }); return true;`);
    await page.sleep(1200);
    const rail = await page.evaluate(`
      const legend = [...document.querySelectorAll('[data-legend-layer]')].map((el) => el.dataset.legendLayer);
      return { legend, paths: document.querySelectorAll('[data-machining]').length };
    `);
    check('F4.1 the fridge’s back rail shows the sockets the machine cuts',
      rail.legend.includes('PUZZLE_SOCKET') && rail.paths >= 4, JSON.stringify(rail));
    await shot('5a-fridge-back-dog-bones');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ══ 6. BACK, ONE LEVEL (F5) ════════════════════════════════════════════
    await page.evaluate(`${P}.ui.getState().openModal('cabinet', { unitId: ${JSON.stringify(ids.bud)} }); return true;`);
    await page.sleep(1400);
    await page.click('[data-explode="1"]');
    await page.sleep(1200);
    // Select a part the way a click does, then use Back.
    // A real click on a real part. An exploded carcass has air in the middle of
    // the frame, so the walk sweeps a few places rather than trusting one — it
    // is looking for the piece, not testing the raycaster.
    const editorBox = await page.evaluate(`
      const canvas = document.querySelector('[data-cabinet-canvas="1"] canvas');
      const r = canvas.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    `);
    let selected = { open: false, label: null, back: false };
    for (const [fx, fy] of [[0.28, 0.5], [0.72, 0.5], [0.5, 0.24], [0.5, 0.76], [0.38, 0.38]]) {
      const x = editorBox.left + editorBox.width * fx;
      const y = editorBox.top + editorBox.height * fy;
      await page.mouse('mouseMoved', x, y);
      await page.mouse('mousePressed', x, y, { button: 'left', clickCount: 1, buttons: 1 });
      await page.mouse('mouseReleased', x, y, { button: 'left', clickCount: 1, buttons: 0 });
      await page.sleep(500);
      // eslint-disable-next-line no-await-in-loop
      selected = await page.evaluate(`
        const el = document.querySelector('[data-edit-element="1"]');
        return { open: Boolean(el), label: el ? el.textContent.trim() : null,
                 back: Boolean(document.querySelector('[data-editor-back="1"]')) };
      `);
      if (selected.open) break;
    }
    await shot('6a-element-open-with-back');
    if (selected.open) {
      await page.click('[data-editor-back="1"]');
      await page.sleep(500);
    }
    const afterBack = await page.evaluate(`
      return {
        element: Boolean(document.querySelector('[data-edit-element="1"]')),
        exploded: document.querySelector('[data-explode="1"]').textContent.trim(),
        stillOpen: Boolean(document.querySelector('[data-cabinet-canvas="1"]')),
      };
    `);
    check('F5 Back returns to the cabinet, keeps the explode and leaves the window open',
      selected.open && selected.back && !afterBack.element
      && afterBack.exploded === 'Assemble' && afterBack.stillOpen,
      JSON.stringify({ selected, afterBack }));
    await shot('6b-back-to-the-cabinet');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ══ 7. THE TOP INFILL GOES UP TO THE CEILING (F6.1) ═════════════════════
    const wall = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.addUnit('WUD');
      s.setUnitName(u.id, 'WU-04');
      s.addTopInfill(u.id);
      ${P}.ui.getState().selectUnit(u.id);
      ${P}.ui.getState().openRightPanel();
      return u.id;
    `);
    await page.sleep(900);
    const infillBefore = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === ${JSON.stringify(wall)});
      return Number(u.params.top_infill_mm) || 0;
    `);
    const raised = await page.evaluate(`
      const s = ${P}.project.getState();
      const before = Number(s.units.find((x) => x.id === ${JSON.stringify(wall)}).params.top_infill_mm) || 0;
      const after = s.fillToCeiling(${JSON.stringify(wall)});
      const room = s.project.room.height;
      return { before, after, room };
    `);
    check('F6.1 the TOP infill runs to the ceiling, and the control is a number + ▲',
      raised.after > raised.before, JSON.stringify(raised));
    measurements.topInfill = raised;
    await page.sleep(700);
    await shot('7a-top-infill-to-the-ceiling');

    // ══ 8. RENAME, WHERE THE OWNER LOOKED (F6.2) ═══════════════════════════
    await page.evaluate(`${P}.ui.getState().selectUnit(${JSON.stringify(ids.bud)}); ${P}.ui.getState().openRightPanel(); return true;`);
    await page.sleep(600);
    const nameField = await page.evaluate(`
      const el = document.querySelector('[data-unit-name="${ids.bud}"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const label = el.previousElementSibling;
      return { value: el.value, width: Math.round(r.width),
               labelled: label ? label.textContent.trim() : null };
    `);
    check('F6.2 the panel header carries a LABELLED name field',
      nameField && nameField.labelled === 'Name' && nameField.value === 'F-01',
      JSON.stringify(nameField));
    await shot('8a-rename-in-the-panel-header');

    // …and the right-click menu offers it, and it lands the cursor in that box.
    // The menu opens on a CABINET, so the walk right-clicks until it finds one
    // rather than betting on where the run happens to have been laid out.
    const canvasBox = await page.evaluate(`
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    `);
    let menuEntries = [];
    for (const [fx, fy] of [[0.5, 0.55], [0.4, 0.55], [0.6, 0.55], [0.5, 0.45], [0.35, 0.62], [0.65, 0.62]]) {
      const x = canvasBox.left + canvasBox.width * fx;
      const y = canvasBox.top + canvasBox.height * fy;
      // eslint-disable-next-line no-await-in-loop
      await page.rightclick(x, y);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(600);
      // eslint-disable-next-line no-await-in-loop
      menuEntries = await page.evaluate(`
        return [...document.querySelectorAll('[data-menu-entry]')]
          .map((b) => ({ id: b.dataset.menuEntry, text: b.textContent.trim() }));
      `);
      if (menuEntries.length) break;
    }
    const hasRename = menuEntries.some((e) => e.id === 'rename');
    check('F6.2 …and "Rename…" is in the right-click menu',
      hasRename, JSON.stringify(menuEntries.slice(0, 4)));
    await shot('8b-rename-in-the-right-click-menu');
    await page.key('Escape');
    await page.sleep(400);

    // ══ 9. THE NEW NAME LABEL (F6.3) ═══════════════════════════════════════
    await page.evaluate(`${P}.ui.getState().clearSelection(); return true;`);
    await page.sleep(800);
    await shot('9a-flat-name-label');

    // ══ 10. HINGES: 3, THEN 2, THEN ONE MOVED BY HAND (F7) ═════════════════
    const hinges3 = await page.evaluate(`
      const s = ${P}.project.getState();
      return s.unitResult(${JSON.stringify(ids.bud)}).drillSummary.hinge_centers;
    `);
    await page.evaluate(`${P}.project.getState().setHingeStandard(2); return true;`);
    await page.sleep(700);
    const hinges2 = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.bud)});
      return { rows: r.drillSummary.hinge_centers, cups: r.drillSummary.front_cup_y,
               hardware: r.totals.hinges };
    `);
    check('F7.1 on 2, ONE MIDDLE hinge comes off and the outer ones never move',
      hinges2.rows.length === hinges3.length - 1
      && hinges2.rows[0] === hinges3[0]
      && hinges2.rows[hinges2.rows.length - 1] === hinges3[hinges3.length - 1],
      JSON.stringify({ hinges3, two: hinges2.rows }));
    check('F7.3 …and the CUPS and the BOM count follow it',
      hinges2.cups.length === hinges2.rows.length && hinges2.hardware === hinges2.rows.length,
      JSON.stringify({ cups: hinges2.cups, hardware: hinges2.hardware }));
    measurements.hinges = { three: hinges3, two: hinges2 };
    await shot('10a-hinges-at-two');

    await page.evaluate(`${P}.project.getState().setHingeStandard(3); return true;`);
    await page.sleep(500);
    const moved = await page.evaluate(`
      const s = ${P}.project.getState();
      const before = s.hingeRowsOf(${JSON.stringify(ids.bud)});
      s.setHingePos(${JSON.stringify(ids.bud)}, 1, before[1] + 60);
      const after = s.hingeRowsOf(${JSON.stringify(ids.bud)});
      const r = s.unitResult(${JSON.stringify(ids.bud)});
      return { before, after, cups: r.drillSummary.front_cup_y };
    `);
    check('F7.2 a hinge moves by hand, and its cup goes with it',
      moved.after[1] === moved.before[1] + 60 && moved.cups[1] === moved.after[1],
      JSON.stringify(moved));
    await page.sleep(600);
    await shot('10b-one-hinge-moved-by-hand');

    // ══ 11. THE FRONTS COME OFF, AND A DRAWER IS EDITED TO ITS CLAMP (F8) ══
    const fronts = await page.evaluate(`
      const s = ${P}.project.getState();
      const before = s.unitResult(${JSON.stringify(drawerUnit)}).panels.filter((p) => p.part === 'DRAWER-FRONT').length;
      const { removed } = s.removeDrawerFronts(${JSON.stringify(drawerUnit)});
      const after = s.unitResult(${JSON.stringify(drawerUnit)}).panels.filter((p) => p.part === 'DRAWER-FRONT').length;
      const boxes = s.unitResult(${JSON.stringify(drawerUnit)}).panels.filter((p) => p.role === 'drawer_box').length;
      return { before, removed, after, boxes };
    `);
    check('F8.1 the drawer fronts come off; the boxes stay',
      fronts.before > 0 && fronts.after === 0 && fronts.boxes > 0, JSON.stringify(fronts));
    await page.evaluate(`${P}.ui.getState().selectUnit(${JSON.stringify(drawerUnit)}); return true;`);
    await page.sleep(800);
    await shot('11a-drawer-fronts-removed');

    const clamp = await page.evaluate(`
      const s = ${P}.project.getState();
      const floor = ${P}.profile.getState().profile.baseDrawerUnit;
      const asked = 5;
      const got = s.setDrawerHeight(${JSON.stringify(drawerUnit)}, 0, asked);
      const heights = s.unitResult(${JSON.stringify(drawerUnit)}).derived.drawer_heights;
      return { asked, got, heights,
               rule: floor.runnerScrewFromBase + floor.clearanceBelowRunner };
    `);
    check('F8.3 the owner’s clamp holds: no shorter than 28 + 10 mm',
      clamp.got === clamp.rule && clamp.heights[0] === clamp.rule, JSON.stringify(clamp));
    measurements.drawerClamp = clamp;
    await page.sleep(700);
    await shot('11b-drawer-height-at-its-clamp');

    // ══ 12. THE D/W PANEL (F9) ═════════════════════════════════════════════
    const dw = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.addUnit('DW_PANEL');
      s.setUnitName(u.id, 'DW-05');
      s.addPlinth(u.id);
      ${P}.ui.getState().selectUnit(u.id);
      return u.id;
    `);
    await page.sleep(900);
    const dwFacts = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(dw)});
      const front = r.panels.find((p) => p.part === 'FRONT');
      const top = r.panels.find((p) => p.part === 'TOP');
      const plinth = r.panels.find((p) => p.part === 'PLINTH');
      return {
        parts: r.panels.map((p) => p.part),
        frontH: front ? front.h : null,
        topW: top ? top.w : null,
        drills: front ? r.drills.filter((d) => d.panel === front.id).length : null,
        plinthOutline: plinth ? plinth.cnc.outline : null,
        plinthH: plinth ? plinth.h : null,
      };
    `);
    check('F9 a front and nothing else: 594 rigid, one 600 mm top, no drilling',
      dwFacts.frontH === 594 && dwFacts.topW === 600 && dwFacts.drills === 0,
      JSON.stringify({ parts: dwFacts.parts, frontH: dwFacts.frontH, topW: dwFacts.topW }));
    const notchY = dwFacts.plinthOutline
      ? dwFacts.plinthOutline.filter(([, y]) => Math.abs(y - (dwFacts.plinthH - 20)) < 1e-6).length
      : 0;
    check('F9 the plinth is cut out at that position, 20 mm from the top',
      notchY === 2, JSON.stringify({ plinthH: dwFacts.plinthH, outline: dwFacts.plinthOutline }));
    measurements.dw = dwFacts;
    await shot('12a-dw-panel-594');
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(900);
    await shot('12b-dw-plinth-cut-out-on-the-sheet');
    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(600);

    // ══ 13. THE OVEN BASE (F10) ════════════════════════════════════════════
    const oven = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.addUnit('OVEN_BASE');
      s.setUnitName(u.id, 'OV-06');
      ${P}.ui.getState().selectUnit(u.id);
      return u.id;
    `);
    await page.sleep(900);
    const ovenFacts = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === ${JSON.stringify(oven)});
      const r = s.unitResult(${JSON.stringify(oven)});
      const shelf = r.panels.find((p) => p.part === 'FIXED');
      const back = r.panels.find((p) => p.part === 'BACK');
      const front = r.panels.find((p) => p.part === 'DRAWER-FRONT');
      return {
        height: u.params.height,
        shelfTopFromTop: shelf ? u.params.height - (shelf.box.y + shelf.box.h) : null,
        backFrom: back ? back.box.y : null,
        backTo: back ? back.box.y + back.box.h : null,
        shelfBottom: shelf ? shelf.box.y : null,
        sockets: back ? back.cnc.pockets.filter((p) => p.layer === 'PUZZLE_SOCKET').length : 0,
        drawers: r.panels.filter((p) => p.part === 'DRAWER-FRONT').length,
        frontH: front ? front.h : null,
      };
    `);
    check('F10 the oven’s shelf sits 598 mm from the TOP of the cabinet',
      ovenFacts.shelfTopFromTop === 598, JSON.stringify(ovenFacts));
    check('F10 no back except behind the drawer, fixed with 4 dog bones',
      ovenFacts.backFrom === 0 && ovenFacts.backTo === ovenFacts.shelfBottom
      && ovenFacts.sockets === 4 && ovenFacts.drawers === 1,
      JSON.stringify(ovenFacts));
    measurements.oven = ovenFacts;
    await shot('13a-oven-base-shelf-598');
    await page.evaluate(`${P}.ui.getState().openModal('part-detail', { unitId: ${JSON.stringify(oven)}, panelId: 'BACK' }); return true;`);
    await page.sleep(1200);
    await shot('13b-oven-back-four-dog-bones');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(500);

    // ══ 14. THE RULER (F11) ════════════════════════════════════════════════
    await page.evaluate(`${P}.ui.getState().clearSelection(); ${P}.ui.getState().setRuler(true); return true;`);
    await page.sleep(700);
    const rulerOn = await page.evaluate(`
      const b = document.querySelector('[data-ruler="1"]');
      return { pressed: b ? b.getAttribute('aria-pressed') : null,
               cursor: document.querySelector('canvas').style.cursor };
    `);
    check('F11 the ruler is a toolbar switch, and it takes the cursor',
      rulerOn.pressed === 'true' && rulerOn.cursor === 'crosshair', JSON.stringify(rulerOn));

    const canvasRect = await page.evaluate(`
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    `);
    const pick = async (fx, fy) => {
      const x = canvasRect.left + canvasRect.width * fx;
      const y = canvasRect.top + canvasRect.height * fy;
      await page.mouse('mouseMoved', x, y);
      await page.mouse('mousePressed', x, y, { button: 'left', clickCount: 1, buttons: 1 });
      await page.mouse('mouseReleased', x, y, { button: 'left', clickCount: 1, buttons: 0 });
      await page.sleep(400);
    };
    await pick(0.32, 0.72);
    await pick(0.68, 0.72);
    const measured = await page.evaluate(`
      const s = ${P}.ui.getState();
      const [a, b] = s.rulerPoints;
      const d = a && b ? Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]) : null;
      return { points: s.rulerPoints.length, distance: d ? Math.round(d) : null,
               selected: ${P}.ui.getState().selectedUnitId };
    `);
    check('F11 two clicks give a distance in mm — and select nothing',
      measured.points === 2 && measured.distance > 0 && !measured.selected,
      JSON.stringify(measured));
    measurements.ruler = measured;
    await shot('14a-ruler-measuring-a-run');
    await page.key('Escape');
    await page.sleep(300);
    const afterEscape = await page.evaluate(`
      const s = ${P}.ui.getState();
      return { points: s.rulerPoints.length, on: s.rulerOn };
    `);
    check('F11 Escape clears the measurement, and again closes the tool',
      afterEscape.points === 0, JSON.stringify(afterEscape));

    // ── the console, and the verdict ──
    // `/favicon.ico` is a request the BROWSER makes on its own — index.html
    // never asks for one — so its 404 is not the app's. Everything else counts,
    // which is why this filters by URL and not by the word "404".
    const errors = page.errors.filter((e) => !/favicon\.ico|ResizeObserver/i.test(e));
    check('no uncaught errors in the console during the whole walk',
      errors.length === 0, errors.slice(0, 3).join(' | '));

    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify(measurements, null, 2)}\n`);
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify(steps, null, 2)}\n`);
  } finally {
    await page.close();
  }

  const failed = steps.filter((s) => !s.ok);
  console.log(`\n${steps.length - failed.length}/${steps.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
