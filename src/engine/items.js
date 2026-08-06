// ─── Interior items: ONE order, ONE auto-placement rule ───
//
// There are two real orders and turn 3 wrote down neither of them, which is
// exactly how BACKLOG #1 happened: the panel sorted drawers ascending and
// called the first row "the top one".
//
//   ENGINE order  — bottom-up. D1 is the drawer nearest the floor and SHELF-1
//                   is the lowest shelf. That is what the cut list, the runner
//                   rows, the drill rows and the golden fixtures mean, so it
//                   cannot move.
//   LIST order    — top-down. What a human reads in the right panel, and what
//                   the 3D view shows: the first row is the piece nearest the
//                   ceiling.
//
// This module is the single place that says so. The view never sorts; it asks
// here. The engine never asks; it keeps its own bottom-up numbering, and each
// row carries that number so "D2" in the panel is "D2" in the workshop.
//
// Pure functions — no React, no store imports (CLAUDE.md rule 2).

/** Drawers in ENGINE order: index ascending, so [0] is the bottom drawer. */
export function drawersInEngineOrder(items = []) {
  return items
    .filter((i) => i.kind === 'drawer')
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
}

/** Shelves in ENGINE order: position ascending, so [0] is the lowest shelf. */
export function shelvesInEngineOrder(items = []) {
  return items
    .filter((i) => i.kind === 'shelf')
    .sort((a, b) => (Number(a.pos_mm) || 0) - (Number(b.pos_mm) || 0));
}

export function hangerOf(items = []) {
  return items.find((i) => i.kind === 'hanger') || null;
}

/**
 * The rows the right panel shows, TOP-DOWN — the same order the 3D view stacks
 * them in. Each row keeps the engine's own number, because that is the number
 * on the cut list: a three-drawer stack reads D3 / D2 / D1 from the top, and
 * D1 is still the bottom drawer everywhere else in the system.
 *
 * @returns {Array<{item:object, num:number, label:string}>}
 */
export function drawerRows(items = []) {
  const engine = drawersInEngineOrder(items);
  return engine
    .map((item, i) => ({ item, num: i + 1, label: `D${i + 1}` }))
    .reverse();
}

/** The same, for shelves: SHELF-1 is the lowest, the list starts at the top. */
export function shelfRows(items = []) {
  const engine = shelvesInEngineOrder(items);
  return engine
    .map((item, i) => ({ item, num: i + 1, label: `S${i + 1}` }))
    .reverse();
}

// ─── Auto-placement (CLAUDE.md turn 4, F5 / BACKLOG #12) ───
// Adding an item must never land it on top of one that is already there.
// Shelves fill from the TOP down, drawers from the bottom up (the engine
// stacks them there anyway) and the hanger rail takes what is left between
// the two — as high under the lowest shelf as its partitioner allows.

/**
 * Where the next shelf goes: below the lowest shelf already fitted, one
 * `itemStackPitch` down, never closer than `minShelfGap` and never outside the
 * band. When a full pitch does not fit any more it takes the tightest legal
 * slot instead; when even that is gone it returns null, so the caller reports
 * "no room" rather than stacking two shelves in one slot.
 *
 * @param {{band:{min:number,max:number}, positions:number[]}} args
 */
export function nextShelfPos({ band, positions = [] }, profile) {
  const E = profile.editor;
  const taken = positions.filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
  if (!taken.length) return band.max >= band.min ? band.max : null;
  const lowest = taken[0];
  // The closest a shelf may ever sit under the one above it.
  const tightest = lowest - E.minShelfGap;
  if (tightest < band.min) return null;
  const wanted = Math.min(band.max, lowest - E.itemStackPitch);
  return Math.min(Math.max(wanted, band.min), tightest);
}

/**
 * The hanger rail's offset above the zone it hangs in (the drawer partition
 * when there is a stack, otherwise the base panel) — which is what the engine
 * means by `rail_offset`.
 *
 * The type's own default offset is used whenever it FITS under the lowest
 * shelf, clear of the rail's partitioner; otherwise the rail is pulled down to
 * the highest position that does.
 */
export function nextHangerOffset({ band, positions = [], zoneBase, fallback }, profile) {
  const RL = profile.wardrobe.rail;
  const E = profile.editor;
  const taken = positions.filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
  const ceiling = taken.length ? taken[0] : band.ceiling;
  const highest = ceiling - RL.partitionAbove - E.minShelfGap - (Number(zoneBase) || 0);
  // `fallback == null` is "no default for this type" — and NOT zero, which is
  // what Number(null) would quietly make it.
  const want = fallback == null || !Number.isFinite(Number(fallback)) ? highest : Number(fallback);
  return Math.max(E.minShelfGap, Math.min(want, highest));
}
