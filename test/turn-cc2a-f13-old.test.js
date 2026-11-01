/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F13 . OLD PROJECTS OPEN, NOTHING LOST (FROZEN 4: "nothing deleted, nothing overwritten with empty; the
// assignment blob is kept as saved"). The owner's own four files (test/fixtures/owner-projects/, 28 to 31.10.2026)
// open through the real store, save through the one builder (projectForSave), open again: the same units, the same
// design, the same blob, the same cut list; a second load changes nothing. A schema 2 blob and a T-CC1b schema 3
// blob open without loss.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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

const { useProjectStore } = await import('../src/stores/projectStore.js');
const { useMaterialAssignmentStore } = await import('../src/stores/materialAssignmentStore.js');
const { buildBom } = await import('../src/engine/bom.js');
const { getCabinetProfile } = await import('../src/engine/profile.js');
const { normalizeAssignments } = await import('../src/engine/partRegistry.js');
const catalogue = await import('../src/engine/catalogue.js');

const DIR = new URL('./fixtures/owner-projects/', import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.ccproject')).sort();
const read = (f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));

/** The cut list as the BOM prints it: every row's unit, panel, sizes, count and thickness. */
function cutList() {
  const s = useProjectStore.getState();
  const bom = buildBom(s.allResults(), { design: s.project.design, profile: getCabinetProfile() });
  return bom.units.flatMap((u) => u.rows.map((r) => ({
    unit: r.unit_num, id: r.id, w: r.w, h: r.h, qty: r.qty, t: r.thickness ?? r.t ?? null,
  })));
}
const stable = (v) => JSON.parse(JSON.stringify(v ?? null));

function open(file) {
  const { project, units } = file;
  useProjectStore.getState().loadProject(stable(project), stable(units));
  const s = useProjectStore.getState();
  return {
    units: stable(s.units), design: stable(s.project.design), blob: stable(useMaterialAssignmentStore.getState().data),
    cut: cutList(), stored: stable(s.project.design.carcass.types.map((t) => t.material_id)),
  };
}

test('F13.2 · the four owner projects are the four files the spec names', () => {
  assert.equal(FILES.length, 4, FILES.join(', '));
  const names = FILES.map((f) => read(f).project.name).sort();
  assert.ok(names.some((n) => /Black Kitchen/i.test(n)), names.join(' | '));
  assert.equal(names.filter((n) => /wardrobe/i.test(n)).length, 2, names.join(' | '));
  assert.ok(names.some((n) => /0004/.test(n)), names.join(' | '));
});

for (const f of FILES) {
  test(`F13.2 · ${f}: opens, saves, opens again with the same units, design, blob and cut list; idempotent`, () => {
    const file = read(f);
    const first = open(file);
    assert.ok(first.units.length > 0, 'the job has its cabinets');
    // The stored board ids stay as saved (they are read once, never written again).
    assert.deepEqual(first.stored, file.project.design.carcass.types.map((t) => t.material_id));
    assert.deepEqual(stable(first.design.fronts.types.map((t) => t.material_id)), file.project.design.fronts.types.map((t) => t.material_id));
    // The blob is kept as saved: everything the file held is still in it.
    const savedBlob = normalizeAssignments(file.project.assignments);
    for (const [k, v] of Object.entries(savedBlob.base || {})) assert.deepEqual(first.blob.base[k], v, `blob base ${k}`);

    const saved = useProjectStore.getState().projectForSave({ stamp: false });
    const second = open({ project: saved.project, units: saved.units });
    assert.deepEqual(second.units, first.units, 'the same units');
    assert.deepEqual(second.design, first.design, 'the same design');
    assert.deepEqual(second.blob, first.blob, 'the same blob');
    assert.deepEqual(second.cut, first.cut, 'the same cut list');

    const third = open({ project: saved.project, units: saved.units });
    assert.deepEqual(third.design, second.design, 'a second load changes nothing (idempotent)');
    assert.deepEqual(third.cut, second.cut);
  });
}

test('F13.1 · the old CC ids map through ONE table in catalogue.js to the source and thickness they meant', () => {
  assert.equal(typeof catalogue.boardChoiceOfOldId, 'function');
  assert.equal(typeof catalogue.OLD_CC_IDS, 'object');
  for (const id of ['mat_mdf18', 'mat_mfc18_oak', 'mat_mfc19_front', 'mat_mdf25_shaker', 'generic-18', 'generic-22', 'generic-25']) {
    const c = catalogue.boardChoiceOfOldId(id);
    assert.ok(c && c.source && Number(c.thickness) > 0, `${id} maps to a source and a thickness: ${JSON.stringify(c)}`);
  }
  assert.equal(Number(catalogue.boardChoiceOfOldId('generic-25').thickness), 25);
  assert.equal(Number(catalogue.boardChoiceOfOldId('mat_mfc19_front').thickness), 19);
  // A Joinery Core uuid is never mapped by name.
  assert.equal(catalogue.boardChoiceOfOldId('5e0c4b1a-7f2d-4c3e-9a8b-000000000001'), null);
  // Every old CC id the owner's files carry is in the table.
  for (const f of FILES) {
    const d = read(f).project.design;
    for (const t of [...d.carcass.types, ...d.fronts.types]) {
      if (t.material_id) assert.ok(catalogue.boardChoiceOfOldId(t.material_id), `${f}: ${t.material_id}`);
    }
  }
});

test('F13.3 · a schema 2 blob and a T-CC1b schema 3 blob open without loss', () => {
  const s2 = {
    schema: 2, base: { carcase_side: { material_id: 'mat_mfc18_oak', yield: 1.15 } }, overrides: {}, customParts: [], auto: {},
  };
  const s3 = {
    schema: 3, base: { carcase_side: { material_id: '5e0c4b1a-7f2d-4c3e-9a8b-000000000001' } }, overrides: {}, customParts: [], auto: {},
    hardware: { 'hinges|Clip top 110': { material_id: '5e0c4b1a-7f2d-4c3e-9a8b-000000000005' } },
  };
  for (const blob of [s2, s3]) {
    const want = normalizeAssignments(blob);
    useProjectStore.getState().loadProject({ id: `blob-${blob.schema}`, name: 'Blob', assignments: blob }, []);
    const saved = normalizeAssignments(useProjectStore.getState().projectForSave({ stamp: false }).assignments);
    for (const [k, v] of Object.entries(want.base)) assert.deepEqual(saved.base[k], v, `schema ${blob.schema}: base ${k} kept`);
    for (const [k, v] of Object.entries(want.hardware || {})) assert.deepEqual(saved.hardware[k], v, `schema ${blob.schema}: hardware ${k} kept`);
    const text = JSON.stringify(saved);
    for (const id of JSON.stringify(blob).match(/[0-9a-f]{8}-[0-9a-f-]{27}|mat_[a-z0-9_]+/g)) assert.ok(text.includes(id), `schema ${blob.schema}: ${id} kept`);
  }
});
