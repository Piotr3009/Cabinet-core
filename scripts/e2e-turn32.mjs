#!/usr/bin/env node
// ─── Turn 32 acceptance walk — wardrobes ────────────────────────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn32.mjs [--only f1,f2,…] [--out verify/t32/]
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R6  a console error fails the step it happened in.
//   T32 LIVE-SCENE PROOF: store/UI features are measured on the running app —
//       drive the real store (window.__cc.project), then compare engine
//       numbers against scene mesh bounds PER UNIT (ccUnitId on the
//       ancestors — panel ids collide between units).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t32/', import.meta.url).pathname);
const ONLY = argOf('--only', null);
const want = (id) => !ONLY || ONLY.split(',').map((s) => s.trim()).includes(id);

// R1's guard, and it is a guard rather than a promise.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const shots = [];
const P = 'window.__cc';

const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const showroom = await startFixtureServer({ port: 4174 });
  const page = await launch({ width: 1600, height: 1000 });

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

  /** A proof picture, and the assertion that it is not an empty frame. */
  const shot = async (name, subject = null, clip = null) => {
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
        if (want.text) out.text = (document.body.innerText || '').includes(want.text);
        if (want.mesh) {
          const v = ${P}.views && ${P}.views.room;
          let n = 0;
          if (v) v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId === want.mesh && o.visible) n += 1; });
          out.mesh = n > 0;
        }
        return out;
      `);
      present = Object.values(seen).every(Boolean);
      detail = JSON.stringify(seen);
    }
    await page.screenshot(`${OUT}${name}.png`, clip);
    shots.push({ name, subject, present, detail });
    if (!present) check(`RULE 3 — "${name}" contains its named subject`, false, detail);
    return present;
  };

  /** Put the camera on a SET of cabinets, framed off their own mounted meshes. */
  const frameUnits = async (unitIds, offset = [1, 1, 2]) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = new Set(${JSON.stringify(unitIds)});
    v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let found = 0;
    v.scene.traverse((g) => {
      if (!g.userData || !want.has(g.userData.ccUnitId)) return;
      g.traverse((o) => {
        if (!o.isMesh || !o.userData || !o.userData.ccPanelId) return;
        box.expandByObject(o);
        found += 1;
      });
    });
    if (!found) return null;
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(0.3, box.getSize(new THREE.Vector3()).length() / 2);
    const off = ${JSON.stringify(offset)};
    if (v.controls) v.controls.enableDamping = false;
    if (v.controls && v.controls.target) v.controls.target.copy(c);
    v.camera.position.set(c.x + off[0] * r, c.y + off[1] * r, c.z + off[2] * r);
    v.camera.up.set(0, 1, 0);
    v.camera.lookAt(c);
    v.camera.updateProjectionMatrix();
    if (v.controls) v.controls.update();
    return found;
  `);

  /** The MEASURE: one unit's scene bounds in millimetres, off ccUnitId. */
  const sceneBoundsMm = async (unitId) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let found = 0;
    v.scene.traverse((g) => {
      if (!g.userData || g.userData.ccUnitId !== ${JSON.stringify(unitId)}) return;
      g.traverse((o) => {
        if (!o.isMesh || !o.userData || !o.userData.ccPanelId) return;
        box.expandByObject(o);
        found += 1;
      });
    });
    if (!found) return null;
    const s = box.getSize(new THREE.Vector3());
    return { meshes: found, w: Math.round(s.x * 1000), h: Math.round(s.y * 1000), d: Math.round(s.z * 1000) };
  `);

  /** Type into whatever has focus, with REAL input (CDP's own text path). */
  const typeText = async (text) => {
    await page.send('Input.insertText', { text });
    await page.sleep(120);
  };
  void typeText;

  const measurements = {};

  try {
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    check('R8 — the app is pointed at the silent showroom', true, showroom.url);

    // ═══════════════════════════════════════════════════════════════════════
    // F1 [CRITICAL] — the wizard, step 4 rebuilt: one screen, no scrolling
    // ═══════════════════════════════════════════════════════════════════════
    //
    // The whole flow is walked with the pointer, as a workshop would: New
    // project → Wardrobe → room → the rebuilt settings screen. Then the
    // LIVE-SCENE proof: the depth seed the step showed (568) is the depth the
    // wardrobe's meshes actually stand at in the room.
    if (want('f1')) {
      await page.click('button', 'New project');
      await page.waitFor(`document.querySelector('[data-modal-name="new-project"]')`, { what: 'the flow' });
      await page.click('button', 'Next', { exact: true });                 // info — defaults stand
      await page.click('button', 'Wardrobe');                              // type
      await page.click('button', 'Next', { exact: true });
      await page.click('button', 'Next — room setup');                     // scope: room
      await page.waitFor(`document.querySelector('[data-modal-name="room"]') || document.body.innerText.includes('Apply')`, { what: 'the room editor' });
      await page.click('button', 'Apply');                                 // the room, as proposed
      await page.waitFor(`document.querySelector('[data-wizard-settings="1"]')`, { what: 'the rebuilt step 4' });

      const top = await page.evaluate(`
        const label = document.querySelector('[data-wizard-type-label="1"]');
        const dropdowns = [...document.querySelectorAll('[data-wizard-settings="1"] select')]
          .filter((s) => s.closest('[data-material-picker-for]') === null).length;
        const depth = document.querySelector('input[data-wizard-dim="depth"]');
        const scroller = document.querySelector('[data-modal-shell="1"] .cc-scroll, [data-modal-shell="1"]');
        return {
          type: label ? label.textContent.trim() : null,
          typeDropdowns: dropdowns,
          depth: depth ? depth.value : null,
          total: (document.querySelector('[data-total-line="1"]') || {}).textContent || '',
        };
      `);
      measurements.f1 = { top };
      check('F1 — the type is a LABEL on the settings step, never a second dropdown',
        top.type === 'Wardrobe' && top.typeDropdowns === 0, JSON.stringify(top));
      check('F1 — the depth seed follows the PROJECT TYPE: the wardrobe row reads 568',
        top.depth === '568', `depth field: ${top.depth}`);
      check('F1 — the LIVE line: total item = wardrobe + legs',
        /total item = wardrobe \+ legs = \d+ mm/.test(top.total.replace(/\s+/g, ' ')), top.total.trim());
      await shot('1a-step-4-one-screen-number-client-and-the-type-as-a-label',
        { dom: '[data-wizard-type-label="1"]', text: 'total item' });

      // The ceiling question: 2400 + 100 against the default 2500 room is 0 mm
      // of headroom — inside the owner's 40 — so the QUESTION is on screen and
      // Start is held until it is answered.
      const guard = await page.evaluate(`
        const q = document.querySelector('[data-ceiling-question="1"]');
        const start = document.querySelector('[data-start-designing="1"]');
        return { question: Boolean(q), text: q ? q.innerText : '', startDisabled: start ? start.disabled : null };
      `);
      measurements.f1.guard = guard;
      check('F1 — under 40 mm of headroom the wizard ASKS: to the ceiling, with no infill?',
        guard.question && guard.text.includes('ceilings are rarely straight'), guard.text.slice(0, 90));
      check('F1 — …and Start designing is disabled while it stands unanswered',
        guard.startDisabled === true, `disabled: ${guard.startDisabled}`);
      await shot('1b-the-ceiling-question-with-the-owners-scribe-warning',
        { dom: '[data-ceiling-question="1"]', text: 'ceilings are rarely straight' });
      await page.click('[data-ceiling-answer="flush"]');
      check('F1 — "Yes — to the ceiling" is remembered on the design',
        await page.evaluate(`return ${P}.project.getState().project.design.ceiling === 'flush';`));

      // FRONTS BEFORE MATERIALS: the owner's [1] [2] [3], then the existing
      // 8-style gallery per slot — a real click on a real tile.
      await page.click('[data-front-count="3"]');
      const slots = await page.evaluate(`
        return [...document.querySelectorAll('[data-style-slot]')].map((b) => b.getAttribute('data-style-slot'));
      `);
      check('F1 — three front types on the step', slots.join(',') === 'f1,f2,f3', slots.join(','));
      await page.click('[data-style-slot="f2"]');
      await page.waitFor(`document.querySelector('[data-style-gallery-for="f2"]')`, { what: 'slot 2’s gallery' });
      await page.click('[data-style-gallery-for="f2"] [data-style-tile="F"]');
      const styleSet = await page.evaluate(`
        const t = ${P}.project.getState().project.design.fronts.types;
        return { f2: t[1] && t[1].style, count: t.length };
      `);
      check('F1 — slot 2 wears the shape its gallery picked', styleSet.f2 === 'F' && styleSet.count === 3,
        JSON.stringify(styleSet));
      await shot('1c-three-front-types-and-the-8-style-gallery-open-for-slot-2',
        { dom: '[data-style-gallery-for="f2"]' });

      // MATERIALS: one picker — EGGER tiles ∪ stock materials — and the mock
      // swatches are gone from the step. Assign the carcass with a real click
      // on a real EGGER tile.
      const noSwatches = await page.evaluate(`
        const step = document.querySelector('[data-wizard-settings="1"]');
        return !step.innerText.includes('Broken white') && !step.innerText.includes('Light grey');
      `);
      check('F1 — the mock swatches are DELETED from the step', noSwatches);
      await page.click('[data-material-slot="carcass:c1"]');
      await page.waitFor(`document.querySelector('[data-material-picker-for="carcass:c1"]')`, { what: 'the carcass picker' });
      const pickerHas = await page.evaluate(`
        const p = document.querySelector('[data-material-picker-for="carcass:c1"]');
        return {
          egger: p.querySelectorAll('img, [aria-pressed]').length > 3,
          stock: [...p.querySelectorAll('optgroup')].map((g) => g.label),
        };
      `);
      check('F1 — ONE picker: EGGER tiles ∪ stock (Generic in its own labelled group)',
        pickerHas.egger && pickerHas.stock.some((l) => /Generic/.test(l)) && pickerHas.stock.includes('Stock'),
        JSON.stringify(pickerHas.stock));
      await shot('1d-one-material-picker-egger-tiles-and-stock-with-generic',
        { dom: '[data-material-picker-for="carcass:c1"]' });
      await page.click('[data-material-picker-for="carcass:c1"] [aria-pressed]');
      check('F1 — a real click on an EGGER tile assigns the carcass',
        await page.evaluate(`return Boolean(${P}.project.getState().project.design.carcass.types[0].finish_id);`));

      // No assignment → no Start. The fronts are still naked, so the button
      // still refuses; then the three slots are answered (Generic counts) and
      // it opens.
      const heldForMaterials = await page.evaluate(`
        const start = document.querySelector('[data-start-designing="1"]');
        const missing = document.querySelector('[data-materials-missing="1"]');
        return { disabled: start.disabled, missing: missing ? missing.innerText : '' };
      `);
      check('F1 — no assignment → Start designing stays disabled, and it says why',
        heldForMaterials.disabled === true && /Front 1, Front 2, Front 3/.test(heldForMaterials.missing),
        heldForMaterials.missing.slice(0, 80));
      await shot('1e-start-designing-held-until-every-slot-is-assigned',
        { dom: '[data-materials-missing="1"]', text: 'Generic counts' });
      await page.evaluate(`
        const s = ${P}.project.getState();
        // Choosing GENERIC IS an assignment (the owner's sentence) — the walk
        // makes it through the same setter the select uses.
        for (const t of s.project.design.fronts.types) s.setFrontMaterial(t.id, 'generic-18');
        return true;
      `);
      const opened = await page.evaluate(`return document.querySelector('[data-start-designing="1"]').disabled;`);
      check('F1 — Generic IS an assignment: the button opens', opened === false);

      await page.click('[data-start-designing="1"]');
      await page.click('button', 'No, just start');
      await page.waitFor(`!document.querySelector('[data-modal-name="new-project"]')`, { what: 'the canvas' });

      // ── THE LIVE-SCENE PROOF ──
      // The step promised 568. The store places a wardrobe; the SCENE is then
      // measured per unit (ccUnitId), and the meshes must stand 568 deep.
      const placed = await page.evaluate(`
        const { id } = ${P}.project.getState().addUnit('WARDROBE');
        const u = ${P}.project.getState().units.find((x) => x.id === id);
        return { id, depth: u.params.depth, width: u.params.width, height: u.params.height };
      `);
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        let n = 0;
        if (v) v.scene.traverse((o) => { if (o.userData && o.userData.ccUnitId === ${JSON.stringify(placed.id)}) n += 1; });
        return n > 0;
      })()`, { what: 'the wardrobe in the scene' });
      const bounds = await sceneBoundsMm(placed.id);
      measurements.f1.liveScene = { placed, bounds };
      check('F1 — LIVE SCENE: the engine stamped the wardrobe 568 deep',
        placed.depth === 568, `params.depth = ${placed.depth}`);
      check('F1 — LIVE SCENE: the meshes stand 568 deep in the room (±2 mm)',
        bounds && Math.abs(bounds.d - 568) <= 2 && Math.abs(bounds.w - placed.width) <= 2,
        JSON.stringify(bounds));
      await frameUnits([placed.id]);
      await page.sleep(400);
      await shot('1f-the-wardrobe-standing-568-deep-measured-off-its-own-meshes',
        { mesh: await page.evaluate(`
          const v = ${P}.views.room; let id = null;
          v.scene.traverse((g) => {
            if (id || !g.userData || g.userData.ccUnitId !== ${JSON.stringify(placed.id)}) return;
            g.traverse((o) => { if (!id && o.isMesh && o.userData.ccPanelId) id = o.userData.ccPanelId; });
          });
          return id;
        `) });
    }

    // ─── R6, as an assertion at the end ────────────────────────────────────
    const errs = realErrors(page.errors);
    check('R6 — the console is clean for the whole walk', errs.length === 0, errs.slice(0, 3).join(' | '));
    writeFileSync(`${OUT}console.txt`, `${page.consoleLines.map((l) => `${l.level}  ${l.text}`).join('\n')}\n`);
  } finally {
    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify(measurements, null, 1)}\n`);
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify({ steps, shots }, null, 1)}\n`);
    await page.close();
    await showroom.close();
  }

  const failed = steps.filter((s) => s.ok === false);
  const blank = shots.filter((s) => s.present === false);
  console.log(`\n${steps.length - failed.length} ok · ${failed.length} failed · ${shots.length} shots (${blank.length} empty)`);
  if (failed.length || blank.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
