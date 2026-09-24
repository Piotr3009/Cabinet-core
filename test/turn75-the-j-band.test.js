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

test('T75 · the shadow shares are profile numbers, and a saved profile without them gets them', () => {
  // The owner: *"delikatny cień, bardzo delikatny, a nie czarne tło"*.
  assert.equal(P.appearance.jpull.shadowEdge, 0.22);
  assert.equal(P.appearance.jpull.shadowInner, 0.04);
  const old = migrateCabinetProfile({ ...P, appearance: { ...P.appearance, jpull: { grooveShade: 0.5 } } });
  assert.equal(old.appearance.jpull.shadowEdge, 0.22, 'a profile saved before T75 draws no shadow');
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

test('T75 · a see-through film in front of the face, and clicks pass through it', () => {
  assert.match(src, /vertexColors\n\s*transparent\n\s*depthWrite=\{false\}/);
  assert.match(src, /raycast=\{NO_RAYCAST\}/);
  assert.match(src, /z: d \/ 2 \+ 0\.4,/);
  assert.match(src, /userData=\{\{ ccJpullBand: p\.id, ccNoBounds: true \}\}/);
});

test('T75 · darkest at the J edge, fading inward; square on the edge, rounded on the inner side', () => {
  // *"zakończenie miało być w drugą stronę, jak oryginalne J-pulle"*
  assert.match(src, /rgba\[i \* 4 \+ 3\] = band\.aEdge \+ \(band\.aInner - band\.aEdge\) \* t;/);
  assert.match(src, /if \(band\.edge === 'R'\) \{\n\s*shape\.moveTo\(x1, y0\);/);
  assert.match(src, /Math\.min\(ramp, x1 - x0, \(y1 - y0\) \/ 2\)/);
  assert.match(src, /\{jBand && jBandGeometry && !contour && !xray && \(/);
});

test('T75 · a J leaf\'s contour is its own, edge by edge: the front edge stops at the J, the back one stays', () => {
  // The owner: *"pionowy od frontu outline się nie kończy na J hand pull, a
  // powinien; tylko tylny powinien zostać."*
  assert.match(src, /function jpullContourSegments\(band, box\) \{/);
  const at = src.indexOf('function jpullContourSegments(band, box) {');
  const body = src.slice(at, src.indexOf('\n}\n', at));
  // The J side's FRONT vertical edge, in two pieces round the run…
  assert.match(body, /add\(\[jx, -H, D\], \[jx, y0, D\]\); add\(\[jx, y1, D\], \[jx, H, D\]\);/);
  // …the BACK face whole…
  assert.match(body, /add\(\[W, -H, -D\], \[W, H, -D\]\);/);
  // …and the rim closing the gap on the face.
  assert.match(body, /for \(let i = 0; i \+ 1 < rim\.length; i \+= 1\) add\(rim\[i\], rim\[i \+ 1\]\);/);
  // A TOP J (a drawer front): no front top edge, the verticals stop at the rim,
  // the top corners\' depth edges end at the hook.
  assert.match(body, /add\(\[-W, -H, D\], \[-W, yr, D\]\); add\(\[W, -H, D\], \[W, yr, D\]\);/);
  assert.match(body, /const lipZ = -D \+ mm\(band\.lip\);/);
  assert.doesNotMatch(body, /built|solid|shaker/, 'the contour depends on the solid again');
  // Drawn once, as one segments line, in the pretty view; Edges steps aside for it.
  assert.match(src, /chromeOn\('outlines'\) && outlines && !contour && !xray && jContour && \(/);
  assert.match(src, /!\(jContour && !contour && !xray\) && \(\n\s*<Edges/);
  assert.match(src, /userData=\{\{ ccHelper: true, ccJpullContour: p\.id \}\}/);
  assert.doesNotMatch(src, /ccJpullRim/, 'the separate rim line is back');
});

test('T75 · the contour is a NEW line whenever the board it outlines is another object', () => {
  // MEASURED: three caps a fat line at the instance count it had when first
  // drawn (`_maxInstanceCount`), and drei\'s Edges keeps one line geometry for
  // its whole life. A slab that later takes the J showed its first 24 segments
  // for ever. The key below remounts the contour with the geometry.
  assert.match(src, /const outlineKey = `\$\{\(outlineGeometry \|\| mitre\?\.geometry \|\| machined\)\?\.uuid \|\| 'box'\}:\$\{outline\.threshold\}`;/);
  assert.match(src, /<Edges\n\s*\/\/ T75 · a new contour for a new shape \(see `outlineKey` above\)\.\n\s*key=\{outlineKey\}/);
  assert.match(src, /geometry=\{outlineGeometry\}/);
  // The J leaf\'s own line too: keyed by the leaf and the run it draws.
  assert.match(src, /key=\{`\$\{jBand\.edge\}:\$\{p\.box\.w\}:\$\{p\.box\.h\}:\$\{p\.box\.d\}:\$\{jBand\.x0\}:\$\{jBand\.y0\}:\$\{jBand\.y1\}`\}/);
});
