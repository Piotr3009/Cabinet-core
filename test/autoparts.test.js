// ─── Construction automatics ───
//
// The plinth, the scribe fillers and the top infill are CUT PIECES, so the
// test that matters is: do they arrive in the cut list with the right size,
// and do they stay out of it when they should?
//
// They are opt-in at the engine level on purpose — a bare computeCabinet()
// still reproduces the LISP kit and nothing else, which is what keeps the
// golden fixtures a contract. The store asks for them when a unit is placed
// in a room.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import {
  autoPartsFor, sideInfill, takesPlinth, topInfillHeight, topInfillToCeiling,
} from '../src/engine/autoparts.js';
import { migrateDesign } from '../src/engine/design.js';
import { buildBom } from '../src/engine/bom.js';

const base = (extra = {}) => ({
  type: 'BUD', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: '01', ...extra,
});
const partsOf = (r, part) => r.panels.filter((p) => p.part === part);

// ─── they are opt-in ───

// ─── manual vs automatic (turn 4, BACKLOG #15/#16) ───
// The side infill DESCRIBES where a unit stands, so it is derived. The plinth and
// the top infill are DECISIONS, so they are carried and never invented.

test('a plain unit is still exactly the LISP kit — no extras', () => {
  const r = computeCabinet(base(), P);
  assert.equal(partsOf(r, 'PLINTH').length, 0);
  assert.equal(partsOf(r, 'INFILL').length, 0);
  assert.equal(r.panels.length, 6, 'BUL, BUR, TOP, BOTTOM, BACK, front');
});

// ─── plinth ───

test('the plinth is as tall as the legs and as wide as the unit', () => {
  const r = computeCabinet(base({ plinth: true }), P);
  const plinth = partsOf(r, 'PLINTH')[0];
  assert.ok(plinth, 'a standing unit gets a plinth');
  assert.equal(plinth.w, 600);
  assert.equal(plinth.h, P.baseUnit.legHeight);
  assert.equal(plinth.role, 'plinth');
  assert.equal(plinth.box.y, -P.baseUnit.legHeight, 'it sits under the carcass, in the leg space');
  assert.equal(plinth.box.z, P.autoParts.plinth.setback, 'recessed as a toe kick');
  assert.equal(r.csvLines.filter((l) => l.includes(',PLINTH,')).length, 1, 'and it reaches the cutting list');

  // Raise the legs and the plinth follows — no gap, no second setting.
  const tallLegs = migrateCabinetProfile({ ...P, baseUnit: { ...P.baseUnit, legHeight: 150 } });
  assert.equal(partsOf(computeCabinet(base({ plinth: true }), tallLegs), 'PLINTH')[0].h, 150);
});

test('a wall unit never gets a plinth, whatever it is asked for', () => {
  const r = computeCabinet({ type: 'WUD', width: 600, height: 720, depth: 400, unit_num: 'WU1', plinth: true }, P);
  assert.equal(partsOf(r, 'PLINTH').length, 0);
  assert.equal(takesPlinth('WUD', P), false);
  assert.equal(takesPlinth('BUD', P), true);
  assert.equal(takesPlinth('WARDROBE', P), true);
});

// ─── top infill ───

test('the top infill is 40 by default and never taller than the space left', () => {
  assert.equal(topInfillHeight({ requested: undefined, unitTop: 870, roomHeight: 2500 }, P), 40);
  assert.equal(topInfillHeight({ requested: 500, unitTop: 870, roomHeight: 2500 }, P), 500);
  assert.equal(topInfillHeight({ requested: 5000, unitTop: 870, roomHeight: 2500 }, P), 1630, 'clamped to the ceiling');
  assert.equal(topInfillHeight({ requested: 2, unitTop: 870, roomHeight: 2500 }, P), P.autoParts.topInfill.minHeight);
  assert.equal(topInfillHeight({ requested: 0, unitTop: 870, roomHeight: 2500 }, P), 0, 'zero means none');
  assert.equal(topInfillHeight({ requested: 40, unitTop: 2500, roomHeight: 2500 }, P), 0, 'a unit at the ceiling has none');

  // The double-click answer.
  assert.equal(topInfillToCeiling({ unitTop: 870, roomHeight: 2500 }), 1630);
  assert.equal(topInfillToCeiling({ unitTop: 2600, roomHeight: 2500 }), 0);
});

test('the top infill is a real panel, and it grows with the drag', () => {
  const r = computeCabinet(base({ top_infill_mm: 40 }), P);
  const infill = partsOf(r, 'INFILL')[0];
  assert.equal(infill.id, 'INFILL-T');
  assert.equal(infill.w, 600);
  assert.equal(infill.h, 40);
  assert.equal(infill.box.y, 770, 'it starts at the top of the carcass');
  assert.equal(infill.role, 'infill');

  const taller = computeCabinet(base({ top_infill_mm: 380 }), P);
  assert.equal(partsOf(taller, 'INFILL')[0].h, 380);
  assert.ok(partsOf(taller, 'INFILL')[0].area_m2 > infill.area_m2, 'the BOM area follows the height');

  // Below the minimum it is not a piece at all.
  assert.equal(partsOf(computeCabinet(base({ top_infill_mm: 4 }), P), 'INFILL').length, 0);
});

// ─── side infill ───

const gapCase = (x, width, others = []) => sideInfill({
  x, width, wallWidth: 4000, others, settingWidth: 20,
}, P);

test('a filler closes the gap between a unit and the wall — on the side that has one', () => {
  // Flush left: nothing to fill on that side, and 3400 mm to the right is not a
  // gap at all — the unit is simply standing in the room.
  const left = gapCase(0, 600);
  assert.equal(left.left, 0, 'nothing to fill on the flush side');
  assert.equal(left.right, 0);
  assert.deepEqual(left.notices, [], 'a unit away from the wall is not a problem to report');

  // 12 mm off the left wall: that is a scribe.
  const scribe = gapCase(12, 600, [{ left: 612, right: 4000 }]);
  assert.equal(scribe.left, 12);
  assert.equal(scribe.right, 0, 'the neighbour closes the right side, not a filler');

  // Parked at the stop on both ends of a short wall.
  const both = sideInfill({ x: 15, width: 600, wallWidth: 630, others: [], settingWidth: 20 }, P);
  assert.equal(both.left, 15);
  assert.equal(both.right, 15);

  // EXACTLY at the stop — where the clamp actually lands the unit.
  const parked = sideInfill({ x: 20, width: 600, wallWidth: 640, others: [], settingWidth: 20 }, P);
  assert.equal(parked.left, 20);
  assert.equal(parked.right, 20);
});

test('a unit standing out in the room grows no filler, and no complaint either', () => {
  // Turn 3 reported this as "a gap wider than the setting". With the turn-4 stop
  // a unit is USUALLY not at a wall, so that notice would fire constantly.
  const away = sideInfill({ x: 200, width: 600, wallWidth: 800, others: [], settingWidth: 20 }, P);
  assert.equal(away.left, 0);
  assert.equal(away.right, 0);
  assert.deepEqual(away.notices, []);

  // Raise the setting and the same 100 mm gap IS the scribe the unit stopped at.
  const generous = sideInfill({ x: 100, width: 600, wallWidth: 700, others: [], settingWidth: 100 }, P);
  assert.equal(generous.left, 100);
  assert.equal(generous.notices.length, 0);

  // A setting past what this workshop scribes at all: the unit stops there, no
  // filler reaches, and THAT is worth saying — it is a setting to change.
  const absurd = sideInfill({ x: 300, width: 600, wallWidth: 900, others: [], settingWidth: 300 }, P);
  assert.equal(absurd.left, 0, `${P.autoParts.sideInfill.maxWidth} mm is the workshop's limit`);
  assert.equal(absurd.notices.length, 1);
  assert.match(absurd.notices[0], /wider than the 120 mm this workshop scribes/);
});

test('the side fillers are panels on the correct side of the unit', () => {
  const r = computeCabinet(base({ side_infill_left_mm: 12, side_infill_right_mm: 18 }), P);
  const left = r.panels.find((p) => p.id === 'INFILL-L');
  const right = r.panels.find((p) => p.id === 'INFILL-R');
  assert.equal(left.w, 12);
  assert.equal(left.h, 770);
  assert.equal(left.box.x, -12, 'outside the carcass, against the wall');
  assert.equal(right.w, 18);
  assert.equal(right.box.x, 600);
  assert.equal(r.csvLines.filter((l) => /,INFILL-[LR],/.test(l)).length, 2);
});

// ─── the whole thing, per unit, from the room ───

test('autoPartsFor derives the side infill and only CARRIES the manual pieces', () => {
  const design = migrateDesign({ infill: { sideWidth: 20 } });
  const unit = {
    id: 'u1', type: 'BUD', position: { wall: 0, x_mm: 12 },
    params: { width: 600, height: 770, depth: 558, unit_num: '01' },
  };
  const parts = autoPartsFor({
    unit, wallWidth: 632, others: [], roomHeight: 2500, design,
  }, P);
  // Automatic: the gap is a fact about where the unit stands.
  assert.equal(parts.side_infill_left_mm, 12);
  assert.equal(parts.side_infill_right_mm, 20);
  // Manual: nobody asked for either of these, so neither exists (BACKLOG #16 —
  // turn 3 created both the moment a unit was placed).
  assert.equal(parts.plinth, false);
  assert.equal(parts.top_infill_mm, 0);

  // Asked for: carried through, and the top infill re-clamped to the room.
  const withParts = {
    ...unit,
    params: { ...unit.params, plinth: true, top_infill_mm: 40 },
  };
  const kept = autoPartsFor({ unit: withParts, wallWidth: 632, others: [], roomHeight: 2500, design }, P);
  assert.equal(kept.plinth, true);
  assert.equal(kept.top_infill_mm, 40);

  // A wall unit measures from its mount height, not from the floor.
  const wallUnit = {
    id: 'u2', type: 'WUD', position: { wall: 0, x_mm: 0 },
    params: { width: 600, height: 720, depth: 400, mount_height: 1500, unit_num: 'WU1', top_infill_mm: 40 },
  };
  const wallParts = autoPartsFor({ unit: wallUnit, wallWidth: 4000, others: [], roomHeight: 2500, design }, P);
  assert.equal(wallParts.plinth, false, 'a wall unit never gets a plinth, asked for or not');
  assert.equal(wallParts.top_infill_mm, 40, '1500 + 720 + 40 fits under a 2500 ceiling');

  const lowCeiling = autoPartsFor({ unit: wallUnit, wallWidth: 4000, others: [], roomHeight: 2240, design }, P);
  assert.equal(lowCeiling.top_infill_mm, 20, 'only what is left');

  // A plinth asked for on a type that cannot have one is still refused.
  const wallPlinth = { ...wallUnit, params: { ...wallUnit.params, plinth: true } };
  assert.equal(autoPartsFor({ unit: wallPlinth, wallWidth: 4000, others: [], roomHeight: 2500, design }, P).plinth, false);
});

test('the automatic pieces are ordinary BOM rows, priced like any other board', () => {
  const r = computeCabinet(base({ plinth: true, top_infill_mm: 40, side_infill_left_mm: 12 }), P);
  const bom = buildBom([{ unit: { id: 'u1' }, result: r }]);
  const roles = bom.roles.map((x) => x.role);
  assert.ok(roles.includes('plinth'));
  assert.ok(roles.includes('infill'));
  assert.equal(bom.totals.pieces, r.panels.length);
  // Every automatic piece has a real area and a real thickness — nothing is a
  // placeholder that would price at zero.
  for (const p of r.panels.filter((x) => x.role === 'plinth' || x.role === 'infill')) {
    assert.ok(p.area_m2 > 0, `${p.id} has no area`);
    assert.ok(p.thickness > 0, `${p.id} has no thickness`);
    assert.ok(p.cnc?.outline?.length === 4, `${p.id} must be a cuttable rectangle`);
  }
});
