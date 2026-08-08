import { useState } from 'react';
import * as THREE from 'three';

// ─── "Another one here" (turn 9, CLAUDE.md F2) ───
//
// Turn 8 asked which side a new cabinet went on with a three-way picker in the
// Library panel — ◀ / auto / ▶ — and Piotr's verdict was that it is confusing.
// It is, and the reason is worth writing down: it asks you to describe a PLACE
// in words, in a panel, before you have said which cabinet you mean.
//
// This asks it the other way round. Every free end of every run carries a plus
// standing in the gap itself, and clicking it says the whole sentence at once —
// this end, this run — before the library has even opened.
//
// It is a SPRITE, which is the same billboarded-label pattern the dimensions
// and the wall captions have used since turn 1 (3d/DimLabel.jsx): anchored in
// 3D so it moves with the furniture, always facing the camera so it can never
// come out mirrored, and no font to download. It carries `ccHelper`, so it is
// TOOL — it never reaches a render (3d/renderCapture.js) and never casts a
// contact shadow.

const cache = new Map();

/** The disc, drawn once per (colour, state) pair — two per project, in practice. */
function plusTexture(colour, lit) {
  const key = `${colour}|${lit ? 1 : 0}`;
  const known = cache.get(key);
  if (known) return known;

  const N = 128;
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d');
  const r = N / 2 - 6;

  ctx.beginPath();
  ctx.arc(N / 2, N / 2, r, 0, Math.PI * 2);
  ctx.fillStyle = lit ? colour : 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = colour;
  ctx.stroke();

  const arm = r * 0.52;
  ctx.beginPath();
  ctx.moveTo(N / 2 - arm, N / 2);
  ctx.lineTo(N / 2 + arm, N / 2);
  ctx.moveTo(N / 2, N / 2 - arm);
  ctx.lineTo(N / 2, N / 2 + arm);
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.strokeStyle = lit ? '#ffffff' : colour;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

/**
 * @param {object} props
 *   position  where it floats, in SCENE units
 *   size      the disc's diameter, in scene units
 *   colour    the app's selection blue (profile.appearance.selection.colour)
 *   title     what the cursor says it will do
 *   onClick   open the library, carrying { near, side }
 */
export default function AddPlus({
  position, size, colour, title, onClick,
}) {
  const [hover, setHover] = useState(false);
  const map = plusTexture(colour, hover);

  return (
    <sprite
      userData={{ ccHelper: true }}
      position={position}
      scale={[size, size, 1]}
      // Above the furniture in the draw order and depth-tested out of the way,
      // so a plus standing in a 100 mm slot between two cabinets is not half
      // swallowed by the carcass beside it.
      renderOrder={30}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
    >
      <spriteMaterial
        attach="material"
        map={map}
        transparent
        depthTest={false}
        toneMapped={false}
        // Tool: it must never reach the contact-shadow depth pass (turn 9,
        // CLAUDE.md F1.3), where it would print a dark disc on the floor.
        allowOverride={false}
      />
      {title && <group name={title} />}
    </sprite>
  );
}
