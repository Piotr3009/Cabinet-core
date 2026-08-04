import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { COLORS } from './constants.js';

// Billboarded dimension label — SPEC 7: labels must ALWAYS face the camera
// (the lesson from the mirrored text in the PSW configurator).
//
// Implemented as a sprite with a canvas texture rather than DOM overlay or a
// web font: sprites are billboards by definition, need no font download, and —
// unlike an HTML overlay — they appear in the WebGL snapshot used for the PDF.
export default function DimLabel({ position, text, scale = 1, tone = 'dim' }) {
  const texture = useMemo(() => {
    const pad = 12;
    const fontSize = 44;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    const width = Math.ceil(ctx.measureText(text).width) + pad * 2;
    const height = fontSize + pad * 2;
    canvas.width = width;
    canvas.height = height;

    const c = canvas.getContext('2d');
    c.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.strokeStyle = tone === 'gold' ? COLORS.gold : '#d0d0cc';
    c.lineWidth = 2;
    roundRect(c, 1, 1, width - 2, height - 2, 8);
    c.fill();
    c.stroke();
    c.fillStyle = tone === 'gold' ? COLORS.gold : COLORS.dim;
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.fillText(text, width / 2, height / 2 + 1);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    tex.userData.aspect = width / height;
    return tex;
  }, [text, tone]);

  useEffect(() => () => texture.dispose(), [texture]);

  const h = 0.055 * scale;
  const w = h * (texture.userData.aspect || 3);

  return (
    <sprite position={position} scale={[w, h, 1]} renderOrder={10}>
      <spriteMaterial attach="material" map={texture} transparent depthTest={false} />
    </sprite>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
