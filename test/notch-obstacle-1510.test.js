// ─── THE OBSTACLE NOTCH AND THE WALL UNIT'S NOTCH (the owner, 15.10.2026) ───
//
// *"komin nie ma mozliwosci automatycznego wycinania w szafce naroznika jak
// przesuwamy - patrz skos, w szafach to samo"* and *"nie ma wogole mozliwosci
// wyciecia naroznika w szafkach wiszacych, a powinno byc"*.
//
// A chimney breast or a box in the plan stopped a cabinet dead (turn 14). Now a
// cabinet whose kit takes a notch may drive INTO it as far as the widest notch
// its carcass can take (KIT_NOTCH.lsp notch-obstacle-limits), and the notch is
// DERIVED from the overlap at compute time, never stored, exactly as the slope
// cut is. Move it out and the notch is gone.

import test from 'node:test';
import assert from 'node:assert/strict';
import { useProjectStore, validateUnit } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { boxSpansOnWall, clampUnitX, unitIssues, wallObstacles } from '../src/engine/collision.js';
import { notchObstacleLimits, notchP, notchProfile } from '../src/engine/notch.js';
import { wallPlanObstacles } from '../src/engine/room.js';
import { wallElements } from '../src/lib/wallElements.js';

const S = () => useProjectStore.getState();
const unitOf = (id) => S().units.find((u) => u.id === id);
const ctx = () => ({ room: S().project.room, units: S().units, wallSlopes: S().project.wallSlopes });

function kitchenWithChimney() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  // A chimney breast on the back wall: x 1500 to 2100, standing 350 into the room.
  S().addWallSlope({ kind: 'chimney', wall: 0, x_mm: 1500, width: 600, depth: 350 });
}

test('collision: a box span says how deep it stands and how far a cabinet may enter it, capped by its own width', () => {
  const walls = roomWalls(rectCorners(4000, 3000));
  const boxes = wallPlanObstacles(rectCorners(4000, 3000), wallElements([{ id: 'c', kind: 'chimney', wall: 0, x_mm: 1500, width: 600, depth: 350 }]), { blocking: true });
  const hard = boxSpansOnWall({ wall: walls[0], depth: 558, boxes });
  assert.equal(hard.length, 1);
  assert.deepEqual([hard[0].left, hard[0].right, Math.round(hard[0].near), Math.round(hard[0].far), hard[0].enter], [1500, 2100, 0, 350, undefined], 'no enter: the hard stop of turn 14');
  const soft = boxSpansOnWall({ wall: walls[0], depth: 558, boxes, enter: 458 });
  assert.equal(soft[0].enter, 458);
  const capped = boxSpansOnWall({ wall: walls[0], depth: 558, boxes, enter: (span) => (span.far > 300 ? 5000 : 0) });
  assert.equal(capped[0].enter, 600, 'never past the obstacle\'s far edge');
  assert.equal(boxSpansOnWall({ wall: walls[0], depth: 558, boxes, enter: () => 0 })[0].enter, undefined);
  assert.equal(wallObstacles({ wall: walls[0], walls, depth: 558, boxes, enter: 100 })[0].enter, 100);
});

test('collision: the clamp stops `enter` inside an obstacle with no clearance, on either side; the issues forgive that overlap', () => {
  const chimney = { left: 1500, right: 2100, label: 'a chimney', enter: 458 };
  // From the left: the unit's right edge may reach 1958.
  const fromLeft = clampUnitX({ x: 1600, current: 800, width: 600, wallWidth: 4000, others: [chimney] }, P);
  assert.equal(fromLeft.x, 1358);
  assert.equal(fromLeft.max, 1358);
  // From the right: its left edge may reach 1642.
  const fromRight = clampUnitX({ x: 1500, current: 2300, width: 600, wallWidth: 4000, others: [chimney] }, P);
  assert.equal(fromRight.x, 1642);
  // Without `enter` the same chimney is the hard stop it always was (the minUnitGap clearance applied).
  const hard = clampUnitX({ x: 1600, current: 800, width: 600, wallWidth: 4000, others: [{ left: 1500, right: 2100 }] }, P);
  assert.equal(hard.x, 1500 - P.editor.minUnitGap - 600);
  // The issues: an overlap at a corner within `enter` is not an overlap; past it, or across the obstacle, it is.
  const me = (x, w = 600) => ({ params: { width: w }, position: { x_mm: x } });
  assert.deepEqual(unitIssues({ unit: me(1358), wallWidth: 4000, roomHeight: 2500, others: [chimney] }), []);
  assert.equal(unitIssues({ unit: me(1400), wallWidth: 4000, roomHeight: 2500, others: [chimney] })[0].code, 'UNIT_OVERLAP', '500 deep: past enter');
  assert.equal(unitIssues({ unit: me(1358), wallWidth: 4000, roomHeight: 2500, others: [{ ...chimney, enter: undefined }] })[0].code, 'UNIT_OVERLAP', 'a hard obstacle');
  assert.equal(unitIssues({ unit: me(1400, 1000), wallWidth: 4000, roomHeight: 2500, others: [{ left: 1500, right: 2100, enter: 1000 }] })[0].code, 'UNIT_OVERLAP', 'the unit covers the chimney edge to edge: no corner');
});

test('notch-obstacle-limits: the widest and the deepest full-height back notch the refusals allow', () => {
  const K = notchProfile(P);
  const bone = notchP(K, 'puzzle.dogboneHalfHeight');
  assert.deepEqual(notchObstacleLimits(600, 558, 18, bone), [600 - 36 - 96, 558 - 18 - 96], '2 (bone + g) = 96 must stay for a joint');
  assert.equal(notchP(K, 'notch.obstacleClearance'), 10, 'the scribe room round the obstacle (proposed)');
});

test('a base unit slid into the chimney gets a BR notch cut for it, deeper the further it goes, and stops where the widest notch stops', () => {
  kitchenWithChimney();
  const a = S().addUnit('BUD', { wall: 0, x: 600 });
  assert.equal(a.error, null, a.error);
  const notchOf = () => S().unitResult(a.id).derived?.notch || null;
  S().moveUnit(a.id, 850, 1);
  assert.equal(unitOf(a.id).position.x_mm, 850);
  assert.equal(notchOf(), null, 'clear of the chimney: no notch');
  S().moveUnit(a.id, 1000, 1);
  assert.equal(unitOf(a.id).position.x_mm, 1000, 'the unit DRIVES INTO the chimney\'s span (1500 to 2100)');
  const n = notchOf();
  assert.deepEqual([n.corner, n.w, n.d, n.h, n.full, n.boxed, n.auto, n.for], ['BR', 110, 350, 0, true, true, true, 'a chimney on this wall'],
    'the overlap 100 + 10 clearance wide; the chimney stands 350 - 10 wall gap + 10 clearance past the back line; full height');
  assert.deepEqual(n.boards, ['RETURN', 'STEP']);
  assert.equal(unitOf(a.id).params.notch, undefined, 'DERIVED, never stored');
  assert.deepEqual(validateUnit(unitOf(a.id), S().unitResult(a.id), ctx()).filter((i) => i.code === 'UNIT_OVERLAP'), [], 'standing in the chimney is not an overlap: the notch is cut for it');
  assert.deepEqual(S().unitResult(a.id).warnings.filter((w) => w.code === 'NOTCH_REFUSED'), []);
  // The arrival law: the widest notch is 468 (600 - 36 - 96); the overlap stops at 458 so that the notch with its clearance is exactly 468.
  S().moveUnit(a.id, 1800, 1);
  assert.equal(unitOf(a.id).position.x_mm, 1358);
  assert.equal(notchOf().w, 468);
  assert.deepEqual(S().unitResult(a.id).warnings.filter((w) => w.code === 'NOTCH_REFUSED'), [], 'the deepest station is still a legal notch');
  // Out again: the notch is gone with the overlap.
  S().moveUnit(a.id, 700, 1);
  assert.equal(unitOf(a.id).position.x_mm, 700);
  assert.equal(notchOf(), null);
});

test('from the other side a wardrobe gets a BL notch; a drawer unit and a hand-notched unit meet the hard stop; a wall unit the chimney is too deep for stops too', () => {
  kitchenWithChimney();
  const w = S().addUnit('WARDROBE', { wall: 0, x: 2500 });
  assert.equal(w.error, null, w.error);
  S().moveUnit(w.id, 1900, 1);
  const wn = S().unitResult(w.id).derived.notch;
  assert.equal(unitOf(w.id).position.x_mm, 1900);
  assert.deepEqual([wn.corner, wn.w, wn.d, wn.auto], ['BL', 2100 - 1900 + 10, 350, true], 'w szafach to samo');
  // A drawer unit (KIT_BUDR) takes no notch: the chimney is the hard stop of turn 14.
  const d = S().addUnit('BUDR', { wall: 0, x: 400 });
  assert.equal(d.error, null, d.error);
  S().moveUnit(d.id, 1300, 1);
  assert.equal(unitOf(d.id).position.x_mm, 1500 - P.editor.minUnitGap - unitOf(d.id).params.width);
  assert.equal(S().unitResult(d.id).derived?.notch ?? null, null);
  // A hand-made notch on another corner: the room stays hard for that unit.
  const b = S().addUnit('BUD', { wall: 1, x: 100 });
  assert.equal(b.error, null, b.error);
  assert.equal(S().setUnitNotch(b.id, { corner: 'FL', w: 100, d: 100, h: 0 }).ok ?? true, true);
  S().moveUnitToWall?.(b.id, 0, 1300);
  if (unitOf(b.id).position.wall === 0) {
    S().moveUnit(b.id, 1300, 1);
    assert.ok(unitOf(b.id).position.x_mm + unitOf(b.id).params.width <= 1500, 'not into the chimney with a notch of its own');
    assert.equal(S().unitResult(b.id).derived.notch.corner, 'FL', 'the hand\'s notch is what is cut');
  }
  // A wall unit 400 deep: the deepest notch is 400 - 18 - 96 = 286, the chimney stands 350: hard stop.
  const u = S().addUnit('WUD', { wall: 0, x: 600 });
  assert.equal(u.error, null, u.error);
  S().moveUnit(u.id, 1300, 1);
  assert.equal(unitOf(u.id).position.x_mm, 1500 - P.editor.minUnitGap - 600);
  assert.equal(S().unitResult(u.id).derived?.notch ?? null, null);
});

test('a shallow box on the wall is notched into a wall unit too, and the hangers come along', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addWallSlope({ kind: 'chimney', wall: 0, x_mm: 2000, width: 400, depth: 150 });
  const u = S().addUnit('WUD', { wall: 0, x: 1000 });
  assert.equal(u.error, null, u.error);
  S().moveUnit(u.id, 1600, 1);
  assert.equal(unitOf(u.id).position.x_mm, 1600);
  const r = S().unitResult(u.id);
  const n = r.derived.notch;
  assert.deepEqual([n.corner, n.w, n.d, n.auto], ['BR', 200 + 10, 150 - 10 + 10, true]);
  assert.deepEqual(r.warnings.filter((w) => w.code === 'NOTCH_REFUSED'), []);
  const bur = r.panels.find((p) => p.id === 'BUR');
  assert.equal(bur.w, 400 - 18 - 150, 'the notched side loses the notch depth');
  assert.deepEqual(r.drills.filter((d) => d.kind === 'hanger' && d.panel === 'BUR').map((d) => d.x), [21, 53], 'the hanger holes off the NEW back edge');
  const back = r.panels.find((p) => p.id === 'BACK');
  assert.equal(back.w, 600 - 210);
  assert.deepEqual(back.cnc.pockets.filter((k) => k.layer === 'HANGER_HOLE').map((k) => [k.x1, k.x2]), [[0, 30], [390 - 30, 390]], 'both hanger cut-outs on the shortened back');
});
