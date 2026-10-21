/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 21.10.2026 · THE WALK: THE GLOSS RIDE, MEASURED ON THE DOOR ───
//
// The owner: *"nie mamy w ogole polysku, czy mozemy zrobic polysk od 0 do 100
// procent?"*; *"wariant A"*. The proof is a MEASUREMENT, not a feeling: a RAL
// 5008 sprayed door shot at 5 %, 60 % and 100 % from the same camera, and the
// door's own pixels averaged (a PNG read here, no image tool: CLAUDE.md rule
// 4). Before the fix 5 % and 100 % differed by one unit in 255. Frames under
// verify/chatfix-2110/.
//
//   npx vite build && npx vite preview --port 4173 --strictPort &
//   node scripts/chatfix-2110-walk.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { open, pro, roomView, settleCamera, showroomDown } from './t74-harness.mjs';

const J = JSON.stringify;
const OUT = 'verify/chatfix-2110';
mkdirSync(OUT, { recursive: true });
const page = await open();
const checks = [];
const check = (name, ok, said = '') => { checks.push({ name, ok: Boolean(ok), said }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${said ? ' . ' + said : ''}`); };
const P = 'window.__cc.project.getState()';
const U = 'window.__cc.ui.getState()';

/** A minimal PNG reader (8-bit RGB / RGBA, no interlace): the mean brightness of a box, 0..255. */
export function pngMean(path, [x0, y0, x1, y1]) {
  const buf = readFileSync(path);
  let pos = 8;
  let width = 0; let height = 0; let channels = 4;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      const colour = data[9];
      channels = colour === 6 ? 4 : colour === 2 ? 3 : colour === 4 ? 2 : 1;
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  let sum = 0; let n = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = y * stride + x * channels;
      sum += (out[i] + out[i + 1] + out[i + 2]) / 3; n += 1;
    }
  }
  return n ? sum / n : 0;
}

try {
  await pro(page);
  const a = await page.ask(`(() => { const r = ${P}.addUnit('WARDROBE', { wall: 0, x: 400 }); return r && r.id; })()`);
  const b = await page.ask(`(() => { const r = ${P}.addUnit('BUD', { wall: 0, x: 1100 }); return r && r.id; })()`);
  const c = await page.ask(`(() => { const r = ${P}.addUnit('BUD', { wall: 0, x: 1700 }); return r && r.id; })()`);
  await page.sleep(800);
  await page.ask(`${P}.setDoors(${J(a)}, { count: 2, hinge: 'L' })`);
  await page.ask(`${P}.setDoors(${J(b)}, { count: 1, hinge: 'L' })`);
  await page.ask(`${P}.setDoors(${J(c)}, { count: 1, hinge: 'R' })`);
  await page.ask(`${P}.setFrontType('f1', { source: 'spray' })`);
  await page.ask(`${P}.setFrontColour({ hex: '#2f3b4c', name: 'RAL 5008', system: 'RAL' }, 'f1')`);
  await page.ask(`${U}.setShowOutlines(false)`);
  await page.sleep(600);
  await roomView(page); await settleCamera(page);
  const bb = await page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const box = new T.Box3(); v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccPanelId) box.expandByObject(o); }); return [box.min.toArray(), box.max.toArray()]; })()`);
  const cx = (bb[0][0] + bb[1][0]) / 2;
  const front = bb[1][2];
  // The studio probe is the profile's 256 px (3d/Scene.jsx reads it).
  const probe = await page.ask(`(() => { const v = window.__cc.views.room; const t = v.scene.environment || v.scene.userData.ccEnvironment; return t ? (t.image && t.image.width) || t.source?.data?.width || null : null; })()`);
  check('0 the studio probe is on the scene', probe != null, `probe texture width ${probe}`);
  // A frontal, low camera: the +z studio panel reflects in a vertical door.
  await page.ask(`(() => { const v = window.__cc.views.room; v.camera.position.set(${cx + 0.3}, 0.9, ${front + 2.6}); v.controls.target.set(${cx + 0.3}, 0.9, ${front}); v.controls.update(); return true; })()`);
  await page.sleep(700);
  const door = () => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; let m = null; v.scene.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccMaterialRole === 'front' && o.userData.ccUnitId === ${J(b)}) m = o; }); if (!m) { v.scene.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccMaterialRole === 'front') m = o; }); } if (!m) return null; const r = v.gl.domElement.getBoundingClientRect(); const bx = new T.Box3().setFromObject(m); const pts = [[bx.min.x, bx.min.y, bx.max.z], [bx.max.x, bx.max.y, bx.max.z]].map(([x, y, z]) => { const p = new T.Vector3(x, y, z).project(v.camera); return [r.left + (p.x * 0.5 + 0.5) * r.width, r.top + (-p.y * 0.5 + 0.5) * r.height]; }); return { x0: Math.round(Math.min(pts[0][0], pts[1][0])), x1: Math.round(Math.max(pts[0][0], pts[1][0])), y0: Math.round(Math.min(pts[0][1], pts[1][1])), y1: Math.round(Math.max(pts[0][1], pts[1][1])), mat: { roughness: m.material.roughness, clearcoat: m.material.clearcoat, ccr: m.material.clearcoatRoughness, env: m.material.envMapIntensity } }; })()`);
  const means = {};
  for (const s of [5, 60, 100]) {
    await page.ask(`${P}.setDesign({ sheen: ${s} })`);
    await page.sleep(1200);
    const d = await door();
    await page.screenshot(`${OUT}/gloss-${s}.png`);
    // The door's middle third, well inside its edges.
    const w = d.x1 - d.x0; const h = d.y1 - d.y0;
    means[s] = { mean: pngMean(`${OUT}/gloss-${s}.png`, [d.x0 + Math.round(w * 0.3), d.y0 + Math.round(h * 0.3), d.x1 - Math.round(w * 0.3), d.y1 - Math.round(h * 0.3)]), mat: d.mat };
    console.log(`  sheen ${s}: door mean ${means[s].mean.toFixed(1)} ${JSON.stringify(d.mat)}`);
  }
  check('1 the material rides the slider: coat 0.05 to 1, its roughness 0.48 to 0.03, the probe 0.29 to 1', means[5].mat.clearcoat < 0.06 && means[100].mat.clearcoat === 1 && means[100].mat.ccr <= 0.031 && means[5].mat.ccr > 0.45 && means[100].mat.env === 1,
    `${JSON.stringify(means[5].mat)} -> ${JSON.stringify(means[100].mat)}`);
  const delta = means[100].mean - means[5].mean;
  check('2 the door is visibly glossier at 100 % than at 5 % (before the fix: one unit in 255)', delta >= 6, `door mean ${means[5].mean.toFixed(1)} -> ${means[60].mean.toFixed(1)} -> ${means[100].mean.toFixed(1)} (+${delta.toFixed(1)})`);
  check('3 and 60 % stands between them', means[60].mean > means[5].mean && means[60].mean < means[100].mean, `${means[60].mean.toFixed(1)}`);
  // The colour is still the colour: a white door at 100 % is not tinted (the studio is neutral grey).
  await page.ask(`${P}.setFrontColour({ hex: '#f2efe6', name: 'RAL 9010', system: 'RAL' }, 'f1')`);
  await page.sleep(1000);
  const dw = await door();
  await page.screenshot(`${OUT}/gloss-white-100.png`);
  const w = dw.x1 - dw.x0; const h = dw.y1 - dw.y0;
  const box = [dw.x0 + Math.round(w * 0.3), dw.y0 + Math.round(h * 0.3), dw.x1 - Math.round(w * 0.3), dw.y1 - Math.round(h * 0.3)];
  const whiteMean = pngMean(`${OUT}/gloss-white-100.png`, box);
  check('4 a white door at 100 % stays white (wariant A: the studio is neutral grey)', whiteMean > 150, `white door mean ${whiteMean.toFixed(1)}`);
  // From the side, the studio's panels show in the doors as the camera moves: a second frame for the eye.
  await page.ask(`${P}.setFrontColour({ hex: '#2f3b4c', name: 'RAL 5008', system: 'RAL' }, 'f1')`);
  await page.ask(`(() => { const v = window.__cc.views.room; v.camera.position.set(${cx - 1.4}, 1.6, ${front + 2.2}); v.controls.target.set(${cx + 0.2}, 1.0, ${front}); v.controls.update(); return true; })()`);
  await page.sleep(1000);
  await page.screenshot(`${OUT}/gloss-100-side.png`);
  await page.ask(`${P}.setDesign({ sheen: 5 })`);
  await page.sleep(1000);
  await page.screenshot(`${OUT}/gloss-5-side.png`);
} catch (e) {
  check('walk ran to the end', false, String(e && e.stack || e).slice(0, 300));
} finally {
  const bad = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - bad.length}/${checks.length} ${bad.length ? 'RED' : 'GREEN'}`);
  await page.close();
  await showroomDown();
  process.exit(bad.length ? 1 : 0);
}
