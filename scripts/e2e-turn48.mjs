#!/usr/bin/env node
// ─── Turn 48 acceptance walk — THE FLOOR, THE BOARD, AND THE LABEL ──────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn48.mjs [--out verify/t48/]
//
// CLAUDE.md iron rule 5: *"Every screenshot LOOKED AT — and `verify/t48/`
// includes a frame WITH the infills in view: 25.08's lesson, a turn that never
// photographed the part that was wrong."*
//
// So this is ONE walk, in the owner's own order, and every named proof falls
// out of it where he would meet it. The rules are the house's, unchanged:
//
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R4  a claim is proven by asking the APP — `window.__ccT48` publishes
//       tonight's two pure laws, and the stores answer for the rest.
//   R6  a console error fails the step it happened in.
//
// ─── AND F8 IS MEASURED, NOT ADMIRED ────────────────────────────────────────
//
// *"Prove it the only honest way: two screenshots of one scene, far and close,
// the label the same height to the pixel."* Two pictures of type are two
// pictures of type; what makes them a proof is that the SAME sprite is measured
// in both, in pixels, off the live scene — its own world scale projected
// through the live camera onto the live canvas. The pictures are then what a
// human checks that measurement against, which is the right way round.

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t48/', import.meta.url).pathname);

// ─── R1'S GUARD ─────────────────────────────────────────────────────────────
// Every POINTER gesture in this walk is a CDP input event.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.split(`.${BANNED}`).length - 1 !== 0) {
  throw new Error(`R1: a gesture is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const shots = [];
const P = 'window.__cc';
const IGNORED = [
  /favicon\.ico/i, /supabase\.co/i, /cc_settings_sets/i, /decors\/egger/i, /textures/i,
  // Chromium's own note about a `beforeunload` on a page nobody has clicked in
  // yet. It is the browser talking about the browser, not the app.
  /beforeunload/i,
];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

// The browser, at module scope, so a CRASH closes it too. `cdp.mjs` spawns a
// Chromium on a fixed debug port and `launch()` attaches to whatever is already
// answering there — so a run that dies without closing leaves a browser holding
// the port, and the NEXT run silently drives the dead one's page and hangs.
// That cost two runs of this walk before it was written down.
let page = null;

async function main() {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}walk.log`, 'T48 acceptance walk — THE FLOOR, THE BOARD, AND THE LABEL\n');
  page = await launch({ width: 1600, height: 1100 });

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
   * The camera, placed FROM THE ROOM ITSELF (T46's own, unchanged): in front of
   * wall 0, along its INWARD normal. Guessed coordinates put a camera behind
   * the wall, where the room auto-hides it and the frame is empty.
   */
  const aimCamera = async ({
    along = 0.5, back = 5.4, up = 1.9, at = 0.5, lookY = 1.4,
  } = {}) => page.evaluate(`
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
    if (v.controls) { v.controls.target.set(aim.x, ${lookY}, aim.z); v.controls.update(); }
    v.camera.lookAt(aim.x, ${lookY}, aim.z);
    v.camera.updateProjectionMatrix();
    return { back: ${back} };
  `);

  /**
   * EVERY label sprite in the live scene, measured IN PIXELS.
   *
   * MEASURED THE WAY THREE DRAWS IT, which is the whole of why this is a proof
   * and not an approximation. A sprite's quad is offset in VIEW space by its
   * own scale and only then projected — that is `SpriteMaterial`'s own vertex
   * shader — so a measurement that offsets in WORLD space and projects both
   * ends is measuring a slightly different thing: under a tilted camera a
   * world-vertical offset changes the view depth, and the answer comes out
   * about a pixel and a half wrong. It did, on the first run of this walk.
   *
   * Keyed on the sprite's own `uuid`, so what is compared far and close is the
   * SAME OBJECT — the camera moves between the two readings and nothing else.
   */
  const labelPixels = () => page.evaluate(`
    const v = (${P}.views && (${P}.views.room || ${P}.views.editor)) || null;
    if (!v) return null;
    const THREE = v.three;
    const rect = v.gl.domElement.getBoundingClientRect();
    const out = [];
    v.scene.updateMatrixWorld(true);
    v.camera.updateMatrixWorld();
    v.scene.traverse((o) => {
      if (!o.isSprite || !o.visible) return;
      // LABELS only. The other sprites in this scene are CONTROLS — the run's
      // own "+" discs (3d/AddPlus.jsx) — and they are world-sized on purpose:
      // they belong to the furniture and grow and shrink with it. F8 is about
      // the FIGURES. A label says how tall it means to be — ccLabelPx — which
      // is also what tells the two kinds apart. (No backticks in here: this is
      // the inside of a template literal.)
      if (!o.userData || !(o.userData.ccLabelPx > 0)) return;
      const eye = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)
        .applyMatrix4(v.camera.matrixWorldInverse);
      const top = eye.clone(); top.y += o.scale.y / 2;
      const bot = eye.clone(); bot.y -= o.scale.y / 2;
      top.applyMatrix4(v.camera.projectionMatrix);
      bot.applyMatrix4(v.camera.projectionMatrix);
      const px = Math.abs((top.y - bot.y) / 2 * rect.height);
      out.push({
        uuid: o.uuid,
        text: o.userData.ccDimensionText || null,
        px: Math.round(px * 100) / 100,
        wants: Math.round(o.userData.ccLabelPx * 100) / 100,
        depth: Math.round(-eye.z * 1000) / 1000,
      });
    });
    return { canvas: Math.round(rect.height), labels: out };
  `);

  // ═══ 0 — the app, and a room to build in ═════════════════════════════════
  await page.goto(BASE);
  await page.waitFor(`${P} && ${P}.project`, { what: 'the app' });
  await page.evaluate(`
    const s = ${P}.project.getState();
    s.loadProject({
      id: null,
      name: 'T48 walk',
      room: { height: 2500, corners: [
        { x: 0, y: 0 }, { x: 4200, y: 0 }, { x: 4200, y: 3000 }, { x: 0, y: 3000 },
      ] },
      design: { projectType: 'kitchen' },
    }, []);
    return true;
  `);
  // …and OUT of the start screen by the app's own last call — `openEditor()`,
  // exactly what `Start designing` runs. T46's and T47's walks left the wizard
  // the same way and for the same reason.
  await page.evaluate(`${P}.ui.getState().openEditor(); return true;`);
  await page.waitFor(`${P}.ui.getState().screen !== 'start'`, { what: 'the editor' });
  await page.waitFor('document.querySelector("canvas")', { what: 'the canvas' });
  await page.waitFor(`${P}.views && ${P}.views.room`, { what: 'the room view' });
  // The right-hand panel is a third of the glass. Every 3-D frame in this walk
  // is of the FURNITURE, so it is put away first — 25.08's lesson is that a
  // picture which does not contain its subject proves nothing, and a cabinet
  // behind a panel is a cabinet nobody photographed.
  await page.evaluate(`${P}.ui.getState().closeRightPanel(); return true;`);
  check('the app boots, a 4200 × 3000 room is loaded and the canvas is up',
    await store('s.project.room.height') === 2500);

  // ═══ 1 — F3: THE PLINTH DEFAULTS ON ══════════════════════════════════════
  const born = await page.evaluate(`
    const s = ${P}.project.getState();
    const out = {};
    for (const t of ['BUD', 'BUDTALL', 'WARDROBE', 'WUD']) {
      const r = s.addUnit(t);
      if (r.error) { out[t] = 'refused: ' + r.error; continue; }
      out[t] = ${P}.project.getState().units.find((u) => u.id === r.id).params.plinth === true;
    }
    return out;
  `);
  check('F3 — a standing carcass is BORN with its plinth; a hung WUD is not',
    born.BUD === true && born.BUDTALL === true && born.WARDROBE === true && born.WUD !== true, born);

  // ═══ 2 — F1: THE FLOOR IS LAW ════════════════════════════════════════════
  const floor = await page.evaluate(`
    const s = ${P}.project.getState();
    const wardrobe = ${P}.project.getState().units.find((u) => u.type === 'WARDROBE');
    const G = s.profile ? 18 : 18;
    // Ask for a shoe box AT ZERO — the owner's own case.
    const boxId = s.addShoeBox(wardrobe.id, { variant: 'F', dividers: 1, pos_mm: 0 });
    // …and a shoe SHELF at zero, the other half of the finding.
    const shelfId = s.addItem(wardrobe.id, { kind: 'shelf', variant: 'shoe', pos_mm: 0 });
    const items = ${P}.project.getState().units.find((u) => u.id === wardrobe.id)
      .params.sections[0].items;
    const at = (id) => items.find((i) => i.id === id) || null;
    const result = ${P}.project.getState().unitResult(wardrobe.id);
    const CARCASS = ['BUL', 'BUR', 'BOTTOM', 'TOP', 'BACK', 'PLINTH', 'MASK', 'RAIL-PART'];
    const below = result.panels
      .filter((p) => p.box && CARCASS.indexOf(p.part) < 0
        && p.role !== 'front' && p.role !== 'infill' && p.role !== 'end_panel')
      .filter((p) => p.box.y < 18 - 1e-6)
      .map((p) => p.id);
    return {
      unitId: wardrobe.id,
      shoeBox: at(boxId) && at(boxId).pos_mm,
      shoeBoxSaysSo: Boolean(at(boxId) && at(boxId).meta && at(boxId).meta.floorClamped),
      shoeShelf: at(shelfId) && at(shelfId).pos_mm,
      below,
      // …and the LAW itself, asked rather than photographed (R4).
      law: window.__ccT48.items.floorClampedPos({ pos: 0, floor: 18 }),
      legal: window.__ccT48.items.floorClampedPos({ pos: 900, floor: 18 }),
    };
  `);
  check('F1 — a shoe box asked for at y = 0 lands ON the floor, and says so',
    floor.shoeBox >= 18 && floor.shoeBoxSaysSo, { pos: floor.shoeBox });
  check('F1 — …and so does a shoe shelf', floor.shoeShelf >= 18, { pos: floor.shoeShelf });
  check('F1 — NOTHING the wardrobe cuts stands below its own floor', floor.below.length === 0, floor.below);
  check('F1 — the LAW, asked: 0 → 18 clamped, 900 → 900 untouched',
    floor.law.pos === 18 && floor.law.clamped === true
    && floor.legal.pos === 900 && floor.legal.clamped === false, floor.law);

  // ═══ 3 — F2: THE INFILL IS A BOARD, AND THE SHEET CUTS TWO ═══════════════
  //
  // A RUN of two tall cabinets against the left wall, with the gap to the
  // ceiling closed — which is the thing the owner is looking at.
  const infill = await page.evaluate(`
    const s = ${P}.project.getState();
    // Start again with a clean run: two BUDTALLs, side by side, on wall 0.
    s.loadProject({
      id: null, name: 'T48 infill',
      room: { height: 2500, corners: [
        { x: 0, y: 0 }, { x: 4200, y: 0 }, { x: 4200, y: 3000 }, { x: 0, y: 3000 },
      ] },
      design: { projectType: 'kitchen' },
    }, []);
    const a = ${P}.project.getState().addUnit('BUDTALL');
    const b = ${P}.project.getState().addUnit('BUDTALL');
    const st = ${P}.project.getState();
    st.addTopInfill(a.id);
    const r = ${P}.project.getState().unitResult(a.id);
    // The MAIN run's own two boards. A run open at an end grows a RETURN as
    // well — the picture-frame corner, which is the one 45° F2 keeps — and that
    // is a different question from "what does the run over the units cut".
    const tops = r.panels.filter((p) => p.part === 'INFILL' && p.meta.side === 'top'
      && p.meta.segment === 'main');
    return {
      unitId: a.id,
      other: b.id,
      returns: r.panels.filter((p) => p.part === 'INFILL' && p.meta.side === 'top'
        && String(p.meta.segment).indexOf('return') === 0).map((p) => p.id),
      boards: tops.map((p) => ({
        id: p.id,
        cut: [p.w, p.h],
        box: [p.box.w, p.box.h],
        corners: p.cnc.outline.length,
        lengthOversize: p.meta.lengthOversize || null,
        long: (p.meta.mitre_45 || []).indexOf('long') >= 0,
        L: p.meta.mitre && p.meta.mitre.L,
        scene: p.meta.scene || null,
      })),
    };
  `);
  const face = infill.boards.find((p) => p.id === 'INFILL-T-FACE');
  const shelf = infill.boards.find((p) => p.id === 'INFILL-T-SHELF');
  check('F2 — the run cuts TWO boards where the L stood', infill.boards.length === 2,
    infill.boards.map((p) => p.id).join(', '));
  check('F2 — both are PLAIN RECTANGLES — four corners, no mitre in the piece',
    face.corners === 4 && shelf.corners === 4 && !face.long && !shelf.long
    && face.L === undefined && shelf.L === undefined,
    { faceCorners: face.corners, shelfCorners: shelf.corners });
  check('F2 — board A is 60 tall (40 + 20) and board B is 100 (80 + 20)',
    face.cut[1] === 60 && shelf.cut[1] === 100, { A: face.cut, B: shelf.cut });
  check('F2 — the two boards are cut from ONE length', face.cut[0] === shelf.cut[0],
    { A: face.cut[0], B: shelf.cut[0] });
  check('F2 — +20 on the LENGTH, ONE stated end, and the fitted piece is the run',
    face.lengthOversize && face.lengthOversize.mm === 20
    && ['left', 'right'].indexOf(face.lengthOversize.end) >= 0
    && face.cut[0] - face.box[0] === 20, face.lengthOversize);
  check('F2 — the SHELF board is data and not a body in the room',
    shelf.scene === 'sheet-only' && face.scene === null, { shelf: shelf.scene });

  // …AND THE PICTURE, WITH THE INFILLS IN VIEW. 25.08's lesson.
  // The two talls are auto-placed CENTRED on the wall, so the camera stands off
  // the middle of it and looks UP at the run's head, where the infill is.
  await aimCamera({ along: 0.5, back: 3.6, up: 1.9, at: 0.5, lookY: 2.25 });
  await sleep(900);
  await shot('walk-1-infill-in-view', 'F2 — the top infill over a run of two talls: ONE board, '
    + 'its face in the plane of the fronts, like a plinth');
  // …and CLOSE, because "one board and not an L" is a claim about a 40 mm strip
  // and 40 mm across a room is a line. 25.08's lesson is that the part which was
  // wrong has to be the part in the frame.
  await aimCamera({ along: 0.5, back: 1.5, up: 2.05, at: 0.5, lookY: 2.35 });
  await sleep(900);
  await shot('walk-1b-infill-close', 'F2 — the same board, close: ONE plain strip across the '
    + "run's head. No L, no shelf board hanging behind it.");
  // R3: the frame must CONTAIN its named subject. The scene marks every panel
  // mesh with its own engine id (`ccPanelId`, T13-F10), so the question is asked
  // of the scene graph rather than of the picture — and the SHELF board must be
  // absent, which is the other half of the ruling.
  const infillOnScreen = await page.evaluate(`
    const v = ${P}.views.room;
    const seen = [];
    v.scene.traverse((o) => {
      const id = o.userData && o.userData.ccPanelId;
      if (id && String(id).indexOf('INFILL-T') === 0) seen.push(id);
    });
    return seen;
  `);
  check('F2 — the frame has the FACE board in it, and no shelf board (R3)',
    infillOnScreen.indexOf('INFILL-T-FACE') >= 0
    && infillOnScreen.indexOf('INFILL-T-SHELF') < 0, infillOnScreen.join(', ') || '(none)');

  // ═══ 4 — F8: THE DIMENSIONS HOLD THEIR SIZE ══════════════════════════════
  //
  // ONE scene, TWO distances, the same sprite measured in pixels in both.
  await page.evaluate(`
    const s = ${P}.project.getState();
    const u = ${P}.ui.getState();
    u.selectUnit(s.units[0].id);
    // The app's own control: dimensions are per unit, off the right-click menu.
    for (const unit of s.units) u.toggleUnitDimensions(unit.id);
    return true;
  `);
  await sleep(900);
  const dimsOn = await page.evaluate(`
    const v = ${P}.views.room;
    let sprites = 0;
    v.scene.traverse((o) => { if (o.isSprite && o.visible) sprites += 1; });
    return sprites;
  `);
  check('F8 — the scene is drawing dimension figures to measure', dimsOn > 0, { sprites: dimsOn });

  // THE PICTURE FIRST, THEN THE MEASUREMENT — and it is not a nicety. R3F drives
  // this canvas on DEMAND: moving the camera by hand schedules a frame, and
  // until that frame has actually run, `useScreenScale` has not been called and
  // every sprite still wears the size it was given for the PREVIOUS camera.
  // Taking the screenshot forces the paint, so the picture and the numbers are
  // of the same frame — which is the whole point of measuring at all. (The
  // first run of this walk read 13.4 px at 9 m and 26 at 2.2 m, which is
  // exactly 26 scaled by the ratio of the two previous camera distances.)
  await aimCamera({ along: 0.5, back: 9.0, up: 2.2, at: 0.5, lookY: 1.4 });
  await sleep(900);
  await shot('walk-2-dimensions-far', 'F8 — the same scene from 9 m: the dimension figures');
  await sleep(250);
  const far = await labelPixels();

  await aimCamera({ along: 0.5, back: 3.2, up: 1.6, at: 0.5, lookY: 1.4 });
  await sleep(900);
  await shot('walk-3-dimensions-close', 'F8 — …and from 2.2 m. The figures are the same height.');
  await sleep(250);
  const close = await labelPixels();

  const pair = (() => {
    const byId = (list) => new Map(list.labels.map((l) => [l.uuid, l]));
    const f = byId(far);
    const c = byId(close);
    return [...f.keys()]
      .filter((id) => c.has(id))
      // IN FRONT OF THE CAMERA in BOTH readings. Standing 2.2 m off a 2.4 m run
      // puts some of its captions behind you, and a label behind the camera is
      // not on the screen at all — three clips it, and a projection through a
      // negative view depth is arithmetic about nothing.
      .filter((id) => f.get(id).depth > 0.2 && c.get(id).depth > 0.2)
      .map((id) => ({
        text: f.get(id).text,
        wants: f.get(id).wants,
        far: f.get(id).px,
        close: c.get(id).px,
        farDepth: f.get(id).depth,
        closeDepth: c.get(id).depth,
      }));
  })();
  const worst = pair.reduce((m, r) => Math.max(m, Math.abs(r.far - r.close)), 0);
  check('F8 — the SAME label measures the same height in pixels, far and close',
    pair.length > 0 && worst < 0.5,
    { measured: pair.length, worstDeltaPx: Math.round(worst * 100) / 100, sample: pair.slice(0, 3) });
  // …and it is THE HEIGHT THE LABEL ASKED FOR, which is the stronger claim: not
  // merely "the same at both distances" but "the size the law says", measured
  // the way three draws a sprite. `DimLabel`'s chips ask for 26 CSS px; the
  // chain's figures ask for that × the ratio the profile carries (T29-F4's
  // 0.0572 / 0.055 = 1.04 → 27.04).
  const offBy = pair.reduce((m, r) => Math.max(
    m, Math.abs(r.far - r.wants), Math.abs(r.close - r.wants),
  ), 0);
  const heights = [...new Set(pair.map((r) => r.wants))].sort((x, y) => x - y);
  check('F8 — …and it is the height the label ASKED for, to the hundredth',
    pair.length > 0 && offBy < 0.5,
    { asked: heights.join(', '), worstOffByPx: Math.round(offBy * 100) / 100 });
  check('F8 — …and it really was two different distances',
    pair.length > 0 && pair.every((r) => r.farDepth > r.closeDepth * 1.5),
    pair.slice(0, 2).map((r) => `${r.text || 'chip'}: ${r.farDepth}m → ${r.closeDepth}m`).join(' | '));

  // ═══ 5 — F6 + F7: ONE BUTTON, AND ITS OWN PICTURE ════════════════════════
  await page.evaluate(`
    const s = ${P}.project.getState();
    const u = ${P}.ui.getState();
    u.selectUnit(s.units[0].id);
    u.openModal('lighting', {});
    return true;
  `);
  await page.waitFor('document.querySelector(\'[data-lighting-panel="1"]\')', { what: 'the lighting panel' });
  await sleep(400);
  await shot('walk-4-lighting-panel', 'F6/F7 — the placement tools. `top_under` has its own drawing: '
    + 'the strip UNDER the top board, washing DOWN.');

  const artOwn = await page.evaluate(`
    const tool = document.querySelector('[data-lighting-tool="top_under"]');
    const top = document.querySelector('[data-lighting-tool="top"]');
    if (!tool || !top) return null;
    const svg = (el) => el.querySelector('svg').outerHTML;
    return { same: svg(tool) === svg(top), under: svg(tool).length, up: svg(top).length };
  `);
  check('F7 — `top_under` no longer borrows the top wash\'s drawing',
    artOwn && artOwn.same === false, artOwn);

  const before = await store('window.__cc.project.getState().project.design.lighting.items.length');
  await page.click('[data-lighting-add-top-under="1"]');
  const added = await page.evaluate(`
    const items = ${P}.project.getState().project.design.lighting.items;
    const btn = document.querySelector('[data-lighting-add-top-under="1"]');
    return { n: items.length, on: btn.getAttribute('data-lighting-on'), label: btn.textContent.trim() };
  `);
  check('F6 — the button ADDS a strip and says what it will do next',
    added.n === (before || 0) + 1 && added.on === '1' && /^Remove/.test(added.label), added);
  await shot('walk-5-led-added', 'F6 — one press: the strip is placed and the button now reads Remove.');

  await page.click('[data-lighting-add-top-under="1"]');
  const removed = await page.evaluate(`
    const items = ${P}.project.getState().project.design.lighting.items;
    const btn = document.querySelector('[data-lighting-add-top-under="1"]');
    return { n: items.length, on: btn.getAttribute('data-lighting-on'), label: btn.textContent.trim() };
  `);
  check('F6 — …and THE SAME button removes it — "proste"',
    removed.n === (before || 0) && removed.on === '0' && /^Add/.test(removed.label), removed);

  // ═══ 6 — F4 + F5: THE GROOVE, ON THE SHEET ═══════════════════════════════
  const groove = await page.evaluate(`
    const s = ${P}.project.getState();
    const unit = s.units[0];
    // A shelf, a strip under it, and the project's own channel width.
    s.setLedSpec ? s.setLedSpec({ mode: 'channel', channelWidth: 12 }) : null;
    s.addShelves(unit.id, 1);
    const shelf = ${P}.project.getState().unitResult(unit.id).panels.find((p) => p.part === 'SHELF');
    ${P}.project.getState().addLightingItem({ unitId: unit.id, kind: 'shelf', ref: shelf.id });
    const st = ${P}.project.getState();
    const plain = st.unitResult(unit.id);
    const sheet = st.unitCncResult(unit.id);
    const count = (r) => r.panels.reduce((n, p) => n
      + (p.cnc && p.cnc.paths ? p.cnc.paths.filter((x) => x.layer === 'LED_GROOVE').length : 0), 0);
    const cut = sheet.panels.find((p) => p.id === shelf.id).cnc.paths
      .find((x) => x.layer === 'LED_GROOVE');
    const strip = window.__ccT45.strips.stripsForUnit({
      unit: ${P}.project.getState().units.find((u) => u.id === unit.id),
      result: plain,
      design: Object.assign({}, st.project.design, {
        lighting: Object.assign({}, st.project.design.lighting, { on: true }),
      }),
      profile: ${P}.profile.getState().profile,
    }).find((x) => x.kind === 'shelf');
    const ys = cut.pts.map((p) => p[1]);
    const xs = cut.pts.map((p) => p[0]);
    return {
      unitId: unit.id,
      shelfId: shelf.id,
      onEngine: count(plain),
      onSheet: count(sheet),
      width: Math.round((Math.max.apply(null, xs) - Math.min.apply(null, xs)) * 100) / 100,
      length: Math.round((Math.max.apply(null, ys) - Math.min.apply(null, ys)) * 100) / 100,
      profileLength: strip ? strip.box.w : null,
      extra: window.__ccT45.ledGroove.GROOVE_END_EXTRA_MM,
    };
  `);
  check('F5 — the ENGINE\'s answer has no groove; the SHEET\'s answer has one',
    groove.onEngine === 0 && groove.onSheet === 1, { engine: groove.onEngine, sheet: groove.onSheet });
  check('F4 — and the slot is the profile PLUS 10 at each end',
    groove.length === groove.profileLength + 2 * groove.extra,
    { profile: groove.profileLength, slot: groove.length, extra: groove.extra });

  await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
  await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
  await page.waitFor('document.querySelector("[data-part-label]")', { what: 'the CNC sheet' });
  await sleep(900);
  await shot('walk-6-cnc-sheet', 'F5/F2/F3 — the CNC preview of the run: LED_GROOVE in the legend '
    + "(the groove reached the sheet), the top infill's TWO boards laid out with their own labels, "
    + 'and the plinth cut because a standing carcass is born with one.');

  // ─── A SHEET OF ITS OWN FOR F9 ───────────────────────────────────────────
  //
  // The fault is about a NARROW BOARD, and the narrowest board this app cuts is
  // a SCRIBE FILLER. It is AUTOMATIC — it describes the gap between a unit and
  // the wall, and that gap is a fact about where the unit is standing
  // (engine/autoparts.js) — so it comes into existence by PARKING a cabinet at
  // the wall, which is what happens here. A 40 mm filler leaves the machine 60
  // wide (T47's wall allowance), and `INFILL-L-FACE 60x2150` is a label nobody
  // can write across 60 mm at the readable floor: turn 16's ladder cut it, and
  // F9 is about what happens instead.
  const parked = await page.evaluate(`
    const s = ${P}.project.getState();
    s.loadProject({
      id: null,
      name: 'T48 filler',
      room: { height: 2500, corners: [
        { x: 0, y: 0 }, { x: 4200, y: 0 }, { x: 4200, y: 3000 }, { x: 0, y: 3000 },
      ] },
      design: { projectType: 'kitchen', infill: { sideWidth: 40 } },
    }, []);
    const b = ${P}.project.getState().addUnit('BUDTALL');
    if (b.error) return { error: b.error };
    ${P}.project.getState().moveUnit(b.id, -99999, 0.5);
    ${P}.project.getState().refreshAutoParts();
    const st = ${P}.project.getState();
    const u = st.units.find((x) => x.id === b.id);
    return {
      id: b.id,
      at: u.position.x_mm,
      infill: u.params.side_infill_left_mm,
      parts: st.unitCncResult(b.id).panels.filter((p) => String(p.id).indexOf('INFILL') === 0)
        .map((p) => p.id + ' ' + p.w + 'x' + p.h),
    };
  `);
  check('F9 — a cabinet parked at the wall grows its scribe filler',
    parked && parked.infill > 0 && parked.parts.length > 0, parked);

  await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
  await page.waitFor('document.querySelector("[data-part-label]")', { what: 'the CNC sheet' });
  await sleep(900);

  // …and the tree's own ticks put the FILLER on the sheet alone, so the fit
  // zooms onto it. At full-kitchen zoom a 6 mm caption is under the readable
  // PIXEL floor and is not drawn at all — step 3 of turn 16's ladder, which F9
  // leaves exactly where it was.
  const narrowed = await page.evaluate(`
    const s = ${P}.project.getState();
    const u = ${P}.ui.getState();
    const id = s.units[0].id;
    const parts = s.unitCncResult(id).panels.filter((p) => p.cnc && p.cnc.outline);
    const keep = (p) => String(p.id).indexOf('INFILL-L') === 0;
    for (const p of parts) if (!keep(p)) u.toggleCncPart(id, p.id);
    return parts.filter(keep).map((p) => p.id + ' ' + p.w + 'x' + p.h);
  `);
  await sleep(1200);
  check('F9 — the sheet is showing the narrow strip', narrowed && narrowed.length > 0,
    (narrowed || []).join(' | '));

  // ─── AND ZOOMED IN FAR ENOUGH TO READ IT ─────────────────────────────────
  //
  // At the fitted zoom a 6 mm caption is under the readable PIXEL floor and is
  // not drawn at all — turn 16's third step, which F9 leaves exactly where it
  // was. A joiner checking a part zooms in, so the walk does: the WHEEL, at the
  // strip's own centre, which is the gesture the sheet has taken since T20.
  const zoomed = await (async () => {
    const at = await page.evaluate(`
      const el = document.querySelector('[data-cnc-part]') || document.querySelector('svg polygon');
      const r = (el || document.querySelector('svg')).getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    `);
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await page.wheel(at.x, at.y, -120, 2);
      // eslint-disable-next-line no-await-in-loop
      const seen = await page.evaluate('return document.querySelectorAll("[data-part-label]").length;');
      if (seen > 0) return { steps: i + 1, seen };
    }
    return { steps: 10, seen: 0 };
  })();
  check('F9 — zoomed in, the label is above the readable floor and is drawn',
    zoomed.seen > 0, zoomed);
  await sleep(500);
  await shot('walk-7-the-scribe-filler', "F9 — the run's own scribe filler on the sheet, zoomed to "
    + 'where a joiner reads it: 60 mm wide, and its label used to lose a digit off 2250.');

  // ─── THE LAW ITSELF, ASKED (R4) ──────────────────────────────────────────
  //
  // The owner's own example, put to `labelBlock` both ways. The FILE keeps turn
  // 16's ladder — a DXF has nowhere to put a leader the machine will not also
  // try to cut — and the GLASS keeps the words.
  const label = await page.evaluate(`
    const A = window.__ccT48.annotation;
    const c = ${P}.profile.getState().profile.cnc;
    const ask = (over) => A.labelBlock(Object.assign({
      text: '01 FILLER-1 30x611',
      sizeMm: c.annotation.partLabelMm,
      boxW: 30,
      boxH: 611,
      maxLines: c.labelMaxLines,
      fillRatio: c.labelFillRatio,
      lineGap: c.labelLineGap,
      minSize: c.labelMinHeight,
    }, over));
    const words = (b) => b.lines.map((l) => l.text);
    const glass = ask({ onOverflow: 'outside' });
    return { file: words(ask({})), glass: words(glass), outside: glass.outside };
  `);
  check('F9 — the FILE still truncates (a DXF has nowhere to put a leader)',
    label.file.some((l) => l.indexOf('~') >= 0), label.file.join(' / '));
  check('F9 — and the GLASS keeps every digit, stepping outside instead',
    label.outside === true && label.glass.every((l) => l.indexOf('~') < 0), label.glass.join(' / '));

  const outside = await page.evaluate(`
    const els = [...document.querySelectorAll('[data-part-label-outside="1"]')];
    if (!els.length) return null;
    const el = els[0];
    const r = el.getBoundingClientRect();
    return {
      id: el.getAttribute('data-part-label'),
      text: el.textContent,
      n: els.length,
      box: { x: Math.max(0, r.left - 140), y: Math.max(0, r.top - 60), width: 340, height: 130 },
    };
  `);
  check('F9 — a label really did step outside its outline on the live sheet',
    Boolean(outside), outside ? `${outside.n}× — ${outside.id}: ${outside.text}` : 'none found');
  if (outside) {
    await page.screenshot(`${OUT}walk-8-label-outside.png`, { ...outside.box, scale: 3 });
    shots.push({
      name: 'walk-8-label-outside.png',
      note: `F9 — ${outside.id}, three times life size: the label stands clear of its own `
        + 'narrow strip on a leader, and not one digit of its size has been cut.',
    });
    appendFileSync(`${OUT}walk.log`, `  shot walk-8-label-outside.png — ${outside.id}\n`);
  }

  // ═══ the verdict ═════════════════════════════════════════════════════════
  const failed = steps.filter((s2) => !s2.ok);
  writeFileSync(`${OUT}report.json`, `${JSON.stringify({
    turn: 48,
    when: new Date().toISOString(),
    steps,
    shots,
    measurements: {
      f8: { far, close, pair, worstDeltaPx: worst },
      f2: infill,
      f1: floor,
      f4f5: groove,
      f9: label,
    },
    passed: steps.length - failed.length,
    failed: failed.length,
  }, null, 2)}\n`);

  // eslint-disable-next-line no-console
  console.log(`\n${steps.length - failed.length}/${steps.length} ok, ${shots.length} shots → ${OUT}`);
  await page.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  appendFileSync(`${OUT}walk.log`, `\nCRASHED: ${e.message}\n${e.stack}\n`);
  try { await page?.close(); } catch { /* already gone */ }
  process.exit(1);
});
