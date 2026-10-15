/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── THE ISLAND, PLANNED FROM ABOVE (owner, 14.10.2026) ─────────────────────
//
// The owner, 14.10.2026: *"przy dodaniu wyspy chciałbym żeby był widok z
// góry i proponowana na podłodze plan wyspy ... dodaj szafkę i wtedy ona się
// pojawia na tym planie coś jak prawdziwa szafka ale bez wstawienia ... i
// dopiero jak się wstawi to wtedy pokaże się cała wyspa."*
//
// A PLAN is a draft that nothing in the project knows about: the island's
// OUTER FOOTPRINT (`{cx, cy, w, d, rotation}`, the rectangle drawn on the
// floor: the cabinets' fronts) and a list of cabinets on its four faces, each
// a width and a type and nothing more. This module answers the plan's
// questions as arithmetic on the room: where the cabinets stand, how far each
// face is from whatever is in front of it. It computes no cabinet and draws
// nothing; the store inserts the plan (`insertIslandPlan`) through the same
// `setRoom` and `addUnit` every island and every cabinet already go through,
// so nothing is cut differently for having been planned.
//
// ─── 15.10.2026: THE RECTANGLE IS THE ISLAND, THE CABINETS STAND INSIDE IT ──
//
// The owner: *"jak mam plan wyspy to nie dziala, wstawia mi szafki na zewnatrz
// wyspy zamiast w srodku, to jest za trudne, powinno byc mega latwe."*  The
// 14.10 plan held T75's CORE (the spine the cabinets stand against, outside
// it), so a 1800 x 900 plan grew into a 1800 x 2036 island once two rows were
// on it. Now the plan's rectangle is what the eye sees on the floor, and the
// core is DERIVED from it (`planCore`): each face's cabinets take a BAND of
// the rectangle (the wall gap plus their deepest cabinet) from that edge
// inward, and the core is what is left in the middle. The faces the cabinets
// stand on are the core's (T75's `islandFaces`, untouched), so the store
// inserts exactly what it always inserted; only the numbers that reach it
// are the core's. A rectangle too small for its cabinets (the bands meet, or
// leave less than CORE_MIN_MM of core) is refused in words, never clipped.

import {
  roomWalls, roomIslands, islandFaces, islandCorners, boxCorners, roomBoxes, realWalls,
  normalizeRoom, wallPlanObstacles, ISLAND_FACES, pointInPolygon,
} from './room.js';
import { unitFootprint } from './collision.js';
import { getUnitType, defaultParamsFor } from './types.js';
import { wallGapOf } from './runs.js';
import { newIsland } from './island.js';

export const PLAN_FACES = ISLAND_FACES;
/** The planned island's own id while it is only a draft. */
const DRAFT_ISLAND_ID = 'island_draft';
/** The least core a plan may leave between its bands, on either axis. */
export const CORE_MIN_MM = 50;

const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/**
 * The band each face's cabinets take of the rectangle, from that edge inward:
 * the wall gap plus the deepest cabinet on the face; 0 where the face is bare.
 */
export function planBands(draft, profile) {
  const gap = wallGapOf({ params: {} }, profile);
  const out = Object.fromEntries(PLAN_FACES.map((f) => [f, 0]));
  for (const cab of draft?.cabs || []) {
    if (!(cab.face in out)) continue;
    out[cab.face] = Math.max(out[cab.face], gap + planCabDepth(cab, profile));
  }
  return out;
}

/**
 * THE CORE the plan's rectangle leaves: T75's island record, what the store
 * inserts. In the island's own frame (u along w, v along d; A at v = -d/2, B
 * at +d/2, E1 at u = -w/2, E2 at +w/2, `islandCorners`) the core spans
 * [-w/2 + bandE1, w/2 - bandE2] by [-d/2 + bandA, d/2 - bandB]. Its `w` and
 * `d` may come out small or negative: `planCoreRefusal` says so in words.
 */
export function planCore(draft, profile) {
  const b = planBands(draft, profile);
  const w = num(draft.w, 0) - b.E1 - b.E2;
  const d = num(draft.d, 0) - b.A - b.B;
  const uc = (b.E1 - b.E2) / 2;
  const vc = (b.A - b.B) / 2;
  const rad = (num(draft.rotation, 0) * Math.PI) / 180;
  const cos = Math.cos(rad); const sin = Math.sin(rad);
  return {
    id: draft.islandId || DRAFT_ISLAND_ID,
    cx: Math.round((num(draft.cx, 0) + uc * cos - vc * sin) * 10) / 10,
    cy: Math.round((num(draft.cy, 0) + uc * sin + vc * cos) * 10) / 10,
    w: Math.round(w * 10) / 10,
    d: Math.round(d * 10) / 10,
    rotation: num(draft.rotation, 0),
    bands: b,
  };
}

/** The sentence a rectangle too small for its cabinets is refused with, or null. */
export function planCoreRefusal(draft, profile) {
  const core = planCore(draft, profile);
  const needW = num(draft.w, 0) - core.w + CORE_MIN_MM;
  const needD = num(draft.d, 0) - core.d + CORE_MIN_MM;
  if (core.w < CORE_MIN_MM && core.d < CORE_MIN_MM) {
    return `The island is ${Math.round(num(draft.w, 0))} x ${Math.round(num(draft.d, 0))} mm; its cabinets need at least ${Math.ceil(needW)} x ${Math.ceil(needD)} mm. Make it bigger, or take a face off.`;
  }
  if (core.w < CORE_MIN_MM) {
    return `The island is ${Math.round(num(draft.w, 0))} mm long; the cabinets on its ends need at least ${Math.ceil(needW)} mm. Make it longer, or take an end off.`;
  }
  if (core.d < CORE_MIN_MM) {
    return `The island is ${Math.round(num(draft.d, 0))} mm deep; the cabinets on faces A and B need at least ${Math.ceil(needD)} mm. Make it deeper, or take a face off.`;
  }
  return null;
}

/** THE OUTER rectangle's faces (what the eye sees on the floor, what the clearances are measured from). */
export function planOuterFaces(draft) {
  return islandFaces({ ...draft, id: draft.islandId || DRAFT_ISLAND_ID });
}

/** The CORE's faces: the records the cabinets stand on (T75's `islandFaces`, untouched). */
function planFaces(draft, profile) {
  return islandFaces(planCore(draft, profile));
}

function planFace(draft, face, profile) {
  return planFaces(draft, profile).find((f) => f.face === face) || null;
}

/** A cabinet's depth on the plan: its own, else the type's default. */
function planCabDepth(cab, profile) {
  if (num(cab?.depth, 0) > 0) return Number(cab.depth);
  try { return num(defaultParamsFor(cab.type, profile)?.depth, 560); } catch { return 560; }
}

/**
 * The plan's cabinets, each placed on its face in list order: the first at
 * the face's start, every next one against the one before. Returns one row
 * per cabinet with its `x` along the face and its plan footprint.
 */
export function planCabinets(draft, profile) {
  const faces = planFaces(draft, profile);
  const gap = wallGapOf({ params: {} }, profile);
  const used = Object.fromEntries(PLAN_FACES.map((f) => [f, 0]));
  return (draft.cabs || []).map((cab) => {
    const face = faces.find((f) => f.face === cab.face) || faces[0];
    const x = used[face.face];
    const width = num(cab.w, 600);
    used[face.face] += width;
    const depth = planCabDepth(cab, profile);
    return {
      cab, face: face.face, x, width, depth,
      poly: unitFootprint({ wall: face, x, width, depth, backInset: gap }),
      overhang: Math.max(0, used[face.face] - face.width),
    };
  });
}

/** How much of a face is still free, in mm (negative when the plan overfills it): the core's face, which the other faces' bands shorten. */
export function planFaceFree(draft, face, profile) {
  const f = planFace(draft, face, profile);
  if (!f) return 0;
  const used = (draft.cabs || []).filter((c) => c.face === face).reduce((s, c) => s + num(c.w, 600), 0);
  return Math.round(f.width - used);
}

const rayHit = (p, n, a, b) => {
  // p + t n  meets  a + s (b - a), t > 0, 0 <= s <= 1
  const dx = b.x - a.x; const dy = b.y - a.y;
  const den = n.x * dy - n.y * dx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((a.x - p.x) * dy - (a.y - p.y) * dx) / den;
  const s = ((a.x - p.x) * n.y - (a.y - p.y) * n.x) / den;
  if (t <= 1e-6 || s < -1e-6 || s > 1 + 1e-6) return null;
  return t;
};

/**
 * Everything a face can stand in front of: the room's walls, its boxes and
 * chimneys, the other islands, and every unit that is not on this island.
 * Each obstacle is a closed polygon (a wall is the room polygon itself).
 */
function planObstacles({ room, units = [], elements = [], draft, profile }) {
  const out = [];
  const corners = normalizeRoom(room).corners || [];
  if (corners.length >= 3) {
    const walls = realWalls(room);
    corners.forEach((p, i) => {
      const q = corners[(i + 1) % corners.length];
      out.push({ what: `wall ${(walls[i]?.index ?? i) + 1}`, kind: 'wall', edges: [[p, q]] });
    });
  }
  const closed = (poly) => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);
  roomBoxes(room).forEach((b, i) => out.push({ what: `box ${i + 1}`, kind: 'box', edges: closed(boxCorners(b)) }));
  try {
    for (const o of wallPlanObstacles(room, elements, { blocking: true })) {
      if (Array.isArray(o?.corners) && o.corners.length >= 3) out.push({ what: o.label || 'chimney', kind: 'box', edges: closed(o.corners) });
    }
  } catch { /* no wall elements on this room */ }
  const islands = roomIslands(room);
  islands.forEach((i, k) => {
    if (i.id === draft.islandId) return;
    out.push({ what: `island ${k + 1}`, kind: 'island', edges: closed(islandCorners(i)) });
  });
  const walls = roomWalls(room);
  for (const u of units) {
    if (u.position?.island && u.position.island === draft.islandId) continue;
    if (getUnitType(u.type)?.freePanel) continue;
    const wall = walls[u.position?.wall ?? 0];
    if (!wall) continue;
    const poly = unitFootprint({
      wall, x: num(u.position?.x_mm, 0), width: num(u.params?.width, 600), depth: num(u.params?.depth, 560),
      rotation: num(u.position?.rotation_deg, 0), backInset: wallGapOf(u, profile),
    });
    out.push({ what: u.params?.unit_num ? `unit ${u.params.unit_num}` : 'a unit', kind: 'unit', edges: closed(poly) });
  }
  return out;
}

/**
 * For each face: the clear distance from the island's outer edge on that face
 * (its cabinets' fronts, or the core when the face is empty) to the first
 * thing in front of it, in millimetres, with the segment to draw it on.
 */
export function planClearances({ room, units = [], elements = [], draft, profile }) {
  // Since 15.10.2026 the rectangle IS the outer edge: the clearances are measured from it, cabinets or not.
  const faces = planOuterFaces(draft);
  const obstacles = planObstacles({ room, units, elements, draft, profile });
  return faces.map((f) => {
    const reach = 0;
    const n = f.inward;
    const back = { x: -n.x, y: -n.y };
    let best = null;
    for (const t of [0.06, 0.3, 0.5, 0.7, 0.94]) {
      const p = {
        x: f.start.x + f.along.x * f.width * t + n.x * reach,
        y: f.start.y + f.along.y * f.width * t + n.y * reach,
      };
      for (const o of obstacles) {
        // Standing INSIDE an obstacle (a box, a unit, another island) is an
        // overlap: the clearance is how deep, as a negative number, measured
        // back to the obstacle's near edge. A wall is a line and cannot be
        // stood in; outside the room is a question the store asks.
        const poly = o.kind !== 'wall' ? o.edges.map(([a]) => a) : null;
        if (poly && pointInPolygon(p, poly)) {
          let depth = null;
          for (const [a, b] of o.edges) {
            const d = rayHit(p, back, a, b);
            if (d != null && (depth == null || d < depth)) depth = d;
          }
          const mm = -(depth ?? 0);
          if (!best || mm < best.mm) {
            best = { face: f.face, mm, what: o.what, kind: o.kind, from: p, to: { x: p.x + back.x * (depth ?? 0), y: p.y + back.y * (depth ?? 0) } };
          }
          continue;
        }
        for (const [a, b] of o.edges) {
          const d = rayHit(p, n, a, b);
          if (d != null && (!best || d < best.mm)) {
            best = { face: f.face, mm: d, what: o.what, kind: o.kind, from: p, to: { x: p.x + n.x * d, y: p.y + n.y * d } };
          }
        }
      }
    }
    return best ? { ...best, mm: Math.round(best.mm) } : { face: f.face, mm: null, what: null, kind: null, from: null, to: null };
  });
}

/** The clearance's colour class: the owner's thresholds (14.10.2026): 1000 / 900 mm. */
export function clearanceLevel(mm, { good = 1000, tight = 900 } = {}) {
  if (mm == null) return 'none';
  if (mm >= good) return 'ok';
  if (mm >= tight) return 'tight';
  return 'bad';
}

/**
 * The draft a plan opens with: a new island where `newIsland` would stand it,
 * or an existing island with the cabinets already on its faces (in face
 * order, each by its width) so the plan can be changed and inserted again.
 */
export function islandPlanDraft({ room, units = [], profile, islandId = null }) {
  if (islandId) {
    const island = roomIslands(room).find((i) => i.id === islandId);
    if (!island) return null;
    const cabs = units
      .filter((u) => u.position?.island === islandId && !getUnitType(u.type)?.freePanel)
      .sort((a, b) => {
        const fa = PLAN_FACES.indexOf(a.position.face); const fb = PLAN_FACES.indexOf(b.position.face);
        return fa !== fb ? fa - fb : num(a.position.x_mm, 0) - num(b.position.x_mm, 0);
      })
      .map((u) => ({
        key: u.id, unitId: u.id, face: u.position.face, w: num(u.params?.width, 600),
        depth: num(u.params?.depth, 0) || null, type: u.type, label: u.params?.unit_num || null,
      }));
    // The island's record is its CORE; the plan's rectangle is the core plus
    // the bands its cabinets take (the inverse of `planCore`).
    const b = planBands({ cabs }, profile);
    const rad = ((island.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad); const sin = Math.sin(rad);
    const uc = (b.E1 - b.E2) / 2;
    const vc = (b.A - b.B) / 2;
    return {
      islandId,
      cx: Math.round((island.cx - (uc * cos - vc * sin)) * 10) / 10,
      cy: Math.round((island.cy - (uc * sin + vc * cos)) * 10) / 10,
      w: island.w + b.E1 + b.E2, d: island.d + b.A + b.B, rotation: island.rotation, cabs,
    };
  }
  const fresh = newIsland(room, profile, DRAFT_ISLAND_ID);
  return { islandId: null, cx: fresh.cx, cy: fresh.cy, w: fresh.w, d: fresh.d, rotation: fresh.rotation, cabs: [] };
}

/** A new plan cabinet, keyed so the view can tell them apart. */
export function planCabinet(face, type = 'BUD', w = 600) {
  return { key: `plan_${Math.random().toString(36).slice(2, 9)}`, unitId: null, face, w, depth: null, type, label: null };
}
