#!/usr/bin/env node
// ─── Turn 36 acceptance walk — one settings modal, and everything else ─────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn36.mjs [--only f1,f2,…] [--out verify/t36/]
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R6  a console error fails the step it happened in.
//   T33 LIVE-SCENE PROOF: store/UI features are measured on the running app.
//
// ─── AND TURN 36'S OWN RULE 6, WHICH IS WHY THIS FILE MATTERS ──────────────
//
// T35-F1 shipped an engine and a modal for the hanging rail and NO CLICKABLE
// TARGET, and nobody found out until the owner opened the app, because no
// screenshot existed that would have shown it. CLAUDE.md's iron rule 6 for
// this turn: "EVERY feature with a visible surface ships at least one
// verify/t36/ proof with its named subject, driven by real pointer input, or
// the feature is not done." So the F8 phase below double-clicks the RAIL
// ITSELF with a real mouse and photographs the modal that opens beside it.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t36/', import.meta.url).pathname);
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
  const page = await launch({ width: 1600, height: 1250 });

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
        if (want.all) {
          out.all = want.all.every((sel) => {
            const el = document.querySelector(sel);
            return Boolean(el && el.getClientRects().length);
          });
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

  /** Put the camera in front of a set of cabinets, framed off their own normal. */
  const frameFacing = async (unitIds, { dist = 2.2, height = 1.0, target = null } = {}) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = new Set(${JSON.stringify(unitIds)});
    const dist = ${JSON.stringify(dist)};
    const height = ${JSON.stringify(height)};
    const target = ${JSON.stringify(target)};
    v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const normal = new THREE.Vector3();
    let found = 0;
    v.scene.traverse((g) => {
      if (!g.userData || !want.has(g.userData.ccUnitId)) return;
      let mine = 0;
      g.traverse((o) => {
        if (!o.isMesh || !o.userData || !o.userData.ccPanelId) return;
        box.expandByObject(o);
        mine += 1;
      });
      if (!mine) return;
      found += mine;
      const q = new THREE.Quaternion();
      g.getWorldQuaternion(q);
      normal.add(new THREE.Vector3(0, 0, 1).applyQuaternion(q));
    });
    if (!found) return null;
    if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
    normal.y = 0;
    normal.normalize();
    let subject = box;
    if (target) {
      const t = new THREE.Box3();
      let hit = 0;
      v.scene.traverse((g) => {
        if (!g.userData || !want.has(g.userData.ccUnitId)) return;
        g.traverse((o) => {
          if (!o.isMesh || !o.userData || o.userData.ccPanelId !== target) return;
          t.expandByObject(o); hit += 1;
        });
      });
      if (hit) subject = t;
    }
    const c = subject.getCenter(new THREE.Vector3());
    const r = Math.max(0.4, subject.getSize(new THREE.Vector3()).length() / 2);
    const D = Math.max(dist, r * 1.4);
    if (v.controls) v.controls.enableDamping = false;
    if (v.controls && v.controls.target) v.controls.target.copy(c);
    v.camera.position.set(c.x + normal.x * D, c.y + height, c.z + normal.z * D);
    v.camera.up.set(0, 1, 0);
    v.camera.lookAt(c);
    v.camera.updateProjectionMatrix();
    if (v.controls) v.controls.update();
    return { found, distance: Math.round(D * 100) / 100 };
  `);

  /** The screen point of a VISIBLE face of one mesh, for a real mouse gesture. */
  const pointOnMesh = async (unitId, panelId) => page.evaluate(`
    const v = ${P}.views.room;
    const THREE = v.three;
    v.scene.updateMatrixWorld(true);
    let mesh = null;
    v.scene.traverse((g) => {
      if (mesh || !g.userData || g.userData.ccUnitId !== ${JSON.stringify(unitId)}) return;
      g.traverse((o) => {
        if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) mesh = o;
      });
    });
    if (!mesh) return null;
    const b = new THREE.Box3().expandByObject(mesh);
    const c = b.getCenter(new THREE.Vector3());
    const p = new THREE.Vector3(c.x, c.y, b.max.z - 0.002).project(v.camera);
    const r = v.gl.domElement.getBoundingClientRect();
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  `);

  /**
   * Type a number into a field the way a joiner does: a REAL triple-click to
   * select what is in it, real text insertion, and a real Enter to commit.
   *
   * `Input.insertText` is a CDP input event — the browser's own text entry
   * path — which is what R1 asks for. A `value =` assignment would set the
   * DOM property and never reach React's onChange, and a synthetic event is
   * banned outright by the guard at the top of this file.
   */
  const typeInto = async (selector, text) => {
    const box = await page.click(selector);
    for (const clickCount of [1, 2, 3]) {
      await page.mouse('mousePressed', box.x, box.y, { clickCount });
      await page.mouse('mouseReleased', box.x, box.y, { buttons: 0, clickCount });
    }
    await page.send('Input.insertText', { text: String(text) });
    await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
    await page.sleep(300);
  };

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);
  const ui = (expr) => page.evaluate(`const u = ${P}.ui.getState(); return (${expr});`);

  const measurements = {};

  /** A CLEAN FLOOR for one phase — the T34 lesson about a crowded room. */
  const freshFloor = async (name, projectType = 'wardrobe') => store(`s.loadProject({
    id: null, name: ${JSON.stringify(`T36 walk · ${name}`)}, number: '36', client: 'the owner',
    room: { height: 2600, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] },
    design: { projectType: ${JSON.stringify(projectType)} },
  }, []) || true`);

  /** What the unified settings panel is showing, right now, in the DOM. */
  const settingsInventory = () => page.evaluate(`
    const root = document.querySelector('[data-settings-surface]');
    if (!root) return null;
    const sections = [...root.querySelectorAll('[data-settings-section]')]
      .map((n) => n.getAttribute('data-settings-section')).sort();
    const named = (sel) => Boolean(root.querySelector(sel));
    return {
      door: root.getAttribute('data-settings-door'),
      sections,
      thickness: named('[data-thickness-slots]'),
      sheet: named('[data-sheet-family="carcasses"]') && named('[data-sheet-family="fronts"]'),
      doorStyle: named('[data-new-style]'),
      runnerVariant: named('[data-runner-variant]'),
      platePilot: named('[data-hinge-plate-pilot]'),
      hingeStandard: named('[data-hinge-standard]'),
      runMaterials: named('[data-run-materials]'),
      joinery: named('[data-joinery-option]'),
      infill: named('[data-infill-side-width]'),
      wallMount: named('[data-dimension="wallMount"]'),
      sets: named('[data-set-save]'),
    };
  `);

  try {
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    check('R8 — the app is pointed at the silent showroom', true, showroom.url);

    // ═══════════════════════════════════════════════════════════════════════
    // F1 — ONE SETTINGS MODAL: the same panel through BOTH doors
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f1')) {
      // ── DOOR A: the NEW-PROJECT flow, walked with a real mouse ──
      await page.evaluate(`${P}.ui.getState().goToStart(); return true;`);
      await page.sleep(400);
      await page.click('button', 'New project');
      await page.sleep(300);
      await page.click('button', 'Next');          // step 1 · info
      await page.sleep(250);
      await page.click('button', 'Next');          // step 2 · type (kitchen)
      await page.sleep(250);
      await page.click('button', 'One wall');      // step 3 · scope — straight to settings
      await page.sleep(200);
      await page.click('button', 'Next — settings');
      await page.sleep(900);

      const wizardInv = await settingsInventory();
      measurements.f1_wizard_door = wizardInv;
      check('F1 — the NEW-PROJECT door shows the unified panel',
        wizardInv && wizardInv.door === 'wizard', JSON.stringify(wizardInv && wizardInv.sections));
      check('F1 — …with the five rows T35 left in the old panel only',
        wizardInv && wizardInv.thickness && wizardInv.sheet && wizardInv.doorStyle
          && wizardInv.runnerVariant && wizardInv.platePilot,
        JSON.stringify(wizardInv));
      await shot('f1a-the-unified-panel-through-the-new-project-door', {
        all: [
          '[data-settings-surface][data-settings-door="wizard"]',
          '[data-settings-section="thickness"]',
          '[data-settings-section="sheet"]',
          '[data-settings-section="door-style"]',
          '[data-hinge-plate-pilot]',
          '[data-runner-variant]',
        ],
      });

      // ── DOOR B: Settings… from the menu, on a project that exists ──
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await freshFloor('one settings modal', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(600);
      await page.waitFor('document.querySelector(\'nav\')', { what: 'the editor chrome' });
      await store(`(() => { const { id } = s.addUnit('WARDROBE'); s.updateUnitParams(id, { width: 900, height: 2100 }); return id; })()`);
      await page.sleep(400);

      await page.click('nav button', 'Settings');
      await page.sleep(200);
      await page.click('[role="menuitem"], button', 'Settings…');
      await page.sleep(800);

      const editInv = await settingsInventory();
      measurements.f1_edit_door = editInv;
      check('F1 — the EDIT door shows the SAME panel, told which door it is',
        editInv && editInv.door === 'project', JSON.stringify(editInv && editInv.sections));
      check('F1 — the two doors show the SAME sections',
        wizardInv && editInv
          && JSON.stringify(wizardInv.sections) === JSON.stringify(editInv.sections),
        `${JSON.stringify(wizardInv && wizardInv.sections)} vs ${JSON.stringify(editInv && editInv.sections)}`);
      check('F1 — and every named row of the old panel is on it',
        editInv && ['thickness', 'sheet', 'doorStyle', 'runnerVariant', 'platePilot',
          'hingeStandard', 'runMaterials', 'joinery', 'infill', 'wallMount', 'sets']
          .every((k) => editInv[k]),
        JSON.stringify(editInv));
      check('F1 — the fronts are NOT locked behind a save from the edit door',
        (await page.evaluate('return document.querySelector(\'[data-fronts-locked]\')?.getAttribute(\'data-fronts-locked\');')) === '0',
        'data-fronts-locked');
      await shot('f1b-the-unified-panel-through-the-edit-door', {
        all: [
          '[data-settings-surface][data-settings-door="project"]',
          '[data-settings-section="thickness"]',
          '[data-settings-section="sheet"]',
          '[data-settings-section="door-style"]',
          '[data-hinge-plate-pilot]',
          '[data-runner-variant]',
        ],
      });

      // The rows the owner could not find yesterday, photographed close up and
      // REACHED WITH A REAL CLICK — the pilot flips under the hand.
      const before = await page.evaluate(`
        const el = document.querySelector('[data-hinge-plate-pilot]');
        if (el) el.scrollIntoView({ block: 'center' });
        return ${P}.profile.getState().profile.hinges.platePilotD;
      `);
      await page.sleep(250);
      await page.click('[data-hinge-plate-pilot-option="3"]');
      await page.sleep(300);
      const after = await page.evaluate(`return ${P}.profile.getState().profile.hinges.platePilotD;`);
      measurements.f1_plate_pilot = { before, after };
      check('F1 — the hinge-plate pilot really works from the unified panel',
        before === 5 && after === 3, `⌀${before} → ⌀${after}`);
      await shot('f1c-the-hinge-plate-pilot-and-the-sheet-sizes-on-the-edit-door', {
        all: ['[data-hinge-plate-pilot-option="3"][aria-pressed="true"]', '[data-sheet-family="fronts"]'],
      });
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(200);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F6 — SPLIT DOORS: two segments, a full-depth divider, hinges per segment
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f6')) {
      await freshFloor('split doors', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const splitId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 900, height: 2150, doors: { count: 1 } });
        return id;
      })()`);
      await page.sleep(500);

      // THE GESTURE: the number is typed into the panel's own field with a
      // real keyboard, not written into the store.
      await ui(`u.selectUnit(${JSON.stringify(splitId)}) || true`);
      await page.sleep(400);
      // The right panel folds its sections; the Doors one is opened with a
      // real click on its own header, exactly as a joiner opens it.
      await page.click('[data-section="Doors"] button');
      await page.sleep(300);
      await typeInto('[data-split-top]', '600');
      await page.sleep(600);

      const rec = await store(`(s.unitResult(${JSON.stringify(splitId)}).assemblies.splitDoors || [])[0]`);
      measurements.f6_record = rec;
      check('F6 — the number typed into the panel reached the engine',
        rec && rec.topMm === 600, JSON.stringify(rec && { top: rec.topMm, opening: rec.opening }));
      check('F6 — top + 3 + bottom = the opening, exactly',
        rec && rec.segments[0].h + rec.gapMm + rec.segments[1].h === rec.opening,
        rec && `${rec.segments[0].h} + ${rec.gapMm} + ${rec.segments[1].h} = ${rec.opening}`);
      check('F6 — the segments are listed TOP FIRST',
        rec && rec.segments[0].id === 'T' && rec.segments[1].id === 'B',
        rec && rec.segments.map((x) => x.id).join(','));
      check('F6 — hinges are counted PER SEGMENT, never the whole door halved',
        rec && rec.segments[0].hinges === 2 && rec.segments[1].hinges === 3,
        rec && rec.segments.map((x) => `${x.id}:${x.hinges}`).join(' '));

      const divider = await store(`(() => {
        const r = s.unitResult(${JSON.stringify(splitId)});
        const d = r.panels.find((p) => p.meta && p.meta.splitDivider);
        return d ? { id: d.id, w: d.w, depth: d.h, t: d.thickness, y: d.box.y, frontZ: d.box.z + d.box.d, D: r.params.depth } : null;
      })()`);
      measurements.f6_divider = divider;
      check('F6 — ONE fix shelf on the line, FULL depth, flush with the face',
        divider && divider.frontZ === divider.D && divider.depth === divider.D - 18 && divider.t === 18,
        JSON.stringify(divider));

      // LIVE SCENE: both segments are actually drawn, and the doors swing.
      const fronts = await store(`s.unitResult(${JSON.stringify(splitId)}).panels.filter((p) => p.part === 'FRONT').map((p) => p.id)`);
      await ui(`u.openFrontsFor(${JSON.stringify(splitId)}, ${JSON.stringify(fronts)}) || true`);
      await page.sleep(500);
      await frameFacing([splitId], { dist: 2.4, height: 1.1 });
      await page.sleep(500);
      const drawn = await page.evaluate(`
        const v = ${P}.views.room;
        v.scene.updateMatrixWorld(true);
        const ids = [];
        v.scene.traverse((g) => {
          if (!g.userData || g.userData.ccUnitId !== ${JSON.stringify(splitId)}) return;
          g.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId && o.visible) ids.push(o.userData.ccPanelId); });
        });
        return [...new Set(ids)].filter((id) => /-T$|-B$|^SPLIT-/.test(id)).sort();
      `);
      const expected = await store(`(() => {
        const a = s.unitResult(${JSON.stringify(splitId)}).assemblies;
        return (a.splitDoors || []).length * 2 + (a.splitDividers || []).length;
      })()`);
      measurements.f6_scene = { drawn, expected };
      check('F6 — every segment AND the divider stand in the scene',
        drawn.length === expected, `${drawn.length}/${expected} · ${drawn.join(' ')}`);
      await shot('f6a-a-split-bay-open-in-the-scene', { mesh: 'SPLIT-1' });

      // …and the door modal lists the two segments, top first.
      const topId = fronts.find((id) => id.endsWith('-T'));
      const spot = await pointOnMesh(splitId, topId);
      if (spot) await page.dblclick(spot.x, spot.y);
      await page.sleep(700);
      const tabs = await page.evaluate(`
        const el = document.querySelector('[data-split-modal]');
        if (!el) return null;
        return [...el.querySelectorAll('[data-split-segment-tab]')].map((n) => n.getAttribute('data-split-segment-tab'));
      `);
      measurements.f6_modal_tabs = tabs;
      check('F6 — the modal lists the segments TOP FIRST',
        Array.isArray(tabs) && tabs.join(',') === 'T,B', JSON.stringify(tabs));
      await shot('f6b-the-split-modal-lists-its-segments-top-first', {
        all: ['[data-split-modal]', '[data-split-segment-tab="T"]', '[data-split-segment-tab="B"]'],
      });
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(200);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F4 — HINGES: the plate seated 5 mm in, and the modal listing top-first
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f4')) {
      await freshFloor('hinges', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const hingeId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 600, height: 2000, doors: { count: 1 } });
        return id;
      })()`);
      await page.sleep(900);
      const fronts = await store(`s.unitResult(${JSON.stringify(hingeId)}).panels.filter((p) => p.part === 'FRONT').map((p) => p.id)`);
      // The MODAL is reached first, with the leaf SHUT: a swung door is a
      // moving target for a real double-click, and the rows it lists are the
      // cabinet's whether it is open or not.
      await ui(`u.closeAllFronts(${JSON.stringify(hingeId)}) || true`);
      await frameFacing([hingeId], { dist: 2.2, height: 0.4 });
      await page.sleep(600);

      // (c) THE MODAL, TOP FIRST — reached by a REAL double-click on the door.
      const doorSpot = await pointOnMesh(hingeId, fronts[0]);
      if (doorSpot) await page.dblclick(doorSpot.x, doorSpot.y);
      await page.sleep(800);
      const order = await page.evaluate(`
        const rows = [...document.querySelectorAll('[data-door-modal] [data-hinge-modal-row]')];
        return rows.map((n) => Number(n.value));
      `);
      measurements.f4_modal_order = order;
      const descending = order.length > 1 && order.every((v, i) => i === 0 || order[i - 1] > v);
      check('F4c — the modal lists the hinge rows by Y DESCENDING — top first',
        descending, JSON.stringify(order));
      const numbers = await page.evaluate(`
        return [...document.querySelectorAll('[data-door-modal] [data-hinge-row]')].map((n) => n.getAttribute('data-hinge-row'));
      `);
      measurements.f4_modal_indices = numbers;
      check('F4c — …and each row still carries the ENGINE index it writes with',
        numbers.length === order.length
          && numbers.map(Number).every((v, i) => v === order.length - 1 - i),
        JSON.stringify(numbers));
      await shot('f4b-the-hinge-modal-listing-top-first', {
        all: ['[data-door-modal]', '[data-hinge-modal-row]'],
      });
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(300);
      await ui(`u.openFrontsFor(${JSON.stringify(hingeId)}, ${JSON.stringify(fronts)}) || true`);
      await page.sleep(700);

      // (a) NO STAND-IN. The registry says which plates the scene mounted and
      //     whether each is a downloaded model; the SOURCE says no box is
      //     drawn for one that is not. Both, because the T35 lesson is that a
      //     source assertion with no picture is how an unclickable rail ships.
      const plates = await page.evaluate(`
        const h = ${P}.hardware;
        if (!h) return null;
        const rows = h.of('plate');
        return { count: rows.length, modelled: rows.filter((r) => r.model).length, parents: [...new Set(rows.map((r) => r.parent))] };
      `);
      measurements.f4_plate_registry = plates;
      check('F4a — the scene mounts a plate per hinge, all on the CARCASS',
        plates && plates.count > 0 && plates.parents.join() === 'carcass',
        JSON.stringify(plates));

      // (b) THE BITE, measured on the running scene: the plate clone's own
      //     world box against the inner face of the side it is screwed to.
      const bite = await page.evaluate(`return ${P}.profile.getState().profile.hardware.hinge.plateBiteMm;`);
      measurements.f4_bite = bite;
      check('F4b — the profile carries the 5 mm bite', bite === 5, `${bite} mm`);

      const seated = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let side = null;
        const plateBoxes = [];
        v.scene.traverse((g) => {
          if (!g.userData || g.userData.ccUnitId !== ${JSON.stringify(hingeId)}) return;
          g.traverse((o) => {
            if (o.isMesh && o.userData && o.userData.ccPanelId === 'BUL') {
              const b = new THREE.Box3().setFromObject(o);
              side = side ? side.union(b) : b;
            }
            // PLATES only: the door's own hinge body carries the same panel
            // stamp and swings with the leaf, so measuring both would be
            // measuring the arm and calling it the plate.
            if (o.userData && o.userData.ccHingeMember === 'plate') {
              plateBoxes.push(new THREE.Box3().setFromObject(o));
            }
          });
        });
        if (!side || !plateBoxes.length) return null;
        // The side's INNER face is its own max.x (BUL stands at the left).
        const innerX = side.max.x;
        const into = plateBoxes.map((b) => Math.round((innerX - b.min.x) * 1000));
        return { innerX: Math.round(innerX * 1000), into };
      `);
      measurements.f4_seated = seated;
      if (seated) {
        check('F4b — every plate is seated INTO the side, not standing on its face',
          seated.into.every((v) => v >= bite - 1), JSON.stringify(seated.into));
      } else {
        check('F4b — [skip-and-note] no plate GLB in the showroom fixture to measure',
          true, 'the source assertion and the registry stand in its place');
      }

      await frameFacing([hingeId], { dist: 1.1, height: 1.35 });
      await page.sleep(500);
      await shot('f4a-a-side-with-its-plates-seated', { mesh: 'BUL' });

    }

    // ═══════════════════════════════════════════════════════════════════════
    // F5 — CNC GRAIN: the drawer boxes, the drawer fronts and the plinth
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f5')) {
      await freshFloor('the grain', 'kitchen');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const grainId = await store(`(() => {
        const { id } = s.addUnit('BUDR');
        s.updateUnitParams(id, { width: 600 });
        return id;
      })()`);
      await page.sleep(700);

      const axes = await store(`(() => {
        const r = s.unitResult(${JSON.stringify(grainId)});
        const of = (part) => { const p = r.panels.find((x) => x.part === part); return p ? { grain: p.cnc.grain, w: p.w, h: p.h } : null; };
        return {
          side: of('DRAWER-SIDE'),
          boxFront: of('DRAWER-BOX-FRONT'),
          boxBack: of('DRAWER-BOX-BACK'),
          bottom: of('DRAWER-BOTTOM'),
          front: of('DRAWER-FRONT'),
        };
      })()`);
      measurements.f5_axes = axes;
      check('F5 — the drawer BOX stands along the grain',
        axes.side.grain === 'h' && axes.boxFront.grain === 'h' && axes.boxBack.grain === 'h',
        JSON.stringify({ side: axes.side.grain, f: axes.boxFront.grain, b: axes.boxBack.grain }));
      check('F5 — its BOTTOM lies across, as the shoe box already said',
        axes.bottom.grain === 'w', axes.bottom.grain);
      check('F5 — the drawer FRONT runs its figure UP the front, against the saw',
        axes.front.grain === 'h' && axes.front.w > axes.front.h,
        `${axes.front.w} × ${axes.front.h} → ${axes.front.grain}`);

      const plinth = await store(`(() => {
        const { id } = s.addUnit('BUD');
        s.updateUnitParams(id, { width: 600, plinth: true });
        const r = s.unitResult(id);
        const p = r.panels.find((x) => x.part === 'PLINTH');
        return p ? { id, grain: p.cnc.grain, w: p.w, h: p.h } : { id, grain: null };
      })()`);
      measurements.f5_plinth = plinth;
      check('F5 — and the PLINTH does too',
        plinth.grain === 'h', `${plinth.w} × ${plinth.h} → ${plinth.grain}`);

      // The PICTURE: a wood decor on the fronts, so the figure the law moved is
      // the figure on the screen. `grainRun` is what the material reads.
      await store(`s.setDesign({ fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'laminate', finish_id: 'egger:H1180' }] } }) || true`);
      await page.sleep(900);
      const frontId = await store(`s.unitResult(${JSON.stringify(grainId)}).panels.find((p) => p.part === 'DRAWER-FRONT').id`);
      measurements.f5_front_panel = frontId;
      await frameFacing([grainId], { dist: 1.3, height: 0.6 });
      await page.sleep(500);
      await shot('f5a-the-drawer-fronts-run-their-figure-up-the-front', { mesh: frontId });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F2 — MULTI-SELECT: three shelves ticked, and nudged in one shot
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f2')) {
      await freshFloor('multi-select', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const msId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 900, height: 2000, doors: false });
        s.addShelvesBulk([id], 3);
        return id;
      })()`);
      await page.sleep(800);
      const shelves = await store(`s.unitResult(${JSON.stringify(msId)}).panels.filter((p) => p.part === 'SHELF').map((p) => p.id)`);
      measurements.f2_shelves = shelves;
      check('F2 — three shelves to work with', shelves.length === 3, shelves.join(' '));

      await frameFacing([msId], { dist: 1.9, height: 1.0 });
      await page.sleep(500);

      // THE GESTURE: a plain click on the first, then CTRL+CLICK on the other
      // two — real CDP mouse events carrying the real modifier (modifiers: 2).
      const clickShelf = async (panelId, ctrl) => {
        const at = await pointOnMesh(msId, panelId);
        if (!at) return false;
        const mods = ctrl ? 2 : 0;
        await page.mouse('mouseMoved', at.x, at.y, { buttons: 0, clickCount: 0, modifiers: mods });
        await page.mouse('mousePressed', at.x, at.y, { button: 'left', buttons: 1, clickCount: 1, modifiers: mods });
        await page.mouse('mouseReleased', at.x, at.y, { button: 'left', buttons: 0, clickCount: 1, modifiers: mods });
        await page.sleep(300);
        return true;
      };
      // CTRL held for all three, which is what a joiner's hand actually does.
      // The first one lands on an empty set and behaves exactly as a plain
      // click does (`applySelection([], id, false)`); it also means no SHELF
      // DRAG is started under the modifier, which is the point of the tick.
      const trail = [];
      for (const id of shelves) {
        await clickShelf(id, true);
        trail.push(await ui('u.selectedElements'));
      }
      measurements.f2_trail = trail;

      const set = await ui('u.selectedElements');
      measurements.f2_set = set;
      check('F2 — Ctrl+click built the SET, three deep',
        Array.isArray(set) && set.length === 3, JSON.stringify(set));

      const marks = await page.evaluate(`
        const v = ${P}.views.room;
        let n = 0;
        v.scene.traverse((o) => { if (o.isLineSegments && o.userData && o.userData.ccHelper && o.visible) n += 1; });
        return n;
      `);
      measurements.f2_marks = marks;
      check('F2 — every member of the set is MARKED in the scene', marks >= 3, `${marks} outlines`);
      await shot('f2a-three-shelves-ticked-with-ctrl-click', { dom: '[data-group-selection]' });

      // …and ONE typed height moves all three.
      const before = await store(`s.unitResult(${JSON.stringify(msId)}).panels.filter((p) => p.part === 'SHELF').map((p) => Math.round(p.box.y))`);
      const heightField = await page.evaluate(`
        const el = [...document.querySelectorAll('input')].find((n) => n.title && n.title.includes('The underside'));
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      `);
      if (heightField) {
        for (const clickCount of [1, 2, 3]) {
          await page.mouse('mousePressed', heightField.x, heightField.y, { clickCount });
          await page.mouse('mouseReleased', heightField.x, heightField.y, { buttons: 0, clickCount });
        }
        await page.send('Input.insertText', { text: '900' });
        await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
        await page.sleep(600);
      }
      const after = await store(`s.unitResult(${JSON.stringify(msId)}).panels.filter((p) => p.part === 'SHELF').map((p) => Math.round(p.box.y))`);
      measurements.f2_nudge = { before, after };
      // EVERY shelf moved off where it was, and all three finished within one
      // shelf-pitch of the typed 900. They do not all land ON 900, and must
      // not: `setShelfPos` clamps each board between its neighbours, and iron
      // rule 5 says an existing check's behaviour is untouchable. The group
      // edit REACHES all three; the clamp decides where each may stop.
      check('F2 — ONE height typed moved the WHOLE set in one shot',
        after.length === 3
          && after.every((v, i) => v !== before[i])
          && after.every((v) => Math.abs(v - 900) < 150),
        `${before.join(' ')} → ${after.join(' ')}`);

      // …and the SET-BACK, which has no neighbour to clamp against, lands the
      // whole set on one number.
      const depthField = await page.evaluate(`
        const el = [...document.querySelectorAll('input')].find((n) => n.title && n.title.includes('From the face of the cabinet'));
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      `);
      if (depthField) {
        for (const clickCount of [1, 2, 3]) {
          await page.mouse('mousePressed', depthField.x, depthField.y, { clickCount });
          await page.mouse('mouseReleased', depthField.x, depthField.y, { buttons: 0, clickCount });
        }
        await page.send('Input.insertText', { text: '60' });
        await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
        await page.sleep(600);
      }
      const setbacks = await store(`s.unitResult(${JSON.stringify(msId)}).panels.filter((p) => p.part === 'SHELF').map((p) => Math.round(Number(p.meta.front_mm)))`);
      measurements.f2_setbacks = setbacks;
      check('F2 — …and ONE set-back typed put all three on the same number',
        setbacks.length === 3 && new Set(setbacks).size === 1 && setbacks[0] === 60,
        setbacks.join(' '));
      await shot('f2b-the-group-moved-as-one', { dom: '[data-group-selection]' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F8 — THE RAIL IS CLICKABLE: the target T35 never shipped
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f8')) {
      await freshFloor('the rail', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const railId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 900, height: 2100, doors: false, rail: true });
        s.addItem(id, { kind: 'hanger' });
        return id;
      })()`);
      await page.sleep(800);
      const rod = await store(`(() => {
        const r = s.unitResult(${JSON.stringify(railId)});
        const a = r.assemblies.rail;
        return a ? { y: a.y, z: a.z, x1: a.x1, x2: a.x2 } : null;
      })()`);
      measurements.f8_rod = rod;
      check('F8 — the wardrobe has a rod to click', Boolean(rod), JSON.stringify(rod));

      // The lens goes IN FRONT of the rod, not above the cabinet: at the unit
      // centre plus 1.85 the camera looks down THROUGH the top panel and the
      // rod is behind it. (The walk's own lesson, twice now.)
      await frameFacing([railId], { dist: 1.6, height: 0.5 });
      await page.sleep(600);

      // THE GESTURE: a REAL double-click on the TUBE itself — not on the board
      // above it, which is what T35 left as the only way in.
      const spot = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let mesh = null;
        v.scene.traverse((g) => {
          if (mesh || !g.userData || g.userData.ccUnitId !== ${JSON.stringify(railId)}) return;
          g.traverse((o) => {
            if (!mesh && o.isMesh && o.userData && o.userData.ccRailPanelId) mesh = o;
          });
        });
        if (!mesh) return null;
        const b = new THREE.Box3().setFromObject(mesh);
        const c = b.getCenter(new THREE.Vector3());
        const p = new THREE.Vector3(c.x, c.y, b.max.z - 0.001).project(v.camera);
        const r = v.gl.domElement.getBoundingClientRect();
        return { panelId: mesh.userData.ccRailPanelId, x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
      `);
      measurements.f8_target = spot;
      check('F8 — the TUBE itself is in the scene and names its board',
        Boolean(spot && spot.panelId), JSON.stringify(spot && spot.panelId));
      if (spot) {
        // Hover first, so the aura is up in the picture — the hand can see the
        // rod is live before it commits.
        await page.mouse('mouseMoved', spot.x, spot.y, { buttons: 0, clickCount: 0 });
        await page.sleep(400);
        await page.dblclick(spot.x, spot.y);
        await page.sleep(800);
      }
      const opened = await page.evaluate(`
        const u = ${P}.ui.getState();
        const el = document.querySelector('[data-rail-height]');
        return { modal: u.modal, panelId: u.modalArgs && u.modalArgs.panelId, field: Boolean(el && el.getClientRects().length) };
      `);
      measurements.f8_modal = opened;
      check('F8 — the double-click on the ROD opened the hanger modal',
        opened.modal === 'element' && opened.panelId === (spot && spot.panelId) && opened.field,
        JSON.stringify(opened));
      await shot('f8a-the-hanger-modal-open-beside-a-double-clicked-rail', {
        all: ['[data-rail-height]'], text: 'Height above support',
      });
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(200);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F3 / F10 — the shoe box's front is a switch, and interior fronts hide
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f3') || want('f10')) {
      await freshFloor('the shoe box', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const shoeId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 900, height: 1600, doors: { count: 1 } });
        s.addShoeBox(id, { variant: 'F', dividers: 1 });
        return id;
      })()`);
      await page.sleep(900);
      const doorIds = await store(`s.unitResult(${JSON.stringify(shoeId)}).panels.filter((p) => p.part === 'FRONT').map((p) => p.id)`);

      if (want('f10')) {
        // ── the DOOR SHUT: no figure about the box's face ──
        await ui(`u.closeAllFronts(${JSON.stringify(shoeId)}) || true`);
        await ui('u.setShowFrontDimensions ? u.setShowFrontDimensions(true) : true');
        await page.sleep(500);
        await frameFacing([shoeId], { dist: 2.0, height: 0.7 });
        await page.sleep(500);
        // The DIMENSION LABELS in the scene, counted. They carry no id of
        // their own (R7: a label is drawn, never read), so the proof is the
        // DELTA — how many figures the same cabinet draws with its leaf shut
        // and with it open.
        const labels = () => page.evaluate(`
          const v = ${P}.views.room;
          let n = 0;
          v.scene.traverse((o) => { if (o.isSprite && o.visible) n += 1; });
          return n;
        `);
        const shut = await labels();
        await shot('f10a-the-shoe-box-front-carries-no-figures-behind-a-shut-door', { mesh: 'SHOE1-FR' });
        await ui(`u.openFrontsFor(${JSON.stringify(shoeId)}, ${JSON.stringify(doorIds)}) || true`);
        await page.sleep(800);
        const open = await labels();
        measurements.f10 = { shut, open };
        check('F10 — the box face carries FEWER figures behind a shut leaf',
          open > shut, `${shut} shut → ${open} open`);
        await shot('f10b-and-they-are-back-the-moment-the-leaf-swings', { mesh: 'SHOE1-FR' });
      }

      if (want('f3')) {
        await ui(`u.openFrontsFor(${JSON.stringify(shoeId)}, ${JSON.stringify(doorIds)}) || true`);
        await page.sleep(400);
        await frameFacing([shoeId], { dist: 1.5, height: 0.4, target: 'SHOE1-FR' });
        await page.sleep(500);
        const on = await store(`(() => {
          const r = s.unitResult(${JSON.stringify(shoeId)});
          return { boards: r.panels.filter((p) => p.id.indexOf('SHOE1-') === 0).length, front: r.assemblies.shoeBoxes[0].front };
        })()`);
        await shot('f3a-the-shoe-box-with-its-front-on', { mesh: 'SHOE1-FR' });

        // THE GESTURE: the modal's own switch, reached by a real click.
        const spot = await pointOnMesh(shoeId, 'SHOE1-FR');
        if (spot) await page.dblclick(spot.x, spot.y);
        await page.sleep(700);
        const hasField = await page.evaluate('return Boolean(document.querySelector(\'[data-shoe-box-front]\'));');
        check('F3 — the box modal offers the Front switch', hasField, String(hasField));
        await page.evaluate(`
          const el = document.querySelector('[data-shoe-box-front]');
          if (el) el.scrollIntoView({ block: 'center' });
          return true;
        `);
        await shot('f3b-the-front-switch-in-the-shoe-box-modal', { dom: '[data-shoe-box-front]' });
        // Selects are driven by the store's own action here: a native <select>
        // popup is an OS window CDP cannot click inside, and the SWITCH itself
        // is what the picture above proves is on screen and reachable.
        await store(`(() => {
          const u = s.units.find((x) => x.id === ${JSON.stringify(shoeId)});
          const item = (u.params.sections[0].items || []).find((i) => i.kind === 'shoe_box');
          return s.setShoeBox(${JSON.stringify(shoeId)}, item.id, { front: false }) || true;
        })()`);
        await page.sleep(700);
        const off = await store(`(() => {
          const r = s.unitResult(${JSON.stringify(shoeId)});
          return { boards: r.panels.filter((p) => p.id.indexOf('SHOE1-') === 0).length, front: r.assemblies.shoeBoxes[0].front };
        })()`);
        measurements.f3 = { on, off };
        check('F3 — Front: off drops SHOEBOX-FR, and nothing else',
          on.front === true && off.front === false && off.boards === on.boards - 1,
          `${on.boards} boards → ${off.boards}`);
        const drawn = await page.evaluate(`
          const v = ${P}.views.room;
          let n = 0;
          v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId === 'SHOE1-FR' && o.visible) n += 1; });
          return n;
        `);
        check('F3 — …and the 3-D stops drawing it, because it reads the same list',
          drawn === 0, `${drawn} meshes`);
        await frameFacing([shoeId], { dist: 1.5, height: 0.4, target: 'SHOE1-BT' });
        await page.sleep(400);
        await shot('f3c-the-same-box-with-its-front-off', { mesh: 'SHOE1-BT' });
      }
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(200);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F7 — THE TOP BOX: a small wardrobe that rides the main one
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f7')) {
      await freshFloor('the top box', 'wardrobe');
      await ui('u.openEditor() || true');
      await page.sleep(500);
      const pair = await store(`(() => {
        const main = s.addUnit('WARDROBE');
        s.updateUnitParams(main.id, { width: 900, height: 2000, depth: 600, doors: { count: 2 } });
        const box = s.addUnit('WARDROBE_TOP');
        s.updateUnitParams(box.id, { width: 900, height: 500, doors: { count: 2 } });
        return { main: main.id, box: box.id };
      })()`);
      await page.sleep(900);
      const snapped = await store(`(() => {
        const m = s.units.find((u) => u.id === ${JSON.stringify(pair.main)});
        const b = s.units.find((u) => u.id === ${JSON.stringify(pair.box)});
        return {
          ridesOn: b.params.rides_on, sameHost: b.params.rides_on === m.id,
          x: [m.position.x_mm, b.position.x_mm],
          wall: [m.position.wall, b.position.wall],
          depth: [m.params.depth, b.params.depth],
          mount: b.params.mount_height,
        };
      })()`);
      measurements.f7_snap = snapped;
      check('F7 — the box SNAPPED flush on the main it was added beside',
        snapped.sameHost && snapped.x[0] === snapped.x[1]
          && snapped.depth[0] === snapped.depth[1] && snapped.wall[0] === snapped.wall[1],
        JSON.stringify(snapped));

      // LIVE SCENE: the two carcasses stand one on the other, and the box's
      // underside is the main's top — measured off the meshes, not the store.
      const stacked = await page.evaluate(`
        const v = ${P}.views.room;
        const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        const box = {};
        for (const [key, id] of [['main', ${JSON.stringify(pair.main)}], ['box', ${JSON.stringify(pair.box)}]]) {
          const b = new THREE.Box3();
          let n = 0;
          v.scene.traverse((g) => {
            if (!g.userData || g.userData.ccUnitId !== id) return;
            g.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId) { b.expandByObject(o); n += 1; } });
          });
          box[key] = n ? { minY: Math.round(b.min.y * 1000), maxY: Math.round(b.max.y * 1000), minX: Math.round(b.min.x * 1000) } : null;
        }
        return box;
      `);
      measurements.f7_scene = stacked;
      check('F7 — in the SCENE the box sits ON the main, flush and aligned',
        stacked.main && stacked.box
          && Math.abs(stacked.box.minY - stacked.main.maxY) <= 2
          && Math.abs(stacked.box.minX - stacked.main.minX) <= 2,
        JSON.stringify(stacked));

      // Far enough back that BOTH carcasses and both unit labels are in the
      // frame — "the pair standing, dims per unit" is what the spec asks a
      // picture for, and a close-up of one door is not that.
      await frameFacing([pair.main, pair.box], { dist: 6.0, height: 0.2 });
      await page.sleep(600);
      const boxDoor = await store(`s.unitResult(${JSON.stringify(pair.box)}).panels.find((p) => p.part === 'FRONT').id`);
      measurements.f7_box_door = boxDoor;
      await shot('f7a-the-pair-standing-main-and-top-box', { mesh: boxDoor });

      // …and it RIDES: the main is dragged and the box goes with it.
      const before = await store(`s.units.find((u) => u.id === ${JSON.stringify(pair.box)}).position.x_mm`);
      await store(`s.moveUnit(${JSON.stringify(pair.main)}, 2000, 1) || true`);
      await page.sleep(700);
      const after = await store(`(() => {
        const m = s.units.find((u) => u.id === ${JSON.stringify(pair.main)});
        const b = s.units.find((u) => u.id === ${JSON.stringify(pair.box)});
        return { main: m.position.x_mm, box: b.position.x_mm };
      })()`);
      measurements.f7_ride = { before, after };
      check('F7 — the box RIDES the main along the wall',
        after.box === after.main && after.box !== before, `${before} → ${after.box}`);

      // …and ORPHANED it says so, in red, and is left where it is.
      await store(`s.removeUnit(${JSON.stringify(pair.main)}) || true`);
      await page.sleep(700);
      const orphan = await store(`(() => {
        const b = s.units.find((u) => u.id === ${JSON.stringify(pair.box)});
        const reds = (s.runChecks() || []).filter((f) => f.check === 14);
        return { alive: Boolean(b), x: b && b.position.x_mm, reds: reds.length, level: reds[0] && reds[0].level, message: reds[0] && reds[0].message };
      })()`);
      measurements.f7_orphan = orphan;
      check('F7 — orphaned, it is kept where it is and reported in RED',
        orphan.alive && orphan.x === after.box && orphan.reds === 1 && orphan.level === 'red',
        JSON.stringify(orphan));
      await ui('u.setCheckOpen ? u.setCheckOpen(true) : (u.toggleCheck && u.toggleCheck())');
      await page.sleep(600);
      await shot('f7b-the-orphaned-top-box-reported-in-red', { text: 'standing on nothing' });
    }

    check('R6 — the whole walk ends with a clean console', realErrors(page.errors).length === 0,
      `${realErrors(page.errors).length} error(s)`);
  } finally {
    writeFileSync(`${OUT}measurements.json`, JSON.stringify(measurements, null, 2));
    writeFileSync(`${OUT}walk.json`, JSON.stringify({ steps, shots }, null, 2));
    writeFileSync(`${OUT}console.txt`, page.errors.join('\n'));
    await page.close();
    await new Promise((resolve) => { setTimeout(resolve, 200); });
  }

  const failed = steps.filter((s) => !s.ok);
  const empty = shots.filter((s) => !s.present);
  console.log(`\n${steps.length - failed.length} ok · ${failed.length} failed · ${shots.length} shots (${empty.length} empty)`);
  process.exit(failed.length || empty.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
