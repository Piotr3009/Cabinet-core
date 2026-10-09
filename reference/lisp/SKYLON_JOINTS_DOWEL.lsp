;;;========================================
;;; SKYLON_JOINTS_DOWEL.lsp
;;; The SECOND joint system: DOWELS (T75, PART G, F23)
;;; Command: DOWEL_JOINTS (prints the pattern for a cabinet; draws nothing)
;;; Requires: nothing. Pure functions and princ; SKYLON_COMMON is not loaded
;;;           because no drawing helper of it is called here.
;;;========================================
;;;
;;; The owner, 9.10.2026: "lisp najpierw." This file is written BEFORE any
;;; engine code, and the engine mirrors it line for line. Nothing in it is
;;; invented in JS and backfilled here.
;;;
;;; WHAT IT IS. The puzzle (SKYLON_COMMON drawBUL / drawBUR / drawTOP_ROT90 /
;;; drawBACK) stays the house's DEFAULT joint system and this file does not
;;; touch it. A unit switched to `joints.system = 'dowel'` has every joint the
;;; puzzle makes today replaced by DOWEL PAIRS: one FACE hole in one board and
;;; one EDGE hole in the other, on the same axis, for every dowel. Never both
;;; systems on one joint.
;;;
;;; THE GATE. Every number below is PROPOSED. While `confirmed` is nil a kit
;;; or an export that would MACHINE these holes refuses, in these words:
;;;   "the dowel pattern is proposed, not confirmed by the owner"
;;; (dowel-gate) below returns that sentence. This command only PRINTS the
;;; pattern so the owner can check it, and prints the gate above it.
;;;
;;; CABINEO. The system id 'cabineo' is reserved for Lamello's Cabineo and has
;;; no geometry here or anywhere: its numbers come from the owner's CAD and PDF
;;; (reference/hardware/cabineo/README.md), never from this file.

;;;========================================
;;; A. THE PROFILE NUMBERS
;;;========================================
;;; profile.joints.dowel, as an assoc list. Passed IN to every function below,
;;; so each one is pure: same numbers in, same holes out.
(defun dowel-profile ( / )
  (list
    (cons "diaMm" 8.0)          ;; dowel diameter           T75 proposed, owner to confirm
    (cons "edgeDepthMm" 20.0)   ;; edge hole depth          T75 proposed, owner to confirm
    (cons "faceDepthMm" 12.0)   ;; face hole depth          T75 proposed, owner to confirm
    (cons "pitchMm" 32.0)       ;; the grid the dowels sit on  T75 proposed, owner to confirm
    (cons "endOffsetMm" 50.0)   ;; first and last dowel from each end  T75 proposed, owner to confirm
    ;; NEW in this file, not in the CLAUDE.md table: the spacing rule below
    ;; needs a stated maximum gap. 128 = 4 pitches.
    (cons "maxGapMm" 128.0)     ;; widest gap between two dowels  T75 proposed, owner to confirm
    (cons "confirmed" nil)))    ;; THE GATE: nil until the owner confirms  T75 proposed, owner to confirm

;;; Read one number (or the flag) off a profile list.
(defun dowel-get (prof key)
  (cdr (assoc key prof)))

;;;========================================
;;; B. THE SPACING RULE
;;;========================================
;;; Where the dowels go along ONE joint, as offsets from the joint's reference
;;; end. Inputs: L the joint's length, e the end offset (50), p the pitch (32),
;;; M the max gap (128). One answer per length, every step stated:
;;;
;;;   1. L <= 0: no dowel.
;;;   2. The two END dowels stand e in from each end: at e and at L - e. Their
;;;      span is S = L - 2e.
;;;   3. S < p (the two ends would stand closer than one pitch, or cross):
;;;      ONE dowel, on the joint's centre, L / 2. The puzzle's own answer on a
;;;      short run is the same: one joint on the centre line (turn 25).
;;;   4. Otherwise the INTERMEDIATES. A gap may span at most K = floor(M / p)
;;;      whole pitches (128 / 32 = 4). Counted in pitches the span is
;;;      u = S / p, and the fewest gaps that keep every gap within K pitches
;;;      is n = ceil(u / K). The n - 1 intermediates are the house's EVEN
;;;      spread (engine/partEdits.js dowelPositions and the back screw run:
;;;      the ends always drilled, the intermediates spread evenly so no gap
;;;      exceeds the max), each one SNAPPED UP onto the pitch grid counted
;;;      from the first dowel:
;;;
;;;          t(i) = e + p * ceil(i * u / n)        i = 1 .. n - 1
;;;
;;;      So every dowel but the last sits on ONE 32 grid from the first, and
;;;      only the last gap carries the remainder.
;;;
;;; WHY NO GAP EXCEEDS THE MAX. Between two grid dowels the gap is
;;; ceil(i u/n) - ceil((i-1) u/n) <= ceil(u/n) <= K pitches; the last gap is
;;; u - ceil((n-1) u/n) <= u/n <= K pitches.
;;; WHY TWO NEVER MEET (with K = 4). n < u/4 + 1, so u/n > 2: every inner gap
;;; is at least 2 pitches and the last is more than 1 pitch (32 > dia 8).
;;; (dowel-too-close) below checks the result anyway, for any numbers.
;;;
;;; FLOATING NOISE. Every ceil and floor here takes 1e-9 of slack, so a value
;;; that is an integer on paper is that integer: ceil(x) = ceil(x - 1e-9) and
;;; floor(x) = floor(x + 1e-9). The engine mirrors the same 1e-9.

;;; ceil for x >= 0, with the 1e-9 slack (AutoLISP has no ceiling function).
(defun dowel-ceil (x / n)
  (setq n (fix x))
  (if (> (- x n) 1e-9) (1+ n) n))

;;; The offsets along a joint of length L, from its reference end.
;;; (max 1 ...) only keeps the arithmetic defined; a max gap under one pitch
;;; is refused by (dowel-refusal) before any pattern is used.
(defun dowel-positions (L e p M / S u K n i out)
  (setq L (float L) e (float e) p (float p) M (float M))
  (cond
    ((<= L 0.0) nil)
    ((< (- L e e) p) (list (/ L 2.0)))
    (T
      (setq S (- L e e))
      (setq u (/ S p))
      (setq K (max 1 (fix (+ (/ M p) 1e-9))))
      (setq n (dowel-ceil (/ u K)))
      (setq out (list e))
      (setq i 1)
      (while (< i n)
        (setq out (cons (+ e (* p (dowel-ceil (/ (* i u) n)))) out))
        (setq i (1+ i)))
      (reverse (cons (- L e) out)))))

;;; Do two neighbouring dowels stand closer than one diameter (their holes
;;; would meet)? T if so. Offsets are in order, as (dowel-positions) gives them.
(defun dowel-too-close (offs dia / prev hit)
  (foreach o offs
    (if (and prev (< (- o prev) dia)) (setq hit T))
    (setq prev o))
  hit)

;;;========================================
;;; C. THE JOINT RECORD AND THE HOLES
;;;========================================
;;; Every joint is a butt: the EDGE of one board lands on the FACE of the
;;; other. The puzzle decided which is which long ago and the dowel keeps it:
;;; the board that carries the puzzle SOCKET is the FACE board here, and the
;;; board that carries the TENON is the EDGE board.
;;;
;;; Each board's frame is the one its LISP draws it in and the engine places
;;; it by (engine/joinery.js panelPlacement), origin bottom-left, x right,
;;; y up, seen from the face that is drilled:
;;;   BUL     inner face; x from the FRONT edge (0) to the back edge (D - G)
;;;   BUR     inner face; x from the BACK edge (0) to the front edge (D - G)
;;;   TOP     drawn ROT90; x from the BACK edge (0) to the front (D - G),
;;;   BOTTOM  y from the BUL end (0) to the BUR end (W - 2G)
;;;   BACK    inner face; x from the BUL end (0) to the BUR end (W), y up
;;;   SHELF   (a FIX shelf, turn 26 F8) x from its FRONT edge (0) to the back,
;;;           y from the BUL end (0) to the BUR end
;;;
;;; Fields of a joint (an assoc list built by dowel-joint):
;;;   name      the joint, e.g. "BUL-TOP"
;;;   len       the joint's length, mm
;;;   ref       the end the offsets are counted from: FRONT, BOTTOM or LEFT
;;;   face      the FACE board
;;;   faceAxis  "X" or "Y": the axis of the face board the joint runs along
;;;   faceFrom  the face board's coordinate of offset 0
;;;   faceDir   +1.0 the offsets run with that axis, -1.0 against it
;;;   faceEdge  the face board's coordinate where the edge board's face lands
;;;   faceIn    +1.0 / -1.0: from faceEdge, which way the edge board lies
;;;   edge      the EDGE board
;;;   edgeName  which of its edges: "X0" (x = 0), "XW" (x = w), "Y0" (y = 0),
;;;             "YH" (y = h). X0 / XW run along y, Y0 / YH run along x.
;;;   edgeAt    that edge's own coordinate
;;;   edgeFrom  the edge board's coordinate of offset 0, along the edge
;;;   edgeDir   +1.0 / -1.0, as faceDir
;;;   edgeT     the EDGE board's thickness
(defun dowel-joint (name len ref
                    face fAxis fFrom fDir fEdge fIn
                    edge eNm eAt eFrom eDir eT)
  (list
    (cons "name" name) (cons "len" (float len)) (cons "ref" ref)
    (cons "face" face) (cons "faceAxis" fAxis) (cons "faceFrom" (float fFrom))
    (cons "faceDir" (float fDir)) (cons "faceEdge" (float fEdge)) (cons "faceIn" (float fIn))
    (cons "edge" edge) (cons "edgeName" eNm) (cons "edgeAt" (float eAt))
    (cons "edgeFrom" (float eFrom)) (cons "edgeDir" (float eDir)) (cons "edgeT" (float eT))))

;;; Read one field off a joint.
(defun dowel-jget (jt key)
  (cdr (assoc key jt)))

;;; The FACE holes: diameter dia, depth faceDepth, drilled square into the face
;;; board. They stand on the JOINT LINE: the line where the edge board lands,
;;; offset by HALF THE MATING (edge) BOARD'S THICKNESS, so each hole is on the
;;; centre of the edge it meets. On a side under an 18 TOP that is H - 9.
;;; Returns ((board "FACE" x y dia depth) ...), in offset order.
(defun dowel-face-holes (jt offs dia depth / axis from dir jline out off x y)
  (setq axis  (dowel-jget jt "faceAxis")
        from  (dowel-jget jt "faceFrom")
        dir   (dowel-jget jt "faceDir")
        jline (+ (dowel-jget jt "faceEdge")
                 (* (dowel-jget jt "faceIn") (/ (dowel-jget jt "edgeT") 2.0))))
  (foreach off offs
    (if (= axis "X")
      (setq x (+ from (* dir off)) y jline)
      (setq x jline y (+ from (* dir off))))
    (setq out (cons (list (dowel-jget jt "face") "FACE" x y dia depth) out)))
  (reverse out))

;;; The EDGE holes: diameter dia, depth edgeDepth, bored INTO the named edge,
;;; square to it, CENTRED IN THE BOARD'S THICKNESS (z = edgeT / 2). (x, y) is
;;; the mouth of the bore, on the edge itself; the bore runs into the board:
;;; X0 runs +x, XW runs -x, Y0 runs +y, YH runs -y.
;;; Returns ((board "EDGE" x y dia depth edgeName z) ...), in offset order.
(defun dowel-edge-holes (jt offs dia depth / edgeNm at from dir z out off x y)
  (setq edgeNm (dowel-jget jt "edgeName")
        at    (dowel-jget jt "edgeAt")
        from  (dowel-jget jt "edgeFrom")
        dir   (dowel-jget jt "edgeDir")
        z     (/ (dowel-jget jt "edgeT") 2.0))
  (foreach off offs
    (if (or (= edgeNm "X0") (= edgeNm "XW"))
      (setq x at y (+ from (* dir off)))
      (setq x (+ from (* dir off)) y at))
    (setq out (cons (list (dowel-jget jt "edge") "EDGE" x y dia depth edgeNm z) out)))
  (reverse out))

;;; One joint, whole: (offsets faceHoles edgeHoles).
(defun dowel-joint-holes (jt prof / offs dia)
  (setq dia (dowel-get prof "diaMm"))
  (setq offs (dowel-positions (dowel-jget jt "len")
                              (dowel-get prof "endOffsetMm")
                              (dowel-get prof "pitchMm")
                              (dowel-get prof "maxGapMm")))
  (list offs
        (dowel-face-holes jt offs dia (dowel-get prof "faceDepthMm"))
        (dowel-edge-holes jt offs dia (dowel-get prof "edgeDepthMm"))))

;;;========================================
;;; D. THE JOINT TABLE
;;;========================================
;;; Every joint the puzzle makes today in the five-board carcass every puzzle
;;; kit shares (KIT_BUD_FULL: BUL, BUR, TOP, BOTTOM, BACK), and the FIX shelf
;;; to side joint. Which board is FACE and which is EDGE follows the puzzle:
;;;
;;;   JOINT          PUZZLE TODAY                        FACE    EDGE
;;;   side to TOP    sockets in the side's top edge,     side    TOP, its
;;;                  tenons on the TOP's two ends                end edge
;;;   side to BOTTOM the same at the bottom              side    BOTTOM
;;;   BACK to side   tenons on the side's back edge,     BACK    side, its
;;;                  sockets in the back's side edges            back edge
;;;   BACK to TOP    tenons on the TOP's back edge,      BACK    TOP, its
;;;                  sockets in the back's top edge              back edge
;;;   BACK to BOTTOM the same at the bottom              BACK    BOTTOM
;;;   FIX shelf to   the biscuit set and the side's      side    SHELF, its
;;;   side           through screws (turn 24 F7); not            end edge
;;;                  a puzzle joint, named by CLAUDE.md T75 F23
;;;
;;; THE PUZZLE MAKES FIVE JOINTS, NOT FOUR. BACK to TOP and BACK to BOTTOM are
;;; not in CLAUDE.md's short list, but the TOP and BOTTOM carry puzzle tenons
;;; into the back today (drawTOP_ROT90's left edge, drawBACK's top and bottom
;;; sockets), and a dowel unit keeps no tenon. So they are here.
;;;
;;; AND THE SIXTH ROW IS NOT A PUZZLE JOINT. The FIX shelf to side joint is
;;; cut today as BISCUIT MARKS plus the side's dia 3 SHELF SCREWS (turn 24 F7,
;;; engine/biscuits.js biscuitSets), never as sockets and tenons. It is in
;;; this table because CLAUDE.md T75 F23 names it, and on a dowel unit its
;;; biscuit set gives way to the dowels (section E).
;;;
;;; A joint the puzzle does NOT cut on a kit has no dowel joint either: the
;;; sink's sides have no back tenons and no top sockets, the oven's no top
;;; sockets (engine/puzzle.js sidePanelGeometry `edges`); the same switch
;;; drops the matching row of this table.
;;;
;;; THE FIX SHELF. The owner ruled on 26 (F7.1) that a fix shelf is "an
;;; OUTLINE and a LABEL, and nothing else": no biscuit on its ends. A DOWEL
;;; joint cannot be one-sided, so under 'dowel' the shelf's two ends take the
;;; edge holes, by T75 F23's "paired holes in both boards". Under 'puzzle'
;;; nothing changes. A fix shelf on a PARTITION is NOT in this table: two
;;; bays' face holes, 12 deep from both faces of an 18 partition, would meet
;;; in the middle, so that joint keeps its biscuit set.
;;;
;;; fixShelves: ((row shelfT setback) ...), one per FIX shelf, where row is the
;;; shelf's UNDERSIDE from the floor (the engine's shelf row; drawBUL's shelfY),
;;; shelfT its thickness and setback its front's distance behind the carcass
;;; front (the LISP's 20). Its depth is D - G - setback and its width the full
;;; clear light W - 2G (turn 24 F6), so its back edge meets the BACK.
(defun dowel-joint-table (W D H G fixShelves / sideW topW topH out k sh row st sb depthS)
  (setq W (float W) D (float D) H (float H) G (float G))
  (setq sideW (- D G)         ;; BUL / BUR: D - G deep, the back sits behind them
        topW  (- W G G)       ;; TOP / BOTTOM: between the two sides
        topH  (- D G))        ;; TOP / BOTTOM: D - G deep
  (setq out (list
    ;;            name         len    ref
    ;;            FACE  axis from    dir  edge  in
    ;;            EDGE  edge  at     from dir  edgeT
    (dowel-joint "BUL-TOP"     sideW  "FRONT"
                 "BUL"    "X" 0.0    1.0  H     -1.0
                 "TOP"    "Y0" 0.0   topH -1.0 G)
    (dowel-joint "BUR-TOP"     sideW  "FRONT"
                 "BUR"    "X" sideW  -1.0 H     -1.0
                 "TOP"    "YH" topW  topH -1.0 G)
    (dowel-joint "BUL-BOTTOM"  sideW  "FRONT"
                 "BUL"    "X" 0.0    1.0  0.0   1.0
                 "BOTTOM" "Y0" 0.0   topH -1.0 G)
    (dowel-joint "BUR-BOTTOM"  sideW  "FRONT"
                 "BUR"    "X" sideW  -1.0 0.0   1.0
                 "BOTTOM" "YH" topW  topH -1.0 G)
    (dowel-joint "BACK-BUL"    H      "BOTTOM"
                 "BACK"   "Y" 0.0    1.0  0.0   1.0
                 "BUL"    "XW" sideW 0.0  1.0  G)
    (dowel-joint "BACK-BUR"    H      "BOTTOM"
                 "BACK"   "Y" 0.0    1.0  W     -1.0
                 "BUR"    "X0" 0.0   0.0  1.0  G)
    (dowel-joint "BACK-TOP"    topW   "LEFT"
                 "BACK"   "X" G      1.0  H     -1.0
                 "TOP"    "X0" 0.0   0.0  1.0  G)
    (dowel-joint "BACK-BOTTOM" topW   "LEFT"
                 "BACK"   "X" G      1.0  0.0   1.0
                 "BOTTOM" "X0" 0.0   0.0  1.0  G)))
  (setq k 1)
  (foreach sh fixShelves
    (setq row (float (car sh)) st (float (cadr sh)) sb (float (caddr sh)))
    (setq depthS (- D G sb))
    (setq out (append out (list
      (dowel-joint (strcat "BUL-SHELF-" (itoa k)) depthS "FRONT"
                   "BUL" "X" sb 1.0 row 1.0
                   (strcat "SHELF-" (itoa k)) "Y0" 0.0 0.0 1.0 st)
      (dowel-joint (strcat "BUR-SHELF-" (itoa k)) depthS "FRONT"
                   "BUR" "X" (- sideW sb) -1.0 row 1.0
                   (strcat "SHELF-" (itoa k)) "YH" topW 0.0 1.0 st))))
    (setq k (1+ k)))
  out)

;;;========================================
;;; E. WHAT A DOWEL JOINT REPLACES, AND WHAT IT LEAVES
;;;========================================
;;; On a joint switched to dowels, BOTH boards lose that joint's puzzle whole:
;;;   the tenons (the edge goes back to a straight line),
;;;   the sockets and their two dia 7.5 holes (PUZZLE_HOLES_7_5MM),
;;;   the dog bones,
;;;   and the joint's own dia 3 assembly screw row (SCREWS_3MM).
;;; The screws go because they would land IN the dowels: the side's top and
;;; bottom rows stand at 50, middle, L - 50 on the board's centre line G / 2,
;;; and the end dowels stand at 50 on that same line (screwFromEnd 50 =
;;; endOffset 50). The back's rows stand at 50 from its ends on G / 2 too.
;;; On the FIX shelf to side joint the biscuit marks and the side's through
;;; screws go the same way: one system per joint.
;;;
;;; What is NOT a joint stays exactly as it is: hinge plate holes, shelf pin
;;; ladders, runner holes, the FIX shelf's dia 3 row through the BACK into its
;;; back edge (partitionBackScrewRun), and everything on the fronts.
;;;
;;; THE CORNER. At a board's corner the end dowel of one joint stands e = 50
;;; from the edge where the other joint's EDGE bores go in 20 deep. They stay
;;; apart while e - dia / 2 > edgeDepth (50 - 4 = 46 > 20, a 26 mm web);
;;; (dowel-refusal) refuses a profile that breaks it.
;;;
;;; THE EDGE HOLES ARE HORIZONTAL BORES. A 3-axis bed drills the FACE holes
;;; from above; an EDGE hole needs a horizontal drilling head or a dowel jig at
;;; the bench. That is a readiness fact for the export (F22), not a number.
;;;
;;; THE HOLES ARE BLIND. A face hole 12 deep in an 18 board leaves 6, so the
;;; outer face of a side is never pierced ("a carcass side never stays
;;; visible": nor does a hole in one). The dowel bought is shorter than the two
;;; holes together (12 + 20 = 32); its length is the owner's to name.

;;;========================================
;;; F. THE GATE AND THE REFUSALS
;;;========================================
;;; THE GATE: nil when the owner has confirmed the pattern, else the sentence.
(defun dowel-gate (prof)
  (if (dowel-get prof "confirmed")
    nil
    "the dowel pattern is proposed, not confirmed by the owner"))

;;; A profile that cannot make a sound joint, refused in words before any
;;; pattern is used. faceT and edgeT are the thinnest face and edge boards the
;;; job uses. Returns a list of sentences, or nil when there is nothing to say.
(defun dowel-refusal (prof faceT edgeT / dia fd ed p M e out)
  (setq dia (dowel-get prof "diaMm") fd (dowel-get prof "faceDepthMm")
        ed (dowel-get prof "edgeDepthMm") p (dowel-get prof "pitchMm")
        M (dowel-get prof "maxGapMm") e (dowel-get prof "endOffsetMm"))
  (if (or (<= p 0.0) (< M p))
    (setq out (cons (strcat "the max gap " (rtos M 2 2) " is shorter than one pitch " (rtos p 2 2)) out)))
  (if (>= fd faceT)
    (setq out (cons (strcat "a face hole " (rtos fd 2 2) " deep would break through a " (rtos faceT 2 2) " board") out)))
  (if (>= dia edgeT)
    (setq out (cons (strcat "a dowel " (rtos dia 2 2) " wide does not fit a " (rtos edgeT 2 2) " edge") out)))
  (if (<= (- e (/ dia 2.0)) ed)
    (setq out (cons (strcat "at a corner the end dowel (" (rtos e 2 2) " in) would meet the other joint's edge bores ("
                            (rtos ed 2 2) " deep)") out)))
  (reverse out))

;;;========================================
;;; G. THE COMMAND
;;;========================================
;;; Prints one hole: board, FACE or EDGE (with the edge and z), x, y, dia, depth.
(defun dowel-print-hole (h)
  (princ (strcat "\n    " (nth 0 h) " " (nth 1 h)
                 (if (= (nth 1 h) "EDGE") (strcat " " (nth 6 h)) "")
                 "  x=" (rtos (nth 2 h) 2 2) " y=" (rtos (nth 3 h) 2 2)
                 (if (= (nth 1 h) "EDGE") (strcat " z=" (rtos (nth 7 h) 2 2)) "")
                 "  dia=" (rtos (nth 4 h) 2 2) " depth=" (rtos (nth 5 h) 2 2))))

;;; DOWEL_JOINTS: the pattern for a cabinet W D H G, at the profile's numbers.
;;; Defaults are KIT_BUD_FULL's own (600, 558, 770, 18). FIX shelves, if any,
;;; stand at KIT_BUD's even shelf spacing, G thick, 20 behind the front.
(defun c:DOWEL_JOINTS ( / prof W D H G nFix i spacing fixList gate bad why
                          table jt res offs total o h)
  (setq prof (dowel-profile))
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
  (setq gate (dowel-gate prof))
  (if gate (princ (strcat "\nGATE: " gate ". No machine file may carry these holes.")))
  (setq bad (dowel-refusal prof G G))
  (if bad
    (foreach why bad (princ (strcat "\nREFUSED: " why)))
    (progn
      (setq table (dowel-joint-table W D H G fixList))
      (setq total 0)
      (foreach jt table
        (setq res (dowel-joint-holes jt prof))
        (setq offs (car res))
        (setq total (+ total (length offs)))
        (princ (strcat "\n" (dowel-jget jt "name") "  L=" (rtos (dowel-jget jt "len") 2 2)
                       "  from " (dowel-jget jt "ref") "  dowels " (itoa (length offs))))
        (if (dowel-too-close offs (dowel-get prof "diaMm"))
          (princ (strcat "\n  REFUSED: two dowels on " (dowel-jget jt "name") " stand closer than one diameter")))
        (princ "\n  offsets:")
        (foreach o offs (princ (strcat " " (rtos o 2 2))))
        (foreach h (cadr res) (dowel-print-hole h))
        (foreach h (caddr res) (dowel-print-hole h)))
      (princ (strcat "\nDOWELS: " (itoa total) " (each one face hole and one edge hole)"))))
  (princ))

;;;========================================
;;; H. NUMBERS: a BUD 600 at KIT_BUD_FULL defaults
;;;========================================
;;; W 600, D 558, H 770, G 18, no shelf. Profile: dia 8, face 12, edge 20,
;;; pitch 32, end 50, max gap 128 (K = 4 pitches). All proposed.
;;; Boards: BUL / BUR 540 x 770; TOP / BOTTOM 540 x 564 (drawn ROT90: x the
;;; depth from the back, y the width from the BUL end); BACK 600 x 770.
;;;
;;; JOINT        LEN  REF     u        n  OFFSETS                     GAPS
;;; BUL-TOP      540  FRONT   13.75    4  50 178 274 402 490          128 96 128 88
;;; BUR-TOP      540  FRONT   13.75    4  50 178 274 402 490          128 96 128 88
;;; BUL-BOTTOM   540  FRONT   13.75    4  50 178 274 402 490          128 96 128 88
;;; BUR-BOTTOM   540  FRONT   13.75    4  50 178 274 402 490          128 96 128 88
;;; BACK-BUL     770  BOTTOM  20.9375  6  50 178 274 402 498 626 720  128 96 128 96 128 94
;;; BACK-BUR     770  BOTTOM  20.9375  6  50 178 274 402 498 626 720  128 96 128 96 128 94
;;; BACK-TOP     564  LEFT    14.5     4  50 178 306 402 514          128 128 96 112
;;; BACK-BOTTOM  564  LEFT    14.5     4  50 178 306 402 514          128 128 96 112
;;; (The puzzle on the same joints today: 2 sockets at 95 / 445; 3 tenons at
;;; 95 / 385 / 675; 2 tenons at 95 / 469.)
;;;
;;; HOLES PER BOARD. FACE: dia 8, depth 12. EDGE: dia 8, depth 20, z 9 (the
;;; centre of 18). (x, y) in the board's own frame, section C.
;;; BUL     FACE  y 761 (BUL-TOP):     x 50 178 274 402 490
;;;         FACE  y 9   (BUL-BOTTOM):  x 50 178 274 402 490
;;;         EDGE  XW, x 540, bore -x (BACK-BUL):  y 50 178 274 402 498 626 720
;;; BUR     FACE  y 761 (BUR-TOP):     x 490 362 266 138 50
;;;         FACE  y 9   (BUR-BOTTOM):  x 490 362 266 138 50
;;;         EDGE  X0, x 0, bore +x (BACK-BUR):    y 50 178 274 402 498 626 720
;;; TOP     EDGE  Y0, y 0, bore +y (BUL-TOP):     x 490 362 266 138 50
;;;         EDGE  YH, y 564, bore -y (BUR-TOP):   x 490 362 266 138 50
;;;         EDGE  X0, x 0, bore +x (BACK-TOP):    y 50 178 306 402 514
;;; BOTTOM  EDGE  Y0, y 0, bore +y (BUL-BOTTOM):  x 490 362 266 138 50
;;;         EDGE  YH, y 564, bore -y (BUR-BOTTOM): x 490 362 266 138 50
;;;         EDGE  X0, x 0, bore +x (BACK-BOTTOM): y 50 178 306 402 514
;;; BACK    FACE  x 9   (BACK-BUL):    y 50 178 274 402 498 626 720
;;;         FACE  x 591 (BACK-BUR):    y 50 178 274 402 498 626 720
;;;         FACE  y 761 (BACK-TOP):    x 68 196 324 420 532
;;;         FACE  y 9   (BACK-BOTTOM): x 68 196 324 420 532
;;;
;;; COUNTS. BUL 10 face + 7 edge; BUR 10 + 7; TOP 15 edge; BOTTOM 15 edge;
;;; BACK 24 face. 44 face holes, 44 edge holes: 44 DOWELS for the BOM.
;;;
;;; WITH ONE FIX SHELF (KIT_BUD's one-shelf row: underside 385, 18 thick,
;;; front 20 behind the carcass front; shelf 520 deep x 564 wide):
;;; BUL-SHELF-1  520  FRONT   13.125   4  50 178 274 370 470          128 96 96 100
;;; BUR-SHELF-1  520  FRONT   13.125   4  50 178 274 370 470          128 96 96 100
;;; BUL      FACE  y 394 (row + 18 / 2):  x 70 198 294 390 490
;;; BUR      FACE  y 394:                 x 470 342 246 150 50
;;; SHELF-1  EDGE  Y0, y 0, bore +y:      x 50 178 274 370 470
;;;          EDGE  YH, y 564, bore -y:    x 50 178 274 370 470
;;; 10 more dowels: 54 in all. The shelf's last face hole (x 490 on BUL, 50
;;; from the back edge) stands 26 clear of BACK-BUL's edge bores (x 520 to 540).

(princ "\nSKYLON_JOINTS_DOWEL loaded. Type DOWEL_JOINTS to print the pattern.")
(princ)
