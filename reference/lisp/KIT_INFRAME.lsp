;;; Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
;;; Proprietary and confidential. Unauthorised copying, modification,
;;; distribution or use, including by automated tools and AI systems,
;;; is strictly prohibited without prior written permission.
;;;========================================
;;; KIT_INFRAME.lsp
;;; THE BRITISH FRAME, ONE BOARD PER RUN - a MODIFIER on the run of base or
;;; wall units: one routed MDF frame on the carcass faces, the openings cut
;;; through, the fronts SET IN the openings
;;; Command: INFRAME_FULL
;;; Turn 80 (22.10.2026), the owner's numbers of 21.10.2026 - LISP FIRST
;;; ("lisp najpierw")
;;; Derived from: the window mechanism of T25 F1.2 (a cut-out lies wholly
;;;               inside its board and is traced CLOCKWISE), the run of the
;;;               plinth (engine/runs.js buildRuns, one grouping), the lay-on
;;;               front layout of KIT_BUD_FULL / KIT_BUDR_FULL / KIT_WUD_FULL
;;; Requires: SKYLON_COMMON.lsp loaded first (the command draws with
;;;           makePolyline and drawText; the routines need nothing)
;;;========================================
;;;
;;; THE OWNER, 21.10.2026:
;;;
;;;   20:24  "a co z british style kitchen z ramkami?"
;;;   20:31  "4 - cnc blum in frame, 6 - mockup pls"
;;;   22:03  "raczej plyta, malo kiedy bedzie jeden ciag dluzszy jak 2800, a
;;;           jak bedzie to bedziemy laczyc."
;;;   22:03  "najlepiej jakbysmy zrobili wszedzie ramke 38 mm, wtedy bedziemy
;;;           mogli szafki do siebie polaczyc i wtedy bedzie super; 1 mm bedzie
;;;           w srodku wystawac, bedzie jeszcze lepiej 1 mm, bo veneer ma 19 mm
;;;           x 2 bedzie idealnie."
;;;   22:03  "ramka 25, drzwi 22 i jest idealnie, 3 mm gap pomiedzy carcasem a
;;;           drzwiami."
;;;   22:03  "jak podwojne drzwi to miedzy drzwiami nie ma ramki, tylko miedzy
;;;           szafkami."
;;;   22:03  "3 mm zawsze."
;;;   22:03  "zawias na boku szafki (specjalne zawiasy z Bluma)."
;;;   22:14  "jezeli chodzi o dol to zdecydowanie wariant C"
;;;   22:14  "jezeli chodzi o gore to ma isc nad szafke tak samo jak dol, a
;;;           pozniej ktos stolarz wypelni ta dziure i blat pojdzie na
;;;           wierzch, taka jest idea"
;;;   22:40  "1 tak", "2 na styk", "3 per projekt", "5 tak", "6 informacja i
;;;           na pdf na przekroju pokaz kawalek timber", "7 tak", "9 tak"
;;;
;;; UNTIL THIS FILE every front of every kit was LAID ON: the door covers the
;;; carcass, its hinge is counted from the side's edge and its gap is the
;;; profile's. In-frame is a different family. A FRAME is a visible piece of
;;; furniture standing on the carcass faces of a whole run, cut from ONE MDF
;;; board on the CNC with the openings routed through (never a frame glued
;;; from strips), and the fronts sit IN its openings, their faces flush with
;;; its face.
;;;
;;; This is a NEW FILE. It touches no other kit. The six fossil kits and
;;; SKYLON_COMMON are untouched; a bare kit (no in-frame) cuts what it cut.
;;;
;;;========================================
;;; 1. THE LAW IN ONE PARAGRAPH
;;;========================================
;;;
;;; A RUN of butted cabinets (0 mm between them) gets ONE FRAME, 25 thick, on
;;; their carcass faces. Every stile and every rail is 38 wide ("wszedzie
;;; ramke 38"). Between two cabinets the stile is lip + t + t + lip = 38, so
;;; the LIP is what 38 leaves after two sides: lip = (38 - t - t) / 2, 1 mm
;;; for 18 boards, 0 for 19 ("veneer ma 19 mm x 2 bedzie idealnie"), never
;;; negative. The frame's opening is the carcass's clear opening less the lip
;;; on every side. The rails stand 38 - t - lip = 19 OUTSIDE the carcass, under
;;; its bottom ("wariant C") and over its top ("tak samo jak dol"); the joiner
;;; fills the 19 over the carcass on site and the worktop sits on the frame.
;;; A front is set IN its opening: 3 to the frame on a side that meets the
;;; frame, 3 to its neighbour ("3 mm zawsze"), 22 thick in the 25 frame, its
;;; face flush with the frame's face, 3 of air behind it. A pair of doors has
;;; no stile between the leaves and a drawer stack no rail between its fronts
;;; ("miedzy drzwiami nie ma ramki, tylko miedzy szafkami"). A frame wider
;;; than the board (2800) is cut at the centre line of a stile between two
;;; cabinets ("bedziemy laczyc").
;;;
;;;========================================
;;; 2. DECISIONS TAKEN FOR THE OWNER (each one line to veto)
;;;========================================
;;;
;;; D1  38 EVERYWHERE (CONFIRMED 22:03, 22:40 "1 tak"). Every stile and every
;;;     rail of the frame is inframeStile / inframeRail, nothing narrower,
;;;     nothing wider. The numbers live in the profile (profile.inframe), never
;;;     in the UI.
;;; D2  THE LIP FOLLOWS FROM 38 (CONFIRMED). lip = (38 - t - t) / 2: 1 for 18,
;;;     0 for 19. A board over 19 gives a negative lip: inframe-lip-ok-p says
;;;     no and the engine shows a red Check, it never widens the stile.
;;; D3  19 OUTSIDE (CONFIRMED 22:14 "wariant C", "tak samo jak dol"). The top
;;;     rail stands 38 - t - lip = 19 above the carcass top, the bottom rail
;;;     hangs 19 under the carcass bottom. Nothing of the cabinet moves to meet
;;;     it.
;;; D4  ONE BOARD PER RUN (CONFIRMED 22:03 "raczej plyta"). The frame runs
;;;     from the run's first outer edge to its last; a run is what the plinth
;;;     already calls a run (one grouping, never a second).
;;; D5  BUTTED (CONFIRMED 22:03). Two cabinets of a run stand 0 apart. Where
;;;     the room places them apart, the frame reads the REAL x of each and the
;;;     stile between them grows by the gap: lip + t + gap + t + lip (the gap
;;;     term is T80's, PROPOSED); the engine says so in a yellow Check.
;;; D6  THE END OF A RUN AT AN END PANEL (22:40 "2 na styk"; the overhang is
;;;     T80's PROPOSED reading). The panel stays butted to the side. The outer
;;;     stile is 38 too, from the opening's edge: it covers lip + t + panel
;;;     and runs past the panel's outer face by what 38 leaves (1 for 18 + 18,
;;;     0 for 19 + 19). The frame's edge is therefore 38 - t - lip = 19 past
;;;     the carcass's outer face whatever the panel; a panel thicker than that
;;;     leaves its edge proud of the frame by the difference.
;;; D7  THE END OF A RUN WITH NO PANEL (PROPOSED). The frame runs `lip` past
;;;     the carcass's outer face (the mockup's 1 mm, the walk's 602 for a WUD
;;;     600): the outer stile is lip + t + lip, 20 for 18 boards, 19 for 19.
;;; D8  THE END OF A FRAME AT A UNIT THE FRAME STOPS AT (PROPOSED). The frame
;;;     ends flush with the carcass's outer face: the stile is lip + t = 19, the
;;;     half a neighbour would complete; the engine names the split in a yellow
;;;     Check. Units with no frame this turn: appliance housings, every corner
;;;     kit, blind kits, hoods, tops, desks, free panels, islands.
;;; D9  THE JOIN (22:03 "bedziemy laczyc"; the choice among equal joins is
;;;     T80's, PROPOSED). Cut only at the centre line of a stile between two
;;;     cabinets; the FEWEST pieces with every piece within the board; among
;;;     those, the one whose longest piece is shortest; among those, the first
;;;     from the left. A square butt, no joint hardware this turn; the pieces
;;;     are FRAME-1 .. FRAME-n, one piece is FRAME. Where no stile is in reach
;;;     the frame cannot be joined: inframe-join answers nil and the engine
;;;     keeps one piece and says so.
;;; D10 THE OPENING IS A CUT-OUT (20:31 "cnc"). Each opening lies wholly
;;;     inside the board and is traced CLOCKWISE (T25 F1.2): the order the
;;;     DXF writer gives a pocket flagged cutout, (x0 y1) (x1 y1) (x1 y0)
;;;     (x0 y0), so the LISP and the file agree point for point.
;;; D11 THE INSET FRONT KEEPS ITS LAY-ON CELL (22:40 "1 tak"). Each front's
;;;     cell is the lay-on front the kit already cuts, mapped into the
;;;     opening: its outer edges become the opening's edges, the midline
;;;     between two neighbours stays the midline. The front is the cell less
;;;     3 on a side that meets the frame and less 1.5 on a side that meets
;;;     another front. Half a millimetre is kept, never rounded (376.5).
;;; D12 22 IN 25 (CONFIRMED "ramka 25, drzwi 22"). The front is inframeFrontT
;;;     thick, its face on the frame's face (carcass front + 25), its back 3 in
;;;     front of the carcass. A project whose fronts are not 22 is refused in
;;;     a red Check, never silently thickened.
;;; D13 THE HINGE ON THE SIDE (22:03 "zawias na boku szafki"; 22:40 "5 tak").
;;;     A Blum in-frame hinge, its plate on the carcass side; the plate column
;;;     stands frontT + inset - (frameT - frontT) back from the carcass front,
;;;     the inset rule's number read from the hinge reference file
;;;     (reference/hardware/blum-inframe-hinge.json, PROPOSED): 20.5 for a 22
;;;     door. The cup's edge must keep `gap` from the lip (a red Check).
;;; D14 THE END PANEL REACHES THE FRAME (22:40 "2 na styk"). Under in-frame an
;;;     end panel is as deep as the carcass plus the frame (to the frame's
;;;     face) and runs 19 above the carcass top (a wall unit's also 19 below
;;;     its bottom); the site trim of 19.10 is added after, as today.
;;; D15 THE WORKTOP SITS ON THE FRAME; THE FILLER IS A NOTE (22:14, 22:40 "6
;;;     informacja i na pdf na przekroju pokaz kawalek timber"). The worktop
;;;     of a base run stands 19 higher; the 19 over the carcass is the
;;;     joiner's filler: a NOTE on the run and timber on the section drawing,
;;;     never a board in the cut list.
;;;
;;;========================================
;;; 3. CONSTANTS (the owner's numbers; profile.inframe mirrors them)
;;;========================================

(defun inframeStile ( / ) 38.0)
(defun inframeRail ( / ) 38.0)
(defun inframeFrameT ( / ) 25.0)
(defun inframeFrontT ( / ) 22.0)
(defun inframeGap ( / ) 3.0)
(defun inframeOutside ( / ) 19.0)
(defun inframeBoardMax ( / ) 2800.0)

;;;========================================
;;; 4. ROUTINES
;;;========================================
;;;
;;; A CABINET of a run is (x0 w h y0 bt): its left side's outer face along
;;; the wall, its width, its carcass height, its carcass bottom above the
;;; floor, its board (side) thickness. A RECTANGLE is (x0 y0 x1 y1). An END
;;; of a run is (kind panel): kind "PANEL" with the panel's thickness, "OPEN"
;;; (nothing there) or "SPLIT" (a unit the frame stops at).

(defun inframe-cab (x0 w h y0 bt) (list x0 w h y0 bt))
(defun inframe-cab-x0 (c) (nth 0 c))
(defun inframe-cab-w (c) (nth 1 c))
(defun inframe-cab-h (c) (nth 2 c))
(defun inframe-cab-y0 (c) (nth 3 c))
(defun inframe-cab-bt (c) (nth 4 c))
(defun inframe-cab-x1 (c) (+ (inframe-cab-x0 c) (inframe-cab-w c)))

;;; ---- (a) THE FRAME OF A RUN ----

;;; The lip: what 38 leaves after two sides, shared by them (D2).
(defun inframe-lip (bt)
  (/ (- (inframeStile) bt bt) 2.0))

;;; A board the lip cannot take: over 19 the lip goes negative (D2).
(defun inframe-lip-ok-p (bt)
  (>= (inframe-lip bt) 0.0))

;;; How far a rail stands outside the carcass, top and bottom (D3): 19.
(defun inframe-outside (bt)
  (- (inframeRail) bt (inframe-lip bt)))

;;; The opening of one cabinet in its OWN frame (x from its left side's outer
;;; face, y from its bottom's underside): the clear opening less the lip.
(defun inframe-opening (c / bt lip)
  (setq bt (inframe-cab-bt c)
        lip (inframe-lip bt))
  (list (+ bt lip) (+ bt lip)
        (- (inframe-cab-w c) bt lip) (- (inframe-cab-h c) bt lip)))

;;; How far the frame runs past the carcass's outer face at an end (D6 D7 D8).
(defun inframe-end-reach (end bt / kind)
  (setq kind (car end))
  (cond ((= kind "PANEL") (- (inframeStile) bt (inframe-lip bt)))
        ((= kind "OPEN") (inframe-lip bt))
        (T 0.0)))

;;; How far the frame runs past an END PANEL's outer face (D6): may be
;;; negative, the panel's edge then proud of the frame.
(defun inframe-end-overhang (end bt)
  (- (inframe-end-reach end bt) (cadr end)))

;;; One opening in the FRAME's coordinates (origin at its bottom-left corner).
(defun inframe-opening-in (c fx0 fy0 / o)
  (setq o (inframe-opening c))
  (list (- (+ (inframe-cab-x0 c) (nth 0 o)) fx0)
        (- (+ (inframe-cab-y0 c) (nth 1 o)) fy0)
        (- (+ (inframe-cab-x0 c) (nth 2 o)) fx0)
        (- (+ (inframe-cab-y0 c) (nth 3 o)) fy0)))

;;; THE FRAME: (fx0 fy0 width height openings), fx0 fy0 along the wall and
;;; above the floor, the openings one per cabinet in the frame's coordinates.
(defun inframe-frame (cabs leftEnd rightEnd / ca cz fx0 fx1 fy0 fy1 lo hi ops)
  (setq ca (car cabs)
        cz (last cabs)
        fx0 (- (inframe-cab-x0 ca) (inframe-end-reach leftEnd (inframe-cab-bt ca)))
        fx1 (+ (inframe-cab-x1 cz) (inframe-end-reach rightEnd (inframe-cab-bt cz)))
        fy0 nil
        fy1 nil
        ops nil)
  (foreach c cabs
    (setq lo (- (inframe-cab-y0 c) (inframe-outside (inframe-cab-bt c)))
          hi (+ (inframe-cab-y0 c) (inframe-cab-h c) (inframe-outside (inframe-cab-bt c))))
    (if (or (null fy0) (< lo fy0)) (setq fy0 lo))
    (if (or (null fy1) (> hi fy1)) (setq fy1 hi)))
  (foreach c cabs
    (setq ops (cons (inframe-opening-in c fx0 fy0) ops)))
  (list fx0 fy0 (- fx1 fx0) (- fy1 fy0) (reverse ops)))

;;; The stiles of a frame, left to right: the outer one, one between each two
;;; cabinets, the outer one (D1 D5 D6 D7 D8).
(defun inframe-stiles (frame / prev out)
  (setq prev 0.0
        out nil)
  (foreach o (nth 4 frame)
    (setq out (cons (- (nth 0 o) prev) out)
          prev (nth 2 o)))
  (reverse (cons (- (nth 2 frame) prev) out)))

;;; The rails of one opening: (bottom top), 38 and 38 (D1 D3).
(defun inframe-rails (frame o)
  (list (nth 1 o) (- (nth 3 frame) (nth 3 o))))

;;; The gaps between neighbours of a run (D5): 0 when butted.
(defun inframe-gaps (cabs / prev out)
  (setq prev nil
        out nil)
  (foreach c cabs
    (if prev (setq out (cons (- (inframe-cab-x0 c) (inframe-cab-x1 prev)) out)))
    (setq prev c))
  (reverse out))

;;; An opening as the CUT-OUT the DXF writes (D10): clockwise, in the
;;; writer's own order.
(defun inframe-cutout (o)
  (list (list (nth 0 o) (nth 3 o)) (list (nth 2 o) (nth 3 o))
        (list (nth 2 o) (nth 1 o)) (list (nth 0 o) (nth 1 o))))

;;; ---- (b) THE JOIN ----

;;; Where the frame may be cut: the centre line of every stile between two
;;; cabinets, in the frame's x (D9).
(defun inframe-join-candidates (frame / prev out)
  (setq prev nil
        out nil)
  (foreach o (nth 4 frame)
    (if prev (setq out (cons (/ (+ (nth 2 prev) (nth 0 o)) 2.0) out)))
    (setq prev o))
  (reverse out))

;;; The best join of the stretch from `from` to `w`: (pieces longest cuts),
;;; or nil when no stile is in reach (D9).
(defun inframe-join-from (from w cands lmax / best sub try)
  (if (<= (- w from) lmax)
    (list 1 (- w from) nil)
    (progn
      (setq best nil)
      (foreach c cands
        (if (and (> c from) (<= (- c from) lmax))
          (progn
            (setq sub (inframe-join-from c w cands lmax))
            (if sub
              (progn
                (setq try (list (1+ (car sub)) (max (- c from) (cadr sub)) (cons c (caddr sub))))
                (if (or (null best)
                        (< (car try) (car best))
                        (and (= (car try) (car best)) (< (cadr try) (cadr best))))
                  (setq best try)))))))
      best)))

;;; The join of a whole frame against the board (D9).
(defun inframe-join (frame lmax)
  (inframe-join-from 0.0 (nth 2 frame) (inframe-join-candidates frame) lmax))

;;; The pieces of a frame `w` wide cut at `cuts`: ((from to) ...).
(defun inframe-pieces (w cuts / prev out)
  (setq prev 0.0
        out nil)
  (foreach c cuts
    (setq out (cons (list prev c) out)
          prev c))
  (reverse (cons (list prev w) out)))

;;; The labels of n pieces: FRAME, or FRAME-1 .. FRAME-n (D9).
(defun inframe-piece-names (n / i out)
  (if (= n 1)
    (list "FRAME")
    (progn
      (setq i n
            out nil)
      (while (> i 0)
        (setq out (cons (strcat "FRAME-" (itoa i)) out)
              i (1- i)))
      out)))

;;; ---- (c) THE FRONTS INSET ----

;;; Two spans overlap (more than a touch).
(defun inframe-overlap-p (a0 a1 b0 b1)
  (and (> a1 (+ b0 0.000001)) (< a0 (- b1 0.000001))))

;;; One front `f` (its lay-on rectangle) of `fronts`, set in the opening `o`
;;; (both in the cabinet's own frame) with the gap `g` (D11).
(defun inframe-front (f fronts o g / half x0 y0 x1 y1)
  (setq half (/ g 2.0)
        x0 (+ (nth 0 o) g)
        y0 (+ (nth 1 o) g)
        x1 (- (nth 2 o) g)
        y1 (- (nth 3 o) g))
  (foreach n fronts
    (if (not (equal n f))
      (progn
        (if (and (<= (nth 2 n) (+ (nth 0 f) 0.000001)) (inframe-overlap-p (nth 1 n) (nth 3 n) (nth 1 f) (nth 3 f)))
          (setq x0 (max x0 (+ (/ (+ (nth 2 n) (nth 0 f)) 2.0) half))))
        (if (and (>= (nth 0 n) (- (nth 2 f) 0.000001)) (inframe-overlap-p (nth 1 n) (nth 3 n) (nth 1 f) (nth 3 f)))
          (setq x1 (min x1 (- (/ (+ (nth 0 n) (nth 2 f)) 2.0) half))))
        (if (and (<= (nth 3 n) (+ (nth 1 f) 0.000001)) (inframe-overlap-p (nth 0 n) (nth 2 n) (nth 0 f) (nth 2 f)))
          (setq y0 (max y0 (+ (/ (+ (nth 3 n) (nth 1 f)) 2.0) half))))
        (if (and (>= (nth 1 n) (- (nth 3 f) 0.000001)) (inframe-overlap-p (nth 0 n) (nth 2 n) (nth 0 f) (nth 2 f)))
          (setq y1 (min y1 (- (/ (+ (nth 1 n) (nth 3 f)) 2.0) half)))))))
  (list x0 y0 x1 y1))

;;; Every front of a cabinet, inset (D11).
(defun inframe-fronts (o fronts g / out)
  (setq out nil)
  (foreach f fronts
    (setq out (cons (inframe-front f fronts o g) out)))
  (reverse out))

;;; A rectangle's (w h).
(defun inframe-size (r)
  (list (- (nth 2 r) (nth 0 r)) (- (nth 3 r) (nth 1 r))))

;;; The inset front's planes, from the carcass front (D12): (back face).
(defun inframe-front-planes (frameT frontT)
  (list (- frameT frontT) frameT))

;;; ---- (d) THE HINGE ON THE SIDE ----

;;; The plate column's set-back from the carcass front (D13): the inset rule
;;; frontT + inset, less what the door stands forward of the carcass.
(defun inframe-plate-setback (frontT inset frameT)
  (- (+ frontT inset) (- frameT frontT)))

;;; The cup keeps 3 from the lip (D13): K is the cup's boring distance (the
;;; door's hinge edge to the cup's edge), the door edge stands `g` off the
;;; lip, so the cup's edge stands K + g off it, never under 3 ("3 zawsze").
(defun inframe-cup-clear-p (k g)
  (>= (+ k g) (inframeGap)))

;;; ---- (e) THE END PANEL, THE WORKTOP, THE FILLER ----

;;; An end panel's depth under in-frame (D14): the carcass's plus the frame.
(defun inframe-end-panel-depth (d)
  (+ d (inframeFrameT)))

;;; How much an end panel grows (D14): (top bottom), a wall unit's both ends.
(defun inframe-end-panel-grow (bt wallUnit)
  (if wallUnit
    (list (inframe-outside bt) (inframe-outside bt))
    (list (inframe-outside bt) 0.0)))

;;; The worktop's lift on a base run (D15).
(defun inframe-worktop-lift (bt)
  (inframe-outside bt))

;;; The joiner's filler (D15): (height length), a note and never a board.
(defun inframe-filler (bt runW)
  (list (inframe-outside bt) runW))

;;;========================================
;;; 5. NUMBERS (the engine is held to these: test/turn80-f01-lisp.test.js
;;;    RUNS the routines above on these inputs; F3 and F5 hold the engine)
;;;========================================
;;;
;;; THE LIP: t 18: lip 1, outside 19. t 19: lip 0, outside 19. t 20: lip -1,
;;; refused (inframe-lip-ok-p nil).
;;;
;;; EXAMPLE 1. KIT_BUD_FULL W 600 H 770 D 558 G 18, ONE DOOR. The lay-on door
;;; (1.5 0 598.5 767). The opening (19 19 581 751): 562 x 732. The inset door
;;; (22 22 578 748): 556 x 726, 22 thick, its back 3 and its face 25 in
;;; front of the carcass.
;;;
;;; EXAMPLE 2. KIT_BUD_FULL W 800, A PAIR. The lay-on leaves FL (1.5 0 398.5
;;; 767) and FR (401.5 0 798.5 767), the midline 400. The opening (19 19 781
;;; 751): 762 x 732. The inset leaves FL (22 22 398.5 748) and FR (401.5 22
;;; 778 748): 376.5 x 726 each, 3 between them, no stile.
;;;
;;; EXAMPLE 3. KIT_BUDR_FULL BUDR2 W 500, TWO DRAWER FRONTS. The lay-on F1 (1.5
;;; 0 498.5 382) and F2 (1.5 385 498.5 767), the midline 383.5. The opening
;;; (19 19 481 751): 462 x 732. The inset F1 (22 22 478 382): 456 x 360; F2
;;; (22 385 478 748): 456 x 363; 3 between them, no rail, 3 to the rails.
;;;
;;; THE RUN OF THE MOCKUP. END-L 18, BUD 600, BUD 800, BUDR2 500 butted from x
;;; 0, H 770 from y 0, the right end open: the frame (-19 -19) 1920 x 808,
;;; the openings (38 38 600 770), (638 38 1400 770), (1438 38 1900 770); the
;;; stiles 38 38 38 20; the rails 38 and 38; 19 under the carcass and 19 over
;;; it; the panel's overhang 1; one board: FRAME. The cut-out of the first
;;; opening (38 770) (600 770) (600 38) (38 38).
;;;
;;; THE WALL UNIT. KIT_WUD_FULL W 600 H 720, open both ends: the frame (-1
;;; -19) 602 x 758, the opening (20 38 582 720): 562 x 682; the stiles 20 20.
;;;
;;; THE JOIN. Five KIT_BUD_FULL W 600 butted from x 0, open both ends: the
;;; frame 3002 wide over a 2800 board; the stile centre lines 601 1201 1801
;;; 2401; two pieces, the longest 1801 either way, the first from the left:
;;; the cut at 1201, FRAME-1 (0 1201) 1201 and FRAME-2 (1201 3002) 1801.
;;; A run 4 mm apart (BUD 600 at 0, BUD 600 at 604): the stile between them
;;; 42, not 38.
;;;
;;; THE HINGE. A 22 door, the inset 1.5, the frame 25: the plate column 20.5
;;; back from the carcass front.
;;;
;;; THE END PANEL. KIT_BUD_FULL D 558, t 18: 583 deep, 19 higher at the top;
;;; on a wall unit 19 at the top and 19 at the bottom. THE WORKTOP: 19 higher.
;;; THE FILLER: 19 x the run's width, a note.

;;;========================================
;;; 6. THE COMMAND (draws what section 4 returns, nothing more)
;;;========================================

(defun c:INFRAME_FULL (/ w h bt cabs frame o)
  (setq w (getreal "\nCabinet width <600>: "))
  (if (null w) (setq w 600.0))
  (setq h (getreal "\nCarcass height <770>: "))
  (if (null h) (setq h 770.0))
  (setq bt (getreal "\nBoard thickness <18>: "))
  (if (null bt) (setq bt 18.0))
  (setq cabs (list (inframe-cab 0.0 w h 0.0 bt)))
  (setq frame (inframe-frame cabs (list "OPEN" 0.0) (list "OPEN" 0.0)))
  (makePolyline "CUT_OUTLINE"
    (list (list 0.0 0.0) (list (nth 2 frame) 0.0) (list (nth 2 frame) (nth 3 frame)) (list 0.0 (nth 3 frame))))
  (foreach o (nth 4 frame)
    (makePolyline "CUT_INNER" (inframe-cutout o)))
  (drawText "LABELS" (/ (nth 2 frame) 2.0) 19.0 12.0 "FRAME")
  (princ (strcat "\nFrame " (rtos (nth 2 frame) 2 1) " x " (rtos (nth 3 frame) 2 1)
                 ", lip " (rtos (inframe-lip bt) 2 1)))
  (princ))
