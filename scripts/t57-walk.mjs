// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 57) ───────────────────────
//
// One section per feature, each named for what it shows, so a claim in the
// report has a picture behind it and the picture has a script behind it.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t57-walk.mjs              every section
//   node scripts/t57-walk.mjs f0a f0b      two of them
//
// THE CAMERA IS PLACED, NEVER NUDGED. `focusOnPanel` is an ANIMATION, and a
// frame taken while it is still flying is a frame nobody can reproduce. Every
// section here parks the camera itself, from the piece's own box in room
// millimetres, and waits for the renderer to settle before the shutter.

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t57/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

const page = await launch({ width: 1600, height: 1000, port: 9497 });

const ask = (expr) => page.evaluate(`
  const P = () => window.__cc.project.getState();
  const U = () => window.__cc.ui.getState();
  return (${expr});
`);

async function fresh(name) {
  await ask(`(() => {
    P().newProject(${JSON.stringify(name)}, { number: '57' });
    U().openEditor();
    return true;
  })()`);
  await page.sleep(700);
}

/**
 * Park the camera at a point in the ROOM, looking at another point.
 *
 * Both in metres, which is the scene's own unit (`mm()` divides by 1000). The
 * controls' target is moved with it so the next frame does not swing back.
 */
const camera = (from, at) => ask(`(() => {
  const v = window.__cc.views.room || window.__cc.views.editor;
  if (!v) return false;
  const c = v.camera;
  const t = v.controls;
  c.position.set(${from[0]}, ${from[1]}, ${from[2]});
  if (t && t.target) { t.target.set(${at[0]}, ${at[1]}, ${at[2]}); t.update(); }
  c.lookAt(${at[0]}, ${at[1]}, ${at[2]});
  c.updateProjectionMatrix();
  return true;
})()`);

/**
 * Where a named mesh actually IS, and where it lands on the screen.
 *
 * A panel's `box` is in the UNIT's own millimetres and the unit is placed and
 * turned against its wall, so room arithmetic on those numbers is a guess. The
 * SCENE knows: `getWorldPosition` and `project` are the two answers, and both
 * come from the same three the renderer is using (`window.__cc.views`).
 */
const whereIs = (flag) => ask(`(() => {
  const v = window.__cc.views.room || window.__cc.views.editor;
  if (!v) return null;
  let hit = null;
  v.scene.traverse((o) => { if (hit === null && o.userData?.[${JSON.stringify(flag)}] !== undefined) hit = o; });
  if (!hit) return null;
  const p = hit.getWorldPosition(new v.three.Vector3());
  const s = p.clone().project(v.camera);
  const cv = v.gl.domElement.getBoundingClientRect();
  return {
    world: { x: p.x, y: p.y, z: p.z },
    screen: { x: (s.x * 0.5 + 0.5) * cv.width + cv.left, y: (-s.y * 0.5 + 0.5) * cv.height + cv.top },
  };
})()`);

/**
 * The mean brightness of a rectangle of the render, 0–255 — measured, not read
 * off the picture by eye.
 *
 * Taken with `readPixels` straight off the drawing buffer, immediately after a
 * render this call asks for. Copying the whole canvas into a 2-D one and
 * calling `getImageData` — the obvious way — makes SwiftShader read back a
 * 1600 × 1000 buffer in software and the page stops answering; this reads only
 * the rectangle asked about. GL's origin is BOTTOM-left, hence the flip.
 */
const brightness = (x, y, w, h) => ask(`(() => {
  const v = window.__cc.views.room || window.__cc.views.editor;
  const gl = v.gl.getContext();
  const cv = v.gl.domElement;
  const r = cv.getBoundingClientRect();
  const sx = gl.drawingBufferWidth / r.width;
  const sy = gl.drawingBufferHeight / r.height;
  const px = Math.max(0, Math.round((${x} - r.left) * sx));
  const pw = Math.max(1, Math.round(${w} * sx));
  const ph = Math.max(1, Math.round(${h} * sy));
  const py = Math.max(0, gl.drawingBufferHeight - Math.round((${y} - r.top) * sy) - ph);
  v.gl.render(v.scene, v.camera);
  const buf = new Uint8Array(pw * ph * 4);
  gl.readPixels(px, py, pw, ph, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i += 4) sum += (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
  return Math.round(sum / (buf.length / 4));
})()`);

await page.goto(BASE);
await page.waitFor('window.__cc && window.__cc.project', { timeout: 30000 });

try {
  // ─── F0a · A TRIM DOES NOT FLATTEN A SLOPE-CUT LEAF ──────────────────────
  //
  // The owner's own scene: a shaker wardrobe standing under a rake and inside
  // the wall's reach, so the clearance engine wakes, the yellow message fires
  // AND the auto-heal trims an edge in the same recompute. On main that is the
  // moment the phantom sheet appears. Here the door is CLEAN.
  if (runs('f0a')) {
    await fresh('F0a the trim keeps the cut');
    const scene = await ask(`(() => {
      P().setRoom({ height: 2400 });
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, {
        width: 1000, height: 2200, depth: 600, front_type: 'S', top_infill_mm: 40,
      });
      P().addDoors(r.id);
      // Hard against the LEFT wall: inside neighbourReachMm (200), which is
      // what wakes the clearance engine and its auto-heal together.
      P().moveUnit(r.id, 0, 0, { magnet: false });
      P().addWallSlope({ wall: 0, side: 'L', startHeight: 1500, run: 520 });
      P().settleLayout();
      P().refreshAutoParts();
      const u = P().units.find((x) => x.id === r.id);
      const res = P().unitResult(r.id);
      const leaves = (res.panels || []).filter((p) => p.part === 'FRONT');
      U().selectUnit(null);
      return {
        id: r.id,
        trims: u.params.front_edge_trim || null,
        leaves: leaves.map((p) => ({
          id: p.id,
          corners: p.cnc.outline.length,
          tops: [...new Set(p.cnc.outline.map((q) => q[1]).filter((v) => v > 1))].length,
          cut: Boolean(p.meta.slopeCut),
          trimmed: Boolean(p.meta.edgeTrim),
        })),
        box: { x: leaves[0].box.x, y: leaves[0].box.y, z: leaves[0].box.z, w: leaves[0].box.w },
      };
    })()`);
    const cut = (scene.leaves || []).filter((l) => l.cut);
    check('every cut leaf is still a POLYGON — no leaf has one flat top line',
      cut.length > 0 && cut.every((l) => l.tops > 1),
      JSON.stringify(scene.leaves));
    // Eye level, square on the doors, close enough to see a phantom if one
    // were there.
    await camera([0.5, 1.35, 2.3], [0.5, 1.15, 0]);
    await page.sleep(1200);
    await page.screenshot(`${SHOTS}f0a-trim-slope.png`);
  }

  // ─── F0b · THE WATCH PANE IS GLASS ───────────────────────────────────────
  //
  // Camera ABOVE the shelf the opening is cut in, looking down THROUGH the
  // pane at the tray beneath. The claim is measured as well as photographed:
  // the aperture is brighter with the LED ring lit than without it, and the
  // pocket walls under the glass are lighter than the shadow beside them.
  if (runs('f0b')) {
    await fresh('F0b the pane is glass');
    const scene = await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 900 });
      P().addDrawers(r.id, 2, 'overlay', 200, null, null);
      const made = P().addWatchDrawer(r.id);
      if (!made.ok) return { error: made.error };
      P().setWatchShelfGlass(r.id, made.id, true);
      const res = P().unitResult(r.id);
      const pane = ((res.assemblies || {}).watchGlass || [])[0] || null;
      U().selectUnit(null);
      // The fronts are off so the camera can see into the carcass at all —
      // the same "Hide fronts" the toolbar offers, taken from the store.
      U().setHideFronts(true);
      return { id: r.id, pane, unitX: P().units.find((x) => x.id === r.id).x };
    })()`);
    check('the shelf carries a pane to draw', Boolean(scene.pane), JSON.stringify(scene.pane?.box));
    await page.sleep(900);
    const live = await ask(`(() => {
      const v = window.__cc.views.room;
      let panes = 0; let strips = 0; let lights = 0;
      v.scene.traverse((o) => {
        if (o.userData?.ccWatchGlass !== undefined) panes += 1;
        if (o.userData?.ccWatchLedStrip !== undefined) strips += 1;
        if (o.isRectAreaLight) lights += 1;
      });
      const mat = [];
      v.scene.traverse((o) => {
        if (o.userData?.ccWatchGlass === undefined) return;
        const m = o.material;
        mat.push({ transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite });
      });
      return { panes, strips, lights, mat };
    })()`);
    check('the pane is IN THE SCENE, transparent, and does not write depth',
      live.panes === 1 && live.mat[0]?.transparent === true && live.mat[0]?.depthWrite === false,
      JSON.stringify(live));
    check('its LED ring is four strips and one area light',
      live.strips === 4 && live.lights >= 1, JSON.stringify({ strips: live.strips, lights: live.lights }));

    // Straight down onto the pane, from above and a little in front of it —
    // placed off the MESH's own world position, not off room arithmetic.
    const at = await whereIs('ccWatchGlass');
    check('the pane can be found in the scene to aim at', Boolean(at), JSON.stringify(at?.world));
    const P0 = at.world;
    await camera([P0.x, P0.y + 0.80, P0.z + 1.00], [P0.x, P0.y - 0.10, P0.z]);
    await page.sleep(1500);

    // The frame FIRST — reading the drawing buffer back into a 2-D canvas is
    // the last thing done to this page, because it is the one operation that
    // touches the buffer the capture is taken from.
    await page.screenshot(`${SHOTS}f0b-glass.png`);

    // WHERE the aperture lands on screen, and a box inside it to measure.
    const on = await whereIs('ccWatchGlass');
    const BOX = [Math.round(on.screen.x - 90), Math.round(on.screen.y - 45), 180, 90];
    const lit = await brightness(...BOX);

    // …and the same pixels with the ring OUT. A pane that showed nothing but
    // itself would measure the same either way, which is the fault this is
    // guarding: the claim is that the LIGHT UNDER THE GLASS reaches the eye.
    await ask(`(() => {
      const v = window.__cc.views.room;
      v.scene.traverse((o) => {
        if (o.userData?.ccWatchLedStrip !== undefined) o.visible = false;
        if (o.isRectAreaLight) o.intensity = 0;
      });
      return true;
    })()`);
    await page.sleep(900);
    const dark = await brightness(...BOX);
    check('the LED ring reads THROUGH the pane — the aperture is brighter with it lit',
      Number(lit) > Number(dark), `lit ${lit} vs dark ${dark} over ${JSON.stringify(BOX)}`);
  }
} finally {
  const bad = steps.filter((s) => !s.ok);
  process.stdout.write(`\n${steps.length} check(s), ${bad.length === 0 ? 'all ok.' : `${bad.length} FAILED.`}\n`);
  process.exit(bad.length === 0 ? 0 : 1);
}
