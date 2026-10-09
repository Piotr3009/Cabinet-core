// ─── F10: CORNER → L_SHAPE (turn 31, CLAUDE.md F10) ─────────────────────────
//
// "The T30 type is an L-shape cabinet, not a corner system — rename typeId
// `CORNER` → `L_SHAPE`, label 'L-shape unit'. MIGRATE saved projects: on
// project load, `CORNER` reads as `L_SHAPE` (one-line alias kept forever);
// never break an existing save. Joints for it stay PARKED by the owner's word."
//
// FOREVER is the word this file is mostly about. A migration runs once, on a
// project somebody opens; a saved file that has sat in a drawer for two years
// has never been migrated at all, and it will open one day.
//
// ─── AMENDED BY T75 F4 · THE TRUE L CARCASS ────────────────────────────────
//
// CLAUDE.md T75 F4: *"KASACJA of T30: delete the `L_SHAPE` type, its builder
// block in `cabinet.js`, its library row and its tests; `TYPE_ALIASES` keeps
// BOTH old names forever: `CORNER: 'CORNER_L_BASE'`, `L_SHAPE:
// 'CORNER_L_BASE'`, and `loadProject` migrates `cornerArm` to the new
// params."*  The tests of the T30 KIT went with it (the type, its eight plain
// boards, its library rows, its "not one hole"); the ALIAS half of this file
// stays, rewritten to the name both old ids now read as. The true L's own
// tests are `test/turn75-f4-the-true-l-carcass.test.js`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  TYPE_ALIASES, UNIT_TYPES, getUnitType, resolveTypeId,
} from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

// ═══════════════════════════════════════════════════════════════════════════
// THE ALIAS, KEPT FOREVER
// ═══════════════════════════════════════════════════════════════════════════

test('the old names resolve, and they are TWO lines in ONE table', () => {
  assert.equal(TYPE_ALIASES.CORNER, 'CORNER_L_BASE');
  assert.equal(TYPE_ALIASES.L_SHAPE, 'CORNER_L_BASE');
  assert.equal(resolveTypeId('CORNER'), 'CORNER_L_BASE');
  assert.equal(resolveTypeId('L_SHAPE'), 'CORNER_L_BASE');
  assert.equal(resolveTypeId('CORNER_L_BASE'), 'CORNER_L_BASE');
  // A name nobody has heard of is left exactly as it is, so the alias table
  // cannot quietly become a fallback for typos.
  assert.equal(resolveTypeId('BUD'), 'BUD');
  assert.equal(resolveTypeId('nonsense'), 'nonsense');
  assert.equal(resolveTypeId(undefined), '');
  // The old keys are GONE from the table of kits: they are aliases, not records.
  assert.equal(UNIT_TYPES.CORNER, undefined);
  assert.equal(UNIT_TYPES.L_SHAPE, undefined);
});

test('EVERY reader resolves them, not just the store’s migration', () => {
  assert.equal(getUnitType('CORNER'), UNIT_TYPES.CORNER_L_BASE);
  assert.equal(getUnitType('L_SHAPE'), UNIT_TYPES.CORNER_L_BASE);
  assert.equal(getUnitType('L_SHAPE').label, 'Corner L');
  // …and an unknown name still falls back the way it always did.
  assert.equal(getUnitType('nonsense'), UNIT_TYPES.WARDROBE);
});

test('A SAVED PROJECT from before T75 opens, as the true L, with its arm', () => {
  // The file in the drawer: a unit stored with the turn-30 id and no arm
  // typed, exactly as turn 30 wrote it.
  const saved = [{
    id: 'u_old',
    type: 'CORNER',
    position: { wall: 0, x_mm: 0, rotation_deg: 0 },
    params: {
      type: 'CORNER', unit_num: 'CR01', width: 1000, height: 770, depth: 1000, board_t: 18, front_t: 25,
    },
  }];
  store().loadProject({
    id: null, name: 'from the drawer', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, saved);

  const unit = store().units[0];
  assert.ok(unit, 'the saved unit did not survive the load');
  assert.equal(unit.type, 'CORNER_L_BASE', 'the stored type was not migrated');
  assert.equal(unit.params.type, 'CORNER_L_BASE', '…and neither was the copy on the params');
  // T30's L had the profile's 600 arm where the save typed none, and its
  // adjacent wall at x = 0: that is the shape it keeps.
  assert.equal(unit.params.arm_mm, 600);
  assert.equal(unit.params.corner_side, 'left');
  // And it BUILDS: the whole point of "never break an existing save".
  const r = store().unitResult(unit.id);
  assert.ok(r, 'the migrated unit does not compute');
  assert.ok(r.panels.some((p) => p.id === 'TOP-L'), 'the L top is not one board');
  assert.equal(unit.params.unit_num, 'CR01', 'the cabinet kept its name');
});

test('nothing in src/ still reaches for the old ids', () => {
  const SRC = new URL('../src/', import.meta.url).pathname;
  const walk = (dir) => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : (/\.(js|jsx)$/.test(p) ? [p] : []);
  });
  const ALIAS_TABLE = join(SRC, 'engine/types.js');
  const CLEARANCE = join(SRC, 'engine/frontClearance.js');
  for (const path of walk(SRC)) {
    // The table itself must name them, and turn 31's rule-7 type test in the
    // fronts branch's file still reads both (FRONTS BOUNDARY: not this turn's).
    if (path === ALIAS_TABLE || path === CLEARANCE) continue;
    const text = readFileSync(path, 'utf8');
    assert.ok(
      !/['"]CORNER['"]/.test(text) && !/['"]L_SHAPE['"]/.test(text),
      `${path.slice(SRC.length)} still names an old type id`,
    );
  }
  const clearance = readFileSync(CLEARANCE, 'utf8');
  assert.match(clearance, /typeId === 'L_SHAPE' \|\| typeId === 'CORNER'/);
});
