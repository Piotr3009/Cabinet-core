// The reconstructed Ornate family is a CAD/CAM reference handoff. It never
// creates approved production machining or G-code, including Export anyway.
import { writeDxf, entitiesExtents } from './dxf.js';
import { fileSafeName } from '../naming.js';
import { getCabinetProfile } from '../profile.js';
import { buildOrnateFront, ornateSampling } from '../ornateFront.js';
import { frontDecorationOf, isOrnateReference, ornateReferenceContourLayer, FRONT_REFERENCE_LAYER, ORNATE_REFERENCE_MESSAGE } from './frontOperations.js';

// ─── T77 F3 · THE TWO LEVELS OF THE REFERENCE FILES ─────────────────────────
// CLAUDE.md T77 F3: *"The CNC export offers two levels in the existing export
// options (no new numeric field): Reference (default) at sampleMm and Full
// resolution at fullSampleMm; the manifest records which one was written."*
export const ORNATE_REFERENCE_LEVELS = Object.freeze([
  Object.freeze({ id: 'reference', label: 'Reference (default)' }),
  Object.freeze({ id: 'full', label: 'Full resolution' }),
]);
const levelOf = (id) => ORNATE_REFERENCE_LEVELS.find((level) => level.id === id) || ORNATE_REFERENCE_LEVELS[0];

const EPS = 1e-6;
const MAX_VERTICES = 1000000;
const finitePositive = (value) => Number.isFinite(value) && value > 0;
const pointsOk = (points, count = 3) => Array.isArray(points) && points.length >= count
  && points.every((point) => Array.isArray(point) && point.length >= 2 && point.slice(0, 2).every(Number.isFinite));
const sizeOf = (panel) => ({
  width: Number(panel.cnc?.drawn_w ?? panel.w),
  height: Number(panel.cnc?.drawn_h ?? panel.h),
  thickness: Number(panel.thickness),
});
const localFront = (point, width) => [width - point[0], point[1]];

function normalOf(a, b, c) {
  const u = b.map((v, i) => v - a[i]); const v = c.map((n, i) => n - a[i]);
  const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...normal);
  return length > 1e-10 ? normal.map((n) => n / length) : null;
}

/** Numeric and datum validation before any proposed CAD geometry is written. */
export function ornateReferenceProblems(panel) {
  if (!isOrnateReference(panel)) return [];
  const decoration = frontDecorationOf(panel);
  const problems = (Array.isArray(decoration.problems) ? decoration.problems : []).map((p) => typeof p === 'string' ? p : p.message || p.code || 'Invalid pattern.');
  const { width, height, thickness } = sizeOf(panel);
  if (![width, height, thickness].every((v) => finitePositive(v) && v <= 100000)) problems.push('Reference part dimensions must be finite positive millimetres.');
  if (decoration.version !== 1) problems.push('Unsupported reference decoration version.');
  if (decoration.status !== 'ready') problems.push('The proposed geometry is not valid for reference export.');
  const operations = decoration.operations;
  if (!Array.isArray(operations) || !operations.length) problems.push('Reference relief geometry is missing.');
  for (const operation of Array.isArray(operations) ? operations : []) {
    const op = operation || {};
    const name = op.id || 'relief';
    if (op.kind !== 'relief' || op.face !== 'front') problems.push(`${name}: a front-face relief surface is required.`);
    if (!finitePositive(op.depth) || op.depth >= thickness || !Number.isFinite(op.startDepth)
      || op.startDepth < 0 || op.startDepth >= op.depth) problems.push(`${name}: invalid start or final depth.`);
    if (!pointsOk(op.points)) problems.push(`${name}: reference boundary is missing or non-finite.`);
    if (!Array.isArray(op.contours) || !op.contours.length) problems.push(`${name}: profile reference contours are missing.`);
    for (const contour of Array.isArray(op.contours) ? op.contours : []) {
      if (!pointsOk(contour.points, contour.closed === false ? 2 : 3)) problems.push(`${name}: contour coordinates are missing or non-finite.`);
      if (!ornateReferenceContourLayer(contour)) problems.push(`${name}: unsupported reference contour kind or layer depth.`);
      if (contour.kind === 'profile-level' && (!finitePositive(contour.depth) || contour.depth > op.depth || contour.depth >= thickness
        || !Number.isFinite(contour.startDepth) || contour.startDepth < 0 || contour.startDepth >= contour.depth
        || Math.abs(contour.depth - Number(contour.depth.toFixed(6))) > 1e-10)) problems.push(`${name}: contour depth is invalid or cannot be represented to 0.000001 mm.`);
      if (contour.kind === 'ornament-reference' && (contour.depth != null || contour.startDepth != null)) problems.push(`${name}: ornament projections have variable surface depth, not a constant cutting depth.`);
      if ((Array.isArray(contour.points) ? contour.points : []).some((p) => !Array.isArray(p) || p[0] < -EPS || p[0] > width + EPS || p[1] < -EPS || p[1] > height + EPS)) problems.push(`${name}: contour leaves the part boundary.`);
    }
    const vertices = op.surface?.vertices;
    const triangles = op.surface?.triangles;
    if (!Array.isArray(vertices) || vertices.length < 3 || vertices.length > MAX_VERTICES
      || !vertices.every((p) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite)
        && p[0] >= -EPS && p[0] <= width + EPS && p[1] >= -EPS && p[1] <= height + EPS
        && p[2] >= -EPS && p[2] <= op.depth + EPS)) {
      problems.push(`${name}: relief vertices are missing, non-finite or outside the part and depth bounds.`);
      continue;
    }
    if (!Array.isArray(triangles) || !triangles.length || triangles.length > MAX_VERTICES * 4
      || !triangles.every((t) => Array.isArray(t) && t.length === 3
        && t.every((i) => Number.isInteger(i) && i >= 0 && i < vertices.length)
        && normalOf(...t.map((i) => vertices[i])))) problems.push(`${name}: relief triangles contain invalid indices or degenerate faces.`);
  }
  return [...new Set(problems)];
}

/** An exact transform of the canonical mesh; no independent sampled relief. */
export function ornateFrontSurface(surface, width) {
  return {
    vertices: surface.vertices.map(([x, y, depth]) => [width - x, y, -depth]),
    // Canonical floors are CCW in back-view XY, with depth stored as a
    // scalar. After the front-view reflection their winding is reversed so
    // the machining target points out of the stock, toward positive Z.
    triangles: surface.triangles.map(([a, b, c]) => [a, c, b]),
  };
}

/**
 * T77 F3 · BINARY STL: an 80 byte header, a uint32 triangle count, then 50
 * bytes per triangle (normal and three vertices as little-endian float32,
 * and a zero uint16). STL has no unit field: the operation JSON says mm. The
 * header never opens with "solid", the word readers take for an ASCII file.
 */
const STL_HEADER_BYTES = 80;
const STL_TRIANGLE_BYTES = 50;
export function ornateSurfaceStl(surface, name = 'ORNATE_PROPOSED_REFERENCE') {
  const count = surface.triangles.length;
  const bytes = new Uint8Array(STL_HEADER_BYTES + 4 + STL_TRIANGLE_BYTES * count);
  const header = `Cabinet Core ${fileSafeName(name, 'ORNATE_PROPOSED_REFERENCE')} mm, proposed reference, not production approved`;
  for (let i = 0; i < STL_HEADER_BYTES; i += 1) bytes[i] = i < header.length ? header.charCodeAt(i) & 0x7f : 0x20;
  const view = new DataView(bytes.buffer);
  view.setUint32(STL_HEADER_BYTES, count, true);
  let at = STL_HEADER_BYTES + 4;
  for (const triangle of surface.triangles) {
    const points = triangle.map((index) => surface.vertices[index]);
    const normal = normalOf(...points);
    if (!normal || !points.every((p) => p.every(Number.isFinite))) throw new Error('Cannot serialize invalid Ornate relief triangles.');
    for (const value of [...normal, ...points.flat()]) { view.setFloat32(at, value, true); at += 4; }
    view.setUint16(at, 0, true); at += 2;
  }
  return bytes;
}

/** The triangle count and the triangles of a binary STL written above. */
export function readBinaryStl(bytes) {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const count = view.getUint32(STL_HEADER_BYTES, true);
  const header = String.fromCharCode(...buffer.subarray(0, STL_HEADER_BYTES)).trimEnd();
  const triangles = [];
  for (let n = 0, at = STL_HEADER_BYTES + 4; n < count; n += 1, at += STL_TRIANGLE_BYTES) {
    const f = (k) => view.getFloat32(at + 4 * k, true);
    triangles.push({ normal: [f(0), f(1), f(2)], vertices: [[f(3), f(4), f(5)], [f(6), f(7), f(8)], [f(9), f(10), f(11)]] });
  }
  return { header, count, triangles, bytes: buffer.byteLength };
}

const byteLength = (contents) => (typeof contents === 'string' ? new TextEncoder().encode(contents).length : contents.byteLength);

// T77 F3 · the operation JSON, indented as GPT wrote it, except that an array
// of plain numbers (a point, a list of widths) stays on ONE line: the same
// JSON to a parser, a third of the bytes of one number per line.
function readableJson(value, indent = '') {
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    if (value.every((item) => typeof item === 'number' || item === null)) return JSON.stringify(value).replaceAll(',', ', ');
    const inner = `${indent}  `;
    return `[\n${value.map((item) => `${inner}${readableJson(item, inner)}`).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (!entries.length) return '{}';
    const inner = `${indent}  `;
    return `{\n${entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${readableJson(item, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * T77 F3 · the relief surface a level writes: the SAME function the record
 * came from (`buildOrnateFront`), at the level's numbers off the profile, on
 * the record's own panel and parameters. The record (the 3D) is not touched.
 */
export function ornateLevelSurface(panel, level = 'reference', profile = getCabinetProfile()) {
  const decoration = frontDecorationOf(panel);
  const built = buildOrnateFront({ panel, config: decoration?.parameters, style: decoration?.style, profile, level: levelOf(level).id });
  const op = built?.status === 'ready' ? built.operations?.[0] : null;
  return op?.surface
    ? { surface: op.surface, sampling: ornateSampling(profile, levelOf(level).id), problems: [] }
    : { surface: null, sampling: ornateSampling(profile, levelOf(level).id),
      problems: (built?.problems || [{ message: 'The reference surface could not be built at this level.' }]).map((p) => p.message || String(p)) };
}

function referencePartFiles(panel, { unitId, unitNum, index, level, profile }) {
  const decoration = frontDecorationOf(panel);
  const { width, height, thickness } = sizeOf(panel);
  const problems = ornateReferenceProblems(panel);
  const stem = `ornate-reference/${fileSafeName(unitNum, 'unit')}-${fileSafeName(panel.id, 'part')}-${index + 1}-ORNATE-PROPOSED`;
  const chosen = levelOf(level);
  const common = { unitId, unitNum, panelId: panel.id, setup: 'front-reference', referenceOnly: true, referenceLevel: chosen.id };
  const files = [];
  const operations = [];
  const sampled = problems.length ? null : ornateLevelSurface(panel, chosen.id, profile);
  if (sampled && !sampled.surface) problems.push(...sampled.problems.map((message) => `${chosen.label}: ${message}`));
  if (!problems.length) {
    const outline = [[0, 0], [width, 0], [width, height], [0, height]];
    const entities = [{ type: 'poly', layer: FRONT_REFERENCE_LAYER, closed: true, pts: outline }];
    for (const [operationIndex, op] of decoration.operations.entries()) {
      const contours = op.contours.map((contour) => ({
        id: contour.id, kind: contour.kind, layer: ornateReferenceContourLayer(contour), closed: contour.closed !== false,
        startDepthMm: contour.startDepth ?? null, finalDepthMm: contour.depth ?? null,
        pointsFrontMm: contour.points.map((p) => localFront(p, width)),
        meaning: contour.kind === 'profile-level' ? 'Proposed profile level boundary on the 3D target surface. Not a flat pocket recipe.' : 'Ornament projection for reference. Relief shape and height are defined by the STL surface.',
      }));
      for (const contour of contours) entities.push({ type: 'poly', layer: contour.layer, closed: contour.closed, pts: contour.pointsFrontMm });
      // T77 F3 · the STL is the level's surface; the DXF and the contours
      // below stay the record's, the ones the drawings and the CNC preview draw.
      const surface = ornateFrontSurface(operationIndex === 0 ? sampled.surface : op.surface, width);
      const stlName = `${stem}-RELIEF-${operationIndex + 1}.stl`;
      const stl = ornateSurfaceStl(surface, `${decoration.style}_PROPOSED_REFERENCE`);
      files.push({ ...common, name: stlName, type: 'stl', contents: stl, bytes: byteLength(stl) });
      operations.push({
        sequence: operationIndex + 1, id: op.id, kind: op.kind, face: 'front', readiness: 'geometry',
        referenceOnly: true, productionApproved: false,
        startDepthMm: op.startDepth, finalDepthMm: op.depth, remainingThicknessMm: thickness - op.depth,
        crossSection: op.crossSection, targetSurface: op.targetSurface,
        boundaryFrontMm: op.points.map((p) => localFront(p, width)),
        contours,
        surface: { file: stlName, vertices: surface.vertices.length, triangles: surface.triangles.length,
          format: 'binary STL', units: 'mm', watertight: false, includesBackFace: false,
          meaning: 'Open machining target surface with profile walls. This is not a watertight finished part, back drilling or a toolpath.' },
        cam: 'Import the STL at millimetre scale without additional mirroring. Derive and simulate roughing and 3D finishing toolpaths in CAM; do not pocket all DXF contours.',
      });
    }
    const names = [...new Set(entities.map((entity) => entity.layer))];
    const layers = names.map((name, i) => ({ name, color: name === FRONT_REFERENCE_LAYER ? 8 : i + 1 }));
    const dxf = writeDxf(entities, layers, entitiesExtents(entities));
    files.unshift({ ...common, name: `${stem}-FRONT.dxf`, type: 'dxf', contents: dxf, bytes: byteLength(dxf) });
  }
  const spec = {
    schema: 'cabinet-core.ornate-reference', version: 1, units: 'mm',
    unitId, unitNum, panelId: panel.id, style: decoration.style,
    // T77 F6 · which ornament this relief carries: 'procedural placeholder'
    // until the owner's model is read, 'none' on the Plain variant.
    ornament: decoration.ornament ?? null,
    widthMm: width, heightMm: height, thicknessMm: thickness,
    referenceOnly: true, productionApproved: false, status: problems.length ? 'invalid-reference' : 'reference-only',
    // T77 F3 · which of the two levels this file set is, with its numbers.
    reference: { level: chosen.id, label: chosen.label, sampleMm: sampled?.sampling.sampleMm ?? null,
      chordMm: sampled?.sampling.chordMm ?? null, chordErrorMm: sampled?.sampling.chordErrorMm ?? null,
      contours: 'the canonical record\'s, as the drawings and the CNC preview draw them',
      surface: `the same surface function at ${chosen.label}; lean: samples on a flat straight side are left out, the surface is the same` },
    notice: ORNATE_REFERENCE_MESSAGE,
    proposal: 'Reconstructed from the supplied concept illustration. The physical ornament and all proposed dimensions need workshop approval.',
    // T77 F4 · the JSON prints the leaf's ACTUAL board (`thicknessMm`, the
    // assigned material's), never the board the drawing was made on: the
    // recipe's `boardMm` is left out of the parameters printed here.
    parameters: Object.fromEntries(Object.entries(decoration.parameters || {}).filter(([key]) => key !== 'boardMm')),
    designInterpretation: decoration.designInterpretation,
    datum: {
      setup: 'Front face up, local origin at bottom left of the original front surface.',
      axes: { x: 'right', y: 'up along the front', z: 'out of the original front surface' },
      zeroZ: 'Original unmachined front surface; stock occupies -thickness <= Z <= 0.',
      canonical: 'Engine uses back-view XY millimetres and positive depth into the material.',
      transform: 'frontX = width - backX; frontY = backY; frontZ = -depth. Already applied once to DXF and STL.',
      placement: 'Individual part coordinates only. No sheet rotation or translation. Re-fixture and verify the datum; do not flip a whole sheet.',
      units: 'DXF R12 and STL do not encode reliable millimetre units. Import both explicitly in mm and verify the stated width and height.',
    },
    depthMeaning: 'All start and final depths are positive mm below original front surface; they are absolute depths, not cumulative stepdowns.',
    layerMeaning: 'FRONT_REF_PROFILE_Dn names a proposed profile depth reference. FRONT_REF_ORNAMENT is a projection only. FRONT_REFERENCE_NO_CUT is the alignment outline. None is an approved cutting layer.',
    excluded: ['back drilling', 'toolpaths', 'G-code', 'feeds and speeds', 'workholding', 'machine-specific postprocessor'],
    problems, operations,
    files: files.map(({ contents, ...file }) => file),
  };
  const json = readableJson(spec);
  files.push({ ...common, name: `${stem}-operations.json`, type: 'json', contents: json, bytes: byteLength(json) });
  return files;
}

/** References remain available even when the production gate holds the part. */
export function buildOrnateReferenceFiles(entries = [], { level = 'reference', profile = getCabinetProfile() } = {}) {
  const files = [];
  let index = 0;
  for (const entry of entries) {
    const result = entry.result || {};
    const unitId = entry.unit?.id || result.unitId || null;
    const unitNum = result.unitNum || entry.unitNum || entry.unit?.params?.unit_num || '';
    for (const panel of entry.panels || result.panels || []) {
      if (!isOrnateReference(panel)) continue;
      files.push(...referencePartFiles(panel, { unitId, unitNum, index, level, profile }));
      index += 1;
    }
  }
  return files;
}
