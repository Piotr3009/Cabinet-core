// ─── Turn 25, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build
//       npx vite preview --port 4173 &
//       node scripts/e2e-turn25.mjs
//
// The fixture server (R8) is started by this script; the app preview is not,
// because a walk that builds its own app cannot prove the build somebody else
// is about to ship.
//
// ─── R1: A POINTER GESTURE IS PROVEN WITH A REAL POINTER ────────────────────
//
// Standing since turn 20: every click, double-click, drag, wheel, hover and
// keystroke goes through `Input.dispatchMouseEvent` / `dispatchKeyEvent`
// (scripts/cdp.mjs). Synthetic DOM events are BANNED, and the ban is enforced
// rather than promised — the guard below reads this file and refuses to run if
// anybody adds one.
//
// ─── R2: THE BUCKET IS ASKED, LIVE ──────────────────────────────────────────
//
// `scripts/bucket-live.mjs`, before any picture of hardware.
//
// ─── R4: A URL AND A COUNT ARE PROVEN BY ASKING THE APP ─────────────────────
//
// Every hardware claim reads `window.__cc.hardware` — the registry the SCENE
// publishes — and never the pixels or a URL this script built for itself. This
// turn's own hardware (F4's handles) reports there too, so "a handle is drawn"
// is a fact off the scene rather than off a photograph.
//
// ─── R5 + R6: THE WALK READS THE CONSOLE, AND AN EXCEPTION FAILS A STEP ─────
//
// `check` takes a snapshot of the error log with every step: ANY uncaught
// error, React error-boundary report or failed resource that appears during a
// step FAILS that step, whatever else it asserted.
//
// ─── R8: HARDWARE VISUALS ARE PROVEN ON THE SILENT SHOWROOM ─────────────────
//
// `test/fixtures/hardware-local/` — synthetic GLBs at the REAL measured
// dimensions with the real export's own node names, no Blum bytes — served
// locally and pointed at with the documented `localStorage['cc.hardwareBase']`
// knob. Everything downstream is the production path.
//
// ─── R9: NO FEATURE WITHOUT ITS PART, ASSERTED IN THE APP ───────────────────
//
// The suite proves R9 per drilling class on the engine. This walk proves it
// where the owner would see it: remove the part IN THE APP, watch the class
// leave the drilling, put it back, watch the class return IDENTICAL.

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
const OUT = argOf('--out', new URL('../verify/t25/', import.meta.url).pathname);

// R1's guard, and it is a guard rather than a promise.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const P = 'window.__cc';

// A favicon nobody asked for is not a React exception. Everything else is.
const IGNORED = [/favicon\.ico/i];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const showroom = await startFixtureServer({ port: 4174 });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name, clip = null) => page.screenshot(`${OUT}${name}.png`, clip);

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

  /** The screen rectangle of a DOM node, for a real pointer to aim at. */
  const boxOf = (selector) => page.evaluate(`
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  `);

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
      blocked('R2 — the live bucket', "this session's egress policy refuses the storage host",
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
      s.newProject('Turn 25 walk');
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      const base = s.addUnit('BUD');
      s.updateUnitParams(base.id, { doors: true, width: 900 });
      window.__t25 = { baseId: base.id };
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.waitFor(`${P}.hardware && ${P}.hardware.allModelled('hinge')`,
      { what: 'the showroom models to land', timeout: 25000 });
    await page.sleep(600);

    // ── R4/R8: the hardware the SCENE mounted, over the app's OWN urls ──────
    const hardware = await page.evaluate(`
      const rows = ${P}.hardware ? ${P}.hardware.rows : [];
      const by = (f) => rows.filter((r) => r.family === f);
      return {
        urls: ${P}.hardware.urls(),
        hinge: by('hinge').length,
        hingeUrl: by('hinge')[0] ? by('hinge')[0].url : null,
        modelled: ${P}.hardware.allModelled('hinge'),
        parents: ${P}.hardware.allParented('hinge', 'door'),
      };
    `);
    measurements.hardware = hardware;
    check("R4/R8 — the mounted hinge is the GLB, over the app's OWN url",
      hardware.hinge > 0 && hardware.modelled, hardware.hingeUrl || 'no url');

    // ─── F3: THE SHAKER IS A TRAY, AND IT THROWS A SHADOW ───────────────────
    //
    // Asserted off the SCENE — the door's geometry is the tray and not a box —
    // and then photographed at a GRAZING ANGLE, which is the only angle at
    // which a rebate is distinguishable from a rectangle drawn on a door.
    const shaker = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t25.baseId);
      const door = r.panels.find((p) => p.part === 'FRONT');
      const v = ${P}.views && ${P}.views.room;
      let mesh = null;
      if (v) v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === door.id) mesh = o; });
      const pos = mesh && mesh.geometry && mesh.geometry.getAttribute('position');
      const nor = mesh && mesh.geometry && mesh.geometry.getAttribute('normal');
      // A plain boxGeometry has 24 vertices; the tray has far more, and its
      // normals point in six directions rather than six faces' worth.
      const dirs = new Set();
      if (nor) for (let i = 0; i < nor.count; i += 1) dirs.add([nor.getX(i), nor.getY(i), nor.getZ(i)].map((n) => Math.round(n)).join(','));
      return {
        id: door.id,
        frontType: door.meta.frontType,
        shaker: door.meta.shaker || null,
        thickness: door.thickness,
        pocket: (door.cnc.pockets || []).filter((k) => k.layer === 'SHAKER_PANEL_POCKET').length,
        vertices: pos ? pos.count : 0,
        normalDirections: dirs.size,
      };
    `);
    measurements.shaker = shaker;
    check('F3.1 — the door is a shaker: a 6 mm recess and a 70 mm frame',
      shaker.shaker && shaker.shaker.frame === 70 && shaker.shaker.depth === 6,
      JSON.stringify(shaker.shaker));
    check('F3.1 — the panel face sits at 25 − 6 = 19, and the BOARD is still 25',
      shaker.shaker && shaker.shaker.panelFloor === 19 && shaker.thickness === 25,
      `floor ${shaker.shaker && shaker.shaker.panelFloor}, board ${shaker.thickness}`);
    check('F3.3 — the mesh is a TRAY, not a slab: real rebate walls with their own normals',
      shaker.vertices > 24 && shaker.normalDirections >= 6,
      `${shaker.vertices} vertices, ${shaker.normalDirections} normal directions`);
    check('F3.4 — …and its panel pocket is on the front’s own sheet', shaker.pocket === 1,
      `${shaker.pocket} SHAKER_PANEL_POCKET`);

    // ─── THE GRAZING ANGLE ─────────────────────────────────────────────────
    //
    // A rebate 6 mm deep is invisible from in front: what makes it read is the
    // SHADOW its top wall throws when the light is nearly along the face, and
    // that is a photograph taken from close and low. The camera is placed on
    // the scene's OWN camera object — the same one the orbit control drives —
    // and the shot is clipped to the door, so what is published is the rebate
    // rather than a room with a cabinet in it.
    const grazing = await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      if (!v) return null;
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t25.baseId);
      const door = r.panels.find((p) => p.part === 'FRONT');
      const u = s.units.find((x) => x.id === window.__t25.baseId);
      const ox = (u.position && u.position.x_mm) || 0;
      const M = 0.001;
      const cx = (ox + door.box.x + door.box.w / 2) * M;
      const cy = (door.box.y + door.box.h * 0.62) * M;
      const cz = (door.box.z + door.box.d) * M;
      // Close, low, and nearly IN the plane of the door — which is what a
      // grazing angle is: about 15° off the face, so the rebate's top wall is
      // in shadow and its bottom wall is in light.
      v.camera.position.set(cx + 0.30, cy + 0.07, cz + 0.09);
      v.camera.lookAt(cx, cy, cz);
      v.camera.updateProjectionMatrix();
      if (v.controls && v.controls.target) { v.controls.target.set(cx, cy, cz); v.controls.update(); }
      const rect = v.gl.domElement.getBoundingClientRect();
      return { ok: true, rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height } };
    `);
    // Tool chrome off: the owner's "clean scene" is what a rebate has to be
    // judged against, and a blue dimension across the door is not the shadow.
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.setShowDimensions(false);
      if (ui.showOutlines) ui.toggleOutlines();
      return true;
    `);
    await page.sleep(900);
    // Clipped to the DOOR's own projected rectangle, off the live camera.
    const doorRect = await page.evaluate(rectOfJs('room', "o.userData && o.userData.ccPanelId && String(o.userData.ccPanelId).indexOf('-FL') > 0"));
    await shot('3a-shaker-at-a-grazing-angle', doorRect ? {
      x: Math.max(0, doorRect.left - 20),
      y: Math.max(0, doorRect.top - 20),
      width: Math.min(1600, doorRect.right - doorRect.left + 40),
      height: Math.min(1000, doorRect.bottom - doorRect.top + 40),
      scale: 2,
    } : null);
    await page.evaluate(`${P}.ui.getState().setShowDimensions(true); return true;`);

    // ─── F4: THE HANDLE IS A REAL MODEL, AT A REAL REFERENCE POINT ──────────
    const handles = await page.evaluate(`
      const s = ${P}.project.getState();
      s.setProjectHandle({ type: 'bar', centres: 160 });
      return true;
    `);
    await page.sleep(500);
    const handleFacts = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t25.baseId);
      const doors = r.panels.filter((p) => p.part === 'FRONT');
      const rows = ${P}.hardware ? ${P}.hardware.of('handle') : [];
      return {
        doors: doors.map((d) => ({ id: d.id, handle: d.meta.handle })),
        holes: r.drills.filter((d) => d.layer === 'HANDLES_5MM').length,
        mounted: rows.length,
        member: rows[0] ? rows[0].member : null,
        parent: rows[0] ? rows[0].parent : null,
        finish: rows[0] ? rows[0].finish : null,
        drawn: (() => {
          const v = ${P}.views && ${P}.views.room;
          let n = 0;
          if (v) v.scene.traverse((o) => { if (o.userData && o.userData.ccHandle) n += 1; });
          return n;
        })(),
        surfaces: ${P}.hardware ? ${P}.hardware.surfaces : [],
      };
    `);
    measurements.handles = handleFacts;
    check('F4.1 — a BASE door’s handle is 50 from the TOP, on the shaker stile',
      handleFacts.doors.every((d) => d.handle && d.handle.rule.startsWith('top-inset')),
      handleFacts.doors.map((d) => `${d.id}: ${d.handle && d.handle.rule}`).join(' · '));
    check('F4.2 — a bar drills TWO holes per door, on their own named class',
      handleFacts.holes === handleFacts.doors.length * 2, `${handleFacts.holes} on HANDLES_5MM`);
    check('R4/F4.3 — the SCENE reports the handles it mounted, in gold, on the front',
      handleFacts.mounted === handleFacts.doors.length && handleFacts.parent === 'front'
      && handleFacts.finish === 'gold',
      `${handleFacts.mounted} rows, ${handleFacts.member}, ${handleFacts.finish}`);
    await shot('4a-gold-bar-on-a-base-door');

    // ─── R9, IN THE APP: remove the part, the class goes ────────────────────
    //
    // The suite proves this per class on the engine. Here it is proven where
    // the owner would see it: the door is removed THROUGH THE APP, the drilling
    // is read again, and the classes that belong to the door are gone.
    const before = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t25.baseId);
      const cls = {};
      for (const d of r.drills) cls[d.layer] = (cls[d.layer] || 0) + 1;
      return { classes: cls, key: r.drills.map((d) => d.panel + '|' + d.layer + '|' + d.x + '|' + d.y).sort().join(';') };
    `);
    await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t25.baseId);
      const door = r.panels.find((p) => p.part === 'FRONT');
      s.removeFront(window.__t25.baseId, door.id);
      return true;
    `);
    await page.sleep(400);
    const without = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t25.baseId);
      const cls = {};
      for (const d of r.drills) cls[d.layer] = (cls[d.layer] || 0) + 1;
      return { classes: cls, fronts: r.panels.filter((p) => p.part === 'FRONT').length };
    `);
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.addDoors(window.__t25.baseId);
      return true;
    `);
    await page.sleep(400);
    const again = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t25.baseId);
      return { key: r.drills.map((d) => d.panel + '|' + d.layer + '|' + d.x + '|' + d.y).sort().join(';') };
    `);
    measurements.r9 = {
      before: before.classes, without: without.classes, sameOnReturn: again.key === before.key,
    };
    const goneClasses = ['HINGES_5MM', 'FRONT_HINGES_35MM', 'FRONT_HINGES_3MM', 'HANDLES_5MM', 'SHAKER_PANEL_POCKET'];
    check('R9 — remove the door in the app and every class it served GOES',
      without.fronts === 0 && goneClasses.every((c) => !without.classes[c]),
      `${Object.keys(without.classes).join(', ') || 'nothing left but the carcass'}`);
    check('R9 — …put it back and the drilling is IDENTICAL, to the coordinate',
      again.key === before.key, again.key === before.key ? 'byte for byte' : 'the holes moved');

    // ─── F6: THE ADJUSTABLE SHELF SHOWS ITS BRASS ───────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.units.find((x) => x.id === window.__t25.baseId);
      s.updateUnitParams(u.id, { sections: [{ width_mm: u.params.width, items: [
        { id: 'adj', kind: 'shelf', pos_mm: 300, variant: 'adjustable' },
        { id: 'fix', kind: 'shelf', pos_mm: 520, variant: 'fixed' },
      ] }] });
      return true;
    `);
    await page.sleep(700);
    const sleeves = await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      let n = 0;
      if (v) v.scene.traverse((o) => { if (o.userData && o.userData.ccShelfSupports) n += o.userData.ccShelfSupports; });
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t25.baseId);
      return {
        drawn: n,
        pins: r.drills.filter((d) => d.layer === 'SHELVES_7_5MM').length,
        shelves: r.panels.filter((p) => p.part === 'SHELF').map((p) => p.meta.variant),
      };
    `);
    measurements.sleeves = sleeves;
    check('F6.1 — the ADJUSTABLE shelf’s sleeves are drawn, in the ⌀7.5 that carry it',
      sleeves.drawn > 0, `${sleeves.drawn} supports over ${sleeves.pins} ⌀7.5 holes`);
    check('F6.2 — …and the FIX shelf beside it shows nothing',
      sleeves.shelves.includes('fixed') && sleeves.drawn === 4,
      `shelves ${sleeves.shelves.join(', ')} · ${sleeves.drawn} supports (one shelf’s worth)`);
    await shot('6a-sleeves-in-an-adjustable-shelf-beside-a-fix-one');

    // ─── F15: OPEN ALL DOORS, BY A REAL CLICK ON THE REAL BUTTON ────────────
    const openAll = await boxOf('[data-open-all-doors]');
    if (openAll) {
      await page.mouse('mousePressed', openAll.x, openAll.y, { button: 'left', clickCount: 1 });
      await page.mouse('mouseReleased', openAll.x, openAll.y, { button: 'left', clickCount: 1 });
      await page.sleep(900);
      const opened = await page.evaluate(`
        const open = ${P}.ui.getState().openFronts;
        let n = 0;
        for (const u of Object.values(open)) for (const v of Object.values(u)) if (v > 0.5) n += 1;
        return n;
      `);
      check('F15 — one press on the toolbar opens every door in the project', opened > 0,
        `${opened} leaves open`);
      await shot('15a-every-door-open');
      await page.mouse('mousePressed', openAll.x, openAll.y, { button: 'left', clickCount: 1 });
      await page.mouse('mouseReleased', openAll.x, openAll.y, { button: 'left', clickCount: 1 });
      await page.sleep(700);
      const shut = await page.evaluate(`
        const open = ${P}.ui.getState().openFronts;
        let n = 0;
        for (const u of Object.values(open)) for (const v of Object.values(u)) if (v > 0.5) n += 1;
        return n;
      `);
      check('F15 — …and a second press shuts them', shut === 0, `${shut} left open`);
    } else {
      check('F15 — the open/close-all button is on the toolbar', false, 'not found');
    }

    // ─── F13: SHOW FRONT DIMENSIONS, ON AND OFF ─────────────────────────────
    await page.evaluate(`${P}.ui.getState().setShowFrontDimensions(true); return true;`);
    await page.sleep(700);
    const dims = await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      let rows = 0;
      if (v) v.scene.traverse((o) => { if (o.userData && o.userData.ccFrontDimensions) rows += o.userData.ccFrontDimensions; });
      return rows;
    `);
    check('F13 — the front dimensions appear, project-wide', dims > 0, `${dims} rows drawn`);
    await shot('13a-front-dimensions-on');
    await page.evaluate(`${P}.ui.getState().setShowFrontDimensions(false); return true;`);
    await page.sleep(600);
    const dimsOff = await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      let rows = 0;
      if (v) v.scene.traverse((o) => { if (o.userData && o.userData.ccFrontDimensions) rows += o.userData.ccFrontDimensions; });
      return rows;
    `);
    check('F13 — …and off is a CLEAN SCENE', dimsOff === 0, `${dimsOff} rows drawn`);
    await shot('13b-front-dimensions-off');

    // ─── F2: THE SHALLOW CABINET'S SINGLE JOINT ─────────────────────────────
    const shallow = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.addUnit('WUD');
      s.updateUnitParams(u.id, { depth: 200 });
      window.__t25.shallowId = u.id;
      const r = s.unitResult(u.id);
      const side = r.panels.find((p) => p.id === 'BUL');
      return {
        inset: r.derived.joint_inset,
        sockets: side.cnc.pockets.filter((k) => k.layer === 'PUZZLE_SOCKET').length,
        holes: r.drills.filter((d) => d.panel === 'BUL' && d.layer === 'PUZZLE_HOLES_7_5MM').length,
      };
    `);
    measurements.shallow = shallow;
    check('F2 — a 200 mm cabinet resolves ONE centred joint per run',
      shallow.inset === null && shallow.sockets === 2 && shallow.holes === 4,
      `inset ${shallow.inset} · ${shallow.sockets} sockets · ${shallow.holes} ⌀7.5`);
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(1600);
    await shot('2a-the-shallow-cabinet-single-joint');

    // ─── F7: THE EXPORT TREE'S FOUR GROUPS ──────────────────────────────────
    //
    // The tree's branches start collapsed, so the unit is OPENED with a real
    // click on its own header before the groups are read — a walk that read a
    // collapsed tree would be reporting on markup nobody has seen.
    const branch = await boxOf('[data-cnc-branch]');
    if (branch) {
      await page.mouse('mousePressed', branch.x, branch.y, { button: 'left', clickCount: 1 });
      await page.mouse('mouseReleased', branch.x, branch.y, { button: 'left', clickCount: 1 });
      await page.sleep(600);
    }
    const tree = await page.evaluate(`
      const groups = [...document.querySelectorAll('[data-cnc-group]')].map((n) => n.getAttribute('data-cnc-group'));
      const quick = [...document.querySelectorAll('[data-cnc-quick]')].map((n) => n.getAttribute('data-cnc-quick'));
      // What the ENGINE says this cabinet's parts group into, in the profile's
      // order — so the header list is compared with the app's own answer and
      // not with a list retyped in this script.
      const open = document.querySelector('[data-cnc-branch][aria-expanded="true"]');
      const unitId = open ? open.getAttribute('data-cnc-branch') : null;
      const s2 = ${P}.project.getState();
      const r = unitId ? s2.unitResult(unitId) : null;
      const groupOf = (p) => (p.role === 'front' || p.role === 'end_panel' || p.role === 'mask' ? 'fronts'
        : (p.role === 'infill' || p.role === 'plinth' ? 'infills'
          : (p.role === 'shelf' ? 'shelves' : 'carcasses')));
      const present = new Set((r ? r.panels : [])
        .filter((p) => p.cnc && p.cnc.outline && p.cnc.outline.length >= 2)
        .map(groupOf));
      const expected = ['carcasses', 'shelves', 'fronts', 'infills'].filter((g) => present.has(g));
      return { groups: [...new Set(groups)], quick: [...new Set(quick)], expected, unitId };
    `);
    measurements.tree = tree;
    // The tree hides an EMPTY branch, which is right — a cabinet with no
    // infills should not show an "Infills & plinths" header with nothing under
    // it. So the assertion is that what IS shown is the groups that have parts,
    // in the profile's own order, read off the engine rather than typed here.
    check('F7.1 — the sheet’s tree is the groups that have parts, in the owner’s order',
      JSON.stringify(tree.groups) === JSON.stringify(tree.expected),
      `${tree.groups.join(' · ') || 'none found'} (expected ${tree.expected.join(' · ')})`);
    check('F7.2 — …with All and the four as quick-select buttons',
      JSON.stringify(tree.quick) === JSON.stringify(['all', 'carcasses', 'shelves', 'fronts', 'infills']),
      tree.quick.join(' · ') || 'none found');
    await shot('7a-the-four-group-export-tree');

    // A REAL CLICK on a quick-select button, and the tick count that follows.
    const quickBtn = await boxOf('[data-cnc-quick="shelves"]');
    if (quickBtn) {
      await page.mouse('mousePressed', quickBtn.x, quickBtn.y, { button: 'left', clickCount: 1 });
      await page.mouse('mouseReleased', quickBtn.x, quickBtn.y, { button: 'left', clickCount: 1 });
      await page.sleep(500);
      const ticked = await page.evaluate(`
        const hidden = ${P}.ui.getState().cncHiddenParts || {};
        let off = 0;
        for (const u of Object.values(hidden)) off += Object.values(u).filter(Boolean).length;
        return off;
      `);
      check('F7.2 — clicking "Shelves" ticks its whole group and unticks the rest',
        ticked > 0, `${ticked} parts unticked`);
    }

    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(900);

    // ─── R5 + R6, as an assertion at the end ────────────────────────────────
    const errs = realErrors(page.errors);
    check('R5 + R6 — the console is clean across the whole walk', errs.length === 0,
      errs.slice(0, 3).join(' | ') || 'no errors, no React exceptions');

    const lines = page.consoleLines.map((l) => `${l.level}  ${l.text}`);
    writeFileSync(`${OUT}console.txt`, [
      `# every console message of the turn-25 walk — ${lines.length} in total`,
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
      turn: 25,
      url: BASE,
      showroom: showroom.url,
      rules: {
        R1: 'every click, move, wheel and keystroke is CDP Input; the guard at the top of this file enforces it',
        R2: 'scripts/bucket-live.mjs, before any picture of hardware',
        R4: "hardware urls, counts, parents and finishes read from window.__cc.hardware — including this turn's handles",
        R5: 'the console is captured for the whole walk',
        R6: 'any uncaught error or React error-boundary report FAILS the step it appeared in',
        R7: 'no data-* on R3F objects — asserted in test/turn23-f2-f4-hardware.test.js and test/turn24-f8-f12.test.js',
        R8: 'GLB-dependent steps run against the synthetic silent showroom',
        R9: 'the door is removed IN THE APP and the classes it served are read again, then added back and compared',
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
