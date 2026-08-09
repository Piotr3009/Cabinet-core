// ─── Multi-select and bulk actions (turn 13, CLAUDE.md F5 / F6) ─────────────
//
// A joiner who has just drawn six base units wants to plinth all six, paint all
// six, drop a shelf in all six. Turn 12 made him do it six times.
//
// Four properties, and the third is the one worth being careful about:
//
//   THE SET (F5.1)      Ctrl+click adds AND removes; a plain click is one; the
//                       background clears. One function, so the canvas, the
//                       panel and the menu cannot disagree about what is
//                       selected.
//   THE BULK OPS (F5.2) every one of them is the SINGLE-unit action run once
//                       per cabinet, so every clamp still belongs to its own
//                       carcass. Nothing here is a second implementation.
//   MIXED (F5.2)        a shared field over cabinets that disagree shows the
//                       word and — the half that matters — HOLDS NO VALUE. A
//                       bulk editor that writes its own placeholder flattens
//                       five cabinets into the sixth, silently.
//   ONE UNDO STEP (F5.4) a bulk action is one Ctrl+Z, and it is one because it
//                       is DECLARED one, not because a coalescing timer happens
//                       to be running.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySelection, commonValue, fieldValue, isSelected, MIXED, primaryOf,
} from '../src/lib/selection.js';
import { menuActions } from '../src/lib/contextActions.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();
const history = () => useHistoryStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

// ─── F5.1 — the set ─────────────────────────────────────────────────────────

test('a plain click is ONE cabinet, whatever was selected before', () => {
  assert.deepEqual(applySelection(['a', 'b', 'c'], 'd'), ['d']);
  assert.deepEqual(applySelection([], 'a'), ['a']);
});

test('Ctrl+click ADDS…', () => {
  assert.deepEqual(applySelection(['a'], 'b', true), ['a', 'b']);
  assert.deepEqual(applySelection(['a', 'b'], 'c', true), ['a', 'b', 'c']);
});

test('…and Ctrl+click on one already in the set REMOVES it', () => {
  // The half people forget. A selection you can only grow is one you have to
  // clear and rebuild every time you overshoot by one cabinet.
  assert.deepEqual(applySelection(['a', 'b', 'c'], 'b', true), ['a', 'c']);
  assert.deepEqual(applySelection(['a'], 'a', true), []);
});

test('the background clears it — turn 11 behaviour, unchanged', () => {
  assert.deepEqual(applySelection(['a', 'b'], null), []);
  assert.deepEqual(applySelection(['a', 'b'], null, true), []);
});

test('the PRIMARY is the last one touched', () => {
  assert.equal(primaryOf(applySelection(['a'], 'b', true)), 'b');
  assert.equal(primaryOf(applySelection(['a', 'b', 'c'], 'c', true)), 'b', 'dropping the primary promotes the one before it');
  assert.equal(primaryOf([]), null);
  assert.equal(isSelected(['a', 'b'], 'b'), true);
  assert.equal(isSelected(['a', 'b'], 'z'), false);
});

test('the ui store keeps the set and the primary in step', () => {
  ui().clearSelection();
  ui().selectUnit('a');
  assert.deepEqual(ui().selectedUnitIds, ['a']);
  assert.equal(ui().selectedUnitId, 'a');

  ui().selectUnit('b', { additive: true });
  assert.deepEqual(ui().selectedUnitIds, ['a', 'b']);
  assert.equal(ui().selectedUnitId, 'b', 'the primary is the one just clicked');

  ui().selectUnit('b', { additive: true });
  assert.deepEqual(ui().selectedUnitIds, ['a']);
  assert.equal(ui().selectedUnitId, 'a');

  ui().selectUnit(null);
  assert.deepEqual(ui().selectedUnitIds, []);
  assert.equal(ui().selectedUnitId, null);
});

test('selecting an ELEMENT narrows to its one cabinet', () => {
  ui().clearSelection();
  ui().selectUnit('a');
  ui().selectUnit('b', { additive: true });
  ui().selectElement('a', 'SHELF-1');
  assert.deepEqual(ui().selectedUnitIds, ['a'], 'a piece belongs to one carcass');
});

// ─── F5.2 — mixed ───────────────────────────────────────────────────────────

test('MIXED: agreeing values come back as the value', () => {
  const same = [{ h: 720 }, { h: 720 }, { h: 720 }];
  assert.deepEqual(commonValue(same, (o) => o.h), { value: 720, mixed: false, empty: false });
  assert.equal(fieldValue(commonValue(same, (o) => o.h)), 720);
});

test('MIXED: one that differs makes the whole field mixed, and it holds NO value', () => {
  const differ = [{ h: 720 }, { h: 900 }, { h: 720 }];
  const common = commonValue(differ, (o) => o.h);
  assert.equal(common.mixed, true);
  assert.equal(common.value, null, 'a mixed field must not carry one of the values');
  assert.equal(fieldValue(common), MIXED);
});

test('MIXED: undefined and null are the same absence, not a difference', () => {
  const common = commonValue([{ }, { h: null }], (o) => o.h);
  assert.equal(common.mixed, false);
  assert.equal(common.value, null);
});

test('MIXED: nothing selected is EMPTY, which is not the same as mixed', () => {
  const common = commonValue([], (o) => o.h);
  assert.deepEqual(common, { value: null, mixed: false, empty: true });
  assert.equal(fieldValue(common), '');
});

// ─── F5.3 — the menu applies to the selection ───────────────────────────────

const fakeUnit = (id, extra = {}) => ({
  id,
  type: 'BUD',
  position: { wall: 0, x_mm: 0, rotation_deg: 0 },
  params: { unit_num: id, width: 600, ...extra },
});

test('the menu names the five bulk entries and only those', () => {
  const selection = [fakeUnit('u1'), fakeUnit('u2'), fakeUnit('u3')];
  const actions = menuActions({ unit: selection[0], selection, panelPart: 'BUL', store: {} });
  const bulk = actions.filter((a) => /\(3\)$/.test(a.label)).map((a) => a.id);
  assert.deepEqual(bulk, [
    'end-panel-L', 'end-panel-R', 'end-panel-B',
    'pin-infill-L', 'pin-infill-R',
    'plinth', 'add-doors', 'unit-colour',
  ]);
  // …and the entries that are NOT bulk say nothing about a count, which is what
  // stops the menu quietly doing three things where it says one.
  const single = actions.filter((a) => !/\(\d+\)$/.test(a.label)).map((a) => a.id);
  assert.ok(single.includes('delete'));
  assert.ok(single.includes('rotate-90'));
  assert.ok(single.includes('edit-cabinet'));
});

test('one cabinet selected: the labels carry no count at all', () => {
  const only = [fakeUnit('u1')];
  const actions = menuActions({ unit: only[0], selection: only, panelPart: 'BUL', store: {} });
  for (const a of actions) assert.ok(!/\(\d+\)$/.test(a.label), `${a.id} says "${a.label}" over one cabinet`);
});

test('a caller that never heard of multi-select is unaffected', () => {
  const one = fakeUnit('u1');
  const withSelection = menuActions({ unit: one, selection: [one], panelPart: 'BUL', store: {} });
  const without = menuActions({ unit: one, panelPart: 'BUL', store: {} });
  assert.deepEqual(without.map((a) => a.label), withSelection.map((a) => a.label));
});

test('right-clicking a cabinet OUTSIDE the selection acts on that cabinet alone', () => {
  // Otherwise the menu would be lying about what it is about: it is headed with
  // the cabinet under the pointer, and that cabinet is not in the set.
  const selection = [fakeUnit('u2'), fakeUnit('u3')];
  const hit = [];
  const actions = menuActions({
    unit: fakeUnit('u1'),
    selection,
    panelPart: 'BUL',
    store: { batch: (fn) => fn(), addPlinth: (id) => hit.push(id), openPanelSection: () => {} },
  });
  actions.find((a) => a.id === 'plinth').run();
  assert.deepEqual(hit, ['u1']);
});

test('a bulk entry runs once per selected cabinet, inside ONE batch', () => {
  const selection = [fakeUnit('u1'), fakeUnit('u2'), fakeUnit('u3')];
  const hit = [];
  let batches = 0;
  const actions = menuActions({
    unit: selection[0],
    selection,
    panelPart: 'BUL',
    store: {
      batch: (fn) => { batches += 1; return fn(); },
      addPlinth: (id) => hit.push(id),
      openPanelSection: () => {},
    },
  });
  actions.find((a) => a.id === 'plinth').run();
  assert.deepEqual(hit, ['u1', 'u2', 'u3']);
  assert.equal(batches, 1, 'one batch, so one undo step');
});

test('end panels read each cabinet’s OWN state, not the primary’s', () => {
  // Over a run where one cabinet already has a left panel, "End panel — left"
  // must fit the ones that have none and not add a second to that one.
  const selection = [
    fakeUnit('u1'),
    fakeUnit('u2', { end_panels: [{ id: 'ep1', side: 'L' }] }),
    fakeUnit('u3'),
  ];
  const added = [];
  const actions = menuActions({
    unit: selection[0],
    selection,
    panelPart: 'BUL',
    store: {
      batch: (fn) => fn(),
      addEndPanel: (id, opts) => added.push(`${id}:${opts.side}`),
      removeEndPanel: () => {},
      openPanelSection: () => {},
    },
  });
  actions.find((a) => a.id === 'end-panel-L').run();
  assert.deepEqual(added, ['u1:L', 'u3:L'], 'u2 already had one');
});

// ─── F5.2 / F5.4 — the store, and one undo step ─────────────────────────────

function project(n = 3) {
  store().loadProject({
    id: null,
    name: 't13-f5',
    room: migrateRoom({ height: 2500, corners: rectCorners(8000, 3000) }),
    design: {},
  }, []);
  const ids = Array.from({ length: n }, () => store().addUnit('BUD')?.id);
  history().clear();
  return ids;
}

test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

test('BULK: one patch onto every unit, through the single-unit path', () => {
  const ids = project();
  const { notices } = store().updateUnitParamsBulk(ids, { height: 800 });
  assert.deepEqual(notices, []);
  for (const id of ids) assert.equal(unitOf(id).params.height, 800);
  // Through `updateUnitParams`, so its own consequences apply to each: a height
  // typed by hand is the deliberate exception to the project's (BACKLOG #29).
  for (const id of ids) assert.equal(unitOf(id).params.height_custom, true);
});

test('BULK: a shelf in each of them, and the ones that take none are counted', () => {
  const ids = project();
  const drawers = store().addUnit('BUDR')?.id;   // a ratio drawer unit takes no shelves
  const { added, skipped } = store().addShelvesBulk([...ids, drawers], 1);
  assert.equal(added, 3);
  assert.equal(skipped, 1);
  for (const id of ids) {
    assert.equal(unitOf(id).params.sections[0].items.filter((i) => i.kind === 'shelf').length, 1);
  }
});

test('BULK: even/centre runs per carcass, so each one is even in ITS OWN height', () => {
  const ids = project(2);
  store().updateUnitParams(ids[1], { height: 1400 });
  store().addShelvesBulk(ids, 2);
  const { done } = store().redistributeShelvesBulk(ids);
  assert.equal(done, 2);
  for (const id of ids) {
    const shelves = unitOf(id).params.sections[0].items
      .filter((i) => i.kind === 'shelf').map((i) => i.pos_mm).sort((a, b) => a - b);
    assert.equal(shelves.length, 2);
    assert.ok(shelves[1] > shelves[0], `${id}: two shelves in the same place is not "even"`);
  }
  const a = unitOf(ids[0]).params.sections[0].items.find((i) => i.kind === 'shelf').pos_mm;
  const b = unitOf(ids[1]).params.sections[0].items.find((i) => i.kind === 'shelf').pos_mm;
  assert.notEqual(a, b, 'the taller cabinet spaces its shelves differently — that is the point');
});

test('THE UNDO STEP: a bulk action is ONE, even with the coalescing window shut', () => {
  const ids = project();
  const before = JSON.parse(JSON.stringify(store().units));
  const depth = history().past.length;

  store().updateUnitParamsBulk(ids, { height: 820 });
  flushHistory();

  assert.equal(history().past.length, depth + 1,
    'three cabinets edited in one act must be one entry on the stack');
  assert.ok(history().undo());
  assert.deepEqual(JSON.parse(JSON.stringify(store().units)), before,
    'one Ctrl+Z puts all three back');
});

test('…and so is a bulk recolour, and a bulk plinth run', () => {
  const ids = project();
  for (const act of [
    () => store().setUnitFinish(ids, { front_type_id: 'f2' }),
    () => store().batch(() => { for (const id of ids) store().addPlinth(id); }),
    () => store().addDoorsBulk(ids),
  ]) {
    const depth = history().past.length;
    act();
    flushHistory();
    assert.equal(history().past.length, depth + 1);
  }
  // …and three Ctrl+Zs put the project back where it started, not nine.
  for (let i = 0; i < 3; i += 1) history().undo();
  for (const id of ids) {
    assert.equal(unitOf(id).params.plinth ?? false, false);
    assert.equal(unitOf(id).params.front_type_id ?? null, null);
  }
});

test('a batch that throws still closes — an open batch would eat every later edit', () => {
  const ids = project();
  const depth = history().past.length;
  assert.throws(() => store().batch(() => {
    store().updateUnitParams(ids[0], { height: 900 });
    throw new Error('boom');
  }), /boom/);
  flushHistory();
  assert.equal(history().past.length, depth + 1, 'what did happen is on the stack');
  // The next ordinary edit must still be recorded.
  store().updateUnitParams(ids[1], { height: 910 });
  flushHistory();
  assert.equal(history().past.length, depth + 2);
});

// ─── F6 — the golden plus learns doors ──────────────────────────────────────

test('F6: "Add doors" is ONE action, and it is the store’s', () => {
  const ids = project(1);
  const { count, already } = store().addDoors(ids[0]);
  assert.ok(count >= 1, 'a 600 mm base unit takes a door');
  assert.equal(already, false);
  assert.equal(unitOf(ids[0]).params.doors.count, count);

  // Asked twice, it says so rather than reporting a second silent success —
  // which is what lets the plus modal, the panel and the menu all disable or
  // report on the same fact.
  const again = store().addDoors(ids[0]);
  assert.equal(again.already, true);
});

test('F6: over a selection it is one batch and it skips the ones already hung', () => {
  const ids = project(3);
  store().addDoors(ids[0]);
  const depth = history().past.length;
  const { fitted, already } = store().addDoorsBulk(ids);
  flushHistory();
  assert.equal(fitted, 2);
  assert.equal(already, 1);
  assert.equal(history().past.length, depth + 1);
});
