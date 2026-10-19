;;; Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
;;; Proprietary and confidential. Unauthorised copying, modification,
;;; distribution or use, including by automated tools and AI systems,
;;; is strictly prohibited without prior written permission.
;;;========================================
;;; KIT_SITE_TRIM.lsp
;;; THE SITE-TRIM ALLOWANCE - a MODIFIER on the END PANEL and the PLINTH of
;;; every kit: the board is cut 20 mm bigger on the edges a joiner scribes on
;;; site, the nominal stated beside it
;;; Command: SITETRIM_FULL
;;; Chat-fix 19.10.2026 (the owner's eye-test of T79) - LISP FIRST ("lisp najpierw")
;;; Derived from: the side infill's own allowance (autoParts.fillerOversize,
;;;               T53: one edge, the nominal stated, the label says TRIM ON SITE)
;;; Requires: SKYLON_COMMON.lsp loaded first
;;;========================================
;;;
;;; THE OWNER, 19.10.2026 (15:18):
;;;
;;;   "side panele powinny byc wieksze o 20 mm, to samo z plinth, panele 20mm
;;;    gora + dol + bok (nie przod, 0 to zawsze powinno byc ok)"
;;;
;;; UNTIL THIS FILE an end panel and a plinth were cut to the size the room
;;; draws, to the millimetre, and the joiner had nothing to take off against
;;; a floor that is not level, a ceiling that is not flat or a wall that is
;;; not plumb. The side infill has had its allowance since T53 (20 on the wall
;;; edge, "docinanie na miejscu przez stolarzy"); this file gives the end
;;; panel and the plinth theirs, by the same idiom: the CUT is bigger, the
;;; NOMINAL is stated, the label says OVERSIZE +20 TRIM ON SITE (NOM ...), and
;;; the 3-D keeps drawing the nominal (a board that entered the floor would
;;; break the first law: material never enters material).
;;;
;;; This is a NEW FILE. It touches no other kit. The six fossil kits are
;;; untouched. drawRect is COMMON's own.
;;;
;;;========================================
;;; 1. THE LAW IN ONE PARAGRAPH
;;;========================================
;;;
;;; An END PANEL grows `trim` (20) on its TOP edge, its BOTTOM edge and its
;;; BACK edge (the wall); its FRONT edge is the door line and stays ("nie
;;; przod, 0 to zawsze powinno byc ok"). A PLINTH grows `trim` on its TOP
;;; edge, its BOTTOM edge and each END that is not a machine-cut join (a
;;; single plinth: both ends; a run cut into strips: the first strip's left
;;; end and the last strip's right end; an L's two boards: the end away from
;;; the butt). A board that is not a rectangle (an end panel following its
;;; side into a notch or a recess, a plinth with a cut-out) grows the same
;;; way: every vertex ON a growing edge moves out with that edge, every other
;;; vertex stays, so a notch keeps its size from the FINAL edges and the
;;; cut-out keeps its mouth. The holes, pockets and marks move with the
;;; origin. The numbers live in the profile (autoParts.endPanel.siteTrim,
;;; autoParts.plinth.siteTrim, both 20, PROPOSED, owner to confirm).
;;;
;;;========================================
;;; 2. DECISIONS TAKEN FOR THE OWNER (each one line to veto)
;;;========================================
;;;
;;; D1  ONE NUMBER PER PART, 20, in the profile; no field in the UI.
;;; D2  THE FRONT EDGE OF AN END PANEL NEVER GROWS (the owner's "nie przod").
;;; D3  A PLINTH'S MACHINE-CUT JOIN NEVER GROWS: the allowance is for a wall
;;;     or a neighbour, not for a joint the saw makes square.
;;; D4  THE NOMINAL IS STATED: panel.meta.oversize = (mm edges nominal); the
;;;     label says OVERSIZE +20 ... TRIM ON SITE (NOM w x h); the 3-D draws the
;;;     nominal box; the cut list and the DXF carry the cut size.
;;; D5  THE OUTLINE GROWS BY ITS EDGES, NOT BY A SCALE: a vertex on a growing
;;;     edge (to 1e-6) moves out by `trim`; the origin moves so the board's
;;;     corner stays at (0, 0).
;;;
;;;========================================
;;; 3. ROUTINES
;;;========================================

;;; site-trim-grow: the outline pts (a list of (x y)) of a w x h board grown
;;; by `t` on the edges named in `edges` (a list of "L" "R" "T" "B"), in the
;;; grown board's own frame (its new corner at 0 0).
(defun site-trim-grow (pts w h t edges / dl dr dt db out)
  (setq dl (if (member "L" edges) t 0.0)
        dr (if (member "R" edges) t 0.0)
        dt (if (member "T" edges) t 0.0)
        db (if (member "B" edges) t 0.0)
        out nil)
  (foreach p pts
    (setq out (cons (list (+ (car p) dl (if (> (car p) (- w 1e-6)) dr 0.0) (if (< (car p) 1e-6) (- dl) 0.0))
                          (+ (cadr p) db (if (> (cadr p) (- h 1e-6)) dt 0.0) (if (< (cadr p) 1e-6) (- db) 0.0)))
                    out)))
  (reverse out))

;;; site-trim-size: the grown board's (w h).
(defun site-trim-size (w h t edges)
  (list (+ w (if (member "L" edges) t 0.0) (if (member "R" edges) t 0.0))
        (+ h (if (member "T" edges) t 0.0) (if (member "B" edges) t 0.0))))

;;; site-trim-shift: what a hole or a mark at (x y) moves by: (dl db).
(defun site-trim-shift (t edges)
  (list (if (member "L" edges) t 0.0) (if (member "B" edges) t 0.0)))

;;; The end panel's growing edges in its DRAWN frame: END-L is drawn as BUL
;;; (x from the FRONT, so the back is "R"), END-R as BUR (x from the BACK, so
;;; the back is "L"); the top is "T", the bottom "B".
(defun site-trim-end-edges (hand)
  (if (= hand "L") (list "R" "T" "B") (list "L" "T" "B")))

;;; A plinth's growing edges: the top, the bottom, and each end that is not
;;; a join (left-open, right-open are T or nil).
(defun site-trim-plinth-edges (leftOpen rightOpen / e)
  (setq e (list "T" "B"))
  (if leftOpen (setq e (cons "L" e)))
  (if rightOpen (setq e (cons "R" e)))
  e)

;;;========================================
;;; 4. NUMBERS (the engine is held to these: test/chatfix-1910-site-trim.test.js)
;;;========================================
;;;
;;; END PANEL, KIT_WARDROBE_FULL W 600 H 2150 D 578, END-L to the floor (leg
;;; 100), the wall gap 10: nominal 606 x 2250. Edges R T B, trim 20: CUT
;;; 626 x 2290; the outline (0 0) (626 0) (626 2290) (0 2290); the front edge
;;; at x 0 stays.
;;;   END-R the same board drawn from the back: edges L T B, CUT 626 x 2290.
;;; END PANEL with a corner notch (T79 F9, KIT_BUD_FULL 600 x 770, BL
;;; 200/200/300, END-L 25 to the floor): nominal (0 0) (386 0) (386 400)
;;; (596 400) (596 870) (0 870), the notch 210 x 400 at the back-bottom corner
;;; (x1y0; the back is x 596). Edges R T B, trim 20: (0 0) (386 0) (386 420)
;;; (616 420) (616 910) (0 910): the notch is 230 x 420 from the NEW edges
;;; (210 x 400 from the final ones); the corner mark moves with its corner
;;; (386 380 .. 386 420 .. 426 420).
;;; PLINTH, KIT_BUD_FULL W 600, leg 100 (plinth h 100): a single plinth 600 x
;;; 100, edges L R T B, trim 20: CUT 640 x 140. A DW panel's plinth with the
;;; cut-out over the whole width (the 20 strip at the top: nominal (0 80)
;;; (600 80) (600 100) (0 100)): the strip's bottom is a machine cut and not
;;; the board's bottom edge, so it moves with the origin: (0 100) (640 100)
;;; (640 140) (0 140), height 40 (20 of it the top trim, the strip 20 after
;;; it). A DW panel in a run of three (1800, the cut-out 600..1200): (0 0)
;;; (620 0) (620 100) (1220 100) (1220 0) (1840 0) (1840 140) (0 140): the
;;; mouth stays on the bottom edge, the cut-out 100 deep from the new bottom
;;; (80 from the final one).
;;; A run plinth in two strips, 2800 over a 2440 board (1800 + 1000): strip 1
;;; edges L T B, CUT 1820 x 140; strip 2 edges R T B, CUT 1020 x 140; the join
;;; between them stays square. A run grown 50 onto a corner butt (T75 F6) at
;;; its left: edges R T B only.
;;; THE L's TWO PLINTHS (T75 F4, KIT_CORNER_L 900 x 900, arm 558): A 410 x 100
;;; and B 392 x 100, each the far end, the top and the bottom: 430 x 140 and
;;; 412 x 140; the butt at the inner corner stays square.
;;; The 3-D: the box of every one of them is the nominal (606 x 2250, 600 x
;;; 100); the cut list and the DXF the cut size; the label OVERSIZE +20
;;; BACK/TOP/BOTTOM - TRIM ON SITE (NOM 606 x 2250).

;;;========================================
;;; 5. THE COMMAND (draws what section 3 returns, nothing more)
;;;========================================

(defun c:SITETRIM_FULL (/ w h t pts grown size)
  (setq w (getreal "\nBoard width <600>: "))
  (if (null w) (setq w 600.0))
  (setq h (getreal "\nBoard height <100>: "))
  (if (null h) (setq h 100.0))
  (setq t (getreal "\nTrim <20>: "))
  (if (null t) (setq t 20.0))
  (setq pts (list (list 0.0 0.0) (list w 0.0) (list w h) (list 0.0 h)))
  (setq grown (site-trim-grow pts w h t (list "L" "R" "T" "B")))
  (setq size (site-trim-size w h t (list "L" "R" "T" "B")))
  (princ (strcat "\nCut " (rtos (car size) 2 0) " x " (rtos (cadr size) 2 0) ", nominal " (rtos w 2 0) " x " (rtos h 2 0)))
  (princ))
