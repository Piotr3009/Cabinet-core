/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 21.10.2026 · THE MOCKUP: A BRITISH IN-FRAME CABINET ───────────
//
// The owner, 21.10.2026: *"a co z british style kitchen z ramkami?"*; asked
// how: *"4 - cnc blum in frame"*, *"6 - mockup pls"*. Nothing in the engine
// is touched: this draws, at run time, over a real BUD in the real scene, the
// cabinet an in-frame kit WOULD cut, so the owner can veto the numbers before
// a line of the kit exists (petros/zasady: mockup and UI confirmed before
// code). The numbers drawn (PROPOSED, every one to confirm):
//   the FACE FRAME   one routed 22 mm MDF board the carcass's full width and
//                    height, stiles 45, rails 45, a mid stile 45 between two
//                    doors, a mid rail 45 under a drawer row; its openings cut
//                    on the CNC as cut-outs (the window mechanism, T25 F1.2)
//   the DOORS        INSET in the openings: opening less 3 mm each side,
//                    22 thick, the shaker field 6 deep inside a 60 frame
//   the DRAWER FRONT inset the same, a brass knob; the doors brass knobs
//   the HINGES       Blum CLIP top in-frame: the cup on the door as today,
//                    the plate on the frame's stile (not drawn: a mockup)
// Frames under verify/chatfix-2110/mockup-inframe-*.png.
//
//   npx vite build && npx vite preview --port 4173 --strictPort &
//   node scripts/chatfix-2110-mockup-inframe.mjs
import { mkdirSync } from 'node:fs';
import { open, pro, roomView, settleCamera, showroomDown } from './t74-harness.mjs';

const J = JSON.stringify;
const OUT = 'verify/chatfix-2110';
mkdirSync(OUT, { recursive: true });
const page = await open();
const P = 'window.__cc.project.getState()';
const U = 'window.__cc.ui.getState()';

// The mockup's own numbers, millimetres (PROPOSED).
const M = {
  stile: 45, rail: 45, midStile: 45, midRail: 45, frameT: 22, gap: 3, doorT: 22, shakerFrame: 60, shakerDepth: 6,
  drawerOpening: 180, knobDia: 28, knobLen: 30,
};

try {
  await pro(page);
  const id = await page.ask(`(() => { const r = ${P}.addUnit('BUD', { wall: 0, x: 1400 }); return r && r.id; })()`);
  await page.sleep(800);
  await page.ask(`${P}.updateUnitParams(${J(id)}, { width: 1000 })`);
  await page.ask(`${P}.setDoors(${J(id)}, { count: 2, hinge: 'L' })`);
  await page.ask(`${P}.addEndPanel(${J(id)}, { side: 'L' })`);
  await page.ask(`${P}.addEndPanel(${J(id)}, { side: 'R' })`);
  await page.ask(`${P}.addPlinth(${J(id)})`);
  await page.ask(`${P}.setFrontType('f1', { source: 'spray' })`);
  // A British green, satin.
  await page.ask(`${P}.setFrontColour({ hex: '#7b8f7a', name: 'F&B Card Room Green', system: 'F&B' }, 'f1')`);
  await page.ask(`${P}.setDesign({ sheen: 30 })`);
  await page.ask(`${U}.setShowOutlines(false)`);
  await page.ask(`(() => { const u = ${U}; if (u.selectUnit) u.selectUnit(null); if (u.closeRightPanel) u.closeRightPanel(); return true; })()`);
  await page.sleep(1000);
  await roomView(page); await settleCamera(page);
  // Where the carcass stands, in the room (metres): from its own panels.
  const geo = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const box = new T.Box3(); const fronts = []; v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId && o.userData.ccMaterialRole !== 'front' && o.userData.ccRole !== 'end_panel' && o.userData.ccRole !== 'plinth') { let at = o; while (at && at.userData.ccUnitId == null) at = at.parent; if (at && at.userData.ccUnitId === ${J(id)}) box.expandByObject(o); } if (o.isMesh && o.userData && o.userData.ccMaterialRole === 'front') { let at = o; while (at && at.userData.ccUnitId == null) at = at.parent; if (at && at.userData.ccUnitId === ${J(id)}) fronts.push(o); } }); window.__ccMock = { fronts }; return { min: box.min.toArray(), max: box.max.toArray(), fronts: fronts.length }; })()`);
  console.log('carcass', JSON.stringify(geo));
  const mm = (v) => v / 1000;
  const [x0, y0] = geo.min; const [x1, y1, zFront] = geo.max;
  const W = x1 - x0; const H = y1 - y0;
  const built = await page.ask(`(() => {
    const v = window.__cc.views.room; const T = v.three;
    const M = ${J(M)}; const mm = (v) => v / 1000;
    const fronts = window.__ccMock.fronts;
    const base = fronts[0] && fronts[0].material;
    // Not a clone: a material compiled by the view carries React's own refs in its userData.
    const paint = new T.MeshPhysicalMaterial(base
      ? { color: base.color.clone(), roughness: base.roughness, metalness: base.metalness, clearcoat: base.clearcoat, clearcoatRoughness: base.clearcoatRoughness, envMapIntensity: base.envMapIntensity }
      : { color: '#7b8f7a', roughness: 0.7 });
    for (const f of fronts) f.visible = false;
    const g = new T.Group(); g.name = 'inframe-mockup';
    const W = ${W}; const H = ${H}; const x0 = ${x0}; const y0 = ${y0}; const zF = ${zFront};
    // THE FACE FRAME: one board W x H x 22 with its openings as holes.
    const st = mm(M.stile); const rl = mm(M.rail); const ms = mm(M.midStile); const mr = mm(M.midRail); const ft = mm(M.frameT);
    const drawerH = mm(M.drawerOpening);
    const shape = new T.Shape(); shape.moveTo(0, 0); shape.lineTo(W, 0); shape.lineTo(W, H); shape.lineTo(0, H); shape.closePath();
    const hole = (x, y, w, h) => { const p = new T.Path(); p.moveTo(x, y); p.lineTo(x + w, y); p.lineTo(x + w, y + h); p.lineTo(x, y + h); p.closePath(); shape.holes.push(p); return [x, y, w, h]; };
    const inner = W - 2 * st; const doorW = (inner - ms) / 2; const doorsTop = H - rl - drawerH - mr; const doorH = doorsTop - rl;
    const openings = [hole(st, rl, doorW, doorH), hole(st + doorW + ms, rl, doorW, doorH), hole(st, H - rl - drawerH, inner, drawerH)];
    const frameGeo = new T.ExtrudeGeometry(shape, { depth: ft, bevelEnabled: false });
    const frame = new T.Mesh(frameGeo, paint); frame.position.set(x0, y0, zF); g.add(frame);
    // THE INSET DOORS AND THE DRAWER FRONT: opening less the gap, 22 thick, flush with the frame's face.
    const gp = mm(M.gap); const dt = mm(M.doorT); const sf = mm(M.shakerFrame); const sd = mm(M.shakerDepth);
    const leaf = ([ox, oy, ow, oh], shaker) => {
      const w = ow - 2 * gp; const h = oh - 2 * gp;
      const grp = new T.Group();
      const slab = new T.Mesh(new T.BoxGeometry(w, h, dt - (shaker ? sd : 0)), paint);
      slab.position.set(x0 + ox + gp + w / 2, y0 + oy + gp + h / 2, zF + ft - dt + (dt - (shaker ? sd : 0)) / 2); grp.add(slab);
      if (shaker) {
        // The shaker frame stands proud of the field by the recess depth: four bars round the field.
        const bars = [[w, sf, 0, h / 2 - sf / 2], [w, sf, 0, -h / 2 + sf / 2], [sf, h - 2 * sf, -w / 2 + sf / 2, 0], [sf, h - 2 * sf, w / 2 - sf / 2, 0]];
        for (const [bw, bh, dx, dy] of bars) { const b = new T.Mesh(new T.BoxGeometry(bw, bh, sd), paint); b.position.set(x0 + ox + gp + w / 2 + dx, y0 + oy + gp + h / 2 + dy, zF + ft - sd / 2); grp.add(b); }
      }
      return grp;
    };
    const brass = new T.MeshPhysicalMaterial({ color: '#b8923e', metalness: 1, roughness: 0.35, envMapIntensity: 1.2 });
    const knob = (x, y) => { const k = new T.Mesh(new T.CylinderGeometry(mm(M.knobDia) / 2, mm(M.knobDia) / 2 * 0.7, mm(M.knobLen), 24), brass); k.rotation.x = Math.PI / 2; k.position.set(x0 + x, y0 + y, zF + ft + mm(M.knobLen) / 2); return k; };
    for (const [i, o] of openings.entries()) {
      const shaker = i < 2;
      g.add(leaf(o, shaker));
      const [ox, oy, ow, oh] = o;
      if (shaker) g.add(knob(i === 0 ? ox + ow - mm(60) : ox + mm(60), oy + oh - mm(120)));
      else g.add(knob(ox + ow / 2, oy + oh / 2));
    }
    v.scene.add(g);
    return { openings, doorW: Math.round(doorW * 1000), doorH: Math.round(doorH * 1000) };
  })()`);
  console.log('mockup', JSON.stringify(built));
  const cam = (x, y, z, tx, ty, tz) => page.ask(`(() => { const v = window.__cc.views.room; v.camera.position.set(${x}, ${y}, ${z}); v.controls.target.set(${tx}, ${ty}, ${tz}); v.controls.update(); return true; })()`);
  const cx = (x0 + x1) / 2;
  await cam(cx + 1.4, 1.3, zFront + 2.4, cx, 0.55, zFront); await page.sleep(900);
  await page.screenshot(`${OUT}/mockup-inframe-01-three-quarter.png`);
  await cam(cx, 0.7, zFront + 2.2, cx, 0.55, zFront); await page.sleep(900);
  await page.screenshot(`${OUT}/mockup-inframe-02-elevation.png`);
  await cam(x0 + 0.35, 0.95, zFront + 0.75, x0 + 0.08, 0.55, zFront); await page.sleep(900);
  await page.screenshot(`${OUT}/mockup-inframe-03-corner-close.png`);
  console.log('frames written');
} catch (e) {
  console.log('ERR', String(e && e.stack || e).slice(0, 400));
} finally {
  await page.close();
  await showroomDown();
}
