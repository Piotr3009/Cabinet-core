// ─── F2: ONE DIRTY GATE + THREE MESSAGE LEVELS (turn 31, CLAUDE.md F2) ──────
//
// Two faults, one cause: a rule that lived as a CONVENTION in 137 actions and a
// message system that lived as one variable.
//
//   DIRTY     "77 of 137 store actions each remember to set the flag; 60
//             forget, and a forgotten flag is silently lost work."
//   MESSAGES  "one toast slot, 4 s, each message erasing the last — the owner
//             has never seen one."
//
// The dirty half is tested against the STORE, because the claim is about every
// action rather than about one; the message half is tested against the pure
// arithmetic, because the owner's three rules are three contracts and a
// component that decided them would be the single slot again one storey up.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { useHistoryStore } from '../src/stores/historyStore.js';
import { gatePatch, touchesProject, PROJECT_KEYS } from '../src/stores/dirtyGate.js';
import {
  LEVELS, UNSAVED_MESSAGE, dismissedByClickAway, expired, greyMs, leaveWarning, levelOf,
  makeMessage, messagesAt, pushMessage, queueMax, sortForDisplay, trimQueue,
} from '../src/engine/messages.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();

function project() {
  store().loadProject({
    id: null, name: 'dirty', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

// ─── THE GATE, AS ARITHMETIC ────────────────────────────────────────────────

test('the gate raises the flag on a write that changes the project', () => {
  const prev = { project: { a: 1 }, units: [], dirty: false };
  assert.equal(touchesProject(prev, { project: { a: 2 } }), true);
  assert.equal(touchesProject(prev, { units: [1] }), true);
  // The SAME reference is not a change: a setter that recomputes the value it
  // already had has not made the document differ from what was saved.
  assert.equal(touchesProject(prev, { project: prev.project }), false);
  // Nothing to do with the document at all.
  assert.equal(touchesProject(prev, { selectedUnitId: 'u1' }), false);
  assert.deepEqual(PROJECT_KEYS, ['project', 'units']);
});

test('…and an action that speaks for itself is left exactly alone', () => {
  const prev = { project: { a: 1 }, units: [], dirty: true };
  // loadProject / newProject / markSaved all write `dirty: false` themselves.
  assert.deepEqual(
    gatePatch(prev, { project: { a: 2 }, dirty: false }),
    { project: { a: 2 }, dirty: false },
  );
  // Everything else that touches the document is raised.
  assert.equal(gatePatch(prev, { project: { a: 2 } }).dirty, true);
  assert.equal(Object.hasOwn(gatePatch(prev, { rightPanelOpen: true }), 'dirty'), false);
  assert.equal(gatePatch(prev, null), null);
});

// ─── THE GATE, AS THE STORE ─────────────────────────────────────────────────

test('EVERY action that changes the project raises the flag — no exceptions', () => {
  project();
  assert.equal(store().dirty, false, 'a freshly loaded project is clean');

  // A sweep of the store's own mutating actions, chosen across the whole file
  // rather than from one neighbourhood: this is the claim that used to be true
  // of 77 of them and false of 60.
  const u = store().addUnit('BUD');
  assert.equal(store().dirty, true, 'addUnit');

  const clean = () => { store().markSaved(); assert.equal(store().dirty, false); };

  clean();
  store().updateUnitParams(u.id, { width: 700 });
  assert.equal(store().dirty, true, 'updateUnitParams');

  clean();
  store().setProjectName('Another name');
  assert.equal(store().dirty, true, 'setProjectName');

  clean();
  store().addShelves(u.id, 1);
  assert.equal(store().dirty, true, 'addShelves');

  clean();
  store().setDesign({ handle: { type: 'bar' } });
  assert.equal(store().dirty, true, 'setDesign');

  clean();
  store().addDoors(u.id);
  assert.equal(store().dirty, true, 'addDoors');

  clean();
  store().setUnitName(u.id, 'K1');
  assert.equal(store().dirty, true, 'setUnitName');

  clean();
  store().addEndPanel(u.id, { side: 'R' });
  assert.equal(store().dirty, true, 'addEndPanel');

  clean();
  store().removeUnit(u.id);
  assert.equal(store().dirty, true, 'removeUnit');
});

test('…and the three honest exceptions still leave it clean', () => {
  project();
  store().addUnit('BUD');
  assert.equal(store().dirty, true);
  store().markSaved();
  assert.equal(store().dirty, false, 'markSaved');
  store().addUnit('BUD');
  store().newProject('fresh');
  assert.equal(store().dirty, false, 'newProject');
  store().addUnit('BUD');
  project();
  assert.equal(store().dirty, false, 'loadProject');
});

test('an UNDO is a change to the project, and goes through the same gate', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { width: 700 });
  store().markSaved();
  assert.equal(store().dirty, false);
  // The history store restores a snapshot through `setState`, which the gate
  // owns as well — an undone project differs from the saved one.
  useProjectStore.setState({ units: [...store().units] });
  assert.equal(store().dirty, true);
});

test('the 77 hand-written repeats are GONE — the gate is the only writer', () => {
  const src = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  const repeats = [...src.matchAll(/dirty:\s*true/g)];
  assert.equal(repeats.length, 0, `${repeats.length} hand-written dirty flags left`);
  assert.match(src, /create\(dirtyGate\(/, 'the store is wrapped in the gate');
  // The three that say `false` are the three honest exceptions, plus the
  // initial state.
  assert.equal([...src.matchAll(/dirty:\s*false/g)].length, 4);
});

// ─── THE THREE LEVELS ───────────────────────────────────────────────────────

test("the owner's three rules are three CONTRACTS, not three colours", () => {
  assert.equal(LEVELS.red.until, 'click', 'RED stays until clicked');
  assert.equal(LEVELS.yellow.until, 'clickAway', 'YELLOW goes when attention moves on');
  assert.equal(LEVELS.grey.until, 'time', 'GREY is a few seconds');
  assert.equal(LEVELS.grey.place, 'centre', 'GREY is centre');
  // …and a red outranks a yellow outranks a grey.
  assert.ok(LEVELS.red.rank > LEVELS.yellow.rank);
  assert.ok(LEVELS.yellow.rank > LEVELS.grey.rank);
});

test('the four old tones ARE the three levels, so 129 call sites keep working', () => {
  assert.equal(levelOf('error'), 'red');
  assert.equal(levelOf('warn'), 'yellow');
  assert.equal(levelOf('ok'), 'grey');
  assert.equal(levelOf('info'), 'grey');
  assert.equal(levelOf(undefined), 'grey');
  assert.equal(levelOf('red'), 'red');
});

test('only a GREY has a clock — a red that expired would be the old bug', () => {
  const red = makeMessage('boom', 'error', { at: 1000, profile: P });
  const yellow = makeMessage('careful', 'warn', { at: 1000, profile: P });
  const grey = makeMessage('saved', 'ok', { at: 1000, profile: P });
  assert.equal(red.expiresAt, null);
  assert.equal(yellow.expiresAt, null);
  assert.equal(grey.expiresAt, 1000 + greyMs(P));
  assert.deepEqual(expired([red, yellow, grey], 1000 + greyMs(P)), [grey.id]);
  assert.deepEqual(expired([red, yellow, grey], 1000), []);
});

test('a click elsewhere takes the YELLOWS and leaves the reds standing', () => {
  const list = [
    makeMessage('boom', 'error', { at: 1, profile: P }),
    makeMessage('careful', 'warn', { at: 2, profile: P }),
    makeMessage('saved', 'ok', { at: 3, profile: P }),
  ];
  const gone = dismissedByClickAway(list);
  assert.equal(gone.length, 1);
  assert.equal(list.find((m) => m.id === gone[0]).level, 'yellow');
});

test('messages QUEUE — nothing erases anything', () => {
  let q = [];
  q = pushMessage(q, makeMessage('one', 'ok', { at: 1, profile: P }));
  q = pushMessage(q, makeMessage('two', 'warn', { at: 2, profile: P }));
  q = pushMessage(q, makeMessage('three', 'error', { at: 3, profile: P }));
  assert.equal(q.length, 3);
  // …and the red is drawn FIRST, never buried.
  assert.equal(sortForDisplay(q)[0].level, 'red');
});

test('a red is NEVER overwritten by a grey, even when the queue is full', () => {
  let q = [pushMessage([], makeMessage('the error', 'error', { at: 1, profile: P }))[0]];
  for (let i = 0; i < 20; i += 1) {
    q = trimQueue(pushMessage(q, makeMessage(`grey ${i}`, 'ok', { at: 10 + i, profile: P })), queueMax(P));
  }
  assert.equal(q.length, queueMax(P));
  assert.ok(q.some((m) => m.level === 'red'), 'the red was shed');
  assert.equal(q.find((m) => m.level === 'red').message, 'the error');
});

test('the same sentence twice is one message with a count, not two', () => {
  let q = pushMessage([], makeMessage('blocked', 'warn', { at: 1, profile: P }));
  q = pushMessage(q, makeMessage('blocked', 'warn', { at: 2, profile: P }));
  assert.equal(q.length, 1);
  assert.equal(q[0].count, 2);
  assert.equal(q[0].at, 2, 'the repeat refreshes it');
});

test('grey stands in the centre; red and yellow wait at the bottom', () => {
  const list = [
    makeMessage('boom', 'error', { at: 1, profile: P }),
    makeMessage('careful', 'warn', { at: 2, profile: P }),
    makeMessage('saved', 'ok', { at: 3, profile: P }),
  ];
  assert.deepEqual(messagesAt(list, 'centre').map((m) => m.level), ['grey']);
  assert.deepEqual(messagesAt(list, 'bottom').map((m) => m.level), ['red', 'yellow']);
});

test('the two numbers are PROFILE numbers (rule 2)', () => {
  assert.equal(P.ui.messages.greyMs, 3000);
  assert.equal(P.ui.messages.maxOnScreen, 5);
  assert.equal(greyMs(P), 3000);
  assert.equal(queueMax(P), 5);
  // …and a profile that has never heard of them still works.
  assert.equal(greyMs(null), 3000);
  assert.equal(queueMax({}), 5);
});

// ─── THE QUEUE, THROUGH THE STORE ───────────────────────────────────────────

test('the store queues them, and only a click clears a red', () => {
  ui().clearMessages();
  ui().notify('a red', 'error');
  ui().notify('a yellow', 'warn');
  ui().notify('a grey', 'ok');
  assert.equal(ui().messages.length, 3);

  // A click anywhere else: the yellow goes, the red and the grey stay.
  ui().dismissOnClickAway();
  assert.deepEqual(ui().messages.map((m) => m.level).sort(), ['grey', 'red']);

  // The red's only exit.
  const red = ui().messages.find((m) => m.level === 'red');
  ui().dismissMessage(red.id);
  assert.deepEqual(ui().messages.map((m) => m.level), ['grey']);
  ui().clearMessages();
});

// ─── LEAVING WITH UNSAVED WORK ──────────────────────────────────────────────

test('leaving with unsaved work is a RED, and it says the one sentence', () => {
  assert.equal(UNSAVED_MESSAGE, 'Save the project — unsaved changes');
  const w = leaveWarning({ dirty: true, units: [{ id: 'u1' }] });
  assert.equal(w.message, UNSAVED_MESSAGE);
  assert.equal(levelOf(w.tone), 'red');
  // Nothing to lose is nothing to say.
  assert.equal(leaveWarning({ dirty: false, units: [{ id: 'u1' }] }), null);
  assert.equal(leaveWarning({ dirty: true, units: [] }), null);
});

test('…and it SPEAKS rather than fixing (rule 4): the door is not barred', () => {
  ui().clearMessages();
  project();
  store().addUnit('BUD');
  const warned = ui().warnIfUnsaved({ dirty: store().dirty, units: store().units });
  assert.ok(warned, 'it said something');
  // The project is EXACTLY as dirty as it was — nothing was saved behind
  // anybody's back, and nothing was thrown away.
  assert.equal(store().dirty, true);
  assert.equal(ui().messages.filter((m) => m.level === 'red').length, 1);
  ui().clearMessages();
});

test('every door out of the editor goes through the ONE leave path', () => {
  const bar = readFileSync(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');
  assert.match(bar, /const leaveProject = \(\) => \{/);
  assert.match(bar, /warnIfUnsaved\(\{ dirty, units \}\)/);
  // Four doors: New project, Open, Close project, and the badge.
  assert.equal([...bar.matchAll(/leaveProject/g)].length, 5, 'one definition, four doors');
  // …and none of them calls goToStart behind its back.
  // Twice on the declaration line (`const goToStart = useUiStore((s) => s.goToStart)`)
  // and once inside `leaveProject`. Nowhere else: no door slips past the warning.
  assert.equal([...bar.matchAll(/\bgoToStart\b/g)].length, 3);
});

test('the fifth door — closing the tab — asks the browser to ask', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /beforeunload/);
  assert.match(app, /UNSAVED_MESSAGE/);
  // Only while there IS work to lose: a page that always asks is a page whose
  // question stops being read.
  assert.match(app, /if \(!dirty \|\| !unitCount\) return undefined;/);
});

// ─── "DELETE MOST OF THEM" ──────────────────────────────────────────────────

test('the greys whose effect is visible in 3D are gone', () => {
  const SRC = new URL('../src/', import.meta.url).pathname;
  const walk = (dir) => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : (/\.(js|jsx)$/.test(p) ? [p] : []);
  });
  const all = walk(SRC).map((p) => readFileSync(p, 'utf8')).join('\n');

  // The owner: "DELETE most of them — an effect visible in 3D needs no toast."
  // Each of these announced something the joiner was already looking at.
  for (const gone of [
    'Cabinet removed.',
    'Partition removed.',
    'Worktop removed.',
    'Room updated.',
    'Doors hung on',
    'Doors taken off',
    'Shelves centred in',
    'Partition centred',
    'Shelf centred in bay',
    'Hanging rail added',
    'Vertical partition added',
    'Door extend',
    'Added by hand',
    'Removed from this print',
    'Back to computed',
    'Worktop over',
  ]) {
    assert.ok(!all.includes(`notify(\`${gone}`) && !all.includes(`notify('${gone}`),
      `"${gone}" is still announced`);
  }

  // …and what SURVIVES is what left no trace on the screen: a file written, an
  // account, a saved record. Deleting those would be deleting the only
  // evidence the thing happened at all.
  for (const kept of ['Signed in.', 'Project saved.', 'Saved settings applied.']) {
    assert.ok(all.includes(kept), `"${kept}" should have survived`);
  }
});

test('the single toast slot is gone, and nothing still reaches for it', () => {
  const SRC = new URL('../src/', import.meta.url).pathname;
  const walk = (dir) => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : (/\.(js|jsx)$/.test(p) ? [p] : []);
  });
  const files = walk(SRC);
  assert.ok(!files.some((p) => p.endsWith('components/Toast.jsx')), 'Toast.jsx is gone');
  const all = files.map((p) => readFileSync(p, 'utf8')).join('\n');
  assert.ok(!/\bdismissToast\b/.test(all));
  assert.ok(!/s\.toast\b/.test(all));
});

// The history store is the one writer from outside; make sure it did not keep
// a hand-written flag of its own after the gate arrived.
test('the history store no longer writes the flag by hand either', () => {
  const h = readFileSync(new URL('../src/stores/historyStore.js', import.meta.url), 'utf8');
  // The mention that survives is the comment saying why it no longer does.
  assert.ok(!/^\s*dirty:\s*true/m.test(h));
  assert.equal(typeof useHistoryStore.getState().undo, 'function');
});
