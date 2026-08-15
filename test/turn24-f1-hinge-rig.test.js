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

// ─── CHAT FIX 13.08.2026: AND THE REAL FILE'S OWN NAMES ─────────────────────
// The bucket GLB appends the Blum article to every node:
// `bau0015089612_v(71B355M0101)`. Turn 29 matched by equality, every name
// missed, and the z fallback glued the ARM (zMax 46.2 > 30) to the door — the
// owner's "zawiasy się nie łamią". This table is the five names AS THE REAL
// FILE SPELLS THEM; the arm row is the one that proves the NAME won, because
// the fallback alone would answer 'A' for it.
const REAL_TABLE = [
  { node: 'bau0015089612_v(71B355M0101)', z: [35.3, 51.3], member: 'A' },
  { node: 'bau0015088783_v(71T310-04)', z: [39.4, 50.1], member: 'A' },
  { node: 'bau0015088853_v(70T310-0502)', z: [31.1, 44.9], member: 'A' },
  { node: 'bau0015088251_v(70T310M0201)', z: [-28.0, 46.2], member: 'B' },
  { node: 'bau0019416036_v(70T510M1402)', z: [-29.4, 22.5], member: 'B' },
];

test('F1.1 — the REAL file\'s suffixed names land by NAME, not by the fallback', () => {
  for (const row of REAL_TABLE) {
    assert.equal(
      memberOfNode(row.node, RIG, row.z[1]),
      row.member,
      `${row.node} belongs to member ${row.member}`,
    );
  }
  // The proof the name did the work: strip the rig and the arm's own zMax
  // sends it to the WRONG member — exactly the turn-29 failure on the eye.
  assert.equal(memberOfNode('bau0015088251_v(70T310M0201)', {}, 46.2), 'A');
});

test('F1.1 — the two lists partition the model: no node in both, none missing', () => {
  const a = new Set(RIG.memberA);
  const b = new Set(RIG.memberB);
  for (const node of a) assert.equal(b.has(node), false, `${node} is in one list only`);
  // CHAT FIX 14.08.2026: the lists grew past this one file — they now name
  // every bucket family's nodes (the owner's 155° door is why). So the
  // contract on THIS table is coverage, not equality: all five of the
  // measured file's components are named, in exactly one list each.
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
  // ─── TURN 29 (CLAUDE.md F5): THE AXIS IS MEASURED NOW ───────────────────
  //
  // Turn 24 shipped starting numbers (x −7.75 — the cup's own centre line —
  // and z 33.5) and said the first person to see the fold beside a real
  // cabinet corrects THOSE TWO and nothing else. The lab measured them on
  // `71B3550_42542984.glb` and render-verified: x = −0.01808 m, z = +0.04286 m.
  //
  // Through the clone's own transform that is:
  //
  //   x  −18.08 + 7.75 = −10.33   ten millimetres towards the arm, off the
  //                               cup's centre line
  //   z   42.86 − 40.3 = +2.56    a whisker INSIDE the leaf, which is where a
  //                               CLIP top's knuckle sits
  //
  // ─── TURN 30 (CLAUDE.md F1) ────────────────────────────────────────────
  // The transform used to be `axis − min + modelOrigin`; it is `axis −
  // fileDatum` now, because the BODY is placed by its absolute datum and the
  // pin goes through whatever the body goes through. Same two numbers on this
  // file — the arithmetic below is `min` and `modelOrigin` cancelling — and a
  // pin that no longer moves when a 155° export brings a bigger bounding box.
  assert.ok(Math.abs(pivot.x - (P.hardware.hinge.cliptop.rig.axis.x
    - P.hardware.hinge.cliptop.fileDatum.x)) < 1e-9);
  assert.ok(Math.abs(pivot.x - -10.33) < 1e-9, `pivot x = ${pivot.x}`);
  // The axis is HORIZONTAL and parallel to the hinge row: no height of its own.
  assert.equal(pivot.y, 0);
  assert.ok(Math.abs(pivot.z - 2.56) < 1e-9, `pivot z = ${pivot.z}`);
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
  // The fake models ONE file — `42542984`'s five-node table above — while
  // the profile's lists cover every bucket family since the 14.08 chat fix;
  // so the contract here is the FILE's own names, spelt out.
  assert.deepEqual(namesOf(a), ['bau0015088783', 'bau0015088853', 'bau0015089612']);
  assert.deepEqual(namesOf(b), ['bau0015088251', 'bau0019416036']);
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
  // ─── TURN 29 (CLAUDE.md F5): THE SAME ANGLE, FROM THE OTHER END ─────────
  //
  // Member B rides the LEAF now and folds BACK through the leaf's own angle,
  // so the joint turns the other way and the two halves keep one knuckle. The
  // magnitude is untouched — it is still the door's own angle, and a shut door
  // still folds by nothing.
  const ninety = -Math.PI / 2;
  foldMemberB(body, P, ninety);
  assert.equal(body.userData.ccHingeJoint.rotation.y, -ninety);
  assert.equal(body.userData.ccHingeFold, -ninety);
  // …and it stops at the ironmongery's own limit: a CLIP top opens to 110°.
  foldMemberB(body, P, Math.PI);
  assert.ok(Math.abs(body.userData.ccHingeFold + (110 * Math.PI) / 180) < 1e-9,
    `a 180° door still folds 110°, not ${body.userData.ccHingeFold}`);
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
  // ─── TURN 29 (CLAUDE.md F5): …AND A KNUCKLE ON THE MEASURED PIN ─────────
  // The showroom grew three more meshes this turn — member A's two knuckle
  // lugs and member B's barrel between them, all on the fold axis — so a NAME
  // may now appear more than once. The set is what the member lists are about;
  // the count is a modelling detail and asserting it would make the fixture
  // harder to improve for no gain.
  const names = [...new Set(rows.map((r) => r.node))].sort();
  // ─── CHAT FIX 13.08.2026: THE FIXTURE SPELLS NAMES LIKE THE REAL FILE ───
  // The real export appends the article: `bau0015089612_v(71B355M0101)`, and
  // the showroom now does too — this very mismatch is how the equality bug
  // hid. So the assertion is the prefix relation, both ways: every fixture
  // node begins with exactly one shipped member name, and every shipped name
  // opens at least one fixture node.
  const shipped = [...RIG.memberA, ...RIG.memberB];
  for (const n of names) {
    assert.equal(shipped.filter((m) => n.startsWith(m)).length, 1,
      `${n} begins with exactly one shipped member name`);
  }
  // CHAT FIX 14.08.2026: the lists name every bucket family now, and the
  // showroom models ONE of them — so the round trip is asked of the FIVE
  // names this fixture is built to, not of names that belong to a 155°
  // or a 95° export.
  for (const m of ['bau0015089612', 'bau0015088783', 'bau0015088853', 'bau0015088251', 'bau0019416036']) {
    assert.ok(names.some((n) => n.startsWith(m)), `${m} opens a fixture node`);
  }
  // …and each node's own far edge is the table's, to a tenth of a millimetre.
  for (const row of TABLE) {
    const got = rows.filter((r) => r.node.startsWith(row.node));
    assert.ok(got.length, `${row.node} is in the file`);
    const far = Math.max(...got.map((r) => r.max[2]));
    assert.ok(
      Math.abs(far - row.z[1]) < 0.1,
      `${row.node} reaches z ${row.z[1]}, measured ${far}`,
    );
  }
});
