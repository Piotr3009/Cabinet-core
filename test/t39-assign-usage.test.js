// ─── WHAT THE ASSIGN MATERIALS MODAL COUNTS (turn 39, CLAUDE.md F3) ─────────
//
// The owner asked for two things on this screen and both are arithmetic before
// they are pixels:
//
//   *"podkreślone nowe materiały nieprzypisane"* — the marking, and
//   *"a running counter in the header: N parts unassigned"*.
//
// A counter that said 41 at a joiner who has assigned everything his kitchen
// contains would be worse than no counter, so the number is not "registry parts
// without a material" — it is "parts THIS DESIGN USES that have nothing behind
// them, in the families that use them". That law is `projectPartUsage` and
// `unassignedInUse`, and this is where it is pinned.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { projectPartUsage, unassignedInUse } from '../src/engine/bom.js';
import { ALL_PARTS, PART_GROUPS, partsInGroup } from '../src/engine/partRegistry.js';
import { buildDatabaseMenu } from '../src/lib/topMenu.js';
import { MODAL_KINDS, modalAnchorFault } from '../src/lib/modalLayer.js';

function cabinet(typeId, extra = {}) {
  const params = { ...defaultParamsFor(typeId, P), unit_num: '01', ...extra };
  return { unit: { id: `u_${typeId}`, type: typeId, params }, result: computeCabinet(params, P) };
}

const WARDROBE = cabinet('WARDROBE', { doors: true, plinth: true, shelves: 3, rail: true });
const BUD = cabinet('BUD', { doors: true, plinth: true });
const ctx = { profile: P };

// ─── Usage ──────────────────────────────────────────────────────────────────

test('a job uses a HANDFUL of the registry, not all of it', () => {
  const usage = projectPartUsage([WARDROBE], ctx);
  const used = Object.keys(usage).length;
  assert.ok(used > 5, 'a wardrobe with doors, shelves, a rail and a plinth uses more than five parts');
  assert.ok(used < ALL_PARTS.length / 2, `a single wardrobe claimed ${used} of ${ALL_PARTS.length} parts`);
  // The ones it obviously does contain…
  for (const id of ['carcase_side', 'carcase_horizontal', 'back', 'shelf', 'door', 'plinth', 'hinge', 'leg']) {
    assert.ok(usage[id]?.qty > 0, `a wardrobe uses ${id}`);
  }
  // …and the ones it obviously does not.
  // T54-F7 AMENDED (28.08.2026): `shoe_box_carcase` died with the shoe-box
  // world (licence 2) — a shoe is a `variant:'shoe'` DRAWER now, priced by the
  // drawer rows; the replacement pins live in test/turn54-f7-the-shoe-drawer.test.js.
  // `drawer_box_side` stands in: a plain no-drawer wardrobe uses none of it.
  for (const id of ['drawer_box_side', 'top_box_carcase', 'drawer_bottom', 'led_strip', 'extractor']) {
    assert.equal(usage[id], undefined, `a plain wardrobe does not use ${id}`);
  }
});

test('usage records WHICH FAMILY needed each part', () => {
  const usage = projectPartUsage([WARDROBE, BUD], ctx);
  assert.deepEqual(usage.carcase_side.families.sort(), ['base', 'wardrobe']);
  const only = projectPartUsage([BUD], ctx);
  assert.deepEqual(only.carcase_side.families, ['base']);
});

test('usage is the sum of the units, and quantities carry their unit', () => {
  const a = projectPartUsage([WARDROBE], ctx);
  const b = projectPartUsage([BUD], ctx);
  const both = projectPartUsage([WARDROBE, BUD], ctx);
  assert.equal(both.carcase_side.qty, a.carcase_side.qty + b.carcase_side.qty);
  assert.equal(both.carcase_side.unit, 'm²');
  assert.equal(both.hinge.unit, 'pcs');
  assert.equal(both.edge_carcase.unit, 'm');
});

test('nothing drawn yet is nothing used — and no throw', () => {
  assert.deepEqual(projectPartUsage([], ctx), {});
  assert.deepEqual(projectPartUsage(null, ctx), {});
  assert.deepEqual(projectPartUsage([{ unit: null, result: null }], ctx), {});
  assert.deepEqual(unassignedInUse([], {}), []);
});

// ─── The counter ────────────────────────────────────────────────────────────

test('the counter counts what this job uses, never the whole registry', () => {
  const missing = unassignedInUse([WARDROBE], { assignments: null, profile: P });
  const used = Object.keys(projectPartUsage([WARDROBE], ctx)).length;
  assert.equal(missing.length, used, 'with nothing assigned, every used part is missing');
  assert.ok(missing.length < ALL_PARTS.length);
});

test('assigning a part takes it off the counter, one for one', () => {
  const before = unassignedInUse([WARDROBE], { assignments: null, profile: P }).length;
  const after = unassignedInUse([WARDROBE], {
    assignments: { base: { carcase_side: { material_id: 'egger' } } }, profile: P,
  }).length;
  assert.equal(after, before - 1);
});

test('a part assigned for ONE family is still missing for the other', () => {
  const missing = unassignedInUse([WARDROBE, BUD], {
    assignments: { overrides: { carcase_side: { wardrobe: { material_id: 'oak' } } } },
    profile: P,
  });
  const row = missing.find((m) => m.partId === 'carcase_side');
  assert.ok(row, 'the kitchen base still has no board');
  assert.deepEqual(row.families, ['base']);
  // …and the base assignment covers both at once.
  const none = unassignedInUse([WARDROBE, BUD], {
    assignments: { base: { carcase_side: { material_id: 'egger' } } }, profile: P,
  });
  assert.equal(none.find((m) => m.partId === 'carcase_side'), undefined);
});

test('the counter reaches ZERO when everything the job uses is assigned', () => {
  const base = {};
  for (const id of Object.keys(projectPartUsage([WARDROBE, BUD], ctx))) base[id] = { material_id: 'egger' };
  assert.deepEqual(unassignedInUse([WARDROBE, BUD], { assignments: { base }, profile: P }), []);
});

test('every missing row names a part in exactly one group — the dots add up', () => {
  const missing = unassignedInUse([WARDROBE, BUD], { assignments: null, profile: P });
  const perGroup = {};
  for (const g of PART_GROUPS) perGroup[g.id] = 0;
  for (const m of missing) {
    const groups = PART_GROUPS.filter((g) => partsInGroup(g.id).some((p) => p.id === m.partId));
    assert.equal(groups.length, 1, `${m.partId} is in ${groups.length} groups`);
    perGroup[groups[0].id] += 1;
  }
  assert.equal(Object.values(perGroup).reduce((a, b) => a + b, 0), missing.length);
});

test('a design that gains a drawer gains drawer-box parts to assign', () => {
  const plain = projectPartUsage([cabinet('BUD', { doors: true })], ctx);
  const withDrawers = projectPartUsage([cabinet('BUDR', { doors: true })], ctx);
  assert.equal(plain.drawer_box_side, undefined);
  assert.ok(withDrawers.drawer_box_side?.qty > 0, 'the first drawer in a job brings its box board with it');
  assert.ok(withDrawers.drawer_bottom?.qty > 0);
  assert.ok(withDrawers.runner?.qty > 0);
  // …which is exactly the moment CLAUDE.md F3 wants marked NEW.
  const missing = unassignedInUse([cabinet('BUDR', { doors: true })], { assignments: null, profile: P })
    .map((m) => m.partId);
  assert.ok(missing.includes('drawer_box_side'));
  assert.ok(missing.includes('drawer_bottom'));
});

// ─── The way in ─────────────────────────────────────────────────────────────

test('Assign materials is on the Database menu, reachable from the project always', () => {
  let opened = 0;
  const menu = buildDatabaseMenu({ onAssignMaterials: () => { opened += 1; } });
  const entry = menu.items.find((i) => i.label === 'Assign materials…');
  assert.ok(entry, 'the entry the owner asked for by name');
  assert.equal(entry.disabled, false);
  entry.run();
  assert.equal(opened, 1);
});

test('the modal is registered, so the shell knows what it is about', () => {
  assert.ok(MODAL_KINDS['assign-materials'], 'an unregistered modal is a warned-about bug in this app');
  assert.equal(MODAL_KINDS['assign-materials'].about, 'project');
  // A project window is honest centred, so opening it without an anchor is not
  // a fault — which is what lets the menu entry open it from anywhere.
  assert.equal(modalAnchorFault('assign-materials', null), null);
});
