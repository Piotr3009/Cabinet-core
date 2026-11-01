/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F15 . AVENTOS ROWS IN THE LIBRARY. The owner, 01.11.2026: *"szafki AVENTOS musza byc zrobione"*. The Wall
// units group of the library carries a sub-group of four rows, one per Blum AVENTOS system, worded by the lift book
// (`LIFT_LABELS`, read, never retyped); a row's click is the LibraryPanel's own (`onAdd(typeId, { params })` into
// the store's addUnit), and the unit it makes carries the lift into the BOM's hardware under the key the Assign
// window reads (`role|spec_label`), in the Internal fittings group.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const { KITCHEN_LIBRARY } = await import('../src/engine/library.js');
const { LIFT_LABELS, LIFT_SYSTEMS } = await import('../src/engine/liftSystems.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { buildBom } = await import('../src/engine/bom.js');
const { getCabinetProfile } = await import('../src/engine/profile.js');
const { groupOfRole, hardwareKey } = await import('../src/stores/materialAssignmentStore.js');

const wallUnits = () => KITCHEN_LIBRARY.find((e) => e.kind === 'group' && e.id === 'wall-units');
const aventos = () => wallUnits()?.items.find((e) => e.kind === 'group' && e.id === 'aventos');

/** The LibraryPanel row's own click (LibraryPanel.jsx, the type row's onClick), with the store's addUnit as onAdd. */
function clickRow(entry) {
  const onAdd = (typeId, opts) => useProjectStore.getState().addUnit(typeId, opts);
  return entry.params ? onAdd(entry.typeId, { params: { ...entry.params } }) : onAdd(entry.typeId);
}

test('F15.1 . the Wall units group lists the AVENTOS lift-up sub-group: four rows in the lift book\'s words', () => {
  const group = aventos();
  assert.ok(group, 'Kitchen, Wall units has no AVENTOS group (id "aventos")');
  assert.equal(group.label, 'AVENTOS lift-up');
  assert.match(group.hint, /AVENTOS lift instead of hinges/);
  assert.deepEqual(group.items.map((i) => i.id), ['wud-hk', 'wud-hs', 'wud-hl', 'wud-hf']);
  assert.deepEqual([...LIFT_SYSTEMS], ['hk', 'hs', 'hl', 'hf']);
  for (const row of group.items) {
    const system = row.id.slice(4);
    assert.equal(row.kind, 'type');
    assert.equal(row.typeId, 'WUD', `${row.id} is a wall unit`);
    assert.equal(row.label, LIFT_LABELS[system], `${row.id} worded by LIFT_LABELS`);
    assert.deepEqual(row.params, { front_system: system });
  }
  // The words are read from the lift book, never typed into the library.
  const lib = read('src/engine/library.js');
  assert.match(lib, /label: LIFT_LABELS\[system\]/);
  for (const words of Object.values(LIFT_LABELS)) assert.equal(lib.includes(`'${words}'`), false, `"${words}" retyped`);
});

test('F15.1 . the click passes the row\'s params into addUnit (LibraryPanel and the rail\'s flyout)', () => {
  const panel = read('src/components/LibraryPanel.jsx');
  assert.match(panel, /entry\.params \? onAdd\(entry\.typeId, \{ params: \{ \.\.\.entry\.params \} \}\)/,
    'LibraryPanel drops a row\'s params');
});

test('F15.2 . adding the HK row makes a WUD with front_system hk, its lift unit in the BOM hardware, in Internal fittings', () => {
  useProjectStore.getState().newProject('Aventos job', { id: 'av-1', number: 'P-77', client: 'C' });
  const hk = aventos().items.find((i) => i.id === 'wud-hk');
  const placed = clickRow(hk);
  assert.ok(placed?.id, `the HK row stands: ${placed?.error || ''}`);
  const unit = useProjectStore.getState().units.find((u) => u.id === placed.id);
  assert.equal(unit.type, 'WUD');
  assert.equal(unit.params.front_system, 'hk');
  // Doors are the LAST step (SPEC 4.10): the joiner fits the front with the panel's Add doors, and the lift
  // the row chose comes with it, in place of the hinges.
  const fitted = useProjectStore.getState().addDoors(placed.id);
  assert.ok(fitted.count >= 1, 'the front is fitted');
  assert.equal(useProjectStore.getState().units.find((u) => u.id === placed.id).params.front_system, 'hk', 'the lift survives Add doors');

  const entries = useProjectStore.getState().allResults();
  const bom = buildBom(entries, { design: useProjectStore.getState().project.design, profile: getCabinetProfile() });
  const lifts = bom.hardware.filter((h) => h.role === 'lift_unit');
  assert.equal(lifts.length, 1, 'one lift unit line');
  const key = hardwareKey(lifts[0]);
  assert.match(key, /^lift_unit\|.+/, `the Assign window's key: ${key}`);
  assert.equal(lifts[0].qty >= 1, true);
  assert.ok(lifts[0].label.startsWith(LIFT_LABELS.hk), lifts[0].label);
  assert.equal(groupOfRole('lift_unit'), 'internal', 'assignable in Internal fittings');
  assert.equal(bom.hardware.some((h) => h.role === 'hinges'), false, 'a lift instead of hinges');

  // The plain Wall units row is still a hinged WUD: the params ride with the AVENTOS rows only.
  const plain = clickRow(wallUnits().items.find((i) => i.id === 'wall'));
  assert.ok(plain?.id, plain?.error);
  const plainUnit = useProjectStore.getState().units.find((u) => u.id === plain.id);
  assert.notEqual(plainUnit.params.front_system, 'hk');
  useProjectStore.getState().addDoors(plain.id);
  const after = buildBom(useProjectStore.getState().allResults(), { design: useProjectStore.getState().project.design, profile: getCabinetProfile() });
  assert.equal(after.hardware.filter((h) => h.role === 'lift_unit').length, 1, 'the hinged WUD adds no lift');
  assert.equal(after.hardware.some((h) => h.role === 'hinges'), true, 'the hinged WUD hangs on hinges');
});
