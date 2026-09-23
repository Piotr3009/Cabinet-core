// ─── T74 · THE REAL HANDS, SHARED BY THE WALK AND THE PROBES ───────────────
//
// CLAUDE.md T74, LAWS: *"Test the way the client clicks. ... a REAL mouse
// (`page.mouse.click` / `page.mouse.dblclick` / drags at the piece's projected
// screen point through `window.__cc.views`) and adds pieces through the REAL
// buttons."*  One set of hands, so a probe and the walk cannot disagree about
// what a click is.

import { launch } from './cdp.mjs';
import { startFixtureServer } from './fixture-server.mjs';

export const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';

let seq = 0;
let showroom = null;
const nextPort = () => 9500 + ((process.pid % 40) * 12) + (seq += 1);

/** The silent showroom (T23 R8), started once for the process. */
export async function showroomUp() {
  if (!showroom) showroom = await startFixtureServer({ port: 4500 + (process.pid % 80) });
  return showroom;
}
export async function showroomDown() { await showroom?.close?.(); showroom = null; }

// ─── THE PAGE, AND ITS REAL HANDS ──────────────────────────────────────────

export async function open({ width = 1440, height = 900 } = {}) {
  const page = await launch({ width, height, port: nextPort() });
  page.ask = (expr) => page.evaluate(`return (${expr});`);
  page.has = (sel) => page.ask(`Boolean(document.querySelector(${JSON.stringify(sel)}))`);
  page.count = (sel) => page.ask(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  page.text = (sel) => page.ask(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').trim()`);
  page.box = (sel) => page.ask(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)});`
    + ' if (!el) return null; const r = el.getBoundingClientRect();'
    + ' return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; })()',
  );
  /** A REAL click on a DOM control: the pointer goes to its centre and presses. */
  page.press = async (sel, text = null) => {
    const box = await page.click(sel, text);
    await page.sleep(650);
    return box;
  };
  /** A REAL left click at one pixel: moved, pressed, released. */
  page.clickAt = async (x, y) => {
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await page.sleep(60);
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1,
    });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0,
    });
    await page.sleep(700);
  };
  /** A REAL drag: pressed at one pixel, moved in steps, released at another. */
  // `modifiers` (CDP's bits: 1 Alt, 2 Ctrl, 4 Meta, 8 Shift) are held for the
  // whole gesture, the drop included.
  page.dragFromTo = async (x0, y0, x1, y1, { steps: n = 14, button = 'left', modifiers = 0 } = {}) => {
    const buttons = button === 'right' ? 2 : 1;
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0, y: y0, modifiers });
    await page.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: x0, y: y0, button, clickCount: 1, buttons, modifiers,
    });
    for (let i = 1; i <= n; i += 1) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button, buttons, modifiers });
      await page.sleep(35);
    }
    await page.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: x1, y: y1, button, clickCount: 1, buttons: 0, modifiers,
    });
    await page.sleep(900);
  };
  /** Keys, through the browser's own input pipe. */
  page.typeText = async (text) => {
    await page.send('Input.insertText', { text: String(text) });
    await page.sleep(250);
  };
  page.pressKey = async (key) => {
    const codes = {
      Enter: 13, Escape: 27, Tab: 9, Backspace: 8,
    };
    const k = { key, code: key, windowsVirtualKeyCode: codes[key], nativeVirtualKeyCode: codes[key] };
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k });
    if (key === 'Enter') await page.send('Input.dispatchKeyEvent', { type: 'char', text: '\r', ...k });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
    await page.sleep(500);
  };
  page.showroom = async (url) => {
    const show = await showroomUp();
    await page.goto(url);
    await page.evaluate(`try { localStorage.setItem('cc.hardwareBase', ${JSON.stringify(show.url)}); } catch (e) {} return true;`);
    await page.evaluate('location.reload(); return true;');
    await page.sleep(1800);
  };
  return page;
}

export async function room(page, { base = BASE, hash = '#/design' } = {}) {
  await page.showroom(`${base}retail.html${hash}`);
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout: 45000 });
  await page.sleep(2600);
}

export async function pro(page, { base = BASE } = {}) {
  await page.showroom(`${base}index.html`);
  await page.waitFor('window.__cc && window.__cc.project', { timeout: 45000 });
  await page.sleep(1500);
  // PRO opens on its START SCREEN, and its NEW PROJECT flow ends in the
  // project-settings wizard (decors, boards, hardware), which is not what any
  // point of this turn is about. The editor is opened the way
  // `scripts/e2e-turn18.mjs` opens it: a new project and the editor's own
  // door. That is the stage being set; every gesture a check below is about
  // is still a real click.
  if (!(await page.ask('Boolean(window.__cc.views && window.__cc.views.room)'))) {
    await page.ask(`(() => { window.__cc.project.getState().newProject('T74 walk');
      const ui = window.__cc.ui.getState(); ui.openEditor(); ui.closeModal(); ui.closeLibrary && ui.closeLibrary();
      return true; })()`);
    await page.waitFor('window.__cc.views && window.__cc.views.room', { timeout: 45000 });
  }
  await page.sleep(2600);
}

/** A wardrobe in the empty room, through the WHERE step's own button. */
export async function withWardrobe(page) {
  await page.press('[data-testid="cat-where"]');
  await page.press('[data-testid="where-add-wardrobe"]');
  await page.sleep(1500);
}

/**
 * WHERE ON THE GLASS A PIECE IS, and it is the thing the pointer would touch.
 *
 * The piece's world box is projected to find the patch of screen it covers;
 * that patch is sampled, and a pixel counts only when the scene's own
 * raycaster, cast from that very pixel, meets THIS mesh before anything else
 * that is drawn. The pixel returned is the one nearest the middle of the ones
 * that count, and it is re-checked after rounding to a whole pixel, because a
 * mouse lands on whole pixels. `null` means the piece cannot be clicked from
 * where the camera stands, which is a finding and not a fallback.
 */
export const FIND = `(function (unitId, panelId, opts) {
  const v = window.__cc.views && window.__cc.views.room; if (!v) return null;
  const T = v.three; let target = null;
  v.scene.traverse((o) => {
    if (target || !o.isMesh || !o.userData || o.userData.ccPanelId !== panelId) return;
    let a = o; while (a && !(a.userData && a.userData.ccUnitId)) a = a.parent;
    if (!unitId || (a && a.userData.ccUnitId === unitId)) target = o;
  });
  if (!target) return null;
  const hidden = (o) => { for (let a = o; a; a = a.parent) { if (a.visible === false) return true; if (a.userData && a.userData.ccHelper) return true; } return false; };
  const r = v.gl.domElement.getBoundingClientRect();
  const box = new T.Box3().setFromObject(target);
  const xs = []; const ys = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const p = new T.Vector3(x, y, z).project(v.camera); xs.push(p.x); ys.push(p.y);
  }
  const x0 = Math.max(-1, Math.min(...xs)); const x1 = Math.min(1, Math.max(...xs));
  const y0 = Math.max(-1, Math.min(...ys)); const y1 = Math.min(1, Math.max(...ys));
  const ray = new T.Raycaster();
  const toPx = (nx, ny) => ({ x: r.left + (nx * 0.5 + 0.5) * r.width, y: r.top + (-ny * 0.5 + 0.5) * r.height });
  const toNdc = (px, py) => new T.Vector2(((px - r.left) / r.width) * 2 - 1, -(((py - r.top) / r.height) * 2 - 1));
  // A dimension's pick box is invisible but it TAKES the click (the size and
  // spacing figures), so a pixel behind one is not a pixel on the piece.
  const isPick = (o) => { for (let a = o; a; a = a.parent) { if (a.userData && a.userData.ccDimensionPick != null) return true; } return false; };
  const firstAt = (ndc) => {
    ray.setFromCamera(ndc, v.camera);
    const all = ray.intersectObjects(v.scene.children, true).filter((h) => h.object.isMesh);
    const hits = all.filter((h) => !hidden(h.object));
    if (!hits.length) return null;
    if (all.some((h) => isPick(h.object) && h.distance < hits[0].distance)) return null;
    return hits[0].object;
  };
  const N = (opts && opts.grid) || 36; const good = [];
  for (let i = 1; i < N; i += 1) for (let j = 1; j < N; j += 1) {
    const nx = x0 + ((x1 - x0) * i) / N; const ny = y0 + ((y1 - y0) * j) / N;
    const px = toPx(nx, ny); const rx = Math.round(px.x); const ry = Math.round(px.y);
    if (rx < r.left + 4 || rx > r.right - 4 || ry < r.top + 4 || ry > r.bottom - 4) continue;
    if (firstAt(toNdc(rx, ry)) === target) good.push({ x: rx, y: ry });
  }
  if (!good.length) return null;
  // Every pixel the piece is the nearest thing at (a colour read wants all of
  // it, lit and shaded, not one point).
  if (opts && opts.all) return { points: good, n: good.length };
  const want = (opts && opts.prefer) || 'middle';
  const cx = good.reduce((s, p) => s + p.x, 0) / good.length;
  const cy = good.reduce((s, p) => s + p.y, 0) / good.length;
  const score = (p) => (want === 'top' ? p.y : (want === 'bottom' ? -p.y : Math.hypot(p.x - cx, p.y - cy)));
  good.sort((a, b) => score(a) - score(b));
  return { x: good[0].x, y: good[0].y, n: good.length };
})`;
export const pointOn = (page, unitId, panelId, opts = {}) => page.ask(
  `${FIND}(${JSON.stringify(unitId)}, ${JSON.stringify(panelId)}, ${JSON.stringify(opts)})`,
);

/** The ids of the units, in the order the store holds them. */
export const unitIds = (page) => page.ask('window.__cc.project.getState().units.map((u) => u.id)');
export const unitsNow = (page) => page.ask(
  'window.__cc.project.getState().units.map((u) => ({ id: u.id, type: u.type, x: u.position?.x_mm, wall: u.position?.wall,'
  + ' w: u.params?.width, h: u.params?.height, d: u.params?.depth,'
  + ' ep: (u.params?.end_panels || []).map((e) => e.side).sort().join("") }))',
);
export const modalNow = (page) => page.ask('window.__cc.ui.getState().modal || null');

/** The camera on the ROOM preset, through the view bar's own button. */
export async function roomView(page) {
  if (await page.has('[data-testid="view-room"]')) {
    await page.press('[data-testid="view-room"]');
    await page.sleep(1400);
    await settleCamera(page);
  }
}

/**
 * Wait (up to 8 s) until the room camera stops moving. OrbitControls damps a
 * drag and the presets glide, so the camera keeps travelling for a while after
 * the gesture; at the headless frame rate (about 400 ms a frame) a pixel read
 * off a camera still in motion is not where the piece is by the time the
 * mouse arrives. The full walk found exactly that: a 2klik a few pixels off.
 */
export async function settleCamera(page) {
  const pose = () => page.ask(`(() => { const c = window.__cc.views && window.__cc.views.room && window.__cc.views.room.camera;
    if (!c) return null; const p = c.position; const q = c.quaternion;
    return [p.x, p.y, p.z, q.x, q.y, q.z, q.w].map((v) => Math.round(v * 1e4) / 1e4).join(','); })()`);
  let last = await pose();
  for (let t = 0; t < 20; t += 1) {
    await page.sleep(400);
    const now = await pose();
    if (now === last) return true;
    last = now;
  }
  return false;
}

/**
 * Turn the camera with a REAL drag on the empty floor or wall (OrbitControls'
 * own gesture), `dx` pixels across. A pixel is chosen where the raycaster meets
 * no cabinet, so the drag orbits and does not move furniture.
 */
export async function orbit(page, dx, dy = 0) {
  const at = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three;
    const r = v.gl.domElement.getBoundingClientRect(); const ray = new T.Raycaster();
    for (const fy of [0.12, 0.2, 0.3, 0.85, 0.92]) for (const fx of [0.1, 0.2, 0.8, 0.9, 0.5]) {
      const px = r.left + fx * r.width; const py = r.top + fy * r.height;
      ray.setFromCamera(new T.Vector2(fx * 2 - 1, -(fy * 2 - 1)), v.camera);
      const hit = ray.intersectObjects(v.scene.children, true).find((h) => h.object.isMesh && h.object.visible);
      let unit = false; for (let a = hit && hit.object; a; a = a.parent) { if (a.userData && a.userData.ccUnitId) unit = true; }
      if (!unit) return { x: Math.round(px), y: Math.round(py) };
    }
    return null; })()`);
  if (!at) return false;
  await page.dragFromTo(at.x, at.y, at.x + dx, at.y + dy, { steps: 20 });
  await page.sleep(900);
  await settleCamera(page);
  return true;
}

/**
 * A piece's clickable pixel from SOME camera a client would use: as the view
 * stands, then turned right, then left, then from above, then from behind.
 * Every turn is a real drag on empty floor or wall; the first camera that
 * shows the piece under the pointer wins.
 */
export async function reach(page, unitId, panelId, opts = {}) {
  const tries = [[0, 0], [120, 0], [-240, 0], [120, 140], [260, 0]];
  // A camera still gliding (a preset, an add that re-frames) is settled first.
  await settleCamera(page);
  for (const [dx, dy] of tries) {
    if (dx || dy) await orbit(page, dx, dy);
    const at = await pointOn(page, unitId, panelId, opts);
    if (at) return at;
  }
  return null;
}


/**
 * A panel's box in its UNIT's own frame, in millimetres, off the live scene:
 * the mesh's world box corners taken back through the unit group's inverse.
 * x along the unit, y up from its origin, z out from the wall toward the room.
 * (The probe script's `LOCAL_BOX`, shared here for the walk.)
 */
export const localBox = (page, unitId, panelId) => page.ask(`(function (unitId, panelId) {
  const v = window.__cc.views.room; const T = v.three; let mesh = null; let unit = null;
  v.scene.traverse((o) => { if (o.userData && o.userData.ccUnitId === unitId) unit = o; });
  if (!unit) return null;
  unit.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === panelId) mesh = o; });
  if (!mesh) return null;
  unit.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(unit.matrixWorld).invert();
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const b = mesh.geometry.boundingBox; const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
    const p = new T.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
    const q = [p.x * 1000, p.y * 1000, p.z * 1000];
    for (let i = 0; i < 3; i += 1) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); }
  }
  const r = (n) => Math.round(n * 10) / 10;
  return { x: [r(lo[0]), r(hi[0])], y: [r(lo[1]), r(hi[1])], z: [r(lo[2]), r(hi[2])] };
})(${JSON.stringify(unitId)}, ${JSON.stringify(panelId)})`);
