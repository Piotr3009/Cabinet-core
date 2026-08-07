import { useMemo } from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';

// ─── Contact shadow (turn 6, CLAUDE.md F2) ───
//
// A cabinet standing on a floor puts a dark, soft footprint under itself. The
// shadow map does not give you one: it is cast from a light somewhere off to
// the side, so it lands beside the unit, and the gap between the legs stays as
// bright as the open floor. The eye reads that as hovering.
//
// This is the cheap fix everybody uses and BACKLOG #37 asks for by name: one
// transparent quad per unit, carrying a soft footprint, laid on the floor
// UNDER the unit and inside the unit's own group — so it turns and slides with
// the cabinet and costs nothing per frame.
//
// It is deliberately not drei's <ContactShadows>: that one re-renders the scene
// into a texture, which is a real per-frame cost for something whose whole
// point is to be free.

const textures = new Map();

/**
 * The footprint image: opaque under the unit, fading to nothing at the edge of
 * the quad. Generated once per (spread, softness) pair — the whole project
 * shares one, however many units are standing on the floor.
 */
function footprint(spread, softness) {
  const key = `${spread}|${softness}`;
  const known = textures.get(key);
  if (known) return known;

  const N = 128;
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(N, N);

  // The quad is `spread` times the footprint, so in [-1, 1] the unit itself
  // covers [-1/spread, 1/spread]; everything past that is the falloff.
  const inner = (1 / Math.max(1.01, spread)) * (1 - 0.12 * softness);
  const fall = Math.max(1e-3, 1 - inner);

  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const px = ((x + 0.5) / N) * 2 - 1;
      const py = ((y + 0.5) / N) * 2 - 1;
      // Distance OUTSIDE the footprint rectangle — 0 under the cabinet.
      const qx = Math.max(Math.abs(px) - inner, 0);
      const qy = Math.max(Math.abs(py) - inner, 0);
      const d = Math.hypot(qx, qy) / fall;
      const a = (1 - Math.min(1, d)) ** (2 + softness);
      const i = (y * N + x) * 4;
      image.data[i] = 0;
      image.data[i + 1] = 0;
      image.data[i + 2] = 0;
      image.data[i + 3] = Math.round(255 * a);
    }
  }
  ctx.putImageData(image, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textures.set(key, tex);
  return tex;
}

/**
 * @param {object} props
 *   width, depth   the unit's footprint, in mm
 *   y              floor level in the unit's LOCAL frame, in mm (usually
 *                  −legHeight: the group sits on top of the legs)
 *   profile        for appearance.contactShadow
 */
export default function ContactShadow({ width, depth, y, profile }) {
  const C = profile.appearance.contactShadow;
  const map = useMemo(() => footprint(C.spread, C.softness), [C.spread, C.softness]);

  const w = mm(width) * C.spread;
  const d = mm(depth) * C.spread;

  return (
    <mesh
      // A hair above the floor: coplanar with it, the two z-fight.
      position={[mm(width / 2), mm(y) + 0.0015, mm(depth / 2)]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
    >
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial
        map={map}
        transparent
        opacity={C.opacity}
        depthWrite={false}
        // Not tone mapped: it is a multiply over the floor, not a lit surface,
        // and ACES would lift it to grey in the render.
        toneMapped={false}
      />
    </mesh>
  );
}
