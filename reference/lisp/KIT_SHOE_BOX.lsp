;;;========================================
;;; KIT_SHOE_BOX.lsp
;;; Shoe Box insert - CNC panels + carcass-side drill templates
;;; Command: SHOE_BOX
;;; T34 (16.08.2026). The owner's law, dictated in chat the same day:
;;;   - ONE construction, TWO mounting variants:
;;;       FIX    = full opening width, 3 screws per side driven from
;;;                OUTSIDE the carcass ("srodek: nie widac nic")
;;;       DRAWER = the SAME box narrowed by 2 x 13 mm side runners
;;;                ("runners 13 mm szerokosci"); behind hinged doors
;;;                an extra 30 mm infill per hinged side (dpSideLaw)
;;;   - Walls (2 sides + back + box front) ALL 80 mm high; the box is
;;;     rectangular and LEVEL - only the bottom inside is sloped
;;;   - Sloped bottom seated in GROOVES 6 mm deep in all four walls,
;;;     groove width = bottom thickness + 0.2 play
;;;   - Angle law: rearEdge = min(80, run x tan 10deg); the front edge
;;;     always lands at the box floor behind the box front. Deep box =>
;;;     rear pinned at 80 and the angle comes out under 10; shallow =>
;;;     exactly 10. One board, one formula, no second flat panel.
;;;   - GRAIN ACROSS the bottom ("dno - sloje w poprzek"): grain runs
;;;     along the WIDTH. The bottom is drawn width-along-X below and
;;;     labelled; nesting must keep that axis.
;;;   - Divider 0 or 1 ("2 nie maja sensu"), ACROSS the width
;;;     ("od lewej do prawej - 2 rzedy butow"), 50 mm high, standing on
;;;     the slope at mid-run.
;;;   - THE FRONT IS A SWITCH (T36, owner: "punkt 3 - tak, z przelacznikiem"):
;;;     DEFAULT ON, which is every box cut before 17.08.2026; switched OFF the
;;;     decorative face is not cut at all and the box is open to the room. The
;;;     switch is the box's own, per box, and it changes nothing else - the
;;;     sides, the back, the box front, the bottom, the dividers and every
;;;     hole stay exactly where this kit puts them.
;;;   - A FRONT on BOTH variants, 120 mm high (owner 16.08: "jak bedzie
;;;     fix to tez bedzie front, ale nie ze spray tylko z materialu
;;;     carcasowego - widac cieta plyte, trzeba przykryc"):
;;;       FIX front    = CARCASS board family, full opening width
;;;       DRAWER front = FRONTS family, rides the clearance matrix
;;;   - Runner drilling (owner's sheet, 16.08, Hafele-type): first
;;;     fixing 37 mm from the RUNNER FRONT FACE, rear fixing at the
;;;     system column per NL (map below). Runner front face setback
;;;     from the carcass front edge = FRONT THICKNESS + 3 mm
;;;     ("cofnac na front + 3 mm").
;;;   - Position: a pre-export decision - "height from bay floor" in mm
;;;     (default 0, or directly above the drawer stack). Templates below
;;;     take posZ and place every carcass-side hole from it.
;;; [OWNER - accepted by silence, engine mirrors these]:
;;;   - DRAWER behind a hinged door: per hinged side ONE solid BATTEN
;;;     30 thick x 70 high, the box's whole depth, outer face on the bay
;;;     side (owner v2, 16.08: "boczek 30 x 70 mm, bedzie latwiej, wzdluz
;;;     szuflady") - the runner for that side mounts on the batten
;;;   - screw row spacing: 50 from each box end + middle, at box mid
;;;     height (posZ + 40)
;;;   - runner fixing holes dia 5.0 (euro), axis at posZ + 40
;;;   - all box parts cut from the PROJECT CARCASS BOARD (thickness G)
;;; Requires: SKYLON_COMMON.lsp loaded first
;;;========================================

;;; Auto-load COMMON if not already loaded
(if (null drawRect) (load "SKYLON_COMMON"))

;;;========================================
;;; A. SHOE-BOX CONSTANTS (the law - the engine MATCHES these)
;;;========================================

(setq SHOE_WALL_H     80.0)   ;; sides, back and box front height
(setq SHOE_FRONT_H   120.0)   ;; decorative front height (both variants)
(setq SHOE_DIV_H      50.0)   ;; divider height
(setq SHOE_RUNNER_W   13.0)   ;; side runner thickness, per side
(setq SHOE_GROOVE_D    6.0)   ;; groove depth in every wall
(setq SHOE_GROOVE_PLAY 0.2)   ;; groove width = bottom G + this
(setq SHOE_ANGLE_MAX   7.0)   ;; degrees - the ceiling, never exceeded
;;;   ^ owner, 16.08.2026 (eye-test, second pass): "zrob jeszcze mniejszy -
;;;     mysle ze okolo 6-7 stopni, wiecej nie bedzie trzeba". Was 10.
(setq SHOE_PILOT_D     3.0)   ;; FIX: through-pilot in carcass side
(setq SHOE_PILOT_N     3)     ;; FIX: pilots per side, in a row
(setq SHOE_PILOT_END  50.0)   ;; FIX: first/last pilot from box ends
(setq SHOE_RUNFIX_D    5.0)   ;; DRAWER: runner fixing hole (euro)
(setq SHOE_FIX_AXIS   40.0)   ;; pilot/runner axis above box floor
(setq SHOE_SETBACK_X   3.0)   ;; runner face = frontT + this, from carcass front
(setq SHOE_INFILL     30.0)   ;; per hinged side, behind doors (dpSideLaw)
(setq SHOE_BATTEN_H   70.0)   ;; the batten's height (thickness = SHOE_INFILL)

;;; Runner rear-fixing column per NL - the owner's sheet, 16.08.
;;; First fixing is ALWAYS at 37.0 from the runner front face.
(setq SHOE_RUNNER_MAP
  '((150 . 77.2) (200 . 128.0) (250 . 128.0) (300 . 224.0) (350 . 224.0)
    (400 . 320.0) (450 . 352.0) (500 . 416.0) (550 . 448.0) (600 . 480.0)
    (650 . 544.0) (700 . 544.0)))
(setq SHOE_RUNNER_FRONT_FIX 37.0)

;;;========================================
;;; B. GEOMETRY LAW
;;;========================================

;;; Slope rear-edge height (UNDERSIDE of the bottom at the inner back
;;; face). run = clear inner depth between front and back inner faces.
;;; LAW v2 - owner, 16.08.2026 (eye-test): "dno ma za duzy skos, wychodzi
;;; poza obreb boxa". v1 capped the UNDERSIDE at the wall top and the board's
;;; own thickness broke out above the side at the rear. The cap now subtracts
;;; the board (G + groove play) standing perpendicular on the slope, settled
;;; by three passes of the fixed point - the WHOLE bottom, groove included,
;;; finishes inside the box. Takes the board thickness G.
(defun shoeRearEdge (run G / a first board rear cap i)
  (setq a (* SHOE_ANGLE_MAX (/ pi 180.0)))
  (setq first (min SHOE_WALL_H (* run (/ (sin a) (cos a)))))
  (setq board (+ G SHOE_GROOVE_PLAY))
  (setq rear first)
  (setq i 0)
  (while (< i 3)
    (setq cap (max 0.0 (- SHOE_WALL_H (* board (cos (atan rear run))))))
    (setq rear (min first cap))
    (setq i (1+ i)))
  rear)

;;; The derived angle in radians (informational; the geometry above is
;;; the law - deep box comes out under 10 degrees by construction).
(defun shoeAngle (run rear)
  (atan rear run))

;;;========================================
;;; C. LAYERS
;;;========================================

(defun shoeMakeLayers ()
  (command "._LAYER" "_N" "OUTLINE"          "_C" "7" "OUTLINE" "")
  (command "._LAYER" "_N" "SCREWS_3MM"       "_C" "3" "SCREWS_3MM" "")
  (command "._LAYER" "_N" "SHOE_GROOVE_6MM"  "_C" "1" "SHOE_GROOVE_6MM" "")
  (command "._LAYER" "_N" "SHOE_RUNNER_5MM"  "_C" "5" "SHOE_RUNNER_5MM" "")
  (command "._LAYER" "_N" "SUMMARY"          "_C" "8" "SUMMARY" "")
  (command "._LAYER" "_N" "UNIT_NUMBER"      "_C" "2" "UNIT_NUMBER" ""))

;;;========================================
;;; D. PANEL DRAWING (flat CNC panels, mm, face up)
;;;========================================

;;; SIDE panel: X = depth (front edge at x0), Y = height.
;;; Angled groove: a parallelogram pocket, 6 deep, whose LOWER edge runs
;;; from (G, 0) - the bottom's underside on the box floor at the inner
;;; face of the box front - up to (depth - G, rear) at the inner face of
;;; the back. Groove width (bottom G + play) is taken PERPENDICULAR to
;;; the slope.
(defun drawSHOE_SIDE (x0 y0 depth G rear label / p1x p1y p2x p2y ang gw
                       nx ny)
  (drawRect "OUTLINE" x0 y0 (+ x0 depth) (+ y0 SHOE_WALL_H))
  (setq p1x (+ x0 G) p1y y0)
  (setq p2x (+ x0 (- depth G)) p2y (+ y0 rear))
  (setq ang (shoeAngle (- depth (* 2.0 G)) rear))
  (setq gw (+ G SHOE_GROOVE_PLAY))
  (setq nx (* gw (- (sin ang))) ny (* gw (cos ang)))
  (makePolyline "SHOE_GROOVE_6MM"
    (list (list p1x p1y) (list p2x p2y)
          (list (+ p2x nx) (+ p2y ny)) (list (+ p1x nx) (+ p1y ny))))
  (drawText "SUMMARY" (+ x0 (/ depth 2.0)) (+ y0 SHOE_WALL_H 12.0) 8.0
    (strcat label "  " (rtos depth 2 0) " x " (rtos SHOE_WALL_H 2 0)
            "  groove 6 deep, w=" (rtos gw 2 1))))

;;; BACK panel: X = inner width, Y = height. Horizontal groove band,
;;; 6 deep, from rear (underside) up by (G + play).
(defun drawSHOE_BACK (x0 y0 innerW G rear / gw)
  (setq gw (+ G SHOE_GROOVE_PLAY))
  (drawRect "OUTLINE" x0 y0 (+ x0 innerW) (+ y0 SHOE_WALL_H))
  (drawRect "SHOE_GROOVE_6MM" x0 (+ y0 rear) (+ x0 innerW) (+ y0 rear gw))
  (drawText "SUMMARY" (+ x0 (/ innerW 2.0)) (+ y0 SHOE_WALL_H 12.0) 8.0
    (strcat "BACK  " (rtos innerW 2 0) " x " (rtos SHOE_WALL_H 2 0))))

;;; BOX FRONT panel: X = inner width, Y = height. Horizontal groove band
;;; at the floor (the bottom engages 6 into the front at y = 0).
(defun drawSHOE_BOXFRONT (x0 y0 innerW G / gw)
  (setq gw (+ G SHOE_GROOVE_PLAY))
  (drawRect "OUTLINE" x0 y0 (+ x0 innerW) (+ y0 SHOE_WALL_H))
  (drawRect "SHOE_GROOVE_6MM" x0 y0 (+ x0 innerW) (+ y0 gw))
  (drawText "SUMMARY" (+ x0 (/ innerW 2.0)) (+ y0 SHOE_WALL_H 12.0) 8.0
    (strcat "BOX FRONT  " (rtos innerW 2 0) " x " (rtos SHOE_WALL_H 2 0))))

;;; BOTTOM panel: X = width (GRAIN AXIS), Y = slope length. Plain board,
;;; engages 6 into every wall: cut = (innerW + 12) x (slopeLen + 12).
(defun drawSHOE_BOTTOM (x0 y0 innerW slopeLen / w l)
  (setq w (+ innerW (* 2.0 SHOE_GROOVE_D)))
  (setq l (+ slopeLen (* 2.0 SHOE_GROOVE_D)))
  (drawRect "OUTLINE" x0 y0 (+ x0 w) (+ y0 l))
  (drawText "SUMMARY" (+ x0 (/ w 2.0)) (+ y0 l 12.0) 8.0
    (strcat "BOTTOM  " (rtos w 2 0) " x " (rtos l 2 1)
            "  GRAIN ACROSS = along X"))
  (drawText "SUMMARY" (+ x0 (/ w 2.0)) (+ y0 (/ l 2.0)) 6.0
    "grain >>> X >>>"))

;;; DIVIDER (0 or 1): X = inner width, Y = 50. Sits ACROSS the width on
;;; the slope at mid-run; edges scribed to the slope on site - the cut
;;; is the plain rectangle.
(defun drawSHOE_DIVIDER (x0 y0 innerW / )
  (drawRect "OUTLINE" x0 y0 (+ x0 innerW) (+ y0 SHOE_DIV_H))
  (drawText "SUMMARY" (+ x0 (/ innerW 2.0)) (+ y0 SHOE_DIV_H 12.0) 8.0
    (strcat "DIVIDER  " (rtos innerW 2 0) " x " (rtos SHOE_DIV_H 2 0)
            "  across the width - 2 shoe rows")))

;;; INFILL side wall - owner, 16.08.2026: "jak wstawiamy szuflade shoe, to
;;; nie zapomnij dodac ten [infill] 30 mm, czyli boczna scianke, bo zawiasy".
;;; DRAWER variant behind a hinged door: per hinged side ONE vertical board,
;;; depth of the box, height of the FRONT (120), thickness G, its INNER face
;;; at SHOE_INFILL (30) from the carcass side - the runner for that side
;;; mounts on THIS board, and the door's arc clears the 30 - G behind it.
(defun drawSHOE_INFILL (x0 y0 depth G sideLbl / )
  (drawRect "OUTLINE" x0 y0 (+ x0 depth) (+ y0 SHOE_BATTEN_H))
  (drawText "SUMMARY" (+ x0 (/ depth 2.0)) (+ y0 SHOE_BATTEN_H 12.0) 8.0
    (strcat "BATTEN " sideLbl "  " (rtos depth 2 0) " x "
            (rtos SHOE_BATTEN_H 2 0) " x " (rtos SHOE_INFILL 2 0)
            " thick  outer face ON the bay side")))

;;; FRONT panel (decorative, both variants): outline only - the material
;;; family is the project's law (FIX = carcass board, DRAWER = fronts
;;; family); this kit cuts geometry, the register names the board.
(defun drawSHOE_FRONT (x0 y0 frontW variant / )
  (drawRect "OUTLINE" x0 y0 (+ x0 frontW) (+ y0 SHOE_FRONT_H))
  (drawText "SUMMARY" (+ x0 (/ frontW 2.0)) (+ y0 SHOE_FRONT_H 12.0) 8.0
    (strcat "FRONT  " (rtos frontW 2 0) " x " (rtos SHOE_FRONT_H 2 0)
            (if (= variant "F") "  (CARCASS board family)"
                                "  (FRONTS family)"))))

;;;========================================
;;; E. CARCASS-SIDE DRILL TEMPLATES
;;; Local X = distance from the CARCASS FRONT EDGE, local Y = height
;;; above the BAY FLOOR. posZ shifts the whole row.
;;;========================================

;;; FIX: 3 through-pilots dia 3.0, driven from OUTSIDE. Row at box mid
;;; height; along the box depth: 50 from each end + middle. boxFrontX =
;;; where the BOX front outer face lands from the carcass front edge.
(defun drawSHOE_FIX_TEMPLATE (x0 y0 boxFrontX depth posZ / yAx r xA xB xC)
  (setq yAx (+ y0 posZ SHOE_FIX_AXIS))
  (setq r (/ SHOE_PILOT_D 2.0))
  (setq xA (+ x0 boxFrontX SHOE_PILOT_END))
  (setq xB (+ x0 boxFrontX (/ depth 2.0)))
  (setq xC (+ x0 boxFrontX depth (- SHOE_PILOT_END)))
  (drawCircle "SCREWS_3MM" xA yAx r)
  (drawCircle "SCREWS_3MM" xB yAx r)
  (drawCircle "SCREWS_3MM" xC yAx r)
  (drawText "SUMMARY" xB (+ yAx 20.0) 8.0
    "CARCASS SIDE - FIX: 3 x dia3 through, screwed from OUTSIDE"))

;;; DRAWER: runner fixing holes dia 5.0. Runner front face at
;;; frontT + 3 from the carcass front edge; first hole +37, rear hole at
;;; the NL column from the map. NL not on the map => NO hole is invented
;;; - the template prints the refusal (yellow-spec grammar).
(defun drawSHOE_RUNNER_TEMPLATE (x0 y0 frontT posZ nl / face yAx r col)
  (setq face (+ x0 frontT SHOE_SETBACK_X))
  (setq yAx (+ y0 posZ SHOE_FIX_AXIS))
  (setq r (/ SHOE_RUNFIX_D 2.0))
  (setq col (cdr (assoc nl SHOE_RUNNER_MAP)))
  (if col
    (progn
      (drawCircle "SHOE_RUNNER_5MM" (+ face SHOE_RUNNER_FRONT_FIX) yAx r)
      (drawCircle "SHOE_RUNNER_5MM" (+ face col) yAx r)
      (drawText "SUMMARY" (+ face (/ col 2.0)) (+ yAx 20.0) 8.0
        (strcat "CARCASS SIDE - RUNNER NL" (itoa nl)
                ": face=frontT+3, fix 37 + " (rtos col 2 1))))
    (drawText "SUMMARY" face (+ yAx 20.0) 8.0
      (strcat "RUNNER NL" (itoa nl)
              " NOT ON THE SHEET - no hole invented (owner to fill)"))))

;;;========================================
;;; F. MAIN COMMAND
;;;========================================

(defun c:SHOE_BOX ( / variant openingW depth G frontT hingedL hingedR
                     nDiv posZ nl boxW innerW run rear ang slopeLen
                     pt x0 y0 cx odstep boxFrontX
                     _oldCmdecho _oldOsmode _oldClayer _olderr)

  ;; Save state
  (setq _oldCmdecho (getvar "CMDECHO"))
  (setq _oldOsmode  (getvar "OSMODE"))
  (setq _oldClayer  (getvar "CLAYER"))
  (setq _olderr *error*)

  ;; Error handler
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
  (shoeMakeLayers)

  ;; === INPUT ===
  (setq variant (getstring "\nVariant [F=Fix (screwed), D=Drawer (runners)] <F>: "))
  (if (= variant "") (setq variant "F"))
  (setq variant (strcase variant))
  (if (not (or (= variant "F") (= variant "D"))) (setq variant "F"))

  (setq openingW (getreal "\nBay clear OPENING width [mm] <564>: "))
  (if (or (null openingW) (<= openingW 0.0)) (setq openingW 564.0))

  (setq depth (getreal "\nBox DEPTH [mm] <450>: "))
  (if (or (null depth) (<= depth 0.0)) (setq depth 450.0))

  (setq G (getreal "\nBoard THICKNESS G [mm] <18>: "))
  (if (or (null G) (<= G 0.0)) (setq G 18.0))

  (setq nDiv (getint "\nDivider [0 or 1] <1>: "))
  (if (null nDiv) (setq nDiv 1))
  (if (< nDiv 0) (setq nDiv 0))
  (if (> nDiv 1) (setq nDiv 1))

  (setq posZ (getreal "\nPosition - height from bay floor [mm] <0>: "))
  (if (null posZ) (setq posZ 0.0))
  (if (< posZ 0.0) (setq posZ 0.0))

  (setq frontT 18.0)
  (setq hingedL 0) (setq hingedR 0)
  (if (= variant "D")
    (progn
      (setq frontT (getreal "\nFRONT thickness [mm] <18>: "))
      (if (or (null frontT) (<= frontT 0.0)) (setq frontT 18.0))
      (setq hingedL (getint "\nHinged door on LEFT side? [1=yes 0=no] <0>: "))
      (if (null hingedL) (setq hingedL 0))
      (setq hingedR (getint "\nHinged door on RIGHT side? [1=yes 0=no] <0>: "))
      (if (null hingedR) (setq hingedR 0))
      (setq nl (getint "\nRunner NL from the ladder [150..700 step 50] <450>: "))
      (if (null nl) (setq nl 450))))

  ;; === WIDTH LAW ===
  (setq boxW openingW)
  (if (= variant "D")
    (setq boxW (- openingW (* 2.0 SHOE_RUNNER_W)
                  (* SHOE_INFILL (+ hingedL hingedR)))))
  (setq innerW (- boxW (* 2.0 G)))

  ;; === SLOPE LAW ===
  (setq run (- depth (* 2.0 G)))
  (setq rear (shoeRearEdge run G))
  (setq ang (shoeAngle run rear))
  (setq slopeLen (sqrt (+ (* run run) (* rear rear))))

  ;; === PLACE ===
  (setq pt (getpoint "\nInsertion point (bottom-left of the layout): "))
  (if (null pt) (setq pt (list 0.0 0.0 0.0)))
  (setq x0 (car pt) y0 (cadr pt))
  (setq odstep 100.0)
  (setq cx x0)

  ;; Panels, left to right
  (drawSHOE_SIDE cx y0 depth G rear "SIDE L")
  (setq cx (+ cx depth odstep))
  (drawSHOE_SIDE cx y0 depth G rear "SIDE R")
  (setq cx (+ cx depth odstep))
  (drawSHOE_BACK cx y0 innerW G rear)
  (setq cx (+ cx innerW odstep))
  (drawSHOE_BOXFRONT cx y0 innerW G)
  (setq cx (+ cx innerW odstep))
  (drawSHOE_BOTTOM cx y0 innerW slopeLen)
  (setq cx (+ cx innerW (* 2.0 SHOE_GROOVE_D) odstep))
  (if (= nDiv 1)
    (progn
      (drawSHOE_DIVIDER cx y0 innerW)
      (setq cx (+ cx innerW odstep))))
  (drawSHOE_FRONT cx y0 (if (= variant "F") openingW boxW) variant)
  (setq cx (+ cx (if (= variant "F") openingW boxW) odstep))

  ;; INFILL per hinged side (DRAWER only) - law above.
  (if (and (= variant "D") (= hingedL 1))
    (progn (drawSHOE_INFILL cx y0 depth G "L")
           (setq cx (+ cx depth odstep))))
  (if (and (= variant "D") (= hingedR 1))
    (progn (drawSHOE_INFILL cx y0 depth G "R")
           (setq cx (+ cx depth odstep))))

  ;; Carcass-side template (second row, above the panels)
  (setq boxFrontX (+ frontT SHOE_SETBACK_X))
  (if (= variant "F")
    (drawSHOE_FIX_TEMPLATE x0 (+ y0 SHOE_FRONT_H 80.0) boxFrontX depth posZ)
    (drawSHOE_RUNNER_TEMPLATE x0 (+ y0 SHOE_FRONT_H 80.0) frontT posZ nl))

  ;; Summary
  (drawText "SUMMARY" x0 (- y0 30.0) 10.0
    (strcat "SHOE BOX " (if (= variant "F") "FIX" "DRAWER")
            "  boxW=" (rtos boxW 2 1)
            "  depth=" (rtos depth 2 0)
            "  rear=" (rtos rear 2 1)
            "  angle=" (rtos (/ (* ang 180.0) pi) 2 1) "deg"
            "  div=" (itoa nDiv)
            "  posZ=" (rtos posZ 2 0)))
  (princ (strcat "\nSHOE_BOX done. rear=" (rtos rear 2 1)
                 " angle=" (rtos (/ (* ang 180.0) pi) 2 1)
                 " deg, slopeLen=" (rtos slopeLen 2 1)))

  ;; Restore state
  (setvar "CLAYER"  _oldClayer)
  (setvar "OSMODE"  _oldOsmode)
  (setvar "CMDECHO" _oldCmdecho)
  (setq *error* _olderr)
  (princ))

(princ "\nKIT_SHOE_BOX loaded. Command: SHOE_BOX")
(princ)
