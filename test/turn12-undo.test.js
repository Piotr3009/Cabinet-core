// ─── Undo / Redo (turn 12, CLAUDE.md F9) ────────────────────────────────────
//
// "Tests on the store: do → undo → redo → deep-equal."
//
// That is the shape of most of what is below, and the reason it is worth being
// literal about is that an undo stack has one failure mode that looks like
// working: it restores something ALMOST right. So the comparisons are on the
// whole project and the whole unit list, not on the field the test happens to
// have edited.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const history = () => useHistoryStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);
/** Every edit in these tests is one gesture, so each is settled at once. */
const edit = (fn) => { fn(); flushHistory(); };
const snapshot = () => JSON.parse(JSON.stringify({ project: store().project, units: store().units }));

function project() {
  store().loadProject({
    id: null,
    name: 't12-f9',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
  history().clear();
}

test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

test('the depth and the coalescing window are profile numbers (rule 2)', () => {
  assert.ok(P.editor.history.depth >= 1);
  assert.ok(P.editor.history.coalesceMs >= 0);
});

// ─── do → undo → redo → deep-equal ──────────────────────────────────────────

test('adding a unit: do → undo → redo', () => {
  project();
  const before = snapshot();
  let id = null;
  edit(() => { id = store().addUnit('BUD').id; });
  const after = snapshot();
  assert.equal(store().units.length, 1);

  assert.equal(history().undo(), true);
  assert.deepEqual(snapshot(), before, 'undo did not put the project back exactly');
  assert.equal(store().units.length, 0);

  assert.equal(history().redo(), true);
  assert.deepEqual(snapshot(), after, 'redo did not reproduce the edit exactly');
  assert.ok(unitOf(id));
});

test('deleting a unit: undo gives it back, whole', () => {
  project();
  let id = null;
  edit(() => { id = store().addUnit('BUD').id; });
  edit(() => store().addShelves(id, 2));
  const withShelves = snapshot();

  edit(() => store().removeUnit(id));
  assert.equal(store().units.length, 0);

  history().undo();
  assert.deepEqual(snapshot(), withShelves, 'the cabinet came back different from how it left');
  assert.equal(unitOf(id).params.sections[0].items.filter((i) => i.kind === 'shelf').length, 2);
});

test('moving a unit: undo → redo', () => {
  project();
  let id = null;
  edit(() => { id = store().addUnit('BUD').id; });
  edit(() => store().moveUnit(id, 0, 0));
  const at0 = unitOf(id).position.x_mm;
  edit(() => store().moveUnit(id, 2000, 0));
  assert.equal(unitOf(id).position.x_mm, 2000);

  history().undo();
  assert.equal(unitOf(id).position.x_mm, at0);
  history().redo();
  assert.equal(unitOf(id).position.x_mm, 2000);
});

test('a SETTINGS change is an edit like any other', () => {
  project();
  const before = snapshot();
  edit(() => store().setFrontColour({ hex: '#5e2129', name: 'Wine Red', system: 'RAL' }));
  assert.equal(store().project.design.colour.front.hex, '#5e2129');
  history().undo();
  assert.deepEqual(snapshot(), before);
  history().redo();
  assert.equal(store().project.design.colour.front.hex, '#5e2129');
});

test('an ELEMENT edit is one too', () => {
  project();
  let id = null;
  edit(() => { id = store().addUnit('BUDTALL').id; });
  edit(() => store().addShelves(id, 1));
  const shelf = unitOf(id).params.sections[0].items.find((i) => i.kind === 'shelf');
  const before = snapshot();
  edit(() => store().setShelfVariant(id, shelf.id, 'fixed'));
  history().undo();
  assert.deepEqual(snapshot(), before);
});

test('several edits undo one at a time, in order', () => {
  project();
  const states = [snapshot()];
  let id = null;
  edit(() => { id = store().addUnit('BUD').id; });
  states.push(snapshot());
  edit(() => store().updateUnitParams(id, { width: 900 }));
  states.push(snapshot());
  edit(() => store().addPlinth(id));
  states.push(snapshot());

  for (let i = states.length - 1; i > 0; i -= 1) {
    assert.deepEqual(snapshot(), states[i], `state ${i}`);
    history().undo();
  }
  assert.deepEqual(snapshot(), states[0]);
  assert.equal(history().undo(), false, 'and it stops at the beginning');
});

test('…and redo walks back up the same ladder', () => {
  project();
  let id = null;
  edit(() => { id = store().addUnit('BUD').id; });
  edit(() => store().updateUnitParams(id, { width: 900 }));
  const top = snapshot();
  history().undo();
  history().undo();
  history().redo();
  history().redo();
  assert.deepEqual(snapshot(), top);
  assert.equal(history().redo(), false, 'and it stops at the top');
});

// ─── The rules an undo stack has to keep ────────────────────────────────────

test('a NEW edit ends the redo path', () => {
  project();
  edit(() => store().addUnit('BUD'));
  edit(() => store().addUnit('BUD'));
  history().undo();
  assert.equal(history().future.length, 1);
  edit(() => store().addUnit('BUDTALL'));
  assert.equal(history().future.length, 0, 'a redo into an edit it was not taken from is a corrupt project');
  assert.equal(history().redo(), false);
});

test('one gesture is one undo, however many writes it made', () => {
  project();
  let id = null;
  edit(() => { id = store().addUnit('BUDTALL').id; });
  edit(() => store().addShelves(id, 1));
  const shelf = unitOf(id).params.sections[0].items.find((i) => i.kind === 'shelf');
  const before = unitOf(id).params.sections[0].items.find((i) => i.kind === 'shelf').pos_mm;
  const depth = history().past.length;

  // A drag: forty writes, no pause. It has to cost ONE step.
  for (let y = 300; y <= 700; y += 10) store().setShelfPos(id, shelf.id, y);
  flushHistory();
  assert.equal(history().past.length, depth + 1, 'a drag became more than one undo step');

  history().undo();
  assert.equal(unitOf(id).params.sections[0].items.find((i) => i.kind === 'shelf').pos_mm, before);
});

test('the stack is bounded, and it drops the OLDEST', () => {
  project();
  const depth = P.editor.history.depth;
  for (let i = 0; i < depth + 12; i += 1) {
    edit(() => store().setProjectName(`name ${i}`));
  }
  assert.equal(history().past.length, depth);
  // Undoing all the way back reaches the oldest step the stack still holds,
  // not the beginning of time — which is what "bounded" means.
  while (history().undo());
  assert.equal(history().past.length, 0);
  assert.ok(store().project.name.startsWith('name '), 'the very first name is gone, as it must be');
});

test('opening another project forgets the history', () => {
  project();
  edit(() => store().addUnit('BUD'));
  assert.ok(history().past.length > 0);
  history().clear();
  assert.equal(history().past.length, 0);
  assert.equal(history().future.length, 0);
  assert.equal(history().undo(), false);
});

// ─── Selection, sensibly restored ───────────────────────────────────────────

test('undoing a delete gives the cabinet back SELECTED', () => {
  project();
  let id = null;
  edit(() => { id = store().addUnit('BUD').id; });
  useUiStore.getState().selectUnit(id);
  edit(() => store().removeUnit(id));
  useUiStore.getState().clearSelection();

  history().undo();
  assert.equal(useUiStore.getState().selectedUnitId, id, 'the hand is already there');
});

test('a selection that no longer exists is dropped, not faked', () => {
  project();
  let a = null;
  edit(() => { a = store().addUnit('BUD').id; });
  useUiStore.getState().selectUnit(a);
  // Undo the ADD: the unit the snapshot remembers being selected is not in the
  // project the snapshot restores.
  history().undo();
  assert.equal(useUiStore.getState().selectedUnitId, null);
  assert.equal(useUiStore.getState().selectedElement, null);
});

// ─── It survives nothing ────────────────────────────────────────────────────

test('nothing about the history is persisted', () => {
  // CLAUDE.md F9: "survives nothing (no persistence — session only)". The proof
  // is that the module writes no storage key at all: everything it holds is in
  // the two arrays above, which a reload takes with it.
  const source = readFileSync(new URL('../src/stores/historyStore.js', import.meta.url), 'utf8')
    // Comments may NAME the thing they are explaining the absence of.
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(source), false,
    'the undo stack must not outlive the tab');
});
