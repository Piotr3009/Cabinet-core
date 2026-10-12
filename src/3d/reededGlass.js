// ─── T78 F12 · THE REEDED PANE'S RIDGES, DRAWN IN CODE ─────────────────────
//
// The owner: *"szyba powinna byc smoke ... domyslnie smoke ale z wyborem."*
// The third kind, reeded, is a vertical ridge normal map on the pane, no new
// dependency: a small canvas painted once and wrapped as a texture. It lives in
// its own file because the scene (`UnitView.jsx`) rasterises nothing but the
// dimension label (T27 F4.2: one component paints), and a glass texture is not
// a dimension. Null where there is no document (tests, node).

import * as THREE from 'three';

let reededNormal = null;
export function reededNormalMap() {
  if (reededNormal || typeof document === 'undefined') return reededNormal;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 4;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(64, 4);
  for (let x = 0; x < 64; x += 1) {
    const nx = Math.sin((x / 64) * Math.PI * 8) * 0.6;
    const r = Math.round((nx * 0.5 + 0.5) * 255);
    for (let y = 0; y < 4; y += 1) {
      const i = (y * 64 + x) * 4;
      img.data[i] = r; img.data[i + 1] = 128; img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  reededNormal = new THREE.CanvasTexture(c);
  reededNormal.wrapS = THREE.RepeatWrapping;
  reededNormal.wrapT = THREE.RepeatWrapping;
  reededNormal.repeat.set(6, 1);
  return reededNormal;
}
