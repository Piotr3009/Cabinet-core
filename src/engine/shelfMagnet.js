// ─── THE HEIGHT MAGNET (turn 21, CLAUDE.md F11) ─────────────────────────────
//
// Owner: dragging a shelf near the height of a shelf in the next bay — or the
// next CABINET — should catch, softly. His words: **a proposal, not force.**
//
// So this is a PROPOSAL, and every line of it is written to keep it one:
//
//   • it exists only during a DRAG. Nothing is stored, nothing is linked, and
//     the two shelves do not know about each other a moment later;
//   • the numeric field never goes near it. A joiner who types 848 gets 848,
//     even with a neighbour at 850 — a field that silently wrote a different
//     number than the one typed would be the opposite of a proposal;
//   • drag on through and it lets go. The catch is a window, not a detent that
//     has to be fought out of.
//
// ─── WHAT COUNTS AS "THE SAME HEIGHT" ──────────────────────────────────────
//
// A joiner looking across a wardrobe sees ROOM heights: two shelves line up
// when they line up on the wall, and two cabinets standing on different toe
// kicks do not line up just because their stored numbers match. So every
// candidate is lifted into room space by its own unit's base (`runs.js →
// unitBase`, the same function the runs and the infills use) and the answer is
// brought back down into the dragged unit's own frame.
//
// ─── AND WHAT COUNTS AS "NEXT DOOR" ────────────────────────────────────────
//
// F11.1 names two neighbours and this treats them as one question — a shelf in
// ANOTHER BAY of the same unit, and a shelf in a HORIZONTALLY ADJACENT unit.
// Both are "the shelf you can see beside the one in your hand", which is what
// makes lining them up worth doing at all. A shelf in the same bay is excluded:
// two shelves in one column at one height are two shelves in the same place.
//
// Pure functions — no React, no store, no profile import beyond the numbers the
// caller hands in.

/** Do two runs overlap along the wall? Touching is not overlapping. */
function overlaps(a, b) {
  return a.from < b.to - 1e-9 && b.from < a.to - 1e-9;
}

/**
 * Every height a dragged shelf could line up WITH, in the dragged unit's own
 * frame.
 *
 * @param {object} args
 *   unit        the unit the dragged shelf belongs to
 *   itemId      the dragged shelf's item id — never its own candidate
 *   shelvesOf   (unit) => [{ id, pos_mm, run }] — the shelves of one unit, with
 *               each one's horizontal run where the caller knows it
 *   baseOf      (unit) => how far off the floor that unit's carcass starts
 *   neighbours  the units to consider beside this one (this one included)
 *   spanOf      (unit) => { left, right } along the wall
 * @returns {Array<{pos:number, from:string, unitId:string, itemId:string}>}
 *   `pos` is already in the DRAGGED unit's frame, so a caller can compare it
 *   with `pos_mm` directly. `from` is 'bay' or 'unit', for the guide line.
 */
export function magnetCandidates({
  unit, itemId, neighbours = [], shelvesOf, baseOf, spanOf,
}) {
  if (!unit) return [];
  const myBase = baseOf(unit);
  const mySpan = spanOf(unit);
  const mine = shelvesOf(unit).find((s) => s.id === itemId) || null;
  const out = [];

  for (const other of neighbours) {
    const sameUnit = other.id === unit.id;
    // A unit that does not stand beside this one is not "next door", however
    // close its numbers are.
    if (!sameUnit && !overlapsHorizontally(mySpan, spanOf(other))) continue;
    const base = baseOf(other);
    for (const shelf of shelvesOf(other)) {
      if (sameUnit && shelf.id === itemId) continue;
      // Same unit, SAME BAY: two shelves at one height in one column are two
      // shelves in the same place, not two that line up.
      if (sameUnit && mine && sameBay(mine.run, shelf.run)) continue;
      const pos = Number(shelf.pos_mm);
      if (!Number.isFinite(pos)) continue;
      out.push({
        // Room height, brought back into the dragged unit's own frame.
        pos: pos + base - myBase,
        from: sameUnit ? 'bay' : 'unit',
        unitId: other.id,
        itemId: shelf.id,
      });
    }
  }
  return out;
}

/** Two units are neighbours when their spans along the wall overlap or touch. */
export function overlapsHorizontally(a, b, tolerance = 1) {
  if (!a || !b) return false;
  return a.left - tolerance < b.right && b.left - tolerance < a.right;
}

/** Two shelves are in the same bay when their runs overlap at all. */
export function sameBay(a, b) {
  if (!a || !b) return true; // No run known either side: treat as one column.
  return overlaps(a, b);
}

/**
 * The catch itself.
 *
 * @param {number} pos          where the drag currently wants the shelf
 * @param {Array} candidates    `magnetCandidates()` output
 * @param {number} within       `profile.editor.shelfMagnetMm`
 * @returns {{pos:number, caught:object|null}}
 *   `caught` is the candidate the shelf snapped to, for the guide line and the
 *   chip; null when nothing is near enough, which is most of the drag.
 */
export function applyMagnet(pos, candidates = [], within = 0) {
  const want = Number(pos);
  const range = Math.max(0, Number(within) || 0);
  if (!Number.isFinite(want) || !range || !candidates.length) return { pos: want, caught: null };
  let best = null;
  for (const c of candidates) {
    const d = Math.abs(c.pos - want);
    if (d > range) continue;
    if (!best || d < best.d) best = { d, c };
  }
  // Exactly on it already is not a catch worth drawing a line for, but it is
  // still the shared height, so it is reported.
  return best ? { pos: best.c.pos, caught: best.c } : { pos: want, caught: null };
}
