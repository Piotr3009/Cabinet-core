// ─── Runs, and the one piece that sits on top of one (turn 6, CLAUDE.md F4) ───
//
// A RUN is what a joiner means by a run: cabinets standing side by side on one
// wall, at one level, finishing at one height. It matters here because of a
// single sentence in CLAUDE.md — the top infill is **ONE CONTINUOUS ELEMENT
// FOR THE WHOLE RUN**, not a piece per cabinet.
//
// That is not a detail. A 3.6 m kitchen closed with six 600 mm offcuts has five
// joints across the most visible line in the room, all of them at eye level and
// none of them where a cabinet joint is. One length has none. It is also how
// the thing is actually made: you cut it to the run, scribe it once, and mitre
// the corner.
//
// So the geometry cannot be decided by computeCabinet, which only ever sees one
// cabinet. It is decided HERE, from the room, and written onto the run's first
// unit as a parameter; computeCabinet then builds it like any other panel, so
// it reaches the BOM, the CNC sheet and the DXF by exactly the routes that
// already exist. There is no second cut list for "the long bits".
//
// Pure functions — no React, no store imports.

import { getUnitType } from './types.js';

/** Height of a unit's top above the floor — where anything on top of it starts. */
export function unitTop(unit, profile) {
  const type = getUnitType(unit.type);
  const base = type.mount === 'wall'
    ? Number(unit.params?.mount_height) || 0
    : (type.legs ? (type.legSource === 'wardrobe' ? profile.wardrobe.legHeight : profile.baseUnit.legHeight) : 0);
  return base + (Number(unit.params?.height) || 0);
}

/** How far a unit's own end panels stick out on each side. */
export function endPanelSpread(unit, fallbackThickness = 0) {
  const out = { left: 0, right: 0 };
  for (const ep of unit?.params?.end_panels || []) {
    const t = Number(ep?.thickness) > 0 ? Number(ep.thickness) : Number(fallbackThickness) || 0;
    if (ep?.side === 'R') out.right = Math.max(out.right, t);
    else out.left = Math.max(out.left, t);
  }
  return out;
}

/** The span a unit occupies along its wall, end panels included. */
export function paddedSpan(unit) {
  const pad = endPanelSpread(unit, unit?.params?.front_t);
  const x = Number(unit.position?.x_mm) || 0;
  const w = Number(unit.params?.width) || 0;
  return { left: x - pad.left, right: x + w + pad.right, pad };
}

/**
 * Group units into runs.
 *
 * A run breaks on any of four things, and each of them is a physical fact
 * rather than a convenience:
 *   - a different WALL or a different LEVEL — obviously;
 *   - a TURNED unit, which has no "along the wall" to share;
 *   - a different TOP HEIGHT, because one board cannot lie on two heights;
 *   - a GAP, because a board that bridges nothing is a board hanging in air.
 */
export function buildRuns(units, profile) {
  const groups = new Map();
  for (const unit of units) {
    const rotation = (((Number(unit.position?.rotation_deg) || 0) % 360) + 360) % 360;
    if (rotation !== 0) continue;
    const type = getUnitType(unit.type);
    const wall = unit.position?.wall ?? 0;
    // Rounded to a tenth: two units on the same project height differ by
    // nothing, and floating point should not be able to split a run.
    const top = Math.round(unitTop(unit, profile) * 10) / 10;
    const key = `${wall}|${type.mount}|${top}`;
    const list = groups.get(key);
    if (list) list.push(unit);
    else groups.set(key, [unit]);
  }

  const tolerance = profile.autoParts.topInfill.runGap;
  const runs = [];
  for (const [key, list] of groups) {
    const [wall, mount] = key.split('|');
    const sorted = [...list].sort((a, b) => paddedSpan(a).left - paddedSpan(b).left);
    let current = [sorted[0]];
    for (let i = 1; i < sorted.length; i += 1) {
      const gap = paddedSpan(sorted[i]).left - paddedSpan(current[current.length - 1]).right;
      if (gap <= tolerance) current.push(sorted[i]);
      else { runs.push(makeRun(current, wall, mount, profile)); current = [sorted[i]]; }
    }
    runs.push(makeRun(current, wall, mount, profile));
  }
  return runs;
}

function makeRun(units, wall, mount, profile) {
  return {
    wall: Number(wall),
    mount,
    units,
    top: unitTop(units[0], profile),
    left: paddedSpan(units[0]).left,
    right: paddedSpan(units[units.length - 1]).right,
  };
}

// ─── The four end conditions (CLAUDE.md F4) ───

/**
 * What the element runs into at one end of the run, and where it therefore
 * stops. The order is the order CLAUDE.md lists them in, and it is the order a
 * joiner checks in: is there a wall? is there a filler taking me to the wall?
 * is there a panel already going all the way up? then it is open, and it turns
 * the corner.
 *
 * @returns {{kind:'wall'|'infill'|'end-panel'|'open', x:number}}
 */
export function runEnd(run, side, { wallWidth, roomHeight }, profile) {
  const unit = side === 'left' ? run.units[0] : run.units[run.units.length - 1];
  const span = paddedSpan(unit);
  const carcassEdge = side === 'left'
    ? (Number(unit.position?.x_mm) || 0)
    : (Number(unit.position?.x_mm) || 0) + (Number(unit.params?.width) || 0);
  const outerEdge = side === 'left' ? span.left : span.right;
  const wallAt = side === 'left' ? 0 : (Number(wallWidth) || 0);
  const tolerance = profile.autoParts.topInfill.runGap;

  // 1 — the wall itself.
  if (Math.abs(outerEdge - wallAt) <= tolerance) return { kind: 'wall', x: wallAt };

  // 2 — a vertical L-infill, which closes the gap to the wall. The element runs
  //     over it and finishes on the wall, which is what "ends on it" means for
  //     a piece lying on top.
  const infill = Number(unit.params?.[side === 'left' ? 'side_infill_left_mm' : 'side_infill_right_mm']) || 0;
  if (infill >= profile.autoParts.sideInfill.minWidth) return { kind: 'infill', x: wallAt };

  // 3 — an end panel already taken to the ceiling. The element butts INTO it:
  //     the panel is the finished surface at that end, and running the infill
  //     across its top would put a joint where the eye is.
  const headroom = Math.max(0, (Number(roomHeight) || 0) - run.top);
  const toCeiling = (unit.params?.end_panels || []).some((ep) => {
    const wanted = side === 'left' ? 'L' : 'R';
    if ((ep?.side === 'R' ? 'R' : 'L') !== wanted) return false;
    return headroom > 0 && (Number(ep?.top_mm) || 0) >= headroom - tolerance;
  });
  if (toCeiling) return { kind: 'end-panel', x: carcassEdge };

  // 4 — open. It finishes flush with the outside of the last thing in the run
  //     and turns the corner from there.
  return { kind: 'open', x: outerEdge };
}

/**
 * The top infill for one run, or null when nobody asked for one.
 *
 * Everything is in the OWNER unit's local frame — x measured from the owner's
 * left carcass edge — because that is the frame computeCabinet builds boxes in.
 *
 * @returns {null | {
 *   role:'owner', offset:number, length:number, faceH:number, shelfDepth:number,
 *   thickness:number|null, ends:{left:string,right:string},
 *   returns:{left:number|null, right:number|null}, unitIds:string[] }}
 */
export function runTopInfill(run, { wallWidth, roomHeight, frontFaceDepth }, profile) {
  const T = profile.autoParts.topInfill;
  // The face height a member asked for. A run is one height: the tallest
  // request wins, because the alternative is a step in the middle of the piece.
  const faceH = run.units.reduce((m, u) => Math.max(m, Number(u.params?.top_infill_mm) || 0), 0);
  if (faceH < T.minHeight) return null;

  const left = runEnd(run, 'left', { wallWidth, roomHeight }, profile);
  const right = runEnd(run, 'right', { wallWidth, roomHeight }, profile);
  const owner = run.units[0];
  const ownerX = Number(owner.position?.x_mm) || 0;

  const length = right.x - left.x;
  if (length <= 0) return null;

  // A return exists only at an OPEN end, and it runs along the side of the
  // cabinet AT THAT END — so its length is that cabinet's own front-face depth,
  // not the run's or the first unit's.
  const depthAt = (side) => {
    const d = Math.max(0, Number(frontFaceDepth?.[side]) || 0);
    return d >= T.minReturn ? d : null;
  };

  return {
    role: 'owner',
    offset: left.x - ownerX,
    length,
    faceH,
    shelfDepth: T.shelfDepth,
    thickness: T.thickness,
    ends: { left: left.kind, right: right.kind },
    returns: {
      left: left.kind === 'open' ? depthAt('left') : null,
      right: right.kind === 'open' ? depthAt('right') : null,
    },
    unitIds: run.units.map((u) => u.id),
  };
}

/**
 * The `run_top_infill` value for EVERY unit: the owner carries the geometry,
 * everyone else carries a note saying the run has it covered. A member with no
 * note at all would fall back to the single-unit path in computeCabinet and put
 * a second, shorter piece inside the long one.
 *
 * @returns {Map<string, object|null>} unit id → the parameter to store
 */
export function runInfillParams(units, { walls, roomHeight, frontFaceDepthOf }, profile) {
  const depthOf = frontFaceDepthOf || (() => 0);
  const out = new Map(units.map((u) => [u.id, null]));
  for (const run of buildRuns(units, profile)) {
    const wallWidth = walls?.[run.wall]?.width ?? 0;
    const element = runTopInfill(run, {
      wallWidth,
      roomHeight,
      frontFaceDepth: {
        left: depthOf(run.units[0]),
        right: depthOf(run.units[run.units.length - 1]),
      },
    }, profile);
    if (!element) {
      for (const u of run.units) out.set(u.id, null);
      continue;
    }
    out.set(run.units[0].id, element);
    for (const u of run.units.slice(1)) out.set(u.id, { role: 'member', ownerId: run.units[0].id });
  }
  return out;
}
