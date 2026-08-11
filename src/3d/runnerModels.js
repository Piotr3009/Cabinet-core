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

import {
  clearGlbSources, glbClone, glbFailed, glbLongestMm, glbSource, onGlbLoad,
} from './glbSource.js';
import { applyHardwareFinish, hardwareFinishSpec } from './hardwareFinish.js';
import { mm } from './constants.js';

// ─── TURN 19 (CLAUDE.md F1.6): THE CACHE MOVED, NOTHING ELSE DID ────────────
//
// The hinges need exactly this — one decode per file, a clone per position, and
// `failed` as the other path — so the machinery is 3d/glbSource.js now and both
// hardware loaders stand on it. Every export below keeps its name and its
// contract; what is left here is the two things that are a RUNNER's own, which
// are where its datum sits and how long a file has to be to be the runner it
// says it is.

/**
 * The shared model for one runner file.
 *
 * @returns {{scene:THREE.Object3D|null, size:THREE.Vector3|null, loaded:boolean,
 *            failed:boolean, listeners:Set}}
 */
export function runnerSource(url) {
  return glbSource(url);
}

/** Tell me when this model is ready — or has given up. */
export function onRunnerLoad(url, callback) {
  return onGlbLoad(url, callback);
}

/** Did this file fail to arrive? Then the caller draws the plain profile. */
export function runnerFailed(url) {
  return glbFailed(url);
}

/** For tests and for a workshop switching bucket. */
export function clearRunnerModels() {
  // Deliberately NOT a partial clear: the cache is keyed by url and the hinges
  // and the runners cannot collide in it, so "forget the models" means all of
  // them — which is what a test that switches bucket actually wants.
  clearGlbSources();
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
  const longest = glbLongestMm(entry, mm(1));
  if (longest == null) return false;
  return Math.abs(longest - Number(nl)) <= profile.hardware.runner.movento.lengthTolerance;
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
export function runnerModel(url, { mirror = false, profile, finish = null }) {
  const O = profile.hardware.runner.movento.modelOrigin;
  // The file's own bounding box is brought to the group's origin and then moved
  // by the workshop's measured offset, in the runner's own frame — the shared
  // loader does both, because it is the same two lines for every piece of
  // ironmongery this app will ever draw.
  const clone = glbClone(url, { origin: { x: mm(O.x), y: mm(O.y), z: mm(O.z) }, mirror });
  // Turn 23 (CLAUDE.md F4.3): the SAME override function the hinges use — one
  // helper, two families. The MOVENTO has one neutral metal until the owner
  // supplies orion grey and silk white; `3d/hardwareFinish.js` falls through to
  // it without a branch here.
  if (clone) {
    const spec = hardwareFinishSpec(profile, 'runner', finish);
    const applied = applyHardwareFinish(clone, spec);
    clone.userData.ccFinish = spec?.id || null;
    clone.userData.ccFinishApplied = applied;
    clone.userData.ccFinishMetal = spec?.metal || null;
  }
  return clone;
}
