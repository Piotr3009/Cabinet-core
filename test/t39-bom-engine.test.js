// ─── THE BOM ENGINE (turn 39, CLAUDE.md F5) ─────────────────────────────────
//
// The owner: *"jeśli ten sam wszędzie to połączyć w jedno"*.
//
// F1 collapsed many engine elements into one assignable PART. This is the
// SECOND collapse: many parts into one PURCHASE LINE, keyed on the assigned
// material's id, so if the sides, the top, the bottom, the partitions and the
// shelves all point at one Egger board, the BOM shows ONE line with the summed
// area. There is no special case for it anywhere — it falls out of the key, and
// the first test below is the proof.
//
// CLAUDE.md F5 names five things to test and every one of them is here:
//   two parts on one material merge to one line with summed qty · yield
//   arithmetic · unassigned parts appear as `part:` lines with zero cost ·
//   the sheet estimate rounds up · a two-cabinet project equals the sum of its
//   two single-cabinet BOMs

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  buildCabinetPartQtys, mergeUnitMaterials, purchaseBom, sheetsFor,
  sheetFamilyOfPart, resolvePartTotal, formatQty,
} from '../src/engine/bom.js';
import { PART_REGISTRY, partIdForElement } from '../src/engine/partRegistry.js';
import { sheetFamilyOfPanel } from '../src/engine/checks.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const MATS = [
  { id: 'egger_white', name: 'Egger W980 18 mm', category: 'board', price: 11.4 },
  { id: 'hdf6', name: 'HDF backing 6 mm', category: 'board', price: 4.6 },
  { id: 'sprayed', name: 'Sprayed MDF 25 mm', category: 'front', cost_per_unit: 27 },
];

function cabinet(typeId, extra = {}) {
  const params = { ...defaultParamsFor(typeId, P), unit_num: '01', ...extra };
  return { unit: { id: `u_${typeId}`, type: typeId, params }, result: computeCabinet(params, P) };
}

const WARDROBE = cabinet('WARDROBE', { doors: true, plinth: true, shelves: 3, rail: true });
const BUD = cabinet('BUD', { doors: true, plinth: true, shelves: 1 });

const ctx = (assignments) => ({ assignments, materials: MATS, profile: P });
const rowFor = (rows, key) => rows.find((r) => r.key === key);

// ─── THE COLLAPSE ───────────────────────────────────────────────────────────

test('two parts on ONE material merge into ONE line with the summed area', () => {
  const qtys = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const sides = qtys.carcase_side.m2;
  const horiz = qtys.carcase_horizontal.m2;
  assert.ok(sides > 0 && horiz > 0, 'the fixture must actually have both');

  const rows = mergeUnitMaterials([WARDROBE], ctx({
    base: {
      carcase_side: { material_id: 'egger_white' },
      carcase_horizontal: { material_id: 'egger_white' },
    },
  }));
  const line = rowFor(rows, 'mat:egger_white');
  assert.ok(line, 'the two parts did not merge onto the board they were assigned');
  assert.equal(line.qty, sides + horiz);
  assert.equal(line._assigned, true);
  assert.deepEqual([...line.parts].sort(), ['carcase_horizontal', 'carcase_side']);
  // …and exactly ONE line for that board, which is the owner's whole question.
  assert.equal(rows.filter((r) => r.key === 'mat:egger_white').length, 1);
});

test('the owner’s sentence, whole: sides + top + bottom + partitions + shelves, one line', () => {
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const want = ['carcase_side', 'carcase_horizontal', 'partition', 'shelf'];
  const base = {};
  for (const id of want) base[id] = { material_id: 'egger_white' };
  const rows = mergeUnitMaterials([WARDROBE], ctx({ base }));
  const line = rowFor(rows, 'mat:egger_white');
  const expected = want.reduce((s, id) => s + (q[id]?.m2 || 0), 0);
  assert.equal(line.qty, expected);
  assert.equal(line.parts.length, want.length);
});

test('different boards do NOT merge — the back keeps its own 6 mm line', () => {
  const rows = mergeUnitMaterials([WARDROBE], ctx({
    base: {
      carcase_side: { material_id: 'egger_white' },
      back: { material_id: 'hdf6' },
    },
  }));
  assert.ok(rowFor(rows, 'mat:egger_white'));
  assert.ok(rowFor(rows, 'mat:hdf6'));
  assert.notEqual(rowFor(rows, 'mat:egger_white').qty, rowFor(rows, 'mat:hdf6').qty);
});

// ─── Yield ──────────────────────────────────────────────────────────────────

test('yield is applied per assignment BEFORE the parts are summed', () => {
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const rows = mergeUnitMaterials([WARDROBE], ctx({
    base: {
      carcase_side: { material_id: 'egger_white', yield: 1.1 },
      carcase_horizontal: { material_id: 'egger_white', yield: 1.25 },
    },
  }));
  const line = rowFor(rows, 'mat:egger_white');
  // Two coefficients on one line, each applied to its OWN part — not one
  // average over the total, which is what a per-line waste percentage would do.
  assert.equal(line.qty, q.carcase_side.m2 * 1.1 + q.carcase_horizontal.m2 * 1.25);
});

test('yield 1.0 changes nothing, and a broken yield is 1.0', () => {
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  for (const y of [1, 1.0, 0, -3, 'x', null, undefined, NaN]) {
    const rows = mergeUnitMaterials([WARDROBE], ctx({
      base: { carcase_side: { material_id: 'egger_white', yield: y } },
    }));
    assert.equal(rowFor(rows, 'mat:egger_white').qty, q.carcase_side.m2, `yield ${String(y)}`);
  }
});

test('yield applies to pieces too, not only to area', () => {
  const rows = mergeUnitMaterials([WARDROBE], ctx({
    base: { shelf_pin: { material_id: 'egger_white', yield: 2 } },
  }));
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  assert.equal(rowFor(rows, 'mat:egger_white').qty, q.shelf_pin.pcs * 2);
});

test('resolvePartTotal reads whichever measure the entry carries', () => {
  assert.deepEqual(resolvePartTotal({ m2: 4, unit: 'm²' }, 1.25), { total: 5, unit: 'm²' });
  assert.deepEqual(resolvePartTotal({ m: 10, unit: 'm' }, 1.1), { total: 11, unit: 'm' });
  assert.deepEqual(resolvePartTotal({ pcs: 6, unit: 'pcs' }), { total: 6, unit: 'pcs' });
  assert.deepEqual(resolvePartTotal(null), { total: 0, unit: 'pcs' });
});

// ─── What is missing ────────────────────────────────────────────────────────

test('unassigned parts appear as `part:` lines with zero cost, and FIRST', () => {
  const rows = mergeUnitMaterials([WARDROBE], ctx({
    base: { carcase_side: { material_id: 'egger_white' } },
  }));
  const doors = rowFor(rows, 'part:door');
  assert.ok(doors, 'the doors are unassigned and must be VISIBLE, not absent');
  assert.equal(doors._assigned, false);
  assert.equal(doors.costPerUnit, 0);
  assert.equal(doors.lineCost, null);
  assert.equal(doors.name, PART_REGISTRY.door.name);
  // Unassigned at the top — CLAUDE.md F6, and the opposite of Production Core's
  // order, deliberately: what is missing is what the joiner has to act on.
  const firstAssigned = rows.findIndex((r) => r._assigned);
  const lastUnassigned = rows.map((r) => r._assigned).lastIndexOf(false);
  assert.ok(lastUnassigned < firstAssigned, 'an assigned line came before an unassigned one');
});

test('a material id nothing in the stock list matches reads as UNASSIGNED', () => {
  // The worse mistake would be a priced line at zero. A board the workshop no
  // longer stocks is a board nobody can buy, and the BOM has to say so.
  const rows = mergeUnitMaterials([WARDROBE], ctx({
    base: { carcase_side: { material_id: 'deleted_last_year' } },
  }));
  assert.equal(rowFor(rows, 'mat:deleted_last_year'), undefined);
  assert.equal(rowFor(rows, 'part:carcase_side')._assigned, false);
});

test('a BOM with anything unassigned is INCOMPLETE, and says so', () => {
  const partial = purchaseBom([WARDROBE], ctx({ base: { carcase_side: { material_id: 'egger_white' } } }));
  assert.equal(partial.totals.complete, false);
  assert.ok(partial.totals.unassigned > 0);
  assert.ok(partial.totals.cost > 0, 'the money that IS known is still shown');

  const nothing = purchaseBom([WARDROBE], ctx(null));
  assert.equal(nothing.totals.complete, false);
  assert.equal(nothing.totals.cost, 0);
  assert.equal(nothing.rows.every((r) => !r._assigned), true);
});

test('a fully assigned cabinet is COMPLETE and has no part: lines at all', () => {
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const base = {};
  for (const id of Object.keys(q)) base[id] = { material_id: 'egger_white' };
  const bom = purchaseBom([WARDROBE], ctx({ base }));
  assert.equal(bom.totals.complete, true);
  assert.equal(bom.totals.unassigned, 0);
  assert.equal(bom.rows.length, 1, 'one board for everything is one line');
  assert.ok(bom.totals.cost > 0);
});

// ─── The sheet estimate ─────────────────────────────────────────────────────

test('the sheet estimate ROUNDS UP — half a sheet is a sheet you bought', () => {
  const sheet = { width: 2800, height: 2070 };          // 5.796 m²
  assert.equal(sheetsFor(0.01, sheet), 1);
  assert.equal(sheetsFor(5.795, sheet), 1);
  assert.equal(sheetsFor(5.796, sheet), 1);
  assert.equal(sheetsFor(5.797, sheet), 2);
  assert.equal(sheetsFor(11.592, sheet), 2);
  assert.equal(sheetsFor(11.593, sheet), 3);
  // Nothing to buy, or no sheet size to measure against, is not zero sheets —
  // it is no answer, and the column stays empty rather than printing 0.
  assert.equal(sheetsFor(0, sheet), null);
  assert.equal(sheetsFor(4, { width: 0, height: 0 }), null);
  assert.equal(sheetsFor(4, null), null);
});

test('a board line counts sheets; a metre or a piece line does not', () => {
  const rows = mergeUnitMaterials([WARDROBE], ctx({
    base: {
      carcase_side: { material_id: 'egger_white' },
      edge_carcase: { material_id: 'hdf6' },
      hinge: { material_id: 'sprayed' },
    },
  }));
  assert.ok(rowFor(rows, 'mat:egger_white').sheets >= 1);
  assert.equal(rowFor(rows, 'mat:hdf6').sheets, null);      // metres of banding
  assert.equal(rowFor(rows, 'mat:sprayed').sheets, null);   // pieces of hinge
});

test('the sheet a part is ESTIMATED against is the sheet the engine CHECKS it against', () => {
  // One decider. If these two ever disagree, a cut list passes the fits-the-
  // sheet check against one board and is ordered against another.
  for (const c of [WARDROBE, BUD, cabinet('WUD', { doors: true, bottom_mask: true, mount_height: 1500 }),
    cabinet('BUDR', { doors: true, plinth: true, end_panels: [{ side: 'L' }], top_infill_mm: 200 })]) {
    for (const panel of c.result.panels) {
      const partId = partIdForElement(panel.part, { typeId: c.result.type });
      if (!partId || PART_REGISTRY[partId].unit !== 'm²') continue;
      assert.equal(
        sheetFamilyOfPart(partId), sheetFamilyOfPanel(panel),
        `${panel.part} (${panel.role}) → ${partId}: the BOM and the check disagree about which board it comes off`,
      );
    }
  }
});

test('carcass parts are measured against the carcass board, fronts against the front board', () => {
  assert.equal(sheetFamilyOfPart('carcase_side'), 'carcasses');
  assert.equal(sheetFamilyOfPart('shelf'), 'carcasses');
  assert.equal(sheetFamilyOfPart('drawer_box_side'), 'carcasses');
  assert.equal(sheetFamilyOfPart('door'), 'fronts');
  assert.equal(sheetFamilyOfPart('end_panel'), 'fronts');
  assert.equal(sheetFamilyOfPart('mask'), 'fronts');
  // …and the two the engine puts on the carcass board despite their spray.
  assert.equal(sheetFamilyOfPart('plinth'), 'carcasses');
  assert.equal(sheetFamilyOfPart('infill'), 'carcasses');

  // A workshop with a SMALL front board and a big carcass board gets more
  // front sheets for the same area — which is the whole point of T35-F15.
  const small = {
    ...P,
    cnc: { ...P.cnc, sheetCarcass: { width: 2800, height: 2070 }, sheetFronts: { width: 1220, height: 2440 } },
  };
  const rows = mergeUnitMaterials([WARDROBE], {
    assignments: { base: { door: { material_id: 'sprayed' }, carcase_side: { material_id: 'egger_white' } } },
    materials: MATS,
    profile: small,
  });
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: small });
  assert.equal(rowFor(rows, 'mat:sprayed').sheets, Math.ceil(q.door.m2 / ((1220 * 2440) / 1e6)));
  assert.equal(rowFor(rows, 'mat:egger_white').sheets, Math.ceil(q.carcase_side.m2 / ((2800 * 2070) / 1e6)));
});

// ─── The project is the sum of its cabinets ─────────────────────────────────

test('a two-cabinet project EQUALS the sum of its two single-cabinet BOMs', () => {
  const assignments = {
    base: {
      carcase_side: { material_id: 'egger_white', yield: 1.1 },
      carcase_horizontal: { material_id: 'egger_white' },
      back: { material_id: 'hdf6' },
      door: { material_id: 'sprayed' },
    },
  };
  const both = mergeUnitMaterials([WARDROBE, BUD], ctx(assignments));
  const a = mergeUnitMaterials([WARDROBE], ctx(assignments));
  const b = mergeUnitMaterials([BUD], ctx(assignments));

  const sum = new Map();
  for (const r of [...a, ...b]) sum.set(r.key, (sum.get(r.key) || 0) + r.qty);
  assert.deepEqual(
    [...sum.keys()].sort(), both.map((r) => r.key).sort(),
    'the project has lines the two cabinets do not, or the other way round',
  );
  for (const r of both) {
    assert.equal(r.qty, sum.get(r.key), `${r.key} disagrees between project and cabinet`);
  }
});

test('…and so does the money', () => {
  const assignments = { base: { carcase_side: { material_id: 'egger_white' }, door: { material_id: 'sprayed' } } };
  const both = purchaseBom([WARDROBE, BUD], ctx(assignments));
  const a = purchaseBom([WARDROBE], ctx(assignments));
  const b = purchaseBom([BUD], ctx(assignments));
  assert.ok(Math.abs(both.totals.cost - (a.totals.cost + b.totals.cost)) < 0.02);
});

test('the same cabinet twice is exactly double one of it', () => {
  const assignments = { base: { carcase_side: { material_id: 'egger_white' } } };
  const one = rowFor(mergeUnitMaterials([WARDROBE], ctx(assignments)), 'mat:egger_white');
  const two = rowFor(mergeUnitMaterials([WARDROBE, WARDROBE], ctx(assignments)), 'mat:egger_white');
  assert.equal(two.qty, one.qty * 2);
  assert.equal(two.lineCost, Math.round(one.lineCost * 2 * 100) / 100);
});

// ─── Per-family overrides reach the purchase list ───────────────────────────

test('a wardrobe-only override buys a different board from the base unit beside it', () => {
  const rows = mergeUnitMaterials([WARDROBE, BUD], ctx({
    base: { carcase_side: { material_id: 'egger_white' } },
    overrides: { carcase_side: { wardrobe: { material_id: 'hdf6' } } },
  }));
  const qW = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const qB = buildCabinetPartQtys(BUD.result, BUD.unit, { profile: P });
  assert.equal(rowFor(rows, 'mat:hdf6').qty, qW.carcase_side.m2);
  assert.equal(rowFor(rows, 'mat:egger_white').qty, qB.carcase_side.m2);
});

// ─── The read of the engine ─────────────────────────────────────────────────

test('the quantities come from the ENGINE’s own numbers, not from a re-derivation', () => {
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const panels = WARDROBE.result.panels;
  const areaOf = (...parts) => panels
    .filter((p) => parts.includes(p.part))
    .reduce((s, p) => s + p.area_m2 * p.qty, 0);
  assert.equal(q.carcase_side.m2, areaOf('BUL', 'BUR'));
  assert.equal(q.carcase_horizontal.m2, areaOf('TOP', 'BOTTOM'));
  assert.equal(q.back.m2, areaOf('BACK'));
  assert.equal(q.door.m2, areaOf('FRONT'));

  // Edging is READ, not re-derived from a perimeter — CLAUDE.md F5 is explicit.
  const edgeOf = (...parts) => panels
    .filter((p) => parts.includes(p.part))
    .reduce((s, p) => s + p.edging.len_m * p.qty, 0);
  // The FRONT's banding only: a plinth is a BOARD part in the registry
  // (CLAUDE.md F1 files it there) so its banding is carcase edging, and the
  // engine measures a plinth against the carcass sheet for the same reason.
  assert.equal(q.edge_front.m, edgeOf('FRONT'));

  // Hardware counts are the engine's, to the piece.
  const hw = (role) => (WARDROBE.result.hardware || [])
    .filter((h) => h.role === role).reduce((s, h) => s + h.qty, 0);
  assert.equal(q.hinge.pcs, hw('hinges'));
  assert.equal(q.leg.pcs, hw('legs'));
  assert.equal(q.shelf_pin.pcs, hw('shelf_pins'));
  // One plate per hinge, off that same count.
  assert.equal(q.hinge_plate.pcs, hw('hinges'));
});

test('a hanging rail is bought by the METRE, though the engine counts pieces', () => {
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const rail = (WARDROBE.result.hardware || []).find((h) => h.role === 'rail');
  assert.ok(rail, 'the fixture must carry a rail');
  assert.equal(rail.unit, 'pcs');
  assert.equal(q.rail_tube.unit, 'm');
  assert.equal(q.rail_tube.m, (rail.spec.length_mm * rail.qty) / 1000);
});

test('a top box’s carcase is bought on its own row', () => {
  const box = cabinet('WARDROBE_TOP', { doors: true });
  const q = buildCabinetPartQtys(box.result, box.unit, { profile: P });
  assert.ok(q.top_box_carcase?.m2 > 0, 'a top box put nothing on its own row');
  assert.equal(q.carcase_side, undefined);
  assert.equal(q.carcase_horizontal, undefined);
  assert.equal(q.back, undefined);
  // …and its door is still a door.
  assert.ok(q.door?.m2 > 0);
});

test('every part a cabinet produces is a registry part with a unit', () => {
  for (const c of [WARDROBE, BUD, cabinet('BUDR', { doors: true }), cabinet('WUD', { doors: true, shelves: 2 })]) {
    const q = buildCabinetPartQtys(c.result, c.unit, { profile: P });
    for (const [id, entry] of Object.entries(q)) {
      assert.ok(PART_REGISTRY[id], `${id} is not a registry part`);
      assert.equal(entry.unit, PART_REGISTRY[id].unit, id);
      const measures = ['m2', 'm', 'pcs'].filter((k) => entry[k] != null);
      assert.equal(measures.length, 1, `${id} is counted in two currencies: ${measures.join(' + ')}`);
    }
  }
});

test('nothing at all in, nothing at all out — and no throw', () => {
  assert.deepEqual(buildCabinetPartQtys(null, null), {});
  assert.deepEqual(mergeUnitMaterials([], {}), []);
  assert.deepEqual(mergeUnitMaterials(null, {}), []);
  assert.equal(purchaseBom([], {}).totals.complete, true);
  assert.deepEqual(mergeUnitMaterials([{ unit: null, result: null }], {}), []);
});

test('formatQty says pieces whole and everything else to two places', () => {
  assert.equal(formatQty(6.0, 'pcs'), '6 pcs');
  assert.equal(formatQty(6.4, 'pcs'), '6 pcs');
  assert.equal(formatQty(3.9648, 'm²'), '3.96 m²');
  assert.equal(formatQty(2, 'pairs'), '2 pairs');
  assert.equal(formatQty(null, 'm'), '0.00 m');
});
