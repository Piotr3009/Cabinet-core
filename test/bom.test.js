// ─── BOM aggregation + export format ───
// The BOM layer sits between the engine and the UI/exports; these tests tie it
// back to the golden fixtures so an aggregation bug cannot hide behind a
// correct engine.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import { buildBom, materialDemand, demandCost } from '../src/engine/bom.js';
import { buildCuttingListCsv, exportFilename } from '../src/lib/exporters.js';
import { roundTo } from '../src/engine/format.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'fixtures');
const BUD = JSON.parse(readFileSync(join(FIXTURES, 'golden-bud.json'), 'utf8'));
const WARDROBE = JSON.parse(readFileSync(join(FIXTURES, 'golden-wardrobe.json'), 'utf8'));
const P = DEFAULT_CABINET_PROFILE;

const paramsFromInputs = (i) => ({
  type: i.type, width: i.width, height: i.height, depth: i.depth,
  board_t: i.board_t, front_t: i.front_t, front_type: i.front_type,
  shelves: i.shelves, drawers: i.drawers, rail: i.rail, rail_offset: i.rail_offset,
  hinge: i.hinge, unit_num: i.unit_num,
});

function entryFor(fixtureCase) {
  const result = computeCabinet(paramsFromInputs(fixtureCase.inputs), P);
  return { unit: { id: fixtureCase.id, params: {} }, result };
}

test('BOM totals match the golden fixture totals', async (t) => {
  const wa = WARDROBE.cases[0];
  const bom = buildBom([entryFor(wa)]);

  await t.test('areas and edging carry through unchanged', () => {
    // ─── TURN 42 (CLAUDE.md F1 / iron rule 4) ───────────────────────────────
    // The fixture is a record of the kit BEFORE the rail partitioner was cut
    // out of it, and CLAUDE.md keeps `fixtures/` untouched. So the one board
    // the kit stopped cutting is subtracted from the fixture's own figure,
    // using the fixture's own quoted area — see the long note in
    // `test/engine.test.js`, which does the same arithmetic for the same
    // reason. Nothing else about this BOM changed.
    const railPart = (wa.panels || []).find((r) => String(r.id).toUpperCase().includes('RAIL-PART'));
    const boardArea = roundTo(wa.totals.board_area_m2 - (railPart?.area_m2 || 0), 3);
    assert.equal(roundTo(bom.totals.board_area_m2, 3), boardArea);
    assert.equal(roundTo(bom.totals.front_area_m2, 3), wa.totals.front_area_m2);
    assert.equal(roundTo(bom.totals.edging_m, 2), wa.totals.edging_m);
  });

  await t.test('per-role totals add back up to the project totals', () => {
    const roleArea = bom.roles.reduce((s, r) => s + r.area_m2, 0);
    // ─── TURN 42: THE TOLERANCE IS THE ROUNDING, NOT A GUESS ────────────────
    // Every role's area is published rounded to 4 dp (`engine/bom.js:144`) and
    // the project total is rounded to 4 dp SEPARATELY (`:157`), so the sum of
    // the parts can differ from the whole by up to half a unit in the last
    // place per row. `1e-6` was tighter than the numbers it compared and held
    // only by luck — removing ONE board (the rail partitioner, T42-F1) was
    // enough to expose it at 1e-4 on this very fixture. The invariant is that
    // the roles ACCOUNT FOR THE WHOLE PROJECT, and it holds to the precision
    // the roles are quoted at.
    const slack = (bom.roles.length + 1) * 0.00005;
    assert.ok(Math.abs(roleArea - bom.totals.area_m2) <= slack,
      `role areas sum to the project area (${roleArea} vs ${bom.totals.area_m2}, slack ${slack})`);
    const rolePieces = bom.roles.reduce((s, r) => s + r.pieces, 0);
    assert.equal(rolePieces, bom.totals.pieces);
  });

  await t.test('every engine role is one of the seven BOM roles', () => {
    const allowed = new Set(['side', 'top', 'bottom', 'back', 'shelf', 'front', 'drawer_box']);
    for (const r of bom.roles) assert.ok(allowed.has(r.role), `unexpected role ${r.role}`);
  });
});

test('cutting-list CSV keeps the LISP format across several units', () => {
  const entries = [entryFor(BUD.cases[0]), entryFor(WARDROBE.cases[0])];
  const csv = buildCuttingListCsv(entries, P);
  assert.ok(csv.endsWith('\r\n'), 'file ends with a line terminator, like write-line does');
  const lines = csv.split('\r\n').slice(0, -1);

  assert.equal(lines[0], 'UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM');
  // BUD-A is the case the fixture pins byte-for-byte
  assert.deepEqual(lines.slice(1, 1 + BUD.cases[0].csv_labels.length), BUD.cases[0].csv_labels);
  assert.equal(lines.length, 1 + entries.reduce((s, e) => s + e.result.csvLines.length, 0));
  for (const line of lines.slice(1)) assert.equal(line.split(',').length, 7, `7 columns: ${line}`);
});

test('material demand applies the yield coefficient', () => {
  const bom = buildBom([entryFor(WARDROBE.cases[0])]);
  const materials = [{ id: 'm1', name: 'MFC 18', price: 10 }, { id: 'm2', name: 'Shaker 25', price: 30 }];
  const assignments = {
    side: { material_id: 'm1', yield: 1.15 },
    front: { material_id: 'm2', yield: 1.0 },
  };
  const demand = materialDemand(bom, assignments, materials);

  const side = demand.find((d) => d.role === 'side');
  assert.equal(side.material.id, 'm1');
  assert.equal(side.required_m2, roundTo(side.area_m2 * 1.15, 3));
  assert.equal(side.cost, roundTo(side.area_m2 * 1.15 * 10, 2));

  const front = demand.find((d) => d.role === 'front');
  assert.equal(front.required_m2, roundTo(front.area_m2, 3));

  const unassigned = demand.find((d) => d.role === 'back');
  assert.equal(unassigned.material, null);
  assert.equal(unassigned.cost, null);
  assert.equal(unassigned.yield, 1, 'unassigned roles default to no waste allowance');

  assert.equal(demandCost(demand), roundTo(side.cost + front.cost, 2));
  assert.equal(demandCost(demand.map((d) => ({ ...d, cost: null }))), null);
});

test('identical pieces merge into one cut row across units', () => {
  const one = entryFor(BUD.cases[0]);
  const two = { ...entryFor(BUD.cases[0]) };
  const bom = buildBom([one, two]);
  const bul = bom.cutRows.filter((r) => r.part === 'BUL');
  assert.equal(bul.length, 1, 'one merged row');
  assert.equal(bul[0].qty, 2, 'quantities add up');
  assert.equal(bom.totals.pieces, one.result.panels.length * 2);
});

test('export filenames follow the family convention', () => {
  const stamped = exportFilename('cutlist', 'csv', new Date(2026, 7, 4, 3, 7));
  assert.equal(stamped, 'cabinetcore-cutlist-0408-0307.csv');
  assert.match(exportFilename('project', 'pdf'), /^cabinetcore-project-\d{4}-\d{4}\.pdf$/);
});
