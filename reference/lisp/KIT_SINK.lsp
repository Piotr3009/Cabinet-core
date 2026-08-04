;;;========================================
;;; KIT_SINK.lsp
;;; Sink Base Unit - TOP + FRONT views + CNC panels
;;; Command: SINK_FULL
;;; Based on BUD_FULL with modifications:
;;;   - No TOP panel, replaced by 2 horizontal rails (100mm, on edge)
;;;   - Back panel: inside cabinet, 50mm from rear, screwed (no puzzles)
;;;   - BUL/BUR: no top puzzle sockets, no back tenons, rail screws, back screws
;;;   - Top hinge 50mm lower (clearance for rail)
;;;   - Shelf depth reduced by 50mm + G (back setback)
;;; Requires: SKYLON_COMMON.lsp loaded first
;;;========================================

;;; Auto-load COMMON if not already loaded
(if (null drawRect) (load "SKYLON_COMMON"))

;;;========================================
;;; A. SINK-SPECIFIC CNC FUNCTIONS
;;;========================================

;;; Draw SINK BUL - side panel without top sockets and without back tenons
;;; Straight rectangle outline, bottom puzzle sockets only
;;; Plus: rail screws at top, back panel screws at 37mm from back edge
(defun drawSINK_BUL (x0 y0 szer wys unitNum numShelves G drawHinges hingeHoleYList
                      backScrewX /
                      midX midY S shelfY i spacing hY halfG)
  (setq S (+ (/ G 2.0) 0.5))
  (setq halfG (/ G 2.0))
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  
  ;; Simple rectangle outline (no tenons)
  (drawRect "OUTLINE" x0 y0 (+ x0 szer) (+ y0 wys))
  
  ;; Puzzle sockets - BOTTOM edge only (for bottom panel)
  (drawRect "PUZZLE_SOCKET" (+ x0 95.0 -25.5) (- y0 6.0) (+ x0 95.0 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 -24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 24.5) (+ y0 S -1.0) 3.75)
  (drawRect "PUZZLE_SOCKET" (+ x0 szer -95.0 -25.5) (- y0 6.0) (+ x0 szer -95.0 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 -24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 24.5) (+ y0 S -1.0) 3.75)
  
  ;; Bottom panel screws (3 along bottom)
  (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" midX (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) (+ y0 S) 1.5)
  
  ;; Holder screws at top (front holder + back holder, G/2 from each edge)
  (drawCircle "SCREWS_3MM" (+ x0 halfG) (+ y0 wys -30.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 halfG) (+ y0 wys -70.0) 1.5)
  (drawCircle "SCREWS_3MM" (- (+ x0 szer) halfG) (+ y0 wys -30.0) 1.5)
  (drawCircle "SCREWS_3MM" (- (+ x0 szer) halfG) (+ y0 wys -70.0) 1.5)
  
  ;; Back panel screws (3 screws, 37mm from back edge)
  (drawCircle "SCREWS_3MM" (+ x0 backScrewX) (+ y0 100.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 backScrewX) midY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 backScrewX) (+ y0 wys -100.0) 1.5)
  
  ;; Hinges - PARAMETRIC from list (on front edge = left side)
  (if (and drawHinges hingeHoleYList)
    (foreach hY hingeHoleYList
      (drawCircle "HINGES_5MM" (+ x0 37.0) (+ y0 hY -16.0) 2.5)
      (drawCircle "HINGES_5MM" (+ x0 37.0) (+ y0 hY 16.0) 2.5)))
  
  ;; Shelf holes
  (if (> numShelves 0)
    (progn
      (setq spacing (/ (- wys (* 2.0 G)) (+ numShelves 1.0)))
      (setq i 1)
      (while (<= i numShelves)
        (setq shelfY (+ y0 G (* spacing i)))
        (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (- shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 70.0) shelfY 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (+ shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -120.0) (- shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -120.0) shelfY 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -120.0) (+ shelfY 50.0) 3.75)
        (setq i (1+ i)))))
  (drawText "UNIT_NUMBER" midX midY 40.0 unitNum))

;;; Draw SINK BUR - mirrored (hinges on right = back edge of panel)
(defun drawSINK_BUR (x0 y0 szer wys unitNum numShelves G drawHinges hingeHoleYList
                      backScrewX /
                      midX midY S shelfY i spacing hY halfG)
  (setq S (+ (/ G 2.0) 0.5))
  (setq halfG (/ G 2.0))
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  
  ;; Simple rectangle outline (no tenons)
  (drawRect "OUTLINE" x0 y0 (+ x0 szer) (+ y0 wys))
  
  ;; Puzzle sockets - BOTTOM edge only
  (drawRect "PUZZLE_SOCKET" (+ x0 95.0 -25.5) (- y0 6.0) (+ x0 95.0 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 -24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 24.5) (+ y0 S -1.0) 3.75)
  (drawRect "PUZZLE_SOCKET" (+ x0 szer -95.0 -25.5) (- y0 6.0) (+ x0 szer -95.0 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 -24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 24.5) (+ y0 S -1.0) 3.75)
  
  ;; Bottom panel screws
  (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" midX (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) (+ y0 S) 1.5)
  
  ;; Holder screws at top (front holder + back holder, G/2 from each edge)
  (drawCircle "SCREWS_3MM" (+ x0 halfG) (+ y0 wys -30.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 halfG) (+ y0 wys -70.0) 1.5)
  (drawCircle "SCREWS_3MM" (- (+ x0 szer) halfG) (+ y0 wys -30.0) 1.5)
  (drawCircle "SCREWS_3MM" (- (+ x0 szer) halfG) (+ y0 wys -70.0) 1.5)
  
  ;; Back panel screws (3 screws, 37mm from back edge - front edge of BUR)
  (drawCircle "SCREWS_3MM" (- (+ x0 szer) backScrewX) (+ y0 100.0) 1.5)
  (drawCircle "SCREWS_3MM" (- (+ x0 szer) backScrewX) midY 1.5)
  (drawCircle "SCREWS_3MM" (- (+ x0 szer) backScrewX) (+ y0 wys -100.0) 1.5)
  
  ;; Hinges - on back edge (right side of BUR panel)
  (if (and drawHinges hingeHoleYList)
    (foreach hY hingeHoleYList
      (drawCircle "HINGES_5MM" (- (+ x0 szer) 37.0) (+ y0 hY -16.0) 2.5)
      (drawCircle "HINGES_5MM" (- (+ x0 szer) 37.0) (+ y0 hY 16.0) 2.5)))
  
  ;; Shelf holes
  (if (> numShelves 0)
    (progn
      (setq spacing (/ (- wys (* 2.0 G)) (+ numShelves 1.0)))
      (setq i 1)
      (while (<= i numShelves)
        (setq shelfY (+ y0 G (* spacing i)))
        (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (- shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 70.0) shelfY 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (+ shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -120.0) (- shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -120.0) shelfY 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -120.0) (+ shelfY 50.0) 3.75)
        (setq i (1+ i)))))
  (drawText "UNIT_NUMBER" midX midY 40.0 unitNum))

;;; Draw SINK BACK panel - simple rectangle, no puzzles
(defun drawSINK_BACK (x0 y0 szer wys unitNum / midX midY)
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  (drawRect "OUTLINE" x0 y0 (+ x0 szer) (+ y0 wys))
  (drawText "UNIT_NUMBER" midX midY 40.0 (strcat unitNum "-BACK")))

;;; Draw SINK RAIL panel - horizontal stiffener (szer x 100mm)
(defun drawSINK_RAIL (x0 y0 szer railH unitNum label / midX midY)
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ railH 2.0)))
  (drawRect "OUTLINE" x0 y0 (+ x0 szer) (+ y0 railH))
  (drawText "UNIT_NUMBER" midX midY 30.0 (strcat unitNum "-" label)))

;;; Draw SINK BOTTOM panel - rotated 90, NO puzzles on LEFT edge (back of cabinet)
;;; Tenons on: top edge (BUR), bottom edge (BUL), right edge (front). Left = straight (back, no puzzle)
(defun drawSINK_BOTTOM (x0 y0 szer wys unitNum G / midX midY t1y t2y t1x t2x pts)
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  (setq t1y (+ y0 95.0) t2y (+ y0 wys -95.0))
  (setq t1x (+ x0 95.0) t2x (+ x0 szer -95.0))
  
  (setq pts (list
    (list x0 y0) (list (+ x0 szer) y0)
    ;; Right edge - straight (front of cabinet)
    (list (+ x0 szer) (+ y0 wys))
    ;; Top edge - with tenons (BUR side)
    (list (+ t2x 25.0) (+ y0 wys)) (list (+ t2x 19.0) (+ y0 wys))
    (list (+ t2x 19.0) (+ y0 wys 10.5)) (list (+ t2x 25.0) (+ y0 wys 10.5))
    (list (+ t2x 25.0) (+ y0 wys G)) (list (- t2x 25.0) (+ y0 wys G))
    (list (- t2x 25.0) (+ y0 wys 10.5)) (list (- t2x 19.0) (+ y0 wys 10.5))
    (list (- t2x 19.0) (+ y0 wys)) (list (- t2x 25.0) (+ y0 wys))
    (list (+ t1x 25.0) (+ y0 wys)) (list (+ t1x 19.0) (+ y0 wys))
    (list (+ t1x 19.0) (+ y0 wys 10.5)) (list (+ t1x 25.0) (+ y0 wys 10.5))
    (list (+ t1x 25.0) (+ y0 wys G)) (list (- t1x 25.0) (+ y0 wys G))
    (list (- t1x 25.0) (+ y0 wys 10.5)) (list (- t1x 19.0) (+ y0 wys 10.5))
    (list (- t1x 19.0) (+ y0 wys)) (list (- t1x 25.0) (+ y0 wys))
    (list x0 (+ y0 wys))
    ;; Left edge - STRAIGHT (back of cabinet, no puzzle)
    (list x0 y0)
    ;; Bottom edge - with tenons (BUL side)
    (list (- t1x 25.0) y0) (list (- t1x 19.0) y0)
    (list (- t1x 19.0) (- y0 10.5)) (list (- t1x 25.0) (- y0 10.5))
    (list (- t1x 25.0) (- y0 G)) (list (+ t1x 25.0) (- y0 G))
    (list (+ t1x 25.0) (- y0 10.5)) (list (+ t1x 19.0) (- y0 10.5))
    (list (+ t1x 19.0) y0) (list (+ t1x 25.0) y0)
    (list (- t2x 25.0) y0) (list (- t2x 19.0) y0)
    (list (- t2x 19.0) (- y0 10.5)) (list (- t2x 25.0) (- y0 10.5))
    (list (- t2x 25.0) (- y0 G)) (list (+ t2x 25.0) (- y0 G))
    (list (+ t2x 25.0) (- y0 10.5)) (list (+ t2x 19.0) (- y0 10.5))
    (list (+ t2x 19.0) y0) (list (+ t2x 25.0) y0)))
  (makePolyline "OUTLINE" pts)
  
  ;; Dog bones - top edge and bottom edge only (no left/back)
  (drawRect "PUZZLE_DOG_BONES" (- t1x 30.0) (+ y0 wys) (+ t1x 30.0) (+ y0 wys G))
  (drawRect "PUZZLE_DOG_BONES" (- t2x 30.0) (+ y0 wys) (+ t2x 30.0) (+ y0 wys G))
  (drawRect "PUZZLE_DOG_BONES" (- t1x 30.0) (- y0 G) (+ t1x 30.0) y0)
  (drawRect "PUZZLE_DOG_BONES" (- t2x 30.0) (- y0 G) (+ t2x 30.0) y0)
  
  (drawText "UNIT_NUMBER" midX midY 40.0 unitNum))

;;;========================================
;;; B. FRONT VIEW HELPERS
;;;========================================

;;; Draw SINK front carcase (BUL + BUR + BOTTOM + 2 rails instead of TOP)
(defun drawSinkFrontCarcase (x0 y0 szer wys G railH /)
  ;; BUL
  (drawRect "CARCASE" x0 y0 (+ x0 G) (+ y0 wys))
  ;; BUR
  (drawRect "CARCASE" (- (+ x0 szer) G) y0 (+ x0 szer) (+ y0 wys))
  ;; BOTTOM
  (drawRect "CARCASE" (+ x0 G) y0 (- (+ x0 szer) G) (+ y0 G))
  ;; FRONT RAIL (at top, front edge - shown as line at top)
  (drawRect "CARCASE" (+ x0 G) (- (+ y0 wys) railH) (- (+ x0 szer) G) (+ y0 wys)))

;;; Draw SINK front shelves (reduced depth shown as narrower)
(defun drawSinkFrontShelves (x0 y0 szer wys G numShelves / spacing shelfY i shelfX1 shelfX2)
  (if (> numShelves 0)
    (progn
      (setq shelfX1 (+ x0 G 2.0))
      (setq shelfX2 (- (+ x0 szer) G 2.0))
      (setq spacing (/ (- wys (* 2.0 G)) (+ numShelves 1.0)))
      (setq i 1)
      (while (<= i numShelves)
        (setq shelfY (+ y0 G (* spacing i)))
        (drawRect "CARCASE" shelfX1 shelfY shelfX2 (+ shelfY G))
        (setq i (1+ i))))))

;;;========================================
;;; C. MAIN SINK COMMAND
;;;========================================
(defun c:SINK_FULL ( / szerSzafki glSzafki gruboscPlyty gruboscDrzwi
                    numShelves unitNum pt x0 y0 doorType hingePos
                    wewSzer wewGl doorWidth numDoors doorGap
                    hingeX hingeY hingePositions hingeCupList hingeFrontYList
                    wysSzafki frontY1 frontY2
                    railH backSetback backH backW backScrewX
                    drawCNC cncX cncY cncPt cncStartX odstep
                    szerBUL wysBUL szerTOP wysTOP szerBACK wysBACK
                    szerSHELF wysSHELF szerFront wysFront szerRAIL i
                    sumX sumY lineH totalPanels totalSQM totalEdging numFronts
                    csvPath csvFile
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
  
  ;; === CONSTANTS ===
  (setq railH 100.0)          ;; rail height (on edge)
  (setq backSetback 50.0)     ;; back panel moved forward by 50mm
  
  ;; === INPUT ===
  (setq gruboscPlyty (getreal "\nBoard THICKNESS [mm] (18=standard, 22=heavy) <18>: "))
  (if (or (null gruboscPlyty) (<= gruboscPlyty 0.0)) (setq gruboscPlyty 18.0))
  
  (setq gruboscDrzwi (getreal "\nDoor THICKNESS [mm] (18=MDF, 19=melamine, 25=shaker) <25>: "))
  (if (or (null gruboscDrzwi) (<= gruboscDrzwi 0.0)) (setq gruboscDrzwi 25.0))
  
  (setq doorType (getstring "\nFront type [S=Shaker, H=Handleless (J-groove), F=Flat] <S>: "))
  (if (= doorType "") (setq doorType "S"))
  (setq doorType (strcase doorType))
  (if (not (or (= doorType "F") (= doorType "S") (= doorType "H"))) (setq doorType "S"))
  
  (setq szerSzafki (getreal "\nCabinet WIDTH [mm] <600>: "))
  (if (or (null szerSzafki) (<= szerSzafki 0.0)) (setq szerSzafki 600.0))
  
  (setq glSzafki (getreal "\nCabinet DEPTH [mm] <558>: "))
  (if (or (null glSzafki) (<= glSzafki 0.0)) (setq glSzafki 558.0))
  
  (setq wysSzafki (getreal "\nCabinet HEIGHT [mm] <770>: "))
  (if (or (null wysSzafki) (<= wysSzafki 0.0)) (setq wysSzafki 770.0))
  
  (setq numShelves (getint "\nNumber of SHELVES (0-10) <1>: "))
  (if (or (null numShelves) (< numShelves 0)) (setq numShelves 1))
  (if (> numShelves 10) (setq numShelves 10))
  
  ;; Determine number of doors
  (if (<= (- szerSzafki 4.0) 700.0)
    (setq numDoors 1)
    (setq numDoors 2))
  
  ;; Ask hinge position for single door
  (if (= numDoors 1)
    (progn
      (setq hingePos (getstring "\nHinge position [L=Left (BUL), R=Right (BUR)] <L>: "))
      (if (= hingePos "") (setq hingePos "L"))
      (setq hingePos (strcase hingePos))
      (if (not (or (= hingePos "L") (= hingePos "R"))) (setq hingePos "L"))))
  
  (setq unitNum (getstring T "\nUnit NUMBER (e.g. S01, S02): "))
  (if (= unitNum "") (setq unitNum "S01"))
  
  (setq pt (getpoint "\nInsertion point: "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))
  
  (setq x0 (car pt) y0 (cadr pt))
  (setq wewSzer (- szerSzafki (* 2.0 gruboscPlyty)))
  (setq wewGl (- glSzafki gruboscPlyty))
  (setq doorGap 3.0)
  
  ;; === BACK PANEL DIMENSIONS ===
  (setq backH (- wysSzafki 120.0 gruboscPlyty))
  (setq backW (- szerSzafki (* 2.0 gruboscPlyty) 4.0))
  
  ;; === RAIL DIMENSIONS ===
  (setq szerRAIL (- szerSzafki (* 2.0 gruboscPlyty)))
  
  ;; === HINGE POSITIONS (top hinge 50mm lower) ===
  ;; Normal base: 100, wys-300, wys-100
  ;; Sink: 100, wys-300, wys-150 (top hinge 50mm lower)
  (setq hingePositions (list 100.0 (- wysSzafki 300.0) (- wysSzafki 150.0)))
  (setq hingeFrontYList (list 70.0 (- wysSzafki 330.0) (- wysSzafki 180.0)))
  
  ;; === SCREW POSITIONS ON BUL/BUR CNC ===
  ;; BUL CNC: X=depth, Y=height. Back edge = right side (x0+szer)
  ;; Back screws: 37mm from back edge
  (setq backScrewX (- (- glSzafki gruboscPlyty) 37.0))
  
  ;; === LAYERS ===
  (createViewLayers)
  
  ;;;========================================
  ;;; TOP VIEW
  ;;;========================================
  ;; CARCASE outer
  (drawRect "CARCASE" x0 y0 (+ x0 szerSzafki) (+ y0 glSzafki))
  ;; BUL
  (drawRect "CARCASE" x0 y0 (+ x0 gruboscPlyty) (+ y0 glSzafki))
  ;; BUR
  (drawRect "CARCASE" (- (+ x0 szerSzafki) gruboscPlyty) y0 (+ x0 szerSzafki) (+ y0 glSzafki))
  ;; BOTTOM (behind legs area)
  (drawRect "CARCASE" (+ x0 gruboscPlyty) y0 (- (+ x0 szerSzafki) gruboscPlyty) (+ y0 gruboscPlyty))
  ;; FRONT HOLDER (at top, front edge - INSIDE cabinet)
  (drawRect "CARCASE"
    (+ x0 gruboscPlyty) y0
    (- (+ x0 szerSzafki) gruboscPlyty) (+ y0 gruboscPlyty))
  ;; BACK HOLDER (at top, back edge - INSIDE cabinet)
  (drawRect "CARCASE"
    (+ x0 gruboscPlyty) (- (+ y0 glSzafki) gruboscPlyty)
    (- (+ x0 szerSzafki) gruboscPlyty) (+ y0 glSzafki))
  ;; BACK PANEL (50mm from rear, inside)
  (drawRect "CARCASE"
    (+ x0 gruboscPlyty 2.0) (+ y0 glSzafki (- backSetback) (- gruboscPlyty))
    (- (+ x0 szerSzafki) gruboscPlyty 2.0) (+ y0 glSzafki (- backSetback)))
  
  ;; SHELVES
  (if (> numShelves 0)
    (drawRect "SHELVES" 
      (+ x0 gruboscPlyty 2.0)
      (+ y0 20.0)
      (- (+ x0 szerSzafki) gruboscPlyty 2.0)
      (+ y0 glSzafki (- backSetback) (- gruboscPlyty))))
  
  ;; DOORS + HINGES
  (if (= numDoors 1)
    (progn
      (drawDoor (+ x0 1.5) (- y0 doorGap gruboscDrzwi) (- (+ x0 szerSzafki) 1.5) (- y0 doorGap) doorType)
      (setq hingeY (+ y0 7.14))
      (if (= hingePos "L")
        (drawHinge (+ x0 gruboscPlyty) hingeY "L")
        (drawHinge (- (+ x0 szerSzafki) gruboscPlyty) hingeY "R")))
    (progn
      (setq doorWidth (/ (- szerSzafki 3.0 3.0) 2.0))
      (drawDoor (+ x0 1.5) (- y0 doorGap gruboscDrzwi) (+ x0 1.5 doorWidth) (- y0 doorGap) doorType)
      (drawHinge (+ x0 gruboscPlyty) (+ y0 7.14) "L")
      (drawDoor (- (+ x0 szerSzafki) 1.5 doorWidth) (- y0 doorGap gruboscDrzwi) (- (+ x0 szerSzafki) 1.5) (- y0 doorGap) doorType)
      (drawHinge (- (+ x0 szerSzafki) gruboscPlyty) (+ y0 7.14) "R")))
  
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ y0 (/ glSzafki 2.0)) 30.0 unitNum)
  (drawDimH x0 (+ x0 szerSzafki) (+ y0 glSzafki))
  
  ;;;========================================
  ;;; FRONT VIEW
  ;;;========================================
  (setq frontY1 (+ y0 glSzafki 600.0))
  (setq frontY2 (+ frontY1 wysSzafki 1800.0))
  
  ;; FRONT VIEW 1 - carcase + hinges + legs + shelves
  (drawSinkFrontCarcase x0 frontY1 szerSzafki wysSzafki gruboscPlyty railH)
  (drawSinkFrontShelves x0 frontY1 szerSzafki wysSzafki gruboscPlyty numShelves)
  (drawFrontHinges x0 frontY1 szerSzafki wysSzafki gruboscPlyty numDoors hingePos unitNum hingeFrontYList)
  (drawLegPair x0 frontY1 szerSzafki gruboscPlyty)
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ frontY1 (/ wysSzafki 2.0)) 30.0 unitNum)
  (drawDimHFront x0 (+ x0 szerSzafki) frontY1)
  
  ;; FRONT VIEW 2 - carcase outline + doors (MAGENTA) + legs
  (drawFrontCarcaseOutline x0 frontY2 szerSzafki wysSzafki unitNum)
  (drawLegPair x0 frontY2 szerSzafki gruboscPlyty)
  (if (= numDoors 1)
    (drawFrontDoorSingle x0 frontY2 szerSzafki wysSzafki doorType hingePos)
    (drawFrontDoorDouble x0 frontY2 szerSzafki wysSzafki doorType))
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ frontY2 (/ wysSzafki 2.0)) 30.0 unitNum)
  (drawDimHFront (+ x0 1.5) (- (+ x0 szerSzafki) 1.5) frontY2)
  
  ;;;========================================
  ;;; CNC PANELS - optional
  ;;;========================================
  (setq drawCNC (getstring "\nDraw CNC panels? [Y/N] <N>: "))
  (if (= drawCNC "") (setq drawCNC "N"))
  (setq drawCNC (strcase drawCNC))
  
  (if (= drawCNC "Y")
    (progn
      (createCNCLayers)
      
      ;; Panel dimensions
      (setq szerBUL (- glSzafki gruboscPlyty) wysBUL wysSzafki)
      ;; No TOP panel - replaced by rails
      (setq szerTOP (- szerSzafki (* 2.0 gruboscPlyty)) wysTOP (- glSzafki gruboscPlyty))
      ;; BACK panel: reduced
      (setq szerBACK backW wysBACK backH)
      ;; SHELF: depth reduced by backSetback + G
      (setq szerSHELF (- szerSzafki (* 2.0 gruboscPlyty) 4.0)
            wysSHELF (- glSzafki gruboscPlyty 20.0 backSetback gruboscPlyty))
      
      ;; FRONT panel dimensions
      (if (= numDoors 1)
        (setq szerFront (- szerSzafki 3.0) wysFront (- wysSzafki 3.0))
        (setq szerFront (/ (- szerSzafki 6.0) 2.0) wysFront (- wysSzafki 3.0)))
      
      ;; Hinge cups on front (shifted top hinge)
      (setq hingeCupList (list 100.0 (- wysFront 297.0) (- wysFront 147.0)))
      
      ;; CNC insertion point
      (setq cncPt (getpoint "\nClick insertion point for CNC panels: "))
      (if (null cncPt)
        (princ "\nNo point selected. CNC cancelled.")
        (progn
          (setq cncX (car cncPt))
          (setq cncY (cadr cncPt))
          (setq cncStartX cncX)
          (setq odstep 50.0)
      
      ;; BUL
      (drawSINK_BUL cncX cncY szerBUL wysBUL unitNum numShelves gruboscPlyty
        (or (= numDoors 2) (= hingePos "L"))
        (if (or (= numDoors 2) (= hingePos "L"))
          (list (- wysSzafki 150.0) (- wysSzafki 300.0) 100.0)
          nil)
        backScrewX)
      (setq cncX (+ cncX szerBUL odstep))
      
      ;; BUR
      (drawSINK_BUR cncX cncY szerBUL wysBUL unitNum numShelves gruboscPlyty
        (or (= numDoors 2) (= hingePos "R"))
        (if (or (= numDoors 2) (= hingePos "R"))
          (list (- wysSzafki 150.0) (- wysSzafki 300.0) 100.0)
          nil)
        backScrewX)
      (setq cncX (+ cncX szerBUL odstep))
      
      ;; BOTTOM (rotated 90, no back puzzles)
      (drawSINK_BOTTOM cncX cncY wysTOP szerTOP unitNum gruboscPlyty)
      (setq cncX (+ cncX wysTOP odstep))
      
      ;; BACK (simple, no puzzles)
      (drawSINK_BACK cncX cncY szerBACK wysBACK unitNum)
      (setq cncX (+ cncX szerBACK odstep))
      
      ;; RAILS/HOLDERS (2x, rotated 90 - along grain)
      (drawSINK_RAIL cncX cncY railH szerRAIL unitNum "HOLDER-F")
      (setq cncX (+ cncX railH odstep))
      (drawSINK_RAIL cncX cncY railH szerRAIL unitNum "HOLDER-B")
      (setq cncX (+ cncX railH odstep))
      
      ;; SHELVES
      (setq i 1)
      (while (<= i numShelves)
        (drawSHELF cncX cncY szerSHELF wysSHELF unitNum i)
        (setq cncX (+ cncX szerSHELF odstep))
        (setq i (1+ i)))
      
      ;; FRONT panels
      (setq cncX (+ cncX 100.0))
      (if (= numDoors 1)
        (progn
          (drawFRONT cncX cncY szerFront wysFront unitNum (strcat unitNum "-F") hingePos hingeCupList)
          (setq cncX (+ cncX szerFront odstep)))
        (progn
          (drawFRONT cncX cncY szerFront wysFront unitNum (strcat unitNum "-FL") "L" hingeCupList)
          (setq cncX (+ cncX szerFront odstep))
          (drawFRONT cncX cncY szerFront wysFront unitNum (strcat unitNum "-FR") "R" hingeCupList)
          (setq cncX (+ cncX szerFront odstep))))
      
      ;;;========================================
      ;;; SUMMARY TEXT BLOCK
      ;;;========================================
      (setq sumX (+ cncX 500.0))
      (setq sumY (+ cncY wysBUL))
      (setq lineH 30.0)
      
      (setq totalPanels (+ 4 2 numShelves))  ;; BUL+BUR+BOTTOM+BACK + 2 rails + shelves
      (setq numFronts (if (= numDoors 1) 1 2))
      
      (setq totalSQM (+
        (* szerBUL wysBUL 2.0)
        (* szerTOP wysTOP)          ;; only 1 bottom, no top
        (* szerBACK wysBACK)
        (* szerRAIL railH 2.0)
        (* szerSHELF wysSHELF numShelves)))
      (setq totalSQM (/ totalSQM 1000000.0))
      
      (setq totalEdging (+
        (* wysBUL 2.0)
        (* szerTOP 1.0)             ;; only bottom
        (* szerRAIL 2.0)
        (* szerSHELF numShelves)))
      (setq totalEdging (/ totalEdging 1000.0))
      
      ;; UNIT SUMMARY
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "UNIT: " unitNum " (SINK)"))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH "---------")
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "1. BUL: " (rtos szerBUL 2 0) " x " (rtos wysBUL 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "2. BUR: " (rtos szerBUL 2 0) " x " (rtos wysBUL 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "3. BOTTOM: " (rtos szerTOP 2 0) " x " (rtos wysTOP 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "4. BACK: " (rtos szerBACK 2 0) " x " (rtos wysBACK 2 0) " (inside, 50mm fwd)"))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "5. HOLDER-F: " (rtos railH 2 0) " x " (rtos szerRAIL 2 0) " (rotated)"))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "6. HOLDER-B: " (rtos railH 2 0) " x " (rtos szerRAIL 2 0) " (rotated)"))
      (setq sumY (- sumY (* lineH 1.2)))
      (if (> numShelves 0)
        (progn
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "7. SHELF: " (rtos szerSHELF 2 0) " x " (rtos wysSHELF 2 0) (if (> numShelves 1) (strcat " x" (itoa numShelves)) "")))
          (setq sumY (- sumY (* lineH 1.2)))))
      (drawTextL "SUMMARY" sumX sumY lineH "---------")
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "PANELS: " (itoa totalPanels)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "SQM: " (rtos totalSQM 2 2) " m2"))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "EDGING: " (rtos totalEdging 2 2) " m"))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH "---------")
      (setq sumY (- sumY (* lineH 2.5)))
      
      ;; FRONT SUMMARY (magenta)
      (drawTextLC "SUMMARY" sumX sumY lineH "FRONT (MAGENTA)" 6)
      (setq sumY (- sumY (* lineH 1.2)))
      (if (= numDoors 1)
        (progn
          (drawTextLC "SUMMARY" sumX sumY lineH (strcat "1. " unitNum "-F: " (rtos szerFront 2 0) " x " (rtos wysFront 2 0)) 6)
          (setq sumY (- sumY (* lineH 1.2))))
        (progn
          (drawTextLC "SUMMARY" sumX sumY lineH (strcat "1. " unitNum "-FL: " (rtos szerFront 2 0) " x " (rtos wysFront 2 0)) 6)
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextLC "SUMMARY" sumX sumY lineH (strcat "2. " unitNum "-FR: " (rtos szerFront 2 0) " x " (rtos wysFront 2 0)) 6)
          (setq sumY (- sumY (* lineH 1.2)))))
      (drawTextLC "SUMMARY" sumX sumY lineH "---------" 6)
      (setq sumY (- sumY (* lineH 2.0)))
      (drawTextLC "SUMMARY" sumX sumY lineH "Property of Skylon Joinery" 6)
      
      (princ "\nCNC panels generated.")))))
  
  ;;;========================================
  ;;; LABELS CSV
  ;;;========================================
  (if szerBUL
    (progn
      (setq csvPath (findfile "KIT_SINK.lsp"))
      (if csvPath
        (setq csvPath (strcat (vl-filename-directory csvPath) "\\SKYLON_labels.csv"))
        (progn
          (setq csvPath (getvar "DWGPREFIX"))
          (if (= csvPath "") (setq csvPath (strcat (getenv "USERPROFILE") "\\Desktop\\")))
          (setq csvPath (strcat csvPath "SKYLON_labels.csv"))))
      (if (findfile csvPath)
        (setq csvFile (open csvPath "a"))
        (progn
          (setq csvFile (open csvPath "w"))
          (if csvFile (write-line "UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM" csvFile))))
      (if csvFile
        (progn
          (write-line (strcat unitNum ",BUL," (rtos szerBUL 2 0) "," (rtos wysBUL 2 0) ",<,"
            (rtos (/ wysBUL 1000.0) 2 2) "," (rtos (/ (* szerBUL wysBUL) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BUR," (rtos szerBUL 2 0) "," (rtos wysBUL 2 0) ",>,"
            (rtos (/ wysBUL 1000.0) 2 2) "," (rtos (/ (* szerBUL wysBUL) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BOTTOM," (rtos szerTOP 2 0) "," (rtos wysTOP 2 0) ",>,"
            (rtos (/ szerTOP 1000.0) 2 2) "," (rtos (/ (* szerTOP wysTOP) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BACK," (rtos szerBACK 2 0) "," (rtos wysBACK 2 0) ",,0,"
            (rtos (/ (* szerBACK wysBACK) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",HOLDER-F," (rtos railH 2 0) "," (rtos szerRAIL 2 0) ",,0,"
            (rtos (/ (* railH szerRAIL) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",HOLDER-B," (rtos railH 2 0) "," (rtos szerRAIL 2 0) ",,0,"
            (rtos (/ (* railH szerRAIL) 1000000.0) 2 3)) csvFile)
          (setq i 1)
          (while (<= i numShelves)
            (write-line (strcat unitNum ",SHELF-" (itoa i) "," (rtos szerSHELF 2 0) "," (rtos wysSHELF 2 0) ",>,"
              (rtos (/ szerSHELF 1000.0) 2 2) "," (rtos (/ (* szerSHELF wysSHELF) 1000000.0) 2 3)) csvFile)
            (setq i (1+ i)))
          (if (= numDoors 1)
            (write-line (strcat unitNum "," unitNum "-F," (rtos szerFront 2 0) "," (rtos wysFront 2 0) ",<>^v,"
              (rtos (/ (+ (* 2.0 szerFront) (* 2.0 wysFront)) 1000.0) 2 2) "," (rtos (/ (* szerFront wysFront) 1000000.0) 2 3)) csvFile)
            (progn
              (write-line (strcat unitNum "," unitNum "-FL," (rtos szerFront 2 0) "," (rtos wysFront 2 0) ",<>^v,"
                (rtos (/ (+ (* 2.0 szerFront) (* 2.0 wysFront)) 1000.0) 2 2) "," (rtos (/ (* szerFront wysFront) 1000000.0) 2 3)) csvFile)
              (write-line (strcat unitNum "," unitNum "-FR," (rtos szerFront 2 0) "," (rtos wysFront 2 0) ",<>^v,"
                (rtos (/ (+ (* 2.0 szerFront) (* 2.0 wysFront)) 1000.0) 2 2) "," (rtos (/ (* szerFront wysFront) 1000000.0) 2 3)) csvFile)))
          (close csvFile)
          (princ (strcat "\nLabels appended to: " csvPath)))
        (princ "\nERROR: Cannot open labels CSV file."))))
  
  ;; Restore state
  (if _oldClayer  (setvar "CLAYER"  _oldClayer))
  (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
  (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
  (setq *error* _olderr)
  
  (princ (strcat "\nSINK_FULL " unitNum " - Done! (" (itoa numDoors) " " (cond ((= doorType "S") "Shaker") ((= doorType "H") "Handleless") (T "Flat")) " door(s))"))
  (princ (strcat "\n  Cabinet: " (rtos szerSzafki 2 0) "x" (rtos wysSzafki 2 0) "x" (rtos glSzafki 2 0) "mm, G=" (rtos gruboscPlyty 2 0) "mm"))
  (princ (strcat "\n  Back: " (rtos backW 2 0) "x" (rtos backH 2 0) "mm (50mm forward, screwed)"))
  (princ (strcat "\n  Holders: 2x " (rtos railH 2 0) "x" (rtos szerRAIL 2 0) "mm (rotated 90)"))
  (if (= numDoors 1)
    (princ (strcat "\n  Front: " (rtos (- szerSzafki 3.0) 2 0) "x" (rtos (- wysSzafki 3.0) 2 0) "mm, hinge " hingePos))
    (princ (strcat "\n  Fronts: 2x " (rtos (/ (- szerSzafki 6.0) 2.0) 2 0) "x" (rtos (- wysSzafki 3.0) 2 0) "mm")))
  (princ (strcat "\n  Shelves: " (itoa numShelves) ", CNC: " (if (= drawCNC "Y") "Yes" "No")))
  (princ))

(princ "\nKIT_SINK loaded. Type SINK_FULL to run.")
(princ)
