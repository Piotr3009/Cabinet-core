// ─── TURN 72 · F5 — THE END PANEL LEAVES THE MOMENT A NEIGHBOUR ARRIVES ───
//
// The owner, 22.09.2026:
//
//   *"jak dodajesz szafę obok powinien zniknąć panel i znika, ale dopiero jak
//   przesuniesz szafę od boku i przysuniesz do; funkcja jest napisana 'jak
//   dosuniesz' a nie 'jak się pojawia'. Mała zmiana, ale musi być."*
//
// MEASURED BEFORE IT WAS FIXED, and the measurement is the test below. The
// sweep was never missing: `addUnit` has called `settleLayout` since T51 and
// that settle prunes and grows. What defeated it was the PLACEMENT —
// `freeSlotOnWall` measures the neighbour's whole span, panel included, so the
// new cabinet lands one board out; the prune then takes the panel off, the two
// are suddenly 25 mm APART, and the grow correctly puts a panel back on what
// is now a free run end. Only a drag brings it flush.
//
// ONE LAW, ONE MORE CALLER: the panel goes BEFORE the placement is measured,
// through `engine/endPanelAuto.js`'s own two tests (auto, and not asked for by
// hand) and the ordinary `removeEndPanel`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import {
  autoEndPanelStrays, isAutoEndPanel, setWardrobeEndPanelAuto,
} from '../src/engine/endPanelAuto.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

/** The client's room: the wardrobe automat is on, as the retail entry sets it. */
function aClientRoom() {
  setWardrobeEndPanelAuto(true);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1000, height: 2200, depth: 600 } });
  return id;
}

const panelsOn = (unitId) => (S().units.find((u) => u.id === unitId)?.params?.end_panels || [])
  .map((ep) => (ep.side === 'R' ? 'R' : 'L')).sort();
const xOf = (unitId) => Number(S().units.find((u) => u.id === unitId)?.position?.x_mm) || 0;
const widthOf = (unitId) => Number(S().units.find((u) => u.id === unitId)?.params?.width) || 0;

// ─── THE FAULT, AND THE FIX ───────────────────────────────────────────────

test('F5 · the first wardrobe grows panels on both free ends — that is T65 F6', () => {
  const a = aClientRoom();
  assert.deepEqual(panelsOn(a), ['L', 'R']);
  for (const ep of S().units.find((u) => u.id === a).params.end_panels) {
    assert.equal(isAutoEndPanel(ep), true, 'the automat did not put it there');
  }
});

test('F5 · ADD BESIDE: the panel is gone BEFORE any drag, and the cabinet lands flush', () => {
  const a = aClientRoom();
  const b = S().addUnit('WARDROBE', { params: { width: 1000, height: 2200, depth: 600 }, near: a, side: 'R' });
  assert.ok(b.id, `the add refused: ${b.error}`);

  // The panel between them is GONE — not after a drag, on the add.
  assert.deepEqual(panelsOn(a), ['L'], 'the facing panel survived the add');
  assert.deepEqual(panelsOn(b.id), ['R'], 'the new cabinet grew the run\'s new free end');

  // …and the new cabinet is FLUSH, which is what "the panel is gone" means
  // geometrically: it landed where a drag would have snapped it.
  assert.equal(xOf(b.id), xOf(a) + widthOf(a), 'the new cabinet is standing one board out');
});

test('F5 · and there is nothing left for the sweep to find — no drag would change it', () => {
  const a = aClientRoom();
  const b = S().addUnit('WARDROBE', { params: { width: 1000, height: 2200, depth: 600 }, near: a, side: 'R' });
  const settled = JSON.stringify(S().units.map((u) => [u.id, u.position.x_mm, panelsOn(u.id)]));

  // THE MEASUREMENT THE OWNER MADE: move it away and bring it back.
  S().moveUnit(b.id, xOf(b.id) + 300, 0);
  S().moveUnit(b.id, xOf(a) + widthOf(a), 0);
  assert.equal(JSON.stringify(S().units.map((u) => [u.id, u.position.x_mm, panelsOn(u.id)])), settled,
    'the drag changed something the add should already have done');

  // …and the engine agrees: nothing is a stray.
  const strays = autoEndPanelStrays(S().units, getCabinetProfile(), { room: S().project.room });
  assert.deepEqual(strays.panels, [], 'a panel is standing where a cabinet is');
});

test('F5 · the LEFT side too — the sweep is not written for one hand', () => {
  const a = aClientRoom();
  const b = S().addUnit('WARDROBE', { params: { width: 1000, height: 2200, depth: 600 }, near: a, side: 'L' });
  assert.ok(b.id, `the add refused: ${b.error}`);
  assert.deepEqual(panelsOn(a), ['R'], 'the LEFT facing panel survived the add');
  assert.equal(xOf(b.id) + widthOf(b.id), xOf(a), 'the new cabinet is standing one board out');
});

test('F5 · retail\'s own + goes through the same call, so it gets the same answer', () => {
  // THE CLIENT'S OWN ROOM, built the client's own way: `startDesign` then the
  // first wardrobe, which is where its width, height and depth come from. The
  // plus then adds one BESIDE it, and the panel between them goes on the add.
  setWardrobeEndPanelAuto(true);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  A.startDesign('T72 F5');
  const a = A.addFirstWardrobe();
  assert.ok(a, 'the first wardrobe would not go in');
  assert.deepEqual(panelsOn(a), ['R'], 'the first wardrobe sits at the wall, so only its free end shows');

  const res = A.addBesidePlus({ unitId: a, side: 'right' });
  assert.equal(res.ok, true, `the plus refused: ${res.said}`);
  assert.deepEqual(panelsOn(a), [], 'the plus left the panel standing between two cabinets');
  assert.equal(xOf(res.id), xOf(a) + widthOf(a), 'the new cabinet is standing one board out');
  // …and the run's NEW free end carries one, which is the same law saying yes.
  assert.deepEqual(panelsOn(res.id), ['R']);

  // ONE CALL: the plus is `addUnit(type, { near, side })` and nothing else.
  assert.match(read('src/retail/design/adapter.js'),
    /S\(\)\.addUnit\(near\.type, \{ near: near\.id, side: point\.side \}\)/);
});

test('F5 · the plus speaks WORDS and the library speaks LETTERS — one reading of both', () => {
  // `engine/runs.js addPlusPoints` hands `'left'`/`'right'`; PRO's library hands
  // `'L'`/`'R'`. `isLeftSide` is the app's own one reading of that, and reading
  // it by hand is how a plus on the right would close the panel on the left.
  const store = read('src/stores/projectStore.js');
  const at = store.indexOf('closeAutoEndPanelFacing: (unitId, side) => {');
  const body = store.slice(at, store.indexOf('\n  },', at));
  assert.match(body, /const want = isLeftSide\(side\) \? 'L' : 'R';/);

  // …and it answers the same for both dialects, on the same panel.
  const a = aClientRoom();
  assert.equal(S().closeAutoEndPanelFacing(a, 'R'), 25);
  assert.deepEqual(panelsOn(a), ['L']);
  S().refreshAutoParts();
  S().settleLayout(a);
  assert.deepEqual(panelsOn(a), ['L', 'R'], 'the automat did not put it back');
  assert.equal(S().closeAutoEndPanelFacing(a, 'right'), 25);
  assert.deepEqual(panelsOn(a), ['L']);
});

// ─── AND WHAT THE SWEEP MAY NOT TOUCH ─────────────────────────────────────

test('F5 · a panel the CLIENT asked for is permanent — a neighbour does not take it', () => {
  const a = aClientRoom();
  // Take the automat's own off and put one there BY HAND, which is what EXTRAS
  // does: T65 F6's *"his decision outranks the automat"*.
  const auto = S().units.find((u) => u.id === a).params.end_panels.find((ep) => ep.side === 'R');
  S().removeEndPanel(a, auto.id, { decline: true });
  const added = A.addEndPanelByHand(a, 'R');
  assert.equal(added.ok, true, `the hand add refused: ${added.said}`);

  const b = S().addUnit('WARDROBE', { params: { width: 1000, height: 2200, depth: 600 }, near: a, side: 'R' });
  assert.ok(b.id, `the add refused: ${b.error}`);
  assert.ok(panelsOn(a).includes('R'), 'the automat took a panel the client asked for');
});

test('F5 · a HAND-added panel is not `auto_added`, so the sweep cannot see it', () => {
  const store = read('src/stores/projectStore.js');
  const at = store.indexOf('closeAutoEndPanelFacing: (unitId, side) => {');
  assert.ok(at > 0, 'the sweep has no name');
  const body = store.slice(at, store.indexOf('\n  },', at));
  assert.match(body, /isAutoEndPanel\(p\)/, 'it does not ask whether the automat put it there');
  assert.match(body, /askedSides\(unit\)\.includes\(want\)/, 'it does not respect the client\'s own');
  // THE ORDINARY REMOVAL, so the board leaves the cut list by the route that
  // already exists — and NOT a decline, because a junction being covered is
  // not a junction the joiner said no to.
  assert.match(body, /get\(\)\.removeEndPanel\(unitId, ep\.id, \{ decline: false \}\)/);
});

test('F5 · …so the automat offers it again when the neighbour is dragged away', () => {
  const a = aClientRoom();
  const b = S().addUnit('WARDROBE', { params: { width: 1000, height: 2200, depth: 600 }, near: a, side: 'R' });
  assert.deepEqual(panelsOn(a), ['L']);
  // Drag the neighbour clear: the side shows again, so the board comes back.
  S().moveUnit(b.id, xOf(b.id) + 800, 0);
  assert.deepEqual(panelsOn(a), ['L', 'R'], 'a bare carcass side was left showing');
});

test('F5 · ONE LAW: the sweep runs on the add, and the settle still runs after it', () => {
  const store = read('src/stores/projectStore.js');
  // Called from the add, before the placement is measured…
  const add = store.slice(store.indexOf('addUnit: (typeId,'), store.indexOf('return { id: unit.id, error: null, wall: placed.wall };'));
  assert.match(add, /get\(\)\.closeAutoEndPanelFacing\(beside\.id, side\)/);
  assert.ok(add.indexOf('closeAutoEndPanelFacing') < add.indexOf('const x = freeSlotOnWall({'),
    'the sweep runs AFTER the placement — that is the fault, not the fix');
  // …and only where a SIDE was named, which is the gesture his sentence is about.
  // AMENDED BY T74 F7: …and, beside a wardrobe, only when what arrives is a
  // wardrobe standing on the floor: *"Bok szafy przy wall unit ZOSTAJE (to nie
  // szafa do szafy, reguła znikającego panelu nie działa)."*
  assert.match(add, /if \(beside && side && \(!inPlayWardrobe\(beside\) \|\| inPlayWardrobe\(unit\)\)\) \{/);
  // The settle is untouched and still ends the add.
  assert.match(add, /get\(\)\.settleLayout\(unit\.id\);/);
  // …and it is all one `runBatch`, so Ctrl+Z takes the whole add back.
  assert.match(store, /addUnit: \(typeId, \{ params = null, near = null, side = null \} = \{\}\) => runBatch\(\(\) => \{/);
});
