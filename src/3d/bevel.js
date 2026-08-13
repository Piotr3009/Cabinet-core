import * as THREE from 'three';

// ─── Edge break + cavity, on the shader (turn 6, CLAUDE.md F2) ───
//
// Two things separate a photograph of a cabinet from a picture of some boxes,
// and neither is resolution:
//
//   1. EVERY EDGE IS BROKEN. A cut board has 0.5–1 mm of chamfer off the saw
//      and the bander; light catches it and every edge in the room draws itself
//      as a fine bright line. A mathematically sharp corner reads as CG
//      immediately, and no amount of lighting fixes it.
//   2. PANELS DARKEN WHERE THEY MEET. Two boards at right angles occlude each
//      other's ambient light near the joint. Without it a carcass is a flat
//      poster of a carcass.
//
// BACKLOG #37 is explicit that this is NOT to be done with geometry — a mesh
// dense enough to carry a 0.8 mm chamfer on every panel of a fitted kitchen
// would cost the frame rate for something under a millimetre wide. So it is
// done on the NORMALS, per fragment, from the box's own dimensions.
//
// How it knows where the edges are: every piece the engine emits is a BOX, and
// the view draws it as `boxGeometry(w, h, d)` centred on its own origin. So the
// object-space position of a fragment, against the box's half-extents, IS the
// distance to each face — no UVs, no maps, no second geometry.
//
// One program for every bevelled material (`customProgramCacheKey`), so a room
// of 400 panels compiles this shader once and varies only its uniforms.

const CACHE_KEY = 'cc-bevel-1';

const VERT_COMMON = /* glsl */`
varying vec3 vCcLocal;
varying vec3 vCcAxX;
varying vec3 vCcAxY;
varying vec3 vCcAxZ;
`;

const VERT_BODY = /* glsl */`
  vCcLocal = position;
  // The object's own axes, in view space. Carried as three vectors rather than
  // read from normalMatrix in the fragment shader, because three declares
  // normalMatrix for the VERTEX stage only.
  vCcAxX = normalMatrix * vec3(1.0, 0.0, 0.0);
  vCcAxY = normalMatrix * vec3(0.0, 1.0, 0.0);
  vCcAxZ = normalMatrix * vec3(0.0, 0.0, 1.0);
`;

const FRAG_COMMON = /* glsl */`
varying vec3 vCcLocal;
varying vec3 vCcAxX;
varying vec3 vCcAxY;
varying vec3 vCcAxZ;
uniform vec3 ccHalf;
uniform float ccBevel;
uniform float ccBevelStrength;
uniform float ccAoRadius;
uniform float ccAo;
uniform float ccSpray;
uniform float ccSprayFreq;

// Distance from this fragment to each of the three face pairs, and a mask that
// is 1 on the axis whose face we are standing on.
void ccEdge(out vec3 dist, out vec3 face) {
  dist = max(ccHalf - abs(vCcLocal), vec3(0.0));
  float nearest = min(dist.x, min(dist.y, dist.z));
  face = step(dist, vec3(nearest + 1e-6));
  // On an exact corner more than one axis ties; keep the mask a unit vector so
  // the reconstructed face normal does not come out longer than it should.
  face /= max(face.x + face.y + face.z, 1.0);
}
`;

/**
 * ─── TURN 28 (CLAUDE.md F4): HOW FAR THE BOX IS ALLOWED TO SPEAK ────────────
 *
 * How much the fragment's own MESH normal has to agree with the normal
 * reconstructed from the bounding box before the box's edge roll is blended
 * in. `dot` of the two: 1 is a plain panel face (the box reading is exactly
 * right), 0 is a shaker rebate's wall (the box reading is 90° wrong).
 *
 * The band is wide on purpose. `ccEdge` splits a tie between the axes that are
 * equally near, so on a box EDGE the reconstruction is the two faces' bisector
 * (dot 0.707 with a flat face) and on a CORNER it is the three-way one (dot
 * 0.577) — both must still take their roll, or every corner of every board in
 * the room would have a dead spot on it. What must NOT roll is a face standing
 * ACROSS the box's own — a shaker's rebate wall — and those sit at 0.
 *
 * Exported so the guard reads the numbers the shader is compiled with rather
 * than a copy of them.
 */
export const BEVEL_BLEND = { from: 0.15, to: 0.50 };

// Inserted where `normal` is final and `nonPerturbedNormal` still feeds the
// clearcoat — so the lacquer's clear film picks the edge up as well, which is
// the whole difference between a sprayed door and a melamine one at a corner.
const FRAG_NORMAL = /* glsl */`
{
  vec3 ccDist, ccFace;
  ccEdge(ccDist, ccFace);
  vec3 ccSign = sign(vCcLocal + 1e-9);
  vec3 ccFaceNormal = ccFace * ccSign;
  // 1 hard against an edge, 0 once past the break.
  vec3 ccRoll = (1.0 - ccFace) * (1.0 - smoothstep(0.0, max(ccBevel, 1e-6), ccDist));
  // ─── Band limit (hotfix 08.08, second of the day) ───
  // The roll is 0.8 mm wide. Seen from across the room that is under a pixel,
  // and a normal that turns 90° inside one pixel does not shade as an edge —
  // it shades as a staircase of glints, the bright cousin of the peel moiré.
  // fwidth(ccDist) is millimetres-of-edge-distance per pixel: at 0.3 of the
  // bevel width per pixel the roll still has ~3 px to breathe (full effect),
  // by 1.0 it is sub-pixel and fades to a plain corner the MSAA can handle.
  vec3 ccPxSpan = fwidth(ccDist) / max(ccBevel, 1e-6);
  vec3 ccEdgeBand = vec3(1.0) - smoothstep(vec3(0.3), vec3(1.0), ccPxSpan);
  ccRoll *= ccEdgeBand;

  // ─── TURN 28 (CLAUDE.md F4): THE MESH NORMAL IS THE BASE ────────────────
  //
  // This line used to be \`normal = ccBent\` — the fragment normal REPLACED by
  // one reconstructed from the panel's bounding box. On a plain board that is
  // the same vector and nobody could tell. On a SHAKER front it is not: every
  // fragment of the leaf — frame, rebate wall, recess floor — is nearest the
  // ±z pair, so every one of them shaded +z and a 6 mm rebate was invisible
  // from every angle. The owner proved it was not the light: outlines ON drew
  // the frame (the edge pass reads geometry), outlines OFF was "mega płasko",
  // and rotating the camera changed nothing.
  //
  // So the geometry is the base and the box contributes ONE thing: the EDGE
  // ROLL, which is the difference between the rolled reconstruction and the
  // flat one. It is blended in by how far the mesh normal agrees that the box
  // reading is right — full on a face that IS the box's face, nothing at all
  // on a recess wall standing across it. Where they disagree, the geometry
  // wins, which is the whole of F4.
  //
  // Everything is done in VIEW space, where \`normal\` already is, so a board
  // whose mesh normal is its box face normal comes out with exactly the vector
  // turn 6 shipped: \`base + 1.0 * (rolled − flat)\` is \`rolled\`.
  vec3 ccBoxObj = normalize(ccFaceNormal);
  vec3 ccRolledObj = normalize(ccFaceNormal + ccRoll * ccSign * ccBevelStrength);
  vec3 ccBoxView = normalize(vCcAxX * ccBoxObj.x + vCcAxY * ccBoxObj.y + vCcAxZ * ccBoxObj.z);
  vec3 ccRolledView = normalize(vCcAxX * ccRolledObj.x + vCcAxY * ccRolledObj.y + vCcAxZ * ccRolledObj.z);
  vec3 ccBase = normalize(normal);
  float ccAgree = smoothstep(${BEVEL_BLEND.from.toFixed(2)}, ${BEVEL_BLEND.to.toFixed(2)}, dot(ccBase, ccBoxView));
  vec3 ccBent = normalize(ccBase + ccAgree * (ccRolledView - ccBoxView));

  // ─── Orange peel (turn 8, CLAUDE.md F1) ───
  // A sprayed surface is not optically flat. The gun leaves a fine cellular
  // texture a millimetre or two across, and it is most of the difference
  // between a lacquered door and a rectangle of colour — especially on white,
  // where there is nothing else for the light to catch. Done on the normals for
  // exactly the reason the edge break above is: geometry this fine would cost
  // the frame rate and could not be seen anyway.
  //
  // Only the TANGENTIAL part is used, so the face still faces the way it faces
  // and the piece keeps its silhouette. Turn 28: it perturbs WHATEVER normal
  // survived the blend above — unchanged in kind, and now correct on a rebate
  // wall as well as on a frame.
  if (ccSpray > 0.0) {
    vec3 ccSp = vCcLocal * ccSprayFreq;
    // ─── Band limit (hotfix 08.08) ───
    // A shader sin() cannot be mip-filtered, so past ~4 px per period it does
    // not render as texture — it renders as moiré. fwidth() is radians of
    // phase this fragment covers: 0.5 rad/px ≈ 12 px per period (safe),
    // 1.5 rad/px ≈ 4 px per period (gone). Between the two the peel fades,
    // so zooming out melts it to flat colour instead of into stripes.
    float ccPhasePx = max(fwidth(ccSp.x), max(fwidth(ccSp.y), fwidth(ccSp.z)));
    float ccBand = 1.0 - smoothstep(0.5, 1.5, ccPhasePx);
    vec3 ccWobObj = vec3(
      sin(ccSp.y + ccSp.z * 1.7),
      sin(ccSp.z + ccSp.x * 1.3),
      sin(ccSp.x + ccSp.y * 1.9)
    );
    vec3 ccWob = vCcAxX * ccWobObj.x + vCcAxY * ccWobObj.y + vCcAxZ * ccWobObj.z;
    ccWob -= ccBent * dot(ccWob, ccBent);
    ccBent = normalize(ccBent + ccWob * (ccSpray * ccBand));
  }
  normal = ccBent;
  nonPerturbedNormal = ccBent;
}
`;

const FRAG_AO = /* glsl */`
{
  vec3 ccDist, ccFace;
  ccEdge(ccDist, ccFace);
  vec3 ccNear = (1.0 - ccFace) * (1.0 - smoothstep(0.0, max(ccAoRadius, 1e-6), ccDist));
  float ccEdgeAmount = clamp(max(ccNear.x, max(ccNear.y, ccNear.z)), 0.0, 1.0);
  diffuseColor.rgb *= 1.0 - ccAo * ccEdgeAmount;
}
`;

/**
 * The per-material state the hook writes into and the render pass reads back
 * out of. Created once per panel and kept in `material.userData.ccBevel`, so
 * changing a panel's size or turning the AO up for a render is a uniform write
 * rather than a shader recompile.
 */
export function createBevelState() {
  return {
    half: new THREE.Vector3(0.5, 0.5, 0.5),
    bevel: 0.0008,
    strength: 1,
    aoRadius: 0.007,
    ao: 0.16,
    // 0 = board. A sprayed piece turns this up (3d/materials.js `sprayed`).
    spray: 0,
    sprayFreq: 3141,
    uniforms: null,
  };
}

/** Push the current state values into the live uniforms, if they exist yet. */
export function syncBevelState(state) {
  const u = state?.uniforms;
  if (!u) return;
  u.ccHalf.value.copy(state.half);
  u.ccBevel.value = state.bevel;
  u.ccBevelStrength.value = state.strength;
  u.ccAoRadius.value = state.aoRadius;
  u.ccAo.value = state.ao;
  u.ccSpray.value = state.spray;
  u.ccSprayFreq.value = state.sprayFreq;
}

/**
 * The `onBeforeCompile` for one material, bound to its state.
 *
 * Returned from a factory rather than written as one shared function because
 * the state has to be reachable from inside it; the PROGRAM is still shared,
 * because `customProgramCacheKey` is a constant.
 */
export function bevelHook(state) {
  const onBeforeCompile = (shader, renderer) => {
    // A material that somehow reaches here twice must not end up with two sets
    // of injected code.
    if (shader.vertexShader.includes('vCcLocal')) return;

    shader.uniforms.ccHalf = { value: state.half.clone() };
    shader.uniforms.ccBevel = { value: state.bevel };
    shader.uniforms.ccBevelStrength = { value: state.strength };
    shader.uniforms.ccAoRadius = { value: state.aoRadius };
    shader.uniforms.ccAo = { value: state.ao };
    shader.uniforms.ccSpray = { value: state.spray };
    shader.uniforms.ccSprayFreq = { value: state.sprayFreq };
    state.uniforms = shader.uniforms;
    state.renderer = renderer || null;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_COMMON}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_COMMON}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAG_AO}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_NORMAL}`);
  };
  return { onBeforeCompile, customProgramCacheKey: () => CACHE_KEY };
}

/**
 * Every bevelled material in a scene. Used by the render pass, which turns the
 * cavity darkening up for the still and puts it back afterwards — the working
 * view keeps the cheap setting (CLAUDE.md: heavy things only in the render).
 */
export function forEachBevelled(root, fn) {
  root.traverse((object) => {
    const material = object.material;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      if (m?.userData?.ccBevel) fn(m.userData.ccBevel, m);
    }
  });
}
