/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F6 (CLAUDE.md T84 PART D): THE CAMERA BAR'S PLACES, IN PLAIN NUMBERS
//
// CLAUDE.md T84 F6: *"CameraBar at the scene's foot: Plan, Iso, A, B, C, D,
// Frame selection ... Through the room's camera and controls (the registered
// handle of 3d/viewHandle.js, the one the walk reads as window.__cc.views.room;
// the component uses the same registration through a small exported
// lib/cameraPresets.js: the wall's facing direction from project.room and the
// wall index, the plan from above at the room's centre, the iso from the first
// run's corner, Frame selection fits the selected units' boxes with 10 %
// margin, PROPOSED)."*
//
// PURE: no three.js, no React, no store, nothing read at import time. Every
// answer is a pair of plain points in the room's own world (metres, Y up, the
// room centred on the origin, exactly as 3d/Scene.jsx draws it: plan (x, y) in
// millimetres becomes world (X, Z) = mm(x - centre.x), mm(y - centre.y), the
// centre being engine/room.js roomBounds' own). The walls are the engine's own
// (engine/room.js realWalls: the plaster, never an island's face), the runs are
// the engine's own (engine/runs.js buildRuns), the wall letters are the drawing
// set's own (engine/drawings/wallElevation.js wallLabel: "Wall 0 is Wall A").
//
// PARKED, NOT FLOWN: a press puts the camera and the orbit target where they
// belong in one step (placeCamera below), so the walk photographs the same
// pixels every time. This is NOT src/3d/cameraPresets.js (T59's three places
// to stand, which PRO never uses: test/turn65-f4-the-view.test.js), and it
// imports nothing from it.
//
// The six places, each FITTED to what it shows by fitPoints below, the same
// arithmetic as Frame selection, with the profile's one margin
// (profile.ui.studio.frameMargin, read by the caller and handed in):
//   plan   from straight above, looking down at the room's centre; the whole
//          room's plan, walls' tops included, in the picture (screen up is
//          world -Z, so wall A stands at the top, as three's own lookAt turns a
//          camera that looks straight down);
//   iso    the isometric direction (the cube's diagonal: 45 degrees between
//          the two walls, atan(1 / sqrt 2) above the floor) looking INTO the
//          room corner the first run stands in, from across the room, the whole
//          room in the picture;
//   a..d   walls 0 to 3, seen square on from inside the room, level with the
//          wall's middle, the whole wall in the picture.
// Frame selection keeps the CURRENT direction and fits the units' boxes.

import { DEFAULT_ROOM, realWalls, roomBounds } from '../../../engine/room.js';
import { buildRuns } from '../../../engine/runs.js';
import { wallLabel } from '../../../engine/drawings/wallElevation.js';
import { mm } from '../../../3d/constants.js';

/** The camera bar's six places, in the bar's order. */
export const STUDIO_VIEWS = Object.freeze(['plan', 'iso', 'a', 'b', 'c', 'd']);

/** A to D: walls 0 to 3, lettered as the drawing set letters them. */
export const WALL_VIEWS = Object.freeze([0, 1, 2, 3].map((wall) => Object.freeze({
  id: wallLabel(wall).toLowerCase(),
  wall,
  label: wallLabel(wall),
})));

const UP = Object.freeze([0, 1, 0]);

// ─── Plain vectors ───────────────────────────────────────────────────────────
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a) => Math.hypot(a[0], a[1], a[2]);

function vec(v) {
  if (!Array.isArray(v) || v.length < 3) return null;
  const out = [Number(v[0]), Number(v[1]), Number(v[2])];
  return out.every(Number.isFinite) ? out : null;
}

/** The unit vector along `v`, or null when there is no direction to speak of. */
export function normalize(v) {
  const a = vec(v);
  if (!a) return null;
  const n = length(a);
  return n > 1e-9 ? scale(a, 1 / n) : null;
}

/**
 * The camera's own axes for a view along `direction` (from the target to the
 * eye), built as three's Object3D.lookAt builds them with the world's up: the
 * screen's right, the screen's up, and `back` (the direction itself). Looking
 * straight down, three nudges the eye toward +Z, which keeps +X to the right
 * and turns world -Z to the top of the screen: the same here.
 */
function viewBasis(direction) {
  const back = normalize(direction) || [0, 0, 1];
  let right = cross(UP, back);
  right = length(right) > 1e-9 ? scale(right, 1 / length(right)) : [1, 0, 0];
  return { right, up: cross(back, right), back };
}

/** The smallest box holding every box given (`{ min: [x,y,z], max: [x,y,z] }`), or null. */
export function unionBoxes(boxes) {
  let min = null;
  let max = null;
  for (const box of boxes || []) {
    const lo = vec(box?.min);
    const hi = vec(box?.max);
    if (!lo || !hi) continue;
    const low = lo.map((v, i) => Math.min(v, hi[i]));
    const high = lo.map((v, i) => Math.max(v, hi[i]));
    min = min ? min.map((v, i) => Math.min(v, low[i])) : low;
    max = max ? max.map((v, i) => Math.max(v, high[i])) : high;
  }
  return min ? { min, max } : null;
}

/** The eight corners of a box. */
export function boxCorners(box) {
  const out = [];
  for (const x of [box.min[0], box.max[0]]) {
    for (const y of [box.min[1], box.max[1]]) {
      for (const z of [box.min[2], box.max[2]]) out.push([x, y, z]);
    }
  }
  return out;
}

/** The middle of a box. */
function boxCentre(box) {
  return box.min.map((v, i) => (v + box.max[i]) / 2);
}

/**
 * Where the eye stands so that every point is in the picture, looking at `at`
 * along `direction` (from the target to the eye), with `margin` of air.
 *
 * A point offset `v` from the target, at depth `z = v . back` toward the eye,
 * lands at `|v . right| / (distance - z)` across the frame; it is inside when
 * that is at most the half-angle's tangent (the vertical `fovDeg`, and the same
 * times `aspect` across). The margin grows every offset by `1 + margin` before
 * the test, so a 10 % margin leaves the points inside 1 / 1.1 of the frame.
 * The distance is the smallest that holds every point, kept at least `near`
 * in front of the nearest one, then held between the controls' own
 * `minDistance` and `maxDistance` (the orbit would clamp it there anyway).
 *
 * @returns {{ from: number[], at: number[], distance: number } | null}
 */
export function fitPoints(points, {
  at = null, direction = null, fovDeg, aspect, margin = 0, near = 0, minDistance = 0, maxDistance = Infinity,
} = {}) {
  const pts = (points || []).map(vec).filter(Boolean);
  const fov = Number(fovDeg);
  const ratio = Number(aspect);
  if (!pts.length || !(fov > 0 && fov < 180) || !(ratio > 0)) return null;
  const target = vec(at) || boxCentre(unionBoxes(pts.map((p) => ({ min: p, max: p }))));
  const { right, up, back } = viewBasis(direction);
  const tanV = Math.tan((fov * Math.PI) / 360);
  const tanH = tanV * ratio;
  const grow = 1 + Math.max(0, Number(margin) || 0);
  const ahead = Math.max(0, Number(near) || 0);
  let distance = 0;
  for (const p of pts) {
    const v = sub(p, target);
    const z = dot(v, back);
    distance = Math.max(
      distance,
      (Math.abs(dot(v, right)) * grow) / tanH + z,
      (Math.abs(dot(v, up)) * grow) / tanV + z,
      z + ahead,
    );
  }
  const lowest = Math.max(0, Number(minDistance) || 0);
  const highest = Number(maxDistance) > 0 ? Number(maxDistance) : Infinity;
  distance = Math.min(Math.max(distance, lowest), highest);
  return { from: add(target, scale(back, distance)), at: target, distance };
}

/** fitPoints over the boxes' union: the target is the union's middle. */
export function fitBoxes(boxes, options = {}) {
  const box = unionBoxes(boxes);
  if (!box) return null;
  return fitPoints(boxCorners(box), { ...options, at: boxCentre(box) });
}

/**
 * The room in the scene's world: its height, its box (floor to the walls'
 * tops, over its plan bounds) and its real walls with their ends and their
 * inward normals, all in metres about the room's centre.
 */
export function roomGeometry(room) {
  const bounds = roomBounds(room);
  const height = mm(Number(room?.height) || DEFAULT_ROOM.height);
  // `+ 0` turns the engine's -0 (a normal's zero half, `nx = -uy`) into 0: plain numbers.
  const at = (p) => [mm(p.x - bounds.centre.x) + 0, mm(p.y - bounds.centre.y) + 0];
  const walls = realWalls(room).map((w) => ({
    index: w.index,
    width: w.width,
    start: at(w.start),
    end: at(w.end),
    inward: [w.inward.x + 0, w.inward.y + 0],
  }));
  const [minX, minZ] = at({ x: bounds.minX, y: bounds.minY });
  const [maxX, maxZ] = at({ x: bounds.maxX, y: bounds.maxY });
  return { height, walls, box: { min: [minX, 0, minZ], max: [maxX, height, maxZ] } };
}

/** Plan: straight down at the room's centre, the whole room in the picture. */
export function planView(room, options = {}) {
  return fitBoxes([roomGeometry(room).box], { ...options, direction: UP });
}

/**
 * Wall `index` (0 = A), square on from inside the room: the eye on the wall's
 * inward normal through its middle, level with half the room's height, the
 * wall's four corners in the picture. Null when the room has no such wall.
 */
export function wallView(room, index, options = {}) {
  const { height, walls } = roomGeometry(room);
  const wall = walls[Number(index)];
  if (!wall) return null;
  const [sx, sz] = wall.start;
  const [ex, ez] = wall.end;
  const points = [[sx, 0, sz], [sx, height, sz], [ex, 0, ez], [ex, height, ez]];
  return fitPoints(points, {
    ...options,
    at: [(sx + ex) / 2, height / 2, (sz + ez) / 2],
    direction: [wall.inward[0], 0, wall.inward[1]],
  });
}

/**
 * The room corner the FIRST RUN stands in: the engine's own runs
 * (engine/runs.js buildRuns) on the room's real walls, the first by wall order
 * (A first) and along its wall, then whichever end of its wall it is nearer.
 * Corner i is where wall i starts. No run (an empty room, or only islands and
 * free panels): corner 0, where wall A starts.
 */
export function firstRunCorner(room, units = [], profile = null) {
  const walls = realWalls(room);
  if (!walls.length) return 0;
  let runs = [];
  try {
    runs = profile && Array.isArray(units) && units.length ? buildRuns(units, profile) : [];
  } catch {
    runs = [];
  }
  const run = runs
    .filter((r) => Number.isInteger(r.wall) && r.wall >= 0 && r.wall < walls.length)
    .sort((p, q) => (p.wall - q.wall) || (p.left - q.left))[0];
  if (!run) return 0;
  const toStart = Math.max(0, Number(run.left) || 0);
  const toEnd = Math.max(0, walls[run.wall].width - (Number(run.right) || 0));
  return toStart <= toEnd ? run.wall : (run.wall + 1) % walls.length;
}

/**
 * Iso: looking into the first run's corner (firstRunCorner) along the cube's
 * diagonal of that corner: halfway between its two walls' inward normals,
 * atan(1 / sqrt 2) above the floor, the whole room in the picture.
 */
export function isoView(room, options = {}) {
  const { walls, box } = roomGeometry(room);
  const n = walls.length;
  const corner = firstRunCorner(room, options.units, options.profile);
  const into = walls[corner]?.inward || [0, 1];
  const before = walls[(corner - 1 + n) % n]?.inward || into;
  const level = normalize([into[0] + before[0], 0, into[1] + before[1]])
    || normalize([into[0], 0, into[1]]) || [0, 0, 1];
  return fitBoxes([box], { ...options, direction: [level[0], Math.SQRT1_2, level[2]] });
}

/** One of STUDIO_VIEWS by its id: { from, at, distance } or null. */
export function viewPlacement(id, room, options = {}) {
  if (id === 'plan') return planView(room, options);
  if (id === 'iso') return isoView(room, options);
  const wall = WALL_VIEWS.find((w) => w.id === id);
  return wall ? wallView(room, wall.wall, options) : null;
}

// ─── The live view (3d/viewHandle.js registers it; read at the press) ────────

/** The room's registered view, `window.__cc.views.room`: { gl, scene, camera, controls, three }, or null. */
export function roomView(win = (typeof window === 'undefined' ? null : window)) {
  return win?.__cc?.views?.room || null;
}

/** The live camera's lens and the orbit's own limits, as plain numbers. */
export function lensOf(view) {
  const camera = view?.camera;
  const controls = view?.controls;
  const most = Number(controls?.maxDistance);
  return {
    fovDeg: Number(camera?.fov),
    aspect: Number(camera?.aspect),
    near: Number(camera?.near) || 0,
    minDistance: Number(controls?.minDistance) || 0,
    maxDistance: most > 0 ? most : Infinity,
  };
}

/** Which way the camera looks from now: from the orbit target to the eye, a unit vector. */
export function viewDirection(view) {
  const p = view?.camera?.position;
  if (!p) return null;
  const t = view?.controls?.target;
  const at = t ? [t.x, t.y, t.z] : [0, 0, 0];
  return normalize([p.x - at[0], p.y - at[1], p.z - at[2]]);
}

/**
 * The scene objects that ARE the units: the outermost object carrying
 * `userData.ccUnitId` (3d/UnitView.jsx marks each cabinet's group so) whose id
 * is asked for, every unit when `ids` is null. A tool subtree (`ccHelper`) is
 * never walked, and nothing inside a unit is collected twice.
 */
export function unitRoots(scene, ids = null) {
  const wanted = Array.isArray(ids) ? new Set(ids) : null;
  const out = [];
  const walk = (object) => {
    if (!object || object.userData?.ccHelper) return;
    const id = object.userData?.ccUnitId;
    if (id != null) {
      if (!wanted || wanted.has(id)) out.push(object);
      return;
    }
    for (const child of object.children || []) walk(child);
  };
  walk(scene);
  return out;
}

/**
 * Put the camera and the orbit target at a place, in one step (no flight).
 * The orbit's own update turns the camera and tells the canvas to draw (drei's
 * OrbitControls answers its change event with an invalidate). True when it moved.
 *
 * The room's orbit is damped (3d/Scene.jsx `enableDamping`): a drag that has
 * just ended is still turning it a little every frame. That remainder is spent
 * FIRST, by one update with the damping off (the controls then apply what is
 * left of the turn and the pan at once and zero it), and only then is the
 * camera stood at the place, so a press right after an orbit lands exactly
 * where it says and does not drift off it.
 */
export function placeCamera(view, place) {
  const camera = view?.camera;
  const from = vec(place?.from);
  const at = vec(place?.at);
  if (!camera?.position?.set || !from || !at) return false;
  const controls = view?.controls;
  if (controls?.enableDamping === true && typeof controls.update === 'function') {
    controls.enableDamping = false;
    try {
      controls.update();
    } finally {
      controls.enableDamping = true;
    }
  }
  camera.position.set(from[0], from[1], from[2]);
  if (controls?.target?.set) {
    controls.target.set(at[0], at[1], at[2]);
    controls.update?.();
  } else {
    camera.lookAt?.(at[0], at[1], at[2]);
  }
  return true;
}
