// ─── TURN 74 · F12 · THE J-PULL IS SEEN, ALWAYS, AND HAS A SHADOW ──────────
//
// The owner, 23.09.2026 (T73 F4, carried over):
//
//   *"na 3D nie widać J-pulla w ogóle; czasami się pojawia, ale nie wiem co
//   powoduje, że czasami widać, czasami nie; pasowałoby, żeby miał cień, bo
//   teraz nie ma i nic nie widać."*
//
// The probe (`verify/t74/f12-probe.md`, real hands, committed before the fix)
// convicted the CAMERA, not a state: the groove is in the solid in every row,
// but its floor faces the room as the door does, in the same material, so
// head-on it differs from its door by 2 %; the key light's 20 mm shadow bias
// is the whole depth of the step. The fix is the profile number CLAUDE.md
// names, `appearance.jpull.grooveShade`, drawn by the bevel shader on the
// groove's inner faces. After (`f12-probe-after.md`): 25 % head-on.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { createBevelState, bevelHook, syncBevelState } from '../src/3d/bevel.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

test('T74 F12 · the number lives in the profile, beside the bevel, and survives a stored profile', () => {
  assert.equal(P.appearance.jpull.grooveShade, 0.5);
  // A profile saved before tonight gets the house's; a workshop's own number wins.
  const before = { ...P, appearance: { ...P.appearance } };
  delete before.appearance.jpull;
  assert.equal(migrateCabinetProfile(before).appearance.jpull.grooveShade, 0.5);
  const own = { ...P, appearance: { ...P.appearance, jpull: { grooveShade: 0.3 } } };
  assert.equal(migrateCabinetProfile(own).appearance.jpull.grooveShade, 0.3);
});

test('T74 F12 · the shader: the groove box darkens by the share, an empty box shades nothing', () => {
  const state = createBevelState();
  assert.equal(state.grooveShade, 0, 'every board carries a groove shade by default');
  assert.ok(state.grooveMin.x > state.grooveMax.x, 'the default groove box is not empty');
  const shader = { vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <normal_fragment_maps>', uniforms: {} };
  bevelHook(state).onBeforeCompile(shader, null);
  assert.ok(shader.uniforms.ccGrooveMin && shader.uniforms.ccGrooveMax && shader.uniforms.ccGrooveShade);
  assert.match(shader.fragmentShader, /vec3 ccInG = step\(ccGrooveMin, vCcLocal\) \* step\(vCcLocal, ccGrooveMax\);/);
  assert.match(shader.fragmentShader, /diffuseColor\.rgb \*= 1\.0 - ccGrooveShade \* ccInG\.x \* ccInG\.y \* ccInG\.z;/);
  state.grooveShade = 0.5;
  syncBevelState(state);
  assert.equal(shader.uniforms.ccGrooveShade.value, 0.5, 'a changed shade does not reach the live uniform');
});

test('T74 F12 · the 3-D: the J leaf hands its groove box to its own bevel, from the engine\'s `cnc.jpull`', () => {
  const src = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(src, /function jGrooveBox\(p, profile, solid\) \{/);
  assert.match(src, /const shade = Number\(profile\?\.appearance\?\.jpull\?\.grooveShade\) \|\| 0;/);
  // Between the back face and the room face: the two faces stay the door's own.
  assert.match(src, /min: \[mm\(x0\), mm\(y0\), mm\(-d \/ 2 \+ faceMm\)\],/);
  assert.match(src, /max: \[mm\(x1\), mm\(y1\), mm\(d \/ 2 - faceMm\)\],/);
  assert.match(src, /const groove = useMemo\(\(\) => jGrooveBox\(p, profile, Boolean\(built\?\.solid\) && !shaker\), \[p, profile, built, shaker\]\);/);
  assert.match(src, /useBevel\(mitre\?\.box \|\| p\.box, profile, surface\.sprayed && !contour && !xray, groove\)/);
});

test('T74 F12 · the faces take the scene\'s shadows: the solid is a mesh that casts and receives', () => {
  const src = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(src, /castShadow=\{!contour\}\s*receiveShadow=\{!contour\}/);
});
