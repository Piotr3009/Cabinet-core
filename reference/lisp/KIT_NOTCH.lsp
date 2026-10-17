;;;========================================
;;; KIT_NOTCH.lsp
;;; The CORNER NOTCH - a MODIFIER on the KIT_BUD, KIT_WARDROBE and (since
;;; 15.10.2026) KIT_WUD and KIT_BUDTALL boards
;;; Command: NOTCH_FULL
;;; Turn 75 (CLAUDE.md PART A, F7) - LISP FIRST ("lisp najpierw")
;;; Derived from: KIT_BUD_FULL.lsp + KIT_WARDROBE_FULL.lsp + SKYLON_COMMON.lsp
;;; Requires: SKYLON_COMMON.lsp loaded first
;;;========================================
;;;
;;; THE OWNER, 23.09.2026 (Petros, "Lista do nastepnej tury", list 4):
;;;
;;;   "WYCIECIE NAROZNIKA w karkasie (mega wazne, np. L-ka przy scianie,
;;;    rurze). Klikasz 'wytnij naroznik', program podswietla narozniki,
;;;    wybierasz, podajesz wysokosc, glebokosc, szerokosc (np. 200x200).
;;;    Program dorysowuje elementy wg logiki karkasu, ciecie realne przez
;;;    wszystkie panele tworzace rog (w tym dno, automatycznie), z
;;;    dogbone'ami i nawierceniami."
;;;
;;; ...and 9.10.2026, the order this file obeys: "lisp najpierw". This file is
;;; written BEFORE src/engine/notch.js exists, and the engine mirrors it line
;;; for line: every routine below is PURE (numbers in, numbers or point lists
;;; out), and the drawing command at the end only draws what they return.
;;;
;;; This is a NEW FILE. It touches no other kit. drawRect, drawCircle,
;;; drawText, drawTextL, makePolyline, createViewLayers, createCNCLayers and
;;; SKY:tabCentres are COMMON's own and are CALLED, never copied.
;;;
;;; A NOTE ON NAMES. AutoLISP symbols are CASE-INSENSITIVE: W and w are ONE
;;; symbol. So the carcass is always cw cd ch g (width, depth, height, board)
;;; and the notch is always nw nd nh (width along the back, depth into the
;;; carcass, height). The JS mirror may call them W D H G w d h.
;;;
;;;========================================
;;; 1. THE MODIFIER: WHAT IT TAKES, WHAT IT GIVES
;;;========================================
;;;
;;; It runs AFTER the parent kit's carcass and BEFORE the drilling pass. The
;;; parent (KIT_BUD or KIT_WARDROBE: the same five boards, BUL, BUR, TOP,
;;; BOTTOM, BACK, plus SHELF) is set out exactly as the parent sets it out;
;;; the notch then cuts it, adds the boards that close the cut, and re-plans
;;; the joints the cut shortened.
;;;
;;; THE WALL UNIT (the owner, 15.10.2026: "nie ma wogole mozliwosci wyciecia
;;; naroznika w szafkach wiszacych, a powinno byc"): KIT_WUD is the same five
;;; boards and is a parent too, with two things of its own that the notch
;;; must carry, THE HANGERS (KIT_WUD_FULL.lsp L258-260 and the side holes):
;;;   - the BACK's two hanger cut-outs sit in its top corners (cutoutWidth x
;;;     cutoutHeight, 30 x 58); a cut-out the notch's region reaches STEPS IN
;;;     along the width by nw, so the bracket hangs beside the notch, on the
;;;     board that is there (a full-height back notch: the cut-out stands at
;;;     the shortened back's new corner);
;;;   - the notched side's two hanger holes (fromBackEdge 21 / 53, fromTop
;;;     53) are measured off the back edge; when a full-height back notch
;;;     shortens the side by nd they step forward by nd with that edge, as the
;;;     shelf-pin column does (D7), never dropped;
;;;   - a notch from the floor on a wall unit rises from the unit's own
;;;     underside, exactly as on a base unit: the bottom is cut, the top is
;;;     closed by the LID.
;;; THE OBSTACLE NOTCH (the owner, 15.10.2026: "komin nie ma mozliwosci
;;; automatycznego wycinania w szafce naroznika jak przesuwamy - patrz skos,
;;; w szafach to samo"): the room's CHIMNEY breasts and BOXES stand floor to
;;; ceiling in the plan; a cabinet slid along the wall into one gets this notch
;;; cut for it, derived and never stored, exactly as the slope cut is
;;; (SKYLON_COMMON slope law, T46 F2's arrival law):
;;;   corner  BL when the obstacle is on the cabinet's left, BR on its right
;;;   nw      the overlap along the wall + notch.obstacleClearance
;;;   nd      how far the obstacle stands past the cabinet's BACK LINE (its
;;;           protrusion from the wall less the wall gap) + notch.obstacleClearance
;;;   nh      0: FULL HEIGHT, a chimney and a box have no top
;;; THE ARRIVAL LAW of the obstacle: the cabinet may drive INTO the obstacle's
;;; span until the overlap reaches (notch-obstacle-limits): the widest notch
;;; the refusals allow (cw - 2g - 2 (dogbone + g), the TOP and BOTTOM still
;;; across), and never past the obstacle's far edge (then it would stand in
;;; front of it, which is no corner); an obstacle deeper than the deepest
;;; notch (cd - g - 2 (dogbone + g)) stays a hard stop as before. An obstacle
;;; the cabinet covers from edge to edge, or a cabinet carrying a notch of
;;; its own (the hand's), keeps the hard stop. The refusals (section 8) are
;;; asked of the derived notch as of any other: a runner, a hinge or a shelf
;;; in its way refuses in words and the parent is what is cut.
(defun notch-obstacle-limits (cw cd g bone / keep)
  (setq keep (max (notch-min-joint-edge bone g) (notch-p "notch.minInterior")))
  (list (- cw (* 2.0 g) keep) (- cd g keep)))   ;; (maxW maxD): the interior kept across and in depth, 100 since 15.10.2026 (96 held a joint before)
;;;
;;; A notch hanging from the TOP (a beam over a wall unit) and a WINDOW notch
;;; (a box crossing the corner at mid height) are NOT in this file yet: the
;;; owner asked for both the same night ("a co jak w poziomie mamy jakas
;;; przeszkode box naprzyklad powinno byc tak mozliwosc"); they are named
;;; in the PR as the next step, with their geometry (the TOP cut instead of
;;; the BOTTOM, a FLOOR board under the box as the LID is over it).
;;;
;;; PAST THE NOTCH (the owner, 15.10.2026, the morning): "przy bardzo waskim
;;; wcieciu zatrzymuje sie a ja bym chcial zeby sie wtedy szafka calkowicie
;;; sie skracala, nie zostawiala w srodku szafki mniej niz 100 mm, jezeli
;;; bedzie mniej to cala szafka sie robi plytsza ... jak przejade na druga
;;; strone komina to niech ponad 100 mm zaczyna sie pojawiac". So a cabinet
;;; slid along a chimney or a box is never stopped by it:
;;;   1. while the overlap leaves at least notch.minInterior of the INTERIOR
;;;      beside the notch (cw - 2g - nw >= 100) the corner is notched (above);
;;;   2. past that the WHOLE cabinet goes shallower: its depth is cd less the
;;;      obstacle's stand past the wall, its back on the obstacle's face, its
;;;      front where the run's front is; so for the obstacle inside the
;;;      cabinet's span and for an overlap too wide to notch (the interior
;;;      kept in depth, cd' - g >= 100, else the stop stands as before);
;;;   3. a WALL UNIT too shallow for that hangs on the obstacle's face at its
;;;      full depth (a wall unit on a chimney breast, which is what a wall
;;;      unit does there);
;;;   4. out on the far side, once the part of the cabinet past the obstacle
;;;      has 100 of interior again, the notch comes back on that corner, and
;;;      clear of it the cabinet is as it was.
;;; The engine derives all of it from where the cabinet stands and stores none
;;; of it but the two placement numbers (its shallower depth and its stand-off),
;;; which it takes back when the cabinet leaves (projectStore settleObstacles).
;;;
;;; INPUTS
;;;   corner   the PLAN corner, seen from the front:
;;;              "BL" back-left    "BR" back-right
;;;              "FL" front-left   "FR" front-right
;;;   nw       the notch's width ALONG THE BACK (along the carcass width)
;;;   nd       its depth INTO THE CARCASS (along the carcass depth)
;;;   nh       its height, UP FROM THE CARCASS UNDERSIDE; 0 = FULL HEIGHT
;;;
;;;   The notch RISES FROM THE FLOOR. The owner's cases are a wall return and
;;;   a pipe ("L-ka przy scianie, rurze"), and both stand on the floor, so a
;;;   part-height notch is the bottom of the corner and its top is closed.
;;;
;;; THE PLAN FRAME of the carcass, used by every routine below:
;;;   x   from the carcass's LEFT outer face (0) to its right one (cw)
;;;   y   from the carcass's FRONT face (0) to its back face (cd)
;;;   z   up from the carcass underside (the BOTTOM's lower face)
;;;
;;;        y
;;;     cd +----------------------------+        a BL notch, full height:
;;;        |  notch   |R|     BACK      |
;;;        |  nw x nd |E|               |        R/E = the RETURN
;;;        |          |T|               |        STEP = the STEP
;;;  cd-nd +---STEP---+ +               |
;;;        |B                           |
;;;        |U       TOP / BOTTOM        |
;;;        |L                           |
;;;      0 +----------------------------+--> x
;;;        0          nw              cw
;;;
;;;========================================
;;; 2. THE LAW: A NOTCH MAKES THE CARCASS SHALLOWER
;;;========================================
;;;
;;; Over the notch's width the carcass is nd SHALLOWER. That is the whole of
;;; it, and the owner's "wg logiki karkasu" (by the carcass's own logic) then
;;; decides every board, because the Skylon carcass already says how a
;;; carcass of a given depth is built: the sides run from the front face to
;;; the back's face, the TOP and BOTTOM sit between the sides and in front of
;;; the back, the back covers the sides' ends.
;;;
;;; So, for a notch nw x nd x nh (nh = the full height when 0):
;;;
;;;   SIDE at the corner (BUL for an L corner, BUR for an R corner)
;;;            takes a rectangular notch nd x nh at its rear corner (a
;;;            front notch: its front corner). Full height: it is simply
;;;            nd SHORTER, D minus d in the carcass's words, a board of
;;;            (cd - g - nd). Its puzzle sockets on the shortened edges are
;;;            RE-PLANNED for the shorter edge by the same planning the full
;;;            edge was planned by (section 4).
;;;   BACK     takes a notch nw x nh at that corner. Full height: it is
;;;            (cw - nw) wide. A FRONT notch never reaches it.
;;;   TOP      (full height only) and BOTTOM (always: the notch rises from
;;;            the floor) take the nw x nd notch at that corner, with a
;;;            DOG BONE at the notch's re-entrant corner (section 5).
;;;   SHELF    every shelf whose plan crosses the notch, at a height inside
;;;            it, takes the same nw x nd outline and the same dog bone.
;;;   PLINTH   is notched at a FRONT corner: it loses nw at that end where
;;;            the notch reaches its line (notch-plinth).
;;;
;;; ...and when nw is NOT LESS THAN the side's thickness, the notch is BOXED
;;; by the carcass's own logic, with boards standing INSIDE the carcass
;;; envelope so the obstacle gets the whole nw x nd:
;;;
;;;   RETURN   (nd - g) x nh at a back corner, nd x nh at a front one. The
;;;            side of the FULL-DEPTH part, over the depth it has and the
;;;            shallow part has not. Parallel to the sides, at x = nw ..
;;;            nw + g (an L corner). It runs from the back's face to the
;;;            STEP's BACK face (a back corner: the STEP covers its end, as
;;;            the back covers a side's end) or from the front face to the
;;;            shallow part's face (a front corner, nd long).
;;;   STEP     (nw + g) x nh, BACK CORNERS ONLY. The SHALLOW part's own
;;;            back. The nw x nh the BACK loses at the corner is not thrown
;;;            away: it is this board, set FORWARD by nd and a board wider,
;;;            covering the shortened side's end AND the RETURN's end exactly
;;;            as the back covers the sides' ends. Seen from the front with
;;;            the doors open it is ONE whole face; the only end grain in the
;;;            box is the STEP's own, seen from the side, inside the carcass
;;;            (the owner, 15.10.2026: "od przodu cala plyta, krawedz z
;;;            boku"; before that day the RETURN ran to the STEP's inner face
;;;            and its end grain showed from the front).
;;;   LID      nw x nd, PART-HEIGHT ONLY. It lies ON the STEP and the RETURN,
;;;            between the side and the back, and closes the notch's top.
;;;
;;; THE BOX'S FIXING IS THE JOINER'S. The RETURN, the STEP and the LID carry
;;; NO puzzle joint and NO machined hole: they are cut as outlines (F22
;;; readiness 'geometry': "a box-out board") and FIXED BY HAND (readiness
;;; 'manual'). Until 17.10.2026 that hand fixing was screws on THE BACK SCREW
;;; ROW of SKYLON_COMMON (the same [screwFromEnd, mid, length - screwFromEnd]
;;; spacing on the G / 2 axis), STATED by the routines below and drilled on
;;; one row only: the BACK's own edge row on the notched edge, into the
;;; RETURN's end grain. D10 (the owner, 17.10.2026): NONE of that. The box is
;;; fixed on biscuits by hand (a Lamello one day), the routines answer nil,
;;; the BACK's notched edge carries no row, and nothing is drawn for it
;;; ("teraz nic").
;;;
;;;========================================
;;; 3. DECISIONS TAKEN FOR THE OWNER (each one line to veto)
;;;========================================
;;;
;;; D1  THE STEP. CLAUDE.md F7 names a RETURN and a LID. A notch at a BACK
;;;     corner has TWO vertical faces, not one: the one along the depth (the
;;;     RETURN closes it) and the one across the width, nd in front of the
;;;     back. Left open, that second face is a hole nw - g wide straight into
;;;     the carcass. The carcass's own logic closes it with the shallow part's
;;;     own back: the STEP. Every size F7 names is kept exactly (SIDE D - d,
;;;     BACK W - w, TOP/BOTTOM w x d, LID w x d); the STEP is the one board
;;;     added, the BACK's own h, moved forward, w + g wide; the RETURN is
;;;     d - g at a back corner. DECIDED by the owner 15.10.2026 (the mockup
;;;     "naroznik, krawedz"): the STEP covers the RETURN's end, not the
;;;     other way round, so the open cabinet shows one whole face.
;;; D2  THE BOX STANDS INSIDE THE ENVELOPE. The obstacle gets the full
;;;     nw x nd x nh; the box boards are the carcass's skin around it, as the
;;;     sides and the back are the skin of the whole. That is what makes the
;;;     TOP's notch come out at exactly nw x nd: the RETURN's g and the
;;;     STEP's g are the TOP's own side and back insets, moved.
;;; D3  "GREATER THAN THE SIDE THICKNESS" IS READ "NOT LESS THAN". At
;;;     nw = g exactly the side is cut through its whole thickness and the
;;;     carcass is open, so it is boxed. Under g the notch never reaches the
;;;     TOP or the BOTTOM (they start at x = g): it is a REBATE nw deep in the
;;;     side's OUTER face plus the back's corner, nothing is boxed, and a
;;;     rebate that eats a joint is REFUSED (notch-rebate-eats-p).
;;; D4  A FRONT CORNER IS NOT CLOSED ACROSS. A carcass's front is an opening
;;;     and the fronts close it. The shallow part's face (nd behind the front)
;;;     is the same opening, set back: the RETURN closes the full part's side
;;;     and no STEP is cut. What fronts that opening is the fronts branch's
;;;     (CLAUDE.md, THE FRONTS BOUNDARY); this file cuts no front.
;;; D5  RE-PLAN, NOT FILTER. A joint on an edge the notch shortened is
;;;     planned AGAIN on what is left of the edge, by the same call that
;;;     planned the whole edge (SKY:tabCentres for tabs, the socket rule of
;;;     engine/puzzle.js socketCentres for sockets). The slope (T46) and the
;;;     oven (T18) FILTER a full plan; a notch cuts away a whole END of an
;;;     edge, and filtering would leave one socket where two belong.
;;; D6  THE SHORTEST EDGE THAT HOLDS A JOINT: one dog bone with one board's
;;;     bridge each side of it, 2 x (dogboneHalfHeight + g) = 96 on an 18.
;;;     DERIVED, like singleSocketBelow, from profile numbers, not a new one.
;;;     A notch that leaves a jointed edge shorter is REFUSED, naming the
;;;     board (notch-refusal).
;;; D7  DRILLING THE NOTCH CUTS AWAY IS DROPPED, the shelf-pin column
;;;     nearest the notch is RE-PLANNED on the side's shortened run (the
;;;     parent's own columnFromEdge from the new end), and a HINGE or RUNNER
;;;     hole in the notch is a REFUSAL, never a drop: a door hung on fewer
;;;     hinges than its ladder is a door that falls (notch-hole-refusal).
;;;     A hole the notch does not reach stays where the parent drilled it:
;;;     the rail bracket, for one, pairs with the other side's and moving
;;;     it would skew the rod.
;;; D8  ANYTHING ELSE the parent puts inside the carcass (a drawer box, a
;;;     drawer panel, a filler, a partition, the hanging rail) is TESTED
;;;     against the keep-out (notch-crosses-p) and REFUSED in words when it
;;;     crosses it. This file cuts nothing for them.
;;;
;;; 17.10.2026, THE OWNER'S MORNING (each one line to veto):
;;;
;;; D9  THE CORNER MARK, NOT THE DOG BONE. The owner: *"nie, nie dodawaj
;;;     wiercenia, dodaj jeden layer w samym cornerze okolo 40 mm w kazda
;;;     strone na linii L shape i nazwij to corner 4 mm, wtedy ja wytne ten
;;;     korner."*  Section 5's circle is no longer drawn at a notch's
;;;     re-entrant corner (a TOP, a BOTTOM, a SHELF, a part-height SIDE or
;;;     BACK). In its place TWO open lines on the layer CORNER_4MM (COMMON's
;;;     {FEATURE}_{DIAMETER}MM grammar; the diameter is the owner's 4 mm
;;;     cutter), each from the corner along one of the two outline edges
;;;     that meet there, cnc.cornerMarkLeg (40) long, or the edge's own
;;;     length where the edge is shorter (notch-corner-marks). The outline
;;;     keeps its sharp corner; the owner's own 4 mm program squares what
;;;     the 8 mm cutter left. COMMON's puzzle dog bones beside the tabs are
;;;     another thing and do not move ("mamy puzzle i dogbones w systemie i
;;;     niech tak bedzie"). KIT_RECESS.lsp D18 and KIT_CORNER_L.lsp state
;;;     the same law for their corners.
;;; D10 NO SCREW BETWEEN THE BACK AND THE BOX. The owner, on the board that
;;;     faces him when a cabinet is driven onto a chimney: *"masz wkrety na
;;;     niej a to nie dobrze bo nie bedziemy tam wkrecac wkretow, system
;;;     wkrety dookola plecow w tym przypadku nie zadziala ... bedziemy
;;;     montowac na ciastka (w przyszlosci dodamy lamello) teraz nic."*  So:
;;;     the BACK's row on its notched edge (section 2's "the one row that IS
;;;     drilled", G / 2 in from that edge, into the RETURN's end grain) is
;;;     NOT drilled any more; the STEP, the RETURN and the LID state NO
;;;     screws (notch-step-screws, notch-return-screws, notch-lid-screws
;;;     answer nil). The box is the joiner's, on biscuits by hand, a Lamello
;;;     one day; this file draws nothing for it. The BACK's rows into the
;;;     sides, the TOP and the BOTTOM stay exactly where drawBACK puts them.
;;;
;;; 17.10.2026, THE OWNER'S AFTERNOON:
;;;
;;; D11 THE TOP IS DRAWN FROM ITS UNDERSIDE. The owner, of the nesting sheet:
;;;     *"w 01 bottom i top nie powinno byc odbicie lustrzane?"*; *"lustro
;;;     bottom i top, prosze, koduj."*  notch-rot90-pts gives drawTOP_ROT90's
;;;     frame, which is the BOTTOM's (seen from above, its inside) and was the
;;;     TOP's too: the TOP seen from ABOVE is its outside, the one board of the
;;;     carcass drawn from the wrong face. The notch is a rear-LEFT corner on
;;;     both boards in plan, so the two drawings were the same, and a TOP laid
;;;     underside up and cut from it had its corner at the rear RIGHT. The law
;;;     (SKYLON_JOINTS_BISCUIT.lsp section J, stated once for every kit): the
;;;     TOP's frame is the BOTTOM's mirrored across the width, y' = (W - 2G) -
;;;     y, x unchanged, the walk reversed (notch-top-pts); its corner name
;;;     swaps its y half ("x0y0" -> "x0y1"), its corner mark moves with it.
;;;     Applied once, at the end, to the whole drawing (the engine's
;;;     topFrame.js); every routine of this file keeps drawing in the ROT90
;;;     frame. The NUMBERS block carries both boards.
;;; D12 THE CORNER MARK IS ONE OPEN L, WALKED THE OUTLINE'S WAY (16:10). The
;;;     owner, cutting the marks in VCarve with the tool BESIDE the line:
;;;     *"VCarve tnie mi raz z jednej strony, raz z drugiej ... trzeba bedzie
;;;     to ciac jako jeden L wektor"*; *"jeden, zaczynajacy sie od lewej do
;;;     srodka i kontynuacja na prawo, jeden L wektor; 2: obok linii."*  D9's
;;;     two legs both LEFT the corner, so along one the waste lay to the
;;;     right of the walk and along the other to the left, and one offset
;;;     setting put the cutter in the board on one leg. The mark is now ONE
;;;     open polyline of three points, (a v b): in along the edge the outline
;;;     arrives by, through the re-entrant corner, out along the edge it
;;;     leaves by, in the OUTLINE's own direction (anticlockwise, material on
;;;     the left, waste on the right), so the offset that profiles the
;;;     outline's outside profiles the mark's waste side on both arms, and
;;;     VCarve has nothing to join and nothing to reverse. notch-corner-marks
;;;     returns ((a v b) ...), one per corner; notch-draw-corner-marks draws
;;;     an OPEN LWPOLYLINE (notch-open-pline; COMMON's makePolyline closes).
;;;     The engine's record: { layer, from: a, to: b, pts: [a, v, b] }, and
;;;     the TOP's mirror (D11) reverses the walk with the outline.
;;;
;;;========================================
;;; 4. THE JOINTS ON A SHORTENED EDGE
;;;========================================
;;;
;;; TABS down a side's BACK EDGE and the BACK's matching sockets are
;;; SKY:tabCentres (COMMON, turn 52: one at or under 300, two under 600,
;;; three from 600, 95 in from each end). A part-height notch at a back corner
;;; leaves the edge above it, nh .. ch, and that run is planned afresh:
;;; nh + SKY:tabCentres(ch - nh). A full-height one leaves NO edge to join:
;;; the side's end meets the STEP, the back's end meets the RETURN, both
;;; screwed, and neither carries a tab or a socket there.
;;;
;;; SOCKETS along a side's TOP and BOTTOM edges, and the TOP/BOTTOM's mating
;;; tabs, are two at 95 from each end in every kit in this folder (drawBUL
;;; draws them literally, x0 + 95 and x0 + szer - 95). COMMON has no routine
;;; for them: the one-centred-socket rules are the engine's (turn 7
;;; singleSocketBelow 264.5, turn 25 singleJointMaxDepth 300) and the LISP
;;; never met the case. notch-replan-sockets is engine/puzzle.js
;;; socketCentres to the letter, and its spacing IS SKY:tabCentres called
;;; with no third tab: the house walk, not a new one.
;;;
;;; WHICH EDGES MOVE, for a notch at an L corner (an R corner mirrors):
;;;   BUL top and bottom edges      on (cd - g - nd), from the FRONT edge
;;;                                 (a front notch: from the notch's face)
;;;   TOP/BOTTOM edge into BUL      the same run, the same centres
;;;   TOP/BOTTOM back edge          a back notch: on (cw - 2g - nw), from
;;;                                 the RETURN's inner face
;;;   BACK top and bottom edges     the same run, + g from the back's own end
;;;                                 (engine/puzzle.js backPanelGeometry on a
;;;                                 back cw - nw wide gives exactly these)
;;; A part-height notch moves only what it reaches: the BOTTOM and the side's
;;; bottom edge, the back edge's tabs, the BACK's bottom edge; the TOP and the
;;; side's top edge are the parent's.
;;;
;;;========================================
;;; 5. THE DOG BONE AT THE NOTCH
;;;========================================
;;;
;;; Every notch outline has ONE re-entrant corner (a TOP, a BOTTOM, a SHELF;
;;; a part-height SIDE and BACK too). A round cutter profiling the board from
;;; the waste cannot reach it and leaves a fillet of its own radius, and a
;;; SQUARE corner seats there: the RETURN's, or the obstacle's own (a wall
;;; return is square). The relief is the house dog bone: a CIRCLE of the
;;; cutter's radius r on PUZZLE_DOG_BONES, its centre r / sqrt 2 off the
;;; corner in both axes INTO THE WASTE, so its edge passes exactly through
;;; the corner and the corner comes out square. Every outline keeps its
;;; corner sharp; the circle is the relief (as COMMON draws its dog bones
;;; beside the outline, never in it). KIT_CORNER_L.lsp states the same law
;;; for the L's inner corner (CL:innerRelief).
;;;
;;; r is the one cutter number the engine owns: profile.cnc.toolDiameter 8,
;;; r = 4 (engine/cnc/rollover.js toolRadius). COMMON states no cutter.
;;;
;;; 17.10.2026 (D9): THE CIRCLE IS NOT DRAWN ANY MORE. notch-dogbone and its
;;; family stay in this file as the record of where it stood (and the engine
;;; keeps their mirrors for the same reason); what a re-entrant corner gets
;;; is notch-corner-marks: the corner found on the board's own NOMINAL
;;; outline (the puzzle tabs are not on it), two open lines on CORNER_4MM
;;; along the two edges that meet there, cnc.cornerMarkLeg long, clamped to
;;; each edge's own length. On the TOP of the golden case (section I) the
;;; corner (200 340) plan gets (200 340)-(160 340) and (200 340)-(200 380).
;;;
;;;========================================
;;; 6. A NUMBER COMMON STILL DRAWS OLD
;;;========================================
;;;
;;; drawBACK in COMMON draws its screw axis at G / 2 + 0.5. Turn 24 moved the
;;; engine to G / 2 by name ("it is wrong, and it skewed the whole
;;; calculation"). Existing LISP is untouched this turn, so this file states
;;; its screw rows on the engine's CURRENT axis, G / 2 (notch-screw-axis), and
;;; the engine mirrors them with no delta.
;;;
;;;========================================
;;; 7. NOT HERE
;;;========================================
;;;
;;; Legs under the notch (engine/legs.js moves a leg out of the footprint),
;;; the fronts over a front notch (the fronts branch), a plinth RETURN along
;;; the notch (the obstacle stands to the floor; the plinth stops at it),
;;; lighting (CLAUDE.md FROZEN 2), and the UI (the four corners lit, the
;;; anchored modal: CLAUDE.md F7).
;;;
;;;========================================

;;; Auto-load COMMON if not already loaded
(if (null drawRect) (load "SKYLON_COMMON"))

;;;========================================
;;; A. THE NUMBERS THIS FILE READS
;;;========================================
;;;
;;; Each is the engine's profile number under its own key (src/engine/
;;; profile.js), so a workshop that changes one changes one line here and one
;;; there. The notch defaults are CLAUDE.md F7's own "200, 200, full"
;;; (profile.notch.defaults, T75 proposed, owner to confirm).

(defun notch-profile ( / )
  '(("puzzle.tabCentresFromEnd"     . 95.0)
    ("puzzle.singleSocketBelow"     . 264.5)
    ("puzzle.singleJointMaxDepth"   . 300.0)
    ("puzzle.singleTabAtOrBelow"    . 300.0)
    ("puzzle.middleTabBelow"        . 600.0)
    ("puzzle.dogboneHalfHeight"     . 30.0)
    ("puzzle.socketHalfWidth"       . 25.5)
    ("puzzle.screwFromEnd"          . 50.0)
    ("shelfHoles.columnFromEdge"    . 70.0)
    ("carcass.shelfWidthClearance"  . 4.0)
    ("carcass.shelfDepthClearance"  . 20.0)
    ("autoParts.plinth.setback"     . 50.0)
    ("cnc.toolDiameter"             . 8.0)
    ("notch.defaults.width"         . 200.0)
    ("notch.defaults.depth"         . 200.0)
    ("notch.defaults.height"        . 0.0)
    ("notch.obstacleClearance"      . 10.0)     ;; 15.10.2026: the scribe room round a chimney or a box the notch is cut FOR (the owner: "dobrze")
    ("notch.minInterior"            . 100.0)    ;; 15.10.2026: the owner's "nie mniej niz 100 mm w srodku szafki": what a notch must leave of the interior, across and in depth
    ("cnc.cornerMarkLeg"            . 40.0)))   ;; 17.10.2026 (D9): the owner's "okolo 40 mm w kazda strone": each leg of the CORNER_4MM mark at a re-entrant corner (profile.cnc.cornerMark.legMm)

(defun notch-p (key / hit)
  (setq hit (assoc key (notch-profile)))
  (if hit (cdr hit) nil))

;;;========================================
;;; B. THE CORNER
;;;========================================

(defun notch-corner-ok (corner)
  (if (member corner '("BL" "BR" "FL" "FR")) T nil))

(defun notch-back-p (corner)
  (or (= corner "BL") (= corner "BR")))

(defun notch-left-p (corner)
  (or (= corner "BL") (= corner "FL")))

;;; The side the notch cuts: BUL at an L corner, BUR at an R corner.
(defun notch-side-name (corner)
  (if (notch-left-p corner) "BUL" "BUR"))

;;; 0 (or anything at or over the carcass) is FULL HEIGHT.
(defun notch-full-p (ch nh)
  (or (<= nh 0.0) (>= nh ch)))

;;; The height the notch actually takes.
(defun notch-hh (ch nh)
  (if (notch-full-p ch nh) ch nh))

;;; D3: boxed when the notch is NOT LESS THAN the side's thickness.
(defun notch-boxed-p (nw g)
  (>= nw g))

;;; The cutter's radius (engine/cnc/rollover.js toolRadius).
(defun notch-cutter-radius (toolDia)
  (/ toolDia 2.0))

;;;========================================
;;; C. THE JOINTS, RE-PLANNED (section 4)
;;;========================================

;;; The unit's resolved joint inset (engine/puzzle.js resolvedJointInset):
;;; nil = one centred joint on a shallow carcass, else the inset.
(defun notch-joint-inset (cd e maxDepth)
  (if (and (> maxDepth 0.0) (> cd 0.0) (<= cd maxDepth)) nil e))

;;; Sockets along a run of `len` (engine/puzzle.js socketCentres, to the
;;; letter): nil inset or a run under `below` is ONE socket on its middle;
;;; otherwise COMMON's own walk with no third tab, e in from each end.
(defun notch-replan-sockets (len e below)
  (cond ((null e) (list (/ len 2.0)))
        ((and (> below 0.0) (< len below)) (list (/ len 2.0)))
        (T (SKY:tabCentres len e 0.0 1.0e30))))

;;; Tabs down a back edge of `len`: COMMON's SKY:tabCentres, unchanged.
(defun notch-replan-tabs (len e one three)
  (SKY:tabCentres len e one three))

;;; A plan moved along its edge by dx (a run that starts past the notch).
(defun notch-shift (lst dx)
  (mapcar '(lambda (c) (+ c dx)) lst))

;;; D6: the shortest edge that can still hold a joint.
(defun notch-min-joint-edge (bone g)
  (* 2.0 (+ bone g)))

;;; The screw axis: G / 2 (turn 24; section 6).
(defun notch-screw-axis (g)
  (/ g 2.0))

;;; THE BACK SCREW ROW along a run of `len`: [e, mid, len - e], drawBACK's
;;; own spacing. A run too short to hold three (len at or under 2e) takes
;;; two at its quarters, the engine's own decision for a short rail
;;; (profile.js ovenBase.topRails, BLOCKERS #76) rather than one screw a
;;; board can pivot on.
(defun notch-screw-row (len e)
  (cond ((<= len 0.0) nil)
        ((> len (* 2.0 e)) (list e (/ len 2.0) (- len e)))
        (T (list (* 0.25 len) (* 0.75 len)))))

;;; drawBACK's top and bottom row over a back that spans a .. b:
;;; [a + g + e, middle, b - g - e].
(defun notch-row-between (a b g e)
  (list (+ a g e) (/ (+ a b) 2.0) (- b g e)))

;;; drawBACK's side row over an edge lo .. hi carrying `tabs`: one e in from
;;; each end and one between every pair of neighbouring tabs
;;; (engine/puzzle.js backPanelGeometry sideScrewY).
(defun notch-rows-between-tabs (lo hi tabs e / out prev)
  (setq out (list (+ lo e)) prev nil)
  (foreach c tabs
    (if prev (setq out (cons (/ (+ prev c) 2.0) out)))
    (setq prev c))
  (reverse (cons (- hi e) out)))

;;; The shelf-pin columns on a run of `len`: columnFromEdge from each end.
(defun notch-pin-columns (len setback)
  (list setback (- len setback)))

;;;========================================
;;; D. ONE OUTLINE LAW: A RECTANGLE LESS ONE CORNER
;;;========================================
;;;
;;; Every notched board is its parent rectangle bw x bh less a rectangle
;;; nw x nh taken off ONE of its corners. The corner is named in the BOARD'S
;;; OWN FRAME (origin bottom-left, x right, y up, the frame every outline in
;;; COMMON is drawn in), so the name cannot be confused with the plan corner:
;;;
;;;   "x0y0"  the corner at x = 0,  y = 0
;;;   "x1y0"  the corner at x = bw, y = 0
;;;   "x0y1"  the corner at x = 0,  y = bh
;;;   "x1y1"  the corner at x = bw, y = bh
;;;
;;; The outline is returned in the board's ORIGINAL frame, anticlockwise and
;;; once round (the T25 edge-guard law: no edge twice), so a joint position
;;; keeps its number on the parent board and on the notched one. Where the
;;; notch takes a board's whole width or height it is a SHORTER RECTANGLE,
;;; still in the original frame (notch-reorigin re-origins it); where it
;;; takes both, the board is gone (nil).

(defun notch-fc-x0 (fc) (= (substr fc 1 2) "x0"))
(defun notch-fc-y0 (fc) (= (substr fc 3 2) "y0"))

(defun notch-plain-rect (bw bh)
  (list (list 0.0 0.0) (list bw 0.0) (list bw bh) (list 0.0 bh)))

(defun notch-rect-outline (bw bh nw nh fc)
  (cond
    ((and (>= nw bw) (>= nh bh)) nil)
    ((>= nw bw)
      (if (notch-fc-y0 fc)
        (list (list 0.0 nh) (list bw nh) (list bw bh) (list 0.0 bh))
        (list (list 0.0 0.0) (list bw 0.0) (list bw (- bh nh)) (list 0.0 (- bh nh)))))
    ((>= nh bh)
      (if (notch-fc-x0 fc)
        (list (list nw 0.0) (list bw 0.0) (list bw bh) (list nw bh))
        (list (list 0.0 0.0) (list (- bw nw) 0.0) (list (- bw nw) bh) (list 0.0 bh))))
    ((= fc "x0y0")
      (list (list nw 0.0) (list bw 0.0) (list bw bh)
            (list 0.0 bh) (list 0.0 nh) (list nw nh)))
    ((= fc "x1y0")
      (list (list 0.0 0.0) (list (- bw nw) 0.0) (list (- bw nw) nh)
            (list bw nh) (list bw bh) (list 0.0 bh)))
    ((= fc "x1y1")
      (list (list 0.0 0.0) (list bw 0.0) (list bw (- bh nh))
            (list (- bw nw) (- bh nh)) (list (- bw nw) bh) (list 0.0 bh)))
    (T
      (list (list 0.0 0.0) (list bw 0.0) (list bw bh)
            (list nw bh) (list nw (- bh nh)) (list 0.0 (- bh nh))))))

;;; The re-entrant corner and the direction INTO THE WASTE from it:
;;; ((kx ky) (sx sy)), or nil where the notch cut the board through.
(defun notch-rect-reentrant (bw bh nw nh fc)
  (cond
    ((or (>= nw bw) (>= nh bh)) nil)
    ((= fc "x0y0") (list (list nw nh) (list -1.0 -1.0)))
    ((= fc "x1y0") (list (list (- bw nw) nh) (list 1.0 -1.0)))
    ((= fc "x1y1") (list (list (- bw nw) (- bh nh)) (list 1.0 1.0)))
    (T (list (list nw (- bh nh)) (list -1.0 1.0)))))

;;; THE DOG BONE (section 5): (cx cy r), or nil where there is no corner.
(defun notch-dogbone (bw bh nw nh fc r / re k)
  (setq re (notch-rect-reentrant bw bh nw nh fc))
  (if (and re (> r 0.0))
    (progn
      (setq k (/ r (sqrt 2.0)))
      (list (+ (car (car re)) (* (car (cadr re)) k))
            (+ (cadr (car re)) (* (cadr (cadr re)) k))
            r))
    nil))

;;; THE CORNER MARK (D9, 17.10.2026), read off a board's NOMINAL outline in
;;; whatever frame it is drawn in. A vertex is RE-ENTRANT when the walk turns
;;; the other way there than the polygon as a whole turns (the sign of the
;;; cross product of the edge in and the edge out against the sign of the
;;; signed area). At each such vertex: two open lines, from the vertex along
;;; the edge in (back toward the previous vertex) and along the edge out
;;; (toward the next), `leg` long or the edge's own length, whichever is
;;; shorter. (((x1 y1) (x2 y2)) ...), two per corner, in the outline's frame.
;;; A rectangle has none; a window (a pocket) is not an outline and has none;
;;; the puzzle tabs are not on the nominal outline, so their roots get none.
(defun notch-signed-area2 (pts / n i a p q)
  (setq n (length pts) i 0 a 0.0)
  (while (< i n)
    (setq p (nth i pts) q (nth (rem (1+ i) n) pts))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p)))))
    (setq i (1+ i)))
  a)

(defun notch-leg-point (v w leg / dx dy len k)
  (setq dx (- (car w) (car v)) dy (- (cadr w) (cadr v))
        len (sqrt (+ (* dx dx) (* dy dy))))
  (if (> len 1e-9)
    (progn
      (setq k (/ (min leg len) len))
      (list (+ (car v) (* dx k)) (+ (cadr v) (* dy k))))
    v))

;;; notch-corner-marks (D12, 17.10.2026): ((a v b) ...), ONE open L per
;;; re-entrant vertex v, in the outline's own direction: a is `leg` back along
;;; the edge the outline arrives by (p -> v), b `leg` on along the edge it
;;; leaves by (v -> q). Until 16:10 it returned two legs ((v a) (v b)), both
;;; leaving the corner.
(defun notch-corner-marks (pts leg / n i p v q cross orient out)
  (setq n (length pts) i 0 out nil
        orient (notch-signed-area2 pts))
  (if (and (>= n 4) (> leg 0.0) (/= orient 0.0))
    (while (< i n)
      (setq p (nth (rem (+ i (1- n)) n) pts) v (nth i pts) q (nth (rem (1+ i) n) pts))
      (setq cross (- (* (- (car v) (car p)) (- (cadr q) (cadr v)))
                     (* (- (cadr v) (cadr p)) (- (car q) (car v)))))
      (if (< (* cross orient) 0.0)
        (setq out (append out (list (list (notch-leg-point v p leg) v (notch-leg-point v q leg))))))
      (setq i (1+ i))))
  out)

;;; A plan outline turned into COMMON's drawTOP_ROT90 frame (the engine's
;;; topPanelGeometry drawn frame): x' from the BACK edge, y' from the left
;;; side. drawnW is the board's depth (cd - g).
(defun notch-rot90-pts (pts drawnW)
  (mapcar '(lambda (p) (list (- drawnW (cadr p)) (car p))) pts))

;;; D11 (17.10.2026): the same plan outline as the TOP draws it, from its
;;; UNDERSIDE: the ROT90 points with y' = drawnH - y (drawnH = cw - 2g, the
;;; internal width), read backwards so the walk stays anticlockwise.
(defun notch-top-pts (pts drawnW drawnH)
  (reverse (mapcar '(lambda (p) (list (car p) (- drawnH (cadr p)))) (notch-rot90-pts pts drawnW))))

;;; D11: a corner name of the ROT90 frame on the TOP: its y half swapped.
(defun notch-top-fc (fc)
  (cond ((= fc "x0y0") "x0y1") ((= fc "x0y1") "x0y0")
        ((= fc "x1y0") "x1y1") ((= fc "x1y1") "x1y0") (T fc)))

;;; A shorter rectangle, re-origined to its own bottom-left.
(defun notch-reorigin (pts / mx my)
  (setq mx (apply 'min (mapcar 'car pts))
        my (apply 'min (mapcar 'cadr pts)))
  (mapcar '(lambda (p) (list (- (car p) mx) (- (cadr p) my))) pts))

;;;========================================
;;; E. THE KEEP-OUT: THE NOTCH AND ITS BOX, IN PLAN
;;;========================================
;;;
;;; The region of the plan no horizontal board may enter: the notch itself
;;; plus the RETURN and (a back corner) the STEP. (x0 y0 x1 y1), plan frame.
;;; `clr` widens it on the RETURN's side by a board's own sliding clearance
;;; (an adjustable shelf keeps 2 off the RETURN as it keeps 2 off a side).
;;; Unboxed (D3), it is the rebate alone, inside the side's thickness, and
;;; no horizontal board reaches it.

(defun notch-keepout (cw cd g nw nd corner clr / x0 x1 y0 y1 reach)
  (setq reach (if (notch-boxed-p nw g) (+ nw g clr) nw))
  (if (notch-left-p corner)
    (setq x0 0.0 x1 reach)
    (setq x0 (- cw reach) x1 cw))
  (if (notch-back-p corner)
    (setq y0 (- cd nd (if (notch-boxed-p nw g) g 0.0)) y1 cd)
    (setq y0 0.0 y1 nd))
  (list x0 y0 x1 y1))

;;; Do two plan rectangles (x0 y0 x1 y1) share any area?
(defun notch-overlap-p (a b)
  (and (< (car a) (caddr b)) (> (caddr a) (car b))
       (< (cadr a) (cadddr b)) (> (cadddr a) (cadr b))))

;;; What the keep-out takes off a board lying at `board` (x0 y0 x1 y1) in
;;; plan: (fc nw nh bw bh) in the BOARD'S frame, or nil when it does not
;;; cross. The keep-out always runs out to the carcass's own faces, so it
;;; always takes a CORNER of a board inside the carcass.
(defun notch-plan-cut (board k / ix0 iy0 ix1 iy1)
  (setq ix0 (max (car board) (car k))
        iy0 (max (cadr board) (cadr k))
        ix1 (min (caddr board) (caddr k))
        iy1 (min (cadddr board) (cadddr k)))
  (if (and (> ix1 ix0) (> iy1 iy0))
    (list (strcat (if (<= ix0 (car board)) "x0" "x1")
                  (if (<= iy0 (cadr board)) "y0" "y1"))
          (- ix1 ix0) (- iy1 iy0)
          (- (caddr board) (car board)) (- (cadddr board) (cadr board)))
    nil))

(defun notch-cut-outline (board cut)
  (if cut
    (notch-rect-outline (nth 3 cut) (nth 4 cut) (nth 1 cut) (nth 2 cut) (car cut))
    (notch-plain-rect (- (caddr board) (car board)) (- (cadddr board) (cadr board)))))

(defun notch-cut-dogbone (cut r)
  (if cut
    (notch-dogbone (nth 3 cut) (nth 4 cut) (nth 1 cut) (nth 2 cut) (car cut) r)
    nil))

;;;========================================
;;; F. BOARD BY BOARD
;;;========================================

;;;----------------------------------------
;;; TOP and BOTTOM: (cw - 2g) x (cd - g), between the sides, in front of the
;;; back. PLAN FRAME of the board: x from the left side's inner face, y from
;;; the front edge (notch-rot90-pts gives drawTOP_ROT90's frame).
;;; The BOTTOM always takes it; the TOP only at full height.
;;;----------------------------------------

(defun notch-top-rect (cw cd g)
  (list g 0.0 (- cw g) (- cd g)))

(defun notch-top-cut (cw cd g nw nd corner)
  (notch-plan-cut (notch-top-rect cw cd g) (notch-keepout cw cd g nw nd corner 0.0)))

(defun notch-top-outline (cw cd g nw nd corner)
  (notch-cut-outline (notch-top-rect cw cd g) (notch-top-cut cw cd g nw nd corner)))

(defun notch-top-dogbone (cw cd g nw nd corner r)
  (notch-cut-dogbone (notch-top-cut cw cd g nw nd corner) r))

;;; Its tabs, re-planned (D5), as (("LEFT" y..) ("RIGHT" y..) ("BACK" x..)):
;;; LEFT/RIGHT are the long edges into BUL/BUR, y from the FRONT edge; BACK
;;; is the edge into the BACK, x from the left side's inner face. These are
;;; the NOTCHED board's (the BOTTOM always, the TOP at full height); a TOP
;;; over a part-height notch keeps the parent's. Unboxed, nothing moves.
(defun notch-top-joints (cw cd g nw nd corner / e below inset sideW tw near far bk)
  (setq e (notch-p "puzzle.tabCentresFromEnd")
        below (notch-p "puzzle.singleSocketBelow")
        inset (notch-joint-inset cd e (notch-p "puzzle.singleJointMaxDepth"))
        sideW (- cd g)
        tw (- cw (* 2.0 g)))
  (setq far (notch-replan-sockets sideW inset below))
  (cond
    ((not (notch-boxed-p nw g))
      (setq near far bk (notch-replan-sockets tw e below)))
    ((notch-back-p corner)
      (setq near (notch-replan-sockets (- sideW nd) inset below))
      (setq bk (if (notch-left-p corner)
                 (notch-shift (notch-replan-sockets (- tw nw) e below) nw)
                 (notch-replan-sockets (- tw nw) e below))))
    (T
      (setq near (notch-shift (notch-replan-sockets (- sideW nd) inset below) nd))
      (setq bk (notch-replan-sockets tw e below))))
  (if (notch-left-p corner)
    (list (cons "LEFT" near) (cons "RIGHT" far) (cons "BACK" bk))
    (list (cons "LEFT" far) (cons "RIGHT" near) (cons "BACK" bk))))

;;;----------------------------------------
;;; THE SIDE at the corner: (cd - g) x ch, in ITS OWN LISP FRAME:
;;;   BUL (drawBUL)  x = 0 is the FRONT edge, tabs on the edge at x = bw
;;;   BUR (drawBUR)  x = 0 is the REAR edge (it mirrors drawBUL)
;;;----------------------------------------

(defun notch-side-fc (corner burFrame)
  (if burFrame
    (if (notch-back-p corner) "x0y0" "x1y0")
    (if (notch-back-p corner) "x1y0" "x0y0")))

;;; Boxed: the side cut nd x nh at its rear (front) corner. Unboxed (D3): the
;;; parent's rectangle, its rebate given by notch-side-rebate.
(defun notch-side (cd ch g nw nd nh corner)
  (if (notch-boxed-p nw g)
    (notch-rect-outline (- cd g) ch nd (notch-hh ch nh)
                        (notch-side-fc corner (not (notch-left-p corner))))
    (notch-plain-rect (- cd g) ch)))

(defun notch-side-dogbone (cd ch g nw nd nh corner r)
  (if (notch-boxed-p nw g)
    (notch-dogbone (- cd g) ch nd (notch-hh ch nh)
                   (notch-side-fc corner (not (notch-left-p corner))) r)
    nil))

;;; D3: the rebate, a POCKET nw deep in the side's OUTER face:
;;; (x0 y0 x1 y1 depth) in the side's own frame, or nil when boxed.
(defun notch-side-rebate (cd ch g nw nd nh corner / bw fc)
  (if (notch-boxed-p nw g)
    nil
    (progn
      (setq bw (- cd g)
            fc (notch-side-fc corner (not (notch-left-p corner))))
      (if (notch-fc-x0 fc)
        (list 0.0 0.0 nd (notch-hh ch nh) nw)
        (list (- bw nd) 0.0 bw (notch-hh ch nh) nw)))))

;;; Its joints, re-planned (D5, D7), ALL MEASURED FROM THE SIDE'S FRONT EDGE
;;; (BUR's own frame is cd - g - x of these):
;;;   TOP-SOCKETS / BOTTOM-SOCKETS   along the top and bottom edges
;;;   TOP-SCREWS  / BOTTOM-SCREWS    the assembly rows along those edges
;;;   BACK-TABS                      y up the back edge (nil: none)
;;;   PIN-COLUMNS                    the shelf-pin columns for the shelf rows
;;;                                  INSIDE the notch's height (the rows above
;;;                                  a part-height notch keep the parent's)
;;; Unboxed, every joint is the parent's (a rebate that eats one is refused).
(defun notch-side-joints (cd ch g nw nd nh corner / e below inset one three sfe pin
                          sideW run off full topS botS topR botR tabs pins)
  (setq e (notch-p "puzzle.tabCentresFromEnd")
        below (notch-p "puzzle.singleSocketBelow")
        inset (notch-joint-inset cd e (notch-p "puzzle.singleJointMaxDepth"))
        one (notch-p "puzzle.singleTabAtOrBelow")
        three (notch-p "puzzle.middleTabBelow")
        sfe (notch-p "puzzle.screwFromEnd")
        pin (notch-p "shelfHoles.columnFromEdge")
        sideW (- cd g)
        full (notch-full-p ch nh))
  (if (notch-boxed-p nw g)
    (setq run (- sideW nd) off (if (notch-back-p corner) 0.0 nd))
    (setq run sideW off 0.0))
  (setq botS (notch-shift (notch-replan-sockets run inset below) off)
        botR (notch-shift (notch-screw-row run sfe) off))
  ;; the top edge moves only when a boxed notch runs the full height
  (if (and full (notch-boxed-p nw g))
    (setq topS botS topR botR)
    (setq topS (notch-replan-sockets sideW inset below)
          topR (notch-screw-row sideW sfe)))
  (setq tabs (cond ((not (notch-boxed-p nw g)) (notch-replan-tabs ch e one three))
                   ((not (notch-back-p corner)) (notch-replan-tabs ch e one three))
                   (full nil)
                   (T (notch-shift (notch-replan-tabs (- ch nh) e one three) nh))))
  (setq pins (notch-shift (notch-pin-columns run pin) off))
  (list (cons "TOP-SOCKETS" topS) (cons "BOTTOM-SOCKETS" botS)
        (cons "TOP-SCREWS" topR) (cons "BOTTOM-SCREWS" botR)
        (cons "BACK-TABS" tabs) (cons "PIN-COLUMNS" pins)))

;;;----------------------------------------
;;; THE BACK: cw x ch, x along the carcass x (from the LEFT face, seen from
;;; the front), y up. A FRONT notch never reaches it.
;;;----------------------------------------

(defun notch-back-fc (corner)
  (if (notch-left-p corner) "x0y0" "x1y0"))

(defun notch-back (cw ch nw nh corner)
  (if (notch-back-p corner)
    (notch-rect-outline cw ch nw (notch-hh ch nh) (notch-back-fc corner))
    (notch-plain-rect cw ch)))

(defun notch-back-dogbone (cw ch nw nh corner r)
  (if (notch-back-p corner)
    (notch-dogbone cw ch nw (notch-hh ch nh) (notch-back-fc corner) r)
    nil))

;;; Its joints in its ORIGINAL frame:
;;;   FAR-SOCKETS     y up the edge AWAY from the notch (the parent's)
;;;   NEAR-SOCKETS    y up the notch-side edge: full height none (it meets the
;;;                   RETURN, screwed); part height re-planned above the notch
;;;   TOP-SOCKETS     x along the top edge
;;;   BOTTOM-SOCKETS  x along the bottom edge
;;;   SCREWS          ((x y) ..): drawBACK's rows on the board that is left.
;;;                   Until 17.10.2026 the notch-side row G / 2 in from the
;;;                   notched edge (nearX) landed in the RETURN's end grain
;;;                   and was "the joint that holds it". D10, the owner: NO
;;;                   screw between the BACK and the box: that row is gone
;;;                   (full height: the whole column; part height: the run
;;;                   beside the notch). The far column, the rows above a
;;;                   part-height notch (into the side's own back edge) and
;;;                   the top and bottom rows stay.
(defun notch-back-joints (cw ch g nw nh corner / e below one three sfe S full hh
                          left back boxed farTabs nearTabs lo hi blo bhi topS botS
                          farX nearX upX scr)
  (setq e (notch-p "puzzle.tabCentresFromEnd")
        below (notch-p "puzzle.singleSocketBelow")
        one (notch-p "puzzle.singleTabAtOrBelow")
        three (notch-p "puzzle.middleTabBelow")
        sfe (notch-p "puzzle.screwFromEnd")
        S (notch-screw-axis g)
        full (notch-full-p ch nh)
        hh (notch-hh ch nh)
        left (notch-left-p corner)
        back (notch-back-p corner)
        boxed (notch-boxed-p nw g))
  (setq farTabs (notch-replan-tabs ch e one three))
  ;; the back's own extent: all of it, or what a full-height back notch leaves
  (if (and back full)
    (if left (setq lo nw hi cw) (setq lo 0.0 hi (- cw nw)))
    (setq lo 0.0 hi cw))
  ;; the bottom edge's extent: a back notch always reaches the bottom
  (if back
    (if left (setq blo nw bhi cw) (setq blo 0.0 bhi (- cw nw)))
    (setq blo 0.0 bhi cw))
  ;; the TOP/BOTTOM's back-edge tabs land here: their run starts g past the
  ;; RETURN (boxed) and is the parent's when unboxed (they never reach x < g)
  (if (and back boxed)
    (setq botS (notch-shift (notch-replan-sockets (- bhi blo (* 2.0 g)) e below) (+ blo g))
          topS (notch-shift (notch-replan-sockets (- hi lo (* 2.0 g)) e below) (+ lo g)))
    (setq botS (notch-shift (notch-replan-sockets (- cw (* 2.0 g)) e below) g)
          topS botS))
  (setq nearTabs (cond ((not back) farTabs)
                       ((not boxed) farTabs)
                       (full nil)
                       (T (notch-shift (notch-replan-tabs (- ch nh) e one three) nh))))
  (setq farX (if left (- cw S) S)
        nearX (if left (+ nw S) (- cw nw S))
        upX (if left S (- cw S))
        scr '())
  (foreach y (notch-rows-between-tabs 0.0 ch farTabs sfe)
    (setq scr (cons (list farX y) scr)))
  (cond
    ((or (not back) (not boxed))
      (foreach y (notch-rows-between-tabs 0.0 ch farTabs sfe)
        (setq scr (cons (list upX y) scr))))
    ;; D10 (17.10.2026): a full-height back notch's notched edge meets the
    ;; RETURN only, and gets NO row (it was (nearX y) over the whole height).
    (full nil)
    (T
      ;; D10: the run beside the notch (it was (notch-screw-row hh) at nearX)
      ;; gets no row; the side's own back edge above the notch keeps its rows.
      (foreach y (notch-rows-between-tabs nh ch nearTabs sfe)
        (setq scr (cons (list upX y) scr)))))
  (foreach x (notch-row-between lo hi g sfe)
    (setq scr (cons (list x (- ch S)) scr)))
  (foreach x (if (and back boxed) (notch-row-between blo bhi g sfe) (notch-row-between 0.0 cw g sfe))
    (setq scr (cons (list x S) scr)))
  (list (cons "FAR-SOCKETS" farTabs) (cons "NEAR-SOCKETS" nearTabs)
        (cons "TOP-SOCKETS" topS) (cons "BOTTOM-SOCKETS" botS)
        (cons "SCREWS" (reverse scr))))

;;;----------------------------------------
;;; THE BOX: STEP, RETURN, LID (section 2, D1, D2). Plain rectangles: no
;;; puzzle joint, no machined hole (readiness 'geometry'); fixed by the
;;; joiner (readiness 'manual'). Until 17.10.2026 the three *-screws routines
;;; below STATED screws on THE BACK SCREW ROW; D10 (the owner: "nie bedziemy
;;; tam wkrecac wkretow ... na ciastka ... teraz nic"): they answer nil. Their
;;; bodies stay below as the record of what was stated, behind the nil.
;;;----------------------------------------

;;; Where they stand, in plan and height:
;;;   (("RETURN" x0 y0 z0 x1 y1 z1) ("STEP" ...) ("LID" ...)), nil unboxed.
(defun notch-box-places (cw cd ch g nw nd nh corner / hh left back rx0 rx1 ry0 ry1
                         sx0 sx1 lx0 lx1 out)
  (if (not (notch-boxed-p nw g))
    nil
    (progn
      (setq hh (notch-hh ch nh)
            left (notch-left-p corner)
            back (notch-back-p corner)
            out '())
      (if left (setq rx0 nw rx1 (+ nw g)) (setq rx0 (- cw nw g) rx1 (- cw nw)))
      ;; 15.10.2026: at a back corner the RETURN starts at the STEP's back
      ;; face (cd - nd), a board shorter: the STEP covers its end.
      (if back (setq ry0 (- cd nd) ry1 (- cd g)) (setq ry0 0.0 ry1 nd))
      (setq out (cons (list "RETURN" rx0 ry0 0.0 rx1 ry1 hh) out))
      (if back
        (progn
          ;; ...and the STEP runs a board past the notch, over the RETURN's end.
          (if left (setq sx0 0.0 sx1 (+ nw g)) (setq sx0 (- cw nw g) sx1 cw))
          (setq out (cons (list "STEP" sx0 (- cd nd g) 0.0 sx1 (- cd nd) hh) out))))
      (if (not (notch-full-p ch nh))
        (progn
          (if left (setq lx0 g lx1 (+ nw g)) (setq lx0 (- cw nw g) lx1 (- cw g)))
          (setq out (cons (list "LID" lx0 (- cd nd g) hh lx1 ry1 (+ hh g)) out))))
      (reverse out))))

;;; THE STEP: (nw + g) x hh, back corners only (15.10.2026: a board wider,
;;; over the RETURN's end).
(defun notch-step (ch g nw nh corner)
  (if (and (notch-boxed-p nw g) (notch-back-p corner))
    (list (+ nw g) (notch-hh ch nh))
    nil))

;;; Its screws, frame x along the carcass x from the STEP's own left end,
;;; y up: into the side's end and into the RETURN's end (a column G / 2 in
;;; from each end: S and nw + S, whichever is which), and into the BOTTOM's
;;; (and at full height the TOP's) notch edge over the span between them
;;; (g .. nw). A part-height STEP is screwed DOWN INTO by the LID instead of
;;; into a TOP.
(defun notch-step-screws (ch g nw nh corner)
  nil)

;;; The record (D10): what notch-step-screws stated until 17.10.2026.
(defun notch-step-screws-stated-until-1710 (ch g nw nh corner / S hh sfe full out)
  (if (null (notch-step ch g nw nh corner))
    nil
    (progn
      (setq S (notch-screw-axis g)
            hh (notch-hh ch nh)
            sfe (notch-p "puzzle.screwFromEnd")
            full (notch-full-p ch nh)
            out '())
      (foreach y (notch-screw-row hh sfe)
        (setq out (cons (list S y) out))
        (setq out (cons (list (+ nw S) y) out)))
      (foreach x (notch-shift (notch-screw-row (- nw g) sfe) g)
        (setq out (cons (list x S) out))
        (if full (setq out (cons (list x (- hh S)) out))))
      (reverse out))))

;;; THE RETURN: (nd - g) x hh at a back corner (the STEP covers its end,
;;; 15.10.2026), nd x hh at a front one.
(defun notch-return (ch g nw nd nh corner)
  (if (notch-boxed-p nw g)
    (list (if (notch-back-p corner) (- nd g) nd) (notch-hh ch nh))
    nil))

;;; Its screws, frame x along the depth from the RETURN's FRONT end, y up:
;;; into the BOTTOM's (and at full height the TOP's) notch edge along its
;;; own length. It is held to the STEP by the STEP's own column into its
;;; end (notch-step-screws), so it carries none of its own there.
(defun notch-return-screws (ch g nw nd nh corner)
  nil)

;;; The record (D10): what notch-return-screws stated until 17.10.2026.
(defun notch-return-screws-stated-until-1710 (ch g nw nd nh corner / S hh sfe full out len)
  (if (null (notch-return ch g nw nd nh corner))
    nil
    (progn
      (setq S (notch-screw-axis g)
            hh (notch-hh ch nh)
            sfe (notch-p "puzzle.screwFromEnd")
            full (notch-full-p ch nh)
            len (car (notch-return ch g nw nd nh corner))
            out '())
      (foreach x (notch-screw-row len sfe)
        (setq out (cons (list x S) out))
        (if full (setq out (cons (list x (- hh S)) out))))
      (reverse out))))

;;; THE LID: nw x nd, part height only, at z = nh .. nh + g.
(defun notch-lid (ch g nw nd nh)
  (if (and (notch-boxed-p nw g) (not (notch-full-p ch nh)))
    (list nw nd)
    nil))

;;; Its screws DOWN into the RETURN and (a back corner) the STEP. Frame: x
;;; along the carcass x from the LID's left end, y along the depth from its
;;; FRONT end. Its edges against the side and the back are the joiner's.
;;; 15.10.2026: at a back corner the RETURN lies under the LID from y = g
;;; (behind the STEP) and the STEP under its whole front edge (0 .. nw).
(defun notch-lid-screws (ch g nw nd nh corner)
  nil)

;;; The record (D10): what notch-lid-screws stated until 17.10.2026.
(defun notch-lid-screws-stated-until-1710 (ch g nw nd nh corner / S sfe out retX back)
  (if (null (notch-lid ch g nw nd nh))
    nil
    (progn
      (setq S (notch-screw-axis g)
            sfe (notch-p "puzzle.screwFromEnd")
            back (notch-back-p corner)
            out '())
      (setq retX (if (notch-left-p corner) (- nw S) S))
      (foreach y (if back (notch-shift (notch-screw-row (- nd g) sfe) g) (notch-screw-row nd sfe))
        (setq out (cons (list retX y) out)))
      (if back
        (foreach x (notch-screw-row nw sfe)
          (setq out (cons (list x S) out))))
      (reverse out))))

;;;----------------------------------------
;;; SHELVES: the same keep-out, the same outline law, the same dog bone.
;;; `shelf` is the shelf's plan rectangle (x0 y0 x1 y1) in the carcass plan,
;;; `clr` its sliding clearance off a side (half the parent's width
;;; clearance for an adjustable shelf, 0 for a FIX one), `zs` its underside.
;;;----------------------------------------

;;; The parent's adjustable shelf, in plan: W - 2G - 4 wide, 20 back from
;;; the front, against the back (KIT_BUD szerSHELF / wysSHELF).
(defun notch-shelf-rect (cw cd g / wc dc)
  (setq wc (notch-p "carcass.shelfWidthClearance")
        dc (notch-p "carcass.shelfDepthClearance"))
  (list (+ g (/ wc 2.0)) dc (- cw g (/ wc 2.0)) (- cd g)))

;;; Does a shelf at `zs` cross the notch's height? Full height: always. Part
;;; height: anywhere below the LID's top (a shelf level with the LID takes
;;; the outline too, and the outline already clears the LID).
(defun notch-shelf-crosses-p (zs g ch nh)
  (or (notch-full-p ch nh) (< zs (+ nh g))))

(defun notch-shelf-cut (cw cd g nw nd corner clr shelf)
  (notch-plan-cut shelf (notch-keepout cw cd g nw nd corner clr)))

;;; In the SHELF's own plan frame (x from its left edge, y from its front).
(defun notch-shelf-outline (cw cd g nw nd corner clr shelf)
  (notch-cut-outline shelf (notch-shelf-cut cw cd g nw nd corner clr shelf)))

(defun notch-shelf-dogbone (cw cd g nw nd corner clr shelf r)
  (notch-cut-dogbone (notch-shelf-cut cw cd g nw nd corner clr shelf) r))

;;;----------------------------------------
;;; THE PLINTH: the strip set `setback` behind the front face, `pt` thick.
;;; Where the notch's own footprint (the obstacle, from the floor) crosses
;;; the strip, the plinth loses nw at that end: in practice a FRONT notch
;;; deeper than the setback. Returns (x0 x1), its extent across the unit in
;;; the carcass x; (0 cw) untouched.
;;;----------------------------------------

(defun notch-plinth (cw cd nw nd corner setback pt / ny0 ny1)
  (if (notch-back-p corner)
    (setq ny0 (- cd nd) ny1 cd)
    (setq ny0 0.0 ny1 nd))
  (if (and (< ny0 (+ setback pt)) (> ny1 setback))
    (if (notch-left-p corner) (list nw cw) (list 0.0 (- cw nw)))
    (list 0.0 cw)))

;;;========================================
;;; G. THE DRILLING THE NOTCH REACHES (D7, D8)
;;;========================================

;;; Does a hole of radius `rad` at (x y) reach the part of a board the notch
;;; took? Board frame, the board's bw x bh and its notch nw x nh at `fc`.
(defun notch-hole-in-p (x y rad bw bh nw nh fc / rx0 rx1 ry0 ry1)
  (if (notch-fc-x0 fc) (setq rx0 0.0 rx1 nw) (setq rx0 (- bw nw) rx1 bw))
  (if (notch-fc-y0 fc) (setq ry0 0.0 ry1 nh) (setq ry0 (- bh nh) ry1 bh))
  (and (> (+ x rad) rx0) (< (- x rad) rx1)
       (> (+ y rad) ry0) (< (- y rad) ry1)))

;;; The words for a hinge or a runner the notch reaches (D7).
(defun notch-hole-refusal (kind board)
  (strcat "NOTCH: the " kind " drilling of " board
          " falls in the notch, and a " kind " cannot be fixed to air."
          " Move the notch, or hang the " kind " on the other side."))

;;; Does anything else the parent puts in the carcass, at plan `rect`
;;; (x0 y0 x1 y1) and from height z0, cross the notch and its box (D8)?
(defun notch-crosses-p (cw cd ch g nw nd nh corner rect z0)
  (and (notch-overlap-p rect (notch-keepout cw cd g nw nd corner 0.0))
       (< z0 (+ (notch-hh ch nh)
                (if (or (notch-full-p ch nh) (not (notch-boxed-p nw g))) 0.0 g)))))

;;; D3: does an UNBOXED rebate eat a joint of the side? A back-edge tab
;;; whose dog bone reaches into the rebate's height at a back corner, or a
;;; top or bottom socket whose pocket reaches into the rebate's length.
(defun notch-rebate-eats-p (cd ch g nw nd nh corner / e below inset one three bone half
                            sideW hh lo hi hit)
  (if (notch-boxed-p nw g)
    nil
    (progn
      (setq e (notch-p "puzzle.tabCentresFromEnd")
            below (notch-p "puzzle.singleSocketBelow")
            inset (notch-joint-inset cd e (notch-p "puzzle.singleJointMaxDepth"))
            one (notch-p "puzzle.singleTabAtOrBelow")
            three (notch-p "puzzle.middleTabBelow")
            bone (notch-p "puzzle.dogboneHalfHeight")
            half (notch-p "puzzle.socketHalfWidth")
            sideW (- cd g)
            hh (notch-hh ch nh)
            hit nil)
      (if (notch-back-p corner)
        (setq lo (- sideW nd) hi sideW)
        (setq lo 0.0 hi nd))
      (if (notch-back-p corner)
        (foreach c (notch-replan-tabs ch e one three)
          (if (< (- c bone) hh) (setq hit T))))
      (foreach c (notch-replan-sockets sideW inset below)
        (if (and (> (+ c half) lo) (< (- c half) hi)) (setq hit T)))
      hit)))

;;;========================================
;;; H. THE REFUSALS (Room refuses first; nothing is clipped silently)
;;;========================================
;;;
;;; nil when the notch can be cut, else the sentence the Check prints, naming
;;; the board.

(defun notch-refusal (cw cd ch g nw nd nh corner / bone minEdge sideW tw side)
  (setq bone (notch-p "puzzle.dogboneHalfHeight")
        minEdge (notch-min-joint-edge bone g)
        sideW (- cd g)
        tw (- cw (* 2.0 g)))
  (setq side (if (notch-corner-ok corner) (notch-side-name corner) "the side"))
  (cond
    ((not (notch-corner-ok corner))
      "NOTCH: the corner is BL, BR, FL or FR.")
    ((or (<= nw 0.0) (<= nd 0.0))
      "NOTCH: the width and the depth must both be more than 0.")
    ((< nh 0.0)
      "NOTCH: the height cannot be below 0 (0 is the full height).")
    ((and (not (notch-full-p ch nh)) (> (+ nh g) (- ch g)))
      "NOTCH: a part-height notch must leave its LID room under the TOP. Make it full height, or lower it.")
    ((and (notch-boxed-p nw g) (< (- tw nw) minEdge))
      "NOTCH: the notch and its RETURN take the TOP and the BOTTOM across. Make it narrower.")
    ((< (- sideW nd) minEdge)
      (strcat "NOTCH: what is left of " side " cannot hold a joint. Make the notch shallower."))
    ((and (notch-boxed-p nw g) (notch-back-p corner) (not (notch-full-p ch nh))
          (< (- ch nh) minEdge))
      (strcat "NOTCH: the back edge of " side " above the notch cannot hold a tab. Make it full height, or lower it."))
    ((notch-rebate-eats-p cd ch g nw nd nh corner)
      (strcat "NOTCH: a notch narrower than the board is a rebate in " side
              ", and this one eats a joint. Make it at least as wide as the board (it is then boxed), or smaller."))
    (T nil)))

;;;========================================
;;; I. NUMBERS - THE GOLDEN CASE (fixtures/golden-notch.json)
;;;========================================
;;;
;;; CLAUDE.md F7: "a BUD 600 with a 200 x 200 full-height BL notch".
;;; KIT_BUD_FULL defaults: W 600, D 558, H 770, G 18 (golden-bud.json BUD-A:
;;; front 25, 1 shelf, hinge L). Notch BL, nw 200, nd 200, nh 0 = FULL.
;;; Cutter r 4 (cnc.toolDiameter 8). Joint inset 95 (D 558 is over 300).
;;; Every point list below is anticlockwise, once round.
;;;
;;; KEEP-OUT (carcass plan, x from the left face, y from the front face):
;;;   x 0..218, y 340..558   the notch x 0..200, y 358..558, plus the STEP
;;;                          (y 340..358) and the RETURN (x 200..218)
;;; The obstacle gets x 0..200, y 358..558, full height: 200 x 200 clear.
;;;
;;; BOARD      PARENT       NOTCHED
;;; BUL        540 x 770    340 x 770, a rectangle (BUL frame, x from FRONT):
;;;                         (0 0) (340 0) (340 770) (0 770); no dog bone
;;;                         (cut through, no re-entrant corner)
;;; BUR        540 x 770    unchanged
;;; TOP        564 x 540    564 x 540 less 200 x 200 at the rear-left
;;; BOTTOM     564 x 540    the same as TOP in plan; its drawing is the TOP's
;;;                         mirror image (D11, 17.10.2026)
;;;   plan frame (x from BUL's inner face, y from the front edge):
;;;     (0 0) (564 0) (564 540) (200 540) (200 340) (0 340)
;;;   BOTTOM, drawTOP_ROT90 frame (x from the BACK edge, y from the BUL edge):
;;;     (540 0) (540 564) (0 564) (0 200) (200 200) (200 0)
;;;     the corner "x0y0"
;;;   TOP, drawn from its UNDERSIDE (D11: x from the BACK edge, y from the BUR
;;;   edge; the ROT90 points with y' = 564 - y, read backwards):
;;;     (200 564) (200 364) (0 364) (0 0) (540 0) (540 564)
;;;     the corner "x0y1"
;;;   CORNER MARK (D9, 17.10.2026; until then a dog bone, circle r 4 at
;;;   (197.1716 342.8284) plan, (197.1716 197.1716) ROT90): the corner
;;;   (200 340) plan = (200 200) ROT90 = (200 364) on the TOP; D12 (16:10):
;;;   ONE open L on CORNER_4MM, 40 each arm, walked the outline's way:
;;;     plan   (200 380) -> (200 340) -> (160 340)
;;;     BOTTOM (160 200) -> (200 200) -> (200 160)
;;;     TOP    (200 404) -> (200 364) -> (160 364)
;;;   (until 16:10 two legs each leaving the corner: (200 200)-(200 160) and
;;;   (200 200)-(160 200) on the BOTTOM)
;;;   area 0.305 -> 0.265 m2 (264560 mm2)
;;; BACK       600 x 770    400 x 770, carcass x 200..600
;;;   original frame (200 0) (600 0) (600 770) (200 770)
;;;   own frame      (0 0) (400 0) (400 770) (0 770); no dog bone
;;; STEP       -            218 x 770, carcass x 0..218, y 340..358, z 0..770
;;;                         (15.10.2026: a board wider, over the RETURN's end)
;;; RETURN     -            182 x 770, carcass x 200..218, y 358..540, z 0..770
;;;                         (15.10.2026: a board shorter, behind the STEP)
;;; LID        -            none (full height)
;;; SHELF-1    560 x 520    560 x 520 less 200 x 200 at the rear-left
;;;   shelf frame (2 clear of the RETURN as of BUL):
;;;     (0 0) (560 0) (560 520) (200 520) (200 320) (0 320)
;;;   CORNER MARK (D9, D12): corner (200 320); one open L on CORNER_4MM
;;;   (200 360) -> (200 320) -> (160 320) (was a dog bone at (197.1716 322.8284);
;;;   until 16:10 two legs leaving the corner)
;;; PLINTH     600          untouched (a back notch is behind its line 50..68)
;;;
;;; WHICH JOINTS MOVE (the PROBE table F7 asks for):
;;;
;;; BOARD, EDGE                      PARENT             NOTCHED
;;; BUL top sockets (x from front)   95, 445            95, 245   (445 -> 245)
;;; BUL bottom sockets               95, 445            95, 245   (445 -> 245)
;;; BUL top screw row                50, 270, 490       50, 170, 290
;;; BUL bottom screw row             50, 270, 490       50, 170, 290
;;; BUL back-edge tabs (y)           95, 385, 675       NONE (meets the STEP)
;;; BUL back-edge dog bones          3 x (60 x 18)      NONE
;;; BUL shelf-pin columns            70, 470            70, 270   (470 -> 270)
;;; BUL hinge holes (x 37)           84/116 454/486 654/686   unchanged
;;; TOP/BOTTOM tabs into BUL (y)     95, 445            95, 245   (445 -> 245)
;;; TOP/BOTTOM tabs into BUR (y)     95, 445            95, 445   unchanged
;;; TOP/BOTTOM tabs into BACK (x)    95, 469            295, 469  (95 -> 295)
;;; BACK sockets, notch edge (y)     95, 385, 675       NONE (meets the RETURN)
;;; BACK sockets, far edge (y)       95, 385, 675       95, 385, 675
;;; BACK top/bottom sockets          113, 487           313, 487  (113 -> 313)
;;;   (carcass x; own frame 113, 287)
;;; BACK side screw rows (y)         50, 240, 530, 720  far edge (x 591) unchanged;
;;;                                  the notch-edge row (carcass x 209, into
;;;                                  the RETURN's end) is GONE (D10, 17.10.2026)
;;; BACK top/bottom screw rows       68, 300, 532       268, 400, 532
;;;   (carcass x; own frame 68, 200, 332)
;;;
;;; THE BOX'S FIXING: NONE STATED (D10, 17.10.2026: biscuits by hand, a
;;; Lamello one day, nothing drawn). Until that morning the file stated:
;;; STEP (x from its left end, y up)    into BUL's end: x 9, y 50 385 720
;;;                                     into the RETURN's end: x 209, y 50 385 720
;;;                                     into TOP: x 68 109 150, y 761
;;;                                     into BOTTOM: x 68 109 150, y 9
;;; RETURN (x from its front end, y up) into TOP: x 50 91 132, y 761
;;;                                     into BOTTOM: x 50 91 132, y 9
;;;                                     (no column of its own into the STEP:
;;;                                     the STEP's column holds it, 15.10.2026)
;;;
;;; The engine meets this with its own calls: sidePanelGeometry on w 340
;;; with backTabs off gives BUL's sockets and screws exactly; backPanelGeometry
;;; on w 400 gives the BACK's top, bottom and screws exactly, less its
;;; notch-edge sockets.

;;;========================================
;;; J. DRAWING (the command draws what the routines return, nothing more)
;;;========================================

(defun notch-offset-pts (pts dx dy)
  (mapcar '(lambda (p) (list (+ dx (car p)) (+ dy (cadr p)))) pts))

;;; THE CORNER_4MM LAYER (D9). COMMON's createCNCLayers predates it and is
;;; untouched (CLAUDE.md FROZEN 2), so this file makes the layer itself when
;;; it is missing: ACI 53, the next free number after RECESS_WINDOW's 52
;;; (engine/cnc/layers.js carries the same name, colour and kind 'mark').
(defun notch-ensure-corner-layer ( / )
  (if (null (tblsearch "LAYER" "CORNER_4MM"))
    (command "._LAYER" "_N" "CORNER_4MM" "_C" "53" "CORNER_4MM" "")))

;;; The corner marks of one board, drawn: open two-point lines on CORNER_4MM,
;;; the owner's own 4 mm program ("wtedy ja wytne ten korner").
;;; An OPEN LWPOLYLINE (COMMON's makePolyline writes a closed one, 70 = 1).
(defun notch-open-pline (layer pts / entData pt)
  (setq entData (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 layer)
                      '(100 . "AcDbPolyline") (cons 90 (length pts)) '(70 . 0)))
  (foreach pt pts (setq entData (append entData (list (cons 10 pt)))))
  (entmake entData))

;;; D12: each mark is one open L (a v b), drawn as ONE polyline, in its order.
(defun notch-draw-corner-marks (x0 y0 marks / m)
  (if marks (notch-ensure-corner-layer))
  (foreach m marks
    (notch-open-pline "CORNER_4MM" (notch-offset-pts m x0 y0))))

;;; One board: the PARENT's rectangle on NOTCH_MANUAL (grey, a note layer the
;;; machine never reads), the NOTCHED outline on OUTLINE, its CORNER MARKS on
;;; CORNER_4MM (D9, 17.10.2026; `db`, the dog bone, is no longer drawn: the
;;; argument stays so every call reads as before), and its name.
(defun notch-draw-board (x0 y0 bw bh pts db label)
  (drawRect "NOTCH_MANUAL" x0 y0 (+ x0 bw) (+ y0 bh))
  (if pts (makePolyline "OUTLINE" (notch-offset-pts pts x0 y0)))
  (if pts (notch-draw-corner-marks x0 y0 (notch-corner-marks pts (notch-p "cnc.cornerMarkLeg"))))
  (drawText "UNIT_NUMBER" (+ x0 (/ bw 2.0)) (+ y0 (/ bh 2.0)) 30.0 label))

;;; Joint centres and screw positions, as marks on NOTCH_MANUAL. The socket
;;; and tab SHAPES are COMMON's and the engine's (drawBUL, puzzle.js); this
;;; file states where they go and draws no pocket of its own.
(defun notch-draw-marks (x0 y0 pts rad)
  (foreach p pts
    (drawCircle "NOTCH_MANUAL" (+ x0 (car p)) (+ y0 (cadr p)) rad)))

(defun notch-mirror-x (x bw bur)
  (if bur (- bw x) x))

(defun notch-side-marks (sj sideW ch bur / out)
  (setq out '())
  (foreach x (cdr (assoc "TOP-SOCKETS" sj))
    (setq out (cons (list (notch-mirror-x x sideW bur) ch) out)))
  (foreach x (cdr (assoc "BOTTOM-SOCKETS" sj))
    (setq out (cons (list (notch-mirror-x x sideW bur) 0.0) out)))
  (foreach y (cdr (assoc "BACK-TABS" sj))
    (setq out (cons (list (notch-mirror-x sideW sideW bur) y) out)))
  (reverse out))

(defun notch-top-marks (tj tw sideW / out)
  (setq out '())
  (foreach y (cdr (assoc "LEFT" tj)) (setq out (cons (list 0.0 y) out)))
  (foreach y (cdr (assoc "RIGHT" tj)) (setq out (cons (list tw y) out)))
  (foreach x (cdr (assoc "BACK" tj)) (setq out (cons (list x sideW) out)))
  (reverse out))

(defun notch-back-marks (bj cw ch corner / out farX nearX)
  (setq out '()
        farX (if (notch-left-p corner) cw 0.0)
        nearX (if (notch-left-p corner) 0.0 cw))
  (foreach y (cdr (assoc "FAR-SOCKETS" bj)) (setq out (cons (list farX y) out)))
  (foreach y (cdr (assoc "NEAR-SOCKETS" bj)) (setq out (cons (list nearX y) out)))
  (foreach x (cdr (assoc "TOP-SOCKETS" bj)) (setq out (cons (list x ch) out)))
  (foreach x (cdr (assoc "BOTTOM-SOCKETS" bj)) (setq out (cons (list x 0.0) out)))
  (reverse out))

;;; "95, 245" for a list, "none" for nil.
(defun notch-fmt (lst / s)
  (setq s "")
  (foreach v lst
    (setq s (strcat s (if (= s "") "" ", ") (rtos v 2 1))))
  (if (= s "") "none" s))

;;; One summary line, down the block. Reads and moves the caller's sumX,
;;; sumY and lineH (AutoLISP binds dynamically).
(defun notch-say (txt)
  (drawTextL "SUMMARY" sumX sumY lineH txt)
  (princ (strcat "\n  " txt))
  (setq sumY (- sumY (* lineH 1.2))))

;;;========================================
;;; K. MAIN COMMAND
;;;========================================

(defun c:NOTCH_FULL ( / kit g cw cd ch corner nw nd nh tool r pt x0 y0 cx odstep msg rl
                       sideW tw hh full boxed side bur e below inset one three
                       sj tj bj oldS oldTabs oldTop oldBack shelf sh
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

  ;; === INPUT: the parent carcass ===
  (initget "B W U")
  (setq kit (getkword "\nParent kit [B=BUD / W=WARDROBE / U=WUD wall unit] <B>: "))
  (if (null kit) (setq kit "B"))

  (setq g (getreal "\nBoard THICKNESS [mm] (18=standard, 22=heavy) <18>: "))
  (if (or (null g) (<= g 0.0)) (setq g 18.0))

  (setq cw (getreal "\nCabinet WIDTH [mm] <600>: "))
  (if (or (null cw) (<= cw 0.0)) (setq cw 600.0))

  (setq cd (getreal (if (= kit "W") "\nCabinet DEPTH [mm] <578>: " "\nCabinet DEPTH [mm] <558>: ")))
  (if (or (null cd) (<= cd 0.0)) (setq cd (if (= kit "W") 578.0 558.0)))

  (setq ch (getreal (if (= kit "W") "\nCabinet HEIGHT [mm] <2150>: " "\nCabinet HEIGHT [mm] <770>: ")))
  (if (or (null ch) (<= ch 0.0)) (setq ch (if (= kit "W") 2150.0 770.0)))

  ;; === INPUT: the notch (the owner's "podajesz wysokosc, glebokosc, szerokosc") ===
  (initget "BL BR FL FR")
  (setq corner (getkword "\nCorner to CUT [BL/BR/FL/FR] <BL>: "))
  (if (null corner) (setq corner "BL"))

  (setq nw (getreal "\nNotch WIDTH along the back [mm] <200>: "))
  (if (null nw) (setq nw (notch-p "notch.defaults.width")))

  (setq nd (getreal "\nNotch DEPTH into the carcass [mm] <200>: "))
  (if (null nd) (setq nd (notch-p "notch.defaults.depth")))

  (setq nh (getreal "\nNotch HEIGHT [mm] (0 = full height) <0>: "))
  (if (null nh) (setq nh (notch-p "notch.defaults.height")))

  (setq tool (getreal "\nCutter DIAMETER [mm] <8>: "))
  (if (or (null tool) (<= tool 0.0)) (setq tool (notch-p "cnc.toolDiameter")))
  (setq r (notch-cutter-radius tool))

  ;; === ROOM REFUSES FIRST ===
  (setq msg (notch-refusal cw cd ch g nw nd nh corner))
  (if msg
    (princ (strcat "\n" msg))
    (progn
      (setq pt (getpoint "\nInsertion point for the notched boards: "))
      (if (null pt)
        (princ "\nNo point selected.")
        (progn
          (createViewLayers)
          (createCNCLayers)
          (command "._LAYER" "_N" "NOTCH_MANUAL" "_C" "8" "NOTCH_MANUAL" "")

          (setq x0 (car pt) y0 (cadr pt) cx x0 odstep 50.0)
          (setq sideW (- cd g)
                tw (- cw (* 2.0 g))
                hh (notch-hh ch nh)
                full (notch-full-p ch nh)
                boxed (notch-boxed-p nw g)
                side (notch-side-name corner)
                bur (not (notch-left-p corner)))
          (setq e (notch-p "puzzle.tabCentresFromEnd")
                below (notch-p "puzzle.singleSocketBelow")
                inset (notch-joint-inset cd e (notch-p "puzzle.singleJointMaxDepth"))
                one (notch-p "puzzle.singleTabAtOrBelow")
                three (notch-p "puzzle.middleTabBelow"))

          ;; 1. THE SIDE at the corner, in its own LISP frame
          (setq sj (notch-side-joints cd ch g nw nd nh corner))
          (notch-draw-board cx y0 sideW ch (notch-side cd ch g nw nd nh corner)
                            (notch-side-dogbone cd ch g nw nd nh corner r) side)
          (if (not boxed)
            (progn
              (setq sh (notch-side-rebate cd ch g nw nd nh corner))
              (drawRect "NOTCH_MANUAL" (+ cx (car sh)) (+ y0 (cadr sh))
                        (+ cx (caddr sh)) (+ y0 (cadddr sh)))))
          (notch-draw-marks cx y0 (notch-side-marks sj sideW ch bur) 4.0)
          (setq cx (+ cx sideW odstep))

          ;; 2. THE TOP (full height) and the BOTTOM, in PLAN
          (setq tj (notch-top-joints cw cd g nw nd corner))
          (if full
            (progn
              (notch-draw-board cx y0 tw sideW (notch-top-outline cw cd g nw nd corner)
                                (notch-top-dogbone cw cd g nw nd corner r) "TOP")
              (notch-draw-marks cx y0 (notch-top-marks tj tw sideW) 4.0)
              (setq cx (+ cx tw odstep))))
          (notch-draw-board cx y0 tw sideW (notch-top-outline cw cd g nw nd corner)
                            (notch-top-dogbone cw cd g nw nd corner r) "BOTTOM")
          (notch-draw-marks cx y0 (notch-top-marks tj tw sideW) 4.0)
          (setq cx (+ cx tw odstep))

          ;; 3. THE BACK (a back corner)
          (setq bj (notch-back-joints cw ch g nw nh corner))
          (if (notch-back-p corner)
            (progn
              (notch-draw-board cx y0 cw ch (notch-back cw ch nw nh corner)
                                (notch-back-dogbone cw ch nw nh corner r) "BACK")
              (notch-draw-marks cx y0 (notch-back-marks bj cw ch corner) 4.0)
              (notch-draw-marks cx y0 (cdr (assoc "SCREWS" bj)) 1.5)
              (setq cx (+ cx cw odstep))))

          ;; 4. THE BOX: STEP, RETURN, LID, with the joiner's screw marks
          (if (notch-step ch g nw nh corner)
            (progn
              (notch-draw-board cx y0 (+ nw g) hh (notch-plain-rect (+ nw g) hh) nil "STEP")
              (notch-draw-marks cx y0 (notch-step-screws ch g nw nh corner) 1.5)
              (setq cx (+ cx nw g odstep))))
          (if (notch-return ch g nw nd nh corner)
            (progn
              (setq rl (car (notch-return ch g nw nd nh corner)))
              (notch-draw-board cx y0 rl hh (notch-plain-rect rl hh) nil "RETURN")
              (notch-draw-marks cx y0 (notch-return-screws ch g nw nd nh corner) 1.5)
              (setq cx (+ cx rl odstep))))
          (if (notch-lid ch g nw nd nh)
            (progn
              (notch-draw-board cx y0 nw nd (notch-plain-rect nw nd) nil "LID")
              (notch-draw-marks cx y0 (notch-lid-screws ch g nw nd nh corner) 1.5)
              (setq cx (+ cx nw odstep))))

          ;; 5. A SHELF of the parent, in plan (it crosses at full height, and
          ;;    at part height wherever it stands inside the notch)
          (setq shelf (notch-shelf-rect cw cd g))
          (notch-draw-board cx y0 (- (caddr shelf) (car shelf)) (- (cadddr shelf) (cadr shelf))
                            (notch-shelf-outline cw cd g nw nd corner
                              (/ (notch-p "carcass.shelfWidthClearance") 2.0) shelf)
                            (notch-shelf-dogbone cw cd g nw nd corner
                              (/ (notch-p "carcass.shelfWidthClearance") 2.0) shelf r)
                            "SHELF")
          (setq cx (+ cx (- (caddr shelf) (car shelf)) odstep))

          ;;========================================
          ;; SUMMARY TEXT BLOCK
          ;;========================================
          (setq sumX (+ cx 300.0) sumY (+ y0 ch) lineH 30.0)
          (setq oldS (notch-replan-sockets sideW inset below)
                oldTabs (notch-replan-tabs ch e one three)
                oldTop (notch-replan-sockets sideW inset below)
                oldBack (notch-replan-sockets tw e below))
          (notch-say (strcat "NOTCH " corner " " (rtos nw 2 0) " x " (rtos nd 2 0) " x "
                             (if full "FULL" (rtos nh 2 0))
                             " on " (cond ((= kit "W") "KIT_WARDROBE") ((= kit "U") "KIT_WUD") (T "KIT_BUD")) " "
                             (rtos cw 2 0) " x " (rtos ch 2 0) " x " (rtos cd 2 0)
                             ", G=" (rtos g 2 0) ", r=" (rtos r 2 2)))
          (notch-say "---------")
          (notch-say (strcat side ": " (rtos sideW 2 0) " x " (rtos ch 2 0) " -> "
                             (cond ((not boxed) (strcat "rebate " (rtos nd 2 0) " x " (rtos hh 2 0)
                                                        ", " (rtos nw 2 0) " deep"))
                                   (full (strcat (rtos (- sideW nd) 2 0) " x " (rtos ch 2 0)))
                                   (T (strcat "less " (rtos nd 2 0) " x " (rtos nh 2 0))))))
          (notch-say (strcat "TOP: " (if (and full boxed)
                                       (strcat (rtos tw 2 0) " x " (rtos sideW 2 0) " less "
                                               (rtos nw 2 0) " x " (rtos nd 2 0))
                                       "unchanged")))
          (notch-say (strcat "BOTTOM: " (if boxed
                                          (strcat (rtos tw 2 0) " x " (rtos sideW 2 0) " less "
                                                  (rtos nw 2 0) " x " (rtos nd 2 0))
                                          "unchanged")))
          (notch-say (strcat "BACK: " (cond ((not (notch-back-p corner)) "unchanged")
                                            (full (strcat (rtos (- cw nw) 2 0) " x " (rtos ch 2 0)))
                                            (T (strcat (rtos cw 2 0) " x " (rtos ch 2 0) " less "
                                                       (rtos nw 2 0) " x " (rtos nh 2 0))))))
          (if (notch-step ch g nw nh corner)
            (notch-say (strcat "STEP: " (rtos (+ nw g) 2 0) " x " (rtos hh 2 0) " (fixing manual)")))
          (if (notch-return ch g nw nd nh corner)
            (notch-say (strcat "RETURN: " (rtos (car (notch-return ch g nw nd nh corner)) 2 0) " x " (rtos hh 2 0) " (fixing manual)")))
          (if (notch-lid ch g nw nd nh)
            (notch-say (strcat "LID: " (rtos nw 2 0) " x " (rtos nd 2 0) " (fixing manual)")))
          (notch-say "---------")
          (notch-say (strcat side " top sockets: " (notch-fmt oldS) " -> "
                             (notch-fmt (cdr (assoc "TOP-SOCKETS" sj)))))
          (notch-say (strcat side " bottom sockets: " (notch-fmt oldS) " -> "
                             (notch-fmt (cdr (assoc "BOTTOM-SOCKETS" sj)))))
          (notch-say (strcat side " back tabs: " (notch-fmt oldTabs) " -> "
                             (notch-fmt (cdr (assoc "BACK-TABS" sj)))))
          (notch-say (strcat side " pin columns: "
                             (notch-fmt (notch-pin-columns sideW (notch-p "shelfHoles.columnFromEdge")))
                             " -> " (notch-fmt (cdr (assoc "PIN-COLUMNS" sj)))))
          (notch-say (strcat "BOTTOM tabs into " side ": " (notch-fmt oldTop) " -> "
                             (notch-fmt (cdr (assoc (if bur "RIGHT" "LEFT") tj)))))
          (notch-say (strcat "BOTTOM tabs into BACK: " (notch-fmt oldBack) " -> "
                             (notch-fmt (cdr (assoc "BACK" tj)))))
          (notch-say (strcat "BACK bottom sockets: " (notch-fmt (notch-shift oldBack g)) " -> "
                             (notch-fmt (cdr (assoc "BOTTOM-SOCKETS" bj)))))
          (notch-say "---------")
          (drawTextLC "SUMMARY" sumX sumY lineH "Property of Skylon Joinery" 6)
          (princ "\nNotched boards drawn.")))))

  ;; Restore state
  (if _oldClayer  (setvar "CLAYER"  _oldClayer))
  (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
  (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
  (setq *error* _olderr)
  (princ))

(princ "\nKIT_NOTCH loaded. Type NOTCH_FULL to run.")
(princ)
