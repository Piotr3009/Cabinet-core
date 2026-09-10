// ─── TURN 65 · F9 — ADD DOORS, AND ADD TOP BOX MOVES LEFT ───────────────────
//
// The owner: *"drzwi to osobna decyzja, w extrasach lub w setup"* · *"ADD
// DOORS — i tu i tu chyba"* · *"add top box powinno być przeniesione do EXTRAS
// po lewej"*.
//
// Adding furniture is a STEP; editing an element is the right panel.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { setPersistence } from '../src/stores/persistence.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

setPersistence('none');
const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

const wardrobe = () => {
  A.startDesign('T65 F9');
  return A.addFirstWardrobe();
};

// ═══ 1 · HOW MANY STORE PATHS ADD A DOOR? ONE. ═════════════════════════════

test('F9 · ONE store path adds a door, and both screens press it', () => {
  const extras = code('src/retail/design/Options.jsx');
  // ─── AMENDED BY T66 F3 ────────────────────────────────────────────────
  // T65's *"i tu i tu"* was EXTRAS and the thin wardrobe menu. That menu is
  // deleted tonight, so the second door is the one it always should have been:
  // the ENGINE's own count, under Advanced, in the same panel — and the split
  // (T66 F7) is a third act on the same leaves, through the same adapter.
  assert.match(extras, /data-testid="extras-add-doors"/, 'EXTRAS has no ADD DOORS');
  assert.match(extras, /A\.addDoors\(unit\.id\)/);
  assert.match(extras, /A\.setDoorCount\(unit\.id, Number\(id\)\)/, 'the count lost its home');
  assert.match(extras, /testid="extras-split-top"/, 'T66 F7 put the split in EXTRAS');

  // …and ONE law behind them. Nothing else in retail turns a wardrobe's doors
  // on: `setDoors(_, true)` is reached only through `addDoors`/`setDoorCount`
  // in the adapter, and no SCREEN calls it at all.
  for (const rel of ['src/retail/design/Options.jsx', 'src/retail/design/Detail.jsx']) {
    assert.ok(!/setDoors\(/.test(code(rel)), `${rel} reaches past the adapter to the store`);
  }
  const adapter = code('src/retail/design/adapter.js');
  assert.equal([...adapter.matchAll(/export function addDoors\(/g)].length, 1,
    'there is more than one addDoors');
});

test('F9 · ADD DOORS puts them on, REMOVE DOORS takes them off, and the engine picks the leaves', () => {
  const id = wardrobe();
  // A client's wardrobe is born with its doors on (T60), so the act is asked
  // from the other end first.
  assert.equal(A.doorsOn(id), true);
  A.removeDoors(id);
  assert.equal(A.doorsOn(id), false, 'REMOVE DOORS left them on');
  assert.equal(A.doorCount(id), 0, 'a doorless carcass still cuts fronts');

  const back = A.addDoors(id);
  assert.equal(back.ok, true);
  assert.equal(A.doorsOn(id), true, 'ADD DOORS did not put them back');
  // The COUNT is the engine's width law, never a number retail typed.
  assert.ok(back.count >= 1);
  assert.equal(back.count, A.doorCount(id));
});

test('F9 · doors do NOT follow from bays — setting the bays leaves the doors alone', () => {
  const id = wardrobe();
  S().updateUnitParams(id, { width: 1800 });
  const before = A.doorsOn(id);
  A.setBayCount(id, 3);
  assert.equal(A.doorsOn(id), before, 'BAYS turned the doors on or off');
  assert.equal(A.bayCount(id), 3);
});

// ═══ 2 · THE TOP BOX MOVED LEFT ════════════════════════════════════════════

test('F9 · ADD TOP BOX is in EXTRAS and GONE from the wardrobe\'s right-hand menu', () => {
  const extras = code('src/retail/design/Options.jsx');
  assert.match(extras, /data-testid="layout-add-top-box"/, 'EXTRAS lost ADD TOP BOX');
  assert.match(extras, /A\.addTopBox\(unit\.id\)/);
  // ─── FINISHED BY T66 F3 ───────────────────────────────────────────────
  // T65 took ADD TOP BOX out of the thin wardrobe menu and asserted the
  // tombstone in it. The menu itself is gone tonight, so there is no right-hand
  // surface left to add furniture from at all — which is the strongest form of
  // this law and the reason it can be asserted over the whole DOCK.
  const dock = code('src/retail/design/detail/docked.jsx');
  assert.ok(!/addTopBox|addDoors|addFirstWardrobe/.test(dock),
    'the right-hand panel adds furniture again');
  assert.ok(!/A\.addTopBox\(/.test(code('src/retail/design/Detail.jsx')),
    'the panel adds a top box again');
  // …and the BOX's own three controls came left with it (T66 F3's re-homing).
  assert.match(extras, /testid="topbox-width"/);
  assert.match(extras, /data-testid="topbox-remove"/);
});

test('F9 · …and it still works from where it now lives', () => {
  const id = wardrobe();
  const before = S().units.length;
  const res = A.addTopBox(id);
  if (res.ok) {
    assert.equal(S().units.length, before + 1, 'the box did not arrive');
    assert.equal(A.topBoxesOn(id).length, 1);
  } else {
    // A refusal is the room's own, and it says why.
    assert.ok(res.said.length > 5, 'a refusal with no sentence');
  }
});
