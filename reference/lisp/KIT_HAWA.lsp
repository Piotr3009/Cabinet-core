;;; Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
;;; Proprietary and confidential. Unauthorised copying, modification,
;;; distribution or use, including by automated tools and AI systems,
;;; is strictly prohibited without prior written permission.
;;;========================================
;;; KIT_HAWA.lsp
;;; THE POCKET DOOR, HAWA CONCEPTA III 25 / 35 - a NEW unit of the run: two
;;; pocket panels, a bottom and a top board, and the door that covers the
;;; cabinet (or cabinets) beside it, swings 90 degrees and slides into the
;;; pocket
;;; Command: HAWA_FULL
;;; Turn 82 (25.10.2026), the owner's numbers of 25.10.2026 over his five
;;; HAWA PDFs - LISP FIRST ("zaczniemy od hawa dodanie")
;;; Derived from: HAWA planning drawing 160704 V07 (overlay door, ONE door
;;;               in a 55 pocket, "Anlage links"), HAWA planning drawing
;;;               169313 V06 (inlaid doors, TWO doors in a 110 pocket), the
;;;               assembly sheets 52676 V02 (Push, left), 31418 V05
;;;               (Connector 55 p1, Connector 110 p2) and 52679 V01
;;;               (adjustment); every number read off them is in
;;;               verify/t82/hawa/hawa-numbers.md and its crops in
;;;               verify/t82/hawa/pages/
;;; Requires: SKYLON_COMMON.lsp loaded first (the command draws with
;;;           drawRect, drawCircle and drawText; the routines need nothing)
;;;========================================
;;;
;;; THE OWNER, 25.10.2026:
;;;
;;;   11:40  "musimy zrobic nowy projekt i zakodowac w kuchni nowy system to
;;;           sie nazywa hawa III sa to drzwi ktore sa pocket doors ..."
;;;   11:40  "potrzebujemy zaprojektowac to jako wstawienie pomiedzy 2 panele
;;;           110 mm przestrzen pomiedzy, wysuwasz pocket door i zakrywasz
;;;           szafke lub szafki"
;;;   13:40  "zaczniemy od hawa dodanie"
;;;   13:46  "panele po bokach to jest nie carcas tylko front zawsze, wiec
;;;           jesli jest 18 mm to daj zawsze 22 mm automatycznie, i napisz
;;;           informacje minimum 19 mm"
;;;   13:46  "raczej zawsze wystaja troche wiec nie ma problemu"
;;;   13:46  "3 tak moga", "4 - tak", "5 - tak"
;;;
;;; THE LAW OF THIS FILE (CLAUDE.md T82): "The manufacturer's sheet is the
;;; law of the hardware": every HAWA number below names its drawing and the
;;; place on the page; where the five documents are silent the number is
;;; PROPOSED and says so (hawa-numbers.md section 9 lists the silences).
;;; Page names: "160704 p1" is the one A3 sheet of drawing 160704, "169313
;;; p1" the one A4 sheet of 169313, "52676 p1 step N" a step of the Push
;;; assembly sheet, "31418 p1 / p2" the Connector 55 / 110 sheets, "52679 p1
;;; step N" a step of the adjustment sheet.
;;;
;;; This is a NEW FILE. It touches no other kit. The six fossil kits and
;;; SKYLON_COMMON are untouched; a kit that is not the pocket cuts what it
;;; cut. Every routine here is named hawa-...; no routine of another kit is
;;; redefined.
;;;
;;;========================================
;;; 1. THE LAW IN ONE PARAGRAPH
;;;========================================
;;;
;;; A POCKET is a unit of the run. ONE door takes a pocket 55 clear between
;;; two panels at the END of a run (160704): panel A on the run's outer end
;;; (the Connector 55 is screwed to it), panel B beside the cabinet (the
;;; tracks and the vertical profile are screwed to it). TWO doors share a
;;; pocket 110 clear between two cabinets (169313): both panels are B, one
;;; door hangs on each. The panels stand on a bottom board and carry a top
;;; board; they are the FRONT's material, 22 when the front is 18 ("daj
;;; zawsze 22 mm automatycznie"). The door is the project's front, S thick;
;;; closed it hangs 3 in front of the carcass front edges and covers its own
;;; panel B and the cabinet(s) beside it ("zakrywasz szafke lub szafki"), its
;;; hinge edge 3 inside panel A (one door) or 1.5 off the pocket's centre
;;; line (two doors). It swings 90 degrees, slides E1 = TB - M into the
;;; pocket along panel B and stands M proud. The pocket is as deep as the
;;; cabinet it serves, never past the 560 track ("raczej zawsze wystaja
;;; troche"), and the room refuses in words exactly where HAWA refuses.
;;;
;;;========================================
;;; 2. DECISIONS (each one line to veto; D1 to D22)
;;;========================================
;;;
;;; D1  THE TWO POCKETS (CONFIRMED by the PDFs). One door: clear 55
;;;     (160704 p1 front view "55"; 31418 p1 Connector 55). Two doors: clear
;;;     110 (169313 p1 front view "110"; 31418 p2 Connector 110 step 1
;;;     "110"). The owner's "110 mm przestrzen pomiedzy" is the two-door
;;;     pocket: 55 is half of it, one door's half (17 hardware + S + air).
;;;     The unit's width is panel + clear + panel: 22 + 55 + 22 = 99 and
;;;     22 + 110 + 22 = 154 on an 18 front, 25 + 55 + 25 = 105 on a 25 one.
;;;
;;; D2  WHICH PANEL IS WHICH (CONFIRMED by 160704 p1, its detail crops).
;;;     Panel B carries the hardware: the tracks top and bottom and the
;;;     vertical profile [4] in the 17 zone on its POCKET face (160704 p1
;;;     front view "17", ">=19"; 52676 p1 step 2). Panel A carries the
;;;     Connector 55 (160704 p1 "Aussenseite A", ">=18"; 31418 p1 step 1).
;;;     In the one-door pocket A is on the run's outer end and B beside the
;;;     covered cabinet: the Draufsicht of 160704 p1 draws the vertical
;;;     profile on the panel next to the cabinet, the door's hinge edge Z3
;;;     inside the OTHER panel's inner face, and that other panel (A)
;;;     running forward to the closed door's front face. Three readings
;;;     agree: (i) the Draufsicht; (ii) every hole of A is dimensioned from
;;;     A's front edge with an S in it (S + 48, S + 23, S + 43: A's front
;;;     edge stands S + 3 forward of the pocket's front plane) while every
;;;     hole of B is not (32, 60, T1 - 55: B's front edge IS the plane);
;;;     (iii) the hinge tables: TA1 + Z3 = 31 for every row of 160704 (29+2,
;;;     28+3, 27+4, 26+5) and TA2 + Z5 / 2 = 31 for every row of 169313
;;;     (29.5+1.5, 29+2, 28.5+2.5, 28+3), so the cup axis stands 31 from the
;;;     half pocket's outer boundary (A's inner face; the centre line of the
;;;     110) whatever the gap: the door's hinge edge cannot reach over A.
;;;     hawa-numbers.md section 2.2 ("B is the outer wall", "the door
;;;     covers B + 55 + A") is read the other way here, on this evidence.
;;;     In the two-door pocket both panels are B (169313 p1 "Beschlagseite
;;;     B" on both; front view "17" at both panels).
;;;
;;; D3  THE PANELS ARE FRONT (CONFIRMED, the owner 13:46). A pocket panel
;;;     is cut in the run's FRONT material, never the carcass: as thick as
;;;     the front when the front is 19 or more (hawaPanelMin, 160704 p1
;;;     ">=19" for B), 22 when it is thinner (hawaPanelThinFront), and the
;;;     Check says #47 "HAWA pocket panels 22: the hardware panel needs 19
;;;     mm minimum" whenever the swap happens. Both panels take the one
;;;     thickness (A's own minimum, 18, 160704 p1 ">=18", is met). They are
;;;     their own cut parts, never a neighbour's side.
;;;
;;; D4  THE BOARDS (the thickness PROPOSED 18; the minimums CONFIRMED). The
;;;     panels STAND ON the bottom board and the top board lies OVER them
;;;     (169313 p1 front views: the panels on the bottom panel, "top panel
;;;     directly on the panels"), both boards the unit's full width W. The
;;;     bottom is >= 18 and the top >= 10 (160704 p1 front views ">=18",
;;;     ">=10"); both are hawaBoardT 18 (PROPOSED). In the one-door pocket the
;;;     Connector 55 cap lies on the panels' top edges and the top board on
;;;     it, 6.5 higher (160704 p1 front view top "6.5"); the two-door top is
;;;     screwed straight onto the panels (169313 p1, no 6.5). The bottom
;;;     board runs forward to the closed door's front face (169313 p1 plan
;;;     of the foot: the board's front edge S + 21 before the foot hole and
;;;     forward of the panels); the top board does the same (PROPOSED: its
;;;     depth is not drawn) and so does panel A (D2): the hinge edge of the
;;;     door is framed on three sides, flush with its face. Panel B is KT
;;;     deep, its front edge on the carcass front plane.
;;;
;;; D5  EH AND TH (CONFIRMED). EH, the installation height, is the panels'
;;;     height: the unit's height H less the bottom, the top and the cap.
;;;     The door stands between the bottom board's top face and the panels'
;;;     top edge: TH = EH - Z1 - Z2 (160704 p1 and 169313 p1 front views,
;;;     Z1 at the top, Z2 at the bottom; hawa-numbers.md 2.3).
;;;
;;; D6  THE DOOR'S WIDTH (the rule CONFIRMED by the PDFs; the free-edge
;;;     clearance is the house's). The door covers its own panel B, the
;;;     covered units' span and its half of the pocket less its hinge gap:
;;;     one door  TB = span + B + (55 - Z3) - far
;;;     two doors TB = span + B + (110 / 2 - Z5 / 2) - far, each door
;;;     where `far` is what the house's front law gives a front's edge at
;;;     the covered unit's far side (profile.doors.clearance: 1.5 at a run
;;;     end or beside another front, 3 at an end panel or a wall), and TB is
;;;     rounded to 0.5. Z5 is the gap BETWEEN the two doors at the centre
;;;     line (169313 p1 Draufsicht; the TA2 + Z5 / 2 = 31 of D2), so each
;;;     door gives up half of it. CLAUDE.md F3's worked "599 (500 + 99)"
;;;     assumed the door covers A as well; on 160704 it cannot (D2), so a BUD
;;;     500 beside a one-door pocket on an 18 front gives 500 + 22 + 52 -
;;;     1.5 = 572.5 (NUMBERS, EXAMPLE 1). TB within 440 to 750 (160704 p1
;;;     table "TB 440 - 750"), else Check #37.
;;;
;;; D7  THE CLASS (CONFIRMED, the owner 13:46 "4 - tak"). III/25 when TH is
;;;     within 1200 to 2200 and the door's weight is within the 25 table at
;;;     its cell; else III/35 when TH is within 1900 to 2700 and within the
;;;     35 table; else refused, Check #37 (160704 p1 tables "TH (III 25)
;;;     1200 - 2200", "TH (III 35) 1900 - 2700" and the two kg tables, also
;;;     on 169313 p1). The weight is TB x TH x S x the front's density
;;;     (hawaDensity 700 kg per m3, PROPOSED for MDF). The CELL is the
;;;     largest tabulated TH at or below the door's and the smallest TB
;;;     column at or above the door's (PROPOSED: the tables do not say how
;;;     to read between rows and columns; in both tables the allowance RISES
;;;     with TH and FALLS with TB, the hinges' lever, so rounding TH down and
;;;     TB up is the safe side). A class the owner sets by hand is kept and
;;;     checked the same way, never changed in silence.
;;;
;;; D8  THE DEPTH (CONFIRMED, the owner 13:46 "raczej zawsze wystaja troche
;;;     wiec nie ma problemu"; the formulas 160704 p1 and 169313 p1 tables).
;;;     T1 = TB + 92 + Z3 - M, E1 = TB - M, M >= S + 3, M <= TB - 320,
;;;     T1 >= 414, KT1 >= T1; T1 <= 567 because the bottom track is supplied
;;;     at most 560 and cut to T1 - 7 ("<=560 = T1 - 7", 160704 p1 and
;;;     169313 p1 "Ablaengen der Profile"). The pocket is as deep as the
;;;     covered cabinet and never deeper, never past the track: T1 = the
;;;     smaller of KT1 and 567; M = TB + 92 + Z3 - T1, the door standing M
;;;     proud. When that M is under S + 3, M = S + 3 and T1 follows (the
;;;     pocket shallower than the cabinet, allowed). The panels are KT deep:
;;;     T1 + RE (hawaRear 20, PROPOSED: 169313's "KT1 >= T1 + RE" has no RE
;;;     in the legend) capped at KT1. The two-door formula prints Z3 where
;;;     only Z5 is defined: Z5 stands in for it (hawa-numbers.md 9.1).
;;;     Refused in words only where HAWA refuses, Check #38: T1 < 414,
;;;     M > TB - 320 (the same as T1 < 412 + Z3), T1 > 567. So a 750 door
;;;     on a 580 cabinet takes T1 567 and stands M 278 proud (CLAUDE.md's
;;;     "M 265 with T1 580" needs a 573 track HAWA does not supply).
;;;
;;; D9  THE GAPS (CONFIRMED nominal). Z1 = 3 top, Z2 = 3 bottom (160704 p1
;;;     "0 - 6", 169313 p1 "3 - 6"), Z3 = 3 the overlay door's hinge edge to
;;;     panel A (160704 p1 "Z3 = 3 (2 - 5)"), Z5 = 3 between the two inlaid
;;;     doors (169313 p1 "Z5 = 3 (3 - 6)"), and the closed door's back face
;;;     3 in front of the pocket's and the cabinets' front edges (both top
;;;     views "3 (2 - 4)").
;;;
;;; D10 THE DOOR'S DRILLING (CONFIRMED, 160704 p1 "Tuere Concepta III 25 /
;;;     III 35" and section C - C; 169313 p1 section B - B; 52676 p1 parts
;;;     list "[11] III 25 = 3x / 35 = 4x"; 52679 p1 step 3). On the door's
;;;     back face, from its hinge edge: the cups fi 35 x 13 on the cup axis
;;;     TA (TA1 by Z3 for the one overlay door, TA2 by Z5 for the two inlaid
;;;     ones), their centres 200 from the top edge and 200 from the bottom
;;;     edge, the rest equal between: 3 cups on III/25, 4 on III/35; at each
;;;     cup two fi 5 x 13, 26 above and 26 below its centre, 9 further from
;;;     the edge than the axis (TA + 9); the fi 8 x 13 sleeve holes on the
;;;     cup axis, 22 from the top edge and 22 from the bottom edge.
;;;
;;; D11 THE III/35 STEEL PROFILES (rows and holes CONFIRMED; the groove
;;;     PROPOSED). 160704 p1 "Tuere Concepta III 35" and "Stahlprofil": the top
;;;     profile's screw row 100 - Z1 below the top edge and the bottom one's 24
;;;     - Z2 above the bottom edge (the extension lines end ON the hole marks,
;;;     crop 160704-p01-door-hinge-drilling), holes M + 8 from the FREE edge
;;;     then every 352 (two 352 drawn on a 750 door) while a hole stays on the
;;;     profile as far from its hinge-end as the first is from its free end (8
;;;     + 3 = 11: the rule PROPOSED, three holes on the drawn 750 door, two on
;;;     a 521 one); the profile is TB - M + 3 long, from the hinge edge to M -
;;;     3 from the free edge. Its holes are fi 8 x 13: the profile is screwed 6
;;;     x 13 into the sleeves [9] (52676 p1 step 13), whose hole is the fi 8 x
;;;     13 of section C - C (PROPOSED reading). The GROOVE the profile lies in
;;;     is 12 wide (CLAUDE.md's reading of the drawing's 12) and 12 deep
;;;     (section C - C, "12" from the back face), centred on its screw row;
;;;     neither is unambiguous on the sheet (hawa-numbers.md 9.10), both
;;;     PROPOSED, the owner confirms. The two vertical channels the drawing
;;;     shows are not dimensioned and are not cut; the 10 / 12 corner mark is
;;;     not labelled and is not cut.
;;;
;;; D12 PANEL B'S HOLES (CONFIRMED, 160704 p1 "Beschlagseite B"; the same
;;;     on both panels of 169313 p1). On B's pocket face, from its front edge:
;;;     the top track's row 22 below the top edge, first hole 32, then every
;;;     160; the bottom track's row 41 above the bottom edge, first hole 60,
;;;     then every 160. A track starts 5 behind the front edge (52676 p1 step 2
;;;     "5") and is T1 - 7 long, so it ends T1 - 2 behind the front edge; a
;;;     hole is cut while its centre is at least 5 before that end
;;;     (hawaTrackHoleEnd, PROPOSED: the count is not printed; the sheet draws
;;;     6 and 5 holes on a panel whose T1 - 55 reads about 784 at the drawing's
;;;     own 160 pitch, T1 about 839, and the rule gives 6 and 5). The CATCH
;;;     BRACKET [3]: a 22 x 70 footprint, its front edge T1 - 55 from the front
;;;     edge, its lower edge on half of EH and its upper edge 70 ABOVE it: the
;;;     crop 160704-p01-panel-holes draws "1/2 EH" from the bottom edge up to
;;;     the footprint's lower corner and the "70" from there UP to its upper
;;;     corner (CLAUDE.md F1(d) and hawa-numbers.md 2.5 say "below"; the sheet
;;;     is the law). Its two screws (4.5 x 20) are not dimensioned: one pilot
;;;     marks the footprint's centre (T1 - 44, EH / 2 + 35).
;;;
;;; D13 PANEL A'S HOLES (CONFIRMED, 160704 p1 "Aussenseite A" and 31418 p1
;;;     step 1; one-door pocket only). On A's pocket face, from A's own front
;;;     edge (S + 3 forward of the plane, D2): the Connector 55 profile's
;;;     row 10 below the top edge, first hole S + 48, then every 160 while
;;;     the hole lies within the track's reach (the same rule as B's, D12,
;;;     counted from the plane; four holes on a 567 pocket, as drawn); the
;;;     bottom brackets' row 22 above the bottom edge at S + 23, then 64,
;;;     then (E1 - 80) / 2, then 64 (two brackets of two holes); the two
;;;     round pads at S + 43, one 60 below the top edge and one 38 above the
;;;     bottom brackets' row (31418 p1 step 1 "60", "38", "S + 43").
;;;
;;; D14 THE FOOT (CONFIRMED, 160704 p1 "Recommendation: use adjustable
;;;     foot", 169313 p1 "fi 35", "S + 21"). The bottom board takes one fi
;;;     35 hole THROUGH for the adjustable foot, centred in the pocket's
;;;     clear width, its centre S + 21 behind the board's front edge. The
;;;     foot is a BOM line (F4), one per pocket.
;;;
;;; D15 THE CNC LAYERS (the names and colours PROPOSED, agreed with the BOM
;;;     and CNC slice; the diameters and depths CONFIRMED except the pilot's).
;;;     HAWA_3MM: the panels' screw pilots, fi 3 x 10 (PROPOSED, CLAUDE.md
;;;     F5: HAWA screws 4.5 x 16 and 4.5 x 20 into the panel face).
;;;     FRONT_HINGES_35MM_D13: the cups, fi 35 x 13. FRONT_HINGES_5MM_D13:
;;;     fi 5 x 13. FRONT_HINGES_8MM_D13: fi 8 x 13, the sleeve holes and the
;;;     III/35 profile's holes. HAWA_FOOT_35MM: the foot hole, through.
;;;     HAWA_GROOVE_12MM: the III/35 groove, a pocket 12 deep. Their ACI
;;;     colours 54 to 58 (the cup's 59) are the next free after
;;;     RECESS_WINDOW 52 and CORNER_4MM 53 (engine/cnc/layers.js). No
;;;     existing layer or record moves: every other kit drills what it drilled.
;;;     AMENDED AFTER THE REVIEW (T82 F5, 25.10.2026): the cup stood on the
;;;     house's FRONT_HINGES_35MM, and a DXF circle carries no depth: the
;;;     shop sets one depth per layer, and that layer's is the house's 11
;;;     (the owner's measured cup), so a HAWA cup and a house cup on one
;;;     sheet could not both be right. The door's three holes take layers
;;;     of their own whose NAMES carry their depth, the house's grammar for
;;;     a depth-bearing layer (FRONT_{KIND}_D{depth}): one layer, one depth.
;;;
;;; D16 THE HAND (CONFIRMED by the drawings). The one-door pocket takes
;;;     hand "R" when its door covers the units on its RIGHT (the pocket at
;;;     the run's left end) and "L" for the mirror. HAWA's "Anlage links"
;;;     (left-hand system, 160704 p1 and 169313 p1) is the pocket on the
;;;     door's LEFT: hand "R" orders the left-hand set, hand "L" the right.
;;;     In the two-door pocket the door covering the units on the right is
;;;     the left-hand set and the other the right-hand set.
;;;
;;; D17 THE COVERED UNITS (CONFIRMED, the owner 13:46 "3 tak moga"). The door
;;;     covers by default the ONE unit beside the pocket on its side, and the
;;;     next one as well while TB stays within 440 to 750. The covered units
;;;     lose their own doors: the HAWA door is their door, closed 3 in front
;;;     of their carcass front edges. A unit with drawer fronts of its own
;;;     cannot be covered (a lay-on front stands S in front of the carcass,
;;;     the door only 3): refused in words, Check #37.
;;;
;;; D18 THE DOOR OPEN (CONFIRMED: the 90 degrees of 52679 p1 step 10, the 17
;;;     zone of 160704 p1). Open, the door stands square to the front in the
;;;     pocket, its back face 17 off panel B's pocket face (the hardware
;;;     zone), its hinge edge E1 behind the front plane and its free edge M
;;;     in front of it. Air between its face and A (or the centre line):
;;;     55 - 17 - S, 12 to 20.
;;;
;;; D19 PUSH AND PULL (CONFIRMED, the owner 13:46 "5 - tak"). Push is the
;;;     default. No cut differs between Push and Pull (160704 p1: one table,
;;;     one set of top views for both); the ejector and the cover strip are
;;;     the set's own parts, a BOM name, never a hole of this kit.
;;;
;;; D20 THE PARTS (CLAUDE.md F4). POCKET-A, POCKET-B, POCKET-TOP,
;;;     POCKET-BOTTOM, POCKET-DOOR, with the unit's number. In the two-door
;;;     pocket the panels are POCKET-B with the ids POCKET-B-L and
;;;     POCKET-B-R (their drilling is mirrored) and the doors POCKET-DOOR
;;;     with the ids POCKET-DOOR-L and POCKET-DOOR-R.
;;;
;;; D21 THE ROOM'S SYMBOLS (PROPOSED, CLAUDE.md F6). No HAWA model is in the
;;;     bucket: the room draws the vertical profile as a block 17 x 60 in
;;;     the hardware zone of panel B (hawaProfileW, hawaProfileD) and the
;;;     two hardware zones 63 at the top and 50 at the bottom (160704 p1
;;;     front views "63", "50"); none of them is a cut part.
;;;
;;; D22 THE ARTICLES (PROPOSED, CLAUDE.md F4). The BOM names one set per
;;;     door (hawa-set-name), one connector per pocket (hawa-connector-name),
;;;     the top and the bottom track cut to T1 - 7, the III/35 steel profile
;;;     TB - M + 3 long, one adjustable foot. The only article the documents
;;;     give is the Haefele UK code of the NBS sheet, 408.30.711, for the
;;;     III/25-35 Push left-hand set; every other article is an empty string
;;;     for the owner to fill, and an empty article prints the name alone.
;;;
;;;========================================
;;; 3. CONSTANTS (profile.hawa mirrors them, key by key; held to each other
;;;    by test/turn82-f01-hawa-lisp.test.js)
;;;========================================

;;; ---- the pocket (D1 D2 D3 D4) ----
(defun hawaPocketOne ( / ) 55.0)        ; clear, one door: 160704 p1 front view "55"; 31418 p1 Connector 55
(defun hawaPocketTwo ( / ) 110.0)       ; clear, two doors: 169313 p1 front view "110"; 31418 p2 step 1 "110"
(defun hawaPanelMin ( / ) 19.0)         ; panel B min: 160704 p1 and 169313 p1 front views ">=19"; the owner 13:46 "minimum 19 mm"
(defun hawaPanelAMin ( / ) 18.0)        ; panel A min: 160704 p1 front view ">=18"
(defun hawaPanelThinFront ( / ) 22.0)   ; the panel on an 18 front: the owner 13:46 "jesli jest 18 mm to daj zawsze 22 mm"
(defun hawaBoardT ( / ) 18.0)           ; top and bottom: PROPOSED (CLAUDE.md THE NUMBERS)
(defun hawaBottomMin ( / ) 18.0)        ; 160704 p1 front view bottom ">=18"
(defun hawaTopMin ( / ) 10.0)           ; 160704 p1 front view top ">=10"
(defun hawaCapOne ( / ) 6.5)            ; the Connector 55 cap under the top board: 160704 p1 front view top "6.5"
(defun hawaHardwareZone ( / ) 17.0)     ; panel B's pocket face to the door's back: 160704 p1 and 169313 p1 front views "17"
(defun hawaZoneTop ( / ) 63.0)          ; the top hardware zone below the panels' top edge: 160704 p1 front view top "63"
(defun hawaZoneBottom ( / ) 50.0)       ; the bottom hardware zone: 160704 p1 front view bottom "50"
(defun hawaProfileW ( / ) 17.0)         ; the room's profile symbol, across: PROPOSED (CLAUDE.md F6 "17 x 60")
(defun hawaProfileD ( / ) 60.0)         ; the room's profile symbol, along the depth: PROPOSED (CLAUDE.md F6)

;;; ---- the gaps (D9) ----
(defun hawaZ1 ( / ) 3.0)                ; top: 160704 p1 table "Z1 0 - 6"; 169313 p1 "Z1 = 3 (3 - 6)"
(defun hawaZ2 ( / ) 3.0)                ; bottom: 160704 p1 table "Z2 0 - 6"; 169313 p1 "Z2 = 3 (3 - 6)"
(defun hawaZ3 ( / ) 3.0)                ; overlay hinge edge to panel A: 160704 p1 Draufsicht "Z3 = 3 (2 - 5)"
(defun hawaZ5 ( / ) 3.0)                ; between the two inlaid doors: 169313 p1 Draufsicht "Z5 = 3 (3 - 6)"
(defun hawaZFront ( / ) 3.0)            ; the closed door's back to the front edges: 160704 p1 and 169313 p1 top views "3 (2 - 4)"

;;; ---- the door (D6 D7) ----
(defun hawaSMin ( / ) 18.0)             ; 160704 p1 table "S 18 - 26"; 169313 p1
(defun hawaSMax ( / ) 26.0)             ; 160704 p1 table "S 18 - 26"
(defun hawaTBMin ( / ) 440.0)           ; 160704 p1 table "TB 440 - 750"; 169313 p1
(defun hawaTBMax ( / ) 750.0)           ; 160704 p1 table "TB 440 - 750"
(defun hawaRound ( / ) 0.5)             ; TB rounded to 0.5: CLAUDE.md F3
(defun hawaTH25Min ( / ) 1200.0)        ; 160704 p1 table "TH (III 25) 1200 - 2200"
(defun hawaTH25Max ( / ) 2200.0)        ; 160704 p1 table "TH (III 25) 1200 - 2200"
(defun hawaTH35Min ( / ) 1900.0)        ; 160704 p1 table "TH (III 35) 1900 - 2700"
(defun hawaTH35Max ( / ) 2700.0)        ; 160704 p1 table "TH (III 35) 1900 - 2700"
(defun hawaKg25 ( / ) 25.0)             ; 160704 p1 "Hawa Concepta III 25" kg table, its largest cell
(defun hawaKg35 ( / ) 35.0)             ; 160704 p1 "Hawa Concepta III 35" kg table, its largest cell
(defun hawaHinges25 ( / ) 3.0)          ; 52676 p1 parts list "[11] III 25 = 3x"; 52679 p1 step 3
(defun hawaHinges35 ( / ) 4.0)          ; 52676 p1 parts list "[11] III 35 = 4x"; 52679 p1 step 3
(defun hawaDensity ( / ) 700.0)         ; kg per m3 of the front board: PROPOSED for MDF (CLAUDE.md F3)

;;; The two kg tables (160704 p1, the same on 169313 p1), rows TH, columns
;;; TB 440 500 550 600 650 700 750; reference/hawa/weight-25.json and
;;; weight-35.json are these rows, cell for cell.
(defun hawaWeightColumns ( / ) '(440.0 500.0 550.0 600.0 650.0 700.0 750.0))
(defun hawaWeight25 ( / )
  '((2200.0 25.0 25.0 25.0 25.0 25.0 25.0 24.0)
    (2150.0 25.0 25.0 25.0 25.0 25.0 25.0 23.0)
    (2100.0 25.0 25.0 25.0 25.0 25.0 24.0 23.0)
    (2050.0 25.0 25.0 25.0 25.0 25.0 24.0 22.0)
    (2000.0 25.0 25.0 25.0 25.0 25.0 23.0 21.0)
    (1950.0 25.0 25.0 25.0 25.0 24.0 22.0 21.0)
    (1900.0 25.0 25.0 25.0 25.0 23.0 21.0 20.0)
    (1850.0 25.0 25.0 25.0 24.0 22.0 21.0 19.0)
    (1800.0 25.0 25.0 25.0 23.0 21.0 20.0 19.0)
    (1750.0 25.0 25.0 25.0 22.0 21.0 19.0 18.0)
    (1700.0 25.0 25.0 24.0 22.0 20.0 19.0 17.0)
    (1650.0 25.0 25.0 23.0 21.0 19.0 18.0 17.0)
    (1600.0 25.0 24.0 22.0 20.0 18.0 17.0 16.0)
    (1550.0 25.0 23.0 21.0 19.0 18.0 16.0 15.0)
    (1500.0 24.0 22.0 20.0 18.0 17.0 16.0 15.0)
    (1450.0 23.0 21.0 19.0 17.0 16.0 15.0 14.0)
    (1400.0 22.0 20.0 18.0 17.0 15.0 14.0 13.0)
    (1350.0 21.0 19.0 17.0 16.0 15.0 14.0 13.0)
    (1300.0 20.0 18.0 16.0 15.0 14.0 13.0 12.0)
    (1250.0 19.0 17.0 15.0 14.0 13.0 12.0 11.0)
    (1200.0 18.0 16.0 15.0 13.0 12.0 11.0 11.0)))
(defun hawaWeight35 ( / )
  '((2700.0 35.0 35.0 35.0 35.0 35.0 35.0 35.0)
    (2650.0 35.0 35.0 35.0 35.0 35.0 35.0 35.0)
    (2600.0 35.0 35.0 35.0 35.0 35.0 35.0 35.0)
    (2550.0 35.0 35.0 35.0 35.0 35.0 35.0 35.0)
    (2500.0 35.0 35.0 35.0 35.0 35.0 35.0 35.0)
    (2450.0 35.0 35.0 35.0 35.0 35.0 35.0 34.0)
    (2400.0 35.0 35.0 35.0 35.0 35.0 35.0 33.0)
    (2350.0 35.0 35.0 35.0 35.0 35.0 34.0 32.0)
    (2300.0 35.0 35.0 35.0 35.0 35.0 34.0 31.0)
    (2250.0 35.0 35.0 35.0 35.0 35.0 33.0 31.0)
    (2200.0 35.0 35.0 35.0 35.0 34.0 32.0 30.0)
    (2150.0 35.0 35.0 35.0 35.0 33.0 31.0 29.0)
    (2100.0 35.0 35.0 35.0 35.0 32.0 30.0 28.0)
    (2050.0 35.0 35.0 35.0 34.0 31.0 29.0 27.0)
    (2000.0 35.0 35.0 35.0 33.0 30.0 28.0 26.0)
    (1950.0 35.0 35.0 35.0 32.0 29.0 27.0 26.0)
    (1900.0 35.0 35.0 34.0 31.0 29.0 27.0 25.0)))

;;; ---- the depth (D8) ----
(defun hawaT1Plus ( / ) 92.0)           ; T1 = TB + 92 + Z3 - M: 160704 p1 and 169313 p1 tables
(defun hawaMPlus ( / ) 3.0)             ; M >= S + 3: 160704 p1 and 169313 p1 tables
(defun hawaMLess ( / ) 320.0)           ; M <= TB - 320: 160704 p1 and 169313 p1 tables
(defun hawaT1Min ( / ) 414.0)           ; T1 >= 414: 160704 p1 and 169313 p1 tables
(defun hawaTrackMax ( / ) 560.0)        ; the bottom track at most: 160704 p1 and 169313 p1 "<=560 = T1 - 7"
(defun hawaTrackLess ( / ) 7.0)         ; tracks cut to T1 - 7: 160704 p1 and 169313 p1 "Ablaengen der Profile"
(defun hawaTrackStart ( / ) 5.0)        ; a track starts 5 behind panel B's front edge: 52676 p1 step 2 "5"
(defun hawaRear ( / ) 20.0)             ; RE behind T1: PROPOSED (169313 p1 "KT1 >= T1 + RE", RE not in the legend)

;;; ---- the door's drilling (D10 D11) ----
(defun hawaCupD ( / ) 35.0)             ; 160704 p1 section C - C "fi 35"; 169313 p1 B - B
(defun hawaCupDepth ( / ) 13.0)         ; 160704 p1 section C - C "13"
(defun hawaCupFromEnd ( / ) 200.0)      ; 160704 p1 doors III 25 and III 35 "200" top and bottom
(defun hawaScrewD ( / ) 5.0)            ; 160704 p1 section C - C "fi 5"
(defun hawaScrewDepth ( / ) 13.0)       ; 160704 p1 section C - C "13"
(defun hawaScrewPitch ( / ) 26.0)       ; 160704 p1 doors "26 / 26" about the cup centre
(defun hawaScrewIn ( / ) 9.0)           ; 160704 p1 doors "9" further from the edge than the cup axis
(defun hawaSleeveD ( / ) 8.0)           ; 160704 p1 section C - C "fi 8"
(defun hawaSleeveDepth ( / ) 13.0)      ; 160704 p1 section C - C "13"
(defun hawaSleeveFromEnd ( / ) 22.0)    ; 160704 p1 section C - C "22"
;;; The cup axis TA from the hinge edge by the gap: overlay TA1 by Z3
;;; (160704 p1 table "Z3 / TA1"), inlaid TA2 by Z5 (169313 p1 "Z5 / TA2").
(defun hawaTA1Table ( / ) '((2.0 29.0) (3.0 28.0) (4.0 27.0) (5.0 26.0)))
(defun hawaTA2Table ( / ) '((3.0 29.5) (4.0 29.0) (5.0 28.5) (6.0 28.0)))
(defun hawaSteelTop ( / ) 100.0)        ; the top profile's row 100 - Z1 below the top: 160704 p1 door III 35 "100 - Z1"
(defun hawaSteelBottom ( / ) 24.0)      ; the bottom profile's row 24 - Z2 above the bottom: 160704 p1 door III 35 "24 - Z2"
(defun hawaSteelFirst ( / ) 8.0)        ; the first hole M + 8 from the free edge: 160704 p1 door III 35 "M + 8"
(defun hawaSteelPitch ( / ) 352.0)      ; then every 352: 160704 p1 door III 35 "352"
(defun hawaSteelPlus ( / ) 3.0)         ; the profile TB - M + 3 long: 160704 p1 "Stahlprofil" "TB - M + 3"
(defun hawaGrooveW ( / ) 12.0)          ; the groove's width: PROPOSED (CLAUDE.md's reading of the "12"; 9.10)
(defun hawaGrooveDepth ( / ) 12.0)      ; the groove's depth: PROPOSED (160704 p1 section C - C "12" from the back face)

;;; ---- the panels' holes (D12 D13 D14) ----
(defun hawaPitch ( / ) 160.0)           ; every row's pitch: 160704 p1 "Aussenseite A", "Beschlagseite B" "160"
(defun hawaBTopAxis ( / ) 22.0)         ; B's top row below the top edge: 160704 p1 "Beschlagseite B" "22"
(defun hawaBTopFirst ( / ) 32.0)        ; B's top row first hole: 160704 p1 "Beschlagseite B" "32"
(defun hawaBBottomAxis ( / ) 41.0)      ; B's bottom row above the bottom edge: 160704 p1 "Beschlagseite B" "41"
(defun hawaBBottomFirst ( / ) 60.0)     ; B's bottom row first hole: 160704 p1 "Beschlagseite B" "60"
(defun hawaBracketLess ( / ) 55.0)      ; the bracket's front edge T1 - 55: 160704 p1 "Beschlagseite B" "T1 - 55"
(defun hawaBracketW ( / ) 22.0)         ; the bracket's footprint, deep: 160704 p1 "Beschlagseite B" "22"
(defun hawaBracketH ( / ) 70.0)         ; the bracket's footprint, high, above 1/2 EH: 160704 p1 "Beschlagseite B" "70"
(defun hawaATopAxis ( / ) 10.0)         ; A's connector row below the top edge: 160704 p1 "Aussenseite A" "10"
(defun hawaATopFirst ( / ) 48.0)        ; A's connector row first hole S + 48: 160704 p1 "Aussenseite A" "S + 48"
(defun hawaABottomAxis ( / ) 22.0)      ; A's bracket row above the bottom edge: 160704 p1 "Aussenseite A" "22"
(defun hawaABottomFirst ( / ) 23.0)     ; A's first bracket hole S + 23: 160704 p1 "Aussenseite A" "S + 23"
(defun hawaABracketPitch ( / ) 64.0)    ; the two holes of a bracket: 160704 p1 "Aussenseite A" "64"
(defun hawaABracketGapLess ( / ) 80.0)  ; between the brackets (E1 - 80) / 2: 160704 p1 "Aussenseite A" "(E1 - 80) / 2"
(defun hawaAPadFrom ( / ) 43.0)         ; the pads at S + 43: 31418 p1 step 1 "S + 43"
(defun hawaAPadTop ( / ) 60.0)          ; the top pad below the top edge: 31418 p1 step 1 "60"
(defun hawaAPadBottom ( / ) 38.0)       ; the bottom pad above A's bracket row: 31418 p1 step 1 "38"
(defun hawaTrackHoleEnd ( / ) 5.0)      ; a hole at least 5 before the track's end: PROPOSED (D12)
(defun hawaPilotD ( / ) 3.0)            ; the panels' screw pilots: PROPOSED (CLAUDE.md F5 "3 mm diameter")
(defun hawaPilotDepth ( / ) 10.0)       ; the panels' screw pilots: PROPOSED (CLAUDE.md F5 "10 deep")
(defun hawaFootD ( / ) 35.0)            ; the foot hole: 169313 p1 front view bottom "fi 35"
(defun hawaFootFrom ( / ) 21.0)         ; the foot hole S + 21 behind the board's front edge: 169313 p1 "S + 21"

;;;========================================
;;; 4. ROUTINES
;;;========================================
;;;
;;; THE FRAMES. A UNIT box is (x y z w h d) in the house's box grammar
;;; (engine/cabinet.js panel boxes): x along the wall from the pocket's left
;;; outer face, y up from its carcass bottom (the run's plinth line), z from
;;; its BACK (z = KT is the carcass front plane; a front stands beyond it).
;;; A PANEL face (the rows of D12 D13) is (u v): u from the panel's own
;;; FRONT edge backwards, v up from its own bottom edge, on its POCKET face.
;;; The DOOR face (D10 D11) is (u v): u from the door's HINGE edge towards
;;; its free edge, v up from its bottom edge, on its BACK face. A HOLE is
;;; (layer u v diameter depth); a depth equal to the board's thickness is
;;; through. A RECTANGLE is (u0 v0 u1 v1). The arguments: doors 1 or 2,
;;; hand "L" or "R" (one door), frontT the project's front thickness (the
;;; door's S), h the unit's height, kt1 the covered cabinet's depth, span the
;;; covered units' span along the wall from panel B's outer face, far the
;;; house's clearance at the covered units' far edge, cls 25, 35 or nil.

;;; A number as the Check prints it: 572.5, or 415 when whole.
(defun hawa-mm (x)
  (if (equal x (fix x) 0.0001) (itoa (fix x)) (rtos x 2 1)))

;;; ---- (a) THE PANELS, THE WIDTH, THE HEIGHTS (D1 D3 D4 D5) ----

;;; A pocket panel's thickness: the front's from 19, else 22 (D3).
(defun hawa-panel-t (frontT)
  (if (>= frontT (hawaPanelMin)) frontT (hawaPanelThinFront)))

;;; Did the 22 replace the front's thickness (note #47)?
(defun hawa-panel-swap-p (frontT)
  (< frontT (hawaPanelMin)))

;;; Both minimums met: B 19, A 18 (D3).
(defun hawa-panel-ok-p (frontT)
  (and (>= (hawa-panel-t frontT) (hawaPanelMin)) (>= (hawa-panel-t frontT) (hawaPanelAMin))))

;;; The clear width between the panels (D1).
(defun hawa-clear (doors)
  (if (= doors 2) (hawaPocketTwo) (hawaPocketOne)))

;;; The unit's width: panel + clear + panel (D1).
(defun hawa-width (doors frontT)
  (+ (hawa-clear doors) (* 2.0 (hawa-panel-t frontT))))

;;; The Connector 55 cap under the one-door pocket's top board (D4).
(defun hawa-cap (doors)
  (if (= doors 2) 0.0 (hawaCapOne)))

;;; EH: the panels' height (D4 D5).
(defun hawa-eh (doors h)
  (- h (hawaBoardT) (hawaBoardT) (hawa-cap doors)))

;;; TH: the door's height (D5).
(defun hawa-th (doors h)
  (- (hawa-eh doors h) (hawaZ1) (hawaZ2)))

;;; The gap at the hinge edge: Z3 to panel A, Z5 between two doors (D9).
(defun hawa-z (doors)
  (if (= doors 2) (hawaZ5) (hawaZ3)))

;;; Each door's share of the pocket: its half less its hinge gap (D6).
(defun hawa-share (doors)
  (if (= doors 2)
    (- (/ (hawaPocketTwo) 2.0) (/ (hawaZ5) 2.0))
    (- (hawaPocketOne) (hawaZ3))))

;;; Rounded to 0.5 (D6).
(defun hawa-round (x)
  (* (hawaRound) (fix (+ (/ x (hawaRound)) 0.5))))

;;; ---- (b) THE DOOR'S WIDTH AND ITS CLASS (D6 D7) ----

;;; TB: the span, panel B, the share, less the free edge's clearance (D6).
(defun hawa-tb (doors frontT span far)
  (hawa-round (- (+ span (hawa-panel-t frontT) (hawa-share doors)) far)))

;;; The door's weight in kg (D7).
(defun hawa-kg (tb th s dens)
  (* (/ tb 1000.0) (/ th 1000.0) (/ s 1000.0) dens))

(defun hawa-table (cls)
  (if (= cls 35) (hawaWeight35) (hawaWeight25)))
(defun hawa-th-min (cls)
  (if (= cls 35) (hawaTH35Min) (hawaTH25Min)))
(defun hawa-th-max (cls)
  (if (= cls 35) (hawaTH35Max) (hawaTH25Max)))
(defun hawa-hinges (cls)
  (if (= cls 35) (hawaHinges35) (hawaHinges25)))

;;; The kg a class allows the door at its cell: the largest row at or
;;; below TH, the smallest column at or above TB; nil off the table (D7).
(defun hawa-allowed-kg (cls th tb / idx i best)
  (setq idx nil
        i 0
        best nil)
  (foreach c (hawaWeightColumns)
    (if (and (null idx) (>= c tb)) (setq idx i))
    (setq i (1+ i)))
  (if idx
    (foreach row (hawa-table cls)
      (if (and (<= (car row) th) (or (null best) (> (car row) (car best))))
        (setq best row))))
  (if (and idx best) (nth (1+ idx) best) nil))

;;; Does a class carry this door (D7)?
(defun hawa-class-fits-p (cls th tb kg / allowed)
  (setq allowed (hawa-allowed-kg cls th tb))
  (and (>= th (hawa-th-min cls)) (<= th (hawa-th-max cls)) allowed (<= kg allowed)))

;;; The class: the owner's when he set one and it carries the door, else 25
;;; when it carries it, else 35, else nil: refused (D7).
(defun hawa-class (th tb s dens cls / kg)
  (setq kg (hawa-kg tb th s dens))
  (cond (cls (if (hawa-class-fits-p cls th tb kg) cls nil))
        ((hawa-class-fits-p 25.0 th tb kg) 25.0)
        ((hawa-class-fits-p 35.0 th tb kg) 35.0)
        (T nil)))

;;; ---- (c) THE DEPTH (D8) ----

;;; The deepest pocket the 560 track serves: 567.
(defun hawa-t1-max ( / )
  (+ (hawaTrackMax) (hawaTrackLess)))

;;; The shallowest pocket HAWA accepts for this pocket: T1 >= 414 and
;;; M <= TB - 320, which is T1 >= 412 + Z.
(defun hawa-t1-need (doors)
  (max (hawaT1Min) (+ (hawaT1Plus) (hawaMLess) (hawa-z doors))))

;;; (T1 M E1 KT): the pocket as deep as the cabinet and never past the
;;; track; M proud; the flush case when M would be under S + 3 (D8).
(defun hawa-depth (doors tb kt1 s / z t1 m)
  (setq z (hawa-z doors)
        t1 (min kt1 (hawa-t1-max))
        m (- (+ tb (hawaT1Plus) z) t1))
  (if (< m (+ s (hawaMPlus)))
    (setq m (+ s (hawaMPlus))
          t1 (- (+ tb (hawaT1Plus) z) m)))
  (list t1 m (- tb m) (min (+ t1 (hawaRear)) kt1)))

;;; Refused where HAWA refuses, and only there (D8).
(defun hawa-depth-ok-p (doors tb kt1 s / d)
  (setq d (hawa-depth doors tb kt1 s))
  (and (>= (car d) (hawaT1Min))
       (<= (car d) (hawa-t1-max))
       (<= (cadr d) (- tb (hawaMLess)))
       (>= kt1 (car d))))

;;; The bottom track's (and the top track's) length: T1 - 7 (D8).
(defun hawa-track-length (t1)
  (- t1 (hawaTrackLess)))

;;; ---- (d) THE DOOR'S DRILLING (D10 D11) ----

;;; A row of a two-column table by its first number, or nil.
(defun hawa-lookup (key table / out)
  (setq out nil)
  (foreach r table
    (if (and (null out) (equal (car r) key 0.0001)) (setq out (cadr r))))
  out)

;;; The cup axis from the hinge edge: TA1 by Z3, TA2 by Z5 (D10).
(defun hawa-ta (doors)
  (if (= doors 2)
    (hawa-lookup (hawaZ5) (hawaTA2Table))
    (hawa-lookup (hawaZ3) (hawaTA1Table))))

;;; The cups' heights from the bottom edge: 200, the rest equal, 200 (D10).
(defun hawa-cup-vs (cls th / n i step out)
  (setq n (hawa-hinges cls)
        step (/ (- th (* 2.0 (hawaCupFromEnd))) (- n 1.0))
        i 0.0
        out nil)
  (while (< i n)
    (setq out (cons (+ (hawaCupFromEnd) (* i step)) out)
          i (+ i 1.0)))
  (reverse out))

;;; The III/35 profile's length, hinge edge to M - 3 from the free edge (D11).
(defun hawa-steel-length (tb m)
  (+ (- tb m) (hawaSteelPlus)))

;;; The III/35 profile's rows: (top bottom), from the bottom edge (D11).
(defun hawa-steel-rows (th)
  (list (- th (- (hawaSteelTop) (hawaZ1))) (- (hawaSteelBottom) (hawaZ2))))

;;; The III/35 profile's holes along a row, as u from the HINGE edge:
;;; M + 8 from the free edge, then every 352, while a hole keeps 11 (8 + 3)
;;; to the profile's hinge end (D11).
(defun hawa-steel-us (tb m / f out)
  (setq f (+ m (hawaSteelFirst))
        out nil)
  (while (<= f (- tb (+ (hawaSteelFirst) (hawaSteelPlus))))
    (setq out (cons (- tb f) out)
          f (+ f (hawaSteelPitch))))
  (reverse out))

;;; The III/35 grooves: (u0 v0 u1 v1) each, centred on a row (D11).
(defun hawa-steel-grooves (tb th m / len half out)
  (setq len (hawa-steel-length tb m)
        half (/ (hawaGrooveW) 2.0)
        out nil)
  (foreach v (hawa-steel-rows th)
    (setq out (cons (list 0.0 (- v half) len (+ v half)) out)))
  (reverse out))

;;; Every hole of the door, (layer u v diameter depth) (D10 D11 D15).
(defun hawa-door-holes (doors cls tb th m / ta out)
  (setq ta (hawa-ta doors)
        out nil)
  (foreach v (hawa-cup-vs cls th)
    (setq out (cons (list "FRONT_HINGES_35MM_D13" ta v (hawaCupD) (hawaCupDepth)) out)
          out (cons (list "FRONT_HINGES_5MM_D13" (+ ta (hawaScrewIn)) (+ v (hawaScrewPitch)) (hawaScrewD) (hawaScrewDepth)) out)
          out (cons (list "FRONT_HINGES_5MM_D13" (+ ta (hawaScrewIn)) (- v (hawaScrewPitch)) (hawaScrewD) (hawaScrewDepth)) out)))
  (setq out (cons (list "FRONT_HINGES_8MM_D13" ta (hawaSleeveFromEnd) (hawaSleeveD) (hawaSleeveDepth)) out)
        out (cons (list "FRONT_HINGES_8MM_D13" ta (- th (hawaSleeveFromEnd)) (hawaSleeveD) (hawaSleeveDepth)) out))
  (if (= cls 35)
    (foreach v (hawa-steel-rows th)
      (foreach u (hawa-steel-us tb m)
        (setq out (cons (list "FRONT_HINGES_8MM_D13" u v (hawaSleeveD) (hawaSleeveDepth)) out)))))
  (reverse out))

;;; ---- (e) THE PANELS' HOLES (D12 D13 D14) ----

;;; A row: first, then every pitch, while at most last.
(defun hawa-row (first pitch last / u out)
  (setq u first
        out nil)
  (while (<= u last)
    (setq out (cons u out)
          u (+ u pitch)))
  (reverse out))

;;; The last centre a track's hole may take, from the front plane: the
;;; track starts 5 behind it, is T1 - 7 long and keeps 5 at its end (D12).
(defun hawa-track-last (t1)
  (- (+ (hawaTrackStart) (hawa-track-length t1)) (hawaTrackHoleEnd)))

;;; Panel B's catch bracket footprint (u0 v0 u1 v1): front edge T1 - 55,
;;; 22 deep, from half of EH up 70 (D12).
(defun hawa-b-bracket (t1 eh)
  (list (- t1 (hawaBracketLess)) (/ eh 2.0)
        (+ (- t1 (hawaBracketLess)) (hawaBracketW)) (+ (/ eh 2.0) (hawaBracketH))))

;;; Panel B's pilots: the two track rows and the bracket's mark (D12).
(defun hawa-b-holes (t1 eh / out r)
  (setq out nil)
  (foreach u (hawa-row (hawaBTopFirst) (hawaPitch) (hawa-track-last t1))
    (setq out (cons (list "HAWA_3MM" u (- eh (hawaBTopAxis)) (hawaPilotD) (hawaPilotDepth)) out)))
  (foreach u (hawa-row (hawaBBottomFirst) (hawaPitch) (hawa-track-last t1))
    (setq out (cons (list "HAWA_3MM" u (hawaBBottomAxis) (hawaPilotD) (hawaPilotDepth)) out)))
  (setq r (hawa-b-bracket t1 eh))
  (setq out (cons (list "HAWA_3MM" (/ (+ (nth 0 r) (nth 2 r)) 2.0) (/ (+ (nth 1 r) (nth 3 r)) 2.0)
                        (hawaPilotD) (hawaPilotDepth)) out))
  (reverse out))

;;; Panel A's pilots, from A's own front edge (S + 3 forward of the plane):
;;; the connector row, the two brackets, the two pads (D13).
(defun hawa-a-holes (s t1 e1 eh / fwd b2 out)
  (setq fwd (+ s (hawaZFront))
        out nil)
  (foreach u (hawa-row (+ s (hawaATopFirst)) (hawaPitch) (+ fwd (hawa-track-last t1)))
    (setq out (cons (list "HAWA_3MM" u (- eh (hawaATopAxis)) (hawaPilotD) (hawaPilotDepth)) out)))
  (setq b2 (+ s (hawaABottomFirst) (hawaABracketPitch) (/ (- e1 (hawaABracketGapLess)) 2.0)))
  (foreach u (list (+ s (hawaABottomFirst)) (+ s (hawaABottomFirst) (hawaABracketPitch))
                   b2 (+ b2 (hawaABracketPitch)))
    (setq out (cons (list "HAWA_3MM" u (hawaABottomAxis) (hawaPilotD) (hawaPilotDepth)) out)))
  (setq out (cons (list "HAWA_3MM" (+ s (hawaAPadFrom)) (- eh (hawaAPadTop)) (hawaPilotD) (hawaPilotDepth)) out)
        out (cons (list "HAWA_3MM" (+ s (hawaAPadFrom)) (+ (hawaABottomAxis) (hawaAPadBottom)) (hawaPilotD) (hawaPilotDepth)) out))
  (reverse out))

;;; The foot hole in the bottom board, (layer u v diameter depth): u across
;;; the board from its left edge, v from its FRONT edge; through (D14).
(defun hawa-foot (doors frontT s / pt)
  (setq pt (hawa-panel-t frontT))
  (list "HAWA_FOOT_35MM"
        (+ pt (/ (hawa-clear doors) 2.0))
        (+ s (hawaFootFrom))
        (hawaFootD)
        (hawaBoardT)))

;;; ---- (f) THE CUT (D2 D4 D20) ----
;;;
;;; Every part: (part id w h t box), w and h its cut size (a panel: its depth
;;; by EH; a board: W by its depth; the door: TB by TH), t its thickness, box
;;; its place in the unit (x y z w h d).

;;; One door's box when closed, at x0 (its left edge).
(defun hawa-door-box (x0 doors h tb s kt)
  (list x0 (+ (hawaBoardT) (hawaZ2)) (+ kt (hawaZFront)) tb (hawa-th doors h) s))

;;; The cut of a pocket.
(defun hawa-cut (doors hand frontT h kt1 span far / pt c w eh s tb d kt fwd parts)
  (setq pt (hawa-panel-t frontT)
        c (hawa-clear doors)
        w (hawa-width doors frontT)
        eh (hawa-eh doors h)
        s frontT
        tb (hawa-tb doors frontT span far)
        d (hawa-depth doors tb kt1 s)
        kt (nth 3 d)
        fwd (+ (hawaZFront) s)
        parts nil)
  (setq parts (cons (list "POCKET-BOTTOM" "POCKET-BOTTOM" w (+ kt fwd) (hawaBoardT)
                          (list 0.0 0.0 0.0 w (hawaBoardT) (+ kt fwd))) parts))
  (if (= doors 2)
    (setq parts (cons (list "POCKET-B" "POCKET-B-L" kt eh pt (list 0.0 (hawaBoardT) 0.0 pt eh kt)) parts)
          parts (cons (list "POCKET-B" "POCKET-B-R" kt eh pt (list (- w pt) (hawaBoardT) 0.0 pt eh kt)) parts))
    (if (= hand "L")
      (setq parts (cons (list "POCKET-B" "POCKET-B" kt eh pt (list 0.0 (hawaBoardT) 0.0 pt eh kt)) parts)
            parts (cons (list "POCKET-A" "POCKET-A" (+ kt fwd) eh pt (list (+ pt c) (hawaBoardT) 0.0 pt eh (+ kt fwd))) parts))
      (setq parts (cons (list "POCKET-A" "POCKET-A" (+ kt fwd) eh pt (list 0.0 (hawaBoardT) 0.0 pt eh (+ kt fwd))) parts)
            parts (cons (list "POCKET-B" "POCKET-B" kt eh pt (list (+ pt c) (hawaBoardT) 0.0 pt eh kt)) parts))))
  (setq parts (cons (list "POCKET-TOP" "POCKET-TOP" w (+ kt fwd) (hawaBoardT)
                          (list 0.0 (- h (hawaBoardT)) 0.0 w (hawaBoardT) (+ kt fwd))) parts))
  (if (= doors 2)
    (setq parts (cons (list "POCKET-DOOR" "POCKET-DOOR-L" tb (hawa-th doors h) s
                            (hawa-door-box (- (/ w 2.0) (/ (hawaZ5) 2.0) tb) doors h tb s kt)) parts)
          parts (cons (list "POCKET-DOOR" "POCKET-DOOR-R" tb (hawa-th doors h) s
                            (hawa-door-box (+ (/ w 2.0) (/ (hawaZ5) 2.0)) doors h tb s kt)) parts))
    (setq parts (cons (list "POCKET-DOOR" "POCKET-DOOR" tb (hawa-th doors h) s
                            (hawa-door-box (if (= hand "L") (- w pt (hawaZ3) tb) (+ pt (hawaZ3))) doors h tb s kt)) parts)))
  (reverse parts))

;;; ---- (g) THE DOOR OPEN (D18) ----
;;;
;;; The open door's box (x y z w h d): square to the front, its back face 17
;;; off its panel B's pocket face, E1 behind the front plane, M before it.
;;; side: "L" or "R" for the two-door pocket's doors, ignored for one door.
(defun hawa-door-open (doors hand side frontT h kt1 span far / pt w s tb d kt x0)
  (setq pt (hawa-panel-t frontT)
        w (hawa-width doors frontT)
        s frontT
        tb (hawa-tb doors frontT span far)
        d (hawa-depth doors tb kt1 s)
        kt (nth 3 d))
  (setq x0 (cond ((= doors 2) (if (= side "L") (+ pt (hawaHardwareZone)) (- w pt (hawaHardwareZone) s)))
                 ((= hand "L") (+ pt (hawaHardwareZone)))
                 (T (- w pt (hawaHardwareZone) s))))
  (list x0 (+ (hawaBoardT) (hawaZ2)) (- kt (nth 2 d)) s (hawa-th doors h) tb))

;;; ---- (h) THE HAND, THE SETS, THE COVER (D16 D17 D19) ----

;;; HAWA's system hand of a door covering the units on `covers`' side.
(defun hawa-system-hand (covers)
  (if (= covers "R") "left" "right"))

;;; The set's name for the BOM: "Hawa Concepta III 25 Push, left".
(defun hawa-set-name (cls push covers)
  (strcat "Hawa Concepta III " (itoa (fix cls)) (if push " Push, " " Pull, ") (hawa-system-hand covers)))

;;; The connector's name for the BOM, one per pocket.
(defun hawa-connector-name (doors)
  (if (= doors 2) "Hawa Connector 110" "Hawa Connector 55"))

;;; ---- (i) THE CHECKS, IN WORDS (D3 D7 D8 D17) ----

;;; #37: the door out of HAWA's range, or nil.
(defun hawa-check-37 (doors tb th s dens cls / why)
  (setq why nil)
  (if (or (< s (hawaSMin)) (> s (hawaSMax)))
    (setq why (cons (strcat "S " (hawa-mm s) " (18 to 26)") why)))
  (if (or (< tb (hawaTBMin)) (> tb (hawaTBMax)))
    (setq why (cons (strcat "TB " (hawa-mm tb) " (440 to 750)") why)))
  (if (or (< th (hawaTH25Min)) (> th (hawaTH35Max)))
    (setq why (cons (strcat "TH " (hawa-mm th) " (1200 to 2700)") why)))
  (if (and (null why) (null (hawa-class th tb s dens cls)))
    (setq why (cons (strcat "a door of " (rtos (hawa-kg tb th s dens) 2 1) " kg at TH " (hawa-mm th)
                            " x TB " (hawa-mm tb) " is past "
                            (if cls (strcat "the III/" (itoa (fix cls)) " table") "the III/25 and the III/35 tables")) why)))
  (if why
    (strcat "#37 HAWA door out of range: " (hawa-join (reverse why)))
    nil))

;;; #37 again, for a covered unit with drawer fronts (D17).
(defun hawa-check-37-cover (unitNum)
  (strcat "#37 HAWA door out of range: unit " unitNum " has drawer fronts; the pocket door covers doors only"))

;;; #38: the pocket the door needs, or nil (D8).
(defun hawa-check-38 (doors tb kt1 s)
  (if (hawa-depth-ok-p doors tb kt1 s)
    nil
    (strcat "#38 HAWA: the door " (hawa-mm tb) " needs a pocket " (hawa-mm (hawa-t1-need doors))
            " deep on a " (hawa-mm kt1) " cabinet; make the cabinet deeper or the door narrower")))

;;; #47: the 22 in place of an 18 front (D3).
(defun hawa-check-47 (frontT)
  (if (hawa-panel-swap-p frontT)
    (strcat "#47 HAWA pocket panels " (hawa-mm (hawaPanelThinFront)) ": the hardware panel needs "
            (hawa-mm (hawaPanelMin)) " mm minimum")
    nil))

;;; Strings joined with "; ".
(defun hawa-join (l / out)
  (setq out "")
  (foreach s l
    (setq out (if (= out "") s (strcat out "; " s))))
  out)

;;;========================================
;;; 5. NUMBERS (test/turn82-f01-hawa-lisp.test.js RUNS the routines above on
;;;    these inputs and holds them to these sentences; F2 and F3 hold the
;;;    engine to the same)
;;;========================================
;;;
;;; THE PANELS. A front of 18: the panels 22, note #47. A front of 19: 19. A
;;; front of 25: 25. The widths: 99 (one door, 18 front), 154 (two doors, 18
;;; front), 105 (one door, 25 front), 148 (two doors, 19 front).
;;;
;;; EXAMPLE 1. ONE DOOR, HAND R, FRONT 18, H 2100, A BUD 500 BESIDE IT ON A
;;; 580 RUN, THE FAR EDGE AT A RUN END (far 1.5). The panels 22, W 99, EH
;;; 2057.5 (2100 - 18 - 18 - 6.5), TH 2051.5. TB 572.5 (500 + 22 + 52 -
;;; 1.5). T1 567 (the track caps the 580), M 100.5, E1 472, KT 580. The
;;; door 14.8 kg at 700, the cell 2050 x 600 allows 25: III/25, 3 hinges.
;;; TA 28: the cups at 200, 1025.75, 1851.5; the fi 5 at u 37, 26 above and
;;; below each; the fi 8 at 22 and 2029.5. The tracks 560 long; B's top row
;;; at v 2035.5: 32 192 352 512; its bottom row at v 41: 60 220 380 540;
;;; the bracket footprint (512 1028.75 534 1098.75), its pilot (523
;;; 1063.75). A is 601 deep (580 + 3 + 18): its connector row at v 2047.5:
;;; 66 226 386 546; its brackets at v 22: 41 105 301 365; its pads (61
;;; 1997.5) and (61 60). The bottom and the top 99 x 601; the foot hole at u
;;; 49.5, v 39. The door closed at x 25 to 597.5, z 583 to 601; open at x 42
;;; to 60, z 108 to 680.5. Hand L: B at x 0, A at x 77, the door closed at x
;;; -498.5 to 74, open at x 39 to 57. The set "Hawa Concepta III 25 Push,
;;; left", the connector "Hawa Connector 55".
;;;
;;; EXAMPLE 2. TWO DOORS, FRONT 19, H 2400, A WARDROBE 450 EACH SIDE ON A
;;; 600 RUN, far 1.5 BOTH. The panels 19, W 148, EH 2364, TH 2358. TB 521
;;; each (450 + 19 + 53.5 - 1.5). T1 567, M 49, E1 472, KT 587 (567 + 20),
;;; the boards 148 x 609. The door 16.3 kg; TH over 2200: III/35 at the
;;; cell 2350 x 550 (35), 4 hinges. TA 29.5: the cups at 200, 852.667,
;;; 1505.333, 2158. The steel rows at v 2261 and 21, the holes at u 464 and
;;; 112 (M + 8 = 57 and 409 from the free edge; 761 is off the profile), the
;;; profile 475 long, the grooves (0 2255 475 2267) and (0 15 475 27). The
;;; doors closed: L at x -448.5 to 72.5, R at x 75.5 to 596.5, z 590 to 609.
;;; Open: L at x 36 to 55, R at x 93 to 112, z 115 to 636. The connector
;;; "Hawa Connector 110"; the L door's set "Hawa Concepta III 35 Push,
;;; right", the R door's "... left".
;;;
;;; EXAMPLE 3. THE FLUSH CASE. One door, front 19, span 380, far 1.5, KT1
;;; 567: TB 449.5; M from T1 567 would be -22.5, so M 22 and T1 522.5, E1
;;; 427.5, KT 542.5; the tracks 515.5; B's top row 32 192 352 512, its
;;; bottom row 60 220 380, the bracket's pilot at u 478.5.
;;;
;;; EXAMPLE 4. #38. One door, front 19, span 500, far 1.5, on a wall cabinet
;;; KT1 350: TB 569.5, T1 350, M 314.5 > 249.5: "#38 HAWA: the door 569.5
;;; needs a pocket 415 deep on a 350 cabinet; make the cabinet deeper or the
;;; door narrower".
;;;
;;; EXAMPLE 5. #37 AND THE CLASS BY WEIGHT. One door, front 19, span 700:
;;; TB 769.5, "#37 HAWA door out of range: TB 769.5 (440 to 750)". A door TH
;;; 2051.5 x TB 750 x S 25 at 700 weighs 26.9 kg: past the III/25 table's 22
;;; at its cell 2050 x 750, within the III/35 table's 27 there: III/35 below
;;; TH 2200, by weight. A door TH 1500 x TB 750 x S 26 weighs 20.5 kg, past
;;; the III/25 table's 15 and below the III/35's 1900: "#37 HAWA door out of
;;; range: a door of 20.5 kg at TH 1500 x TB 750 is past the III/25 and the
;;; III/35 tables". A front of 30: "#37 HAWA door out of range: S 30 (18 to
;;; 26)". A covered drawer unit 03: "#37 HAWA door out of range: unit 03 has
;;; drawer fronts; the pocket door covers doors only".
;;;
;;; THE LIMITS. The deepest pocket 567, the shallowest 415 (412 + Z3). At
;;; TH 2200 the class is III/25, at 2201 III/35.

;;;========================================
;;; 6. THE COMMAND (draws what section 4 returns, nothing more)
;;;========================================

;;; The CNC layers of the pocket (D15); the house's layers come from
;;; SKYLON_COMMON's createCNCLayers.
(defun createHawaLayers ()
  (command "._LAYER" "_N" "HAWA_3MM" "_C" "54" "HAWA_3MM" "")
  (command "._LAYER" "_N" "FRONT_HINGES_35MM_D13" "_C" "59" "FRONT_HINGES_35MM_D13" "")
  (command "._LAYER" "_N" "FRONT_HINGES_5MM_D13" "_C" "55" "FRONT_HINGES_5MM_D13" "")
  (command "._LAYER" "_N" "FRONT_HINGES_8MM_D13" "_C" "56" "FRONT_HINGES_8MM_D13" "")
  (command "._LAYER" "_N" "HAWA_FOOT_35MM" "_C" "57" "HAWA_FOOT_35MM" "")
  (command "._LAYER" "_N" "HAWA_GROOVE_12MM" "_C" "58" "HAWA_GROOVE_12MM" ""))

;;; One hole drawn at (x0 y0) + (u v).
(defun hawa-draw-hole (x0 y0 hole)
  (drawCircle (nth 0 hole) (+ x0 (nth 1 hole)) (+ y0 (nth 2 hole)) (/ (nth 3 hole) 2.0)))

(defun c:HAWA_FULL (/ doors frontT h kt1 span tb th d cls eh x0 part)
  (setq doors (getint "\nDoors 1 or 2 <1>: "))
  (if (null doors) (setq doors 1))
  (setq frontT (getreal "\nFront thickness <18>: "))
  (if (null frontT) (setq frontT 18.0))
  (setq h (getreal "\nUnit height <2100>: "))
  (if (null h) (setq h 2100.0))
  (setq kt1 (getreal "\nCabinet depth <580>: "))
  (if (null kt1) (setq kt1 580.0))
  (setq span (getreal "\nCovered span <500>: "))
  (if (null span) (setq span 500.0))
  (createHawaLayers)
  (setq tb (hawa-tb doors frontT span 1.5)
        th (hawa-th doors h)
        eh (hawa-eh doors h)
        d (hawa-depth doors tb kt1 frontT)
        cls (hawa-class th tb frontT (hawaDensity) nil)
        x0 0.0)
  (foreach part (hawa-cut doors "R" frontT h kt1 span 1.5)
    (drawRect "OUTLINE" x0 0.0 (+ x0 (nth 2 part)) (nth 3 part))
    (cond ((= (nth 0 part) "POCKET-B")
           (foreach hole (hawa-b-holes (car d) eh) (hawa-draw-hole x0 0.0 hole)))
          ((= (nth 0 part) "POCKET-A")
           (foreach hole (hawa-a-holes frontT (car d) (nth 2 d) eh) (hawa-draw-hole x0 0.0 hole)))
          ((= (nth 0 part) "POCKET-BOTTOM")
           (hawa-draw-hole x0 0.0 (hawa-foot doors frontT frontT)))
          ((and (= (nth 0 part) "POCKET-DOOR") cls)
           (foreach hole (hawa-door-holes doors cls tb th (cadr d)) (hawa-draw-hole x0 0.0 hole))))
    (drawText "UNIT_NUMBER" (+ x0 (/ (nth 2 part) 2.0)) 40.0 12.0 (nth 1 part))
    (setq x0 (+ x0 (nth 2 part) 100.0)))
  (princ (strcat "\nTB " (hawa-mm tb) ", TH " (hawa-mm th) ", T1 " (hawa-mm (car d))
                 ", M " (hawa-mm (cadr d)) ", E1 " (hawa-mm (nth 2 d))))
  (princ))
