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
  // AMENDED BY T82 F2: *"`HAWA_POCKET` (kitchen and wardrobe families, library row "HAWA pocket (Concepta III)""* (CLAUDE.md T82 F2).
  // The one kit in TWO homes by the owner's own order: the HAWA pocket, which a
  // kitchen job and a wardrobe job both take. Its two homes are named here, so a
  // third (or a second for anything else) is still the lie this test catches;
  // `categoryOf` answers the first, the Kitchen.
  // AMENDED BY T82 F9: *"new library group "Bathroom" in the Kitchen library and in the wardrobe library"* (CLAUDE.md T82 F9).
  // And the vanity, a bathroom piece a kitchen job and a wardrobe job both take, in its
  // two homes the same way (one map: every kit with two homes is named in it).
  // AMENDED BY T-CC1b F4.2: the vanity and the mirror cabinet leave Kitchen and Wardrobes for the
  // Bathroom family, ONE home each, *"Add po lewej dobre, ale uporzadkowac: lazienki w kuchniach itd."*; *"wszystkie rodzaje po lewej, czesc coming soon"* (the owner, 01.11.2026); `categoryOf` answers 'bathroom' for them.
  const TWO_HOMES = {
    HAWA_POCKET: ['kitchen', 'wardrobe'],
  };
  for (const id of UNIT_TYPE_ORDER) {
    const homes = UNIT_CATEGORIES.filter((c) => c.types.includes(id));
    if (TWO_HOMES[id]) {
      assert.deepEqual(homes.map((c) => c.id), TWO_HOMES[id], `${id} is in ${homes.map((c) => c.id).join(', ')}`);
      assert.equal(categoryOf(id).id, homes[0].id);
      continue;
    }
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
  // AMENDED BY T-CC1b F4.2, in the owner's order: Kitchen, Wardrobes, Bathroom, Sets, Saved sets, then
  // the three families held open, *"Add po lewej dobre, ale uporzadkowac: lazienki w kuchniach itd."*; *"wszystkie rodzaje po lewej, czesc coming soon"* (the owner, 01.11.2026).
  assert.deepEqual(UNIT_CATEGORIES.map((c) => c.id), ['kitchen', 'wardrobe', 'bathroom', 'media', 'sets', 'media_wall', 'hallway', 'office']);
  assert.deepEqual(UNIT_CATEGORIES.map((c) => c.label), ['Kitchen', 'Wardrobes', 'Bathroom', 'Sets', 'Saved sets', 'Media wall', 'Hallway', 'Office']);
  assert.deepEqual(getCategory('bathroom').types, ['VANITY2', 'VANITY3', 'VANITY4', 'MIRROR_CABINET']);
  for (const id of ['VANITY2', 'VANITY3', 'VANITY4', 'MIRROR_CABINET']) assert.equal(categoryOf(id).id, 'bathroom');
  // A `soon` category has no types BY DESIGN: it is a greyed rail row with its reason, opening nothing.
  for (const id of ['media_wall', 'hallway', 'office']) {
    const c = getCategory(id);
    assert.equal(c.soon, true, `${id} is held open`);
    assert.equal(c.reason, 'Coming soon');
    assert.deepEqual(c.types, [], `${id} has no types by design`);
  }
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
  // AMENDED BY T82 F2: + the HAWA pocket, *"`HAWA_POCKET` (kitchen and wardrobe families, library row "HAWA pocket (Concepta III)""* (CLAUDE.md T82 F2).
  // AMENDED BY T82 F9: + the Bathroom group's three vanity units, *"new library group "Bathroom" in the Kitchen library and in the wardrobe library"* (CLAUDE.md T82 F9).
  // AMENDED BY T83 F5: + the Bathroom group's mirror cabinet, *"`MIRROR_CABINET`, family bathroom, library group Bathroom (beside the vanity), row "Mirror cabinet""* (CLAUDE.md T83 F2); *"Library rows in PRO's Kitchen and Wardrobe libraries under Bathroom"* (CLAUDE.md T83 F5).
  assert.deepEqual(getCategory('wardrobe').types, ['WARDROBE', 'WARDROBE_TOP', 'WARDROBE_WALL', 'BLIND_WARDROBE', 'CORNER_L_WARDROBE', 'WARDROBE_CHEST2', 'WARDROBE_CHEST3', 'WARDROBE_CHEST4', 'WARDROBE_DESK', 'WARDROBE_LOW', 'HAWA_POCKET'] /* AMENDED BY T-CC1b F4.2: the Bathroom's four left for their own family */ /* AMENDED BY T75 F4: + the Corner L wardrobe */);
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
    // AMENDED BY T78 F17: the canopy hood and the short hood, beside the hood unit.
    // AMENDED BY T82 F2: the HAWA pocket in Tall units, after Standard (*"`HAWA_POCKET` (kitchen and wardrobe families, library row "HAWA pocket (Concepta III)""* (CLAUDE.md T82 F2)).
    'BUD', 'BUDR2', 'BUDR', 'BUDR4', 'BUDR2_HOB', 'BUDR_HOB', 'BUD_INT', 'SINK', 'CORNER_L_BASE', 'BLIND_BASE', 'DW_PANEL', 'OVEN_BASE', 'BIN', 'WINE', 'TWIN', 'LOW_CABINET', 'BUDTALL', 'HAWA_POCKET', 'FRIDGE', 'CARGO', 'PANTRY', 'APPLIANCE_TALL', 'APPLIANCE_TALL2', 'FRIDGE_US', 'WUD', 'WUD_GLASS', 'WUD_HOOD', 'WUD_HOOD_CANOPY', 'WUD_HOOD_SHORT', 'BLIND_WALL', 'CORNER_L_WALL',
    // AMENDED BY T-CC1b F4.2: the Bathroom's four (T82 F9, T83 F5) left for their own family.
    // T74 F13 · the Extras row held open since turn 12 opens: the free panel.
    'FREE_PANEL',
  ]);
  // T36 F7: Main wardrobe + Top box. T74 F7: + the wardrobe's wall unit.
  // AMENDED BY T75 F3: + the blind corner wardrobe (*"the Wardrobes category "Blind corner wardrobe""*).
  // AMENDED BY T75 F16: + the chest of drawers, its three counts (*"Wardrobes category"*), read off
  // the category's entries (the drawer group, as Kitchen's is).
  // AMENDED BY T75 F17: + the floating desk (*"`WARDROBE_DESK`: a wall-hung carcass"*).
  // AMENDED BY T75 F18: + the low unit (*"`WARDROBE_LOW` copied from `LOW_CABINET`"*).
  // AMENDED BY T82 F2: + the HAWA pocket, *"`HAWA_POCKET` (kitchen and wardrobe families, library row "HAWA pocket (Concepta III)""* (CLAUDE.md T82 F2).
  // AMENDED BY T82 F9: + the Bathroom group's three vanity units, *"new library group "Bathroom" in the Kitchen library and in the wardrobe library"* (CLAUDE.md T82 F9).
  // AMENDED BY T83 F5: + the Bathroom group's mirror cabinet, *"`MIRROR_CABINET`, family bathroom, library group Bathroom (beside the vanity), row "Mirror cabinet""* (CLAUDE.md T83 F2); *"Library rows in PRO's Kitchen and Wardrobe libraries under Bathroom"* (CLAUDE.md T83 F5).
  assert.deepEqual(getCategory('wardrobe').types, ['WARDROBE', 'WARDROBE_TOP', 'WARDROBE_WALL', 'BLIND_WARDROBE', 'CORNER_L_WARDROBE', 'WARDROBE_CHEST2', 'WARDROBE_CHEST3', 'WARDROBE_CHEST4', 'WARDROBE_DESK', 'WARDROBE_LOW', 'HAWA_POCKET'] /* AMENDED BY T-CC1b F4.2: the Bathroom's four left for their own family */ /* AMENDED BY T75 F4: + the Corner L wardrobe */);

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
  for (const id of ['kitchen', 'wardrobe', 'bathroom']) {
    assert.equal(getCategory(id).soon, undefined);
    assert.equal(getCategory(id).saved, undefined);
  }
});

test('an unknown category id is null, not a crash and not a full list', () => {
  assert.equal(getCategory('nope'), null);
  assert.equal(getCategory(null), null);
  assert.equal(categoryOf('NOT_A_TYPE'), null);
});
