// ─── The Library, grouped (BACKLOG #9) ───
//
// The menu offers a CATEGORY and the category opens a panel holding just those
// types. The test that earns its keep: every type belongs to exactly one
// category. A kit that is in no category cannot be inserted at all, and a kit
// in two categories is a menu that lies about what it contains — both are
// silent, and both are one forgotten line in a config.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UNIT_CATEGORIES, UNIT_TYPES, UNIT_TYPE_ORDER, categoryOf, getCategory,
} from '../src/engine/types.js';

test('every unit type is reachable from exactly one category', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const homes = UNIT_CATEGORIES.filter((c) => c.types.includes(id));
    assert.equal(homes.length, 1, `${id} is in ${homes.length} categories: ${homes.map((c) => c.id).join(', ')}`);
    assert.equal(categoryOf(id).id, homes[0].id);
  }
  // …and no category lists a type that does not exist.
  for (const c of UNIT_CATEGORIES) {
    for (const id of c.types) {
      assert.ok(UNIT_TYPES[id], `category ${c.id} lists unknown type ${id}`);
    }
  }
});

test('the categories are the ones CLAUDE.md asks for, with the two placeholders', () => {
  // ─── Turn 12 (CLAUDE.md F3) ───
  // Base / wall / tall were three menus for one family, so placing a run of
  // kitchen furniture meant opening three of them. They are ONE list now, in
  // the owner's order, and the categories beyond Kitchen are untouched — F3.7
  // says so outright.
  assert.deepEqual(UNIT_CATEGORIES.map((c) => c.id), ['kitchen', 'wardrobe', 'sets', 'media']);
  // Turn 15 (CLAUDE.md F5.2): the same nine kits, in the order the owner's
  // CATALOGUE puts them in — base units, then talls, then walls.
  assert.deepEqual(getCategory('kitchen').types, [
    // Turn 17 (CLAUDE.md F9/F10): two of the held-open rows OPEN — the owner
    // wrote the pattern for both, which is exactly the condition they carried.
    // Turn 30 (CLAUDE.md F13): CARGO — KIT_BUDTALL's carcass at 300 wide.
    'BUD', 'BUDR2', 'BUDR', 'BUDR4', 'SINK', 'DW_PANEL', 'OVEN_BASE', 'BIN', 'WINE', 'LOW_CABINET', 'BUDTALL', 'FRIDGE', 'CARGO', 'PANTRY', 'FRIDGE_US', 'WUD',
  ]);
  assert.deepEqual(getCategory('wardrobe').types, ['WARDROBE']);

  // Turn 5 (BACKLOG #30): Saved sets is real. It holds the workshop's OWN units
  // rather than kits, so it lists no types and is marked `saved` — the panel
  // reads its contents from the template store.
  assert.equal(getCategory('sets').saved, true);
  assert.equal(getCategory('sets').soon, undefined, 'no longer a place merely held open');
  assert.deepEqual(getCategory('sets').types, []);

  // Held open, not pretended: an empty category says "soon" and is not clickable.
  assert.equal(getCategory('media').soon, true);
  assert.deepEqual(getCategory('media').types, []);
  for (const id of ['kitchen', 'wardrobe']) {
    assert.equal(getCategory(id).soon, undefined);
    assert.equal(getCategory(id).saved, undefined);
  }
});

test('an unknown category id is null, not a crash and not a full list', () => {
  assert.equal(getCategory('nope'), null);
  assert.equal(getCategory(null), null);
  assert.equal(categoryOf('NOT_A_TYPE'), null);
});
