import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildFrontDecoration, DECORATIVE_FRONT_STYLES, defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { frontDecorationLayers } from '../src/engine/cnc/frontOperations.js';
import { buildFrontElevation } from '../src/engine/drawings/frontElevation.js';
import { buildTopView } from '../src/engine/drawings/views.js';
import { frontDecorationElevation, frontDecorationMachinings } from '../src/engine/drawings/frontDecorationDrawing.js';
import { partDetailDrawing } from '../src/engine/drawings/partDetail.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { penWidth } from '../src/engine/drawings/layers.js';
import { bookletDoc } from '../src/lib/drawingExport.js';
import { hhEntries, HH_PROJECT, HH_ROOM } from './fixtures/t71-herbal-hill.js';

// Deliberately asymmetric: a centred rectangle cannot reveal a face reversal
// or a renderer silently substituting a contour's bounding box.
const POINTS = [[32, 40], [134, 40], [134, 150], [90, 195], [32, 120]];
const record = (extra = {}) => ({
  version: 1, style: 'A', face: 'front', thickness: 18,
  operations: [{ id: 'arch-1', kind: 'pocket', face: 'front', points: POINTS, depth: 6,
    startDepth: 2, tool: { kind: 'flat', diameter: 6 }, layer: 'FRONT_POCKET_D6' }],
  additions: [], problems: [], status: 'ready', ...extra,
});
const cabinet = () => computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', front_type: 'F' }, P);
const frontOf = (result) => result.panels.find((p) => p.part === 'FRONT');
const decorate = (panel, decoration = record()) => {
  panel.meta = { ...panel.meta, frontDecoration: decoration };
  return panel;
};

test('decorative drawing reflects CNC X once for elevation, retains every polygon vertex', () => {
  const panel = decorate(frontOf(cabinet()));
  const [drawn] = frontDecorationElevation(panel);
  assert.equal(drawn.kind, 'poly');
  assert.deepEqual(drawn.pts, POINTS.map(([x, y]) => [panel.box.x + panel.box.w - x, panel.box.y + y]));
  assert.ok(penWidth(drawn) < penWidth({ layer: 'DOORS', pen: 'VISIBLE' }), 'decoration is finer than the front edge');
  assert.deepEqual(panel.meta.frontDecoration.operations[0].points, POINTS, 'drawing leaves production geometry intact');
});

test('decorative face reaches the elevation but not the plan projection', () => {
  const result = cabinet();
  const before = buildTopView(result, { profile: P });
  decorate(frontOf(result));
  const elevation = buildFrontElevation(result, { profile: P });
  assert.equal(elevation.entities.filter((e) => e.meta === 'front-decoration').length, 1);
  assert.deepEqual(buildTopView(result, { profile: P }), before, 'a face motif is not a plan section');
});

test('part detail uses the CNC back datum and explains face, absolute depth, start depth and cutter', () => {
  const result = cabinet();
  const panel = decorate(frontOf(result));
  const detail = partDetailDrawing(panel, { profile: P, drills: result.drills });
  const operation = detail.machinings.find((m) => m.id === 'decoration-arch-1');
  assert.deepEqual(operation.pts, POINTS, 'the machining view shares its datum with back-face drills');
  assert.equal(operation.kind, 'path');
  assert.equal(operation.closed, true);
  assert.equal(operation.depth, 6);
  assert.match(operation.note, /FRONT FACE/);
  assert.match(operation.note, /6 mm total depth/);
  assert.match(operation.note, /starts 2 mm/);
  assert.match(operation.note, /flat diameter 6 mm/);
  assert.match(detail.note, /FRONT DXF mirrors X/);
  assert.equal(detail.legend.find((l) => l.name === 'FRONT_POCKET_D6').count, 1);
});

test('a polygon pocket keeps its exact outline in element detail while rectangle pockets stay compatible', () => {
  const panel = { id: 'example', w: 220, h: 250, cnc: { pockets: [
    { layer: 'SHAKER_PANEL_POCKET', pts: POINTS, depth: 6 },
    { layer: 'SHAKER_PANEL_POCKET', x1: 10, x2: 25, y1: 15, y2: 40, depth: 6 },
  ] } };
  const [polygon, rectangle] = partDetailDrawing(panel, { profile: P }).machinings;
  assert.deepEqual(polygon.pts, POINTS);
  assert.equal(polygon.id, 'pocket-0', 'selection keeps the original feature identity');
  assert.equal(polygon.kind, 'path');
  assert.equal(polygon.depth, 6);
  assert.equal(polygon.w, 102);
  assert.equal(polygon.h, 155);
  assert.equal(rectangle.kind, 'pocket');
  assert.deepEqual([rectangle.x, rectangle.y, rectangle.w, rectangle.h], [10, 15, 15, 25]);
});

test('applied moulding is drawn as an assembly reference rather than a pocket', () => {
  const panel = decorate(frontOf(cabinet()), record({ style: 'AM', operations: [], additions: [
    { id: 'bottom', kind: 'moulding', face: 'front', points: [[60, 60], [400, 60], [380, 80], [80, 80]],
      width: 20, length: 340, thickness: 8, projection: 8, mitreStart: 45, mitreEnd: 45 },
  ] }));
  assert.equal(frontDecorationElevation(panel).length, 1);
  const [addition] = frontDecorationMachinings(panel);
  assert.equal(addition.machiningKind, 'assembly-reference');
  assert.equal(addition.layer, 'FRONT_REFERENCE_NO_CUT');
  assert.match(addition.note, /ASSEMBLY REFERENCE ONLY/);
  assert.match(addition.note, /340 mm long/);
  assert.match(addition.note, /45 \/ 45 degrees/);
  assert.match(partDetailDrawing(panel, { profile: P }).note, /1 applied moulding piece/);
});

test('Drawing set SVG and PDF carry the same decorative contours as the unit drawing', () => {
  const entries = hhEntries(P);
  decorate(frontOf(entries[0].result));
  const set = wallDrawingSheets({ entries, project: HH_PROJECT, room: HH_ROOM, profile: P, date: '09.10.2026' });
  const frontSheet = set.find((s) => s.variant === 'fronts' && s.wall === 0).sheet;
  const paths = frontSheet.entities.filter((e) => e.meta === 'front-decoration');
  assert.equal(paths.length, 1);
  assert.equal(paths[0].pts.length, POINTS.length);
  assert.match(sheetToSvg(frontSheet), /<path[^>]+data-cc="front-decoration"/);
  const doc = bookletDoc([frontSheet]);
  assert.equal(doc.getNumberOfPages(), 1);
  assert.ok(doc.output().includes('/Type /Page'), 'the production sheet is rendered as a real PDF');
});

test('legacy fronts have no decorative drawing record or machining detail', () => {
  const panel = frontOf(cabinet());
  assert.deepEqual(frontDecorationElevation(panel), []);
  assert.deepEqual(frontDecorationMachinings(panel), []);
  assert.equal(partDetailDrawing(panel, { profile: P }).note, '');
});

test('every default decorative recipe reaches its drawing through the canonical production record', () => {
  for (const style of DECORATIVE_FRONT_STYLES) {
    const panel = frontOf(cabinet());
    const decoration = buildFrontDecoration({ panel, config: defaultFrontDecoration(style) });
    assert.equal(decoration.status, 'ready', `${style}: ${JSON.stringify(decoration.problems)}`);
    decorate(panel, decoration);
    const drawn = frontDecorationElevation(panel);
    assert.equal(drawn.length, decoration.operations.length + decoration.additions.length, style);
    assert.ok(drawn.length > 0, `${style} has visible detail`);
    const paths = frontDecorationMachinings(panel);
    assert.equal(paths.length, drawn.length, `${style} has a manufacturing detail for every contour`);
    for (const item of [...decoration.operations, ...decoration.additions]) {
      const path = paths.find((m) => m.id.endsWith(item.id));
      assert.deepEqual(path.pts, item.points, `${style}: ${item.id} preserves its cutting or assembly contour`);
    }
  }
});

test('a refused recipe is stated in detail instead of silently looking like an intended flat front', () => {
  const panel = frontOf(cabinet());
  decorate(panel, buildFrontDecoration({ panel, config: { ...defaultFrontDecoration('A'), frameMm: 500 } }));
  assert.equal(panel.meta.frontDecoration.status, 'blocked');
  const drawing = partDetailDrawing(panel, { profile: P });
  assert.match(drawing.note, /Decoration blocked:/);
  assert.match(drawing.note, /frame/i);
  assert.equal(drawing.machinings.filter((m) => m.id.startsWith('decoration-')).length, 0);
});

test('part-detail legends use the same generated layer labels and colours as CNC, including fractional depths', () => {
  for (const style of ['GF', 'FL', 'AM']) {
    const panel = frontOf(cabinet());
    const config = defaultFrontDecoration(style);
    if (style !== 'AM') config.grooveDepthMm = 2.5;
    decorate(panel, buildFrontDecoration({ panel, config }));
    const expected = new Map(frontDecorationLayers([panel]).map((layer) => [layer.name, layer]));
    const detail = partDetailDrawing(panel, { profile: P });
    const decorationNames = new Set(frontDecorationMachinings(panel).map((item) => item.layer));
    for (const name of decorationNames) {
      const layer = detail.legend.find((item) => item.name === name);
      assert.ok(layer, `${style}: ${name} is present`);
      assert.equal(layer.label, expected.get(name).label);
      assert.equal(layer.colour, expected.get(name).screen);
      assert.equal(layer.kind, expected.get(name).kind);
      assert.notEqual(layer.label, 'Other');
    }
  }
});
