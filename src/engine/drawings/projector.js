/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F1 · THE PROJECTOR: THE DRAWINGS ARE THE MODEL
//
// The owner, 22.10.2026 (22:57): *"zalezy mi zebys rysowal w pdf 1 do 1 co
// mamy na cabinet core"*, and at 20:50: *"drawings nie odzwierciedlaja
// dokladnie tego co jest naprawde narysowane"*. CLAUDE.md T81's law: a sheet
// is an orthographic projection of the SAME boards and the SAME hardware
// instances the room draws, through ONE projector, with visibility decided by
// depth. Where the room and a sheet disagree, the sheet is wrong.
//
// So this module draws nothing of its own. It reads what the room reads:
//
//   . the boards: `result.panels`, as 3d/UnitView.jsx maps them (a box, no
//     decoration child, no leaf ridden inside its carrier), each seated by
//     `engine/joinery.js panelPlacement` and cut to the nominal outline
//     `3d/panelSolid.js panelSolids` extrudes (the slope, the notch, the bite,
//     and the through openings of an in-frame frame); a board with no seat is
//     its box, as the room draws it;
//   . the hardware: `engine/hardware3d.js hardwareInstances` (hinges and
//     plates, runners, rods, legs, rails, shelf supports, kit bodies), drawn as
//     the silhouette traced from the room's own GLB where the file was read
//     (`./silhouettes.js`, PART D) and as today's symbol where it was not;
//   . the handles: `result.drillSummary.handles`, mirrored out of the front's
//     cut frame exactly as 3d/Hardware.jsx FrontHandle does;
//   . the run parts the engine cuts on a member (the plinth, the in-frame
//     frame, the end panels), the worktops of `engine/worktop.js worktopsFor`
//     and the cornice of `engine/cornice.js corniceSolids`.
//
// Every one of them becomes planar faces in the RUN's frame (x along the wall
// from its start, y up from the floor, z from the wall into the room), and a
// line is drawn where an edge of a face that looks at the viewer is not
// behind another face. That is hidden-line removal done exactly, by geometry,
// so a test can read "no carcass line inside a front" off the entity list and
// a renderer that groups by layer (F8) cannot undo it. The painter's white
// fills (MASK) ride along for the PDF and the SVG, as CLAUDE.md F1 (c) asks.
//
// Four views (`front`, `plan`, `section`, `perspective`), three modes
// (`fronts`, `no-fronts`, `xray`). A cut view keeps what lies beyond its
// plane and draws the faces the plane meets with the CUT pen.
//
// Pure functions: no React, no three.js, no store.

import { panelPlacement } from '../joinery.js';
import { sceneBoard } from '../siteTrim.js';
import { hardwareInstances } from '../hardware3d.js';
import { cncRect } from '../socketFace.js';
import { slopeCutActive, trimOutlineOnSlope } from '../puzzle.js';
import { cutNotchCorner } from '../notch.js';
import { cutEdgeBite } from '../extension.js';
import { panelRecesses } from '../recesses.js';
import { wallGapOf } from '../runs.js';
import { runnerAskFor } from '../runners.js';
import { corniceSolids } from '../cornice.js';
import { resolveHandle } from '../handles.js';
import { getUnitType } from '../types.js';
import { doorSwing, elevationOutline, frontDetail, panelStyle } from './frontElevation.js';
import { frontDecorationElevation } from './frontDecorationDrawing.js';
import { silhouetteMark } from './silhouettes.js';
import { drawingLayer } from './layers.js';
// T82 F7 · the HAWA door: a front of the sheets, its hinge bars and its symbols, from the room's one pose module.
import { isPocketDoor, pocketDoorBarMarks, pocketDoorGeometry, pocketHardwareBoxes } from '../pocketDoorPose.js';

// ═══ THE NUMBERS OF THE KERNEL ═════════════════════════════════════════════

/** Two depths closer than this are one plane (the engine rounds to 1e-4). */
const EPS_D = 0.05;
/** A point this close to a boundary is ON it (drawing mm, or picture units). */
const EPS_P = 0.02;
/** A parameter step this small is no segment at all. */
const EPS_T = 1e-7;

// ═══ WHAT A UNIT IS BUILT AROUND (moved here from setElevation.js) ═════════

/** What a unit is built around, by TYPE. Nothing here is guessed off a size. */
const APPLIANCE_OF = {
  DW_PANEL: 'D/W',
  FRIDGE: 'FRIDGE',
  FRIDGE_US: 'FRIDGE',
  SINK: 'SINK',
  OVEN_BASE: 'OVEN',
  WUD_HOOD: 'HOOD',
};

export function applianceLabel(unit) {
  return APPLIANCE_OF[unit?.type] || null;
}

// ═══ SMALL VECTOR AND POLYGON HELPERS ══════════════════════════════════════

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Twice the signed area of a ring (counter-clockwise positive). */
function area2(ring) {
  let s = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s;
}

/** A ring with no repeated points and no closing duplicate. */
function cleanRing(ring) {
  const out = [];
  for (const p of ring || []) {
    const q = [Number(p[0]), Number(p[1])];
    if (!Number.isFinite(q[0]) || !Number.isFinite(q[1])) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - q[0]) < 1e-9 && Math.abs(last[1] - q[1]) < 1e-9) continue;
    out.push(q);
  }
  while (out.length > 1 && Math.abs(out[0][0] - out[out.length - 1][0]) < 1e-9
    && Math.abs(out[0][1] - out[out.length - 1][1]) < 1e-9) out.pop();
  return out;
}

/** Oriented: an outer ring counter-clockwise, a hole clockwise. */
function orient(ring, ccw) {
  const r = cleanRing(ring);
  if (r.length < 3) return r;
  const isCcw = area2(r) > 0;
  return isCcw === ccw ? r : [...r].reverse();
}

/** Sutherland-Hodgman: the part of a ring where `coord(axis) * sign >= c * sign`. */
function clipRing(ring, axis, c, sign) {
  const out = [];
  const inside = (p) => (p[axis] - c) * sign >= -1e-9;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const ia = inside(a);
    const ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const t = (c - a[axis]) / (b[axis] - a[axis]);
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      p[axis] = c;
      out.push(p);
    }
  }
  return cleanRing(out);
}

/** Where the line `coord(axis) = c` crosses a region (outer + holes): the other coordinate's intervals. */
function lineIntervals(outline, holes, axis, c) {
  const other = 1 - axis;
  const xs = [];
  for (const ring of [outline, ...holes]) {
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const lo = Math.min(a[axis], b[axis]);
      const hi = Math.max(a[axis], b[axis]);
      // Half-open, so a vertex on the line is counted once.
      if (!(c >= lo && c < hi) || hi - lo < 1e-12) continue;
      const t = (c - a[axis]) / (b[axis] - a[axis]);
      xs.push(a[other] + (b[other] - a[other]) * t);
    }
  }
  xs.sort((p, q) => p - q);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 1e-6) out.push([xs[i], xs[i + 1]]);
  return out;
}

/** Point in a region (outer ring with holes), even-odd; `edge` reports a point on a boundary. */
function inRegion(pt, rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const a = ring[i];
      const b = ring[j];
      // On this boundary segment?
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy;
      if (len2 > 0) {
        const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / len2));
        const px = a[0] + dx * t - pt[0];
        const py = a[1] + dy * t - pt[1];
        if (px * px + py * py <= EPS_P * EPS_P) return 'edge';
      }
      if ((a[1] > pt[1]) !== (b[1] > pt[1])) {
        const x = a[0] + ((pt[1] - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
        if (pt[0] < x) inside = !inside;
      }
    }
  }
  return inside ? 'in' : 'out';
}

/** Where segment p0-p1 crosses segment a-b, as p's parameters (0..1), endpoints and overlaps included. */
function crossings(p0, p1, a, b, into) {
  const rx = p1[0] - p0[0]; const ry = p1[1] - p0[1];
  const sx = b[0] - a[0]; const sy = b[1] - a[1];
  const den = rx * sy - ry * sx;
  const qpx = a[0] - p0[0]; const qpy = a[1] - p0[1];
  const rr = rx * rx + ry * ry;
  if (!(rr > 0)) return;
  if (Math.abs(den) < 1e-12 * Math.sqrt(rr * (sx * sx + sy * sy) || 1)) {
    // Parallel: on the same line, the overlap's two ends are breakpoints.
    const off = Math.abs(qpx * ry - qpy * rx) / Math.sqrt(rr);
    if (off > EPS_P) return;
    into.push((qpx * rx + qpy * ry) / rr);
    into.push(((b[0] - p0[0]) * rx + (b[1] - p0[1]) * ry) / rr);
    return;
  }
  const t = (qpx * sy - qpy * sx) / den;
  const u = (qpx * ry - qpy * rx) / den;
  const slack = EPS_P / Math.sqrt(sx * sx + sy * sy || 1);
  if (u >= -slack && u <= 1 + slack) into.push(t);
}

// ═══ PRISMS: EVERY SOLID IS AN AXIS-ALIGNED EXTRUSION ══════════════════════
//
// A board is an outline extruded through its thickness along one axis; a box
// is a rectangle extruded. The outline lives in the plane of the other two
// axes, in this fixed order:

/** axis -> its plane's two axes: x -> (z, y), y -> (x, z), z -> (x, y). */
const PLANE = Object.freeze({ 0: [2, 1], 1: [0, 2], 2: [0, 1] });

/** A 3-D point from an axis value and a plane point. */
function lift(axis, t, q) {
  const p = [0, 0, 0];
  p[axis] = t;
  p[PLANE[axis][0]] = q[0];
  p[PLANE[axis][1]] = q[1];
  return p;
}

/** The prism of an axis-aligned box `{x0,x1,y0,y1,z0,z1}`, extruded along z. */
function boxPrism(b) {
  return {
    axis: 2,
    lo: Math.min(b.z0, b.z1),
    hi: Math.max(b.z0, b.z1),
    outline: orient([[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]], true),
    holes: [],
  };
}

/** A cylinder along an axis, as a 16-gon prism (a cup, a stem, a rail, a pin). */
function cylinderPrism(axis, centre, r, lo, hi, sides = 16) {
  const [a, b] = PLANE[axis];
  const ring = [];
  for (let i = 0; i < sides; i += 1) {
    const t = (i / sides) * Math.PI * 2;
    ring.push([centre[a] + r * Math.cos(t), centre[b] + r * Math.sin(t)]);
  }
  // `smooth`: the facets are a curved face, so only its silhouette is an edge.
  return { axis, lo: Math.min(lo, hi), hi: Math.max(lo, hi), outline: orient(ring, true), holes: [], smooth: true };
}

/** Move a prism by a run-frame offset. */
function movePrism(pr, off) {
  const [a, b] = PLANE[pr.axis];
  const mv = (q) => [q[0] + off[a], q[1] + off[b]];
  return {
    ...pr,
    lo: pr.lo + off[pr.axis],
    hi: pr.hi + off[pr.axis],
    outline: pr.outline.map(mv),
    holes: pr.holes.map((h) => h.map(mv)),
  };
}

/** A flat sheet entity (rect, line, poly) moved by dx, dy in its own plane. */
function shiftEntity(e, dx, dy) {
  if (e.kind === 'rect') return { ...e, x: e.x + dx, y: e.y + dy };
  if (e.kind === 'line') return { ...e, x1: e.x1 + dx, y1: e.y1 + dy, x2: e.x2 + dx, y2: e.y2 + dy };
  if (e.kind === 'poly') return { ...e, pts: e.pts.map(([x, y]) => [x + dx, y + dy]) };
  return null;
}

/** The 3-D bounds of a prism. */
function prismBounds(pr) {
  const [a, b] = PLANE[pr.axis];
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const q of pr.outline) {
    lo[a] = Math.min(lo[a], q[0]); hi[a] = Math.max(hi[a], q[0]);
    lo[b] = Math.min(lo[b], q[1]); hi[b] = Math.max(hi[b], q[1]);
  }
  lo[pr.axis] = pr.lo; hi[pr.axis] = pr.hi;
  return { lo, hi };
}

/** Clip a prism to the half-space `coord(k) * sign >= c * sign`. Returns { prism, cuts } or null. */
function clipPrism(pr, k, c, sign) {
  if (pr.axis === k) {
    const keepLo = sign > 0 ? Math.max(pr.lo, c) : pr.lo;
    const keepHi = sign > 0 ? pr.hi : Math.min(pr.hi, c);
    if (keepHi - keepLo <= 1e-9) return null;
    const cutAt = (sign > 0 ? pr.lo < c - 1e-9 : pr.hi > c + 1e-9);
    return { prism: { ...pr, lo: keepLo, hi: keepHi, cutCap: cutAt ? (sign > 0 ? 'lo' : 'hi') : null }, cuts: [] };
  }
  const j = PLANE[pr.axis].indexOf(k);
  const outline = clipRing(pr.outline, j, c, sign);
  if (outline.length < 3 || Math.abs(area2(outline)) < 1e-6) return null;
  const crossed = pr.outline.some((q) => (q[j] - c) * sign < -1e-9);
  const holes = pr.holes.map((h) => clipRing(h, j, c, sign)).filter((h) => h.length >= 3 && Math.abs(area2(h)) > 1e-6);
  // The faces the plane meets: where the line crosses the ORIGINAL region.
  const cuts = crossed ? lineIntervals(pr.outline, pr.holes, j, c) : [];
  return { prism: { ...pr, outline: orient(outline, true), holes: holes.map((h) => orient(h, false)), onCut: crossed ? { j, c } : null }, cuts };
}

// ═══ FACES AND EDGES OF A PRISM ════════════════════════════════════════════

/**
 * The planar faces of a prism, each { pts (3-D ring), holes, n (outward), id },
 * and its edges, each { a, b (3-D), faces: [face ids] }. A lateral face lying
 * on a cut line is left out: the cut face built from the intervals replaces it.
 */
function prismTopology(pr, key) {
  const faces = [];
  const edges = [];
  const axis = pr.axis;
  const nAxis = [0, 0, 0];
  nAxis[axis] = 1;
  const rings = [{ ring: pr.outline, hole: false }, ...pr.holes.map((h) => ({ ring: h, hole: true }))];
  const capIds = [`${key}#lo`, `${key}#hi`];
  const onCutEdge = (a, b) => pr.onCut
    && Math.abs(a[pr.onCut.j] - pr.onCut.c) < 1e-6 && Math.abs(b[pr.onCut.j] - pr.onCut.c) < 1e-6;
  // The two caps.
  faces.push({
    id: capIds[0], pts: pr.outline.map((q) => lift(axis, pr.lo, q)), holes: pr.holes.map((h) => h.map((q) => lift(axis, pr.lo, q))),
    n: [-nAxis[0], -nAxis[1], -nAxis[2]], cut: pr.cutCap === 'lo',
  });
  faces.push({
    id: capIds[1], pts: pr.outline.map((q) => lift(axis, pr.hi, q)), holes: pr.holes.map((h) => h.map((q) => lift(axis, pr.hi, q))),
    n: nAxis, cut: pr.cutCap === 'hi',
  });
  const [pa, pb] = PLANE[axis];
  rings.forEach(({ ring }, ri) => {
    const lat = [];
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const d0 = b[0] - a[0];
      const d1 = b[1] - a[1];
      const len = Math.hypot(d0, d1);
      if (len < 1e-9) { lat.push(null); continue; }
      // Outer rings run counter-clockwise and holes clockwise, so (d1, -d0)
      // points out of the material on both.
      const n = [0, 0, 0];
      n[pa] = d1 / len;
      n[pb] = -d0 / len;
      if (onCutEdge(a, b)) { lat.push(null); continue; }
      const id = `${key}#r${ri}e${i}`;
      faces.push({
        id,
        pts: [lift(axis, pr.lo, a), lift(axis, pr.lo, b), lift(axis, pr.hi, b), lift(axis, pr.hi, a)],
        holes: [],
        n,
      });
      lat.push({ id, n });
      edges.push({ a: lift(axis, pr.lo, a), b: lift(axis, pr.lo, b), faces: [capIds[0], id] });
      edges.push({ a: lift(axis, pr.hi, a), b: lift(axis, pr.hi, b), faces: [capIds[1], id] });
    }
    // The edges along the axis, where two lateral faces meet at an angle.
    for (let i = 0; i < ring.length; i += 1) {
      const before = lat[(i - 1 + ring.length) % ring.length];
      const after = lat[i];
      const ids = [before?.id, after?.id].filter(Boolean);
      if (!ids.length) continue;
      if (before && after && Math.abs(dot3(before.n, after.n) - 1) < 1e-9) continue;
      edges.push({ a: lift(axis, pr.lo, ring[i]), b: lift(axis, pr.hi, ring[i]), faces: ids, ...(pr.smooth ? { smooth: true } : {}) });
    }
  });
  return { faces, edges };
}

/** The cut faces where a plane crossed a prism perpendicular to its axis: one rectangle per interval. */
function cutFaces(pr, cuts, key, towardViewer) {
  if (!cuts.length || !pr.onCut) return [];
  const { j, c } = pr.onCut;
  const k = PLANE[pr.axis][j];
  const o = PLANE[pr.axis][1 - j];
  const out = [];
  cuts.forEach(([q0, q1], i) => {
    const corner = (q, t) => { const p = [0, 0, 0]; p[k] = c; p[o] = q; p[pr.axis] = t; return p; };
    const n = [0, 0, 0];
    n[k] = towardViewer;
    out.push({
      id: `${key}#cut${i}`,
      pts: [corner(q0, pr.lo), corner(q1, pr.lo), corner(q1, pr.hi), corner(q0, pr.hi)],
      holes: [],
      n,
      cut: true,
    });
  });
  return out;
}

// ═══ THE VIEWS ═════════════════════════════════════════════════════════════

/**
 * An orthographic view: the direction the viewer looks in, the two screen
 * axes, and a depth that grows AWAY from the viewer.
 *
 *   front    looking at the wall from the room          screen (x, y)
 *   plan     looking down                                 screen (x, z)
 *   section  looking along the wall towards its END      screen (z, y)
 *            (the wall on the left, the room on the right, a true view)
 */
export function orthoView(name) {
  if (name === 'plan' || name === 'top-of-card') {
    return { name, ortho: true, dir: [0, -1, 0], screen: (p) => [p[0], p[2]], depth: (p) => -p[1] };
  }
  if (name === 'section') {
    return { name, ortho: true, dir: [1, 0, 0], screen: (p) => [p[2], p[1]], depth: (p) => p[0] };
  }
  return { name: 'front', ortho: true, dir: [0, 0, -1], screen: (p) => [p[0], p[1]], depth: (p) => -p[2] };
}

/** A pinhole camera at P looking at T (the perspective of the 3D sheet). */
function perspectiveView(P, T, focal = 1000) {
  const fw = norm3(sub3(T, P));
  const rt = norm3(cross3(fw, [0, 1, 0]));
  const up = cross3(rt, fw);
  return {
    name: 'perspective',
    ortho: false,
    P, fw, rt, up, focal,
    screen: (q) => { const v = sub3(q, P); const z = Math.max(1, dot3(v, fw)); return [focal * dot3(v, rt) / z, focal * dot3(v, up) / z]; },
    depth: (q) => dot3(sub3(q, P), fw),
  };
}

/** Does this face look at the viewer? */
function facing(view, face) {
  if (view.ortho) return dot3(face.n, view.dir) < -1e-9;
  return dot3(face.n, sub3(face.pts[0], view.P)) < -1e-9;
}

/** Project a face for occlusion: its screen rings, its bounds, and its depth at a screen point. */
function projectFace(view, face) {
  const ring = face.pts.map((p) => view.screen(p));
  const holes = (face.holes || []).map((h) => h.map((p) => view.screen(p)));
  if (Math.abs(area2(ring)) < 1e-9) return null;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  // The face's plane, for the depth at any screen point.
  const n = face.n;
  const c = dot3(n, face.pts[0]);
  let depthAt;
  if (view.ortho) {
    // Depth is affine in the screen point: solve it from three corners.
    const P0 = face.pts[0];
    let P1 = null; let P2 = null;
    for (let i = 1; i < face.pts.length && !P2; i += 1) {
      for (let j = i + 1; j < face.pts.length; j += 1) {
        const s0 = view.screen(P0); const s1 = view.screen(face.pts[i]); const s2 = view.screen(face.pts[j]);
        const det = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
        if (Math.abs(det) > 1e-9) { P1 = face.pts[i]; P2 = face.pts[j]; break; }
      }
    }
    if (!P2) return null;
    const s0 = view.screen(P0); const s1 = view.screen(P1); const s2 = view.screen(P2);
    const d0 = view.depth(P0); const d1 = view.depth(P1); const d2 = view.depth(P2);
    const det = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
    const a = ((d1 - d0) * (s2[1] - s0[1]) - (d2 - d0) * (s1[1] - s0[1])) / det;
    const b = ((s1[0] - s0[0]) * (d2 - d0) - (s2[0] - s0[0]) * (d1 - d0)) / det;
    depthAt = (q) => d0 + a * (q[0] - s0[0]) + b * (q[1] - s0[1]);
  } else {
    depthAt = (q) => {
      const ray = [view.fw[0] + (q[0] / view.focal) * view.rt[0] + (q[1] / view.focal) * view.up[0],
        view.fw[1] + (q[0] / view.focal) * view.rt[1] + (q[1] / view.focal) * view.up[1],
        view.fw[2] + (q[0] / view.focal) * view.rt[2] + (q[1] / view.focal) * view.up[2]];
      const den = dot3(n, ray);
      if (Math.abs(den) < 1e-12) return Infinity;
      return (c - dot3(n, view.P)) / den;
    };
  }
  return { ring, holes, rings: [ring, ...holes], x0, y0, x1, y1, depthAt };
}

// ═══ THE HIDDEN-LINE PASS ══════════════════════════════════════════════════

/** A uniform grid over the occluders' screen bounds, for the candidate lookup. */
function gridIndex(occluders) {
  if (!occluders.length) return { query: () => [] };
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const o of occluders) { x0 = Math.min(x0, o.p.x0); y0 = Math.min(y0, o.p.y0); x1 = Math.max(x1, o.p.x1); y1 = Math.max(y1, o.p.y1); }
  const n = Math.max(1, Math.min(96, Math.round(Math.sqrt(occluders.length) * 2)));
  const cw = Math.max((x1 - x0) / n, 1e-6);
  const ch = Math.max((y1 - y0) / n, 1e-6);
  const cells = new Map();
  const ix = (x) => Math.max(0, Math.min(n - 1, Math.floor((x - x0) / cw)));
  const iy = (y) => Math.max(0, Math.min(n - 1, Math.floor((y - y0) / ch)));
  occluders.forEach((o, k) => {
    for (let i = ix(o.p.x0 - EPS_P); i <= ix(o.p.x1 + EPS_P); i += 1) {
      for (let j = iy(o.p.y0 - EPS_P); j <= iy(o.p.y1 + EPS_P); j += 1) {
        const id = i * n + j;
        if (!cells.has(id)) cells.set(id, []);
        cells.get(id).push(k);
      }
    }
  });
  return {
    query(bx0, by0, bx1, by1) {
      const seen = new Set();
      const out = [];
      for (let i = ix(bx0 - EPS_P); i <= ix(bx1 + EPS_P); i += 1) {
        for (let j = iy(by0 - EPS_P); j <= iy(by1 + EPS_P); j += 1) {
          for (const k of cells.get(i * n + j) || []) {
            if (seen.has(k)) continue;
            seen.add(k);
            const o = occluders[k];
            if (o.p.x1 < bx0 - EPS_P || o.p.x0 > bx1 + EPS_P || o.p.y1 < by0 - EPS_P || o.p.y0 > by1 + EPS_P) continue;
            out.push(o);
          }
        }
      }
      return out;
    },
  };
}

/** The 3-D point of a projected segment at its screen parameter t (perspective-correct). */
function pointAt(view, A, B, sA, sB, t) {
  if (view.ortho) return lerp3(A, B, t);
  // Invert the projection along the segment: screen x (or y) is a ratio of
  // two linear functions of the 3-D parameter s.
  const axis = Math.abs(sB[0] - sA[0]) >= Math.abs(sB[1] - sA[1]) ? 0 : 1;
  const target = sA[axis] + (sB[axis] - sA[axis]) * t;
  const basis = axis === 0 ? view.rt : view.up;
  const D = sub3(B, A);
  const a0 = view.focal * dot3(sub3(A, view.P), basis);
  const a1 = view.focal * dot3(D, basis);
  const b0 = dot3(sub3(A, view.P), view.fw);
  const b1 = dot3(D, view.fw);
  const den = a1 - target * b1;
  const s = Math.abs(den) < 1e-12 ? t : (target * b0 - a0) / den;
  return lerp3(A, B, Math.max(0, Math.min(1, s)));
}

/**
 * The visible pieces of one 3-D segment, as screen segments. `skip` names the
 * faces it lies on (never its own occluders); `tie(o)` breaks a coplanar tie.
 */
function visibleParts(view, index, A, B, {
  skip = null, tie = null, hiddenToo = false, inner = false,
} = {}) {
  const sA = view.screen(A);
  const sB = view.screen(B);
  if (Math.hypot(sB[0] - sA[0], sB[1] - sA[1]) < 1e-9) return { shown: [], hidden: [] };
  const cands = index.query(Math.min(sA[0], sB[0]), Math.min(sA[1], sB[1]), Math.max(sA[0], sB[0]), Math.max(sA[1], sB[1]))
    .filter((o) => !(skip && skip.has(o.id)) && (!o.reveal || inner));
  const ts = [0, 1];
  for (const o of cands) {
    for (const ring of o.p.rings) {
      for (let i = 0; i < ring.length; i += 1) crossings(sA, sB, ring[i], ring[(i + 1) % ring.length], ts);
    }
  }
  const sorted = [...new Set(ts.filter((t) => t > -EPS_T && t < 1 + EPS_T).map((t) => Math.max(0, Math.min(1, t))))].sort((p, q) => p - q);
  const shown = [];
  const hidden = [];
  const push = (list, t0, t1) => {
    const last = list[list.length - 1];
    if (last && Math.abs(last[1] - t0) < 1e-9) last[1] = t1; else list.push([t0, t1]);
  };
  for (let i = 0; i + 1 < sorted.length; i += 1) {
    const t0 = sorted[i];
    const t1 = sorted[i + 1];
    if (t1 - t0 < EPS_T) continue;
    const tm = (t0 + t1) / 2;
    const q = [sA[0] + (sB[0] - sA[0]) * tm, sA[1] + (sB[1] - sA[1]) * tm];
    const dq = view.depth(pointAt(view, A, B, sA, sB, tm));
    let covered = false;
    for (const o of cands) {
      if (q[0] < o.p.x0 - EPS_P || q[0] > o.p.x1 + EPS_P || q[1] < o.p.y0 - EPS_P || q[1] > o.p.y1 + EPS_P) continue;
      const where = inRegion(q, o.p.rings);
      if (where === 'out') continue;
      const df = o.p.depthAt(q);
      if (df < dq - EPS_D || (Math.abs(df - dq) <= EPS_D && tie && tie(o))) { covered = true; break; }
    }
    if (covered) { if (hiddenToo) push(hidden, t0, t1); } else push(shown, t0, t1);
  }
  const toSeg = ([t0, t1]) => [
    [sA[0] + (sB[0] - sA[0]) * t0, sA[1] + (sB[1] - sA[1]) * t0],
    [sA[0] + (sB[0] - sA[0]) * t1, sA[1] + (sB[1] - sA[1]) * t1],
  ];
  return { shown: shown.map(toSeg), hidden: hidden.map(toSeg) };
}

/** Is one screen point (at a known depth) covered? */
function pointCovered(view, index, P, skip) {
  const q = view.screen(P);
  const dq = view.depth(P);
  for (const o of index.query(q[0], q[1], q[0], q[1])) {
    if (skip && skip.has(o.id)) continue;
    if (o.reveal) continue;
    if (inRegion(q, o.p.rings) !== 'in') continue;
    if (o.p.depthAt(q) < dq - EPS_D) return true;
  }
  return false;
}

// ═══ THE ROOM'S SOLIDS, PER MEMBER ═════════════════════════════════════════

/** The boards UnitView draws (the MovingPanel map's own filter). */
function roomBoards(result) {
  return (result?.panels || []).filter((p) => p.box && !p.meta?.frontDecorationParent);
}

/** Is this board a FRONT (a door or a drawer front), the room's `frontKind`? */
function isRoomFront(panel) {
  // T82 F7 · the HAWA pocket door is a front: lifted with the fronts, drawn in their ink.
  return panel?.part === 'FRONT' || panel?.part === 'DRAWER-FRONT' || isPocketDoor(panel);
}

/** The shell of a carcass: what the X-ray fades as carcass and every sheet draws in the carcass's own ink. */
const SHELL_ROLES = new Set(['side', 'top', 'bottom', 'back', 'frame', 'plinth', 'end_panel', 'infill', 'upstand']);

/**
 * The prism(s) of one board in its UNIT's frame: the seat and nominal outline
 * the room extrudes, the slope, the notch and the bite cut from it as the room
 * cuts them, and the through openings as holes. A board with no seat is its box.
 */
function boardPrisms(panel, profile) {
  const p = sceneBoard(panel);
  const b = p.box;
  if (!b) return [];
  const asBox = () => [boxPrism({ x0: b.x, x1: b.x + b.w, y0: b.y, y1: b.y + b.h, z0: b.z, z1: b.z + b.d })];
  // T55 · the raked strip's four corners (the engine's own, in the unit's x-y), through its depth.
  const corners = Array.isArray(p.meta?.corners) && p.meta.corners.length >= 3 ? p.meta.corners : null;
  if (corners) {
    return [{ axis: 2, lo: b.z, hi: b.z + b.d, outline: orient(corners.map((q) => [Number(q[0]), Number(q[1])]), true), holes: [] }];
  }
  // T75 F4 · an L board's plan outline (x from box.x, z from box.z), through its height.
  const plan = Array.isArray(p.meta?.planOutline) && p.meta.planOutline.length >= 3 ? p.meta.planOutline : null;
  if (plan) {
    return [{ axis: 1, lo: b.y, hi: b.y + b.h, outline: orient(plan.map((q) => [b.x + Number(q[0]), b.z + Number(q[1])]), true), holes: [] }];
  }
  // A side (or a divider) that states its own elevation (the wedge off its top, T53): its x-y profile, through its depth.
  if (Array.isArray(p.meta?.elevation) && p.meta.elevation.length >= 3) {
    return [{ axis: 2, lo: b.z, hi: b.z + b.d, outline: orient(p.meta.elevation.map((q) => [b.x + Number(q[0]), b.y + Number(q[1])]), true), holes: [] }];
  }
  const seat = panelPlacement(p);
  if (!seat) return asBox();
  const { w, h } = cncRect(p);
  if (!(w > 0) || !(h > 0)) return asBox();
  const axis = Math.abs(seat.n[0]) > 0.5 ? 0 : (Math.abs(seat.n[1]) > 0.5 ? 1 : 2);
  const thickness = axis === 0 ? b.w : (axis === 1 ? b.h : b.d);
  // The outline the room extrudes: the rectangle, the slope, the notch, the bite.
  const slope = p.cnc?.slopeCut && slopeCutActive({ w, h, ...p.cnc.slopeCut }) ? { w, h, ...p.cnc.slopeCut } : null;
  let outline = [[0, 0], [w, 0], [w, h], [0, h]];
  if (slope) outline = trimOutlineOnSlope(outline, slope);
  const notch = p.cnc?.notch && Number(p.cnc.notch.nw) > 0 ? p.cnc.notch : null;
  if (notch) outline = cutNotchCorner(outline, w, h, notch);
  const bite = p.cnc?.bite && Number(p.cnc.bite.x1) > Number(p.cnc.bite.x0) ? p.cnc.bite : null;
  if (bite) outline = cutEdgeBite(outline, w, h, bite);
  // The through openings (an in-frame frame's, a back's window): holes, as the room cuts them.
  const cuts = profile?.appearance?.cuts?.enabled || p.part === 'FRAME';
  const holes = cuts
    ? panelRecesses(p, [], { thickness, profile })
      .filter((f) => f.kind === 'rect' && f.through && f.w > 2 && f.h > 2)
      .map((f) => [[f.x - f.w / 2, f.y - f.h / 2], [f.x + f.w / 2, f.y - f.h / 2], [f.x + f.w / 2, f.y + f.h / 2], [f.x - f.w / 2, f.y + f.h / 2]])
    : [];
  const [pa, pb] = PLANE[axis];
  const to3 = (q) => [
    seat.origin[0] + seat.u[0] * q[0] + seat.v[0] * q[1],
    seat.origin[1] + seat.u[1] * q[0] + seat.v[1] * q[1],
    seat.origin[2] + seat.u[2] * q[0] + seat.v[2] * q[1],
  ];
  const toPlane = (q) => { const P = to3(q); return [P[pa], P[pb]]; };
  const face = seat.origin[axis];
  const back = face - seat.n[axis] * thickness;
  return [{
    axis,
    lo: Math.min(face, back),
    hi: Math.max(face, back),
    outline: orient(outline.map(toPlane), true),
    holes: holes.map((hole) => orient(hole.map(toPlane), false)),
  }];
}

/** The ink a board is drawn in on an opaque sheet (today's convention, CLAUDE.md "zostaw nasze"). */
function boardLayer(panel, result) {
  if (isRoomFront(panel)) return 'DOORS';
  if (panel.role === 'frame') return 'FRAME_BOARD';
  if (panel.role === 'plinth') return 'CARCASE';
  if (panel.role === 'end_panel' || panel.role === 'infill' || panel.material_role === 'front') return 'DOORS';
  const style = panelStyle(panel, { width: Number(result.params.width) || 0, height: Number(result.params.height) || 0 });
  return style.layer === 'SHELVES' ? 'SHELVES' : 'CARCASE';
}

/** Where a member's own frame lands in the run's: along the wall, above the floor, off the wall. */
function memberOffset(m, profile) {
  return [Number(m.x) || 0, Number(m.base) || 0, wallGapOf(m.unit, profile)];
}

/**
 * The hardware of one member as solids in its unit frame. Each family is the
 * silhouette of the room's own model where one was traced (PART D) and today's
 * symbol where none was: the leg's plate, stem and foot; the hinge's cup, arm
 * and plate; the runner on its row; the rod; the rail; the shelf pin; the kit
 * body. A symbol is a THIN solid on its family's ink; it is hidden by the
 * boards in front of it and hides nothing but itself.
 */
function hardwareSolids(m, profile, defaultHandle = null) {
  const out = [];
  const r = m.result;
  const hw = hardwareInstances(r, profile);
  const H = profile.hardware;
  const unitKey = `${m.unit.id}`;
  const add = (family, layer, prisms, extra = {}) => out.push({
    key: `${unitKey}:hw:${family}:${out.length}`, family, layer, prisms, kind: 'hw', occludes: false, ...extra,
  });
  // Legs: plate, stem, foot (3d/Hardware.jsx Legs; today's legHardware).
  for (const leg of hw.legs) {
    const h = Number(leg.height) || 0;
    if (!(h > 0)) continue;
    const plateT = Math.min(H.leg.plateThickness, h);
    const footH = Math.min(H.leg.footHeight, Math.max(0, h - plateT));
    const half = (Number(leg.plate) || 0) / 2;
    const top = 0;
    const prisms = [
      { axis: 1, lo: top - plateT, hi: top, outline: orient([[leg.x - half, leg.z - half], [leg.x + half, leg.z - half], [leg.x + half, leg.z + half], [leg.x - half, leg.z + half]], true), holes: [] },
      cylinderPrism(1, [leg.x, 0, leg.z], H.leg.stemDiameter / 2, -h + footH, top - plateT),
      cylinderPrism(1, [leg.x, 0, leg.z], H.leg.footDiameter / 2, -h, -h + footH),
    ];
    add('leg', 'LEG_BLOCK', prisms, { instance: leg, sil: silhouetteMark('leg', leg) });
  }
  // Hinges: the plate on the carcass, the cup in the door, the arm between.
  for (const hg of hw.hinges) {
    const dir = hg.side === 'R' ? -1 : 1;
    const plateT = H.hinge.plateThickness;
    const plateX0 = dir > 0 ? hg.plateX : hg.plateX - plateT;
    const plate = boxPrism({
      x0: plateX0, x1: plateX0 + plateT, y0: hg.y - H.hinge.plateLength / 2, y1: hg.y + H.hinge.plateLength / 2,
      z0: hg.plateZ - H.hinge.plateWidth / 2, z1: hg.plateZ + H.hinge.plateWidth / 2,
    });
    add('plate', 'HINGES', [plate], { instance: hg, onCarcass: true, sil: silhouetteMark('plate', hg) });
    const cupR = H.hinge.cupDiameter / 2;
    const cupFrom = Number.isFinite(hg.cupFrom) ? hg.cupFrom : hg.z;
    const cupTo = Number.isFinite(hg.cupTo) && hg.cupTo !== hg.cupFrom ? hg.cupTo : hg.z + H.hinge.cupDepth;
    const cup = cylinderPrism(2, [hg.x, hg.y, 0], cupR, cupFrom, cupTo);
    const armX0 = Math.min(hg.x, dir > 0 ? plateX0 + plateT : plateX0);
    const armX1 = Math.max(hg.x, dir > 0 ? plateX0 + plateT : plateX0);
    const arm = boxPrism({
      x0: armX0, x1: armX1, y0: hg.y - H.hinge.armWidth / 2, y1: hg.y + H.hinge.armWidth / 2,
      z0: Math.min(hg.z, hg.plateZ), z1: Math.max(hg.z, hg.plateZ),
    });
    add('hinge', 'HINGES', [cup, arm], { instance: hg, onFront: hg.panelId, sil: silhouetteMark('hinge', hg) });
  }
  // Runners: today's symbol, the runner's underside from the back of the box
  // forward by the nominal the BOM orders (engine/runners.js runnerAskFor).
  for (const rn of hw.runners) {
    const nominal = runnerAskFor(rn.length, profile) ?? rn.length;
    const t = H.runner.profileThickness;
    const x0 = rn.side === 'R' ? rn.x - t : rn.x;
    const prism = { axis: 0, lo: x0, hi: x0 + t, outline: orient([[rn.z, rn.y], [rn.z + nominal, rn.y], [rn.z + nominal, rn.y + 1], [rn.z, rn.y + 1]], true), holes: [] };
    add('runner', 'RUNNERS', [prism], { instance: { ...rn, nominal }, sil: silhouetteMark('runner', { ...rn, nominal }) });
  }
  for (const rod of hw.rods) {
    const rr = (Number(rod.diameter) || 6) / 2;
    add('rod', 'RUNNERS', [cylinderPrism(0, [0, rod.y + rr, rod.z + rr], rr, rod.x - rod.length / 2, rod.x + rod.length / 2)], { instance: rod, sil: silhouetteMark('rod', rod) });
  }
  for (const rail of hw.rails) {
    const rr = (Number(rail.diameter) || 30) / 2;
    add('rail', 'LEG_BLOCK', [cylinderPrism(0, [0, rail.y, rail.z], rr, rail.x - rail.length / 2, rail.x + rail.length / 2)], { instance: rail, sil: silhouetteMark('rail', rail) });
  }
  for (const pin of hw.shelfSupports) {
    const d = Number(pin.diameter) || 5;
    const len = Math.min(10, Number(pin.holeDepth) || 10);
    const ax = Math.abs(pin.normal?.[0] || 0) > 0.5 ? 0 : 2;
    const sgn = ax === 0 ? Math.sign(pin.normal[0] || 1) : Math.sign(pin.normal?.[2] || 1);
    const from = ax === 0 ? pin.x : pin.z;
    add('support', 'HINGES', [cylinderPrism(ax, [pin.x, pin.y + d / 2, pin.z], d / 2, from, from + sgn * len)], { instance: pin, sil: silhouetteMark('support', pin) });
  }
  // Kit bodies: the placeholder the room walls in (hardware3d kits), on APPLIANCE.
  for (const kit of hw.kits) {
    add('kit', 'APPLIANCE', [boxPrism({ x0: kit.x, x1: kit.x + kit.w, y0: kit.y, y1: kit.y + kit.h, z0: kit.z, z1: kit.z + kit.d })],
      { instance: kit, occludes: true, label: kit.label || null, sil: silhouetteMark('kit', kit) });
  }
  // T82 F7 · the HAWA symbols the room draws (the two hardware zones on panel
  // B, the vertical profile, the Push ejector), where they stand with the door
  // shut; none is screwed to the door, so they stay when the fronts are off.
  for (const b of pocketHardwareBoxes(pocketDoorGeometry(r, profile))) {
    add(`hawa-${b.kind}`, 'HINGES', [boxPrism(b)], { instance: b });
  }
  // The handles, standing proud of their fronts as the room models them
  // (3d/Hardware.jsx FrontHandle): seen from the front they are the owner's
  // circle of 30 (a mark), on a plan or a section their own side.
  const K = profile.handles?.knob || {};
  const B = profile.handles?.bar || {};
  for (const h of handleMarks(m, profile, defaultHandle)) {
    if (h.nx !== 0) continue;
    const face = h.points[0][2];
    if (h.type === 'knob' || h.points.length < 2) {
      const d = Number(profile.drawings?.knobDiameter) || Number(K.diameter) || 30;
      const stand = Number(K.standoff) || 22;
      const stem = (Number(K.stemDiameter) || 8) / 2;
      for (const P of h.points) {
        add('knob', 'HANDLES', [
          cylinderPrism(2, P, stem, face, face + stand / 2),
          cylinderPrism(2, P, d / 2, face + stand / 2, face + stand),
        ], { instance: { ...h, at: P }, onFront: h.panel, frontMark: true, sil: silhouetteMark('knob', { ...h, at: P }) });
      }
    } else {
      const [P0, P1] = [h.points[0], h.points[h.points.length - 1]];
      const stand = Number(B.standoff) || 32;
      const rod = (Number(B.rodDiameter) || 12) / 2;
      const post = (Number(B.postDiameter) || 10) / 2;
      const over = Number(B.overhang) || 0;
      const horizontal = Math.abs(P1[0] - P0[0]) >= Math.abs(P1[1] - P0[1]);
      const prisms = [P0, P1].map((P) => cylinderPrism(2, P, post, face, face + stand - rod));
      prisms.push(horizontal
        ? cylinderPrism(0, [0, P0[1], face + stand - rod], rod, Math.min(P0[0], P1[0]) - over, Math.max(P0[0], P1[0]) + over)
        : cylinderPrism(1, [P0[0], 0, face + stand - rod], rod, Math.min(P0[1], P1[1]) - over, Math.max(P0[1], P1[1]) + over));
      add('bar', 'HANDLES', prisms, { instance: h, onFront: h.panel, frontMark: true, sil: silhouetteMark('bar', h) });
    }
  }
  return out;
}

// ─── T82 F22 · HANDLES ON THE SHEETS ────────────────────────────────────────
//
// The owner, 24.10.2026 (19:34): *"nie widac wogole zeby bylo jakiekolwiek
// handles nic"*. The probe (verify/t82/f22-probe.md): with no handle chosen
// the engine drills none (R9, engine/handles.js resolveHandle), so the
// drill summary is empty and every sheet showed fronts with nothing to pull.
// CLAUDE.md T82 F22: the fronts sheet then draws the project's DEFAULT
// handle (`profile.handles.default`, a knob of 30) at the engine's own
// point; `handles: 'none'` is a choice and draws nothing; the drill summary
// is untouched. So the sheet asks the engine's law for the point alone, as
// cabinet.js asks it, and writes no `meta.handle` (the room mounts its 3-D
// handle on it) and no drill: the CNC, the BOM and the room never see it.

/** The profile's default as a handle record, or null for none. */
function profileDefaultHandle(profile) {
  const raw = profile?.handles?.default;
  const d = typeof raw === 'string' ? { type: raw } : raw;
  if (!d || (d.type !== 'knob' && d.type !== 'bar')) return null;
  const centres = d.type === 'bar'
    ? (Number(d.centres) > 0 ? Number(d.centres) : (Number(profile?.handles?.defaultCentres) || 128))
    : 0;
  return { type: d.type, centres };
}

/**
 * THE HANDLE A SHEET DRAWS ON A FRONT THE ENGINE FITTED NONE TO, or null.
 *
 * Null when the project CHOSE: a handle (bar, knob or J-pull: the engine's
 * own answer stands, and a J is drawn as no handle), the J-pull of a project
 * saved as `style: 'HJ'` (lib/frontOpening.js reads it as J-pull), or NONE,
 * which the project already says in two words: push-to-open written by the
 * Settings opening tile and the Hardware step's runner switch
 * (`runners.variant 'T'`, the MOVENTO TIP-ON, on the design itself and never
 * the profile's fallback for a project that has not answered), and the
 * hardware block's `handles: 'none'` (T32). Else the profile's default.
 *
 * @param {object|null} design  the project design (migrated or raw)
 * @param {object} profile
 * @returns {{type:'knob'|'bar', centres:number}|null}
 */
export function sheetDefaultHandle(design, profile) {
  const chosen = design?.fronts?.handle;
  if (chosen && chosen.type) return null;
  if (design?.fronts?.style === 'HJ') return null;
  if (String(design?.hardware?.handles || '').toLowerCase() === 'none') return null;
  if (String(design?.runners?.variant || '').toUpperCase() === 'T') return null;
  return profileDefaultHandle(profile);
}

/**
 * Does this front take the sheet's default handle? A house front (the
 * engine's handle law gives it a class) on a unit that is not opened by a
 * push of its own. One predicate, so a kit with its own opening says so
 * here: PART A's HAWA pocket door (`POCKET-DOOR`, role `pocket_door`, Push
 * by HAWA's hardware) has no class and is skipped; the covered units' doors
 * are dropped by the pocket in the engine. HOOK (A5, F7): a further push
 * rule of a new kit joins the `push` line below.
 */
function takesSheetDefault(panel, unit) {
  if (panel?.role !== 'front') return false;
  const push = panel.meta?.push === true || unit?.params?.pocket?.push === true;
  return !push;
}

/** The handles of one member, as the room places them (out of the front's cut frame). */
function handleMarks(m, profile, defaultHandle = null) {
  const out = [];
  const r = m.result;
  const place = (p, h, extra = {}) => {
    const box = p.box;
    // The leaf's face normal (3d/Hardware.jsx FrontHandle `nx`): a leaf standing along z is not drawn on an elevation.
    // eslint-disable-next-line no-nested-ternary
    const nx = p.meta?.swingZ ? -(Number(p.meta.swingZ.dir) || -1) : (p.meta?.faceX ? (Number(p.meta.faceX.dir) || 1) : 0);
    const faceZ = box.z + box.d;
    const at = (x, y) => (nx > 0 ? [box.x + box.w, box.y + Number(y), box.z + Number(x)]
      : (nx < 0 ? [box.x, box.y + Number(y), box.z + box.d - Number(x)] : [box.x + box.w - Number(x), box.y + Number(y), faceZ]));
    const holes = Array.isArray(h.holes) && h.holes.length ? h.holes : [[h.x, h.y]];
    out.push({ type: h.type, panel: p.id, points: holes.map(([x, y]) => at(x, y)), axis: h.axis, nx, ...extra });
  };
  const drilled = new Set();
  for (const h of r.drillSummary?.handles || []) {
    const p = (r.panels || []).find((q) => q.id === h.panel && q.box);
    if (!p) continue;
    drilled.add(p.id);
    place(p, h);
  }
  // T82 F22 · the default, on every front the engine fitted none to, at the
  // point the engine's law gives it (cabinet.js asks resolveHandle with the
  // same panel, unit type, hinge and frame), drilled nowhere.
  if (defaultHandle) {
    const unitType = getUnitType(m.unit?.type ?? r.params?.type);
    const cabinetHinge = String(r.params?.hinge || profile?.doors?.defaultHinge || 'L').toUpperCase() === 'R' ? 'R' : 'L';
    for (const p of r.panels || []) {
      if (!p.box || drilled.has(p.id) || !takesSheetDefault(p, m.unit)) continue;
      const got = resolveHandle({
        panel: p, unitType, project: defaultHandle, own: null, hinge: p.meta?.hinge || cabinetHinge, frame: p.meta?.shaker?.frame ?? null,
      }, profile);
      if (!got || got.system === 'jpull' || !got.reference) continue;
      place(p, {
        type: got.type, axis: got.reference.axis, x: got.reference.x, y: got.reference.y,
        holes: got.holes.map((k) => [k.x, k.y]),
      }, { fallback: true });
    }
  }
  return out;
}

/**
 * EVERY SOLID OF ONE WALL GROUP, in the run's frame, plus the marks that ride
 * on them (handles, hinge bars, the faces' detail, door swings, labels).
 *
 * @param {object} group   one entry of `wallGroups()` (members with unit, result, x, base)
 * @param {object} args    { profile, worktops, frontTypeOf, shakerFrame, clipX: [x0, x1] | null }
 */
export function runSolids(group, {
  profile, worktops = [], frontTypeOf = null, shakerFrame = null, defaultHandle = null,
} = {}) {
  const solids = [];
  const marks = [];
  const members = group?.members || [];
  for (const m of members) {
    const r = m.result;
    const off = memberOffset(m, profile);
    const num = String(m.unit.params?.unit_num ?? r.unitNum ?? '');
    for (const p of roomBoards(r)) {
      const prisms = boardPrisms(p, profile).map((pr) => movePrism(pr, off));
      if (!prisms.length) continue;
      solids.push({
        key: `${m.unit.id}:${p.id}`,
        unitId: m.unit.id,
        num,
        panelId: p.id,
        part: p.part,
        role: p.role,
        kind: 'board',
        front: isRoomFront(p),
        shell: SHELL_ROLES.has(p.role),
        layer: boardLayer(p, r),
        occludes: true,
        prisms,
        member: m,
      });
    }
    for (const s of hardwareSolids(m, profile, defaultHandle)) {
      solids.push({ ...s, unitId: m.unit.id, num, prisms: s.prisms.map((pr) => movePrism(pr, off)), offset: off, member: m });
    }
    // The cornice: bought moulding, drawn from assemblies.cornice (3d/Cornice.jsx).
    const cornice = r.assemblies?.cornice;
    if (cornice) {
      const members3 = corniceSolids(cornice, { carcassTop: cornice.carcassTop, doorPlane: cornice.doorPlane, backZ: cornice.backZ }, profile);
      members3.forEach((cm, i) => {
        // Each member is a section swept between two ends: a prism along the
        // axis the two ends differ on, its outline the section at one end.
        const da = cm.a[0]; const db = cm.b[0];
        const axis = Math.abs(db[0] - da[0]) >= Math.abs(db[2] - da[2]) ? 0 : 2;
        const lo = Math.min(...cm.a.map((q) => q[axis]), ...cm.b.map((q) => q[axis]));
        const hi = Math.max(...cm.a.map((q) => q[axis]), ...cm.b.map((q) => q[axis]));
        const [pa, pb] = PLANE[axis];
        const ring = orient(cm.a.map((q) => [q[pa], q[pb]]), true);
        if (ring.length < 3) return;
        solids.push({
          key: `${m.unit.id}:CORNICE:${cm.id || i}`, unitId: m.unit.id, num, part: 'CORNICE', role: 'cornice', kind: 'cornice',
          front: false, shell: true, layer: 'DOORS', occludes: true,
          prisms: [movePrism({ axis, lo, hi, outline: ring, holes: [] }, off)],
          member: m,
        });
      });
    }
    // The handles, the hinge bars and the faces' own detail ride on the fronts.
    const style = frontTypeOf ? frontTypeOf(m.unit) : null;
    for (const p of roomBoards(r).filter(isRoomFront)) {
      const host = `${m.unit.id}:${p.id}`;
      const face = (p.box.z + p.box.d) + off[2];
      const lift2 = (x, y) => [x + off[0], y + off[1], face];
      // T82 F7 · the HAWA door is plain in the room (its role takes no front style), so it is plain here.
      // eslint-disable-next-line no-nested-ternary
      const detail = isPocketDoor(p) ? [] : (p.meta?.frontDecoration
        ? frontDecorationElevation(p)
        : frontDetail(p.box, p.meta?.frontType || style || profile.front.defaultType, profile, shakerFrame));
      for (const e of detail) {
        const pts = e.kind === 'rect'
          ? [[e.x, e.y], [e.x + e.w, e.y], [e.x + e.w, e.y + e.h], [e.x, e.y + e.h]]
          : (e.kind === 'line' ? [[e.x1, e.y1], [e.x2, e.y2]] : (e.pts || []));
        const closed = e.kind === 'rect' || (e.kind === 'poly' && !e.open);
        const flat = shiftEntity({ ...e, layer: 'DOORS', pen: e.pen || 'VISIBLE', meta: e.meta || 'front-detail' }, off[0], off[1]);
        marks.push({ kind: 'path', host, front: true, layer: 'DOORS', pen: e.pen || 'VISIBLE', closed, pts: pts.map(([x, y]) => lift2(x, y)), meta: e.meta || 'front-detail', flat });
      }
      if (p.part === 'FRONT' && !p.meta?.swingZ && !p.meta?.faceX) {
        for (const e of doorSwing(p.box, p.meta?.hinge)) {
          marks.push({
            kind: 'path', host, front: true, layer: 'DOOR_SWING', pen: 'FINE', closed: false, pts: [lift2(e.x1, e.y1), lift2(e.x2, e.y2)], meta: 'door-swing',
            flat: shiftEntity({ ...e, layer: 'DOOR_SWING', pen: 'FINE', meta: 'door-swing' }, off[0], off[1]),
          });
        }
      }
    }
    for (const h of handleMarks(m, profile, defaultHandle)) {
      const host = `${m.unit.id}:${h.panel}`;
      const pts = h.points.map((q) => [q[0] + off[0], q[1] + off[1], q[2] + off[2]]);
      marks.push({
        kind: 'handle', host, front: true, type: h.type, pts, axis: h.axis, standing: h.nx !== 0, ...(h.fallback ? { fallback: true } : {}),
      });
    }
    // The hinge bars: one per cup, on the hinge edge of the leaf (CLAUDE.md F3).
    const hinges = hardwareInstances(r, profile).hinges;
    for (const p of roomBoards(r).filter((q) => q.part === 'FRONT' && !q.meta?.swingZ && !q.meta?.faceX)) {
      const mine = hinges.filter((hg) => hg.panelId === p.id);
      if (!mine.length) continue;
      const bar = profile.drawings.hingeBar || { width: 6, height: 70 };
      const right = p.meta?.hinge === 'R';
      const x0 = right ? p.box.x + p.box.w - bar.width : p.box.x;
      const face = p.box.z + p.box.d + off[2];
      for (const hg of mine) {
        const y0 = Math.max(p.box.y, Math.min(p.box.y + p.box.h - bar.height, hg.y - bar.height / 2));
        marks.push({
          kind: 'bar', host: `${m.unit.id}:${p.id}`, front: true, layer: 'HINGE_MARK',
          x: x0 + off[0], y: y0 + off[1], w: bar.width, h: bar.height, z: face, cupY: hg.y + off[1],
        });
      }
    }
    // T82 F7 · the HAWA door's bars: its hinge edge, at the cups the engine drills.
    marks.push(...pocketDoorBarMarks(m, off, profile));
  }
  // The worktops of this wall (engine/worktop.js worktopsFor, the store's slabs).
  (worktops || []).forEach((w, i) => {
    const g = w.geometry || w;
    if (!(g.w > 0) && !Array.isArray(g.outline)) return;
    const outline = Array.isArray(g.outline) && g.outline.length >= 3
      ? g.outline.map((q) => [Number(q[0]), Number(q[1])])
      : [[g.x, g.z || 0], [g.x + g.w, g.z || 0], [g.x + g.w, (g.z || 0) + g.d], [g.x, (g.z || 0) + g.d]];
    solids.push({
      key: `worktop:${g.slabId || g.id || i}`, kind: 'worktop', part: 'WORKTOP', role: 'worktop', front: false, shell: false,
      layer: 'WORKTOP', occludes: true, worktop: g,
      prisms: [{ axis: 1, lo: g.y, hi: g.y + g.h, outline: orient(outline, true), holes: [] }],
    });
    // ─── T82 F11 · THE BASIN SET INTO THE SLAB, IN SECTION ─────────────────
    // The owner, 25.10.2026 (12:57): *"dodajesz tylko do widoku"*. A vanity's
    // basin (engine/worktop.js cutoutsFor, kind 'basin') on the appliance ink
    // (what the client supplies, blue, dashed: T71), occluding nothing: the
    // bowl's half ellipse in the knife's plane, swept across the basin's
    // width. A section's solid only: the plan draws the oval from the
    // cut-out itself (setPlan.js), the elevation is the fronts'.
    (g.cutouts || []).filter((c) => c.kind === 'basin').forEach((c, k) => {
      const depth = Number(c.depthMm) || 0;
      const top = g.y + g.h;
      if (!(depth > 0) || !(c.w > 0) || !(c.d > 0)) return;
      const ring = [];
      for (let j = 0; j <= 24; j += 1) {
        const a = (Math.PI * j) / 24;
        ring.push([c.cz + (c.d / 2) * Math.cos(a), top - depth * Math.sin(a)]);
      }
      solids.push({
        key: `basin:${g.slabId || g.id || i}:${c.unitId}:${c.basin ?? k}`, kind: 'basin', part: 'BASIN', role: 'basin',
        front: false, shell: false, layer: 'APPLIANCE', occludes: false, views: ['section'],
        prisms: [{ axis: 0, lo: c.cx - c.w / 2, hi: c.cx + c.w / 2, outline: orient(ring, true), holes: [], smooth: true }],
      });
    });
  });
  return { solids, marks };
}

// ═══ THE MODES ═════════════════════════════════════════════════════════════

/** Which solids a mode keeps (CLAUDE.md F1 (d)). */
function keeps(solid, mode) {
  if (mode !== 'no-fronts') return true;
  // Fronts off: the fronts, and what is screwed to them (the cups and arms,
  // the handles); the plates stay on the carcass.
  if (solid.front) return false;
  if (solid.onFront) return false;
  return true;
}

/**
 * The ink of a solid in a mode: the X-ray's two greys for the shell and the
 * fronts. With the fronts off, the front-material boards the room keeps (an
 * end panel, an infill, the cornice) are drawn in the carcass's ink: the
 * magenta is the fronts', and they are off.
 */
function inkOf(solid, mode) {
  if (mode === 'no-fronts' && solid.layer === 'DOORS') return 'CARCASE';
  if (mode !== 'xray') return solid.layer;
  if (solid.front) return 'XRAY_FRONT';
  if (solid.kind === 'board' && solid.shell) return 'XRAY_CARCASE';
  if (solid.kind === 'cornice') return 'XRAY_CARCASE';
  return solid.layer;
}

// ═══ THE PROJECTION ════════════════════════════════════════════════════════
//
// Three stages, so one wall and a whole room go down the same road: BUILD the
// scene of a group in its run's frame (the solids of the view, clipped, as
// faces and edges, with the marks that ride on them), MOVE it into another
// frame if the picture is the room's, and RENDER it (the occluders, the
// hidden-line pass, the painter's white, the marks).

/** Stage 1: the faces, edges and marks of one group in its own run frame. */
function buildScene(group, {
  view, mode = 'fronts', cut = null, beyond = null, clipX = null, skipSolid = null,
  profile, worktops = [], frontTypeOf = null, shakerFrame = null, solidsIn = null, defaultHandle = null,
}) {
  const { solids: all, marks } = solidsIn || runSolids(group, {
    profile, worktops, frontTypeOf, shakerFrame, defaultHandle,
  });
  const faceOn = view === 'front' || view === 'perspective';
  // The cut plane: a plan keeps what is below it, a section what is beyond it.
  const plane = cut == null ? null
    : (view === 'section' ? { k: 0, c: Number(cut), sign: 1 } : { k: 1, c: Number(cut), sign: -1 });
  const towardViewer = plane ? -plane.sign : 0;
  const live = [];
  for (const s of all) {
    if (!keeps(s, mode)) continue;
    // T82 F11 · a solid drawn in some views only (the basin: the section's).
    if (Array.isArray(s.views) && !s.views.includes(view)) continue;
    if (skipSolid && skipSolid(s)) continue;
    // A handle seen face on is the owner's mark (a circle, a bar), not its solid.
    if (s.frontMark && faceOn) continue;
    let pieces = s.prisms.map((pr) => ({ prism: pr, cuts: [] }));
    const clipBy = (k, c, sign, keepCut) => {
      const next = [];
      for (const { prism } of pieces) {
        const got = clipPrism(prism, k, c, sign);
        if (!got) continue;
        next.push(keepCut ? got : { prism: { ...got.prism, onCut: null, cutCap: null }, cuts: [] });
      }
      pieces = next;
    };
    if (clipX) { clipBy(0, clipX[0], 1, false); clipBy(0, clipX[1], -1, false); }
    if (beyond) clipBy(0, beyond[1], -1, false);
    if (plane) clipBy(plane.k, plane.c, plane.sign, true);
    if (!pieces.length) continue;
    live.push({ ...s, pieces, prisms: pieces.map((g) => g.prism), ink: inkOf(s, mode) });
  }
  const faces = [];
  const edges = [];
  const sils = [];
  for (const s of live) {
    // A family traced from its GLB draws its silhouette in this view; the
    // symbol's solid then stands in for nothing but the clip.
    const rings = s.sil ? s.sil(view) : null;
    if (rings && rings.length) {
      const off = s.offset || [0, 0, 0];
      for (const ring of rings) sils.push({ solid: s, pts: ring.map((P) => [P[0] + off[0], P[1] + off[1], P[2] + off[2]]) });
      continue;
    }
    s.pieces.forEach(({ prism: pr, cuts }, i) => {
      const key = `${s.key}~${i}`;
      const { faces: fs, edges: es } = prismTopology(pr, key);
      const cf = plane ? cutFaces(pr, cuts, key, towardViewer) : [];
      for (const f of [...fs, ...cf]) faces.push({ ...f, solid: s });
      for (const e of es) edges.push({ ...e, solid: s });
      // A cut face's own outline is an edge too: its four sides.
      for (const f of cf) {
        for (let k = 0; k < f.pts.length; k += 1) edges.push({ a: f.pts[k], b: f.pts[(k + 1) % f.pts.length], faces: [f.id], solid: s, cut: true });
      }
    });
  }
  return { live, faces, edges, sils, marks: marks.filter((mk) => live.some((s) => s.key === mk.host)) };
}

/** Stage 2: a scene moved by a rigid map (a rotation about the vertical and a shift). */
function moveScene(scene, T) {
  const P = (p) => T.point(p);
  const N = (n) => T.normal(n);
  return {
    live: scene.live,
    faces: scene.faces.map((f) => ({ ...f, pts: f.pts.map(P), holes: (f.holes || []).map((h) => h.map(P)), n: N(f.n) })),
    edges: scene.edges.map((e) => ({ ...e, a: P(e.a), b: P(e.b) })),
    sils: scene.sils.map((s) => ({ ...s, pts: s.pts.map(P) })),
    marks: scene.marks.map((mk) => (mk.pts ? { ...mk, pts: mk.pts.map(P), flat: null } : { ...mk, moved: true })),
  };
}

/** Stage 3: the occluders, the hidden-line pass, the painter's white and the marks. */
function renderScene(scene, V, {
  mode = 'fronts', hiddenAs = null, minEdge = 0, profile, extras = [],
}) {
  const xray = mode === 'xray';
  const faceOn = V.name === 'front' || V.name === 'perspective';
  const { live, faces, edges, sils, marks } = scene;
  const faceById = new Map(faces.map((f) => [f.id, f]));
  const isFacing = new Map(faces.map((f) => [f.id, facing(V, f)]));
  const facesOf = new Map();
  for (const f of faces) {
    if (!facesOf.has(f.solid.key)) facesOf.set(f.solid.key, new Set());
    facesOf.get(f.solid.key).add(f.id);
  }

  // ── the occluders: the faces that look at the viewer, of the solids that hide ──
  const occluders = [];
  if (!xray) {
    for (const f of faces) {
      if (!isFacing.get(f.id) || !f.solid.occludes) continue;
      if (hiddenAs && hiddenAs(f.solid)) continue;
      const p = projectFace(V, f);
      if (p) occluders.push({ id: f.id, p, solid: f.solid, cut: Boolean(f.cut) });
    }
  }
  // THE REVEAL. On the fronts sheet a leaf also hides what stands INSIDE the
  // carcass across its own gap (the 3 of an in-frame door, the 3 between two
  // lay-on doors): the hinge plate, the rod, the drawer box seen through a 3 mm
  // slot are no part of a front elevation (*"bez przebijania carcasow"*). The
  // carcass's own edges in that slot stay: they are the joints of the run.
  // T81 F9: the card's plan, seen from above, is read the same way: the hinge
  // arm in a leaf's 3 mm slot is no part of a TOP view either.
  if (!xray && mode === 'fronts' && (V.name === 'front' || V.name === 'top-of-card')) {
    const gap = Math.max(Number(profile?.doors?.gap) || 0, Number(profile?.inframe?.gap) || 0);
    const above = V.name === 'top-of-card';
    for (const s of live) {
      if (!s.front || !(gap > 0)) continue;
      s.prisms.forEach((pr, i) => {
        if (pr.axis !== 2 || pr.outline.length !== 4) return;
        const b = prismBounds(pr);
        const [u, v] = above ? [0, 2] : [0, 1];
        const ring = [[b.lo[u] - gap, b.lo[v] - gap], [b.hi[u] + gap, b.lo[v] - gap], [b.hi[u] + gap, b.hi[v] + gap], [b.lo[u] - gap, b.hi[v] + gap]];
        const back = above ? V.depth([0, b.hi[1], 0]) : V.depth([0, 0, b.lo[2]]);
        occluders.push({
          id: `${s.key}~${i}#reveal`, reveal: true, solid: s,
          p: { ring, holes: [], rings: [ring], x0: ring[0][0], y0: ring[0][1], x1: ring[2][0], y1: ring[2][1], depthAt: () => back },
        });
      });
    }
  }
  const index = gridIndex(occluders);
  // A coplanar tie: the face of the thinner solid wins (a frame's face over the
  // end panel that runs into it, KIT_INFRAME.lsp D14).
  const extentOf = new Map();
  for (const f of faces) {
    const k = f.solid.key;
    const e = extentOf.get(k) || [Infinity, -Infinity];
    for (const P of f.pts) { const d = V.depth(P); e[0] = Math.min(e[0], d); e[1] = Math.max(e[1], d); }
    extentOf.set(k, e);
  }
  const extent = (s) => { const e = extentOf.get(s.key); return e ? e[1] - e[0] : 0; };
  const tieFor = (s) => (o) => o.solid.key !== s.key && extent(o.solid) < extent(s) - EPS_D;

  // ── the lines ──
  const entities = [];
  const census = { edges: 0, shown: 0, hidden: 0, solids: live.length, masks: 0 };
  const longEnough = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) >= (minEdge || 0) - 1e-9;
  const seenXray = new Set();
  const line = (a, b, props) => ({ kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...props });
  for (const e of edges) {
    const adj = e.faces.map((id) => faceById.get(id)).filter(Boolean);
    const s = e.solid;
    // A curved side (a cylinder's facets) shows only its silhouette.
    if (e.smooth && adj.filter((f) => isFacing.get(f.id)).length !== 1) continue;
    const cutEdge = Boolean(e.cut) || adj.some((f) => f.cut);
    // The X-ray's two greys are drawn thin, as the room fades them; every other
    // ink keeps its sheet's weight (T41 F5a: weight is a role).
    const xrayInk = s.ink === 'XRAY_FRONT' || s.ink === 'XRAY_CARCASE';
    const props = {
      layer: s.ink,
      pen: xrayInk ? 'THIN' : (cutEdge ? 'CUT' : (s.kind === 'hw' ? 'THIN' : 'VISIBLE')),
      solid: true,
      src: s.key,
      ...(s.panelId ? { part: s.panelId } : {}),
      ...(s.family ? { family: s.family } : {}),
      ...(cutEdge ? { cut: true } : {}),
    };
    if (xray) {
      // Everything shows through: an edge of any face not seen edge-on, once.
      if (adj.every((f) => V.ortho && Math.abs(dot3(f.n, V.dir)) < 1e-9)) continue;
      const a = V.screen(e.a); const b = V.screen(e.b);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) continue;
      const k = [s.ink, ...[a, b].sort((p, q) => p[0] - q[0] || p[1] - q[1]).flat().map((v) => Math.round(v * 100))].join(',');
      if (seenXray.has(k)) continue;
      seenXray.add(k);
      census.edges += 1;
      entities.push(line(a, b, props));
      census.shown += 1;
      continue;
    }
    if (!adj.some((f) => isFacing.get(f.id))) continue;
    census.edges += 1;
    const dashed = hiddenAs && hiddenAs(s);
    const inner = s.kind === 'hw' || (s.kind === 'board' && !s.shell && !s.front);
    const parts = visibleParts(V, index, e.a, e.b, {
      skip: new Set(e.faces), tie: tieFor(s), hiddenToo: Boolean(dashed), inner,
    });
    if (dashed) {
      for (const [a, b] of [...parts.shown, ...parts.hidden]) {
        if (!longEnough(a, b)) continue;
        entities.push(line(a, b, { layer: 'SHELVES', pen: 'HIDDEN', hidden: true, src: s.key, ...(s.panelId ? { part: s.panelId } : {}), dashedSolid: true }));
        census.hidden += 1;
      }
      continue;
    }
    for (const [a, b] of parts.shown) {
      if (!longEnough(a, b)) continue;
      entities.push(line(a, b, props));
      census.shown += 1;
    }
  }
  // Lines that are not a solid's (the building behind a picture): hidden by
  // the solids in front of them like any edge.
  for (const x of extras) {
    const pieces = xray ? { shown: [[V.screen(x.a), V.screen(x.b)]] } : visibleParts(V, index, x.a, x.b, {});
    for (const [a, b] of pieces.shown) {
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) continue;
      entities.push(line(a, b, { ...x.props }));
    }
  }
  // The silhouettes traced from the GLB, hidden behind the boards in front.
  for (const sp of sils) {
    const s = sp.solid;
    for (let i = 0; i < sp.pts.length; i += 1) {
      const A = sp.pts[i]; const B = sp.pts[(i + 1) % sp.pts.length];
      const pieces = xray ? { shown: [[V.screen(A), V.screen(B)]] } : visibleParts(V, index, A, B, { inner: true });
      for (const [a, b] of pieces.shown) {
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) continue;
        entities.push(line(a, b, { layer: s.ink, pen: 'THIN', solid: true, src: s.key, family: s.family, silhouette: true }));
      }
    }
  }

  // ── a front seen whole is one rectangle; so is a cut ──
  // In an orthographic view a front whose face toward the viewer is a
  // rectangle and is seen all round (tested a hair inside its outline, so a
  // nearer edge lying ON the outline, the worktop's over a lay-on door, is
  // no cover) is written as ONE rect: the leaf the owner counts, the field of
  // a shaker measured against it, as the single front elevation writes it.
  // A cut face that is a rectangle is one rect too, in the cut's pen: the
  // bar a plan and a section have always drawn for a board the knife meets.
  const emptySet = new Set();
  const wholeFronts = [];
  if (V.ortho) {
    const HAIR = profile.drawings.projector.wholeFaceHairMm;
    for (const f of faces) {
      const s = f.solid;
      const leaf = s.front && s.kind === 'board';
      if ((!leaf && s.kind !== 'worktop' && !f.cut) || !isFacing.get(f.id) || (f.holes && f.holes.length) || f.pts.length !== 4) continue;
      const sc = f.pts.map((P) => V.screen(P));
      const x0 = Math.min(...sc.map((q) => q[0])); const x1 = Math.max(...sc.map((q) => q[0]));
      const y0 = Math.min(...sc.map((q) => q[1])); const y1 = Math.max(...sc.map((q) => q[1]));
      if (x1 - x0 < 1e-6 || y1 - y0 < 1e-6) continue;
      const corner = (v, a, b) => Math.abs(v - a) < 1e-6 || Math.abs(v - b) < 1e-6;
      if (!sc.every((q) => corner(q[0], x0, x1) && corner(q[1], y0, y1))) continue;
      const C = [0, 1, 2].map((k) => f.pts.reduce((t, P) => t + P[k], 0) / 4);
      const ins = f.pts.map((P) => P.map((v, k) => v + Math.sign(C[k] - v) * HAIR));
      let seen = true;
      if (!xray) {
        const own = facesOf.get(s.key) || emptySet;
        for (let k = 0; k < 4 && seen; k += 1) {
          const A = ins[k]; const B = ins[(k + 1) % 4];
          const sA = V.screen(A); const sB = V.screen(B);
          const got = visibleParts(V, index, A, B, { skip: own, tie: tieFor(s) }).shown
            .reduce((t, [a, b]) => t + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);
          if (got < Math.hypot(sB[0] - sA[0], sB[1] - sA[1]) - 1e-6) seen = false;
        }
      }
      if (seen) wholeFronts.push({ s, x0, y0, x1, y1, cut: Boolean(f.cut), fid: f.id });
    }
  }

  // ── the painter's white, under every line (CLAUDE.md F1 (c)); never on an X-ray ──
  // A slab written as its tinted rect is its own painter's fill (T81 F8: the
  // WORKTOP layer's outline and fill), so it takes no white of its own.
  if (!xray) {
    const tinted = new Set(wholeFronts.filter((w) => w.s.kind === 'worktop').map((w) => w.fid));
    const white = drawingLayer('MASK').fill;
    const masks = occluders.filter((o) => !o.reveal && !tinted.has(o.id)).map((o) => ({
      kind: 'poly', layer: 'MASK', pts: o.p.ring, ...(o.p.holes.length ? { holes: o.p.holes } : {}),
      fill: white, noStroke: true, fillRole: 'mask', src: o.solid.key,
      depth: Math.max(...o.p.ring.map((q) => o.p.depthAt(q)).filter(Number.isFinite)),
    }));
    masks.sort((a, b) => b.depth - a.depth);
    for (const mk of masks) { delete mk.depth; entities.push(mk); }
    census.masks = masks.length;
  }

  // ── the marks that ride on the fronts ──
  const liveKeys = new Map(live.map((s) => [s.key, s]));
  for (const mk of marks) {
    const host = liveKeys.get(mk.host);
    if (!host || !faceOn) continue;
    if (mk.kind === 'bar' && (mode !== 'fronts' || V.name !== 'front' || mk.moved)) continue;
    const skip = facesOf.get(mk.host) || emptySet;
    if (mk.kind === 'path') {
      if (mk.layer === 'DOOR_SWING' && xray) continue;
      const n = mk.pts.length;
      const segs = [];
      for (let i = 0; i + 1 < n; i += 1) segs.push([mk.pts[i], mk.pts[i + 1]]);
      if (mk.closed && n > 2) segs.push([mk.pts[n - 1], mk.pts[0]]);
      const layer = xray && host.front ? 'XRAY_FRONT' : mk.layer;
      const pen = layer === 'XRAY_FRONT' ? 'THIN' : mk.pen;
      const shown = [];
      let whole = true;
      for (const [A, B] of segs) {
        const pieces = xray ? { shown: [[V.screen(A), V.screen(B)]] } : visibleParts(V, index, A, B, { skip });
        const sA = V.screen(A); const sB = V.screen(B);
        const seen = pieces.shown.reduce((t, [a, b]) => t + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);
        if (seen < Math.hypot(sB[0] - sA[0], sB[1] - sA[1]) - 1e-6) whole = false;
        shown.push(...pieces.shown);
      }
      // Seen whole, face on: the face's own entity, as the single front
      // elevation writes it (the shaker's field one rect, a decoration one
      // contour with its ids, *"shaker zostaw jak jest"*).
      if (whole && mk.flat && V.name === 'front') {
        entities.push({ ...mk.flat, layer, pen, src: mk.host });
        continue;
      }
      for (const [a, b] of shown) {
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) continue;
        entities.push(line(a, b, { layer, pen, meta: mk.meta, src: mk.host }));
      }
    } else if (mk.kind === 'handle') {
      if (mode === 'no-fronts' || mk.standing) continue;
      const shown = mk.pts.filter((P) => xray || !pointCovered(V, index, P, skip));
      if (!shown.length) continue;
      if (mk.type === 'knob' || mk.pts.length < 2) {
        const knobD = Number(profile.drawings?.knobDiameter) || 30;
        for (const P of shown) {
          const c = V.screen(P);
          const r = V.ortho ? knobD / 2 : (knobD / 2) * (V.focal / Math.max(1, V.depth(P)));
          entities.push({
            kind: 'circle', layer: 'HANDLES', cx: c[0], cy: c[1], r, pen: 'VISIBLE', src: mk.host, handle: 'knob', ...(mk.fallback ? { defaultHandle: true } : {}),
          });
        }
      } else {
        // A bar: its two fixings, joined by a line of the bar's own length.
        const B = profile.handles?.bar || {};
        const over = Number(B.overhang) || 0;
        const [P0, P1] = [mk.pts[0], mk.pts[mk.pts.length - 1]];
        const len = Math.hypot(P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]) || 1;
        const u = [(P1[0] - P0[0]) / len, (P1[1] - P0[1]) / len, (P1[2] - P0[2]) / len];
        const a = V.screen([P0[0] - u[0] * over, P0[1] - u[1] * over, P0[2] - u[2] * over]);
        const b = V.screen([P1[0] + u[0] * over, P1[1] + u[1] * over, P1[2] + u[2] * over]);
        entities.push(line(a, b, {
          layer: 'HANDLES', pen: 'VISIBLE', src: mk.host, handle: 'bar', ...(mk.fallback ? { defaultHandle: true } : {}),
        }));
        const post = (Number(B.postDiameter) || 10) / 2;
        for (const P of [P0, P1]) {
          const c = V.screen(P);
          const r = V.ortho ? post : post * (V.focal / Math.max(1, V.depth(P)));
          entities.push({
            kind: 'circle', layer: 'HANDLES', cx: c[0], cy: c[1], r, pen: 'THIN', src: mk.host, handle: 'fixing', ...(mk.fallback ? { defaultHandle: true } : {}),
          });
        }
      }
    } else if (mk.kind === 'bar') {
      if (pointCovered(V, index, [mk.x + mk.w / 2, mk.y + mk.h / 2, mk.z], skip)) continue;
      entities.push({
        kind: 'rect', layer: 'HINGE_MARK', x: mk.x, y: mk.y, w: mk.w, h: mk.h, fill: drawingLayer('HINGE_MARK').fill, noStroke: true, src: mk.host, cupY: mk.cupY,
      });
    }
  }
  // The painter's white first, then everything that is drawn on it; a line the
  // pass cut into pieces at every crossing is one line again where it runs on.
  let merged = mergeCollinear(entities);
  for (const { s, x0, y0, x1, y1, cut } of wholeFronts) {
    const on = (e) => e.kind === 'line' && e.src === s.key && Boolean(e.cut) === cut && !e.hidden && (
      (Math.abs(e.y1 - e.y2) < 1e-6 && (Math.abs(e.y1 - y0) < 1e-6 || Math.abs(e.y1 - y1) < 1e-6)
        && Math.min(e.x1, e.x2) >= x0 - 1e-6 && Math.max(e.x1, e.x2) <= x1 + 1e-6)
      || (Math.abs(e.x1 - e.x2) < 1e-6 && (Math.abs(e.x1 - x0) < 1e-6 || Math.abs(e.x1 - x1) < 1e-6)
        && Math.min(e.y1, e.y2) >= y0 - 1e-6 && Math.max(e.y1, e.y2) <= y1 + 1e-6));
    merged = merged.filter((e) => !on(e));
    const W = drawingLayer('WORKTOP');
    // eslint-disable-next-line no-nested-ternary
    const fill = xray || s.kind !== 'worktop' ? null : (cut ? W.cutFill : W.fill);
    merged.push({
      kind: 'rect', layer: s.ink, pen: xray ? 'THIN' : (cut ? 'CUT' : 'VISIBLE'), solid: true, src: s.key,
      ...(s.panelId ? { part: s.panelId } : {}), ...(s.family ? { family: s.family } : {}), ...(cut ? { cut: true } : {}),
      x: x0, y: y0, w: x1 - x0, h: y1 - y0, ...(fill ? { fill } : {}),
    });
  }
  // The painter's white first, then a slab's own tint, then every stroke; on
  // the X-ray the faded shell and fronts first, so the internals are drawn
  // over them in their own inks, as the room's X-ray shows them.
  const ORDER = { MASK: 0, XRAY_CARCASE: 2, XRAY_FRONT: 3 };
  const rank = (e) => (e.fill && e.layer !== 'MASK' ? 1 : (ORDER[e.layer] ?? 4));
  merged.sort((a, b) => rank(a) - rank(b));
  census.lines = merged.filter((e) => e.kind === 'line').length;
  return { entities: merged, census };
}

/**
 * PROJECT ONE RUN.
 *
 * @param {object} group   one `wallGroups()` entry (or a group of one member, the card)
 * @param {object} args
 *   view       'front' | 'plan' | 'section' | 'top-of-card' | 'perspective'
 *   mode       'fronts' | 'no-fronts' | 'xray'
 *   cut        the plan's cut height above FFL (plan), the station along the
 *              wall (section); null for an uncut view
 *   beyond     [from, to] along the wall: a section keeps only this stretch
 *              beyond its plane (the cut cabinets' own depth)
 *   clipX      [x0, x1]: every solid clipped to this stretch (the unit card)
 *   camera     { P, T } for the perspective
 *   hiddenAs   (solid) => true for a solid drawn DASHED, seen or not, and
 *              hiding nothing (the plinth under a plan's cut)
 *   skipSolid  (solid) => true for a solid left out of this view
 *   minEdge    a visible piece shorter than this (drawing mm) is noise
 *   solidsIn   the `runSolids` answer, when the caller already holds it
 *   defaultHandle  T82 F22: the handle drawn on a front the engine fitted
 *              none to (`sheetDefaultHandle`), or null; never drilled
 *   profile, worktops, frontTypeOf, shakerFrame
 * @returns {{entities:Array, solids:Array, census:object, view:object}}
 */
export function projectRun(group, {
  view = 'front', mode = 'fronts', cut = null, beyond = null, clipX = null, camera = null,
  hiddenAs = null, skipSolid = null, minEdge = 0, profile, worktops = [], frontTypeOf = null, shakerFrame = null,
  solidsIn = null, defaultHandle = null,
} = {}) {
  const V = view === 'perspective' ? perspectiveView(camera.P, camera.T) : orthoView(view);
  const scene = buildScene(group, {
    view: V.name, mode, cut, beyond, clipX, skipSolid, profile, worktops, frontTypeOf, shakerFrame, solidsIn, defaultHandle,
  });
  const { entities, census } = renderScene(scene, V, { mode, hiddenAs, minEdge, profile });
  return { entities, solids: scene.live, census, view: V };
}

/**
 * THE ROOM IN PERSPECTIVE (the 3D sheet): every group in its own run frame,
 * moved into the room's (x and z the plan's, y up) by its wall, and rendered
 * through the one pass. A group whose wall's room side the camera is not on
 * shows its back and is left out; a solid that reaches behind the camera's
 * near plane is left out, as a camera cannot see it.
 *
 * @param {Array<{group, wall, worktops}>} runs  each run with its wall (`roomWalls()` entry)
 */
export function projectRoom(runs, {
  camera, mode = 'fronts', profile, frontTypeOf = null, shakerFrame = null, near = 150, extras = [],
} = {}) {
  const V = perspectiveView(camera.P, camera.T);
  const merged = { live: [], faces: [], edges: [], sils: [], marks: [] };
  for (const { group, wall, worktops = [] } of runs) {
    const T = wall ? wallFrame(wall) : identityFrame();
    // The camera on the wall's room side, or the run shows its back.
    if (wall) {
      const off = [camera.P[0] - wall.start.x, camera.P[2] - wall.start.y];
      if (off[0] * wall.inward.x + off[1] * wall.inward.y <= 0) continue;
    }
    const scene = moveScene(buildScene(group, {
      view: 'perspective', mode, profile, worktops, frontTypeOf, shakerFrame,
    }), T);
    // The near plane: a solid any point of which is behind it is not drawn.
    const behind = new Set();
    for (const f of scene.faces) if (f.pts.some((p) => V.depth(p) < near)) behind.add(f.solid.key);
    merged.live.push(...scene.live.filter((s) => !behind.has(s.key)));
    merged.faces.push(...scene.faces.filter((f) => !behind.has(f.solid.key)));
    merged.edges.push(...scene.edges.filter((e) => !behind.has(e.solid.key)));
    merged.sils.push(...scene.sils.filter((s) => !behind.has(s.solid.key)));
    merged.marks.push(...scene.marks.filter((mk) => !behind.has(mk.host)));
  }
  const { entities, census } = renderScene(merged, V, { mode, profile, extras: typeof extras === 'function' ? extras(merged) : extras });
  return { entities, solids: merged.live, census, view: V };
}

/** A wall's run frame in the room's: x along the wall, z into the room, y up. */
function wallFrame(wall) {
  const a = wall.along; const n = wall.inward; const o = wall.start;
  return {
    point: (p) => [o.x + a.x * p[0] + n.x * p[2], p[1], o.y + a.y * p[0] + n.y * p[2]],
    normal: (v) => [a.x * v[0] + n.x * v[2], v[1], a.y * v[0] + n.y * v[2]],
  };
}

function identityFrame() {
  return { point: (p) => p, normal: (v) => v };
}

/**
 * Join the pieces of one line: segments of the same ink, pen and solid that
 * lie on one straight line and touch or overlap become one segment.
 */
export function mergeCollinear(entities) {
  const out = [];
  const groups = new Map();
  for (const e of entities) {
    if (e.kind !== 'line') { out.push(e); continue; }
    const dx = e.x2 - e.x1;
    const dy = e.y2 - e.y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue;
    let ux = dx / len; let uy = dy / len;
    if (ux < -1e-12 || (Math.abs(ux) <= 1e-12 && uy < 0)) { ux = -ux; uy = -uy; }
    const rho = e.x1 * uy - e.y1 * ux;
    const key = [e.layer, e.pen || '', e.cut ? 1 : 0, e.hidden ? 1 : 0, e.src || '', e.meta || '', e.family || '',
      Math.round(Math.atan2(uy, ux) * 1e5), Math.round(rho * 1e3)].join('|');
    if (!groups.has(key)) groups.set(key, { e, ux, uy, spans: [] });
    const t1 = e.x1 * ux + e.y1 * uy;
    const t2 = e.x2 * ux + e.y2 * uy;
    groups.get(key).spans.push([Math.min(t1, t2), Math.max(t1, t2)]);
  }
  for (const { e, ux, uy, spans } of groups.values()) {
    spans.sort((a, b) => a[0] - b[0]);
    const runs = [];
    for (const s of spans) {
      const last = runs[runs.length - 1];
      if (last && s[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], s[1]); else runs.push([...s]);
    }
    // A point on the line, and the line's own offset back to it.
    const rho = e.x1 * uy - e.y1 * ux;
    const px = rho * uy; const py = -rho * ux;
    for (const [t0, t1] of runs) {
      out.push({ ...e, x1: px + ux * t0, y1: py + uy * t0, x2: px + ux * t1, y2: py + uy * t1 });
    }
  }
  return out;
}

// ═══ THE WORDS ON THE SOLIDS: UNIT NUMBERS, APPLIANCES ═════════════════════

/**
 * Where the number goes on a view with the fronts OFF: the widest clear band
 * between the horizontal pieces inside the carcass (shelves, drawer boxes),
 * so it never sits on a shelf line. On a unit with nothing inside, the middle.
 * (Today's `numberSlot`, moved here with its sheet.)
 */
export function numberSlot(result) {
  const H = Number(result.params.height) || 0;
  const G = Number(result.params.board_t) || 18;
  const spans = [];
  for (const p of result.panels || []) {
    if (!p.box) continue;
    if (p.role === 'shelf' || p.part === 'DRAWER-SIDE' || p.role === 'partition' || p.role === 'fixed') {
      spans.push([p.box.y, p.box.y + p.box.h]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  let cursor = G;
  let best = { y: H / 2, size: 0 };
  for (const [a, b] of spans) {
    if (a - cursor > best.size) best = { y: (cursor + a) / 2, size: a - cursor };
    cursor = Math.max(cursor, b);
  }
  if (H - G - cursor > best.size) best = { y: (cursor + H - G) / 2, size: H - G - cursor };
  return best.size > 120 ? best.y : H / 2;
}

/**
 * THE UNIT NUMBERS of a group in a view (CLAUDE.md F2: on every sheet that
 * shows a unit), in the UNIT_NUMBER ink at the set's paper size, on white.
 * Fronts on: the middle of the unit, on its fronts. Fronts off or X-ray: the
 * clear band (`numberSlot`). Plan: the middle of the footprint. Section: in
 * the carcass, low, as T71 placed it.
 */
export function unitNumbers(group, {
  view = 'front', mode = 'fronts', profile, ctx, only = null,
} = {}) {
  const out = [];
  const size = ctx ? ctx.unitNumberHeight : (profile.drawings.set.unitNumberHeight || 3.4);
  const paper = ctx ? ctx.unitNumberHeight / ctx.scale : null;
  for (const m of group?.members || []) {
    if (only && !only(m)) continue;
    const r = m.result;
    const [ox, oy, oz] = memberOffset(m, profile);
    const W = Number(r.params.width) || 0;
    const H = Number(r.params.height) || 0;
    const D = Number(r.params.depth) || 0;
    const num = String(m.unit.params?.unit_num ?? r.unitNum ?? '');
    if (!num) continue;
    let at;
    if (view === 'plan' || view === 'top-of-card') at = [ox + W / 2, oz + D / 2];
    else if (view === 'section') at = [oz + D * 0.55, oy + H * 0.12];
    else if (mode === 'fronts') at = [ox + W / 2, oy + H / 2];
    else at = [ox + W / 2, oy + (applianceLabel(m.unit) ? H * 0.3 : numberSlot(r))];
    out.push({
      kind: 'text', layer: 'UNIT_NUMBER', x: at[0], y: at[1], text: num, height: size, align: 'centre',
      mask: true, weight: 'bold', ...(paper != null ? { paperHeight: paper } : {}), unit: m.unit.id,
    });
  }
  return out;
}

/**
 * THE APPLIANCE a unit is built around, named where it lives: the word on
 * both elevations, and on the fronts-off sheet the dashed space it occupies
 * (the whole opening, or the fridge's aperture under its fixed panel).
 * The kit BODIES themselves are solids (`hardwareInstances.kits`).
 */
export function applianceMarks(group, { mode = 'fronts', profile, ctx }) {
  const out = [];
  for (const m of group?.members || []) {
    const name = applianceLabel(m.unit);
    if (!name) continue;
    const r = m.result;
    const [ox, oy] = memberOffset(m, profile);
    const W = Number(r.params.width) || 0;
    const H = Number(r.params.height) || 0;
    const G = Number(r.params.board_t) || 18;
    const fixed = (r.panels || []).find((p) => p.box && (p.role === 'fixed' || p.id === 'FIXED'));
    const top = fixed ? fixed.box.y : H - G;
    const label = (y, s, k) => ({
      kind: 'text', layer: 'APPLIANCE', x: ox + W / 2, y, text: s, height: ctx.labelHeight * k, align: 'centre',
      paperHeight: (ctx.labelHeight * k) / ctx.scale, mask: true,
    });
    if (mode === 'fronts') {
      out.push(label(oy + Math.min(top, H) * 0.3, `${name} behind`, 0.9));
      continue;
    }
    if (mode === 'no-fronts' && m.unit.type !== 'SINK') {
      out.push({
        kind: 'rect', layer: 'APPLIANCE', x: ox + G, y: oy + G, w: W - G * 2, h: Math.max(0, top - G), pen: 'HIDDEN', hidden: true,
      });
    }
    out.push(label(oy + Math.min(top, H) * 0.62, name, 1));
    if (fixed) out.push(label(oy + top * 0.52, `aperture ${Math.round(top - G)}`, 0.85));
  }
  return out;
}

