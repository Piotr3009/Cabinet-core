// ─── T75 · F8 · REVERSIBILITY: WHAT THE CORNER AUTOMAT ADDS, IT TAKES BACK ──
//
// CLAUDE.md T75 F8: *"Everything the corner automat adds (post, hinge flip,
// blank size, worktop joint, plinth butt, cornice return) is undone when the
// cause goes (T74 F11's law, one function). What the client chose by hand
// stays."*  The one function is the store's choke point, `refreshAutoParts`
// (with the design layer's `worktopsFor` read off the same units): every one
// of the six is DERIVED there from where the units stand, so the cause going
// is the thing going. The walk (a) to (f) is `scripts/t75-walk.mjs`.
//
// The owner, 9.10.2026: *"daj od razu narożniki przemyślane."*

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners } from '../src/engine/room.js';
import { segmentCornice, corniceSegments } from '../src/engine/cornice.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);

function corner(typeA = 'BUD') {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit(typeA);
  const a = S().units[0].id;
  S().moveUnit(a, 4000, 0);
  S().addUnit('BUD');
  const b = S().units[1].id;
  S().setUnitWall(b, 1);
  S().moveUnit(b, 0, 0);
  return { a, b };
}

test('F8 · the post, the plinth butt and the hinge flip: made on the stop, unmade off it', () => {
  const { b } = corner();
  S().addDoors(b);
  S().refreshAutoParts();
  // AMENDED BY T78 F10 (12.10.2026): the post is the owner's 40 (profile.corner.postMm), decided.
  assert.equal(U(b).params.corner_post_left_mm, P.corner.postMm, 'the post');
  assert.ok(S().unitResult(b).panels.find((p) => p.id === 'PLINTH').meta.corner, 'the plinth butt');
  const hinged = U(b).params.doors.hinge;
  S().moveUnit(b, 1500, 0);
  assert.equal(U(b).params.corner_post_left_mm ?? 0, 0, 'the post went');
  assert.equal(S().unitResult(b).panels.find((p) => p.id === 'PLINTH').meta?.corner, undefined, 'the butt went');
  assert.equal(U(b).params.corner_hinge_auto ?? null, null, 'the automat\'s record of the flip went');
  // Back on the stop, all of it comes back: it is derived, not remembered.
  S().moveUnit(b, 0, 0);
  assert.equal(U(b).params.corner_post_left_mm, P.corner.postMm);
  assert.equal(U(b).params.doors.hinge, hinged);
});

test('F8 · a hinge the client turned by hand stays when the cause goes', () => {
  const { b } = corner();
  S().addDoors(b);
  S().refreshAutoParts();
  const auto = U(b).params.doors.hinge;
  const hand = auto === 'L' ? 'R' : 'L';
  S().setDoors(b, { ...U(b).params.doors, hinge: hand });
  S().moveUnit(b, 1500, 0);
  assert.equal(U(b).params.doors.hinge, hand, 'the client\'s hinge is the client\'s');
});

test('F8 · the blind blank: the corner\'s size on the stop, the kit\'s own off it; the client\'s own stays', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BLIND_BASE');
  const bb = S().units[0].id;
  S().moveUnit(bb, 4000, 0);
  S().addDoors(bb);
  assert.equal(U(bb).params.doors.count, 1, 'a blind corner is fitted with ONE leaf, the kit\'s own count');
  const blank = () => S().unitResult(bb).panels.find((p) => p.role === 'blind_blank')?.w;
  const alone = blank();
  S().addUnit('BUD');
  const c = S().units.at(-1).id;
  S().setUnitWall(c, 1);
  S().moveUnit(c, 0, 0);
  const onCorner = blank();
  assert.notEqual(onCorner, alone, 'the corner sizes the blank');
  S().moveUnit(c, 1500, 0);
  assert.equal(blank(), alone, 'the cause gone, the blank is the kit\'s again');
  // The client's own blank width is never taken back.
  S().updateUnitParams(bb, { blind_mm_own: 500 });
  S().moveUnit(c, 0, 0);
  S().moveUnit(c, 1500, 0);
  assert.equal(U(bb).params.blind_mm_own, 500);
});

test('F8 · the worktop joint: two slabs and a butt on the corner; pulled away, two straight slabs and no joint', () => {
  const { a, b } = corner();
  const w = S().addWorktop([a, b]);
  assert.equal(w.ok, true, w.error);
  const on = S().worktopsOf();
  assert.equal(on.length, 2);
  assert.ok(on.every((s) => (s.joint || s.geometry.joint)?.kind === 'butt'), 'one butt joint record');
  S().moveUnit(b, 1500, 0);
  const off = S().worktopsOf();
  assert.equal(off.length, 2, 'each wall keeps a slab');
  assert.ok(off.every((s) => !(s.joint || s.geometry.joint)), 'the joint went with the corner');
  S().moveUnit(b, 0, 0);
  assert.ok(S().worktopsOf().every((s) => (s.joint || s.geometry.joint)?.kind === 'butt'), 'and came back with it');
});

test('F8 · the cornice return: present while the shallower neighbour meets it, gone with it', () => {
  const unitAt = (id, type, x, params = {}) => ({
    id, type, position: { x_mm: x, wall: 0 }, params: { ...defaultParamsFor(type, P), unit_num: id, ...params },
  });
  const tall = unitAt('t1', 'BUDTALL', 600, { cornice: 70, top_infill_mm: 40 });
  const run = {
    wall: 0, mount: 'floor', units: [tall], top: 0, left: 600, right: 600 + tall.params.width,
  };
  const [segment] = corniceSegments(run, P);
  const base = {
    wall: 0, wallWidth: 4000, roomHeight: 2700, frontFaceDepth: { left: 578, right: 578 },
  };
  const open = segmentCornice(segment, base, P);
  const stepped = segmentCornice(segment, {
    ...base, neighbourAt: { left: null, right: { height: 70, depth: 350, top: open.top, unitId: 'w' } },
  }, P);
  assert.equal(stepped.returnEnds.right, 'internal');
  const alone = segmentCornice(segment, { ...base, neighbourAt: { left: null, right: null } }, P);
  assert.equal(alone.returnEnds, undefined, 'the neighbour gone, the step return is gone');
});
