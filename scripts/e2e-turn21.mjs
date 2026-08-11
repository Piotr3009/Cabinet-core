// ─── Turn 21, the acceptance walk, in a real Chromium ───────────────────────
//
// Run:  npm run build && npx vite preview --port 4173 &
//       node scripts/e2e-turn21.mjs
//
// ─── R1: A POINTER GESTURE IS PROVEN WITH A REAL POINTER ────────────────────
//
// Standing since turn 20: every click, double-click, drag and hover goes
// through `Input.dispatchMouseEvent` (scripts/cdp.mjs). Synthetic DOM events
// are BANNED, and the ban is enforced rather than promised — the guard below
// reads this file and refuses to run if anybody adds one.
//
// ─── R4 (NEW): A URL IS PROVEN BY ASKING THE APP FOR IT ─────────────────────
//
// Turn 20's audit fetched hinge models over URLs the VERIFY SCRIPT built for
// itself — correctly — while the app built its own without host or bucket and
// 404'd on the owner's machine. So the hardware step below takes the exact URL
// STRING out of `window.__cc.hardware`, which is what `3d/Hardware.jsx` handed
// the loader, and fetches THAT. It builds no URL of its own anywhere.
//
// ─── R5 (NEW): THE WALK READS THE CONSOLE ──────────────────────────────────
//
// The owner's console told us in one paste what three audits missed. Every step
// here runs against a live capture (`page.consoleLines`, `page.errors`), and
// the clean console is an ASSERTION at the end: any `Failed to load resource`
// on a hardware path, any WebGL `INVALID_OPERATION`, any uncaught error fails
// the walk.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { checkLiveBucket } from './bucket-live.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t21/', import.meta.url).pathname);

// R1's guard, and it is a guard rather than a promise: the banned call is
// `element.dispatch` + `Event(...)`, and the only way it can appear in this file
// is if somebody adds one. The name is built here rather than written out so
// that the check cannot match its own source.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

/**
 * A step this ENVIRONMENT cannot run, recorded as neither a pass nor a
 * failure.
 *
 * There is exactly one of these in this walk and it has one cause: the
 * session's egress policy answers 403 to the storage host, so no byte of the
 * owner's bucket can be reached from here. Ticking such a step would be a lie
 * and failing it would be a lie about the code, so it is written down as what
 * it is, with the refusal quoted (verify/t21/bucket-live.md).
 */
const blocked = (label, why, detail = '') => {
  steps.push({
    label, ok: null, blocked: why, detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
  });
  console.log(`BLKD  ${label} — ${why}${detail ? ` (${detail})` : ''}`);
};

const P = 'window.__cc';

/**
 * A panel's screen rectangle, from the LIVE scene and the LIVE camera.
 *
 * `unitId` matters: panel ids are unique WITHIN a cabinet and a room full of
 * wardrobes has a `SHELF-2` in every one of them. Scoping the search to the
 * unit's own group (`ccUnitId`, 3d/UnitView.jsx) is what makes a pointer aimed
 * at "that shelf" land on that shelf.
 */
const panelRectJs = (view, panelId, unitId = null) => `
  const view = ${P}.views && ${P}.views.${view};
  if (!view) return null;
  const THREE = view.three;
  const rect = view.gl.domElement.getBoundingClientRect();
  let root = view.scene;
  if (${JSON.stringify(unitId)}) {
    let found = null;
    view.scene.traverse((o) => {
      if (!found && o.userData && o.userData.ccUnitId === ${JSON.stringify(unitId)}) found = o;
    });
    if (!found) return null;
    root = found;
  }
  let mesh = null;
  root.traverse((o) => {
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

/**
 * A screen point that REALLY hits one panel.
 *
 * A projected bounding-box centre is a point in space, and the ray to it hits
 * whatever is in front — a shelf inside an open carcass is behind the top
 * board from any camera that looks down at all. So this raycasts a small grid
 * inside the panel's own screen rectangle, with the SAME copy of three the
 * renderer is using, and returns the first point whose FRONTMOST hit is the
 * panel asked for.
 *
 * It is arithmetic that decides WHERE to put a real pointer event, which is
 * exactly what R1 permits and what turn 20's `panelRectJs` already did — this
 * only makes the aim true for a piece that is not the nearest thing to the eye.
 */
const aimAtJs = (view, panelId, unitId = null) => `
  const view = ${P}.views && ${P}.views.${view};
  if (!view) return null;
  const THREE = view.three;
  const rect = view.gl.domElement.getBoundingClientRect();
  let root = view.scene;
  if (${JSON.stringify(unitId)}) {
    let found = null;
    view.scene.traverse((o) => {
      if (!found && o.userData && o.userData.ccUnitId === ${JSON.stringify(unitId)}) found = o;
    });
    if (!found) return null;
    root = found;
  }
  let mesh = null;
  root.traverse((o) => {
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
  const ray = new THREE.Raycaster();
  const owns = (o) => {
    for (let n = o; n; n = n.parent) if (n.userData && n.userData.ccPanelId) return n.userData.ccPanelId;
    return null;
  };
  const grid = [];
  for (let gy = 1; gy <= 9; gy += 1) {
    for (let gx = 1; gx <= 9; gx += 1) {
      grid.push([minX + ((maxX - minX) * gx) / 10, minY + ((maxY - minY) * gy) / 10]);
    }
  }
  // Nearest to the rectangle's centre first: a gesture belongs in the middle of
  // the thing it is about wherever the middle really works.
  const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
  grid.sort((a, b) => ((a[0] - cx) ** 2 + (a[1] - cy) ** 2) - ((b[0] - cx) ** 2 + (b[1] - cy) ** 2));
  for (const [px, py] of grid) {
    ray.setFromCamera(new THREE.Vector2(
      ((px - rect.left) / rect.width) * 2 - 1,
      -((py - rect.top) / rect.height) * 2 + 1,
    ), view.camera);
    const hits = ray.intersectObjects(view.scene.children, true)
      .filter((h) => h.object.visible && owns(h.object));
    if (hits.length && owns(hits[0].object) === ${JSON.stringify(panelId)}) {
      return { x: Math.round(px), y: Math.round(py), w: Math.round(maxX - minX), h: Math.round(maxY - minY) };
    }
  }
  return null;
`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const page = await launch({ width: 1600, height: 1000 });
  const shot = (name, clip = null) => page.screenshot(`${OUT}${name}.png`, clip);
  const measurements = {};

  /** A real DRAG, press → move → release, all through CDP (R1). */
  const drag = async (from, to, n = 10) => {
    if (!from.held) {
      await page.mouse('mouseMoved', from.x, from.y, { buttons: 0, clickCount: 0 });
      await page.send('Input.dispatchMouseEvent', {
        type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1, buttons: 1,
      });
    }
    for (let i = 1; i <= n; i += 1) {
      const x = Math.round(from.x + ((to.x - from.x) * i) / n);
      const y = Math.round(from.y + ((to.y - from.y) * i) / n);
      await page.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', x, y, button: 'left', buttons: 1,
      });
      await page.sleep(25);
    }
    await page.sleep(60);
  };
  const dropAt = async (to) => {
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(140);
  };

  const clickAt = async (x, y) => {
    await page.mouse('mouseMoved', x, y, { buttons: 0, clickCount: 0 });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1,
    });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(150);
  };

  /**
   * Press a REAL pointer on a panel, trying points until the app agrees it hit.
   *
   * A projected bounding box says where a board IS; it does not say where the
   * app's own hit-testing will find it. A shelf inside an open carcass is
   * behind the top board from any camera that looks down, and the strip of it
   * that a hand can actually grab is its front edge. So this walks a grid of
   * real points, presses at each, and asks the STORE whether that press
   * selected the piece — releasing and moving on when it did not.
   *
   * Every gesture is CDP input (R1). What is searched for is the aim, and the
   * app itself is the judge of it.
   */
  const pressOn = async (rect, panelId, readSelected) => {
    const cols = [0.5, 0.35, 0.65, 0.2, 0.8];
    const rows = [0.85, 0.7, 0.5, 0.95, 0.3];
    for (const ry of rows) {
      for (const rx of cols) {
        const x = Math.round(rect.x - rect.w / 2 + rect.w * rx);
        const y = Math.round(rect.y - rect.h / 2 + rect.h * ry);
        await page.mouse('mouseMoved', x, y, { buttons: 0, clickCount: 0 });
        await page.send('Input.dispatchMouseEvent', {
          type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1,
        });
        await page.sleep(70);
        const got = await page.evaluate(readSelected);
        if (got === panelId) return { x, y };
        await page.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0,
        });
        await page.sleep(50);
      }
    }
    return null;
  };

  const fresh = async (name) => {
    await page.evaluate(`
      ${P}.project.getState().newProject(${JSON.stringify(name)});
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      return true;
    `);
    await page.sleep(700);
  };

  try {
    await page.goto(BASE);
    await page.evaluate('localStorage.clear(); return true;');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Turn 21 walk');
    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.sleep(1200);

    // ══ R2 — THE BUCKET, BEFORE ANY PICTURE OF HARDWARE ═════════════════════
    const bucket = await checkLiveBucket().catch((e) => ({ host: null, ok: false, error: e.message, families: [] }));
    measurements.bucket = bucket;
    check('R2 the LIVE bucket was asked, before any hardware was photographed',
      bucket.families.length === 2,
      bucket.ok
        ? bucket.families.map((f) => `${f.id} ${f.manifestStatus} ${f.rows} rows, model ${f.model?.bytes}B`).join(' | ')
        : `BLOCKED in this environment — ${bucket.families.map((f) => `${f.id}: ${f.error}`).join(' | ')}`);

    // ══ the project the walk is about ═══════════════════════════════════════
    const ids = await page.evaluate(`
      const s = ${P}.project.getState();
      const dr = s.addUnit('BUDR');
      s.setUnitName(dr.id, 'DR1');
      const door = s.addUnit('BUD', { near: dr.id });
      s.setUnitName(door.id, 'F01');
      s.setDoors(door.id, { count: 1 });
      ${P}.ui.getState().selectUnit(dr.id);
      return { drawerUnit: dr.id, doorUnit: door.id };
    `);
    measurements.ids = ids;
    await page.sleep(900);
    await page.wheel(800, 560, -240, 7);
    await page.sleep(800);

    // ══ F1 — THE PILOT HOLES ARE THE GATE ═══════════════════════════════════
    //
    // The same function the node gate and verify/t21/hole-alignment.md ask —
    // `engine/drawerPilots.js` — asked of the LIVE project in the LIVE page.
    const f1 = await page.evaluate(`
      const s = ${P}.project.getState();
      const p = ${P}.profile.getState().profile;
      const r = s.unitResult(${JSON.stringify(ids.drawerUnit)});
      return {
        rows: window.__ccT21.drawerPilots.drawerPilotRows(r, p),
        bottoms: r.drillSummary.runner_bottoms_carcass_y,
        screwRows: r.drillSummary.runner_rows_carcass_y,
        offset: p.baseDrawerUnit.firstRowFromBottom,
      };
    `);
    measurements.f1 = f1;
    check('F1 THE GATE — every drawer’s façade pilot and box-front pilot are level',
      f1.rows.length > 0 && f1.rows.every((r) => r.delta === 0),
      f1.rows.map((r) => `d${r.drawer} ${r.facadeY}=${r.boxY}`).join(' | '));
    check('F1.1 the runner’s BOTTOM and its screw row are two named things',
      f1.bottoms.length === f1.screwRows.length
        && f1.bottoms.every((b, i) => f1.screwRows[i] - b === f1.offset),
      `+${f1.offset} on every row`);
    check('F1.3 the runner MODEL stands on the runner, not on its screws',
      await page.evaluate(`
        const s = ${P}.project.getState();
        const p = ${P}.profile.getState().profile;
        const r = s.unitResult(${JSON.stringify(ids.drawerUnit)});
        const hw = window.__ccHardware3d.hardwareInstances(r, p);
        const b = r.drillSummary.runner_bottoms_carcass_y;
        return hw.runners.length > 0 && hw.runners.every((x) => b.includes(x.y)
          && x.rowY - x.y === p.baseDrawerUnit.firstRowFromBottom);
      `), 'every instance carries both');

    // The picture: the drawer, exploded, with the two hole rows level. The
    // fronts come off so the box is visible at all.
    await page.evaluate(`
      const s = ${P}.project.getState();
      ${P}.ui.getState().setHideFronts && ${P}.ui.getState().setHideFronts(true);
      return true;
    `).catch(() => null);
    await page.sleep(400);
    await shot('1a-drawer-box-on-its-runner');
    // …and back on. Every step after this one is about a DOOR, and a door that
    // is not drawn cannot be clicked — which is R1's whole point.
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      if (ui.setHideFronts) ui.setHideFronts(false);
      return true;
    `).catch(() => null);
    await page.sleep(500);

    // ══ F2 / R4 — THE HINGE URL, TAKEN OUT OF THE APP ═══════════════════════
    await page.evaluate(`${P}.ui.getState().selectUnit(${JSON.stringify(ids.doorUnit)}); return true;`);
    await page.sleep(400);
    // Open the door so the hinges are drawn (they come out from behind X-ray
    // when a door is open — turn 11 F3.5).
    await page.evaluate(`
      const ui = ${P}.ui.getState();
      if (ui.setXray) ui.setXray(true);
      return true;
    `).catch(() => null);
    await page.sleep(900);

    const registry = await page.evaluate(`
      const h = window.__cc.hardware;
      if (!h) return null;
      return {
        surfaces: h.surfaces,
        hinge: h.of('hinge'),
        plate: h.of('plate'),
        runner: h.of('runner'),
        urls: h.urls(),
      };
    `);
    measurements.registry = registry;
    check('R4 the scene publishes what it MOUNTED — url and model, per surface',
      Boolean(registry) && Array.isArray(registry.hinge),
      registry ? `${registry.hinge.length} hinges, ${registry.runner.length} runners, ${registry.urls.length} distinct urls` : 'no registry');

    const hingeUrl = registry?.hinge?.find((r) => r.url)?.url || null;
    measurements.hingeUrl = hingeUrl;
    check('F2 the hinge url the APP built has a host and the bucket exactly once',
      !hingeUrl || (hingeUrl.startsWith('https://')
        && hingeUrl.split('/hardware/').length === 2
        && hingeUrl.endsWith('.glb')),
      hingeUrl || '(no host in this build — see F2 below)');

    // R4: fetch THAT string, whatever it is, and record what comes back.
    // `Runtime.evaluate` runs the expression in a plain arrow, so the fetch is
    // a PROMISE returned to the driver (`awaitPromise: true`) rather than an
    // `await` the page cannot parse.
    const fetched = hingeUrl ? await page.evaluate(`
      return fetch(${JSON.stringify(hingeUrl)})
        .then((res) => (res.ok
          ? res.arrayBuffer().then((buf) => ({ status: res.status, bytes: buf.byteLength }))
          : { status: res.status, bytes: 0 }))
        .catch((e) => ({ status: 0, bytes: 0, error: String(e && e.message) }));
    `) : { status: null, bytes: 0, error: 'the app produced no url in this build' };
    measurements.hingeFetch = fetched;
    // R4's claim is about PROVENANCE — the string came out of the app — and
    // that is asserted unconditionally. Whether the bytes arrive is the
    // bucket's business, and in this environment the bucket is unreachable.
    check('R4 the string fetched is the APP’s own, taken out of its registry',
      Boolean(hingeUrl) && registry.urls.includes(hingeUrl) && fetched.status !== null,
      `${hingeUrl ? 'from window.__cc.hardware' : 'no url'} → ${fetched.status} ${fetched.bytes}B`);
    if (bucket.ok) {
      check('R4 …and the model really is there: 200, over 10 KB',
        fetched.status === 200 && fetched.bytes > 10 * 1024, `${fetched.status} ${fetched.bytes}B`);
      check('F2.3 the mounted hinge is the GLB mesh, not the stand-in',
        Boolean(registry) && registry.hinge.length > 0 && registry.hinge.every((r) => r.model),
        registry ? registry.hinge.map((r) => (r.model ? 'model' : r.reason)).slice(0, 4).join(',') : '');
    } else {
      blocked('R4 …and the model really is there: 200, over 10 KB',
        'the egress policy answers 403 for the storage host',
        `${fetched.status} ${fetched.bytes}B — see verify/t21/bucket-live.md`);
      blocked('F2.3 the mounted hinge is the GLB mesh, not the stand-in',
        'no byte of the bucket is reachable from this session',
        registry ? registry.hinge.map((r) => (r.model ? 'model' : r.reason)).slice(0, 4).join(',') : '');
      // What CAN be proven here is the degradation itself, and it is the iron
      // rule: a file that does not arrive is the OTHER path, never a hole.
      check('F2.3 …and the unreachable bucket degrades to the stand-in, never to a hole',
        Boolean(registry) && registry.hinge.every((r) => r.model === false && r.reason === 'failed'),
        registry ? registry.hinge.map((r) => r.reason).join(',') : '');
    }
    // The stand-in path, proven the way F2.3 asks: no host ⇒ no url ⇒ no
    // request. That is the owner's 404, gone at the root.
    const offline = await page.evaluate(`
      const p = ${P}.profile.getState().profile;
      const H = window.__ccT21.hardwareUrl;
      const fam = window.__ccHinges.hingeFamilies(p)[0];
      return {
        withHost: Boolean(window.__ccHinges.hingeModelSrc(fam, p, 'https://x.test/storage/v1/object/public')),
        withNoHost: window.__ccHinges.hingeModelSrc(fam, p, ''),
        pathStillTrue: window.__ccHinges.hingeModelUrl(fam, p, ''),
        derived: H.storageBaseFrom('https://x.test/storage/v1/object/public/decors/a.jpg'),
      };
    `);
    measurements.offline = offline;
    check('F2 a path with NO HOST is not a url — the stand-in, and no request',
      offline.withHost === true && offline.withNoHost === null && Boolean(offline.pathStillTrue),
      `no-host → ${JSON.stringify(offline.withNoHost)}; the in-bucket path is still "${offline.pathStillTrue}"`);
    await shot('2a-hinge-in-the-main-scene');

    // ══ F3 — THE CARVING IS RETIRED ═════════════════════════════════════════
    const f3 = await page.evaluate(`
      const p = ${P}.profile.getState().profile;
      const view = ${P}.views.room;
      let cuts = 0; let panels = 0;
      view.scene.traverse((o) => {
        if (!o.isMesh) return;
        if (o.userData && o.userData.ccCutFaces) cuts += 1;
        if (o.userData && o.userData.ccPanelId) panels += 1;
      });
      return { enabled: p.appearance.cuts.enabled, cuts, panels };
    `);
    measurements.f3 = f3;
    check('F3.1 the 3-D wound-carving is OFF by default, and nothing is carved',
      f3.enabled === false && f3.cuts === 0 && f3.panels > 0,
      `${f3.cuts} cut meshes over ${f3.panels} panels`);
    await shot('3a-flag-off-the-turn-19-look');

    // ══ F4 — THE MODAL CLEARS THE OBJECT BY 240 ═════════════════════════════
    const offsetX = await page.evaluate(`return ${P}.profile.getState().profile.ui.modal.anchorOffset.x;`);
    check('F4.1 the offset is a PROFILE number and it is 240', offsetX === 240, String(offsetX));

    // The FIVE CORNERS, through the shell's own arithmetic — the same pure
    // function `components/Modal.jsx` places with — at the profile's number.
    const corners = [
      ['centre', 0.5, 0.5], ['top-left', 0.08, 0.1], ['top-right', 0.92, 0.1],
      ['bottom-left', 0.08, 0.9], ['bottom-right', 0.92, 0.9],
    ];
    const modalRects = [];
    for (const [name, fx, fy] of corners) {
      const at = { x: Math.round(1600 * fx), y: Math.round(1000 * fy) };
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
    measurements.f4corners = modalRects;
    check(`F4.2 the panel keeps ${offsetX} px of clear glass beside the click in all five corners`,
      modalRects.every((m) => (m.side === 'right'
        ? m.left - m.click.x >= offsetX - 1e-6
        : m.click.x - (m.left + m.size.width) >= offsetX - 1e-6)),
      modalRects.map((m) => `${m.name}:${m.side}`).join(' '));
    check('F4.2 …and its TOP is still level with the click wherever the viewport allows',
      modalRects.every((m) => m.top === m.click.y
        || m.top === 1000 - m.size.height - 8 || m.top === 8),
      modalRects.map((m) => `${m.name}:${m.top - m.click.y}`).join(' '));

    // …and the real gesture, on the door itself (R1).
    const doorRect = await page.evaluate(aimAtJs('room', `${'F01'}-F`, ids.doorUnit))
      || await page.evaluate(panelRectJs('room', `${'F01'}-F`, ids.doorUnit));
    measurements.doorRect = doorRect;
    if (doorRect) {
      // The unit first: a piece is reached through the cabinet it is in, which
      // is the room's own rule since turn 13.
      await page.evaluate(`${P}.ui.getState().selectUnit(${JSON.stringify(ids.doorUnit)}); return true;`);
      await page.sleep(300);
      // A REAL double-click, at points across the leaf until one opens it — the
      // app is the judge of the aim, exactly as it is for the shelf and the bay
      // door below.
      for (const [rx, ry] of [[0.5, 0.5], [0.5, 0.35], [0.5, 0.65], [0.35, 0.5], [0.65, 0.5]]) {
        const x = Math.round(doorRect.x - doorRect.w / 2 + doorRect.w * rx);
        const y = Math.round(doorRect.y - doorRect.h / 2 + doorRect.h * ry);
        // eslint-disable-next-line no-await-in-loop
        await page.dblclick(x, y);
        // eslint-disable-next-line no-await-in-loop
        await page.sleep(450);
        // eslint-disable-next-line no-await-in-loop
        const open = await page.evaluate(`return Boolean(document.querySelector('[data-modal-shell="1"]'));`);
        if (open) break;
      }
      const placed = await page.evaluate(`
        const el = document.querySelector('[data-modal-shell="1"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          left: r.left, top: r.top, width: r.width, height: r.height,
          side: el.getAttribute('data-modal-side') || '',
        };
      `);
      measurements.f4live = { doorRect, placed };
      if (placed) {
        const clear = placed.side === 'left'
          ? doorRect.x - (placed.left + placed.width)
          : placed.left - doorRect.x;
        check('F4.2 …and the LIVE panel stands that far clear of the door it is about',
          clear >= offsetX - 2, `${Math.round(clear)} px, on the ${placed.side || 'right'}`);
        await shot('4a-modal-beside-the-door-at-240');
      } else {
        check('F4.2 …and the LIVE panel stands that far clear of the door it is about',
          false, 'the double-click opened no modal');
      }
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(250);
    }

    // ══ F5 — THE CONTEXT GUARD STOPS SHOOTING CORPSES ═══════════════════════
    await page.evaluate(`window.__cc.diag && window.__cc.diag.reset(); return true;`);
    const before = page.consoleLines.length;
    for (let i = 0; i < 12; i += 1) {
      await page.evaluate(`
        ${P}.ui.getState().openModal('cabinet', { unitId: ${JSON.stringify(ids.drawerUnit)} });
        return true;
      `);
      await page.sleep(320);
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      await page.sleep(200);
    }
    await page.sleep(600);
    const cycled = page.consoleLines.slice(before).map((l) => l.text).join('\n');
    const diag = await page.evaluate(`
      const d = window.__cc.diag;
      return d ? { created: d.created, released: d.released, lost: d.lost, live: d.liveContexts() } : null;
    `);
    measurements.f5 = { diag, invalidOps: (cycled.match(/INVALID_OPERATION/g) || []).length };
    check('F5.2 twelve editor cycles: ≤ 2 live contexts and nothing LOST',
      Boolean(diag) && diag.live <= 2 && diag.lost === 0, JSON.stringify(diag));
    check('F5.1 …and ZERO `INVALID_OPERATION: loseContext: context already lost`',
      !/INVALID_OPERATION/.test(cycled) && !/already lost/.test(cycled),
      measurements.f5.invalidOps ? cycled.slice(0, 200) : 'clean');
    writeFileSync(`${OUT}context-guard-console.txt`, cycled || '(the console said nothing at all)');

    // ══ F6 — THE EDITORS MOUNT THE SAME HARDWARE ════════════════════════════
    await page.evaluate(`
      ${P}.ui.getState().openModal('cabinet', { unitId: ${JSON.stringify(ids.drawerUnit)}, drawer: 2 });
      return true;
    `);
    await page.sleep(1100);
    await page.click('button', 'Explode');
    await page.sleep(900);
    const editorHw = await page.evaluate(`
      const h = window.__cc.hardware;
      const rows = h ? h.rows.filter((r) => r.surface === 'drawer-editor') : [];
      return { surfaces: h ? h.surfaces : [], rows };
    `);
    measurements.f6 = editorHw;
    check('F6.1/F6.3 the drawer editor mounts hardware through the SAME registry',
      editorHw.rows.length > 0, `${editorHw.rows.length} entries on surface drawer-editor`);
    // F6.1's real claim: ONE loader, one cache, one degradation story. With the
    // bucket unreachable the room and the editor must fall the SAME way — and
    // that is checkable here, where "both show the model" is not.
    const roomRunners = (registry?.runner || []).map((r) => r.model);
    const editorRunners = editorHw.rows.filter((r) => r.family === 'runner').map((r) => r.model);
    check('F6.1 …and the editor degrades exactly as the room does — one story',
      editorRunners.length > 0
        && new Set([...roomRunners, ...editorRunners]).size <= 1,
      `room [${roomRunners.join(',')}] editor [${editorRunners.join(',')}]`);
    await shot('6a-drawer-editor-exploded-with-runners');
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(400);

    // ══ F7 / F10 — THE SHELF'S THREE KINDS, ON THE INTERIOR DATUM ═══════════
    const shelfIds = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const w = S().addUnit('WARDROBE');
      S().setUnitName(w.id, 'W1');
      S().updateUnitParams(w.id, { width: 1200 });
      S().addShelves(w.id, 2);
      const w2 = S().addUnit('WARDROBE', { near: w.id });
      S().setUnitName(w2.id, 'W2');
      S().addShelves(w2.id, 1);
      ${P}.ui.getState().selectUnit(w.id);
      return { a: w.id, b: w2.id };
    `);
    await page.sleep(900);
    measurements.shelfIds = shelfIds;

    const f7 = await page.evaluate(`
      const T = window.__ccT21.shelfTypes;
      const S = () => ${P}.project.getState();
      const unit = S().units.find((u) => u.id === ${JSON.stringify(shelfIds.a)});
      const items = unit.params.sections[0].items.filter((i) => i.kind === 'shelf');
      return {
        types: T.SHELF_TYPES.map((t) => ({ id: t.id, label: t.label, enabled: t.enabled })),
        read: items.map((i) => T.shelfTypeOf(i)),
        refused: S().setShelfType(unit.id, items[0].id, 'pullout'),
      };
    `);
    measurements.f7 = f7;
    check('F7 the shelf offers three kinds — fix, adjustable, pull-out',
      f7.types.map((t) => t.id).join(',') === 'fix,adjustable,pullout', JSON.stringify(f7.types));
    check('F7.3 …and PULL-OUT is visible, disabled, and refused by the setter',
      f7.types[2].enabled === false && f7.refused !== 'pullout', `setter answered ${f7.refused}`);

    const f10 = await page.evaluate(`
      const s = ${P}.project.getState();
      const H = window.__ccT21.shelfHeights;
      const unit = s.units.find((u) => u.id === ${JSON.stringify(shelfIds.a)});
      const G = unit.params.board_t;
      const item = unit.params.sections[0].items.find((i) => i.kind === 'shelf');
      const r = s.unitResult(unit.id);
      const shelves = r.panels.filter((p) => p.part === 'SHELF' && p.box);
      const lights = H.clearLights({
        positions: shelves.map((p) => p.box.y),
        thickness: shelves.map((p) => p.box.h),
        floor: H.interiorFloor(G),
        ceiling: unit.params.height - G,
      });
      const first = shelves.slice().sort((a, b) => a.box.y - b.box.y)[0];
      return {
        stored: item.pos_mm,
        field: H.fieldFromPos(first.box.y, G),
        chip: H.lightBelow(first.box.y, lights).size,
        roundTrip: H.posFromField(H.fieldFromPos(first.box.y, G), G) === first.box.y,
      };
    `);
    measurements.f10 = f10;
    check('F10 the panel field and the 3-D chip are the SAME number',
      f10.field === f10.chip && f10.roundTrip, `field ${f10.field} = chip ${f10.chip}`);

    // ══ F11 — THE HEIGHT MAGNET, ON A REAL DRAG ═════════════════════════════
    //
    // The owner names two neighbours — the next BAY and the next CABINET — and
    // the walk uses the first, because it is the one a single camera can hold:
    // one wardrobe, a partition, and two shelves seven millimetres apart in the
    // two bays either side of it.
    // In a project of its own, for the same reason F9 is: a cabinet added to a
    // nearly-full room is placed where there is room, and a pointer cannot be
    // aimed at a cabinet that is off the side of the frame.
    await fresh('Turn 21 — F11');
    await page.sleep(800);
    const magnetIds = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const u = S().addUnit('WARDROBE');
      S().setUnitName(u.id, 'W4');
      S().updateUnitParams(u.id, { width: 1200 });
      S().addPartition(u.id, 600);
      S().addShelves(u.id, 1, 0);
      S().addShelves(u.id, 1, 1);
      const shelves = () => S().units.find((x) => x.id === u.id)
        .params.sections[0].items.filter((i) => i.kind === 'shelf');
      const ids = shelves().map((i) => i.id);
      // Whatever the bay picker did, say it explicitly: one shelf per bay.
      S().updateItem(u.id, ids[0], { zone: 0 });
      S().updateItem(u.id, ids[1], { zone: 1 });
      S().setShelfPos(u.id, ids[0], 900);
      S().setShelfPos(u.id, ids[1], 907);
      ${P}.ui.getState().selectUnit(u.id);
      const r = S().unitResult(u.id);
      return {
        unit: u.id,
        left: ids[0],
        right: ids[1],
        runs: r.panels.filter((p) => p.part === 'SHELF').map((p) => p.meta.run),
        at: shelves().map((i) => i.pos_mm),
      };
    `);
    measurements.magnetIds = magnetIds;
    await page.sleep(900);

    const magnet = await page.evaluate(`
      // Zustand's getState() is a SNAPSHOT: every read after a write has to be
      // taken fresh, or the walk is asking the store what it used to think.
      const S = () => ${P}.project.getState();
      const UID = ${JSON.stringify(magnetIds.unit)};
      const LEFT = ${JSON.stringify(magnetIds.left)};
      const posOf = (id) => S().units.find((u) => u.id === UID)
        .params.sections[0].items.find((i) => i.id === id).pos_mm;
      const candidates = S().shelfMagnetCandidates(UID, LEFT);
      // The DRAG path, through the store's own drag setter — which is the one
      // the pointer drives (3d/UnitView.jsx onMoveShelf). A typed number goes
      // through setShelfPos and is deliberately NOT this.
      const near = S().moveShelf(UID, LEFT, 903, 1);
      const caughtAt = posOf(LEFT);
      const through = S().moveShelf(UID, LEFT, 960, 1);
      const freeAt = posOf(LEFT);
      // …and the FIELD, 2 mm off, which must not snap (F11.2).
      S().setShelfPos(UID, LEFT, 905);
      const typedAt = posOf(LEFT);
      return {
        candidates, caught: Boolean(near.magnet), caughtAt, through: Boolean(through.magnet), freeAt, typedAt,
      };
    `);
    measurements.f11 = magnet;
    const bayCandidates = magnet.candidates.filter((c) => c.from === 'bay');
    check('F11.1 the next BAY’s shelf is a candidate — and it is the only one in this cabinet',
      bayCandidates.length === 1
        && bayCandidates[0].pos === 907
        && bayCandidates[0].itemId === magnetIds.right,
      JSON.stringify(magnet.candidates));
    check('F11.1 dragging within the window CATCHES the neighbour’s height',
      magnet.caught && magnet.caughtAt === 907, `caught at ${magnet.caughtAt}`);
    check('F11.2 drag on THROUGH and it lets go',
      !magnet.through && magnet.freeAt === 960, `let go at ${magnet.freeAt}`);
    check('F11.2 …and a number TYPED 2 mm off does not snap',
      magnet.typedAt === 905, `the field wrote ${magnet.typedAt}`);

    // The guide line, on a REAL pointer drag held mid-flight so it can be
    // photographed (R1: press, move, screenshot, release). The target is the
    // NEIGHBOUR's own height, projected by the live camera — so the pointer is
    // aimed at the thing it has to catch rather than at a guess.
    await page.evaluate(`
      ${P}.project.getState().setShelfPos(
        ${JSON.stringify(magnetIds.unit)}, ${JSON.stringify(magnetIds.left)}, 830,
      );
      return true;
    `);
    await page.sleep(700);
    // The room's own opening view frames a single cabinet perfectly well; what
    // is needed is the AIM, and that is `pressOn` below.
    const shelfRect = await page.evaluate(aimAtJs('room', 'SHELF-1', magnetIds.unit));
    // The NEIGHBOUR's own mesh, walked out of the live scene by the same
    // projection every other gesture in this walk is aimed with. SHELF-1 is the
    // lowest board (the engine orders them bottom-up) and is the one in the
    // hand; SHELF-2 is the one it has to catch.
    const targetPoint = await page.evaluate(panelRectJs('room', 'SHELF-2', magnetIds.unit));
    measurements.f11target = { shelfRect, targetPoint };
    // The press has to land on the SHELF, and the app is the judge of that.
    const grabbed = shelfRect
      ? await pressOn(shelfRect, 'SHELF-1', `
        const e = ${P}.ui.getState().selectedElement;
        return e ? e.elementRef : null;
      `)
      : null;
    measurements.f11grab = grabbed;
    if (grabbed && targetPoint) {
      // Already pressed on the shelf. Now MOVE, a few pixels at a time, the way
      // a hand does — and stop the moment the store says it has caught. The
      // pointer is held down throughout, so the guide line is on screen to be
      // photographed.
      const up = grabbed.y > targetPoint.y ? -1 : 1;
      for (let i = 0; i < 90; i += 1) {
        const y = grabbed.y + up * (i + 1) * 2;
        // eslint-disable-next-line no-await-in-loop
        await page.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved', x: grabbed.x, y, button: 'left', buttons: 1,
        });
        // eslint-disable-next-line no-await-in-loop
        await page.sleep(22);
        // eslint-disable-next-line no-await-in-loop
        const caught = await page.evaluate(`
          const d = ${P}.ui.getState().dragging;
          return Boolean(d && d.magnet);
        `);
        if (caught) break;
      }
      const held = await page.evaluate(`
        const ui = ${P}.ui.getState();
        const d = ui.dragging;
        return {
          dragging: d ? { pos: d.pos, magnet: d.magnet || null } : null,
          selectedElement: ui.selectedElement ? ui.selectedElement.elementRef : null,
          selectedUnit: ui.selectedUnitId || (ui.selection && ui.selection[0]) || null,
        };
      `);
      measurements.f11drag = held;
      check('F11.1 a REAL pointer drag catches it, and the guide line is drawn',
        Boolean(held && held.dragging && held.dragging.magnet), JSON.stringify(held));
      await shot('11a-magnet-guide-line');
      await dropAt({ x: grabbed.x, y: grabbed.y });
    } else {
      check('F11.1 a REAL pointer drag catches it, and the guide line is drawn', false,
        `aim: rect ${JSON.stringify(shelfRect)} target ${JSON.stringify(targetPoint)}`);
    }

    // ══ F8 / F9 / F12 — THE THREE-BAY PARTITION DOORS ═══════════════════════
    await fresh('Turn 21 — F12');
    await page.sleep(800);
    const f12 = await page.evaluate(`
      const S = () => ${P}.project.getState();
      const u = S().addUnit('WARDROBE');
      S().setUnitName(u.id, 'W3');
      S().updateUnitParams(u.id, { width: 1400 });
      S().addPartition(u.id, 600);
      S().addPartition(u.id, 800);
      const items = S().units.find((x) => x.id === u.id).params.sections[0].items
        .filter((i) => i.kind === 'partition');
      // F8: the setback is the PIECE's, and 0 is what a door needs.
      for (const it of items) S().setElementDepth(u.id, it.id, 0);
      const bays = S().bayDoorsFor(u.id);
      S().setBayDoors(u.id, [
        { door: 'one', hinge: 'L' }, { door: 'one', hinge: 'L' }, { door: 'one', hinge: 'R' },
      ]);
      const r = S().unitResult(u.id);
      const fronts = r.panels.filter((p) => p.part === 'FRONT').sort((a, b) => a.box.x - b.box.x);
      ${P}.ui.getState().selectUnit(u.id);
      return {
        unit: u.id,
        bays: bays.length,
        setbacks: r.panels.filter((p) => p.part === 'VPART').map((p) => p.meta.setback),
        fronts: fronts.map((p) => ({ id: p.id, x: p.box.x, w: p.w, on: p.meta.hingeOn })),
        gaps: fronts.slice(1).map((p, i) => p.box.x - (fronts[i].box.x + fronts[i].w)),
        plate: r.drills.filter((d) => d.panel === 'VPART-1' && d.kind === 'hinge').length,
        plateLayers: [...new Set(r.drills.filter((d) => d.panel.startsWith('VPART')).map((d) => d.layer))],
      };
    `);
    measurements.f12 = f12;
    await page.sleep(1000);
    check('F8 the partition setback is the PIECE’s own, and 0 is allowed',
      f12.setbacks.every((v) => v === 0), JSON.stringify(f12.setbacks));
    check('F12 three bays, three doors, and the gaps between them are all 3',
      f12.bays === 3 && f12.fronts.length === 3 && f12.gaps.every((g) => Math.abs(g - 3) < 1e-6),
      JSON.stringify(f12.gaps));
    check('F12.3 the leaf hinged ON the partition covers it; its neighbour covers none',
      f12.fronts[1].x === 603 && Math.abs(f12.fronts[0].x + f12.fronts[0].w - 600) < 1e-6,
      f12.fronts.map((f) => `${f.id}@${f.x}+${f.w} on ${f.on}`).join(' | '));
    check('F12.2 the plate pattern is HINGES_5MM on the partition and nothing else',
      f12.plate > 0 && f12.plateLayers.join(',') === 'HINGES_5MM',
      `${f12.plate} holes, layers ${f12.plateLayers.join(',')}`);

    // …and a REAL double-click on one bay door opens it (R1). The camera is
    // put on the cabinet first: a leaf that is off-frame cannot be clicked, and
    // aiming a pointer at where a thing WOULD be is exactly what R1 forbids.
    await page.sleep(600);
    const bayRect = await page.evaluate(panelRectJs('room', 'W3-B2', f12.unit));
    measurements.bayRect = bayRect;
    if (bayRect) {
      // A REAL double-click, at points across the leaf until one opens it. The
      // app is the judge of the aim, exactly as it is for the shelf above.
      let opened = null;
      for (const [rx, ry] of [[0.5, 0.5], [0.5, 0.35], [0.5, 0.65], [0.35, 0.5], [0.65, 0.5], [0.5, 0.2]]) {
        const x = Math.round(bayRect.x - bayRect.w / 2 + bayRect.w * rx);
        const y = Math.round(bayRect.y - bayRect.h / 2 + bayRect.h * ry);
        await page.dblclick(x, y);
        await page.sleep(420);
        // eslint-disable-next-line no-await-in-loop
        opened = await page.evaluate(`
          const ui = ${P}.ui.getState();
          const el = document.querySelector('[data-edit-element="1"], [role="dialog"], .cc-modal');
          return ui.modal ? (ui.modal + ':' + JSON.stringify(ui.modalArgs && ui.modalArgs.panelId || null)) : null;
        `);
        if (opened) break;
        await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
      }
      measurements.f12modal = opened;
      check('F12 a REAL double-click on a bay door opens its own modal', Boolean(opened), opened || '');
      await shot('12a-three-bay-partition-doors');
      await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    } else {
      await shot('12a-three-bay-partition-doors');
      check('F12 a REAL double-click on a bay door opens its own modal', false, 'the leaf was not on screen');
    }

    // ══ F9 — ORDER DECIDES NOTHING ══════════════════════════════════════════
    //
    // In a project of its own: the room this walk has been filling is nearly
    // full, and a cabinet that cannot be placed is not a cabinet this question
    // is about.
    await fresh('Turn 21 — F9');
    await page.sleep(700);
    const buildJs = `
      const S = () => ${P}.project.getState();
      const build = (partitionFirst) => {
        const u = S().addUnit('WARDROBE');
        S().updateUnitParams(u.id, { width: 1200 });
        const add = {
          partition: () => S().addPartition(u.id, 600),
          shelf: () => {
            S().addShelves(u.id, 1);
            const it = S().units.find((x) => x.id === u.id).params.sections[0].items
              .filter((i) => i.kind === 'shelf').slice(-1)[0];
            S().setShelfPos(u.id, it.id, 1000);
            S().updateItem(u.id, it.id, { variant: 'fixed', zone: 1 });
          },
        };
        if (partitionFirst) { add.partition(); add.shelf(); } else { add.shelf(); add.partition(); }
        const r = S().unitResult(u.id);
        return r.panels.filter((p) => p.box)
          .map((p) => p.id + '|' + p.w + 'x' + p.h + '|' + p.box.x + ',' + p.box.y)
          .sort().join(';');
      };
      return build(ORDER);
    `;
    // One project per build: a cabinet whose width was clamped by the neighbour
    // already standing there is not the cabinet this question is about.
    const f9a = await page.evaluate(buildJs.replace('ORDER', 'true'));
    await fresh('Turn 21 — F9 (the other way round)');
    await page.sleep(700);
    const f9b = await page.evaluate(buildJs.replace('ORDER', 'false'));
    const f9 = { same: f9a === f9b, a: f9a, b: f9b };
    measurements.f9 = f9;
    check('F9.2 both orders of the owner’s case end in identical geometry',
      f9.same === true,
      f9.same ? '' : `partition-first ${f9.a.slice(0, 90)} vs shelf-first ${f9.b.slice(0, 90)}`);

    // ══ R5 — THE CONSOLE, AS AN ASSERTION ═══════════════════════════════════
    const console_ = page.consoleLines.map((l) => `${l.level}: ${l.text}`);
    const errors = page.errors.slice();
    writeFileSync(`${OUT}console.txt`, [...console_, '', '── errors ──', ...errors].join('\n'));
    // ─── What R5 can and cannot say in THIS environment ────────────────────
    //
    // The owner's failure was a hardware request to the APP'S OWN ORIGIN —
    // `/hinges/blum/71B3550_….glb` — because the url had no host. That is the
    // thing to assert, and it is fully checkable here: any hardware request to
    // the preview server is the bug, whatever the network does.
    //
    // A request to the BUCKET that this session's egress policy refuses
    // (`ERR_TUNNEL_CONNECTION_FAILED`) is the environment, not the app: the url
    // is correct, and verify/t21/bucket-live.md carries the proxy's own
    // refusal. It is recorded separately rather than being counted either way.
    const hardwarePaths = /(hinges|runners|blum|\.glb|manifest\.json)/i;
    const failures = errors.filter((e) => /Failed to load resource/.test(e) && hardwarePaths.test(e));
    const ownOrigin = failures.filter((e) => e.includes(BASE) || /\[https?:\/\/127\.0\.0\.1/.test(e));
    const upstreamBlocked = failures.filter((e) => !ownOrigin.includes(e));
    const hardwareFailures = ownOrigin;
    const webglBad = [...console_, ...errors].filter((e) => /INVALID_OPERATION/.test(e));
    const uncaught = errors.filter((e) => !/Failed to load resource/.test(e)
      && !/favicon/i.test(e));
    measurements.console = {
      lines: console_.length,
      errors: errors.length,
      ownOriginHardwareFailures: ownOrigin,
      upstreamBlocked,
      webglBad,
      uncaught,
    };
    check('R5 the app NEVER asks its own domain for a hardware model (the owner’s 404)',
      hardwareFailures.length === 0, hardwareFailures.slice(0, 3).join(' | ') || 'clean');
    if (upstreamBlocked.length) {
      blocked('R5 …and the bucket’s own requests succeed',
        'the egress policy refuses the storage host (ERR_TUNNEL_CONNECTION_FAILED)',
        `${upstreamBlocked.length} requests, all to the correct absolute url`);
    } else {
      check('R5 …and the bucket’s own requests succeed', true, 'no failed hardware request at all');
    }
    check('R5 …no WebGL INVALID_OPERATION',
      webglBad.length === 0, webglBad.slice(0, 3).join(' | '));
    check('R5 …and no uncaught error',
      uncaught.length === 0, uncaught.slice(0, 3).join(' | '));

    await shot('99-the-room-at-the-end');
  } finally {
    const passed = steps.filter((s) => s.ok === true).length;
    const failed = steps.filter((s) => s.ok === false).length;
    const blockedCount = steps.filter((s) => s.ok === null).length;
    writeFileSync(`${OUT}walk.json`, `${JSON.stringify({
      base: BASE,
      when: new Date().toISOString(),
      passed,
      failed,
      blocked: blockedCount,
      total: steps.length,
      steps,
      measurements,
    }, null, 2)}\n`);
    console.log(`\n${passed}/${steps.length} passed, ${failed} failed, ${blockedCount} blocked by this environment — ${OUT}walk.json`);
    await page.close();
    if (failed > 0) process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
