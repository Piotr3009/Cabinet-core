/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F5 . ONE PRODUCT, ONE LINE (CLAUDE.md T-CC2a laws 4, 5, 7). The
// owner, 01.11.2026, 12:34: *"jedne produkt osobna linia, proste"*; 13:28: JC
// deletes a stock row: *"u nas sie robi unassign, tenant musi podpiac inny
// material, to wszystko ... nie blokujemy"*; price: *"srednia"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { loadHardwareCatalogues } = await import('../src/lib/hardwareCatalogue.js');
loadHardwareCatalogues();
const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');
const {
  buildBom, purchaseBom, LINK_WORDS, incompleteWords, INCOMPLETE_STATUSES, mergeUnitMaterials,
} = await import('../src/engine/bom.js');
const { computeCabinet } = await import('../src/engine/cabinet.js');
const { defaultParamsFor } = await import('../src/engine/types.js');
const { toMaterial } = await import('../src/lib/jcStock.js');
const { t43Entries, T43_DESIGN } = await import('./fixtures/t43-kitchen.js');
const { hhEntries } = await import('./fixtures/t71-herbal-hill.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');

const ROOT = new URL('../', import.meta.url).pathname;
const OWNER = join(ROOT, 'test/fixtures/owner-projects');

const unit = (id, type, over = {}) => {
  const params = { ...defaultParamsFor(type, P), unit_num: id, ...over };
  return { unit: { id, type, params }, result: computeCabinet({ type, ...params }, P) };
};
/** A Joinery Core stock row, through T-CC1b's own mapping (the weighted average JC keeps is `cost_per_unit`). */
const row = (id, name, cost, unit = 'pcs', extra = {}) => toMaterial({
  id, name, category: 'Hardware', subcategory: 'Hinges', unit, current_quantity: 10, cost_per_unit: cost, item_number: `IT-${id}`, image_url: `https://x/${id}.jpg`, ...extra,
});
const link = (cc, stock, extra = {}) => ({ cc_material_id: cc, stock_item_id: stock, yield: null, sheet_width_mm: null, sheet_length_mm: null, coverage_m2_per_l: null, ...extra });

// Two doors on two front boards: an 18 mm front takes the 155 hinge, a 25 mm shaker the 110 (cliptop-hinges.json rules).
const TWO_HINGES = [unit('01', 'BUD', { front_t: 18 }), unit('02', 'BUD', { front_t: 25 })];

test('F5.1 · two hinge kinds on two products are two lines with two prices (the T-CC1b audit\'s hinge case)', () => {
  const ids = buildBom(TWO_HINGES, { profile: P }).hardware.filter((h) => h.role === 'hinges').map((h) => h.spec.angle);
  assert.deepEqual([...new Set(ids)].sort(), [110, 155], 'the engine hangs the two doors on two hinges');
  const links = new Map([
    ['hinge.blum.clip-top.155.nickel', link('hinge.blum.clip-top.155.nickel', 'h155')],
    ['hinge.blum.clip-top.110.nickel', link('hinge.blum.clip-top.110.nickel', 'h110')],
  ]);
  const stock = [row('h155', 'Blum 71B7550 CLIP top 155', 4.2), row('h110', 'Blum 71B3550 CLIP top 110', 2.9)];
  const pb = purchaseBom(TWO_HINGES, { links, stock, profile: P, design: {} });
  const hinges = pb.rows.filter((r) => r.roles.includes('hinges'));
  assert.equal(hinges.length, 2, 'one product, one line');
  const by = Object.fromEntries(hinges.map((r) => [r.catalogueId, r]));
  assert.equal(by['hinge.blum.clip-top.155.nickel'].price, 4.2);
  assert.equal(by['hinge.blum.clip-top.110.nickel'].price, 2.9);
  for (const r of hinges) {
    assert.equal(r.status, 'linked');
    assert.equal(r.words, null);
    assert.equal(r.key, `cat:${r.catalogueId}`);
    assert.equal(r.lineCost, Math.round(r.qty * r.price * 100) / 100);
    assert.equal(r.stock.item_number, `IT-${r.link.stock_item_id}`, 'the stock row rides the line: number, name, image');
    assert.ok(r.image_url && r.stockName);
  }
});

test('F5.1 · not linked, removed from the stock, not in the catalogue: three words, no price, all counted incomplete', () => {
  const links = new Map([['hinge.blum.clip-top.155.nickel', link('hinge.blum.clip-top.155.nickel', 'gone-from-jc')]]);
  const pb = purchaseBom([...TWO_HINGES, unit('03', 'MIRROR_CABINET')], { links, stock: [row('other', 'Other', 1)], profile: P, design: {} });
  const removed = pb.rows.find((r) => r.catalogueId === 'hinge.blum.clip-top.155.nickel');
  assert.equal(removed.status, 'removed');
  assert.equal(removed.words, 'Not linked (removed from your Joinery Core stock)');
  assert.equal(removed.price, null);
  assert.equal(removed.lineCost, null);
  const notLinked = pb.rows.find((r) => r.catalogueId === 'hinge.blum.clip-top.110.nickel');
  assert.deepEqual([notLinked.status, notLinked.words, notLinked.price], ['not-linked', 'Not linked', null]);
  const notIn = pb.rows.find((r) => r.status === 'not-in-catalogue');
  assert.ok(notIn, 'the mirror cabinet\'s owner-named hinge is not in the catalogue yet');
  assert.equal(notIn.words, 'Not in the catalogue yet');
  assert.equal(notIn.price, null);
  const n = pb.rows.filter((r) => INCOMPLETE_STATUSES.includes(r.status)).length;
  assert.equal(pb.totals.incomplete, n);
  assert.equal(pb.totals.notLinked, n);
  assert.equal(pb.totals.complete, false);
  assert.equal(pb.totals.words, `Incomplete total, ${n} lines not linked`);
  assert.equal(pb.rows.findIndex((r) => r.status === 'linked'), -1, 'nothing here is linked');
});

test('F5.3 · the incomplete words, and the stock not loaded is never read as "removed"', () => {
  assert.equal(incompleteWords(1), 'Incomplete total, 1 line not linked');
  assert.equal(incompleteWords(3), 'Incomplete total, 3 lines not linked');
  assert.deepEqual(LINK_WORDS, {
    notLinked: 'Not linked',
    removed: 'Not linked (removed from your Joinery Core stock)',
    notInCatalogue: 'Not in the catalogue yet',
    sheetSizeMissing: 'Sheet size missing, add it in Link materials',
    unitUnknown: 'Check the unit of this item in Joinery Core',
    // UX turn B5 (Ewa P9, Kamil P3): a price of 0 is no price.
    noPrice: 'No price',
  });
  const links = new Map([['hinge.blum.clip-top.155.nickel', link('hinge.blum.clip-top.155.nickel', 'h155')]]);
  const offline = purchaseBom(TWO_HINGES, { links, stock: null, profile: P, design: {} });
  const r = offline.rows.find((x) => x.catalogueId === 'hinge.blum.clip-top.155.nickel');
  assert.equal(r.status, 'linked', 'linked; the stock simply is not here to price it');
  assert.equal(r.price, null);
});

test('F5.1 · the quoted price of T75 F21 still wins over the stock row\'s average', () => {
  const links = new Map([['hinge.blum.clip-top.155.nickel', link('hinge.blum.clip-top.155.nickel', 'h155')]]);
  const stock = [row('h155', 'Blum 71B7550', 4.2)];
  const pricedAt = { at: '2026-11-01', prices: { h155: { price: 3.75 } } };
  const r = purchaseBom(TWO_HINGES, { links, stock, profile: P, design: {}, pricedAt }).rows.find((x) => x.catalogueId === 'hinge.blum.clip-top.155.nickel');
  assert.equal(r.price, 3.75);
  assert.equal(r.price_source, 'quoted');
  assert.equal(r.lineCost, Math.round(r.qty * 3.75 * 100) / 100);
});

/**
 * main, c3542b9: the purchase list's hardware quantities per role (mergeUnitMaterials, `part:` keys, nothing assigned).
 * UX turn B3 (the owner, 01.11.2026, 18:04, *"wkrety jako jeden ... z wyjatkiem zawiasow i runnersow"*): the
 * screws are ONE line without the hinge cups' own screws (`cup_screw`), so three jobs count fewer on purpose:
 * 0003 274 to 220 (54 cup screws), t43 178 to 154 (24), hh 419 to 335 (84). Every other number is main's.
 */
const MAIN = {
  '0002-test-wardrobe-28.10.2026.ccproject': { screws: 44, legs: 5, puzzle_screws: 28 },
  '0002-test-wardrobe-30.10.2026.ccproject': { screws: 36, legs: 6, puzzle_screws: 50 },
  '0003-black-kitchen-31.10.2026.ccproject': {
    hawa_foot: 1, cabineo_connector: 16, screws: 220, cornice: 3.169, runner_pairs: 3, handle: 12, hawa_connector: 1, hinge_plates: 27, hinges: 27, legs: 24, puzzle_screws: 260, runner_sync_rods: 3, shelf_pins: 28, hangers: 6,
  },
  '0004-project-0004-30.10.2026.ccproject': {
    cabineo_connector: 48, screws: 66, runner_pairs: 6, handle: 6, legs: 5, puzzle_screws: 24, runner_sync_rods: 6,
  },
  t43: {
    screws: 154, runner_pairs: 3, handle: 7, hinge_plates: 12, hinges: 12, legs: 16, puzzle_screws: 180, runner_sync_rods: 3, shelf_pins: 12, hangers: 2,
  },
  hh: {
    screws: 335, runner_pairs: 3, handle: 17, hinge_plates: 42, hinges: 42, legs: 25, puzzle_screws: 404, runner_sync_rods: 3, shelf_pins: 64, hangers: 12,
  },
};

test('F5.2 · ONE road: the hardware quantities per role equal the engine\'s, and main\'s purchase list, sum for sum', () => {
  const jobs = [];
  for (const f of readdirSync(OWNER).sort()) {
    const j = JSON.parse(readFileSync(join(OWNER, f), 'utf8'));
    useProjectStore.setState({ project: { ...useProjectStore.getState().project, ...j.project }, units: j.units });
    jobs.push({ name: f, entries: useProjectStore.getState().allResults(), design: j.project.design });
  }
  jobs.push({ name: 't43', entries: t43Entries(P), design: T43_DESIGN }, { name: 'hh', entries: hhEntries(P), design: {} });
  for (const job of jobs) {
    const rows = purchaseBom(job.entries, { profile: P, design: job.design }).rows;
    const sum = {};
    for (const r of rows) for (const role of r.roles) sum[role] = Math.round(((sum[role] || 0) + (r.roles.length === 1 ? r.qty : 0)) * 10000) / 10000;
    // The engine's own lines, role by role (buildBom().hardware, the BOM view's hardware block).
    const engine = {};
    for (const h of buildBom(job.entries, { design: job.design, profile: P }).hardware) {
      if (['appliance', 'extractor'].includes(h.role)) continue;
      engine[h.role] = Math.round(((engine[h.role] || 0) + h.qty) * 10000) / 10000;
    }
    for (const [role, q] of Object.entries(engine)) assert.equal(sum[role], q, `${job.name}: ${role} as the engine counts it`);
    for (const [role, q] of Object.entries(MAIN[job.name])) assert.equal(sum[role], q, `${job.name}: ${role} as main's purchase list counted it`);
  }
});

test('F5 · the T39 name is the one road, and the per-part blob is not read: an assignment changes nothing', () => {
  const blob = { schema: 3, base: { hinge: { material_id: 'h155' }, carcase_side: { material_id: 'h155' } }, hardware: { 'hinges|x': { material_id: 'h155' } } };
  const a = purchaseBom(TWO_HINGES, { profile: P, design: {}, assignments: blob, materials: [row('h155', 'x', 1)] });
  const b = purchaseBom(TWO_HINGES, { profile: P, design: {} });
  assert.deepEqual(a, b);
  assert.deepEqual(mergeUnitMaterials(TWO_HINGES, { profile: P, design: {} }), b.rows);
});

test('F5 · bespoke rows: this project\'s purchase rows, priced by their own price, never catalogue entries (law 9)', () => {
  const bespoke = [
    { id: 'b1', name: 'Client brass knobs', qty: 6, unit: 'pcs', price: 4.5, suppliedByClient: false },
    { id: 'b2', name: 'Client\'s own glass', qty: 2, unit: 'pcs', price: 30, suppliedByClient: true },
  ];
  const pb = purchaseBom(TWO_HINGES, { profile: P, design: {}, bespoke });
  const b1 = pb.rows.find((r) => r.key === 'bespoke:b1');
  const b2 = pb.rows.find((r) => r.key === 'bespoke:b2');
  assert.deepEqual([b1.status, b1.catalogueId, b1.lineCost, b1.bespoke], ['bespoke', null, 27, true]);
  assert.deepEqual([b2.price, b2.lineCost, b2.suppliedByClient], [0, 0, true], 'supplied by the client: nothing to buy');
  assert.ok(!INCOMPLETE_STATUSES.includes(b1.status), 'a bespoke row is not "not linked"');
});
