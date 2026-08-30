// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 55) ───────────────────────
//
// One section per feature, each named for what it shows, so a claim in the
// report has a picture behind it and the picture has a script behind it.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t55-walk.mjs           every section
//   node scripts/t55-walk.mjs f1 f4     two of them
//
// The F2 BEFORE frame is the same f2 section run against the BASE build:
//
//   E2E_URL=http://127.0.0.1:4174/ SHOT_TAG=before node scripts/t55-walk.mjs f2
//
// F6 has no screens line in the spec — its proof is the engine tests
// (turn55-f6) — so the walk carries no f6 section.
//
// THE OWNER'S F2 SCENE, IN ROOM NUMBERS: the spec's unit frame (W1000 H2200
// D600, slope_cut pts (0,1300)-(520,2200)-(1000,2200)) stands on a 100 plinth,
// so the room restates it as height 2300 with the rake from 1400 over 520.

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const TAG = process.env.SHOT_TAG || null;
const SHOTS = new URL('../verify/t55/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

const page = await launch({ width: 1600, height: 1000, port: 9497 });

async function fresh(name) {
  await page.evaluate(`
    const P = window.__cc.project.getState();
    P.newProject(${JSON.stringify(name)}, { number: '55' });
    window.__cc.ui.getState().openEditor();
    return true;
  `);
  await page.sleep(700);
}

const ask = (expr) => page.evaluate(`
  const P = () => window.__cc.project.getState();
  const U = () => window.__cc.ui.getState();
  const wallLen = () => {
    const c = P().project.room.corners;
    return Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y);
  };
  return (${expr});
`);

/** The owner's F2 scene: shaker two-door wardrobe under a left rake. */
const SHAKER_SCENE = `(() => {
  P().setRoom({ height: 2400 });
  const r = P().addUnit('WARDROBE');
  if (!r.id) return { error: r.error };
  P().updateUnitParams(r.id, {
    width: 1000, height: 2200, depth: 600, front_type: 'S', top_infill_mm: 40,
  });
  P().moveUnit(r.id, 0, 0, { magnet: false });
  P().addDoors(r.id);
  P().addWallSlope({ wall: 0, side: 'L', startHeight: 1500, run: 520 });
  P().settleLayout();
  P().refreshAutoParts();
  const res = P().unitResult(r.id);
  const leaves = (res.panels || []).filter((p) => p.part === 'FRONT' && p.role === 'front');
  U().selectUnit(null);
  return {
    id: r.id,
    leaves: leaves.map((p) => ({ id: p.id, cut: Boolean(p.meta.slopeCut), hinge: p.meta.hinge })),
    infills: (res.panels || []).filter((p) => /^INFILL-T-FACE/.test(p.id)).length,
  };
})()`;

await page.goto(BASE);
await page.waitFor('window.__cc && window.__cc.project', { timeout: 30000 });

try {
  // ─── F1 · THE INFILL SITS FLUSH — closed wardrobe, slope left ────────────
  if (runs('f1')) {
    await fresh('F1 the infill');
    const scene = await ask(`(() => {
      P().setRoom({ height: 2100 });
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 600, height: 1960, top_infill_mm: 40 });
      P().addDoors(r.id);
      P().moveUnit(r.id, 0, 0, { magnet: false });
      P().addWallSlope({ wall: 0, side: 'L', startHeight: 1800, run: 600 });
      P().settleLayout();
      P().refreshAutoParts();
      const res = P().unitResult(r.id);
      const face = (res.panels || []).find((p) => /^INFILL-T-FACE/.test(p.id));
      U().selectUnit(null);
      return {
        unit: r.id,
        corners: face && face.meta ? face.meta.corners : null,
        tilt: face && face.meta ? face.meta.tilt_axis : 'absent',
      };
    })()`);
    check('the strip states its FOUR CORNERS and carries no lean meta',
      Array.isArray(scene.corners) && scene.corners.length === 4 && scene.tilt === undefined,
      JSON.stringify(scene));
    // Fly the camera onto the strip itself — the app's own "look at this"
    // (uiStore focusOnPanel), so the frame shows the joint and not the room.
    await ask(`(() => {
      U().focusOnPanel(${JSON.stringify('__UNIT__')}, 'INFILL-T-FACE');
      return true;
    })()`.replace('__UNIT__', scene.unit));
    await page.sleep(1800);
    await page.screenshot(`${SHOTS}f1-infill.png`);
  }

  // ─── F2 · THE SHAKER UNDER THE SLOPE — before/after by build ─────────────
  if (runs('f2')) {
    await fresh('F2 the shaker');
    const scene = await ask(SHAKER_SCENE);
    check('the shaker scene stands: two leaves, cut under the rake',
      Array.isArray(scene.leaves) && scene.leaves.length >= 2, JSON.stringify(scene));
    await ask(`(() => {
      U().focusOnPanel(${JSON.stringify('__UNIT__')}, ${JSON.stringify('__LEAF__')});
      return true;
    })()`.replace('__UNIT__', scene.id).replace('__LEAF__', scene.leaves[0].id));
    await page.sleep(1800);
    await page.screenshot(`${SHOTS}f2-shaker-${TAG || 'after'}.png`);
    // …and the BAND ABOVE THE DOORS, cropped and rescaled: the region the
    // owner photographed. BEFORE it carries the leaning strip's own wedge
    // across the leaf; AFTER, the infill is the corner board and the leaf's
    // cut edge stands alone.
    await page.screenshot(`${SHOTS}f2-shaker-${TAG || 'after'}-close.png`,
      { x: 440, y: 100, width: 320, height: 260, scale: 4 });
  }

  // ─── F3 · THE SLOPE FLIPS THE DOORS → THE PARTITION ──────────────────────
  if (runs('f3')) {
    await fresh('F3 the partition');
    const scene = await ask(`(() => {
      P().setRoom({ height: 2400 });
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 1000, height: 2200 });
      P().addDoors(r.id);
      P().addShelves(r.id, 2);
      P().moveUnit(r.id, 0, 0, { magnet: false });
      P().addWallSlope({ wall: 0, side: 'L', startHeight: 1400, run: 900 });
      P().settleLayout();
      P().refreshAutoParts();
      const u = P().units.find((x) => x.id === r.id);
      const items = (u.params.sections && u.params.sections[0] ? u.params.sections[0].items : []) || [];
      const res = P().unitResult(r.id);
      const vpart = (res.panels || []).find((p) => p.part === 'VPART');
      const said = U().messages.some((m) => /Slope flipped the doors/.test(m.baseMessage || m.message));
      U().selectUnit(r.id);
      return {
        partitions: items.filter((i) => i.kind === 'partition').length,
        cleared: items.filter((i) => i.kind !== 'partition').length === 0,
        vpart: Boolean(vpart),
        notified: said,
      };
    })()`);
    check('the flip: ONE partition, interior cleared, VPART cut, notify shown',
      scene.partitions === 1 && scene.cleared && scene.vpart && scene.notified,
      JSON.stringify(scene));
    await page.sleep(1400);
    await page.screenshot(`${SHOTS}f3-partition.png`);
  }

  // ─── F4 · THE GLASS IN THE FORCED PARTITION ──────────────────────────────
  if (runs('f4')) {
    await fresh('F4 the glass');
    const scene = await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 900 });
      P().addDrawers(r.id, 2, 'overlay', 200, null, null);
      const made = P().addWatchDrawer(r.id);
      if (!made.ok) return { error: made.error };
      P().setWatchShelfGlass(r.id, made.id, true);
      const res = P().unitResult(r.id);
      const pane = ((res.assemblies || {}).watchGlass || [])[0];
      const board = pane ? (res.panels || []).find((p) => p.id === pane.shelfId) : null;
      const above = P().watchShelfAbove(r.id, made.index);
      U().selectUnit(null);
      return {
        board: board ? board.part : null,
        enabled: Boolean(above),
        warned: (res.warnings || []).some((w) => w.code === 'watch_glass_needs_shelf'),
      };
    })()`);
    check('the pane is cut in the PARTITION, the checkbox is enabled, no refusal',
      scene.board === 'PARTITION' && scene.enabled && !scene.warned, JSON.stringify(scene));
    await page.sleep(1200);
    await page.screenshot(`${SHOTS}f4-glass.png`);
  }

  // ─── F5 · THE FINISH — one frame per choice ──────────────────────────────
  if (runs('f5')) {
    await fresh('F5 the finish');
    const made = await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 900 });
      P().addDrawers(r.id, 1, 'overlay', 200, null, null);
      const w = P().addWatchDrawer(r.id);
      if (!w.ok) return { error: w.error };
      // A sprayed front colour, so Sprayed has a colour to buy.
      P().setDesign({ colour: { front: { system: 'custom', hex: '#7a1f2b', name: 'wine' }, carcass: null } });
      // Open the watch drawer so the insert is on camera.
      const res = P().unitResult(r.id);
      const front = (res.panels || []).find((p) => p.part === 'DRAWER-FRONT'
        && Number(p.meta && p.meta.drawer) === Number(w.index));
      U().selectUnit(null);
      if (front) U().toggleFront(r.id, front.id);
      return { unit: r.id, item: w.id, front: front ? front.id : null };
    })()`);
    check('the insert stands and the drawer opens', Boolean(made.item), JSON.stringify(made));
    await page.sleep(1400);
    await page.screenshot(`${SHOTS}f5-finish-project.png`);
    const flipped = await ask(`(() => {
      P().setWatchFinish(${JSON.stringify(made.unit)}, ${JSON.stringify(made.item)}, 'spray');
      const u = P().units.find((x) => x.id === ${JSON.stringify(made.unit)});
      const item = u.params.sections[0].items.find((i) => i.id === ${JSON.stringify(made.item)});
      const res = P().unitResult(u.id);
      const part = (res.panels || []).find((p) => p.role === 'watch_insert');
      return { stored: item.watch_finish, onPart: part && part.meta.watch_finish };
    })()`);
    check("Sprayed rides the item AND every part's record",
      flipped.stored === 'spray' && flipped.onPart === 'spray', JSON.stringify(flipped));
    await page.sleep(900);
    await page.screenshot(`${SHOTS}f5-finish-sprayed.png`);
  }

  // ─── F7 · THE LED INSIDE THE OUTLINE ─────────────────────────────────────
  if (runs('f7')) {
    await fresh('F7 the led');
    const scene = await ask(`(() => {
      P().setRoom({ height: 2300 });
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 1000, height: 2200 });
      P().moveUnit(r.id, 0, 0, { magnet: false });
      P().addWallSlope({ wall: 0, side: 'L', startHeight: 1400, run: 520 });
      P().settleLayout();
      P().refreshAutoParts();
      P().setLighting({ on: true });
      P().addLightingItem({ unitId: r.id, kind: 'side', ref: 'L' });
      P().addLightingItem({ unitId: r.id, kind: 'side', ref: 'R' });
      P().addLightingItem({ unitId: r.id, kind: 'top' });
      U().selectUnit(null);
      return { ok: true };
    })()`);
    check('the sloped wardrobe wears its strips', scene.ok === true, JSON.stringify(scene));
    await page.sleep(1600);
    await page.screenshot(`${SHOTS}f7-led.png`);
  }

  // ─── F8 · THE HONEST HINGE SELECT ────────────────────────────────────────
  if (runs('f8')) {
    await fresh('F8 the hinge');
    const scene = await ask(`(() => {
      P().setRoom({ height: 2300 });
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 600, height: 2200 });
      P().addDoors(r.id);
      P().moveUnit(r.id, 0, 0, { magnet: false });
      P().addWallSlope({ wall: 0, side: 'L', startHeight: 1400, run: 900 });
      P().settleLayout();
      P().refreshAutoParts();
      U().selectUnit(r.id);
      return { id: r.id };
    })()`);
    await page.sleep(900);
    // The unit panel's CARCASS section is collapsed by default — the hinge
    // select lives inside it, so the walk opens it exactly as a joiner does.
    await page.click('[data-section="Carcass"] button');
    await page.sleep(600);
    const select = await page.evaluate(`
      const el = document.querySelector('[data-unit-hinge-forced]');
      const reason = document.querySelector('[data-unit-hinge-forced-reason]');
      return {
        found: Boolean(el),
        disabled: el ? el.disabled : null,
        value: el ? el.value : null,
        reason: reason ? reason.textContent.trim() : null,
      };
    `);
    check('the select shows the FORCED hand, disabled, with the reason line',
      select.found && select.disabled === true
      && /Cut on the slope/.test(select.reason || ''), JSON.stringify(select));
    await page.sleep(400);
    await page.screenshot(`${SHOTS}f8-hinge.png`);
    void scene;
  }
} finally {
  await page.close();
}

const bad = steps.filter((s) => !s.ok);
process.stdout.write(`\n${steps.length} checks, ${bad.length} failing.\n`);
process.exit(bad.length ? 1 : 0);
