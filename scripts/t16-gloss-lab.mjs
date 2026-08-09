// ─── The wall-vs-base gloss LAB (turn 16, CLAUDE.md F8) ─────────────────────
//
// Owner: hanging units still lack the base units' gloss — "albo coś z farbą
// jest nie tak". CLAUDE.md F8 asks for a DIAGNOSIS first and a measured fix
// second, and forbids eyeballing either.
//
// The walk (scripts/e2e-turn16.mjs) does the diagnosis and publishes the
// shipped numbers. This is the bench beside it: the same controlled pair — one
// base unit and one wall unit on the same wall, at the same x, both with doors
// — measured under several candidate rigs, so the number that ends up in
// profile.appearance.studio.points is one that was chosen by measurement.
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/t16-gloss-lab.mjs

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { decodePng, highlight } from './png.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const OUT = new URL('../verify/t16/', import.meta.url).pathname;
const P = 'window.__cc';

/** The candidates. The first is what the branch ships before this experiment. */
const EYE = { x: 0.35, yMm: 1650, z: 0.7, intensity: 12, colour: '#fff6ec' };
const EYE2 = { x: -0.35, yMm: 1650, z: 0.7, intensity: 12, colour: '#fff3e4' };
const LOW = { x: 0.35, yMm: 500, z: 0.7, intensity: 6, colour: '#fff6ec' };
const LOW2 = { x: -0.35, yMm: 500, z: 0.7, intensity: 6, colour: '#fff3e4' };
const wallPair = (intensity) => ([
  { x: 0.35, yMm: 1860, z: 0.7, intensity, colour: '#fff6ec' },
  { x: -0.35, yMm: 1860, z: 0.7, intensity, colour: '#fff3e4' },
]);

const RIGS = {
  'shipped 4-point': [EYE, EYE2, LOW, LOW2],
  'eye pair raised to 1860': [
    { ...EYE, yMm: 1860 }, { ...EYE2, yMm: 1860 }, LOW, LOW2,
  ],
  'a wall pair at 1860, 6': [EYE, EYE2, LOW, LOW2, ...wallPair(6)],
  'a wall pair at 1860, 9': [EYE, EYE2, LOW, LOW2, ...wallPair(9)],
  'a wall pair at 1860, 12': [EYE, EYE2, LOW, LOW2, ...wallPair(12)],
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const rows = [];
  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await page.evaluate(`
      ${P}.project.getState().newProject('gloss lab');
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      return true;
    `);
    await page.sleep(900);
    await page.waitFor('document.querySelector("canvas")', { what: 'the canvas' });

    const pair = await page.evaluate(`
      const base = ${P}.project.getState().addUnit('BUD').id;
      ${P}.project.getState().moveUnit(base, 1200, 0);
      ${P}.project.getState().addDoors(base);
      const wall = ${P}.project.getState().addUnit('WUD').id;
      ${P}.project.getState().moveUnit(wall, 1200, 0);
      ${P}.project.getState().addDoors(wall);
      ${P}.ui.getState().clearSelection();
      return { base, wall };
    `);
    await page.sleep(1600);

    const rects = async () => page.evaluate(`
      const view = ${P}.views.room;
      const THREE = view.three;
      const r = view.gl.domElement.getBoundingClientRect();
      const find = (unitId) => {
        let found = null;
        const walk = (obj, inUnit) => {
          if (!obj || found) return;
          const mine = inUnit || (obj.userData && obj.userData.ccUnitId === unitId);
          if (mine && obj.userData && obj.userData.ccRole === 'front' && obj.geometry) found = obj;
          (obj.children || []).forEach((c) => walk(c, mine));
        };
        walk(view.scene, false);
        return found;
      };
      const rectOf = (mesh) => {
        if (!mesh) return null;
        const box = new THREE.Box3().setFromObject(mesh);
        let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
        for (const x of [box.min.x, box.max.x]) {
          for (const y of [box.min.y, box.max.y]) {
            for (const z of [box.min.z, box.max.z]) {
              const v = new THREE.Vector3(x, y, z).project(view.camera);
              const sx = (v.x * 0.5 + 0.5) * r.width;
              const sy = (-v.y * 0.5 + 0.5) * r.height;
              minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
              minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
            }
          }
        }
        const inset = 0.18;
        const w = maxX - minX; const h = maxY - minY;
        return {
          x: Math.round(minX + w * inset), y: Math.round(minY + h * inset),
          w: Math.round(w * (1 - inset * 2)), h: Math.round(h * (1 - inset * 2)),
        };
      };
      return {
        wall: rectOf(find(${JSON.stringify(pair.wall)})),
        base: rectOf(find(${JSON.stringify(pair.base)})),
        canvas: {
          x: Math.round(r.left), y: Math.round(r.top),
          width: Math.round(r.width), height: Math.round(r.height),
        },
      };
    `);

    const where = await rects();
    // TWO COLOURS. A specular highlight is a difference between the lit face
    // and the reflection ON it, and a near-white door at this exposure is
    // already at the top of the range — there is nowhere for a highlight to be
    // brighter. A workshop's coloured job is where gloss is seen, so the same
    // measurement is taken on a wine-red front as well as on the shipped
    // broken white.
    const COLOURS = {
      'broken white (default)': null,
      'RAL 3005 wine red': { hex: '#7b1e28', name: '3005 Wine Red', system: 'RAL' },
    };
    for (const [colourName, colour] of Object.entries(COLOURS)) {
    await page.evaluate(`
      ${P}.project.getState().setFrontColour(${JSON.stringify(colour)}, 'f1');
      return true;
    `);
    await page.sleep(900);
    for (const [name, points] of Object.entries(RIGS)) {
      await page.evaluate(`
        const store = ${P}.profile.getState();
        const p = store.profile;
        store.setProfile({
          ...p,
          appearance: { ...p.appearance, studio: { ...p.appearance.studio, points: ${JSON.stringify(points)} } },
        });
        return true;
      `);
      await page.sleep(1100);
      const tag = `${colourName}-${name}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const file = `${OUT}gloss-${tag}.png`;
      await page.screenshot(file, { ...where.canvas, scale: 1 });
      const png = decodePng(readFileSync(file));
      const wall = highlight(png, where.wall);
      const base = highlight(png, where.base);
      rows.push({
        colour: colourName,
        rig: name,
        lamps: points.length,
        wallDoor: { mean: wall.mean, top2: wall.topMean, p95: wall.p95, contrast: wall.contrast },
        baseDoor: { mean: base.mean, top2: base.topMean, p95: base.p95, contrast: base.contrast },
        wallMinusBase: Math.round((wall.mean - base.mean) * 10) / 10,
      });
      console.log(`${colourName.padEnd(24)} ${name.padEnd(26)} wall ${wall.mean} (top ${wall.topMean}, contrast ${wall.contrast})  base ${base.mean} (top ${base.topMean}, contrast ${base.contrast})  Δ ${rows[rows.length - 1].wallMinusBase}`);
    }
    }
    writeFileSync(`${OUT}gloss-lab.json`, `${JSON.stringify({ rects: where, rows }, null, 1)}\n`);
    await page.close();
  } catch (e) {
    console.error(e);
    await page.close();
    process.exit(1);
  }
}

main();
