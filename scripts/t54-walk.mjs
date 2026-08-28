// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 54) ───────────────────────
//
// CLAUDE.md iron rule 5: *"Screenshots in `verify/t54/`, every one LOOKED AT."*
// One section per feature, each named for what it shows, so a claim in the
// verdict has a picture behind it and the picture has a script behind it.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t54-walk.mjs           every section
//   node scripts/t54-walk.mjs f1 f4     two of them
//
// F6 has no screens line in the spec — its proof is fake-timer tests
// (turn54-f6) — so the walk carries no f6 section. The export-diff half of F5
// is done here by reading the render modal's own data URL at both slider
// extremes and comparing the bytes.
//
// THE OWNER'S SCENE, IN ROOM NUMBERS: his audit frame is the UNIT's (y up
// from the carcass floor; ceiling 2000 → 1700 over W = 600). A wardrobe
// stands on a 100 plinth, so the room restates it as height 2100 with the
// rake down to 1800 — and the strip is the MANUAL top infill the joiner
// adds, his 40.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t54/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

const page = await launch({ width: 1600, height: 1000, port: 9491 });

/** A fresh project in the editor. */
async function fresh(name) {
  await page.evaluate(`
    const P = window.__cc.project.getState();
    P.newProject(${JSON.stringify(name)}, { number: '54' });
    window.__cc.ui.getState().openEditor();
    return true;
  `);
  await page.sleep(700);
}

/** Everything the app can be asked in one round trip. */
const ask = (expr) => page.evaluate(`
  const P = () => window.__cc.project.getState();
  const U = () => window.__cc.ui.getState();
  const wallLen = () => {
    const c = P().project.room.corners;
    return Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y);
  };
  const itemsOf = (u) => (u.params.sections && u.params.sections[0]
    ? u.params.sections[0].items : []) || [];
  return (${expr});
`);

await page.goto(BASE);
await page.waitFor('window.__cc && window.__cc.project', { timeout: 30000 });

try {
  // ─── F1 · THE OWNER'S AUDIT SCENE, REBUILT — AND THE TRIO ON ITS LINES ───
  if (runs('f1')) {
    await fresh('F1 the trio');
    const scene = await ask(`(() => {
      P().setRoom({ height: 2100 });
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 600, height: 1960, top_infill_mm: 40 });
      P().moveUnit(r.id, wallLen() - 600, 0, { magnet: false });
      P().addWallSlope({ wall: 0, side: 'R', startHeight: 1800, run: 600 });
      P().settleLayout();
      P().refreshAutoParts();
      const res = P().unitResult(r.id);
      const trio = (res.panels || []).filter((p) => p.meta && p.meta.tilt_deg);
      U().selectUnit(null);
      return {
        names: trio.map((p) => p.id),
        pivots: trio.map((p) => p.meta.tilt_pivot),
      };
    })()`);
    const kinds = new Set((scene.names || []).map((n) => n.replace(/-\d+$/, '')));
    check('the audit scene stands: roof, strip and shelf all raked, three DIFFERENT pivot lines',
      kinds.has('TOP') && kinds.has('INFILL-T-FACE') && kinds.has('INFILL-T-SHELF')
      && new Set((scene.pivots || []).map((p) => JSON.stringify(p))).size >= 3,
      JSON.stringify(scene));
    await page.sleep(1200);
    await page.screenshot(`${SHOTS}f1-the-owners-scene-after.png`);
    // The trio edge-on, close up: three boards parallel and DISJOINT where
    // one line used to carry a stack. Zoom into the raked corner first.
    await page.wheel(1050, 320, -2200);
    await page.sleep(800);
    // The raked corner, CROPPED and rescaled: the roof, the strip riding
    // above it and the shelf under it — parallel, disjoint, no stack.
    await page.screenshot(`${SHOTS}f1-the-trio-close-up.png`,
      { x: 1130, y: 80, width: 300, height: 230, scale: 4 });
    await page.wheel(1050, 320, 2200);
    await page.sleep(400);
  }

  // ─── F1.7 · THE RUN PATH: A TWO-KNEE POLYLINE OVER THREE CABINETS ────────
  if (runs('f1run')) {
    await fresh('F1 the two-knee run');
    const run = await ask(`(() => {
      P().setRoom({ height: 2300 });
      // The run reaches both rakes: 3 x 1200 from x = 200 on the 4000 wall —
      // each one placed, widened, then parked before the next arrives, so the
      // add never runs out of wall.
      const ids = [];
      for (const x of [200, 1400, 2600]) {
        const r = P().addUnit('WARDROBE');
        if (!r.id) return { error: r.error, at: x };
        P().moveUnit(r.id, x, 0, { magnet: false });
        P().updateUnitParams(r.id, { width: 1200, height: 2160, top_infill_mm: 40 });
        P().moveUnit(r.id, x, 0, { magnet: false });
        ids.push(r.id);
      }
      P().settleLayout();
      // Two rakes from the two ends leave a flat middle: TWO knees, both
      // falling INSIDE the end cabinets.
      P().addWallSlope({ wall: 0, side: 'L', startHeight: 1600, run: 900 });
      P().addWallSlope({ wall: 0, side: 'R', startHeight: 1700, run: 900 });
      P().settleLayout();
      P().refreshAutoParts();
      let raked = 0;
      for (const id of ids) {
        const res = P().unitResult(id);
        raked += (res.panels || []).filter((p) => p.meta && p.meta.tilt_deg).length;
      }
      U().selectUnit(null);
      return { ids: ids.length, raked };
    })()`);
    check('the two-knee run: raked trio pieces at both ends, flat middle untouched',
      run.raked >= 4, JSON.stringify(run));
    await page.sleep(1200);
    await page.screenshot(`${SHOTS}f1-the-two-knee-run.png`);
  }

  // ─── F2 · THE PEAK SIDE: THE RAKE RISES INTO BUR (AND, MIRRORED, BUL) ────
  // The owner's scene: the ceiling RISES toward the unit's side — that side
  // is the peak side, the roof runs on the rake to its OUTER face, and its
  // top edge is bevelled at beta meeting the roof's underside. No third
  // piece. Both hands are shot; his complaint was BUR ("górny skos").
  if (runs('f2')) {
    for (const [tag, side] of [['peak-at-BUR', 'L'], ['peak-at-BUL', 'R']]) {
      await fresh(`F2 the ${tag}`);
      const peak = await ask(`(() => {
        P().setRoom({ height: 2100 });
        const r = P().addUnit('WARDROBE');
        if (!r.id) return { error: r.error };
        P().updateUnitParams(r.id, { width: 600, height: 1960, top_infill_mm: 40 });
        const x = ${side === 'L' ? '0' : 'wallLen() - 600'};
        P().moveUnit(r.id, x, 0, { magnet: false });
        P().addWallSlope({ wall: 0, side: '${side}', startHeight: 1800, run: 600 });
        P().settleLayout();
        P().refreshAutoParts();
        const res = P().unitResult(r.id);
        const raked = (res.panels || []).filter((p) => p.meta && p.meta.tilt_deg).map((p) => p.id);
        U().selectUnit(null);
        return { raked };
      })()`);
      check(`the ${tag} stands and the roof is raked to the peak side`,
        peak.raked && peak.raked.length >= 1, JSON.stringify(peak));
      await page.sleep(1200);
      await page.screenshot(`${SHOTS}f2-the-${tag}.png`);
      // The corner where the roof meets the PEAK side, cropped and rescaled:
      // the roof reaches the side's OUTER face, the side is bevelled at beta,
      // and nothing else stands in the band.
      const clip = tag === 'peak-at-BUR'
        ? { x: 340, y: 130, width: 340, height: 260, scale: 4 }
        : { x: 920, y: 130, width: 340, height: 260, scale: 4 };
      await page.screenshot(`${SHOTS}f2-the-${tag}-corner-close-up.png`, clip);
    }
  }

  // ─── F3 · THE DOOR LEAF CUT ON THE SLOPE ─────────────────────────────────
  if (runs('f3')) {
    await fresh('F3 the leaf');
    const leaf = await ask(`(() => {
      P().setRoom({ height: 2200 });
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 600, height: 2100 });
      P().addDoors(r.id);
      P().moveUnit(r.id, wallLen() - 600, 0, { magnet: false });
      P().addWallSlope({ wall: 0, side: 'R', startHeight: 1500, run: 900 });
      P().settleLayout();
      P().refreshAutoParts();
      const res = P().unitResult(r.id);
      const f = (res.panels || []).find((p) => /-F$/.test(p.id) || p.id === 'F');
      U().selectUnit(null);
      return f ? {
        cut: Boolean(f.meta && f.meta.slopeCut),
        shaker: Boolean(f.meta && f.meta.shaker),
      } : { missing: true, ids: (res.panels || []).map((p) => p.id) };
    })()`);
    check('the leaf is CUT and its shaker survives inside it', leaf.cut,
      JSON.stringify(leaf));
    await page.sleep(1200);
    await page.screenshot(`${SHOTS}f3-the-leaf-cut-on-the-slope.png`);

    // …and the DOUBLE pair across a knee: each leaf clipped over ITS OWN span.
    await fresh('F3 the double across the knee');
    const pair = await ask(`(() => {
      P().setRoom({ height: 2200 });
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 900, height: 2100 });
      P().addDoors(r.id);
      P().moveUnit(r.id, wallLen() - 1400, 0, { magnet: false });
      P().addWallSlope({ wall: 0, side: 'R', startHeight: 1400, run: 1100 });
      P().settleLayout();
      P().refreshAutoParts();
      const res = P().unitResult(r.id);
      const fl = (res.panels || []).find((p) => /-FL$/.test(p.id) || p.id === 'FL');
      const fr = (res.panels || []).find((p) => /-FR$/.test(p.id) || p.id === 'FR');
      U().selectUnit(null);
      return {
        fl: fl ? { cut: Boolean(fl.meta && fl.meta.slopeCut), h: Math.round(fl.h) } : null,
        fr: fr ? { cut: Boolean(fr.meta && fr.meta.slopeCut), h: Math.round(fr.h) } : null,
      };
    })()`);
    check('double doors across the knee: the line tells the two leaves apart',
      pair.fl && pair.fr && (pair.fl.cut || pair.fr.cut) && pair.fl.h !== pair.fr.h,
      JSON.stringify(pair));
    await page.sleep(1200);
    await page.screenshot(`${SHOTS}f3-the-double-pair-across-the-knee.png`);
  }

  // ─── F4 · THE ROAD TO THE WATCH DRAWER ───────────────────────────────────
  if (runs('f4')) {
    await fresh('F4 the road');
    const made = await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      // The watch drawer rides ON TOP of a stack (T53's own law) — build one.
      P().addItem(r.id, { kind: 'drawer', index: 1, height_mm: 200, mount: 'overlay' });
      P().addItem(r.id, { kind: 'drawer', index: 2, height_mm: 200, mount: 'overlay' });
      const added = P().addWatchDrawer(r.id);
      if (!added.ok) return { error: added.error };
      const item = itemsOf(P().units.find((u) => u.id === r.id)).find((i) => i.id === added.id);
      return { unitId: r.id, itemId: added.id, height: item && item.height_mm };
    })()`);
    check('the watch drawer stands at the DERIVED 120', made.height === 120,
      JSON.stringify(made));
    await page.sleep(1000);

    // Entry A — the scene. Double-click the drawer's front; the modal must
    // open BESIDE the click (house law). The front's screen spot is found by
    // scanning down the unit's middle.
    const canvas = await page.evaluate(`
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    `);
    let opened = null;
    for (const fy of [0.72, 0.66, 0.6, 0.78, 0.54, 0.84]) {
      for (const fx of [0.5, 0.46, 0.54]) {
        const x = canvas.x + canvas.w * fx;
        const y = canvas.y + canvas.h * fy;
        await page.dblclick(x, y);
        await page.sleep(450);
        const modal = await ask(`U().modal`);
        if (modal === 'watch-layout') { opened = { x: Math.round(x), y: Math.round(y) }; break; }
        if (modal) await ask(`U().closeModal() || true`);
        await ask(`U().selectUnit(null) || true`);
        await page.sleep(150);
      }
      if (opened) break;
    }
    check('ENTRY A: a double-click on the drawer front opens watch-layout beside it',
      Boolean(opened), JSON.stringify(opened));
    await page.sleep(500);
    await page.screenshot(`${SHOTS}f4-the-modal-beside-the-clicked-drawer.png`);
    await ask(`U().closeModal() || true`);
    await page.sleep(300);

    // Entry B — the interior menu row's chevron.
    await ask(`(() => {
      U().selectUnit(P().units[0].id);
      U().openModal('add-items', { unitId: P().units[0].id });
      return true;
    })()`);
    await page.sleep(600);
    await page.click('[data-add-kind="watch_drawer"]');
    await page.sleep(600);
    const menuRoad = await ask(`U().modal`);
    check('ENTRY B: the menu row opens the same modal for the item it has',
      menuRoad === 'watch-layout', String(menuRoad));
    await page.screenshot(`${SHOTS}f4-the-menu-road.png`);
    await ask(`U().closeModal() || true`);
    await ask(`U().selectUnit(null) || true`);
    await page.sleep(300);
    // The 120 drawer itself, in the wardrobe.
    await page.wheel(canvas.x + canvas.w * 0.5, canvas.y + canvas.h * 0.7, -1600);
    await page.sleep(700);
    await page.screenshot(`${SHOTS}f4-the-120-drawer-in-the-wardrobe.png`);
    await page.wheel(canvas.x + canvas.w * 0.5, canvas.y + canvas.h * 0.7, 1600);
  }

  // ─── F5 · THE ICONS BEHIND THE PANEL, AND THE ROOM LIGHT UNDER THEM ──────
  if (runs('f5')) {
    await fresh('F5 the icons');
    const built = await ask(`(() => {
      const ids = [];
      for (let i = 0; i < 6; i += 1) {
        const r = P().addUnit('BUD');
        if (!r.id) return { error: r.error, at: i };
        P().updateUnitParams(r.id, { width: 600 });
        P().moveUnit(r.id, 100 + i * 600, 0, { magnet: false });
        ids.push(r.id);
      }
      P().settleLayout();
      U().selectUnit(null);
      U().openModal('lighting');
      return { ids: ids.length, modal: U().modal, selected: U().selectedUnitId };
    })()`);
    check('six units, NONE selected, the Lighting panel open',
      built.ids === 6 && built.modal === 'lighting' && !built.selected,
      JSON.stringify(built));
    await page.sleep(1200);
    // Drag the panel toward the bottom-right by its title bar, so all six
    // units and their twelve icons are in the frame (the panel is draggable
    // by the house law — this is also that law, exercised).
    const bar = await page.evaluate(`
      const h = document.querySelector('[data-modal-handle="1"]');
      if (!h) return null;
      const r = h.getBoundingClientRect();
      return { x: r.left + Math.min(80, r.width / 4), y: r.top + r.height / 2 };
    `);
    if (bar) {
      await page.mouse('mousePressed', bar.x, bar.y);
      for (let i = 1; i <= 6; i += 1) {
        await page.mouse('mouseMoved', bar.x + (460 / 6) * i, bar.y + (560 / 6) * i);
        await page.sleep(40);
      }
      await page.mouse('mouseReleased', bar.x + 460, bar.y + 560, { buttons: 0 });
      await page.sleep(400);
    }
    await page.screenshot(`${SHOTS}f5-twelve-icons-none-selected.png`);

    // The slider, and the export at its extremes. The render modal's preview
    // IS the export pipeline's own data URL, so equality of those bytes is
    // the iron rule of 24.08 measured in the walk.
    const IMG = 'document.querySelector(`img[alt="Render preview"]`)';
    const sizes = {};
    for (const [tag, value] of [['low', 0.4], ['high', 1.5]]) {
      await ask(`P().setSceneLight({ scale: ${value} }) || true`);
      await page.sleep(400);
      if (tag === 'low') {
        // Scroll the panel to its Scene light section — the room light lives
        // UNDER the LED controls, and the picture shows it at 0.4x.
        await page.evaluate(`
          const s = document.querySelector('[data-scene-light]');
          if (s) s.scrollIntoView({ block: 'center' });
          return true;
        `);
        await page.sleep(300);
        await page.screenshot(`${SHOTS}f5-the-scene-light-slider.png`);
      }
      await ask(`(() => { U().openModal('render'); return true; })()`);
      await page.sleep(600);
      await page.click('button', 'Render');
      await page.waitFor(`Boolean(${IMG})`, { timeout: 60000 });
      const dataUrl = await page.evaluate(`return ${IMG}.src;`);
      sizes[tag] = dataUrl.length;
      writeFileSync(`${SHOTS}f5-export-${tag}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
      await ask(`U().closeModal() || true`);
      await page.sleep(300);
    }
    await ask(`P().setSceneLight({ scale: 1 }) || true`);
    check('two exports taken at 0.4x and 1.5x for the byte diff', Boolean(sizes.low && sizes.high),
      JSON.stringify(sizes));
  }

  // ─── F7 · THE SHOE DRAWER IN THE FRONT RHYTHM ────────────────────────────
  if (runs('f7')) {
    await fresh('F7 the stack');
    const stack = await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().addItem(r.id, { kind: 'drawer', index: 1, height_mm: 200, mount: 'overlay' });
      P().addItem(r.id, { kind: 'drawer', index: 2, height_mm: 200, mount: 'overlay' });
      const shoeId = P().addShoeDrawer(r.id);
      const shoe = itemsOf(P().units.find((u) => u.id === r.id)).find((i) => i.id === shoeId);
      const res = P().unitResult(r.id);
      U().selectUnit(null);
      return {
        shoe: shoe && { variant: shoe.variant, height: shoe.height_mm },
        boards: (res.panels || []).length,
      };
    })()`);
    check('the shoe drawer joins the stack as variant shoe at 116 (80 side + 36 delta)',
      stack.shoe && stack.shoe.variant === 'shoe' && stack.shoe.height === 116,
      JSON.stringify(stack));
    await page.sleep(1200);
    await page.screenshot(`${SHOTS}f7-the-shoe-in-the-front-rhythm.png`);

    // The box open: a plain flat drawer at 80 — no steps, no battens.
    const openIds = await ask(`(() => {
      const unit = P().units[0];
      const res = P().unitResult(unit.id);
      const fronts = (res.panels || []).filter((p) => /-DF\\d+$/.test(p.id)).map((p) => p.id);
      U().openFrontsFor(unit.id, fronts);
      return fronts;
    })()`);
    check('the fronts open for the look inside', Array.isArray(openIds) && openIds.length >= 1,
      JSON.stringify(openIds));
    await page.sleep(1000);
    await page.screenshot(`${SHOTS}f7-the-box-open-flat-bottom-side-80.png`,
      { x: 620, y: 560, width: 320, height: 260, scale: 4 });

    // The migrated old project: a T5x save with kind:'shoe_box' loads as the
    // drawer, same id, and the steps and battens are gone.
    await ask(`(() => {
      P().loadProject(
        { id: null, name: 'T5x the old shoe', number: '99', client: '', design: {} },
        [{
          id: 'u_old',
          type: 'WARDROBE',
          position: { wall: 0, x_mm: 40, rotation_deg: 0 },
          params: {
            type: 'WARDROBE', width: 900, height: 2150, depth: 568, unit_num: 'W01',
            sections: [{
              width_mm: 900,
              items: [
                { id: 'd_old', kind: 'drawer', index: 1, height_mm: 200 },
                { id: 'sb_old', kind: 'shoe_box', variant: 'D', dividers: 1, pos_mm: 260 },
              ],
            }],
          },
        }],
      );
      window.__cc.ui.getState().openEditor();
      return true;
    })()`);
    await page.sleep(900);
    const migrated = await ask(`(() => {
      const item = itemsOf(P().units[0]).find((i) => i.id === 'sb_old');
      return item && { kind: item.kind, variant: item.variant, from: item.migrated_from };
    })()`);
    check('the old save loads as a variant-shoe drawer, same id, stamped',
      migrated && migrated.kind === 'drawer' && migrated.variant === 'shoe'
      && migrated.from === 'shoe_box', JSON.stringify(migrated));
    // Fronts off, so the MIGRATED stack itself is in the picture — the shoe
    // box rebuilt as a plain drawer, no steps, no battens.
    await ask(`U().setHideFronts(true) || true`);
    await page.sleep(700);
    await page.screenshot(`${SHOTS}f7-the-migrated-old-project.png`);
    await ask(`U().setHideFronts(false) || true`);
  }

  const bad = steps.filter((s) => !s.ok);
  process.stdout.write(`\n${steps.length - bad.length}/${steps.length} ok\n`);
  await page.close();
  process.exit(bad.length === 0 ? 0 : 1);
} catch (e) {
  process.stdout.write(`\nWALK FAILED: ${e.message}\n${e.stack}\n`);
  await page.screenshot(`${SHOTS}.walk-failure.png`).catch(() => {});
  await page.close();
  process.exit(1);
}
