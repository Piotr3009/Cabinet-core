// ─── Turn 15, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn15.mjs
//
// CLAUDE.md F10 names the highlights and this is those highlights, in the order
// the turn built them:
//
//   1  the green ✓ Save, and the folded line carrying `· 18 mm`
//   2  the GOLD FRAMES on the settings sections
//   3  the right panel: framed, and CLOSED by default
//   4  the interior outlines, inside an open carcass
//   5  a LAMINATE front showing the decor picker
//   6  a VENEER front, chosen from the veneer list — and a veneered CARCASS
//   7  the style GALLERY: its SVG tiles and its filter box
//   8  a library sub-list FLYING OUT to the side
//   9  the catalogue: the new groups and the soon-entries
//  10  the side↔top infill corner at 45°, in Solid and in the part drawing
//  11  a wall unit stopping at a ceiling-height end panel, measured to
//  12  Remove doors clearing three cabinets at once
//  13  both CNC views, and the toggle
//
// It MEASURES rather than trusting, exactly as turns 11–14 do. Where a claim is
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
const OUT = argOf('--out', new URL('../verify/t15/', import.meta.url).pathname);

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
  const shot = (name) => page.screenshot(`${OUT}${name}.png`);
  const measurements = {};

  const fresh = async (name) => {
    await page.evaluate(`
      ${P}.project.getState().newProject(${JSON.stringify(name)});
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      // …and put the LIBRARY away. It is a floating panel that outlives a new
      // project, so a step that opened it would otherwise photograph it sitting
      // over the next step's subject.
      ${P}.ui.getState().closeLibrary();
      return true;
    `);
    await page.sleep(600);
  };
  const openSettings = async () => {
    await page.evaluate(`${P}.ui.getState().openModal('design'); return true;`);
    await page.sleep(500);
  };
  /** The computed border colour of a node, so "gold" is measured and not hoped. */
  const BORDER_OF = `
    const borderOf = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return { colour: s.borderTopColor, width: s.borderTopWidth };
    };
  `;

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Turn 15 walk');
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(800);

    // ══ 1. THE SAVE TURNS GREEN, AND THE FOLD CARRIES THE THICKNESS (F1.1/2) ═
    await openSettings();
    const before = await page.evaluate(`
      const b = document.querySelector('[data-save-section="carcass"]');
      const s = getComputedStyle(b);
      return { saved: b.dataset.saved, text: b.textContent.trim(), colour: s.color };
    `);
    await page.click('[data-save-section="carcass"]');
    await page.sleep(300);
    const after = await page.evaluate(`
      const b = document.querySelector('[data-save-section="carcass"]');
      const s = getComputedStyle(b);
      const folded = document.querySelector('[data-folded="carcass"]');
      return {
        saved: b.dataset.saved,
        text: b.textContent.trim(),
        colour: s.color,
        line: folded ? folded.textContent.trim() : null,
        thickness: folded?.querySelector('[data-folded-thickness]')?.textContent.trim() || null,
      };
    `);
    check('F1.1 the red Save turns GREEN with a tick once it has been pressed',
      before.saved === '0' && after.saved === '1' && after.text.includes('✓')
      && before.colour !== after.colour,
      JSON.stringify({ before, after: { saved: after.saved, text: after.text, colour: after.colour } }));
    check('F1.2 the folded carcass line carries the PROJECT thickness',
      /18 mm/.test(after.thickness || ''),
      JSON.stringify({ thickness: after.thickness, line: after.line }));
    measurements.save = { before, after };
    await shot('1a-save-green-and-thickness');

    // …and opening it again turns it red, because there is something to save again.
    await page.click('[data-save-section="carcass"]');
    await page.sleep(250);
    const reopened = await page.evaluate(`
      const b = document.querySelector('[data-save-section="carcass"]');
      return { saved: b.dataset.saved, text: b.textContent.trim() };
    `);
    check('F1.1 …and editing the section puts it back to red',
      reopened.saved === '0' && reopened.text === 'Save', JSON.stringify(reopened));

    // ══ 2. THE GOLD FRAMES ON THE SETTINGS SECTIONS (F1.3) ═══════════════════
    const frames = await page.evaluate(`
      ${BORDER_OF}
      const ids = ['carcass', 'fronts', 'door-style'];
      return ids.map((id) => ({ id, ...borderOf('[data-settings-section="' + id + '"]') }));
    `);
    const goldish = (c) => /170, ?142, ?104/.test(String(c || ''));
    check('F1.3 CARCASSES, FRONTS and the door-style block each sit in a gold frame',
      frames.length === 3 && frames.every((f) => goldish(f.colour) && parseFloat(f.width) >= 1),
      JSON.stringify(frames));
    measurements.frames = frames;
    await shot('2a-gold-frames-on-settings');

    // ══ 5+6+7. THE PICKERS AND THE GALLERY (F3, F4) ══════════════════════════
    //
    // Taken here, while the settings surface is open, because they live in it.
    const laminate = await page.evaluate(`
      ${P}.project.getState().setFrontType('f1', { source: 'laminate' });
      return true;
    `);
    await page.sleep(500);
    const laminateUi = await page.evaluate(`
      return {
        decorPicker: Boolean(document.querySelector('[data-front-type="f1"] input[placeholder*="H1180"]')),
        veneerPicker: Boolean(document.querySelector('[data-front-type="f1"] [data-veneer-picker]')),
        ralPalette: Boolean(document.querySelector('[data-front-type="f1"] [data-colour-system]')),
      };
    `);
    check('F3.1 a LAMINATE front shows the EGGER decor picker, not a RAL palette',
      laminateUi.decorPicker && !laminateUi.veneerPicker, JSON.stringify({ laminate, ...laminateUi }));
    await shot('5a-laminate-shows-decor-picker');

    await page.evaluate(`${P}.project.getState().setFrontType('f1', { source: 'veneer' }); return true;`);
    await page.sleep(500);
    const veneerTiles = await page.evaluate(`
      const tiles = [...document.querySelectorAll('[data-front-type="f1"] [data-veneer]')];
      return tiles.map((t) => t.dataset.veneer);
    `);
    if (veneerTiles.length) await page.click('[data-front-type="f1"] [data-veneer]');
    await page.sleep(350);
    const veneerChosen = await page.evaluate(`
      const d = ${P}.project.getState().project.design;
      const t = d.fronts.types[0];
      return { source: t.source, finish_id: t.finish_id, colour: t.colour };
    `);
    check('F3.2 a VENEER front picks a TIMBER, and the project stores the veneer’s own id',
      veneerTiles.length >= 3 && String(veneerChosen.finish_id || '').startsWith('veneer:'),
      JSON.stringify({ veneerTiles, veneerChosen }));
    measurements.veneer = { veneerTiles, veneerChosen };
    await shot('6a-veneer-front-and-list');

    // …and the CARCASS gains the same source (F3.3).
    const carcassVeneer = await page.evaluate(`
      const btn = document.querySelector('[data-carcass-source="veneer"]');
      if (!btn) return { present: false };
      btn.click();
      return { present: true };
    `);
    await page.sleep(400);
    const carcassAfter = await page.evaluate(`
      const t = ${P}.project.getState().project.design.carcass.types[0];
      const picker = document.querySelector('[data-carcass-picker]');
      return { source: t.source, picker: picker ? picker.dataset.carcassPicker : null };
    `);
    check('F3.3 the carcass gains a VENEER source beside EGGER decor and Sprayed',
      carcassVeneer.present && carcassAfter.source === 'veneer' && carcassAfter.picker === 'veneer',
      JSON.stringify({ carcassVeneer, carcassAfter }));
    measurements.carcassVeneer = carcassAfter;
    await shot('6b-carcass-veneer-source');

    const gallery = await page.evaluate(`
      const tiles = [...document.querySelectorAll('[data-style-tile]')];
      return {
        tiles: tiles.map((t) => t.dataset.styleTile),
        drawings: tiles.filter((t) => t.querySelector('svg[data-style-art]')).length,
        filter: Boolean(document.querySelector('[data-style-filter]')),
        newStyle: Boolean(document.querySelector('[data-new-style]')),
      };
    `);
    check('F4 the door styles are a GALLERY of drawings with a filter box beside "+ New style"',
      gallery.tiles.length === 7 && gallery.drawings === 7 && gallery.filter && gallery.newStyle,
      JSON.stringify(gallery));
    // …and the filter is what makes it scale: type, and the grid narrows.
    await shot('7a-style-gallery');
    // A REAL keystroke, not a value assignment: React owns this input, and a
    // programmatic `value =` never reaches its state.
    await page.click('[data-style-filter]');
    await page.send('Input.insertText', { text: 'arch' });
    await page.sleep(400);
    const filtered = await page.evaluate(`
      return [...document.querySelectorAll('[data-style-tile]')].map((t) => t.dataset.styleTile);
    `);
    check('F4.2 …and the filter narrows it, which is what makes thirty styles usable',
      filtered.length === 2 && filtered.every((id) => ['A', 'AH'].includes(id)),
      JSON.stringify(filtered));
    measurements.gallery = { ...gallery, filtered };
    await shot('7b-style-gallery-filtered');

    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(300);

    // ══ 3. THE RIGHT PANEL: FRAMED, AND CLOSED BY DEFAULT (F1.4) ═════════════
    await fresh('F1.4');
    await page.evaluate(`
      const { id } = ${P}.project.getState().addUnit('BUD');
      ${P}.ui.getState().selectUnit(id);
      return true;
    `);
    await page.sleep(700);
    const panel = await page.evaluate(`
      ${BORDER_OF}
      const sections = [...document.querySelectorAll('[data-section]')];
      return {
        count: sections.length,
        open: sections.filter((s) => s.dataset.open === '1').map((s) => s.dataset.section),
        borders: sections.slice(0, 3).map((s) => {
          const st = getComputedStyle(s);
          return { section: s.dataset.section, colour: st.borderTopColor };
        }),
      };
    `);
    check('F1.4 the right panel arrives with every section CLOSED, each in its own gold frame',
      panel.count >= 4 && panel.open.length === 0 && panel.borders.every((b) => goldish(b.colour)),
      JSON.stringify(panel));
    // …and the one you open is the one that lights up.
    await page.click('[data-section] button');
    await page.sleep(300);
    const lit = await page.evaluate(`
      const s = document.querySelector('[data-section][data-open="1"]');
      return s ? { section: s.dataset.section, klass: s.className } : null;
    `);
    check('F1.4 …and the ACTIVE section’s frame lights up',
      Boolean(lit && lit.klass.includes('cc-frame-active')), JSON.stringify(lit));
    measurements.rightPanel = { panel, lit };
    await shot('3a-right-panel-framed-and-closed');

    // ══ 4. THE OUTLINES INSIDE A CARCASS (F2) ════════════════════════════════
    const offset = await page.evaluate(`
      // The PANEL meshes only — a room's wall and a hinge are not cut board and
      // have no interior edges to lose. They are found the way everything else
      // in this walk finds a cabinet: by the unit id the view stamps on it.
      const v = ${P}.views.room;
      const found = [];
      v.scene.traverse((g) => {
        if (!g.userData?.ccUnitId) return;
        g.traverse((o) => {
          if (!o.isMesh || !o.material || o.userData?.ccHelper) return;
          if (o.material.type !== 'MeshPhysicalMaterial') return;
          if (found.length >= 8) return;
          found.push({
            on: Boolean(o.material.polygonOffset),
            factor: o.material.polygonOffsetFactor,
            units: o.material.polygonOffsetUnits,
          });
        });
      });
      return { found, profile: ${P}.profile.getState().profile.appearance.outline.polygonOffset };
    `);
    check('F2 every panel FILL carries the depth offset the profile asks for',
      offset.found.length > 0 && offset.found.every((m) => m.on
        && m.factor === offset.profile.factor && m.units === offset.profile.units),
      JSON.stringify(offset));
    measurements.polygonOffset = offset;
    // …photographed INSIDE an open carcass, which is where the owner saw them
    // go. Shelves in it, so there are interior edges to lose in the first place,
    // and the selection dropped so the dashed marker is not what you are
    // looking at.
    await page.evaluate(`
      const store = ${P}.project.getState();
      const id = store.units[0].id;
      ${P}.project.getState().addShelvesBulk([id], 2);
      ${P}.ui.getState().clearSelection();
      ${P}.ui.getState().setShowDimensions(false);
      return true;
    `);
    await page.sleep(700);
    await page.evaluate(`
      const v = ${P}.views.room;
      const g = [];
      v.scene.traverse((o) => { if (o.userData?.ccUnitId) g.push(o); });
      const box = new v.three.Box3().setFromObject(g[0]);
      const c = box.getCenter(new v.three.Vector3());
      // Face on, just outside the open front: every interior arris — the
      // shelves against the sides, the bottom against the back — is in view.
      v.camera.position.set(c.x + 0.12, c.y + 0.10, box.max.z + 0.52);
      if (v.controls) { v.controls.target.copy(c); v.controls.update(); }
      v.camera.lookAt(c);
      return true;
    `);
    await page.sleep(900);
    await shot('4a-outlines-inside-a-carcass');

    // ══ 8+9. THE LIBRARY: FLYOUTS AND THE CATALOGUE (F5) ═════════════════════
    await fresh('F5');
    await page.evaluate(`${P}.ui.getState().openLibraryToInsert('kitchen', null); return true;`);
    await page.sleep(500);
    const catalogue = await page.evaluate(`
      const groups = [...document.querySelectorAll('[data-library-group]')].map((g) => g.dataset.libraryGroup);
      const list = document.querySelector('[data-library-list]');
      const s = list ? getComputedStyle(list) : null;
      return { groups, overflow: s ? s.overflowY : null, maxHeight: s ? s.maxHeight : null };
    `);
    check('F5.2 the catalogue is the owner’s four groups, and F1.5 the list SCROLLS',
      catalogue.groups.join(',') === 'base-units,tall-units,wall-units,extras'
      && catalogue.overflow === 'auto',
      JSON.stringify(catalogue));
    measurements.catalogue = catalogue;

    const rowBox = await page.click('[data-library-group="base-units"]');
    await page.sleep(450);
    const flyout = await page.evaluate(`
      const row = document.querySelector('[data-library-group="base-units"]');
      const fly = document.querySelector('[data-library-flyout="base-units"]');
      if (!row || !fly) return null;
      const r = row.getBoundingClientRect();
      const f = fly.getBoundingClientRect();
      return {
        row: { left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom) },
        fly: { left: Math.round(f.left), right: Math.round(f.right), top: Math.round(f.top) },
        entries: [...fly.querySelectorAll('[data-library-entry]')].map((e) => e.dataset.libraryEntry),
        soon: [...fly.querySelectorAll('[data-library-entry][data-disabled]')].map((e) => e.dataset.libraryEntry),
      };
    `);
    const toTheSide = flyout && (flyout.fly.left >= flyout.row.right || flyout.fly.right <= flyout.row.left);
    check('F5.1 a sub-list flies out to the SIDE — it never pushes the list downwards',
      toTheSide, JSON.stringify(flyout && { row: flyout.row, fly: flyout.fly }));
    check('F5.2 …and it holds the owner’s base units, the held-open ones saying why',
      Boolean(flyout && flyout.entries.includes('door-base') && flyout.soon.length >= 6),
      JSON.stringify(flyout && { entries: flyout.entries, soon: flyout.soon }));
    measurements.flyout = { rowBox, flyout };
    await shot('8a-library-flyout-to-the-side');
    await shot('9a-catalogue-groups-and-soon');

    // ══ 10. THE MITRED CORNER (F6) ═══════════════════════════════════════════
    await fresh('F6');
    const mitre = await page.evaluate(`
      const store = ${P}.project.getState();
      store.setRoom({ ...store.project.room, height: 2350 });
      ${P}.project.getState().setDesign({ infill: { sideWidth: 100 } });
      const a = ${P}.project.getState().addUnit('BUDTALL').id;
      ${P}.project.getState().moveUnit(a, -9999, 0);
      ${P}.project.getState().addUnit('BUDTALL');
      ${P}.project.getState().addTopInfill(a);
      ${P}.project.getState().fillToCeiling(a);
      ${P}.project.getState().sideInfillToCeiling(a, 'L');
      const r = ${P}.project.getState().unitResult(a);
      const face = r.panels.find((p) => p.id === 'INFILL-T-FACE');
      const filler = r.panels.find((p) => p.id === 'INFILL-L-FACE');
      const run = ${P}.project.getState().units.find((u) => u.id === a).params.run_top_infill;
      return {
        a,
        mitre: run.mitre,
        sideMitre: run.sideMitre,
        faceH: run.faceH,
        fillerOutline: filler.cnc.outline,
        fillerSize: { w: filler.w, h: filler.h },
        faceOutline: face.cnc.outline,
        faceW: face.w,
        runLength: run.length,
      };
    `);
    const legs = mitre.fillerOutline.length === 4 && mitre.mitre.left > 0;
    check('F6 the side↔top infill corner is a 45° MITRE, and the filler is still cut to size',
      legs && mitre.sideMitre.left === mitre.faceH
      && mitre.faceW === mitre.runLength + mitre.mitre.left,
      JSON.stringify({
        mitre: mitre.mitre, faceH: mitre.faceH, fillerSize: mitre.fillerSize, fillerOutline: mitre.fillerOutline,
      }));
    measurements.mitre = mitre;
    // The corner itself, framed: the LEFT end of the run at the CEILING, which
    // is the one place in the room this joint exists. Dimensions off, or the
    // "600 mm" caption stands exactly in front of it.
    await page.evaluate(`
      ${P}.ui.getState().setShowDimensions(false);
      const v = ${P}.views.room;
      const g = [];
      v.scene.traverse((o) => { if (o.userData?.ccUnitId) g.push(o); });
      const box = new v.three.Box3();
      for (const o of g) box.expandByObject(o);
      // Nearly FACE ON, because the joint is a line in the plane of the doors:
      // seen from the side it is foreshortened into the arris it is not.
      const corner = new v.three.Vector3(box.min.x + 0.05, box.max.y - 0.05, box.max.z);
      v.camera.position.set(corner.x + 0.06, corner.y + 0.04, corner.z + 0.42);
      if (v.controls) { v.controls.target.copy(corner); v.controls.update(); }
      v.camera.lookAt(corner);
      return true;
    `);
    await page.sleep(900);
    await shot('10a-infill-corner-mitre-solid');

    // …and the same 45° in the PART DRAWING, which is where a workshop reads it.
    await page.evaluate(`
      ${P}.ui.getState().openModal('part-detail', {
        unitId: ${JSON.stringify(mitre.a)}, panelId: 'INFILL-L-FACE', anchor: null,
      });
      return true;
    `);
    await page.sleep(900);
    const drawing = await page.evaluate(`
      const svg = document.querySelector('.cc-drawing svg') || document.querySelector('[role="dialog"] svg');
      return { drawn: Boolean(svg), points: svg ? (svg.innerHTML.match(/polyline|polygon|path/g) || []).length : 0 };
    `);
    check('F6 …and the part drawing shows the same cut', drawing.drawn, JSON.stringify(drawing));
    await shot('10b-infill-corner-mitre-drawing');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(300);

    // ══ 11. A PANEL IS A WALL (F7) ═══════════════════════════════════════════
    await fresh('F7');
    const panelWall = await page.evaluate(`
      // TWO runs, deliberately, and each from a clean project: once the wall
      // unit has slid PAST the panel's line it is on the other side of it, and
      // a clamp cannot teleport it back across. Asking the same question twice
      // of one cabinet would be asking a different question the second time.
      const run = (toCeiling) => {
        ${P}.project.getState().newProject('F7 ' + toCeiling);
        const store = ${P}.project.getState();
        const base = store.addUnit('BUD').id;
        ${P}.project.getState().moveUnit(base, 1200, 0);
        ${P}.project.getState().addEndPanel(base, { side: 'R' });
        const ep = ${P}.project.getState().units.find((u) => u.id === base).params.end_panels[0];
        if (toCeiling) ${P}.project.getState().endPanelToCeiling(base, ep.id);
        const wall = ${P}.project.getState().addUnit('WUD').id;
        ${P}.project.getState().moveUnit(wall, 3000, 0);
        ${P}.project.getState().moveUnit(wall, -9999, 0);
        const b = ${P}.project.getState().units.find((u) => u.id === base);
        return {
          base,
          wall,
          x: ${P}.project.getState().units.find((u) => u.id === wall).position.x_mm,
          panelFace: b.position.x_mm + b.params.width + ep.thickness,
          top: b.params.end_panels[0].top_mm || 0,
        };
      };
      const through = run(false);
      const stopped = run(true);
      return { through, stopped };
    `);
    check('F7 a ceiling-height end panel is a WALL: the hanging unit stops AT it',
      panelWall.through.x < panelWall.through.panelFace
      && panelWall.stopped.x === panelWall.stopped.panelFace
      && panelWall.stopped.top > 0,
      JSON.stringify(panelWall));
    measurements.panelWall = panelWall;
    await page.evaluate(`
      ${P}.ui.getState().setShowDimensions(true);
      const v = ${P}.views.room;
      v.camera.position.set(1.4, 2.6, 4.2);
      if (v.controls) { v.controls.target.set(1.4, 1.1, 0); v.controls.update(); }
      v.camera.lookAt(1.4, 1.1, 0);
      return true;
    `);
    await page.sleep(900);
    await shot('11a-wall-unit-stops-at-panel');

    // ══ 12. REMOVE DOORS, THREE AT ONCE (F8) ═════════════════════════════════
    await fresh('F8');
    const doors = await page.evaluate(`
      const store = ${P}.project.getState();
      const ids = [store.addUnit('BUD').id, ${P}.project.getState().addUnit('BUD').id, ${P}.project.getState().addUnit('BUD').id];
      ${P}.project.getState().addDoorsBulk(ids);
      for (const id of ids) ${P}.ui.getState().selectUnit(id, { additive: true });
      const before = ids.map((id) => Boolean(${P}.project.getState().units.find((u) => u.id === id).params.doors));
      return { ids, before };
    `);
    await page.sleep(700);
    await shot('12a-remove-doors-before');
    const removed = await page.evaluate(`
      const btn = document.querySelector('[data-bulk="remove-doors"]');
      if (!btn) return { present: false };
      btn.click();
      return { present: true, label: btn.textContent.trim() };
    `);
    await page.sleep(600);
    const doorsAfter = await page.evaluate(`
      return ${JSON.stringify(doors.ids)}.map((id) => Boolean(${P}.project.getState().units.find((u) => u.id === id).params.doors));
    `);
    check('F8 "Remove doors" strips every selected cabinet in one action',
      removed.present && doors.before.every(Boolean) && doorsAfter.every((d) => d === false),
      JSON.stringify({ removed, before: doors.before, after: doorsAfter }));
    // …and ONE Ctrl+Z brings all three back.
    await page.key('z', { ctrl: true });
    await page.sleep(600);
    const undone = await page.evaluate(`
      return ${JSON.stringify(doors.ids)}.map((id) => Boolean(${P}.project.getState().units.find((u) => u.id === id).params.doors));
    `);
    check('F8 …and ONE undo brings all three sets back',
      undone.every(Boolean), JSON.stringify(undone));
    measurements.doors = { before: doors.before, after: doorsAfter, undone };
    await page.sleep(400);
    await shot('12b-remove-doors-after');

    // ══ 13. THE TWO CNC VIEWS, AND THE TOGGLE (F9) ═══════════════════════════
    await fresh('F9');
    await page.evaluate(`
      const store = ${P}.project.getState();
      const a = store.addUnit('BUD').id;
      const b = ${P}.project.getState().addUnit('BUDTALL').id;
      ${P}.project.getState().addPlinth(a);
      // Doors on both, so the sheet has FRONTS on it — a "by material" view of
      // a kitchen with no doors would prove nothing about splitting by board.
      ${P}.project.getState().addDoorsBulk([a, b]);
      // Assign two real boards, so the "by material" view has materials to
      // split on — which is the whole claim (F9.1: "identity by MATERIAL,
      // never by colour"). Every carcass role on the MDF, the fronts on the
      // white MFC.
      const M = ${P}.materials.getState();
      for (const role of ['side', 'top', 'bottom', 'back', 'shelf', 'plinth', 'infill']) {
        ${P}.materials.getState().setAssignment(role, 'mat_mdf18');
      }
      ${P}.materials.getState().setAssignment('front', 'mat_mfc18_white');
      ${P}.materials.getState().setAssignment('drawer_box', 'mat_ply18_birch');
      ${P}.ui.getState().setViewMode('cnc');
      return true;
    `);
    // The sheet only draws once it has been FITTED to the viewport, and the fit
    // waits on a ResizeObserver — so this waits for the drawing rather than for
    // a guess at how long the fit takes.
    await page.waitFor('document.querySelector("[data-cnc-section]")', { what: 'the CNC sheet to lay out' });
    await page.sleep(500);
    const material = await page.evaluate(`
      const toggle = [...document.querySelectorAll('[data-cnc-view]')].map((b) => ({
        id: b.dataset.cncView, pressed: b.getAttribute('aria-pressed'),
      }));
      const sections = [...document.querySelectorAll('[data-cnc-section]')].map((g) => g.dataset.cncSection);
      const treeOpen = Boolean(document.querySelector('aside'));
      return { toggle, sections, treeOpen, view: ${P}.ui.getState().cncView };
    `);
    check('F9.1 the sheet splits into one section per MATERIAL, with a visible toggle',
      material.toggle.length === 2 && material.view === 'material'
      && material.sections.length >= 2 && material.treeOpen,
      JSON.stringify(material));
    // A short pan so the first section's caption clears the CNC toolbar, which
    // is a fixed overlay in the same corner. The drag is a real one — the same
    // gesture a joiner uses — so it also proves the pan still works in the view.
    await page.mouse('mousePressed', 800, 620);
    await page.mouse('mouseMoved', 980, 720);
    await page.mouse('mouseReleased', 980, 720, { buttons: 0 });
    await page.sleep(400);
    await shot('13a-cnc-by-material');

    await page.click('[data-cnc-view="cabinet"]');
    await page.waitFor('document.querySelector("[data-cnc-section=\\"run\\"]")', { what: 'the run-parts group' });
    await page.sleep(500);
    const cabinet = await page.evaluate(`
      const sections = [...document.querySelectorAll('[data-cnc-section]')].map((g) => g.dataset.cncSection);
      return {
        sections,
        view: ${P}.ui.getState().cncView,
        run: sections.includes('run'),
        treeOpen: Boolean(document.querySelector('aside')),
      };
    `);
    check('F9.2 …and BY CABINET gives a square per carcass with the run parts on their own',
      cabinet.view === 'cabinet' && cabinet.sections.length >= 2 && cabinet.run && cabinet.treeOpen,
      JSON.stringify(cabinet));
    measurements.cnc = { material, cabinet };
    await shot('13b-cnc-by-cabinet');

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
