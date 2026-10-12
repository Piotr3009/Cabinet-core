// ─── T78 F18 · CHECK #35: A LIFT-UP LEAF AGAINST WHAT STANDS OVER IT ─────────
//
// CLAUDE.md T78 F18: *"collision with the ceiling, a cornice and the unit above
// is a Check."*  A lift leaf (Blum AVENTOS HK / HS / HL / HF top) rises above
// its own top edge at full opening: the HK top's free edge climbs
// FH x 0.29 + FD past the pivot at 107 degrees (the catalogue's own Y), the
// HF top's upper half the same way, an HS or HL leaf travels up by its path.
// What it can hit is the room's ceiling, the cornice on its own top, or a wall
// unit hanging higher on the same span of wall. Said in words, NEVER clipped:
// the leaf is cut as asked and the sentence names the way out (a lower mount
// height, a shorter unit, another system).
//
// ONE DERIVATION. The rise is the leaf's own `meta.lift.riseMm`, written by
// engine/liftSystems.js from the same angle and the same path the scene
// animates to (`liftRiseMm`); this file measures it against the room and
// re-derives nothing of the motion. An HS / HL leaf whose catalogue keyframes
// the data file does not have (11.10.2026: both null) rises by the PLACEHOLDER
// path, a plain rise of the leaf height, and the sentence says so.
//
// Pure functions: no React, no store. `runChecks` (engine/checks.js) calls
// `liftClearanceFindings` and pushes what comes back, in the one finding shape.

import { getUnitType } from './types.js';
import { unitBase, unitTop } from './runs.js';
import { corniceOption, takesCornice } from './cornice.js';
import { LIFT_LABELS, LIFT_MOTIONS } from './liftSystems.js';
import { roundTo } from './format.js';

/** The check's number, once. */
export const LIFT_CLEARANCE_CHECK = 35;

/** The span a unit occupies along its wall, in mm, by its own width. */
function spanOf(unit) {
  const x = Number(unit?.position?.x_mm) || 0;
  const w = Number(unit?.params?.width) || 0;
  return { left: x, right: x + w };
}

/**
 * The lift leaves of one result: the carrier leaves only (an HF lower half
 * hangs under the centre hinge and is never the highest point).
 */
function liftLeavesOf(result) {
  return (result?.panels || []).filter((p) => p?.part === 'FRONT' && p.box && p.meta?.lift && !p.meta.lift.parent);
}

/**
 * THE OBSTACLES over one unit: the room's ceiling, the cornice on its top, the
 * nearest wall unit standing higher on the same span. Each as the clearance it
 * leaves above the LEAF's top edge (`leafTopMm`, absolute, floor datum).
 */
export function liftObstacles({
  unit, leafTopMm, units = [], room = null, profile,
}) {
  const out = [];
  const roomH = Number(room?.height) || 0;
  if (roomH > 0) out.push({ kind: 'ceiling', clearMm: roundTo(roomH - leafTopMm, 1), what: 'the ceiling' });
  // The cornice stands on the carcass top and projects in front of the door
  // plane, so a leaf may not rise above the carcass top at all under one.
  const corniceH = takesCornice(unit.type) ? corniceOption(unit.params?.cornice, profile) : 0;
  if (corniceH > 0) {
    out.push({
      kind: 'cornice', clearMm: roundTo(unitTop(unit, profile) - leafTopMm, 1), what: `the ${corniceH} mm cornice on its top`, corniceMm: corniceH,
    });
  }
  // A wall unit (or any unit) hanging higher on the same wall whose span
  // overlaps this one: the nearest base above is the ceiling the leaf meets.
  const wall = unit.position?.wall ?? 0;
  const mine = spanOf(unit);
  const top = unitTop(unit, profile);
  let nearest = null;
  for (const other of units) {
    if (!other || other.id === unit.id) continue;
    if ((other.position?.wall ?? 0) !== wall) continue;
    const theirs = spanOf(other);
    if (theirs.right <= mine.left || theirs.left >= mine.right) continue;
    const base = unitBase(other, profile);
    if (base < top - 1) continue;
    if (!nearest || base < nearest.base) nearest = { base, unit: other };
  }
  if (nearest) {
    const num = nearest.unit.params?.unit_num || nearest.unit.id;
    const label = getUnitType(nearest.unit.type)?.label || nearest.unit.type;
    out.push({
      kind: 'unit', clearMm: roundTo(nearest.base - leafTopMm, 1), what: `${label} ${num} above it`, unitId: nearest.unit.id,
    });
  }
  return out;
}

/**
 * THE FINDINGS (#35, yellow): one per lift leaf whose rise at full opening
 * exceeds what the tightest obstacle leaves it. The same shape every rule in
 * engine/checks.js speaks: `{ check, level, unitId, unitNum, panelId, message,
 * subject, ...numbers }`.
 */
export function liftClearanceFindings({
  entries = [], units = null, room = null, profile = null,
} = {}) {
  const list = units || entries.map((e) => e.unit).filter(Boolean);
  const out = [];
  for (const { unit, result } of entries) {
    if (!unit || !result) continue;
    const unitNum = result.unitNum || unit.params?.unit_num || '';
    for (const leaf of liftLeavesOf(result)) {
      const lift = leaf.meta.lift;
      const rise = Number(lift.riseMm);
      if (!(rise > 0)) continue;
      const leafTop = unitBase(unit, profile) + Number(leaf.box.y) + Number(leaf.box.h);
      const obstacles = liftObstacles({
        unit, leafTopMm: leafTop, units: list, room, profile,
      });
      if (!obstacles.length) continue;
      const tight = obstacles.reduce((a, b) => (b.clearMm < a.clearMm ? b : a));
      if (rise <= tight.clearMm) continue;
      const label = LIFT_LABELS[lift.system] || 'AVENTOS';
      const motion = LIFT_MOTIONS[lift.system] || 'lift';
      const how = lift.system === 'hk' || lift.system === 'hf'
        ? `at ${lift.angleDeg ?? 90} degrees (the ${lift.system === 'hf' ? 'upper half' : 'leaf'} standing up from its top-edge pivot)`
        : (lift.placeholderPath
          ? 'on the placeholder path (a plain rise of the leaf height; the catalogue\'s keyframes are not read, owner to confirm)'
          : 'on the catalogue\'s path');
      const cure = lift.system === 'hk' || lift.system === 'hf'
        ? 'a lower mount height, a shorter leaf, or an HL top (lifts parallel) clears it'
        : 'a lower mount height or a shorter leaf clears it';
      out.push({
        check: LIFT_CLEARANCE_CHECK,
        level: 'yellow',
        unitId: unit.id,
        unitNum,
        panelId: leaf.id,
        message: `${unitNum ? `${unitNum} ` : ''}${leaf.id}: the ${label} leaf (${motion}) rises ${roundTo(rise, 0)} mm above its top edge ${how}; `
          + `${tight.what} ${tight.kind === 'cornice' ? 'stands' : 'is'} ${roundTo(Math.max(0, tight.clearMm), 0)} mm above it. The leaf is cut as asked; ${cure}.`,
        subject: { unitId: unit.id, panelId: leaf.id, editor: 'element' },
        liftSystem: lift.system,
        riseMm: roundTo(rise, 1),
        clearMm: roundTo(tight.clearMm, 1),
        obstacle: tight.kind,
        ...(tight.unitId ? { aboveUnitId: tight.unitId } : {}),
      });
    }
  }
  return out;
}
