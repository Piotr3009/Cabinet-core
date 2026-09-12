// ─── TURN 68 · F2 — UNDO / REDO, MEGA WAŻNE ────────────────────────────────
//
// T60 shipped retail's VIEW BAR as PRO's, one for one, and wrote of these two:
// *"Undo and redo are also PRO's and also absent … The parity map carries them
// as `later`."* The owner has now named them, and named them loudly. This is
// `later`.
//
// THE WHOLE OF WHY THEY WERE MISSING was one call. `stores/historyStore.js` is
// a SUBSCRIBER — it watches the project store and snapshots every mutation by
// construction — and PRO's `main.jsx` starts it at module scope. The retail
// entry never did, so there was no stack to draw a button for.
//
// NO SECOND HISTORY: every assertion below is about PRO's own store.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { stageKeyAction } from '../src/retail/design/keys.js';
import { VIEW_TOOLS } from '../src/retail/design/viewTools.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';

setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const H = () => useHistoryStore.getState();

/** A room with a wardrobe in it, and a clean stack behind it. */
function room() {
  useUiStore.getState().clearSelection();
  A.startDesign('T68 F2');
  const id = A.addFirstWardrobe();
  flushHistory();
  H().clear();
  return id;
}

// ═══ THE TWO TILES ═════════════════════════════════════════════════════════

test('F2 · the VIEW BAR carries ↺ and ↻, first, as PRO does', () => {
  const ids = VIEW_TOOLS.map((t) => t.id);
  assert.equal(ids[0], 'undo', 'undo is not first on the bar');
  assert.equal(ids[1], 'redo', 'redo does not follow it');
  const [undo, redo] = VIEW_TOOLS;
  assert.equal(undo.kind, 'history');
  assert.equal(redo.kind, 'history');
  // PRO's own glyphs, character for character.
  const pro = read('src/components/CanvasToolbar.jsx');
  assert.ok(pro.includes(undo.label), 'the undo glyph is not PRO\'s');
  assert.ok(pro.includes(redo.label), 'the redo glyph is not PRO\'s');
  // GREYED WITH A REASON — the standing no-dead-controls law.
  assert.ok(undo.titleOff && redo.titleOff, 'a greyed tile with no sentence');
  assert.ok(pro.includes(undo.titleOff), 'the empty-stack sentence is not PRO\'s');
  assert.ok(pro.includes(redo.titleOff), 'the empty-stack sentence is not PRO\'s');
});

test('F2 · the bar calls PRO\'s own store, and retail keeps no stack of its own', () => {
  const bar = code('src/retail/design/ViewBar.jsx');
  assert.match(bar, /import \{ useHistoryStore \} from '\.\.\/\.\.\/stores\/historyStore\.js'/);
  assert.match(bar, /case 'history': return \(\) => useHistoryStore\.getState\(\)\[tool\.id\]\(\);/);
  // Lengths, not `canUndo()` — PRO's own reason, quoted in the file.
  assert.match(bar, /useHistoryStore\(\(s\) => s\.past\.length\)/);
  assert.match(bar, /useHistoryStore\(\(s\) => s\.future\.length\)/);
  // …and nothing in retail declares a history of its own.
  for (const rel of ['src/retail/design/ViewBar.jsx', 'src/retail/design/viewTools.js',
    'src/retail/design/keys.js', 'src/retail/design/adapter.js']) {
    assert.doesNotMatch(code(rel), /past:\s*\[\]|future:\s*\[\]/, `${rel} keeps its own stack`);
  }
});

test('F2 · the retail entry starts PRO\'s watcher, and only it', () => {
  const entry = code('src/retail/main-retail.jsx');
  assert.match(entry, /watchProjectHistory\(\)/);
  // Inside the dynamic block, below `setPersistence` — a static import would
  // hoist above the switch, which is this file's own standing rule.
  assert.ok(entry.indexOf('watchProjectHistory') > entry.indexOf("import('./RetailApp.jsx')"),
    'the watcher is started before the persistence switch is thrown');
});

// ═══ AND IT ACTUALLY UNDOES ════════════════════════════════════════════════

test('F2 · an add is undone and redone, through the very store the bar calls', () => {
  watchProjectHistory();
  try {
    const id = room();
    const before = S().units.length;
    A.addTopBox(id);
    flushHistory();
    const after = S().units.length;
    assert.ok(after > before, 'nothing was added, so there is nothing to undo');
    assert.ok(H().past.length > 0, 'the add left no step on the stack');

    H().undo();
    assert.equal(S().units.length, before, 'undo did not take the box back off');
    assert.ok(H().future.length > 0, 'undo left nothing to redo');

    H().redo();
    assert.equal(S().units.length, after, 'redo did not put the box back');
  } finally {
    unwatchProjectHistory();
  }
});

test('F2 · Ctrl+Z and Ctrl+Shift+Z reach the same two functions', () => {
  watchProjectHistory();
  try {
    const id = room();
    const before = S().units.length;
    A.addTopBox(id);
    flushHistory();
    const after = S().units.length;

    const press = (key, extra = {}) => stageKeyAction(
      { key, ctrlKey: true, preventDefault() {}, target: null, ...extra }, { doc: null },
    );

    let res = press('z');
    assert.equal(res.handled, true, 'Ctrl+Z was not handled');
    assert.equal(res.did, 'undo');
    assert.equal(S().units.length, before, 'Ctrl+Z undid nothing');

    res = press('z', { shiftKey: true });
    assert.equal(res.did, 'redo');
    assert.equal(S().units.length, after, 'Ctrl+Shift+Z redid nothing');

    // ⌘ on a mac is the same gesture.
    res = stageKeyAction({ key: 'z', metaKey: true, preventDefault() {}, target: null }, { doc: null });
    assert.equal(res.did, 'undo');
    assert.equal(S().units.length, before, 'Cmd+Z undid nothing');

    // Ctrl+Y is PRO's other redo, and the stack is shared.
    res = press('y');
    assert.equal(res.did, 'redo');
    assert.equal(S().units.length, after);
  } finally {
    unwatchProjectHistory();
  }
});

test('F2 · an empty stack is handled and does nothing — the greyed state', () => {
  watchProjectHistory();
  try {
    const id = room();
    assert.equal(H().past.length, 0);
    assert.equal(H().future.length, 0);
    const units = S().units.length;
    const undo = stageKeyAction({ key: 'z', ctrlKey: true, preventDefault() {}, target: null }, { doc: null });
    assert.equal(undo.did, 'undo-empty');
    const redo = stageKeyAction({ key: 'z', ctrlKey: true, shiftKey: true, preventDefault() {}, target: null }, { doc: null });
    assert.equal(redo.did, 'redo-empty');
    assert.equal(S().units.length, units, 'an empty stack changed the project');
    assert.ok(id);
  } finally {
    unwatchProjectHistory();
  }
});

test('F2 · Ctrl+Z in a typed field is the BROWSER\'s, not the room\'s', () => {
  // T34's guard, worn by the delete key and now by this one: taking the
  // characters back out of a width field is not undoing a wardrobe.
  const input = { tagName: 'INPUT', parentElement: null };
  const res = stageKeyAction(
    { key: 'z', ctrlKey: true, preventDefault() {}, target: input }, { doc: null },
  );
  assert.equal(res.handled, false, 'the room stole Ctrl+Z from a text field');
  assert.match(code('src/retail/design/keys.js'), /isTypingTarget\(e\.target\)/);
});

test('F2 · and it is still ONE keyboard handler on the stage', () => {
  const keys = code('src/retail/design/keys.js');
  // The balance's own question, answered by construction: the new gesture went
  // into the handler that was already there.
  assert.equal((keys.match(/addEventListener\('keydown'/g) || []).length,
    (read('src/retail/design/keys.js').match(/addEventListener\('keydown'/g) || []).length);
  const room2 = code('src/retail/design/DesignRoom.jsx');
  assert.doesNotMatch(room2, /ctrlKey|metaKey/, 'the room grew a second key handler');
});
