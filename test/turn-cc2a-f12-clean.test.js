/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F12 . A NEW ITEM INHERITS NOTHING. The owner's decision 4 of 01.11.2026: *"nowy projekt przestaje dziedziczyc
// materialy z poprzedniego"*. Driven through the real project store and the real assignment store, as the start
// screen drives them: open item A wearing materials, create item B, save B.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

const A_BOARD = '5e0c4b1a-7f2d-4c3e-9a8b-0000000000a1';
const A_HINGE = '5e0c4b1a-7f2d-4c3e-9a8b-0000000000a2';
const BLOB_A = {
  schema: 3,
  base: { side: { material_id: A_BOARD }, top: { material_id: A_BOARD } },
  overrides: {},
  customParts: [],
  auto: {},
  hardware: { 'hinges|Clip top 110': { material_id: A_HINGE } },
};

const carries = (value, id) => JSON.stringify(value ?? null).includes(id);

test('F12.2 · open item A with assignments, create item B: B\'s blob is empty, B\'s save carries no material of A', () => {
  useProjectStore.getState().loadProject({ id: 'item-A', name: 'Item A', assignments: BLOB_A }, []);
  const a = useMaterialAssignmentStore.getState();
  assert.equal(a.projectId, 'item-A');
  assert.ok(carries(a.data, A_BOARD), 'item A opens wearing its board');
  assert.ok(carries(a.data, A_HINGE), 'item A opens wearing its hinge');

  useProjectStore.getState().newProject('Item B', { id: 'item-B', number: 'P-2', client: 'B client' });
  const b = useMaterialAssignmentStore.getState();
  assert.equal(b.projectId, 'item-B');
  assert.ok(!carries(b.data, A_BOARD), 'B\'s blob holds no board of A');
  assert.ok(!carries(b.data, A_HINGE), 'B\'s blob holds no hinge of A');
  assert.deepEqual(Object.keys(b.data.base || {}), [], 'B\'s base is empty');
  assert.deepEqual(Object.keys(b.data.hardware || {}), [], 'B\'s hardware keys are empty');

  const saved = useProjectStore.getState().projectForSave({ stamp: false });
  assert.ok(!carries(saved, A_BOARD), 'B\'s save carries no board of A');
  assert.ok(!carries(saved, A_HINGE), 'B\'s save carries no hinge of A');
  assert.deepEqual(saved.project.bespoke ?? [], [], 'and no bespoke row either');
});

test('F12.1 · a project with no blob of its own never reads the legacy global blob cc.assignments.v2', () => {
  mem.set('cc.assignments.v2', JSON.stringify(BLOB_A));
  try {
    useMaterialAssignmentStore.getState().setProject('item-C', { blob: null });
    const c = useMaterialAssignmentStore.getState();
    assert.equal(c.projectId, 'item-C');
    assert.ok(!carries(c.data, A_BOARD), 'the legacy global blob is not inherited');
    assert.equal(mem.get('cc.assignments.v2'), JSON.stringify(BLOB_A), 'and it is not overwritten with empty');
  } finally {
    mem.delete('cc.assignments.v2');
  }
});

test('F12.1 · a new item with no id yet starts empty and leaves the legacy global blob as it was', () => {
  mem.set('cc.assignments.v2', JSON.stringify(BLOB_A));
  try {
    useProjectStore.getState().loadProject({ id: 'item-A', name: 'Item A', assignments: BLOB_A }, []);
    useProjectStore.getState().newProject('Unbound');
    assert.ok(!carries(useMaterialAssignmentStore.getState().data, A_BOARD));
    assert.equal(mem.get('cc.assignments.v2'), JSON.stringify(BLOB_A));
  } finally {
    mem.delete('cc.assignments.v2');
  }
});

test('F12.1 · the legacy fallback branch of readLocal is deleted (the Deletion licence)', () => {
  const src = readFileSync(new URL('../src/stores/materialAssignmentStore.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('function readLocal('), src.indexOf('function load('));
  assert.ok(body.length > 0);
  assert.doesNotMatch(body, /localStorage\.getItem\(KEY\)/);
  assert.doesNotMatch(body, /if \(projectId\) \{/);
});
