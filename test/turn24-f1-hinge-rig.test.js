import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import {
  foldMemberB, foldPivotMm, keepMember, memberOfNode, rigHidesBody,
} from '../src/3d/hingeModels.js';
import { parseGlb, meshTable } from '../scripts/glb-meshes.mjs';

// ─── TURN 24 · F1 — THE HINGE SPLITS IN TWO AND FOLDS WITH THE DOOR ─────────
//
// Owner, of turn 23's rigid model: it must BREAK in the middle — cup side with
// the door, body side with the plate — or, failing that, disappear when open.
//
// Everything below is arithmetic and object graphs, which is the whole point:
// the split is a decision about NAMES and the fold is a decision about ONE
// ANGLE, and neither of them needs a browser to be told it is wrong.

const RIG = P.hardware.hinge.cliptop.rig;

// The five components of the STEP-derived standard model, measured per node,
// z in FILE millimetres. This table is CLAUDE.md's own and is re-verified
// against the live file in verify/t24/rig-members.md.
const TABLE = [
  { node: 'bau0015089612', z: [35.3, 51.3], member: 'A' },
  { node: 'bau0015088783', z: [39.4, 50.1], member: 'A' },
  { node: 'bau0015088853', z: [31.1, 44.9], member: 'A' },
  { node: 'bau0015088251', z: [-28.0, 46.2], member: 'B' },
  { node: 'bau0019416036', z: [-29.4, 22.5], member: 'B' },
];

test('F1.1 — every node of the standard model lands in the member the table names', () => {
  for (const row of TABLE) {
    assert.equal(
      memberOfNode(row.node, RIG, row.z[1]),
      row.member,
      `${row.node} belongs to member ${row.member}`,
    );
  }
});

test('F1.1 — the two lists partition the model: no node in both, none missing', () => {
  const a = new Set(RIG.memberA);
  const b = new Set(RIG.memberB);
  for (const node of a) assert.equal(b.has(node), false, `${node} is in one list only`);
  assert.equal(a.size + b.size, TABLE.length, 'five components, and all five are named');
  for (const row of TABLE) {
    assert.equal(a.has(row.node) || b.has(row.node), true, `${row.node} is named`);
  }
});

test('F1.3 — an unknown node falls back to the z threshold, z > 30 ⇒ member A', () => {
  assert.equal(memberOfNode('bau9999999999', RIG, 51.3), 'A');
  assert.equal(memberOfNode('bau9999999999', RIG, 30.0001), 'A');
  assert.equal(memberOfNode('bau9999999999', RIG, 30), 'B');
  assert.equal(memberOfNode('bau9999999999', RIG, -29.4), 'B');
  // A node with no measurable box at all is the carcass half: an unplaceable
  // piece left on the STATIC member cannot be dragged into the room by a door.
  assert.equal(memberOfNode('bau9999999999', RIG, null), 'B');
});

test('F1.3 — the NAME beats the threshold, which is why the arm is not cut in half', () => {
  // `bau0015088251` spans −28 … 46.2 — right across the 30 mm line. Asked by
  // geometry alone it would read as member A and the arm would ride the door.
  const row = TABLE.find((r) => r.node === 'bau0015088251');
  assert.equal(row.z[1] > RIG.zThresholdMm, true, 'it really does cross the threshold');
  assert.equal(memberOfNode(row.node, RIG, row.z[1]), 'B', 'and the name still wins');
});

test('F1.2 — the fold pivot is the file axis put through the clone’s own transform', () => {
  // The measured 71B3550 box, from the chat hotfix recorded in profile.js.
  const min = { x: -26.5, y: -28.5, z: -29.48 };
  const pivot = foldPivotMm({ min, profile: P });
  // x: the axis IS the cup's own centre line, and `modelOrigin` put that at
  // the drilled point — so the joint is on the cup's axis, at zero.
  assert.ok(Math.abs(pivot.x - 0) < 1e-9, `pivot x = ${pivot.x}`);
  // The axis is HORIZONTAL and parallel to the hinge row: no height of its own.
  assert.equal(pivot.y, 0);
  // ─── TURN 26 (CLAUDE.md F1.2): THE DATUM MOVED, SO THE PIVOT DID ────────
  // z: 33.5 in the file. Turn 24 stood the cup slab's NEAR end (35.3) on the
  // door's inner face and read the pivot 1.8 mm behind it. The owner measured
  // the bore at 11 mm, so the flange is the slab's FAR end less the bore
  // (51.3 − 11 = 40.3) and the same file axis is now 6.8 mm behind the leaf —
  // which is where a CLIP top's arm actually folds: BEHIND the door, in the
  // carcass opening, not a whisker inside the board.
  assert.ok(Math.abs(pivot.z - -6.8) < 1e-9, `pivot z = ${pivot.z}`);
});

test('F1.2 — moving the axis moves the pivot, one number for one number', () => {
  const min = { x: -26.5, y: -28.5, z: -29.48 };
  const moved = migrateCabinetProfile({
    ...P,
    hardware: {
      ...P.hardware,
      hinge: {
        ...P.hardware.hinge,
        cliptop: { ...P.hardware.hinge.cliptop, rig: { ...RIG, axis: { x: -7.75, z: 40 } } },
      },
    },
  });
  const pivot = foldPivotMm({ min, profile: moved });
  // 40 + 29.48 − 69.78 (turn 26's corrected origin) = −0.3.
  assert.ok(Math.abs(pivot.z - -0.3) < 1e-9, `pivot z = ${pivot.z}`);
});

/** A stand-in for a decoded CLIP top: one mesh per node of the table. */
function fakeClone() {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);
  for (const row of TABLE) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, (row.z[1] - row.z[0]) / 1000));
    mesh.name = row.node;
    mesh.position.set(0, 0, ((row.z[0] + row.z[1]) / 2) / 1000);
    inner.add(mesh);
  }
  return group;
}

test('F1.1 — keepMember cuts the clone in two, and the two halves are disjoint', () => {
  const a = keepMember(fakeClone(), P, 'A');
  const b = keepMember(fakeClone(), P, 'B');
  const namesOf = (g) => {
    const out = [];
    g.traverse((n) => { if (n.isMesh) out.push(n.name); });
    return out.sort();
  };
  assert.deepEqual(namesOf(a), [...RIG.memberA].sort());
  assert.deepEqual(namesOf(b), [...RIG.memberB].sort());
  assert.equal(a.userData.ccHingeMember, 'A');
  assert.equal(b.userData.ccHingeMember, 'B');
});

test('F1.1 — a clone holding none of a member comes back null, never an empty group', () => {
  const cupOnly = () => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh.name = 'bau0015089612';                     // member A only
    group.add(mesh);
    return group;
  };
  assert.equal(keepMember(cupOnly(), P, 'B'), null);
  assert.notEqual(keepMember(cupOnly(), P, 'A'), null);
});

/** Member B as `hingeMembers` wraps it: outer → joint → clone. */
function fakeBody() {
  const joint = new THREE.Group();
  const outer = new THREE.Group();
  outer.add(joint);
  outer.userData.ccHingeJoint = joint;
  return outer;
}

test('F1.2 — the fold is the door’s own angle, and a shut door folds by nothing', () => {
  const body = fakeBody();
  foldMemberB(body, P, 0);
  assert.equal(body.userData.ccHingeJoint.rotation.y, 0);
  const ninety = -Math.PI / 2;
  foldMemberB(body, P, ninety);
  assert.equal(body.userData.ccHingeJoint.rotation.y, ninety);
  assert.equal(body.userData.ccHingeFold, ninety);
});

test('F1.4 — with the flag OFF nothing folds, and the body hides beyond 15°', () => {
  const off = migrateCabinetProfile({
    ...P,
    hardware: {
      ...P.hardware,
      hinge: {
        ...P.hardware.hinge,
        cliptop: { ...P.hardware.hinge.cliptop, rig: { ...RIG, enabled: false } },
      },
    },
  });
  const body = fakeBody();
  foldMemberB(body, off, -Math.PI / 2);
  assert.equal(body.userData.ccHingeJoint.rotation.y, 0, 'a disabled rig never turns');

  assert.equal(rigHidesBody(off, 0), false, 'a shut door still shows its hinge');
  assert.equal(rigHidesBody(off, 15), false, 'and so does one on the threshold');
  assert.equal(rigHidesBody(off, 15.1), true, 'past it, the plate is all there is');
  assert.equal(rigHidesBody(off, 90), true);
  // …and with the rig ON, the model is never hidden: it folds instead.
  assert.equal(rigHidesBody(P, 90), false);
});

test('F1 — a profile saved before this turn comes back with the member lists', () => {
  const old = migrateCabinetProfile({
    ...P,
    hardware: {
      ...P.hardware,
      hinge: {
        ...P.hardware.hinge,
        cliptop: { ...P.hardware.hinge.cliptop, rig: undefined },
      },
    },
  });
  const rig = old.hardware.hinge.cliptop.rig;
  assert.deepEqual(rig.memberA, RIG.memberA);
  assert.deepEqual(rig.memberB, RIG.memberB);
  assert.equal(rig.enabled, true);
  assert.equal(rig.axis.z, RIG.axis.z);
});

test('F1.5 — the showroom fixture carries the table’s own node names', () => {
  // R8. The bucket answers 403 in this environment (verify/t24/bucket-live.md),
  // so the file this can open is the SYNTHETIC one — built by
  // scripts/make-fixture-hardware.mjs to the very box the owner's 71B3550
  // measures. What it proves is that the shipped member lists match the names a
  // real export carries, which is the half of F1.3 a unit test can reach.
  const bytes = readFileSync(new URL(
    '../test/fixtures/hardware-local/hardware/hinges/blum/71B3550_10001.glb',
    import.meta.url,
  ));
  const rows = meshTable(parseGlb(bytes));
  const names = rows.map((r) => r.node).sort();
  assert.deepEqual(names, [...RIG.memberA, ...RIG.memberB].sort());
  // …and each node's own far edge is the table's, to a tenth of a millimetre.
  for (const row of TABLE) {
    const got = rows.find((r) => r.node === row.node);
    assert.ok(got, `${row.node} is in the file`);
    assert.ok(
      Math.abs(got.max[2] - row.z[1]) < 0.1,
      `${row.node} reaches z ${row.z[1]}, measured ${got.max[2]}`,
    );
  }
});
