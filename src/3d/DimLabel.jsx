import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS } from './constants.js';
import { chromeOn } from './chrome.js';

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

// ─── TURN 48 (CLAUDE.md F8): A LABEL HOLDS ITS SIZE ON SCREEN ───────────────
//
// The owner, 25.08.2026: *"zeby zawsze wymiary byly takie same niezaleznie jak
// bardzo sie odsuniemy od mebla."*
//
// MEASURED FAULT. A sprite is sized in WORLD units, so three.js draws it
// smaller the further away it is — which is right for a board and wrong for a
// caption. `DimLabel` asked for 0.055 world units, which is 55 mm of furniture,
// so the number that says how wide a cabinet is shrank with the cabinet: a hair
// of type across a room, a banner with your nose against a drawer front. A
// drawing office's figures are the one thing on a drawing that does NOT scale.
//
// THE LAW, and it is three lines of arithmetic. A perspective camera shows a
// world height of `2·tan(fov/2)·depth` across the viewport; an orthographic one
// shows `(top − bottom)/zoom`, whatever the depth. Divide either by the
// viewport's height IN PIXELS and you have the world size of one pixel at that
// distance. Multiply by the pixel height you want and the sprite is that many
// pixels tall — at any distance, through any zoom, in both projections.
//
// `depth` is the VIEW-SPACE depth (−z in camera space), not the straight-line
// distance to the camera: screen size falls off with the projected depth, and a
// label at the edge of a wide viewport would otherwise come out a little large.
//
// ─── ONE FILE, EVERY CONSUMER ───────────────────────────────────────────────
//
// The ruler, the hover readout, the room's wall captions, the unit view and the
// aura all mount `DimLabel`, so they inherit this by being what they already
// are. The dimension CHAINS own their own sprite (`3d/DimensionChain.jsx`
// `DimensionValue`, deliberately — R11: a dimension's caption is one decision
// in one place), so they import the law from here rather than copying it. Two
// sprites, one rule, and the rule lives in the file CLAUDE.md names.
//
// ─── AND THE RELATIVE SIZES DO NOT MOVE ─────────────────────────────────────
//
// Every caption in this app is tuned as a multiple of `DimLabel`'s own 0.055 —
// the chain's 0.8 of it, T29's ×1.3 on top of that (0.0572 in the profile), the
// `scale` a caller passes. Those are the owner's own tuning and none of it is
// this feature's business. So the WORLD number stays the datum and is converted:
// `labelPixelHeight(0.055) === LABEL_PX_BASE`, and every ratio anybody ever set
// survives to the pixel.
//
// ─── THE CAPTURE PATH ───────────────────────────────────────────────────────
//
// `3d/renderCapture.js` hides every sprite before it takes a picture (`isChrome`
// — a label is TOOL, and a render is of the furniture), so nothing here reaches
// a 4K still and the drawing buffer's own size never enters this arithmetic.
// The viewport read below is the CANVAS's CSS height, which is what "pixels on
// screen" means to the person looking at it. The day a label belongs in a
// render, this comment is the line to come back to.

/** The world height `DimLabel` drew at before F8 — the datum every relative
 *  caption size in this app is expressed against.
 *
 *  Module-scope, like the two below it: `labelPixelHeight` and `useScreenScale`
 *  are the whole of what anybody outside this file needs, and an export nothing
 *  imports is what T31-F12's sweep is there to catch. */
const LABEL_WORLD_BASE = 0.055;

// ─── CHAT-FIX 25.08.2026: HALF WAY, NOT ALL THE WAY ─────────────────────────
//
// T48-F8 pinned the label to a constant PIXEL height, and the owner is right
// that it went too far: *"pozostawienie takiego samego wymiaru dimension przy
// odsowaniu szafy nie byl dobry pomysl … niech sie pomniejszaja przez pol …
// nie calkowicie jak przedtem."* The morning audit had already found the
// symptom — pull back in a room and the captions collide, because nothing
// shrinks to make room.
//
// Three behaviours, and the owner wants the middle one:
//
//   before T48   screen size ∝ 1/d      shrinks away to nothing
//   T48          screen size ∝ 1        never shrinks, so they overlap
//   HERE         screen size ∝ 1/√d     shrinks HALF as fast as the world
//
// Half in the exponent, which is what "przez pol" means for a size that falls
// off with distance: double the distance and the caption loses about 30 %, not
// all of it and not none. Legible far away, out of each other's way.
//
// `REF_DEPTH` is where the correction is neutral — at that depth the label is
// exactly the pixel height T48 asked for, so every relative caption size in the
// app still lands where the owner tuned it. The two clamps stop the ends of the
// scale from misbehaving: without them a very far label returns to a speck and
// a very near one to a banner, which are the two complaints this file has now
// had one of each.
const REF_DEPTH = 3;
const MIN_FACTOR = 0.55;
const MAX_FACTOR = 1.8;

/** How much of the perspective fall-off to give back, at this view depth. */
function halfWay(depth) {
  const d = Math.max(1e-3, depth);
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, Math.sqrt(REF_DEPTH / d)));
}

/** …and what that is worth ON SCREEN, in CSS pixels. Large enough that the
 *  44 px type inside the 68 px canvas lands around 17 px tall, which is the
 *  size the app's own `cc-label` is set in. */
const LABEL_PX_BASE = 26;

/** One of the old world heights → the pixel height that replaces it. */
export function labelPixelHeight(worldHeight) {
  return (LABEL_PX_BASE * (Number(worldHeight) || 0)) / LABEL_WORLD_BASE;
}

/**
 * The world size of ONE PIXEL, at `depth` in front of `camera`.
 *
 * @param {THREE.Camera} camera
 * @param {number} viewportHeightPx  the canvas's CSS height
 * @param {number} depth             view-space depth (−z), ignored by an
 *                                   orthographic camera, which has no falloff
 */
function worldPerPixel(camera, viewportHeightPx, depth) {
  const px = Math.max(1, Number(viewportHeightPx) || 0);
  if (!camera) return 0;
  if (camera.isOrthographicCamera) {
    const zoom = Math.abs(Number(camera.zoom)) || 1;
    return Math.abs(camera.top - camera.bottom) / zoom / px;
  }
  const fov = ((Number(camera.fov) || 0) * Math.PI) / 180;
  return (2 * Math.tan(fov / 2) * Math.max(0, Number(depth) || 0)) / px;
}

const VIEW = new THREE.Vector3();

/**
 * Hold an object at a constant PIXEL size, whatever the camera does.
 *
 * @param {number} pxHeight  how tall it should be, in CSS pixels
 * @param {(object, worldHeight:number) => void} apply  what "that tall" means
 *   for this object — a sprite sets `scale` from its aspect, a hit box from its
 *   own proportions. The caller owns the shape; this owns the size.
 * @returns {import('react').MutableRefObject} the ref to hang on the object
 */
export function useScreenScale(pxHeight, apply) {
  const ref = useRef(null);
  const viewportH = useThree((state) => state.size.height);
  useFrame(({ camera }) => {
    const object = ref.current;
    if (!object || !camera) return;
    // Both matrices refreshed HERE rather than trusted: three updates them
    // inside `render()`, which runs after this, so reading them raw would size
    // every label to where it and the camera were one frame ago — visible as a
    // shimmer the whole time an orbit is moving.
    object.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    VIEW.setFromMatrixPosition(object.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    const depth = -VIEW.z;
    const h = pxHeight * halfWay(depth) * worldPerPixel(camera, viewportH, depth);
    if (h > 0) apply(object, h);
  });
  return ref;
}

export default function DimLabel({
  position, text, scale = 1, tone = 'dim', colour = null, variant = 'bubble',
}) {
  // TURN 59: the PBI retail mount draws the furniture and none of the tool.
  // PRO never calls `setProChrome`, so this is `true` and this line is a no-op.
  // T60 F2 · the CHANNEL, not the master switch: PBI's VIEW BAR owns this
  // overlay, PRO sets no channel and reads `on` exactly as it always did.
  if (!chromeOn('dimensions')) return null;
  const texture = useMemo(() => {
    const flat = variant === 'flat';
    // CHAT FIX 15.08.2026: 'bare' — the hover look. No ground at all; a white
    // halo keeps the figure legible on a dark decor. The owner's ruling: a
    // plate that follows the pointer covers the very thing being measured.
    const bare = variant === 'bare';
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
    } else if (bare) {
      c.lineJoin = 'round';
      c.lineWidth = Math.max(4, Math.round(fontSize * 0.16));
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.strokeText(shown, width / 2, height / 2 + 1);
      c.fillStyle = ink;
      c.fillText(shown, width / 2, height / 2 + 1);
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

  // T48-F8: the size is now a PIXEL height, and `scale` still means exactly
  // what it meant — a multiple of the app's own caption size.
  const aspect = texture.userData.aspect || 3;
  const px = LABEL_PX_BASE * (Number(scale) || 0);
  const ref = useScreenScale(px, (sprite, h) => sprite.scale.set(h * aspect, h, 1));
  // The world height this used to be, kept as the FIRST FRAME's value: the
  // frame loop has not run when the sprite mounts, and a label that appears at
  // scale 0 for one frame is a flicker on every hover.
  const h0 = LABEL_WORLD_BASE * scale;

  return (
    <sprite
      ref={ref}
      position={position}
      scale={[h0 * aspect, h0, 1]}
      renderOrder={10}
      // T48-F8: the height this label MEANS to be, in CSS pixels, on the object
      // itself (R7: never a `data-*` on an R3F object). An acceptance walk can
      // then measure the sprite the way three draws it and hold the two to each
      // other, which is a claim about the law rather than about a screenshot —
      // and it tells a label apart from the other sprites in the scene, which
      // are CONTROLS and are world-sized on purpose (3d/AddPlus.jsx).
      userData={{ ccLabelPx: px }}
    >
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
