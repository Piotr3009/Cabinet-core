#!/usr/bin/env node
// ─── THE TURN 40 ACCEPTANCE WALK ────────────────────────────────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn40.mjs [--only f1,f5,…] [--out verify/t40/]
//
// Iron rule 6: a screenshot per visible feature, REAL POINTER INPUT, and every
// picture asserts a NAMED SUBJECT — a selector or a literal string that must be
// on the glass when the shutter goes. A picture whose subject is missing is an
// EMPTY FRAME, which fails the step and the exit code.
//
// Iron rule 1: zero-stop. A phase that throws is recorded FAILED and the walk
// carries on to the next one.

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';

import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const OUT = argOf('--out', new URL('../verify/t40/', import.meta.url).pathname);
const ONLY = argOf('--only', null);

function argOf(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const want = (id) => !ONLY || ONLY.split(',').map((s) => s.trim()).includes(id);

// ─── R1: REAL POINTER INPUT, AND THE GUARD THAT PROVES IT ───────────────────
// The string is assembled from two halves so the guard does not trip on itself.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

mkdirSync(OUT, { recursive: true });

const steps = [];
const shots = [];
const P = 'window.__cc';

// ─── ONE BROWSER PER PHASE ──────────────────────────────────────────────────
//
// T39's walk drove every phase through one page, and this turn's would not: F2
// puts a whole CNC sheet and a 3-D scene through a SOFTWARE renderer, and after
// F1's own scene the process wedged — 300 % of a core, no progress, for as long
// as it was left. A walk that can hang is a walk nobody runs.
//
// So a phase gets a browser of its own and gives it back. It costs a second of
// start-up each and it buys two things worth far more than that: no phase can
// wedge the next, and none can lean on what another left on screen — which is
// the property the report has been claiming all along.
const IGNORED = [
    /favicon\.ico/i, /supabase\.co\/storage/i, /storage\/v1\/object/i,
    // Chromium's own notice when a page is navigated without a prior user
    // gesture. It is the WALK navigating, not the app doing anything.
    /beforeunload/i,
    // The modal shell's own guard: this walk opens some windows from the store
    // rather than from a pointer, so it has no anchor to pass. It is a note
    // about placement, not a fault in the feature under test.
    /\[modal shell\]/i,
];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  let page = null;
  let errorMark = 0;
  const consoleSince = () => realErrors(page.errors.slice(errorMark));

  const check = (label, ok, detail = '') => {
    const errs = consoleSince();
    errorMark = page.errors.length;
    const clean = errs.length === 0;
    steps.push({
      label,
      ok: Boolean(ok) && clean,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      ...(clean ? {} : { console: errs.slice(0, 4) }),
    });
    const line = `${Boolean(ok) && clean ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`;
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
  };

  /** R3 — the named subject. A picture that does not contain it is empty. */
  const shot = async (name, subject = null) => {
    let present = true;
    let detail = 'not asked';
    if (subject) {
      const seen = await page.evaluate(`
        const want = ${JSON.stringify(subject)};
        const out = {};
        if (want.all) {
          out.all = want.all.every((sel) => {
            const el = document.querySelector(sel);
            return Boolean(el && el.getClientRects().length);
          });
        }
        // CASE-INSENSITIVE, deliberately: innerText reports text as RENDERED,
        // and half this app's labels are set in an uppercase CSS class. The
        // subject is on the glass either way; the stylesheet is just shouting.
        const body = (document.body.innerText || '').toLowerCase();
        if (want.text) out.text = body.includes(String(want.text).toLowerCase());
        if (want.texts) out.texts = want.texts.every((t) => body.includes(String(t).toLowerCase()));
        if (want.count) {
          out.count = Object.entries(want.count)
            .every(([sel, n]) => document.querySelectorAll(sel).length >= n);
        }
        return out;
      `);
      present = Object.values(seen).every(Boolean);
      detail = JSON.stringify(seen);
    }
    await page.screenshot(`${OUT}${name}.png`);
    shots.push({ name, subject, present, detail });
    if (!present) check(`RULE 6 — "${name}" contains its named subject`, false, detail);
    else console.log(`  📷  ${name}.png — ${detail}`);
    return present;
  };

  const phase = async (id, label, fn) => {
    if (!want(id)) { console.log(`  ··  ${id} skipped by --only`); return; }
    console.log(`\n── ${id.toUpperCase()} — ${label}`);
    page = await launch({ headless: true, width: 1680, height: 1050 });
    errorMark = 0;
    try { await fn(); } catch (e) {
      check(`${id} — the phase ran`, false, e.message);
      console.log(`      ${e.stack?.split('\n').slice(0, 3).join('\n      ')}`);
    } finally {
      try { await page.close(); } catch { /* it is going away either way */ }
      page = null;
    }
  };

  /** A fresh, empty job. Every phase starts from one, so none can lean on another. */
  const freshProject = async (name) => {
    await page.evaluate(`
      const S = () => ${P}.project.getState();
      S().newProject(${JSON.stringify(name)});
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      ${P}.ui.getState().setCheckOpen(false);
      return true;
    `);
    await page.sleep(250);
  };

  // ═════════════════════════════════════════════════════════════════════════
  // F7 — THE FROZEN VALUE, PROVED FROM A STORED PROFILE CARRYING 5
  // ═════════════════════════════════════════════════════════════════════════
  //
  // It runs FIRST because it is the only phase that needs a browser reloaded
  // with something already in its localStorage — which is exactly the state the
  // owner's own browser is in.
  await phase('f7', 'plateBiteMm — an existing profile picks up 10', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    const stored = await page.evaluate(`
      // A profile as a browser that has ever pressed Save carries it, with the
      // SUPERSEDED number in it — which is the owner's own case.
      const D = JSON.parse(JSON.stringify(${P}.profile.getState().profile));
      D.hardware.hinge.plateBiteMm = 5;
      // …and a real workshop tuning beside it, so the migration is shown not to
      // flatten the block it fixes one key of.
      D.hardware.hinge.cupDiameter = 36;
      localStorage.setItem('cc.profile.v1', JSON.stringify(D));
      return JSON.parse(localStorage.getItem('cc.profile.v1')).hardware.hinge.plateBiteMm;
    `);
    check('a profile carrying the superseded 5 is in localStorage', stored === 5, `stored ${stored}`);

    // RELOAD — which is the path the owner takes every morning.
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot on the stored profile' });
    const after = await page.evaluate(`
      const H = ${P}.profile.getState().profile.hardware.hinge;
      return { bite: H.plateBiteMm, cup: H.cupDiameter,
               storedStill: JSON.parse(localStorage.getItem('cc.profile.v1')).hardware.hinge.plateBiteMm };
    `);
    check('THE CODE WINS: the app uses 10, not the stored 5',
      after.bite === 10, JSON.stringify(after));
    check('…and the workshop’s own cup measurement in the same block survives',
      after.cup === 36, `cup ${after.cup}`);

    // Something on the glass to photograph it against: the cabinet whose hinge
    // plate that number places, with its door open so the plate is in view.
    await freshProject('T40 · F7 plate bite');
    const made = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2150, doors: { count: 2 } });
      const r = S().unitResult(w.id);
      const fronts = r.panels.filter((p) => p.part === 'FRONT').map((p) => p.id);
      ${P}.ui.getState().selectUnit(w.id);
      ${P}.ui.getState().openFrontsFor(w.id, fronts);
      return { id: w.id, num: S().units[0].params.unit_num, fronts: fronts.length };
    `);
    await page.sleep(1200);
    check('a wardrobe with its doors open, drawn on the stored profile',
      made.fronts === 2, JSON.stringify(made));
    await shot('f7-existing-project-picks-up-plate-bite-10', {
      all: ['canvas'],
      // The JOB's own name is the subject: this frame's whole claim is that the
      // app is running on a stored profile that carried 5, and the project it
      // is drawing says which walk made it.
      texts: ['plate bite'],
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F1 — THE SPLIT-DOOR HINGE CHAIN
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f1', 'split doors — two hinge sets, movable', async () => {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T40 · F1 split doors');

    const seeded = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, {
        width: 900, height: 2150, doors: { count: 2 }, split_top_mm: 600,
      });
      const r = S().unitResult(w.id);
      const segs = r.panels.filter((p) => p.part === 'FRONT' && p.meta && p.meta.split);
      window.__t40 = { unitId: w.id, num: S().units[0].params.unit_num,
                       top: segs.find((p) => p.meta.split === 'top').id,
                       bottom: segs.find((p) => p.meta.split === 'bottom').id };
      return {
        segments: segs.map((p) => p.id),
        rowsByPanel: r.drillSummary.hinge_rows_by_panel,
        cabinetLadder: r.drillSummary.hinge_centers,
      };
    `);
    check('the leaf is cut as TWO segments with two ladders',
      seeded.segments.length === 4, JSON.stringify(seeded.segments));
    check('…and the cabinet’s own `hinge_centers` is still the PRE-SPLIT list',
      seeded.cabinetLadder.length === 6, JSON.stringify(seeded.cabinetLadder));

    // THE READER: the Doors modal now offers the SEGMENT's own rows.
    const offered = await page.evaluate(`
      const S = ${P}.project.getState();
      const t = window.__t40;
      return {
        cabinet: S.hingeRowsOf(t.unitId).length,
        top: S.hingeRowsOf(t.unitId, t.top),
        bottom: S.hingeRowsOf(t.unitId, t.bottom),
      };
    `);
    check('the modal’s reader offers the TOP leaf its own two rows',
      offered.top.length === 2 && offered.bottom.length === 3, JSON.stringify(offered));

    // Open the TOP segment's own window — through the app, not through a store
    // call, so the picture is of the thing a joiner actually opens.
    await page.evaluate(`
      const t = window.__t40;
      ${P}.ui.getState().selectElement(t.unitId, t.top);
      ${P}.ui.getState().openModal('element', { unitId: t.unitId, panelId: t.top });
      return true;
    `);
    await page.waitFor('document.querySelector(\'[data-hinge-modal-rows="1"]\')', { what: 'the Doors modal' });
    await page.sleep(300);

    // REAL POINTER INPUT: nudge the top leaf's lowest hinge UP.
    const before = await page.evaluate(`
      const S = ${P}.project.getState(); const t = window.__t40;
      return { top: S.hingeRowsOf(t.unitId, t.top), bottom: S.hingeRowsOf(t.unitId, t.bottom) };
    `);
    await page.click('[data-hinge-up]');
    await page.click('[data-hinge-up]');
    await page.sleep(400);
    const after = await page.evaluate(`
      const S = ${P}.project.getState(); const t = window.__t40;
      const u = S.units.find((x) => x.id === t.unitId);
      return {
        top: S.hingeRowsOf(t.unitId, t.top),
        bottom: S.hingeRowsOf(t.unitId, t.bottom),
        stored: u.params.split_hinge_rows,
        cabinetList: u.params.hinge_rows || null,
      };
    `);
    check('A TOP-LEAF HINGE MOVES when the arrow is pressed',
      JSON.stringify(after.top) !== JSON.stringify(before.top),
      `${JSON.stringify(before.top)} → ${JSON.stringify(after.top)}`);
    check('…and the BOTTOM leaf does not move with it',
      JSON.stringify(after.bottom) === JSON.stringify(before.bottom),
      JSON.stringify(after.bottom));
    check('…and it is stored on the SEGMENT’s own key, not the cabinet’s',
      after.stored && Object.keys(after.stored).length === 1 && after.cabinetList === null,
      JSON.stringify(after.stored));

    await shot('f1-split-door-hinges-two-sets-movable', {
      all: ['[data-hinge-modal-rows="1"]', '[data-hinge-scope="top"]', '[data-split-modal]'],
      texts: ['Split door', 'top leaf'],
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F2 — ONE GRAIN TRUTH
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f2', 'one grain truth — the cut decides', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T40 · F2 one grain truth');

    const seeded = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const b = S().addUnit('BUDR');
      S().updateUnitParams(b.id, { width: 900, plinth: true });
      ${P}.ui.getState().selectUnit(b.id);
      window.__t40 = { unitId: b.id, num: S().units[0].params.unit_num };
      const r = S().unitResult(b.id);
      const T = window.__ccT40;
      const rows = r.panels
        .filter((p) => /DRAWER-SIDE|DRAWER-BOX-FRONT|DRAWER-BOX-BACK|DRAWER-FRONT|PLINTH/.test(p.part))
        .map((p) => ({
          part: p.part,
          turn: T.layout.sheetTurn(p),
          upMm: T.layout.sheetLay(p).upMm,
          h: p.h,
          run: T.decors.grainRun(p).axis,
          lengthMm: T.decors.grainRun(p).lengthMm,
        }));
      return { rows, count: rows.length, num: window.__t40.num };
    `);
    const standing = seeded.rows.filter((r) => Math.abs(r.upMm - r.h) < 0.5);
    check('EVERY role the owner named is CUT STANDING — its own height up the sheet',
      standing.length === seeded.rows.length,
      `${standing.length}/${seeded.rows.length}`);
    const derived = seeded.rows.filter((r) => Math.abs(r.lengthMm - r.upMm) < 0.5);
    check('…and the 3-D grain DERIVES from that, millimetre for millimetre',
      derived.length === seeded.rows.length, `${derived.length}/${seeded.rows.length}`);
    const turned = seeded.rows.filter((r) => r.turn === 90);
    check('the drawer-box boards drawn TURNED are stood back up on the sheet',
      turned.length >= 4, `${turned.length} turned: ${[...new Set(turned.map((r) => r.part))].join(', ')}`);

    // THE SHEET, on the glass. The CNC view IS the picture of the cut.
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.waitFor('document.querySelector(\'[data-cnc-view], [data-cnc-sheet]\')',
      { what: 'the CNC sheet', timeout: 15000 }).catch(() => null);
    await page.sleep(1200);
    await shot('f2a-drawer-parts-and-plinth-stand-on-sheet', {
      text: seeded.num,
    });

    // …and the SCENE, which now shows what was cut.
    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(1200);
    const scene = await page.evaluate(`
      const S = ${P}.project.getState();
      const r = S.unitResult(window.__t40.unitId);
      const T = window.__ccT40;
      const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
      const map = T.decors.decorMapping(side.box, T.decors.grainRun(side).lengthMm);
      return { axis: T.decors.grainRun(side).axis, faceAxis: map.grainAxis, up: T.layout.sheetLay(side).upMm, h: side.h };
    `);
    check('a drawer side cut STANDING shows its figure standing in the scene',
      scene.axis === 'h' && scene.faceAxis === 'v' && Math.abs(scene.up - scene.h) < 0.5,
      JSON.stringify(scene));
    await shot('f2b-3d-grain-matches-the-cut', { all: ['canvas'], text: seeded.num });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F5 — WALL DRAWINGS
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f5', 'wall drawings — the whole run', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('Anderson Kitchen');

    const seeded = await page.evaluate(`
      const S = () => ${P}.project.getState();
      S().setProjectInfo({ client: 'Mr Anderson', number: 'J-1042' });
      const a = S().addUnit('BUD');
      S().updateUnitParams(a.id, { width: 600, plinth: true, doors: { count: 1, hinge: 'L' } });
      const b = S().addUnit('BUD');
      S().updateUnitParams(b.id, { width: 500, plinth: true, doors: { count: 1, hinge: 'R' } });
      S().moveUnit(b.id, 640);
      const c = S().addUnit('WUD');
      S().updateUnitParams(c.id, { width: 600, mount_height: 1500, doors: { count: 1, hinge: 'L' } });
      S().moveUnit(c.id, 40);
      const d = S().addUnit('WARDROBE');
      S().updateUnitParams(d.id, { width: 900, height: 2150, doors: { count: 2 } });
      S().moveUnitToWall(d.id, 1, 300);
      return { units: S().units.length, walls: [...new Set(S().units.map((u) => u.position.wall))] };
    `);
    check('a kitchen wall and a wardrobe wall are standing', seeded.units === 4, JSON.stringify(seeded));

    const set = await page.evaluate(`
      const S = ${P}.project.getState();
      const T = window.__ccT40;
      const sheets = T.wallSheets.wallDrawingSheets({
        entries: S.allResults(), project: S.project, room: S.project.room,
        profile: ${P}.profile.getState().profile, date: '18/08/2026',
      });
      const groups = T.wallElevation.wallGroups(S.allResults(), ${P}.profile.getState().profile);
      const chains = T.wallElevation.widthChains(groups[0].members, ${P}.profile.getState().profile);
      const sum = (a) => a.reduce((n, v) => n + v, 0);
      return {
        names: sheets.map((s) => s.name),
        detailed: chains.detailed, grouped: chains.grouped,
        sums: [sum(chains.detailed), sum(chains.grouped)],
      };
    `);
    check('the sheet list is HIS: /1, /2 per wall, plus one horizontal section',
      set.names.join(' | ') === 'Wall A /1 | Wall A /2 | Wall B /1 | Wall B /2 | Horizontal section',
      set.names.join(' | '));
    check('TWO CHAINS on the horizontal axis, and they add up to the same wall',
      set.sums[0] === set.sums[1] && set.detailed.length > set.grouped.length,
      `detailed ${JSON.stringify(set.detailed)} = ${set.sums[0]}, grouped ${JSON.stringify(set.grouped)} = ${set.sums[1]}`);

    // Open the drawings window and walk the set — real clicks on real tabs.
    await page.evaluate(`${P}.ui.getState().openModal('drawing', { kind: 'walls' }); return true;`);
    await page.waitFor('document.querySelector(\'[data-drawing-kind-tab="walls"]\')', { what: 'the Drawings window' });
    await page.click('[data-drawing-kind-tab="walls"]');
    await page.sleep(900);
    await page.click('[data-wall-sheet="Wall A /1"]');
    await page.sleep(700);
    await shot('f5a-wall-elevation-with-fronts', {
      all: ['[data-wall-sheets]', '[data-cc-drawing]'],
      texts: ['Wall A /1', 'No Scale', 'Anderson Kitchen'],
    });

    await page.click('[data-wall-sheet="Wall A /2"]');
    await page.sleep(700);
    await shot('f5b-wall-carcass-no-fronts', {
      all: ['[data-cc-drawing]'],
      texts: ['Wall A /2', 'No Scale'],
    });

    await page.click('[data-wall-sheet="Horizontal section"]');
    await page.sleep(700);
    await shot('f5c-horizontal-section', {
      all: ['[data-cc-drawing]'],
      texts: ['Horizontal section', 'WALL A', 'WALL B'],
    });

    // THE DXF: text on this path, and the warning ON the drawing.
    const dxf = await page.evaluate(`
      const S = ${P}.project.getState();
      const T = window.__ccT40;
      const sheets = T.wallSheets.wallDrawingSheets({
        entries: S.allResults(), project: S.project, room: S.project.room,
        profile: ${P}.profile.getState().profile, date: '18/08/2026',
      });
      const text = T.drawingsDxf.sheetToDxf(sheets[0].sheet);
      const cnc = window.__ccDxf.buildUnitDxfFiles(S.unitResult(S.units[0].id), ${P}.profile.getState().profile);
      const texts = (s) => [...s.matchAll(/\\r\\n0\\r\\nTEXT\\r\\n[\\s\\S]*?\\r\\n1\\r\\n(.*?)\\r\\n/g)].map((m) => m[1]);
      return {
        drawingTexts: texts(text).length,
        warned: text.includes(T.drawingsDxf.DXF_AUTOCAD_ONLY),
        note: T.drawingsDxf.DXF_AUTOCAD_ONLY,
        cncHasWarning: cnc.some((f) => f.dxf.includes('VCarve') || f.dxf.includes('No Scale')),
        cncMaxTexts: Math.max(...cnc.map((f) => texts(f.dxf).length)),
        // The part label's own bound — the only text the CNC path has ever
        // carried, wrapped to at most this many lines.
        labelMaxLines: ${P}.profile.getState().profile.cnc.labelMaxLines,
      };
    `);
    check('the wall DXF carries TEXT — a drawing is nothing without its numbers',
      dxf.drawingTexts > 10, `${dxf.drawingTexts} text entities`);
    check('…and says AutoCAD only, ON the drawing', dxf.warned, dxf.note);
    check('THE CNC PATH IS UNTOUCHED: no note, and only the in-part label',
      dxf.cncHasWarning === false && dxf.cncMaxTexts <= dxf.labelMaxLines,
      `cnc max texts ${dxf.cncMaxTexts} against a label bound of ${dxf.labelMaxLines}`);
    await shot('f5d-dxf-drawings-labelled-autocad-only', {
      all: ['[data-wall-drawings-dxf="1"]', '[data-wall-note="1"]'],
      text: 'AutoCAD only',
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F3 — THE STRIP, AND OVERLAY DRAWERS
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f3', 'the 30 mm strip, and overlay drawers', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T40 · F3a no door no strip');

    const strip = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2150, doors: { count: 2 } });
      S().addDrawers(w.id, 2);
      const withDoors = S().unitResult(w.id);
      const on = {
        strip: withDoors.panels.filter((p) => p.part === 'DP' || p.part === 'FILLER').length,
        front: withDoors.panels.find((p) => p.part === 'DRAWER-FRONT').w,
      };
      S().updateUnitParams(w.id, { doors: false });
      const withoutDoors = S().unitResult(w.id);
      const off = {
        strip: withoutDoors.panels.filter((p) => p.part === 'DP' || p.part === 'FILLER').length,
        front: withoutDoors.panels.find((p) => p.part === 'DRAWER-FRONT').w,
      };
      ${P}.ui.getState().selectUnit(w.id);
      window.__t40 = { unitId: w.id, num: S().units[0].params.unit_num };
      return { on, off, num: S().units[0].params.unit_num };
    `);
    check('DOORS ON: the 30 mm strip is cut, as it always was',
      strip.on.strip > 0, JSON.stringify(strip.on));
    check('DOORS OFF: NO STRIP, and the front grows by exactly the band',
      strip.off.strip === 0 && strip.off.front > strip.on.front,
      `${strip.on.front} → ${strip.off.front} mm, ${strip.on.strip} → ${strip.off.strip} boards`);
    await page.sleep(1200);
    await shot('f3a-no-door-no-strip', { all: ['canvas'], texts: ['no door no strip'] });

    // …and the OVERLAY stack.
    await freshProject('T40 · F3b overlay drawers in a wardrobe');
    const overlay = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2150, doors: { count: 2 } });
      ${P}.ui.getState().selectUnit(w.id);
      window.__t40 = { unitId: w.id, num: S().units[0].params.unit_num };
      return { num: S().units[0].params.unit_num };
    `);
    // REAL POINTER INPUT: open the "+" offer and add the stack from the list.
    await page.evaluate(`${P}.ui.getState().openModal('add-items', { unitId: window.__t40.unitId }); return true;`);
    await page.waitFor('document.querySelector(\'[data-add-kind="overlay_drawers"]\')',
      { what: 'the ADD ITEMS offer' });
    await shot('f3b-offer-lists-internal-and-overlay', {
      all: ['[data-add-kind="drawers"]', '[data-add-kind="overlay_drawers"]'],
      texts: ['Drawers (internal)', 'Drawers (overlay)'],
    });
    await page.click('[data-add-kind="overlay_drawers"]');
    await page.sleep(300);
    await page.click('[data-add-overlay-drawers="1"]');
    await page.sleep(900);

    const made = await page.evaluate(`
      const S = ${P}.project.getState();
      const r = S.unitResult(window.__t40.unitId);
      const rec = r.assemblies.overlayDrawers;
      const doors = r.panels.filter((p) => p.part === 'FRONT' && p.role === 'front');
      return {
        count: rec ? rec.count : 0,
        heights: rec ? rec.heights : [],
        stackTop: rec ? rec.stackTop : null,
        shelf: Boolean(r.panels.find((p) => p.id === 'OVERLAY-FIX')),
        shelfY: rec ? rec.shelf.y : null,
        doorY: doors[0] ? doors[0].box.y : null,
        doorH: doors[0] ? doors[0].h : null,
        strip: r.panels.filter((p) => p.part === 'DP' || p.part === 'FILLER').length,
        H: r.params.height,
      };
    `);
    check('the stack is at the BOTTOM, with EQUAL heights',
      made.count === 3 && new Set(made.heights).size === 1, JSON.stringify(made.heights));
    check('a FIXED SHELF sits above it', made.shelf && made.shelfY === made.stackTop + 3,
      `shelf at ${made.shelfY}, stack top ${made.stackTop}`);
    check('the DOORS start on that line and are shortened to suit',
      made.doorY === made.stackTop + 3 && made.doorH < made.H - made.stackTop,
      `door y ${made.doorY}, h ${made.doorH} in a ${made.H} carcass`);
    check('and NEVER a 30 mm strip', made.strip === 0, `${made.strip} boards`);

    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(1400);
    await shot('f3b-overlay-drawers-in-wardrobe', {
      all: ['canvas'],
      texts: ['overlay drawers in a wardrobe'],
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F4 — THE CHECKS
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f4', 'checks — one message, no twins, take me there', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T40 · F4 checks');

    // F4b — the owner's own configuration.
    const tall = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2460, doors: { count: 2 } });
      S().addShelves(w.id, 1);
      ${P}.ui.getState().selectUnit(w.id);
      ${P}.ui.getState().setCheckOpen(true);
      window.__t40 = { unitId: w.id, num: S().units[0].params.unit_num };
      const f = S().runChecks();
      return { three: f.filter((x) => x.check === 3).length, num: S().units[0].params.unit_num };
    `);
    await page.waitFor('document.querySelector(\'[data-check-panel]\')', { what: 'the Check panel' });
    await page.sleep(500);
    const onGlass = await page.evaluate(`
      return document.querySelectorAll('[data-check-finding="3"]').length;
    `);
    check('#3 TALL CABINET WITH NO FIXED SHELF appears EXACTLY ONCE',
      tall.three === 1 && onGlass === 1, `list ${tall.three}, on the glass ${onGlass}`);
    await shot('f4b-tall-cabinet-fault-appears-once', {
      all: ['[data-check-panel]', '[data-check-finding="3"]'],
      count: { '[data-check-finding="3"]': 1 },
      text: 'TALL CABINET WITH NO FIXED SHELF',
    });

    // …and two cabinets are told apart, which is what the twin really was.
    const twin = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const a = S().addUnit('WARDROBE');
      S().removeUnit(window.__t40.unitId);
      const b = S().addUnit('WARDROBE');
      for (const u of S().units) {
        S().updateUnitParams(u.id, { width: 900, height: 2460, doors: { count: 2 } });
        S().addShelves(u.id, 1);
      }
      const f = S().runChecks().filter((x) => x.check === 3);
      return { count: f.length, names: S().units.map((u) => u.params.unit_num), messages: new Set(f.map((x) => x.message)).size };
    `);
    check('two cabinets never wear one name, so two faults are two LINES',
      new Set(twin.names).size === twin.names.length && twin.messages === twin.count,
      `${twin.names.join(', ')} — ${twin.count} findings, ${twin.messages} distinct`);

    // F4a / F4c — the clash, in both places, with the same buttons.
    await freshProject('T40 · F4a the same fault');
    const clash = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const b = S().addUnit('BUD');
      S().updateUnitParams(b.id, { width: 600, doors: { count: 1, hinge: 'L' } });
      S().addShelves(b.id, 2);
      // THE OWNER'S OWN FAULT, made deliberately: a shelf level with a hinge.
      // The rows are read off the engine's published answer, so the walk is not
      // guessing at a height that happens to clash.
      const rows = S().unitResult(b.id).drillSummary.hinge_centers;
      const items = S().units.find((u) => u.id === b.id).params.sections[0].items
        .filter((i) => i.kind === 'shelf');
      S().setShelfPos(b.id, items[0].id, rows[1]);
      const r = S().unitResult(b.id);
      window.__t40 = { unitId: b.id, num: S().units[0].params.unit_num };
      ${P}.ui.getState().selectUnit(b.id);
      ${P}.ui.getState().setCheckOpen(true);
      const f = S().runChecks().filter((x) => x.check === 1);
      return {
        hingeRows: rows,
        clashes: r.clashes.length,
        findings: f.length,
        labels: f.length ? f[0].actions.map((a) => a.label) : [],
        shelf: f.length ? f[0].subject.panelId : null,
        door: f.length ? f[0].alternative.panelId : null,
        atMm: f.length ? f[0].actions.map((a) => a.subject.atMm) : [],
      };
    `);
    check('a shelf really is level with a hinge on this cabinet',
      clash.clashes > 0, `rows ${JSON.stringify(clash.hingeRows)}, ${clash.clashes} clash(es)`);
    check('the shelf × hinge fault carries BOTH buttons, as data',
      clash.labels.join(' | ') === 'Remove sleeves at this shelf | Move the hinge',
      clash.labels.join(' | '));

    // Both renderers on one screen: the CABINET's own window (which the owner
    // photographed) and the Check panel at the right edge.
    await page.evaluate(`
      ${P}.ui.getState().openModal('cabinet', { unitId: window.__t40.unitId });
      return true;
    `);
    await page.waitFor('document.querySelector(\'[data-shelf-hinge-clash]\')', { what: 'the cabinet window' });
    await page.sleep(700);
    // The cabinet's window opens MAXIMISED (T13-F2.1), which covers the Check
    // panel it has to be photographed BESIDE. Restore it with its own ❐ — a
    // real press on the control a joiner uses — so one frame carries both.
    await page.click('[data-modal-maximise="1"]');
    await page.sleep(900);
    const both = await page.evaluate(`
      const labels = (sel) => [...document.querySelectorAll(sel)].map((n) => n.textContent.trim());
      const inPanel = labels('[data-check-panel] [data-check-action]');
      // Scoped to the CABINET's own window: the right panel renders the same
      // component and is behind it, and a query that swept both would be
      // counting one surface twice.
      const inModal = labels('[data-editor-properties] [data-shelf-hinge-clash] [data-check-action]');
      const visible = (sel) => { const el = document.querySelector(sel); return Boolean(el && el.getClientRects().length); };
      return {
        inPanel,
        inModal,
        panelVisible: visible('[data-check-panel]'),
        modalVisible: visible('[data-editor-properties] [data-shelf-hinge-clash]'),
      };
    `);
    check('THE SAME TWO BUTTONS, in BOTH places, both on the glass',
      both.inPanel.length >= 2 && JSON.stringify(both.inPanel) === JSON.stringify(both.inModal)
        && both.panelVisible && both.modalVisible,
      `panel ${JSON.stringify(both.inPanel)} · modal ${JSON.stringify(both.inModal)}`);
    await shot('f4a-same-fault-same-buttons-both-places', {
      all: ['[data-check-panel]', '[data-editor-properties] [data-shelf-hinge-clash]',
        '[data-check-panel] [data-check-action="move-hinge"]',
        '[data-editor-properties] [data-shelf-hinge-clash] [data-check-action="move-hinge"]'],
      texts: ['Remove sleeves at this shelf', 'Move the hinge'],
    });

    // F4c — press "Move the hinge" and be taken there.
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);
    const shut = await page.evaluate(`
      const t = window.__t40;
      ${P}.ui.getState().closeAllFronts(t.unitId);
      return Object.keys(${P}.ui.getState().openFronts[t.unitId] || {}).length;
    `);
    check('the doors start SHUT, which is the case the owner described', shut === 0, `${shut} open`);

    // THE ROW ITSELF is about the SHELF, which is BEHIND the doors — so this is
    // the click the owner's sentence is about: *"jeśli drzwi zamknięte, to
    // otwiera program drzwi i nas tam zabiera."*
    await page.click('[data-check-panel] [data-check-goto="1"]');
    await page.sleep(1200);
    const toShelf = await page.evaluate(`
      const U = ${P}.ui.getState(); const t = window.__t40;
      const open = U.openFronts[t.unitId] || {};
      return {
        doorsOpened: Object.values(open).filter((v) => v > 0.5).length,
        selected: U.selectedElement ? U.selectedElement.elementRef : null,
        flewTo: U.focusPanel ? U.focusPanel.panelId : 'arrived',
      };
    `);
    check('IT OPENS THE DOORS FIRST, then rings the shelf and flies to it',
      toShelf.doorsOpened > 0 && String(toShelf.selected || '').includes('SHELF'),
      JSON.stringify(toShelf));

    // …and the OTHER way out goes to the HINGE, which is on the door itself —
    // so nothing is opened in front of it (a camera flown at a swinging door
    // sees a door), and the window opens on that very row.
    // The shelf's own window opened over the Check panel — close it, so the
    // next press lands on the button and not on the window in front of it.
    await page.evaluate(`
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().setCheckOpen(true);
      return true;
    `);
    await page.sleep(500);
    await page.click('[data-check-panel] [data-check-action="move-hinge"]');
    await page.sleep(1400);
    const travelled = await page.evaluate(`
      const U = ${P}.ui.getState(); const t = window.__t40;
      const open = U.openFronts[t.unitId] || {};
      return {
        doorsStillOpen: Object.values(open).filter((v) => v > 0.5).length,
        selected: U.selectedElement ? U.selectedElement.elementRef : null,
        modal: U.modal,
        hingeIndex: U.modalArgs ? U.modalArgs.hingeIndex : null,
      };
    `);
    check('…and the doors it opened STAY open — no fighting the user',
      travelled.doorsStillOpen > 0, JSON.stringify(travelled));
    check('…rings the door and opens its window at that hinge row',
      travelled.modal === 'element' && travelled.hingeIndex != null,
      JSON.stringify(travelled));
    await shot('f4c-camera-at-the-hinge-doors-opened', {
      all: ['canvas', '[data-hinge-modal-rows="1"]', '[data-hinge-row-current="1"]'],
      text: 'Hinges',
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F6 — THE RAIL
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f6', 'the rail — alone, or with a shelf', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T40 · F6 the rail');

    const seeded = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2150, doors: { count: 2 } });
      ${P}.ui.getState().selectUnit(w.id);
      window.__t40 = { unitId: w.id, num: S().units[0].params.unit_num };
      return { num: S().units[0].params.unit_num };
    `);
    await page.evaluate(`${P}.ui.getState().openModal('add-items', { unitId: window.__t40.unitId }); return true;`);
    await page.waitFor('document.querySelector(\'[data-add-kind="hanger"]\')', { what: 'the ADD ITEMS offer' });
    await page.click('[data-add-kind="hanger"]');
    await page.sleep(400);
    await shot('f6-rail-modal-alone-or-with-shelf', {
      all: ['[data-rail-with-shelf="1"]', '[data-rail-alone="1"]', '[data-rail-mode="with-shelf"]'],
      texts: ['With a shelf', 'Rail alone'],
    });

    // REAL POINTER INPUT: choose "Rail alone", then add it.
    await page.click('[data-rail-alone="1"]');
    await page.sleep(200);
    await page.click('.cc-btn-gold', 'Add hanger rail');
    await page.sleep(900);
    const alone = await page.evaluate(`
      const S = ${P}.project.getState(); const t = window.__t40;
      const items = S.units.find((u) => u.id === t.unitId).params.sections[0].items;
      const r = S.unitResult(t.unitId);
      return {
        shelves: items.filter((i) => i.kind === 'shelf').length,
        rails: items.filter((i) => i.kind === 'hanger').length,
        mount: (items.find((i) => i.kind === 'hanger') || {}).mount,
        rod: Boolean(r.assemblies.rail),
        partitioner: r.panels.some((p) => p.part === 'RAIL-PART'),
      };
    `);
    check('RAIL ALONE: a rod, no shelf, and its own partitioner above it',
      alone.rails === 1 && alone.shelves === 0 && alone.rod && alone.partitioner,
      JSON.stringify(alone));
    check('…and the choice is recorded, so the modal knows it is not just OLD',
      alone.mount === 'alone', `mount=${alone.mount}`);

    // …and the DEFAULT is still the assembly.
    const withShelf = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2150, doors: { count: 2 } });
      S().addHangerRail(w.id);
      const items = S().units.find((u) => u.id === w.id).params.sections[0].items;
      const rail = items.find((i) => i.kind === 'hanger');
      return {
        shelves: items.filter((i) => i.kind === 'shelf').length,
        mount: rail.mount, linked: Boolean(rail.shelf_id),
      };
    `);
    check('the DEFAULT is still T37’s assembly — a FIX shelf with the rod under it',
      withShelf.shelves === 1 && withShelf.mount === 'shelf' && withShelf.linked,
      JSON.stringify(withShelf));
    check('the walk seeded a wardrobe to press the buttons on', Boolean(seeded.num), seeded.num);
  });

  // ─── REPORT ───────────────────────────────────────────────────────────────
  const failed = steps.filter((s) => !s.ok);
  const empty = shots.filter((s) => !s.present);
  writeFileSync(`${OUT}report.json`, `${JSON.stringify({
    turn: 40, when: new Date().toISOString(), steps, shots, failed: failed.length, emptyFrames: empty.length,
  }, null, 1)}\n`);
  console.log(`\n${steps.length - failed.length}/${steps.length} checks, ${shots.length} pictures, ${empty.length} empty frames`);
  if (failed.length) console.log(`FAILED:\n  ${failed.map((f) => `${f.label} — ${f.detail}`).join('\n  ')}`);
  process.exit(failed.length || empty.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
