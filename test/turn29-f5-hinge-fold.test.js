// ─── TURN 29 F5 — the hinge folds about its measured axis ───────────────────
//
// Turn 24 built the rig and shipped STARTING numbers for the one thing it could
// not derive, saying so in as many words: *"the first person to see the fold
// beside a real cabinet corrects THESE TWO and nothing else."* The lab measured
// them overnight on `71B3550_42542984.glb` and render-verified the result;
// CLAUDE.md hands them over as final and forbids re-deriving them:
//
//   fold axis   the Y-parallel line through x = −0.01808, z = +0.04286 (metres)
//   direction   +Y, +θ opens, range 0 → 110°
//   members     CUP = bau0015089612, bau0015088783, bau0015088853
//               ARM = bau0015088251, bau0019416036
//
// ─── WHAT THE MEASUREMENT MADE POSSIBLE, AND WHAT IT EXPOSED ────────────────
//
// With a guessed pin the rig could only be described. With a measured one it
// can be CHECKED — and turn 24's arrangement fails the check. The arm stood in
// the carcass's frame and turned forward by the leaf's angle, so member B's pin
// was the centre of its own rotation and never moved, while member A's rode the
// leaf round its hinge line. By 110° the two halves of one hinge stood 25 mm
// apart: a hinge drawn broken.
//
// A one-joint rig cannot hold both ends of the arm — the leaf turns about its
// own hinge line, not about the pin, so the knuckle travels and whatever is
// bolted to it travels too. It can hold ONE, and the one worth holding is the
// KNUCKLE, because that is the joint a joiner is looking at. So member B rides
// the leaf beside member A and folds BACK through the leaf's own angle:
//
//   the knuckle    one point, at every angle, on both hands
//   the arm        keeps the CARCASS's attitude — at 110° it lies along the
//                  side panel instead of standing square off the door, which
//                  is what a CLIP top does and what turn 23 asked for
//   the tail       drifts, and by how much is measured below and written down
//                  rather than left for somebody to discover
//
// R8: the bucket answers 403 here, so the numbers below are proved on the
// SILENT SHOWROOM's synthetic GLB — which carries the real export's node names
// and, from this turn, a knuckle at the same model-space point. The true-file
// visual check happens in chat after the merge; `verify/t29/README.md` says so
// rather than pretending otherwise.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { foldMemberB, foldPivotMm, offsetArmNode } from '../src/3d/hingeModels.js';
import { mm } from '../src/3d/constants.js';
import { parseGlb, meshTable } from '../scripts/glb-meshes.mjs';

const C = P.hardware.hinge.cliptop;
const RIG = C.rig;
const MODELS = readFileSync(new URL('../src/3d/hingeModels.js', import.meta.url), 'utf8');
const HARDWARE = readFileSync(new URL('../src/3d/Hardware.jsx', import.meta.url), 'utf8');

// CLAUDE.md's own numbers, in the units it gives them in.
const AXIS_M = { x: -0.01808, z: 0.04286 };
const FILE_MIN = { x: -26.5, y: -28.5, z: -29.48 };

// ─── the numbers themselves ─────────────────────────────────────────────────

test('F5 the axis is the measured one, to the micron, in the file’s own frame', () => {
  assert.ok(Math.abs(RIG.axis.x - AXIS_M.x * 1000) < 1e-9, `x = ${RIG.axis.x}`);
  assert.ok(Math.abs(RIG.axis.z - AXIS_M.z * 1000) < 1e-9, `z = ${RIG.axis.z}`);
  // Turn 24's guesses are gone — this is the correction, not a second opinion.
  assert.notEqual(RIG.axis.x, -7.75);
  assert.notEqual(RIG.axis.z, 33.5);
  // …and 110° is the ironmongery's own limit, not a rendering choice.
  assert.equal(RIG.maxFoldDeg, 110);
});

test('F5 the member split is byte-for-byte the contract turn 24 confirmed — grown per family (chat fix 14.08.2026)', () => {
  // Turn 24's five names are `42542984`'s own; the owner's 155° wardrobe
  // door proved the point of listing the rest — its foreign-named MAIN ARM
  // fell to the z fallback and rode the leaf. Cups, caps and covers to the
  // DOOR; arms, links and levers to the CARCASS; measured per file on the
  // live bucket.
  assert.deepEqual(RIG.memberA, [
    'bau0015089612', 'bau0015088783', 'bau0015088853',
    'bau0015157579',
    'bau0079302490', 'bau0079324562', 'bau0079298416',
    'bau0081900639',
    'bau0015166285', 'bau0015167707', 'bau0015167363',
    'bau0016962400',
  ]);
  assert.deepEqual(RIG.memberB, [
    'bau0015088251', 'bau0019416036',
    'bau0079291413', 'bau0079262819',
    'bau0025540121', 'bau0082114196',
    'bau0015166656', 'bau0019426112',
  ]);
  assert.equal(C.fileHand, 'R');
});

test('F5 the pin lands 10.33 mm off the cup and 2.56 mm inside the leaf', () => {
  const pivot = foldPivotMm({ min: FILE_MIN, profile: P });
  // ─── TURN 30 (CLAUDE.md F1): THE DERIVATION LOST ITS BOUNDING BOX ───────
  // Turn 29 wrote this as `axis − min + modelOrigin`, the shift `glbClone`
  // placed the body by. F1 places the body on its ABSOLUTE `fileDatum`, so the
  // pin follows: `axis − fileDatum`, no min in it at all. On THIS file the two
  // are the same point — `modelOrigin = min − fileDatum` by construction — and
  // both readings are asserted here so the equality is proved and not assumed.
  assert.ok(Math.abs(pivot.x - (RIG.axis.x - C.fileDatum.x)) < 1e-9);
  assert.ok(Math.abs(pivot.z - (RIG.axis.z - C.fileDatum.z)) < 1e-9);
  assert.ok(Math.abs(pivot.x - (RIG.axis.x - FILE_MIN.x + C.modelOrigin.x)) < 1e-9);
  assert.ok(Math.abs(pivot.z - (RIG.axis.z - FILE_MIN.z + C.modelOrigin.z)) < 1e-9);
  assert.ok(Math.abs(pivot.x - -10.33) < 1e-9, `x = ${pivot.x}`);
  assert.equal(pivot.y, 0, 'the axis is horizontal and has no height of its own');
  assert.ok(Math.abs(pivot.z - 2.56) < 1e-9, `z = ${pivot.z}`);
});

// ─── R8: the showroom carries the pin ───────────────────────────────────────

test('F5 the SILENT SHOWROOM has a knuckle at the same model-space point', () => {
  const rows = meshTable(parseGlb(readFileSync(new URL(
    '../test/fixtures/hardware-local/hardware/hinges/blum/71B3550_10001.glb',
    import.meta.url,
  ))));
  // A knuckle barrel is the only round thing on the fold axis: square in x/z
  // about the pin, and long in y. Found by its geometry, not by its index.
  const barrels = rows.filter((r) => Math.abs(r.centre[0] - RIG.axis.x) < 0.05
    && Math.abs(r.centre[2] - RIG.axis.z) < 0.05);
  assert.equal(barrels.length, 3, 'two lugs and the pin between them');
  for (const b of barrels) {
    assert.ok(Math.abs(b.size[0] - b.size[2]) < 0.05, 'round in the plane it turns in');
    assert.ok(b.size[1] > b.size[0], 'and long along the axis');
  }
  // They INTERLOCK: member A's two lugs outside, member B's barrel between —
  // which is how a CLIP top's knuckle is put together, and what makes the two
  // members' pin the same point rather than two points that happen to agree.
  // Membership by PREFIX, the way `memberOfNode` reads a real export's
  // suffixed names (chat fix 13.08.2026) — equality here is how the bug hid.
  const lugs = barrels.filter((b) => RIG.memberA.some((m) => b.node.startsWith(m)));
  const pin = barrels.filter((b) => RIG.memberB.some((m) => b.node.startsWith(m)));
  assert.equal(lugs.length, 2);
  assert.equal(pin.length, 1);
  assert.ok(pin[0].min[1] >= Math.max(...lugs.map((l) => l.max[1] < 0 ? l.max[1] : -Infinity)) - 1e-6);
  assert.ok(pin[0].max[1] <= Math.min(...lugs.map((l) => (l.min[1] > 0 ? l.min[1] : Infinity))) + 1e-6);

  // …and the generator quotes the profile rather than inventing a second axis.
  const gen = readFileSync(new URL('../scripts/make-fixture-hardware.mjs', import.meta.url), 'utf8');
  assert.match(gen, new RegExp(`const KNUCKLE = \\{ x: ${RIG.axis.x}, z: ${RIG.axis.z}, r: 2 \\};`));
});

// ─── the rig, composed and read ─────────────────────────────────────────────

/**
 * The two members' object graphs, exactly as `3d/hingeModels.js hingeMembers`
 * assembles them. Building them here rather than loading a GLB is what lets a
 * node test read WORLD POSITIONS — and the three lines that matter are matched
 * against the source below, so the model cannot drift away from the thing.
 *
 *     cup    a group carrying the hand mirror, on the drilled point
 *     body   outer (on the drilled point) → joint (at the pin) → clone (−pin)
 */
function members({ mirror }) {
  const pivot = foldPivotMm({ min: FILE_MIN, profile: P });
  const s = mirror ? -1 : 1;

  const cup = new THREE.Group();
  cup.scale.x = s;
  cup.userData.ccHingePivotMm = pivot;
  cup.userData.ccHingeMirror = s;

  const inner = new THREE.Group();
  inner.scale.x = s;
  inner.position.set(-mm(pivot.x) * s, 0, -mm(pivot.z));
  // The REAL export's SUFFIXED names (chat fix 13.08.2026 — a bare name here
  // is how the last gap hid): the arm body and the lever, so the slide below
  // is applied by the REAL `offsetArmNode` matching a REAL name, and the
  // lever's stillness is the same function declining a name, not this test
  // forgetting to move it.
  const arm = new THREE.Group();
  arm.name = 'bau0015088251_v(70T310M0201)';
  const lever = new THREE.Group();
  lever.name = 'bau0019416036_v(70T510M1402)';
  inner.add(arm);
  inner.add(lever);
  offsetArmNode(inner, P);
  const joint = new THREE.Group();
  joint.position.set(mm(pivot.x) * s, 0, mm(pivot.z));
  joint.add(inner);
  const outer = new THREE.Group();
  outer.add(joint);
  outer.userData.ccHingeJoint = joint;
  outer.userData.ccHingePivotMm = pivot;
  outer.userData.ccHingeMirror = s;
  return { cup, body: outer, pivot, s, arm, lever };
}

test('F5 the graph this test composes is the one hingeMembers builds', () => {
  assert.match(MODELS, /joint\.position\.set\(mm\(pivot\.x\) \* s, 0, mm\(pivot\.z\)\);/);
  assert.match(MODELS, /inner\.position\.set\(-mm\(pivot\.x\) \* s, 0, -mm\(pivot\.z\)\);/);
  assert.match(MODELS, /const s = args\?\.mirror \? -1 : 1;/);
  // …and member A carries the pin too, which is what lets a reader ask BOTH
  // halves where the knuckle is instead of working one of them out itself.
  assert.match(MODELS, /cup\.userData\.ccHingePivotMm = pivot;/);
  // …and the chat fix's slide is the source's own lines, applied where the
  // members are built — below the mirror, below the joint — not a re-model.
  assert.match(MODELS, /node\.position\.x \+= mm\(off\.xMm \|\| 0\);/);
  assert.match(MODELS, /node\.position\.z \+= mm\(off\.zMm \|\| 0\);/);
  assert.match(MODELS, /offsetArmNode\(keepMember\(hingeModel\(url, args\), profile, 'B'\), profile\)/);
});

/** One leaf's hinge instances and the door group's own origin. */
function leaf(hinge) {
  const result = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', doors: { count: 1, hinge },
  }, P);
  const door = result.panels.find((p) => p.part === 'FRONT');
  const items = hardwareInstances(result, P).hinges.filter((h) => h.panelId === door.id);
  assert.ok(items.length >= 2, 'a door hangs on more than one hinge');
  // `3d/UnitView.jsx`: a door rotates about its HINGE EDGE, at mid-thickness.
  const pivot = [
    mm(hinge === 'R' ? door.box.x + door.box.w : door.box.x),
    mm(door.box.y + door.box.h / 2),
    mm(door.box.z + door.box.d / 2),
  ];
  return { items, pivot, dir: hinge === 'R' ? 1 : -1 };
}

/**
 * The scene at one opening angle: the leaf's group turned by `dir × θ`, both
 * members inside it, and every world position read off the graph.
 */
function scene(hinge, degrees) {
  const { items, pivot, dir } = leaf(hinge);
  const h = items[0];
  const swing = dir * ((degrees * Math.PI) / 180);
  // The hand mirror is the view's own rule: the body file is authored for a
  // RIGHT-hung door and the other hand takes the mirrored clone.
  const {
    cup, body, pivot: pinMm, s, arm, lever,
  } = members({ mirror: h.side !== C.fileHand });

  const unit = new THREE.Group();
  const door = new THREE.Group();
  door.position.set(...pivot);
  door.rotation.y = swing;
  unit.add(door);

  const at = [mm(h.x) - pivot[0], mm(h.y) - pivot[1], mm(h.z) - pivot[2]];
  cup.position.set(...at);
  body.position.set(...at);
  door.add(cup);
  door.add(body);
  foldMemberB(body, P, swing);
  unit.updateMatrixWorld(true);

  // The knuckle, asked of EACH member in its own frame. Member A's group
  // CARRIES the hand mirror, so the point is given in the file's own frame and
  // the group's own scale is what puts it on the right side; member B's joint
  // sits above the mirror, so its position was mirrored when it was built.
  // Two routes to one point, which is the whole of what is being checked.
  const cupKnuckle = cup.localToWorld(new THREE.Vector3(mm(pinMm.x), 0, mm(pinMm.z)));
  const armKnuckle = body.userData.ccHingeJoint.getWorldPosition(new THREE.Vector3());
  // …and the arm's TAIL: the far end of `bau0015088251`, z −28 in the file,
  // which after `modelOrigin` sits at −28 − min.z + origin.z along the clone.
  const tailZ = -28 - FILE_MIN.z + C.modelOrigin.z;
  const tail = body.userData.ccHingeJoint.children[0]
    .localToWorld(new THREE.Vector3(0, 0, mm(tailZ)));
  const armQuat = body.userData.ccHingeJoint.getWorldQuaternion(new THREE.Quaternion());
  const cupQuat = cup.getWorldQuaternion(new THREE.Quaternion());
  // …and the DRAWN pin (chat fix 14.08.2026): the arm's own barrel, which
  // `offsetArmNode` slid off the axis. In the ARM node's frame the barrel
  // still sits where the file put it — the NODE moved, not the metal in it —
  // so the same file-frame point, asked of the moved node, is the moved pin.
  const drawnKnuckle = arm.localToWorld(new THREE.Vector3(mm(pinMm.x), 0, mm(pinMm.z)));
  return {
    cupKnuckle, armKnuckle, drawnKnuckle, tail, armQuat, cupQuat, swing,
    leverLocal: lever.position.clone(), plateZ: mm(h.plateZ),
  };
}

const ANGLES = [0, 45, 110];

test('F5 the knuckle is ONE point, at every angle, on both hands', () => {
  for (const hinge of ['L', 'R']) {
    for (const deg of ANGLES) {
      const s = scene(hinge, deg);
      const gap = s.cupKnuckle.distanceTo(s.armKnuckle) / mm(1);
      assert.ok(gap < 0.2, `${hinge} at ${deg}°: the two halves meet to ${gap.toFixed(4)} mm`);
    }
  }
});

test('F5 the drawn arm stands |armOffset| off the knuckle — a slide, not a turn (chat fix 14.08.2026)', () => {
  const off = RIG.armOffset;
  // The owner's numbers, spelt out: ONE node, 20 off the side (the file's
  // −x — its +x runs TOWARD the panel, lab-measured on both hands), 20 out
  // of the leaf (−z; his bench verdict 14.08 raised 15 by five), and the
  // profile is where they live.
  assert.equal(off.node, 'bau0015088251');
  assert.equal(off.xMm, -20);
  assert.equal(off.zMm, -20);
  const slide = Math.hypot(off.xMm, off.zMm);
  for (const hinge of ['L', 'R']) {
    const shut = scene(hinge, 0);
    const shutVec = shut.drawnKnuckle.clone().sub(shut.armKnuckle);
    for (const deg of ANGLES) {
      const sc = scene(hinge, deg);
      // THE NUDGED EXPECTATION. Turn 29 asked the drawn pin to sit ON the
      // axis; the owner's slide moves it — by exactly the offset's own
      // length, at every angle, on both hands. Zero here would mean the
      // slide never happened; anything else would mean it is not the pure
      // translation he asked for.
      const gap = sc.drawnKnuckle.distanceTo(sc.armKnuckle) / mm(1);
      assert.ok(Math.abs(gap - slide) < 0.2,
        `${hinge} at ${deg}°: the drawn pin stands ${gap.toFixed(3)} mm off the axis, not ${slide.toFixed(3)}`);
      // CARCASS-FIXED and PURE: the world vector from axis to drawn pin is
      // the shut one at every angle — a rotation of any kind would turn it.
      const vec = sc.drawnKnuckle.clone().sub(sc.armKnuckle);
      assert.ok(vec.distanceTo(shutVec) / mm(1) < 1e-6, `${hinge} at ${deg}°: the slide turned`);
    }
    // …and the LEVER did not move: `offsetArmNode` matched one name only —
    // "podstawa zawiasu jest super" stays exactly as it is.
    assert.equal(shut.leverLocal.length(), 0, 'the lever stays put');
  }
  // Both hands slide INBOARD — mirrored x, same z: the clone's own
  // `scale.x = −1` carries the sign, and no second correction exists to
  // disagree with it.
  const l = scene('L', 0);
  const r = scene('R', 0);
  const lv = l.drawnKnuckle.clone().sub(l.armKnuckle);
  const rv = r.drawnKnuckle.clone().sub(r.armKnuckle);
  assert.ok(Math.abs(lv.x + rv.x) < 1e-9, 'x mirrors with the hand');
  assert.ok(Math.abs(lv.z - rv.z) < 1e-9, 'z is the same on either hand');
});

test('F5 the ARM keeps the CARCASS’s attitude while the CUP keeps the leaf’s', () => {
  for (const hinge of ['L', 'R']) {
    const shut = scene(hinge, 0);
    for (const deg of ANGLES) {
      const s = scene(hinge, deg);
      // The arm does not swing out with the door: its world orientation is the
      // one it has shut, which is the carcass's. That is turn 23's fault fixed
      // and it is the sentence "the arm stays at the plate" means here.
      const turned = (2 * Math.acos(Math.min(1, Math.abs(s.armQuat.dot(shut.armQuat)))) * 180) / Math.PI;
      assert.ok(turned < 0.001, `${hinge} at ${deg}°: the arm turned ${turned.toFixed(4)}°`);
      // …while the CUP is rigid in the leaf and turns with it, exactly as it
      // has since turn 23: it is clipped into the door.
      const rode = (2 * Math.acos(Math.min(1, Math.abs(s.cupQuat.dot(shut.cupQuat)))) * 180) / Math.PI;
      assert.ok(Math.abs(rode - deg) < 0.001, `${hinge} at ${deg}°: the cup rode ${rode.toFixed(3)}°`);
    }
  }
});

test('F5 what the one joint COSTS is measured, not hidden: the tail drifts', () => {
  // The honest number. A one-joint rig holds the knuckle and lets the arm's
  // rear travel with it; this is how far, so nobody has to discover it.
  const drift = {};
  for (const hinge of ['L', 'R']) {
    const shut = scene(hinge, 0);
    drift[hinge] = ANGLES.map((deg) => scene(hinge, deg).tail.distanceTo(shut.tail) / mm(1));
  }
  for (const hinge of ['L', 'R']) {
    assert.ok(drift[hinge][0] < 1e-9, 'a shut door is turn 23’s picture, to the micron');
    assert.ok(drift[hinge][1] > 5, 'it really does move — this is not a no-op rig');
    // The bound is the arc the knuckle itself travels — the tail is rigidly
    // bolted to it and cannot move further — and it is written down here, in
    // `verify/t29/README.md` and beside the maths in `3d/hingeModels.js`,
    // because a cost nobody records is a cost somebody rediscovers.
    assert.ok(drift[hinge][2] < 60, `at 110° the tail is ${drift[hinge][2].toFixed(1)} mm off the plate`);
    assert.ok(Math.abs(drift[hinge][2] - 54.6) < 0.5,
      `the measured drift is 54.6 mm, not ${drift[hinge][2].toFixed(1)}`);
  }
  // Both hands pay the same, which is what says the mirror is right.
  assert.ok(Math.abs(drift.L[2] - drift.R[2]) < 1e-6, 'the two hands are each other’s mirror');
});

test('F5 the fold stops at 110°, whichever way the door is hung', () => {
  const cap = (RIG.maxFoldDeg * Math.PI) / 180;
  const { body } = members({ mirror: false });
  foldMemberB(body, P, Math.PI);
  assert.ok(Math.abs(body.userData.ccHingeFold + cap) < 1e-9);
  foldMemberB(body, P, -Math.PI);
  assert.ok(Math.abs(body.userData.ccHingeFold - cap) < 1e-9);
  // A shut door folds by nothing, and by a plain zero.
  foldMemberB(body, P, 0);
  assert.equal(body.userData.ccHingeFold, 0);
  assert.ok(Object.is(body.userData.ccHingeFold, 0), 'not −0');
});

test('F5 the fold is applied BEFORE the hand mirror', () => {
  // The joint is the PARENT of the mirrored clone, so a rotation written on it
  // acts in the file's own frame — and `angle` already carries the hand (`dir`
  // is −1 on a left-hung door), which is the same sign the mirror carries. One
  // correction, in one place, and the two hands fold about the same physical
  // line rather than about each other's.
  const l = scene('L', 110);
  const r = scene('R', 110);
  assert.ok(Math.abs(l.swing + r.swing) < 1e-12, 'the two leaves swing opposite ways');
  // Mirror the left-hand reading about the leaf's own hinge plane and it is
  // the right-hand one: same distances, opposite signs.
  const lShut = scene('L', 0);
  const rShut = scene('R', 0);
  const lMove = l.armKnuckle.distanceTo(lShut.armKnuckle);
  const rMove = r.armKnuckle.distanceTo(rShut.armKnuckle);
  assert.ok(Math.abs(lMove - rMove) < 1e-9, 'the knuckle travels the same arc on both hands');
});

// ─── and it is a picture, not a cut ─────────────────────────────────────────

test('F5 the rig reaches no hole: the drilling is what it was', () => {
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  // The model is a COSTUME ON THE SCREWS: every position it is drawn at is the
  // engine's own, and nothing in the view writes one.
  assert.deepEqual(r.drillSummary.hinge_centers, [100, 470, 670]);
  assert.deepEqual(r.drillSummary.hinged_sides, ['BUL']);
  const src = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /foldMemberB|hingeMembers|maxFoldDeg|ccHingeJoint/);
  // …and the fold lives in ONE function, which is the only place an angle is
  // written onto the joint.
  assert.equal((MODELS.match(/joint\.rotation\.y = /g) || []).length, 1);
  assert.equal((HARDWARE.match(/foldMemberB\(/g) || []).length, 1);
});
