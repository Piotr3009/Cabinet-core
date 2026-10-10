// Copyright (c) Skylon Development Ltd. All rights reserved.
// The reconstructed Ornate family is a CAD/CAM reference handoff. It never
// creates approved production machining or G-code, including Export anyway.
import { writeDxf, entitiesExtents } from './dxf.js';
import { fileSafeName } from '../naming.js';
import { frontDecorationOf, isOrnateReference, ornateReferenceContourLayer, FRONT_REFERENCE_LAYER, ORNATE_REFERENCE_MESSAGE } from './frontOperations.js';

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
const fmt = (value) => {
  const result = value.toFixed(6).replace(/\.?0+$/, '');
  return result === '-0' ? '0' : result;
};

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

/** ASCII STL has no unit field: the accompanying operation JSON specifies mm. */
export function ornateSurfaceStl(surface, name = 'ORNATE_PROPOSED_REFERENCE') {
  const lines = [`solid ${fileSafeName(name, 'ORNATE_PROPOSED_REFERENCE')}`];
  for (const triangle of surface.triangles) {
    const points = triangle.map((index) => surface.vertices[index]);
    const normal = normalOf(...points);
    if (!normal || !points.every((p) => p.every(Number.isFinite))) throw new Error('Cannot serialize invalid Ornate relief triangles.');
    lines.push(`  facet normal ${normal.map(fmt).join(' ')}`, '    outer loop');
    for (const point of points) lines.push(`      vertex ${point.map(fmt).join(' ')}`);
    lines.push('    endloop', '  endfacet');
  }
  lines.push(`endsolid ${fileSafeName(name, 'ORNATE_PROPOSED_REFERENCE')}`, '');
  return lines.join('\n');
}

function referencePartFiles(panel, { unitId, unitNum, index }) {
  const decoration = frontDecorationOf(panel);
  const { width, height, thickness } = sizeOf(panel);
  const problems = ornateReferenceProblems(panel);
  const stem = `ornate-reference/${fileSafeName(unitNum, 'unit')}-${fileSafeName(panel.id, 'part')}-${index + 1}-ORNATE-PROPOSED`;
  const common = { unitId, unitNum, panelId: panel.id, setup: 'front-reference', referenceOnly: true };
  const files = [];
  const operations = [];
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
      const surface = ornateFrontSurface(op.surface, width);
      const stlName = `${stem}-RELIEF-${operationIndex + 1}.stl`;
      files.push({ ...common, name: stlName, type: 'stl', contents: ornateSurfaceStl(surface, `${decoration.style}_PROPOSED_REFERENCE`) });
      operations.push({
        sequence: operationIndex + 1, id: op.id, kind: op.kind, face: 'front', readiness: 'geometry',
        referenceOnly: true, productionApproved: false,
        startDepthMm: op.startDepth, finalDepthMm: op.depth, remainingThicknessMm: thickness - op.depth,
        crossSection: op.crossSection, targetSurface: op.targetSurface,
        boundaryFrontMm: op.points.map((p) => localFront(p, width)),
        contours,
        surface: { file: stlName, vertices: surface.vertices.length, triangles: surface.triangles.length,
          units: 'mm', watertight: false, includesBackFace: false,
          meaning: 'Open machining target surface with profile walls. This is not a watertight finished part, back drilling or a toolpath.' },
        cam: 'Import the STL at millimetre scale without additional mirroring. Derive and simulate roughing and 3D finishing toolpaths in CAM; do not pocket all DXF contours.',
      });
    }
    const names = [...new Set(entities.map((entity) => entity.layer))];
    const layers = names.map((name, i) => ({ name, color: name === FRONT_REFERENCE_LAYER ? 8 : i + 1 }));
    files.unshift({ ...common, name: `${stem}-FRONT.dxf`, type: 'dxf', contents: writeDxf(entities, layers, entitiesExtents(entities)) });
  }
  const spec = {
    schema: 'cabinet-core.ornate-reference', version: 1, units: 'mm',
    unitId, unitNum, panelId: panel.id, style: decoration.style,
    widthMm: width, heightMm: height, thicknessMm: thickness,
    referenceOnly: true, productionApproved: false, status: problems.length ? 'invalid-reference' : 'reference-only',
    notice: ORNATE_REFERENCE_MESSAGE,
    proposal: 'Reconstructed from the supplied concept illustration. The physical ornament and all proposed dimensions need workshop approval.',
    parameters: decoration.parameters, designInterpretation: decoration.designInterpretation,
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
  files.push({ ...common, name: `${stem}-operations.json`, type: 'json', contents: JSON.stringify(spec, null, 2) });
  return files;
}

/** References remain available even when the production gate holds the part. */
export function buildOrnateReferenceFiles(entries = []) {
  const files = [];
  let index = 0;
  for (const entry of entries) {
    const result = entry.result || {};
    const unitId = entry.unit?.id || result.unitId || null;
    const unitNum = result.unitNum || entry.unitNum || entry.unit?.params?.unit_num || '';
    for (const panel of entry.panels || result.panels || []) {
      if (!isOrnateReference(panel)) continue;
      files.push(...referencePartFiles(panel, { unitId, unitNum, index }));
      index += 1;
    }
  }
  return files;
}
