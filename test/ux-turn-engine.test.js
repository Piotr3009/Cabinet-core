/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// THE UX TURN, THE ENGINE'S POINTS (Bruno): B1 the wizard's gate asks the
// catalogue, B2 an old project's stock board thickness moved once into the
// settings, B3 the screws as one line, B4 the solvent on the primer too, B5 no
// price is not a price, B6 the Order tab counts the purchase list's sheets.
import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { loadHardwareCatalogues } = await import('../src/lib/hardwareCatalogue.js');
loadHardwareCatalogues();
const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');
const { materialsAssigned, wizardStartBlockers } = await import('../src/engine/projectSettings.js');
const { migrateDesign, projectHeights } = await import('../src/engine/design.js');
const { newItemBoardDefaults } = await import('../src/engine/companyDefaults.js');
const {
  migrateStockThickness, projectThicknesses, slotNominal, slotThickness,
} = await import('../src/engine/thickness.js');
const { catalogueIdOfLine, entryById } = await import('../src/engine/catalogue.js');
const { resolvePanelMaterial } = await import('../src/engine/materials.js');
const {
  buildBom, purchaseBom, screwPilotCount, LINK_WORDS, INCOMPLETE_STATUSES, incompleteWords,
} = await import('../src/engine/bom.js');
const { materialsSummary } = await import('../src/engine/bomInvoice.js');
const { paintLinesFor } = await import('../src/engine/spray.js');
const { computeCabinet } = await import('../src/engine/cabinet.js');
const { defaultParamsFor } = await import('../src/engine/types.js');
const { toMaterial } = await import('../src/lib/jcStock.js');
const { t43Entries, T43_DESIGN } = await import('./fixtures/t43-kitchen.js');

const gate = (design) => wizardStartBlockers({
  design, heights: projectHeights(design, P), roomHeight: 2400, profile: P,
});

// ─── B1 · THE GATE ASKS THE CATALOGUE ────────────────────────────────────────

test('B1 · a new item on the defaults (EGGER H3325 carcass, sprayed RAL 3005 front on MDF 18), no material_id: all assigned', () => {
  const want = newItemBoardDefaults(P, null);
  assert.equal(want.carcass.finish_id, `egger:${P.projectSettings.defaultCarcassDecorId}`);
  const design = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: want.carcass.source, finish_id: want.carcass.finish_id }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: want.front.source, colour: want.front.colour }] },
  });
  assert.equal(design.carcass.types[0].material_id, null);
  assert.equal(design.fronts.types[0].material_id, null);
  const m = materialsAssigned(design, P);
  assert.equal(m.all, true, 'Next is not blocked');
  assert.deepEqual(
    [...m.carcass, ...m.fronts].map((s) => [s.label, s.assigned, s.via, s.catalogueId]),
    [['Carcass 1', true, 'catalogue', 'sheet.egger.h3325_28.18'], ['Front 1', true, 'catalogue', 'sheet.mdf.18']],
  );
  assert.equal(gate(design).blockers.length, 0, 'the Start gate agrees');
});

test('B1 · the gate and the cut list name the SAME board (one reduction, one thickness)', () => {
  const design = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'egger', finish_id: 'egger:H3325_28' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' } }] },
  });
  const params = { ...defaultParamsFor('BUD', P), unit_num: '01', thickness_slots: projectThicknesses({ design, profile: P }) };
  const result = computeCabinet({ type: 'BUD', ...params }, P);
  const unit = { id: 'u', type: 'BUD', params };
  const side = result.panels.find((p) => p.id === 'BUL');
  const door = result.panels.find((p) => p.material_role === 'front');
  const m = materialsAssigned(design, P);
  assert.equal(resolvePanelMaterial(side, unit, design, P, []).catalogue_id, m.carcass[0].catalogueId);
  assert.equal(resolvePanelMaterial(door, unit, design, P, []).catalogue_id, m.fronts[0].catalogueId);
});

test('B1 · a slot with no resolvable choice is still missing; the stock board and the assignments still say yes', () => {
  const blank = migrateDesign({});
  assert.deepEqual(materialsAssigned(blank, P).missing.map((s) => s.label), ['Carcass 1', 'Front 1'], 'nothing chosen');
  const noDecor = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'egger' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray' }] },
  });
  assert.deepEqual(materialsAssigned(noDecor, P).missing.map((s) => s.label), ['Carcass 1', 'Front 1'],
    'an EGGER source with no decor (never the Generic placeholder) and a spray source with no colour');
  const veneer = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'veneer', finish_id: 'veneer:oak-natural' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'wood' }] },
  });
  assert.deepEqual(materialsAssigned(veneer, P).missing.map((s) => s.label), ['Carcass 1', 'Front 1'], 'not in the catalogue yet');
  const stock = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'veneer', material_id: 'b6a1f3d2-0001-4c1e-9a10-000000000001' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'generic-18' }] },
  });
  const s = materialsAssigned(stock, P);
  assert.equal(s.all, true);
  assert.deepEqual([s.carcass[0].via, s.fronts[0].via], ['slot', 'slot'], 'the Stock board select is the first yes, as before');
  const viaBlob = materialsAssigned(blank, P, { schema: 2, base: { carcase_side: { material_id: 'x' }, door: { material_id: 'y' } } });
  assert.deepEqual([viaBlob.carcass[0].via, viaBlob.fronts[0].via], ['assignments', 'assignments']);
  assert.match(gate(blank).blockers[0].message, /^Choose a board for Carcass 1, Front 1: /);
  assert.doesNotMatch(gate(blank).blockers[0].message, /[\u2013\u2014]/, 'no em or en dash');
});

// ─── B2 · A STOCK BOARD'S THICKNESS, MOVED ONCE INTO THE SETTINGS ────────────

const ROW25 = toMaterial({
  id: 'b6a1f3d2-0001-4c1e-9a10-0000000000a5', name: 'MDF 25 mm', category: 'Sheet materials', subcategory: 'MDF', unit: 'sheet', thickness: '25', cost_per_unit: 31,
});
const ROW18 = toMaterial({
  id: 'b6a1f3d2-0001-4c1e-9a10-0000000000a8', name: 'Egger H3325 18 mm', category: 'Sheet materials', subcategory: 'Melamine', unit: 'sheet', thickness: '18', cost_per_unit: 40,
});
const STOCK = [ROW25, ROW18];
const DESIGN_18 = {
  carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'egger', finish_id: 'egger:H3325_28', material_id: ROW25.id }] },
  fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' } }] },
};

/** A base unit cut from a design's slots, and its left side's catalogue entry. */
function cutSide(design) {
  const params = { ...defaultParamsFor('BUD', P), unit_num: '01', drawers: 0, thickness_slots: projectThicknesses({ design, profile: P, materials: STOCK }) };
  const result = computeCabinet({ type: 'BUD', ...params }, P);
  const side = result.panels.find((p) => p.id === 'BUL');
  return { side, catalogueId: resolvePanelMaterial(side, { id: 'u', type: 'BUD', params }, design, P, STOCK).catalogue_id };
}

test('B2 · an 18 mm design whose carcass 1 is a 25 mm stock row: 18 as main until migrated, 25 after, and the catalogue follows', () => {
  // Before: the settings say 18 (the stock row is never read at cut time, the owner 18:04).
  assert.equal(slotNominal('carcass1', { design: DESIGN_18, profile: P, materials: STOCK }), 18);
  const before = cutSide(DESIGN_18);
  assert.deepEqual([before.side.thickness, before.catalogueId], [18, 'sheet.egger.h3325_28.18']);
  // The one time move.
  const out = migrateStockThickness(DESIGN_18, STOCK, P);
  assert.ok(out, 'something moved');
  assert.deepEqual(out.moved.filter((m) => !m.pinned), [{ slotId: 'carcass1', from: 18, to: 25 }]);
  assert.equal(out.design.thickness.slots.carcass1.measured, 25, 'written into the settings field the engine reads first');
  assert.equal(slotThickness('carcass1', { design: out.design, profile: P }), 25, 'no stock needed at cut time any more');
  const after = cutSide(out.design);
  assert.deepEqual([after.side.thickness, after.catalogueId], [25, 'sheet.egger.h3325_28.25'], 'the board is the 25 mm entry');
  assert.equal(entryById(after.catalogueId).thickness, 25);
  // The drawer box keeps what it cut (it never inherited the stock row on c3542b9).
  assert.equal(projectThicknesses({ design: DESIGN_18, profile: P }).box, 18);
  assert.equal(projectThicknesses({ design: out.design, profile: P }).box, 18);
  // Nothing else in the design changed, and the input is not mutated.
  assert.equal(out.design.carcass, DESIGN_18.carcass);
  assert.equal(out.design.fronts, DESIGN_18.fronts);
  assert.equal(DESIGN_18.thickness, undefined);
  // Idempotent.
  assert.equal(migrateStockThickness(out.design, STOCK, P), null, 'a second call moves nothing');
});

test('B2 · not touched: a slot with its own measured value, a generic or old CC id, a row of the same thickness, no stock', () => {
  const measured = { ...DESIGN_18, thickness: { slots: { carcass1: { measured: 18.5, confirmed: true } } } };
  assert.equal(migrateStockThickness(measured, STOCK, P), null, 'the caliper always wins');
  for (const id of ['generic-25', 'mat_mdf25_shaker', 'mat_mdf18']) {
    const old = { ...DESIGN_18, carcass: { types: [{ ...DESIGN_18.carcass.types[0], material_id: id }] } };
    const pinned = [...STOCK, { id, thickness: 30 }];
    assert.equal(migrateStockThickness(old, pinned, P), null, `${id} pins through the old-id table, never moved`);
  }
  const same = { ...DESIGN_18, carcass: { types: [{ ...DESIGN_18.carcass.types[0], material_id: ROW18.id }] } };
  assert.equal(migrateStockThickness(same, STOCK, P), null, 'an 18 mm row on an 18 mm slot');
  assert.equal(migrateStockThickness(DESIGN_18, [], P), null, 'the stock not loaded');
  assert.equal(migrateStockThickness(DESIGN_18, null, P), null);
  const unknown = { ...DESIGN_18, carcass: { types: [{ ...DESIGN_18.carcass.types[0], material_id: 'b6a1f3d2-ffff-4c1e-9a10-000000000000' }] } };
  assert.equal(migrateStockThickness(unknown, STOCK, P), null, 'a uuid the stock does not hold is never guessed');
});

test('B2 · a front slot moves the same way, and a box with its own number is not pinned', () => {
  const design = {
    ...DESIGN_18,
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'egger', finish_id: 'egger:H3325_28' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red' }, material_id: ROW25.id }] },
    thickness: { slots: { box: { measured: 16, confirmed: true } } },
  };
  const out = migrateStockThickness(design, STOCK, P);
  assert.deepEqual(out.moved, [{ slotId: 'front1', from: 18, to: 25 }]);
  assert.equal(out.design.thickness.slots.box.measured, 16, 'the box keeps its own');
  assert.equal(projectThicknesses({ design: out.design, profile: P }).front1, 25);
});

// ─── B3 · THE SCREWS, ONE LINE ───────────────────────────────────────────────

test('B3 · one Screws line: the 3 mm screw pilots, the hinge cups excluded, runners and plates never screw kinds', () => {
  const drills = [
    { kind: 'screw', d: 3 }, { kind: 'back_screw', d: 3 }, { kind: 'front_screw', d: 3 }, { kind: 'rail_screw', d: 3 },
    { kind: 'cup_screw', d: 3 }, { kind: 'cup_screw', d: 3 }, // a hinge's own
    { kind: 'runner', d: 3 }, { kind: 'hinge', d: 5 }, { kind: 'cup', d: 35 }, // not screw kinds
    { kind: 'screw', d: 4 }, // another diameter: not the carcass's screw
  ];
  assert.equal(P.puzzle.screwDiameter, 3, 'the number is the profile\'s');
  assert.equal(screwPilotCount(drills, P), 4);
  const entries = t43Entries(P);
  const all = entries.flatMap((e) => e.result.drills || []);
  const expect = all.filter((d) => /screw/.test(d.kind) && d.kind !== 'cup_screw' && Number(d.d) === 3).length;
  assert.ok(all.some((d) => d.kind === 'cup_screw'), 'the fixture has hinge cups');
  const rows = purchaseBom(entries, { profile: P, design: T43_DESIGN }).rows.filter((r) => r.roles.includes('screws'));
  assert.equal(rows.length, 1, 'ONE Screws line');
  assert.deepEqual([rows[0].key, rows[0].qty], ['cat:screw.pilot-3', expect]);
  assert.equal(expect, 154, 't43: 178 screw holes less its 24 cup screws');
  assert.equal(catalogueIdOfLine({ role: 'screws', spec: { d: 3 } }).id, 'screw.pilot-3', 'the ledger id still resolves');
});

// ─── B4 · THE SOLVENT ON THE PRIMER TOO ──────────────────────────────────────

test('B4 · the solvent is solventPct of the colours and the primer', () => {
  const entries = [{ unit: { id: 'u', type: 'BUD', params: defaultParamsFor('BUD', P) }, result: computeCabinet({ type: 'BUD', ...defaultParamsFor('BUD', P) }, P) }];
  const design = { fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' } }] } };
  const lines = paintLinesFor(entries, { design, profile: P });
  const sum = lines.filter((l) => l.role === 'paint' || l.role === 'primer').reduce((s, l) => s + l.litres, 0);
  const solvent = lines.find((l) => l.role === 'solvent');
  assert.ok(lines.find((l) => l.role === 'primer').litres > 0);
  assert.equal(solvent.litres, Math.round(sum * P.spray.solventPct * 100) / 10000);
});

// ─── B5 · NO PRICE IS NOT A PRICE ────────────────────────────────────────────

const cab = (id, type, over = {}) => {
  const params = { ...defaultParamsFor(type, P), unit_num: id, ...over };
  return { unit: { id, type, params }, result: computeCabinet({ type, ...params }, P) };
};
const hw = (id, name, cost) => toMaterial({ id, name, category: 'Hardware', subcategory: 'Hinges', unit: 'pcs', cost_per_unit: cost });
const lnk = (cc, stock, extra = {}) => [cc, { cc_material_id: cc, stock_item_id: stock, yield: null, sheet_width_mm: null, sheet_length_mm: null, coverage_m2_per_l: null, ...extra }];
const HINGE = 'hinge.blum.clip-top.155.nickel';

test('B5 · a linked row priced 0 is "No price": no price in the total, counted incomplete', () => {
  const job = [cab('01', 'BUD', { front_t: 18 })];
  const links = new Map([lnk(HINGE, 'h0')]);
  const pb = purchaseBom(job, { links, stock: [hw('h0', 'Hinge at nothing', 0)], profile: P, design: {} });
  const r = pb.rows.find((x) => x.catalogueId === HINGE);
  assert.deepEqual([r.status, r.words, r.price, r.lineCost], ['no-price', 'No price', null, null]);
  assert.equal(LINK_WORDS.noPrice, 'No price');
  assert.ok(INCOMPLETE_STATUSES.includes('no-price'));
  assert.ok(pb.totals.incomplete >= 1 && pb.totals.noPrice === 1 && pb.totals.complete === false);
  const priced = purchaseBom(job, { links, stock: [hw('h0', 'Hinge', 4)], profile: P, design: {} });
  assert.equal(priced.rows.find((x) => x.catalogueId === HINGE).status, 'linked');
  assert.equal(priced.totals.incomplete, pb.totals.incomplete - 1, 'the one row is the difference');
  // The quoted price of T75 F21 still wins: a quote over a stock row at 0 is a price.
  const quoted = purchaseBom(job, { links, stock: [hw('h0', 'Hinge', 0)], profile: P, design: {}, pricedAt: { prices: { h0: { price: 3.5 } } } });
  const q = quoted.rows.find((x) => x.catalogueId === HINGE);
  assert.deepEqual([q.status, q.price, q.price_source], ['linked', 3.5, 'quoted']);
  // The stock not loaded is still "linked", unpriced (T-CC2a F5.3).
  assert.equal(purchaseBom(job, { links, stock: null, profile: P, design: {} }).rows.find((x) => x.catalogueId === HINGE).status, 'linked');
});

test('B5 · a bespoke row at 0 is "No price"; "Supplied by client" stays 0 and complete', () => {
  const bespoke = [
    { id: 'b1', name: 'Brass knobs', qty: 6, unit: 'pcs', price: 0, suppliedByClient: false },
    { id: 'b2', name: 'Client glass', qty: 2, unit: 'pcs', price: 0, suppliedByClient: true },
    { id: 'b3', name: 'Leather pulls', qty: 2, unit: 'pcs', price: 12, suppliedByClient: false },
  ];
  const rows = purchaseBom([], { profile: P, design: {}, bespoke }).rows;
  const by = (id) => rows.find((r) => r.key === `bespoke:${id}`);
  assert.deepEqual([by('b1').status, by('b1').words, by('b1').price, by('b1').lineCost, by('b1').bespoke], ['no-price', 'No price', null, null, true]);
  assert.deepEqual([by('b2').status, by('b2').price, by('b2').lineCost], ['bespoke', 0, 0]);
  assert.deepEqual([by('b3').status, by('b3').lineCost], ['bespoke', 24]);
  const t = purchaseBom([], { profile: P, design: {}, bespoke }).totals;
  assert.deepEqual([t.incomplete, t.cost, t.complete], [1, 24, false]);
  assert.equal(t.words, 'Incomplete total, 1 line not linked or without a price', 'a line without a price is not "not linked"');
});

test('B5 · the incomplete words: T-CC2a\'s when every line is not linked, "or without a price" only when one has no price', () => {
  assert.equal(incompleteWords(3), 'Incomplete total, 3 lines not linked');
  assert.equal(incompleteWords(3, 0), 'Incomplete total, 3 lines not linked');
  assert.equal(incompleteWords(3, 1), 'Incomplete total, 3 lines not linked or without a price');
  assert.equal(incompleteWords(1, 1), 'Incomplete total, 1 line not linked or without a price');
  const notLinkedOnly = purchaseBom([cab('01', 'BUD', { front_t: 18 })], { profile: P, design: {} }).totals;
  assert.equal(notLinkedOnly.noPrice, 0);
  assert.equal(notLinkedOnly.words, incompleteWords(notLinkedOnly.incomplete));
});

// ─── B6 · THE ORDER TAB COUNTS THE PURCHASE LIST'S SHEETS ────────────────────

test('B6 · with links the Order tab\'s sheets are the purchase list\'s, per entry; no size gives no count and the words', () => {
  const entries = t43Entries(P);
  const bom = buildBom(entries, { design: T43_DESIGN, profile: P });
  const ids = [...new Set(bom.cutRows.map((r) => r.catalogue_id).filter(Boolean))].sort();
  assert.ok(ids.length >= 1, 'the fixture cuts catalogue boards');
  const sized = ids[0];
  const links = new Map([lnk(sized, 's1', { sheet_width_mm: 2440, sheet_length_mm: 1220, yield: 1.05 })]);
  const stock = [toMaterial({ id: 's1', name: 'Board', category: 'Sheet materials', unit: 'sheet', thickness: '18', cost_per_unit: 30 })];
  const purchase = purchaseBom(entries, { links, stock, profile: P, design: T43_DESIGN }).rows.find((r) => r.catalogueId === sized);
  const order = materialsSummary(bom, P, { links });
  const row = order.find((g) => g.catalogueId === sized);
  assert.equal(order.filter((g) => g.catalogueId === sized).length, 1, 'one row per entry, as the purchase list');
  assert.ok(purchase.sheets > 0);
  assert.equal(row.sheets, purchase.sheets, 'the SAME number');
  assert.deepEqual(row.sheetSize, purchase.sheetSize);
  assert.deepEqual(row.sheetSize, { width_mm: 2440, length_mm: 1220 });
  assert.equal(row.waste_pct, 5, 'the link\'s own yield');
  assert.equal(row.sheet_label, `${row.sheets} sheet${row.sheets === 1 ? '' : 's'} of 2440×1220`);
  assert.equal(row.yield, 1.05, 'each row its own yield (the header must not read one row for all)');
  for (const g of order.filter((x) => x.catalogueId && x.catalogueId !== sized && x.net_m2 > 0)) {
    assert.deepEqual([g.sheets, g.sheetSize, g.words], [null, null, 'Not linked'], `${g.label}: not linked says so`);
    assert.equal(g.yield, P.materials.sheetYield, 'no link: the company\'s yield');
  }
  // A LINKED sheet with no size, and only that, says "Sheet size missing".
  const noSize = new Map([lnk(sized, 's1')]);
  const r2 = materialsSummary(bom, P, { links: noSize }).find((g) => g.catalogueId === sized);
  assert.deepEqual([r2.sheets, r2.sheetSize, r2.words], [null, null, 'Sheet size missing, add it in Link materials']);
  assert.equal(purchaseBom(entries, { links: noSize, stock, profile: P, design: T43_DESIGN }).rows.find((r) => r.catalogueId === sized).words, r2.words, 'the purchase list\'s words');
});

test('B6 · without links the Order tab is today\'s, on the profile\'s purchase sheet', () => {
  const entries = t43Entries(P);
  const bom = buildBom(entries, { design: T43_DESIGN, profile: P });
  const today = materialsSummary(bom, P);
  assert.deepEqual(materialsSummary(bom, P, {}), today);
  assert.ok(today.length > 0);
  for (const g of today) {
    assert.match(g.sheet_label, /^~\d+ sheets? of 2800×2070$/);
    assert.equal(g.sheetSize, undefined, 'no new fields on the old road');
  }
});
