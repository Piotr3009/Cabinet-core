// ─── OVERLAY DRAWERS IN A WARDROBE (turn 40, CLAUDE.md F3b) ─────────────────
//
// The owner, 18.08.2026: *"nadal nie mamy szuflad nawierzchniowych — w sensie
// żeby były na wierzchu, czyli bez infilla, fronty na szafie, drzwi powyżej
// szuflad."* Drawers whose fronts are ON the wardrobe rather than behind its
// doors, with the doors starting above them.
//
// He confirmed the law point by point, and every point is a line of this file:
//
//   · SAME LOGIC AS BUDR, but inside a wardrobe. So this module computes NO
//     runner row, NO box side and NO drilling: it works out WHERE THE STACK
//     STOPS, and `engine/cabinet.js` runs the kit's own BUDR ladder for
//     everything below that line. Re-deriving the runner law here would be a
//     second answer to a question KIT_BUDR_FULL settled, which is the fault
//     T40-F2 spent a whole feature removing one storey down.
//   · THE STACK ALWAYS SITS AT THE BOTTOM of the wardrobe — so its own frame
//     IS the BUDR frame, measured up from the carcass floor, and there is no
//     offset to get wrong.
//   · A FIXED SHELF sits above the stack, separating it from the section above.
//   · THE DOORS ABOVE ARE SHORTENED: they start above the stack and run to the
//     top, and their hinges follow the standard law for that shortened height.
//   · 3 mm GAP — *"nie zapomnij"*. It is the drawer stack's own gap
//     (`baseDrawerUnit.gap`), which is the same 3 mm that stands between any
//     two fronts of one cabinet.
//   · OVERLAY DRAWERS NEVER HAVE THE 30 mm INFILL, unconditionally. That is
//     not F3a's conditional strip said again: an INTERNAL drawer reserves a
//     hinge band when a door swings through it, and an overlay drawer front
//     is OUTSIDE the carcass, so nothing swings past it ever. It falls out of
//     the construction rather than being switched off — a wardrobe's internal
//     stack (`drawerStyle === 'wardrobe'`) is what cuts the DP panel and its
//     fillers, and an overlay stack is not that stack.
//   · HEIGHTS DEFAULT TO EQUAL, not the 3/2/1 progression a kitchen bank uses,
//     with the per-drawer height slider working as it does everywhere else.
//
// Pure functions — no React, no store, no panels. Everything that needs a
// cabinet is done by the caller.

/** Two heights a joiner could not measure between are the same height. */
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.5;

/**
 * The overlay stack's own items, in stack order (bottom-up).
 *
 * A zoned item belongs to a column and is not this stack, exactly as the
 * wardrobe's internal drawers already read their own list.
 */
export function overlayDrawerItems(items = []) {
  return (items || [])
    .filter((i) => i?.kind === 'overlay_drawer'
      && (i.zone == null || !Number.isFinite(Number(i.zone))))
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
}

/**
 * THE HEIGHTS, AND THEY DEFAULT TO EQUAL.
 *
 * *"Wysokości domyślnie równe"* — so a drawer that says nothing takes the
 * workshop's own front height and every drawer in the stack gets the same one.
 * There is no ratio to apply and deliberately so: 4:3:2 is what a BASE UNIT's
 * face is split into because the face is fixed and the stack has to fill it,
 * and an overlay stack in a wardrobe has no such face — it is as tall as the
 * drawers the joiner asked for.
 *
 * A drawer that DOES say something is taken exactly, floored at the minimum a
 * runner can be screwed to. That is the same rule the slider follows
 * everywhere else in the app.
 */
export function overlayHeights(items, { defaultHeightMm = 200, minFrontMm = 0 } = {}) {
  return overlayDrawerItems(items).map((it) => {
    const said = Number(it?.height_mm);
    const want = Number.isFinite(said) && said > 0 ? said : Number(defaultHeightMm) || 0;
    return Math.max(Number(minFrontMm) || 0, want);
  });
}

/** Σh + (n−1)·gap — where the stack stops, measured from the carcass floor. */
export function overlayStackTop(heights = [], gap = 0) {
  const list = (heights || []).map((h) => Number(h) || 0);
  if (!list.length) return 0;
  return list.reduce((s, h) => s + h, 0) + (list.length - 1) * (Number(gap) || 0);
}

/**
 * THE WHOLE PLAN, in one object.
 *
 * @param {object} args
 *   items            the unit's item list (any kinds; this picks its own)
 *   height           the carcass height, mm
 *   boardT           the carcass board, mm — the fixed shelf is cut from it
 *   gap              `baseDrawerUnit.gap`, the owner's 3
 *   minFrontMm       `minDrawerFrontHeight(profile)` — passed IN rather than
 *                    read here, because that rule already has one home in
 *                    `engine/cabinet.js` and a second reading of it is exactly
 *                    the kind of divergence this turn exists to remove
 *   defaultHeightMm  `wardrobe.drawers.frontHeight`
 *   warnings         the engine's own list; this REPORTS and never re-cuts
 * @returns {object|null} null when no overlay drawer was asked for — which is
 *          every cabinet in every project before this feature, and is what
 *          keeps `computeCabinet()` byte-identical for all six standard configs
 */
export function overlayPlan({
  items = [], height = 0, boardT = 0, gap = 3, minFrontMm = 0, defaultHeightMm = 200,
  warnings = [],
} = {}) {
  const list = overlayDrawerItems(items);
  if (!list.length) return null;

  const heights = overlayHeights(items, { defaultHeightMm, minFrontMm });
  const G = Number(boardT) || 0;
  const H = Number(height) || 0;
  const g = Number(gap) || 0;
  const stackTop = overlayStackTop(heights, g);

  // ─── WHERE THE SHELF GOES, AND WHERE THE DOOR STARTS ───────────────────────
  //
  // ONE LINE, and both sit on it: the fixed shelf's UNDERSIDE is the ceiling of
  // the drawer compartment, and the door above starts exactly there. That is
  // what "drzwi powyżej szuflad" means on a cabinet whose fronts overlay it —
  // the door's bottom edge stands the front gap above the top drawer front,
  // and the board it closes against is behind that edge.
  const shelfY = stackTop + g;
  const doorBase = shelfY;
  const doorFaceMm = H - doorBase;

  const fits = doorFaceMm > G;
  if (!fits) {
    // Report, never fix — the house grammar. The stack is what he asked for.
    warnings.push({
      code: 'OVERLAY_STACK_TOO_TALL',
      message: `${list.length} overlay drawers stand ${Math.round(stackTop)} mm up a ${Math.round(H)} mm `
        + 'carcass — there is no room left for a door above them.',
    });
  }
  if (shelfY + G > H) {
    warnings.push({
      code: 'OVERLAY_SHELF_NO_ROOM',
      message: `The fixed shelf above the overlay stack would sit at ${Math.round(shelfY)} mm in a `
        + `${Math.round(H)} mm carcass — raise the cabinet or shorten the drawers.`,
    });
  }

  return {
    count: list.length,
    ids: list.map((it) => it.id ?? null),
    heights,
    gap: g,
    stackTop,
    // The FIXED shelf: its underside, and the board it is cut from.
    shelfY,
    shelfThickness: G,
    // The shortened door: where it starts, and the face it is cut from BEFORE
    // the top-edge demand (`doors.js topDemandMm`) is taken off it — the
    // engine owns that subtraction and always has.
    doorBase,
    doorFaceMm,
    fits,
  };
}

/**
 * Does this door start above an overlay stack?
 *
 * Asked of a plan and a y, so a reader does not have to know the arithmetic.
 * Exported because the CHECK layer and the tests both ask it.
 */
export function standsOnOverlayStack(plan, y) {
  return Boolean(plan) && near(plan.doorBase, y);
}
