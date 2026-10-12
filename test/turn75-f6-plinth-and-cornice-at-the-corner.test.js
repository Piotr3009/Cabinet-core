// ─── T75 · F6 · PLINTH AND CORNICE AT THE CORNER ────────────────────────────
//
// CLAUDE.md T75 F6: *"PLINTH, internal corner: the plinth of the run that
// STARTS at the corner is lengthened to butt the face of the other run's
// plinth under the post (square butt, no mitre: the owner's "no 45° cuts")
// ... CORNICE, BLOCKERS #92, decided for the owner as
// `profile.cornice.cornerMode = 'step'` (T75 proposed): where a deeper run
// meets a shallower one at a corner, the cornice takes an external mitre at
// the deeper unit's front corner, returns along its side for the depth
// difference, and meets the shallower run's cornice in an internal mitre.
// `corniceCorner` stops refusing unequal depths and emits the return piece;
// the refusal sentence stays for the case the profile does not name."*
//
// The owner, 9.10.2026: *"daj od razu narożniki przemyślane."*

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { rectCorners } from '../src/engine/room.js';
import { runEnd, runPlinthParams } from '../src/engine/runs.js';
import {
  corniceCorner, corniceOrder, corniceSegments, corniceSolids, segmentCornice,
} from '../src/engine/cornice.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);

function corner() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUD');
  const a = S().units[0].id;
  S().moveUnit(a, 4000, 0);
  S().addUnit('BUD');
  const b = S().units[1].id;
  S().setUnitWall(b, 1);
  S().moveUnit(b, 0, 0);
  return { a, b };
}

// ─── THE PLINTH ─────────────────────────────────────────────────────────────

test('F6 · run B\'s kick is carried on to the FACE of run A\'s kick, square', () => {
  const { a, b } = corner();
  const setback = P.autoParts.plinth.setback;
  const faceA = 10 + U(a).params.depth - setback;
  const ext = U(b).position.x_mm - faceA;
  assert.equal(faceA, 518);
  // AMENDED BY T78 F10 (12.10.2026): the post is the owner's 40 (profile.corner.postMm),
  // so B stands on the stop at 596 + 40 = 636 and the kick is carried 118, not 128.
  assert.equal(ext, 596 + P.corner.postMm - faceA, 'B stands on the stop at A\'s face + the post; A\'s kick face is at 518');
  const plinth = S().unitResult(b).panels.find((x) => x.id === 'PLINTH');
  assert.ok(plinth);
  assert.equal(plinth.box.x, -ext, 'it starts at A\'s kick face');
  assert.equal(plinth.box.w, U(b).params.width + ext);
  assert.equal(plinth.meta.corner.butt, 'square', 'no 45° cut');
  assert.equal(plinth.meta.corner.mm, ext);
  assert.equal(plinth.meta.corner.faceOf, a);
  assert.ok(S().unitResult(b).csvLines.some((l) => l.startsWith(`02,PLINTH,${U(b).params.width + ext},`)));
  // Run A runs into the corner and keeps its own kick, unchanged.
  const kickA = S().unitResult(a).panels.find((x) => x.id === 'PLINTH');
  assert.equal(kickA.box.w, U(a).params.width);
  assert.equal(kickA.meta?.corner, undefined);
});

test('F6 · pulled away, the butt goes with the post', () => {
  const { b } = corner();
  S().moveUnit(b, 1500, 0);
  assert.equal(U(b).params.corner_post_left_mm ?? 0, 0);
  const plinth = S().unitResult(b).panels.find((x) => x.id === 'PLINTH');
  assert.equal(plinth.box.w, U(b).params.width);
  assert.equal(plinth.meta?.corner, undefined);
});

test('F6 · runPlinthParams without corners answers what it always did', () => {
  const units = [
    { id: 'u1', type: 'BUD', position: { wall: 0, x_mm: 0 }, params: { ...defaultParamsFor('BUD', P), plinth: true } },
  ];
  const bare = runPlinthParams(units, P);
  const none = runPlinthParams(units, P, { corners: [] });
  assert.deepEqual([...none], [...bare]);
  assert.equal(bare.get('u1').corner, undefined);
});

test('F6 · an L corner is left alone: the L cuts its own two plinths (F4)', () => {
  const units = [
    { id: 'a', type: 'BUD', position: { wall: 0, x_mm: 3360 }, params: { ...defaultParamsFor('BUD', P), plinth: true } },
    { id: 'b', type: 'BUD', position: { wall: 1, x_mm: 646 }, params: { ...defaultParamsFor('BUD', P), plinth: true } },
  ];
  const c = {
    kind: 'internal', solution: 'L', runA: { unitId: 'a' }, runB: { unitId: 'b', gapMm: 646, side: 'left' },
  };
  assert.equal(runPlinthParams(units, P, { corners: [c] }).get('b').corner, undefined);
  const post = { ...c, solution: 'post' };
  assert.equal(runPlinthParams(units, P, { corners: [post] }).get('b').corner.mm, 128);
});

test('F6 · a run that stops on the post ENDS there: kind corner, at the post\'s outer edge', () => {
  const { b } = corner();
  const unit = U(b);
  const run = { wall: 1, units: [unit], left: unit.position.x_mm, right: unit.position.x_mm + unit.params.width };
  const end = runEnd(run, 'left', { wallWidth: 3000, roomHeight: 2500 }, P);
  assert.equal(end.kind, 'corner');
  // AMENDED BY T78 F10: the post's outer edge is the owner's 40 from the unit.
  assert.equal(end.x, unit.position.x_mm - P.corner.postMm);
  // The other end of the same run is what it always was.
  assert.notEqual(runEnd(run, 'right', { wallWidth: 3000, roomHeight: 2500 }, P).kind, 'corner');
});

// ─── THE CORNICE ────────────────────────────────────────────────────────────

const at = (height, depth, top) => ({ height, depth, top, unitId: 'other' });

test('F6 · the number is the profile\'s, marked proposed: cornerMode step', () => {
  assert.equal(P.autoParts.cornice.cornerMode, 'step');
  // A saved profile from before tonight is given the mode by the migration.
  const old = { ...P, autoParts: { ...P.autoParts, cornice: { ...P.autoParts.cornice } } };
  delete old.autoParts.cornice.cornerMode;
  assert.equal(migrateCabinetProfile(old).autoParts.cornice.cornerMode, 'step');
});

test('F6 · BLOCKERS #92 decided: the DEEPER end returns for the difference, the SHALLOWER end mitres internally', () => {
  const deeper = corniceCorner({ mine: { height: 70, depth: 578, top: 2400 }, theirs: at(70, 350, 2400) }, P);
  assert.equal(deeper.refused, undefined, 'no refusal under the step');
  assert.equal(deeper.mitre, true, 'external mitre at the deeper unit\'s front corner');
  assert.deepEqual(deeper.step, { role: 'deeper', returnMm: 228 });
  const shallower = corniceCorner({ mine: { height: 70, depth: 350, top: 2400 }, theirs: at(70, 578, 2400) }, P);
  assert.equal(shallower.refused, undefined);
  assert.equal(shallower.mitre, 'internal');
  assert.deepEqual(shallower.step, { role: 'shallower' });
  // Two HEIGHTS still refuse: no step joins a 70 to a 100.
  const heights = corniceCorner({ mine: { height: 70, depth: 578, top: 2400 }, theirs: at(100, 350, 2400) }, P);
  assert.equal(heights.refused, true);
});

test('F6 · the refusal sentence stays for the profile that names no mode', () => {
  const unnamed = {
    ...P, autoParts: { ...P.autoParts, cornice: { ...P.autoParts.cornice, cornerMode: undefined } },
  };
  const refused = corniceCorner({ mine: { height: 70, depth: 578, top: 2400 }, theirs: at(70, 350, 2400) }, unnamed);
  assert.equal(refused.refused, true);
  assert.match(refused.message, /BLOCKERS #92/);
});

const unitAt = (id, type, x, params = {}) => ({
  id, type, position: { x_mm: x, wall: 0 }, params: { ...defaultParamsFor(type, P), unit_num: id, ...params },
});
const runOf = (units) => ({
  wall: 0, mount: 'floor', units, top: 0,
  left: Number(units[0].position.x_mm) || 0,
  right: (Number(units[units.length - 1].position.x_mm) || 0) + (units[units.length - 1].params.width || 0),
});

test('F6 · the element carries the return piece and the second mitre; the order counts both', () => {
  const tall = unitAt('t1', 'BUDTALL', 600, { cornice: 70, top_infill_mm: 40 });
  const [segment] = corniceSegments(runOf([tall]), P);
  const step = segmentCornice(segment, {
    wall: 0, wallWidth: 4000, roomHeight: 2700, frontFaceDepth: { left: 578, right: 578 },
    neighbourAt: { left: null, right: at(70, 350, 0) },
  }, P);
  // The neighbour's top has to match for a corner; read it off a plain open run.
  const open = segmentCornice(segment, {
    wall: 0, wallWidth: 4000, roomHeight: 2700, frontFaceDepth: { left: 578, right: 578 },
  }, P);
  const element = segmentCornice(segment, {
    wall: 0, wallWidth: 4000, roomHeight: 2700, frontFaceDepth: { left: 578, right: 578 },
    neighbourAt: { left: null, right: at(70, 350, open.top) },
  }, P);
  assert.ok(step);
  assert.equal(element.corners.right.step.role, 'deeper');
  assert.equal(element.returns.right, 228, 'returns along its side for the depth difference');
  assert.equal(element.returnEnds.right, 'internal');
  assert.equal(element.mitres.right, true);
  const order = corniceOrder(element, P);
  const plain = corniceOrder({ ...element, returnEnds: undefined }, P);
  assert.equal(order.corners, plain.corners + 1, 'the return\'s far end is a second mitre');
  // An element with no step carries exactly the keys it did.
  assert.equal(open.returnEnds, undefined);
});

test('F6 · the solids: the return stops on the shallower front, the internal mitre slides back', () => {
  const element = {
    role: 'owner', offset: 0, length: 600, height: 70, depth: 60,
    mitres: { left: 'internal', right: true },
    returns: { left: 0, right: 228 },
    returnEnds: { left: 'wall', right: 'internal' },
  };
  const solids = corniceSolids(element, { carcassTop: 2300, doorPlane: 578, backZ: 0 }, P);
  const front = solids.find((s) => s.id === 'front');
  assert.ok(front);
  // The internal LEFT end slides the other way: each point stops short of the
  // long point by its own depth, so the outer face ends inside the length.
  for (const p of front.a) assert.ok(p[0] >= 0);
  assert.ok(front.a.some((p) => p[0] > 0));
  const ret = solids.find((s) => s.id === 'return-right');
  assert.ok(ret, 'the return piece is drawn');
  assert.equal(ret.b[0][2], 578 - 228, 'it ends on the shallower front, not on the wall');
  for (const p of ret.b) assert.ok(p[2] < 578 && p[2] > 0);
});
