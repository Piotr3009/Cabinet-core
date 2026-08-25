// ─── THE RUN IS SHARED OUT, EQUALLY, ONCE (turn 50, CLAUDE.md F2) ───────────
//
// The owner, 25.08.2026:
//
//   *"jak dodaję ostatnią szafkę do ściany i zostanie mniej niż 400 mm … czy
//   chcesz wyśrodkować? i wtedy wszystkie szafy się ustawią w jednej szerokości
//   od ściany do ściany, oczywiście odejmując infill."*
//
// Which cabinets: *"wszystkie co nie mają narzucone."*  Rounding: *"zaokrąglamy
// — milimetr nie robi różnicy."*  And how long it lasts: *"tylko jednorazowe, z
// możliwością zrobienia Undo — ale to już mamy."*
//
// ─── WHY THIS IS A PLAN AND NOT AN ACTION ───────────────────────────────────
//
// *"Once, not a state."*  So this module computes a PLAN — a width per unit —
// and hands it back. It writes nothing, remembers nothing and is not consulted
// again: the store applies the plan through the setters every other width edit
// goes through, in one batch, and Undo takes it back because it is one ordinary
// edit of several cabinets. There is no `shared_out: true` on anything, because
// a flag would be a state, and a state would want maintaining.
//
// ─── WHAT IS SHARED OUT, AND WHAT IS NOT ────────────────────────────────────
//
// *"wszystkie co nie mają narzucone"* — every cabinet whose width is not
// IMPOSED. Two ways a width is imposed and they are different in kind:
//
//   THE APPLIANCE decides. A dishwasher panel is 600 because the machine is,
//   an oven housing is what the oven is, a fridge housing is what the fridge
//   is. The TYPE declares it (`widthFixed`), so the rule is read off the kit
//   rather than remembered here.
//
//   THE JOINER decides. `params.width_fixed` — he has pinned this one and the
//   share-out steps around it. Absent on every cabinet in every project, which
//   is what makes this a promise rather than a migration.
//
// If that leaves nothing to widen, there is no plan and the bar says so instead
// of offering (`reason: 'nothing-to-widen'`).
//
// ─── THE ARITHMETIC ────────────────────────────────────────────────────────
//
//   `(wall clear − infills) ÷ n`, rounded to 1 mm, the odd millimetre to the
//   LAST cabinet.
//
// "Wall clear" is the stretch of wall this run may occupy: its own span plus
// whatever is free at each end, which is `runEndGap`'s answer and not a second
// measurement. Out of it come the SIDE INFILLS at the ends, the END PANELS
// anywhere in the run, and every FIXED cabinet's own width — none of those are
// share-out material and all of them stand in the same span.
//
// Pure functions — no React, no store, no three.js.

import { getUnitType } from './types.js';
import { buildRuns, paddedSpan, runEndGap } from './runs.js';

const round1 = (v) => Math.round(v);

/** The share-out block of a profile, with every field present. */
export function shareOutSpec(profile) {
  const s = profile?.ui?.shareOut || {};
  return {
    gapMm: Number(s.gapMm) > 0 ? Number(s.gapMm) : 400,
    maxWidthMm: Number(s.maxWidthMm) > 0 ? Number(s.maxWidthMm) : 620,
  };
}

/**
 * Is this cabinet's width IMPOSED?
 *
 * The kit's own declaration first (an appliance decides its housing), then the
 * joiner's pin. Everything else is share-out material.
 */
export function widthFixed(unit) {
  if (unit?.params?.width_fixed === true) return true;
  return Boolean(getUnitType(unit?.type)?.widthFixed);
}

/** How much of a unit's padded span is NOT its carcass — its end panels. */
function padOf(unit) {
  const span = paddedSpan(unit);
  return Math.max(0, (span.pad?.left || 0) + (span.pad?.right || 0));
}

/**
 * What is RESERVED at each end of the run — *"oczywiście odejmując infill."*
 *
 * Two things claim the same millimetres and they must not be counted twice:
 *
 *   THE SIDE INFILL the end unit already states (`side_infill_*_mm`), which is
 *   what `refreshAutoParts` wrote there when the cabinet reached the wall;
 *   THE WALL MARGIN the placement keeps at a wall whatever is stated
 *   (`projectStore.wallMarginOf` — the project's own `design.infill.sideWidth`,
 *   never less than the 10 mm every unit keeps off plaster).
 *
 * They are the SAME reservation seen from two sides, so the answer per end is
 * the larger of the two — and the margin only applies where the end is against
 * a WALL. A run that butts onto a neighbour reserves nothing there.
 *
 * Getting this wrong is not academic: the plan would ask for 4000 across three
 * cabinets, the clamp would give 3920, and every share-out would come back with
 * three "Width limited by the wall" notices on a run that fits perfectly.
 */
function reservedAt(run, { left, right, wallWidth, wallMargin }) {
  const tol = 1e-6;
  const first = run.units[0];
  const last = run.units[run.units.length - 1];
  const margin = Math.max(0, Number(wallMargin) || 0);
  const atWallLeft = Math.abs(left.from) <= tol;
  const atWallRight = Math.abs(right.to - (Number(wallWidth) || 0)) <= tol;
  const l = Math.max(Math.max(0, Number(first?.params?.side_infill_left_mm) || 0), atWallLeft ? margin : 0);
  const r = Math.max(Math.max(0, Number(last?.params?.side_infill_right_mm) || 0), atWallRight ? margin : 0);
  return { left: l, right: r, total: l + r };
}

/**
 * The plan for one run.
 *
 * @param {object} run       one entry from buildRuns()
 * @param {object} context   { wallWidth, others } — as runEndGap takes them
 * @param {object} profile
 * @param {object} options   { extra } — share it out over ONE MORE cabinet
 * @returns {{
 *   ok: boolean, reason: string|null, gap: number, clear: number,
 *   infills: number, fixed: number, n: number, each: number, last: number,
 *   widths: Array<{id: string, from: number, to: number}>,
 *   tooWide: boolean, alternative: object|null,
 * }}
 */
export function shareOutPlan(
  run,
  { wallWidth = 0, others = [], wallMargin = 0 } = {},
  profile,
  { extra = 0 } = {},
) {
  const spec = shareOutSpec(profile);
  const left = runEndGap(run, 'left', { wallWidth, others });
  const right = runEndGap(run, 'right', { wallWidth, others });
  // The whole stretch of wall this run may occupy: itself, plus what is free
  // beside it. `paddedSpan` is what `runEndGap` measures to, so an end panel is
  // inside this span and is taken out again below.
  const clear = Math.max(0, right.to - left.from);
  const gap = Math.max(0, left.gap) + Math.max(0, right.gap);

  const reserved = reservedAt(run, {
    left, right, wallWidth, wallMargin,
  });
  const infills = reserved.total;
  const pads = run.units.reduce((sum, u) => sum + padOf(u), 0);
  const movable = run.units.filter((u) => !widthFixed(u));
  const fixed = run.units
    .filter((u) => widthFixed(u))
    .reduce((sum, u) => sum + (Number(u.params?.width) || 0), 0);

  const n = movable.length + Math.max(0, Math.trunc(extra));
  const share = clear - infills - pads - fixed;

  const base = {
    gap: round1(gap),
    clear: round1(clear),
    infills: round1(infills),
    fixed: round1(fixed),
    n,
    each: 0,
    last: 0,
    widths: [],
    tooWide: false,
    alternative: null,
  };

  if (!movable.length) return { ...base, ok: false, reason: 'nothing-to-widen' };
  if (!(share > 0) || !(n > 0)) return { ...base, ok: false, reason: 'no-room' };

  // *"zaokrąglamy — milimetr nie robi różnicy."*  Whole millimetres, and the
  // odd one goes to the LAST cabinet so the run still finishes on the wall
  // rather than a millimetre short of it.
  const each = Math.floor(share / n);
  const lastOne = each + (round1(share) - each * n);

  const widths = movable.map((u, i) => ({
    id: u.id,
    from: Number(u.params?.width) || 0,
    to: i === movable.length - 1 && !extra ? lastOne : each,
  }));
  // With an EXTRA cabinet the odd millimetre belongs to the one being added,
  // which does not exist yet — so it is carried on the plan and the store gives
  // it to the new cabinet when it makes it.
  const newWidth = extra ? lastOne : null;

  const tooWide = Math.max(each, lastOne) > spec.maxWidthMm;
  return {
    ...base,
    ok: true,
    reason: null,
    each,
    last: lastOne,
    newWidth,
    widths,
    tooWide,
    // Decision 2, written at the top of CLAUDE.md: a share-out that would make
    // the fronts too wide OFFERS the extra cabinet and never adds one. So the
    // alternative is COMPUTED — the bar can print "seven, at 557 mm" — and it
    // is a second button, not a second behaviour.
    // Where the run starts once it has been laid out — the left boundary plus
    // whatever is reserved there. The store lays the cabinets out from it, so
    // the plan and the placement cannot disagree about the first millimetre.
    startAt: round1(left.from + reserved.left),
    reserved,
    alternative: tooWide && !extra
      ? shareOutPlan(run, { wallWidth, others, wallMargin }, profile, { extra: 1 })
      : null,
  };
}

/**
 * Should the bar be offered at all?
 *
 * *"jak dodaję ostatnią szafkę do ściany i zostanie mniej niż 400 mm."*  The
 * leftover is what is FREE at the two ends of the run — `runEndGap` — and the
 * offer stands while that is more than nothing and less than the owner's 400.
 *
 * Zero is not an offer: a run that finishes exactly on the wall has nothing to
 * share out, and a bar over a 0 mm gap is a bar nobody asked for.
 */
export function shareOutOffered(run, context, profile) {
  const spec = shareOutSpec(profile);
  const plan = shareOutPlan(run, context, profile, {});
  if (plan.gap <= 0 || plan.gap >= spec.gapMm) return null;
  return plan;
}

/**
 * The run one unit belongs to, and the offer standing at it — or null.
 *
 * The one entry point the surface uses: hand it the units and the unit that has
 * just been added, get back what to show.
 */
export function shareOutFor(units, unitId, { walls = [], wallMargin = 0 } = {}, profile) {
  const found = runFor(units, unitId, { walls, wallMargin }, profile);
  if (!found) return null;
  const plan = shareOutOffered(found.run, found.context, profile);
  if (!plan) return null;
  return { ...found, plan };
}

/**
 * The run one unit belongs to, and the context to measure it in — WITHOUT the
 * 400 mm gate.
 *
 * The gate belongs to the OFFER (`shareOutFor`, above), which is what decides
 * whether the bar appears. The ACT of sharing out is a thing the joiner asked
 * for, and an action that second-guessed the click that reached it would be a
 * button that sometimes does nothing.
 */
export function runFor(units, unitId, { walls = [], wallMargin = 0 } = {}, profile) {
  const run = buildRuns(units, profile).find((r) => r.units.some((u) => u.id === unitId));
  if (!run) return null;
  const wallWidth = walls?.[run.wall]?.width ?? 0;
  const others = units.filter((u) => (u.position?.wall ?? 0) === run.wall
    && getUnitType(u.type).mount === run.mount);
  return { run, wallWidth, context: { wallWidth, others, wallMargin } };
}

/**
 * Where the BAR stands: IN the leftover gap (decision 1 at the top of
 * CLAUDE.md), which is the bigger of the two free ends.
 *
 * *"A strip that appears IN the leftover gap … is read where the problem is,
 * and ignoring it costs no click."*
 */
export function shareOutGapSpan(run, { wallWidth = 0, others = [] } = {}) {
  const left = runEndGap(run, 'left', { wallWidth, others });
  const right = runEndGap(run, 'right', { wallWidth, others });
  const pick = right.gap >= left.gap ? right : left;
  return {
    side: right.gap >= left.gap ? 'right' : 'left',
    from: pick.from,
    to: pick.to,
    gap: pick.gap,
    wall: run.wall,
    mount: run.mount,
    top: run.top,
  };
}
