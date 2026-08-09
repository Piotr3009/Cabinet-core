import * as THREE from 'three';
import { mm } from './constants.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cncRect, notchedOutline, socketNotches, tabOutlines } from '../engine/socketFace.js';
import { panelPlacement } from '../engine/joinery.js';

// ─── The board with the joint cut into it (turn 11, CLAUDE.md F6) ───────────
//
// Turn 8 drew the joint as LINES lying on the face of a box. Piotr's verdict:
// stop drawing CNC layers, show the joint. So the box goes: a panel that carries
// sockets is extruded from its own machined outline instead, and the socket is a
// real absence in the solid — you can see through it, the light falls into it,
// and the fillet the cutter leaves is on the corner.
//
// Everything about the SHAPE is engine/socketFace.js, which is pure and tested.
// This file does the two things that need three.js: it extrudes the polygon, and
// it puts the result where the box would have been.
//
// ─── COST ───
// CLAUDE.md F6.2 is explicit that the working view must not pay per frame. It
// does not pay per FRAME or even per panel: a geometry is built once per panel
// CONFIGURATION — the part, its rectangle, its notches and the cutter — and
// cached under that key, so a kitchen of fourteen identical 600 mm base units
// builds two side solids in total and every carcass after the first is a cache
// hit. Dragging a unit across the room rebuilds nothing at all: nothing in the
// key is a position.

/** How many distinct panel configurations to keep. */
const CACHE_LIMIT = 240;
const cache = new Map();

/**
 * The machined solid for one panel, or null when the panel is a plain box.
 *
 * Returned geometry is centred on the panel's own box, exactly as a
 * `boxGeometry(w, h, d)` is, so the caller places the mesh unchanged and the
 * bevel shader — which measures a fragment against the object's half-extents —
 * keeps working with no idea anything has changed.
 *
 * @param {object} panel   an engine panel record
 * @param {object} layers  joineryLayers(profile)
 * @param {object} profile
 * @returns {THREE.BufferGeometry|null}
 */
export function machinedPanelGeometry(panel, layers, profile) {
  const placement = panelPlacement(panel);
  if (!placement || !panel?.box) return null;
  const notches = socketNotches(panel, layers);
  // ─── Turn 12 (CLAUDE.md F6.2): the OTHER half of the joint ───
  // A socket is a POCKET and a TAB is part of the OUTLINE, and turn 11 only
  // read the pockets — so a side panel came out a rectangle and its three tabs
  // went with it. `tabOutlines` reads the outline the LISP actually draws.
  const tabs = tabOutlines(panel);
  if (!notches.length && !tabs.length) return null;

  const { w, h } = cncRect(panel);
  const thickness = thicknessOf(panel, placement);
  if (!(w > 0) || !(h > 0) || !(thickness > 0)) return null;
  const radius = Math.max(0, (Number(profile?.cnc?.toolDiameter) || 0) / 2);

  const key = [
    panel.part,
    w, h, thickness, radius,
    ...notches.map((n) => `${n.edge}:${n.from}:${n.to}:${n.depth}`),
    // The tabs are part of the SHAPE, so two panels that differ only in their
    // tabs must not share a cached solid.
    ...tabs.map((t) => t.map(([x, y]) => `${x},${y}`).join(';')),
  ].join('|');

  const hit = cache.get(key);
  if (hit) {
    // Touch it: a Map keeps insertion order, so re-inserting is what makes the
    // eviction below least-recently-USED rather than oldest-built.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const geometry = build({
    w, h, thickness, radius, notches, tabs, placement, box: panel.box,
  });
  cache.set(key, geometry);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    cache.get(oldest)?.dispose();
    cache.delete(oldest);
  }
  return geometry;
}

/**
 * How thick the board is along its own normal.
 *
 * Read off the BOX rather than `panel.thickness`, because the box is what the
 * mesh occupies and the two must agree to the millimetre or the solid stands
 * proud of where the panel was.
 */
function thicknessOf(panel, placement) {
  const n = placement.n;
  const box = panel.box;
  if (Math.abs(n[0]) > 0.5) return box.w;
  if (Math.abs(n[1]) > 0.5) return box.h;
  return box.d;
}

function build({
  w, h, thickness, radius, notches, tabs = [], placement, box,
}) {
  const extrude = (points) => new THREE.ExtrudeGeometry(
    new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(mm(x), mm(y)))),
    {
      depth: mm(thickness),
      bevelEnabled: false,
      // The outline already carries its fillets as real points; asking the
      // extruder to re-approximate curves would only add triangles.
      curveSegments: 1,
    },
  );

  const outline = notchedOutline({
    w, h, notches, radius,
  });
  // The board, and then each tab standing off its edge. They are separate
  // extrusions merged into one buffer rather than one polygon, because a tab
  // that shares an edge with the board is a self-touching outline and the
  // triangulator is entitled to refuse it. Merged, it is still ONE draw call
  // and still one cached geometry per panel configuration.
  const parts = [extrude(outline), ...tabs.map((t) => extrude(t))];
  const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) for (const g of parts) g.dispose();

  // ExtrudeGeometry works in the z = 0 plane and extrudes towards +z. The panel
  // lives on a face of its box, so the basis is the placement's own: u and v are
  // the CNC axes, and the extrusion runs INTO the board — the opposite of the
  // outward normal.
  const u = new THREE.Vector3(...placement.u);
  const v = new THREE.Vector3(...placement.v);
  const into = new THREE.Vector3(...placement.n).negate();
  const centre = new THREE.Vector3(
    mm(box.x + box.w / 2), mm(box.y + box.h / 2), mm(box.z + box.d / 2),
  );
  const origin = new THREE.Vector3(...placement.origin.map(mm)).sub(centre);

  geometry.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, into).setPosition(origin));
  // ─── Turn 13 (CLAUDE.md F1): THE TOP FACES THAT WENT MISSING ───
  //
  // Owner's screenshot: looking down into a run of wall units, the tops are
  // half there and the whole thing shimmers. It is ONE line — the basis above —
  // and one panel class.
  //
  // A placement is an orthonormal triple, but nothing ever said WHICH WAY ROUND.
  // Four of the five are right-handed against the extrusion direction
  // (u × v = −n, so (u, v, into) has determinant +1); `panelPlacement`'s BACK
  // case even says so in as many words. TOP is the exception: its u × v is +n,
  // so (u, v, into) is LEFT-handed and `makeBasis` is a REFLECTION. A reflection
  // maps the extruder's counter-clockwise triangles to clockwise ones, so every
  // triangle of a TOP came out wound backwards: the outward faces were
  // back-face culled (missing from above) and the shadow pass drew the board's
  // far side into its own shadow map (the shimmer).
  //
  // It did not show before turn 12 for the same reason the rotated BACK did not:
  // a panel with no tabs was a plain box, and a box has no winding to get wrong.
  //
  // The positions are right either way — only the ORDER is wrong — so the fix
  // is to put the order back, and to do it from the determinant rather than
  // from a list of parts, so the sixth placement someone adds in turn 15 is
  // covered on the day it lands.
  if (u.clone().cross(v).dot(into) < 0) reverseWinding(geometry);
  geometry.computeVertexNormals();
  // The grain is a CABINET-SPACE rule and must not follow the nesting (F1).
  applyBoxUVs(geometry, box);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Flip every triangle of a non-indexed geometry front-to-back.
 *
 * ExtrudeGeometry emits no index, and `mergeGeometries` of non-indexed inputs
 * emits none either, so a triangle is three consecutive vertices of every
 * attribute and swapping the last two is the whole operation. Indexed geometry
 * is handled too, because a caller should not have to know which it got.
 */
function reverseWinding(geometry) {
  const index = geometry.getIndex();
  if (index) {
    const a = index.array;
    for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
    index.needsUpdate = true;
    return;
  }
  for (const attribute of Object.values(geometry.attributes)) {
    const { array, itemSize } = attribute;
    for (let i = 0; i < attribute.count; i += 3) {
      for (let k = 0; k < itemSize; k += 1) {
        const b = (i + 1) * itemSize + k;
        const c = (i + 2) * itemSize + k;
        const t = array[b]; array[b] = array[c]; array[c] = t;
      }
    }
    attribute.needsUpdate = true;
  }
}

/**
 * The UVs a plain BOX of this size would have carried — the third symptom of
 * F1, and the same root.
 *
 * ExtrudeGeometry's own UV generator works in the SHAPE's plane, so a machined
 * panel's texture axes became the CNC axes. For most parts that is harmless
 * because the two agree; for a part that is NESTED TURNED it is not, and the
 * owner saw it immediately: a TOP is drawn with its CNC x along the cabinet's
 * DEPTH (joinery.js, and that is machining truth), so from turn 12 every top
 * and bottom in the app had its figure running front-to-back.
 *
 * THE RULE: the visual grain axis is a CABINET-SPACE rule and owes nothing to
 * how the part is nested. So the UVs are re-derived here from the panel's place
 * in the CABINET — the biggest face of its box, projected exactly the way
 * three.js gives a box its axes (`decorMapping` in engine/decors.js names the
 * convention: ±X → u along Z, v along Y; ±Y → u along X, v along Z; ±Z → u
 * along X, v along Y) and normalised 0..1 over the box, which is the range
 * `decorPlacement`'s repeats are written against.
 *
 * Then a horizontal panel grains left→right and a vertical one up its height,
 * whichever way the sheet nester turned it — and `decorMapping.rotate`, which
 * has always assumed the box's axes, is telling the truth again.
 */
function applyBoxUVs(geometry, box) {
  const w = mm(Math.abs(box.w)) || 1;
  const h = mm(Math.abs(box.h)) || 1;
  const d = mm(Math.abs(box.d)) || 1;
  // Which pair of axes: the biggest face wins, as it does in decorMapping. The
  // two edges are 18 mm of board and nobody reads the grain on them.
  const areas = [h * d, w * d, w * h];
  const face = areas.indexOf(Math.max(...areas));
  // [ along-U axis, its extent, along-V axis, its extent ]
  const map = [
    ['z', d, 'y', h],
    ['x', w, 'z', d],
    ['x', w, 'y', h],
  ][face];
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!position || !uv) return;
  const read = { x: (i) => position.getX(i), y: (i) => position.getY(i), z: (i) => position.getZ(i) };
  for (let i = 0; i < uv.count; i += 1) {
    // The solid is centred on its box, so half an extent turns a coordinate
    // into a fraction of the board.
    uv.setXY(
      i,
      read[map[0]](i) / map[1] + 0.5,
      read[map[2]](i) / map[3] + 0.5,
    );
  }
  uv.needsUpdate = true;
}

/** For tests and teardown: drop every cached solid. */
export function clearPanelSolidCache() {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}

/** How many distinct configurations are being held (the cost check). */
export function panelSolidCacheSize() {
  return cache.size;
}
