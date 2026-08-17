// ─── THE GRAIN, PER ROLE (turn 36, CLAUDE.md F5) ────────────────────────────
//
// The owner's law, verbatim and re-issued from T35-F6:
//
//     "szuflady w pionie, wzdłuż słojów; fronty szuflad też; plinth też."
//
// — drawer boxes stand along the grain, drawer fronts too, and the plinth too.
// CLAUDE.md F5 says it in English: *drawer boxes, drawer fronts and the plinth
// STAND ALONG THE GRAIN. Grain axis per ROLE is law; the layout may not rotate
// these roles off-grain.*
//
// ─── WHAT "ALONG THE GRAIN" MEANS, AS ONE RULE ──────────────────────────────
//
// The grain runs ALONG THE PIECE AS IT STANDS. For a board that stands upright
// in the cabinet — a drawer side, a drawer box's front and back, a drawer
// front, a plinth — that is its own HEIGHT, so the axis is `h`. It is the same
// sentence turn 29 already pinned for the boards that had an answer: "BUL —
// turn 8: up the panel, not lying on its side"; "FRONT — a door runs its
// figure up the door". These five roles are the ones that never got one.
//
// The DRAWER BOTTOM is the exception, and it is not a special case — it is the
// same rule applied to a board that does not stand up. It lies flat, so there
// is no "up the piece", and the house already has the owner's answer for a
// flat bottom, from the shoe box on 16.08: *"pamiętaj, żeby dno były słoje w
// poprzek"* — the grain runs across the width. `w`, exactly as
// `engine/shoeBox.js` cuts its own bottom.
//
// ─── WHY A STATEMENT AND NOT A ROTATION ─────────────────────────────────────
//
// `engine/decors.js grainRun` is the one reader, and its own note says why
// this field exists: the saw's default is "the grain runs the LONGER of a
// part's two cut dimensions", and "a workshop that genuinely wants the figure
// across a piece says so on the piece (`cnc.grain`), which is the only
// statement that could ever beat the saw". A drawer front is WIDE and short
// and a plinth is long and shallow, so the saw's rule puts both of them across
// — which is the answer the owner overruled.
//
// The DRAWN FRAME is deliberately not touched. Turning these pieces on the
// sheet would move the CNC fingerprint for no gain: nothing turns them today
// (`engine/cnc/layout.js sheetTurn` turns the SHELF family and nothing else),
// so the no-flip half of the law holds by construction and is pinned by test
// rather than by a second guard that could drift from the first.

/**
 * The axis each ROLE's grain runs along, in the panel's own `w × h` record.
 * `w` = across the piece, `h` = up it. Every entry is one of the owner's five
 * plus the flat bottom his shoe box already answered.
 */
export const GRAIN_AXIS_BY_PART = Object.freeze({
  // The drawer BOX — "szuflady w pionie".
  'DRAWER-SIDE': 'h',
  'DRAWER-BOX-FRONT': 'h',
  'DRAWER-BOX-BACK': 'h',
  // …and its bottom, which lies flat: "dno — słoje w poprzek".
  'DRAWER-BOTTOM': 'w',
  // The drawer FRONT — "fronty szuflad też".
  'DRAWER-FRONT': 'h',
  // The PLINTH — "plinth też".
  PLINTH: 'h',
});

/**
 * Stamp the law on a cabinet's panels, in place.
 *
 * A panel that ALREADY says something keeps what it says: a piece somebody
 * has stated an axis for is a decision, and this is a default for the roles
 * that never had one. Nothing outside the table is touched — a side, a top, a
 * back, a shelf and a door are answered where they always were.
 *
 * @param {Array<object>} panels  the engine's own panel records
 * @returns {Array<object>} the same array, for chaining
 */
export function applyGrainAxis(panels) {
  for (const p of panels || []) {
    const axis = GRAIN_AXIS_BY_PART[p?.part];
    if (!axis) continue;
    p.cnc = p.cnc || {};
    if (p.cnc.grain === undefined) p.cnc.grain = axis;
  }
  return panels;
}

/**
 * Is this a role the layout may NOT turn?
 *
 * The no-flip half of F5, as a question anything can ask. Today nothing turns
 * these parts — `engine/cnc/layout.js sheetTurn` turns the shelf family and
 * returns 0 for everything else — so this is the law written down where a
 * future nester will look for it rather than a second implementation of it.
 */
export function grainLocked(part) {
  return Object.prototype.hasOwnProperty.call(GRAIN_AXIS_BY_PART, part);
}
