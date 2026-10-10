// Copyright Skylon Development Ltd. All rights reserved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import { ORNATE_PROFILE_DEFAULTS } from '../src/engine/ornateFrontProfile.js';
import { buildOrnateFront, defaultOrnateConfig, normaliseOrnateConfig, ORNATE_STYLE_IDS } from '../src/engine/ornateFront.js';

const profile = { ...DEFAULT_CABINET_PROFILE, front: { ...DEFAULT_CABINET_PROFILE.front,
  decoration: { ...DEFAULT_CABINET_PROFILE.front.decoration, ...ORNATE_PROFILE_DEFAULTS } } };
const panel = { id: 'ornate-test', w: 600, h: 800, thickness: 18 };
const make = (style = 'ORNATE_A_1', overrides = {}, part = panel) => buildOrnateFront({ panel: part, profile, style,
  config: { ...defaultOrnateConfig(style, profile), ...overrides } });
const area = (points) => points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1];
}, 0) / 2;

test('all variants share finite bounded target geometry and four exact proposed levels', () => {
  for (const style of ORNATE_STYLE_IDS) {
    const result = make(style); assert.equal(result.status, 'ready', JSON.stringify(result.problems));
    assert.equal(result.referenceOnly, true); assert.equal(result.approval.productionApproved, false);
    assert.equal(result.operations.length, 1); assert.deepEqual(result.additions, []);
    const op = result.operations[0]; assert.equal(op.kind, 'relief'); assert.equal(op.readiness, 'geometry');
    assert.equal(op.depth, 12); assert.equal(op.startDepth, 0); assert.equal(op.surface.closedSolid, undefined);
    const { vertices, triangles } = op.surface;
    assert.ok(vertices.length < 110000 && vertices.length > 1000);
    assert.ok(vertices.every(([x, y, d]) => [x, y, d].every(Number.isFinite)
      && x >= 60 && x <= 540 && y >= 60 && y <= 740 && d >= 0 && d <= 12));
    assert.ok(triangles.every((t) => t.length === 3 && t.every((i) => Number.isInteger(i) && i >= 0 && i < vertices.length)));
    assert.ok(triangles.every((t) => area(t.map((i) => vertices[i])) > 0), 'canonical floor winding is CCW in BACK XY');
    const levels = op.contours.filter((c) => c.kind === 'profile-level');
    assert.deepEqual(levels.map((c) => c.depth), [3, 6, 9, 12]);
    assert.deepEqual(levels.map((c) => c.widthMm), [12, 8, 6, 4]);
    assert.ok(levels.every((c) => area(c.points) > 0));
    assert.ok(vertices.some(([x, y, d]) => x === 300 && y === 400 && d === 12));
  }
});

test('a canonical relief has one open perimeter and no internal holes or duplicate coplanar skin', () => {
  for (const style of ORNATE_STYLE_IDS) {
    const op = make(style).operations[0]; const counts = new Map();
    for (const t of op.surface.triangles) {
      for (let i = 0; i < 3; i += 1) {
        const a = t[i]; const b = t[(i + 1) % 3]; const k = a < b ? `${a}:${b}` : `${b}:${a}`;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    const open = [...counts].filter(([, n]) => n === 1);
    assert.equal(open.length, op.points.length, `${style} has only the sampled rectangular outer mouth edges`);
    assert.ok([...counts.values()].every((n) => n === 1 || n === 2), 'no non-manifold edges');
    for (const [edge] of open) assert.ok(edge.split(':').map(Number).every((i) => op.surface.vertices[i][2] === 0));
  }
});

test('ornaments are sculpted into the surface and variant 4 really removes them', () => {
  const ornament = make().operations[0]; const plain = make('ORNATE_A_4').operations[0];
  const depthAt = (surface, p) => {
    for (const indices of surface.triangles) {
      const [a, b, c] = indices.map((i) => surface.vertices[i]); const total = area([a, b, c]);
      const weights = [area([p, b, c]) / total, area([a, p, c]) / total, area([a, b, p]) / total];
      if (weights.every((w) => w >= -1e-7 && w <= 1 + 1e-7)) return weights[0] * a[2] + weights[1] * b[2] + weights[2] * c[2];
    }
    return null;
  };
  // Reference TOP LEFT is TOP RIGHT in the engine's BACK datum.
  for (const p of [[506, 706], [94, 94]]) {
    assert.ok(depthAt(ornament.surface, p) < depthAt(plain.surface, p) - 1, 'flower centres stand above their carved background');
  }
  assert.ok(ornament.contours.some((c) => c.kind === 'ornament-reference' && c.depth === null));
  assert.equal(plain.contours.filter((c) => c.kind === 'ornament-reference').length, 0);
});

test('mirror reflects the same surface exactly once and keeps correct winding', () => {
  const normal = make().operations[0]; const mirror = make('ORNATE_A_1', { mirror: true }).operations[0];
  assert.equal(normal.surface.vertices.length, mirror.surface.vertices.length);
  normal.surface.vertices.forEach(([x, y, d], i) => {
    const reflected = mirror.surface.vertices[i];
    assert.ok(Math.abs(reflected[0] - (600 - x)) < 1e-6); assert.equal(reflected[1], y); assert.equal(reflected[2], d);
  });
  normal.surface.triangles.forEach(([a, b, c], i) => assert.deepEqual(mirror.surface.triangles[i], [a, c, b]));
});

test('defaults and normalization never share recipe arrays or silently coerce invalid booleans', () => {
  const a = defaultOrnateConfig('ORNATE_A_1', profile); const b = defaultOrnateConfig('ORNATE_A_1', profile);
  a.stepWidthsMm[0] = 99; assert.equal(b.stepWidthsMm[0], 12); assert.equal(ORNATE_PROFILE_DEFAULTS.ORNATE_A_1.stepWidthsMm[0], 12);
  const source = { ...b, stepDepthsMm: ['3', '6', '9', '12'] };
  const out = normaliseOrnateConfig(source, 'ORNATE_A_1', profile);
  assert.deepEqual(out.stepDepthsMm, [3, 6, 9, 12]); out.stepDepthsMm[0] = 7; assert.equal(source.stepDepthsMm[0], '3');
  assert.equal(make('ORNATE_A_1', { mirror: 'false' }).status, 'blocked');
});

test('invalid production geometry is refused rather than squeezed, cropped, or thinned', () => {
  for (const [override, part] of [
    [{ stepDepthsMm: [3, 6, 9, 17] }, panel],
    [{ stepDepthsMm: [3, 6, 6, 12] }, panel],
    [{ stepWidthsMm: [12, 8, NaN, 4] }, panel],
    [{ stepWidthsMm: [12, , 6, 4] }, panel],
    [{ stepWidthsMm: new Array(4) }, panel],
    [{ stepDepthsMm: new Array(4) }, panel],
    [{ innerRadiusMm: 1000 }, panel],
    [{ ornamentScale: 4 }, panel],
    [{}, { ...panel, w: 200 }],
    [{}, { ...panel, cnc: { outline: [[0, 0], [600, 0], [600, 700], [0, 800]] } }],
    [{}, { ...panel, cnc: { outline: [[0, 0, NaN], [600, 0], [600, 800], [0, 800]] } }],
    [{}, { ...panel, cnc: { outline: [[0, 0], , [600, 800], [0, 800]] } }],
    [{ version: 2 }, panel],
  ]) {
    const result = make('ORNATE_A_1', override, part);
    assert.equal(result.status, 'blocked'); assert.ok(result.problems.length); assert.deepEqual(result.operations, []);
  }
  assert.equal(make('ORNATE_A_2', {}, { ...panel, h: 500 }).status, 'blocked');
});
