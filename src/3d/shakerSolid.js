import * as THREE from 'three';
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
export function shakerFrontGeometry(panel) {
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

  const key = `${w}|${h}|${t}|${frame}|${depth}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const built = buildTray(w, h, t, frame, depth);
  cache.set(key, built);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    cache.get(oldest)?.dispose();
    cache.delete(oldest);
  }
  return built;
}

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
function buildTray(w, h, t, frame, depth) {
  const X = mm(w) / 2;
  const Y = mm(h) / 2;
  const Z = mm(t) / 2;
  const ix = mm(w / 2 - frame);      // inner half-width of the recess
  const iy = mm(h / 2 - frame);
  const floorZ = Z - mm(depth);

  const pos = [];
  const nor = [];
  const uv = [];

  /** One quad, wound so its front face is the side the normal points at. */
  const quad = (a, b, c, d, n) => {
    for (const [p, t2] of [[a, [0, 0]], [b, [1, 0]], [c, [1, 1]], [a, [0, 0]], [c, [1, 1]], [d, [0, 1]]]) {
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
      uv.push(t2[0], t2[1]);
    }
  };

  const FRONT = [0, 0, 1];
  const BACK = [0, 0, -1];

  // ── the frame's face: four quads round the opening, all at +Z ──
  // Split as two full-width bands and two short side bands, so the mitre lines
  // a shaker actually has are where the geometry's own seams are.
  quad([-X, iy, Z], [X, iy, Z], [X, Y, Z], [-X, Y, Z], FRONT);          // top rail
  quad([-X, -Y, Z], [X, -Y, Z], [X, -iy, Z], [-X, -iy, Z], FRONT);      // bottom rail
  quad([-X, -iy, Z], [-ix, -iy, Z], [-ix, iy, Z], [-X, iy, Z], FRONT);  // left stile
  quad([ix, -iy, Z], [X, -iy, Z], [X, iy, Z], [ix, iy, Z], FRONT);      // right stile

  // ── the rebate's four walls: THE SHADOW ──
  // Each faces INWARD, towards the middle of the panel, which is what makes the
  // top wall dark when the light is high and the side walls dark when it is low.
  quad([-ix, iy, Z], [ix, iy, Z], [ix, iy, floorZ], [-ix, iy, floorZ], [0, -1, 0]);
  quad([ix, -iy, Z], [-ix, -iy, Z], [-ix, -iy, floorZ], [ix, -iy, floorZ], [0, 1, 0]);
  quad([-ix, -iy, Z], [-ix, iy, Z], [-ix, iy, floorZ], [-ix, -iy, floorZ], [1, 0, 0]);
  quad([ix, iy, Z], [ix, -iy, Z], [ix, -iy, floorZ], [ix, iy, floorZ], [-1, 0, 0]);

  // ── the panel floor ──
  quad([-ix, -iy, floorZ], [ix, -iy, floorZ], [ix, iy, floorZ], [-ix, iy, floorZ], FRONT);

  // ── the back, and the four edges ──
  quad([X, -Y, -Z], [-X, -Y, -Z], [-X, Y, -Z], [X, Y, -Z], BACK);
  quad([-X, -Y, -Z], [X, -Y, -Z], [X, -Y, Z], [-X, -Y, Z], [0, -1, 0]);
  quad([X, Y, -Z], [-X, Y, -Z], [-X, Y, Z], [X, Y, Z], [0, 1, 0]);
  quad([-X, Y, -Z], [-X, -Y, -Z], [-X, -Y, Z], [-X, Y, Z], [-1, 0, 0]);
  quad([X, -Y, -Z], [X, Y, -Z], [X, Y, Z], [X, -Y, Z], [1, 0, 0]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
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
