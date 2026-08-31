// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 58b) ──────────────────────
//
// The whole reason this turn is written the way it is: two nights running the
// pane was DECLARED glass and PHOTOGRAPHED opaque. So every claim below ends
// in a frame, and every frame has this script behind it.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t58b-walk.mjs             every section
//   node scripts/t58b-walk.mjs f1          one of them
//
// THE CAMERA IS PLACED, NEVER NUDGED — T57's rule, kept: `focusOnPanel` is an
// ANIMATION, and a frame taken while it is still flying is a frame nobody can
// reproduce. Every section parks the camera itself and waits for the renderer
// to settle before the shutter.

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t58b/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

const page = await launch({ width: 1600, height: 1000, port: 9631 });

const ask = (expr) => page.evaluate(`
  const P = () => window.__cc.project.getState();
  const U = () => window.__cc.ui.getState();
  return (${expr});
`);

/** A section starts where every other section starts (T57's rule). */
async function fresh(name) {
  await ask(`(() => {
    P().newProject(${JSON.stringify(name)}, { number: '58b' });
    U().openEditor();
    U().setHideFronts(false);
    U().setXray(false);
    U().selectUnit(null);
    U().closeAllFronts();
    if (U().closeModal) U().closeModal();
    else if (U().setModal) U().setModal(null);
    return true;
  })()`);
  await page.sleep(700);
  await page.waitFor('window.__cc.views && (window.__cc.views.room || window.__cc.views.editor)',
    { timeout: 20000 });
}

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
 * THE CAMERA IS PLACED FROM THE OBJECT, NEVER NUDGED.
 *
 * "45° from above" is not a taste; it is an angle, and the only way to shoot
 * it reproducibly is to compute it off the thing being photographed. This
 * finds the marked mesh in the live scene, takes its world centre, and parks
 * the camera `dist` metres away on a line `deg` above the horizontal, coming
 * from the FRONT of the room (+z) and a touch to the side.
 */
const aim = (flag, { dist = 1.1, deg = 45, sway = 0.18 } = {}) => ask(`(() => {
  const v = window.__cc.views.room || window.__cc.views.editor;
  if (!v) return null;
  let hit = null;
  v.scene.traverse((o) => {
    if (!hit && o.userData && o.userData[${JSON.stringify(flag)}] !== undefined) hit = o;
  });
  if (!hit) return null;
  v.scene.updateMatrixWorld(true);
  // The mesh's own world translation — its box geometry is centred on it, so
  // this IS the pane's centre. Read off the matrix rather than through a
  // Vector3 the page does not export.
  const e = hit.matrixWorld.elements;
  const at = { x: e[12], y: e[13], z: e[14] };
  const rad = ${deg} * Math.PI / 180;
  const from = {
    x: at.x + ${sway},
    y: at.y + ${dist} * Math.sin(rad),
    z: at.z + ${dist} * Math.cos(rad),
  };
  const c = v.camera;
  const t = v.controls;
  c.position.set(from.x, from.y, from.z);
  if (t && t.target) { t.target.set(at.x, at.y, at.z); t.update(); }
  c.lookAt(at.x, at.y, at.z);
  c.updateProjectionMatrix();
  return { at: { x: at.x, y: at.y, z: at.z }, from };
})()`);

/** How many meshes in the live scene carry a given `ccXxx` marker. */
const countFlag = (flag) => ask(`(() => {
  const v = window.__cc.views.room || window.__cc.views.editor;
  if (!v) return -1;
  let n = 0;
  v.scene.traverse((o) => { if (o.userData && o.userData[${JSON.stringify(flag)}] !== undefined) n += 1; });
  return n;
})()`);

/** The MATERIAL a marked mesh actually wears, read off the live scene — the
 *  one reading a screenshot cannot argue with. */
const materialOf = (flag) => ask(`(() => {
  const v = window.__cc.views.room || window.__cc.views.editor;
  if (!v) return null;
  let hit = null;
  v.scene.traverse((o) => {
    if (!hit && o.material && o.userData && o.userData[${JSON.stringify(flag)}] !== undefined) hit = o;
  });
  if (!hit) return null;
  const m = hit.material;
  return {
    type: m.type,
    color: '#' + m.color.getHexString(),
    transparent: m.transparent,
    opacity: m.opacity,
    depthWrite: m.depthWrite,
    roughness: m.roughness,
    metalness: m.metalness,
    side: m.side,
    transmission: m.transmission === undefined ? null : m.transmission,
    renderOrder: hit.renderOrder,
  };
})()`);

/** A build-a-watch-drawer-under-a-glass-shelf wardrobe, with GLAZED doors on
 *  the front of it — the exact object the owner was looking through. */
const buildWatchUnit = ({ glazed = true, doors = true, ledDemo = true } = {}) => ask(`(() => {
  const r = P().addUnit('WARDROBE');
  P().updateUnitParams(r.id, { width: 900, height: 2200, depth: 600 });
  P().addDrawers(r.id, 2);
  const items = P().units.find((u) => u.id === r.id).params.sections[0].items
    .filter((i) => i.kind === 'drawer');
  const last = items[items.length - 1];
  P().setDrawerWatchInsert(r.id, last.id, true);
  P().updateItem(r.id, last.id, { watch_shelf_glass: true });
  P().addShelves(r.id, 1);
  ${doors ? "P().addDoors(r.id);" : ''}
  ${glazed ? "P().updateUnitParams(r.id, { front_type: 'GL' });" : ''}
  P().settleLayout();
  // The LED demo DIMS the whole room to 15% so the strips can be seen (T33's
  // own law). F1's frame wants the room lights UP, so it asks for it off.
  P().setLighting({ on: ${ledDemo ? 'true' : 'false'} });
  const res = P().unitResult(r.id);
  U().selectUnit(null);
  U().closeAllFronts();
  return {
    id: r.id,
    panes: (res.assemblies?.watchGlass || []).length,
    insert: (res.panels || []).filter((p) => p.role === 'watch_insert').length,
    glazedLeaves: (res.panels || []).filter((p) => p.meta && p.meta.glass).length,
  };
})()`);

await page.goto(BASE);
await page.waitFor('window.__cc && window.__cc.project', { timeout: 30000 });

try {
  // ══ F1 · THE PANE IS ALPHA GLASS, AND THE INSERT IS VISIBLE THROUGH IT ════
  //
  // The owner, live: *"szyba w ogóle nie jest przezroczysta… nic nie widać."*
  // He is looking at a wardrobe with GLAZED DOORS and a watch drawer behind
  // them: two panes between his eye and the insert, and the door's was still
  // on three's TRANSMISSION pass, which comes back a dark slab where the pass
  // has nothing to give it. This section shoots the frame he could not get.
  if (runs('f1')) {
    // ── THE DoD FRAME: down THROUGH the shelf pane onto a CLOSED drawer ────
    await fresh('F1 the pane is glass');
    const unit = await buildWatchUnit({ glazed: false, doors: false, ledDemo: false });
    check('a watch drawer with an insert, under a glass shelf, is built',
      unit.panes > 0 && unit.insert > 0, JSON.stringify(unit));

    // THE MATERIAL, read off the LIVE SCENE — not off the source, and not off
    // a human looking at a picture. This is the assertion the last two turns
    // did not have.
    const watchGlass = await materialOf('ccWatchGlass');
    check('the shelf pane over the watches is alpha glass, OFF the transmission path',
      watchGlass && watchGlass.transparent === true && watchGlass.depthWrite === false
        && (watchGlass.transmission === null || watchGlass.transmission === 0)
        && watchGlass.renderOrder === 20,
      JSON.stringify(watchGlass));

    const open = await ask('Object.keys(U().openFronts || {}).length');
    check('every front is SHUT — the frame is through the glass, not past it',
      open === 0, `open fronts ${open}`);

    // Room lights up, and the red dimension chains out of the way: this frame
    // is about what can be SEEN through the glass.
    await ask(`(() => {
      U().setShowDimensions(false);
      U().setShowFrontDimensions(false);
      U().setBrightness(2.2);
      return true;
    })()`);
    await page.sleep(500);
    const shot = await aim('ccWatchGlass', { dist: 1.15, deg: 45, sway: 0.0 });
    check('the camera is placed at 45° off the pane itself', Boolean(shot), JSON.stringify(shot));
    await page.sleep(1600);
    await page.screenshot(`${SHOTS}f1-pane-through.png`);

    // …and the same object in CONTOUR, where the pane keeps its own conduct
    // and still paints nothing solid.
    await ask('U().setContourView(true)');
    await page.sleep(1200);
    await page.screenshot(`${SHOTS}f1-pane-contour.png`);
    await ask('U().setContourView(false)');
    await page.sleep(400);

    // ── AND THE PANE THE LICENCE NAMES: the GLAZED DOOR's own ─────────────
    //
    // ~548-575 is the glazed door's pane, and it was still on the transmission
    // path — which is why a wardrobe photographed through its own doors came
    // back black however low T57 and T58 pushed the watch pane's opacity.
    await fresh('F1 the glazed door');
    const glazed = await buildWatchUnit({ glazed: true, doors: true });
    check('a wardrobe with GLAZED doors, shut, is built',
      glazed.glazedLeaves > 0, JSON.stringify(glazed));
    const doorGlass = await materialOf('ccGlassPane');
    check('the door pane is alpha glass on the spec\'s own numbers',
      doorGlass && doorGlass.type === 'MeshStandardMaterial'
        && doorGlass.transparent === true
        && doorGlass.opacity >= 0.2 && doorGlass.opacity <= 0.35
        && doorGlass.depthWrite === false
        && (doorGlass.transmission === null || doorGlass.transmission === 0)
        && doorGlass.renderOrder === 20,
      JSON.stringify(doorGlass));
    // A cabinet's own light behind the doors — glass over a black box is a
    // black box, which is the one thing this frame must not be able to be.
    const lit = await ask(`(() => {
      const res = P().unitResult(${JSON.stringify(glazed.id)});
      const shelves = (res.panels || []).filter((p) => p.role === 'shelf');
      if (!shelves.length) return 0;
      let n = 0;
      for (const sh of shelves) {
        P().addLightingItem({ unitId: ${JSON.stringify(glazed.id)}, kind: 'shelf', ref: sh.id });
        n += 1;
      }
      P().setLighting({ on: true });
      U().setShowDimensions(false);
      U().setBrightness(1.8);
      return n;
    })()`);
    check('the carcass behind the doors is lit', lit > 0, `strips ${lit}`);
    await page.sleep(900);
    await aim('ccGlassPane', { dist: 2.9, deg: 14, sway: 0.85 });
    await page.sleep(1600);
    await page.screenshot(`${SHOTS}f1-door-glass-through.png`);
  }

  // ══ F2 · THE PANE'S LIGHT COMES FROM THE BACK OF THE SHELF ════════════════
  //
  // The owner: *"światło jest na krawędzi półki i oświetla fronty szuflad, a
  // powinno być z tyłu na półce."*  The glass births its own strip now — one
  // ordinary `kind: 'shelf'` record at the aperture's BACK edge — so the room
  // can go dark and the pane still glows from behind, with nothing of it
  // reaching the drawer fronts below.
  if (runs('f2')) {
    await fresh('F2 the light moves back');
    const unit = await buildWatchUnit({ glazed: false, doors: false, ledDemo: true });
    check('a watch drawer under a glass shelf, lights ON', unit.panes > 0, JSON.stringify(unit));

    // THE RECORD, off the engine — the strip is the glass's own, at the rear.
    const born = await ask(`(() => {
      const res = P().unitResult(${JSON.stringify(unit.id)});
      const pane = (res.assemblies.watchGlass || [])[0];
      const shelf = (res.panels || []).find((p) => p.id === pane.shelfId);
      return {
        strip: pane.strip,
        shelf: shelf.box,
        fromBack: pane.strip.box.z - shelf.box.z,
        shelfDepth: shelf.box.d,
      };
    })()`);
    check('ONE strip, born by the glass, at the BACK of its shelf',
      born.strip && born.strip.kind === 'shelf' && born.fromBack * 2 < born.shelfDepth,
      `z ${born.fromBack} mm from the back of a ${born.shelfDepth} mm shelf, `
        + `${born.strip.length_mm} mm long`);

    const drawn = await countFlag('ccLedStrip');
    check('and `LedStrips.jsx` draws it with no special case', drawn >= 1, `strips drawn ${drawn}`);

    // The room goes LOW — the LED demo's own dim — so the only thing lighting
    // the pane is the strip behind it.
    await ask(`(() => {
      U().setShowDimensions(false);
      U().setShowFrontDimensions(false);
      U().setBrightness(1);
      return true;
    })()`);
    const open = await ask('Object.keys(U().openFronts || {}).length');
    check('the drawer is SHUT', open === 0, `open fronts ${open}`);
    await page.sleep(600);
    // From in front and a little above: the pane at the top of the frame and
    // the drawer fronts below it, so the claim "the fronts are NOT washed" is
    // in the same picture as the glow.
    const shot = await aim('ccWatchGlass', { dist: 1.5, deg: 22, sway: 0.05 });
    check('the camera holds pane and drawer fronts in one frame', Boolean(shot), JSON.stringify(shot));
    await page.sleep(1700);
    await page.screenshot(`${SHOTS}f2-pane-closed-glow.png`);
  }

  // ══ F3 · THE NUMBERS LEAVE THE SCREEN, ONE SLIDER REMAINS ════════════════
  //
  // *"jakieś dziwne ustawienia, po co mi to? ja nie chcę tego… jak już to
  // pasek albo pokrętło… jedynie wysokość — jeden pasek, przedłuż wycięcie J
  // na pionowych i tyle, nic więcej."*
  //
  // The proof is a CLICK PATH, not a screenshot of a component: a real mouse
  // press on the J strip of a real leaf, in the running app.
  if (runs('f3')) {
    await fresh('F3 one slider');
    const made = await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      P().updateUnitParams(r.id, { width: 1000, height: 2200, depth: 600 });
      P().addDoors(r.id);
      const d = P().project.design;
      P().setDesign({ fronts: { ...(d.fronts || {}), handle: { type: 'jpull' } } });
      P().settleLayout();
      U().setShowDimensions(false);
      U().setShowFrontDimensions(false);
      U().setBrightness(1.6);
      U().selectUnit(null);
      const res = P().unitResult(r.id);
      const leaf = (res.panels || []).find((p) => p.role === 'front' && p.meta && p.meta.jpull && p.meta.jpull.run);
      return leaf ? {
        id: r.id, panelId: leaf.id, edge: leaf.meta.jpull.edge, run: leaf.meta.jpull.run,
        box: leaf.box, slotDepth: leaf.cnc.jpull.profile.slotDepth,
      } : { id: r.id, panelId: null };
    })()`);
    check('a tall J-pull leaf carries a stopped vertical run',
      Boolean(made.panelId) && (made.edge === 'L' || made.edge === 'R'),
      JSON.stringify({ panel: made.panelId, edge: made.edge, run: made.run }));

    // Park the camera on the LEAF, close enough that a 500 mm run and a
    // 1400 mm one cannot be confused. Placed, never nudged — and placed BEFORE
    // the click point is projected, because the projection is of this camera.
    const parked = await ask(`(() => {
      const v = window.__cc.views.room || window.__cc.views.editor;
      v.scene.updateMatrixWorld(true);
      let mesh = null;
      v.scene.traverse((o) => {
        if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(made.panelId)}) mesh = o;
      });
      if (!mesh) return null;
      const e = mesh.matrixWorld.elements;
      const at = { x: e[12], y: e[13], z: e[14] };
      const c = v.camera; const t = v.controls;
      c.position.set(at.x - 0.95, at.y + 0.05, at.z + 4.0);
      if (t && t.target) { t.target.set(at.x, at.y, at.z); t.update(); }
      c.lookAt(at.x, at.y, at.z); c.updateProjectionMatrix();
      return at;
    })()`);
    check('the camera is parked on the leaf', Boolean(parked), JSON.stringify(parked));
    await page.sleep(1200);
    // BEFORE: the same leaf, same camera, the workshop's own 500 mm run.
    await page.screenshot(`${SHOTS}f3-slider-before.png`);

    // The J strip's own point, projected to the screen. The strip is machined
    // INTO the leaf, so this is where a finger would go: mid-run, a hair in
    // from the machined edge.
    const at = await ask(`(() => {
      const v = window.__cc.views.room || window.__cc.views.editor;
      v.scene.updateMatrixWorld(true);
      let mesh = null;
      v.scene.traverse((o) => {
        if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(made.panelId)}) mesh = o;
      });
      if (!mesh) return null;
      const b = ${JSON.stringify(made.box)};
      const run = ${JSON.stringify(made.run)};
      const inset = ${JSON.stringify(made.slotDepth)} / 2;
      // The leaf's own centred frame, in metres — the frame the hit test reads.
      const lx = (${JSON.stringify(made.edge)} === 'R' ? b.w / 2 - inset : inset - b.w / 2) / 1000;
      const ly = ((run.from + run.to) / 2 - b.h / 2) / 1000;
      // THREE is not on window, but every Vector3 in the scene knows its own
      // constructor, and the mesh's position is one.
      const V3 = Object.getPrototypeOf(mesh.position).constructor;
      const vec = mesh.localToWorld(new V3(lx, ly, 0));
      vec.project(v.camera);
      const el = v.gl && v.gl.domElement ? v.gl.domElement : document.querySelector('canvas');
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.left + (vec.x * 0.5 + 0.5) * rect.width),
        y: Math.round(rect.top + (-vec.y * 0.5 + 0.5) * rect.height),
      };
    })()`);
    check('the J strip has a screen point to press', Boolean(at), JSON.stringify(at));

    if (at) {
      await page.mouse('mousePressed', at.x, at.y, { button: 'left', clickCount: 1, buttons: 1 });
      await page.mouse('mouseReleased', at.x, at.y, { button: 'left', clickCount: 1, buttons: 0 });
      await page.sleep(800);
    }
    const opened = await page.evaluate(`
      const el = document.querySelector('[data-jpull-run-modal]');
      const sliders = document.querySelectorAll('[data-jpull-run-modal] input');
      return el ? { panel: el.getAttribute('data-jpull-run-modal'), inputs: sliders.length } : null;
    `);
    check('clicking the J strip opens the window, with ONE control in it',
      Boolean(opened) && opened.inputs === 1, JSON.stringify(opened));

    // Drive the slider with real key events — a range input answers them, and
    // React sees a genuine change rather than a value poked into the DOM.
    const before = await ask(`(P().units[0].params.front_jpull || {})[${JSON.stringify(made.panelId)}] || null`);
    await page.evaluate("document.querySelector('[data-jpull-run-slider=\"1\"]').focus(); return true;");
    // `End` takes a range input to its own maximum — here the leaf's own
    // ceiling, so the frame shows the longest J this door can carry.
    await page.key('End', { code: 'End', windowsVirtualKeyCode: 35 });
    await page.sleep(400);
    for (let i = 0; i < 6; i += 1) {
      await page.key('ArrowLeft', { code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
    }
    await page.sleep(900);
    const after = await ask(`(() => {
      const own = (P().units[0].params.front_jpull || {})[${JSON.stringify(made.panelId)}] || null;
      const res = P().unitResult(P().units[0].id);
      const leaf = (res.panels || []).find((p) => p.id === ${JSON.stringify(made.panelId)});
      return { own, run: leaf && leaf.meta.jpull ? leaf.meta.jpull.run : null };
    })()`);
    check('the slider lengthens THIS leaf\'s run, live',
      after.own && after.run && (after.run.to - after.run.from) > (made.run.to - made.run.from),
      `was ${made.run.to - made.run.from} mm, now ${after.run ? after.run.to - after.run.from : '?'} mm `
        + `(before ${JSON.stringify(before)})`);

    const shown = await page.evaluate(`
      const v = document.querySelector('[data-jpull-run-value="1"]');
      return v ? v.textContent.trim() : null;
    `);
    check('and the window says the number back', Boolean(shown), String(shown));

    // THE MESH ITSELF, measured — not read off a picture. The J is machined
    // INTO the leaf, so the claim "the strip is longer" is a claim about where
    // the notch's vertices are, and that is a number.
    const notch = await ask(`(() => {
      const v = window.__cc.views.room || window.__cc.views.editor;
      v.scene.updateMatrixWorld(true);
      let mesh = null;
      v.scene.traverse((o) => {
        if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(made.panelId)}) mesh = o;
      });
      if (!mesh) return null;
      const a = mesh.geometry.attributes.position.array;
      const halfW = ${made.box.w} / 2 / 1000;
      const halfH = ${made.box.h} / 2 / 1000;
      const slot = ${made.slotDepth} / 1000;
      let top = -9; let bottom = 9;
      for (let i = 0; i < a.length; i += 3) {
        const x = a[i]; const y = a[i + 1];
        const near = ${JSON.stringify(made.edge)} === 'R' ? (x > halfW - slot) : (x < slot - halfW);
        if (!near) continue;
        if (y > halfH - 1e-4 || y < -halfH + 1e-4) continue;   // the board's own ends
        if (y > top) top = y;
        if (y < bottom) bottom = y;
      }
      return { topMm: Math.round((top + halfH) * 1000), bottomMm: Math.round((bottom + halfH) * 1000) };
    })()`);
    check('the DRAWN notch really is longer — the mesh, measured',
      notch && notch.topMm > made.run.to + 100 && notch.bottomMm === made.run.from,
      `the notch now runs ${notch ? `${notch.bottomMm}–${notch.topMm}` : '?'} mm, `
        + `against ${made.run.from}–${made.run.to} before`);
    // …and its NEIGHBOUR, which nobody touched, still carries the profile's own
    // run: the override is per LEAF, and the frame shows both at once.
    const neighbour = await ask(`(() => {
      const res = P().unitResult(P().units[0].id);
      const other = (res.panels || []).find((p) => p.role === 'front' && p.meta
        && p.meta.jpull && p.meta.jpull.run && p.id !== ${JSON.stringify(made.panelId)});
      return other ? { id: other.id, run: other.meta.jpull.run } : null;
    })()`);
    check('and the leaf beside it keeps the workshop\'s own run',
      neighbour && (neighbour.run.to - neighbour.run.from) === (made.run.to - made.run.from),
      JSON.stringify(neighbour));
    // The frame: the window standing BESIDE the door, the strip visibly longer.
    await page.screenshot(`${SHOTS}f3-slider.png`);
  }

  // ══ F5 · PROPS v1 — THE TOGGLE, GREYED, WITH ITS REASON ══════════════════
  //
  // T58 F8, point 1, verbatim: *"If the bucket or manifest is missing at run
  // time: build the whole machinery anyway, ship the toggle GREYED with a
  // one-line reason, skip the dressing walk and note it — nothing throws."*
  //
  // That is the branch this turn is on. The pack lives in the Supabase bucket
  // `props/`; this container cannot reach ANY bucket — the agent proxy refuses
  // CONNECT to the storage host, and the known-good `hardware` bucket 403s
  // identically — so "the bucket is full" is unverifiable here, not disproved.
  // The dressing walk is skipped and this frame is what is shipped instead.
  if (runs('f5')) {
    await fresh('F5 props');
    await ask(`(() => {
      const r = P().addUnit('WARDROBE');
      P().updateUnitParams(r.id, { width: 900, height: 2200, depth: 600 });
      P().addDrawers(r.id, 2);
      const items = P().units.find((u) => u.id === r.id).params.sections[0].items
        .filter((i) => i.kind === 'drawer');
      P().setDrawerWatchInsert(r.id, items[items.length - 1].id, true);
      P().settleLayout();
      U().setShowDimensions(false);
      U().selectUnit(null);
      return true;
    })()`);
    await page.sleep(700);
    const control = await page.evaluate(`
      const el = document.querySelector('[data-props-toggle="1"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').trim(),
        disabled: el.disabled === true,
        state: el.getAttribute('data-props-state'),
        reason: el.getAttribute('title'),
        visible: r.width > 0 && r.height > 0,
        x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
      };
    `);
    check('the Props toggle is ON SCREEN, in the view-bar family',
      Boolean(control) && control.visible && control.text === 'Props', JSON.stringify(control && {
        text: control.text, visible: control.visible,
      }));
    check('…GREYED, because the pack is not reachable from here',
      Boolean(control) && control.disabled && control.state === 'absent',
      `disabled ${control?.disabled}, state ${control?.state}`);
    check('…and it carries its REASON, in words',
      Boolean(control?.reason) && /not reachable|not published|no storage bucket/.test(control.reason),
      String(control?.reason));
    // Pressing a greyed control must do nothing at all — and above all must
    // not throw. This is the whole of point 1's last clause.
    const before = await ask('U().props');
    if (control) {
      await page.mouse('mousePressed', control.x, control.y, { button: 'left', clickCount: 1, buttons: 1 });
      await page.mouse('mouseReleased', control.x, control.y, { button: 'left', clickCount: 1, buttons: 0 });
      await page.sleep(400);
    }
    const after = await ask('U().props');
    check('pressing it changes nothing, and nothing throws',
      before === false && after === false, `props ${before} → ${after}`);
    // NOTHING THROWS. The browser logs the refused request itself — it does
    // that for the hardware manifest in this container too, since the agent
    // proxy refuses CONNECT to any bucket — but a request the network declined
    // is not code throwing, and no exception may escape. So the claim is made
    // on EXCEPTIONS, which is what point 1's last clause is about.
    const thrown = page.errors.map(String)
      .filter((e) => !/Failed to load resource/i.test(e))
      .filter((e) => !/favicon/i.test(e));
    check('nothing THROWS — the refused request is logged, never raised',
      thrown.length === 0, thrown.slice(0, 2).join(' | ') || 'no exceptions at all');
    // The frame: the toolbar with the greyed control, hovered so the reason
    // is the thing being photographed.
    await page.hover('[data-props-toggle="1"]');
    await page.sleep(500);
    await page.screenshot(`${SHOTS}f5-props-greyed.png`);
  }

} catch (e) {
  // A section that throws must SAY so: a walk that swallows its own error and
  // reports "all ok" is exactly how a frame nobody took gets believed.
  check('the walk ran to the end', false, e && e.message ? e.message : String(e));
} finally {
  const bad = steps.filter((s) => !s.ok);
  process.stdout.write(`\n${steps.length} check(s), ${bad.length === 0 ? 'all ok.' : `${bad.length} FAILED.`}\n`);
  await page.close();
  process.exit(bad.length === 0 ? 0 : 1);
}
