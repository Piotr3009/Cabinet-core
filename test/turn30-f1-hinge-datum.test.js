// ─── TURN 30 F1 — the hinge body stands on an ABSOLUTE datum ────────────────
//
// The owner, of a 155° wardrobe hinge: it "jest za głęboko osadzony w drzwiach
// i się nie otwiera." The lab measured the cause on 14.08.2026 and CLAUDE.md
// hands the numbers over as FINAL, forbidding re-derivation:
//
//   every Blum hinge GLB in the bucket shares ONE authoring frame, and the cup
//   datum sits at (x = −7.75, y = 0, z = 40.3) file-millimetres, ABSOLUTE.
//
// ─── WHY THE OLD PLACEMENT WAS RIGHT ON EXACTLY ONE FILE ───────────────────
//
// `modelOrigin` is MIN-RELATIVE: it says how far a file's bounding-box corner
// must travel for the cup to land on the drilled point, and it was derived from
// `71B3550_42542984`'s own min. On that file it is therefore correct BY
// CONSTRUCTION — which is precisely why three turns of green walks never caught
// it. A 155° body is longer behind the leaf, so its min is somewhere else, and
// the same subtraction carries the whole hinge in after it.
//
// This file proves four things, in the order they matter:
//
//   1. the datum is the one CLAUDE.md gives, and the flange leg of it is the
//      SAME plane turn 26 derived from the owner's 11 mm bore;
//   2. on `42542984` the two transforms are byte-identical — so F1 changes no
//      picture anybody has already approved;
//   3. on the 155° file they are 17 mm apart, and 17 mm is the fault;
//   4. `foldPivotMm` collapses to `axis − datum` and the pin does not move.
//
// R8: the bucket answers 403 in this container, so the 155° file under test is
// the SILENT SHOWROOM's own `71B7550` — written by
// `scripts/make-fixture-hardware.mjs` with the cup where the shared frame puts
// it and an arm long enough to move `min`, which is the only property of a real
// 155° export this argument needs. `verify/t30/README.md` says so rather than
// pretending the bucket answered.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { foldPivotMm } from '../src/3d/hingeModels.js';
import { parseGlb, meshTable, overallBox } from '../scripts/glb-meshes.mjs';

const C = P.hardware.hinge.cliptop;
const RIG = C.rig;
const MODELS = readFileSync(new URL('../src/3d/hingeModels.js', import.meta.url), 'utf8');
const SOURCE = readFileSync(new URL('../src/3d/glbSource.js', import.meta.url), 'utf8');
const PROFILE = readFileSync(new URL('../src/engine/profile.js', import.meta.url), 'utf8');

const SHOWROOM = new URL('./fixtures/hardware-local/hardware/hinges/blum/', import.meta.url);
const boxOf = (file) => overallBox(meshTable(parseGlb(readFileSync(new URL(file, SHOWROOM)))));

/** The 110° file the whole rig was measured on, and the 155° one that broke. */
const BOX_110 = boxOf('71B3550_10001.glb');
const BOX_155 = boxOf('71B7550_15001.glb');

// ─── 1. THE NUMBER, AND WHOSE IT IS ─────────────────────────────────────────

test('F1 the datum is CLAUDE.md’s own, to the digit, in file millimetres', () => {
  assert.deepEqual(C.fileDatum, { x: -7.75, y: 0, z: 40.3 });
});

test('F1 the datum’s z IS the flange plane turn 26 derived from the owner’s bore', () => {
  // Not a fourth measured number that could disagree with the other three:
  //   flange = cupBoreFileZ − cupDepth = 51.3 − 11 = 40.3
  // The day the owner re-measures the cup, this assertion is what stops the
  // datum being left behind — the same job `modelOrigin.z`'s identity does.
  assert.equal(C.fileDatum.z, C.cupBoreFileZ - P.hardware.hinge.cupDepth);
  assert.equal(C.fileDatum.z, 40.3);
  // …and its x is the cup's own centre line, which is a fact about the file's
  // bore and is asserted against the file's own bytes further down.
  assert.equal(C.fileDatum.x, -7.75);
  // …and it sits ON the hinge row: the row's height is the engine's, and a
  // datum with a y of its own would fight it.
  assert.equal(C.fileDatum.y, 0);
});

test('F1 profile.js gives modelOrigin the HISTORY and fileDatum the JOB', () => {
  // CLAUDE.md asks for the comment in as many words, because the two numbers
  // now look alike and the next reader must not "tidy" the survivor away.
  const at = PROFILE.indexOf('fileDatum: { x: -7.75');
  assert.ok(at > 0, 'the datum is in the profile');
  const above = PROFILE.slice(Math.max(0, at - 2200), at);
  assert.match(above, /HISTORY/, 'modelOrigin is named as the history');
  assert.match(above, /min-relative|MIN-RELATIVE/i);
  assert.match(above, /155/, 'and the file that exposed it is named');
  assert.match(above, /ABSOLUTE/);
  // The plate keeps the old path, and the profile says why rather than leaving
  // a reader to infer it from the code.
  assert.match(above, /PLATE|plate/);
});

// ─── 2. ON 42542984 THE TWO TRANSFORMS ARE THE SAME TRANSFORM ───────────────

test('F1 on the measured 110° file, −datum and −min+modelOrigin are byte-identical', () => {
  // The identity, and it is an identity rather than a coincidence:
  //   modelOrigin = min − fileDatum   ⇒   −min + modelOrigin = −fileDatum
  // Read off the FILE's own bytes, not off `fileMinZ`, so the claim is about
  // the model that ships and not about a number typed beside it.
  const min = { x: BOX_110.min[0], y: BOX_110.min[1], z: BOX_110.min[2] };
  for (const k of ['x', 'y', 'z']) {
    const old = -min[k] + C.modelOrigin[k];
    const now = -C.fileDatum[k];
    assert.ok(Math.abs(old - now) < 1e-9, `${k}: ${old} vs ${now}`);
  }
  // …so nothing the owner has already approved moves: the cup centre lands on
  // the drilled point and the bore bottom exactly 11 mm into the leaf.
  assert.ok(Math.abs((BOX_110.min[0] - C.fileDatum.x) - -18.75) < 1e-9);
  assert.equal(Math.round((BOX_110.max[2] - C.fileDatum.z) * 100) / 100, P.hardware.hinge.cupDepth);
  assert.equal(Math.round((C.fileDatum.z - C.fileDatum.z) * 100) / 100, 0, 'the flange is ON the inner face');
});

// ─── 3. ON THE 155° FILE THEY ARE SEVENTEEN MILLIMETRES APART ───────────────

test('F1 the 155° file really does have a different min — same cup, longer arm', () => {
  // What makes it a 155° hinge in this argument, and the ONLY thing that has
  // to be true of it: the cup is where the shared authoring frame puts it, and
  // the body behind the leaf is bigger.
  assert.deepEqual(BOX_155.max, BOX_110.max, 'the cup end of the file is untouched');
  assert.ok(BOX_155.min[2] < BOX_110.min[2], 'the arm reaches further back');
  assert.ok(BOX_155.min[0] < BOX_110.min[0], 'and wider');
  assert.equal(BOX_155.min[2], -46.5);
});

test('F1 THE FAULT: the old min-math sinks the 155° flange 17 mm into an 18 mm leaf', () => {
  // The old placement, arithmetically: a file point `c` renders at
  // `c − min + modelOrigin`, and the leaf's inner face is 0.
  const oldZ = (c) => c - BOX_155.min[2] + C.modelOrigin.z;
  const deep = oldZ(C.fileDatum.z);
  assert.ok(Math.abs(deep - 17.02) < 0.01, `the flange landed ${deep.toFixed(2)} mm in`);
  // In an 18 mm front that is a hinge in the last millimetre of the board —
  // the owner's "za głęboko osadzony … i się nie otwiera", as a number.
  assert.ok(deep > 18 - 1.5, 'past what an 18 mm leaf can hold');
  // …and the bore bottom would be out through the FRONT of the door.
  assert.ok(oldZ(BOX_155.max[2]) > 18, `the cup reached ${oldZ(BOX_155.max[2]).toFixed(2)} mm`);

  // THE FIX, on the same bytes: the flange on the face, the bore 11 mm in,
  // and the cup centre on the drilled point — the same three numbers the 110°
  // file gives, which is the whole claim of a shared authoring frame.
  const nowZ = (c) => c - C.fileDatum.z;
  assert.equal(nowZ(C.fileDatum.z), 0);
  assert.equal(Math.round(nowZ(BOX_155.max[2]) * 100) / 100, P.hardware.hinge.cupDepth);
  assert.ok(nowZ(BOX_155.max[2]) <= P.hardware.hinge.cupDepth + 1e-9, 'nothing deeper than its own hole');
});

test('F1 …and the same fault, one file over: the old math also slid it 7.5 mm sideways', () => {
  const oldX = (c) => c - BOX_155.min[0] + C.modelOrigin.x;
  assert.ok(Math.abs(oldX(C.fileDatum.x) - 7.5) < 1e-9, `${oldX(C.fileDatum.x)}`);
  assert.equal(C.fileDatum.x - C.fileDatum.x, 0, 'the datum puts the cup centre on the point');
});

// ─── 4. THE PIN FOLLOWS THE BODY ────────────────────────────────────────────

test('F1 foldPivotMm is axis − datum, and the pin has not moved', () => {
  const pivot = foldPivotMm({ profile: P });
  assert.ok(Math.abs(pivot.x - (RIG.axis.x - C.fileDatum.x)) < 1e-9);
  assert.ok(Math.abs(pivot.z - (RIG.axis.z - C.fileDatum.z)) < 1e-9);
  // Turn 29's measured pin, to the micron. F1 moved the BODY's datum, not the
  // knuckle — and this is the assertion that says so.
  assert.ok(Math.abs(pivot.x - -10.33) < 1e-9, `x = ${pivot.x}`);
  assert.equal(pivot.y, 0);
  assert.ok(Math.abs(pivot.z - 2.56) < 1e-9, `z = ${pivot.z}`);
});

test('F1 the pin no longer depends on WHICH file is in front of it', () => {
  // The point of the whole exercise, stated as the one thing that used to be
  // false: two files, two bounding boxes, ONE pin. Under turn 29's math the
  // 155° box would have moved it by the very 17 mm the body moved by.
  const now = foldPivotMm({ profile: P });
  const was = (min) => ({
    x: RIG.axis.x - min[0] + C.modelOrigin.x,
    z: RIG.axis.z - min[2] + C.modelOrigin.z,
  });
  assert.ok(Math.abs(was(BOX_110.min).z - now.z) < 1e-9, 'the 110° file always agreed');
  assert.ok(Math.abs(was(BOX_155.min).z - now.z) > 16, 'the 155° file never did');
  // …and `foldPivotMm` cannot be handed a bounding box to disagree with any
  // more: it does not take one.
  assert.match(MODELS, /export function foldPivotMm\(\{ profile \}\)/);
});

// ─── THE CODE SAYS IT, AND THE PLATE IS LEFT ALONE ─────────────────────────

test('F1 the BODY is cloned by datum and the PLATE by its origin', () => {
  assert.match(MODELS, /const D = plate \? null : C\.fileDatum;/);
  assert.match(MODELS, /\{ datum: \{ x: mm\(D\.x\), y: mm\(D\.y\), z: mm\(D\.z\) \} \}/);
  assert.match(MODELS, /\{ origin: \{ x: mm\(O\.x\), y: mm\(O\.y\), z: mm\(O\.z\) \} \}/);
  // …and the loader honours it without consulting the box.
  assert.match(SOURCE, /clone\.position\.set\(-\(datum\.x \|\| 0\), -\(datum\.y \|\| 0\), -\(datum\.z \|\| 0\)\);/);
  // The plate's own path is untouched, which is CLAUDE.md's instruction in as
  // many words — "the owner's plate is right today".
  assert.deepEqual(C.plateOrigin, { x: 0, y: -26.5, z: -20.75 });
  assert.equal(C.plateSpinDeg, 180);
});

test('F1 a profile saved before this turn comes back with a datum', () => {
  // A stored profile has no `fileDatum` at all, and a hinge that could not be
  // placed would be a hinge that does not render. Merged key by key like the
  // origins beside it.
  const old = JSON.parse(JSON.stringify(P));
  delete old.hardware.hinge.cliptop.fileDatum;
  const back = migrateCabinetProfile(old);
  assert.deepEqual(back.hardware.hinge.cliptop.fileDatum, { x: -7.75, y: 0, z: 40.3 });
  // …and a workshop that HAS tuned one keeps its own number.
  const tuned = JSON.parse(JSON.stringify(P));
  tuned.hardware.hinge.cliptop.fileDatum = { x: -7.75, y: 0, z: 41 };
  assert.equal(migrateCabinetProfile(tuned).hardware.hinge.cliptop.fileDatum.z, 41);
});

// ─── AND IT IS STILL A COSTUME ON THE SCREWS ───────────────────────────────

test('F1 no hole moved: the datum is a picture and reaches no drill', () => {
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /fileDatum/);
  const doors = readFileSync(new URL('../src/engine/doors.js', import.meta.url), 'utf8');
  assert.doesNotMatch(doors, /fileDatum/);
});
