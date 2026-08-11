// ─── THE BACK HOLDS EVERY PARTITION (turn 23, CLAUDE.md F5 / F6) ────────────
//
// Two laws about the same joint, and they arrived together because they are one
// correction.
//
// ─── F5: THE BORROWED BISCUITS ─────────────────────────────────────────────
//
// Turn 13 gave the vertical partition the owner's butt-joint biscuit set —
// screws and a 70 mm mark on the board it lands on, the mark transferred onto
// its own end. Verified against the LISP before this turn was written: the
// partition panel is
//
//     (defun drawWDR_PARTITION_PANEL (x0 y0 szerW wysW unitNum / midX midY)
//       (drawRect "OUTLINE" …)
//       (drawText "UNIT_NUMBER" … "-PARTITION PANEL"))
//                                       — reference/lisp/KIT_WARDROBE_FULL.lsp L254-257
//
// An outline and a label. No biscuits, no end drilling — and no kit in
// `reference/lisp/` names a `BISCUIT_4MM` layer anywhere at all. The engine had
// applied a law the LISP never gave this part, so the entities go.
//
// ─── F6: WHAT ACTUALLY HOLDS IT ────────────────────────────────────────────
//
// The LISP's own answer, one function further down the same file:
//
//     (defun drawWardrobeDPHolesBACK (x0 y0 szerBACK G dpLeft dpRight dpInset
//                                     dpBottomY dpTopY / leftX rightX)
//       (setq leftX (+ x0 G dpInset (/ G 2.0)))
//       (drawCircle "SCREWS_3MM" leftX (+ y0 dpBottomY 50.0) 1.5)
//       (drawCircle "SCREWS_3MM" leftX (+ y0 dpTopY -50.0) 1.5) …)
//                                       — KIT_WARDROBE_FULL.lsp L389-400
//
// A drawer-panel partition is screwed THROUGH THE BACK, on its own axis, ⌀3 on
// `SCREWS_3MM`, 50 mm off each end. That is the joint, and the interactive
// vertical partition is the same piece doing the same job — so it gets the same
// joint, with the run FILLED IN to the owner's cap, because a 2.4 m divider
// held by two screws is a 2.4 m divider that bows.
//
// ─── THE SPACING, AS ARITHMETIC ────────────────────────────────────────────
//
// Both numbers are `profile.partitionBack`: the 50 is the LISP's, the 400 is
// the owner's. The ends are ALWAYS at 50 and the intermediates are spread
// EVENLY between them — a run of 400s with a short last gap is what marching a
// tape from one end gives you, and it is not what a joiner sets out.
//
//     a 2400 partition ⇒ span 2300 ⇒ ceil(2300/400) = 6 gaps ⇒ 7 at 383.3
//
// Pure functions and pure data. No React, no store, no three.js.

/** The numbers, defensively read, so a partial profile cannot produce NaN. */
function settings(profile) {
  const B = profile?.partitionBack || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    fromEnd: num(B.fromEnd, 50),
    maxPitch: num(B.maxPitch, 400),
    screwDiameter: num(B.screwDiameter, 3),
    layer: B.layer || 'SCREWS_3MM',
  };
}

/**
 * Where the screws go along ONE run of partition, measured from its own bottom.
 *
 * @param {object} args
 *   from     the run's lower end, in the cabinet's own frame (mm)
 *   to       its upper end
 *   profile
 * @returns {number[]} positions in the SAME frame, ascending
 *
 * A run too short for the two end screws to be 50 mm from each end and still be
 * two different holes gets ONE screw, centred: a partition 80 mm tall is a real
 * thing (a partition split by two shelves close together) and it still has to
 * be held. A run with no length at all gets none.
 */
export function partitionBackScrewRun({ from, to, profile }) {
  const s = settings(profile);
  const a = Number(from);
  const b = Number(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
  const length = b - a;
  if (!(length > 0)) return [];

  const first = a + s.fromEnd;
  const last = b - s.fromEnd;
  const span = last - first;
  // Too short to set two out: one screw on the run's own centre. Never two
  // holes closer together than the pattern allows, and never a hole off the
  // end of the board.
  if (span <= 0) return [a + length / 2];

  // The gaps are what the cap is about: how many EQUAL gaps does it take for
  // none of them to exceed the pitch.
  const gaps = Math.max(1, Math.ceil(span / s.maxPitch - 1e-9));
  const pitch = span / gaps;
  const out = [];
  for (let i = 0; i <= gaps; i += 1) out.push(first + pitch * i);
  return out;
}

/**
 * Every screw for one partition, run by run.
 *
 * ─── F6.2: A SPLIT PARTITION DRILLS PER SEGMENT ────────────────────────────
 *
 * Turn 21's F9 law: a crossing FIXED shelf splits one partition into segments,
 * and the engine cuts each as its own VPART panel. Each segment stands between
 * two boards of its own and is screwed on its own — so each is its own
 * 50 … ≤400 run rather than a share of one long one. That falls out of this
 * function taking a LIST of runs and never looking across them.
 *
 * @param {Array<{from:number, to:number, x:number}>} runs
 *   `x` is the partition's own axis — the centre of its thickness, which is
 *   where a screw has to be to enter the middle of its edge.
 * @returns {Array<{x:number, y:number}>}
 */
export function partitionBackScrews(runs, profile) {
  const out = [];
  for (const run of runs || []) {
    for (const y of partitionBackScrewRun({ from: run.from, to: run.to, profile })) {
      out.push({ x: run.x, y });
    }
  }
  return out;
}

/** The layer and the diameter, for the drill rows and for the tests. */
export function partitionBackSpec(profile) {
  const s = settings(profile);
  return { layer: s.layer, diameter: s.screwDiameter };
}
