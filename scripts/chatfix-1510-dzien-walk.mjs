/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT-FIX 15.10.2026 (the day) · THE WALK IN A REAL CHROMIUM ───────────
//
// The app built and served (E2E_URL, default http://127.0.0.1:4173/):
//     node scripts/chatfix-1510-dzien-walk.mjs
// Frames go to verify/chatfix-1510-dzien/; the rows are printed and written
// beside them. Reads the stores through window.__cc; adds through the API
// where the gesture itself is not the point.
//
// What it walks (the owner's list of 15.10.2026):
//   A  the pluses wait for the hand: none with nothing under the pointer, the
//      run's two when a cabinet is hovered, gone again a moment after;
//   B  an empty island face: no plus until the hand is over the place its
//      cabinet would stand;
//   C  the island plan: the drawn rectangle is the island; the cabinets stand
//      inside it; the core the store holds is the rectangle less the bands;
//   D  the L corner: a bi-fold pair by default, ONE handle, on leaf B's face
//      (not in the air past its end);
//   E  the 155: a door on an 18 mm front swings to 155 degrees on a 2klik.

import { mkdirSync, writeFileSync } from 'node:fs';
import { open, pro, settleCamera, pointOn, showroomDown } from './t74-harness.mjs';

const SHOTS = 'verify/chatfix-1510-dzien/';
mkdirSync(SHOTS, { recursive: true });
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const j = (v) => JSON.stringify(v);
const rows = [];
let n = 0;
let failed = 0;
const row = (what, expected, observed, ok) => {
  n += 1;
  if (!ok) failed += 1;
  const line = `| ${n} | ${what} | ${expected} | ${observed} | ${ok ? 'OK' : 'FAIL'} |`;
  rows.push(line);
  process.stdout.write(`${line}\n`);
};

/** The plus sprites drawn right now (visible, with their titles), and the zones. */
const pluses = (page) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const out = [];
  v.scene.traverse((o) => { if (o.userData && o.userData.ccAddPlus) { let vis = true; for (let a = o; a; a = a.parent) if (a.visible === false) vis = false;
    if (vis) out.push((o.children[0] && o.children[0].name) || 'plus'); } });
  return out; })()`);
const zones = (page) => page.ask(`(() => { const v = window.__cc.views.room; let k = 0; v.scene.traverse((o) => { if (o.userData && o.userData.ccPlusZone) k += 1; }); return k; })()`);
/** The screen pixel of a scene object's world point. */
const pixelOf = (page, expr) => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const p = (${expr}); if (!p) return null;
  const r = v.gl.domElement.getBoundingClientRect(); const q = new T.Vector3(p[0], p[1], p[2]).project(v.camera);
  return { x: Math.round(r.left + (q.x * 0.5 + 0.5) * r.width), y: Math.round(r.top + (-q.y * 0.5 + 0.5) * r.height) }; })()`);
const moveTo = async (page, x, y) => { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await page.sleep(500); };
const emptyPixel = async (page) => {
  // A pixel on the ceiling-side of the canvas where nothing but the room is.
  const r = await page.box('canvas');
  return { x: r.x + Math.round(r.w * 0.5), y: r.y + 12 };
};

const page = await open({ width: 1440, height: 900 });
try {
  await pro(page);
  await page.ask(`(() => { ${S}.newProject('dzien 1510'); ${S}.setRoom({ corners: [{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:0,y:3000}], height: 2500 }); return true; })()`);
  await page.sleep(800);

  // ─── A · the pluses wait for the hand ───────────────────────────────────
  const a = await page.ask(`(() => { const P = ${S}; const a = P.addUnit('BUD', { wall: 0, x: 600 }); const b = P.addUnit('BUD', { near: a.id, side: 'right' }); return { a: a.id, b: b.id, err: a.error || b.error }; })()`);
  await page.sleep(1500);
  await settleCamera(page);
  await moveTo(page, ...Object.values(await emptyPixel(page)));
  await page.sleep(1200);
  const none = await pluses(page);
  row('A1 two base units, the hand on nothing', 'no plus drawn', `${none.length} plus(es): ${none.join('; ') || 'none'}`, none.length === 0);
  const sideId = await page.ask(`${S}.unitResult(${j(a.a)}).panels.find((p) => p.part === 'BUL' || p.part === 'FRONT').id`);
  const at = await pointOn(page, a.a, sideId, { prefer: 'middle' });
  let overA = [];
  if (at) {
    await moveTo(page, at.x, at.y);
    await page.sleep(900);
    overA = await pluses(page);
    await page.screenshot(`${SHOTS}a-hover-pluses.png`);
  }
  row('A2 the hand over the first cabinet', 'the run\'s two end pluses', at ? `${overA.length}: ${overA.join('; ')}` : 'no pixel on the cabinet', overA.length === 2 && overA.every((t) => /^Add a unit to the (left|right) of/.test(t)));
  await moveTo(page, ...Object.values(await emptyPixel(page)));
  await page.sleep(1500);
  const after = await pluses(page);
  row('A3 the hand away again, 1.5 s later', 'no plus', `${after.length}`, after.length === 0);

  // ─── B · the island's empty faces ───────────────────────────────────────
  const isl = await page.ask(`(() => { const P = ${S}; const r = P.addIsland ? P.addIsland() : null; return r ? (r.id || r.error || JSON.stringify(r)) : 'no addIsland'; })()`);
  await page.sleep(1500);
  await settleCamera(page);
  await moveTo(page, ...Object.values(await emptyPixel(page)));
  await page.sleep(1200);
  const zoneCount = await zones(page);
  const islandNone = await pluses(page);
  row('B1 an island with nothing on it', '4 hover volumes, no plus', `island ${isl}: ${zoneCount} zone(s), ${islandNone.length} plus(es)`, zoneCount === 4 && islandNone.length === 0);
  // Over the place a cabinet would stand on face A: the zone's own centre.
  const zonePx = await pixelOf(page, `(() => { const v = window.__cc.views.room; let z = null; v.scene.traverse((o) => { if (!z && o.userData && o.userData.ccPlusZone) z = o; });
    if (!z) return null; z.updateMatrixWorld(true); const p = new v.three.Vector3().setFromMatrixPosition(z.matrixWorld); return [p.x, p.y, p.z]; })()`);
  let overIsland = [];
  if (zonePx) { await moveTo(page, zonePx.x, zonePx.y); await page.sleep(900); overIsland = await pluses(page); await page.screenshot(`${SHOTS}b-island-face-plus.png`); }
  row('B2 the hand over an empty island face', 'that face\'s plus, one', zonePx ? `${overIsland.length}: ${overIsland.join('; ')}` : 'no zone pixel', overIsland.length === 1 && /face [ABE]/.test(overIsland[0]));

  // ─── C · the island plan: the rectangle is the island ───────────────────
  await page.ask(`(() => { const P = ${S}; const isl = P.project.room.islands[0]; if (isl) P.removeIsland ? P.removeIsland(isl.id) : null; return true; })()`);
  await page.ask(`${S}.beginIslandPlan(null).ok`);
  await page.sleep(900);
  const planOpen = await page.has('[data-island-plan="1"]');
  await page.ask(`(() => { const u = ${UI}; const plan = u.islandPlan; const cab = (face, w) => ({ key: 'plan_' + face + w, unitId: null, face, w, depth: null, type: 'BUD', label: null });
    u.setIslandPlan({ cx: 2000, cy: 1700, w: 1800, d: 1100, cabs: [cab('A', 600), cab('A', 600), cab('E2', 450)] }); return true; })()`);
  await page.sleep(900);
  const coreSize = await page.text('[data-plan-core-size="1"]');
  const tooSmall = await page.has('[data-plan-too-small="1"]');
  await page.screenshot(`${SHOTS}c-island-plan.png`);
  row('C1 a plan 1800 x 1100 with two on A and one on E2', 'the core note shows 1232 x 532, no refusal', `${coreSize} / refusal ${tooSmall}`, /1232/.test(coreSize) && /532/.test(coreSize) && !tooSmall);
  await page.press('[data-plan-insert="1"]');
  await page.sleep(1500);
  const built = await page.ask(`(() => { const P = ${S}; const isl = P.project.room.islands[0]; if (!isl) return null;
    const on = P.units.filter((u) => u.position && u.position.island === isl.id && u.type !== 'FREE_PANEL').map((u) => [u.position.face, u.position.x_mm, u.params.width]).sort();
    return { cx: isl.cx, cy: isl.cy, w: isl.w, d: isl.d, on }; })()`);
  row('C2 INSERT', 'the core 1232 x 532 at (1716, 1984), three cabinets on A and E2', j(built), Boolean(built) && built.w === 1232 && built.d === 532 && built.cx === 1716 && built.cy === 1984 && built.on.length === 3);
  await page.sleep(800);
  await page.screenshot(`${SHOTS}c-island-inserted.png`);

  // ─── D · the L corner: a bi-fold pair, one handle on leaf B's face ──────
  await page.ask(`(() => { ${S}.newProject('dzien 1510 L'); ${S}.setRoom({ corners: [{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:0,y:3000}], height: 2500 }); return true; })()`);
  await page.sleep(600);
  const l = await page.ask(`(() => { const P = ${S}; const r = P.addUnit('CORNER_L_BASE'); if (r.error) return { err: r.error };
    P.addDoors(r.id); P.setProjectHandle && P.setProjectHandle({ type: 'bar', centres: 128 }); return { id: r.id }; })()`);
  await page.sleep(1800);
  const lRead = await page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(l.id)}); if (!u) return null; const r = P.unitResult(u.id);
    const fronts = r.panels.filter((p) => p.part === 'FRONT').map((p) => ({ id: p.id, handle: Boolean(p.meta.handle), box: p.box, swingZ: p.meta.swingZ || null }));
    return { mode: r.derived.corner_l && r.derived.corner_l.doors_mode, corner_doors: u.params.corner_doors, fronts, handleKey: Object.keys(P.project.design && P.project.design.handle || {}).length }; })()`);
  row('D1 a new L', 'bi-fold by default, leaf A no handle, leaf B a handle', j({ mode: lRead?.mode, corner_doors: lRead?.corner_doors, handles: lRead?.fronts.map((f) => [f.id, f.handle]) }),
    lRead?.mode === 'bifold' && lRead.fronts.length === 2 && !lRead.fronts[0].handle && lRead.fronts[1].handle);
  // Where the scene put the handle: inside the L's own frame, against leaf B's room face (x = box.x + box.w, z within the leaf).
  const handleAt = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; let unit = null; let h = null;
    v.scene.traverse((o) => { if (o.userData && o.userData.ccUnitId === ${j(l.id)}) unit = o; });
    if (!unit) return null; unit.traverse((o) => { if (!h && o.userData && o.userData.ccHandle) h = o; });
    if (!h) return { handles: 0 };
    unit.updateMatrixWorld(true); const inv = new T.Matrix4().copy(unit.matrixWorld).invert();
    const b = new T.Box3().setFromObject(h); const lo = new T.Vector3(b.min.x, b.min.y, b.min.z).applyMatrix4(inv); const hi = new T.Vector3(b.max.x, b.max.y, b.max.z).applyMatrix4(inv);
    let count = 0; unit.traverse((o) => { if (o.userData && o.userData.ccHandle) count += 1; });
    const r = (q) => Math.round(q * 1000); return { handles: count, id: h.userData.ccHandle, x: [r(Math.min(lo.x, hi.x)), r(Math.max(lo.x, hi.x))], y: [r(Math.min(lo.y, hi.y)), r(Math.max(lo.y, hi.y))], z: [r(Math.min(lo.z, hi.z)), r(Math.max(lo.z, hi.z))] }; })()`);
  const b = lRead?.fronts[1]?.box;
  const onFace = handleAt && b && handleAt.handles === 1
    && handleAt.x[0] >= b.x + b.w - 1 && handleAt.x[1] <= b.x + b.w + 90      // proud of the leaf's +x face (the bar, its posts and its hover catchment)
    && handleAt.z[0] >= b.z - 1 && handleAt.z[1] <= b.z + b.d + 1;            // within the leaf's length along z
  row('D2 the handle in the scene', `one handle, on leaf B's room face (x ${b ? b.x + b.w : '?'} .. +90, z ${b ? `${b.z} .. ${b.z + b.d}` : '?'})`, j(handleAt), Boolean(onFace));
  await settleCamera(page);
  await page.screenshot(`${SHOTS}d-l-corner-handle.png`);

  // ─── E · the 155 on a 2klik ─────────────────────────────────────────────
  await page.ask(`(() => { ${S}.newProject('dzien 1510 155'); ${S}.setRoom({ corners: [{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:0,y:3000}], height: 2500 }); return true; })()`);
  await page.sleep(600);
  // The front thickness is the PROJECT's (the caliper slot front1, T24 F3.2): an 18 mm front, as the owner's EGGER and sprayed fronts are.
  const e = await page.ask(`(() => { const P = ${S}; P.setSlotThickness('front1', { measured: 18, confirmed: true }); const a = P.addUnit('BUD', { wall: 0, x: 1200 }); P.addDoors(a.id); P.updateUnitParams(a.id, { hinge: 'R' }); const b = P.addUnit('BUD', { near: a.id, side: 'right' }); P.addDoors(b.id); return { a: a.id, b: b.id }; })()`);
  await page.sleep(1500);
  await settleCamera(page);
  const leaf = await page.ask(`(() => { const r = ${S}.unitResult(${j(e.a)}); const p = r.panels.find((x) => x.part === 'FRONT'); return p ? { id: p.id, deg: p.meta.openAngleDeg, hinge: p.meta.hinge } : null; })()`);
  const px = leaf ? await pointOn(page, e.a, leaf.id, { prefer: 'middle' }) : null;
  let turned = null;
  if (px) {
    await page.dblclick(px.x, px.y);
    await page.sleep(2500);
    turned = await page.ask(`(() => { const v = window.__cc.views.room; let g = null; v.scene.traverse((o) => { if (!g && o.isMesh && o.userData && o.userData.ccPanelId === ${j(leaf.id)}) g = o; });
      if (!g) return null; let a = g; let best = 0; while (a) { if (Math.abs(a.rotation.y) > Math.abs(best)) best = a.rotation.y; a = a.parent; } return Math.round(Math.abs(best) * 180 / Math.PI); })()`);
    await page.screenshot(`${SHOTS}e-door-155.png`);
  }
  row('E1 an 18 mm door 2klicked open, a neighbour on its hinge side', 'the leaf carries 155 and swings to 155', `carries ${leaf?.deg}, swung ${turned}`, leaf?.deg === 155 && turned != null && Math.abs(turned - 155) <= 2);
} finally {
  writeFileSync(`${SHOTS}walk.rows.md`, `${['| # | gesture | expected | observed | verdict |', '|---|---|---|---|---|', ...rows].join('\n')}\n`);
  await page.close();
  await showroomDown();
}
process.stdout.write(`\n${failed ? `${failed} row(s) FAILED` : 'every row OK'}\n`);
process.exit(failed ? 1 : 0);
