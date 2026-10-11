;;;========================================
;;; KIT_CORNER_L_DRAWERS.lsp
;;; The L corner with DRAWERS: Blum SPACE CORNER, the FIXED corner front
;;; Command: CORNER_L_DRAWERS
;;; Turn 78 (CLAUDE.md PART A, F7) - LISP FIRST
;;; Derived from: KIT_CORNER_L.lsp (the carcass) + KIT_BUDR_FULL.lsp (the box)
;;; Requires: SKYLON_COMMON.lsp, KIT_CORNER_L.lsp, KIT_BUDR_FULL.lsp loaded
;;;           first (auto-loaded below). Nothing of theirs is copied: every
;;;           board of the carcass and of the box is drawn by CALLING them.
;;;========================================
;;;
;;; THE OWNER'S LAW, 11.10.2026 (the eye-test of T75 to T77, point by point):
;;;
;;;   "szuflady w narozniku L shape"
;;;
;;; ...on the L carcass of KIT_CORNER_L (the owner, 23.09.2026: "one L-shaped
;;; board cut on the CNC, flat-face door overlap, no 45 degree cuts"), and under
;;; T78's own law for everything bought:
;;;
;;;   A BOUGHT MECHANISM IS A LINE AND A BODY, NEVER A HOLE, until its
;;;   manufacturer's drilling is in reference/hardware/ with a page number.
;;;
;;; THE DATA SOURCE for the kit is reference/hardware/blum-space-corner.json
;;; (T78 F7, read 11.10.2026 from search snippets of the Blum catalogue
;;; 2024/2025, https://publications.blum.com/2024/catalogue/en/, Box systems
;;; from p. 194; no page could be opened from the container, so EVERY number in
;;; that file is `owner to confirm`, and so is every number taken from it here).
;;; Its `engineNotes`, which decide what this file draws:
;;;
;;;   frontDecision   Blum sells two generations. The FIXED corner front (wooden
;;;                   drawers on MOVENTO or TANDEM with the T51.7601 locking
;;;                   devices, or TANDEMBOX with the ZSF sets: "two corner rear
;;;                   fixing brackets, two corner front pieces") carries ONE
;;;                   rigid L-shaped front per row. SPACE CORNER with
;;;                   SYNCROMOTION (TANDEMBOX antaro, the Z33 sets) hinges two
;;;                   standard fronts that swing inward. CLAUDE.md T78 F7 asks
;;;                   for ONE L-shaped front per row: THIS FILE DRAWS THE FIXED
;;;                   GENERATION. The owner decides; the other is in the JSON.
;;;   runnersPerArm   Blum's fixed-front wooden drawer runs ONE drawer on one
;;;                   pair of 769 runners set diagonally. "TWO boxes (one per
;;;                   arm) on the existing drawer machinery" is the ENGINE'S
;;;                   construction (CLAUDE.md F7) and has no Blum source; the
;;;                   runner ladder per arm depth stays the engine's own. This
;;;                   file draws the engine's construction and names the point
;;;                   (section 6).
;;;   widthLaw        cabinet width 900 to 1200 is Blum's RECOMMENDATION, not a
;;;                   limit: nothing is refused on it, it is proposed in words.
;;;   notRead         the 2024/2025 SPACE CORNER application page itself, Blum's
;;;                   sample drawer and cabinet plans, the EU MOVENTO article for
;;;                   SPACE CORNER, any LEGRABOX pairing (none found: CLAUDE.md
;;;                   says "MOVENTO/LEGRABOX"; MOVENTO is Blum's own sheet,
;;;                   LEGRABOX is null in the JSON).
;;;
;;; This is a NEW FILE. It touches no other kit. drawCL_PLAN, drawCL_LBOARD_ROT90,
;;; drawCL_BACKB, CL:lTop, CL:lTopJoints, CL:innerRelief, CL:cutterRadius,
;;; CL:validP, CL:p are KIT_CORNER_L's; drawDRAWER_SIDE, drawDRAWER_BOX_FRONT,
;;; drawDRAWER_BOTTOM, createDrawerCNCLayers are KIT_BUDR_FULL's; drawBUL,
;;; drawBUR, drawBACK, drawRect, drawLine, drawText, drawTextL, drawTextLC,
;;; createViewLayers, createCNCLayers, createDrawerLayers are COMMON's. All
;;; CALLED, never copied.
;;;
;;;========================================
;;; 1. THE FRAME (KIT_CORNER_L's, section 1, restated)
;;;========================================
;;;
;;;   ORIGIN   the ROOM CORNER, floor level under the carcass.
;;;   x        along WALL A (the unit's own wall), away from the corner.
;;;   y        along WALL B (the adjacent wall), OUT from wall A into the room.
;;;   z        up.
;;;
;;;   arm A    x d..W, y 0..d     its front is the line y = d, facing +y
;;;   arm B    x 0..d, y d..D     its front is the line x = d, facing +x
;;;   the bite x > d, y > d       its corner (d, d) is the INNER CORNER
;;;
;;; This is the LEFT HAND (the engine's `cornerL.side = 'left'`): the engine's
;;; box frame reads box.x = x, box.z = y, box.y = z. The RIGHT HAND is this
;;; drawing mirrored in x (box.x = W - x), as KIT_CORNER_L's boards are.
;;;
;;;========================================
;;; 2. THE INPUTS
;;;========================================
;;;
;;;   W, D, d, H, G   KIT_CORNER_L's own (outer width along wall A, outer width
;;;                   along wall B, the ARM DEPTH, the carcass height, the board).
;;;   frontT          front thickness, profile front.thickness (18). Every front
;;;                   board of this file is frontT thick and nothing else
;;;                   (T78 F3: "an L door is front_t thick everywhere").
;;;   gap             profile doors.gap (3): the front's standard clearance,
;;;                   gap/2 a side, and the stand-off of a front's back from
;;;                   the carcass front (KIT_BUDR_FULL's top view puts the door
;;;                   at y0 - doorGap - gruboscDrzwi and the box's front face at
;;;                   y0 - doorGap: both stand `gap` proud of the carcass).
;;;   n               the number of drawer ROWS, 2 to 4. ONE row is refused in
;;;                   words: a SPACE CORNER is a STACK (Blum: "one set required
;;;                   per drawer", the stack is the application). More than four
;;;                   is refused the same way: no variant of profile
;;;                   baseDrawerUnit splits a height five ways (x1 is disabled,
;;;                   x2 / x3 / x4 exist). profile corner.spaceCorner.rowsMin 2,
;;;                   rowsMax 4.
;;;
;;; An L needs both arms past the corner square (CL:validP), each arm needs a
;;; box of a width the kit can carry (section 7), and the arm depth needs the
;;; shortest runner of the ladder (section 4). Room refuses first.
;;;
;;;========================================
;;; 3. THE ROWS: KIT_BUDR_FULL's SPLIT ON THE L's HEIGHT
;;;========================================
;;;
;;; The row heights are the drawer unit's own, computed on H EXACTLY as
;;; KIT_BUDR_FULL computes them (engine/cabinet.js budrFrontHeights):
;;;
;;;   available = H - n x gap          (KIT_BUDR: dostepneH = wysSzafki - 9
;;;                                     for its three fronts: two gaps between
;;;                                     the fronts and one at the top)
;;;   h_i       = round(available x r_i / sum r)      round = fix(x + 0.5)
;;;
;;; with the RATIO of the variant (profile baseDrawerUnit.variants):
;;;
;;;   n 2   x2   1 : 1          exact   (the last front takes the rounding drift)
;;;   n 3   x3   4 : 3 : 2      NOT exact (KIT_BUDR's own 4:3:2, frozen as cut)
;;;   n 4   x4   1 : 1 : 1 : 1  exact
;;;
;;; Row 1 is the BOTTOM row (KIT_BUDR's drawer 1: its front screw sits G higher,
;;; its runner row G higher, because the bottom board is under it). Row i's
;;; front stands from z_i = sum(h_1..h_i-1) + (i - 1) x gap to z_i + h_i; the
;;; last gap is at the top, under the worktop.
;;;
;;; THE SHORTEST FRONT is KIT_BUDR's clamp, 38 (runnerScrewFromBase 28 +
;;; clearanceBelowRunner 10): a front shorter than that has its bottom edge
;;; inside the runner it hangs on. At every default of this kit the rows are
;;; far above it; the command checks it and says so if not.
;;;
;;;========================================
;;; 4. THE BOXES: ONE PER ROW PER ARM, KIT_BUDR_FULL's BOX
;;;========================================
;;;
;;; Each arm is a VIRTUAL drawer unit (engine/cabinet.js: "one virtual parent
;;; cabinet per arm", the drawer unit of the split, BUDR2 / BUDR / BUDR4):
;;;
;;;   arm A   width span_A = W - d, depth d     its box runs along y (depth)
;;;   arm B   width span_B = D - d, depth d     its box runs along x (depth)
;;;
;;; and KIT_BUDR_FULL's box section gives, per row i and per arm, FIVE boards:
;;;
;;;   D{i}{arm}-SL, -SR   sides      boxDl x sideH        sideH = round(0.7 h_i)
;;;   D{i}{arm}-BF, -BB   front/back boxFrontLen x boxFrontH
;;;                                  boxFrontLen = span - 4G - 10
;;;                                  boxFrontH   = sideH - 15 - G - 1
;;;   D{i}{arm}-DNO       bottom     (boxFrontLen + 13) x boxDl
;;;
;;; and the box stands G + 5 in from each end of the span (KIT_BUDR: szufX =
;;; x0 + G + 5; box width = span - 2G - 10), its front face `gap` proud of the
;;; carcass front (szufY = y0 - doorGap), running back boxDl from there.
;;;
;;; THE BOX DEPTH is the MOVENTO ladder rung for the arm depth, KIT_BUDR's own
;;; snap written as the engine writes it (engine/runners.js runnerAskFor,
;;; ladderRungFor): usable = d - G - 20 (depthAllowance), the nominal is the
;;; box + 10 (hardware.runner.movento.nominalOverBoxMm, the owner 16.08.2026:
;;; "powinien byc skrzynka +10 mm"), the ladder is the profile's
;;; nominalLadder 250 .. 700 every 50 (the owner: "od 250", "dopisujemy do
;;; 700"), and the box is the LARGEST rung - 10 that fits the usable depth.
;;; KIT_BUDR's own chain 390 / 440 / 490 / 540 / 590 / 640 / 690 is this
;;; ladder's 400 .. 700 less 10; at d 558 both answer 490. Under 240 usable
;;; (the 250 rung) there is no runner: refused in words.
;;;
;;; RUNNERS: ONE MOVENTO PAIR PER BOX at the rung's nominal length (two pairs a
;;; row). The runner rows on the carcass side (SIDE-A for arm A, SIDE-B for
;;; arm B) are KIT_BUDR's: 38 above each row's front bottom, + G for row 1
;;; (runnerY1 = 38 + G, runnerY2 = h1 + 3 + 38, ...), drawn by COMMON's
;;; drawBUL / drawBUR with the runnerYList, and NO hinge plate rows: a drawer
;;; L has no doors. Blum's own corner runner is the US 769.6860S (27 inch, 686
;;; derived; JSON variants.movento_wooden_drawer.runner), its EU article null;
;;; the SPACE CORNER drawer Blum names is "NL 650 mm" (2022 de/548). The house
;;; ladder snaps per arm depth instead, and the engine's BOM prints the rung.
;;;
;;; NAMED FOR THE OWNER: the box's INNER runner (the side toward the corner
;;; square) has no carcass board to screw to: the L has SIDE-A at x = W and
;;; SIDE-B at y = D and nothing at the inner corner. Blum "recommends the
;;; construction of a cabinet within a cabinet for SPACE CORNER" (JSON
;;; cabinet.construction) and sells the rear fixing bracket for it. This file
;;; draws no bearer board: the inner runner's bearer is the kit's (section 7)
;;; or a board the owner names, and until he does the engine states the runner
;;; and drills nothing for it on the inner side (a line and a body).
;;;
;;;========================================
;;; 5. THE L FRONT: TWO BOARDS A ROW, ONE FRONT
;;;========================================
;;;
;;; Per row ONE L front of TWO boards of the front material, both frontT thick,
;;; both h_i tall, joined at the inner corner and moving as one:
;;;
;;;   FRONT A   along wall A, in the plane of arm A's front:
;;;             x from d + gap  to  W - gap/2        length W - d - 1.5 gap
;;;             body y from d + gap to d + gap + frontT   (its face at
;;;             y = d + gap + frontT; stand-off `gap`, section 2)
;;;   FRONT B   along wall B, in the plane of arm B's front:
;;;             y from d + gap + frontT  to  D - gap/2   length D - d - frontT - 1.5 gap
;;;             body x from d + gap to d + gap + frontT   (its face at
;;;             x = d + gap + frontT)
;;;
;;; THE TRIMS, against a standard front (gap/2 inside each carcass end):
;;;
;;;   A loses gap/2 MORE at its inner end: its end face at x = d + gap is FLUSH
;;;     with B's back face (x = d + gap). Its outer end is standard (gap/2 off
;;;     SIDE-A's outer face).
;;;   B loses gap/2 + frontT at its inner end: it STARTS at A's face
;;;     (y = d + gap + frontT). Its outer end is standard.
;;;
;;; THE JOINT (CL:frontJoint): `butt`. B's inner END FACE is glued and screwed
;;; to A's FACE over the strip x in [d + gap, d + gap + frontT], frontT wide,
;;; h_i tall. The two boards move together, so the OVERLAP LAW of KIT_CORNER_L's
;;; door B (CORNER_OVERLAP = front_t + clearance.corner, "door B opens first")
;;; is RETIRED for a drawer row: there is no clearance between the two boards
;;; and no order of opening. A MITRE (both inner ends cut 45, meeting on the
;;; diagonal) is the owner's alternative, ONE WORD in CL:frontJoint; Blum
;;; prints no mitre for the fixed front (JSON fronts.shape.meetingEdgeMitre
;;; null, a forum anecdote only), so `butt` is this file's default.
;;;
;;; THE FRONT FIXING is KIT_BUDR's own (drawDRAWER_FRONT): two 3 mm holes per
;;; board on FRONT_HINGES_3MM, each 50 inside its box side's inner face (which
;;; is KIT_BUDR's 50 + 2G + 3.5 from a standard front's end), at 96.5 from the
;;; front's bottom edge, + G on row 1 (frontScrewFromBottom). On the board's
;;; inner end the hole is measured from the BOX, not from the trimmed end, so
;;; it stays 50 inside the box side exactly as KIT_BUDR's does. These holes are
;;; the box machinery's, not the kit's: the kit drills nothing (section 7).
;;;
;;;========================================
;;; 6. THE MOTION (a comment: nothing to draw but the arrow)
;;;========================================
;;;
;;; THE WHOLE ROW travels together: two boxes and the two front boards, out of
;;; the inner corner along the 45 DEGREE DIAGONAL of the bite,
;;;
;;;   left hand    direction (+1, +1) / sqrt 2 in the plan   (x along wall A,
;;;                                                           y along wall B)
;;;   right hand   direction (-1, +1) / sqrt 2
;;;
;;; by the box's NOMINAL LENGTH (the runner's rung, boxDl + 10: a full
;;; extension, "Full extensions use every inch", blum.com). The engine carries
;;; it on every part of the row (`meta.slide`, `meta.travel_mm`, read by
;;; 3d/UnitView.jsx MovingPanel and engine/drawerMotion.js). The plan below
;;; draws the arrow from the inner corner, DOOR_SWING layer, nothing more.
;;;
;;; NAMED FOR THE OWNER (section 4 again, from the other end): a MOVENTO pair
;;; screwed to SIDE-A runs along y and cannot carry its box along the diagonal;
;;; Blum's fixed-front drawer is ONE drawer on ONE pair set on the diagonal
;;; (JSON engineNotes.runnersPerArm). The engine animates the row along the
;;; diagonal as this section says and states two pairs per row as section 4
;;; says; which construction the workshop builds (two boxes on two straight
;;; pairs, or one diagonal drawer on one pair in a cabinet within a cabinet)
;;; is the owner's call, named in the PR. Nothing here is invented past that.
;;;
;;;========================================
;;; 7. THE SPACE CORNER KIT: A LINE AND A BODY, ZERO HOLES
;;;========================================
;;;
;;; The bought part at the inner corner that the two boxes and the two front
;;; boards meet on: for the fixed generation the pair of T51.7601 locking
;;; devices (right and left, "one right and one left are required per drawer",
;;; "for use with MOVENTO runners only", catalogue en/412 lists T51.7601 among
;;; MOVENTO's parts) or the corner front pieces and corner rear fixing brackets
;;; of a ZSF set (JSON cornerElement.what).
;;;
;;;   BOM      ONE LINE PER ROW: "Blum SPACE CORNER kit" (profile
;;;            corner.spaceCorner.label), readiness `bought`.
;;;   BODY     a PLACEHOLDER: a square block at the inner corner, right behind
;;;            the two fronts' meeting point, inside the carcass, on the row's
;;;            bottom plane, the row's box side height tall. Its footprint is
;;;            profile corner.spaceCorner.bracketMm (60, T78 proposed, the
;;;            engine's own); the only corner dimension Blum prints is 75 (the
;;;            depth rule "NL + 75" and the back-piece cut "interior width minus
;;;            75 x 0.707", both SYNCROMOTION sheets; JSON bodyPlaceholder 75,
;;;            derived). Owner to confirm either. HARDWARE_BODY layer, plan and
;;;            elevation only: it is NOT a CNC part.
;;;   HOLES    NONE. No drilling pattern of the locking device, the front piece
;;;            or the bracket was read (JSON cornerElement.holes,
;;;            cornerElement.envelopeMm null). The day the owner drops the
;;;            pattern into blum-space-corner.json with its page, the holes get
;;;            a section of their own; not before.
;;;
;;; TWO NUMBERS OF THE KIT THIS FILE SAYS IN WORDS, NEVER REFUSES ON:
;;;   minBoxInside 170   the locking device's minimum inside drawer width (JSON
;;;                      lockingDevice.minInsideDrawerWidthMm, the US sheet);
;;;                      an arm whose box inside width (boxFrontLen) is under it
;;;                      is WARNED, owner to confirm.
;;;   width 900..1200    Blum's recommended cabinet width per arm (JSON
;;;                      cabinet.recommendedWidthMm); outside it the command
;;;                      PROPOSES, in words (CLAUDE.md: proposal, never a block).
;;;
;;;========================================
;;; 8. WHAT IS NOT IN THIS FILE
;;;========================================
;;;
;;; THE CARCASS is KIT_CORNER_L's, board for board and hole for hole: BACK-A,
;;; BACK-B, TOP-L, BOTTOM-L (turned 90, T78 F4) are drawn here by CALLING its
;;; functions so the kit is whole on one sheet; SIDE-A and SIDE-B are KIT_BUD's
;;; BUL / BUR with KIT_BUDR's runner rows and NO hinge rows, the ONE change the
;;; drawers make to the carcass. No shelves: the drawers fill the L.
;;; THE PLINTH, THE WORKTOP (the L slab, T78 F2), THE MASK: the run's auto-parts.
;;; THE CAROUSEL (F9), THE BI-FOLD DOOR (F8, KIT_CORNER_L_BIFOLD.lsp): other
;;; files. A drawer L has no doors and no carousel.
;;; THE LEGS: KIT_CORNER_L's six, drawn by its drawCL_PLAN.
;;;
;;;========================================
;;; 9. THE NUMBERS  (the assertion; computed, then written down)
;;;========================================
;;;
;;; BASE DEFAULTS: W 900, D 900, d 558, H 770, G 18, frontT 18, gap 3, n 3.
;;;
;;; ROWS (4:3:2, not exact): available 761; h 338 / 254 / 169 (sum 761)
;;;   front bottoms z        0 / 341 / 598        (top of row 3 at 767, gap 3)
;;;   runner rows (side)     56 / 379 / 636       (38 + G, 341 + 38, 598 + 38)
;;;   box side heights       237 / 178 / 118      (round 0.7 h)
;;;   box front/back heights 203 / 144 / 84       (sideH - 15 - 18 - 1)
;;;
;;; BOXES, both arms (span 342, usable depth 520 -> box 490, runner NL 500):
;;;   box width 296 (342 - 36 - 10), box front/back length 260 (342 - 72 - 10),
;;;   bottom 273 x 490, sides 490 x sideH
;;;   arm A box in plan   x 581..877, y 71..561   (front face at y = d + gap)
;;;   arm B box in plan   x 71..561,  y 581..877
;;;
;;; FRONTS (per row, h_i tall, 18 thick):
;;;   FRONT A   x 561..898.5, length 337.5, body y 561..579
;;;   FRONT B   y 579..898.5, length 319.5, body x 561..579
;;;   joint     butt: B's end face on A's face over x 561..579
;;;   fixing    A: holes at room x 649 and 809 (board X 88 and 248)
;;;             B: holes at room y 649 and 809 (board X 70 and 230)
;;;             Y 114.5 on row 1 (96.5 + G), 96.5 on rows 2 and 3
;;;
;;; MOTION   (+1, +1)/sqrt 2, travel 500 (the rung)
;;; KIT      3 bodies, 60 x 60 in plan at x 501..561, y 501..561, each on its
;;;          row's bottom plane, sideH tall; 3 BOM lines; 0 holes
;;;
;;; CENSUS (n 3): boards 36 = 3 x (2 fronts + 2 x 5 box boards), + 6 carcass
;;;   runner pairs 6 = 3 x 2, kits 3 = 3 x 1
;;;   holes of the kit 0; KIT_BUDR's own: 2 per front board (12), 2 per box
;;;   front (12), 4 per bottom (24), the runner rows on SIDE-A and SIDE-B
;;;
;;; n 2 (1:1 exact): available 764, h 382 / 382; bottoms 0 / 385; sideH 267 /
;;;   267; boards 24, pairs 4, kits 2.
;;; n 4 (1:1:1:1 exact): available 758, 758 / 4 = 189.5 rounds to 190 four
;;;   times = 760, drift -2 on the LAST row: h 190 / 190 / 190 / 188 (see
;;;   CLD:rowHeights: the last row takes the drift, as the engine's does).
;;;   boards 48, pairs 8, kits 4.
;;; WALL (W 600, D 600, d 400, H 720, n 2): spans 200, box width 154, box
;;;   front/back 118 (UNDER the kit's 170: warned in words), usable 362 ->
;;;   box 340, NL 350.
;;; WARDROBE (W 1000, D 1000, d 568, H 2150, n 4): spans 432, box width 386,
;;;   box front/back 350, usable 530 -> box 490, NL 500; h 535 / 535 / 535 /
;;;   533 (2150 - 12 = 2138; 534.5 rounds to 535 x 4 = 2140, drift -2).
;;;
;;;========================================

;;; Auto-load what this file CALLS
(if (null drawRect) (load "SKYLON_COMMON"))
(if (null CL:lOutline) (load "KIT_CORNER_L"))
(if (null drawDRAWER_SIDE) (load "KIT_BUDR_FULL"))

;;;========================================
;;; A. THE PROFILE NUMBERS THIS FILE READS
;;;========================================
;;;
;;; Keyed by their PATH in src/engine/profile.js, so a test can hold the two to
;;; each other by name. Every number here is already the profile's; this file
;;; adds none. The two numbers of the KIT (section 7) are keyed by their path
;;; in reference/hardware/blum-space-corner.json and are `owner to confirm`.

(defun CLD:profile ( / )
  '(("baseDrawerUnit.gap" . 3.0)
    ("baseDrawerUnit.sideRatio" . 0.7)
    ("baseDrawerUnit.boxWidthClearance" . 10.0)
    ("baseDrawerUnit.boxFrontBoards" . 4.0)
    ("baseDrawerUnit.boxFrontClearance" . 10.0)
    ("baseDrawerUnit.boxFrontHeightDeduction" . 15.0)
    ("baseDrawerUnit.boxFrontHeightExtra" . 1.0)
    ("baseDrawerUnit.bottomOversize" . 13.0)
    ("baseDrawerUnit.depthAllowance" . 20.0)
    ("baseDrawerUnit.firstRowFromBottom" . 38.0)
    ("baseDrawerUnit.runnerScrewFromBase" . 28.0)
    ("baseDrawerUnit.clearanceBelowRunner" . 10.0)
    ("baseDrawerUnit.boxScrewFromEdge" . 50.0)
    ("baseDrawerUnit.frontScrewFromBottom" . 96.5)
    ("baseDrawerUnit.frontScrewDiameter" . 3.0)
    ("doors.gap" . 3.0)
    ("front.thickness" . 18.0)
    ("hardware.runner.movento.nominalOverBoxMm" . 10.0)
    ("corner.spaceCorner.rowsMin" . 2.0)
    ("corner.spaceCorner.rowsMax" . 4.0)
    ("corner.spaceCorner.bracketMm" . 60.0)))

(defun CLD:p (key / hit)
  (setq hit (assoc key (CLD:profile)))
  (if hit
    (cdr hit)
    (progn (princ (strcat "\nKIT_CORNER_L_DRAWERS: no profile number " key)) 0.0)))

;;; The owner's runner ladder, profile hardware.runner.movento.nominalLadder
;;; ("od 250", "dopisujemy do 700"). Nominal lengths, ascending.
(defun CLD:ladder ( / )
  '(250.0 300.0 350.0 400.0 450.0 500.0 550.0 600.0 650.0 700.0))

;;; THE KIT's numbers, reference/hardware/blum-space-corner.json, owner to confirm.
(defun CLD:kit ( / )
  '(("variants.movento_wooden_drawer.lockingDevice.minInsideDrawerWidthMm" . 170.0)
    ("cabinet.recommendedWidthMm.min" . 900.0)
    ("cabinet.recommendedWidthMm.max" . 1200.0)
    ("bodyPlaceholder.footprintMm.x" . 75.0)
    ("cabinet.depth.drawerNominalLengthMm" . 650.0)))

(defun CLD:k (key / hit)
  (setq hit (assoc key (CLD:kit)))
  (if hit (cdr hit) 0.0))

;;; THE JOINT of a row's two front boards (section 5). One word, the owner's.
;;;   "butt"    B's inner end face on A's face (this file's default)
;;;   "mitre"   both inner ends cut 45, meeting on the diagonal (the alternative)
(setq CL:frontJoint "butt")

;;; The kit's label (profile corner.spaceCorner.label) and its article words.
(setq CLD:kitLabel "Blum SPACE CORNER kit")
(setq CLD:kitArticles "T51.7601 R + L (MOVENTO, wooden drawer) / ZSF set (TANDEMBOX)")

;;;========================================
;;; B. THE SET-OUT RULES (KIT_BUDR's, stated for the L)
;;;========================================

;;; KIT_BUDR's rounding: fix(x + 0.5).
(defun CLD:round (x / )
  (fix (+ x 0.5)))

(defun CLD:sum (lst / s)
  (setq s 0.0)
  (foreach v lst (setq s (+ s v)))
  s)

;;; The variant's ratio for n rows (profile baseDrawerUnit.variants). nil
;;; outside 2..4: no variant splits a height that way (x1 is disabled).
(defun CLD:ratio (n / )
  (cond
    ((= n 2) '(1.0 1.0))
    ((= n 3) '(4.0 3.0 2.0))
    ((= n 4) '(1.0 1.0 1.0 1.0))
    (T nil)))

;;; Does the last front take the rounding drift? x2 and x4 yes, x3 NO (frozen).
(defun CLD:exactP (n / )
  (or (= n 2) (= n 4)))

;;; Is the row count the kit's? profile corner.spaceCorner.rowsMin / rowsMax.
(defun CLD:rowsValidP (n / )
  (and (>= n (fix (CLD:p "corner.spaceCorner.rowsMin")))
       (<= n (fix (CLD:p "corner.spaceCorner.rowsMax")))))

;;; The row heights, bottom row first: engine/cabinet.js budrFrontHeights.
(defun CLD:rowHeights (H n / gap ratio total avail out drift)
  (setq gap   (CLD:p "baseDrawerUnit.gap")
        ratio (CLD:ratio n)
        total (CLD:sum ratio)
        avail (- H (* n gap))
        out   (mapcar '(lambda (r) (float (CLD:round (/ (* avail r) total)))) ratio))
  (if (CLD:exactP n)
    (progn
      (setq drift (- avail (CLD:sum out)))
      (if (/= drift 0.0)
        (setq out (append (reverse (cdr (reverse out)))
                          (list (+ (last out) drift)))))))
  out)

;;; Each row's front bottom, z from the carcass bottom: 0, h1 + gap, ...
(defun CLD:rowBottoms (hs / gap z out h)
  (setq gap (CLD:p "baseDrawerUnit.gap") z 0.0 out '())
  (foreach h hs
    (setq out (cons z out))
    (setq z (+ z h gap)))
  (reverse out))

;;; The runner rows on the carcass side (drawBUL / drawBUR frame, from the
;;; side's bottom): 38 above each front bottom, + G on row 1 (KIT_BUDR).
(defun CLD:runnerRows (bottoms G / fr out i z)
  (setq fr (CLD:p "baseDrawerUnit.firstRowFromBottom") out '() i 0)
  (foreach z bottoms
    (setq out (cons (+ z fr (if (= i 0) G 0.0)) out))
    (setq i (1+ i)))
  (reverse out))

;;; KIT_BUDR's shortest front: 28 + 10 (the owner's clamp, turn 17).
(defun CLD:minFrontH ( / )
  (+ (CLD:p "baseDrawerUnit.runnerScrewFromBase")
     (CLD:p "baseDrawerUnit.clearanceBelowRunner")))

;;; The usable depth of an arm for a box: d - G - 20 (KIT_BUDR's maxDl).
(defun CLD:usableDepth (armD G / )
  (- armD G (CLD:p "baseDrawerUnit.depthAllowance")))

;;; THE BOX DEPTH: the largest (rung - 10) not over the usable depth
;;; (engine/runners.js runnerAskFor + ladderRungFor, read backwards). nil when
;;; even the 250 rung does not fit.
(defun CLD:boxDepth (armD G / maxDl over best rung)
  (setq maxDl (CLD:usableDepth armD G)
        over  (CLD:p "hardware.runner.movento.nominalOverBoxMm")
        best  nil)
  (foreach rung (CLD:ladder)
    (if (<= (- rung over) maxDl) (setq best (- rung over))))
  best)

;;; The runner's nominal length for a box: box + 10 (the owner's "+10").
(defun CLD:runnerNL (boxDl / )
  (+ boxDl (CLD:p "hardware.runner.movento.nominalOverBoxMm")))

;;; The box's width and boards for an arm of span `span` (KIT_BUDR, per front).
(defun CLD:boxW (span G / )
  (- span (* 2.0 G) (CLD:p "baseDrawerUnit.boxWidthClearance")))

(defun CLD:boxFrontLen (span G / )
  (- span (* (CLD:p "baseDrawerUnit.boxFrontBoards") G) (CLD:p "baseDrawerUnit.boxFrontClearance")))

(defun CLD:bottomW (span G / )
  (+ (CLD:boxFrontLen span G) (CLD:p "baseDrawerUnit.bottomOversize")))

(defun CLD:sideH (h / )
  (float (CLD:round (* h (CLD:p "baseDrawerUnit.sideRatio")))))

(defun CLD:boxFrontH (sideH G / )
  (- sideH (CLD:p "baseDrawerUnit.boxFrontHeightDeduction") G (CLD:p "baseDrawerUnit.boxFrontHeightExtra")))

;;; Where the box's near side's OUTER face stands along the arm, from the room
;;; corner: the arm's opening starts at d, the box G + 5 inside it (KIT_BUDR's
;;; szufX = x0 + G + 5: the carcass side, then half the width clearance).
(defun CLD:boxStart (armD G / )
  (+ armD G (/ (CLD:p "baseDrawerUnit.boxWidthClearance") 2.0)))

;;; ...and its far side's OUTER face, from the arm's outer end.
(defun CLD:boxEnd (outX G / )
  (- outX G (/ (CLD:p "baseDrawerUnit.boxWidthClearance") 2.0)))

;;;========================================
;;; C. THE L FRONT (section 5)
;;;========================================

(defun CLD:gap ( / )
  (CLD:p "doors.gap"))

;;; The front's back stands `gap` off the carcass front (KIT_BUDR's drawDoor).
(defun CLD:standoff ( / )
  (CLD:p "doors.gap"))

;;; FRONT A's span along wall A: (x1 x2).
(defun CLD:frontA (outW armD / g)
  (setq g (CLD:gap))
  (list (+ armD g) (- outW (/ g 2.0))))

;;; FRONT B's span along wall B: (y1 y2). It starts at A's face.
(defun CLD:frontB (outD armD frontT / g)
  (setq g (CLD:gap))
  (list (+ armD g frontT) (- outD (/ g 2.0))))

(defun CLD:frontLen (f / )
  (- (cadr f) (car f)))

;;; The two front-fixing holes along a board, in the BOARD's frame (X from its
;;; inner end at `frontStart`): 50 inside each box side's inner face.
(defun CLD:frontHoles (armD outX frontStart G / s e sc)
  (setq sc (CLD:p "baseDrawerUnit.boxScrewFromEdge")
        s  (+ (CLD:boxStart armD G) G sc)
        e  (- (CLD:boxEnd outX G) G sc))
  (list (- s frontStart) (- e frontStart)))

;;; ...and their height from the board's bottom edge: 96.5, + G on row 1.
(defun CLD:frontHoleY (row G / )
  (+ (CLD:p "baseDrawerUnit.frontScrewFromBottom") (if (= row 1) G 0.0)))

;;; The travel of a row: the runner's nominal, along the diagonal (section 6).
(defun CLD:travel (armD G / dl)
  (setq dl (CLD:boxDepth armD G))
  (if dl (CLD:runnerNL dl) 0.0))

;;; The diagonal unit vector of the LEFT hand: (+1 +1) / sqrt 2.
(defun CLD:slideDir ( / k)
  (setq k (/ 1.0 (sqrt 2.0)))
  (list k k))

;;;========================================
;;; D. THE KIT BODY (section 7)
;;;========================================

;;; The placeholder's plan rectangle (x1 y1 x2 y2): a square of bracketMm whose
;;; far corner is the fronts' meeting point (d + gap, d + gap), inside the
;;; carcass, behind both fronts.
(defun CLD:kitBody (armD / s g c)
  (setq s (CLD:p "corner.spaceCorner.bracketMm")
        g (CLD:standoff)
        c (+ armD g))
  (list (- c s) (- c s) c c))

;;;========================================
;;; E. THE BOARD LIST (summary, CSV, and the test's census)
;;;========================================
;;;
;;; (name w h area edgeCode edgeLength), mm and mm2. KIT_BUDR's CSV convention:
;;; box boards carry no edge code and 0 edging; a front is edged all round.

(defun CLD:rowBoards (outW outD armD G frontT hs / dl fa fb out i h arm span sideH bfl bfh bw la lb)
  (setq dl  (CLD:boxDepth armD G)
        fa  (CLD:frontA outW armD)
        fb  (CLD:frontB outD armD frontT)
        la  (CLD:frontLen fa)
        lb  (CLD:frontLen fb)
        out '()
        i   1)
  (foreach h hs
    (setq sideH (CLD:sideH h)
          bfh   (CLD:boxFrontH sideH G))
    (foreach arm '("A" "B")
      (setq span (if (= arm "A") (- outW armD) (- outD armD))
            bfl  (CLD:boxFrontLen span G)
            bw   (CLD:bottomW span G))
      (setq out (append out
        (list
          (list (strcat "D" (itoa i) arm "-SL") dl sideH (* dl sideH) "" 0.0)
          (list (strcat "D" (itoa i) arm "-SR") dl sideH (* dl sideH) "" 0.0)
          (list (strcat "D" (itoa i) arm "-BF") bfl bfh (* bfl bfh) "" 0.0)
          (list (strcat "D" (itoa i) arm "-BB") bfl bfh (* bfl bfh) "" 0.0)
          (list (strcat "D" (itoa i) arm "-DNO") bw dl (* bw dl) "" 0.0)))))
    (setq out (append out
      (list
        (list (strcat "F" (itoa i) "-A") la h (* la h) "<>^v" (* 2.0 (+ la h)))
        (list (strcat "F" (itoa i) "-B") lb h (* lb h) "<>^v" (* 2.0 (+ lb h))))))
    (setq i (1+ i)))
  out)

;;; THE CENSUS of a stack of n rows: (boards runnerPairs kits), section 9.
(defun CLD:census (n / )
  (list (* n 12) (* n 2) n))

;;;========================================
;;; F. DRAWING
;;;========================================

;;; The one layer of this file's own: the bought body, never cut.
(defun createCLD_Layers ( / )
  (command "._LAYER" "_N" "HARDWARE_BODY" "_C" "30" "HARDWARE_BODY" ""))

;;; A box in the PLAN for arm A (runs along y): sides, front, back as KIT_BUDR
;;; draws its bottom drawer. `x1` the near side's outer face.
(defun drawCLD_BOXA (x0 y0 x1 bw dl armD G / fy)
  (setq fy (+ armD (CLD:standoff)))
  (drawRect "DRAWERS" (+ x0 x1) (+ y0 (- fy dl)) (+ x0 x1 G) (+ y0 fy))
  (drawRect "DRAWERS" (+ x0 x1 bw (- G)) (+ y0 (- fy dl)) (+ x0 x1 bw) (+ y0 fy))
  (drawRect "DRAWERS" (+ x0 x1 G) (+ y0 fy (- G)) (+ x0 x1 bw (- G)) (+ y0 fy))
  (drawRect "DRAWERS" (+ x0 x1 G) (+ y0 (- fy dl)) (+ x0 x1 bw (- G)) (+ y0 (- fy dl) G)))

;;; A box in the PLAN for arm B (runs along x). `y1` the near side's outer face.
(defun drawCLD_BOXB (x0 y0 y1 bw dl armD G / fx)
  (setq fx (+ armD (CLD:standoff)))
  (drawRect "DRAWERS" (+ x0 (- fx dl)) (+ y0 y1) (+ x0 fx) (+ y0 y1 G))
  (drawRect "DRAWERS" (+ x0 (- fx dl)) (+ y0 y1 bw (- G)) (+ x0 fx) (+ y0 y1 bw))
  (drawRect "DRAWERS" (+ x0 fx (- G)) (+ y0 y1 G) (+ x0 fx) (+ y0 y1 bw (- G)))
  (drawRect "DRAWERS" (+ x0 (- fx dl)) (+ y0 y1 G) (+ x0 (- fx dl) G) (+ y0 y1 bw (- G))))

;;; The L front in the PLAN: two boards, frontT thick, B's end on A's face.
(defun drawCLD_LFRONT_PLAN (x0 y0 outW outD armD frontT / fa fb g)
  (setq fa (CLD:frontA outW armD)
        fb (CLD:frontB outD armD frontT)
        g  (CLD:standoff))
  (drawRect "DOORS" (+ x0 (car fa)) (+ y0 armD g) (+ x0 (cadr fa)) (+ y0 armD g frontT))
  (drawRect "DOORS" (+ x0 armD g) (+ y0 (car fb)) (+ x0 armD g frontT) (+ y0 (cadr fb))))

;;; The PLAN: KIT_CORNER_L's carcass, the bottom row's two boxes, the L front,
;;; the kit body and the diagonal arrow.
(defun drawCLD_PLAN (x0 y0 outW outD armD G frontT mount unitNum / dl kb dir tr c)
  (drawCL_PLAN x0 y0 outW outD armD G 0 mount unitNum)
  (setq dl (CLD:boxDepth armD G))
  (if dl
    (progn
      (drawCLD_BOXA x0 y0 (CLD:boxStart armD G) (CLD:boxW (- outW armD) G) dl armD G)
      (drawCLD_BOXB x0 y0 (CLD:boxStart armD G) (CLD:boxW (- outD armD) G) dl armD G)))
  (drawCLD_LFRONT_PLAN x0 y0 outW outD armD frontT)
  (setq kb (CLD:kitBody armD))
  (drawRect "HARDWARE_BODY" (+ x0 (nth 0 kb)) (+ y0 (nth 1 kb)) (+ x0 (nth 2 kb)) (+ y0 (nth 3 kb)))
  ;; the travel: from the fronts' meeting point along the diagonal, by the rung
  (setq dir (CLD:slideDir)
        tr  (CLD:travel armD G)
        c   (+ armD (CLD:standoff)))
  (drawLine "DOOR_SWING" (+ x0 c) (+ y0 c)
            (+ x0 c (* tr (car dir))) (+ y0 c (* tr (cadr dir))))
  (drawText "UNIT_NUMBER" (+ x0 c (* tr (car dir)) 60.0) (+ y0 c (* tr (cadr dir))) 24.0
            (strcat "SPACE CORNER: " (rtos tr 2 0) " on the diagonal")))

;;; ONE ARM's FRONT ELEVATION: the arm's face (span wide, H tall) and the rows'
;;; front boards stacked up it. `f` the front's (start end) along the arm, read
;;; from the inner corner. Seen from the room, SIDE-A is the LEFT side of arm A
;;; (KIT_CORNER_L section 3) so the inner corner is at the RIGHT of arm A's
;;; picture; SIDE-B is the RIGHT side of arm B, so the inner corner is at the
;;; LEFT of arm B's. Arm A is therefore drawn `mirrored` about the arm's middle
;;; and arm B as read; drawn side by side the two corner ends face each other.
(defun drawCLD_ELEV (x0 y0 span armD f hs bottoms H mirrored label / a b i h z)
  (drawRect "CARCASE" x0 y0 (+ x0 span) (+ y0 H))
  (setq a (- (car f) armD)
        b (- (cadr f) armD))
  (if mirrored
    (setq a (- span b) b (- span (- (car f) armD))))
  (setq i 0)
  (foreach h hs
    (setq z (nth i bottoms))
    (drawRect "DOORS" (+ x0 a) (+ y0 z) (+ x0 b) (+ y0 z h))
    (drawText "UNIT_NUMBER" (+ x0 (/ (+ a b) 2.0)) (+ y0 z (/ h 2.0)) 24.0
              (strcat label "-F" (itoa (1+ i))))
    (setq i (1+ i)))
  (drawText "UNIT_NUMBER" (+ x0 (/ span 2.0)) (+ y0 H 40.0) 30.0 label))

;;; The kit body in an arm's elevation: at the inner-corner end, each row.
(defun drawCLD_KITBODY_ELEV (x0 y0 span hs bottoms atLeft / s i h z)
  (setq s (CLD:p "corner.spaceCorner.bracketMm") i 0)
  (foreach h hs
    (setq z (nth i bottoms))
    (if atLeft
      (drawRect "HARDWARE_BODY" x0 (+ y0 z) (+ x0 s) (+ y0 z (CLD:sideH h)))
      (drawRect "HARDWARE_BODY" (+ x0 span (- s)) (+ y0 z) (+ x0 span) (+ y0 z (CLD:sideH h))))
    (setq i (1+ i))))

;;; A FRONT BOARD on the CNC sheet: outline, the two fixing holes, label. The
;;; board lies with X along its length from its INNER end, Y up. KIT_BUDR's
;;; drawDRAWER_FRONT with the holes measured from the box (section 5).
(defun drawCLD_FRONTBOARD (x0 y0 len h holes holeY label / hx r)
  (setq r (/ (CLD:p "baseDrawerUnit.frontScrewDiameter") 2.0))
  (drawRect "DRAWER_FRONT_OUTLINE" x0 y0 (+ x0 len) (+ y0 h))
  (foreach hx holes
    (drawCircle "FRONT_HINGES_3MM" (+ x0 hx) (+ y0 holeY) r))
  (drawText "UNIT_NUMBER" (+ x0 (/ len 2.0)) (+ y0 (/ h 2.0)) 40.0 label))

;;;========================================
;;; G. THE COMMAND
;;;========================================
(defun c:CORNER_L_DRAWERS ( / G frontT mount dW dArm dH dN outW outD armD hgt nRows
                              unitNum defNum pt x0 y0 sideW spanA spanB dl nl
                              hs bottoms runners minH fa fb holesA holesB
                              drawCNC cncPt cncX cncY odstep cncDone
                              nomTop jTop relTop i h arm span sideH bfl bfh bw lbl
                              boards b census sumX sumY lineH totalSQM totalEdging
                              elevX elevY kb csvPath csvFile
                              _oldCmdecho _oldOsmode _oldClayer _olderr)

  ;; Save state
  (setq _oldCmdecho (getvar "CMDECHO"))
  (setq _oldOsmode  (getvar "OSMODE"))
  (setq _oldClayer  (getvar "CLAYER"))
  (setq _olderr *error*)

  ;; Error handler (ESC / crash safe)
  (defun *error* (msg)
    (if _oldClayer  (setvar "CLAYER"  _oldClayer))
    (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
    (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
    (setq *error* _olderr)
    (if (and msg (not (wcmatch (strcase msg) "*CANCEL*,*QUIT*,*EXIT*")))
      (princ (strcat "\nERROR: " msg)))
    (princ))

  (setvar "CMDECHO" 0)
  (setvar "INSUNITS" 4)
  (setvar "MEASUREMENT" 1)

  ;; === INPUT ===
  (setq G (getreal "\nBoard THICKNESS [mm] (18=standard, 22=heavy) <18>: "))
  (if (or (null G) (<= G 0.0)) (setq G 18.0))

  (setq frontT (getreal (strcat "\nFRONT thickness [mm] <" (rtos (CLD:p "front.thickness") 2 0) ">: ")))
  (if (or (null frontT) (<= frontT 0.0)) (setq frontT (CLD:p "front.thickness")))

  (setq mount (getstring "\nVersion [B=Base on legs, W=Wall hung, X=Wardrobe] <B>: "))
  (if (= mount "") (setq mount "B"))
  (setq mount (strcase mount))
  (if (not (or (= mount "B") (= mount "W") (= mount "X"))) (setq mount "B"))

  ;; Defaults per version - KIT_CORNER_L's (T75 proposed, owner to confirm);
  ;; the row count is this file's: three on a base (KIT_BUDR), two on a wall
  ;; unit, four on a wardrobe (T78 proposed, owner to confirm).
  (cond
    ((= mount "W") (setq dW 600.0  dArm 400.0 dH 720.0  dN 2 defNum "CW01"))
    ((= mount "X") (setq dW 1000.0 dArm 568.0 dH 2150.0 dN 4 defNum "CX01"))
    (T             (setq dW 900.0  dArm 558.0 dH 770.0  dN 3 defNum "CL01")))

  (setq outW (getreal (strcat "\nOuter WIDTH along wall A [mm] <" (rtos dW 2 0) ">: ")))
  (if (or (null outW) (<= outW 0.0)) (setq outW dW))

  (setq outD (getreal (strcat "\nOuter WIDTH along wall B [mm] <" (rtos dW 2 0) ">: ")))
  (if (or (null outD) (<= outD 0.0)) (setq outD dW))

  (setq armD (getreal (strcat "\nArm DEPTH [mm] <" (rtos dArm 2 0) ">: ")))
  (if (or (null armD) (<= armD 0.0)) (setq armD dArm))

  (setq hgt (getreal (strcat "\nCabinet HEIGHT [mm] <" (rtos dH 2 0) ">: ")))
  (if (or (null hgt) (<= hgt 0.0)) (setq hgt dH))

  ;; Room refuses first: an L whose arm has no front of its own is not an L.
  (if (not (CL:validP outW outD armD G))
    (progn
      (princ (strcat "\nRefused: both arms must reach past the corner square - "
                     "WIDTH along wall A and along wall B must each exceed arm DEPTH + "
                     (rtos G 2 0) " mm."))
      (setvar "CMDECHO" _oldCmdecho)
      (exit)))

  (setq nRows (getint (strcat "\nNumber of drawer ROWS (2-4) <" (itoa dN) ">: ")))
  (if (null nRows) (setq nRows dN))

  ;; A SPACE CORNER is a STACK: one row is refused, five is refused.
  (if (not (CLD:rowsValidP nRows))
    (progn
      (princ (strcat "\nRefused: a SPACE CORNER is a stack of "
                     (itoa (fix (CLD:p "corner.spaceCorner.rowsMin"))) " to "
                     (itoa (fix (CLD:p "corner.spaceCorner.rowsMax")))
                     " drawer rows (Blum: one set per drawer; no drawer-unit variant splits a height "
                     (itoa nRows) " ways)."))
      (setvar "CMDECHO" _oldCmdecho)
      (exit)))

  ;; The arm must take the shortest runner of the ladder.
  (setq dl (CLD:boxDepth armD G))
  (if (null dl)
    (progn
      (princ (strcat "\nRefused: arm DEPTH " (rtos armD 2 0) " leaves "
                     (rtos (CLD:usableDepth armD G) 2 0)
                     " mm for a box; the shortest MOVENTO rung is "
                     (rtos (car (CLD:ladder)) 2 0) " (box "
                     (rtos (- (car (CLD:ladder)) (CLD:p "hardware.runner.movento.nominalOverBoxMm")) 2 0) ")."))
      (setvar "CMDECHO" _oldCmdecho)
      (exit)))
  (setq nl (CLD:runnerNL dl))

  (setq unitNum (getstring T (strcat "\nUnit NUMBER <" defNum ">: ")))
  (if (= unitNum "") (setq unitNum defNum))

  (setq pt (getpoint "\nInsertion point (the ROOM CORNER): "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))

  (setq x0 (car pt) y0 (cadr pt))
  (setq sideW (- armD G))
  (setq spanA (- outW armD) spanB (- outD armD))
  (setq hs      (CLD:rowHeights hgt nRows)
        bottoms (CLD:rowBottoms hs)
        runners (CLD:runnerRows bottoms G)
        minH    (CLD:minFrontH)
        fa      (CLD:frontA outW armD)
        fb      (CLD:frontB outD armD frontT)
        holesA  (CLD:frontHoles armD outW (car fa) G)
        holesB  (CLD:frontHoles armD outD (car fb) G))

  ;; The owner's clamp on the shortest front (KIT_BUDR, turn 17): said, not clipped.
  (foreach h hs
    (if (< h minH)
      (princ (strcat "\nWARNING: a row's front is " (rtos h 2 0) " tall, under the "
                     (rtos minH 2 0) " the runner needs (28 + 10). Fewer rows."))))

  ;; THE KIT's two numbers, in words (section 7): never a block.
  (foreach arm '("A" "B")
    (setq span (if (= arm "A") spanA spanB))
    (if (< (CLD:boxFrontLen span G) (CLD:k "variants.movento_wooden_drawer.lockingDevice.minInsideDrawerWidthMm"))
      (princ (strcat "\nWARNING: arm " arm "'s box is " (rtos (CLD:boxFrontLen span G) 2 0)
                     " inside; Blum's locking device wants 170 (owner to confirm).")))
    (if (or (< (+ span armD) (CLD:k "cabinet.recommendedWidthMm.min"))
            (> (+ span armD) (CLD:k "cabinet.recommendedWidthMm.max")))
      (princ (strcat "\nPROPOSAL: arm " arm " is " (rtos (+ span armD) 2 0)
                     " wide; Blum recommends 900 to 1200 for a SPACE CORNER (owner to confirm)."))))

  ;; === LAYERS ===
  (createViewLayers)
  (createDrawerLayers)
  (createCLD_Layers)
  (command "._LAYER" "_N" "DRAWERS" "_C" "8" "DRAWERS" "")

  ;;;========================================
  ;;; PLAN VIEW (origin = the room corner)
  ;;;========================================
  (drawCLD_PLAN x0 y0 outW outD armD G frontT mount unitNum)

  ;;;========================================
  ;;; FRONT ELEVATIONS, the two arms side by side, under the plan
  ;;;========================================
  ;; arm A (SIDE-A left, the corner right), then arm B (the corner left, SIDE-B right)
  (setq elevX x0 elevY (- y0 hgt 200.0))
  (drawCLD_ELEV elevX elevY spanA armD fa hs bottoms hgt T (strcat unitNum "-A"))
  (drawCLD_KITBODY_ELEV elevX elevY spanA hs bottoms nil)
  (setq elevX (+ elevX spanA 100.0))
  (drawCLD_ELEV elevX elevY spanB armD fb hs bottoms hgt nil (strcat unitNum "-B"))
  (drawCLD_KITBODY_ELEV elevX elevY spanB hs bottoms T)

  ;;;========================================
  ;;; CNC PANELS - optional
  ;;;========================================
  (setq drawCNC (getstring "\nDraw CNC panels? [Y/N] <N>: "))
  (if (= drawCNC "") (setq drawCNC "N"))
  (setq drawCNC (strcase drawCNC))

  (if (= drawCNC "Y")
    (progn
      (createCNCLayers)
      (createDrawerCNCLayers)
      (if (= mount "W")
        (command "._LAYER" "_N" "HANGER_HOLE" "_C" "4" "HANGER_HOLE" ""))

      (setq nomTop (CL:lTop outW outD armD G)
            jTop   (CL:lTopJoints outW outD armD G)
            relTop (CL:innerRelief nomTop (CL:cutterRadius)))

      (setq cncPt (getpoint "\nClick insertion point for CNC panels: "))
      (if (null cncPt)
        (princ "\nNo point selected. CNC cancelled.")
        (progn
          (setq cncX (car cncPt))
          (setq cncY (cadr cncPt))
          (setq odstep 50.0)

          ;; SIDE-A = KIT_BUD's BUL, d deep, KIT_BUDR's runner rows, NO hinges
          (drawBUL cncX cncY sideW hgt unitNum 0 G nil nil runners)
          (if (= mount "W") (drawCL_HANGERSIDE cncX cncY sideW hgt "L"))
          (setq cncX (+ cncX sideW odstep))

          ;; SIDE-B = KIT_BUD's BUR, the same rows, NO hinges
          (drawBUR cncX cncY sideW hgt unitNum 0 G nil nil runners)
          (if (= mount "W") (drawCL_HANGERSIDE cncX cncY sideW hgt "R"))
          (setq cncX (+ cncX sideW odstep))

          ;; TOP-L and BOTTOM-L - KIT_CORNER_L's, turned 90 (T78 F4)
          (setq cncX (+ cncX G))
          (drawCL_LBOARD_ROT90 cncX (+ cncY G) nomTop jTop relTop (strcat unitNum " TOP-L") G)
          (setq cncX (+ cncX (cadr (nth 5 nomTop)) G odstep))
          (setq cncX (+ cncX G))
          (drawCL_LBOARD_ROT90 cncX (+ cncY G) nomTop jTop relTop (strcat unitNum " BOTTOM-L") G)
          (setq cncX (+ cncX (cadr (nth 5 nomTop)) G odstep))

          ;; BACK-A = KIT_BUD's BACK at width W
          (drawBACK cncX cncY outW hgt unitNum G)
          (if (= mount "W")
            (progn
              (setq b (CL:hangerBack outW hgt))
              (drawRect "HANGER_HOLE" (+ cncX (nth 0 b)) (+ cncY (nth 1 b))
                        (+ cncX (nth 2 b)) (+ cncY (nth 3 b)))))
          (setq cncX (+ cncX outW odstep))

          ;; BACK-B - KIT_CORNER_L's own
          (setq cncX (+ cncX G))
          (drawCL_BACKB cncX cncY outD hgt G (strcat unitNum " BACK-B") (= mount "W"))
          (setq cncX (+ cncX (- outD G) odstep))

          ;; THE BOXES: per row, per arm, KIT_BUDR's five boards (its own functions)
          (setq i 1)
          (foreach h hs
            (setq sideH (CLD:sideH h)
                  bfh   (CLD:boxFrontH sideH G))
            (foreach arm '("A" "B")
              (setq span (if (= arm "A") spanA spanB)
                    bfl  (CLD:boxFrontLen span G)
                    bw   (CLD:bottomW span G)
                    lbl  (strcat unitNum "-" arm))
              (drawDRAWER_SIDE cncX cncY dl sideH lbl i 1 G)
              (setq cncX (+ cncX sideH odstep))
              (drawDRAWER_SIDE cncX cncY dl sideH lbl i 2 G)
              (setq cncX (+ cncX sideH odstep))
              (drawDRAWER_BOX_FRONT cncX cncY bfl bfh lbl i T)
              (setq cncX (+ cncX bfh odstep))
              (drawDRAWER_BOX_FRONT cncX cncY bfl bfh lbl i nil)
              (setq cncX (+ cncX bfh odstep))
              (drawDRAWER_BOTTOM cncX cncY bw dl lbl i)
              (setq cncX (+ cncX bw odstep)))
            (setq i (1+ i)))

          ;; THE L FRONTS: per row the two boards, stacked up the sheet as
          ;; KIT_BUDR stacks its fronts; A's column then B's.
          (setq cncX (+ cncX 100.0))
          (setq i 1)
          (foreach h hs
            (drawCLD_FRONTBOARD cncX (+ cncY (nth (1- i) bottoms)) (CLD:frontLen fa) h
                                holesA (CLD:frontHoleY i G) (strcat unitNum "-F" (itoa i) "-A"))
            (setq i (1+ i)))
          (setq cncX (+ cncX (CLD:frontLen fa) odstep))
          (setq i 1)
          (foreach h hs
            (drawCLD_FRONTBOARD cncX (+ cncY (nth (1- i) bottoms)) (CLD:frontLen fb) h
                                holesB (CLD:frontHoleY i G) (strcat unitNum "-F" (itoa i) "-B"))
            (setq i (1+ i)))
          (setq cncX (+ cncX (CLD:frontLen fb) odstep))

          ;;;========================================
          ;;; SUMMARY TEXT BLOCK
          ;;;========================================
          (setq boards (CLD:rowBoards outW outD armD G frontT hs))
          (setq census (CLD:census nRows))
          (setq totalSQM 0.0 totalEdging 0.0)
          (foreach b boards
            (setq totalSQM (+ totalSQM (nth 3 b))
                  totalEdging (+ totalEdging (nth 5 b))))

          (setq sumX (+ cncX 500.0))
          (setq sumY (+ cncY hgt))
          (setq lineH 30.0)

          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "UNIT: " unitNum " (L CORNER DRAWERS, "
                    (cond ((= mount "W") "WALL") ((= mount "X") "WARDROBE") (T "BASE")) ", "
                    (itoa nRows) " ROWS)"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "CARCASS: KIT_CORNER_L's six boards, runner rows, no hinges")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 1.2)))
          (setq i 1)
          (foreach b boards
            (drawTextL "SUMMARY" sumX sumY lineH
              (strcat (itoa i) ". " unitNum "-" (nth 0 b) ": " (rtos (nth 1 b) 2 1) " x " (rtos (nth 2 b) 2 0)))
            (setq sumY (- sumY (* lineH 1.2)))
            (setq i (1+ i)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "BOARDS: " (itoa (nth 0 census)) " (" (itoa nRows) " x (2 fronts + 2 x 5 box))"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "SQM: " (rtos (/ totalSQM 1000000.0) 2 2) " m2"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "EDGING: " (rtos (/ totalEdging 1000.0) 2 2) " m"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "RUNNERS: " (itoa (nth 1 census)) " MOVENTO pairs, NL " (rtos nl 2 0) " (box " (rtos dl 2 0) ")"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "KITS: " (itoa (nth 2 census)) " x " CLD:kitLabel " (bought, 0 holes)"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "FRONT JOINT: " CL:frontJoint " (B's end on A's face)"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 2.5)))
          (drawTextLC "SUMMARY" sumX sumY lineH "MOTION: the whole row on the 45 diagonal, by the rung" 6)
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextLC "SUMMARY" sumX sumY lineH (strcat "KIT: " CLD:kitArticles) 6)
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextLC "SUMMARY" sumX sumY lineH "numbers: blum-space-corner.json, owner to confirm" 6)
          (setq sumY (- sumY (* lineH 2.0)))
          (drawTextLC "SUMMARY" sumX sumY lineH "Property of Skylon Joinery" 6)

          (setq cncDone T)
          (princ "\nCNC panels generated."))))) ;; closes: getpoint progn, cncPt if, drawCNC progn, drawCNC if

  ;;;========================================
  ;;; LABELS CSV (only if CNC was generated)
  ;;;========================================
  (if cncDone
    (progn
      (setq csvPath (findfile "KIT_CORNER_L_DRAWERS.lsp"))
      (if csvPath
        (setq csvPath (strcat (vl-filename-directory csvPath) "\\SKYLON_labels.csv"))
        (progn
          (setq csvPath (getvar "DWGPREFIX"))
          (if (= csvPath "") (setq csvPath (strcat (getenv "USERPROFILE") "\\Desktop\\")))
          (setq csvPath (strcat csvPath "SKYLON_labels.csv"))))
      ;; Append or create
      (if (findfile csvPath)
        (setq csvFile (open csvPath "a"))
        (progn
          (setq csvFile (open csvPath "w"))
          (if csvFile (write-line "UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM" csvFile))))
      (if csvFile
        (progn
          ;; The carcass rows are KIT_CORNER_L's (its own command writes them);
          ;; this file writes the DRAWER rows: box boards no edge (KIT_BUDR),
          ;; the front boards all round.
          (foreach b boards
            (write-line (strcat unitNum "," unitNum "-" (nth 0 b) "," (rtos (nth 1 b) 2 1) "," (rtos (nth 2 b) 2 0)
                                "," (nth 4 b) "," (rtos (/ (nth 5 b) 1000.0) 2 2)
                                "," (rtos (/ (nth 3 b) 1000000.0) 2 3))
                        csvFile))
          (close csvFile)
          (princ (strcat "\nLabels appended to: " csvPath)))
        (princ "\nERROR: Cannot open labels CSV file."))))

  ;; Restore state
  (if _oldClayer  (setvar "CLAYER"  _oldClayer))
  (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
  (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
  (setq *error* _olderr)

  (setq census (CLD:census nRows))
  (princ (strcat "\nCORNER_L_DRAWERS " unitNum " - Done! ("
                 (cond ((= mount "W") "wall") ((= mount "X") "wardrobe") (T "base")) ")"))
  (princ (strcat "\n  L: " (rtos outW 2 0) " x " (rtos outD 2 0) ", arms " (rtos armD 2 0)
                 " deep, H " (rtos hgt 2 0) "mm, G=" (rtos G 2 0) "mm, front " (rtos frontT 2 0) "mm"))
  (princ (strcat "\n  Rows: " (itoa nRows) ", box " (rtos dl 2 0) " (NL " (rtos nl 2 0)
                 "), CNC: " (if (= drawCNC "Y") "Yes" "No")))
  (princ (strcat "\n  Census: boards " (itoa (nth 0 census)) ", runner pairs " (itoa (nth 1 census))
                 ", kits " (itoa (nth 2 census)) ", kit holes 0"))
  (princ))

(princ "\nKIT_CORNER_L_DRAWERS loaded. Type CORNER_L_DRAWERS to run.")
(princ)
