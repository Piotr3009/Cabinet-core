/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── THE RIGHT-CLICK MENU TURN (01.11.2026): THE MENU AND ITS STORE ACTS ─────
//
// The owner, on the mockups (19:46 to 22:05): *"drawers front usun ... colour i
// turn tez usunac, save as template narazie zostaw ... rename ... na pole name,
// juz jest, mniej zmian ... show in cnc tez nie, jak juz to copy czyli duplicate
// bym tylko zostawil, natomiast center shelves i center between oraz add doors
// bym dodal"*; *"tak jak teraz na wszystkie dzialaja ktore sa zaznaczone
// oczywiscie"*; *"zmien pisownie"* (Centre); of a door: *"to doors a nie cala
// szafka, nie zmieniaj"*.
//
// What is held here, the way the client clicks: Duplicate of one and of three
// (new ids, the same parameters, no overlap, one undo step, the copies
// selected, all or nothing); every entry of the several menu acting on all of
// them in one undo step; the mixed state's label and its two clicks; the
// choice rows; the door's and the drawer front's own menus; the entries the
// owner took out, absent from every menu; and no dash in any word the menu says.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  groupedActions, menuActions, menuTitle, MENU_GROUPS,
} from '../src/lib/contextActions.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { UNIT_TYPES, defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { unitSpan } from '../src/engine/collision.js';
import { confirmDrawerBox } from './drawer-box-gate.js';

const S = () => useProjectStore.getState();
const history = () => useHistoryStore.getState();
const unitOf = (id) => S().units.find((u) => u.id === id);

function room(width = 6000, depth = 3000, height = 2500) {
  S().loadProject({
    id: null,
    name: 'menu-store',
    room: migrateRoom({ height, corners: rectCorners(width, depth) }),
    design: {},
  }, []);
  confirmDrawerBox();
  useUiStore.getState().clearSelection();
}

/** The store object the menu is handed, built from the REAL store acts. */
const realStore = (extra = {}) => {
  const s = S();
  return {
    batch: s.batch,
    addPlinth: s.addPlinth,
    removePlinth: s.removePlinth,
    addTopInfill: s.addTopInfill,
    removeTopInfill: s.removeTopInfill,
    setCornice: s.setCornice,
    addEndPanel: s.addEndPanel,
    removeEndPanel: s.removeEndPanel,
    setSideInfillEnabled: s.setSideInfillEnabled,
    setSideInfillPinned: s.setSideInfillPinned,
    addBottomMask: s.addBottomMask,
    removeBottomMask: s.removeBottomMask,
    addUpstand: s.addUpstand,
    removeUpstand: s.removeUpstand,
    redistributeShelves: s.redistributeShelves,
    addDoors: (ids) => s.addDoorsBulk(ids),
    duplicateUnits: s.duplicateUnits,
    removeUnit: s.removeUnit,
    openPanelSection: () => {},
    ...extra,
  };
};

const cleanParams = (u) => {
  const p = JSON.parse(JSON.stringify(u.params));
  for (const key of ['unit_num', 'side_infill_left_mm', 'side_infill_right_mm', 'front_edge_trim', 'end_panels']) delete p[key];
  for (const section of p.sections || []) for (const item of section.items || []) delete item.id;
  return p;
};
const itemIds = (u) => (u.params.sections || []).flatMap((s) => (s.items || []).map((i) => i.id));

/** No two cabinets of one band on one wall overlap (the collision rule the store keeps). */
function assertNoOverlap() {
  const units = S().units;
  for (let i = 0; i < units.length; i += 1) {
    for (let j = i + 1; j < units.length; j += 1) {
      const a = units[i];
      const b = units[j];
      if ((a.position.wall ?? 0) !== (b.position.wall ?? 0)) continue;
      if (a.params.rides_on || b.params.rides_on) continue;
      const band = (u) => (UNIT_TYPES[u.type]?.mount === 'wall' ? 'wall' : 'floor');
      if (band(a) !== band(b)) continue;
      const sa = unitSpan(a);
      const sb = unitSpan(b);
      assert.ok(sa.right <= sb.left + 0.5 || sb.right <= sa.left + 0.5,
        `${a.params.unit_num} [${sa.left}, ${sa.right}] overlaps ${b.params.unit_num} [${sb.left}, ${sb.right}]`);
    }
  }
}

test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

// ─── DUPLICATE ──────────────────────────────────────────────────────────────

test('Duplicate one: a copy beside it, the same type and parameters, new ids, the next number, one undo step', () => {
  room();
  const a = S().addUnit('WARDROBE').id;
  S().addDoors(a);
  S().addShelvesBulk([a], 2);
  S().setUnitFinish([a], { front_type_id: 'f2' });
  history().clear();
  const before = JSON.parse(JSON.stringify(S().units));
  const depth = history().past.length;

  const res = S().duplicateUnits([a]);
  flushHistory();
  assert.equal(res.ok, true, res.error);
  assert.equal(res.ids.length, 1);
  const [copyId] = res.ids;
  assert.notEqual(copyId, a, 'a new unit id');
  const src = unitOf(a);
  const copy = unitOf(copyId);
  assert.equal(copy.type, src.type);
  assert.deepEqual(cleanParams(copy), cleanParams(src), 'the same parameters, colour and contents');
  assert.equal(copy.params.front_type_id, 'f2', 'the colour is a parameter and comes with it');
  assert.ok(itemIds(copy).length > 0, 'the shelves came with it');
  assert.equal(itemIds(copy).filter((id) => itemIds(src).includes(id)).length, 0, 'no item id is reused');
  assert.notEqual(copy.params.unit_num, src.params.unit_num, 'the next free number');
  assert.equal(copy.position.wall, src.position.wall, 'on its wall');
  assertNoOverlap();
  // The copy is selected afterwards.
  assert.deepEqual(useUiStore.getState().selectedUnitIds, [copyId]);
  // ONE undo step takes it out again.
  assert.equal(history().past.length, depth + 1, 'one Duplicate is one entry on the stack');
  assert.ok(history().undo());
  assert.deepEqual(JSON.parse(JSON.stringify(S().units)), before, 'one Ctrl+Z and the room is as it was');
});

test('Duplicate three: three copies, each of its own original, no overlap, one undo step, all three selected', () => {
  room();
  const ids = [S().addUnit('BUD').id];
  ids.push(S().addUnit('BUD', { near: ids[0], side: 'R' }).id);
  ids.push(S().addUnit('WUD').id);
  S().updateUnitParams(ids[1], { width: 500 });
  history().clear();
  const count = S().units.length;
  const depth = history().past.length;

  const res = S().duplicateUnits(ids);
  flushHistory();
  assert.equal(res.ok, true, res.error);
  assert.equal(res.ids.length, 3);
  assert.equal(S().units.length, count + 3);
  assert.equal(new Set([...ids, ...res.ids]).size, 6, 'six distinct unit ids');
  const nums = S().units.map((u) => u.params.unit_num);
  assert.equal(new Set(nums).size, nums.length, 'no two cabinets wear one number');
  // Each copy matches ITS original (the 500 mm one is copied at 500).
  const widths = (list) => list.map((id) => [unitOf(id).type, unitOf(id).params.width]).sort();
  assert.deepEqual(widths(res.ids), widths(ids));
  const wall = unitOf(ids[2]);
  const wallCopy = res.ids.map(unitOf).find((u) => u.type === 'WUD');
  assert.equal(wallCopy.params.mount_height, wall.params.mount_height, 'a hung copy hangs at its original\'s height');
  assertNoOverlap();
  assert.deepEqual([...useUiStore.getState().selectedUnitIds].sort(), [...res.ids].sort(), 'the copies are selected');
  assert.equal(history().past.length, depth + 1, 'three copies, one undo step');
  assert.ok(history().undo());
  assert.equal(S().units.length, count);
});

test('Duplicate with no room beside it says why in words and adds nothing', () => {
  room(1300);
  const a = S().addUnit('BUD').id;
  const before = JSON.parse(JSON.stringify(S().units));
  const res = S().duplicateUnits([a]);
  assert.equal(res.ok, false);
  assert.match(res.error, /^Nothing was duplicated\. 01: There is no room for 600 mm/);
  assert.deepEqual(JSON.parse(JSON.stringify(S().units)), before, 'nothing added, nothing moved');
});

test('Duplicate re-keys the front-keyed maps to the copy\'s number, and a top box rides its host\'s copy', () => {
  room(5000, 3000, 2800);
  const w = S().addUnit('WARDROBE').id;
  const t = S().addUnit('WARDROBE_TOP', { near: w }).id;
  assert.equal(unitOf(t).params.rides_on, w);
  S().addDoors(w);
  const front = S().unitResult(w).panels.find((p) => p.part === 'FRONT');
  S().setElementOverride(w, front.id, { material_label: 'Oak veneer', material_key: 'front:f2' });
  const res = S().duplicateUnits([t, w]);
  assert.equal(res.ok, true, res.error);
  const copy = res.ids.map(unitOf).find((u) => u.type === 'WARDROBE');
  const box = res.ids.map(unitOf).find((u) => u.type === 'WARDROBE_TOP');
  assert.equal(box.params.rides_on, copy.id, 'the box rides the COPY of its host, not the original');
  const copyFront = S().unitResult(copy.id).panels.find((p) => p.part === 'FRONT');
  assert.notEqual(copyFront.id, front.id, 'a front carries its cabinet\'s number');
  assert.equal(copyFront.meta.material_label, 'Oak veneer', 'the door\'s own material came with the copy');
  assert.deepEqual(Object.keys(unitOf(w).params.element_overrides), [front.id], 'the original keeps its own');
});

// ─── SEVERAL CABINETS: EVERY ENTRY ON ALL, ONE UNDO STEP EACH ───────────────

function three() {
  room();
  const ids = [S().addUnit('BUD').id];
  ids.push(S().addUnit('BUD', { near: ids[0], side: 'R' }).id);
  ids.push(S().addUnit('BUD', { near: ids[1], side: 'R' }).id);
  history().clear();
  return ids;
}
const menuOver = (ids, extra = {}) => {
  const units = ids.map(unitOf);
  return menuActions({ unit: units[0], selection: units, panelPart: 'BUL', store: realStore(extra), profile: P });
};

test('several: the header says how many, once, and Edit cabinet and Centre between are not offered', () => {
  const ids = three();
  const units = ids.map(unitOf);
  assert.equal(menuTitle({ unit: units[0], selection: units }), '3 cabinets selected');
  assert.equal(menuTitle({ units, part: 'BUL' }), '3 cabinets selected', 'the `units` and `part` aliases');
  const offered = menuOver(ids).map((a) => a.id);
  assert.ok(!offered.includes('edit-cabinet'));
  assert.ok(!offered.includes('center-between'));
});

test('several: Delete takes all of them, in one undo step', () => {
  const ids = three();
  const depth = history().past.length;
  const del = menuOver(ids).find((a) => a.id === 'delete');
  assert.equal(del.label, 'Delete 3 cabinets');
  assert.equal(del.danger, true);
  del.run();
  flushHistory();
  assert.equal(S().units.length, 0, 'all three are gone, not the one clicked');
  assert.equal(history().past.length, depth + 1);
  history().undo();
  assert.equal(S().units.length, 3, 'one Ctrl+Z brings the three back');
});

test('several: Duplicate copies all of them, Centre shelves and Add doors act on all, each one undo step', () => {
  const ids = three();
  for (const id of ids) S().addShelvesBulk([id], 2);
  history().clear();
  let depth = history().past.length;
  menuOver(ids).find((a) => a.id === 'add-doors').run();
  flushHistory();
  for (const id of ids) assert.ok(unitOf(id).params.doors, `${unitOf(id).params.unit_num} has its doors`);
  assert.equal(history().past.length, depth + 1);

  depth = history().past.length;
  menuOver(ids).find((a) => a.id === 'duplicate').run();
  flushHistory();
  assert.equal(S().units.length, 6);
  assert.equal(history().past.length, depth + 1);
  assertNoOverlap();
});

test('several: the end panel row asks every one of them, and None takes every panel off, one undo step each', () => {
  const ids = three();
  const had = new Map(ids.map((id) => [id, (unitOf(id).params.end_panels || []).map((ep) => ep.side)]));
  const asked = [];
  const spyStore = { addEndPanel: (id, opts) => { asked.push([id, opts.side]); return S().addEndPanel(id, opts); } };
  let depth = history().past.length;
  const row = menuOver(ids, spyStore).find((a) => a.id === 'end-panels');
  assert.equal(row.kind, 'choice');
  row.options.find((o) => o.id === 'B').run();
  flushHistory();
  // Each cabinet is asked for the sides it lacks; a side hard against a
  // neighbour is refused by the store in its own words, as today.
  for (const id of ids) {
    const lacked = ['L', 'R'].filter((side) => !had.get(id).includes(side));
    assert.deepEqual(asked.filter(([u]) => u === id).map(([, side]) => side), lacked,
      `${unitOf(id).params.unit_num} is asked for exactly the sides it lacked`);
  }
  assert.ok((unitOf(ids[0]).params.end_panels || []).some((ep) => ep.side === 'L'), 'the run\'s open left end has its panel');
  assert.ok((unitOf(ids[2]).params.end_panels || []).some((ep) => ep.side === 'R'), 'and its open right end');
  assert.equal(history().past.length, depth + 1, 'one step');
  depth = history().past.length;
  menuOver(ids).find((a) => a.id === 'end-panels').options.find((o) => o.id === 'none').run();
  flushHistory();
  for (const id of ids) {
    assert.equal((unitOf(id).params.end_panels || []).filter((ep) => ep.side === 'L' || ep.side === 'R').length, 0);
  }
  assert.equal(history().past.length, depth + 1, 'one step');
});

// ─── THE MIXED STATE (board 2: "Plinth (1 of 3)") ───────────────────────────

test('the mixed state: "Plinth (1 of 3)", a click puts it on all, the next click takes it off all', () => {
  const ids = three();
  S().removePlinth(ids[1]);
  S().removePlinth(ids[2]);
  history().clear();
  let plinth = menuOver(ids).find((a) => a.id === 'plinth');
  assert.equal(plinth.kind, 'toggle');
  assert.equal(plinth.checked, 'mixed');
  assert.equal(plinth.label, 'Plinth (1 of 3)');
  const depth = history().past.length;
  plinth.run();
  flushHistory();
  assert.deepEqual(ids.map((id) => unitOf(id).params.plinth), [true, true, true], 'ON for all');
  assert.equal(history().past.length, depth + 1, 'one undo step');
  plinth = menuOver(ids).find((a) => a.id === 'plinth');
  assert.equal(plinth.checked, true);
  assert.equal(plinth.label, 'Plinth', 'no count when they agree');
  plinth.run();
  assert.deepEqual(ids.map((id) => unitOf(id).params.plinth), [false, false, false], 'OFF for all');
  assert.equal(menuOver(ids).find((a) => a.id === 'plinth').checked, false);
});

test('the mixed state reads each cabinet: the scribe fillers and the pins, on the ones that can take them', () => {
  const ids = three();
  S().setSideInfillEnabled(ids[0], false);
  const actions = menuOver(ids);
  const fillers = actions.find((a) => a.id === 'side-infill');
  assert.equal(fillers.checked, 'mixed');
  assert.equal(fillers.label, 'Scribe fillers at the wall (2 of 3)');
  // A pin is about the two whose fillers are on: none pinned, so plain and off.
  const pin = actions.find((a) => a.id === 'pin-infill-L');
  assert.equal(pin.checked, false);
  assert.equal(pin.label, 'Pin infill left');
  // With the fillers off on every one, the pin is greyed with its reason.
  for (const id of ids) S().setSideInfillEnabled(id, false);
  const off = menuOver(ids).find((a) => a.id === 'pin-infill-L');
  assert.equal(off.disabled, true);
  assert.match(off.disabledReason, /Scribe fillers at the wall are off for these cabinets/);
});

// ─── THE CHOICE ROWS ────────────────────────────────────────────────────────

test('a choice row that differs selects no option; a click on one sets it on all', () => {
  room();
  const ids = [S().addUnit('WUD').id];
  ids.push(S().addUnit('WUD', { near: ids[0], side: 'R' }).id);
  ids.push(S().addUnit('WUD', { near: ids[1], side: 'R' }).id);
  S().setCornice(ids[0], 70);
  const cornice = () => menuOver(ids).find((a) => a.id === 'cornice');
  assert.deepEqual(cornice().options.map((o) => o.label), ['None', ...P.autoParts.cornice.heights.map(String)]);
  // The run's cornice is one law (T72 F8): what one carries the run carries,
  // so read what the store wrote and hold the row to it.
  const now = ids.map((id) => Number(unitOf(id).params.cornice) || 0);
  const agree = now.every((h) => h === now[0]);
  assert.equal(cornice().options.some((o) => o.selected), agree, 'selected only when all agree');
  cornice().options.find((o) => o.label === '100').run();
  assert.deepEqual(ids.map((id) => Number(unitOf(id).params.cornice)), [100, 100, 100]);
  assert.deepEqual(cornice().options.map((o) => o.selected), [false, false, true]);

  // End panels: Left on one, nothing on the others, so no option is selected.
  S().addEndPanel(ids[0], { side: 'L' });
  const row = menuOver(ids).find((a) => a.id === 'end-panels');
  assert.equal(row.options.some((o) => o.selected), false);
  assert.deepEqual(row.options.map((o) => o.label), ['None', 'Left', 'Right', 'Both']);
});

// ─── THE PART MENUS ─────────────────────────────────────────────────────────

test('a DOOR clicked: its own entries, then its cabinet, and the whole cabinet menu one click away', () => {
  room();
  const id = S().addUnit('WARDROBE').id;
  S().addDoors(id);
  const unit = unitOf(id);
  const result = S().unitResult(id);
  const front = result.panels.find((p) => p.part === 'FRONT');
  const called = [];
  const store = {
    editElement: (u, p) => called.push(['edit', u, p]),
    updateUnitParams: (u, patch) => called.push(['hinge', u, patch.hinge]),
    closeAllFronts: (u) => called.push(['close', u]),
    removeFront: (u, p) => called.push(['remove', u, p]),
    clearElement: () => called.push(['clear']),
    editCabinet: (u) => called.push(['cabinet', u]),
  };
  const args = {
    unit, selection: [unit], panelPart: 'FRONT', panelId: front.id, result, store, profile: P,
  };
  assert.equal(menuTitle(args), `Door · ${unit.params.unit_num} Wardrobe`);
  const actions = menuActions(args);
  assert.deepEqual(actions.map((a) => a.id), ['edit-door', 'hinge-side', 'close-fronts', 'remove-door', 'edit-cabinet', 'cabinet-actions']);
  const groups = groupedActions(actions);
  assert.deepEqual(groups.map((g) => [g.id, g.title]), [['part', undefined], ['cabinet', `Cabinet ${unit.params.unit_num}`]]);
  const by = new Map(actions.map((a) => [a.id, a]));
  assert.equal(by.get('edit-door').framed, true);
  assert.equal(by.get('edit-door').label, 'Edit this door…');
  by.get('edit-door').run();
  const hinge = by.get('hinge-side');
  assert.equal(hinge.kind, 'choice');
  const hand = front.meta.hinge === 'R' ? 'R' : 'L';
  assert.deepEqual(hinge.options.map((o) => [o.id, o.selected]), [['L', hand === 'L'], ['R', hand === 'R']]);
  if (!hinge.disabled) hinge.options.find((o) => o.id !== hand).run();
  by.get('close-fronts').run();
  by.get('remove-door').run();
  assert.deepEqual(called.filter((c) => c[0] !== 'hinge'), [
    ['edit', id, front.id], ['close', id], ['remove', id, front.id], ['clear'],
  ]);
  if (!hinge.disabled) assert.ok(called.some((c) => c[0] === 'hinge' && c[2] === (hand === 'L' ? 'R' : 'L')));
  // The submenu is the one cabinet menu, exactly.
  const sub = by.get('cabinet-actions');
  assert.equal(sub.kind, 'submenu');
  assert.deepEqual(sub.items.map((a) => a.id),
    menuActions({ unit, selection: [unit], store: {}, profile: P }).map((a) => a.id));
  // No Delete, Show in CNC, Size or Colour in the door's own entries.
  for (const gone of ['delete', 'show-in-cnc', 'size', 'unit-colour']) assert.ok(!by.has(gone), gone);
});

test('a one-door cabinet: the hinge side is the right panel\'s act, updateUnitParams({ hinge })', () => {
  room();
  const id = S().addUnit('BUD').id;
  S().addDoors(id);
  const result = S().unitResult(id);
  assert.equal(result.derived.doors, 1, 'a 600 base unit hangs one door');
  const front = result.panels.find((p) => p.part === 'FRONT');
  const got = [];
  const row = menuActions({
    unit: unitOf(id), panelPart: 'FRONT', panelId: front.id, result, store: { updateUnitParams: (u, patch) => got.push([u, patch]) }, profile: P,
  }).find((a) => a.id === 'hinge-side');
  assert.notEqual(row.disabled, true);
  const other = front.meta.hinge === 'R' ? 'L' : 'R';
  row.options.find((o) => o.id === other).run();
  assert.deepEqual(got, [[id, { hinge: other }]]);
  // …and with the real store the door swaps its hand.
  S().updateUnitParams(id, { hinge: other });
  assert.equal(S().unitResult(id).panels.find((p) => p.part === 'FRONT').meta.hinge, other);
});

test('the hinge side is greyed with its reason where today\'s code refuses it, and a bay door has its own', () => {
  const unit = { id: 'u1', type: 'BUD', params: { unit_num: 'B01', hinge: 'L' }, position: { wall: 0, x_mm: 0 } };
  const at = (meta, derived = { doors: 1 }) => menuActions({
    unit, panelPart: 'FRONT', panelId: 'B01-F', result: { derived, panels: [{ id: 'B01-F', part: 'FRONT', meta }] }, store: {},
  }).find((a) => a.id === 'hinge-side');
  const slope = at({ hinge: 'R', hingeForced: true });
  assert.equal(slope.disabled, true);
  assert.equal(slope.disabledReason, 'Cut on the slope: the door opens from the slope');
  assert.deepEqual(slope.options.map((o) => o.selected), [false, true], 'the forced hand is shown');
  const pair = at({ hinge: 'L' }, { doors: 2 });
  assert.equal(pair.disabled, true);
  assert.match(pair.disabledReason, /pair/);
  const lift = at({});
  assert.equal(lift.disabled, true, 'a front with no hinge has no hinge side');
  // A door in a BAY: the bay row's own hinge, through setBayDoor.
  const got = [];
  const bayUnit = { ...unit, params: { ...unit.params, bay_doors: [{ door: 'one', hinge: 'L' }, { door: 'one', hinge: 'R' }] } };
  const row = menuActions({
    unit: bayUnit,
    panelPart: 'FRONT',
    panelId: 'B01-F1',
    result: { derived: { doors: 2 }, panels: [{ id: 'B01-F1', part: 'FRONT', meta: { hinge: 'R', bay: 1 } }] },
    store: { setBayDoor: (u, bay, patch) => got.push([u, bay, patch]), updateUnitParams: () => got.push('unit') },
  }).find((a) => a.id === 'hinge-side');
  assert.notEqual(row.disabled, true, 'a bay door is one leaf, never a pair');
  row.options.find((o) => o.id === 'L').run();
  assert.deepEqual(got, [['u1', 1, { hinge: 'L' }]]);
  // An appliance's own door is not removed from here (Backspace refuses it too).
  const appliance = menuActions({
    unit, panelPart: 'FRONT', panelId: 'B01-F', result: { derived: { doors: 1 }, panels: [{ id: 'B01-F', part: 'FRONT', meta: { hinge: 'L', appliance: true } }] }, store: {},
  }).find((a) => a.id === 'remove-door');
  assert.equal(appliance.disabled, true);
});

test('a DRAWER FRONT clicked: Edit drawer k, Close all fronts, then its cabinet', () => {
  const unit = {
    id: 'u1', type: 'BUDR', params: { ...defaultParamsFor('BUDR', P), unit_num: 'DR01' }, position: { wall: 0, x_mm: 0 },
  };
  const called = [];
  const args = {
    unit, panelPart: 'DRAWER-FRONT', panelDrawer: 2, panelId: 'DR01-DF2', store: { editDrawer: (u, k) => called.push([u, k]) }, profile: P,
  };
  assert.equal(menuTitle(args), 'Drawer front 2 · DR01 Drawer unit, 3 drawers');
  const actions = menuActions(args);
  assert.deepEqual(actions.map((a) => a.id), ['edit-drawer', 'close-fronts', 'edit-cabinet', 'cabinet-actions']);
  assert.equal(actions[0].label, 'Edit drawer 2…');
  assert.equal(actions[0].framed, true);
  actions[0].run();
  assert.deepEqual(called, [['u1', 2]]);
  assert.deepEqual(groupedActions(actions).map((g) => g.title), [undefined, 'Cabinet DR01']);
});

test('the one cabinet header and the Centre entries', () => {
  room();
  const id = S().addUnit('WARDROBE').id;
  const unit = unitOf(id);
  assert.equal(menuTitle({ unit, selection: [unit] }), `${unit.params.unit_num} · Wardrobe`);
  const armed = [];
  const actions = menuActions({ unit, selection: [unit], store: { armCentreBetween: (u) => armed.push(u) }, profile: P });
  const labels = new Map(actions.map((a) => [a.id, a.label]));
  assert.equal(labels.get('center-shelves'), 'Centre shelves', '*"zmien pisownie"*');
  assert.equal(labels.get('center-between'), 'Centre between');
  actions.find((a) => a.id === 'center-between').run();
  assert.deepEqual(armed, [id], 'the right panel\'s two pick mode, on this cabinet');
});

// ─── WHAT LEFT, AND THE WORDS ───────────────────────────────────────────────

/** Every menu the table can produce: every type, one and several, the cabinet, a door, a drawer front. */
function everyMenu() {
  const out = [];
  for (const type of Object.keys(UNIT_TYPES)) {
    let params;
    try { params = defaultParamsFor(type, P); } catch { continue; }
    const unit = { id: 'u1', type, params: { ...params, unit_num: '01' }, position: { wall: 0, x_mm: 0, rotation_deg: 0 } };
    const twin = { ...unit, id: 'u2', params: { ...unit.params, unit_num: '02', plinth: !unit.params.plinth } };
    for (const [panelPart, panelDrawer] of [[null, null], ['FRONT', null], ['DRAWER-FRONT', 1], ['DRAWER-SIDE', 2]]) {
      const args = { unit, panelPart, panelDrawer, store: {}, profile: P };
      out.push({ title: menuTitle(args), actions: menuActions(args) });
    }
    const several = { unit, selection: [unit, twin], store: {}, profile: P };
    out.push({ title: menuTitle(several), actions: menuActions(several) });
  }
  return out;
}
const flat = (actions) => actions.flatMap((a) => [a, ...(a.items ? flat(a.items) : [])]);

test('the entries the owner took out are in no menu at all', () => {
  const OUT = ['rename', 'unit-colour', 'rotate-90', 'back-to-wall', 'side-to-wall', 'drawer-fronts',
    'show-in-cnc', 'size', 'lock', 'copy-size', 'dimensions', 'hinges'];
  for (const { title, actions } of everyMenu()) {
    for (const a of flat(actions)) assert.ok(!OUT.includes(a.id), `${title}: ${a.id} is still offered`);
  }
});

test('the contract: every action has its kind, a known group, and what its kind needs', () => {
  for (const { title, actions } of everyMenu()) {
    for (const a of flat(actions)) {
      assert.ok(['command', 'toggle', 'choice', 'submenu'].includes(a.kind), `${title} ${a.id}: kind ${a.kind}`);
      assert.ok(MENU_GROUPS.includes(a.group), `${title} ${a.id}: group ${a.group}`);
      if (a.kind === 'choice') {
        assert.ok(a.options.length >= 2, `${title} ${a.id}: a choice of one`);
        for (const o of a.options) {
          assert.equal(typeof o.run, 'function');
          assert.equal(typeof o.selected, 'boolean');
        }
        assert.ok(a.options.filter((o) => o.selected).length <= 1, `${title} ${a.id}: two options selected`);
      } else if (a.kind === 'submenu') {
        assert.ok(Array.isArray(a.items) && a.items.length, `${title} ${a.id}: an empty submenu`);
      } else if (!a.disabled) {
        assert.equal(typeof a.run, 'function', `${title} ${a.id}: no run`);
      }
      if (a.kind === 'toggle') assert.ok([true, false, 'mixed'].includes(a.checked), `${title} ${a.id}: checked ${a.checked}`);
      if (a.disabled) assert.ok(a.disabledReason, `${title} ${a.id}: greyed with no reason`);
    }
    const ids = actions.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length, `${title}: an id twice in one menu`);
    assert.equal(actions.filter((a) => a.danger).length <= 1, true);
  }
});

test('no em or en dash in any word the menu says', () => {
  const DASH = /[\u2013\u2014]/;
  for (const { title, actions } of everyMenu()) {
    assert.ok(!DASH.test(title), `the header "${title}"`);
    for (const a of flat(actions)) {
      for (const word of [a.label, a.hint, a.disabledReason, a.groupTitle, ...(a.options || []).map((o) => o.label)]) {
        if (word == null) continue;
        assert.ok(!DASH.test(word), `${title} ${a.id}: "${word}"`);
      }
    }
  }
});
