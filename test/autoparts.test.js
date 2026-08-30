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
  // ─── Turn 11 (CLAUDE.md F5.4) ───
  // It used to be at `z: setback`, which in a unit's own frame is 50 mm in from
  // the WALL — a toe kick fitted against the plaster where nobody could see it
  // or kick it. A toe kick is a FRONT face, recessed from the door line.
  const t = P.autoParts.plinth.thickness ?? P.board.thickness;
  assert.equal(plinth.box.z, 558 - P.autoParts.plinth.setback - t, 'at the FRONT, recessed as a toe kick');
  assert.equal(plinth.box.z + plinth.box.d, 558 - P.autoParts.plinth.setback,
    'its face stands exactly the setback behind the carcass front');
  // …and it is finished with the doors, not out of the carcass sheet (F5.4).
  assert.equal(plinth.material_role, 'front');
  assert.equal(plinth.finish_exposed, true);
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

// ─── T48-F2 AMENDS THIS ─────────────────────────────────────────────────────
// ─── OVERRULED, 25.08.2026 ──────────────────────────────────────────────────
//
// The owner, 25.08.2026: *"zamiast L shape … pomyslem zeby na wizualizacji
// tylko zrobic jedna deske jak plinth i tyle. … natomiast na CNC robisz tak:
// dlugosc infila poziomego nad szafa = rysujesz 2 deski = dlugosc infila x
// 60 mm, plus 20 mm dluzsze na odciecie, z jednej strony."*
//
// This test held turn 6's "L in section". It is TWO PLAIN BOARDS now, and each
// of them leaves the machine 20 mm LONG on one end for the site cut — so the
// two `w` assertions below move from the nominal run to the nominal plus the
// allowance, and `meta.lengthOversize` names the end it hangs off. The widths
// are untouched, and are still arithmetic: 40 + 20 and 80 + 20.
test('the top infill is ONE BOARD, and it grows with the drag', () => {
  // One element for a whole RUN. A unit on its own is a run of one, which is
  // what a bare computeCabinet() call is, so the numbers below are that unit's
  // own width. The four end conditions and the multi-cabinet case live in
  // test/run-infill.test.js.
  const r = computeCabinet(base({ top_infill_mm: 40 }), P);
  const face = r.panels.find((p) => p.id === 'INFILL-T-FACE');
  // T47-F4: `w`/`h` are the CUT size and now carry the +20 scribe allowance
  // on the piece's WALL edge (`autoParts.fillerOversize`, the drawer front's own
  // idiom). `meta.oversize.nominal` is the finished size, and the box is the
  // nominal piece — what stands in the room once the joiner has planed it in.
  const OVER = P.autoParts.fillerOversize;
  // T48-F2: the LENGTH carries the site-cut allowance on ONE end, and the box
  // is still the nominal run — what stands over the units once it is cut in.
  assert.equal(face.w, 600 + OVER, 'the blank is the run plus the site cut');
  assert.equal(face.box.w, 600, 'and the piece that stands in the room is the run');
  assert.deepEqual(face.meta.lengthOversize, { mm: OVER, end: 'right', nominal: 600 });
  assert.equal(face.h, 40 + OVER, 'BOARD A: the owner\'s "jedna 60" — 40 + 20, as arithmetic');
  assert.deepEqual(face.meta.oversize, { mm: OVER, edge: 'top', nominal: 40 });
  assert.equal(face.box.h, 40, 'the piece that stands in the room is the nominal');
  assert.equal(face.box.y, 770, 'it starts at the top of the carcass');
  assert.equal(face.role, 'infill');
  assert.equal(r.panels.filter((p) => p.id === 'INFILL-T-SHELF').length, 0,
    'the shelf board is gone: ONE plain board and nothing else');
  assert.equal(face.cnc.outline.length, 4, 'a plain rectangle, four corners');
  assert.equal(face.meta.mitre_45.includes('long'), false, 'the L\'s long-edge 45 is gone');

  const taller = computeCabinet(base({ top_infill_mm: 380 }), P);
  const tallerFace = taller.panels.find((p) => p.id === 'INFILL-T-FACE');
  assert.equal(tallerFace.h, 380 + P.autoParts.fillerOversize);
  assert.ok(tallerFace.area_m2 > face.area_m2, 'the BOM area follows the height');

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
  // Turn 6: the piece is an L where the gap is wide enough to take one, and
  // the FACE of it is what closes the gap — same width, same side, same wall.
  // 12 and 18 mm are both under minLWidth, so both are still plain strips;
  // test/run-infill.test.js is where the L is checked.
  const r = computeCabinet(base({ side_infill_left_mm: 12, side_infill_right_mm: 18 }), P);
  const left = r.panels.find((p) => p.id === 'INFILL-L-FACE');
  const right = r.panels.find((p) => p.id === 'INFILL-R-FACE');
  // T47-F4: `w`/`h` are the CUT size and now carry the +20 scribe allowance
  // on the piece's WALL edge (`autoParts.fillerOversize`, the drawer front's own
  // idiom). `meta.oversize.nominal` is the finished size, and the box is the
  // nominal piece — what stands in the room once the joiner has planed it in.
  const OV = P.autoParts.fillerOversize;
  assert.equal(left.w, 12 + OV);
  assert.equal(left.box.w, 12, 'the gap it closes is still 12');
  assert.deepEqual(left.meta.oversize, { mm: OV, edge: 'left', nominal: 12 });
  // …and it runs to the FLOOR now, past the legs: a filler that stops at the
  // carcass base leaves a slot beside the plinth.
  assert.equal(left.h, 770 + P.baseUnit.legHeight);
  assert.equal(left.box.x, -12, 'outside the carcass, against the wall');
  assert.equal(right.w, 18 + OV);
  assert.equal(right.box.x, 600);
  assert.deepEqual(right.meta.oversize, { mm: OV, edge: 'right', nominal: 18 });
  assert.equal(r.csvLines.filter((l) => /,INFILL-[LR]-FACE,/.test(l)).length, 2);
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
  // On a TALL unit — turn 8 (CLAUDE.md F2.7) closed the top infill off for base
  // kits, because what goes on top of a base cabinet is a worktop and the gap
  // above THAT is where the wall units are.
  const tall = {
    id: 'u3', type: 'BUDTALL', position: { wall: 0, x_mm: 12 },
    params: { width: 600, height: 2100, depth: 558, unit_num: 'T01', plinth: true, top_infill_mm: 40 },
  };
  const kept = autoPartsFor({ unit: tall, wallWidth: 632, others: [], roomHeight: 2500, design }, P);
  assert.equal(kept.plinth, true);
  assert.equal(kept.top_infill_mm, 40);

  // …and the gate holds however the parameter got onto a base unit — a project
  // saved before turn 8, a template, an import.
  const baseWithOne = { ...unit, params: { ...unit.params, plinth: true, top_infill_mm: 40 } };
  const gated = autoPartsFor({ unit: baseWithOne, wallWidth: 632, others: [], roomHeight: 2500, design }, P);
  assert.equal(gated.plinth, true, 'a plinth is still a base unit’s to have');
  assert.equal(gated.top_infill_mm, 0, 'the top infill is not');

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
