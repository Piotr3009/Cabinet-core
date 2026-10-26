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
;;; Turn 83 F6 (25.10.2026), the owner's words of 22:41 - THE CARCASS TO THE
;;; WALL, THE VOID INSIDE (D5, D6, D7, D9, D15 and D21 amended, D27 written;
;;; the routines vanity-wall-gap, vanity-top-depth, vanity-void-note,
;;; vanity-box-room, vanity-box-depth and vanity-boxes, and part 6)
;;; Turn 83 F7 (25.10.2026), the owner's words of 22:41 - THE TRAP'S GAP AT
;;; TWO COLUMNS WITH ONE BASIN (D28 written; D10, D11, D17 and D21 amended;
;;; the routines vanity-trap-gap, vanity-gap-box, vanity-gap-of,
;;; vanity-boxes-cut and vanity-divider-cut, the GAP of vanity-trap-plan and
;;; vanity-trap-verdict, and part 6)
;;; Turn 83 F8 (25.10.2026), the owner's words of 22:41 - THE BASIN 50
;;; FORWARD, AND IT NEVER ENTERS A BOARD (D29 written; D13, D14, D15, D18,
;;; D21, D25 and D26 amended; vanityWasteFromBack 250; the routines
;;; vanity-u-depth, vanity-bowl-enters, vanity-bowl-shell, vanity-box-boards,
;;; vanity-bowl-boards, vanity-bowl-hits, vanity-bowl-sentence and
;;; vanity-bowl-refused, vanity-trap-u, vanity-trap-reach and
;;; vanity-bowl-verdict amended, and part 6)
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
;;;   22:41  after the eye-test of T82: "jak mamy miejsce na rurki z tylu to
;;;           super ze szuflady sa mniejsze ale carcas powinien byc do sciany,
;;;           czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"
;;;   22:41  the trap at two columns: "nie ma wyciecia na U na sinki nawet jak
;;;           je wlacze ... jest wyciecie jak jest 1 szuflada ale nie jak sa 2
;;;           szuflady a mamy jeden sink, albo mam pomysl: zmniejszmy szuflady
;;;           na szerokosc, tylko fronty zostawmy szerokie i pomiedzy
;;;           szufladami zrobi sie miejsce na syfon (tylko gorna row)"
;;;   22:41  the basin: "umywalki przesun bardziej do przodu o jakies 50 mm,
;;;           powod: wchodza w tylna scianke, zlamana regula material nigdy
;;;           nie wchodzi w drugi material"
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
;;; part of the back's joint that lands inside it. The carcass stands TO THE
;;; WALL at the house's wall clearance like every unit (22:41 "carcas powinien
;;; byc do sciany"), and the 80 for the pipes ("3 - 80") is room taken INSIDE
;;; it: the drawer boxes give way, each standing 80 or more in front of the
;;; carcass back, and the pipes rise behind them through the open back between
;;; the rails (D27). Its top is the house worktop reaching the wall over the
;;; carcass as any run's. Its fronts
;;; are 2, 3 or 4 EQUAL overlay drawers ("w vanity default to sa rowne"), in
;;; one column or in two with a DIVIDER mid-width ("patrz szafa"). Under a
;;; basin (to the eye only) the top drawer's box takes a U 160 wide and 120
;;; deep round the trap ("wyciecie u dookola"), its sides kept; where the
;;; trap has no room the room says so in Check #39, it never re-cuts what the
;;; owner asked for. The carcass TOP takes each basin's oval as the worktop
;;; does, cut on site, and a bowl that meets what stands under the tops is
;;; said in Check #48. It stands on the house plinth or floats on two hangers.
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
;;;     sides, the TOP and the BOTTOM keep the parent's cut, and the carcass is
;;;     D deep at the rails, the rails' back face at the wall line (D27). In
;;;     the open back the sides' back edges stand G in front of the rails' back
;;;     face. AMENDED 25.10.2026 (T83 F6, 22:41 "wszystko w srodku carcasa
;;;     mniejsze"): the box is no longer the parent's D - G - 20 but D9's, the
;;;     void kept behind it, so its back face stands D - front - box from the
;;;     carcass back (85 on the default: 500 - 25 - 390; 35 under T82), never
;;;     less than vanityServiceVoid. The parent's placement (the box front a
;;;     front's thickness behind the carcass front) is kept as it is; on the
;;;     BUDR it lets the box reach G + 20 - front when D - G - 20 lands on a
;;;     rung (13 at D 528 on a 25 front: 5 into the back), the parent's to
;;;     mend, not this file's; in the vanity the void keeps it 80 clear.
;;; D6  THE SERVICE VOID 80 (CONFIRMED 13:03 "3 - 80"), INSIDE THE CARCASS
;;;     (AMENDED 25.10.2026, T83 F6, 22:41 "carcas powinien byc do sciany,
;;;     czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"). T82
;;;     wrote wall_gap = the clearance + 80 (90), the void as air between the
;;;     carcass and the wall: the owner's 22:41 refuses it. The kit writes no
;;;     wall_gap now: the vanity stands at the house's clearance like every
;;;     unit (vanity-wall-gap, 10 on room.wallBackClearance), and the void is
;;;     the room D9 and D27 keep behind the drawer boxes. A note, never a
;;;     fault: Check #45 "Service void 80 inside the vanity behind the
;;;     drawers".
;;; D7  THE TOP IS THE WORKTOP, TO THE WALL (CONFIRMED 13:03 "5 - blat osobny
;;;     element jak worktop"; AMENDED 25.10.2026 after the review: the house's
;;;     own reach, one number for the LISP and the engine). Not a board of this
;;;     kit: the house worktop (CLAUDE.md F10), its thickness typed (vanityTop
;;;     20 the default), its depth from the wall line the house slab's own
;;;     (worktop.js worktopGeometry): D + the door gap + the front + the front
;;;     overhang, plus the carcass's stand-off beyond the clearance, wall_gap
;;;     less the clearance. Like every kitchen slab of the house it counts no
;;;     clearance, so the fronts stand 10 under its edge. AMENDED 25.10.2026
;;;     (T83 F6, D27): the carcass is to the wall, its stand-off 0, so the top
;;;     reaches the wall over the carcass as any run's: 500 + 3 + 25 + 20 = 548
;;;     on the default (628 under T82, over the void), as a BUD 558 kitchen's
;;;     slab is 606 for fronts at 596; a gap a joiner types since is reached
;;;     over as T82 reached the void.
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
;;;     fits D - G - 20; its sides, walls and bottom are the parent's. AMENDED
;;;     25.10.2026 (T83 F6, 22:41 "super ze szuflady sa mniejsze", "wszystko w
;;;     srodku carcasa mniejsze"): in a vanity the box ALSO keeps the service
;;;     void behind it (D27): its back face, D - front - box from the carcass
;;;     back, at least vanityServiceVoid, so the box is at most D - front - 80
;;;     (vanity-box-room). VANITY3 at D 500: 395, the 390 box on the 400 runner
;;;     (the ladder's rung at or under 500 - 80), its back face at 85. The
;;;     runner is the box + 10 as everywhere. The chest (D20) asks no void and
;;;     keeps the parent's law (vd 0).
;;; D10 THE TWO COLUMNS (CONFIRMED 12:57 "external drawers ale wybor 2 rows,
;;;     patrz szafa"; the chest 13:03 "7 - tak"). The wardrobe's rule (T79 F3:
;;;     "a divider mid-width, a stack in each column, one fixed shelf over
;;;     both") with the carcass TOP as the board over both: a DIVIDER at
;;;     (W - G) / 2, the same n equal drawers in each column, each column's
;;;     boxes the parent's law over the column's own clear width. AMENDED
;;;     25.10.2026 (T83 F7, D28): in the vanity with ONE basin the top row's
;;;     two boxes are narrowed to the trap's gap (vanity-boxes-cut).
;;; D11 THE DIVIDER STANDS ON THE BOTTOM AND UNDER THE TOP (the house law:
;;;     material never enters another material). From the BOTTOM's top face
;;;     (G) to the TOP's underside (H - G), H - 2G high; from the back's
;;;     inside face (z G, the sides' back edges) to the carcass front, D - G
;;;     deep, the sides' depth (the runners' full-depth wall, T32 F4); in the
;;;     vanity its back edge meets the rails' inside faces and stands open
;;;     between them, in the chest it meets the BACK; its head and foot
;;;     jointed as the house's divider (cabinet.js, CHAT FIX 17.10.2026); the
;;;     runner rows of both columns on its two faces, as the wardrobe's
;;;     divider between two drawer columns carries them. AMENDED 25.10.2026
;;;     (T83 F7, D28): under the trap's gap it stops at the top row's runner
;;;     underside, a SHORT DIVIDER (vanity-divider-cut), and carries only the
;;;     rows below it.
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
;;;     a filleted notch. No drawer below the top one ever takes a U. A U is
;;;     cut only where every board it leaves of the back wall keeps
;;;     vanityBackPieceMin (D23). AMENDED 25.10.2026 (T83 F8, D29: "The U of
;;;     the top box (columns 1) follows the waste"): its depth follows the
;;;     waste (vanity-u-depth): it reaches a trap as wide as itself centred
;;;     on the waste (D15's U), never less than vanityTrapD 120, never past
;;;     what keeps vanityBackPieceMin of the bottom behind the box's front
;;;     wall: 245 on the default (250 + 80 - 85).
;;; D14 THE WASTES (PROPOSED, CLAUDE.md F11): one basin at W / 2; two at the
;;;     fronts' centres of two columns (W / 4 and 3W / 4) or at W / 3 and 2W / 3
;;;     on one; the waste vanityWasteFromBack 200 from the carcass back (the
;;;     rails' back face). AMENDED 25.10.2026 (T83 F8, D29): 250 (22:41
;;;     "umywalki przesun bardziej do przodu o jakies 50 mm").
;;; D15 THE NUMBERS DISAGREE AND THE ROOM SAYS SO (DECIDED here: the owner's
;;;     confirmed U rules, the proposed waste stays where it was proposed).
;;;     The box's back face stands D - front - box from the carcass back, and
;;;     a waste beyond the U's reach is said in Check #39: "The trap stands N
;;;     mm beyond the U"; the U is cut as confirmed, never re-cut. Under T82
;;;     the back face stood at 35 (500 - 25 - 440), the U reached 155 and the
;;;     waste at 200 stood 45 beyond it. AMENDED 25.10.2026 (T83 F6, D27): the
;;;     shorter box stands at 85 (500 - 25 - 390), the U reaches 205 and the
;;;     waste at 200 stands 5 inside it: nothing is said on the default. A U
;;;     that takes a trap as wide as itself centred on that waste is 200 + 80
;;;     - 85 = 195 deep: the owner's to set. AMENDED 25.10.2026 (T83 F8, D29):
;;;     the owner set it, "The U of the top box (columns 1) follows the waste":
;;;     the U is that U (D13), 245 deep under the waste at 250, reaching 330:
;;;     the trap stands inside it and nothing is said; REACH is said only
;;;     where the box is too short to take it.
;;; D16 THE TRAP'S BOTTOM LINE (PROPOSED reading; CLAUDE.md names no trap
;;;     height): the underside of the top drawer's BOTTOM board, its runner
;;;     line + 13.5 + 15, the plane the U opens through. The box under it must
;;;     stand vanityTrapClear 60 (PROPOSED) below that line, else no second U
;;;     is cut and Check #39 says "Use a shallow trap" (12:57 "w razie czego
;;;     jak nie bedzie miejsca to zostawimy informacje prosze uzyc shallow
;;;     trap").
;;; D17 A WASTE OVER THE DIVIDER (DERIVED): one basin on two columns puts its
;;;     waste on the divider; no box takes it, no U is cut and Check #39 says
;;;     "The trap stands over the divider". AMENDED 25.10.2026 (T83 F7): the
;;;     vanity cuts the trap's gap there now (D28); the sentence stays for a
;;;     unit too narrow for the gap. A U that would leave less than 30
;;;     of the back wall against a box's side or the U before it is not cut
;;;     either: "The trap's U does not fit the top drawer's box: every board of
;;;     its back wall keeps 30".
;;; D18 THE CARCASS TOP TAKES THE BASIN'S OVAL (AMENDED 25.10.2026 after the
;;;     review; the house law: material never enters another material). The
;;;     basin is to the eye (12:57 "dodajesz tylko do widoku"): nothing of it
;;;     is a part and nothing of its hole is machined. But its bowl goes down
;;;     through the worktop AND the carcass TOP under it (until tonight the
;;;     TOP stayed whole and floored the worktop's oval 20 down, the bowl
;;;     unseen and the board through it). So the TOP takes the same oval the
;;;     worktop takes, for every basin the worktop takes (worktop.js fitBasins
;;;     decides; a basin the stone refuses is cut in neither): vanity.basin's
;;;     oval centred on the waste, a NOTE on the TOP and in the BOM, readiness
;;;     manual, cut on site to the basin's template as the worktop's own, never
;;;     on the CNC. A centred basin's oval reaches the carcass back (200 less
;;;     half of 400), so the TOP's cut opens to its back edge. Its joint there
;;;     is D26; what the bowl meets under the tops, D25. AMENDED 25.10.2026
;;;     (T83 F8, D29): the waste at 250 stands the oval 50 in front of the
;;;     carcass back, 32 in front of the TOP's back edge: the TOP's cut is a
;;;     HOLE, its back edge whole.
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
;;; D21 THE CHECKS. #39 is the trap's (D15, D16, D17, D23, and D28's gap), its sentences
;;;     written by vanity-trap-verdict; #48, the family of the basins a top
;;;     cannot take, also says the bowl (D25, vanity-bowl-verdict; every board
;;;     it enters, D29, vanity-bowl-refused with the worktop's); the void is
;;;     the note #45 (CLAUDE.md's #40: the in-frame project holds #40 to #44
;;;     since T80 F10), AMENDED 25.10.2026 (T83 F6) to say where it is now:
;;;     "Service void 80 inside the vanity behind the drawers"; a double drawer
;;;     under a basin is DOUBLE_DRAWER_REFUSED (D24).
;;; D22 THE UNIT NUMBER is VU (VU01, VU02), one prefix for the three counts, as
;;;     the drawer base's DR is.
;;;
;;; AFTER THE REVIEW OF 25.10.2026 (each finding reproduced on the integrated
;;; tree; D7, D13, D17, D18 and D21 above are amended with them):
;;;
;;; D23 THE BACK WALL KEEPS 30 (PROPOSED vanityBackPieceMin 30). The review cut
;;;     0 x 104 and 0.5 x 104 boards onto the cut list and the CNC (W 484 on two
;;;     columns with two basins, W 242 with one): a U touching a box's side or
;;;     the U before it left a board of nothing. Every board the U's leave of
;;;     the box's back wall, against a side or between two U's, is at least 30
;;;     long; the house has no smaller-strip number of its own (its minimum
;;;     bridge, one board, is the web between two pockets of ONE board, not a
;;;     board). A U that misses it is FIT: #39 says it and it is never cut.
;;; D24 NO DOUBLE DRAWER UNDER A BASIN (DERIVED). The review put the trap
;;;     through an inner drawer (T78 F16, drawer_double) this file never
;;;     modelled: the U went into the deep box under it, and the shallow-trap
;;;     air was measured past it. So with a basin (sinks 1 or 2) the top row
;;;     and the row under it refuse a double in words, DOUBLE_DRAWER_REFUSED,
;;;     and cut one box, as two columns refuse it: "Drawer 3: a double drawer
;;;     is not cut under a basin: the trap's U is the top box's and its air is
;;;     measured to the box under it. One box is cut." The U is then always in
;;;     the top row's one box and D16's air is measured to the one box under
;;;     it. Lower rows keep the parent's double.
;;; D25 THE BOWL, AND CHECK #48 (DERIVED; the bowl's reading PROPOSED). The
;;;     bowl is read as its rim's oval straight down to vanity.basin's depth
;;;     below the worktop's top (150, PROPOSED), the eye's bowl being no wider
;;;     than its rim. Through the worktop and the TOP it passes their holes
;;;     (D18). Below them it meets the top drawer's box where its oval stands
;;;     over the box and it is deeper than the worktop + G + the air from the
;;;     TOP's underside to the box's top (the deepest bowl that clears the top
;;;     drawer: 20 + 18 + 30.5 = 68.5 on the default), and RAIL-TOP where its
;;;     oval stands over the rail (less than G from the carcass back: the
;;;     default's stands at 0) and it is deeper than the worktop. Never a
;;;     clamp: #48 says it, its sentence written by vanity-bowl-verdict with
;;;     the unit's number, with the cure: a shallower or a vessel basin, a
;;;     shallower top drawer; off the rail, a vessel basin, or the waste G +
;;;     half the basin's depth from the carcass back. AMENDED 25.10.2026 (T83
;;;     F8, D29): the bowl's solid is the room's, the lower half of the
;;;     ellipsoid of its oval and its depth, and it is checked BOARD BY BOARD:
;;;     a drawer box's inside is air, its boards are material; the reading of
;;;     the box as a block ("the deepest bowl that clears the top drawer") is
;;;     retired, and so are its three sentences: #48 says the boards entered.
;;; D26 THE TOP'S BACK JOINT UNDER A BASIN (DERIVED from D3). A feature of the
;;;     TOP's back joint (a tenon with RAIL-TOP's socket for it and its dog
;;;     bone, the rail's screw into the TOP's back edge, a Cabineo pocket and
;;;     hole) is cut only where the TOP's back edge is still there: one whose
;;;     extent meets a basin's oval where the oval crosses that edge (z G)
;;;     would stand in the hole, and is not cut. The default: the oval crosses
;;;     the TOP's back edge from 342.2 to 557.8, so the rail's screw at W / 2 =
;;;     450 goes and the tenons at 113 and 787 stay. AMENDED 25.10.2026 (T83
;;;     F8, D29): with the waste at 250 the oval no longer reaches the TOP's
;;;     back edge on the default: nothing goes.
;;;
;;; TURN 83 F6, THE OWNER AFTER THE EYE-TEST OF T82 (25.10.2026, 22:41; D5, D6,
;;; D7, D9, D15 and D21 above are amended with it):
;;;
;;; D27 THE CARCASS TO THE WALL, THE VOID INSIDE (CONFIRMED 22:41 "jak mamy
;;;     miejsce na rurki z tylu to super ze szuflady sa mniejsze ale carcas
;;;     powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale
;;;     carcas do sciany"; the turn's law: a service void is room taken INSIDE
;;;     the carcass, never air between the carcass and the wall). The carcass
;;;     is D deep at the rails and its back, the rails' back face, stands at
;;;     the house's clearance from the wall like every unit's (vanity-wall-gap).
;;;     The rails stay where D2 stands them, flush with the sides' back edges;
;;;     the sides, the TOP, the BOTTOM, the fronts and the DIVIDER (D11, the
;;;     runners' full-depth wall) keep their cut. What is inside gives way: the
;;;     drawer BOXES, each the longest rung less 10 whose back face keeps
;;;     vanityServiceVoid from the carcass back (D9, vanity-box-room), each
;;;     runner the box + 10 with it. The pipes rise in that room behind the
;;;     boxes, through the open back between the rails, as T82 cut it. The
;;;     chest (D20) takes none of it: its back stays and its boxes are the
;;;     parent's (vd 0). The trap's U (D13) is cut from the shorter box's back
;;;     face and its reach is read there (D15).
;;;
;;; TURN 83 F7, THE TRAP AT TWO COLUMNS WITH ONE BASIN (25.10.2026, 22:41;
;;; D10, D11, D17 and D21 above are amended with it):
;;;
;;; D28 THE TRAP'S GAP (CONFIRMED 22:41 "zmniejszmy szuflady na szerokosc,
;;;     tylko fronty zostawmy szerokie i pomiedzy szufladami zrobi sie
;;;     miejsce na syfon (tylko gorna row)"; the 20 a side PROPOSED,
;;;     vanityTrapGapClear). At two columns with ONE basin, the TOP ROW only:
;;;     its two boxes are narrowed toward the centre, column 1's right outer
;;;     face at W / 2 - (vanityTrapW / 2 + vanityTrapGapClear), column 2's
;;;     left outer face at W / 2 + the same, a gap of 200 centred on the waste
;;;     (W / 2); each box's walls and bottom follow its new width by the
;;;     parent's law, its runner pair with it, its front unchanged (the pair
;;;     of D12, wide). The trap stands in the gap's air: no U is cut in either
;;;     box. The DIVIDER stops under the top row: a SHORT DIVIDER from the
;;;     BOTTOM's top face to the top row's runner underside (y 400 on the
;;;     default, 382 high), carrying the runner rows below it; its head
;;;     stands free 28.5 under the trap's bottom line (D16), as no board of
;;;     the columns rule spans the stacks under the TOP (D10: the TOP is the
;;;     board over both; no fixed shelf and no rail is cut). The top row's
;;;     two inner runners have no wall in the gap and none is cut for them (a
;;;     wall beside the trap would stand under the bowl, D25): Check #39 says
;;;     "The trap stands in the gap between the top drawers: no wall carries
;;;     their two inner runners". The shallow-trap air (D16) is measured as
;;;     before, from the top row's bottom line to the box under it. Where a
;;;     narrowed box would keep walls shorter than vanityBackPieceMin, no gap
;;;     is cut and D17 stands. Two basins on two columns keep a U in each
;;;     column's top box (D13), and one column keeps its U.
;;;
;;; TURN 83 F8, THE BASIN 50 FORWARD (25.10.2026, 22:41; D13, D14, D15, D18,
;;; D21, D25 and D26 above are amended with it):
;;;
;;; D29 THE BOWL NEVER ENTERS A BOARD (CONFIRMED 22:41 "umywalki przesun
;;;     bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke,
;;;     zlamana regula material nigdy nie wchodzi w drugi material"; the 250
;;;     the PROPOSED reading of "about 50"). The waste, and the oval's centre
;;;     with it, stands vanityWasteFromBack 250 from the carcass back (200
;;;     under T82). The bowl's solid is the room's (3d/Basin.jsx): the lower
;;;     half of the ellipsoid of the basin's oval (520 x 400) and its depth
;;;     (150), hung from the worktop's top. It is held against every board of
;;;     the cut but the TOP, which takes its oval (D18), by the house's box
;;;     test: a board enters the bowl by N, the board's height inside the
;;;     bowl over the board's point nearest the bowl's axis
;;;     (vanity-bowl-enters). A bowl that enters the SHELL the params fix (the
;;;     rails and the sides, vanity-bowl-shell) is refused in words with the
;;;     worktop's refusals, cut in neither top and drawn nowhere
;;;     (vanity-bowl-refused, worktop.js fitBasins); one that enters a board
;;;     inside (a drawer box, the divider) is said in #48 by
;;;     vanity-bowl-verdict (the worktop decides its basins from the params,
;;;     before those boards are cut). CLAUDE.md's sentence: "the bowl enters
;;;     RAIL-TOP by N mm: move the basin forward or take a shallower bowl".
;;;     The U follows the waste (D13, D15). THE NUMBERS DISAGREE AND THE ROOM
;;;     SAYS SO (D15's law): F6 moved the boxes 50 forward too (D27), so at
;;;     250 the bowl clears RAIL-TOP (its oval 50 in front of the carcass
;;;     back) but the top box's back wall beside the U stands 21.1 in it, as
;;;     T82's stood at 200: #48 says "The bowl enters D3-BB-1 by 21.1 mm,
;;;     D3-BB-2 by 21.1 mm"; the waste at 270, or a bowl 115 deep, clears it:
;;;     the owner's to set.
;;;
;;;========================================
;;; 3. CONSTANTS (the owner's numbers; profile.vanity mirrors them)
;;;========================================

;; profile.vanity.serviceVoidMm      CONFIRMED 13:03 "3 - 80"; INSIDE the carcass, CONFIRMED 22:41 "carcas powinien byc do sciany" (D27)
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
;; profile.vanity.trapGapClearMm     PROPOSED (T83 F7, CLAUDE.md "160 / 2 + 20 PROPOSED"; D28: the air a side of the trap's gap)
(defun vanityTrapGapClear ( / ) 20.0)
;; profile.vanity.backPieceMinMm     PROPOSED (D23, the review of 25.10.2026: no 0 or sliver board for the saw)
(defun vanityBackPieceMin ( / ) 30.0)
;; profile.vanity.wasteFromBackMm    PROPOSED (CLAUDE.md F11); T83 F8: 250, CONFIRMED 22:41 "umywalki przesun bardziej do przodu o jakies 50 mm" (the 50 the PROPOSED reading of "about 50")
(defun vanityWasteFromBack ( / ) 250.0)
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
(defun vanitySingleSocketBelow ( / ) 264.5)   ;; puzzle.singleSocketBelow: one socket on a shorter run
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

;;; The unit's wall gap (D6, D27): the house's clearance, as every unit's.
;;; The carcass is to the wall; the void is inside it (D9). Nothing is
;;; written at birth.
(defun vanity-wall-gap (clearance)
  clearance)

;;; The worktop's depth from the wall line (D7): the house slab's reach plus
;;; the carcass's stand-off beyond the clearance (0 at the wall, D27), never
;;; the clearance.
(defun vanity-top-depth (D doorGap frontT overhang standoff)
  (+ D doorGap frontT overhang standoff))

;;; The note (D6, D21, D27).
(defun vanity-void-note ( / )
  (strcat "#45 Service void " (vanity-mm (vanityServiceVoid)) " inside the vanity behind the drawers"))

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

;;; The room a box may take (D9, D27): the parent's D - G - 20 and, where
;;; the void vd is asked (the vanity's vanityServiceVoid), no more than
;;; D - front - vd, so the box's back face keeps vd from the carcass back.
;;; vd 0 is the parent's law to the millimetre, and the chest's.
(defun vanity-box-room (D G frontT vd / dl)
  (setq dl (- D G (vanityDepthAllowance)))
  (if (> vd 0.0) (min dl (- D frontT vd)) dl))

;;; The box's depth: the longest rung whose box, the rung less 10, fits the
;;; room; the shortest when none does, as the parent does (D9).
(defun vanity-box-depth (D G frontT vd / maxDl best r)
  (setq maxDl (vanity-box-room D G frontT vd)
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

;;; Every box, column by column, bottom to top (D9, D10, D27): vd the void
;;; kept behind them, the vanity's vanityServiceVoid, 0 for the chest.
(defun vanity-boxes (W H D G GB frontT n columns vd / hs ys rb depth zBack out col o x0 bw i base ceil side)
  (setq hs (vanity-front-heights H n)
        ys (vanity-front-ys hs)
        rb (vanity-runner-bottoms ys G)
        depth (vanity-box-depth D G frontT vd)
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
;;; boxes in each opening (vanity-boxes at columns 2, vd 0). With columns 1 the
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

;;; The trap's gap (D28): at two columns with one basin, the air between the
;;; top row's two boxes, (from to) centred on W / 2; nil on any other count.
(defun vanity-trap-gap (W columns sinks / half)
  (if (and (= columns 2) (= sinks 1))
    (progn
      (setq half (+ (/ (vanityTrapW) 2.0) (vanityTrapGapClear)))
      (list (- (/ W 2.0) half) (+ (/ W 2.0) half)))
    nil))

;;; A top box narrowed to the gap (D28): column 1's right outer face at the
;;; gap's left end, column 2's left outer face at its right end.
(defun vanity-gap-box (b gap / x0 x1)
  (setq x0 (nth 2 b)
        x1 (+ (nth 2 b) (nth 3 b)))
  (if (= (nth 0 b) 1)
    (setq x1 (car gap))
    (setq x0 (cadr gap)))
  (list (nth 0 b) (nth 1 b) x0 (- x1 x0) (nth 4 b) (nth 5 b) (nth 6 b) (nth 7 b)))

;;; Does every narrowed top box keep walls of vanityBackPieceMin (D28, D23)?
(defun vanity-gap-fits-p (boxes n gap GB / ok b)
  (setq ok T)
  (foreach b boxes
    (if (and (= (nth 1 b) n) (< (vanity-box-len (vanity-gap-box b gap) GB) (vanityBackPieceMin)))
      (setq ok nil)))
  ok)

;;; The gap the cut takes (D28): the trap's gap where its boxes fit, else nil.
(defun vanity-gap-of (boxes W n columns sinks GB / gap)
  (setq gap (vanity-trap-gap W columns sinks))
  (if (and gap (vanity-gap-fits-p boxes n gap GB)) gap nil))

;;; Every box as the cut stands it (D9, D10, D27, D28): vanity-boxes, the top
;;; row narrowed to the gap where the gap is cut. sinks nil is no basin.
(defun vanity-boxes-cut (W H D G GB frontT n columns sinks vd / boxes gap out b)
  (setq boxes (vanity-boxes W H D G GB frontT n columns vd)
        gap (vanity-gap-of boxes W n columns sinks GB)
        out nil)
  (foreach b boxes
    (setq out (cons (if (and gap (= (nth 1 b) n)) (vanity-gap-box b gap) b) out)))
  (reverse out))

;;; The divider as the cut stands it (D11, D28): under the gap a SHORT
;;; DIVIDER, from the BOTTOM to the top row's runner underside; else the
;;; divider of D11, or nil on one column.
(defun vanity-divider-cut (W H D G GB frontT n columns sinks / dv gap top)
  (setq dv (vanity-divider W H D G columns)
        gap (vanity-gap-of (vanity-boxes W H D G GB frontT n columns (vanityServiceVoid)) W n columns sinks GB))
  (if (and dv gap)
    (progn
      (setq top (nth (1- n) (vanity-runner-bottoms (vanity-front-ys (vanity-front-heights H n)) G)))
      (list (nth 0 dv) (nth 1 dv) (nth 2 dv) (nth 3 dv) (nth 4 dv) (- top G) (nth 6 dv)))
    dv))

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

;;; The U's depth into box b from its back face (D13, D15, D29): it follows
;;; the waste, reaching a trap as wide as itself centred on it, never less
;;; than vanityTrapD, never past what keeps vanityBackPieceMin of the bottom
;;; behind the box's front wall.
(defun vanity-u-depth (b GB)
  (min (- (nth 6 b) GB (vanityBackPieceMin))
       (max (vanityTrapD) (- (+ (vanityWasteFromBack) (/ (vanityTrapW) 2.0)) (nth 7 b)))))

;;; The U round the trap at xw in box b (D13, D29).
(defun vanity-trap-u (b xw GB / half)
  (setq half (/ (vanityTrapW) 2.0))
  (list (nth 0 b) (- xw half) (+ xw half) (vanity-u-depth b GB) (vanityTrapR)))

;;; Does the U leave vanityBackPieceMin of the back wall against each of the
;;; box's sides and after the U before it (D23)?
(defun vanity-u-fits-p (b u prev GB / m)
  (setq m (vanityBackPieceMin))
  (and (>= (- (nth 1 u) (+ (nth 2 b) GB)) m)
       (>= (- (- (+ (nth 2 b) (nth 3 b)) GB) (nth 2 u)) m)
       (or (null prev) (/= (nth 0 prev) (nth 0 u)) (>= (- (nth 1 u) (nth 2 prev)) m))))

;;; Every waste's plan: ((xw box u status) ...), status "CUT", "DIVIDER",
;;; "FIT" or "GAP", the waste in the trap's gap, no U (D13, D17, D28).
(defun vanity-trap-plan (W H D G GB frontT n columns sinks / boxes gap out xw b u prev)
  (setq boxes (vanity-boxes-cut W H D G GB frontT n columns sinks (vanityServiceVoid))
        gap (vanity-gap-of (vanity-boxes W H D G GB frontT n columns (vanityServiceVoid)) W n columns sinks GB)
        out nil
        prev nil)
  (foreach xw (vanity-wastes W columns sinks)
    (setq b (vanity-top-box-under boxes n xw GB))
    (cond
      (gap (setq out (cons (list xw nil nil "GAP") out)))
      ((null b) (setq out (cons (list xw nil nil "DIVIDER") out)))
      (T
        (setq u (vanity-trap-u b xw GB))
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

;;; How far the waste stands INSIDE the U's reach; negative, beyond it (D15, D29).
(defun vanity-trap-reach (b wasteZ GB)
  (- (+ (nth 7 b) (vanity-u-depth b GB)) wasteZ))

;;; The trap's bottom line (D16), and the air under it to the box below.
(defun vanity-trap-line (b) (vanity-box-under b))
(defun vanity-trap-room (top below) (- (vanity-trap-line top) (vanity-box-top below)))

;;; The shallow-trap sentence, the top box over the box below it, or nil (D16).
(defun vanity-trap-shallow (top below / room)
  (setq room (vanity-trap-room top below))
  (if (< room (vanityTrapClear))
    (strcat "#39 Use a shallow trap: the drawer under it stands " (vanity-mm room)
            " mm under the trap's bottom, " (vanity-mm (vanityTrapClear)) " wanted")
    nil))

;;; Check #39: ((kind xw sentence) ...), nil when the trap has its room
;;; (D15, D16, D17, D28).
(defun vanity-trap-verdict (W H D G GB frontT n columns sinks / boxes out e b reach below s)
  (setq boxes (vanity-boxes-cut W H D G GB frontT n columns sinks (vanityServiceVoid))
        out nil)
  (foreach e (vanity-trap-plan W H D G GB frontT n columns sinks)
    (setq b (nth 1 e))
    (cond
      ((= (nth 3 e) "GAP")
        (setq out (cons (list "RUNNERS" (car e) "#39 The trap stands in the gap between the top drawers: no wall carries their two inner runners") out))
        (if (> n 1)
          (progn
            (setq s (vanity-trap-shallow (vanity-box-of boxes 1 n) (vanity-box-of boxes 1 (1- n))))
            (if s (setq out (cons (list "SHALLOW" (car e) s) out))))))
      ((= (nth 3 e) "DIVIDER")
        (setq out (cons (list "DIVIDER" (car e) "#39 The trap stands over the divider: no top drawer can take its U") out)))
      ((= (nth 3 e) "FIT")
        (setq out (cons (list "FIT" (car e)
                              (strcat "#39 The trap's U does not fit the top drawer's box: every board of its back wall keeps "
                                      (vanity-mm (vanityBackPieceMin))))
                        out)))
      (T
        (setq reach (vanity-trap-reach b (vanityWasteFromBack) GB))
        (if (< reach 0.0)
          (setq out (cons (list "REACH" (car e)
                                (strcat "#39 The trap stands " (vanity-mm (- reach)) " mm beyond the U: the U reaches "
                                        (vanity-mm (+ (nth 7 b) (vanity-u-depth b GB))) " from the carcass back, the waste stands at "
                                        (vanity-mm (vanityWasteFromBack))))
                          out)))
        (if (> n 1)
          (progn
            (setq below (vanity-box-of boxes (car b) (1- n))
                  s (vanity-trap-shallow b below))
            (if s (setq out (cons (list "SHALLOW" (car e) s) out))))))))
  (reverse out))

;;; ---- (e) PLINTH OR FLOATING ----

;;; How the unit stands (D19).
(defun vanity-mount (floating) (if floating "wall" "floor"))
(defun vanity-plinth-p (floating) (not floating))
(defun vanity-base-y (floating floatH plinthH) (if floating floatH plinthH))
(defun vanity-hangers (floating) (if floating (vanityHangersPerUnit) 0))

;;; ---- (f) THE BASIN THROUGH THE TOPS ----

;;; The oval of each basin the worktop takes (xs, its wastes' x), in the
;;; carcass TOP's own frame (x from its left end at G, z from its back edge at
;;; G): ((cx cz w d opens) ...), opens "EDGE" where the oval runs past the
;;; TOP's back edge, else "HOLE" (D18).
(defun vanity-top-cutouts (xs G / out xw w d zw)
  (setq w (vanityBasinW)
        d (vanityBasinD)
        zw (vanityWasteFromBack)
        out nil)
  (foreach xw xs
    (setq out (cons (list (- xw G) (- zw G) w d (if (< (- zw (/ d 2.0)) G) "EDGE" "HOLE")) out)))
  (reverse out))

;;; The note it is, on the TOP and in the BOM (D18).
(defun vanity-top-cutout-note (num)
  (strcat "Basin cut-out " (vanity-mm (vanityBasinW)) " x " (vanity-mm (vanityBasinD))
          " oval in the carcass top of " num ": cut on site to the basin's template."))

;;; Does the extent lo .. hi along the line z = zEdge meet the oval of the
;;; basin at xw (D26)? Inside the ellipse, no square root asked.
(defun vanity-oval-meets-p (lo hi xw zEdge / a c dz k dx)
  (setq a (/ (vanityBasinW) 2.0)
        c (/ (vanityBasinD) 2.0)
        dz (/ (- zEdge (vanityWasteFromBack)) c)
        k (- 1.0 (* dz dz)))
  (if (<= k 0.0)
    nil
    (progn
      (setq dx (max 0.0 (- lo xw) (- xw hi)))
      (< (* (/ dx a) (/ dx a)) k))))

;;; The socket centres along a run (puzzle.js socketCentres).
(defun vanity-socket-centres (len)
  (if (< len (vanitySingleSocketBelow))
    (list (/ len 2.0))
    (list (vanityTabFromEnd) (- len (vanityTabFromEnd)))))

;;; The TOP's back joint along x: ((kind x lo hi) ...), its tenons with the
;;; rail's sockets (G + the socket centres over W - 2G, the dog bone either
;;; side) and the rail's screws into its back edge (G + 50, W / 2, W - G - 50).
(defun vanity-top-back-features (W G / h out c)
  (setq h (vanityDogboneHalf)
        out nil)
  (foreach c (vanity-socket-centres (- W G G))
    (setq out (cons (list "TENON" (+ G c) (- (+ G c) h) (+ G c h)) out)))
  (foreach c (list (+ G (vanityBackScrewFromEnd)) (/ W 2.0) (- W G (vanityBackScrewFromEnd)))
    (setq out (cons (list "SCREW" c c c) out)))
  (reverse out))

;;; ...and those a basin takes away: ((kind x) ...) (D26).
(defun vanity-top-back-dropped (W G xs / out f hit xw)
  (setq out nil)
  (foreach f (vanity-top-back-features W G)
    (setq hit nil)
    (foreach xw xs
      (if (vanity-oval-meets-p (nth 2 f) (nth 3 f) xw G) (setq hit T)))
    (if hit (setq out (cons (list (car f) (cadr f)) out))))
  (reverse out))

;;; How far the bowl enters the board bx (name x0 y0 z0 w h d), or nil (D29):
;;; the bowl's solid the lower half of the ellipsoid of the basin's oval
;;; centred on (xw zw) and bowlH deep under yTop, the worktop's top. Over the
;;; board's point nearest the bowl's axis (in the oval's own measure) the
;;; bowl is deepest; the board enters it by the height it keeps between the
;;; bowl's bottom there and the rim.
(defun vanity-bowl-enters (bx xw zw yTop bowlH / a c dx dz s bottom lo hi)
  (setq a (/ (vanityBasinW) 2.0)
        c (/ (vanityBasinD) 2.0)
        dx (/ (- (max (nth 1 bx) (min xw (+ (nth 1 bx) (nth 4 bx)))) xw) a)
        dz (/ (- (max (nth 3 bx) (min zw (+ (nth 3 bx) (nth 6 bx)))) zw) c)
        s (+ (* dx dx) (* dz dz)))
  (if (< s 1.0)
    (progn
      (setq bottom (- yTop (* bowlH (sqrt (- 1.0 s))))
            lo (max bottom (nth 2 bx))
            hi (min yTop (+ (nth 2 bx) (nth 5 bx))))
      (if (> (- hi lo) 0.0001) (- hi lo) nil))
    nil))

;;; The shell the params fix (D29): the two sides and the two rails, as the
;;; cut stands them, (name x0 y0 z0 w h d).
(defun vanity-bowl-shell (W H D G / rails)
  (setq rails (vanity-rails W H G))
  (list (list "BUL" 0.0 0.0 (float G) (float G) (float H) (- D G))
        (list "BUR" (- W G) 0.0 (float G) (float G) (float H) (- D G))
        (car rails)
        (cadr rails)))

;;; A box's boards of one kind (D13, D29), (name x0 y0 z0 w h d): "SIDES" its
;;; two sides, "WALLS" its front wall and its back wall (in the pieces its U's
;;; leave), anything else its bottom. us the U's cut, ((tag u) ...).
(defun vanity-box-boards (b us GB columns kind / tag x0 bw base depth zBack wy wh len mine e k out)
  (setq tag (vanity-box-tag (nth 0 b) (nth 1 b) columns)
        x0 (nth 2 b)
        bw (nth 3 b)
        base (nth 5 b)
        depth (nth 6 b)
        zBack (nth 7 b)
        wy (+ base (vanityBottomGroove) GB)
        wh (vanity-box-wall-h b GB)
        len (vanity-box-len b GB)
        mine nil
        out nil)
  (foreach e us
    (if (= (car e) tag) (setq mine (append mine (list (cadr e))))))
  (cond
    ((= kind "SIDES")
      (list (list (strcat tag "-SL") x0 base zBack (float GB) (nth 4 b) depth)
            (list (strcat tag "-SR") (- (+ x0 bw) GB) base zBack (float GB) (nth 4 b) depth)))
    ((= kind "WALLS")
      (setq out (list (list (strcat tag "-BF") (+ x0 GB) wy (- (+ zBack depth) GB) len wh (float GB))))
      (if mine
        (progn
          (setq k 0)
          (foreach e (vanity-back-pieces b mine GB)
            (setq k (1+ k)
                  out (append out (list (list (strcat tag "-BB-" (itoa k)) (+ x0 GB (car e)) wy zBack (- (cadr e) (car e)) wh (float GB)))))))
        (setq out (append out (list (list (strcat tag "-BB") (+ x0 GB) wy zBack len wh (float GB))))))
      out)
    (T
      (list (list (strcat tag "-DNO") (+ x0 (/ (- bw (vanity-box-bottom-w b GB)) 2.0)) (+ base (vanityBottomGroove)) zBack
                  (vanity-box-bottom-w b GB) (float GB) depth)))))

;;; Every board of the cut a bowl could enter (D29), in the cut's own order:
;;; the shell, the divider, every box's sides, then their walls, then their
;;; bottoms. The TOP takes the oval (D18); the fronts stand before the carcass.
(defun vanity-bowl-boards (W H D G GB frontT n columns sinks / boxes us dv out b)
  (setq boxes (vanity-boxes-cut W H D G GB frontT n columns sinks (vanityServiceVoid))
        us (vanity-trap-us W H D G GB frontT n columns sinks)
        dv (vanity-divider-cut W H D G GB frontT n columns sinks)
        out (vanity-bowl-shell W H D G))
  (if dv (setq out (append out (list dv))))
  (foreach b boxes (setq out (append out (vanity-box-boards b us GB columns "SIDES"))))
  (foreach b boxes (setq out (append out (vanity-box-boards b us GB columns "WALLS"))))
  (foreach b boxes (setq out (append out (vanity-box-boards b us GB columns "BOTTOM"))))
  out)

;;; Every board the bowls at xs enter: ((name n) ...), the deepest per board
;;; to the tenth of a millimetre, in the boards' order (D29). yTop the
;;; worktop's top in the carcass frame.
(defun vanity-bowl-hits (boards xs yTop bowlH / out bx best xw e)
  (setq out nil)
  (foreach bx boards
    (setq best nil)
    (foreach xw xs
      (setq e (vanity-bowl-enters bx xw (vanityWasteFromBack) yTop bowlH))
      (if (and e (or (null best) (> e best))) (setq best e)))
    (if best (setq out (cons (list (car bx) (/ (fix (+ (* best 10.0) 0.5)) 10.0)) out))))
  (reverse out))

;;; #48 in CLAUDE.md T83 F8's words (D29): "the bowl enters RAIL-TOP by N mm: move
;;; the basin forward or take a shallower bowl", every board named.
(defun vanity-bowl-sentence (num hits / s h)
  (setq s "")
  (foreach h hits
    (setq s (strcat s (if (= s "") "" ", ") (car h) " by " (vanity-mm (cadr h)) " mm")))
  (strcat num ": The bowl enters " s ": move the basin forward or take a shallower bowl."))

;;; The bowl refused with the worktop's refusals (D29): the sentence where a
;;; bowl at xs enters the shell, else nil; wt the worktop's thickness, bowlH
;;; the bowl's depth below the worktop's top.
(defun vanity-bowl-refused (num W H D G xs wt bowlH / hits)
  (setq hits (vanity-bowl-hits (vanity-bowl-shell W H D G) xs (+ H wt) bowlH))
  (if hits (vanity-bowl-sentence num hits) nil))

;;; Check #48 for the bowl (D25, D29): the sentence where the bowls at xs, the
;;; wastes' x of the basins the worktop takes, enter any board of the cut,
;;; else nil; wt the worktop's thickness, bowlH the bowl's depth below the
;;; worktop's top.
(defun vanity-bowl-verdict (num W H D G GB frontT n columns sinks xs wt bowlH / hits)
  (setq hits (vanity-bowl-hits (vanity-bowl-boards W H D G GB frontT n columns sinks) xs (+ H wt) bowlH))
  (if hits (vanity-bowl-sentence num hits) nil))

;;; ---- (g) NO DOUBLE DRAWER UNDER A BASIN ----

;;; Is a double asked on this row refused (D24)? The top row and the row
;;; under it, with a basin.
(defun vanity-double-refused-p (row n sinks)
  (and (> sinks 0) (or (= row n) (= row (1- n)))))

;;; ...in these words.
(defun vanity-double-refusal (row)
  (strcat "Drawer " (itoa row) ": a double drawer is not cut under a basin: the trap's U is the top box's and its air is measured to the box under it. One box is cut."))

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
;;; THE VOID, INSIDE (T83 F6, D27). wall_gap 10, the house clearance: the
;;; carcass to the wall; the worktop 548 deep from the wall (500 + 3 + 25 +
;;; 20), the fronts 10 under its edge; the void 80 inside, the boxes' back
;;; faces at 85 from the carcass back.
;;; THE FRONTS. 197 197 197 at y 0 200 400, 897 wide at x 1.5.
;;; THE BOXES. 390 deep (the 400 runner, the rung at or under 500 - 80), the
;;; back face at z 85; 854 wide at x 23, the walls 818 long and 104 high, the
;;; bottom 831; the sides 138, their feet at 31.5 213.5 413.5, their tops 169.5
;;; 351.5 551.5. The parent (vd 0): 440 deep on the 450, the back face at 35.
;;; THE TRAP. The waste at x 450, z 250 (T83 F8; 200 under T82). The U 370..530
;;; in the top box (D3), 245 deep (it follows the waste, D29: 250 + 80 - 85),
;;; R 20; in the bottom's frame 335.5..495.5; the back wall cut as D3-BB-1
;;; (0 329) and D3-BB-2 (489 818), 329 each. The trap's bottom line 428.5, the
;;; box under it tops at 351.5: 77 of air, no shallow trap. The U reaches 330
;;; from the carcass back (85 + 245): the waste at 250 stands 80 inside it and
;;; nothing is said (under T83 F6 the U, 120, reached 205 over the waste at
;;; 200; under T82 it reached 155: "#39 The trap stands 45 mm beyond the U").
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
;;; ONE BASIN ON TWO COLUMNS (T83 F7, D28). The trap's gap 350..550, 200
;;; centred on the waste at 450; the top boxes Z1D3 at x 23 and Z2D3 at x 550,
;;; 327 wide, walls 291, bottoms 304; the fronts 447 at x 1.5 and 451.5 as
;;; before; the SHORT DIVIDER at x 441, 18 x 382 x 482 from y 18 and z 18, to
;;; the top row's runner underside at 400, carrying the runner rows at 56 and
;;; 238; no U; "#39 The trap stands in the gap between the top drawers: no
;;; wall carries their two inner runners"; the trap's bottom line 428.5, the
;;; box under it tops at 351.5: 77 of air, no shallow trap. Under T82 the
;;; waste stood on the divider: no U, "#39 The trap stands over the divider:
;;; no top drawer can take its U", the sentence D17 keeps for a unit too
;;; narrow for the gap.
;;; TWO BASINS ON ONE COLUMN. The wastes at 300 and 600, the U's 220..380 and
;;; 520..680, the back wall D3-BB-1 (0 179), D3-BB-2 (339 479), D3-BB-3 (639 818).
;;;
;;; THE CHEST. WARDROBE_CHEST3 W 800 H 647 D 568, equal, columns 2: the fronts
;;; 213 213 212 (638 over three, the top one takes the rounding), 397 wide at x
;;; 1.5 and 401.5; the DIVIDER at x 391, 18 x 611 x 550; the openings 373 each.
;;;
;;; FLOATING. mount "wall", no plinth, the carcass underside at 300, 2 hangers.
;;; On the floor: the plinth 100, no hanger.
;;;
;;; AFTER THE REVIEW. THE TOPS: the carcass TOP takes the oval 520 x 400 at 432,
;;; 232 in its own frame (T83 F8; 182 under T82), a HOLE 32 in front of its
;;; back edge; "Basin cut-out 520 x 400 oval in the carcass top of VU01: cut
;;; on site to the basin's template."; every tenon and screw of the TOP's back
;;; edge stays (under T82 the rail's screw at 450 was not cut). THE BOWL (T83
;;; F8, D29): RAIL-TOP clear, the sides clear; "VU01: The bowl enters D3-BB-1
;;; by 21.1 mm, D3-BB-2 by 21.1 mm: move the basin forward or take a shallower
;;; bowl."; the waste at 270, or a bowl 115 deep, enters nothing. ONE BASIN ON
;;; TWO COLUMNS: "VU01: The bowl enters Z1D3-SR by 70 mm, Z2D3-SL by 70 mm,
;;; Z1D3-BB by 6.1 mm, Z2D3-BB by 6.1 mm: move the basin forward or take a
;;; shallower bowl." THE SHELL: the waste at 210, the oval 10 from the carcass
;;; back: "VU01: The bowl enters RAIL-TOP by 22 mm: move the basin forward or
;;; take a shallower bowl.", refused with the worktop's refusals, cut in
;;; neither top.
;;; THE SMALLEST BOARD. W 484, columns 2, sinks 2: the U's would leave 0 and 9
;;; of the two back walls: neither is cut, "#39 The trap's U does not fit the
;;; top drawer's box: every board of its back wall keeps 30". W 242 with one
;;; basin, and W 480 with two on one column: the same.
;;; THE DOUBLE. VANITY3 with a basin: a double asked on drawer 3 or 2: "Drawer
;;; 3: a double drawer is not cut under a basin: the trap's U is the top box's
;;; and its air is measured to the box under it. One box is cut."; on drawer 1
;;; the parent's double.

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
        dv (vanity-divider-cut W H D G GB frontT n columns sinks)
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
  ;; the basins through the tops (D18, D25): the worktop's fit is the room's,
  ;; so the command takes every basin asked
  (foreach e (vanity-top-cutouts (vanity-wastes W columns sinks) G)
    (princ (strcat "\n" (vanity-top-cutout-note "VU01"))))
  (setq e (vanity-bowl-verdict "VU01" W H D G GB frontT n columns sinks (vanity-wastes W columns sinks) (vanityTop) (vanityBasinH)))
  (if e (princ (strcat "\n" e)))
  (princ))
