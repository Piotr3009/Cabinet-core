/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// CHAT FIX 01.11.2026, the audit of T-CC1b (PR #96), approved by the owner (*"koduj"*):
//   1. the crash buffer keeps no pictures: a two-picture item took it over profile.save.bufferMaxMb and the
//      buffer went off for good; a Restore reads the pictures back from the row and the save waits for them;
//   2. the drawing set's two angles are kept under profile.visuals.maxKb (they were full 1920 px PNGs: a 24 MB
//      PDF, and an AI source past Vercel's 4.5 MB wall);
//   3. the AI source's ceiling is 3 MB, so its base64 stays under that wall.
import test from 'node:test';
import assert from 'node:assert/strict';

function fakeStorage() {
  const m = new Map();
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}
const mem = fakeStorage();
globalThis.localStorage = mem;

const { bufferDesignOf, bufferKey, readBuffer } = await import('../src/lib/crashBuffer.js');
const { useProjectStore, flushCrashBuffer } = await import('../src/stores/projectStore.js');
const { useAuthStore } = await import('../src/stores/authStore.js');
const { itemPayload, persistProject } = await import('../src/lib/persist.js');
const { keepAngle } = await import('../src/lib/keepPicture.js');
const { visualNumbers, dataUrlBytes } = await import('../src/lib/visualNumbers.js');

const TENANT = 'tenant-pics';
useAuthStore.setState({ tenant: { id: TENANT, name: 'Skylon' } });

/** A JPEG-looking data URL of about `kb` kilobytes once decoded. */
const picture = (kb, tag = 'A') => `data:image/jpeg;base64,${Buffer.alloc(kb * 1024, tag).toString('base64')}`;

function job(id) {
  useProjectStore.getState().newProject('Kitchen with pictures', { id, number: '2610' });
  useProjectStore.getState().addUnit('BUD');
}

/** A fake Joinery Core client: records every call, answers the row's design and the save. */
function fakeDb(rowDesign) {
  const calls = [];
  const db = async (fn) => {
    const chain = (table) => {
      const q = { table, select: null, eq: null };
      const api = {
        select: (cols) => { q.select = cols; return api; },
        eq: (col, val) => { q.eq = [col, val]; return api; },
        maybeSingle: async () => { calls.push({ kind: 'read', ...q }); return { data: { design: rowDesign }, error: null }; },
        single: async () => { calls.push({ kind: 'read', ...q }); return { data: { design: rowDesign }, error: null }; },
      };
      return api;
    };
    const client = {
      from: chain,
      rpc: async (name, params) => { calls.push({ kind: 'rpc', name, params }); return { data: { id: params.p_item_id, updated_at: '2026-11-01T08:30:00Z', revision: 'A' }, error: null }; },
    };
    return fn(client);
  };
  return { db, calls };
}

test('bufferDesignOf: the pictures leave the buffer and the buffer says they are on the row', () => {
  const design = { format: 'cabinet-core-project', project: { id: 'x', name: 'K', visuals: { render: { dataUrl: picture(1) } } }, units: [] };
  const out = bufferDesignOf(design);
  assert.equal(out.project.visuals, undefined);
  assert.equal(out.visualsOnRow, true);
  assert.equal(out.project.name, 'K');
  // No pictures: no mark. A pending read-back keeps the mark.
  assert.equal(bufferDesignOf({ project: { id: 'y' } }).visualsOnRow, undefined);
  assert.equal(bufferDesignOf({ project: { id: 'y', visualsPending: true } }, { pending: true }).visualsOnRow, true);
  assert.equal(bufferDesignOf({ project: { id: 'y', visualsPending: true } }, { pending: true }).project.visualsPending, undefined);
});

test('a two-picture item keeps its crash buffer: under 1 MB, no pictures in it', async () => {
  job('srv-pics');
  useProjectStore.getState().setVisual('render', { dataUrl: picture(400, 'R'), preset: 'front', at: 'now' });
  useProjectStore.getState().setVisual('ai', { dataUrl: picture(400, 'I'), prompt: 'p', at: 'now' });
  // Before the fix the design carried both (about 1.07 MB of base64) and the buffer went off.
  const whole = useProjectStore.getState().projectForSave({ stamp: false, storage: mem });
  assert.ok(JSON.stringify(whole).length > 1024 * 1024, 'the whole item is over the buffer ceiling');
  assert.equal(flushCrashBuffer(), true, 'the buffer holds the item');
  const b = readBuffer(mem, bufferKey(TENANT, 'srv-pics'));
  assert.ok(b && b.design, 'written');
  assert.equal(b.design.project.visuals, undefined);
  assert.equal(b.design.visualsOnRow, true);
  assert.ok(JSON.stringify(b).length < 1024 * 1024);
  // The save still carries the pictures (they live on the row).
  assert.ok(itemPayload({ storage: mem }).p_design.project.visuals.ai.dataUrl.startsWith('data:image/jpeg'));
});

test('Restore reads the pictures back from the row before anything is saved; the save then carries them', async () => {
  job('srv-restore');
  const buffered = bufferDesignOf(useProjectStore.getState().projectForSave({ stamp: false, storage: mem }), { pending: true });
  assert.equal(buffered.visualsOnRow, true);
  const rowVisuals = { render: { dataUrl: picture(2, 'W'), preset: 'room', at: 'then' } };
  const { db, calls } = fakeDb({ project: { visuals: rowVisuals } });
  // openItemDesign fires its own read through the live client (none in node); the save's read is the fake's.
  const res = useProjectStore.getState().openItemDesign({ id: 'srv-restore', name: 'Kitchen with pictures', jc_project_number: '2610', updated_at: '2026-11-01T07:00:00Z' }, buffered, { storage: mem, dirty: true });
  assert.equal(res.ok, true);
  assert.equal(useProjectStore.getState().project.visualsPending, true);
  // Nothing is sent while the pictures are being read back: the keepalive's payload is null.
  assert.equal(itemPayload({ storage: mem }), null);
  const saved = await persistProject({ db, storage: mem });
  assert.equal(saved.stored, true, saved.message);
  const read = calls.find((c) => c.kind === 'read');
  assert.ok(read && read.table === 'cc_items' && read.select === 'design' && read.eq[1] === 'srv-restore');
  const rpc = calls.find((c) => c.kind === 'rpc');
  assert.equal(rpc.name, 'cc_save_item');
  assert.equal(rpc.params.p_design.project.visuals.render.dataUrl, rowVisuals.render.dataUrl);
  assert.equal(rpc.params.p_design.project.visualsPending, undefined);
  assert.equal(useProjectStore.getState().project.visualsPending, undefined);
});

test('keepAngle: a 1920 px PNG angle comes back under maxKb as a JPEG; without an encoder it stays as it was', async () => {
  const big = `data:image/png;base64,${Buffer.alloc(900 * 1024, 'P').toString('base64')}`;
  const small = picture(120, 'S');
  const encode = async () => small;
  const kept = await keepAngle(big, { maxKb: 400, encode });
  assert.equal(kept, small);
  assert.ok(dataUrlBytes(kept) <= 400 * 1024);
  // No encoder in node: the set still binds with the picture it had.
  assert.equal(await keepAngle(big, { maxKb: 400, encode: async () => { throw new Error('no canvas'); } }), big);
  assert.equal(await keepAngle(null, { maxKb: 400 }), null);
});

test('the AI source ceiling is 3 MB: its base64 stays under Vercel\'s 4.5 MB request wall', () => {
  const { aiInputMaxMb } = visualNumbers(null);
  assert.equal(aiInputMaxMb, 3);
  assert.ok((aiInputMaxMb * 1024 * 1024 * 4) / 3 < 4.5 * 1024 * 1024);
});

test('the Drawings window keeps its two angles through keepAngle', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
  assert.match(src, /keepAngle\(raw\.isoLeft, \{ maxKb \}\)/);
  assert.match(src, /keepAngle\(raw\.isoRight, \{ maxKb \}\)/);
});

