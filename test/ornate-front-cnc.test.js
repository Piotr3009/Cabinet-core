import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildUnitDxfFiles, parseDxf } from '../src/engine/cnc/dxf.js';
import { exportGate } from '../src/engine/cnc/exportGate.js';
import { frontOperationsManifest, frontPanelEntities, frontDecorationLayers, ornateReferenceContourLayer, FRONT_REFERENCE_LAYER } from '../src/engine/cnc/frontOperations.js';
import { buildOrnateReferenceFiles, ornateFrontSurface, ornateLevelSurface, ornateReferenceProblems, ornateSurfaceStl, readBinaryStl } from '../src/engine/cnc/ornateExport.js';
import { exportUnitDxfZip, exportSheetDxf, exportMaterialDxf } from '../src/lib/cncExport.js';

const box = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
function fixture() {
  const result = computeCabinet({ ...defaultParamsFor('BUD', P), front_type: 'F' }, P);
  const panel = result.panels.find((p) => p.role === 'front');
  panel.meta.frontDecoration = {
    version: 1, style: 'ORNATE_A_1', status: 'ready', problems: [], additions: [],
    referenceOnly: true, parameters: { version: 1, style: 'ORNATE_A_1', boardMm: 18 },
    operations: [{
      id: 'proposed-relief', kind: 'relief', face: 'front', readiness: 'geometry',
      startDepth: 0, depth: 12, points: box(60, 60, 200, 250),
      contours: [3, 6, 9, 12].map((depth, index) => ({
        id: `level-${index + 1}`, kind: 'profile-level', depth, startDepth: index * 3,
        points: box(80 + index, 80 + index, 160 - index, 190 - index),
      })).concat([{ id: 'leaf', kind: 'ornament-reference', depth: null, points: [[64, 68], [69, 64], [75, 72]] }]),
      surface: {
        vertices: [[60, 60, 0], [200, 60, 0], [200, 250, 12], [60, 250, 12]],
        triangles: [[0, 1, 2], [0, 2, 3]],
      },
    }],
  };
  return { result, panel };
}

async function captureDownload(run) {
  const saved = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let blob; let name;
  URL.createObjectURL = (value) => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  globalThis.document = { body: { appendChild() {} }, createElement: () => ({ click() { name = this.download; }, remove() {} }) };
  try {
    const output = await run();
    return { output, name, zip: await JSZip.loadAsync(await blob.arrayBuffer()) };
  } finally {
    if (saved.document === undefined) delete globalThis.document; else globalThis.document = saved.document;
    URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke;
  }
}

// T77 F4 · "The slab is cut; the relief ships as CAD/CAM reference files with
// the state geometry" (CLAUDE.md T77, THE ORDER 2), and the Check speaks only
// of a board too thin: a relief that BUILT holds nothing and says nothing.
test('a built Ornate relief holds nothing: the slab is cut, the relief stays geometry and cannot self-approve', () => {
  const { result, panel } = fixture();
  panel.meta.frontDecoration.productionApproved = true;
  panel.meta.frontDecoration.referenceOnly = false;
  const gate = exportGate([{ result }], { profile: P });
  assert.ok(!gate.held.some((h) => h.panelId === panel.id), 'the slab is cut');
  assert.ok(!gate.findings.some((f) => f.panel === panel.id), 'the Check says nothing of a relief that built');
  const manifest = frontOperationsManifest([{ result }], { gate, exportAnyway: true });
  assert.equal(manifest.parts[0].readiness, 'cut', 'existing slab readiness is unchanged');
  assert.equal(manifest.parts[0].productionApproved, false);
  assert.equal(manifest.parts[0].operations[0].readiness, 'geometry');
  assert.equal(manifest.parts[0].operations[0].exported, false);
  assert.equal(manifest.parts[0].exported, false);
  assert.deepEqual(frontPanelEntities(panel).map((e) => e.layer), [FRONT_REFERENCE_LAYER]);
});

test('Ornate reference DXF declares 3/6/9/12 depth layers plus ornament without back drilling', () => {
  const { result, panel } = fixture();
  const files = buildOrnateReferenceFiles([{ result }]);
  assert.equal(files.length, 3);
  const dxf = parseDxf(files.find((f) => f.type === 'dxf').contents);
  assert.ok(dxf.entities.every((entity) => entity.type === 'poly'));
  const layers = new Set(dxf.layerTable.map((l) => l.name));
  for (const name of [FRONT_REFERENCE_LAYER, 'FRONT_REF_ORNAMENT', ...[3, 6, 9, 12].map((d) => `FRONT_REF_PROFILE_D${d}`)]) assert.ok(layers.has(name), name);
  const leaf = dxf.entities.find((e) => e.layer === 'FRONT_REF_ORNAMENT');
  assert.deepEqual(leaf.pts, [[panel.w - 64, 68], [panel.w - 69, 64], [panel.w - 75, 72]], 'exactly one part reflection');
  const spec = JSON.parse(files.find((f) => f.type === 'json').contents);
  assert.equal(spec.units, 'mm');
  assert.equal(spec.productionApproved, false);
  assert.deepEqual(spec.operations[0].contours.slice(0, 4).map((c) => c.finalDepthMm), [3, 6, 9, 12]);
  assert.match(spec.operations[0].contours[0].meaning, /Not a flat pocket/);
  assert.match(spec.datum.transform, /frontZ = -depth/);
  assert.match(spec.operations[0].surface.meaning, /not a watertight/);
});

test('STL uses canonical vertices at mm scale, local reflection once, depth below Z0 and outward normals', () => {
  const surface = { vertices: [[10, 20, 3], [30, 20, 3], [30, 40, 3]], triangles: [[0, 1, 2]] };
  const front = ornateFrontSurface(surface, 600);
  assert.deepEqual(front.vertices, [[590, 20, -3], [570, 20, -3], [570, 40, -3]]);
  // T77 F3 · BINARY STL: 80 byte header, uint32 count, 50 bytes a triangle.
  const stl = ornateSurfaceStl(front);
  assert.ok(stl instanceof Uint8Array);
  assert.equal(stl.byteLength, 80 + 4 + 50);
  const read = readBinaryStl(stl);
  assert.equal(read.count, 1);
  assert.doesNotMatch(read.header, /^solid/, 'a binary header never opens with "solid"');
  assert.match(read.header, /mm/);
  assert.deepEqual(read.triangles[0].normal, [0, 0, 1]);
  assert.deepEqual(read.triangles[0].vertices[0], [590, 20, -3]);
});

test('invalid proposed depth or surface cannot leak NaN or machining geometry into reference files', () => {
  for (const change of [
    (op) => { op.contours[0].depth = NaN; },
    (op) => { op.surface.vertices[0][0] = Infinity; },
    (op) => { op.surface.triangles[0][0] = 999999; },
    (op) => { op.surface.triangles[0] = [0, 0, 0]; },
    (op) => { op.depth = 100; },
  ]) {
    const { result, panel } = fixture();
    change(panel.meta.frontDecoration.operations[0]);
    assert.ok(ornateReferenceProblems(panel).length);
    const files = buildOrnateReferenceFiles([{ result }]);
    assert.deepEqual(files.map((f) => f.type), ['json']);
    const spec = JSON.parse(files[0].contents);
    assert.equal(spec.status, 'invalid-reference');
    assert.ok(spec.problems.length);
    assert.deepEqual(spec.operations, []);
  }
});

test('all ordinary BACK DXFs stay byte-identical when Ornate metadata is attached', () => {
  const { result, panel } = fixture();
  const decorated = buildUnitDxfFiles(result, P).filter((file) => file.setup !== 'front');
  delete panel.meta.frontDecoration;
  assert.deepEqual(buildUnitDxfFiles(result, P), decorated);
});

test('all three ZIP routes carry the slab\'s back DXF beside the proposed DXF/STL/JSON', async () => {
  const { result, panel } = fixture();
  const only = { ...result, panels: [panel], drills: result.drills.filter((d) => d.panel === panel.id) };
  for (const run of [
    () => exportUnitDxfZip(only, P),
    () => exportSheetDxf(result, [panel.id], P),
    () => exportMaterialDxf([{ unit: { id: 'u1' }, result, panels: [panel] }], { profile: P }),
  ]) {
    const { zip, output, name } = await captureDownload(run);
    assert.match(name, /\.zip$/);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    assert.ok(names.some((n) => /PROPOSED-FRONT\.dxf$/.test(n)));
    assert.ok(names.some((n) => /PROPOSED-RELIEF-1\.stl$/.test(n)));
    assert.ok(names.some((n) => /PROPOSED-operations\.json$/.test(n)));
    // T77 F4 · the slab goes to the machine: its back setup is in the ZIP.
    assert.ok(names.some((n) => /\.dxf$/i.test(n) && !/PROPOSED/.test(n) && !/-FRONT\.dxf$/.test(n)), names.join(', '));
    assert.deepEqual(output.held, []);
    assert.ok(output.readinessBanner, 'the reference files are counted as geometry, not cut');
    const manifest = JSON.parse(await zip.file(output.operationManifest).async('string'));
    assert.equal(manifest.parts[0].exported, false, 'the relief is never exported as machining');
    assert.equal(manifest.parts[0].referenceFiles.length, 3);
    // T77 F3 · the manifest records which level was written, and the bytes.
    assert.ok(manifest.parts[0].referenceFiles.every((f) => f.referenceLevel === 'reference' && f.bytes > 0));
    assert.equal(manifest.parts[0].operations[0].readiness, 'geometry');
  }
});

test('Export anyway overrides nothing for a built relief and never promotes it', async () => {
  const { result, panel } = fixture();
  const { zip, output } = await captureDownload(() => exportSheetDxf(result, [panel.id], P, { exportAnyway: true }));
  const names = Object.keys(zip.files);
  assert.ok(names.some((n) => /-BACK\.dxf$/.test(n)));
  const manifest = JSON.parse(await zip.file(output.operationManifest).async('string'));
  // T77 F4 · nothing was held, so nothing was overridden.
  assert.equal(manifest.parts[0].override, false);
  assert.equal(manifest.parts[0].productionApproved, false);
  assert.equal(manifest.parts[0].operations[0].exported, false);
  const standardFrontName = names.find((n) => /-FRONT\.dxf$/.test(n) && !n.includes('PROPOSED'));
  const front = parseDxf(await zip.file(standardFrontName).async('string'));
  assert.deepEqual(front.entities.map((e) => e.layer), [FRONT_REFERENCE_LAYER]);
});

test('duplicate cabinet names and panel IDs produce distinct reference filenames', () => {
  const { result, panel } = fixture();
  const files = buildOrnateReferenceFiles([
    { unit: { id: 'first' }, result, panels: [panel] },
    { unit: { id: 'second' }, result, panels: [panel] },
  ]);
  assert.equal(files.length, 6);
  assert.equal(new Set(files.map((f) => f.name)).size, 6);
});

test('all four real 600 by 800 reference fronts hand off the same surface function and layer depths', async () => {
  const { buildOrnateFront, defaultOrnateConfig, ORNATE_STYLE_IDS } = await import('../src/engine/ornateFront.js');
  for (const style of ORNATE_STYLE_IDS) {
    const panel = { id: style, w: 600, h: 800, thickness: 18, cnc: { drawn_w: 600, drawn_h: 800, outline: box(0, 0, 600, 800) }, meta: {} };
    panel.meta.frontDecoration = buildOrnateFront({ panel, style, config: defaultOrnateConfig(style, P), profile: P });
    assert.deepEqual(ornateReferenceProblems(panel), [], style);
    const op = panel.meta.frontDecoration.operations[0];
    const files = buildOrnateReferenceFiles([{ panels: [panel] }]);
    const spec = JSON.parse(files.find((f) => f.type === 'json').contents);
    // T77 F3 · the STL is the default level ('reference') of the SAME
    // function, on the record's own panel and parameters; binary, mm.
    const stl = readBinaryStl(files.find((f) => f.type === 'stl').contents);
    assert.equal(stl.count, ornateLevelSurface(panel, 'reference', P).surface.triangles.length);
    assert.equal(spec.operations[0].surface.triangles, stl.count);
    assert.equal(spec.operations[0].surface.format, 'binary STL');
    assert.equal(spec.reference.level, 'reference');
    assert.equal(spec.reference.sampleMm, P.front.decoration.ornateReference.sampleMm);
    assert.deepEqual(spec.operations[0].contours.filter((c) => c.kind === 'profile-level').map((c) => c.finalDepthMm), [3, 6, 9, 12]);
    assert.equal(spec.operations[0].remainingThicknessMm, 6);
    const ornaments = spec.operations[0].contours.filter((c) => c.kind === 'ornament-reference');
    assert.equal(ornaments.length > 0, style !== 'ORNATE_A_4');
    assert.ok(ornaments.every((c) => c.finalDepthMm === null && c.startDepthMm === null));
    const transformed = ornateFrontSurface(op.surface, 600);
    const floorTriangles = transformed.triangles.filter((tri) => tri.every((index) => Math.abs(transformed.vertices[index][2] + 12) < 1e-6));
    assert.ok(floorTriangles.length);
    for (const tri of floorTriangles) {
      const [a, b, c] = tri.map((i) => transformed.vertices[i]);
      assert.ok((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0, `${style} STL floor points out of stock`);
    }
  }
});

test('real computeCabinet Ornate selection produces references through the existing unit ZIP button', async () => {
  const { defaultFrontDecoration } = await import('../src/engine/frontDecoration.js');
  const result = computeCabinet({ ...defaultParamsFor('BUD', P), front_type: 'ORNATE_A_1', front_decoration: defaultFrontDecoration('ORNATE_A_1', P) }, P);
  const panel = result.panels.find((p) => p.meta?.frontDecoration?.style === 'ORNATE_A_1');
  assert.ok(panel);
  assert.equal(panel.meta.frontDecoration.status, 'ready');
  const { zip, output } = await captureDownload(() => exportUnitDxfZip(result, P));
  assert.ok(output.referenceFiles.some((name) => name.endsWith('.stl')));
  const manifest = JSON.parse(await zip.file(output.operationManifest).async('string'));
  assert.equal(manifest.parts[0].productionApproved, false);
  assert.equal(manifest.parts[0].operations[0].readiness, 'geometry');
});


test('read-only CNC preview matches proposed DXF contours, datum and layers without enabling production entities', () => {
  const { result, panel } = fixture();
  const preview = frontPanelEntities(panel, { referencePreview: true });
  const references = preview.filter((entity) => entity.referenceOnly);
  const files = buildOrnateReferenceFiles([{ result }]);
  const dxf = parseDxf(files.find((file) => file.type === 'dxf').contents);
  const dxfReferences = dxf.entities.filter((entity) => entity.layer !== FRONT_REFERENCE_LAYER);
  assert.equal(references.length, 5);
  assert.equal(new Set(references.map((entity) => entity.operationId)).size, references.length);
  assert.deepEqual(references.map(({ layer, closed, pts }) => ({ layer, closed, pts })),
    dxfReferences.map(({ layer, closed, pts }) => ({ layer, closed, pts })));
  assert.equal(references.find((entity) => entity.referenceKind === 'ornament-reference').depth, null);
  const previewLayers = frontDecorationLayers([panel], { referencePreview: true });
  for (const entity of references) {
    const layer = previewLayers.find((entry) => entry.name === entity.layer);
    assert.equal(layer.referenceOnly, true);
    assert.match(layer.label, /Proposed/);
    assert.equal(layer.kind, 'mark');
  }
  assert.deepEqual(frontPanelEntities(panel).map((entity) => entity.layer), [FRONT_REFERENCE_LAYER]);
  assert.deepEqual(frontDecorationLayers([panel]).map((layer) => layer.name), [FRONT_REFERENCE_LAYER]);
  assert.equal(ornateReferenceContourLayer({ kind: 'profile-level', depth: 3.5 }), 'FRONT_REF_PROFILE_D3P5');
  assert.equal(ornateReferenceContourLayer({ kind: 'profile-level', depth: NaN }), null);
});

test('opting into reference preview leaves existing production pocket geometry and layers unchanged', () => {
  const { panel } = fixture();
  panel.meta.frontDecoration.style = 'G';
  panel.meta.frontDecoration.operations = [{ id: 'legacy-pocket', kind: 'pocket', face: 'front', points: box(20, 20, 90, 90),
    depth: 3, startDepth: 0, tool: { kind: 'endmill', diameter: 6 }, layer: 'FRONT_POCKET_D3_T6' }];
  assert.deepEqual(frontPanelEntities(panel, { referencePreview: true }), frontPanelEntities(panel));
  assert.deepEqual(frontDecorationLayers([panel], { referencePreview: true }), frontDecorationLayers([panel]));
});
