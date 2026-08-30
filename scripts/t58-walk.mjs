// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 58) ───────────────────────
//
// One section per feature, each named for what it shows, so a claim in the
// report has a picture behind it and the picture has a script behind it.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t58-walk.mjs              every section
//   node scripts/t58-walk.mjs f2 f4        two of them
//
// THE CAMERA IS PLACED, NEVER NUDGED — T57's rule, kept: `focusOnPanel` is an
// ANIMATION, and a frame taken while it is still flying is a frame nobody can
// reproduce. Every section parks the camera itself and waits for the renderer
// to settle before the shutter.

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t58/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

const page = await launch({ width: 1600, height: 1000, port: 9624 });

const ask = (expr) => page.evaluate(`
  const P = () => window.__cc.project.getState();
  const U = () => window.__cc.ui.getState();
  return (${expr});
`);

/** A section starts where every other section starts (T57's rule). */
async function fresh(name) {
  await ask(`(() => {
    P().newProject(${JSON.stringify(name)}, { number: '58' });
    U().openEditor();
    U().setHideFronts(false);
    U().selectUnit(null);
    U().setLedIcons(false);
    return true;
  })()`);
  await page.sleep(700);
  await page.waitFor('window.__cc.views && (window.__cc.views.room || window.__cc.views.editor)',
    { timeout: 20000 });
}

const camera = (from, at) => ask(`(() => {
  const v = window.__cc.views.room || window.__cc.views.editor;
  if (!v) return false;
  const c = v.camera;
  const t = v.controls;
  c.position.set(${from[0]}, ${from[1]}, ${from[2]});
  if (t && t.target) { t.target.set(${at[0]}, ${at[1]}, ${at[2]}); t.update(); }
  c.lookAt(${at[0]}, ${at[1]}, ${at[2]});
  c.updateProjectionMatrix();
  return true;
})()`);

/** How many sprites the scene is drawing — the LED icons are sprites. */
const spriteCount = () => ask(`(() => {
  const v = window.__cc.views.room || window.__cc.views.editor;
  if (!v) return -1;
  let n = 0;
  v.scene.traverse((o) => { if (o.isSprite && o.visible) n += 1; });
  return n;
})()`);

await page.goto(BASE);
await page.waitFor('window.__cc && window.__cc.project', { timeout: 30000 });

try {
  // ─── F2 · THE LEAF IS HUNG ON THE BOARD IT IS DRILLED ON ─────────────────
  //
  // The measured scene from the test, built through the app's own doors: a
  // wardrobe with a partition, per-bay leaves typed [L, R], under a ceiling
  // that rises across the width. On main the left leaf is drilled on its RIGHT
  // stile and hung on BUL, and BUL is bored six times for a hinge no door
  // reaches.
  if (runs('f2')) {
    await fresh('F2 the hand is one fact');
    const scene = await ask(`(() => {
      P().setRoom({ height: 2400 });
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 1800, height: 2150, depth: 600 });
      P().addItem(r.id, { kind: 'partition', x_mm: 900, front_mm: 0 });
      P().setBayDoors(r.id, [{ door: 'one', hinge: 'L' }, { door: 'one', hinge: 'R' }]);
      P().moveUnit(r.id, 0, 0, { magnet: false });
      P().addWallSlope({ wall: 0, side: 'L', startHeight: 1200, run: 1800 });
      P().settleLayout();
      P().refreshAutoParts();
      const res = P().unitResult(r.id);
      const leaves = (res.panels || []).filter((p) => p.part === 'FRONT' && p.meta && p.meta.bay != null);
      const plates = (id) => (res.drills || []).filter((d) => d.kind === 'hinge' && d.panel === id).length;
      U().selectUnit(null);
      return {
        id: r.id,
        leaves: leaves.map((p) => ({
          id: p.id, bay: p.meta.bay, hand: p.meta.hinge,
          forced: p.meta.hingeForced === true, hungOn: p.meta.hingeOn,
        })),
        plates: { BUL: plates('BUL'), BUR: plates('BUR'), part: plates('VPART-1') },
      };
    })()`);
    check('the ceiling really did re-hand a leaf', scene.leaves.some((l) => l.forced),
      JSON.stringify(scene.leaves));
    const b0 = scene.leaves.find((l) => l.bay === 0);
    check('the re-handed leaf hangs where its cups are',
      b0 && b0.hand === 'R' && b0.hungOn === 'VPART-1', JSON.stringify(b0));
    check('and BUL is not bored for a hinge no door reaches',
      scene.plates.BUL === 0, JSON.stringify(scene.plates));
    await camera([2.6, 1.5, 3.4], [0.9, 1.1, 0.3]);
    await page.sleep(900);
    await page.screenshot(`${SHOTS}f2-slope-bay-doors.png`);
  }

  // ─── F3 · THE SHOE RETURNS, AND ITS RAIL HAS A NAME ──────────────────────
  if (runs('f3')) {
    await fresh('F3 the shoe returns');
    const scene = await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 900, height: 2200, depth: 600 });
      // addItem answers with the new item's ID (a string), which is what
      // setShelfType is keyed on.
      const id = P().addItem(r.id, { kind: 'shelf', pos_mm: 800 });
      if (id) P().setShelfType(r.id, id, 'shoe');
      P().settleLayout();
      const res = P().unitResult(r.id);
      const shelf = (res.panels || []).find((p) => p.part === 'SHELF');
      const rail = (res.panels || []).find((p) => p.part === 'SHOE-RAIL');
      return {
        unit: r.id,
        itemId: id,
        shelf: shelf ? { id: shelf.id, tilt: shelf.meta.tilt_deg, corners: shelf.cnc.outline.length } : null,
        rail: rail ? { id: rail.id, w: rail.w, h: rail.h, t: rail.thickness } : null,
      };
    })()`);
    check('the shoe shelf is cut, and it leans', scene.shelf && scene.shelf.tilt === 15,
      JSON.stringify(scene.shelf));
    check('its blank is still a rectangle', scene.shelf && scene.shelf.corners === 4);
    check('the rail is cut with it, at the kit\'s own section',
      scene.rail && scene.rail.h === 60 && scene.rail.t === 18, JSON.stringify(scene.rail));
    // The rail's ELEMENT IDENTITY (kind, label, the one field) is asserted in
    // test/turn58-f3-the-shoe-returns.test.js against `engine/elements.js`
    // itself. It is not re-asked here: a preview build has no module graph to
    // import from the page, and a check that silently skips is worse than no
    // check at all.
    await camera([1.9, 1.3, 2.2], [0.45, 0.85, 0.3]);
    await page.sleep(900);
    await page.screenshot(`${SHOTS}f3-shoe-shelf.png`);
  }

  // ─── F4 · WHERE I CLICK → THE LED ICONS APPEAR ───────────────────────────
  //
  // The click path itself, and it is the whole feature: on main the ONLY way
  // to see these badges was to open the Lighting panel and leave it open.
  if (runs('f4')) {
    await fresh('F4 the LED icons stop hiding');
    await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      P().updateUnitParams(r.id, { width: 900, height: 2200, depth: 600 });
      P().addDoors(r.id);
      P().settleLayout();
      U().selectUnit(null);
      U().closeModal && U().closeModal();
      return true;
    })()`);
    // Close enough that the badges are readable in the frame — the picture is
    // the claim here, so it has to be legible without opening the file.
    await camera([1.35, 1.85, 1.75], [0.45, 1.7, 0.3]);
    await page.sleep(900);

    const before = await ask('({ flag: U().ledIcons, modal: U().modal })');
    const spritesBefore = await spriteCount();
    check('before the click: the toggle is off and no panel is open',
      before.flag === false && before.modal !== 'lighting', JSON.stringify(before));
    await page.screenshot(`${SHOTS}f4-before.png`);

    // THE CLICK. View ▸ LED icons — the entry this turn added, driven the way
    // a joiner drives it rather than by setting the flag.
    const menu = await page.evaluate(`
      const btns = [...document.querySelectorAll('button')];
      const view = btns.find((b) => b.textContent.trim() === 'View');
      if (!view) return { found: false };
      view.click();
      return { found: true };
    `);
    await page.sleep(350);
    const clicked = await page.evaluate(`
      const rows = [...document.querySelectorAll('button, [role="menuitem"]')];
      const row = rows.find((b) => b.textContent.trim().startsWith('LED icons'));
      if (!row) return { found: false, saw: rows.map((r) => r.textContent.trim()).slice(0, 40) };
      row.click();
      return { found: true };
    `);
    check('the View menu offers it', menu.found && clicked.found, JSON.stringify(clicked).slice(0, 300));
    await page.sleep(900);

    const after = await ask('({ flag: U().ledIcons, modal: U().modal })');
    const spritesAfter = await spriteCount();
    check('ONE CLICK and the icons are on the cabinet — with no panel open',
      after.flag === true && after.modal !== 'lighting' && spritesAfter > spritesBefore,
      `sprites ${spritesBefore} → ${spritesAfter}, ${JSON.stringify(after)}`);
    await page.screenshot(`${SHOTS}f4-after-click.png`);

    // …and it is REMEMBERED, which is the half a modal-shaped gate could never
    // give: the joiner keeps working and the icons stay.
    const remembered = await ask(`(() => {
      let raw = null;
      try { raw = localStorage.getItem('cc.ledIcons'); } catch { raw = 'blocked'; }
      return raw;
    })()`);
    check('and the choice is remembered like X-ray', remembered === '1', String(remembered));
  }
} finally {
  const bad = steps.filter((s) => !s.ok);
  process.stdout.write(`\n${steps.length} check(s), ${bad.length === 0 ? 'all ok.' : `${bad.length} FAILED.`}\n`);
  await page.close();
  process.exit(bad.length === 0 ? 0 : 1);
}
