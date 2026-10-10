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
  // ─── TURN 36 (CLAUDE.md F7): THE WARDROBE CATEGORY GAINS A SECOND KIT ────
  // "library offers Main wardrobe + Top box." The owner's reason: *"wysokie
  // szafy nie wejdą do domu"* — a 2600 wardrobe cannot be carried up a
  // staircase, so it is built as two. Nothing else in the list moved.
  // AMENDED BY T74 F7: *"ADD WALL UNIT ... Osobny typ"*: the wardrobe's own
  // wall unit joins the category, a third kit; the first two did not move.
  // AMENDED BY T75 F3: + the blind corner wardrobe (*"the Wardrobes category "Blind corner wardrobe""*).
  // AMENDED BY T75 F16: + the chest of drawers, its three counts (*"Wardrobes category"*), read off
  // the category's entries (the drawer group, as Kitchen's is).
  // AMENDED BY T75 F17: + the floating desk (*"`WARDROBE_DESK`: a wall-hung carcass"*).
  // AMENDED BY T75 F18: + the low unit (*"`WARDROBE_LOW` copied from `LOW_CABINET`"*).
  assert.deepEqual(getCategory('wardrobe').types, ['WARDROBE', 'WARDROBE_TOP', 'WARDROBE_WALL', 'BLIND_WARDROBE', 'CORNER_L_WARDROBE', 'WARDROBE_CHEST2', 'WARDROBE_CHEST3', 'WARDROBE_CHEST4', 'WARDROBE_DESK', 'WARDROBE_LOW'] /* AMENDED BY T75 F4: + the Corner L wardrobe */);
  // Turn 15 (CLAUDE.md F5.2): the same nine kits, in the order the owner's
  // CATALOGUE puts them in — base units, then talls, then walls.
  assert.deepEqual(getCategory('kitchen').types, [
    // Turn 17 (CLAUDE.md F9/F10): two of the held-open rows OPEN — the owner
    // wrote the pattern for both, which is exactly the condition they carried.
    // Turn 30 (CLAUDE.md F13): CARGO — KIT_BUDTALL's carcass at 300 wide.
    // Turn 31 (CLAUDE.md F9): WUD_HOOD — the KIT_WUD envelope with its bottom
    // open, standing beside the two wall units it is one of.
    // T75 F3: the blind corner (base) and the blind corner wall unit.
    // AMENDED BY T75 F4: T30's L_SHAPE is deleted; the true L's base kit takes its place and its wall kit follows the blind wall unit.
    // AMENDED BY T75 F12: the appliance towers, *"Fridge freezer"* and *"Washer + dryer"*.
    // AMENDED BY T75 F13: BUD_INT, *"Drawers behind doors"*.
    // AMENDED BY T75 F14: the hob drawer units, 2x and 3x.
    'BUD', 'BUDR2', 'BUDR', 'BUDR4', 'BUDR2_HOB', 'BUDR_HOB', 'BUD_INT', 'SINK', 'CORNER_L_BASE', 'BLIND_BASE', 'DW_PANEL', 'OVEN_BASE', 'BIN', 'WINE', 'TWIN', 'LOW_CABINET', 'BUDTALL', 'FRIDGE', 'CARGO', 'PANTRY', 'APPLIANCE_TALL', 'APPLIANCE_TALL2', 'FRIDGE_US', 'WUD', 'WUD_GLASS', 'WUD_HOOD', 'BLIND_WALL', 'CORNER_L_WALL',
    // T74 F13 · the Extras row held open since turn 12 opens: the free panel.
    'FREE_PANEL',
  ]);
  // T36 F7: Main wardrobe + Top box. T74 F7: + the wardrobe's wall unit.
  // AMENDED BY T75 F3: + the blind corner wardrobe (*"the Wardrobes category "Blind corner wardrobe""*).
  // AMENDED BY T75 F16: + the chest of drawers, its three counts (*"Wardrobes category"*), read off
  // the category's entries (the drawer group, as Kitchen's is).
  // AMENDED BY T75 F17: + the floating desk (*"`WARDROBE_DESK`: a wall-hung carcass"*).
  // AMENDED BY T75 F18: + the low unit (*"`WARDROBE_LOW` copied from `LOW_CABINET`"*).
  assert.deepEqual(getCategory('wardrobe').types, ['WARDROBE', 'WARDROBE_TOP', 'WARDROBE_WALL', 'BLIND_WARDROBE', 'CORNER_L_WARDROBE', 'WARDROBE_CHEST2', 'WARDROBE_CHEST3', 'WARDROBE_CHEST4', 'WARDROBE_DESK', 'WARDROBE_LOW'] /* AMENDED BY T75 F4: + the Corner L wardrobe */);

  // Turn 5 (BACKLOG #30): Saved sets is real. It holds the workshop's OWN units
  // rather than kits, so it lists no types and is marked `saved` — the panel
  // reads its contents from the template store.
  assert.equal(getCategory('sets').saved, true);
  assert.equal(getCategory('sets').soon, undefined, 'no longer a place merely held open');
  assert.deepEqual(getCategory('sets').types, []);

  // Held open, not pretended: an empty category says "soon" and is not clickable.
  // AMENDED BY T75 F20: *"the Library's `media` category (`soon`) becomes the sets shelf
  // (saved sets and shipped sets on one list)"*: the `soon` flag is deleted, `sets` marks the shelf.
  assert.equal(getCategory('media').soon, undefined);
  assert.equal(getCategory('media').sets, true);
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
