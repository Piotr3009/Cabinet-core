/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F10 . ASSIGN MATERIALS, EVERY LINE (law 7). The owner, 01.11.2026: *"kazda funkcja przypisana (10 rodzajow
// zawiasow, wszystkie przypisane), inaczej eksport BOM pisze not assigned materials"*; *"materials w JC ma wlasny
// UUID ... przypisac UUID z JC do naszego materialu"*. Driven through the real store, the real BOM and the window
// rendered as the browser renders it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { register } from 'node:module';

const ESB = new URL('../node_modules/esbuild/lib/main.js', import.meta.url).href;
register(`data:text/javascript,${encodeURIComponent(`
import esb from '${ESB}';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function load(url, context, next) {
  const path = url.split('?')[0];
  if (path.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  if (path.endsWith('.jsx')) {
    const file = fileURLToPath(path);
    const { code } = esb.transformSync(readFileSync(file, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: file });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return next(url, context);
}`)}`, import.meta.url);

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { computeCabinet } = await import('../src/engine/cabinet.js');
const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');
const { buildBom, hardwareDemand } = await import('../src/engine/bom.js');
const { normalizeAssignments, migrateHardwareKeys, ASSIGNMENT_SCHEMA } = await import('../src/engine/partRegistry.js');
const {
  useMaterialAssignmentStore, ASSIGN_GROUPS, HARDWARE_ROLES, groupOfRole, buildAssignLines, assignCount, hardwareKey,
  GENERIC_MATERIALS,
} = await import('../src/stores/materialAssignmentStore.js');
const { filterStock } = await import('../src/lib/jcStock.js');
const { STOCK_MATERIALS, stock } = await import('./fixtures/jc-stock.js');
const { t43Entries } = await import('./fixtures/t43-kitchen.js');
const { hhEntries } = await import('./fixtures/t71-herbal-hill.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const { useCabinetProfileStore } = await import('../src/stores/cabinetProfileStore.js');
const { default: AssignMaterialsModal } = await import('../src/components/AssignMaterialsModal.jsx');

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
const M = () => useMaterialAssignmentStore.getState();

const e = (id, params) => ({ unit: { id, type: params.type, params }, result: computeCabinet(params, P) });
/** Two hinge specs (3 and 6 per door) and one runner spec. */
const JOB = [
  e('u1', { type: 'BUD', width: 600, height: 720, depth: 560, shelves: 1, unit_num: 'B1' }),
  e('u2', { type: 'BUDTALL', width: 600, height: 2100, depth: 560, unit_num: 'T1' }),
  e('u3', { type: 'BUDR', width: 500, height: 720, depth: 560, unit_num: 'D1' }),
];
const BOM = buildBom(JOB, { profile: P });
const hingeRows = BOM.hardware.filter((h) => h.role === 'hinges');
const runnerRows = BOM.hardware.filter((h) => h.role === 'runner_pairs');

test('F10.3 two hinge specs and one runner spec are three lines, each its own BOM key', () => {
  assert.equal(hingeRows.length, 2, 'the fixture job carries two hinge specs');
  assert.equal(runnerRows.length, 1);
  const lines = buildAssignLines({ bom: BOM, data: null, materials: STOCK_MATERIALS });
  const hinges = lines.filter((l) => l.group === 'hinges');
  const runners = lines.filter((l) => l.group === 'runners' && l.role === 'runner_pairs');
  assert.equal(hinges.length, 2);
  assert.equal(runners.length, 1);
  for (const l of [...hinges, ...runners]) {
    assert.equal(l.key, `${l.role}|${l.spec}`, 'the key is `${role}|${spec_label}`');
    assert.equal(l.assigned, false);
    assert.equal(l.material, null);
    assert.ok(l.qty > 0 && l.unit);
  }
});

test('F10.3 each hinge line is assigned separately, and hardwareDemand reads the key first', () => {
  M().reset();
  const [a, b] = hingeRows.map(hardwareKey);
  M().setHardwareAssignment(a, stock('Blum Clip top Blumotion').id);
  M().setHardwareAssignment(b, stock('Blum Clip top 155').id);
  assert.deepEqual(Object.keys(M().data.hardware).sort(), [a, b].sort());
  assert.equal(M().data.schema, 3);
  const demand = hardwareDemand(BOM, M().assignments, STOCK_MATERIALS).filter((d) => d.role === 'hinges');
  assert.deepEqual(demand.map((d) => d.material.name).sort(), ['Blum Clip top 155 hinge', 'Blum Clip top Blumotion 110 hinge']);
  assert.ok(demand.every((d) => d.assigned && d.material.jc_uuid === d.material.id));
  // The role's registry part follows its lines, so the BOM window agrees (purchaseBom, one product per part).
  M().syncHardwarePart('hinges', BOM.hardware);
  assert.ok(M().data.base.hinge.material_id);
  // Clear unassigns the line even with the role's part value standing behind it.
  M().clearHardwareAssignment(a);
  const after = hardwareDemand(BOM, M().assignments, STOCK_MATERIALS).find((d) => d.key === a);
  assert.equal(after.assigned, false);
  assert.equal(after.material, null);
  M().syncHardwarePart('hinges', BOM.hardware);
  assert.equal(M().data.base.hinge, undefined, 'a role with a line missing is not complete in the BOM window either');
});

test('F10.1 a schema 2 blob with hinges: { material_id } migrates to both hinge keys, once', () => {
  const legacy = { hinges: { material_id: 'jc-hinge-uuid' }, side: { material_id: 'generic-18' } };
  const d = normalizeAssignments(legacy);
  assert.equal(d.schema, ASSIGNMENT_SCHEMA);
  const migrated = migrateHardwareKeys(d, BOM.hardware);
  for (const r of hingeRows) assert.equal(migrated.hardware[hardwareKey(r)].material_id, 'jc-hinge-uuid');
  assert.equal(migrated.hardware[hardwareKey(runnerRows[0])], undefined, 'a role with nothing assigned gains nothing');
  // Once: a key that exists (cleared on purpose) is never refilled.
  const cleared = { ...migrated, hardware: { ...migrated.hardware, [hardwareKey(hingeRows[0])]: { material_id: '' } } };
  assert.equal(migrateHardwareKeys(cleared, BOM.hardware).hardware[hardwareKey(hingeRows[0])].material_id, '');
  // The store does it at the window's load.
  M().setProject('p-legacy', { blob: legacy });
  assert.equal(M().adoptHardwareKeys(BOM.hardware), true);
  assert.equal(M().adoptHardwareKeys(BOM.hardware), false, 'the second load changes nothing');
  for (const r of hingeRows) assert.equal(M().data.hardware[hardwareKey(r)].material_id, 'jc-hinge-uuid');
});

test('F10.3 the group cover: every role of HARDWARE_ROLES and of the fixture jobs lands in exactly one group', () => {
  const named = ASSIGN_GROUPS.flatMap((g) => g.roles);
  assert.equal(new Set(named).size, named.length, 'no role is named by two groups');
  assert.deepEqual(ASSIGN_GROUPS.map((g) => g.label), ['Sheets', 'Hinges', 'Runners', 'Internal fittings', 'Ironmongery and other', 'Consumables']);
  const ids = new Set(ASSIGN_GROUPS.map((g) => g.id));
  const emitted = new Set(HARDWARE_ROLES.map((r) => r.id));
  for (const entries of [t43Entries(P), hhEntries(P), JOB]) {
    for (const h of buildBom(entries, { profile: P }).hardware) emitted.add(h.role);
  }
  assert.ok(emitted.size >= HARDWARE_ROLES.length);
  for (const role of emitted) {
    const g = groupOfRole(role);
    assert.ok(ids.has(g), `${role} lands in no group`);
    assert.equal(ASSIGN_GROUPS.filter((x) => x.roles.includes(role)).length <= 1, true);
  }
  // The fallback: a role the engine emits tomorrow can never vanish.
  assert.equal(groupOfRole('a_role_from_tomorrow'), 'consumables');
  assert.equal(groupOfRole('hinges'), 'hinges');
  assert.equal(groupOfRole('runner_pairs'), 'runners');
  assert.equal(groupOfRole('legs'), 'ironmongery');
  assert.equal(groupOfRole('shelf_pins'), 'internal');
});

test('F10.3 the stock search narrows by colour; the kind filter preselects boards for Sheets', () => {
  assert.deepEqual(filterStock(STOCK_MATERIALS, { q: 'white' }).map((m) => m.name),
    ['Egger W980 White melamine 18 mm', 'ABS edging white 22 x 1']);
  assert.ok(filterStock(STOCK_MATERIALS, { kind: 'board' }).every((m) => m.category === 'board'));
  const lines = buildAssignLines({
    bom: BOM, data: null, materials: STOCK_MATERIALS, usage: { carcase_side: { qty: 2, unit: 'm²', families: ['base'] } },
  });
  assert.equal(lines.find((l) => l.partId === 'carcase_side').kind, 'board');
  assert.equal(lines.find((l) => l.role === 'hinges').kind, 'hardware');
});

test('F10.3 the window: the six groups, the lines, the red chip and the header count', () => {
  useProjectStore.getState().newProject?.({ id: 'it-1', name: 'Assign walk', number: '2601' });
  for (const t of ['BUD', 'BUDTALL', 'BUDR']) useProjectStore.getState().addUnit(t);
  M().reset();
  M().setMaterials(STOCK_MATERIALS);
  useMaterialAssignmentStore.setState({ materialsSource: 'jc', stockError: null });
  const bom = buildBom(useProjectStore.getState().allResults(), { design: useProjectStore.getState().project.design, profile: useCabinetProfile() });
  const runner = bom.hardware.find((h) => h.role === 'runner_pairs');
  assert.ok(runner, 'the drawer unit buys runners');
  M().setHardwareAssignment(hardwareKey(runner), stock('Blum Movento').id);

  const html = draw(AssignMaterialsModal);
  const words = text(html);
  assert.match(html, /cc-modal-wide/);
  for (const g of ASSIGN_GROUPS) assert.match(html, new RegExp(`data-assign-group="${g.id}"`), g.id);
  const total = Number(html.match(/data-assign-total="(\d+)"/)[1]);
  const missing = Number(html.match(/data-assign-counter="(\d+)"/)[1]);
  assert.ok(total > missing && missing > 0);
  assert.ok(words.includes(`${total - missing} of ${total} lines assigned`), words.slice(0, 200));
  assert.ok(words.includes(`Not assigned materials: ${missing} line${missing === 1 ? '' : 's'}`));
  assert.equal((html.match(/data-assign-chip="not-assigned"/g) || []).length, missing);
  assert.match(html, new RegExp(`data-assign-line="${hardwareKey(runner).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*data-assign-assigned="1"`));
  assert.ok(words.includes('Blum Movento runner pair'));
  // The stock embedded and visible at once: every row, the JC badge, a click target per row.
  assert.equal((html.match(/data-material-option=/g) || []).length > 0, true);
  assert.match(html, /data-material-search="1"/);
  // The header count is the same function the BOM PDF's words come from.
  const c = assignCount([{ assigned: true }, { assigned: false }, { assigned: false }]);
  assert.equal(c.text, '1 of 3 lines assigned');
  assert.equal(c.missingText, 'Not assigned materials: 2 lines');
});

test('F10 src has no second material list: the store holds the three generics and JC rows only', () => {
  assert.deepEqual(GENERIC_MATERIALS.map((m) => m.id), ['generic-18', 'generic-22', 'generic-25']);
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(js|jsx)$/.test(name) && !rel.startsWith('src/retail/')) files.push(rel);
    }
  };
  walk('src');
  const lists = files.filter((rel) => /category: 'hardware', unit: '(pcs|pairs|m)', price:/.test(read(rel)));
  assert.deepEqual(lists, [], 'a hardcoded material list is back');
  assert.doesNotMatch(read('src/stores/materialAssignmentStore.js'), /mat_\$\{Date/, 'CC mints no material id of its own');
});

function useCabinetProfile() { return useCabinetProfileStore.getState().profile; }

/** Render with every store's CURRENT state (a server render reads the initial state). */
function draw(Component) {
  const stores = [useProjectStore, useUiStore, useMaterialAssignmentStore];
  const kept = stores.map((s) => ({ ...s.getInitialState() }));
  for (const s of stores) Object.assign(s.getInitialState(), s.getState());
  try { return renderToStaticMarkup(React.createElement(Component)); } finally {
    stores.forEach((s, i) => {
      const init = s.getInitialState();
      for (const k of Object.keys(init)) delete init[k];
      Object.assign(init, kept[i]);
    });
  }
}
