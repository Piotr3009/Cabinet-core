;;;========================================
;;; KIT_NOTCH.lsp
;;; The CORNER NOTCH - a MODIFIER on the KIT_BUD, KIT_WARDROBE and (since
;;; 15.10.2026) KIT_WUD and KIT_BUDTALL boards
;;; Commands: NOTCH_FULL (the corner notch), EDGENOTCH_FULL (the edge notch, D22)
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
;;; (a box crossing the corner at mid height) were NOT in this file: the
;;; owner asked for both the same night ("a co jak w poziomie mamy jakas
;;; przeszkode box naprzyklad powinno byc tak mozliwosc"); they were named
;;; in the PR as the next step, with their geometry (the TOP cut instead of
;;; the BOTTOM, a FLOOR board under the box as the LID is over it). The one
;;; from the TOP is here since 18.10.2026 (D21, a NEGATIVE nh); the WINDOW
;;; notch is still not.
;;; A rebate along a whole horizontal EDGE of the side elevation (a
;;; skirting, a coving, a bulkhead, a plinth return) is here since the same
;;; day as a notch of its own beside the corner one (D22, section H2).
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
;;;   nh       its height, UP FROM THE CARCASS UNDERSIDE; 0 = FULL HEIGHT;
;;;            NEGATIVE = DOWN FROM THE CARCASS TOP, |nh| long (D21)
;;;
;;;   The notch RISES FROM THE FLOOR. The owner's cases are a wall return and
;;;   a pipe ("L-ka przy scianie, rurze"), and both stand on the floor, so a
;;;   part-height notch is the bottom of the corner and its top is closed.
;;;   Since 18.10.2026 a NEGATIVE nh hangs it from the TOP instead (a beam, a
;;;   bulkhead): the top of the corner is cut and its bottom is closed (D21).
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
;;;   FLOOR    nw x nd, a notch FROM THE TOP only (D21, 18.10.2026): the LID
;;;            mirrored. It lies UNDER the STEP and the RETURN, between the
;;;            side and the back, and closes the notch's bottom.
;;;
;;; A notch FROM THE TOP (D21) is the same law upside down: the TOP takes
;;; the nw x nd notch instead of the BOTTOM, the side and the BACK lose their
;;; corner at the top of the notched edge, the STEP and the RETURN hang from
;;; the TOP's level down |nh|, and the FLOOR closes them underneath.
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
;;; ("teraz nic"). D10 was amended on 18.10.2026 (the BACK's rows along the
;;; box boards) and that amendment was WITHDRAWN on 19.10.2026 by the owner:
;;; the first back states no row into the box again; only a recess's second
;;; back, the EXT-BACK (KIT_RECESS.lsp D17), keeps its rows.
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
;;;     AMENDED 18.10.2026 (CLAUDE.md T79 F6: the BACK's rows along every box
;;;     board, "ale tylko na plecach") and WITHDRAWN 19.10.2026, the owner on
;;;     the eye-test of T79: *"nie na pierwszych plecach tylko na tych drugich
;;;     ktore sa we wnetrzu recess, na tych pierwszych nie, to juz bylo
;;;     usuniete i znowu trzeba usunac"*. So D10 stands as written above:
;;;     the BACK (the first back) carries NO row into the RETURN, the LID or
;;;     the FLOOR; the 18.10 rows, the "SHORT" entry and the box-row routine
;;;     are gone. A recess's second back (KIT_RECESS.lsp D17, the EXT-BACK)
;;;     keeps the rows of 18.10; notch-edge-row stays for it. The owner's
;;;     19.10 words are the licence of this file.
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
;;; 18.10.2026, THE OWNER'S LIST (CLAUDE.md T79 F4):
;;;
;;; D21 THE TOP-ANCHORED NOTCH. The owner: *"cut corner ucina nam tylko od
;;;     dolu a co jesli bedziemy chcieli od gory, nie powinno byc funkcji -500
;;;     na przyklad i wtedy ucina od gory? i mala informacja o tym."*  So nh
;;;     carries its anchor in its sign:
;;;       nh > 0   from the FLOOR, nh high (sections 1 to 9, as before)
;;;       nh = 0   FULL HEIGHT (as before; so is |nh| at or over ch)
;;;       nh < 0   from the TOP: the cut starts at the carcass top face and
;;;                runs DOWN |nh| (notch-from-top-p); notch-hh is |nh|
;;;     Board by board it is the floor notch upside down, nothing invented:
;;;       SIDE     its corner is the one at the TOP of the notched edge:
;;;                x0y1 / x1y1 in its own frame (notch-side-fc's third
;;;                argument), where the floor notch takes x0y0 / x1y0
;;;       BACK     at a back corner it loses the TOP part of the notched
;;;                edge (x0y1 / x1y1, notch-back-fc's second argument)
;;;       TOP      is cut instead of the BOTTOM (the nw x nd plan notch, the
;;;                same outline, the same corner mark, D11's underside frame)
;;;       BOTTOM   is the parent's
;;;       RETURN   the same board, hanging from the top: z from ch - |nh| to ch
;;;       STEP     the same board, the same heights as the RETURN
;;;       FLOOR    nw x nd, the LID's twin UNDER the cut: z from ch - |nh| - g
;;;                to ch - |nh|, the STEP and the RETURN standing on it
;;;                (notch-floor); no LID
;;;       SHELF    a shelf whose top face rises past the FLOOR's underside is
;;;                cut as a shelf under the LID's top face is today
;;;       PLINTH   untouched: a notch from the top never reaches the floor
;;;     The joints mirror the same way (section 4): the TOP edges of the side
;;;     and of the BACK are re-planned on the shortened run, the BOTTOM edges
;;;     are the parent's, and the back-edge tabs are planned afresh on the run
;;;     UNDER the notch, 0 .. ch - |nh| (SKY:tabCentres(ch - |nh|), no shift).
;;;     The drilling, the hanger holes and cut-outs, the keep-out and the
;;;     refusals of the hinge, the runner and the rail read the region at the
;;;     top exactly as they read it at the floor (they read the corner name).
;;;     THE ROOM UNDER IT: |nh| must leave notch.minInterior (100) of the
;;;     interior UNDER the cut, from the BOTTOM's top face to the FLOOR's
;;;     underside (ch - |nh| - 2g; unboxed, no FLOOR, ch - |nh| - g), the
;;;     owner's own "nie mniej niz 100 mm w srodku szafki" read in height;
;;;     less is REFUSED in words, naming the number (notch-refusal). Legs stay
;;;     where the parent put them: nothing stands in their footprint.
;;;     THE SMALL INFORMATION is the window's help line, not this file's: "a
;;;     negative HEIGHT cuts from the top (e.g. -500)".
;;;
;;; 18.10.2026, THE OWNER'S LIST (CLAUDE.md T79 F5):
;;;
;;; D22 THE EDGE NOTCH. The owner: *"cut the corner dziala idealnie, ale
;;;     mozesz zrobic mi tez poziome cut? wszystkich 4 rogow?"*  The four
;;;     corners of the SIDE elevation, each a rebate running the WHOLE WIDTH
;;;     of the carcass along that edge: "TB" top-back (a coving), "BB"
;;;     bottom-back (a skirting board), "TF" top-front (a bulkhead), "BF"
;;;     bottom-front (a plinth return). Its own parameter beside the corner
;;;     notch's, params.edgeNotch = (edge d h): ed into the depth, eh into the
;;;     height (the JS mirror's d and h). Board by board (section H2):
;;;       BUL, BUR  BOTH take the L corner ed x eh at that edge (edge-notch-
;;;                 side: the corner notch's own outline law and corner name)
;;;                 and the one open CORNER_4MM L at its inner corner (D9,
;;;                 D12), one per inner corner
;;;       BACK      a back edge: shorter by eh, from the bottom (BB) or from
;;;                 the top (TB); a front edge never reaches it
;;;       BOTTOM    BB / BF: narrower by ed at the back / at the front
;;;       TOP       TB / TF: narrower by ed at the back / at the front
;;;       FRONTS    untouched (the owner said nothing of doors; D4)
;;;       PLINTH    untouched at BF: it keeps its own law
;;;     NO CLOSING BOARDS (18.10.2026): the rebate is open to the wall or the
;;;     floor, so there is no RETURN, STEP, LID or FLOOR. ed is cut off every
;;;     board the edge reaches, as nd is; at a back edge the BACK's own g goes
;;;     with the cut, so the wall gets ed + g of room behind the boards there.
;;;     AMENDED 19.10.2026 (chat fix), the owner: *"2 cut dziala ale nie
;;;     rozumiem dlaczego nie ma paneli plyt, w sensie jak tniemy pionowe to
;;;     wszystko jest a jak poziome to nie ma, dlaczego?"*; asked "identycznie
;;;     jak pionowe?": *"tak, bez mockupu, identycznie jak pionowe"*. THE
;;;     CLOSING BOARDS, by the corner notch's own law (section 2, D1, D2, D4,
;;;     D21), an edge notch being the corner notch run the whole width (nw =
;;;     cw) with no RETURN (there is no side face left to close):
;;;       STEP    a BACK edge only (D4: a front edge is the fronts' opening):
;;;               cw x eh, the shallow part's own back, standing in the g
;;;               behind both sides' cut ends (plan y cd - ed - g .. cd - ed)
;;;               and covering them as the back covers the sides' ends; from
;;;               the floor (BB) or hanging from the top (TB, D21). The
;;;               keep-out behind it is ed deep, as the corner notch's is nd
;;;               (D2: the obstacle gets the whole ed; the STEP stands in the
;;;               BACK's g). The END panel covers its end (D23: w = sb + ed).
;;;       LID     a BOTTOM edge (BB, BF): (cw - 2 g) x ed, lying ON the STEP
;;;               between the sides, from the STEP's front face to the BACK's
;;;               (a back edge) or from the carcass front face ed back (a
;;;               front edge), at z eh .. eh + g.
;;;       FLOOR   a TOP edge (TB, TF): the LID mirrored, UNDER the STEP at
;;;               z ch - eh - g .. ch - eh.
;;;       NO RETURN, NO SCREW (D10): plain rectangles, the joiner's fixing.
;;;     Routines: edge-notch-box-places, edge-notch-step, edge-notch-lid,
;;;     edge-notch-floor (section H2); NUMBERS I3 carries the boards.
;;;     THE JOINTS follow the shortened edges (D5 read as RUNS, section H2's
;;;     run law): the sides' sockets and dia 3 screws along the cut edge, the
;;;     sides' back tabs and the BACK's matching sockets on the back edge the
;;;     cut leaves, the TOP's / BOTTOM's tabs into the sides on its shortened
;;;     run; at a back edge the cut board's BACK edge and the BACK's edge
;;;     beside it meet nothing and carry neither a joint nor a row, and
;;;     drawBACK's rows run on what is left of its edges (D10: an edge a cut
;;;     MADE carries none).
;;;     notch.minInterior (100) applies to what is left: the interior beside
;;;     the rebate in depth (cd - g - ed) and in height (ch - g - eh), never
;;;     less than a joint needs (D6); less is REFUSED in words.
;;;     D7 and D8 hold, asked of the parent's cut: a hinge, a runner, a rail
;;;     bracket or a wall unit's hanger the cut reaches on EITHER side, or a
;;;     hanger cut-out of the BACK, is refused in words (a hanger cannot be
;;;     fixed to air either); a shelf-pin hole it reaches steps away by ed;
;;;     anything else the parent puts inside the carcass that crosses the
;;;     keep-out (a shelf too: the rebate would take a whole strip of it, so
;;;     it is refused, not cut) is refused, naming it. Legs standing in a
;;;     bottom edge's footprint step out of it, as the corner notch's do.
;;;     WITH THE CORNER NOTCH on the same carcass: they coexist when their
;;;     rectangles on the corner notch's side do not overlap; otherwise the
;;;     edge notch is refused in words (edge-notch-meets-refusal). Both are
;;;     cut, the corner notch first; a board both reach is its rectangle less
;;;     both (edge-notch-less-two), its joints planned on the MEET of the two
;;;     runs, and a met run that cannot hold a joint is refused, naming the
;;;     board and the edge. A carcass cut under a slope, or grown into a
;;;     recess, takes no edge notch (refused in words, as the corner notch is
;;;     under a slope).
;;;     THE SMALL INFORMATION is the window's help line, not this file's: "A
;;;     rebate along the whole edge: skirting at the bottom-back, coving at
;;;     the top-back."
;;;
;;; 18.10.2026, THE OWNER'S LIST (CLAUDE.md T79 F9):
;;;
;;; D23 THE END PANEL FOLLOWS ITS SIDE. The owner: *"nie wycina mi panelu
;;;     bocznego do recess a powinno."*  CLAUDE.md T79 F9: "the end panel is
;;;     cut by the SAME outline as the side it covers"; notched, "the END
;;;     panel on the notched side takes the side's cnc.notch (and the F5 edge
;;;     notch)". The END PANEL (END-L, END-R) is the drawing app's masking
;;;     board on the OUTSIDE of a side, cut from the doors' sheet; no parent
;;;     kit draws it, and until today it stayed a plain rectangle beside any
;;;     cut, standing in the obstacle the side was cut round. Now (H3):
;;;       ITS FRAME  its side's: END-L as drawBUL, x from the FRONT; END-R as
;;;                  drawBUR, x from the BACK; y up from its own underside.
;;;                  Its numbers in the carcass's words: ew deep, ph high, sb
;;;                  behind the carcass back face (the wall gap and the
;;;                  inset), sf in front of the front face (the door gap and
;;;                  the door), pb below the underside (its drop to the floor,
;;;                  0 on a wall unit).
;;;       THE CORNER its side loses, it loses: the same corner name and the
;;;                  same anchor (the floor, the top, the whole height), run
;;;                  on to its own underside or top where the side's cut meets
;;;                  the carcass's (an END dropped to the floor loses the
;;;                  corner down to the floor; one run up to the ceiling loses
;;;                  a corner from the top up to it): notch-end-h.
;;;       ITS CUT FACE stands where the obstacle's keep-out begins (D2). At a
;;;                  boxed back corner that is the STEP's back face, nd in
;;;                  front of the carcass back face, so the END covers the
;;;                  STEP's end as it covers the BACK's (w = sb + nd). A rebate
;;;                  (D3) has no board closing it, so the END is flush with the
;;;                  side's cut face (sb + g + nd: the BACK's g goes with the
;;;                  cut). The edge notch (D22) had none until 19.10.2026 (sb
;;;                  + g + ed); since its STEP (D22 amended) the END covers the
;;;                  STEP's end at a back edge as at a boxed back corner (sb +
;;;                  ed). At a front corner or edge, flush with the side's cut
;;;                  face, nd or ed behind the carcass front (nd + sf, ed + sf).
;;;       FULL HEIGHT the corner is a strip: the END is that much shallower and
;;;                  its frame starts at what is left, as the side's does.
;;;     ONE WALK round every cut it takes (notch-end-outline: a cut is (fc w
;;;     h) in notch-rect-outline's grammar; each row between two cut heights
;;;     is as wide as the cuts on either hand leave it). Its inner corners get
;;;     the CORNER_4MM mark (D9, D12) as every cut board's do; its area and
;;;     its cut-list line are the outline's (the bounding rectangle, the true
;;;     area). With the recess's bump on the same END (KIT_RECESS.lsp D21) a
;;;     back cut is measured from the grown back edge. Proposed (one line to
;;;     veto): the cut face on the STEP's back face, not flush with the side.
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
    ("cnc.cornerMarkLeg"            . 40.0)   ;; 17.10.2026 (D9): the owner's "okolo 40 mm w kazda strone": each leg of the CORNER_4MM mark at a re-entrant corner (profile.cnc.cornerMark.legMm)
    ("notch.edgeDefaults.depth"     . 20.0)     ;; 18.10.2026 (D22): what the CUT EDGE window opens with, ed (a skirting board; T79 proposed, owner to confirm)
    ("notch.edgeDefaults.height"    . 120.0)    ;; 18.10.2026 (D22): ... and eh (profile.notch.edgeDefaults)
    ("recess.handEdge"              . 1.0)))    ;; 28.10.2026 (KIT_RECESS.lsp D23): the owner's "musimy pomniejszyc o 1 mm plecy ... w podkowie U": the edge put on by hand round a cut inside the BACK (profile.recess.handEdgeMm)

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

;;; 0 (or anything at or over the carcass, either way) is FULL HEIGHT. Until
;;; 18.10.2026 a negative nh read as full height too (and was refused); D21
;;; gives it the top.
(defun notch-full-p (ch nh)
  (or (= nh 0.0) (>= (abs nh) ch)))

;;; D21: a part-height notch hanging from the TOP (a negative nh).
(defun notch-from-top-p (ch nh)
  (and (< nh 0.0) (not (notch-full-p ch nh))))

;;; The height the notch actually takes (D21: |nh| from the top).
(defun notch-hh (ch nh)
  (if (notch-full-p ch nh) ch (abs nh)))

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

;;; THE BACK SCREW ROW over a run a .. b of a back's edge that a board stands
;;; behind, shifted onto the run; nil on a run shorter than one hole's offset
;;; e. Since 19.10.2026 only KIT_RECESS.lsp's EXT-BACK calls it (D10 above):
;;; the first back's notched edges carry no row.
(defun notch-edge-row (a b e)
  (if (< (- b a) e) nil (notch-shift (notch-screw-row (- b a) e) a)))

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

;;; D21: `top` (a notch from the top) takes the corner at the TOP of the
;;; edge, y1 for y0.
(defun notch-side-fc (corner burFrame top / fc)
  (setq fc (if burFrame
             (if (notch-back-p corner) "x0y0" "x1y0")
             (if (notch-back-p corner) "x1y0" "x0y0")))
  (if top (strcat (substr fc 1 2) "y1") fc))

;;; Boxed: the side cut nd x nh at its rear (front) corner, at the floor or
;;; (D21) at the top. Unboxed (D3): the parent's rectangle, its rebate given
;;; by notch-side-rebate.
(defun notch-side (cd ch g nw nd nh corner)
  (if (notch-boxed-p nw g)
    (notch-rect-outline (- cd g) ch nd (notch-hh ch nh)
                        (notch-side-fc corner (not (notch-left-p corner)) (notch-from-top-p ch nh)))
    (notch-plain-rect (- cd g) ch)))

(defun notch-side-dogbone (cd ch g nw nd nh corner r)
  (if (notch-boxed-p nw g)
    (notch-dogbone (- cd g) ch nd (notch-hh ch nh)
                   (notch-side-fc corner (not (notch-left-p corner)) (notch-from-top-p ch nh)) r)
    nil))

;;; D3: the rebate, a POCKET nw deep in the side's OUTER face:
;;; (x0 y0 x1 y1 depth) in the side's own frame, or nil when boxed. D21: from
;;; the top it stands at ch - |nh| .. ch.
(defun notch-side-rebate (cd ch g nw nd nh corner / bw fc y0 y1)
  (if (notch-boxed-p nw g)
    nil
    (progn
      (setq bw (- cd g)
            fc (notch-side-fc corner (not (notch-left-p corner)) (notch-from-top-p ch nh)))
      (if (notch-from-top-p ch nh)
        (setq y0 (- ch (notch-hh ch nh)) y1 ch)
        (setq y0 0.0 y1 (notch-hh ch nh)))
      (if (notch-fc-x0 fc)
        (list 0.0 y0 nd y1 nw)
        (list (- bw nd) y0 bw y1 nw)))))

;;; Its joints, re-planned (D5, D7), ALL MEASURED FROM THE SIDE'S FRONT EDGE
;;; (BUR's own frame is cd - g - x of these):
;;;   TOP-SOCKETS / BOTTOM-SOCKETS   along the top and bottom edges
;;;   TOP-SCREWS  / BOTTOM-SCREWS    the assembly rows along those edges
;;;   BACK-TABS                      y up the back edge (nil: none)
;;;   PIN-COLUMNS                    the shelf-pin columns for the shelf rows
;;;                                  INSIDE the notch's height (the rows above
;;;                                  a part-height notch keep the parent's;
;;;                                  D21: below one from the top)
;;; Unboxed, every joint is the parent's (a rebate that eats one is refused).
;;; D21: a notch from the top moves the TOP edge and leaves the BOTTOM edge
;;; the parent's; its back-edge tabs are planned on the run UNDER it.
(defun notch-side-joints (cd ch g nw nd nh corner / e below inset one three sfe pin
                          sideW run off full top hh cutS cutR parS parR
                          topS botS topR botR tabs pins)
  (setq e (notch-p "puzzle.tabCentresFromEnd")
        below (notch-p "puzzle.singleSocketBelow")
        inset (notch-joint-inset cd e (notch-p "puzzle.singleJointMaxDepth"))
        one (notch-p "puzzle.singleTabAtOrBelow")
        three (notch-p "puzzle.middleTabBelow")
        sfe (notch-p "puzzle.screwFromEnd")
        pin (notch-p "shelfHoles.columnFromEdge")
        sideW (- cd g)
        full (notch-full-p ch nh)
        top (notch-from-top-p ch nh)
        hh (notch-hh ch nh))
  (if (notch-boxed-p nw g)
    (setq run (- sideW nd) off (if (notch-back-p corner) 0.0 nd))
    (setq run sideW off 0.0))
  (setq cutS (notch-shift (notch-replan-sockets run inset below) off)
        cutR (notch-shift (notch-screw-row run sfe) off)
        parS (notch-replan-sockets sideW inset below)
        parR (notch-screw-row sideW sfe))
  ;; the bottom edge moves unless the notch hangs from the top (D21)
  (if top
    (setq botS parS botR parR)
    (setq botS cutS botR cutR))
  ;; the top edge moves when a boxed notch runs the full height, or hangs
  ;; from the top (D21)
  (if (and (or full top) (notch-boxed-p nw g))
    (setq topS cutS topR cutR)
    (setq topS parS topR parR))
  (setq tabs (cond ((not (notch-boxed-p nw g)) (notch-replan-tabs ch e one three))
                   ((not (notch-back-p corner)) (notch-replan-tabs ch e one three))
                   (full nil)
                   (top (notch-replan-tabs (- ch hh) e one three))
                   (T (notch-shift (notch-replan-tabs (- ch nh) e one three) nh))))
  (setq pins (notch-shift (notch-pin-columns run pin) off))
  (list (cons "TOP-SOCKETS" topS) (cons "BOTTOM-SOCKETS" botS)
        (cons "TOP-SCREWS" topR) (cons "BOTTOM-SCREWS" botR)
        (cons "BACK-TABS" tabs) (cons "PIN-COLUMNS" pins)))

;;;----------------------------------------
;;; THE BACK: cw x ch, x along the carcass x (from the LEFT face, seen from
;;; the front), y up. A FRONT notch never reaches it.
;;;----------------------------------------

;;; D21: `top` (a notch from the top) takes the corner at the TOP.
(defun notch-back-fc (corner top)
  (if (notch-left-p corner)
    (if top "x0y1" "x0y0")
    (if top "x1y1" "x1y0")))

(defun notch-back (cw ch nw nh corner)
  (if (notch-back-p corner)
    (notch-rect-outline cw ch nw (notch-hh ch nh) (notch-back-fc corner (notch-from-top-p ch nh)))
    (notch-plain-rect cw ch)))

(defun notch-back-dogbone (cw ch nw nh corner r)
  (if (notch-back-p corner)
    (notch-dogbone cw ch nw (notch-hh ch nh) (notch-back-fc corner (notch-from-top-p ch nh)) r)
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
;;;                   beside the notch; drawn again 18.10 and gone again
;;;                   19.10.2026 by the owner's word, D10). The far column,
;;;                   the rows above a part-height notch (into the side's own
;;;                   back edge) and the top and bottom rows stay.
;;; D21: a notch from the top shortens the TOP edge and leaves the BOTTOM
;;; edge the parent's; the notch-side edge is planned on the run UNDER it,
;;; 0 .. ch - |nh|, and its rows are that run's.
(defun notch-back-joints (cw ch g nw nh corner / e below one three sfe S full hh top
                          left back boxed farTabs nearTabs lo hi blo bhi topS botS
                          farX upX scr)
  (setq e (notch-p "puzzle.tabCentresFromEnd")
        below (notch-p "puzzle.singleSocketBelow")
        one (notch-p "puzzle.singleTabAtOrBelow")
        three (notch-p "puzzle.middleTabBelow")
        sfe (notch-p "puzzle.screwFromEnd")
        S (notch-screw-axis g)
        full (notch-full-p ch nh)
        top (notch-from-top-p ch nh)
        hh (notch-hh ch nh)
        left (notch-left-p corner)
        back (notch-back-p corner)
        boxed (notch-boxed-p nw g))
  (setq farTabs (notch-replan-tabs ch e one three))
  ;; the top edge's extent: all of it, or what a full-height back notch (or,
  ;; D21, a boxed one from the top: an unboxed rebate leaves the top row the
  ;; parent's, as it leaves the bottom row at the floor) leaves
  (if (and back (or full (and top boxed)))
    (if left (setq lo nw hi cw) (setq lo 0.0 hi (- cw nw)))
    (setq lo 0.0 hi cw))
  ;; the bottom edge's extent: a back notch reaches the bottom unless it
  ;; hangs from the top (D21)
  (if (and back (not top))
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
                       (top (notch-replan-tabs (- ch hh) e one three))
                       (T (notch-shift (notch-replan-tabs (- ch nh) e one three) nh))))
  (setq farX (if left (- cw S) S)
        upX (if left S (- cw S))
        scr '())
  (foreach y (notch-rows-between-tabs 0.0 ch farTabs sfe)
    (setq scr (cons (list farX y) scr)))
  ;; the side's own rows on the near edge: all of it at a front corner or for
  ;; an unboxed rebate; none at full height (the whole edge is the RETURN's);
  ;; D21: UNDER a notch from the top, and ABOVE one from the floor, the run
  ;; the notch leaves of the side's own back edge
  (cond
    ((or (not back) (not boxed))
      (foreach y (notch-rows-between-tabs 0.0 ch farTabs sfe)
        (setq scr (cons (list upX y) scr))))
    (full nil)
    (top
      (foreach y (notch-rows-between-tabs 0.0 (- ch hh) nearTabs sfe)
        (setq scr (cons (list upX y) scr))))
    (T
      (foreach y (notch-rows-between-tabs nh ch nearTabs sfe)
        (setq scr (cons (list upX y) scr)))))
  ;; D10 (17.10.2026, again 19.10.2026): NO row into the box
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
;;; D21: from the top, the RETURN and the STEP hang from the carcass top
;;; (z0 ch - |nh|, z1 ch) and a ("FLOOR" ...) closes them underneath, at
;;; ch - |nh| - g .. ch - |nh|, where the LID would lie over them.
(defun notch-box-places (cw cd ch g nw nd nh corner / hh top left back rx0 rx1 ry0 ry1
                         sx0 sx1 lx0 lx1 z0 z1 out)
  (if (not (notch-boxed-p nw g))
    nil
    (progn
      (setq hh (notch-hh ch nh)
            top (notch-from-top-p ch nh)
            left (notch-left-p corner)
            back (notch-back-p corner)
            out '())
      (if top (setq z0 (- ch hh) z1 ch) (setq z0 0.0 z1 hh))
      (if left (setq rx0 nw rx1 (+ nw g)) (setq rx0 (- cw nw g) rx1 (- cw nw)))
      ;; 15.10.2026: at a back corner the RETURN starts at the STEP's back
      ;; face (cd - nd), a board shorter: the STEP covers its end.
      (if back (setq ry0 (- cd nd) ry1 (- cd g)) (setq ry0 0.0 ry1 nd))
      (setq out (cons (list "RETURN" rx0 ry0 z0 rx1 ry1 z1) out))
      (if back
        (progn
          ;; ...and the STEP runs a board past the notch, over the RETURN's end.
          (if left (setq sx0 0.0 sx1 (+ nw g)) (setq sx0 (- cw nw g) sx1 cw))
          (setq out (cons (list "STEP" sx0 (- cd nd g) z0 sx1 (- cd nd) z1) out))))
      (if (not (notch-full-p ch nh))
        (progn
          (if left (setq lx0 g lx1 (+ nw g)) (setq lx0 (- cw nw g) lx1 (- cw g)))
          (if top
            (setq out (cons (list "FLOOR" lx0 (if back (- cd nd g) 0.0) (- z0 g) lx1 ry1 z0) out))
            (setq out (cons (list "LID" lx0 (- cd nd g) hh lx1 ry1 (+ hh g)) out)))))
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

;;; THE LID: nw x nd, part height only, at z = nh .. nh + g. D21: never over
;;; a notch from the top (the FLOOR closes that one).
(defun notch-lid (ch g nw nd nh)
  (if (and (notch-boxed-p nw g) (not (notch-full-p ch nh)) (not (notch-from-top-p ch nh)))
    (list nw nd)
    nil))

;;; THE FLOOR (D21): nw x nd, a notch from the top only, at
;;; z = ch - |nh| - g .. ch - |nh|, the STEP and the RETURN standing on it.
;;; No screw is stated for it: the box is the joiner's (D10).
(defun notch-floor (ch g nw nd nh)
  (if (and (notch-boxed-p nw g) (notch-from-top-p ch nh))
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
;;; the outline too, and the outline already clears the LID). D21, from the
;;; top: anywhere its top face (zs + g) rises past the FLOOR's underside, the
;;; same rule upside down.
(defun notch-shelf-crosses-p (zs g ch nh)
  (cond ((notch-full-p ch nh) T)
        ((notch-from-top-p ch nh) (> (+ zs g) (- ch (notch-hh ch nh) g)))
        (T (< zs (+ nh g)))))

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
;;; the carcass x; (0 cw) untouched. D21: `top`, a notch from the top, never
;;; reaches the floor and leaves the plinth whole.
;;;----------------------------------------

(defun notch-plinth (cw cd nw nd corner setback pt top / ny0 ny1)
  (if (notch-back-p corner)
    (setq ny0 (- cd nd) ny1 cd)
    (setq ny0 0.0 ny1 nd))
  (if (and (not top) (< ny0 (+ setback pt)) (> ny1 setback))
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
;;; (x0 y0 x1 y1) and from height z0 up to z1, cross the notch and its box
;;; (D8)? D21: from the top, anything whose top z1 rises past the FLOOR's
;;; underside (the LID's top, upside down).
(defun notch-crosses-p (cw cd ch g nw nd nh corner rect z0 z1 / lift)
  (setq lift (if (or (notch-full-p ch nh) (not (notch-boxed-p nw g))) 0.0 g))
  (and (notch-overlap-p rect (notch-keepout cw cd g nw nd corner 0.0))
       (if (notch-from-top-p ch nh)
         (> z1 (- ch (notch-hh ch nh) lift))
         (< z0 (+ (notch-hh ch nh) lift)))))

;;; D3: does an UNBOXED rebate eat a joint of the side? A back-edge tab
;;; whose dog bone reaches into the rebate's height at a back corner (D21:
;;; from the top, down from ch), or a top or bottom socket whose pocket
;;; reaches into the rebate's length.
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
          (if (if (notch-from-top-p ch nh) (> (+ c bone) (- ch hh)) (< (- c bone) hh))
            (setq hit T))))
      (foreach c (notch-replan-sockets sideW inset below)
        (if (and (> (+ c half) lo) (< (- c half) hi)) (setq hit T)))
      hit)))

;;;========================================
;;; H. THE REFUSALS (Room refuses first; nothing is clipped silently)
;;;========================================
;;;
;;; nil when the notch can be cut, else the sentence the Check prints, naming
;;; the board. D21 (18.10.2026): a negative nh is a notch from the top, no
;;; longer refused ("the height cannot be below 0" stood here until then);
;;; it must leave notch.minInterior of the interior UNDER it, and the side's
;;; back edge under it must hold a tab.

(defun notch-refusal (cw cd ch g nw nd nh corner / bone minEdge minInt sideW tw side top hh)
  (setq bone (notch-p "puzzle.dogboneHalfHeight")
        minEdge (notch-min-joint-edge bone g)
        minInt (notch-p "notch.minInterior")
        sideW (- cd g)
        tw (- cw (* 2.0 g))
        top (notch-from-top-p ch nh)
        hh (notch-hh ch nh))
  (setq side (if (notch-corner-ok corner) (notch-side-name corner) "the side"))
  (cond
    ((not (notch-corner-ok corner))
      "NOTCH: the corner is BL, BR, FL or FR.")
    ((or (<= nw 0.0) (<= nd 0.0))
      "NOTCH: the width and the depth must both be more than 0.")
    ((and (not (notch-full-p ch nh)) (not top) (> (+ nh g) (- ch g)))
      "NOTCH: a part-height notch must leave its LID room under the TOP. Make it full height, or lower it.")
    ((and top (< (- ch hh g (if (notch-boxed-p nw g) g 0.0)) minInt))
      (strcat "NOTCH: a notch from the top must leave " (rtos minInt 2 0)
              " mm of the interior under it. Make it shorter, or make it full height."))
    ((and (notch-boxed-p nw g) (< (- tw nw) minEdge))
      "NOTCH: the notch and its RETURN take the TOP and the BOTTOM across. Make it narrower.")
    ((< (- sideW nd) minEdge)
      (strcat "NOTCH: what is left of " side " cannot hold a joint. Make the notch shallower."))
    ((and (notch-boxed-p nw g) (notch-back-p corner) (not (notch-full-p ch nh)) (not top)
          (< (- ch nh) minEdge))
      (strcat "NOTCH: the back edge of " side " above the notch cannot hold a tab. Make it full height, or lower it."))
    ((and (notch-boxed-p nw g) (notch-back-p corner) top (< (- ch hh) minEdge))
      (strcat "NOTCH: the back edge of " side " under the notch cannot hold a tab. Make it shorter, or make it full height."))
    ((notch-rebate-eats-p cd ch g nw nd nh corner)
      (strcat "NOTCH: a notch narrower than the board is a rebate in " side
              ", and this one eats a joint. Make it at least as wide as the board (it is then boxed), or smaller."))
    (T nil)))

;;;========================================
;;; H2. THE EDGE NOTCH (D22, 18.10.2026)
;;;========================================
;;;
;;; A rebate along ONE horizontal edge of the side elevation, the whole width
;;; of the carcass: "TB" top-back, "BB" bottom-back, "TF" top-front, "BF"
;;; bottom-front; ed into the depth, eh into the height. Every routine below
;;; states it in the words sections D to H state the corner notch in, and
;;; calls theirs wherever the answer is theirs.

(defun edge-notch-ok (edge)
  (if (member edge '("TB" "BB" "TF" "BF")) T nil))

(defun edge-notch-back-p (edge)
  (or (= edge "TB") (= edge "BB")))

(defun edge-notch-top-p (edge)
  (or (= edge "TB") (= edge "TF")))

;;; The corner notch's corner with the same back-ness, so the side's corner
;;; name is notch-side-fc's own (one law for both).
(defun edge-notch-as-corner (edge)
  (if (edge-notch-back-p edge) "BL" "FL"))

;;; The board the edge cuts across: the TOP for a top edge, else the BOTTOM.
(defun edge-notch-board (edge)
  (if (edge-notch-top-p edge) "TOP" "BOTTOM"))

;;;----------------------------------------
;;; THE SIDES, BUL AND BUR BOTH: the corner at the notched edge, in the
;;; side's own frame (drawBUL x from the FRONT, drawBUR x from the BACK).
;;;----------------------------------------

(defun edge-notch-side-fc (edge burFrame)
  (notch-side-fc (edge-notch-as-corner edge) burFrame (edge-notch-top-p edge)))

(defun edge-notch-side (cd ch g ed eh edge burFrame)
  (notch-rect-outline (- cd g) ch ed eh (edge-notch-side-fc edge burFrame)))

;;;----------------------------------------
;;; THE CLOSING BOARDS (D22 amended 19.10.2026): notch-box-places run the
;;; whole width, with no RETURN. Where they stand, in plan and height:
;;;   (("STEP" x0 y0 z0 x1 y1 z1) ("LID" ...)) or (("STEP" ...) ("FLOOR" ...))
;;;   at a back edge; (("LID" ...)) or (("FLOOR" ...)) at a front edge (D4).
;;;----------------------------------------

(defun edge-notch-box-places (cw cd ch g ed eh edge / back top z0 z1 ly0 ly1 out)
  (setq back (edge-notch-back-p edge)
        top (edge-notch-top-p edge)
        out '())
  (if top (setq z0 (- ch eh) z1 ch) (setq z0 0.0 z1 eh))
  (if back
    (setq out (cons (list "STEP" 0.0 (- cd ed g) z0 cw (- cd ed) z1) out)))
  (if back (setq ly0 (- cd ed g) ly1 (- cd g)) (setq ly0 0.0 ly1 ed))
  (if top
    (setq out (cons (list "FLOOR" g ly0 (- z0 g) (- cw g) ly1 z0) out))
    (setq out (cons (list "LID" g ly0 z1 (- cw g) ly1 (+ z1 g)) out)))
  (reverse out))

;;; THE STEP: cw x eh, back edges only (the shallow part's own back, over both
;;; sides' cut ends).
(defun edge-notch-step (cw eh edge)
  (if (edge-notch-back-p edge) (list cw eh) nil))

;;; THE LID: (cw - 2 g) x ed, bottom edges only (every edge notch is part
;;; height: edge-notch-refusal keeps ch - g - eh at minInterior or more).
(defun edge-notch-lid (cw g ed edge)
  (if (edge-notch-top-p edge) nil (list (- cw (* 2 g)) ed)))

;;; THE FLOOR: the LID mirrored, top edges only (D21).
(defun edge-notch-floor (cw g ed edge)
  (if (edge-notch-top-p edge) (list (- cw (* 2 g)) ed) nil))

;;;----------------------------------------
;;; THE RUN LAW (D22: section 4's D5, read as runs). A jointed edge of a
;;; board is planned on the RUN the cuts leave it, (lo hi), by the call that
;;; planned the whole edge; nil where a cut took the edge away. With the
;;; corner notch on the same board, each run is the MEET of the two.
;;;----------------------------------------

(defun edge-notch-run (lo hi)
  (if (> hi lo) (list lo hi) nil))

(defun edge-notch-run-meet (a b)
  (if (and a b) (edge-notch-run (max (car a) (car b)) (min (cadr a) (cadr b))) nil))

(defun edge-notch-run-len (r)
  (if r (- (cadr r) (car r)) 0.0))

(defun edge-notch-run-of (runs key)
  (cdr (assoc key runs)))

;;; Two boards' worth of runs, met key by key.
(defun edge-notch-runs-meet (a b)
  (mapcar '(lambda (k) (cons (car k) (edge-notch-run-meet (cdr k) (edge-notch-run-of b (car k))))) a))

;;; The side's runs: BOTTOM and TOP measured from its FRONT edge (BUR's own
;;; frame is cd - g - x of these), BACK up its back edge.
(defun edge-notch-side-runs (cd ch g ed eh edge / sideW whole cut)
  (setq sideW (- cd g)
        whole (list 0.0 sideW)
        cut (if (edge-notch-back-p edge) (edge-notch-run 0.0 (- sideW ed)) (edge-notch-run ed sideW)))
  (list (cons "BOTTOM" (if (edge-notch-top-p edge) whole cut))
        (cons "TOP" (if (edge-notch-top-p edge) cut whole))
        (cons "BACK" (cond ((not (edge-notch-back-p edge)) (list 0.0 ch))
                           ((edge-notch-top-p edge) (edge-notch-run 0.0 (- ch eh)))
                           (T (edge-notch-run eh ch))))))

;;; The corner notch's runs on ITS side (notch-side-joints plans exactly
;;; these); a rebate (unboxed) leaves every run whole.
(defun notch-side-runs (cd ch g nw nd nh corner / sideW whole cut full top hh)
  (setq sideW (- cd g)
        whole (list 0.0 sideW)
        full (notch-full-p ch nh)
        top (notch-from-top-p ch nh)
        hh (notch-hh ch nh))
  (if (not (notch-boxed-p nw g))
    (list (cons "BOTTOM" whole) (cons "TOP" whole) (cons "BACK" (list 0.0 ch)))
    (progn
      (setq cut (if (notch-back-p corner) (edge-notch-run 0.0 (- sideW nd)) (edge-notch-run nd sideW)))
      (list (cons "BOTTOM" (if top whole cut))
            (cons "TOP" (if (or full top) cut whole))
            (cons "BACK" (cond ((not (notch-back-p corner)) (list 0.0 ch))
                               (full nil)
                               (top (edge-notch-run 0.0 (- ch hh)))
                               (T (edge-notch-run nh ch))))))))

;;; The side's joints planned on its runs (section 4's calls), every one
;;; measured from the FRONT edge, keyed as notch-side-joints keys them.
(defun edge-notch-plan-side (runs cd / e below inset one three sfe b tp k)
  (setq e (notch-p "puzzle.tabCentresFromEnd")
        below (notch-p "puzzle.singleSocketBelow")
        inset (notch-joint-inset cd e (notch-p "puzzle.singleJointMaxDepth"))
        one (notch-p "puzzle.singleTabAtOrBelow")
        three (notch-p "puzzle.middleTabBelow")
        sfe (notch-p "puzzle.screwFromEnd")
        b (edge-notch-run-of runs "BOTTOM")
        tp (edge-notch-run-of runs "TOP")
        k (edge-notch-run-of runs "BACK"))
  (list (cons "TOP-SOCKETS" (if tp (notch-shift (notch-replan-sockets (edge-notch-run-len tp) inset below) (car tp)) nil))
        (cons "BOTTOM-SOCKETS" (if b (notch-shift (notch-replan-sockets (edge-notch-run-len b) inset below) (car b)) nil))
        (cons "TOP-SCREWS" (if tp (notch-shift (notch-screw-row (edge-notch-run-len tp) sfe) (car tp)) nil))
        (cons "BOTTOM-SCREWS" (if b (notch-shift (notch-screw-row (edge-notch-run-len b) sfe) (car b)) nil))
        (cons "BACK-TABS" (if k (notch-shift (notch-replan-tabs (edge-notch-run-len k) e one three) (car k)) nil))))

(defun edge-notch-side-joints (cd ch g ed eh edge)
  (edge-notch-plan-side (edge-notch-side-runs cd ch g ed eh edge) cd))

;;;----------------------------------------
;;; THE TOP (a top edge) or THE BOTTOM (a bottom edge): narrower by ed at
;;; the back or at the front, in its PLAN frame (x from BUL's inner face, y
;;; from the front edge); notch-rect-outline takes the strip.
;;;----------------------------------------

(defun edge-notch-top-cut (cw cd g ed edge)
  (list (if (edge-notch-back-p edge) "x0y1" "x0y0") (- cw (* 2.0 g)) ed))

(defun edge-notch-top-outline (cw cd g ed edge / c)
  (setq c (edge-notch-top-cut cw cd g ed edge))
  (notch-rect-outline (- cw (* 2.0 g)) (- cd g) (cadr c) (caddr c) (car c)))

;;; Its runs: LEFT / RIGHT (into BUL / BUR) y from the front edge, BACK (into
;;; the BACK) x from BUL's inner face; at a back edge its BACK edge meets
;;; nothing (the BACK is shorter) and carries no tab.
(defun edge-notch-top-runs (cw cd g ed edge / sideW tw lr)
  (setq sideW (- cd g)
        tw (- cw (* 2.0 g))
        lr (if (edge-notch-back-p edge) (edge-notch-run 0.0 (- sideW ed)) (edge-notch-run ed sideW)))
  (list (cons "LEFT" lr) (cons "RIGHT" lr)
        (cons "BACK" (if (edge-notch-back-p edge) nil (list 0.0 tw)))))

;;; The corner notch's runs on a TOP or BOTTOM it cuts (notch-top-joints
;;; plans exactly these); unboxed, whole.
(defun notch-top-runs (cw cd g nw nd corner / sideW tw whole cut)
  (setq sideW (- cd g)
        tw (- cw (* 2.0 g))
        whole (list 0.0 sideW))
  (if (not (notch-boxed-p nw g))
    (list (cons "LEFT" whole) (cons "RIGHT" whole) (cons "BACK" (list 0.0 tw)))
    (progn
      (setq cut (if (notch-back-p corner) (edge-notch-run 0.0 (- sideW nd)) (edge-notch-run nd sideW)))
      (list (cons "LEFT" (if (notch-left-p corner) cut whole))
            (cons "RIGHT" (if (notch-left-p corner) whole cut))
            (cons "BACK" (cond ((not (notch-back-p corner)) (list 0.0 tw))
                               ((notch-left-p corner) (edge-notch-run nw tw))
                               (T (edge-notch-run 0.0 (- tw nw)))))))))

(defun edge-notch-plan-top (runs cd / e below inset l r k)
  (setq e (notch-p "puzzle.tabCentresFromEnd")
        below (notch-p "puzzle.singleSocketBelow")
        inset (notch-joint-inset cd e (notch-p "puzzle.singleJointMaxDepth"))
        l (edge-notch-run-of runs "LEFT")
        r (edge-notch-run-of runs "RIGHT")
        k (edge-notch-run-of runs "BACK"))
  (list (cons "LEFT" (if l (notch-shift (notch-replan-sockets (edge-notch-run-len l) inset below) (car l)) nil))
        (cons "RIGHT" (if r (notch-shift (notch-replan-sockets (edge-notch-run-len r) inset below) (car r)) nil))
        (cons "BACK" (if k (notch-shift (notch-replan-sockets (edge-notch-run-len k) e below) (car k)) nil))))

(defun edge-notch-top-joints (cw cd g ed edge)
  (edge-notch-plan-top (edge-notch-top-runs cw cd g ed edge) cd))

;;;----------------------------------------
;;; THE BACK (a back edge only): shorter by eh, from the bottom (BB) or from
;;; the top (TB); x from the LEFT face, y up.
;;;----------------------------------------

(defun edge-notch-back-cut (cw eh edge)
  (list (if (edge-notch-top-p edge) "x0y1" "x0y0") cw eh))

(defun edge-notch-back (cw ch eh edge / c)
  (if (edge-notch-back-p edge)
    (progn
      (setq c (edge-notch-back-cut cw eh edge))
      (notch-rect-outline cw ch (cadr c) (caddr c) (car c)))
    (notch-plain-rect cw ch)))

;;; Its runs: LEFT / RIGHT (the sides' back edges) y up, TOP / BOTTOM x along.
(defun edge-notch-back-runs (cw ch g eh edge / lr)
  (setq lr (cond ((not (edge-notch-back-p edge)) (list 0.0 ch))
                 ((edge-notch-top-p edge) (edge-notch-run 0.0 (- ch eh)))
                 (T (edge-notch-run eh ch))))
  (list (cons "LEFT" lr) (cons "RIGHT" lr)
        (cons "TOP" (if (and (edge-notch-back-p edge) (edge-notch-top-p edge)) nil (list 0.0 cw)))
        (cons "BOTTOM" (if (and (edge-notch-back-p edge) (not (edge-notch-top-p edge))) nil (list 0.0 cw)))))

;;; The corner notch's runs on the BACK (notch-back-joints plans exactly
;;; these for a boxed back corner); a front corner, or a rebate, whole.
(defun notch-back-runs (cw ch g nw nh corner / full top hh left whole near cutx)
  (setq full (notch-full-p ch nh)
        top (notch-from-top-p ch nh)
        hh (notch-hh ch nh)
        left (notch-left-p corner)
        whole (list 0.0 cw))
  (if (or (not (notch-back-p corner)) (not (notch-boxed-p nw g)))
    (list (cons "LEFT" (list 0.0 ch)) (cons "RIGHT" (list 0.0 ch)) (cons "TOP" whole) (cons "BOTTOM" whole))
    (progn
      (setq near (cond (full nil) (top (edge-notch-run 0.0 (- ch hh))) (T (edge-notch-run nh ch)))
            cutx (if left (edge-notch-run nw cw) (edge-notch-run 0.0 (- cw nw))))
      (list (cons "LEFT" (if left near (list 0.0 ch)))
            (cons "RIGHT" (if left (list 0.0 ch) near))
            (cons "TOP" (if (or full top) cutx whole))
            (cons "BOTTOM" (if top whole cutx))))))

;;; The BACK's joints planned on its runs: the sockets the sides' tabs and
;;; the TOP's / BOTTOM's tabs land in, and drawBACK's dia 3 rows on what is
;;; left of each of its four edges (D10: an edge a cut MADE carries none).
(defun edge-notch-plan-back (runs cw ch g / e below one three sfe S l r tp b lt rt scr)
  (setq e (notch-p "puzzle.tabCentresFromEnd")
        below (notch-p "puzzle.singleSocketBelow")
        one (notch-p "puzzle.singleTabAtOrBelow")
        three (notch-p "puzzle.middleTabBelow")
        sfe (notch-p "puzzle.screwFromEnd")
        S (notch-screw-axis g)
        l (edge-notch-run-of runs "LEFT")
        r (edge-notch-run-of runs "RIGHT")
        tp (edge-notch-run-of runs "TOP")
        b (edge-notch-run-of runs "BOTTOM")
        lt (if l (notch-shift (notch-replan-tabs (edge-notch-run-len l) e one three) (car l)) nil)
        rt (if r (notch-shift (notch-replan-tabs (edge-notch-run-len r) e one three) (car r)) nil)
        scr '())
  (if l (foreach y (notch-rows-between-tabs (car l) (cadr l) lt sfe) (setq scr (cons (list S y) scr))))
  (if r (foreach y (notch-rows-between-tabs (car r) (cadr r) rt sfe) (setq scr (cons (list (- cw S) y) scr))))
  (if tp (foreach x (notch-row-between (car tp) (cadr tp) g sfe) (setq scr (cons (list x (- ch S)) scr))))
  (if b (foreach x (notch-row-between (car b) (cadr b) g sfe) (setq scr (cons (list x S) scr))))
  (list (cons "LEFT-SOCKETS" lt) (cons "RIGHT-SOCKETS" rt)
        (cons "TOP-SOCKETS" (if tp (notch-shift (notch-replan-sockets (- (edge-notch-run-len tp) (* 2.0 g)) e below) (+ (car tp) g)) nil))
        (cons "BOTTOM-SOCKETS" (if b (notch-shift (notch-replan-sockets (- (edge-notch-run-len b) (* 2.0 g)) e below) (+ (car b) g)) nil))
        (cons "SCREWS" (reverse scr))))

(defun edge-notch-back-joints (cw ch g eh edge)
  (edge-notch-plan-back (edge-notch-back-runs cw ch g eh edge) cw ch g))

;;;----------------------------------------
;;; THE KEEP-OUT (D8): what the cut takes of the carcass, in plan (x0 y0 x1
;;; y1) and height, as ((x0 y0 x1 y1) z0 z1). At a back edge it runs from the
;;; cut faces of the sides and the BOTTOM / TOP (cd - g - ed) to the back
;;; face: the BACK's own g goes with it.
;;;----------------------------------------

(defun edge-notch-keepout (cw cd ch g ed eh edge)
  (list (list 0.0 (if (edge-notch-back-p edge) (- cd g ed) 0.0) cw (if (edge-notch-back-p edge) cd ed))
        (if (edge-notch-top-p edge) (- ch eh) 0.0)
        (if (edge-notch-top-p edge) ch eh)))

;;; Does anything at plan `rect`, from height z0 up to z1, cross it?
(defun edge-notch-crosses-p (cw cd ch g ed eh edge rect z0 z1 / k)
  (setq k (edge-notch-keepout cw cd ch g ed eh edge))
  (and (notch-overlap-p rect (car k)) (< z0 (caddr k)) (> z1 (cadr k))))

;;;----------------------------------------
;;; COEXISTENCE (D22): the edge notch's rectangle on a side and the corner
;;; notch's on its own side, both in the side's FRONT frame (x from the front
;;; edge, y up), (x0 y0 x1 y1).
;;;----------------------------------------

(defun edge-notch-side-rect (cd ch g ed eh edge / sideW)
  (setq sideW (- cd g))
  (list (if (edge-notch-back-p edge) (- sideW ed) 0.0)
        (if (edge-notch-top-p edge) (- ch eh) 0.0)
        (if (edge-notch-back-p edge) sideW ed)
        (if (edge-notch-top-p edge) ch eh)))

(defun notch-side-rect (cd ch g nd nh corner / sideW hh)
  (setq sideW (- cd g)
        hh (notch-hh ch nh))
  (list (if (notch-back-p corner) (- sideW nd) 0.0)
        (if (notch-from-top-p ch nh) (- ch hh) 0.0)
        (if (notch-back-p corner) sideW nd)
        (if (notch-from-top-p ch nh) ch hh)))

;;; Does the corner notch cut this horizontal board? (section 2: the BOTTOM
;;; unless it hangs from the top; the TOP at full height or from the top.)
(defun notch-cuts-board-p (ch nh hz)
  (if (= hz "TOP")
    (or (notch-full-p ch nh) (notch-from-top-p ch nh))
    (not (notch-from-top-p ch nh))))

;;;----------------------------------------
;;; THE COMPOUND OUTLINE (D22): a board bw x bh less TWO cuts, each (fc nw
;;; nh) in notch-rect-outline's grammar (nw >= bw or nh >= bh is a strip off
;;; one edge). The strips shrink the rectangle (edge-notch-shrink); a corner
;;; cut, clipped to what is left, takes a corner of THAT (edge-notch-corners,
;;; ((fc w h) ...) named on the shrunk rectangle); the walk goes round it
;;; once, anticlockwise, from its x0y0 corner. For ONE cut it is
;;; notch-rect-outline's own polygon.
;;;----------------------------------------

(defun edge-notch-strip-p (bw bh c)
  (and c (or (>= (cadr c) bw) (>= (caddr c) bh))))

(defun edge-notch-shrink (bw bh cuts / x0 y0 x1 y1)
  (setq x0 0.0 y0 0.0 x1 bw y1 bh)
  (foreach c cuts
    (if (edge-notch-strip-p bw bh c)
      (if (>= (cadr c) bw)
        (if (notch-fc-y0 (car c)) (setq y0 (max y0 (caddr c))) (setq y1 (min y1 (- bh (caddr c)))))
        (if (notch-fc-x0 (car c)) (setq x0 (max x0 (cadr c))) (setq x1 (min x1 (- bw (cadr c))))))))
  (list x0 y0 x1 y1))

(defun edge-notch-corners (bw bh cuts box / out rx0 rx1 ry0 ry1 cx0 cx1 cy0 cy1)
  (setq out '())
  (foreach c cuts
    (if (and c (not (edge-notch-strip-p bw bh c)))
      (progn
        (if (notch-fc-x0 (car c)) (setq rx0 0.0 rx1 (cadr c)) (setq rx0 (- bw (cadr c)) rx1 bw))
        (if (notch-fc-y0 (car c)) (setq ry0 0.0 ry1 (caddr c)) (setq ry0 (- bh (caddr c)) ry1 bh))
        (setq cx0 (max rx0 (car box)) cx1 (min rx1 (caddr box))
              cy0 (max ry0 (cadr box)) cy1 (min ry1 (cadddr box)))
        (if (and (> cx1 cx0) (> cy1 cy0))
          (setq out (append out (list (list (strcat (if (<= cx0 (car box)) "x0" "x1") (if (<= cy0 (cadr box)) "y0" "y1"))
                                            (- cx1 cx0) (- cy1 cy0)))))))))
  out)

(defun edge-notch-walk (box corners / x0 y0 x1 y1 hit out)
  (setq x0 (car box) y0 (cadr box) x1 (caddr box) y1 (cadddr box) out '())
  (foreach fc '("x0y0" "x1y0" "x1y1" "x0y1")
    (setq hit (assoc fc corners))
    (setq out (append out
                (cond
                  ((null hit) (list (list (if (notch-fc-x0 fc) x0 x1) (if (notch-fc-y0 fc) y0 y1))))
                  ((= fc "x0y0") (list (list x0 (+ y0 (caddr hit))) (list (+ x0 (cadr hit)) (+ y0 (caddr hit))) (list (+ x0 (cadr hit)) y0)))
                  ((= fc "x1y0") (list (list (- x1 (cadr hit)) y0) (list (- x1 (cadr hit)) (+ y0 (caddr hit))) (list x1 (+ y0 (caddr hit)))))
                  ((= fc "x1y1") (list (list x1 (- y1 (caddr hit))) (list (- x1 (cadr hit)) (- y1 (caddr hit))) (list (- x1 (cadr hit)) y1)))
                  (T (list (list (+ x0 (cadr hit)) y1) (list (+ x0 (cadr hit)) (- y1 (caddr hit))) (list x0 (- y1 (caddr hit)))))))))
  out)

(defun edge-notch-less-two (bw bh cutA cutB / box)
  (setq box (edge-notch-shrink bw bh (list cutA cutB)))
  (edge-notch-walk box (edge-notch-corners bw bh (list cutA cutB) box)))

;;;----------------------------------------
;;; THE REFUSALS (Room refuses first): nil, or the sentence.
;;;----------------------------------------

;;; notch.minInterior applies to what is left: the interior beside the rebate
;;; in depth (the BOTTOM's or the TOP's depth after the cut, cd - g - ed) and
;;; in height (from the rebate to the far board's inner face, ch - g - eh),
;;; never less than a joint needs (D6).
(defun edge-notch-refusal (cw cd ch g ed eh edge / keep)
  (setq keep (max (notch-min-joint-edge (notch-p "puzzle.dogboneHalfHeight") g) (notch-p "notch.minInterior")))
  (cond
    ((not (edge-notch-ok edge))
      "NOTCH: the edge is TB, BB, TF or BF.")
    ((or (<= ed 0.0) (<= eh 0.0))
      "NOTCH: the depth and the height of an edge notch must both be more than 0.")
    ((< (- cd g ed) keep)
      (strcat "NOTCH: an edge notch must leave " (rtos keep 2 0) " mm of the interior beside it in depth. Make it shallower."))
    ((< (- ch g eh) keep)
      (strcat "NOTCH: an edge notch must leave " (rtos keep 2 0) " mm of the interior beside it in height. Make it lower."))
    (T nil)))

;;; The first key whose run both cuts leave and whose meet cannot hold a
;;; joint: nil, or the key.
(defun edge-notch-short-run (a b minEdge / out ra rb)
  (setq out nil)
  (foreach k (mapcar 'car a)
    (setq ra (edge-notch-run-of a k)
          rb (edge-notch-run-of b k))
    (if (and (null out) ra rb (< (edge-notch-run-len (edge-notch-run-meet ra rb)) minEdge))
      (setq out k)))
  out)

(defun edge-notch-short-said (key board)
  (strcat "NOTCH: what the corner notch and the edge notch leave of the " key " edge of " board
          " cannot hold a joint. Make one of them smaller."))

;;; notch-rebate-eats-p's law asked of a GIVEN side plan (the met one): a
;;; back-edge tab whose dog bone reaches into the rebate's height at a back
;;; corner, or a top or bottom socket whose pocket reaches into its length.
(defun edge-notch-rebate-eats-p (cd ch g nw nd nh corner sj / bone half sideW hh top lo hi hit)
  (setq bone (notch-p "puzzle.dogboneHalfHeight")
        half (notch-p "puzzle.socketHalfWidth")
        sideW (- cd g)
        hh (notch-hh ch nh)
        top (notch-from-top-p ch nh)
        hit nil)
  (if (notch-back-p corner) (setq lo (- sideW nd) hi sideW) (setq lo 0.0 hi nd))
  (if (notch-back-p corner)
    (foreach c (cdr (assoc "BACK-TABS" sj))
      (if (if top (> (+ c bone) (- ch hh)) (< (- c bone) hh)) (setq hit T))))
  (foreach c (append (cdr (assoc "TOP-SOCKETS" sj)) (cdr (assoc "BOTTOM-SOCKETS" sj)))
    (if (and (> (+ c half) lo) (< (- c half) hi)) (setq hit T)))
  hit)

;;; COEXISTENCE: the corner notch (nw nd nh corner) and the edge notch on one
;;; carcass. Their rectangles on the corner notch's side must not overlap;
;;; every jointed edge both cuts leave must still hold a joint (D6), naming
;;; the board and the edge; and a rebate (an unboxed corner notch) moves no
;;; joint of its own, so the edge notch's re-planned joints must stay out of
;;; it (notch-rebate-eats-p's law, asked of the met plan).
(defun edge-notch-meets-refusal (cw cd ch g ed eh edge nw nd nh corner / minEdge side hz bad)
  (setq minEdge (notch-min-joint-edge (notch-p "puzzle.dogboneHalfHeight") g)
        side (notch-side-name corner)
        hz (edge-notch-board edge)
        bad nil)
  (cond
    ((notch-overlap-p (edge-notch-side-rect cd ch g ed eh edge) (notch-side-rect cd ch g nd nh corner))
      (strcat "NOTCH: the edge notch and the corner notch overlap on " side ". Move one of them, or make it smaller."))
    ((setq bad (edge-notch-short-run (notch-side-runs cd ch g nw nd nh corner) (edge-notch-side-runs cd ch g ed eh edge) minEdge))
      (edge-notch-short-said bad side))
    ((and (notch-boxed-p nw g) (notch-cuts-board-p ch nh hz)
          (setq bad (edge-notch-short-run (notch-top-runs cw cd g nw nd corner) (edge-notch-top-runs cw cd g ed edge) minEdge)))
      (edge-notch-short-said bad hz))
    ((setq bad (edge-notch-short-run (notch-back-runs cw ch g nw nh corner) (edge-notch-back-runs cw ch g eh edge) minEdge))
      (edge-notch-short-said bad "BACK"))
    ((and (not (notch-boxed-p nw g))
          (edge-notch-rebate-eats-p cd ch g nw nd nh corner
            (edge-notch-plan-side (edge-notch-runs-meet (notch-side-runs cd ch g nw nd nh corner)
                                                        (edge-notch-side-runs cd ch g ed eh edge)) cd)))
      (strcat "NOTCH: a notch narrower than the board is a rebate in " side
              ", and the edge notch moves a joint into it. Make the corner notch at least as wide as the board, or smaller."))
    (T nil)))

;;; D7, in this notch's words: a hole the cut reaches on either side.
(defun edge-notch-hole-refusal (kind board)
  (strcat "NOTCH: the " kind " drilling of " board " falls in the edge notch, and a " kind
          " cannot be fixed to air. Make the notch smaller, or cut another edge."))

;;;========================================
;;; H3. THE END PANEL FOLLOWS ITS SIDE (D23, 18.10.2026)
;;;========================================
;;;
;;; The END panel in its side's frame (END-L x from the FRONT, END-R x from
;;; the BACK), ew deep, ph high; sb behind the carcass back face, sf in front
;;; of its front face, pb below its underside; hand "L" or "R". A cut is
;;; (fc w h) in notch-rect-outline's grammar; nil is no cut.

;;; How high a cut anchored at the carcass's floor ("floor"), top ("top") or
;;; whole height ("full") runs on the END panel: on to its own underside or top.
(defun notch-end-h (ch hh anchor ph pb)
  (cond ((= anchor "full") ph)
        ((= anchor "top") (- ph pb (- ch hh)))
        (T (+ hh pb))))

;;; The corner notch on the END panel of the notched side; nil on the other
;;; hand. Its cut face where the keep-out begins (D23).
(defun notch-end-cut (ch g nw nd nh corner hand sb sf ph pb / w)
  (if (/= hand (if (notch-left-p corner) "L" "R"))
    nil
    (progn
      (setq w (cond ((not (notch-back-p corner)) (+ nd sf))
                    ((notch-boxed-p nw g) (+ sb nd))
                    (T (+ sb g nd))))
      (list (notch-side-fc corner (= hand "R") (notch-from-top-p ch nh))
            w
            (notch-end-h ch (notch-hh ch nh)
                         (cond ((notch-full-p ch nh) "full") ((notch-from-top-p ch nh) "top") (T "floor"))
                         ph pb)))))

;;; The edge notch on EITHER END panel (D23). At a back edge the STEP closes
;;; the rebate (D22 amended 19.10.2026) and the END covers its end: its cut
;;; face on the STEP's back face, sb + ed (until 19.10.2026 flush with the
;;; side's cut face, sb + g + ed). At a front edge flush with the side's.
(defun edge-notch-end-cut (ch g ed eh edge hand sb sf ph pb)
  (list (edge-notch-side-fc edge (= hand "R"))
        (if (edge-notch-back-p edge) (+ sb ed) (+ ed sf))
        (notch-end-h ch eh (if (edge-notch-top-p edge) "top" "floor") ph pb)))

;;; Does the cut c cover the height y of a board ph high?
(defun notch-end-in-p (c y ph)
  (if (notch-fc-y0 (car c)) (< y (caddr c)) (> y (- ph (caddr c)))))

;;; One edge of the rows ((y0 y1 l r) ...), merged where its x stays the
;;; same: ((x y0 y1) ...), bottom to top; k is 2 for the x0 edge, 3 for x1.
(defun notch-end-runs (rows k / out x)
  (setq out '())
  (foreach w rows
    (setq x (nth k w))
    (if (and out (equal (car (last out)) x 1e-9))
      (setq out (append (reverse (cdr (reverse out))) (list (list x (cadr (last out)) (cadr w)))))
      (setq out (append out (list (list x (car w) (cadr w)))))))
  out)

;;; notch-end-outline: the END panel ew x ph less its cuts, (box pts). box is
;;; (x0 y0 x1 y1), what it keeps in the uncut frame; pts its outline,
;;; anticlockwise from its bottom-left corner, re-origined to box: up the x1
;;; edge, down the x0 edge, each row between two cut heights as wide as the
;;; cuts on either hand leave it. A plain END is notch-plain-rect; one cut is
;;; notch-rect-outline's own polygon; nil when the cuts leave nothing.
(defun notch-end-outline (ew ph cuts / cs ys y0 y1 mid l r rows right left pts box)
  (setq cs '())
  (foreach c cuts (if c (setq cs (append cs (list c)))))
  (setq ys (list 0.0 ph))
  (foreach c cs
    (setq ys (cons (if (notch-fc-y0 (car c)) (min ph (caddr c)) (max 0.0 (- ph (caddr c)))) ys)))
  (setq ys (vl-sort ys '<) rows '())
  (while (cdr ys)
    (setq y0 (car ys) y1 (cadr ys) ys (cdr ys))
    (if (> y1 y0)
      (progn
        (setq mid (/ (+ y0 y1) 2.0) l 0.0 r ew)
        (foreach c cs
          (if (notch-end-in-p c mid ph)
            (if (notch-fc-x0 (car c)) (setq l (max l (cadr c))) (setq r (min r (- ew (cadr c)))))))
        (if (< l r) (setq rows (append rows (list (list y0 y1 l r))))))))
  (if (null rows)
    nil
    (progn
      (setq right (notch-end-runs rows 3)
            left (reverse (notch-end-runs rows 2))
            pts '())
      (foreach u right (setq pts (append pts (list (list (car u) (cadr u)) (list (car u) (caddr u))))))
      (foreach u left (setq pts (append pts (list (list (car u) (caddr u)) (list (car u) (cadr u))))))
      (setq pts (cons (last pts) (reverse (cdr (reverse pts)))))
      (setq box (list (apply 'min (mapcar 'caddr rows)) (car (car rows))
                      (apply 'max (mapcar 'cadddr rows)) (cadr (last rows))))
      (list box (mapcar '(lambda (p) (list (- (car p) (car box)) (- (cadr p) (cadr box)))) pts)))))

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
;;;                                  the RETURN's end) is GONE (D10, 17.10.2026;
;;;                                  drawn 18.10, gone again 19.10.2026)
;;; BACK top/bottom screw rows       68, 300, 532       268, 400, 532
;;;   (carcass x; own frame 68, 200, 332)
;;;   so the BACK carries 10 dia 3 holes (the parent 14)
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
;;; I2. NUMBERS - THE NOTCH FROM THE TOP (D21, fixtures/golden-notch-top.json)
;;;========================================
;;;
;;; CLAUDE.md T79 F4: "NUMBERS block for BUD 600, notch BL w 200 d 200
;;; h -300, board by board." The same parent as section I (KIT_BUD_FULL
;;; defaults: W 600, D 558, H 770, G 18, front 25, 1 shelf at 385, hinge L).
;;; Notch BL, nw 200, nd 200, nh -300: FROM THE TOP, 300 down from the
;;; carcass top face (notch-from-top-p T, notch-hh 300). Joint inset 95.
;;; Every point list below is anticlockwise, once round.
;;;
;;; KEEP-OUT (plan): x 0..218, y 340..558, as section I (the plan is the
;;; same); in height z 470..770, and the FLOOR under it at 452..470.
;;;
;;; BOARD      PARENT       NOTCHED
;;; BUL        540 x 770    540 x 770 less 200 x 300 at its rear TOP corner,
;;;                         the corner "x1y1" (BUL frame, x from FRONT):
;;;                         (0 0) (540 0) (540 470) (340 470) (340 770) (0 770)
;;;   CORNER MARK (D12): corner (340 470); one open L on CORNER_4MM
;;;                         (380 470) -> (340 470) -> (340 510)
;;;   area 0.4158 -> 0.3558 m2 (355800 mm2)
;;; BUR        540 x 770    unchanged
;;; TOP        564 x 540    564 x 540 less 200 x 200 at the rear-left, cut
;;;                         INSTEAD OF the BOTTOM; every number section I gives
;;;                         the TOP of the full-height notch:
;;;   plan frame  (0 0) (564 0) (564 540) (200 540) (200 340) (0 340)
;;;   drawn from its UNDERSIDE (D11): (200 564) (200 364) (0 364) (0 0)
;;;               (540 0) (540 564), the corner "x0y1"
;;;   CORNER MARK (200 404) -> (200 364) -> (160 364)
;;;   area 0.305 -> 0.265 m2 (264560 mm2)
;;; BOTTOM     564 x 540    unchanged (the parent's)
;;; BACK       600 x 770    600 x 770 less 200 x 300 at its top-left, the
;;;                         corner "x0y1":
;;;                         (0 0) (600 0) (600 770) (200 770) (200 470) (0 470)
;;;   CORNER MARK (D12): corner (200 470); one open L on CORNER_4MM
;;;                         (200 510) -> (200 470) -> (160 470)
;;;   area 0.462 -> 0.402 m2 (402000 mm2)
;;; STEP       -            218 x 300, carcass x 0..218, y 340..358, z 470..770
;;; RETURN     -            182 x 300, carcass x 200..218, y 358..540, z 470..770
;;; FLOOR      -            200 x 200, carcass x 18..218, y 340..540, z 452..470
;;; LID        -            none (the FLOOR closes a notch from the top)
;;; SHELF-1    560 x 520    unchanged: its top face (403) is under the FLOOR's
;;;                         underside (452); a shelf whose top face rises past
;;;                         452 is cut to section I's SHELF outline
;;; PLINTH     600          untouched (a notch from the top never reaches it)
;;;
;;; WHICH JOINTS MOVE:
;;;
;;; BOARD, EDGE                      PARENT             NOTCHED
;;; BUL top sockets (x from front)   95, 445            95, 245   (445 -> 245)
;;; BUL bottom sockets               95, 445            95, 445   unchanged
;;; BUL top screw row                50, 270, 490       50, 170, 290
;;; BUL bottom screw row             50, 270, 490       50, 270, 490   unchanged
;;; BUL back-edge tabs (y)           95, 385, 675       95, 375   (planned on 0..470)
;;; BUL shelf-pin columns            70, 470            70, 270   (the rows in 470..770)
;;; TOP tabs into BUL (y)            95, 445            95, 245
;;; TOP tabs into BUR (y)            95, 445            95, 445   unchanged
;;; TOP tabs into BACK (x)           95, 469            295, 469
;;; BOTTOM tabs, every edge          the parent's       unchanged
;;; BACK sockets, notch edge (y)     95, 385, 675       95, 375   (planned on 0..470)
;;; BACK sockets, far edge (y)       95, 385, 675       95, 385, 675
;;; BACK top sockets (carcass x)     113, 487           313, 487
;;; BACK bottom sockets              113, 487           113, 487  unchanged
;;; BACK side screw rows (y)         50, 240, 530, 720  far edge (x 591) unchanged;
;;;                                  notch edge (x 9): 50, 235, 420 (the run
;;;                                  under the notch), none beside it (D10;
;;;                                  drawn 18.10, gone again 19.10.2026)
;;; BACK top screw row (y 761)       68, 300, 532       268, 400, 532
;;; BACK bottom screw row (y 9)      68, 300, 532       68, 300, 532   unchanged
;;;   so the BACK carries 13 dia 3 holes
;;;
;;; THE ROOM UNDER IT (notch-refusal): ch - |nh| - 2g >= 100, so on this BUD
;;; |nh| may run to 634 (770 - 634 - 36 = 100); -635 is refused: "NOTCH: a
;;; notch from the top must leave 100 mm of the interior under it. Make it
;;; shorter, or make it full height."

;;;========================================
;;; I3. NUMBERS - THE EDGE NOTCH (D22, fixtures/golden-edge-notch-bb.json,
;;;     fixtures/golden-edge-notch-tb.json)
;;;========================================
;;;
;;; CLAUDE.md T79 F5: "NUMBERS block for BUD 600 BB d 20 h 120 and TB d 50 h
;;; 100." The same parent as section I (KIT_BUD_FULL defaults: W 600, D 558,
;;; H 770, G 18, front 25, 1 shelf at 385, hinge L; sideW 540, tw 564). Joint
;;; inset 95. Every point list below is anticlockwise, once round.
;;;
;;; CASE A, BB: ed 20, eh 120 (a skirting board).
;;; KEEP-OUT: plan x 0..600, y 520..558; height z 0..120. (The notch AND its
;;; box, D8: since 19.10.2026 the STEP stands in the BACK's g at y 520..538
;;; and the obstacle's own room behind it is y 538..558, ed deep, D2; until
;;; then the whole 520..558 was open to the wall.)
;;;
;;; THE CLOSING BOARDS (D22 amended 19.10.2026), plain rectangles, no joint,
;;; no hole, the joiner's fixing:
;;;   EDGE-STEP  600 x 120   plan x 0..600, y 520..538, z 0..120 (edge-notch-step)
;;;   EDGE-LID   564 x 20    plan x 18..582, y 520..540, z 120..138 (edge-notch-lid)
;;;   (edge-notch-box-places 600 558 770 18 20 120 "BB") =
;;;     (("STEP" 0 520 0 600 538 120) ("LID" 18 520 120 582 540 138))
;;;
;;; BOARD      PARENT       CUT
;;; BUL        540 x 770    less 20 x 120 at its rear BOTTOM corner, "x1y0"
;;;                         (BUL frame, x from the FRONT):
;;;                         (0 0) (520 0) (520 120) (540 120) (540 770) (0 770)
;;;   CORNER MARK (D12): (520 80) -> (520 120) -> (540 120)
;;;   area 0.4158 -> 0.4134 m2 (413400 mm2)
;;; BUR        540 x 770    less 20 x 120 at "x0y0" (BUR frame, x from the BACK):
;;;                         (20 0) (540 0) (540 770) (0 770) (0 120) (20 120)
;;;   CORNER MARK (D12): (0 120) -> (20 120) -> (20 80)
;;;   area 0.4134 m2
;;; BOTTOM     564 x 540    564 x 520, the strip at the back gone
;;;   plan frame  (0 0) (564 0) (564 520) (0 520)
;;;   drawTOP_ROT90 frame, re-origined at its new back edge:
;;;               (520 0) (520 564) (0 564) (0 0); no corner, no mark
;;;   area 0.30456 -> 0.29328 m2 (293280 mm2)
;;; TOP        564 x 540    unchanged (the parent's)
;;; BACK       600 x 770    600 x 650, carcass z 120..770; own frame
;;;                         (0 0) (600 0) (600 650) (0 650); no corner
;;;   area 0.462 -> 0.39 m2 (390000 mm2)
;;; SHELF-1    560 x 520    unchanged (385 is over the rebate)
;;; PLINTH     600          untouched
;;;
;;; WHICH JOINTS MOVE:
;;;
;;; BOARD, EDGE                      PARENT             CUT
;;; BUL bottom sockets (from front)  95, 445            95, 425   (on 0..520)
;;; BUL bottom screw row             50, 270, 490       50, 260, 470
;;; BUL top sockets / screw row      the parent's       unchanged
;;; BUL back-edge tabs (y)           95, 385, 675       215, 445, 675  (on 120..770)
;;; BUR (its own frame, x from back) the same numbers, read from the back:
;;;                                  bottom sockets 445, 115; screws 490, 280, 70
;;; BOTTOM tabs into BUL / BUR (y)   95, 445            95, 425   (on 0..520)
;;; BOTTOM tabs into BACK (x)        95, 469            NONE (meets nothing)
;;; BACK sockets, both side edges    95, 385, 675       215, 445, 675  (carcass z;
;;;                                                     own frame 95, 325, 555)
;;; BACK top sockets (carcass x)     113, 487           113, 487  unchanged
;;; BACK bottom sockets              113, 487           NONE
;;; BACK side screw rows (x 9, 591)  50, 240, 530, 720  170, 330, 560, 720  (carcass
;;;                                                     z; own frame 50, 210, 440, 600)
;;; BACK top screw row               68, 300, 532       68, 300, 532  (own y 641)
;;; BACK bottom screw row            68, 300, 532       NONE
;;;
;;; CASE B, TB: ed 50, eh 100 (a coving).
;;; KEEP-OUT: plan x 0..600, y 490..558; height z 670..770. (The STEP at
;;; y 490..508, the obstacle's room 508..558.)
;;;
;;; THE CLOSING BOARDS (D22 amended 19.10.2026):
;;;   EDGE-STEP  600 x 100   plan x 0..600, y 490..508, z 670..770
;;;   EDGE-FLOOR 564 x 50    plan x 18..582, y 490..540, z 652..670
;;;   (edge-notch-box-places 600 558 770 18 50 100 "TB") =
;;;     (("STEP" 0 490 670 600 508 770) ("FLOOR" 18 490 652 582 540 670))
;;; A FRONT edge, BF 20 / 120 on the same parent: no STEP (D4), the LID
;;;   564 x 20 at plan y 0..20, z 120..138; TF 50 / 100: the FLOOR 564 x 50 at
;;;   y 0..50, z 652..670.
;;;
;;; BOARD      PARENT       CUT
;;; BUL        540 x 770    less 50 x 100 at its rear TOP corner, "x1y1":
;;;                         (0 0) (540 0) (540 670) (490 670) (490 770) (0 770)
;;;   CORNER MARK (D12): (530 670) -> (490 670) -> (490 710)
;;;   area 0.4158 -> 0.4108 m2 (410800 mm2)
;;; BUR        540 x 770    less 50 x 100 at "x0y1" (x from the BACK):
;;;                         (0 0) (540 0) (540 770) (50 770) (50 670) (0 670)
;;;   CORNER MARK (D12): (50 710) -> (50 670) -> (10 670)
;;;   area 0.4108 m2
;;; TOP        564 x 540    564 x 490, the strip at the back gone
;;;   plan frame  (0 0) (564 0) (564 490) (0 490)
;;;   drawTOP_ROT90 frame, re-origined: (490 0) (490 564) (0 564) (0 0)
;;;   drawn from its UNDERSIDE (D11): (0 564) (0 0) (490 0) (490 564)
;;;   area 0.30456 -> 0.27636 m2 (276360 mm2)
;;; BOTTOM     564 x 540    unchanged (the parent's)
;;; BACK       600 x 770    600 x 670, carcass z 0..670:
;;;                         (0 0) (600 0) (600 670) (0 670)
;;;   area 0.462 -> 0.402 m2 (402000 mm2)
;;;
;;; WHICH JOINTS MOVE:
;;;
;;; BUL top sockets (x from front)   95, 445            95, 395   (on 0..490)
;;; BUL top screw row                50, 270, 490       50, 245, 440
;;; BUL bottom sockets / screw row   the parent's       unchanged
;;; BUL back-edge tabs (y)           95, 385, 675       95, 335, 575  (on 0..670)
;;; BUR (x from back)                top sockets 445, 145; top screws 490, 295, 100
;;; TOP tabs into BUL / BUR (y)      95, 445            95, 395
;;; TOP tabs into BACK               95, 469            NONE
;;; BACK sockets, both side edges    95, 385, 675       95, 335, 575
;;; BACK top sockets                 113, 487           NONE
;;; BACK bottom sockets              113, 487           113, 487  unchanged
;;; BACK side screw rows (x 9, 591)  50, 240, 530, 720  50, 215, 455, 620
;;; BACK top screw row               68, 300, 532       NONE
;;; BACK bottom screw row (y 9)      68, 300, 532       68, 300, 532
;;;
;;; THE ROOM (edge-notch-refusal): cd - g - ed >= 100 and ch - g - eh >= 100,
;;; so on this BUD ed may run to 440 and eh to 652; 441 is refused: "NOTCH: an
;;; edge notch must leave 100 mm of the interior beside it in depth. Make it
;;; shallower."; 653: "NOTCH: an edge notch must leave 100 mm of the interior
;;; beside it in height. Make it lower."
;;;
;;; CASE C, COEXISTENCE: the corner notch BL 200 / 200 / 300 (from the floor)
;;; WITH the edge notch TB 50 / 100. On BUL (front frame) the corner's
;;; rectangle is x 340..540, y 0..300 and the edge's x 490..540, y 670..770:
;;; apart, so both are cut. (BB 20 / 120 with the same corner: x 520..540,
;;; y 0..120 overlaps; refused: "NOTCH: the edge notch and the corner notch
;;; overlap on BUL. Move one of them, or make it smaller.")
;;; BUL        (0 0) (340 0) (340 300) (540 300) (540 670) (490 670)
;;;            (490 770) (0 770), two inner corners, two marks:
;;;            (340 260) -> (340 300) -> (380 300)
;;;            (530 670) -> (490 670) -> (490 710)
;;;            area 0.3508 m2 (350800 mm2)
;;;            bottom run 0..340: sockets 95, 245; screws 50, 170, 290
;;;            top run 0..490:    sockets 95, 395; screws 50, 245, 440
;;;            back run 300..670: tabs 395, 575
;;; BACK       (0 300) (200 300) (200 0) (600 0) (600 670) (0 670), one mark
;;;            (160 300) -> (200 300) -> (200 260); area 0.342 m2 (342000 mm2)
;;;            left run 300..670: sockets 395, 575; screws (x 9) 350, 485, 620
;;;            right run 0..670:  sockets 95, 335, 575; screws (x 591) 50, 215, 455, 620
;;;            bottom run 200..600: sockets 313, 487; screws (y 9) 268, 400, 532
;;;            top: none
;;; TOP        case B's (the corner notch cuts the BOTTOM only)
;;; BOTTOM     section I's corner notch (the edge notch does not reach it)
;;; BUR        case B's; the corner's STEP, RETURN and LID as section I's with
;;;            nh 300 (the LID at 300..318, under the rebate)

;;;========================================
;;; I4. NUMBERS - THE END PANEL (D23, fixtures/golden-notch-end-panel.json)
;;;========================================
;;;
;;; CLAUDE.md T79 F9: "the END outline equals the side's outline in each case".
;;; The parent of section I with an END panel 25 thick dropped to the floor:
;;; pb 100, ph 870; sb 10 (the wall gap), sf 28 (the door gap 3 and the door
;;; 25); ew = 10 + 558 + 28 = 596; its box z -10..586, y -100..770 (z 0 the
;;; carcass back face, 558 its front face). END-L is drawn as drawBUL, x from
;;; the FRONT (carcass z = 586 - x); END-R as drawBUR, x from the BACK
;;; (carcass z = x - 10). Every point list anticlockwise, once round.
;;;
;;; CASE A (fixtures/golden-notch-end-panel.json): BL 200 / 200 / 300, boxed.
;;; BUL loses 200 x 300 at "x1y0"; the STEP stands at z 200..218, its end at
;;; x 0 of the carcass, where END-L stands.
;;; END-L      less 210 x 400 at "x1y0" (w = sb + nd = 10 + 200, h = 300 + 100),
;;;            its cut face at x 386 = carcass z 200, the STEP's back face:
;;;            (0 0) (386 0) (386 400) (596 400) (596 870) (0 870)
;;;   CORNER MARK (D12): (386 360) -> (386 400) -> (426 400)
;;;   area 0.51852 -> 0.43452 m2 (434520 mm2); the cut list keeps 596 x 870 (the nominal: since KIT_SITE_TRIM.lsp, 19.10.2026, the cut list says 616 x 910 and states 596 x 870 beside it)
;;; END-R      the other hand: unchanged
;;;
;;; CASE B: BL 200 / 200 / 0, full height (golden-notch.json's own notch). BUL
;;; is 340 deep, z 218..558. END-L loses the strip 210 x 870: 386 x 870, its
;;; box z 200..586: (0 0) (386 0) (386 870) (0 870); area 0.33582 m2 (335820
;;; mm2).
;;;
;;; CASE C: BL 200 / 200 / -300, from the top (D21). END-L less 210 x 300 at
;;; "x1y1" (h = 870 - 100 - (770 - 300); it does not run above the carcass):
;;;            (0 0) (596 0) (596 570) (386 570) (386 870) (0 870)
;;;   CORNER MARK: (426 570) -> (386 570) -> (386 610); area 0.45552 m2 (455520 mm2)
;;;
;;; CASE D: FR 200 / 150 / 300, a front corner (BUR loses 150 x 300 at its
;;; front bottom corner). END-R less 178 x 400 at "x1y0" (w = nd + sf), flush
;;; with BUR's cut face at x 418 = carcass z 408:
;;;            (0 0) (418 0) (418 400) (596 400) (596 870) (0 870)
;;;   CORNER MARK: (418 360) -> (418 400) -> (458 400); area 0.44732 m2 (447320 mm2)
;;;
;;; CASE E: BR 10 / 30 / 40, a rebate (D3, unboxed: BUR keeps its outline).
;;; END-R less 58 x 140 at "x0y0" (w = sb + g + nd), flush with the rebate's
;;; face at carcass z 48:
;;;            (58 0) (596 0) (596 870) (0 870) (0 140) (58 140)
;;;   CORNER MARK: (18 140) -> (58 140) -> (58 100); area 0.5104 m2 (510400 mm2)
;;;
;;; CASE F, THE EDGE NOTCH (section I3 case A): BB 20 / 120 on BOTH ENDs. Since
;;; 19.10.2026 (D22 amended: the EDGE-STEP) the END covers the STEP's end, its
;;; cut face on the STEP's back face at carcass z 20 (w = sb + ed = 30, h =
;;; 120 + 100 = 220); until then flush with the sides' cut face at z 38 (w 48).
;;; END-L      (0 0) (566 0) (566 220) (596 220) (596 870) (0 870)
;;;   CORNER MARK: (566 180) -> (566 220) -> (596 220) (the leg stops at the
;;;   edge's end, 30 short of 40); area 0.51192 m2 (511920 mm2)
;;; END-R      (30 0) (596 0) (596 870) (0 870) (0 220) (30 220)
;;;   CORNER MARK: (0 220) -> (30 220) -> (30 180); area 0.51192 m2
;;;
;;; CASE G: TB 50 / 100 (section I3 case B) on an END-L run up 200 over the
;;; carcass (top 200, ph 1070): less 60 x 300 at "x1y1" (w = sb + ed, h = 100
;;; + 200):
;;;            (0 0) (596 0) (596 770) (536 770) (536 1070) (0 1070)
;;;   CORNER MARK: (576 770) -> (536 770) -> (536 810); area 0.61972 m2 (619720 mm2)
;;;
;;; CASE H, BOTH (section I3 case C): BL 200 / 200 / 300 with TB 50 / 100.
;;; END-L      (0 0) (386 0) (386 400) (596 400) (596 770) (536 770) (536 870)
;;;            (0 870), two marks (386 360) -> (386 400) -> (426 400) and
;;;            (576 770) -> (536 770) -> (536 810); area 0.42852 m2 (428520 mm2)
;;; (The cut list carries each END 20 bigger on its top, bottom and back since
;;; KIT_SITE_TRIM.lsp, 19.10.2026; the numbers above are the nominal it states.)
;;;
;;; A REFUSED notch cuts no END panel: the parent is what is cut (BR 10 / 100
;;; / 60, a rebate that eats a joint, leaves END-R 596 x 870).

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
                       sideW tw hh full top hz boxed side bur e below inset one three
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

  ;; D21 (18.10.2026): a negative HEIGHT hangs the notch from the TOP.
  (setq nh (getreal "\nNotch HEIGHT [mm] (0 = full height, negative = from the top) <0>: "))
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
                top (notch-from-top-p ch nh)
                hz (if top "TOP" "BOTTOM")
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

          ;; 2. THE TOP (full height, or D21 from the top) and the BOTTOM
          ;;    (unless from the top), in PLAN
          (setq tj (notch-top-joints cw cd g nw nd corner))
          (if (or full top)
            (progn
              (notch-draw-board cx y0 tw sideW (notch-top-outline cw cd g nw nd corner)
                                (notch-top-dogbone cw cd g nw nd corner r) "TOP")
              (notch-draw-marks cx y0 (notch-top-marks tj tw sideW) 4.0)
              (setq cx (+ cx tw odstep))))
          (if (not top)
            (progn
              (notch-draw-board cx y0 tw sideW (notch-top-outline cw cd g nw nd corner)
                                (notch-top-dogbone cw cd g nw nd corner r) "BOTTOM")
              (notch-draw-marks cx y0 (notch-top-marks tj tw sideW) 4.0)
              (setq cx (+ cx tw odstep))))

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
          ;; D21: the FLOOR under a notch from the top; no screw (D10)
          (if (notch-floor ch g nw nd nh)
            (progn
              (notch-draw-board cx y0 nw nd (notch-plain-rect nw nd) nil "FLOOR")
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
                             (cond (full "FULL") (top (strcat (rtos hh 2 0) " FROM THE TOP")) (T (rtos nh 2 0)))
                             " on " (cond ((= kit "W") "KIT_WARDROBE") ((= kit "U") "KIT_WUD") (T "KIT_BUD")) " "
                             (rtos cw 2 0) " x " (rtos ch 2 0) " x " (rtos cd 2 0)
                             ", G=" (rtos g 2 0) ", r=" (rtos r 2 2)))
          (notch-say "---------")
          (notch-say (strcat side ": " (rtos sideW 2 0) " x " (rtos ch 2 0) " -> "
                             (cond ((not boxed) (strcat "rebate " (rtos nd 2 0) " x " (rtos hh 2 0)
                                                        ", " (rtos nw 2 0) " deep"))
                                   (full (strcat (rtos (- sideW nd) 2 0) " x " (rtos ch 2 0)))
                                   (T (strcat "less " (rtos nd 2 0) " x " (rtos hh 2 0))))))
          (notch-say (strcat "TOP: " (if (and (or full top) boxed)
                                       (strcat (rtos tw 2 0) " x " (rtos sideW 2 0) " less "
                                               (rtos nw 2 0) " x " (rtos nd 2 0))
                                       "unchanged")))
          (notch-say (strcat "BOTTOM: " (if (and boxed (not top))
                                          (strcat (rtos tw 2 0) " x " (rtos sideW 2 0) " less "
                                                  (rtos nw 2 0) " x " (rtos nd 2 0))
                                          "unchanged")))
          (notch-say (strcat "BACK: " (cond ((not (notch-back-p corner)) "unchanged")
                                            (full (strcat (rtos (- cw nw) 2 0) " x " (rtos ch 2 0)))
                                            (T (strcat (rtos cw 2 0) " x " (rtos ch 2 0) " less "
                                                       (rtos nw 2 0) " x " (rtos hh 2 0))))))
          (if (notch-step ch g nw nh corner)
            (notch-say (strcat "STEP: " (rtos (+ nw g) 2 0) " x " (rtos hh 2 0) " (fixing manual)")))
          (if (notch-return ch g nw nd nh corner)
            (notch-say (strcat "RETURN: " (rtos (car (notch-return ch g nw nd nh corner)) 2 0) " x " (rtos hh 2 0) " (fixing manual)")))
          (if (notch-lid ch g nw nd nh)
            (notch-say (strcat "LID: " (rtos nw 2 0) " x " (rtos nd 2 0) " (fixing manual)")))
          (if (notch-floor ch g nw nd nh)
            (notch-say (strcat "FLOOR: " (rtos nw 2 0) " x " (rtos nd 2 0) " (fixing manual)")))
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
          (notch-say (strcat hz " tabs into " side ": " (notch-fmt oldTop) " -> "
                             (notch-fmt (cdr (assoc (if bur "RIGHT" "LEFT") tj)))))
          (notch-say (strcat hz " tabs into BACK: " (notch-fmt oldBack) " -> "
                             (notch-fmt (cdr (assoc "BACK" tj)))))
          (notch-say (strcat "BACK " (if top "top" "bottom") " sockets: " (notch-fmt (notch-shift oldBack g)) " -> "
                             (notch-fmt (cdr (assoc (if top "TOP-SOCKETS" "BOTTOM-SOCKETS") bj)))))
          ;; the BACK's dia 3 holes, said (no row into the box: D10, 19.10.2026)
          (if (notch-back-p corner)
            (notch-say (strcat "BACK dia 3 holes: " (itoa (length (cdr (assoc "SCREWS" bj)))))))
          (notch-say "---------")
          (drawTextLC "SUMMARY" sumX sumY lineH "Property of Skylon Joinery" 6)
          (princ "\nNotched boards drawn.")))))

  ;; Restore state
  (if _oldClayer  (setvar "CLAYER"  _oldClayer))
  (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
  (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
  (setq *error* _olderr)
  (princ))

;;;========================================
;;; K2. THE EDGE COMMAND (D22)
;;;========================================

;;; The BACK's socket centres, as marks on NOTCH_MANUAL (section J's grammar).
(defun edge-notch-back-marks (bj cw ch / out)
  (setq out '())
  (foreach y (cdr (assoc "LEFT-SOCKETS" bj)) (setq out (cons (list 0.0 y) out)))
  (foreach y (cdr (assoc "RIGHT-SOCKETS" bj)) (setq out (cons (list cw y) out)))
  (foreach x (cdr (assoc "TOP-SOCKETS" bj)) (setq out (cons (list x ch) out)))
  (foreach x (cdr (assoc "BOTTOM-SOCKETS" bj)) (setq out (cons (list x 0.0) out)))
  (reverse out))

(defun c:EDGENOTCH_FULL ( / kit g cw cd ch edge ed eh msg pt x0 y0 cx odstep sideW tw hz
                           sj tj bj sumX sumY lineH
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

  ;; === INPUT: the edge (the owner's "poziome cut ... wszystkich 4 rogow") ===
  (initget "TB BB TF BF")
  (setq edge (getkword "\nEdge to CUT [TB=top-back / BB=bottom-back / TF=top-front / BF=bottom-front] <BB>: "))
  (if (null edge) (setq edge "BB"))

  (setq ed (getreal "\nEdge notch DEPTH into the carcass [mm] <20>: "))
  (if (null ed) (setq ed (notch-p "notch.edgeDefaults.depth")))

  (setq eh (getreal "\nEdge notch HEIGHT [mm] <120>: "))
  (if (null eh) (setq eh (notch-p "notch.edgeDefaults.height")))

  ;; === ROOM REFUSES FIRST ===
  (setq msg (edge-notch-refusal cw cd ch g ed eh edge))
  (if msg
    (princ (strcat "\n" msg))
    (progn
      (setq pt (getpoint "\nInsertion point for the cut boards: "))
      (if (null pt)
        (princ "\nNo point selected.")
        (progn
          (createViewLayers)
          (createCNCLayers)
          (command "._LAYER" "_N" "NOTCH_MANUAL" "_C" "8" "NOTCH_MANUAL" "")

          (setq x0 (car pt) y0 (cadr pt) cx x0 odstep 50.0
                sideW (- cd g)
                tw (- cw (* 2.0 g))
                hz (edge-notch-board edge))
          (setq sj (edge-notch-side-joints cd ch g ed eh edge)
                tj (edge-notch-top-joints cw cd g ed edge)
                bj (edge-notch-back-joints cw ch g eh edge))

          ;; 1. THE SIDES, BOTH, each in its own LISP frame
          (notch-draw-board cx y0 sideW ch (edge-notch-side cd ch g ed eh edge nil) nil "BUL")
          (notch-draw-marks cx y0 (notch-side-marks sj sideW ch nil) 4.0)
          (setq cx (+ cx sideW odstep))
          (notch-draw-board cx y0 sideW ch (edge-notch-side cd ch g ed eh edge T) nil "BUR")
          (notch-draw-marks cx y0 (notch-side-marks sj sideW ch T) 4.0)
          (setq cx (+ cx sideW odstep))

          ;; 2. THE TOP or THE BOTTOM it cuts across, in PLAN
          (notch-draw-board cx y0 tw sideW (edge-notch-top-outline cw cd g ed edge) nil hz)
          (notch-draw-marks cx y0 (notch-top-marks tj tw sideW) 4.0)
          (setq cx (+ cx tw odstep))

          ;; 3. THE BACK (a back edge), with drawBACK's rows on what is left
          (if (edge-notch-back-p edge)
            (progn
              (notch-draw-board cx y0 cw ch (edge-notch-back cw ch eh edge) nil "BACK")
              (notch-draw-marks cx y0 (edge-notch-back-marks bj cw ch) 4.0)
              (notch-draw-marks cx y0 (cdr (assoc "SCREWS" bj)) 1.5)
              (setq cx (+ cx cw odstep))))

          ;;========================================
          ;; SUMMARY TEXT BLOCK
          ;;========================================
          (setq sumX (+ cx 300.0) sumY (+ y0 ch) lineH 30.0)
          (notch-say (strcat "EDGE NOTCH " edge " " (rtos ed 2 0) " deep x " (rtos eh 2 0) " high, the whole width, on "
                             (cond ((= kit "W") "KIT_WARDROBE") ((= kit "U") "KIT_WUD") (T "KIT_BUD")) " "
                             (rtos cw 2 0) " x " (rtos ch 2 0) " x " (rtos cd 2 0) ", G=" (rtos g 2 0)))
          (notch-say "---------")
          (notch-say (strcat "BUL, BUR: " (rtos sideW 2 0) " x " (rtos ch 2 0) " less " (rtos ed 2 0) " x " (rtos eh 2 0)))
          (notch-say (strcat hz ": " (rtos tw 2 0) " x " (rtos sideW 2 0) " -> " (rtos tw 2 0) " x " (rtos (- sideW ed) 2 0)))
          (notch-say (strcat "BACK: " (if (edge-notch-back-p edge)
                                         (strcat (rtos cw 2 0) " x " (rtos ch 2 0) " -> " (rtos cw 2 0) " x " (rtos (- ch eh) 2 0))
                                         "unchanged")))
          (notch-say "no closing boards: the rebate is open to the wall or the floor")
          (notch-say "---------")
          (notch-say (strcat "side top sockets: " (notch-fmt (cdr (assoc "TOP-SOCKETS" sj)))))
          (notch-say (strcat "side bottom sockets: " (notch-fmt (cdr (assoc "BOTTOM-SOCKETS" sj)))))
          (notch-say (strcat "side back tabs: " (notch-fmt (cdr (assoc "BACK-TABS" sj)))))
          (notch-say (strcat hz " tabs into the sides: " (notch-fmt (cdr (assoc "LEFT" tj)))))
          (notch-say (strcat hz " tabs into BACK: " (notch-fmt (cdr (assoc "BACK" tj)))))
          (notch-say "---------")
          (drawTextLC "SUMMARY" sumX sumY lineH "Property of Skylon Joinery" 6)
          (princ "\nEdge-notched boards drawn.")))))

  ;; Restore state
  (if _oldClayer  (setvar "CLAYER"  _oldClayer))
  (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
  (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
  (setq *error* _olderr)
  (princ))

(princ "\nKIT_NOTCH loaded. Type NOTCH_FULL (a corner) or EDGENOTCH_FULL (an edge) to run.")
(princ)
