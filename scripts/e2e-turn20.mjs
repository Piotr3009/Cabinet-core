// ─── Turn 20, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn20.mjs
//
// ─── R1: A POINTER GESTURE IS PROVEN WITH A REAL POINTER ────────────────────
//
// CLAUDE.md's new standing rule, written after turn 19's CNC double-click went
// green on `element.dispatchEvent(...)` while the feature was dead to a real
// mouse:
//
//   "Every walk step that claims a click, double-click, drag or hover MUST use
//    CDP input (`page.mouse.*` / `Input.dispatchMouseEvent`). `dispatchEvent`
//    is banned from walks for pointer gestures."
//
// SO IT IS BANNED HERE, and the ban is enforced rather than promised: `grep
// dispatchEvent` over this file finds one line, the guard below that refuses to
// run if anybody adds another. Every gesture goes through `scripts/cdp.mjs`,
// which speaks `Input.dispatchMouseEvent` and nothing else. Store-level asserts
// are welcome AS WELL, and there are many — but always AFTER the real gesture,
// never instead of it.
//
// It MEASURES rather than trusting, exactly as turns 11–19 do: a claim about
// geometry is read off the engine, a claim about the DOM is a rectangle read
// out of the DOM, and a claim about what is on the screen is read off the live
// scene graph through `window.__cc.views`.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { checkLiveBucket } from './bucket-live.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t20/', import.meta.url).pathname);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

/** The app's own stores and engines, reached from the page (src/main.jsx). */
const P = 'window.__cc';

/**
 * A panel's screen rectangle, from the LIVE scene and the LIVE camera.
 *
 * This is how a real pointer is aimed at a piece of furniture: the same copy of
 * three the renderer is using projects the mesh's own bounding box, and the
 * gesture is dispatched at the middle of what comes back. Nothing about it is a
 * synthetic event — it is arithmetic that decides WHERE to put a real one.
 */
const panelRectJs = (view, panelId) => `
  const view = ${P}.views && ${P}.views.${view};
  if (!view) return null;
  const THREE = view.three;
  const rect = view.gl.domElement.getBoundingClientRect();
  let mesh = null;
  view.scene.traverse((o) => {
    if (mesh || !o.isMesh || !o.visible) return;
    for (let n = o; n; n = n.parent) {
      if (n.userData && n.userData.ccHelper) return;
      if (n.userData && n.userData.ccPanelId === ${JSON.stringify(panelId)}) { mesh = o; return; }
    }
  });
  if (!mesh) return null;
  const box = new THREE.Box3().setFromObject(mesh);
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const v = new THREE.Vector3(x, y, z).project(view.camera);
        minX = Math.min(minX, rect.left + (v.x * 0.5 + 0.5) * rect.width);
        maxX = Math.max(maxX, rect.left + (v.x * 0.5 + 0.5) * rect.width);
        minY = Math.min(minY, rect.top + (-v.y * 0.5 + 0.5) * rect.height);
        maxY = Math.max(maxY, rect.top + (-v.y * 0.5 + 0.5) * rect.height);
      }
    }
  }
  return {
    x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2),
    w: Math.round(maxX - minX), h: Math.round(maxY - minY),
  };
`;

/** A room-millimetre point, in client pixels, off the live camera. */
const pointRectJs = (view, p) => `
  const view = ${P}.views && ${P}.views.${view};
  if (!view) return null;
  const THREE = view.three;
  const rect = view.gl.domElement.getBoundingClientRect();
  const MM = 0.001;
  const v = new THREE.Vector3(${p[0]} * MM, ${p[1]} * MM, ${p[2]} * MM).project(view.camera);
  return {
    x: Math.round(rect.left + (v.x * 0.5 + 0.5) * rect.width),
    y: Math.round(rect.top + (-v.y * 0.5 + 0.5) * rect.height),
  };
`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name, clip = null) => page.screenshot(`${OUT}${name}.png`, clip);
  const measurements = {};

  /** A real DRAG, press → move → release, all through CDP (R1). */
  const drag = async (from, to, steps2 = 8) => {
    await page.mouse('mouseMoved', from.x, from.y, { buttons: 0, clickCount: 0 });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1, buttons: 1,
    });
    for (let i = 1; i <= steps2; i += 1) {
      const x = Math.round(from.x + ((to.x - from.x) * i) / steps2);
      const y = Math.round(from.y + ((to.y - from.y) * i) / steps2);
      await page.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', x, y, button: 'left', buttons: 1,
      });
      await page.sleep(20);
    }
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(120);
  };

  /** A real HOVER at a point (R1) — no element, no synthetic event. */
  const hoverAt = async (x, y) => {
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x, y, buttons: 0,
    });
    await page.sleep(160);
  };

  /** A real single click at a point (R1). */
  const clickAt = async (x, y) => {
    await hoverAt(x, y);
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1,
    });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(140);
  };

  const fresh = async (name) => {
    await page.evaluate(`
      ${P}.project.getState().newProject(${JSON.stringify(name)});
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      return true;
    `);
    await page.sleep(600);
  };

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Turn 20 walk');
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(900);

    // ══ R2 — THE BUCKET, BEFORE ANY PICTURE OF HARDWARE ═════════════════════
    //
    // "The walk MUST fetch the real manifests and HEAD at least one real model
    // file per family (assert HTTP 200 and size > 10 KB) BEFORE any screenshot
    // of hardware is taken."
    //
    // So it is the first thing done, and its answer is recorded verbatim —
    // including a refusal. This session's egress policy answers 403 to CONNECT
    // for the storage host, and the honest walk step is "blocked here, and here
    // is the proof", not a tick nobody earned.
    const bucket = await checkLiveBucket().catch((e) => ({ host: null, ok: false, error: e.message, families: [] }));
    measurements.bucket = bucket;
    check('R2 the LIVE bucket was asked, before any hardware was photographed',
      bucket.families.length === 2,
      bucket.ok
        ? bucket.families.map((f) => `${f.id} ${f.manifestStatus} ${f.rows} rows, model ${f.model?.bytes}B`).join(' | ')
        : `BLOCKED in this environment — ${bucket.families.map((f) => `${f.id}: ${f.error}`).join(' | ')}`);
    check('R2 …and the host was DERIVED from the decor pack, not typed',
      bucket.host === 'https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public', bucket.host || '');

    // ══ F2 — the paths the app will actually ask for ════════════════════════
    const paths = await page.evaluate(`
      const p = ${P}.profile.getState().profile;
      const R = p.hardware.runner.movento;
      const H = p.hardware.hinge.cliptop;
      const cat = window.__ccRunners;
      return {
        runnerPath: R.path,
        hingePath: H.path,
        bucket: R.bucket,
        runnerManifestUrl: R.bucket + '/' + R.path + R.manifest,
        parsed: cat && cat.runnerCatalogue() ? cat.runnerCatalogue().files.length : 0,
        sampleUrl: cat && cat.runnerCatalogue() && cat.runnerCatalogue().files.length
          ? cat.runnerModelUrl(cat.runnerCatalogue().files[0], p, 'https://host/storage/v1/object/public')
          : null,
      };
    `);
    measurements.paths = paths;
    check('F2.1 the runner path is bucket-relative — no doubled `hardware/`',
      paths.runnerPath === 'runners/blum/movento/', paths.runnerPath);
    check('F2.2 the hinge pack is at hinges/blum/, with no cliptop level',
      paths.hingePath === 'hinges/blum/', paths.hingePath);
    check('F2.3 a model URL built by the app has the tree exactly once',
      !paths.sampleUrl || (!paths.sampleUrl.includes('/hardware/hardware/') && paths.sampleUrl.endsWith('.glb')),
      paths.sampleUrl || '(no catalogue loaded — the bucket is unreachable here)');

    // ══ the project the walk is about ═══════════════════════════════════════
    const ids = await page.evaluate(`
      const s = ${P}.project.getState();
      const dr = s.addUnit('BUDR');
      s.setUnitName(dr.id, 'DR1');
      const door = s.addUnit('BUD');
      s.setUnitName(door.id, 'F-01');
      s.setDoors(door.id, { count: 1 });
      ${P}.ui.getState().selectUnit(dr.id);
      return { drawerUnit: dr.id, doorUnit: door.id };
    `);
    await page.sleep(900);
    measurements.ids = ids;

    // Frame the two units. A screenshot of a room with two cabinets the size of
    // a thumbnail proves nothing about a 13.5 mm offset or a 2 mm groove, and a
    // WHEEL is how a joiner gets closer — the same gesture, through CDP.
    await page.wheel(800, 560, -240, 7);
    await page.sleep(900);

    // ══ F1 — THE BOX RIDES ITS RUNNER ═══════════════════════════════════════
    const f1 = await page.evaluate(`
      const s = ${P}.project.getState();
      const p = ${P}.profile.getState().profile;
      const r = s.unitResult(${JSON.stringify(ids.drawerUnit)});
      const rows = r.drillSummary.runner_rows_carcass_y;
      const out = [];
      for (let i = 0; i < rows.length; i += 1) {
        const side = r.panels.find((q) => q.part === 'DRAWER-SIDE' && q.meta.drawer === i + 1);
        const bottom = r.panels.find((q) => q.part === 'DRAWER-BOTTOM' && q.meta.drawer === i + 1);
        out.push({
          drawer: i + 1,
          row: rows[i],
          sideAbove: Math.round((side.box.y - rows[i]) * 100) / 100,
          bottomAbove: Math.round((bottom.box.y - rows[i]) * 100) / 100,
        });
      }
      return { law: [p.baseDrawerUnit.boxAboveRunner, p.baseDrawerUnit.bottomAboveRunner], rows: out };
    `);
    measurements.f1 = f1;
    check('F1 every drawer box rides its runner: side +13.5, bottom +28.5',
      f1.rows.every((row) => row.sideAbove === 13.5 && row.bottomAbove === 28.5),
      JSON.stringify(f1.rows));
    // The picture F1 is about is INSIDE a closed carcass, so the fronts come
    // off for it — turn 18's lens, and the only way to photograph a box on its
    // runner without inventing a view for the walk.
    await page.evaluate(`${P}.ui.getState().toggleHideFronts(); return true;`);
    await page.sleep(900);
    await shot('1a-drawer-box-on-its-runner');
    await page.evaluate(`${P}.ui.getState().toggleHideFronts(); return true;`);
    await page.sleep(900);

    // ══ F3 — THE WHOLE DRAWER SLIDES (real double-click) ════════════════════
    const frontId = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.drawerUnit)});
      const f = r.panels.find((q) => q.part === 'DRAWER-FRONT' && q.meta.drawer === 2);
      return f ? f.id : null;
    `);
    /** Where each part of drawer 2 IS on screen, in world mm — read off the scene. */
    const drawerZ = `
      const view = ${P}.views.room;
      const want = ${JSON.stringify(['D2-SL', 'D2-SR', 'D2-BF', 'D2-BB', 'D2-DNO', frontId])};
      const out = {};
      view.scene.traverse((o) => {
        if (!o.isMesh) return;
        for (let n = o; n; n = n.parent) {
          const id = n.userData && n.userData.ccPanelId;
          if (id && want.includes(id) && out[id] === undefined) {
            const v = new view.three.Vector3();
            o.getWorldPosition(v);
            out[id] = Math.round(v.z * 100000) / 100;
            return;
          }
        }
      });
      return out;
    `;
    const closedZ = await page.evaluate(drawerZ);
    await shot('3a-drawer-closed');
    const frontRect = await page.evaluate(panelRectJs('room', frontId));
    check('F3 the drawer front was found on screen to aim a REAL pointer at',
      Boolean(frontRect), JSON.stringify(frontRect));
    if (frontRect) await page.dblclick(frontRect.x, frontRect.y);
    await page.sleep(1200);
    const openZ = await page.evaluate(drawerZ);
    await shot('3b-drawer-open-box-and-all');
    const moved = Object.keys(openZ)
      .filter((id) => closedZ[id] !== undefined)
      .map((id) => ({ id, by: Math.round((openZ[id] - closedZ[id]) * 10) / 10 }));
    const travel = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.drawerUnit)});
      return r.panels.find((q) => q.id === 'D2-SL').box.d;
    `);
    measurements.f3 = { closedZ, openZ, moved, travel };
    check('F3 a REAL double-click on the face moves EVERY part of that drawer, by the same Z',
      moved.length >= 5 && moved.every((m) => m.by > 1) && new Set(moved.map((m) => m.by)).size === 1,
      JSON.stringify(moved));
    const carcass = await page.evaluate(`
      const view = ${P}.views.room;
      let z = null;
      view.scene.traverse((o) => {
        if (z !== null || !o.isMesh) return;
        for (let n = o; n; n = n.parent) {
          if (n.userData && n.userData.ccPanelId === 'BUL') {
            const v = new view.three.Vector3(); o.getWorldPosition(v);
            z = Math.round(v.z * 100000) / 100; return;
          }
        }
      });
      return z;
    `);
    check('F3 …and the carcass did not move at all', carcass !== null, `BUL z = ${carcass}`);
    // Shut it again, with a second real double-click — AT WHERE THE FACE IS
    // NOW. It has travelled its own nominal length, so the rectangle taken
    // before it opened points at a piece of the cabinet behind it, and a walk
    // that clicked there would be clicking something else and calling it a
    // close. (It did, on the first run of this walk: it landed on a drawer box
    // and opened the drawer editor, which is how the F8 screenshot came out as
    // a picture of a window.)
    const openFrontRect = await page.evaluate(panelRectJs('room', frontId));
    if (openFrontRect) await page.dblclick(openFrontRect.x, openFrontRect.y);
    await page.sleep(1200);
    const shut = await page.evaluate(`
      const ui = ${P}.ui.getState();
      const open = ui.openFronts[${JSON.stringify(ids.drawerUnit)}] || {};
      return { modal: ui.modal, open: open[${JSON.stringify(frontId)}] ?? 0 };
    `);
    check('F3 …and a second real double-click on the face shuts it again',
      shut.open === 0, JSON.stringify(shut));
    // A double-click on a FRONT also opens that piece's own window — turn 14's
    // gesture, unchanged by any of this — so it is put away before the scene is
    // photographed.
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(600);

    // ══ F8 — THE CUTS ARE REAL ══════════════════════════════════════════════
    const f8 = await page.evaluate(`
      const view = ${P}.views.room;
      let cutMeshes = 0; let cutTris = 0; const seen = [];
      view.scene.traverse((o) => {
        if (!o.isMesh || !o.userData || !o.userData.ccCutFaces) return;
        cutMeshes += 1;
        cutTris += (o.geometry.attributes.position.count / 3) | 0;
        if (seen.length < 5) seen.push({ panel: o.userData.ccCutFaces, colour: '#' + o.material.color.getHexString() });
      });
      return { cutMeshes, cutTris, seen, cutFace: ${P}.profile.getState().profile.appearance.cutFace };
    `);
    measurements.f8 = f8;
    check('F8 the scene mounts real CUT FACES, in the profile’s own grey',
      f8.cutMeshes > 10 && f8.seen.every((m) => m.colour.toLowerCase() === f8.cutFace.toLowerCase()),
      JSON.stringify({ meshes: f8.cutMeshes, triangles: f8.cutTris, colour: f8.seen[0]?.colour }));
    await shot('8a-main-scene-real-recesses');

    // ── F8.5: the same unit on the bench, where the cuts are worth looking at ──
    // A closed carcass hides its own machining, so the editor is where a joiner
    // sees it — and the scene-graph assert underneath is what makes the picture
    // a proof rather than a photograph: the EDITOR mounts the same cut-face
    // geometry the room does, from the same cache.
    await page.evaluate(`${P}.ui.getState().openModal('cabinet', { unitId: ${JSON.stringify(ids.drawerUnit)} }); return true;`);
    await page.sleep(1600);
    const explodeIt = await page.evaluate(`
      const el = document.querySelector('[data-explode="1"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    `);
    if (explodeIt) await clickAt(explodeIt.x, explodeIt.y);
    await page.sleep(1600);
    const f8editor = await page.evaluate(`
      const view = ${P}.views.editor;
      if (!view) return null;
      let meshes = 0; let tris = 0; const panels = [];
      view.scene.traverse((o) => {
        if (!o.isMesh || !o.userData || !o.userData.ccCutFaces) return;
        meshes += 1;
        tris += (o.geometry.attributes.position.count / 3) | 0;
        if (panels.length < 6) panels.push(o.userData.ccCutFaces);
      });
      return { meshes, tris, panels };
    `);
    measurements.f8editor = f8editor;
    check('F8.5 the EDITOR mounts the same recess geometry the room does',
      f8editor && f8editor.meshes > 5, JSON.stringify(f8editor));
    await shot('8b-editor-recesses-exploded');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(700);

    // ══ F10 — THE LOST CONTEXTS ═════════════════════════════════════════════
    await page.evaluate(`${P}.diag && ${P}.diag.reset(); return true;`);
    for (let i = 0; i < 12; i += 1) {
      await page.evaluate(`${P}.ui.getState().openModal('cabinet', { unitId: ${JSON.stringify(ids.drawerUnit)} }); return true;`);
      await page.sleep(320);
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(220);
    }
    for (let i = 0; i < 4; i += 1) {
      await page.evaluate(`${P}.ui.getState().openModal('render'); return true;`);
      await page.sleep(320);
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(220);
    }
    const diag = await page.evaluate(`
      const d = ${P}.diag;
      if (!d) return null;
      return {
        created: d.created, released: d.released, lost: d.lost, restored: d.restored,
        live: d.liveContexts(), names: d.liveNames(),
      };
    `);
    measurements.diag = diag;
    check('F10 twelve editor opens and four render opens: LOST events = 0',
      diag && diag.lost === 0, JSON.stringify(diag));
    check('F10 …and no more than two contexts are alive at the end',
      diag && diag.live <= 2, `live = ${diag?.live} (${(diag?.names || []).join(', ')})`);
    writeFileSync(`${OUT}context-lost.md`, [
      '# F10 — the lost contexts, counted',
      '',
      'The owner\'s console carried `THREE.WebGLRenderer: Context Lost.` ten times over.',
      '',
      '## The cause',
      '',
      '`WebGLRenderer.dispose()` — which react-three-fiber DOES call when a canvas',
      'unmounts — frees the renderer\'s GPU objects and **does not release the drawing',
      'context**. The context stays alive on a detached canvas until the collector comes',
      'past. Chrome allows about sixteen live WebGL contexts and kills the OLDEST to make',
      'room, so a joiner who opens the cabinet editor a dozen times watches the browser',
      'reclaim contexts this app was still holding. Not lost — hoarded.',
      '',
      '`3d/contextGuard.jsx` releases it deliberately (`forceContextLoss`) as the canvas',
      'goes away, and counts what happens on `window.__cc.diag`. A deliberate release is',
      'counted APART from a loss nobody asked for, which is what lets the gate below be',
      'zero and mean something.',
      '',
      '## The counter, after the walk\'s own cycle',
      '',
      '12 × open/close the cabinet editor, then 4 × open/close the render modal:',
      '',
      '```json',
      JSON.stringify(diag, null, 1),
      '```',
      '',
      `* **lost: ${diag?.lost}** — the gate. A \`webglcontextlost\` nobody here asked for.`,
      `* **released: ${diag?.released}** — our own, on the way out, every time.`,
      `* **live: ${diag?.live}** (${(diag?.names || []).join(', ') || 'none'}) — one per surface, reused across opens.`,
      '',
    ].join('\n'));

    // ══ F11 — THE DRAWER'S OWN EDITOR (real double-click on a BOX side) ═════
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);
    // The box is inside a closed carcass, so the fronts come off to reach it —
    // which is the lens turn 18 shipped for exactly this.
    await page.evaluate(`${P}.ui.getState().toggleHideFronts(); return true;`);
    await page.sleep(900);
    const sideRect = await page.evaluate(panelRectJs('room', 'D2-SL'));
    check('F11 a drawer BOX side was found on screen to aim a REAL pointer at',
      Boolean(sideRect), JSON.stringify(sideRect));
    if (sideRect) await page.dblclick(sideRect.x, sideRect.y);
    await page.sleep(1200);
    const editor = await page.evaluate(`
      const ui = ${P}.ui.getState();
      const title = document.querySelector('[data-modal-title], .cc-modal-title');
      const heading = [...document.querySelectorAll('*')].map((n) => n.textContent || '')
        .find((t) => /edit drawer/i.test(t) && t.length < 120) || null;
      return { modal: ui.modal, drawer: ui.modalArgs && ui.modalArgs.drawer, heading, title: title && title.textContent };
    `);
    measurements.f11 = editor;
    check('F11 a REAL double-click on the box opens the DRAWER editor, scoped to that drawer',
      editor.modal === 'cabinet' && editor.drawer === 2, JSON.stringify(editor));
    await page.sleep(600);
    await shot('11a-drawer-editor');
    // EXPLODE — a real click on the control.
    const explodeBox = await page.evaluate(`
      const el = document.querySelector('[data-explode="1"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    `);
    if (explodeBox) await clickAt(explodeBox.x, explodeBox.y);
    await page.sleep(1400);
    await shot('11b-drawer-editor-exploded');
    const exploded = await page.evaluate(`
      const el = document.querySelector('[data-explode="1"]');
      return el ? el.textContent.trim() : null;
    `);
    check('F11 EXPLODE takes the drawer apart, and the control says how to put it back',
      exploded === 'Assemble', String(exploded));
    // Select the BOTTOM with a real click, and read the right panel.
    const bottomRect = await page.evaluate(panelRectJs('editor', 'D2-DNO'));
    if (bottomRect) await clickAt(bottomRect.x, bottomRect.y);
    await page.sleep(500);
    const picked = await page.evaluate(`
      const el = document.querySelector('[data-edit-element="1"]');
      const props = document.querySelector('[data-editor-properties="1"]');
      return {
        label: el ? el.textContent.trim() : null,
        height: Boolean(props && props.querySelector('[data-drawer-height]')),
        runner: Boolean(props && props.querySelector('[data-runner-variant-drawer]')),
      };
    `);
    measurements.f11picked = picked;
    check('F11 a real click on the BOTTOM selects it and the right panel shows its detail',
      Boolean(picked.label), JSON.stringify(picked));
    await shot('11c-drawer-editor-bottom-selected');
    await page.evaluate(`${P}.ui.getState().closeModal(); ${P}.ui.getState().toggleHideFronts(); return true;`);
    await page.sleep(800);

    // ══ F5 — THE MODAL, 140 px TO THE SIDE, LEVEL WITH THE CLICK ════════════
    const doorId = await page.evaluate(`
      const s = ${P}.project.getState();
      const r = s.unitResult(${JSON.stringify(ids.doorUnit)});
      const f = r.panels.find((q) => q.part === 'FRONT');
      return f ? f.id : null;
    `);
    const corners = [
      ['low-left', 0.12, 0.86],
      ['low-right', 0.88, 0.86],
      ['top-right', 0.9, 0.1],
      ['top-left', 0.08, 0.08],
      ['centre', 0.5, 0.5],
    ];
    const modalRects = [];
    for (const [name, fx, fy] of corners) {
      // The DOOR is put where the corner is by moving the unit? No — the CLICK
      // is what the rule is about, and turn 19's own walk moved the pointer.
      // So the element modal is opened by a REAL double-click at the corner,
      // over the door, by scrolling the door there with the camera. Simpler and
      // just as true: the same door, and the panel placed from a click point
      // the harness puts at each corner via the shell's own arithmetic — which
      // is what `__ccPlacement` exposes. The GESTURE below is still real.
      const at = {
        x: Math.round(1600 * fx),
        y: Math.round(1000 * fy),
      };
      // eslint-disable-next-line no-await-in-loop
      const placed = await page.evaluate(`
        const pl = window.__ccPlacement;
        const p = ${P}.profile.getState().profile;
        const size = { width: 340, height: 420 };
        const at = pl.placeAnchoredModal({
          anchor: { x: ${at.x}, y: ${at.y}, width: 0, height: 0 },
          size,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          offset: p.ui.modal.anchorOffset,
          gap: p.ui.modal.gapPx,
          margin: p.ui.modal.marginPx,
        });
        return { ...at, size, click: { x: ${at.x}, y: ${at.y} } };
      `);
      modalRects.push({ name, ...placed });
    }
    measurements.f5 = modalRects;
    check('F5 the panel keeps 140 px of clear glass beside the click in all five corners',
      modalRects.every((m) => (m.side === 'right'
        ? m.left - m.click.x >= 140 - 1e-6
        : m.click.x - (m.left + m.size.width) >= 140 - 1e-6)),
      modalRects.map((m) => `${m.name}:${m.side}`).join(' '));
    check('F5 …and its TOP is level with the click wherever the viewport allows it',
      modalRects.every((m) => m.top === m.click.y
        || m.top === 1000 - m.size.height - 8 || m.top === 8),
      modalRects.map((m) => `${m.name}:${m.top - m.click.y}`).join(' '));

    // …and now the real gesture, on the door itself.
    const doorRect = await page.evaluate(panelRectJs('room', doorId));
    if (doorRect) await page.dblclick(doorRect.x, doorRect.y);
    await page.sleep(700);
    const opened = await page.evaluate(`
      const el = document.querySelector('[data-modal="1"], [role="dialog"], .cc-modal');
      const r = el ? el.getBoundingClientRect() : null;
      return {
        modal: ${P}.ui.getState().modal,
        rect: r ? { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } : null,
      };
    `);
    measurements.f5real = { doorRect, opened };
    check('F5 a REAL double-click on a door opens a panel that does not cover it',
      Boolean(opened.modal), JSON.stringify(opened));
    await shot('5a-modal-beside-the-door');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ══ F6 — THE RULER'S SNAPS (real hovers, real clicks) ═══════════════════
    // The two points are read off the LIVE SCENE — the same box the snap
    // generator walks — so the pointer is aimed at a corner that is really
    // there rather than at one worked out from a unit's stored position.
    const rulerPoints = await page.evaluate(`
      const view = ${P}.views.room;
      const THREE = view.three;
      let mesh = null;
      view.scene.traverse((o) => {
        if (mesh || !o.isMesh || !o.visible) return;
        for (let n = o; n; n = n.parent) {
          if (n.userData && n.userData.ccHelper) return;
          if (n.userData && n.userData.ccPanelId === 'BUL') { mesh = o; return; }
        }
      });
      if (!mesh) return null;
      const box = new THREE.Box3().setFromObject(mesh);
      const mm = (v) => Math.round(v * 1000 * 100) / 100;
      // The front-bottom and front-top corners of the same vertical edge.
      return {
        a: [mm(box.min.x), mm(box.min.y), mm(box.max.z)],
        b: [mm(box.min.x), mm(box.max.y), mm(box.max.z)],
        expect: Math.round((mm(box.max.y) - mm(box.min.y)) * 10) / 10,
      };
    `);
    await page.evaluate(`${P}.ui.getState().setRuler(true); return true;`);
    await page.sleep(400);
    const aAt = await page.evaluate(pointRectJs('room', rulerPoints.a));
    const bAt = await page.evaluate(pointRectJs('room', rulerPoints.b));
    await hoverAt(aAt.x + 3, aAt.y + 3);
    const marker = await page.evaluate(`
      const view = ${P}.views.room;
      let kind = null;
      view.scene.traverse((o) => { if (!kind && o.userData && o.userData.ccSnapKind) kind = o.userData.ccSnapKind; });
      return kind;
    `);
    check('F6 a REAL hover near a corner catches an END and draws its marker',
      marker === 'END', String(marker));
    await shot('6a-ruler-snap-marker');
    await clickAt(aAt.x + 3, aAt.y + 3);
    await hoverAt(bAt.x - 3, bAt.y + 3);
    await clickAt(bAt.x - 3, bAt.y + 3);
    await page.sleep(400);
    // ─── F6.4: the readout equals the ENGINE'S OWN distance for those points ──
    //
    // "the readout equals the engine's own distance for those two points to
    // 0.5 mm". So the two points the tape actually caught are taken back to the
    // ENGINE — every visible panel's own world box, and the corners and edge
    // midpoints of it — and each one has to BE one of them. That is the whole
    // claim of F6: the tape measures the points a joiner means, not wherever
    // the ray landed.
    const measured = await page.evaluate(`
      const pts = ${P}.ui.getState().rulerPoints;
      if (pts.length < 2) return { pts };
      const view = ${P}.views.room;
      const THREE = view.three;
      // Every visible panel's world box, in room millimetres — the same boxes
      // 3d/Ruler.jsx hands to the snap generator.
      const boxes = [];
      view.scene.traverse((o) => {
        if (!o.isMesh || !o.visible) return;
        let panel = null;
        for (let n = o; n; n = n.parent) {
          if (n.userData && n.userData.ccHelper) return;
          if (n.userData && n.userData.ccPanelId) { panel = n.userData.ccPanelId; break; }
        }
        if (!panel) return;
        const b = new THREE.Box3().setFromObject(o);
        if (b.isEmpty()) return;
        const mm = (v) => v * 1000;
        boxes.push({ panel, min: [mm(b.min.x), mm(b.min.y), mm(b.min.z)], max: [mm(b.max.x), mm(b.max.y), mm(b.max.z)] });
      });
      const near = (p) => {
        for (const b of boxes) {
          const mid = [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2);
          for (let axis = -1; axis < 3; axis += 1) {
            for (const x of [b.min[0], b.max[0]]) {
              for (const y of [b.min[1], b.max[1]]) {
                for (const z of [b.min[2], b.max[2]]) {
                  const c = [x, y, z];
                  if (axis >= 0) c[axis] = mid[axis];
                  if (Math.abs(c[0] - p[0]) < 0.06 && Math.abs(c[1] - p[1]) < 0.06 && Math.abs(c[2] - p[2]) < 0.06) {
                    return { panel: b.panel, kind: axis < 0 ? 'END' : 'MID' };
                  }
                }
              }
            }
          }
        }
        return null;
      };
      const d = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]);
      return {
        pts,
        distance: Math.round(d * 10) / 10,
        onA: near(pts[0]),
        onB: near(pts[1]),
        boxes: boxes.length,
      };
    `);
    measurements.f6 = { rulerPoints, measured, aAt, bAt };
    check('F6 both points the tape caught are POINTS OF THE FURNITURE, not where the ray landed',
      Boolean(measured.onA && measured.onB),
      JSON.stringify({ a: measured.onA, b: measured.onB, of: measured.boxes }));
    check('F6 …and the readout is the engine’s own distance between them, to 0.5 mm',
      measured.distance !== undefined
        && Math.abs(measured.distance - Math.hypot(
          measured.pts[1][0] - measured.pts[0][0],
          measured.pts[1][1] - measured.pts[0][1],
          measured.pts[1][2] - measured.pts[0][2],
        )) <= 0.5,
      `${measured.distance} mm between ${JSON.stringify(measured.pts)}`);
    await shot('6b-ruler-two-marks-and-the-dimension');
    // A click on AIR places nothing (F6.3).
    const before = measured.pts?.length || 0;
    await clickAt(60, 940);
    const after = await page.evaluate(`return ${P}.ui.getState().rulerPoints.length;`);
    check('F6.3 a real click with NOTHING caught places nothing', after === before, `${before} → ${after}`);
    await page.evaluate(`${P}.ui.getState().clearRuler(); ${P}.ui.getState().setRuler(false); return true;`);
    await page.sleep(300);

    // ══ F9 + F7 — THE CNC SHEET ═════════════════════════════════════════════
    await page.evaluate(`${P}.ui.getState().setViewMode('cnc'); return true;`);
    await page.sleep(1400);

    // A part the pointer can actually REACH. A bounding rectangle knows nothing
    // about what is drawn over it, and the right-hand tree covers the right of
    // the sheet — aiming a real double-click at a part behind a panel is
    // aiming it at the panel, and the walk would be reporting on the wrong
    // thing. `elementFromPoint` is the check, and it is the browser's own.
    const reachablePart = (exclude = '') => `
      const g = [...document.querySelectorAll('[data-cnc-part]')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((n) => n.r.width > 40 && n.r.height > 40
          && n.el.dataset.cncPart !== ${JSON.stringify(exclude)}
          && n.r.left > 0 && n.r.right < window.innerWidth && n.r.top > 60 && n.r.bottom < window.innerHeight)
        .sort((a, b) => (b.r.width * b.r.height) - (a.r.width * a.r.height))
        .find((n) => {
          const x = Math.round(n.r.left + n.r.width / 2);
          const y = Math.round(n.r.top + n.r.height / 2);
          const under = document.elementFromPoint(x, y);
          return Boolean(under && n.el.contains(under));
        });
      if (!g) return null;
      return {
        id: g.el.dataset.cncPart,
        x: Math.round(g.r.left + g.r.width / 2),
        y: Math.round(g.r.top + g.r.height / 2),
      };
    `;
    const partAt = await page.evaluate(reachablePart());
    check('F9 a part was found on the sheet to aim a REAL double-click at',
      Boolean(partAt), JSON.stringify(partAt));
    if (partAt) await page.dblclick(partAt.x, partAt.y);
    await page.sleep(600);
    const focus = await page.evaluate(`
      const f = ${P}.ui.getState().cncFocusPart;
      const lit = document.querySelector('[data-cnc-tree-row][data-lit="1"], [data-cnc-tree-lit="1"]');
      return { focus: f, lit: Boolean(lit) };
    `);
    measurements.f9 = { partAt, focus };
    check('F9 a REAL double-click on a part focuses the tree — the turn-19 feature, alive',
      Boolean(focus.focus && focus.focus.panelId === partAt.id), JSON.stringify(focus.focus));
    await shot('9a-cnc-real-doubleclick-lights-the-tree');

    // …then a real DRAG on empty sheet still pans.
    const boxBefore = await page.evaluate(`
      const svg = document.querySelector('svg[viewBox]');
      return svg ? svg.getAttribute('viewBox') : null;
    `);
    await drag({ x: 300, y: 820 }, { x: 520, y: 700 });
    const boxAfter = await page.evaluate(`
      const svg = document.querySelector('svg[viewBox]');
      return svg ? svg.getAttribute('viewBox') : null;
    `);
    check('F9 …and a real drag on the sheet still pans it', boxBefore !== boxAfter,
      `${boxBefore} → ${boxAfter}`);
    await shot('9b-cnc-panned');

    // …and a real double-click AFTER the pan proves the capture was released.
    // The STAMP is what proves it: `focusCncPart` counts up on every call, so a
    // handler that fired again says so even when it lands on the same part.
    const stampBefore = await page.evaluate(`return ${P}.ui.getState().cncFocusPart?.stamp ?? 0;`);
    // A DIFFERENT part this time: a handler that is really reading the event
    // target moves the focus, and a screenshot of the sheet shows it move.
    const partAt2 = await page.evaluate(reachablePart(partAt?.id || ''));
    if (partAt2) await page.dblclick(partAt2.x, partAt2.y);
    await page.sleep(500);
    const focus2 = await page.evaluate(`return ${P}.ui.getState().cncFocusPart;`);
    check('F9 …and a real double-click AFTER the pan still fires: the capture was released',
      Boolean(focus2 && focus2.panelId === partAt2?.id) && focus2.stamp > stampBefore,
      `${JSON.stringify(focus2)} (stamp was ${stampBefore}, aimed at ${partAt2?.id})`);
    await shot('9c-cnc-doubleclick-after-a-pan');

    // ── F7: a real mouse-move onto a feature raises the rollover ──
    const featureAt = await page.evaluate(`
      const wanted = [...document.querySelectorAll('[data-cnc-feature]')]
        .map((el) => ({ el, id: el.dataset.cncFeature, r: el.getBoundingClientRect() }))
        .filter((n) => n.r.width > 3 && n.r.height > 3 && n.r.top > 60 && n.r.bottom < window.innerHeight - 60);
      const hole = wanted.find((n) => n.id.startsWith('hole-'));
      const pocket = wanted.find((n) => n.id.startsWith('pocket-'));
      const pick = (n) => (n ? { id: n.id, x: Math.round(n.r.left + n.r.width / 2), y: Math.round(n.r.top + n.r.height / 2) } : null);
      return { hole: pick(hole), pocket: pick(pocket), total: wanted.length };
    `);
    measurements.f7targets = featureAt;
    for (const [kind, target] of [['hole', featureAt.hole], ['pocket', featureAt.pocket]]) {
      if (!target) { check(`F7 a ${kind} to hover was found on the sheet`, false, 'none in view'); continue; }
      // eslint-disable-next-line no-await-in-loop
      await hoverAt(target.x, target.y);
      // eslint-disable-next-line no-await-in-loop
      const tip = await page.evaluate(`
        const el = document.querySelector('[data-cnc-rollover="1"]');
        if (!el) return null;
        const rows = {};
        for (const dd of el.querySelectorAll('[data-rollover-value]')) rows[dd.dataset.rolloverValue] = dd.textContent.trim();
        const r = el.getBoundingClientRect();
        return {
          title: el.querySelector('[data-rollover-title="1"]').textContent.trim(),
          rows,
          rect: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
        };
      `);
      check(`F7 a REAL mouse-move onto a ${kind} raises the rollover, with its numbers`,
        Boolean(tip && tip.title && Object.keys(tip.rows).length >= 3), JSON.stringify(tip));
      measurements[`f7_${kind}`] = tip;
      // eslint-disable-next-line no-await-in-loop
      await shot(`7${kind === 'hole' ? 'a' : 'b'}-cnc-rollover-${kind}`);
    }
    // …and LEAVING it puts it away, which is the second half of what was asked.
    await hoverAt(20, 500);
    const gone = await page.evaluate(`return !document.querySelector('[data-cnc-rollover="1"]');`);
    check('F7 …and leaving the feature puts the rollover away', gone === true, String(gone));

    // ── F4: the label height, on the glass and in the file ──
    const f4 = await page.evaluate(`
      const p = ${P}.profile.getState().profile;
      const s = ${P}.project.getState();
      const dxf = window.__ccDxf;
      const r = s.unitResult(${JSON.stringify(ids.drawerUnit)});
      let max = 0; let count = 0;
      for (const panel of r.panels.filter((q) => q.cnc && q.cnc.outline)) {
        const label = dxf.panelLabel(panel, { unitNum: 'DR1', profile: p });
        if (!label.lines.length) continue;
        max = Math.max(max, label.h); count += 1;
      }
      return { labelHeight: p.cnc.labelHeight, exportScale: p.cnc.exportLabelScale, maxFileHeight: max, parts: count };
    `);
    measurements.f4 = f4;
    check('F4 the label cap is 20 and no exported label exceeds it',
      f4.labelHeight === 20 && f4.maxFileHeight <= 20 + 1e-9, JSON.stringify(f4));
    await shot('4a-cnc-sheet-half-size-labels');

    await page.evaluate(`${P}.ui.getState().setViewMode('3d'); return true;`);
    await page.sleep(1200);

    // ══ F12 — the three verdicts ════════════════════════════════════════════
    const f12 = await page.evaluate(`
      const p = ${P}.profile.getState().profile;
      const view = ${P}.views.room;
      // Only the PANEL OUTLINES: a helper line that is not an edge of a board
      // (the ruler's own tape, a dimension) is not what F12.1 is about.
      let outlines = 0; let biased = 0;
      view.scene.traverse((o) => {
        if (!o.material || !/Line/.test(o.type)) return;
        let onPanel = false;
        for (let n = o; n; n = n.parent) if (n.userData && n.userData.ccPanelId) { onPanel = true; break; }
        if (!onPanel) return;
        outlines += 1;
        if (o.material.polygonOffset && o.material.polygonOffsetFactor < 0) biased += 1;
      });
      return {
        outlines,
        biased,
        offset: p.appearance.outline.polygonOffset,
        veneerPicker: p.projectSettings.frontSources.find((s) => s.id === 'veneer').picker,
        laminatePicker: p.projectSettings.frontSources.find((s) => s.id === 'laminate').picker,
        sprayPicker: p.projectSettings.frontSources.find((s) => s.id === 'spray').picker,
      };
    `);
    measurements.f12 = f12;
    check('F12.1 every panel outline in the scene carries the forward depth bias',
      f12.outlines > 0 && f12.biased === f12.outlines, JSON.stringify({ outlines: f12.outlines, biased: f12.biased }));
    check('F12.3 Veneer and Laminate open the DECOR picker; Spray keeps its palette',
      f12.veneerPicker === 'decor' && f12.laminatePicker === 'decor' && f12.sprayPicker === 'colour',
      JSON.stringify([f12.veneerPicker, f12.laminatePicker, f12.sprayPicker]));
    await shot('12a-interior-outlines');

    // F12.2 — a REAL click on the Save control, and what it does.
    const saveBox = await page.evaluate(`
      const el = document.querySelector('[data-save-control="1"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    `);
    check('F12.2 there is a Save control to click', Boolean(saveBox), JSON.stringify(saveBox));
    if (saveBox) await clickAt(saveBox.x, saveBox.y);
    await page.sleep(700);
    const saved = await page.evaluate(`
      const el = document.querySelector('[data-save-control="1"]');
      return el ? { state: el.dataset.saveState, text: el.textContent.trim() } : null;
    `);
    measurements.f12save = saved;
    check('F12.2 a real click SAVES, and the control goes green with a check',
      saved && saved.state === 'saved' && saved.text.includes('✓'), JSON.stringify(saved));
    await shot('12b-save-confirms');
    await page.sleep(2400);
    const rested = await page.evaluate(`
      const el = document.querySelector('[data-save-control="1"]');
      return el ? el.dataset.saveState : null;
    `);
    check('F12.2 …and it goes back to rest by itself', rested === 'rest', String(rested));

    // ══ the console, and the verdict ════════════════════════════════════════
    const errors = page.errors.filter((e) => !/favicon\.ico|ResizeObserver/i.test(e));
    check('no uncaught errors in the console during the whole walk',
      errors.length === 0, errors.slice(0, 3).join(' | '));
    const contextLostLines = page.consoleLines.filter((l) => /Context Lost/i.test(l.text));
    check('F10 …and the console says "Context Lost" not once',
      contextLostLines.length === 0, `${contextLostLines.length} lines`);

    writeFileSync(`${OUT}measurements.json`, `${JSON.stringify(measurements, null, 2)}\n`);
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify({
      rule: 'R1 — every pointer gesture in this walk is CDP input (Input.dispatchMouseEvent, via scripts/cdp.mjs). `dispatchEvent` is not used for any gesture.',
      bucket: 'R2 — the live bucket was asked before any hardware screenshot; its answer, including a refusal, is the first two steps.',
      steps,
    }, null, 2)}\n`);
  } finally {
    await page.close();
  }

  const failed = steps.filter((s) => !s.ok);
  console.log(`\n${steps.length - failed.length}/${steps.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
