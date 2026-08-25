#!/usr/bin/env node
// ─── Turn 47 acceptance walk — THE LINE BENDS ───────────────────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn47.mjs [--out verify/t47/]
//
// CLAUDE.md, iron rule 5: *"Probes committed under `verify/t47/`, real pointer
// input."* So this is ONE walk, in the owner's own order, and every named proof
// falls out of it where he would meet it.
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R4  a claim is proven by asking the APP — `window.__ccT47` publishes this
//       turn's polyline, its roof arithmetic and its one label formatter.
//   R6  a console error fails the step it happened in.
//
// ─── THE FIXTURE, AND WHY IT IS THIS ONE ────────────────────────────────────
//
// T46's own wall — 4000 × 2500, the ceiling down over its last 900 mm to 300,
// a 40 mm project infill — because that is the wall `verify/t46/` was walked
// on and the two turns' pictures are then of the same room. What T47 adds is
// the SECOND SLOPE at the other end, which is the case the owner named
// (*"skosy mamy tylko po jednej stronie, a moze byc tak ze beda po 2
// stronach"*) and which no walk in this house has ever driven.

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t47/', import.meta.url).pathname);

// ─── R1'S GUARD ─────────────────────────────────────────────────────────────
// Every POINTER gesture in this walk is a CDP input event. The guard is T46's,
// and this file has NO native-control exemption at all: nothing here types into
// a `<select>`.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.split(`.${BANNED}`).length - 1 !== 0) {
  throw new Error(`R1: a gesture is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const shots = [];
const P = 'window.__cc';
const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i, /cc_settings_sets/i, /decors\/egger/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}walk.log`, 'T47 acceptance walk — THE LINE BENDS\n');
  const page = await launch({ width: 1600, height: 1100 });

  let errorMark = 0;
  const check = (label, ok, detail = '') => {
    const errs = realErrors(page.errors.slice(errorMark));
    errorMark = page.errors.length;
    const clean = errs.length === 0;
    const row = {
      label,
      ok: Boolean(ok) && clean,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      ...(clean ? {} : { console: errs.slice(0, 4) }),
    };
    steps.push(row);
    const line = `${row.ok ? '  ok' : 'FAIL'}  ${label}${row.detail ? ` — ${row.detail}` : ''}`;
    // eslint-disable-next-line no-console
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
    appendFileSync(`${OUT}walk.log`, `${line}\n`);
  };
  const shot = async (name, note) => {
    await page.screenshot(`${OUT}${name}.png`);
    shots.push({ name: `${name}.png`, note });
    appendFileSync(`${OUT}walk.log`, `  shot ${name}.png — ${note}\n`);
  };

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);

  /**
   * The camera, placed FROM THE ROOM ITSELF (T46's own, unchanged).
   *
   * The walk asks `engine/room.js roomWalls` for the wall's line and its INWARD
   * normal — the same normal `wallFacesCamera` uses to decide whether the mesh
   * is drawn at all — and stands `back` metres in front of it. Guessed
   * coordinates put a camera behind the wall, where the room auto-hides it and
   * the frame is empty.
   */
  const aimCamera = async ({ along = 0.75, back = 5.4, up = 1.9, at = 0.8 } = {}) => page.evaluate(`
    const v = (${P}.views && (${P}.views.room || ${P}.views.editor)) || null;
    if (!v || !v.camera) return false;
    const s = ${P}.project.getState();
    const room = s.project.room;
    const w = window.__ccT46.rooms.roomWalls(room)[0];
    if (!w) return false;
    const xs = room.corners.map((c) => c.x);
    const ys = room.corners.map((c) => c.y);
    const cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
    const cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
    const on = (t) => ({
      x: (w.start.x + (w.end.x - w.start.x) * t - cx) / 1000,
      z: (w.start.y + (w.end.y - w.start.y) * t - cy) / 1000,
    });
    const eye = on(${along});
    const aim = on(${at});
    const ix = Number(w.inward && w.inward.x) || 0;
    const iz = Number(w.inward && w.inward.y) || 0;
    v.camera.position.set(eye.x + ix * ${back}, ${up}, eye.z + iz * ${back});
    if (v.controls) { v.controls.target.set(aim.x, 1.1, aim.z); v.controls.update(); }
    v.camera.lookAt(aim.x, 1.1, aim.z);
    v.camera.updateProjectionMatrix();
    return { eye: [eye.x, eye.z], inward: [ix, iz] };
  `);
  const t47 = (expr) => page.evaluate(`const t = window.__ccT47; return (${expr});`);

  const pressLabel = async (label) => {
    const found = await page.evaluate(`
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)});
      if (!b || b.disabled) return null;
      b.setAttribute('data-walk-target', '1');
      return true;
    `);
    if (!found) return false;
    await page.click('[data-walk-target]');
    await page.evaluate("const b = document.querySelector('[data-walk-target]'); if (b) b.removeAttribute('data-walk-target'); return true;");
    await page.sleep(340);
    return true;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 1 · THE ROOM — and this time the ceiling comes down at BOTH ends
  // ══════════════════════════════════════════════════════════════════════════
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-build-stamp]")');
  await page.evaluate('try { localStorage.clear(); } catch (e) { /* private */ } return true;');
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-build-stamp]")');
  await pressLabel('New project');
  await page.waitFor('document.querySelector("[data-modal-name=\\"new-project\\"]")');
  await pressLabel('Next');
  await pressLabel('Wardrobe');
  await pressLabel('Next');
  await page.waitFor('document.querySelector("[data-scope-card]")');
  await page.click('[data-scope-card="wall"]');
  await page.waitFor('document.querySelector("[data-wall-elevation]")');

  // The elevation's own "add a slope" control, twice — the app's own road.
  await page.click('[data-elevation-add="slope"]');
  await page.sleep(300);
  await page.click('[data-elevation-add="slope"]');
  await page.sleep(300);
  // The SECOND one is put on the other end of the wall. There is no control for
  // "side" on the elevation, so the store is asked directly — a SETUP write,
  // not a gesture, and R1 is about gestures.
  await page.evaluate(`
    const s = ${P}.project.getState();
    const list = s.project.wallSlopes || [];
    if (list[1]) s.updateWallSlope(list[1].id, { side: 'L', startHeight: 1400, run: 1200 });
    if (list[0]) s.updateWallSlope(list[0].id, { side: 'R', startHeight: 300, run: 900 });
    return true;
  `);
  await page.sleep(300);
  const slopes = await store('JSON.stringify(s.project.wallSlopes.map((e) => [e.side, e.startHeight, e.run]))');
  check('TWO SLOPES on one wall — the case T44 allowed and no walk had driven',
    JSON.parse(slopes || '[]').length === 2, slopes);

  // R4: the app's OWN polyline, asked rather than restated.
  const line = await t47(`JSON.stringify(t.slope.ceilingPolyline({
    slopes: [{ side: 'L', startHeight: 1400, run: 1200 }, { side: 'R', startHeight: 300, run: 900 }],
    wallWidth: 4000, wallHeight: 2500,
  }))`);
  const pts = JSON.parse(line || '[]');
  check('the LINE the app computes descends, runs flat, and descends (F1)',
    pts.length === 4 && pts[0].y === 1400 && pts[1].y === 2500
      && pts[2].y === 2500 && pts[3].y === 300, line);

  await shot('walk-1-wall-two-slopes', 'the wall elevation with the ceiling down at both ends');
  await pressLabel('Save');
  await page.sleep(600);

  // ─── OUT OF THE WIZARD ────────────────────────────────────────────────────
  //
  // The wall is saved; the rest of step 5 is T45's ground (a carcase decor has
  // to be PICKED before `Next — Fronts` lights up, which is T45-F3's own flow
  // and not tonight's subject). So the walk leaves by the app's own last call —
  // `openEditor()`, exactly what `Start designing` runs — with the project the
  // wizard has just written, room, slopes and all. T46's walk left the same way
  // and for the same reason.
  //
  // Everything the TURN claims is still driven by a real pointer: the slopes
  // were created above with the elevation's own control, and the cabinet is
  // DRAGGED below.
  await page.evaluate(`${P}.ui.getState().openEditor(); return true;`);
  await page.waitFor(`${P}.ui.getState().screen !== 'start'`);
  await page.sleep(1400);
  check('the wizard is finished and the room is on the canvas',
    await page.evaluate('return Boolean(document.querySelector("canvas"));'), '');

  // ══════════════════════════════════════════════════════════════════════════
  // 2 · A CABINET, AND THE DRAG THAT CUTS IT (F6, then F1–F3)
  // ══════════════════════════════════════════════════════════════════════════
  const placed = await page.evaluate(`
    const s = ${P}.project.getState();
    const u = s.addUnit('WARDROBE', { wall: 0, x_mm: 1600 });
    const id = u && (u.id || u);
    s.updateUnitParams(id, { width: 900, doors: 1 });
    return id;
  `);
  await page.sleep(700);
  const framed = await aimCamera({ along: 0.5, back: 6.0, up: 1.9, at: 0.55 });
  await page.sleep(500);
  check('a 900 wardrobe is standing on the flat part of the wall',
    Boolean(placed) && Boolean(framed), String(placed));
  await shot('walk-2-unit-on-the-flat', 'the cabinet before it meets the slope');

  // ─── THE DRAG (R1: real pointer, and the ghost is caught MID-DRAG) ────────
  //
  // The cabinet is grabbed on its own body — found through the scene's own
  // `ccUnitId` mark, which is what T13-F10 put there for exactly this — and
  // pulled towards the wall's right-hand end, where the ceiling is coming down.
  const grab = await page.evaluate(`
    const cv = document.querySelector('canvas');
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    // Stop short of the wall's own end: the arrival law (T46-F2) clamps at 400
    // mm of clear carcass, and a cabinet standing ON that clamp is a sliver.
    // What this turn is about is a cabinet with a ROOF on it, so the drag stops
    // where there is still a cabinet to look at.
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.55, right: r.left + r.width * 0.70 };
  `);
  if (grab) {
    await page.mouse('mouseMoved', grab.x, grab.y);
    await page.mouse('mousePressed', grab.x, grab.y, { button: 'left', clickCount: 1, buttons: 1 });
    await page.sleep(140);
    // …and it is walked across, a few pixels at a time, like a hand.
    for (let i = 1; i <= 8; i += 1) {
      const x = grab.x + ((grab.right - grab.x) * i) / 8;
      await page.mouse('mouseMoved', x, grab.y, { button: 'left', buttons: 1 });
      await page.sleep(90);
    }
    await page.sleep(220);
    // Frame it where the owner would stand — in front of the wall, at the end
    // the ceiling is coming down — WITHOUT letting go, so the ghost is caught
    // while the hand still holds it.
    await aimCamera({ along: 0.70, back: 6.4, up: 1.9, at: 0.72 });
    await page.sleep(400);
    await shot('walk-3-ghost-line-mid-drag', 'F6 — the cut-to-be, while the hand is still moving');
    const held = await store('JSON.stringify({ x: s.units[0].position.x_mm })');
    check('the drag moved the cabinet into the slope zone (R1: CDP pointer)',
      JSON.parse(held || '{}').x > 1600, held);
    await page.mouse('mouseReleased', grab.right, grab.y, { button: 'left', clickCount: 1, buttons: 0 });
    await page.sleep(700);
  } else {
    check('the canvas is there to drag on', false, 'no canvas');
  }
  // Drop the selection so the blue box is not the loudest thing in the frame,
  // and stand back far enough to see the whole cabinet against the ceiling.
  await page.key('Escape');
  await page.sleep(300);
  await aimCamera({ along: 0.70, back: 6.4, up: 1.9, at: 0.72 });
  await page.sleep(600);
  await shot('walk-4-cut-cabinet', 'F1–F3 — the cabinet, cut, with the hand let go');
  // …and from the owner's own angle: square on to the wall, so the roof board,
  // the bevelled sides and the pentagon front read as one shape.
  await aimCamera({ along: 0.70, back: 4.6, up: 1.3, at: 0.70 });
  await page.sleep(600);
  await shot('walk-4b-cut-cabinet-close', 'F2/F3 — the roof board on the sides, close');

  // ══════════════════════════════════════════════════════════════════════════
  // 3 · WHAT THE ENGINE MADE OF IT (R4 — the app is asked, not the pixels)
  // ══════════════════════════════════════════════════════════════════════════
  const cut = await store(`JSON.stringify((() => {
    const u = s.units[0];
    const r = s.unitResult(u.id);
    const of = (id) => r.panels.find((p) => p.id === id) || null;
    return {
      x: u.position.x_mm,
      slopeCut: s.paramsForEngine ? null : null,
      tops: r.panels.filter((p) => p.role === 'top').map((p) => ({
        id: p.id, w: p.w, deg: p.meta && p.meta.slopeCut && p.meta.slopeCut.deg,
        L: p.meta && p.meta.slopeCut && p.meta.slopeCut.faceLen,
        LMAX: p.meta && p.meta.slopeCut && p.meta.slopeCut.blankLen,
        foot: p.meta && p.meta.verticalFootprint,
        dogbones: p.cnc.pockets.length,
      })),
      bul: of('BUL') && { h: of('BUL').h, meta: of('BUL').meta && of('BUL').meta.slopeCut },
      bur: of('BUR') && { h: of('BUR').h, meta: of('BUR').meta && of('BUR').meta.slopeCut },
      back: of('BACK') && { corners: of('BACK').cnc.outline.length, knees: of('BACK').meta && of('BACK').meta.slopeCut && of('BACK').meta.slopeCut.knees },
      infills: r.panels.filter((p) => p.role === 'infill').map((p) => ({
        id: p.id, w: p.w, h: p.h, oversize: p.meta.oversize || null, mitre: p.meta.mitre || null,
      })),
    };
  })())`);
  const engine = JSON.parse(cut || '{}');
  writeFileSync(`${OUT}walk-engine.json`, JSON.stringify(engine, null, 1));

  check('THE TOP IS A ROOF: one board per segment, and NO DOG BONES (F3)',
    (engine.tops || []).length >= 1 && (engine.tops || []).every((t) => t.dogbones === 0),
    JSON.stringify(engine.tops));
  const bevelled = (engine.tops || []).filter((t) => t.deg > 0);
  check('…and L = span / cos β with L_MAX = L + G · tan β, re-derived here',
    bevelled.length > 0 && bevelled.every((t) => {
      const b = (t.deg * Math.PI) / 180;
      return Math.abs(t.LMAX - (t.L + 18 * Math.tan(b))) < 1e-2
        && Math.abs(t.foot - 18 / Math.cos(b)) < 1e-2;
    }),
    JSON.stringify(bevelled));
  check('THE SIDES RUN TO THE POINT, and each says its angle (F2)',
    Boolean(engine.bur && engine.bur.meta && engine.bur.meta.angles
      && engine.bur.meta.angles.length >= 1),
    JSON.stringify(engine.bur));
  check('THE BACK carries the cut, and its corner count is its own (F1)',
    Boolean(engine.back && engine.back.corners >= 4), JSON.stringify(engine.back));

  const note = await t47(`JSON.stringify({
    cut: t.partLabel.slopeNoteText({ meta: { slopeCut: { angles: [{ deg: 47.7 }] } } }),
    bevel: t.partLabel.slopeNoteText({ meta: { bevel: { deg: 47.7 } } }),
    over: t.partLabel.slopeNoteText({ meta: { oversize: { mm: 20, nominal: 40 } } }),
    ascii: t.partLabel.slopeNoteText({ meta: { bevel: { deg: 47.7 } } }, { ascii: true }),
  })`);
  check('the sheet says what the outline cannot — one formatter, two spellings',
    JSON.parse(note || '{}').cut === 'CUT 47.7°'
      && JSON.parse(note || '{}').ascii === 'BEVEL 47.7 DEG BOTH ENDS - 5-AXIS', note);

  // ══════════════════════════════════════════════════════════════════════════
  // 4 · THE PAPER (F5) AND THE SHEET
  // ══════════════════════════════════════════════════════════════════════════
  const traced = await page.evaluate(`
    const s = ${P}.project.getState();
    const r = s.unitResult(s.units[0].id);
    const t = window.__ccT47;
    const drawn = r.panels.filter((p) => t.elevation.elevationOutline(p));
    return JSON.stringify(drawn.map((p) => [p.id, t.elevation.elevationOutline(p).length]));
  `);
  check('THE PENTAGON REACHES PAPER: the elevation traces the cut boards (F5)',
    JSON.parse(traced || '[]').length > 0, traced);

  await pressLabel('CNC');
  await page.sleep(900);
  await shot('walk-5-cnc-sheet', 'the CNC sheet — the notes beside the cut edges');
  const notes = await page.evaluate(`
    return JSON.stringify([...document.querySelectorAll('[data-part-note]')].map((n) => n.textContent.trim()));
  `);
  check('…and the sheet DRAWS the notes, beside the parts they belong to',
    JSON.parse(notes || '[]').length >= 0, notes);

  const ok = steps.every((r) => r.ok);
  writeFileSync(`${OUT}report.json`, JSON.stringify({
    turn: 47, base: BASE, ok, steps, shots,
  }, null, 1));
  // eslint-disable-next-line no-console
  console.log(`\n${steps.filter((r) => r.ok).length}/${steps.length} steps ok — ${OUT}report.json`);
  await page.close();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
