// ─── T75 · THE J-PULL: A RECESS YOU CAN SEE, AND THE SHADOW LIES IN IT ─────
//
// The owner, 24.09.2026, on his own screen, doors shut and seen head-on:
//
//   *"jeśli ja tu widzę J hand to jestem świętym Mikołajem ... na pewno są w
//   kodzie, ale nie na wizualizacji, coś jest nie tak, zmień to proszę."*
//
// …and on 25.09, with the outline switched off:
//
//   *"jak wyroutujesz, to powierzchnia rączki cofa się do tyłu, tam gdzie jest
//   wcięcie ... powinna być powierzchnia wycięta, cofnięta, i cień na tej
//   powierzchni; kiedyś będę chciał zmieniać kolor tej powierzchni."*
//   *"najlepiej to zobaczysz na x-rayu: jak włączysz x-ray, to J pull nie
//   widać wcale."*  *"na milion procent to nie moja przeglądarka."*
//
// MEASURED (scratchpad walk, 25.09): a fresh profile carves the leaf (540
// vertices) and X-ray shows the J; a SAVED workshop profile carrying a J
// section typed into the T57 fields (deleted in T58b) leaves the leaf a plain
// slab (36 vertices), X-ray shows nothing, and only the film on the face and
// the drawn contour were left, which is the owner's screen line for line. So:
// the code's J numbers win on every load (`migrateCabinetProfile`), a J leaf
// is carved whatever else is on, and on a carved leaf the shadow lies ON the
// floor of the recess. The film on the face is only the fallback.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { jpullSpec } from '../src/engine/handles.js';
import { jpullLayers, jpullNotch, notchRim, rampDepths } from '../src/3d/jpullProfile.js';
import { createBevelState } from '../src/3d/bevel.js';

const ROOT = new URL('../', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/3d/UnitView.jsx`, 'utf8');
const bevelSrc = readFileSync(`${ROOT}src/3d/bevel.js`, 'utf8');
const profileSrc = readFileSync(`${ROOT}src/3d/jpullProfile.js`, 'utf8');
const solidSrc = readFileSync(`${ROOT}src/3d/panelSolid.js`, 'utf8');
const bodyOf = (text, head) => {
  const at = text.indexOf(head);
  assert.ok(at >= 0, `${head} is gone`);
  return text.slice(at, text.indexOf('\n}\n', at));
};

// ─── THE ROOT: A SAVED PROFILE COULD STOP THE CARVING ──────────────────────

test('T75 · the J numbers are the code\'s on every load: a saved section cannot outvote J_hand.dxf', () => {
  // What the deleted T57 fields could leave in a browser: a slot deeper than
  // an 18 mm front can hold with its lip, and a lip cleared to nothing.
  const saved = {
    ...P,
    handles: {
      ...P.handles,
      bar: { ...P.handles.bar, rodDiameter: 14 },
      jpull: { ...P.handles.jpull, slotW: 16, lipT: 0, runMm: 320 },
    },
  };
  const m = migrateCabinetProfile(saved);
  assert.deepEqual(m.handles.jpull, P.handles.jpull, 'a stored J section still outvotes the code');
  assert.equal(jpullSpec(m).slotW, 10);
  assert.equal(jpullSpec(m).lipT, 4.212);
  // …and nothing else in the block is touched: a workshop's own bar survives.
  assert.equal(m.handles.bar.rodDiameter, 14);
  // Idempotent: a second load is the first load.
  assert.deepEqual(migrateCabinetProfile(m).handles.jpull, P.handles.jpull);
  // With the code's numbers the leaf is carvable on an 18 mm front; with the
  // saved ones it was not, which is the owner's X-ray.
  const rect = [[0, 0], [597, 0], [597, 2150], [0, 2150]];
  const at = { outline: rect, w: 597, h: 2150, thickness: 18, edge: 'L', from: 700, to: 1700 };
  assert.equal(jpullLayers({ ...at, profile: jpullSpec(saved) }), null, 'the saved section was carvable after all');
  assert.equal(jpullLayers({ ...at, profile: jpullSpec(m) }).length, 3);
});

test('T75 · a J leaf is carved whatever else is on: it does not wait for the joint system', () => {
  assert.match(src, /const jpullCut = Boolean\(p\?\.cnc\?\.jpull\?\.edge\);/);
  assert.match(src, /\(\(layers \|\| jpullCut\) && !mitre \? panelSolids\(p, layers, profile, boredDrills\) : null\)/);
  // The solid says whether the J is really in it, and the view asks.
  assert.match(solidSrc, /return \{ solid: geometry, cuts, jpull: Boolean\(jLayers\) \};/);
  assert.match(src, /const jCarved = Boolean\(built\?\.solid && built\?\.jpull\) && !shaker && !mitre;/);
});

// ─── THE SHAPE: ONE SET OF POINTS FOR THE SOLID, THE FLOOR AND THE RIM ─────

test('T75 · the recess outline is the cutter\'s own points, shared with the solid', () => {
  assert.match(profileSrc, /const path = notchRim\(atX, into, lo, hi, depth, r\);/);
  const spec = jpullSpec(P);
  const w = 597; const h = 2150;
  const rect = [[0, 0], [w, 0], [w, h], [0, h]];
  for (const edge of ['L', 'R']) {
    const layers = jpullLayers({
      outline: rect, w, h, thickness: 18, edge, from: 700, to: 1700, profile: spec,
    });
    const notch = jpullNotch({
      w, h, edge, from: 700, to: 1700, depth: spec.reliefMm, rampR: spec.rampR,
    });
    const leg = layers[2].pts.map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`);
    for (const [x, y] of notch.rim) {
      assert.ok(leg.includes(`${x.toFixed(6)},${y.toFixed(6)}`), `${edge}: the rim point ${x},${y} is not the solid's`);
    }
    // Row by row, straight across from the J edge.
    const atX = edge === 'L' ? 0 : w;
    notch.foot.forEach(([x, y], i) => { assert.equal(x, atX); assert.equal(y, notch.rim[i][1]); });
    // Square on the J edge, full depth along the run, the lead-in between.
    assert.deepEqual(notch.rim[0], [atX, 700]);
    assert.deepEqual(notch.rim[notch.rim.length - 1], [atX, 1700]);
    const deepest = Math.max(...notch.rim.map(([x]) => Math.abs(x - atX)));
    assert.ok(Math.abs(deepest - spec.reliefMm) < 1e-9);
  }
  // notchRim is the lead-in, the straight and the lead-out, and nothing else.
  const rim = notchRim(0, 1, 100, 400, 30, 25);
  assert.equal(rim.length, 2 * rampDepths(30, 25).length);
  // A TOP J runs the whole width: one straight rim, the relief down.
  const top = jpullNotch({ w: 600, h: 300, edge: 'TOP', depth: 30 });
  assert.deepEqual(top.rim, [[0, 270], [600, 270]]);
  assert.deepEqual(top.foot, [[0, 300], [600, 300]]);
  assert.equal(jpullNotch({ w: 600, h: 300, edge: 'X', depth: 30 }), null);
});

test('T75 · the recess is read from the ENGINE record, not from the machined solid', () => {
  const body = bodyOf(src, 'function jpullBand(p, profile) {');
  assert.match(body, /p\?\.meta\?\.jpull/);
  assert.match(body, /const cut = p\?\.cnc\?\.jpull \|\| null;/);
  assert.match(body, /jpullNotch\(\{/);
  assert.doesNotMatch(body, /built|solid|shaker/, 'the recess record depends on the solid again');
  // Only a J the engine cuts: no recess on a wall door or a leaf too short for its run.
  assert.match(body, /jp\.reason === 'wall-door' \|\| jp\.reason === 'too-short'/);
  // The floor of the recess is the face of the hook: the lip, from the back.
  assert.match(body, /floor: -d \/ 2 \+ lip,/);
});

// ─── THE SHADOW LIES ON THE FLOOR ──────────────────────────────────────────

test('T75 · the shadow numbers are the profile\'s, and a profile saved before them gets them', () => {
  const J = P.appearance.jpull;
  assert.equal(J.colour, null, 'the J is the door\'s own colour until the owner says otherwise');
  assert.equal(J.floorShade, 0.16);
  assert.equal(J.rimShadow, 0.5);
  assert.equal(J.rimShadowMm, 18);
  // The fallback film keeps its own two.
  assert.equal(J.shadowEdge, 0.22);
  assert.equal(J.shadowInner, 0.04);
  const old = migrateCabinetProfile({
    ...P, appearance: { ...P.appearance, jpull: { grooveShade: 0.5, shadowEdge: 0.22, shadowInner: 0.04 } },
  });
  assert.equal(old.appearance.jpull.rimShadow, 0.5, 'a profile saved on 24.09 draws no floor shadow');
  assert.equal(old.appearance.jpull.floorShade, 0.16);
  assert.equal(old.appearance.jpull.colour, null);
});

test('T75 · on a carved leaf the shadow is a film lying on the floor, full at the rim and fading out', () => {
  const body = bodyOf(src, 'function jpullFloorGeometry(band) {');
  assert.match(body, /const z = mm\(band\.floor \+ 0\.3\);/, 'the shadow does not lie on the floor');
  assert.match(body, /const dist = jpullToRim\(band\.rim, x, y\);/);
  assert.match(body, /const fall = reach > 0 \? \(1 - Math\.min\(1, dist \/ reach\)\) \*\* 2 : 0;/);
  assert.match(body, /rgba\[v \* 4 \+ 3\] = band\.floorShade \+ \(1 - band\.floorShade\) \* band\.rimShadow \* fall;/);
  // Drawn only where the leaf is carved, in the pretty view, clicks passing through.
  assert.match(src, /jBand && jCarved \? jpullFloorGeometry\(jBand\) : null/);
  assert.match(src, /\{jFloorGeometry && !contour && !xray && \(/);
  assert.match(src, /userData=\{\{ ccJpullFloor: p\.id, ccNoBounds: true \}\}/);
  assert.match(src, /side=\{THREE\.DoubleSide\}/);
});

test('T75 · the film on the room face is only the fallback, for a leaf that could not be carved', () => {
  assert.match(src, /jBand && !jCarved \? jpullBandGeometry\(jBand\) : null/);
  assert.match(src, /\{jBand && jBandGeometry && !jCarved && !contour && !xray && \(/);
  assert.match(src, /userData=\{\{ ccJpullBand: p\.id, ccNoBounds: true \}\}/);
  assert.match(src, /raycast=\{NO_RAYCAST\}/);
  // The recess's own outline, darkest at the J edge and fading inward, as before.
  const body = bodyOf(src, 'function jpullBandGeometry(band) {');
  assert.match(body, /rgba\[i \* 4 \+ 3\] = band\.aEdge \+ \(band\.aInner - band\.aEdge\) \* t;/);
  assert.match(body, /new THREE\.Shape\(jpullOutline\(band\)/);
  assert.match(src, /z: d \/ 2 \+ 0\.4,/);
});

// ─── THE WALLS, AND THE J'S OWN COLOUR ─────────────────────────────────────

test('T75 · every routed face can take the J\'s own colour; the shade stays off the floor', () => {
  assert.match(bevelSrc, /diffuseColor\.rgb = mix\(diffuseColor\.rgb, ccGrooveColour, ccGrooveTint \* ccInGroove\);/);
  assert.match(bevelSrc, /diffuseColor\.rgb \*= 1\.0 - ccGrooveShade \* ccInGroove \* step\(ccGrooveFloor, vCcLocal\.z\);/);
  const state = createBevelState();
  assert.equal(state.grooveTint, 0, 'every board is tinted by default');
  assert.equal(state.grooveFloor, -1);
  // The view hands the colour over only where the profile names one.
  assert.match(src, /if \(groove\.colour\) \{\s*state\.grooveColour\.set\(\.\.\.groove\.colour\);\s*state\.grooveTint = 1;/);
  assert.match(src, /const colour = jpullColour\(J\.colour\);/);
});

// ─── THE CONTOUR (T75 v4, kept) ────────────────────────────────────────────

test('T75 · a J leaf\'s contour is its own, edge by edge: the front edge stops at the J, the back one stays', () => {
  // The owner: *"pionowy od frontu outline się nie kończy na J hand pull, a
  // powinien; tylko tylny powinien zostać."*
  const body = bodyOf(src, 'function jpullContourSegments(band, box) {');
  // The J side's FRONT vertical edge, in two pieces round the run…
  assert.match(body, /add\(\[jx, -H, D\], \[jx, y0, D\]\); add\(\[jx, y1, D\], \[jx, H, D\]\);/);
  // …the BACK face whole…
  assert.match(body, /add\(\[W, -H, -D\], \[W, H, -D\]\);/);
  // …and the rim closing the gap on the face, on the cutter's own points.
  assert.match(body, /for \(let i = 0; i \+ 1 < rim\.length; i \+= 1\) add\(rim\[i\], rim\[i \+ 1\]\);/);
  assert.match(bodyOf(src, 'function jpullRimPoints(band) {'), /return band\.rim\.map\(/);
  // A TOP J (a drawer front): no front top edge, the verticals stop at the rim,
  // the top corners' depth edges end at the hook.
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
  // drawn (`_maxInstanceCount`), and drei's Edges keeps one line geometry for
  // its whole life. A slab that later takes the J showed its first 24 segments
  // for ever. The key below remounts the contour with the geometry.
  assert.match(src, /const outlineKey = `\$\{\(outlineGeometry \|\| mitre\?\.geometry \|\| machined\)\?\.uuid \|\| 'box'\}:\$\{outline\.threshold\}`;/);
  assert.match(src, /<Edges\n\s*\/\/ T75 · a new contour for a new shape \(see `outlineKey` above\)\.\n\s*key=\{outlineKey\}/);
  assert.match(src, /geometry=\{outlineGeometry\}/);
  // The J leaf's own line too: keyed by the leaf, its section and the run it draws.
  assert.match(src, /key=\{`\$\{jBand\.edge\}:\$\{p\.box\.w\}:\$\{p\.box\.h\}:\$\{p\.box\.d\}:\$\{jBand\.relief\}:\$\{jBand\.y0\}:\$\{jBand\.y1\}`\}/);
});
