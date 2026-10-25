;;; Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
;;; Proprietary and confidential. Unauthorised copying, modification,
;;; distribution or use, including by automated tools and AI systems,
;;; is strictly prohibited without prior written permission.
;;;========================================
;;; KIT_VANITY.lsp
;;; THE VANITY UNIT - the drawer base with the back cut out: two rails, the
;;; service void behind it, 2, 3 or 4 equal overlay drawers in one column or
;;; two, the trap's U in the top drawer, on a plinth or floating; and THE TWO
;;; COLUMNS, the section the chest of drawers takes too
;;; Command: VANITY_FULL
;;; Turn 82 (25.10.2026), the owner's words of 25.10.2026 - LISP FIRST
;;; ("lisp najpierw")
;;; Derived from: KIT_BUDR_FULL.lsp (the parent: the drawer base), the BACK of
;;;               SKYLON_COMMON drawBACK (the rails are what is left of it),
;;;               KIT_SINK.lsp (a carcass with no puzzle at the back edge),
;;;               KIT_FRIDGE.lsp (rails standing in the back's own plane), the
;;;               wardrobe's two drawer columns (T79 F3, AddItems.jsx and the
;;;               store's addDrawers), the house's drawer law as the engine
;;;               cuts it today (profile.baseDrawerUnit, engine/drawerBox.js)
;;; Requires: SKYLON_COMMON.lsp loaded first (only the command draws, with
;;;           drawRect, makePolyline and drawText; the routines need nothing,
;;;           and nothing is loaded from here)
;;;========================================
;;;
;;; THE OWNER, 25.10.2026:
;;;
;;;   12:57  "vanity unit (podobna zasada bedzie do chest drawers) vanity unit
;;;           potrzebuje z szufladami nawierzchniowymi, wybor jak zawsze 2 3 i 4
;;;           ale pamietaj ze w vanity default to sa rowne, do tego prosze
;;;           external drawers ale wybor 2 rows, patrz szafa, dodanie blat
;;;           grubosc do wyboru, plinth do zmiany wysokosc, propozycja floating
;;;           lub on the floor, dodanie 1 sink or 2 sink? dodajesz tylko do
;;;           widoku, musimy miec tez wyciecie na trap, w razie czego jak nie
;;;           bedzie miejsca to zostawimy informacje prosze uzyc shallow trap,
;;;           i tyl, to musimy wymyslec, nastepnie to bedzie miejsce z tylu na
;;;           rurki minimum potrzebujemy okolo 80 mm do 100 mm i pamietaj ze nie
;;;           ma plecow na vanity unit tylko sa poziome poprzeczki na dole i na
;;;           gorze, plecy sa jakby wyciete"
;;;   13:03  over the mockup (verify/t82/mockups/vanity.png): "2 wyciecie u
;;;           dookola zeby sie szuflada otwierala, 3 - 80, 4 - 100 na material
;;;           carcasa grubosc, 5 - blat osobny element jak worktop, 6 - do BOM
;;;           tez, 7 - tak"
;;;   13:46  "6 - tak" (the U's corners R 20)
;;;
;;; This is a NEW FILE. It touches no other kit. KIT_BUDR_FULL, SKYLON_COMMON
;;; and the six fossil kits are untouched; a bare drawer base cuts what it cut,
;;; and the chest of drawers at one column cuts what it cut.
;;;
;;;========================================
;;; 1. THE LAW IN ONE PARAGRAPH
;;;========================================
;;;
;;; A VANITY is the drawer base (KIT_BUDR_FULL) with its BACK cut out: what is
;;; left of the back is two RAILS, RAIL-BOTTOM and RAIL-TOP, 100 high in the
;;; carcass board, standing where the back stood, and each keeps exactly the
;;; part of the back's joint that lands inside it. The carcass stands the
;;; house's wall clearance plus 80 off the wall for the pipes ("3 - 80"), and
;;; its top is the house worktop reaching the wall over that void. Its fronts
;;; are 2, 3 or 4 EQUAL overlay drawers ("w vanity default to sa rowne"), in
;;; one column or in two with a DIVIDER mid-width ("patrz szafa"). Under a
;;; basin (to the eye only) the top drawer's box takes a U 160 wide and 120
;;; deep round the trap ("wyciecie u dookola"), its sides kept; where the
;;; trap has no room the room says so in Check #39, it never re-cuts what the
;;; owner asked for. It stands on the house plinth or floats on two hangers.
;;;
;;;========================================
;;; 2. DECISIONS TAKEN FOR THE OWNER (each one line to veto)
;;;========================================
;;;
;;; D1  THE PARENT IS KIT_BUDR_FULL (CONFIRMED 12:57 "z szufladami
;;;     nawierzchniowymi"). The sides, the TOP, the BOTTOM, the runners and
;;;     their rows, the boxes, the fronts, the legs and every hole of them are
;;;     the parent's; this file writes only the differences, each a section of
;;;     part 5, and restates (part 4) the parent's numbers it computes with.
;;; D2  NO BACK: THE BACK CUT OUT (CONFIRMED 12:57 "nie ma plecow na vanity
;;;     unit tylko sa poziome poprzeczki na dole i na gorze, plecy sa jakby
;;;     wyciete"; 13:03 "4 - 100 na material carcasa grubosc"). RAIL-BOTTOM and
;;;     RAIL-TOP are W long, vanityRailH 100 high, G thick, on edge, in the
;;;     BACK's own plane (z 0 to G, behind the sides' back edges, their ends
;;;     flush with the sides' outer faces), RAIL-BOTTOM up from the carcass's
;;;     underside and RAIL-TOP down from its top, where the back's bottom and
;;;     top edges stood. CLAUDE.md's "between the sides ... flush
;;;     with the sides' back edges" is read with the owner's own "plecy sa
;;;     jakby wyciete": the rail is the back with its middle cut out, so it
;;;     spans the back's width with its inside face on the sides' back edges,
;;;     as KIT_FRIDGE's back rails stand. Between the rails the back is open.
;;; D3  THE RAIL KEEPS THE BACK'S JOINT THAT LANDS INSIDE IT (DERIVED;
;;;     CLAUDE.md "fixed as the back-to-side joint of the house, dog bones or
;;;     Cabineo as the project chooses"). Every feature of the parent's back
;;;     joint, in the project's joint system, is cut where it lands WHOLLY
;;;     inside a rail and nowhere else: turn 18's rule for the oven's short
;;;     back (puzzle.js sidePanelGeometry backTabsBelow, a tab is kept only if
;;;     its whole dog bone lands inside the back), read over two bands.
;;; D4  THE SIDES' BACK TABS GO, EVERY ONE (DERIVED from D3). A tab's dog bone
;;;     is 30 either side of its centre: the outer tabs at 95 and H - 95 reach
;;;     125 and H - 125, past a 100 rail's inside edge, and the middle tab (a
;;;     carcass 600 or higher) stands in the open back. So the sides' back
;;;     edges are straight, as KIT_SINK's are ("no back tenons"), and no rail
;;;     takes a side socket. On the puzzle each side is held by the back's own
;;;     END screw, 50 from each end of the back (50 up in RAIL-BOTTOM, 50 down
;;;     in RAIL-TOP, G / 2 in from the rail's end), and the TOP's and BOTTOM's
;;;     back tenons stay in the rails' long-edge sockets with their dog bones,
;;;     where the back took them; the back's screws between the tabs stand in
;;;     the open back and go. On Cabineo (SKYLON_JOINTS_CABINEO D.2b) each
;;;     side's back joint keeps the pockets section B sets out e from its ends
;;;     (50 and H - 50 at e 50), inside the rails, and drops the rest;
;;;     TOP-BACK and BOTTOM-BACK stay whole, the rails their counterparts. The
;;;     biscuit set keeps the back on the screws; the dowel set's back rows
;;;     obey the same band.
;;; D5  THE SIDES' DEPTH IS THE PARENT'S, D - G (DERIVED). The rails stand where
;;;     the back stood, so nothing in front of the back's plane moves: the
;;;     sides, the TOP and the BOTTOM keep the parent's cut, the box keeps the
;;;     parent's D - G - 20 (the rail's G is the back's G), and the carcass is D
;;;     deep at the rails. In the open back the sides' back edges stand G in
;;;     front of the rails' back face. The box's back face stands D - front -
;;;     box from the carcass back (35 on the default), clear of the rails'
;;;     inside face at G; the parent's placement (the box front a front's
;;;     thickness behind the carcass front) lets it reach G + 20 - front when
;;;     D - G - 20 lands on a rung (13 at D 528 on a 25 front: 5 into the
;;;     back, the BUDR's own today), the parent's to mend, not this file's.
;;; D6  THE SERVICE VOID 80 (CONFIRMED 13:03 "3 - 80"). The kit's defaults write
;;;     wall_gap = the project's clearance + vanityServiceVoid (10 + 80 = 90 on
;;;     the house's room.wallBackClearance), never typed, so every reader of
;;;     wallGapOf (the room, the drag, the worktop, the plan, the section)
;;;     sees the void behind the rails' back face. A note, never a fault:
;;;     Check #45 "Service void 80 behind the vanity for the pipes".
;;; D7  THE TOP IS THE WORKTOP, TO THE WALL (CONFIRMED 13:03 "5 - blat osobny
;;;     element jak worktop"). Not a board of this kit: the house worktop, its
;;;     thickness typed (vanityTop 20 the default), its depth from the WALL
;;;     line: wall_gap + D + the door gap + the front + the worktop's front
;;;     overhang (worktop.js's reach, plus the gap to the wall).
;;; D8  EQUAL OVERLAY DRAWERS (CONFIRMED 12:57 "wybor jak zawsze 2 3 i 4 ale
;;;     pamietaj ze w vanity default to sa rowne"). n = 2, 3 or 4 (VANITY2,
;;;     VANITY3, VANITY4), by the parent's equal variant: available = H - 3n,
;;;     each front fix(available / n + 0.5), the top one takes what the
;;;     rounding left (baseDrawerUnit variants, exact); front 1 overlays the
;;;     BOTTOM from 0, 3 between fronts and 3 under the top; width W - 3.
;;;     Heights the joiner sets follow the parent's own-heights law
;;;     (cabinet.js budrHeightsWithOwn), untouched here.
;;; D9  THE BOX IS THE RUNNER LESS TEN (CONFIRMED, the owner 17.10.2026:
;;;     "wszedzie szuflada musi miec 10 mm mniej od prowadnicy"). The box is
;;;     the longest rung of the runner ladder whose box, the rung less 10,
;;;     fits D - G - 20; its sides, walls and bottom are the parent's.
;;; D10 THE TWO COLUMNS (CONFIRMED 12:57 "external drawers ale wybor 2 rows,
;;;     patrz szafa"; the chest 13:03 "7 - tak"). The wardrobe's rule (T79 F3:
;;;     "a divider mid-width, a stack in each column, one fixed shelf over
;;;     both") with the carcass TOP as the board over both: a DIVIDER at
;;;     (W - G) / 2, the same n equal drawers in each column, each column's
;;;     boxes the parent's law over the column's own clear width.
;;; D11 THE DIVIDER STANDS ON THE BOTTOM AND UNDER THE TOP (the house law:
;;;     material never enters another material). From the BOTTOM's top face
;;;     (G) to the TOP's underside (H - G), H - 2G high; from the back's
;;;     inside face (z G, the sides' back edges) to the carcass front, D - G
;;;     deep, the sides' depth (the runners' full-depth wall, T32 F4); in the
;;;     vanity its back edge meets the rails' inside faces and stands open
;;;     between them, in the chest it meets the BACK; its head and foot
;;;     jointed as the house's divider (cabinet.js, CHAT FIX 17.10.2026); the
;;;     runner rows of both columns on its two faces, as the wardrobe's
;;;     divider between two drawer columns carries them.
;;; D12 THE PAIR OF FRONTS (DERIVED, the house's pair, doors.doubleTotalGap 6):
;;;     two columns' fronts are (W - 6) / 2 wide, 1.5 in from the carcass's
;;;     outer faces and 3 apart on the divider's centre line.
;;; D13 THE TRAP'S U (CONFIRMED 13:03 "2 wyciecie u dookola zeby sie szuflada
;;;     otwierala"; 13:46 "6 - tak"). In the TOP drawer's box of the column
;;;     under each waste: vanityTrapW 160 wide centred on the waste's x,
;;;     vanityTrapD 120 into the box from its back face, vanityTrapR 20 at its
;;;     two inside corners; the box's sides stay. It runs through the back
;;;     wall's whole height, so the back wall is cut as k + 1 boards for k U's,
;;;     {tag}-BB-1 .. {tag}-BB-k+1 from the left ({tag} the parent's D3, or
;;;     Z1D3 / Z2D3 on two columns, the wardrobe's column tag); the bottom's
;;;     back edge takes the notch, traced as socketFace.js notchPoints traces
;;;     a filleted notch. No drawer below the top one ever takes a U.
;;; D14 THE WASTES (PROPOSED, CLAUDE.md F11): one basin at W / 2; two at the
;;;     fronts' centres of two columns (W / 4 and 3W / 4) or at W / 3 and 2W / 3
;;;     on one; the waste vanityWasteFromBack 200 from the carcass back (the
;;;     rails' back face).
;;; D15 THE NUMBERS DISAGREE AND THE ROOM SAYS SO (DECIDED here: the owner's
;;;     confirmed U rules, the proposed waste stays where it was proposed).
;;;     The box's back face stands D - front - box from the carcass back (35 on
;;;     the default: 500 - 25 - 440), so the U reaches 155 and the waste at 200
;;;     stands 45 beyond it: the drawer would shut on the trap. Neither number
;;;     moves here: the U is cut as confirmed and Check #39 says "The trap
;;;     stands 45 mm beyond the U". A U that takes a trap as wide as itself
;;;     centred on that waste is 200 + 80 - 35 = 245 deep: the owner's to set.
;;; D16 THE TRAP'S BOTTOM LINE (PROPOSED reading; CLAUDE.md names no trap
;;;     height): the underside of the top drawer's BOTTOM board, its runner
;;;     line + 13.5 + 15, the plane the U opens through. The box under it must
;;;     stand vanityTrapClear 60 (PROPOSED) below that line, else no second U
;;;     is cut and Check #39 says "Use a shallow trap" (12:57 "w razie czego
;;;     jak nie bedzie miejsca to zostawimy informacje prosze uzyc shallow
;;;     trap").
;;; D17 A WASTE OVER THE DIVIDER (DERIVED): one basin on two columns puts its
;;;     waste on the divider; no box takes it, no U is cut and Check #39 says
;;;     "The trap stands over the divider". A U that would cross a box's side
;;;     or meet the next U is not cut either: "The trap's U does not fit the
;;;     top drawer's box".
;;; D18 THE CARCASS TOP STAYS WHOLE (DERIVED, 12:57 "dodajesz tylko do
;;;     widoku"). The basin is to the eye: nothing is cut for its bowl, in the
;;;     TOP, the worktop or a box, and nothing of it is in the cut list; the
;;;     waste's way through the TOP and the worktop is cut on site, as the
;;;     worktop's own cut-outs are (autoParts.worktop.cnc false).
;;; D19 PLINTH OR FLOATING (CONFIRMED 12:57 "plinth do zmiany wysokosc,
;;;     propozycja floating lub on the floor"; 13:03 "6 - do BOM tez"). On the
;;;     floor: the house plinth and legs, the height typed (vanityPlinth 100
;;;     the default). Floating: no legs, no plinth, mount "wall", the carcass
;;;     underside at float_height_mm (vanityFloatHeight 300, PROPOSED), and the
;;;     BOM takes vanityHangersPerUnit 2 hangers, "Cabinet hanger 50 kg with
;;;     wall plate", article empty for the owner (PROPOSED); RAIL-TOP is where
;;;     they bite.
;;; D20 THE CHEST OF DRAWERS (CONFIRMED 13:03 "7 - tak"). WARDROBE_CHEST2/3/4
;;;     take D8 (equal by default, a birth answer: the bare kit keeps its
;;;     golden split) and section 5(c2) THE TWO COLUMNS whole. Nothing else of
;;;     this file: its back stays, no rails, no void, no basin, no U.
;;; D21 THE CHECKS. #39 is the trap's (D15, D16, D17), its sentences written
;;;     by vanity-trap-verdict; the void is the note #45 (CLAUDE.md's #40: the
;;;     in-frame project holds #40 to #44 since T80 F10).
;;; D22 THE UNIT NUMBER is VU (VU01, VU02), one prefix for the three counts, as
;;;     the drawer base's DR is.
;;;
;;;========================================
;;; 3. CONSTANTS (the owner's numbers; profile.vanity mirrors them)
;;;========================================

;; profile.vanity.serviceVoidMm      CONFIRMED 13:03 "3 - 80"
(defun vanityServiceVoid ( / ) 80.0)
;; profile.vanity.railHeightMm       CONFIRMED 13:03 "4 - 100 na material carcasa grubosc"
(defun vanityRailH ( / ) 100.0)
;; profile.vanity.trapWidthMm        CONFIRMED 13:03 "2 wyciecie u dookola", 13:46 "6 - tak"
(defun vanityTrapW ( / ) 160.0)
;; profile.vanity.trapDepthMm        CONFIRMED 13:03 "2 wyciecie u dookola", 13:46 "6 - tak"
(defun vanityTrapD ( / ) 120.0)
;; profile.vanity.trapRadiusMm       CONFIRMED 13:46 "6 - tak"
(defun vanityTrapR ( / ) 20.0)
;; profile.vanity.trapClearMm        PROPOSED (the sentence is the owner's, 12:57: "prosze uzyc shallow trap")
(defun vanityTrapClear ( / ) 60.0)
;; profile.vanity.wasteFromBackMm    PROPOSED (CLAUDE.md F11)
(defun vanityWasteFromBack ( / ) 200.0)
;; profile.vanity.basin              PROPOSED, to the eye only (12:57 "dodajesz tylko do widoku")
(defun vanityBasinShape ( / ) "oval")
(defun vanityBasinW ( / ) 520.0)
(defun vanityBasinD ( / ) 400.0)
(defun vanityBasinH ( / ) 150.0)
;; profile.vanity.defaults           PROPOSED (CLAUDE.md F9 and THE NUMBERS)
(defun vanityWidth ( / ) 900.0)
(defun vanityHeight ( / ) 600.0)
(defun vanityDepth ( / ) 500.0)
(defun vanityPlinth ( / ) 100.0)
(defun vanityTop ( / ) 20.0)
(defun vanityFloatHeight ( / ) 300.0)
;; profile.vanity.hangers            in the BOM CONFIRMED 13:03 "6 - do BOM tez"; count, name PROPOSED; article empty for the owner
(defun vanityHangersPerUnit ( / ) 2)
(defun vanityHangerName ( / ) "Cabinet hanger 50 kg with wall plate")
(defun vanityHangerArticle ( / ) "")

;;;========================================
;;; 4. THE PARENT'S NUMBERS, RESTATED (never changed here)
;;;========================================
;;;
;;; The drawer law as the engine cuts KIT_BUDR_FULL today. Each one is the
;;; profile key named beside it; test/turn82-f08-vanity-lisp.test.js holds the
;;; two equal, so the day the house moves one this file says so.

(defun vanityGap ( / ) 3.0)                ;; baseDrawerUnit.gap: between fronts, and under the top
(defun vanityFrontDeduction ( / ) 3.0)     ;; baseDrawerUnit.frontWidthDeduction: front W = W - 3
(defun vanityPairGap ( / ) 6.0)            ;; doors.doubleTotalGap: a pair = (W - 6) / 2
(defun vanitySideRatio ( / ) 0.7)          ;; baseDrawerUnit.sideRatio: box side = fix(0.7 front + 0.5)
(defun vanityBoxAboveRunner ( / ) 13.5)    ;; baseDrawerUnit.boxAboveRunner (T20)
(defun vanityBottomGroove ( / ) 15.0)      ;; baseDrawerUnit.runnerPocketWidth: the bottom stands this above the side's foot
(defun vanityBoxTopClear ( / ) 5.0)        ;; baseDrawerUnit.boxTopClearance (T25 F8, the owner's 5)
(defun vanityMinBoxInside ( / ) 40.0)      ;; baseDrawerUnit.minBoxInside
(defun vanityBoxWallDeduction ( / ) 15.0)  ;; baseDrawerUnit.boxFrontHeightDeduction
(defun vanityBoxWallExtra ( / ) 1.0)       ;; baseDrawerUnit.boxFrontHeightExtra
(defun vanityDepthAllowance ( / ) 20.0)    ;; baseDrawerUnit.depthAllowance: usable = D - G - 20
(defun vanityBoxClear ( / ) 10.0)          ;; baseDrawerUnit.boxWidthClearance and boxFrontClearance
(defun vanityBottomOversize ( / ) 13.0)    ;; baseDrawerUnit.bottomOversize
(defun vanityRunnerOverBox ( / ) 10.0)     ;; hardware.runner.movento.nominalOverBoxMm (17.10.2026)
(defun vanityTabFromEnd ( / ) 95.0)        ;; puzzle.tabCentresFromEnd
(defun vanityTabSingleAtOrBelow ( / ) 300.0)  ;; puzzle.singleTabAtOrBelow
(defun vanityTabMiddleBelow ( / ) 600.0)   ;; puzzle.middleTabBelow (T52 F3, the owner's 600)
(defun vanityDogboneHalf ( / ) 30.0)       ;; puzzle.dogboneHalfHeight
(defun vanityBackScrewFromEnd ( / ) 50.0)  ;; puzzle.screwFromEnd: drawBACK's end screws
;; hardware.runner.movento.nominalLadder (T25 F9, CHAT FIX 17.10.2026)
(defun vanityRunnerLadder ( / )
  (list 250.0 270.0 300.0 320.0 350.0 380.0 400.0 450.0 500.0 550.0 600.0 650.0 700.0))

;;;========================================
;;; 5. ROUTINES
;;;========================================
;;;
;;; A FRONT is (col idx x0 y0 w h), col 1 or 2, idx 1 up from the bottom, in
;;; the carcass's own frame (x from its left outer face, y from its underside).
;;; A BOX is (col idx x0 boxW side base depth zBack): x0 its left side's outer
;;; face, side the side's height, base the side's foot above the carcass
;;; underside, zBack its back face from the carcass back (z 0 the rails' back
;;; face, z D the carcass front). A RAIL is (name x0 y0 z0 length height t). A
;;; U is (col xFrom xTo depth r) in the carcass's x, depth from the box's back
;;; face.

;;; A figure for a sentence: 45, or 45.5.
(defun vanity-mm (v)
  (if (= v (fix v)) (itoa (fix v)) (rtos v 2 1)))

;;; ---- (a) THE BACK CUT OUT: RAIL-BOTTOM AND RAIL-TOP ----

;;; The two rails, where the back stood (D2).
(defun vanity-rails (W H G / r)
  (setq r (vanityRailH))
  (list (list "RAIL-BOTTOM" 0.0 0.0 0.0 (float W) r (float G))
        (list "RAIL-TOP" 0.0 (- H r) 0.0 (float W) r (float G))))

;;; The open back between them: (y0 y1).
(defun vanity-back-window (H)
  (list (vanityRailH) (- H (vanityRailH))))

;;; Which rail a feature of the back lands WHOLLY inside, by its vertical
;;; extent lo .. hi: "RAIL-BOTTOM", "RAIL-TOP" or nil (D3). An edge feature
;;; may run past the back's own outer edge (a socket's overshoot); only the
;;; rail's inside edge, the window's, bounds it.
(defun vanity-rail-of (lo hi H / r)
  (setq r (vanityRailH))
  (cond ((<= hi r) "RAIL-BOTTOM")
        ((>= lo (- H r)) "RAIL-TOP")
        (T nil)))

;;; The tab centres along a board of length len (puzzle.js tabCentres).
(defun vanity-tab-centres (len / e)
  (setq e (vanityTabFromEnd))
  (cond ((<= len (vanityTabSingleAtOrBelow)) (list (/ len 2.0)))
        ((< len (vanityTabMiddleBelow)) (list e (- len e)))
        (T (list e (/ len 2.0) (- len e)))))

;;; The sides' back tabs a rail keeps: a tab, and the back's socket for it,
;;; only where its whole dog bone lands inside a rail (D3, D4).
(defun vanity-side-tabs-kept (H / half out c)
  (setq half (vanityDogboneHalf)
        out nil)
  (foreach c (vanity-tab-centres H)
    (if (vanity-rail-of (- c half) (+ c half) H) (setq out (cons c out))))
  (reverse out))

;;; The back's side screw rows (puzzle.js backPanelGeometry): 50 from each end
;;; and one between every two tabs.
(defun vanity-back-side-screws (H / prev out c)
  (setq out (list (vanityBackScrewFromEnd))
        prev nil)
  (foreach c (vanity-tab-centres H)
    (if prev (setq out (cons (/ (+ prev c) 2.0) out)))
    (setq prev c))
  (reverse (cons (- H (vanityBackScrewFromEnd)) out)))

;;; ...and those the rails keep: ((rail y) ...), y up from the rail's own
;;; underside, at G / 2 in from each of its ends (D4).
(defun vanity-rail-side-screws (H / r out y rail)
  (setq r (vanityRailH)
        out nil)
  (foreach y (vanity-back-side-screws H)
    (setq rail (vanity-rail-of y y H))
    (if rail
      (setq out (cons (list rail (if (= rail "RAIL-TOP") (- y (- H r)) y)) out))))
  (reverse out))

;;; ---- (b) THE SERVICE VOID AND THE TOP TO THE WALL ----

;;; The unit's wall_gap, written by the kit's defaults (D6).
(defun vanity-wall-gap (clearance)
  (+ clearance (vanityServiceVoid)))

;;; The worktop's depth from the wall line (D7).
(defun vanity-top-depth (wallGap D doorGap frontT overhang)
  (+ wallGap D doorGap frontT overhang))

;;; The note (D6, D21).
(defun vanity-void-note ( / )
  (strcat "#45 Service void " (vanity-mm (vanityServiceVoid)) " behind the vanity for the pipes"))

;;; ---- (c) THE EQUAL OVERLAY DRAWERS AND THEIR BOXES ----

;;; n equal fronts over H, bottom to top, the top one taking the rounding (D8).
(defun vanity-front-heights (H n / avail each out i sum drift)
  (setq avail (- H (* n (vanityGap)))
        each (fix (+ (/ avail (float n)) 0.5))
        out nil
        i 0
        sum 0.0)
  (while (< i n)
    (setq out (cons (float each) out)
          sum (+ sum each)
          i (1+ i)))
  (setq drift (- avail sum))
  (if (/= drift 0.0) (setq out (cons (+ (car out) drift) (cdr out))))
  (reverse out))

;;; Each front's base: 0, then the front below and the gap.
(defun vanity-front-ys (hs / y out h)
  (setq y 0.0
        out nil)
  (foreach h hs
    (setq out (cons y out)
          y (+ y h (vanityGap))))
  (reverse out))

;;; The fronts of the unit, column by column (D8, D12).
(defun vanity-fronts (W H n columns / hs ys half fw xs out col x i)
  (setq hs (vanity-front-heights H n)
        ys (vanity-front-ys hs)
        half (/ (vanityFrontDeduction) 2.0)
        out nil
        col 1)
  (if (= columns 2)
    (setq fw (/ (- W (vanityPairGap)) 2.0)
          xs (list half (- W half fw)))
    (setq fw (- W (vanityFrontDeduction))
          xs (list half)))
  (foreach x xs
    (setq i 0)
    (while (< i n)
      (setq out (cons (list col (1+ i) x (nth i ys) fw (nth i hs)) out)
            i (1+ i)))
    (setq col (1+ col)))
  (reverse out))

;;; The box's depth: the longest rung whose box, the rung less 10, fits
;;; D - G - 20; the shortest when none does, as the parent does (D9).
(defun vanity-box-depth (D G / maxDl best r)
  (setq maxDl (- D G (vanityDepthAllowance))
        best nil)
  (foreach r (vanityRunnerLadder)
    (if (<= (- r (vanityRunnerOverBox)) maxDl) (setq best (- r (vanityRunnerOverBox)))))
  (if best best (- (car (vanityRunnerLadder)) (vanityRunnerOverBox))))

;;; The runner's underside under each drawer: the carcass floor G for drawer
;;; 1, its front's base for the rest (KIT_BUDR_FULL L712-714, T21 F1.1).
(defun vanity-runner-bottoms (ys G / out i y)
  (setq out nil
        i 0)
  (foreach y ys
    (setq out (cons (if (= i 0) (float G) y) out)
          i (1+ i)))
  (reverse out))

;;; One box side: the parent's 70 % of its front, raised to the floor, cut
;;; under what is above it (drawerBox.js resolveBoxSide).
(defun vanity-box-side (front base ceiling GB / want lowest cap h)
  (setq want (fix (+ (* front (vanitySideRatio)) 0.5))
        lowest (+ (vanityMinBoxInside) (vanityBoxWallDeduction) GB (vanityBoxWallExtra))
        cap (- ceiling (vanityBoxTopClear) base)
        h (max want lowest))
  (if (> h cap) (max 0.0 cap) (float h)))

;;; Every box, column by column, bottom to top (D9, D10).
(defun vanity-boxes (W H D G GB frontT n columns / hs ys rb depth zBack out col o x0 bw i base ceil side)
  (setq hs (vanity-front-heights H n)
        ys (vanity-front-ys hs)
        rb (vanity-runner-bottoms ys G)
        depth (vanity-box-depth D G)
        zBack (- D frontT depth)
        out nil
        col 1)
  (foreach o (vanity-openings W G columns)
    (setq x0 (+ (car o) (/ (vanityBoxClear) 2.0))
          bw (- (cadr o) (car o) (vanityBoxClear))
          i 0)
    (while (< i n)
      (setq base (+ (nth i rb) (vanityBoxAboveRunner))
            ceil (if (< (1+ i) n) (nth (1+ i) rb) (- H G))
            side (vanity-box-side (nth i hs) base ceil GB))
      (setq out (cons (list col (1+ i) x0 bw side base depth zBack) out)
            i (1+ i)))
    (setq col (1+ col)))
  (reverse out))

;;; A box's numbers.
(defun vanity-box-top (b) (+ (nth 5 b) (nth 4 b)))
(defun vanity-box-under (b) (+ (nth 5 b) (vanityBottomGroove)))
(defun vanity-box-len (b GB) (- (nth 3 b) GB GB))
(defun vanity-box-wall-h (b GB) (- (nth 4 b) (vanityBoxWallDeduction) GB (vanityBoxWallExtra)))
(defun vanity-box-bottom-w (b GB) (+ (vanity-box-len b GB) (vanityBottomOversize)))

;;; The box of column col, drawer idx.
(defun vanity-box-of (boxes col idx / out b)
  (setq out nil)
  (foreach b boxes
    (if (and (= (nth 0 b) col) (= (nth 1 b) idx)) (setq out b)))
  out)

;;; A box's tag: the parent's D3, or the wardrobe's column tag Z1D3 (D13).
(defun vanity-box-tag (col idx columns)
  (if (= columns 2)
    (strcat "Z" (itoa col) "D" (itoa idx))
    (strcat "D" (itoa idx))))

;;; ---- (c2) THE TWO COLUMNS: THE VANITY AND THE CHEST ----
;;;
;;; The section WARDROBE_CHEST2/3/4 take whole (D20): the openings, the
;;; divider, the pair of fronts (vanity-fronts at columns 2) and a stack of
;;; boxes in each opening (vanity-boxes at columns 2). With columns 1 the
;;; carcass's one opening is the parent's, and nothing below moves.

;;; The clear openings, left to right: ((x0 x1) ...) (D10, D11).
(defun vanity-openings (W G columns)
  (if (= columns 2)
    (list (list (float G) (/ (- W G) 2.0)) (list (/ (+ W G) 2.0) (- W G)))
    (list (list (float G) (- W G)))))

;;; The divider: (name x0 y0 z0 w h d), on the BOTTOM, under the TOP, the
;;; sides' depth (D11); nil on one column.
(defun vanity-divider (W H D G columns)
  (if (= columns 2)
    (list "DIVIDER" (/ (- W G) 2.0) (float G) (float G) (float G) (- H G G) (- D G))
    nil))

;;; ---- (d) THE TRAP ----

;;; The wastes' x, left to right (D14).
(defun vanity-wastes (W columns sinks)
  (cond ((= sinks 1) (list (/ W 2.0)))
        ((and (= sinks 2) (= columns 2)) (list (/ W 4.0) (* W 0.75)))
        ((= sinks 2) (list (/ W 3.0) (/ (* W 2.0) 3.0)))
        (T nil)))

;;; The top drawer's box that stands under the waste at xw, between its own
;;; sides, or nil (D17).
(defun vanity-top-box-under (boxes n xw GB / out b)
  (setq out nil)
  (foreach b boxes
    (if (and (= (nth 1 b) n)
             (>= xw (+ (nth 2 b) GB))
             (<= xw (- (+ (nth 2 b) (nth 3 b)) GB)))
      (setq out b)))
  out)

;;; The U round the trap at xw in box b (D13).
(defun vanity-trap-u (b xw / half)
  (setq half (/ (vanityTrapW) 2.0))
  (list (nth 0 b) (- xw half) (+ xw half) (vanityTrapD) (vanityTrapR)))

;;; Does the U stand inside the box's sides, clear of the U before it?
(defun vanity-u-fits-p (b u prev GB)
  (and (>= (nth 1 u) (+ (nth 2 b) GB))
       (<= (nth 2 u) (- (+ (nth 2 b) (nth 3 b)) GB))
       (or (null prev) (/= (nth 0 prev) (nth 0 u)) (>= (nth 1 u) (nth 2 prev)))))

;;; Every waste's plan: ((xw box u status) ...), status "CUT", "DIVIDER" or
;;; "FIT" (D13, D17).
(defun vanity-trap-plan (W H D G GB frontT n columns sinks / boxes out xw b u prev)
  (setq boxes (vanity-boxes W H D G GB frontT n columns)
        out nil
        prev nil)
  (foreach xw (vanity-wastes W columns sinks)
    (setq b (vanity-top-box-under boxes n xw GB))
    (cond
      ((null b) (setq out (cons (list xw nil nil "DIVIDER") out)))
      (T
        (setq u (vanity-trap-u b xw))
        (if (vanity-u-fits-p b u prev GB)
          (setq out (cons (list xw b u "CUT") out)
                prev u)
          (setq out (cons (list xw b u "FIT") out))))))
  (reverse out))

;;; The U's that are cut: ((tag u) ...).
(defun vanity-trap-us (W H D G GB frontT n columns sinks / out e)
  (setq out nil)
  (foreach e (vanity-trap-plan W H D G GB frontT n columns sinks)
    (if (= (nth 3 e) "CUT")
      (setq out (cons (list (vanity-box-tag (car (nth 1 e)) n columns) (nth 2 e)) out))))
  (reverse out))

;;; The U as the notch in the bottom board's own frame: (from to depth r), a
;;; along its back edge from its left end, d into the box (D13).
(defun vanity-u-in-bottom (b u GB / left)
  (setq left (+ (nth 2 b) (/ (- (nth 3 b) (vanity-box-bottom-w b GB)) 2.0)))
  (list (- (nth 1 u) left) (- (nth 2 u) left) (nth 3 u) (nth 4 u)))

;;; The notch's outline in that frame: (points centres r). The points run
;;; from the back edge round the notch and back to it; the two quarter arcs of
;;; radius r join the second to the third and the fourth to the fifth, about
;;; the two centres (socketFace.js notchPoints, the radius never more than
;;; half the width or the depth).
(defun vanity-u-outline (nt / a0 a1 d r)
  (setq a0 (nth 0 nt)
        a1 (nth 1 nt)
        d (nth 2 nt)
        r (min (nth 3 nt) (/ (- a1 a0) 2.0) d))
  (list (list (list a0 0.0) (list a0 (- d r)) (list (+ a0 r) d)
              (list (- a1 r) d) (list a1 (- d r)) (list a1 0.0))
        (list (list (+ a0 r) (- d r)) (list (- a1 r) (- d r)))
        r))

;;; The back wall's boards once the U's are cut through it: ((from to) ...)
;;; along its length from its left end, the U's left to right (D13).
(defun vanity-back-pieces (b us GB / left len prev out u)
  (setq left (+ (nth 2 b) GB)
        len (vanity-box-len b GB)
        prev 0.0
        out nil)
  (foreach u us
    (setq out (cons (list prev (- (nth 1 u) left)) out)
          prev (- (nth 2 u) left)))
  (reverse (cons (list prev len) out)))

;;; Their ids: {tag}-BB-1 .. {tag}-BB-k from the left (D13).
(defun vanity-piece-ids (tag k / i out)
  (setq i k
        out nil)
  (while (> i 0)
    (setq out (cons (strcat tag "-BB-" (itoa i)) out)
          i (1- i)))
  out)

;;; How far the waste stands INSIDE the U's reach; negative, beyond it (D15).
(defun vanity-trap-reach (b wasteZ)
  (- (+ (nth 7 b) (vanityTrapD)) wasteZ))

;;; The trap's bottom line (D16), and the air under it to the box below.
(defun vanity-trap-line (b) (vanity-box-under b))
(defun vanity-trap-room (top below) (- (vanity-trap-line top) (vanity-box-top below)))

;;; Check #39: ((kind xw sentence) ...), nil when the trap has its room
;;; (D15, D16, D17).
(defun vanity-trap-verdict (W H D G GB frontT n columns sinks / boxes out e b reach below room)
  (setq boxes (vanity-boxes W H D G GB frontT n columns)
        out nil)
  (foreach e (vanity-trap-plan W H D G GB frontT n columns sinks)
    (setq b (nth 1 e))
    (cond
      ((= (nth 3 e) "DIVIDER")
        (setq out (cons (list "DIVIDER" (car e) "#39 The trap stands over the divider: no top drawer can take its U") out)))
      ((= (nth 3 e) "FIT")
        (setq out (cons (list "FIT" (car e) "#39 The trap's U does not fit the top drawer's box") out)))
      (T
        (setq reach (vanity-trap-reach b (vanityWasteFromBack)))
        (if (< reach 0.0)
          (setq out (cons (list "REACH" (car e)
                                (strcat "#39 The trap stands " (vanity-mm (- reach)) " mm beyond the U: the U reaches "
                                        (vanity-mm (+ (nth 7 b) (vanityTrapD))) " from the carcass back, the waste stands at "
                                        (vanity-mm (vanityWasteFromBack))))
                          out)))
        (if (> n 1)
          (progn
            (setq below (vanity-box-of boxes (car b) (1- n))
                  room (vanity-trap-room b below))
            (if (< room (vanityTrapClear))
              (setq out (cons (list "SHALLOW" (car e)
                                    (strcat "#39 Use a shallow trap: the drawer under it stands " (vanity-mm room)
                                            " mm under the trap's bottom, " (vanity-mm (vanityTrapClear)) " wanted"))
                              out))))))))
  (reverse out))

;;; ---- (e) PLINTH OR FLOATING ----

;;; How the unit stands (D19).
(defun vanity-mount (floating) (if floating "wall" "floor"))
(defun vanity-plinth-p (floating) (not floating))
(defun vanity-base-y (floating floatH plinthH) (if floating floatH plinthH))
(defun vanity-hangers (floating) (if floating (vanityHangersPerUnit) 0))

;;;========================================
;;; 6. NUMBERS (the engine is held to these: test/turn82-f08-vanity-lisp.test.js
;;;    RUNS the routines above on these inputs and reads these lines back)
;;;========================================
;;;
;;; THE WORKED EXAMPLE. VANITY3 W 900 H 600 D 500, G 18, the box board 18, the
;;; front 25, one column, one basin, on the house's clearance 10.
;;; THE BACK. RAIL-BOTTOM 900 x 100 x 18 at y 0 and RAIL-TOP 900 x 100 x 18 at
;;; y 500, both at z 0; the open back from 100 to 500. The sides' back tabs at
;;; 95 300 505 reach 65..125, 270..330 and 475..535: none is kept. The back's
;;; side screws at 50 197.5 402.5 550: 50 kept in RAIL-BOTTOM and 550 in
;;; RAIL-TOP (50 down from its top), the two between the tabs gone. On Cabineo
;;; the sides' back pockets at 50 300 550: 50 and 550 kept.
;;; THE VOID. wall_gap 90; the worktop 638 deep from the wall (90 + 500 + 3 +
;;; 25 + 20).
;;; THE FRONTS. 197 197 197 at y 0 200 400, 897 wide at x 1.5.
;;; THE BOXES. 440 deep (the 450 runner), the back face at z 35; 854 wide at x
;;; 23, the walls 818 long and 104 high, the bottom 831; the sides 138, their
;;; feet at 31.5 213.5 413.5, their tops 169.5 351.5 551.5.
;;; THE TRAP. The waste at x 450, z 200. The U 370..530 in the top box (D3), 120
;;; deep, R 20; in the bottom's frame 335.5..495.5; the back wall cut as D3-BB-1
;;; (0 329) and D3-BB-2 (489 818), 329 each. The trap's bottom line 428.5, the
;;; box under it tops at 351.5: 77 of air, no shallow trap. The U reaches 155:
;;; "#39 The trap stands 45 mm beyond the U: the U reaches 155 from the carcass
;;; back, the waste stands at 200".
;;;
;;; THE SHALLOW TRAP. VANITY4 W 900 H 560 D 500: fronts 137 137 137 137 at y 0
;;; 140 280 420; sides 96; the trap's bottom line 448.5, the box under it tops
;;; at 389.5: 59 of air: "#39 Use a shallow trap: the drawer under it stands 59
;;; mm under the trap's bottom, 60 wanted". The same at H 600: 147 each, 62 of
;;; air, no sentence.
;;;
;;; TWO COLUMNS, TWO BASINS. VANITY3 W 900 H 600 D 500, columns 2, sinks 2: the
;;; DIVIDER at x 441, 18 x 564 x 482 from y 18 and z 18; the openings 18..441 and
;;; 459..882, 423 each; the fronts 447 wide at x 1.5 and 451.5; six boxes 413
;;; wide at x 23 and 464, walls 377, bottoms 390; the wastes at 225 and 675, the
;;; U's 145..305 in Z1D3 and 595..755 in Z2D3; Z1D3's back wall (0 104) and
;;; (264 377).
;;; ONE BASIN ON TWO COLUMNS. The waste at 450 stands on the divider: no U, "#39
;;; The trap stands over the divider: no top drawer can take its U".
;;; TWO BASINS ON ONE COLUMN. The wastes at 300 and 600, the U's 220..380 and
;;; 520..680, the back wall D3-BB-1 (0 179), D3-BB-2 (339 479), D3-BB-3 (639 818).
;;;
;;; THE CHEST. WARDROBE_CHEST3 W 800 H 647 D 568, equal, columns 2: the fronts
;;; 213 213 212 (638 over three, the top one takes the rounding), 397 wide at x
;;; 1.5 and 401.5; the DIVIDER at x 391, 18 x 611 x 550; the openings 373 each.
;;;
;;; FLOATING. mount "wall", no plinth, the carcass underside at 300, 2 hangers.
;;; On the floor: the plinth 100, no hanger.

;;;========================================
;;; 7. THE COMMAND (prints and draws what part 5 returns, nothing more)
;;;========================================

(defun c:VANITY_FULL (/ W H D G GB frontT n columns sinks fronts boxes rails dv f r e)
  (setq W (getreal "\nVanity width <900>: "))
  (if (null W) (setq W (vanityWidth)))
  (setq H (getreal "\nCarcass height <600>: "))
  (if (null H) (setq H (vanityHeight)))
  (setq D (getreal "\nCarcass depth <500>: "))
  (if (null D) (setq D (vanityDepth)))
  (setq G (getreal "\nBoard thickness <18>: "))
  (if (null G) (setq G 18.0))
  (setq GB G)
  (setq frontT (getreal "\nFront thickness <25>: "))
  (if (null frontT) (setq frontT 25.0))
  (setq n (getint "\nDrawers 2, 3 or 4 <3>: "))
  (if (null n) (setq n 3))
  (setq columns (getint "\nColumns 1 or 2 <1>: "))
  (if (null columns) (setq columns 1))
  (setq sinks (getint "\nBasins 0, 1 or 2 <1>: "))
  (if (null sinks) (setq sinks 1))
  (setq rails (vanity-rails W H G)
        dv (vanity-divider W H D G columns)
        fronts (vanity-fronts W H n columns))
  ;; the front view: the rails behind, the divider, the fronts
  (foreach r rails
    (drawRect "CARCASE" (nth 1 r) (nth 2 r) (+ (nth 1 r) (nth 4 r)) (+ (nth 2 r) (nth 5 r))))
  (if dv
    (drawRect "CARCASE" (nth 1 dv) (nth 2 dv) (+ (nth 1 dv) (nth 4 dv)) (+ (nth 2 dv) (nth 5 dv))))
  (foreach f fronts
    (drawRect "DOORS" (nth 2 f) (nth 3 f) (+ (nth 2 f) (nth 4 f)) (+ (nth 3 f) (nth 5 f))))
  (drawText "LABELS" (/ W 2.0) (/ H 2.0) 24.0 "VU01")
  (princ (strcat "\n" (vanity-void-note)))
  (foreach e (vanity-trap-verdict W H D G GB frontT n columns sinks)
    (princ (strcat "\n" (nth 2 e))))
  (princ))
