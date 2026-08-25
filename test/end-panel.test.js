// ─── End panel v2 (turn 6, CLAUDE.md F3) ───
//
// Turn 4 gave the end panel the depth of the CARCASS. That leaves it standing
// behind the doors by the door standoff plus the door's own thickness — a step
// down the side of a finished run, which is the exact thing the piece is fitted
// to prevent. Turn 6 makes it flush with the door face, cuts it from the FRONT
// material because that is what it is sprayed with, and gives its top edge the
// same "drag it, or double-click it to the ceiling" gesture the top infill has
// had since turn 3.
//
// The depth rule is traced, not invented: the AutoLISP draws the door in top
// view at y0 − doorGap − gruboscDrzwi (KIT_BUD_FULL L128), so the door face is
// carcass depth + gap + front thickness from the wall, and that is where the
// end panel has to finish.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet, wearsFrontMaterial } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildBom } from '../src/engine/bom.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const ROOM_HEIGHT = 2500;

function withUnit(type = 'BUD') {
  store().loadProject({
    id: null,
    name: 'end panels',
    room: migrateRoom({ height: ROOM_HEIGHT, corners: rectCorners(4000, 3000) }),
    design: { infill: { sideWidth: 20 } },
  }, []);
  const { id, error } = store().addUnit(type);
  assert.equal(error, null, error || '');
  return id;
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const panelsOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P).panels;
const endPanelOf = (id) => panelsOf(id).find((p) => p.part === 'END-PANEL');
const doorOf = (id) => panelsOf(id).find((p) => p.part === 'FRONT');

// ─── flush with the doors ───

test('an end panel finishes in the same plane as the door, not behind it', () => {
  const id = withUnit('BUD');
  store().setDoors(id, { count: 1, hinge: 'L' });
  store().addEndPanel(id, { side: 'R' });

  const unit = unitOf(id);
  const ep = endPanelOf(id);
  const door = doorOf(id);

  // The rule, in as many words: the gap to the wall behind it, plus the carcass
  // depth, plus the door standoff, plus the door.
  //
  // Turn 8 (CLAUDE.md F3) added the first of those four. Every unit stands
  // `room.wallBackClearance` off the wall, so a panel that is only as deep as
  // "carcass + door" stops that far short of it — and the slot runs at eye
  // level down the whole side of the run, which is the one thing a masking
  // panel exists to not have.
  const clearance = P.room.wallBackClearance;
  const expected = clearance + unit.params.depth + P.doors.gap + unit.params.front_t;
  assert.equal(ep.box.d, expected);
  assert.equal(ep.w, expected, 'and the cut piece is that long');

  // …which is the same statement, checked against where the door actually is.
  assert.equal(
    ep.box.z + ep.box.d, door.box.z + door.box.d,
    'the end panel and the door finish on ONE plane — that is the whole point',
  );
  assert.equal(ep.box.z, -clearance, 'and it starts at the WALL, not at the back of the carcass');
});

test('the edging and the CNC outline follow the new length', () => {
  const id = withUnit('BUD');
  store().addEndPanel(id, { side: 'L' });
  const ep = endPanelOf(id);
  assert.equal(ep.edging.len_m, (2 * ep.w + 2 * ep.h) / 1000, 'edged all round, at its real size');
  assert.equal(ep.cnc.width ?? ep.cnc.w ?? ep.w, ep.w);
});

// ─── front material ───

test('an end panel is cut from the FRONT material, like the doors it stands beside', () => {
  assert.equal(wearsFrontMaterial('end_panel'), true);
  assert.equal(wearsFrontMaterial('infill'), true);
  assert.equal(wearsFrontMaterial('front'), true);
  // Turn 11 (CLAUDE.md F5.4): the plinth joined them. Owner verdict — a toe
  // kick stands in the room under the doors, in the plane the eye reads as the
  // front of the run, and it is finished WITH the doors, spray included.
  assert.equal(wearsFrontMaterial('plinth'), true);
  assert.equal(wearsFrontMaterial('side'), false);

  const id = withUnit('BUD');
  store().addEndPanel(id, { side: 'R' });
  const ep = endPanelOf(id);
  assert.equal(ep.material_role, 'front');
  assert.equal(ep.finish_exposed, true, 'and it still goes to the spray booth');
});

test('the BOM counts an end panel against the front sheet, not the carcass sheet', () => {
  const id = withUnit('BUD');
  const bare = buildBom([{ unit: unitOf(id), result: computeCabinet(paramsForEngine(unitOf(id)), P) }]);
  store().addEndPanel(id, { side: 'R' });
  const withPanel = buildBom([{ unit: unitOf(id), result: computeCabinet(paramsForEngine(unitOf(id)), P) }]);

  const ep = endPanelOf(id);
  const area = (ep.w * ep.h) / 1e6;
  // The BOM totals are rounded for display, so compare on that grid.
  assert.ok(Math.abs(withPanel.totals.front_area_m2 - (bare.totals.front_area_m2 + area)) < 5e-4,
    `the whole panel lands on the front material (${withPanel.totals.front_area_m2} vs ${area})`);
  assert.equal(withPanel.totals.board_area_m2, bare.totals.board_area_m2,
    'and nothing of it lands on the carcass board');
  // T48-F3: a standing carcass arrives with its PLINTH, and a plinth is front
  // material — so "no front area at all" is no longer the way to say that the
  // end panel has nowhere to hide. The claim is the same one, made exactly:
  // whatever front area the bare unit has, the panel ADDS its own to it.
  assert.equal(bare.totals.front_area_m2 > 0, true, 'the plinth is the bare unit\'s only front area');
  assert.ok(withPanel.totals.front_area_m2 > bare.totals.front_area_m2,
    'and the end panel lands on top of it, not on the carcass board');
});

// ─── the interactive top edge ───

test('the top edge drags between the top of the unit and the ceiling', () => {
  const id = withUnit('BUD');
  const { id: epId } = store().addEndPanel(id, { side: 'R' });
  const unit = unitOf(id);
  const unitTop = P.baseUnit.legHeight + unit.params.height;
  const headroom = ROOM_HEIGHT - unitTop;

  assert.equal(endPanelOf(id).meta.top_mm, 0, 'it starts at the top of the unit');

  assert.equal(store().setEndPanelTop(id, epId, 300), 300);
  assert.equal(endPanelOf(id).h, unit.params.height + P.baseUnit.legHeight + 300,
    'and the cut piece grows with it — the BOM is not told separately');

  // Below the carcass top is not a thing: that is what "unit height" is for.
  assert.equal(store().setEndPanelTop(id, epId, -500), 0);
  // Through the ceiling is not a thing either.
  assert.equal(store().setEndPanelTop(id, epId, 99999), headroom);
});

test('double-clicking the edge sends it to the ceiling — exactly to the ceiling', () => {
  const id = withUnit('BUD');
  const { id: epId } = store().addEndPanel(id, { side: 'L' });
  const unit = unitOf(id);
  const unitTop = P.baseUnit.legHeight + unit.params.height;

  const top = store().endPanelToCeiling(id, epId);
  assert.equal(top, ROOM_HEIGHT - unitTop);

  const ep = endPanelOf(id);
  // Floor to ceiling, in one piece: the drop below the carcass plus the carcass
  // plus the run above it is the room's height.
  assert.equal(ep.box.y, -P.baseUnit.legHeight);
  assert.equal(ep.box.y + ep.h, ROOM_HEIGHT - P.baseUnit.legHeight);
  assert.equal(ep.h, ROOM_HEIGHT);
});

test('the top height is PER PANEL — "apply to all" does not carry it', () => {
  const id = withUnit('BUD');
  const left = store().addEndPanel(id, { side: 'L' }).id;
  const right = store().addEndPanel(id, { side: 'R' }).id;
  store().setEndPanelTop(id, left, 250);

  const panels = unitOf(id).params.end_panels;
  assert.equal(panels.find((ep) => ep.id === left).top_mm, 250);
  assert.equal(Number(panels.find((ep) => ep.id === right).top_mm) || 0, 0,
    'a height picked by eye on one panel is not a project default');

  // Height and thickness ARE project defaults, and still are.
  store().updateEndPanel(id, left, { height: 'unit' });
  assert.equal(store().project.design.endPanel.height, 'unit');
  assert.equal(store().project.design.endPanel.top_mm, undefined);
});

test('a wall unit takes one too, and it ENDS WITH THE CABINET', () => {
  // ─── TURN 13 (CLAUDE.md F4): THE OWNER'S VERDICT REVERSES THIS ───
  //
  // Turn 6 gave a wall unit's end panel the same "to the floor" the standing
  // units have, and this test pinned it. The owner has now seen it on a real
  // job: a masking panel hanging in mid-air the whole way down a bare wall
  // under a cabinet that stops at 2100 — priced and cut at that height.
  //
  // The verdict is that it ends flush with the hanging cabinet's bottom. The
  // rule is engine/autoparts.js `endPanelDrop`, and it is per unit CLASS: "to
  // the floor" is the right default for something standing on the floor and a
  // meaningless one for something screwed to a wall.
  //
  // The one future exception — a door/panel EXTENSION below a wall unit — is
  // BACKLOG #45 and the data slot is left open for it ('extended').
  const id = withUnit('WUD');
  store().addEndPanel(id, { side: 'R' });
  const unit = unitOf(id);
  const ep = endPanelOf(id);
  assert.equal(ep.box.y, 0, 'it starts at the bottom of the carcass and goes no lower');
  assert.equal(ep.h, unit.params.height, 'it is exactly as tall as the cabinet');
  assert.equal(ep.meta.height, 'carcass');
  assert.equal(ep.box.d, P.room.wallBackClearance + unit.params.depth + P.doors.gap + unit.params.front_t,
    'a hung unit stands off its wall too, and its end panel reaches back to it');
});
