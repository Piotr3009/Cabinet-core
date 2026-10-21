/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 21.10.2026 · THE FINAL IN-FRAME MOCKUP, HIS NUMBERS ───────────
//
// The owner, 21.10.2026 (22:03 and 22:14), after the two sections: *"wszedzie
// ramke 38 mm"*, *"1 mm bedzie w srodku wystawac"* (the lip into the opening;
// a veneered 19 side comes out flush), *"ramka 25 drzwi 22 ... 3 mm gap
// pomiedzy carcasem a drzwiami"*, *"3 mm zawsze"* (the door's gap in its
// opening), *"jak podwojne drzwi to miedzy drzwiami nie ma ramki, tylko miedzy
// szafkami"*, *"raczej plyta"* (ONE frame per run, from one board, up to 2800;
// a longer run is joined), *"dol: zdecydowanie wariant C"* (the bottom rail: 1
// lip + 18 + 19 hanging under the carcass), *"gora: ma isc nad szafke tak samo
// jak dol, a pozniej stolarz wypelni te dziure i blat pojdzie na wierzch"*
// (the top rail: 1 lip + 18 + 19 above the carcass; a filler on site; the
// worktop on top), *"zawias na boku szafki (specjalne zawiasy z Bluma)"*,
// *"zrob ostateczne mockupy"*. The end of a run (his "4 mm jak sasiad" was
// said for the 40 scheme): drawn here as a 38 stile over the end panel, to
// confirm. Nothing in the engine is touched: the mockup is drawn at run time
// over real units in the real scene, their own fronts and end panel hidden.
//
//   npx vite build && npx vite preview --port 4173 --strictPort &
//   node scripts/chatfix-2110-mockup-inframe-final.mjs
import { mkdirSync } from 'node:fs';
import { open, pro, roomView, settleCamera, showroomDown } from './t74-harness.mjs';

const J = JSON.stringify;
const OUT = 'verify/chatfix-2110';
mkdirSync(OUT, { recursive: true });
const page = await open();
const P = 'window.__cc.project.getState()';
const U = 'window.__cc.ui.getState()';

// His numbers, millimetres (21.10.2026).
const M = {
  rail: 38, stile: 38, lip: 1, frameT: 25, doorT: 22, gap: 3, side: 18, endPanel: 18,
  outside: 19, // what the rail puts beyond the carcass top and bottom (38 = 1 + 18 + 19)
  shakerFrame: 60, shakerDepth: 6, knobDia: 28, knobLen: 30, worktop: 38,
};

try {
  await pro(page);
  const add = async (type, x) => page.ask(`(() => { const r = ${P}.addUnit(${J(type)}, { wall: 0, x: ${x} }); return r && r.id; })()`);
  const a = await add('BUD', 1000);
  const b = await add('BUD', 1600);
  const c = await add('BUDR2', 2400);
  const w = await add('WUD', 1000);
  await page.sleep(800);
  await page.ask(`${P}.updateUnitParams(${J(a)}, { width: 600 })`);
  await page.ask(`${P}.updateUnitParams(${J(b)}, { width: 800 })`);
  await page.ask(`${P}.updateUnitParams(${J(c)}, { width: 500 })`);
  await page.ask(`${P}.updateUnitParams(${J(w)}, { width: 600 })`);
  await page.ask(`${P}.setDoors(${J(a)}, { count: 1, hinge: 'L' })`);
  await page.ask(`${P}.setDoors(${J(b)}, { count: 2, hinge: 'L' })`);
  await page.ask(`${P}.setDoors(${J(w)}, { count: 1, hinge: 'L' })`);
  await page.ask(`${P}.addEndPanel(${J(a)}, { side: 'L' })`);
  await page.ask(`${P}.addPlinth(${J(a)})`);
  await page.ask(`${P}.setFrontType('f1', { source: 'spray' })`);
  await page.ask(`${P}.setFrontColour({ hex: '#7b8f7a', name: 'F&B Card Room Green', system: 'F&B' }, 'f1')`);
  await page.ask(`${P}.setDesign({ sheen: 30 })`);
  await page.ask(`${U}.setShowOutlines(false)`);
  await page.ask(`(() => { const u = ${U}; if (u.selectUnit) u.selectUnit(null); if (u.closeRightPanel) u.closeRightPanel(); return true; })()`);
  await page.sleep(1000);
  await roomView(page); await settleCamera(page);

  // Read the real geometry: per unit its carcass box and its fronts' boxes; the end panel; the worktop.
  const geo = await page.ask(`(() => {
    const v = window.__cc.views.room; const T = v.three;
    const ids = ${J([a, b, c, w])};
    const units = {}; for (const id of ids) units[id] = { box: new T.Box3(), fronts: [] };
    const hide = []; let endPanel = null; let worktop = null;
    v.scene.traverse((o) => {
      if (!o.isMesh || !o.userData) return;
      let at = o; while (at && at.userData.ccUnitId == null) at = at.parent;
      const uid = at && at.userData.ccUnitId;
      const role = o.userData.ccRole; const mr = o.userData.ccMaterialRole;
      if (role === 'end_panel' || role === 'endPanel' || /end.?panel/i.test(String(role))) { endPanel = new T.Box3().setFromObject(o); hide.push(o); return; }
      if (role === 'worktop' || /worktop/i.test(String(role))) { worktop = new T.Box3().setFromObject(o); hide.push(o); return; }
      if (!uid || !units[uid]) return;
      if (role === 'plinth' || /plinth/i.test(String(role)) || /plinth/i.test(String(o.userData.ccPanelId || ''))) return;
      if (mr === 'front') { units[uid].fronts.push(new T.Box3().setFromObject(o)); hide.push(o); return; }
      if (!o.userData.ccPanelId) return;
      units[uid].box.expandByObject(o);
    });
    for (const o of hide) o.visible = false;
    const out = { units: {}, endPanel: endPanel && [endPanel.min.toArray(), endPanel.max.toArray()], worktop: worktop && [worktop.min.toArray(), worktop.max.toArray()], hidden: hide.length };
    for (const id of ids) out.units[id] = { box: [units[id].box.min.toArray(), units[id].box.max.toArray()], fronts: units[id].fronts.map((f) => [f.min.toArray(), f.max.toArray()]) };
    return out;
  })()`);
  console.log('geometry', JSON.stringify(geo));

  const built = await page.ask(`(() => {
    const v = window.__cc.views.room; const T = v.three;
    const M = ${J(M)}; const mm = (x) => x / 1000; const G = ${J(geo)};
    const ids = ${J([a, b, c, w])};
    const drawerUnits = new Set(${J([c])});
    const paint = new T.MeshPhysicalMaterial({ color: '#7b8f7a', roughness: 0.62, clearcoat: 0.3, clearcoatRoughness: 0.36, envMapIntensity: 0.47 });
    const filler = new T.MeshStandardMaterial({ color: '#c9b58f', roughness: 0.9 });
    const oak = new T.MeshStandardMaterial({ color: '#8a6f4e', roughness: 0.7 });
    const brass = new T.MeshPhysicalMaterial({ color: '#b8923e', metalness: 1, roughness: 0.35, envMapIntensity: 1.2 });
    const g = new T.Group(); g.name = 'inframe-final';
    const box = (w, h, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
    // Runs: the three base units are one run, the wall unit another.
    const runs = [[ids[0], ids[1], ids[2]], [ids[3]]];
    const report = [];
    for (const [ri, run] of runs.entries()) {
      const boxes = run.map((id) => G.units[id].box);
      const x0 = Math.min(...boxes.map((b) => b[0][0])); const x1 = Math.max(...boxes.map((b) => b[1][0]));
      const y0 = Math.min(...boxes.map((b) => b[0][1])); const y1 = Math.max(...boxes.map((b) => b[1][1]));
      const zF = Math.max(...boxes.map((b) => b[1][2])); const zB = Math.min(...boxes.map((b) => b[0][2]));
      const base = ri === 0;
      // ONE frame for the run: from the end panel's outer face (base run) or the carcass (wall run) to 1 mm past the far side;
      // 19 below the bottom and 19 above the top (his "wariant C" for both).
      const fx0 = x0 - (base ? mm(M.endPanel) + mm(1) : mm(M.lip)); const fx1 = x1 + mm(M.lip);
      const fy0 = y0 - mm(M.outside); const fy1 = y1 + mm(M.outside);
      const W = fx1 - fx0; const H = fy1 - fy0;
      const shape = new T.Shape(); shape.moveTo(0, 0); shape.lineTo(W, 0); shape.lineTo(W, H); shape.lineTo(0, H); shape.closePath();
      for (const id of run) {
        const b = G.units[id].box;
        // The opening: the carcass's inner width less the 1 mm lips, the inner height less the lips.
        const ox0 = b[0][0] + mm(M.side) + mm(M.lip) - fx0; const ox1 = b[1][0] - mm(M.side) - mm(M.lip) - fx0;
        const oy0 = b[0][1] + mm(M.side) + mm(M.lip) - fy0; const oy1 = b[1][1] - mm(M.side) - mm(M.lip) - fy0;
        const p = new T.Path(); p.moveTo(ox0, oy0); p.lineTo(ox1, oy0); p.lineTo(ox1, oy1); p.lineTo(ox0, oy1); p.closePath(); shape.holes.push(p);
        // Fronts INSET in that opening: every real front keeps its cell (the midline between neighbours), 3 mm to the frame, 3 mm between fronts.
        const fronts = G.units[id].fronts.map((f) => ({ x0: f[0][0], x1: f[1][0], y0: f[0][1], y1: f[1][1] }));
        const cells = fronts.map((f) => {
          const left = fronts.filter((o) => o !== f && o.x1 <= f.x0 + 1e-6 && o.y1 > f.y0 && o.y0 < f.y1); const right = fronts.filter((o) => o !== f && o.x0 >= f.x1 - 1e-6 && o.y1 > f.y0 && o.y0 < f.y1);
          const below = fronts.filter((o) => o !== f && o.y1 <= f.y0 + 1e-6 && o.x1 > f.x0 && o.x0 < f.x1); const above = fronts.filter((o) => o !== f && o.y0 >= f.y1 - 1e-6 && o.x1 > f.x0 && o.x0 < f.x1);
          const cx0 = left.length ? (Math.max(...left.map((o) => o.x1)) + f.x0) / 2 : -Infinity; const cx1 = right.length ? (Math.min(...right.map((o) => o.x0)) + f.x1) / 2 : Infinity;
          const cy0 = below.length ? (Math.max(...below.map((o) => o.y1)) + f.y0) / 2 : -Infinity; const cy1 = above.length ? (Math.min(...above.map((o) => o.y0)) + f.y1) / 2 : Infinity;
          const half = mm(M.gap) / 2; const full = mm(M.gap);
          return {
            x0: Math.max(cx0 + half, ox0 + fx0 + full), x1: Math.min(cx1 - half, ox1 + fx0 - full),
            y0: Math.max(cy0 + half, oy0 + fy0 + full), y1: Math.min(cy1 - half, oy1 + fy0 - full),
            door: !drawerUnits.has(id),
          };
        });
        for (const cl of cells) {
          const w = cl.x1 - cl.x0; const h = cl.y1 - cl.y0; const cx = (cl.x0 + cl.x1) / 2; const cy = (cl.y0 + cl.y1) / 2;
          const dt = mm(M.doorT); const sd = cl.door ? mm(M.shakerDepth) : 0; const sf = mm(M.shakerFrame);
          // The front's face is flush with the frame's face: zF + 25; its back 3 mm off the carcass.
          const zFace = zF + mm(M.frameT);
          box(w, h, dt - sd, paint, cx, cy, zFace - sd - (dt - sd) / 2);
          if (cl.door) {
            for (const [bw, bh, dx, dy] of [[w, sf, 0, h / 2 - sf / 2], [w, sf, 0, -h / 2 + sf / 2], [sf, h - 2 * sf, -w / 2 + sf / 2, 0], [sf, h - 2 * sf, w / 2 - sf / 2, 0]]) box(bw, bh, sd, paint, cx + dx, cy + dy, zFace - sd / 2);
            // Knobs opposite the hinge: a pair opens from the middle, so the knob sits on the edge nearest the unit's centre;
            // 60 in, 120 from the top of a base door, from the bottom of a wall door.
            const unitCx = (b[0][0] + b[1][0]) / 2; const pair = cells.length > 1;
            const kx = pair ? (cx < unitCx ? cl.x1 - mm(60) : cl.x0 + mm(60)) : cl.x1 - mm(60); const ky = base ? cl.y1 - mm(120) : cl.y0 + mm(120);
            const k = new T.Mesh(new T.CylinderGeometry(mm(M.knobDia) / 2, mm(M.knobDia) / 2 * 0.7, mm(M.knobLen), 24), brass); k.rotation.x = Math.PI / 2; k.position.set(kx, ky, zFace + mm(M.knobLen) / 2); g.add(k);
          } else {
            const k = new T.Mesh(new T.CylinderGeometry(mm(M.knobDia) / 2, mm(M.knobDia) / 2 * 0.7, mm(M.knobLen), 24), brass); k.rotation.x = Math.PI / 2; k.position.set(cx, cy, zFace + mm(M.knobLen) / 2); g.add(k);
          }
          report.push({ run: ri, unit: id, front: [Math.round(w * 1000), Math.round(h * 1000)], door: cl.door });
        }
        report.push({ run: ri, unit: id, opening: [Math.round((ox1 - ox0) * 1000), Math.round((oy1 - oy0) * 1000)] });
      }
      const frame = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: mm(M.frameT), bevelEnabled: false }), paint);
      frame.position.set(fx0, fy0, zF); g.add(frame);
      report.push({ run: ri, frame: [Math.round(W * 1000), Math.round(H * 1000)], stileBetween: run.length > 1 ? M.side * 2 + M.lip * 2 : null });
      if (base) {
        // The filler the joiner adds on site (19, the frame's own height above the carcass), then the worktop on top.
        box(x1 - x0, mm(M.outside), zF - zB, filler, (x0 + x1) / 2, y1 + mm(M.outside) / 2, (zF + zB) / 2);
        const wd = (zF + mm(M.frameT) + mm(10)) - zB;
        box(fx1 - fx0 + mm(10), mm(M.worktop), wd, oak, (fx0 + fx1) / 2, fy1 + mm(M.worktop) / 2, zB + wd / 2);
        // The end panel: 18 on the left side, floor to the frame's top, to the frame's face.
        const ep = G.endPanel; const epY0 = ep ? ep[0][1] : 0; const epZ0 = ep ? ep[0][2] : zB;
        box(mm(M.endPanel), fy1 - epY0, zF + mm(M.frameT) - epZ0, paint, x0 - mm(M.endPanel) / 2 - mm(1), (epY0 + fy1) / 2, (epZ0 + zF + mm(M.frameT)) / 2);
      }
    }
    v.scene.add(g);
    return report;
  })()`);
  console.log('mockup', JSON.stringify(built));

  const cam = (x, y, z, tx, ty, tz) => page.ask(`(() => { const v = window.__cc.views.room; v.camera.position.set(${x}, ${y}, ${z}); v.controls.target.set(${tx}, ${ty}, ${tz}); v.controls.update(); return true; })()`);
  const base = geo.units[a].box; const last = geo.units[c].box; const wall = geo.units[w].box;
  const x0 = base[0][0]; const x1 = last[1][0]; const zF = base[1][2]; const cx = (x0 + x1) / 2;
  await cam(cx + 1.6, 1.5, zF + 2.9, cx, 1.0, zF); await page.sleep(900);
  await page.screenshot(`${OUT}/mockup-inframe-final-01-three-quarter.png`);
  await cam(cx, 1.1, zF + 3.2, cx, 1.1, zF); await page.sleep(900);
  await page.screenshot(`${OUT}/mockup-inframe-final-02-elevation.png`);
  // The junction A|B low: the 38 stile and the rail hanging 19 under the carcass.
  const xj = base[1][0];
  await cam(xj + 0.7, 0.5, zF + 1.5, xj, 0.3, zF); await page.sleep(900);
  await page.screenshot(`${OUT}/mockup-inframe-final-03-junction-low.png`);
  // The top, seen at the run's open end: the frame 19 above the carcass, the filler behind it, the worktop on top.
  const yt = base[1][1];
  await cam(x1 + 0.55, yt + 0.25, zF + 0.45, x1, yt - 0.02, zF - 0.15); await page.sleep(900);
  await page.screenshot(`${OUT}/mockup-inframe-final-04-top-filler.png`);
  // The wall unit: 19 under and over.
  const wc = (wall[0][0] + wall[1][0]) / 2;
  await cam(wc + 0.9, wall[0][1] - 0.2, zF + 1.6, wc, (wall[0][1] + wall[1][1]) / 2, zF); await page.sleep(900);
  await page.screenshot(`${OUT}/mockup-inframe-final-05-wall-unit.png`);
  console.log('frames written');
} catch (e) {
  console.log('ERR', String(e && e.stack || e).slice(0, 600));
} finally {
  await page.close();
  await showroomDown();
}
