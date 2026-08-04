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
export function unitIssues({ unit, room, others = [] }) {
  const issues = [];
  const wall = room?.walls?.[unit.position?.wall ?? 0];
  const wallWidth = Number(wall?.width) || 0;
  const roomHeight = Number(room?.height) || 0;
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
