/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F13 . SETBACKS: SHELVES AND DIVIDERS 10 MM, DRAWERS UNTOUCHED.
//
// The owner, 18.10.2026: *"wszystkie cofnięcia zmień z 20 na 10 mm, 20 to
// stanowczo za dużo"*; 14:17: *"tylko półki i dividery, szuflady zostaw nie
// ruszaj."*
//
// The fossil law: a bare computeCabinet() keeps the LISP's numbers (a shelf 20
// back, a divider and the drawer cap full depth); a unit in a PROJECT hears the
// profile through paramsForEngine (`shelf_front_mm` 10, `interior_setback_mm`
// 10, `drawer_cap_setback_mm` 20). The drawer numbers below were read off the
// code BEFORE this change (18.10.2026, the same store-built wardrobes) and are
// held literally: every drawer board, runner hole and partition screw is byte
// for byte what it was.
//
// AMENDED 28.10.2026 (chat fix, KIT_RECESS.lsp D24), the owner: *"wszystkie
// polki teraz sa 10 mm, to polke nad szufladami tez zrob 10 mm jak reszta"*:
// the board over a drawer stack stands back 10 too (`capSetbackMm` 20 -> 10;
// D-G-20 -> D-G-10 below). And the same evening, *"zeby zamontowac
// szuflady"*: a divider's runner row is measured from ITS OWN front edge, its
// left face drilled as BUL, its right face turned over as BUR (T82 F9's law);
// until then it read `partitionDepth - v` and stood mirrored front to back
// (VPART-1 408 376 152 below, the runner's own holes 112 144 368).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore, paramsForEngine, migrateUnitSetbacks } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { confirmDrawerBox } from './drawer-box-gate.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const store = () => useProjectStore.getState();
const G = P.board.thickness;

function project() {
  store().loadProject({
    id: null, name: 't79-f13', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
  confirmDrawerBox();
}
const unitOf = (id) => store().units.find((u) => u.id === id);
const itemsOf = (id) => unitOf(id).params.sections[0].items;
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);
const holes = (r, kind) => r.drills.filter((d) => d.kind === kind).map((d) => [d.panel, d.x, d.y]);

function wardrobe1200() {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 1200 });
  return id;
}

// ─── the numbers ─────────────────────────────────────────────────────────────

test('F13 · the profile carries the three numbers; the LISP\'s 20 stays for a bare call', () => {
  assert.equal(P.carcass.shelfSetbackMm, 10, '*"z 20 na 10 mm"*');
  assert.equal(P.carcass.dividerSetbackMm, 10, '*"tylko półki i dividery"*');
  assert.equal(P.wardrobe.drawers.capSetbackMm, 10, '28.10.2026: *"polke nad szufladami tez zrob 10 mm jak reszta"* (20 until then)');
  assert.equal(P.carcass.shelfDepthClearance, 20, 'the LISP\'s own shelf clearance, for a bare kit call');
  assert.equal('interiorSetback' in P.carcass, false, 'one number per family: the old interiorSetback is gone');
});

test('F13 · paramsForEngine injects the project setbacks from the profile', () => {
  const id = wardrobe1200();
  const p = paramsForEngine(unitOf(id));
  assert.equal(p.shelf_front_mm, 10);
  assert.equal(p.interior_setback_mm, 10);
  assert.equal(p.drawer_cap_setback_mm, 10, '28.10.2026 (D24): the drawer cap 10 like the rest');
});

// ─── a store-built wardrobe ──────────────────────────────────────────────────

test('F13 · a store-built wardrobe: shelves D-G-10, the drawer cap D-G-10 (28.10), runner holes as on 18.10', () => {
  const id = wardrobe1200();
  store().addShelves(id, 2);
  store().addDrawers(id, 3, 'internal');
  const r = resultOf(id);
  const D = unitOf(id).params.depth;
  assert.equal(D, 558);
  const shelves = r.panels.filter((p) => p.part === 'SHELF');
  assert.equal(shelves.length, 2);
  for (const s of shelves) {
    assert.equal(s.h, D - G - 10, `${s.id} is cut D-G-10`);
    assert.equal(s.box.z, G, `${s.id} keeps its back edge at the back panel`);
    assert.equal(s.meta.front_mm, 10);
  }
  const cap = r.panels.find((p) => p.id === 'PARTITION');
  // 28.10.2026 (D24): D-G-10, like every shelf (D-G-20, 520 deep, until then).
  assert.equal(cap.h, D - G - 10, 'the drawer cap: D-G-10');
  assert.equal(cap.box.d, 530);
  assert.equal(cap.meta.front_mm, 10);
  // The 18.10 numbers, read off the code before T79 F13.
  assert.deepEqual(holes(r, 'runner'), [
    ['BUL', 112, 56], ['BUL', 144, 56], ['BUL', 368, 56], ['BUL', 112, 259], ['BUL', 144, 259], ['BUL', 368, 259],
    ['BUL', 112, 462], ['BUL', 144, 462], ['BUL', 368, 462],
    ['BUR', 428, 56], ['BUR', 396, 56], ['BUR', 172, 56], ['BUR', 428, 259], ['BUR', 396, 259], ['BUR', 172, 259],
    ['BUR', 428, 462], ['BUR', 396, 462], ['BUR', 172, 462],
  ]);
  assert.deepEqual(holes(r, 'partition_screw'), [
    ['BUL', 50, 638], ['BUL', 270, 638], ['BUL', 490, 638], ['BUR', 50, 638], ['BUR', 270, 638], ['BUR', 490, 638],
    ['BACK', 68, 638], ['BACK', 600, 638], ['BACK', 1132, 638],
  ]);
});

test('F13 · a store-built divider stands 10 back, and the column guard says 10', () => {
  const id = wardrobe1200();
  store().addShelves(id, 2);
  store().addPartition(id);
  const r = resultOf(id);
  const D = unitOf(id).params.depth;
  const vpart = r.panels.find((p) => p.id === 'VPART-1');
  assert.equal(vpart.box.d, D - G - 10, 'the divider is D-G-10');
  assert.equal(vpart.meta.front_mm, 10);
  const guard = store().columnDrawerGuard(id, 0);
  assert.equal(guard.blocked, true);
  assert.equal(guard.setbackMm, 10, 'the guard reads the same one number the engine is handed');
  assert.match(guard.message, /stands 10 mm back/);
});

test('F13 · column drawers beside a divider at the face: Z1-PART D-G-10 and the VPART holes on its own front (28.10)', () => {
  const id = wardrobe1200();
  store().addShelves(id, 2);
  store().addPartition(id);
  const part = itemsOf(id).find((i) => i.kind === 'partition');
  store().setElementDepth(id, part.id, 0);
  const added = store().addDrawers(id, 3, 'internal', undefined, 0);
  assert.equal(added.ok, true);
  const r = resultOf(id);
  const D = unitOf(id).params.depth;
  assert.equal(r.panels.find((p) => p.id === 'VPART-1').box.d, D - G, 'pulled to the face, full depth');
  const zcap = r.panels.find((p) => p.id === 'Z1-PART');
  // 28.10.2026 (D24): D-G-10 (D-G-20 until then).
  assert.equal(zcap.box.d, D - G - 10, 'the column cap: D-G-10');
  assert.equal(zcap.meta.front_mm, 10);
  // 28.10.2026: VPART-1 is the column's RIGHT wall, its LEFT face drilled as BUL from its own front edge: the runner's
  // own 37, 69, 293 behind the box setback 75 (408 376 152 until then, the row mirrored about the cap's middle).
  assert.deepEqual(holes(r, 'runner').filter(([panel]) => panel === 'VPART-1'), [
    ['VPART-1', 112, 38], ['VPART-1', 144, 38], ['VPART-1', 368, 38],
    ['VPART-1', 112, 241], ['VPART-1', 144, 241], ['VPART-1', 368, 241],
    ['VPART-1', 112, 444], ['VPART-1', 144, 444], ['VPART-1', 368, 444],
  ]);
  // The cap's three through the divider follow its depth, 530 (50 260 470 on 520 until 28.10).
  assert.deepEqual(holes(r, 'partition_screw'), [
    ['BUL', 50, 638], ['BUL', 270, 638], ['BUL', 490, 638],
    ['VPART-1', 50, 620], ['VPART-1', 265, 620], ['VPART-1', 480, 620],
    ['BACK', 68, 638], ['BACK', 304.5, 638], ['BACK', 541, 638],
  ]);
});

test('F13 · the unit\'s own partition_front_mm still moves the drawer cap (the Partition front edge button)', () => {
  const id = wardrobe1200();
  store().addDrawers(id, 2, 'internal');
  const D = unitOf(id).params.depth;
  store().setPartitionFront(id, 0);
  assert.equal(resultOf(id).panels.find((p) => p.id === 'PARTITION').h, D - G);
  store().setPartitionFront(id, null);
  // 28.10.2026 (D24): back to the project's 10 (20 until then).
  assert.equal(resultOf(id).panels.find((p) => p.id === 'PARTITION').h, D - G - 10);
});

test('F13 · a unit that says its own interior_setback_mm moves its dividers AND its drawer cap, as before T79', () => {
  // Before T79 the store handed the unit's own number to both (the cap read it
  // through partitionDepth); *"szuflady zostaw nie ruszaj"*: the cap still does.
  const id = wardrobe1200();
  store().addPartition(id);
  store().addDrawers(id, 2, 'internal');
  store().updateUnitParams(id, { interior_setback_mm: 0 });
  const p = paramsForEngine(unitOf(id));
  assert.equal(p.interior_setback_mm, 0);
  assert.equal(p.drawer_cap_setback_mm, 0);
  assert.equal(p.shelf_front_mm, 10, 'the shelves are not in it, as they never were');
  const r = resultOf(id);
  const D = unitOf(id).params.depth;
  assert.equal(r.panels.find((x) => x.id === 'PARTITION').box.d, D - G, 'the cap follows the unit, as on 18.10');
  assert.equal(r.panels.find((x) => x.id === 'VPART-1').meta.front_mm, 0);
});

// ─── the fossil law ──────────────────────────────────────────────────────────

test('F13 · a bare computeCabinet() is the LISP: shelf 20 back, divider and cap full depth', () => {
  const W = defaultParamsFor('WARDROBE', P);
  const r = computeCabinet({
    ...W, width: 1200, unit_num: 'W1',
    items: [
      { id: 's1', kind: 'shelf', pos_mm: 1400 },
      { id: 'p1', kind: 'partition', x_mm: 591 },
      { id: 'd1', kind: 'drawer', index: 1, mount: 'internal' },
      { id: 'd2', kind: 'drawer', index: 2, mount: 'internal' },
    ],
  }, P);
  const D = W.depth;
  assert.equal(r.panels.find((p) => p.id === 'SHELF-1').box.d, D - G - 20);
  assert.equal(r.panels.find((p) => p.id === 'VPART-1').meta.front_mm, 0);
  assert.equal(r.panels.find((p) => p.id === 'PARTITION').box.d, D - G);
});

// ─── one law, one path ───────────────────────────────────────────────────────

test('F13 · one law per family in the engine: the shelf sites, dividerSetback, partitionDepth', () => {
  const code = read('src/engine/cabinet.js').replace(/\/\/.*$/gm, '');
  // Every shelf site reads the LISP's 20 ONLY as the fallback of the project's
  // number, as CLAUDE.md T79 F13 writes it; no site reads it bare any more.
  const all = (code.match(/C\.shelfDepthClearance/g) || []).length;
  const asFallback = (code.match(/setbackOf\([^,()]+, params\?\.shelf_front_mm \?\? C\.shelfDepthClearance\)/g) || []).length;
  assert.equal(asFallback, 6, 'the cut depth, the box z, meta.front_mm, the shoe pivot, the stop rail, assemblies.shelves');
  assert.equal(all, asFallback, 'a shelf site still reads the LISP\'s 20 without the project\'s number');
  assert.match(code, /const ownFront = setbackOf\(item\?\.front_mm, dividerSetback\);/);
  assert.match(code, /setbackOf\(params\?\.drawer_cap_setback_mm, interiorSetback\)/);
  assert.doesNotMatch(code, /\bshelfH\b/, 'the dead shelfH is gone');
  const storeCode = read('src/stores/projectStore.js');
  assert.doesNotMatch(storeCode, /interiorSetback/, 'the store reads the new keys only');
  assert.equal((storeCode.match(/unitSetbackOr\(/g) || []).length, 4,
    'one reader of the unit\'s setback: declared once, used by paramsForEngine (divider, cap) and by the column guard');
});

test('F13 · the UI shows the project\'s numbers (PRO and retail), never a typed 20', () => {
  for (const rel of ['src/components/ElementProperties.jsx', 'src/retail/design/detail/ElementProperties.jsx']) {
    const text = read(rel);
    const block = text.slice(text.indexOf("case 'setback': {"), text.indexOf("case 'setback-unit':"));
    assert.match(block, /profile\.carcass\.dividerSetbackMm/, `${rel}: the divider's chip`);
    assert.match(block, /profile\.carcass\.shelfSetbackMm/, `${rel}: the shelf's chip`);
    assert.doesNotMatch(block, /shelfDepthClearance/, `${rel}: the chip no longer offers the LISP's 20`);
  }
  const rp = read('src/components/RightPanel.jsx');
  assert.doesNotMatch(rp, /interiorSetback/);
  assert.match(rp, /profile\.carcass\.shelfSetbackMm/);
  assert.match(rp, /profile\.wardrobe\.drawers\.capSetbackMm/);
});

// ─── the migration ───────────────────────────────────────────────────────────

test('F13 · migration on load: a shelf or divider saved at exactly 20 comes back at 10; hand values stay', () => {
  const id = wardrobe1200();
  store().addShelves(id, 3);
  store().addPartition(id);
  const saved = JSON.parse(JSON.stringify(unitOf(id)));
  delete saved.params.setback_schema;
  const items = saved.params.sections[0].items;
  const shelves = items.filter((i) => i.kind === 'shelf');
  const part = items.find((i) => i.kind === 'partition');
  shelves[0].front_mm = 20;
  shelves[1].front_mm = 30;
  shelves[2].front_mm = 0;
  part.front_mm = 20;
  saved.params.partition_front_mm = 20;
  store().loadProject({
    id: null, name: 'saved', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, [saved]);
  const back = store().units[0];
  const byId = new Map(back.params.sections[0].items.map((i) => [i.id, i]));
  assert.equal(byId.get(shelves[0].id).front_mm, 10, 'the old standard 20 is the new 10');
  assert.equal(byId.get(shelves[1].id).front_mm, 30, 'a hand value stays');
  assert.equal(byId.get(shelves[2].id).front_mm, 0, 'flush stays flush');
  assert.equal(byId.get(part.id).front_mm, 10, 'the divider too');
  assert.equal(back.params.partition_front_mm, 20, 'the unit\'s seed also seeds the drawer cap: left alone');
  assert.equal(back.params.setback_schema, 1, 'stamped, so it happens once');
  // Once stamped, a 20 typed by hand is a choice and survives the next load.
  const again = JSON.parse(JSON.stringify(back));
  again.params.sections[0].items.find((i) => i.id === shelves[1].id).front_mm = 20;
  store().loadProject({
    id: null, name: 'saved again', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, [again]);
  assert.equal(store().units[0].params.sections[0].items.find((i) => i.id === shelves[1].id).front_mm, 20);
});

test('F13 · the stamp: only where the migration moved something or a setback was written today', () => {
  // A unit with nothing to move comes back as the very object: a saved fixture
  // stays a fixed point (test/turn75-fixtures-the-set.test.js).
  const plain = { id: 'p', params: { sections: [{ items: [{ id: 'a', kind: 'shelf', front_mm: 30 }, { id: 'b', kind: 'shelf' }] }] } };
  assert.equal(migrateUnitSetbacks(plain, P), plain);
  const unit = { id: 'u', params: { sections: [{ items: [{ id: 'a', kind: 'shelf', front_mm: 20 }, { id: 'b', kind: 'drawer', front_mm: 20 }] }] } };
  const m = migrateUnitSetbacks(unit, P);
  assert.equal(m.params.sections[0].items[0].front_mm, 10);
  assert.equal(m.params.sections[0].items[1].front_mm, 20, 'a drawer is not a shelf: *"szuflady zostaw"*');
  assert.equal(m.params.setback_schema, 1);
  assert.equal(migrateUnitSetbacks(m, P), m, 'a stamped unit is returned as it is');
  assert.equal(unit.params.sections[0].items[0].front_mm, 20, 'the input is not mutated');
  // A new unit carries no stamp until a setback is written; writing one stamps it.
  const id = wardrobe1200();
  store().addShelves(id, 1);
  assert.equal(unitOf(id).params.setback_schema, undefined, 'nothing written, nothing stamped');
  const [sh] = itemsOf(id).filter((i) => i.kind === 'shelf');
  store().setElementDepth(id, sh.id, 20);
  assert.equal(unitOf(id).params.setback_schema, 1, 'a 20 typed today is a choice');
  const saved = JSON.parse(JSON.stringify(unitOf(id)));
  store().loadProject({
    id: null, name: 'typed 20', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, [saved]);
  assert.equal(store().units[0].params.sections[0].items.find((i) => i.id === sh.id).front_mm, 20,
    'and it survives the reload');
});
