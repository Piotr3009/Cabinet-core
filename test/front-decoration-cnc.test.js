import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildUnitDxfFiles, sheetDxf, materialSheetDxf } from '../src/engine/cnc/dxf.js';
import { layoutPanels } from '../src/engine/cnc/layout.js';
import { exportGate, panelsThatGo } from '../src/engine/cnc/exportGate.js';
import {
  frontDecorationProblems, frontOperationsManifest, frontPanelEntities, FRONT_REFERENCE_LAYER,
} from '../src/engine/cnc/frontOperations.js';
import { exportUnitDxfZip, exportSheetDxf, exportMaterialDxf } from '../src/lib/cncExport.js';
import { readDxf, readPairs } from '../scripts/t53-dxf-audit.mjs';

function fixture() {
  const result = computeCabinet({ ...defaultParamsFor('BUD', P), front_type: 'F' }, P);
  const panel = result.panels.find((part) => part.role === 'front');
  panel.meta.frontDecoration = {
    version: 1, style: 'G', status: 'ready', problems: [],
    operations: [{
      id: 'asymmetric-pocket', kind: 'pocket', face: 'front',
      points: [[15, 30], [45, 30], [45, 80], [15, 80]],
      depth: 3, startDepth: 0, tool: { kind: 'endmill', diameter: 6 }, layer: 'FRONT_POCKET_D3_T6',
    }, {
      id: 'flute', kind: 'flute', face: 'front',
      centreline: [[60, 25], [60, 180]],
      depth: 3, startDepth: 0, tool: { kind: 'ballnose', diameter: 12 }, layer: 'FRONT_FLUTE_D3_T12',
      crossSection: { kind: 'circular', radius: 6, depth: 3, width: Math.sqrt(108) },
    }],
  };
  return { result, panel };
}

// Reader is independent of the writer. It reads R12 group pairs directly.
function polylines(dxf) {
  const { pairs, faults } = readPairs(dxf);
  assert.deepEqual(faults, []);
  const out = [];
  let poly = null;
  let vertex = null;
  let entity = null;
  for (const [code, value] of pairs) {
    if (code === 0) {
      if (vertex) { poly?.points.push(vertex); vertex = null; }
      entity = value;
      if (value === 'POLYLINE') { poly = { points: [] }; out.push(poly); }
      if (value === 'VERTEX') vertex = [];
      if (value === 'SEQEND') poly = null;
    } else if (poly) {
      if (entity === 'POLYLINE' && code === 8) poly.layer = value;
      if (entity === 'POLYLINE' && code === 70) poly.closed = Number(value) === 1;
      if (vertex && code === 10) vertex[0] = Number(value);
      if (vertex && code === 20) vertex[1] = Number(value);
    }
  }
  return out;
}

const area = (points) => points.reduce((sum, [x, y], i) => {
  const next = points[(i + 1) % points.length];
  return sum + x * next[1] - next[0] * y;
}, 0) / 2;

test('decorative front is a separate mirrored setup with opposite contour winding and no cups', () => {
  const { result, panel } = fixture();
  const files = buildUnitDxfFiles(result, P);
  const front = files.find((file) => file.panelId === panel.id && file.setup === 'front');
  const back = files.find((file) => file.panelId === panel.id && !file.setup);
  assert.ok(front);
  assert.equal(readDxf(front.dxf).circles.length, 0);
  assert.ok(readDxf(back.dxf).circles.length > 0);
  const polys = polylines(front.dxf);
  const pocket = polys.find((poly) => poly.layer === 'FRONT_POCKET_D3_T6');
  assert.deepEqual(pocket.points, [[panel.w - 15, 30], [panel.w - 45, 30], [panel.w - 45, 80], [panel.w - 15, 80]]);
  assert.equal(pocket.closed, true);
  assert.ok(area(pocket.points) < 0);
  assert.ok(area(polys.find((poly) => poly.layer === FRONT_REFERENCE_LAYER).points) > 0);
  const flute = polys.find((poly) => poly.layer === 'FRONT_FLUTE_D3_T12');
  assert.equal(flute.closed, false);
  assert.deepEqual(flute.points, [[panel.w - 60, 25], [panel.w - 60, 180]]);
  const parsed = readDxf(front.dxf);
  for (const layer of parsed.layersUsed) assert.ok(parsed.layersDeclared.has(layer));
});

test('old back DXF bytes are unchanged by an opt-in decoration', () => {
  const { result, panel } = fixture();
  const decorated = buildUnitDxfFiles(result, P).filter((file) => !file.setup);
  delete panel.meta.frontDecoration;
  assert.deepEqual(buildUnitDxfFiles(result, P), decorated);
});

test('curved polygon vertices survive front export and sheet transforms', () => {
  const { result, panel } = fixture();
  const points = [[10, 20], [100, 20]];
  for (let i = 0; i <= 32; i += 1) {
    const angle = Math.PI * i / 32;
    points.push([55 + 45 * Math.cos(angle), 100 + 45 * Math.sin(angle)]);
  }
  panel.meta.frontDecoration.operations = [{
    ...panel.meta.frontDecoration.operations[0], id: 'arch', points,
  }];
  const layout = layoutPanels(result.panels, result.drills, { gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth });
  const args = { panels: result.panels, drills: result.drills, layout, unitNum: result.unitNum, profile: P, setup: 'front' };
  const sheet = sheetDxf(args);
  const material = materialSheetDxf({ blocks: [args], gap: P.cnc.layoutGap, profile: P, setup: 'front' });
  assert.equal(sheet, material, 'one block uses identical sheet and material geometry');
  const exported = polylines(sheet).find((poly) => poly.layer === 'FRONT_POCKET_D3_T6');
  assert.equal(exported.points.length, points.length);
  assert.ok(area(exported.points) < 0);
  assert.equal(readDxf(sheet).circles.length, 0);
});

test('invalid decoration is held by the existing gate and override remains explicit', () => {
  const { result, panel } = fixture();
  panel.meta.frontDecoration.operations[0].depth = panel.thickness + 1;
  const gate = exportGate([{ result }], { profile: P });
  assert.ok(gate.held.some((entry) => entry.panelId === panel.id));
  assert.ok(!panelsThatGo(result.panels, { gate, unitId: null }).includes(panel));
  assert.ok(panelsThatGo(result.panels, { gate, unitId: null, exportAnyway: true }).includes(panel));
  const manifest = frontOperationsManifest([{ result }], { gate, exportAnyway: true });
  assert.equal(manifest.parts[0].status, 'blocked');
  assert.equal(manifest.parts[0].override, true);
  assert.equal(manifest.parts[0].operations[0].exported, false);
  assert.ok(!frontPanelEntities(panel).some((entity) => entity.operationId === 'asymmetric-pocket'));
  assert.ok(frontDecorationProblems(panel).some((message) => /thickness/.test(message)));
});

test('operation manifest distinguishes original face depth from recessed groove start', () => {
  const { result, panel } = fixture();
  const op = panel.meta.frontDecoration.operations[0];
  op.startDepth = 4;
  op.depth = 6;
  const manifest = frontOperationsManifest([{ result }]);
  const part = manifest.parts[0];
  assert.equal(part.thicknessMm, panel.thickness);
  assert.equal(part.operations[0].startDepthMm, 4);
  assert.equal(part.operations[0].finalDepthMm, 6);
  assert.equal(part.operations[0].cuttingDepthMm, 2);
  assert.match(manifest.setups.flip, /Do not flip a whole sheet/);
  assert.match(manifest.output, /G-code are not generated/);
});

async function captureDownload(run) {
  const oldDocument = globalThis.document;
  const oldCreate = URL.createObjectURL;
  const oldRevoke = URL.revokeObjectURL;
  let downloaded;
  let blob;
  URL.createObjectURL = (value) => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  globalThis.document = {
    body: { appendChild() {} },
    createElement: () => ({ click() { downloaded = { name: this.download, blob }; }, remove() {} }),
  };
  try { return { output: await run(), ...(downloaded || {}) }; }
  finally {
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
  }
}

test('all three download routes package front and back DXF with operation specifications', async () => {
  const { result, panel } = fixture();
  for (const run of [
    () => exportUnitDxfZip(result, P),
    () => exportSheetDxf(result, result.panels.map((part) => part.id), P),
    () => exportMaterialDxf([{ result, unit: { id: 'u1' }, panels: result.panels }], { profile: P }),
  ]) {
    const download = await captureDownload(run);
    assert.match(download.name, /\.zip$/);
    const zip = await JSZip.loadAsync(await download.blob.arrayBuffer());
    const names = Object.keys(zip.files);
    assert.ok(names.some((name) => /-FRONT\.dxf$/.test(name)));
    const manifest = JSON.parse(await zip.file(download.output.operationManifest).async('string'));
    assert.equal(manifest.parts[0].panelId, panel.id);
    assert.equal(manifest.parts[0].operations[0].finalDepthMm, 3);
    for (const name of names.filter((file) => /\.dxf$/.test(file))) {
      const dxf = await zip.file(name).async('string');
      const read = readDxf(dxf);
      assert.deepEqual(read.faults, []);
      assert.equal(read.acadver, 'AC1009');
      assert.ok(read.polys > 0);
      if (/-FRONT\.dxf$/.test(name)) assert.equal(read.circles.length, 0);
    }
  }
});

test('ordinary sheet export is still one DXF download', async () => {
  const { result, panel } = fixture();
  delete panel.meta.frontDecoration;
  const download = await captureDownload(() => exportSheetDxf(result, result.panels.map((part) => part.id), P));
  assert.match(download.name, /\.dxf$/);
  assert.equal(download.output.operationManifest, undefined);
  assert.equal(readDxf(await download.blob.text()).acadver, 'AC1009');
});

test('all production recipes reach separate CNC setups and applied mouldings have their own cut files', async () => {
  const { defaultFrontDecoration, DECORATIVE_FRONT_STYLES } = await import('../src/engine/frontDecoration.js');
  for (const style of DECORATIVE_FRONT_STYLES) {
    const result = computeCabinet({
      ...defaultParamsFor('BUD', P), front_type: style, front_decoration: defaultFrontDecoration(style),
    }, P);
    const panel = result.panels.find((part) => part.meta?.frontDecoration);
    assert.ok(panel, style);
    assert.deepEqual(frontDecorationProblems(panel), [], style);
    assert.equal(exportGate([{ result }], { profile: P }).ok, true, style);
    const files = buildUnitDxfFiles(result, P);
    const front = files.find((file) => file.panelId === panel.id && file.setup === 'front');
    assert.ok(front, style);
    const machining = polylines(front.dxf).filter((poly) => poly.layer !== FRONT_REFERENCE_LAYER);
    assert.equal(machining.length, panel.meta.frontDecoration.operations.length);
    assert.equal(readDxf(front.dxf).circles.length, 0);
    for (const operation of panel.meta.frontDecoration.operations) {
      const matched = machining.filter((poly) => poly.layer === operation.layer);
      assert.ok(matched.length > 0);
      if (operation.kind === 'flute') assert.ok(matched.every((poly) => !poly.closed));
      else assert.ok(matched.every((poly) => poly.closed && area(poly.points) < 0));
    }
    if (style === 'AM') {
      const strips = result.panels.filter((part) => part.meta?.frontDecorationParent === panel.id);
      assert.equal(strips.length, 4);
      for (const strip of strips) assert.ok(files.some((file) => file.panelId === strip.id));
      const manifest = frontOperationsManifest([{ result }]);
      assert.equal(manifest.parts[0].appliedParts.length, 4);
      assert.equal(manifest.parts[0].additions.length, 4);
      assert.equal(manifest.parts[0].additions[0].mitres.start, 45);
    }
  }
});

test('one export cannot reuse a machining layer for different depths across two units', () => {
  const first = fixture();
  const second = fixture();
  second.result.unitNum = '02';
  second.panel.meta.frontDecoration.operations[0].depth = 4;
  const gate = exportGate([
    { unit: { id: 'first' }, result: first.result },
    { unit: { id: 'second' }, result: second.result },
  ], { profile: P });
  assert.equal(gate.ok, false);
  assert.ok(gate.heldPanelIds.has(`first::${first.panel.id}`));
  assert.ok(gate.heldPanelIds.has(`second::${second.panel.id}`));
  assert.equal(gate.findings.filter((finding) => finding.code === 'front-layer-conflict').length, 2);
});
