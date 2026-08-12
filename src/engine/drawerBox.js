// ─── A FLOOR AND A CEILING ON THE DRAWER BOX (turn 25, CLAUDE.md F8) ────────
//
// From the owner's LISP, with his correction to the clearance.
//
// The side height law itself is unchanged and stays where it is: `sideRatio`
// of the front for a base drawer unit, `frontToSideDelta` off it for a
// wardrobe's internal one. What this adds is the two limits that law never had.
//
// ─── THE CEILING IS THE ONE THAT MATTERS ────────────────────────────────────
//
// "The cap is what stopped a tall top drawer breaking the top panel; the owner
// has seen it happen." A box hangs off its runner and stands up from it; a
// front tall enough makes a box tall enough to foul whatever is above it, and
// what is above it is either the next runner down the stack or — for the top
// drawer — the underside of the top panel. Neither is negotiable, so the SIDE
// is what gives.
//
// The clearance is **5 mm**. That is the owner's number and not the LISP's 3:
// he has watched a box lift a top panel off its tabs and wants the margin.
//
// ─── AND A FLOOR, SO THE OTHER END STAYS BUILDABLE ──────────────────────────
//
// A box front is `side − 15 − G − 1` (the groove, the bottom board, the
// clearance), so a short enough front produces a box front of nothing at all —
// and, below that, of a negative number. The floor is the side height at which
// the box's INSIDE reaches its smallest useful depth, which is one profile
// number and is ours: the owner gave the arithmetic, not the shallowest tray a
// workshop will build.
//
// Pure functions — no React, no store, no three.js (engine rule).

/** The drawer-box limits of a profile, with every field present. */
export function boxLimits(profile) {
  const B = profile?.baseDrawerUnit || {};
  return {
    topClearance: Number(B.boxTopClearance) || 0,
    minInside: Number(B.minBoxInside) || 0,
    frontDeduction: Number(B.boxFrontHeightDeduction) || 0,
    frontExtra: Number(B.boxFrontHeightExtra) || 0,
    aboveRunner: Number(B.boxAboveRunner) || 0,
  };
}

/**
 * The smallest side a box can be cut to and still have a front worth cutting.
 *
 * `minimum inside + 15 + G + 1` — the owner's own expression, read back off the
 * arithmetic that produces the box front so the two cannot drift: whatever
 * `boxFrontHeight()` subtracts, this adds.
 *
 * @param {number} boxBoardT  the BOX's own board (F3.2's slot), not the carcass's
 */
export function boxSideFloor(boxBoardT, profile) {
  const L = boxLimits(profile);
  return L.minInside + L.frontDeduction + (Number(boxBoardT) || 0) + L.frontExtra;
}

/** …and the front that side produces. The inverse of the floor, by construction. */
export function boxFrontHeight(sideH, boxBoardT, profile) {
  const L = boxLimits(profile);
  return (Number(sideH) || 0) - L.frontDeduction - (Number(boxBoardT) || 0) - L.frontExtra;
}

/**
 * The tallest side that still clears what is above the box.
 *
 * @param {object} args
 *   base     where the box's own lower edge sits, in the cabinet's own y —
 *            the runner's underside plus `boxAboveRunner`
 *   ceiling  what is above it: the next runner's underside, or the underside
 *            of the top panel. `null` means nothing is, and there is no cap.
 * @returns {number|null}
 */
export function boxSideCap({ base, ceiling }, profile) {
  if (ceiling == null || !Number.isFinite(Number(ceiling))) return null;
  const L = boxLimits(profile);
  return Number(ceiling) - L.topClearance - Number(base);
}

/**
 * ONE box side, resolved: the kit's own law, then the floor, then the cap.
 *
 * ─── THE ORDER MATTERS, AND IT IS THE OWNER'S ───────────────────────────────
 *
 * The CAP is applied last and wins. A box that cannot be made short enough to
 * clear the top panel is a box that must not be cut tall enough to lift it —
 * the panel is the cabinet and the box is a drawer. Where the cap falls below
 * the floor the answer is the cap AND a warning, because that is a cabinet
 * whose opening cannot hold a drawer at all and the app has to say so rather
 * than cut a box with a negative front.
 *
 * @returns {{height:number, floored:boolean, capped:boolean, impossible:boolean,
 *            wanted:number, floor:number, cap:number|null}}
 *   `wanted` is what the kit's own law asked for, so a caller can report the
 *   difference rather than only the answer.
 */
export function resolveBoxSide({
  wanted, base = 0, ceiling = null, boxBoardT = 0,
}, profile) {
  const asked = Number(wanted) || 0;
  const floor = boxSideFloor(boxBoardT, profile);
  const cap = boxSideCap({ base, ceiling }, profile);

  let height = Math.max(asked, floor);
  const floored = height > asked;
  let capped = false;
  if (cap != null && height > cap) {
    // …and never below nothing. A negative headroom is an opening that cannot
    // hold a drawer, and the honest answer to it is a box of no height plus the
    // `impossible` flag below — not a board cut to minus a hundred and fifty.
    height = Math.max(0, cap);
    capped = true;
  }
  return {
    height,
    wanted: asked,
    floor,
    cap,
    floored: floored && !capped,
    capped,
    // The cap has taken the box below the shortest one worth building.
    impossible: cap != null && cap < floor,
  };
}

// ─── SHORT / OVER (turn 25, CLAUDE.md F10) ──────────────────────────────────
//
// "When the fronts do not fit the opening, or a front is too shallow for a sane
// box, the app says so — a yellow warning on the unit and in the drawer modal,
// naming the number. It does NOT block; the owner wants to see it in practice
// first. Silent clamping ends here."
//
// The engine has clamped quietly in three places for twenty-four turns: a front
// under the runner minimum is raised, a stack that does not add up has its last
// free drawer absorb the drift, and a box side that will not fit is cut short.
// Every one of those is the right answer to a bad number and none of them ever
// reached a person. This is the reading that does.

/**
 * Do the fronts fill the opening they were cut for?
 *
 * @param {object} args
 *   heights    the fronts, in order
 *   gap        `profile.baseDrawerUnit.gap` — one below each front, including
 *              the last (it is the top clearance as well)
 *   available  the face the stack has to fill
 * @returns {{state:'fit'|'short'|'over', by:number, used:number}}
 *   `by` is how many millimetres are missing or spare, always positive.
 */
export function frontStackFit({ heights = [], gap = 0, available = 0 }) {
  const used = heights.reduce((s, h) => s + (Number(h) || 0), 0) + heights.length * (Number(gap) || 0);
  const spare = (Number(available) || 0) - used;
  // Half a millimetre is rounding, not a gap: the kit's own split rounds to
  // whole millimetres and the last free drawer absorbs the drift.
  if (Math.abs(spare) <= 0.5) return { state: 'fit', by: 0, used };
  return { state: spare > 0 ? 'short' : 'over', by: Math.abs(spare), used };
}

/**
 * The warning that reading produces, or null.
 *
 * A sentence with the NUMBER in it, because "the fronts do not fit" is not
 * something a joiner can act on and "17 mm short" is.
 */
export function frontStackWarning({ heights, gap, available }) {
  const fit = frontStackFit({ heights, gap, available });
  if (fit.state === 'fit') return null;
  const by = Math.round(fit.by * 10) / 10;
  return fit.state === 'short'
    ? {
      code: 'DRAWER_FRONTS_SHORT',
      message: `The drawer fronts leave ${by} mm of the opening uncovered — the stack is ${Math.round(fit.used)} mm in a ${Math.round(available)} mm face.`,
    }
    : {
      code: 'DRAWER_FRONTS_OVER',
      message: `The drawer fronts overrun the opening by ${by} mm — the stack is ${Math.round(fit.used)} mm in a ${Math.round(available)} mm face.`,
    };
}

/**
 * The warning codes a DRAWER's own modal is about (turn 25, CLAUDE.md F10).
 *
 * It lives HERE rather than in the component for one reason: a code renamed in
 * the engine and not in the list would stop reaching the modal silently, and a
 * list beside the codes it names is a list a test can hold to them.
 */
export const DRAWER_WARNING_CODES = [
  'DRAWER_FRONTS_SHORT',
  'DRAWER_FRONTS_OVER',
  'DRAWER_HEIGHT_CLAMPED',
  'DRAWER_STACK_MISMATCH',
  'DRAWER_BOX_CAPPED',
  'DRAWER_BOX_FLOORED',
  'DRAWER_BOX_NO_ROOM',
  'DRAWERS_TOO_SHALLOW',
  'DRAWERS_TOO_TALL',
  'APPLIANCE_DRAWER_TOO_SHORT',
  'APPLIANCE_DRAWER_BOX_OVER_SHELF',
];
