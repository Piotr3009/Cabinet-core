// ─── TURN 48, CLAUDE.md F1: THE FLOOR IS LAW ────────────────────────────────
//
// The owner, 25.08.2026: *"zaden element nie moze spasc ponizej podlogi —
// fizycznie to sie wyklucza."*
//
// He is right in the strongest possible sense: it is not a preference, it is
// that two solids cannot occupy the same 18 mm. The fault he found is TWO
// symptoms of ONE cause — `addShoeBox`/`setShoeBox` floored `pos_mm` at
// `Math.max(0, …)`, and a shoe SHELF took the same zero — and zero is the
// UNDERSIDE of the bottom board, not the floor of the box.
//
// So this file holds ONE law in ONE place and never two clamps:
//
//   the arithmetic     engine/items.js `floorClampedPos` — pure, born beside
//                      `centredShelfPos` because it is the same station
//   the station        stores/projectStore.js `onTheFloor`, called from the two
//                      doors every element in the app walks through
//   the record         `meta.floorClamped: true` on the element the law caught
//   the non-effect     a legal element is not moved by a hundredth, and the six
//                      goldens are byte-identical (iron rule 2)

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { floorClampedPos, floorLawedItem, posDatumOf } from '../src/engine/items.js';
import { interiorFloor } from '../src/engine/shelfHeights.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const G = P.board.thickness;

function wardrobe(width = 1200) {
  store().loadProject({
    id: null,
    name: 't48-f1',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design: { projectType: 'wardrobe' },
  }, []);
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width, doors: false });
  return id;
}

const itemsOf = (unitId) => store().units.find((u) => u.id === unitId)?.params.sections?.[0]?.items || [];
const itemOf = (unitId, itemId) => itemsOf(unitId).find((i) => i.id === itemId) || null;

/** Every panel of an ELEMENT — the carcass and the fronts are not elements. */
const CARCASS_PARTS = new Set(['BUL', 'BUR', 'BOTTOM', 'TOP', 'BACK', 'RAIL-PART', 'PLINTH', 'MASK']);
function elementPanels(result) {
  return result.panels.filter((p) => p.box
    && !CARCASS_PARTS.has(p.part)
    && p.role !== 'front'
    && p.role !== 'infill'
    && p.role !== 'end_panel');
}

// ─── THE ARITHMETIC, ON ITS OWN ─────────────────────────────────────────────

test('floorClampedPos: a piece asked for BELOW the floor lands ON it', () => {
  assert.deepEqual(floorClampedPos({ pos: 0, floor: G }), { pos: G, clamped: true });
  assert.deepEqual(floorClampedPos({ pos: -50, floor: G }), { pos: G, clamped: true });
  assert.deepEqual(floorClampedPos({ pos: 17.99, floor: 18 }), { pos: 18, clamped: true });
});

test('floorClampedPos: a piece already legal does not move by a hundredth', () => {
  for (const pos of [18, 18.01, 100, 1234.56, 2199.99]) {
    assert.deepEqual(floorClampedPos({ pos, floor: G }), { pos, clamped: false },
      `${pos} is above the floor and is left exactly where it was asked for`);
  }
});

test('floorClampedPos: what is clamped is the LOWEST POINT, not the datum', () => {
  // Nothing the app places today reaches below its own datum, which is why
  // `dropBelow` is 0 everywhere — but the law is about the BOX, so a piece that
  // hangs 30 mm under its datum is put 30 mm higher, not on the floor.
  assert.deepEqual(floorClampedPos({ pos: 0, floor: G, dropBelow: 30 }), { pos: G + 30, clamped: true });
  assert.deepEqual(floorClampedPos({ pos: 60, floor: G, dropBelow: 30 }), { pos: 60, clamped: false });
  assert.deepEqual(floorClampedPos({ pos: 40, floor: G, dropBelow: 30 }), { pos: 48, clamped: true });
});

test('floorClampedPos: nobody said where is NOT the floor — the Number(null) trap', () => {
  assert.deepEqual(floorClampedPos({ pos: null, floor: G }), { pos: null, clamped: false });
  assert.deepEqual(floorClampedPos({ pos: undefined, floor: G }), { pos: undefined, clamped: false });
});

test('the floor IS the bottom board\'s top face — the engine\'s own answer', () => {
  assert.equal(interiorFloor(G), G);
  const result = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01' }, P);
  const bottom = result.panels.find((p) => p.part === 'BOTTOM');
  assert.equal(bottom.box.y + bottom.box.h, interiorFloor(G),
    'the number the law clamps to is the face the board actually presents');
});

// ─── THE RECORD SAYS SO ─────────────────────────────────────────────────────

test('an element the law catches says so: meta.floorClamped', () => {
  const caught = floorLawedItem({ id: 'x', kind: 'shelf', pos_mm: 0 }, { floor: G });
  assert.equal(caught.pos_mm, G);
  assert.equal(caught.meta.floorClamped, true);
});

test('an element the law does NOT catch is handed back the very object', () => {
  const legal = { id: 'x', kind: 'shelf', pos_mm: 900 };
  assert.equal(floorLawedItem(legal, { floor: G }), legal,
    'identity, not an equal copy — nothing legal is rewritten to carry a false flag');
  assert.equal(legal.meta, undefined, 'and no floorClamped: false nobody asked for');
});

test('the ONE exception says so out loud, and the DEFAULT catches the rest', () => {
  // A rail's number is a height above the nearest thing UNDER it (T35 F1), not
  // above the carcass floor, so the law has nothing to say to it.
  assert.equal(posDatumOf({ kind: 'hanger' }), 'support');
  const rod = { id: 'r', kind: 'hanger', pos_mm: 0 };
  assert.equal(floorLawedItem(rod, { floor: G }), rod);
  // Everything else — including a kind invented after this was written — is on
  // the carcass datum by DEFAULT and is therefore caught.
  for (const kind of ['shelf', 'shoe_box', 'partition', 'drawer', 'a-kind-nobody-has-invented-yet']) {
    assert.equal(posDatumOf({ kind }), 'carcass', `${kind} is on the carcass datum`);
    assert.equal(floorLawedItem({ kind, pos_mm: 0 }, { floor: G }).pos_mm, G);
  }
});

// ─── THE OWNER'S TWO PIECES, THROUGH THE STORE ──────────────────────────────

test('a SHOE SHELF asked for at y = 0 lands ON the floor, not in it', () => {
  const id = wardrobe();
  const itemId = store().addItem(id, { kind: 'shelf', variant: 'shoe', pos_mm: 0 });
  const item = itemOf(id, itemId);
  assert.ok(item.pos_mm >= G, `the shelf's underside is at ${item.pos_mm}, on or above ${G}`);
  const result = store().unitResult(id);
  for (const p of elementPanels(result)) {
    assert.ok(p.box.y >= G - 1e-6, `${p.id} stands at ${p.box.y}, on or above the floor`);
  }
});

test('a SHOE BOX asked for at y = 0 lands ON the floor — all seven boards', () => {
  const id = wardrobe();
  const itemId = store().addShoeBox(id, { variant: 'F', dividers: 1, pos_mm: 0 });
  assert.ok(itemOf(id, itemId).pos_mm >= G);
  assert.equal(itemOf(id, itemId).meta.floorClamped, true, 'and the record says the law caught it');
  const result = store().unitResult(id);
  const boards = result.panels.filter((p) => p.box && String(p.part).startsWith('SHOEBOX'));
  assert.ok(boards.length >= 5, 'the shoe box is actually cut');
  for (const p of boards) {
    assert.ok(p.box.y >= G - 1e-6, `${p.id} stands at ${p.box.y}, on or above the floor`);
  }
});

test('the DRAWER variant of the shoe box obeys the same one law', () => {
  const id = wardrobe();
  const itemId = store().addShoeBox(id, { variant: 'D', dividers: 1, pos_mm: 0 });
  assert.ok(itemOf(id, itemId).pos_mm >= G);
  const result = store().unitResult(id);
  for (const p of result.panels.filter((x) => x.box && String(x.part).startsWith('SHOEBOX'))) {
    assert.ok(p.box.y >= G - 1e-6, `${p.id} stands at ${p.box.y}`);
  }
});

test('…and EDITING one back down to zero is refused the same way', () => {
  const id = wardrobe();
  const itemId = store().addShoeBox(id, { variant: 'F', dividers: 1, pos_mm: 600 });
  assert.equal(itemOf(id, itemId).pos_mm, 600);
  assert.equal(itemOf(id, itemId).meta, undefined, 'placed legally, so nothing was stated');
  store().setShoeBox(id, itemId, { pos_mm: 0 });
  assert.ok(itemOf(id, itemId).pos_mm >= G, 'a typed number is clamped exactly as a placement is');
  assert.equal(itemOf(id, itemId).meta.floorClamped, true);
});

test('an element placed legally is not moved by the law', () => {
  const id = wardrobe();
  const itemId = store().addShoeBox(id, { variant: 'F', dividers: 1, pos_mm: 900 });
  assert.equal(itemOf(id, itemId).pos_mm, 900);
  assert.equal(itemOf(id, itemId).meta, undefined);
});

test('NOTHING an ordinary wardrobe cuts stands below its own floor', () => {
  const id = wardrobe();
  store().addShelves(id, 3);
  store().addShoeBox(id, { variant: 'F', dividers: 1, pos_mm: 0 });
  store().addItem(id, { kind: 'shelf', variant: 'shoe', pos_mm: 0 });
  const result = store().unitResult(id);
  const below = elementPanels(result).filter((p) => p.box.y < G - 1e-6).map((p) => p.id);
  assert.deepEqual(below, [], 'every element of a loaded wardrobe is on or above the floor');
});

// ─── AND THE SIX DO NOT MOVE (iron rule 2) ──────────────────────────────────

test('the law never reaches computeCabinet — the six goldens are untouched', () => {
  // A golden is `defaultParamsFor()` handed straight to the engine: no store,
  // no items, no placement station. The proof that matters is `t48-classify`;
  // this is the same claim held where a suite run can see it.
  for (const cfg of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const params = { ...defaultParamsFor(cfg, P), unit_num: '01' };
    assert.equal(params.sections, undefined, `${cfg} states no items for the law to catch`);
    const result = computeCabinet(params, P);
    assert.ok(result.panels.length > 0);
  }
});
