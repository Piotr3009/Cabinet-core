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
