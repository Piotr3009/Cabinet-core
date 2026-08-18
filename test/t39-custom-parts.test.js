// ─── THE JOINER'S OWN ROWS (turn 39, CLAUDE.md F8) ──────────────────────────
//
// *"Production Core's `customParts`: the user adds a line ('dowels 8×40', qty
// per cabinet, unit), assigns a material, and it flows into the BOM like any
// registry part. Same shape, same merge path."*
//
// The point of "same merge path" is not tidiness — it is that a custom row and
// a registry part assigned to the SAME board must land on ONE purchase line.
// If F8 had its own accumulator it would be a second BOM, and the first test
// below is the one that proves it is not.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { mergeUnitMaterials, purchaseBom } from '../src/engine/bom.js';
import { normalizeAssignments, assignmentFor } from '../src/engine/partRegistry.js';

const MATS = [
  { id: 'egger_white', name: 'Egger W980 18 mm', price: 11.4 },
  { id: 'dowel8', name: 'Dowel 8 × 40 beech', price: 0.03 },
];

function cabinet(typeId, extra = {}) {
  const params = { ...defaultParamsFor(typeId, P), unit_num: '01', ...extra };
  return { unit: { id: `u_${typeId}`, type: typeId, params }, result: computeCabinet(params, P) };
}
const BUD = cabinet('BUD', { doors: true, plinth: true });
const WARDROBE = cabinet('WARDROBE', { doors: true, plinth: true });

const withCustom = (customParts, base = {}) => ({
  assignments: { base, customParts }, materials: MATS, profile: P,
});
const row = (rows, key) => rows.find((r) => r.key === key);

const DOWELS = [{ id: 'custom_dowel', name: 'Dowels 8 × 40', unit: 'pcs', qtyPerUnit: 24 }];

test('a custom row reaches the BOM at all', () => {
  const rows = mergeUnitMaterials([BUD], withCustom(DOWELS));
  const line = row(rows, 'part:custom_dowel');
  assert.ok(line, 'a row the joiner typed must be on the list');
  assert.equal(line.qty, 24);
  assert.equal(line.unit, 'pcs');
  assert.equal(line.name, 'Dowels 8 × 40');
  assert.equal(line._assigned, false);
  assert.equal(line.group, 'consumable');
});

test('the quantity is PER CABINET — nine cabinets need nine cabinets’ worth', () => {
  const one = row(mergeUnitMaterials([BUD], withCustom(DOWELS)), 'part:custom_dowel');
  const two = row(mergeUnitMaterials([BUD, WARDROBE], withCustom(DOWELS)), 'part:custom_dowel');
  assert.equal(one.qty, 24);
  assert.equal(two.qty, 48);
});

test('assigned, it costs — and it costs off the same column everything else does', () => {
  const rows = mergeUnitMaterials([BUD], withCustom(DOWELS, { custom_dowel: { material_id: 'dowel8' } }));
  const line = row(rows, 'mat:dowel8');
  assert.ok(line);
  assert.equal(line.qty, 24);
  assert.equal(line._assigned, true);
  assert.equal(line.lineCost, Number((24 * 0.03).toFixed(2)));
});

test('THE SAME MERGE PATH — a custom row on a board a registry part uses is ONE line', () => {
  const rows = mergeUnitMaterials([BUD], withCustom(
    [{ id: 'custom_strip', name: 'Packing strip', unit: 'm²', qtyPerUnit: 0.5 }],
    { carcase_side: { material_id: 'egger_white' }, custom_strip: { material_id: 'egger_white' } },
  ));
  const lines = rows.filter((r) => r.key === 'mat:egger_white');
  assert.equal(lines.length, 1, 'a second accumulator would have made two');
  assert.ok(lines[0].parts.includes('custom_strip'));
  assert.ok(lines[0].parts.includes('carcase_side'));
});

test('the yield applies to a custom row exactly as it does to a registry part', () => {
  const rows = mergeUnitMaterials([BUD], withCustom(
    DOWELS, { custom_dowel: { material_id: 'dowel8', yield: 1.5 } },
  ));
  assert.equal(row(rows, 'mat:dowel8').qty, 36);
});

test('an unassigned custom row makes the BOM INCOMPLETE, like any other', () => {
  const bom = purchaseBom([BUD], withCustom(DOWELS));
  assert.equal(bom.totals.complete, false);
  assert.ok(bom.unassigned.some((r) => r.key === 'part:custom_dowel'));
});

test('a quantity nobody can parse becomes ONE, not zero and not NaN', () => {
  // Production Core's own answer (`Number(cp.qtyPerWindow) || 1`), copied
  // deliberately: CLAUDE.md says where the spec is silent, copy Production
  // Core rather than invent. A row somebody typed and left blank is one per
  // cabinet, which is the likeliest thing they meant — and it is never a NaN
  // multiplying a purchase order. The field itself cannot go below 0.01, so
  // "none" is expressed by deleting the row, which is one click.
  for (const q of [0, -1, null, undefined, 'x', NaN]) {
    const rows = mergeUnitMaterials([BUD], withCustom([{ id: 'c1', name: 'Nothing', unit: 'pcs', qtyPerUnit: q }]));
    assert.equal(row(rows, 'part:c1').qty, 1, `qtyPerUnit ${String(q)}`);
  }
});

test('a blob whose ONLY content is a custom row is still read as one', () => {
  // No `base`, no `overrides`, no stamp — the shape a project takes the moment
  // its first custom consumable is typed. Reading it as turn 3's flat role map
  // would drop the row on the floor.
  const d = normalizeAssignments({ customParts: DOWELS });
  assert.equal(d.customParts.length, 1);
  assert.equal(d.customParts[0].id, 'custom_dowel');
});

test('a custom id survives normalisation as ITSELF — it is not a registry id', () => {
  const d = normalizeAssignments({
    base: { custom_dowel: { material_id: 'dowel8' } },
    customParts: DOWELS,
  });
  assert.equal(d.base.custom_dowel.material_id, 'dowel8');
  assert.equal(assignmentFor(d, 'custom_dowel').material_id, 'dowel8');
  assert.equal(d.customParts[0].qtyPerUnit, 24);
});

test('the blob round-trips a custom row through JSON unchanged', () => {
  const live = normalizeAssignments({
    base: { custom_dowel: { material_id: 'dowel8', yield: 1.1 } },
    customParts: DOWELS,
  });
  assert.deepEqual(normalizeAssignments(JSON.parse(JSON.stringify(live))), live);
});

test('a junk custom row cannot reach a purchase order', () => {
  const d = normalizeAssignments({
    customParts: [
      'not an object',
      { name: 'no id' },
      { id: 'ok', name: '   ', unit: null, qtyPerUnit: -4 },
    ],
  });
  assert.equal(d.customParts.length, 1);
  assert.equal(d.customParts[0].id, 'ok');
  assert.equal(d.customParts[0].name, 'Custom consumable', 'a nameless line still has to read as something');
  assert.equal(d.customParts[0].unit, 'pcs');
  assert.equal(d.customParts[0].qtyPerUnit, 1);
});

test('Production Core’s own field name is still read', () => {
  // Its rows say `qtyPerWindow`; a shop that pasted one in gets its number.
  const d = normalizeAssignments({ customParts: [{ id: 'c', name: 'x', qtyPerWindow: 12 }] });
  assert.equal(d.customParts[0].qtyPerUnit, 12);
});
