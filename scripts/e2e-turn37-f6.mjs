#!/usr/bin/env node
// ─── Turn 37, CLAUDE.md F6 — THE SHOE DRAWER'S OWN PROOF ───────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn37-f6.mjs [--out verify/t37/]
//
// Iron rule 6, verbatim: *"Every feature with a visible surface ships a
// `verify/t37/` screenshot with its named subject from real pointer input, or
// it is not done."* F6's visible surface is two millimetre numbers the owner
// measured with his eye, so this walk measures them with the scene's own
// meshes and then photographs what it measured:
//
//   · the DRAWER FRONT leaves 10 mm to BUL and 10 mm to BUR
//     — *"tak żeby zostało po prawej i po lewej od BUR i BUL około 10 mm"*;
//   · the BATTEN stops 30 mm short of the box front
//     — *"cofnij o około 30 mm do tyłu (skróć) ten klocek"*.
//
// ─── ON "CLOSED AND OPEN", AND WHY THE SECOND SHOT IS WHAT IT IS ───────────
//
// CLAUDE.md asks for "the drawer closed (10 mm reveals) and open". The first
// is shot below. The second cannot be shot as a slide: `engine/drawerMotion.js`
// travels the parts keyed on `meta.drawer`, which the shoe box has never
// carried — a shoe box does not animate in this app, and F6 adds no motion
// (*"Box, runners, drilling: unchanged"*). So OPEN is photographed as the
// thing the owner was actually ruling on when he said *"a i tak się otworzy"*:
// the doors swung out of the way, the batten visibly clear of the front, and
// the 30 mm of daylight it stepped back to give. Noted rather than skipped
// silently, which is the house grammar.
//
// Same rules as every walk since turn 5:
//   R1  REAL pointer input for anything interactive — CDP events, never
//       synthetic DOM events (the self-guard below enforces it).
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R6  a console error fails the step it happened in.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t37/', import.meta.url).pathname);

// R1's guard, and it is a guard rather than a promise.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const shots = [];
const P = 'window.__cc';

const IGNORED = [
  /favicon\.ico/i,
  /supabase\.co\/storage/i,
  // Chrome's own policy notice, not the app's fault and not an app error: a
  // page reloaded by the driver has had no user gesture, so the editor's
  // unsaved-work guard is refused a dialog. R6 exists to catch OUR faults.
  /beforeunload.*confirmation panel/i,
];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

async function main() {
  mkdirSync(OUT, { recursive: true });
  // Its OWN port. T37 runs its features as parallel agents (iron rule 6:
  // "parallel subagents where independent"), and 4174 is the shared walk's —
  // a second walk that grabs it takes the first one's showroom down with it.
  const showroom = await startFixtureServer({
    port: Number(process.env.E2E_FIXTURE_PORT) || 4176,
  });
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
  const shot = async (name, subject = null) => {
    let present = true;
    let detail = 'not asked';
    if (subject) {
      const seen = await page.evaluate(`
        const want = ${JSON.stringify(subject)};
        const out = {};
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
    await page.screenshot(`${OUT}${name}.png`);
    shots.push({ name, subject, present, detail });
    if (!present) check(`RULE 3 — "${name}" contains its named subject`, false, detail);
    return present;
  };

  /**
   * Stand the camera IN FRONT of a cabinet, inside the room, on a named piece.
   *
   * T34's own lesson, copied because it cost that walk two takes: offsetting
   * along the WORLD axes puts the lens through the wall a cabinet stands
   * against. A cabinet's local +z is its FRONT, so the lens goes along that.
   */
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
        box.expandByObject(o); mine += 1;
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

  /** One PANEL's world box, in millimetres — the LIVE-SCENE measure (T33). */
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

  /** A REAL click on a mesh, aimed at a VISIBLE point of it (R1). */
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
        (b.min.y + b.max.y) / 2,
        b.max.z - 0.002,
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

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);
  const ui = (expr) => page.evaluate(`const u = ${P}.ui.getState(); return (${expr});`);
  const measurements = {};

  try {
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    check('R8 — the app is pointed at the silent showroom', true, showroom.url);

    await store(`s.loadProject({
      id: null, name: 'T37 walk · F6 the shoe drawer', number: '37', client: 'the owner',
      room: { height: 2600, corners: [{x:0,y:0},{x:6000,y:0},{x:6000,y:3000},{x:0,y:3000}] },
      design: { projectType: 'wardrobe' },
    }, []) || true`);
    await ui('u.openEditor() || true');
    await page.sleep(600);
    await page.waitFor('document.querySelector(\'nav\')', { what: 'the editor chrome' });

    // ═══════════════════════════════════════════════════════════════════════
    // F6 — the batten steps back, the front covers it
    // ═══════════════════════════════════════════════════════════════════════
    const unitId = await store(`(() => {
      const { id } = s.addUnit('WARDROBE');
      s.updateUnitParams(id, { width: 900, height: 1400, doors: { count: 2 } });
      s.addShoeBox(id, { variant: 'D', dividers: 1 });
      return id;
    })()`);
    await page.sleep(700);

    const plan = await store(`s.unitResult(${JSON.stringify(unitId)}).assemblies.shoeBoxes[0]`);
    measurements.f6_plan = plan;
    check('F6 — a DRAWER shoe box, behind two hinged doors',
      plan && plan.variant === 'D' && plan.hinged.left && plan.hinged.right,
      JSON.stringify({ opening: plan && plan.openingW, boxW: plan && plan.boxW, depth: plan && plan.depth }));

    // ── the ENGINE's two numbers ──
    const cut = await store(`s.unitResult(${JSON.stringify(unitId)}).panels
      .filter((p) => p.id.startsWith('SHOE1-'))
      .map((p) => ({ id: p.id, part: p.part, w: p.w, h: p.h }))`);
    measurements.f6_cut_list = cut;
    const face = cut.find((p) => p.part === 'SHOEBOX-FR');
    const batten = cut.find((p) => p.part === 'SHOEBOX-BATTEN');
    check('F6 — the FRONT is cut at the opening less 2 × 10',
      face && face.w === plan.openingW - 20,
      `front ${face && face.w} vs opening ${plan.openingW}`);
    check('F6 — the BATTEN is cut at the box depth less 30',
      batten && batten.w === plan.depth - 30,
      `batten ${batten && batten.w} vs depth ${plan.depth}`);

    // ── the SCENE's two numbers: measured off the meshes, not the engine ──
    const bul = await panelBoxMm(unitId, 'BUL');
    const bur = await panelBoxMm(unitId, 'BUR');
    const fr = await panelBoxMm(unitId, 'SHOE1-FR');
    const bf = await panelBoxMm(unitId, 'SHOE1-BF');
    const bat = await panelBoxMm(unitId, 'SHOE1-BATTEN');
    measurements.f6_scene = { bul, bur, fr, bf, bat };

    const leftReveal = fr && bul ? fr.minX - bul.maxX : null;
    const rightReveal = fr && bur ? bur.minX - fr.maxX : null;
    check('F6 — IN THE SCENE: 10 mm of reveal to BUL and 10 mm to BUR',
      leftReveal !== null && Math.abs(leftReveal - 10) <= 1 && Math.abs(rightReveal - 10) <= 1,
      `left ${leftReveal} mm · right ${rightReveal} mm`);

    // The batten's front end against the BOX FRONT's outer face. Both are read
    // off the running scene, so this is the step-back a hand would feel for.
    const stepBack = bat && bf ? bf.maxZ - bat.maxZ : null;
    check('F6 — IN THE SCENE: the batten stops 30 mm short of the box front',
      stepBack !== null && Math.abs(stepBack - 30) <= 1,
      `${stepBack} mm of daylight in front of the batten`);
    check('F6 — …and its REAR still lands on the box back (it was SHORTENED, not moved)',
      bat && bf && Math.abs(bat.minZ - (bf.maxZ - plan.depth)) <= 1,
      `batten rear ${bat && bat.minZ} vs box back ${bf && bf.maxZ - plan.depth}`);

    // ── PROOF 1: the drawer CLOSED, with its 10 mm reveals ──
    await ui(`u.closeAllFronts(${JSON.stringify(unitId)}) || true`);
    const doors = await store(`s.unitResult(${JSON.stringify(unitId)}).panels
      .filter((p) => p.part === 'FRONT').map((p) => p.id)`);
    await ui(`u.openFrontsFor(${JSON.stringify(unitId)}, ${JSON.stringify(doors)}) || true`);
    await page.sleep(700);
    // Far enough back that BOTH carcass sides are in the frame — the reveal is
    // a gap between the face and BUL/BUR, and a photograph that crops one of
    // them proves nothing (R3 in spirit, not only in the mesh check).
    await frameFacing([unitId], { dist: 1.9, height: 0.42, target: 'SHOE1-FR' });
    await page.sleep(500);
    await shot('f6-the-drawer-front-closed-10mm-reveals-to-BUL-and-BUR',
      { mesh: 'SHOE1-FR' });

    // ── a REAL click on the face, so the walk has touched what it shot ──
    const clicked = await clickMesh(unitId, 'SHOE1-FR');
    await page.sleep(400);
    const selected = await ui('u.selectedElement && u.selectedElement.elementRef');
    check('R1 — a REAL pointer click lands on the widened face',
      clicked && selected === 'SHOE1-FR', `selectedElement.elementRef = ${selected}`);
    await shot('f6-the-widened-face-selected-by-a-real-click', { mesh: 'SHOE1-FR' });

    // ── PROOF 2: "…a i tak się otworzy" — the batten, clear of the front ──
    // Looking down into the open box from above the front: the batten's stub
    // ends short and the 30 mm it gave up is the daylight the door arc uses.
    await page.evaluate(`
      const v = ${P}.views.room;
      const THREE = v.three;
      v.scene.updateMatrixWorld(true);
      const b = new THREE.Box3();
      v.scene.traverse((g) => {
        if (!g.userData || g.userData.ccUnitId !== ${JSON.stringify(unitId)}) return;
        g.traverse((o) => {
          if (o.isMesh && o.userData && String(o.userData.ccPanelId || '').startsWith('SHOE1-')) b.expandByObject(o);
        });
      });
      const c = b.getCenter(new THREE.Vector3());
      if (v.controls) { v.controls.enableDamping = false; v.controls.target.copy(c); }
      v.camera.position.set(c.x, c.y + 0.85, c.z + 0.95);
      v.camera.up.set(0, 1, 0);
      v.camera.lookAt(c);
      v.camera.updateProjectionMatrix();
      if (v.controls) v.controls.update();
      return true;
    `);
    await page.sleep(500);
    await shot('f6-the-batten-stepped-back-30mm-behind-the-box-front', { mesh: 'SHOE1-BATTEN' });

    // ── and the FIX box, unmoved, so the proof set shows what did NOT change ──
    const fixId = await store(`(() => {
      const { id } = s.addUnit('WARDROBE');
      s.updateUnitParams(id, { width: 900, height: 1400, doors: false });
      s.addShoeBox(id, { variant: 'F', dividers: 1 });
      return id;
    })()`);
    await page.sleep(700);
    const fixPlan = await store(`s.unitResult(${JSON.stringify(fixId)}).assemblies.shoeBoxes[0]`);
    const fixFace = await store(`s.unitResult(${JSON.stringify(fixId)}).panels
      .find((p) => p.part === 'SHOEBOX-FR')`);
    measurements.f6_fix = { plan: fixPlan, faceW: fixFace && fixFace.w };
    check('F6 — the FIX front is UNTOUCHED: still the whole opening, no reveal',
      fixFace && fixPlan && fixFace.w === fixPlan.openingW,
      `fix front ${fixFace && fixFace.w} = opening ${fixPlan && fixPlan.openingW}`);
    await frameFacing([fixId], { dist: 1.9, height: 0.42, target: 'SHOE1-FR' });
    await page.sleep(500);
    await shot('f6-the-FIX-front-unchanged-full-opening-no-reveal', { mesh: 'SHOE1-FR' });
  } finally {
    const report = {
      turn: 37,
      feature: 'F6 — the batten steps back, the front covers it',
      when: new Date().toISOString(),
      steps,
      shots,
      measurements,
      // The one thing this walk could NOT photograph, said out loud rather
      // than left as a missing file (skip-and-note, iron rule 6).
      notes: [
        'CLAUDE.md asks for the drawer "closed and open". CLOSED is shot. OPEN '
        + 'is not a slide: engine/drawerMotion.js travels parts keyed on '
        + 'meta.drawer, which the shoe box has never carried, so a shoe box does '
        + 'not animate in this app and F6 adds no motion ("Box, runners, '
        + 'drilling: unchanged"). What the owner was ruling on with "a i tak się '
        + 'otworzy" is photographed instead: the doors swung clear and the 30 mm '
        + 'the batten stepped back to give.',
      ],
    };
    writeFileSync(`${OUT}f6-report.json`, `${JSON.stringify(report, null, 2)}\n`);
    const failed = steps.filter((s) => !s.ok);
    const empty = shots.filter((s) => !s.present);
    console.log(`\n${steps.length - failed.length}/${steps.length} checks, `
      + `${shots.length - empty.length}/${shots.length} proofs with their subject`);
    process.exitCode = failed.length || empty.length ? 1 : 0;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
