/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F11, AFTER THE REVIEW . THE BASIN IS SEEN THROUGH THE VANITY'S TOP
//
// The owner, 25.10.2026: *"dodanie 1 sink or 2 sink? dodajesz tylko do
// widoku"*. The worktop has its oval since F11 (Scene.jsx, the fit guard of
// D1), but under it the vanity's carcass TOP stood whole, so the bowl hung
// from the slab was hidden inside the carcass. B2 mirrored KIT_VANITY.lsp D18
// and D26: the TOP carries each fitted basin's oval as a record,
// `meta.vanityBasins.cutouts` [{ cx, cz, w, d, opens, x, z }] (x, z in the
// unit's frame; `opens: 'EDGE'` when the oval runs out of the TOP's back
// edge), cut on site, never on its CNC.
//
// The room draws the TOP with that oval cut through it, by the road of the
// trap's U: the RECORD gates it (`basinOvalsOf`, the record mapped into the
// board's own drawn frame by `panelPlacement`), and the board's outline is
// cut by one pure function (`cutOvals`): an oval wholly inside the board is a
// hole, an oval that crosses its edge takes the edge with it along its arc.
// Every other board is built as before, byte for byte.
//
// THE STAGE: VANITY3 on the default profile, one sink: the TOP 864 x 482 x 18
// at x 18, z 18, drawn 482 (the depth from the back) x 864 (the width from
// the BUR end); the oval 520 x 400 at (450, 200) in the unit, (182, 432) in
// the TOP's drawn frame, running 18 past its back edge.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { joineryLayers } from '../src/engine/joinery.js';
import { tabOutlines } from '../src/engine/socketFace.js';
import { basinOvalsOf, cutOvals, panelSolids } from '../src/3d/panelSolid.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const LAYERS = joineryLayers(P);
const vanity = (extra = {}, type = 'VANITY3') => computeCabinet({ ...defaultParamsFor(type, P), ...extra }, P);
const topOf = (r) => r.panels.find((p) => p.id === 'TOP' && p.part === 'TOP');

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
  }).length;
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

const area = (pts) => pts.reduce((s, [x, y], i) => {
  const [x2, y2] = pts[(i + 1) % pts.length];
  return s + x * y2 - x2 * y;
}, 0) / 2;
const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];

/** A ray straight down at the unit's own (x, z), through the TOP's solid (centred on its box). */
function solidAt(geometry, box, xMm, zMm) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld(true);
  const lx = (xMm - (box.x + box.w / 2)) / 1000;
  const lz = (zMm - (box.z + box.d / 2)) / 1000;
  return new THREE.Raycaster(new THREE.Vector3(lx, 1, lz), new THREE.Vector3(0, -1, 0)).intersectObject(mesh).length > 0;
}

// === 1 . THE RECORD, IN THE BOARD'S OWN FRAME =================================

test('T82 F11 . the TOP\'s oval is read off B2\'s record and mapped into the TOP\'s drawn frame', () => {
  const top = topOf(vanity());
  // AMENDED BY T83 F8 (25.10.2026, 22:41): *"umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie wchodzi w drugi material"*: the waste at 250 (T82: 200),
  // the oval a HOLE 32 in front of the TOP's back edge (T82: across it, EDGE).
  assert.deepEqual(top.meta.vanityBasins.cutouts.map(({ x, z, w, d, opens }) => ({ x, z, w, d, opens })),
    [{ x: 450, z: 250, w: 520, d: 400, opens: 'HOLE' }], 'the record');
  // Drawn x is the depth from the back (z less 18), drawn y the width from the
  // BUR end (882 less x); the oval's 400 runs along drawn x, its 520 along y.
  assert.deepEqual(basinOvalsOf(top), [{ cx: 232, cy: 432, rx: 200, ry: 260 }]);
  // No sink, no record, no oval; and no other board of the vanity has one.
  assert.deepEqual(basinOvalsOf(topOf(vanity({ sinks: 0 }))), []);
  for (const p of vanity().panels.filter((q) => q.id !== 'TOP')) assert.deepEqual(basinOvalsOf(p), [], p.id);
});

test('T82 F11 . no board of any other kit carries a basin oval', () => {
  for (const type of UNIT_TYPE_ORDER.filter((t) => !/^VANITY/.test(t))) {
    for (const p of computeCabinet(defaultParamsFor(type, P), P).panels) assert.deepEqual(basinOvalsOf(p), [], `${type} ${p.id}`);
  }
});

// === 2 . THE CUT, PURE =======================================================

test('T82 F11 . cutOvals: an oval inside the board is a hole; one across the edge opens it along its arc; one outside is nothing', () => {
  const board = rect(482, 864);
  const inside = cutOvals(board, [{ cx: 241, cy: 432, rx: 150, ry: 200 }]);
  assert.equal(inside.cut, 1);
  assert.deepEqual(inside.outline, board, 'the board keeps its outline');
  assert.equal(inside.holes.length, 1);
  const across = cutOvals(board, [{ cx: 182, cy: 432, rx: 200, ry: 260 }]);
  assert.equal(across.cut, 1);
  assert.equal(across.holes.length, 0, 'not a hole: the back edge is open');
  // The back edge (drawn x = 0) is open over the oval's chord there.
  const chord = 260 * Math.sqrt(1 - (182 / 200) ** 2);
  const onEdge = across.outline.filter(([x]) => Math.abs(x) < 1e-9).map(([, y]) => y);
  assert.ok(!onEdge.some((y) => y > 432 - chord + 1e-6 && y < 432 + chord - 1e-6), 'no board on the back edge inside the chord');
  assert.ok(onEdge.some((y) => Math.abs(y - (432 - chord)) < 1e-6) && onEdge.some((y) => Math.abs(y - (432 + chord)) < 1e-6),
    'the edge meets the oval at its two crossings');
  // The area taken is the oval's part inside the board, to the 48 points.
  const taken = area(board) - area(across.outline);
  const theta = Math.acos(-182 / 200);
  const exact = 200 * 260 * (theta - Math.sin(theta) * Math.cos(theta));
  assert.ok(Math.abs(taken - exact) / exact < 0.01, `the cut ${taken} mm2 against the oval's ${exact}`);
  assert.ok(area(across.outline) > 0, 'still anticlockwise');
  // Outside the board: nothing.
  const outside = cutOvals(board, [{ cx: -500, cy: 432, rx: 100, ry: 100 }]);
  assert.deepEqual(outside, { outline: board, holes: [], cut: 0 });
});

// === 3 . THE SOLID ===========================================================

test('T82 F11 . the TOP\'s solid: closed and oriented, the oval taken through its 18, a hole before the back edge', () => {
  // AMENDED BY T83 F8 (25.10.2026, 22:41): *"umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie wchodzi w drugi material"*: the waste at 250, the oval a
  // HOLE 32 in front of the TOP's back edge, its back joint whole (T82: the back edge open over the bowl, a tenon gone).
  const r = vanity();
  const top = topOf(r);
  const { solid } = panelSolids(top, LAYERS, P, []);
  assert.ok(solid);
  assert.equal(openEdges(solid), 0, 'closed and consistently oriented');
  const plain = panelSolids(topOf(vanity({ sinks: 0 })), LAYERS, P, []).solid;
  const taken = (volumeMm3(plain) - volumeMm3(solid)) / 18;
  const exact = Math.PI * 200 * 260;
  const tabArea = (t) => Math.abs(area(t));
  const tenon = tabOutlines(topOf(vanity({ sinks: 0 }))).reduce((s, t) => s + tabArea(t), 0)
    - tabOutlines(top).reduce((s, t) => s + tabArea(t), 0);
  assert.equal(Math.round(tenon), 0, 'no tenon of the back edge goes');
  assert.ok(Math.abs(taken - exact) / exact < 0.01, `taken ${taken} mm2: the oval ${exact}`);
  // Air at the bowl; board at the back edge before it, beside it and in front.
  assert.equal(solidAt(solid, top.box, 450, 250), false, 'air at the basin\'s centre');
  assert.equal(solidAt(solid, top.box, 450, 18 + 3), true, 'board at the back edge: the oval stands 32 in front of it');
  assert.equal(solidAt(solid, top.box, 100, 18 + 3), true, 'board at the back edge clear of the oval');
  assert.equal(solidAt(solid, top.box, 450, 18 + 470), true, 'board at the front');
  // No remaining tab stands in the oval (B2 dropped the one it met).
  for (const t of tabOutlines(top)) {
    assert.ok(!t.some(([x, y]) => ((x - 182) / 200) ** 2 + ((y - 432) / 260) ** 2 < 1 - 1e-9), 'a tab in the oval');
  }
});

test('T82 F11 . no basin, the old board: a sinks 0 TOP takes no oval, and its cache entry is not a basin TOP\'s', () => {
  const plain = topOf(vanity({ sinks: 0 }));
  assert.equal(plain.meta?.vanityBasins, undefined);
  const a = panelSolids(plain, LAYERS, P, []).solid;
  const b = panelSolids(topOf(vanity()), LAYERS, P, []).solid;
  assert.notEqual(a, b);
  assert.equal(openEdges(a), 0);
});

// === 4 . THE ROOM'S ROAD (source) ============================================

test('T82 F11 . the road: the record gates it, the cut takes the board\'s outline, the key names it, the pinned lines kept', () => {
  const src = uncomment(read('src/3d/panelSolid.js'));
  assert.match(src, /const basins = basinOvalsOf\(panel\);/);
  assert.match(src, /if \(!notch && !bite && !basins\.length\) return NOTHING;/);
  assert.match(src, /basins\.length \? `basin:\$\{basins\.map/, 'the cache key names the ovals');
  assert.match(src, /const basined = cutOvals\(bitten, basins\);/);
  // The lines T46, T75, T76 and T79 pin, to the character.
  assert.match(src, /const outline = trimOutlineOnSlope\(notchedOutline\(\{/);
  assert.match(src, /const shaped = notch \? cutNotchCorner\(outline, w, h, notch\) : outline;/);
  assert.match(src, /if \(!notches\.length && !tabs\.length && !recesses\.length && !slopeCut/);
});
