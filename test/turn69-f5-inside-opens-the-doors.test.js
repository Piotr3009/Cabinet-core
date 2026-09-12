// ─── TURN 69 · F5 — INSIDE OPENS THE DOORS ─────────────────────────────────
//
// CLAUDE.md, F5, verbatim:
//
//   *"Entering the INSIDE step (and the INSIDE view button) opens ALL doors —
//   drawers stay shut. Leaving restores the exact door states from before
//   (remember, don't reset — the T68 F7 pattern)."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  applyInsideDoorLaw, doorEntriesOf, rememberedDoors, forgetInsideDoors,
} from '../src/retail/design/insideDoors.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

/** A wardrobe with doors AND a drawer stack, which is the whole point. */
function wardrobe() {
  forgetInsideDoors();
  useUiStore.setState({ openFronts: {}, openKits: {} });
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  S().updateUnitParams(id, { width: 1200, height: 2200 });
  S().addDoors(id);
  S().addDrawers(id, 2);
  return id;
}

// Every moving FACE — doors and drawer faces alike — which is what the law is
// handed and what it must sort out for itself.
const faces = (id) => [{
  unitId: id,
  panels: (S().unitResult(id)?.panels || [])
    .filter((p) => /^(FRONT|DRAWER-FRONT)$/.test(p.part)),
}];
const openOf = (id, panelId) => (U().openFronts[id]?.[panelId] ?? 0);
const doorsOf = (id) => doorEntriesOf(faces(id))[0]?.panelIds || [];
const drawersOf = (id) => (S().unitResult(id)?.panels || [])
  .filter((p) => p.part === 'DRAWER-FRONT').map((p) => p.id);

// ═══ 1 · WHAT A DOOR IS ═════════════════════════════════════════════════════

test('F5 · a drawer front is not a door, and the ENGINE is what says so', () => {
  const id = wardrobe();
  const doors = doorsOf(id);
  const drawers = drawersOf(id);
  assert.ok(doors.length > 0, 'this scene is meant to have doors');
  assert.ok(drawers.length > 0, 'this scene is meant to have drawers');
  for (const d of drawers) assert.ok(!doors.includes(d), 'a drawer front was counted as a door');
  // Asserted from the other side too: the distinction is the engine's PART,
  // not a name this module made up, so it cannot rot into a coincidence.
  const parts = (S().unitResult(id)?.panels || []);
  assert.ok(parts.some((p) => p.part === 'DRAWER-FRONT'), 'a drawer face lost its own part');
  assert.ok(!parts.some((p) => p.part === 'FRONT' && p.meta?.drawer),
    'a drawer face is being drawn as a door');
});

// ═══ 2 · ENTERING ═══════════════════════════════════════════════════════════

test('F5 · entering INSIDE opens every door, and leaves the drawers shut', () => {
  const id = wardrobe();
  assert.equal(applyInsideDoorLaw(true, faces(id)), 'opened');
  for (const d of doorsOf(id)) assert.equal(openOf(id, d), 1, 'a door stayed shut');
  for (const d of drawersOf(id)) assert.ok(openOf(id, d) < 0.5, 'a drawer came out');
});

test('F5 · entering twice is not a transition — the second press remembers nothing', () => {
  const id = wardrobe();
  applyInsideDoorLaw(true, faces(id));
  const held = rememberedDoors();
  assert.equal(applyInsideDoorLaw(true, faces(id)), 'nothing');
  assert.deepEqual(rememberedDoors(), held,
    'the second entry remembered the OPEN doors — leaving would never shut them');
  // …and it does not SHUT them either, which is what `toggleAllFronts` did.
  for (const d of doorsOf(id)) assert.equal(openOf(id, d), 1, 'the second press shut the wardrobe');
});

// ═══ 3 · LEAVING — REMEMBER, DON'T RESET ════════════════════════════════════

test('F5 · leaving puts back EXACTLY what was there — not "all shut"', () => {
  const id = wardrobe();
  const doors = doorsOf(id);
  // The client had ONE door open, to look at a rail.
  U().openFrontsFor(id, [doors[0]]);
  const before = JSON.parse(JSON.stringify(U().openFronts));

  applyInsideDoorLaw(true, faces(id));
  for (const d of doors) assert.equal(openOf(id, d), 1);

  assert.equal(applyInsideDoorLaw(false, faces(id)), 'restored');
  assert.deepEqual(U().openFronts, before,
    'leaving reset the doors instead of restoring them');
  assert.equal(openOf(id, doors[0]), 1, 'the door the client had open was shut on the way out');
  if (doors[1]) assert.ok(openOf(id, doors[1]) < 0.5, 'a door the client never opened stayed open');
});

test('F5 · a drawer the client had out is still out afterwards', () => {
  const id = wardrobe();
  const drawer = drawersOf(id)[0];
  U().openFrontsFor(id, [drawer]);
  applyInsideDoorLaw(true, faces(id));
  assert.equal(openOf(id, drawer), 1, 'INSIDE shut a drawer the client had opened');
  applyInsideDoorLaw(false, faces(id));
  assert.equal(openOf(id, drawer), 1, 'leaving shut it');
});

test('F5 · leaving without having entered owes nothing', () => {
  const id = wardrobe();
  const before = JSON.parse(JSON.stringify(U().openFronts));
  assert.equal(applyInsideDoorLaw(false, faces(id)), 'nothing');
  assert.deepEqual(U().openFronts, before);
});

test('F5 · nothing is held after a restore, so the next entry is a fresh one', () => {
  const id = wardrobe();
  applyInsideDoorLaw(true, faces(id));
  applyInsideDoorLaw(false, faces(id));
  assert.equal(rememberedDoors(), null);
  assert.equal(applyInsideDoorLaw(true, faces(id)), 'opened', 'the law would not fire again');
});

// ═══ 4 · TWO DOORS, ONE ACT ═════════════════════════════════════════════════

test('F5 · the step and the view button press the SAME law, and PRO is untouched', () => {
  const room = read('src/retail/design/DesignRoom.jsx');
  // The VIEW BUTTON.
  assert.match(room, /applyInsideDoorLaw\(id === 'inside', facePanels\);/,
    'the INSIDE view button no longer opens the doors');
  // The STEP — an effect, because the step is reached three ways.
  assert.match(room, /applyInsideDoorLaw\(active === 'inside', facePanels\);/,
    'entering the INSIDE step no longer opens the doors');
  // …and `toggleAllFronts` is no longer what INSIDE presses: it TOGGLED, so
  // the second press shut the wardrobe, and it opened drawers too.
  assert.ok(!/id === 'inside'\) useUiStore\.getState\(\)\.toggleAllFronts/.test(room),
    'INSIDE still toggles every face');
  // The open-all BUTTON keeps it — that control has always meant every face.
  assert.match(room, /doorEntries/, 'the open-all button lost its entries');

  // ONE law, one module, and PRO has never heard of it.
  for (const rel of ['src/components/TopBar.jsx', 'src/pages/ConfiguratorPage.jsx']) {
    assert.ok(!/insideDoors|applyInsideDoorLaw/.test(read(rel)), `${rel} reached into retail's law`);
  }
  assert.equal((read('src/retail/design/insideDoors.js').match(/let remembered = null;/g) || []).length, 1,
    'there is more than one memory of the doors');
});
