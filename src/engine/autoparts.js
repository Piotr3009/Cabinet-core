// ─── Construction automatics ───
// The pieces nobody draws by hand but everybody cuts: the plinth under a
// standing unit, the scribe filler between a unit and the wall, and the panel
// that closes the gap up to the ceiling (CLAUDE.md turn 3, phase 7).
//
// This module decides WHAT a unit should have, from the room around it. The
// pieces themselves are emitted by computeCabinet, so they arrive in the BOM,
// on the CNC sheet and in the DXF the same way every other part does — there
// is no second cut list for "extras".
//
// Pure functions — no React, no store imports.

import { getUnitType } from './types.js';

/** Does this type stand on the floor and therefore get a plinth? */
export function takesPlinth(typeId, profile) {
  const type = getUnitType(typeId);
  return Boolean(profile.autoParts.plinth.enabled && type.legs && type.mount === 'floor');
}

/**
 * The top infill height a unit should have.
 *
 * A unit gets the profile default the moment it is placed; dragging its top
 * edge or double-clicking it takes it all the way to the ceiling. The result
 * is always clamped to what the room actually has left above the unit.
 */
export function topInfillHeight({ requested, unitTop, roomHeight }, profile) {
  const T = profile.autoParts.topInfill;
  const available = Math.max(0, (Number(roomHeight) || 0) - (Number(unitTop) || 0));
  if (available <= 0) return 0;
  const want = Number.isFinite(Number(requested)) ? Number(requested) : T.defaultHeight;
  if (want <= 0) return 0;
  return Math.min(Math.max(want, T.minHeight), available);
}

/** The height that takes the unit all the way to the ceiling (double click). */
export function topInfillToCeiling({ unitTop, roomHeight }) {
  return Math.max(0, (Number(roomHeight) || 0) - (Number(unitTop) || 0));
}

/**
 * The gap on each side of a unit, and whether a scribe filler closes it.
 *
 * A filler fills the gap it is there for; the Design Settings width is the
 * WIDEST gap the workshop will close that way. Anything wider is not a scribe
 * — it is a missing cabinet — so it is reported instead of being papered over
 * with a filler that does not reach.
 *
 * @param {object} args
 *   x, width       the unit on its wall
 *   wallWidth      the wall it stands on
 *   others         [{left, right}] spans of the other units on that wall
 *   settingWidth   design.infill.sideWidth
 */
export function sideInfill({ x, width, wallWidth, others = [], settingWidth }, profile) {
  const S = profile.autoParts.sideInfill;
  const maxWidth = Math.min(Number(settingWidth) || 0, S.maxWidth);
  const notices = [];

  const gapTo = (side) => {
    if (side === 'left') {
      // Nearest obstacle to the left: a neighbour's right edge, or the wall.
      const edge = others.filter((o) => o.right <= x + 1e-6).reduce((m, o) => Math.max(m, o.right), 0);
      return { gap: x - edge, againstWall: edge === 0 };
    }
    const right = x + width;
    const edge = others.filter((o) => o.left >= right - 1e-6).reduce((m, o) => Math.min(m, o.left), wallWidth);
    return { gap: edge - right, againstWall: edge === wallWidth };
  };

  const out = { left: 0, right: 0, notices };
  for (const side of ['left', 'right']) {
    const { gap, againstWall } = gapTo(side);
    if (!againstWall) continue;                    // a neighbour closes it, not a filler
    if (gap < S.minWidth) continue;                // flush, or close enough to scribe out
    if (gap > maxWidth) {
      notices.push(`${Math.round(gap)} mm gap on the ${side} is wider than the ${Math.round(maxWidth)} mm infill setting — leave it, or add a unit.`);
      continue;
    }
    out[side] = Math.round(gap * 100) / 100;
  }
  return out;
}

/**
 * Everything the automatics want for one unit, given the room around it.
 * The store writes these onto the unit's params; the engine turns them into
 * panels.
 */
export function autoPartsFor({ unit, wallWidth, others, roomHeight, design }, profile) {
  const type = getUnitType(unit.type);
  const width = Number(unit.params.width) || 0;
  const height = Number(unit.params.height) || 0;
  const x = Number(unit.position?.x_mm) || 0;
  const base = type.mount === 'wall'
    ? Number(unit.params.mount_height) || 0
    : (type.legs ? (type.legSource === 'wardrobe' ? profile.wardrobe.legHeight : profile.baseUnit.legHeight) : 0);

  const side = sideInfill({
    x, width, wallWidth, others, settingWidth: design?.infill?.sideWidth,
  }, profile);

  return {
    plinth: takesPlinth(unit.type, profile),
    top_infill_mm: topInfillHeight({
      requested: unit.params.top_infill_mm, unitTop: base + height, roomHeight,
    }, profile),
    side_infill_left_mm: side.left,
    side_infill_right_mm: side.right,
    notices: side.notices,
  };
}
