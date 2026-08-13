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

import * as THREE from 'three';
import { glbClone, glbFailed, glbLongestMm, glbSource, onGlbLoad } from './glbSource.js';
import { applyHardwareFinish, hardwareFinishSpec } from './hardwareFinish.js';
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
export function hingeModel(url, {
  profile, plate = false, mirror = false, finish = null,
}) {
  const C = profile.hardware.hinge.cliptop;
  const O = plate ? C.plateOrigin : C.modelOrigin;
  const clone = glbClone(url, {
    origin: { x: mm(O.x), y: mm(O.y), z: mm(O.z) },
    mirror,
  });
  // ─── TURN 23 (CLAUDE.md F4.1): THE FINISH, ON THE CLONE ──────────────────
  //
  // Owner: "the model renders WHITE — raw file material." Here, on the clone,
  // and nowhere else: the cached SOURCE is shared by every hinge in the project
  // (3d/glbSource.js) and painting it would repaint the lot. What is applied is
  // recorded on the group's `userData` so the walk can assert the numbers off
  // the scene rather than off a pixel (R4) — and so `hardwareRegistry.js` can
  // publish which finish each mounted piece is actually wearing.
  if (clone) {
    const spec = hardwareFinishSpec(profile, 'hinge', finish);
    const applied = applyHardwareFinish(clone, spec);
    // Turn 24 (CLAUDE.md F1.5): which HALF of the ironmongery this clone is, so
    // a walk traversing the scene can tell a plate from an arm without guessing
    // from a position. The plate is the one piece that never moves at all.
    clone.userData.ccHingePlate = Boolean(plate);
    clone.userData.ccFinish = spec?.id || null;
    clone.userData.ccFinishApplied = applied;
    clone.userData.ccFinishMetal = spec?.metal || null;
  }
  return clone;
}

// ─── THE HINGE BREAKS IN THE MIDDLE (turn 24, CLAUDE.md F1) ─────────────────
//
// Owner, of turn 23's rigid body: it must BREAK — cup side with the door, body
// side with the plate — or, failing that, disappear when open.
//
// A GLB is a rigid cast, so the file cannot answer this and a better file would
// not either. What answers it is a RIG: the same clone, cut into two members by
// NODE NAME, each parented where the ironmongery is actually screwed.
//
//   MEMBER A  the cup, its flange, the clip cap and the link cover. Clipped
//             into the DOOR, so it rides the leaf exactly as turn 23 left it
//             — not one millimetre of that pose moves.
//   MEMBER B  the arm and the rear body with the lever. Screwed to the plate
//             on the CARCASS, and it FOLDS: one rotation about a horizontal
//             axis at the arm's front pivot, by the door's own opening angle.
//
// ─── IT IS ONE JOINT, AND IT IS AN APPROXIMATION ───────────────────────────
//
// A real CLIP top is a SEVEN-LINK cross: four bars and three couplers, whose
// instantaneous centre travels as the door opens, which is what lets the cup
// clear the carcass on a 110° swing. NOTHING HERE ATTEMPTS THAT. CLAUDE.md
// F1.2 asks for a one-joint approximation, names it as one, and forbids
// inventing the four-bar geometry Blum has not published here. So: one hinge,
// one angle, and this paragraph.

/** The member a node belongs to: 'A' (door) or 'B' (carcass). */
export function memberOfNode(name, rig, zMaxMm = null) {
  const said = String(name || '');
  if ((rig?.memberA || []).includes(said)) return 'A';
  if ((rig?.memberB || []).includes(said)) return 'B';
  // ─── THE FALLBACK (F1.3) ───
  // "unknown node names in future files fall back to the z-threshold
  // `z > 30 ⇒ member A`." Measured on the node's own far edge, in FILE
  // millimetres: the cup group lives entirely in front of the threshold and
  // everything behind it is the arm. It is a fallback and not the rule —
  // `bau0015088251` spans −28 … 46.2 and a threshold asked about IT would cut
  // the arm in half, which is exactly why the names come first.
  if (!Number.isFinite(Number(zMaxMm))) return 'B';
  return Number(zMaxMm) > Number(rig?.zThresholdMm ?? 30) ? 'A' : 'B';
}

/**
 * How far member B has turned, in radians, for a door open by `deg`.
 *
 * The identity that makes the fold read: the arm follows the cup by the SAME
 * angle the leaf has swung through, so the two halves never scissor apart. A
 * door that is shut folds by nothing, which is what keeps a closed cabinet
 * byte-for-byte the picture turn 23 drew.
 */
export function memberBAngle(openDeg) {
  const deg = Number(openDeg);
  if (!Number.isFinite(deg)) return 0;
  return (deg * Math.PI) / 180;
}

/**
 * Is the model HIDDEN at this angle instead of folded? (F1.4)
 *
 * The owner's explicit fallback, and it ships as a flag rather than as a
 * decision: with `rig.enabled` false an opening door hides the body beyond
 * `hideBeyondDeg` and shows the plate only. He decides after his eye test.
 */
export function rigHidesBody(profile, openDeg) {
  const rig = profile?.hardware?.hinge?.cliptop?.rig || {};
  if (rig.enabled) return false;
  return Math.abs(Number(openDeg) || 0) > Number(rig.hideBeyondDeg ?? 15);
}

/**
 * Cut one clone into its two members.
 *
 * The clone arrives from `hingeModel` already posed — its cup centre on the
 * drilled point, its flange on the door's back face, mirrored for the hand if
 * the door needs it. Both members keep that pose: what this does is DELETE the
 * other member's meshes from each of two clones, so member A is the file's own
 * cup where the file's own cup is and member B is the file's own arm where the
 * file's own arm is. Nothing is moved and nothing is re-datumed.
 *
 * @param {THREE.Object3D} group   a `hingeModel()` clone — never a cached source
 * @param {object} profile
 * @param {'A'|'B'} keep
 * @returns {THREE.Object3D|null} the same group with the other member removed,
 *   or null when it holds nothing at all
 */
export function keepMember(group, profile, keep) {
  const rig = profile?.hardware?.hinge?.cliptop?.rig || {};
  if (!group) return null;
  const drop = [];
  const kept = [];
  const box = new THREE.Box3();
  group.traverse((node) => {
    if (!node.isMesh) return;
    box.setFromObject(node);
    // The node's own far edge in FILE millimetres, for the threshold fallback.
    // `mm(1)` is what `3d/glbSource.js` measures with, so the two agree.
    const zMax = box.max.z / mm(1);
    // A converter puts the name on the NODE, the MESH or both; the walk up is
    // one line and it is what makes a real Blum export and this repository's
    // own showroom answer the same question.
    const name = node.name || node.parent?.name || '';
    const member = memberOfNode(name, rig, zMax);
    if (member === keep) kept.push(name);
    else drop.push(node);
  });
  for (const node of drop) node.parent?.remove(node);
  if (!kept.length) return null;
  // eslint-disable-next-line no-param-reassign
  group.userData.ccHingeMember = keep;
  // eslint-disable-next-line no-param-reassign
  group.userData.ccHingeMemberNodes = kept;
  return group;
}

/**
 * WHERE THE JOINT IS, in the placed clone's own frame, in millimetres.
 *
 * The two profile numbers are in FILE coordinates, because that is the frame a
 * mesh table is read in and the frame the first person to correct them will be
 * looking at. `glbClone` places the file by `−min + modelOrigin`, so the axis
 * goes through exactly the same transform — which is the whole reason this is
 * a derivation and not a third measured number that could disagree with the
 * other two.
 *
 * On the measured 71B3550 (min −26.5, −28.5, −29.48; origin −18.75, −28.5,
 * −64.78; axis x −7.75, z 33.5) it comes to **(0, 0, −1.8) mm** — on the cup's
 * own centre line, 1.8 mm behind the door's back face, which is where the arm
 * of a CLIP top folds.
 *
 * @param {object} args
 *   min      { x, y, z } — the FILE's bounding-box minimum, in millimetres
 *   profile
 * @returns {{x:number, y:number, z:number}|null}
 */
export function foldPivotMm({ min, profile }) {
  const C = profile?.hardware?.hinge?.cliptop;
  const axis = C?.rig?.axis;
  const O = C?.modelOrigin;
  if (!axis || !O || !min) return null;
  const at = (a, m, o) => Number(a) - Number(m) + Number(o);
  return {
    x: at(axis.x ?? 0, min.x ?? 0, O.x ?? 0),
    // The axis is HORIZONTAL and parallel to the hinge row (F1.2), so it has
    // no height of its own: it runs through the model at the row's own y.
    y: 0,
    z: at(axis.z ?? 0, min.z ?? 0, O.z ?? 0),
  };
}

/**
 * The two members of one hinge, each ready to be parented where it belongs.
 *
 * Member B comes back WRAPPED: an outer group the caller places on the drilled
 * point exactly as it places member A, holding a joint group standing at the
 * fold pivot. `foldMemberB` turns that joint and nothing else — so the pose,
 * the mirror and the finish are all still the ones `hingeModel` produced, and
 * a shut door is byte-for-byte the picture turn 23 drew.
 *
 *     outer  ── placed on the drilled cup point
 *       └ joint  ── at the fold pivot; THIS is what rotates
 *           └ clone  ── pushed back by the same pivot, so angle 0 is identity
 *
 * @returns {{cup:THREE.Object3D|null, body:THREE.Object3D|null}}
 *   `cup` is member A, for the door's own group; `body` is member B, for the
 *   carcass beside the plate. Either may be null — a file with no arm in it is
 *   drawn as far as it goes rather than not at all.
 */
export function hingeMembers(url, args) {
  const profile = args?.profile;
  const cup = keepMember(hingeModel(url, args), profile, 'A');
  const inner = keepMember(hingeModel(url, args), profile, 'B');

  const entry = glbSource(url);
  const min = entry?.min
    ? { x: entry.min.x / mm(1), y: entry.min.y / mm(1), z: entry.min.z / mm(1) }
    : null;
  const pivot = foldPivotMm({ min, profile });
  // A mirrored clone renders its x negated (the group carries `scale.x = −1`),
  // so the pivot's rendered position follows it and the two hands fold about
  // the same physical point.
  const s = args?.mirror ? -1 : 1;
  // ─── TURN 29 (CLAUDE.md F5): THE CUP KNOWS WHERE THE KNUCKLE IS TOO ──────
  //
  // The pin is one point of one hinge and both members meet at it. Member B
  // has carried it since turn 24 because it is what B turns about; member A
  // carries it now because the PROOF is that the two coincide, and a walk that
  // could only ask one of them would be measuring against a number it had
  // worked out itself. `ccHingePivotMm` is in the placed clone's own
  // millimetres and `ccHingeMirror` is the hand, so a reader can put the point
  // into the room without knowing anything about the file.
  if (cup) {
    cup.userData.ccHingePivotMm = pivot;
    cup.userData.ccHingeMirror = s;
  }
  if (!inner) return { cup, body: null };
  if (!pivot) return { cup, body: inner };

  const joint = new THREE.Group();
  joint.position.set(mm(pivot.x) * s, 0, mm(pivot.z));
  inner.position.set(-mm(pivot.x) * s, 0, -mm(pivot.z));
  joint.add(inner);

  const outer = new THREE.Group();
  outer.add(joint);
  // ONE object per member carries the tag. `keepMember` put it on the clone;
  // the wrapper is what the caller places and what folds, so it takes it and
  // the clone gives it up — otherwise a walk traversing the scene for "member
  // B" finds each arm twice and half of them appear not to move.
  delete inner.userData.ccHingeMember;
  outer.userData.ccNoBounds = true;
  outer.userData.ccHingeMember = 'B';
  outer.userData.ccHingeMemberNodes = inner.userData.ccHingeMemberNodes;
  outer.userData.ccFinish = inner.userData.ccFinish ?? null;
  outer.userData.ccHingePivotMm = pivot;
  outer.userData.ccHingeMirror = s;
  outer.userData.ccHingeJoint = joint;
  outer.userData.ccHingeFold = 0;
  return { cup, body: outer };
}

/**
 * THE FOLD (turn 24 F1.2; turn 29 CLAUDE.md F5), applied to member B.
 *
 * ONE rotation about a HORIZONTAL axis parallel to the hinge row — the file's
 * Y — at the arm's front pivot, which since turn 29 is the MEASURED knuckle:
 * the Y-parallel line through x = −0.01808, z = +0.04286 m of the file.
 *
 * ─── WHOSE ANGLE, AND WHICH WAY ROUND ──────────────────────────────────────
 *
 * The rig was measured with the ARM held still and the CUP turned about the
 * pin: +θ opens, 0 → 110°. That is the joint, and a joint can be driven from
 * either end. The app drives it from the other one — member B rides the leaf
 * beside member A and turns BACK by the leaf's own angle — because that is the
 * end where the two things that must be true both come out true:
 *
 *   the KNUCKLE stays a single point   member B turns about it, so it does not
 *                                      move; member A carries it on the leaf;
 *                                      the two coincide at every angle.
 *   the ARM keeps the CARCASS's angle   +θ from the leaf and −θ here cancel, so
 *                                      at 110° the arm lies along the carcass
 *                                      side instead of standing square off the
 *                                      door — which is what a CLIP top does and
 *                                      what turn 23 was asked to fix.
 *
 * ─── IT IS A ONE-JOINT APPROXIMATION OF BLUM'S SEVEN-LINK CROSS ────────────
 *
 * A real CLIP top is four bars and three couplers whose instantaneous centre
 * TRAVELS as the door opens; that is what lets the cup clear the carcass on a
 * 110° swing, and it is geometry nobody here has. One joint cannot hold both
 * ends of the arm: the leaf turns about its own hinge line, so the knuckle
 * travels on an arc and the arm's rear travels with it. This rig holds the
 * KNUCKLE — the joint you can see — and lets the tail drift; the alternative
 * holds the tail and tears the hinge in half on screen. CLAUDE.md asks for the
 * approximation, asks for it to be named as one, and forbids attempting the
 * real four-bar. This is the name, and `verify/t29/README.md` carries the
 * number the tail drifts by.
 *
 * @param {THREE.Object3D} body   `hingeMembers().body`
 * @param {object} profile
 * @param {number} angle          the LEAF's own signed opening angle, RADIANS
 *                                (3d/UnitView.jsx: `dir × a × swing`)
 */
export function foldMemberB(body, profile, angle) {
  const joint = body?.userData?.ccHingeJoint;
  if (!joint) return body;
  const C = profile?.hardware?.hinge?.cliptop;
  const enabled = Boolean(C?.rig?.enabled);
  // The ironmongery's own limit. A door drawn past 110° is a door the hinge
  // does not open to, and a fold past it would be a bent arm.
  const cap = (Math.abs(Number(C?.rig?.maxFoldDeg) || 110) * Math.PI) / 180;
  const leaf = Math.max(-cap, Math.min(cap, Number(angle) || 0));
  // Relative to the leaf, and that is the whole of the minus sign: the leaf has
  // turned +θ and the arm has to come back through the same θ to stay where the
  // plate is. `angle` already carries the HAND — `dir` is −1 on a left-hung
  // door — and so does the clone's mirror, which is why the fold needs no
  // second correction for it: applying it here, inside the mirrored group's
  // parent, is applying it BEFORE the hand mirror.
  // `leaf !== 0` keeps a shut door at a plain zero rather than at −0: the two
  // render identically and read differently, and a walk comparing scene-graph
  // numbers should not have to know that.
  const turn = enabled && leaf !== 0 ? -leaf : 0;
  joint.rotation.y = turn;
  // eslint-disable-next-line no-param-reassign
  body.userData.ccHingeFold = turn;
  return body;
}

