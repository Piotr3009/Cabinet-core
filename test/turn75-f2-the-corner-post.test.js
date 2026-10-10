// ─── T75 · F2 · THE CORNER POST, THE CORNER STOP, RULE 7 ───────────────────
//
// CLAUDE.md T75 F2: *"A corner post is an AUTO-PART, the sibling of the side
// infill ... a board of the FRONT material and front thickness,
// `profile.corner.postMm` wide, standing in the front plane of run B at the
// corner ... BOM role `corner_post`, cut list line, CNC a plain rectangle.
// The CORNER STOP: a unit on wall B that approaches a corner where wall A's run
// ends in a BLIND kit or a plain unit stops at `d_A_face + postMm` ... landing
// on the stop with the magnet ... and the post appears when the unit lands.
// Pulling away removes the post ... Rule 7 gets its number:
// `profile.doors.clearance.corner = 3`."*
//
// The owner, 9.10.2026: *"daj od razu narożniki przemyślane."*

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { clearanceMatrix, NEIGHBOUR } from '../src/engine/frontClearance.js';
import { ELEMENT_TO_PART_ID, partIdForElement } from '../src/engine/partRegistry.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);

test('F2 · the numbers are the profile\'s, marked proposed: post 50, rule 7 at 3', () => {
  assert.equal(P.corner.postMm, 50);
  assert.equal(P.doors.clearance.corner, 3);
  assert.equal(clearanceMatrix(P)[NEIGHBOUR.CORNER], 3);
  // A profile that names no corner number keeps rule 7 parked, as T31 had it.
  const bare = { ...P, doors: { ...P.doors, clearance: { ...P.doors.clearance, corner: undefined } } };
  assert.equal(clearanceMatrix(bare)[NEIGHBOUR.CORNER], null);
});

test('F2 · the engine cuts the post it is given: front material, door plane, carcass high', () => {
  const p = { ...defaultParamsFor('BUD', P), unit_num: '01', corner_post_left_mm: 50 };
  const r = computeCabinet(p, P);
  const post = r.panels.find((x) => x.role === 'corner_post');
  assert.ok(post, 'no post');
  assert.equal(post.id, 'CORNER-POST-L');
  assert.equal(post.material_role, 'front');
  assert.equal(post.finish_exposed, true);
  assert.equal(post.thickness, P.front.thickness);
  assert.deepEqual(post.box, {
    x: -50, y: 0, z: p.depth + P.doors.gap + P.front.thickness - P.front.thickness, w: 50, h: p.height, d: P.front.thickness,
  });
  assert.equal(post.cnc.outline.length, 4, 'a plain rectangle');
  assert.ok(r.csvLines.includes(`01,CORNER-POST-L,50,${p.height},<>,1.54,0.039`), r.csvLines.join('\n'));
  assert.equal(partIdForElement('CORNER-POST'), 'corner_post');
  assert.equal(ELEMENT_TO_PART_ID['CORNER-POST'], 'corner_post');
  // …and a unit with no key cuts exactly what it always did.
  const plain = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  assert.equal(plain.panels.filter((x) => x.role === 'corner_post').length, 0);
});

function corner() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUD');
  const a = S().units[0].id;
  S().moveUnit(a, 4000, 0);
  S().addUnit('BUD');
  const b = S().units[1].id;
  S().setUnitWall(b, 1);
  return { a, b };
}

test('F2 · run B lands ON the stop with the magnet, and the post appears', () => {
  const { a, b } = corner();
  S().moveUnit(b, 0, 0);
  const face = 10 + U(a).params.depth + P.doors.gap + U(a).params.front_t;
  assert.equal(U(b).position.x_mm, face + P.corner.postMm, 'B stopped on A\'s face plus the post');
  assert.equal(U(b).params.corner_post_left_mm, 50, 'the post appears when the unit lands');
  const post = S().unitResult(b).panels.find((x) => x.role === 'corner_post');
  assert.ok(post);
  assert.equal(post.box.x, -50, 'on B\'s corner side');
  // The corner is answered: no Check #27.
  assert.equal(S().runChecks().filter((f) => f.check === 27).length, 0);
});

test('F2 · pulled away, the post goes; pushed back, it returns', () => {
  const { b } = corner();
  S().moveUnit(b, 0, 0);
  S().moveUnit(b, 1200, 0);
  assert.equal(U(b).params.corner_post_left_mm, undefined, 'the post outlived its reason');
  assert.equal(S().unitResult(b).panels.filter((x) => x.role === 'corner_post').length, 0);
  S().moveUnit(b, 0, 0);
  assert.equal(U(b).params.corner_post_left_mm, 50);
});

test('F2 · rule 7 measures: the door beside the post stands 3 inside its carcass end', () => {
  const { a, b } = corner();
  S().addDoors(a);
  S().addDoors(b);
  S().moveUnit(b, 0, 0);
  const row = S().frontClearances().find((r) => r.unitId === b);
  assert.ok(row, 'B has no front row');
  assert.equal(row.edges.left.kind, NEIGHBOUR.CORNER);
  assert.equal(row.edges.left.parked, false, 'the Check that said "parked" now measures');
  assert.equal(row.edges.left.wantClearanceMm, 3);
  assert.equal(row.edges.left.haveClearanceMm, 3);
});
