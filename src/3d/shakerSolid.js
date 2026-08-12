import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mm } from './constants.js';
import { isShakerFront } from '../engine/shaker.js';

// ─── THE SHAKER, AS A SOLID (turn 25, CLAUDE.md F3) ─────────────────────────
//
// A shaker door rendered as a flat slab until this turn, and only its 25 mm
// thickness said otherwise. What sells it is not the outline of the frame — a
// line drawn on a face is a drawing of a rebate — it is the SHADOW the rebate
// throws at a grazing angle, and a shadow needs a wall to be cast by.
//
// So the door is a TRAY: an outer board with a rectangular depression sunk into
// its face. Built by hand rather than by extruding a shape with a hole and
// standing a second box in it, for one reason worth writing down — two solids
// meeting at the rebate's wall put two coplanar surfaces a hundredth of a
// millimetre apart, and that is z-fighting by construction. There is one
// surface here because there is one solid.
//
// ─── WHAT THE FACES ARE ─────────────────────────────────────────────────────
//
//   front ring    4 quads, at +t/2 — the frame the eye reads as the shaker
//   rebate walls  4 quads, from +t/2 down to +t/2 − depth — THE SHADOW
//   panel floor   1 quad, at +t/2 − depth
//   back          1 quad, at −t/2
//   outer sides   4 quads
//
// Every normal is written out explicitly, so the light falls into the recess
// instead of across it: an auto-computed normal on a shared vertex would round
// the corner of the rebate off and take the shadow with it.
//
// ─── COST ───
// Cached by CONFIGURATION — leaf size, board, frame, depth — exactly as
// `3d/panelSolid.js` caches a machined carcass board, so a kitchen of fourteen
// identical shaker doors builds one geometry and every door after the first is
// a Map lookup. Nothing in the key is a position.

const CACHE_LIMIT = 120;
const cache = new Map();

/**
 * The geometry for one shaker front, or null where this panel is not one.
 *
 * Centred on the panel's own box exactly as a `boxGeometry(w, h, d)` is, so the
 * caller places the mesh unchanged and the bevel shader — which measures a
 * fragment against the object's half-extents — keeps working with no idea
 * anything has changed.
 *
 * @param {object} panel  an engine panel record
 * @returns {THREE.BufferGeometry|null}
 */
export function shakerFrontGeometry(panel, bores = []) {
  if (!isShakerFront(panel)) return null;
  const s = panel?.meta?.shaker;
  const box = panel?.box;
  if (!s || !box) return null;
  const frame = Number(s.frame) || 0;
  const depth = Number(s.depth) || 0;
  const w = Number(box.w) || 0;
  const h = Number(box.h) || 0;
  const t = Number(box.d) || 0;
  if (!(frame > 0) || !(depth > 0) || !(w > 2 * frame) || !(h > 2 * frame) || !(t > depth)) return null;

  // ─── TURN 26 (CLAUDE.md R10 / F3.3): THE TRAY CARRIES ITS DRILLING ───────
  //
  // A shaker leaf never went through `3d/panelSolid.js` — the tray replaced the
  // machined solid outright — so its hinge cups, cup screws and handle holes
  // were the one FRONT class the scene did not show. They are cut here now,
  // from the same `engine/recesses.js` records every other board reads, so a
  // shaker door and a plain one answer the parity test identically.
  //
  // The list is part of the CACHE KEY: two doors of one size with different
  // hinge hands are two geometries, and sharing one would put a cup on the
  // wrong stile.
  const cuts = normaliseBores(bores, w, h, t);
  const key = `${w}|${h}|${t}|${frame}|${depth}|${boreKey(cuts)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const built = buildTray(w, h, t, frame, depth, cuts);
  cache.set(key, built);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    cache.get(oldest)?.dispose();
    cache.delete(oldest);
  }
  return built;
}

/**
 * The bores this leaf carries, in the MESH's own centred millimetres.
 *
 * `engine/recesses.js` works in the part's CNC frame, whose origin is the
 * bottom-left of the leaf; the tray is built about its own centre like every
 * other panel mesh in the app. One translation, here, so nothing else has to
 * know there are two frames.
 */
function normaliseBores(bores, w, h, t) {
  const out = [];
  for (const b of bores || []) {
    if (b?.kind !== 'round') continue;
    const r = Number(b.r);
    if (!(r > 0)) continue;
    const deep = b.through ? t : Math.min(Number(b.depth) || 0, t);
    if (!(deep > 0)) continue;
    out.push({
      x: Number(b.x) - w / 2,
      y: Number(b.y) - h / 2,
      r,
      depth: deep,
      through: Boolean(b.through) || deep >= t - 1e-6,
    });
  }
  return out;
}

const boreKey = (cuts) => cuts
  .map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)},${c.r},${c.depth},${c.through ? 1 : 0}`)
  .join(';');

/** Drop everything — for tests, and for a profile change that moves the frame. */
export function clearShakerCache() {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}

/**
 * A board `w × h × t` with a `depth`-deep rectangular recess in its +z face,
 * leaving `frame` standing on all four sides.
 *
 * Coordinates are the mesh's own — centred on the origin, in scene units.
 */
function buildTray(w, h, t, frame, depth, cuts = []) {
  const X = mm(w) / 2;
  const Y = mm(h) / 2;
  const Z = mm(t) / 2;
  const ix = mm(w / 2 - frame);      // inner half-width of the recess
  const iy = mm(h / 2 - frame);
  const floorZ = Z - mm(depth);

  const pos = [];
  const nor = [];

  /** One quad, wound so its front face is the side the normal points at. */
  const quad = (a, b, c, d, n) => {
    for (const p of [a, b, c, a, c, d]) {
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
    }
  };

  const FRONT = [0, 0, 1];
  const BACK = [0, 0, -1];

  // ── the two faces that carry holes, as triangulated shapes ──
  //
  // The frame's face is a ring — an outer rectangle with the recess punched out
  // of it — and the leaf's BACK is the plane every cup is bored from, so both
  // are built as `THREE.Shape`s with the bores as extra hole paths rather than
  // as the four hand-wound quads turn 25 used. A hole in a face is what makes
  // the bore under it visible at all.
  const ring = new THREE.Shape([
    new THREE.Vector2(-X, -Y), new THREE.Vector2(X, -Y),
    new THREE.Vector2(X, Y), new THREE.Vector2(-X, Y),
  ]);
  ring.holes.push(rect(-ix, -iy, ix, iy));
  const back = new THREE.Shape([
    new THREE.Vector2(-X, -Y), new THREE.Vector2(X, -Y),
    new THREE.Vector2(X, Y), new THREE.Vector2(-X, Y),
  ]);
  const panelFloor = new THREE.Shape([
    new THREE.Vector2(-ix, -iy), new THREE.Vector2(ix, -iy),
    new THREE.Vector2(ix, iy), new THREE.Vector2(-ix, iy),
  ]);

  const inFrame = (c) => Math.abs(mm(c.x)) > ix - mm(c.r) || Math.abs(mm(c.y)) > iy - mm(c.r);
  for (const c of cuts) {
    // Every bore opens on the BACK, because that is the face the bit enters.
    back.holes.push(circle(mm(c.x), mm(c.y), mm(c.r)));
    // A THROUGH bore also opens on whichever face is on the other side — the
    // frame's if it is under the frame, the panel's floor if it is not.
    if (!c.through) continue;
    (inFrame(c) ? ring : panelFloor).holes.push(circle(mm(c.x), mm(c.y), mm(c.r)));
  }

  const parts = [];
  parts.push(face(ring, Z, FRONT));
  parts.push(face(panelFloor, floorZ, FRONT));
  parts.push(face(back, -Z, BACK));

  // ── the rebate's four walls: THE SHADOW ──
  // Each faces INWARD, towards the middle of the panel, which is what makes the
  // top wall dark when the light is high and the side walls dark when it is low.
  quad([-ix, iy, Z], [ix, iy, Z], [ix, iy, floorZ], [-ix, iy, floorZ], [0, -1, 0]);
  quad([ix, -iy, Z], [-ix, -iy, Z], [-ix, -iy, floorZ], [ix, -iy, floorZ], [0, 1, 0]);
  quad([-ix, -iy, Z], [-ix, iy, Z], [-ix, iy, floorZ], [-ix, -iy, floorZ], [1, 0, 0]);
  quad([ix, iy, Z], [ix, -iy, Z], [ix, -iy, floorZ], [ix, iy, floorZ], [-1, 0, 0]);

  // ── the four outer edges ──
  quad([-X, -Y, -Z], [X, -Y, -Z], [X, -Y, Z], [-X, -Y, Z], [0, -1, 0]);
  quad([X, Y, -Z], [-X, Y, -Z], [-X, Y, Z], [X, Y, Z], [0, 1, 0]);
  quad([-X, Y, -Z], [-X, -Y, -Z], [-X, -Y, Z], [-X, Y, Z], [-1, 0, 0]);
  quad([X, -Y, -Z], [X, Y, -Z], [X, Y, Z], [X, -Y, Z], [1, 0, 0]);

  // ── and the wall and floor of every bore ──
  // Drilled from the BACK (−Z) towards the face, so a bore `depth` deep has its
  // floor at −Z + depth. Its wall faces the axis; its floor faces the bit.
  for (const c of cuts) {
    const cx = mm(c.x);
    const cy = mm(c.y);
    const r = mm(c.r);
    const stop = c.through ? Z : -Z + mm(c.depth);
    for (let i = 0; i < HOLE_SEGMENTS; i += 1) {
      const a0 = (i / HOLE_SEGMENTS) * Math.PI * 2;
      const a1 = ((i + 1) / HOLE_SEGMENTS) * Math.PI * 2;
      const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
      const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
      // Facing the bore's own axis, so the light falls INTO it.
      const n0 = [-Math.cos((a0 + a1) / 2), -Math.sin((a0 + a1) / 2), 0];
      quad([p0[0], p0[1], -Z], [p1[0], p1[1], -Z], [p1[0], p1[1], stop], [p0[0], p0[1], stop], n0);
      if (c.through) continue;
      pos.push(cx, cy, stop, p1[0], p1[1], stop, p0[0], p0[1], stop);
      for (let k = 0; k < 3; k += 1) nor.push(0, 0, -1);
    }
  }

  if (pos.length) {
    const loose = new THREE.BufferGeometry();
    loose.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    loose.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    loose.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    parts.push(loose);
  }

  const geo = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) for (const g of parts) g.dispose();
  // ─── TURN 26 (CLAUDE.md F6): ONE SKIN OVER THE WHOLE LEAF ────────────────
  //
  // Owner: "the recess reads as a different colour, and it looks bad." It did,
  // and the cause was the UVs: turn 25 gave every quad its own 0..1, so the
  // frame wore the whole decor image FOUR times and the panel floor wore a
  // fifth copy squashed into the recess. Same material, same colour, different
  // pixels — which is exactly what "a different colour" looks like.
  //
  // The mapping is the one a plain `boxGeometry` front face carries: u across
  // the leaf, v up it, over the WHOLE board. So the figure runs unbroken from
  // the frame, down the rebate wall and across the panel — and the only
  // difference the eye is left with is the SHADOW, which is the point of the
  // rebate.
  boxUVs(geo, mm(w), mm(h));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/** How many sides a bore is drawn with — 3d/panelSolid.js uses the same. */
const HOLE_SEGMENTS = 14;

const rect = (x0, y0, x1, y1) => {
  const path = new THREE.Path();
  path.moveTo(x0, y0);
  path.lineTo(x0, y1);
  path.lineTo(x1, y1);
  path.lineTo(x1, y0);
  path.closePath();
  return path;
};

const circle = (cx, cy, r) => {
  const path = new THREE.Path();
  path.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return path;
};

/**
 * One flat face at `z`, facing `n`.
 *
 * `ShapeGeometry` triangulates in the z = 0 plane facing +Z; a face that looks
 * the other way is the same triangles wound backwards, which is one pass over
 * the index rather than a second hand-built polygon.
 */
function face(shape, z, n) {
  const geo = new THREE.ShapeGeometry(shape, 1).toNonIndexed();
  const position = geo.attributes.position;
  for (let i = 0; i < position.count; i += 1) position.setZ(i, z);
  if (n[2] < 0) reverse(geo);
  const normal = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    normal[i * 3] = n[0];
    normal[i * 3 + 1] = n[1];
    normal[i * 3 + 2] = n[2];
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  return geo;
}

/** Flip every triangle of a non-indexed geometry front-to-back. */
function reverse(geometry) {
  for (const attribute of Object.values(geometry.attributes)) {
    const { array, itemSize } = attribute;
    for (let i = 0; i < attribute.count; i += 3) {
      for (let k = 0; k < itemSize; k += 1) {
        const b = (i + 1) * itemSize + k;
        const c = (i + 2) * itemSize + k;
        const tmp = array[b]; array[b] = array[c]; array[c] = tmp;
      }
    }
    attribute.needsUpdate = true;
  }
}

/** The UVs a plain box of this size carries on its front face (F6). */
function boxUVs(geometry, width, height) {
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!position || !uv) return;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, position.getX(i) / width + 0.5, position.getY(i) / height + 0.5);
  }
  uv.needsUpdate = true;
}

/**
 * The face plane a shaker's PANEL sits on, in the panel's own frame, as a
 * fraction of the board — what a caller needs to know to stand anything on it.
 *
 * Exported so nothing has to re-derive `t − depth` from two profile numbers.
 */
export function shakerPanelZ(panel) {
  const s = panel?.meta?.shaker;
  const t = Number(panel?.box?.d) || 0;
  if (!s || !(t > 0)) return null;
  return t - (Number(s.depth) || 0);
}
