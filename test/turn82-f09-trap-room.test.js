/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F9 . THE TRAP'S U IN THE ROOM
//
// The owner, 25.10.2026, 13:03 over the mockup: *"2 wyciecie u dookola zeby
// sie szuflada otwierala"*, and 13:46: *"6 - tak"* (R 20). KIT_VANITY.lsp D13
// and D14 cut the bottom of the top drawer's box round the trap, from its
// back edge: 160 wide, 120 deep, R 20 (`engine/vanity.js applyVanityTrap`, the
// outline made by `socketFace.js notchedOutline`). B2 cut it on the CNC, the
// cut list and the boards' records and left the room's station to the writer
// of `src/3d` (B2.md, SKIPPED): `3d/panelSolid.js` extruded a rectangle and its
// socket notches, never an outline it was handed.
//
// The room now hands the engine's own U (`meta.vanityTrap.notches`, the record
// that gates it, as the side's wedge is gated on its record) to the function
// that cut it (`socketFace.js notchedOutline`, the socket notch's road, at the
// trap's R): `trapCutNotches`. One law with the cut, nothing re-derived; every
// other board is built as before, byte for byte.
//
// THE STAGE: VANITY3 on the default profile, one sink (the default), its top
// box's bottom D3-DNO 831 x 440 x 18, the U at 335.5 to 495.5 of its width.
// AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
// the box is shortened by the void inside (KIT_VANITY.lsp D9, D27): D3-DNO is 831 x 390 x 18 now.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { joineryLayers } from '../src/engine/joinery.js';
import { cncRect, notchedOutline } from '../src/engine/socketFace.js';
import { panelSolids, trapCutNotches } from '../src/3d/panelSolid.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const LAYERS = joineryLayers(P);
const vanity = (type = 'VANITY3', extra = {}) => computeCabinet({ ...defaultParamsFor(type, P), ...extra }, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);

/** Directed edges without their reverse: 0 is a closed, consistently oriented solid. */
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

const shoelace = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
  const [x2, y2] = pts[(i + 1) % pts.length];
  return s + x * y2 - x2 * y;
}, 0)) / 2;

/** A ray straight down through the board's local (x, z), in mm about its centre: does it meet the board? */
function solidAt(geometry, xMm, zMm) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(xMm / 1000, 1, zMm / 1000), new THREE.Vector3(0, -1, 0));
  return ray.intersectObject(mesh).length > 0;
}

// === 1 . THE GATE IS THE RECORD ==============================================

test('T82 F9 . the room reads the U off the engine\'s record, and the same function on the same numbers gives the CNC\'s own outline', () => {
  const r = vanity();
  const dno = panelOf(r, 'D3-DNO');
  assert.ok(dno, 'the top box\'s bottom');
  assert.deepEqual(dno.meta.vanityTrap.notches, [[335.5, 495.5, 120, 20]], 'B2\'s U in the bottom\'s own frame');
  const trap = trapCutNotches(dno);
  assert.deepEqual(trap, { notches: [{ edge: 'bottom', from: 335.5, to: 495.5, depth: 120 }], radius: 20 });
  // The room's outline is the polygon the CNC sheet and the DXF cut, point for point.
  const room = notchedOutline({ ...cncRect(dno), ...trap });
  assert.equal(room.length, dno.cnc.outline.length);
  room.forEach(([x, y], i) => {
    const [cx, cy] = dno.cnc.outline[i];
    assert.ok(Math.abs(x - cx) < 1e-3 && Math.abs(y - cy) < 1e-3, `point ${i}: ${x},${y} vs ${cx},${cy}`);
  });
  for (const id of ['D1-DNO', 'D2-DNO', 'D3-BB-1', 'D3-BB-2']) {
    assert.ok(panelOf(r, id), id);
    assert.equal(trapCutNotches(panelOf(r, id)), null, `${id} is not cut round the trap`);
  }
  // No sink, no trap, no U.
  for (const p of vanity('VANITY3', { sinks: 0 }).panels) assert.equal(trapCutNotches(p), null, p.id);
});

test('T82 F9 . no board of any other kit is read as cut round a trap', () => {
  for (const type of UNIT_TYPE_ORDER.filter((t) => !/^VANITY/.test(t))) {
    const r = computeCabinet(defaultParamsFor(type, P), P);
    for (const p of r.panels) assert.equal(trapCutNotches(p), null, `${type} ${p.id}`);
  }
});

// === 2 . THE SOLID ===========================================================

test('T82 F9 . the notched bottom is a closed solid: its volume is the cut outline through 18, the U less its two R 20 fillets', () => {
  const dno = panelOf(vanity(), 'D3-DNO');
  const { solid } = panelSolids(dno, LAYERS, P, []);
  assert.ok(solid, 'a solid, not a box');
  assert.equal(openEdges(solid), 0, 'closed and consistently oriented');
  const volume = volumeMm3(solid);
  const outlineVolume = shoelace(dno.cnc.outline) * 18;
  assert.ok(Math.abs(volume - outlineVolume) < 2, `the outline extruded: ${volume} vs ${outlineVolume}`);
  // Against the U as drawn: 160 x 120 less two corners of (1 - pi / 4) R^2.
  // T83 F6: the bottom is 390 deep (T82: 440), the void kept behind the box.
  const removed = (831 * 390 * 18 - volume) / 18;
  const trueU = 160 * 120 - 2 * (1 - Math.PI / 4) * 20 * 20;
  assert.ok(Math.abs(removed - trueU) / trueU < 0.002, `the U removed ${removed} mm2, drawn ${trueU}`);
  // The board still fills its box: the U is inside it.
  solid.computeBoundingBox();
  const size = solid.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(1000);
  assert.deepEqual([size.x, size.y, size.z].map((v) => Math.round(v * 100) / 100), [831, 18, 390]);
});

test('T82 F9 . the U opens at the BACK of the box (the wall side), round the waste, with or without the joint layers', () => {
  const dno = panelOf(vanity(), 'D3-DNO');
  const { solid } = panelSolids(dno, LAYERS, P, []);
  // The board's local frame: x about its centre (CNC x less 415.5), z about
  // its centre with the back at -195 (CNC y less 195, DRAWER-BOTTOM's frame).
  // T83 F6: the bottom 390 deep (T82: 440, the back at -220).
  const x = (335.5 + 495.5) / 2 - 831 / 2;
  assert.equal(solidAt(solid, x, -195 + 60), false, 'air in the U, 60 off the back');
  assert.equal(solidAt(solid, x, -195 + 130), true, 'board beyond the U\'s 120');
  assert.equal(solidAt(solid, x + 90, -195 + 60), true, 'board beside the U');
  assert.equal(solidAt(solid, x, 195 - 10), true, 'board at the front');
  // Asked without the joint layers it is the same board (one cached solid).
  assert.equal(panelSolids(dno, null, P, []).solid, solid);
});

test('T82 F9 . two columns, two sinks: each column\'s top bottom carries its own U; a bottom with none stays the board it was', () => {
  const r = vanity('VANITY3', { columns: 2, sinks: 2 });
  for (const id of ['Z1D3-DNO', 'Z2D3-DNO']) {
    const dno = panelOf(r, id);
    assert.ok(trapCutNotches(dno), `${id} is cut`);
    const { solid } = panelSolids(dno, LAYERS, P, []);
    assert.equal(openEdges(solid), 0, id);
    const w = Number(dno.cnc?.drawn_w) || Number(dno.w);
    const d = Number(dno.cnc?.drawn_h) || Number(dno.h);
    const removed = (w * d * 18 - volumeMm3(solid)) / 18;
    assert.ok(Math.abs(removed - w * d + shoelace(dno.cnc.outline)) < 0.2, id);
  }
  // The bottom under it, the same size, is a different board: not the trapped solid.
  const top = panelSolids(panelOf(vanity(), 'D3-DNO'), LAYERS, P, []).solid;
  const under = panelSolids(panelOf(vanity(), 'D2-DNO'), LAYERS, P, []).solid;
  assert.notEqual(top, under);
});

// === 3 . THE ROOM IS WIRED (source) ==========================================

test('T82 F9 . the room\'s one road: the socket notch\'s, handed the trap\'s U and its R; the pinned lines of T46, T75 and T76 kept', () => {
  const solidSrc = uncomment(read('src/3d/panelSolid.js'));
  assert.match(solidSrc, /const trap = trapCutNotches\(panel\);\s*const notches = trap \? trap\.notches : socketNotches\(panel, layers\);/);
  assert.match(solidSrc, /const radius = trap \? trap\.radius : Math\.max\(0, \(Number\(profile\?\.cnc\?\.toolDiameter\) \|\| 0\) \/ 2\);/);
  // The lines other turns pin, to the character.
  assert.match(solidSrc, /const outline = trimOutlineOnSlope\(notchedOutline\(\{/);
  assert.match(solidSrc, /const shaped = notch \? cutNotchCorner\(outline, w, h, notch\) : outline;/);
  // The room's working view hands every board the joint layers, so T76's gate
  // lets the bottom through to `panelSolids`; the room's file is not touched.
  assert.match(uncomment(read('src/3d/UnitView.jsx')), /\(\(layers \|\| jpullCut\) && !mitre && !decoration \? panelSolids\(p, layers, profile, boredDrills\) : null\)/);
});
