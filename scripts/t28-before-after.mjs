// ─── Turn 28 — the same four pictures, from two builds ──────────────────────
//
// CLAUDE.md asks for BEFORE/AFTER pairs on three of this turn's phases, and a
// pair is only a pair if nothing but the code moved between the two frames. So
// this script sets one scene, points one camera and takes four pictures — and
// it is run twice, against two `vite preview` servers: the turn-28 baseline and
// this branch.
//
//     git worktree add /tmp/base <baseline>
//     (cd /tmp/base && npm install && npm run build && npx vite preview --port 4175 &)
//     node scripts/t28-before-after.mjs --url http://127.0.0.1:4175/ --out verify/t28/before/
//     node scripts/t28-before-after.mjs --url http://127.0.0.1:4173/ --out verify/t28/after/
//
// The four:
//
//   f2-sheet    the leaf's own CNC sheet — the owner's `03-F`, with its three
//               ⌀35 cups and its handle holes. BEFORE: both on one stile.
//   f4-rebate   a sprayed burgundy shaker at a grazing angle with outlines
//               OFF. BEFORE: "mega płasko".
//   f8-chain    every number a cabinet has, on a run of three identical ones.
//               BEFORE: three chains, and one of them 870 from the floor.
//   f8-fronts   "Show front dimensions" on one leaf. BEFORE: the width and the
//               height labels crossing on the centre lines, under the +.
//
// R1 still holds: this script only sets state and moves a camera; it makes no
// claim that a pointer gesture would have to prove.

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = argOf('--url', 'http://127.0.0.1:4173/');
const OUT = argOf('--out', new URL('../verify/t28/after/', import.meta.url).pathname);
const P = 'window.__cc';

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name) => page.screenshot(`${OUT}${name}.png`);
  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    // ONE scene, and it is the same one in both builds: a shaker pair on a
    // burgundy front with a bar handle, and three identical base units beside
    // it with every number switched on.
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.newProject('Turn 28 before/after', {
        room: {
          height: 2500,
          corners: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3600 }, { x: 0, y: 3600 }],
        },
      });
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      s.setProjectHandle({ type: 'bar', centres: 160 });
      s.setFrontColour({ hex: '#5b1a2b', label: 'Burgundy' });
      const pair = s.addUnit('BUD');
      s.updateUnitParams(pair.id, { width: 900, doors: true, front_type: 'S' });
      const run = [];
      let near = pair.id;
      for (let i = 0; i < 3; i += 1) {
        const u = s.addUnit('BUD', { near, side: 'right' });
        s.updateUnitParams(u.id, { doors: true, width: 600 });
        s.addPlinth(u.id);
        ${P}.ui.getState().toggleUnitDimensions(u.id);
        run.push(u.id);
        near = u.id;
      }
      const r = s.unitResult(pair.id);
      window.__ba = {
        pairId: pair.id,
        runIds: run,
        leafId: r.panels.filter((p) => p.part === 'FRONT')[0].id,
      };
      ${P}.ui.getState().setShowOutlines(false);
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(1800);

    /** Put the camera on ONE piece, close, from a stated direction. */
    const frameOn = async (panelId, offset) => page.evaluate(`
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

    // ── F4: the rebate, outlines OFF, at the owner's own grazing angle ──────
    const leafId = await page.evaluate('return window.__ba.leafId;');
    await frameOn(leafId, [1.2, 0.3, 2.4]);
    await page.sleep(900);
    await shot('f4-rebate');

    // ── F8: the chains on a run of three identical cabinets ────────────────
    await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      if (!v) return null;
      const THREE = v.three;
      let group = null;
      v.scene.traverse((o) => { if (!group && o.userData && o.userData.ccUnitId === window.__ba.runIds[1]) group = o; });
      if (!group) return null;
      const box = new THREE.Box3().setFromObject(group);
      const c = box.getCenter(new THREE.Vector3());
      v.camera.position.set(c.x + 0.9, c.y + 1.1, c.z + 3.4);
      v.camera.lookAt(c.x, c.y - 0.2, c.z);
      v.camera.updateProjectionMatrix();
      if (v.controls && v.controls.target) { v.controls.target.set(c.x, c.y - 0.2, c.z); v.controls.update(); }
      return true;
    `);
    await page.sleep(900);
    await shot('f8-chain');

    // ── F8.3/F8.4: the two labels on one leaf ──────────────────────────────
    await page.evaluate(`${P}.ui.getState().toggleFrontDimensions(); return true;`);
    await page.sleep(700);
    await frameOn(leafId, [0.15, 0.15, 2.9]);
    await page.sleep(900);
    await shot('f8-fronts');
    await page.evaluate(`${P}.ui.getState().toggleFrontDimensions(); return true;`);

    // ── F2: the leaf's own SHEET — the owner's 03-F ────────────────────────
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.closeModal();
      ui.openModal('cabinet', { unitId: window.__ba.pairId });
      return true;
    `);
    await page.sleep(1200);
    await page.evaluate(`
      ${P}.ui.getState().pushModal('part-detail', {
        unitId: window.__ba.pairId, panelId: window.__ba.leafId, anchor: null, at: null,
      });
      return true;
    `);
    await page.sleep(1800);
    await shot('f2-sheet');
    console.log(`four pictures written to ${OUT}`);
  } finally {
    await page.close();
  }
}

main();
