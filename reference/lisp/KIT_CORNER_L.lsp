;;;========================================
;;; KIT_CORNER_L.lsp
;;; The TRUE L corner carcass - PLAN view + CNC panels + labels CSV
;;; Command: CORNER_L_FULL
;;; Turn 75 (CLAUDE.md PART A, F4) - LISP FIRST
;;; Turn 78 (CLAUDE.md PART A, F4) - the L boards drawn TURNED 90 (section 10)
;;; Derived from: KIT_BUD_FULL.lsp + SKYLON_COMMON.lsp
;;; Requires: SKYLON_COMMON.lsp loaded first
;;;========================================
;;;
;;; THE OWNER'S LAW, recorded 23.09.2026 (Petros, list 11, the L-shaped corner
;;; wardrobe), and it is the whole reason this file exists:
;;;
;;;   "one L-shaped board cut on the CNC, flat-face door overlap,
;;;    no 45 degree cuts."
;;;
;;; ...and the two orders of 9.10.2026 that put it in this turn:
;;;
;;;   "daj od razu narozniki przemyslane"
;;;   "lisp najpierw"
;;;
;;; T30's corner unit cut the L floor and the L top as TWO rectangles each and
;;; drilled nothing. That contradicts the law above, and this file replaces it:
;;; the TOP and the BOTTOM are each ONE L outline, the sides and the backs are
;;; KIT_BUD's own boards with KIT_BUD's own puzzle joints, and the engine's L
;;; builder (src/engine/cabinet.js) follows this file line for line.
;;;
;;; This is a NEW FILE. It touches no other kit. drawBUL, drawBUR, drawBACK,
;;; drawRect, drawCircle, makePolyline, SKY:tabCentres and
;;; calcHingePositionsTall are COMMON's own and are CALLED, never copied.
;;;
;;;========================================
;;; 1. THE FRAME
;;;========================================
;;;
;;;   ORIGIN   the ROOM CORNER: the point where wall A meets wall B, at floor
;;;            level under the carcass (the bottom face of BOTTOM-L is z = 0).
;;;   x        along WALL A, the unit's own wall, away from the corner.
;;;   y        along WALL B, the adjacent wall, OUT from wall A into the room.
;;;   z        up.
;;;
;;; Seen from above, wall A is the line y = 0 and wall B the line x = 0:
;;;
;;;      y
;;;      ^
;;;    D +--+--------+                     arm A: x 0..W, y 0..d
;;;      |  | SIDE-B |                     arm B: x 0..d, y 0..D
;;;      |  +--------+                     the BITE is the open quadrant
;;;      |  |        |                     x > d and y > d; its corner (d, d)
;;;      |BB| arm B  |      (bite)         is the L's INNER corner, the one
;;;      |  |        |                     re-entrant vertex of the outline
;;;    d +  |        +-----------------+
;;;      |  |                  arm A |S|   BB = BACK-B, on wall B (x = 0)
;;;      |  |                        |A|   SA = SIDE-A, at x = W
;;;    G +--+------------------------+-+
;;;      |           BACK-A            |   on wall A (y = 0)
;;;    0 +-----------------------------+--> x
;;;      0  G        d                 W
;;;
;;; THE ENGINE'S BOX FRAME, for the mirror: src/engine/cabinet.js states a
;;; panel box as {x, y, z} with y UP and z the DEPTH from the back. So
;;;
;;;   engine box.x = this file's x      engine box.z = this file's y
;;;   engine box.y = this file's z      (T30's block already used it so)
;;;
;;;========================================
;;; 2. THE INPUTS
;;;========================================
;;;
;;;   W   outer width along wall A, room corner to SIDE-A's outer face
;;;   D   outer width along wall B, room corner to SIDE-B's outer face
;;;   d   the ARM DEPTH, wall face to the carcass front, the same on both
;;;       arms (KIT_BUD's glSzafki: the back is inside it)
;;;   H   carcass height (KIT_BUD's wysSzafki), legs not included
;;;   G   board thickness (KIT_BUD's gruboscPlyty). G is ALSO the thickness
;;;       BACK-A occupies off wall A, which is why BACK-B is D - G long: it
;;;       starts on BACK-A's inner face.
;;;
;;; An L needs both arms to reach past the corner square: W > d + G and
;;; D > d + G, or there is no front of its own on that arm and it is not an L.
;;; The command refuses it in words (CL:validP).
;;;
;;;========================================
;;; 3. THE BOARDS, AND WHERE EACH ONE SITS
;;;========================================
;;;
;;; Seven boards and the shelves. Every board below is G thick.
;;;
;;;   BACK-A    W x H.          x 0..W,      y 0..G,      z 0..H
;;;             On wall A, full face, exactly KIT_BUD's BACK at width W:
;;;             drawBACK, sockets on all four edges, hole for hole.
;;;   BACK-B    (D - G) x H.    x 0..G,      y G..D,      z 0..H
;;;             On wall B. Its corner end BUTTS BACK-A's inner face at
;;;             y = G and carries TABS through BACK-A, exactly as a KIT_BUD
;;;             side's back edge carries tabs through the KIT_BUD back; BACK-A
;;;             takes them in its own edge sockets and is screwed into BACK-B's
;;;             edge on COMMON's back screw row (drawBACK's edge row, at the
;;;             axis G/2). Its far end, top and bottom are BACK edges: sockets.
;;;   SIDE-A    (d - G) x H.    x W-G..W,    y G..d,      z 0..H
;;;             KIT_BUD's BUL for a carcass d deep: drawBUL. Seen from the
;;;             front of arm A (looking at wall A, -y) it is the LEFT side.
;;;   SIDE-B    (d - G) x H.    x G..d,      y D-G..D,    z 0..H
;;;             KIT_BUD's BUR for a carcass d deep: drawBUR. Seen from the
;;;             front of arm B (looking at wall B, -x) it is the RIGHT side.
;;;   TOP-L     ONE L, (W - 2G) x (D - 2G) overall, arms (d - G) deep.
;;;             z H-G..H
;;;   BOTTOM-L  the same L.     z 0..G (the carcass stands on its legs)
;;;   SHELF-L   ONE L, n of them, the profile's shelf clearances.
;;;
;;; THE TOP AND THE BOTTOM SIT EXACTLY AS KIT_BUD's TOP SITS: BETWEEN THE SIDES
;;; AND IN FRONT OF THE BACKS. In numbers:
;;;
;;;   arm A   x from G     (BACK-B's inner face)  to W - G (SIDE-A's inner face)
;;;           y from G     (BACK-A's inner face)  to d     (the front, flush
;;;                                                        with the sides' front)
;;;   arm B   y from G     (BACK-A's inner face)  to D - G (SIDE-B's inner face)
;;;           x from G     (BACK-B's inner face)  to d     (the front)
;;;
;;; So the L's own origin is the room point (G, G), its two back edges lie on
;;; the two backs' inner faces, its two END edges on the two sides' inner faces,
;;; and its arm depth is d - G, which is KIT_BUD's wysTOP (glSzafki - G) for a
;;; carcass d deep. At the defaults (W 900, D 900, d 558, G 18): x 18..882,
;;; y 18..882, arms 540 deep, the bite at room (558, 558).
;;;
;;; THE SHELF sits as KIT_BUD's shelf sits: flush on the BACKS (0 off BACK-A
;;; and BACK-B), 2 mm off each SIDE (carcass.shelfWidthClearance 4, half a
;;; side), and 20 back from each FRONT (carcass.shelfDepthClearance). Its arm
;;; depth is d - G - 20, KIT_BUD's wysSHELF. It rests on KIT_BUD's own pin
;;; columns in SIDE-A and SIDE-B (drawBUL / drawBUR with numShelves); the backs
;;; carry no pin rows, because no kit in this folder drills a back for a pin.
;;;
;;;========================================
;;; 4. THE JOINTS: KIT_BUD's OWN
;;;========================================
;;;
;;;   SIDE-A -> BACK-A   SIDE-A's back edge tabs (tabCentres H) into BACK-A's
;;;                      edge sockets at x = W. drawBUL + drawBACK, as KIT_BUD.
;;;   SIDE-B -> BACK-B   SIDE-B's back edge tabs into BACK-B's far-end sockets
;;;                      (y = D). drawBUR, and BACK-B's own far end below.
;;;   BACK-B -> BACK-A   BACK-B's corner-end tabs (tabCentres H) into BACK-A's
;;;                      edge sockets at x = 0, screwed on BACK-A's edge row.
;;;   TOP-L / BOTTOM-L   tabs on FOUR edges, the KIT_BUD tab and its dog bone:
;;;      -> BACK-A       its back edge on wall A, run W - 2G, tabs at
;;;                      socketCentres(W - 2G); BACK-A's top/bottom sockets sit
;;;                      at G + the same, which is drawBACK's own t1x / t2x.
;;;      -> SIDE-A       its arm A end, run d - G, tabs at socketCentres(d - G)
;;;                      with the CABINET's resolved inset (d); SIDE-A's
;;;                      top/bottom sockets are drawBUL's own (95, szer - 95).
;;;      -> SIDE-B       its arm B end, the same run and the same centres.
;;;      -> BACK-B       its back edge on wall B, run D - 2G, tabs at
;;;                      socketCentres(D - 2G); BACK-B's top/bottom sockets sit
;;;                      at the same centres from its corner end.
;;;   THE L's INNER EDGES - the two fronts and the inner corner - CARRY NO JOINT.
;;;
;;; THE DOG-BONE RELIEF AT THE INNER CORNER. The L's one re-entrant vertex is
;;; the inner corner (d, d). A round cutter profiling the board from the bite
;;; cannot reach it and leaves a fillet of its own radius standing in the
;;; corner. The relief is the house dog bone: a CIRCLE of the cutter's radius
;;; on PUZZLE_DOG_BONES, its centre on the bisector of the bite, r / sqrt 2 off
;;; the vertex in both x and y, so its edge passes exactly through the vertex
;;; and the corner comes out square. It opens a scallop r(1 - 1/sqrt 2) deep
;;; (1.17 at r 4) and r sqrt 2 long (5.66) on each front edge at the corner,
;;; which the banding bridges. ONE OUTLINE LAW for every L board: TOP-L,
;;; BOTTOM-L and SHELF-L all take it (CL:innerRelief).
;;;
;;; THE CUTTER RADIUS is the one cutter number the engine owns:
;;; profile.cnc.toolDiameter 8, so r = 4 (engine/cnc/rollover.js toolRadius,
;;; the radius every internal corner is filleted at). SKYLON_COMMON states no
;;; cutter at all. NAMED FOR THE OWNER: the profile's puzzle note says the
;;; workshop profiles on a 12.7 (half inch) bit since 12.08.2026; if that is
;;; the bit this outline is cut with, r is 6.35 and the ONE line that moves is
;;; "cnc.toolDiameter" in CL:profile below.
;;;
;;;========================================
;;; 5. TWO NUMBERS THE REPO'S COMMON STILL DRAWS OLD
;;;========================================
;;;
;;; drawBUL, drawBUR, drawBACK and drawTOP_ROT90 in this folder's
;;; SKYLON_COMMON.lsp still draw the tab SHOULDER at 10.5 and the socket/screw
;;; AXIS at G/2 + 0.5. The engine's profile moved both, by name:
;;;
;;;   puzzle.shoulderDepth 13     the owner, 12.08.2026, for the 12.7 cutter
;;;                               ("both LISPs and this line: change together")
;;;   axis G / 2                  turn 24, centrelineExtra is gone ("it is
;;;                               wrong, and it skewed the whole calculation")
;;;
;;; Existing LISP is untouched this turn, so the boards this file draws BY
;;; CALLING COMMON (SIDE-A, SIDE-B, BACK-A) carry COMMON's numbers exactly as
;;; KIT_BUD's do, and the engine reaches them through the same two named deltas
;;; it applies to every KIT_BUD board. The boards this file draws WITH ITS OWN
;;; CODE (TOP-L, BOTTOM-L, BACK-B) are drawn to the profile's CURRENT numbers,
;;; read from CL:profile below, so the engine mirrors them with no delta.
;;; Neither moves a socket CENTRE, a tab CENTRE, an outline corner or a leg,
;;; so the NUMBERS block at the end is the same under both.
;;;
;;; And one more, for completeness: COMMON's drawBUL/drawBUR/drawBACK always
;;; cut THREE tabs (95, H/2, H - 95), while SKY:tabCentres carries the owner's
;;; 600 / 300 switch (turn 52). BACK-B here uses SKY:tabCentres, the engine's
;;; law. At every default height of this kit (770, 720, 2150) both give three
;;; at the same centres, so nothing differs at any default.
;;;
;;;========================================
;;; 6. LEGS (base and wardrobe versions)
;;;========================================
;;;
;;; SIX, one near each vertex of the L: the room corner, the two far back
;;; corners (at SIDE-A and SIDE-B, against the walls), the two FRONT ENDS of
;;; the arms, and the INNER CORNER. Each is KIT_BUD's 78 x 78 leg (drawLegPair
;;; legW), set in by the engine's own leg law (src/engine/legs.js legLayout,
;;; profile.legs): G from a SIDE's outer face, 50 off a WALL, 50 + 78 off a
;;; FRONT. At the room corner BOTH edges are walls, so it is 50 off each (it
;;; clears the skirting on both); at the inner corner BOTH edges are fronts,
;;; so it is 128 back from each. The three front legs (L3, L4, L5) are the
;;; ones the plinth clips to (legs.js frontLegPositions, the owner's rule).
;;;
;;; THE LEG PLATE DRILLING IS KIT_BUD's, AND KIT_BUD's IS NONE. SKYLON_COMMON
;;; draws a leg PAIR in the elevation (drawLegPair) and no CNC section of any
;;; kit drills a leg hole; src/engine/legs.js says the same ("it emits no
;;; holes"). So BOTTOM-L carries no leg holes, which is KIT_BUD hole for hole.
;;; The engine's centre-leg rule (a fifth leg over 1000 wide) is not applied
;;; per arm here: the owner's count for this kit is six.
;;;
;;;========================================
;;; 7. THE THREE VERSIONS
;;;========================================
;;;
;;;   B  BASE      CORNER_L_BASE, prefix CL. Six legs. Defaults W 900, D 900,
;;;                d 558 (baseUnit depth), H 770 (KIT_BUD).
;;;   W  WALL      CORNER_L_WALL, prefix CW. No legs. KIT_WUD's hangers at the
;;;                FAR END of each arm: two holes in SIDE-A and in SIDE-B
;;;                (21 and 53 from the back edge, 53 from the top, 5 mm) and
;;;                the 30 x 58 HANGER_HOLE cut-out in the far top corner of
;;;                BACK-A (at x = W) and of BACK-B (at y = D). The room-corner
;;;                end has no side for a hanger to screw to, so it carries none:
;;;                it is held by BACK-B's tabs and BACK-A's screw row. Defaults
;;;                W 600, D 600, d 400, H 720 (KIT_WUD).
;;;   X  WARDROBE  CORNER_L_WARDROBE, prefix CX. These same boards at the
;;;                wardrobe's depth and height, on the base version's six legs,
;;;                hinge rows calcHingePositionsTall. Defaults W 1000, D 1000,
;;;                d 568 (the engine's wardrobe.defaults.depth; KIT_WARDROBE's
;;;                own prompt says 578), H 2150. THE RAILS ARE NOT IN THIS
;;;                FILE: they are KIT_WARDROBE_FULL's (one screw on each side
;;;                at its depth centre), and an arm's rail has a side at its
;;;                far end only. One rail per arm, both at the depth centre and
;;;                the same height, CROSS at room ((d + G)/2, (d + G)/2): which
;;;                one stops, and on what, is the engine's question, named.
;;;
;;; Every default above is "T75 proposed, owner to confirm" (CLAUDE.md F4).
;;;
;;;========================================
;;; 8. WHAT IS NOT IN THIS FILE
;;;========================================
;;;
;;; THE DOORS. They go through the engine's EXISTING door path, one per arm
;;; (the FRONTS boundary, CLAUDE.md). For the record, the law they follow:
;;;
;;; THE BI-FOLD PAIR (the default since 15.10.2026; the owner: "l corner moja
;;; propozycja to otwieranie drzwiczek razem, czyli drzwiczki polaczone ze
;;; soba zawiasami"): door A hangs on SIDE-A (its hinge plate rows are on
;;; SIDE-A here, KIT_BUD's BUL list) and runs to the inner corner with ZERO
;;; clearance on its inner edge; door B hangs on DOOR A's free edge with Blum's
;;; CLIP top 60 degree bi-fold corner hinge (reference/hardware/blum-hinges.json
;;; families.bifold, catalogue p. 116, owner to confirm), its hinge edge its
;;; INNER edge, and stands one door gap (3) off door A's face: its inner edge
;;; stops front_t + 1.5 x gap beyond the inner corner line. SIDE-B carries no
;;; plate. ONE HANDLE, on door B's free end: door A is carried and takes no
;;; handle and no handle hole. Door A keeps the door's own hinge (the standard
;;; 155 on a front to 24 mm, the 110 on the 25 mm shaker, where Blum's 155 and
;;; 170 stop at 24 and 21; the catalogue pairs the bi-fold hinge with the 155
;;; or 170, so the engine says so on a 110, owner to confirm). The pair opens
;;; as one: door B folds toward door A's face by the bi-fold hinge's 60.
;;;
;;; THE PAIR OF TWO CARCASS-HUNG LEAVES (corner_doors null, the panel's
;;; "Pair"): door A as above, covered (neighbour kind CORNER_COVERED = 0);
;;; door B hangs on SIDE-B (KIT_BUD's BUR list) and its inner edge stops
;;; gap + front_t + clearance.corner beyond the inner corner line, so its end
;;; CLEARS door A's face by clearance.corner (3): door A stands `gap` off the
;;; carcass, and T75's "front_t + clearance.corner" left door B's end ON
;;; door A's face (amended 15.10.2026, the owner: the leaves must shorten with
;;; the front). FLAT-FACE OVERLAP, NO 45 DEGREE CUTS: door B overlaps door A
;;; and DOOR B OPENS FIRST. B is the arm on the ADJACENT wall
;;; (profile.corner.overlap 'adjacent', T75 proposed).
;;;
;;; A THICKER FRONT SHORTENS DOOR B in both pairs: front_t is in its trim, so
;;; a 40 mm front takes 15 off door B against a 25 mm one, never off door A.
;;;
;;; THE PLINTH, THE WORKTOP, THE CORNICE, THE TOP INFILL. They are the run's
;;; auto-parts (CLAUDE.md F5, F6), not this kit's boards.
;;;
;;; THE FRONT ELEVATIONS. The plan below shows the carcass; the two faces are
;;; drawn by the engine's T71 drawing set.
;;;
;;;========================================
;;; 9. THE NUMBERS  (the assertion; computed, then written down)
;;;========================================
;;;
;;; BASE DEFAULTS: W 900, D 900, d 558, H 770, G 18. r = 4 (toolDiameter 8).
;;; Every outline is CCW, in its board's OWN frame, nominal (tabs listed apart).
;;;
;;; TOP-L (and BOTTOM-L, the same board)
;;;   frame       plan: local (X, Y) = (room x - 18, room y - 18)
;;;   outline     (0 0) (864 0) (864 540) (540 540) (540 864) (0 864)
;;;   bounding    864 x 864, arm depth 540, inner corner (540 540)
;;;   area        641520 mm2 (0.642 m2), front edges 324 + 324 = 648
;;;   tabs        edge (0 0)->(864 0)      to BACK-A   at X 95, 769   (8 total)
;;;               edge (864 0)->(864 540)  to SIDE-A   at Y 95, 445
;;;               edge (540 864)->(0 864)  to SIDE-B   at X 445, 95
;;;               edge (0 864)->(0 0)      to BACK-B   at Y 769, 95
;;;               fronts (864 540)->(540 540)->(540 864): plain
;;;   first tab   (70 0) (76 0) (76 -13) (70 -13) (70 -18) (120 -18)
;;;               (120 -13) (114 -13) (114 0) (120 0)   [shoulder 13]
;;;   points      86 = 6 vertices + 8 tabs x 10
;;;   dog bones   8 rects (x1 y1 x2 y2): (65 -18 125 0) (739 -18 799 0)
;;;               (864 65 882 125) (864 415 882 475) (415 864 475 882)
;;;               (65 864 125 882) (-18 739 0 799) (-18 65 0 125)
;;;   relief      circle r 4 at (542.8284 542.8284); room (560.8284 560.8284)
;;;
;;; SHELF-L
;;;   frame       plan: local (X, Y) = (room x - 18, room y - 18)
;;;   outline     (0 0) (862 0) (862 520) (520 520) (520 862) (0 862)
;;;   bounding    862 x 862, arm depth 520 (KIT_BUD wysSHELF 558 - 18 - 20)
;;;   area        626080 mm2, front edges 342 + 342 = 684
;;;   relief      circle r 4 at (522.8284 522.8284)
;;;
;;; BACK-A   900 x 770, drawBACK. Frame local X = room x (0 at the room corner).
;;;   edge sockets (both ends)  Y 95, 385, 675
;;;   top/bottom sockets        X 113, 787   (= 18 + socketCentres 864)
;;;   edge screws               Y 50, 240, 530, 720 at X 9 and 891
;;;   top/bottom screws         X 68, 450, 832 at Y 761 and 9
;;;                             (the profile's axis G/2; COMMON's drawBACK
;;;                             draws these and its socket pockets on the old
;;;                             G/2 + 0.5, section 5: X 9.5 / 890.5, Y 760.5 /
;;;                             9.5. The CENTRES above do not move.)
;;;
;;; BACK-B   882 x 770. Frame local X = room y - 18 (0 on BACK-A's face).
;;;   outline     (0 0) (882 0) (882 770) (0 770), then the corner-end tabs
;;;               down X = 0 at Y 675, 385, 95, standing to X = -18
;;;   first tab   (0 700) (0 694) (-13 694) (-13 700) (-18 700) (-18 650)
;;;               (-13 650) (-13 656) (0 656) (0 650)
;;;   points      34 = 4 + 3 x 10
;;;   dog bones   (-18 645 0 705) (-18 355 0 415) (-18 65 0 125)
;;;   far-end sockets (SIDE-B)  X 873..888 at Y 95, 385, 675 (+- 25.5)
;;;                             holes X 874, Y c +- 24.5, dia 7.5
;;;   top/bottom sockets        X 95, 769 (socketCentres 864, from X = 0)
;;;                             pockets Y 761..776 and -6..9
;;;                             holes Y 762 and 8, X c +- 24.5
;;;   far-end screws            X 873, Y 50, 240, 530, 720
;;;   top/bottom screws         X 50, 432, 814 at Y 761 and 9
;;;
;;; SIDE-A   540 x 770, drawBUL. SIDE-B 540 x 770, drawBUR.
;;;   back-edge tabs            Y 95, 385, 675
;;;   top/bottom sockets        X 95, 445 (socketCentres 540, inset 95)
;;;   hinge plate rows          670, 470, 100 (KIT_BUD), pairs at +- 16,
;;;                             37 from the front edge
;;;
;;; LEGS  78 x 78, min corner in ROOM (x y):
;;;   L1 (50 50)    room corner             back
;;;   L2 (804 50)   SIDE-A, at wall A       back
;;;   L3 (804 430)  SIDE-A, front end       front
;;;   L4 (430 430)  the inner corner        front
;;;   L5 (430 804)  SIDE-B, front end       front
;;;   L6 (50 804)   SIDE-B, at wall B       back
;;;
;;; CARCASS m2 (no shelves): 3.487  (2 x 540 x 770 + 2 x 641520
;;;                                  + 900 x 770 + 882 x 770)
;;;
;;; WALL DEFAULTS (W 600, D 600, d 400, H 720): TOP-L 564 x 564, arms 382,
;;;   outline (0 0) (564 0) (564 382) (382 382) (382 564) (0 564),
;;;   area 284972, tabs at 95/469 (backs) and 95/287 (ends), relief
;;;   (384.8284 384.8284); SHELF-L 562 x 562, arms 362, area 275844;
;;;   BACK-B 582 x 720, tabs Y 95, 360, 625; sides 382 x 720; no legs.
;;;   HANGERS: BACK-A HANGER_HOLE (570 662 600 720), BACK-B (552 662 582
;;;   720), each at its far top corner; SIDE-A (drawBUL frame) holes at
;;;   (361 667) and (329 667), SIDE-B (drawBUR frame) at (21 667) and
;;;   (53 667), dia 5.
;;; WARDROBE DEFAULTS (W 1000, D 1000, d 568, H 2150): TOP-L 964 x 964, arms
;;;   550, area 757900, tabs 95/869 and 95/455, relief (552.8284 552.8284);
;;;   BACK-B 982 x 2150, tabs Y 95, 1075, 2055; sides 550 x 2150; legs
;;;   L1 (50 50) L2 (904 50) L3 (904 440) L4 (440 440) L5 (440 904)
;;;   L6 (50 904); hinge rows calcHingePositionsTall 2150 =
;;;   100, 490, 880, 1270, 1660, 2050.
;;;
;;;========================================

;;;========================================
;;; 10. THE GRAIN OF THE L BOARDS (T78 F4, LISP FIRST)
;;;========================================
;;;
;;; THE OWNER, 11.10.2026, on the eye-test of T75 to T77:
;;;
;;;   "na L polkach odwroc na CNC i na wizualizacji sloje o 90 stopni"
;;;
;;; Every board in the CNC section is nested with the GRAIN RUNNING UP THE
;;; DRAWING (+Y). T75 drew TOP-L, BOTTOM-L and SHELF-L in their PLAN frame
;;; (section 1: X along wall A, Y along wall B), so the figure of all three
;;; ran along WALL B, across the figure of the KIT_BUD shelves and tops
;;; standing beside the L on wall A (drawTOP_ROT90 and drawSHELF both put the
;;; cabinet's WIDTH up the page). The probe (T78 F4) found the three boards
;;; the same way, so all three turn: the owner named the shelves, and the
;;; top and the bottom are the same board laid the same way.
;;;
;;; THE TURN. CL:rot90 turns a board's own frame a quarter turn LEFT and sets
;;; it down in positive coordinates:  (x y) -> (spanY - y, x), spanY the
;;; board's span along wall B (v5's y). The wall-A span now runs UP the page
;;; and the grain with it. The board's OWN FRAME (CL:lOutline, the tabs, the
;;; dog bones, the relief, the NUMBERS of section 9) does not move a
;;; millimetre: what moves is how the CNC section PUTS IT DOWN, T17 F3's law
;;; word for word ("odwroc wszystkie polki o 90 stopni w CNC": the placement
;;; turns, the part does not). drawCL_LBOARD stays as it is; drawCL_LBOARD_ROT90
;;; is the same board through the one turn, and the command calls it for
;;; TOP-L, BOTTOM-L and every SHELF-L.
;;;
;;; THE ENGINE MIRRORS IT with the routine it already has for this very law:
;;; src/engine/cabinet.js states `grain: 'w'` on the three L boards (the
;;; T37 F7a field, in the DRAWN frame: "the drawn width goes up the sheet"),
;;; engine/cnc/layout.js sheetTurn answers 90, turnPoint(x, y, 90) = (-y, x)
;;; is CL:rot90Pt before the shift, and the nest's shift by -minX is the
;;; + spanY. sheetLay then says axis 'w', decors.js grainRun paints the
;;; figure along wall A in the 3D, the nest DXF turns the blank. One change,
;;; three readers. The CSV below does not change: it carries no grain
;;; column, and SZER x WYS is the board's bounding size either way.
;;;
;;; Worked, BASE defaults: SHELF-L nominal (0 0) (862 0) (862 520) (520 520)
;;; (520 862) (0 862) turns to (862 0) (862 862) (342 862) (342 520) (0 520)
;;; (0 0): the back edge on wall A (v0 -> v1) now runs up X = 862, the arm A
;;; end (v1 -> v2) is the top edge, the bite sits at the upper left, the
;;; relief circle lands at (862 - 522.8284, 522.8284) = (339.1716 522.8284).
;;; TOP-L (tabs standing G proud on both axes) is laid G in on both axes as
;;; before; the across-the-page advance is spanY + G + odstep, not spanX.
;;;
;;;========================================

;;; Auto-load COMMON if not already loaded
(if (null drawRect) (load "SKYLON_COMMON"))

;;;========================================
;;; A. THE PROFILE NUMBERS THIS FILE READS
;;;========================================
;;;
;;; Keyed by their PATH in src/engine/profile.js, so a test can hold the two
;;; to each other by name. Every number here is already the profile's; this
;;; file adds none. (An array index is the last path part: fromBackEdge.0.)

(defun CL:profile ( / )
  '(("puzzle.tabCentresFromEnd" . 95.0)
    ("puzzle.tabHalfOpening" . 19.0)
    ("puzzle.tabHalfWidth" . 25.0)
    ("puzzle.shoulderDepth" . 13.0)
    ("puzzle.dogboneHalfHeight" . 30.0)
    ("puzzle.socketHalfWidth" . 25.5)
    ("puzzle.socketOvershoot" . 6.0)
    ("puzzle.socketHoleOffset" . 24.5)
    ("puzzle.socketHoleDiameter" . 7.5)
    ("puzzle.socketHoleInset" . 1.0)
    ("puzzle.singleSocketBelow" . 264.5)
    ("puzzle.singleJointMaxDepth" . 300.0)
    ("puzzle.middleTabBelow" . 600.0)
    ("puzzle.singleTabAtOrBelow" . 300.0)
    ("puzzle.screwDiameter" . 3.0)
    ("puzzle.screwFromEnd" . 50.0)
    ("carcass.shelfWidthClearance" . 4.0)
    ("carcass.shelfDepthClearance" . 20.0)
    ("legs.width" . 78.0)
    ("legs.insetFromFront" . 50.0)
    ("legs.insetFromBack" . 50.0)
    ("cnc.toolDiameter" . 8.0)
    ("wallUnit.hangers.fromBackEdge.0" . 21.0)
    ("wallUnit.hangers.fromBackEdge.1" . 53.0)
    ("wallUnit.hangers.fromTop" . 53.0)
    ("wallUnit.hangers.holeDiameter" . 5.0)
    ("wallUnit.hangers.cutoutWidth" . 30.0)
    ("wallUnit.hangers.cutoutHeight" . 58.0)))

(defun CL:p (key / hit)
  (setq hit (assoc key (CL:profile)))
  (if hit
    (cdr hit)
    (progn (princ (strcat "\nKIT_CORNER_L: no profile number " key)) 0.0)))

;;; The socket and screw AXIS: half the board (turn 24, puzzle.js `G / 2`).
(defun CL:axis (G / )
  (/ G 2.0))

;;; The cutter's radius (engine/cnc/rollover.js toolRadius).
(defun CL:cutterRadius ( / )
  (/ (CL:p "cnc.toolDiameter") 2.0))

;;;========================================
;;; B. THE SET-OUT RULES (the engine's own, stated here for the L)
;;;========================================

;;; Socket (and mating tab) centres along a run: puzzle.js socketCentres.
;;; `inset` nil is the shallow cabinet's ONE centred joint (turn 25); a run
;;; under singleSocketBelow also takes one, centred (turn 7); otherwise the
;;; pair, `inset` in from each end. Symmetric about the run's middle, so it is
;;; the same set measured from either end.
(defun CL:socketCentres (len inset / )
  (cond
    ((null inset) (list (/ len 2.0)))
    ((< len (CL:p "puzzle.singleSocketBelow")) (list (/ len 2.0)))
    (T (list inset (- len inset)))))

;;; ONE INSET PER CABINET (puzzle.js resolvedJointInset), keyed on the depth.
(defun CL:jointInset (depth / )
  (if (and (> depth 0.0) (<= depth (CL:p "puzzle.singleJointMaxDepth")))
    nil
    (CL:p "puzzle.tabCentresFromEnd")))

;;; Tab centres up a height: COMMON's own SKY:tabCentres, the owner's 600/300.
(defun CL:tabCentres (len / )
  (SKY:tabCentres len
                  (CL:p "puzzle.tabCentresFromEnd")
                  (CL:p "puzzle.singleTabAtOrBelow")
                  (CL:p "puzzle.middleTabBelow")))

;;; Is it an L at all? Both arms must reach past the corner square.
(defun CL:validP (outW outD armD G / )
  (and (> armD G)
       (> outW (+ armD G))
       (> outD (+ armD G))))

;;;========================================
;;; C. THE L OUTLINE
;;;========================================
;;;
;;; The L inset from the CARCASS footprint by: `backIn` off both walls,
;;; `sideIn` off both sides' outer faces, `frontIn` back from both fronts.
;;; Returned in the board's OWN frame, origin at its inner back corner (room
;;; point (backIn, backIn)), six vertices, CCW:
;;;
;;;   v0 (0 0)            on both backs
;;;   v1 (spanX 0)        back edge meets the arm A end
;;;   v2 (spanX arm)      arm A's front end
;;;   v3 (arm arm)        THE INNER CORNER, the one re-entrant vertex
;;;   v4 (arm spanY)      arm B's front end
;;;   v5 (0 spanY)        arm B end meets the back edge on wall B
;;;
;;;   TOP-L / BOTTOM-L    backIn G, sideIn G,      frontIn 0
;;;   SHELF-L             backIn G, sideIn G + 2,  frontIn 20
;;;   the footprint       backIn 0, sideIn 0,      frontIn 0  (the plan)

(defun CL:lOutline (outW outD armD backIn sideIn frontIn / spanX spanY arm)
  (setq spanX (- outW backIn sideIn)
        spanY (- outD backIn sideIn)
        arm   (- armD backIn frontIn))
  (list (list 0.0 0.0)
        (list spanX 0.0)
        (list spanX arm)
        (list arm arm)
        (list arm spanY)
        (list 0.0 spanY)))

;;; The shelf's L: the profile's clearances, half the width clearance a side.
(defun CL:lShelf (outW outD armD G / )
  (CL:lOutline outW outD armD G
               (+ G (/ (CL:p "carcass.shelfWidthClearance") 2.0))
               (CL:p "carcass.shelfDepthClearance")))

;;; Area by the shoelace walk (any simple polygon, either direction).
(defun CL:area (pts / n i s p q)
  (setq n (length pts) i 0 s 0.0)
  (while (< i n)
    (setq p (nth i pts)
          q (nth (rem (1+ i) n) pts))
    (setq s (+ s (- (* (car p) (cadr q)) (* (car q) (cadr p)))))
    (setq i (1+ i)))
  (/ (abs s) 2.0))

;;; The two FRONT edges of an L from CL:lOutline (v2 -> v3 -> v4): the banding.
(defun CL:lFrontLen (pts / )
  (+ (- (car (nth 2 pts)) (car (nth 3 pts)))
     (- (cadr (nth 4 pts)) (cadr (nth 3 pts)))))

;;; THE DOG-BONE RELIEF at the inner corner v3: (cx cy r). The centre is on
;;; the bisector of the bite, r / sqrt 2 off the vertex in x and in y, so the
;;; circle's edge passes through the vertex itself.
(defun CL:innerRelief (pts r / v k)
  (setq v (nth 3 pts)
        k (/ r (sqrt 2.0)))
  (list (+ (car v) k) (+ (cadr v) k) r))

;;;========================================
;;; D. THE KIT_BUD TAB, WALKED ONTO ANY EDGE
;;;========================================
;;;
;;; drawBUL, drawBUR and drawTOP_ROT90 each spell the same tab out longhand on
;;; one fixed edge. An L has edges facing four ways, so the tab is stated ONCE
;;; in the edge's own frame and walked onto the edge:
;;;
;;;   u   along the edge, from its start (ax ay) in direction (dx dy)
;;;   n   OUTWARD, (dy, -dx), which is outward on a CCW outline
;;;
;;;   (c-tw 0) (c-o 0) (c-o s) (c-tw s) (c-tw G) (c+tw G) (c+tw s) (c+o s)
;;;   (c+o 0) (c+tw 0)
;;;
;;; o = tabHalfOpening 19, tw = tabHalfWidth 25, s = shoulderDepth 13. On a
;;; bottom edge walked left to right this is puzzle.js tabPointsDown point for
;;; point, on a top edge walked right to left tabPointsUp, on a left edge
;;; walked down tabPointsLeft, on a right edge walked up tabPointsRight.
;;; `centres` are u values, ascending.

(defun CL:tabWalk (ax ay dx dy centres G / nx ny o tw s out c pt)
  (setq nx dy
        ny (- dx)
        o  (CL:p "puzzle.tabHalfOpening")
        tw (CL:p "puzzle.tabHalfWidth")
        s  (CL:p "puzzle.shoulderDepth")
        out '())
  (foreach c centres
    (foreach pt (list (list (- c tw) 0.0) (list (- c o) 0.0)
                      (list (- c o) s)    (list (- c tw) s)
                      (list (- c tw) G)   (list (+ c tw) G)
                      (list (+ c tw) s)   (list (+ c o) s)
                      (list (+ c o) 0.0)  (list (+ c tw) 0.0))
      (setq out (cons (list (+ ax (* dx (car pt)) (* nx (cadr pt)))
                            (+ ay (* dy (car pt)) (* ny (cadr pt))))
                      out))))
  (reverse out))

;;; The dog bone of each tab: u from c - 30 to c + 30, n from 0 to G, as
;;; (x1 y1 x2 y2) with x1 < x2 and y1 < y2 (puzzle.js topPanelGeometry's own).
(defun CL:tabBones (ax ay dx dy centres G / nx ny bh out c x1 y1 x2 y2)
  (setq nx dy
        ny (- dx)
        bh (CL:p "puzzle.dogboneHalfHeight")
        out '())
  (foreach c centres
    (setq x1 (+ ax (* dx (- c bh)))
          y1 (+ ay (* dy (- c bh)))
          x2 (+ ax (* dx (+ c bh)) (* nx G))
          y2 (+ ay (* dy (+ c bh)) (* ny G)))
    (setq out (cons (list (min x1 x2) (min y1 y2) (max x1 x2) (max y1 y2)) out)))
  (reverse out))

;;; A JOINT LIST is one entry per outline vertex, for the edge that LEAVES that
;;; vertex: (ax ay dx dy centres), or nil for a plain edge.

;;; The outline with its tabs, walked once round. Each vertex is written once
;;; and the polyline is closed by its flag, so no edge is in the file twice
;;; (the T25 edge-guard law).
(defun CL:walkOutline (pts joints G / out i j)
  (setq out '() i 0)
  (while (< i (length pts))
    (setq out (append out (list (nth i pts))))
    (setq j (nth i joints))
    (if j
      (setq out (append out (CL:tabWalk (nth 0 j) (nth 1 j) (nth 2 j) (nth 3 j) (nth 4 j) G))))
    (setq i (1+ i)))
  out)

(defun CL:walkBones (joints G / out j)
  (setq out '())
  (foreach j joints
    (if j
      (setq out (append out (CL:tabBones (nth 0 j) (nth 1 j) (nth 2 j) (nth 3 j) (nth 4 j) G)))))
  out)

;;;========================================
;;; E. TOP-L AND BOTTOM-L
;;;========================================

(defun CL:lTop (outW outD armD G / )
  (CL:lOutline outW outD armD G G 0.0))

;;; Four jointed edges, two plain fronts (section 4 above).
(defun CL:lTopJoints (outW outD armD G / pts spanX spanY arm e ins)
  (setq pts   (CL:lTop outW outD armD G)
        spanX (car (nth 1 pts))
        arm   (cadr (nth 2 pts))
        spanY (cadr (nth 5 pts))
        e     (CL:p "puzzle.tabCentresFromEnd")
        ins   (CL:jointInset armD))
  (list
    (list 0.0 0.0 1.0 0.0 (CL:socketCentres spanX e))      ; v0->v1 back edge, into BACK-A
    (list spanX 0.0 0.0 1.0 (CL:socketCentres arm ins))    ; v1->v2 arm A end, into SIDE-A
    nil                                                    ; v2->v3 front of arm A, plain
    nil                                                    ; v3->v4 front of arm B, plain
    (list arm spanY -1.0 0.0 (CL:socketCentres arm ins))   ; v4->v5 arm B end, into SIDE-B
    (list 0.0 spanY 0.0 -1.0 (CL:socketCentres spanY e)))) ; v5->v0 back edge, into BACK-B

(defun CL:lTopPts (outW outD armD G / )
  (CL:walkOutline (CL:lTop outW outD armD G) (CL:lTopJoints outW outD armD G) G))

(defun CL:lTopBones (outW outD armD G / )
  (CL:walkBones (CL:lTopJoints outW outD armD G) G))

;;;========================================
;;; F. BACK-B
;;;========================================
;;;
;;; Frame: local X = room y - G (0 on BACK-A's inner face, D - G at y = D),
;;; local Y = z. Its corner end is a SIDE's back edge (tabs through BACK-A);
;;; the rest of it is a BACK (drawBACK's sockets, holes and screws, at the
;;; profile's axis G / 2).

(defun CL:backBOutline (outD H G / len)
  (setq len (- outD G))
  (list (list 0.0 0.0) (list len 0.0) (list len H) (list 0.0 H)))

;;; Only the edge leaving (0 H), walked DOWN the corner end, is tabbed.
(defun CL:backBJoints (outD H G / )
  (list nil nil nil (list 0.0 H 0.0 -1.0 (CL:tabCentres H))))

(defun CL:backBPts (outD H G / )
  (CL:walkOutline (CL:backBOutline outD H G) (CL:backBJoints outD H G) G))

(defun CL:backBBones (outD H G / )
  (CL:walkBones (CL:backBJoints outD H G) G))

;;; The screw row down a BACK's edge: one in from each end and one between
;;; every pair of tabs (puzzle.js backPanelGeometry sideScrewY).
(defun CL:edgeScrewYs (H tc / sfe out i)
  (setq sfe (CL:p "puzzle.screwFromEnd")
        out (list sfe)
        i 1)
  (while (< i (length tc))
    (setq out (append out (list (/ (+ (nth (1- i) tc) (nth i tc)) 2.0))))
    (setq i (1+ i)))
  (append out (list (- H sfe))))

;;; Pockets: (layer x1 y1 x2 y2).
(defun CL:backBPockets (outD H G / len run ax ov sh out c)
  (setq len (- outD G)
        run (- outD G G)
        ax  (CL:axis G)
        ov  (CL:p "puzzle.socketOvershoot")
        sh  (CL:p "puzzle.socketHalfWidth")
        out '())
  ;; the far end: sockets for SIDE-B's back-edge tabs
  (foreach c (CL:tabCentres H)
    (setq out (cons (list "PUZZLE_SOCKET" (- len ax) (- c sh) (+ len ov) (+ c sh)) out)))
  ;; top and bottom: sockets for TOP-L / BOTTOM-L's back edge on wall B
  (foreach c (CL:socketCentres run (CL:p "puzzle.tabCentresFromEnd"))
    (setq out (cons (list "PUZZLE_SOCKET" (- c sh) (- H ax) (+ c sh) (+ H ov)) out))
    (setq out (cons (list "PUZZLE_SOCKET" (- c sh) (- ov) (+ c sh) ax) out)))
  (reverse out))

;;; Holes: (layer x y diameter).
(defun CL:backBHoles (outD H G / len run ax hi ho hd sd sfe tc out c y x)
  (setq len (- outD G)
        run (- outD G G)
        ax  (CL:axis G)
        hi  (CL:p "puzzle.socketHoleInset")
        ho  (CL:p "puzzle.socketHoleOffset")
        hd  (CL:p "puzzle.socketHoleDiameter")
        sd  (CL:p "puzzle.screwDiameter")
        sfe (CL:p "puzzle.screwFromEnd")
        tc  (CL:tabCentres H)
        out '())
  ;; far-end socket holes, 1 mm inside the pocket
  (foreach c tc
    (setq out (cons (list "PUZZLE_HOLES_7_5MM" (+ (- len ax) hi) (- c ho) hd) out))
    (setq out (cons (list "PUZZLE_HOLES_7_5MM" (+ (- len ax) hi) (+ c ho) hd) out)))
  ;; top and bottom socket holes
  (foreach c (CL:socketCentres run (CL:p "puzzle.tabCentresFromEnd"))
    (setq out (cons (list "PUZZLE_HOLES_7_5MM" (- c ho) (+ (- H ax) hi) hd) out))
    (setq out (cons (list "PUZZLE_HOLES_7_5MM" (+ c ho) (+ (- H ax) hi) hd) out))
    (setq out (cons (list "PUZZLE_HOLES_7_5MM" (- c ho) (- ax hi) hd) out))
    (setq out (cons (list "PUZZLE_HOLES_7_5MM" (+ c ho) (- ax hi) hd) out)))
  ;; the far-end screw row, into SIDE-B's edge
  (foreach y (CL:edgeScrewYs H tc)
    (setq out (cons (list "SCREWS_3MM" (- len ax) y sd) out)))
  ;; the top and bottom rows, into the L's edge: 50, the run's middle, run - 50
  (foreach x (list sfe (/ run 2.0) (- run sfe))
    (setq out (cons (list "SCREWS_3MM" x (- H ax) sd) out))
    (setq out (cons (list "SCREWS_3MM" x ax sd) out)))
  (reverse out))

;;;========================================
;;; G. LEGS, HINGE ROWS, HANGERS
;;;========================================

;;; The six legs: (name x y role), x y the leg's min corner in the ROOM frame.
(defun CL:legPositions (outW outD armD G / lw fi bi)
  (setq lw (CL:p "legs.width")
        fi (CL:p "legs.insetFromFront")
        bi (CL:p "legs.insetFromBack"))
  (list
    (list "L1" bi bi "back")                                ; the room corner, wall on both edges
    (list "L2" (- outW G lw) bi "back")                     ; SIDE-A, against wall A
    (list "L3" (- outW G lw) (- armD fi lw) "front")        ; SIDE-A, the front end of arm A
    (list "L4" (- armD fi lw) (- armD fi lw) "front")       ; the inner corner, front on both edges
    (list "L5" (- armD fi lw) (- outD G lw) "front")        ; SIDE-B, the front end of arm B
    (list "L6" bi (- outD G lw) "back")))                   ; SIDE-B, against wall B

;;; The hinge PLATE rows on SIDE-A and SIDE-B: KIT_BUD's (and KIT_WUD's) own
;;; list for base and wall, the tall rule for the wardrobe.
(defun CL:hingeRows (H mount / )
  (if (= mount "X")
    (calcHingePositionsTall H)
    (list (- H 100.0) (- H 300.0) 100.0)))

;;; KIT_WUD's two hanger holes in a side, in drawBUL ("L") or drawBUR ("R")
;;; frame: (x y diameter).
(defun CL:hangerSide (sideW H side / a1 a2 ft hd)
  (setq a1 (CL:p "wallUnit.hangers.fromBackEdge.0")
        a2 (CL:p "wallUnit.hangers.fromBackEdge.1")
        ft (CL:p "wallUnit.hangers.fromTop")
        hd (CL:p "wallUnit.hangers.holeDiameter"))
  (if (= side "L")
    (list (list (- sideW a1) (- H ft) hd) (list (- sideW a2) (- H ft) hd))
    (list (list a1 (- H ft) hd) (list a2 (- H ft) hd))))

;;; KIT_WUD's hanger cut-out in a back, at the FAR top corner (x = len):
;;; (x1 y1 x2 y2).
(defun CL:hangerBack (len H / )
  (list (- len (CL:p "wallUnit.hangers.cutoutWidth"))
        (- H (CL:p "wallUnit.hangers.cutoutHeight"))
        len
        H))

;;;========================================
;;; H. THE BOARD LIST (summary, CSV, and the test's census)
;;;========================================
;;;
;;; (name w h area edgeCode edgeLength), mm and mm2. An L board's w x h is its
;;; bounding size; its area is the true L.

(defun CL:boardList (outW outD armD H G numShelves / sideW top shelf out i)
  (setq sideW (- armD G)
        top   (CL:lTop outW outD armD G)
        shelf (CL:lShelf outW outD armD G))
  (setq out
    (list
      (list "SIDE-A" sideW H (* sideW H) "<" H)
      (list "SIDE-B" sideW H (* sideW H) ">" H)
      (list "TOP-L" (car (nth 1 top)) (cadr (nth 5 top)) (CL:area top) ">" (CL:lFrontLen top))
      (list "BOTTOM-L" (car (nth 1 top)) (cadr (nth 5 top)) (CL:area top) ">" (CL:lFrontLen top))
      (list "BACK-A" outW H (* outW H) "" 0.0)
      (list "BACK-B" (- outD G) H (* (- outD G) H) "" 0.0)))
  (setq i 1)
  (while (<= i numShelves)
    (setq out (append out (list (list (strcat "SHELF-L-" (itoa i))
                                      (car (nth 1 shelf)) (cadr (nth 5 shelf))
                                      (CL:area shelf) ">" (CL:lFrontLen shelf)))))
    (setq i (1+ i)))
  out)

;;;========================================
;;; I. DRAWING
;;;========================================

;;; A closed polyline of local points, shifted to (x0 y0).
(defun drawCL_POLY (layer x0 y0 pts / )
  (makePolyline layer
    (mapcar '(lambda (p) (list (+ x0 (car p)) (+ y0 (cadr p)))) pts)))

;;; An L board: its outline (with tabs when `joints` is given), the tabs' dog
;;; bones, the inner-corner relief, and its label in the corner square.
(defun drawCL_LBOARD (x0 y0 nominal joints relief label G / b arm)
  (drawCL_POLY "OUTLINE" x0 y0 (if joints (CL:walkOutline nominal joints G) nominal))
  (if joints
    (foreach b (CL:walkBones joints G)
      (drawRect "PUZZLE_DOG_BONES" (+ x0 (nth 0 b)) (+ y0 (nth 1 b)) (+ x0 (nth 2 b)) (+ y0 (nth 3 b)))))
  (if relief
    (drawCircle "PUZZLE_DOG_BONES" (+ x0 (nth 0 relief)) (+ y0 (nth 1 relief)) (nth 2 relief)))
  (setq arm (car (nth 3 nominal)))
  (drawText "UNIT_NUMBER" (+ x0 (/ arm 2.0)) (+ y0 (/ arm 2.0)) 40.0 label))

;;; T78 F4: THE QUARTER TURN (section 10). A point of a board's own frame
;;; turned 90 LEFT and set down in positive coordinates: (x y) -> (spanY - y, x).
;;; The engine's turnPoint(x, y, 90) = (-y, x) plus the nest's shift by spanY.
(defun CL:rot90Pt (p spanY / )
  (list (- spanY (cadr p)) (car p)))

;;; A list of points through the turn.
(defun CL:rot90 (pts spanY / )
  (mapcar '(lambda (p) (CL:rot90Pt p spanY)) pts))

;;; A min/max rectangle (x1 y1 x2 y2) through the turn, re-sorted min/max.
(defun CL:rot90Rect (r spanY / a b)
  (setq a (CL:rot90Pt (list (nth 0 r) (nth 1 r)) spanY)
        b (CL:rot90Pt (list (nth 2 r) (nth 3 r)) spanY))
  (list (min (car a) (car b)) (min (cadr a) (cadr b))
        (max (car a) (car b)) (max (cadr a) (cadr b))))

;;; An L board drawn TURNED 90 (T78 F4): drawCL_LBOARD's outline, tabs, dog
;;; bones, relief and label, every one through CL:rot90 about the board's own
;;; frame, spanY = v5's y. The board is the same board; only its lay moves.
(defun drawCL_LBOARD_ROT90 (x0 y0 nominal joints relief label G / spanY b r arm lbl)
  (setq spanY (cadr (nth 5 nominal)))
  (drawCL_POLY "OUTLINE" x0 y0
    (CL:rot90 (if joints (CL:walkOutline nominal joints G) nominal) spanY))
  (if joints
    (foreach b (CL:walkBones joints G)
      (setq r (CL:rot90Rect b spanY))
      (drawRect "PUZZLE_DOG_BONES" (+ x0 (nth 0 r)) (+ y0 (nth 1 r)) (+ x0 (nth 2 r)) (+ y0 (nth 3 r)))))
  (if relief
    (progn
      (setq r (CL:rot90Pt (list (nth 0 relief) (nth 1 relief)) spanY))
      (drawCircle "PUZZLE_DOG_BONES" (+ x0 (car r)) (+ y0 (cadr r)) (nth 2 relief))))
  (setq arm (car (nth 3 nominal)))
  (setq lbl (CL:rot90Pt (list (/ arm 2.0) (/ arm 2.0)) spanY))
  (drawText "UNIT_NUMBER" (+ x0 (car lbl)) (+ y0 (cadr lbl)) 40.0 label))

;;; BACK-B, whole: outline and tabs, dog bones, sockets, holes, the hanger.
(defun drawCL_BACKB (x0 y0 outD H G label hanger / b k r)
  (drawCL_POLY "OUTLINE" x0 y0 (CL:backBPts outD H G))
  (foreach b (CL:backBBones outD H G)
    (drawRect "PUZZLE_DOG_BONES" (+ x0 (nth 0 b)) (+ y0 (nth 1 b)) (+ x0 (nth 2 b)) (+ y0 (nth 3 b))))
  (foreach k (CL:backBPockets outD H G)
    (drawRect (nth 0 k) (+ x0 (nth 1 k)) (+ y0 (nth 2 k)) (+ x0 (nth 3 k)) (+ y0 (nth 4 k))))
  (foreach k (CL:backBHoles outD H G)
    (drawCircle (nth 0 k) (+ x0 (nth 1 k)) (+ y0 (nth 2 k)) (/ (nth 3 k) 2.0)))
  (if hanger
    (progn
      (setq r (CL:hangerBack (- outD G) H))
      (drawRect "HANGER_HOLE" (+ x0 (nth 0 r)) (+ y0 (nth 1 r)) (+ x0 (nth 2 r)) (+ y0 (nth 3 r)))))
  (drawText "UNIT_NUMBER" (+ x0 (/ (- outD G) 2.0)) (+ y0 (/ H 2.0)) 40.0 label))

;;; KIT_WUD's hanger holes on a side drawn at (x0 y0).
(defun drawCL_HANGERSIDE (x0 y0 sideW H side / k)
  (foreach k (CL:hangerSide sideW H side)
    (drawCircle "HINGES_5MM" (+ x0 (nth 0 k)) (+ y0 (nth 1 k)) (/ (nth 2 k) 2.0))))

;;; The PLAN: the footprint, the seven boards in section, the shelf, the legs.
(defun drawCL_PLAN (x0 y0 outW outD armD G numShelves mount unitNum / lw lg)
  (drawCL_POLY "CARCASE" x0 y0 (CL:lOutline outW outD armD 0.0 0.0 0.0))
  (drawRect "CARCASE" x0 y0 (+ x0 outW) (+ y0 G))                              ; BACK-A
  (drawRect "CARCASE" x0 (+ y0 G) (+ x0 G) (+ y0 outD))                        ; BACK-B
  (drawRect "CARCASE" (+ x0 outW (- G)) (+ y0 G) (+ x0 outW) (+ y0 armD))      ; SIDE-A
  (drawRect "CARCASE" (+ x0 G) (+ y0 outD (- G)) (+ x0 armD) (+ y0 outD))      ; SIDE-B
  (if (> numShelves 0)
    (drawCL_POLY "SHELVES" (+ x0 G) (+ y0 G) (CL:lShelf outW outD armD G)))
  (if (not (= mount "W"))
    (progn
      (setq lw (CL:p "legs.width"))
      (foreach lg (CL:legPositions outW outD armD G)
        (drawRect "LEG_BLOCK" (+ x0 (nth 1 lg)) (+ y0 (nth 2 lg))
                  (+ x0 (nth 1 lg) lw) (+ y0 (nth 2 lg) lw)))))
  (drawText "UNIT_NUMBER" (+ x0 (/ armD 2.0)) (+ y0 (/ armD 2.0)) 30.0 unitNum)
  (drawText "UNIT_NUMBER" (+ x0 (/ (+ armD outW) 2.0)) (+ y0 (/ armD 2.0)) 30.0 "A")
  (drawText "UNIT_NUMBER" (+ x0 (/ armD 2.0)) (+ y0 (/ (+ armD outD) 2.0)) 30.0 "B")
  (drawDimHFront x0 (+ x0 outW) y0))

;;;========================================
;;; J. THE COMMAND
;;;========================================
(defun c:CORNER_L_FULL ( / G mount dW dArm dH outW outD armD hgt numShelves
                           unitNum defNum pt x0 y0 sideW hinges
                           drawCNC cncPt cncX cncY odstep cncDone
                           nomTop jTop relTop nomShelf relShelf i
                           boards b sumX sumY lineH totalSQM totalEdging
                           csvPath csvFile
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

  (setq mount (getstring "\nVersion [B=Base on legs, W=Wall hung, X=Wardrobe] <B>: "))
  (if (= mount "") (setq mount "B"))
  (setq mount (strcase mount))
  (if (not (or (= mount "B") (= mount "W") (= mount "X"))) (setq mount "B"))

  ;; Defaults per version - T75 proposed, owner to confirm
  (cond
    ((= mount "W") (setq dW 600.0  dArm 400.0 dH 720.0  defNum "CW01"))
    ((= mount "X") (setq dW 1000.0 dArm 568.0 dH 2150.0 defNum "CX01"))
    (T             (setq dW 900.0  dArm 558.0 dH 770.0  defNum "CL01")))

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

  (setq numShelves (getint "\nNumber of SHELVES (0-10): "))
  (if (or (null numShelves) (< numShelves 0)) (setq numShelves 0))
  (if (> numShelves 10) (setq numShelves 10))

  (setq unitNum (getstring T (strcat "\nUnit NUMBER <" defNum ">: ")))
  (if (= unitNum "") (setq unitNum defNum))

  (setq pt (getpoint "\nInsertion point (the ROOM CORNER): "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))

  (setq x0 (car pt) y0 (cadr pt))
  (setq sideW (- armD G))
  (setq hinges (CL:hingeRows hgt mount))

  ;; === LAYERS ===
  (createViewLayers)

  ;;;========================================
  ;;; PLAN VIEW (origin = the room corner)
  ;;;========================================
  (drawCL_PLAN x0 y0 outW outD armD G numShelves mount unitNum)

  ;;;========================================
  ;;; CNC PANELS - optional
  ;;;========================================
  (setq drawCNC (getstring "\nDraw CNC panels? [Y/N] <N>: "))
  (if (= drawCNC "") (setq drawCNC "N"))
  (setq drawCNC (strcase drawCNC))

  (if (= drawCNC "Y")
    (progn
      (createCNCLayers)
      (if (= mount "W")
        (command "._LAYER" "_N" "HANGER_HOLE" "_C" "4" "HANGER_HOLE" ""))

      (setq nomTop   (CL:lTop outW outD armD G)
            jTop     (CL:lTopJoints outW outD armD G)
            relTop   (CL:innerRelief nomTop (CL:cutterRadius))
            nomShelf (CL:lShelf outW outD armD G)
            relShelf (CL:innerRelief nomShelf (CL:cutterRadius)))

      (setq cncPt (getpoint "\nClick insertion point for CNC panels: "))
      (if (null cncPt)
        (princ "\nNo point selected. CNC cancelled.")
        (progn
          (setq cncX (car cncPt))
          (setq cncY (cadr cncPt))
          (setq odstep 50.0)

          ;; SIDE-A = KIT_BUD's BUL, d deep, drilled for door A
          (drawBUL cncX cncY sideW hgt unitNum numShelves G T hinges nil)
          (if (= mount "W") (drawCL_HANGERSIDE cncX cncY sideW hgt "L"))
          (setq cncX (+ cncX sideW odstep))

          ;; SIDE-B = KIT_BUD's BUR, d deep, drilled for door B
          (drawBUR cncX cncY sideW hgt unitNum numShelves G T hinges nil)
          (if (= mount "W") (drawCL_HANGERSIDE cncX cncY sideW hgt "R"))
          (setq cncX (+ cncX sideW odstep))

          ;; TOP-L - T78 F4: drawn TURNED 90 (drawCL_LBOARD_ROT90, section 10),
          ;; its wall-A span up the page, the grain with it. Its tabs stand G
          ;; proud on both axes of the turned board too, so it is still laid G
          ;; in; across the page it now measures spanY (v5's y), not spanX.
          (setq cncX (+ cncX G))
          (drawCL_LBOARD_ROT90 cncX (+ cncY G) nomTop jTop relTop (strcat unitNum " TOP-L") G)
          (setq cncX (+ cncX (cadr (nth 5 nomTop)) G odstep))

          ;; BOTTOM-L - the same board (drawBOTTOM_ROT90 is drawTOP_ROT90), turned too
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

          ;; BACK-B - its corner-end tabs stand G proud to the left
          (setq cncX (+ cncX G))
          (drawCL_BACKB cncX cncY outD hgt G (strcat unitNum " BACK-B") (= mount "W"))
          (setq cncX (+ cncX (- outD G) odstep))

          ;; SHELF-L - T78 F4, the owner's own words: "na L polkach odwroc na
          ;; CNC i na wizualizacji sloje o 90 stopni". Turned (section 10).
          (setq i 1)
          (while (<= i numShelves)
            (drawCL_LBOARD_ROT90 cncX cncY nomShelf nil relShelf (strcat unitNum "-S" (itoa i)) G)
            (setq cncX (+ cncX (cadr (nth 5 nomShelf)) odstep))
            (setq i (1+ i)))

          ;;;========================================
          ;;; SUMMARY TEXT BLOCK
          ;;;========================================
          (setq boards (CL:boardList outW outD armD hgt G numShelves))
          (setq totalSQM 0.0 totalEdging 0.0)
          (foreach b boards
            (setq totalSQM (+ totalSQM (nth 3 b))
                  totalEdging (+ totalEdging (nth 5 b))))

          (setq sumX (+ cncX 500.0))
          (setq sumY (+ cncY hgt))
          (setq lineH 30.0)

          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "UNIT: " unitNum " (L CORNER, "
                    (cond ((= mount "W") "WALL") ((= mount "X") "WARDROBE") (T "BASE")) ")"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 1.2)))
          (setq i 1)
          (foreach b boards
            (drawTextL "SUMMARY" sumX sumY lineH
              (strcat (itoa i) ". " (nth 0 b) ": " (rtos (nth 1 b) 2 0) " x " (rtos (nth 2 b) 2 0)
                      (if (wcmatch (nth 0 b) "*-L*") " (L)" "")))
            (setq sumY (- sumY (* lineH 1.2)))
            (setq i (1+ i)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "PANELS: " (itoa (length boards))))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "SQM: " (rtos (/ totalSQM 1000000.0) 2 2) " m2"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "EDGING: " (rtos (/ totalEdging 1000.0) 2 2) " m"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH
            (if (= mount "W") "LEGS: none (2 hangers, far ends)" "LEGS: 6 (no leg holes, as KIT_BUD)"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 2.5)))
          (drawTextLC "SUMMARY" sumX sumY lineH "DOORS: the engine's door path" 6)
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextLC "SUMMARY" sumX sumY lineH "A on SIDE-A, B on SIDE-B, B overlaps A" 6)
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextLC "SUMMARY" sumX sumY lineH "door B opens first" 6)
          (setq sumY (- sumY (* lineH 2.0)))
          (drawTextLC "SUMMARY" sumX sumY lineH "Property of Skylon Joinery" 6)

          (setq cncDone T)
          (princ "\nCNC panels generated."))))) ;; closes: getpoint progn, cncPt if, drawCNC progn, drawCNC if

  ;;;========================================
  ;;; LABELS CSV (only if CNC was generated)
  ;;;========================================
  (if cncDone
    (progn
      (setq csvPath (findfile "KIT_CORNER_L.lsp"))
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
          ;; SIDE-A <, SIDE-B > (the front edge, as BUL / BUR); the L boards >
          ;; (their two fronts, EDG_L the two together); the backs no edge.
          ;; SZER x WYS of an L board is its bounding size; SQM is the true L.
          (foreach b boards
            (write-line (strcat unitNum "," (nth 0 b) "," (rtos (nth 1 b) 2 0) "," (rtos (nth 2 b) 2 0)
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

  (princ (strcat "\nCORNER_L_FULL " unitNum " - Done! ("
                 (cond ((= mount "W") "wall") ((= mount "X") "wardrobe") (T "base")) ")"))
  (princ (strcat "\n  L: " (rtos outW 2 0) " x " (rtos outD 2 0) ", arms " (rtos armD 2 0)
                 " deep, H " (rtos hgt 2 0) "mm, G=" (rtos G 2 0) "mm"))
  (princ (strcat "\n  Shelves: " (itoa numShelves) ", CNC: " (if (= drawCNC "Y") "Yes" "No")))
  (princ))

(princ "\nKIT_CORNER_L loaded. Type CORNER_L_FULL to run.")
(princ)
