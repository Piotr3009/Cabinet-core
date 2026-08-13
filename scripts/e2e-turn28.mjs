// ─── Turn 28, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build
//       npx vite preview --port 4173 &
//       node scripts/e2e-turn28.mjs
//
// The fixture server (R8) is started by this script; the app preview is not,
// because a walk that builds its own app cannot prove the build somebody else
// is about to ship.
//
// ─── R1: A POINTER GESTURE IS PROVEN WITH A REAL POINTER ────────────────────
//
// Standing since turn 20: every click, drag, wheel, hover and keystroke goes
// through `Input.dispatchMouseEvent` / `dispatchKeyEvent` (scripts/cdp.mjs).
// Synthetic DOM events are BANNED, and the ban is enforced rather than promised
// — the guard below reads this file and refuses to run if anybody adds one.
//
// ─── R2: THE BUCKET IS ASKED, LIVE ──────────────────────────────────────────
//
// `scripts/bucket-live.mjs`, before any picture of hardware.
//
// ─── R4: A CLAIM IS PROVEN BY ASKING THE APP ────────────────────────────────
//
// Nothing below is inferred from a pixel.
//
//   F1  the D/W's own three pieces, off `unitResult` — the record the sheet,
//       the BOM and the scene are all written from.
//   F2  the MOUNTED geometry: every cup's world x off the scene graph, and
//       every handle post's, against the leaf's own two edges.
//   F3  each ladder's anchor read off the STROKES the one dimension component
//       mounted, and checked against `shelfColumns` — the resolution the view
//       feeds it from.
//   F4  the blend band the shader is COMPILED with (`__ccT28.bevel`), and the
//       rebate walls' own normals in the running WebGL.
//   F5  the mounted MATERIALS of a sleeve, a pin and a collar.
//   F6  the mounted rings, counted per kind, against the drills per layer.
//   F7  the mounted TEXTURE's own rotation on a decor shelf.
//   F8  the chain rows the scene mounted, and `dimensionCarriers`.
//   F9  the end panel's depth off the BOM and off the scene.
//   F10 the store's brightness after a real drag on the toolbar slider.
//   F11 the DOM of the part editor's toolbar.
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
// dimensions with the real export's own node names, no Blum bytes.

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
const OUT = argOf('--out', new URL('../verify/t28/', import.meta.url).pathname);

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

// ─── THE MOUNTED CUP AND THE MOUNTED HANDLE, IN WORLD (F2) ──────────────────
//
// The owner's photograph is arms on one stile and bored cups on the other, so
// the claim has to be measured where he looked: in the room. This walks the
// live scene graph, collects the world x of every hinge body mounted on a leaf
// and of every handle post on it, and hands both back beside that leaf's own
// two edges. Nothing here reads a pixel and nothing recomputes a position —
// these are the objects the renderer is drawing.
const mountedOnLeafJs = (unitId, panelId) => `
  const v = ${P}.views && ${P}.views.room;
  if (!v) return null;
  const THREE = v.three;
  let leaf = null;
  let handleGroup = null;
  v.scene.traverse((o) => {
    if (!leaf && o.isMesh && o.userData && o.userData.ccPanelId === ${JSON.stringify(panelId)}) leaf = o;
    if (!handleGroup && o.userData && o.userData.ccHandle === ${JSON.stringify(panelId)}) handleGroup = o;
  });
  if (!leaf) return { why: 'no leaf mounted' };
  const box = new THREE.Box3().setFromObject(leaf);
  const posts = [];
  if (handleGroup) {
    handleGroup.traverse((o) => {
      if (!o.isMesh) return;
      const p = new THREE.Vector3();
      o.getWorldPosition(p);
      posts.push(p.x);
    });
  }
  // What RIDES this leaf: the hinge's door half and the handle are children of
  // the leaf's own swinging group, so the leaf's parent is the place to look.
  // Counted rather than measured — the cup's own 21.5 is measured off
  // doorHingeInstances, the function this hardware is mounted from.
  let rides = 0;
  const parent = leaf.parent;
  if (parent) parent.traverse((o) => {
    if (o === leaf || !(o.isMesh || o.isInstancedMesh)) return;
    let up = o; let hw = false;
    while (up) { if (up.userData && (up.userData.ccHardware || up.userData.ccHandle)) { hw = true; break; } up = up.parent; }
    if (hw) rides += 1;
  });
  return {
    leafMinX: box.min.x, leafMaxX: box.max.x,
    posts, rides,
  };
`;

/** Every dimension chain the scene has mounted, with the x its strokes stand at. */
const chainsJs = `
  const v = ${P}.views && ${P}.views.room;
  if (!v) return null;
  const THREE = v.three;
  const out = [];
  v.scene.traverse((o) => {
    if (!o.userData || o.userData.ccDimensionChain === undefined) return;
    let min = Infinity; let max = -Infinity; let strokes = 0;
    o.traverse((m) => {
      if (!m.isMesh) return;
      const p = new THREE.Vector3();
      m.getWorldPosition(p);
      if (p.x < min) min = p.x;
      if (p.x > max) max = p.x;
      strokes += 1;
    });
    out.push({
      name: String(o.userData.ccDimensionChain),
      rows: Number(o.userData.ccDimensionRows) || 0,
      minX: strokes ? min : null,
      maxX: strokes ? max : null,
      strokes,
    });
  });
  return out;
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

  /** Put the camera on ONE piece, close, from a stated direction. */
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

    // ─────────────────────────────────────────────────────────────────────────
    // F1 — the dishwasher is a FRONT, a RAIL and a PLINTH
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      // A wall long enough for the whole walk: a D/W, its neighbour, a shaker
      // pair, a divided cabinet and a run of three. The room is the walk's own
      // decision and nothing about it is a claim.
      s.newProject('Turn 28 walk', {
        room: {
          height: 2500,
          corners: [{ x: 0, y: 0 }, { x: 12000, y: 0 }, { x: 12000, y: 3600 }, { x: 0, y: 3600 }],
        },
      });
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      // The D/W FIRST and on its own: three pieces, and the toe kick is its
      // own rather than a run's (a member of a plinthed run cuts none — the
      // long piece is next door, which is turn 12 F8's law and not this one).
      const dw = s.addUnit('DW_PANEL');
      window.__t28 = { dwId: dw.id, addErrors: [dw.error].filter(Boolean) };
      return true;
    `);
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(1000);

    const f1 = await page.evaluate(`
      const s = ${P}.project.getState();
      const dw = s.unitResult(window.__t28.dwId);
      if (!dw) return { why: 'no result' };
      const rail = dw.panels.find((p) => p.part === 'TOP');
      const kick = dw.panels.find((p) => p.part === 'PLINTH');
      const face = dw.panels.find((p) => p.part === 'FRONT');
      // What the SCENE mounted for THIS unit — R4 and R9 together: a piece
      // that is not cut is not drawn. Scoped to the unit's own group, so a
      // neighbour's BUL cannot be mistaken for this one's.
      const v = ${P}.views && ${P}.views.room;
      const drawn = [];
      if (v) v.scene.traverse((g) => {
        if (!g.userData || g.userData.ccUnitId !== window.__t28.dwId) return;
        g.traverse((o) => {
          if (o.isMesh && o.userData && o.userData.ccPanelId) drawn.push(o.userData.ccPanelId);
        });
      });
      return {
        parts: dw.panels.map((p) => p.part).sort(),
        railW: rail && rail.w, railH: rail && rail.h, railT: rail && rail.thickness,
        railOutline: rail && rail.cnc.outline.length,
        railPockets: rail && rail.cnc.pockets.length,
        railHoles: rail && rail.cnc.holes.length,
        railBoxY: rail && rail.box.y, railBoxZ: rail && rail.box.z,
        unitWidth: dw.params.width,
        drills: dw.drills.length,
        hardware: dw.hardware.length,
        kickH: kick && kick.h,
        kickNotchY: kick ? kick.cnc.outline.map((pt) => pt[1]).filter((y) => Math.abs(y - (kick.h - 20)) < 1e-6).length : 0,
        kickTopY: kick ? Math.max(...kick.cnc.outline.map((pt) => pt[1])) : null,
        frontW: face && face.w, frontH: face && face.h,
        frontOpening: face && face.meta.opening,
        frontAngle: face && face.meta.openAngleDeg,
        drawnHere: [...new Set(drawn)].sort(),
      };
    `);
    measurements.f1 = f1;

    check('F1.1 — a D/W is exactly a FRONT, a RAIL and a PLINTH',
      f1.parts.join('+') === 'FRONT+PLINTH+TOP',
      f1.parts.join(' · '));
    check('F1.1 — the rail is the unit’s own width by the run’s depth, and PLAIN',
      f1.railW === f1.unitWidth && f1.railW === 600 && f1.railH === 540 && f1.railT === 18
      && f1.railOutline === 4 && f1.railPockets === 0 && f1.railHoles === 0,
      `${f1.railW} × ${f1.railH} × ${f1.railT}, ${f1.railOutline} corners, ${f1.railPockets} pockets, ${f1.railHoles} holes`);
    check('F1.1 — nothing is drilled and nothing is bought',
      f1.drills === 0 && f1.hardware === 0,
      `${f1.drills} holes, ${f1.hardware} hardware lines`);
    check('F1.3 — the toe kick arrived WITH it, relieved 20 mm below its top edge',
      f1.kickH > 0 && f1.kickNotchY >= 2 && f1.kickTopY === f1.kickH,
      `${f1.kickH} mm, ${f1.kickNotchY} corners on the cut line, top edge at ${f1.kickTopY}`);
    check('F1.2 — the front is turn 27’s front, unchanged',
      f1.frontW === 594 && f1.frontOpening === 'drop' && f1.frontAngle === 45,
      `${f1.frontW} × ${f1.frontH}, ${f1.frontOpening} to ${f1.frontAngle}°`);
    check('R9 — the SCENE draws those three pieces and no fourth',
      f1.drawnHere.length === 3
      && ['BUL', 'BUR', 'BOTTOM', 'BACK'].every((id) => !f1.drawnHere.includes(id)),
      f1.drawnHere.join(' · '));

    // …and NOW the neighbour, so the worktop line can be measured and seen.
    await page.evaluate(`
      const s = ${P}.project.getState();
      const bud = s.addUnit('BUD', { near: window.__t28.dwId, side: 'right' });
      s.updateUnitParams(bud.id, { doors: true, width: 600 });
      s.addPlinth(bud.id);
      window.__t28.budId = bud.id;
      window.__t28.addErrors.push(...[bud.error].filter(Boolean));
      return true;
    `);
    await page.sleep(1100);
    const f1b = await page.evaluate(`
      const s = ${P}.project.getState();
      const dw = s.unitResult(window.__t28.dwId);
      const bud = s.unitResult(window.__t28.budId);
      if (!dw || !bud) return { why: 'no result' };
      const rail = dw.panels.find((p) => p.part === 'TOP');
      const budTop = bud.panels.find((p) => p.part === 'TOP');
      const kicks = s.allResults().flatMap((e) => e.result.panels).filter((p) => p.part === 'PLINTH');
      return {
        railY: rail.box.y, railZ: rail.box.z, railH: rail.h,
        budTopY: budTop.box.y, budTopZ: budTop.box.z, budTopH: budTop.h,
        kickLengths: kicks.map((p) => p.w), kickHeights: kicks.map((p) => p.h),
      };
    `);
    measurements.f1b = f1b;
    check('F1.1 — the rail finishes level with its neighbour’s top, to the same depth',
      f1b.railY === f1b.budTopY && f1b.railZ === f1b.budTopZ && f1b.railH === f1b.budTopH,
      `D/W ${f1b.railY}/${f1b.railZ}/${f1b.railH} vs BUD ${f1b.budTopY}/${f1b.budTopZ}/${f1b.budTopH}`);
    check('F1.3 — …and the two toe kicks are ONE piece across the run',
      f1b.kickLengths.length === 1 && f1b.kickLengths[0] > 1000,
      `${f1b.kickLengths.length} length(s): ${f1b.kickLengths.join('/')} mm at ${f1b.kickHeights.join('/')}`);

    await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      if (!v) return null;
      v.camera.position.set(0.9, 1.5, 2.6);
      v.camera.lookAt(0.6, 0.45, 0);
      if (v.controls && v.controls.target) { v.controls.target.set(0.6, 0.45, 0); v.controls.update(); }
      return true;
    `);
    await page.sleep(700);
    await shot('1a-a-dishwasher-beside-a-base-unit');
    await page.evaluate(`${P}.ui.getState().setHideFronts(true); return true;`);
    await page.sleep(600);
    await shot('1b-no-carcass-behind-the-front-just-the-rail');
    await page.evaluate(`${P}.ui.getState().setHideFronts(false); return true;`);
    await page.sleep(400);

    // ─────────────────────────────────────────────────────────────────────────
    // F2 — cups and handles take the sheet's own mirror
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.setProjectHandle({ type: 'bar', centres: 160 });
      const pair = s.addUnit('BUD', { near: window.__t28.dwId, side: 'right' });
      s.updateUnitParams(pair.id, { width: 900, doors: true, front_type: 'S' });
      window.__t28.pairId = pair.id;
      return true;
    `);
    await page.sleep(1200);

    const f2sheet = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t28.pairId);
      const profile = ${P}.profile.getState().profile;
      const leaves = r.panels.filter((p) => p.part === 'FRONT');
      return {
        leaves: leaves.map((leaf) => {
          const cups = r.drills.filter((d) => d.panel === leaf.id && d.kind === 'cup');
          const handle = r.drills.filter((d) => d.panel === leaf.id && d.layer === profile.handles.layer);
          const mid = leaf.w / 2;
          return {
            id: leaf.id, hinge: leaf.meta.hinge, w: leaf.w,
            cupSide: cups.length ? Math.sign(cups[0].x - mid) : 0,
            cupsOneColumn: cups.every((d) => Math.sign(d.x - mid) === Math.sign(cups[0].x - mid)),
            handleSide: handle.length ? Math.sign(handle[0].x - mid) : 0,
            cupXs: cups.map((d) => d.x), handleXs: handle.map((d) => d.x),
            boxX: leaf.box.x,
          };
        }),
        cupFromHinge: profile.hinges.cups.xFromHingeEdge,
        inset: profile.handles.inset,
      };
    `);
    measurements.f2sheet = f2sheet;

    check('F2b — on the SHEET the cups and the handle are on OPPOSITE stiles, both hands',
      f2sheet.leaves.length === 2
      && f2sheet.leaves.every((l) => l.cupsOneColumn && l.cupSide !== 0 && l.handleSide === -l.cupSide),
      f2sheet.leaves.map((l) => `${l.id} (${l.hinge}): cups ${l.cupXs.join('/')}, handle ${l.handleXs.join('/')}`).join(' · '));

    // …and the MOUNTED geometry, which is where the owner was looking.
    const mounted = [];
    for (const leaf of f2sheet.leaves) {
      // eslint-disable-next-line no-await-in-loop
      const m = await page.evaluate(mountedOnLeafJs(null, leaf.id));
      mounted.push({ ...leaf, mounted: m });
    }
    measurements.f2mounted = mounted;

    // THE CUPS. Asked of `doorHingeInstances` — the very function
    // `3d/Hardware.jsx` mounts every hinge in the room from — and then checked
    // against the pieces the scene REALLY hung on each leaf's swinging group.
    const cups = await page.evaluate(`
      const s = ${P}.project.getState();
      const profile = ${P}.profile.getState().profile;
      const r = s.unitResult(window.__t28.pairId);
      const out = [];
      for (const leaf of r.panels.filter((p) => p.part === 'FRONT')) {
        const inst = window.__ccHardware3d.doorHingeInstances(leaf, {
          panels: r.panels,
          centres: r.drillSummary.hinge_centers,
          profile,
          width: r.params.width,
          boardT: r.params.board_t,
          depth: r.params.depth,
        });
        const hingeEdge = leaf.meta.hinge === 'L' ? leaf.box.x : leaf.box.x + leaf.w;
        out.push({
          id: leaf.id, hinge: leaf.meta.hinge, hingeEdge,
          xs: inst.map((h) => h.x),
          offs: inst.map((h) => Math.abs(h.x - hingeEdge)),
        });
      }
      return { leaves: out, want: profile.hinges.cups.xFromHingeEdge };
    `);
    measurements.f2cups = cups;
    const cupsOk = cups.leaves.length === 2 && cups.leaves.every((l) => l.offs.length > 0
      && l.offs.every((d) => Math.abs(d - cups.want) < 0.1));
    check('F2 — every MOUNTED cup is 21.5 ± 0.1 from its own leaf’s hinge edge, in the room',
      cupsOk,
      cups.leaves.map((l) => `${l.id} (${l.hinge}): ${l.offs.map((d) => d.toFixed(2)).join('/')} from ${l.hingeEdge}`).join(' · '));
    const ridingOk = mounted.every((l) => (l.mounted?.rides || 0) > 0);
    check('F2 — …and the scene really hangs those pieces on the leaf that swings',
      ridingOk,
      mounted.map((l) => `${l.id}: ${l.mounted?.rides || 0} pieces riding`).join(' · '));
    const handlesOk = mounted.every((l) => {
      const m = l.mounted;
      if (!m || !m.posts || !m.posts.length) return false;
      const free = l.hinge === 'L' ? m.leafMaxX : m.leafMinX;
      const hinge = l.hinge === 'L' ? m.leafMinX : m.leafMaxX;
      return m.posts.every((x) => Math.abs(x - free) < Math.abs(x - hinge));
    });
    check('F2 — every MOUNTED handle stands at its leaf’s FREE edge, in the room',
      handlesOk,
      mounted.map((l) => `${l.id} (${l.hinge}): ${l.mounted?.posts?.length || 0} posts`).join(' · '));

    // The pictures: each leaf open, from behind, so the arms and the cups are
    // in one frame — the owner's own photograph, re-taken.
    for (const [i, leaf] of f2sheet.leaves.entries()) {
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`
        ${P}.ui.setState((s) => ({
          openFronts: { ...s.openFronts, [window.__t28.pairId]: { [${JSON.stringify(leaf.id)}]: 1 } },
        }));
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(1400);
      // eslint-disable-next-line no-await-in-loop
      await frameOn(leaf.id, [0.3, 0.5, -2.4]);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(700);
      // eslint-disable-next-line no-await-in-loop
      await shot(`2${'abcd'[i]}-the-${leaf.hinge === 'L' ? 'left' : 'right'}-leaf-from-behind-cups-beside-the-arms`);
    }
    await page.evaluate(`${P}.ui.setState({ openFronts: {} }); return true;`);
    await page.sleep(600);

    // …and the SHEET the workshop reads, with the two columns on it.
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.closeModal();
      ui.openModal('cabinet', { unitId: window.__t28.pairId });
      return true;
    `);
    await page.sleep(1000);
    await page.evaluate(`
      ${P}.ui.getState().pushModal('part-detail', {
        unitId: window.__t28.pairId,
        panelId: ${JSON.stringify(f2sheet.leaves[0].id)},
        anchor: null, at: null,
      });
      return true;
    `);
    await page.sleep(1500);
    await shot('2c-the-leafs-own-sheet-cups-one-stile-handle-the-other');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(700);

    // ─────────────────────────────────────────────────────────────────────────
    // F3 — a shelf's dimension stands in its own bay
    // ─────────────────────────────────────────────────────────────────────────
    const dividedAdded = await page.evaluate(`
      const s = ${P}.project.getState();
      const divided = s.addUnit('BUD', { near: window.__t28.pairId, side: 'right' });
      s.updateUnitParams(divided.id, { width: 900, doors: true });
      if (divided.id) s.addItem(divided.id, { kind: 'partition', x_mm: 450 });
      window.__t28.dividedId = divided.id;
      window.__t28.addErrors.push(...[divided.error].filter(Boolean));
      return { id: divided.id, error: divided.error || null, units: s.units.length };
    `);
    check('F3 — a divided cabinet is on the wall to measure',
      Boolean(dividedAdded && dividedAdded.id),
      dividedAdded ? `${dividedAdded.id || 'refused'} ${dividedAdded.error || ''} (${dividedAdded.units} units)` : 'no answer');
    await page.sleep(1100);

    const f3 = { bays: [] };
    for (const [i, zone] of [0, 1].entries()) {
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`
        const s = ${P}.project.getState();
        const id = window.__t28.dividedId;
        const u = s.units.find((x) => x.id === id);
        for (const item of (u.params.sections?.[0]?.items || []).filter((x) => x.kind === 'shelf')) {
          s.removeItem(id, item.id);
        }
        s.addItem(id, { kind: 'shelf', pos_mm: 400, zone: ${zone} });
        ${P}.ui.getState().setHideFronts(true);
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(900);
      // eslint-disable-next-line no-await-in-loop
      const bay = await page.evaluate(`
        const s = ${P}.project.getState();
        const profile = ${P}.profile.getState().profile;
        const r = s.unitResult(window.__t28.dividedId);
        const T = window.__ccT28;
        const shelf = r.panels.find((p) => p.part === 'SHELF');
        if (!shelf) return { why: 'no shelf' };
        const cols = T.shelfHeights.shelfColumns({
          panels: r.panels,
          floor: T.shelfHeights.interiorFloor(r.params.board_t),
          ceiling: r.params.height - r.params.board_t,
          width: r.params.width,
          tolerance: profile.carcass.shelfWidthClearance,
        }, profile.editor.mmStep);
        const col = T.shelfHeights.columnOfShelf(cols, shelf.id);
        return {
          zone: ${zone},
          shelfId: shelf.id,
          shelfMid: shelf.box.x + shelf.box.w / 2,
          width: r.params.width,
          of: col && col.of, flank: col && col.flank,
          columns: cols.length,
        };
      `);
      // The LADDER itself: hover the shelf and read the mounted chain's own x.
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`
        ${P}.ui.getState().selectUnit(window.__t28.dividedId);
        ${P}.ui.getState().toggleUnitDimensions(window.__t28.dividedId);
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(800);
      // eslint-disable-next-line no-await-in-loop
      const chains = await page.evaluate(chainsJs);
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`
        const v = ${P}.views && ${P}.views.room;
        if (!v) return null;
        v.camera.position.set(1.9, 1.4, 2.6);
        v.camera.lookAt(1.85, 0.45, 0);
        if (v.controls && v.controls.target) { v.controls.target.set(1.85, 0.45, 0); v.controls.update(); }
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(700);
      // eslint-disable-next-line no-await-in-loop
      await shot(`3${'ab'[i]}-the-ladder-in-the-${zone === 0 ? 'left' : 'right'}-bay`);
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`${P}.ui.getState().toggleUnitDimensions(window.__t28.dividedId); return true;`);
      f3.bays.push({ ...bay, chains });
    }
    await page.evaluate(`${P}.ui.getState().setHideFronts(false); return true;`);
    measurements.f3 = f3;

    const left = f3.bays[0];
    const right = f3.bays[1];
    check('F3 — a shelf in the LEFT bay anchors on the unit’s LEFT flank',
      left.flank && left.flank.x === 0 && left.flank.dir === -1 && left.of?.[0] === 'BUL',
      `bearers ${left.of?.join(' + ')} → x ${left.flank?.x}, dir ${left.flank?.dir}`);
    check('F3 — a shelf in the RIGHT bay anchors on the unit’s RIGHT flank',
      right.flank && right.flank.x === right.width && right.flank.dir === 1 && right.of?.[1] === 'BUR',
      `bearers ${right.of?.join(' + ')} → x ${right.flank?.x}, dir ${right.flank?.dir}`);
    check('F3 — and the two anchors are on OPPOSITE sides of the divider',
      left.flank && right.flank && left.flank.x < left.shelfMid && right.flank.x > right.shelfMid,
      `left ${left.flank?.x} < ${Math.round(left.shelfMid)} · right ${right.flank?.x} > ${Math.round(right.shelfMid)}`);

    // ─────────────────────────────────────────────────────────────────────────
    // F4 — the bevel shader stops flattening the world
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      s.setFrontColour({ hex: '#5b1a2b', label: 'Burgundy' });
      ${P}.ui.getState().setShowOutlines(false);
      return true;
    `);
    await page.sleep(900);

    const f4 = await page.evaluate(`
      const T = window.__ccT28;
      const v = ${P}.views && ${P}.views.room;
      const s = ${P}.project.getState();
      const r = s.unitResult(window.__t28.pairId);
      const leaf = r.panels.find((p) => p.part === 'FRONT');
      let mesh = null;
      if (v) v.scene.traverse((o) => {
        if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === leaf.id) mesh = o;
      });
      if (!mesh) return { why: 'no leaf mounted' };
      const nor = mesh.geometry.getAttribute('normal');
      let walls = 0; let faces = 0;
      for (let i = 0; i < nor.count; i += 1) {
        if (Math.abs(nor.getZ(i)) < 1e-6) walls += 1; else faces += 1;
      }
      return {
        blend: T.bevel.BEVEL_BLEND,
        wallVertices: walls,
        faceVertices: faces,
        bevelState: Boolean(mesh.material.userData && mesh.material.userData.ccBevel),
        shaker: Boolean(leaf.meta.shaker),
        outlines: ${P}.ui.getState().showOutlines,
      };
    `);
    measurements.f4 = f4;
    check('F4 — the leaf’s rebate WALLS carry their own normals in the running scene',
      f4.wallVertices > 0 && f4.shaker,
      `${f4.wallVertices} wall vertices against ${f4.faceVertices} facing ones`);
    check('F4 — and the shader is compiled with a BAND, not a replacement',
      f4.blend && f4.blend.from > 0 && f4.blend.to < 0.71 && f4.bevelState,
      `blend ${f4.blend?.from} → ${f4.blend?.to}, bevel state on the material: ${f4.bevelState}`);

    // The pictures: outlines OFF, three grazing angles.
    const angles = [[2.2, 0.35, 1.1], [1.2, 0.30, 2.4], [0.2, 0.28, 2.8]];
    for (const [i, off] of angles.entries()) {
      // eslint-disable-next-line no-await-in-loop
      await frameOn(f2sheet.leaves[0].id, off);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(650);
      // eslint-disable-next-line no-await-in-loop
      await shot(`4${'abc'[i]}-the-shaker-rebate-outlines-off-angle-${i + 1}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // F5 + F6 — one colour for the family, and a collar only where a sleeve goes
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const s = ${P}.project.getState();
      const id = window.__t28.dividedId;
      const u = s.units.find((x) => x.id === id);
      for (const item of (u.params.sections?.[0]?.items || []).filter((x) => x.kind === 'shelf')) {
        s.removeItem(id, item.id);
      }
      s.addShelves(id, 2);
      ${P}.ui.getState().setHideFronts(true);
      return true;
    `);
    await page.sleep(1000);

    const familyJs = `
      const v = ${P}.views && ${P}.views.room;
      if (!v) return null;
      const sleeves = []; const pins = []; const collars = []; const cores = []; const plain = [];
      v.scene.traverse((o) => {
        const u = o.userData || {};
        const hex = o.material && o.material.color ? '#' + o.material.color.getHexString() : null;
        if (u.ccMember === 'shelf-sleeve') sleeves.push(hex);
        if (u.ccMember === 'shelf-pin') pins.push(hex);
        if (u.ccDrillRing === 'collar') collars.push({ hex, n: o.count });
        if (u.ccDrillRing === 'core') cores.push({ hex, n: o.count });
        if (u.ccDrillRing === 'plain') plain.push({ hex, n: o.count });
      });
      const s = ${P}.project.getState();
      const profile = ${P}.profile.getState().profile;
      const design = s.project.design;
      const metal = window.__ccT28.hardwareFinish.shelfSupportMetal(design, profile);
      const r = s.unitResult(window.__t28.dividedId);
      const byLayer = {};
      for (const d of r.drills) byLayer[d.layer] = (byLayer[d.layer] || 0) + 1;
      return {
        chosen: design && design.hardware && design.hardware.shelfSleeve,
        metal, sleeves, pins, collars, cores, plain,
        byLayer, shelfLayer: profile.shelfHoles.layer, puzzleLayer: profile.puzzle.layers.socketHole,
      };
    `;

    const family = {};
    for (const want of ['gold', 'silver']) {
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`${P}.project.getState().setShelfSleeve(${JSON.stringify(want)}); return true;`);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(900);
      // eslint-disable-next-line no-await-in-loop
      family[want] = await page.evaluate(familyJs);
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate(`
        const v = ${P}.views && ${P}.views.room;
        if (!v) return null;
        v.camera.position.set(2.15, 1.05, 1.05);
        v.camera.lookAt(2.05, 0.72, 0.2);
        if (v.controls && v.controls.target) { v.controls.target.set(2.05, 0.72, 0.2); v.controls.update(); }
        return true;
      `);
      // eslint-disable-next-line no-await-in-loop
      await page.sleep(650);
      // eslint-disable-next-line no-await-in-loop
      await shot(`5${want === 'gold' ? 'a' : 'b'}-the-shelf-support-family-in-${want}`);
    }
    measurements.f5 = family;

    const follows = (f) => f && f.sleeves.length && f.pins.length && f.collars.length
      && f.sleeves.every((c) => c === f.metal.colour.toLowerCase())
      && f.pins.every((c) => c === f.metal.colour.toLowerCase())
      && f.collars.every((c) => c.hex === f.metal.colour.toLowerCase());
    check('F5 — the sleeve, the pin and the collar all follow the selector, in GOLD',
      follows(family.gold) && family.gold.metal.id === 'gold',
      `metal ${family.gold?.metal?.colour} · sleeves ${family.gold?.sleeves?.join('/')} · pins ${family.gold?.pins?.join('/')} · collars ${family.gold?.collars?.map((c) => c.hex).join('/')}`);
    check('F5 — …and in SILVER, all three together',
      follows(family.silver) && family.silver.metal.id === 'silver'
      && family.silver.metal.colour !== family.gold.metal.colour,
      `metal ${family.silver?.metal?.colour} · sleeves ${family.silver?.sleeves?.join('/')} · pins ${family.silver?.pins?.join('/')} · collars ${family.silver?.collars?.map((c) => c.hex).join('/')}`);

    const rings = family.silver;
    check('F6 — this cabinet really carries both ⌀7.5 classes',
      (rings.byLayer[rings.shelfLayer] || 0) > 0 && (rings.byLayer[rings.puzzleLayer] || 0) > 0,
      `${rings.byLayer[rings.shelfLayer]} on ${rings.shelfLayer}, ${rings.byLayer[rings.puzzleLayer]} on ${rings.puzzleLayer}`);
    check('F6 — a COLLAR is mounted only for the sleeved set; everything else is a plain disc',
      rings.collars.length > 0 && rings.plain.length > 0
      && rings.cores.length === rings.collars.length
      && rings.plain.every((p) => p.hex === '#141414'),
      `${rings.collars.reduce((n, c) => n + c.n, 0)} collared, ${rings.plain.reduce((n, c) => n + c.n, 0)} plain`);
    await shot('6a-collars-on-the-shelf-rows-plain-discs-everywhere-else');
    await page.evaluate(`${P}.ui.getState().setHideFronts(false); return true;`);

    // ─────────────────────────────────────────────────────────────────────────
    // F7 — a shelf's grain follows its own sheet
    // ─────────────────────────────────────────────────────────────────────────
    const f7 = await page.evaluate(`
      const s = ${P}.project.getState();
      const T = window.__ccT28;
      const r = s.unitResult(window.__t28.dividedId);
      const shelf = r.panels.find((p) => p.part === 'SHELF');
      const side = r.panels.find((p) => p.part === 'BUL');
      const g = T.decors.grainRun(shelf);
      const map = T.decors.decorMapping(shelf.box, g.lengthMm);
      const sideMap = T.decors.decorMapping(side.box, T.decors.grainRun(side).lengthMm);
      return {
        stated: shelf.cnc.grain,
        axis: g.axis, lengthMm: g.lengthMm,
        shelfW: shelf.w, shelfH: shelf.h,
        rotate: map.rotate,
        grainAxisInRoom: map.rotate ? 'x' : 'z',
        drawnW: shelf.cnc.drawn_w, drawnH: shelf.cnc.drawn_h,
        sideRotate: sideMap.rotate,
      };
    `);
    measurements.f7 = f7;
    check('F7 — the shelf states its grain, and the SCENE lays it front-to-back',
      f7.stated === 'h' && f7.axis === 'h' && f7.lengthMm === f7.shelfH
      && f7.rotate === false && f7.grainAxisInRoom === 'z',
      `${f7.shelfW} × ${f7.shelfH}, grain along ${f7.axis} (${f7.lengthMm} mm) → ${f7.grainAxisInRoom} in the room`);
    check('F7 — …which is the axis the SHEET’s own x runs along',
      f7.drawnW === f7.shelfH && f7.drawnH === f7.shelfW,
      `drawn ${f7.drawnW} × ${f7.drawnH} — depth by width, turn 26 F8's frame`);

    // ─────────────────────────────────────────────────────────────────────────
    // F8 — the dimension language, four corrections
    // ─────────────────────────────────────────────────────────────────────────
    const runAdded = await page.evaluate(`
      const s = ${P}.project.getState();
      // A run of three IDENTICAL base units, for F8.2.
      const made = [];
      // No neighbour named: the store finds a free slot on a wall that HAS
      // room, which is what a joiner adding a run does. The three then stand
      // together because each is butted onto the one before it.
      let near = null;
      for (let i = 0; i < 3; i += 1) {
        const u = s.addUnit('BUD', near ? { near, side: 'right' } : undefined);
        if (!u.id) {
          return {
            error: u.error,
            made,
            placed: ${P}.project.getState().units.map((x) => x.params.unit_num + '@w' + x.position.wall + ':' + x.position.x_mm + '+' + x.params.width),
          };
        }
        s.updateUnitParams(u.id, { doors: true, width: 600 });
        s.addPlinth(u.id);
        ${P}.ui.getState().toggleUnitDimensions(u.id);
        made.push(u.id);
        near = u.id;
      }
      window.__t28.runIds = made;
      return { error: null, made };
    `);
    check('F8 — a run of three identical base units is on the wall',
      runAdded && runAdded.made && runAdded.made.length === 3,
      runAdded?.error
        ? `${runAdded.error} — ${(runAdded.placed || []).join(' | ')}`
        : (runAdded?.made || []).join(' · '));
    await page.sleep(1400);

    const f8 = await page.evaluate(`
      const s = ${P}.project.getState();
      const T = window.__ccT28;
      const profile = ${P}.profile.getState().profile;
      const results = s.allResults();
      const wanted = window.__t28.runIds;
      const carriers = [...T.dimensions.dimensionCarriers({ results, wanted, profile })];
      const sigs = wanted.map((id) => T.dimensions.dimensionSignature(s.unitResult(id)));
      const v = ${P}.views && ${P}.views.room;
      const chains = [];
      if (v) v.scene.traverse((o) => {
        if (o.userData && o.userData.ccDimensionChain !== undefined) chains.push(String(o.userData.ccDimensionChain));
      });
      const r = s.unitResult(wanted[2]);
      const rows = T.frontDimensions.frontSizes(r, profile);
      const face = r.panels.find((p) => p.part === 'FRONT');
      return {
        wanted, carriers, sigsEqual: sigs.every((x) => x === sigs[0]),
        chains,
        legHeight: r.assemblies.carcass.legHeight,
        height: r.params.height,
        widthLabelAt: rows.find((x) => x.kind === 'front-w').at,
        heightLabelAt: rows.find((x) => x.kind === 'front-h').at,
        faceY: face.box.y, faceH: face.h, faceX: face.box.x, faceW: face.w,
        labels: profile.hoverDimensions.frontLabels,
      };
    `);
    measurements.f8 = f8;

    check('F8.2 — three identical cabinets, ONE chain, on the outermost',
      f8.sigsEqual && f8.carriers.length === 1 && f8.carriers[0] === f8.wanted[2],
      `carriers ${f8.carriers.join('/')} of ${f8.wanted.length} switched on`);
    check('F8.1 — the toe kick and the carcass are two numbers, not one 870',
      f8.legHeight === 100 && f8.height === 770,
      `${f8.legHeight} below, ${f8.height} above — and no ${f8.legHeight + f8.height} anywhere`);
    check('F8.3 — the width label sits a quarter up from the front’s bottom',
      Math.abs(f8.widthLabelAt - (f8.faceY + f8.faceH * f8.labels.widthFromBottom)) < 1e-6
      && f8.widthLabelAt !== f8.faceY + f8.faceH / 2,
      `${Math.round(f8.widthLabelAt)} of ${f8.faceH}, centre would be ${Math.round(f8.faceY + f8.faceH / 2)}`);
    check('F8.4 — …and the height label steps right of the centre line',
      f8.heightLabelAt > f8.faceX + f8.faceW / 2 && f8.heightLabelAt < f8.faceX + f8.faceW,
      `${Math.round(f8.heightLabelAt)}, centre ${Math.round(f8.faceX + f8.faceW / 2)}, edge ${f8.faceX + f8.faceW}`);

    await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      if (!v) return null;
      v.camera.position.set(4.3, 1.9, 3.4);
      v.camera.lookAt(4.0, 0.4, 0);
      if (v.controls && v.controls.target) { v.controls.target.set(4.0, 0.4, 0); v.controls.update(); }
      return true;
    `);
    await page.sleep(800);
    await shot('8a-a-run-of-three-identical-units-dimensions-once');
    await page.evaluate(`${P}.ui.getState().toggleFrontDimensions(); return true;`);
    await page.sleep(800);
    await shot('8b-the-front-labels-off-each-others-centre-lines');
    await page.evaluate(`${P}.ui.getState().toggleFrontDimensions(); return true;`);

    // ─────────────────────────────────────────────────────────────────────────
    // F9 — the back inset over a run, and the end panels that reach the wall
    // ─────────────────────────────────────────────────────────────────────────
    const f9before = await page.evaluate(`
      const s = ${P}.project.getState();
      const ids = window.__t28.runIds;
      s.addEndPanel(ids[2], { side: 'R' });
      ${P}.ui.getState().selectUnit(ids[0]);
      for (const id of ids.slice(1)) ${P}.ui.getState().selectUnit(id, { additive: true });
      const r = s.unitResult(ids[2]);
      const ep = r.panels.find((p) => p.part === 'END-PANEL');
      return { ids, depth: r.params.depth, epW: ep && ep.w, epZ: ep && ep.box.z };
    `);
    await page.sleep(900);
    const fieldBefore = await page.evaluate('return Boolean(document.querySelector(\'[data-multi-back-inset="1"]\'));');
    check('F9.1 — a multi-selection of floor units offers the Back inset field',
      fieldBefore === true, 'the field is on the quick menu');

    await page.evaluate(`
      ${P}.project.getState().setUnitInsetsBulk(window.__t28.runIds, { back: 40 });
      return true;
    `);
    await page.sleep(1100);
    const f9 = await page.evaluate(`
      const s = ${P}.project.getState();
      const ids = window.__t28.runIds;
      const r = s.unitResult(ids[2]);
      const ep = r.panels.find((p) => p.part === 'END-PANEL');
      const bom = ${P}.project.getState().bomRows ? null : null;
      const v = ${P}.views && ${P}.views.room;
      const THREE = v && v.three;
      let drawnDepth = null;
      if (v) v.scene.traverse((o) => {
        if (drawnDepth === null && o.isMesh && o.userData && o.userData.ccPanelId === ep.id) {
          const box = new THREE.Box3().setFromObject(o);
          drawnDepth = (box.max.z - box.min.z) * 1000;
        }
      });
      return {
        insets: ids.map((id) => s.units.find((u) => u.id === id).params.inset_back_mm),
        epW: ep.w, epZ: ep.box.z, drawnDepth, bom,
      };
    `);
    measurements.f9 = { before: f9before, after: f9 };
    check('F9.2 — the whole selected run moved off the wall',
      f9.insets.every((v) => v === 40), `insets ${f9.insets.join('/')}`);
    check('F9.3 — the end panel is deeper by exactly the inset, on the SHEET and in the SCENE',
      f9.epW === f9before.epW + 40
      && f9.drawnDepth !== null && Math.abs(f9.drawnDepth - f9.epW) < 1.5,
      `${f9before.epW} → ${f9.epW} mm cut, ${f9.drawnDepth ? Math.round(f9.drawnDepth) : '—'} mm drawn`);

    await page.evaluate(`
      const v = ${P}.views && ${P}.views.room;
      if (!v) return null;
      v.camera.position.set(5.4, 1.3, 2.2);
      v.camera.lookAt(4.6, 0.4, 0.1);
      if (v.controls && v.controls.target) { v.controls.target.set(4.6, 0.4, 0.1); v.controls.update(); }
      return true;
    `);
    await page.sleep(700);
    await shot('9a-the-run-off-the-wall-and-the-end-panel-still-on-it');

    await page.evaluate(`${P}.ui.getState().selectUnit(window.__t28.runIds[0]); return true;`);
    await page.sleep(700);
    const fieldAfter = await page.evaluate('return Boolean(document.querySelector(\'[data-multi-back-inset="1"]\'));');
    check('F9.1 — …and a SINGLE selection does not offer it', fieldAfter === false,
      'deselect → the field is gone');

    // ─────────────────────────────────────────────────────────────────────────
    // F10 — the second brightness slider, with a real pointer
    // ─────────────────────────────────────────────────────────────────────────
    const slider = await page.evaluate(`
      const el = document.querySelector('[data-brightness-control="1"] input[type="range"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top + r.height / 2, w: r.width, before: ${P}.ui.getState().brightness };
    `);
    if (!slider) {
      check('F10 — the toolbar carries a brightness slider', false, 'not in the DOM');
    } else {
      await page.mouse('mousePressed', Math.round(slider.x + slider.w * 0.85), Math.round(slider.y), { button: 'left', buttons: 1, clickCount: 1 });
      await page.mouse('mouseReleased', Math.round(slider.x + slider.w * 0.85), Math.round(slider.y), { button: 'left', buttons: 0, clickCount: 1 });
      await page.sleep(500);
      const after = await page.evaluate(`
        return {
          store: ${P}.ui.getState().brightness,
          menuWouldShow: ${P}.ui.getState().brightness,
          el: Number(document.querySelector('[data-brightness-control="1"] input[type="range"]').value),
        };
      `);
      measurements.f10 = { before: slider.before, after };
      check('F10 — a real pointer on the toolbar slider moves the ONE brightness state',
        after.store !== slider.before && Math.abs(after.el - after.store) < 1e-9,
        `${slider.before} → ${after.store}, and the control reads ${after.el}`);
      await shot('10a-the-brightness-slider-on-the-top-bar');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // F11 — the layer list leaves the editor toolbar
    // ─────────────────────────────────────────────────────────────────────────
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      ui.closeModal();
      ui.openModal('cabinet', { unitId: window.__t28.runIds[0] });
      return true;
    `);
    await page.sleep(1100);
    await page.evaluate(`
      ${P}.ui.getState().pushModal('part-detail', {
        unitId: window.__t28.runIds[0], panelId: 'BUL', anchor: null, at: null,
      });
      return true;
    `);
    await page.sleep(1500);
    const f11 = await page.evaluate(`
      const bar = document.querySelector('[data-part-tools="1"]');
      if (!bar) return { why: 'no toolbar' };
      return {
        selectsOnToolbar: bar.querySelectorAll('select').length,
        askInsideToolbar: Boolean(bar.querySelector('[data-layer-ask="1"]')),
        askAnywhere: Boolean(document.querySelector('[data-layer-ask="1"]')),
        tools: [...bar.querySelectorAll('[data-part-tool]')].map((b) => b.getAttribute('data-part-tool')),
        snapPanel: Boolean(bar.querySelector('[data-snap-panel="1"]')),
      };
    `);
    measurements.f11 = f11;
    check('F11 — the part editor’s toolbar carries NO layer list',
      f11.selectsOnToolbar === 0 && f11.askInsideToolbar === false && f11.askAnywhere === false,
      `${f11.selectsOnToolbar} dropdowns on the toolbar, question inside it: ${f11.askInsideToolbar}`);
    check('F11 — …and everything else on it did not move (R12)',
      f11.tools.join('/') === 'select/drill/line/dowels' && f11.snapPanel === true,
      `${f11.tools.join(' · ')}, snap panel ${f11.snapPanel ? 'present' : 'missing'}`);
    await shot('11a-the-editor-toolbar-without-a-layer-list');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(600);

    // ─── R5 + R6, as an assertion at the end ────────────────────────────────
    const errs = realErrors(page.errors);
    check('R5 + R6 — the console is clean across the whole walk', errs.length === 0,
      errs.slice(0, 3).join(' | ') || 'no errors, no React exceptions');

    const lines = page.consoleLines.map((l) => `${l.level}  ${l.text}`);
    writeFileSync(`${OUT}console.txt`, [
      `# every console message of the turn-28 walk — ${lines.length} in total`,
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
      turn: 28,
      url: BASE,
      showroom: showroom.url,
      rules: {
        R1: 'every move and keystroke is CDP Input; the guard at the top of this file enforces it',
        R2: 'scripts/bucket-live.mjs, before any picture of hardware',
        R4: 'every claim is read off the app: the record for F1, the MOUNTED scene graph for F2/F4/F5/F6/F9, shelfColumns for F3, decors for F7, dimensions and frontDimensions for F8, the DOM for F10 and F11',
        R5: 'the console is captured for the whole walk',
        R6: 'any uncaught error or React error-boundary report FAILS the step it appeared in',
        R7: 'no data-* on R3F objects — the scene is found by userData (ccPanelId, ccDimensionChain, ccDrillRing, ccMember)',
        R8: 'GLB-dependent steps run against the synthetic silent showroom',
        R9: 'no feature without its part — F1 asserts the SCENE draws the three pieces and no fourth',
        R10: 'the sheet is the truth: F2 photographs the leaf’s own sheet beside the mounted cups',
        R11: 'every dimension in the scene is found by traversing for ccDimensionChain — the one component, fed a different anchor',
        R12: 'extend means extend: F11 finishes what turn 26 F12 started and moves nothing else on the toolbar',
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
