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

const ROOM_SCHEMA = 2;

const DEFAULT_ROOM_WIDTH = 4000;
const DEFAULT_ROOM_DEPTH = 3000;
const DEFAULT_ROOM_HEIGHT = 2500;

/**
 * ─── THE ROOM MODEL'S OWN MINIMUM, NAMED (turn 50; kept at turn 51) ─────────
 *
 * The number is not new — the typed-length field in `components/RoomModal.jsx`
 * has floored at 100 since turn 14, and `validateRoomShape` below refuses a
 * wall of under 1 mm outright. What turn 50 added was the NAME.
 *
 * T51 reverted the wall editor that named it (F1), and `drawn_walls` went with
 * it because nothing but that editor ever read it. This stayed: the typed
 * length field still floors here, and putting the literal 100 back into a
 * component would be undoing a good thing for the sake of a tidy revert.
 */
export const MIN_WALL_LENGTH = 100;

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
  // Turn 14: the stub length and the plan's obstacles travel with the room —
  // both are ROOM geometry, and both are optional, so a project saved before
  // this turn opens with the defaults and nothing to migrate.
  const stub = Number(room.wall_stub_mm);
  const boxes = Array.isArray(room.boxes) ? room.boxes.map(migrateBox).filter(Boolean) : [];
  return normalizeRoom({
    schema: ROOM_SCHEMA,
    height,
    corners,
    openings,
    ...(Number.isFinite(stub) && stub >= 0 ? { wall_stub_mm: stub } : {}),
    ...(boxes.length ? { boxes } : {}),
  });
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

// ─── "One wall" (turn 14, CLAUDE.md F1.5b) ──────────────────────────────────
//
// The project SCOPE has said "one wall" since turn 7 and only ever decided one
// thing: whether the new-project flow showed Room setup on the way in. So a
// vanity or a single run — the jobs whose whole point is that there is no room
// yet — were drawn standing inside a four-walled 4 × 3 m box, and Room setup
// offered four walls to edit. The owner's verdict: never the whole room.
//
// What he asks for instead is what a joiner tapes out on site: the wall itself,
// and optionally a metre of RETURN at each end so the eye has something to read
// the depth against. So the room's data does not change shape — the polygon is
// still what the floor is cut from and what placement measures against, and a
// project can be switched back to "whole room" without having lost anything.
// What changes is which walls are DRAWN and OFFERED, and that is this function.

/**
 * How far each side stub runs forward, when there are stubs at all.
 *
 * ─── TURN 51 (CLAUDE.md F8): 1000 → 2000 ────────────────────────────────────
 *
 * The owner: *"default bocznych ścian zrób na 2000 mm, nie jak teraz 1500."*
 * (It was 1000, not 1500 — the 1500 is a number he has typed into that field.
 * The instruction is the same either way.)
 *
 * *"One number, in the profile, read by everything that starts a room."*  The
 * number IS `profile.room.sideWallMm`; this is the fallback for a caller with
 * no profile to hand, and the two are held equal by a test, because two
 * literals that must agree is exactly how a default drifts apart.
 */
export const DEFAULT_WALL_STUB = 2000;

export function wallStub(room, profile = null) {
  const v = Number(room?.wall_stub_mm);
  if (Number.isFinite(v) && v >= 0) return v;
  // T51 (F8): the workshop's own number when there is a profile to ask, the
  // house's when there is not. A room that STATES a length still wins — that is
  // a joiner's answer, and a changed default must never re-draw a saved job.
  const said = Number(profile?.room?.sideWallMm);
  return Number.isFinite(said) && said >= 0 ? said : DEFAULT_WALL_STUB;
}

/** A wall record cut back to `length`, keeping the end named by `keep`. */
function truncateWall(wall, keep, length) {
  const len = Math.min(Math.max(0, Number(length) || 0), wall.width);
  const start = keep === 'start'
    ? { ...wall.start }
    : { x: wall.end.x - wall.along.x * len, y: wall.end.y - wall.along.y * len };
  const end = keep === 'start'
    ? { x: wall.start.x + wall.along.x * len, y: wall.start.y + wall.along.y * len }
    : { ...wall.end };
  return {
    ...wall, start, end, width: round4(len), stub: true,
  };
}

/**
 * The walls this project actually has: all of them, or — in "one wall" scope —
 * wall 1 plus the two short returns at its ends.
 *
 * The stubs run FORWARD, into the room, because they are the two walls that
 * meet the main one at its corners: the previous wall keeps the end that
 * touches corner 0, the next one keeps the start that touches corner 1. Both
 * carry the REAL wall index, so a unit standing on one is on the wall it always
 * was — nothing downstream has to learn about stubs.
 *
 * ─── TURN 61 (CLAUDE.md F2): AND THE SAME LAW FOR **TWO** ───────────────────
 *
 * The owner: *"zrob 2 sciany, Elki bedziemy dokaldac"* · *"2 tak wystarczy"*.
 * Two walls, and no corner carcass — the L-shape stays parked, so the two runs
 * are independent and nothing new is cut at the corner they share.
 *
 * IT IS THE 'wall' LAW WITH ONE MORE REAL WALL, and not a second law. Walls 0
 * and 1 are ADJACENT — they share corner 1 — so the pair has exactly two FREE
 * ends, wall 0's start (corner 0) and wall 1's end (corner 2), and those two
 * ends get the same `wallStub` returns one-wall mode gives its own two. The
 * previous wall is unchanged from `'wall'` (it keeps the end that touches
 * corner 0); the next one moves along by one, from `walls[1]` to `walls[2]`,
 * because `walls[1]` is now a wall a client stands furniture against.
 *
 * The stubs keep their REAL index and carry `stub: true`, exactly as before, so
 * "real" stays the one thing it has ever been — the absence of that flag — and
 * nothing downstream learns a new word.
 *
 * THE 4-CORNER GUARD. `'wall'` refuses under three corners because a stub has
 * to be cut from a wall that is not the main one. `'two'` needs FOUR: with
 * three corners `walls[2]` and `walls[walls.length - 1]` are the same wall and
 * both stubs would be cut out of it. Under four corners the whole room is
 * returned, which is what every unknown scope has always got.
 *
 * @param {object} room
 * @param {'room'|'wall'|'two'} scope   the project's own (engine/design.js)
 * @param {object|null} profile   T51 (F8): whose `room.sideWallMm` decides how
 *   long the two returns are when the room has not said. Optional, so every
 *   caller that has no profile to hand still gets the house's own answer.
 */
export function wallsInScope(room, scope = 'room', profile = null) {
  const walls = roomWalls(room);
  if (scope === 'two') {
    if (walls.length < 4) return walls;
    const stub = wallStub(room, profile);
    if (stub <= 0) return [walls[0], walls[1]];
    return [
      walls[0],
      walls[1],
      truncateWall(walls[walls.length - 1], 'end', stub),
      truncateWall(walls[2], 'start', stub),
    ];
  }
  if (scope !== 'wall' || walls.length < 3) return walls;
  const stub = wallStub(room, profile);
  if (stub <= 0) return [walls[0]];
  return [
    walls[0],
    truncateWall(walls[walls.length - 1], 'end', stub),
    truncateWall(walls[1], 'start', stub),
  ];
}

/**
 * Which wall indices a scope shows — the list without the geometry.
 *
 * T61: the `profile` is passed through. It changed no answer while `'wall'` was
 * the only scope (the stubs it lengthens are filtered out on the next line),
 * and it changes none now — but a reader who finds two calls to the same
 * function with different arguments is a reader who will wonder which is right.
 */
export function wallIndicesInScope(room, scope = 'room', profile = null) {
  return wallsInScope(room, scope, profile).filter((w) => !w.stub).map((w) => w.index);
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

// ─── MOVING A WALL (turn 14, CLAUDE.md F1.5a + F10.1/F10.2) ─────────────────
//
// The owner's verdict on corner-dragging: unusable. He is describing the
// arithmetic, not the mouse. A corner is a point shared by two walls, so
// dragging it changes the DIRECTION of both — every angle in the room moves at
// once and a right angle can only be hit by luck. Typing a length did the same
// thing from the other end: turn 3's field moved the wall's END corner along
// the wall, which on a rectangle shears it into a rhombus. The owner's
// screenshot — two walls reading 3041.4 after typing 4500 — is that shear.
//
// A wall is what a joiner actually moves. So this is the primitive, and it is
// the ONLY one: F1.5a's typed length, F10.1's drag and F10.2's typed distance
// all come out of it, which is what CLAUDE.md F10.5 asks for in as many words.
//
// The rule is the one a CAD package uses. The wall's LINE is offset along its
// own normal; the two neighbours keep their own directions exactly and are
// re-cut where they now meet it. Nothing else in the polygon moves. Every angle
// in the room is therefore preserved — not "preserved for a rectangle", but
// preserved, because no wall's direction is ever written.
//
// A wall dragged past its neighbours would fold the room inside out, so the
// move is refused rather than applied: `moveWall` returns the corners it was
// given when the result is not a room (validateRoomShape has the same say).

/** Where two lines meet, or null when they are parallel. */
function intersectLines(p, u, q, v) {
  const denom = u.x * v.y - u.y * v.x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((q.x - p.x) * v.y - (q.y - p.y) * v.x) / denom;
  return { x: p.x + u.x * t, y: p.y + u.y * t };
}

const unit = (from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  return len < 1e-9 ? null : { x: dx / len, y: dy / len };
};

/**
 * Move one whole wall along its own normal.
 *
 * @param {object} room
 * @param {number} index    which wall
 * @param {number} deltaMm  POSITIVE grows the room (the wall travels OUTWARD,
 *                          away from the centroid); negative shrinks it.
 * @returns {Array} the new corner list — the old one, unchanged, if the move
 *                  would destroy the polygon.
 */
export function moveWall(room, index, deltaMm) {
  const corners = cornersOf(normalizeRoom(room)).map((c) => ({ ...c }));
  const n = corners.length;
  const walls = roomWalls({ ...room, corners });
  const wall = walls[index];
  const delta = Number(deltaMm) || 0;
  if (!wall || n < 3 || !delta) return corners;

  const i = wall.index;
  const prevIndex = (i - 1 + n) % n;
  const nextIndex = (i + 2) % n;
  // Outward is away from the room, so a positive delta makes the room bigger —
  // which is what "drag the wall out" means to the hand doing it.
  const shift = { x: -wall.inward.x * delta, y: -wall.inward.y * delta };
  const p = { x: corners[i].x + shift.x, y: corners[i].y + shift.y };
  const q = { x: corners[(i + 1) % n].x + shift.x, y: corners[(i + 1) % n].y + shift.y };
  const dir = { x: wall.along.x, y: wall.along.y };

  const prevDir = unit(corners[prevIndex], corners[i]);
  const nextDir = unit(corners[(i + 1) % n], corners[nextIndex]);
  // A neighbour parallel to this wall has no crossing point; the corner simply
  // travels with the wall, which is the right answer for a collinear pair.
  const newStart = (prevDir && intersectLines(p, dir, corners[prevIndex], prevDir)) || p;
  const newEnd = (nextDir && intersectLines(q, dir, corners[nextIndex], nextDir)) || q;

  const next = corners.map((c, k) => {
    if (k === i) return { x: round4(newStart.x), y: round4(newStart.y) };
    if (k === (i + 1) % n) return { x: round4(newEnd.x), y: round4(newEnd.y) };
    return c;
  });
  // A wall dragged through its neighbours turns the polygon inside out. The
  // signed area flipping sign is exactly that, and it is cheaper and more
  // certain than trying to describe the geometry of the failure.
  if (validateRoomShape(next).length || Math.sign(area2(next)) !== Math.sign(area2(corners))) {
    return corners;
  }
  return next;
}

/**
 * Set one wall's LENGTH, keeping every angle (CLAUDE.md F1.5a).
 *
 * The wall keeps its start corner and its direction; the NEXT wall is moved
 * until it crosses this one at the asked-for distance. On a rectangle that is
 * "make this side 4500" and the other three sides follow — a rescale, not a
 * shear. It is `moveWall` underneath, so there is one rule and not two.
 */
export function setWallLength(room, index, lengthMm) {
  const corners = cornersOf(normalizeRoom(room)).map((c) => ({ ...c }));
  const walls = roomWalls({ ...room, corners });
  const wall = walls[index];
  const want = Number(lengthMm);
  if (!wall || !Number.isFinite(want) || want <= 0) return corners;
  const nextWall = walls[(index + 1) % walls.length];
  if (!nextWall) return corners;

  // Where the far corner has to land, on this wall's own line.
  const target = {
    x: wall.start.x + wall.along.x * want,
    y: wall.start.y + wall.along.y * want,
  };
  // How far the NEXT wall has to travel along its normal to pass through it.
  // Outward is −inward, which is the sign `moveWall` takes.
  const dx = target.x - nextWall.start.x;
  const dy = target.y - nextWall.start.y;
  const delta = -(dx * nextWall.inward.x + dy * nextWall.inward.y);
  return moveWall({ ...room, corners }, nextWall.index, delta);
}

// ─── Boxes in the plan: chimneys and pillars (turn 14, CLAUDE.md F10.3) ─────
//
// A kitchen has things in it that are not walls and are not furniture: a boxed
// soil pipe in the corner, a chimney breast, a pillar. Until now the only way
// to tell the app about one was to lie about the room's shape.
//
// A box is a rectangle in the plan, standing floor to ceiling. It is
// axis-aligned in ROOM coordinates on purpose: what the owner asks to do with
// it is "drag a whole side" and "type a distance", and both of those are one
// number on one axis. A rotated obstacle is a different feature and would want
// a different gesture.
//
// Pure data. The 3D view draws it, placement measures against it, and neither
// needs to know how it got there.

export const MIN_BOX_SIZE = 50;

/** A box, from anything: ids kept, sizes made real, never inverted. */
export function migrateBox(box) {
  if (!box) return null;
  const w = Math.max(MIN_BOX_SIZE, Number(box.w) || 0);
  const d = Math.max(MIN_BOX_SIZE, Number(box.d) || 0);
  return {
    id: String(box.id || `box_${Math.random().toString(36).slice(2, 9)}`),
    x: round4(Number(box.x) || 0),
    y: round4(Number(box.y) || 0),
    w: round4(w),
    d: round4(d),
  };
}

/** Every box of a room, normalised. */
export function roomBoxes(room) {
  return (room?.boxes || []).map(migrateBox).filter(Boolean);
}

/**
 * The four plan corners of a box, anticlockwise from its near-left.
 *
 * ─── TURN 51 (CLAUDE.md F1): …OR THE FOUR IT ALREADY CARRIES ───────────────
 *
 * A box in `room.boxes` is typed as a rectangle on the room's own axes, so its
 * corners are arithmetic. A CHIMNEY drawn on a wall is not: it stands on that
 * wall's line, and on an L-shaped or an imported room that line is at an angle.
 * `wallPlanObstacles` below hands its corners over already turned, and this
 * takes them as given rather than squaring them back up — an axis-aligned
 * bounding box round a chimney on a 45° wall is a chimney half a metre wider
 * than the one the joiner drew, and a cabinet would stop short of nothing.
 */
export function boxCorners(box) {
  if (Array.isArray(box?.corners) && box.corners.length >= 3) {
    return box.corners.map((c) => ({ x: round4(Number(c.x) || 0), y: round4(Number(c.y) || 0) }));
  }
  const b = migrateBox(box);
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.d },
    { x: b.x, y: b.y + b.d },
  ];
}

// ─── TURN 51 (CLAUDE.md F1): A RECESS AND A CHIMNEY ARE PART OF THE ROOM ────
//
// The owner: *"zostaw dodawanie wnęki i boxa jak wcześniej, ale żeby
// działało."*  T45 gave the wall editor a top view with `Add recess` and
// `Add chimney` on it, and both of them WORKED as far as the modal: the
// element is stored on `project.wallSlopes`, listed under "On this wall", and
// drawn in the plan the moment it is added.
//
// And then nothing. `3d/Room.jsx` and the placement clamp both read that list
// through `kind === 'slope'`, so past the modal's own window a recess did not
// exist: the room did not show one and no cabinet ever stopped at a chimney.
// That is the whole of *"żeby działało"* — the drawing was never the problem.
//
// This is the crossing, and it is deliberately the SAME record `room.boxes`
// already is: a chimney is a box that happens to have been drawn on a wall, so
// it reaches the placement by the route a box has taken since turn 14 and no
// call site learns a second obstacle kind.
//
// ─── AND A RECESS IS NOT AN OBSTACLE ───────────────────────────────────────
//
// An alcove is room, not building. A cabinet standing in one is the entire
// reason a joiner draws it, so a recess is returned for the VIEW and never for
// the clamp — `obstacles: false` on the record, and `wallPlanObstacles` filters
// on it rather than on the kind, so the day a third kind arrives the rule is
// still one word.

/** Is this plan element something a cabinet has to stop at? */
export function planElementBlocks(el) {
  return (el?.kind ?? '') === 'chimney';
}

/**
 * One wall-plan element, placed in the ROOM's own plan frame.
 *
 * The element is drawn in its wall's frame — `x_mm` along the wall from its
 * start corner, `depth` measured from the wall FACE — and this turns that into
 * the four corners the room measures everything else by. A CHIMNEY stands
 * proud, so it runs INWARD from the face; a RECESS is cut into the wall, so it
 * runs the other way and never reaches the floor a cabinet stands on.
 *
 * @returns {{id,kind,label,corners,x,y,w,d,blocks}|null}
 */
export function planElementFootprint(el, wall) {
  if (!el || !wall) return null;
  const width = Math.max(0, Number(el.width) || 0);
  const depth = Math.max(0, Number(el.depth) || 0);
  if (!(width > 0) || !(depth > 0)) return null;
  const x0 = Math.max(0, Number(el.x_mm) || 0);
  const along = wall.along || { x: 1, y: 0 };
  const inward = wall.inward || { x: 0, y: 1 };
  // A chimney stands INTO the room; a recess is cut the other way, out through
  // the wall it is drawn on.
  const sign = planElementBlocks(el) ? 1 : -1;
  const at = (u, v) => ({
    x: round4(wall.start.x + along.x * u + inward.x * v * sign),
    y: round4(wall.start.y + along.y * u + inward.y * v * sign),
  });
  const corners = [at(x0, 0), at(x0 + width, 0), at(x0 + width, depth), at(x0, depth)];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    id: String(el.id || `plan_${el.kind}`),
    kind: el.kind,
    label: el.kind === 'chimney' ? 'a chimney on this wall' : 'a recess in this wall',
    corners,
    // The bounding box, for anything that only knows how to read one. Never
    // used for the clamp, which reads `corners` through `boxCorners` above.
    x: round4(minX),
    y: round4(minY),
    w: round4(Math.max(...xs) - minX),
    d: round4(Math.max(...ys) - minY),
    blocks: planElementBlocks(el),
  };
}

/**
 * Every wall-plan element of a room, as room-frame footprints.
 *
 * @param {object} room
 * @param {Array} elements  `project.wallSlopes` — the T44/T45 list, any kind
 * @param {object} options  `{ blocking: true }` returns only what a cabinet
 *                          has to stop at, which is what the placement wants.
 */
export function wallPlanObstacles(room, elements, { blocking = false } = {}) {
  const walls = roomWalls(room);
  const out = [];
  for (const el of elements || []) {
    if (el?.kind !== 'recess' && el?.kind !== 'chimney') continue;
    if (blocking && !planElementBlocks(el)) continue;
    const wall = walls[Number(el.wall) || 0];
    if (!wall) continue;
    const foot = planElementFootprint(el, wall);
    if (foot) out.push(foot);
  }
  return out;
}

/** The sides a box offers to the same two gestures a wall does. */
export const BOX_SIDES = ['left', 'right', 'front', 'back'];

/**
 * Move ONE side of a box, exactly as a wall moves: outward is positive, the
 * other three sides stay where they are.
 */
export function moveBoxSide(box, side, deltaMm) {
  const b = migrateBox(box);
  const delta = Number(deltaMm) || 0;
  if (!b || !delta || !BOX_SIDES.includes(side)) return b;
  const next = { ...b };
  if (side === 'left') { next.x = b.x - delta; next.w = b.w + delta; }
  if (side === 'right') next.w = b.w + delta;
  if (side === 'front') { next.y = b.y - delta; next.d = b.d + delta; }
  if (side === 'back') next.d = b.d + delta;
  // A side dragged through the opposite one is refused, not folded.
  if (next.w < MIN_BOX_SIZE || next.d < MIN_BOX_SIZE) return b;
  return migrateBox(next);
}

/** Move the whole box, without changing its size. */
export function moveBox(box, dxMm, dyMm) {
  const b = migrateBox(box);
  return migrateBox({ ...b, x: b.x + (Number(dxMm) || 0), y: b.y + (Number(dyMm) || 0) });
}

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

/**
 * ─── Which wall a point on the floor belongs to (turn 11, CLAUDE.md F4.1) ───
 *
 * A unit is dragged ALONG its wall, and until turn 11 that was the end of it:
 * once placed, the only way to get a cabinet onto another wall was a select box
 * in the right-hand panel. Dragging it round the corner is the gesture, and this
 * is the arithmetic behind it — given a point in ROOM millimetres, which wall is
 * it in front of, and how far along that wall?
 *
 * "In front of" is the inward side: a point behind a wall belongs to no wall at
 * all, which is what stops a cabinet re-homing onto the plaster the moment the
 * cursor overshoots. `slack` lets the pointer run a little past a wall's ends
 * and past its face without losing it — a hand does not stop on a line.
 *
 * Pure arithmetic on the walls this module already builds. Returns null when the
 * point belongs to nothing, and the caller then leaves the unit where it is.
 *
 * @param {Array} walls        roomWalls()
 * @param {{x:number,y:number}} point   in room mm (the same frame as `corners`)
 * @param {number} slack       how far past an end / behind the face still counts
 * @returns {{index:number, along:number, distance:number}|null}
 */
export function wallAtPoint(walls, point, slack = 400) {
  let best = null;
  for (const wall of walls || []) {
    const dx = point.x - wall.start.x;
    const dy = point.y - wall.start.y;
    const along = dx * wall.along.x + dy * wall.along.y;
    const inward = dx * wall.inward.x + dy * wall.inward.y;
    // Behind the wall, or off past its ends: not this one.
    if (inward < -slack) continue;
    if (along < -slack || along > wall.width + slack) continue;
    // The nearest wall the point is in front of. Distance is measured INTO the
    // room, so a cabinet dragged into the middle of the floor stays on the wall
    // it is nearest to rather than jumping to whichever end it drifts past.
    const distance = Math.abs(inward);
    if (!best || distance < best.distance) {
      best = { index: wall.index, along, distance };
    }
  }
  return best;
}
