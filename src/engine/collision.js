// ─── Collision clamping ───
// The rule is: A MOVE STOPS AT THE BOUNDARY. Not a warning, not an undo after
// the fact, and never an overlap that the cut list then has to explain
// (CLAUDE.md task 3).
//
// Everything here is a pure function of numbers. The store calls it from its
// setters, so the drag path, the keyboard path, a typed-in number and any
// future path all go through the SAME arithmetic — there is no second copy of
// the rule to drift.
//
// Every clearance comes from profile.editor; nothing in this file is a bare
// number (CLAUDE.md rule 3).

/** Clamp that survives a reversed range: never returns a value outside [lo,hi]. */
function clampTo(value, lo, hi) {
  if (hi < lo) return lo;
  return Math.min(Math.max(Number(value), lo), hi);
}

// ─── Shelves ───────────────────────────────────────────────────────────────

/**
 * The vertical band a shelf may live in, measured to the shelf's bottom face.
 *
 * Floor: the top face of whatever closes the space below — the drawer
 * partition if there is a drawer stack, otherwise the base panel.
 * Ceiling: the underside of the top panel.
 * Both are then pulled in by the minimum clear space a shelf needs.
 *
 * @param {{height:number, boardT:number, floorY:number|null}} geom
 *        floorY: top face of the partition / base panel, in cabinet mm
 * @param {object} profile
 */
export function shelfBand({ height, boardT, floorY }, profile) {
  const edge = profile.editor.minShelfEdgeGap;
  const bottom = floorY == null ? boardT : floorY;
  return {
    min: bottom + edge,
    max: height - boardT - edge,
    floor: bottom,
    ceiling: height - boardT,
  };
}

/**
 * Drag bounds for ONE shelf: the band, narrowed by its immediate neighbours.
 *
 * `below`/`above` are the reference faces for the live dimension readout, so
 * it is never blank: the neighbouring shelf when there is one, otherwise the
 * band's own floor and ceiling.
 */
export function shelfBounds({ pos, others, band }, profile) {
  const gap = profile.editor.minShelfGap;
  const sorted = [...others].filter(Number.isFinite).sort((a, b) => a - b);
  const below = [...sorted].filter((y) => y <= pos).pop();
  const above = sorted.find((y) => y > pos);
  return {
    min: Math.max(band.min, below != null ? below + gap : band.min),
    max: Math.min(band.max, above != null ? above - gap : band.max),
    below: below ?? band.floor,
    above: above ?? band.ceiling,
  };
}

/**
 * Where a shelf actually ends up. The move is clamped into the bounds above —
 * so a shelf dragged at a neighbour stops touching it at the minimum gap and
 * stays there, however far the cursor keeps travelling.
 *
 * When the band has no room at all (a tall drawer stack under a low top) the
 * shelf holds its current position rather than jumping to a bound.
 */
export function clampShelfPos({ pos, current, others, band }, profile) {
  const bounds = shelfBounds({ pos: current ?? pos, others, band }, profile);
  if (bounds.max < bounds.min) {
    return { pos: current ?? bounds.min, ...bounds, blocked: true };
  }
  return { pos: clampTo(pos, bounds.min, bounds.max), ...bounds, blocked: false };
}

// ─── Units on a wall ───────────────────────────────────────────────────────

/** [left, right) footprint of a unit along its wall. */
export function unitSpan(unit) {
  const left = Number(unit.position?.x_mm) || 0;
  return { left, right: left + (Number(unit.params?.width) || 0) };
}

// ─── Plan geometry: units on DIFFERENT walls ────────────────────────────────
// Two units on the same wall are a one-dimensional problem. Two units meeting
// in a CORNER are not: one stands on wall 1 and the other on wall 2, and what
// overlaps is their footprints on the floor. Everything below turns that back
// into the same one-dimensional problem by measuring the other unit in THIS
// wall's frame — along the wall, and into the room.

/**
 * The four plan corners of a unit standing on `wall`.
 *
 * `rotation` (degrees, clockwise seen from above) turns the unit about the
 * point where it meets the wall — 0 is back-to-wall, 90 is side-to-wall. The
 * footprint is what every collision question is asked about, so a rotated unit
 * needs no separate rules: it is just a different rectangle.
 */
export function unitFootprint({ wall, x, width, depth, rotation = 0 }) {
  const ax = wall.along.x; const ay = wall.along.y;
  const nx = wall.inward.x; const ny = wall.inward.y;
  const ox = wall.start.x + ax * x;
  const oy = wall.start.y + ay * x;
  const rad = (Number(rotation) || 0) * Math.PI / 180;
  const cos = Math.cos(rad); const sin = Math.sin(rad);
  // Local (u along the wall, v into the room) → plan, with the rotation applied
  // in the local frame first.
  const place = (u, v) => {
    const ru = u * cos - v * sin;
    const rv = u * sin + v * cos;
    return { x: ox + ax * ru + nx * rv, y: oy + ay * ru + ny * rv };
  };
  return [place(0, 0), place(width, 0), place(width, depth), place(0, depth)];
}

/** A unit's own span in its wall's frame, rotation included. */
export function unitPlanSpan({ wall, x, width, depth, rotation = 0 }) {
  return spanInWallFrame(unitFootprint({ wall, x, width, depth, rotation }), wall);
}

/** A plan polygon measured in one wall's frame: along the wall, into the room. */
export function spanInWallFrame(points, wall) {
  let uMin = Infinity; let uMax = -Infinity; let vMin = Infinity; let vMax = -Infinity;
  for (const p of points) {
    const dx = p.x - wall.start.x;
    const dy = p.y - wall.start.y;
    const u = dx * wall.along.x + dy * wall.along.y;
    const v = dx * wall.inward.x + dy * wall.inward.y;
    uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
  }
  return { left: uMin, right: uMax, near: vMin, far: vMax };
}

/**
 * Everything that blocks movement along `wall` for a unit `depth` deep.
 *
 * Same-wall neighbours are their own span. A unit on another wall counts only
 * when it actually reaches into the depth band this unit occupies — which is
 * exactly what happens in a corner, and never happens on the wall opposite.
 *
 * @param {object} args
 *   wall     the wall being moved along (from engine/room.js roomWalls)
 *   walls    every wall of the room
 *   depth    the moving unit's depth
 *   others   [{ wall: index, x_mm, width, depth, label }] — every OTHER unit
 *            at the same mounting level
 */
export function wallObstacles({ wall, walls, depth, others = [] }) {
  const out = [];
  for (const o of others) {
    if (o.wall === wall.index && !o.rotation) {
      out.push({ left: o.x_mm, right: o.x_mm + o.width, label: o.label, corner: false });
      continue;
    }
    const otherWall = walls[o.wall];
    if (!otherWall) continue;
    const footprint = unitFootprint({
      wall: otherWall, x: o.x_mm, width: o.width, depth: o.depth, rotation: o.rotation,
    });
    const span = spanInWallFrame(footprint, wall);
    if (o.wall === wall.index) {
      // A rotated neighbour on THIS wall: its footprint is what counts, not
      // its nominal width.
      out.push({ left: span.left, right: span.right, label: o.label, corner: false });
      continue;
    }
    // Behind this wall, or past the front of this unit: not in the way.
    if (span.far <= 0 || span.near >= depth) continue;
    if (span.right <= 0 || span.left >= wall.width) continue;
    out.push({ left: span.left, right: span.right, label: o.label, corner: true });
  }
  return out;
}

/**
 * How deep a unit may be at this spot before it runs into the far wall.
 *
 * A ray is cast into the room from each end of the unit's footprint; the first
 * wall either ray meets is the limit. Exact for a rectangle and for the
 * L-shaped rooms turn 3 introduces.
 */
export function maxDepthOnWall({ wall, walls, x, width }) {
  let limit = Infinity;
  for (const u of [x, x + width]) {
    const px = wall.start.x + wall.along.x * u;
    const py = wall.start.y + wall.along.y * u;
    for (const other of walls) {
      if (other.index === wall.index) continue;
      const t = rayToSegment(px, py, wall.inward, other);
      if (t != null && t > 1e-6) limit = Math.min(limit, t);
    }
  }
  return Number.isFinite(limit) ? limit : 0;
}

/** Distance from (px,py) along `dir` to the segment `seg`, or null. */
function rayToSegment(px, py, dir, seg) {
  const sx = seg.start.x; const sy = seg.start.y;
  const ex = seg.end.x; const ey = seg.end.y;
  const rx = dir.x; const ry = dir.y;
  const qx = ex - sx; const qy = ey - sy;
  const denom = rx * qy - ry * qx;
  if (Math.abs(denom) < 1e-9) return null;              // parallel
  const t = ((sx - px) * qy - (sy - py) * qx) / denom;  // along the ray
  const s = ((sx - px) * ry - (sy - py) * rx) / denom;  // along the segment
  if (t < 0 || s < -1e-6 || s > 1 + 1e-6) return null;
  return t;
}

// ─── Resizing a unit ───────────────────────────────────────────────────────
// Widening is a move like any other: it has to stop at the same barriers. The
// difference is which end moves — the position stays put and the far edge
// travels — so it gets its own clamp rather than a re-run of clampUnitX.

/**
 * The widest this unit may be where it stands.
 *
 * @returns {{width:number, max:number, blocked:boolean, by:string|null}}
 */
export function clampUnitWidth({ width, x, wallWidth, others = [] }, profile) {
  const clearance = profile.editor.minUnitGap;
  let max = Math.max(0, wallWidth - x);
  let limitedBy = 'the wall';

  for (const o of others) {
    if (o.right <= x) continue;                 // entirely to the left
    const free = o.left - clearance - x;
    if (free < max) { max = Math.max(0, free); limitedBy = o.label || 'a neighbour'; }
  }
  const next = Math.min(Number(width) || 0, max);
  const blocked = next < (Number(width) || 0);
  return { width: next, max, blocked, by: blocked ? limitedBy : null };
}

/**
 * The deepest this unit may be where it stands: the room's own limit, and any
 * unit on another wall that its footprint would grow into.
 */
export function clampUnitDepth({ depth, x, width, wall, walls, others = [] }, profile) {
  const clearance = profile.editor.minUnitGap;
  let max = maxDepthOnWall({ wall, walls, x, width });
  let limitedBy = 'the room';

  for (const o of others) {
    if (o.wall === wall.index && !o.rotation) continue;
    const otherWall = walls[o.wall];
    if (!otherWall) continue;
    const span = spanInWallFrame(
      unitFootprint({ wall: otherWall, x: o.x_mm, width: o.width, depth: o.depth, rotation: o.rotation }),
      wall,
    );
    // Only a neighbour standing in front of this unit's width can limit it.
    if (span.right <= x || span.left >= x + width) continue;
    if (span.far <= 0) continue;
    const free = span.near - clearance;
    if (free < max) { max = Math.max(0, free); limitedBy = o.label || 'a neighbour'; }
  }
  const next = Math.min(Number(depth) || 0, max);
  const blocked = next < (Number(depth) || 0);
  return { depth: next, max, blocked, by: blocked ? limitedBy : null };
}

/**
 * Where a unit actually ends up when slid along a wall.
 *
 * A unit moves CONTINUOUSLY, so it can only be stopped by the obstacles it
 * would reach first: the free slot it is standing in right now. Obstacles on
 * the far side of a neighbour are irrelevant — you cannot pass through the
 * neighbour to get to them. That is what makes this a hard stop rather than a
 * "nearest legal position", which would let a fast drag teleport a unit past
 * its neighbour into the next gap.
 *
 * The magnet is the same barrier, reached early: within `unitMagnet` of a
 * neighbour's edge (or a wall end) the unit butts against it exactly. Edge to
 * edge, never an overlap.
 *
 * @param {object} args
 *   x          desired position (already snapped by the caller)
 *   current    where the unit is now — defines which slot it is in
 *   width      the unit's width
 *   wallWidth  the wall it stands on
 *   others     [{left,right}] footprints of the OTHER units on the same wall
 */
export function clampUnitX({ x, current, width, wallWidth, others = [] }, profile) {
  const magnet = profile.editor.unitMagnet;
  const clearance = profile.editor.minUnitGap;

  const wallMax = Math.max(0, wallWidth - width);
  const here = clampTo(current ?? x, 0, wallMax);

  let low = 0;
  let high = wallMax;
  for (const o of others) {
    // Which side an obstacle is on is decided on the RAW footprints: a unit
    // standing flush against its neighbour is on that neighbour's right, not
    // "overlapping it". The clearance is then applied to the barrier itself —
    // reading the side off the padded span instead would make a flush pair look
    // overlapping the moment a scribe gap is configured, and the clamp would
    // stop constraining exactly the neighbour it is meant to protect.
    if (o.right <= here) low = Math.max(low, o.right + clearance);            // blocks travel left
    else if (o.left >= here + width) high = Math.min(high, o.left - clearance - width); // blocks right
    // Anything left over genuinely overlaps this unit already. It cannot
    // constrain the move without teleporting the unit out of the overlap, so
    // it is skipped and unitIssues() reports it instead.
  }

  // With no scribe gap this cannot happen: low ≤ here ≤ high by construction,
  // which is precisely what makes the clamp a stop rather than a jump. It
  // becomes reachable once minUnitGap > 0 and a run was built without it.
  if (high < low) return { x: here, min: low, max: high, blocked: true };

  let next = clampTo(x, low, high);
  if (Math.abs(next - low) <= magnet) next = low;
  else if (Math.abs(next - high) <= magnet) next = high;
  return { x: next, min: low, max: high, blocked: false };
}

/**
 * What is wrong with this unit where it stands. Position is already clamped by
 * the setters, so these are the cases clamping CANNOT fix — the unit simply
 * does not fit the room and a number has to change.
 */
export function unitIssues({ unit, wallWidth: wallW, roomHeight: roomH, others = [] }) {
  const issues = [];
  // Plain numbers, not a room object: this file knows nothing about how a room
  // is shaped, which is what lets the same rule serve a rectangle, an L and
  // whatever comes next (engine/room.js does the shape).
  const wallWidth = Number(wallW) || 0;
  const roomHeight = Number(roomH) || 0;
  const w = Number(unit.params?.width) || 0;
  const h = Number(unit.params?.height) || 0;

  if (roomHeight > 0 && h > roomHeight) {
    issues.push({
      level: 'error',
      code: 'UNIT_TALLER_THAN_ROOM',
      message: `Unit is ${Math.round(h - roomHeight)} mm taller than the room (${Math.round(h)} mm in a ${Math.round(roomHeight)} mm room).`,
    });
  }
  if (wallWidth > 0 && w > wallWidth) {
    issues.push({
      level: 'error',
      code: 'UNIT_WIDER_THAN_WALL',
      message: `Unit is ${Math.round(w - wallWidth)} mm wider than the wall (${Math.round(w)} mm on a ${Math.round(wallWidth)} mm wall).`,
    });
  }

  const me = unitSpan(unit);
  for (const o of others) {
    if (o.right > me.left && me.right > o.left) {
      issues.push({
        level: 'error',
        code: 'UNIT_OVERLAP',
        message: `Unit overlaps ${o.label || 'another unit'} on this wall by ${Math.round(Math.min(o.right, me.right) - Math.max(o.left, me.left))} mm.`,
      });
      break;
    }
  }
  return issues;
}

/**
 * Where a NEW unit of `width` lands.
 *
 * Empty wall: centred. Otherwise butted onto the right-hand end of the run, so
 * building a row of units is just "add, add, add" — the tura-1 behaviour, kept
 * deliberately. Only when the right-hand end has run out of wall does it fall
 * back to the first gap wide enough, and finally to the far end of the wall
 * (where unitIssues() reports the overlap that no placement could avoid).
 */
export function firstFreeUnitX({ width, wallWidth, others = [] }) {
  const wallMax = Math.max(0, wallWidth - width);
  if (!others.length) return Math.round(Math.max(0, (wallWidth - width) / 2));

  const rightMost = others.reduce((m, s) => Math.max(m, s.right), 0);
  if (rightMost <= wallMax) return Math.round(rightMost);

  const spans = [...others].sort((a, b) => a.left - b.left);
  let cursor = 0;
  for (const s of spans) {
    if (s.left - cursor >= width) return Math.round(clampTo(cursor, 0, wallMax));
    cursor = Math.max(cursor, s.right);
  }
  return Math.round(wallMax);
}
