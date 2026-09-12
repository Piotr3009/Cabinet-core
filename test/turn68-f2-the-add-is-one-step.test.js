// ─── TURN 68 · WHAT THE WALK FOUND ─────────────────────────────────────────
//
// Two faults in F2 that no unit test could have seen, because both are about
// what is on the screen when a client arrives and what happens when he presses
// the tile. `scripts/t68-walk.mjs` found them in a real browser, and these are
// the assertions that hold the cures.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
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

test('F2 · ONE CLICK IS ONE UNDO STEP — adding a wardrobe is four writes', () => {
  // THE WALK: *"the stack after the add — {past: 4}"*, and ↺ then took the
  // automatic cornice off and left the wardrobe standing. The four are the
  // carcass, the move to the wall, the doors and the cornice — one ACT that
  // happens to be four calls, which is not the burst-in-time `historyStore`
  // coalesces. So the act declares itself, through the store's own batch.
  watchProjectHistory();
  try {
    useUiStore.getState().clearSelection();
    A.startDesign('T68 · the add');
    flushHistory();
    H().clear();

    const id = A.addFirstWardrobe();
    flushHistory();
    assert.ok(id, 'no wardrobe was added');
    assert.equal(H().past.length, 1,
      `one press of ADD A WARDROBE left ${H().past.length} steps on the stack`);

    H().undo();
    assert.equal(S().units.length, 0, 'one undo did not take the whole wardrobe back off');
  } finally {
    unwatchProjectHistory();
  }
});

test('F2 · …and the act says so through the SHARED batch, not a retail one', () => {
  const adapter = code('src/retail/design/adapter.js');
  assert.match(adapter, /return S\(\)\.batch\(\(\) => addFirstWardrobeNow\(\)\);/);
  // `batch` is `stores/historyBatch.js runBatch`, which is the mechanism PRO's
  // own context menu declares its bulk edits with. No second one was invented.
  assert.match(code('src/stores/projectStore.js'), /batch: \(fn\) => runBatch\(fn\)/);
  assert.match(code('src/lib/contextActions.js'), /store\.batch/);
});

test('F2 · THE STACK STARTS EMPTY — the lazy defaults are not the client\'s edit', () => {
  // THE WALK: the first frame of the room came up with ↺ LIT and *"1 step
  // back"* in its tooltip, and pressing it undid the wine and the oak rather
  // than anything the client had done. PRO settles this the same way and has
  // since T12 — `StartScreen`, `NewProjectFlow` and the auth modal all clear
  // the stack once the project they built is standing.
  const room = code('src/retail/design/DesignRoom.jsx');
  assert.match(room, /useHistoryStore\.getState\(\)\.clear\(\)/);
  // Once where the room finishes setting itself out…
  const boot = room.slice(room.indexOf('loadDecors().then('), room.indexOf('loadDecors().then(') + 700);
  assert.match(boot, /A\.applyLazyDefaults\([\s\S]*?useHistoryStore\.getState\(\)\.clear\(\)/,
    'the stack is not cleared after the lazy defaults are written');
  // …and once on START AGAIN, which is not an edit to undo back over.
  assert.equal((room.match(/useHistoryStore\.getState\(\)\.clear\(\)/g) || []).length, 2,
    'the room clears the stack somewhere else as well');
  // PRO's own precedent, named rather than claimed.
  for (const rel of ['src/components/StartScreen.jsx', 'src/components/NewProjectFlow.jsx']) {
    assert.match(code(rel), /useHistoryStore\.getState\(\)\.clear\(\)/, `${rel} lost the precedent`);
  }
});

test('F2 · the walk can see the stack — the handle is registered beside the other two', () => {
  const entry = code('src/retail/main-retail.jsx');
  assert.match(entry, /cc\.history = useHistoryStore;/);
  assert.match(entry, /cc\.project = useProjectStore;/);
  assert.match(entry, /cc\.ui = useUiStore;/);
});
