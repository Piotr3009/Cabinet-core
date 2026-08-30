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
//   front ring    the frame the eye reads as the shaker, at +t/2
//   rebate walls  one per recess edge, +t/2 down to +t/2 − depth — THE SHADOW
//   panel floor   at +t/2 − depth
//   back          at −t/2
//   outer sides   one per board edge
//
// T50-F6: "one per edge" and not "four". A leaf cut on the slope has five or
// six, and both rings come from the ENGINE's own outlines — a rectangle is the
// four-edge case and no branch anywhere says "rectangle".
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
  // ─── TURN 57 (CLAUDE.md F3): A BOARD WITH A J IS BUILT BY THE OTHER ONE ──
  //
  // The tray below is eleven hand-wound faces and every one of its walls runs
  // in the FACE plane, from the front of the board down to the pocket floor.
  // It has no vertex along the thickness axis at all — which is exactly what a
  // J-pull is: a section that CHANGES through the board (lip, slot, rear leg).
  // A tray cannot hold one, and pretending otherwise would draw a stripe.
  //
  // So a shaker front that carries a J falls through to `panelSolid.js`, which
  // extrudes through the thickness and can. It loses nothing: the shaker
  // pocket is a POCKET on the piece (`cnc.pockets`), and `engine/recesses.js`
  // turns it into a real recess there — the same absence, cut by the builder
  // that can also cut the edge. T46 wrote the mirror image of this note when a
  // CUT leaf fell the other way; the rule underneath both is the same one —
  // the board goes to the builder that can express its whole shape.
  if (panel?.cnc?.jpull?.edge) return null;
  // ─── TURN 50 (CLAUDE.md F6): T46'S NAMED DEBT, PAID ────────────────────────
  //
  // T46 wrote here: *"a cut leaf falls through to `3d/panelSolid.js` … What it
  // loses is the RECESS — a shaker's rebate on a five-sided leaf wants a tray
  // that can hold five edges, and that is a turn of its own."*  This is that
  // turn, and the owner named it himself: *"shaker nie powinien znikać jak
  // najedziemy na skos, powinien się renderować razem z drzwiami."*
  //
  // The tray is built out of POLYGONS now instead of rectangles, and the
  // rectangle is the four-corner case of one. Both polygons come from the
  // ENGINE — the leaf's own cut outline and the pocket's own `points`, both in
  // the sheet's frame — so the picture and the machine cannot disagree about
  // where the diagonal is, which is the whole of F6a's law.
  const s = panel?.meta?.shaker;
  const box = panel?.box;
  if (!s || !box) return null;
  const frame = Number(s.frame) || 0;
  const depth = Number(s.depth) || 0;
  const w = Number(box.w) || 0;
  const h = Number(box.h) || 0;
  const t = Number(box.d) || 0;
  if (!(frame > 0) || !(depth > 0) || !(t > depth)) return null;
  const cut = Boolean(panel?.cnc?.slopeCut);
  if (!cut && (!(w > 2 * frame) || !(h > 2 * frame))) return null;
  // The two outlines, in the MESH's own centred millimetres. `x = w/2 − CNC x`
  // is the inside mirror the bores below are translated by, and for the same
  // reason: the workshop bores a door from the back and the sheet is drawn the
  // way the door lies on the bench (`engine/joinery.js panelPlacement`).
  const toMesh = (q) => [w / 2 - q[0], q[1] - h / 2];
  const pocket = (panel?.cnc?.pockets || []).find((k) => Array.isArray(k.points) && k.points.length >= 3)
    || null;
  const outerPts = cut && Array.isArray(panel?.cnc?.outline) && panel.cnc.outline.length >= 3
    ? panel.cnc.outline.map(toMesh)
    : [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  const innerPts = pocket
    ? pocket.points.map(toMesh)
    : [
      [-(w / 2 - frame), -(h / 2 - frame)], [w / 2 - frame, -(h / 2 - frame)],
      [w / 2 - frame, h / 2 - frame], [-(w / 2 - frame), h / 2 - frame],
    ];
  if (innerPts.length < 3 || outerPts.length < 3) return null;

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
  // The two polygons are part of the KEY: two leaves of one size under two
  // different stretches of ceiling are two geometries, and sharing one would
  // put somebody else's diagonal on this door.
  const key = `${w}|${h}|${t}|${frame}|${depth}|${boreKey(cuts)}`
    + `|${polyKey(outerPts)}|${polyKey(innerPts)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const built = buildTray(w, h, t, depth, cuts, outerPts, innerPts);
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
 * ─── TURN 28 (CLAUDE.md F2a): THE CNC FRAME IS THE INSIDE MIRROR ───────────
 *
 * `engine/recesses.js` works in the part's CNC frame, and for a FRONT that
 * frame's origin is the leaf's bottom-RIGHT corner with x running LEFT
 * (`engine/joinery.js panelPlacement`): the workshop bores a door from the
 * back, and the sheet is drawn the way the door lies on the bench. This
 * translation read it as a bottom-LEFT frame — `b.x − w/2` — and so mirrored
 * every hole in the tray. The ENGINE was right (an L leaf's cup lands 21.5 mm
 * from its hinge edge in the ROOM); only the picture flipped, which is the
 * owner's photograph: hinge arms on one stile and the bored cups on the other.
 *
 * The tray is built about its own centre like every other panel mesh in the
 * app, and the mesh runs the room's way — so x = w/2 − CNC x. The `y` is
 * unchanged: `v` is [0, 1, 0] in that same placement, so CNC y and the mesh's
 * y run together. One translation, here, so nothing else has to know there are
 * two frames.
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
      x: w / 2 - Number(b.x),
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

/** A polygon, as a cache key: enough digits that two real leaves differ. */
const polyKey = (pts) => pts.map((q) => `${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(';');

/** Twice the signed area — positive when the ring is counter-clockwise. */
function area2(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a;
}

/** The same ring, counter-clockwise, so every normal below is one formula. */
const ccw = (pts) => (area2(pts) < 0 ? [...pts].reverse() : pts);

/** A closed ring as a THREE.Shape, in scene units. */
function ringShape(pts) {
  return new THREE.Shape(pts.map((q) => new THREE.Vector2(mm(q[0]), mm(q[1]))));
}

/** …and as a Path, for a hole. */
function ringPath(pts) {
  const path = new THREE.Path();
  pts.forEach((q, i) => {
    if (i === 0) path.moveTo(mm(q[0]), mm(q[1]));
    else path.lineTo(mm(q[0]), mm(q[1]));
  });
  path.closePath();
  return path;
}

/**
 * A board `w × h × t` with a `depth`-deep recess sunk into its +z face.
 *
 * ─── TURN 50 (CLAUDE.md F6): BOTH RINGS ARE POLYGONS ───────────────────────
 *
 * Turn 25 built this out of eleven hand-wound RECTANGLES, which is why a leaf
 * cut on the slope could not have one. It is the same eleven faces; the four
 * rebate walls and the four outer edges are now ONE WALL PER EDGE of whatever
 * ring it is given, and a rectangle is the four-edge case. A flat leaf comes
 * out of it corner for corner as it always did — the rectangle is passed in as
 * four points and no branch anywhere says "rectangle".
 *
 * Coordinates are the mesh's own — centred on the origin, in millimetres in,
 * scene units out.
 */
function buildTray(w, h, t, depth, cuts = [], outerPts = null, innerPts = null) {
  const Z = mm(t) / 2;
  const floorZ = Z - mm(depth);
  const outer = ccw(outerPts);
  const inner = ccw(innerPts);

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
  // The frame's face is a RING — the board's outline with the recess punched
  // out of it — and the leaf's BACK is the plane every cup is bored from, so
  // both are built as `THREE.Shape`s with the bores as extra hole paths rather
  // than as hand-wound quads. A hole in a face is what makes the bore under it
  // visible at all.
  const ring = ringShape(outer);
  ring.holes.push(ringPath(inner));
  const back = ringShape(outer);
  const panelFloor = ringShape(inner);

  // Is this bore under the FRAME or under the panel? Asked of the recess's own
  // ring rather than of two half-widths, so it is right on a cut leaf too.
  const inFrame = (c) => !pointInRing(inner, c.x, c.y, c.r);
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

  // ── the rebate's walls: THE SHADOW ──
  //
  // Each faces INWARD, towards the middle of the recess, which is what makes
  // the top wall dark when the light is high and the side walls dark when it is
  // low.
  //
  // ─── TURN 27 (CLAUDE.md F3): AND THEY WERE WOUND INSIDE OUT ─────────────
  //
  // Turn 25 declared the right INWARD normal on each of these and wound the
  // triangles the other way round. A rasteriser culls on the WINDING and not on
  // the normal, so all four walls were front-facing AWAY from the recess —
  // invisible from the room, and what showed through the gap was whatever stood
  // behind the door. A shadow needs a wall to be cast by, and there were none.
  //
  // On a counter-clockwise ring the interior is to the LEFT of each edge, so
  // the inward normal is `(−dy, dx)` normalised — one formula for four edges or
  // for six.
  for (let i = 0; i < inner.length; i += 1) {
    const a = inner[i];
    const b = inner[(i + 1) % inner.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (!(len > 1e-9)) continue;
    const n = [-dy / len, dx / len, 0];
    const A = [mm(a[0]), mm(a[1])];
    const B = [mm(b[0]), mm(b[1])];
    quad([B[0], B[1], Z], [B[0], B[1], floorZ], [A[0], A[1], floorZ], [A[0], A[1], Z], n);
  }

  // ── the outer edges ──
  // The same walk, facing the other way: on a CCW ring the OUTSIDE is to the
  // right of each edge, so the outward normal is `(dy, −dx)`.
  for (let i = 0; i < outer.length; i += 1) {
    const a = outer[i];
    const b = outer[(i + 1) % outer.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (!(len > 1e-9)) continue;
    const n = [dy / len, -dx / len, 0];
    const A = [mm(a[0]), mm(a[1])];
    const B = [mm(b[0]), mm(b[1])];
    quad([A[0], A[1], -Z], [B[0], B[1], -Z], [B[0], B[1], Z], [A[0], A[1], Z], n);
  }

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
      //
      // Turn 27 (CLAUDE.md F3): wound to match, for the same reason the rebate
      // walls above are. These carried the right normal and the wrong winding
      // too, so a ⌀35 cup in a shaker leaf was a hole you looked THROUGH rather
      // than into — the owner's own sentence about the recess, said again on a
      // smaller radius.
      quad([p0[0], p0[1], -Z], [p0[0], p0[1], stop], [p1[0], p1[1], stop], [p1[0], p1[1], -Z], n0);
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

/** Is a disc of radius `r` about (x, y) wholly inside this ring? */
function pointInRing(pts, x, y, r = 0) {
  let inside = false;
  for (let i = 0, k = pts.length - 1; i < pts.length; k = i, i += 1) {
    const a = pts[i];
    const b = pts[k];
    if ((a[1] > y) !== (b[1] > y)
      && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  if (!inside || !(r > 0)) return inside;
  // …and clear of every edge by its own radius, which is what the rectangle's
  // `|x| > ix − r` test said before the ring became a polygon.
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (!(len2 > 1e-12)) continue;
    const tt = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2));
    if (Math.hypot(x - (a[0] + dx * tt), y - (a[1] + dy * tt)) < r) return false;
  }
  return true;
}

/** How many sides a bore is drawn with — 3d/panelSolid.js uses the same. */
const HOLE_SEGMENTS = 14;

/**
 * A bore's mouth, as the SAME polygon its wall is built from.
 *
 * ─── TURN 27 (CLAUDE.md F3.1): THE RING AND THE WALL AGREE ─────────────────
 *
 * This was `absarc`, and the triangulator subdivided it by its own rule — so
 * the hole in the face was a polygon of one vertex count and the cylinder under
 * it a polygon of another. Two approximations of one circle leave hairline
 * slivers of nothing between them, which is the same thing the rebate walls
 * were doing at a larger radius: a place you can see through a solid board.
 *
 * The same `HOLE_SEGMENTS` and the same start angle as the wall, so the two
 * share their vertices exactly and the leaf closes.
 */
const circle = (cx, cy, r) => {
  const path = new THREE.Path();
  for (let i = 0; i < HOLE_SEGMENTS; i += 1) {
    const a = (i / HOLE_SEGMENTS) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
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
