// ─── THE WALL DIALOG TAKES FLAT (turn 49, CLAUDE.md F8) ─────────────────────
//
// A slope is stored as its RUN — the length of the fall, measured along the
// wall from the end the ceiling comes down at. That is what the geometry wants
// and it is what `lib/slopeLine.js` and every drawing read; nothing about it
// moves tonight.
//
// It is not what the architect gives. A drawing states the FLAT stretch: how
// far the ceiling stays up, measured from the OPPOSITE corner, and then the
// fall is whatever is left of the wall. Two names for one wall, and a joiner
// with a drawing in his hand should not have to subtract.
//
//     |<─────────── wall width ───────────>|
//     |<──────── flat ────────>|<── run ──>|
//     ┌────────────────────────┐
//     │                        \
//     │  (side: 'R' — the ceiling comes down at the RIGHT end)
//
// So `flat + run = wall width`, always, and the dialog takes either: type one
// and the other follows. This module is that one line of arithmetic, and it is
// HERE rather than in the component for the reason every rule in this house
// lives outside its surface — a node test can ask it, and a `.jsx` cannot be
// imported by one.
//
// ─── AND IT STEPS ASIDE FOR TWO SLOPES (F8, the owner's own ruling) ─────────
//
// *"flat jest ok chyba. poza tym jak beda 2 skosy to wtedy skosy musisz dac a
// nie flat."*
//
// With a slope at BOTH ends of one wall there is no single flat stretch to
// name: the level part is between the two falls, and "flat" would have to mean
// the distance from a corner that is itself sloping. A field that means two
// things is worse than a field that means one, so with two slopes on the wall
// the Flat field is not drawn at all and each slope is entered by its own
// `run` — which is the number that never stopped being unambiguous.
//
// ─── WHAT THIS IS NOT ───────────────────────────────────────────────────────
//
// It is not `ceilingAt`, it is not the cut line, and it is not the engine.
// Nothing here is stored: `flat` is a way of TYPING a run and is derived from
// the wall the moment it is shown. F8 says so in as many words — *"this is the
// DIALOG's arithmetic only"* — and it is why this file imports nothing.

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const round4 = (v) => Math.round(v * 1e4) / 1e4;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * The flat stretch a given run leaves, on a wall of this width.
 *
 * Clamped to the wall at both ends: a run longer than the wall leaves no flat
 * at all (0, not a negative), and a run of nothing leaves the whole wall.
 */
export function flatFromRun(run, wallWidth) {
  const w = Math.max(0, num(wallWidth, 0));
  return round4(clamp(w - Math.max(0, num(run, 0)), 0, w));
}

/** …and the run a given flat leaves. The same line, read the other way. */
export function runFromFlat(flat, wallWidth) {
  const w = Math.max(0, num(wallWidth, 0));
  return round4(clamp(w - Math.max(0, num(flat, 0)), 0, w));
}

/**
 * Is the pair consistent — does it add up to the wall?
 *
 * The dialog can never produce an inconsistent pair (it derives one from the
 * other on every keystroke), which is exactly why this exists: it is what a
 * test asks to prove that, rather than reading the component and hoping.
 */
export function flatRunSum(flat, run) {
  return round4(Math.max(0, num(flat, 0)) + Math.max(0, num(run, 0)));
}

/**
 * Does the Flat field appear at all?
 *
 * One slope: yes — there is one flat stretch and it has one meaning. Two or
 * more on the same wall: no, and each is entered by its own run.
 */
export function flatFieldShown(slopeCount) {
  return Math.max(0, Math.trunc(num(slopeCount, 0))) < 2;
}

/** The one short line the dialog says when the second slope appears. */
export const TWO_SLOPES_NOTE = 'Two slopes on this wall — each is entered by its own run, '
  + 'because there is no single flat stretch left to measure.';
