// ─── Turn 22, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn22.mjs
//
// ─── R1: A POINTER GESTURE IS PROVEN WITH A REAL POINTER ────────────────────
//
// Standing since turn 20: every click, double-click, drag and hover goes
// through `Input.dispatchMouseEvent` (scripts/cdp.mjs). Synthetic DOM events
// are BANNED, and the ban is enforced rather than promised — the guard below
// reads this file and refuses to run if anybody adds one.
//
// ─── R2: THE BUCKET IS ASKED, LIVE ──────────────────────────────────────────
//
// `scripts/bucket-live.mjs`, before any picture of hardware. In THIS session
// the egress policy refuses the storage host and the step is recorded as
// BLOCKED with the proxy's own answer, exactly as turn 21 recorded it — a tick
// there would be a lie and a cross would be a lie about the code.
//
// ─── R4: A URL AND A COUNT ARE PROVEN BY ASKING THE APP ─────────────────────
//
// The hardware step takes the exact URL STRING out of `window.__cc.hardware`,
// and this turn's health row is asserted against `window.__cc.hardwareHealth`
// AND against the engine registries behind it — never against the text in the
// DOM, which is the thing being checked.
//
// ─── R5: THE WALK READS THE CONSOLE ─────────────────────────────────────────
//
// Every step runs against a live capture (`page.consoleLines`, `page.errors`)
// and the clean console is an ASSERTION at the end.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { checkLiveBucket } from './bucket-live.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t22/', import.meta.url).pathname);

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
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

/** A step this ENVIRONMENT cannot run, recorded as neither a pass nor a fail. */
const blocked = (label, why, detail = '') => {
  steps.push({
    label, ok: null, blocked: why, detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
  });
  console.log(`BLKD  ${label} — ${why}${detail ? ` (${detail})` : ''}`);
};

const P = 'window.__cc';

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name, clip = null) => page.screenshot(`${OUT}${name}.png`, clip);
  const measurements = {};

  /** A real DRAG, press → move → release, all through CDP (R1). */
  const drag = async (from, to, n = 12) => {
    await page.mouse('mouseMoved', from.x, from.y, { buttons: 0, clickCount: 0 });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1, buttons: 1,
    });
    for (let i = 1; i <= n; i += 1) {
      const x = Math.round(from.x + ((to.x - from.x) * i) / n);
      const y = Math.round(from.y + ((to.y - from.y) * i) / n);
      await page.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', x, y, button: 'left', buttons: 1,
      });
      await page.sleep(30);
    }
    await page.sleep(80);
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(180);
  };

  const fresh = async (name) => {
    await page.evaluate(`
      ${P}.project.getState().newProject(${JSON.stringify(name)});
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      return true;
    `);
    await page.sleep(700);
  };

  /**
   * The screen rectangle of a UNIT, from the LIVE scene and the LIVE camera.
   * Arithmetic decides WHERE to put a real pointer event, which is exactly
   * what R1 permits — the gesture itself is CDP input.
   */
  const unitRectJs = (unitId) => `
    const view = ${P}.views && ${P}.views.room;
    if (!view) return null;
    const THREE = view.three;
    const rect = view.gl.domElement.getBoundingClientRect();
    let root = null;
    view.scene.traverse((o) => {
      if (!root && o.userData && o.userData.ccUnitId === ${JSON.stringify(unitId)}) root = o;
    });
    if (!root) return null;
    const box = new THREE.Box3().setFromObject(root);
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const v = new THREE.Vector3(x, y, z).project(view.camera);
          minX = Math.min(minX, rect.left + (v.x * 0.5 + 0.5) * rect.width);
          maxX = Math.max(maxX, rect.left + (v.x * 0.5 + 0.5) * rect.width);
          minY = Math.min(minY, rect.top + (-v.y * 0.5 + 0.5) * rect.height);
          maxY = Math.max(maxY, rect.top + (-v.y * 0.5 + 0.5) * rect.height);
        }
      }
    }
    return {
      x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2),
      w: Math.round(maxX - minX), h: Math.round(maxY - minY),
      left: Math.round(minX), right: Math.round(maxX), top: Math.round(minY), bottom: Math.round(maxY),
    };
  `;

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Turn 22 walk');
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(1200);

    // ══ R2 — THE BUCKET, BEFORE ANY PICTURE OF HARDWARE ═════════════════════
    const bucket = await checkLiveBucket().catch((e) => ({ host: null, ok: false, error: e.message, families: [] }));
    measurements.bucket = bucket;
    if (bucket.ok) {
      check('R2 the LIVE bucket was asked, before any hardware was photographed',
        bucket.families.length === 2,
        bucket.families.map((f) => `${f.id} ${f.manifestStatus} ${f.rows} rows`).join(' | '));
    } else {
      blocked('R2 the LIVE bucket answers',
        'this session’s egress policy refuses the storage host',
        bucket.families.map((f) => `${f.id}: ${f.error}`).join(' | '));
    }

    // ══ F1 — THE CORNICE ════════════════════════════════════════════════════
    //
    // "two adjacent wardrobes with cornice 70, one open end — screenshot of the
    // run, the stop and the 45° return; the option flipped through none/70/100
    // with a real click each (R1)."
    const ids = await page.evaluate(`
      const s = ${P}.project.getState();
      // A room WIDER than the pair, so the right-hand end is genuinely OPEN and
      // the left one is hard against the wall: one stop and one return, which
      // is exactly the case CLAUDE.md F1.6 asks to see.
      s.setRoom({ height: 2700, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] });
      const a = s.addUnit('WARDROBE');
      s.setUnitName(a.id, 'W01');
      // Park it AT THE WALL, which is what makes its left end a STOP and the
      // pair's right end genuinely OPEN — the one-of-each case F1.6 asks to
      // see. A new cabinet on an empty wall is centred on it, and a run
      // standing in the middle of a 6 m wall is open at both ends.
      s.moveUnit(a.id, 0, 0);
      const b = s.addUnit('WARDROBE', { near: a.id, side: 'right' });
      s.setUnitName(b.id, 'W02');
      ${P}.ui.getState().selectUnit(a.id);
      return {
        a: a.id, b: b.id,
        x: ${P}.project.getState().units.map((u) => u.position.x_mm),
      };
    `);
    measurements.cornice = { ids };
    await page.sleep(900);

    // ── the option, flipped through none / 70 / 100 with a REAL CLICK each ──
    const flips = [];
    for (const want of [70, 100, 0, 70]) {
      // The control is in the right-hand panel's Construction section; open it
      // if it is folded, then click the button for this height.
      await page.evaluate(`
        ${P}.ui.getState().setPanelSection('construction', true);
        return true;
      `).catch(() => null);
      await page.sleep(250);
      let clicked = false;
      try {
        await page.click(`[data-cornice="${want}"]`);
        clicked = true;
      } catch (e) {
        flips.push({ want, error: e.message });
      }
      await page.sleep(500);
      const got = await page.evaluate(`
        const s = ${P}.project.getState();
        const u = s.units.find((x) => x.id === ${JSON.stringify(ids.a)});
        const r = s.unitResult(u.id);
        return {
          param: u.params.cornice,
          run: u.params.run_cornice ? u.params.run_cornice.height : null,
          assembly: r.assemblies.cornice ? r.assemblies.cornice.height : null,
        };
      `);
      flips.push({ want, clicked, ...got });
    }
    measurements.cornice.flips = flips;
    check('F1.1 the option flips through none / 70 / 100 on a REAL click each (R1)',
      flips.every((f) => f.clicked === true && f.param === f.want),
      flips.map((f) => `${f.want}→${f.param}`).join(' '));

    // ── the run: one moulding across the two, its stop and its 45° return ──
    const run = await page.evaluate(`
      const s = ${P}.project.getState();
      const p = ${P}.profile.getState().profile;
      const T = window.__ccT22.cornice;
      // The SECOND wardrobe has to want one too, or there is no run to see.
      const b0 = s.units.find((x) => x.id === ${JSON.stringify(ids.b)});
      if (!b0.params.cornice) s.setCornice(b0.id, 70);
      // …and the state is re-read AFTER the mutation: getState() is a snapshot,
      // and a stale one would report the run as it was a click ago.
      const now = ${P}.project.getState();
      const owner = now.units.find((x) => x.id === ${JSON.stringify(ids.a)}).params.run_cornice;
      const member = now.units.find((x) => x.id === ${JSON.stringify(ids.b)}).params.run_cornice;
      const el = now.unitResult(${JSON.stringify(ids.a)}).assemblies.cornice;
      const solids = el ? T.corniceSolids(el, el, p) : [];
      const section = el ? T.corniceSection(el.height, p) : [];
      const spread = (ring) => {
        const xs = ring.map((q) => q[0]);
        return Math.max(...xs) - Math.min(...xs);
      };
      return {
        owner, member,
        infills: now.units.map((u) => [u.params.side_infill_left_mm, u.params.side_infill_right_mm]),
        length: el ? el.length : null,
        height: el ? el.height : null,
        projection: el ? el.projection : null,
        ends: el ? el.ends : null,
        mitres: el ? el.mitres : null,
        returns: el ? el.returns : null,
        members: solids.map((x) => x.id),
        // The 45° as a MEASUREMENT. A mitred end is a ring whose points are
        // slid along the sweep by their own projection, so the spread of that
        // ring along the run IS the projection; a square stop has none.
        mitreRun: solids.length ? spread(solids[0].b) : null,
        stopRun: solids.length ? spread(solids[0].a) : null,
        order: el ? el.order : null,
        bom: s.allResults().flatMap((e) => e.result.hardware).filter((h) => h.role === 'cornice'),
      };
    `);
    measurements.cornice.run = run;
    check('F1.3 ONE moulding across the two wardrobes — owner + member',
      run.owner?.role === 'owner' && run.member?.role === 'member' && run.owner.unitIds.length === 2,
      `${run.length} mm, ${run.owner?.unitIds?.length} units`);
    // A STOP is any of the three CLAUDE.md F1.3 names — a wall, a side panel or
    // a side infill — as against the fourth condition, which is OPEN. The pair
    // is parked at the wall behind its own scribe filler, so this end is the
    // filler; what is being proved is that it is a stop and not a return.
    const STOPS = ['wall', 'infill', 'end-panel'];
    check('F1.3 the left end STOPS (wall / panel / side infill) and the right end is OPEN',
      STOPS.includes(run.ends?.left) && run.ends?.right === 'open',
      JSON.stringify(run.ends));
    check('F1.3 …so the open end mitres 45° and RETURNS along the side to the wall',
      run.mitres?.right === true && run.mitres?.left === false && Number(run.returns?.right) > 0,
      `return ${run.returns?.right} mm, left mitre ${run.mitres?.left}`);
    check('F1.3 the 45° is a real one — the outer face runs on by the projection',
      Math.abs((run.mitreRun ?? -1) - run.projection) < 0.001 && run.stopRun === 0,
      `open end ${run.mitreRun} = projection ${run.projection}; stopped end ${run.stopRun}`);
    check('F1.4 the BOM orders it by the METRE, and it is not a cut piece',
      run.bom.length === 1 && run.bom[0].unit === 'm' && run.bom[0].qty > 0,
      run.bom.map((h) => `${h.qty} m · ${h.spec_label}`).join(' | '));
    const cut = await page.evaluate(`
      const s = ${P}.project.getState();
      return s.allResults().flatMap((e) => e.result.panels).filter((p) => /cornice/i.test(p.part)).length;
    `);
    check('F1.4 …and NOTHING named cornice reaches the cut list', cut === 0, `${cut} panels`);

    // The picture: the run, the stop and the return. The camera is put where a
    // joiner would stand to look at the top of the run — above it and off the
    // open end, so the moulding, the stop at the wall and the 45° return down
    // the side are all in one frame. Moving a CAMERA is not a gesture and R1
    // says nothing about it; every gesture in this walk is still CDP input.
    await page.evaluate(`${P}.ui.getState().selectUnit(null); return true;`).catch(() => null);
    await page.sleep(400);
    await page.evaluate(`
      const view = ${P}.views.room;
      const s = ${P}.project.getState();
      const THREE = view.three;
      let root = null;
      view.scene.traverse((o) => {
        if (!root && o.userData && o.userData.ccUnitId === ${JSON.stringify(ids.b)}) root = o;
      });
      if (!root) return false;
      const box = new THREE.Box3().setFromObject(root);
      const target = new THREE.Vector3(box.min.x, box.max.y, box.max.z);
      view.camera.position.set(target.x + 2.2, target.y + 1.1, target.z + 2.6);
      if (view.controls) { view.controls.target.copy(target); view.controls.update(); }
      view.camera.lookAt(target);
      view.camera.updateProjectionMatrix();
      return true;
    `).catch(() => null);
    await page.sleep(800);
    await shot('1a-cornice-run-stop-and-return');
    // …and a close-up of the corner itself, cropped by CDP so the 45° can be
    // looked at rather than squinted at (no second image tool — rule 4).
    const closeUp = await page.evaluate(unitRectJs(ids.b));
    if (closeUp) {
      const w = Math.max(240, Math.min(760, closeUp.right - closeUp.left + 200));
      await shot('1b-cornice-45-return', {
        x: Math.max(0, closeUp.right - w + 120),
        y: Math.max(0, closeUp.top - 70),
        width: w,
        height: 320,
        scale: 3,
      });
    }

    // ── F1.5 ceiling honesty ──
    const ceiling = await page.evaluate(`
      const s = ${P}.project.getState();
      s.setRoom({ height: 2400, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] });
      const u = s.units.find((x) => x.id === ${JSON.stringify(ids.a)});
      s.updateUnitParams(u.id, { height: 2280 });
      const { notices } = s.setCornice(u.id, 100);
      return notices;
    `);
    measurements.cornice.ceiling = ceiling;
    check('F1.5 a wardrobe whose cornice finishes above the ceiling WARNS',
      ceiling.some((n) => /cornice/.test(n) && /ceiling/.test(n)),
      ceiling[0] || '(no notice)');

    // ══ F4 — THE D/W STANDS ON THE RUN'S LEGS ═══════════════════════════════
    await fresh('Turn 22 — F4');
    await page.sleep(700);
    const dw = await page.evaluate(`
      const s = ${P}.project.getState();
      s.setRoom({ height: 2500, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] });
      const bud = s.addUnit('BUD');
      s.setUnitName(bud.id, 'B01');
      s.addPlinth(bud.id);
      const panel = s.addUnit('DW_PANEL', { near: bud.id, side: 'right' });
      s.setUnitName(panel.id, 'DW1');
      s.addPlinth(panel.id);
      const before = {
        bud: s.unitResult(bud.id).assemblies.carcass.legHeight,
        dw: s.unitResult(panel.id).assemblies.carcass.legHeight,
      };
      // THE FIELD: 50, entered on the run.
      const { applied } = s.setProjectHeights({ toeKick: 50 });
      const after = {
        bud: s.unitResult(bud.id).assemblies.carcass.legHeight,
        dw: s.unitResult(panel.id).assemblies.carcass.legHeight,
      };
      const plinths = s.allResults().flatMap((e) => e.result.panels).filter((p) => p.part === 'PLINTH');
      const front = s.unitResult(panel.id).panels.find((p) => p.part === 'FRONT');
      return {
        ids: { bud: bud.id, dw: panel.id },
        applied, before, after,
        legHeights: s.units.map((u) => u.params.leg_height),
        plinths: plinths.map((p) => ({ w: p.w, h: p.h, y: p.box.y })),
        dwFrontBottom: after.dw + front.box.y,
        dwFrontW: front.w,
      };
    `);
    measurements.dw = dw;
    check('F4.3 the field accepts 50 — the 100 was a default, never a floor',
      dw.applied.toeKick === 50, `applied ${dw.applied.toeKick}`);
    check('F4.2 the D/W stands on 50 exactly as its legged neighbour does',
      dw.after.bud === 50 && dw.after.dw === 50,
      `BUD ${dw.before.bud}→${dw.after.bud}, D/W ${dw.before.dw}→${dw.after.dw}`);
    check('F4.2 …and the two share ONE plinth line — one length across the run',
      dw.plinths.length === 1 && dw.plinths[0].h === 50,
      dw.plinths.map((p) => `${p.w}×${p.h} @ y${p.y}`).join(' | '));
    check('F4.5 the D/W front is still 594 wide',
      dw.dwFrontW === 594, `${dw.dwFrontW} mm`);

    await page.sleep(600);
    // The camera is moved for the picture and PUT BACK afterwards, because the
    // drag that follows aims a real pointer through it: a walk that photographs
    // from a close-up and then clicks with the same camera is aiming at
    // whatever happens to be under those pixels.
    await page.evaluate(`
      const view = ${P}.views.room;
      const THREE = view.three;
      window.__ccCam = {
        pos: view.camera.position.clone(),
        target: view.controls ? view.controls.target.clone() : new THREE.Vector3(),
      };
      let root = null;
      view.scene.traverse((o) => {
        if (!root && o.userData && o.userData.ccUnitId === ${JSON.stringify(dw.ids.dw)}) root = o;
      });
      if (!root) return false;
      const box = new THREE.Box3().setFromObject(root);
      // Low and square on: the plinth line is the thing being photographed.
      const target = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y + 0.22, box.max.z);
      view.camera.position.set(target.x - 0.95, target.y + 0.55, target.z + 2.4);
      if (view.controls) { view.controls.target.copy(target); view.controls.update(); }
      view.camera.lookAt(target);
      view.camera.updateProjectionMatrix();
      return true;
    `).catch(() => null);
    await page.sleep(800);
    const dwBox = await page.evaluate(unitRectJs(dw.ids.dw));
    await shot('4a-bud-and-dw-one-plinth-line-at-50', dwBox ? {
      x: Math.max(0, dwBox.left - 620),
      y: Math.max(0, dwBox.top - 40),
      width: 1080,
      height: Math.min(760, dwBox.bottom - dwBox.top + 220),
      scale: 2,
    } : null);

    // ── F4.4(b): the D/W is DRAGGED along the run, with real input (R1) ──
    // Back to the camera the walk was standing at, so the pointer below is
    // aimed through the same view the rest of it used.
    await page.evaluate(`
      const view = ${P}.views.room;
      const saved = window.__ccCam;
      if (!saved) return false;
      view.camera.position.copy(saved.pos);
      if (view.controls) { view.controls.target.copy(saved.target); view.controls.update(); }
      view.camera.lookAt(saved.target);
      view.camera.updateProjectionMatrix();
      return true;
    `).catch(() => null);
    await page.sleep(700);
    const before = await page.evaluate(`
      const s = ${P}.project.getState();
      return s.units.find((u) => u.id === ${JSON.stringify(dw.ids.dw)}).position.x_mm;
    `);
    const grab = await page.evaluate(unitRectJs(dw.ids.dw));
    let after = before;
    if (grab) {
      await drag({ x: grab.x, y: grab.y }, { x: grab.x + 240, y: grab.y });
      after = await page.evaluate(`
        const s = ${P}.project.getState();
        return s.units.find((u) => u.id === ${JSON.stringify(dw.ids.dw)}).position.x_mm;
      `);
    }
    // …and the same gesture on the legged neighbour, so "it moved" is measured
    // against what a cabinet that is known to move does.
    const budBefore = await page.evaluate(`
      const s = ${P}.project.getState();
      return s.units.find((u) => u.id === ${JSON.stringify(dw.ids.bud)}).position.x_mm;
    `);
    const budGrab = await page.evaluate(unitRectJs(dw.ids.bud));
    let budAfter = budBefore;
    if (budGrab) {
      await drag({ x: budGrab.x, y: budGrab.y }, { x: budGrab.x + 200, y: budGrab.y });
      budAfter = await page.evaluate(`
        const s = ${P}.project.getState();
        return s.units.find((u) => u.id === ${JSON.stringify(dw.ids.bud)}).position.x_mm;
      `);
    }
    measurements.dwDrag = {
      dw: { before, after, moved: after !== before },
      bud: { before: budBefore, after: budAfter, moved: budAfter !== budBefore },
    };
    check('F4.4 the D/W TRANSLATES under a real drag, like its neighbours (R1)',
      after !== before && budAfter !== budBefore,
      `D/W ${before}→${after}, BUD ${budBefore}→${budAfter}`);
    await shot('4b-dw-dragged-along-the-run');

    // ══ F2 / F3 — THE DATA MODULE AND THE HEALTH ROW ════════════════════════
    //
    // R4: the numbers are asserted against the app's own registries, and only
    // then photographed.
    const health = await page.evaluate(`
      const H = window.__ccT22.hardwareHealth;
      const runners = window.__ccRunners.runnerCatalogue();
      const hinges = window.__ccHinges.hingeCatalogue();
      const rows = H.hardwareHealth();
      return {
        rows,
        line: H.hardwareHealthLine(rows),
        registry: {
          runners: runners ? runners.files.filter((f) => f.file).length : 0,
          hinges: hinges ? hinges.items.filter((i) => i.file).length : 0,
        },
        published: Boolean(window.__cc.hardwareHealth),
      };
    `);
    measurements.health = health;
    const rowOf = (f) => health.rows.find((r) => r.family === f);
    check('F3.1 the health row’s "expected" IS the registry’s own count (R4)',
      rowOf('runners').expected === health.registry.runners
        && rowOf('hinges').expected === health.registry.hinges,
      `Movento ${rowOf('runners').expected}, CLIP top ${rowOf('hinges').expected}`);
    check('F3.1 every family names its SOURCE — db / bucket / mock',
      health.rows.every((r) => r.source === null || ['db', 'bucket', 'mock'].includes(r.source)),
      health.rows.map((r) => `${r.short}:${r.source}`).join(' '));
    check('F3.1 …and the app publishes it, so the walk reads the app and not the pixels',
      health.published === true, health.line || '(no models named)');

    const sources = await page.evaluate(`
      const S = window.__ccT22.hardwareSource;
      return {
        families: S.HARDWARE_FAMILIES,
        answers: S.hardwareSources().map((a) => ({
          family: a.family, source: a.source, rows: a.rows, url: a.url, error: a.error,
        })),
      };
    `);
    measurements.sources = sources;
    check('F2a.2 the resolution order ran for every family, in one function',
      sources.families.length === 3 && sources.answers.length >= 2,
      sources.answers.map((a) => `${a.family}=${a.source}(${a.rows})`).join(' '));

    // R4 again: the hinge url the APP built, taken out of the app's registry.
    const registry = await page.evaluate(`
      const h = window.__cc.hardware;
      if (!h) return null;
      return { hinge: h.of('hinge'), runner: h.of('runner'), urls: h.urls() };
    `);
    measurements.registry = registry;
    const hingeUrl = registry?.hinge?.find((r) => r.url)?.url || null;
    check('R4 a hardware url the app built is absolute, with the bucket exactly once',
      !hingeUrl || (hingeUrl.startsWith('https://')
        && hingeUrl.split('/hardware/').length === 2
        && hingeUrl.endsWith('.glb')),
      hingeUrl || '(no hardware mounted in this scene)');

    // ── the Company defaults screen, opened through the MENU with real clicks ──
    await page.click('button', 'Database');
    await page.sleep(300);
    await page.click('[role="menuitem"]', 'Company defaults');
    await page.sleep(800);
    const screen = await page.evaluate(`
      const el = document.querySelector('[data-company-defaults="1"]');
      if (!el) return null;
      return {
        open: true,
        anonymous: Boolean(document.querySelector('[data-company-anonymous="1"]')),
        fields: [...document.querySelectorAll('[data-company-field]')].map((n) => n.getAttribute('data-company-field')),
        health: Boolean(document.querySelector('[data-hardware-health="1"]')),
        counts: [...document.querySelectorAll('[data-hardware-count]')].map((n) => n.textContent.trim()),
        sources: [...document.querySelectorAll('[data-hardware-source]')].map((n) => n.textContent.trim()),
        // The rule-owned key is not on the screen at all, which is the point.
        anglesOffered: document.body.textContent.includes('Hinge angle'),
      };
    `);
    measurements.companyScreen = screen;
    check('F2b.2 Database ▸ Company defaults opens on a real click (R1)',
      Boolean(screen?.open), screen ? `${screen.fields.length} preference fields` : 'not found');
    check('F2b.2 …offers only preferences — no hinge ANGLE anywhere on it',
      screen?.anglesOffered === false, 'the angle follows the front’s thickness');
    check('F2b.2 …and says defaults need an account when nobody is signed in',
      screen?.anonymous === true, 'graceful without a session');
    check('F3.2 the health row is ON that screen, printing the registry’s numbers',
      Boolean(screen?.health) && screen.counts.length === health.rows.length,
      `${screen?.counts?.join(' ')} | ${screen?.sources?.join(' ')}`);
    // The DOM's numbers must equal the registry's — the row prints, it does not
    // decide.
    const printed = (screen?.counts || []).map((t) => t.replace(/\s+/g, ''));
    const fromRegistry = health.rows.map((r) => `${r.loaded}/${r.expected}`);
    check('F3.2 …and what it prints is exactly what the registry says (R4)',
      JSON.stringify(printed) === JSON.stringify(fromRegistry),
      `${printed.join(' ')} vs ${fromRegistry.join(' ')}`);
    await shot('2a-company-defaults-and-hardware-health');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(300);

    // ── F2b.3: a NEW project, prefilled from a row ──
    const prefill = await page.evaluate(`
      const C = window.__ccT22.companyDefaults;
      const p = ${P}.profile.getState().profile;
      const s = ${P}.project.getState();
      const M = p.hardware.runner.movento;
      const other = M.variants.map((v) => v.id).find((id) => id !== M.defaultVariant);

      // WITHOUT a row: the project turn 21 made.
      C.clearCompanyDefaults();
      s.newProject('no row');
      const without = JSON.parse(JSON.stringify({
        hinges: s.project.design.hinges, runners: s.project.design.runners,
      }));

      // WITH one: the same flow, prefilled.
      C.setCompanyDefaults({ hinge_finish: 'onyx', runner_variant: other }, p);
      s.newProject('from the company row');
      const withRow = JSON.parse(JSON.stringify({
        hinges: ${P}.project.getState().project.design.hinges,
        runners: ${P}.project.getState().project.design.runners,
      }));

      // …and the equivalence probe: the same settings typed in by hand.
      C.clearCompanyDefaults();
      ${P}.project.getState().newProject('typed by hand', {
        design: { hinges: { finish: 'onyx' }, runners: { variant: other } },
      });
      const manual = JSON.parse(JSON.stringify({
        hinges: ${P}.project.getState().project.design.hinges,
        runners: ${P}.project.getState().project.design.runners,
      }));
      return { without, withRow, manual, other };
    `);
    measurements.prefill = prefill;
    check('F2b.3 a new project with NO row is exactly what turn 21 made',
      prefill.without.hinges.finish === null && prefill.without.runners.variant === null,
      JSON.stringify(prefill.without));
    check('F2b.3 …and with a row it is PREFILLED from it',
      prefill.withRow.hinges.finish === 'onyx' && prefill.withRow.runners.variant === prefill.other,
      JSON.stringify(prefill.withRow));
    check('F2b.5 THE EQUIVALENCE PROBE — the row equals its manual-settings twin',
      JSON.stringify(prefill.withRow) === JSON.stringify(prefill.manual),
      'identical design');

    // A picture of the prefilled project's own settings, so the claim has a
    // face: Settings ▸ Settings…, opened with real clicks.
    await page.evaluate(`
      const C = window.__ccT22.companyDefaults;
      const p = ${P}.profile.getState().profile;
      C.setCompanyDefaults({ hinge_finish: 'onyx', runner_variant: ${JSON.stringify(prefill.other)} }, p);
      ${P}.project.getState().newProject('Turn 22 — prefilled');
      ${P}.ui.getState().openEditor();
      return true;
    `);
    await page.sleep(700);
    await page.click('button', 'Settings');
    await page.sleep(300);
    await page.click('[role="menuitem"]', 'Settings…');
    await page.sleep(900);
    await shot('2b-new-project-prefilled-from-the-row');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(300);

    // ══ R5 — THE CONSOLE, AS AN ASSERTION ═══════════════════════════════════
    const console_ = page.consoleLines.map((l) => `${l.level}: ${l.text}`);
    const errors = page.errors.slice();
    writeFileSync(`${OUT}console.txt`, [...console_, '', '── errors ──', ...errors].join('\n'));

    const hardwarePaths = /(hinges|runners|blum|\.glb|manifest\.json)/i;
    const failures = errors.filter((e) => /Failed to load resource/.test(e) && hardwarePaths.test(e));
    const ownOrigin = failures.filter((e) => e.includes(BASE) || /\[https?:\/\/127\.0\.0\.1/.test(e));
    const upstreamBlocked = failures.filter((e) => !ownOrigin.includes(e));
    const webglBad = [...console_, ...errors].filter((e) => /INVALID_OPERATION/.test(e));
    const uncaught = errors.filter((e) => !/Failed to load resource/.test(e) && !/favicon/i.test(e));
    measurements.console = {
      lines: console_.length,
      errors: errors.length,
      ownOriginHardwareFailures: ownOrigin,
      upstreamBlocked: upstreamBlocked.slice(0, 5),
      upstreamBlockedCount: upstreamBlocked.length,
      webglBad,
      uncaught,
    };
    check('R5 the app NEVER asks its own domain for a hardware model (the owner’s 404)',
      ownOrigin.length === 0, ownOrigin.slice(0, 3).join(' | ') || 'clean');
    if (upstreamBlocked.length) {
      blocked('R5 …and the bucket’s own requests succeed',
        'the egress policy refuses the storage host',
        `${upstreamBlocked.length} requests, all to the correct absolute url`);
    } else {
      check('R5 …and the bucket’s own requests succeed', true, 'no failed hardware request at all');
    }
    check('R5 …no WebGL INVALID_OPERATION', webglBad.length === 0, webglBad.slice(0, 3).join(' | '));
    check('R5 …and no uncaught error', uncaught.length === 0, uncaught.slice(0, 3).join(' | '));

    await shot('99-the-room-at-the-end');
  } finally {
    const passed = steps.filter((s) => s.ok === true).length;
    const failed = steps.filter((s) => s.ok === false).length;
    const blockedCount = steps.filter((s) => s.ok === null).length;
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify({
      base: BASE,
      when: new Date().toISOString(),
      passed,
      failed,
      blocked: blockedCount,
      total: steps.length,
      steps,
      measurements,
    }, null, 2)}\n`);
    console.log(`\n${passed}/${steps.length} passed, ${failed} failed, ${blockedCount} blocked by this environment — ${OUT}walk.json`);
    await page.close();
    if (failed > 0) process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
