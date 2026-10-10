// T75 · THE HANDS THE T74 HARNESS LACKS, AND NOTHING ELSE
//
// CLAUDE.md T75, LAWS: *"Test the way the client clicks.
// `scripts/t75-walk.mjs` (T74's pattern) uses a REAL mouse and the REAL
// buttons; the store is only read."*  The page, the camera, the reach and the
// pixel finder are T74's (`scripts/t74-harness.mjs`, imported, never copied).
// What this file adds are the gestures this turn's walk needs and T74's never
// made: a click with Ctrl held (a selection of several cabinets), a right
// click on a piece, a choice in a native <select> by the keyboard a client
// uses on it, a drag of a cabinet along its own wall by a stated distance, a
// click on a helper the scene draws (a lit notch corner, an island face's
// plus), the library opened through its menu and its flyout, and a drag in an
// SVG plan. Every one of them goes through the browser's own input pipe (CDP
// `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent`); none writes a store.

import { pointOn, settleCamera } from './t74-harness.mjs';

const KEYS = {
  Enter: 13, Escape: 27, Tab: 9, Backspace: 8, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39,
};

/** A key through the browser's input pipe, the arrows included (T74's lacks them). */
export async function key(page, name) {
  const code = KEYS[name];
  const k = {
    key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
  };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k });
  if (name === 'Enter') await page.send('Input.dispatchKeyEvent', { type: 'char', text: '\r', ...k });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(350);
}

/** A REAL left click at one pixel with modifiers held (CDP bits: 2 Ctrl, 8 Shift). */
export async function clickWith(page, x, y, modifiers = 0) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers });
  await page.sleep(60);
  await page.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1, modifiers,
  });
  await page.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0, modifiers,
  });
  await page.sleep(700);
}

/** The box of the first visible element a page-side expression returns. */
export const boxOf = (page, expr) => page.ask(`(() => { const el = (${expr});
  if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; })()`);

/**
 * The library through its MENU: Library, then the category (Kitchen,
 * Wardrobes), then the group's flyout (Base units, Wall units), then the row.
 * Every step is a real click on a real control. The panel stays open, as it
 * does for a client building a run ("add, add, add").
 */
export async function library(page, { category = 'Kitchen', group = null, entry }) {
  const listed = async () => page.has(`[data-library-entry="${entry}"]`);
  if (!(await listed())) {
    if (group && await page.has(`[data-library-group="${group}"]`) && !(await page.has(`[data-library-flyout="${group}"]`))) {
      await page.press(`[data-library-group="${group}"]`);
    }
  }
  if (!(await listed())) {
    await page.press('button', 'Library');
    await page.press('button', category);
    await page.sleep(500);
    if (group && !(await page.has(`[data-library-flyout="${group}"]`))) await page.press(`[data-library-group="${group}"]`);
    if (!(await listed()) && await page.has('[data-library-show-all="1"]')) {
      await page.press('[data-library-show-all="1"]');
      if (group && !(await page.has(`[data-library-flyout="${group}"]`))) await page.press(`[data-library-group="${group}"]`);
    }
  }
  if (!(await listed())) return false;
  await page.press(`[data-library-entry="${entry}"]`);
  await page.sleep(1200);
  return true;
}

/**
 * A choice in a native <select>, the way a client makes it with the keyboard:
 * a real click on the control (it takes the focus and opens its list), the
 * arrows to the option, Enter. `find` is a page-side expression for the
 * element; `value` is the option's value.
 * Returns what the control said before and after.
 */
export async function choose(page, find, value) {
  const at = await boxOf(page, find);
  if (!at) return { ok: false, why: 'no such control on the screen' };
  const state = () => page.ask(`(() => { const s = (${find}); if (!s) return null;
    return { index: s.selectedIndex, value: s.value, options: [...s.options].map((o) => o.value),
      labels: [...s.options].map((o) => o.textContent.trim()), focused: document.activeElement === s }; })()`);
  const before = await state();
  const target = before.options.indexOf(String(value));
  if (target < 0) return { ok: false, why: `no option ${value}`, before };
  await clickWith(page, at.x, at.y);
  const steps = target - before.index;
  for (let i = 0; i < Math.abs(steps); i += 1) await key(page, steps > 0 ? 'ArrowDown' : 'ArrowUp');
  await key(page, 'Enter');
  await page.sleep(600);
  const after = await state();
  return { ok: true, before, after, label: before.labels[target] };
}

/**
 * Where a cabinet's own frame stands on the glass: the unit group's world
 * matrix (x along its wall, z out of the wall), so a drag can be aimed in
 * millimetres along the wall, on the very plane the app drags on
 * (`UnitView.jsx dragPlane`: parallel to the wall, half the depth out).
 */
const AIM = `(function (unitId, fromX, fromY, deltaMm, depthMm) {
  const v = window.__cc.views.room; const T = v.three; let g = null;
  v.scene.traverse((o) => { if (!g && o.userData && o.userData.ccUnitId === unitId) g = o; });
  if (!g) return null; g.updateMatrixWorld(true);
  const along = new T.Vector3(1, 0, 0).transformDirection(g.matrixWorld).normalize();
  const inward = new T.Vector3(0, 0, 1).transformDirection(g.matrixWorld).normalize();
  const origin = new T.Vector3().setFromMatrixPosition(g.matrixWorld);
  const plane = new T.Plane().setFromNormalAndCoplanarPoint(inward, origin.clone().addScaledVector(inward, depthMm / 2000));
  const r = v.gl.domElement.getBoundingClientRect();
  const ndc = new T.Vector2(((fromX - r.left) / r.width) * 2 - 1, -(((fromY - r.top) / r.height) * 2 - 1));
  const ray = new T.Raycaster(); ray.setFromCamera(ndc, v.camera);
  const hit = new T.Vector3(); if (!ray.ray.intersectPlane(plane, hit)) return null;
  const to = hit.clone().addScaledVector(along, deltaMm / 1000).project(v.camera);
  return { x: Math.round(r.left + (to.x * 0.5 + 0.5) * r.width), y: Math.round(r.top + (-to.y * 0.5 + 0.5) * r.height) };
})`;

/**
 * T74's `reach`, with one more law: the pixel must also be the CANVAS's in the
 * page, not a panel's lying over it (PRO's right panel and the library float
 * over the scene, and a ray through the scene does not know they are there).
 * Every pixel where the piece is the nearest thing is asked of
 * `document.elementFromPoint`; the one nearest their middle that the canvas
 * owns wins. Then the camera is turned by a real drag on empty floor or wall
 * (a pixel the canvas owns, with no cabinet under it), as T74's hands do.
 */
const FREE = `(function (points) {
  const v = window.__cc.views.room; const c = v.gl.domElement;
  const own = points.filter((p) => { const el = document.elementFromPoint(p.x, p.y); return el === c || (el && c.contains(el)); });
  if (!own.length) return null;
  const cx = own.reduce((s, p) => s + p.x, 0) / own.length; const cy = own.reduce((s, p) => s + p.y, 0) / own.length;
  own.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  return { x: own[0].x, y: own[0].y, n: own.length };
})`;
const EMPTY = `(() => { const v = window.__cc.views.room; const T = v.three; const c = v.gl.domElement;
  const r = c.getBoundingClientRect(); const ray = new T.Raycaster();
  for (const fy of [0.85, 0.92, 0.75, 0.3, 0.2]) for (const fx of [0.5, 0.35, 0.65, 0.2, 0.8]) {
    const px = Math.round(r.left + fx * r.width); const py = Math.round(r.top + fy * r.height);
    const el = document.elementFromPoint(px, py); if (!(el === c || (el && c.contains(el)))) continue;
    ray.setFromCamera(new T.Vector2(fx * 2 - 1, -(fy * 2 - 1)), v.camera);
    const hit = ray.intersectObjects(v.scene.children, true).find((h) => h.object.isMesh && h.object.visible);
    let unit = false; for (let a = hit && hit.object; a; a = a.parent) { if (a.userData && a.userData.ccUnitId) unit = true; }
    if (!unit) return { x: px, y: py };
  }
  return null; })()`;
export async function orbitFree(page, dx, dy = 0) {
  const at = await page.ask(EMPTY);
  if (!at) return false;
  await page.dragFromTo(at.x, at.y, at.x + dx, at.y + dy, { steps: 20 });
  await page.sleep(900);
  await settleCamera(page);
  return true;
}
export async function reachFree(page, unitId, panelId) {
  await settleCamera(page);
  for (const [dx, dy] of [[0, 0], [120, 0], [-240, 0], [120, 120], [260, 0]]) {
    if (dx || dy) await orbitFree(page, dx, dy);
    const all = await pointOn(page, unitId, panelId, { all: true, grid: 40 });
    if (all && all.points && all.points.length) {
      const at = await page.ask(`${FREE}(${JSON.stringify(all.points)})`);
      if (at) return at;
    }
  }
  return null;
}

/**
 * A REAL drag of a cabinet along its wall by `deltaMm` (positive: toward the
 * wall's end). The hand grabs the piece `panelId` where the scene's raycaster
 * says it is the nearest thing (T74's `reach`), and lets go at the pixel the
 * wanted distance projects to. Returns the pixels, or null when the piece is
 * out of reach of every camera tried (a finding, not a fallback).
 */
export async function dragAlong(page, unitId, panelId, deltaMm, { steps = 24 } = {}) {
  const at = await reachFree(page, unitId, panelId);
  if (!at) return null;
  const depth = await page.ask(`(window.__cc.project.getState().units.find((u) => u.id === ${JSON.stringify(unitId)}) || { params: {} }).params.depth || 560`);
  const to = await page.ask(`${AIM}(${JSON.stringify(unitId)}, ${at.x}, ${at.y}, ${Number(deltaMm)}, ${Number(depth)})`);
  if (!to) return null;
  await page.dragFromTo(at.x, at.y, to.x, to.y, { steps });
  await page.sleep(600);
  return { from: at, to };
}

/**
 * A pixel where the scene's raycaster meets a HELPER first (a lit notch
 * corner, an island face's plus), found by its userData: `match` is a
 * page-side predicate on `o.userData`. The scene's own raycast includes
 * helpers here (T74's FIND leaves them out because a helper is not a piece).
 */
export const helperAt = (page, match) => page.ask(`(() => {
  const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  const want = (u) => { try { return (${match})(u); } catch (e) { return false; } };
  const targets = []; v.scene.traverse((o) => { if (o.userData && want(o.userData) && o.visible !== false) targets.push(o); });
  if (!targets.length) return null;
  const r = v.gl.domElement.getBoundingClientRect(); const ray = new T.Raycaster();
  const out = [];
  for (const t of targets) {
    t.updateMatrixWorld(true);
    const c = new T.Vector3().setFromMatrixPosition(t.matrixWorld).project(v.camera);
    if (c.z > 1 || c.x < -1 || c.x > 1 || c.y < -1 || c.y > 1) continue;
    const px = { x: Math.round(r.left + (c.x * 0.5 + 0.5) * r.width), y: Math.round(r.top + (-c.y * 0.5 + 0.5) * r.height) };
    ray.setFromCamera(new T.Vector2(((px.x - r.left) / r.width) * 2 - 1, -(((px.y - r.top) / r.height) * 2 - 1)), v.camera);
    const hits = ray.intersectObjects(v.scene.children, true).filter((h) => h.object.visible !== false && (h.object.isMesh || h.object.isSprite));
    // A depthTest-off helper drawn on top takes the pointer over a board in
    // front of it in r3f's order only when it is hit at all; it must be hit.
    const mine = hits.find((h) => h.object === t);
    if (!mine) continue;
    out.push({ x: px.x, y: px.y, first: hits[0].object === t, data: JSON.stringify(t.userData) });
  }
  return out;
})()`);

/** Wait (up to `ms`) until a page-side expression is truthy; returns the last value. */
export async function until(page, expr, ms = 8000) {
  let v = null;
  for (let t = 0; t < ms / 300; t += 1) {
    v = await page.ask(expr);
    if (v) return v;
    await page.sleep(300);
  }
  return v;
}

export { settleCamera };

/**
 * A dimension figure's pixel: the pick box of row `key` in the chain named
 * `chain` (`userData.ccDimensionChain` / `ccDimensionPick`, the T73 F3
 * figures), projected through the live camera; null when it is not drawn or
 * stands behind the camera.
 */
export const figurePx = (page, chain, key) => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three;
  let group = null; v.scene.traverse((o) => { if (!group && o.userData && o.userData.ccDimensionChain === ${JSON.stringify(chain)}) group = o; });
  if (!group) return null; let m = null;
  group.traverse((o) => { if (!m && o.userData && o.userData.ccDimensionPick === ${JSON.stringify(key)}) m = o; });
  if (!m) return null; m.updateMatrixWorld(true);
  const c = new T.Box3().setFromObject(m).getCenter(new T.Vector3()).project(v.camera);
  if (c.z > 1) return null; const r = v.gl.domElement.getBoundingClientRect();
  return { x: Math.round(r.left + (c.x + 1) / 2 * r.width), y: Math.round(r.top + (1 - c.y) / 2 * r.height) }; })()`);

/**
 * The same figure, but a pixel a hand can CLICK: the pick box sampled across
 * its projected patch, a pixel kept only when the scene's raycaster meets the
 * pick before any drawn thing (a plus, a label, a board) and the page says the
 * canvas owns it. The camera is let settle first (a 2klik flies it).
 */
export async function figureFree(page, chain, key, { turns = [[0, 0]] } = {}) {
  let last = null;
  for (const [dx, dy] of turns) {
    if (dx || dy) await orbitFree(page, dx, dy);
    await settleCamera(page);
    last = await figureOnce(page, chain, key);
    if (last && last.x != null) return { ...last, turn: [dx, dy] };
  }
  return last;
}
const figureOnce = (page, chain, key) => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const c = v.gl.domElement;
    let group = null; v.scene.traverse((o) => { if (!group && o.userData && o.userData.ccDimensionChain === ${JSON.stringify(chain)}) group = o; });
    if (!group) return { why: 'no chain ' + ${JSON.stringify(chain)} }; let m = null;
    group.traverse((o) => { if (!m && o.userData && o.userData.ccDimensionPick === ${JSON.stringify(key)}) m = o; });
    if (!m) return { why: 'no pick ' + ${JSON.stringify(key)} }; m.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(m); const r = c.getBoundingClientRect();
    const firsts = {};
    const xs = []; const ys = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new T.Vector3(x, y, z).project(v.camera); xs.push(p.x); ys.push(p.y); }
    const hidden = (o) => { for (let a = o; a; a = a.parent) if (a.visible === false) return true; return false; };
    const isM = (o) => { for (let a = o; a; a = a.parent) if (a === m) return true; return false; };
    const ray = new T.Raycaster(); const good = [];
    const N = 16;
    for (let i = 1; i < N; i += 1) for (let j = 1; j < N; j += 1) {
      const nx = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * i / N; const ny = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * j / N;
      const px = Math.round(r.left + (nx * 0.5 + 0.5) * r.width); const py = Math.round(r.top + (-ny * 0.5 + 0.5) * r.height);
      const el = document.elementFromPoint(px, py);
      if (!(el === c || (el && c.contains(el)))) { const k = 'DOM ' + (el ? el.tagName + '.' + String(el.className || '').slice(0, 40) + ' ' + (el.textContent || '').trim().slice(0, 20) : 'none'); firsts[k] = (firsts[k] || 0) + 1; continue; }
      ray.setFromCamera(new T.Vector2(((px - r.left) / r.width) * 2 - 1, -(((py - r.top) / r.height) * 2 - 1)), v.camera);
      const hits = ray.intersectObjects(v.scene.children, true).filter((h) => isM(h.object) || ((h.object.isMesh || h.object.isSprite) && !hidden(h.object)));
      if (hits.length && isM(hits[0].object)) good.push({ x: px, y: py });
      else { const k = hits.length ? (hits[0].object.type + ':' + JSON.stringify(hits[0].object.userData).slice(0, 60)) : 'nothing'; firsts[k] = (firsts[k] || 0) + 1; }
    }
    if (!good.length) return { why: 'the pick is never the first thing under the pointer', firsts, box: [xs.map((q) => Math.round(q * 100) / 100), ys.map((q) => Math.round(q * 100) / 100)].join(' / ') };
    const cx = good.reduce((s, p) => s + p.x, 0) / good.length; const cy = good.reduce((s, p) => s + p.y, 0) / good.length;
    good.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    return { x: good[0].x, y: good[0].y, n: good.length }; })()`);
