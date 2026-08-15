// ─── Turn 33, CLAUDE.md F3: the wardrobe's interior accessories ─────────────
//
// The standing doctrine, held by test: what we CUT (the shoe shelf and its
// stop rail) and what we BUY (the inserts, the glass, the three mechanisms).
// The iron rules alongside: ZERO new holes anywhere in this feature, and a
// bare computeCabinet() untouched — every accessory arrives as an item on the
// override channel.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  computeCabinet, DRAWER_VARIANTS, drawerVariantOf, WARDROBE_KIT_KINDS,
} from '../src/engine/cabinet.js';
import { SHELF_TYPES, shelfBuild, shelfTypeOf } from '../src/engine/shelfTypes.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { wardrobeKitInstances } from '../src/engine/hardware3d.js';

const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 't33-f3',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design: { projectType: 'wardrobe' },
  }, []);
}

function wardrobe(width = 1200) {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width, doors: false });
  return id;
}

const BARE = {
  type: 'WARDROBE', width: 1200, height: 2200, depth: 568, unit_num: '01',
};

// ─── the shoe shelf: CUT, tilted in the picture, drilled as ever ────────────

test('the shoe shelf is a shelf KIND — pinned, enabled, the owner’s way', () => {
  const entry = SHELF_TYPES.find((t) => t.id === 'shoe');
  assert.ok(entry?.enabled, 'the shoe shelf may be chosen');
  assert.equal(shelfTypeOf({ variant: 'shoe' }), 'shoe');
  assert.deepEqual(shelfBuild({ variant: 'shoe' }), { kind: 'pinned', blocked: null },
    'a shoe shelf is a PINNED shelf as far as any hole is concerned');
});

test('a shoe shelf cuts TWO rectangles — the board and its stop rail — and moves no hole', () => {
  const id = wardrobe();
  store().addShelves(id, 1, null, 'shoe');
  const result = store().unitResult(id);
  const shelf = result.panels.find((p) => p.part === 'SHELF');
  const rail = result.panels.find((p) => p.part === 'SHOE-RAIL');
  assert.ok(shelf, 'the board is cut');
  assert.ok(rail, 'the stop rail is cut with it');
  assert.equal(shelf.meta.variant, 'shoe');
  assert.equal(shelf.meta.tilt_deg, P.wardrobeAccessories.shoeShelf.tiltDeg, 'the 15° is the profile’s');
  assert.ok(shelf.meta.tilt_pivot, 'the 3D leans it about a named edge');
  assert.equal(rail.h, P.wardrobeAccessories.shoeShelf.stopRail.height);
  assert.equal(rail.w, shelf.w, 'the rail runs the shelf’s own width');
  assert.equal(rail.meta.tilt_deg, shelf.meta.tilt_deg, 'the pair leans together');

  // ZERO new holes: the same wardrobe with a plain adjustable shelf drills
  // exactly the same set — the shoe shelf rides the standard pin rows.
  const plainId = wardrobe();
  store().addShelves(plainId, 1, null, 'adjustable');
  const plain = store().unitResult(plainId);
  assert.equal(JSON.stringify(result.drills), JSON.stringify(plain.drills),
    'a shoe shelf drills exactly what an adjustable one drills');
  // …and the stop rail itself carries no drilling of its own.
  assert.ok(!result.drills.some((d) => d.panel === rail.id), 'the listwa ships undrilled (rule 3)');
});

// ─── drawer variants: the box is cut, the insert (and glass) is bought ──────

test('the drawer vocabulary is the owner’s three, and null is the plain box', () => {
  assert.deepEqual(DRAWER_VARIANTS, ['shoe', 'belt_tie', 'belt_tie_glass']);
  assert.equal(drawerVariantOf({ variant: 'shoe' }), 'shoe');
  assert.equal(drawerVariantOf({ variant: 'whatever' }), null);
  assert.equal(drawerVariantOf({}), null);
});

test('a belt/tie glass drawer orders its insert AND its glass; the box cuts unchanged', () => {
  const id = wardrobe();
  const res = store().addDrawers(id, 2, 'overlay', 200, null, 'belt_tie_glass');
  assert.equal(res.ok, true);
  const result = store().unitResult(id);

  const inserts = result.hardware.filter((h) => h.role === 'drawer_insert');
  const glass = result.hardware.filter((h) => h.role === 'drawer_glass');
  assert.equal(inserts.reduce((s, h) => s + h.qty, 0), 2, 'one insert per drawer');
  assert.equal(glass.reduce((s, h) => s + h.qty, 0), 2, 'one pane per display drawer');
  assert.match(glass[0].spec_label, /^Glass \d+ × \d+ mm$/, 'the glass is named W × D');
  assert.equal(result.assemblies.drawerGlass.length, 2, 'the panes are drawn');

  // The BOX PARTS are exactly a plain stack's — the variant buys, it never cuts.
  const plainId = wardrobe();
  store().addDrawers(plainId, 2, 'overlay', 200, null);
  const plain = store().unitResult(plainId);
  const boxParts = (r) => r.panels.filter((p) => p.role === 'drawer_box')
    .map((p) => `${p.id}|${p.w}|${p.h}`).join(',');
  assert.equal(boxParts(result), boxParts(plain), 'the cut boxes do not move');
});

test('a shoe drawer in a COLUMN orders its insert to the column’s own box', () => {
  const id = wardrobe(1400);
  store().addPartition(id);
  // T32's recessed-partition law stands: a fresh partition is born 20 mm back
  // (Q3 travels with the PR), so the setback is reset first — the same act
  // the guard's own [Reset the setback] button performs.
  store().setPartitionFront(id, 0);
  const res = store().addDrawers(id, 1, 'overlay', 180, 0, 'shoe');
  assert.equal(res.ok, true, res.error || '');
  const result = store().unitResult(id);
  const insert = result.hardware.find((h) => h.role === 'drawer_insert');
  assert.ok(insert, 'the column drawer orders its insert');
  assert.match(insert.spec_label, /^Shoe drawer insert · \d+ × \d+ mm$/);
  assert.ok(result.assemblies.columnDrawers.length >= 1, 'the stack stands in its column');
});

// ─── the bought mechanisms: named spec + placeholder, zero holes ────────────

test('a trouser pull-out in a column is a purchase line at the column’s opening — and NOT ONE hole', () => {
  const id = wardrobe(1400);
  store().addPartition(id);
  const before = store().unitResult(id);
  const kitId = store().addWardrobeKit(id, 'trouser', 0);
  assert.ok(kitId, 'the mechanism was placed');
  const after = store().unitResult(id);

  const line = after.hardware.find((h) => h.role === 'wardrobe_kit_trouser');
  assert.ok(line, 'the BOM buys it');
  assert.ok(line.spec.opening_width_mm > 0, 'ordered to the opening');
  assert.match(line.spec_label, /Trouser pull-out · \d+ mm opening/);

  assert.equal(JSON.stringify(after.drills), JSON.stringify(before.drills),
    'ZERO holes ride a bought mechanism (rule 3)');
  assert.equal(after.panels.length, before.panels.length, 'nothing new is cut');

  const bodies = after.assemblies.wardrobeKits;
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].kind, 'trouser');
  const instances = wardrobeKitInstances(after);
  assert.equal(instances.length, 1);
  assert.ok(instances[0].placeholder, 'the body is marked a placeholder');
  assert.ok(instances[0].w < bodies[0].box.w, 'inset — the room for one, not a product');
});

test('one mechanism per kind per column — a second is refused, another column is welcome', () => {
  const id = wardrobe(1400);
  store().addPartition(id);
  assert.ok(store().addWardrobeKit(id, 'tie_rack', 0));
  assert.equal(store().addWardrobeKit(id, 'tie_rack', 0), null, 'refused in the same column');
  assert.ok(store().addWardrobeKit(id, 'tie_rack', 1), 'welcome next door');
  assert.equal(store().addWardrobeKit(id, 'laser_rack', 0), null, 'an unknown kind is not an item');
  assert.deepEqual(WARDROBE_KIT_KINDS, ['trouser', 'tie_rack', 'pulldown_rail']);
});

test('the pull-down rail hangs from the top and the wardrobe now supports it', () => {
  const id = wardrobe();
  assert.ok(store().addWardrobeKit(id, 'pulldown_rail', null));
  const result = store().unitResult(id);
  const body = result.assemblies.wardrobeKits.find((k) => k.kind === 'pulldown_rail');
  const H = 2200;
  assert.ok(body.box.y > H / 2, 'it lives in the top half, where such a rail reaches from');
});

// ─── the suggestion: a grey hint above the owner's 2000 mm, never a block ───

test('railHeightsAboveFloor answers rail y + legs — the number the hint compares', () => {
  const id = wardrobe();
  store().addHangerRail(id, {});
  const heights = store().railHeightsAboveFloor(id);
  assert.equal(heights.length, 1);
  const result = store().unitResult(id);
  assert.equal(heights[0].mm, result.assemblies.rail.y + result.assemblies.carcass.legHeight);
  assert.equal(P.wardrobeAccessories.pulldownSuggestMm, 2000, 'the owner’s threshold, one profile line');
});

// ─── the bare engine does not move ──────────────────────────────────────────

test('a bare computeCabinet knows nothing of any of this', () => {
  const bare = computeCabinet(BARE, P);
  assert.ok(!bare.panels.some((p) => p.part === 'SHOE-RAIL'));
  assert.ok(!bare.hardware.some((h) => /drawer_insert|drawer_glass|wardrobe_kit/.test(h.role)));
  assert.deepEqual(bare.assemblies.wardrobeKits, [], 'no items, no bodies');
  assert.deepEqual(bare.assemblies.drawerGlass, [], 'no variants, no panes');
});
