// ─── THE DRIVER CALCULATOR (turn 45, CLAUDE.md F9c) ─────────────────────────
//
// The owner, 23.08.2026:
//
//   *"Optional `W/m` field → the driver calculator: total W = W/m × metres of
//   ALL placed lines (metres shown beside it). Drivers are 12 V; pick the set
//   whose summed rating ≥ total, smallest unit 60 W. Result lands in the BOM as
//   `N × driver X W`."*
//
// Four sentences, four functions. The arithmetic is here rather than in the
// surface because two things read it — the settings tab, which shows the answer
// while the joiner is typing, and the BOM, which orders it — and a number
// worked out twice is a number that will one day be worked out two ways.
//
// ─── WHY IT DOES NOT LIVE IN THE ENGINE ─────────────────────────────────────
//
// `engine/ledStrips.js lightingBomLines()` already writes one `LED driver /
// PSU` line, qty 1, as a yellow named spec — it has since T33, when nobody had
// told the app what the strips draw. It is the right line for a project that
// has not said its W/m, and iron rule 2 closes `src/engine/**` byte-for-byte
// tonight in any case.
//
// So this is a LAYER OVER that line rather than a replacement for it: given a
// plan, `applyDriverPlan()` rewrites the one row the engine wrote; given none,
// the engine's row stands exactly as it did. The BOM screen and the purchase
// CSV both go through it, so the paper and the screen order the same thing.
//
// Pure — no React, no store.

import { migrateLedSpec } from './ledSpec.js';

/** The 12 V drivers a workshop actually buys, smallest first. */
export const DRIVER_VOLTS = 12;
export const DRIVER_RATINGS_W = [60, 100, 150];

/** *"smallest unit 60 W"* — the floor, whatever the sum says. */
export const SMALLEST_DRIVER_W = DRIVER_RATINGS_W[0];

const round2 = (v) => Math.round(v * 100) / 100;

/**
 * The metres of ALL placed lines in this project.
 *
 * @param {Array<{length_mm:number, kind:string}>} strips  every strip of every
 *   unit, as `engine/ledStrips.js stripsForUnit()` computes them. Spots are not
 *   a run and carry no metres, so they are not counted — the caller may pass
 *   them in and this drops them.
 */
export function totalMetres(strips = []) {
  let mm = 0;
  for (const s of Array.isArray(strips) ? strips : []) {
    if (!s || s.kind === 'spot') continue;
    mm += Number(s.length_mm) || 0;
  }
  return round2(mm / 1000);
}

/**
 * Total watts — *"W/m × metres of ALL placed lines"*.
 *
 * Null when nobody has typed a W/m, which is what makes the surface say "tell
 * me W/m" rather than print a confident zero.
 */
export function totalWatts(runM, spec) {
  const wm = migrateLedSpec(spec).wattsPerMetre;
  if (!(wm > 0)) return null;
  return round2(wm * (Number(runM) || 0));
}

/**
 * WHICH DRIVERS to buy — *"pick the set whose summed rating ≥ total, smallest
 * unit 60 W"*.
 *
 * One size per plan, because "N × driver X W" is what the BOM line says and a
 * mixed bag is not a line a joiner can order. Of the candidates that carry the
 * load, the one that WASTES LEAST wins; a tie goes to the fewer units, and then
 * to the smaller unit — so 200 W is 2 × 100 rather than 4 × 60 or 2 × 150, and
 * a 12 W job is still one 60 W driver, because that is the smallest thing made.
 *
 * @returns {null|{count, ratingW, totalW, suppliedW, headroomW, volts, label}}
 *   null when there is nothing to drive, or no W/m to drive it with.
 */
export function driverPlan(totalW) {
  const load = Number(totalW);
  if (!(load > 0)) return null;
  let best = null;
  for (const ratingW of DRIVER_RATINGS_W) {
    const count = Math.max(1, Math.ceil(load / ratingW));
    const suppliedW = count * ratingW;
    const candidate = {
      count, ratingW, suppliedW, totalW: round2(load),
    };
    if (!best
      || candidate.suppliedW < best.suppliedW
      || (candidate.suppliedW === best.suppliedW && candidate.count < best.count)
      || (candidate.suppliedW === best.suppliedW && candidate.count === best.count
        && candidate.ratingW < best.ratingW)) {
      best = candidate;
    }
  }
  return {
    ...best,
    volts: DRIVER_VOLTS,
    headroomW: round2(best.suppliedW - load),
    label: driverLabel(best),
  };
}

/** *"`N × driver X W`"* — the BOM's own words for a plan. */
export function driverLabel(plan) {
  if (!plan) return null;
  return `${plan.count} × driver ${plan.ratingW} W`;
}

/**
 * The whole answer, from the strips and the spec — what both surfaces ask.
 *
 * @returns {{metres, wattsPerMetre, totalW, plan}}
 */
export function driverSummary(strips, spec) {
  const s = migrateLedSpec(spec);
  const metres = totalMetres(strips);
  const watts = totalWatts(metres, s);
  return {
    metres,
    wattsPerMetre: s.wattsPerMetre,
    totalW: watts,
    plan: driverPlan(watts),
  };
}

/**
 * The BOM's `LED driver / PSU` row, told what the calculator worked out.
 *
 * With no plan the engine's own row stands untouched — a project that has not
 * said its W/m gets the honest "sized to the strip run" named spec it has had
 * since T33. With one, the row becomes the order: `N × driver X W`, 12 V, and
 * the quantity is the count so a purchase list adds up.
 */
export function applyDriverPlan(lines, plan) {
  const list = Array.isArray(lines) ? lines : [];
  if (!plan) return list;
  return list.map((line) => (line?.role === 'led_driver'
    ? {
      ...line,
      label: `LED driver ${plan.ratingW} W · ${plan.volts} V`,
      qty: plan.count,
      unit: 'pcs',
      spec_label: `${plan.label} · ${plan.volts} V — ${plan.totalW} W of strip, ${plan.suppliedW} W supplied`,
    }
    : line));
}
