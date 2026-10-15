;;;========================================
;;; SKYLON_JOINTS_BISCUIT.lsp
;;; The THIRD joint system: BISCUITS on the carcass (T78, PART E, F20)
;;; Command: BISCUIT_JOINTS (prints the pattern for a cabinet; draws nothing)
;;; Requires: nothing. Pure functions and princ; SKYLON_COMMON is not loaded
;;;           because no drawing helper of it is called here.
;;;========================================
;;;
;;; The owner, 9.10.2026: "lisp najpierw." This file is written BEFORE any
;;; engine code, and the engine (src/engine/biscuitJoints.js) mirrors it
;;; routine for routine. Nothing in it is invented in JS and backfilled here.
;;;
;;; THE OWNER, 11.10.2026, on this system: "zostaw jak bylo, ciastka byly
;;; ustawione ok, nie grzeb w tym, polka stala to samo" and "bez ciastek na
;;; plecach". So:
;;;   1. THE SET DOES NOT MOVE. It is the set he dictated on 09.08.2026 (T13,
;;;      BLOCKERS #59) and the fixed shelf has carried since T24:
;;;        screw dia 3, gap 10, biscuit mark 70, gap 10, screw dia 3  (96 mm)
;;;      laid along the joint line, starting no closer than 50 to an end,
;;;      TWO sets up to 700, THREE above it. Every number is profile.biscuits,
;;;      read here key for key (section A) and changed in no file but that one.
;;;   2. THE JOINTS IT APPLIES TO (section C): side to TOP, side to BOTTOM,
;;;      fixed shelf to side. NEVER the back ("bez ciastek na plecach").
;;;      Since 15.10.2026 THE BACK IS SCREWED (the owner: "jak mamy cabineo
;;;      to nie robimy dog bonsow, i to samo jak mamy biscuits"): the puzzle
;;;      joint into the back goes whole on a biscuit unit (the sides' and the
;;;      TOP's and BOTTOM's back tenons with their dog bones, the BACK's
;;;      sockets with their dia 7.5 holes) and drawBACK's own dia 3 screw
;;;      rows through the back are what hold it. Before that day the BACK
;;;      kept the puzzle and a biscuit unit changed not one entity on it.
;;;   3. THE FIXED SHELF JOINT OF T24/T26 IS UNTOUCHED ("polka stala to
;;;      samo"): it is this very set already, on the same boards, from the same
;;;      datum. Its rows are in the table (section C) so one command prints
;;;      the whole pattern, and the engine lets T24's own code cut them.
;;;
;;; WHAT IT IS. The puzzle (SKYLON_COMMON drawBUL / drawBUR / drawTOP_ROT90 /
;;; drawBACK) stays the house's DEFAULT joint system. A unit switched to
;;; `joints.system = 'biscuit'` has its side to TOP and side to BOTTOM joints
;;; cut as the fixed shelf's joint is cut: the set on the SIDE's inner face
;;; along the joint line (two dia 3 through screws and the 70 mark per set),
;;; and the TOP's and BOTTOM's ends PLAIN (no tenon; the biscuit slot in the
;;; end is the joiner's, at the bench, as the shelf's is). Never both systems
;;; on one joint: the side's top and bottom sockets, their dia 7.5 holes and
;;; their dia 3 rows go; the TOP's and BOTTOM's end tenons and end dog bones
;;; go. The back tenons of the sides and of the TOP and BOTTOM go too, with
;;; their dog bones, and the BACK's sockets with them (point 2, the owner's
;;; 15.10.2026): no biscuit replaces them, the BACK's screw rows hold it.
;;;
;;; NO GATE. Every other new system of this house (dowels T75, Cabineo T78)
;;; is PROPOSED and gated until the owner confirms it. This one is not: the
;;; numbers are his own, dictated and reaffirmed. (biscuit-gate) returns nil
;;; and says why (section E).

;;;========================================
;;; A. THE PROFILE NUMBERS
;;;========================================
;;; profile.biscuits, as an assoc list, key for key and in the profile's own
;;; order. Passed IN to every function below, so each one is pure: same
;;; numbers in, same cuts out. The owner's numbers (09.08.2026, reaffirmed
;;; 11.10.2026): DECIDED, not proposed. markTool and markFromEnd are read
;;; because the profile holds them; markTool is the width the mark is drawn
;;; with in the clash check, markFromEnd is used by no joint of this file
;;; (section D says why) and is printed so the profile and this file agree.
(defun biscuit-profile ( / )
  (list
    (cons "markLength" 70.0)       ;; the biscuit mark itself              owner, decided
    (cons "markTool" 4.0)          ;; the owner's 4 mm in-and-out program  owner, decided
    (cons "gap" 10.0)              ;; CLEAR space between a screw and the mark   owner, decided
    (cons "screwDiameter" 3.0)     ;; the same dia 3 the carcass is screwed with owner, decided
    (cons "edgeMin" 50.0)          ;; a set STARTS no closer than this to an end, never less  owner, decided
    (cons "wideThreshold" 700.0)   ;; wider than this and a third set goes in the middle      owner, decided
    (cons "markFromEnd" 20.0)      ;; T13's transfer onto the edge board; unused here, see D  owner, decided
    (cons "layer" "BISCUIT_4MM")   ;; the mark's layer: the owner's VCarve tool mapping, never tidied
    (cons "screwLayer" "SCREWS_3MM") ;; the turn 8 screw family, joined rather than duplicated
    (cons "concealedReceivers" (list "TOP" "BOTTOM")))) ;; where a through screw may land when a board's END meets THEIR face (T13)

;;; Read one number (or the list) off a profile list.
(defun biscuit-get (prof key)
  (cdr (assoc key prof)))

;;;========================================
;;; B. THE SET RULE
;;;========================================
;;; THE SAME SET as the partition pattern of T13 and the fixed shelf of T24
;;; (engine/biscuits.js biscuitSetLength / biscuitSetCount / biscuitSets).
;;; The engine does NOT copy this arithmetic a second time: biscuitJoints.js
;;; calls biscuits.js for it. This file states it so the law is in LISP.
;;;
;;; THE CHAIN. Items and CLEAR gaps: 3 + 10 + 70 + 10 + 3 = 96 per set. The
;;; screw CENTRES stand at start + 1.5 and start + 94.5 (a screw is a hole, so
;;; its centre is half a diameter in from where it starts); the mark runs from
;;; start + 13 to start + 83.
;;;
;;; HOW MANY. L <= 700: TWO sets, one at each end honouring the 50. L > 700:
;;; ONE more in the middle, three. Fewer only when the arithmetic says they
;;; will not fit inside the usable band L - 2 x 50: then drop one and ask
;;; again. A count is never bought by breaking the 50 ("never less").
;;;
;;; WHERE. n = 2: starts at 50 and L - 50 - 96. n = 3: those two and the
;;; middle one CENTRED on the element, (L - 96) / 2. n = 1: the middle alone.
;;;
;;; THE NO-SCREW SET. Where the receiving face is NOT concealed the set is the
;;; mark alone, in the SAME positions, so a joiner reads one pattern.

;;; How long one set is, end to end: screw + gap + mark + gap + screw.
(defun biscuit-set-length (prof)
  (+ (* 2.0 (biscuit-get prof "screwDiameter"))
     (* 2.0 (biscuit-get prof "gap"))
     (biscuit-get prof "markLength")))

;;; How many sets a joint of length L takes: 0, 1, 2 or 3.
(defun biscuit-set-count (L prof / setL usable wanted n out)
  (setq L (max 0.0 (float L)))
  (setq setL (biscuit-set-length prof))
  (setq usable (- L (* 2.0 (biscuit-get prof "edgeMin"))))
  (cond
    ((< usable setL) 0)
    (T
      (setq wanted (if (> L (biscuit-get prof "wideThreshold")) 3 2))
      (setq n wanted out nil)
      ;; Sets may touch but never overlap: n sets need n x setL inside the
      ;; usable band; below that, drop one and ask again.
      (while (and (>= n 1) (null out))
        (if (>= usable (* setL n)) (setq out n))
        (setq n (1- n)))
      (if out out 1))))

;;; Where each set sits along a joint of length L, and what is in it.
;;; screws: T for the through-screw set, nil for the mark-only set.
;;; Returns ((start end (screwCentre screwCentre) (markFrom markTo)) ...),
;;; every number an offset from the joint's reference end (the FRONT, section C).
(defun biscuit-sets (L screws prof / setL n firstS lastS middle starts d g m out s)
  (setq L (max 0.0 (float L)))
  (setq setL (biscuit-set-length prof)
        n (biscuit-set-count L prof)
        d (biscuit-get prof "screwDiameter")
        g (biscuit-get prof "gap")
        m (biscuit-get prof "markLength"))
  (if (= n 0)
    nil
    (progn
      (setq firstS (biscuit-get prof "edgeMin")
            lastS (- L (biscuit-get prof "edgeMin") setL)
            middle (/ (- L setL) 2.0))
      (setq starts (cond ((= n 1) (list middle))
                         ((= n 2) (list firstS lastS))
                         (T (list firstS middle lastS))))
      (foreach s starts
        (setq out (cons (list s
                              (+ s setL)
                              (if screws (list (+ s (/ d 2.0)) (- (+ s setL) (/ d 2.0))) nil)
                              (list (+ s d g) (+ s d g m)))
                        out)))
      (reverse out))))

;;;========================================
;;; C. THE JOINTS: WHICH, AND NEVER THE BACK
;;;========================================
;;; Every joint here is a butt: the END of a horizontal board (TOP, BOTTOM, a
;;; FIX shelf) lands on the inner FACE of a carcass side (BUL, BUR). The side
;;; is the RECEIVING board and takes the whole set on its face; the
;;; horizontal board is the EDGE board and carries nothing (section D).
;;;
;;;   JOINT          PUZZLE TODAY                         RECEIVER  EDGE BOARD
;;;   side to TOP    sockets in the side's top edge,      BUL / BUR TOP, its end
;;;                  tenons on the TOP's two ends,
;;;                  the side's dia 3 row at H - G / 2
;;;   side to BOTTOM the same at the bottom               BUL / BUR BOTTOM, its end
;;;   FIX shelf to   the biscuit set and the side's       BUL / BUR SHELF, its end
;;;   side           through screws (T24 F7, T26 F7.1):
;;;                  THIS set already, left as it is
;;;
;;; NOT IN THE TABLE, BY THE OWNER'S WORD: the BACK. "bez ciastek na plecach."
;;; BACK to side, BACK to TOP and BACK to BOTTOM are SCREWED (15.10.2026): the
;;; back's dia 3 rows stay as drawBACK draws them, the puzzle's sockets in the
;;; back and the tenons on the sides' and the TOP's and BOTTOM's back edges go
;;; (section F). (biscuit-back-refusal) is the sentence any request for a
;;; biscuit on the BACK is answered with.
;;;
;;; NOT IN THE TABLE EITHER: a FIX shelf on a PARTITION. The partition serves
;;; two bays and a through screw would surface in the neighbour's face, so
;;; that bearer takes the MARK ALONE (the no-screw set), as T24's engine code
;;; cuts it today. It is a bearer rule of the engine (shelfBearers), not a
;;; carcass row, and this file does not restate it.
;;;
;;; Each board's frame is the one its LISP draws it in and the engine places
;;; it by (engine/joinery.js panelPlacement), origin bottom-left, x right,
;;; y up, seen from the face that is machined:
;;;   BUL     inner face; x from the FRONT edge (0) to the back edge (D - G)
;;;   BUR     inner face; x from the BACK edge (0) to the front edge (D - G)
;;;   TOP     drawn ROT90; x from the BACK edge (0) to the front (D - G),
;;;   BOTTOM  y from the BUL end (0) to the BUR end (W - 2G)
;;;   SHELF   x from its FRONT edge (0) to the back, y from the BUL end (0)
;;;
;;; THE DATUM. Every offset of a set is counted from the EDGE BOARD'S FRONT
;;; EDGE (the fixed shelf's law since T24: `at(t) = along(front - t)`). On BUL
;;; that front edge is at x = setback (0 for the TOP and BOTTOM, whose fronts
;;; are flush with the side's; the shelf's setback behind the carcass front),
;;; and offsets run +x; on BUR it is at x = (D - G) - setback and offsets run
;;; -x, so BUR's marks read backwards (from 477 to 407), exactly as the
;;; shelf's do today.
;;;
;;; Fields of a joint (an assoc list built by biscuit-joint):
;;;   name      the joint, e.g. "BUL-TOP"
;;;   len       the joint line's length: the EDGE board's depth, mm
;;;   face      the RECEIVING board ("BUL" or "BUR")
;;;   faceFrom  the face board's x of offset 0 (the edge board's front edge)
;;;   faceDir   +1.0 offsets run with x (BUL), -1.0 against it (BUR)
;;;   jointY    the face board's y of the joint line: the edge board's centre
;;;             line, row + edgeT / 2 (H - G / 2 for the TOP, G / 2 for the
;;;             BOTTOM, the shelf's underside + its thickness / 2)
;;;   edge      the EDGE board ("TOP", "BOTTOM", "SHELF-k")
;;;   edgeName  which of its edges meets the face: "Y0" (the BUL end) or
;;;             "YH" (the BUR end), in the edge board's own frame
;;;   edgeT     the EDGE board's thickness
;;;   setback   the edge board's front behind the carcass front (0 or the shelf's)
(defun biscuit-joint (name len face fFrom fDir jointY edge eNm eT sb)
  (list
    (cons "name" name) (cons "len" (float len))
    (cons "face" face) (cons "faceFrom" (float fFrom)) (cons "faceDir" (float fDir))
    (cons "jointY" (float jointY))
    (cons "edge" edge) (cons "edgeName" eNm) (cons "edgeT" (float eT))
    (cons "setback" (float sb))))

;;; Read one field off a joint.
(defun biscuit-jget (jt key)
  (cdr (assoc key jt)))

;;; May a through screw be driven into this RECEIVING board?
;;; A carcass side: always. Its outer face is against a wall, a neighbour or
;;; an end panel (T24's rule; the law "a carcass side never stays visible").
;;; A board in profile.biscuits.concealedReceivers ("TOP", "BOTTOM"): yes,
;;; when a board's END lands on ITS face (T13's partition, under the worktop
;;; or in the plinth void). That case is no joint of this file, since here
;;; the TOP and BOTTOM are EDGE boards, but the list is honoured so one
;;; question has one answer in both files.
;;; Anything else (a SHELF, a PARTITION): the mark alone.
(defun biscuit-takes-screws (board prof)
  (or (= board "BUL") (= board "BUR")
      (if (member board (biscuit-get prof "concealedReceivers")) T nil)))

;;; THE BACK, in the owner's words. Returned for any joint that names it.
(defun biscuit-back-refusal ( / )
  "no biscuits on the back (the owner, 11.10.2026: bez ciastek na plecach); the BACK is screwed on with the kit's own dia 3 rows, its puzzle joint goes whole (the owner, 15.10.2026: no dog bones)")

;;; The joint table for the five-board carcass every puzzle kit shares
;;; (KIT_BUD_FULL: BUL, BUR, TOP, BOTTOM, BACK) and its FIX shelves.
;;; fixShelves: ((row shelfT setback) ...), one per FIX shelf, where row is
;;; the shelf's UNDERSIDE from the floor (drawBUL's shelfY), shelfT its
;;; thickness and setback its front's distance behind the carcass front (the
;;; profile's 20). Its depth is D - G - setback (turn 24 F6).
;;; No BACK row is built, by design (see above).
(defun biscuit-joint-table (W D H G fixShelves / sideW out k sh row st sb depthS)
  (setq W (float W) D (float D) H (float H) G (float G))
  (setq sideW (- D G))         ;; BUL / BUR: D - G deep; TOP / BOTTOM: D - G deep too
  (setq out (list
    ;;              name          len    face  from   dir  jointY         edge     eNm  eT sb
    (biscuit-joint "BUL-TOP"     sideW  "BUL" 0.0    1.0  (- H (/ G 2.0)) "TOP"    "Y0" G  0.0)
    (biscuit-joint "BUR-TOP"     sideW  "BUR" sideW  -1.0 (- H (/ G 2.0)) "TOP"    "YH" G  0.0)
    (biscuit-joint "BUL-BOTTOM"  sideW  "BUL" 0.0    1.0  (/ G 2.0)       "BOTTOM" "Y0" G  0.0)
    (biscuit-joint "BUR-BOTTOM"  sideW  "BUR" sideW  -1.0 (/ G 2.0)       "BOTTOM" "YH" G  0.0)))
  (setq k 1)
  (foreach sh fixShelves
    (setq row (float (car sh)) st (float (cadr sh)) sb (float (caddr sh)))
    (setq depthS (- D G sb))
    (setq out (append out (list
      (biscuit-joint (strcat "BUL-SHELF-" (itoa k)) depthS "BUL" sb 1.0 (+ row (/ st 2.0))
                     (strcat "SHELF-" (itoa k)) "Y0" st sb)
      (biscuit-joint (strcat "BUR-SHELF-" (itoa k)) depthS "BUR" (- sideW sb) -1.0 (+ row (/ st 2.0))
                     (strcat "SHELF-" (itoa k)) "YH" st sb))))
    (setq k (1+ k)))
  out)

;;;========================================
;;; D. PER BOARD: WHERE THE MARKS AND THE SCREWS LAND
;;;========================================
;;; THE RECEIVING BOARD (BUL, BUR) takes the whole set on its inner face along
;;; the joint line y = jointY: for every set its two dia 3 through screws
;;; (when biscuit-takes-screws says so) and its 70 mark between them, both as
;;; x = faceFrom + faceDir x offset.
;;;
;;; THE EDGE BOARD (TOP, BOTTOM, SHELF) CARRIES NOTHING. The owner ruled it
;;; for the fixed shelf on turn 26 (F7.1): "a fix shelf is an OUTLINE and a
;;; LABEL, and nothing else", not even on its ends. T13 had transferred the
;;; set-out onto the edge board's face at markFromEnd (20) from its end so the
;;; two halves agree before gluing; he looked at the sheet and said no. The TOP
;;; and BOTTOM are the same joint as the shelf (the same end on the same face),
;;; so they take the same ruling: their ends are PLAIN, and the biscuit slot in
;;; the end is cut at the bench, referenced from the front edge as the marks
;;; are. markFromEnd stays in the profile and is printed by this command; no
;;; joint of this file draws from it.
;;;
;;; Returned records (the engine's biscuitJoints.js returns the same lists):
;;;   MARK   (board "MARK" x1 y x2 y layer)
;;;   SCREW  (board "SCREW" x y dia layer)

;;; The marks of one joint on its receiving board, in set order.
(defun biscuit-face-marks (jt sets prof / face from dir y lay out s mk)
  (setq face (biscuit-jget jt "face")
        from (biscuit-jget jt "faceFrom")
        dir  (biscuit-jget jt "faceDir")
        y    (biscuit-jget jt "jointY")
        lay  (biscuit-get prof "layer"))
  (foreach s sets
    (setq mk (nth 3 s))
    (setq out (cons (list face "MARK" (+ from (* dir (car mk))) y (+ from (* dir (cadr mk))) y lay) out)))
  (reverse out))

;;; The through screws of one joint on its receiving board, in set order.
;;; Empty when the set is the no-screw set (biscuit-sets was asked with nil).
(defun biscuit-face-screws (jt sets prof / face from dir y dia lay out s sc)
  (setq face (biscuit-jget jt "face")
        from (biscuit-jget jt "faceFrom")
        dir  (biscuit-jget jt "faceDir")
        y    (biscuit-jget jt "jointY")
        dia  (biscuit-get prof "screwDiameter")
        lay  (biscuit-get prof "screwLayer"))
  (foreach s sets
    (foreach sc (nth 2 s)
      (setq out (cons (list face "SCREW" (+ from (* dir sc)) y dia lay) out))))
  (reverse out))

;;; One joint, whole: (sets marks screws). The sets are the through-screw
;;; sets when the receiving board may be screwed through, else the mark-only
;;; sets in the same positions.
(defun biscuit-joint-cuts (jt prof / sets)
  (setq sets (biscuit-sets (biscuit-jget jt "len")
                           (biscuit-takes-screws (biscuit-jget jt "face") prof)
                           prof))
  (list sets
        (biscuit-face-marks jt sets prof)
        (biscuit-face-screws jt sets prof)))

;;;========================================
;;; E. THE GATE (THERE IS NONE) AND THE REFUSALS
;;;========================================
;;; THE GATE. nil, always. The dowel (T75) and Cabineo (T78) patterns are
;;; proposed and their gates hold the CNC export shut until the owner
;;; confirms them. The biscuit set is the owner's own: dictated 09.08.2026
;;; (T13, BLOCKERS #59), cut on every fixed shelf since T24, reaffirmed
;;; 11.10.2026 ("ciastka byly ustawione ok, nie grzeb w tym"). There is nothing
;;; for him to confirm, so there is no gate and the export is not refused.
(defun biscuit-gate (prof)
  nil)

;;; Why there is no gate, for the summary and the PR, in one sentence.
(defun biscuit-no-gate-reason ( / )
  "the biscuit set is the owner's own (09.08.2026, reaffirmed 11.10.2026): no gate, nothing to confirm")

;;; A joint this set cannot make, refused in words before any pattern is
;;; used. Returns a list of sentences, or nil when there is nothing to say.
;;;   1. A joint on the BACK: the owner's sentence.
;;;   2. A joint too short for one set: the shortest is 50 + 96 + 50 = 196.
;;;   3. A screw wider than the edge board it must enter.
(defun biscuit-refusal (prof jt / out len edgeT setL)
  (setq len (biscuit-jget jt "len") edgeT (biscuit-jget jt "edgeT") setL (biscuit-set-length prof))
  (if (or (= (biscuit-jget jt "face") "BACK") (= (biscuit-jget jt "edge") "BACK"))
    (setq out (cons (biscuit-back-refusal) out)))
  (if (= (biscuit-set-count len prof) 0)
    (setq out (cons (strcat "the joint " (biscuit-jget jt "name") " is " (rtos len 2 2)
                            " long and cannot hold one biscuit set: the shortest is "
                            (rtos (+ (* 2.0 (biscuit-get prof "edgeMin")) setL) 2 2)
                            " (" (rtos (biscuit-get prof "edgeMin") 2 2) " + " (rtos setL 2 2)
                            " + " (rtos (biscuit-get prof "edgeMin") 2 2) ")")
                    out)))
  (if (>= (biscuit-get prof "screwDiameter") edgeT)
    (setq out (cons (strcat "a screw " (rtos (biscuit-get prof "screwDiameter") 2 2)
                            " wide does not fit a " (rtos edgeT 2 2) " edge")
                    out)))
  (reverse out))

;;;========================================
;;; F. WHAT A BISCUIT JOINT REPLACES, AND WHAT IT LEAVES
;;;========================================
;;; On a joint switched to biscuits, BOTH boards lose that joint's puzzle:
;;;   the SIDE loses the socket pocket at that edge (PUZZLE_SOCKET), the
;;;   socket's two dia 7.5 holes (PUZZLE_HOLES_7_5MM) and the joint's own dia
;;;   3 row (SCREWS_3MM at 50, middle, L - 50 on the centre line G / 2): the
;;;   row goes because the set's own screws stand on that same line;
;;;   the TOP / BOTTOM loses the tenons on that END (the end goes back to a
;;;   straight line) and the end's dog bones (PUZZLE_DOG_BONES).
;;; THE BACK JOINT goes too (the owner, 15.10.2026, point 2 at the head): the
;;;   sides' back tenons and dog bones (a plain D - G x H), the TOP's and
;;;   BOTTOM's back tenons and dog bones (plain ends, plain back edge), the
;;;   BACK's sockets and dia 7.5 holes (a plain W x H). The BACK keeps its dia
;;;   3 screw rows and, on a wall unit, its hanger cut-outs.
;;; What is NOT one of these joints stays exactly as it is: the hinge plate
;;; holes, the shelf pin ladders, the runner holes, the FIX shelf's dia 3 row
;;; through the BACK (partitionBackScrewRun), the fronts.
;;;
;;; THE CORNER. On a side the set's first screw stands at 51.5 from the FRONT
;;; and the last at (D - G) - 51.5, which is 51.5 from the back edge; the back
;;; tenon's dog bone is cut OUTSIDE the board (x from D - G to D), so they
;;; never meet. The engine's clash check (biscuitJoints.js, section Z) asks
;;; anyway, of every hole and pocket the board keeps, and refuses in words.
;;;
;;; THE SCREWS ARE THROUGH. A through screw has no depth: it is driven through
;;; the side's outer face into the edge board's end, which is why it exists
;;; only where that outer face is concealed (biscuit-takes-screws).

;;;========================================
;;; G. THE COMMAND
;;;========================================
;;; Prints one record: board, MARK or SCREW, its numbers, its layer.
(defun biscuit-print-cut (c)
  (if (= (nth 1 c) "MARK")
    (princ (strcat "\n    " (nth 0 c) " MARK   x " (rtos (nth 2 c) 2 2) " to " (rtos (nth 4 c) 2 2)
                   "  y=" (rtos (nth 3 c) 2 2) "  " (nth 6 c)))
    (princ (strcat "\n    " (nth 0 c) " SCREW  x=" (rtos (nth 2 c) 2 2) " y=" (rtos (nth 3 c) 2 2)
                   "  dia=" (rtos (nth 4 c) 2 2) "  " (nth 5 c)))))

;;; BISCUIT_JOINTS: the pattern for a cabinet W D H G, at the profile's
;;; numbers. Defaults are KIT_BUD_FULL's own (600, 558, 770, 18). FIX shelves,
;;; if any, stand at KIT_BUD's even shelf spacing, G thick, 20 behind the front.
(defun c:BISCUIT_JOINTS ( / prof W D H G nFix i spacing fixList table jt res sets marks screws
                            bad why nMarks nScrews c)
  (setq prof (biscuit-profile))
  (setq W (getreal "\nCabinet WIDTH [mm] <600>: "))
  (if (or (null W) (<= W 0.0)) (setq W 600.0))
  (setq D (getreal "\nCabinet DEPTH [mm] <558>: "))
  (if (or (null D) (<= D 0.0)) (setq D 558.0))
  (setq H (getreal "\nCabinet HEIGHT [mm] <770>: "))
  (if (or (null H) (<= H 0.0)) (setq H 770.0))
  (setq G (getreal "\nBoard THICKNESS [mm] <18>: "))
  (if (or (null G) (<= G 0.0)) (setq G 18.0))
  (setq nFix (getint "\nNumber of FIX shelves (0-10) <0>: "))
  (if (or (null nFix) (< nFix 0)) (setq nFix 0))
  (if (> nFix 10) (setq nFix 10))
  (setq spacing (/ (- H G G) (+ nFix 1.0)))
  (setq i 1)
  (while (<= i nFix)
    (setq fixList (append fixList (list (list (+ G (* spacing i)) G 20.0))))
    (setq i (1+ i)))
  (princ (strcat "\nSET: screw " (rtos (biscuit-get prof "screwDiameter") 2 2)
                 " + gap " (rtos (biscuit-get prof "gap") 2 2)
                 " + mark " (rtos (biscuit-get prof "markLength") 2 2)
                 " + gap " (rtos (biscuit-get prof "gap") 2 2)
                 " + screw " (rtos (biscuit-get prof "screwDiameter") 2 2)
                 " = " (rtos (biscuit-set-length prof) 2 2)
                 "; edge min " (rtos (biscuit-get prof "edgeMin") 2 2)
                 "; two sets, three above " (rtos (biscuit-get prof "wideThreshold") 2 2)
                 "; markFromEnd " (rtos (biscuit-get prof "markFromEnd") 2 2) " (unused here)"))
  (princ (strcat "\nGATE: none. " (biscuit-no-gate-reason)))
  (princ (strcat "\nBACK: " (biscuit-back-refusal)))
  (setq table (biscuit-joint-table W D H G fixList))
  (setq nMarks 0 nScrews 0)
  (foreach jt table
    (setq bad (biscuit-refusal prof jt))
    (if bad
      (foreach why bad (princ (strcat "\nREFUSED " (biscuit-jget jt "name") ": " why)))
      (progn
        (setq res (biscuit-joint-cuts jt prof))
        (setq sets (car res) marks (cadr res) screws (caddr res))
        (setq nMarks (+ nMarks (length marks)) nScrews (+ nScrews (length screws)))
        (princ (strcat "\n" (biscuit-jget jt "name") "  L=" (rtos (biscuit-jget jt "len") 2 2)
                       "  from the FRONT of " (biscuit-jget jt "edge")
                       "  sets " (itoa (length sets))
                       "  on " (biscuit-jget jt "face") " at y=" (rtos (biscuit-jget jt "jointY") 2 2)
                       (if (biscuit-takes-screws (biscuit-jget jt "face") prof) "  (through screws)" "  (mark only)")))
        (princ "\n  set starts:")
        (foreach c sets (princ (strcat " " (rtos (car c) 2 2))))
        (foreach c marks (biscuit-print-cut c))
        (foreach c screws (biscuit-print-cut c))
        (princ (strcat "\n    " (biscuit-jget jt "edge") ": nothing (the end is plain; T26 F7.1)")))))
  (princ (strcat "\nMARKS: " (itoa nMarks) "  SCREWS: " (itoa nScrews)
                 "  (the BACK: 0 and 0, by the owner's word)"))
  (princ))

;;;========================================
;;; H. NUMBERS: a BUD 600 at KIT_BUD_FULL defaults, one FIX shelf
;;;========================================
;;; W 600, D 558, H 770, G 18. Profile: screw 3, gap 10, mark 70, edge min 50,
;;; wide 700, set 96. One FIX shelf at KIT_BUD's one-shelf row: underside 385,
;;; 18 thick, front 20 behind the carcass front (shelf 564 x 520).
;;; Boards: BUL / BUR 540 x 770; TOP / BOTTOM 540 x 564 (drawn ROT90);
;;; BACK 600 x 770 (untouched); SHELF-1 564 x 520 (untouched).
;;;
;;; SETS (offsets from the edge board's FRONT edge):
;;;   L 540 (TOP, BOTTOM): 540 <= 700, usable 440 >= 2 x 96: TWO sets
;;;     starts 50 and 540 - 50 - 96 = 394
;;;     set 1: screws 51.5 144.5   mark 63 to 133
;;;     set 2: screws 395.5 488.5  mark 407 to 477
;;;   L 520 (SHELF-1): TWO sets, starts 50 and 374
;;;     set 1: screws 51.5 144.5   mark 63 to 133
;;;     set 2: screws 375.5 468.5  mark 387 to 457
;;;
;;; PER BOARD (x, y in the board's own frame, section C):
;;; BUL  (x from the FRONT; the TOP's front at x 0, the shelf's at x 20)
;;;   BUL-TOP      y 761  SCREW x 51.5 144.5 395.5 488.5   MARK 63..133  407..477
;;;   BUL-BOTTOM   y 9    SCREW x 51.5 144.5 395.5 488.5   MARK 63..133  407..477
;;;   BUL-SHELF-1  y 394  SCREW x 71.5 164.5 395.5 488.5   MARK 83..153  407..477
;;; BUR  (x from the BACK; x = 540 - t for the TOP and BOTTOM, 520 - t for the shelf)
;;;   BUR-TOP      y 761  SCREW x 488.5 395.5 144.5 51.5   MARK 477..407 133..63
;;;   BUR-BOTTOM   y 9    SCREW x 488.5 395.5 144.5 51.5   MARK 477..407 133..63
;;;   BUR-SHELF-1  y 394  SCREW x 468.5 375.5 144.5 51.5   MARK 457..387 133..63
;;; TOP, BOTTOM, SHELF-1: nothing (plain ends; T26 F7.1).
;;; BACK: no biscuit (the owner: bez ciastek na plecach). Since 15.10.2026 it
;;;       loses its 10 sockets and 20 dia 7.5 holes and keeps its 14 dia 3
;;;       screws (x 9 and 591 at y 50, 240, 530, 720; x 68, 300, 532 at
;;;       y 9 and 761), a plain 600 x 770.
;;;
;;; THE SHELF ROWS ARE WHAT T24 CUTS TODAY, TO THE DECIMAL: engine marks on
;;; BUL from (83, 394) to (153, 394) and (407, 394) to (477, 394), shelf
;;; screws at 71.5 164.5 395.5 488.5; on BUR marks from (457, 394) to
;;; (387, 394) and (133, 394) to (63, 394), screws 468.5 375.5 144.5 51.5.
;;; "polka stala to samo."
;;;
;;; COUNTS. Without the shelf: BUL 8 screws + 4 marks, BUR 8 + 4: 16 SCREWS,
;;; 8 MARKS. With the shelf: 24 SCREWS, 12 MARKS (the shelf's 8 and 4 are
;;; T24's own, counted here so the table is whole).
;;;
;;; WHAT THE PUZZLE LOSES ON THE SAME BUD. Each side: 4 sockets (2 top, 2
;;; bottom), 8 dia 7.5 holes, 6 dia 3 screws (at x 50 270 490, y 761 and 9).
;;; TOP and BOTTOM: the 4 end tenons each and the 4 end dog bones each, and
;;; since 15.10.2026 the 2 back tenons and 2 back dog bones each (the outline
;;; falls from 64 points to the 4 corners). The sides lose their 3 back tenons
;;; (34 outline points to 4) and 3 back dog bones. The BACK loses its 10
;;; sockets and 20 dia 7.5 holes and keeps its 14 screws. No PUZZLE layer is
;;; left on a biscuit BUD. (Before 15.10.2026 the back joint stayed: TOP and
;;; BOTTOM 24 points, the sides 34, the BACK whole.)

(princ "\nSKYLON_JOINTS_BISCUIT loaded. Type BISCUIT_JOINTS to print the pattern.")
(princ)
