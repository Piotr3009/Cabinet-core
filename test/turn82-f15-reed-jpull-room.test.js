/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F15, AFTER THE REVIEW . THE REEDS RUN OUT OF A J-PULL DOOR'S EDGES TOO
//
// The owner's cloud, 25.10.2026: *"daj wariant b czyli na styk narazie"*;
// CLAUDE.md T82 F15: top and bottom the reeds run to the edges. The room's
// reed solid (`3d/frontDecorationSolid.js`) cut the reeds' end sections into
// the slab's side wall at the top and bottom edges, and only into the slice
// of the slab that reaches the face. A door with a side J-pull is built as
// three slices through its thickness (the lip, the slot, the rear leg), and
// the rear leg is thinner than a valley on the house's 18 and 22 fronts (leg
// 3.788 and 7.788 against a valley of 10 at reeds 20). The review found the
// leg's wall polygon dipping below its own floor (it self-intersected) and the
// slot's wall standing straight across the valleys' ends: 58 open edges on a
// WD 597 x 2147 at 22, 54 of them real gaps, and a ray down a valley stopped
// at the edge, the lip F15 removed.
//
// The rule: the reeds' sections are cut into EVERY slice wall whose z range
// they cross, each slice's wall held between its own floor and the section.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultFrontDecoration, newFrontDecoration } from '../src/engine/frontDecoration.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { frontDecorationGeometry } from '../src/3d/frontDecorationSolid.js';

/** A WD leaf: its front, its J, its decoration, as the engine cuts them. */
function leaf({ frontT, reed = 20, jpull = true, grooves = false }) {
  const decoration = grooves ? defaultFrontDecoration('FL', P) : { ...newFrontDecoration('FL', P), reedDiameterMm: reed };
  const params = {
    ...defaultParamsFor('WD', P), unit_num: '01', front_type: 'FL', front_t: frontT, front_decoration: decoration,
    ...(jpull ? { project_handle: { type: 'jpull' } } : {}),
  };
  return computeCabinet(params, P).panels.find((p) => p.meta?.frontDecoration);
}

/**
 * The open edges of a solid, sorted into T-junctions (an open edge lying along
 * an open edge of the opposite direction: a vertex one face has and its
 * neighbour lacks, no gap) and real gaps (the review's own classification).
 */
function classify(geometry) {
  const p = geometry.attributes.position;
  const V = (i) => [p.getX(i), p.getY(i), p.getZ(i)];
  const key = (v) => v.map((x) => x.toFixed(7)).join(',');
  const edges = new Map();
  for (let i = 0; i < p.count; i += 3) {
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const A = V(i + a); const B = V(i + b); const k = `${key(A)}>${key(B)}`;
      const e = edges.get(k) || { A, B, n: 0 }; e.n += 1; edges.set(k, e);
    }
  }
  const open = [...edges.entries()].filter(([k, e]) => {
    const [a, b] = k.split('>');
    return (edges.get(`${b}>${a}`)?.n || 0) !== e.n;
  }).map(([, e]) => e);
  const onSeg = (Q, A, B) => {
    const ab = A.map((v, i) => B[i] - v); const aq = A.map((v, i) => Q[i] - v);
    const L2 = ab.reduce((s, v) => s + v * v, 0);
    if (L2 < 1e-18) return false;
    const t = aq.reduce((s, v, i) => s + v * ab[i], 0) / L2;
    if (t < -1e-6 || t > 1 + 1e-6) return false;
    return Math.hypot(...aq.map((v, i) => v - t * ab[i])) < 2e-7;
  };
  let gaps = 0;
  for (const e of open) {
    const mid = e.A.map((v, i) => (v + e.B[i]) / 2);
    const dir = e.B.map((v, i) => v - e.A[i]);
    const partner = open.some((f) => f !== e && onSeg(mid, f.A, f.B)
      && f.B.map((v, i) => v - f.A[i]).reduce((s, v, i) => s + v * dir[i], 0) < 0);
    if (!partner) gaps += 1;
  }
  return { open: open.length, gaps };
}

/** Each valley's floor in the mesh frame: [x, z] (mm), from the engine's own swept surface. */
function valleyFloors(panel) {
  const d = panel.meta.frontDecoration;
  const w = Number(panel.w); const half = Number(panel.thickness) / 2;
  return d.operations.filter((op) => op.kind === 'reed').map((op) => {
    const deepest = op.surface.vertices.reduce((m, v) => (v[2] > m[2] ? v : m));
    return [w / 2 - deepest[0], half - deepest[2]];
  });
}

/** A ray run along a valley 1 mm above its floor, in from one edge for 40 mm: does it meet the board? */
function sealed(geometry, panel, [x, zFloor], edge) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld(true);
  const y0 = edge * (Number(panel.h) / 2 + 5);
  const ray = new THREE.Raycaster(new THREE.Vector3(x / 1000, y0 / 1000, (zFloor + 1) / 1000), new THREE.Vector3(0, -edge, 0), 0, 0.045);
  return ray.intersectObject(mesh).length > 0;
}

test('T82 F15 . a J-pull door with reeds: the slab has no gap, on every front and every reed of the ladder', () => {
  // The J's own seam (its shoulder meeting the lip and the leg) is the
  // baseline every J door carries: the grooves on the same door have it too.
  const baseline = classify(frontDecorationGeometry(leaf({ frontT: 22, grooves: true }), [])).open;
  for (const frontT of [18, 22, 25]) {
    for (const reed of [16, 20, 25]) {
      const panel = leaf({ frontT, reed });
      const d = panel.meta.frontDecoration;
      if (d.status !== 'ready') continue;
      assert.ok(panel.cnc?.jpull?.edge, `${frontT}/${reed}: the leaf carries the J`);
      const { open, gaps } = classify(frontDecorationGeometry(panel, []));
      assert.equal(gaps, 0, `front ${frontT}, reeds ${reed}: no real gap in the solid`);
      assert.equal(open, baseline, `front ${frontT}, reeds ${reed}: the reeds add no seam to the J's own ${baseline}`);
    }
  }
});

test('T82 F15 . the review\'s door: a WD 597 x 2147 at 22 with the J, reeds 20, every valley runs out of both edges', () => {
  const panel = leaf({ frontT: 22, reed: 20 });
  assert.deepEqual([Number(panel.w), Number(panel.h)], [597, 2147]);
  const j = panel.cnc.jpull;
  const leg = 22 - j.profile.lipT - j.profile.slotW;
  assert.ok(leg < 10, `the rear leg ${leg} is thinner than the valley: the case the review found`);
  const g = frontDecorationGeometry(panel, []);
  const floors = valleyFloors(panel);
  assert.ok(floors.length >= 20, `${floors.length} valleys`);
  // The two outer valleys lie on the field's edges; every one inside them runs clear.
  for (const at of floors.slice(1, -1)) {
    for (const edge of [1, -1]) assert.equal(sealed(g, panel, at, edge), false, `the valley at x ${at[0].toFixed(1)} is open at the ${edge > 0 ? 'top' : 'bottom'} edge`);
  }
});

test('T82 F15 . what the J does not reach is as it was: reeds with no J, and the grooves on a J door, keep a closed slab', () => {
  for (const frontT of [18, 22, 25]) {
    const panel = leaf({ frontT, reed: 20, jpull: false });
    assert.equal(panel.cnc?.jpull?.edge ?? null, null);
    const c = classify(frontDecorationGeometry(panel, []));
    assert.deepEqual(c, { open: 0, gaps: 0 }, `reeds with no J at ${frontT}`);
    const floors = valleyFloors(panel);
    const g = frontDecorationGeometry(panel, []);
    for (const at of floors.slice(1, -1)) assert.equal(sealed(g, panel, at, 1), false);
  }
  const grooves = leaf({ frontT: 22, grooves: true });
  assert.equal(classify(frontDecorationGeometry(grooves, [])).gaps, 0, 'the T76 grooves on the J door');
});
