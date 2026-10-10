// ─── T75 F15 · THE PELMET, PLAIN ───────────────────────────────────────────
//
// CLAUDE.md T75 F15, verbatim: *"The held-open row `cornice-pelmet` opens as a
// PLAIN pelmet: a flat strip under a run of wall units, `profile.pelmet = {
// heightMm: 50, thicknessMm: front_t } // T75 proposed`, front material, the
// cornice's run, segment and mitre arithmetic reused (`corniceSegments`,
// `corniceCorner`) on the bottom edge instead of the top, BOM role `pelmet`,
// cut list line. It hides the LED strip and changes nothing about the light
// (FROZEN 2)."*
//
// A run element in the cornice's grammar, at the other end of the carcass:
//
//   · the DECISION is the unit's (`params.pelmet === true`), written on every
//     unit of the run by one click, as the upstand's is (T75 F5);
//   · the SEGMENTS are `corniceSegments`' own: maximal stretches of adjacent
//     wall units that want the strip, asked through its `heightOf`;
//   · the ENDS are `runEnd`'s four answers, asked of what stands in the strip's
//     band under the units: a wall or a blocker is a square stop; an OPEN end
//     turns the corner and RETURNS to the wall along the side, mitred at 45°,
//     the cornice's own return; the unit's own end panel is a square stop at
//     the carcass, where the bottom mask stops too;
//   · a segment meeting another on the same wall is `corniceCorner`'s
//     question, asked with the pelmet's one height.
//
// It stands in the DOOR PLANE, one door gap under the door's bottom edge (two
// fronts never touch: the owner's 3 mm), in front material. A door that runs
// below its carcass (`door_extend`) stands where the strip would: refused in
// words, never stacked or clipped. No lighting file reads it (FROZEN 2).

import { getUnitType } from './types.js';
import {
  buildRuns, paddedSpan, runEnd, unitBase, unitTop, unitVerticals, verticalsInBand,
} from './runs.js';
import { corniceCorner, corniceSegments } from './cornice.js';

/** Said when the unit is not hung on a wall. */
export const PELMET_MOUNT_REFUSAL = 'A pelmet hangs under wall units: select a wall unit to hang it under.';
/** Said when the unit's door runs below its carcass, in the strip's plane. */
export const PELMET_DOOR_REFUSAL = 'This unit\'s door runs below its carcass, in the plane a pelmet stands in: '
  + 'take the door extension off first, or leave the pelmet off.';

/** Why this unit cannot carry a pelmet, in words, or null when it can. */
export function pelmetRefusal(unit) {
  const type = unit ? getUnitType(unit.type) : null;
  if (!type || type.mount !== 'wall' || type.freePanel) return PELMET_MOUNT_REFUSAL;
  const extend = unit.params?.door_extend;
  if (extend === true || Number(extend) > 0) return PELMET_DOOR_REFUSAL;
  return null;
}

/** Does this unit want the strip under it (and may it have one)? */
function wantsPelmet(unit) {
  return unit?.params?.pelmet === true && !pelmetRefusal(unit);
}

/** The strip's height, the profile's; 0 when the profile names none. */
function pelmetHeight(profile) {
  return Math.max(0, Number(profile?.pelmet?.heightMm) || 0);
}

/**
 * The `run_pelmet` value for EVERY unit, the twin of `runCorniceParams`: the
 * owner of each segment carries the geometry (in its own frame), everybody
 * else a note.
 *
 * @param {Array} units
 * @param {object} context  walls, frontFaceDepthOf (u) => wall to door face
 * @returns {Map<string, object|null>}
 */
export function runPelmetParams(units, { walls = [], frontFaceDepthOf = null } = {}, profile) {
  const out = new Map((units || []).map((u) => [u.id, null]));
  const height = pelmetHeight(profile);
  if (!(height > 0)) return out;
  const depthOf = frontFaceDepthOf || (() => 0);
  const gap = Math.max(0, Number(profile?.doors?.gap) || 0);
  const verticals = unitVerticals(units, profile);

  const gathered = [];
  for (const run of buildRuns(units, profile)) {
    if (run.mount !== 'wall') continue;
    for (const segment of corniceSegments(run, profile, { heightOf: (u) => (wantsPelmet(u) ? height : 0) })) {
      const first = segment.units[0];
      const last = segment.units[segment.units.length - 1];
      gathered.push({
        run,
        segment,
        first,
        last,
        // The strip's bottom edge above the floor: under the carcass, one door
        // gap down. The line two strips must share to meet at a corner.
        bottom: unitBase(first, profile) - gap - height,
        span: { left: paddedSpan(first).left, right: paddedSpan(last).right },
      });
    }
  }

  const touch = Math.max(0, Number(profile?.autoParts?.cornice?.cornerToleranceMm ?? 2));
  const neighbourOf = (me, side) => {
    for (const other of gathered) {
      if (other === me || other.run.wall !== me.run.wall) continue;
      const meets = side === 'left'
        ? Math.abs(other.span.right - me.span.left) <= touch
        : Math.abs(other.span.left - me.span.right) <= touch;
      if (!meets) continue;
      return {
        unitId: other.first.id, height, top: other.bottom, depth: depthOf(side === 'left' ? other.last : other.first),
      };
    }
    return null;
  };
  const option = (h) => (Number(h) > 0 ? Number(h) : 0);

  for (const me of gathered) {
    const ownerX = Number(me.first.position?.x_mm) || 0;
    const asRun = {
      wall: me.run.wall, mount: me.run.mount, units: me.segment.units, left: me.span.left, right: me.span.right,
    };
    // What stands in the strip's band, under the units, decides its ends.
    const band = { from: me.bottom, to: me.bottom + height + gap };
    const reaching = verticalsInBand(verticals, band);
    const wallWidth = walls?.[me.run.wall]?.width ?? 0;
    const endOf = (side) => {
      const unit = side === 'left' ? me.first : me.last;
      // The unit's own end panel: the strip meets its inner face, square, as
      // the bottom mask does.
      const x = side === 'left' ? Number(unit.position?.x_mm) || 0
        : (Number(unit.position?.x_mm) || 0) + (Number(unit.params?.width) || 0);
      const padded = paddedSpan(unit);
      if (side === 'left' ? padded.left < x : padded.right > x) return { kind: 'end-panel', x };
      // ANOTHER UNIT standing beside this end with its side in the strip's band
      // (a tall unit beside the wall run): the strip stops square on its side.
      // Room refuses first: a return is never run into a carcass.
      const edge = side === 'left' ? padded.left : padded.right;
      const blocker = (units || []).find((o) => !me.segment.units.includes(o)
        && (o.position?.wall ?? 0) === me.run.wall
        && !((Number(o.position?.rotation_deg) || 0) % 360)
        && Math.abs((side === 'left' ? paddedSpan(o).right : paddedSpan(o).left) - edge) <= touch
        && unitBase(o, profile) < band.to && unitTop(o, profile) > band.from);
      if (blocker) return { kind: 'unit', x: edge, blockedBy: blocker.id };
      return runEnd(asRun, side, { wallWidth, roomHeight: 0, verticals: reaching }, profile);
    };
    const left = endOf('left');
    const right = endOf('right');
    const length = right.x - left.x;
    if (!(length > 0)) continue;
    const corners = {
      left: corniceCorner({
        mine: { height, depth: depthOf(me.first), top: me.bottom }, theirs: neighbourOf(me, 'left'), option,
      }, profile),
      right: corniceCorner({
        mine: { height, depth: depthOf(me.last), top: me.bottom }, theirs: neighbourOf(me, 'right'), option,
      }, profile),
    };
    const returns = {
      left: left.kind === 'open' && !corners.left ? depthOf(me.first) || null : null,
      right: right.kind === 'open' && !corners.right ? depthOf(me.last) || null : null,
    };
    out.set(me.first.id, {
      role: 'owner',
      height,
      offset: left.x - ownerX,
      length,
      ends: { left: left.kind, right: right.kind },
      // The cornice's four cases: an open end is mitred and returns; a corner
      // mitres as `corniceCorner` says; a wall or a blocker stops square.
      mitres: {
        left: Boolean(returns.left) || corners.left?.mitre === true || corners.left?.mitre === 'internal',
        right: Boolean(returns.right) || corners.right?.mitre === true || corners.right?.mitre === 'internal',
      },
      returns,
      corners,
      bottom: me.bottom,
      unitIds: me.segment.units.map((u) => u.id),
    });
    for (const u of me.segment.units.slice(1)) out.set(u.id, { role: 'member', ownerId: me.first.id });
  }
  return out;
}
