/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F3 . ONE SOURCE OF A BOARD (CLAUDE.md T-CC2a law 2, FROZEN 1). The
// owner, 01.11.2026, 12:14: *"do wszystkich plyt na przyklad MDF 18 mamy
// przypisany material z JC MAT 018 MDF 18 i jak program go wybierze to bedzie
// na liscie BOM z przypisanym materialem"*.
//
// THE BEFORE NUMBERS are main's (origin/main at c3542b9, the merge of PR #96):
// `git archive origin/main src reference public/decors test/fixtures` into a
// scratch directory, the four owner projects opened through main's own store
// (`allResults`) and the two fixture jobs through main's `buildBom`, every cut
// row reduced to [unit, part, w, h, qty, thickness, role], sorted, and hashed
// (sha256). This test computes the same reduction through tonight's code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { loadHardwareCatalogues } = await import('../src/lib/hardwareCatalogue.js');
loadHardwareCatalogues();
const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');
const { buildBom, purchaseBom } = await import('../src/engine/bom.js');
const { resolvePanelMaterial } = await import('../src/engine/materials.js');
const { projectThicknesses } = await import('../src/engine/thickness.js');
const { migrateDesign } = await import('../src/engine/design.js');
const { boardChoiceOfOldId, migrateBoardChoices, OLD_CC_IDS } = await import('../src/engine/catalogue.js');
const { t43Entries, T43_DESIGN } = await import('./fixtures/t43-kitchen.js');
const { hhEntries } = await import('./fixtures/t71-herbal-hill.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { GENERIC_MATERIALS } = await import('../src/stores/materialAssignmentStore.js');

const ROOT = new URL('../', import.meta.url).pathname;
const OWNER = join(ROOT, 'test/fixtures/owner-projects');

/** main, c3542b9: the cut list of each job, reduced and hashed (see the header). */
const BEFORE = {
  '0002-test-wardrobe-28.10.2026.ccproject': {
    pieces: 10, rows: 10, area: 6.3592, thicknesses: [18], sha: '1af7bc496c5ca62e619ab69b4af34dab6978ca870d3910c572d6e403520e8b72',
  },
  '0002-test-wardrobe-30.10.2026.ccproject': {
    pieces: 8, rows: 8, area: 8.2852, thicknesses: [18], sha: '31f9f455cf80958e68892dc237b2f7b46c622577140f1e5ee58cc7c3eb3fea6d',
  },
  '0003-black-kitchen-31.10.2026.ccproject': {
    pieces: 98, rows: 98, area: 33.7489, thicknesses: [18, 22, 40, 45, 200], sha: 'f1fa0c73bc0a914c9c1e4c0a7e2adc4209bb01e80a81876990bf9342a2c4a69f',
  },
  '0004-project-0004-30.10.2026.ccproject': {
    pieces: 48, rows: 49, area: 9.0856, thicknesses: [0, 18, 25, 40], sha: 'cb8c8c72f47fa9e1d851c24a05ee31fe53c292f9e1a51cebc5a6bb3492950730',
  },
  t43: {
    pieces: 54, rows: 54, area: 13.3889, thicknesses: [18, 25], sha: 'a35b4cadcfb66d923877459e9003555cc7946fe4a20222c9465bf79517b16c66',
  },
  hh: {
    pieces: 121, rows: 121, area: 34.2649, thicknesses: [18, 25], sha: '55902217c47ec415f3d4af5e0a2566cb8b9a00f79b4d5ff335ac893683e3a3df',
  },
};
/** main, c3542b9: the six slots of each owner project (engine/thickness.js projectThicknesses, the store's generics). */
const SLOTS_BEFORE = {
  '0002-test-wardrobe-28.10.2026.ccproject': { carcass1: 18, carcass2: 18, carcass3: 18, front1: 18, front2: 25, box: 18 },
  '0002-test-wardrobe-30.10.2026.ccproject': { carcass1: 18, carcass2: 18, carcass3: 18, front1: 18, front2: 25, box: 18 },
  '0003-black-kitchen-31.10.2026.ccproject': { carcass1: 18, carcass2: 18, carcass3: 18, front1: 18, front2: 25, box: 18 },
  '0004-project-0004-30.10.2026.ccproject': { carcass1: 18, carcass2: 18, carcass3: 18, front1: 25, front2: 25, box: 18 },
};
/** The board entries each owner project resolves to tonight (the PR lists them). */
const RESOLVED = {
  '0002-test-wardrobe-28.10.2026.ccproject': ['sheet.egger.h3325_28.18', 'sheet.mdf.18'],
  '0002-test-wardrobe-30.10.2026.ccproject': ['sheet.egger.h3325_28.18', 'sheet.mdf.18'],
  '0003-black-kitchen-31.10.2026.ccproject': ['sheet.egger.h3171_12.18', 'sheet.mdf.18', 'sheet.mdf.22'],
  '0004-project-0004-30.10.2026.ccproject': ['sheet.egger.h3325_28.18', 'sheet.mdf.18', 'sheet.mdf.25'],
};

function summary(bom) {
  const rows = [];
  for (const u of bom.units) for (const r of u.rows) rows.push([String(u.unitNum), r.part, r.w, r.h, r.qty, r.thickness, r.role]);
  rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {
    pieces: bom.totals.pieces,
    rows: rows.length,
    area: bom.totals.area_m2,
    thicknesses: [...new Set(rows.map((r) => r[5]))].sort((a, b) => a - b),
    sha: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
  };
}

function jobs() {
  const out = [];
  for (const f of readdirSync(OWNER).sort()) {
    const j = JSON.parse(readFileSync(join(OWNER, f), 'utf8'));
    useProjectStore.setState({ project: { ...useProjectStore.getState().project, ...j.project }, units: j.units });
    out.push({ name: f, entries: useProjectStore.getState().allResults(), design: j.project.design, file: j });
  }
  out.push({ name: 't43', entries: t43Entries(P), design: T43_DESIGN });
  out.push({ name: 'hh', entries: hhEntries(P), design: {} });
  return out;
}
const JOBS = jobs();

test('F3.4 · the four owner projects and the fixture jobs: the cut list (dimensions, counts, thicknesses) IDENTICAL to main', () => {
  for (const job of JOBS) {
    const now = summary(buildBom(job.entries, { design: job.design, profile: P }));
    assert.deepEqual(now, BEFORE[job.name], `${job.name}: identical to main`);
  }
});

test('F3.3 · thickness.js reads no stock row: the owner projects\' six slots are main\'s, a JC row of 22 pins nothing', () => {
  for (const job of JOBS.filter((j) => SLOTS_BEFORE[j.name])) {
    assert.deepEqual(projectThicknesses({ design: migrateDesign(job.design), profile: P, materials: GENERIC_MATERIALS }), SLOTS_BEFORE[job.name], job.name);
  }
  const uuid = '7b1d2c3e-4f50-4a61-8b72-9c83d4e5f601';
  const design = migrateDesign({ carcass: { types: [{ id: 'c1', source: 'egger', finish_id: 'egger:H3325_28', material_id: uuid }] } });
  const slots = projectThicknesses({ design, profile: P, materials: [{ id: uuid, name: 'Egger 22', thickness: 22 }] });
  assert.equal(slots.carcass1, 18, 'the source decides (EGGER decor, 18), never a stock row');
  const generic = migrateDesign({ fronts: { types: [{ id: 'f1', source: 'spray', material_id: 'generic-25' }] } });
  assert.equal(projectThicknesses({ design: generic, profile: P, materials: [] }).front1, 25, 'a generic placeholder still pins its 25 through the old-id table');
  const src = readFileSync(join(ROOT, 'src/engine/thickness.js'), 'utf8');
  assert.doesNotMatch(src, /materials \|\| \[\]\)\.find\(\(m\) => m\.id === type\.material_id\)/, 'the stock-row lookup is gone');
});

test('F3.1/F3.2 · the cut list and the purchase list name the SAME catalogue id for every board part, area for area', () => {
  for (const job of JOBS) {
    const bom = buildBom(job.entries, { design: job.design, profile: P });
    const pb = purchaseBom(job.entries, { design: job.design, profile: P });
    const cut = new Map();
    for (const r of bom.cutRows) {
      if (!r.catalogue_id) continue;
      assert.equal(r.material_key, `cat:${r.catalogue_id}`, `${job.name} ${r.id}: grouped by the catalogue`);
      cut.set(r.catalogue_id, (cut.get(r.catalogue_id) || 0) + r.area_m2 * r.qty);
    }
    const bought = new Map(pb.rows.filter((r) => r.kind === 'sheet' && r.catalogueId).map((r) => [r.catalogueId, r.m2]));
    assert.deepEqual([...bought.keys()].sort(), [...cut.keys()].sort(), `${job.name}: the same entries`);
    for (const [id, m2] of cut) assert.ok(Math.abs(bought.get(id) - m2) < 1e-4, `${job.name} ${id}: ${bought.get(id)} vs ${m2}`);
    if (RESOLVED[job.name]) assert.deepEqual([...cut.keys()].sort(), RESOLVED[job.name], `${job.name}: the entries the PR lists`);
  }
});

test('F3.1 · the record keeps its finish, label and surface, and gains the catalogue id and the board choice', () => {
  const job = JOBS.find((j) => j.name.startsWith('0004'));
  const { unit, result } = job.entries[0];
  const front = result.panels.find((p) => p.role === 'front' && p.material_role === 'front');
  const r = resolvePanelMaterial(front, unit, job.design, P, GENERIC_MATERIALS);
  assert.equal(r.catalogue_id, 'sheet.mdf.25', 'a sprayed 25 mm front is MDF 25');
  assert.equal(r.key, 'cat:sheet.mdf.25');
  assert.equal(r.finish?.kind, 'spray', 'the 3D surface is the spray, as before');
  assert.equal(r.label, 'RAL 8028 Terra Brown spray', 'the cut list label is unchanged');
  assert.equal(r.material_id, 'generic-25', 'the stored id is read, never rewritten');
  assert.equal(r.board.source, 'spray');
});

test('F3.2 · bom.js reads no assignmentFor on the board road, and the purchase list is ONE road', () => {
  const src = readFileSync(join(ROOT, 'src/engine/bom.js'), 'utf8');
  const body = src.slice(src.indexOf('export function purchaseBom'), src.lastIndexOf('/**', src.indexOf('export function mergeUnitMaterials')));
  assert.ok(body.length > 1000);
  assert.doesNotMatch(body, /assignmentFor|normalizeAssignments|assignments/, 'the purchase list never reads the blob');
  const merge = src.slice(src.indexOf('export function mergeUnitMaterials'), src.indexOf('/**', src.indexOf('export function mergeUnitMaterials')));
  assert.match(merge, /return purchaseBom\(unitsIn, ctx\)\.rows;/, 'the T39 name is a door to the one road');
  assert.doesNotMatch(src, /qty \* rest\.costPerUnit/, 'the m2 row\'s qty x costPerUnit is gone');
});

test('F13 · the old-id table: every old CC id of the fixtures maps; a JC uuid never does; the migration is pure and idempotent', () => {
  for (const job of JOBS.filter((j) => j.file)) {
    const d = job.design;
    const ids = [...(d.carcass?.types || []), ...(d.fronts?.types || []), ...(d.doorStyles || [])].map((t) => t.material_id).filter(Boolean);
    for (const id of ids) assert.ok(boardChoiceOfOldId(id), `${job.name}: ${id} is in the table`);
    const once = migrateBoardChoices(d, P);
    assert.equal(once, d, `${job.name}: nothing to fill, the same object back`);
    const text = JSON.stringify(d);
    assert.equal(JSON.stringify(migrateBoardChoices(JSON.parse(text), P)), text, 'nothing is written');
  }
  assert.equal(boardChoiceOfOldId('5e0c4b1a-7f2d-4c3e-9a8b-000000000001'), null, 'a JC uuid is never mapped by name');
  assert.equal(boardChoiceOfOldId('hw_hinge_clip'), null, 'a hardware sample is not a board');
  assert.deepEqual(boardChoiceOfOldId('generic-25'), { source: 'generic', thickness: 25, pinsThickness: true });
  assert.deepEqual(Object.keys(OLD_CC_IDS).sort(), ['generic-18', 'generic-22', 'generic-25', 'mat_hdf6_back', 'mat_mdf18', 'mat_mdf25_shaker',
    'mat_mfc18_oak', 'mat_mfc18_white', 'mat_mfc19_front', 'mat_mfc22_white', 'mat_ply18_birch']);
  // A run piece on its own old board gets its choice once; a second pass changes nothing; the stored id stays.
  const run = { runMaterials: { plinth: { sameAsFronts: false, material_id: 'mat_mdf18' } } };
  const a = migrateBoardChoices(run, P);
  assert.deepEqual(a.boards.plinth, { source: 'mdf', thickness: 18 });
  assert.equal(a.runMaterials.plinth.material_id, 'mat_mdf18');
  assert.equal(migrateBoardChoices(a, P), a, 'idempotent');
});

test('F3 · the owner\'s 0003 (saved 31.10 on mat_mfc19_front, board 19): main cuts its carcass at 18 and so does tonight', () => {
  const job = JOBS.find((j) => j.name.startsWith('0003'));
  assert.equal(job.design.carcass.types[0].material_id, 'mat_mfc19_front');
  assert.equal(job.design.thickness.board, 19);
  const sides = job.entries.flatMap((e) => e.result.panels).filter((p) => p.role === 'side');
  assert.ok(sides.length && sides.every((p) => p.thickness === 18), 'FROZEN 1: what main cuts (the PR names it for the owner)');
  assert.equal(OLD_CC_IDS.mat_mfc19_front.thickness, 19, 'the table keeps what the id meant');
  assert.equal(OLD_CC_IDS.mat_mfc19_front.pinsThickness, undefined, 'and does not pin it: it has pinned nothing since T-CC1b F9');
});

test('F11.2 (engine half) · design.boards: a back and a drawer bottom moved to another sheet move in the cut list and the purchase list together', () => {
  const job = JOBS.find((j) => j.name.startsWith('0004'));
  const moved = {
    ...job.design,
    boards: { back: { source: 'mdf' }, drawerBottom: { source: 'egger', finishId: 'egger:U999_12' } },
  };
  assert.deepEqual(migrateDesign(moved).boards, { back: { source: 'mdf' }, drawerBottom: { source: 'egger', finishId: 'egger:U999_12' } }, 'the passthrough keeps the two choices');
  assert.equal(migrateDesign(job.design).boards, undefined, 'a design saved before tonight gains no key');
  const cut = buildBom(job.entries, { design: moved, profile: P }).cutRows;
  const backs = cut.filter((r) => r.role === 'back');
  const bottoms = cut.filter((r) => r.part === 'DRAWER-BOTTOM');
  assert.ok(backs.length && bottoms.length);
  assert.ok(backs.every((r) => r.catalogue_id === `sheet.mdf.${r.thickness}`));
  assert.ok(bottoms.every((r) => r.catalogue_id === `sheet.egger.u999_12.${r.thickness}`));
  assert.ok(bottoms.every((r) => r.material_label === `Egger U999 ST12 Black, ${r.thickness} mm`), 'the cut list says the sheet it is cut from');
  const pb = purchaseBom(job.entries, { design: moved, profile: P });
  const bottomM2 = bottoms.reduce((s, r) => s + r.area_m2 * r.qty, 0);
  const row = pb.rows.find((r) => r.catalogueId === `sheet.egger.u999_12.${bottoms[0].thickness}`);
  assert.ok(Math.abs(row.m2 - bottomM2) < 1e-4, 'the purchase list follows (one source)');
  assert.deepEqual(summary(buildBom(job.entries, { design: moved, profile: P })), BEFORE[job.name], 'the geometry does not move');
});

test('F11.3 (engine half) · a new item starts on H3325 ST28 and sprayed RAL 3005 on MDF 18, the retail defaults; a company\'s own win', async () => {
  const { newItemBoardDefaults, NEW_ITEM_FRONT_COLOUR, validateCompanyDefaults } = await import('../src/engine/companyDefaults.js');
  const { catalogueIdOfBoard } = await import('../src/engine/catalogue.js');
  const d = newItemBoardDefaults(P, null);
  assert.deepEqual(d.carcass, { source: 'egger', finish_id: 'egger:H3325_28' });
  assert.equal(P.projectSettings.defaultCarcassDecorId, 'H3325_28');
  assert.deepEqual(d.front, { source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' }, thickness: 18 });
  assert.deepEqual(d.boards, { back: null, drawerBottom: null }, 'As today');
  assert.equal(catalogueIdOfBoard({ ...d.carcass, thickness: 18 }, P).id, 'sheet.egger.h3325_28.18');
  assert.equal(catalogueIdOfBoard(d.front, P).id, 'sheet.mdf.18');
  // Read, not edited: the retail adapter's own two names.
  const retail = readFileSync(join(ROOT, 'src/retail/design/adapter.js'), 'utf8');
  assert.match(retail, new RegExp(`RAL_WINE_NAME = '${NEW_ITEM_FRONT_COLOUR.name}'`));
  assert.match(retail, /DEFAULT_CARCASS_DECOR = 'H3325_28'/);
  const { value } = validateCompanyDefaults({ item_boards: { back: { source: 'mdf', thickness: 18 }, front: { source: 'raw' } } }, P);
  const own = newItemBoardDefaults(P, value);
  assert.deepEqual(own.front, { source: 'raw' }, 'the company\'s own front wins');
  assert.deepEqual(own.boards.back, { source: 'mdf', thickness: 18 });
  assert.deepEqual(own.carcass, d.carcass, 'and Cabinet Core\'s carcass stands where the company said nothing');
});
