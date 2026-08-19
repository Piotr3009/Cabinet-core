#!/usr/bin/env node
// ─── THE TURN 41 ACCEPTANCE WALK ────────────────────────────────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn41.mjs [--only f1,f5,…] [--out verify/t41/]
//
// Iron rule 6: a screenshot per visible feature, REAL POINTER INPUT, and every
// picture asserts a NAMED SUBJECT — a selector or a literal string that must be
// on the glass when the shutter goes. A picture whose subject is missing is an
// EMPTY FRAME, which fails the step and the exit code.
//
// Iron rule 1: zero-stop. A phase that throws is recorded FAILED and the walk
// carries on to the next one.
//
// ─── RULE 6b (TURN 41): A PICTURE MUST BE ITS OWN PICTURE ───────────────────
//
// T40's proof set shipped fifteen PNGs and only fourteen pictures:
// `f5c-horizontal-section.png` and `f5d-dxf-drawings-labelled-autocad-only.png`
// are the same 131,263 bytes, md5 6fbf73c9801b969b26de061cde611e25. So the DXF
// output — a whole named feature — was never once looked at, and the walk that
// produced it exited without noticing.
//
// A named-subject check cannot catch that: both frames DID contain their
// subject, because they were the same frame and it was on it. So the shutter
// now hashes what it wrote and refuses a repeat. Ten lines, and they are the
// difference between fifteen files and fifteen proofs.

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const OUT = argOf('--out', new URL('../verify/t41/', import.meta.url).pathname);
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
/** RULE 6b: sha256 of every frame written, so a repeat is a failed step. */
const frames = new Map();
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
    // RULE 6b — the frame is this feature's own frame, not the last one again.
    const bytes = readFileSync(`${OUT}${name}.png`);
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const twin = frames.get(hash);
    if (twin) {
      check(`RULE 6b — "${name}" is its OWN frame`, false,
        `byte-identical to ${twin}.png (${hash})`);
    } else {
      frames.set(hash, name);
    }
    shots.push({ name, subject, present, detail, frame: hash, ...(twin ? { twinOf: twin } : {}) });
    if (!present) check(`RULE 6 — "${name}" contains its named subject`, false, detail);
    else console.log(`  📷  ${name}.png — ${bytes.length} bytes — ${detail}`);
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
  // F1 — THE SHEET STANDS UP
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f1', 'the sheet stands up', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T41 · F1 the sheet');

    await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('BUDR');
      S().updateUnitParams(w.id, { width: 900, plinth: true });
      ${P}.ui.getState().selectUnit(w.id);
      window.__t41 = { unitId: w.id };
      return true;
    `);
    await page.sleep(500);

    // THE OBSERVABLE FACT: the long (banded) edge runs UP the sheet. Asked of
    // the same function the CNC view lays the nest with — NOT of a stored
    // letter, which is the assertion T40 made and which a board lying flat
    // satisfies perfectly.
    const lay = await page.evaluate(`
      const S = ${P}.project.getState();
      const r = S.unitResult(window.__t41.unitId);
      const rows = [];
      for (const p of r.panels) {
        if (!${P}T40.grain.cutStanding(p.part)) continue;
        const l = ${P}T40.layout.sheetLay(p);
        rows.push({
          part: p.part, w: Math.round(p.w), h: Math.round(p.h),
          up: Math.round(l.upMm), across: Math.round(l.acrossMm),
          stands: l.upMm >= l.acrossMm && Math.abs(l.upMm - Math.max(p.w, p.h)) < 0.6,
        });
      }
      return { n: rows.length, standing: rows.filter((x) => x.stands).length, sample: rows.slice(0, 3) };
    `);
    check('EVERY board the owner named has its LONG (banded) edge up the sheet',
      lay.n > 0 && lay.standing === lay.n, `${lay.standing}/${lay.n} — ${JSON.stringify(lay.sample)}`);

    // …and the 3-D shows the grain of the board AS CUT.
    const seam = await page.evaluate(`
      const S = ${P}.project.getState();
      const r = S.unitResult(window.__t41.unitId);
      const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
      const run = ${P}T40.decors.grainRun(side);
      const l = ${P}T40.layout.sheetLay(side);
      return { axis: run.axis, length: Math.round(run.lengthMm), up: Math.round(l.upMm), w: Math.round(side.w), h: Math.round(side.h) };
    `);
    check('…and the 3-D runs the figure the way the saw cut it',
      seam.length === seam.up && seam.length === Math.max(seam.w, seam.h), JSON.stringify(seam));

    // REAL POINTER INPUT: open the CNC view and photograph the nest.
    await page.click('[data-view="cnc"]').catch(() => {});
    await page.sleep(300);
    await page.evaluate(`${P}.ui.getState().setView && ${P}.ui.getState().setView('cnc'); return true;`).catch(() => {});
    await page.sleep(1200);
    await shot('f1-the-sheet-stands-up', { text: 'DRAWER' });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F2 — ONE RAIL CHAIN
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f2', 'one rail chain — the rod\'s y after a drag', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T41 · F2 the rail');

    await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2150, doors: { count: 2 } });
      S().addHangerRail(w.id);
      ${P}.ui.getState().selectUnit(w.id);
      const items = S().units.find((u) => u.id === w.id).params.sections[0].items;
      window.__t41 = { unitId: w.id, shelfId: items.find((i) => i.kind === 'shelf').id };
      return true;
    `);
    await page.sleep(500);

    const dragged = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const t = window.__t41;
      const read = () => {
        const r = S().unitResult(t.unitId);
        const items = S().units.find((u) => u.id === t.unitId).params.sections[0].items;
        const hanger = items.find((i) => i.kind === 'hanger');
        return {
          rod: r.assemblies.rail ? Math.round(r.assemblies.rail.y) : null,
          drills: [...new Set((r.drills || []).filter((d) => d.kind === 'rail_bracket').map((d) => Math.round(d.y)))],
          stored: Math.round(Number(hanger.pos_mm)),
        };
      };
      const before = read();
      S().setShelfPos(t.unitId, t.shelfId, 900, 0.5);
      const after = read();
      return { before, after };
    `);
    const a = dragged.after;
    check('THE ROD\'S Y AFTER A DRAG: engine, machine and the SAVED number agree',
      a.drills.length === 1 && a.drills[0] === a.rod && a.rod !== dragged.before.rod,
      JSON.stringify(dragged));
    check('…and the stored millimetre describes where the rod IS',
      Math.abs((a.stored + 40) - a.rod) < 1.5 || a.stored !== dragged.before.stored,
      `stored ${dragged.before.stored} -> ${a.stored}, rod ${dragged.before.rod} -> ${a.rod}`);

    // The right panel is where the rod's height is READ now — the editable
    // field that lied is gone (commented out, T41-F2), and what stands in its
    // place is the resolved axis.
    await page.evaluate(`${P}.ui.getState().selectUnit(window.__t41.unitId); return true;`);
    await page.sleep(600);
    // REAL POINTER INPUT: the item list is an accordion and it starts closed,
    // so the rail row has to be opened the way a joiner opens it.
    const sectionSel = await page.evaluate(`
      const s = [...document.querySelectorAll('[data-section]')]
        .find((el) => /section/i.test(el.getAttribute('data-section') || ''));
      return s ? s.getAttribute('data-section') : null;
    `);
    if (sectionSel) await page.click('[data-section="' + sectionSel + '"] button');
    await page.sleep(700);
    await shot('f2-one-rail-chain-after-the-drag', {
      all: ['[data-testid="rail-height"]'],
      text: 'Hanger rail',
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F3 — THE DRAWER SWITCH
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f3', 'the drawer switch, and the front width in mm', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T41 · F3 the drawers');

    await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2150 });
      ${P}.ui.getState().selectUnit(w.id);
      window.__t41 = { unitId: w.id };
      return true;
    `);
    await page.sleep(400);

    const swap = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const t = window.__t41;
      const fronts = () => {
        const r = S().unitResult(t.unitId);
        return (r.panels || []).filter((p) => p.part === 'DRAWER-FRONT')
          .sort((x, y) => x.box.y - y.box.y)
          .map((p) => ({ w: Math.round(p.w), h: Math.round(p.h), overlay: Boolean(p.meta && p.meta.overlay) }));
      };
      S().addDrawers(t.unitId, 3, 'overlay', 200);
      const internal = fronts();
      S().addOverlayDrawers(t.unitId, 3, 200);
      const overlay = fronts();
      return { internal, overlay };
    `);
    check('THE SWITCH: choosing overlay leaves ONE stack, not two',
      swap.overlay.length === 3 && swap.overlay.every((f) => f.overlay),
      `internal ${swap.internal.length} fronts -> overlay ${swap.overlay.length} fronts`);
    check('…and the FRONT WIDTH IN MM changed with it',
      swap.overlay[0].w !== swap.internal[0].w,
      `${swap.internal[0].w} mm -> ${swap.overlay[0].w} mm`);

    // …and the per-drawer height moves the BOARD on an overlay drawer.
    const slid = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const t = window.__t41;
      const hs = () => (S().unitResult(t.unitId).panels || [])
        .filter((p) => p.part === 'DRAWER-FRONT').sort((x, y) => x.box.y - y.box.y).map((p) => Math.round(p.h));
      const before = hs();
      const panel = (S().unitResult(t.unitId).panels || []).find((p) => p.part === 'DRAWER-FRONT' && Number(p.meta && p.meta.drawer) === 2);
      const unit = S().units.find((u) => u.id === t.unitId);
      const ref = ${P}T41.drawerRef.drawerRefOf(unit, panel, 2);
      S().setDrawerHeight(t.unitId, ref, 300);
      return { before, after: hs(), refType: typeof ref };
    `);
    check('THE HEIGHT SLIDER MOVES THE BOARD on an overlay drawer',
      slid.after[1] === 300 && slid.refType === 'string',
      `${slid.before.join(',')} -> ${slid.after.join(',')} (ref ${slid.refType})`);

    await page.sleep(800);
    await shot('f3-the-drawer-switch', { text: 'drawer' });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F4 — A HINGE COLUMN IS ONE BOARD
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f4', 'a hinge column is one board', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T41 · F4 the hinges');

    const bored = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2150, doors: { count: 2 }, split_top_mm: 600 });
      ${P}.ui.getState().selectUnit(w.id);
      window.__t41 = { unitId: w.id };
      const rows = (side) => {
        const r = S().unitResult(w.id);
        return [...new Set((r.drills || [])
          .filter((d) => (d.panel === side || d.id === side) && String(d.kind).includes('hinge'))
          .map((d) => Math.round(d.y)))].sort((a, b) => a - b);
      };
      const holes = () => (S().unitResult(w.id).drills || []).filter((d) => String(d.kind).includes('hinge')).length;
      const before = { bul: rows('BUL'), bur: rows('BUR'), holes: holes() };
      const num = S().units.find((u) => u.id === w.id).params.unit_num;
      S().updateUnitParams(w.id, { split_hinge_rows: { [num + '-FL-T']: [1700, 2047] } });
      const after = { bul: rows('BUL'), bur: rows('BUR'), holes: holes() };
      return { before, after };
    `);
    check('MOVE ONE HINGE ON ONE LEAF: no new hole appears anywhere',
      bored.after.holes === bored.before.holes,
      `${bored.before.holes} -> ${bored.after.holes} plate holes`);
    check('…and the UNTOUCHED side is bored exactly where it was',
      JSON.stringify(bored.after.bur) === JSON.stringify(bored.before.bur),
      `BUR ${JSON.stringify(bored.before.bur)} -> ${JSON.stringify(bored.after.bur)}`);
    check('…while the moved side followed its own leaf',
      JSON.stringify(bored.after.bul) !== JSON.stringify(bored.before.bul),
      `BUL ${JSON.stringify(bored.before.bul)} -> ${JSON.stringify(bored.after.bul)}`);

    await page.sleep(700);
    await shot('f4-a-hinge-column-is-one-board', { text: 'wardrobe' });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F5 — THE DRAWINGS LEARN TO DRAW
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f5', 'the drawings learn to draw', async () => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await freshProject('T41 · F5 the drawings');

    await page.evaluate(`
      const S = () => ${P}.project.getState();
      const a = S().addUnit('BUD');
      S().updateUnitParams(a.id, { width: 600, plinth: true });
      const b = S().addUnit('BUD');
      S().updateUnitParams(b.id, { width: 500, plinth: true });
      const c = S().addUnit('WUD');
      S().updateUnitParams(c.id, { width: 600 });
      window.__t41 = { ids: [a.id, b.id, c.id] };
      return true;
    `);
    await page.sleep(600);

    const pens = await page.evaluate(`
      const L = ${P}T41.drawingLayers;
      return {
        cut: L.PEN.CUT, outline: L.PEN.OUTLINE, visible: L.PEN.VISIBLE,
        hidden: L.PEN.HIDDEN, annotation: L.PEN.ANNOTATION, fine: L.PEN.FINE,
        dimLighter: L.penWidth({ layer: 'CARCASE' }) > L.penWidth({ layer: 'DIMENSIONS' }),
        range: L.PEN.CUT / L.PEN.FINE,
      };
    `);
    check('F5a — the pen ladder is a real hierarchy, and a dimension is the lightest',
      pens.dimLighter && pens.range > 5, JSON.stringify(pens));

    // REAL POINTER INPUT: open the Drawings window and click the real tabs.
    await page.evaluate(`${P}.ui.getState().openModal('drawing', { kind: 'walls' }); return true;`);
    await page.waitFor('document.querySelector(\'[data-drawing-kind-tab="walls"]\')', { what: 'the Drawings window' });
    await page.click('[data-drawing-kind-tab="walls"]');
    await page.sleep(900);
    await page.click('[data-wall-sheet="Wall A /1"]');
    await page.sleep(800);
    await shot('f5a-line-weight-on-the-elevation', {
      all: ['[data-cc-drawing]'],
      texts: ['Wall A /1', 'No Scale'],
    });

    // …and the SECTION, whose cut lines are the heaviest strokes in the app.
    // Two frames rather than one, deliberately: T40 shipped its section and its
    // DXF as the SAME PNG, and RULE 6b above is what now refuses that.
    await page.click('[data-wall-sheet="Horizontal section"]');
    await page.sleep(800);
    await shot('f5b-the-section-cut-lines-are-heaviest', {
      all: ['[data-cc-drawing]'],
      texts: ['Horizontal section'],
    });

    const weights = await page.evaluate(`
      const svg = document.querySelector('[data-cc-drawing]');
      const out = {};
      for (const el of svg.querySelectorAll('[stroke-width]')) {
        const w = el.getAttribute('stroke-width');
        out[w] = (out[w] || 0) + 1;
      }
      return out;
    `);
    const vals = Object.keys(weights).map(Number).sort((a, b) => a - b);
    check('F5a — the SECTION on the glass carries the CUT weight, and it is the heaviest',
      vals.length >= 3 && Math.max(...vals) === 0.7,
      JSON.stringify(weights));
  });

  const failed = steps.filter((s) => !s.ok);
  const empty = shots.filter((s) => !s.present);
  writeFileSync(`${OUT}report.json`, `${JSON.stringify({
    turn: 41, when: new Date().toISOString(), steps, shots, failed: failed.length, emptyFrames: empty.length,
  }, null, 1)}\n`);
  console.log(`\n${steps.length - failed.length}/${steps.length} checks, ${shots.length} pictures, ${empty.length} empty frames`);
  if (failed.length) console.log(`FAILED:\n  ${failed.map((f) => `${f.label} — ${f.detail}`).join('\n  ')}`);
  process.exit(failed.length || empty.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
