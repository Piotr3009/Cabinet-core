/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F9 · THE FRAME IN 3D ───────────────────────────────────────────────
//
// CLAUDE.md T80 F9: *"the frame of a run as ONE mesh (ExtrudeGeometry of a
// Shape with the openings as holes, exactly scripts/chatfix-2110-mockup-
// inframe-final.mjs does it), the front material of the project (sprayed,
// the sheen ride applies to it as to a front), 25 deep from the carcass face;
// the inset fronts drawn at the frame's face through today's front meshes
// (their rectangle and plane from the engine, nothing computed in 3D) ...
// Hide fronts (hides the fronts, never the frame), Open all (the inset door
// swings as today's door, about the hinge side; the frame does not move)."*
//
// The frame reaches the room through the one road every board takes: its
// engine record (part FRAME, its openings RECESS_WINDOW cut-outs, the T25
// F1.2 window) placed by `joinery.js panelPlacement` and extruded by
// `3d/panelSolid.js panelSolids` with the openings as holes. These tests read
// that geometry back, in node, without a renderer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { runFrameParams } from '../src/engine/inframe.js';
import { joineryLayers, panelPlacement } from '../src/engine/joinery.js';
import { elementKind } from '../src/engine/elements.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { surfaceFor } from '../src/3d/materials.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const MM = 1000;

/** The mockup's run (END-L 18, BUD 600, BUD 800 pair, BUDR2 500), as the store hands it to the owner. */
function mockupRun() {
  const units = [['a', 'BUD', 0, 600, [{ id: 'ep', side: 'L', height: 'floor', thickness: 18 }], { doors: 1 }],
    ['b', 'BUD', 600, 800, [], { doors: 2 }], ['c', 'BUDR2', 1400, 500, [], {}]].map(([id, type, x, width, ends], i) => ({
    id, type, position: { wall: 0, x_mm: x, rotation_deg: 0 },
    params: { ...defaultParamsFor(type, P), unit_num: ['01', '02', 'DR01'][i], width, end_panels: ends, front_t: 22 },
  }));
  const els = runFrameParams(units, P);
  return units.map((u) => computeCabinet({ ...u.params, type: u.type, inframe: true, run_frame: els.get(u.id) }, P));
}

/** Triangles of a solid that cover the point (x, y) of the board's face (mm, room frame of the owner). */
function covering(geometry, box, x, y) {
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  const px = (x - (box.x + box.w / 2)) / MM;
  const py = (y - (box.y + box.h / 2)) / MM;
  let hits = 0;
  const n = idx ? idx.count : pos.count;
  for (let i = 0; i < n; i += 3) {
    const v = [0, 1, 2].map((k) => { const j = idx ? idx.getX(i + k) : i + k; return [pos.getX(j), pos.getY(j)]; });
    const d = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
    const P0 = [px, py];
    const s = [d(P0, v[0], v[1]), d(P0, v[1], v[2]), d(P0, v[2], v[0])];
    if (!(s.some((t) => t < 0) && s.some((t) => t > 0))) hits += 1;
  }
  return hits;
}

test('F9 · the FRAME has a seat: drawn as the sheet draws it, x along the run, y up, right-handed (u x v = -n)', () => {
  const [owner] = mockupRun();
  const frame = owner.panels.find((p) => p.part === 'FRAME');
  const pl = panelPlacement(frame);
  assert.deepEqual(pl, { origin: [frame.box.x, frame.box.y, frame.box.z], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, -1] });
  const u = new THREE.Vector3(...pl.u); const v = new THREE.Vector3(...pl.v); const n = new THREE.Vector3(...pl.n);
  assert.ok(u.clone().cross(v).dot(n) < 0, 'right-handed against the extrusion: no reflection, no reversed winding');
});

test('F9 · ONE mesh with the openings as holes: the board 1920 x 808 x 25 at the carcass face, air in every opening, board on every stile and rail', () => {
  const [owner] = mockupRun();
  const frame = owner.panels.find((p) => p.part === 'FRAME');
  assert.deepEqual([frame.box.w, frame.box.h, frame.box.d, frame.box.z], [1920, 808, 25, 558], '25 deep from the carcass face (D 558)');
  const built = panelSolids(frame, joineryLayers(P), P, owner.drills);
  assert.ok(built.solid, 'a solid, not a box');
  built.solid.computeBoundingBox();
  const size = built.solid.boundingBox.getSize(new THREE.Vector3());
  assert.deepEqual([size.x, size.y, size.z].map((s) => Math.round(s * MM * 100) / 100), [1920, 808, 25]);
  // The openings, from the engine (KIT_INFRAME.lsp (a)): their centres are air.
  for (const o of frame.meta.inframe.openings.length ? frame.cnc.pockets : []) {
    const cx = frame.box.x + (o.x1 + o.x2) / 2;
    const cy = frame.box.y + (o.y1 + o.y2) / 2;
    assert.equal(covering(built.solid, frame.box, cx, cy), 0, `opening at ${cx}, ${cy} is a hole`);
  }
  // A stile between two cabinets (x 600), the outer stile at the end panel, the two rails: board, front and back faces.
  for (const [x, y] of [[600, 385], [-10, 385], [300, -10], [300, 780]]) {
    assert.equal(covering(built.solid, frame.box, x, y), 2, `board at ${x}, ${y}`);
  }
});

test('F9 · the holes do not wait for the scene\'s machining flag or the joint layers (the contour view hands none)', () => {
  const [owner] = mockupRun();
  const frame = owner.panels.find((p) => p.part === 'FRAME');
  const off = { ...P, appearance: { ...P.appearance, cuts: { ...P.appearance.cuts, enabled: false } } };
  const built = panelSolids(frame, null, off, []);
  assert.ok(built.solid);
  assert.equal(covering(built.solid, frame.box, 300, 385), 0, 'the door opening is still air');
  // The room hands the FRAME the joint layers in every view, the contour view included (UnitView.jsx `frameLayers`).
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /const frameLayers = useMemo\(\s*\(\) => resolveJoineryLayers\(profile, unitDesign\?\.joinery \|\| null\),/);
  assert.match(view, /joineryLayers=\{p\.part === 'FRAME' \? frameLayers : jointLayers\}/);
  // Every other board is untouched by the change: a lay-on door with the flag off is still no solid at all.
  const layon = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  const door = layon.panels.find((p) => p.role === 'front');
  assert.equal(panelSolids(door, null, off, []).solid, null);
});

test('F9 · the inset fronts: today\'s front meshes at the engine\'s rectangle and plane (face on the frame\'s face, 3 of air behind)', () => {
  const [a, b] = mockupRun();
  const frame = a.panels.find((p) => p.part === 'FRAME');
  const faceZ = frame.box.z + frame.box.d;
  for (const r of [a, b]) {
    for (const f of r.panels.filter((p) => p.role === 'front')) {
      assert.ok(['FRONT', 'DRAWER-FRONT'].includes(f.part), 'drawn by the front meshes as every front is');
      assert.equal(f.box.z + f.box.d, faceZ, `${f.id}'s face on the frame's face`);
      assert.equal(f.box.z, 558 + 3, `${f.id}: 3 of air behind it`);
    }
  }
  assert.deepEqual(b.panels.filter((p) => p.role === 'front').map((p) => p.box.w), [376.5, 376.5]);
});

test('F9 · the frame wears the FRONT\'s surface: sprayed, the sheen ride applies to it as to a door', () => {
  const [owner] = mockupRun();
  const frame = owner.panels.find((p) => p.part === 'FRAME');
  const door = owner.panels.find((p) => p.role === 'front');
  assert.deepEqual([frame.material_role, frame.finish_exposed], ['front', true]);
  const finishes = { front: { kind: 'spray', hex: '#5d6b4f' }, carcass: { kind: 'melamine', hex: '#ffffff' } };
  const look = (p, sheen) => surfaceFor({
    role: p.role, materialRole: p.material_role, finishExposed: p.finish_exposed, finishes, profile: P, frontColour: { hex: '#5d6b4f' }, sheen,
  });
  for (const sheen of [5, 30, 90]) {
    const [f, d] = [look(frame, sheen), look(door, sheen)];
    for (const key of ['colour', 'sprayed', 'roughness', 'clearcoat', 'clearcoatRoughness', 'envMapIntensity', 'sheenDriven']) {
      assert.deepEqual(f[key], d[key], `${key} at sheen ${sheen}`);
    }
  }
});

test('F9 · Hide fronts hides the fronts, never the frame; Open all swings the doors, the frame stays; a click on it is the cabinet\'s', () => {
  const view = read('src/3d/UnitView.jsx');
  // `frontKind` is the ONE question both gestures ask (Hide fronts filters on it, MovingPanel moves on it).
  const kind = view.match(/export function frontKind\(panel\) \{([\s\S]*?)\n\}/)[1];
  assert.match(kind, /'DRAWER-FRONT'\) return 'drawer'/);
  assert.match(kind, /'FRONT'\) return 'door'/);
  assert.doesNotMatch(kind, /FRAME/, 'the frame is not a front: it is neither hidden nor opened');
  assert.match(view, /!\(hideFronts && frontKind\(p\)\)/);
  // Not an element: a click on the frame falls through to its cabinet, as a click on a carcass board does.
  const [owner] = mockupRun();
  assert.equal(elementKind(owner.panels.find((p) => p.part === 'FRAME')), null);
});

test('F9 · in-frame OFF: no FRAME part reaches the scene, and every lay-on placement is the one main had', () => {
  const layon = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  assert.ok(!layon.panels.some((p) => p.part === 'FRAME'));
  for (const p of layon.panels) {
    const pl = panelPlacement(p);
    if (p.part === 'FRONT') assert.deepEqual(pl.u, [-1, 0, 0], 'the lay-on door is still drawn from behind');
  }
});
