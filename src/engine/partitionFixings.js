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

// ─── THE DIVIDER'S FOOT (turn 30, CLAUDE.md F4) ─────────────────────────────
//
// The owner, of the joint where a divider meets the boards above and below it:
// "chyba kiedyś było ale się zagineło." He is right on both halves of that
// sentence, and this is the audit.
//
// ─── WHAT WAS THERE, AND WHY IT WENT ────────────────────────────────────────
//
// Turn 13 gave the vertical partition the owner's BUTT-JOINT BISCUIT SET on the
// TOP and the BOTTOM — four ⌀3 screws and two 70 mm marks on each board, and
// the marks transferred onto the partition's own end. `fixtures/golden-
// partition-biscuits.json` records every one of them.
//
// Turn 23 took the lot away, and the reason it gave was true as far as it went:
// `drawWDR_PARTITION_PANEL` (KIT_WARDROBE_FULL.lsp L254-257) draws an OUTLINE
// and a LABEL and nothing else, and no kit in `reference/lisp/` names a
// `BISCUIT_4MM` layer anywhere at all. So the biscuits stay gone. They were an
// invention, and the subtraction was right.
//
// ─── BUT IT READ THE WRONG PART ─────────────────────────────────────────────
//
// `drawWDR_PARTITION_PANEL` is the HORIZONTAL partition — the fixed shelf over
// the drawer stack. The VERTICAL divider in that kit is the DRAWER PANEL, and
// the LISP most certainly does drill it into the board it stands on:
//
//     (defun drawWardrobeDPHolesBOTTOM (x0 y0 szerBOT dpLeft dpRight
//                                       dpInsetCenter dpScrewDepth drawerPanelD /)
//       (if dpLeft
//         (progn
//           (drawCircle "SCREWS_3MM" (+ x0 dpScrewDepth)          (+ y0 dpInsetCenter) 1.5)
//           (drawCircle "SCREWS_3MM" (+ x0 drawerPanelD -50.0)    (+ y0 dpInsetCenter) 1.5)))
//       (if dpRight
//         (progn
//           (drawCircle "SCREWS_3MM" (+ x0 dpScrewDepth)          (- (+ y0 szerBOT) dpInsetCenter) 1.5)
//           (drawCircle "SCREWS_3MM" (+ x0 drawerPanelD -50.0)    (- (+ y0 szerBOT) dpInsetCenter) 1.5))))
//                                   — reference/lisp/KIT_WARDROBE_FULL.lsp L377-385
//                                     called at L934, on the BOTTOM panel
//
// TWO ⌀3 screws per divider, up through the bottom board into the divider's own
// bottom edge, on the divider's centre line across the width. Turn 23 restored
// `drawWardrobeDPHolesBACK` and `…BUL`/`…BUR` and left this one out — so the
// engine drilled a divider's back and its sides and never its foot. That is
// the thing that got lost, and this is it back.
//
// ─── THE TWO NUMBERS ARE THE LISP'S OWN, INCLUDING THE ODD ONE ─────────────
//
//   `dpScrewDepth`        99, and the LISP's own comment says "from front
//                         edge" — the same 99 `wardrobe.drawerPanel.screwDepth`
//                         already carries for the SIDE holes. One number.
//   `drawerPanelD − 50`   the second hole. Read literally it is the divider's
//                         own DEPTH less 50, measured from the same front edge
//                         — which on the 578 mm wardrobe puts it 460 from the
//                         front and therefore 100 mm short of the divider's
//                         back end, not 50. That is very likely a frame slip in
//                         the original, and it is REPRODUCED RATHER THAN
//                         REINTERPRETED: rule 1 says `computeCabinet()` cuts
//                         what the AutoLISP cuts, and a number somebody here
//                         "corrected" overnight is a miscut in the owner's
//                         workshop. BLOCKERS carries the question.
//
// ─── AND THE TOP TAKES NOTHING, WHICH IS ALSO THE LISP ─────────────────────
//
// There is no `drawWardrobeDPHolesTOP` — in that kit the divider runs from the
// bottom board to the horizontal partition above the drawers and never reaches
// the top, so the LISP was never asked the question. No kit in `reference/lisp/`
// drills a TOP panel for a vertical member. So nothing is emitted there and the
// gap is NAMED rather than filled: an invented hole is a miscut in somebody's
// workshop, and a full-height divider's head fixing is a question for the owner.
//
// Pure functions and pure data. No React, no store, no three.js.

/** The numbers, defensively read, so a partial profile cannot produce NaN. */
function footSettings(profile) {
  const F = profile?.partitionFoot || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    fromFrontEdge: num(F.fromFrontEdge, 99),
    fromFarEnd: num(F.fromFarEnd, 50),
    screwDiameter: num(F.screwDiameter, 3),
    layer: F.layer || 'SCREWS_3MM',
  };
}

/**
 * The two screws that hold ONE divider's foot, in the BOTTOM board's own frame.
 *
 * `engine/joinery.js` is the authority on that frame and it is not the LISP's:
 * a TOP or BOTTOM is drawn rotated with its CNC **x running from the BACK**
 * along the depth and its y across the internal width. The LISP's two numbers
 * are stated FROM THE FRONT (its own comment says so), so they are converted
 * here — once, in the one place that knows both — rather than in the caller.
 *
 * A hole that would fall outside the divider's own footprint is DROPPED. A
 * shallow divider is a real case (a partition set back from the face is
 * shallower than the board it stands on), and a screw driven where there is no
 * edge to bite is a hole in a finished bottom.
 *
 * @param {object} args
 *   divider  { x, w, z, d } in cabinet mm — the divider's own box
 *   bottom   { x, z, d } in cabinet mm — the board it stands on
 *   profile
 * @returns {Array<{x:number, y:number}>} in the BOTTOM's own CNC frame
 */
export function partitionFootScrews({ divider, bottom, profile }) {
  const s = footSettings(profile);
  const d = Number(divider?.d);
  const bd = Number(bottom?.d);
  if (!(d > 0) || !(bd > 0)) return [];
  // The board's front edge, in cabinet z. Everything below is a distance back
  // from it, which is the frame both LISP numbers are stated in.
  const frontZ = Number(bottom.z) + bd;
  // The divider's own footprint, as distances back from that same edge.
  const nearest = frontZ - (Number(divider.z) + d);
  const farthest = frontZ - Number(divider.z);
  const centre = Number(divider.x) + Number(divider.w) / 2 - Number(bottom.x);
  const out = [];
  for (const fromFront of [s.fromFrontEdge, d - s.fromFarEnd]) {
    if (!(fromFront >= nearest - 1e-9 && fromFront <= farthest + 1e-9)) continue;
    // …and into the BOTTOM's own frame, whose x runs from the BACK.
    out.push({ x: bd - fromFront, y: centre });
  }
  return out;
}

/** The layer and the diameter, for the drill rows and for the tests. */
export function partitionFootSpec(profile) {
  const s = footSettings(profile);
  return { layer: s.layer, diameter: s.screwDiameter };
}
