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
 * ─── TURN 51 (CLAUDE.md F3): EVERY JUNCTION THAT EXISTS ─────────────────────
 *
 * The owner, 26.08.2026: *"jak dojedziesz to już nie wymusza panela, a
 * powinno: dojeżdżam — panel się pojawia, nie dojeżdżam — panel znika.
 * proste."*
 *
 * T50 could only ever ADD, and the reason is this function: it answered "where
 * does a panel need adding", which is not the same question as "where is there
 * a junction". A junction with a panel already standing in it was filtered out
 * — by `hasPanel` — so nothing downstream could ever tell the difference
 * between a junction that had been FINISHED and one that had CEASED TO EXIST,
 * and a panel left behind by a cabinet that had been dragged away was
 * indistinguishable from one doing its job.
 *
 * So the SITES are computed first and the filtering comes after. This is the
 * geometry — a low kitchen unit meeting a tall one, with a step worth
 * finishing — and it does not care what is already screwed to it.
 *
 * Module-private on purpose: the two questions a caller actually has are
 * "where does a panel need adding" and "what is standing where no junction is",
 * and both are answered below. A third door onto the same geometry would be a
 * third thing to keep in step.
 *
 * @returns {Array<{unitId, side, otherId, stepMm, hasPanel, declined}>}
 */
function autoEndPanelSites(units, profile, { boardSlack = false } = {}) {
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
      // `boardSlack` allows the space a panel taken off by hand has just left —
      // see `autoEndPanelStrays`. Off, this is T50's own 2 mm and nothing about
      // where a panel is added has changed.
      const slack = boardSlack
        ? Math.max(Number(left.params?.front_t) || 0, Number(right.params?.front_t) || 0)
        : 0;
      if (!(gap <= spec.gapMm + slack + 1e-6)) continue;

      const leftTop = unitTop(left, profile);
      const rightTop = unitTop(right, profile);
      const step = Math.abs(leftTop - rightTop);
      if (!(step >= spec.autoStepMm)) continue;

      // The TALL one carries it, on the side facing the low one.
      const tall = leftTop >= rightTop ? left : right;
      const side = tall === left ? 'R' : 'L';
      const low = tall === left ? right : left;
      out.push({
        unitId: tall.id,
        side,
        otherId: low.id,
        stepMm: round1(step),
        // Is the joint already finished — by the tall unit's own panel, or (a
        // joiner who got there first) by the LOW one's panel in the same slot?
        hasPanel: hasPanel(tall, side) || hasPanel(low, side === 'R' ? 'L' : 'R'),
        // Cleared by hand. Final FOR THIS JUNCTION, which is T51's whole
        // correction: the decline is forgotten when the junction stops
        // existing, so a cabinet moved away and brought back is a new
        // junction and may be offered a panel again.
        declined: declinedSides(tall).includes(side),
      });
    }
  }
  return out;
}

/**
 * Every junction where a LOW kitchen unit meets a TALL one with nothing
 * finishing the joint — the sites above, minus the ones already answered.
 *
 * @returns {Array<{unitId, side, otherId, stepMm}>}  the panel to add, on the
 *          TALL unit, on the side facing the low one.
 */
export function autoEndPanelJunctions(units, profile) {
  return autoEndPanelSites(units, profile)
    .filter((j) => !j.hasPanel && !j.declined)
    .map(({ hasPanel: _h, declined: _d, ...rest }) => rest);
}

/**
 * ─── TURN 51 (CLAUDE.md F3): …AND WHAT NO LONGER HAS A JUNCTION ────────────
 *
 * *"An automatic panel (`meta.autoAdded`) whose junction no longer exists is
 * REMOVED, not left behind."*
 *
 * Two lists, because they are two different repairs and the caller writes them
 * differently: the PANELS to take off, and the DECLINES to forget.
 *
 * A panel the joiner added HIMSELF is never in either list. `auto_added` is the
 * whole test, and it is why T50 wrote that flag.
 *
 * @returns {{panels: Array<{unitId, panelId, side}>, declines: Array<{unitId, side}>}}
 */
export function autoEndPanelStrays(units, profile) {
  const standing = new Set(
    autoEndPanelSites(units, profile).map((j) => `${j.unitId}:${j.side}`),
  );
  // ─── THE DECLINE NEEDS A LONGER MEMORY THAN THE PANEL ────────────────────
  //
  // A junction is "two cabinets meeting", and `autoEndPanelSites` measures that
  // on the PADDED spans within the run gap — 2 mm. That is right for the panel
  // and wrong for the decline, because TAKING THE PANEL OFF opens a gap of one
  // board: the low unit was butted against the panel's outer face, and with the
  // panel gone it is standing 18 mm clear. Read strictly, the joiner's "no"
  // would be forgotten by the very act that expressed it, and the panel would
  // come back on his next nudge — which is the nag T50 closed off.
  //
  // So a decline is forgotten only when the two cabinets are genuinely APART:
  // the same measurement with a BOARD'S THICKNESS of slack, which is exactly
  // the space the removed panel used to occupy. A real retreat is hundreds of
  // millimetres and clears this as easily as it clears the strict one.
  const nearby = new Set(
    autoEndPanelSites(units, profile, { boardSlack: true }).map((j) => `${j.unitId}:${j.side}`),
  );
  const panels = [];
  const declines = [];
  for (const unit of units || []) {
    for (const ep of unit?.params?.end_panels || []) {
      if (!isAutoEndPanel(ep)) continue;
      const side = ep?.side === 'R' ? 'R' : 'L';
      if (standing.has(`${unit.id}:${side}`)) continue;
      panels.push({ unitId: unit.id, panelId: ep.id, side });
    }
    for (const side of declinedSides(unit)) {
      if (nearby.has(`${unit.id}:${side}`)) continue;
      declines.push({ unitId: unit.id, side });
    }
  }
  return { panels, declines };
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
