// ─── ONE DECODE PER FILE (turn 19, CLAUDE.md F1.6) ──────────────────────────
//
// Turn 18 wrote this machinery for the MOVENTO runners and turn 19 needs the
// same thing again for the CLIP top hinges: load a GLB once however many
// pieces wear it, clone it per position, and treat a file that never arrives as
// the OTHER path rather than as an error.
//
// So it is extracted, once, and both hardware loaders stand on it —
// 3d/runnerModels.js and 3d/hingeModels.js are each a dozen lines of "where
// does this thing's datum go" over the top of it. That is the whole point of
// the extraction: a third piece of Blum ironmongery next turn is a datum, not a
// second copy of a cache with a listener set in it.
//
// The behaviour is turn 18's exactly, because turn 18's is right:
//
//   • ONE decode per url, kept in a Map with a listener set, so a clone taken
//     before the file lands can be re-taken when it does;
//   • `failed` is not an error path, it is the other path (CLAUDE.md's mock
//     mode / graceful degradation rule): a missing file, a bucket that has
//     moved, a machine with no network and mock mode all land there, and the
//     caller draws the procedural body it has drawn since turn 7 in exactly the
//     same place. Never a hole, never a blocked scene;
//   • the whole load is guarded, because a GLTFLoader constructed in a headless
//     environment (a node test importing this file) has no XMLHttpRequest to
//     reach for and the scene must degrade rather than throw on the way up.
//
// ZERO NEW DEPENDENCIES: `GLTFLoader` ships inside the three package, which is
// the precedent `RoomEnvironment` and `mergeGeometries` already stand on.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** One decoded model per file, however many pieces wear it. */
const sources = new Map();

let loader = null;
const getLoader = () => {
  if (!loader) loader = new GLTFLoader();
  return loader;
};

/**
 * The shared model for one file.
 *
 * @returns {{scene:THREE.Object3D|null, size:THREE.Vector3|null,
 *            centre:THREE.Vector3|null, min:THREE.Vector3|null,
 *            loaded:boolean, failed:boolean, listeners:Set}}
 */
export function glbSource(url) {
  if (!url) return null;
  const known = sources.get(url);
  if (known) return known;
  const entry = {
    scene: null, size: null, centre: null, min: null, loaded: false, failed: false, listeners: new Set(),
  };
  sources.set(url, entry);
  const notify = () => { for (const cb of entry.listeners) cb(); };

  try {
    getLoader().load(
      url,
      (gltf) => {
        const scene = gltf?.scene || null;
        if (!scene) { entry.failed = true; notify(); return; }
        // Measure it ONCE. The file's own origin is somebody else's decision —
        // the LISP owns the position and the model is a costume on the screws —
        // so what is kept is the BOX, and the caller aligns that box to the
        // drilled point.
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
export function onGlbLoad(url, callback) {
  const entry = glbSource(url);
  if (!entry) { callback(); return () => {}; }
  if (entry.loaded || entry.failed) { callback(); return () => {}; }
  entry.listeners.add(callback);
  return () => entry.listeners.delete(callback);
}

/** Did this file fail to arrive? Then the caller draws the procedural body. */
export function glbFailed(url) {
  return Boolean(url && sources.get(url)?.failed);
}

/** For tests, and for a workshop switching bucket. */
export function clearGlbSources() {
  sources.clear();
}

/**
 * What this session has actually decoded — asked, arrived, given up.
 *
 * ─── Turn 22 (CLAUDE.md F3) ─────────────────────────────────────────────────
 * "The owner has diagnosed two turns from his console. Give him the line in the
 * app instead." This is the reading end of that line, and it FETCHES NOTHING:
 * it is the cache above, counted. A url that has never been asked for is not in
 * it, which is exactly right — a model nobody has needed yet is not a failure.
 *
 * @param {function} [filter]  (url) => boolean, for one family's own folder
 */
export function glbStats(filter = null) {
  const out = {
    asked: 0, loaded: 0, failed: 0, pending: 0, failures: [],
  };
  for (const [url, entry] of sources) {
    if (filter && !filter(url)) continue;
    out.asked += 1;
    if (entry.failed) { out.failed += 1; out.failures.push(url); } else if (entry.loaded) out.loaded += 1;
    else out.pending += 1;
  }
  return out;
}

/**
 * A clone of the model, brought to the origin of the group the caller places.
 *
 * The file's own bounding-box corner is moved to zero and then by the
 * workshop's measured offset, in the piece's own frame. That is the ONE place a
 * measured correction goes — which is what stops the offset being scattered
 * through the view code.
 *
 * ─── TURN 30 (CLAUDE.md F1): OR BY THE FILE'S OWN DATUM, ABSOLUTELY ─────────
 *
 * `origin` is MIN-RELATIVE and that is a measurement of ONE file: it says how
 * far that file's bounding-box corner must move, so a second export of the same
 * part with more metal around it lands somewhere else. Where a FAMILY of files
 * shares one authoring frame — which the Blum hinge bucket does — the honest
 * placement is the datum itself: `datum` puts the named point of the FILE's own
 * coordinates on the group's origin and never asks the bounding box anything.
 *
 * The two are the same transform whenever `origin = min − datum`, which is how
 * every `modelOrigin` in profile.js was derived; `datum` is what keeps that true
 * for the next file as well as for the one that was measured.
 *
 * @param {string} url
 * @param {object} args
 *   origin   { x, y, z } in millimetres, already converted by the caller's `mm`
 *   datum    { x, y, z } in the same units — the FILE's own point to stand on
 *            the origin. Takes precedence over `origin`, and the bounding box
 *            plays no part in it.
 *   mirror   flip across x — for a pair file used for the other hand
 * @returns {THREE.Object3D|null} null while the file is still on its way
 */
export function glbClone(url, { origin = null, datum = null, mirror = false } = {}) {
  const entry = glbSource(url);
  if (!entry?.loaded || !entry.scene || entry.failed) return null;
  const clone = entry.scene.clone(true);
  if (datum) {
    clone.position.set(-(datum.x || 0), -(datum.y || 0), -(datum.z || 0));
  } else {
    clone.position.set(-entry.min.x, -entry.min.y, -entry.min.z);
    if (origin) {
      clone.position.x += origin.x || 0;
      clone.position.y += origin.y || 0;
      clone.position.z += origin.z || 0;
    }
  }
  const group = new THREE.Group();
  group.add(clone);
  if (mirror) group.scale.x = -1;
  // Hardware is IN the picture but must not frame it — a render that zoomed
  // out to fit a hinge would be a render of a hinge.
  group.userData.ccNoBounds = true;
  return group;
}

/**
 * The longest axis of a decoded model, in millimetres.
 *
 * Both callers ask the same question of it — "is this the piece it claims to
 * be" — and both answer it against a number in profile.js rather than against
 * one written into the view.
 */
export function glbLongestMm(entry, mmPerUnit) {
  if (!entry?.size) return null;
  return Math.max(entry.size.x, entry.size.y, entry.size.z) / mmPerUnit;
}
