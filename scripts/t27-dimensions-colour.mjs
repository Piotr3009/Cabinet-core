// ─── F4's PROOF: the label, before and after, on the same camera ────────────
//
// CLAUDE.md F4.3: *`verify/t27/dimensions-colour.md`: the turn-25 look beside
// the turn-27 look, same camera, so the owner can see the debt paid.*
//
// A screenshot of one of them proves nothing on its own — "the labels are dark"
// is a sentence, and the question is whether they are the SAME dark they were
// before turn 26 repainted them. So this drives TWO builds of the app through
// the same script: the turn-26 baseline (whose paint is the debt) and this
// branch (whose paint is the repayment), with the same project, the same
// cabinet and the same camera in both.
//
// Run:  npx vite preview --port 4173               # this branch
//       (cd <turn-26 worktree> && npx vite preview --port 4175)
//       node scripts/t27-dimensions-colour.mjs --before http://127.0.0.1:4175/ \
//                                              --after  http://127.0.0.1:4173/
//
// R1 applies here as it applies to the walk: the camera is placed through the
// live view handle and nothing is clicked with a synthetic event.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t27/', import.meta.url).pathname);
const BEFORE = argOf('--before', 'http://127.0.0.1:4175/');
const AFTER = argOf('--after', 'http://127.0.0.1:4173/');

const P = 'window.__cc';

// The SAME cabinet, and the same camera, in both. Written once so the two
// pictures cannot differ in anything but the paint.
const CAMERA = { pos: [1.18, 0.86, 1.48], target: [0.3, 0.42, 0.28] };

async function capture(url, name) {
  const page = await launch({ width: 1600, height: 1000 });
  try {
    await page.goto(url);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.newProject('Turn 27 · dimension colour');
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      const u = s.addUnit('BUD');
      s.updateUnitParams(u.id, { doors: true, width: 600 });
      s.addItem(u.id, { kind: 'shelf', pos_mm: 300 });
      s.addItem(u.id, { kind: 'shelf', pos_mm: 500 });
      ${P}.ui.getState().toggleUnitDimensions(u.id);
      window.__cmp = { unitId: u.id };
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(1600);
    const placed = await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      if (!v) return null;
      const c = ${JSON.stringify(CAMERA)};
      v.camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
      v.camera.lookAt(c.target[0], c.target[1], c.target[2]);
      v.camera.updateProjectionMatrix();
      if (v.controls && v.controls.target) { v.controls.target.set(c.target[0], c.target[1], c.target[2]); v.controls.update(); }
      let chains = 0; let rows = 0;
      v.scene.traverse((o) => {
        if (o.userData && o.userData.ccDimensionChain !== undefined) {
          chains += 1; rows += Number(o.userData.ccDimensionRows) || 0;
        }
      });
      return { chains, rows };
    `);
    // A real pointer move over empty floor, so the headless window composites a
    // frame — R1's own instrument, used for what it is.
    for (let i = 0; i < 6; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await page.mouse('mouseMoved', i % 2 ? 40 : 44, 940, { button: 'none', buttons: 0, clickCount: 0 });
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(160);
    }
    await page.screenshot(`${OUT}${name}.png`);
    console.log(`  ${name}: ${placed?.chains} chains, ${placed?.rows} rows — ${url}`);
    return placed;
  } finally {
    await page.close();
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const before = await capture(BEFORE, '4b-the-dimension-labels-before-f4');
  const after = await capture(AFTER, '4c-the-dimension-labels-after-f4');
  writeFileSync(`${OUT}dimensions-colour.json`, `${JSON.stringify({
    camera: CAMERA, before: { url: BEFORE, ...before }, after: { url: AFTER, ...after },
  }, null, 1)}\n`);
}

main();
