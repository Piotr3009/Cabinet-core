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
 * Is this a role whose LAY the owner has decided?
 *
 * ─── RE-STATED, TURN 40 (CLAUDE.md F2) ──────────────────────────────────────
 *
 * It used to read "is this a role the layout may NOT turn?", and that sentence
 * was true only because nothing turned these parts in T36. The owner overturned
 * it on 18.08: *"Jeżeli cięte jest w pionie, słój w pionie… Jak tniemy, tak
 * słoje się pokazują."* The layout DOES turn them now — it turns them until the
 * axis this table names is the one running up the sheet — so the question the
 * predicate answers is the one above, and the answer set is the same set.
 *
 * Re-pinned rather than replaced: `GRAIN_AXIS_BY_PART` is untouched and is
 * still stamped by `applyGrainAxis` exactly as it was, which is what keeps
 * `computeCabinet()` byte-identical. What changed is that the table is now an
 * INPUT to the cut instead of a second answer beside it.
 */
export function grainLocked(part) {
  return Object.prototype.hasOwnProperty.call(CUT_GRAIN_AXIS_BY_PART, part);
}

// ─── TURN 40 (CLAUDE.md F2): ONE GRAIN TRUTH — THE CUT DECIDES ──────────────
//
// The owner, 18.08.2026, decisive:
//
//     "Jeżeli cięte jest w pionie, słój w pionie, to i tak samo powinien być
//      pokazany element na wizualizacji. Jak tniemy, tak słoje się pokazują.
//      Czyli jak tniemy w pionie a układamy w szafie w poziomie, to i słoje w
//      poziomie. Proste. Nie będzie wyjątków, będzie logicznie i składnie i
//      prościej."
//
// THE CUT IS THE ONLY SOURCE. `engine/cnc/layout.js sheetLay()` is that source
// and this table is its INPUT — the roles whose lay the owner has decided,
// with the axis of the PIECE'S OWN `w × h` record that he wants running up the
// sheet. It is deliberately NOT a second answer: nothing reads it to decide
// what the 3-D shows. The 3-D asks the cut.
//
// ─── WHY THE LIST IS A SUPERSET AND NOT AN EDIT ─────────────────────────────
//
// The owner's 18.08 list is T36's six PLUS the left/right END PANEL. Adding a
// key to `GRAIN_AXIS_BY_PART` itself would have `applyGrainAxis` stamp a
// `cnc.grain` on every end panel in the app, and `applyGrainAxis` runs inside
// `computeCabinet()` — an engine move this turn's iron rule 2 forbids. So the
// stamped table stays EXACTLY what it was and the cut reads this one, which is
// that table with the owner's seventh role on the end. One derivation, one
// place to add the eighth.
//
// His reason for the standing seven, recorded because it is the test of
// whether the answer is right: *"jak będzie się oklejać, to nie chcesz oklejać
// w poprzek słoja, tylko wzdłuż."*

/**
 * The axis of the piece's own `w × h` record that runs UP THE SHEET.
 *
 *   'h'  the piece is cut STANDING — its own height top-to-bottom on the board
 *   'w'  the piece is cut LYING — its own width up the board
 *
 * Six of these are T36's, unchanged and stamped by `applyGrainAxis`. The
 * seventh — the END PANEL — is the owner's 18.08 addition and is stated HERE
 * only, because the cut is the only reader that needs it.
 */
export const CUT_GRAIN_AXIS_BY_PART = Object.freeze({
  ...GRAIN_AXIS_BY_PART,
  // The owner's 18.08 addition: a side panel that shows in the room is banded
  // along its length and stands up in the run, so it is cut standing.
  'END-PANEL': 'h',
});

// ─── TURN 41 (F1): THE SHEET STANDS UP ──────────────────────────────────────
//
// T40 read the table above as though its letters named the axis to stand up
// the sheet. They do not, and the measurement says so. Laid by that reading, on
// a real BUDR4 bank and a real wardrobe, EVERY role on the owner's list came
// off the saw LYING DOWN:
//
//     DRAWER-SIDE       490 × 133   laid 133 up × 490 across    LYING
//     DRAWER-BOX-FRONT  518 ×  99   laid  99 up × 518 across    LYING
//     DRAWER-BOX-BACK   518 ×  99   laid  99 up × 518 across    LYING
//     DRAWER-FRONT      597 × 190   laid 190 up × 597 across    LYING
//     PLINTH            600 × 100   laid 100 up × 600 across    LYING
//     END-PANEL         606 × 2250  laid 2250 up × 606 across   standing
//
// The end panel stood only by accident: it is the one role whose own HEIGHT is
// also its LONG side, so obeying the letter and standing the board up happen to
// be the same instruction. For the other five they are opposite instructions,
// and T40 followed the letter.
//
// ─── WHY THE LETTERS COULD NOT MEAN WHAT T40 READ THEM TO MEAN ──────────────
//
// `GRAIN_AXIS_BY_PART` was dictated in T36 as *"szuflady w pionie"* — a
// statement about how the drawer BOX stands IN THE CABINET, which is why a
// drawer side's entry is `'h'`, its 133 mm height. It was never a statement
// about which way the board goes on the board. T40 fed it straight into the cut
// and the sheet obeyed: a 490 × 133 side laid 133 up the page has its figure
// running ACROSS its own 490 mm length — so the long banded edge is banded
// ACROSS the grain, which is the precise thing the owner's own test forbids:
//
//     *"jak będzie się oklejać, to nie chcesz oklejać w poprzek słoja, tylko
//      wzdłuż."*
//
// ─── THE LAW, SAID AS A FACT ABOUT THE LAY ──────────────────────────────────
//
// "Cut STANDING" is not a letter, it is a shape on the sheet: a board STANDS
// when its LONG side runs up the page. Every board in this app is nested with
// the grain running up the drawing, so standing the long side up is the same
// act as running the grain along the length — along the edge that gets banded.
// One sentence, no per-kit exception, and it is observable: after the lay,
// `upMm >= acrossMm`. That is what T41's tests assert, because that is the
// thing, and `CUT_GRAIN_AXIS_BY_PART`'s letters were the field.
//
// The table above is NOT deleted and NOT edited (sanctity). It stays exactly
// what T36 stamped and T40 extended, it is still the roll of roles whose lay is
// the owner's decision rather than the drawing's, and `grainLocked()` still
// reads it. What changed is that the cut asks it WHICH ROLES, not WHICH WAY —
// the way is the shape of the board.

/**
 * The roles the owner has decided are CUT STANDING — the long side up the
 * sheet, the grain along the length, the banded edge banded along the grain.
 *
 * His list of 18.08.2026, verbatim: *"drawer box back BB, drawer box front BF,
 * drawer sides SL and SR, drawer fronts, PLINTH, and the left/right END
 * PANEL."* Seven items, six part names — SL and SR are both `DRAWER-SIDE`.
 *
 * The DRAWER BOTTOM is deliberately NOT here. It is the one board in the box
 * that lies flat — *"dno — słoje w poprzek"* — so it keeps its own stated
 * answer and is laid exactly where it was laid yesterday.
 */
/**
 * ─── TURN 53 (CLAUDE.md F6): …AND THE INFILL JOINS THEM ────────────────────
 *
 * The owner, 27.08.2026: *"infille i plinthy układaj na CNC w pionie ZAWSZE"*
 * — one word about two pieces. The PLINTH has been on this list since T40 and
 * really was nested standing (measured: a 600 × 100 toe kick is laid 100 across
 * × 600 up the page). The INFILL was not on it, so it fell through to the
 * fallback and a long filler came off the saw LYING DOWN, banded across its own
 * grain. That is the half of his sentence that was not already true.
 *
 * It is the SEVENTH role, added in the one place the note two paragraphs down
 * says the seventh goes.
 */
export const CUT_STANDING_PARTS = Object.freeze([
  'DRAWER-SIDE',
  'DRAWER-BOX-FRONT',
  'DRAWER-BOX-BACK',
  'DRAWER-FRONT',
  'PLINTH',
  'END-PANEL',
  'INFILL',
]);

const CUT_STANDING_SET = new Set(CUT_STANDING_PARTS);

/**
 * Is this role cut standing?
 *
 * A function rather than a bare `Set.has` at the call site so the sheet asks a
 * question in the vocabulary of the law, and so the seventh role the owner adds
 * next is added in one place.
 */
export function cutStanding(part) {
  return CUT_STANDING_SET.has(part);
}

/**
 * WHICH OF A PANEL'S OWN TWO DIMENSIONS RAN UP THE SHEET.
 *
 * The single translation between the sheet and the piece, written once here so
 * the cut and the picture cannot each own a copy of it. `upMm` is what the
 * board measured up the page after its turn; the answer is the axis of the
 * panel's own `w × h` record that number belongs to.
 *
 * Matched by SIZE rather than by a flag, for the reason T37 wrote down: size is
 * the fact and a flag is a claim about it. Where neither dimension is nearer —
 * a square panel, or a drawn outline that is neither of the two — the saw's own
 * rule answers, which is the rule this app has fallen back on since turn 8.
 */
export function panelAxisOf(w, h, upMm) {
  const W = Math.abs(Number(w) || 0);
  const H = Math.abs(Number(h) || 0);
  const up = Math.abs(Number(upMm) || 0);
  if (!(W > 0) || !(H > 0)) return H >= W ? 'h' : 'w';
  const dW = Math.abs(W - up);
  const dH = Math.abs(H - up);
  if (dH < dW) return 'h';
  if (dW < dH) return 'w';
  return W >= H ? 'w' : 'h';
}
