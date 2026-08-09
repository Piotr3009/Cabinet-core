import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { COLORS } from './constants.js';

// Billboarded dimension label — SPEC 7: labels must ALWAYS face the camera
// (the lesson from the mirrored text in the PSW configurator).
//
// Implemented as a sprite with a canvas texture rather than DOM overlay or a
// web font: sprites are billboards by definition, need no font download, and —
// unlike an HTML overlay — they appear in the WebGL snapshot used for the PDF.
// `tone` is the two the scene has always had ('dim' for a unit's own captions,
// 'gold' for the one being dragged). `colour` is an explicit ink and wins over
// both — turn 5 draws the distance dimensions in the drawing-office navy or
// red (profile.dimensions.colours), and a caption in the furniture's gold is
// exactly what BACKLOG #34 is complaining about.
// ─── TURN 17 (CLAUDE.md F6.3): TWO LOOKS, AND ONE OF THEM IS NEW ───────────
//
// Owner, on the cabinet's name on the canvas: "paskudna chmurka" — an ugly
// little cloud. He is right, and it is worth saying exactly what was wrong with
// it, because "make it nicer" is not a specification: a white rounded rectangle
// with a 2 px outline is a SPEECH BALLOON. It is the shape a comic uses for
// something somebody said, and a drawing of furniture has no business carrying
// one. A drawing office labels a thing with a flat plate and quiet type.
//
//   'bubble'  the dimension caption, unchanged. It is a MEASUREMENT sitting on
//             a white ground and it has earned its outline: without one, a red
//             number at the foot of a cabinet lands on the floor's own tone.
//   'flat'    the NAME. Square corners, no stroke, the app's own shell as the
//             plate and its own ink on it, and the app's label type — small,
//             upper case, letter-spaced, which is what every `cc-label` in the
//             panels already is. Nothing is invented: the two colours are in
//             3d/constants.js beside the rest of the scene's palette.
//
// It is a LOOK change and it moves nothing: the same sprite, the same
// billboarding, the same `allowOverride` rule that keeps a label out of the
// shadow pass.
export default function DimLabel({
  position, text, scale = 1, tone = 'dim', colour = null, variant = 'bubble',
}) {
  const texture = useMemo(() => {
    const flat = variant === 'flat';
    const pad = flat ? 16 : 12;
    const fontSize = flat ? 38 : 44;
    const shown = flat ? String(text).toUpperCase() : text;
    const font = flat
      ? `600 ${fontSize}px ui-monospace, Menlo, Consolas, monospace`
      : `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    // The plate is wider than the type on a flat label: the letter-spacing the
    // app's own `cc-label` carries has to be paid for in pixels, and a caption
    // that touches its own edge reads as clipped.
    const tracking = flat ? fontSize * 0.09 : 0;
    const width = Math.ceil(ctx.measureText(shown).width + tracking * shown.length) + pad * 2;
    const height = fontSize + pad * 2;
    canvas.width = width;
    canvas.height = height;

    const ink = colour || (tone === 'gold' ? COLORS.gold : COLORS.dim);
    const c = canvas.getContext('2d');
    c.font = font;
    c.textBaseline = 'middle';
    c.textAlign = 'center';

    if (flat) {
      // Square, quiet, and no outline at all — the plate IS the edge.
      c.fillStyle = COLORS.labelPlate;
      c.globalAlpha = 0.9;
      c.fillRect(0, 0, width, height);
      c.globalAlpha = 1;
      c.fillStyle = tone === 'gold' ? COLORS.goldSoft : COLORS.labelInk;
      if (tracking) {
        // Draw it letter by letter, which is the only way a canvas tracks type.
        const total = ctx.measureText(shown).width + tracking * (shown.length - 1);
        let x = (width - total) / 2;
        for (const ch of shown) {
          c.textAlign = 'left';
          c.fillText(ch, x, height / 2 + 1);
          x += ctx.measureText(ch).width + tracking;
        }
      } else {
        c.fillText(shown, width / 2, height / 2 + 1);
      }
    } else {
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.strokeStyle = colour || (tone === 'gold' ? COLORS.gold : '#d0d0cc');
      c.lineWidth = 2;
      roundRect(c, 1, 1, width - 2, height - 2, 8);
      c.fill();
      c.stroke();
      c.fillStyle = ink;
      c.fillText(shown, width / 2, height / 2 + 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    tex.userData.aspect = width / height;
    return tex;
  }, [text, tone, colour, variant]);

  useEffect(() => () => texture.dispose(), [texture]);

  const h = 0.055 * scale;
  const w = h * (texture.userData.aspect || 3);

  return (
    <sprite position={position} scale={[w, h, 1]} renderOrder={10}>
      {/* `allowOverride` — a label is TOOL, and tool casts no shadow. Without
          it the sprite renders into the contact-shadow depth pass (turn 9,
          CLAUDE.md F1.3) and prints a small dark square on the floor beside the
          cabinet it is measuring. */}
      <spriteMaterial attach="material" map={texture} transparent depthTest={false} allowOverride={false} />
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
