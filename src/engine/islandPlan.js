// ─── THE ISLAND, PLANNED FROM ABOVE (owner, 14.10.2026) ─────────────────────
//
// The owner, 14.10.2026: *"przy dodaniu wyspy chciałbym żeby był widok z
// góry i proponowana na podłodze plan wyspy ... dodaj szafkę i wtedy ona się
// pojawia na tym planie coś jak prawdziwa szafka ale bez wstawienia ... i
// dopiero jak się wstawi to wtedy pokaże się cała wyspa."*
//
// A PLAN is a draft that nothing in the project knows about: the island's
// core (T75's record, `{cx, cy, w, d, rotation}`) and a list of cabinets on
// its four faces, each a width and a type and nothing more. This module
// answers the plan's questions as arithmetic on the room: where the cabinets
// stand, how far each face is from whatever is in front of it. It computes no
// cabinet and draws nothing; the store inserts the plan (`insertIslandPlan`)
// through the same `setRoom` and `addUnit` every island and every cabinet
// already go through, so nothing is cut differently for having been planned.

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

const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/** A face's record (start, along, inward, width) for the draft. */
export function planFaces(draft) {
  return islandFaces({ ...draft, id: draft.islandId || DRAFT_ISLAND_ID });
}

function planFace(draft, face) {
  return planFaces(draft).find((f) => f.face === face) || null;
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
  const faces = planFaces(draft);
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

/** How much of a face is still free, in mm (negative when the plan overfills it). */
export function planFaceFree(draft, face) {
  const f = planFace(draft, face);
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
  const faces = planFaces(draft);
  const cabs = planCabinets(draft, profile);
  const gap = wallGapOf({ params: {} }, profile);
  const obstacles = planObstacles({ room, units, elements, draft, profile });
  return faces.map((f) => {
    const mine = cabs.filter((c) => c.face === f.face);
    const reach = mine.length ? Math.max(...mine.map((c) => gap + c.depth)) : 0;
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
    return { islandId, cx: island.cx, cy: island.cy, w: island.w, d: island.d, rotation: island.rotation, cabs };
  }
  const fresh = newIsland(room, profile, DRAFT_ISLAND_ID);
  return { islandId: null, cx: fresh.cx, cy: fresh.cy, w: fresh.w, d: fresh.d, rotation: fresh.rotation, cabs: [] };
}

/** A new plan cabinet, keyed so the view can tell them apart. */
export function planCabinet(face, type = 'BUD', w = 600) {
  return { key: `plan_${Math.random().toString(36).slice(2, 9)}`, unitId: null, face, w, depth: null, type, label: null };
}
