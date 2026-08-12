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
