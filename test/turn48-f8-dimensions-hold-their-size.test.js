// ─── TURN 48, CLAUDE.md F8: DIMENSIONS HOLD THEIR SIZE ON SCREEN ────────────
//
// The owner, 25.08.2026: *"zeby zawsze wymiary byly takie same niezaleznie jak
// bardzo sie odsuniemy od mebla."*
//
// A sprite is sized in WORLD units, so three.js draws it smaller the further
// away it is — right for a board, wrong for a caption. `DimLabel` asked for
// 0.055 world units, which is 55 mm of furniture, so the number saying how wide
// a cabinet is shrank with the cabinet: a hair of type across a room, a banner
// with your nose against a drawer front.
//
// THE PROOF THAT MATTERS IS THE PAIR OF SCREENSHOTS — one scene, far and close,
// the label the same height to the pixel, both in `verify/t48/`. CLAUDE.md asks
// for it in as many words and a source test cannot make that measurement.
//
// What this file holds is everything a node test CAN: that the law is written
// once, in the file CLAUDE.md names; that the second sprite in the app imports
// it rather than copying it; that both projections are answered; and that not
// one of the relative sizes the owner has tuned over eight turns has moved.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { dimensionStyle } from '../src/engine/dimensionArrows.js';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const LABEL = src('3d/DimLabel.jsx');
const CHAIN = src('3d/DimensionChain.jsx');
const CAPTURE = src('3d/renderCapture.js');

// ══ ONE FILE ═══════════════════════════════════════════════════════════════

test('the law lives in DimLabel, and it is the only copy of it', () => {
  assert.match(LABEL, /export function useScreenScale\(pxHeight, apply\) \{/);
  assert.match(LABEL, /export function labelPixelHeight\(worldHeight\) \{/);
  // …and NOBODY else works out a world-per-pixel of their own.
  for (const [name, text] of [['DimensionChain', CHAIN], ['DimLabel', LABEL]]) {
    const copies = (text.match(/Math\.tan\(/g) || []).length;
    assert.ok(copies <= (name === 'DimLabel' ? 1 : 0), `${name} has ${copies} of its own`);
  }
  assert.match(CHAIN, /import \{ labelPixelHeight, useScreenScale \} from '\.\/DimLabel\.jsx';/);
});

test('every sprite in the scene that carries a number goes through it', () => {
  // Two sprites draw a caption in this app: `DimLabel` (the ruler, the hover
  // readout, the room's wall captions, the unit view, the aura) and the chain's
  // own `DimensionValue` (R11 — a dimension's caption is one decision in one
  // place). Both take their size from the hook.
  assert.equal((LABEL.match(/useScreenScale\(/g) || []).length, 2, 'the declaration and its one use');
  assert.equal((CHAIN.match(/useScreenScale\(/g) || []).length, 2, 'the caption and its catchment');
  // A `scale=` that is not a first-frame default is a size that stopped
  // following the camera.
  assert.match(LABEL, /ref=\{ref\}\n\s+position=\{position\}\n\s+scale=\{\[h0 \* aspect, h0, 1\]\}/);
  assert.match(CHAIN, /ref=\{ref\}\n\s+position=\{position\}\n\s+scale=\{\[h \* aspect, h, 1\]\}/);
  // …and each says how tall it MEANS to be, in CSS pixels, on the object itself
  // (R7: never a `data-*` on an R3F object). That is what lets the acceptance
  // walk measure a sprite the way three draws it and hold the two to each
  // other — and what tells a LABEL apart from the run's own "+" controls, which
  // are world-sized on purpose.
  assert.match(LABEL, /userData=\{\{ ccLabelPx: px \}\}/);
  assert.match(CHAIN, /ccLabelPx: labelPixelHeight\(h\),/);
});

// ══ BOTH PROJECTIONS ═══════════════════════════════════════════════════════

test('constant means constant in BOTH projections — perspective and orthographic', () => {
  // A perspective camera shows `2·tan(fov/2)·depth` across the viewport; an
  // orthographic one shows `(top − bottom)/zoom` whatever the depth. Divide by
  // the viewport's pixel height and you have the world size of one pixel.
  assert.match(LABEL, /if \(camera\.isOrthographicCamera\) \{/);
  assert.match(LABEL, /Math\.abs\(camera\.top - camera\.bottom\) \/ zoom \/ px/);
  assert.match(LABEL, /\(2 \* Math\.tan\(fov \/ 2\) \* Math\.max\(0, Number\(depth\) \|\| 0\)\) \/ px/);
});

test('the falloff is the VIEW-SPACE depth, not the distance to the camera', () => {
  // Screen size falls off with the projected depth. Using the straight-line
  // distance would make a label at the edge of a wide viewport a little large —
  // which is exactly the kind of "nearly constant" this feature is replacing.
  assert.match(LABEL, /VIEW\.setFromMatrixPosition\(object\.matrixWorld\)\.applyMatrix4\(camera\.matrixWorldInverse\);/);
  assert.match(LABEL, /worldPerPixel\(camera, viewportH, -VIEW\.z\)/);
});

test('both matrices are refreshed in the frame, not trusted', () => {
  // three updates them inside `render()`, which runs after the frame callback:
  // reading them raw would size every label to where it and the camera were one
  // frame ago, which is a shimmer for the whole length of an orbit.
  assert.match(LABEL, /object\.updateWorldMatrix\(true, false\);/);
  assert.match(LABEL, /camera\.updateMatrixWorld\(\);/);
});

// ══ AND NOTHING THE OWNER TUNED HAS MOVED ══════════════════════════════════

test('the relative sizes are untouched: the WORLD number is still the datum', () => {
  // `labelPixelHeight` converts, it does not re-decide. So T29's "a third
  // bigger" is still a third bigger, and the chain is still 0.8 of DimLabel.
  assert.match(LABEL, /const LABEL_WORLD_BASE = 0\.055;/);
  assert.match(LABEL, /return \(LABEL_PX_BASE \* \(Number\(worldHeight\) \|\| 0\)\) \/ LABEL_WORLD_BASE;/);
  const style = dimensionStyle(P);
  assert.ok(Math.abs(style.labelHeight / 0.044 - 1.3) < 1e-9, 'T29-F4 still holds');
  // The chain asks for its own profile height, converted — not a number of its
  // own invention.
  assert.match(CHAIN, /useScreenScale\(labelPixelHeight\(h\)/);
  assert.match(CHAIN, /const h = style\.labelHeight;/);
});

test('a caller\'s `scale` still means a multiple of the app\'s caption size', () => {
  assert.match(LABEL, /const px = LABEL_PX_BASE \* \(Number\(scale\) \|\| 0\);/);
  // …and the first frame still draws the size it drew before, so a label that
  // has not been through the frame loop yet is not a flicker at scale 0.
  assert.match(LABEL, /const h0 = LABEL_WORLD_BASE \* scale;/);
});

// ══ THE CAPTURE PATH, MINDED ═══════════════════════════════════════════════

test('the capture path is minded: a render hides every sprite, and says so', () => {
  // CLAUDE.md: *"Mind the capture path (renderCapture) and any orthographic
  // camera: constant means constant everywhere."* The orthographic half is
  // above. The capture half is that a still is of the FURNITURE — every sprite
  // is chrome and is hidden before the shutter — so the drawing buffer's own
  // size never enters this arithmetic, and the viewport read is the canvas's
  // CSS height, which is what "pixels on screen" means to the person looking.
  assert.match(CAPTURE, /object\.isSprite/, 'renderCapture still treats a sprite as chrome');
  assert.match(LABEL, /THE CAPTURE PATH/);
  assert.match(LABEL, /useThree\(\(state\) => state\.size\.height\)/);
});

// ══ THE CATCHMENT FOLLOWS ══════════════════════════════════════════════════

test('the double-click catchment holds its size too — a target you can hit', () => {
  // A world-sized box under a screen-sized caption is a caption you can see and
  // cannot hit: bigger than its target across a room, smaller than it up close.
  assert.match(CHAIN, /function PickBox\(\{/);
  assert.match(CHAIN, /\(box, h\) => box\.scale\.set\(h \* 3, h \* 1\.6, h\),/);
  assert.match(CHAIN, /<boxGeometry args=\{\[1, 1, 1\]\} \/>/, 'a UNIT box — the size is the ref\'s');
  assert.match(CHAIN, /visible=\{false\}/, 'and still invisible');
});
