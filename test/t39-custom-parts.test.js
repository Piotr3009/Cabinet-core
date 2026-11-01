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

// ─── T-CC2a REWRITES the seven purchase-list tests below by name ─────────────
// CLAUDE.md T-CC2a laws 3 and 9: the purchase list is keyed by the catalogue
// and priced through the company's links; the per-part assignment blob, where
// T39's custom rows live, is NOT read by it (CONTRACT B). The blob keeps them
// as saved (FROZEN 4, the normalisation tests below still hold) and the old
// Assign window still shows them (F14). What a project buys that Cabinet Core
// does not know is a BESPOKE row now (`project.bespoke`, the owner 12:50:
// *"add materialy bespoke (od klienta na przyklad inne ironmongery)"*), and
// these seven say so about it.
const BESPOKE = [{ id: 'b_dowel', name: 'Dowels 8 x 40', qty: 24, unit: 'pcs', price: 0.03, suppliedByClient: false }];
const bespokeRow = (pb, id = 'b_dowel') => pb.rows.find((r) => r.key === `bespoke:${id}`);

test('a custom row of the old blob does not reach the purchase list; a bespoke row does', () => {
  const rows = mergeUnitMaterials([BUD], withCustom(DOWELS));
  assert.equal(row(rows, 'part:custom_dowel'), undefined, 'the blob is not read by the purchase list');
  assert.ok(!rows.some((r) => /Dowels 8 × 40/.test(r.name)));
  const line = bespokeRow(purchaseBom([BUD], { profile: P, bespoke: BESPOKE }));
  assert.ok(line, 'a row the joiner typed must be on the list');
  assert.deepEqual([line.qty, line.unit, line.name, line.status, line.catalogueId], [24, 'pcs', 'Dowels 8 x 40', 'bespoke', null]);
});

test('a bespoke row is the project\'s own quantity, never multiplied by the cabinets', () => {
  const one = bespokeRow(purchaseBom([BUD], { profile: P, bespoke: BESPOKE }));
  const two = bespokeRow(purchaseBom([BUD, WARDROBE], { profile: P, bespoke: BESPOKE }));
  assert.equal(one.qty, 24);
  assert.equal(two.qty, 24);
});

test('a bespoke row costs its own unit price; supplied by the client it costs nothing', () => {
  assert.equal(bespokeRow(purchaseBom([BUD], { profile: P, bespoke: BESPOKE })).lineCost, 0.72);
  const client = bespokeRow(purchaseBom([BUD], { profile: P, bespoke: [{ ...BESPOKE[0], suppliedByClient: true }] }));
  assert.deepEqual([client.price, client.lineCost, client.words], [0, 0, 'Supplied by client']);
});

test('a bespoke row never merges into a catalogue line (law 9: it never enters the catalogue)', () => {
  const pb = purchaseBom([BUD], { profile: P, bespoke: [...BESPOKE, { id: 'b2', name: 'Dowels 8 x 40', qty: 4, unit: 'pcs', price: 0.03 }] });
  assert.equal(pb.rows.filter((r) => r.bespoke).length, 2, 'two rows the joiner typed, two lines');
  assert.ok(pb.rows.filter((r) => r.bespoke).every((r) => r.catalogueId === null && r.key.startsWith('bespoke:')));
});

test('no yield reaches a bespoke row', () => {
  const pb = purchaseBom([BUD], { profile: P, bespoke: BESPOKE, links: new Map(), assignments: { base: { b_dowel: { yield: 2 } } } });
  assert.equal(bespokeRow(pb).qty, 24);
});

test('a bespoke row never makes the total incomplete', () => {
  const pb = purchaseBom([BUD], { profile: P, bespoke: BESPOKE });
  const without = purchaseBom([BUD], { profile: P });
  assert.equal(pb.totals.incomplete, without.totals.incomplete);
  assert.equal(pb.totals.lines, without.totals.lines + 1);
});

test('a bespoke quantity nobody can parse is ONE, not zero and not NaN (Production Core\'s answer, kept)', () => {
  for (const q of [null, undefined, 'x', NaN, -1]) {
    assert.equal(bespokeRow(purchaseBom([BUD], { profile: P, bespoke: [{ ...BESPOKE[0], qty: q }] })).qty, 1, `qty ${String(q)}`);
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
