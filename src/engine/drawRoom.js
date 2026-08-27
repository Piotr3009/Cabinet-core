// ─── THE DRAWN ROOM (turn 53, CLAUDE.md F10) ────────────────────────────────
//
// The owner, 27.08.2026:
//
//   *"teraz rysowanie — prawdziwe room, od nowa, robimy jak w CAD: linia od
//   punktu zero, rysujesz w którym kierunku i wpisujesz numer, enter — i linia
//   narysowana. później następna linia, kierunek zawsze 90 stopni, i to samo:
//   wpisujesz milimetry, enter, etc. na końcu ostatnią linię łapiesz i łączysz
//   — zawsze łączysz, taki catch, żeby pokój był zawsze połączony (jak w życiu
//   ściany)."*
//
// This module is the DRAWING and nothing else: a path of ortho segments, the
// catch, the close, and the faults. It knows nothing about React, nothing about
// the store and nothing about three.js — which is what lets the whole flow be
// argued in a node test before a pixel of it is drawn.
//
// ─── THE FRAME ──────────────────────────────────────────────────────────────
//
// The same frame `room.corners` is in: x to the right, y away from the viewer,
// millimetres, origin at the first point. So a finished path IS a corner list
// and there is no conversion — *"a closed outline saves to `project.room
// .corners` — the shape `migrateRoom` already speaks."*
//
// ─── ORTHO, ALWAYS ─────────────────────────────────────────────────────────
//
// *"kierunek zawsze 90 stopni."*  Four directions and no others; the cursor
// picks which by where it is, never by how far.

import { MIN_WALL_LENGTH } from './room.js';

/** The four, in the order a compass reads them. */
export const DIRS = Object.freeze([
  { id: 'E', dx: 1, dy: 0, label: 'right' },
  { id: 'S', dx: 0, dy: 1, label: 'away' },
  { id: 'W', dx: -1, dy: 0, label: 'left' },
  { id: 'N', dx: 0, dy: -1, label: 'toward you' },
]);

export const dirOf = (id) => DIRS.find((d) => d.id === id) || null;

/**
 * The smallest wall this app will draw.
 *
 * It is `room.js`'s own floor, IMPORTED and not restated: a drawing that let a
 * 60 mm wall be typed would be a drawing whose room the room engine then
 * refuses, and two numbers that must agree are one number in this codebase.
 */
export const MIN_SEGMENT_MM = MIN_WALL_LENGTH;

/**
 * Which of the four a cursor delta means.
 *
 * The BIGGER component wins, which is what makes a hand that is roughly right
 * exactly right — the same "snap to the axis you meant" every CAD does. A dead
 * centre tie answers E, so there is always an answer.
 */
export function dirFromCursor(dx, dy) {
  const x = Number(dx) || 0;
  const y = Number(dy) || 0;
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? dirOf('W') : dirOf('E');
  return y < 0 ? dirOf('N') : dirOf('S');
}

const pt = (x, y) => ({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });

/** A fresh path: one point, at the origin the owner draws from. */
export function newPath(origin = { x: 0, y: 0 }) {
  return [pt(Number(origin.x) || 0, Number(origin.y) || 0)];
}

/** Where the pen is. */
export const penOf = (path) => (path?.length ? path[path.length - 1] : null);

/**
 * One segment: a direction and a number of millimetres, committed by Enter.
 *
 * Returns the NEW path, or `{ error }` — a length that is zero, negative or
 * under the app's own minimum wall is refused with the number in the sentence,
 * because a wall you cannot build is not a wall.
 */
export function addSegment(path, dirId, lengthMm) {
  const dir = dirOf(dirId);
  const from = penOf(path);
  if (!dir || !from) return { error: 'Point the cursor at a direction first.' };
  const len = Number(lengthMm);
  if (!Number.isFinite(len) || len <= 0) {
    return { error: 'Type how long the wall is, in millimetres.' };
  }
  if (len < MIN_SEGMENT_MM) {
    return { error: `${Math.round(len)} mm is shorter than the ${MIN_SEGMENT_MM} mm this app will draw.` };
  }
  return { path: [...path, pt(from.x + dir.dx * len, from.y + dir.dy * len)] };
}

/** Backspace / Undo: the last segment comes off, never the origin. */
export function undoSegment(path) {
  return path && path.length > 1 ? path.slice(0, -1) : path;
}

/**
 * THE CATCH — *"na końcu ostatnią linię łapiesz i łączysz — zawsze łączysz,
 * taki catch, żeby pokój był zawsze połączony (jak w życiu ściany)."*
 *
 * Near the start point, the pen snaps to it and the drawing says so. `withinMm`
 * is a distance in the DRAWING's own millimetres, so it means the same thing at
 * every zoom — a catch that changed size with the view would catch on a big
 * room and never on a small one.
 */
export function catchesStart(path, point, withinMm = 250) {
  if (!path || path.length < 3 || !point) return false;
  const a = path[0];
  const dx = (Number(point.x) || 0) - a.x;
  const dy = (Number(point.y) || 0) - a.y;
  return Math.hypot(dx, dy) <= Math.max(0, Number(withinMm) || 0);
}

/**
 * CLOSE — the minimal ortho path home.
 *
 * DECISION TAKEN for the owner (veto in one line): a **Close** button exists
 * beside the catch and does the same thing without the hand — ONE segment where
 * the pen is already aligned with the origin, an L of TWO where it is not. The
 * catch made one-click, and the room is closed either way, which is his
 * *"zawsze łączysz"*.
 *
 * The L turns through the axis the pen is NOT on, so the two new walls are
 * ortho like every other one.
 *
 * @returns {{path:Array, added:number}|{error:string}}
 */
export function closePath(path) {
  if (!path || path.length < 3) {
    return { error: 'Draw at least three walls before closing the room.' };
  }
  const a = path[0];
  const p = penOf(path);
  const dx = a.x - p.x;
  const dy = a.y - p.y;
  const eps = 1e-6;
  if (Math.abs(dx) <= eps && Math.abs(dy) <= eps) return { path, added: 0 };
  if (Math.abs(dx) <= eps || Math.abs(dy) <= eps) {
    // Already aligned: one wall home.
    return { path: [...path, pt(a.x, a.y)], added: 1 };
  }
  // ─── AN L, AND THE TURN IS CHOSEN, NOT ASSUMED ────────────────────────
  //
  // There are two ortho ways home — turn on x then y, or y then x — and on a
  // U-shaped drawing one of them lays the closing wall ON TOP of a wall that
  // is already there. That is the house overlap law broken by the app itself,
  // and it is worse than it looks: the doubled-back corner does not turn, so
  // the corner list quietly ABSORBS it and the owner's 3000 mm room comes out
  // 1200 mm wide with no complaint anywhere.
  //
  // So both are built and both are asked. The first that closes a real room
  // is taken; where NEITHER does, the close refuses and says so, because a
  // silent wrong room is the one outcome this feature cannot have.
  const last = path[path.length - 2];
  const lastRanX = Math.abs(p.x - last.x) > eps;
  // The first candidate turns on the axis the LAST wall did not run along, so
  // no two consecutive walls are colinear where the drawing allows it.
  const candidates = lastRanX
    ? [pt(p.x, a.y), pt(a.x, p.y)]
    : [pt(a.x, p.y), pt(p.x, a.y)];
  for (const corner of candidates) {
    const tried = [...path, corner, pt(a.x, a.y)];
    if (!pathFaults(tried).length) return { path: tried, added: 2 };
  }
  return {
    error: 'These walls cannot be closed with two square walls without one lying on another — '
      + 'take the last wall off, or draw back toward the start.',
  };
}

/** Do two segments cross, other than at a shared end? */
function crosses(a1, a2, b1, b2) {
  const eps = 1e-9;
  const d = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const on = (p, q, r) => Math.abs(d(p, q, r)) <= eps
    && Math.min(p.x, q.x) - eps <= r.x && r.x <= Math.max(p.x, q.x) + eps
    && Math.min(p.y, q.y) - eps <= r.y && r.y <= Math.max(p.y, q.y) + eps;
  const d1 = d(a1, a2, b1);
  const d2 = d(a1, a2, b2);
  const d3 = d(b1, b2, a1);
  const d4 = d(b1, b2, a2);
  if (((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps))
    && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))) return true;
  return on(a1, a2, b1) || on(a1, a2, b2) || on(b1, b2, a1) || on(b1, b2, a2);
}

/**
 * Every reason this outline cannot be a room, in the owner's own terms.
 *
 * *"Validation: zero/negative lengths refuse; a self-crossing outline refuses
 * with a message; minimum 4 segments."*
 *
 * @param {Array} path  a CLOSED path — the last point equal to the first, or
 *                      the caller's own closing implied
 * @returns {string[]}
 */
export function pathFaults(path) {
  const faults = [];
  const ring = ringOf(path);
  // ─── A WALL THAT DOUBLES BACK ─────────────────────────────────────────
  //
  // Checked on the RING and not on the corner list, because the corner list is
  // exactly where this fault disappears: a 180° turn has no cross product, so
  // `cornersOfPath` drops the corner and the doubled wall is absorbed into its
  // neighbour. The room that comes out is smaller than the one that was drawn
  // and nothing anywhere says so. Caught here, it is a sentence.
  const nr = ring.length;
  for (let i = 0; i < nr; i += 1) {
    const prev = ring[(i - 1 + nr) % nr];
    const here = ring[i];
    const next = ring[(i + 1) % nr];
    const ax = here.x - prev.x;
    const ay = here.y - prev.y;
    const bx = next.x - here.x;
    const by = next.y - here.y;
    if (Math.abs(ax * by - ay * bx) < 1e-6 && ax * bx + ay * by < 0) {
      faults.push(`Wall ${i + 1} doubles back over wall ${i === 0 ? nr : i} — a room cannot fold onto itself.`);
      return faults;
    }
  }

  const pts = cornersOfPath(path);
  if (pts.length < 4) {
    faults.push('A room needs at least four walls.');
    return faults;
  }
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < MIN_SEGMENT_MM) {
      faults.push(`Wall ${i + 1} is ${Math.round(len)} mm — shorter than the ${MIN_SEGMENT_MM} mm this app will draw.`);
    }
  }
  // Self-crossing: any two walls that are not neighbours.
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue;              // the closing pair
      if (crosses(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) {
        faults.push(`Walls ${i + 1} and ${j + 1} cross — a room cannot fold through itself.`);
        return faults;
      }
    }
  }
  return faults;
}

/**
 * The path as a RING: the points as drawn, with the repeat of the start point
 * and any duplicate dropped — and every colinear point KEPT. It is what the
 * hand drew, before any tidying.
 */
function ringOf(path) {
  const out = [];
  for (const q of (path || [])) {
    const here = pt(Number(q.x) || 0, Number(q.y) || 0);
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - here.x) < 1e-6 && Math.abs(last.y - here.y) < 1e-6) continue;
    out.push(here);
  }
  if (out.length > 1) {
    const a = out[0];
    const z = out[out.length - 1];
    if (Math.abs(a.x - z.x) < 1e-6 && Math.abs(a.y - z.y) < 1e-6) out.pop();
  }
  return out;
}

/**
 * The path as a CORNER LIST — the shape `migrateRoom` already speaks.
 *
 * The closing point is dropped (a corner list does not repeat its first point),
 * and so is any point that repeats the one before it or lies on the straight
 * line between its neighbours: two colinear walls are one wall, and a room with
 * a corner that does not turn is a room with a wall drawn twice.
 */
export function cornersOfPath(path) {
  const raw = (path || []).map((p) => pt(Number(p.x) || 0, Number(p.y) || 0));
  const out = [];
  for (const p of raw) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 1e-6 && Math.abs(last.y - p.y) < 1e-6) continue;
    out.push(p);
  }
  // The closing repeat.
  if (out.length > 1) {
    const a = out[0];
    const z = out[out.length - 1];
    if (Math.abs(a.x - z.x) < 1e-6 && Math.abs(a.y - z.y) < 1e-6) out.pop();
  }
  // …and the corners that do not turn.
  const kept = [];
  for (let i = 0; i < out.length; i += 1) {
    const prev = out[(i - 1 + out.length) % out.length];
    const here = out[i];
    const next = out[(i + 1) % out.length];
    const cross = (here.x - prev.x) * (next.y - here.y) - (here.y - prev.y) * (next.x - here.x);
    if (Math.abs(cross) > 1e-6) kept.push(here);
  }
  return kept.length >= 3 ? kept : out;
}

/** The bounding box of a path, for a plan that has to frame itself. */
export function pathBounds(path) {
  const pts = (path || []);
  if (!pts.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, depth: 0 };
  const xs = pts.map((p) => Number(p.x) || 0);
  const ys = pts.map((p) => Number(p.y) || 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX, minY, maxX, maxY, width: maxX - minX, depth: maxY - minY,
  };
}
