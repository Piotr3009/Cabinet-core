// ─── Turn 24, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build
//       npx vite preview --port 4173 &
//       node scripts/e2e-turn24.mjs
//
// The fixture server (R8) is started by this script; the app preview is not,
// because a walk that builds its own app cannot prove the build somebody else
// is about to ship.
//
// ─── R1: A POINTER GESTURE IS PROVEN WITH A REAL POINTER ────────────────────
//
// Standing since turn 20: every click, double-click, drag, wheel, hover and
// keystroke goes through `Input.dispatchMouseEvent` / `dispatchKeyEvent` /
// `insertText` (scripts/cdp.mjs). Synthetic DOM events are BANNED, and the ban
// is enforced rather than promised — the guard below reads this file and
// refuses to run if anybody adds one.
//
// This turn leans on it harder than any before: F2 replaced the part editor's
// FORM with a DRAWING BOARD, and there is no way to prove a drawing board
// except by drawing on it. The osnap markers, the live dimensions, the typed
// in-flight override, the line and the dowel line below are all real pointer
// moves, real clicks and real keystrokes.
//
// ─── R2: THE BUCKET IS ASKED, LIVE ──────────────────────────────────────────
//
// `scripts/bucket-live.mjs`, before any picture of hardware. In THIS session
// the egress policy refuses the storage host and the step is recorded as
// BLOCKED with the proxy's own answer.
//
// ─── R4: A URL AND A COUNT ARE PROVEN BY ASKING THE APP ─────────────────────
//
// Every hardware claim below reads `window.__cc.hardware` — the registry the
// SCENE publishes — and never the pixels or a URL this script built for itself.
// Turn 24 adds the MEMBER, the node names and the fold pivot to it, so F1's
// split is asserted off the very clones rather than off a photograph.
//
// ─── R5 + R6: THE WALK READS THE CONSOLE, AND AN EXCEPTION FAILS A STEP ─────
//
// `check` takes a snapshot of the error log with every step: ANY uncaught
// error, React error-boundary report or failed resource that appears during a
// step FAILS that step, whatever else it asserted.
//
// ─── R8: HARDWARE VISUALS ARE PROVEN ON THE SILENT SHOWROOM ─────────────────
//
// The cloud sandbox cannot fetch the bucket (403 at the egress proxy), so this
// walk serves `test/fixtures/hardware-local/` — synthetic GLBs at the REAL
// measured dimensions, with the REAL export's own `bau…` node names, no Blum
// bytes — and points the app at it with the documented
// `localStorage['cc.hardwareBase']` knob. Everything downstream is the
// production path: the same catalogue resolution, URL composition, loader,
// cache, clone, SPLIT, pose, mirror, fold and finish.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { checkLiveBucket } from './bucket-live.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t24/', import.meta.url).pathname);

// R1's guard, and it is a guard rather than a promise: the banned call is
// `element.dispatch` + `Event(...)`, and the only way it can appear in this file
// is if somebody adds one. The name is built here rather than written out so
// that the check cannot match its own source.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const P = 'window.__cc';

// ─── R6: what counts as an exception, and what does not ─────────────────────
//
// A favicon nobody asked for is not a React exception. Everything else is.
const IGNORED = [/favicon\.ico/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const showroom = await startFixtureServer({ port: 4174 });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name, clip = null) => page.screenshot(`${OUT}${name}.png`, clip);

  // R5 + R6, as machinery rather than as a habit: every step records the errors
  // that appeared WHILE IT RAN, and any of them fails it.
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
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
  };
  const blocked = (label, why, detail = '') => {
    errorMark = page.errors.length;
    steps.push({
      label, ok: null, blocked: why, detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
    });
    console.log(`BLKD  ${label} — ${why}${detail ? ` (${detail})` : ''}`);
  };

  /** The screen rectangle of a scene object, from the LIVE scene and camera. */
  const rectOfJs = (view, predicate) => `
    const v = ${P}.views && ${P}.views[${JSON.stringify(view)}];
    if (!v) return null;
    const THREE = v.three;
    const rect = v.gl.domElement.getBoundingClientRect();
    let hit = null;
    v.scene.traverse((o) => { if (!hit && (${predicate})) hit = o; });
    if (!hit) return null;
    const box = new THREE.Box3().setFromObject(hit);
    if (!isFinite(box.min.x)) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new THREE.Vector3(x, y, z).project(v.camera);
      minX = Math.min(minX, rect.left + (p.x * 0.5 + 0.5) * rect.width);
      maxX = Math.max(maxX, rect.left + (p.x * 0.5 + 0.5) * rect.width);
      minY = Math.min(minY, rect.top + (-p.y * 0.5 + 0.5) * rect.height);
      maxY = Math.max(maxY, rect.top + (-p.y * 0.5 + 0.5) * rect.height);
    }
    return { x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2),
             left: Math.round(minX), right: Math.round(maxX), top: Math.round(minY), bottom: Math.round(maxY) };
  `;

  const measurements = {};

  try {
    // ── R2, first, and before any picture of hardware ──────────────────────
    let bucket = null;
    try {
      bucket = await checkLiveBucket();
    } catch (e) {
      bucket = { ok: false, error: e.message };
    }
    writeFileSync(`${OUT}bucket-live.json`, `${JSON.stringify(bucket, null, 1)}\n`);
    if (bucket?.ok) check('R2 — the live bucket answers', true, 'manifests and a model fetched');
    else {
      blocked('R2 — the live bucket', 'this session\'s egress policy refuses the storage host',
        bucket?.families?.map((f) => `${f.id}: ${f.error || 'failed'}`).join(' · ') || bucket?.error || '403');
    }

    // ── R8: the showroom, and the app pointed at it ────────────────────────
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    check('R8 — the app is pointed at the silent showroom', true, showroom.url);

    await page.evaluate(`
      const s = ${P}.project.getState();
      s.newProject('Turn 24 walk');
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      const u = s.addUnit('WARDROBE');
      s.updateUnitParams(u.id, { doors: true });
      window.__t24 = { unitId: u.id };
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    // The models are FETCHED. Waiting for the registry to say they have landed
    // is the honest way to time this: a fixed sleep is how a walk comes back
    // green about a scene that had not finished loading.
    await page.waitFor(`${P}.hardware && ${P}.hardware.allModelled('hinge') && ${P}.hardware.allModelled('plate')`,
      { what: 'the showroom models to land', timeout: 25000 });
    await page.sleep(600);

    // ── F2 / F4 / R4: the hinge, on the showroom ───────────────────────────
    const hardware = await page.evaluate(`
      const rows = ${P}.hardware ? ${P}.hardware.rows : [];
      return {
        hinge: rows.filter((r) => r.family === 'hinge'),
        plate: rows.filter((r) => r.family === 'plate'),
        parents: {
          hinge: ${P}.hardware ? ${P}.hardware.allParented('hinge', 'door') : false,
          plate: ${P}.hardware ? ${P}.hardware.allParented('plate', 'carcass') : false,
        },
        modelled: {
          hinge: ${P}.hardware ? ${P}.hardware.allModelled('hinge') : false,
          plate: ${P}.hardware ? ${P}.hardware.allModelled('plate') : false,
        },
        finishes: ${P}.hardware ? ${P}.hardware.finishes('hinge') : [],
      };
    `);
    measurements.hardware = hardware;
    check('R4/R8 — the mounted hinge is the GLB, over the app\'s OWN url',
      hardware.hinge.length > 0 && hardware.modelled.hinge,
      hardware.hinge[0]?.url || 'no url');
    check('R4/R8 — …and so is the plate', hardware.plate.length > 0 && hardware.modelled.plate,
      hardware.plate[0]?.url || 'no url');
    // ─── F2.4: "Registry asserts both parents." ───
    check('F2.4 — the hinge BODY hangs off the DOOR', hardware.parents.hinge,
      `${hardware.hinge.length} rows, parent ${hardware.hinge[0]?.parent}`);
    check('F2.4 — …and the PLATE stays on the carcass', hardware.parents.plate,
      `${hardware.plate.length} rows, parent ${hardware.plate[0]?.parent}`);

    // ─── F1: THE HINGE SPLITS IN TWO AND FOLDS ──────────────────────────────
    //
    // Owner's verdict on turn 23: the model must BREAK in the middle. Asserted
    // off the SCENE — which member each clone is, which nodes it holds, where
    // the fold pivot landed — and then photographed closed, at 45° and at 90°.
    const split = await page.evaluate(`
      const h = ${P}.hardware;
      return {
        cupMembers: h.members('hinge'),
        bodyMembers: h.members('hingeBody'),
        cupNodes: h.nodes('hinge'),
        bodyNodes: h.nodes('hingeBody'),
        pivot: h.pivot('hingeBody'),
        bodyRows: h.of('hingeBody').length,
        bodyParented: h.allParented('hingeBody', 'carcass'),
      };
    `);
    measurements.rig = split;
    check('F1.1 — the model is cut in two, and each half says which it is',
      split.cupMembers.length === 1 && split.cupMembers[0] === 'A'
      && split.bodyMembers.length === 1 && split.bodyMembers[0] === 'B',
      `cup ${JSON.stringify(split.cupMembers)} · body ${JSON.stringify(split.bodyMembers)}`);
    check('F1.3 — the split is by NODE NAME, off the file’s own strings',
      split.cupNodes.join(',') === 'bau0015088783,bau0015088853,bau0015089612'
      && split.bodyNodes.join(',') === 'bau0015088251,bau0019416036',
      `A ${JSON.stringify(split.cupNodes)} · B ${JSON.stringify(split.bodyNodes)}`);
    check('F1.1 — member B is parented to the CARCASS, beside the plate',
      split.bodyParented && split.bodyRows > 0, `${split.bodyRows} rows`);
    check('F1.2 — the fold pivot is on the cup’s axis, 1.8 mm behind the flange',
      Boolean(split.pivot) && Math.abs(split.pivot.x) < 1e-6 && Math.abs(split.pivot.z + 1.8) < 1e-6,
      JSON.stringify(split.pivot));

    await shot('1a-rig-closed');

    /** Where every hinge clone is, and how far each member B has folded. */
    const rigState = `
      const v = ${P}.views.room; const out = { A: [], B: [], fold: [] };
      v.scene.traverse((o) => {
        if (!o.userData) return;
        if (o.userData.ccHingeMember === 'A') { const p = new v.three.Vector3(); o.getWorldPosition(p); out.A.push([+p.x.toFixed(4), +p.z.toFixed(4)]); }
        if (o.userData.ccHingeMember === 'B') { const p = new v.three.Vector3(); o.getWorldPosition(p); out.B.push([+p.x.toFixed(4), +p.z.toFixed(4)]); out.fold.push(+(o.userData.ccHingeFold || 0).toFixed(4)); }
      });
      v.scene.traverse((o) => { if (o.userData && o.userData.ccHardware) return; });
      return out;
    `;
    const plateState = `
      const v = ${P}.views.room; const out = [];
      v.scene.traverse((o) => { if (o.userData && o.userData.ccHingePlate === true) { const p = new v.three.Vector3(); o.getWorldPosition(p); out.push([+p.x.toFixed(4), +p.z.toFixed(4)]); } });
      return out;
    `;
    const rigClosed = await page.evaluate(rigState);
    const platesClosed = await page.evaluate(plateState);

    // ── the door opens, and the two halves do different things ──
    await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t24.unitId);
      const r = s.unitResult(u.id);
      for (const p of r.panels) if (p.part === 'FRONT') ${P}.ui.getState().toggleFront(u.id, p.id);
      return true;
    `);
    // Half-way through the swing, which is where a 45° picture comes from: the
    // easing is the door's own and member B rides it, so a shot taken while it
    // is still travelling is a shot of the JOINT rather than of two end states.
    await page.sleep(180);
    await shot('1b-rig-45');
    await page.sleep(1600);
    const rigOpen = await page.evaluate(rigState);
    const platesOpen = await page.evaluate(plateState);
    await shot('1c-rig-90');

    const movedA = rigClosed.A.filter((p, i) => rigOpen.A[i] && (rigOpen.A[i][0] !== p[0] || rigOpen.A[i][1] !== p[1])).length;
    const movedB = rigClosed.B.filter((p, i) => rigOpen.B[i] && (rigOpen.B[i][0] !== p[0] || rigOpen.B[i][1] !== p[1])).length;
    const movedPlates = platesClosed.filter((p, i) => platesOpen[i] && (platesOpen[i][0] !== p[0] || platesOpen[i][1] !== p[1])).length;
    const folded = rigOpen.fold.filter((a) => Math.abs(a) > 0.2).length;
    measurements.rigSwing = {
      rigClosed, rigOpen, platesClosed, platesOpen, movedA, movedB, movedPlates, folded,
    };
    check('F1.1 — member A RIDES the leaf: every cup travels with its door',
      movedA > 0 && movedA === rigClosed.A.length, `${movedA} of ${rigClosed.A.length} cups travelled`);
    check('F1.1 — member B STAYS on the carcass: not one arm is dragged into the room',
      movedB === 0, `${movedB} of ${rigClosed.B.length} arms moved`);
    check('F1.2 — …and it FOLDS at the axis by the door’s own angle',
      folded === rigOpen.fold.length && folded > 0,
      `${folded} of ${rigOpen.fold.length} folded, ${JSON.stringify(rigOpen.fold.slice(0, 3))} rad`);
    check('F1.1 — the plate never moves at all', movedPlates === 0,
      `${movedPlates} of ${platesClosed.length} plates moved`);

    const hingeAt = await page.evaluate(rectOfJs('room', 'o.userData && o.userData.ccHingeMember === "A"'));
    if (hingeAt) {
      await shot('1d-rig-90-close-up', {
        x: Math.max(0, hingeAt.left - 120),
        y: Math.max(0, hingeAt.top - 120),
        width: (hingeAt.right - hingeAt.left) + 240,
        height: (hingeAt.bottom - hingeAt.top) + 240,
        scale: 4,
      });
    }

    // ─── F12: THE HARDWARE GETS SOMETHING TO REFLECT ────────────────────────
    //
    // "Nickel without an environment is grey paint." Asserted off the SCENE —
    // does the metal actually carry a probe, and does the board beside it
    // still carry none — and then photographed in both finishes.
    const reflect = await page.evaluate(`
      const v = ${P}.views.room;
      const out = { metal: 0, metalWithEnv: 0, plastic: 0, plasticWithEnv: 0, panels: 0, panelsWithEnv: 0,
                    sceneEnv: Boolean(v.scene.environment), sceneIsHardwareProbe: false };
      // The one thing F12.2 forbids: the HARDWARE's probe on the scene.
      let hardwareProbe = null;
      v.scene.traverse((o) => {
        const l = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        for (const m of l) if (m && m.envMap && /plastic|pom|nylon|rubber|lever|cap/i.test(m.name || '') === false && !hardwareProbe) hardwareProbe = m.envMap;
      });
      out.sceneIsHardwareProbe = Boolean(hardwareProbe && v.scene.environment === hardwareProbe);
      const hardwareOf = (o) => {
        let at = o;
        for (let i = 0; i < 6 && at; i += 1) {
          if (at.userData && (at.userData.ccHingeMember || at.userData.ccFinish)) return true;
          at = at.parent;
        }
        return false;
      };
      v.scene.traverse((o) => {
        const list = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        if (!list.length) return;
        const hardware = hardwareOf(o);
        for (const m of list) {
          if (!m) continue;
          if (hardware) {
            const plastic = /plastic|pom|nylon|rubber|lever|cap/i.test(m.name || '');
            if (plastic) { out.plastic += 1; if (m.envMap) out.plasticWithEnv += 1; }
            else { out.metal += 1; if (m.envMap) out.metalWithEnv += 1; }
          } else {
            out.panels += 1;
            if (m.envMap) out.panelsWithEnv += 1;
          }
        }
      });
      return out;
    `);
    measurements.reflect = reflect;
    check('F12.1 — every hardware METAL carries the probe',
      reflect.metal > 0 && reflect.metalWithEnv === reflect.metal,
      `${reflect.metalWithEnv} of ${reflect.metal} metals`);
    check('F12.1 — …and the PLASTIC carries none: a lever is moulded POM',
      reflect.plasticWithEnv === 0, `${reflect.plastic} plastics, ${reflect.plasticWithEnv} with a probe`);
    // `scene.environment` is TURN 6's RoomEnvironment probe, which lights the
    // room and has done since long before this turn; what F12.2 forbids is the
    // HARDWARE's probe going on the scene, where every lacquer would see it.
    // So the assertion is the one that means something: no board, no front and
    // no lacquer carries an envMap of its own, and the scene is not wearing
    // ours.
    check('F12.2 — boards, fronts and lacquers carry NO envMap of their own',
      reflect.panelsWithEnv === 0 && reflect.sceneIsHardwareProbe === false,
      `${reflect.panels} materials, ${reflect.panelsWithEnv} with a probe · scene wears the hardware probe: ${reflect.sceneIsHardwareProbe}`);

    // The owner's eye test: the SPRAYED DOOR with the hardware's probe in the
    // room, and the same frame with every probe taken off. Same camera, so the
    // pair is a comparison rather than two pictures.
    await shot('12a-sprayed-door-with-hardware-probe');
    const stripped = await page.evaluate(`
      const v = ${P}.views.room;
      window.__t24.saved = [];
      v.scene.traverse((o) => {
        const list = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        for (const m of list) if (m && m.envMap) { window.__t24.saved.push([m, m.envMap]); m.envMap = null; m.needsUpdate = true; }
      });
      return window.__t24.saved.length;
    `);
    await page.sleep(500);
    await shot('12b-sprayed-door-without-it');
    await page.evaluate(`
      for (const pair of window.__t24.saved || []) { pair[0].envMap = pair[1]; pair[0].needsUpdate = true; }
      window.__t24.saved = [];
      return true;
    `);
    await page.sleep(400);
    check('F12.2 — and the probe is on the HARDWARE alone: taking it off touches only metals',
      stripped === reflect.metalWithEnv, `${stripped} materials carried one, ${reflect.metalWithEnv} of them metal`);

    // ─── turn 23's F4 still holds: the finish reaches the metal, both ways ──
    const nickelAt = await page.evaluate(rectOfJs('room', 'o.userData && o.userData.ccHingeMember === "A"'));
    await shot('12d-finish-nickel-reflecting');
    if (nickelAt) {
      await shot('12d-finish-nickel-close-up', {
        x: Math.max(0, nickelAt.left - 70),
        y: Math.max(0, nickelAt.top - 70),
        width: (nickelAt.right - nickelAt.left) + 140,
        height: (nickelAt.bottom - nickelAt.top) + 140,
        scale: 4,
      });
    }
    await page.evaluate(`
      const d = ${P}.project.getState().project.design || {};
      ${P}.project.getState().setDesign({ hinges: { ...(d.hinges || {}), finish: 'onyx' } });
      return true;
    `);
    await page.waitFor(`${P}.hardware.finishes('hinge').indexOf('onyx') >= 0`,
      { what: 'the onyx clones to be taken', timeout: 15000 });
    const onyx = await page.evaluate(`return ${P}.hardware.finishes('hinge');`);
    await shot('12e-finish-onyx-reflecting');
    if (nickelAt) {
      await shot('12e-finish-onyx-close-up', {
        x: Math.max(0, nickelAt.left - 70),
        y: Math.max(0, nickelAt.top - 70),
        width: (nickelAt.right - nickelAt.left) + 140,
        height: (nickelAt.bottom - nickelAt.top) + 140,
        scale: 4,
      });
    }
    measurements.finishes = { nickel: hardware.finishes, onyx };
    check('F12.3 — both finishes reflect, and the model is the same model',
      hardware.finishes.includes('nickel') && onyx.includes('onyx'),
      `${JSON.stringify(hardware.finishes)} → ${JSON.stringify(onyx)}`);

    // ── F1: the Back button, on real clicks ────────────────────────────────
    await page.evaluate(`
      const d2 = ${P}.project.getState().project.design || {};
      ${P}.project.getState().setDesign({ hinges: { ...(d2.hinges || {}), finish: 'nickel' } });
      ${P}.ui.getState().openModal('cabinet', { unitId: window.__t24.unitId });
      return true;
    `);
    await page.waitFor('document.querySelector(\'[data-cabinet-canvas="1"]\')', { what: 'the cabinet editor' });
    // The editor's canvas registers itself when it mounts, and its panels arrive
    // with it. Waiting for the OBJECT rather than for a stopwatch is what makes
    // this step reproducible on a slow container.
    await page.waitFor(`(() => {
      const v = ${P}.views && ${P}.views.editor;
      if (!v) return false;
      let found = false;
      v.scene.traverse((o) => { if (o.userData && o.userData.ccPanelId === 'BACK') found = true; });
      return found;
    })()`, { what: 'the editor to mount its cabinet', timeout: 25000 });
    await page.sleep(900);

    // Pick a part in the editor, then open its detail — the real gesture.
    const partAt = await page.evaluate(rectOfJs('editor', 'o.userData && o.userData.ccPanelId === "BACK"'));
    if (!partAt) throw new Error('the editor is not showing a BACK panel');
    await page.dblclick(partAt.x, partAt.y);
    await page.waitFor('document.querySelector(\'[data-part-drawing="1"]\')', { what: 'the part detail' });
    const pushed = await page.evaluate(`
      const s = ${P}.ui.getState();
      return { modal: s.modal, depth: s.modalStack.length, panelId: s.modalArgs && s.modalArgs.panelId };
    `);
    check('F1.1 — the detail is PUSHED over the editor, not instead of it',
      pushed.modal === 'part-detail' && pushed.depth === 1, JSON.stringify(pushed));
    await shot('1a-part-detail-with-back');

    // …and BACK, with a real click on the shell's own button.
    await page.click('[data-modal-back="1"]');
    await page.sleep(700);
    const popped = await page.evaluate(`
      const s = ${P}.ui.getState();
      return { modal: s.modal, depth: s.modalStack.length, unitId: s.modalArgs && s.modalArgs.unitId };
    `);
    check('F1.4 — ← Back returns to the SAME cabinet view',
      popped.modal === 'cabinet' && popped.depth === 0 && popped.unitId,
      JSON.stringify(popped));
    await shot('1b-back-to-the-same-cabinet');

    // …and Escape does the same thing, one level.
    await page.dblclick(partAt.x, partAt.y);
    await page.waitFor(`${P}.ui.getState().modal === 'part-detail'`, { what: 'the detail again' });
    await page.key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
    await page.sleep(600);
    const escaped = await page.evaluate(`
      const s = ${P}.ui.getState();
      return { modal: s.modal, depth: s.modalStack.length };
    `);
    check('F1.2 — Escape is BACK ONE LEVEL, not close-everything',
      escaped.modal === 'cabinet' && escaped.depth === 0, JSON.stringify(escaped));

    // …and Done closes the whole editor.
    await page.click('button.cc-btn-gold', 'Done');
    await page.sleep(500);
    const done = await page.evaluate(`return ${P}.ui.getState().modal;`);
    check('F1.2 — Done closes the WHOLE editor', done === null, String(done));

    // ── F7 + F8 + F9, in the part detail ───────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t24.unitId);
      const back = r.panels.find((p) => p.part === 'BACK');
      window.__t24.panelId = back.id;
      ${P}.ui.getState().openModal('cabinet', { unitId: window.__t24.unitId });
      ${P}.ui.getState().pushModal('part-detail', { unitId: window.__t24.unitId, panelId: back.id });
      return true;
    `);
    await page.waitFor('document.querySelector(\'[data-part-drawing="1"]\')', { what: 'the part detail' });
    await page.sleep(900);

    // F7 — a real wheel over the drawing.
    const box = await page.evaluate(`
      const r = document.querySelector('[data-part-drawing="1"]').getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    `);
    const viewBefore = await page.evaluate('return document.querySelector(\'[data-part-drawing="1"] svg\').getAttribute("viewBox");');
    await page.wheel(box.x, box.y, -120, 5);
    const viewAfter = await page.evaluate('return document.querySelector(\'[data-part-drawing="1"] svg\').getAttribute("viewBox");');
    measurements.zoom = { before: viewBefore, after: viewAfter };
    check('F7.1 — the wheel zooms the detail', viewBefore !== viewAfter, `${viewBefore} → ${viewAfter}`);
    await shot('7a-detail-zoomed');
    await page.click('[data-part-fit="1"]');
    await page.sleep(400);
    const viewFit = await page.evaluate('return document.querySelector(\'[data-part-drawing="1"] svg\').getAttribute("viewBox");');
    check('F7.1 — ⌂ fits it back', viewFit === viewBefore, `${viewFit}`);

    // ─── F10.1 — a real hover, and it HOLDS ────────────────────────────────
    //
    // ONE feature is chosen and everything below happens on it: hovered,
    // clicked, deleted. It is chosen by its own ID rather than by whichever
    // pixel happened to be biggest, so two runs of this walk do the same thing.
    const sheetBox = await page.evaluate(`
      const r = document.querySelector('[data-part-drawing="1"]').getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) };
    `);

    // ─── THE ZOOM COMES FIRST, AND THEN THE FEATURE IS CHOSEN ───────────────
    //
    // Two reasons, and both are the drawing's own rather than the walk's. The
    // MAGNET is five millimetres of SHEET: at the fit zoom a 2 150 mm side is
    // about 5 mm per pixel, so five millimetres is under one pixel and no hand
    // could stay inside it — which is not a fault in the magnet, it is what
    // "sheet-space" means, and it is why a joiner reading a feature has zoomed
    // in on it. And a feature is only pointable when the WHOLE of it is in the
    // window, so it is chosen after the view has settled rather than before.
    await page.wheel(
      Math.round((sheetBox.left + sheetBox.right) / 2),
      Math.round((sheetBox.top + sheetBox.bottom) / 2),
      -120,
      4,
    );
    await page.sleep(500);
    const scaled = await page.evaluate(`
      const svg = document.querySelector('[data-part-drawing="1"] svg');
      const box = svg.getAttribute('viewBox').split(' ').map(Number);
      const r = svg.getBoundingClientRect();
      return { mmPerPx: +(box[2] / r.width).toFixed(3) };
    `);

    /** The first machining whose WHOLE box is inside the window, and where it is. */
    const visibleFeature = async () => page.evaluate(`
      const wrap = document.querySelector('[data-part-drawing="1"]');
      const w = wrap.getBoundingClientRect();
      for (const el of [...wrap.querySelectorAll('[data-machining]')]) {
        const r = el.parentNode.getBoundingClientRect();
        if (r.left > w.left + 12 && r.right < w.right - 12 && r.top > w.top + 12 && r.bottom < w.bottom - 12
            && r.width > 6 && r.height > 6) {
          return { id: el.getAttribute('data-machining'),
                   x: Math.round((r.left + r.right) / 2), y: Math.round((r.top + r.bottom) / 2) };
        }
      }
      return null;
    `);
    /** …and where ONE named feature is, now. */
    const whereIs = async (id) => page.evaluate(`
      const el = document.querySelector('[data-part-drawing="1"] [data-machining="${id}"]');
      if (!el) return null;
      const r = el.parentNode.getBoundingClientRect();
      return { x: Math.round((r.left + r.right) / 2), y: Math.round((r.top + r.bottom) / 2) };
    `);

    const feature = await visibleFeature();

    if (feature) {
      const twitchPx = Math.max(1, Math.round(3 / scaled.mmPerPx));
      measurements.hoverMagnet = { ...scaled, twitchPx, mm: +(twitchPx * scaled.mmPerPx).toFixed(2) };
      const at = feature;
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
      await page.sleep(500);
      const arrows = await page.evaluate('return document.querySelectorAll(\'[data-hover-dim]\').length;');
      check('F8.1 — hovering a feature draws dimension ARROWS, not a caption',
        arrows >= 2, `${arrows} dimensions`);
      await shot('10a-hover-dimensions');
      await shot('10b-hover-dimensions-close-up', {
        x: Math.max(0, at.x - 220), y: Math.max(0, at.y - 160), width: 440, height: 320, scale: 3,
      });

      // ─── F10.1: THE MAGNET ───
      // A twitch of about three millimetres off the feature. Turn 23's set
      // vanished the instant the pointer left the hairline; turn 24's stays,
      // because three is inside five.
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x + twitchPx, y: at.y + twitchPx });
      await page.sleep(300);
      const held = await page.evaluate('return document.querySelectorAll(\'[data-hover-dim]\').length;');
      check('F10.1 — a twitch of ~3 mm does NOT take the arrows away',
        held >= 2, `${held} dimensions still drawn, ${twitchPx} px = ${measurements.hoverMagnet.mm} mm`);

      // …and a real departure does.
      const farPx = Math.round(40 / scaled.mmPerPx) + 20;
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x + farPx, y: at.y + farPx });
      await page.sleep(400);
      const gone = await page.evaluate('return document.querySelectorAll(\'[data-hover-dim]\').length;');
      check('F10.1 — …and leaving the radius does', gone === 0, `${gone} dimensions`);
    } else {
      blocked('F8.1 + F10.1 — hovering a feature', 'this part carries no machining to hover');
    }

    // ─── F2 — THE PENCIL DRAWS, WITH A REAL MOUSE ──────────────────────────
    //
    // The mock is the law. Everything below is real pointer input on the
    // drawing board — and it is done at the ZOOM a joiner actually sets out at,
    // which is what makes a 5 mm magnet a 5 mm magnet rather than a fifth of a
    // pixel.
    // The file is PARSED, entity by entity, rather than grepped: a hidden
    // pocket and a drawn line are both polylines, and a count that netted them
    // off against each other would report "no change" for two changes.
    const readExport = `
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t24.unitId);
      const f = window.__ccDxf.buildUnitDxfFiles(r, ${P}.profile.getState().profile)
        .find((x) => x.name.indexOf(window.__t24.panelId) >= 0);
      const ents = window.__ccDxf.parseDxf(f.dxf).entities;
      const by = {};
      for (const e of ents) { const k = e.type + '/' + e.layer; by[k] = (by[k] || 0) + 1; }
      return { name: f.name, length: f.dxf.length, total: ents.length,
               openPolys: ents.filter((e) => e.type === 'poly' && !e.closed).length,
               circles: ents.filter((e) => e.type === 'circle').length, by };
    `;
    const exportBefore = await page.evaluate(readExport);

    // ── F2.1: the toolbar is the mock's, and it starts on Select ──
    const toolbar = await page.evaluate(`
      const btns = [...document.querySelectorAll('[data-part-tool]')].map((b) => b.getAttribute('data-part-tool'));
      const armed = document.querySelector('[data-tool-armed]');
      const snaps = [...document.querySelectorAll('[data-snap-kind]')].map((b) => b.getAttribute('data-snap-kind'));
      return { btns, armed: armed && armed.getAttribute('data-part-tool'), snaps };
    `);
    check('F2.1 — Select · Drill · Line · Dowel line, and it opens on Select',
      toolbar.btns.join(',') === 'select,drill,line,dowels' && toolbar.armed === 'select',
      JSON.stringify(toolbar.btns));
    check('F2.3 — the snap panel offers the eight kinds',
      toolbar.snaps.join(',') === 'END,MID,CEN,NODE,QUAD,INT,PER,NEA', JSON.stringify(toolbar.snaps));

    // ── F2.2: Select picks a real feature, Delete takes it off the print ──
    if (feature) {
      // The feature is located AGAIN rather than clicked where it used to be:
      // the view has been zoomed since, and a walk that remembered a pixel
      // would be a walk that clicks the wrong hole.
      const clickAt = (await whereIs(feature.id)) || feature;
      // The move and the press are separate gestures with a settle between
      // them: hovering the feature RAISES its dimension arrows, and this walk
      // is the thing that found out what happens when the click lands while
      // that ink is still being painted — see the pointer-events note in
      // `PartDetailModal.jsx`. It asks for what a joiner does, in the order a
      // joiner does it.
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: clickAt.x, y: clickAt.y });
      await page.sleep(350);
      for (const type of ['mousePressed', 'mouseReleased']) {
        await page.send('Input.dispatchMouseEvent', {
          type, x: clickAt.x, y: clickAt.y, button: 'left', clickCount: 1, buttons: 1,
        });
      }
      // Waiting for the CONDITION rather than for a stopwatch: React commits
      // when it commits, and a sleep long enough on this machine is a sleep too
      // short on a busier one.
      let pickedOk = 0;
      try {
        await page.waitFor('document.querySelectorAll("[data-picked]").length === 1',
          { what: 'the feature to be selected', timeout: 6000 });
        pickedOk = 1;
      } catch { pickedOk = 0; }
      measurements.select = {
        clickAt,
        id: feature.id,
        ...(await page.evaluate(`
          const el = document.querySelector('[data-part-prompt="1"]');
          const one = document.querySelector('[data-picked]');
          return { prompt: el ? el.textContent.trim().slice(0, 60) : null,
                   picked: document.querySelectorAll('[data-picked]').length,
                   pickedId: one ? one.getAttribute('data-machining') : null };
        `)),
      };
      check('F2.2 — a real click SELECTS the feature under it',
        pickedOk === 1 && measurements.select.pickedId === feature.id,
        `${measurements.select.picked} selected: ${measurements.select.pickedId}`);
      await page.click('[data-delete-feature="1"]');
      await page.sleep(450);
      const afterDelete = await page.evaluate('const el = document.querySelector("[data-hand-edited]"); return el ? el.getAttribute("data-hand-edited") : "0";');
      check('F2.2 — …and Delete takes it off this print', Number(afterDelete) === 1, `${afterDelete} change`);
    }

    /** The drawing's own rectangle, for aiming the mouse at it. */
    const sheet = await page.evaluate(`
      const r = document.querySelector('[data-part-drawing="1"]').getBoundingClientRect();
      return { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
               cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
    `);

    // ── F2.3: arm the DRILL, and the cursor carries an osnap marker ──
    await page.click('[data-part-tool="drill"]');
    await page.sleep(250);
    // Aim at a MACHINING's own centre. That is a CEN — the top of CLAUDE.md's
    // own priority chain — and it is a point well inside the board, which is
    // what makes this step say the same thing on every run. The chain itself is
    // proved exhaustively in test/turn24-f2-part-editor.test.js; what a walk
    // can add is that the marker really appears under a real cursor.
    // A DIFFERENT feature from the one F2.2 just deleted — that one is off this
    // print now, which is the whole point of the step before this one.
    // …and a feature that is still there: F2.2 deleted the one it clicked, and
    // one wholly inside the window, so the pointer can reach its centre.
    const snapAt = await visibleFeature();
    if (snapAt) {
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: snapAt.x, y: snapAt.y });
      await page.sleep(400);
      const marker = await page.evaluate(`
        const el = document.querySelector('[data-snap-marker]');
        return { kind: el ? el.getAttribute('data-snap-marker') : null };
      `);
      // WHAT A WALK CAN PROVE HERE, and what it cannot. The PRIORITY CHAIN —
      // `CEN/END > MID > INT > PER > NEA` — is arithmetic and is proved
      // exhaustively in `test/turn24-f2-part-editor.test.js`, point by point.
      // What only a real browser can prove is that a real cursor over a real
      // feature RAISES A MARKER, in one of the eight kinds the panel offers,
      // and this is that. Which kind is recorded rather than demanded: a
      // feature has several candidate points and the resolution is the pure
      // module's business.
      const eight = ['END', 'MID', 'CEN', 'NODE', 'QUAD', 'INT', 'PER', 'NEA'];
      measurements.osnap = { ...marker, on: snapAt.id };
      check('F2.3 — a real cursor over a real feature raises an osnap marker',
        eight.includes(marker.kind), `${marker.kind} on ${snapAt.id}`);
      await shot('2b-editor-osnap-close-up', {
        x: Math.max(0, snapAt.x - 200), y: Math.max(0, snapAt.y - 150), width: 400, height: 300, scale: 3,
      });
    } else {
      blocked('F2.3 — the osnap marker', 'this part carries no machining to snap to');
    }

    // ── F2.4: the live dimensions, IN THE MIDDLE of the board ──
    //
    // Not at the corner above: a point ON an edge is zero from that edge, and a
    // dimension of zero is not drawn — which is the drawing office's own rule
    // (`dimensionEntities` refuses anything under `minSpanMm`) and not a gap.
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sheet.cx - 40, y: sheet.cy - 30 });
    await page.sleep(400);
    const live = await page.evaluate(`
      const rows = [...document.querySelectorAll('[data-live-dim]')].map((g) => g.getAttribute('data-live-dim'));
      const diagonal = [...document.querySelectorAll('[data-live-dim] line')].some((l) => {
        const dx = Math.abs(Number(l.getAttribute('x1')) - Number(l.getAttribute('x2')));
        const dy = Math.abs(Number(l.getAttribute('y1')) - Number(l.getAttribute('y2')));
        // An arrowHEAD is a short diagonal by construction; a dimension LINE is
        // not. Anything longer than an arrowhead that is diagonal is the thing
        // F2.4 forbids.
        return dx > 12 && dy > 12;
      });
      return { rows, diagonal };
    `);
    measurements.live = live;
    check('F2.4 — the live dimensions are drawn while the tool is armed',
      live.rows.length >= 2, `${live.rows.length} live dimensions: ${JSON.stringify(live.rows)}`);
    check('F2.4 — …and every one of them is HORIZONTAL or VERTICAL, never diagonal',
      live.diagonal === false, `diagonal segment found: ${live.diagonal}`);
    await shot('2a-editor-osnap-and-live-dimensions');

    // ── F2.5 + F2.6: type a NUMBER mid-flight, and the drill asks once ──
    measurements.sheet = sheet;
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sheet.cx, y: sheet.cy });
    await page.sleep(200);
    // NOTHING has been placed yet, so nothing may have been asked yet — which
    // is half of what F2.6 says. It is asserted rather than assumed because the
    // step below waits for a popover, and a popover that was already up would
    // let that wait pass while proving nothing.
    const askedEarly = await page.evaluate(`
      const el = document.querySelector('[data-drill-popover="1"]');
      return { open: Boolean(el), at: el ? el.getAttribute('data-drill-at') : null };
    `);
    check('F2.6 — the drill has asked NOTHING before the first placement',
      askedEarly.open === false, JSON.stringify(askedEarly));
    // The FIRST digit is a raw key, because that is the gesture under test: with
    // a tool armed and nothing focused, typing a digit OPENS the entry. The rest
    // go in as text, which is what a browser does once the input has the caret —
    // `Input.insertText` is CDP's own and the browser composes the `input` event
    // itself, exactly as it does for a keyboard.
    await page.key('3', { code: 'Digit3', windowsVirtualKeyCode: 51 });
    await page.sleep(200);
    await page.send('Input.insertText', { text: '7' });
    await page.sleep(200);
    const entry = await page.evaluate(`
      const el = document.querySelector('[data-typed-value="1"]');
      return { open: Boolean(document.querySelector('[data-typed-entry="1"]')), value: el ? el.value : null };
    `);
    measurements.typed = entry;
    check('F2.5 — typing a digit opens the in-flight number at the cursor',
      entry.open && entry.value === '37', JSON.stringify(entry));
    await shot('2c-editor-the-number-in-flight');
    await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
    // Waiting for the OBJECT rather than for a stopwatch, which is this walk's
    // own discipline: a sleep long enough on this machine is a sleep too short
    // on a busier one.
    let popover = true;
    try {
      await page.waitFor('document.querySelector(\'[data-drill-popover="1"]\')',
        { what: 'the drill popover', timeout: 8000 });
    } catch { popover = false; }
    check('F2.6 — the FIRST drill asks ⌀ and depth, once, in a popover', popover, String(popover));
    // …and it is holding the point the NUMBER decided, not the point the mouse
    // was over. Read off the popover itself, before a single button is pressed:
    // this is F2.5's whole claim, and asserting it here rather than after the
    // stamp keeps the two contracts from covering for each other.
    const holding = await page.evaluate(`
      const el = document.querySelector('[data-drill-popover="1"]');
      return el ? el.getAttribute('data-drill-at') : null;
    `);
    measurements.typedPending = holding;
    await shot('2d-editor-drill-popover');

    // ── THE POPOVER STAYS WHERE THE HAND CAN REACH IT ──────────────────────
    //
    // This step exists because the walk caught the opposite. The popover is a
    // sibling of the drawing, so moving the cursor ONTO it is moving the
    // cursor OFF the sheet — and while the box was anchored to the LIVE
    // pointer, that leave-event sent it to the default corner, out from under
    // the hand already travelling towards Stamp. The click then went through
    // to the drawing behind it and re-pointed the very hole the popover was
    // asking about. So: reach for the button, and measure whether the button
    // is still there.
    const boxOf = `
      const p = document.querySelector('[data-drill-popover="1"]');
      const b = document.querySelector('[data-drill-confirm="1"]');
      const r = (el) => { const x = el.getBoundingClientRect();
        return { l: Math.round(x.left), t: Math.round(x.top), w: Math.round(x.width), h: Math.round(x.height) }; };
      return { popover: p ? r(p) : null, stamp: b ? r(b) : null };
    `;
    const boxBefore = await page.evaluate(boxOf);
    if (boxBefore.stamp) {
      await page.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: boxBefore.stamp.l + boxBefore.stamp.w / 2,
        y: boxBefore.stamp.t + boxBefore.stamp.h / 2,
      });
      await page.sleep(400);
    }
    const boxAfter = await page.evaluate(boxOf);
    measurements.popoverBox = { before: boxBefore, after: boxAfter };
    check('F2.6 — reaching for Stamp does not move Stamp',
      JSON.stringify(boxBefore) === JSON.stringify(boxAfter),
      `${JSON.stringify(boxBefore.stamp)} → ${JSON.stringify(boxAfter.stamp)}`);
    if (popover) {
      // Clicked until it takes. A single click is the gesture; a browser that
      // was mid-layout when it landed is not a fact about the app, and a walk
      // that reported one as a failure would be reporting on the container.
      for (let i = 0; i < 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const still = await page.evaluate('return Boolean(document.querySelector(\'[data-drill-popover="1"]\'));');
        if (!still) break;
        // eslint-disable-next-line no-await-in-loop
        await page.click('[data-drill-confirm="1"]');
        // eslint-disable-next-line no-await-in-loop
        await page.sleep(350);
      }
      const closed = await page.evaluate('return !document.querySelector(\'[data-drill-popover="1"]\');');
      check('F2.6 — Stamp takes the answer and the popover goes', closed, String(closed));
    }
    const afterDrill = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t24.unitId);
      const ops = ((u.params.part_edits || {})[window.__t24.panelId] || {}).ops || [];
      return { ops: ops.length, kinds: ops.map((o) => o.op), drill: ops.find((o) => o.op === 'drill') || null };
    `);
    measurements.drawn = afterDrill;
    // The LAW, not one edge of it: the point lands 37 mm from the NEAREST edge
    // on the axis the hand was nearest to — which on this side panel is the
    // right-hand edge, so the stored x is `width − 37`.
    const partSize = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t24.unitId);
      const p = r.panels.find((x) => x.id === window.__t24.panelId);
      return { w: Number(p.cnc.drawn_w) || p.w, h: Number(p.cnc.drawn_h) || p.h };
    `);
    const off = afterDrill.drill
      ? Math.min(
        Math.min(afterDrill.drill.x, partSize.w - afterDrill.drill.x),
        Math.min(afterDrill.drill.y, partSize.h - afterDrill.drill.y),
      )
      : null;
    measurements.typedPlacement = { drill: afterDrill.drill, partSize, off };
    // The hole that got stamped is the hole the popover was HOLDING — the two
    // reads are taken at opposite ends of the gesture, and a mismatch is the
    // walk's own name for a point that changed under the question.
    check('F2.6 — the hole that is stamped is the hole the popover was holding',
      Boolean(afterDrill.drill) && `${afterDrill.drill.x},${afterDrill.drill.y}` === holding,
      `${holding} → ${afterDrill.drill ? `${afterDrill.drill.x},${afterDrill.drill.y}` : 'nothing'}`);
    check('F2.5 — Enter placed the hole 37 mm from the NEAREST edge',
      off === 37, `${JSON.stringify(afterDrill.drill)} on ${partSize.w}×${partSize.h} ⇒ ${off} mm`);

    // …and the SECOND drill just stamps: the popover is not asked again.
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sheet.cx + 60, y: sheet.cy + 40 });
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.send('Input.dispatchMouseEvent', {
        type, x: sheet.cx + 60, y: sheet.cy + 40, button: 'left', clickCount: 1, buttons: 1,
      });
    }
    await page.sleep(400);
    const stamped = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t24.unitId);
      const ops = ((u.params.part_edits || {})[window.__t24.panelId] || {}).ops || [];
      return { ops: ops.length, popover: Boolean(document.querySelector('[data-drill-popover="1"]')) };
    `);
    check('F2.6 — …and it STAMPS from there on, without asking again',
      stamped.ops === afterDrill.ops + 1 && !stamped.popover, JSON.stringify(stamped));

    // ── F2.1: Esc goes back to Select ──
    await page.key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
    await page.sleep(300);
    const disarmed = await page.evaluate(`
      const el = document.querySelector('[data-tool-armed]');
      return el ? el.getAttribute('data-part-tool') : null;
    `);
    check('F2.1 — Esc returns to Select', disarmed === 'select', String(disarmed));

    // ── F2: a LINE — two real clicks ──
    await page.click('[data-part-tool="line"]');
    await page.sleep(200);
    for (const [dx, dy] of [[-120, -60], [110, 70]]) {
      const x = sheet.cx + dx;
      const y = sheet.cy + dy;
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await page.sleep(150);
      for (const type of ['mousePressed', 'mouseReleased']) {
        await page.send('Input.dispatchMouseEvent', {
          type, x, y, button: 'left', clickCount: 1, buttons: 1,
        });
      }
      await page.sleep(250);
    }
    await page.sleep(350);

    // ── F2: a DOWEL LINE — two more ──
    await page.click('[data-part-tool="dowels"]');
    await page.sleep(200);
    for (const [dx, dy] of [[-110, 80], [120, 80]]) {
      const x = sheet.cx + dx;
      const y = sheet.cy + dy;
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await page.sleep(150);
      for (const type of ['mousePressed', 'mouseReleased']) {
        await page.send('Input.dispatchMouseEvent', {
          type, x, y, button: 'left', clickCount: 1, buttons: 1,
        });
      }
      await page.sleep(250);
    }
    await page.sleep(450);

    const drawn = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t24.unitId);
      const ops = ((u.params.part_edits || {})[window.__t24.panelId] || {}).ops || [];
      return { ops: ops.length, kinds: ops.map((o) => o.op) };
    `);
    measurements.drawnOps = drawn;
    check('F2 — a LINE and a DOWEL LINE, each drawn with two real clicks',
      drawn.kinds.includes('line') && drawn.kinds.includes('dowels'), JSON.stringify(drawn.kinds));
    const badge = await page.evaluate('const el = document.querySelector("[data-hand-edited]"); return el ? el.getAttribute("data-hand-edited") : null;');
    check('F2 — the part wears its badge, and it counts every one of them',
      Number(badge) === drawn.ops, `${badge} changes`);
    await shot('2e-editor-drawn-by-hand');

    // ── F2.8: the CNC contract — the export carries what was drawn ──
    const exportAfter = await page.evaluate(readExport);
    measurements.export = { before: exportBefore, after: exportAfter };
    // A MARK is an open two-point polyline (`cnc/dxf.js`), and the drawn line
    // is the only one on this part — the pocket that was deleted was a CLOSED
    // one, so the two cannot be confused.
    check('F2.8 — the EXPORT carries the drawn LINE, as an open polyline',
      exportAfter.openPolys > exportBefore.openPolys,
      `open polys ${exportBefore.openPolys} → ${exportAfter.openPolys}`);
    check('F2.8 — …and the DOWEL ROW, as a row of holes',
      exportAfter.circles >= exportBefore.circles + 3,
      `circles ${exportBefore.circles} → ${exportAfter.circles}`);

    await page.click('[data-back-to-computed="1"]');
    await page.sleep(600);
    const restored = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t24.unitId);
      const f = window.__ccDxf.buildUnitDxfFiles(r, ${P}.profile.getState().profile)
        .find((x) => x.name.indexOf(window.__t24.panelId) >= 0);
      return { length: f.dxf.length, circles: (f.dxf.match(/CIRCLE/g) || []).length };
    `);
    check('F2.8 — "Back to computed" restores the part exactly',
      restored.length === exportBefore.length && restored.circles === exportBefore.circles,
      `${restored.length} vs ${exportBefore.length} bytes`);
    await shot('2f-editor-back-to-computed');

    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ── the cabinet grows its partitions, for F5, F8, F10 and F11 ──────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t24.unitId);
      s.updateUnitParams(u.id, { width: 1400 });
      s.addPartition(u.id, 600);
      s.addPartition(u.id, 800);
      return true;
    `);
    await page.sleep(1200);

    // ─── F5: DOORS ON PARTITIONS SHOW THEIR HINGES ─────────────────────────
    //
    // The owner's own case: partitions at 600 and 800, three bays, a door in
    // each. Every leaf gets one hinge per drilled centre, and the plate lands
    // on the face the leaf closes against — which is the bug: before this turn
    // a side-hung bay door's plate was drawn one board OUTSIDE the cabinet.
    await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t24.unitId);
      s.updateUnitParams(u.id, {
        width: 1400,
        partition_front_mm: 0,
        bay_doors: [{ door: 'one', hinge: 'L' }, { door: 'one', hinge: 'L' }, { door: 'one', hinge: 'R' }],
      });
      for (const p of (u.params.sections?.[0]?.items || []).filter((i) => i.kind === 'partition')) {
        s.updateItem(u.id, p.id, { front_mm: 0 });
      }
      ${P}.ui.getState().setHideFronts(false);
      return true;
    `);
    await page.sleep(1800);
    const bayHinges = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t24.unitId);
      const leaves = r.panels.filter((p) => p.part === 'FRONT');
      const centres = r.drillSummary.hinge_centers || [];
      const rows = ${P}.hardware.of('hinge');
      const bodies = ${P}.hardware.of('hingeBody');
      const perLeaf = leaves.map((p) => ({
        id: p.id, on: p.meta.hingeOn || null, face: p.meta.hingeFace || null,
        mounted: rows.filter((h) => h.key === p.id).length,
      }));
      return { centres: centres.length, leaves: leaves.length, perLeaf, bodies: bodies.length };
    `);
    measurements.bayHinges = bayHinges;
    check('F5.2 — mounted hinge instances == hinge_centers for EVERY leaf',
      bayHinges.leaves > 0 && bayHinges.perLeaf.every((l) => l.mounted === bayHinges.centres),
      JSON.stringify(bayHinges.perLeaf));
    check('F5.1 — …including the leaves hung on a PARTITION',
      bayHinges.perLeaf.some((l) => l.on && l.on.startsWith('VPART') && l.mounted === bayHinges.centres),
      JSON.stringify(bayHinges.perLeaf.filter((l) => l.on && l.on.startsWith('VPART'))));
    await shot('5a-partition-doors-with-their-hinges');

    // ── F10 + F11: the partitions, hovered and measured ────────────────────
    await page.evaluate(`
      ${P}.ui.getState().setHideFronts(true);
      ${P}.ui.getState().selectUnit(window.__t24.unitId);
      ${P}.ui.getState().setPanelSection('contents', true);
      return true;
    `);
    await page.sleep(1400);
    const partAtScene = await page.evaluate(rectOfJs('room', 'o.userData && o.userData.ccPanelId === "VPART-1"'));
    if (partAtScene) {
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: partAtScene.x, y: partAtScene.y });
      await page.sleep(600);
      const bays = await page.evaluate(`
        const v = ${P}.views.room; let n = 0; let magnet = 0;
        v.scene.traverse((o) => {
          if (o.userData && o.userData.ccHoverDimension) n += 1;
          if (o.userData && o.userData.ccHoverMagnet) magnet += 1;
        });
        return { n, magnet };
      `);
      check('F8.2 — hovering a partition draws the clear bays', bays.n >= 1, `${bays.n} dimension groups`);
      check('F10.1 — …and a magnet volume is mounted WITH them, never before',
        bays.magnet === 1, `${bays.magnet} magnet`);
      await shot('10c-scene-hover-bay-widths');
    } else {
      blocked('F8.2 — hovering a partition', 'the partition is not on screen');
    }

    // ─── F11: display chains, storage absolute ─────────────────────────────
    const chain = await page.evaluate(`
      const fields = [...document.querySelectorAll('[data-partition-chain]')];
      return fields.map((f) => ({ id: f.getAttribute('data-partition-chain'), value: f.value }));
    `);
    measurements.chainBefore = chain;
    check('F11.1 — every partition shows a distance from its LEFT neighbour',
      chain.length >= 2 && chain.every((c) => /\d/.test(String(c.value))), JSON.stringify(chain));

    if (chain.length >= 2) {
      const storedBefore = await page.evaluate(`
        const s = ${P}.project.getState();
        const u = s.units.find((x) => x.id === window.__t24.unitId);
        return (u.params.sections[0].items || []).filter((i) => i.kind === 'partition').map((i) => i.x_mm);
      `);
      // TYPE a new number into P1's field, with a real keyboard.
      const sel = '[data-partition-chain="' + chain[0].id + '"]';
      await page.click(sel);
      await page.key('a', { ctrl: true });
      await page.send('Input.insertText', { text: String(Number(chain[0].value) + 60) });
      await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
      await page.sleep(700);
      const after = await page.evaluate(`
        const s = ${P}.project.getState();
        const u = s.units.find((x) => x.id === window.__t24.unitId);
        const stored = (u.params.sections[0].items || []).filter((i) => i.kind === 'partition').map((i) => i.x_mm);
        const fields = [...document.querySelectorAll('[data-partition-chain]')].map((f) => f.value);
        return { stored, fields };
      `);
      measurements.chainAfter = { storedBefore, ...after };
      check('F11.1 — moving P1 leaves P2’s STORED position exactly where it was',
        after.stored[1] === storedBefore[1] && after.stored[0] !== storedBefore[0],
        `stored ${JSON.stringify(storedBefore)} → ${JSON.stringify(after.stored)}`);
      check('F11.1 — …and only the NUMBER P2 displays changes — no cascade',
        Number(after.fields[1]) !== Number(chain[1].value),
        `shown ${chain[1].value} → ${after.fields[1]}`);
      await shot('11a-partition-chain');
    }

    // ── F6 + F7 + F8 + F9: the fix shelf and the partition, on the sheet ────
    const shelfProbe = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t24.unitId);
      const items = u.params.sections[0].items || [];
      const shelf = items.find((i) => i.kind === 'shelf');
      if (shelf) s.setShelfVariant(u.id, shelf.id, 'fixed');
      else s.addItem(u.id, { kind: 'shelf', pos_mm: 900, variant: 'fixed' });
      return true;
    `);
    await page.sleep(900);
    const shelfFacts = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t24.unitId);
      const shelf = r.panels.find((p) => p.part === 'SHELF');
      const part = r.panels.find((p) => p.part === 'VPART');
      const label = window.__ccDxf.buildUnitDxfFiles(r, ${P}.profile.getState().profile)
        .find((x) => x.name.indexOf('SHELF') >= 0);
      return {
        shelfW: shelf ? shelf.w : null,
        light: r.params.width - 2 * r.params.board_t,
        screws: r.drills.filter((d) => d.kind === 'shelf_screw').length,
        pins: r.drills.filter((d) => d.layer === 'SHELVES_7_5MM').length,
        marks: r.panels.filter((p) => p.cnc && p.cnc.marks && p.cnc.marks.length).map((p) => p.id),
        partitionDrawn: part ? [part.cnc.drawn_w, part.cnc.drawn_h] : null,
        partitionBox: part ? [part.box.d, part.box.h] : null,
        label: label ? (label.dxf.indexOf('(FIX)') >= 0) : false,
      };
    `);
    measurements.shelf = shelfFacts;
    check('F7.3 — ZERO ⌀7.5 anywhere once the shelf is FIX', shelfFacts.pins === 0, `${shelfFacts.pins} pins`);
    check('F7.1 — the joint is screws AND biscuits, on both bearing faces',
      shelfFacts.screws > 0 && shelfFacts.marks.length >= 2, JSON.stringify(shelfFacts.marks));
    check('F8.1 — the partition is drawn depth × height, the sides’ own convention',
      shelfFacts.partitionDrawn && shelfFacts.partitionDrawn[0] === shelfFacts.partitionBox[0]
      && shelfFacts.partitionDrawn[1] === shelfFacts.partitionBox[1],
      JSON.stringify(shelfFacts.partitionDrawn));
    check('F9 — the shelf’s own file says which kind it is', shelfFacts.label, '(FIX) in the DXF');

    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(1800);
    await shot('7a-fix-shelf-and-partition-sheet');

    // ── R5 + R6, as an assertion at the end ────────────────────────────────
    const errs = realErrors(page.errors);
    check('R5 + R6 — the console is clean across the whole walk', errs.length === 0,
      errs.slice(0, 3).join(' | ') || 'no errors, no React exceptions');

    // The console, verbatim — and SAYING SO when there is nothing in it. A
    // zero-byte file is indistinguishable from a capture that never ran, and
    // "the app said nothing" is the finding, not the absence of one.
    const lines = page.consoleLines.map((l) => `${l.level}  ${l.text}`);
    writeFileSync(`${OUT}console.txt`, [
      `# every console message of the turn-24 walk — ${lines.length} in total`,
      `# uncaught exceptions and React error-boundary reports: ${errs.length}`,
      ...(lines.length ? lines : ['(the app printed nothing across the whole walk)']),
      '',
    ].join('\n'));
    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify(measurements, null, 1)}\n`);
  } catch (e) {
    check('the walk ran to the end', false, e.message);
  } finally {
    const passed = steps.filter((s) => s.ok === true).length;
    const failed = steps.filter((s) => s.ok === false).length;
    const skipped = steps.filter((s) => s.ok === null).length;
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify({
      turn: 24,
      url: BASE,
      showroom: showroom.url,
      rules: {
        R1: 'every click, move, wheel and keystroke is CDP Input; the guard at the top of this file enforces it',
        R2: 'scripts/bucket-live.mjs, before any picture of hardware',
        R4: 'hardware urls, counts, MEMBERS, node names and the fold pivot read from window.__cc.hardware',
        R5: 'the console is captured for the whole walk',
        R6: 'any uncaught error or React error-boundary report FAILS the step it appeared in',
        R7: 'no data-* on R3F objects — asserted in test/turn23-f2-f4-hardware.test.js and test/turn24-f8-f12.test.js',
        R8: 'GLB-dependent steps run against the synthetic silent showroom, whose nodes carry the real export’s own bau… names',
      },
      totals: { passed, failed, skipped },
      steps,
      errors: realErrors(page.errors),
    }, null, 1)}\n`);
    console.log(`\n${passed} ok · ${failed} failed · ${skipped} blocked`);
    await page.close();
    await showroom.close();
    process.exit(failed ? 1 : 0);
  }
}

main();
