// ─── TURN 27 F3 — the shaker recess has walls ───────────────────────────────
//
// The owner: the 6 mm recess works, but it has no side walls at all — the panel
// reads as a hole straight through the door.
//
// He is right, and the cause is the one thing that can go wrong with a
// hand-built face while every number in it is correct. Turn 25 declared the
// right INWARD normal on each of the four rebate walls and wound the triangles
// the other way round; a rasteriser culls on the WINDING, so all four were
// front-facing AWAY from the recess — invisible from the room, and what showed
// through the gap was whatever stood behind the door.
//
// This is that fault caught as ARITHMETIC rather than as a picture:
//
//   F3.1a  every triangle's winding agrees with its own declared normal, so
//          nothing in the leaf is visible only from the wrong side;
//   F3.1b  the tray is a CLOSED solid — every directed edge is matched by its
//          opposite, which is what "no open boundary edges" means;
//   F3.1c  the floor is at the stated depth and the four walls rise from it
//          back to the frame face;
//   F3.1d  no gaps at the corners: the four walls share their end edges.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { clearShakerCache, shakerFrontGeometry } from '../src/3d/shakerSolid.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const MM = 0.001;

const leaf = (over = {}) => ({
  part: 'FRONT',
  role: 'front',
  meta: { frontType: 'S', shaker: { frame: 70, depth: 6, panelFloor: 19 }, ...(over.meta || {}) },
  box: {
    x: 0, y: 0, z: 0, w: 594, h: 767, d: 25, ...(over.box || {}),
  },
});

/** Every triangle of a geometry, as points and the normal it declares. */
function triangles(geo) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const out = [];
  for (let t = 0; t < pos.count; t += 3) {
    const p = [0, 1, 2].map((k) => [pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k)]);
    out.push({ p, n: [nor.getX(t), nor.getY(t), nor.getZ(t)] });
  }
  return out;
}

const cross = (u, v) => [
  u[1] * v[2] - u[2] * v[1],
  u[2] * v[0] - u[0] * v[2],
  u[0] * v[1] - u[1] * v[0],
];
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const key = (p) => p.map((v) => v.toFixed(7)).join(',');

/** How many triangles face the opposite way from the normal they carry. */
function windingMismatches(geo) {
  let bad = 0;
  for (const tri of triangles(geo)) {
    const face = cross(sub(tri.p[1], tri.p[0]), sub(tri.p[2], tri.p[0]));
    if (Math.hypot(...face) < 1e-12) continue;      // a degenerate sliver
    if (dot(face, tri.n) <= 0) bad += 1;
  }
  return bad;
}

/** Directed edges with no opposite — the boundary of an open surface. */
function openEdges(geo) {
  const edges = new Map();
  for (const tri of triangles(geo)) {
    for (const [i, j] of [[0, 1], [1, 2], [2, 0]]) {
      const e = `${key(tri.p[i])}>${key(tri.p[j])}`;
      edges.set(e, (edges.get(e) || 0) + 1);
    }
  }
  let open = 0;
  for (const [e, n] of edges) {
    const [a, b] = e.split('>');
    if ((edges.get(`${b}>${a}`) || 0) !== n) open += 1;
  }
  return open;
}

test('F3.1 every face of the tray is visible from the side its normal points at', () => {
  clearShakerCache();
  const geo = shakerFrontGeometry(leaf(), []);
  assert.ok(geo, 'a shaker leaf builds a tray');
  assert.equal(windingMismatches(geo), 0,
    'a wall wound against its normal is a wall the room cannot see — which is the fault');
});

test('F3.1 the tray is a CLOSED solid: no open boundary edges', () => {
  clearShakerCache();
  assert.equal(openEdges(shakerFrontGeometry(leaf(), [])), 0);
  // …at every size and frame the app will build, so this is a property of the
  // construction rather than of one leaf.
  for (const [w, h, frame, depth] of [[400, 700, 60, 6], [900, 500, 100, 8], [594, 767, 70, 6]]) {
    clearShakerCache();
    const geo = shakerFrontGeometry(leaf({
      box: {
        x: 0, y: 0, z: 0, w, h, d: 25,
      },
      meta: { shaker: { frame, depth, panelFloor: 25 - depth } },
    }), []);
    assert.equal(openEdges(geo), 0, `${w}×${h} frame ${frame}: closed`);
    assert.equal(windingMismatches(geo), 0, `${w}×${h} frame ${frame}: wound one way`);
  }
});

test('F3.1 the floor sits at the stated depth and the walls rise back to the face', () => {
  clearShakerCache();
  const geo = shakerFrontGeometry(leaf(), []);
  const Z = (25 / 2) * MM;
  const floorZ = Z - 6 * MM;
  const ix = (594 / 2 - 70) * MM;
  const iy = (767 / 2 - 70) * MM;

  // The four INWARD-facing walls, picked out by the normal they carry.
  const walls = triangles(geo).filter((t) => t.p.every(([, , z]) => z >= floorZ - 1e-6 && z <= Z + 1e-6)
    && t.p.some(([, , z]) => Math.abs(z - floorZ) < 1e-6)
    && t.p.some(([, , z]) => Math.abs(z - Z) < 1e-6)
    && Math.abs(t.n[2]) < 1e-9);
  assert.equal(walls.length, 8, 'four walls, two triangles each');
  // Each spans the full 6 mm, top to bottom…
  for (const wall of walls) {
    const zs = wall.p.map(([, , z]) => z);
    assert.ok(Math.max(...zs) - Math.min(...zs) > 5.9 * MM, 'the wall is the full depth');
  }
  // …and the four normals are the four inward directions, one each.
  const dirs = new Set(walls.map((w) => w.n.map((v) => Math.round(v)).join(',')));
  assert.deepEqual([...dirs].sort(), ['-1,0,0', '0,-1,0', '0,1,0', '1,0,0']);

  // The floor is a plane at exactly `depth` below the frame face, and it is
  // the recess's own rectangle.
  const floor = triangles(geo).filter((t) => t.p.every(([, , z]) => Math.abs(z - floorZ) < 1e-6));
  assert.ok(floor.length >= 2, 'the panel floor is there');
  const xs = floor.flatMap((t) => t.p.map(([x]) => x));
  const ys = floor.flatMap((t) => t.p.map(([, y]) => y));
  const near = (a, b) => Math.abs(a - b) < 1e-6;   // Float32 attributes
  assert.ok(near(Math.max(...xs), ix) && near(Math.min(...xs), -ix));
  assert.ok(near(Math.max(...ys), iy) && near(Math.min(...ys), -iy));
});

test('F3.1 no gaps at the corners — the four walls share their end edges', () => {
  clearShakerCache();
  const geo = shakerFrontGeometry(leaf(), []);
  const ix = (594 / 2 - 70) * MM;
  const iy = (767 / 2 - 70) * MM;
  const Z = (25 / 2) * MM;
  const floorZ = Z - 6 * MM;
  // Every one of the recess's eight corner points must be a vertex of the mesh:
  // a wall that stopped short of one would leave a slot to see through.
  const points = new Set(triangles(geo).flatMap((t) => t.p.map(key)));
  for (const x of [-ix, ix]) {
    for (const y of [-iy, iy]) {
      for (const z of [Z, floorZ]) {
        assert.ok(points.has(key([x, y, z])), `the corner ${x},${y},${z} is a vertex`);
      }
    }
  }
});

test('F3.2 same material as the frame — one skin over the whole leaf', () => {
  clearShakerCache();
  const geo = shakerFrontGeometry(leaf(), []);
  // Turn 26's F6 rule stands: the UVs are the ones a plain box front face
  // carries, over the WHOLE board, so the figure runs unbroken from the frame,
  // down the rebate wall and across the panel. The only difference the eye is
  // left with is the shadow — which is the point of the rebate.
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    assert.ok(Math.abs(uv.getX(i) - (pos.getX(i) / (594 * MM) + 0.5)) < 1e-6);
    assert.ok(Math.abs(uv.getY(i) - (pos.getY(i) / (767 * MM) + 0.5)) < 1e-6);
  }
  const src = readFileSync(new URL('../src/3d/shakerSolid.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /new THREE\.Mesh|Material/, 'the solid decides geometry and never a colour');
});

test('F3.1 a DRILLED leaf is closed too — the bores do not open the skin', () => {
  // The cups and handle holes turn 26 cut into the tray are the other way a
  // face can be left open. A blind bore is a wall and a floor; a through bore
  // is a wall and a hole in each face it comes out of.
  clearShakerCache();
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', project_handle: { type: 'knob' } }, P);
  const face = r.panels.find((p) => p.part === 'FRONT');
  assert.ok(face.meta.shaker, 'the golden default front is a shaker');
  const geo = shakerFrontGeometry(face, [
    { kind: 'round', x: 100, y: 200, r: 17.5, depth: 11 },
    { kind: 'round', x: face.w / 2, y: face.h - 50, r: 2.5, through: true },
  ]);
  assert.equal(windingMismatches(geo), 0, 'every bore face is wound with the rest');
  assert.equal(openEdges(geo), 0, 'and the leaf is still a closed solid');
});
