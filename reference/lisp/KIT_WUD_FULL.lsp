;;;========================================
;;; KIT_WUD_FULL.lsp
;;; Wall Unit with Doors - TOP + FRONT views + CNC panels
;;; Command: WUD_FULL
;;; No legs, 3 hinges, hanger holes in BUL/BUR/BACK
;;; Requires: SKYLON_COMMON.lsp loaded first
;;;========================================

;;; Auto-load COMMON if not already loaded
(if (null drawRect) (load "SKYLON_COMMON"))

;;;========================================
;;; Main WUD command (Wall Unit Door)
;;;========================================
(defun c:WUD_FULL ( / szerSzafki glSzafki gruboscPlyty gruboscDrzwi
                    numShelves unitNum pt x0 y0 doorType hingePos doorExtend
                    wewSzer wewGl doorWidth numDoors doorGap
                    hingeX hingeY lastEnt hingePositions hingeCupList hingeFrontYList
                    wysSzafki frontY1 frontY2
                    drawCNC cncX cncY cncStartX odstep
                    szerBUL wysBUL szerTOP wysTOP szerBACK wysBACK
                    szerSHELF wysSHELF szerFront wysFront i
                    sumX sumY lineH totalPanels totalSQM totalEdging numFronts
                    csvPath csvFile
                    _oldCmdecho _oldOsmode _oldClayer _olderr)
  
  ;; Save state
  (setq _oldCmdecho (getvar "CMDECHO"))
  (setq _oldOsmode  (getvar "OSMODE"))
  (setq _oldClayer  (getvar "CLAYER"))
  (setq _olderr *error*)
  
  ;; Error handler (ESC / crash safe)
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
  
  (setq glSzafki (getreal "\nCabinet DEPTH [mm] <400>: "))
  (if (or (null glSzafki) (<= glSzafki 0.0)) (setq glSzafki 400.0))
  
  (setq wysSzafki (getreal "\nCabinet HEIGHT [mm] <720>: "))
  (if (or (null wysSzafki) (<= wysSzafki 0.0)) (setq wysSzafki 720.0))
  
  ;; Door extend (handleless - door extends 38mm below cabinet)
  (setq doorExtend (getstring "\nDoor EXTEND 38mm below cabinet? [Y/N] <N>: "))
  (if (= doorExtend "") (setq doorExtend "N"))
  (setq doorExtend (strcase doorExtend))
  (setq doorExtend (if (= doorExtend "Y") 38.0 0.0))
  
  (setq numShelves (getint "\nNumber of SHELVES (0-10): "))
  (if (or (null numShelves) (< numShelves 0)) (setq numShelves 0))
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
  
  (setq unitNum (getstring T "\nUnit NUMBER (e.g. W01, W02): "))
  (if (= unitNum "") (setq unitNum "W01"))
  
  (setq pt (getpoint "\nInsertion point: "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))
  
  (setq x0 (car pt) y0 (cadr pt))
  (setq wewSzer (- szerSzafki (* 2.0 gruboscPlyty)))
  (setq wewGl (- glSzafki gruboscPlyty))
  (setq doorGap 3.0)
  
  ;; Calculate hinge positions for base unit (3 hinges)
  (setq hingePositions (calcHingePositionsBase wysSzafki))
  (setq hingeFrontYList (mapcar '(lambda (p) (- p 30.0)) hingePositions))
  
  ;; === LAYERS ===
  (createViewLayers)
  
  ;;;========================================
  ;;; TOP VIEW
  ;;;========================================
  ;; CARCASE
  (drawRect "CARCASE" x0 y0 (+ x0 szerSzafki) (+ y0 glSzafki))
  (drawRect "CARCASE" x0 y0 (+ x0 gruboscPlyty) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" (- (+ x0 szerSzafki) gruboscPlyty) y0 (+ x0 szerSzafki) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" x0 (- (+ y0 glSzafki) gruboscPlyty) (+ x0 szerSzafki) (+ y0 glSzafki))
  
  ;; SHELVES
  (if (> numShelves 0)
    (drawRect "SHELVES" 
      (+ x0 gruboscPlyty 2.0)
      (+ y0 20.0)
      (- (+ x0 szerSzafki) gruboscPlyty 2.0)
      (- (+ y0 glSzafki) gruboscPlyty)))
  
  ;; DOORS + HINGES (no legs for wall unit)
  (if (= numDoors 1)
    (progn
      (drawDoor (+ x0 1.5) (- y0 doorGap gruboscDrzwi) (- (+ x0 szerSzafki) 1.5) (- y0 doorGap) doorType)
      (setq hingeY (+ y0 7.14))
      (if (= hingePos "L")
        (progn
          (setq hingeX (+ x0 gruboscPlyty))
          (drawHinge hingeX hingeY "L"))
        (progn
          (setq hingeX (- (+ x0 szerSzafki) gruboscPlyty))
          (drawHinge hingeX hingeY "R"))))
    (progn
      (setq doorWidth (/ (- szerSzafki 3.0 3.0) 2.0))
      (drawDoor (+ x0 1.5) (- y0 doorGap gruboscDrzwi) (+ x0 1.5 doorWidth) (- y0 doorGap) doorType)
      (setq hingeX (+ x0 gruboscPlyty))
      (setq hingeY (+ y0 7.14))
      (drawHinge hingeX hingeY "L")
      
      (drawDoor (- (+ x0 szerSzafki) 1.5 doorWidth) (- y0 doorGap gruboscDrzwi) (- (+ x0 szerSzafki) 1.5) (- y0 doorGap) doorType)
      (setq hingeX (- (+ x0 szerSzafki) gruboscPlyty))
      (setq hingeY (+ y0 7.14))
      (drawHinge hingeX hingeY "R")))
  
  ;; UNIT NUMBER
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ y0 (/ glSzafki 2.0)) 30.0 unitNum)
  
  ;; DIMENSION - width
  (drawDimH x0 (+ x0 szerSzafki) (+ y0 glSzafki))
  
  ;;;========================================
  ;;; FRONT VIEW (no legs for wall unit)
  ;;;========================================
  (setq frontY1 (+ y0 glSzafki 600.0))
  (setq frontY2 (+ frontY1 wysSzafki 1800.0))
  
  ;; FRONT VIEW 1 - carcase + hinges + shelves (NO LEGS)
  (drawFrontCarcase x0 frontY1 szerSzafki wysSzafki gruboscPlyty)
  (drawFrontShelves x0 frontY1 szerSzafki wysSzafki gruboscPlyty numShelves)
  (drawFrontHinges x0 frontY1 szerSzafki wysSzafki gruboscPlyty numDoors hingePos unitNum hingeFrontYList)
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ frontY1 (/ wysSzafki 2.0)) 30.0 unitNum)
  (drawDimHFront x0 (+ x0 szerSzafki) frontY1)
  
  ;; FRONT VIEW 2 - carcase outline + doors (MAGENTA) (NO LEGS)
  (drawFrontCarcaseOutline x0 frontY2 szerSzafki wysSzafki unitNum)
  (if (= numDoors 1)
    (drawFrontDoorSingle x0 (- frontY2 doorExtend) szerSzafki (+ wysSzafki doorExtend) doorType hingePos)
    (drawFrontDoorDouble x0 (- frontY2 doorExtend) szerSzafki (+ wysSzafki doorExtend) doorType))
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
      ;; CNC layers
      (createCNCLayers)
      ;; Hanger hole layer
      (command "._LAYER" "_N" "HANGER_HOLE" "_C" "4" "HANGER_HOLE" "")
      
      ;; Panel dimensions
      (setq szerBUL (- glSzafki gruboscPlyty) wysBUL wysSzafki)
      (setq szerTOP (- szerSzafki (* 2.0 gruboscPlyty)) wysTOP (- glSzafki gruboscPlyty))
      (setq szerBACK szerSzafki wysBACK wysSzafki)
      (setq szerSHELF (- szerSzafki (* 2.0 gruboscPlyty) 4.0) wysSHELF (- glSzafki gruboscPlyty 20.0))
      
      ;; FRONT panel dimensions (+ doorExtend if extended)
      (if (= numDoors 1)
        (setq szerFront (- szerSzafki 3.0) wysFront (+ (- wysSzafki 3.0) doorExtend))
        (setq szerFront (/ (- szerSzafki 6.0) 2.0) wysFront (+ (- wysSzafki 3.0) doorExtend)))
      
      ;; Front CNC cup positions (from bottom of front panel)
      ;; Cups stay at same position relative to carcase, but panel is taller by doorExtend at bottom
      (setq hingeCupList (list (+ 100.0 doorExtend) (- wysFront 297.0) (- wysFront 97.0)))
      
      ;; CNC insertion point - user clicks where to place panels
      (setq cncPt (getpoint "\nClick insertion point for CNC panels: "))
      (if (null cncPt)
        (princ "\nNo point selected. CNC cancelled.")
        (progn
          (setq cncX (car cncPt))
          (setq cncY (cadr cncPt))
          (setq cncStartX cncX)
          (setq odstep 50.0)
      
      ;; BUL - hinges if L or double doors
      (drawBUL cncX cncY szerBUL wysBUL unitNum numShelves gruboscPlyty
        (or (= numDoors 2) (= hingePos "L"))
        (if (or (= numDoors 2) (= hingePos "L"))
          (list (- wysSzafki 100.0) (- wysSzafki 300.0) 100.0)
          nil)
        nil)
      ;; BUL hanger holes - 2x 5mm from back/top
      ;; Hole 1: 21mm from back (right edge), 53mm from top
      ;; Hole 2: 53mm from back (right edge), 53mm from top
      (drawCircle "HINGES_5MM" (+ cncX szerBUL -21.0) (+ cncY wysBUL -53.0) 2.5)
      (drawCircle "HINGES_5MM" (+ cncX szerBUL -53.0) (+ cncY wysBUL -53.0) 2.5)
      (setq cncX (+ cncX szerBUL odstep))
      
      ;; BUR - hinges if R or double doors
      (drawBUR cncX cncY szerBUL wysBUL unitNum numShelves gruboscPlyty
        (or (= numDoors 2) (= hingePos "R"))
        (if (or (= numDoors 2) (= hingePos "R"))
          (list (- wysSzafki 100.0) (- wysSzafki 300.0) 100.0)
          nil)
        nil)
      ;; BUR hanger holes - mirrored (from left edge)
      ;; Hole 1: 21mm from back (left edge), 53mm from top
      ;; Hole 2: 53mm from back (left edge), 53mm from top
      (drawCircle "HINGES_5MM" (+ cncX 21.0) (+ cncY wysBUL -53.0) 2.5)
      (drawCircle "HINGES_5MM" (+ cncX 53.0) (+ cncY wysBUL -53.0) 2.5)
      (setq cncX (+ cncX szerBUL odstep))
      
      ;; TOP/BOTTOM rotated 90
      (drawTOP_ROT90 cncX cncY wysTOP szerTOP unitNum gruboscPlyty)
      (setq cncX (+ cncX wysTOP odstep))
      
      (drawBOTTOM_ROT90 cncX cncY wysTOP szerTOP unitNum gruboscPlyty)
      (setq cncX (+ cncX wysTOP odstep))
      
      ;; BACK + hanger holes
      (drawBACK cncX cncY szerBACK wysBACK unitNum gruboscPlyty)
      ;; Hanger rectangles at top corners: 30mm wide x 58mm high
      ;; Left top corner
      (drawRect "HANGER_HOLE" cncX (+ cncY wysBACK -58.0) (+ cncX 30.0) (+ cncY wysBACK))
      ;; Right top corner
      (drawRect "HANGER_HOLE" (+ cncX szerBACK -30.0) (+ cncY wysBACK -58.0) (+ cncX szerBACK) (+ cncY wysBACK))
      (setq cncX (+ cncX szerBACK odstep))
      
      ;; SHELVES
      (setq i 1)
      (while (<= i numShelves)
        (drawSHELF cncX cncY szerSHELF wysSHELF unitNum i)
        (setq cncX (+ cncX szerSHELF odstep))
        (setq i (1+ i)))
      
      ;; FRONT panels - 150mm gap after shelves
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
      (setq totalPanels (+ 5 numShelves))
      (setq numFronts (if (= numDoors 1) 1 2))
      
      (setq totalSQM (+
        (* szerBUL wysBUL 2.0)
        (* szerTOP wysTOP 2.0)
        (* szerBACK wysBACK)
        (* szerSHELF wysSHELF numShelves)))
      (setq totalSQM (/ totalSQM 1000000.0))
      
      (setq totalEdging (+
        (* wysBUL 2.0)
        (* szerTOP 2.0)
        (* szerSHELF numShelves)))
      (setq totalEdging (/ totalEdging 1000.0))
      
      ;; UNIT SUMMARY
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "UNIT: " unitNum " (WALL)"))
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
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "5. BACK: " (rtos szerBACK 2 0) " x " (rtos wysBACK 2 0) " + hangers"))
      (setq sumY (- sumY (* lineH 1.2)))
      (if (> numShelves 0)
        (progn
          (drawTextL "SUMMARY" sumX sumY lineH (strcat (itoa (+ 5 1)) ". SHELF: " (rtos szerSHELF 2 0) " x " (rtos wysSHELF 2 0) (if (> numShelves 1) (strcat " x" (itoa numShelves)) "")))
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
      
      ;; Footer
      (drawTextLC "SUMMARY" sumX sumY lineH "Property of Skylon Joinery" 6)
      
      (princ "\nCNC panels generated."))))) ;; closes: getpoint progn, cncPt if, drawCNC if, main progn
  
  ;;;========================================
  ;;; LABELS CSV
  ;;;========================================
  (if szerBUL
    (progn
      (setq csvPath (findfile "KIT_WUD_FULL.lsp"))
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
          (write-line (strcat unitNum ",TOP," (rtos szerTOP 2 0) "," (rtos wysTOP 2 0) ",>,"
            (rtos (/ szerTOP 1000.0) 2 2) "," (rtos (/ (* szerTOP wysTOP) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BOTTOM," (rtos szerTOP 2 0) "," (rtos wysTOP 2 0) ",>,"
            (rtos (/ szerTOP 1000.0) 2 2) "," (rtos (/ (* szerTOP wysTOP) 1000000.0) 2 3)) csvFile)
          (write-line (strcat unitNum ",BACK," (rtos szerBACK 2 0) "," (rtos wysBACK 2 0) ",,0,"
            (rtos (/ (* szerBACK wysBACK) 1000000.0) 2 3)) csvFile)
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
  
  (princ (strcat "\nWUD_FULL " unitNum " - Done! (" (itoa numDoors) " " (cond ((= doorType "S") "Shaker") ((= doorType "H") "Handleless") (T "Flat")) " door(s), wall unit" (if (> doorExtend 0.0) ", EXTENDED" "") ")"))
  (princ (strcat "\n  Cabinet: " (rtos szerSzafki 2 0) "x" (rtos wysSzafki 2 0) "x" (rtos glSzafki 2 0) "mm, G=" (rtos gruboscPlyty 2 0) "mm"))
  (if (= numDoors 1)
    (princ (strcat "\n  Front: " (rtos (- szerSzafki 3.0) 2 0) "x" (rtos (+ (- wysSzafki 3.0) doorExtend) 2 0) "mm, hinge " hingePos (if (> doorExtend 0.0) " (ext +38)" "")))
    (princ (strcat "\n  Fronts: 2x " (rtos (/ (- szerSzafki 6.0) 2.0) 2 0) "x" (rtos (+ (- wysSzafki 3.0) doorExtend) 2 0) "mm" (if (> doorExtend 0.0) " (ext +38)" ""))))
  (princ (strcat "\n  Shelves: " (itoa numShelves) ", CNC: " (if (= drawCNC "Y") "Yes" "No")))
  (princ))

(princ "\nKIT_WUD_FULL loaded. Type WUD_FULL to run.")
(princ)