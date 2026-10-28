;;;========================================
;;; KIT_RECESS.lsp
;;; The RECESS EXTENSION - a MODIFIER on the KIT_BUD, KIT_BUDTALL, KIT_WARDROBE
;;; and KIT_WUD boards: the carcass GROWS BACKWARD into an alcove in the wall
;;; Command: RECESS_FULL
;;; Chat-fix 15.10.2026 (the owner's evening turn) - LISP FIRST ("lisp najpierw")
;;; Derived from: KIT_NOTCH.lsp (its routines are CALLED, never copied) +
;;;               KIT_BUD_FULL.lsp + SKYLON_COMMON.lsp
;;; Requires: SKYLON_COMMON.lsp and KIT_NOTCH.lsp loaded first
;;;========================================
;;;
;;; THE OWNER, 15.10.2026, the evening:
;;;
;;;   "czy reces nie moze dzialac jak komin, czyli front zawsze trzyma sie
;;;    linii a jak wpada do reces to wtedy sie wydluza szafka?"
;;;   "reces pionowy ... czy mozemy na niego spojrzec od czola i na przyklad
;;;    zrobic go na wysokosc nie od podlogi do sufitu ale na przyklad na
;;;    wysokosci 1000 mm i czy wtedy szafki moga sie wycinac w pionie tez do
;;;    tego recesu?"
;;;
;;; ...and his answers to the mockup "wneka jak komin":
;;;   2  "tak"                      the front holds the line, the carcass grows
;;;   3  "glebszy karkas tak jak proponujesz"   wholly inside: a deeper carcass
;;;   4  "dowolny"                  the band is any: a bottom and a top
;;;   5  "glebsze"                  the shelves in the band grow with it
;;;
;;; THE NIGHT BEFORE this file the recess took the cabinet IN (projectStore
;;; settleRecesses, runs.js wallGapOf: the cabinet slid back against the
;;; recess's back wall and its front made a step in the run). That law is
;;; REPLACED by this one: the FRONT NEVER MOVES. A cabinet wholly inside a
;;; recess is a deeper cabinet (section 1, D2); a cabinet partly inside one
;;; keeps its carcass on the wall line and grows an EXTENSION behind its back
;;; over the part that is in the recess, the mirror image of the corner notch:
;;; where the notch makes the carcass SHALLOWER over a corner, the extension
;;; makes it DEEPER over a band.
;;;
;;; This is a NEW FILE. It touches no other kit. drawRect, drawCircle,
;;; drawText, makePolyline, createViewLayers, createCNCLayers and
;;; SKY:tabCentres are COMMON's own; notch-profile, notch-p,
;;; notch-replan-sockets, notch-replan-tabs, notch-shift, notch-min-joint-edge,
;;; notch-screw-axis, notch-screw-row, notch-row-between,
;;; notch-rows-between-tabs, notch-edge-row (18.10.2026, the EXT-BACK's rows),
;;; notch-joint-inset, notch-rect-outline, notch-dogbone
;;; and notch-rot90-pts are KIT_NOTCH's own. All are CALLED.
;;;
;;; A NOTE ON NAMES. AutoLISP symbols are CASE-INSENSITIVE. The carcass is
;;; cw cd ch g (width, depth, height, board); the extension is ex0 ex1 (its
;;; outer faces across, carcass x from the LEFT outer face), ez0 ez1 (its
;;; outer faces up, carcass z from the UNDERSIDE) and ed (how far behind the
;;; carcass's BACK FACE its own back face stands). The JS mirror
;;; (src/engine/extension.js) calls them x0 x1 z0 z1 d in `params.extension`.
;;;
;;;========================================
;;; 1. THE MODIFIER: WHAT IT TAKES, WHAT IT GIVES
;;;========================================
;;;
;;; It runs AFTER the parent kit's carcass and BEFORE the drilling pass, in the
;;; notch's own place. A unit carrying a corner notch as well is cut by the
;;; notch FIRST and by the extension on the boards the notch left, when the
;;; two do not meet on the BACK; when they meet, the extension is refused in
;;; words the Check shows (D13, 18.10.2026; section H).
;;;
;;; WHERE THE NUMBERS COME FROM (the room, never the hand; projectStore
;;; paramsForEngine recessExtensionFor, derived every time and stored never,
;;; as the obstacle notch is):
;;;
;;;   The recess is drawn on the wall (lib/wallElements.js): x_mm along the
;;;   wall, width, depth INTO the wall, and since this turn a BOTTOM and a TOP
;;;   off the floor (bottom_mm, top_mm; nil = the floor, nil = the ceiling).
;;;   A cabinet standing on that wall, back to it, unrotated, is read against
;;;   every recess of the wall:
;;;
;;;   WHOLLY INSIDE (its span, end panels included, within the recess's span
;;;   AND its carcass, underside to top, within the band) -> D2: the carcass
;;;   is depth + recess depth, the cabinet stands against the recess's back
;;;   wall with the wall gap (params.recess_mm, depth, depth_full; projectStore
;;;   settleRecesses), its front exactly where it was. THIS FILE DOES NOT RUN.
;;;
;;;   PARTLY INSIDE -> the extension, in the carcass frame:
;;;     rx0 = recess x_mm - cabinet x ; rx1 = rx0 + recess width
;;;     rz0 = recess bottom - unit base ; rz1 = recess top - unit base
;;;       (nil bottom: rz0 = -inf, nil top: rz1 = +inf; the unit base is the
;;;        carcass's underside off the floor, runs.js unitBase)
;;;     ex0 = 0 when rx0 <= 0 else max(g, rx0 + clearance)
;;;     ex1 = cw when rx1 >= cw else min(cw - g, rx1 - clearance)
;;;     ez0 = 0 when rz0 <= 0 else max(g, rz0 + clearance)
;;;     ez1 = ch when rz1 >= ch else min(ch - g, rz1 - clearance)
;;;     ed  = the recess's depth
;;;   and it is CUT only when its interior across (ex1 - ex0 - 2g) and up
;;;   (bz1 - bz0, section 2) are both at least notch.minInterior (D4); under
;;;   that the cabinet stands as it is, on the wall line, nothing cut.
;;;
;;; THE CLEARANCE is notch.obstacleClearance (10): the extension stands that
;;; much off the recess's reveals, its head and its sill (D5). Its depth is the
;;; recess's own: the extension's back face stands the wall gap off the
;;; recess's back wall exactly as the carcass's BACK stands off the wall.
;;;
;;;========================================
;;; 2. THE LAW: AN EXTENSION MAKES THE CARCASS DEEPER OVER A BAND
;;;========================================
;;;
;;; Over the band ex0..ex1 x ez0..ez1 the carcass is ed DEEPER. The Skylon
;;; carcass says how a deeper carcass is built (the sides run from the front
;;; face to the back's face, the TOP and BOTTOM sit between the sides and in
;;; front of the back, the back covers the sides' ends), so every board follows
;;; from that, and the four EDGES of the band decide which boards grow and
;;; which are added:
;;;
;;;   ex0 = 0    the band reaches the LEFT side: BUL grows (a BUMP on its back
;;;              edge over the band's height)
;;;   ex0 > 0    a RETURN-L stands at x = ex0 .. ex0 + g
;;;   ex1 = cw   BUR grows;  ex1 < cw   a RETURN-R at x = ex1 - g .. ex1
;;;   ez0 = 0    the band reaches the FLOOR: the BOTTOM grows (a bump on its
;;;              back edge between the band's inner faces)
;;;   ez0 > 0    a FLOOR board lies at z = ez0 .. ez0 + g
;;;   ez1 = ch   the TOP grows;  ez1 < ch   a LID at z = ez1 - g .. ez1
;;;
;;; THE INTERIOR of the extension, across: ix0 = ex0 + g .. ix1 = ex1 - g (a
;;; RETURN's or a side's INNER face). Its vertical boards and bumps run, up,
;;; over bz0 .. bz1: bz0 = 0 when the band reaches the floor, else ez0 + g (on
;;; the FLOOR); bz1 = ch when it reaches the top, else ez1 - g (under the LID).
;;;
;;; BOARD BY BOARD, for an extension ex0 ex1 ez0 ez1 ed:
;;;
;;;   SIDE at a reached edge (BUL when ex0 = 0, BUR when ex1 = cw)
;;;            a BUMP on its back edge: from x = cd - g to cd - g + ed (its
;;;            own frame, x from the front) over z = bz0 .. bz1. Reaching the
;;;            floor and the top it is simply a DEEPER side, (cd - g + ed) x
;;;            ch; its puzzle sockets on the longer top and bottom edges are
;;;            RE-PLANNED for the longer edge (the notch's D5), its back tabs
;;;            on the straight runs of its back edge, above and below the bump
;;;            (none where the bump is: it meets the EXT-BACK, a plain board).
;;;            DOG BONES at the bump's re-entrant corners (section 5).
;;;   TOP      (ez1 = ch) and BOTTOM (ez0 = 0): a BUMP on the back edge from
;;;            y = cd - g to cd - g + ed over x = ix0 .. ix1 (plan frame). Its
;;;            tabs into a grown side are re-planned on the longer edge; its
;;;            back tabs stand on the straight runs of its back edge, left and
;;;            right of the bump, each run planned on its own (none on a run
;;;            shorter than the notch's D6 minimum, 96 on an 18).
;;;   BACK     loses THE WINDOW: wx0 .. wx1 x wz0 .. wz1, where wx0 = 0 when
;;;            BUL grows (its bump passes through the back's plane) else ix0
;;;            (the back covers RETURN-L's end, D6); wx1 = cw or ix1 likewise;
;;;            wz0 = bz0, wz1 = bz1 (the back covers the FLOOR's and the LID's
;;;            front edges, and the BOTTOM's and TOP's bumps pass through).
;;;            A window touching no edge is a THROUGH POCKET (D9); touching one
;;;            edge, a BITE; touching two neighbouring edges, a CORNER (the
;;;            notch's own outline); touching two opposite edges it cuts the
;;;            BACK IN TWO (D8: the pieces are BACK and BACK-2); touching
;;;            three, it SHORTENS the back. Every joint and row of the parent
;;;            that falls in the window goes; every piece keeps the parent's
;;;            joints on the edges it still has, re-planned on what is left.
;;;   SHELF    every adjustable shelf whose height lies within bz0 .. bz1 takes
;;;            the same bump as the TOP, wc / 2 clear of the RETURNs as of the
;;;            sides (D10, the owner's "glebsze").
;;;   PLINTH   untouched: the front never moves.
;;;
;;; THE BOARDS ADDED, all plain rectangles standing BEHIND the back's plane:
;;;
;;;   RETURN-L (ed - g) x (bz1 - bz0), at x = ex0 .. ex0 + g, y = cd .. cd + ed
;;;            - g, z = bz0 .. bz1. It starts behind the BACK (which covers its
;;;            end) and ends at the EXT-BACK's face (which covers the other).
;;;   RETURN-R the same at x = ex1 - g .. ex1.
;;;   FLOOR    (ex1 - ex0) x (ed - g), at z = ez0 .. ez0 + g, y = cd .. cd + ed
;;;            - g, over the whole band's width: it covers the RETURNs' and the
;;;            bumps' bottom ends; the BACK covers its front edge, the EXT-BACK
;;;            its back edge.
;;;   LID      the same at z = ez1 - g .. ez1, covering the top ends.
;;;   EXT-BACK (ex1 - ex0) x (ez1 - ez0), at y = cd + ed - g .. cd + ed: the
;;;            extension's own back, covering every back end and back edge in
;;;            the band as the BACK covers the carcass's.
;;;
;;; THEIR FIXING IS THE JOINER'S, as the notch box's is: no puzzle joint, no
;;; machined hole (F22 readiness 'geometry', fixing 'manual'), screwed on THE
;;; BACK SCREW ROW of SKYLON_COMMON ([screwFromEnd, mid, length - screwFromEnd]
;;; on the G / 2 axis). The routines below STATE where the screws go. The rows
;;; that ARE drilled are the BACK's own: drawBACK's rows into the sides, the
;;; TOP and the BOTTOM (D17: none round the window since 17.10.2026, drawn
;;; again 18.10 and withdrawn 19.10.2026 by the owner).
;;; 18.10.2026 (D17 AMENDED, CLAUDE.md T79 F6): the EXT-BACK is a back, and a
;;; back carries its rows ("ale tylko na plecach"): its screws are DRILLED
;;; round the band (recess-ext-back-screws) and it is a cut part (readiness
;;; 'cut', no 'manual' fixing); RETURN-L, RETURN-R, the FLOOR and the LID stay
;;; as above.
;;;
;;;========================================
;;; 3. DECISIONS TAKEN FOR THE OWNER (each one line to veto)
;;;========================================
;;;
;;; D1  THE FRONT HOLDS THE LINE. DECIDED by the owner 15.10.2026 ("2 tak"):
;;;     a cabinet never moves back into a recess; the recess is room the
;;;     carcass grows into, one line of fronts, one worktop.
;;; D2  WHOLLY INSIDE IS A DEEPER CARCASS. DECIDED by the owner ("glebszy
;;;     karkas tak jak proponujesz"): depth + recess depth, nothing else moves;
;;;     this file never runs for it, the kit's own depth law does.
;;; D3  THE BAND IS ANY. DECIDED by the owner ("dowolny"): a recess carries a
;;;     bottom and a top off the floor, nil for the floor and the ceiling,
;;;     typed in the wall's own elevation window; the carcass takes the part
;;;     of the band it stands in.
;;; D4  THE INTERIOR RULE. An extension whose interior across or up is under
;;;     notch.minInterior (100, the owner's own number for the notch) is not
;;;     cut: a pocket 80 wide behind a back is a dust trap, not storage. The
;;;     cabinet stands as it is. Proposed.
;;; D5  THE CLEARANCE is the notch's obstacleClearance (10) off the reveals,
;;;     the head and the sill of the recess; the depth is the recess's own
;;;     (the wall gap off its back wall). Proposed.
;;; D6  THE BACK COVERS THE ENDS. The owner's decision of the same evening on
;;;     the notch ("od przodu cala plyta, krawedz z boku") applied whole: the
;;;     BACK covers the RETURNs' ends and the FLOOR's and LID's front edges,
;;;     the FLOOR and the LID cover the RETURNs' and the bumps' ends, the
;;;     EXT-BACK covers every back end. Through the open door the window shows
;;;     the BACK's own cut edge and whole faces behind it, no end grain.
;;; D7  RE-PLAN, NOT FILTER (the notch's D5), on every straight run the window
;;;     leaves: a run under the notch's D6 minimum (2 (dogbone + g) = 96)
;;;     carries no joint and is screwed.
;;; D8  THE BACK IN PIECES. A band from the floor to the top inside the width,
;;;     or across the width inside the height, cuts the BACK in two. The second
;;;     piece is BACK-2, the same board: the parent's sockets on the edges it
;;;     keeps, drawBACK's rows, its own frame from its own bottom-left.
;;; D9  THE WINDOW is a through pocket on its own layer RECESS_WINDOW (ACI 52,
;;;     beyond the Cabineo's 51, unused by COMMON's table): the cutter clears
;;;     it and leaves its corners round, no dog bone. A cut that reaches an
;;;     edge is an OUTLINE cut with a CORNER MARK at each re-entrant corner
;;;     (D18, 17.10.2026; a dog bone until then), as the notch's is.
;;;     AMENDED 19.10.2026 (chat fix), the owner: *"czy mozesz sie upewnic na
;;;     milion procent ze wszystkie elementy sa zamkniete?"*  The window lies
;;;     wholly INSIDE the board, so it is a CUT-OUT and its polyline runs
;;;     CLOCKWISE (the engine's T25 F1.2: a hole traced the outline's way
;;;     round is a hole machined to its own outside). Until tonight the window
;;;     ran anticlockwise, the outline's way, and the export gate said so in
;;;     red on every recess with a window. The JS mirror: cutout T on the
;;;     RECESS_WINDOW pocket record.
;;; D10 THE SHELVES GROW. DECIDED by the owner ("glebsze"): a shelf whose
;;;     height lies within the band's interior takes the bump; one above or
;;;     below it is the parent's.
;;; D11 THE ADDED BOARDS ARE THE JOINER'S, as the notch box is: outlines only,
;;;     nothing drilled in them. (Screws were STATED on them until 17.10.2026;
;;;     D17: none now, biscuits by hand.) 18.10.2026 (D17 amended): the
;;;     EXT-BACK is a back and is drilled with drawBACK's rows round the band;
;;;     RETURN-L, RETURN-R, the FLOOR and the LID stay outlines.
;;; D12 THE PINS. The back shelf-pin column of a grown side steps back by ed
;;;     over the band (the notch's D7 mirrored: the parent's own columnFromEdge
;;;     from the NEW back edge); above and below the band it stays.
;;; D13 WITH A NOTCH. Amended 18.10.2026 under the owner's word: *"dlaczego
;;;     cut the corner likwiduje nam wciecie do recess?"*  Until that day it
;;;     read NOT WITH A NOTCH: any notch, wherever it stood, refused the
;;;     extension, and the refusal reached no screen (the T79 F8 PROBE,
;;;     verify/t79/f08-probe.md). Now a notch and an extension COEXIST when
;;;     their FOOTPRINTS ON THE BACK do not overlap: the notch's WIDTH along
;;;     the back at its corner's end (0 .. nw at an L corner, cw - nw .. cw at
;;;     an R one; a front corner's width stands over the same x) against the
;;;     band's ex0 .. ex1, AND its HEIGHT (0 .. hh from the floor, the whole
;;;     height at h 0, ch - hh .. ch from the top, KIT_NOTCH.lsp D21) against
;;;     ez0 .. ez1 (recess-notch-footprint, recess-notch-overlap-p). Then BOTH
;;;     are cut, each by its own routine, the notch first and the extension on
;;;     the boards the notch left (section H): a board cut by both takes the
;;;     extension's outline with the notch's corner taken out of it
;;;     (recess-cut-corner), and every edge cut by both takes its joints run
;;;     by run on what the two leave of it (recess-runs, D7): the BACK's side
;;;     row too, on the edge the notch cuts, on what the notch and the window
;;;     leave of it, a row on its run (recess-side-row; the T79 F8 review).
;;;     The BACK's pieces are cut from the NOTCHED back: a full-height notch
;;;     takes its strip off the piece it reaches (that edge is the notch's:
;;;     no joint), a part-height one is a corner of the piece that holds it.
;;;     No row goes into the notch's box (KIT_NOTCH.lsp D10: drawn 18.10,
;;;     withdrawn 19.10.2026 by the owner, see D17 below), so the piece that
;;;     holds the box carries drawBACK's rows only. On a notched carcass the
;;;     extension's FLOOR and LID are
;;;     EXT-FLOOR and EXT-LID (the notch's box has a LID and, from the top, a
;;;     FLOOR of its own; recess-box-name). When the footprints overlap, the
;;;     notch stands and the extension is refused in words the Check shows
;;;     (EXTENSION_REFUSED): "The recess cannot be cut: the corner cut stands
;;;     where the recess band is; move one of them."
;;; D14 THE PARENTS are the notch's: KIT_BUD, KIT_BUDTALL, KIT_WARDROBE,
;;;     KIT_WUD (the same five boards). A kit that is not one of them stands
;;;     on the wall line in front of the recess, refused in words. A wall
;;;     unit's hanger cut-out the window reaches is a refusal too: the bracket
;;;     cannot hang on air.
;;;
;;; 17.10.2026, THE OWNER'S MORNING (four more, each one line to veto):
;;;
;;; D15 THE BUMP STOPS AT THE SHELF. BUG, the owner 17.10.2026: *"jak mamy
;;;     szafe z czesciowa wneka i wstawimy divider to polki sie rozciagaja w
;;;     ksztalcie trojkata do tylnej sciany ... nie zatrzymuje sie w calosci
;;;     na dividerze."*  recess-shelf-bump stated b0 and b1 in the shelf's
;;;     frame and never clamped them to the shelf: a bay shelf beside a
;;;     divider got a bump point beyond its own end, and recess-bump-outline
;;;     drew a slant from the shelf's front corner to it (PROBE, WARDROBE
;;;     1000, divider at 500, band 300..1000: the left shelf 478 wide got
;;;     (960 0), the right one (-200 0)). Now b0 = max 0 b0, b1 = min bw b1;
;;;     a shelf the clamped band does not reach (b1 - b0 <= 0) is the
;;;     parent's. Full-width shelves answer exactly as before.
;;; D16 THE FIXED SHELF GROWS TOO. The owner 17.10.2026: *"polki tez wycina
;;;     ale nie wycina polek fix, czego nie rozumiem."*  D10 names A SHELF,
;;;     any shelf; the engine alone had skipped the fixed one. The exception
;;;     is gone; the fixed shelf's joint is the parent's, measured on the
;;;     parent's depth, nothing new in the grown part (D11's spirit: the
;;;     grown part is the joiner's). Proposed: the joint stays where it was.
;;;     And its bump runs END TO END (10:35, the owner's second look): a fixed
;;;     shelf is cut to the interior faces with no clearance, so its bump
;;;     takes the notch's clr grammar, 0 for fixed, wc / 2 for adjustable
;;;     (recess-shelf-clr); the 2 mm steps and their corner marks are gone.
;;; D17 NO SCREW BETWEEN THE BACK AND THE BOX. The owner 17.10.2026: *"to
;;;     masz wkrety na niej a to nie dobrze bo nie bedziemy tam wkrecac
;;;     wkretow, system wkrety dookola plecow w tym przypadku nie zadziala
;;;     ... bedziemy montowac na ciastka (w przyszlosci dodamy lamello)
;;;     teraz nic."*  So: the BACK's columns and rows along the window (into
;;;     RETURN-L, RETURN-R, FLOOR and LID) are NOT drilled; the added boards
;;;     state NO screws (recess-return-screws, recess-lid-screws,
;;;     recess-ext-back-screws answer nil). Their fixing is the joiner's, on
;;;     biscuits by hand, a Lamello one day; this file draws nothing for it
;;;     ("teraz nic"). The BACK's rows into the sides, the TOP and the BOTTOM
;;;     stay exactly where drawBACK puts them.
;;;     AMENDED 18.10.2026 (CLAUDE.md T79 F6, "ale tylko na plecach": the rows
;;;     round the window on the BACK, and the EXT-BACK drilled) and HALF
;;;     WITHDRAWN 19.10.2026, the owner on the eye-test of T79: *"nie na
;;;     pierwszych plecach tylko na tych drugich ktore sa we wnetrzu recess,
;;;     na tych pierwszych nie, to juz bylo usuniete i znowu trzeba usunac"*.
;;;     So THE BACK (the first back) stands as written above: NO column into
;;;     RETURN-L's and RETURN-R's front ends, NO row into the FLOOR's and the
;;;     LID's front edges, nothing into a notch's box (D13); drawBACK's rows
;;;     into the sides, the TOP and the BOTTOM only. What stays of 18.10:
;;;       THE EXT-BACK  along the band's four edges: a column into each
;;;                     vertical board's back end (a RETURN, or a grown side's
;;;                     bump) over bz0 .. bz1, x = S and w - S; a row into
;;;                     each horizontal board's back edge (the FLOOR or the
;;;                     BOTTOM's bump, the LID or the TOP's bump) over the run
;;;                     between the two vertical boards, g .. w - g, z = S and
;;;                     h - S (recess-ext-back-screws, what it stated until
;;;                     17.10.2026, now DRILLED: the EXT-BACK is a cut part)
;;;     Each of its runs carries THE BACK SCREW ROW over its length
;;;     (KIT_NOTCH's notch-edge-row). Over g .. w - g that is drawBACK's
;;;     notch-row-between whenever the run is longer than 2 x screwFromEnd; at
;;;     exactly notch.minInterior (100, the narrowest band D4 lets through) it
;;;     is two at the run's quarters, where notch-row-between would drill
;;;     three holes in one place. Every run here is at least notch.minInterior
;;;     long (D4), never under one hole's offset, so none is ever dropped.
;;;     RETURN-L, RETURN-R, the FLOOR and the LID still state NO screw
;;;     (recess-return-screws and recess-lid-screws answer nil).
;;; D18 THE CORNER MARK, NOT THE DOG BONE. The owner 17.10.2026 on every L
;;;     outline: *"nie, nie dodawaj wiercenia, dodaj jeden layer w samym
;;;     cornerze okolo 40 mm w kazda strone na linii L shape i nazwij to
;;;     corner 4 mm, wtedy ja wytne ten korner."*  No circle is drawn at a
;;;     re-entrant corner any more (the TOP's, the BOTTOM's, a side's, a
;;;     shelf's bump corners; the BACK's bite and corner cuts). In its place
;;;     TWO open lines on the layer CORNER_4MM (COMMON's grammar, the owner's
;;;     4 mm cutter), each from the corner along one of the two outline
;;;     edges that meet there, cnc.cornerMarkLeg (40) long or the edge's own
;;;     length where the edge is shorter. The outline itself keeps its sharp
;;;     corner; the owner's 4 mm program squares what the 8 mm cutter left.
;;;     The window (D9) stays a pocket with round corners: it has no outline
;;;     corner to mark. COMMON's puzzle dog bones beside the tabs are not
;;;     this and do not move ("mamy puzzle i dogbones w systemie i niech tak
;;;     bedzie"). KIT_NOTCH.lsp D9 and KIT_CORNER_L.lsp state the same law.
;;; D19 THE TOP IS DRAWN FROM ITS UNDERSIDE. The owner 17.10.2026, of the
;;;     nesting sheet: *"w 01 bottom i top nie powinno byc odbicie
;;;     lustrzane?"*; *"lustro bottom i top, prosze, koduj."*  The TOP was
;;;     drawn in drawTOP_ROT90's frame, the BOTTOM's, which for the TOP is the
;;;     view from above: its outside. A bite at the rear-left in plan (CASE A,
;;;     CASE C) is NOT symmetric, so a TOP laid underside up and cut from the
;;;     BOTTOM's drawing had its bite at the rear RIGHT. The law, stated once
;;;     in SKYLON_JOINTS_BISCUIT.lsp section J and the routine in KIT_NOTCH
;;;     .lsp D11 (notch-top-pts, notch-top-fc): the TOP's frame is the
;;;     BOTTOM's mirrored across the width, y' = (W - 2G) - y, x unchanged,
;;;     the walk reversed; the bump's corner name swaps its y half, the
;;;     corner mark moves with it. Applied once, at the end, to the whole
;;;     drawing (the engine's topFrame.js); every routine of this file keeps
;;;     drawing in the ROT90 frame. The NUMBERS carry both boards.
;;; D20 THE CORNER MARK IS ONE OPEN L (16:10). The owner, cutting the marks
;;;     in VCarve with the tool beside the line: *"jeden L wektor ... obok
;;;     linii."*  KIT_NOTCH.lsp D12 states it: notch-corner-marks, the
;;;     routine every corner of this file is marked by, returns ONE open
;;;     three-point polyline per re-entrant corner, walked the outline's way
;;;     (in, corner, out; material on the left), drawn by
;;;     notch-draw-corner-marks as an open LWPOLYLINE. The NUMBERS below.
;;;
;;; 18.10.2026, THE OWNER'S LIST (CLAUDE.md T79 F9):
;;;
;;; D21 THE END PANEL GROWS WITH ITS SIDE. The owner: *"nie wycina mi panelu
;;;     bocznego do recess a powinno."*  CLAUDE.md T79 F9: "the end panel is
;;;     cut by the SAME outline as the side it covers"; partly in the band,
;;;     the END panel on a side that grows "takes the side's grown outline
;;;     ... with the pad's own x added to the band's test (the band is tested
;;;     against -padL..W+padR, not 0..W)". The END PANEL (KIT_NOTCH.lsp D23:
;;;     the masking board on the OUTSIDE of a side, in its side's frame) grows
;;;     with its side, by the same ed, when the band reaches PAST ITS OUTER
;;;     FACE (recess-end-reach-p: the recess's own edge at or beyond -t on the
;;;     left, cw + t on the right, t the END's thickness; the room asks it,
;;;     projectStore recessExtensionFor, and hands the engine the hands it
;;;     reaches). A band ending inside the END's thickness grows the side and
;;;     leaves the END on the wall line: the wall stands behind part of it.
;;;     It grows over the band's OWN height, ez0 .. ez1, not the side's bz0
;;;     .. bz1: it covers the FLOOR's, the LID's and the EXT-BACK's ends as it
;;;     covers the BACK's (D6), and runs on to its own underside or top where
;;;     the band reaches the carcass's floor or top, but NEVER PAST THE
;;;     RECESS'S OWN BOTTOM OR TOP: where the band was clipped to the carcass
;;;     the room hands the engine the recess's own edge there (rz0 under the
;;;     carcass underside, rz1 over it, in the carcass frame; none where the
;;;     recess runs to the floor or the ceiling), and the END stops on it. An
;;;     END dropped to the floor beside a recess that starts 50 over the floor
;;;     grows from 50 up; one run up past a recess's head grows to the head
;;;     and no further: the END is never grown into the wall under or over
;;;     the recess (recess-end-cuts). Its
;;;     outline is KIT_NOTCH's notch-end-outline of those corners, its marks
;;;     D18's, its area and cut-list line the outline's. WHOLLY INSIDE (D2)
;;;     the END panel stands in the recess with the carcass, so its stand-off
;;;     is measured off the recess's own back wall as the carcass's is (the
;;;     engine's END law: the wall gap plus recess_mm): it reaches the recess
;;;     back with the sides and the door face with the doors, and by the same
;;;     stop never past the recess's own bottom or top: where one of them
;;;     falls within the END's height (an END dropped to the floor under a
;;;     recess that starts over it, one run up past its head) the room hands
;;;     it (rz0, rz1, as above) and the END keeps to the wall line there:
;;;     recess-end-cuts over the carcass's whole height, ed = recess_mm.
;;;     Proposed (one line to veto): the band's own height, not the side's.
;;;
;;; 28.10.2026, THE OWNER'S EVENING (chat fix; the mockups "wneka szuflady" v1
;;; and v2 and "plecy podkowa 1 mm"):
;;;
;;; D22 THE DRAWERS IN THE RECESS. The owner: *"szafa ma 1000 mm a wneka 800,
;;;     to po prawej i po lewej szafa jest o 100 mm plytka a reszta gleboka, i
;;;     co ja potrzebuje to ustawic szuflady tylko w tej wnece i odsunac
;;;     diverted po lewej i po prawej rowno z wneka, zeby zamontowac
;;;     szuflady"*; the first mockup: *"dokladnie tak"*, and *"pamietaj zeby
;;;     diverted byl tylko do wysokosci polki nad szufladami"*, *"polka nad
;;;     szufladami powinna byc wycieta jak inne polki az do tylu, w L shape lub
;;;     z cornerami"*; the second: *"dokladnie o to mi chodzi"*; then
;;;     *"dokladnie, mozesz zakodowac prosze"*, *"szuflady tez prosze"*.
;;;     A RECESS COLUMN is a column of drawers (the kit's column stack) whose
;;;     two walls are dividers standing ON the band's edges, the left one's
;;;     outer face at ex0 and the right one's at ex1, where the RETURNs stand.
;;;     recess-col-refusal asks the rest: the band reaches neither side and
;;;     starts on the floor, and ends at least notch.minInterior over the board
;;;     over the drawers; the engine asks that the two dividers are the unit's
;;;     only ones, the column its only stack, and nothing is notched. Then
;;;     (section I):
;;;       THE DIVIDERS  replace the RETURNs under the board over the drawers:
;;;                     each grows back by ed to the EXT-BACK's face, through
;;;                     the BACK's plane, its own setback kept at the front,
;;;                     and stops under that board (recess-col-divider).
;;;       THE DRAWERS   take the depth the recess gives: the column's usable
;;;                     depth plus ed, on the kit's own ladder
;;;                     (recess-col-drawer-depth; a 568 wardrobe: 440 -> 590).
;;;       THE BOARD OVER THE DRAWERS  is ONE fixed board from BUL to BUR (the
;;;                     owner's "jak inne polki"), cut as a fixed shelf in the
;;;                     band is (D16), its bump END TO END between the band's
;;;                     OUTER faces ex0 .. ex1: the dividers stand under its
;;;                     ends, the RETURNs on them (recess-col-cap-bump); its
;;;                     two re-entrant corners marked (D18, D20).
;;;       THE RETURNS   start on that board and run up to bz1, ed deep: through
;;;                     the BACK's plane, their front ends flush with its inner
;;;                     face (recess-col-box-places). D6 gives way there: the
;;;                     BACK's cut edge meets a RETURN's face, not its end.
;;;       THE BOTTOM    grows between the band's OUTER faces ex0 .. ex1, the
;;;                     dividers standing on its bump (recess-col-plan-bump);
;;;                     the TOP's bump stays ix0 .. ix1 (the RETURNs beside
;;;                     it). Both back edges are re-planned on the runs the
;;;                     BACK leaves of them, 0 .. ex0 - g and ex1 - g .. tw
;;;                     (recess-col-top-joints; D7: a run under 96 is screwed).
;;;       THE BACK      loses the window ex0 .. ex1 across (recess-col-window):
;;;                     the dividers and the RETURNs pass through its plane.
;;;                     Its rows run to the window's edges (recess-back-joints:
;;;                     every other band's window edges are ix0 and ix1, so
;;;                     nothing else moves).
;;;       THE SLOTS     between each carcass side and its divider are CLOSED as
;;;                     the wardrobe's 30 behind a hinged door is (*"nie
;;;                     zapomnij zablokowac to jak w przypadku 30 mm, ale teraz
;;;                     bedzie varius w zaleznosci od wneki i diverted"*): two
;;;                     fillers each on the DP's own two lines (KIT_WARDROBE_
;;;                     FULL: the front one the drawers' setback plus the
;;;                     filler's offset back from the face, the back one on the
;;;                     BACK), as wide as the slot, from the BOTTOM to the
;;;                     board over the drawers (recess-col-fillers). The
;;;                     drawers stand the slot clear of the hinges, so no DP
;;;                     stands in the column.
;;;     Any other column of drawers the band reaches keeps the carcass's depth
;;;     and the Check says why in words (RECESS_DRAWERS_SHALLOW). Proposed (one
;;;     line to veto): the RETURN through the BACK's plane, not the BACK
;;;     stepped round it.
;;; D23 THE HAND EDGE. The owner, 19:44: *"plecy, jak mamy wyciecie na recess
;;;     w plecach, mowie tylko do srodka, to tam robimy edging; w zwiazku ze to
;;;     jest w ksztalcie U to ja nie moge puscic tego na edge bander, wiec nie
;;;     zrobie scribe na edging, wiec w tym miejscu musimy pomniejszyc o 1 mm
;;;     plecy, ale tylko w podkowie U"*; on the mockup: *"dokladnie, mozesz
;;;     zakodowac prosze"*. A cut INSIDE the BACK is edged by hand, so the
;;;     cutter takes recess.handEdge (1) MORE of the board on each of the cut's
;;;     own edges and the edge brings it back to the nominal line
;;;     (recess-hand-cut): the U (a bite) on its three, the window (D9, the
;;;     same hand) on its four, the corner (an L: no bander takes an inside
;;;     corner) on its two. NOT on an edge a board covers (a recess column's
;;;     ex0 and ex1, D22), NOT on the piece's own edges, NOT on a whole piece
;;;     (BACK and BACK-2 of D8, a shorter back: the edge bander's own scribe).
;;;     CASE B's window, 344 x 344, is cut 346 x 346. Proposed (one line to
;;;     veto): the window and the corner as the U.
;;; D24 THE BOARD OVER THE DRAWERS STANDS BACK 10. The owner, 19:36:
;;;     *"wszystkie polki teraz sa 10 mm, to polke nad szufladami tez zrob 10
;;;     mm jak reszta"*. Not a number of this file: the project's
;;;     (wardrobe.drawers.capSetbackMm 20 -> 10, every drawer stack's board, in
;;;     a recess or not, the engine's paramsForEngine); a bare kit call keeps
;;;     the LISP's full depth. The NUMBERS of section I take it as 10.
;;; D25 THE BACK'S HOLES FOLLOW ITS PIECES. A hole the kit drills into the BACK
;;;     (a fixed shelf's row, the three of a stack's board, a DP's two, a
;;;     divider's back row) is drilled into the piece it falls on, in that
;;;     piece's frame, and into none where the window took the board away
;;;     (recess-piece-at). The probe of this evening: a board over a stack in
;;;     front of a band from the floor to the top drilled x 932 on a BACK 118
;;;     wide and x 500 in the window.
;;;
;;; 28.10.2026, LATER THE SAME EVENING (the owner's walk at home: *"problem
;;; polega na tym ze nie dzialaja te szuflady"*):
;;;
;;; D26 ALIGN WITH RECESS STANDS BOTH DIVIDERS. The app adds a divider centred
;;;     in the widest bay (the first at (cw - g) / 2, the second in the half
;;;     left of it), so on the owner's wardrobe both stood nearer the LEFT
;;;     edge (491 is as near 110 as 872, 245.5 nearer 110) and one press of
;;;     D22's per-divider rule took the first to 110, where the second's place
;;;     stopped it at 285.5: neither on an edge, the drawers kept the carcass's
;;;     depth. Now, with TWO dividers, one press on either stands BOTH: the
;;;     left one (the smaller x) on ex0, the right one on ex1 - w
;;;     (recess-col-pair-x), and both at the face (setback 0), the column's
;;;     full-depth walls the drawers' runners need (the house's column guard).
;;;     The pair keeps its order, so neither passes the other. With one
;;;     divider, or more than two, the press stands the pressed one on its
;;;     nearer edge (recess-col-divider-x), at the face. The engine's sentence
;;;     (RECESS_DRAWERS_SHALLOW) says which thing is wrong, so it never points
;;;     to the wrong press: a divider too many or too few, the drawers in a
;;;     side column, or (recess-col-refusal) the two off the edges, the only
;;;     case that names "Align both with recess".
;;;
;;;========================================
;;; 4. NOT HERE
;;;========================================
;;;
;;; The deeper carcass of D2 (the kit's own depth, projectStore). The window
;;; and door of the elevation (room.openings). A recess on an island face (an
;;; island has no wall). A rotated cabinet (its back is not on the wall).
;;;
;;;========================================
;;; A. THE NUMBERS THIS FILE READS
;;;========================================
;;;
;;; All of them KIT_NOTCH's own table (notch-profile): the same joint numbers,
;;; the same clearance, the same minimum interior. Nothing new is read.
;;; 17.10.2026: and the corner mark's leg, cnc.cornerMarkLeg (40), from the
;;; same table (D18); the mark itself is the notch's routine, notch-corner-marks.
;;; 28.10.2026: and the hand edge round a cut inside the BACK,
;;; recess.handEdge (1), from the same table (D23; profile.recess.handEdgeMm).

(defun recess-p (key)
  (notch-p key))

;;;========================================
;;; B. THE BAND
;;;========================================

;;; The band reaches the left side: BUL grows.
(defun recess-left-p (ex0)
  (<= ex0 0.0))

;;; ...the right side: BUR grows.
(defun recess-right-p (ex1 cw)
  (>= ex1 cw))

;;; ...the floor: the BOTTOM grows.
(defun recess-floor-p (ez0)
  (<= ez0 0.0))

;;; ...the top: the TOP grows.
(defun recess-top-p (ez1 ch)
  (>= ez1 ch))

;;; All four: the whole carcass is in the band. D2, not this file.
(defun recess-full-p (cw ch ex0 ex1 ez0 ez1)
  (and (recess-left-p ex0) (recess-right-p ex1 cw) (recess-floor-p ez0) (recess-top-p ez1 ch)))

;;; The interior across: a RETURN's or a grown side's inner face.
(defun recess-ix0 (ex0 g) (+ ex0 g))
(defun recess-ix1 (ex1 g) (- ex1 g))

;;; The vertical boards' and bumps' run, up.
(defun recess-bz0 (ez0 g)
  (if (recess-floor-p ez0) 0.0 (+ ez0 g)))
(defun recess-bz1 (ez1 ch g)
  (if (recess-top-p ez1 ch) ch (- ez1 g)))

;;; THE WINDOW the BACK loses: (wx0 wz0 wx1 wz1), BACK frame (x from the left,
;;; z up).
(defun recess-window (cw ch g ex0 ex1 ez0 ez1)
  (list (if (recess-left-p ex0) 0.0 (recess-ix0 ex0 g))
        (recess-bz0 ez0 g)
        (if (recess-right-p ex1 cw) cw (recess-ix1 ex1 g))
        (recess-bz1 ez1 ch g)))

;;; D4: is there an extension to cut at all? nil, or the sentence.
(defun recess-interior-refusal (cw ch g ex0 ex1 ez0 ez1 ed / minI)
  (setq minI (recess-p "notch.minInterior"))
  (cond ((recess-full-p cw ch ex0 ex1 ez0 ez1)
         "RECESS: the whole carcass stands in the recess; it is a deeper carcass (its depth), not an extension.")
        ((< (- (recess-ix1 ex1 g) (recess-ix0 ex0 g)) minI)
         "RECESS: the extension would be narrower inside than the minimum interior; the cabinet stands on the wall line.")
        ((< (- (recess-bz1 ez1 ch g) (recess-bz0 ez0 g)) minI)
         "RECESS: the extension would be lower inside than the minimum interior; the cabinet stands on the wall line.")
        ((< ed (* 2.0 g))
         "RECESS: the recess is too shallow to hold an extension's back and a return.")
        (T nil)))

;;;========================================
;;; C. ONE OUTLINE LAW: A RECTANGLE WITH A BUMP
;;;========================================
;;;
;;; A bw x bh board (x right, y up, origin bottom-left) with a BUMP on its TOP
;;; edge over x = b0 .. b1, rising to bh + ext. Anticlockwise, once round. With
;;; b0 = 0 the left step is gone, with b1 = bw the right one; both gone it is
;;; a plain (bw x bh + ext) rectangle. A board whose bump is on another edge
;;; is this outline carried into its frame (recess-transpose, recess-mirror-x).

(defun recess-bump-outline (bw bh b0 b1 ext / out)
  (setq out (list (list 0.0 0.0) (list bw 0.0)))
  (if (< b1 bw)
    (setq out (append out (list (list bw bh) (list b1 bh)))))
  (setq out (append out (list (list b1 (+ bh ext)) (list b0 (+ bh ext)))))
  (if (> b0 0.0)
    (setq out (append out (list (list b0 bh) (list 0.0 bh)))))
  out)

;;; The re-entrant corners of that outline and the way INTO THE WASTE:
;;; ((px py) (dx dy)) each, left step then right step.
(defun recess-bump-reentrants (bw bh b0 b1 / out)
  (setq out nil)
  (if (> b0 0.0) (setq out (append out (list (list (list b0 bh) (list -1.0 1.0))))))
  (if (< b1 bw) (setq out (append out (list (list (list b1 bh) (list 1.0 1.0))))))
  out)

;;; The dog bones at those corners: (cx cy r) each, the notch's own law (its
;;; section 5): the circle's centre r / sqrt 2 into the waste along the
;;; corner's diagonal, so the cutter clears the corner square.
;;; 17.10.2026 (D18): RETIRED FROM THE DRAWING. The routine stays as the
;;; record of where the circle stood; nothing draws it. What is drawn at a
;;; re-entrant corner is notch-corner-marks on the board's own outline.
(defun recess-bump-dogbones (bw bh b0 b1 r / k)
  (setq k (/ r (sqrt 2.0)))
  (mapcar '(lambda (re)
             (list (+ (car (car re)) (* (car (cadr re)) k))
                   (+ (cadr (car re)) (* (cadr (cadr re)) k))
                   r))
          (recess-bump-reentrants bw bh b0 b1)))

;;; (x y) -> (y x) for every point, the walk reversed to stay anticlockwise.
(defun recess-transpose (pts)
  (reverse (mapcar '(lambda (p) (list (cadr p) (car p))) pts)))

;;; x -> w - x for every point, the walk reversed to stay anticlockwise.
(defun recess-mirror-x (pts w)
  (reverse (mapcar '(lambda (p) (list (- w (car p)) (cadr p))) pts)))

;;; A circle list carried the same two ways.
(defun recess-transpose-circles (cs)
  (mapcar '(lambda (c) (list (cadr c) (car c) (caddr c))) cs))
(defun recess-mirror-circles (cs w)
  (mapcar '(lambda (c) (list (- w (car c)) (cadr c) (caddr c))) cs))

;;; The sockets on a straight run of `len` starting at `off`: none on a run
;;; under the D6 minimum (D7), else the notch's re-plan, shifted.
(defun recess-run-sockets (len off e below minEdge)
  (if (< len minEdge) nil (notch-shift (notch-replan-sockets len e below) off)))

;;; The tabs down a straight run, the same way.
(defun recess-run-tabs (len off e one three minEdge)
  (if (< len minEdge) nil (notch-shift (notch-replan-tabs len e one three) off)))

;;; A polygon's area, mm2 (the shoelace).
(defun recess-area (pts / a n i p q)
  (setq a 0.0 n (length pts) i 0)
  (while (< i n)
    (setq p (nth i pts) q (nth (rem (1+ i) n) pts))
    (setq a (+ a (- (* (car p) (cadr q)) (* (car q) (cadr p)))))
    (setq i (1+ i)))
  (/ (abs a) 2.0))

;;;========================================
;;; D. BOARD BY BOARD
;;;========================================

;;; -- TOP and BOTTOM: (cw - 2g) x (cd - g), plan frame of the board (x from
;;;    BUL's inner face, y from the front edge) ----------------------------

;;; (bw bh b0 b1 ext) of the board's bump.
(defun recess-plan-bump (cw cd g ex0 ex1 ed)
  (list (- cw (* 2.0 g)) (- cd g) (- (recess-ix0 ex0 g) g) (- (recess-ix1 ex1 g) g) ed))

(defun recess-top-outline (cw cd g ex0 ex1 ed / b)
  (setq b (recess-plan-bump cw cd g ex0 ex1 ed))
  (recess-bump-outline (car b) (cadr b) (caddr b) (cadddr b) (nth 4 b)))

(defun recess-top-dogbones (cw cd g ex0 ex1 ed r / b)
  (setq b (recess-plan-bump cw cd g ex0 ex1 ed))
  (recess-bump-dogbones (car b) (cadr b) (caddr b) (cadddr b) r))

;;; The TOP's (and BOTTOM's) joints: ("LEFT" (y..)) ("RIGHT" (y..)) ("BACK" (x..))
;;; in the board's own plan frame. A grown side takes the longer plan.
(defun recess-top-joints (cw cd g ex0 ex1 ed / e below inset sideW tw minEdge left right bk)
  (setq e      (recess-p "puzzle.tabCentresFromEnd")
        below  (recess-p "puzzle.singleSocketBelow")
        inset  (notch-joint-inset cd e (recess-p "puzzle.singleJointMaxDepth"))
        minEdge (notch-min-joint-edge (recess-p "puzzle.dogboneHalfHeight") g)
        sideW  (- cd g)
        tw     (- cw (* 2.0 g)))
  (setq left  (notch-replan-sockets (if (recess-left-p ex0) (+ sideW ed) sideW) inset below)
        right (notch-replan-sockets (if (recess-right-p ex1 cw) (+ sideW ed) sideW) inset below))
  ;; the back edge's two straight runs, in the board's frame: 0 .. ex0 and
  ;; ix1 - g .. tw (a reached side leaves no run on that end)
  (setq bk (append (if (recess-left-p ex0) nil (recess-run-sockets ex0 0.0 e below minEdge))
                   (if (recess-right-p ex1 cw) nil
                     (recess-run-sockets (- cw ex1) (- (recess-ix1 ex1 g) g) e below minEdge))))
  (list (list "LEFT" left) (list "RIGHT" right) (list "BACK" bk)))

;;; -- THE SIDE that grows: (cd - g) x ch, BUL's frame (x from the FRONT, y
;;;    up); BUR's frame runs from the back and is the mirror ------------------

;;; (bw bh b0 b1 ext) of the side's bump, in the TRANSPOSED frame (u = z up
;;; the edge, v = x along the depth): the bump is on the back edge.
(defun recess-side-bump (cd ch g ez0 ez1 ed)
  (list ch (- cd g) (recess-bz0 ez0 g) (recess-bz1 ez1 ch g) ed))

;;; The side's outline in BUL's frame; `bur` T mirrors it into BUR's.
(defun recess-side-outline (cd ch g ez0 ez1 ed bur / b pts)
  (setq b (recess-side-bump cd ch g ez0 ez1 ed))
  (setq pts (recess-transpose (recess-bump-outline (car b) (cadr b) (caddr b) (cadddr b) (nth 4 b))))
  (if bur (recess-mirror-x pts (+ (- cd g) ed)) pts))

(defun recess-side-dogbones (cd ch g ez0 ez1 ed r bur / b cs)
  (setq b (recess-side-bump cd ch g ez0 ez1 ed))
  (setq cs (recess-transpose-circles (recess-bump-dogbones (car b) (cadr b) (caddr b) (cadddr b) r)))
  (if bur (recess-mirror-circles cs (+ (- cd g) ed)) cs))

;;; The grown side's joints, every one MEASURED FROM THE SIDE'S FRONT EDGE
;;; (BUR's own frame is cd - g + ed - x of these):
;;;   ("TOP-SOCKETS" ..) ("BOTTOM-SOCKETS" ..)   over the edge the TOP (BOTTOM)
;;;        meets: the longer edge when that board grows too, else the parent's
;;;   ("TOP-SCREWS" ..) ("BOTTOM-SCREWS" ..)     the back screw row on the same
;;;   ("BACK-TABS" (z..))                        the straight runs 0 .. bz0 and
;;;        bz1 .. ch, each planned on its own (D7), none where the bump is
;;;   ("PIN-COLUMNS" (x..))                      the parent's two (D12 moves the
;;;        back one's holes over the band in the drilling pass)
(defun recess-side-joints (cd ch g ez0 ez1 ed / e below inset one three sfe pin minEdge sideW
                                                topRun botRun bz0 bz1 tabs)
  (setq e      (recess-p "puzzle.tabCentresFromEnd")
        below  (recess-p "puzzle.singleSocketBelow")
        inset  (notch-joint-inset cd e (recess-p "puzzle.singleJointMaxDepth"))
        one    (recess-p "puzzle.singleTabAtOrBelow")
        three  (recess-p "puzzle.middleTabBelow")
        sfe    (recess-p "puzzle.screwFromEnd")
        pin    (recess-p "shelfHoles.columnFromEdge")
        minEdge (notch-min-joint-edge (recess-p "puzzle.dogboneHalfHeight") g)
        sideW  (- cd g)
        bz0    (recess-bz0 ez0 g)
        bz1    (recess-bz1 ez1 ch g))
  (setq topRun (if (recess-top-p ez1 ch) (+ sideW ed) sideW)
        botRun (if (recess-floor-p ez0) (+ sideW ed) sideW))
  (setq tabs (append (recess-run-tabs bz0 0.0 e one three minEdge)
                     (recess-run-tabs (- ch bz1) bz1 e one three minEdge)))
  (list (list "TOP-SOCKETS"    (notch-replan-sockets topRun inset below))
        (list "BOTTOM-SOCKETS" (notch-replan-sockets botRun inset below))
        (list "TOP-SCREWS"     (notch-screw-row topRun sfe))
        (list "BOTTOM-SCREWS"  (notch-screw-row botRun sfe))
        (list "BACK-TABS"      tabs)
        (list "PIN-COLUMNS"    (list pin (- sideW pin)))))

;;; -- THE BACK: cw x ch, x from the LEFT face, z up -------------------------

;;; THE PIECES the window leaves: a list of (x0 z0 x1 z1), one or two, in the
;;; BACK's frame. nil when the window is the whole back (D2, never here).
(defun recess-back-pieces (cw ch g ex0 ex1 ez0 ez1)
  (recess-window-pieces cw ch (recess-window cw ch g ex0 ex1 ez0 ez1)))

;;; ...of ANY window w (wx0 wz0 wx1 wz1): the band's own (recess-window) or a
;;; recess column's (recess-col-window, D22, 28.10.2026). The law of the
;;; pieces is the window's, whoever cut it.
(defun recess-window-pieces (cw ch w / wx0 wz0 wx1 wz1 L R F U)
  (setq wx0 (car w) wz0 (cadr w) wx1 (caddr w) wz1 (cadddr w)
        L (<= wx0 0.0) R (>= wx1 cw) F (<= wz0 0.0) U (>= wz1 ch))
  (cond ((and L R F U) nil)
        ;; three edges reached: the back is shorter
        ((and L R F) (list (list 0.0 wz1 cw ch)))
        ((and L R U) (list (list 0.0 0.0 cw wz0)))
        ((and F U L) (list (list wx1 0.0 cw ch)))
        ((and F U R) (list (list 0.0 0.0 wx0 ch)))
        ;; two opposite edges: two pieces (D8)
        ((and L R) (list (list 0.0 0.0 cw wz0) (list 0.0 wz1 cw ch)))
        ((and F U) (list (list 0.0 0.0 wx0 ch) (list wx1 0.0 cw ch)))
        ;; a corner, a bite or a window: one whole piece, cut
        (T (list (list 0.0 0.0 cw ch)))))

;;; The rectangle to TAKE OUT of a piece, or nil for a piece that is whole
;;; (the shortened and the two-piece cases): the window where it crosses the
;;; piece, in the piece's own frame (x0 z0 x1 z1).
(defun recess-back-cut (piece window / x0 z0 x1 z1)
  (setq x0 (max (car piece) (car window))
        z0 (max (cadr piece) (cadr window))
        x1 (min (caddr piece) (caddr window))
        z1 (min (cadddr piece) (cadddr window)))
  (if (and (> x1 x0) (> z1 z0))
    (list (- x0 (car piece)) (- z0 (cadr piece)) (- x1 (car piece)) (- z1 (cadr piece)))
    nil))

;;; Which edges of a bw x bh piece a cut (x0 z0 x1 z1) touches: a list of
;;; "left" "right" "bottom" "top".
(defun recess-cut-edges (cut bw bh / out)
  (setq out nil)
  (if (<= (car cut) 0.0) (setq out (cons "left" out)))
  (if (>= (caddr cut) bw) (setq out (cons "right" out)))
  (if (<= (cadr cut) 0.0) (setq out (cons "bottom" out)))
  (if (>= (cadddr cut) bh) (setq out (cons "top" out)))
  (reverse out))

;;; D9: what the cut IS: "window" (no edge), "bite" (one edge), "corner" (two
;;; neighbouring edges). Two opposite or three edges never reach here (the
;;; pieces are whole rectangles then).
(defun recess-cut-kind (cut bw bh / n)
  (setq n (length (recess-cut-edges cut bw bh)))
  (cond ((= n 0) "window") ((= n 1) "bite") (T "corner")))

;;; A BITE: a bw x bh board less a rectangle x0 z0 x1 z1 touching ONE edge, so
;;; two legs stand either side of it. Anticlockwise, once round.
(defun recess-bite-outline (bw bh x0 z0 x1 z1 edge)
  (cond ((= edge "bottom") (list (list 0.0 0.0) (list x0 0.0) (list x0 z1) (list x1 z1) (list x1 0.0) (list bw 0.0) (list bw bh) (list 0.0 bh)))
        ((= edge "top")    (list (list 0.0 0.0) (list bw 0.0) (list bw bh) (list x1 bh) (list x1 z0) (list x0 z0) (list x0 bh) (list 0.0 bh)))
        ((= edge "left")   (list (list 0.0 0.0) (list bw 0.0) (list bw bh) (list 0.0 bh) (list 0.0 z1) (list x1 z1) (list x1 z0) (list 0.0 z0)))
        (T                 (list (list 0.0 0.0) (list bw 0.0) (list bw z0) (list x0 z0) (list x0 z1) (list bw z1) (list bw bh) (list 0.0 bh)))))

;;; Its two dog bones (the notch's law, section 5 of KIT_NOTCH): r / sqrt 2
;;; into the waste along each re-entrant corner's diagonal.
(defun recess-bite-dogbones (x0 z0 x1 z1 edge r / k)
  (setq k (/ r (sqrt 2.0)))
  (cond ((= edge "bottom") (list (list (+ x0 k) (- z1 k) r) (list (- x1 k) (- z1 k) r)))
        ((= edge "top")    (list (list (+ x0 k) (+ z0 k) r) (list (- x1 k) (+ z0 k) r)))
        ((= edge "left")   (list (list (- x1 k) (+ z0 k) r) (list (- x1 k) (- z1 k) r)))
        (T                 (list (list (+ x0 k) (+ z0 k) r) (list (+ x0 k) (- z1 k) r)))))

;;; The piece's outline with its cut taken out: a window leaves the rectangle
;;; whole (it is a pocket); a bite is recess-bite-outline on the edge it
;;; touches; a corner is the notch's own outline.
(defun recess-back-outline (piece cut / bw bh edges kind x0 z0 x1 z1 fc)
  (setq bw (- (caddr piece) (car piece)) bh (- (cadddr piece) (cadr piece)))
  (if (null cut)
    (list (list 0.0 0.0) (list bw 0.0) (list bw bh) (list 0.0 bh))
    (progn
      (setq edges (recess-cut-edges cut bw bh) kind (recess-cut-kind cut bw bh)
            x0 (car cut) z0 (cadr cut) x1 (caddr cut) z1 (cadddr cut))
      (cond ((= kind "window") (list (list 0.0 0.0) (list bw 0.0) (list bw bh) (list 0.0 bh)))
            ((= kind "bite") (recess-bite-outline bw bh x0 z0 x1 z1 (car edges)))
            (T
             (setq fc (strcat (if (member "left" edges) "x0" "x1") (if (member "bottom" edges) "y0" "y1")))
             (notch-rect-outline bw bh (- x1 x0) (- z1 z0) fc))))))

;;; The dog bones of a piece's cut: none for a window (D9), the bite's two, the
;;; notch's one for a corner.
(defun recess-back-dogbones (piece cut r / bw bh edges kind x0 z0 x1 z1 fc cs)
  (if (null cut) nil
    (progn
      (setq bw (- (caddr piece) (car piece)) bh (- (cadddr piece) (cadr piece))
            edges (recess-cut-edges cut bw bh) kind (recess-cut-kind cut bw bh)
            x0 (car cut) z0 (cadr cut) x1 (caddr cut) z1 (cadddr cut))
      (cond ((= kind "window") nil)
            ((= kind "bite") (recess-bite-dogbones x0 z0 x1 z1 (car edges) r))
            (T
             (setq fc (strcat (if (member "left" edges) "x0" "x1") (if (member "bottom" edges) "y0" "y1")))
             (setq cs (notch-dogbone bw bh (- x1 x0) (- z1 z0) fc r))
             (if cs (list cs) nil))))))

;;; A piece's joints and rows, in the piece's OWN frame (x from its left end,
;;; z from its bottom end). `topTabs` and `botTabs` are the TOP's and the
;;; BOTTOM's back tabs in carcass x (recess-top-joints "BACK" shifted by g, or
;;; the parent's), `bulTabs` and `burTabs` the sides' back tabs in z
;;; (recess-side-joints "BACK-TABS" for a grown side, the parent's for the
;;; other). Only the edges the piece has are jointed:
;;;   ("LEFT" ..) ("RIGHT" ..) ("TOP" ..) ("BOTTOM" ..)   sockets
;;;   ("SCREWS" ((x z) ..))   drawBACK's rows on the jointed edges ONLY.
;;;        Until 17.10.2026 this list also carried the hand-fix rows G / 2
;;;        outside each window edge that had a board's end or edge behind it
;;;        (into a RETURN, the FLOOR, the LID); D17 (17.10.2026) took them
;;;        away, 18.10 put them back, 19.10.2026 the owner took them away
;;;        again (D17): the window's edges carry no screw. `window` stays an
;;;        argument for the record.
;;; `nb` (18.10.2026, D13): the footprint on the BACK of a BOXED notch at a
;;; back corner (recess-notch-footprint), or nil. The rows keep off it: a side
;;; row runs on what the notch leaves of that edge (and, where the band reaches
;;; that side too, on what the notch AND the window leave of it, D13, a row on
;;; its run: recess-side-row), a top or bottom row on
;;; what it leaves of the TOP's or the BOTTOM's back edge (the notch and its
;;; RETURN, nw + g from that end), drawBACK's spacing on each run; no row into
;;; the notch's box (KIT_NOTCH.lsp D10, 19.10.2026). With nb nil every row is
;;; where it was.
(defun recess-back-joints (piece window cw ch g ex0 ex1 ez0 ez1 topTabs botTabs bulTabs burTabs nb
                           / e sfe S x0 z0 x1 z1 bw bh inZ inX left right top bottom scr
                             wx0 wz0 wx1 wz1 bz0 bz1 runs ix0 ix1)
  (setq e   (recess-p "puzzle.tabCentresFromEnd")
        sfe (recess-p "puzzle.screwFromEnd")
        S   (notch-screw-axis g)
        x0 (car piece) z0 (cadr piece) x1 (caddr piece) z1 (cadddr piece)
        bw (- x1 x0) bh (- z1 z0)
        wx0 (car window) wz0 (cadr window) wx1 (caddr window) wz1 (cadddr window)
        bz0 (recess-bz0 ez0 g) bz1 (recess-bz1 ez1 ch g)
        ix0 (recess-ix0 ex0 g) ix1 (recess-ix1 ex1 g))
  ;; the tabs of a side within this piece's height, in the piece's frame
  (setq inZ '(lambda (zs) (mapcar '(lambda (z) (- z z0))
                                  (vl-remove-if '(lambda (z) (or (< z (+ z0 1e-6)) (> z (- z1 1e-6)))) zs))))
  (setq inX '(lambda (xs) (mapcar '(lambda (x) (- x x0))
                                  (vl-remove-if '(lambda (x) (or (< x (+ x0 1e-6)) (> x (- x1 1e-6)))) xs))))
  (setq left   (if (<= x0 0.0) (apply inZ (list bulTabs)) nil)
        right  (if (>= x1 cw) (apply inZ (list burTabs)) nil)
        top    (if (>= z1 ch) (apply inX (list topTabs)) nil)
        bottom (if (<= z0 0.0) (apply inX (list botTabs)) nil))
  (setq scr nil)
  ;; drawBACK's side rows, between the tabs the edge carries, on each run the
  ;; notch leaves of the edge (D13; one run, the whole edge, without one); on
  ;; the edge the notch cuts, on what the notch AND the window leave of it, a
  ;; row on its run (recess-side-row)
  (if (<= x0 0.0)
    (foreach z (recess-side-row bh z0 left nb window (and nb (<= (car nb) 0.0)) (recess-left-p ex0) sfe)
      (setq scr (cons (list S z) scr))))
  (if (>= x1 cw)
    (foreach z (recess-side-row bh z0 right nb window (and nb (>= (caddr nb) cw)) (recess-right-p ex1 cw) sfe)
      (setq scr (cons (list (- bw S) z) scr))))
  ;; drawBACK's top and bottom rows, on the straight runs of the TOP's and the
  ;; BOTTOM's back edge within this piece (a grown board's run ends at the
  ;; WINDOW's edge: ix0 and ix1 for the band's own window, ex0 and ex1 for a
  ;; recess column's, D22, 28.10.2026; ix0 and ix1 stay bound for the record)
  (setq runs '(lambda (grown)
                (if grown
                  (append (if (recess-left-p ex0) nil (list (list g wx0)))
                          (if (recess-right-p ex1 cw) nil (list (list wx1 (- cw g)))))
                  (list (list g (- cw g))))))
  (if (>= z1 ch)
    (foreach run (apply runs (list (recess-top-p ez1 ch)))
      (foreach sub (recess-runs (car run) (cadr run) (recess-notch-xcut nb g cw (and nb (>= (cadddr nb) ch))))
        (foreach x (recess-run-row (max (car sub) x0) (min (cadr sub) x1) sfe)
          (setq scr (cons (list (- x x0) (- bh S)) scr))))))
  (if (<= z0 0.0)
    (foreach run (apply runs (list (recess-floor-p ez0)))
      (foreach sub (recess-runs (car run) (cadr run) (recess-notch-xcut nb g cw (and nb (<= (cadr nb) 0.0))))
        (foreach x (recess-run-row (max (car sub) x0) (min (cadr sub) x1) sfe)
          (setq scr (cons (list (- x x0) S) scr))))))
  ;; D17 (17.10.2026, again 19.10.2026): NO hand-fix rows round the window
  ;; and none into the notch's box (D13). The RETURNs' ends and the FLOOR's
  ;; and LID's front edges behind the window's four edges get no screw
  ;; through the BACK; the second back, the EXT-BACK, keeps its rows
  ;; (recess-ext-back-screws). wx0 wz0 wx1 wz1 bz0 bz1 are bound above for
  ;; the record of what the rows were measured from.
  (list (list "LEFT" left) (list "RIGHT" right) (list "TOP" top) (list "BOTTOM" bottom)
        (list "SCREWS" (reverse scr))))

;;; drawBACK's row along a run a .. b of a board's back edge: the back screw
;;; row over its length, shifted; nothing on a run that is not there.
(defun recess-run-row (a b e)
  (if (> b a) (notch-shift (notch-screw-row (- b a) e) a) nil))

;;; -- THE ADDED BOARDS: RETURN-L, RETURN-R, FLOOR, LID, EXT-BACK ------------

;;; Where they stand: ((name (x0 y0 z0 x1 y1 z1)) ..) in the carcass frame (x
;;; from the left face, y from the FRONT face, z up). Only the boards the band
;;; asks for.
(defun recess-box-places (cw cd ch g ex0 ex1 ez0 ez1 ed / bz0 bz1 out)
  (setq bz0 (recess-bz0 ez0 g) bz1 (recess-bz1 ez1 ch g) out nil)
  (if (not (recess-left-p ex0))
    (setq out (append out (list (list "RETURN-L" (list ex0 cd bz0 (+ ex0 g) (- (+ cd ed) g) bz1))))))
  (if (not (recess-right-p ex1 cw))
    (setq out (append out (list (list "RETURN-R" (list (- ex1 g) cd bz0 ex1 (- (+ cd ed) g) bz1))))))
  (if (not (recess-floor-p ez0))
    (setq out (append out (list (list "FLOOR" (list ex0 cd ez0 ex1 (- (+ cd ed) g) (+ ez0 g)))))))
  (if (not (recess-top-p ez1 ch))
    (setq out (append out (list (list "LID" (list ex0 cd (- ez1 g) ex1 (- (+ cd ed) g) ez1))))))
  (append out (list (list "EXT-BACK" (list ex0 (- (+ cd ed) g) ez0 ex1 (+ cd ed) ez1)))))

;;; A RETURN: (ed - g) x (bz1 - bz0).
(defun recess-return (ch g ez0 ez1 ed)
  (list (- ed g) (- (recess-bz1 ez1 ch g) (recess-bz0 ez0 g))))

;;; Its screws: NONE (17.10.2026, D17). Until that morning this stated a row
;;; into the BOTTOM's bump edge (z = S) when the band reached the floor and
;;; into the TOP's (z = h - S) when it reached the top, on the back screw
;;; row's spacing. The owner: *"nie bedziemy tam wkrecac wkretow ... bedziemy
;;; montowac na ciastka (w przyszlosci dodamy lamello) teraz nic"*. The
;;; arguments stay so every caller reads as before; the answer is nil.
(defun recess-return-screws (ch g ez0 ez1 ed)
  nil)

;;; The FLOOR and the LID: (ex1 - ex0) x (ed - g).
(defun recess-lid (g ex0 ex1 ed)
  (list (- ex1 ex0) (- ed g)))

;;; Their screws: NONE (17.10.2026, D17; it was a column into the vertical
;;; board's end under or over each end, x = S and w - S). Biscuits by hand.
(defun recess-lid-screws (g ex0 ex1 ed)
  nil)

;;; THE EXT-BACK: (ex1 - ex0) x (ez1 - ez0).
(defun recess-ext-back (ex0 ex1 ez0 ez1)
  (list (- ex1 ex0) (- ez1 ez0)))

;;; Its screws (x from its left end, z up from its bottom end), DRILLED: a
;;; column into each vertical board's back end (a RETURN or a grown side's
;;; bump) over the band's run bz0 .. bz1, x = S and w - S; a row into each
;;; horizontal board's back edge (the FLOOR or the BOTTOM's bump, the LID or
;;; the TOP's bump), z = S and h - S, THE BACK SCREW ROW over the run between
;;; the two vertical boards, g .. w - g (notch-edge-row; until 17.10.2026 it
;;; was stated as notch-row-between 0 .. w, the same holes on every run over
;;; 2 x screwFromEnd). Stated until 17.10.2026; NONE from 17.10 (D17, the
;;; owner: *"system wkrety dookola plecow w tym przypadku nie zadziala"*); D17
;;; AMENDED (18.10.2026): the EXT-BACK is a back, and its rows are drilled.
(defun recess-ext-back-screws (cw ch g ex0 ex1 ez0 ez1 / S sfe eb bz0 bz1 out)
  (setq S (notch-screw-axis g) sfe (recess-p "puzzle.screwFromEnd")
        eb (recess-ext-back ex0 ex1 ez0 ez1)
        bz0 (recess-bz0 ez0 g) bz1 (recess-bz1 ez1 ch g) out nil)
  (foreach z (notch-shift (notch-edge-row bz0 bz1 sfe) (- ez0))
    (setq out (cons (list S z) out))
    (setq out (cons (list (- (car eb) S) z) out)))
  (foreach x (notch-edge-row g (- (car eb) g) sfe)
    (setq out (cons (list x S) out))
    (setq out (cons (list x (- (cadr eb) S)) out)))
  (reverse out))

;;; -- SHELVES -----------------------------------------------------------------

;;; Is this shelf (its underside at zs) in the band's interior?
(defun recess-shelf-in-p (zs g ch ez0 ez1)
  (and (>= zs (- (recess-bz0 ez0 g) 1e-6)) (<= (+ zs g) (+ (recess-bz1 ez1 ch g) 1e-6))))

;;; The shelf's bump: (bw bh b0 b1 ext) in the SHELF's plan frame (x from its
;;; left edge, y from its front edge), `shelf` the parent's plan rectangle
;;; (x0 y0 x1 y1), `clr` clear of each RETURN or side: the shelf's OWN
;;; clearance, the notch's grammar (notch-shelf-cut's clr): wc / 2 for an
;;; adjustable shelf, 0 for a FIXED one, which is cut to the interior faces.
;;; 17.10.2026 (D15): b0 and b1 are CLAMPED to the shelf, 0 .. bw. A bay
;;; shelf beside a divider sees only the part of the band it stands under;
;;; one the band does not reach answers b1 <= b0 and is left the parent's
;;; (recess-shelf-grows-p). A full-width shelf answers exactly as before.
;;; 17.10.2026 (D16, the owner's second look, 10:35): until this hour the
;;; routine took wc / 2 for EVERY shelf, so a fixed shelf's bump stopped 2 mm
;;; short of each of its ends and the board carried two 2 mm steps with
;;; corner marks on them (*"dlaczego polka fix ma minimalne zalamanie? ma
;;; kat i nawet dodales corner layer?"*). With clr 0 its bump runs end to
;;; end: a plain deeper board, no corner, no mark.
(defun recess-shelf-bump (cw cd g ex0 ex1 ed shelf clr / bw b0 b1)
  (setq bw (- (caddr shelf) (car shelf))
        b0 (- (+ (recess-ix0 ex0 g) clr) (car shelf))
        b1 (- (- (recess-ix1 ex1 g) clr) (car shelf)))
  (list bw (- (cadddr shelf) (cadr shelf))
        (max 0.0 b0)
        (min bw b1)
        ed))

;;; The clearance a shelf is cut with: wc / 2 adjustable, 0 fixed (D16).
(defun recess-shelf-clr (fixed)
  (if fixed 0.0 (/ (recess-p "carcass.shelfWidthClearance") 2.0)))

;;; Does the clamped band reach this shelf at all? (D15)
(defun recess-shelf-grows-p (cw cd g ex0 ex1 ed shelf clr / b)
  (setq b (recess-shelf-bump cw cd g ex0 ex1 ed shelf clr))
  (> (- (cadddr b) (caddr b)) 0.0))

(defun recess-shelf-outline (cw cd g ex0 ex1 ed shelf clr / b)
  (setq b (recess-shelf-bump cw cd g ex0 ex1 ed shelf clr))
  (recess-bump-outline (car b) (cadr b) (caddr b) (cadddr b) (nth 4 b)))

;;; 17.10.2026 (D18): retired from the drawing, kept as the record; the shelf's
;;; corners are marked by notch-corner-marks on recess-shelf-outline.
(defun recess-shelf-dogbones (cw cd g ex0 ex1 ed shelf clr r / b)
  (setq b (recess-shelf-bump cw cd g ex0 ex1 ed shelf clr))
  (recess-bump-dogbones (car b) (cadr b) (caddr b) (cadddr b) r))
;;;----------------------------------------
;;; THE END PANEL (D21, 18.10.2026): in its side's frame (KIT_NOTCH.lsp D23,
;;; section H3), ph high, pb below the carcass underside; hand "L" or "R".
;;;----------------------------------------

;;; Does the band reach past the END panel's outer face? rx0 rx1 are the
;;; recess's own edges in the carcass frame (never clipped), et the END's
;;; thickness.
(defun recess-end-reach-p (hand rx0 rx1 cw et)
  (if (= hand "L") (<= rx0 (- et)) (>= rx1 (+ cw et))))

;;; The corners the band leaves on a grown END panel (ed deeper at its back):
;;; below the band (none from the floor) and above it (none to the top), ed
;;; wide, each (fc w h), over the band's own height ez0 .. ez1. rz0 rz1: the
;;; recess's own bottom and top in the carcass frame where the band was
;;; clipped to the carcass's floor or top, nil where the recess runs to the
;;; floor or the ceiling (D21): the END grows no further than the recess.
(defun recess-end-cuts (ch ez0 ez1 ed hand ph pb rz0 rz1 / fc0 fc1 lo hi out)
  (setq fc0 (if (= hand "R") "x0y0" "x1y0")
        fc1 (if (= hand "R") "x0y1" "x1y1")
        lo (if (recess-floor-p ez0) (if rz0 (max 0.0 (+ rz0 pb)) 0.0) (+ ez0 pb))
        hi (if (recess-top-p ez1 ch) (if rz1 (min ph (+ rz1 pb)) ph) (+ ez1 pb))
        out '())
  (if (> lo 0.0) (setq out (append out (list (list fc0 ed lo)))))
  (if (< hi ph) (setq out (append out (list (list fc1 ed (- ph hi))))))
  out)

;;;========================================
;;; E. THE REFUSALS (the room refuses first; nothing is clipped silently)
;;;========================================

;;; `fp` (18.10.2026, D13): the footprint on the BACK of the notch the
;;; carcass carries (recess-notch-footprint), or nil. Until that day the
;;; argument was `notched`, T for any notch, and the first answer read "RECESS:
;;; a carcass notched round an obstacle cannot grow into a recess as well; the
;;; notch stands." Now only a notch whose footprint the band overlaps refuses.
(defun recess-refusal (cw cd ch g ex0 ex1 ez0 ez1 ed fp / minEdge)
  (setq minEdge (notch-min-joint-edge (recess-p "puzzle.dogboneHalfHeight") g))
  (cond ((recess-notch-overlap-p fp ex0 ex1 ez0 ez1)
         "The recess cannot be cut: the corner cut stands where the recess band is; move one of them.")
        ((or (< ex0 0.0) (> ex1 cw) (< ez0 0.0) (> ez1 ch) (>= ex0 ex1) (>= ez0 ez1))
         "RECESS: the band lies outside the carcass.")
        ((and (not (recess-left-p ex0)) (< ex0 g))
         "RECESS: a RETURN cannot stand inside the side; the band starts at least a board in.")
        ((and (not (recess-right-p ex1 cw)) (> ex1 (- cw g)))
         "RECESS: a RETURN cannot stand inside the side; the band ends at least a board in.")
        ((and (not (recess-floor-p ez0)) (< ez0 g))
         "RECESS: the FLOOR cannot lie inside the BOTTOM; the band starts at least a board up.")
        ((and (not (recess-top-p ez1 ch)) (> ez1 (- ch g)))
         "RECESS: the LID cannot lie inside the TOP; the band ends at least a board down.")
        (T (recess-interior-refusal cw ch g ex0 ex1 ez0 ez1 ed))))

;;;========================================
;;; F. NUMBERS - THE GOLDEN CASES
;;;========================================
;;;
;;; KIT_BUD_FULL defaults: W 600, D 558, H 770, G 18 (golden-bud.json BUD-A:
;;; front 25, 1 shelf, hinge L). Joint inset 95 (D 558 is over 300). Cutter
;;; r 4. Every point list anticlockwise, once round. S = 9.
;;;
;;; CASE A (fixtures/golden-recess.json): the recess from carcass x 300 to the
;;; right, 150 deep, floor to ceiling, clearance 10:
;;;   ex0 310  ex1 600 (BUR grows)  ez0 0 (the BOTTOM grows)  ez1 770 (the TOP
;;;   grows)  ed 150.  ix0 328, ix1 582. bz0 0, bz1 770.
;;;   WINDOW (328 0 600 770): right, floor and top reached: the BACK is
;;;   SHORTER, one piece (0 0 328 770).
;;;
;;; BOARD      PARENT       EXTENDED
;;; BUL        540 x 770    unchanged
;;; BUR        540 x 770    690 x 770, a rectangle (BUR frame, x from the back;
;;;                         recess-side-outline walks it from the bottom-right):
;;;                         (690 0) (690 770) (0 770) (0 0); no dog bone; no
;;;                         back tabs (it meets the EXT-BACK)
;;; TOP        564 x 540    564 x 690 less 310 x 150 at the rear-left
;;; BOTTOM     564 x 540    the same as TOP in plan; its drawing is the TOP's
;;;                         mirror image (D19, 17.10.2026)
;;;   plan frame (x from BUL's inner face, y from the front edge):
;;;     (0 0) (564 0) (564 690) (310 690) (310 540) (0 540)
;;;   BOTTOM, drawTOP_ROT90 frame (x from the BACK edge, drawn width 690, y
;;;   from the BUL edge):
;;;     (690 0) (690 564) (0 564) (0 310) (150 310) (150 0)
;;;   TOP, drawn from its UNDERSIDE (D19: y from the BUR edge, y' = 564 - y,
;;;   the walk read backwards):
;;;     (150 564) (150 254) (0 254) (0 0) (690 0) (690 564)
;;;   CORNER MARK (D18, 17.10.2026; until then a dog bone, circle r 4 at
;;;   (307.1716 542.8284) plan): the corner (310 540) plan = (150 310) ROT90
;;;   = (150 254) on the TOP; D20 (16:10): ONE open L on CORNER_4MM, 40 each
;;;   arm, walked the outline's way (in, corner, out):
;;;     plan   (310 580) -> (310 540) -> (270 540)
;;;     BOTTOM (110 310) -> (150 310) -> (150 270)
;;;     TOP    (150 294) -> (150 254) -> (110 254)
;;;   (until 16:10 two legs each leaving the corner)
;;;   area 0.305 -> 0.343 m2 (342660 mm2)
;;; BACK       600 x 770    328 x 770, carcass x 0..328
;;;   (0 0) (328 0) (328 770) (0 770); no dog bone
;;; RETURN-L   -            132 x 770, carcass x 310..328, y 558..690, z 0..770
;;; EXT-BACK   -            290 x 770, carcass x 310..600, y 690..708, z 0..770
;;; FLOOR, LID -            none (the band reaches the floor and the top)
;;; SHELF-1    560 x 520    560 x 670 less 310 x 150 at the rear-left
;;;   shelf frame (x from its left edge, 2 clear of the RETURN as of BUL):
;;;     (0 0) (560 0) (560 670) (310 670) (310 520) (0 520)
;;;   CORNER MARK (D18, D20): corner (310 520); one open L on CORNER_4MM
;;;   (310 560) -> (310 520) -> (270 520) (was a dog bone at (307.1716 522.8284);
;;;   until 16:10 two legs leaving the corner)
;;;   area 0.291 -> 0.329 m2 (328700 mm2)
;;;   A FIXED shelf at the same height: x from 18 (no clearance), 564 wide,
;;;   clr 0: (0 0) (564 0) (564 670) (310 670) (310 520) (0 520), one corner,
;;;   its mark (310 520)-(270 520) and (310 520)-(310 560) (D16).
;;;   In a band from the left face (ex0 0) that shelf's bump starts at 0 and
;;;   ends at 564: a plain deeper board, no corner (10:35, D16).
;;; PLINTH     600          untouched
;;;
;;; WHICH JOINTS MOVE:
;;;
;;; BOARD, EDGE                      PARENT             EXTENDED
;;; BUR top sockets (x from front)   95, 445            95, 595   (445 -> 595)
;;; BUR bottom sockets               95, 445            95, 595
;;; BUR top screw row                50, 270, 490       50, 345, 640
;;; BUR bottom screw row             50, 270, 490       50, 345, 640
;;; BUR back-edge tabs (z)           95, 385, 675       NONE (meets the EXT-BACK)
;;; BUR shelf-pin columns            70, 470            70, 620 (D12, from the new back edge)
;;; BUR hinge holes                  as the parent (37 from the front)
;;; TOP/BOTTOM tabs into BUL (y)     95, 445            95, 445   unchanged
;;; TOP/BOTTOM tabs into BUR (y)     95, 445            95, 595   (445 -> 595)
;;; TOP/BOTTOM tabs into BACK (x)    95, 469            95, 215   (the run 0..310)
;;;   (TOP frame; carcass x 113, 487 -> 113, 233)
;;; BACK sockets, left edge (z)      95, 385, 675       95, 385, 675
;;; BACK sockets, right edge         95, 385, 675       NONE (the RETURN's end)
;;; BACK top/bottom sockets (x)      113, 487           113, 233
;;; BACK left screw row (z)          50, 240, 530, 720  unchanged (x 9)
;;; BACK right screw row             50, 240, 530, 720  NONE (D17: none since
;;;                                                     17.10.2026; x 319,
;;;                                                     z 50 385 720 into the
;;;                                                     RETURN's end from 18.10
;;;                                                     to 19.10.2026)
;;; BACK top/bottom rows (x)         68, 300, 532       68, 173, 278 (the run 18..328)
;;;   so the BACK carries 10 dia 3 holes (13 from 18.10 to 19.10.2026)
;;;
;;; THE ADDED BOARDS' FIXING: RETURN-L states NONE (17.10.2026, D17: biscuits
;;; by hand, a Lamello one day; until that morning it stated x 50 66 82 into
;;; the BOTTOM's and the TOP's bump edges, z 9 and 761). The EXT-BACK is a
;;; back and is DRILLED (D17 AMENDED 18.10.2026; stated until 17.10, none from
;;; 17.10 to 18.10), 12 dia 3 holes:
;;; EXT-BACK (x from its left end, z up)   into RETURN-L's end: x 9,   z 50 385 720
;;;                                        into BUR's bump end: x 281, z 50 385 720
;;;                                        into BOTTOM's bump:  x 68 145 222, z 9
;;;                                        into TOP's bump:     x 68 145 222, z 761
;;;
;;; CASE B (fixtures/golden-recess-band.json): a recess 150 deep in the middle
;;; of the cabinet, carcass x 100..500 and z 200..600, clearance 10:
;;;   ex0 110  ex1 490  ez0 210  ez1 590  ed 150.  ix0 128, ix1 472.
;;;   bz0 228, bz1 572.  WINDOW (128 228 472 572): no edge reached: ONE piece
;;;   (0 0 600 770) with a THROUGH POCKET on RECESS_WINDOW (D9), 344 x 344 as
;;;   the edge leaves it, CUT 346 x 346 (D23, 28.10.2026: the hand edge, 1 on
;;;   each of its four edges; 344 x 344 until that evening).
;;;
;;; BOARD      PARENT       EXTENDED
;;; BUL, BUR   540 x 770    unchanged (no side reached)
;;; TOP        564 x 540    unchanged (the top not reached)
;;; BOTTOM     564 x 540    unchanged (the floor not reached)
;;; BACK       600 x 770    600 x 770, the pocket x 127..473, z 227..573, 18 deep
;;;                         (D23; x 128..472, z 228..572 until 28.10.2026);
;;;                         every parent socket and row kept (none in the window)
;;;   NO rows round the window (D17: none since 17.10.2026; drilled again from
;;;   18.10 to 19.10.2026: into RETURN-L's end x 119 and RETURN-R's end x 481,
;;;   z 278 400 522; into the FLOOR's front edge z 219 and the LID's z 581,
;;;   x 178 300 422), so the BACK carries the parent's 14 screws (14 dia 3
;;;   holes) and the parent's 20 sockets.
;;; RETURN-L   -            132 x 344, carcass x 110..128, y 558..690, z 228..572
;;; RETURN-R   -            132 x 344, carcass x 472..490
;;; FLOOR      -            380 x 132, carcass x 110..490, y 558..690, z 210..228
;;; LID        -            380 x 132, z 572..590
;;; EXT-BACK   -            380 x 380, carcass x 110..490, y 690..708, z 210..590
;;; SHELF-1    560 x 520    560 x 670 with a bump 340 wide (its underside 385 is
;;;                         in the band 228..572)
;;;   shelf frame: (0 0) (560 0) (560 520) (450 520) (450 670) (110 670)
;;;                (110 520) (0 520)
;;;   CORNER MARKS (D18): corner (110 520): (110 520)-(70 520) and
;;;   (110 520)-(110 560); corner (450 520): (450 520)-(490 520) and
;;;   (450 520)-(450 560); all on CORNER_4MM (the dog bones r 4 at
;;;   (107.1716 522.8284) and (452.8284 522.8284) are gone)
;;;
;;; CASE C (D15, the PROBE of 17.10.2026, no golden): KIT_WARDROBE 1000 wide,
;;; a vertical divider at x 500, the band 300..1000 x floor..top, 150 deep, a
;;; shelf in each bay at the same height. ix0 318. The left bay's shelf, 478
;;; wide from carcass x 20: b0 = 318 + 2 - 20 = 300, b1 = min 478 (982 - 20)
;;; = 478 (was 962): (0 0) (478 0) (478 680) (300 680) (300 530) (0 530), a
;;; bump from 300 to its own end, no slant. The right bay's shelf, 460 wide
;;; from x 520: b0 = max 0 (320 - 520) = 0 (was -200), b1 = 460: a plain
;;; 460 x 680 rectangle, the whole shelf deeper. Before D15 the left shelf
;;; carried the point (960 0) and the right one (-200 0): the owner's
;;; triangles.
;;;
;;; THE ADDED BOARDS' FIXING (CASE B): RETURN-L, RETURN-R, the FLOOR and the
;;; LID state NONE (17.10.2026, D17). Until then:
;;; RETURN-L, RETURN-R                     none of their own (the FLOOR, the
;;;                                        LID, the BACK and the EXT-BACK hold them)
;;; FLOOR (x from left, y from front)      into RETURN-L's end: x 9,   y 50 66 82
;;;                                        into RETURN-R's end: x 371, y 50 66 82
;;; LID                                    the same, into their top ends
;;; The EXT-BACK is DRILLED (D17 AMENDED 18.10.2026), 12 dia 3 holes:
;;; EXT-BACK (x from left, z up)           into RETURN-L: x 9,   z 68 190 312
;;;                                        into RETURN-R: x 371, z 68 190 312
;;;                                        into the FLOOR: x 68 190 312, z 9
;;;                                        into the LID:   x 68 190 312, z 371
;;;
;;; THE NARROWEST BAND (D4, no golden; D17 AMENDED 18.10.2026): the same BUD,
;;; ex0 110, ex1 246, ez0 210, ez1 346, ed 150. The interior 128..228 x
;;; 228..328 is exactly notch.minInterior (100) each way, so every run round
;;; the window and round the band is 100 = 2 x screwFromEnd and carries two
;;; holes at its quarters:
;;; BACK round the window (x, z)           into RETURN-L: x 119, z 253 303
;;;                                        into RETURN-R: x 237, z 253 303
;;;                                        into the FLOOR: x 153 203, z 219
;;;                                        into the LID:   x 153 203, z 337
;;;   so the BACK carries the parent's 14 and the window's 8 (22 dia 3 holes)
;;; EXT-BACK 136 x 136 (x from left, z up) into RETURN-L: x 9,   z 43 93
;;;                                        into RETURN-R: x 127, z 43 93
;;;                                        into the FLOOR: x 43 93, z 9
;;;                                        into the LID:   x 43 93, z 127
;;;   8 dia 3 holes (notch-row-between 0 .. 136 would drill all three of each
;;;   row at x 68, one place)

;;; CASE D (fixtures/golden-notch-and-recess.json; D13, 18.10.2026, CLAUDE.md
;;; T79 F8): CASE A's band and KIT_NOTCH.lsp section I's notch on ONE
;;; carcass. The owner: *"dlaczego cut the corner likwiduje nam wciecie do
;;; recess?"*  The notch BL, nw 200, nd 200, nh 0 (the full height, boxed);
;;; the band ex0 310, ex1 600, ez0 0, ez1 770, ed 150 (CASE A's).
;;;   FOOTPRINTS ON THE BACK: the notch x 0..200, z 0..770; the band x
;;;   310..600, z 0..770. Apart (200 < 310): no refusal; both are cut, the
;;;   notch first (until 18.10.2026 the notch alone, the band refused in words
;;;   no screen showed). With the band from 100 they overlap: the notch stands,
;;;   the band is refused: "The recess cannot be cut: the corner cut stands
;;;   where the recess band is; move one of them."
;;;
;;; BOARD      BOTH CUT
;;; BUL        340 x 770, the notch's alone (KIT_NOTCH.lsp section I)
;;; BUR        690 x 770, the extension's alone (CASE A)
;;; TOP        564 x 690: the bump (CASE A) less the notch's corner
;;; BOTTOM     the same in plan; drawn as CASE A draws it (D19)
;;;   plan frame: (0 0) (564 0) (564 690) (310 690) (310 540) (200 540) (200 340) (0 340)
;;;   CORNER MARKS (D18, D20), plan: (310 580) -> (310 540) -> (270 540)
;;;                                  (200 380) -> (200 340) -> (160 340)
;;;   BOTTOM drawn (x from the bump's back edge, 690 wide): corners (150 310), (350 200)
;;;   TOP drawn from its UNDERSIDE: corners (150 254), (350 364)
;;;   area 0.305 -> 0.30266 m2 (302660 mm2)
;;; BACK       128 x 770, carcass x 200..328: the notch's strip (0..200) and
;;;            the window (328..600) both off it, its own frame from x 200:
;;;            (0 0) (128 0) (128 770) (0 770); area 98560 mm2; no corner, no mark
;;; SHELF-1    560 x 670, both cut, shelf frame (2 clear of each side):
;;;   (0 0) (560 0) (560 670) (310 670) (310 520) (200 520) (200 320) (0 320)
;;;   CORNER MARKS: corners (310 520), (200 320); area 288700 mm2
;;; STEP       218 x 770, carcass x 0..218, y 340..358 (the notch's)
;;; RETURN     182 x 770, carcass x 200..218, y 358..540 (the notch's)
;;; RETURN-L   132 x 770, carcass x 310..328, y 558..690 (the extension's)
;;; EXT-BACK   290 x 770, carcass x 310..600, y 690..708 (the extension's)
;;; FLOOR, LID none: neither the notch (full height) nor the band (floor to
;;;            top) has one; on a notched carcass the extension's would be
;;;            EXT-FLOOR and EXT-LID (recess-box-name)
;;;
;;; WHICH JOINTS MOVE (BOTH CUT against CASE A's EXTENDED column):
;;;
;;; BOARD, EDGE                      EXTENSION ALONE    BOTH CUT
;;; TOP/BOTTOM tabs into BUL (y)     95, 445            95, 245
;;; TOP/BOTTOM tabs into BUR (y)     95, 595            95, 595
;;; TOP/BOTTOM tabs into BACK (x)    95, 215            255
;;; BACK sockets, left edge (z)      95, 385, 675       NONE
;;; BACK top/bottom sockets (x)      113, 233           273
;;; BACK left screw row (z)          50, 240, 530, 720  NONE (the edge is the notch's RETURN: no joint, no row, D10)
;;; BACK top/bottom rows (x)         68, 173, 278       268, 273, 278
;;;   The TOP's tabs into the BACK: one run left between the notch and the
;;;   bump, 200..310 (110: one socket, centred; carcass x 273). The BACK's
;;;   left edge meets the notch's RETURN: no joint and no row (KIT_NOTCH.lsp
;;;   D10; drawn 18.10, withdrawn 19.10.2026). Its right edge is the window's:
;;;   no row either (D17, 19.10.2026). Its top and bottom rows run 218..328
;;;   (the notch and its RETURN, nw + g, off the TOP's back edge):
;;;   notch-screw-row on 110 gives three, the middle one on the socket's
;;;   centre line, as the kit's own row does on a run this short.
;;;
;;; THE BACK'S DIA 3 HOLES, BOTH CUT (carcass x; its own frame from x 200):
;;;   top row                     x 268 273 278, z 761
;;;   bottom row                  x 268 273 278, z 9
;;;   so the BACK carries 6 dia 3 holes (13 from 18.10 to 19.10.2026, with the
;;;   RETURN's column x 209 and the window's column x 319)
;;;
;;; THE REVIEW CASES (the T79 F8 review, 18.10.2026; no golden; carcass x, z
;;; up). Each stood as the PROBE column says until recess-side-row (the box
;;; rows and the window's column of 18.10 are gone since 19.10.2026):
;;;   the band and the notch on one side: BL 200/200/300, the band x 0..400,
;;;     z 300..500 (BUL grows; the window x 0..382, z 318..482): the left
;;;     edge runs 300..318 (no row: 18 is under one hole's offset) and
;;;     482..770 (one tab, 626): the side row x 9: z 532 720
;;;     PROBE: x 9: z 350 720, the 350 in the window
;;;   a short run under a notch from the top: BR 200/200/-60, the band x 0..600,
;;;     z 100..700: BACK-2 is z 682..770 (88), its right edge runs 682..710
;;;     (28, under one hole's offset): no side row there
;;;     PROBE: x 591: z 732 (in the notch) and 660 (under the board)

;;;========================================
;;; F2. NUMBERS - THE END PANEL (D21, fixtures/golden-recess-end-panel.json)
;;;========================================
;;;
;;; The parent of section F with an END panel 25 thick dropped to the floor
;;; (pb 100, ph 870), the wall gap 10 (sb 10), the door gap 3 and the door 25
;;; (sf 28): ew = 10 + 558 + 28 = 596, its box z -10..586 (z 0 the carcass
;;; back face). END-R is drawn as drawBUR, x from the BACK; END-L as drawBUL,
;;; x from the FRONT (KIT_NOTCH.lsp D23).
;;;
;;; THE REACH (recess-end-reach-p, t 25), a BUD at x 900 on its wall, END-R at
;;; 1500..1525: a recess to x 2300 (rx1 1400 >= 625) reaches past it, END-R
;;; grows; a recess to x 1510 (rx1 610 < 625) does not: BUR grows, END-R stays
;;; 596 deep on the wall line.
;;;
;;; CASE D (fixtures/golden-recess-end-panel.json): the recess from carcass x
;;; 300 to the right and past END-R, 150 deep, from 200 to 600 over the carcass
;;; underside, clearance 10: ex0 310 ex1 600 (BUR grows) ez0 210 ez1 590 ed
;;; 150; bz0 228, bz1 572. The FLOOR at z 210..228 and the LID at 572..590 run
;;; to x 600, the EXT-BACK at carcass z -150..-132 too: their ends stand where
;;; END-R stands.
;;;
;;; BOARD      PARENT       EXTENDED
;;; BUR        540 x 770    690 x 770 less 150 x 228 at "x0y0" and 150 x 198 at
;;;                         "x0y1" (the bump over 228..572)
;;; BACK       600 x 770    the BITE (328 228 600 572) at its right edge, CUT
;;;                         (327 227 600 573): 1 more on its three edges, the
;;;                         hand edge (D23, 28.10.2026):
;;;                         (0 0) (600 0) (600 227) (327 227) (327 573)
;;;                         (600 573) (600 770) (0 770)
;;; END-R      596 x 870    746 x 870, its box z -160..586 (the recess's back
;;;                         wall at -10 - 150): the bump over the band's own
;;;                         height, 210 + 100 .. 590 + 100 = 310 .. 690 on the
;;;                         END, so less 150 x 310 at "x0y0" and 150 x 180 at
;;;                         "x0y1" (recess-end-cuts):
;;;                         (150 0) (746 0) (746 870) (150 870) (150 690)
;;;                         (0 690) (0 310) (150 310)
;;;   CORNER MARKS (D18, D20): (150 730) -> (150 690) -> (110 690)
;;;                            (110 310) -> (150 310) -> (150 270)
;;;   area 0.51852 -> 0.57552 m2 (575520 mm2); cut list 746 x 870, edging
;;;   2 x (746 + 870) = 3232 mm, every edge banded as before
;;;
;;; CASE A WITH END-R (the band of section F's case A, floor to ceiling, past
;;; END-R): BUR 690 x 770, a rectangle; END-R 746 x 870, a rectangle, its box
;;; z -160..586: (0 0) (746 0) (746 870) (0 870); area 0.64902 m2.
;;;
;;; THE RECESS STOPS SHORT OF THE END'S OWN EDGES (case A's band, clipped to
;;; the carcass at both ends, but the recess's own bottom 50 over the floor,
;;; rz0 -50, and its head 1000 over it, rz1 900; END-R run up 200 over the
;;; carcass, ph 1070): lo = max(0, -50 + 100) = 50, hi = min(1070, 900 +
;;; 100) = 1000, so less 150 x 50 at "x0y0" and 150 x 70 at "x0y1": 746 x
;;; 1070, its box z -160..586:
;;;            (150 0) (746 0) (746 1070) (150 1070) (150 1000) (0 1000)
;;;            (0 50) (150 50)
;;;   CORNER MARKS: (150 1040) -> (150 1000) -> (110 1000)
;;;                 (110 50) -> (150 50) -> (150 10)
;;;   area 0.78022 m2 (780220 mm2): not one mm of it in the wall under or
;;;   over the recess.
;;;
;;; THE SAME BAND ON THE LEFT (ex0 0, ex1 290, ez0 0, ez1 590, past END-L):
;;; BUL 690 x 770 less 150 x 198 at "x1y1"; END-L 746 x 870 less 150 x 180 at
;;; "x1y1": (0 0) (746 0) (746 690) (596 690) (596 870) (0 870); END-R on the
;;; other hand unchanged.
;;;
;;; WHOLLY INSIDE (D2, recess_mm 150, the carcass 708 deep): END-R 746 x 870,
;;; its box z -10..736: 10 off the recess's back wall like the carcass, its
;;; face on the doors' (708 + 28). Until today: 596 deep at z 0..596.
;;; The recess from 50 over the floor (rz0 -50, the carcass on 100):
;;; (recess-end-cuts 770 0 770 150 "R" 870 100 -50 nil) = (("x0y0" 150 50)),
;;; so END-R 746 x 870 less 150 x 50 at its back bottom corner, on the wall
;;; line under the recess:
;;;            (150 0) (746 0) (746 870) (0 870) (0 50) (150 50)
;;;   CORNER MARK: (110 50) -> (150 50) -> (150 10); area 0.64152 m2
;;;   (641520 mm2)

;;;========================================
;;; G. DRAWING (the command draws what the routines return, nothing more)
;;;========================================

(defun recess-offset-pts (pts dx dy)
  (mapcar '(lambda (p) (list (+ (car p) dx) (+ (cadr p) dy))) pts))

;;; One board: its outline, its CORNER MARKS (D18, 17.10.2026: two open lines
;;; on CORNER_4MM at every re-entrant corner of the outline, KIT_NOTCH's
;;; notch-corner-marks; until that morning `dbs`, the dog-bone circles, were
;;; drawn here on PUZZLE_DOG_BONES; the argument stays, nothing reads it),
;;; and its name.
(defun recess-draw-board (x0 y0 pts dbs label / p)
  (makePolyline (recess-offset-pts pts x0 y0) "OUTLINE")
  (notch-draw-corner-marks x0 y0 (notch-corner-marks pts (recess-p "cnc.cornerMarkLeg")))
  (drawText (list (+ x0 20.0) (+ y0 20.0)) label 20.0 "UNIT_NUMBER"))

(defun recess-draw-marks (x0 y0 pts rad)
  (foreach p pts (drawCircle (list (+ x0 (car p)) (+ y0 (cadr p))) rad "SCREWS_3MM")))

(defun c:RECESS_FULL ( / cw cd ch g ex0 ex1 ez0 ez1 ed r refusal x y sideW tw
                          side tj sj pieces w cut outline dbs bj places ret lid eb)
  (setq cw (getreal "\nCarcass width <600>: "))   (if (null cw) (setq cw 600.0))
  (setq cd (getreal "\nCarcass depth <558>: "))   (if (null cd) (setq cd 558.0))
  (setq ch (getreal "\nCarcass height <770>: "))  (if (null ch) (setq ch 770.0))
  (setq g  (getreal "\nBoard <18>: "))            (if (null g) (setq g 18.0))
  (setq ex0 (getreal "\nBand from, x off the left face (0 = the side grows) <310>: ")) (if (null ex0) (setq ex0 310.0))
  (setq ex1 (getreal "\nBand to, x (the width = the side grows) <600>: "))            (if (null ex1) (setq ex1 600.0))
  (setq ez0 (getreal "\nBand from, z off the underside (0 = the bottom grows) <0>: ")) (if (null ez0) (setq ez0 0.0))
  (setq ez1 (getreal "\nBand to, z (the height = the top grows) <770>: "))            (if (null ez1) (setq ez1 770.0))
  (setq ed (getreal "\nHow far behind the back face <150>: "))                        (if (null ed) (setq ed 150.0))
  (setq r (notch-cutter-radius (recess-p "cnc.toolDiameter")))
  (setq refusal (recess-refusal cw cd ch g ex0 ex1 ez0 ez1 ed nil))
  (if refusal
    (princ (strcat "\n" refusal))
    (progn
      (createViewLayers) (createCNCLayers)
      (setq sideW (- cd g) tw (- cw (* 2.0 g)) x 0.0 y 0.0)
      ;; the grown side(s)
      (foreach side (append (if (recess-left-p ex0) (list nil) nil) (if (recess-right-p ex1 cw) (list T) nil))
        (setq outline (recess-side-outline cd ch g ez0 ez1 ed side)
              dbs (recess-side-dogbones cd ch g ez0 ez1 ed r side)
              sj (recess-side-joints cd ch g ez0 ez1 ed))
        (recess-draw-board x y outline dbs (if side "BUR grown" "BUL grown"))
        (setq x (+ x sideW ed 100.0)))
      ;; the TOP and the BOTTOM
      (if (or (recess-top-p ez1 ch) (recess-floor-p ez0))
        (progn
          (setq outline (notch-rot90-pts (recess-top-outline cw cd g ex0 ex1 ed) (+ sideW ed))
                dbs (mapcar '(lambda (c) (list (- (+ sideW ed) (cadr c)) (car c) (caddr c)))
                            (recess-top-dogbones cw cd g ex0 ex1 ed r))
                tj (recess-top-joints cw cd g ex0 ex1 ed))
          (if (recess-top-p ez1 ch) (progn (recess-draw-board x y outline dbs "TOP grown") (setq x (+ x sideW ed 100.0))))
          (if (recess-floor-p ez0) (progn (recess-draw-board x y outline dbs "BOTTOM grown") (setq x (+ x sideW ed 100.0))))))
      ;; the BACK's pieces
      (setq pieces (recess-back-pieces cw ch g ex0 ex1 ez0 ez1)
            w (recess-window cw ch g ex0 ex1 ez0 ez1))
      (foreach piece pieces
        (setq cut (recess-back-cut piece w))
        ;; D23 (28.10.2026): the cut as the cutter takes it, recess.handEdge
        ;; more of the board on its own edges (the edge is applied by hand)
        (if cut
          (setq cut (recess-hand-cut cut (- (caddr piece) (car piece)) (- (cadddr piece) (cadr piece))
                                     (recess-p "recess.handEdge") nil)))
        (setq outline (recess-back-outline piece cut) dbs (recess-back-dogbones piece cut r))
        (recess-draw-board x y outline dbs (if (equal piece (car pieces)) "BACK" "BACK-2"))
        ;; D9 amended 19.10.2026: a cut-out, CLOCKWISE (x0 y0) (x0 y1) (x1 y1) (x1 y0).
        (if (and cut (= (recess-cut-kind cut (- (caddr piece) (car piece)) (- (cadddr piece) (cadr piece))) "window"))
          (makePolyline (recess-offset-pts (list (list (car cut) (cadr cut)) (list (car cut) (cadddr cut))
                                                 (list (caddr cut) (cadddr cut)) (list (caddr cut) (cadr cut))) x y)
                        "RECESS_WINDOW"))
        (setq bj (recess-back-joints piece w cw ch g ex0 ex1 ez0 ez1
                                     (notch-shift (cadr (assoc "BACK" (recess-top-joints cw cd g ex0 ex1 ed))) g)
                                     (notch-shift (cadr (assoc "BACK" (recess-top-joints cw cd g ex0 ex1 ed))) g)
                                     (cadr (assoc "BACK-TABS" (recess-side-joints cd ch g ez0 ez1 ed)))
                                     (cadr (assoc "BACK-TABS" (recess-side-joints cd ch g ez0 ez1 ed)))
                                     nil))
        (recess-draw-marks x y (cadr (assoc "SCREWS" bj)) 1.5)
        (setq x (+ x (- (caddr piece) (car piece)) 100.0)))
      ;; the added boards, outlines and their stated screws
      (setq places (recess-box-places cw cd ch g ex0 ex1 ez0 ez1 ed))
      (foreach pl places
        (cond ((or (= (car pl) "RETURN-L") (= (car pl) "RETURN-R"))
               (setq ret (recess-return ch g ez0 ez1 ed))
               (recess-draw-board x y (recess-bump-outline (car ret) (cadr ret) 0.0 (car ret) 0.0) nil (car pl))
               (recess-draw-marks x y (recess-return-screws ch g ez0 ez1 ed) 1.5)
               (setq x (+ x (car ret) 100.0)))
              ((or (= (car pl) "FLOOR") (= (car pl) "LID"))
               (setq lid (recess-lid g ex0 ex1 ed))
               (recess-draw-board x y (recess-bump-outline (car lid) (cadr lid) 0.0 (car lid) 0.0) nil (car pl))
               (recess-draw-marks x y (recess-lid-screws g ex0 ex1 ed) 1.5)
               (setq x (+ x (car lid) 100.0)))
              (T
               (setq eb (recess-ext-back ex0 ex1 ez0 ez1))
               (recess-draw-board x y (recess-bump-outline (car eb) (cadr eb) 0.0 (car eb) 0.0) nil "EXT-BACK")
               (recess-draw-marks x y (recess-ext-back-screws cw ch g ex0 ex1 ez0 ez1) 1.5)
               (setq x (+ x (car eb) 100.0)))))
      (princ (strcat "\nRECESS: the band " (rtos ex0 2 0) ".." (rtos ex1 2 0) " x " (rtos ez0 2 0) ".." (rtos ez1 2 0)
                     ", " (rtos ed 2 0) " deeper; " (itoa (length pieces)) " back piece(s), "
                     (itoa (length places)) " board(s) added."))))
  (princ))

;;;========================================
;;; H. WITH A NOTCH (D13, 18.10.2026)
;;;========================================
;;;
;;; The owner: *"dlaczego cut the corner likwiduje nam wciecie do recess?"*
;;; The notch is KIT_NOTCH.lsp's and is cut first, by its own routines; these
;;; are what the extension asks of a carcass the notch has already cut. The
;;; notch is ASKED first too, of the parent kit's own carcass, never of the
;;; grown one (its refusals, D7 and D8, as alone: a grown BUR's frame runs ed
;;; further from its new back edge, and a hinge the notch takes would be read
;;; past it and cut away). Refused, the band is cut alone. Every
;;; routine below CALLS the extension's own (sections B to E) and the notch's
;;; own (notch-top-cut, notch-top-joints, notch-side-fc, notch-side-joints,
;;; notch-shelf-cut, notch-hh, notch-from-top-p); none re-states a law.
;;; Which boards both cut, when the footprints are apart:
;;;   the SIDE only when a BOXED notch is part-height on the side the band
;;;        reaches (their heights apart): recess-notched-side-outline /
;;;        -joints (an unboxed notch is a rebate in the side's face: the side
;;;        is the extension's, the rebate stays the joiner's);
;;;   the TOP and the BOTTOM when the notch cuts it (boxed: the BOTTOM from
;;;        the floor, the TOP from the top, both at full height) and the band
;;;        reaches it: recess-notched-top-outline / -joints;
;;;   the BACK when the notch is at a back corner: recess-notched-back-pieces,
;;;        recess-notched-back-corner, recess-notched-back-outline, and the
;;;        rows by recess-back-joints with its `nb` (no row into the notch's
;;;        box: KIT_NOTCH.lsp D10 since 19.10.2026); the
;;;        sockets on each piece are those of the boards as cut (a side or a
;;;        TOP / BOTTOM the notch cut gives the notch's, one both cut gives
;;;        section H's); an UNBOXED notch's rebate drops the rows it cuts away
;;;        on the piece that holds it (KIT_NOTCH.lsp D7);
;;;   a SHELF the notch cuts and the band reaches: recess-notched-shelf-outline.
;;; Every other board is cut by one of the two alone, exactly as alone. The
;;; NUMBERS of the golden case are CASE D in section F.

;;; THE NOTCH'S FOOTPRINT ON THE BACK: (fx0 fz0 fx1 fz1), carcass x from the
;;; LEFT face, z up. Its WIDTH along the back at its corner's end, its HEIGHT
;;; from the floor, the whole height (h 0), or from the top (h < 0, D21).
(defun recess-notch-footprint (cw ch nw nh corner / hh top)
  (setq hh (notch-hh ch nh) top (notch-from-top-p ch nh))
  (list (if (notch-left-p corner) 0.0 (- cw nw))
        (if top (- ch hh) 0.0)
        (if (notch-left-p corner) nw cw)
        (if top ch hh)))

;;; Does the band overlap that footprint (any area at all)? nil for no notch.
(defun recess-notch-overlap-p (fp ex0 ex1 ez0 ez1)
  (and fp
       (< (car fp) ex1) (> (caddr fp) ex0)
       (< (cadr fp) ez1) (> (cadddr fp) ez0)))

;;; THE STRAIGHT RUNS of an edge lo .. hi less the intervals `cuts` ((a b) ..),
;;; in order along the edge: ((a b) ..). A run of no length is no run. One
;;; law for every edge two cuts share: each run takes its own joints (D7).
(defun recess-runs (lo hi cuts / sorted at out c)
  (setq sorted (mapcar '(lambda (i) (nth i cuts)) (vl-sort-i cuts '(lambda (p q) (< (car p) (car q)))))
        at lo out nil)
  (foreach c sorted
    (if (> (min (car c) hi) (+ at 1e-6)) (setq out (cons (list at (min (car c) hi)) out)))
    (if (> (cadr c) at) (setq at (cadr c))))
  (if (> hi (+ at 1e-6)) (setq out (cons (list at hi) out)))
  (reverse out))

;;; The tabs (sockets) of a list that stand inside a run (a b).
(defun recess-in-run (lst run)
  (vl-remove-if '(lambda (c) (or (<= c (+ (car run) 1e-6)) (>= c (- (cadr run) 1e-6)))) lst))

;;; The notch's height on a piece's side edge, in the piece's frame, as a cut
;;; list for recess-runs: nil unless `onSide` (the notch stands on that edge).
(defun recess-notch-zcut (nb z0 onSide)
  (if (and nb onSide) (list (list (- (cadr nb) z0) (- (cadddr nb) z0))) nil))

;;; The window's height on a piece's side edge, in the piece's frame, as a cut
;;; list for recess-runs: nil unless `onSide` (the band reaches that side, so
;;; the window takes that edge over its height).
(defun recess-window-zcut (window z0 onSide)
  (if onSide (list (list (- (cadr window) z0) (- (cadddr window) z0))) nil))

;;; drawBACK's side row on a piece's side edge, (z ..) in the piece's frame,
;;; between the tabs the edge carries. An edge nothing cuts (no notch on it,
;;; the band not reaching it) is the one run of the whole edge, as it always
;;; was. On the edge the notch cuts (onSide), D13: every edge cut by both takes
;;; its joints run by run on what the two leave of it; on the side the band
;;; reaches (bandSide) the window takes the edge over its height (a BITE, D9),
;;; notch or no notch. So the runs are what the notch AND the window leave of
;;; the edge, and a row stands on its run: a hole drawBACK's spacing puts past
;;; a run's end would be drilled into the notch, into the window or past the
;;; board (none on a run shorter than one hole's offset). The T79 F8 review,
;;; 18.10.2026.
;;; AMENDED 19.10.2026 (chat fix), the owner: *"czasami cnc rysuje items jak
;;; 3 mm drills czy cos takiego czy litery poza elementami, czy mozesz sie
;;; upewnic na milion procent ze wszystkie elementy sa zamkniete?"*  Until
;;; tonight the window's cut was asked only on a notch's edge ((and onSide
;;; bandSide)), so a plain recess to the right edge ran drawBACK's right column
;;; straight through the bite: golden-recess, x 591, z 392.5, a dia 3 hole in
;;; the window. The window's cut is asked wherever the band reaches the side.
(defun recess-side-row (bh z0 tabs nb window onSide bandSide sfe / out cutEdge)
  (setq out nil
        cutEdge (or onSide bandSide))
  (foreach run (recess-runs 0.0 bh (append (recess-notch-zcut nb z0 onSide)
                                           (recess-window-zcut window z0 bandSide)))
    (foreach z (notch-rows-between-tabs (car run) (cadr run) (recess-in-run tabs run) sfe)
      (if (or (not cutEdge) (and (> z (- (car run) 1e-6)) (< z (+ (cadr run) 1e-6))))
        (setq out (cons z out)))))
  (reverse out))

;;; The notch's width on the TOP's (BOTTOM's) back edge, carcass x, as a cut
;;; list: the notch and its RETURN, nw + g from its end; nil unless `edgeP`
;;; (the notch reaches that edge of the BACK).
(defun recess-notch-xcut (nb g cw edgeP)
  (if (and nb edgeP)
    (list (if (<= (car nb) 0.0) (list 0.0 (+ (caddr nb) g)) (list (- (car nb) g) cw)))
    nil))

;;; A CORNER TAKEN OUT of an outline: the anticlockwise outline `pts` of a
;;; w x h board less the rectangle nw x nh at its corner fc (x0y0 x1y0 x1y1
;;; x0y1, the notch's names). The points inside it go, the corner's three
;;; points stand where the first of them stood, the walk starting at the first
;;; point outside it: engine/notch.js cutNotchCorner, the 3-D's half, the same
;;; arithmetic. A bump or a bite elsewhere on the outline is untouched.
(defun recess-cut-corner (pts w h fc nw nh / rx0 rx1 ry0 ry1 inside n k0 k p kept spliced corner)
  (if (not (and (> nw 0.0) (> nh 0.0))) pts
    (progn
      (setq rx0 (if (notch-fc-x0 fc) 0.0 (- w nw)) rx1 (if (notch-fc-x0 fc) nw w)
            ry0 (if (notch-fc-y0 fc) 0.0 (- h nh)) ry1 (if (notch-fc-y0 fc) nh h))
      (setq inside '(lambda (q) (and (>= (car q) (- rx0 1e-6)) (<= (car q) (+ rx1 1e-6))
                                     (>= (cadr q) (- ry0 1e-6)) (<= (cadr q) (+ ry1 1e-6)))))
      (setq n (length pts) k0 nil k 0)
      (while (and (null k0) (< k n))
        (if (not (apply inside (list (nth k pts)))) (setq k0 k))
        (setq k (1+ k)))
      (if (null k0) pts
        (progn
          (setq corner (cond ((= fc "x0y0") (list (list 0.0 nh) (list nw nh) (list nw 0.0)))
                             ((= fc "x1y0") (list (list (- w nw) 0.0) (list (- w nw) nh) (list w nh)))
                             ((= fc "x1y1") (list (list w (- h nh)) (list (- w nw) (- h nh)) (list (- w nw) h)))
                             (T (list (list nw h) (list nw (- h nh)) (list 0.0 (- h nh))))))
          (setq kept nil spliced nil k 0)
          (while (< k n)
            (setq p (nth (rem (+ k0 k) n) pts))
            (if (apply inside (list p))
              (if (not spliced) (setq kept (append kept corner) spliced T))
              (setq kept (append kept (list p))))
            (setq k (1+ k)))
          (if spliced kept pts))))))

;;; -- THE TOP (BOTTOM) both cut, plan frame ----------------------------------

;;; The bump of recess-top-outline with the notch's corner (notch-top-cut)
;;; taken out of it.
(defun recess-notched-top-outline (cw cd g ex0 ex1 ed nw nd corner / cut)
  (setq cut (notch-top-cut cw cd g nw nd corner))
  (if cut
    (recess-cut-corner (recess-top-outline cw cd g ex0 ex1 ed) (nth 3 cut) (nth 4 cut) (car cut) (cadr cut) (caddr cut))
    (recess-top-outline cw cd g ex0 ex1 ed)))

;;; Its joints: the long edge on the notch's side is the notch's (the band never
;;; reaches that side: the footprints would meet), the other the extension's;
;;; the back edge takes a socket plan on every straight run left between the
;;; notch (a back corner: nw from its end) and the bump (b0 .. b1).
(defun recess-notched-top-joints (cw cd g ex0 ex1 ed nw nd corner / e below minEdge tw nj rj b cuts bk)
  (setq e (recess-p "puzzle.tabCentresFromEnd")
        below (recess-p "puzzle.singleSocketBelow")
        minEdge (notch-min-joint-edge (recess-p "puzzle.dogboneHalfHeight") g)
        tw (- cw (* 2.0 g))
        nj (notch-top-joints cw cd g nw nd corner)
        rj (recess-top-joints cw cd g ex0 ex1 ed)
        b (recess-plan-bump cw cd g ex0 ex1 ed))
  (setq cuts (list (list (caddr b) (cadddr b))))
  (if (notch-back-p corner)
    (setq cuts (cons (if (notch-left-p corner) (list 0.0 nw) (list (- tw nw) tw)) cuts)))
  (setq bk nil)
  (foreach run (recess-runs 0.0 tw cuts)
    (setq bk (append bk (recess-run-sockets (- (cadr run) (car run)) (car run) e below minEdge))))
  (list (list "LEFT" (if (notch-left-p corner) (cdr (assoc "LEFT" nj)) (cadr (assoc "LEFT" rj))))
        (list "RIGHT" (if (notch-left-p corner) (cadr (assoc "RIGHT" rj)) (cdr (assoc "RIGHT" nj))))
        (list "BACK" bk)))

;;; -- THE SIDE both cut: BUL's frame, x from the FRONT -------------------------

;;; recess-side-outline less a BOXED notch's corner (notch-side-fc in that
;;; frame, nd x hh, the side's own depth cd - g as the frame's width: the
;;; corner is the old side's, the bump stands past it). Unboxed: the bump alone.
(defun recess-notched-side-outline (cd ch g ez0 ez1 ed nw nd nh corner)
  (if (notch-boxed-p nw g)
    (recess-cut-corner (recess-side-outline cd ch g ez0 ez1 ed nil) (- cd g) ch
                       (notch-side-fc corner nil (notch-from-top-p ch nh)) nd (notch-hh ch nh))
    (recess-side-outline cd ch g ez0 ez1 ed nil)))

;;; Its joints, from the FRONT edge: the top (bottom) edge is the notch's where
;;; the notch moves it, else the extension's (the two never move the same
;;; edge: their heights are apart); the back edge takes a tab plan on every run
;;; left between the notch (a back corner) and the bump (bz0 .. bz1); the pin
;;; columns are the notch's.
(defun recess-notched-side-joints (cd ch g ez0 ez1 ed nw nd nh corner
                                   / e one three minEdge nj rj top topN botN cuts tabs)
  (setq e (recess-p "puzzle.tabCentresFromEnd")
        one (recess-p "puzzle.singleTabAtOrBelow")
        three (recess-p "puzzle.middleTabBelow")
        minEdge (notch-min-joint-edge (recess-p "puzzle.dogboneHalfHeight") g)
        nj (notch-side-joints cd ch g nw nd nh corner)
        rj (recess-side-joints cd ch g ez0 ez1 ed)
        top (notch-from-top-p ch nh)
        topN (and (notch-boxed-p nw g) (or (notch-full-p ch nh) top))
        botN (and (notch-boxed-p nw g) (not top)))
  (setq cuts (list (list (recess-bz0 ez0 g) (recess-bz1 ez1 ch g))))
  (if (and (notch-boxed-p nw g) (notch-back-p corner))
    (setq cuts (cons (if top (list (- ch (notch-hh ch nh)) ch) (list 0.0 (notch-hh ch nh))) cuts)))
  (setq tabs nil)
  (foreach run (recess-runs 0.0 ch cuts)
    (setq tabs (append tabs (recess-run-tabs (- (cadr run) (car run)) (car run) e one three minEdge))))
  (list (list "TOP-SOCKETS"    (if topN (cdr (assoc "TOP-SOCKETS" nj)) (cadr (assoc "TOP-SOCKETS" rj))))
        (list "BOTTOM-SOCKETS" (if botN (cdr (assoc "BOTTOM-SOCKETS" nj)) (cadr (assoc "BOTTOM-SOCKETS" rj))))
        (list "TOP-SCREWS"     (if topN (cdr (assoc "TOP-SCREWS" nj)) (cadr (assoc "TOP-SCREWS" rj))))
        (list "BOTTOM-SCREWS"  (if botN (cdr (assoc "BOTTOM-SCREWS" nj)) (cadr (assoc "BOTTOM-SCREWS" rj))))
        (list "BACK-TABS"      tabs)
        (list "PIN-COLUMNS"    (cdr (assoc "PIN-COLUMNS" nj)))))

;;; -- THE BACK both cut ----------------------------------------------------------

;;; Its PIECES: the extension's (recess-back-pieces); `fp` is the footprint of a
;;; notch at a BACK corner (nil for a front one: it never reaches the BACK). A
;;; FULL-HEIGHT notch takes its strip off every piece it reaches (the piece then
;;; starts, or ends, at the notch's edge) and a piece it takes whole goes. A
;;; part-height notch leaves the pieces whole: it is a corner of the piece that
;;; holds it. With fp nil the pieces are recess-back-pieces' own.
(defun recess-notched-back-pieces (cw ch g ex0 ex1 ez0 ez1 fp / out x0 x1)
  (setq out nil)
  (foreach pc (recess-back-pieces cw ch g ex0 ex1 ez0 ez1)
    (if (and fp (<= (cadr fp) 0.0) (>= (cadddr fp) ch))
      (progn
        (setq x0 (car pc) x1 (caddr pc))
        (if (<= (car fp) 0.0) (setq x0 (max x0 (caddr fp))) (setq x1 (min x1 (car fp))))
        (if (> x1 (+ x0 1e-6)) (setq out (append out (list (list x0 (cadr pc) x1 (cadddr pc)))))))
      (setq out (append out (list pc)))))
  out)

;;; The notch's corner on a piece, in the piece's frame: (fc nw nh) where a
;;; part-height notch's footprint falls in the piece, else nil.
(defun recess-notched-back-corner (piece fp / ix0 iz0 ix1 iz1)
  (if (null fp) nil
    (progn
      (setq ix0 (max (car piece) (car fp)) iz0 (max (cadr piece) (cadr fp))
            ix1 (min (caddr piece) (caddr fp)) iz1 (min (cadddr piece) (cadddr fp)))
      (if (and (> ix1 (+ ix0 1e-6)) (> iz1 (+ iz0 1e-6)))
        (list (strcat (if (<= (car fp) (car piece)) "x0" "x1") (if (<= (cadr fp) (cadr piece)) "y0" "y1"))
              (- ix1 ix0) (- iz1 iz0))
        nil))))

;;; The piece's outline: the extension's (its window, bite or corner) with the
;;; notch's corner `nc` taken out of it.
(defun recess-notched-back-outline (piece cut nc)
  (if nc
    (recess-cut-corner (recess-back-outline piece cut) (- (caddr piece) (car piece)) (- (cadddr piece) (cadr piece))
                       (car nc) (cadr nc) (caddr nc))
    (recess-back-outline piece cut)))

;;; -- A SHELF both cut, its plan frame ---------------------------------------------

;;; recess-shelf-outline less the notch's corner (notch-shelf-cut, with the
;;; shelf's own clearance).
(defun recess-notched-shelf-outline (cw cd g ex0 ex1 ed shelf clr nw nd corner / cut)
  (setq cut (notch-shelf-cut cw cd g nw nd corner clr shelf))
  (if cut
    (recess-cut-corner (recess-shelf-outline cw cd g ex0 ex1 ed shelf clr) (nth 3 cut) (nth 4 cut) (car cut) (cadr cut) (caddr cut))
    (recess-shelf-outline cw cd g ex0 ex1 ed shelf clr)))

;;; -- THE NAMES ---------------------------------------------------------------------

;;; On a notched carcass the extension's FLOOR and LID are EXT-FLOOR and
;;; EXT-LID (the notch's box carries a LID, and from the top a FLOOR, of its
;;; own); elsewhere every name is as it always was.
(defun recess-box-name (name notched)
  (cond ((not notched) name)
        ((= name "FLOOR") "EXT-FLOOR")
        ((= name "LID") "EXT-LID")
        (T name)))

;;;========================================
;;; I. THE DRAWERS IN THE RECESS (D22, D23, D25; 28.10.2026)
;;;========================================
;;;
;;; The owner's evening: a column of drawers between two dividers standing on
;;; the band's edges goes INTO the recess (D22), a cut inside the BACK is cut
;;; one hand edge bigger (D23), and the BACK's holes follow its pieces (D25).
;;; Every routine here asks sections B to E and none of section H: a recess
;;; column is never notched (D22). The column is the kit's own (the engine's
;;; column stack, T32): dl and dr are its two dividers' LEFT faces (carcass x
;;; from the left face), gd their board, capy the underside of the board over
;;; the drawers (carcass z up), capt = capy + g its top, capd its depth.

;;; D22: is this column of drawers a RECESS COLUMN? nil, or the sentence the
;;; Check prints (RECESS_DRAWERS_SHALLOW). A divider stands ON an edge within
;;; half a millimetre (the editor's own step, 0.5: a face typed or snapped there).
(defun recess-col-refusal (cw ch g ex0 ex1 ez0 ez1 dl dr gd capy / minI)
  (setq minI (recess-p "notch.minInterior"))
  (cond ((or (recess-left-p ex0) (recess-right-p ex1 cw))
         "RECESS DRAWERS: the recess reaches a side of the carcass; the drawers keep the carcass's depth.")
        ((not (recess-floor-p ez0))
         "RECESS DRAWERS: the recess does not start on the floor; the drawers keep the carcass's depth.")
        ((or (> (abs (- dl ex0)) 0.5) (> (abs (- (+ dr gd) ex1)) 0.5))
         "RECESS DRAWERS: the dividers do not stand on the recess's edges; the drawers keep the carcass's depth.")
        ((< (- (recess-bz1 ez1 ch g) (+ capy g)) minI)
         "RECESS DRAWERS: the recess ends too close over the board over the drawers; the drawers keep the carcass's depth.")
        (T nil)))

;;; D22: THE WINDOW of a recess column: the band's OUTER faces across (the
;;; dividers and the RETURNs pass through the BACK's plane), bz0 .. bz1 up.
(defun recess-col-window (cw ch g ex0 ex1 ez0 ez1)
  (list ex0 (recess-bz0 ez0 g) ex1 (recess-bz1 ez1 ch g)))

;;; ...and the pieces it leaves (section D's law of the pieces).
(defun recess-col-back-pieces (cw ch g ex0 ex1 ez0 ez1)
  (recess-window-pieces cw ch (recess-col-window cw ch g ex0 ex1 ez0 ez1)))

;;; D22: the BOTTOM's bump between the band's OUTER faces (the dividers stand
;;; on it): (bw bh b0 b1 ext), its plan frame (x from BUL's inner face, y from
;;; the front edge).
(defun recess-col-plan-bump (cw cd g ex0 ex1 ed)
  (list (- cw (* 2.0 g)) (- cd g) (- ex0 g) (- ex1 g) ed))

(defun recess-col-bottom-outline (cw cd g ex0 ex1 ed / b)
  (setq b (recess-col-plan-bump cw cd g ex0 ex1 ed))
  (recess-bump-outline (car b) (cadr b) (caddr b) (cadddr b) (nth 4 b)))

;;; D22: the TOP's and the BOTTOM's joints in a recess column. No side grows,
;;; so the long edges are the parent's; the back edge's two straight runs are
;;; the ones the BACK's pieces leave, 0 .. ex0 - g and ex1 - g .. tw (a
;;; divider's or a RETURN's end stands between them and the bump), each
;;; re-planned on its own (D7: none under the D6 minimum, screwed).
(defun recess-col-top-joints (cw cd g ex0 ex1 / e below inset minEdge sideW tw)
  (setq e       (recess-p "puzzle.tabCentresFromEnd")
        below   (recess-p "puzzle.singleSocketBelow")
        inset   (notch-joint-inset cd e (recess-p "puzzle.singleJointMaxDepth"))
        minEdge (notch-min-joint-edge (recess-p "puzzle.dogboneHalfHeight") g)
        sideW   (- cd g)
        tw      (- cw (* 2.0 g)))
  (list (list "LEFT" (notch-replan-sockets sideW inset below))
        (list "RIGHT" (notch-replan-sockets sideW inset below))
        (list "BACK" (append (recess-run-sockets (- ex0 g) 0.0 e below minEdge)
                             (recess-run-sockets (- tw (- ex1 g)) (- ex1 g) e below minEdge)))))

;;; D22: where the added boards stand in a recess column, carcass frame (x from
;;; the left face, y from the FRONT face, z up): the RETURNs on the board over
;;; the drawers (capt) up to bz1, ed deep, their front ends on the BACK's
;;; inner face (y = cd - g: through its plane); the LID and the EXT-BACK as
;;; ever. The band starts on the floor: no FLOOR.
(defun recess-col-box-places (cw cd ch g ex0 ex1 ez0 ez1 ed capt / bz1 out)
  (setq bz1 (recess-bz1 ez1 ch g)
        out (list (list "RETURN-L" (list ex0 (- cd g) capt (+ ex0 g) (- (+ cd ed) g) bz1))
                  (list "RETURN-R" (list (- ex1 g) (- cd g) capt ex1 (- (+ cd ed) g) bz1))))
  (if (not (recess-top-p ez1 ch))
    (setq out (append out (list (list "LID" (list ex0 cd (- ez1 g) ex1 (- (+ cd ed) g) ez1))))))
  (append out (list (list "EXT-BACK" (list ex0 (- (+ cd ed) g) ez0 ex1 (+ cd ed) ez1)))))

;;; A RETURN of a recess column: ed x (bz1 - capt).
(defun recess-col-return (ch g ez1 ed capt)
  (list ed (- (recess-bz1 ez1 ch g) capt)))

;;; D22: a divider of a recess column, the carcass frame of
;;; recess-col-box-places: x0 its left face, gd its board, `front` its own
;;; setback kept at the front, its back on the EXT-BACK's face, from the
;;; BOTTOM (z = g) to the board over the drawers (capy).
(defun recess-col-divider (x0 gd cd g ed front capy)
  (list x0 front g (+ x0 gd) (- (+ cd ed) g) capy))

;;; D22: the board over the drawers, (bw bh b0 b1 ext) in ITS plan frame (x
;;; from BUL's inner face, y from its front edge): bw x capd, the bump END TO
;;; END between the band's outer faces (a fixed shelf's clr 0, D16), ed deep.
(defun recess-col-cap-bump (cw g ex0 ex1 ed capd)
  (list (- cw (* 2.0 g)) capd (- ex0 g) (- ex1 g) ed))

(defun recess-col-cap-outline (cw g ex0 ex1 ed capd / b)
  (setq b (recess-col-cap-bump cw g ex0 ex1 ed capd))
  (recess-bump-outline (car b) (cadr b) (caddr b) (cadddr b) (nth 4 b)))

;;; D22: the drawers' usable depth in a recess column: the carcass's plus ed
;;; (the kit snaps it to its own ladder, wardrobe.drawers.depthSteps).
(defun recess-col-drawer-depth (usable ed)
  (+ usable ed))

;;; D22: THE SLOTS' FILLERS, the carcass frame of recess-col-box-places:
;;; ((name (x0 y0 z0 x1 y1 z1)) ..), two per slot on the DP's own two lines
;;; (KIT_WARDROBE_FULL: the front one fy back from the face, fy the drawers'
;;; setback plus the filler's offset; the back one on the BACK's inner face),
;;; as wide as the slot, from the BOTTOM (z = g) to the board over the drawers
;;; (capy). A slot of nothing takes none.
(defun recess-col-fillers (cw cd g ex0 ex1 capy fy / out)
  (setq out nil)
  (if (> ex0 g)
    (setq out (list (list "L1" (list g fy g ex0 (+ fy g) capy))
                    (list "L2" (list g (- cd (* 2.0 g)) g ex0 (- cd g) capy)))))
  (if (< ex1 (- cw g))
    (setq out (append out (list (list "R1" (list ex1 fy g (- cw g) (+ fy g) capy))
                                (list "R2" (list ex1 (- cd (* 2.0 g)) g (- cw g) (- cd g) capy))))))
  out)

;;; D22: where a divider stands to be ON the band's nearer edge: its left face
;;; at ex0 (the left edge) or at ex1 - w (the right edge, w its board),
;;; whichever is nearer to where it stands now (x); nil when the band reaches
;;; both sides (no edge inside the carcass). The room's "Align with recess".
(defun recess-col-divider-x (cw ex0 ex1 x w / lft rgt)
  (setq lft (if (recess-left-p ex0) nil ex0)
        rgt (if (recess-right-p ex1 cw) nil (- ex1 w)))
  (cond ((and lft rgt) (if (<= (abs (- lft x)) (abs (- rgt x))) lft rgt))
        (lft lft)
        (rgt rgt)
        (T nil)))

;;; D26: where a PAIR of dividers stands, (lx rx): the left one's left face on
;;; ex0, the right one's on ex1 - w (w the right one's board); nil when the
;;; band reaches a side (no edge inside the carcass there: the pair is not a
;;; recess column's walls, recess-col-divider-x answers each).
(defun recess-col-pair-x (cw ex0 ex1 w)
  (if (or (recess-left-p ex0) (recess-right-p ex1 cw))
    nil
    (list ex0 (- ex1 w))))

;;; D23: THE HAND EDGE. A cut (x0 z0 x1 z1) of a bw x bh piece as the cutter
;;; takes it: each of its edges that is not on the piece's own edge moved he
;;; further into the board; in a recess column (colp) its two edges across
;;; stay, a divider or a RETURN covers them (D22).
(defun recess-hand-cut (cut bw bh he colp / x0 z0 x1 z1)
  (setq x0 (car cut) z0 (cadr cut) x1 (caddr cut) z1 (cadddr cut))
  (list (if (or colp (<= x0 0.0)) x0 (- x0 he))
        (if (<= z0 0.0) z0 (- z0 he))
        (if (or colp (>= x1 bw)) x1 (+ x1 he))
        (if (>= z1 bh) z1 (+ z1 he))))

;;; D25: the piece a hole at (x z) of radius r (the BACK's frame before the
;;; cut: x from the left face, z up) falls on, and its place there:
;;; ("BACK" x' z') or ("BACK-2" x' z') in that piece's own frame; nil where no
;;; piece holds it whole (in the window, or past the board). `cuts` is the
;;; pieces' cuts as the cutter takes them (recess-hand-cut), one per piece,
;;; nil for a whole piece.
(defun recess-piece-at (pieces cuts x z r / i hit px pz bw bh c)
  (setq i 0 hit nil)
  (foreach p pieces
    (if (null hit)
      (progn
        (setq px (- x (car p)) pz (- z (cadr p))
              bw (- (caddr p) (car p)) bh (- (cadddr p) (cadr p))
              c (nth i cuts))
        (if (and (>= (- px r) -1e-6) (<= (+ px r) (+ bw 1e-6))
                 (>= (- pz r) -1e-6) (<= (+ pz r) (+ bh 1e-6))
                 (or (null c)
                     (<= (+ px r) (car c)) (>= (- px r) (caddr c))
                     (<= (+ pz r) (cadr c)) (>= (- pz r) (cadddr c))))
          (setq hit (list (if (= i 0) "BACK" "BACK-2") px pz)))))
    (setq i (1+ i)))
  hit)

;;;========================================
;;; I2. NUMBERS - THE DRAWERS IN THE RECESS (D22 to D25)
;;;========================================
;;;
;;; CASE E (fixtures/golden-recess-drawers.json): KIT_WARDROBE_FULL 1000 wide
;;; (D 568, H 2150, G 18, the doors 25) before the owner's own recess, 800
;;; wide from carcass x 100 to 900, floor to ceiling, 150 deep, clearance 10:
;;;   ex0 110  ex1 890  ez0 0  ez1 2150  ed 150.  ix0 128, ix1 872.
;;;   bz0 0, bz1 2150. The project's setbacks 10 (shelves, dividers and, D24,
;;;   the board over the drawers). Two dividers, VPART-1 at x 110 and VPART-2
;;;   at x 872 (their outer faces on 110 and 890: the band's edges), three
;;;   internal drawers 200 high in the column between them (744 light), the
;;;   column's own board over them at capy 629 (18 + 3 x 200 + 2 x 3 + 5),
;;;   capt 647, capd 540 (568 - 18 - 10).
;;;   (recess-col-refusal 1000 2150 18 110 890 0 2150 110 872 18 629) = nil.
;;;   THE WINDOW (recess-col-window): (110 0 890 2150), the floor and the top
;;;   reached: TWO whole pieces (D8), BACK (0 0 110 2150) and BACK-2
;;;   (890 0 1000 2150), 110 x 2150 each; no hand edge (D23: whole pieces).
;;;   Until tonight: (0 0 128 2150) and (872 0 1000 2150), 128 wide.
;;;
;;; BOARD       UNTIL TONIGHT                   A RECESS COLUMN (D22)
;;; VPART-1     540 x 2114, y 18..2132, the     690 x 611: (110 10 18 128 700
;;;             carcass's depth (x 110..128)    629), through the BACK's plane
;;;                                             to the EXT-BACK, under the board
;;; VPART-2     the same at x 872..890          (872 10 18 890 700 629)
;;; the board   Z2-PART 744 x 540 at y 629,     PARTITION, fixed, 964 x 690 at
;;;  over the   the column's own (x 128..872)   y 629, BUL to BUR; plan frame
;;;  drawers                                    (recess-col-cap-outline 1000 18
;;;                                             110 890 150 540):
;;;                                             (0 0) (964 0) (964 540)
;;;                                             (872 540) (872 690) (92 690)
;;;                                             (92 540) (0 540)
;;;   CORNER MARKS (D18, D20): (912 540) -> (872 540) -> (872 580) and
;;;   (92 580) -> (92 540) -> (52 540); area 0.63756 m2 (637560 mm2)
;;;   The engine draws it in the board's OWN frame (x across from BUL's inner
;;;   face, y from its BACK edge: y' = 690 - y, the walk reversed):
;;;     (0 150) (92 150) (92 0) (872 0) (872 150) (964 150) (964 690) (0 690)
;;;     marks (52 150) -> (92 150) -> (92 110), (872 110) -> (872 150) -> (912 150)
;;; BOTTOM      its bump 110..854 (plan)        its bump 92..872 (plan,
;;;                                             recess-col-bottom-outline):
;;;                                             (0 0) (964 0) (964 550)
;;;                                             (872 550) (872 700) (92 700)
;;;                                             (92 550) (0 550)
;;;   CORNER MARKS: (912 550) -> (872 550) -> (872 590) and
;;;   (92 590) -> (92 550) -> (52 550); area 0.6472 m2 (647200 mm2)
;;; TOP         its bump 110..854               unchanged (the RETURNs beside it)
;;; TOP/BOTTOM  back runs 0..110 and 854..964   back runs 0..92 and 872..964
;;;  back       (one socket each, 55 and 909)   (92 each, under 96: none, D7)
;;; BACK        (0 0 128 2150)                  (0 0 110 2150): the side row
;;;                                             x 9 into BUL as the parent's;
;;;                                             the top and the bottom rows on
;;;                                             the run 18..110 (92, two at the
;;;                                             quarters): x 41 87, z 2141 and 9
;;; BACK-2      (872 0 1000 2150)               (890 0 1000 2150): the side row
;;;                                             x 101 into BUR; the rows x 23 69
;;; RETURN-L    132 x 2150, y 568..700 from     150 x 1503: (110 550 647 128
;;;             the floor                       700 2150), on the board over
;;;                                             the drawers, through the BACK's
;;;                                             plane (recess-col-box-places)
;;; RETURN-R    132 x 2150 at x 872..890        (872 550 647 890 700 2150)
;;; EXT-BACK    780 x 2150, unchanged, its rows recess-ext-back-screws
;;; FILLERS     none                            (recess-col-fillers 1000 568 18
;;;                                             110 890 629 90), fy = 50 + 40:
;;;                                             L1 (18 90 18 110 108 629)
;;;                                             L2 (18 532 18 110 550 629)
;;;                                             R1 (890 90 18 982 108 629)
;;;                                             R2 (890 532 18 982 550 629)
;;;                                             92 x 611 each
;;; DRAWERS     440 deep (usable 455)           590 (recess-col-drawer-depth
;;;                                             455 150 = 605: the ladder's 590)
;;;   IN A PROJECT the room hands ed = the recess's depth less the wall gap
;;;   (150 - 10 = 140) and a wardrobe added in the room is 558 deep: the usable
;;;   445 plus 140 is 585, the ladder's 540 (440 before). The ladder is the
;;;   owner's (a runner every 50, the box 10 less, 20 behind it).
;;;   The runner rows on the dividers are the engine's (T32), each from the
;;;   divider's OWN front edge: the left face drilled as BUL, the right face
;;;   turned over as BUR (KIT_VANITY.lsp D11's law, the chat fix of 28.10).
;;;   A divider beside drawers stands at the face in a project (the column
;;;   guard): flush, it is 568 + 150 - 18 = 700 deep, not 690.
;;; ALIGN WITH RECESS (recess-col-divider-x 1000 110 890 x 18): a divider at
;;;   x 100 goes to 110, one at 880 to 872 (the nearer edge each).
;;;   THE PAIR (D26, recess-col-pair-x 1000 110 890 18) = (110 872): the app's
;;;   two dividers at 491 and 245.5 go to 872 and 110, both at the face. By
;;;   D22's per-divider rule alone the one at 491 went to 110 (a tie, 381
;;;   either way) and stopped at 285.5, on the other's minimum gap.
;;; THE BACK'S HOLES (D25): the board over the drawers' three at z 638:
;;;   x 68 on BACK (x 68), x 500 in the window (none), x 932 on BACK-2 (x 42).
;;;   Until tonight Z2-PART's three, x 178 500 822, all three in the window.
;;;
;;; CASE E2 (no golden): CASE E with the band to ez1 1200: bz1 1182. The BACK
;;; is ONE piece (0 0 1000 2150) with the BITE (110 0 890 1182), CUT
;;; (recess-hand-cut (110 0 890 1182) 1000 2150 1 T) = (110 0 890 1183): the
;;; U, its top edge 1 more (D23), its sides on the dividers and the RETURNs
;;; (no edge there, D22):
;;;            (0 0) (110 0) (110 1183) (890 1183) (890 0) (1000 0)
;;;            (1000 2150) (0 2150)
;;;   CORNER MARKS: (110 1143) -> (110 1183) -> (150 1183) and
;;;                 (850 1183) -> (890 1183) -> (890 1143)
;;;   the bottom row x 41 87 and 913 959 (z 9); the top row the parent's,
;;;   x 68 500 932 (z 2141): the TOP is not reached.
;;;   RETURN-L (110 550 647 128 700 1182), 150 x 535; RETURN-R at 872..890;
;;;   the LID (110 568 1182 890 700 1200), 780 x 132; the TOP the parent's.
;;;
;;; CASE E3, THE OWNER'S U (D23, no golden): the same wardrobe and band to
;;; 1200, NO dividers: the window (128 0 872 1182) is a BITE, cut
;;; (127 0 873 1183): 746 x 1183 as the cutter takes it, 744 x 1182 once the
;;; hand edge is on:
;;;            (0 0) (127 0) (127 1183) (873 1183) (873 0) (1000 0)
;;;            (1000 2150) (0 2150)
;;; A CORNER (D23, KIT_BUD_FULL, the band 310..600 from the floor to 590):
;;; the window (328 0 600 572) at the BACK's bottom-right, cut (327 0 600 573):
;;;            (0 0) (327 0) (327 573) (600 573) (600 770) (0 770)
