import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';

// ─── TURN 58 · F4 — A PULL-DOWN CANNOT LIVE UNDER A SLOPE ──────────────────
//
// The owner: *"jak się zaczyna skos, to ma zniknąć — nie tylko jak się pojawi
// diverter, ale też jak jest sam. Szafa ze skosem nie może mieć pull-down, bo
// to jest zawsze na wysokości."*
//
// The kit's own numbers agree: it parks HIGH and its swing sweeps the top
// front — exactly the air a rake takes away.
//
// THE TRIGGER IS THE SLOPE BEING ACTIVE, and nothing narrower. T55-F3's sweep
// beside this one acts on a FLIP; a wardrobe under a straight rake has no flip
// and still has no room for a pull-down. Knee or straight, always.
//
// TWO HALVES, ONE READING. The store removes a kit already fitted
// (`settleSlopePulldowns`); the Add-items row refuses a new one. Both ask
// `unitUnderSlope`, so the menu cannot offer what the store would take
// straight back off.

const S = () => useProjectStore.getState();
const ADD_ITEMS = readFileSync(new URL('../src/components/AddItems.jsx', import.meta.url), 'utf8');

function room() {
  S().loadProject({
    id: null,
    name: 'T58 F4',
    number: '58',
    client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
}

function wardrobeWithPulldown() {
  room();
  const unit = S().addUnit('WARDROBE');
  S().updateUnitParams(unit.id, { width: 1000, height: 2200 });
  S().moveUnit(unit.id, 0, 0, { magnet: false });
  const id = S().addWardrobeKit(unit.id, 'pulldown_rail');
  assert.ok(id, 'the kit went in on a flat wardrobe');
  return unit.id;
}

const kitsOf = (id) => (S().units.find((u) => u.id === id)?.params.sections?.[0]?.items || [])
  .filter((i) => i.kind === 'pulldown_rail');

// ═══ 1. THE SLOPE TAKES IT AWAY ═════════════════════════════════════════════

test('F4 · a STRAIGHT rake removes the pull-down — no flip needed', () => {
  const id = wardrobeWithPulldown();
  assert.equal(kitsOf(id).length, 1);
  // A rake across the whole cabinet: no leaf is left without wood, so T55-F3's
  // own sweep does nothing here. This one still fires.
  S().addWallSlope({
    wall: 0, side: 'L', startHeight: 1400, run: 3000,
  });
  S().settleLayout();
  assert.equal(kitsOf(id).length, 0, 'the kit is gone');
});

test('F4 · …and a KNEE rake removes it too — always, on an active slope', () => {
  const id = wardrobeWithPulldown();
  S().addWallSlope({
    wall: 0, side: 'L', startHeight: 1300, run: 900,
  });
  S().settleLayout();
  assert.equal(kitsOf(id).length, 0);
});

test('F4 · the removal SAYS SO, in the house voice, naming the pull-down', () => {
  const id = wardrobeWithPulldown();
  useUiStore.getState().clearMessages?.();
  S().addWallSlope({ wall: 0, side: 'L', startHeight: 1400, run: 3000 });
  S().settleLayout();
  const said = useUiStore.getState().messages || [];
  const mine = said.find((m) => /pull-down/i.test(m.message || ''));
  assert.ok(mine, `nothing said about the pull-down; messages: ${said.map((m) => m.message).join(' | ')}`);
  assert.match(mine.message, /slope removed the pull-down/i, 'it names the slope AND the kit');
  // `makeMessage` turns a tone into a LEVEL — the field the panel paints from
  // — so this asserts the colour a joiner sees, not the word the caller typed.
  assert.equal(mine.level, 'yellow', 'a warning, like the sibling sweep\'s');
  assert.equal(kitsOf(id).length, 0, 'and the kit really is gone');
});

// ═══ 2. THE ENTRY IS GREYED, THROUGH THE EXISTING CHANNEL ═══════════════════

test('F4 · the store has ONE reading of "is this unit under a slope"', () => {
  const id = wardrobeWithPulldown();
  assert.equal(S().unitUnderSlope(id), false, 'flat');
  S().addWallSlope({ wall: 0, side: 'L', startHeight: 1400, run: 3000 });
  S().settleLayout();
  assert.equal(S().unitUnderSlope(id), true, 'raked');
});

test('F4 · the Add-items row refuses through `disabled`/`why` — no second gate', () => {
  assert.match(ADD_ITEMS, /disabled: !type\.supports\.pulldown \|\| underSlope/,
    'the existing channel, given one more reason');
  assert.match(ADD_ITEMS, /why: underSlope \? 'not under a slope/,
    'and it says why in one line');
  assert.match(ADD_ITEMS, /st\.unitUnderSlope\?\.\(unit\.id\)/,
    'asking the STORE\'s one reading, not a second one of its own');
});

// ═══ 3. THE SLOPE GOES — AND NOTHING RESURRECTS ═════════════════════════════

test('F4 · slope removed → the entry re-enables and the kit does NOT come back', () => {
  const id = wardrobeWithPulldown();
  S().addWallSlope({ wall: 0, side: 'L', startHeight: 1400, run: 3000 });
  S().settleLayout();
  assert.equal(kitsOf(id).length, 0);
  assert.equal(S().unitUnderSlope(id), true);

  // Take the rake away.
  const slopes = S().project.wallSlopes || [];
  for (const sl of slopes) S().removeWallSlope(sl.id);
  S().settleLayout();

  assert.equal(S().unitUnderSlope(id), false, 'the entry is offered again');
  assert.equal(kitsOf(id).length, 0,
    'and the kit stays gone — a removal is not a loan');
});

// ═══ 4. THE FLAT TWIN ═══════════════════════════════════════════════════════

test('F4 · a flat wardrobe keeps its pull-down through every settle', () => {
  const id = wardrobeWithPulldown();
  S().settleLayout();
  S().settleLayout();
  assert.equal(kitsOf(id).length, 1, 'nothing was taken from a cabinet with no rake');
});

test('F4 · a wardrobe with no pull-down costs one filter and says nothing', () => {
  room();
  const unit = S().addUnit('WARDROBE');
  S().updateUnitParams(unit.id, { width: 1000, height: 2200 });
  S().moveUnit(unit.id, 0, 0, { magnet: false });
  S().addWallSlope({ wall: 0, side: 'L', startHeight: 1400, run: 3000 });
  S().settleLayout();
  assert.equal(kitsOf(unit.id).length, 0);
  assert.ok(P.wardrobeAccessories.kits.pulldown_rail, 'the kit still exists in the profile');
});
