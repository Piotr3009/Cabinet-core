// ─── Construction automatics ───
// The pieces nobody draws by hand but everybody cuts: the scribe filler between
// a unit and the wall, the plinth under a standing unit, and the panel that
// closes the gap up to the ceiling (CLAUDE.md turn 3, phase 7).
//
// TURN 4 SPLITS THEM IN TWO (BACKLOG #15/#16), because they are not the same
// kind of thing:
//
//   AUTOMATIC — the side infill. It describes the gap between a unit and the
//   wall, and that gap is a FACT about where the unit is standing. A unit now
//   stops one infill width short of the wall, so parking it there produces the
//   filler and driving it away removes it again.
//
//   MANUAL — the plinth and the top infill. Whether a run gets a plinth, and
//   whether the gap to the ceiling is closed, is a DECISION. Turn 3 made both
//   the moment a unit was placed, which put pieces in the cut list that nobody
//   had asked for. They are added from the panel or the right-click menu now,
//   and until then they do not exist: not in 3D, not in the BOM, not in the DXF.
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
 * Is there anything above this kit for a top infill to close against?
 * (turn 8, CLAUDE.md F2.7)
 *
 * The answer is a property of the KIT, not of the room: what sits on top of a
 * base unit is a worktop, and the gap above a worktop is where the wall units
 * go. Offering to fill it is offering to build a wall out of 18 mm board, and
 * the piece would arrive in the BOM and on the CNC sheet as if somebody meant it.
 *
 * The side infill has no such rule and is untouched: a base unit standing at a
 * wall has a scribe gap beside it exactly as a tall one does.
 */
export function takesTopInfill(typeId) {
  return Boolean(getUnitType(typeId).supports.topInfill);
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
 * Turn 4: a filler exists only where the unit is parked AT ITS STOP against the
 * wall — the clamp keeps it exactly `settingWidth` away, so the gap it leaves is
 * exactly the piece that closes it. A unit standing further out in the room has
 * a gap that is not a scribe at all; it gets no filler and, deliberately, no
 * complaint about it either. That WAS a notice in turn 3, when a unit could sit
 * flush against the wall and any gap was a mistake; with the stop it would fire
 * for every unit standing anywhere but at a wall.
 *
 * What is still worth saying: the workshop's own limit. A 250 mm setting cannot
 * be scribed, so the unit stops 250 mm out and no filler reaches — that is
 * reported, because it is a setting to change.
 *
 * @param {object} args
 *   x, width       the unit on its wall
 *   wallWidth      the wall it stands on
 *   others         [{left, right}] spans of the other units on that wall
 *   settingWidth   design.infill.sideWidth
 */
export function sideInfill({ x, width, wallWidth, others = [], settingWidth }, profile) {
  const S = profile.autoParts.sideInfill;
  const setting = Math.max(0, Number(settingWidth) || 0);
  const maxWidth = Math.min(setting, S.maxWidth);
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
    // Parked out in the room rather than at the stop: not a scribe, not an error.
    if (gap > setting + S.stopTolerance) continue;
    if (gap > maxWidth) {
      notices.push(`The ${Math.round(setting)} mm infill setting is wider than the ${Math.round(S.maxWidth)} mm this workshop scribes — the ${Math.round(gap)} mm gap on the ${side} stays open.`);
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
 *
 * The side infill is DERIVED — it is recomputed from where the unit stands. The
 * plinth and the top infill are DECISIONS and are only ever carried through:
 * this function never invents one, and never throws one away either. That is
 * the whole of BACKLOG #16, expressed where the rule belongs rather than as an
 * `if` in the store.
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

  // Manual, and only ever re-clamped: a top infill that was added shrinks when
  // the ceiling drops, and one that was never added stays absent.
  //
  // …and a kit that takes none never has one, however it got there — a project
  // saved before turn 8, a template, an import. The gate is here as well as at
  // the two doors into it, because this is the function that decides what a
  // unit HAS (CLAUDE.md F2.7).
  const wanted = takesTopInfill(unit.type) ? (Number(unit.params.top_infill_mm) || 0) : 0;
  const topInfill = wanted > 0
    ? topInfillHeight({ requested: wanted, unitTop: base + height, roomHeight }, profile)
    : 0;

  return {
    plinth: unit.params.plinth === true && takesPlinth(unit.type, profile),
    top_infill_mm: topInfill,
    side_infill_left_mm: side.left,
    side_infill_right_mm: side.right,
    notices: side.notices,
  };
}
