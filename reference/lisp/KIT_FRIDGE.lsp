;;;========================================
;;; KIT_FRIDGE.lsp
;;; Fridge Tall Unit - built-in fridge housing
;;; Command: FRIDGE_FULL
;;; Always 6 hinges (min height ~2100mm)
;;; Back: 2 rails (250mm) + full back above fixed panel
;;; Fixed panel at fridgeH (1786mm default)
;;; Spurs panel on 25x25 wood blocks above fixed panel
;;; Requires: SKYLON_COMMON.lsp loaded first
;;;========================================

;;; Auto-load COMMON if not already loaded
(if (null drawRect) (load "SKYLON_COMMON"))

;;;========================================
;;; Main FRIDGE command
;;;========================================
(defun c:FRIDGE_FULL ( / szerSzafki glSzafki gruboscPlyty gruboscDrzwi
                    unitNum pt x0 y0 doorType hingePos
                    wewSzer wewGl doorWidth numDoors doorGap
                    hingeX hingeY lastEnt hingePositions hingeCupList hingeFrontYList
                    wysSzafki frontY1 frontY2 numHinges
                    fridgeH fixedPanelY spursH
                    rail1Y rail2Y railW
                    szerBACKTOP wysBACKTOP
                    szerFIXED wysFIXED
                    szerSPURS wysSPURS
                    szerRAIL wysRAIL
                    drawCNC cncX cncY cncStartX odstep
                    szerBUL wysBUL szerTOP wysTOP
                    szerFront wysFront i S t1x t2x midRailY
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
  
  (setq wysSzafki (getreal "\nCabinet HEIGHT [mm] (min 1900) <2100>: "))
  (if (or (null wysSzafki) (< wysSzafki 1900.0)) (setq wysSzafki 2100.0))
  
  (setq glSzafki (getreal "\nCabinet DEPTH [mm] <558>: "))
  (if (or (null glSzafki) (<= glSzafki 0.0)) (setq glSzafki 558.0))
  
  (setq fridgeH (getreal "\nFridge HEIGHT [mm] (inner clearance) <1786>: "))
  (if (or (null fridgeH) (<= fridgeH 0.0)) (setq fridgeH 1786.0))
  
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
  
  (setq unitNum (getstring T "\nUnit NUMBER (e.g. F01, F02): "))
  (if (= unitNum "") (setq unitNum "F01"))
  
  (setq pt (getpoint "\nInsertion point: "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))
  
  (setq x0 (car pt) y0 (cadr pt))
  (setq wewSzer (- szerSzafki (* 2.0 gruboscPlyty)))
  (setq wewGl (- glSzafki gruboscPlyty))
  (setq doorGap 3.0)
  
  ;; === FRIDGE-SPECIFIC CALCULATIONS ===
  ;; Fixed panel Y (from bottom of cabinet interior = from top of BOTTOM panel)
  (setq fixedPanelY (+ gruboscPlyty fridgeH))
  ;; Spurs panel height (from fixed panel to underside of TOP)
  (setq spursH (- wysSzafki fixedPanelY gruboscPlyty))
  ;; Rail strips - full back width, 200mm height
  (setq railW 200.0)
  (setq rail1Y 0.0)  ;; bottom rail starts at bottom panel
  (setq rail2Y (/ fridgeH 2.0))  ;; middle of fridge zone (center)
  ;; All back panels = full cabinet width (like normal BACK)
  (setq szerRAIL szerSzafki)
  (setq wysRAIL railW)
  ;; Back-top panel (from fixed panel to TOP, +G to overlap fixed panel)
  (setq szerBACKTOP szerSzafki)
  (setq wysBACKTOP (+ spursH gruboscPlyty))
  ;; Fixed panel dims (like TOP - between sides)
  (setq szerFIXED (- szerSzafki (* 2.0 gruboscPlyty)))
  (setq wysFIXED (- glSzafki gruboscPlyty))
  ;; Spurs panel dims (between sides, -2mm gap each side, height -G for clearance)
  (setq szerSPURS (- szerSzafki (* 2.0 gruboscPlyty) 8.0))
  (setq wysSPURS (- spursH gruboscPlyty))
  
  ;; Hinge positions - always 6 for tall fridge unit
  (setq hingePositions (calcHingePositionsTall wysSzafki))
  (setq numHinges (length hingePositions))
  (setq hingeFrontYList (mapcar '(lambda (p) (- p 30.0)) hingePositions))
  
  ;; === LAYERS ===
  (createViewLayers)
  (command "._LAYER" "_M" "APPLIANCES" "_C" "5" "APPLIANCES" "")
  
  ;;;========================================
  ;;; TOP VIEW
  ;;;========================================
  ;; CARCASE
  (drawRect "CARCASE" x0 y0 (+ x0 szerSzafki) (+ y0 glSzafki))
  (drawRect "CARCASE" x0 y0 (+ x0 gruboscPlyty) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" (- (+ x0 szerSzafki) gruboscPlyty) y0 (+ x0 szerSzafki) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" x0 (- (+ y0 glSzafki) gruboscPlyty) (+ x0 szerSzafki) (+ y0 glSzafki))
  
  ;; SPURS PANEL (100mm from front, shown in top view as thin line)
  (drawRect "CARCASE"
    (+ x0 gruboscPlyty) (+ y0 100.0)
    (- (+ x0 szerSzafki) gruboscPlyty) (+ y0 100.0 gruboscPlyty))
  
  ;; 25x25 wood blocks on BUL and BUR (for spurs panel)
  ;; Left block (on BUL inner face, front at 100+G from front)
  (drawRect "CARCASE" (+ x0 gruboscPlyty) (+ y0 100.0 gruboscPlyty) (+ x0 gruboscPlyty 25.0) (+ y0 100.0 gruboscPlyty 25.0))
  (drawLine "CARCASE" (+ x0 gruboscPlyty) (+ y0 100.0 gruboscPlyty) (+ x0 gruboscPlyty 25.0) (+ y0 100.0 gruboscPlyty 25.0))
  (drawLine "CARCASE" (+ x0 gruboscPlyty 25.0) (+ y0 100.0 gruboscPlyty) (+ x0 gruboscPlyty) (+ y0 100.0 gruboscPlyty 25.0))
  ;; Right block (on BUR inner face)
  (drawRect "CARCASE" (- (+ x0 szerSzafki) gruboscPlyty 25.0) (+ y0 100.0 gruboscPlyty) (- (+ x0 szerSzafki) gruboscPlyty) (+ y0 100.0 gruboscPlyty 25.0))
  (drawLine "CARCASE" (- (+ x0 szerSzafki) gruboscPlyty 25.0) (+ y0 100.0 gruboscPlyty) (- (+ x0 szerSzafki) gruboscPlyty) (+ y0 100.0 gruboscPlyty 25.0))
  (drawLine "CARCASE" (- (+ x0 szerSzafki) gruboscPlyty) (+ y0 100.0 gruboscPlyty) (- (+ x0 szerSzafki) gruboscPlyty 25.0) (+ y0 100.0 gruboscPlyty 25.0))
  
  ;; DOORS + HINGES (same as BUDTALL)
  (if (= numDoors 1)
    (progn
      (drawDoor (+ x0 1.5) (- y0 doorGap gruboscDrzwi) (- (+ x0 szerSzafki) 1.5) (- y0 doorGap) doorType)
      (setq hingeY (+ y0 7.14))
      (if (= hingePos "L")
        (progn
          (setq hingeX (+ x0 gruboscPlyty))
          (setq lastEnt (entlast))
          (drawHinge hingeX hingeY "L")
          (blockEntities lastEnt (strcat "HINGE_" unitNum "_L")))
        (progn
          (setq hingeX (- (+ x0 szerSzafki) gruboscPlyty))
          (setq lastEnt (entlast))
          (drawHinge hingeX hingeY "R")
          (blockEntities lastEnt (strcat "HINGE_" unitNum "_R")))))
    (progn
      (setq doorWidth (/ (- szerSzafki 3.0 3.0) 2.0))
      (drawDoor (+ x0 1.5) (- y0 doorGap gruboscDrzwi) (+ x0 1.5 doorWidth) (- y0 doorGap) doorType)
      (setq hingeX (+ x0 gruboscPlyty))
      (setq hingeY (+ y0 7.14))
      (setq lastEnt (entlast))
      (drawHinge hingeX hingeY "L")
      (blockEntities lastEnt (strcat "HINGE_" unitNum "_L"))
      
      (drawDoor (- (+ x0 szerSzafki) 1.5 doorWidth) (- y0 doorGap gruboscDrzwi) (- (+ x0 szerSzafki) 1.5) (- y0 doorGap) doorType)
      (setq hingeX (- (+ x0 szerSzafki) gruboscPlyty))
      (setq hingeY (+ y0 7.14))
      (setq lastEnt (entlast))
      (drawHinge hingeX hingeY "R")
      (blockEntities lastEnt (strcat "HINGE_" unitNum "_R"))))
  
  ;; UNIT NUMBER
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ y0 (/ glSzafki 2.0)) 30.0 unitNum)
  (drawDimH x0 (+ x0 szerSzafki) (+ y0 glSzafki))
  
  ;;;========================================
  ;;; FRONT VIEW
  ;;;========================================
  (setq frontY1 (+ y0 glSzafki 600.0))
  (setq frontY2 (+ frontY1 wysSzafki 1800.0))
  
  ;; FRONT VIEW 1 - carcase + fixed panel + rails + fridge block
  (drawFrontCarcase x0 frontY1 szerSzafki wysSzafki gruboscPlyty)
  (drawFrontHinges x0 frontY1 szerSzafki wysSzafki gruboscPlyty numDoors hingePos unitNum hingeFrontYList)
  (drawLegPair x0 frontY1 szerSzafki gruboscPlyty)
  
  ;; Fixed panel (horizontal line at fridgeH)
  (drawRect "CARCASE"
    (+ x0 gruboscPlyty) (+ frontY1 fixedPanelY)
    (- (+ x0 szerSzafki) gruboscPlyty) (+ frontY1 fixedPanelY gruboscPlyty))
  
  ;; Bottom rail strip (200mm, sitting on BOTTOM panel)
  (drawRect "CARCASE"
    x0 (+ frontY1 gruboscPlyty)
    (+ x0 szerSzafki) (+ frontY1 gruboscPlyty railW))
  ;; Middle rail strip (200mm, center of fridge zone)
  (drawRect "CARCASE"
    x0 (+ frontY1 gruboscPlyty rail2Y (- (/ railW 2.0)))
    (+ x0 szerSzafki) (+ frontY1 gruboscPlyty rail2Y (/ railW 2.0)))
  
  ;; Back-top (full back above fixed panel to TOP)
  (drawRect "CARCASE"
    x0 (+ frontY1 fixedPanelY gruboscPlyty)
    (+ x0 szerSzafki) (+ frontY1 wysSzafki (- gruboscPlyty)))
  
  ;; Spurs panel (thin line, 100mm from front)
  (drawLine "SHELVES"
    (+ x0 gruboscPlyty) (+ frontY1 fixedPanelY gruboscPlyty)
    (+ x0 gruboscPlyty) (+ frontY1 wysSzafki (- gruboscPlyty)))
  (drawLine "SHELVES"
    (- (+ x0 szerSzafki) gruboscPlyty) (+ frontY1 fixedPanelY gruboscPlyty)
    (- (+ x0 szerSzafki) gruboscPlyty) (+ frontY1 wysSzafki (- gruboscPlyty)))
  
  ;; FRIDGE block on APPLIANCES layer (blue) with 3x5mm offset lines
  (drawRect "APPLIANCES"
    (+ x0 gruboscPlyty 5.0) (+ frontY1 gruboscPlyty 5.0)
    (- (+ x0 szerSzafki) gruboscPlyty 5.0) (+ frontY1 gruboscPlyty fridgeH -5.0))
  (drawRect "APPLIANCES"
    (+ x0 gruboscPlyty 10.0) (+ frontY1 gruboscPlyty 10.0)
    (- (+ x0 szerSzafki) gruboscPlyty 10.0) (+ frontY1 gruboscPlyty fridgeH -10.0))
  (drawRect "APPLIANCES"
    (+ x0 gruboscPlyty 15.0) (+ frontY1 gruboscPlyty 15.0)
    (- (+ x0 szerSzafki) gruboscPlyty 15.0) (+ frontY1 gruboscPlyty fridgeH -15.0))
  (drawText "APPLIANCES" 
    (+ x0 (/ szerSzafki 2.0)) (+ frontY1 gruboscPlyty (/ fridgeH 2.0)) 60.0 "FRIDGE")
  
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
  
  (princ (strcat "\nFRONT VIEW added at Y+" (rtos (- frontY1 y0) 2 0) " and Y+" (rtos (- frontY2 y0) 2 0)))
  
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
      (setq szerTOP (- szerSzafki (* 2.0 gruboscPlyty)) wysTOP (- glSzafki gruboscPlyty))
      
      ;; FRONT panel dimensions
      (if (= numDoors 1)
        (setq szerFront (- szerSzafki 3.0) wysFront (- wysSzafki 3.0))
        (setq szerFront (/ (- szerSzafki 6.0) 2.0) wysFront (- wysSzafki 3.0)))
      
      (setq hingeCupList hingePositions)
      
      ;; CNC insertion point
      (setq cncPt (getpoint "\nClick insertion point for CNC panels: "))
      (if (null cncPt)
        (princ "\nNo point selected. CNC cancelled.")
        (progn
          (setq cncX (car cncPt))
          (setq cncY (cadr cncPt))
          (setq cncStartX cncX)
          (setq odstep 50.0)
      
      ;; BUL - with hinges, 0 shelves, standard back puzzles
      (drawBUL cncX cncY szerBUL wysBUL unitNum 0 gruboscPlyty
        (or (= numDoors 2) (= hingePos "L"))
        (if (or (= numDoors 2) (= hingePos "L"))
          hingePositions
          nil)
        nil)
      ;; Screws for 25x25 wood blocks (spurs panel mounting, offset 12.5+G into cabinet)
      (drawCircle "SCREWS_3MM" (+ cncX 100.0 12.5 gruboscPlyty) (+ cncY fixedPanelY gruboscPlyty 37.5) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX 100.0 12.5 gruboscPlyty) (+ cncY fixedPanelY gruboscPlyty 87.5) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX 100.0 12.5 gruboscPlyty) (+ cncY wysBUL -50.0) 1.5)
      ;; Screws for fixed panel at fixedPanelY (front and back rows)
      (drawCircle "SCREWS_3MM" (+ cncX 50.0) (+ cncY fixedPanelY (/ gruboscPlyty 2.0)) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX szerBUL -50.0) (+ cncY fixedPanelY (/ gruboscPlyty 2.0)) 1.5)
      (setq cncX (+ cncX szerBUL odstep))
      
      ;; BUR - with hinges, 0 shelves
      (drawBUR cncX cncY szerBUL wysBUL unitNum 0 gruboscPlyty
        (or (= numDoors 2) (= hingePos "R"))
        (if (or (= numDoors 2) (= hingePos "R"))
          hingePositions
          nil)
        nil)
      ;; Screws for 25x25 wood blocks (spurs panel mounting, offset 12.5+G into cabinet)
      (drawCircle "SCREWS_3MM" (+ cncX szerBUL -100.0 -12.5 (- gruboscPlyty)) (+ cncY fixedPanelY gruboscPlyty 37.5) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX szerBUL -100.0 -12.5 (- gruboscPlyty)) (+ cncY fixedPanelY gruboscPlyty 87.5) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX szerBUL -100.0 -12.5 (- gruboscPlyty)) (+ cncY wysBUL -50.0) 1.5)
      ;; Screws for fixed panel at fixedPanelY
      (drawCircle "SCREWS_3MM" (+ cncX 50.0) (+ cncY fixedPanelY (/ gruboscPlyty 2.0)) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX szerBUL -50.0) (+ cncY fixedPanelY (/ gruboscPlyty 2.0)) 1.5)
      (setq cncX (+ cncX szerBUL odstep))
      
      ;; TOP (rotated 90)
      (drawTOP_ROT90 cncX cncY wysTOP szerTOP unitNum gruboscPlyty)
      (setq cncX (+ cncX wysTOP odstep))
      
      ;; BOTTOM (rotated 90)
      (drawBOTTOM_ROT90 cncX cncY wysTOP szerTOP unitNum gruboscPlyty)
      (setq cncX (+ cncX wysTOP odstep))
      
      ;; FIXED PANEL (plain, no puzzles - screwed to sides)
      (drawRect "OUTLINE" cncX cncY (+ cncX wysFIXED) (+ cncY szerFIXED))
      (drawText "UNIT_NUMBER" (+ cncX (/ wysFIXED 2.0)) (+ cncY (/ szerFIXED 2.0)) 40.0 (strcat unitNum "-FIXED"))
      (setq cncX (+ cncX wysFIXED odstep))
      
      ;; RAIL 1 - ROTATED 90 (200 wide x szerRAIL tall, grain along long side)
      ;; Connects: BUL/BUR on short edges (bottom/top), BOTTOM on long edge (left)
      (setq S (+ (/ gruboscPlyty 2.0) 0.5))
      (drawRect "OUTLINE" cncX cncY (+ cncX wysRAIL) (+ cncY szerRAIL))
      ;; BUL socket at bottom edge (X=95 from left)
      (setq midRailY (+ cncX 95.0))
      (drawRect "PUZZLE_SOCKET" (- midRailY 25.5) (- cncY 6.0) (+ midRailY 25.5) (+ cncY S))
      (drawCircle "PUZZLE_HOLES_7_5MM" (- midRailY 24.5) (+ cncY S -1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ midRailY 24.5) (+ cncY S -1.0) 3.75)
      ;; BUR socket at top edge (X=95 from left)
      (drawRect "PUZZLE_SOCKET" (- midRailY 25.5) (+ cncY szerRAIL (- S)) (+ midRailY 25.5) (+ cncY szerRAIL 6.0))
      (drawCircle "PUZZLE_HOLES_7_5MM" (- midRailY 24.5) (+ cncY szerRAIL (- S) 1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ midRailY 24.5) (+ cncY szerRAIL (- S) 1.0) 3.75)
      ;; BOTTOM sockets on left edge
      (setq t1x (+ cncY gruboscPlyty 95.0))
      (setq t2x (+ cncY szerRAIL (- gruboscPlyty) -95.0))
      (drawRect "PUZZLE_SOCKET" (- cncX 6.0) (- t1x 25.5) (+ cncX S) (+ t1x 25.5))
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ cncX S -1.0) (- t1x 24.5) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ cncX S -1.0) (+ t1x 24.5) 3.75)
      (drawRect "PUZZLE_SOCKET" (- cncX 6.0) (- t2x 25.5) (+ cncX S) (+ t2x 25.5))
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ cncX S -1.0) (- t2x 24.5) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ cncX S -1.0) (+ t2x 24.5) 3.75)
      (drawText "UNIT_NUMBER" (+ cncX (/ wysRAIL 2.0)) (+ cncY (/ szerRAIL 2.0)) 30.0 (strcat unitNum "-RAIL1"))
      (setq cncX (+ cncX wysRAIL odstep))
      
      ;; RAIL 2 - ROTATED 90 (200 wide x szerRAIL tall, puzzles: bottom+top only)
      (drawRect "OUTLINE" cncX cncY (+ cncX wysRAIL) (+ cncY szerRAIL))
      ;; BUL socket at bottom edge (X=95)
      (setq midRailY (+ cncX 95.0))
      (drawRect "PUZZLE_SOCKET" (- midRailY 25.5) (- cncY 6.0) (+ midRailY 25.5) (+ cncY S))
      (drawCircle "PUZZLE_HOLES_7_5MM" (- midRailY 24.5) (+ cncY S -1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ midRailY 24.5) (+ cncY S -1.0) 3.75)
      ;; BUR socket at top edge (X=95)
      (drawRect "PUZZLE_SOCKET" (- midRailY 25.5) (+ cncY szerRAIL (- S)) (+ midRailY 25.5) (+ cncY szerRAIL 6.0))
      (drawCircle "PUZZLE_HOLES_7_5MM" (- midRailY 24.5) (+ cncY szerRAIL (- S) 1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ midRailY 24.5) (+ cncY szerRAIL (- S) 1.0) 3.75)
      (drawText "UNIT_NUMBER" (+ cncX (/ wysRAIL 2.0)) (+ cncY (/ szerRAIL 2.0)) 30.0 (strcat unitNum "-RAIL2"))
      (setq cncX (+ cncX wysRAIL odstep))
      
      ;; BACK-TOP - ROTATED 90 (wysBACKTOP wide x szerBACKTOP tall)
      ;; Connects: BUL/BUR on short edges (bottom/top), TOP on long edge (right)
      (drawRect "OUTLINE" cncX cncY (+ cncX wysBACKTOP) (+ cncY szerBACKTOP))
      ;; BUL socket at bottom edge (X=95)
      (setq midRailY (+ cncX 95.0))
      (drawRect "PUZZLE_SOCKET" (- midRailY 25.5) (- cncY 6.0) (+ midRailY 25.5) (+ cncY S))
      (drawCircle "PUZZLE_HOLES_7_5MM" (- midRailY 24.5) (+ cncY S -1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ midRailY 24.5) (+ cncY S -1.0) 3.75)
      ;; BUR socket at top edge (X=95)
      (drawRect "PUZZLE_SOCKET" (- midRailY 25.5) (+ cncY szerBACKTOP (- S)) (+ midRailY 25.5) (+ cncY szerBACKTOP 6.0))
      (drawCircle "PUZZLE_HOLES_7_5MM" (- midRailY 24.5) (+ cncY szerBACKTOP (- S) 1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ midRailY 24.5) (+ cncY szerBACKTOP (- S) 1.0) 3.75)
      ;; TOP sockets on right edge
      (setq t1x (+ cncY gruboscPlyty 95.0))
      (setq t2x (+ cncY szerBACKTOP (- gruboscPlyty) -95.0))
      (drawRect "PUZZLE_SOCKET" (+ cncX wysBACKTOP (- S)) (- t1x 25.5) (+ cncX wysBACKTOP 6.0) (+ t1x 25.5))
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ cncX wysBACKTOP (- S) 1.0) (- t1x 24.5) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ cncX wysBACKTOP (- S) 1.0) (+ t1x 24.5) 3.75)
      (drawRect "PUZZLE_SOCKET" (+ cncX wysBACKTOP (- S)) (- t2x 25.5) (+ cncX wysBACKTOP 6.0) (+ t2x 25.5))
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ cncX wysBACKTOP (- S) 1.0) (- t2x 24.5) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ cncX wysBACKTOP (- S) 1.0) (+ t2x 24.5) 3.75)
      ;; Top/bottom screws (sides of panel)
      (drawCircle "SCREWS_3MM" (+ cncX 50.0) (+ cncY S) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX 50.0) (+ cncY szerBACKTOP (- S)) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX wysBACKTOP -50.0) (+ cncY S) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX wysBACKTOP -50.0) (+ cncY szerBACKTOP (- S)) 1.5)
      ;; Right edge screws (TOP panel)
      (drawCircle "SCREWS_3MM" (+ cncX wysBACKTOP (- S)) (+ cncY 50.0 gruboscPlyty) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX wysBACKTOP (- S)) (+ cncY szerBACKTOP -50.0 (- gruboscPlyty)) 1.5)
      ;; Left edge screws into fixed panel at G/2 from left
      (drawCircle "SCREWS_3MM" (+ cncX (/ gruboscPlyty 2.0)) (+ cncY 50.0 gruboscPlyty) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX (/ gruboscPlyty 2.0)) (+ cncY (/ szerBACKTOP 2.0)) 1.5)
      (drawCircle "SCREWS_3MM" (+ cncX (/ gruboscPlyty 2.0)) (+ cncY szerBACKTOP -50.0 (- gruboscPlyty)) 1.5)
      (drawText "UNIT_NUMBER" (+ cncX (/ wysBACKTOP 2.0)) (+ cncY (/ szerBACKTOP 2.0)) 40.0 (strcat unitNum "-BACK"))
      (setq cncX (+ cncX wysBACKTOP odstep))
      
      ;; SPURS PANEL - ROTATED 90 (wysSPURS wide x szerSPURS tall)
      (drawRect "OUTLINE" cncX cncY (+ cncX wysSPURS) (+ cncY szerSPURS))
      (drawText "UNIT_NUMBER" (+ cncX (/ wysSPURS 2.0)) (+ cncY (/ szerSPURS 2.0)) 30.0 (strcat unitNum "-SPURS"))
      (setq cncX (+ cncX wysSPURS odstep))
      
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
      
      ;; Calculate totals
      (setq totalPanels 9) ;; BUL+BUR+TOP+BOT+FIXED+RAIL1+RAIL2+BACK+SPURS
      (setq numFronts (if (= numDoors 1) 1 2))
      
      (setq totalSQM (+
        (* szerBUL wysBUL 2.0)
        (* szerTOP wysTOP 2.0)
        (* szerFIXED wysFIXED)
        (* szerRAIL wysRAIL 2.0)
        (* szerBACKTOP wysBACKTOP)
        (* szerSPURS wysSPURS)))
      (setq totalSQM (/ totalSQM 1000000.0))
      
      (setq totalEdging (+
        (* wysBUL 2.0)
        (* szerTOP 2.0)
        szerFIXED))
      (setq totalEdging (/ totalEdging 1000.0))
      
      ;; UNIT SUMMARY
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "UNIT: " unitNum " (FRIDGE)"))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "Fridge H: " (rtos fridgeH 2 0) "mm, Hinges: " (itoa numHinges)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH "---------")
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "1. BUL: " (rtos szerBUL 2 0) " x " (rtos wysBUL 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "2. BUR: " (rtos szerBUL 2 0) " x " (rtos wysBUL 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "3. TOP: " (rtos szerTOP 2 0) " x " (rtos wysTOP 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "4. BOTTOM: " (rtos szerTOP 2 0) " x " (rtos wysTOP 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "5. FIXED: " (rtos szerFIXED 2 0) " x " (rtos wysFIXED 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "6. RAIL1: " (rtos szerRAIL 2 0) " x " (rtos wysRAIL 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "7. RAIL2: " (rtos szerRAIL 2 0) " x " (rtos wysRAIL 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "8. BACK: " (rtos szerBACKTOP 2 0) " x " (rtos wysBACKTOP 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "9. SPURS: " (rtos szerSPURS 2 0) " x " (rtos wysSPURS 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
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
      
      ;; FRONT SUMMARY
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
      (setq csvPath (getvar "DWGPREFIX"))
      (if (or (null csvPath) (= csvPath ""))
        (setq csvPath (strcat (getenv "USERPROFILE") "\\Desktop\\")))
      (setq csvPath (strcat csvPath "SKYLON_labels.csv"))
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
          (write-line (strcat unitNum ",TOP," (rtos szerTOP 2 0) "," (rtos wysTOP 2 0) ",>,"
            (rtos (/ szerTOP 1000.0) 2 2) "," (rtos (/ (* szerTOP wysTOP) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BOTTOM," (rtos szerTOP 2 0) "," (rtos wysTOP 2 0) ",>,"
            (rtos (/ szerTOP 1000.0) 2 2) "," (rtos (/ (* szerTOP wysTOP) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",FIXED," (rtos szerFIXED 2 0) "," (rtos wysFIXED 2 0) ",>,"
            (rtos (/ szerFIXED 1000.0) 2 2) "," (rtos (/ (* szerFIXED wysFIXED) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",RAIL1," (rtos szerRAIL 2 0) "," (rtos wysRAIL 2 0) ",,0,"
            (rtos (/ (* szerRAIL wysRAIL) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",RAIL2," (rtos szerRAIL 2 0) "," (rtos wysRAIL 2 0) ",,0,"
            (rtos (/ (* szerRAIL wysRAIL) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BACK," (rtos szerBACKTOP 2 0) "," (rtos wysBACKTOP 2 0) ",,0,"
            (rtos (/ (* szerBACKTOP wysBACKTOP) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",SPURS," (rtos szerSPURS 2 0) "," (rtos wysSPURS 2 0) ",,0,"
            (rtos (/ (* szerSPURS wysSPURS) 1000000.0) 2 3)) csvFile)
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
  
  (princ (strcat "\nFRIDGE_FULL " unitNum " - Done! (" (itoa numDoors) " door(s), " (itoa numHinges) " hinges)"))
  (princ (strcat "\n  Cabinet: " (rtos szerSzafki 2 0) "x" (rtos wysSzafki 2 0) "x" (rtos glSzafki 2 0) "mm, G=" (rtos gruboscPlyty 2 0) "mm"))
  (princ (strcat "\n  Fridge H: " (rtos fridgeH 2 0) "mm, Fixed panel at: " (rtos fixedPanelY 2 0) "mm"))
  (princ (strcat "\n  Back: 2x rail " (rtos szerRAIL 2 0) "x" (rtos wysRAIL 2 0) " + back " (rtos szerBACKTOP 2 0) "x" (rtos wysBACKTOP 2 0)))
  (princ (strcat "\n  Spurs: " (rtos szerSPURS 2 0) "x" (rtos wysSPURS 2 0) "mm"))
  (princ))

(princ "\nKIT_FRIDGE loaded. Type FRIDGE_FULL to run.")
(princ)