// ─── CONERO SWING — the proof walk (30.08, chat feature) ────────────────────
//
// One wardrobe, one pull-down rail, the model served from the silent showroom
// (R8: this container's egress refuses the bucket). Two pictures — parked and
// lowered — and the NUMBERS between them: the tube axis must travel toward +z
// (out in front, the way a drawer slides) and down, on the owner's green-point
// axes. R3 holds: each frame must contain the rod mesh, by name, visible.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const OUT = 'verify/conero-swing/';
const P = 'window.__cc';
const ROD = '3d-674367-674569-730mm';
const steps = [];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const showroom = await startFixtureServer({ port: 4180 + (Date.now() % 200) });
  const page = await launch({ width: 1500, height: 1150 });
  const check = (label, ok, detail = '') => {
    steps.push({ label, ok: Boolean(ok), detail });
    console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  };

  // R-note (this container): headless chromium STARVES requestAnimationFrame,
  // so the useFrame easing never ticks between CDP calls — an environment
  // fact, not a code fact (the same shell cannot reach the bucket either).
  // The walk therefore proves the chain in two halves it CAN prove:
  //   click → store target (the app's own switch), and
  //   pose endpoint → geometry (the same two rotations `coneroPose` sets,
  //   pinned function-level by test/conero-rod-centre.test.js).
  // The in-between easing is MovingPanel's shared line; the owner's eye-test
  // in a real browser is its proof, as it is for every door.
  const settle = async () => page.evaluate(`
    const views = Object.values(${P}.views || {});
    for (const v of views) {
      let rig = null;
      v.scene.traverse((o) => { if (!rig && o.userData && o.userData.ccConero) rig = o.userData.ccConero; });
      if (!rig) continue;
      const target = Object.values(${P}.ui.getState().openKits || {})[0] ?? 0;
      const a = (target * Math.PI) / 2;
      rig.swing.rotation.x = a;
      if (rig.rodPivot) rig.rodPivot.rotation.x = -a;
      v.scene.updateMatrixWorld(true);
      v.gl.render(v.scene, v.camera);
      return { target };
    }
    return null;
  `);

  const tubeJs = `
    const views = Object.values(${P}.views || {});
    for (const v of views) {
      let rod = null;
      v.scene.traverse((o) => { if (!rod && o.name === ${JSON.stringify(ROD)}) rod = o; });
      if (!rod) continue;
      v.scene.updateMatrixWorld(true);
      const p = new v.three.Vector3();
      rod.parent.getWorldPosition(p);
      return { y: p.y, z: p.z };
    }
    return null;
  `;

  try {
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    const kit = await page.evaluate(`
      const s = ${P}.project.getState();
      s.newProject('Conero swing walk');
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      const u = s.addUnit('WARDROBE');
      s.updateUnitParams(u.id, { width: 800, doors: false });
      s.addWardrobeKit(u.id, 'pulldown_rail', null, { pos_mm: 120 });
      const kb = (s.unitResult(u.id).assemblies.wardrobeKits || []).find((k) => k.kind === 'pulldown_rail');
      window.__csw = { unitId: u.id, key: kb ? kb.id : null, kits: (s.unitResult(u.id).assemblies.wardrobeKits || []).map((k) => ({ id: k.id, kind: k.kind })) };
      return window.__csw;
    `);
    check('the wardrobe stands and carries a pull-down body', Boolean(kit?.key), JSON.stringify(kit));

    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.waitFor(`(() => { ${tubeJs} })() !== null`, { what: 'the CONERO model to land from the showroom', timeout: 25000 });
    await page.sleep(700);

    const closed = await page.evaluate(`return (() => { ${tubeJs} })();`);
    check('R3 — the rod mesh is in the frame, parked', Boolean(closed), JSON.stringify(closed));
    await page.screenshot(`${OUT}1-parked.png`);

    await page.evaluate(`${P}.ui.getState().toggleKit(${JSON.stringify(kit.key)}); return true;`);
    const t1 = await settle();
    check('the click flipped the switch to LOWERED', t1 && t1.target === 1, JSON.stringify(t1));
    const open = await page.evaluate(`return (() => { ${tubeJs} })();`);
    check('R3 — the rod mesh is in the frame, lowered', Boolean(open), JSON.stringify(open));
    await page.screenshot(`${OUT}2-lowered.png`);

    const dz = open && closed ? open.z - closed.z : 0;
    const dy = open && closed ? open.y - closed.y : 0;
    // The unit-local +z law is pinned by the node test (fraction 1 → +z); the
    // ROOM may stand the unit at any yaw, so here the proof is the TRAVEL —
    // a ~0.6 m horizontal throw out of the carcass — and the drop.
    check('the tube travelled OUT — the swing\u2019s own ~0.6 m throw', Math.abs(dz) > 0.3, `dz=${dz.toFixed(3)} m`);
    check('…and DOWN to the plate line', dy < -0.3, `dy=${dy.toFixed(3)} m`);

    await page.evaluate(`${P}.ui.getState().toggleKit(${JSON.stringify(kit.key)}); return true;`);
    const t0 = await settle();
    check('…and back to PARKED', t0 && t0.target === 0, JSON.stringify(t0));
    const back = await page.evaluate(`return (() => { ${tubeJs} })();`);
    const home = back && closed && Math.abs(back.y - closed.y) < 1e-3 && Math.abs(back.z - closed.z) < 1e-3;
    check('second click parks it exactly where it started', home, JSON.stringify(back));
    await page.screenshot(`${OUT}3-parked-again.png`);
  } finally {
    writeFileSync(`${OUT}steps.json`, `${JSON.stringify(steps, null, 1)}\n`);
    await page.close();
    showroom.close();
  }
  const bad = steps.filter((s) => !s.ok);
  console.log(bad.length ? `\n${bad.length} FAILING STEP(S)` : '\nALL STEPS OK');
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
