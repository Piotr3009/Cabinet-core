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
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
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
