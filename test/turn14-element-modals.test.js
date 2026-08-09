// ─── Turn 14, F4: the pieces you HANG ON a cabinet get their own window ─────
//
// The owner's model, and it is the distinction a joiner makes without thinking:
// a side, a top, a back are the CARCASS — built once, looked at in the editor
// window. A door, an end panel, a filler, the masking panel under a wall run
// are things you hang on afterwards, one at a time, each with its own
// properties. Those are pointed at directly.
//
// Turn 13's verdict — a click on a cabinet selects the CABINET — is untouched
// and deliberate: what is widened is the DOUBLE click, which has meant "open
// this piece" since turn 11 F3.3.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  elementFields, elementKind, elementLabel, isAttachedElement, isMainViewElement, opensOwnModal,
} from '../src/engine/elements.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { KITCHEN_LIBRARY, flattenLibrary } from '../src/engine/library.js';
import { elementMaterialChoices, DEFAULT_DESIGN } from '../src/engine/design.js';

const wud = (over = {}) => computeCabinet({
  ...defaultParamsFor('WUD', P),
  unit_num: 'W01',
  end_panels: [{ id: 'ep1', side: 'L' }],
  side_infill_left_mm: 40,
  ...over,
}, P);

const panelsOf = (r) => Object.fromEntries(r.panels.map((p) => [p.id, p]));

test('F4.1 — a door, an end panel and a filler each open their OWN modal', () => {
  const r = wud();
  const byId = panelsOf(r);
  const door = r.panels.find((p) => p.part === 'FRONT');
  const ep = r.panels.find((p) => p.part === 'END-PANEL');
  const infill = r.panels.find((p) => p.part === 'INFILL');
  for (const p of [door, ep, infill]) {
    assert.ok(p, 'the piece exists');
    assert.equal(isAttachedElement(p), true, `${p.id} is an attached piece`);
    assert.equal(opensOwnModal(p), true, `${p.id} opens its own modal`);
  }
  assert.ok(byId.BUL, 'and the carcass is still there');
});

test('F4.1 — a SINGLE click still selects the cabinet: the carcass is not a main-view element', () => {
  // Turn 13 F2.4, unchanged. `isMainViewElement` is what a single click lands
  // on, and it is still the ADDED INTERIOR items and nothing else.
  const r = wud({ shelves: 2 });
  for (const p of r.panels) {
    if (['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'].includes(p.part)) {
      assert.equal(isMainViewElement(p), false, `${p.id} is carcass — the editor window's job`);
      assert.equal(opensOwnModal(p), false, `${p.id} does not open a modal from the room either`);
    }
  }
  const door = r.panels.find((p) => p.part === 'FRONT');
  assert.equal(isMainViewElement(door), false, 'a click on a door still selects the CABINET');
  assert.equal(opensOwnModal(door), true, 'and a DOUBLE click opens the door');
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  assert.equal(isMainViewElement(shelf), true, 'an added shelf is unchanged — click and drag it');
});

test('F4.1 — each modal carries the fields that apply to THAT piece', () => {
  const r = wud();
  const door = r.panels.find((p) => p.part === 'FRONT');
  const ep = r.panels.find((p) => p.part === 'END-PANEL');
  const infill = r.panels.find((p) => p.part === 'INFILL' && p.meta?.side === 'left');

  assert.deepEqual(elementFields(door, getUnitType('WUD')),
    ['hinge-side', 'door-extend', 'front-board', 'material']);
  assert.deepEqual(elementFields(ep),
    ['end-panel-height', 'thickness-ep', 'above-unit-ep', 'material']);
  assert.deepEqual(elementFields(infill),
    ['infill-width', 'above-unit-infill', 'pin-infill', 'material']);
  assert.equal(elementLabel(ep), 'End panel — left');
  assert.equal(elementKind(door), 'door');
});

// ─── F4.2 — Door extend moves HOME ─────────────────────────────────────────

test('F4.2 — Door extend is a DOOR field, and only on a kit that has one', () => {
  const wallDoor = wud().panels.find((p) => p.part === 'FRONT');
  assert.ok(elementFields(wallDoor, getUnitType('WUD')).includes('door-extend'),
    'a wall unit has the handleless grab edge');

  const base = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: 'B01' }, P);
  const baseDoor = base.panels.find((p) => p.part === 'FRONT');
  assert.ok(!elementFields(baseDoor, getUnitType('BUD')).includes('door-extend'),
    'a base unit has none, so the control is not there to be disabled');

  // Left without a type, the kind's full list is offered — every caller before
  // this turn asked exactly that.
  assert.ok(elementFields(baseDoor).includes('door-extend'));
});

test('F4.2 — the ENGINE is untouched: `door_extend` still does what it did', () => {
  const off = wud().panels.find((p) => p.part === 'FRONT');
  const on = wud({ door_extend: true }).panels.find((p) => p.part === 'FRONT');
  assert.equal(on.h - off.h, P.wallUnit.doorExtend, 'the front grows by the grab edge');
  assert.equal(on.box.y, -P.wallUnit.doorExtend, 'and it runs BELOW the carcass');
});

// ─── F4.3 — the checkbox that "vanished" ───────────────────────────────────

test('F4.3 — every wall-unit LIBRARY entry resolves to a type that carries doorExtend', () => {
  const entries = flattenLibrary(KITCHEN_LIBRARY).filter((e) => e.kind === 'type' && e.typeId);
  const wall = entries.filter((e) => getUnitType(e.typeId).mount === 'wall');
  assert.ok(wall.length >= 1, 'the library offers a wall unit at all');
  for (const e of wall) {
    const type = getUnitType(e.typeId);
    assert.equal(type.doorExtend, true,
      `library entry "${e.id}" → ${e.typeId} lost the handleless grab edge`);
  }
  // …and the flag is not an accident of one record: every WALL-MOUNTED type in
  // the app has it, so a kit added later cannot quietly arrive without one.
  for (const id of UNIT_TYPE_ORDER) {
    const type = getUnitType(id);
    if (type.mount !== 'wall') continue;
    assert.equal(type.doorExtend, true, `${id} hangs on a wall and has no door extend`);
  }
});

test('F4.3 — a wall unit’s default params carry the flag’s own field', () => {
  const params = defaultParamsFor('WUD', P);
  assert.equal(params.door_extend, false, 'off by default, and PRESENT — so the control has a value');
  assert.ok(!Object.hasOwn(defaultParamsFor('BUD', P), 'door_extend'),
    'and a kit without the feature carries no dead parameter');
});

// ─── F4.1 — the palette, with its colours ──────────────────────────────────

test('F4.1 — the element material list is the UNIT PALETTE, and now carries its colours', () => {
  const choices = elementMaterialChoices(DEFAULT_DESIGN, P, []);
  assert.ok(choices.length >= 2, 'the project’s carcass slots and its fronts');
  for (const c of choices) {
    assert.ok(Object.hasOwn(c, 'hex'), `${c.key} has a swatch (null is an answer)`);
    assert.ok(c.material_label, 'and a name a workshop would say out loud');
  }
  assert.ok(choices.some((c) => c.key === 'front'), 'the fronts are on the list');
});
