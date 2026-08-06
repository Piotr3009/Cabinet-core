// ─── Room v2 ───
// A room is a LIST OF WALLS, and a rectangle is just the four-wall case. That
// is the whole change: an L-shaped room, an imported DXF outline and the old
// single-wall project are the same data structure with different corner counts
// (CLAUDE.md turn 3, phase 3 — this supersedes SPEC 4.2's "max 3 walls").
//
// Plan coordinates are millimetres, x to the right and y INTO the room, with
// the corners stored so that the inside of the room is always on the same side
// of every wall (see normalizeRoom). The 3D view maps plan (x, y) to world
// (X, Z) and needs no case analysis to know which way a wall faces.
//
// Pure functions — no React, no store imports, no three.js.

export const ROOM_SCHEMA = 2;

export const DEFAULT_ROOM_WIDTH = 4000;
export const DEFAULT_ROOM_DEPTH = 3000;
export const DEFAULT_ROOM_HEIGHT = 2500;

export const DEFAULT_ROOM = {
  schema: ROOM_SCHEMA,
  height: DEFAULT_ROOM_HEIGHT,
  corners: rectCorners(DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_DEPTH),
  openings: [],
};

/** The four corners of a rectangular room, clockwise from the front-left. */
export function rectCorners(width, depth) {
  return [
    { x: 0, y: 0 },
    { x: Number(width) || DEFAULT_ROOM_WIDTH, y: 0 },
    { x: Number(width) || DEFAULT_ROOM_WIDTH, y: Number(depth) || DEFAULT_ROOM_DEPTH },
    { x: 0, y: Number(depth) || DEFAULT_ROOM_DEPTH },
  ];
}

/**
 * An L-shaped room: a `width × depth` rectangle with a bite taken out of the
 * far-right corner, `cutWidth × cutDepth`. Six corners, still one wall list.
 */
export function lCorners(width, depth, cutWidth, cutDepth) {
  const w = Number(width); const d = Number(depth);
  const cw = Math.min(Number(cutWidth), w - 1); const cd = Math.min(Number(cutDepth), d - 1);
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: d - cd },
    { x: w - cw, y: d - cd },
    { x: w - cw, y: d },
    { x: 0, y: d },
  ];
}

const area2 = (pts) => pts.reduce((s, p, i) => {
  const q = pts[(i + 1) % pts.length];
  return s + (p.x * q.y - q.x * p.y);
}, 0);

/** Signed plan area in mm² (positive for the orientation this module keeps). */
export function roomArea(room) {
  return Math.abs(area2(cornersOf(room))) / 2;
}

function cornersOf(room) {
  return Array.isArray(room?.corners) && room.corners.length >= 3 ? room.corners : DEFAULT_ROOM.corners;
}

/**
 * Bring any stored room to the v2 shape.
 *
 * A turn-1/2 project is `{ height, walls: [{ width }] }` — one wall and no
 * depth. It becomes a rectangle of that width, so old projects open with the
 * room they always had plus the three walls that were never drawn.
 */
export function migrateRoom(room) {
  if (!room) return { ...DEFAULT_ROOM, corners: DEFAULT_ROOM.corners.map((c) => ({ ...c })) };
  const height = Number(room.height) || DEFAULT_ROOM_HEIGHT;
  const openings = Array.isArray(room.openings) ? room.openings.map((o) => ({ ...o })) : [];

  let corners;
  if (Array.isArray(room.corners) && room.corners.length >= 3) {
    corners = room.corners.map((c) => ({ x: Number(c.x) || 0, y: Number(c.y) || 0 }));
  } else {
    const width = Number(room.walls?.[0]?.width) || DEFAULT_ROOM_WIDTH;
    const depth = Number(room.depth) || DEFAULT_ROOM_DEPTH;
    corners = rectCorners(width, depth);
  }
  return normalizeRoom({ schema: ROOM_SCHEMA, height, corners, openings });
}

/**
 * Fix the corner order so the interior is always on the same side of a wall.
 * Every "which way does this wall face" question downstream is then a fixed
 * formula instead of a special case per room shape.
 */
export function normalizeRoom(room) {
  const corners = cornersOf(room).map((c) => ({ x: Number(c.x) || 0, y: Number(c.y) || 0 }));
  const ordered = area2(corners) < 0 ? [...corners].reverse() : corners;
  return { ...room, schema: ROOM_SCHEMA, corners: ordered };
}

/**
 * The walls, in order. Wall i runs from corner i to corner i+1.
 *
 * `inward` points into the room, so a unit standing on the wall is placed at
 * `start + along × x_mm` and faces `inward`. `angle` is the rotation about the
 * world Y axis that takes a unit's local +X onto `along` and its local +Z onto
 * `inward` — the view needs nothing else.
 */
export function roomWalls(room) {
  const corners = cornersOf(normalizeRoom(room));
  const n = corners.length;
  const cx = corners.reduce((s, c) => s + c.x, 0) / n;
  const cy = corners.reduce((s, c) => s + c.y, 0) / n;

  return corners.map((p, i) => {
    const q = corners[(i + 1) % n];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const width = Math.hypot(dx, dy);
    const ux = width ? dx / width : 1;
    const uy = width ? dy / width : 0;
    // Two candidate normals; the inward one points at the room's centroid.
    let nx = -uy; let ny = ux;
    const midX = (p.x + q.x) / 2; const midY = (p.y + q.y) / 2;
    if (nx * (cx - midX) + ny * (cy - midY) < 0) { nx = -nx; ny = -ny; }
    return {
      index: i,
      start: { x: p.x, y: p.y },
      end: { x: q.x, y: q.y },
      width: round4(width),
      along: { x: ux, y: uy },
      inward: { x: nx, y: ny },
      // World mapping: plan (x, y) → (X, Z). Local +X onto `along`.
      angle: Math.atan2(-uy, ux),
    };
  });
}

/** Width of one wall, tolerating an out-of-range index (returns 0). */
export function wallWidth(room, index) {
  return roomWalls(room)[index]?.width ?? 0;
}

/** Plan bounding box, used to centre the room in the 3D scene. */
export function roomBounds(room) {
  const corners = cornersOf(room);
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  return {
    minX, maxX, minY, maxY,
    width: maxX - minX,
    depth: maxY - minY,
    centre: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  };
}

const round4 = (v) => Math.round(v * 1e4) / 1e4;

// ─── Openings ───────────────────────────────────────────────────────────────

export const OPENING_DEFAULTS = {
  window: { width: 1200, height: 1400, sill: 900 },
  door: { width: 900, height: 2040, sill: 0 },
};

/**
 * An opening pulled back into its wall: never past either end, never taller
 * than the room. A door always sits on the floor.
 */
export function clampOpening(opening, room) {
  const kind = opening.kind === 'door' ? 'door' : 'window';
  const w = roomWalls(room)[opening.wall ?? 0];
  const wallW = w?.width ?? 0;
  const roomH = Number(room.height) || DEFAULT_ROOM_HEIGHT;
  const width = Math.max(100, Math.min(Number(opening.width) || OPENING_DEFAULTS[kind].width, wallW));
  const sill = kind === 'door' ? 0 : Math.max(0, Math.min(Number(opening.sill) ?? OPENING_DEFAULTS.window.sill, roomH - 100));
  const height = Math.max(100, Math.min(Number(opening.height) || OPENING_DEFAULTS[kind].height, roomH - sill));
  const x = Math.max(0, Math.min(Number(opening.x_mm) || 0, Math.max(0, wallW - width)));
  return { ...opening, kind, width, height, sill, x_mm: x };
}

/** Every opening of one wall, clamped, in order along the wall. */
export function openingsOnWall(room, wallIndex) {
  return (room.openings || [])
    .filter((o) => (o.wall ?? 0) === wallIndex)
    .map((o) => clampOpening(o, room))
    .sort((a, b) => a.x_mm - b.x_mm);
}

// ─── The shrink guard ───────────────────────────────────────────────────────

/**
 * May the room become `next`?
 *
 * A room change is the one editing path that can create an overlap without
 * anybody dragging anything: shorten a wall and the units standing on it are
 * suddenly hanging in the air or inside each other. Rather than silently
 * shoving units around, the change is REFUSED and the user is told which units
 * are in the way (CLAUDE.md phase 3).
 *
 * @param {object} next   the proposed room (already migrated)
 * @param {Array}  units  [{ id, params:{width,height}, position:{wall,x_mm} }]
 * @returns {{ok:boolean, message:string|null, blocking:Array}}
 */
export function roomChangeGuard(next, units = []) {
  const walls = roomWalls(next);
  const roomH = Number(next.height) || 0;
  const blocking = [];

  for (const u of units) {
    const label = u.params?.unit_num || u.id;
    const wallIndex = u.position?.wall ?? 0;
    const wall = walls[wallIndex];
    const width = Number(u.params?.width) || 0;
    const height = Number(u.params?.height) || 0;
    const x = Number(u.position?.x_mm) || 0;

    if (!wall) {
      blocking.push({ id: u.id, label, reason: 'its wall would no longer exist' });
      continue;
    }
    if (x + width > wall.width + 1e-6) {
      blocking.push({
        id: u.id, label,
        reason: `it would hang ${Math.round(x + width - wall.width)} mm past the end of wall ${wallIndex + 1}`,
      });
    }
    if (roomH && height > roomH) {
      blocking.push({ id: u.id, label, reason: `it is ${Math.round(height - roomH)} mm taller than the new ceiling` });
    }
  }

  // Two units that fitted on a longer wall can also be pushed into each other
  // — but only if something else moved them, which nothing here does. The
  // check that matters is above; overlaps are reported by the clamp.
  if (!blocking.length) return { ok: true, message: null, blocking: [] };
  return {
    ok: false,
    // The exact wording CLAUDE.md asks for, plus what is actually in the way.
    message: `Cannot shrink the room below placed units — move or remove units first (${
      [...new Set(blocking.map((b) => b.label))].join(', ')}).`,
    blocking,
  };
}

/** Is this polygon usable as a room? (self-intersection is not checked yet) */
export function validateRoomShape(corners) {
  const issues = [];
  if (!Array.isArray(corners) || corners.length < 3) {
    issues.push('A room needs at least three corners.');
    return issues;
  }
  for (let i = 0; i < corners.length; i += 1) {
    const p = corners[i];
    const q = corners[(i + 1) % corners.length];
    if (Math.hypot(q.x - p.x, q.y - p.y) < 1) issues.push(`Wall ${i + 1} has no length.`);
  }
  if (Math.abs(area2(corners)) / 2 < 1e5) issues.push('The room encloses almost no floor area.');
  return issues;
}
