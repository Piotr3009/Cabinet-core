// ─── THE HINGE MODELS (turn 19, CLAUDE.md F1.6) ─────────────────────────────
//
// "GLB on the drilled points. Hinge + plate models from
// hardware/hinges/blum/cliptop/ (bucket), mounted at the engine's own hinge
// centres (the LISP columns) — the runner pipeline exactly."
//
// So it IS the runner pipeline: the shared loader in 3d/glbSource.js does the
// decoding, the caching and the graceful degradation, and this file says the
// two things that are a HINGE's own — where its datum is, and how big a CLIP
// top can be before the file is plainly the wrong one.
//
// THE MODEL IS A COSTUME ON THE SCREWS. Every position is the engine's:
// `hardwareInstances` reads `drillSummary.hinge_centers`, the rows the machine
// actually drills, and the model is moved to them. Nothing about a downloaded
// file is allowed to move a hole — which is the same sentence turn 18 wrote
// about the runners and the reason this turn's CNC export has zero deltas.
//
// A file that is missing, a bucket that is down, mock mode: all three land on
// `null` here, and the caller draws the procedural cup and boss it has drawn
// since turn 12. Never a hole, never a blocked scene.

import { glbClone, glbFailed, glbLongestMm, glbSource, onGlbLoad } from './glbSource.js';
import { mm } from './constants.js';

/** The shared decode for one hinge or plate file. */
export function hingeSource(url) {
  return glbSource(url);
}

/** Tell me when this model is ready — or has given up. */
export function onHingeLoad(url, callback) {
  return onGlbLoad(url, callback);
}

/** Did this file fail to arrive? Then the caller draws the procedural body. */
export function hingeModelFailed(url) {
  return glbFailed(url);
}

/**
 * Is this file the hinge it claims to be?
 *
 * A CLIP top is a small object — a cup, an arm and a plate, none of it much
 * over 100 mm. A file whose longest axis is bigger than the profile's limit is
 * something else entirely (a whole cabinet, a runner, a mis-named export), and
 * drawing it would put a 400 mm object where a hinge goes with nothing said.
 * The view falls back to the procedural body instead.
 */
export function hingeModelFits(entry, profile) {
  const longest = glbLongestMm(entry, mm(1));
  if (longest == null) return false;
  return longest <= profile.hardware.hinge.cliptop.maxModelLengthMm;
}

/**
 * A clone of the hinge model, placed so that the piece's own datum sits at the
 * origin of the group the caller puts on the drilled cup.
 *
 * `plate` picks the other measured offset: a mounting plate is screwed to the
 * carcass side and a hinge body is clipped into the door, so they are two
 * datums and two corrections. Both are zero until somebody has looked at a real
 * model beside a real cabinet, which is what profile.js says in as many words.
 */
export function hingeModel(url, { profile, plate = false, mirror = false }) {
  const C = profile.hardware.hinge.cliptop;
  const O = plate ? C.plateOrigin : C.modelOrigin;
  return glbClone(url, {
    origin: { x: mm(O.x), y: mm(O.y), z: mm(O.z) },
    mirror,
  });
}
