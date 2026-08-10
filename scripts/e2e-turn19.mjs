// ─── Turn 19, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn19.mjs
//
// CLAUDE.md F6 names the walk and this is it, in the order the turn built it:
//
//   1  Settings-Hinges: system, finish, and the ⌀3 plate VISIBLE AND DISABLED
//      with its tooltip
//   2  a run where one THICK front resolves to 95° and the BOM splits the
//      articles by angle and by finish
//   3  a wardrobe with an inner drawer resolving to 155°
//   4  the hinge modal opened by double-click — offset up and to the right, the
//      door fully visible, in three corners of the screen
//   5  "Assign other hinge" overriding ONE door, and the BOM following
//   6  the hinge models on the drilled points with the fronts hidden, and the
//      grey stand-in with the bucket down
//   7  double-click a part on the CNC sheet: the tree row lights up
//   8  a front's WEIGHT in the element detail footer, MFC vs MDF
//   9  the lift engine's warning text, surfaced with no kit UI
//
// It MEASURES rather than trusting, exactly as turns 11–18 do. A claim about
// geometry is read off the engine; a claim about the DOM is a rectangle read
// out of the DOM; a claim about the hinge a door takes is read off the same
// resolver the BOM and the 3D both use.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t19/', import.meta.url).pathname);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

/** The app's own stores and engines, reached from the page (src/main.jsx). */
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

  /** Every hinge BOM line in the project, as a workshop would read it. */
  const hingeReport = `
    const s = ${P}.project.getState();
    return s.units.map((u) => {
      const r = s.unitResult(u.id);
      return {
        unit: u.params.unit_num,
        type: u.type,
        front_t: r.params.frontT ?? u.params.front_t,
        rows: r.hardware.filter((h) => h.role === 'hinges').map((h) => ({
          qty: h.qty,
          doors: h.spec.doors,
          angle: h.spec.angle,
          finish: h.spec.finish,
          family: h.spec.family,
          article: h.spec.article,
          assigned: h.spec.assigned,
          label: h.spec_label,
        })),
        totalHinges: r.totals.hinges,
        centres: r.drillSummary.hinge_centers.length,
      };
    });
  `;

  /** The modal's rectangle and the point it was opened from. */
  const modalRect = `
    const el = document.querySelector('[data-modal-shell="1"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: r.left, top: r.top, width: r.width, height: r.height,
      right: r.right, bottom: r.bottom,
      side: el.dataset.modalSide,
    };
  `;

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Turn 19 walk');
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(800);

    // ══ 0. THE KNOWLEDGE FILES ARE IN HAND (F0) ═════════════════════════════
    const catalogues = await page.evaluate(`
      const h = window.__ccHinges;
      const l = window.__ccLifts;
      if (!h || !l) return { error: 'the engines are not exposed' };
      const hc = h.hingeCatalogue();
      const lc = l.aventosCatalogue();
      return {
        hinges: hc ? { items: hc.items.length, rungs: hc.rules.byThickness, wardrobe: hc.rules.wardrobeInnerDrawer } : null,
        lifts: lc ? { units: lc.powerUnits.map((u) => u.unit), limits: lc.limits } : null,
      };
    `);
    check('F0.3 the catalogues of record are loaded, and the engine never fetched them',
      catalogues.hinges?.items > 0 && catalogues.lifts?.units.length === 4,
      JSON.stringify({ hinges: catalogues.hinges?.items, lifts: catalogues.lifts?.units }));
    measurements.catalogues = catalogues;

    // ══ the project the walk is about ═══════════════════════════════════════
    // A run a joiner would recognise: two kitchen base units, one of them on a
    // THICK front, and a wardrobe with internal drawers behind its doors.
    const ids = await page.evaluate(`
      const s = ${P}.project.getState();
      const thin = s.addUnit('BUD');
      s.setUnitName(thin.id, 'F-01');
      s.setDoors(thin.id, { count: 2 });
      const thick = s.addUnit('BUD');
      s.setUnitName(thick.id, 'F-02');
      s.setDoors(thick.id, { count: 2 });
      s.updateUnitParams(thick.id, { front_t: 32 });
      const wardrobe = s.addUnit('WARDROBE');
      s.setUnitName(wardrobe.id, 'W-01');
      s.setDoors(wardrobe.id, { count: 2 });
      const plainWardrobe = s.addUnit('WARDROBE');
      s.setUnitName(plainWardrobe.id, 'W-02');
      s.setDoors(plainWardrobe.id, { count: 2 });
      s.addDrawers(wardrobe.id, 3);
      return { thin: thin.id, thick: thick.id, wardrobe: wardrobe.id, plainWardrobe: plainWardrobe.id };
    `);
    await page.sleep(800);

    // ══ 1. SETTINGS-HINGES (F1.1 / F1.5 / F1.7) ═════════════════════════════
    await page.evaluate(`${P}.ui.getState().openModal('design'); return true;`);
    await page.sleep(900);
    const settings = await page.evaluate(`
      const read = (sel) => [...document.querySelectorAll(sel)].map((b) => ({
        id: b.dataset.hingeSystemOption || b.dataset.hingeFinishOption || b.dataset.hingePlateOption,
        title: b.title,
        on: b.getAttribute('aria-pressed') === 'true',
        disabled: b.disabled === true,
      }));
      const note = document.querySelector('[data-hinge-angle-note="1"]');
      return {
        systems: read('[data-hinge-system-option]'),
        finishes: read('[data-hinge-finish-option]'),
        plates: read('[data-hinge-plate-option]'),
        note: note ? note.innerText.replace(/\\s+/g, ' ').trim() : null,
      };
    `);
    check('F1.1 Settings offers the SYSTEM, and CLIP top BLUMOTION is it',
      settings.systems.length === 1 && settings.systems[0].on,
      JSON.stringify(settings.systems.map((s) => s.id)));
    check('F1.1 …the two FINISHES, with nickel the shop default and a tooltip on each',
      settings.finishes.length === 2
      && settings.finishes.find((f) => f.id === 'nickel')?.on
      && settings.finishes.every((f) => (f.title || '').length > 10),
      JSON.stringify(settings.finishes.map((f) => [f.id, f.on])));
    const screw = settings.plates.find((p) => p.id === 'plate_screw3');
    check('F1.5 …and the ⌀3 plate is VISIBLE, DISABLED, and says why',
      screw && screw.disabled === true && /drilling pattern pending/i.test(screw.title || ''),
      screw ? `disabled=${screw.disabled} title="${screw.title}"` : 'the option is missing');
    check('F1.5 the knock-in ⌀5 is the one chosen',
      settings.plates.find((p) => p.id === 'plate_knockin5')?.on === true);
    check('F1.2 the surface says the ANGLE is not a choice, and what the fronts resolve to',
      /not a choice/i.test(settings.note || '') && /110°/.test(settings.note || ''),
      settings.note);
    measurements.settings = settings;

    // The section a joiner is actually looking at — a screenshot of the top of
    // a scrolled panel proves nothing about the control three sections down.
    await page.evaluate(`
      document.querySelector('[data-hinge-system="1"]')
        ?.scrollIntoView({ block: 'center' });
      return true;
    `);
    await page.sleep(500);

    // The tooltip, OPEN — a title attribute nobody can see is not a tooltip.
    await page.evaluate(`
      const b = document.querySelector('[data-hinge-plate-option="plate_screw3"]');
      if (b) {
        const r = b.getBoundingClientRect();
        const tip = document.createElement('div');
        tip.textContent = b.title;
        tip.setAttribute('data-walk-tooltip', '1');
        tip.style.cssText = 'position:fixed;z-index:99999;background:#1c1c1c;color:#e6e6e6;border:1px solid #666;'
          + 'padding:4px 8px;font:12px system-ui;border-radius:4px;left:' + (r.left) + 'px;top:' + (r.bottom + 6) + 'px';
        document.body.appendChild(tip);
      }
      return true;
    `);
    await page.sleep(300);
    await shot('1a-settings-hinges-plate-disabled');
    await page.evaluate(`
      document.querySelector('[data-walk-tooltip="1"]')?.remove();
      ${P}.ui.getState().closeModal();
      return true;
    `);
    await page.sleep(400);

    // ══ 2. A THICK FRONT RESOLVES TO 95°, AND THE BOM SPLITS (F1.2) ═════════
    const byUnit = await page.evaluate(hingeReport);
    const thin = byUnit.find((u) => u.unit === 'F-01');
    const thick = byUnit.find((u) => u.unit === 'F-02');
    check('F1.2 an 18 mm front takes the 110°, a 32 mm front the 95°',
      thin?.rows[0]?.angle === 110 && thick?.rows[0]?.angle === 95,
      `${thin?.rows[0]?.angle}° / ${thick?.rows[0]?.angle}°`);
    check('F1.2 …and the BOM lists a different ARTICLE for each',
      thin?.rows[0]?.article && thick?.rows[0]?.article
      && thin.rows[0].article !== thick.rows[0].article,
      `${thin?.rows[0]?.family} ${thin?.rows[0]?.article} vs ${thick?.rows[0]?.family} ${thick?.rows[0]?.article}`);
    check('F1.2 …while the COUNT does not move — a hinge is a hinge',
      thin?.totalHinges === thick?.totalHinges && thin?.centres === thick?.centres,
      `${thin?.totalHinges} hinges each, ${thin?.centres} rows`);

    // The FINISH, on the same run: the article changes and nothing else does.
    const nickel = JSON.parse(JSON.stringify(byUnit));
    await page.evaluate(`${P}.project.getState().setHingeHardware({ finish: 'onyx' }); return true;`);
    await page.sleep(700);
    const onyx = await page.evaluate(hingeReport);
    check('F1.1 the FINISH changes the article and nothing else',
      onyx.every((u, i) => u.totalHinges === nickel[i].totalHinges)
      && onyx[0].rows[0].article !== nickel[0].rows[0].article
      && onyx[0].rows[0].angle === nickel[0].rows[0].angle,
      `${nickel[0].rows[0].family} → ${onyx[0].rows[0].family}`);
    await page.evaluate(`${P}.project.getState().setHingeHardware({ finish: 'nickel' }); return true;`);
    await page.sleep(500);

    await page.evaluate(`${P}.ui.getState().selectUnit(${JSON.stringify(ids.thick)}); return true;`);
    await page.sleep(600);
    await shot('2a-thick-front-95-degrees');
    measurements.hinges = { nickel, onyx, byUnit };

    // ══ 3. A WARDROBE WITH AN INNER DRAWER: 155° (F1.2) ═════════════════════
    const wardrobes = await page.evaluate(hingeReport);
    const withDrawers = wardrobes.find((u) => u.unit === 'W-01');
    const plain = wardrobes.find((u) => u.unit === 'W-02');
    check('F1.2 a wardrobe door with a drawer behind it takes the 155°',
      withDrawers?.rows[0]?.angle === 155,
      `${withDrawers?.rows[0]?.angle}° · ${withDrawers?.rows[0]?.family}`);
    check('F1.2 …and the wardrobe beside it, with no drawers, does not',
      plain?.rows[0]?.angle === 110,
      `${plain?.rows[0]?.angle}° · ${plain?.rows[0]?.family}`);
    await page.evaluate(`
      ${P}.ui.getState().selectUnit(${JSON.stringify(ids.wardrobe)});
      return true;
    `);
    await page.sleep(700);
    await shot('3a-wardrobe-inner-drawer-155');

    // ══ 4. THE HINGE MODAL, OFF THE DOOR, IN THREE CORNERS (F1.3 / F3) ══════
    // The gesture in the app is a double-click on the hinge in 3D; what it does
    // is open this modal AT THAT POINT (3d/Scene.jsx), and what F3 is about is
    // WHERE the window then lands. So the walk opens it from three points and
    // MEASURES the rectangle against each of them.
    const corners = [
      ['low-left', 260, 820],
      ['low-right', 1380, 820],
      ['top-right', 1380, 140],
    ];
    const placements = [];
    for (const [name, x, y] of corners) {
      // eslint-disable-next-line no-await-in-loop -- one window at a time, on purpose
      await page.evaluate(`
        const s = ${P}.project.getState();
        const r = s.unitResult(${JSON.stringify(ids.thin)});
        const door = r.panels.find((p) => p.part === 'FRONT');
        ${P}.ui.getState().openModal('hinge', {
          unitId: ${JSON.stringify(ids.thin)}, panelId: door.id, hingeIndex: 0,
          at: { x: ${x}, y: ${y} },
        });
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(700);
      // eslint-disable-next-line no-await-in-loop
      const rect = await page.evaluate(modalRect);
      placements.push({ name, click: { x, y }, rect });
      // eslint-disable-next-line no-await-in-loop
      await shot(`4${'abc'[placements.length - 1]}-hinge-modal-${name}`);
      // eslint-disable-next-line no-await-in-loop
      if (name !== 'top-right') await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(250);
    }
    const clear = placements.filter((p) => p.rect
      && (p.rect.left >= p.click.x + 20 || p.rect.right <= p.click.x - 20));
    check('F3 the hinge modal never covers the point it was opened from — all three corners',
      clear.length === 3,
      placements.map((p) => `${p.name}:${p.rect?.side}`).join(' '));
    const above = placements.filter((p) => p.rect && p.rect.bottom <= p.click.y);
    check('F3 …and it sits ABOVE the click wherever the screen has room for it',
      above.length >= 2, `${above.length}/3 above the pointer`);
    const onScreen = placements.filter((p) => p.rect
      && p.rect.left >= 0 && p.rect.top >= 0
      && p.rect.right <= 1600 && p.rect.bottom <= 1000);
    check('F3 …clamped, so none of them leaves the screen',
      onScreen.length === 3,
      placements.map((p) => `${p.name}:${Math.round(p.rect?.left)},${Math.round(p.rect?.top)}`).join(' '));
    measurements.placements = placements;

    // ══ 5. ASSIGN OTHER HINGE — ONE DOOR (F1.3) ═════════════════════════════
    const assign = await page.evaluate(`
      const sel = document.querySelector('[data-hinge-assign="1"]');
      if (!sel) return { error: 'the assign dropdown is not in the window' };
      const options = [...sel.options].map((o) => ({ value: o.value, label: o.text }));
      return { options, value: sel.value };
    `);
    check('F1.3 the modal offers "Assign other hinge" — the catalogue’s own entries',
      !assign.error && assign.options.length > 1
      && assign.options.some((o) => /71B7590/.test(o.value)),
      assign.error || `${assign.options.length - 1} hinges, plus "follow the rule"`);

    const assigned = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.thin)});
      const doors = r.panels.filter((p) => p.part === 'FRONT');
      const right = doors.find((d) => d.meta.hinge === 'R') || doors[1];
      s.assignDoorHinge(${JSON.stringify(ids.thin)}, right.id, '71B7590');
      const after = s.unitResult(${JSON.stringify(ids.thin)});
      return {
        door: right.id,
        rows: after.hardware.filter((h) => h.role === 'hinges').map((h) => ({
          qty: h.qty, doors: h.spec.doors, angle: h.spec.angle,
          family: h.spec.family, finish: h.spec.finish, assigned: h.spec.assigned,
          label: h.spec_label,
        })),
        total: after.totals.hinges,
        drills: after.drills.length,
      };
    `);
    check('F1.3 one door assigned = TWO BOM lines, and they still add up',
      assigned.rows.length === 2
      && assigned.rows.reduce((n, r) => n + r.qty, 0) === assigned.total,
      assigned.rows.map((r) => `${r.doors}×${r.family}@${r.angle}°`).join(' + '));
    check('F1.3 …the assigned line is marked as such, and the other leaf is untouched',
      assigned.rows.filter((r) => r.assigned).length === 1
      && assigned.rows.find((r) => r.assigned)?.doors === 1
      && assigned.rows.find((r) => !r.assigned)?.doors === 1,
      assigned.rows.map((r) => r.label).join(' | '));
    await page.sleep(600);
    await shot('5a-assign-other-hinge');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ══ 6. THE MODELS ON THE DRILLED POINTS (F1.6) ══════════════════════════
    // The bucket is not configured in a preview build, which is the OTHER path
    // and is exactly what CLAUDE.md asks the walk to photograph: the grey
    // stand-in, in the right place, with nothing broken. What is measured is
    // that the view is asking for the RIGHT FILE — the engine's own resolution,
    // per door — and that the hinges are drawn on the engine's own centres.
    const models = await page.evaluate(`
      const s = ${P}.project.getState();
      const h = window.__ccHinges;
      const hw = window.__ccHardware3d;
      const profile = ${P}.profile.getState().profile;
      const u = s.units.find((x) => x.id === ${JSON.stringify(ids.thin)});
      const r = s.unitResult(u.id);
      const instances = hw.hardwareInstances(r, profile);
      const doors = r.panels.filter((p) => p.part === 'FRONT');
      const specs = doors.map((d) => {
        const spec = h.resolveDoorHinge({
          assigned: (u.params.door_hinges || {})[d.id] || null,
          frontThickness: d.thickness,
          innerDrawer: false,
          finish: 'nickel',
        });
        return { door: d.id, family: spec.family, file: spec.file, url: h.hingeModelUrl(spec, profile, '') };
      });
      const plate = h.plateFamily({ plate: 'plate_knockin5', finish: 'nickel' });
      return {
        centres: r.drillSummary.hinge_centers,
        drawnYs: [...new Set(instances.hinges.map((x) => x.y))].sort((a, b) => a - b),
        drawn: instances.hinges.length,
        ordered: hw.hardwareCounts(r).hinges,
        specs,
        plate: plate ? { family: plate.family, file: plate.file } : null,
        bucket: profile.hardware.hinge.cliptop.bucket,
        path: profile.hardware.hinge.cliptop.path,
      };
    `);
    check('F1.6 the hinges are drawn on the ENGINE’s own centres — the LISP columns',
      JSON.stringify(models.drawnYs) === JSON.stringify(models.centres),
      JSON.stringify(models.drawnYs));
    check('F1.6 what is drawn is what is on order',
      models.drawn === models.ordered, `${models.drawn} / ${models.ordered}`);
    check('F1.6 each door asks for its OWN model file, out of the catalogue',
      models.specs.every((s) => s.file && s.file.startsWith('hardware/hinges/blum/cliptop/'))
      && new Set(models.specs.map((s) => s.family)).size === 2,
      models.specs.map((s) => `${s.door}:${s.family}`).join(' '));
    check('F1.6 …and the mounting PLATE has a model of its own',
      Boolean(models.plate?.file), models.plate?.family || '');
    measurements.models = models;

    // Fronts off: the hinges are what a joiner is looking at.
    await page.evaluate(`${P}.ui.getState().selectUnit(${JSON.stringify(ids.thin)}); return true;`);
    await page.sleep(400);
    await page.click('[data-hide-fronts="1"]');
    await page.sleep(1100);
    await shot('6a-hinges-on-the-drilled-points-fronts-hidden');
    // The bucket is unreachable in a preview build (no VITE_SUPABASE_URL), so
    // every model url is a bare path and nothing is fetched. The scene draws
    // the procedural body instead — CLAUDE.md's graceful degradation, measured
    // and then photographed.
    const bucketDown = await page.evaluate(`
      const h = window.__ccHinges;
      const profile = ${P}.profile.getState().profile;
      const [f] = h.hingeFamilies({ angle: 110, finish: 'nickel' });
      return {
        storageBase: '',
        url: h.hingeModelUrl(f, profile, ''),
        canvas: Boolean(document.querySelector('canvas')),
      };
    `);
    check('F1.6 with the bucket unreachable the scene still draws — the grey stand-in',
      bucketDown.canvas === true);
    await shot('6b-grey-stand-in-bucket-down');
    await page.click('[data-hide-fronts="1"]');
    await page.sleep(700);

    // ══ 7. DOUBLE-CLICK A CNC PART → THE TREE ROW LIGHTS UP (F4) ════════════
    await page.evaluate(`
      ${P}.ui.getState().setViewMode('cnc');
      ${P}.ui.getState().openRightPanel();
      return true;
    `);
    await page.sleep(1200);
    const target = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.thin)});
      const door = r.panels.filter((p) => p.part === 'FRONT')[0];
      return { unitId: ${JSON.stringify(ids.thin)}, panelId: door.id };
    `);
    const dbl = await page.evaluate(`
      const g = document.querySelector('[data-cnc-part=' + JSON.stringify(${JSON.stringify(target.panelId)}) + ']');
      if (!g) return { error: 'the part is not on the sheet' };
      g.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      return { ok: true };
    `);
    await page.sleep(900);
    const tree = await page.evaluate(`
      const focus = ${P}.ui.getState().cncFocusPart;
      const row = document.querySelector('[data-cnc-row-focus="1"]');
      const group = document.querySelector('[data-cnc-group-focus="1"]');
      return {
        focus,
        row: row ? { id: row.dataset.cncRow, text: row.innerText.replace(/\\s+/g, ' ').trim() } : null,
        group: group ? group.dataset.cncGroup : null,
        visible: row ? (() => {
          const r = row.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= window.innerHeight;
        })() : false,
      };
    `);
    check('F4 double-clicking a part on the sheet takes the tree to it',
      !dbl.error && tree.focus?.panelId === target.panelId,
      dbl.error || JSON.stringify(tree.focus));
    check('F4 …the branch OPENS and the row is HIGHLIGHTED',
      tree.row?.id === target.panelId, tree.row?.text || 'no lit row');
    check('F4 …in the right group, and scrolled into view',
      tree.group === 'fronts' && tree.visible === true,
      `group=${tree.group} visible=${tree.visible}`);
    // Pure navigation: nothing was ticked off the sheet by the gesture.
    const stillOn = await page.evaluate(`
      const hidden = ${P}.ui.getState().cncHiddenParts;
      return Object.keys(hidden).length;
    `);
    check('F4 …and nothing was ticked, edited or rotated — it is navigation',
      stillOn === 0, `${stillOn} units carry a hidden part`);
    measurements.cncFocus = tree;
    await shot('7a-cnc-doubleclick-highlights-tree-row');
    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(700);

    // ══ 8. A FRONT’S WEIGHT IN THE DETAIL FOOTER (F5.1) ═════════════════════
    const weighed = [];
    for (const [name, materialId] of [['MFC 18', 'mat_mfc18_white'], ['MDF 18', 'mat_mdf18']]) {
      // eslint-disable-next-line no-await-in-loop -- one board at a time, on purpose
      await page.evaluate(`
        const s0 = ${P}.project.getState();
        // A fresh project has never opened the front-type control, so its
        // stored design carries no types yet. Asking for ONE materialises the
        // shipped default without changing anything a joiner chose.
        s0.setFrontTypes(1);
        const s = ${P}.project.getState();
        const typeId = s.project.design.fronts.types[0].id;
        s.setFrontMaterial(typeId, ${JSON.stringify(materialId)});
        const r = s.unitResult(${JSON.stringify(ids.thin)});
        const door = r.panels.find((p) => p.part === 'FRONT');
        ${P}.ui.getState().selectElement(${JSON.stringify(ids.thin)}, door.id);
        ${P}.ui.getState().openModal('element', { unitId: ${JSON.stringify(ids.thin)}, panelId: door.id, at: { x: 900, y: 700 } });
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(900);
      // eslint-disable-next-line no-await-in-loop
      const line = await page.evaluate(`
        const p = document.querySelector('[data-piece-weight]');
        return p ? { kg: Number(p.dataset.pieceWeight), text: p.innerText.replace(/\\s+/g, ' ').trim() } : null;
      `);
      weighed.push({ name, materialId, line });
      // eslint-disable-next-line no-await-in-loop
      await shot(`8${weighed.length === 1 ? 'a' : 'b'}-front-weight-${materialId}`);
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(300);
    }
    check('F5.1 the element detail footer carries the piece’s WEIGHT in kg',
      weighed.every((w) => w.line && w.line.kg > 0),
      weighed.map((w) => `${w.name}: ${w.line?.kg} kg`).join(' · '));
    check('F5.1 …and the SAME door in MDF is the heavier door',
      weighed[1]?.line?.kg > weighed[0]?.line?.kg,
      `${weighed[0]?.line?.kg} → ${weighed[1]?.line?.kg} kg`);
    check('F5.1 …with the line saying where the figure came from',
      weighed.every((w) => /kg\/m²/.test(w.line?.text || '') && /assigned board/.test(w.line?.text || '')),
      weighed[0]?.line?.text || '');
    measurements.weights = weighed;

    // ══ 9. THE LIFT ENGINE’S WARNINGS, WITH NO KIT UI (F5.2–F5.4) ═══════════
    const lift = await page.evaluate(`
      const l = window.__ccLifts;
      const profile = ${P}.profile.getState().profile;
      const kg = l.frontWeightKg({ widthMm: 900, heightMm: 400, kgM2: 12 });
      const proposal = l.selectLiftUnit({
        cabinetHeightMm: 400, frontWeightKg: kg, cabinetWidthMm: 900, innerDepthMm: 320,
      });
      const tooSmall = l.selectLiftUnit({
        cabinetHeightMm: 400, frontWeightKg: 2500 / 400, cabinetWidthMm: 900, innerDepthMm: 320, assigned: 2300,
      });
      const tooBig = l.selectLiftUnit({
        cabinetHeightMm: 700, frontWeightKg: 4, cabinetWidthMm: 2000, innerDepthMm: 200,
      });
      return {
        kg,
        proposal: { unit: proposal.unit, pf: proposal.pf, warnings: proposal.warnings },
        tooSmall: { unit: tooSmall.unit, proposed: tooSmall.proposed, warnings: tooSmall.warnings },
        limits: tooBig.warnings.map((w) => w.message),
        kits: document.querySelectorAll('[data-lift-kit]').length,
      };
    `);
    check('F5.2 the engine PROPOSES a power unit from the cabinet and the front',
      lift.proposal.unit > 0 && lift.proposal.warnings.length === 0,
      `pf ${Math.round(lift.proposal.pf)} → ${lift.proposal.unit}`);
    check('F5.3 an assignment is FITTED and objected to — "silnik proponuje, klient assign"',
      lift.tooSmall.unit === 2300 && lift.tooSmall.proposed === 2500
      && /too heavy for 2300/.test(lift.tooSmall.warnings[0]?.message || ''),
      lift.tooSmall.warnings[0]?.message || '');
    check('F5.2 the three HK limits speak in sentences a joiner can act on',
      lift.limits.length === 3 && lift.limits.every((m) => /\d/.test(m) && /\.$/.test(m)),
      lift.limits.join(' | '));
    check('F5.4 …and there is NO kit UI this turn — the kits are turn 20',
      lift.kits === 0);
    measurements.lift = lift;
    writeFileSync(`${OUT}lift-warnings.md`, [
      '# Turn 19 — the lift engine, with no kit UI (CLAUDE.md F5.4)',
      '',
      'The AVENTOS HK kits are turn 20, after the owner’s pattern session. What',
      'this turn ships is the maths, and this is what it SAYS — the snapshot',
      'CLAUDE.md F6 asks the walk to surface, read out of the running app.',
      '',
      `A 900 × 400 front in 18 mm MFC weighs **${Math.round(lift.kg * 100) / 100} kg**;`,
      `on a 400 mm cabinet that is a power factor of **${Math.round(lift.proposal.pf)}**,`,
      `and the engine proposes the **${lift.proposal.unit}** unit with nothing to object to.`,
      '',
      '## The client assigns something else',
      '',
      ...lift.tooSmall.warnings.map((w) => `- \`${w.code}\` — ${w.message}`),
      '',
      `The **${lift.tooSmall.unit}** is what gets fitted: an assignment is never refused.`,
      '',
      '## Against the HK’s own limits',
      '',
      ...lift.limits.map((m) => `- ${m}`),
      '',
    ].join('\n'));

    // ── the console, and the verdict ──
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
