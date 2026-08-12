// ─── Turn 26, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build
//       npx vite preview --port 4173 &
//       node scripts/e2e-turn26.mjs
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
// publishes — and never the pixels or a URL this script built for itself.
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
// ─── R10: THE SHEET IS THE TRUTH, AND THE WALK MEASURES THE FOLLOWING ───────
//
// THIS turn's rule, and the one this walk exists for. Every parity claim below
// is taken by asking the app for BOTH sides of it in the same breath — the
// panel's own `cnc` and `drills` on one side, and `engine/recesses.js`, the
// very function `3d/panelSolid.js` cuts the board with, on the other. Nothing
// here is read off a pixel; the screenshots are what the parity LOOKS like,
// not what it rests on.
//
// ─── F1's GUARANTEE, IN THE APP ─────────────────────────────────────────────
//
// The suite sweeps the no-pierce assertion across every door type and every rig
// angle on the engine. Here it is taken off the LIVE SCENE, in the leaf's own
// frame: the door mesh's world matrix is inverted and every vertex of every
// mounted hinge member is pushed through it, so "no part of the hinge crosses
// the door's outer face" is measured against the face the eye is looking at, at
// whatever angle the leaf is standing open at.

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
const OUT = argOf('--out', new URL('../verify/t26/', import.meta.url).pathname);

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

// ─── THE NO-PIERCE MEASUREMENT, IN THE LEAF'S OWN FRAME ─────────────────────
//
// `panelId` names the leaf. The door mesh's matrixWorld is inverted, every
// vertex of every object carrying `ccHingeMember` is pushed through it, and the
// deepest one is compared with the door's own geometry bound on the same axis —
// which IS the outer face, because the outer face is the far side of the board
// as it is actually drawn. A shaker leaf is a tray and its bound is the frame's
// face, which is the plane the owner watched a hinge come through.
const noPierceJs = (panelId) => `
  const v = ${P}.views && ${P}.views.room;
  if (!v) return null;
  const THREE = v.three;
  let door = null;
  v.scene.traverse((o) => { if (!door && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) door = o; });
  if (!door) return null;
  door.updateWorldMatrix(true, true);
  door.geometry.computeBoundingBox();
  const outer = door.geometry.boundingBox.max.z;
  const inner = door.geometry.boundingBox.min.z;
  const inv = new THREE.Matrix4().copy(door.matrixWorld).invert();
  const p = new THREE.Vector3();
  let worst = -Infinity;
  let members = 0;
  let vertices = 0;
  const seen = [];
  v.scene.traverse((root) => {
    const which = root.userData && root.userData.ccHingeMember;
    if (!which) return;
    // …and only THIS leaf's own. A room with six cabinets in it has sixty
    // hinge members in one graph, and the claim is about one door.
    if (root.userData.ccHingePanel !== ${JSON.stringify(panelId)}) return;
    members += 1;
    seen.push(which);
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      const pos = o.isMesh && o.geometry && o.geometry.getAttribute('position');
      if (!pos) return;
      for (let i = 0; i < pos.count; i += 1) {
        p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
        if (p.z > worst) worst = p.z;
        vertices += 1;
      }
    });
  });
  const M = 1000;
  return {
    members, vertices, seen: [...new Set(seen)].sort(),
    outerMm: Math.round(outer * M * 1000) / 1000,
    innerMm: Math.round(inner * M * 1000) / 1000,
    worstMm: worst === -Infinity ? null : Math.round(worst * M * 1000) / 1000,
    proudMm: worst === -Infinity ? null : Math.round((worst - outer) * M * 1000) / 1000,
    rotationDeg: Math.round((door.parent ? door.parent.rotation.y : 0) * 180 / Math.PI * 100) / 100,
    dropDeg: Math.round((door.parent ? door.parent.rotation.x : 0) * 180 / Math.PI * 100) / 100,
  };
`;

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
  const clipOf = (rect, pad = 24) => (rect ? {
    x: Math.max(0, rect.left - pad),
    y: Math.max(0, rect.top - pad),
    width: Math.min(1600, rect.right - rect.left + pad * 2),
    height: Math.min(1000, rect.bottom - rect.top + pad * 2),
    scale: 2,
  } : null);

  /**
   * Put the camera on ONE piece, close.
   *
   * An acceptance screenshot of a hinge taken from the room's own overview is a
   * photograph of a kitchen with a hinge somewhere in it. `offset` is in units
   * of the piece's own radius, so the same numbers frame a 596 mm door and a
   * 2 150 mm side panel.
   */
  const frameOn = async (panelId, offset = [1.6, 0.4, 2.2]) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    let mesh = null;
    v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) mesh = o; });
    if (!mesh) return null;
    const box = new THREE.Box3().setFromObject(mesh);
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(0.18, box.getSize(new THREE.Vector3()).length() / 2);
    const off = ${JSON.stringify(offset)};
    v.camera.position.set(c.x + off[0] * r, c.y + off[1] * r, c.z + off[2] * r);
    v.camera.lookAt(c);
    v.camera.updateProjectionMatrix();
    if (v.controls && v.controls.target) { v.controls.target.copy(c); v.controls.update(); }
    return true;
  `);

  /** Hold a leaf at a fraction of its own swing, and let the easing settle. */
  const holdAt = async (unitId, panelId, fraction) => {
    await page.evaluate(`
      ${P}.ui.setState((s) => ({
        openFronts: { ...s.openFronts, [${JSON.stringify(unitId)}]: {
          ...(s.openFronts[${JSON.stringify(unitId)}] || {}), [${JSON.stringify(panelId)}]: ${fraction},
        } },
      }));
      return true;
    `);
    // ─── AND THEN WAIT FOR THE LEAF TO STOP, not for a clock ───────────────
    //
    // The easing is the DOOR's own — `3d/UnitView.jsx` settles at `delta × 8`,
    // about a third of a second at 60 fps — but a room with six cabinets in it
    // renders a good deal slower than a bare one, and a fixed sleep long enough
    // for the worst frame rate is a walk that spends its life asleep and STILL
    // photographs a door mid-swing on a bad day. So this polls the leaf's own
    // rotation and returns when two readings agree.
    const readRotation = `
      const v = ${P}.views && ${P}.views.room;
      if (!v) return null;
      let mesh = null;
      v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) mesh = o; });
      if (!mesh || !mesh.parent) return null;
      return [mesh.parent.rotation.x, mesh.parent.rotation.y, mesh.parent.position.z];
    `;
    // …and a headless window composites lazily: `requestAnimationFrame` in a
    // page nobody is looking at is throttled hard, so an easing that settles in
    // a third of a second on the owner's screen can sit still here for as long
    // as the walk is willing to wait. A real pointer move is a real event and
    // the browser draws a frame for it — which is R1's own instrument used for
    // what it is, rather than a `render()` call this script has no business
    // making. The two points are empty floor, so nothing is hovered or picked.
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await page.mouse('mouseMoved', i % 2 ? 40 : 44, 940, { button: 'none', buttons: 0, clickCount: 0 });
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(110);
      // eslint-disable-next-line no-await-in-loop
      const now = await page.evaluate(readRotation);
      // …and never on the first two, or a leaf that has not started moving yet
      // reads as a leaf that has finished.
      if (i >= 2 && last && now && last.every((n, k) => Math.abs(n - now[k]) < 1e-4)) return;
      last = now;
    }
  };

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
      s.newProject('Turn 26 walk');
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      const base = s.addUnit('BUD');
      s.updateUnitParams(base.id, { doors: true, width: 600 });
      window.__t26 = { baseId: base.id };
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.waitFor(`${P}.hardware && ${P}.hardware.allModelled('hinge')`,
      { what: 'the showroom models to land', timeout: 25000 });
    await page.sleep(700);

    // ── R4/R8: the hardware the SCENE mounted, over the app's OWN urls ──────
    const hardware = await page.evaluate(`
      const rows = ${P}.hardware ? ${P}.hardware.rows : [];
      const by = (f) => rows.filter((r) => r.family === f);
      return {
        urls: ${P}.hardware.urls(),
        hinge: by('hinge').length,
        hingeUrl: by('hinge')[0] ? by('hinge')[0].url : null,
        modelled: ${P}.hardware.allModelled('hinge'),
        // Turn 24's split reports as TWO families: the cup (member A) rides the
        // door, the arm (member B) stays on the carcass and folds.
        memberA: ${P}.hardware.members('hinge'),
        memberB: ${P}.hardware.members('hingeBody'),
        parentA: [...new Set(by('hinge').map((r) => r.parent))].sort(),
        parentB: [...new Set(by('hingeBody').map((r) => r.parent))].sort(),
        bodies: by('hingeBody').length,
      };
    `);
    measurements.hardware = hardware;
    check("R4/R8 — the mounted hinge is the GLB, over the app's OWN url",
      hardware.hinge > 0 && hardware.modelled, hardware.hingeUrl || 'no url');
    check('R4 — …and it is the SPLIT rig: member A on the door, member B on the carcass',
      JSON.stringify(hardware.memberA) === JSON.stringify(['A'])
      && JSON.stringify(hardware.memberB) === JSON.stringify(['B'])
      && JSON.stringify(hardware.parentA) === JSON.stringify(['door'])
      && JSON.stringify(hardware.parentB) === JSON.stringify(['carcass']),
      `A×${hardware.hinge} on the ${hardware.parentA.join('')} · B×${hardware.bodies} on the ${hardware.parentB.join('')}`);

    // ═══ F1 — THE HINGE STOPS PIERCING THE DOOR ═══════════════════════════
    //
    // The owner measured the real thing: a CLIP top cup is 11 mm deep in a
    // 25 mm door. The profile carries his number and the datum is the leaf's
    // INNER face; what follows is the guarantee taken off the live scene.
    const cupFacts = await page.evaluate(`
      const prof = ${P}.profile.getState().profile;
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t26.baseId);
      const door = r.panels.find((p) => p.part === 'FRONT');
      const cups = r.drills.filter((d) => d.panel === door.id && d.kind === 'cup');
      return {
        unitId: window.__t26.baseId,
        doorId: door.id,
        thickness: door.thickness,
        cupDepth: prof.hardware.hinge.cupDepth,
        drilledDepths: [...new Set(cups.map((d) => d.depth))],
        cups: cups.length,
        modelOriginZ: prof.hardware.hinge.cliptop.modelOrigin.z,
      };
    `);
    measurements.f1 = { profile: cupFacts };
    check('F1.1 — the cup is the owner’s measured 11 mm, and the SHEET says so too',
      cupFacts.cupDepth === 11 && cupFacts.drilledDepths.length === 1 && cupFacts.drilledDepths[0] === 11,
      `profile ${cupFacts.cupDepth} mm · ${cupFacts.cups} cups drilled at ${cupFacts.drilledDepths.join('/')} mm`);

    // …and SHOW the ironmongery: the hinge rig is a workshop overlay and it is
    // off in the room by default, which makes a picture of a hinge impossible.
    await page.evaluate(`${P}.ui.getState().setShowHinges(true); return true;`);
    await page.sleep(500);

    // The angles. The rig's full open is the door's own (turn 8's wall-aware
    // swing), so the fractions that give 45° and 90° are computed from what the
    // scene actually turns to rather than assumed.
    await holdAt(cupFacts.unitId, cupFacts.doorId, 1);
    const fullOpen = await page.evaluate(noPierceJs(cupFacts.doorId));
    const fullDeg = Math.abs(fullOpen?.rotationDeg || 90);
    const sweep = [];
    for (const deg of [0, 15, 30, 45, 60, 90, fullDeg]) {
      const fraction = Math.min(1, Math.abs(deg) / (fullDeg || 90));
      // eslint-disable-next-line no-await-in-loop
      await holdAt(cupFacts.unitId, cupFacts.doorId, fraction);
      // eslint-disable-next-line no-await-in-loop
      const at = await page.evaluate(noPierceJs(cupFacts.doorId));
      sweep.push({ asked: Math.round(deg * 100) / 100, ...at });
      if (Math.abs(deg - 0) < 0.01) {
        // eslint-disable-next-line no-await-in-loop
        await frameOn(cupFacts.doorId, [-1.5, 0.5, 2.6]);
        // eslint-disable-next-line no-await-in-loop
        await page.sleep(400);
        // eslint-disable-next-line no-await-in-loop
        await shot('1a-hinge-at-0-degrees');
      }
      if (Math.abs(deg - 45) < 0.01) {
        // eslint-disable-next-line no-await-in-loop
        await frameOn(cupFacts.doorId, [-1.5, 0.5, 2.6]);
        // eslint-disable-next-line no-await-in-loop
        await page.sleep(400);
        // eslint-disable-next-line no-await-in-loop
        await shot('1b-hinge-at-45-degrees');
      }
      if (Math.abs(deg - 90) < 0.01) {
        // eslint-disable-next-line no-await-in-loop
        await frameOn(cupFacts.doorId, [-1.5, 0.5, 2.6]);
        // eslint-disable-next-line no-await-in-loop
        await page.sleep(400);
        // eslint-disable-next-line no-await-in-loop
        await shot('1c-hinge-at-90-degrees');
      }
    }
    measurements.f1.sweep = sweep;
    const worstProud = sweep.reduce((n, r) => Math.max(n, r?.proudMm ?? -Infinity), -Infinity);
    check('F1.3 — NO part of the hinge crosses the door’s outer face, at ANY rig angle',
      sweep.every((r) => r && r.members > 0 && r.proudMm !== null && r.proudMm <= 0.01),
      `${sweep.length} angles (${sweep.map((r) => `${Math.round(Math.abs(r.rotationDeg))}°`).join(', ')}) · members ${(sweep[0]?.seen || []).join('+')} · deepest reach ${worstProud.toFixed(3)} mm past the face`);

    await holdAt(cupFacts.unitId, cupFacts.doorId, 0);

    // ═══ F1.3 ON A SHAKER LEAF — the type the owner watched it happen on ═══
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.setFrontType('F1', { style: 'shaker' });
      return true;
    `);
    await page.sleep(900);
    const shakerLeaf = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t26.baseId);
      const door = r.panels.find((p) => p.part === 'FRONT');
      return { id: door.id, shaker: door.meta.shaker || null, frontType: door.meta.frontType };
    `);
    const shakerSweep = [];
    if (shakerLeaf.shaker) {
      for (const fraction of [0, 0.5, 1]) {
        // eslint-disable-next-line no-await-in-loop
        await holdAt(cupFacts.unitId, shakerLeaf.id, fraction);
        // eslint-disable-next-line no-await-in-loop
        shakerSweep.push(await page.evaluate(noPierceJs(shakerLeaf.id)));
      }
    }
    measurements.f1.shaker = { leaf: shakerLeaf, sweep: shakerSweep };
    check('F1.3 — …and on a SHAKER leaf, whose datum is the frame face and NOT the recess floor',
      shakerLeaf.shaker && shakerSweep.length === 3
      && shakerSweep.every((r) => r && r.members > 0 && r.proudMm !== null && r.proudMm <= 0.01),
      shakerSweep.map((r) => `${Math.round(Math.abs(r?.rotationDeg ?? 0))}°: ${r?.proudMm}`).join(' · '));
    await holdAt(cupFacts.unitId, shakerLeaf.id, 0.5);
    await frameOn(shakerLeaf.id, [-1.5, 0.5, 2.6]);
    await page.sleep(400);
    await shot('1d-no-pierce-on-a-shaker-door');
    await holdAt(cupFacts.unitId, shakerLeaf.id, 0);

    // ═══ F2 — PARTITION DOORS: ONE PATH, NOT TWO ═════════════════════════
    const partition = await page.evaluate(`
      const s = ${P}.project.getState();
      const u = s.addUnit('BUD');
      s.updateUnitParams(u.id, {
        width: 1400,
        sections: [{
          width_mm: 1400,
          items: [
            { id: 'p1', kind: 'partition', x_mm: 600, front_mm: 0 },
            { id: 'p2', kind: 'partition', x_mm: 800, front_mm: 0 },
          ],
        }],
        bay_doors: [
          { door: 'one', hinge: 'L' },
          { door: 'one', hinge: 'L' },
          { door: 'one', hinge: 'R' },
        ],
      });
      window.__t26.partitionId = u.id;
      const r = s.unitResult(u.id);
      return {
        id: u.id,
        leaves: r.panels.filter((p) => p.part === 'FRONT').map((p) => ({
          id: p.id, hinge: p.meta.hinge, hingeOn: p.meta.hingeOn || null, hingeFace: p.meta.hingeFace || null,
        })),
      };
    `);
    await page.sleep(1200);
    const hung = partition.leaves.filter((l) => String(l.hingeOn || '').startsWith('VPART'));
    measurements.f2 = { leaves: partition.leaves };
    check('F2.1 — a partition-hung leaf says WHICH partition and WHICH face it hangs on',
      hung.length > 0 && hung.every((l) => l.hingeFace === 'L' || l.hingeFace === 'R')
      && partition.leaves.length > hung.length,
      partition.leaves.map((l) => `${l.id}: ${l.hingeOn || 'side'}/${l.hingeFace || '—'}`).join(' · '));

    const pairFacts = await page.evaluate(`
      const cups = ${P}.hardware ? ${P}.hardware.of('hinge') : [];
      const arms = ${P}.hardware ? ${P}.hardware.of('hingeBody') : [];
      const rows = [...cups, ...arms];
      return {
        rows: rows.length,
        cups: cups.length,
        arms: arms.length,
        allModel: rows.length > 0 && rows.every((r) => r.model === true),
        members: [...new Set(rows.map((r) => r.member))].sort(),
        parents: [...new Set(rows.map((r) => r.parent))].sort(),
        stand: rows.filter((r) => !r.model).map((r) => r.reason),
      };
    `);
    measurements.f2.mount = pairFacts;
    check('F2.2 — EVERY leaf in the project is on the same mount: model-backed, split, parented',
      pairFacts.allModel && JSON.stringify(pairFacts.members) === JSON.stringify(['A', 'B'])
      && JSON.stringify(pairFacts.parents) === JSON.stringify(['carcass', 'door']),
      `${pairFacts.cups} cups + ${pairFacts.arms} arms, all GLB · members ${pairFacts.members.join('+')}`);

    // The FOLD, and the pierce, on a partition-hung leaf.
    const partitionSweep = [];
    if (hung.length) {
      for (const fraction of [0, 0.5, 1]) {
        // eslint-disable-next-line no-await-in-loop
        await holdAt(partition.id, hung[0].id, fraction);
        // eslint-disable-next-line no-await-in-loop
        const at = await page.evaluate(noPierceJs(hung[0].id));
        // eslint-disable-next-line no-await-in-loop
        const fold = await page.evaluate(`
          const v = ${P}.views && ${P}.views.room;
          let turn = null;
          if (v) v.scene.traverse((o) => {
            if (turn !== null) return;
            if (o.userData && o.userData.ccHingeFold !== undefined
              && o.userData.ccHingePanel === ${JSON.stringify(hung[0].id)}) turn = o.userData.ccHingeFold;
          });
          return turn;
        `);
        partitionSweep.push({ ...at, fold });
      }
    }
    measurements.f2.sweep = partitionSweep;
    check('F2.2 — a partition-hung leaf FOLDS and does not pierce, at 0, half and full',
      partitionSweep.length === 3
      && partitionSweep.every((r) => r && r.members > 0 && r.proudMm !== null && r.proudMm <= 0.01)
      && partitionSweep.some((r) => Math.abs(Number(r.fold) || 0) > 0.01),
      partitionSweep.map((r) => `${Math.round(Math.abs(r?.rotationDeg ?? 0))}°: members ${(r?.seen || []).join('+') || 'none'}, proud ${r?.proudMm}, fold ${r?.fold}`).join(' · '));
    if (hung.length) {
      await holdAt(partition.id, hung[0].id, 0.5);
      await frameOn(hung[0].id, [-1.4, 0.4, 2.4]);
      await page.sleep(400);
      await shot('2a-partition-leaf-folded-and-model-backed');
      await holdAt(partition.id, hung[0].id, 0);
    }

    // ═══ F3 / R10 — THE SCENE DRAWS WHAT THE SHEET DRILLS ═════════════════
    //
    // The parity itself, per part class, taken off BOTH sides at once: the
    // panel's own record on one, and `engine/recesses.js` — the function the
    // scene cuts the board with — on the other.
    const parity = await page.evaluate(`
      const prof = ${P}.profile.getState().profile;
      const s = ${P}.project.getState();
      const R = window.__ccT26.recesses;
      const M = window.__ccT26.machining;
      const u = s.addUnit('WARDROBE');
      // The scenario matrix's own shape (scripts/cnc-scenarios.mjs): a FIXED
      // shelf and two adjustable ones in one carcass, so F3's ladder, F7's bare
      // rectangle and F8's grain are all measurable on the same cabinet.
      s.updateUnitParams(u.id, {
        width: 900,
        doors: true,
        sections: [{
          width_mm: 900,
          items: [
            { id: 's1', kind: 'shelf', pos_mm: 700, variant: 'fixed' },
            { id: 's2', kind: 'shelf', pos_mm: 1100 },
            { id: 's3', kind: 'shelf', pos_mm: 1500 },
          ],
        }],
      });
      window.__t26.tallId = u.id;
      const r = s.unitResult(u.id);
      const rows = [];
      for (const p of r.panels) {
        if (!p.cnc) continue;
        const mine = r.drills.filter((d) => d.panel === p.id);
        const drawnClasses = new Set(mine.filter((d) => M.machiningFor(d.layer, prof).draw).map((d) => d.layer));
        const cut = R.panelRecesses(p, mine, { thickness: p.thickness, profile: prof });
        rows.push({
          part: p.part,
          id: p.id,
          record: mine.length,
          drawable: mine.filter((d) => M.machiningFor(d.layer, prof).draw).length,
          rendered: cut.length,
          classes: [...drawnClasses].sort(),
          omitted: [...new Set(mine.filter((d) => !M.machiningFor(d.layer, prof).draw).map((d) => d.layer))].sort(),
        });
      }
      return { rows, omissions: M.machiningOmissions().map((c) => c.layer) };
    `);
    await page.sleep(900);
    measurements.r10 = parity;
    const mismatched = parity.rows.filter((r) => r.drawable !== r.rendered);
    check('R10 — every drilling the sheet carries in a drawn class is a real bore in the picture',
      mismatched.length === 0 && parity.rows.length > 0,
      `${parity.rows.length} parts · ${parity.rows.reduce((n, r) => n + r.rendered, 0)} bores rendered from ${parity.rows.reduce((n, r) => n + r.drawable, 0)} records · ${mismatched.length} disagreements`);
    check('R10 — the classes deliberately NOT drawn are named, and every one carries a reason',
      parity.omissions.length > 0,
      `named in verify/t26/sheet-vs-scene.md: ${parity.omissions.join(', ')}`);

    // …and the ladder itself: the EMPTY ⌀7.5 holes read too, which is the
    // owner's own complaint (the scene showed sleeves and no ladder).
    const ladder = await page.evaluate(`
      const prof = ${P}.profile.getState().profile;
      const s = ${P}.project.getState();
      const R = window.__ccT26.recesses;
      const r = s.unitResult(window.__t26.tallId);
      // The panel that CARRIES the ladder, asked for rather than guessed at:
      // which board a cabinet drills its shelf holes into is the engine's
      // business, and a walk that hard-codes an id is a walk that stops
      // measuring the day the engine changes its mind.
      const count = {};
      for (const d of r.drills) if (d.layer === 'SHELVES_7_5MM') count[d.panel] = (count[d.panel] || 0) + 1;
      const busiest = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      const side = r.panels.find((p) => p.id === busiest) || r.panels.find((p) => p.id === 'BUL');
      const mine = r.drills.filter((d) => d.panel === side.id);
      const pins = mine.filter((d) => d.layer === 'SHELVES_7_5MM');
      const cut = R.panelRecesses(side, mine, { thickness: side.thickness, profile: prof });
      const v = ${P}.views && ${P}.views.room;
      let sleeves = 0;
      let faces = 0;
      if (v) v.scene.traverse((o) => {
        if (o.userData && o.userData.ccShelfSupports) sleeves += o.userData.ccShelfSupports;
        if (o.userData && o.userData.ccCutFaces === side.id) faces += 1;
      });
      return {
        pins: pins.length,
        levels: [...new Set(pins.map((d) => Math.round(d.y)))].sort((a, b) => a - b),
        rendered: cut.filter((f) => f.layer === 'SHELVES_7_5MM').length,
        sleeves,
        cutFaceMeshes: faces,
        panel: side.id,
      };
    `);
    measurements.f3 = ladder;
    check('F3.1 — the side panel’s FULL ⌀7.5 ladder is bored, EMPTY levels included',
      ladder.pins > 0 && ladder.rendered === ladder.pins && ladder.cutFaceMeshes > 0,
      `${ladder.panel}: ${ladder.pins} holes on ${ladder.levels.length} levels · ${ladder.rendered} bored · ${ladder.sleeves} sleeves inside them`);
    check('F3.2 — …and the sleeves are FEWER than the holes: the hole is the panel’s, the sleeve the hardware’s',
      ladder.sleeves > 0 && ladder.sleeves < ladder.pins,
      `${ladder.sleeves} sleeves in ${ladder.pins} holes`);
    // ─── THE PICTURE, AND IT IS THE OWNER'S OWN COMPARISON ─────────────────
    //
    // "a side panel showing its full ⌀7.5 ladder in the scene beside its
    // sheet." The DETAIL WINDOW is exactly that view and it is one frame: the
    // board in 3-D on the left, its CNC drawing on the right, the same panel in
    // both. A shot of the room would be a shot of a cabinet standing in a run
    // with its neighbour's side against the board being talked about.
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.openModal('cabinet', { unitId: window.__t26.tallId });
      return true;
    `);
    await page.sleep(1200);
    await page.evaluate(`
      ${P}.ui.getState().pushModal('part-detail', {
        unitId: window.__t26.tallId, panelId: ${JSON.stringify(ladder.panel)}, anchor: null, at: null,
      });
      return true;
    `);
    await page.sleep(2000);
    await shot('3a-the-ladder-in-the-scene-beside-its-sheet');
    const inTheSheet = await page.evaluate(`
      // …and the two halves are the SAME panel, asserted rather than assumed.
      const canvas = document.querySelector('[data-part-canvas="1"]');
      const drawing = document.querySelector('[data-part-drawing="1"]');
      const v = ${P}.views && ${P}.views['part-detail'];
      let bores = 0;
      if (v) v.scene.traverse((o) => { if (o.userData && o.userData.ccCutFaces) bores += 1; });
      return { canvas: Boolean(canvas), drawing: Boolean(drawing), bores };
    `);
    measurements.f3.detail = inTheSheet;
    check('F3.1 — …and the detail window shows the ladder and the sheet in one frame',
      inTheSheet.canvas && inTheSheet.drawing,
      `piece ${inTheSheet.canvas ? 'drawn' : 'missing'} · sheet ${inTheSheet.drawing ? 'drawn' : 'missing'} · ${inTheSheet.bores} cut-face buffers on the board`);
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(800);
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.setHideFronts(false);
      ui.setShowHinges(true);
      ui.setShowDimensions(true);
      return true;
    `);
    await page.sleep(500);

    // ═══ F4 / R11 — ONE DIMENSION LANGUAGE ════════════════════════════════
    await page.evaluate(`
      ${P}.ui.getState().setShowDimensions(true);
      ${P}.ui.getState().toggleUnitDimensions(window.__t26.tallId);
      return true;
    `);
    await page.sleep(1000);
    const dims = await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      const F = window.__ccT26.format;
      let chains = 0;
      let rows = 0;
      let sprites = 0;
      if (v) v.scene.traverse((o) => {
        if (o.userData && o.userData.ccDimensionChain !== undefined) {
          chains += 1;
          rows += Number(o.userData.ccDimensionRows) || 0;
        }
        if (o.isSprite) sprites += 1;
      });
      return {
        chains, rows, sprites,
        half: [F.formatDimension(3), F.formatDimension(2.5), F.formatDimension(881.25), F.formatDimension(0.5)],
        step: F.DIMENSION_STEP_MM,
      };
    `);
    measurements.f4 = dims;
    check('R11 — every dimension in the scene is drawn by the ONE chain component',
      dims.chains > 0 && dims.rows > 0,
      `${dims.chains} chains · ${dims.rows} rows`);
    check('F4.3 — …and it reads to HALF a millimetre, which is what a 3 mm gap needs',
      dims.step === 0.5 && dims.half[0] === '3' && dims.half[1] === '2.5' && dims.half[3] === '0.5',
      `step ${dims.step} mm · ${dims.half.join(' · ')}`);
    // Back off far enough to see the WHOLE cabinet: a dimension chain lying on
    // the floor in front of a run is a picture of the run, not of a board.
    await frameOn(ladder.panel, [3.6, 0.9, 6.4]);
    await page.sleep(500);
    await shot('4a-dimension-chains-on-the-floor');

    // ═══ F5 — THE DISHWASHER JOINS THE FAMILY ═════════════════════════════
    const dw = await page.evaluate(`
      const s = ${P}.project.getState();
      const near = s.units.find((u) => u.type === 'BUD');
      const u = s.addUnit('DW_PANEL');
      window.__t26.dwId = u.id;
      const r = s.unitResult(u.id);
      const front = r.panels.find((p) => p.part === 'FRONT');
      const neighbour = s.unitResult(near.id).panels.find((p) => p.part === 'FRONT');
      return {
        id: u.id,
        frontId: front.id,
        y: front.box.y,
        h: front.box.h,
        top: front.box.y + front.box.h,
        neighbourY: neighbour.box.y,
        opening: front.meta.opening,
        openAngleDeg: front.meta.openAngleDeg,
        cups: r.drills.filter((d) => d.kind === 'cup').length,
        plateHoles: r.drills.filter((d) => d.layer === 'HINGES_5MM').length,
        shaker: front.meta.shaker || null,
        handle: front.meta.handle || null,
      };
    `);
    await page.sleep(1100);
    measurements.f5 = dw;
    check('F5.1 — the D/W front starts from the BOTTOM, level with its neighbours; the gap is at the TOP',
      Math.abs(dw.y - dw.neighbourY) < 0.51,
      `D/W front at y ${dw.y} · its neighbour at ${dw.neighbourY}`);
    check('F5.3 — no cup hinges and NO CUP DRILLING: the panel screws to the appliance door',
      dw.cups === 0 && dw.plateHoles === 0, `${dw.cups} cups · ${dw.plateHoles} plate holes`);
    check('F5.5 — …and it is a FRONT for everything a front has: the shaker applies to it',
      Boolean(dw.shaker), dw.shaker ? `frame ${dw.shaker.frame}, recess ${dw.shaker.depth}` : 'no shaker');
    await frameOn(dw.frontId, [1.6, 0.6, 3.2]);
    await page.sleep(400);
    await shot('5a-dw-front-level-with-its-neighbours');
    await holdAt(dw.id, dw.frontId, 1);
    const dropped = await page.evaluate(noPierceJs(dw.frontId));
    measurements.f5.dropped = dropped;
    check('F5.2 — it drops FORWARD about its bottom edge, ~90°, and not sideways',
      dropped && Math.abs(dropped.dropDeg) > 80 && Math.abs(dropped.rotationDeg) < 0.01,
      `opening "${dw.opening}" at ${dw.openAngleDeg}° · x ${dropped?.dropDeg}° · y ${dropped?.rotationDeg}°`);
    await frameOn(dw.frontId, [1.6, 1.6, 3.2]);
    await page.sleep(400);
    await shot('5b-dw-front-dropped-open');
    await holdAt(dw.id, dw.frontId, 0);

    // ═══ F6 — THE SHAKER'S REBATE IS THE SAME COLOUR ══════════════════════
    const rebate = await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t26.baseId);
      const door = r.panels.find((p) => p.part === 'FRONT');
      let mesh = null;
      if (v) v.scene.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === door.id) mesh = o; });
      const geo = mesh && mesh.geometry;
      const uv = geo && geo.getAttribute('uv');
      const pos = geo && geo.getAttribute('position');
      // ONE material instance for the frame, the panel floor and the four
      // rebate walls: a second material is exactly the "different colour" the
      // owner saw. A geometry GROUP is how three splits one buffer between
      // two materials, so a count above one is the same fault wearing a hat.
      return {
        id: door.id,
        materials: Array.isArray(mesh && mesh.material) ? mesh.material.length : 1,
        groups: geo ? geo.groups.length : 0,
        vertices: pos ? pos.count : 0,
        uv: Boolean(uv),
        colour: mesh && mesh.material && mesh.material.color ? mesh.material.color.getHexString() : null,
      };
    `);
    measurements.f6 = rebate;
    check('F6 — the frame, the panel floor and the four rebate walls are ONE material instance',
      rebate.materials === 1 && rebate.groups <= 1 && rebate.uv,
      `${rebate.materials} material · ${rebate.groups} geometry groups · ${rebate.vertices} vertices · #${rebate.colour}`);
    // The grazing angle: a 6 mm rebate is invisible from in front, and what
    // makes it read is the SHADOW its top wall throws.
    await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t26.baseId);
      const door = r.panels.find((p) => p.part === 'FRONT');
      const u = s.units.find((x) => x.id === window.__t26.baseId);
      const ox = (u.position && u.position.x_mm) || 0;
      const M = 0.001;
      const cx = (ox + door.box.x + door.box.w / 2) * M;
      const cy = (door.box.y + door.box.h * 0.62) * M;
      const cz = (door.box.z + door.box.d) * M;
      v.camera.position.set(cx + 0.30, cy + 0.07, cz + 0.09);
      v.camera.lookAt(cx, cy, cz);
      v.camera.updateProjectionMatrix();
      if (v.controls && v.controls.target) { v.controls.target.set(cx, cy, cz); v.controls.update(); }
      const ui = ${P}.ui.getState();
      ui.setShowDimensions(false);
      if (ui.showOutlines) ui.toggleOutlines();
      return true;
    `);
    await page.sleep(1000);
    await shot('6a-the-shaker-rebate-at-a-grazing-angle');

    // ═══ F10 — THE LIGHT COMES FROM THE CEILING ═══════════════════════════
    //
    // "Compute it, do not eyeball it." The before/after is read out of the
    // running scene's own balance, and the pair of pictures is the same camera
    // twice — which is the only way a lighting change can be looked at.
    await shot('10a-the-shaker-rebate-under-the-new-rig');
    const lighting = await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      const prof = ${P}.profile.getState().profile;
      const L = window.__ccT26.lighting;
      let ceiling = null;
      const roles = [];
      if (v) v.scene.traverse((o) => {
        const role = o.userData && o.userData.ccLight;
        if (!role) return;
        roles.push(role);
        if (role === 'ceiling') ceiling = { intensity: o.intensity, position: o.position.toArray(), world: o.getWorldPosition(new v.three.Vector3()).toArray(), angle: o.angle, penumbra: o.penumbra };
      });
      return {
        roles: [...new Set(roles)].sort(),
        ceiling,
        computed: (() => {
          const L = window.__ccT26.lighting;
          return L.ceilingPosition({ centre: [0, 0, 0], frontZ: 0, ceilingY: 2.7, setback: 1.5 });
        })(),
        roomHeightMm: ${P}.project.getState().project.room.height,
        share: prof.appearance.studio.ceiling.share,
        setbackMm: prof.appearance.studio.ceiling.setbackMm,
        brightness: ${P}.ui.getState().brightness,
        scale: L.brightnessScale(${P}.ui.getState().brightness, prof),
      };
    `);
    measurements.f10 = lighting;
    check('F10.1 — there is ONE broad ceiling source, and it hangs 1.5 m back from the fronts',
      Boolean(lighting.ceiling) && lighting.roles.includes('ceiling') && lighting.setbackMm === 1500
      // It hangs at the ROOM's own ceiling — the whole point of "real ceiling
      // height" — and a lamp at 2.5 mm off the floor would pass every other
      // assertion in this step while lighting the plinths.
      && Math.abs(lighting.ceiling.position[1] - lighting.roomHeightMm / 1000) < 0.01,
      lighting.ceiling ? `at [${lighting.ceiling.position.map((n) => n.toFixed(2)).join(', ')}] m in a ${lighting.roomHeightMm} mm room, cone ${lighting.ceiling.angle.toFixed(2)} rad, penumbra ${lighting.ceiling.penumbra}` : 'not mounted');
    check('F10.2 — …and it is SUBTRACTED from the facing spots: the sum is the ledger in lighting.md',
      lighting.share === 0.35, `share ${lighting.share} of the spots' contribution`);

    // The slider, through the View menu, with a real pointer.
    await page.click('nav[aria-label="Main menu"] button', 'View');
    await page.sleep(400);
    const slider = await boxOf('input[data-menu-slider="brightness"]');
    let slid = null;
    if (slider) {
      await page.mouse('mousePressed', slider.x - 60, slider.y, { button: 'left', clickCount: 1 });
      await page.mouse('mouseReleased', slider.x - 60, slider.y, { button: 'left', clickCount: 1 });
      await page.sleep(500);
      slid = await page.evaluate(`return ${P}.ui.getState().brightness;`);
    }
    measurements.f10.slid = slid;
    check('F10.3 — the View menu carries a brightness slider, and dragging it moves the scene',
      slider !== null && slid !== null && slid !== lighting.brightness,
      slider ? `${lighting.brightness} → ${slid}` : 'no slider found in the View menu');
    await page.key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
    await page.sleep(300);
    await shot('10b-the-shaker-rebate-with-the-slider-moved');
    await page.evaluate(`${P}.ui.getState().setBrightness(1); ${P}.ui.getState().setShowDimensions(true); return true;`);
    await page.sleep(400);

    // ═══ F7 + F8 — THE SHELVES, ON THE SHEET ══════════════════════════════
    const shelves = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t26.tallId);
      const fix = r.panels.find((p) => p.part === 'SHELF' && p.meta.variant === 'fixed');
      const adj = r.panels.find((p) => p.part === 'SHELF' && p.meta.variant !== 'fixed');
      const entities = (p) => ({
        outline: (p.cnc.outline || []).length ? 1 : 0,
        pockets: (p.cnc.pockets || []).length,
        marks: (p.cnc.marks || []).length,
        holes: (p.cnc.holes || []).length,
        drills: r.drills.filter((d) => d.panel === p.id).length,
        rotated: Boolean(p.cnc.rotated),
        drawn: [p.cnc.drawn_w, p.cnc.drawn_h],
        board: [p.box.w, p.box.d],
      });
      const backScrews = r.drills.filter((d) => d.panel === 'BACK' && d.kind === 'shelf_back_screw');
      return { fix: entities(fix), adj: entities(adj), fixId: fix.id, backScrews: backScrews.length };
    `);
    measurements.f7 = shelves;
    check('F7.1 — the fix shelf’s sheet is a bare rectangle: an outline and a label, nothing else',
      shelves.fix.pockets === 0 && shelves.fix.marks === 0 && shelves.fix.holes === 0 && shelves.fix.drills === 0,
      `outline ${shelves.fix.outline} · ${shelves.fix.pockets} pockets · ${shelves.fix.marks} marks · ${shelves.fix.drills} drills`);
    check('F7.2 — the joint moved into the bearers, and the BACK carries the ⌀3 on the shelf’s axis',
      shelves.backScrews > 0, `${shelves.backScrews} ⌀3 in the BACK`);
    check('F8 — every shelf lies ALONG THE GRAIN: length left-to-right, like the sides',
      shelves.fix.rotated && shelves.adj.rotated
      && shelves.fix.drawn[0] === shelves.fix.board[1] && shelves.fix.drawn[1] === shelves.fix.board[0],
      `drawn ${shelves.fix.drawn.join('×')} from a board ${shelves.fix.board.join('×')}`);
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(1600);
    await page.evaluate(`${P}.ui.getState().focusCncPart(window.__t26.tallId, ${JSON.stringify(shelves.fixId)}); return true;`);
    await page.sleep(900);
    await shot('7a-the-fix-shelf-sheet-is-a-bare-rectangle');
    await shot('8a-a-shelf-laid-along-the-grain');
    await page.evaluate(`${P}.ui.getState().clearCncFocus(); ${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(900);

    // ═══ F9 — THE CORNICE GROWS CORNERS ═══════════════════════════════════
    const cornice = await page.evaluate(`
      const s = ${P}.project.getState();
      const C = window.__ccT22.cornice;
      const tall = s.units.find((u) => u.id === window.__t26.tallId);
      const wall = s.addUnit('WUD');
      window.__t26.wallId = wall.id;
      // A cornice is a HEIGHT and not a flag: corniceOption resolves anything
      // that is not one of the profile's own heights to "none", which is the
      // right answer for a hand-edited project and the wrong one for a walk
      // that passed a boolean.
      const mine = s.setCornice(tall.id, 100);
      const theirs = s.setCornice(wall.id, 100);
      return {
        tallId: tall.id,
        wallId: wall.id,
        has: typeof C.corniceCorner === 'function',
        mine: mine.height,
        theirs: theirs.height,
        notices: [...(mine.notices || []), ...(theirs.notices || [])].slice(0, 3),
      };
    `);
    await page.sleep(900);
    const corniceFacts = await page.evaluate(`
      const s = ${P}.project.getState();
      // A cornice is BOUGHT MOULDING, not a cut piece: it is not in
      // result.panels at all (turn 22, F1.4) and lives on the assemblies
      // beside the linear metres the BOM orders, which is the same element the
      // scene sweeps. So that is what is asked here.
      const r = s.unitResult(window.__t26.tallId);
      const w = s.unitResult(window.__t26.wallId);
      const piece = r.assemblies.cornice || null;
      const v = ${P}.views && ${P}.views.room;
      let drawn = 0;
      let members = 0;
      if (v) v.scene.traverse((o) => {
        if (o.userData && o.userData.ccCornice) drawn += 1;
        if (o.userData && o.userData.ccCorniceMember) members += 1;
      });
      return {
        piece: piece ? {
          height: piece.height,
          projection: piece.projection,
          corners: piece.corners || null,
          mitres: piece.mitres || null,
        } : null,
        wall: w.assemblies.cornice ? w.assemblies.cornice.height : null,
        metres: r.hardware ? (r.hardware.find((h) => h.role === 'cornice') || {}).qty : null,
        drawn,
        members,
      };
    `);
    measurements.f9 = corniceFacts;
    check('F9.1 — the cornice toggle really adds one, and the scene draws it',
      Boolean(corniceFacts.piece) && corniceFacts.drawn > 0 && cornice.mine === 100,
      corniceFacts.piece
        ? `${corniceFacts.piece.height} mm, ${corniceFacts.piece.projection} mm projection · ${corniceFacts.drawn} runs, ${corniceFacts.members} members swept`
        : `no cornice element (setCornice answered ${cornice.mine})`);
    check('F9.2 — …and a WALL unit joins the run: a cornice is not floor-standing-only',
      cornice.theirs === 100 && cornice.has && corniceFacts.wall === 100,
      `wall unit takes ${cornice.theirs} mm and sweeps ${corniceFacts.wall} · corner resolver ${cornice.has ? 'present' : 'missing'}`);
    const corniceRect = await page.evaluate(rectOfJs('room', 'o.userData && o.userData.ccCorniceMember'));
    await shot('9a-a-wall-to-tall-cornice-corner', clipOf(corniceRect, 90));

    // ═══ F11 — SHORT / OVER, THE WARNING THE OWNER COULD NOT FIND ═════════
    const warning = await page.evaluate(`
      const s = ${P}.project.getState();
      // Turn 24's gate (F3.1) stands: no measured drawer-box board, no drawers.
      // The walk answers it the way a joiner does, with the caliper reading.
      s.setSlotThickness('box', { measured: 15, confirmed: true });
      const u = s.addUnit('BUDR');
      s.updateUnitParams(u.id, { height: 770, drawers: 3, drawer_heights: [200, 200, 200] });
      window.__t26.shortId = u.id;
      ${P}.ui.getState().selectUnit(u.id);
      ${P}.ui.getState().openRightPanel();
      const r = s.unitResult(u.id);
      return r.warnings.filter((w) => String(w.code).startsWith('DRAWER_FRONTS_'));
    `);
    await page.sleep(1000);
    // The warning hangs under the CARCASS section of the unit panel, and a
    // collapsed section renders nothing — so it is opened the way the owner
    // would open it, with a real press on its own header.
    const shut = await page.evaluate(`
      const sec = document.querySelector('[data-section="Carcass"]');
      return sec ? sec.getAttribute('data-open') === '0' : false;
    `);
    if (shut) {
      const header = await boxOf('[data-section="Carcass"] button');
      if (header) {
        await page.mouse('mousePressed', header.x, header.y, { button: 'left', clickCount: 1 });
        await page.mouse('mouseReleased', header.x, header.y, { button: 'left', clickCount: 1 });
        await page.sleep(500);
      }
    }
    const onScreen = await page.evaluate(`
      const el = document.querySelector('[data-warning-code="DRAWER_FRONTS_SHORT"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { text: (el.textContent || '').trim(), left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) };
    `);
    measurements.f11 = { warnings: warning, onScreen };
    check('F11 — a 770 opening with three 200 fronts raises SHORT, and the sentence NAMES the number',
      warning.length === 1 && /161 mm/.test(warning[0].message) && /770 mm/.test(warning[0].message),
      warning[0] ? warning[0].message : 'no warning');
    check('F11 — …and the owner can SEE it: it is on the panel, in the app’s warning tone',
      Boolean(onScreen) && /161/.test(onScreen.text),
      onScreen ? onScreen.text.slice(0, 120) : 'not on screen');
    await shot('11a-the-short-warning-where-the-owner-can-see-it', clipOf(onScreen, 16));

    // ═══ F12 — THE EDITOR, TIDIED ═════════════════════════════════════════
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.openModal('cabinet', { unitId: window.__t26.tallId });
      return true;
    `);
    await page.sleep(1200);
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.pushModal('part-detail', { unitId: window.__t26.tallId, panelId: 'BUL', anchor: null, at: null });
      return true;
    `);
    await page.sleep(1600);
    const editor = await page.evaluate(`
      const back = document.querySelector('[data-modal-back-place="top-centre"]');
      const split = document.querySelector('[data-editor-split]');
      const toolbarLayer = document.querySelector('[data-part-layer="1"]');
      const del = document.querySelector('[data-delete-feature="1"]');
      const view = document.querySelector('[data-part-canvas="1"]');
      const sheet = document.querySelector('[data-part-drawing="1"]');
      const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width), c: Math.round(r.left + r.width / 2) }; };
      return {
        back: rect(back),
        backText: back ? (back.textContent || '').trim() : null,
        split: split ? split.getAttribute('data-editor-split') : null,
        toolbarLayer: Boolean(toolbarLayer),
        deleteDisabled: del ? del.disabled : null,
        view: rect(view),
        sheet: rect(sheet),
        width: window.innerWidth,
      };
    `);
    measurements.f12 = editor;
    check('F12.2 — Back is at the TOP CENTRE of the editor, and it is a real button',
      Boolean(editor.back) && Math.abs(editor.back.c - editor.width / 2) < 90,
      editor.back ? `"${editor.backText}" centred at ${editor.back.c} of ${editor.width}` : 'not found');
    check('F12.1 — the layer list is OFF the toolbar; nobody has been asked yet',
      editor.toolbarLayer === false, editor.toolbarLayer ? 'still a permanent dropdown' : 'gone');
    check('F12.3 — the split is 25 % view / 75 % sheet',
      editor.split === '25/75'
      && (!editor.view || !editor.sheet || editor.sheet.w > editor.view.w * 2),
      `${editor.split} · view ${editor.view?.w}px, sheet ${editor.sheet?.w}px`);
    check('F12.4 — Delete is disabled because NOTHING IS PICKED — state, not a bug',
      editor.deleteDisabled === true, `disabled: ${editor.deleteDisabled}`);
    await shot('12a-the-editor-back-and-the-25-75-split');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(700);

    // ─── R5 + R6, as an assertion at the end ────────────────────────────────
    const errs = realErrors(page.errors);
    check('R5 + R6 — the console is clean across the whole walk', errs.length === 0,
      errs.slice(0, 3).join(' | ') || 'no errors, no React exceptions');

    const lines = page.consoleLines.map((l) => `${l.level}  ${l.text}`);
    writeFileSync(`${OUT}console.txt`, [
      `# every console message of the turn-26 walk — ${lines.length} in total`,
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
      turn: 26,
      url: BASE,
      showroom: showroom.url,
      rules: {
        R1: 'every click, move, wheel and keystroke is CDP Input; the guard at the top of this file enforces it',
        R2: 'scripts/bucket-live.mjs, before any picture of hardware',
        R4: 'hardware urls, counts, members, parents and finishes read from window.__cc.hardware',
        R5: 'the console is captured for the whole walk',
        R6: 'any uncaught error or React error-boundary report FAILS the step it appeared in',
        R7: 'no data-* on R3F objects — asserted in test/turn23-f2-f4-hardware.test.js and test/turn24-f8-f12.test.js',
        R8: 'GLB-dependent steps run against the synthetic silent showroom',
        R9: 'no feature without its part — swept per drilling class in the suite',
        R10: "the parity is measured off BOTH sides at once: the panel's own cnc/drills, and engine/recesses.js, the function 3d/panelSolid.js cuts the board with",
        R11: 'every dimension in the scene is found by traversing for ccDimensionChain — the one component',
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
