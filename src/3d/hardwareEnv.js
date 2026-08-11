import * as THREE from 'three';

// ─── THE HARDWARE GETS SOMETHING TO REFLECT (turn 24, CLAUDE.md F12) ────────
//
// The owner compared the STEP-grade hinge model to Blum's catalogue photo:
// still far. The diagnosis is one sentence — **nickel without an environment is
// grey paint.** A metal is not a colour; it is a mirror, and a mirror with
// nothing in front of it renders as a flat swatch whatever its roughness and
// metalness say.
//
// ─── AND THE NO-HDRI PHILOSOPHY STAYS, FOR THE LACQUERS ────────────────────
//
// It exists FOR THEM, and F12.2 is absolute about it: boards, fronts and
// lacquers are UNTOUCHED, `scene.environment` stays null, and the map attaches
// PER MATERIAL and never to the scene. Two-pack lacquer on an MDF door is lit
// by the studio rig and by nothing else, which is a decision this app made in
// turn 6 after measuring, and turn 24 does not reopen it. What the hardware
// gets is its own probe, on its own materials, and nothing else in the room can
// see it.
//
// ─── NO NEW DEPENDENCY, NO NETWORK FETCH ───────────────────────────────────
//
// "A small neutral environment map (a procedural studio gradient or a tiny
// embedded HDR — no new runtime dependency, no network fetch)." It is the
// gradient: a sky-to-floor ramp with three soft boxes in it, built here from
// THREE primitives and run through `PMREMGenerator`, which is the same
// machinery `RoomEnvironment` already stands on (3d/Scene.jsx) and ships inside
// the three package. 64 px: this is a blurred probe of a lightbox and there is
// no detail in it to lose.

/** One probe per renderer, however many pieces of ironmongery wear it. */
let cache = null;
/** The materials that have asked for it, so a late build still reaches them. */
const waiting = new Set();

const SKY = new THREE.Color('#e9edf2');       // the light above
const GROUND = new THREE.Color('#3a3d42');    // …and the dark it stands on

/**
 * The studio, as geometry.
 *
 * A back-side sphere carrying a vertical ramp — which is what gives a curved
 * metal its long soft gradient — with three brighter panels in it: a key above
 * and in front, a fill to one side, and a rim behind. A cup hinge is a small
 * curved object and it is those three highlights travelling across it that make
 * it read as plated rather than painted.
 */
function studio() {
  const scene = new THREE.Scene();

  const ramp = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      sky: { value: SKY },
      ground: { value: GROUND },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 sky;
      uniform vec3 ground;
      varying vec3 vDir;
      void main() {
        // A soft horizon rather than a hard line: a lightbox has a curtain in
        // it, not a join.
        float t = smoothstep(-0.35, 0.65, vDir.y);
        gl_FragColor = vec4(mix(ground, sky, t), 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), ramp));

  // The three soft boxes. Plain unlit white at different strengths — a PMREM is
  // taken of what the scene LOOKS like, so an emissive is unnecessary and a
  // basic material is one less thing for the filter to resolve.
  const box = (intensity, position, rotation, size) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity) }),
    );
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    return mesh;
  };
  scene.add(box(3.2, [0, 6, 3], [-Math.PI / 2.2, 0, 0], [8, 6]));    // key
  scene.add(box(1.1, [-6, 1.5, 2], [0, Math.PI / 2.4, 0], [6, 5]));  // fill
  scene.add(box(1.6, [2, 3, -6], [0, Math.PI, 0], [6, 4]));          // rim
  return scene;
}

/**
 * The probe, built once per renderer.
 *
 * Guarded end to end: a headless test importing this file has no WebGL context
 * to build a cube map with, and the honest answer there is `null` — the caller
 * paints the finish and leaves `envMap` alone, which is exactly what the app
 * did before this turn.
 *
 * @param {THREE.WebGLRenderer} gl
 * @returns {THREE.Texture|null}
 */
export function buildHardwareEnv(gl) {
  if (cache?.texture) return cache.texture;
  if (!gl) return null;
  try {
    const pmrem = new THREE.PMREMGenerator(gl);
    const scene = studio();
    const target = pmrem.fromScene(scene, 0.04, 0.1, 100, { size: 64 });
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      for (const one of Array.isArray(m) ? m : [m]) one?.dispose?.();
    });
    pmrem.dispose();
    cache = { texture: target.texture, target };
    // Every material that asked before the probe existed gets it now. Without
    // this the FIRST hinge in a session would be the one piece of ironmongery
    // in the room with nothing to reflect.
    for (const material of waiting) {
      material.envMap = cache.texture;
      material.needsUpdate = true;
    }
    waiting.clear();
    return cache.texture;
  } catch {
    return null;
  }
}

/** The probe, or null where none has been built. */
export function hardwareEnvMap() {
  return cache?.texture || null;
}

/**
 * Give this material the hardware probe — now, or the moment it exists.
 *
 * @param {THREE.Material} material
 * @param {number} intensity  `envMapIntensity` from the finish's own block
 * @returns {boolean} whether the map is on it already
 */
export function attachHardwareEnv(material, intensity = 1) {
  if (!material) return false;
  // eslint-disable-next-line no-param-reassign
  material.envMapIntensity = Number.isFinite(Number(intensity)) ? Number(intensity) : 1;
  const map = hardwareEnvMap();
  if (!map) { waiting.add(material); return false; }
  // eslint-disable-next-line no-param-reassign
  material.envMap = map;
  // eslint-disable-next-line no-param-reassign
  material.needsUpdate = true;
  return true;
}

/** For the tests, and for a renderer that has gone away with its context. */
export function clearHardwareEnv() {
  cache?.target?.dispose?.();
  cache = null;
  waiting.clear();
}
