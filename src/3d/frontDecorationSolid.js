import * as THREE from 'three';
import { mm } from './constants.js';
import { jpullLayers } from './jpullProfile.js';

// The engine supplies every decorative outline and machining depth. This
// builder only joins those surfaces into a solid in the moving front's frame.
const CACHE_LIMIT = 160;
const cache = new Map();
const EPS = 1e-7;
const BORE_SEGMENTS = 32;

const area = (points) => points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length];
  return sum + p[0] * q[1] - q[0] * p[1];
}, 0) / 2;
const ccw = (points) => (area(points) < 0 ? [...points].reverse() : points);

function contains(points, point) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i]; const b = points[j];
    if ((a[1] > point[1]) !== (b[1] > point[1])
      && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function circle(x, y, radius) {
  return Array.from({ length: BORE_SEGMENTS }, (_, i) => {
    const a = i * Math.PI * 2 / BORE_SEGMENTS;
    return [x + radius * Math.cos(a), y + radius * Math.sin(a)];
  });
}

const sideOf = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1])
  - (b[1] - a[1]) * (p[0] - a[0]);

// Clip in XY and interpolate position and optional relief normal along the
// original surface edge. The canonical surface therefore remains unchanged
// everywhere except inside the bore, including spherical stopped ends.
function splitSurfacePolygon(points, a, b) {
  const inside = []; const outside = [];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]; const q = points[(i + 1) % points.length];
    const dp = sideOf(a, b, p); const dq = sideOf(a, b, q);
    if (dp >= -EPS) inside.push(p);
    if (dp <= EPS) outside.push(p);
    if ((dp > EPS && dq < -EPS) || (dp < -EPS && dq > EPS)) {
      const t = dp / (dp - dq);
      const crossing = p.map((value, axis) => value + (q[axis] - value) * t);
      inside.push(crossing); outside.push(crossing);
    }
  }
  return { inside, outside };
}

function outsideBore(triangle, bore) {
  const [cx, cy] = bore.centre;
  if (Math.max(...triangle.map((p) => p[0])) < cx - bore.radius
    || Math.min(...triangle.map((p) => p[0])) > cx + bore.radius
    || Math.max(...triangle.map((p) => p[1])) < cy - bore.radius
    || Math.min(...triangle.map((p) => p[1])) > cy + bore.radius) return [triangle];
  const pieces = [];
  let remainder = triangle;
  for (let i = 0; i < bore.ring.length && remainder.length >= 3; i += 1) {
    const { inside, outside } = splitSurfacePolygon(remainder, bore.ring[i], bore.ring[(i + 1) % bore.ring.length]);
    if (outside.length >= 3) pieces.push(outside);
    remainder = inside;
  }
  return pieces;
}

const edgesOf = (points) => points.map((p, i) => [p, points[(i + 1) % points.length]]);

function crossingAt(a, b, c, d) {
  const x = b[0] - a[0]; const y = b[1] - a[1];
  const u = d[0] - c[0]; const v = d[1] - c[1];
  const determinant = x * v - y * u;
  if (Math.abs(determinant) <= EPS) return null;
  const dx = c[0] - a[0]; const dy = c[1] - a[1];
  const t = (dx * v - dy * u) / determinant;
  const s = (dx * y - dy * x) / determinant;
  return t >= -EPS && t <= 1 + EPS && s >= -EPS && s <= 1 + EPS
    ? Math.max(0, Math.min(1, t)) : null;
}

function triangleHeight(triangle, point, requireInside = false) {
  const [a, b, c] = triangle;
  const denominator = sideOf(a, b, c);
  if (Math.abs(denominator) < EPS) return null;
  const u = sideOf(b, c, point) / denominator;
  const v = sideOf(c, a, point) / denominator;
  const w = 1 - u - v;
  if (requireInside && (u < -EPS || v < -EPS || w < -EPS)) return null;
  return u * a[2] + v * b[2] + w * c[2];
}

const faceNormal = (a, b, c) => {
  const ab = b.map((value, axis) => value - a[axis]);
  const ac = c.map((value, axis) => value - a[axis]);
  return [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
};

// The carved surface is continuous material, so adjacent relief triangles
// share an area-weighted vertex normal. Slab faces and bore walls are emitted
// separately and retain their hard edges. This changes lighting only: the
// canonical CNC positions, triangle winding and physical cut stay identical.
function surfaceTriangles(operation, toMesh, half) {
  if (!operation.surface?.vertices || !operation.surface?.triangles) return [];
  const vertices = operation.surface.vertices.map(([x, y, depth]) => [...toMesh([x, y]), half - depth]);
  if (operation.kind === 'relief') {
    const normals = vertices.map(() => [0, 0, 0]);
    for (const [a, b, c] of operation.surface.triangles) {
      // The drawing's single X reflection reverses the visible winding.
      const normal = faceNormal(vertices[a], vertices[c], vertices[b]);
      for (const index of [a, b, c]) {
        for (let axis = 0; axis < 3; axis += 1) normals[index][axis] += normal[axis];
      }
    }
    for (let index = 0; index < vertices.length; index += 1) {
      const length = Math.hypot(...normals[index]);
      vertices[index].push(...(length > EPS ? normals[index].map((value) => value / length) : [0, 0, 1]));
    }
  }
  return operation.surface.triangles.map((indices) => indices.map((index) => vertices[index]));
}

/**
 * A front-face decoration, including its back-face bores and existing J edge.
 * Metadata is opt-in. Legacy fronts retain their existing solid builders.
 */
// The relief surface is the heavy part of a record (up to 180,000 triangles);
// in the key it is replaced by its counts and a sparse sample of its depths.
function surfaceKey(surface) {
  const v = surface?.vertices; const t = surface?.triangles;
  if (!Array.isArray(v) || !Array.isArray(t)) return surface;
  let sample = 0;
  for (let i = 0; i < v.length; i += 97) sample += (v[i][2] || 0) * (i + 1);
  return { n: v.length, t: t.length, s: Math.round(sample * 1000) };
}
const decorationKey = (decoration) => JSON.stringify(decoration, (k, val) => (k === 'surface' ? surfaceKey(val) : val));

export function frontDecorationGeometry(panel, bores = []) {
  const decoration = panel?.meta?.frontDecoration;
  const box = panel?.box;
  if (!decoration || decoration.status !== 'ready' || !box
    || !Array.isArray(decoration.outline) || decoration.outline.length < 3) return null;
  const { w, h, thickness } = cutSizeOf(panel);
  if (!(w > 0 && h > 0 && thickness > 0)) return null;
  const rounds = bores.filter((b) => b?.kind === 'round' && Number(b.r) > 0
    && (b.through || Number(b.depth) > 0));
  // Chat-fix 14.10.2026: serialising an Ornate record whole (up to 6.7 MB
  // of relief) cost 20-35 ms on EVERY lookup, i.e. every re-render of the
  // front. The key still reads the record's content, with the surface
  // reduced to its counts and a sparse sample (`surfaceKey`).
  const key = JSON.stringify([w, h, thickness, decorationKey(decoration), panel.cnc?.jpull, rounds]);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const geometry = build(panel, rounds);
  cache.set(key, geometry);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    cache.get(oldest)?.dispose();
    cache.delete(oldest);
  }
  return geometry;
}

export function clearFrontDecorationCache() {
  for (const geometry of cache.values()) geometry.dispose();
  cache.clear();
}

/**
 * T78 F3 · THE LEAF'S OWN CUT SIZE, NOT ITS BOX.
 *
 * The owner, 11.10.2026: *"drzwiczki na L shape sa i jak sa ozdobne to maja
 * grubosc okolo 40 mm."*  The probe (verify/t78/f03-probe.md, rows 15, 16,
 * 25, 26): the L's door B hangs along Z (`meta.swingZ`), so its box carries
 * its WIDTH in `box.d` and its THICKNESS in `box.w`; this builder read the
 * box as every other leaf's (w across, d through) and carved a solid as
 * THICK as the door was wide (312.5 on a 25 leaf, 287.5 mm back into the
 * carcass). A leaf's cut size is the panel's own `w`, `h`, `thickness` (the
 * cut list's numbers), the same for every hand it hangs on; the box only says
 * where it stands. The scene turns the solid onto its arm (UnitView.jsx).
 */
export function cutSizeOf(panel) {
  const box = panel?.box || {};
  const w = Number(panel?.w) > 0 ? Number(panel.w) : Number(box.w) || 0;
  const h = Number(panel?.h) > 0 ? Number(panel.h) : Number(box.h) || 0;
  const thickness = Number(panel?.thickness) > 0 ? Number(panel.thickness) : Number(box.d) || 0;
  return { w, h, thickness };
}

// ─── T82 F15 · THE REEDS RUN TO THE EDGES ──────────────────────────────────
// The owner's cloud (*"fluted teraz to sa rowki a ja potrzebuje chmurke"*):
// a reed valley's swept surface (engine/frontDecoration.js, kind `reed`)
// ends ON the front's outline, top and bottom, open. The slab's side wall
// there stands only up to the reeds' section, never to the face, so the
// valleys run out of the edge as they are cut instead of ending in a lip.
// Each end is the section polyline in the room's frame: [x, y, z].
function reedEnds(operations, toMesh, half) {
  const ends = [];
  for (const op of operations) {
    const v = op.kind === 'reed' ? op.surface?.vertices : null;
    if (!Array.isArray(v) || v.length < 4) continue;
    for (const side of [0, 1]) {
      const line = [];
      for (let k = side; k < v.length; k += 2) line.push([...toMesh([v[k][0], v[k][1]]), half - v[k][2]]);
      ends.push(line);
    }
  }
  return ends;
}

/**
 * One slab slice's side wall along a -> b, its z from zLow to zHigh, where
 * the reeds' sections end on that edge: the pieces of the wall in the edge's
 * own (s, z) plane, each an outline (the floor at zLow, then the top from the
 * far end back), the top being the slice's own zHigh or the section, whichever
 * is lower. Null when no section ends on this edge, or when none reaches down
 * into this slice (its wall is then the plain quad it always was).
 *
 * T82 F15, after the review: EVERY slice the sections cross takes them. A
 * door with a side J is three slices through its thickness, and on an 18 or
 * a 22 front the rear leg is thinner than a valley: the section goes on into
 * the slot's slice below it, and where it dips under a slice's floor that
 * slice has no wall there at all. Cut into the face slice alone, the leg's
 * wall dipped below its own floor and the slot's wall stood across the
 * valleys' ends (the review: 54 real gaps on a WD at 22, the valleys sealed).
 */
function reedWallPieces(a, b, zLow, zHigh, ends) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!(length > EPS)) return null;
  const dir = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  const tol = 1e-4;
  const lines = [];
  for (const line of ends) {
    const on = line.map((p) => {
      const dx = p[0] - a[0]; const dy = p[1] - a[1];
      const along = dx * dir[0] + dy * dir[1];
      const off = Math.abs(dx * dir[1] - dy * dir[0]);
      return off <= tol && along >= -tol && along <= length + tol ? [Math.max(0, Math.min(length, along)), p[2]] : null;
    }).filter(Boolean);
    if (on.length < 2) continue;
    lines.push(on[0][0] > on.at(-1)[0] ? on.reverse() : on);
  }
  if (!lines.length) return null;
  lines.sort((p, q) => p[0][0] - q[0][0]);
  const seq = [[0, zHigh], ...lines.flat(), [length, zHigh]];
  if (!seq.some(([, z]) => z < zHigh - tol)) return null;
  // The top along the edge: min(zHigh, the section), with the points where
  // the section crosses the slice's top and floor, so the slices meet there.
  const top = [];
  const push = (point) => {
    const last = top.at(-1);
    if (!last || Math.abs(point[0] - last[0]) > tol || Math.abs(point[1] - last[1]) > tol) top.push(point);
  };
  for (let i = 0; i < seq.length; i += 1) {
    const p = seq[i];
    if (i > 0) {
      const q = seq[i - 1];
      const crossings = [zHigh, zLow]
        .filter((zc) => (q[1] - zc) * (p[1] - zc) < 0)
        .map((zc) => ({ t: (zc - q[1]) / (p[1] - q[1]), zc }))
        .sort((m, n) => m.t - n.t);
      for (const { t, zc } of crossings) push([q[0] + t * (p[0] - q[0]), zc]);
    }
    push([p[0], Math.min(zHigh, p[1])]);
  }
  // Where the section stands over the slice, its points clamped to zHigh are
  // one straight run: kept as its two ends, so the floor of the slice above
  // (one edge from crossing to crossing) meets it edge for edge.
  for (let i = top.length - 2; i >= 1; i -= 1) {
    if (Math.abs(top[i - 1][1] - zHigh) <= tol && Math.abs(top[i][1] - zHigh) <= tol
      && Math.abs(top[i + 1][1] - zHigh) <= tol) top.splice(i, 1);
  }
  // The pieces: where the top stands above the floor. A point under the floor
  // is in the valley's void; a point on it closes one piece and opens the next.
  const pieces = [];
  let run = [];
  const close = () => {
    if (run.length >= 2 && run.some(([, z]) => z > zLow + tol)) pieces.push(run);
    run = [];
  };
  for (const point of top) {
    if (point[1] < zLow - tol) { close(); continue; }
    if (point[1] <= zLow + tol) {
      run.push([point[0], zLow]);
      const at = [point[0], zLow];
      close();
      run = [at];
      continue;
    }
    run.push(point);
  }
  close();
  const outlines = pieces.map((piece) => {
    const first = piece[0]; const last = piece.at(-1);
    const back = [...piece].reverse();
    const outline = [[first[0], zLow], [last[0], zLow], ...back];
    // A piece that starts or ends on the floor has that corner once.
    const same = (m, n) => Math.abs(m[0] - n[0]) <= tol && Math.abs(m[1] - n[1]) <= tol;
    if (same(outline[1], outline[2])) outline.splice(2, 1);
    if (same(outline.at(-1), outline[0])) outline.pop();
    return outline;
  }).filter((outline) => outline.length >= 3);
  return { length, dir, pieces: outlines };
}

const pointKey = (p) => `${p[0].toFixed(6)},${p[1].toFixed(6)},${p[2].toFixed(6)}`;

/**
 * T82 F15, after the review: one reed surface triangle with its END edge (both
 * vertices on one of the reed's end sections) split where it crosses any of
 * `levels`, as a fan from the opposite vertex, in the triangle's own winding.
 * A triangle with no such edge, or none crossing a level, comes back whole.
 */
function splitEndEdge(tri, levels, endKeys) {
  for (const [i, j, k] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) {
    const a = tri[i]; const b = tri[j];
    if (!endKeys.has(pointKey(a)) || !endKeys.has(pointKey(b)) || Math.abs(a[1] - b[1]) > 1e-6) continue;
    const cuts = levels
      .filter((z) => (a[2] - z) * (b[2] - z) < 0)
      .map((z) => (z - a[2]) / (b[2] - a[2]))
      .sort((m, n) => m - n);
    if (!cuts.length) return [tri];
    const chain = [a, ...cuts.map((t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]), b];
    const out = [];
    for (let n = 0; n + 1 < chain.length; n += 1) {
      // The same cyclic order as (i, j, k): the piece keeps the triangle's face.
      const piece = [];
      piece[i] = chain[n]; piece[j] = chain[n + 1]; piece[k] = tri[k];
      out.push(piece);
    }
    return out;
  }
  return [tri];
}

function build(panel, bores) {
  const decoration = panel.meta.frontDecoration;
  const { w, h, thickness } = cutSizeOf(panel);
  const half = thickness / 2;
  // CNC fronts are viewed from the hinge face. Reflect x once for the room.
  const toMesh = ([x, y]) => [w / 2 - x, y - h / 2];
  const ring = (points) => ccw(points.map(toMesh));
  const operations = (decoration.operations || []).map((op) => ({
    ...op, ring: ring(op.points), children: [],
    triangles: surfaceTriangles(op, toMesh, half),
  }));
  const roots = [];
  for (const op of operations) {
    const parent = operations.filter((candidate) => candidate !== op
      && candidate.depth < op.depth - EPS
      && contains(candidate.ring, op.ring[0]))
      .sort((a, b) => b.depth - a.depth)[0];
    if (parent) parent.children.push(op);
    else roots.push(op);
  }
  const position = [];
  const normal = [];
  const uv = [];
  let complexHoles = [];
  const rawTriangle = (a, b, c) => {
    const n = faceNormal(a, b, c);
    const len = Math.hypot(...n);
    if (len <= EPS) return;
    for (const p of [a, b, c]) {
      position.push(mm(p[0]), mm(p[1]), mm(p[2]));
      // splitSurfacePolygon interpolates every component. A clipped relief
      // therefore keeps the same interpolated normal right up to a bore rim;
      // the new cylindrical wall still receives its own flat facet normal.
      const vertexNormal = p.length >= 6 ? p.slice(3, 6) : n;
      const normalLength = Math.hypot(...vertexNormal);
      normal.push(...(normalLength > EPS ? vertexNormal.map((v) => v / normalLength) : n.map((v) => v / len)));
      uv.push(p[0] / w + 0.5, p[1] / h + 0.5);
    }
  };
  const triangle = (a, b, c, cuts = complexHoles) => {
    if (!cuts.length) { rawTriangle(a, b, c); return; }
    let pieces = [[a, b, c]];
    for (const bore of cuts) pieces = pieces.flatMap((piece) => outsideBore(piece, bore));
    for (const piece of pieces) {
      for (let i = 1; i + 1 < piece.length; i += 1) rawTriangle(piece[0], piece[i], piece[i + 1]);
    }
  };
  const cap = (outer, holes, z, direction) => {
    const outline = ccw(outer);
    const voids = holes.map(ccw);
    const points = [...outline, ...voids.flat()];
    const faces = THREE.ShapeUtils.triangulateShape(
      outline.map(([x, y]) => new THREE.Vector2(x, y)),
      voids.map((hole) => hole.map(([x, y]) => new THREE.Vector2(x, y))),
    );
    for (const [a, b, c] of faces) {
      const p = [points[a], points[b], points[c]].map(([x, y]) => [x, y, z]);
      const winding = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1])
        - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
      if (winding * direction < 0) triangle(p[0], p[2], p[1]);
      else triangle(...p);
    }
  };
  // T82 F15 · the reeds' open ends (none for every other decoration).
  const ends = reedEnds(operations, toMesh, half);
  const wall = (points, zLow, zHigh, inward) => {
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]; const b = points[(i + 1) % points.length];
      const lowA = [...a, zLow]; const lowB = [...b, zLow];
      const highA = [...a, zHigh]; const highB = [...b, zHigh];
      // T82 F15, after the review: every outward slice wall under the face
      // that the reeds' sections cross takes them (an addition above the
      // face never does: the reeds are cut into the board, not out of it).
      const reeded = !inward && ends.length && zLow < half - EPS ? reedWallPieces(a, b, zLow, zHigh, ends) : null;
      if (reeded) {
        // Each piece one outward wall polygon in the edge's own (s, z) plane:
        // the bottom, then the top from the far end back, the reeds' sections
        // in it. Each triangle counter-clockwise there, as the quads below.
        const { dir } = reeded;
        const at = ([sAlong, z]) => [a[0] + sAlong * dir[0], a[1] + sAlong * dir[1], z];
        for (const outline of reeded.pieces) {
          const faces = THREE.ShapeUtils.triangulateShape(outline.map(([x, y]) => new THREE.Vector2(x, y)), []);
          for (const [i0, i1, i2] of faces) {
            const [p, q, r] = [outline[i0], outline[i1], outline[i2]];
            const turn = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
            if (turn > 0) triangle(at(p), at(q), at(r));
            else triangle(at(p), at(r), at(q));
          }
        }
        continue;
      }
      if (inward) {
        triangle(lowA, highA, highB); triangle(lowA, highB, lowB);
      } else {
        triangle(lowA, lowB, highB); triangle(lowA, highB, highA);
      }
    }
  };

  const jpull = panel.cnc?.jpull;
  const layers = (jpull?.edge ? jpullLayers({
    outline: decoration.outline, w, h, thickness,
    edge: jpull.edge, from: jpull.from, to: jpull.to, profile: jpull.profile,
  }) : null) || [{ pts: decoration.outline, z0: 0, depth: thickness }];
  const slices = layers.map((layer) => ({ ...layer, ring: ring(layer.pts) }));
  const allHoles = bores.map((bore) => {
    const centre = toMesh([Number(bore.x), Number(bore.y)]);
    const pocket = operations.filter((op) => contains(op.ring, centre))
      .sort((a, b) => b.depth - a.depth)[0];
    // A relief's depth is its deepest point, not the depth everywhere inside
    // its boundary. Sample the same triangles which form the visible face.
    // Otherwise a blind bore beneath a shallow leaf would be shortened to
    // the deepest floor's skin even though that floor is elsewhere.
    const faceTriangle = pocket?.triangles.find((surface) => triangleHeight(surface, centre, true) != null);
    const frontDepth = faceTriangle ? half - triangleHeight(faceTriangle, centre) : pocket?.depth || 0;
    const depth = bore.through ? thickness - frontDepth : Math.min(Number(bore.depth), thickness - frontDepth);
    return {
      ring: circle(...centre, Number(bore.r)),
      centre, pocket, depth, radius: Number(bore.r),
      through: Boolean(bore.through) || depth >= thickness - frontDepth - EPS,
    };
  });
  // T76 F4 · a V groove carries its floor surface as a flute does.
  complexHoles = allHoles.filter((bore) => bore.through && (
    Boolean(bore.pocket?.surface?.triangles)
    || operations.some((op) => edgesOf(bore.ring).some(([a, b]) =>
      edgesOf(op.ring).some(([c, d]) => crossingAt(a, b, c, d) != null)))
  ));
  const holes = allHoles.filter((bore) => !complexHoles.includes(bore));
  // Existing J layers start on the CNC back face. Decoration starts on the
  // opposite face. Preserve that established J section and its shadow floor.
  cap(slices.at(-1).ring, [
    ...roots.map((op) => op.ring),
    ...holes.filter((bore) => bore.through && !bore.pocket).map((bore) => bore.ring),
  ], half, +1);
  for (let i = 0; i < slices.length; i += 1) {
    const layer = slices[i];
    wall(layer.ring, -half + layer.z0, -half + layer.z0 + layer.depth, false);
    const next = slices[i + 1];
    if (!next) continue;
    // The shared perimeter is deliberately a touching hole: earcut reduces
    // it to the exposed J shoulder, leaving no internal board-sized cap.
    const removed = Math.abs(area(layer.ring)) > Math.abs(area(next.ring));
    cap(removed ? layer.ring : next.ring, [removed ? next.ring : layer.ring],
      -half + next.z0, removed ? +1 : -1);
  }
  // T82 F15, after the review: where a reed's end section crosses a slice's
  // boundary (a door with a J), the slice walls meet at the crossing, so the
  // reed's own end edge is split there too and the solid stays closed.
  const levels = [...new Set(slices.flatMap((layer) => [-half + layer.z0, -half + layer.z0 + layer.depth]))]
    .filter((z) => z > -half + EPS && z < half - EPS);
  const endKeys = levels.length && ends.length ? new Set(ends.flat().map(pointKey)) : null;
  for (const op of operations) {
    if (op.surface?.vertices && op.surface?.triangles) {
      for (const vertices of op.triangles) {
        // Reflecting the CNC x coordinate reverses every triangle's winding.
        const pieces = endKeys && op.kind === 'reed' ? splitEndEdge(vertices, levels, endKeys) : [vertices];
        for (const t of pieces) triangle(t[0], t[2], t[1]);
      }
      continue;
    }
    wall(op.ring, half - op.depth, half - (op.startDepth || 0), true);
    cap(op.ring, [
      ...op.children.map((child) => child.ring),
      ...holes.filter((bore) => bore.through && bore.pocket === op).map((bore) => bore.ring),
    ], half - op.depth, +1);
  }
  for (const bore of holes) {
    const stop = -half + bore.depth;
    wall(bore.ring, -half, stop, true);
    if (!bore.through) cap(bore.ring, [], stop, -1);
  }
  cap(slices[0].ring, holes.map((bore) => bore.ring), -half, -1);
  for (const addition of decoration.additions || []) {
    const outline = ring(addition.points);
    const rise = Number(addition.projection ?? addition.thickness);
    if (!(rise > 0)) continue;
    // Each manufacturing strip is also one closed physical strip here.
    // Its underside touches the host face; its cut-list record is not drawn
    // again as a loose scene part, and travels with this moving front.
    cap(outline, [], half, -1);
    cap(outline, [], half + rise, +1);
    wall(outline, half, half + rise, false);
  }
  // A through bore may cross several recess levels. Split each cylinder
  // facet exactly where the canonical outlines or surface triangles cross
  // it, then use the material interval on that side of the step. This cuts
  // factory drawer fixing holes as well as holes wholly inside a flute.
  const splitEdges = complexHoles.length ? [
    ...slices.flatMap((slice) => edgesOf(slice.ring)),
    ...operations.flatMap((op) => [...edgesOf(op.ring), ...op.triangles.flatMap(edgesOf)]),
    ...allHoles.flatMap((bore) => edgesOf(bore.ring)),
  ] : [];
  for (const bore of complexHoles) {
    const [cx, cy] = bore.centre; const radius = bore.radius;
    const nearbyEdges = splitEdges.filter(([a, b]) => Math.max(a[0], b[0]) >= cx - radius - EPS
      && Math.min(a[0], b[0]) <= cx + radius + EPS
      && Math.max(a[1], b[1]) >= cy - radius - EPS
      && Math.min(a[1], b[1]) <= cy + radius + EPS);
    for (const [start, end] of edgesOf(bore.ring)) {
      const params = [0, 1];
      for (const [a, b] of nearbyEdges) {
        const t = crossingAt(start, end, a, b);
        if (t != null) params.push(t);
      }
      const times = [...new Set(params.map((t) => Math.round(t * 1e10) / 1e10))].sort((a, b) => a - b);
      const at = (t) => start.map((value, axis) => value + (end[axis] - value) * t);
      for (let i = 0; i + 1 < times.length; i += 1) {
        if (times[i + 1] - times[i] <= EPS) continue;
        const a = at(times[i]); const b = at(times[i + 1]); const middle = at((times[i] + times[i + 1]) / 2);
        if (allHoles.some((other) => other !== bore && other.through && contains(other.ring, middle))) continue;
        const op = operations.filter((item) => contains(item.ring, middle)).sort((x, y) => y.depth - x.depth)[0];
        const faceTriangle = op?.triangles.find((surface) => triangleHeight(surface, middle, true) != null);
        const topAt = (point) => faceTriangle ? triangleHeight(faceTriangle, point) : half - (op?.depth || 0);
        const behind = holes.filter((other) => !other.through && contains(other.ring, middle));
        const back = behind.length ? -half + Math.max(...behind.map((other) => other.depth)) : -half;
        const intervals = [];
        for (const slice of slices) {
          if (!contains(slice.ring, middle)) continue;
          const low = Math.max(back, -half + slice.z0);
          const high = -half + slice.z0 + slice.depth;
          const highA = Math.min(high, topAt(a)); const highB = Math.min(high, topAt(b));
          if (highA <= low + EPS && highB <= low + EPS) continue;
          const previous = intervals.at(-1);
          if (previous && Math.abs(previous.highA - low) < EPS && Math.abs(previous.highB - low) < EPS) {
            previous.highA = highA; previous.highB = highB;
          } else intervals.push({ low, highA, highB });
        }
        for (const interval of intervals) {
          const lowA = [...a, interval.low]; const lowB = [...b, interval.low];
          const highA = [...a, interval.highA]; const highB = [...b, interval.highB];
          rawTriangle(lowA, highA, highB); rawTriangle(lowA, highB, lowB);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.frontDecoration = {
    style: decoration.style, jpull: slices.length > 1,
    ...(decoration.productionApproved === false ? { productionApproved: false } : {}),
  };
  return geometry;
}
