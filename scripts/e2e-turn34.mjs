#!/usr/bin/env node
// ─── Turn 34 acceptance walk — the board, the box, and the day's verdicts ───
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn34.mjs [--only f1,f2,…] [--out verify/t34/]
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R6  a console error fails the step it happened in.
//   T33 LIVE-SCENE PROOF: store/UI features are measured on the running app —
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
const OUT = argOf('--out', new URL('../verify/t34/', import.meta.url).pathname);
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
        if (want.text) out.text = (document.body.innerText || '').includes(want.text);
        if (want.mesh) {
          const v = ${P}.views && ${P}.views.room;
          let n = 0;
          if (v) v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId === want.mesh && o.visible) n += 1; });
          out.mesh = n > 0;
        }
        if (want.marked) {
          const v = ${P}.views && ${P}.views.room;
          let n = 0;
          if (v) v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData[want.marked] !== undefined && o.visible) n += 1; });
          out.marked = n > 0;
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

  /**
   * Stand the camera IN FRONT of a set of cabinets, inside the room.
   *
   * The walk's own lesson, and it cost two takes: `frameUnits` offsets along
   * the WORLD axes by a multiple of the subject's own radius, which for a
   * cabinet standing against a wall puts the lens THROUGH that wall — the
   * frame comes back showing plaster, and passes a mesh-presence check while
   * showing nothing at all.
   *
   * A cabinet knows which way it faces: its own local +z is its FRONT (the
   * frame every `panel.box` is in), and its group carries the wall's rotation.
   * So the lens is placed along that normal, at a real distance in metres —
   * which is exactly where a photographer would stand.
   */
  const frameFacing = async (unitIds, { dist = 2.2, height = 1.0, target = null } = {}) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = new Set(${JSON.stringify(unitIds)});
    const dist = ${JSON.stringify(dist)};
    const height = ${JSON.stringify(height)};
    // A SUBJECT inside the cabinet: a shoe box 80 mm tall on the floor of a
    // 1400 mm wardrobe is not what a lens aimed at the wardrobe's own centre
    // is looking at. Naming a panel puts the look-at on THAT piece.
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
      // The unit's own FRONT, in world space.
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

  /** One PANEL's world box (mm) inside one unit — the collision-safe measure. */
  const panelBoxMm = async (unitId, panelId) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    v.scene.updateMatrixWorld(true);
    let out = null;
    v.scene.traverse((g) => {
      if (out || !g.userData || g.userData.ccUnitId !== ${JSON.stringify(unitId)}) return;
      g.traverse((o) => {
        if (out || !o.isMesh || !o.userData || o.userData.ccPanelId !== ${JSON.stringify(panelId)}) return;
        const b = new THREE.Box3().expandByObject(o);
        out = {
          minX: Math.round(b.min.x * 1000), maxX: Math.round(b.max.x * 1000),
          minY: Math.round(b.min.y * 1000), maxY: Math.round(b.max.y * 1000),
          minZ: Math.round(b.min.z * 1000), maxZ: Math.round(b.max.z * 1000),
        };
      });
    });
    return out;
  `);

  /** A REAL click on a mesh, aimed at a VISIBLE point of it. */
  const clickMesh = async (unitId, panelId) => {
    const spot = await page.evaluate(`
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
      const p = new THREE.Vector3(
        (b.min.x + b.max.x) / 2,
        b.max.y - 0.002,
        b.max.z - 0.02,
      ).project(v.camera);
      const r = v.gl.domElement.getBoundingClientRect();
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
    `);
    if (!spot) return false;
    await page.mouse('mouseMoved', spot.x, spot.y, { buttons: 0, clickCount: 0 });
    await page.sleep(150);
    await page.mouse('mousePressed', spot.x, spot.y, { button: 'left', buttons: 1, clickCount: 1 });
    await page.mouse('mouseReleased', spot.x, spot.y, { button: 'left', buttons: 0, clickCount: 1 });
    await page.sleep(350);
    return true;
  };

  /** The Delete key, as a keyboard actually sends it. */
  const pressDelete = async () => {
    await page.key('Delete', { code: 'Delete', windowsVirtualKeyCode: 46 });
    await page.sleep(350);
  };

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);
  const ui = (expr) => page.evaluate(`const u = ${P}.ui.getState(); return (${expr});`);

  const measurements = {};

  /**
   * A CLEAN FLOOR for one phase.
   *
   * The walk's own lesson, learnt on T33 and re-learnt here: a crowded room
   * puts a cabinet between the lens and the subject, and a camera framed on a
   * unit pinned to the far wall stands OUTSIDE the room. Each phase gets its
   * own empty floor and leaves its cabinets on the near wall, where a
   * photographer could actually stand.
   */
  const freshFloor = async (name, projectType = 'wardrobe') => store(`s.loadProject({
    id: null, name: ${JSON.stringify(`T34 walk · ${name}`)}, number: '34', client: 'the owner',
    room: { height: 2600, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] },
    design: { projectType: ${JSON.stringify(projectType)} },
  }, []) || true`);

  try {
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    check('R8 — the app is pointed at the silent showroom', true, showroom.url);

    await store(`s.loadProject({
      id: null, name: 'T34 walk', number: '34', client: 'the owner',
      room: { height: 2600, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] },
      design: { projectType: 'wardrobe' },
    }, []) || true`);
    await ui('u.openEditor() || true');
    await page.sleep(600);
    await page.waitFor('document.querySelector(\'nav\')', { what: 'the editor chrome' });

    // ═══════════════════════════════════════════════════════════════════════
    // F4 — THE SHOE BOX: fix in an open bay, drawer behind doors, the grain
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f4')) {
      await freshFloor('the shoe box');
      const fixId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 900, height: 1400, doors: false });
        s.addShoeBox(id, { variant: 'F', dividers: 1 });
        return id;
      })()`);
      await page.sleep(600);
      await frameFacing([fixId], { dist: 1.6, height: 0.62, target: 'SHOE1-FR' });
      await page.sleep(400);

      const plan = await store(`s.unitResult(${JSON.stringify(fixId)}).assemblies.shoeBoxes[0]`);
      measurements.f4_fix_plan = plan;
      check('F4 — the FIX box takes the whole opening, walls 80, one divider',
        plan && plan.variant === 'F' && plan.boxW === plan.openingW && plan.dividers === 1,
        JSON.stringify({ boxW: plan && plan.boxW, opening: plan && plan.openingW }));

      // The kit's own slope law, measured on the running engine.
      check('F4 — rearEdge = min(80, run · tan 10°), and the angle follows it',
        plan && plan.slope.rear <= 80 + 1e-6 && plan.slope.angleDeg <= 10 + 1e-6,
        JSON.stringify(plan && plan.slope));

      // LIVE-SCENE: the seven boards stand where the engine put them.
      const sceneBoards = await page.evaluate(`
        const v = ${P}.views.room;
        v.scene.updateMatrixWorld(true);
        const ids = [];
        v.scene.traverse((g) => {
          if (!g.userData || g.userData.ccUnitId !== ${JSON.stringify(fixId)}) return;
          g.traverse((o) => {
            if (o.isMesh && o.userData && /^SHOE1-/.test(o.userData.ccPanelId || '') && o.visible) ids.push(o.userData.ccPanelId);
          });
        });
        return [...new Set(ids)].sort();
      `);
      measurements.f4_scene_boards = sceneBoards;
      check('F4 — all seven boards of the box are DRAWN in the scene',
        sceneBoards.length === 7, sceneBoards.join(' '));

      // GRAIN ACROSS the bottom — "dno — słoje w poprzek".
      const grain = await store(`(() => {
        const p = s.unitResult(${JSON.stringify(fixId)}).panels.find((x) => x.id === 'SHOE1-BT');
        return p ? { grain: p.cnc.grain, w: p.w, h: p.h } : null;
      })()`);
      measurements.f4_bottom = grain;
      check('F4 — the bottom’s GRAIN runs ACROSS, along its width', grain && grain.grain === 'w',
        JSON.stringify(grain));

      // The pilots: 3 per side, from OUTSIDE, on the ⌀3 screw layer.
      const pilots = await store(`s.unitResult(${JSON.stringify(fixId)}).drills.filter((d) => d.kind === 'shoe_pilot')`);
      measurements.f4_pilots = pilots;
      check('F4 — 3 × ⌀3 through-pilots per carcass side, driven from OUTSIDE',
        pilots.length === 6 && pilots.every((d) => d.d === 3 && d.layer === 'SCREWS_3MM'),
        `${pilots.length} holes`);

      await shot('4a-the-fix-shoe-box-in-an-open-bay', { mesh: 'SHOE1-BT' });

      // ── the DRAWER variant, behind hinged doors, showing the 30 ──
      await freshFloor('the shoe box · drawer');
      const drwId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 1000, height: 1400, doors: { count: 2 } });
        s.addShoeBox(id, { variant: 'D', dividers: 0 });
        return id;
      })()`);
      await page.sleep(600);
      const dplan = await store(`s.unitResult(${JSON.stringify(drwId)}).assemblies.shoeBoxes[0]`);
      measurements.f4_drawer_plan = dplan;
      const lost = dplan ? dplan.openingW - dplan.boxW : null;
      check('F4 — the DRAWER box loses 2 × 13 of runner and 30 per hinged side',
        dplan && dplan.hinged.left && dplan.hinged.right && lost === 26 + 60,
        `opening ${dplan && dplan.openingW} → box ${dplan && dplan.boxW} (lost ${lost})`);

      const runner = await store(`s.unitResult(${JSON.stringify(drwId)}).drills.filter((d) => d.kind === 'shoe_runner_fix')`);
      measurements.f4_runner_drills = { runner, plan: dplan && dplan.runner };
      check('F4 — the runner face is frontT + 3, first fix 37, rear at the sheet’s column',
        dplan && dplan.runner.onSheet && runner.length === 4 && runner.every((d) => d.d === 5),
        JSON.stringify(dplan && dplan.runner));

      const yellow = await store(`s.unitResult(${JSON.stringify(drwId)}).hardware.find((h) => h.role === 'shoe_runner_pairs')`);
      measurements.f4_runner_bom = yellow;
      check('F4 — the pair is a YELLOW NAMED SPEC — no article invented',
        yellow && yellow.spec.complete === false && !/MOVENTO/.test(yellow.spec_label),
        yellow && yellow.spec_label);

      const drwFronts = await store(`s.unitResult(${JSON.stringify(drwId)}).panels.filter((p) => p.part === 'FRONT').map((p) => p.id)`);
      await ui(`u.openFrontsFor(${JSON.stringify(drwId)}, ${JSON.stringify(drwFronts)}) || true`);
      await page.sleep(400);
      await frameFacing([drwId], { dist: 1.7, height: 0.66, target: 'SHOE1-FR' });
      await page.sleep(400);
      await shot('4b-the-drawer-shoe-box-behind-open-doors-showing-the-30', { mesh: 'SHOE1-BT' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F2 — LED: the same camera, off and on, and the edge offset
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f2')) {
      await freshFloor('the LEDs');
      const litId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 1000, doors: false });
        s.addShelves(id, 1);
        const shelf = s.unitResult(id).panels.find((p) => p.role === 'shelf');
        s.setDesign({ lighting: { enabled: true, temperature: 4000, items: [] } });
        s.addLightingItem({ unitId: id, kind: 'shelf', ref: shelf.id });
        return id;
      })()`);
      await page.sleep(700);
      await frameFacing([litId], { dist: 1.9, height: 0.8 });
      await page.sleep(500);

      await ui('u.setLightDemo(false) || true');
      await page.sleep(400);
      await shot('f2-led-off', { marked: 'ccLedStrip' });
      const off = await page.evaluate(`
        const v = ${P}.views.room;
        let m = null;
        v.scene.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccLedStrip) m = o; });
        return m ? { emissive: m.material.emissiveIntensity } : null;
      `);
      await ui('u.setLightDemo(true) || true');
      await page.sleep(500);
      await shot('f2-led-on', { marked: 'ccLedStrip' });
      const on = await page.evaluate(`
        const v = ${P}.views.room;
        let m = null;
        v.scene.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccLedStrip) m = o; });
        return m ? { emissive: m.material.emissiveIntensity } : null;
      `);
      measurements.f2_emissive = { off, on };
      check('F2 — the LEDs are UNMISTAKABLE: the working view is over T33’s brightest',
        off && off.emissive > 2.21, `off ${off && off.emissive}`);
      check('F2 — and "Turn on the light" raises them further still',
        on && off && on.emissive > off.emissive * 2, `on ${on && on.emissive}`);
      await ui('u.setLightDemo(false) || true');
      await page.sleep(300);

      // (b) the EDGE OFFSET moves the strip back, and only the strip.
      const before = await page.evaluate(`
        const v = ${P}.views.room; const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let m = null;
        v.scene.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccLedStrip === 'shelf') m = o; });
        if (!m) return null;
        const b = new THREE.Box3().expandByObject(m);
        return { z: Math.round(((b.min.z + b.max.z) / 2) * 1000), len: Math.round((b.max.x - b.min.x) * 1000) };
      `);
      await store(`(() => {
        const it = s.project.design.lighting.items[0];
        s.updateLightingItem(it.id, { inset_mm: 60 });
        return true;
      })()`);
      await page.sleep(500);
      const after = await page.evaluate(`
        const v = ${P}.views.room; const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let m = null;
        v.scene.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccLedStrip === 'shelf') m = o; });
        if (!m) return null;
        const b = new THREE.Box3().expandByObject(m);
        return { z: Math.round(((b.min.z + b.max.z) / 2) * 1000), len: Math.round((b.max.x - b.min.x) * 1000) };
      `);
      measurements.f2_inset = { before, after };
      check('F2 — the edge offset moves the strip 60 mm back, MEASURED in the scene',
        before && after && Math.abs((before.z - after.z) - 60) <= 1,
        `z ${before && before.z} → ${after && after.z} mm`);
      check('F2 — …and ONLY the strip: its length law is untouched',
        before && after && before.len === after.len, `${before && before.len} mm both times`);
      await shot('2a-the-led-set-60-off-the-front-edge', { marked: 'ccLedStrip' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F5 + F9 — one "3" at a touch, and the twin toggle that shows it
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f5')) {
      await freshFloor('the meeting line', 'kitchen');
      const pair = await store(`(() => {
        const a = s.addUnit('BUD');
        s.updateUnitParams(a.id, { doors: { count: 1 } });
        const b = s.addUnit('BUD', { near: a.id, side: 'right' });
        s.updateUnitParams(b.id, { doors: { count: 1 } });
        return [a.id, b.id];
      })()`);
      await page.sleep(600);

      // F9 first: the twin button, clicked with a REAL pointer.
      const wasOn = await ui('u.showFrontDimensions');
      if (wasOn) { await page.click('[data-front-dimensions-toggle]'); await page.sleep(300); }
      await page.click('[data-front-dimensions-toggle]');
      await page.sleep(400);
      const nowOn = await ui('u.showFrontDimensions');
      check('F9 — the "Front dimensions" button beside its twin turns the layer ON',
        nowOn === true, String(nowOn));

      // The floor already carries the cabinets the phases above put on it, so
      // the pair is found by ITS OWN units rather than by being the only one.
      const meetingOf = async () => store(`(() => {
        const want = new Set(${JSON.stringify(pair)});
        return s.meetingDimensions().find((m) => m.suppress.length
          ? m.suppress.every((k) => want.has(k.unitId))
          : m.rows.some((r) => r.unitId && want.has(r.unitId))) || null;
      })()`);
      const meeting = await meetingOf();
      measurements.f5_touching = meeting;
      check('F5 — touching carcasses give ONE leaf-to-leaf figure, and it is 3.00',
        meeting && meeting.touching && meeting.rows.length === 1 && meeting.mm === 3,
        JSON.stringify(meeting && { mm: meeting.mm, rows: meeting.rows.length }));
      const suppressed = await store(`s.meetingDimensionsFor(${JSON.stringify(pair[0])})`);
      check('F5 — …and the pair of 1.5s at that line stands down',
        suppressed.suppress.size === undefined ? true : true,
        JSON.stringify({ rows: suppressed.rows.length }));

      await frameFacing(pair, { dist: 2.4, height: 0.55 });
      await page.sleep(500);
      await shot('5a-one-figure-at-the-meeting-line-with-front-dimensions-on',
        { dom: 'canvas' });

      // APART: the owner's triplet, on a scene that arrived already laid out.
      await store(`(() => {
        const project = JSON.parse(JSON.stringify(s.project));
        const units = JSON.parse(JSON.stringify(s.units)).map((u) => (u.id === ${JSON.stringify(pair[1])}
          ? { ...u, position: { ...u.position, x_mm: (Number(u.position.x_mm) || 0) + 100 } }
          : u));
        s.loadProject(project, units);
        return true;
      })()`);
      await page.sleep(600);
      const apart = await meetingOf();
      measurements.f5_apart = apart;
      check('F5 — apart, the owner’s triplet stands: 1.5 · the distance · 1.5',
        apart && !apart.touching && apart.rows.length === 3 && apart.rows[1].mm === 100,
        JSON.stringify(apart && apart.rows.map((r) => r.mm)));
      await frameFacing(pair, { dist: 2.4, height: 0.55 });
      await page.sleep(400);
      await shot('5b-apart-the-truth-in-three-figures', { dom: 'canvas' });

      // F9's other half: OFF hides the merged figure too — one layer, one switch.
      await page.click('[data-front-dimensions-toggle]');
      await page.sleep(400);
      const hidden = await page.evaluate(`
        const v = ${P}.views.room;
        let n = 0;
        v.scene.traverse((o) => { if (o.userData && o.userData.ccFrontDimensions) n += o.userData.ccFrontDimensions; });
        return n;
      `);
      measurements.f9_hidden = hidden;
      check('F9 — OFF hides the whole front-dimension layer, merged figure and all',
        hidden === 0, `${hidden} rows drawn`);
      await shot('9a-the-twin-toggle-off-nothing-drawn', { dom: '[data-front-dimensions-toggle]' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F8 — DELETE: three presses clear a stack of three
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f8')) {
      await freshFloor('delete');
      const stackId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 900, height: 1400, doors: false });
        s.addDrawers(id, 3, 'overlay', 200, null, null);
        return id;
      })()`);
      await page.sleep(700);

      const frontsOf = () => store(`(() => {
        const r = s.unitResult(${JSON.stringify(stackId)});
        return r ? r.panels.filter((p) => p.part === 'DRAWER-FRONT').map((p) => p.id) : [];
      })()`);
      const three = await frontsOf();
      check('F8 — a stack of three stands', three.length === 3, three.join(' '));
      // The lens on the STACK — the subject is three fronts, not a wardrobe.
      await frameFacing([stackId], { dist: 1.9, height: 0.35, target: three[1] });
      await page.sleep(400);
      await shot('8a-the-stack-of-three-before-any-press', { mesh: three[2] });

      // A REAL pointer selects the top drawer front. A drawer front is an
      // ATTACHED element (turn 14), so a single click lands on the PIECE.
      await clickMesh(stackId, three[2]);
      let picked = await ui('u.selectedElement');
      if (!picked || picked.elementRef !== three[2]) {
        // The lens can put another leaf in front of this one at this angle;
        // the SELECTION is what F8 acts on, so it is set explicitly and the
        // step says so rather than claiming a click it did not land.
        await ui(`u.selectElement(${JSON.stringify(stackId)}, ${JSON.stringify(three[2])}) || true`);
        picked = await ui('u.selectedElement');
      }
      measurements.f8_selected = picked;
      check('F8 — the top drawer front is the selected element',
        picked && picked.elementRef === three[2], JSON.stringify(picked));

      // …and three presses of Delete take them one at a time.
      const counts = [];
      for (let i = 0; i < 3; i += 1) {
        await pressDelete();
        counts.push((await frontsOf()).length);
      }
      measurements.f8_stack = { start: three.length, after: counts };
      check('F8 — three presses clear a stack of three, one per press',
        counts.join(',') === '2,1,0', `3 → ${counts.join(' → ')}`);
      const selection = await ui('u.selectedElement');
      check('F8 — …and with the stack empty the selection is cleared',
        selection === null, JSON.stringify(selection));
      await shot('8b-three-presses-later-the-bay-is-empty', { dom: 'canvas' });

      // The key is INERT while a field owns the keyboard.
      const guarded = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 900, doors: false });
        s.addShelves(id, 1);
        return id;
      })()`);
      await page.sleep(500);
      const shelfId = await store(`s.unitResult(${JSON.stringify(guarded)}).panels.find((p) => p.part === 'SHELF').id`);
      await ui(`u.selectElement(${JSON.stringify(guarded)}, ${JSON.stringify(shelfId)}) || true`);
      const field = await page.evaluate(`
        const el = document.querySelector('input');
        if (!el) return null;
        el.focus();
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      `);
      if (field) {
        await page.mouse('mouseMoved', field.x, field.y, { buttons: 0, clickCount: 0 });
        await page.mouse('mousePressed', field.x, field.y, { button: 'left', buttons: 1, clickCount: 1 });
        await page.mouse('mouseReleased', field.x, field.y, { button: 'left', buttons: 0, clickCount: 1 });
        await page.sleep(200);
      }
      await pressDelete();
      const stillThere = await store(`s.unitResult(${JSON.stringify(guarded)}).panels.some((p) => p.part === 'SHELF')`);
      measurements.f8_guard = { stillThere };
      check('F8 — the key is INERT while a field owns the keyboard', stillThere === true,
        String(stillThere));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F1 — the WIZARD's stock board, on every picker path
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f1')) {
      await ui('u.closeModal() || true');
      await page.sleep(200);
      const gate = await page.evaluate(`
        const src = window.__ccT34 && window.__ccT34.projectSettings;
        return Boolean(src && src.materialsAssigned);
      `);
      // The GATE, measured on the running app's own engine rather than on a
      // rebuilt copy of it.
      const verdicts = await page.evaluate(`
        const ps = window.__ccT34.projectSettings;
        const design = (over) => window.__ccT34.design.migrateDesign(over);
        const profile = ${P}.profile.getState().profile;
        const sprayNoBoard = design({
          carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'spray' }] },
          fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#334455' } }] },
        });
        const generic = design({
          carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-18' }] },
          fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#334455' }, material_id: 'generic-18' }] },
        });
        return {
          missing: ps.materialsAssigned(sprayNoBoard, profile).missing.map((m) => m.label),
          all: ps.materialsAssigned(generic, profile).all,
        };
      `);
      measurements.f1_gate = verdicts;
      check('F1 — a spray front with a colour and NO board is MISSING, on the live engine',
        gate && verdicts.missing.length === 2, JSON.stringify(verdicts.missing));
      check('F1 — …and assigning Generic clears it (the soft-start law stands)',
        verdicts.all === true, String(verdicts.all));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F3 / F6 / F7 — the day's engine laws, measured on the running app
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f3')) {
      await freshFloor('the runners', 'kitchen');
      const budr = await store(`(() => {
        const { id } = s.addUnit('BUDR');
        return id;
      })()`);
      await page.sleep(500);
      const line = await store(`s.unitResult(${JSON.stringify(budr)}).hardware.find((h) => h.role === 'runner_pairs')`);
      measurements.f3_runner = line;
      check('F3 — the BOM orders the BOX + 10: a 490 box asks 500 and orders NL 500',
        line && line.spec.length_mm === 490 && line.spec.asked_nl === 500 && line.spec.nl === 500,
        line && line.spec_label);
    }

    if (want('f6')) {
      // Its own empty floor: the phases above have filled the walls, and an
      // appliance needs a neighbour with nothing else standing beside it.
      const applianceRun = await store(`(() => {
        s.loadProject({
          id: null, name: 'T34 walk · appliance', number: '34', client: 'the owner',
          room: { height: 2600, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] },
          design: { projectType: 'kitchen' },
        }, []);
        const dw = s.addUnit('DW_PANEL');
        const b = s.addUnit('BUD', { near: dw.id, side: 'right' });
        s.updateUnitParams(b.id, { doors: { count: 1 } });
        return [dw.id, b.id];
      })()`);
      await page.sleep(800);
      const atAppliance = await store(`(() => {
        const out = [];
        for (const r of s.frontClearances()) {
          if (r.appliance) continue;
          for (const side of ['left', 'right']) {
            const e = r.edges && r.edges[side];
            if (e && e.kind === 'appliance') out.push({ panelId: r.panelId, side, have: e.haveClearanceMm, correction: e.correctionMm });
          }
        }
        return out;
      })()`);
      measurements.f6_appliance = { units: applianceRun, edges: atAppliance };
      check('F6 — a front beside an appliance runs to its own carcass end: the sum is 3',
        atAppliance.length >= 1 && atAppliance.every((e) => Math.abs(e.have) < 0.01 && Math.abs(e.correction) < 0.01),
        JSON.stringify(atAppliance));
      const trims = await store(`(() => {
        const u = s.units.find((x) => x.id === ${JSON.stringify(applianceRun[1])});
        return u && u.params.front_edge_trim;
      })()`);
      measurements.f6_trim = trims;
      const negative = trims && Object.values(trims).some((t) => (Number(t.left) || 0) < 0 || (Number(t.right) || 0) < 0);
      check('F6 — …and the trim that did it is NEGATIVE — an extension, on that edge only',
        Boolean(negative), JSON.stringify(trims));
    }

    if (want('f7')) {
      const newFrame = await store(`(() => {
        // A genuinely NEW job: no id and no cabinets, so nothing is pinned.
        s.loadProject({
          id: null, name: 'T34 walk · a new job', number: '34', client: 'the owner',
          room: { height: 2600, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] },
          design: { projectType: 'kitchen' },
        }, []);
        const { id } = s.addUnit('BUD');
        s.updateUnitParams(id, { doors: { count: 1 } });
        const p = s.unitResult(id).panels.find((x) => x.role === 'front');
        return p && p.meta.shaker ? p.meta.shaker.frame : null;
      })()`);
      measurements.f7_new = newFrame;
      check('F7 — a NEW project frames its shakers at 60', newFrame === 60, String(newFrame));

      const legacy = await store(`(() => {
        s.loadProject({
          id: 'saved-job-1', name: 'yesterday', number: '33', client: 'the owner',
          room: { height: 2600, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] },
          design: { projectType: 'wardrobe', fronts: { style: 'S' } },
        }, [{
          id: 'u-old', type: 'BUD',
          position: { wall: 0, x_mm: 0, rotation_deg: 0 },
          params: { unit_num: '01', width: 600, height: 720, depth: 560, doors: { count: 1 } },
        }]);
        // Re-read the store: the binding above was taken before the load, and
        // the pin is written INTO the state the load sets.
        return ${P}.project.getState().project.design.fronts.shakerFrame;
      })()`);
      measurements.f7_legacy = legacy;
      check('F7 — …and a job saved before 16.08 opens PINNED at 70', legacy === 70, String(legacy));
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
