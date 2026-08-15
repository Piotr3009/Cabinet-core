// ─── F10: CORNER → L_SHAPE (turn 31, CLAUDE.md F10) ─────────────────────────
//
// "The T30 type is an L-shape cabinet, not a corner system — rename typeId
// `CORNER` → `L_SHAPE`, label 'L-shape unit'. MIGRATE saved projects: on
// project load, `CORNER` reads as `L_SHAPE` (one-line alias kept forever);
// never break an existing save. Joints for it stay PARKED by the owner's word."
//
// The rename is honest rather than cosmetic. A CORNER SYSTEM is a carousel, a
// magic corner, a bi-fold — a family of mechanisms this app has none of. What
// turn 30 shipped is an L-SHAPED CARCASS, and the old name promised something
// that was never in the box.
//
// FOREVER is the word this file is mostly about. A migration runs once, on a
// project somebody opens; a saved file that has sat in a drawer for two years
// has never been migrated at all, and it will open one day.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  TYPE_ALIASES, UNIT_NUM_PREFIX, UNIT_TYPES, UNIT_TYPE_ORDER, defaultParamsFor, getUnitType,
  resolveTypeId,
} from '../src/engine/types.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { KITCHEN_LIBRARY } from '../src/engine/library.js';

const store = () => useProjectStore.getState();

test('the type is L_SHAPE, and it is called an L-shape unit', () => {
  assert.ok(UNIT_TYPES.L_SHAPE, 'the type is not there under its new name');
  assert.equal(UNIT_TYPES.L_SHAPE.id, 'L_SHAPE');
  assert.equal(UNIT_TYPES.L_SHAPE.label, 'L-shape unit');
  assert.ok(UNIT_TYPE_ORDER.includes('L_SHAPE'));
  // The old key is GONE from the table — it is an alias, not a duplicate
  // record. Two records would be two kits that drift apart.
  assert.equal(UNIT_TYPES.CORNER, undefined);
  assert.equal(UNIT_TYPE_ORDER.includes('CORNER'), false);
});

test('…and the KIT is unchanged to the millimetre — only its name moved', () => {
  const r = computeCabinet({ ...defaultParamsFor('L_SHAPE', P), unit_num: 'CR01' });
  // Turn 30's own contract, restated: the L-carcass ships as plain boards with
  // NOT ONE HOLE in it, because no LISP defines its drilling.
  assert.equal(UNIT_TYPES.L_SHAPE.corner, true);
  assert.equal(r.drills.length, 0, 'the rename drilled something');
  assert.ok(r.panels.length >= 8);
  assert.deepEqual(UNIT_TYPES.L_SHAPE.carcass, {
    top: 'none', sides: 'none', bottom: 'none', back: 'none',
  });
  // …and the cabinet number prefix is the one saved projects already carry.
  assert.equal(UNIT_NUM_PREFIX.L_SHAPE, 'CR');
});

// ═══════════════════════════════════════════════════════════════════════════
// THE ALIAS, KEPT FOREVER
// ═══════════════════════════════════════════════════════════════════════════

test('the old name resolves, and it is ONE line in ONE table', () => {
  assert.equal(TYPE_ALIASES.CORNER, 'L_SHAPE');
  assert.equal(resolveTypeId('CORNER'), 'L_SHAPE');
  assert.equal(resolveTypeId('L_SHAPE'), 'L_SHAPE');
  // A name nobody has heard of is left exactly as it is, so the alias table
  // cannot quietly become a fallback for typos.
  assert.equal(resolveTypeId('BUD'), 'BUD');
  assert.equal(resolveTypeId('nonsense'), 'nonsense');
  assert.equal(resolveTypeId(undefined), '');
});

test('EVERY reader resolves it — not just the store’s migration', () => {
  // A saved project that survives `loadProject` and then fails in the cut list
  // is a project that has not really been migrated. `getUnitType` is what the
  // 3D, the BOM, the drawings and the Library all go through.
  assert.equal(getUnitType('CORNER'), UNIT_TYPES.L_SHAPE);
  assert.equal(getUnitType('CORNER').label, 'L-shape unit');
  // …and an unknown name still falls back the way it always did, rather than
  // becoming an L-shape.
  assert.equal(getUnitType('nonsense'), UNIT_TYPES.WARDROBE);
});

test('A SAVED PROJECT from before tonight opens, and opens as an L-shape', () => {
  // This is the file in the drawer: a unit stored with the old type id, exactly
  // as turn 30 wrote it.
  const saved = [{
    id: 'u_old',
    type: 'CORNER',
    position: { wall: 0, x_mm: 0, rotation_deg: 0 },
    params: {
      type: 'CORNER', unit_num: 'CR01', width: 900, height: 770, depth: 558, board_t: 18, front_t: 25,
    },
  }];
  store().loadProject({
    id: null, name: 'from the drawer', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, saved);

  const unit = store().units[0];
  assert.ok(unit, 'the saved unit did not survive the load');
  assert.equal(unit.type, 'L_SHAPE', 'the stored type was not migrated');
  assert.equal(unit.params.type, 'L_SHAPE', '…and neither was the copy on the params');
  // And it BUILDS: the whole point of "never break an existing save".
  const r = store().unitResult(unit.id);
  assert.ok(r, 'the migrated unit does not compute');
  // The L is cut as PAIRS of plain rectangles — an arm and an arm — which is
  // turn 30's own answer to "no LISP has drawn an L outline". A saved unit that
  // carries fewer params than today's default builds fewer of them and is
  // still an L; what matters is that it builds at all and builds in pairs.
  assert.ok(r.panels.length >= 6, `the L-carcass lost its boards (${r.panels.length})`);
  assert.ok(r.panels.some((p) => /-A$/.test(p.id)) && r.panels.some((p) => /-B$/.test(p.id)),
    'the two arms are not there');
  assert.equal(r.drills.length, 0, 'the migration drilled something');
  assert.equal(unit.params.unit_num, 'CR01', 'the cabinet kept its name');
});

test('…and a project saved TONIGHT is untouched by the migration', () => {
  store().loadProject({
    id: null, name: 'today', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
  const u = store().addUnit('L_SHAPE');
  assert.ok(u.id, u.error);
  const unit = store().units[0];
  assert.equal(unit.type, 'L_SHAPE');
  assert.match(store().unitResult(unit.id).unitNum, /^CR/);
});

test('nothing in src/ still reaches for the old id', () => {
  const SRC = new URL('../src/', import.meta.url).pathname;
  const walk = (dir) => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : (/\.(js|jsx)$/.test(p) ? [p] : []);
  });
  const ALIAS_TABLE = join(SRC, 'engine/types.js');
  const CLEARANCE = join(SRC, 'engine/frontClearance.js');
  for (const path of walk(SRC)) {
    // The table itself must name it, and F4's own corner rule reads BOTH names
    // on purpose (rule 7 is parked and a saved project may still say CORNER).
    if (path === ALIAS_TABLE || path === CLEARANCE) continue;
    const text = readFileSync(path, 'utf8');
    assert.ok(
      !/['"]CORNER['"]/.test(text),
      `${path.slice(SRC.length)} still names the old type id`,
    );
  }
  // F4's rule 7 reads both, and says so.
  const clearance = readFileSync(CLEARANCE, 'utf8');
  assert.match(clearance, /typeId === 'L_SHAPE' \|\| typeId === 'CORNER'/);
});

// ═══════════════════════════════════════════════════════════════════════════
// THE JOINTS STAY PARKED
// ═══════════════════════════════════════════════════════════════════════════

test('the Library offers the KIT, and holds the JOINTS open — two promises', () => {
  const base = KITCHEN_LIBRARY.find((g) => g.id === 'base-units');
  const kit = base.items.find((e) => e.typeId === 'L_SHAPE');
  assert.ok(kit, 'the kit is not in the Library');
  assert.equal(kit.id, 'l-shape-unit');
  assert.equal(kit.label, 'L-shape unit');

  // …and the held-open row is a DIFFERENT promise, which stays held open:
  // "Joints for it stay PARKED by the owner's word."
  const parked = base.items.find((e) => e.id === 'l-shape');
  assert.ok(parked, 'the parked row vanished in the rename');
  assert.equal(parked.kind, 'soon');
  assert.match(parked.label, /joints/i);
  assert.match(parked.reason, /pattern comes first/);

  // Two rows, two ids: a collision would have made one of them unreachable.
  const ids = base.items.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'the Library has a duplicate row id');
});

test('…and nothing in this turn drilled a joint for it', () => {
  const r = computeCabinet({ ...defaultParamsFor('L_SHAPE', P) });
  assert.equal(r.drills.length, 0);
  for (const p of r.panels) {
    assert.deepEqual(p.cnc?.pockets || [], [], `${p.id} grew a pocket`);
  }
});
