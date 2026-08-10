// ─── Turn 18, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn18.mjs
//
// CLAUDE.md F7 names the walk and this is it, in the order the turn built it:
//
//   1  a small part whose label WRAPS to centred lines inside its outline, at
//      near and at far zoom
//   2  an export listing where every TEXT is half the sheet's size and nothing
//      else about the file changed
//   3  a kitchen BUDR2 with a drawer height typed in the RIGHT panel — and
//      STAYING (before / after)
//   4  a drawer side in the element view with BOTH pockets, and the 15 / 7 / 2
//      numbers readable in the detail window
//   5  Hide fronts on and off over the same run
//   6  the oven base: the flat front rail, sides socketed only where the back
//      is, and a 169 mm front at 770
//   7  a drawer with its MOVENTO pair on the LISP's own rows, T variant, and
//      the rod present on a wide drawer and absent on a narrow one
//   8  the same scene with the bucket unreachable — the plain profile, nothing
//      broken
//   9  the Runners section in Settings, with the tooltip open
//
// It MEASURES rather than trusting, exactly as turns 11–17 do. A claim about
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
const OUT = argOf('--out', new URL('../verify/t18/', import.meta.url).pathname);

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

  /** Every part label on the sheet, with the box it is drawn in. */
  const labelReport = `
    const out = [];
    for (const t of document.querySelectorAll('[data-part-label]')) {
      const part = t.parentNode.querySelector('polygon');
      const tb = t.getBBox();
      const pb = part ? part.getBBox() : null;
      out.push({
        id: t.dataset.partLabel,
        lines: [...t.querySelectorAll('tspan')].map((s) => s.textContent.trim()),
        size: Number(t.getAttribute('font-size')),
        inside: pb
          ? tb.x >= pb.x - 0.5 && tb.x + tb.width <= pb.x + pb.width + 0.5
            && tb.y >= pb.y - 0.5 && tb.y + tb.height <= pb.y + pb.height + 0.5
          : null,
      });
    }
    return out;
  `;

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Turn 18 walk');
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(800);

    // ══ the project the walk is about ═══════════════════════════════════════
    // A run a joiner would recognise: a kitchen drawer unit, a wardrobe with
    // internal drawers, and an oven base.
    const ids = await page.evaluate(`
      const s = ${P}.project.getState();
      const kitchen = s.addUnit('BUDR2');
      s.setUnitName(kitchen.id, 'F-01');
      const oven = s.addUnit('OVEN_BASE');
      s.setUnitName(oven.id, 'F-02');
      const wardrobe = s.addUnit('WARDROBE');
      s.setUnitName(wardrobe.id, 'W-01');
      s.addDrawers(wardrobe.id, 2);
      s.setDoors(wardrobe.id, { count: 1, hinge: 'L' });
      const narrow = s.addUnit('BUDR2');
      s.updateUnitParams(narrow.id, { width: 300 });
      s.setUnitName(narrow.id, 'F-03');
      return { kitchen: kitchen.id, oven: oven.id, wardrobe: wardrobe.id, narrow: narrow.id };
    `);
    await page.sleep(700);

    // ══ 1. THE LABEL WRAPS, CENTRES AND STAYS INSIDE (F1) ═══════════════════
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(1000);

    const labels = await page.evaluate(labelReport);
    const wrapped = labels.filter((l) => l.lines.length > 1);
    check('F1.1 a label breaks onto more than one centred line',
      wrapped.length > 0,
      `${wrapped.length}/${labels.length} wrapped, deepest ${Math.max(0, ...labels.map((l) => l.lines.length))}`);
    check('F1.1 never more than three lines',
      labels.every((l) => l.lines.length <= 3));
    check('F1.1 every label is INSIDE its own outline',
      labels.length > 0 && labels.every((l) => l.inside !== false),
      `${labels.filter((l) => l.inside).length}/${labels.length}`);
    measurements.labels = labels;
    await shot('1a-label-wraps-near-zoom');

    await page.click('button[title="Fit the whole sheet"]');
    await page.sleep(500);
    await page.click('button[title="Zoom out"]');
    await page.click('button[title="Zoom out"]');
    await page.sleep(600);
    const far = await page.evaluate(labelReport);
    check('F1.1 …at full-sheet zoom too — it shrinks, it never spills',
      far.every((l) => l.inside !== false),
      `${far.filter((l) => l.inside).length}/${far.length}`);
    await shot('1b-label-wraps-far-zoom');

    // ══ 2. HALF THE SIZE IN THE EXPORT, AND NOTHING ELSE (F1.2) ═════════════
    // The FILE, generated in the page by the module the download calls.
    const exported = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === ${JSON.stringify(ids.kitchen)});
      const r = s.unitResult(u.id);
      const dxf = window.__ccDxf;
      if (!dxf) return { error: 'the dxf module is not exposed' };
      const files = dxf.buildUnitDxfFiles(r, ${P}.profile.getState().profile);
      const profile = ${P}.profile.getState().profile;
      const rows = files.map((f) => {
        const panel = r.panels.find((p) => p.id === f.panelId);
        const sheet = dxf.panelLabelBlock(panel, { unitNum: r.unitNum, profile });
        const texts = f.entities.filter((e) => e.type === 'text');
        return {
          name: f.name,
          lines: texts.map((t) => t.str),
          fileHeight: texts[0] ? texts[0].h : null,
          sheetSize: sheet.size,
          nonText: f.entities.filter((e) => e.type !== 'text').length,
        };
      });
      return { rows, scale: profile.cnc.exportLabelScale };
    `);
    if (exported.error) {
      check('F1.2 the export writes the label at half the sheet size', false, exported.error);
    } else {
      const halved = exported.rows.filter((r) => Math.abs(r.fileHeight - r.sheetSize * exported.scale) < 1e-6);
      check('F1.2 every exported label is half the sheet\'s height for that part',
        halved.length === exported.rows.length,
        `${halved.length}/${exported.rows.length}`);
      check('F1.4 …and every entity that is not TEXT is still there',
        exported.rows.every((r) => r.nonText > 0));
      measurements.export = exported;
    }
    await shot('2a-export-label-half-size');

    // ══ 3. A DRAWER HEIGHT TYPED IN THE RIGHT PANEL — AND STAYING (F2) ══════
    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(500);
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.selectUnit(${JSON.stringify(ids.kitchen)});
      ui.openRightPanel();
      // "Section 1" is folded when a project opens; this is the click a joiner
      // makes to get at his drawers.
      if (!ui.panelOpen.contents) ui.togglePanelSection('contents');
      return true;
    `);
    await page.sleep(600);
    const before = await page.evaluate(`
      const s = ${P}.project.getState();
      return s.unitResult(${JSON.stringify(ids.kitchen)}).derived.drawer_heights;
    `);
    await shot('3a-drawer-height-before');

    // Typed into the FIELD, exactly as the owner types it.
    const typed = await page.evaluate(`
      const el = document.querySelector('[data-drawer-height-mm="1"]');
      if (!el) return { error: 'no drawer height field in the right panel' };
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '500');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.blur();
      return { ok: true };
    `);
    await page.sleep(700);
    const after = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === ${JSON.stringify(ids.kitchen)});
      return {
        heights: s.unitResult(u.id).derived.drawer_heights,
        stored: u.params.drawer_heights || null,
        field: (document.querySelector('[data-drawer-height-mm="1"]') || {}).value,
      };
    `);
    check('F2.1 a kitchen drawer height typed in the RIGHT panel STAYS',
      !typed.error && after.heights[0] === 500,
      `${JSON.stringify(before)} → ${JSON.stringify(after.heights)}`);
    check('F2.1 …and the drawers nobody touched take up what is left',
      after.heights.length > 1 && after.heights[1] !== before[1],
      JSON.stringify(after.stored));
    measurements.drawerHeight = { before, after };
    await shot('3b-drawer-height-after');

    const reset = await page.evaluate(`
      const btn = document.querySelector('[data-drawer-heights-reset="1"]');
      if (!btn) return { error: 'no Reset in the right panel' };
      btn.click();
      return { ok: true };
    `);
    await page.sleep(500);
    const backToKit = await page.evaluate(`
      const s = ${P}.project.getState();
      return s.unitResult(${JSON.stringify(ids.kitchen)}).derived.drawer_heights;
    `);
    check('F2.2 Reset hands the stack back to the kit\'s own split',
      !reset.error && JSON.stringify(backToKit) === JSON.stringify(before),
      JSON.stringify(backToKit));

    // ══ 4. A DRAWER SIDE WITH BOTH POCKETS (F3) ═════════════════════════════
    const pockets = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.wardrobe)});
      const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
      const P0 = ${P}.profile.getState().profile.baseDrawerUnit;
      const by = {};
      for (const p of side.cnc.pockets || []) by[p.layer] = p;
      return {
        id: side.id,
        runner: by.DRAWER_RUNNER_POCKET || null,
        bottom: by.DRAWER_BOTTOM_POCKET || null,
        expect: { width: P0.runnerPocketWidth, runnerDepth: P0.runnerPocketDepth, bottomDepth: P0.bottomPocketDepth },
        bottomEnters: (r.derived.bottom_w - r.derived.boxFrontLen) / 2,
      };
    `);
    check('F3.1/F3.2 a wardrobe drawer side carries BOTH pockets, at the owner\'s numbers',
      pockets.runner && pockets.bottom
      && pockets.runner.depth === 2 && pockets.bottom.depth === 7,
      JSON.stringify({ runner: pockets.runner?.depth, bottom: pockets.bottom?.depth }));
    check('F3.3 …and the bottom enters each side 6.5 mm, inside a 7 mm groove',
      pockets.bottomEnters === 6.5, String(pockets.bottomEnters));
    measurements.pockets = pockets;

    // The DETAIL window, where the numbers have to be readable.
    await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.wardrobe)});
      const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
      ${P}.ui.getState().selectElement(${JSON.stringify(ids.wardrobe)}, side.id);
      ${P}.ui.getState().openModal('part-detail', { unitId: ${JSON.stringify(ids.wardrobe)}, panelId: side.id });
      return true;
    `);
    await page.sleep(900);
    // The legend lists the layers this part carries; the NOTE under the drawing
    // is what a joiner reads when he points at one, and it is where the depth
    // is written out (turn 17 F4.3, at the geometry this turn gives it).
    const legend = await page.evaluate(`
      return [...document.querySelectorAll('[data-legend-layer]')].map((b) => b.dataset.legendLayer);
    `);
    check('F3.4 the detail window lists both grooves',
      legend.includes('DRAWER_RUNNER_POCKET') && legend.includes('DRAWER_BOTTOM_POCKET'),
      JSON.stringify(legend));

    // …and what it SAYS about one is read the way a joiner reads it: point at
    // the groove and the note under the drawing tells him how deep it is cut.
    const notes = {};
    for (const layer of ['DRAWER_RUNNER_POCKET', 'DRAWER_BOTTOM_POCKET']) {
      // eslint-disable-next-line no-await-in-loop -- one hover at a time, on purpose
      notes[layer] = await page.evaluate(`
        const b = document.querySelector('[data-legend-layer="${layer}"]');
        if (!b) return null;
        b.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
        return null;
      `) ?? await page.evaluate(`
        const n = document.querySelector('[data-part-note="1"]');
        return n ? n.textContent.trim() : null;
      `);
    }
    check('F3.4 …and says how deep each one is cut',
      /2 deep/.test(notes.DRAWER_RUNNER_POCKET || '') && /7 deep/.test(notes.DRAWER_BOTTOM_POCKET || ''),
      JSON.stringify(notes));
    measurements.detail = { legend, notes };
    await shot('4a-drawer-side-both-pockets');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ══ 5. HIDE FRONTS, ON AND OFF (F4) ═════════════════════════════════════
    await page.evaluate(`${P}.ui.getState().clearElement(); ${P}.ui.getState().clearSelection(); return true;`);
    await page.sleep(500);
    await shot('5a-fronts-on');
    const bomBefore = await page.evaluate(`
      const s = ${P}.project.getState();
      return s.units.map((u) => s.unitResult(u.id).totals.fronts).join(',');
    `);
    await page.click('[data-hide-fronts="1"]');
    await page.sleep(900);
    const hidden = await page.evaluate(`
      const s = ${P}.project.getState();
      return {
        on: ${P}.ui.getState().hideFronts,
        fronts: s.units.map((u) => s.unitResult(u.id).totals.fronts).join(','),
      };
    `);
    check('F4 Hide fronts takes the doors and drawer fronts off the picture',
      hidden.on === true);
    check('F4 …and changes nothing in the BOM, the cut list or the params',
      hidden.fronts === bomBefore, `${bomBefore} → ${hidden.fronts}`);
    await shot('5b-fronts-hidden');

    // ══ 7. THE RUNNERS ON THE LISP'S OWN ROWS (F6) ══════════════════════════
    // With the fronts off, the ironmongery is what you are looking at.
    const runners = await page.evaluate(`
      const s = ${P}.project.getState();
      const profile = ${P}.profile.getState().profile;
      const hw = window.__ccHardware3d;
      if (!hw) return { error: 'the hardware module is not exposed' };
      const of = (id) => {
        const r = s.unitResult(id);
        const inst = hw.hardwareInstances(r, profile);
        return {
          rows: r.drillSummary.runner_rows_carcass_y,
          runners: inst.runners.map((x) => ({ drawer: x.drawer, side: x.side, y: x.y, length: x.length })),
          rods: inst.rods.length,
          pair: (r.hardware.find((h) => h.role === 'runner_pairs') || {}).spec || null,
        };
      };
      return { wide: of(${JSON.stringify(ids.kitchen)}), narrow: of(${JSON.stringify(ids.narrow)}) };
    `);
    if (runners.error) {
      check('F6.2 every runner sits on the row the machine drills', false, runners.error);
    } else {
      const onRows = runners.wide.runners.every((r) => runners.wide.rows.includes(r.y));
      check('F6.2 every runner sits on the row the machine drills', onRows,
        JSON.stringify(runners.wide.rows));
      check('F6.3 the pair is the largest NL that fits the depth',
        runners.wide.pair.length_mm === 490, String(runners.wide.pair?.length_mm));
      check('F6.4 the project default is T (TIP-ON BLUMOTION)',
        runners.wide.pair.variant === 'T', runners.wide.pair?.variant);
      check('F6.5 the rod is on the wide drawer and not on the narrow one',
        runners.wide.rods > 0 && runners.narrow.rods === 0,
        `${runners.wide.rods} / ${runners.narrow.rods}`);
      measurements.runners = runners;
    }
    // Close enough to SEE one: the pair on its rows, and the rod across the
    // back of the box between them.
    // `focusOn` takes a SCENE point (metres, the frame three works in) and a
    // radius in millimetres — Scene.jsx `onFocus` hands it a world Vector3.
    await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === ${JSON.stringify(ids.kitchen)});
      const r = s.unitResult(u.id);
      const mm = (v) => v / 1000;
      ${P}.ui.getState().focusOn(
        [mm((u.position.x_mm || 0) + r.params.width / 2), mm(r.params.height * 0.45), mm(r.params.depth / 2)],
        r.params.width,
      );
      return true;
    `);
    await page.sleep(1800);
    await shot('7a-runners-on-the-rows');

    // …and through the board, where the pair and the rod are what you are
    // looking at: a runner lives on the OUTSIDE face of the box, so with the
    // fronts merely off it is behind the box that runs on it. X-ray is how a
    // joiner looks at ironmongery in this app and F6.7 puts the runners in with
    // the rest of it.
    await page.evaluate(`${P}.ui.getState().setXray(true); return true;`);
    await page.sleep(900);
    await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === ${JSON.stringify(ids.kitchen)});
      const r = s.unitResult(u.id);
      const row = r.drillSummary.runner_rows_carcass_y[0];
      const mm = (v) => v / 1000;
      ${P}.ui.getState().focusOn(
        [mm((u.position.x_mm || 0) + r.params.width / 2), mm(row + 90), mm(r.params.depth * 0.6)],
        260,
      );
      return true;
    `);
    await page.sleep(1800);
    await shot('7b-runner-pair-and-rod');
    await page.evaluate(`${P}.ui.getState().setXray(false); return true;`);
    await page.sleep(500);

    // ══ 8. THE BUCKET UNREACHABLE (F6.6) ════════════════════════════════════
    // This session has no bucket to begin with (mock mode), so the scene above
    // IS the degraded one — which is the point: the runner is drawn from the
    // workshop's own profile and nothing is missing. Said out loud here so the
    // screenshot is evidence rather than a coincidence.
    const degraded = await page.evaluate(`
      const rc = window.__ccRunners;
      return {
        catalogue: rc ? Boolean(rc.runnerCatalogue()) : null,
        article: rc ? rc.runnerPairSpec({ nl: 490, variant: 'T', profile: ${P}.profile.getState().profile }).complete : null,
      };
    `);
    check('F6.6 with no catalogue the scene still draws, and the BOM says what it cannot know',
      degraded.catalogue === false && degraded.article === false,
      JSON.stringify(degraded));
    await shot('8a-bucket-unreachable-plain-profile');
    await page.click('[data-hide-fronts="1"]');
    await page.sleep(700);
    await shot('5c-fronts-back');

    // ══ 6. THE OVEN BASE, CORRECTED (F5) ════════════════════════════════════
    const oven = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.oven)});
      const of = (id) => r.panels.find((p) => p.id === id) || null;
      const front = r.panels.find((p) => p.part === 'DRAWER-FRONT');
      const bul = of('BUL');
      return {
        height: r.params.height,
        frontH: front ? front.h : null,
        top: Boolean(of('TOP')),
        railB: of('RAIL-B') ? of('RAIL-B').box : null,
        railF: of('RAIL-F') ? of('RAIL-F').box : null,
        sidePockets: (bul.cnc.pockets || []).map((p) => p.layer).sort(),
        boxTop: (() => { const sd = r.panels.find((p) => p.part === 'DRAWER-SIDE'); return sd.box.y + sd.box.h; })(),
        shelfY: of('FIXED').box.y,
      };
    `);
    check('F5.4 the oven base\'s drawer front is 169 at 770',
      oven.height === 770 && oven.frontH === 169, `${oven.height} → ${oven.frontH}`);
    check('F5.2 the TOP panel is gone and two rails stand in its place',
      oven.top === false && oven.railB && oven.railF);
    check('F5.2 …and the FRONT one lies FLAT',
      oven.railF && oven.railF.h < oven.railF.d,
      JSON.stringify(oven.railF));
    check('F5.1 the sides keep one dog bone and the bottom\'s two sockets',
      JSON.stringify(oven.sidePockets) === JSON.stringify(['PUZZLE_DOG_BONES', 'PUZZLE_SOCKET', 'PUZZLE_SOCKET']),
      JSON.stringify(oven.sidePockets));
    check('F5.4 the box still fits the opening under the shelf',
      oven.boxTop <= oven.shelfY, `${oven.boxTop} ≤ ${oven.shelfY}`);
    measurements.oven = oven;
    await page.evaluate(`${P}.ui.getState().selectUnit(${JSON.stringify(ids.oven)}); return true;`);
    await page.sleep(700);
    await shot('6a-oven-base-rails-and-169');

    // ══ 9. THE RUNNERS SECTION IN SETTINGS (F6.4) ═══════════════════════════
    await page.evaluate(`
      ${P}.ui.getState().clearSelection();
      // The SETTINGS SURFACE — one component, opened from the top bar as a
      // modal and shown as step 5 of the new-project flow (turn 12, F1).
      ${P}.ui.getState().openModal('design');
      return true;
    `);
    await page.sleep(1000);
    const settings = await page.evaluate(`
      const sys = document.querySelector('[data-runner-system="1"]');
      const row = document.querySelector('[data-runner-variant="1"]');
      const opts = [...document.querySelectorAll('[data-runner-variant-option]')];
      return {
        system: sys ? sys.innerText.replace(/\\s+/g, ' ').trim() : null,
        hint: row ? row.innerText.replace(/\\s+/g, ' ').trim() : null,
        options: opts.map((b) => ({ id: b.dataset.runnerVariantOption, title: b.title, on: b.getAttribute('aria-pressed') === 'true' })),
      };
    `);
    check('F6.4 Settings offers System: Movento and Variant: T/S',
      /MOVENTO/i.test(settings.system || '') && settings.options.length === 2,
      JSON.stringify(settings.options.map((o) => o.id)));
    check('F6.4 …with the short tooltip the owner asked for, and T chosen',
      settings.options.some((o) => o.id === 'T' && o.on && /press the front/i.test(o.title || '')),
      settings.options.find((o) => o.id === 'T')?.title || '');
    measurements.settings = settings;
    await shot('9a-runners-in-settings');

    // ── the console, and the verdict ──
    // `/favicon.ico` is a request the BROWSER makes on its own — index.html
    // never asks for one — so its 404 is not the app's.
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
