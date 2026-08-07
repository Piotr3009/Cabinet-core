// ─── The construction pieces (BACKLOG #15, #16, #17) ───
//
// Three rules, and the difference between them is the whole point:
//
//   #15 the side infill is AUTOMATIC — a unit stops one infill width short of
//       the wall, and the filler that closes that gap appears because the gap
//       exists. Drive away and it is gone.
//   #16 the plinth and the top infill are MANUAL. Turn 3 created both the moment
//       a unit was placed, which meant cut-list rows nobody had ordered.
//   #17 an end panel is a cut piece on the OUTSIDE of a carcass side, and it is
//       part of the unit's footprint — the neighbour beside it is clamped out of
//       the space it occupies.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { clampUnitX, endPanelPads, unitSpan } from '../src/engine/collision.js';
import { buildBom } from '../src/engine/bom.js';
import { exportablePanels } from '../src/engine/cnc/groups.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const INFILL = 20;

function project(units = []) {
  store().loadProject({
    id: null,
    name: 'construction',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: { infill: { sideWidth: INFILL } },
  }, units);
}

function withUnit(type = 'BUD') {
  project();
  const { id, error } = store().addUnit(type);
  assert.equal(error, null, error || '');
  return id;
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);
const partsOf = (id, part) => resultOf(id).panels.filter((p) => p.part === part);

// ─── #15: the stop, and the filler that appears at it ───

test('the clamp stops a unit one margin short of each end of the wall', () => {
  const at = (x) => clampUnitX({
    x, current: 500, width: 600, wallWidth: 4000, others: [], wallMargin: INFILL,
  }, P).x;

  assert.equal(at(-500), INFILL, 'driving into the left wall stops at the infill width');
  assert.equal(at(9999), 4000 - 600 - INFILL, 'and so does the right');
  assert.equal(at(1000), 1000, 'anywhere in between is untouched');

  // The magnet makes the stop a LANDING: near it, the gap is exactly the infill
  // width and not 19.4 mm, which is what lets the filler be that exact piece.
  assert.equal(at(INFILL + 5), INFILL);
  assert.equal(at(4000 - 600 - INFILL - 7), 4000 - 600 - INFILL);

  // A wall too short for the unit plus both margins keeps the unit in the room
  // rather than leaving the clamp with no legal position at all.
  const tight = clampUnitX({ x: 0, current: 0, width: 600, wallWidth: 610, others: [], wallMargin: INFILL }, P);
  assert.ok(tight.x >= 0 && tight.x <= 10, `${tight.x} is inside a 610 mm wall`);

  // With no margin configured nothing changes — the turn-3 behaviour.
  assert.equal(clampUnitX({ x: -500, current: 500, width: 600, wallWidth: 4000, others: [] }, P).x, 0);
});

test('parking a unit at the wall grows the filler; driving away removes it', () => {
  const id = withUnit('BUD');

  // Drive it hard into the left wall: it stops at the infill width…
  store().moveUnit(id, -2000, 0);
  assert.equal(unitOf(id).position.x_mm, INFILL, 'stopped at the stop');
  assert.equal(unitOf(id).params.side_infill_left_mm, INFILL, '…and the filler is there');
  assert.equal(partsOf(id, 'INFILL').filter((p) => p.meta.side === 'left').length, 1, 'as a real cut piece');

  // …and out into the room again: no filler, and no complaint about the gap.
  store().moveUnit(id, 1500, 0);
  assert.equal(unitOf(id).params.side_infill_left_mm, 0);
  assert.equal(partsOf(id, 'INFILL').length, 0);

  // The right-hand wall behaves the same way.
  store().moveUnit(id, 99999, 0);
  const wall = 4000;
  assert.equal(unitOf(id).position.x_mm, wall - unitOf(id).params.width - INFILL);
  assert.equal(unitOf(id).params.side_infill_right_mm, INFILL);
});

test('the filler is the exact width of the gap it closes', () => {
  const id = withUnit('BUD');
  store().moveUnit(id, -2000, 0);
  const infill = partsOf(id, 'INFILL').find((p) => p.meta.side === 'left');
  assert.equal(infill.w, INFILL);
  assert.equal(infill.h, unitOf(id).params.height);
  assert.equal(infill.box.x, -INFILL, 'outside the carcass, against the wall');

  // Change the setting and both the stop and the piece follow it.
  store().setDesign({ infill: { sideWidth: 40 } });
  store().moveUnit(id, -2000, 0);
  assert.equal(unitOf(id).position.x_mm, 40);
  assert.equal(partsOf(id, 'INFILL').find((p) => p.meta.side === 'left').w, 40);
});

// ─── #16: the plinth and the top infill are asked for ───

test('a newly placed unit has NO plinth and NO top infill', () => {
  const id = withUnit('BUD');
  assert.equal(unitOf(id).params.plinth, false);
  assert.equal(unitOf(id).params.top_infill_mm, 0);
  assert.equal(partsOf(id, 'PLINTH').length, 0, 'nothing in the cut list nobody ordered');
  assert.equal(partsOf(id, 'INFILL').length, 0);
});

test('adding the plinth and the top infill makes them real; removing them makes them gone', () => {
  const id = withUnit('BUD');

  assert.equal(store().addPlinth(id), true);
  assert.equal(partsOf(id, 'PLINTH').length, 1);
  assert.equal(partsOf(id, 'PLINTH')[0].h, P.baseUnit.legHeight);

  const height = store().addTopInfill(id);
  assert.equal(height, P.autoParts.topInfill.defaultHeight, 'the default is 40');
  const top = partsOf(id, 'INFILL').find((p) => p.meta.side === 'top');
  assert.equal(top.h, 40);

  // The drag and the double-click still work on what is there.
  assert.equal(store().setTopInfill(id, 300), 300);
  assert.equal(partsOf(id, 'INFILL').find((p) => p.meta.side === 'top').h, 300);
  const toCeiling = store().fillToCeiling(id);
  // Turn 5 (BACKLOG #29): a new base unit arrives at the PROJECT's base height,
  // not at the kit's own default — so the gap to the ceiling is measured from
  // that. The number is read from the unit rather than written out again, so
  // this test says "to the ceiling" and not "to 1630".
  assert.equal(toCeiling, 2500 - (unitOf(id).params.height + P.projectHeights.toeKick));
  assert.equal(unitOf(id).params.height, P.projectHeights.base, 'inherited, not the kit default');

  store().removePlinth(id);
  store().removeTopInfill(id);
  assert.equal(partsOf(id, 'PLINTH').length, 0);
  assert.equal(partsOf(id, 'INFILL').length, 0);

  // A moved unit does not get them back by accident — that is the whole bug.
  store().moveUnit(id, 1200, 0);
  assert.equal(unitOf(id).params.plinth, false);
  assert.equal(unitOf(id).params.top_infill_mm, 0);
});

test('a wall unit refuses a plinth however it is asked', () => {
  const id = withUnit('WUD');
  assert.equal(store().addPlinth(id), false);
  assert.equal(partsOf(id, 'PLINTH').length, 0);
});

// ─── #17: end panels ───

test('an end panel is a cut piece outside the carcass side', () => {
  const id = withUnit('BUD');
  const { id: epId, error } = store().addEndPanel(id, { side: 'R' });
  assert.equal(error, null);
  assert.ok(epId);

  const ep = partsOf(id, 'END-PANEL')[0];
  const unit = unitOf(id);
  assert.equal(ep.meta.side, 'right');
  assert.equal(ep.thickness, unit.params.front_t, 'the doors’ thickness by default');
  assert.equal(ep.w, unit.params.depth, 'as deep as the unit it masks');
  assert.equal(ep.box.x, unit.params.width, 'on the OUTSIDE of the right side');
  // "To floor" is the default: it runs past the legs, down to the floor.
  assert.equal(ep.h, unit.params.height + P.baseUnit.legHeight);
  assert.equal(ep.box.y, -P.baseUnit.legHeight);

  // Unit height instead: it stops where the carcass does.
  store().updateEndPanel(id, epId, { height: 'unit' });
  const shorter = partsOf(id, 'END-PANEL')[0];
  assert.equal(shorter.h, unit.params.height);
  assert.equal(shorter.box.y, 0);

  // One per side, and the second attempt is refused with a reason.
  assert.match(store().addEndPanel(id, { side: 'R' }).error, /already has an end panel/);
  assert.equal(store().addEndPanel(id, { side: 'L' }).error, null);
  assert.equal(partsOf(id, 'END-PANEL').length, 2);
});

test('Left / Right / Both — and "both" is the same act twice (BACKLOG #31)', () => {
  const id = withUnit('BUD');

  const both = store().addEndPanel(id, { side: 'B' });
  assert.equal(both.error, null, both.error || '');
  assert.deepEqual(both.ids.length, 2);
  assert.deepEqual(
    (unitOf(id).params.end_panels || []).map((ep) => ep.side).sort(),
    ['L', 'R'],
  );
  // Two real cut pieces, not one piece called "both".
  assert.equal(partsOf(id, 'END-PANEL').length, 2);

  // Asking again is refused per side, and nothing is added twice.
  const again = store().addEndPanel(id, { side: 'B' });
  assert.equal(again.ids.length, 0);
  assert.match(again.error, /already has an end panel/);
  assert.equal((unitOf(id).params.end_panels || []).length, 2);
});

test('"both" fits the side that has room and says why the other did not', () => {
  // A unit hard against the right-hand wall: the right panel has nowhere to go,
  // the left one is fine. A silent half-success is how a unit ends up with one
  // end panel nobody meant to leave off.
  const id = withUnit('BUD');
  store().moveUnit(id, 99999, 0);

  const result = store().addEndPanel(id, { side: 'B' });
  assert.equal(result.ids.length, 1, 'the left one appeared');
  assert.deepEqual((unitOf(id).params.end_panels || []).map((ep) => ep.side), ['L']);
  assert.match(result.error, /No room for a .* end panel on the right/);
});

test('an end panel reaches the BOM, the CNC sheet and the cutting list', () => {
  const id = withUnit('BUD');
  store().addEndPanel(id, { side: 'L' });
  const result = resultOf(id);

  const bom = buildBom([{ unit: unitOf(id), result }]);
  assert.ok(bom.roles.some((r) => r.role === 'end_panel'), 'its own BOM role');
  assert.equal(bom.cutRows.filter((r) => r.part === 'END-PANEL').length, 1);
  assert.equal(result.csvLines.filter((l) => l.includes(',END-L,')).length, 1);

  const ep = result.panels.find((p) => p.part === 'END-PANEL');
  assert.ok(ep.area_m2 > 0);
  assert.equal(ep.cnc.outline.length, 4, 'a cuttable rectangle');
  assert.ok(exportablePanels(result.panels).some((p) => p.id === 'END-L'), 'and it goes out in the DXF');
});

test('an end panel is part of the footprint, so the neighbour keeps out of it', () => {
  project();
  const a = store().addUnit('BUD').id;
  const b = store().addUnit('BUD').id;
  const thickness = unitOf(a).params.front_t;

  // A has room on its right, so the panel goes on.
  store().moveUnit(b, 3000, 0);
  assert.equal(store().addEndPanel(a, { side: 'R', thickness }).error, null);
  assert.equal(endPanelPads(unitOf(a), thickness).right, thickness);

  // Now B is dragged into A: it stops at the PANEL, not at the carcass.
  const carcassRight = unitOf(a).position.x_mm + unitOf(a).params.width;
  store().moveUnit(b, carcassRight, 0);
  assert.ok(
    unitOf(b).position.x_mm >= carcassRight + thickness - 1e-6,
    `B at ${unitOf(b).position.x_mm} is standing in A's end panel (carcass ends ${carcassRight}, panel ${thickness} mm)`,
  );
  const spanA = unitSpan(unitOf(a));
  const spanB = unitSpan(unitOf(b));
  assert.ok(spanB.left >= spanA.right - 1e-6, `${spanB.left} vs ${spanA.right}`);
});

test('an end panel that does not fit is refused, and says what is in the way', () => {
  project();
  const a = store().addUnit('BUD').id;
  const b = store().addUnit('BUD').id;

  // Butt B flush against A: there is now nothing between them.
  store().moveUnit(b, unitSpan(unitOf(a)).right, 0);
  const refused = store().addEndPanel(a, { side: 'R' });
  assert.equal(refused.id, null);
  assert.match(refused.error, /No room for a 25 mm end panel on the right/);
  assert.match(refused.error, /only 0 mm free before 02/, 'it names the neighbour');
  assert.equal((unitOf(a).params.end_panels || []).length, 0, 'and nothing was added');

  // Against the WALL the infill gap is what is left, and 20 mm does not take a
  // 25 mm panel either — the scribe filler is already closing that gap.
  const alone = withUnit('BUD');
  store().moveUnit(alone, -5000, 0);
  assert.equal(unitOf(alone).position.x_mm, INFILL, 'parked at the stop');
  const atWall = store().addEndPanel(alone, { side: 'L' });
  assert.match(atWall.error, /only 20 mm free before the wall/);
  // …and on the open side there is a whole room, so it goes on.
  assert.equal(store().addEndPanel(alone, { side: 'R' }).error, null);
});

test('"apply to all" makes the next end panel inherit the settings', () => {
  project();
  const a = store().addUnit('BUD').id;
  const b = store().addUnit('BUD').id;

  const first = store().addEndPanel(a, { side: 'L', height: 'unit', thickness: 18 });
  store().updateEndPanel(a, first.id, { height: 'unit', thickness: 18 });

  // The project remembers, so the next one anywhere matches without being told.
  store().addEndPanel(b, { side: 'R' });
  const inherited = (unitOf(b).params.end_panels || [])[0];
  assert.equal(inherited.height, 'unit');
  assert.equal(inherited.thickness, 18);

  // Unticked, the defaults stop travelling.
  store().setEndPanelDefaults({ applyToAll: false });
  store().addEndPanel(b, { side: 'L', height: 'floor', thickness: 25, applyToAll: false });
  const design = store().project.design;
  assert.equal(design.endPanel.height, 'unit', 'the project default was not overwritten');
  assert.equal(design.endPanel.thickness, 18);
});
