// ─── TURN 72 · F1 — THE END PANEL'S MENU OPENS, AND SAYS TWO THINGS ────────
//
// The owner, 22.09.2026:
//
//   *"jak kliknę 2 razy na panel boczny po prawej nie pokazuje mi się menu
//   panelu"*
//
// …and then, on the approved mock-up:
//
//   *"panel: up to ceiling; drugi równo z carcasem od dołu; a default do
//   ziemi; reszta ok."*
//
// ─── THE PROBE IS THE FIRST HALF OF THIS FILE ──────────────────────────────
//
// `verify/t72/f1-probe.md` was committed BEFORE a line was changed, and every
// row of it is an assertion here: the engine cuts the board, the scene lets it
// be picked, the store writes the selection — and `MENU_FOR_KIND` answered
// null, so `DesignRoom` cleared the element and `dockFor` was never called.
// The fault was one missing key in one table.
//
// ─── AND THE SECOND HALF IS THE LAW THE FIX MAY NOT BREAK ──────────────────
//
// *"The two chips write the same store paths the numeric `above-unit-ep` /
// `below-unit-ep` fields and `endPanelToCeiling` write today (read them first;
// do not add a second law)."*  So the tests below do not check that a chip
// sets a flag: they check that the ENGINE CUT THE BOARD DIFFERENTLY, which is
// the only thing a client can see.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import {
  elementKind, isSelectableElement, opensOwnModal,
} from '../src/engine/elements.js';
import { runMaterialSetting } from '../src/engine/materials.js';
import { migrateDesign } from '../src/engine/design.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

/** A retail room with one wardrobe and one end panel on its right. */
function aRoomWithAPanel() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
  const added = A.addEndPanelByHand(id, 'R');
  assert.equal(added.ok, true, `the end panel would not go on: ${added.said}`);
  return id;
}

const epPanel = (unitId) => (S().unitResult(unitId)?.panels || [])
  .find((p) => p.part === 'END-PANEL') || null;

// ─── THE PROBE, AS ASSERTIONS ──────────────────────────────────────────────

test('F1 · the probe — the engine cuts the board and the scene lets it be picked', () => {
  const unitId = aRoomWithAPanel();
  const ep = epPanel(unitId);
  assert.ok(ep, 'no END-PANEL was cut');
  assert.equal(elementKind(ep), 'end-panel');
  assert.equal(isSelectableElement(ep), true);
  assert.equal(opensOwnModal(ep), true, 'turn 14 filed an end panel under ATTACHED_KINDS');
  assert.ok(ep.meta.panelId, "the engine stamps the end_panels record's id on the panel");
});

test('F1 · the probe table is committed, and it names the key it convicted', () => {
  const md = read('verify/t72/f1-probe.md');
  assert.match(md, /MENU_FOR_KIND\['end-panel'\]/, 'the table does not ask the question it was written to ask');
  assert.match(md, /CONVICTED/, 'the committed table does not carry its own verdict');
});

// ─── THE FIX: ONE KEY, AND THE ROAD IT OPENS ───────────────────────────────

test('F1 · a 2klik on the end panel now reaches the dock', () => {
  const unitId = aRoomWithAPanel();
  const ep = epPanel(unitId);
  U().clearSelection();
  U().selectElement(unitId, ep.id);
  const found = A.resolveSelection(U().selectedElement);
  assert.ok(found, 'resolveSelection still answers null — DesignRoom would clear the element');
  assert.equal(found.menu, 'panel');
  assert.equal(found.panel.id, ep.id);
  // …and resolved fresh, the way the room resolves it on every recompute.
  const again = A.resolveTarget({ menu: found.menu, unitId, ref: found.ref });
  assert.equal(again.menu, 'panel');
  assert.equal(again.panel.id, ep.id);
});

test('F1 · `panel` is in the vocabulary the dock is held to', () => {
  assert.ok(A.MENUS.includes('panel'), 'MENUS does not carry the end panel');
  assert.equal(A.MENU_FOR_KIND['end-panel'], 'panel');
  // Nothing else came back with it: a carcass click still slides the panel out.
  for (const carcass of ['side', 'top', 'bottom', 'back', 'plinth', 'infill', 'masking-panel']) {
    assert.equal(A.MENU_FOR_KIND[carcass], undefined, `${carcass} must not be selectable`);
  }
});

// ─── THE MENU ITSELF ───────────────────────────────────────────────────────

test('F1 · the menu says what the engine cut — and the default bottom is the FLOOR', () => {
  const unitId = aRoomWithAPanel();
  const menu = A.endPanelMenu(unitId, epPanel(unitId));
  assert.ok(menu, 'the menu has nothing to say about a panel the engine cut');
  assert.equal(menu.side, 'R');
  assert.equal(menu.top, 'carcass', 'a new panel is flush with the carcass on top');
  assert.equal(menu.bottom, 'floor', "*\"a default do ziemi\"*");
  assert.equal(menu.colour, 'fronts', 'run pieces have followed the fronts since T16');
});

test('F1 · TOP · CEILING runs the board up, and CARCASS brings it back', () => {
  const unitId = aRoomWithAPanel();
  const before = epPanel(unitId).box.h;

  A.setEndPanelTopChip(unitId, epPanel(unitId), 'ceiling');
  const up = epPanel(unitId);
  assert.ok(up.box.h > before, 'the board did not grow');
  assert.equal(A.endPanelMenu(unitId, up).top, 'ceiling');
  // It is the ROOM's own answer: with its bottom on the floor and its top at
  // the ceiling, the board is exactly as tall as the room.
  assert.equal(Math.round(up.box.h), Math.round(S().project.room.height));
  assert.ok(up.meta.top_mm > 0, 'the panel says it runs above the carcass');

  A.setEndPanelTopChip(unitId, epPanel(unitId), 'carcass');
  const back = epPanel(unitId);
  assert.equal(Math.round(back.box.h), Math.round(before), 'CARCASS did not bring it back');
  assert.equal(A.endPanelMenu(unitId, back).top, 'carcass');
});

test('F1 · BOTTOM · CARCASS lifts it off the floor, FLOOR puts it back', () => {
  const unitId = aRoomWithAPanel();
  const onTheFloor = epPanel(unitId);

  A.setEndPanelBottomChip(unitId, epPanel(unitId), 'carcass');
  const lifted = epPanel(unitId);
  assert.equal(A.endPanelMenu(unitId, lifted).bottom, 'carcass');
  assert.equal(lifted.meta.below_mm, 0, 'the board still runs below the carcass');
  assert.ok(lifted.box.y >= onTheFloor.box.y, 'the board did not come up off the floor');

  A.setEndPanelBottomChip(unitId, epPanel(unitId), 'floor');
  const down = epPanel(unitId);
  assert.equal(A.endPanelMenu(unitId, down).bottom, 'floor');
  assert.equal(Math.round(down.box.y), Math.round(onTheFloor.box.y), 'FLOOR did not put it back');
  assert.equal(Math.round(down.box.h), Math.round(onTheFloor.box.h));
});

test('F1 · BOTTOM clears the panel\'s OWN drop, because the own drop outranks the mode', () => {
  // `engine/autoparts.js endPanelDrop`: *"given one, it IS the drop, and the
  // MODE is only what answers when nobody has said."*  A chip that set a mode
  // and left a stale number under it would be a chip that lies.
  const unitId = aRoomWithAPanel();
  const ep = epPanel(unitId);
  // 60 and not 120: the store clamps a drop to how much room there actually is
  // under the carcass, which on this wardrobe is its 100 mm legs.
  S().setEndPanelBelow(unitId, ep.meta.panelId, 60);
  assert.equal(epPanel(unitId).meta.below_mm, 60, 'the fixture did not take');

  A.setEndPanelBottomChip(unitId, epPanel(unitId), 'carcass');
  assert.equal(epPanel(unitId).meta.below_mm, 0, 'the stale number survived the chip');
});

test('F1 · COLOUR writes the project\'s own run-piece switch', () => {
  const unitId = aRoomWithAPanel();
  const setting = () => runMaterialSetting(migrateDesign(S().project.design), 'end_panel');
  assert.equal(setting().sameAsFronts, true);

  A.setEndPanelColourChip(unitId, epPanel(unitId), 'other');
  assert.equal(setting().sameAsFronts, false);
  assert.equal(A.endPanelMenu(unitId, epPanel(unitId)).colour, 'other');

  A.setEndPanelColourChip(unitId, epPanel(unitId), 'fronts');
  assert.equal(setting().sameAsFronts, true);
  assert.equal(A.endPanelMenu(unitId, epPanel(unitId)).colour, 'fronts');
});

test('F1 · REMOVE PANEL takes the board off', () => {
  const unitId = aRoomWithAPanel();
  const res = A.removeEndPanelChip(unitId, epPanel(unitId));
  assert.equal(res.ok, true);
  assert.equal(epPanel(unitId), null, 'the board is still cut');
});

// ─── AND THE LAWS THE MENU IS HELD TO ──────────────────────────────────────

test('F1 · NO NUMBER FIELDS in retail\'s panel menu — three chip rows and a way out', () => {
  const menu = read('src/retail/design/detail/EndPanel.jsx');
  assert.equal(/NumberField/.test(menu), false, '*"No number fields in retail."*');
  for (const row of ['end-panel-top', 'end-panel-bottom', 'end-panel-colour']) {
    assert.ok(menu.includes(`testid="${row}"`), `the ${row} row is missing`);
  }
  assert.ok(menu.includes('end-panel-remove'), 'there is no way back out');
  // Exactly the six chips the mock-up carries, and no seventh.
  const ids = [...menu.matchAll(/\{ id: '([a-z]+)', label: '([A-Z ]+)'/g)].map((m) => `${m[1]}:${m[2]}`);
  assert.deepEqual(ids, [
    'carcass:CARCASS', 'ceiling:CEILING',
    'carcass:CARCASS', 'floor:FLOOR',
    'fronts:AS THE FRONTS', 'other:OTHER',
  ]);
});

test('F1 · PRO keeps its four numeric fields — nothing was taken from it', () => {
  const pro = read('src/components/ElementProperties.jsx');
  for (const field of ['end-panel-height', 'thickness-ep', 'above-unit-ep', 'below-unit-ep']) {
    assert.ok(pro.includes(`case '${field}':`), `PRO lost its ${field} field`);
  }
  const elements = read('src/engine/elements.js');
  assert.match(
    elements,
    /'end-panel': \['end-panel-height', 'thickness-ep', 'above-unit-ep', 'below-unit-ep', 'material'\]/,
    'the engine\'s own field list for an end panel moved',
  );
});

test('F1 · not one new store path — every chip presses one PRO already presses', () => {
  const adapter = read('src/retail/design/adapter.js');
  const block = adapter.slice(adapter.indexOf('T72 F1 · THE PANEL\'S OWN MENU'));
  const chips = block.slice(0, block.indexOf('\n// ─── T65'));
  // The four the chips press, and PRO's own line that presses each.
  const pro = read('src/components/ElementProperties.jsx');
  for (const call of ['endPanelToCeiling', 'setEndPanelTop', 'setEndPanelBelow', 'updateEndPanel']) {
    assert.ok(chips.includes(`S().${call}(`), `the menu does not press ${call}`);
    assert.ok(pro.includes(`${call}(unit.id`), `${call} is not a path PRO already presses`);
  }
  // …and the run-piece switch, which is the store's own since T16.
  assert.ok(chips.includes("S().setRunMaterial('end_panel'"), 'COLOUR invented a path');
  const store = read('src/stores/projectStore.js');
  assert.ok(store.includes('setRunMaterial: (role, patch)'), 'setRunMaterial is not the store\'s own');
});
