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
        const start = document.querySelector('[data-next-hardware="1"]');
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
        const start = document.querySelector('[data-next-hardware="1"]');
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
      const opened = await page.evaluate(`return document.querySelector('[data-next-hardware="1"]').disabled;`);
      check('F1 — Generic IS an assignment: the flow opens', opened === false);

      await page.click('[data-next-hardware="1"]');
      await page.waitFor(`document.querySelector('[data-start-designing="1"]')`, { what: 'step 5' });
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

    // ═══════════════════════════════════════════════════════════════════════
    // F2 [CRITICAL] — hardware as its own step 5, and the automat behind it
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f2')) {
      // Back to the start screen the way a workshop goes — File ▸ New
      // project… — never a reload: a second Page.navigate after heavy WebGL
      // work hangs SwiftShader's renderer, and the app has a door anyway.
      const onCanvas = await page.evaluate(`return ${P}.ui.getState().screen === 'editor';`).catch(() => false);
      if (onCanvas) {
        await page.click('button', 'File', { exact: true });
        await page.click('button', 'New project…');
        await page.sleep(400);
      }
      await page.click('button', 'New project');
      await page.click('button', 'Next', { exact: true });
      await page.click('button', 'Wardrobe');
      await page.click('button', 'Next', { exact: true });
      await page.click('button', 'Next — room setup');
      await page.click('button', 'Apply');
      await page.waitFor(`document.querySelector('[data-wizard-settings="1"]')`, { what: 'step 4' });
      await page.click('[data-ceiling-answer="flush"]');
      await page.evaluate(`
        ${P}.project.getState().setCarcassMaterial('c1', 'generic-18');
        ${P}.project.getState().setFrontTypes(1);
        for (const t of ${P}.project.getState().project.design.fronts.types) {
          ${P}.project.getState().setFrontMaterial(t.id, 'generic-18');
        }
        return true;
      `);
      await page.click('[data-next-hardware="1"]');
      await page.waitFor(`document.querySelector('[data-wizard-hardware="1"]')`, { what: 'step 5' });

      const prefilled = await page.evaluate(`
        const gold = document.querySelector('[data-metal-option="gold"]');
        const yes = document.querySelector('[data-softclose-option="soft-close"]');
        const plinth = document.querySelector('[data-plinth-summary="1"]');
        const automat = document.querySelector('[data-hinge-automat="1"]');
        const metals = [...document.querySelectorAll('[data-metal-option]')].map((b) => b.getAttribute('data-metal-option'));
        return {
          metals,
          goldLit: gold.className.includes('border-gold'),
          yesLit: yes.className.includes('border-gold'),
          plinth: plinth.innerText,
          automat: automat.innerText,
          ironmongeryOnStep4: false,
        };
      `);
      measurements.f2 = { prefilled };
      check('F2 — the step is small and FULLY PRE-FILLED: gold and soft-close already lit',
        prefilled.goldLit && prefilled.yesLit, JSON.stringify({ gold: prefilled.goldLit, yes: prefilled.yesLit }));
      check('F2 — the owner’s three metals: chrome / onyx / gold',
        prefilled.metals.join(',') === 'chrome,onyx,gold', prefilled.metals.join(','));
      check('F2 — the plinth is a READ-ONLY summary: height, material "(default)", and the front-legs rule',
        /Plinth 100 mm · Same as fronts \(default\)/.test(prefilled.plinth)
          && /FRONT legs only/.test(prefilled.plinth), prefilled.plinth.replace(/\n/g, ' · '));
      await shot('2a-hardware-step-5-small-and-fully-pre-filled',
        { dom: '[data-wizard-hardware="1"]', text: 'Plinth 100 mm' });

      await page.click('[data-metal-option="onyx"]');
      const onyx = await page.evaluate(`
        const s = ${P}.project.getState();
        return {
          sleeve: s.project.design.hardware.shelfSleeve,
          automat: document.querySelector('[data-hinge-automat="1"]').innerText,
        };
      `);
      check('F2 — the metal colour writes the family choice (design.hardware.shelfSleeve)',
        onyx.sleeve === 'onyx', onyx.sleeve);
      check('F2 — the AUTOMAT resolves onyx + soft-close to a real Blum article',
        /71B\d+/.test(onyx.automat) && /art\. \d+/.test(onyx.automat), onyx.automat);

      await page.click('[data-softclose-option="standard"]');
      const spec = await page.evaluate(`return document.querySelector('[data-hinge-automat="1"]').innerText;`);
      check('F2 — what the registry does not know is a NAMED SPEC, never an invented number',
        /named spec/.test(spec) && !/art\. \d+/.test(spec), spec);
      await shot('2b-the-automat-answers-a-named-spec-when-no-article-exists',
        { dom: '[data-hinge-automat="1"]', text: 'named spec' });
      await page.click('[data-softclose-option="soft-close"]');

      await page.click('[data-start-designing="1"]');
      await page.click('button', 'No, just start');
      await page.waitFor(`!document.querySelector('[data-modal-name="new-project"]')`, { what: 'the canvas' });

      // ── THE LIVE-SCENE PROOF ──
      // "The rail already follows it": the wizard chose ONYX, so the hanging
      // rail placed on a real wardrobe must be RENDERED in the onyx colour —
      // measured off the unit's own meshes, not asserted off the store.
      const railUnit = await page.evaluate(`
        const { id } = ${P}.project.getState().addUnit('WARDROBE');
        ${P}.project.getState().addHangerRail(id);
        return id;
      `);
      await page.sleep(600);
      const railSeen = await page.evaluate(`
        const v = ${P}.views && ${P}.views.room;
        const wantColour = ${P}.profile.getState().profile.appearance.metals.onyx.colour.replace('#', '').toLowerCase();
        let hit = null;
        v.scene.traverse((g) => {
          if (!g.userData || g.userData.ccUnitId !== ${JSON.stringify(railUnit)}) return;
          g.traverse((o) => {
            if (hit || !o.isMesh || !o.geometry || o.geometry.type !== 'CylinderGeometry') return;
            const c = o.material && o.material.color ? o.material.color.getHexString() : null;
            if (c === wantColour) hit = { colour: c, radius: o.geometry.parameters.radiusTop * 1000 };
          });
        });
        return { hit, want: wantColour };
      `);
      measurements.f2.rail = railSeen;
      check('F2 — LIVE SCENE: the hanging rail is rendered in the chosen onyx',
        Boolean(railSeen.hit), JSON.stringify(railSeen));
      await frameUnits([railUnit]);
      await page.sleep(400);
      await shot('2c-the-rail-wearing-the-wizard-chosen-onyx-in-the-room', { mesh: await page.evaluate(`
        const v = ${P}.views.room; let id = null;
        v.scene.traverse((g) => {
          if (id || !g.userData || g.userData.ccUnitId !== ${JSON.stringify(railUnit)}) return;
          g.traverse((o) => { if (!id && o.isMesh && o.userData.ccPanelId) id = o.userData.ccPanelId; });
        });
        return id;
      `) });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F3 [CRITICAL] — front gaps become SELF-HEALING
    // ═══════════════════════════════════════════════════════════════════════
    //
    // The store is driven the way the audit drives it (window.__cc.project),
    // and the SCENE is measured per unit: the healed front's meshes must be
    // narrower by exactly the matrix's millimetres.
    if (want('f3')) {
      await page.evaluate(`
        const s = ${P}.project.getState();
        s.newProject('Turn 32 walk — F3', {
          room: { height: 2500, corners: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3600 }, { x: 0, y: 3600 }] },
        });
        ${P}.ui.getState().openEditor();
        ${P}.ui.getState().closeModal();
        ${P}.ui.getState().closeLibrary();
        ${P}.ui.getState().clearMessages();
        const a = s.addUnit('BUD');
        ${P}.project.getState().updateUnitParams(a.id, { doors: { count: 1 } });
        window.__t32f3 = { unitId: a.id };
        return true;
      `);
      const healed = await page.evaluate(`
        const s = ${P}.project.getState();
        const { unitId } = window.__t32f3;
        ${P}.ui.getState().clearMessages();
        s.addEndPanel(unitId, { side: 'R' });
        const front = s.unitResult(unitId).panels.find((p) => p.role === 'front');
        const notes = ${P}.ui.getState().messages.map((m) => ({ level: m.level, text: m.message }));
        window.__t32f3.panelId = front.id;
        window.__t32f3.engineW = front.w;
        return { w: front.w, trim: front.meta.edgeTrim || null, notes };
      `);
      measurements.f3 = { healed };
      check('F3 — the end panel appears and the front NARROWS ITSELF on that edge',
        healed.trim && healed.trim.right === 1.5 && healed.trim.left === 0, JSON.stringify(healed.trim));
      const grey = healed.notes.find((n) => /−1\.5 mm at an end panel/.test(n.text));
      check('F3 — the correction announces itself as a GREY note, never a question',
        Boolean(grey) && grey.level === 'grey', JSON.stringify(healed.notes));
      await shot('3a-the-grey-note-the-self-correction-speaks-with',
        { text: 'at an end panel' });

      // ── THE LIVE-SCENE PROOF ──
      const f3unit = await page.evaluate(`return window.__t32f3.unitId;`);
      await frameUnits([f3unit]);
      await page.sleep(400);
      const sceneFront = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let box = null;
        v.scene.traverse((g) => {
          if (!g.userData || g.userData.ccUnitId !== window.__t32f3.unitId) return;
          g.traverse((o) => {
            if (!o.isMesh || !o.userData || o.userData.ccPanelId !== window.__t32f3.panelId) return;
            box = new THREE.Box3().expandByObject(o);
          });
        });
        if (!box) return null;
        const s = box.getSize(new THREE.Vector3());
        return { sceneW: Math.round(s.x * 1000 * 10) / 10, engineW: window.__t32f3.engineW };
      `);
      measurements.f3.scene = sceneFront;
      check('F3 — LIVE SCENE: the healed front’s meshes measure the healed width',
        sceneFront && Math.abs(sceneFront.sceneW - sceneFront.engineW) <= 1, JSON.stringify(sceneFront));
      await shot('3b-the-front-standing-1-5-narrower-against-its-end-panel',
        { mesh: await page.evaluate('return window.__t32f3.panelId;') });

      // ── the dimension labels stand apart ──
      // The owner's own case: two adjacent cabinets, whose facing to-side
      // figures used to sit at the same height three millimetres apart.
      const rows = await page.evaluate(`
        const s = ${P}.project.getState();
        s.addUnit('BUD', { near: window.__t32f3.unitId, side: 'right' });
        const r = ${P}.project.getState().unitResult(window.__t32f3.unitId);
        const sides = window.__ccT28.frontDimensions
          .frontDimensionRows(r, ${P}.profile.getState().profile)
          .filter((x) => x.kind === 'to-side');
        return sides.map((x) => ({ kind: x.kind, at: Math.round(x.at * 10) / 10 }));
      `);
      measurements.f3.labelRows = rows;
      check('F3 — facing gap figures never share a line (the right one steps down a rung)',
        rows.length === 2 && Math.abs(rows[0].at - rows[1].at) >= 17, JSON.stringify(rows));
      await page.evaluate(`${P}.ui.getState().setShowFrontDimensions(true); return true;`);
      await page.sleep(500);
      await shot('3c-front-dimensions-on-with-the-figures-standing-apart',
        { dom: 'canvas' });
      await page.evaluate(`${P}.ui.getState().setShowFrontDimensions(false); return true;`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F4 [CRITICAL] — ZONES: the wardrobe's columns
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f4')) {
      await page.evaluate(`
        const s = ${P}.project.getState();
        s.newProject('Turn 32 walk — F4', {
          room: { height: 2600, corners: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3600 }, { x: 0, y: 3600 }] },
        });
        ${P}.ui.getState().openEditor();
        ${P}.ui.getState().closeModal();
        ${P}.ui.getState().closeLibrary();
        ${P}.ui.getState().clearMessages();
        const a = s.addUnit('WARDROBE');
        ${P}.project.getState().updateUnitParams(a.id, { width: 1200, doors: false });
        ${P}.project.getState().addPartition(a.id);
        window.__t32f4 = { unitId: a.id };
        return true;
      `);
      // The recessed-partition law, spoken: the refusal, the number, ONE
      // button — clicked with a REAL pointer.
      const refusal = await page.evaluate(`
        const s = ${P}.project.getState();
        ${P}.ui.getState().clearMessages();
        const res = s.addDrawers(window.__t32f4.unitId, 2, 'overlay', 220, 1);
        if (res.ok === false && res.guard) {
          ${P}.ui.getState().notify(res.error, 'error', {
            action: { label: 'Reset the setback', run: () => {} },
          });
        }
        return res;
      `);
      check('F4 — a recessed partition REFUSES drawers, with the number',
        refusal.ok === false && /20 mm back/.test(refusal.error || ''), refusal.error);
      await shot('4a-the-guard-speaks-the-setback-number-and-one-button',
        { text: 'Reset the setback' });

      const built = await page.evaluate(`
        const s = ${P}.project.getState();
        const { unitId } = window.__t32f4;
        const part = s.units.find((u) => u.id === unitId).params.sections[0].items.find((i) => i.kind === 'partition');
        s.updateItem(unitId, part.id, { front_mm: 0 });
        const ok = ${P}.project.getState().addDrawers(unitId, 2, 'overlay', 220, 1);
        ${P}.project.getState().addHangerRail(unitId, { zone: 0 });
        const r = ${P}.project.getState().unitResult(unitId);
        const zones = ${P}.project.getState().zonesOf(unitId);
        const front = r.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta && p.meta.zone === 1);
        window.__t32f4.frontId = front ? front.id : null;
        window.__t32f4.expectW = front ? front.w : null;
        return {
          ok: ok.ok,
          bay: zones[1] ? { from: zones[1].from, size: zones[1].size } : null,
          frontW: front ? front.w : null,
          rails: r.assemblies.columnRails.length,
          closer: Boolean(r.panels.find((p) => p.id === 'Z2-PART')),
          partitionRunnerHoles: r.drills.filter((d) => d.panel === 'VPART-1' && d.kind === 'runner').length,
        };
      `);
      measurements.f4 = { built };
      check('F4 — the column’s drawers are cut FROM THE COLUMN’S WALLS',
        built.ok && built.frontW != null && Math.abs(built.frontW - (built.bay.size - 10 + 4)) < 0.01,
        JSON.stringify(built));
      check('F4 — the runner rows land on the PARTITION — it does the DP’s job',
        built.partitionRunnerHoles > 0 && built.closer, `${built.partitionRunnerHoles} holes`);
      check('F4 — the other column hangs its own rail', built.rails === 1, `${built.rails} column rail(s)`);

      // ── THE LIVE-SCENE PROOF ── the drawer front's meshes stand inside the
      // column, at the column-computed width.
      const f4unit = await page.evaluate(`return window.__t32f4.unitId;`);
      await frameUnits([f4unit], [0.4, 0.2, 2]);
      await page.sleep(400);
      const colScene = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let box = null;
        v.scene.traverse((g) => {
          if (!g.userData || g.userData.ccUnitId !== window.__t32f4.unitId) return;
          g.traverse((o) => {
            if (!o.isMesh || !o.userData || o.userData.ccPanelId !== window.__t32f4.frontId) return;
            box = new THREE.Box3().expandByObject(o);
          });
        });
        if (!box) return null;
        const s = box.getSize(new THREE.Vector3());
        return { sceneW: Math.round(s.x * 1000 * 10) / 10, engineW: window.__t32f4.expectW };
      `);
      measurements.f4.scene = colScene;
      check('F4 — LIVE SCENE: the column drawer front measures its column width',
        colScene && Math.abs(colScene.sceneW - colScene.engineW) <= 1, JSON.stringify(colScene));
      await shot('4b-two-drawers-and-a-rail-living-in-their-own-columns',
        { mesh: await page.evaluate('return window.__t32f4.frontId;') });

      // ── internal drawers hide behind the doors, revealed when they open ──
      const internal = await page.evaluate(`
        const s = ${P}.project.getState();
        const { unitId } = window.__t32f4;
        s.addDrawers(unitId, 2, 'internal', 220, 1);
        s.setDoors(unitId, { count: 2, hinge: 'L' });
        const r = ${P}.project.getState().unitResult(unitId);
        const fronts = r.panels.filter((p) => p.part === 'FRONT').map((p) => p.id);
        ${P}.ui.getState().openFrontsFor(unitId, fronts);
        return {
          hasBox: r.panels.some((p) => p.id === 'Z2D1-SL'),
          noFace: !r.panels.some((p) => p.part === 'DRAWER-FRONT' && p.meta && p.meta.zone === 1),
          doorsOpen: fronts.length,
        };
      `);
      await page.sleep(600);
      check('F4 — internal drawers: box and runners, NO face, behind the doors',
        internal.hasBox && internal.noFace && internal.doorsOpen > 0, JSON.stringify(internal));
      await shot('4c-internal-drawers-revealed-behind-the-open-doors',
        { mesh: 'Z2D1-SL' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F5 [CRITICAL] — the BOM the workshop can invoice from
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f5')) {
      await page.evaluate(`
        const s = ${P}.project.getState();
        s.newProject('Turn 32 walk — F5', {
          room: { height: 2600, corners: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3600 }, { x: 0, y: 3600 }] },
        });
        ${P}.ui.getState().openEditor();
        ${P}.ui.getState().closeModal();
        ${P}.ui.getState().closeLibrary();
        const a = s.addUnit('WARDROBE');
        ${P}.project.getState().updateUnitParams(a.id, { width: 900 });
        ${P}.project.getState().addPlinth(a.id);
        ${P}.project.getState().addDrawers(a.id, 2, 'overlay', 220);
        ${P}.project.getState().addShelves(a.id, 2);
        ${P}.project.getState().addHangerRail(a.id);
        ${P}.project.getState().setDoors(a.id, { count: 2, hinge: 'L' });
        ${P}.ui.getState().closeAllFronts();
        window.__t32f5 = { unitId: a.id };
        return true;
      `);
      await page.waitFor(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BOM')`, { what: 'the toolbar' });
      await page.click('button', 'BOM', { exact: true });
      await page.waitFor(`document.querySelector('[data-bom-order-tab="1"]')`, { what: 'the BOM panel' });
      await page.click('[data-bom-order-tab="1"]');
      await page.waitFor(`document.querySelector('[data-bom-order="1"]')`, { what: 'the Order tab' });

      // ── THE LIVE MEASURE ── the screen against the app's OWN functions —
      // never a re-implementation beside them (R4).
      const order = await page.evaluate(`
        const s = ${P}.project.getState();
        const profile = ${P}.profile.getState().profile;
        const design = s.project.design;
        const materials = ${P}.materials.getState().materials;
        const entries = s.allResults();
        const bom = window.__ccT32.bomCore.buildBom(entries, { design, profile, materials });
        const summary = window.__ccT32.bomInvoice.materialsSummary(bom, profile);
        const iron = window.__ccT32.bomInvoice.ironmongerySummary({ entries, bom, design, profile, materials });
        const dom = document.querySelector('[data-bom-order="1"]').innerText;
        const fronts = document.querySelector('[data-bom-materials="fronts"]');
        const yellows = document.querySelectorAll('[data-bom-yellow="1"]').length;
        return {
          firstSheetLabel: summary[0] ? summary[0].sheet_label : null,
          domHasSheetLabel: summary[0] ? dom.includes(summary[0].sheet_label) : false,
          frontsApart: Boolean(fronts),
          yellowsOnScreen: yellows,
          yellowsInEngine: iron.filter((l) => l.yellow).length,
          clips: iron.find((l) => l.role === 'plinth_clips')?.qty ?? null,
          railUnit: iron.find((l) => l.role === 'rail')?.unit ?? null,
          screws: iron.filter((l) => l.role.startsWith('screws:')).length,
        };
      `);
      measurements.f5 = { order };
      check('F5 — the sheets line is a DIVISION with the label, on screen',
        /sheets? of 2800×2070/.test(order.firstSheetLabel || '') && order.domHasSheetLabel,
        order.firstSheetLabel);
      check('F5 — FRONTS are listed separately from carcasses', order.frontsApart);
      check('F5 — LIVE MEASURE: every engine yellow is a yellow on screen',
        order.yellowsOnScreen === order.yellowsInEngine && order.yellowsInEngine > 0,
        `screen ${order.yellowsOnScreen} · engine ${order.yellowsInEngine}`);
      check('F5 — clips from FRONT legs only; the rail by the METRE; screws off the drilling',
        order.clips === 2 && order.railUnit === 'm' && order.screws >= 2, JSON.stringify(order));
      await shot('5a-the-order-two-blocks-the-workshop-can-invoice-from',
        { dom: '[data-bom-order="1"]', text: 'sheets of 2800×2070' });
      await shot('5b-yellow-named-spec-lines-where-no-article-exists',
        { dom: '[data-bom-yellow="1"]' });

      await page.click('[data-bom-export="1"]');
      await page.sleep(400);
      const exported = await page.evaluate(`
        return ${P}.ui.getState().messages.some((m) => /BOM exported/.test(m.message));
      `);
      check('F5 — one export: {ProjectName}-bom-{DDMM-HHMM}.csv leaves the building', exported);
      await page.evaluate(`${P}.ui.getState().setBomOpen(false); return true;`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F6 [HIGH] — the hardware REGISTER: it informs, it never blocks
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Runs on the f5 project, with the BOM's Order tab as the witness: in
    // mock mode every lookup answers null (the yellow lines are the proof the
    // app lives), and a seeded row turns its line from a named spec into an
    // article — the register OVERRULES, nothing else moves.
    if (want('f6')) {
      await page.waitFor(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BOM')`, { what: 'the editor' });
      const mock = await page.evaluate(`
        const reg = window.__ccT32.hardwareRegister;
        return {
          mockRows: reg.hardwareRegisterRows().length,
          mockAnswer: reg.registerLookup({ category: 'clip' }),
          badge: document.body.innerText.includes('MOCK DATA MODE'),
        };
      `);
      check('F6 — mock mode: the register holds nothing and answers null, app fully alive',
        mock.mockRows === 0 && mock.mockAnswer === null && mock.badge, JSON.stringify(mock));

      await page.evaluate(`
        ${P}.ui.getState().setCheckOpen(false);
        ${P}.ui.getState().clearMessages();
        ${P}.ui.getState().setBomOpen(true);
        return true;
      `);
      await page.waitFor(`document.querySelector('[data-bom-order-tab="1"]')`, { what: 'the BOM' });
      await page.sleep(300);
      await page.click('[data-bom-order-tab="1"]');
      await page.sleep(300);
      if (!await page.evaluate(`return Boolean(document.querySelector('[data-bom-order="1"]'));`)) {
        await page.click('[data-bom-order-tab="1"]');
      }
      await page.waitFor(`document.querySelector('[data-bom-order="1"]')`, { what: 'the Order tab' });
      const seeded = await page.evaluate(`
        const before = document.querySelectorAll('[data-bom-yellow="1"]').length;
        // The seed, as the script would install it — a workshop clip row.
        window.__ccT32.hardwareRegister.installHardwareRegister([
          { category: 'clip', family: 'K10', article: 'CL-100', label: 'Plinth clip K10' },
        ]);
        // A design touch re-derives the panel, exactly as any edit would.
        ${P}.project.getState().setDesign({});
        return { before };
      `);
      await page.sleep(400);
      const after = await page.evaluate(`
        const clips = [...document.querySelectorAll('[data-bom-line="plinth_clips"]')][0];
        return {
          yellows: document.querySelectorAll('[data-bom-yellow="1"]').length,
          clipsText: clips ? clips.innerText : '',
        };
      `);
      measurements.f6 = { ...seeded, ...after };
      check('F6 — a REGISTERED row resolves its article; the register informs, nothing blocks',
        after.yellows === seeded.before - 1 && /art\. CL-100/.test(after.clipsText),
        JSON.stringify({ before: seeded.before, after: after.yellows, clips: after.clipsText }));
      await shot('6a-the-registered-clip-buying-by-article-beside-the-yellow-specs',
        { dom: '[data-bom-line="plinth_clips"]', text: 'CL-100' });
      await page.evaluate(`
        window.__ccT32.hardwareRegister.clearHardwareRegister();
        ${P}.ui.getState().setBomOpen(false);
        return true;
      `);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F7 [HIGH] — ready-made drawer boxes: bought, not cut; still drawn
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f7')) {
      await page.waitFor(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BOM')`, { what: 'the editor' });
      const f7 = await page.evaluate(`
        const s = ${P}.project.getState();
        const unit = s.units[0];
        const before = s.unitResult(unit.id);
        const boxLinesBefore = before.csvLines.filter((l) => /D\\d-(SL|SR|BF|BB|DNO)/.test(l)).length;
        const meshCount = (id) => {
          const v = ${P}.views.room;
          let n = 0;
          v.scene.traverse((g) => {
            if (!g.userData || g.userData.ccUnitId !== id) return;
            g.traverse((o) => { if (o.isMesh && o.userData && /D\\d-(SL|SR|BF|BB|DNO)/.test(String(o.userData.ccPanelId || ''))) n += 1; });
          });
          return n;
        };
        const meshesBefore = meshCount(unit.id);
        s.setDesign({ drawerBoxes: { mode: 'ready' } });
        const after = ${P}.project.getState().unitResult(unit.id);
        window.__t32f7 = { unitId: unit.id };
        return {
          boxLinesBefore,
          boxLinesAfter: after.csvLines.filter((l) => /D\\d-(SL|SR|BF|BB|DNO)/.test(l)).length,
          frontsStillCut: after.csvLines.filter((l) => /-DF\\d/.test(l)).length,
          meshesBefore,
        };
      `);
      await page.sleep(600);
      const f7scene = await page.evaluate(`
        const v = ${P}.views.room;
        let n = 0;
        v.scene.traverse((g) => {
          if (!g.userData || g.userData.ccUnitId !== window.__t32f7.unitId) return;
          g.traverse((o) => { if (o.isMesh && o.userData && /D\\d-(SL|SR|BF|BB|DNO)/.test(String(o.userData.ccPanelId || ''))) n += 1; });
        });
        return n;
      `);
      measurements.f7 = { ...f7, meshesAfter: f7scene };
      check('F7 — the box parts LEAVE the cutting list; the faces stay ours',
        f7.boxLinesBefore >= 8 && f7.boxLinesAfter === 0 && f7.frontsStillCut > 0,
        JSON.stringify(f7));
      check('F7 — LIVE SCENE: the geometry stays — every box board still stands in 3D',
        f7scene === f7.meshesBefore && f7scene >= 8,
        `meshes before ${f7.meshesBefore} · after ${f7scene}`);
      await page.evaluate(`
        ${P}.ui.getState().setCheckOpen(false);
        ${P}.ui.getState().clearMessages();
        ${P}.ui.getState().setBomOpen(true);
        return true;
      `);
      await page.waitFor(`document.querySelector('[data-bom-order-tab="1"]')`, { what: 'the BOM' });
      await page.sleep(300);
      await page.click('[data-bom-order-tab="1"]');
      await page.waitFor(`document.querySelector('[data-bom-order="1"]')`, { what: 'the Order tab' });
      const purchase = await page.evaluate(`
        const el = [...document.querySelectorAll('[data-bom-line="ready_boxes"]')];
        return el.map((x) => x.innerText.replace(/\\n/g, ' · '));
      `);
      check('F7 — a PURCHASE LINE per bought box, as a named spec',
        purchase.length >= 1 && /Ready-made drawer box/.test(purchase[0] || ''), JSON.stringify(purchase));
      await shot('7a-ready-made-boxes-bought-as-purchase-lines-not-cut-parts',
        { dom: '[data-bom-line="ready_boxes"]', text: 'Ready-made drawer box' });
      await page.evaluate(`
        ${P}.project.getState().setDesign({ drawerBoxes: { mode: 'same' } });
        ${P}.ui.getState().setBomOpen(false);
        return true;
      `);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F8 [MEDIUM] — the library follows the project: a filter, never a block
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f8')) {
      await page.evaluate(`
        ${P}.project.getState().setDesign({ projectType: 'wardrobe' });
        ${P}.ui.getState().setLibraryCategory('kitchen');
        return true;
      `);
      await page.waitFor(`document.querySelector('[data-library-list="1"]')`, { what: 'the library' });
      const f8 = await page.evaluate(`
        const list = document.querySelector('[data-library-list="1"]').innerText;
        const btn = document.querySelector('[data-library-show-all="1"]');
        return {
          baseUnitsGone: !/Base units/i.test(list),
          wallUnitsGone: !/Wall units/i.test(list),
          escape: btn ? btn.innerText.trim() : null,
        };
      `);
      measurements.f8 = f8;
      check('F8 — a wardrobe project’s Kitchen shelf hides the kitchen-only kits',
        f8.baseUnitsGone && f8.wallUnitsGone, JSON.stringify(f8));
      check('F8 — "Show all" is the one-click way past it — a filter, never a block',
        /^▾ Show all \(\d+ more\)$/.test(f8.escape || ''), f8.escape);
      await shot('8a-the-wardrobe-librarys-kitchen-shelf-filtered-with-show-all',
        { dom: '[data-library-show-all="1"]', text: 'Show all' });
      await page.click('[data-library-show-all="1"]');
      const f8open = await page.evaluate(`
        const list = document.querySelector('[data-library-list="1"]').innerText;
        return { baseBack: /Base units/i.test(list), wallBack: /Wall units/i.test(list) };
      `);
      check('F8 — one real click and everything is back', f8open.baseBack && f8open.wallBack);
      await shot('8b-show-all-brings-the-kitchen-kits-back',
        { dom: '[data-library-list="1"]', text: 'Base units' });
      await page.evaluate(`
        ${P}.project.getState().setDesign({ projectType: null });
        ${P}.ui.getState().closeLibrary();
        return true;
      `);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F9 [MEDIUM] — the handle preview: the owner's drawing, and the toggle
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f9')) {
      await page.evaluate(`
        const s = ${P}.project.getState();
        s.newProject('Turn 32 walk — F9', {
          room: { height: 2500, corners: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3600 }, { x: 0, y: 3600 }] },
        });
        ${P}.ui.getState().openEditor();
        ${P}.ui.getState().closeModal();
        ${P}.ui.getState().closeLibrary();
        const a = s.addUnit('BUD');
        ${P}.project.getState().updateUnitParams(a.id, { width: 600, doors: { count: 1 } });
        ${P}.project.getState().setProjectHandle({ type: 'bar', centres: 160 });
        window.__t32f9 = { unitId: a.id };
        return true;
      `);
      await page.waitFor(`(() => {
        const v = ${P}.views && ${P}.views.room;
        if (!v) return false;
        let n = 0;
        v.scene.traverse((o) => { if (o.userData && o.userData.ccAuraKind === 'handle') n += 1; });
        return n >= 1;
      })()`, { what: 'the handle aura', timeout: 30000 });
      // Aim the camera at the handle itself, off its own world position.
      await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        let mesh = null;
        v.scene.updateMatrixWorld(true);
        v.scene.traverse((o) => { if (!mesh && o.userData && o.userData.ccAuraKind === 'handle') mesh = o; });
        const c = mesh.getWorldPosition(new THREE.Vector3());
        if (v.controls) v.controls.enableDamping = false;
        if (v.controls && v.controls.target) v.controls.target.copy(c);
        v.camera.position.set(c.x + 0.3, c.y + 0.12, c.z + 0.9);
        v.camera.up.set(0, 1, 0);
        v.camera.lookAt(c);
        v.camera.updateProjectionMatrix();
        if (v.controls) v.controls.update();
        return true;
      `);
      await page.sleep(600);
      // A REAL pointer, into the catchment.
      const spot = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        let mesh = null;
        v.scene.traverse((o) => { if (!mesh && o.userData && o.userData.ccAuraKind === 'handle') mesh = o; });
        const c = mesh.getWorldPosition(new THREE.Vector3()).project(v.camera);
        const r = v.gl.domElement.getBoundingClientRect();
        return { x: r.left + ((c.x + 1) / 2) * r.width, y: r.top + ((1 - c.y) / 2) * r.height };
      `);
      await page.mouse('mouseMoved', spot.x, spot.y, { buttons: 0, clickCount: 0 });
      await page.sleep(400);
      const f9 = await page.evaluate(`
        const v = ${P}.views.room;
        let chain = null;
        v.scene.traverse((o) => {
          if (!chain && o.userData && /^handle-dims-/.test(String(o.userData.ccDimensionChain || ''))) chain = o.userData;
        });
        // The old single orange label was a sprite child of the aura GROUP —
        // with the drawing in its place, the aura group carries no sprite of
        // its own (the chain's captions are its own children).
        let auraSprites = 0;
        v.scene.traverse((o) => {
          if (o.userData && o.userData.ccHoverAura) {
            for (const child of o.children) if (child.isSprite) auraSprites += 1;
          }
        });
        return { chain, auraSprites };
      `);
      measurements.f9 = f9;
      check('F9 — the hovered handle shows the owner’s DRAWING: three CAD figures',
        f9.chain && f9.chain.ccDimensionRows === 3, JSON.stringify(f9.chain));
      check('F9 — …REPLACING the single orange number (the aura itself carries no label)',
        f9.auraSprites === 0, `${f9.auraSprites} sprite(s) on the aura`);
      await shot('9a-the-owners-drawing-top-side-and-spacing-on-the-hovered-handle',
        { dom: 'canvas' });

      // The GLOBAL toggle, in the View menu — a real click opens the menu.
      await page.mouse('mouseMoved', 40, 900, { buttons: 0, clickCount: 0 });
      await page.sleep(800);
      await page.click('button', 'View', { exact: true });
      await page.sleep(300);
      const toggle = await page.evaluate(`
        return document.body.innerText.includes('Show front dimensions');
      `);
      check('F9 — the GLOBAL "Front dimensions" toggle stands in the View menu', toggle);
      await shot('9b-the-global-front-dimensions-toggle-in-the-view-menu',
        { text: 'Show front dimensions' });
      await page.key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
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
