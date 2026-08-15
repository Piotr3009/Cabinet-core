// ─── The library, restructured (turn 12, CLAUDE.md F3) ──────────────────────
//
// The owner's list, in his order, as DATA. What a node test can hold to account
// is exactly that: the ORDER, the group, which entries are held open and why,
// and — the part that matters to a cut list — that the two new drawer variants
// are the SAME kit with a different split rather than a second copy of it.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  KITCHEN_LIBRARY, flattenLibrary, groupCounts, libraryTypeIds, resolveEntry,
} from '../src/engine/library.js';

/** Every GROUP in the catalogue, nested ones included. */
function flattenGroups(entries = KITCHEN_LIBRARY) {
  const out = [];
  for (const e of entries) {
    if (e.kind !== 'group') continue;
    out.push(e, ...flattenGroups(e.items));
  }
  return out;
}
import {
  UNIT_CATEGORIES, UNIT_TYPES, UNIT_TYPE_ORDER, defaultParamsFor, getCategory,
} from '../src/engine/types.js';
import { budrFrontHeights, computeCabinet, drawerSplitFor } from '../src/engine/cabinet.js';
import { isSelectableElement } from '../src/engine/elements.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';

// ─── The owner's order ──────────────────────────────────────────────────────

test('the Kitchen list is the owner\'s catalogue, in the owner\'s groups', () => {
  // ─── Turn 15 (CLAUDE.md F5.2) ───
  // Turn 12's flat list of ten became the owner's FOUR groups, because that is
  // how he wrote the catalogue out and because thirty entries in one column is
  // not a list anybody reads.
  assert.deepEqual(KITCHEN_LIBRARY.map((e) => e.id), [
    'base-units', 'tall-units', 'wall-units', 'extras',
  ]);
  for (const g of KITCHEN_LIBRARY) assert.equal(g.kind, 'group');

  const idsOf = (groupId) => KITCHEN_LIBRARY.find((g) => g.id === groupId).items.map((e) => e.id);

  // Base: Standard · Sink · Corner · L-shape · DW · Oven · Bin storage ·
  // Wine rack · Small fridge · Twin space — plus the drawer group and the low
  // cabinet, both kits the workshop already builds.
  assert.deepEqual(idsOf('base-units'), [
    'door-base', 'drawer-unit', 'sink', 'corner', 'l-shape', 'dishwasher',
    'oven-base', 'bin-storage', 'wine-rack', 'small-fridge', 'twin-space',
    // Turn 30 (CLAUDE.md F18): the twin cupboard, beside the kits it is made of.
    'twin-cupboard', 'low',
  ]);
  // Turn 30 (CLAUDE.md F13/F14): Cargo 300 and the pantry land beside the kits
  // they are made of; the pantry's held-open row became a kit.
  assert.deepEqual(idsOf('tall-units'), [
    'tall', 'fridge', 'cargo-300', 'basket-tall', 'pantry', 'pantry-worktop',
    'space-tower', 'oven-tall', 'american-fridge',
  ]);
  assert.deepEqual(idsOf('wall-units'), ['wall', 'glass-unit', 'l-shape-wall']);
  // The new group (F5.2): not cabinets — the pieces that finish a run.
  assert.deepEqual(idsOf('extras'), ['free-standing-panels', 'cornice-pelmet']);
});

test('everything that worked before turn 15 is still wired to its kit', () => {
  // CLAUDE.md F5.2, in as many words: "Everything that works today stays wired
  // (Base, Sink, Drawer 2×/3×/4×, Tall, Fridge, Wall, Low cabinet)."
  assert.deepEqual(libraryTypeIds(), [
    // Turn 17 (CLAUDE.md F9/F10): two of the held-open rows OPEN — the owner
    // wrote the pattern for both, which is exactly the condition they carried.
    // Turn 30 (CLAUDE.md F13): CARGO — KIT_BUDTALL's carcass at 300 wide.
    'BUD', 'BUDR2', 'BUDR', 'BUDR4', 'SINK', 'DW_PANEL', 'OVEN_BASE', 'BIN', 'WINE', 'TWIN', 'LOW_CABINET', 'BUDTALL', 'FRIDGE', 'CARGO', 'PANTRY', 'FRIDGE_US', 'WUD',
  ]);
});

test('a group says how much of it can be placed today', () => {
  // A long list that is mostly held open has to be honest about it before it is
  // opened — "1/3" on Wall units beats three grey rows discovered afterwards.
  const wall = KITCHEN_LIBRARY.find((g) => g.id === 'wall-units');
  assert.deepEqual(groupCounts(wall, P), { total: 3, enabled: 1 });
  const extras = KITCHEN_LIBRARY.find((g) => g.id === 'extras');
  assert.deepEqual(groupCounts(extras, P), { total: 2, enabled: 0 });
});

test('the drawer unit is ONE expandable entry with four splits behind it', () => {
  const group = flattenGroups().find((e) => e.id === 'drawer-unit');
  assert.equal(group.kind, 'group');
  assert.deepEqual(group.items.map((i) => i.variant), ['x1', 'x2', 'x3', 'x4']);
  assert.deepEqual(
    group.items.map((i) => i.typeId),
    [null, 'BUDR2', 'BUDR', 'BUDR4'],
    '1× has no kit behind it yet; the other three do',
  );
});

test('every entry that can be placed names a type that exists', () => {
  for (const e of flattenLibrary()) {
    if (e.kind !== 'type' || !e.typeId) continue;
    assert.ok(UNIT_TYPES[e.typeId], `${e.id} names unknown type ${e.typeId}`);
    assert.ok(UNIT_TYPE_ORDER.includes(e.typeId), `${e.typeId} is not in UNIT_TYPE_ORDER`);
  }
});

test('the Kitchen category carries the list, and the others are untouched', () => {
  assert.deepEqual(getCategory('kitchen').entries, KITCHEN_LIBRARY);
  assert.deepEqual(getCategory('kitchen').types, libraryTypeIds());
  // CLAUDE.md F3.7: "Categories beyond Kitchen stay as today — do not touch."
  assert.equal(getCategory('sets').saved, true);
  assert.equal(getCategory('media').soon, true);
  assert.deepEqual(getCategory('wardrobe').types, ['WARDROBE']);
  // Nothing was lost in the restructure: every kit is still reachable.
  const reachable = new Set(UNIT_CATEGORIES.flatMap((c) => c.types));
  for (const id of UNIT_TYPE_ORDER) assert.ok(reachable.has(id), `${id} is in no category`);
});

// ─── Held open, with the reason attached ────────────────────────────────────

test('every held-open entry is PRESENT, disabled, and says why', () => {
  // The pattern-first rule, applied to the whole of turn 15's catalogue rather
  // than to the three entries turn 12 held open. A grey row that does not say
  // why is a row a workshop asks about twice.
  const soon = flattenLibrary().filter((e) => e.kind === 'soon');
  assert.deepEqual(soon.map((e) => e.id), [
    // Turn 17 (CLAUDE.md F9/F10): 'dishwasher' and 'oven-base' left this list.
    // The owner wrote the pattern for both, which is the condition the reason
    // attached to them stated — so they are kits now, not grey rows.
    // Turn 30 (CLAUDE.md F16): 'bin-storage' left this list — KIT_BUD's own
    // carcass, with the pull-out ordered rather than cut.
    // Turn 30 (CLAUDE.md F17): 'wine-rack' left it too — KIT_BUD's carcass
    // with a lattice of plain boards, and the joints named as the gap.
    'corner', 'l-shape',
    'small-fridge', 'twin-space',
    // Turn 30 (CLAUDE.md F14): 'pantry' left this list — KIT_BUDTALL's carcass
    // with the wardrobe kit's own internal drawer machinery in it.
    // Turn 30 (CLAUDE.md F15): 'american-fridge' left it too — KIT_FRIDGE.lsp
    // exists and is the truth, so an american size is a wider envelope.
    'basket-tall', 'pantry-worktop', 'space-tower', 'oven-tall',
    'glass-unit', 'l-shape-wall',
    'free-standing-panels', 'cornice-pelmet',
  ]);
  for (const entry of soon) {
    const state = resolveEntry(entry, P);
    assert.equal(state.enabled, false, `${entry.id} must not be clickable`);
    assert.ok(state.reason && state.reason.length > 20, `${entry.id} must say WHY, honestly`);
    assert.ok(state.hint, `${entry.id} must say what it will be`);
  }
});

test('the 1× drawerline is held open for the reason CLAUDE.md gives', () => {
  const group = flattenGroups().find((e) => e.id === 'drawer-unit');
  const one = group.items.find((i) => i.variant === 'x1');
  const state = resolveEntry(one, P);
  assert.equal(state.enabled, false);
  assert.match(state.reason, /partial-height door/);
  // …and there is no half-built kit behind it either.
  assert.equal(one.typeId, null);
  assert.equal(UNIT_TYPES.BUDR1, undefined);
});

test('everything else in the list is clickable', () => {
  for (const e of flattenLibrary()) {
    if (e.kind === 'soon' || e.id === 'drawer-1') continue;
    assert.equal(resolveEntry(e, P).enabled, true, `${e.id} should be placeable`);
  }
});

// ─── The variants are the same kit, split differently ───────────────────────

test('a drawer variant is a RATIO and nothing else', () => {
  assert.deepEqual(drawerSplitFor(UNIT_TYPES.BUDR, P).ratio, [4, 3, 2]);
  assert.deepEqual(drawerSplitFor(UNIT_TYPES.BUDR2, P).ratio, [1, 1]);
  assert.deepEqual(drawerSplitFor(UNIT_TYPES.BUDR4, P).ratio, [1, 1, 1, 1]);
  // Everything else about the three types is the same kit.
  const ignore = new Set(['id', 'label', 'drawerVariant']);
  for (const key of Object.keys(UNIT_TYPES.BUDR)) {
    if (ignore.has(key)) continue;
    assert.deepEqual(UNIT_TYPES.BUDR2[key], UNIT_TYPES.BUDR[key], `BUDR2.${key} drifted from BUDR`);
    assert.deepEqual(UNIT_TYPES.BUDR4[key], UNIT_TYPES.BUDR[key], `BUDR4.${key} drifted from BUDR`);
  }
  assert.equal(UNIT_TYPES.BUDR2.lisp, 'KIT_BUDR_FULL.lsp');
});

test('the stack fills the carcass exactly, whatever the count', () => {
  // The kit's own invariant (fixtures/golden-budr.json: "stack top = H − 3"),
  // which is the same statement as sum(fronts) === H − count × gap. Four equal
  // fronts over an odd height is where the plain formula loses it.
  for (const height of [700, 720, 745, 770, 771, 800, 900]) {
    for (const ratio of [[4, 3, 2], [1, 1], [1, 1, 1, 1], [3, 2], [5, 4, 3, 2]]) {
      const hs = budrFrontHeights(height, P, ratio, true);
      assert.equal(hs.length, ratio.length);
      assert.equal(
        hs.reduce((s, h) => s + h, 0),
        height - ratio.length * P.baseDrawerUnit.gap,
        `H=${height} ratio=${ratio} left the stack proud or short`,
      );
      for (const h of hs) assert.ok(h > 0, `H=${height} ratio=${ratio} produced a front of ${h}`);
    }
  }
});

test('the kit\'s own 4:3:2 is untouched, at EVERY height (rule 7)', () => {
  // Rule 7 is absolute: the CNC export is byte-identical for everything that
  // exists today. The 3× variant is therefore `exact: false` — it keeps the
  // kit's plain per-front rounding, drift and all (BLOCKERS #64), and this walks
  // four hundred heights to prove that adding two variants moved none of them.
  const B = P.baseDrawerUnit;
  for (let h = 600; h <= 1000; h += 1) {
    const split = drawerSplitFor(UNIT_TYPES.BUDR, P);
    const engine = budrFrontHeights(h, P, split.ratio, split.exact);
    const plain = B.ratio.map((r) => Math.trunc(((h - 3 * B.gap) * r) / 9 + 0.5));
    assert.deepEqual(engine, plain, `H=${h}: the 3× split moved, and it must not`);
    // …and the legacy two-argument call, which is what everything before turn
    // 12 used, still answers exactly the same.
    assert.deepEqual(budrFrontHeights(h, P), plain);
  }
  assert.equal(drawerSplitFor(UNIT_TYPES.BUDR, P).exact, false);
  assert.equal(drawerSplitFor(UNIT_TYPES.BUDR2, P).exact, true);
  assert.equal(drawerSplitFor(UNIT_TYPES.BUDR4, P).exact, true);
});

test('a 2× and a 4× unit are real cabinets with real cut lists', () => {
  for (const [id, count] of [['BUDR2', 2], ['BUDR4', 4]]) {
    const r = computeCabinet(defaultParamsFor(id, P), P);
    assert.equal(r.derived.front_heights.length, count);
    assert.equal(r.derived.runner_pairs ?? r.summary?.runner_pairs ?? count, count);
    // 5 carcass panels + 5 parts per drawer + one front each.
    assert.equal(r.panels.length, 5 + 5 * count + count);
    assert.equal(r.csvLines.length, r.panels.length, 'one CSV row per piece');
    for (const p of r.panels) assert.ok(p.w > 0 && p.h > 0, `${id} ${p.id} has a zero dimension`);
    // No doors: the fronts ARE the face, exactly as in the kit.
    assert.equal(r.derived.doors, 0);
  }
});

test('the variants live in the profile, and a stored profile cannot hide them', () => {
  const ids = P.baseDrawerUnit.variants.map((v) => v.id);
  assert.deepEqual(ids, ['x1', 'x2', 'x3', 'x4']);
  // A profile saved before turn 12 has no variants at all…
  const old = migrateCabinetProfile({ ...P, baseDrawerUnit: { ...P.baseDrawerUnit, variants: undefined } });
  assert.deepEqual(old.baseDrawerUnit.variants.map((v) => v.id), ids);
  // …and one that knows only some of them still sees the rest.
  const partial = migrateCabinetProfile({
    ...P,
    baseDrawerUnit: { ...P.baseDrawerUnit, variants: [{ id: 'x3', label: 'three' }] },
  });
  assert.deepEqual(partial.baseDrawerUnit.variants.map((v) => v.id).sort(), [...ids].sort());
  assert.equal(partial.baseDrawerUnit.variants.find((v) => v.id === 'x3').label, 'three');
  assert.deepEqual(partial.baseDrawerUnit.variants.find((v) => v.id === 'x3').ratio, [4, 3, 2]);
});

// ─── F3.8: every unit type has pieces a double click can open ───────────────

test('every unit type has selectable pieces — the edit modal opens on any of them', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const r = computeCabinet(defaultParamsFor(id, P), P);
    const selectable = r.panels.filter(isSelectableElement);
    assert.ok(selectable.length > 0, `${id} has no piece a double click could open`);
    // …and every one of them carries the box the modal is placed beside.
    for (const p of selectable) assert.ok(p.box, `${id} ${p.id} is selectable with no box`);
  }
});
