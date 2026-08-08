// ─── Interactions: the rules behind them ───
//
// The animations and the camera flight are view state and stay in the view.
// What CAN be tested here is what they must never break: a turned unit obeys
// the same collision rules as a straight one, and the context menu offers the
// actions a unit actually has.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  unitFootprint, unitPlanSpan, wallObstacles, clampUnitX, spanInWallFrame,
} from '../src/engine/collision.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, roomWalls, rectCorners } from '../src/engine/room.js';
import { menuActions } from '../src/lib/contextActions.js';

const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
const walls = roomWalls(room);
const wall0 = walls[0];

test('turning a unit turns its footprint about the point it meets the wall', () => {
  const straight = unitPlanSpan({ wall: wall0, x: 1000, width: 600, depth: 500, rotation: 0 });
  assert.equal(Math.round(straight.left), 1000);
  assert.equal(Math.round(straight.right), 1600);
  assert.equal(Math.round(straight.far), 500);

  // 90°: the unit now runs INTO the room, so it covers its depth along the
  // wall and its width away from it.
  const turned = unitPlanSpan({ wall: wall0, x: 1000, width: 600, depth: 500, rotation: 90 });
  assert.equal(Math.round(turned.right - turned.left), 500);
  assert.equal(Math.round(turned.far - turned.near), 600);

  // 180° puts it behind the wall — which is exactly why the clamp has to see
  // the footprint and not the nominal width.
  const flipped = unitPlanSpan({ wall: wall0, x: 1000, width: 600, depth: 500, rotation: 180 });
  assert.equal(Math.round(flipped.far), 0);
  assert.equal(Math.round(flipped.near), -500);
});

test('45° is allowed, and its footprint is the real diagonal', () => {
  const span = unitPlanSpan({ wall: wall0, x: 0, width: 600, depth: 400, rotation: 45 });
  const expected = (600 + 400) * Math.SQRT1_2;
  assert.ok(Math.abs((span.right - span.left) - expected) < 1e-6, `${span.right - span.left} vs ${expected}`);
  const corners = unitFootprint({ wall: wall0, x: 0, width: 600, depth: 400, rotation: 45 });
  assert.equal(corners.length, 4);
  // The anchor corner stays exactly where it was.
  assert.ok(Math.abs(corners[0].x - wall0.start.x) < 1e-9 && Math.abs(corners[0].y - wall0.start.y) < 1e-9);
});

test('a turned neighbour blocks by what it covers, not by its width', () => {
  // 600 × 500 anchored at 2000 and turned 90°: it now stands side-to-wall, so
  // it covers its DEPTH along the wall (1500…2000) and its width goes into the
  // room. The anchor stays where it was, which is also where the 3D view
  // pivots it — picture and rule cannot disagree.
  const others = [{ wall: 0, x_mm: 2000, width: 600, depth: 500, rotation: 90, label: 'W02' }];
  const spans = wallObstacles({ wall: wall0, walls, depth: 558, others });
  assert.equal(spans.length, 1);
  assert.equal(Math.round(spans[0].left), 1500);
  assert.equal(Math.round(spans[0].right), 2000, 'its DEPTH is what lies along the wall now');

  // A unit slid at it from the left stops against the footprint, 100 mm
  // earlier than it would against the same cabinet standing straight.
  const stop = clampUnitX({ x: 9999, current: 0, width: 600, wallWidth: 4000, others: spans }, P);
  assert.equal(stop.x, 900);
});

test('a unit turned into the room still measures correctly from another wall', () => {
  const fp = unitFootprint({ wall: wall0, x: 3800, width: 600, depth: 400, rotation: 90 });
  const fromNeighbour = spanInWallFrame(fp, walls[1]);
  // It reaches around the corner: wall 1 sees it close to its own start.
  assert.ok(fromNeighbour.near < 300, `near ${fromNeighbour.near}`);
  const obstacles = wallObstacles({
    wall: walls[1], walls, depth: 558,
    others: [{ wall: 0, x_mm: 3800, width: 600, depth: 400, rotation: 90, label: 'W01' }],
  });
  assert.equal(obstacles.length, 1);
  assert.equal(obstacles[0].corner, true);
});

// ─── the context menu is a LIST, not a switch ───

const unitOf = (type, extra = {}) => ({
  id: 'u1', type, position: { wall: 0, x_mm: 0, rotation_deg: 0 }, params: { unit_num: '01', width: 600 }, ...extra,
});

test('the menu offers what the unit has, and always offers the basics', () => {
  const store = {};
  const wardrobe = menuActions({ unit: unitOf('WARDROBE'), panelPart: 'BUL', store });
  const ids = wardrobe.map((a) => a.id);
  // Turn 4 added the manual construction pieces here, because right-clicking
  // the unit is where a joiner reaches for them (BACKLOG #16/#17); turn 5 added
  // "Save as template" (#30); turn 7 added "Insets…" (#32), which OPENS the
  // section rather than carrying three millimetre fields in a right-click menu.
  //
  // Turn 8 (CLAUDE.md F7) rewrites the ORDER and turns the construction entries
  // into TOGGLES. The order is what a joiner reaches for, in the order he
  // reaches for it: show me this cabinet's numbers, put a panel on that side,
  // close that gap — and only then the things that move or destroy it.
  assert.deepEqual(ids, [
    'dimensions',
    'end-panel-L', 'end-panel-R', 'end-panel-B',
    'top-infill', 'side-infill',
    'plinth',
    'insets', 'save-template',
    'center-shelves', 'rotate-90', 'back-to-wall', 'side-to-wall', 'delete',
  ]);

  // Nothing is DISABLED any more, and that is the point of the rewrite: turn 4's
  // menu could only ever ADD an end panel, so half the time it was read it was
  // the wrong entry and removing one meant going to the panel. Every one of
  // these says what the state IS and flips it.
  for (const a of wardrobe) assert.notEqual(a.disabled, true, `${a.id} is a dead entry`);

  const dressed = menuActions({
    unit: {
      ...unitOf('WARDROBE'),
      params: {
        ...unitOf('WARDROBE').params,
        plinth: true,
        top_infill_mm: 40,
        end_panels: [{ id: 'ep1', side: 'L', height: 'floor', thickness: 25 }],
      },
    },
    panelPart: 'BUL',
    dimensions: true,
    store,
  });
  const byId = new Map(dressed.map((a) => [a.id, a]));
  assert.equal(byId.get('dimensions').checked, true);
  assert.equal(byId.get('end-panel-L').checked, true, 'the left panel is there, and says so');
  assert.equal(byId.get('end-panel-R').checked, false);
  // "Both" is ticked only when BOTH are there (BACKLOG #31): the store adds them
  // one at a time, so a half-fitted pair still offers to finish the job.
  assert.equal(byId.get('end-panel-B').checked, false);
  assert.equal(byId.get('plinth').checked, true);
  assert.equal(byId.get('top-infill').checked, true);
  // The scribe fillers are ON unless somebody turned them off — they are
  // derived from where the unit stands, not added (BACKLOG #15).
  assert.equal(byId.get('side-infill').checked, true);

  // A wall unit stands on nothing, so it is never offered a plinth.
  const wallIds = menuActions({ unit: unitOf('WUD'), panelPart: 'BUL', store }).map((a) => a.id);
  assert.equal(wallIds.includes('plinth'), false);
  assert.ok(wallIds.includes('top-infill'), 'but it can still be closed up to the ceiling');

  // …and a BASE unit is not offered a top infill at all (turn 8, F2.7): what
  // goes on top of it is a worktop.
  const baseIds = menuActions({ unit: unitOf('BUD'), panelPart: 'BUL', store }).map((a) => a.id);
  assert.equal(baseIds.includes('top-infill'), false);
  assert.ok(baseIds.includes('side-infill'), 'the scribe filler beside it is untouched');

  // A fridge housing has no shelves, so it is not offered a shelf action.
  const fridge = menuActions({ unit: unitOf('FRIDGE'), panelPart: 'BUL', store }).map((a) => a.id);
  assert.equal(fridge.includes('center-shelves'), false);
  assert.ok(fridge.includes('rotate-90') && fridge.includes('delete'));

  // Right-clicking a front also offers to shut everything again.
  const onFront = menuActions({ unit: unitOf('WARDROBE'), panelPart: 'FRONT', store }).map((a) => a.id);
  assert.ok(onFront.includes('close-fronts'));
});

test('every toggle flips the way it is currently set — both ways', () => {
  const called = [];
  const store = {
    toggleUnitDimensions: (id) => called.push(['dims', id]),
    addEndPanel: (id, o) => called.push(['ep+', o.side]),
    removeEndPanel: (id, epId) => called.push(['ep-', epId]),
    addTopInfill: () => called.push(['top+']),
    removeTopInfill: () => called.push(['top-']),
    addPlinth: () => called.push(['plinth+']),
    removePlinth: () => called.push(['plinth-']),
    setSideInfillEnabled: (id, on) => called.push(['side', on]),
    openPanelSection: () => {},
  };
  const bare = unitOf('WARDROBE');
  const run = (unit, id, dimensions = false) => menuActions({
    unit, panelPart: 'BUL', dimensions, store,
  }).find((a) => a.id === id).run();

  // Nothing fitted: every one of them ADDS.
  run(bare, 'end-panel-L');
  run(bare, 'top-infill');
  run(bare, 'plinth');
  run(bare, 'side-infill');
  run(bare, 'dimensions');
  // …and the filler switch turns them OFF, because on a bare unit they are on:
  // the side infill is derived from where the cabinet stands (BACKLOG #15), so
  // the question is never "add one", it is "does this cabinet take one".
  assert.deepEqual(called, [['ep+', 'L'], ['top+'], ['plinth+'], ['side', false], ['dims', 'u1']]);

  // Everything fitted: every one of them TAKES IT OFF. This is the half turn 4
  // did not have, and the reason a joiner had to go to the panel.
  called.length = 0;
  const fitted = {
    ...bare,
    params: {
      ...bare.params,
      plinth: true,
      top_infill_mm: 40,
      side_infill_off: true,
      end_panels: [{ id: 'ep1', side: 'L' }, { id: 'ep2', side: 'R' }],
    },
  };
  run(fitted, 'end-panel-L');
  run(fitted, 'top-infill');
  run(fitted, 'plinth');
  run(fitted, 'side-infill');
  assert.deepEqual(called, [['ep-', 'ep1'], ['top-'], ['plinth-'], ['side', true]],
    'and the filler switch turns them back ON, because this one had them off');

  // "Both sides" takes BOTH off, which is the same act twice — exactly as
  // adding both is.
  called.length = 0;
  run(fitted, 'end-panel-B');
  assert.deepEqual(called, [['ep-', 'ep1'], ['ep-', 'ep2']]);
});

test('every menu action is runnable and calls exactly its own store function', () => {
  const called = [];
  const store = {
    redistributeShelves: (id) => called.push(['center', id]),
    rotateUnit: (id, mode, value) => called.push(['rotate', id, mode, value]),
    removeUnit: (id) => called.push(['delete', id]),
    closeAllFronts: (id) => called.push(['close', id]),
    saveAsTemplate: (id) => called.push(['template', id]),
  };
  const actions = menuActions({ unit: unitOf('WARDROBE'), panelPart: 'DRAWER-FRONT', store });
  for (const a of actions) {
    assert.equal(typeof a.run, 'function', `${a.id} has no run`);
    assert.equal(typeof a.label, 'string');
    a.run();
  }
  // Only the functions this store HAS are recorded; the toggles above are
  // covered by their own test. What this one holds is that every entry is
  // runnable and none of them reaches for somebody else's store function.
  assert.deepEqual(called, [
    ['template', 'u1'],
    ['center', 'u1'],
    ['rotate', 'u1', 'step', 90],
    ['rotate', 'u1', 'back', 0],
    ['rotate', 'u1', 'side', 90],
    ['close', 'u1'],
    ['delete', 'u1'],
  ]);
});

test('only one action is destructive, and it says so', () => {
  const actions = menuActions({ unit: unitOf('BUD'), panelPart: 'BUL', store: {} });
  assert.deepEqual(actions.filter((a) => a.danger).map((a) => a.id), ['delete']);
});
