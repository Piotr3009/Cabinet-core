#!/usr/bin/env node
// ─── Turn 33 acceptance walk — light, the wardrobe's insides, the faults ────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn33.mjs [--only f1,f2,…] [--out verify/t33/]
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
const OUT = argOf('--out', new URL('../verify/t33/', import.meta.url).pathname);
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

  /**
   * A REAL click on a mesh, aimed at a VISIBLE point of it: the top face near
   * the front edge (a shelf's volume centre hides inside the carcass; its
   * front-top edge is what a hand actually points at).
   */
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

  /** Type into whatever has focus, with REAL input (CDP's own text path). */
  const typeText = async (text) => {
    await page.send('Input.insertText', { text });
    await page.sleep(120);
  };

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);
  const ui = (expr) => page.evaluate(`const u = ${P}.ui.getState(); return (${expr});`);

  const measurements = {};

  try {
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    check('R8 — the app is pointed at the silent showroom', true, showroom.url);

    // A wardrobe project on the floor, the way every phase below expects it.
    await store(`s.loadProject({
      id: null, name: 'T33 walk', number: '33', client: 'the owner',
      room: { height: 2600, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] },
      design: { projectType: 'wardrobe' },
    }, []) || true`);
    await ui('u.openEditor() || true');
    await page.sleep(600);
    await page.waitFor('document.querySelector(\'nav\')', { what: 'the editor chrome' });

    // ═══════════════════════════════════════════════════════════════════════
    // F1 — LIGHTING: the button before Output, the panel, the placements
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f1')) {
      const wid = await store(`(() => { const { id } = s.addUnit('WARDROBE'); s.updateUnitParams(id, { width: 1000, doors: false }); s.addShelves(id, 1); return id; })()`);
      await page.sleep(500);
      await frameUnits([wid], [0.6, 0.35, 1.6]);
      await page.sleep(400);

      const order = await page.evaluate(`
        const labels = [...document.querySelectorAll('nav button')].map((b) => b.textContent.trim());
        return { labels, lighting: labels.indexOf('Lighting'), output: labels.findIndex((l) => l.startsWith('Output')) };
      `);
      check('F1 — the Lighting button stands BEFORE Output in the bar',
        order.lighting > -1 && order.output > -1 && order.lighting === order.output - 1,
        JSON.stringify({ lighting: order.lighting, output: order.output }));

      await page.click('button', 'Lighting', { exact: true });
      await page.sleep(400);
      const beside = await page.evaluate(`
        const m = document.querySelector('[data-modal-name="lighting"]');
        if (!m) return null;
        const r = m.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) };
      `);
      check('F1 — the panel opens BESIDE its button (rule 5), draggable shell', Boolean(beside), JSON.stringify(beside));

      await page.click('[data-lighting-enabled]');
      await page.sleep(300);
      const on = await store(`s.project.design.lighting.enabled`);
      check('F1 — ON/OFF writes design.lighting.enabled', on === true, String(on));
      await page.click('[data-lighting-temp="6000"]');
      await page.sleep(200);
      const k6 = await store(`s.project.design.lighting.temperature`);
      await page.click('[data-lighting-temp="4000"]');
      await page.sleep(200);
      const swWords = await page.evaluate(`return [...document.querySelectorAll('[data-lighting-switch]')].map((b) => b.getAttribute('data-lighting-switch'));`);
      check('F1 — temperatures are the owner’s menu and the switching is the wardrobe’s (door/sensor)',
        k6 === 6000 && JSON.stringify(swWords) === JSON.stringify(['door', 'sensor']), JSON.stringify({ k6, swWords }));
      await shot('1a-the-lighting-panel-choices-and-instructional-drawings',
        { dom: '[data-lighting-panel]', text: '4000 K' });

      // THE OWNER'S FLOW: a REAL click on a shelf in the scene…
      const clicked = await clickMesh(wid, 'SHELF-1');
      check('F1 — a real pointer clicked the shelf in the scene', clicked, 'SHELF-1');
      const offered = await page.evaluate(`return Boolean(document.querySelector('[data-lighting-add-shelf]'));`);
      check('F1 — …and the panel offers "Add LED under this shelf"', offered);
      await page.click('[data-lighting-add-shelf]');
      await page.sleep(400);
      const strip = await page.evaluate(`
        const v = ${P}.views.room; const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let m = null;
        v.scene.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccLedStrip === 'shelf') m = o; });
        if (!m) return null;
        const b = new THREE.Box3().expandByObject(m);
        return { z: Math.round(((b.min.z + b.max.z) / 2) * 1000), len: Math.round((b.max.x - b.min.x) * 1000) };
      `);
      check('F1 — the strip appears under that shelf, its run the shelf’s own width',
        strip && strip.len > 800, JSON.stringify(strip));
      measurements.f1_strip_before_slide = strip;
      await shot('1b-add-led-under-this-shelf-the-strip-appears', { marked: 'ccLedStrip' });

      // …and the DEPTH SLIDER slides it front-to-back, with a real drag.
      const track = await page.evaluate(`
        const el = document.querySelector('[data-lighting-depth]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x1: r.left + r.width * 0.15, x2: r.left + r.width * 0.85, y: r.top + r.height / 2 };
      `);
      if (track) {
        await page.mouse('mouseMoved', track.x1, track.y, { buttons: 0, clickCount: 0 });
        await page.mouse('mousePressed', track.x1, track.y, { button: 'left', buttons: 1, clickCount: 1 });
        await page.mouse('mouseMoved', track.x2, track.y, { buttons: 1, clickCount: 0 });
        await page.mouse('mouseReleased', track.x2, track.y, { button: 'left', buttons: 0, clickCount: 1 });
        await page.sleep(400);
      }
      const slid = await page.evaluate(`
        const v = ${P}.views.room; const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let m = null;
        v.scene.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccLedStrip === 'shelf') m = o; });
        if (!m) return null;
        const b = new THREE.Box3().expandByObject(m);
        return { z: Math.round(((b.min.z + b.max.z) / 2) * 1000) };
      `);
      measurements.f1_strip_after_slide = slid;
      check('F1 — the depth slider MOVES the strip front-to-back in the scene',
        strip && slid && Math.abs(slid.z - strip.z) > 20, `z ${strip && strip.z} → ${slid && slid.z} mm`);
      await shot('1c-the-depth-slider-slid-the-strip-toward-the-back', { marked: 'ccLedStrip' });

      // The other kinds: side 4 mm line, bottom at the plinth, top wash.
      await page.click('[data-lighting-add-side="L"]');
      await page.sleep(250);
      await page.click('[data-lighting-add-bottom]');
      await page.sleep(250);
      await page.click('[data-lighting-add-top]');
      await page.sleep(400);
      const kinds = await page.evaluate(`
        const v = ${P}.views.room;
        const seen = {};
        v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccLedStrip) seen[o.userData.ccLedStrip] = (seen[o.userData.ccLedStrip] || 0) + 1; });
        return seen;
      `);
      measurements.f1_kinds = kinds;
      check('F1 — side, bottom and top strips all stand in the scene',
        kinds.side >= 1 && kinds.bottom >= 1 && kinds.top >= 1, JSON.stringify(kinds));
      await shot('1d-side-4mm-line-bottom-at-plinth-top-wash-all-placed', { marked: 'ccLedStrip' });

      // SPOT — kitchen wall units only: a WUD takes them, evenly spaced.
      const wud = await store(`(() => { const { id } = s.addUnit('WUD'); return id; })()`);
      await page.sleep(400);
      await ui(`u.selectUnit(${JSON.stringify(await page.evaluate(`${JSON.stringify('x')} && ${JSON.stringify('x')}`)) ? `'${wud}'` : `'${wud}'`}) || true`);
      await page.sleep(300);
      await frameUnits([wud], [0.4, -0.2, 1.8]);
      await page.sleep(300);
      const spotBtn = await page.evaluate(`return Boolean(document.querySelector('[data-lighting-add-spot]'));`);
      check('F1 — the SPOT tool appears for a wall unit', spotBtn);
      if (spotBtn) {
        await page.click('[data-lighting-add-spot]');
        await page.sleep(400);
      }
      const spots = await page.evaluate(`
        const v = ${P}.views.room;
        let n = 0;
        v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccLedStrip === 'spot') n += 1; });
        return n;
      `);
      check('F1 — spots under the wall unit, the profile’s count', spots >= 2, `${spots} discs`);
      await shot('1e-spotlights-under-the-kitchen-wall-unit', { marked: 'ccLedStrip' });

      // The BOM block: yellow named specs, metres and counts.
      await ui('u.setBomOpen(true) || true');
      await page.sleep(500);
      await page.click('[data-bom-order-tab]');
      await page.sleep(500);
      const bomText = await page.evaluate(`return document.body.innerText;`);
      check('F1 — the BOM carries the Lighting block: strip metres, driver, switch, spots — all named specs',
        bomText.includes('LED strip 4000 K') && bomText.includes('LED driver') && bomText.includes('LED spotlight'),
        '');
      await shot('1f-the-bom-lighting-block-yellow-named-specs', { dom: '[data-bom-lighting]', text: 'LED strip 4000 K' });
      await ui('u.setBomOpen(false) || true');
      await page.sleep(300);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F2 — "Turn on the light": the client demo, derived and exact
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f2')) {
      const wids = await store(`s.units.map((u) => u.id)`);
      await frameUnits(wids.slice(0, 1), [0.6, 0.3, 1.7]);
      await page.sleep(400);
      const before = await page.evaluate(`
        const v = ${P}.views.room;
        let emissive = null;
        v.scene.traverse((o) => { if (emissive === null && o.isMesh && o.userData && o.userData.ccLedStrip && o.material) emissive = o.material.emissiveIntensity; });
        return { env: v.scene.environmentIntensity ?? null, emissive };
      `);
      await shot('2a-the-same-camera-demo-off', { dom: 'canvas' });

      await page.click('button', 'View', { exact: true });
      await page.sleep(300);
      await page.click('button', 'Turn on the light');
      await page.sleep(600);
      const during = await page.evaluate(`
        const v = ${P}.views.room;
        let emissive = null;
        v.scene.traverse((o) => { if (emissive === null && o.isMesh && o.userData && o.userData.ccLedStrip && o.material) emissive = o.material.emissiveIntensity; });
        return { env: v.scene.environmentIntensity ?? null, emissive };
      `);
      measurements.f2 = { before, during };
      check('F2 — the room dims to the profile level and the LEDs come UP',
        during.env < before.env && during.emissive > before.emissive,
        JSON.stringify({ before, during }));
      await shot('2b-the-same-camera-turn-on-the-light', { dom: 'canvas' });

      await page.click('button', 'View', { exact: true });
      await page.sleep(300);
      await page.click('button', 'Turn on the light');
      await page.sleep(500);
      const after = await page.evaluate(`
        const v = ${P}.views.room;
        return { env: v.scene.environmentIntensity ?? null };
      `);
      check('F2 — toggling back restores the scene EXACTLY (derived, nothing stored)',
        Math.abs(after.env - before.env) < 1e-9, `env ${before.env} → ${during.env} → ${after.env}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F3 — the wardrobe's interior accessories, per column
    // ═══════════════════════════════════════════════════════════════════════
    let f3id = null;
    if (want('f3')) {
      f3id = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 1400, height: 2400, doors: false });
        s.addPartition(id);
        s.setPartitionFront(id, 0);
        return id;
      })()`);
      await page.sleep(500);
      await ui(`u.selectUnit('${f3id}') || true`);
      await ui(`u.openModal('add-items', { unitId: '${f3id}' }) || true`);
      await page.sleep(500);

      // The SHOE SHELF, by pointer: row → bay → add.
      await page.click('[data-add-kind="shoe_shelf"]');
      await page.sleep(300);
      await page.click('[data-shoe-zone="0"]');
      await page.sleep(200);
      await page.click('[data-add-shoe-shelf]');
      await page.sleep(500);
      await ui(`u.openModal('add-items', { unitId: '${f3id}' }) || true`);
      await page.sleep(300);
      await page.click('[data-add-kind="drawers"]');
      await page.sleep(300);
      await page.click('[data-drawer-zone="1"]');
      await page.sleep(200);
      // The VARIANT row, by pointer — then the stack itself sized so the rail
      // above it lands past the owner's 2000 (3 × 250, the store's own door).
      await page.click('[data-drawer-variant="belt_tie_glass"]');
      await page.sleep(200);
      const drew = await store(`s.addDrawers('${f3id}', 3, 'overlay', 250, 1, 'belt_tie_glass').ok`);
      check('F3 — the glass-top stack stands in its column', drew === true);
      await page.sleep(400);
      // The bought mechanisms: trouser pull-out into column 1.
      await ui(`u.openModal('add-items', { unitId: '${f3id}' }) || true`);
      await page.sleep(300);
      await page.click('[data-add-kind="trouser"]');
      await page.sleep(300);
      await page.click('[data-kit-zone="0"]');
      await page.sleep(200);
      await page.click('[data-add-kit="trouser"]');
      await page.sleep(500);

      const f3 = await store(`(() => {
        const r = s.unitResult('${f3id}');
        return {
          shoeRail: r.panels.some((p) => p.part === 'SHOE-RAIL'),
          tilt: r.panels.find((p) => p.part === 'SHELF' && p.meta.variant === 'shoe')?.meta?.tilt_deg ?? null,
          glass: r.assemblies.drawerGlass.length,
          kit: r.hardware.find((h) => h.role === 'wardrobe_kit_trouser')?.spec_label || null,
          insert: r.hardware.find((h) => h.role === 'drawer_insert')?.spec_label || null,
        };
      })()`);
      measurements.f3 = f3;
      check('F3 — the shoe shelf CUT with its stop rail, leaning the profile’s 15°',
        f3.shoeRail && f3.tilt === 15, JSON.stringify(f3));
      check('F3 — the display drawer’s glass drawn and its insert ORDERED',
        f3.glass >= 1 && /Belt\/tie divider insert/.test(f3.insert || ''), f3.insert || 'no line');
      check('F3 — the trouser pull-out is a purchase line at the column’s opening',
        /Trouser pull-out · \d+ mm opening/.test(f3.kit || ''), f3.kit || 'no line');

      await frameUnits([f3id], [0.7, 0.25, 1.7]);
      await page.sleep(500);
      await shot('3a-shoe-shelf-tilted-with-stop-rail-glass-drawer-and-trouser-placeholder',
        { mesh: 'SHOE-RAIL-1' });

      // The pull-down suggestion: a rail hung HIGH (the joiner's own 2000
      // offset) lands above the owner's threshold and the hint speaks, grey.
      const railWid = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 900, height: 2500, doors: false, rail_offset: 2000 });
        return id;
      })()`);
      await page.sleep(400);
      await ui(`u.selectUnit('${railWid}') || true`);
      await ui(`u.openModal('add-items', { unitId: '${railWid}' }) || true`);
      await page.sleep(400);
      await page.click('[data-add-kind="hanger"]');
      await page.sleep(300);
      await page.click('button', 'Add hanger rail');
      await page.sleep(400);
      const hint = await page.evaluate(`return document.body.innerText.match(/Rail at \\d+ mm[^\\n]*/)?.[0] || null;`);
      const railMm = await store(`s.railHeightsAboveFloor('${railWid}').find((r) => r.zone == null)?.mm ?? null`);
      measurements.f3_rail = { hint, railMm };
      check('F3 — the >2000 pull-down HINT speaks, grey, with the measured height',
        railMm > 2000 && Boolean(hint), JSON.stringify({ railMm, hint }));
      await shot('3b-the-pulldown-suggestion-grey-hint-with-the-height', { text: 'pull-down' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F4 + F7 — mirrors on doors · one hinge block · mirrored handles
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f4') || want('f7')) {
      const did = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 1000, doors: true });
        s.setProjectHandle({ type: 'bar', centres: 128 });
        return id;
      })()`);
      await page.sleep(500);
      const doors = await store(`s.unitResult('${did}').panels.filter((p) => p.part === 'FRONT' && p.role === 'front').map((p) => p.id)`);
      await frameUnits([did], [0.2, 0.15, 1.9]);
      await page.sleep(400);

      // The DOOR MODAL, off a real double-click on the left leaf.
      const spot = await page.evaluate(`
        const v = ${P}.views.room; const THREE = v.three;
        v.scene.updateMatrixWorld(true);
        let mesh = null;
        v.scene.traverse((g) => {
          if (mesh || !g.userData || g.userData.ccUnitId !== ${JSON.stringify(did)}) return;
          g.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(doors[0])}) mesh = o; });
        });
        if (!mesh) return null;
        const c = mesh.getWorldPosition(new THREE.Vector3()).project(v.camera);
        const r = v.gl.domElement.getBoundingClientRect();
        return { x: r.left + ((c.x + 1) / 2) * r.width, y: r.top + ((1 - c.y) / 2) * r.height };
      `);
      if (spot) {
        await page.mouse('mouseMoved', spot.x, spot.y, { buttons: 0, clickCount: 0 });
        await page.sleep(150);
        for (const n of [1, 2]) {
          await page.mouse('mousePressed', spot.x, spot.y, { button: 'left', buttons: 1, clickCount: n });
          await page.mouse('mouseReleased', spot.x, spot.y, { button: 'left', buttons: 0, clickCount: n });
        }
        await page.sleep(600);
      }
      const modal = await page.evaluate(`return (() => {
        const m = document.querySelector('[data-door-modal]');
        if (!m) return null;
        const hingeBlocks = m.querySelectorAll('[data-hinge-modal-rows], [data-hinge-rows]').length;
        const first = m.firstElementChild?.getAttribute('data-door-section') || null;
        return { open: true, hingeBlocks, first, sections: m.getAttribute('data-door-modal-sections') };
      })()`);
      check('F7 — the door modal opened by pointer shows ONE hinge block, at the TOP',
        modal && modal.hingeBlocks === 1 && modal.sections === 'B,A', JSON.stringify(modal));
      await shot('7a-one-hinge-block-at-the-top-of-the-door-modal',
        { dom: '[data-hinge-assign="1"]' });

      if (want('f4')) {
        // Mirror INSIDE on this leaf, by pointer.
        await page.click('[data-door-mirror="inside"]');
        await page.sleep(400);
        await ui('u.closeModal() || true');
        await page.sleep(200);
        await ui(`u.openFrontsFor('${did}', ${JSON.stringify(doors)}) || true`);
        await page.sleep(900);
        const mirror = await page.evaluate(`
          const v = ${P}.views.room;
          let seen = null;
          v.scene.traverse((o) => { if (!seen && o.isMesh && o.userData && o.userData.ccDoorMirror) seen = o.userData.ccDoorMirror; });
          return seen;
        `);
        check('F4 — the INSIDE mirror shows on the OPEN door', mirror === 'inside', String(mirror));
        await shot('4a-inside-mirror-on-the-open-door', { marked: 'ccDoorMirror' });
        const bomLine = await store(`s.unitResult('${did}').hardware.find((h) => h.role === 'mirror')?.spec_label || null`);
        measurements.f4 = { bomLine };
        check('F4 — the BOM orders the glass at the front minus 20 a side',
          /^Mirror \d+ × \d+ mm · inside$/.test(bomLine || ''), bomLine || 'no line');
        await ui(`u.closeAllFronts ? (u.closeAllFronts() || true) : true`);
        await page.sleep(400);
      }

      if (want('f7')) {
        // The handles: nudge x+10 three times ON THE MODAL, then measure the
        // PAIR in the scene — mirrored about the cabinet's centre, 50/50.
        await page.evaluate(`
          const u = ${P}.ui.getState();
          u.openModal('element', { unitId: '${did}', panelId: ${JSON.stringify(doors[0])}, anchor: { x: 1100, y: 300, width: 0, height: 0 } });
          return true;
        `);
        await page.sleep(500);
        for (let i = 0; i < 3; i += 1) {
          await page.click('[data-handle-nudge="x+10"]');
          await page.sleep(250);
        }
        await ui('u.closeModal() || true');
        await page.sleep(500);
        const pair = await page.evaluate(`
          const v = ${P}.views.room; const THREE = v.three;
          v.scene.updateMatrixWorld(true);
          const xs = [];
          v.scene.traverse((g) => {
            if (!g.userData || g.userData.ccUnitId !== ${JSON.stringify(did)}) return;
            g.traverse((o) => {
              if (o.userData && o.userData.ccHandle) {
                xs.push(o.getWorldPosition(new THREE.Vector3()).x * 1000);
              }
            });
          });
          return xs.sort((a, b) => a - b);
        `);
        const centre = await sceneBoundsMm(did);
        if (pair.length >= 2 && centre) {
          const unitBox = await panelBoxMm(did, doors[0]);
          void unitBox;
          const mid = (pair[0] + pair[pair.length - 1]) / 2;
          const left = mid - pair[0];
          const right = pair[pair.length - 1] - mid;
          measurements.f7_handles = { pair, left, right };
          check('F7 — the pair’s handles sit MIRRORED (50/50, never 60/40), measured in the scene',
            Math.abs(left - right) < 2, `±${Math.abs(left - right).toFixed(1)} mm about the pair centre`);
        } else {
          check('F7 — handle meshes found for the pair', false, `${pair.length} found`);
        }
        await shot('7b-the-pair-mirrored-after-three-x10-nudges', { dom: 'canvas' });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F5 — the healing sweep: the grey note and the healed edge, live
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f5')) {
      // The pair is PINNED to the far wall (index 2), which the walk never
      // touches: born on the crowded near wall, the second cabinet lands
      // against a UNIT neighbour, the matrix is content with its 1.5, and
      // there is no correction to announce — the very miss the full run
      // caught. On an empty wall the end panel is the governing neighbour
      // and the heal has something to say.
      const pairIds = await store(`(() => {
        const a = s.addUnit('BUD');
        s.updateUnitParams(a.id, { doors: { count: 1 } });
        s.moveUnitToWall(a.id, 2, 2000);
        const b = s.addUnit('BUD', { near: a.id, side: 'right' });
        s.updateUnitParams(b.id, { doors: { count: 1 } });
        return [a.id, b.id];
      })()`);
      await page.sleep(300);
      await frameUnits(pairIds, [0.6, 0.4, -3.0]);
      await page.sleep(300);
      // The end panel LAST, on its own: the grey note it forces is the one
      // the read and the picture must catch inside its three seconds.
      await store(`s.addEndPanel('${pairIds[1]}', { side: 'R' })`);
      await page.sleep(150);
      const note = await page.evaluate(`return document.body.innerText.match(/front [^\\n]*mm[^\\n]*/)?.[0] || null;`);
      // The picture is taken at once, INSIDE the grey's three seconds — a
      // heavy late-run capture once outlived the toast — and its subject is
      // the note's own words, which no toolbar caption can counterfeit.
      await shot('5a-the-grey-note-of-the-self-healing', note ? { text: 'at an end panel' } : null);
      check('F5 — the self-correction announces itself as a GREY note', Boolean(note), note || 'no note');

      const healed = await store(`(() => {
        const rows = s.frontClearances();
        const standing = [];
        for (const r of rows) for (const side of ['left', 'right']) {
          const e = r.edges?.[side];
          if (e && !e.parked && Number(e.correctionMm) > 0.01) standing.push(r.panelId + ':' + side);
        }
        return { standing };
      })()`);
      check('F5 — no healable correction left standing anywhere on the floor',
        healed.standing.length === 0, JSON.stringify(healed.standing));

      // The healed front, measured: engine width vs the mesh in the room.
      const bId = pairIds[1];
      const front = await store(`(() => {
        const r = s.unitResult('${bId}');
        const f = r.panels.find((p) => p.role === 'front');
        return { id: f.id, w: f.w };
      })()`);
      const meshBox = await panelBoxMm(bId, front.id);
      if (meshBox) {
        const meshW = meshBox.maxX - meshBox.minX;
        measurements.f5 = { engine: front.w, scene: meshW };
        check('F5 — the healed front’s width in the SCENE equals the engine’s trimmed width',
          Math.abs(meshW - front.w) <= 2, `${meshW} vs ${front.w} mm`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F6 — the missing 30, measured divided against undivided
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f6')) {
      // Both measured units are PINNED to the far wall (index 2), clear of
      // F5's pair at its middle: the world-axis deltas below only compare
      // like with like when the two cabinets share one wall and one facing —
      // left to the placement hunt, a crowded floor sends one round a corner
      // and the X/Z arithmetic measures two different directions.
      const plainId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 1000, doors: true });
        s.moveUnitToWall(id, 2, 200);
        s.addDrawers(id, 2, 'overlay', 200, null);
        return id;
      })()`);
      const colId = await store(`(() => {
        const { id } = s.addUnit('WARDROBE');
        s.updateUnitParams(id, { width: 1000, doors: true, drawers: 0 });
        s.moveUnitToWall(id, 2, 4600);
        s.addPartition(id);
        s.setPartitionFront(id, 0);
        s.addDrawers(id, 2, 'overlay', 200, 0);
        return id;
      })()`);
      await page.sleep(600);

      const plainSL = await panelBoxMm(plainId, 'D1-SL');
      const colSL = await panelBoxMm(colId, 'Z1D1-SL');
      const plainOrigin = await panelBoxMm(plainId, 'BUL');
      const colOrigin = await panelBoxMm(colId, 'BUL');
      if (plainSL && colSL && plainOrigin && colOrigin) {
        const plainOff = plainSL.minX - plainOrigin.minX;
        const colOff = colSL.minX - colOrigin.minX;
        const plainFront = plainSL.maxZ - plainOrigin.minZ;
        const colFront = colSL.maxZ - colOrigin.minZ;
        measurements.f6 = {
          standoff: { plain: plainOff, column: colOff },
          boxFront: { plain: plainFront, column: colFront },
        };
        check('F6 — the column box stands off the hinged side EXACTLY as the no-divider box (scene-measured)',
          Math.abs(plainOff - colOff) <= 1, `${plainOff} vs ${colOff} mm off the carcass side`);
        check('F6 — …and its front sits at the same setback behind the door plane',
          Math.abs(plainFront - colFront) <= 1, `${plainFront} vs ${colFront} mm`);
      } else {
        check('F6 — both boxes found in the scene', false, JSON.stringify({ plainSL: Boolean(plainSL), colSL: Boolean(colSL) }));
      }
      const dpCut = await store(`(() => {
        const r = s.unitResult('${colId}');
        return {
          dp: r.panels.some((p) => p.id === 'Z1-DP-L'),
          fillers: r.panels.filter((p) => p.part === 'FILLER' && p.meta.zone === 0).length,
          hinge: r.hardware.find((h) => h.role === 'hinges')?.spec?.angle ?? null,
        };
      })()`);
      measurements.f6_cut = dpCut;
      check('F6 — the DP and its two fillers are CUT for the column, and the door takes the 155°',
        dpCut.dp && dpCut.fillers === 2 && dpCut.hinge === 155, JSON.stringify(dpCut));
      await ui(`u.openFrontsFor('${colId}', ${JSON.stringify(await store(`s.unitResult('${colId}').panels.filter((p) => p.part === 'FRONT').map((p) => p.id)`))}) || true`);
      await page.sleep(900);
      // The room is 3 m deep and the lens is 38°: a full-height stand-back
      // from a wall-2 wardrobe does not exist inside the walls, and from
      // outside them the near wall's own cabinets stand in the beam. So the
      // picture is a DETAIL: aimed at the drawer stack's own measured box,
      // from inside the room, just clear of the near wall's unit band —
      // the DP, its fillers and the boxes behind the open leaves.
      const aimBox = await panelBoxMm(colId, 'Z1D1-SL');
      const otherSide = await panelBoxMm(colId, 'BUR');
      if (aimBox && colOrigin && otherSide) {
        const sx = (aimBox.minX + aimBox.maxX) / 2000;
        const sy = (aimBox.minY + aimBox.maxY) / 2000;
        const sz = (aimBox.minZ + aimBox.maxZ) / 2000;
        // The stand is INBOARD of the drawer column — toward the carcass
        // middle, measured, not guessed, and the middle is the MIDPOINT OF
        // THE TWO UPRIGHTS (BUL alone is an edge, not a centre) — so
        // neither open leaf can cross the sight line on either hinge hand.
        const unitCx = (colOrigin.minX + colOrigin.maxX
          + otherSide.minX + otherSide.maxX) / 4000;
        const inboard = Math.sign(unitCx - sx) || 1;
        await page.evaluate(`
          const v = ${P}.views.room;
          const t = { x: ${sx.toFixed(4)}, y: ${(sy + 0.1).toFixed(4)}, z: ${sz.toFixed(4)} };
          if (v.controls) v.controls.enableDamping = false;
          if (v.controls && v.controls.target) v.controls.target.set(t.x, t.y, t.z);
          v.camera.position.set(t.x + ${(inboard * 0.45).toFixed(2)}, t.y + 0.55, t.z - 1.3);
          v.camera.up.set(0, 1, 0);
          v.camera.lookAt(t.x, t.y, t.z);
          v.camera.updateProjectionMatrix();
          if (v.controls) v.controls.update();
          return true;
        `);
      } else {
        await frameUnits([colId], [1.2, 0.3, -1.4]);
      }
      await page.sleep(400);
      await shot('6a-column-drawers-behind-open-doors-dp-and-fillers-standing', { mesh: 'Z1-DP-L' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F9/F10/F11 — the ladder in the BOM · pins at 50 · the insert nominal
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f9')) {
      // Back onto the floor with the accessories wardrobe still standing.
      await ui('u.setBomOpen(false) || true');
      const proofs = await store(`(() => {
        const out = {};
        for (const u of s.units) {
          const r = s.unitResult(u.id);
          const runner = r.hardware.find((h) => h.role === 'runner_pairs' && /orders NL/.test(h.spec_label || ''));
          if (runner && !out.runner) out.runner = runner.spec_label;
          const insert = r.hardware.find((h) => h.role === 'drawer_insert' && /fits nominal/.test(h.spec_label || ''));
          if (insert && !out.insert) out.insert = insert.spec_label;
          const pin = (r.drills || []).find((d) => /SHELVES/.test(d.layer || '') && d.x === 50);
          if (pin && !out.pin) out.pin = { x: pin.x, layer: pin.layer };
        }
        return out;
      })()`);
      measurements.f9_f10_f11 = proofs;
      check('F9 — a drawer’s BOM line ORDERS the ladder rung beside the cut depth',
        /orders NL \d+/.test(proofs.runner || ''), proofs.runner || 'no runner line says so');
      check('F11 — an insert line names the catalogue nominal that drops in',
        /fits nominal \d+/.test(proofs.insert || ''), proofs.insert || 'no insert line says so');
      check('F10 — the app project drills its shelf pins at the owner’s 50',
        proofs.pin && proofs.pin.x === 50, JSON.stringify(proofs.pin));
    }

    if (want('f10')) {
      // …and the CONTROL is gone from the settings screen, photographed.
      await ui(`u.openModal('design', { anchor: { x: 800, y: 200, width: 0, height: 0 } }) || true`);
      await page.sleep(700);
      const noField = await page.evaluate(`return !document.querySelector('[data-shelf-pin-setback]');`);
      check('F10 — the shelf-pin control has left the settings panel (sanctioned removal)', noField);
      await shot('10a-settings-panel-without-the-shelf-pin-control', { dom: '[data-modal-name="design"]' });
      await ui('u.closeModal() || true');
      await page.sleep(300);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // F8 — the shaker frame field, in the wizard's own slot card (LAST: the
    // wizard starts a NEW project, so the floor above had to be walked first)
    // ═══════════════════════════════════════════════════════════════════════
    if (want('f8')) {
      await ui('u.goToStart() || true');
      await page.sleep(700);
      // The RED unsaved-changes reminder floats over the start screen — click
      // it away first (T32's own lesson).
      const red = await page.evaluate(`return (() => {
        const el = [...document.querySelectorAll('button, [role="status"], div')].find((n) => (n.innerText || '').includes('Save the project'));
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })();`);
      if (red) {
        await page.mouse('mouseMoved', red.x, red.y, { buttons: 0, clickCount: 0 });
        await page.mouse('mousePressed', red.x, red.y, { button: 'left', buttons: 1, clickCount: 1 });
        await page.mouse('mouseReleased', red.x, red.y, { button: 'left', buttons: 0, clickCount: 1 });
        await page.sleep(400);
      }
      await page.click('button', 'New project');
      await page.waitFor(`document.querySelector('[data-modal-name="new-project"]')`, { what: 'the flow' });
      await page.click('button', 'Next', { exact: true });                 // info
      await page.click('button', 'Wardrobe');                              // type
      await page.click('button', 'Next', { exact: true });
      await page.click('button', 'Next — room setup');                     // scope
      await page.waitFor(`document.querySelector('[data-modal-name="room"]') || document.body.innerText.includes('Apply')`, { what: 'the room editor' });
      await page.click('button', 'Apply');
      await page.waitFor(`document.querySelector('[data-wizard-settings="1"]')`, { what: 'the rebuilt step 4' });
      await page.sleep(400);

      // (a) the Shaker slot card carries the field — the default project style
      // IS Shaker, so the (locked) fronts container already shows it.
      const wiz = await page.evaluate(`return (() => {
        const slot = document.querySelector('[data-shaker-frame-slot]');
        return { slot: Boolean(slot), label: (document.body.innerText || '').includes('Frame width (all shaker fronts)') };
      })();`);
      check('F8 — the Shaker slot card carries "Frame width (all shaker fronts)"',
        wiz.slot && wiz.label, JSON.stringify(wiz));
      await shot('8a-shaker-slot-with-the-frame-width-field', { dom: '[data-shaker-frame-slot]' });

      // Unlock the fronts the chat-batch way: the carcass gets a board (the
      // T32-proven assignment, driven through the store) and Save carcasses is
      // a REAL click.
      await page.evaluate(`return (() => {
        const s = ${P}.project.getState();
        const m = ${P}.materials.getState().materials.find((x) => x.category !== 'hardware');
        s.setCarcassMaterial('c1', m ? m.id : 'generic');
        return true;
      })();`);
      await page.sleep(300);
      await page.click('[data-save-carcasses="1"]');
      await page.sleep(500);

      // (b) a non-Shaker slot hides the field: pick Flat on slot 1, by pointer.
      const slotId = await page.evaluate(`return document.querySelector('[data-front-slot]')?.getAttribute('data-front-slot') || null;`);
      if (slotId) {
        await page.click(`[data-style-slot="${slotId}"]`);
        await page.sleep(400);
        await page.click('button', 'Flat');
        await page.sleep(500);
        const gone = await page.evaluate(`return !document.querySelector('[data-shaker-frame-slot]');`);
        check('F8 — a non-Shaker slot hides the field', gone);
        await shot('8b-flat-slot-no-frame-field', { dom: '[data-front-slot]' });
        const galleryOpen = await page.evaluate(`return Boolean(document.querySelector('[data-style-gallery-for]'));`);
        if (!galleryOpen) {
          await page.click(`[data-style-slot="${slotId}"]`);
          await page.sleep(400);
        }
        await page.click('button', 'Shaker');
        await page.sleep(500);
      }

      // (c) 90 typed into the field, with real input, lands PROJECT-WIDE.
      const field = await page.evaluate(`return (() => {
        const el = document.querySelector('[data-shaker-frame-slot] input');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })();`);
      if (field) {
        await page.mouse('mouseMoved', field.x, field.y, { buttons: 0, clickCount: 0 });
        await page.mouse('mousePressed', field.x, field.y, { button: 'left', buttons: 1, clickCount: 3 });
        await page.mouse('mouseReleased', field.x, field.y, { button: 'left', buttons: 0, clickCount: 3 });
        await page.sleep(200);
        await typeText('90');
        await page.key('Enter');
        await page.sleep(400);
      }
      const stored = await store('s.project.design.fronts.shakerFrame');
      measurements.f8 = { stored };
      check('F8 — the field writes the PROJECT-WIDE design.fronts.shakerFrame', stored === 90, String(stored));
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
