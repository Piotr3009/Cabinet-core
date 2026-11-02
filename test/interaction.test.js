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

// REWRITTEN BY the right-click menu turn (01.11.2026): the owner's list, on the
// mockups: *"drawers front usun ... colour i turn tez usunac, save as template
// narazie zostaw ... rename ... na pole name, juz jest ... jak juz to copy czyli
// duplicate bym tylko zostawil, natomiast center shelves i center between oraz
// add doors bym dodal"*. Rename, Colour, Rotate 90, Back to wall, Side to wall
// and Drawer fronts left the menu (their acts stay where they live); the three
// end panel rows are one choice row, so are the three cornice rows.
test('the menu offers what the unit has, and always offers the basics', () => {
  const store = {};
  const wardrobe = menuActions({ unit: unitOf('WARDROBE'), panelPart: 'BUL', store });
  const ids = wardrobe.map((a) => a.id);
  assert.deepEqual(ids, [
    'edit-cabinet',
    'plinth', 'top-infill', 'cornice', 'end-panels', 'side-infill', 'pin-infill-L', 'pin-infill-R',
    'center-shelves', 'center-between', 'add-doors',
    'save-template', 'duplicate',
    'delete',
  ]);
  for (const gone of ['rename', 'unit-colour', 'rotate-90', 'back-to-wall', 'side-to-wall', 'drawer-fronts']) {
    assert.equal(ids.includes(gone), false, `${gone} is out of the menu`);
  }

  // Nothing is DISABLED on a bare cabinet: every switch says what the state IS
  // and flips it (turn 8).
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
  // T50-F10: `dimensions` is no longer an entry; the ARGUMENT stays accepted.
  assert.equal(byId.has('dimensions'), false);
  const endPanels = byId.get('end-panels');
  assert.equal(endPanels.kind, 'choice');
  assert.deepEqual(endPanels.options.map((o) => [o.label, o.selected]),
    [['None', false], ['Left', true], ['Right', false], ['Both', false]], 'the left panel is there, and says so');
  assert.equal(byId.get('plinth').checked, true);
  assert.equal(byId.get('top-infill').checked, true);
  // The scribe fillers are ON unless somebody turned them off (BACKLOG #15).
  assert.equal(byId.get('side-infill').checked, true);

  // A wall unit stands on nothing, so it is never offered a plinth.
  const wallIds = menuActions({ unit: unitOf('WUD'), panelPart: 'BUL', store }).map((a) => a.id);
  assert.equal(wallIds.includes('plinth'), false);
  assert.ok(wallIds.includes('top-infill'), 'but it can still be closed up to the ceiling');

  // …and a BASE unit is not offered a top infill at all (turn 8, F2.7).
  const baseIds = menuActions({ unit: unitOf('BUD'), panelPart: 'BUL', store }).map((a) => a.id);
  assert.equal(baseIds.includes('top-infill'), false);
  assert.ok(baseIds.includes('side-infill'), 'the scribe filler beside it is untouched');

  // A fridge housing has no shelves, so it is not offered a shelf action.
  const fridge = menuActions({ unit: unitOf('FRIDGE'), panelPart: 'BUL', store }).map((a) => a.id);
  assert.equal(fridge.includes('center-shelves'), false);
  assert.equal(fridge.includes('center-between'), false);
  assert.ok(fridge.includes('duplicate') && fridge.includes('delete'));

  // Right-clicking a front is the DOOR's menu, and it offers to shut everything again.
  const onFront = menuActions({ unit: unitOf('WARDROBE'), panelPart: 'FRONT', store }).map((a) => a.id);
  assert.ok(onFront.includes('close-fronts'));
});

test('every toggle flips the way it is currently set: both ways', () => {
  const called = [];
  const store = {
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
  const find = (unit, id) => menuActions({ unit, panelPart: 'BUL', store }).find((a) => a.id === id);
  const run = (unit, id) => find(unit, id).run();
  const pick = (unit, id, option) => find(unit, id).options.find((o) => o.id === option).run();

  // Nothing fitted: every one of them ADDS…
  pick(bare, 'end-panels', 'L');
  run(bare, 'top-infill');
  run(bare, 'plinth');
  run(bare, 'side-infill');
  // …and the filler switch turns them OFF, because on a bare unit they are on.
  assert.deepEqual(called, [['ep+', 'L'], ['top+'], ['plinth+'], ['side', false]]);

  // Everything fitted: every one of them TAKES IT OFF.
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
  pick(fitted, 'end-panels', 'R');
  run(fitted, 'top-infill');
  run(fitted, 'plinth');
  run(fitted, 'side-infill');
  assert.deepEqual(called, [['ep-', 'ep1'], ['top-'], ['plinth-'], ['side', true]],
    'Right takes the left one off and keeps the right; the filler switch turns them back ON');

  // "None" takes BOTH off, the same act twice.
  called.length = 0;
  pick(fitted, 'end-panels', 'none');
  assert.deepEqual(called, [['ep-', 'ep1'], ['ep-', 'ep2']]);
  // …and "Both" on a bare one puts both on, one side at a time.
  called.length = 0;
  pick(bare, 'end-panels', 'B');
  assert.deepEqual(called, [['ep+', 'L'], ['ep+', 'R']]);
});

test('every menu action is runnable and calls exactly its own store function', () => {
  const called = [];
  const store = {
    redistributeShelves: (id) => called.push(['center', id]),
    armCentreBetween: (id) => called.push(['between', id]),
    addDoors: (ids) => called.push(['doors', ids]),
    removeUnit: (id) => called.push(['delete', id]),
    saveAsTemplate: (id) => called.push(['template', id]),
    duplicateUnits: (ids) => called.push(['duplicate', ids]),
  };
  const actions = menuActions({ unit: unitOf('WARDROBE'), panelPart: 'BUL', store });
  for (const a of actions) {
    assert.equal(typeof a.label, 'string');
    if (a.kind === 'choice') {
      assert.ok(a.options.length > 1, `${a.id} offers no choice`);
      for (const o of a.options) assert.equal(typeof o.run, 'function', `${a.id} ${o.id} has no run`);
      continue;
    }
    assert.equal(typeof a.run, 'function', `${a.id} has no run`);
    a.run();
  }
  // Only the functions this store HAS are recorded; the toggles are covered
  // by their own test. None of them reaches for somebody else's function.
  assert.deepEqual(called, [
    ['center', 'u1'],
    ['between', 'u1'],
    ['doors', ['u1']],
    ['template', 'u1'],
    ['duplicate', ['u1']],
    ['delete', 'u1'],
  ]);
});

test('only one action is destructive, and it says so', () => {
  const actions = menuActions({ unit: unitOf('BUD'), panelPart: 'BUL', store: {} });
  assert.deepEqual(actions.filter((a) => a.danger).map((a) => a.id), ['delete']);
});
