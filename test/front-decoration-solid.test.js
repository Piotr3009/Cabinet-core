import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { frontDecorationGeometry, clearFrontDecorationCache } from '../src/3d/frontDecorationSolid.js';
import { buildFrontDecoration, defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as PROFILE } from '../src/engine/profile.js';
import { panelRecesses } from '../src/engine/recesses.js';

const rectangle = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const front = (operations = [], extra = {}) => ({
  id: 'FRONT-1', part: 'FRONT', role: 'front',
  box: { x: 0, y: 0, z: 0, w: 500, h: 700, d: 25 },
  cnc: {},
  meta: {
    frontDecoration: {
      version: 1, style: 'GF', face: 'front', status: 'ready',
      outline: rectangle(0, 0, 500, 700), thickness: 25,
      operations, additions: [], ...extra,
    },
  },
});
const pocket = (id, points, depth, startDepth = 0) => ({
  id, kind: 'pocket', face: 'front', points, depth, startDepth,
});
const near = (actual, expected, message = '') => assert.ok(Math.abs(actual - expected) < 0.00001,
  `${message}: ${actual} vs ${expected}`);

function hit(geometry, origin, direction) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.updateMatrixWorld(true);
  return new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction))
    .intersectObject(mesh)[0]?.point;
}

function openEdges(geometry) {
  const p = geometry.attributes.position;
  const key = (i) => [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(7)).join(',');
  const edges = new Map();
  for (let i = 0; i < p.count; i += 3) {
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const edge = `${key(i + a)}>${key(i + b)}`;
      edges.set(edge, (edges.get(edge) || 0) + 1);
    }
  }
  return [...edges].filter(([edge, count]) => {
    const [a, b] = edge.split('>');
    return edges.get(`${b}>${a}`) !== count;
  });
}

function volumeMm3(geometry) {
  const p = geometry.attributes.position;
  let volume = 0;
  for (let i = 0; i < p.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, i);
    const b = new THREE.Vector3().fromBufferAttribute(p, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
    volume += a.dot(b.cross(c)) / 6;
  }
  return volume * 1e9;
}

test('decorative solid leaves legacy and blocked fronts on their existing path', () => {
  assert.equal(frontDecorationGeometry({ box: { w: 500, h: 700, d: 25 } }), null);
  assert.equal(frontDecorationGeometry(front([], { status: 'blocked' })), null);
});

test('nested front pockets are closed and remove their absolute machining depths once', () => {
  const panel = front([
    pocket('field', rectangle(60, 60, 380, 580), 6),
    pocket('groove', rectangle(100, 90, 4, 520), 8, 6),
  ]);
  const geometry = frontDecorationGeometry(panel);
  assert.equal(openEdges(geometry).length, 0);
  const expected = 500 * 700 * 25 - 380 * 580 * 6 - 4 * 520 * 2;
  assert.ok(Math.abs(volumeMm3(geometry) - expected) < 3);
  near(hit(geometry, [0, 0, 1], [0, 0, -1]).z, 0.0065, 'field floor');
  near(hit(geometry, [0.148, 0, 1], [0, 0, -1]).z, 0.0045, 'groove floor');
  near(hit(geometry, [0, 0, -1], [0, 0, 1]).z, -0.0125, 'uncut back');
});

test('both hinge hands keep cups on the back and use separate cached geometry', () => {
  const panel = front([pocket('field', rectangle(60, 60, 380, 580), 6)]);
  let previous;
  for (const x of [21.5, 478.5]) {
    const geometry = frontDecorationGeometry(panel, [{ kind: 'round', x, y: 150, r: 17.5, depth: 11 }]);
    assert.equal(openEdges(geometry).length, 0);
    near(hit(geometry, [(250 - x) / 1000, -0.2, -1], [0, 0, 1]).z, -0.0015, 'cup floor');
    near(hit(geometry, [(250 - x) / 1000, -0.2, 1], [0, 0, -1]).z, 0.0125, 'front above cup');
    if (previous) assert.notEqual(previous, geometry);
    previous = geometry;
  }
});

test('a through handle bore opens on the actual recessed floor', () => {
  const panel = front([pocket('field', rectangle(60, 60, 380, 580), 6)]);
  const geometry = frontDecorationGeometry(panel, [{ kind: 'round', x: 250, y: 350, r: 2.5, through: true }]);
  assert.equal(openEdges(geometry).length, 0);
  assert.equal(hit(geometry, [0, 0, 1], [0, 0, -1]), undefined);
});

test('the engine polygon supplies both the slope and the arched pocket', () => {
  const outline = [[0, 0], [500, 0], [500, 700], [150, 700], [0, 550]];
  const arch = [[80, 60], [420, 60], [420, 490], [390, 565], [330, 610], [250, 630], [170, 610], [110, 565], [80, 490]];
  const geometry = frontDecorationGeometry(front([pocket('arch', arch, 6)], { outline }));
  assert.equal(openEdges(geometry).length, 0);
  assert.equal(hit(geometry, [0.24, 0.34, 1], [0, 0, -1]), undefined, 'sloped waste has no solid');
  near(hit(geometry, [0, 0, 1], [0, 0, -1]).z, 0.0065);
});

test('left, right and top J-pulls remain carved with decorative pockets', () => {
  for (const edge of ['L', 'R', 'TOP']) {
    const panel = front([pocket('field', rectangle(60, 60, 380, 580), 6)]);
    panel.cnc.jpull = {
      edge, from: 100, to: 600,
      profile: { lipT: 4.212, slotW: 10, rearLeg: 3.788, slotDepth: 40, reliefMm: 30, rampR: 25 },
    };
    const geometry = frontDecorationGeometry(panel);
    const z = (-12.5 + 4.212 + 5) / 1000;
    if (edge === 'TOP') near(hit(geometry, [0, 1, z], [0, -1, 0]).y, 0.31, 'top slot');
    else {
      const side = edge === 'L' ? 1 : -1;
      near(hit(geometry, [side, 0, z], [-side, 0, 0]).x, side * 0.21, `${edge} slot`);
    }
    near(hit(geometry, [0, 0, 1], [0, 0, -1]).z, 0.0065, 'decoration survives J');
    assert.equal(geometry.userData.frontDecoration.jpull, true);
  }
});

test('applied mouldings rise from the host and retain their actual mitred volume', () => {
  const points = [[40, 40], [460, 40], [440, 60], [60, 60]];
  const geometry = frontDecorationGeometry(front([], {
    style: 'AM', additions: [{ id: 'bottom', points, projection: 8 }],
  }));
  near(geometry.boundingBox.max.z, 0.0205);
  near(hit(geometry, [0, -0.3, 1], [0, 0, -1]).z, 0.0205);
  const area = ((420 + 380) / 2) * 20;
  assert.ok(Math.abs(volumeMm3(geometry) - (500 * 700 * 25 + area * 8)) < 3);
});

test('cache includes machining changes and supplies continuous whole-front UVs', () => {
  clearFrontDecorationCache();
  const panel = front([pocket('field', rectangle(60, 60, 380, 580), 6)]);
  const geometry = frontDecorationGeometry(panel);
  assert.equal(geometry, frontDecorationGeometry(structuredClone(panel)));
  panel.meta.frontDecoration.operations[0].depth = 7;
  assert.notEqual(geometry, frontDecorationGeometry(panel));
  const pos = geometry.attributes.position; const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) {
    near(uv.getX(i), pos.getX(i) / 0.5 + 0.5);
    near(uv.getY(i), pos.getY(i) / 0.7 + 0.5);
  }
});

test('canonical ballnose flutes have closed spherical stopped ends and a round floor in both directions', () => {
  for (const grooveDirection of ['vertical', 'horizontal']) {
    const panel = front();
    Object.assign(panel, { w: 500, h: 700, thickness: 25 });
    panel.meta.frontDecoration = buildFrontDecoration({
      panel, style: 'FL', config: { ...defaultFrontDecoration('FL'), grooveDirection },
    });
    assert.equal(panel.meta.frontDecoration.status, 'ready');
    const op = panel.meta.frontDecoration.operations[0];
    const geometry = frontDecorationGeometry(panel);
    assert.equal(openEdges(geometry).length, 0, `${grooveDirection} flute closes all surface seams`);
    const [start, end] = op.centreline;
    const centre = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const hitAt = ([x, y]) => hit(geometry, [(250 - x) / 1000, (y - 350) / 1000, 1], [0, 0, -1]);
    near(hitAt(centre).z, 0.0095, 'full depth at flute centre');
    const sidePoint = grooveDirection === 'vertical'
      ? [centre[0] + 3, centre[1]] : [centre[0], centre[1] + 3];
    const sideDepth = 0.0125 - (Math.sqrt(36 - 9) - 3) / 1000;
    assert.ok(Math.abs(hitAt(sidePoint).z - sideDepth) < 0.00002, 'ballnose section is curved');
    const spherePoint = grooveDirection === 'vertical'
      ? [start[0], start[1] - 3] : [start[0] - 3, start[1]];
    assert.ok(Math.abs(hitAt(spherePoint).z - sideDepth) < 0.00002, 'stopped end is spherical');
  }
});

test('all shipped recipes render the actual cabinet engine drilling on both hinge hands', () => {
  for (const style of ['G', 'GF', 'A', 'AH', 'FL', 'AM']) {
    for (const hinge of ['L', 'R']) {
      const result = computeCabinet({
        ...defaultParamsFor('BUD', PROFILE), hinge, front_type: style,
        front_decoration: defaultFrontDecoration(style),
      }, PROFILE);
      const panel = result.panels.find((p) => p.part === 'FRONT');
      assert.equal(panel.meta.frontDecoration.status, 'ready', `${style} ${hinge}`);
      const bores = panelRecesses(panel, result.drills, { thickness: panel.box.d, profile: PROFILE });
      const geometry = frontDecorationGeometry(panel, bores);
      assert.ok(geometry, `${style} ${hinge} builds the engine front`);
      assert.equal(openEdges(geometry).length, 0, `${style} ${hinge} drilling leaves a closed solid`);
      for (const cup of result.drills.filter((d) => d.panel === panel.id && d.kind === 'cup')) {
        const x = (panel.box.w / 2 - cup.x) / 1000;
        const y = (cup.y - panel.box.h / 2) / 1000;
        near(hit(geometry, [x, y, -1], [0, 0, 1]).z,
          (-panel.box.d / 2 + cup.depth) / 1000, `${style} ${hinge} actual cup depth`);
      }
      if (style === 'AM') {
        const strips = result.panels.filter((p) => p.meta?.frontDecorationParent === panel.id);
        assert.equal(strips.length, 4);
        assert.ok(strips.every((p) => !p.box), 'manufacturing strips are excluded by the cabinet editor box filter');
      }
    }
  }
});

test('a contained through handle bore cuts the curved flute surface and its wall follows the actual rim', () => {
  for (const grooveDirection of ['vertical', 'horizontal']) {
    for (const stoppedEnd of [false, true]) {
      const panel = front();
      Object.assign(panel, { w: 500, h: 700, thickness: 25 });
      panel.meta.frontDecoration = buildFrontDecoration({
        panel, style: 'FL', config: { ...defaultFrontDecoration('FL'), grooveDirection },
      });
      const op = panel.meta.frontDecoration.operations[0];
      // One canonical groove is enough to inspect this intersection exactly.
      panel.meta.frontDecoration.operations = [op];
      const [start, end] = op.centreline;
      const centre = stoppedEnd ? start : [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
      const [cx, cy] = [(250 - centre[0]) / 1000, (centre[1] - 350) / 1000];
      const plain = frontDecorationGeometry(panel);
      const drilled = frontDecorationGeometry(panel, [{
        kind: 'round', x: centre[0], y: centre[1], r: 2, through: true,
      }]);
      assert.equal(hit(drilled, [cx, cy, 1], [0, 0, -1]), undefined, 'the surface has no cap over the bore');
      assert.equal(hit(drilled, [cx, cy, -1], [0, 0, 1]), undefined, 'the bore opens through the back');
      // A crosswise rim is higher than the centre of the flute. Every wall
      // vertex must stop on that actual curved surface, not on a flat floor.
      const positions = drilled.attributes.position;
      const normals = drilled.attributes.normal;
      const rimZ = [];
      for (let i = 0; i < positions.count; i += 1) {
        const r = Math.hypot(positions.getX(i) - cx, positions.getY(i) - cy);
        if (r > 0.00198 && r < 0.00201 && Math.abs(normals.getZ(i)) < 1e-5
          && positions.getZ(i) > 0) rimZ.push(positions.getZ(i));
      }
      assert.ok(rimZ.length > 20);
      assert.ok(Math.max(...rimZ) - Math.min(...rimZ) > 0.00025, 'bore wall follows the changing surface height');
      const maximum = 0.0125 - (Math.sqrt(36 - 4) - 3) / 1000;
      assert.ok(Math.abs(Math.max(...rimZ) - maximum) < 0.00002, 'rim uses the canonical ballnose surface');
      const removed = volumeMm3(plain) - volumeMm3(drilled);
      const area = 32 / 2 * 4 * Math.sin(2 * Math.PI / 32);
      assert.ok(removed > area * 22 - 0.1 && removed < area * 22.5 + 0.1,
        `removed ${removed} mm3 is the curved cylinder, rather than a capped hole`);
    }
  }
});

test('through bores crossing a recess wall remove both surface levels and the vertical step', () => {
  for (const nested of [false, true]) {
    const ops = [pocket('field', rectangle(60, 60, 380, 580), 6)];
    if (nested) ops.push(pocket('groove', rectangle(100, 90, 6, 520), 9, 6));
    const panel = front(ops);
    const x = nested ? 100 : 60; const y = 300; const radius = 2;
    const plain = frontDecorationGeometry(panel);
    const drilled = frontDecorationGeometry(panel, [{ kind: 'round', x, y, r: radius, through: true }]);
    const cx = (250 - x) / 1000; const cy = (y - 350) / 1000;
    for (const dx of [-0.001, 0, 0.001]) {
      assert.equal(hit(drilled, [cx + dx, cy, 1], [0, 0, -1]), undefined, 'both levels open through');
      assert.equal(hit(drilled, [cx + dx, cy, -1], [0, 0, 1]), undefined, 'back opens through');
    }
    // Mid-step a horizontal ray starts in the removed half of the pocket.
    // It must reach the cylinder wall on the higher side, not a leftover
    // vertical pocket wall across the middle of the bore.
    const z = nested ? 0.005 : 0.01;
    near(hit(drilled, [cx - 0.001, cy, z], [1, 0, 0]).x, cx + 0.002, 'pocket step is cut away inside bore');
    const polygonArea = 32 / 2 * radius ** 2 * Math.sin(2 * Math.PI / 32);
    const expected = polygonArea * (nested ? 17.5 : 22);
    assert.ok(Math.abs(volumeMm3(plain) - volumeMm3(drilled) - expected) < 0.5,
      'removed volume includes the appropriate half of each depth');
  }
});

test('actual BUDR and BUDR4 front fixings retain profile depth and support a through variant across grooves', () => {
  for (const type of ['BUDR', 'BUDR4']) {
    const config = defaultFrontDecoration('G');
    const result = computeCabinet({ ...defaultParamsFor(type, PROFILE), front_type: 'G', front_decoration: config }, PROFILE);
    for (const panel of result.panels.filter((p) => p.part === 'DRAWER-FRONT')) {
      assert.equal(panel.meta.frontDecoration.status, 'ready', `${type} actual default is production-ready`);
      const bores = panelRecesses(panel, result.drills, { thickness: panel.box.d, profile: PROFILE });
      const geometry = frontDecorationGeometry(panel, bores);
      assert.ok(geometry);
      const fixes = result.drills.filter((d) => d.panel === panel.id && d.kind === 'front_screw');
      assert.ok(fixes.length > 0, `${type} has real drawer front fixings`);
      for (const fix of fixes) {
        const x = (panel.box.w / 2 - fix.x) / 1000;
        const y = (fix.y - panel.box.h / 2) / 1000;
        const bore = bores.find((item) => item.x === fix.x && item.y === fix.y);
        assert.equal(bore.depth, 11, 'the actual workshop profile makes the factory pilot blind');
        assert.equal(bore.through, false);
        assert.ok(hit(geometry, [x, y, 1], [0, 0, -1]), `${type} ${panel.id} front skin remains`);
        near(hit(geometry, [x, y, -1], [0, 0, 1]).z, (-panel.box.d / 2 + 11) / 1000);
        const through = frontDecorationGeometry(panel, [{ ...bore, through: true }]);
        assert.equal(hit(through, [x, y, 1], [0, 0, -1]), undefined, `${type} ${panel.id} through variant front`);
        assert.equal(hit(through, [x, y, -1], [0, 0, 1]), undefined, `${type} ${panel.id} through variant back`);
      }
    }
  }
});
