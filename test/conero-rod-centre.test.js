// ─── 30.08.2026 · CONERO ROD — MEASURED, NOT PREDICTED ──────────────────────
//
// The owner's screen, first narrow column tried (≈560 opening): the rod's
// right end floating 111 mm PAST the cabinet side, the handle 175 mm right of
// centre. The cause was one predicted shift in `coneroClone` that assumed the
// rod's scale pivot sits at x = 0; in the manufacturer's file the rod is
// authored symmetric about its own pivot, so scaling moves nothing and the
// whole "correction" was the error — invisible near the native 858 width,
// where sx ≈ 1 multiplied it away, which is why every earlier eye-test passed.
//
// The law this file pins (the same law the arms two lines below already obey):
// after the stretch, the rod's box is MEASURED and its measured centre parked
// at want/2. No prediction survives here to rot when the file is re-exported
// with a different pivot.
//
// The bucket answers nothing in this container (turn 30's R8 precedent), so
// the scene under test is built in memory FROM THE REAL FILE'S OWN NUMBERS —
// `conero-pantograf-730.glb` was parsed on 30.08 and these extents are its
// bytes, not an invention:
//
//   rod  '3d-674367-674569-730mm'  x [-0.3650 .. 0.3650]   (730 native, pivot
//                                                            at its centre)
//   arm  '3d-238278-re'            x [ 0.2179 .. 0.4289]
//   arm  '3d-238278-li'            x [-0.4289 .. -0.2179]
//   file                           x [-0.4289 .. 0.4289]   size 0.8579
//
// Seeding: `glbSource(url)` returns its live cache entry; filling that entry
// synchronously and calling `coneroClone` in the same tick is deterministic —
// the loader's own async failure callback cannot interleave into a sync block.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { glbSource, clearGlbSources } from '../src/3d/glbSource.js';
import { CONERO_AXES, coneroClone, coneroPose } from '../src/3d/coneroModels.js';

/** One named box-mesh whose world bbox is exactly [min..max] per axis. */
function boxNode(name, min, max) {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size));
  mesh.name = name;
  mesh.position.set(min[0] + size[0] / 2, min[1] + size[1] / 2, min[2] + size[2] / 2);
  return mesh;
}

/** The bucket file, rebuilt from its measured extents, seeded into the cache. */
function seedConero(url) {
  clearGlbSources();
  const scene = new THREE.Group();
  // The rod's mesh keeps the FILE's construction: pivot at x=0, geometry
  // symmetric about it — the exact shape that made the predicted shift wrong.
  scene.add(boxNode('3d-674367-674569-730mm', [-0.3650, -0.0106, -0.1498], [0.3650, 0.6873, -0.1081]));
  scene.add(boxNode('3d-238278-re', [0.2179, -0.0138, -0.2107], [0.4289, 0.6907, 0.0016]));
  scene.add(boxNode('3d-238278-li', [-0.4289, -0.0138, -0.2107], [-0.2179, 0.6907, 0.0016]));
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const entry = glbSource(url);
  entry.scene = scene;
  entry.size = box.getSize(new THREE.Vector3());
  entry.centre = box.getCenter(new THREE.Vector3());
  entry.min = box.min.clone();
  entry.loaded = true;
  entry.failed = false;
  return entry;
}

const NAME_ROD = '3d-674367-674569-730mm';
const EPS = 1e-6;

/** World-x box of the named node inside a composed clone. */
function xBox(clone, name) {
  clone.updateMatrixWorld(true);
  let node = null;
  clone.traverse((o) => { if (o.name === name) node = o; });
  assert.ok(node, `${name} present in the clone`);
  const b = new THREE.Box3().setFromObject(node);
  return { min: b.min.x, max: b.max.x, centre: (b.min.x + b.max.x) / 2 };
}

/** The three truths, at one width. */
function assertLaws(openingMm) {
  const url = `mem://conero/${openingMm}`;
  seedConero(url);
  const clone = coneroClone(url, openingMm, 830);
  assert.ok(clone, 'clone composed');
  const want = openingMm / 1000;
  const rod = xBox(clone, NAME_ROD);
  const li = xBox(clone, '3d-238278-li');
  const re = xBox(clone, '3d-238278-re');
  // 1. the rod's MEASURED centre is the opening's centre — the fixed law
  assert.ok(Math.abs(rod.centre - want / 2) < EPS,
    `rod centre ${rod.centre} = want/2 ${want / 2} at ${openingMm}`);
  // 2. nothing pokes past either side — the owner's screen, never again
  assert.ok(rod.min > -EPS && rod.max < want + EPS,
    `rod [${rod.min}..${rod.max}] inside [0..${want}] at ${openingMm}`);
  // 3. the file's own rod-into-arm engagement survives the stretch: each end
  //    reaches into its sleeve, and by the SAME depth on both sides
  assert.ok(rod.min < li.max - EPS && rod.max > re.min + EPS,
    `rod ends engaged in both sleeves at ${openingMm}`);
  assert.ok(Math.abs((rod.min - li.min) - (re.max - rod.max)) < EPS,
    `engagement symmetric at ${openingMm}`);
  // and the arms' own law still stands: outer faces ON the sides, zero gap
  assert.ok(Math.abs(li.min) < EPS && Math.abs(re.max - want) < EPS,
    `arms flush with the sides at ${openingMm}`);
}

test('CONERO · 560 opening — the owner\u2019s screen: centred, nothing past the side', () => {
  assertLaws(560);
});

test('CONERO · 858 opening — the native width, where the old error hid at \u2248 zero', () => {
  assertLaws(858);
});

test('CONERO · 900 opening — wider than the file, same three truths', () => {
  assertLaws(900);
});

// ─── 30.08 · THE SWING — the owner's two green points, as law ───────────────
//
// Axis A through both plate centres carries the whole frame 90° forward and
// down; axis B in the rod's own tube turns the rod BACK by the same angle, so
// the handle hangs plumb the whole way — "rail i rączka też się przekręca jak
// się opuszcza". Fraction 0 must be the approved closed picture to the byte,
// and the swing is built OUTSIDE the height scale so the lowered arm keeps
// its length.

function poseRig(openingMm, totalHmm) {
  const url = `mem://conero/pose/${openingMm}`;
  seedConero(url);
  const model = coneroClone(url, openingMm, totalHmm);
  assert.ok(model?.userData?.ccConero, 'the rig rides on the clone');
  return model;
}

test('CONERO · fraction 0 is the approved closed picture, to the byte', () => {
  const model = poseRig(800, 830);
  model.updateMatrixWorld(true);
  const before = new THREE.Box3().setFromObject(model);
  coneroPose(model, 1);
  coneroPose(model, 0);
  model.updateMatrixWorld(true);
  const after = new THREE.Box3().setFromObject(model);
  assert.ok(before.min.distanceTo(after.min) < EPS && before.max.distanceTo(after.max) < EPS,
    'a full swing and back leaves the closed box exactly where it was');
});

test('CONERO · fraction 1 — the tube lands on the 90° arc, forward and down', () => {
  const totalHmm = 830;
  const model = poseRig(800, totalHmm);
  const seat = { y: -0.0138, z: -0.2107 };
  const kY = (totalHmm / 1000) / (0.6907 - seat.y);
  const A = { y: (CONERO_AXES.plate.y - seat.y) * kY, z: CONERO_AXES.plate.z - seat.z };
  const tube = { y: (CONERO_AXES.tube.y - seat.y) * kY, z: CONERO_AXES.tube.z - seat.z };
  const dy = tube.y - A.y;
  const dz = tube.z - A.z;
  // rotation.x = +90°: (Δy, Δz) → (−Δz, +Δy) — toward +z, the way a drawer
  // slides out, and DOWN to the plate line.
  const wantY = A.y - dz;
  const wantZ = A.z + dy;
  coneroPose(model, 1);
  model.updateMatrixWorld(true);
  const at = new THREE.Vector3();
  model.userData.ccConero.rodPivot.getWorldPosition(at);
  assert.ok(Math.abs(at.y - wantY) < EPS && Math.abs(at.z - wantZ) < EPS,
    `tube at (y ${at.y}, z ${at.z}) = arc point (y ${wantY}, z ${wantZ})`);
  assert.ok(at.z > tube.z + 0.1, 'the rod came out in FRONT of the wardrobe');
  assert.ok(at.y < tube.y - 0.1, 'and DOWN toward the plate line');
});

test('CONERO · fraction 1 — the handle hangs plumb (axis B counter-turn)', () => {
  const model = poseRig(800, 830);
  coneroPose(model, 1);
  model.updateMatrixWorld(true);
  let rod = null;
  model.traverse((o) => { if (o.name === NAME_ROD) rod = o; });
  const a = rod.localToWorld(new THREE.Vector3(0, 0, 0));
  const b = rod.localToWorld(new THREE.Vector3(0, -1, 0));
  const v = b.sub(a);
  assert.ok(Math.abs(v.x) < EPS && Math.abs(v.z) < EPS && v.y < 0,
    `local "down" is world down at full open, not (${v.x}, ${v.y}, ${v.z})`);
});
