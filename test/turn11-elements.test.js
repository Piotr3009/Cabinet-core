// ─── Turn 11: selection, per-element editing, placing and feeding ───────────
// CLAUDE.md F1, F3 and F4 — the store and engine halves of them, which is
// everything except what only a browser can answer (that is F10).

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  boardParamFor, elementFields, elementKind, elementLabel, isMainViewElement, isSelectableElement,
} from '../src/engine/elements.js';
import { wallAtPoint, roomWalls, migrateRoom, rectCorners } from '../src/engine/room.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
// Turn 24 (CLAUDE.md F3.1): no thickness, no drawers — the gate, opened.
import { confirmDrawerBox } from './drawer-box-gate.js';

const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);

function project() {
  store().loadProject({
    id: null, name: 't11', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

// ─── F3.1: the whole cabinet is selectable ──────────────────────────────────

test('every piece of a cabinet is a selectable element — not just the shelves', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().addShelves(id, 1);
  store().setDoors(id, { count: 1, hinge: 'L' });
  store().addPlinth(id);
  store().addEndPanel(id, { side: 'R' });
  const panels = resultOf(id).panels.filter((p) => p.box);

  const kinds = new Set(panels.filter(isSelectableElement).map(elementKind));
  for (const wanted of ['side', 'top', 'bottom', 'back', 'shelf', 'door', 'end-panel', 'plinth']) {
    assert.ok(kinds.has(wanted), `${wanted} should be selectable`);
  }
});

// ─── Turn 17 (CLAUDE.md F4.2): THE LINE MOVED, AND WHERE IT MOVED TO ────────
//
// Turn 11 filed a drawer BOX with the drawer PANEL as "mechanism". The owner,
// trying to edit a drawer: "jak je edytuję to nie mają żadnych wcięć, nie widzę
// dziurek." A drawer box is four boards with grooves in them; the panel that
// carries the runners and its fillers really are consequences of the stack.
// So the test keeps its point and moves the line.
test('the drawer PANEL and its fillers are mechanism — they follow the stack', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  confirmDrawerBox();
  store().addDrawers(id, 3);
  const panels = resultOf(id).panels.filter((p) => p.box);
  const mech = panels.filter((p) => p.part === 'DP' || p.part === 'FILLER');
  assert.ok(mech.length, 'this unit really does have a drawer mechanism');
  for (const p of mech) {
    assert.equal(isSelectableElement(p), false, `${p.id} is part of a mechanism, not a piece`);
    assert.equal(elementFields(p).length, 0);
  }
});

test('…and the drawer BOX is a piece you can open and edit', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  confirmDrawerBox();
  store().addDrawers(id, 3);
  const boxes = resultOf(id).panels.filter((p) => p.box && p.role === 'drawer_box');
  assert.ok(boxes.length, 'this unit really does have drawer boxes');
  for (const p of boxes) {
    assert.equal(isSelectableElement(p), true, `${p.id} is a board a joiner can hold`);
    assert.equal(elementKind(p), 'drawer');
    // Turn 17 F8.2: with the fronts off, the BOX is what a joiner clicks — so
    // the drawer's height is edited on it as well as on its front, and since
    // turn 18 (CLAUDE.md F6.4) so is the RUNNER it is fitted with.
    assert.deepEqual(elementFields(p), ['drawer-height', 'runner-variant', 'material']);
    // …but it is NOT clicked in the room: it is inside a shut cabinet, and the
    // turn-13 verdict (a click on a cabinet selects the cabinet) is untouched.
    assert.equal(isMainViewElement(p), false, `${p.id} must not be clickable in the room`);
  }
  // Every drawer of the stack is named apart from the others.
  const names = new Set(boxes.map(elementLabel));
  assert.equal(names.size, boxes.length, `each board of each drawer names itself: ${[...names]}`);
});

test('a piece is named the way a joiner names it', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().addEndPanel(id, { side: 'R' });
  const panels = resultOf(id).panels;
  const label = (pid) => elementLabel(panels.find((p) => p.id === pid));
  assert.equal(label('BUL'), 'Left side');
  assert.equal(label('BUR'), 'Right side');
  assert.equal(label('TOP'), 'Top');
  assert.equal(label('END-R'), 'End panel — right');
});

test('the FIELDS a piece offers are element-appropriate', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().addShelves(id, 1);
  store().setDoors(id, { count: 1, hinge: 'L' });
  store().addEndPanel(id, { side: 'L' });
  const panels = resultOf(id).panels;
  const fields = (pid) => elementFields(panels.find((p) => p.id === pid));

  // A shelf: what KIND it is (turn 21, CLAUDE.md F7 — the modal gains the type,
  // first, because it decides what the rest of the rows mean), where it is, how
  // far back, how thick, what of.
  assert.deepEqual(fields('SHELF-1'), ['shelf-type', 'position-y', 'setback', 'thickness', 'material']);
  // A side: the carcass board (see below) and the material.
  assert.deepEqual(fields('BUL'), ['carcass-board', 'material']);
  // An end panel: its own height, its own board, how far above the unit.
  // Turn 16 (CLAUDE.md F4.3): …and how far it runs BELOW the carcass, which on
  // a wall unit is the masking panel's own height beside the door's own extend.
  assert.deepEqual(fields('END-L'),
    ['end-panel-height', 'thickness-ep', 'above-unit-ep', 'below-unit-ep', 'material']);
  // A door: the hinge side, which is what F3.1 asks for by name.
  assert.ok(fields('01-F').includes('hinge-side'));
  // Everything takes a material.
  for (const pid of ['SHELF-1', 'BUL', 'TOP', 'BACK', 'END-L', '01-F']) {
    assert.ok(fields(pid).includes('material'), `${pid} should take a material`);
  }
});

test('a JOINTED piece edits the carcass board, and says so', () => {
  // The decision behind it is BLOCKERS #58: the tab is one board thickness wide
  // and the socket sits on its centre line, so a 22 mm side in an 18 mm carcass
  // is not a thicker side — it is a joint that does not go together.
  project();
  const { id } = store().addUnit('BUD');
  store().setDoors(id, { count: 1, hinge: 'L' });
  const panels = resultOf(id).panels;
  for (const pid of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK']) {
    const panel = panels.find((p) => p.id === pid);
    assert.ok(elementFields(panel).includes('carcass-board'), `${pid} offers the carcass board`);
    assert.ok(!elementFields(panel).includes('thickness'), `${pid} must not offer its own`);
    assert.equal(boardParamFor(panel), 'board_t');
  }
  // A front is a different board, and the panel knows which.
  assert.equal(boardParamFor(panels.find((p) => p.part === 'FRONT')), 'front_t');
});

// ─── F3.1: a material override, on any piece ────────────────────────────────

test('any piece can be cut from another board, by panel id', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().setElementOverride(id, 'BUL', { material_id: 'm7', material_label: 'Birch ply 18' });
  const side = resultOf(id).panels.find((p) => p.id === 'BUL');
  assert.equal(side.meta.material_label, 'Birch ply 18');
  assert.equal(side.meta.material_id, 'm7');
  // …and the other side is untouched, which is the whole point of "one piece".
  assert.equal(resultOf(id).panels.find((p) => p.id === 'BUR').meta?.material_label ?? null, null);
});

test('clearing an override leaves the project exactly as it was', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().setElementOverride(id, 'TOP', { material_label: 'Oak' });
  assert.ok(unitOf(id).params.element_overrides);
  store().setElementOverride(id, 'TOP', { material_label: null, material_id: null });
  assert.equal(unitOf(id).params.element_overrides, null,
    'an override with nothing in it is not an override');
});

test('an override changes no dimension — it is a material, not a geometry', () => {
  project();
  const { id } = store().addUnit('BUD');
  const before = resultOf(id).panels.map((p) => [p.id, p.w, p.h, p.thickness]);
  store().setElementOverride(id, 'BUL', { material_label: 'Birch ply 18' });
  const after = resultOf(id).panels.map((p) => [p.id, p.w, p.h, p.thickness]);
  assert.deepEqual(after, before);
});

// ─── F3.4: the vertical partition ───────────────────────────────────────────

test('a vertical partition can be added, and is centred in the widest bay', () => {
  project();
  const { id } = store().addUnit('BUD');
  const itemId = store().addPartition(id);
  assert.ok(itemId, 'it went in');
  const G = unitOf(id).params.board_t;
  const W = unitOf(id).params.width;
  const item = unitOf(id).params.sections[0].items.find((i) => i.id === itemId);
  // Centred BOARD in the internal width: equal bays either side.
  assert.ok(Math.abs((item.x_mm - G) - ((W - G) - (item.x_mm + G))) <= P.editor.mmStep,
    `left bay ${item.x_mm - G}, right bay ${(W - G) - (item.x_mm + G)}`);
});

test('the engine cuts it: full height, partition depth, one board thick', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().addPartition(id);
  const unit = unitOf(id);
  const G = unit.params.board_t;
  const H = unit.params.height;
  const result = computeCabinet(paramsForEngine(unit), P);
  const vpart = result.panels.find((p) => p.id === 'VPART-1');
  assert.ok(vpart, 'the piece is emitted');
  assert.equal(vpart.w, H - 2 * G, 'it runs between the bottom and the top');
  assert.equal(vpart.thickness, G);
  assert.equal(vpart.role, 'shelf', 'it groups and selects with the shelves');
  assert.equal(vpart.box.h, H - 2 * G);
  assert.equal(vpart.box.w, G);
  assert.equal(vpart.box.y, G, 'standing on the bottom panel');
  // …and it is a SELECTABLE element with a position of its own.
  assert.equal(elementKind(vpart), 'partition');
  // TURN 24 (CLAUDE.md F3.3): and WHICH carcass board it is cut from — the
  // owner's "grubość przegrody się nie zmienia", as a picker rather than a
  // number typed twice.
  assert.deepEqual(elementFields(vpart), ['position-x', 'partition-slot', 'setback', 'thickness', 'material']);
});

test('a partition is clamped like a shelf: never through a side, never on another', () => {
  project();
  const { id } = store().addUnit('BUD');
  const first = store().addPartition(id);
  const G = unitOf(id).params.board_t;
  const W = unitOf(id).params.width;

  const far = store().setPartitionX(id, first, 10000);
  assert.ok(far.x <= W - 2 * G, 'it stops inside the right side');
  const near = store().setPartitionX(id, first, -500);
  assert.ok(near.x >= G, 'and inside the left one');

  const second = store().addPartition(id);
  if (second) {
    const at = (itemId) => unitOf(id).params.sections[0].items.find((i) => i.id === itemId).x_mm;
    store().setPartitionX(id, second, at(first));
    assert.ok(Math.abs(at(second) - at(first)) >= P.editor.minShelfGap - 1e-9,
      'two partitions keep the minimum gap');
  }
});

test('no partition item, no partition panel — the kit is untouched', () => {
  const bare = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', shelves: 1,
  }, P);
  assert.equal(bare.panels.some((p) => p.part === 'VPART'), false);
});

// ─── F4.1: round the corner ─────────────────────────────────────────────────

test('a point on the floor knows which wall it belongs to', () => {
  const walls = roomWalls(migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }));
  // Just inside wall 0, a third of the way along it.
  const near = wallAtPoint(walls, {
    x: walls[0].start.x + walls[0].along.x * 1200 + walls[0].inward.x * 200,
    y: walls[0].start.y + walls[0].along.y * 1200 + walls[0].inward.y * 200,
  });
  assert.equal(near.index, 0);
  assert.ok(Math.abs(near.along - 1200) < 1e-6);
  assert.ok(Math.abs(near.distance - 200) < 1e-6);

  // Nowhere near the room at all: nothing, so a drag leaves the unit alone.
  assert.equal(wallAtPoint(walls, { x: -9000, y: -9000 }), null);
});

test('a unit dragged in front of another wall is re-homed onto it', () => {
  project();
  const { id } = store().addUnit('BUD');
  assert.equal(unitOf(id).position.wall, 0);
  const moved = store().moveUnitToWall(id, 1, 500, 1);
  assert.equal(moved.error, null);
  assert.equal(moved.blocked, false);
  assert.equal(unitOf(id).position.wall, 1);
  // The ordinary clamp settled it — the wall margin is the infill stop.
  assert.ok(unitOf(id).position.x_mm >= 40 - 1e-9);
});

test('…and the same wall is an ordinary slide, not a re-home', () => {
  project();
  const { id } = store().addUnit('BUD');
  const moved = store().moveUnitToWall(id, 0, 1200, 1);
  assert.equal(moved.wall, 0);
  assert.equal(unitOf(id).position.x_mm, 1200);
});

test('a wall with no room REFUSES, and the unit stays where it was', () => {
  // The rule turn 3 phase 4 closed off: an overlap the app created itself.
  store().loadProject({
    id: null,
    name: 'tight',
    // A room whose second wall is far too short for a 600 mm cabinet.
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 300) }),
    design: {},
  }, []);
  const { id } = store().addUnit('BUD');
  const from = { ...unitOf(id).position };
  const moved = store().moveUnitToWall(id, 1, 100, 1);
  assert.equal(moved.blocked, true);
  assert.match(moved.error, /no free space/i);
  assert.deepEqual({ ...unitOf(id).position }, from, 'put back exactly where it was');
});

// ─── F1: selection and the modes ────────────────────────────────────────────

test('selecting an element keeps the unit selected but not HIGHLIGHTED', () => {
  // The store half of F1.2. The 3D half — the dashed box disappearing — is one
  // line in UnitView reading exactly this state, and F10 looks at it.
  project();
  const { id } = store().addUnit('BUD');
  ui().selectUnit(id);
  assert.equal(ui().selectedElement, null);
  ui().selectElement(id, 'BUL');
  assert.equal(ui().selectedUnitId, id, 'the piece is still IN that cabinet');
  assert.deepEqual(ui().selectedElement, { unitId: id, elementRef: 'BUL' });
  // Escape steps back out one level at a time (turn 9), which is the other half.
  ui().clearElement();
  assert.equal(ui().selectedElement, null);
  assert.equal(ui().selectedUnitId, id);
});

test('the dimension ink is RED by default, and the profile says so', () => {
  assert.equal(P.appearance.dimensions.colour, 'red');
  assert.equal(P.appearance.dimensions.alt, 'navy');
  assert.ok(P.dimensions.colours.red, 'and the hex is where hexes live');
  assert.equal(useUiStore.getState().dimensionColour, 'red');
});

test('the dimension colour can be switched, and nonsense is ignored', () => {
  ui().setDimensionColour('navy');
  assert.equal(ui().dimensionColour, 'navy');
  ui().setDimensionColour('chartreuse');
  assert.equal(ui().dimensionColour, 'navy', 'an ink the profile has never heard of changes nothing');
  ui().setDimensionColour('red');
});

test('X-ray and the hinges are MODES: they are remembered', () => {
  // The store contract behind F1.3. Persistence is localStorage, which node has
  // none of — the setters fall back cleanly, which is the thing worth checking.
  ui().setXray(true);
  assert.equal(ui().xray, true);
  ui().toggleXray();
  assert.equal(ui().xray, false);
  assert.equal(ui().showHinges, true, 'hinges are drawn in Solid by default (F3.5)');
  ui().toggleHinges();
  assert.equal(ui().showHinges, false);
  ui().toggleHinges();
});

test('entering CNC opens the right panel and closes nothing', () => {
  ui().closeRightPanel();
  ui().setViewMode('cnc');
  assert.equal(ui().rightPanelOpen, true, 'the checkbox tree has to be reachable');
  assert.equal(ui().viewMode, 'cnc');
  ui().setViewMode('3d');
  assert.equal(ui().rightPanelOpen, true, 'and coming back does not shut it either');
});

// ─── F4.4: what a cabinet offers to put inside it ───────────────────────────

test('what a unit offers is decided by its FAMILY, as data', () => {
  assert.deepEqual(P.itemsByContext.kitchen, ['shelves', 'drawers', 'partition', 'cargo', 'bins']);
  assert.deepEqual(P.itemsByContext.wardrobe, ['shelves', 'hanger', 'drawers', 'partition', 'pulldown']);
  // A kitchen unit is not offered a hanging rail first, and a wardrobe is.
  assert.ok(!P.itemsByContext.kitchen.includes('hanger'));
  assert.ok(P.itemsByContext.wardrobe.includes('hanger'));
  // …and a family nobody has listed still gets a sensible list rather than none.
  assert.ok(P.itemsByContext.default.length >= 2);
});
