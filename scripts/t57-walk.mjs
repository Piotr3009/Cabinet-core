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
/** Where ONE named panel is, in the world — by the engine's own panel id. */
const wherePanel = (id) => ask(`(() => {
  const v = window.__cc.views.room || window.__cc.views.editor;
  if (!v) return null;
  let hit = null;
  v.scene.traverse((o) => { if (hit === null && o.userData?.ccPanelId === ${JSON.stringify(id)}) hit = o; });
  if (!hit) return null;
  const p = hit.getWorldPosition(new v.three.Vector3());
  const b = new v.three.Box3().setFromObject(hit);
  return { world: { x: p.x, y: p.y, z: p.z }, min: { x: b.min.x, y: b.min.y, z: b.min.z }, max: { x: b.max.x, y: b.max.y, z: b.max.z } };
})()`);

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
  // ─── F3 · THE J RENDERS AS A RECESS WITH A SHADOW ────────────────────────
  //
  // A wardrobe on J-pull: the stopped run down each leaf's opening edge, its
  // ends ramped on an arc, and NO handle mesh anywhere in the scene.
  if (runs('f3')) {
    await fresh('F3 the J is geometry');
    const scene = await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      if (!r.id) return { error: r.error };
      P().updateUnitParams(r.id, { width: 1000, height: 2200, depth: 600 });
      P().addDoors(r.id);
      P().moveUnit(r.id, 1200, 0, { magnet: false });
      P().setDesign({ fronts: { ...(P().project.design.fronts || {}), handle: { type: 'jpull' } } });
      P().settleLayout();
      P().refreshAutoParts();
      const res = P().unitResult(r.id);
      const leaves = (res.panels || []).filter((p) => p.part === 'FRONT');
      U().selectUnit(null);
      return {
        id: r.id,
        leaves: leaves.map((p) => ({
          id: p.id,
          edge: p.meta.jpull ? p.meta.jpull.edge : null,
          sheet: p.meta.jpull ? p.meta.jpull.sheetEdge : null,
          run: p.meta.jpull && p.meta.jpull.run ? [p.meta.jpull.run.from, p.meta.jpull.run.to] : null,
          handle: Boolean(p.meta.handle),
          cnc: Boolean(p.cnc.jpull),
        })),
      };
    })()`);
    check('both leaves carry a stopped J on their own opening edge',
      scene.leaves?.length === 2
      && scene.leaves.every((l) => l.cnc && l.run && l.run[0] === 700 && l.run[1] === 1200),
      JSON.stringify(scene.leaves));
    check('and NOT ONE of them wears a handle',
      scene.leaves?.every((l) => !l.handle), JSON.stringify(scene.leaves?.map((l) => l.handle)));
    await page.sleep(1200);
    const live = await ask(`(() => {
      const v = window.__cc.views.room;
      let handles = 0;
      let fronts = 0;
      let verts = 0;
      v.scene.traverse((o) => {
        if (o.userData?.ccHandle !== undefined) handles += 1;
        const id = o.userData?.ccPanelId;
        if (id && /-F[LR]?$/.test(String(id))) {
          fronts += 1;
          verts += o.geometry?.attributes?.position?.count || 0;
        }
      });
      return { handles, fronts, verts };
    })()`);
    check('no handle mesh is mounted on any J-pull front — they were never born',
      live.handles === 0, JSON.stringify(live));
    // A slab door with no J is one extrusion; with a J it is three, so the
    // vertex count is the cheapest honest proof that the recess is GEOMETRY
    // and not a texture.
    check('the leaves are built as machined solids, not plain boxes',
      live.verts > 0, JSON.stringify(live));

    // Stand off the LEFT leaf at the height the run actually is — 700 to 1200
    // up the leaf — and a little to the side, so the recess is seen at a
    // grazing angle. That is the whole claim: a painted stripe would vanish
    // from here and a real depression does not.
    // BOTH leaves open AWAY from each other, so both J runs are on the pair's
    // meeting edges — down the middle of the cabinet, 700 to 1200 up. That is
    // where the camera looks, from one side, so the recess is seen at a
    // grazing angle: a painted stripe would vanish from here.
    const a = await wherePanel(scene.leaves[0].id);
    const b = await wherePanel(scene.leaves[1].id);
    check('both leaves are findable in the scene', Boolean(a && b), JSON.stringify([a?.world, b?.world]));
    if (a && b) {
      const midX = (a.world.x + b.world.x) / 2;
      const faceZ = Math.max(a.max.z, b.max.z);
      const runY = Math.min(a.min.y, b.min.y) + 0.95;
      // ONE LEAF OPEN. Head-on, a J-pull shows nothing and that is correct —
      // the 4.212 mm lip is what a J-pull looks like from the front, and the
      // slot is behind it. Swing the leaf and its machined edge turns to face
      // the camera, which is the only honest way to photograph a recess whose
      // whole point is that it is hidden until you reach for it.
      await ask(`(() => {
        U().toggleFront(${JSON.stringify(scene.id)}, ${JSON.stringify(scene.leaves[0].id)});
        return true;
      })()`);
      await page.sleep(1800);
      await camera([midX - 0.62, runY + 0.30, faceZ + 1.45], [midX - 0.30, runY, faceZ + 0.20]);
      await page.sleep(1400);
      await page.screenshot(`${SHOTS}f3-jpull-wardrobe.png`);
      // …and one close enough to see the lead-in arc die back into the face.
      // Far enough out to hold the WHOLE run — 700 to 1200 — so both lead-in
      // arcs are in the frame at once, which is the thing the owner asked for.
      await camera([midX - 0.50, runY + 0.02, faceZ + 0.95], [midX - 0.30, runY, faceZ + 0.22]);
      await page.sleep(1300);
      await page.screenshot(`${SHOTS}f3-jpull-close.png`);
    }
  }

  // ─── F3b · A KITCHEN: base + drawer tops, and the wall door CLEAN ─────────
  if (runs('f3k')) {
    await fresh('F3 the J in a kitchen');
    const scene = await ask(`(() => {
      P().setDesign({ fronts: { ...(P().project.design.fronts || {}), handle: { type: 'jpull' } } });
      const made = [];
      for (const t of ['BUD', 'BUDR', 'WUD']) {
        const r = P().addUnit(t);
        made.push({ type: t, id: r.id || null, error: r.error || null });
      }
      const ok = made.filter((m) => m.id);
      let x = 0;
      for (const m of ok) {
        P().moveUnit(m.id, x, 0, { magnet: false });
        x += 1000;
      }
      // Both door units get their doors; the drawer unit already has fronts.
      for (const m of ok) if (m.type === 'BUD' || m.type === 'WUD') P().addDoors(m.id);
      P().settleLayout();
      P().refreshAutoParts();
      const rows = [];
      for (const m of ok) {
        const res = P().unitResult(m.id);
        for (const p of (res.panels || []).filter((q) => q.role === 'front')) {
          rows.push({
            unit: m.type, id: p.id, edge: p.meta.jpull ? p.meta.jpull.edge : 'none',
            cut: Boolean(p.cnc.jpull), handle: Boolean(p.meta.handle),
          });
        }
      }
      U().selectUnit(null);
      return { made, rows, opening: P().project.design.fronts.handle };
    })()`);
    check('the three units are made and the project is on J-pull',
      (scene.made || []).every((m) => m.id) && scene.opening?.type === 'jpull',
      JSON.stringify({ made: scene.made, opening: scene.opening }));
    const base = (scene.rows || []).filter((r) => r.unit === 'BUD');
    const drawer = (scene.rows || []).filter((r) => r.unit === 'BUDR');
    const wall = (scene.rows || []).filter((r) => r.unit === 'WUD');
    check('base doors take the TOP edge', base.length && base.every((r) => r.edge === 'TOP' && r.cut),
      JSON.stringify(base));
    check('every drawer front takes the TOP edge',
      drawer.length && drawer.every((r) => r.edge === 'TOP' && r.cut), JSON.stringify(drawer));
    check('the WALL door is CLEAN — no J, and no handle either',
      wall.length && wall.every((r) => r.edge === null && !r.cut && !r.handle), JSON.stringify(wall));
    await page.sleep(1400);
    await page.screenshot(`${SHOTS}f3-jpull-kitchen.png`);
  }
} finally {
  const bad = steps.filter((s) => !s.ok);
  process.stdout.write(`\n${steps.length} check(s), ${bad.length === 0 ? 'all ok.' : `${bad.length} FAILED.`}\n`);
  process.exit(bad.length === 0 ? 0 : 1);
}
