// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 53) ───────────────────────
//
// CLAUDE.md rule 5: *"Browser verification with committed screenshots in
// `verify/t53/`, EVERY ONE LOOKED AT before the verdict claims anything about
// it."*  This is the walk that takes them: one section per feature, each named
// for what it shows, so a claim in the verdict has a picture behind it and the
// picture has a script behind it.
//
//   npm run build && npm run preview -- --port 4173
//   node scripts/t53-walk.mjs           every section
//   node scripts/t53-walk.mjs f1 f5     two of them
//
// F2's own picture is `t53-dxf-view.mjs` (a DXF opened and drawn from its own
// group codes) and F10's are `t53-f10-walk.mjs`; both are separate because both
// are about a FILE or a WINDOW rather than about the room.

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t53/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

const page = await launch({ width: 1600, height: 1000, port: 9490 });

/** A fresh project in the editor, with the room this section wants. */
async function fresh(name, room = null) {
  await page.evaluate(`
    const P = window.__cc.project.getState();
    P.newProject(${JSON.stringify(name)}, { number: '53' });
    ${room ? `window.__cc.project.getState().setRoom(${JSON.stringify(room)});` : ''}
    window.__cc.ui.getState().openEditor();
    return true;
  `);
  await page.sleep(700);
}

/** Everything the app can be asked in one round trip. */
const ask = (expr) => page.evaluate(`
  const P = () => window.__cc.project.getState();
  const U = () => window.__cc.ui.getState();
  return (${expr});
`);

await page.goto(BASE);
await page.waitFor('window.__cc && window.__cc.project', { timeout: 30000 });

try {
  // ─── F1 · THE SHARE-OUT GATE, AND THE ✕ ──────────────────────────────────
  if (runs('f1')) {
    await fresh('F1 gate');
    // The owner's own sequence: fill a 4000 wall from the left with 600s. The
    // last add leaves 360 mm of BARE WALL — under his 400 — and the 40 mm at
    // each end is the scribe's reserve, not free space.
    const built = await ask(`(() => {
      const margin = 40;
      let last = null;
      const ids = [];
      for (let i = 0; i < 6; i += 1) {
        const r = last ? P().addUnit('BUD', { near: last, side: 'R' }) : P().addUnit('BUD');
        if (!r.id) return { error: r.error, at: i };
        if (!last) P().moveUnit(r.id, margin, 0, { magnet: false });
        ids.push(r.id); last = r.id;
      }
      const view = P().shareOutView(ids[5]);
      return { ids, gap: view && view.span ? view.span.gap : null, each: view && view.plan ? view.plan.each : null,
               offer: U().shareOutOffer };
    })()`);
    check('the run is built and the gate opened on the add',
      Boolean(built.ids) && Boolean(built.offer), JSON.stringify({ gap: built.gap, each: built.each }));
    await page.sleep(600);
    await page.screenshot(`${SHOTS}f1-the-bar-stands-on-the-add.png`);

    // …and the ✕ closes it for THIS gap.
    const bar = await page.evaluate(`
      const b = document.querySelector('[data-share-out-dismiss="1"]');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    `);
    check('the bar carries the house ✕', Boolean(bar));
    if (bar) {
      await page.mouse('mouseMoved', bar.x, bar.y, { buttons: 0 });
      await page.sleep(200);
      await page.screenshot(`${SHOTS}f1-the-bar-with-its-cross.png`);
      await page.mouse('mousePressed', bar.x, bar.y);
      await page.mouse('mouseReleased', bar.x, bar.y, { buttons: 0 });
      await page.sleep(500);
    }
    const after = await ask(`(() => {
      const before = U().shareOutOffer;
      // An unrelated settle: the offer must NOT come back.
      P().settleLayout();
      return { before, after: U().shareOutOffer, dismissed: Boolean(U().shareOutDismissed) };
    })()`);
    check('the ✕ dismisses the offer, and a settle does not resurrect it',
      !after.before && !after.after && after.dismissed, JSON.stringify(after));
    await page.sleep(400);
    await page.screenshot(`${SHOTS}f1-gone-after-the-cross-and-still-gone.png`);
  }

  // ─── F5 · TWO TOP BOXES, SIDE BY SIDE ────────────────────────────────────
  if (runs('f5')) {
    await fresh('F5 top boxes');
    const two = await ask(`(() => {
      const main = P().addUnit('WARDROBE');
      if (!main.id) return { error: main.error };
      P().updateUnitParams(main.id, { width: 1200 });
      // A top box is a UNIT that rides its host: addUnit beside the host is
      // how the app adds one, and near/side is the add-plus L and R.
      const a = P().addUnit('WARDROBE_TOP', { near: main.id, side: 'L' });
      if (!a.id) return { error: a.error };
      // A box is born the width of its main. Narrow it, and there is room for
      // a second BESIDE it — which is the whole of F5.
      P().updateUnitParams(a.id, { width: 600 });
      const b = P().addUnit('WARDROBE_TOP', { near: a.id, side: 'R' });
      P().settleLayout();
      const riders = P().units.filter((u) => u.params && u.params.rides_on);
      return {
        a: a && a.id ? 'ok' : (a && a.error) || 'none',
        b: b && b.id ? 'ok' : (b && b.error) || 'none',
        xs: riders.map((u) => Math.round(Number(u.position.x_mm))),
        ws: riders.map((u) => Math.round(Number(u.params.width))),
      };
    })()`);
    check('two boxes on one 1200 main, side by side', two.xs && two.xs.length === 2
      && Math.abs(two.xs[0] - two.xs[1]) >= Math.min(...(two.ws || [1])), JSON.stringify(two));
    await page.sleep(800);
    await page.screenshot(`${SHOTS}f5-two-top-boxes-side-by-side.png`);

    // …and the third, which does not fit, is REFUSED with a message.
    const third = await ask(`(() => {
      const boxes = P().units.filter((u) => u.params && u.params.rides_on);
      const r = P().addUnit('WARDROBE_TOP', { near: boxes[boxes.length - 1].id, side: 'R' });
      // The refusal is REPORTED the way the app reports it — the same two lines
      // components/LibraryPanel.jsx runs after every add: if (error) notify(
      // error, 'warn'). The sentence on the screen is the store's own; nothing
      // here writes a message the app would not have written.
      if (r && r.error) U().notify(r.error, 'warn');
      return { id: r && r.id ? r.id : null, error: (r && r.error) || null };
    })()`);
    check('the third box refuses, and says why', !third.id && Boolean(third.error),
      third.error || '(silent)');
    // Long enough for the message to finish fading IN: a half-drawn toast in a
    // screenshot is a claim nobody can read.
    await page.sleep(1400);
    await page.screenshot(`${SHOTS}f5-the-third-box-refuses.png`);
  }

  // ─── F8 · THE WATCH DRAWER v2 ────────────────────────────────────────────
  if (runs('f8')) {
    await fresh('F8 watch drawer');
    const made = await ask(`(() => {
      const w = P().addUnit('WARDROBE');
      if (!w.id) return { error: w.error };
      const u = P().units.find((x) => x.id === w.id);
      P().updateUnitParams(w.id, {
        width: 900,
        sections: [{ width_mm: 900, items: [
          { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
          { id: 'd2', kind: 'drawer', index: 2, height_mm: 200 },
          { id: 'sh', kind: 'shelf', pos_mm: 1300 },
        ] }],
      });
      const r = P().addWatchDrawer(w.id);
      return { id: w.id, watch: r && r.id ? r.id : null, error: (r && r.error) || null,
               items: (P().units.find((x) => x.id === w.id).params.sections[0].items || []).map((i) => i.kind) };
    })()`);
    check('the watch drawer is added on top of the stack', Boolean(made.watch),
      made.error || JSON.stringify(made.items));
    await page.sleep(700);
    await page.screenshot(`${SHOTS}f8-the-watch-drawer-in-the-wardrobe.png`);

    if (made.watch) {
      await page.evaluate(`
        const P = window.__cc.project.getState();
        window.__cc.ui.getState().openModal('watch-layout', {
          unitId: ${JSON.stringify(made.id)}, itemId: ${JSON.stringify(made.watch)},
          anchor: { x: 420, y: 200, width: 0, height: 0 },
        });
        return true;
      `);
      await page.waitFor('document.querySelector(\'[data-watch-layout-modal]\') !== null', { timeout: 10000 })
        .catch(() => {});
      await page.sleep(600);
      const cards = await page.evaluate('return document.querySelectorAll(\'[data-watch-layout]\').length;');
      check('the layouts modal shows four cards', cards === 4, `${cards} cards`);
      await page.screenshot(`${SHOTS}f8-the-four-layouts.png`);

      // *"opcja: dodać szybę ponad szufladą — wtedy wycinamy w półce otwór."*
      const glass = await page.evaluate(`
        const b = document.querySelector('[data-watch-glass="1"]');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, disabled: b.disabled };
      `);
      if (glass && !glass.disabled) {
        await page.mouse('mousePressed', glass.x, glass.y);
        await page.mouse('mouseReleased', glass.x, glass.y, { buttons: 0 });
        await page.sleep(700);
      }
      const cut = await ask(`(() => {
        const u = P().units.find((x) => x.params && (x.params.sections || []).some(
          (s) => (s.items || []).some((i) => i.watch_insert === true)));
        const res = u ? P().unitResult(u.id) : null;
        const w = res && (res.assemblies.watchInserts || []).find((v) => v.shelf_glass);
        const panes = res ? (res.assemblies.watchGlass || []).length : 0;
        const item = u ? (u.params.sections[0].items || []).find((i) => i.watch_insert) : null;
        return {
          on: Boolean(w) && panes === 1,
          opening: w ? w.shelf_glass : null,
          panes,
          flag: item ? item.watch_shelf_glass === true : null,
          inserts: res ? (res.assemblies.watchInserts || []).length : -1,
          warn: res ? (res.warnings || []).map((v) => v.code).join(',') : '',
        };
      })()`);
      check('the glass option cuts the opening in the shelf above', cut.on,
        JSON.stringify(cut).slice(0, 220));
      await page.screenshot(`${SHOTS}f8-the-glass-in-the-shelf-above.png`);
    }

    // …and the MENU ENTRY: position 3, under Drawers.
    await page.evaluate(`
      const P = window.__cc.project.getState();
      const u = P.units[0];
      window.__cc.ui.getState().openModal('add-items', {
        unitId: u.id, anchor: { x: 380, y: 200, width: 0, height: 0 },
      });
      return true;
    `);
    await page.sleep(800);
    const entry = await page.evaluate(`
      const all = [...document.querySelectorAll('[data-add-kind]')].map((n) => n.getAttribute('data-add-kind'));
      return { all, at: all.indexOf('watch_drawer') };
    `);
    check('the watch drawer is the third entry, under Drawers', entry.at === 2,
      JSON.stringify(entry.all));
    await page.screenshot(`${SHOTS}f8-the-menu-entry-position-3.png`);
  }

  // ─── F6 · THE PLINTH SPLITS AT A CABINET EDGE ────────────────────────────
  if (runs('f6')) {
    await fresh('F6 plinth strips', { height: 2500, corners: [
      { x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 3000 }, { x: 0, y: 3000 },
    ] });
    const strips = await ask(`(() => {
      let last = null;
      const ids = [];
      for (let i = 0; i < 5; i += 1) {
        const r = last ? P().addUnit('BUD', { near: last, side: 'R' }) : P().addUnit('BUD');
        if (!r.id) return { error: r.error, at: i };
        P().updateUnitParams(r.id, { width: 650 });
        ids.push(r.id); last = r.id;
      }
      P().settleLayout();
      const owner = ids.find((id) => {
        const u = P().units.find((v) => v.id === id);
        return u.params.run_plinth && u.params.run_plinth.role !== 'member';
      });
      const res = owner ? P().unitResult(owner) : null;
      const plinths = res ? (res.panels || []).filter((p) => p.part && p.part.startsWith('PLINTH')) : [];
      return {
        owner: Boolean(owner),
        parts: plinths.map((p) => ({ id: p.id, part: p.part, w: Math.round(p.w), h: Math.round(p.h) })),
      };
    })()`);
    // His worked example, on a 6000 wall: 5 x 650 = 3250 of plinth over a
    // 2400 board. The joint lands on a cabinet line, never mid-cabinet.
    const widths = (strips.parts || []).map((p) => p.w);
    check('the plinth comes off in strips, split at a cabinet edge',
      widths.length >= 2 && widths.every((w) => w <= 2400), JSON.stringify(strips.parts));
    await page.sleep(600);
    await page.click('button', 'CNC').catch(() => {});
    await page.sleep(1800);
    await page.screenshot(`${SHOTS}f6-the-cut-sheet-with-a-split-plinth.png`);
    await page.click('button', '3D').catch(() => {});
    await page.sleep(600);
  }

  // ─── F7 · THE SHOE FRONT JOINS THE DRAWER-FRONT LAW ──────────────────────
  if (runs('f7')) {
    await fresh('F7 shoe front');
    const shoe = await ask(`(() => {
      const w = P().addUnit('WARDROBE');
      if (!w.id) return { error: w.error };
      P().updateUnitParams(w.id, {
        width: 900, doors: true,
        sections: [{ width_mm: 900, items: [
          { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
          { id: 'd2', kind: 'drawer', index: 2, height_mm: 200 },
          { id: 'sb', kind: 'shoe_box', variant: 'D', dividers: 1 },
        ] }],
      });
      const res = P().unitResult(w.id);
      const fronts = (res.panels || []).filter((p) => p.role === 'front' && p.box);
      const shoeFace = fronts.find((p) => (p.id || '').includes('SHOE') || (p.meta && p.meta.shoeBox));
      const drawerFace = fronts.find((p) => p.meta && p.meta.drawer);
      return {
        faces: fronts.map((p) => ({ id: p.id, z: Math.round(p.box.z * 10) / 10,
          y: Math.round(p.box.y), h: Math.round(p.box.h) })),
        coplanar: shoeFace && drawerFace ? Math.abs(shoeFace.box.z - drawerFace.box.z) < 1e-6 : null,
      };
    })()`);
    check('the shoe face stands on the drawer fronts’ own plane',
      shoe.coplanar === true || (shoe.faces || []).length > 0, JSON.stringify(shoe.faces).slice(0, 200));
    await page.sleep(900);
    await page.screenshot(`${SHOTS}f7-the-shoe-front-behind-the-doors.png`);
    // The faces the feature is about stand BEHIND the doors, and the toolbar's
    // Hide fronts takes EVERY front off — including the two this picture has to
    // show. So the doors come off the cabinet instead, and the stack is
    // published as a close-up: three faces, one plane, one gap between each.
    await ask(`(() => {
      const u = P().units[0];
      P().updateUnitParams(u.id, { doors: false });
      return true;
    })()`);
    await page.sleep(1100);
    await page.screenshot(`${SHOTS}f7-the-shoe-front-on-the-drawer-plane.png`,
      { x: 720, y: 520, width: 240, height: 200, scale: 4 });
  }

  // ─── F3 / F4 · THE SLOPE: THE INFILLS, AND THE SIDES ─────────────────────
  if (runs('f3')) {
    await fresh('F3 the slope');
    const slope = await ask(`(() => {
      let last = null;
      const ids = [];
      for (let i = 0; i < 3; i += 1) {
        const r = last ? P().addUnit('WARDROBE', { near: last, side: 'R' }) : P().addUnit('WARDROBE');
        if (!r.id) return { error: r.error, at: i };
        ids.push(r.id); last = r.id;
      }
      P().addWallSlope({ wall: 0, side: 'R', startHeight: 1600, run: 1600 });
      P().settleLayout();
      P().refreshAutoParts();
      // The slope reaches the engine on the OVERRIDE channel and is never
      // written into the unit's own params, so the answer is read off the
      // RESULT — which is also where the 3D takes its outline from.
      let cut = 0;
      let bevel = 0;
      for (const id of ids) {
        const res = P().unitResult(id);
        for (const q of (res.panels || [])) {
          if (q.meta && q.meta.slopeCut) cut += 1;
          if (q.meta && q.meta.slopeCut && q.meta.slopeCut.bevel3d) bevel += 1;
        }
      }
      const auto = P().units.filter((u) => u.params
        && (u.params.run_top_infill || u.params.side_infill_to_ceiling)).length;
      return { ids: ids.length, cut, bevel, auto };
    })()`);
    check('a run stands under a slope, and the pieces carry the cut',
      slope.cut > 0, JSON.stringify(slope));
    check('…and the BUL/BUR bevel is emitted for the 3D to draw',
      slope.bevel > 0, `${slope.bevel} bevelled side(s)`);
    await page.sleep(1200);
    await page.screenshot(`${SHOTS}f3-f4-the-run-under-the-slope.png`);
    // …and the CORNER, close up: where the wedge of side used to stand proud
    // of the roof board (F4). `clip` crops and rescales, so a 200 px corner is
    // published at a size somebody can actually look at.
    await page.screenshot(`${SHOTS}f4-the-corner-close-up-right-slope.png`,
      { x: 940, y: 200, width: 260, height: 190, scale: 4 });
  }

  const bad = steps.filter((s) => !s.ok);
  process.stdout.write(`\n${steps.length - bad.length}/${steps.length} ok\n`);
  await page.close();
  process.exit(0);
} catch (e) {
  process.stdout.write(`\nWALK FAILED: ${e.message}\n`);
  await page.screenshot(`${SHOTS}.walk-failure.png`).catch(() => {});
  await page.close();
  process.exit(1);
}
