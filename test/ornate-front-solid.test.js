import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { frontDecorationGeometry } from '../src/3d/frontDecorationSolid.js';
import { buildFrontDecoration, defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import {
  frontDecorationElevation, frontDecorationMachinings, frontDecorationDetailNote,
} from '../src/engine/drawings/frontDecorationDrawing.js';

const STYLES = ['ORNATE_A_1', 'ORNATE_A_2', 'ORNATE_A_3', 'ORNATE_A_4'];
const rectangle = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const panelFor = (style) => {
  const panel = {
    id: 'ORNATE-TEST', part: 'FRONT', role: 'front',
    w: 600, h: 800, thickness: 18, cnc: {},
    box: { x: 11, y: 23, z: 0, w: 600, h: 800, d: 18 }, meta: {},
  };
  panel.meta.frontDecoration = buildFrontDecoration({ panel, config: defaultFrontDecoration(style), style });
  return panel;
};

function hitAt(geometry, x, y, fromBack = false) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.updateMatrixWorld(true);
  return new THREE.Raycaster(
    new THREE.Vector3((300 - x) / 1000, (y - 400) / 1000, fromBack ? -1 : 1),
    new THREE.Vector3(0, 0, fromBack ? 1 : -1),
  ).intersectObject(mesh)[0]?.point;
}

function openEdges(geometry) {
  const positions = geometry.attributes.position;
  const key = (index) => [positions.getX(index), positions.getY(index), positions.getZ(index)]
    .map((value) => value.toFixed(7)).join(',');
  const edges = new Map();
  for (let index = 0; index < positions.count; index += 3) {
    for (const [from, to] of [[0, 1], [1, 2], [2, 0]]) {
      const edge = `${key(index + from)}>${key(index + to)}`;
      edges.set(edge, (edges.get(edge) || 0) + 1);
    }
  }
  return [...edges].filter(([edge, count]) => {
    const [from, to] = edge.split('>');
    return edges.get(`${to}>${from}`) !== count;
  });
}

function volumeMm3(geometry) {
  const positions = geometry.attributes.position;
  let volume = 0;
  for (let index = 0; index < positions.count; index += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, index);
    const b = new THREE.Vector3().fromBufferAttribute(positions, index + 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, index + 2);
    volume += a.dot(b.cross(c)) / 6;
  }
  return volume * 1e9;
}

const near = (actual, expected, tolerance = 1e-6) => assert.ok(
  Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`,
);

test('four ornate variants are closed carved slabs with real thickness, finite normals and no added material', () => {
  for (const style of STYLES) {
    const panel = panelFor(style);
    const record = panel.meta.frontDecoration;
    assert.equal(record?.status, 'ready', `${style}: ${JSON.stringify(record?.problems)}`);
    const geometry = frontDecorationGeometry(panel);
    assert.ok(geometry, `${style} builds`);
    assert.equal(openEdges(geometry).length, 0, `${style} has no unpaired surface edges`);
    near(geometry.boundingBox.min.x, -0.3);
    near(geometry.boundingBox.max.x, 0.3);
    near(geometry.boundingBox.min.y, -0.4);
    near(geometry.boundingBox.max.y, 0.4);
    near(geometry.boundingBox.min.z, -0.009);
    near(geometry.boundingBox.max.z, 0.009);
    for (const attribute of ['position', 'normal', 'uv']) {
      assert.ok([...geometry.attributes[attribute].array].every(Number.isFinite), `${style} finite ${attribute}`);
    }
    const normals = geometry.attributes.normal;
    for (let index = 0; index < normals.count; index += 3) {
      near(Math.hypot(normals.getX(index), normals.getY(index), normals.getZ(index)), 1);
    }
    const volume = volumeMm3(geometry);
    assert.ok(volume > 600 * 800 * 6 && volume < 600 * 800 * 18,
      `${style} leaves a continuous skin and removes material: ${volume}`);
    near(hitAt(geometry, 30, 400).z, 0.009);
    near(hitAt(geometry, 300, 400).z, -0.003);
    near(hitAt(geometry, 300, 400, true).z, -0.009);
  }
});

test('ornate back hinge cups remain in the frame and a through bore opens the exact relief surface', () => {
  const panel = panelFor('ORNATE_A_1');
  const plain = frontDecorationGeometry(panel);
  const drilled = frontDecorationGeometry(panel, [
    { kind: 'round', x: 21.5, y: 150, r: 17.5, depth: 11 },
    { kind: 'round', x: 300, y: 400, r: 2.5, through: true },
  ]);
  near(hitAt(drilled, 21.5, 150, true).z, 0.002);
  near(hitAt(drilled, 21.5, 150).z, 0.009);
  assert.equal(hitAt(drilled, 300, 400), undefined);
  assert.equal(hitAt(drilled, 300, 400, true), undefined);
  const polygonArea = (radius) => 32 / 2 * radius ** 2 * Math.sin(2 * Math.PI / 32);
  near(volumeMm3(plain) - volumeMm3(drilled), polygonArea(17.5) * 11 + polygonArea(2.5) * 6, 3);
});

test('blind bores beneath a variable relief use its local height, not the deepest cut elsewhere', () => {
  const panel = panelFor('ORNATE_A_4');
  const points = rectangle(60, 60, 480, 680);
  const vertices = [
    ...points.map(([x, y]) => [x, y, 0]),
    ...points.map(([x, y]) => [x, y, x === 60 ? 3 : 12]),
  ];
  // Canonical surface includes all walls and the sloping floor, with CCW
  // floor triangles in CNC XY. No loose decorative mesh sits on the board.
  const triangles = [[4, 5, 6], [4, 6, 7]];
  for (let index = 0; index < 4; index += 1) {
    const next = (index + 1) % 4;
    triangles.push([index, next + 4, index + 4], [index, next, next + 4]);
  }
  panel.meta.frontDecoration = {
    style: 'ORNATE_A_4', status: 'ready', outline: rectangle(0, 0, 600, 800),
    operations: [{ id: 'variable-relief', kind: 'relief', face: 'front', points,
      startDepth: 0, depth: 12, surface: { vertices, triangles } }], additions: [],
  };
  const geometry = frontDecorationGeometry(panel, [
    { kind: 'round', x: 100, y: 400, r: 2, depth: 11 },
  ]);
  near(hitAt(geometry, 100, 400, true).z, 0.002);
  near(hitAt(geometry, 100, 400).z, 0.00525);
  assert.equal(openEdges(geometry).length, 0);
});

test('ornate drawing contours keep one datum reflection and identify relief references explicitly', () => {
  const panel = panelFor('ORNATE_A_1');
  const record = panel.meta.frontDecoration;
  const original = structuredClone(record);
  const operation = record.operations[0];
  assert.ok(operation.contours.length > 4, 'profile and floral detail contours exist');
  const elevation = frontDecorationElevation(panel);
  const details = frontDecorationMachinings(panel);
  assert.equal(elevation.length, 1 + operation.contours.length);
  assert.equal(details.length, elevation.length);
  for (const contour of operation.contours) {
    const drawn = elevation.find((item) => item.contourId === contour.id);
    assert.deepEqual(drawn.pts, contour.points.map(([x, y]) => [panel.box.x + 600 - x, panel.box.y + y]));
    const detail = details.find((item) => item.id === `decoration-${operation.id}-${contour.id}`);
    assert.deepEqual(detail.pts, contour.points);
    assert.equal(detail.machiningKind, 'relief-reference');
    assert.match(detail.note, /not a pocket toolpath/);
    assert.match(detail.layer, /^FRONT_REF_/);
  }
  assert.match(frontDecorationDetailNote(panel), /physical sample/);
  assert.deepEqual(record, original, 'drawing never modifies canonical CNC coordinates');
});

test('smooth relief normals leave canonical triangles and bore cuts unchanged, with hard slab and bore walls', () => {
  const panel = panelFor('ORNATE_A_1');
  const flatPanel = structuredClone(panel);
  // Other canonical surfaces keep their established face-normal renderer.
  flatPanel.meta.frontDecoration.operations[0].kind = 'pocket';
  const bores = [{ kind: 'round', x: 160, y: 710, r: 3, through: true }];
  for (const holes of [[], bores]) {
    const smooth = frontDecorationGeometry(panel, holes);
    const flat = frontDecorationGeometry(flatPanel, holes);
    assert.deepEqual(smooth.attributes.position.array, flat.attributes.position.array,
      'lighting cannot move a CNC vertex, remove a triangle or change a clipped bore');
    assert.deepEqual(smooth.attributes.uv.array, flat.attributes.uv.array);
    let changed = 0; let hardBoreVertices = 0;
    const positions = smooth.attributes.position;
    const normals = smooth.attributes.normal;
    for (let index = 0; index < positions.count; index += 1) {
      const nx = normals.getX(index); const ny = normals.getY(index); const nz = normals.getZ(index);
      near(Math.hypot(nx, ny, nz), 1);
      if (Math.abs(nx - flat.attributes.normal.getX(index)) > 1e-5
        || Math.abs(ny - flat.attributes.normal.getY(index)) > 1e-5
        || Math.abs(nz - flat.attributes.normal.getZ(index)) > 1e-5) changed += 1;
      const outerWall = Math.abs(Math.abs(positions.getX(index)) - 0.3) < 1e-7
        || Math.abs(Math.abs(positions.getY(index)) - 0.4) < 1e-7;
      if (outerWall || positions.getZ(index) < -0.008999) {
        near(nx, flat.attributes.normal.getX(index));
        near(ny, flat.attributes.normal.getY(index));
        near(nz, flat.attributes.normal.getZ(index));
      }
      const boreRadius = Math.hypot(positions.getX(index) - 0.14, positions.getY(index) - 0.31);
      if (holes.length && Math.abs(boreRadius - 0.003) < 0.00002
        && Math.abs(flat.attributes.normal.getZ(index)) < 1e-6) {
        near(nx, flat.attributes.normal.getX(index));
        near(ny, flat.attributes.normal.getY(index));
        near(nz, flat.attributes.normal.getZ(index));
        hardBoreVertices += 1;
      }
    }
    assert.ok(changed > 100, 'the relief receives shared smooth normals');
    if (holes.length) assert.equal(hitAt(smooth, 160, 710), undefined);
    else assert.ok(hitAt(smooth, 160, 710));
    if (holes.length) assert.ok(hardBoreVertices > 32, 'new bore wall facets keep their geometric normals');
  }
});
