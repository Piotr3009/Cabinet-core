// ─── T75 · THE J-PULL BAND: SEEN IN EVERY LIGHT, ON EVERY SCREEN ───────────
//
// The owner, 24.09.2026, on his own screen, doors shut and seen head-on:
//
//   *"jeśli ja tu widzę J hand to jestem świętym Mikołajem ... na pewno są w
//   kodzie, ale nie na wizualizacji, coś jest nie tak, zmień to proszę."*
//
// T74 F12 shaded the groove inside the machined solid, which reads only where
// the solid is built and the light leaves the recess dark. The J is now also
// drawn as its own flat, unlit band on the room face of the leaf, from the
// engine's own record, so it does not depend on the solid, the light or the
// shader.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/3d/UnitView.jsx`, 'utf8');

test('T75 · the band share is a profile number, and a saved profile without it gets it', () => {
  assert.equal(P.appearance.jpull.bandShade, 0.3);
  const old = migrateCabinetProfile({ ...P, appearance: { ...P.appearance, jpull: { grooveShade: 0.5 } } });
  assert.equal(old.appearance.jpull.bandShade, 0.3, 'a profile saved before T75 draws no band');
});

test('T75 · the band is drawn from the ENGINE record, not from the machined solid', () => {
  const at = src.indexOf('function jpullBand(p, profile) {');
  assert.ok(at > 0, 'jpullBand is gone');
  const body = src.slice(at, src.indexOf('\n}\n', at));
  assert.match(body, /p\?\.meta\?\.jpull/);
  assert.match(body, /reliefMm/);
  assert.doesNotMatch(body, /built|solid|shaker/, 'the band depends on the solid again');
  // Only a J the engine cuts: no band on a wall door or a leaf too short for its run.
  assert.match(body, /jp\.reason === 'wall-door' \|\| jp\.reason === 'too-short'/);
});

test('T75 · unlit, in front of the face, and clicks pass through it', () => {
  assert.match(src, /<meshBasicMaterial color=\{jBandColour\} polygonOffset/);
  assert.match(src, /raycast=\{NO_RAYCAST\}/);
  assert.match(src, /z: d \/ 2 \+ 0\.4,/);
  assert.match(src, /userData=\{\{ ccJpullBand: p\.id, ccNoBounds: true \}\}/);
});

test('T75 · the band is the door colour darkened, and it is not drawn in contour or X-ray', () => {
  assert.match(src, /c\.multiplyScalar\(jBand\.shade\)/);
  assert.match(src, /\{jBand && jBandGeometry && !contour && !xray && \(/);
});
