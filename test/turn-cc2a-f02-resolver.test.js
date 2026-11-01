/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F2 . THE RESOLVER (CLAUDE.md T-CC2a law 2). The owner, 01.11.2026,
// 12:50: *"kod nie moze wybierac poprzez nazwe bo nazwe mozemy zmienic i
// koniec"*. Every board choice and every hardware, edging and paint line of
// every job resolves to a catalogue id or to a NAMED reason; none falls through.
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
  catalogueIdOfBoard, catalogueIdOfLine, entryById, NOT_IN_CATALOGUE, LINE_BRIDGE, boardChoiceOfEntry,
} = await import('../src/engine/catalogue.js');
const { buildBom, purchaseBom } = await import('../src/engine/bom.js');
const { resolvePanelMaterial } = await import('../src/engine/materials.js');
const { computeCabinet } = await import('../src/engine/cabinet.js');
const { defaultParamsFor, UNIT_TYPES } = await import('../src/engine/types.js');
const { lightingBomLines } = await import('../src/engine/ledStrips.js');
const { t43Entries, T43_DESIGN, T43_ROOM } = await import('./fixtures/t43-kitchen.js');
const { hhEntries } = await import('./fixtures/t71-herbal-hill.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');

const ROOT = new URL('../', import.meta.url).pathname;
const OWNER = join(ROOT, 'test/fixtures/owner-projects');

/** Every job of the cover: the two fixture jobs, the four owner projects, every kit at its defaults and its options. */
function jobs() {
  const out = [
    { name: 't43', entries: t43Entries(P), design: T43_DESIGN, room: T43_ROOM },
    { name: 'herbal hill', entries: hhEntries(P), design: {} },
    {
      name: 't43 lit',
      entries: t43Entries(P),
      design: {
        ...T43_DESIGN,
        lighting: {
          on: true,
          switch: 'sensor',
          items: t43Entries(P).flatMap(({ unit }) => [
            { id: `b-${unit.id}`, unitId: unit.id, kind: 'bottom' },
            { id: `s-${unit.id}`, unitId: unit.id, kind: 'spot', count: 2 },
          ]),
        },
      },
    },
  ];
  for (const f of readdirSync(OWNER).sort()) {
    const j = JSON.parse(readFileSync(join(OWNER, f), 'utf8'));
    useProjectStore.setState({ project: { ...useProjectStore.getState().project, ...j.project }, units: j.units });
    out.push({ name: f, entries: useProjectStore.getState().allResults(), design: j.project.design, room: j.project.room });
  }
  const variants = [{}, { front_system: 'hk' }, { front_system: 'hs' }, { front_system: 'hl' }, { front_system: 'hf' },
    { joints_system: 'cabineo12' }, { joints_system: 'cabineo8' }, { joints_system: 'dowel' }];
  for (const id of Object.keys(UNIT_TYPES)) {
    for (const v of variants) {
      const params = { ...defaultParamsFor(id, P), ...v };
      let result;
      try { result = computeCabinet({ type: id, ...params }, P); } catch { continue; }
      out.push({ name: `${id} ${JSON.stringify(v)}`, entries: [{ unit: { id: 'u', type: id, params }, result }], design: {} });
    }
  }
  return out;
}
const JOBS = jobs();

test('F2.3 · the cover: every board part of every job resolves to an id or to "Not in the catalogue yet" with its reason', () => {
  let parts = 0;
  for (const job of JOBS) {
    for (const { unit, result } of job.entries) {
      for (const panel of result.panels || []) {
        parts += 1;
        const r = resolvePanelMaterial(panel, unit, job.design, P, []);
        if (r.catalogue_id) {
          assert.equal(entryById(r.catalogue_id)?.kind, 'sheet', `${job.name} ${panel.id}`);
          assert.equal(entryById(r.catalogue_id).thickness, Number(panel.thickness), `${job.name} ${panel.id}: the thickness the engine cut`);
        } else {
          assert.equal(r.catalogue_reason, NOT_IN_CATALOGUE, `${job.name} ${panel.id}: a named reason`);
        }
      }
    }
  }
  assert.ok(parts > 2000, `${parts} parts walked`);
});

test('F2.3 · the cover: every hardware, edging and paint line resolves; none falls through (an unknown label is red here)', () => {
  const seen = new Map();
  for (const job of JOBS) {
    const bom = buildBom(job.entries, { design: job.design, profile: P, room: job.room || null });
    const lines = [...bom.hardware, ...lightingBomLines({ entries: job.entries, design: job.design, profile: P })];
    for (const l of lines) {
      const r = catalogueIdOfLine(l);
      assert.ok(!r.unmatched, `${job.name}: ${l.role} "${l.spec_label || l.label}" fell through: ${r.why}`);
      assert.ok(r.id || r.reason === NOT_IN_CATALOGUE, `${job.name}: ${l.role} has an id or a named reason`);
      if (!seen.has(l.role)) seen.set(l.role, r.id || `(${r.why})`);
    }
    // The purchase list's own derived lines (plates, screws, dowels, puzzle connectors, handles, clips) and its edging and paint.
    for (const row of purchaseBom(job.entries, { design: job.design, profile: P, room: job.room || null }).rows) {
      assert.ok(row.catalogueId || row.status === 'not-in-catalogue', `${job.name}: ${row.key}`);
      if (row.catalogueId) assert.ok(entryById(row.catalogueId), `${row.catalogueId} is an entry`);
      for (const role of row.roles) if (!seen.has(role)) seen.set(role, row.catalogueId || `(${row.why})`);
    }
  }
  for (const role of ['hinges', 'runner_pairs', 'runner_sync_rods', 'legs', 'shelf_pins', 'hangers', 'cabineo_connector', 'hawa_connector',
    'hawa_foot', 'cornice', 'lift_unit', 'lift_caps', 'lift_bracket', 'led_strip', 'led_switch', 'led_driver', 'hinge_plates', 'screws',
    'puzzle_screws', 'dowels', 'handle', 'plinth_clips', 'edging', 'paint', 'primer', 'solvent']) {
    assert.ok(seen.has(role), `the cover reached ${role}`);
  }
});

test('F2.2 · two hinge kinds give two ids; a changed spec_label with the same structured fields gives the same id', () => {
  const a = catalogueIdOfLine({ role: 'hinges', spec: { angle: 110, finish: 'nickel', family: '71B3550' }, spec_label: '3 per door x 2 · 110° · nickel' });
  const b = catalogueIdOfLine({ role: 'hinges', spec: { angle: 155, finish: 'nickel', family: '71B7550' }, spec_label: '3 per door x 2 · 155° · nickel' });
  const c = catalogueIdOfLine({ role: 'hinges', spec: { angle: 155, finish: 'onyx', family: '71B7590' }, spec_label: 'x' });
  assert.equal(a.id, 'hinge.blum.clip-top.110.nickel');
  assert.equal(b.id, 'hinge.blum.clip-top.155.nickel');
  assert.equal(c.id, 'hinge.blum.clip-top.155.onyx');
  assert.equal(new Set([a.id, b.id, c.id]).size, 3);
  const renamed = catalogueIdOfLine({ role: 'hinges', spec: { angle: 155, finish: 'nickel', family: '71B7550' }, spec_label: 'anything at all', label: 'Renamed' });
  assert.equal(renamed.id, b.id, 'the label is never read for a structured role');
  const r1 = catalogueIdOfLine({ role: 'runner_pairs', spec: { system: '760H', nl: 500, variant: 'T' }, spec_label: '490 mm · orders NL 500' });
  const r2 = catalogueIdOfLine({ role: 'runner_pairs', spec: { system: '760H', nl: 500, variant: 'T' }, spec_label: 'changed words' });
  assert.equal(r1.id, 'runner.blum.movento-760h.500.t');
  assert.equal(r2.id, r1.id);
  assert.notEqual(catalogueIdOfLine({ role: 'runner_pairs', spec: { system: '760H', nl: 500, variant: 'S' } }).id, r1.id);
});

test('F2.2 · the bridge: one table, each row naming its emitter; a label it does not know is UNMATCHED, never a fallback', () => {
  const src = readFileSync(join(ROOT, 'src/engine/catalogue.js'), 'utf8');
  const block = src.slice(src.indexOf('export const LINE_BRIDGE'), src.indexOf(']);', src.indexOf('export const LINE_BRIDGE')));
  assert.ok(LINE_BRIDGE.length >= 4);
  assert.match(block, /engine\/ledStrips\.js lightingBomLines :459/);
  assert.match(block, /engine\/ledStrips\.js lightingBomLines :475/);
  assert.equal(catalogueIdOfLine({ role: 'led_strip', label: 'LED strip 4000 K' }).id, 'led.strip.4000');
  assert.equal(catalogueIdOfLine({ role: 'led_switch', label: 'Motion sensor' }).id, 'led.switch.sensor');
  const odd = catalogueIdOfLine({ role: 'led_switch', label: 'A voice switch nobody wrote' });
  assert.equal(odd.id, null);
  assert.equal(odd.unmatched, true, 'red in the cover test, said "Not in the catalogue yet" on the list');
  assert.equal(catalogueIdOfLine({ role: 'a_role_nobody_emits', label: 'x' }).unmatched, true);
});

test('F2.1 · the board choice: egger with a decor, sprayed, raw, generic, veneer; the thickness the engine cuts', () => {
  assert.equal(catalogueIdOfBoard({ source: 'egger', finish_id: 'egger:H3325_28', thickness: 18 }, P).id, 'sheet.egger.h3325_28.18');
  assert.equal(catalogueIdOfBoard({ source: 'laminate', finishId: 'egger:U999_12', thickness: 19 }, P).id, 'sheet.egger.u999_12.19');
  assert.equal(catalogueIdOfBoard({ source: 'sprayed', thickness: 18 }, P).id, 'sheet.mdf.18');
  assert.equal(catalogueIdOfBoard({ source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' }, thickness: 25 }, P).id, 'sheet.mdf.25');
  assert.equal(catalogueIdOfBoard({ source: 'raw', thickness: 18 }, P).id, 'sheet.mdf.18');
  assert.equal(catalogueIdOfBoard({ source: null, thickness: 22 }, P).id, 'sheet.generic.22', 'nothing chosen: the honest placeholder');
  assert.equal(catalogueIdOfBoard({ source: 'egger', thickness: 18 }, P).id, 'sheet.generic.18', 'a source with no decor yet');
  for (const src of ['veneer', 'wood']) {
    const r = catalogueIdOfBoard({ source: src, thickness: 19 }, P);
    assert.deepEqual([r.id, r.reason], [null, NOT_IN_CATALOGUE], src);
  }
  assert.equal(catalogueIdOfBoard({ source: 'spray', thickness: 40 }, P).reason, NOT_IN_CATALOGUE, 'a 40 mm build-up is not a sheet of the catalogue');
  assert.equal(catalogueIdOfBoard({ source: 'egger' }, P).id, 'sheet.generic.18', 'no thickness: the source\'s own');
  // A sheet entry back to a choice, and the choice back to the same entry.
  for (const id of ['sheet.egger.h3325_28.18', 'sheet.mdf.25', 'sheet.generic.22']) {
    assert.equal(catalogueIdOfBoard(boardChoiceOfEntry(id), P).id, id);
  }
});
