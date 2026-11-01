/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// THE UX TURN, THE ENGINE'S POINTS (Bruno): B1 the wizard's gate asks the
// catalogue, the board bought is the slot's nominal and never the caliper (the
// owner, 18:46), B3 the screws as one line, B4 the solvent on the primer too,
// B5 no price is not a price, B6 the Order tab counts the purchase list's sheets.
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
  projectThicknesses, slotNominal, slotThickness,
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

// ─── THE BOARD BOUGHT IS THE ONE CHOSEN, NEVER THE CALIPER (the owner, 18:46) ─
// *"tak katalogi i BOM biora to co wybral klient, 18.5 to tylko ciecie dla CNC,
// nie dla zakupow, to sie nie moze laczyc"*. The cut keeps the measured number;
// the catalogue entry takes the slot's nominal.

const H3325 = { id: 'c1', label: 'Carcass 1', source: 'egger', finish_id: 'egger:H3325_28' };
const WINE = { id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' } };

/** One kit cut from a design's slots: every piece with its cut thickness and its catalogue entry. */
function cutPieces(design, type = 'BUDR') {
  const params = { ...defaultParamsFor(type, P), unit_num: '01', thickness_slots: projectThicknesses({ design, profile: P }) };
  const result = computeCabinet({ type, ...params }, P);
  const unit = { id: 'u', type, params };
  return result.panels.map((p) => ({ p, unit, ...resolvePanelMaterial(p, unit, design, P, []) }));
}

test('nominal · an 18 mm H3325 carcass measured 18.5 cuts at 18.5 and buys sheet.egger.h3325_28.18 (main: "Not in the catalogue yet")', () => {
  const design = { carcass: { types: [H3325] }, fronts: { types: [WINE] }, thickness: { slots: { carcass1: { measured: 18.5, confirmed: true } } } };
  assert.equal(slotThickness('carcass1', { design, profile: P }), 18.5, 'the CNC cuts at the caliper');
  assert.equal(slotNominal('carcass1', { design, profile: P }), 18, 'the client chose 18');
  const pieces = cutPieces(design);
  const side = pieces.find((x) => x.p.id === 'BUL');
  assert.deepEqual([side.p.thickness, side.catalogue_id], [18.5, 'sheet.egger.h3325_28.18']);
  // The pieces T-CC2a F11 and the box name: the back, the drawer box (it inherits carcass 1's number), the drawer bottom.
  for (const part of ['BACK', 'DRAWER-SIDE', 'DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK', 'DRAWER-BOTTOM']) {
    const x = pieces.find((y) => y.p.part === part);
    assert.ok(x, `the kit has a ${part}`);
    assert.deepEqual([x.p.thickness, x.catalogue_id], [18.5, 'sheet.egger.h3325_28.18'], part);
  }
  const front = pieces.find((x) => x.p.part === 'DRAWER-FRONT');
  assert.equal(front.catalogue_id, 'sheet.mdf.18');
  // The purchase list and the Order tab read the cut list's ids: one board line, at 18, no "not in the catalogue".
  const entries = [{ unit: pieces[0].unit, result: computeCabinet({ type: 'BUDR', ...pieces[0].unit.params }, P) }];
  const rows = purchaseBom(entries, { profile: P, design }).rows.filter((r) => r.kind === 'sheet');
  assert.deepEqual(rows.map((r) => r.catalogueId).sort(), ['sheet.egger.h3325_28.18', 'sheet.mdf.18']);
  const order = materialsSummary(buildBom(entries, { design, profile: P }), P, { links: new Map() });
  assert.ok(order.every((g) => g.words !== 'Not in the catalogue yet'), 'the Order tab finds every board');
});

test('nominal · a front measured 18.3 buys MDF 18; a 25 mm choice stays 25 in the catalogue, measured or not', () => {
  const front = { carcass: { types: [H3325] }, fronts: { types: [WINE] }, thickness: { slots: { front1: { measured: 18.3, confirmed: true } } } };
  const door = cutPieces(front, 'BUD').find((x) => x.p.part === 'FRONT');
  assert.deepEqual([door.p.thickness, door.catalogue_id], [18.3, 'sheet.mdf.18']);
  // The project's carcass board chosen at 25 (the selector, `thickness.board`), the decor on the type.
  for (const measured of [null, 25.4]) {
    const design = {
      carcass: { types: [{ id: 'c1', label: 'Carcass 1', finish_id: 'egger:H3325_28' }] },
      fronts: { types: [WINE] },
      thickness: { board: 25, slots: { carcass1: { measured, confirmed: measured != null } } },
    };
    const side = cutPieces(design, 'BUD').find((x) => x.p.id === 'BUL');
    assert.deepEqual([side.p.thickness, side.catalogue_id], [measured ?? 25, 'sheet.egger.h3325_28.25'], `measured ${measured}`);
  }
  // A Generic 25 stock board (its thickness pinned through the old-id table), measured 25.3: Generic 25.
  const generic = {
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-25' }] },
    fronts: { types: [WINE] },
    thickness: { slots: { carcass1: { measured: 25.3, confirmed: true } } },
  };
  const g = cutPieces(generic, 'BUD').find((x) => x.p.id === 'BUL');
  assert.deepEqual([g.p.thickness, g.catalogue_id], [25.3, 'sheet.generic.25']);
});

test('nominal · a piece with a number of its own (a thickness override) is bought at its own number; nothing measured, nothing moves', () => {
  const design = { carcass: { types: [H3325] }, fronts: { types: [WINE] }, thickness: { slots: { carcass1: { measured: 18.5, confirmed: true } } } };
  const { unit } = cutPieces(design, 'BUD')[0];
  const shelf = { id: 'S1', part: 'SHELF', role: 'shelf', material_role: 'board', thickness: 25, w: 500, h: 500 };
  assert.equal(resolvePanelMaterial(shelf, unit, design, P, []).catalogue_id, 'sheet.egger.h3325_28.25');
  // With no caliper anywhere the nominal IS the cut number: every piece resolves as it did.
  const plain = { carcass: { types: [H3325] }, fronts: { types: [WINE] } };
  for (const x of cutPieces(plain)) {
    if (x.catalogue_id) assert.equal(entryById(x.catalogue_id).thickness, x.p.thickness, x.p.part);
  }
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
