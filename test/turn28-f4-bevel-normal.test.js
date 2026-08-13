// ─── TURN 28 F4 — the bevel shader stops flattening the world ───────────────
//
// The owner, with the picture to prove it: a sprayed burgundy shaker door is
// "mega płasko" — dead flat — from every angle. Outlines ON draw the frame,
// because the edge pass reads GEOMETRY; outlines OFF and the 6 mm rebate is
// gone. Rotating the camera changes nothing. So it is not the light.
//
// It was `src/3d/bevel.js` line ~124: `normal = ccBent;` — the fragment's own
// mesh normal REPLACED by one reconstructed from the panel's bounding box
// (`ccFaceNormal = ccFace * ccSign`). Every fragment of a front — frame, rebate
// wall, recess floor — is nearest the ±z pair of a 25 mm board, so all of them
// shaded +z and the recess had no walls to catch light on.
//
// THE LAW: the MESH normal is the base. The box reconstruction contributes
// ONLY the edge roll, blended in near true box edges by how far the mesh normal
// agrees with the box's face normal. Where they disagree — a rebate wall, a
// floor — the geometry wins. Orange peel perturbs whatever normal survives.
//
// The shader is GLSL and node cannot run it, so this proves the law two ways:
// the ARITHMETIC, written out here exactly as the shader states it and
// exercised on a real shaker leaf's own fragments; and the SOURCE, so the
// arithmetic asserted here is the arithmetic that is compiled.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BEVEL_BLEND, createBevelState } from '../src/3d/bevel.js';

const SRC = readFileSync(new URL('../src/3d/bevel.js', import.meta.url), 'utf8');

// ─── The shader's own arithmetic, in JavaScript ─────────────────────────────
//
// One statement per shader line, in the shader's order. The object's axes are
// the identity here — a panel stands square in the room — so object space and
// view space coincide and the two `normalize(vCcAx… )` maps drop out.

const sub = (a, b) => a.map((v, i) => v - b[i]);
const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (a, k) => a.map((v) => v * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => scale(a, 1 / (Math.hypot(...a) || 1));

const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** `ccEdge`: distance to each face pair, and the mask of the nearest axis. */
function ccEdge(local, half) {
  const dist = local.map((v, i) => Math.max(half[i] - Math.abs(v), 0));
  const nearest = Math.min(...dist);
  const face = dist.map((d) => (d <= nearest + 1e-6 ? 1 : 0));
  const n = Math.max(face[0] + face[1] + face[2], 1);
  return { dist, face: face.map((f) => f / n) };
}

/**
 * What the fragment shader now writes into `normal`.
 *
 * @param {object} args
 *   local     the fragment's object-space position, in scene units
 *   half      the box's half-extents
 *   geom      the MESH's own normal at that fragment
 *   bevel     the edge break width
 *   strength  `ccBevelStrength`
 */
function bevelNormal({
  local, half, geom, bevel, strength = 1,
}) {
  const { dist, face } = ccEdge(local, half);
  const sign = local.map((v) => Math.sign(v + 1e-9));
  const faceNormal = face.map((f, i) => f * sign[i]);
  // The band limit is a screen-space fade (fwidth) and cannot be modelled off
  // a pixel derivative here; at full effect it is 1, which is what a door
  // filling the frame gets and what the owner was looking at.
  const roll = face.map((f, i) => (1 - f) * (1 - smoothstep(0, Math.max(bevel, 1e-6), dist[i])));
  const boxN = unit(faceNormal);
  const rolled = unit(add(faceNormal, roll.map((r, i) => r * sign[i] * strength)));
  const base = unit(geom);
  const agree = smoothstep(BEVEL_BLEND.from, BEVEL_BLEND.to, dot(base, boxN));
  return {
    normal: unit(add(base, scale(sub(rolled, boxN), agree))),
    agree,
    boxN,
    rolled,
  };
}

// ─── A real shaker leaf, in the numbers the engine cuts it at ──────────────
//
// 594 × 767 × 25 with a 70 mm frame and a 6 mm rebate — the D/W panel's own
// front, and the same shape as every shaker door in the app. Scene units are
// metres, so the shader's half-extents and the 0.8 mm bevel are in metres too.

const MM = 0.001;
const W = 594 * MM;
const H = 767 * MM;
const T = 25 * MM;
const FRAME = 70 * MM;
const DEPTH = 6 * MM;
const BEVEL = 0.8 * MM;

const HALF = [W / 2, H / 2, T / 2];
const FACE_Z = T / 2;                 // the frame's front face
const FLOOR_Z = T / 2 - DEPTH;        // the recess floor
const IX = W / 2 - FRAME;             // the rebate wall's own x

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const sameDirection = (a, b, tol = 1e-6) => near(dot(unit(a), unit(b)), 1, tol);

test('F4 the REBATE WALL keeps its own normal — the fault, and the fix', () => {
  // A fragment halfway up the left-hand rebate wall. Its nearest box face is
  // the +z pair by a mile (3 mm against 70 mm), so turn 6's reconstruction
  // called it +z — and that is exactly why the recess had no walls.
  const local = [-IX, 0, (FACE_Z + FLOOR_Z) / 2];
  const geom = [1, 0, 0];             // the wall faces INTO the panel
  const out = bevelNormal({
    local, half: HALF, geom, bevel: BEVEL,
  });
  assert.ok(sameDirection(out.boxN, [0, 0, 1]), 'the box reading is +z, as it always was');
  assert.equal(out.agree, 0, 'and the mesh normal disagrees with it completely');
  assert.ok(sameDirection(out.normal, geom), 'so the GEOMETRY wins, to the last digit');
  // Said as the symptom: the shaded normal is no longer the one that made the
  // door flat.
  assert.ok(!sameDirection(out.normal, [0, 0, 1]), 'the wall does not shade +z any more');
});

test('F4 all four walls, both hands, and the corner between them', () => {
  const iy = H / 2 - FRAME;
  const z = (FACE_Z + FLOOR_Z) / 2;
  const walls = [
    { local: [-IX, 0, z], geom: [1, 0, 0] },
    { local: [IX, 0, z], geom: [-1, 0, 0] },
    { local: [0, -iy, z], geom: [0, 1, 0] },
    { local: [0, iy, z], geom: [0, -1, 0] },
  ];
  for (const w of walls) {
    const out = bevelNormal({ ...w, half: HALF, bevel: BEVEL });
    assert.ok(sameDirection(out.normal, w.geom), `${w.geom}: the wall faces the way it is built`);
  }
});

test('F4 the RECESS FLOOR is the panel’s own face, and it stays that', () => {
  const out = bevelNormal({
    local: [0, 0, FLOOR_Z], half: HALF, geom: [0, 0, 1], bevel: BEVEL,
  });
  assert.ok(sameDirection(out.normal, [0, 0, 1]));
  // It AGREES with the box — the floor really does face the way the front
  // does — and the roll it would take is zero, because it is 70 mm from any
  // box edge. So the floor is untouched under either reading, and what makes
  // it read as a floor is the SHADOW off the four walls above.
  assert.equal(out.agree, 1);
});

test('F4 a plain PANEL FACE comes out exactly as turn 6 shipped it', () => {
  // Away from every edge: no roll, so the normal is the face's own.
  const flat = bevelNormal({
    local: [0, 0, FACE_Z], half: HALF, geom: [0, 0, 1], bevel: BEVEL,
  });
  assert.equal(flat.agree, 1, 'the box reading is right here, and is used in full');
  assert.ok(sameDirection(flat.normal, [0, 0, 1]));

  // …and hard against the leaf's own right-hand edge the roll is at full
  // strength: `base + 1 × (rolled − flat)` is `rolled`, which is the vector
  // turn 6 wrote. The edge break is NOT lost to this fix.
  const edge = bevelNormal({
    local: [W / 2 - BEVEL * 0.05, 0, FACE_Z], half: HALF, geom: [0, 0, 1], bevel: BEVEL,
  });
  assert.ok(sameDirection(edge.normal, edge.rolled), 'the rolled vector, unchanged');
  assert.ok(edge.normal[0] > 0.6, 'and it really has turned towards the edge');
  assert.ok(edge.normal[2] > 0, '…without flipping past it');
});

test('F4 a box EDGE and a box CORNER still roll: the band is wide enough', () => {
  // `ccEdge` splits a tie between the axes that are equally near. On the leaf's
  // own right-hand EDGE, x and z are both zero away, so the reconstruction is
  // their bisector and the dot with the flat face is 0.707; on the CORNER all
  // three tie and it is 0.577. Both must still take their roll — a blend that
  // cut out there would leave a dead spot on every corner of every board.
  const edge = bevelNormal({
    local: [W / 2, 0, FACE_Z], half: HALF, geom: [0, 0, 1], bevel: BEVEL,
  });
  assert.ok(near(dot([0, 0, 1], edge.boxN), Math.SQRT1_2, 1e-6), 'the two-face bisector');
  assert.equal(edge.agree, 1, 'inside the band at full strength');

  const corner = bevelNormal({
    local: [W / 2, H / 2, FACE_Z], half: HALF, geom: [0, 0, 1], bevel: BEVEL,
  });
  assert.ok(near(dot([0, 0, 1], corner.boxN), 1 / Math.sqrt(3), 1e-6), 'the three-face one');
  assert.equal(corner.agree, 1);
});

test('F4 the blend is a BAND and it is declared, not hidden in the string', () => {
  assert.ok(BEVEL_BLEND.from < BEVEL_BLEND.to);
  assert.ok(BEVEL_BLEND.from > 0, 'a perpendicular face is refused');
  assert.ok(BEVEL_BLEND.to < Math.SQRT1_2, 'the corner bisector is admitted');
  // The shader is compiled with THESE numbers, not with a copy of them.
  assert.match(SRC, new RegExp(`smoothstep\\(\\$\\{BEVEL_BLEND\\.from\\.toFixed\\(2\\)\\}, \\$\\{BEVEL_BLEND\\.to\\.toFixed\\(2\\)\\}, dot\\(ccBase, ccBoxView\\)\\)`));
});

// ─── The source: what is compiled is what is asserted above ────────────────

test('F4 the shader takes the MESH normal as its base', () => {
  assert.match(SRC, /vec3 ccBase = normalize\(normal\);/, 'the geometry is read, not ignored');
  assert.match(SRC, /vec3 ccBent = normalize\(ccBase \+ ccAgree \* \(ccRolledView - ccBoxView\)\);/,
    'and the box contributes the ROLL — the difference — and nothing else');
  // THE FAULT, gone: the normal is no longer replaced by the reconstruction.
  const code = SRC.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /vec3 ccBent = normalize\(vCcAxX \* ccBentObj/, 'the replacement is gone');
  assert.doesNotMatch(code, /ccBentObj/, '…and so is the variable that carried it');
});

test('F4 the peel perturbs whatever survived, and is otherwise untouched', () => {
  assert.match(SRC, /ccWob -= ccBent \* dot\(ccWob, ccBent\);/, 'still only the TANGENTIAL part');
  assert.match(SRC, /ccBent = normalize\(ccBent \+ ccWob \* \(ccSpray \* ccBand\)\);/);
  // The three sine terms and the moiré band limit are turn 8's own, to the
  // character: F4 changes what the peel is applied TO, not what it is.
  assert.match(SRC, /sin\(ccSp\.y \+ ccSp\.z \* 1\.7\)/);
  assert.match(SRC, /sin\(ccSp\.z \+ ccSp\.x \* 1\.3\)/);
  assert.match(SRC, /sin\(ccSp\.x \+ ccSp\.y \* 1\.9\)/);
  assert.match(SRC, /float ccBand = 1\.0 - smoothstep\(0\.5, 1\.5, ccPhasePx\);/);
});

test('F4 no new uniform, no new geometry, no CNC — the state is turn 6’s', () => {
  const state = createBevelState();
  assert.deepEqual(Object.keys(state).sort(), [
    'ao', 'aoRadius', 'bevel', 'half', 'spray', 'sprayFreq', 'strength', 'uniforms',
  ]);
  // The uniform block the hook writes is the same seven it always wrote.
  const declared = [...SRC.matchAll(/shader\.uniforms\.(\w+) = \{/g)].map((m) => m[1]).sort();
  assert.deepEqual(declared, [
    'ccAo', 'ccAoRadius', 'ccBevel', 'ccBevelStrength', 'ccHalf', 'ccSpray', 'ccSprayFreq',
  ]);
  // …and the cavity darkening pass is not part of this fault and is untouched.
  assert.match(SRC, /diffuseColor\.rgb \*= 1\.0 - ccAo \* ccEdgeAmount;/);
});
