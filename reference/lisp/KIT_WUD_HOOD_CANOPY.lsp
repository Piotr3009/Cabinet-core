;;;========================================
;;; KIT_WUD_HOOD_CANOPY.lsp
;;; The CANOPY HOOD: a wall-unit carcass whose FRONT slopes out from the top
;;; to a deeper bottom (the traditional chimney canopy)
;;; Command: WUD_HOOD_CANOPY
;;; Turn 78 (CLAUDE.md PART D, F17) - LISP FIRST
;;; Derived from: KIT_WUD_FULL.lsp (the envelope W x H x D, the full back, the
;;;               hanger holes and the back cut-outs)
;;; Requires: SKYLON_COMMON.lsp loaded first (auto-loaded below).
;;;           drawTOP_ROT90, drawBACK, drawRect, drawLine, drawCircle, drawText,
;;;           drawTextL, makePolyline, createViewLayers, createCNCLayers are
;;;           COMMON's: CALLED, never copied. The two boards that are NEW SHAPES
;;;           (the trapezoid side, the deeper bottom) and the one new board (the
;;;           sloped front) are drawn HERE, with COMMON's own joint numbers
;;;           restated beside them as named variables (section 4).
;;;========================================
;;;
;;; THE OWNER'S LAW, 11.10.2026 (the eye-test of T75 to T77, point by point):
;;;
;;;   "szafka na hood tradycyjna czyli wysunieta pod skosem albo normalna
;;;    szafka tylko mniejsza zeby bylo 650 do 750 minimum nad blatem, nad
;;;    hobem"
;;;
;;; and, on 650 or 750:
;;;
;;;   "tak jak mowisz ale pozostaw to dla klienta, tylko proponuj"
;;;
;;; TWO KITS beside WUD_HOOD (engine/types.js):
;;;
;;;   WUD_HOOD_CANOPY  THIS FILE. A wall-unit carcass whose front slopes out
;;;                    from the top (depth D, the wall unit's) to a deeper
;;;                    bottom (depth D + P). No door. The extractor is a BOM
;;;                    line and a body, never a hole (T78 LAWS): the machine's
;;;                    cut-out in the bottom board waits for a manufacturer's
;;;                    drawing in reference/hardware/ with a page number.
;;;   WUD_HOOD_SHORT   KIT_WUD_FULL's envelope (KIT_WUD_HOOD's open bottom and
;;;                    shorter door), 660 high instead of 720, hung at 1560 so
;;;                    its TOP meets the wall run's top line (1500 + 720 =
;;;                    2220) and its underside stands 650 over the worktop.
;;;                    No new geometry, so no file of its own: KIT_WUD_FULL.lsp
;;;                    is its LISP. Its numbers are in section 7.
;;;
;;; THE CLEARANCE is NOT a block. It is a Check (#34) that says the number and
;;; offers one click (section 7). The client may leave it.
;;;
;;;========================================
;;; 1. THE FRAME
;;;========================================
;;;
;;; PLAN (top view), KIT_WUD_FULL's own: x along the WIDTH, y along the DEPTH
;;; with the WALL at y0 + D and the carcass front at y0; what projects into the
;;; room is at y < y0 (the doors of KIT_WUD sit at y0 - gap). So the canopy's
;;; bottom front edge is at y0 - P and the sloped front runs from y0 (at the
;;; top) to y0 - P (at the bottom).
;;;
;;; SIDE (elevation from the left), THE DRAWING THAT MATTERS: x along the
;;; DEPTH from the FRONT (x = 0 the bottom front corner, x = sideW + P the
;;; back), y up from the carcass bottom. The slope is the line from (P, Hc) to
;;; (0, 0).
;;;
;;; ENGINE (engine/hoodCanopy.js): box.x across, box.y up, box.z the depth
;;; from the wall (0 the back of the back panel, D the carcass front, D + P
;;; the bottom's front edge).
;;;
;;;========================================
;;; 2. THE INPUTS
;;;========================================
;;;
;;;   W        carcass width, the extractor's own (widthFixed, as WUD_HOOD):
;;;            600 (hoodCanopy.defaults.width)
;;;   D        carcass depth AT THE TOP, the wall unit's: 400
;;;            (hoodCanopy.defaults.depth)
;;;   Hc       the CANOPY HEIGHT: 500 (hoodCanopy.defaults.height,
;;;            CLAUDE.md T78 F17 names it heightMm)      // T78 proposed, owner to confirm
;;;   P        the BOTTOM PROJECTION beyond D: 150
;;;            (hoodCanopy.defaults.bottomProjectionMm)   // T78 proposed, owner to confirm
;;;   G        board thickness, profile board.thickness (18)
;;;   frontT   front thickness, profile front.thickness (25): the sloped
;;;            front is FRONT material (role false_front, part FALSE-FRONT)
;;;   unitNum  HD01 (UNIT_NUM_PREFIX WUD_HOOD_CANOPY = HD, the hood's letter,
;;;            as the hob variants keep DR)
;;;
;;;========================================
;;; 3. THE NUMBERS DERIVED (nothing typed in the UI)
;;;========================================
;;;
;;;   sideW    = D - G                     the side's depth at the top, KIT_WUD's
;;;                                        (the back panel takes G of D): 382
;;;   alpha    = atan(P / Hc)              the slope off the VERTICAL:
;;;                                        atan(150 / 500) = 16.70 degrees
;;;   L        = sqrt(Hc^2 + P^2)          the sloped FACE, top plane to bottom
;;;                                        plane: 522.02
;;;   Lblank   = L + frontT * tan(alpha)   the BLANK cut for it, lowest corner
;;;                                        to highest, both ends bevelled at
;;;                                        alpha at the saw (T47's roof-board
;;;                                        law: L_MAX = L + t * tan beta; a
;;;                                        three-axis machine cannot cut the
;;;                                        bevel, so it is an annotation):
;;;                                        522.02 + 25 * 0.3 = 529.52
;;;
;;;========================================
;;; 4. THE BOARDS
;;;========================================
;;;
;;; 4.1 BUL / BUR: TRAPEZOIDS. COMMON's drawBUL frame (x = 0 the FRONT edge,
;;;     the back tabs up the back edge; BUR mirrored, x = 0 the back edge).
;;;     Depth at the top sideW, at the bottom sideW + P, height Hc.
;;;
;;;     BUL points:  (0, 0)  (sideW + P, 0)  [back tabs]  (sideW + P, Hc)
;;;                  (P, Hc)  and back to (0, 0): THE SLANTED EDGE.
;;;     BUR points:  (0, 0)  [back tabs on x = 0]  (0, Hc)  (sideW, Hc)
;;;                  (sideW + P, 0).
;;;
;;;     THE JOINTS ARE THE PARENT'S, measured from the BACK: the top sockets
;;;     and the bottom sockets both stand tabFromEnd (95) and sideW - 95 from
;;;     the back edge, exactly where KIT_WUD puts them; on BUL that is x = P +
;;;     95 and x = P + sideW - 95 because the whole parent board is pushed P
;;;     away from the new bottom front corner. The screws (50 from each end
;;;     of the PARENT's run, and its middle) and the hanger holes (21 and 53
;;;     from the back, 53 from the top, KIT_WUD's) move with them.
;;;     The front edge is the slanted edge: it is the edged edge (L long).
;;;
;;; 4.2 TOP: the parent's, drawTOP_ROT90 (W - 2G) x (D - G). Unchanged.
;;;
;;; 4.3 BOTTOM: (W - 2G) across, (D - G) + P deep. Drawn rotated like the
;;;     top: drawn x along the DEPTH from the BACK (x = 0 the back edge with
;;;     its back tabs), drawn y across the width. The tabs into the sides are
;;;     the PARENT's: at 95 and (D - G) - 95 from the back on both long
;;;     edges, where the sides' sockets stand (4.1). The FRONT EDGE is at
;;;     (D - G) + P and is PLAIN: the projection carries no joint, because one
;;;     law sets out the side-to-bottom joint whatever P is. drawTOP_ROT90 is
;;;     not called for it (its front edge would land at D - G), so the board
;;;     is traced here (HC:drawBottom), the parent's points with the two front
;;;     corners moved by P, once round (T25's one-traversal law).
;;;
;;; 4.4 BACK: drawBACK W x Hc, plus KIT_WUD's hanger cut-outs (30 x 58 at both
;;;     top corners). Unchanged.
;;;
;;; 4.5 CANOPY-FRONT (part FALSE-FRONT, role false_front, FRONT material,
;;;     frontT thick): W x Lblank, a PLAIN rectangle: nothing hinges, so no
;;;     cups. It lies ON the slanted edges of the two sides (overlay, W wide,
;;;     as a door overlays its carcass), its back face on the line from
;;;     (D, Hc) to (D + P, 0) in the engine frame; its top end face cut
;;;     horizontal under the top plane, its bottom end face cut horizontal
;;;     flush with the bottom board's underside: both bevels alpha, at the
;;;     saw. The 3D leans the blank by alpha about its top edge
;;;     (meta.tilt_deg = -alpha, pivot y = Hc, z = D: UnitView's own tilt
;;;     grammar, T74 F8).
;;;
;;; 4.6 NOT DRAWN: a door (none), shelves (none), the extractor's fixing or
;;;     cut-out (a bought mechanism is a line and a body, never a hole, until
;;;     its drilling is in reference/hardware/ with a page). KIT_WUD_HOOD's
;;;     aperture subtracts from no door here.
;;;
;;;========================================
;;; 5. THE VIEWS (section 6 of the code)
;;;========================================
;;;
;;;   PLAN   the carcass W x D at the wall, the bottom's front edge P beyond
;;;          the top's, the sloped front's outline W x (D + P).
;;;   SIDE   the trapezoid with the slope, P and Hc dimensioned, alpha noted.
;;;   FRONT  W x Hc, no door.
;;;
;;;========================================
;;; 6. COMMON'S JOINT NUMBERS, RESTATED AS NAMED VARIABLES
;;;========================================
;;;
;;;   tabFromEnd 95   socketHalf 25.5   overshoot 6   holeOff 24.5
;;;   holeR 3.75 (7.5 mm)   holeInset 1   S = G/2 + 0.5   dogboneHalf 30
;;;   screwFromEnd 50   screwR 1.5 (3 mm)   tab: 19 / 25 wide, 10.5 and G deep
;;;   hanger: 21 and 53 from the back, 53 from the top, 2.5 radius (5 mm)
;;;   (profile.puzzle, profile.wallUnit.hangers; drawBUL and drawTOP_ROT90)
;;;
;;;========================================
;;; 7. THE CLEARANCE AND THE SHORT HOOD (the Check's numbers, not drawn)
;;;========================================
;;;
;;;   profile.hood.clearance = { induction: 650, gas: 750 }   // T78 proposed, owner to confirm
;;;
;;;   Over a hob unit (params.hob, or OVEN_BASE) the gap from the WORKTOP TOP
;;;   (the base's top plus the slab: 770 + 100 + 38 = 908 at the defaults) to
;;;   the hood's underside (its mount_height) is measured; below the number
;;;   for the hob kind the client set (hob_kind induction | gas, a CHOICE,
;;;   default induction) Check #34 says the number and offers ONE CLICK: raise
;;;   the hood to the clearance (projectStore raiseHoodToClearance). Never a
;;;   block: "pozostaw to dla klienta, tylko proponuj".
;;;
;;;   WUD_HOOD_SHORT, hoodShort.defaults   // T78 proposed, owner to confirm
;;;     height      660   = 720 - (650 - (1500 - 908)) = 662, rounded to a
;;;                        whole ten
;;;     mountHeight 1560  = 2220 - 660: its top on the wall run's top line
;;;     gap         1560 - 908 = 652 >= 650 (induction); gas (750) is the
;;;                 Check's proposal, not a kit.
;;;
;;;========================================

;;; Auto-load COMMON if not already loaded
(if (null drawRect) (load "SKYLON_COMMON"))

;;;========================================
;;; 4.1 THE TRAPEZOID SIDE
;;;   side "L": x0 is the bottom FRONT corner, tabs up the back edge (x0 + sideW + P)
;;;   side "R": x0 is the back edge (tabs run to x < x0), the slope at the far end
;;;========================================
(defun HC:drawSide (x0 y0 sideW Hc P G unitNum side / S t1y t2y t3y xb xf xs pts
                    tabFromEnd socketHalf overshoot holeOff holeR holeInset
                    dogboneHalf screwFromEnd screwR sx1 sx2 midS hb1 hb2 midY)
  (setq tabFromEnd 95.0 socketHalf 25.5 overshoot 6.0 holeOff 24.5 holeR 3.75 holeInset 1.0
        dogboneHalf 30.0 screwFromEnd 50.0 screwR 1.5)
  (setq S (+ (/ G 2.0) 0.5))
  (setq t1y (+ y0 tabFromEnd) t2y (+ y0 (/ Hc 2.0)) t3y (+ y0 Hc (- tabFromEnd)))
  (if (= side "L")
    (progn
      ;; BUL: back edge at xb, the parent's front edge at xf = x0 + P, the slope to x0
      (setq xb (+ x0 sideW P) xf (+ x0 P))
      (setq pts (list
        (list x0 y0) (list xb y0)
        (list xb (- t1y 25.0)) (list xb (- t1y 19.0))
        (list (+ xb 10.5) (- t1y 19.0)) (list (+ xb 10.5) (- t1y 25.0))
        (list (+ xb G) (- t1y 25.0)) (list (+ xb G) (+ t1y 25.0))
        (list (+ xb 10.5) (+ t1y 25.0)) (list (+ xb 10.5) (+ t1y 19.0))
        (list xb (+ t1y 19.0)) (list xb (+ t1y 25.0))
        (list xb (- t2y 25.0)) (list xb (- t2y 19.0))
        (list (+ xb 10.5) (- t2y 19.0)) (list (+ xb 10.5) (- t2y 25.0))
        (list (+ xb G) (- t2y 25.0)) (list (+ xb G) (+ t2y 25.0))
        (list (+ xb 10.5) (+ t2y 25.0)) (list (+ xb 10.5) (+ t2y 19.0))
        (list xb (+ t2y 19.0)) (list xb (+ t2y 25.0))
        (list xb (- t3y 25.0)) (list xb (- t3y 19.0))
        (list (+ xb 10.5) (- t3y 19.0)) (list (+ xb 10.5) (- t3y 25.0))
        (list (+ xb G) (- t3y 25.0)) (list (+ xb G) (+ t3y 25.0))
        (list (+ xb 10.5) (+ t3y 25.0)) (list (+ xb 10.5) (+ t3y 19.0))
        (list xb (+ t3y 19.0)) (list xb (+ t3y 25.0))
        (list xb (+ y0 Hc)) (list xf (+ y0 Hc))))
      ;; the parent's run, from its front edge xf to the back xb
      (setq sx1 (+ xf tabFromEnd) sx2 (+ xb (- tabFromEnd)) midS (+ xf (/ sideW 2.0)))
      ;; hanger holes from the back
      (setq hb1 (- xb 21.0) hb2 (- xb 53.0))
      ;; dog bones at the back edge
      (drawRect "PUZZLE_DOG_BONES" xb (- t1y dogboneHalf) (+ xb G) (+ t1y dogboneHalf))
      (drawRect "PUZZLE_DOG_BONES" xb (- t2y dogboneHalf) (+ xb G) (+ t2y dogboneHalf))
      (drawRect "PUZZLE_DOG_BONES" xb (- t3y dogboneHalf) (+ xb G) (+ t3y dogboneHalf)))
    (progn
      ;; BUR: back edge at x0 (tabs to x < x0), the parent's front at xf = x0 + sideW,
      ;; the slope from (xf, Hc) down to (xs, 0) with xs = x0 + sideW + P
      (setq xf (+ x0 sideW) xs (+ x0 sideW P))
      (setq pts (list
        (list x0 y0) (list xs y0) (list xf (+ y0 Hc)) (list x0 (+ y0 Hc))
        (list x0 (+ t3y 25.0)) (list x0 (+ t3y 19.0))
        (list (- x0 10.5) (+ t3y 19.0)) (list (- x0 10.5) (+ t3y 25.0))
        (list (- x0 G) (+ t3y 25.0)) (list (- x0 G) (- t3y 25.0))
        (list (- x0 10.5) (- t3y 25.0)) (list (- x0 10.5) (- t3y 19.0))
        (list x0 (- t3y 19.0)) (list x0 (- t3y 25.0))
        (list x0 (+ t2y 25.0)) (list x0 (+ t2y 19.0))
        (list (- x0 10.5) (+ t2y 19.0)) (list (- x0 10.5) (+ t2y 25.0))
        (list (- x0 G) (+ t2y 25.0)) (list (- x0 G) (- t2y 25.0))
        (list (- x0 10.5) (- t2y 25.0)) (list (- x0 10.5) (- t2y 19.0))
        (list x0 (- t2y 19.0)) (list x0 (- t2y 25.0))
        (list x0 (+ t1y 25.0)) (list x0 (+ t1y 19.0))
        (list (- x0 10.5) (+ t1y 19.0)) (list (- x0 10.5) (+ t1y 25.0))
        (list (- x0 G) (+ t1y 25.0)) (list (- x0 G) (- t1y 25.0))
        (list (- x0 10.5) (- t1y 25.0)) (list (- x0 10.5) (- t1y 19.0))
        (list x0 (- t1y 19.0)) (list x0 (- t1y 25.0))))
      (setq sx1 (+ x0 tabFromEnd) sx2 (+ xf (- tabFromEnd)) midS (+ x0 (/ sideW 2.0)))
      (setq hb1 (+ x0 21.0) hb2 (+ x0 53.0))
      (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t1y dogboneHalf) x0 (+ t1y dogboneHalf))
      (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t2y dogboneHalf) x0 (+ t2y dogboneHalf))
      (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t3y dogboneHalf) x0 (+ t3y dogboneHalf))))
  (makePolyline "OUTLINE" pts)
  ;; Puzzle sockets, TOP edge: the parent's two, measured from the back
  (drawRect "PUZZLE_SOCKET" (- sx1 socketHalf) (+ y0 Hc (- S)) (+ sx1 socketHalf) (+ y0 Hc overshoot))
  (drawCircle "PUZZLE_HOLES_7_5MM" (- sx1 holeOff) (+ y0 Hc (- S) holeInset) holeR)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ sx1 holeOff) (+ y0 Hc (- S) holeInset) holeR)
  (drawRect "PUZZLE_SOCKET" (- sx2 socketHalf) (+ y0 Hc (- S)) (+ sx2 socketHalf) (+ y0 Hc overshoot))
  (drawCircle "PUZZLE_HOLES_7_5MM" (- sx2 holeOff) (+ y0 Hc (- S) holeInset) holeR)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ sx2 holeOff) (+ y0 Hc (- S) holeInset) holeR)
  ;; Puzzle sockets, BOTTOM edge: the SAME two, the bottom board's tabs are the parent's (4.3)
  (drawRect "PUZZLE_SOCKET" (- sx1 socketHalf) (- y0 overshoot) (+ sx1 socketHalf) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (- sx1 holeOff) (+ y0 S (- holeInset)) holeR)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ sx1 holeOff) (+ y0 S (- holeInset)) holeR)
  (drawRect "PUZZLE_SOCKET" (- sx2 socketHalf) (- y0 overshoot) (+ sx2 socketHalf) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (- sx2 holeOff) (+ y0 S (- holeInset)) holeR)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ sx2 holeOff) (+ y0 S (- holeInset)) holeR)
  ;; Screws, the parent's three per edge on the parent's run
  (drawCircle "SCREWS_3MM" (+ sx1 (- screwFromEnd tabFromEnd)) (+ y0 Hc (- S)) screwR)
  (drawCircle "SCREWS_3MM" midS (+ y0 Hc (- S)) screwR)
  (drawCircle "SCREWS_3MM" (+ sx2 (- tabFromEnd screwFromEnd)) (+ y0 Hc (- S)) screwR)
  (drawCircle "SCREWS_3MM" (+ sx1 (- screwFromEnd tabFromEnd)) (+ y0 S) screwR)
  (drawCircle "SCREWS_3MM" midS (+ y0 S) screwR)
  (drawCircle "SCREWS_3MM" (+ sx2 (- tabFromEnd screwFromEnd)) (+ y0 S) screwR)
  ;; Hanger holes, KIT_WUD's: 21 and 53 from the back, 53 from the top
  (drawCircle "HINGES_5MM" hb1 (+ y0 Hc -53.0) 2.5)
  (drawCircle "HINGES_5MM" hb2 (+ y0 Hc -53.0) 2.5)
  (setq midY (+ y0 (/ Hc 2.0)))
  (drawText "UNIT_NUMBER" midS midY 40.0 unitNum)
  (princ))

;;;========================================
;;; 4.3 THE DEEPER BOTTOM, rotated like drawTOP_ROT90
;;;   szer = the parent's drawn width (D - G), the depth from the back (x = 0)
;;;   wys  = the board's drawn height (W - 2G), across the cabinet
;;;   P    = the projection: the two FRONT corners move from szer to szer + P
;;;========================================
(defun HC:drawBottom (x0 y0 szer wys P unitNum G / midX midY t1y t2y t1x t2x xF pts)
  (setq xF (+ x0 szer P))
  (setq midX (+ x0 (/ (+ szer P) 2.0)) midY (+ y0 (/ wys 2.0)))
  (setq t1y (+ y0 95.0) t2y (+ y0 wys -95.0))
  (setq t1x (+ x0 95.0) t2x (+ x0 szer -95.0))
  (setq pts (list
    (list x0 y0) (list xF y0)
    (list xF (+ y0 wys))
    (list (+ t2x 25.0) (+ y0 wys)) (list (+ t2x 19.0) (+ y0 wys))
    (list (+ t2x 19.0) (+ y0 wys 10.5)) (list (+ t2x 25.0) (+ y0 wys 10.5))
    (list (+ t2x 25.0) (+ y0 wys G)) (list (- t2x 25.0) (+ y0 wys G))
    (list (- t2x 25.0) (+ y0 wys 10.5)) (list (- t2x 19.0) (+ y0 wys 10.5))
    (list (- t2x 19.0) (+ y0 wys)) (list (- t2x 25.0) (+ y0 wys))
    (list (+ t1x 25.0) (+ y0 wys)) (list (+ t1x 19.0) (+ y0 wys))
    (list (+ t1x 19.0) (+ y0 wys 10.5)) (list (+ t1x 25.0) (+ y0 wys 10.5))
    (list (+ t1x 25.0) (+ y0 wys G)) (list (- t1x 25.0) (+ y0 wys G))
    (list (- t1x 25.0) (+ y0 wys 10.5)) (list (- t1x 19.0) (+ y0 wys 10.5))
    (list (- t1x 19.0) (+ y0 wys)) (list (- t1x 25.0) (+ y0 wys))
    (list x0 (+ y0 wys))
    (list x0 (+ t2y 25.0)) (list x0 (+ t2y 19.0))
    (list (- x0 10.5) (+ t2y 19.0)) (list (- x0 10.5) (+ t2y 25.0))
    (list (- x0 G) (+ t2y 25.0)) (list (- x0 G) (- t2y 25.0))
    (list (- x0 10.5) (- t2y 25.0)) (list (- x0 10.5) (- t2y 19.0))
    (list x0 (- t2y 19.0)) (list x0 (- t2y 25.0))
    (list x0 (+ t1y 25.0)) (list x0 (+ t1y 19.0))
    (list (- x0 10.5) (+ t1y 19.0)) (list (- x0 10.5) (+ t1y 25.0))
    (list (- x0 G) (+ t1y 25.0)) (list (- x0 G) (- t1y 25.0))
    (list (- x0 10.5) (- t1y 25.0)) (list (- x0 10.5) (- t1y 19.0))
    (list x0 (- t1y 19.0)) (list x0 (- t1y 25.0))
    (list x0 y0)
    (list (- t1x 25.0) y0) (list (- t1x 19.0) y0)
    (list (- t1x 19.0) (- y0 10.5)) (list (- t1x 25.0) (- y0 10.5))
    (list (- t1x 25.0) (- y0 G)) (list (+ t1x 25.0) (- y0 G))
    (list (+ t1x 25.0) (- y0 10.5)) (list (+ t1x 19.0) (- y0 10.5))
    (list (+ t1x 19.0) y0) (list (+ t1x 25.0) y0)
    (list (- t2x 25.0) y0) (list (- t2x 19.0) y0)
    (list (- t2x 19.0) (- y0 10.5)) (list (- t2x 25.0) (- y0 10.5))
    (list (- t2x 25.0) (- y0 G)) (list (+ t2x 25.0) (- y0 G))
    (list (+ t2x 25.0) (- y0 10.5)) (list (+ t2x 19.0) (- y0 10.5))
    (list (+ t2x 19.0) y0) (list (+ t2x 25.0) y0)))
  (makePolyline "OUTLINE" pts)
  (drawRect "PUZZLE_DOG_BONES" (- t1x 30.0) (+ y0 wys) (+ t1x 30.0) (+ y0 wys G))
  (drawRect "PUZZLE_DOG_BONES" (- t2x 30.0) (+ y0 wys) (+ t2x 30.0) (+ y0 wys G))
  (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t1y 30.0) x0 (+ t1y 30.0))
  (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t2y 30.0) x0 (+ t2y 30.0))
  (drawRect "PUZZLE_DOG_BONES" (- t1x 30.0) (- y0 G) (+ t1x 30.0) y0)
  (drawRect "PUZZLE_DOG_BONES" (- t2x 30.0) (- y0 G) (+ t2x 30.0) y0)
  (drawText "UNIT_NUMBER" midX midY 40.0 unitNum)
  (princ))

;;;========================================
;;; 4.5 THE SLOPED FRONT: a plain blank W x Lblank, both ends bevelled at alpha
;;;========================================
(defun HC:drawFront (x0 y0 W Lblank alphaDeg unitNum / midX midY)
  (setq midX (+ x0 (/ W 2.0)) midY (+ y0 (/ Lblank 2.0)))
  (drawRect "DOORS" x0 y0 (+ x0 W) (+ y0 Lblank))
  (drawText "UNIT_NUMBER" midX midY 40.0 (strcat unitNum "-CF"))
  (drawText "UNIT_NUMBER" midX (- midY 60.0) 20.0
    (strcat "CANOPY FRONT, both ends bevelled " (rtos alphaDeg 2 1) " deg at the saw"))
  (princ))

;;;========================================
;;; Main command
;;;========================================
(defun c:WUD_HOOD_CANOPY ( / W D Hc P G frontT unitNum pt x0 y0
                           sideW alpha alphaDeg L Lblank tanA
                           szerTOP wysTOP szerBACK
                           sideY frontY cncPt cncX cncY odstep drawCNC
                           sumX sumY lineH
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

  ;; === INPUT (section 2) ===
  (setq G (getreal "\nBoard THICKNESS [mm] (18=standard, 22=heavy) <18>: "))
  (if (or (null G) (<= G 0.0)) (setq G 18.0))

  (setq frontT (getreal "\nFront THICKNESS [mm] (the sloped front, FRONT material) <25>: "))
  (if (or (null frontT) (<= frontT 0.0)) (setq frontT 25.0))

  (setq W (getreal "\nCanopy WIDTH [mm] (the extractor's own) <600>: "))
  (if (or (null W) (<= W 0.0)) (setq W 600.0))

  (setq D (getreal "\nCarcass DEPTH at the TOP [mm] (the wall unit's) <400>: "))
  (if (or (null D) (<= D 0.0)) (setq D 400.0))

  ;; T78 proposed, owner to confirm: hoodCanopy.defaults.height 500
  (setq Hc (getreal "\nCanopy HEIGHT [mm] <500>: "))
  (if (or (null Hc) (<= Hc 0.0)) (setq Hc 500.0))

  ;; T78 proposed, owner to confirm: hoodCanopy.defaults.bottomProjectionMm 150
  (setq P (getreal "\nBottom PROJECTION beyond the top depth [mm] <150>: "))
  (if (or (null P) (< P 0.0)) (setq P 150.0))

  (setq unitNum (getstring T "\nUnit NUMBER (e.g. HD01): "))
  (if (= unitNum "") (setq unitNum "HD01"))

  (setq pt (getpoint "\nInsertion point: "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))

  (setq x0 (car pt) y0 (cadr pt))

  ;; === THE NUMBERS DERIVED (section 3) ===
  (setq sideW (- D G))
  (setq alpha (atan P Hc))
  (setq alphaDeg (/ (* alpha 180.0) pi))
  (setq tanA (/ (sin alpha) (cos alpha)))
  (setq L (sqrt (+ (* Hc Hc) (* P P))))
  (setq Lblank (+ L (* frontT tanA)))
  (setq szerTOP (- W (* 2.0 G)) wysTOP (- D G))
  (setq szerBACK W)

  ;; === LAYERS ===
  (createViewLayers)

  ;;;========================================
  ;;; PLAN (section 5): the wall at y0 + D, the carcass front at y0, the bottom's
  ;;; front edge P beyond it at y0 - P
  ;;;========================================
  (drawRect "CARCASE" x0 y0 (+ x0 W) (+ y0 D))
  (drawRect "CARCASE" x0 y0 (+ x0 G) (- (+ y0 D) G))
  (drawRect "CARCASE" (- (+ x0 W) G) y0 (+ x0 W) (- (+ y0 D) G))
  (drawRect "CARCASE" x0 (- (+ y0 D) G) (+ x0 W) (+ y0 D))
  ;; the deeper bottom and the sloped front, seen from above: the outline W x (D + P)
  (drawRect "DOORS" x0 (- y0 P) (+ x0 W) y0)
  (drawText "UNIT_NUMBER" (+ x0 (/ W 2.0)) (+ y0 (/ D 2.0)) 30.0 unitNum)
  (drawText "UNIT_NUMBER" (+ x0 (/ W 2.0)) (- y0 (/ P 2.0)) 20.0
    (strcat "canopy: bottom +" (rtos P 2 0) ", slope " (rtos alphaDeg 2 1) " deg"))
  (drawDimH x0 (+ x0 W) (+ y0 D))

  ;;;========================================
  ;;; SIDE VIEW (section 5): the trapezoid, from the left. x along the depth from
  ;;; the FRONT (the bottom front corner), y up.
  ;;;========================================
  (setq sideY (+ y0 D 400.0))
  (makePolyline "CARCASE" (list
    (list x0 sideY)
    (list (+ x0 D P) sideY)
    (list (+ x0 D P) (+ sideY Hc))
    (list (+ x0 P) (+ sideY Hc))))
  ;; the back panel and the top board, seen from the side
  (drawRect "CARCASE" (+ x0 P sideW) sideY (+ x0 D P) (+ sideY Hc))
  (drawRect "CARCASE" (+ x0 P) (+ sideY Hc (- G)) (+ x0 P sideW) (+ sideY Hc))
  ;; the bottom board, D - G + P deep, G thick
  (drawRect "CARCASE" x0 sideY (+ x0 D P (- G)) (+ sideY G))
  ;; the sloped front, frontT thick, lying on the slanted edge
  (drawLine "DOORS" (+ x0 P) (+ sideY Hc) x0 sideY)
  (drawLine "DOORS" (+ x0 P (- (* frontT (cos alpha)))) (+ sideY Hc (* frontT (sin alpha)))
                    (- x0 (* frontT (cos alpha))) (+ sideY (* frontT (sin alpha))))
  (drawText "UNIT_NUMBER" (+ x0 (/ (+ D P) 2.0)) (+ sideY (/ Hc 2.0)) 30.0 (strcat unitNum " SIDE"))
  (drawText "UNIT_NUMBER" (+ x0 (/ (+ D P) 2.0)) (+ sideY (/ Hc 2.0) -50.0) 20.0
    (strcat "P " (rtos P 2 0) "  Hc " (rtos Hc 2 0) "  alpha " (rtos alphaDeg 2 1) " deg  L " (rtos L 2 1)))
  (drawDimH x0 (+ x0 D P) (+ sideY Hc))

  ;;;========================================
  ;;; FRONT VIEW (section 5): W x Hc, no door
  ;;;========================================
  (setq frontY (+ sideY Hc 400.0))
  (drawFrontCarcase x0 frontY W Hc G)
  (drawText "UNIT_NUMBER" (+ x0 (/ W 2.0)) (+ frontY (/ Hc 2.0)) 30.0 unitNum)
  (drawDimHFront x0 (+ x0 W) frontY)

  ;;;========================================
  ;;; CNC PANELS (section 4) - optional
  ;;;========================================
  (setq drawCNC (getstring "\nDraw CNC panels? [Y/N] <N>: "))
  (if (= drawCNC "") (setq drawCNC "N"))
  (setq drawCNC (strcase drawCNC))
  (if (= drawCNC "Y")
    (progn
      (createCNCLayers)
      (command "._LAYER" "_N" "HANGER_HOLE" "_C" "4" "HANGER_HOLE" "")
      (setq cncPt (getpoint "\nClick insertion point for CNC panels: "))
      (if (null cncPt)
        (princ "\nNo point selected. CNC cancelled.")
        (progn
          (setq cncX (car cncPt))
          (setq cncY (cadr cncPt))
          (setq odstep 50.0)
          ;; 4.1 BUL, the trapezoid, hangers at the back
          (HC:drawSide cncX cncY sideW Hc P G unitNum "L")
          (setq cncX (+ cncX sideW P odstep))
          ;; 4.1 BUR, mirrored
          (HC:drawSide cncX cncY sideW Hc P G unitNum "R")
          (setq cncX (+ cncX sideW P odstep))
          ;; 4.2 TOP, the parent's
          (drawTOP_ROT90 cncX cncY wysTOP szerTOP unitNum G)
          (setq cncX (+ cncX wysTOP odstep))
          ;; 4.3 BOTTOM, deeper by P at the front
          (HC:drawBottom cncX cncY wysTOP szerTOP P unitNum G)
          (setq cncX (+ cncX wysTOP P odstep))
          ;; 4.4 BACK + KIT_WUD's hanger cut-outs
          (drawBACK cncX cncY szerBACK Hc unitNum G)
          (drawRect "HANGER_HOLE" cncX (+ cncY Hc -58.0) (+ cncX 30.0) (+ cncY Hc))
          (drawRect "HANGER_HOLE" (+ cncX szerBACK -30.0) (+ cncY Hc -58.0) (+ cncX szerBACK) (+ cncY Hc))
          (setq cncX (+ cncX szerBACK odstep 100.0))
          ;; 4.5 the sloped FRONT, a plain blank
          (HC:drawFront cncX cncY W Lblank alphaDeg unitNum)
          (setq cncX (+ cncX W odstep))

          ;;;========================================
          ;;; SUMMARY TEXT BLOCK
          ;;;========================================
          (setq sumX (+ cncX 500.0))
          (setq sumY (+ cncY Hc))
          (setq lineH 30.0)
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "UNIT: " unitNum " (HOOD CANOPY)"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "1. BUL: " (rtos (+ sideW P) 2 0) " x " (rtos Hc 2 0) " trapezoid, top depth " (rtos sideW 2 0)))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "2. BUR: " (rtos (+ sideW P) 2 0) " x " (rtos Hc 2 0) " trapezoid, top depth " (rtos sideW 2 0)))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "3. TOP: " (rtos szerTOP 2 0) " x " (rtos wysTOP 2 0)))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "4. BOTTOM: " (rtos szerTOP 2 0) " x " (rtos (+ wysTOP P) 2 0) " (deeper by " (rtos P 2 0) ")"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "5. BACK: " (rtos szerBACK 2 0) " x " (rtos Hc 2 0) " + hangers"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "6. CANOPY FRONT: " (rtos W 2 0) " x " (rtos Lblank 2 1) " x " (rtos frontT 2 0) " front material, bevels " (rtos alphaDeg 2 1) " deg"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "EXTRACTOR: a BOM line and a body, no hole (T78 LAWS)")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "CLEARANCE over the hob: Check #34, induction 650 / gas 750, proposed, never a block")
          (princ "\nCNC panels drawn.")))))

  ;; Restore state
  (setvar "CLAYER" _oldClayer)
  (setvar "OSMODE" _oldOsmode)
  (setvar "CMDECHO" _oldCmdecho)
  (setq *error* _olderr)
  (princ (strcat "\nWUD_HOOD_CANOPY " unitNum " done: W " (rtos W 2 0) " D " (rtos D 2 0) " +" (rtos P 2 0)
                 " Hc " (rtos Hc 2 0) " slope " (rtos alphaDeg 2 1) " deg"))
  (princ))

(princ "\nKIT_WUD_HOOD_CANOPY.lsp loaded. Command: WUD_HOOD_CANOPY")
(princ)
