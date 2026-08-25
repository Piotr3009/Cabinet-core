// ─── A LOW UNIT MEETING A TALL ONE GROWS ITS OWN END PANEL (T50, F4) ────────
//
// The owner, 25.08.2026:
//
//   *"w kuchni jak dodamy niską szafkę do wysokiej bez panela, powinien się
//   dodać panel automatycznie — i informacja na środku monitora: system dodał
//   panel wykończeniowy, chcesz to go usuń, naciśnij prawym myszką i usuń
//   panel."*
//
// ─── WHICH CABINET CARRIES IT, AND WHY IT IS THE TALL ONE ───────────────────
//
// A base run finishing against a tall cabinet leaves the TALL cabinet's side
// showing — from the base unit's worktop up to the tall unit's own top, a metre
// and a half of raw board at eye level in the middle of a kitchen. The low
// unit's side is not showing at all: the tall cabinet is standing in front of
// it, floor to ceiling.
//
// So the panel belongs to the TALL cabinet, on the side facing the low one.
// That is what a joiner screws on and it is what "panel wykończeniowy" means.
//
// ─── AND ONLY IN A KITCHEN ──────────────────────────────────────────────────
//
// *"w kuchni"* — his own first two words. A wardrobe run of different heights
// is a wardrobe, not an unfinished kitchen, and it has never wanted this.
//
// ─── REMOVING IT BY HAND IS FINAL ───────────────────────────────────────────
//
// *"chcesz to go usuń, naciśnij prawym myszką i usuń panel."*  A panel that
// came back on the next redraw would turn the message into a nag and the
// feature into a fight. So a junction the joiner has cleared is REMEMBERED —
// `params.end_panel_declined: ['L'|'R']` on the cabinet that would carry it —
// and this module never offers that junction again.
//
// Pure functions — no React, no store, no three.js.

import { getUnitType } from './types.js';
import { paddedSpan, unitTop } from './runs.js';

const round1 = (v) => Math.round(Number(v) || 0);

/** The auto end-panel block of a profile, with every field present. */
export function autoEndPanelSpec(profile) {
  const s = profile?.autoParts?.endPanel || {};
  return {
    // How big a STEP between two neighbours is a side that shows. A worktop's
    // own thickness is not a step; half a metre is.
    autoStepMm: Number(s.autoStepMm) > 0 ? Number(s.autoStepMm) : 300,
    // How far apart two cabinets may be and still be "meeting". The run gap is
    // the house's own answer to that question everywhere else.
    gapMm: Number(profile?.autoParts?.topInfill?.runGap) >= 0
      ? Number(profile.autoParts.topInfill.runGap)
      : 2,
  };
}

/** The junction sides this unit's joiner has already cleared by hand. */
export function declinedSides(unit) {
  const said = unit?.params?.end_panel_declined;
  if (!Array.isArray(said)) return [];
  return said.filter((s) => s === 'L' || s === 'R');
}

/** Has this unit already got a panel on that side — by any route? */
function hasPanel(unit, side) {
  return (unit?.params?.end_panels || []).some((ep) => (ep?.side === 'R' ? 'R' : 'L') === side);
}

/** Is this a kitchen cabinet standing on the floor? */
function inPlay(unit) {
  const type = getUnitType(unit?.type);
  if (!type) return false;
  if (type.family !== 'kitchen') return false;
  if (type.mount === 'wall') return false;
  if (type.ridesOn) return false;
  const rotation = (((Number(unit.position?.rotation_deg) || 0) % 360) + 360) % 360;
  return rotation === 0;
}

/**
 * Every junction where a LOW kitchen unit meets a TALL one with nothing
 * finishing the joint.
 *
 * @param {Array} units
 * @param {object} profile
 * @returns {Array<{unitId, side, otherId, stepMm}>}  the panel to add, on the
 *          TALL unit, on the side facing the low one.
 */
export function autoEndPanelJunctions(units, profile) {
  const spec = autoEndPanelSpec(profile);
  const out = [];
  const list = (units || []).filter(inPlay);

  // Wall by wall, left to right along it — a junction is two neighbours.
  const byWall = new Map();
  for (const u of list) {
    const wall = u.position?.wall ?? 0;
    if (!byWall.has(wall)) byWall.set(wall, []);
    byWall.get(wall).push(u);
  }

  for (const group of byWall.values()) {
    const sorted = [...group].sort((a, b) => paddedSpan(a).left - paddedSpan(b).left);
    for (let i = 1; i < sorted.length; i += 1) {
      const left = sorted[i - 1];
      const right = sorted[i];
      // They have to be MEETING. A metre of clear wall between two cabinets is
      // not a junction, it is two runs.
      const gap = paddedSpan(right).left - paddedSpan(left).right;
      if (!(gap <= spec.gapMm + 1e-6)) continue;

      const leftTop = unitTop(left, profile);
      const rightTop = unitTop(right, profile);
      const step = Math.abs(leftTop - rightTop);
      if (!(step >= spec.autoStepMm)) continue;

      // The TALL one carries it, on the side facing the low one.
      const tall = leftTop >= rightTop ? left : right;
      const side = tall === left ? 'R' : 'L';
      if (hasPanel(tall, side)) continue;
      // …and the LOW one's own panel finishes the joint just as well. A joiner
      // who has already put one there does not want a second board in the same
      // slot.
      const low = tall === left ? right : left;
      if (hasPanel(low, side === 'R' ? 'L' : 'R')) continue;
      // Cleared by hand — final, for this junction (see the header).
      if (declinedSides(tall).includes(side)) continue;

      out.push({
        unitId: tall.id,
        side,
        otherId: low.id,
        stepMm: round1(step),
      });
    }
  }
  return out;
}

/**
 * The sentence the app says when it has added one.
 *
 * The owner asked for it *"na środku monitora"* — in the middle of the screen —
 * and for it to name the way back out. English copy (iron rule 5).
 */
export function autoEndPanelMessage(unitNum) {
  const who = unitNum ? `${unitNum}: ` : '';
  return `${who}the app added a finishing end panel where this meets the cabinet beside it — right-click it and Remove if you do not want it.`;
}

/**
 * Is this end panel one the app added? (`meta.autoAdded`, on the piece.)
 *
 * *"It carries `meta.autoAdded: true`, so a later turn can tell the two apart,
 * and so the message can be shown once per panel rather than on every
 * redraw."*
 */
export function isAutoEndPanel(ep) {
  return Boolean(ep?.auto_added);
}

/** The declined list a unit should carry once this side has been cleared. */
export function withDeclined(unit, side) {
  const want = side === 'R' ? 'R' : 'L';
  const now = declinedSides(unit);
  return now.includes(want) ? now : [...now, want];
}
