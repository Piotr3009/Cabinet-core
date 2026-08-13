// ─── Turn 29 — the same four pictures, from two builds ──────────────────────
//
// CLAUDE.md asks for BEFORE/AFTER pairs on three of this turn's phases, and a
// pair is only a pair if nothing but the code moved between the two frames. So
// this script sets one scene, points one camera and takes four pictures — and
// it is run twice, against two `vite preview` servers: the turn-28 baseline and
// this branch.
//
//     git worktree add /tmp/base <baseline>
//     (cd /tmp/base && npm install && npm run build && npx vite preview --port 4175 &)
//     node scripts/t29-before-after.mjs --url http://127.0.0.1:4175/ --out verify/t29/before/
//     node scripts/t29-before-after.mjs --url http://127.0.0.1:4173/ --out verify/t29/after/
//
// The four:
//
//   f1-shelves  the owner's own arrangement — two OPEN base units, a woodgrain
//               decor, shelves in both. BEFORE: the figure runs left-to-right
//               across every shelf, which is his screenshot.
//   f2-chain    a run of three identical base units with "Show dimensions" on.
//               BEFORE: three chains, each a single 770 drawn from the floor,
//               and no 100 anywhere.
//   f4-type     the same chain, close. BEFORE: turn 25's smaller, heavier type.
//   f5-hinge    a leaf at 60° from the front, with its hinges. BEFORE: turn
//               24's arm, left behind in the carcass's frame and turned the
//               other way — the two halves of one hinge, apart.
//
// R1 still holds: this script only sets state and moves a camera; it makes no
// claim that a pointer gesture would have to prove.

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = argOf('--url', 'http://127.0.0.1:4173/');
const OUT = argOf('--out', new URL('../verify/t29/after/', import.meta.url).pathname);
const PORT = Number(argOf('--port', '9350'));
const P = 'window.__cc';

async function main() {
  mkdirSync(OUT, { recursive: true });
  // R8. The hinge pair is a picture of a MODEL, so both builds have to be
  // pointed at the silent showroom — and at the SAME one, served from here, so
  // the only thing that differs between the two frames is the app's code.
  const showroom = await startFixtureServer({ port: Number(argOf('--fixtures', '4176')) });
  const page = await launch({ port: PORT, width: 1600, height: 1000 });
  const shot = (name) => page.screenshot(`${OUT}${name}.png`);

  /** Put the camera on a SET of cabinets, from a stated direction. */
  const frameUnits = async (unitIds, offset) => page.evaluate(`
    const v = ${P}.views && ${P}.views.room;
    if (!v) return null;
    const THREE = v.three;
    const want = new Set(${JSON.stringify(unitIds)});
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
    v.camera.position.set(c.x + off[0] * r, c.y + off[1] * r, c.z + off[2] * r);
    v.camera.lookAt(c);
    v.camera.updateProjectionMatrix();
    if (v.controls && v.controls.target) { v.controls.target.copy(c); v.controls.update(); }
    return found;
  `);

  try {
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    // ONE scene, and it is the same one in both builds: two OPEN carcasses with
    // decor shelves, a run of three identical base units, and a pair of doors.
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.newProject('Turn 29 before/after', {
        room: {
          height: 2500,
          corners: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3600 }, { x: 0, y: 3600 }],
        },
      });
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      ${P}.ui.getState().closeRightPanel();
      s.setDesign({ finish: { carcass: 'egger:H1180_37', front: null } });

      const open = [];
      let near = null;
      for (let i = 0; i < 2; i += 1) {
        const u = near ? s.addUnit('BUD', { near, side: 'right' }) : s.addUnit('BUD');
        s.updateUnitParams(u.id, { width: 600, doors: false });
        s.addItem(u.id, { kind: 'shelf', pos_mm: 300 });
        s.addItem(u.id, { kind: 'shelf', pos_mm: 520 });
        open.push(u.id);
        near = u.id;
      }
      const run = [];
      for (let i = 0; i < 3; i += 1) {
        const u = s.addUnit('BUD', { near, side: 'right' });
        s.updateUnitParams(u.id, { width: 600, doors: true });
        s.addPlinth(u.id);
        run.push(u.id);
        near = u.id;
      }
      const pair = s.addUnit('BUD', { near, side: 'right' });
      s.updateUnitParams(pair.id, { width: 900, doors: { count: 2 } });
      ${P}.ui.getState().setShowHinges(true);
      ${P}.ui.getState().setShowDimensions(true);
      const r = s.unitResult(pair.id);
      window.__ba = {
        openIds: open,
        runIds: run,
        pairId: pair.id,
        leaves: r.panels.filter((p) => p.part === 'FRONT').map((p) => p.id),
      };
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    // ─── THE DECOR HAS TO BE ON THE BOARD BEFORE EITHER FRAME IS TAKEN ─────
    //
    // The scan is refused by this container's egress policy, so both builds
    // fall over to our own procedural grain — which is the condition rule 7 is
    // written for and the one the owner's own screenshot was taken in.
    //
    // On the BASELINE that fallback never arrives on its own: nothing was
    // listening for its load, so the panel stays flat until something else in
    // the app happens to re-render it. That is a fault this turn fixes (F1,
    // `3d/UnitView.jsx useDecor`) — and it is not what the F1 PAIR is about, so
    // the poke below gives the baseline the re-render it is waiting for. Both
    // builds are poked identically; on this branch the first wait simply
    // returns and the poke never runs.
    const shelfHasDecor = `(() => {
      const v = ${P}.views && ${P}.views.room;
      if (!v) return false;
      let ok = false;
      v.scene.traverse((o) => {
        if (o.isMesh && o.userData && o.userData.ccPanelId === 'SHELF-1' && o.material && o.material.map) ok = true;
      });
      return ok;
    })()`;
    for (let poke = 0; poke < 6; poke += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await page.evaluate(`return ${shelfHasDecor};`)) break;
      // eslint-disable-next-line no-await-in-loop
      // The poke has to reach `useDecor`'s own memo, and its keys are the URL
      // and the piece's size — so the finish comes off and goes back on, which
      // is what a joiner re-picking a decor does. By then the fallback image
      // has finished loading and the second pass finds it.
      await page.evaluate(`
        const st = ${P}.project.getState();
        st.setDesign({ finish: { carcass: null, front: null } });
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(700);
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`
        const st = ${P}.project.getState();
        st.setDesign({ finish: { carcass: 'egger:H1180_37', front: null } });
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(1200);
    }
    await page.waitFor(shelfHasDecor, { what: 'a decor image on the shelf', timeout: 20000 });
    await page.sleep(1500);

    // F1 — the shelves.
    await frameUnits(await page.evaluate('return window.__ba.openIds;'), [0.25, 0.95, 1.15]);
    await page.sleep(900);
    await shot('f1-shelves');

    // F2 — the run's chains, and F4's type with them.
    await frameUnits(await page.evaluate('return window.__ba.runIds;'), [0.95, 0.34, 2.05]);
    await page.sleep(900);
    await shot('f2-chain');
    await frameUnits(await page.evaluate('return [window.__ba.runIds[2]];'), [1.2, 0.45, 1.7]);
    await page.sleep(900);
    await shot('f4-type');

    // F5 — a leaf mid-swing, with its hinges.
    await page.evaluate(`
      const map = {};
      for (const id of window.__ba.leaves) map[id] = 0.6;
      ${P}.ui.setState((s) => ({ openFronts: { ...s.openFronts, [window.__ba.pairId]: map } }));
      return true;
    `);
    // …and the models have to have arrived before the shutter opens.
    await page.waitFor(`(() => {
      const hw = ${P}.hardware;
      if (!hw || !hw.of) return false;
      const rows = hw.of('hinge') || [];
      return rows.length > 0 && rows.every((r) => r.model);
    })()`, { what: 'the hinge models to mount', timeout: 30000 });
    await page.sleep(2200);
    // Close on the hinge row: at whole-cabinet scale an arm turned 59° and an
    // arm turned 0° are two dark specks, and a pair nobody can read is not a
    // pair.
    await frameUnits([await page.evaluate('return window.__ba.pairId;')], [0.42, 0.3, 0.62]);
    await page.sleep(900);
    await shot('f5-hinge');

    console.log(`four pictures → ${OUT}`);
  } finally {
    await page.close();
    await showroom.close();
  }
}

main();
