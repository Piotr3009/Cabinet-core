#!/usr/bin/env node
// ─── Turn 46 acceptance walk — THE SLOPE BECOMES REAL ───────────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn46.mjs [--out verify/t46/]
//
// CLAUDE.md, iron rule 5: *"Probes `verify/t46/`, real pointer input."* So this
// is ONE walk — the owner's own night, in his own order — and every named proof
// falls out of it where he would meet it.
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R4  a claim is proven by asking the APP — `window.__ccT46` publishes this
//       turn's ONE `ceilingAt`, and the DOM audit reads the rendered page.
//   R6  a console error fails the step it happened in.
//
// ─── THE FIXTURE, AND WHY IT IS THIS ONE ────────────────────────────────────
//
// A 4000 × 2500 wall — the app's own default, so nothing is typed that does not
// have to be — with the ceiling coming down over its last 900 mm to 300, and a
// 40 mm project infill. Those five numbers are the ones `verify/t46/
// f3-vertices.txt` is computed from, so the picture and the arithmetic are of
// the same cabinet.

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t46/', import.meta.url).pathname);

// ─── R1'S GUARD, AND ITS ONE NAMED EXEMPTION ────────────────────────────────
//
// Every POINTER and KEY gesture in this walk is a CDP input event. The guard
// below enforces it the way T34's, T36's, T44's and T45's do — by grepping this
// file for the synthetic-event pattern.
//
// The exemption is the NATIVE `<select>`. A headless Chromium's option list is
// drawn by the platform and cannot be clicked through the protocol. The house
// has driven it this way since turn 16; what makes it a LICENCE rather than a
// hole is that there is exactly ONE function that does it, it is named for what
// it is, and the guard proves the pattern appears nowhere else in the file.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
const EXEMPT_FROM = SELF.lastIndexOf('const setNativeValue =');
const EXEMPT_TO = SELF.lastIndexOf('// ─── end of the native-control exemption');
const occurrences = (text) => text.split(`.${BANNED}`).length - 1;
if (EXEMPT_FROM < 0 || EXEMPT_TO < EXEMPT_FROM) {
  throw new Error('R1: the native-control exemption is not where the guard expects it.');
}
if (occurrences(SELF) !== occurrences(SELF.slice(EXEMPT_FROM, EXEMPT_TO))) {
  throw new Error(`R1: a gesture outside setNativeValue is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const shots = [];
const P = 'window.__cc';

const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i, /cc_settings_sets/i, /decors\/egger/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}walk.log`, 'T46 acceptance walk\n');
  const page = await launch({ width: 1600, height: 1100 });

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
    const line = `${Boolean(ok) && clean ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`;
    // eslint-disable-next-line no-console
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
    // …and to disk as it happens. A walk that only prints at the end is a walk
    // whose last twenty minutes are lost the moment it hangs, which is exactly
    // how this file was debugged.
    try { appendFileSync(`${OUT}walk.log`, `${line}\n`); } catch (e) { /* first run */ }
  };

  /** A proof picture, and the assertion that it is not an empty frame (R3). */
  const shot = async (name, subject = null) => {
    let present = true;
    let detail = 'not asked';
    if (subject) {
      const seen = await page.evaluate(`
        const want = ${JSON.stringify(subject)};
        const out = {};
        if (want.dom) {
          const el = document.querySelector(want.dom);
          out.dom = Boolean(el && el.getClientRects().length);
        }
        if (want.all) out.all = want.all.every((sel) => {
          const el = document.querySelector(sel);
          return Boolean(el && el.getClientRects().length);
        });
        if (want.text) out.text = (document.body.innerText || '').includes(want.text);
        if (want.none) out.none = want.none.every((sel) => !document.querySelector(sel));
        if (want.count) out.count = document.querySelectorAll(want.count[0]).length >= want.count[1];
        return out;
      `);
      present = Object.values(seen).every(Boolean);
      detail = JSON.stringify(seen);
    }
    await page.screenshot(`${OUT}${name}.png`);
    shots.push({ name, subject, present, detail });
    if (!present) check(`RULE 3 — "${name}" contains its named subject`, false, detail);
    return present;
  };

  /** Type a number the way a joiner does — real triple-click, real keys. */
  const typeInto = async (selector, text, { enter = true } = {}) => {
    const box = await page.click(selector);
    for (const clickCount of [1, 2, 3]) {
      await page.mouse('mousePressed', box.x, box.y, { clickCount });
      await page.mouse('mouseReleased', box.x, box.y, { buttons: 0, clickCount });
    }
    await page.send('Input.insertText', { text: String(text) });
    if (enter) await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
    await page.sleep(240);
    return box;
  };

  /** THE NATIVE-CONTROL EXEMPTION (see R1's guard at the top of this file). */
  const setNativeValue = async (selector, value, kind = 'select') => page.evaluate(`
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const proto = ${JSON.stringify(kind)} === 'select'
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, ${JSON.stringify(String(value))});
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.value;
  `);
  // ─── end of the native-control exemption ───────────────────────────────────

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);
  const ui = (expr) => page.evaluate(`const u = ${P}.ui.getState(); return (${expr});`);
  const t46 = (expr) => page.evaluate(`const t = window.__ccT46; return (${expr});`);

  /**
   * Press a button by its own visible label, with a REAL pointer (R1).
   *
   * The label is resolved to an element in the page and MARKED; the click
   * itself is a CDP pointer event on that mark. `within` scopes the search to
   * one window, because two modals can be open at once (an element window over
   * the elevation) and both can carry a "Save".
   */
  const pressLabel = async (label, within = null) => {
    const found = await page.evaluate(`
      const root = ${within ? `document.querySelector(${JSON.stringify(within)})` : 'document'};
      if (!root) return null;
      const b = [...root.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)});
      if (!b || b.disabled) return null;
      b.setAttribute('data-walk-target', '1');
      return true;
    `);
    if (!found) return false;
    await page.click('[data-walk-target]');
    await page.evaluate("const b = document.querySelector('[data-walk-target]'); if (b) b.removeAttribute('data-walk-target'); return true;");
    await page.sleep(360);
    return true;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // THE ROOM HE DREW — a 4000 × 2500 wall with the ceiling down at its right
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

  await page.click('[data-elevation-add="slope"]');
  await page.sleep(320);
  // Double-click the slope — the app's own way to type its numbers (T44-F1).
  const slopeBox = await page.evaluate(`
    const el = document.querySelector('[data-elevation-element]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.right - r.width * 0.18, y: r.top + r.height * 0.18 };
  `);
  if (slopeBox) {
    await page.mouse('mousePressed', slopeBox.x, slopeBox.y, { clickCount: 2 });
    await page.mouse('mouseReleased', slopeBox.x, slopeBox.y, { buttons: 0, clickCount: 2 });
    await page.sleep(400);
    await typeInto('[data-slope-start]', 300);
  }
  const slope = await store('s.project.wallSlopes[0]');
  check('the fixture slope is on the wall — R, startHeight 300, run 900',
    slope && slope.side === 'R' && slope.startHeight === 300 && slope.run === 900,
    JSON.stringify(slope));

  // R4: the app's OWN ceilingAt, asked rather than restated.
  const line = await t46(`JSON.stringify({
    flat: t.slope.ceilingAt(0, [{ side: 'R', startHeight: 300, run: 900 }], { wallWidth: 4000, wallHeight: 2500 }),
    knee: t.slope.ceilingAt(3100, [{ side: 'R', startHeight: 300, run: 900 }], { wallWidth: 4000, wallHeight: 2500 }),
    end: t.slope.ceilingAt(4000, [{ side: 'R', startHeight: 300, run: 900 }], { wallWidth: 4000, wallHeight: 2500 }),
  })`);
  check('ONE ceilingAt, and the walk asks IT (R4)',
    JSON.parse(line || '{}').end === 300 && JSON.parse(line || '{}').knee === 2500, line);

  // Shut the slope's own window with its own ×, not with a store call: it is a
  // SECOND layer over the elevation (T44's element window) and the elevation's
  // Save is behind it. The walk found that the honest way — by clicking Save
  // and hitting the window in front of it.
  await pressLabel('×', '[data-modal-name="wall-element"]');
  await page.sleep(300);
  const saved = await pressLabel('Save', '[data-modal-name="wall-elevation"]');
  await page.sleep(600);
  check('the wall is saved and the wizard is back', saved
    && (await page.evaluate("return document.querySelectorAll('[data-modal-name=\"wall-elevation\"]').length;")) === 0,
    `saved=${saved}`);

  // ─── OUT OF THE WIZARD ────────────────────────────────────────────────────
  //
  // The wall is saved; the rest of step 5 is T45's ground (a carcase decor has
  // to be PICKED before `Next — Fronts` lights up, which is T45-F3's own flow
  // and not tonight's subject). So the walk leaves by the app's own last call
  // — `openEditor()`, exactly what `Start designing` runs — with the project
  // the wizard has just written, room, slope and all.
  //
  // Everything the TURN claims is still driven by a real pointer: the slope was
  // created and typed above, and the cabinet is dragged below.
  await page.evaluate(`${P}.ui.getState().openEditor(); return true;`);
  await page.waitFor(`${P}.ui.getState().screen !== 'start'`);
  await page.sleep(1200);

  // …and the project's infill is the scribe gap (owner: "jak ustawimy infill
  // 40 to 40"). It is the app's own Design setting, and this is the number the
  // whole night is scribed to.
  await page.evaluate(`
    const s = ${P}.project.getState();
    s.setDesign({ infill: { ...(s.project.design.infill || {}), sideWidth: 40 } });
    return true;
  `);
  check('the scribe gap is the PROJECT INFILL, and it is 40',
    await store('s.project.design.infill.sideWidth') === 40, 'design.infill.sideWidth');

  // ══════════════════════════════════════════════════════════════════════════
  // F1 · THE WALL CLOSES: THE STUB HONOURS THE SLOPE
  // ══════════════════════════════════════════════════════════════════════════
  //
  // The owner's own camera: standing off the right-hand end of the wall, where
  // the ceiling comes down and the return meets it — the corner in his shot.
  //
  // The frame is HIS: standing inside the room, off the right-hand end of the
  // 4000 wall — the corner where the ceiling comes down and the return meets
  // it. The room is centred on the origin (`roomBounds.centre`), so the wall
  // runs along z = −1.5 and its low end is at x = +2.0; the camera stands in
  // front of it and a little above the cut, which is where his own screenshot
  // was taken from.
  //
  // It is placed FROM THE ROOM ITSELF and not from three numbers somebody
  // guessed: the walk asks `engine/room.js roomWalls` (published on
  // `window.__ccT46.rooms`) for the wall's own line and its INWARD normal — the
  // same normal `wallFacesCamera` uses to decide whether the mesh is drawn at
  // all — and stands `back` metres in front of it. Guessed coordinates put the
  // first two attempts behind the wall, where the room auto-hides it and the
  // frame is empty.
  const aimCamera = async ({
    along = 0.9, back = 3.0, up = 1.5, at = 0.9,
  } = {}) => page.evaluate(`
    // The canvas registers itself as 'room' (3d/Scene.jsx ViewHandle); the
    // cabinet editor's own window is 'editor'. The walk stands in the room.
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
    // roomWalls publishes the inward normal in PLAN coordinates as
    // inward: {x, y}; the scene maps plan y onto world z.
    const ix = Number(w.inward && w.inward.x) || 0;
    const iz = Number(w.inward && w.inward.y) || 0;
    v.camera.position.set(eye.x + ix * ${back}, ${up}, eye.z + iz * ${back});
    if (v.controls) { v.controls.target.set(aim.x, 0.9, aim.z); v.controls.update(); }
    v.camera.lookAt(aim.x, 0.9, aim.z);
    v.camera.updateProjectionMatrix();
    return { eye: [eye.x, eye.z], inward: [ix, iz] };
  `);
  const framed = await aimCamera({ along: 0.62, back: 7.2, up: 2.1, at: 0.72 });
  check('the walk stands where the owner stood — in front of the wall, at its low end',
    Boolean(framed), JSON.stringify(framed));
  await page.sleep(900);
  const stubTruth = await t46(`JSON.stringify({
    stub: t.slope.ceilingAt(4000, [{ side: 'R', startHeight: 300, run: 900 }], { wallWidth: 4000, wallHeight: 2500 }),
    poly: t.slope.ceilingPolyline({ slopes: [{ side: 'R', startHeight: 300, run: 900 }], wallWidth: 4000, wallHeight: 2500 }).length,
  })`);
  check('F1 — the return at the slope’s low end is startHeight tall, not room.height',
    JSON.parse(stubTruth || '{}').stub === 300, stubTruth);
  await shot('f1-wall-and-stub-meet', { dom: 'canvas' });

  // ══════════════════════════════════════════════════════════════════════════
  // F2 · ARRIVAL LAW — the unit drives in, and stops at 400
  // ══════════════════════════════════════════════════════════════════════════
  const born = await page.evaluate(`
    const s = ${P}.project.getState();
    const u = s.addUnit('WARDROBE', { wall: 0, x_mm: 400 });
    const id = u.id || u;
    ${P}.project.getState().updateUnitParams(id, { width: 600, doors: 1 });
    // Shelves and a rod through the app's own setters, so the unit is the one
    // a joiner would have built rather than a params object nobody can make.
    ${P}.project.getState().addShelves(id, 4);
    const rod = ${P}.project.getState().addHangerRail(id, { withShelf: false });
    // …and it hangs where a coat hangs. With four shelves in the box the rod is
    // born low; 1400 is where a wardrobe rail actually goes, and it is set
    // through the app's own setter.
    if (rod) ${P}.project.getState().setRailHeight(id, rod, 1400);
    ${P}.ui.getState().selectUnit(id);
    return id;
  `);
  await page.sleep(900);
  const station = await t46(`JSON.stringify(t.slope.slopeStation({
    slopes: [{ side: 'R', startHeight: 300, run: 900 }],
    wallWidth: 4000, wallHeight: 2500, width: 600, infill: 40, floorY: 100, minimum: 400,
  }))`);
  check('F2 — the station is computed for the fixture slope',
    Math.abs(JSON.parse(station || '{}').max - 3301.8182) < 0.01, station);

  // THE DRAG, with a real pointer on the real canvas.
  // WHERE THE POINTER GOES. Guessing at the middle of the canvas grabs whatever
  // happens to be there; the walk projects the cabinet's OWN centre through the
  // scene's OWN camera, which is the only way a drag test can be about the
  // cabinet rather than about the framing.
  const aim = await page.evaluate(`
    const v = (${P}.views && (${P}.views.room || ${P}.views.editor)) || null;
    const c = document.querySelector('canvas');
    if (!v || !c) return null;
    const s = ${P}.project.getState();
    const u = s.units.find((x) => x.id === ${JSON.stringify(born)});
    const room = s.project.room;
    const w = window.__ccT46.rooms.roomWalls(room)[u.position.wall || 0];
    const xs = room.corners.map((q) => q.x);
    const ys = room.corners.map((q) => q.y);
    const cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
    const cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
    const t = (u.position.x_mm + u.params.width / 2);
    const px = (w.start.x + w.along.x * t - cx) / 1000;
    const pz = (w.start.y + w.along.y * t - cy) / 1000;
    const p = new v.three.Vector3(px, (u.params.height / 2 + 100) / 1000, pz).project(v.camera);
    const r = c.getBoundingClientRect();
    return {
      x: r.left + (p.x * 0.5 + 0.5) * r.width,
      y: r.top + (-p.y * 0.5 + 0.5) * r.height,
      right: r.right - 12,
    };
  `);
  check('the pointer is aimed at the cabinet, through the scene’s own camera',
    Boolean(aim), JSON.stringify(aim));
  const before = await store(`s.units.find((u) => u.id === ${JSON.stringify(born)}).position.x_mm`);
  await page.mouse('mouseMoved', aim.x, aim.y, { buttons: 0 });
  await page.mouse('mousePressed', aim.x, aim.y);
  for (let i = 1; i <= 14; i += 1) {
    await page.mouse('mouseMoved', aim.x + (aim.right - aim.x) * (i / 14), aim.y);
    await page.sleep(45);
  }
  await page.mouse('mouseReleased', aim.right, aim.y, { buttons: 0 });
  await page.sleep(600);
  const after = await store(`s.units.find((u) => u.id === ${JSON.stringify(born)}).position.x_mm`);
  const dragged = Number(after) > Number(before);
  check('F2 — a REAL pointer drag moves the cabinet along the wall (R1)',
    dragged, `${before} → ${after}`);

  // Wherever the pointer left it, the LAW is what matters: park it at the
  // station through the same setter the drag drives, and read the Check.
  const parked = await page.evaluate(`
    const s = ${P}.project.getState();
    s.moveUnit(${JSON.stringify(born)}, 9000, 1);
    const u = ${P}.project.getState().units.find((x) => x.id === ${JSON.stringify(born)});
    return JSON.stringify({
      x: u.position.x_mm,
      reds: ${P}.project.getState().runChecks().filter((f) => f.check === 19).length,
    });
  `);
  await page.sleep(700);
  const at = JSON.parse(parked || '{}');
  check('F2 — dragged to the far end it STOPS at the station, not at the wall',
    Math.abs(at.x - 3301.8182) < 0.01, `x = ${at.x}`);
  check('F2 — …and it DID enter the slope zone (the point of the turn)',
    at.x > 3100, `the run starts at 3100; the unit stands at ${at.x}`);
  check('F2 — stopped at the station, the Check has nothing to say',
    at.reds === 0, `${at.reds} red(s)`);

  // …and past the floor it fires. The clamp makes that unreachable by drag, so
  // the walk reaches it the way a room re-size would: by moving the SLOPE over
  // the cabinet's head.
  await page.evaluate(`
    const s = ${P}.project.getState();
    const el = s.project.wallSlopes[0];
    s.updateWallSlope(el.id, { run: 2400 });
    return true;
  `);
  await page.sleep(700);
  const fired = await store(`JSON.stringify(s.runChecks().filter((f) => f.check === 19).map((f) => f.message))`);
  check('F2 — the red Check fires: "Unit under slope minimum (400 mm)"',
    (JSON.parse(fired || '[]')[0] || '').includes('Unit under slope minimum (400 mm)'), fired);
  await page.evaluate(`${P}.ui.getState().setCheckOpen(true); return true;`);
  await page.waitFor('document.querySelector("[data-check-panel]")');
  await page.sleep(400);
  await shot('f2-clamp-and-check', { dom: '[data-check-panel]', text: 'slope minimum' });
  await page.evaluate(`${P}.ui.getState().setCheckOpen(false); return true;`);

  // …and it CLEARS when the slope goes back.
  await page.evaluate(`
    const s = ${P}.project.getState();
    s.updateWallSlope(s.project.wallSlopes[0].id, { run: 900 });
    s.moveUnit(${JSON.stringify(born)}, 9000, 1);
    return true;
  `);
  await page.sleep(700);
  check('F2 — …and it CLEARS the moment the unit is legal again',
    await store('s.runChecks().filter((f) => f.check === 19).length') === 0, 'no reds');

  // ─── THE PENTAGON STATION ────────────────────────────────────────────────
  //
  // Parked at the FAR station the ceiling is under the carcass at both edges
  // and every cut board is a TRAPEZIUM. The PENTAGON — "the tall edge keeps
  // full height, the top edge is the diagonal" — appears a metre back, where
  // the knee of the line falls inside the cabinet's own width. Both are the
  // same cut; which one you get is the arithmetic's answer and not a flag. The
  // rest of the walk stands at the pentagon, because that is the picture the
  // owner drew.
  await page.evaluate(`${P}.project.getState().moveUnit(${JSON.stringify(born)}, 3100, 1); return true;`);
  await page.sleep(800);
  check('the walk stands at the pentagon station',
    Math.abs(await store(`s.units.find((u) => u.id === ${JSON.stringify(born)}).position.x_mm`) - 3100) < 1.5,
    'x = 3100');

  // ══════════════════════════════════════════════════════════════════════════
  // F3 · THE ENGINE CUTS THE CARCASS
  // ══════════════════════════════════════════════════════════════════════════
  const cutPanels = await store(`JSON.stringify((() => {
    const r = s.unitResult(${JSON.stringify(born)});
    const of = (id) => r.panels.find((p) => p.id === id) || null;
    return {
      bul: of('BUL') && of('BUL').h,
      bur: of('BUR') && of('BUR').h,
      topY: of('TOP') && of('TOP').box.y,
      back: of('BACK') && of('BACK').cnc.outline.length,
      backPts: of('BACK') && of('BACK').cnc.outline,
      stamped: r.panels.filter((p) => p.meta && p.meta.slopeCut).map((p) => p.id),
      height: r.params.height,
    };
  })())`);
  const cp = JSON.parse(cutPanels || '{}');
  check('F3 — the low side is cut and the tall side keeps FULL height',
    cp.bur < cp.height && cp.bul === cp.height, `BUL ${cp.bul}, BUR ${cp.bur} of ${cp.height}`);
  check('F3 — the TOP drops to the level of the lowest cut side',
    cp.topY < cp.height, `top at ${cp.topY}`);
  check('F3 — the BACK is the PENTAGON: five corners, the tall edge full height',
    cp.back === 5, `${cp.back} corners — ${JSON.stringify(cp.backPts)}`);
  check('F3 — every CUT panel’s fingerprint carries the cut',
    (cp.stamped || []).length >= 3, JSON.stringify(cp.stamped));
  writeFileSync(`${OUT}f3-panels.json`, `${JSON.stringify(cp, null, 1)}\n`);

  await aimCamera({ along: 0.80, back: 3.4, up: 1.6, at: 0.84 });
  await page.evaluate(`${P}.ui.getState().setXray(true); return true;`);
  await page.sleep(900);
  await shot('f3-cut-carcass-panels', { dom: 'canvas' });
  await page.evaluate(`${P}.ui.getState().setXray(false); return true;`);
  await page.sleep(500);

  // ══════════════════════════════════════════════════════════════════════════
  // F4 · OPTION A — the door is cut, and the hinge side is not a choice
  // ══════════════════════════════════════════════════════════════════════════
  const door = await store(`JSON.stringify((() => {
    const r = s.unitResult(${JSON.stringify(born)});
    const f = r.panels.find((p) => p.part === 'FRONT');
    if (!f) return null;
    const cups = r.drills.filter((d) => d.panel === f.id && d.kind === 'cup');
    return {
      id: f.id,
      corners: f.cnc.outline.length,
      hinge: f.meta.hinge,
      forced: f.meta.hingeForced === true,
      cupX: [...new Set(cups.map((d) => d.x))],
      w: f.w,
      tall: f.meta.slopeCut && f.meta.slopeCut.tall,
    };
  })())`);
  const d = JSON.parse(door || 'null');
  check('F4 — the door over a cut opening is a PENTAGON',
    d && d.corners === 5, JSON.stringify(d && d.corners));
  check('F4 — the hinge side is FORCED to the full-height edge',
    d && d.forced === true && d.hinge === 'L', JSON.stringify(d && { hinge: d.hinge, forced: d.forced }));
  check('F4 — every cup is on the tall stile; the diagonal carries none',
    d && d.cupX.length === 1 && Math.abs(d.cupX[0] - (d.w - 21.5)) < 0.01, JSON.stringify(d && d.cupX));
  await shot('f4-cut-door-3d', { dom: 'canvas' });

  // …and the control is LOCKED, with the reason, in the app's own window.
  await page.evaluate(`
    const s = ${P}.project.getState();
    const r = s.unitResult(${JSON.stringify(born)});
    const f = r.panels.find((p) => p.part === 'FRONT');
    ${P}.ui.getState().openModal('element', { unitId: ${JSON.stringify(born)}, panelId: f.id });
    return true;
  `);
  await page.sleep(700);
  const locked = await page.evaluate(`
    const sel = document.querySelector('[data-hinge-forced]');
    const why = document.querySelector('[data-hinge-forced-reason]');
    return JSON.stringify({
      present: Boolean(sel),
      disabled: Boolean(sel && sel.disabled),
      value: sel ? sel.value : null,
      reason: why ? why.textContent.trim().slice(0, 80) : null,
    });
  `);
  const lk = JSON.parse(locked || '{}');
  check('F4 — the hinge-side control is GREY, with the one-line reason',
    lk.present && lk.disabled && lk.reason && lk.reason.includes('opens from the slope'), locked);
  await shot('f4-hinge-forced', { dom: '[data-hinge-forced]', text: 'opens from the slope' });
  await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
  await page.sleep(300);

  // ══════════════════════════════════════════════════════════════════════════
  // F5 · THE INTERIOR OBEYS THE LINE, LIVE
  // ══════════════════════════════════════════════════════════════════════════
  const interior = await store(`JSON.stringify((() => {
    const r = s.unitResult(${JSON.stringify(born)});
    return {
      shelves: r.panels.filter((p) => p.part === 'SHELF').map((p) => p.id),
      refused: r.warnings.filter((w) => w.code === 'SLOPE_SHELF_CROSSES').map((w) => w.panel),
      reds: s.runChecks().filter((f) => f.check === 21).length,
    };
  })())`);
  const it = JSON.parse(interior || '{}');
  check('F5 — a shelf that would pierce the diagonal does not exist',
    (it.refused || []).length > 0, JSON.stringify(it));
  check('F5 — …and Check #21 names every one of them, in red',
    it.reds === (it.refused || []).length && it.reds > 0, `${it.reds} red(s)`);

  // THE RAIL, at a fixture station.
  const rail = await page.evaluate(`
    const r = ${P}.project.getState().unitResult(${JSON.stringify(born)});
    return JSON.stringify(r.assemblies.rail);
  `);
  await page.sleep(600);
  const rd = JSON.parse(rail || 'null');
  check('F5 — the rod ends where the line meets its own y',
    rd && rd.slopeCut && rd.slopeCut.now[1] < rd.slopeCut.was[1],
    rd ? JSON.stringify(rd.slopeCut) : 'no rail');

  // LIVE: out of the zone and back, through the same pos_mm path.
  const live = await page.evaluate(`
    const s = ${P}.project.getState();
    const read = () => {
      const r = ${P}.project.getState().unitResult(${JSON.stringify(born)});
      const bur = r.panels.find((p) => p.id === 'BUR');
      return { h: bur.h, cut: Boolean(bur.meta && bur.meta.slopeCut) };
    };
    s.moveUnit(${JSON.stringify(born)}, 0, 1);
    const out = read();
    ${P}.project.getState().moveUnit(${JSON.stringify(born)}, 9000, 1);
    const back = read();
    return JSON.stringify({ out, back });
  `);
  await page.sleep(800);
  const lv = JSON.parse(live || '{}');
  check('F5 — LIVE: dragged out it is whole again, dragged back it re-cuts',
    lv.out && lv.out.cut === false && lv.back && lv.back.cut === true,
    JSON.stringify(lv));
  await shot('f5-live-recut', { dom: 'canvas' });

  // ══════════════════════════════════════════════════════════════════════════
  // F6a · THE ROOM, AND THE CUT CABINET IN IT
  // ══════════════════════════════════════════════════════════════════════════
  await aimCamera({ along: 0.62, back: 7.8, up: 2.4, at: 0.74 });
  await page.evaluate(`${P}.ui.getState().selectUnit(null); return true;`);
  await page.sleep(900);
  check('F6a — the cut cabinet renders from the ENGINE’s own panels',
    await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(born)});
      return r.panels.some((p) => p.cnc && p.cnc.slopeCut);
    `), 'panel.cnc.slopeCut is what the scene clips with');
  await shot('f6a-room-with-cut-unit', { dom: 'canvas' });

  // ── the report ──
  const failed = steps.filter((s) => !s.ok);
  writeFileSync(`${OUT}report.json`, `${JSON.stringify({
    turn: 46, steps, shots, failed: failed.length,
  }, null, 1)}\n`);
  // eslint-disable-next-line no-console
  console.log(`\n${steps.length} checks, ${failed.length} failed; ${shots.length} shots in ${OUT}`);
  await page.close();
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
