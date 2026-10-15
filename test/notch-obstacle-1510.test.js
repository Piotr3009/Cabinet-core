/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
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
import { backStandoff, boxSpansOnWall, clampUnitX, unitIssues, wallObstacles } from '../src/engine/collision.js';
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

test('collision: a box span says what it is, how deep it stands and how far a cabinet may enter it, capped by its own width; Infinity passes it', () => {
  const walls = roomWalls(rectCorners(4000, 3000));
  const boxes = wallPlanObstacles(rectCorners(4000, 3000), wallElements([{ id: 'c', kind: 'chimney', wall: 0, x_mm: 1500, width: 600, depth: 350 }]), { blocking: true });
  const hard = boxSpansOnWall({ wall: walls[0], depth: 558, boxes });
  assert.equal(hard.length, 1);
  assert.deepEqual([hard[0].left, hard[0].right, Math.round(hard[0].near), Math.round(hard[0].far), hard[0].enter, hard[0].kind], [1500, 2100, 0, 350, undefined, 'chimney'], 'no enter: the hard stop of turn 14');
  const soft = boxSpansOnWall({ wall: walls[0], depth: 558, boxes, enter: 458 });
  assert.equal(soft[0].enter, 458);
  const capped = boxSpansOnWall({ wall: walls[0], depth: 558, boxes, enter: (span) => (span.far > 300 ? 5000 : 0) });
  assert.equal(capped[0].enter, 600, 'never past the obstacle\'s far edge');
  assert.equal(boxSpansOnWall({ wall: walls[0], depth: 558, boxes, enter: () => 0 })[0].enter, undefined);
  assert.deepEqual(boxSpansOnWall({ wall: walls[0], depth: 558, boxes, enter: (span) => (span.kind === 'chimney' ? Infinity : 0) }), [], 'Infinity: the cabinet goes shallower in front of it, the obstacle is not in its way');
  assert.equal(wallObstacles({ wall: walls[0], walls, depth: 558, boxes, enter: 100 })[0].enter, 100);
  const island = boxSpansOnWall({ wall: walls[0], depth: 558, boxes: [{ id: 'island_1', corners: [{ x: 1500, y: 100 }, { x: 2100, y: 100 }, { x: 2100, y: 400 }, { x: 1500, y: 400 }], label: 'island 1' }] });
  assert.equal(island[0].kind, 'island', 'an island\'s core says so: never notched, never passed');
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

test('notch-obstacle-limits: the widest and the deepest full-height back notch that keeps the owner\'s 100 of interior', () => {
  const K = notchProfile(P);
  const bone = notchP(K, 'puzzle.dogboneHalfHeight');
  assert.equal(notchP(K, 'notch.minInterior'), 100, 'the owner, 15.10.2026: nie mniej niz 100 mm w srodku szafki');
  assert.deepEqual(notchObstacleLimits(600, 558, 18, bone, 100), [600 - 36 - 100, 558 - 18 - 100], '100 of interior stays across and in depth');
  assert.deepEqual(notchObstacleLimits(600, 558, 18, bone, 50), [600 - 36 - 96, 558 - 18 - 96], 'never less than what a joint needs (2 (bone + g) = 96)');
  assert.equal(notchP(K, 'notch.obstacleClearance'), 10, 'the scribe room round the obstacle (the owner: dobrze)');
});

test('a base unit slid along the chimney: a BR notch growing to 100 of interior, then the WHOLE cabinet shallower in front of it, then a BL notch, then clear', () => {
  kitchenWithChimney();
  const a = S().addUnit('BUD', { wall: 0, x: 600 });
  assert.equal(a.error, null, a.error);
  const notchOf = () => S().unitResult(a.id).derived?.notch || null;
  const at = (x) => { S().moveUnit(a.id, x, 1); return unitOf(a.id); };
  assert.equal(at(850).position.x_mm, 850);
  assert.equal(notchOf(), null, 'clear of the chimney: no notch');
  const u = at(1000);
  assert.equal(u.position.x_mm, 1000, 'the unit DRIVES INTO the chimney\'s span (1500 to 2100)');
  const n = notchOf();
  assert.deepEqual([n.corner, n.w, n.d, n.h, n.full, n.boxed, n.auto, n.for], ['BR', 110, 350, 0, true, true, true, 'a chimney on this wall'],
    'the overlap 100 + 10 clearance wide; the chimney stands 350 - 10 wall gap + 10 clearance past the back line; full height');
  assert.deepEqual(n.boards, ['RETURN', 'STEP']);
  assert.equal(u.params.notch, undefined, 'DERIVED, never stored');
  assert.deepEqual(validateUnit(u, S().unitResult(a.id), ctx()).filter((i) => i.code === 'UNIT_OVERLAP'), [], 'standing in the chimney is not an overlap: the notch is cut for it');
  assert.deepEqual(S().unitResult(a.id).warnings.filter((w) => w.code === 'NOTCH_REFUSED'), []);
  // 1300: the overlap 400 + 10 = 410 leaves 600 - 36 - 410 = 154 of interior: still a notch.
  assert.equal(at(1300).position.x_mm, 1300);
  assert.equal(notchOf().w, 410);
  // 1400: 510 would leave 54 < 100: THE WHOLE CABINET GOES SHALLOWER, 558 - 350 = 208 deep, its back on the chimney's face.
  const s = at(1400);
  assert.equal(s.position.x_mm, 1400, 'not stopped');
  assert.equal(notchOf(), null);
  assert.deepEqual([s.params.depth, s.params.depth_full, s.params.standoff_mm], [208, 558, 350]);
  assert.equal(backStandoff(s, P), P.room.wallBackClearance + 350, 'the same gap off the chimney\'s face the wall gets');
  assert.deepEqual(validateUnit(s, S().unitResult(a.id), ctx()).filter((i) => i.code === 'UNIT_OVERLAP'), []);
  assert.equal(S().unitResult(a.id).params.depth, 208, 'the engine cuts the shallower carcass');
  // 1500: the chimney inside the cabinet's span, edge to edge: still shallower.
  assert.deepEqual([at(1500).params.depth, unitOf(a.id).params.standoff_mm], [208, 350]);
  // 1700: the part past the chimney (2300 - 2100 = 200) has interior again: a BL notch 400 + 10, full depth back.
  const b = at(1700);
  assert.deepEqual([b.params.depth, b.params.depth_full, b.params.standoff_mm], [558, undefined, undefined]);
  assert.deepEqual([notchOf().corner, notchOf().w, notchOf().d], ['BL', 410, 350]);
  // 2100: clear on the far side: as it was.
  assert.equal(at(2100).params.depth, 558);
  assert.equal(notchOf(), null);
});

test('a wardrobe and a tall unit go the same way; a drawer unit and a hand-notched unit meet the hard stop; a wall unit the chimney is too deep for hangs on its face at full depth', () => {
  kitchenWithChimney();
  const w = S().addUnit('WARDROBE', { wall: 0, x: 2500 });
  assert.equal(w.error, null, w.error);
  S().moveUnit(w.id, 1900, 1);
  const wn = S().unitResult(w.id).derived.notch;
  assert.equal(unitOf(w.id).position.x_mm, 1900);
  assert.deepEqual([wn.corner, wn.w, wn.d, wn.auto], ['BL', 2100 - 1900 + 10, 350, true], 'w szafach to samo');
  S().moveUnit(w.id, 1400, 1);
  assert.deepEqual([unitOf(w.id).params.depth, unitOf(w.id).params.standoff_mm], [unitOf(w.id).params.depth_full - 350, 350], 'a wardrobe goes shallower too');
  S().removeUnit(w.id);
  const tall = S().addUnit('BUDTALL', { wall: 0, x: 600 });
  assert.equal(tall.error, null, tall.error);
  S().moveUnit(tall.id, 1200, 1);
  assert.deepEqual([S().unitResult(tall.id).derived.notch.corner, S().unitResult(tall.id).derived.notch.w], ['BR', 310], 'wysokie szafki: a tall unit is notched');
  assert.deepEqual(S().unitResult(tall.id).warnings.filter((x) => x.code === 'NOTCH_REFUSED'), []);
  S().removeUnit(tall.id);
  // A drawer unit (KIT_BUDR) takes no notch: the chimney is the hard stop of turn 14.
  const d = S().addUnit('BUDR', { wall: 0, x: 400 });
  assert.equal(d.error, null, d.error);
  S().moveUnit(d.id, 1300, 1);
  assert.equal(unitOf(d.id).position.x_mm, 1500 - P.editor.minUnitGap - unitOf(d.id).params.width);
  assert.equal(S().unitResult(d.id).derived?.notch ?? null, null);
  assert.equal(unitOf(d.id).params.standoff_mm, undefined);
  S().removeUnit(d.id);
  // A hand-made notch on another corner: the room stays hard for that unit.
  const b = S().addUnit('BUD', { wall: 1, x: 100 });
  assert.equal(b.error, null, b.error);
  assert.equal(S().setUnitNotch(b.id, { corner: 'FL', w: 100, d: 100, h: 0 }).ok, true);
  S().moveUnitToWall(b.id, 0, 1300);
  assert.equal(unitOf(b.id).position.wall, 0);
  S().moveUnit(b.id, 1300, 1);
  assert.ok(unitOf(b.id).position.x_mm + unitOf(b.id).params.width <= 1500, 'not into the chimney with a notch of its own');
  assert.equal(S().unitResult(b.id).derived.notch.corner, 'FL', 'the hand\'s notch is what is cut');
  S().removeUnit(b.id);
  // A wall unit 400 deep: the deepest notch keeps 100 of interior (400 - 18 - 100 = 282 < 350) and shallower it cannot go
  // (400 - 350 - 18 = 32): it HANGS ON THE CHIMNEY'S FACE at its full depth, and moves along it freely.
  const u = S().addUnit('WUD', { wall: 0, x: 600 });
  assert.equal(u.error, null, u.error);
  S().moveUnit(u.id, 1300, 1);
  assert.equal(unitOf(u.id).position.x_mm, 1300, 'not stopped');
  assert.deepEqual([unitOf(u.id).params.depth, unitOf(u.id).params.depth_full, unitOf(u.id).params.standoff_mm], [400, undefined, 350]);
  assert.equal(S().unitResult(u.id).derived?.notch ?? null, null);
  assert.deepEqual(validateUnit(unitOf(u.id), S().unitResult(u.id), ctx()).filter((i) => i.code === 'UNIT_OVERLAP'), []);
  S().moveUnit(u.id, 1800, 1);
  assert.deepEqual([unitOf(u.id).position.x_mm, unitOf(u.id).params.standoff_mm], [1800, 350]);
  S().moveUnit(u.id, 2300, 1);
  assert.deepEqual([unitOf(u.id).position.x_mm, unitOf(u.id).params.standoff_mm], [2300, undefined], 'clear of it: back on the wall');
});

test('a shallow box on the wall is notched into a wall unit, the hangers come along; pushed past the notch the wall unit goes shallower too', () => {
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
  // Past the notch: 400 - 150 = 250 deep, 250 - 18 = 232 >= 100: shallower, hung 150 off the wall.
  S().moveUnit(u.id, 1900, 1);
  assert.deepEqual([unitOf(u.id).position.x_mm, unitOf(u.id).params.depth, unitOf(u.id).params.depth_full, unitOf(u.id).params.standoff_mm], [1900, 250, 400, 150]);
  assert.equal(S().unitResult(u.id).derived?.notch ?? null, null);
});
