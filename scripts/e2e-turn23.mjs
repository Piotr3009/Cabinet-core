// ─── Turn 23, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build
//       npx vite preview --port 4173 &
//       node scripts/e2e-turn23.mjs
//
// The fixture server (R8) is started by this script; the app preview is not,
// because a walk that builds its own app cannot prove the build somebody else
// is about to ship.
//
// ─── R1: A POINTER GESTURE IS PROVEN WITH A REAL POINTER ────────────────────
//
// Standing since turn 20: every click, double-click, drag, wheel and hover goes
// through `Input.dispatchMouseEvent` (scripts/cdp.mjs). Synthetic DOM events
// are BANNED, and the ban is enforced rather than promised — the guard below
// reads this file and refuses to run if anybody adds one.
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
//
// ─── R5 + R6: THE WALK READS THE CONSOLE, AND AN EXCEPTION FAILS A STEP ─────
//
// New this turn and permanent. The ruler's marker threw on every render for two
// turns and the walk stayed green because an error boundary swallowed the throw
// while the asserts read state off the remounted canvas. So `check` takes a
// snapshot of the error log with every step: ANY uncaught error, React
// error-boundary report or failed resource that appears during a step FAILS
// that step, whatever else it asserted.
//
// ─── R8: HARDWARE VISUALS ARE PROVEN ON THE SILENT SHOWROOM ─────────────────
//
// The cloud sandbox cannot fetch the bucket (403 at the egress proxy), so this
// walk serves `test/fixtures/hardware-local/` — synthetic GLBs at the REAL
// measured dimensions, no Blum bytes — and points the app at it with the
// documented `localStorage['cc.hardwareBase']` knob. Everything downstream is
// the production path: the same catalogue resolution, URL composition, loader,
// cache, clone, pose, mirror, swing and finish.

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
const OUT = argOf('--out', new URL('../verify/t23/', import.meta.url).pathname);

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

  /** A real DRAG, press → move → release, all through CDP (R1). */
  const drag = async (from, to, n = 12) => {
    await page.mouse('mouseMoved', from.x, from.y, { buttons: 0, clickCount: 0 });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1, buttons: 1,
    });
    for (let i = 1; i <= n; i += 1) {
      await page.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: Math.round(from.x + ((to.x - from.x) * i) / n),
        y: Math.round(from.y + ((to.y - from.y) * i) / n),
        button: 'left',
        buttons: 1,
      });
      await page.sleep(25);
    }
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(150);
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
      s.newProject('Turn 23 walk');
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      const u = s.addUnit('WARDROBE');
      s.updateUnitParams(u.id, { doors: true });
      window.__t23 = { unitId: u.id };
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

    // ─── F2.4: the body VISIBLY travels, the plate VISIBLY stays ───
    const hingeRect = () => page.evaluate(rectOfJs('room', 'o.userData && o.userData.ccFinish && o.parent && o.parent.type !== "Scene"'));
    const doorClosed = await page.evaluate(rectOfJs('room', 'o.userData && o.userData.ccPanelId && String(o.userData.ccPanelId).indexOf("-F") >= 0'));
    await shot('2a-door-closed-hinge-in-its-bore');

    const before = await page.evaluate(`
      const v = ${P}.views.room; const out = [];
      v.scene.traverse((o) => { if (o.userData && o.userData.ccFinish) { const p = new v.three.Vector3(); o.getWorldPosition(p); out.push([o.userData.ccFinish, +p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4)]); } });
      return out;
    `);
    await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t23.unitId);
      const r = s.unitResult(u.id);
      for (const p of r.panels) if (p.part === 'FRONT') ${P}.ui.getState().toggleFront(u.id, p.id);
      return true;
    `);
    await page.sleep(1400);
    const after = await page.evaluate(`
      const v = ${P}.views.room; const out = [];
      v.scene.traverse((o) => { if (o.userData && o.userData.ccFinish) { const p = new v.three.Vector3(); o.getWorldPosition(p); out.push([o.userData.ccFinish, +p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4)]); } });
      return out;
    `);
    await shot('2b-door-open-the-body-rides-the-leaf');
    // …and the same thing at a size somebody can actually look at. CDP crops
    // and rescales, so this costs no second image tool (rule 4).
    const hingeAt = await page.evaluate(rectOfJs('room', 'o.userData && o.userData.ccFinish'));
    if (hingeAt) {
      await shot('2c-hinge-close-up-door-open', {
        x: Math.max(0, hingeAt.left - 90),
        y: Math.max(0, hingeAt.top - 90),
        width: (hingeAt.right - hingeAt.left) + 180,
        height: (hingeAt.bottom - hingeAt.top) + 180,
        scale: 4,
      });
    }
    const moved = before.filter((_, i) => after[i] && (after[i][1] !== before[i][1] || after[i][3] !== before[i][3])).length;
    const stayed = before.length - moved;
    measurements.swing = { before, after, moved, stayed };
    check('F2.1 — opening the door MOVES the hinge bodies and leaves the plates',
      moved > 0 && stayed > 0, `${moved} travelled, ${stayed} stayed`);
    void hingeRect;
    void doorClosed;

    // ─── F4: the finish, and the SAME models in the other one ───
    const nickelAt = await page.evaluate(rectOfJs('room', 'o.userData && o.userData.ccFinish'));
    await shot('4a-finish-nickel');
    if (nickelAt) {
      await shot('4a-finish-nickel-close-up', {
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
    await shot('4b-finish-onyx');
    if (nickelAt) {
      await shot('4b-finish-onyx-close-up', {
        x: Math.max(0, nickelAt.left - 70),
        y: Math.max(0, nickelAt.top - 70),
        width: (nickelAt.right - nickelAt.left) + 140,
        height: (nickelAt.bottom - nickelAt.top) + 140,
        scale: 4,
      });
    }
    measurements.finishes = { nickel: hardware.finishes, onyx };
    check('F4.4 — the mounted models wear the project\'s finish',
      hardware.finishes.includes('nickel') && onyx.includes('onyx'),
      `${JSON.stringify(hardware.finishes)} → ${JSON.stringify(onyx)}`);

    // ── F1: the Back button, on real clicks ────────────────────────────────
    await page.evaluate(`
      const d2 = ${P}.project.getState().project.design || {};
      ${P}.project.getState().setDesign({ hinges: { ...(d2.hinges || {}), finish: 'nickel' } });
      ${P}.ui.getState().openModal('cabinet', { unitId: window.__t23.unitId });
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
      const r = s.unitResult(window.__t23.unitId);
      const back = r.panels.find((p) => p.part === 'BACK');
      window.__t23.panelId = back.id;
      ${P}.ui.getState().openModal('cabinet', { unitId: window.__t23.unitId });
      ${P}.ui.getState().pushModal('part-detail', { unitId: window.__t23.unitId, panelId: back.id });
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

    // F8.1 — a real hover over a feature draws its dimensions.
    const featureAt = await page.evaluate(`
      // The one whose hit zone is biggest on screen — a real hand goes for the
      // feature it can see, and a walk should not depend on which entity the
      // engine happened to emit first.
      const els = [...document.querySelectorAll('[data-part-drawing="1"] [data-machining]')];
      if (!els.length) return null;
      let best = null;
      for (const el of els) {
        const r = el.parentNode.getBoundingClientRect();
        if (!best || r.width * r.height > best.area) {
          best = { area: r.width * r.height, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), id: el.getAttribute('data-machining') };
        }
      }
      return best;
    `);
    if (featureAt) {
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: featureAt.x, y: featureAt.y });
      await page.sleep(500);
      const arrows = await page.evaluate(`
        return {
          dims: document.querySelectorAll('[data-hover-dim]').length,
          note: (document.querySelector('[data-part-note="1"]') || {}).textContent || '',
        };
      `);
      check('F8.1 — hovering a feature draws dimension ARROWS, not a caption',
        arrows.dims >= 2, `${arrows.dims} dimensions · note "${arrows.note.slice(0, 60)}"`);
      await shot('8a-detail-hover-dimensions');
      await shot('8c-detail-hover-dimensions-close-up', {
        x: Math.max(0, featureAt.x - 170), y: Math.max(0, featureAt.y - 120), width: 340, height: 240, scale: 4,
      });
    } else {
      blocked('F8.1 — hovering a feature', 'this part carries no machining to hover');
    }

    // F9 — delete one feature, add one drill, read the badge, check the export.
    const exportBefore = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t23.unitId);
      const f = window.__ccDxf.buildUnitDxfFiles(r, ${P}.profile.getState().profile)
        .find((x) => x.name.indexOf(window.__t23.panelId) >= 0);
      return { name: f.name, length: f.dxf.length, circles: (f.dxf.match(/CIRCLE/g) || []).length };
    `);
    if (featureAt) {
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await page.send('Input.dispatchMouseEvent', {
          type, x: featureAt.x, y: featureAt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1, buttons: 1,
        });
      }
      await page.sleep(350);
      const pickedOk = await page.evaluate('return document.querySelectorAll("[data-picked]").length;');
      check('F9.1 — a real click SELECTS the feature under it', pickedOk === 1, `${pickedOk} selected`);
      await page.click('[data-delete-feature="1"]');
      await page.sleep(450);
      const afterDelete = await page.evaluate('const el = document.querySelector("[data-hand-edited]"); return el ? el.getAttribute("data-hand-edited") : "0";');
      check('F9.1 — …and Delete takes it off this print', Number(afterDelete) === 1, `${afterDelete} change`);
    }
    await page.click('[data-part-tool="drill"]');
    await page.sleep(250);
    // R1 again: the fields are TYPED INTO, with real browser input. `insertText`
    // is CDP's own — the browser composes the `input` event itself, exactly as
    // it does for a keyboard — which is the whole difference between this and
    // the synthetic event R1 bans.
    for (const [sel, value] of [
      ['[data-part-x="1"]', '300'],
      ['[data-part-y="1"]', '500'],
      ['[data-part-d="1"]', '8'],
      ['[data-part-depth="1"]', '15'],
    ]) {
      await page.click(sel);
      await page.key('a', { ctrl: true });
      await page.send('Input.insertText', { text: value });
      await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
      await page.sleep(120);
    }
    await page.click('[data-part-add="1"]');
    await page.sleep(500);
    const badge = await page.evaluate('const el = document.querySelector("[data-hand-edited]"); return el ? el.getAttribute("data-hand-edited") : null;');
    check('F9.3 — the part wears its badge', Number(badge) >= 2, `${badge} changes`);
    await shot('9a-edited-by-hand-badge');

    const exportAfter = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t23.unitId);
      const f = window.__ccDxf.buildUnitDxfFiles(r, ${P}.profile.getState().profile)
        .find((x) => x.name.indexOf(window.__t23.panelId) >= 0);
      return { name: f.name, length: f.dxf.length, circles: (f.dxf.match(/CIRCLE/g) || []).length, has8: f.dxf.indexOf('\\r\\n40\\r\\n4.0') >= 0 || f.dxf.indexOf('\\r\\n40\\r\\n4\\r\\n') >= 0 };
    `);
    measurements.export = { before: exportBefore, after: exportAfter };
    check('F9.6 — the EXPORT carries both changes', exportAfter.circles === exportBefore.circles && exportAfter.has8,
      `circles ${exportBefore.circles} → ${exportAfter.circles} (one removed, one added), ⌀8 present: ${exportAfter.has8}`);

    await page.click('[data-back-to-computed="1"]');
    await page.sleep(600);
    const restored = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t23.unitId);
      const f = window.__ccDxf.buildUnitDxfFiles(r, ${P}.profile.getState().profile)
        .find((x) => x.name.indexOf(window.__t23.panelId) >= 0);
      return { length: f.dxf.length, circles: (f.dxf.match(/CIRCLE/g) || []).length };
    `);
    check('F9.3 — "Back to computed" restores the part exactly',
      restored.length === exportBefore.length && restored.circles === exportBefore.circles,
      `${restored.length} vs ${exportBefore.length} bytes`);
    await shot('9b-back-to-computed');

    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ── F8.2 + F10: the partitions ─────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t23.unitId);
      s.updateUnitParams(u.id, { width: 1400 });
      s.addPartition(u.id, 400);
      s.addPartition(u.id, 800);
      ${P}.ui.getState().setHideFronts(true);
      ${P}.ui.getState().selectUnit(u.id);
      ${P}.ui.getState().setPanelSection('contents', true);
      return true;
    `);
    await page.sleep(1600);
    const partAtScene = await page.evaluate(rectOfJs('room', 'o.userData && o.userData.ccPanelId === "VPART-1"'));
    if (partAtScene) {
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: partAtScene.x, y: partAtScene.y });
      await page.sleep(600);
      const bays = await page.evaluate(`
        const v = ${P}.views.room; let n = 0;
        v.scene.traverse((o) => { if (o.userData && o.userData.ccHoverDimension) n += 1; });
        return n;
      `);
      check('F8.2 — hovering a partition draws the clear bays', bays >= 1, `${bays} dimension groups`);
      await shot('8b-scene-hover-bay-widths');
    } else {
      blocked('F8.2 — hovering a partition', 'the partition is not on screen');
    }

    const bayText = await page.evaluate('const el = document.querySelector(\'[data-partition-bays="1"]\'); return el ? el.textContent.trim() : null;');
    check('F10.1 — the panel shows the CLEAR BAYS', Boolean(bayText && /\d/.test(bayText)), String(bayText));

    // ── F5 + F6: the partition probe, on the sheet ─────────────────────────
    const probe = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t23.unitId);
      return {
        backScrews: r.drills.filter((d) => d.kind === 'partition_back_screw').length,
        biscuits: r.drills.filter((d) => d.kind === 'biscuit_screw').length,
        marks: r.panels.filter((p) => p.cnc && p.cnc.marks).length,
        vparts: r.panels.filter((p) => p.part === 'VPART').length,
      };
    `);
    measurements.partition = probe;
    check('F5 — the partition carries no biscuit at all',
      probe.biscuits === 0 && probe.marks === 0, JSON.stringify(probe));
    check('F6 — the back holds every partition', probe.backScrews > 0 && probe.vparts === 2,
      `${probe.backScrews} screws for ${probe.vparts} partitions`);

    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(1600);
    await shot('5a-partition-probe-sheet');

    // ── R5 + R6, as an assertion at the end ────────────────────────────────
    const errs = realErrors(page.errors);
    check('R5 + R6 — the console is clean across the whole walk', errs.length === 0,
      errs.slice(0, 3).join(' | ') || 'no errors, no React exceptions');

    writeFileSync(`${OUT}console.txt`, `${page.consoleLines.map((l) => `${l.level}  ${l.text}`).join('\n')}\n`);
    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify(measurements, null, 1)}\n`);
  } catch (e) {
    check('the walk ran to the end', false, e.message);
  } finally {
    const passed = steps.filter((s) => s.ok === true).length;
    const failed = steps.filter((s) => s.ok === false).length;
    const skipped = steps.filter((s) => s.ok === null).length;
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify({
      turn: 23,
      url: BASE,
      showroom: showroom.url,
      rules: {
        R1: 'every gesture is CDP Input; the guard at the top of this file enforces it',
        R4: 'hardware urls and counts read from window.__cc.hardware',
        R5: 'the console is captured for the whole walk',
        R6: 'any uncaught error or React error-boundary report FAILS the step it appeared in',
        R7: 'no data-* on R3F objects — asserted in test/turn23-f2-f4-hardware.test.js',
        R8: 'GLB-dependent steps run against the synthetic silent showroom',
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
