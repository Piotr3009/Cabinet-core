// ─── THE RUNNER MODELS (turn 18, CLAUDE.md F6.1/F6.2/F6.6) ──────────────────
//
// Everything procedural in this app is procedural on purpose: a hinge is a ⌀35
// cup and an arm because the numbers are `profile.hardware` and a workshop on a
// different system edits a block of millimetres. A RUNNER is the exception the
// owner asked for — he has the manufacturer's own MOVENTO 760H geometry, all 40
// files of it, in Supabase Storage, and a Blum runner drawn from three boxes is
// a Blum runner nobody recognises.
//
// So this is the loader, and it is the DECOR TEXTURE PATTERN (3d/materials.js)
// with a mesh where the image goes:
//
//   • ONE decode per file, however many drawers wear it — `sources`, keyed by
//     url, with a listener set so a clone taken before the file arrives can be
//     re-taken when it does;
//   • a CLONE per row, because two runners in one cabinet are two objects at
//     two heights and a shared object cannot be in two places;
//   • `failed` is not an error path, it is the OTHER path (F6.6): a missing
//     file, a bucket that has moved, a machine with no network or mock mode all
//     land here, and the caller draws the plain profile it has drawn since turn
//     7 in exactly the same place. Never a hole, never a blocked scene.
//
// ZERO NEW DEPENDENCIES (CLAUDE.md rule): `GLTFLoader` ships inside the three
// package, which is the same precedent `RoomEnvironment` (3d/Scene.jsx) and
// `mergeGeometries` (3d/panelSolid.js) already stand on.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mm } from './constants.js';

/** One decoded model per file, however many drawers run on it. */
const sources = new Map();

let loader = null;
const getLoader = () => {
  if (!loader) loader = new GLTFLoader();
  return loader;
};

/**
 * The shared model for one runner file.
 *
 * @returns {{scene:THREE.Object3D|null, size:THREE.Vector3|null, loaded:boolean,
 *            failed:boolean, listeners:Set}}
 */
export function runnerSource(url) {
  if (!url) return null;
  const known = sources.get(url);
  if (known) return known;
  const entry = {
    scene: null, size: null, centre: null, loaded: false, failed: false, listeners: new Set(),
  };
  sources.set(url, entry);
  const notify = () => { for (const cb of entry.listeners) cb(); };

  // Guard the whole call: a GLTFLoader constructed in a headless environment
  // (a node test importing this file) has no XMLHttpRequest to reach for, and
  // the scene must degrade rather than throw on the way up.
  try {
    getLoader().load(
      url,
      (gltf) => {
        const scene = gltf?.scene || null;
        if (!scene) { entry.failed = true; notify(); return; }
        // Measure it ONCE. The file's own origin is somebody else's decision —
        // F6.2 is explicit that the LISP owns the position and the model is a
        // costume on the screws — so what is kept is the box, and the caller
        // aligns that box to the drilled row.
        const box = new THREE.Box3().setFromObject(scene);
        entry.scene = scene;
        entry.size = box.getSize(new THREE.Vector3());
        entry.centre = box.getCenter(new THREE.Vector3());
        entry.min = box.min.clone();
        entry.loaded = true;
        notify();
      },
      undefined,
      () => { entry.failed = true; notify(); },
    );
  } catch {
    entry.failed = true;
  }
  return entry;
}

/** Tell me when this model is ready — or has given up. */
export function onRunnerLoad(url, callback) {
  const entry = runnerSource(url);
  if (!entry) { callback(); return () => {}; }
  if (entry.loaded || entry.failed) { callback(); return () => {}; }
  entry.listeners.add(callback);
  return () => entry.listeners.delete(callback);
}

/** Did this file fail to arrive? Then the caller draws the plain profile. */
export function runnerFailed(url) {
  return Boolean(url && sources.get(url)?.failed);
}

/** For tests and for a workshop switching bucket. */
export function clearRunnerModels() {
  sources.clear();
}

/**
 * Is this file the runner it claims to be?
 *
 * The owner's files are true millimetres — validated at conversion, where an
 * NL450 measures 450.5 long — so a model whose longest axis is nowhere near its
 * nominal length is the wrong file, and drawing it would put a 250 mm runner in
 * a 450 mm drawer with nothing said. It falls back to the profile instead.
 */
export function runnerModelFits(entry, nl, profile) {
  if (!entry?.size) return false;
  const tol = profile.hardware.runner.movento.lengthTolerance;
  const longest = Math.max(entry.size.x, entry.size.y, entry.size.z) / mm(1);
  return Math.abs(longest - Number(nl)) <= tol;
}

/**
 * A clone of the model, placed so that the runner's own datum sits at the
 * origin of the group the caller puts at the drilled row.
 *
 * THE DATUM. A side-mounted runner is fixed by a row of screws along the panel
 * it is on, and the engine's `runnerY` IS that row (engine/hardware3d.js reads
 * `drillSummary.runner_rows_carcass_y`). So the model is moved so that its own
 * back-bottom-front corner lands there, and then by `movento.modelOrigin`,
 * which is the one place a measured correction goes (F6.2).
 *
 * @param {string} url
 * @param {object} args
 *   mirror   true when this file is a PAIR file being used for the other hand
 *            — the manifest names L and R separately, so this is only ever set
 *            where the catalogue gave one file for both
 *   profile
 * @returns {THREE.Object3D|null} null while the file is still on its way
 */
export function runnerModel(url, { mirror = false, profile }) {
  const entry = runnerSource(url);
  if (!entry?.loaded || !entry.scene || entry.failed) return null;
  const O = profile.hardware.runner.movento.modelOrigin;
  const clone = entry.scene.clone(true);
  // The file's own bounding box, brought to the group's origin…
  clone.position.set(-entry.min.x, -entry.min.y, -entry.min.z);
  // …and then the workshop's measured offset, in the runner's own frame.
  clone.position.x += mm(O.x);
  clone.position.y += mm(O.y);
  clone.position.z += mm(O.z);
  const group = new THREE.Group();
  group.add(clone);
  if (mirror) group.scale.x = -1;
  group.userData.ccNoBounds = true;
  return group;
}
