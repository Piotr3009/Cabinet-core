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
;;; notch-rows-between-tabs, notch-joint-inset, notch-rect-outline,
;;; notch-dogbone and notch-rot90-pts are KIT_NOTCH's own. All are CALLED.
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
;;; notch's own place; a unit never carries both (D13).
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
;;; that ARE drilled are the BACK's own: G / 2 outside each window edge that
;;; has a board's end or edge behind it (a RETURN's end, the FLOOR's and the
;;; LID's front edges), drawBACK's spacing along that edge.
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
;;; D10 THE SHELVES GROW. DECIDED by the owner ("glebsze"): a shelf whose
;;;     height lies within the band's interior takes the bump; one above or
;;;     below it is the parent's.
;;; D11 THE ADDED BOARDS ARE THE JOINER'S, as the notch box is: outlines only,
;;;     nothing drilled in them. (Screws were STATED on them until 17.10.2026;
;;;     D17: none now, biscuits by hand.)
;;; D12 THE PINS. The back shelf-pin column of a grown side steps back by ed
;;;     over the band (the notch's D7 mirrored: the parent's own columnFromEdge
;;;     from the NEW back edge); above and below the band it stays.
;;; D13 NOT WITH A NOTCH. A carcass notched for a chimney cannot grow into a
;;;     recess as well: the notch stands, the extension is refused in words
;;;     (the cabinet keeps the wall line over the recess). Proposed.
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
(defun recess-back-pieces (cw ch g ex0 ex1 ez0 ez1 / w wx0 wz0 wx1 wz1 L R F U)
  (setq w (recess-window cw ch g ex0 ex1 ez0 ez1)
        wx0 (car w) wz0 (cadr w) wx1 (caddr w) wz1 (cadddr w)
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
;;;        (into a RETURN, the FLOOR, the LID). D17, the owner: *"nie bedziemy
;;;        tam wkrecac wkretow"*: those rows are GONE; the window's edges
;;;        carry no screw. `window` stays an argument for the record.
(defun recess-back-joints (piece window cw ch g ex0 ex1 ez0 ez1 topTabs botTabs bulTabs burTabs
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
  ;; drawBACK's side rows, between the tabs the edge carries
  (if (<= x0 0.0) (foreach z (notch-rows-between-tabs 0.0 bh left sfe) (setq scr (cons (list S z) scr))))
  (if (>= x1 cw) (foreach z (notch-rows-between-tabs 0.0 bh right sfe) (setq scr (cons (list (- bw S) z) scr))))
  ;; drawBACK's top and bottom rows, on the straight runs of the TOP's and the
  ;; BOTTOM's back edge within this piece (a grown board's run ends at the bump)
  (setq runs '(lambda (grown)
                (if grown
                  (append (if (recess-left-p ex0) nil (list (list g ix0)))
                          (if (recess-right-p ex1 cw) nil (list (list ix1 (- cw g)))))
                  (list (list g (- cw g))))))
  (if (>= z1 ch)
    (foreach run (apply runs (list (recess-top-p ez1 ch)))
      (foreach x (recess-run-row (max (car run) x0) (min (cadr run) x1) sfe)
        (setq scr (cons (list (- x x0) (- bh S)) scr)))))
  (if (<= z0 0.0)
    (foreach run (apply runs (list (recess-floor-p ez0)))
      (foreach x (recess-run-row (max (car run) x0) (min (cadr run) x1) sfe)
        (setq scr (cons (list (- x x0) S) scr)))))
  ;; 17.10.2026 (D17): NO hand-fix rows round the window. The RETURNs' ends
  ;; and the FLOOR's and LID's front edges behind the window's four edges get
  ;; no screw through the BACK ("nie bedziemy tam wkrecac wkretow"); the box
  ;; is the joiner's, on biscuits by hand. wx0 wz0 wx1 wz1 bz0 bz1 ix0 ix1 are
  ;; bound above for the record of what the rows were measured from.
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

;;; Its screws: NONE (17.10.2026, D17). It was a column into each vertical
;;; board's back end over bz0 .. bz1 at x = S and w - S, and drawBACK's row
;;; into each horizontal board's back edge at z = S and h - S. The owner:
;;; *"system wkrety dookola plecow w tym przypadku nie zadziala"*. Biscuits
;;; by hand, a Lamello one day, nothing drawn now.
(defun recess-ext-back-screws (cw ch g ex0 ex1 ez0 ez1)
  nil)

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

;;;========================================
;;; E. THE REFUSALS (the room refuses first; nothing is clipped silently)
;;;========================================

(defun recess-refusal (cw cd ch g ex0 ex1 ez0 ez1 ed notched / minEdge)
  (setq minEdge (notch-min-joint-edge (recess-p "puzzle.dogboneHalfHeight") g))
  (cond (notched
         "RECESS: a carcass notched round an obstacle cannot grow into a recess as well; the notch stands.")
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
;;;   = (150 254) on the TOP; two open lines on CORNER_4MM, 40 long, each
;;;   along one of the two outline edges that meet there:
;;;     plan   (310 540)-(270 540) and (310 540)-(310 580)
;;;     BOTTOM (150 310)-(110 310) and (150 310)-(150 270)
;;;     TOP    (150 254)-(110 254) and (150 254)-(150 294)
;;;   area 0.305 -> 0.343 m2 (342660 mm2)
;;; BACK       600 x 770    328 x 770, carcass x 0..328
;;;   (0 0) (328 0) (328 770) (0 770); no dog bone
;;; RETURN-L   -            132 x 770, carcass x 310..328, y 558..690, z 0..770
;;; EXT-BACK   -            290 x 770, carcass x 310..600, y 690..708, z 0..770
;;; FLOOR, LID -            none (the band reaches the floor and the top)
;;; SHELF-1    560 x 520    560 x 670 less 310 x 150 at the rear-left
;;;   shelf frame (x from its left edge, 2 clear of the RETURN as of BUL):
;;;     (0 0) (560 0) (560 670) (310 670) (310 520) (0 520)
;;;   CORNER MARK (D18): corner (310 520); (310 520)-(270 520) and
;;;   (310 520)-(310 560) on CORNER_4MM (was a dog bone at (307.1716 522.8284))
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
;;; BACK right screw row             50, 240, 530, 720  NONE (17.10.2026, D17;
;;;                                                     until then x 319,
;;;                                                     z 50 385 720 into the
;;;                                                     RETURN's end)
;;; BACK top/bottom rows (x)         68, 300, 532       68, 173, 278 (the run 18..328)
;;;
;;; THE ADDED BOARDS' FIXING: NONE STATED (17.10.2026, D17: biscuits by hand,
;;; a Lamello one day, nothing drawn). Until that morning the file stated:
;;; RETURN-L (x from its front end, z up)  into BOTTOM's bump edge: x 50 66 82, z 9
;;;                                        into TOP's bump edge:    x 50 66 82, z 761
;;; EXT-BACK (x from its left end, z up)   into RETURN-L's end: x 9,   z 50 385 720
;;;                                        into BUR's bump end: x 281, z 50 385 720
;;;                                        into BOTTOM's bump:  x 68 145 222, z 9
;;;                                        into TOP's bump:     x 68 145 222, z 761
;;;
;;; CASE B (fixtures/golden-recess-band.json): a recess 150 deep in the middle
;;; of the cabinet, carcass x 100..500 and z 200..600, clearance 10:
;;;   ex0 110  ex1 490  ez0 210  ez1 590  ed 150.  ix0 128, ix1 472.
;;;   bz0 228, bz1 572.  WINDOW (128 228 472 572): no edge reached: ONE piece
;;;   (0 0 600 770) with a THROUGH POCKET 344 x 344 on RECESS_WINDOW (D9).
;;;
;;; BOARD      PARENT       EXTENDED
;;; BUL, BUR   540 x 770    unchanged (no side reached)
;;; TOP        564 x 540    unchanged (the top not reached)
;;; BOTTOM     564 x 540    unchanged (the floor not reached)
;;; BACK       600 x 770    600 x 770, the pocket x 128..472, z 228..572, 18 deep;
;;;                         every parent socket and row kept (none in the window)
;;;   NO hand-fix rows round the window (17.10.2026, D17). Until that morning
;;;   they were DRILLED, S = 9 outside each edge:
;;;     into RETURN-L's end  x 119, z 278 400 522
;;;     into RETURN-R's end  x 481, z 278 400 522
;;;     into the FLOOR's front edge  x 178 300 422, z 219
;;;     into the LID's front edge    x 178 300 422, z 581
;;;   so the BACK keeps exactly the parent's 14 screws and 20 sockets.
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
;;; THE ADDED BOARDS' FIXING: NONE STATED (17.10.2026, D17). Until then:
;;; RETURN-L, RETURN-R                     none of their own (the FLOOR, the
;;;                                        LID, the BACK and the EXT-BACK hold them)
;;; FLOOR (x from left, y from front)      into RETURN-L's end: x 9,   y 50 66 82
;;;                                        into RETURN-R's end: x 371, y 50 66 82
;;; LID                                    the same, into their top ends
;;; EXT-BACK (x from left, z up)           into RETURN-L: x 9,   z 68 190 312
;;;                                        into RETURN-R: x 371, z 68 190 312
;;;                                        into the FLOOR: x 68 190 312, z 9
;;;                                        into the LID:   x 68 190 312, z 371

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
        (setq outline (recess-back-outline piece cut) dbs (recess-back-dogbones piece cut r))
        (recess-draw-board x y outline dbs (if (equal piece (car pieces)) "BACK" "BACK-2"))
        (if (and cut (= (recess-cut-kind cut (- (caddr piece) (car piece)) (- (cadddr piece) (cadr piece))) "window"))
          (makePolyline (recess-offset-pts (list (list (car cut) (cadr cut)) (list (caddr cut) (cadr cut))
                                                 (list (caddr cut) (cadddr cut)) (list (car cut) (cadddr cut))) x y)
                        "RECESS_WINDOW"))
        (setq bj (recess-back-joints piece w cw ch g ex0 ex1 ez0 ez1
                                     (notch-shift (cadr (assoc "BACK" (recess-top-joints cw cd g ex0 ex1 ed))) g)
                                     (notch-shift (cadr (assoc "BACK" (recess-top-joints cw cd g ex0 ex1 ed))) g)
                                     (cadr (assoc "BACK-TABS" (recess-side-joints cd ch g ez0 ez1 ed)))
                                     (cadr (assoc "BACK-TABS" (recess-side-joints cd ch g ez0 ez1 ed)))))
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
