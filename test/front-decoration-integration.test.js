import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { buildBom } from '../src/engine/bom.js';
import { materialSection } from '../src/engine/cnc/views.js';
import { resolvePanelMaterial } from '../src/engine/materials.js';
import { applyPartEdits, partFeatures } from '../src/engine/partEdits.js';
import { exportGate } from '../src/engine/cnc/exportGate.js';
import { dump } from '../scripts/t64-classify.mjs';

const result = (style, extra = {}, type = 'BUD') => computeCabinet({
  ...defaultParamsFor(type, P), front_type: style,
  front_decoration: defaultFrontDecoration(style), ...extra,
}, P);

test('six production goldens stay byte-identical with decorative recipes opt-in', () => {
  const baseline = JSON.parse(readFileSync(new URL('../verify/t70/goldens-base.json', import.meta.url)));
  assert.deepEqual(dump(), baseline);
});

// T76 F3/F4 · six now (SS went), re-pinned on the owner's numbers.
test('six decorative production goldens preserve exact contours and machining data', () => {
  const goldens = JSON.parse(readFileSync(new URL('../fixtures/golden-decorative-fronts.json', import.meta.url)));
  for (const [style, expected] of Object.entries(goldens)) {
    const parts = result(style).panels.filter((p) => p.meta?.frontDecoration || p.meta?.frontDecorationParent);
    assert.equal(createHash('sha256').update(JSON.stringify(parts)).digest('hex'), expected.sha256, style);
    assert.deepEqual(parts.map((p) => ({ id: p.id, w: p.w, h: p.h, thickness: p.thickness,
      operations: p.meta?.frontDecoration?.operations.length || 0 })), expected.parts);
  }
});

test('decorating all front families preserves carcass and hardware machining', () => {
  for (const type of ['BUD', 'BUDR', 'BUDR4', 'BUDTALL', 'WARDROBE', 'WUD', 'LOW_CABINET', 'SINK', 'DW_PANEL']) {
    const params = { ...defaultParamsFor(type, P), front_type: 'G' };
    const old = computeCabinet(params, P);
    const next = computeCabinet({ ...params, front_decoration: defaultFrontDecoration('G') }, P);
    assert.deepEqual(next.drills, old.drills, type);
    assert.deepEqual(next.hardware, old.hardware, type);
    assert.deepEqual(next.panels.filter((p) => p.role !== 'front'), old.panels.filter((p) => p.role !== 'front'), type);
    const fronts = next.panels.filter((p) => p.role === 'front');
    assert.ok(fronts.length, type);
    for (const front of fronts) assert.equal(front.meta.frontDecoration.status, 'ready', `${type} ${front.id}`);
  }
});

test('BOM distinguishes machining recipes on equal front blanks', () => {
  const first = result('G'); const second = result('FL');
  const bom = buildBom([{ unit: { id: 'one' }, result: first }, { unit: { id: 'two' }, result: second }]);
  const fronts = bom.cutRows.filter((p) => p.role === 'front');
  assert.equal(fronts.length, 2);
  // T76 F5 · `manufacturing` keeps identity and construction; the line's state is readiness.
  assert.deepEqual(fronts.map((p) => p.manufacturing.construction.split(' · ')[0]), ['G', 'FL']);
  assert.ok(fronts.every((p) => p.readiness === 'cut'));
  assert.ok(fronts.every((p) => p.qty === 1));
});

test('applied moulding is four real cut parts, with independent thickness-correct stock', () => {
  const params = { front_type_id: 'f1' };
  const made = result('AM', params);
  const front = made.panels.find((p) => p.meta?.frontDecoration);
  const strips = made.panels.filter((p) => p.meta?.frontDecorationParent);
  assert.equal(strips.length, 4);
  assert.equal(made.totals.pieces_total, result('F').totals.pieces_total + 4);
  assert.ok(strips.every((p) => p.box === null && p.thickness === 8 && p.cnc.outline.length === 4));
  const design = { fronts: { style: 'AM', types: [{ id: 'f1', material_id: 'mdf25' }] } };
  const materials = [{ id: 'mdf25', name: '25 mm MDF', thickness: 25 }, { id: 'mdf8', name: '8 mm MDF', thickness: 8 }];
  const context = { unit: { params }, design, profile: P, materials };
  assert.equal(materialSection(front, context).key, 'mat:mdf25');
  for (const strip of strips) {
    assert.equal(materialSection(strip, context).assigned, false);
    assert.notEqual(materialSection(strip, context).key, 'mat:mdf25');
    assert.equal(resolvePanelMaterial({ ...strip, meta: { ...strip.meta, material_id: 'mdf25' } }, context.unit, design, P, materials).assigned, false);
    assert.equal(resolvePanelMaterial({ ...strip, meta: { ...strip.meta, material_id: 'mdf8' } }, context.unit, design, P, materials).material_id, 'mdf8');
  }
  const bom = buildBom([{ unit: { id: 'one', params }, result: made }], { design, profile: P, materials });
  const rows = bom.units[0].rows.filter((p) => p.part === 'FRONT-MOULDING');
  assert.equal(rows.length, 4);
  // T76 F5 · the mitres ride the construction label; each strip is a cut line of its own.
  assert.ok(rows.every((row) => row.manufacturing.construction.includes('45/45')));
  assert.ok(rows.every((row) => row.readiness === 'cut'));
  assert.ok(strips.every((strip) => made.csvLines.some((line) => line.includes(`,${strip.id},`))));
});

test('hand-added rear bores revalidate decoration before 3D and export', () => {
  const original = result('G');
  const front = original.panels.find((p) => p.meta?.frontDecoration);
  const groove = front.meta.frontDecoration.operations[0];
  const x = (Math.min(...groove.points.map((p) => p[0])) + Math.max(...groove.points.map((p) => p[0]))) / 2;
  const changed = applyPartEdits(original, { [front.id]: { ops: [{ op: 'drill', layer: 'FRONT_HINGES_35MM', x, y: front.h / 2, d: 10, depth: 23 }] } });
  const after = changed.panels.find((p) => p.id === front.id);
  assert.equal(after.meta.frontDecoration.status, 'blocked');
  assert.ok(after.meta.frontDecoration.problems.some((p) => p.code === 'FRONT_DECORATION_BACK_BORE'));
  assert.equal(front.meta.frontDecoration.status, 'ready', 'the unedited engine result must stay immutable');
  assert.ok(exportGate([{ result: changed }], { profile: P }).held.some((p) => p.panelId === front.id));
});

test('hand edits remove blocked applied strips from every manufacturing output', () => {
  const original = result('AM', {}, 'WARDROBE');
  const front = original.panels.find((p) => p.meta?.frontDecoration);
  const oldParts = original.panels.filter((p) => p.meta?.frontDecorationParent === front.id);
  assert.equal(oldParts.length, 4);
  const changed = applyPartEdits(original, { [front.id]: { ops: [
    { op: 'drill', layer: 'HANDLES_5MM', x: 70, y: front.h / 2, d: 5 },
  ] } }, P);
  assert.equal(changed.panels.find((p) => p.id === front.id).meta.frontDecoration.status, 'blocked');
  assert.equal(changed.panels.filter((p) => p.meta?.frontDecorationParent === front.id).length, 0);
  assert.equal(changed.totals.pieces_total, original.totals.pieces_total - 4);
  const removedArea = oldParts.reduce((sum, p) => sum + p.area_m2, 0);
  assert.ok(Math.abs(changed.totals.front_area_m2 - original.totals.front_area_m2 + removedArea) < 0.000002);
  for (const part of oldParts) assert.ok(changed.csvLines.every((line) => !line.includes(`,${part.id},`)));
  assert.ok(exportGate([{ result: changed }], { profile: P }).held.some((p) => p.panelId === front.id));
  assert.equal(original.panels.filter((p) => p.meta?.frontDecorationParent === front.id).length, 4);
});

test('hiding an intersecting handle restores real strips, quantities and CSV together', () => {
  const original = result('AM', { project_handle: { type: 'knob' },
    front_decoration: { ...defaultFrontDecoration('AM'), mouldingInsetMm: 40 },
  }, 'WARDROBE');
  const front = original.panels.find((p) => p.meta?.frontDecoration.status === 'blocked');
  assert.ok(front, 'the handle intersects the applied strip');
  const handles = partFeatures(front, original.drills).filter((f) => f.kind === 'hole' && f.source.layer === 'HANDLES_5MM');
  assert.ok(handles.length > 0);
  const changed = applyPartEdits(original, { [front.id]: { ops: handles.map((f) => ({ op: 'hide', feature: f.fid })) } }, P);
  assert.equal(changed.panels.find((p) => p.id === front.id).meta.frontDecoration.status, 'ready');
  const strips = changed.panels.filter((p) => p.meta?.frontDecorationParent === front.id);
  assert.equal(strips.length, 4);
  assert.equal(changed.totals.pieces_total, original.totals.pieces_total + 4);
  for (const strip of strips) assert.ok(changed.csvLines.some((line) => line.includes(`,${strip.id},`)));
  assert.equal(original.panels.filter((p) => p.meta?.frontDecorationParent === front.id).length, 0);
});
