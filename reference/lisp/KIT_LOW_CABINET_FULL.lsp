;;;========================================
;;; KIT_LOW_CABINET_FULL.lsp
;;; Low Cabinet with Doors - TOP + FRONT views + CNC panels
;;; Command: LOW_CABINET_FULL
;;; Features:
;;;   - 100mm legs (same as kitchen base units)
;;;   - No drawers
;;;   - Hanging rail option (parametric block + partitioner)
;;;   - Adjustable shelves
;;; Min height: 300mm
;;; Hinges: 2 (<800mm), 3 (800-1199mm), 4 (>=1200mm)
;;; Requires: SKYLON_COMMON.lsp loaded first
;;;========================================

;;; Auto-load COMMON if not already loaded
(if (null drawRect) (load "SKYLON_COMMON"))

;;;========================================
;;; B2. RAIL BLOCK (parametric from wardrobe_rail_parametric_v2)
;;;========================================

(setq _wrrail_len0 504.0)
(setq _wrrail_shift 250.0)

(defun _wrrail_shiftpt (pt dx)
  (if (> (car pt) _wrrail_shift)
    (list (+ (car pt) dx) (cadr pt))
    pt))

(defun _wrrail_geom (dx / leftpoly rightpoly lines)
  (setq leftpoly
    '((13.0 0.0) (13.0 19.0) (12.74 22.12) (12.0 24.21)
      (10.59 26.53) (8.6 28.81) (7.15 30.48) (5.13 32.78)
      (3.55 34.6) (3.0 35.23) (3.0 35.88)))
  (setq rightpoly
    (mapcar '(lambda (p) (_wrrail_shiftpt p dx))
      '((491.0 0.0) (491.0 19.0) (491.26 22.12) (492.0 24.21)
        (493.41 26.53) (495.4 28.81) (496.85 30.48) (498.87 32.78)
        (500.45 34.6) (501.0 35.23) (501.0 45.88))))
  (setq lines
    (mapcar '(lambda (ln) (list (car ln) (_wrrail_shiftpt (cadr ln) dx) (_wrrail_shiftpt (caddr ln) dx)))
      (list
        (list "0" '(4.94 33.0) '(499.06 33.0))
        (list "0" '(13.0 3.0) '(491.0 3.0))
        (list "0" '(0.0 45.88) '(3.0 45.88))
        (list "0" '(3.0 45.88) '(3.0 35.88))
        (list "0" '(13.0 0.0) '(0.0 0.0))
        (list "0" '(491.0 0.0) '(504.0 0.0))
        (list "0" '(501.0 45.88) '(504.0 45.88)))))
  (list leftpoly rightpoly lines))

(defun _wrrail_makeblock (blkname len / dx geom lp rp lines data)
  (if (tblsearch "BLOCK" blkname) T
    (progn
      (if (< len _wrrail_len0) (setq len _wrrail_len0))
      (setq dx (- len _wrrail_len0))
      (setq geom (_wrrail_geom dx))
      (setq lp (nth 0 geom) rp (nth 1 geom) lines (nth 2 geom))
      ;; Block header
      (entmake (list '(0 . "BLOCK") (cons 2 blkname) '(70 . 0)
        (cons 10 (list 0.0 0.0 0.0)) (cons 3 blkname) '(1 . "")))
      ;; Left polyline
      (setq data (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "0")
        '(100 . "AcDbPolyline") (cons 90 (length lp)) '(70 . 0)))
      (foreach p lp (setq data (append data (list (cons 10 (list (car p) (cadr p)))))))
      (entmakex data)
      ;; Right polyline
      (setq data (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "0")
        '(100 . "AcDbPolyline") (cons 90 (length rp)) '(70 . 0)))
      (foreach p rp (setq data (append data (list (cons 10 (list (car p) (cadr p)))))))
      (entmakex data)
      ;; Lines
      (foreach ln lines
        (entmakex (list '(0 . "LINE") '(100 . "AcDbEntity") (cons 8 (car ln))
          '(100 . "AcDbLine")
          (cons 10 (list (car (cadr ln)) (cadr (cadr ln)) 0.0))
          (cons 11 (list (car (caddr ln)) (cadr (caddr ln)) 0.0)))))
      (entmake (list '(0 . "ENDBLK")))
      T)))

;;;========================================
;;; CNC RAIL HOLE HELPERS
;;;========================================

;;; Rail bracket screw on BUL (1 screw at center of depth)
(defun drawLCRailHolesBUL (x0 y0 szer railAbsY /)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) (+ y0 railAbsY) 1.5))

;;; Rail bracket screw on BUR (1 screw at center of depth)
(defun drawLCRailHolesBUR (x0 y0 szer railAbsY /)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) (+ y0 railAbsY) 1.5))

;;; Rail partitioner screws on BUL (3 holes along depth)
(defun drawLCRailPartHolesBUL (x0 y0 szer railPartCenterY / hY)
  (setq hY (+ y0 railPartCenterY))
  (drawCircle "SCREWS_3MM" (+ x0 50.0) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) hY 1.5))

;;; Rail partitioner screws on BUR (same pattern)
(defun drawLCRailPartHolesBUR (x0 y0 szer railPartCenterY / hY)
  (drawLCRailPartHolesBUL x0 y0 szer railPartCenterY))

;;; Rail partitioner screws on BACK (3 holes along width)
(defun drawLCRailPartHolesBACK (x0 y0 szer G railPartCenterY / hY)
  (setq hY (+ y0 railPartCenterY))
  (drawCircle "SCREWS_3MM" (+ x0 G 50.0) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer (- G) -50.0) hY 1.5))

;;;========================================
;;; SHELVES FRONT VIEW (zone-based like wardrobe)
;;;========================================

(defun drawLCShelvesFront (x0 frontY1 szer G numShelves shelfZoneBottom shelfZoneTop / spacing shelfY i shelfX1 shelfX2)
  (if (> numShelves 0)
    (progn
      (setq shelfX1 (+ x0 G 2.0))
      (setq shelfX2 (- (+ x0 szer) G 2.0))
      (setq spacing (/ (- shelfZoneTop shelfZoneBottom) (+ numShelves 1.0)))
      (setq i 1)
      (while (<= i numShelves)
        (setq shelfY (+ frontY1 shelfZoneBottom (* spacing i)))
        (drawRect "CARCASE" shelfX1 shelfY shelfX2 (+ shelfY G))
        (setq i (1+ i))))))

;;;========================================
;;; MAIN LOW CABINET COMMAND
;;;========================================

(defun c:LOW_CABINET_FULL ( / szerSzafki glSzafki gruboscPlyty gruboscDrzwi
                    numShelves unitNum pt x0 y0 doorType hingePos hingeY
                    wewSzer wewGl doorWidth numDoors doorGap oldLay
                    hingePositions hingeCupList hingeFrontYList
                    wysSzafki frontY1 frontY2 numHinges legHeight
                    hasRail railOffset railAbsY railPartY railPartCenterY railLen railBlkName
                    szerRAILPART wysRAILPART
                    shelfZoneBottom shelfZoneTop
                    drawCNC cncX cncY cncPt odstep curX
                    szerBUL wysBUL szerTOP wysTOP szerBACK wysBACK
                    szerSHELF wysSHELF szerFront wysFront
                    i sumX sumY lineH totalPanels totalSQM totalEdging numFronts
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
  (setq legHeight 100.0)
  
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
  
  (setq wysSzafki (getreal "\nCabinet HEIGHT [mm] (min 300) <600>: "))
  (if (or (null wysSzafki) (< wysSzafki 300.0))
    (progn (princ "\nInvalid height. Minimum 300mm.") (setvar "CMDECHO" _oldCmdecho) (exit)))
  
  (setq glSzafki (getreal "\nCabinet DEPTH [mm] <578>: "))
  (if (or (null glSzafki) (<= glSzafki 0.0)) (setq glSzafki 578.0))
  
  ;; === INTERIOR OPTIONS ===
  (princ "\n--- INTERIOR OPTIONS ---")
  
  ;; 1. Hanging rail
  (setq hasRail (getstring "\nHanging RAIL? [Y/N] <N>: "))
  (if (= hasRail "") (setq hasRail "N"))
  (setq hasRail (strcase hasRail))
  (if (= hasRail "Y")
    (progn
      (setq railOffset (getreal "\nRail HEIGHT offset above base [mm] <200>: "))
      (if (or (null railOffset) (<= railOffset 0.0)) (setq railOffset 200.0))))
  
  ;; 2. Shelves
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
      (setq hingePos (getstring "\nHinge position [L=Left, R=Right] <L>: "))
      (if (= hingePos "") (setq hingePos "L"))
      (setq hingePos (strcase hingePos))
      (if (not (or (= hingePos "L") (= hingePos "R"))) (setq hingePos "L"))))
  
  (setq unitNum (getstring T "\nUnit NUMBER (e.g. LC01, LC02): "))
  (if (= unitNum "") (setq unitNum "LC01"))
  
  (setq pt (getpoint "\nInsertion point: "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))
  
  (setq x0 (car pt) y0 (cadr pt))
  (setq wewSzer (- szerSzafki (* 2.0 gruboscPlyty)))
  (setq wewGl (- glSzafki gruboscPlyty))
  (setq doorGap 3.0)
  
  ;; === RAIL POSITION CALCULATION ===
  (setq railAbsY nil railPartY nil)
  (if (= hasRail "Y")
    (progn
      ;; Rail absolute Y: offset above bottom panel
      (setq railAbsY (+ gruboscPlyty railOffset))
      ;; Rail partitioner: 40mm above rail
      (setq railPartY (+ railAbsY 40.0))
      ;; Validate
      (if (> (+ railPartY gruboscPlyty) (- wysSzafki gruboscPlyty 50.0))
        (progn
          (princ "\nWARNING: Rail too high! Adjusting...")
          (setq railAbsY (- wysSzafki gruboscPlyty 50.0 gruboscPlyty 40.0))
          (setq railPartY (+ railAbsY 40.0))))
      ;; Rail partitioner CNC dimensions
      (setq railPartCenterY (+ railPartY (/ gruboscPlyty 2.0)))
      (setq szerRAILPART (- szerSzafki (* 2.0 gruboscPlyty)))
      (setq wysRAILPART (- glSzafki gruboscPlyty))
      (princ (strcat "\n  Rail at: " (rtos railAbsY 2 0) "mm"))
      (princ (strcat "\n  Rail partitioner at: " (rtos railPartY 2 0) "mm"))))
  
  ;; === SHELF ZONE ===
  (cond
    (railPartY
      (setq shelfZoneBottom (+ railPartY gruboscPlyty)))
    (T
      (setq shelfZoneBottom gruboscPlyty)))
  (setq shelfZoneTop (- wysSzafki gruboscPlyty))
  
  ;; Hinge positions (2/3/4 hinges depending on height)
  (setq hingePositions (calcHingePositionsLow wysSzafki))
  (setq numHinges (length hingePositions))
  (setq hingeFrontYList (mapcar '(lambda (p) (- p 30.0)) hingePositions))
  
  (princ (strcat "\n  " (itoa numHinges) " hinges, " (itoa numDoors) " door(s)"))
  
  ;; === LAYERS ===
  (createViewLayers)
  
  ;;;========================================
  ;;; TOP VIEW
  ;;;========================================
  ;; CARCASE outline
  (drawRect "CARCASE" x0 y0 (+ x0 szerSzafki) (+ y0 glSzafki))
  (drawRect "CARCASE" x0 y0 (+ x0 gruboscPlyty) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" (- (+ x0 szerSzafki) gruboscPlyty) y0 (+ x0 szerSzafki) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" x0 (- (+ y0 glSzafki) gruboscPlyty) (+ x0 szerSzafki) (+ y0 glSzafki))
  
  ;; RAIL in TOP VIEW (on HINGES layer, same as wardrobe)
  (if (= hasRail "Y")
    (drawLine "HINGES" 
      (+ x0 gruboscPlyty 50.0) (+ y0 50.0)
      (- (+ x0 szerSzafki) gruboscPlyty 50.0) (+ y0 50.0)))
  
  ;; SHELVES in TOP VIEW
  (if (> numShelves 0)
    (drawRect "SHELVES" 
      (+ x0 gruboscPlyty 2.0) (+ y0 20.0)
      (- (+ x0 szerSzafki) gruboscPlyty 2.0) (- (+ y0 glSzafki) gruboscPlyty)))
  
  ;; DOORS + HINGES in TOP VIEW
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
  (setq frontY2 (+ frontY1 wysSzafki 400.0))
  
  ;; FRONT VIEW 1 - carcase + hinges + legs
  (drawFrontCarcase x0 frontY1 szerSzafki wysSzafki gruboscPlyty)
  (drawFrontHinges x0 frontY1 szerSzafki wysSzafki gruboscPlyty numDoors hingePos unitNum hingeFrontYList)
  (drawLegPairH x0 frontY1 szerSzafki gruboscPlyty legHeight)
  
  ;; SHELVES in FRONT VIEW (zone-based)
  (if (> numShelves 0)
    (drawLCShelvesFront x0 frontY1 szerSzafki gruboscPlyty numShelves shelfZoneBottom shelfZoneTop))
  
  ;; RAIL in FRONT VIEW (parametric block on HINGES layer + rail partitioner)
  (if (= hasRail "Y")
    (progn
      (setq railLen (- szerSzafki (* 2.0 gruboscPlyty)))
      (setq railBlkName (strcat "WRRAIL_" (rtos railLen 2 0)))
      (_wrrail_makeblock railBlkName railLen)
      (setq oldLay (getvar "CLAYER"))
      (setvar "CLAYER" "HINGES")
      (entmakex (list '(0 . "INSERT") (cons 2 railBlkName)
        (cons 10 (list (+ x0 gruboscPlyty) (+ frontY1 railAbsY (- 33.0)) 0.0))
        '(41 . 1.0) '(42 . 1.0) '(43 . 1.0) '(50 . 0.0)))
      (setvar "CLAYER" oldLay)
      ;; Rail partitioner (full width shelf, 40mm above rail)
      (drawRect "CARCASE"
        (+ x0 gruboscPlyty) (+ frontY1 railPartY)
        (- (+ x0 szerSzafki) gruboscPlyty) (+ frontY1 railPartY gruboscPlyty))))
  
  (drawText "UNIT_NUMBER" (+ x0 (/ szerSzafki 2.0)) (+ frontY1 (/ wysSzafki 2.0)) 30.0 unitNum)
  (drawDimHFront x0 (+ x0 szerSzafki) frontY1)
  
  ;; FRONT VIEW 2 - doors + outline
  (drawFrontCarcaseOutline x0 frontY2 szerSzafki wysSzafki unitNum)
  (drawLegPairH x0 frontY2 szerSzafki gruboscPlyty legHeight)
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
      (setq szerTOP (- szerSzafki (* 2.0 gruboscPlyty)) wysTOP (- glSzafki gruboscPlyty))
      (setq szerBACK szerSzafki wysBACK wysSzafki)
      (setq szerSHELF (- szerSzafki (* 2.0 gruboscPlyty) 4.0) wysSHELF (- glSzafki gruboscPlyty 20.0))
      
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
          (setq odstep 50.0)
          (setq curX cncX)
      
      ;; === BUL ===
      (drawBUL curX cncY szerBUL wysBUL unitNum numShelves gruboscPlyty
        (or (= numDoors 2) (= hingePos "L"))
        (if (or (= numDoors 2) (= hingePos "L")) hingePositions nil)
        nil)
      ;; Rail bracket + partitioner screws on BUL
      (if (= hasRail "Y")
        (progn
          (drawLCRailHolesBUL curX cncY szerBUL railAbsY)
          (drawLCRailPartHolesBUL curX cncY szerBUL railPartCenterY)))
      (setq curX (+ curX szerBUL odstep))
      
      ;; === BUR ===
      (drawBUR curX cncY szerBUL wysBUL unitNum numShelves gruboscPlyty
        (or (= numDoors 2) (= hingePos "R"))
        (if (or (= numDoors 2) (= hingePos "R")) hingePositions nil)
        nil)
      ;; Rail bracket + partitioner screws on BUR
      (if (= hasRail "Y")
        (progn
          (drawLCRailHolesBUR curX cncY szerBUL railAbsY)
          (drawLCRailPartHolesBUR curX cncY szerBUL railPartCenterY)))
      (setq curX (+ curX szerBUL odstep))
      
      ;; === TOP ===
      (drawTOP_ROT90 curX cncY wysTOP szerTOP unitNum gruboscPlyty)
      (drawText "UNIT_NUMBER" (+ curX (/ wysTOP 2.0)) (- (+ cncY (/ szerTOP 2.0)) 30.0) 30.0 (strcat unitNum "-TOP PANEL"))
      (setq curX (+ curX wysTOP odstep))
      
      ;; === BOTTOM ===
      (drawBOTTOM_ROT90 curX cncY wysTOP szerTOP unitNum gruboscPlyty)
      (drawText "UNIT_NUMBER" (+ curX (/ wysTOP 2.0)) (- (+ cncY (/ szerTOP 2.0)) 30.0) 30.0 (strcat unitNum "-BOTTOM PANEL"))
      (setq curX (+ curX wysTOP odstep))
      
      ;; === BACK ===
      (drawBACK curX cncY szerBACK wysBACK unitNum gruboscPlyty)
      (if (= hasRail "Y")
        (drawLCRailPartHolesBACK curX cncY szerBACK gruboscPlyty railPartCenterY))
      (setq curX (+ curX szerBACK odstep))
      
      ;; === SHELVES (rotated 90) ===
      (setq i 1)
      (while (<= i numShelves)
        (drawSHELF curX cncY wysSHELF szerSHELF unitNum i)
        (setq curX (+ curX wysSHELF odstep))
        (setq i (1+ i)))
      
      ;; === RAIL PARTITIONER PANEL (rotated 90) ===
      (if (= hasRail "Y")
        (progn
          (setq curX (+ curX 50.0))
          (drawRect "OUTLINE" curX cncY (+ curX wysRAILPART) (+ cncY szerRAILPART))
          (drawText "UNIT_NUMBER" (+ curX (/ wysRAILPART 2.0)) (+ cncY (/ szerRAILPART 2.0)) 40.0 (strcat unitNum "-RAIL PARTITION"))
          (setq curX (+ curX wysRAILPART odstep))))
      
      ;; === FRONT PANELS (doors) ===
      (setq curX (+ curX 100.0))
      (if (= numDoors 1)
        (progn
          (drawFRONT curX cncY szerFront wysFront unitNum (strcat unitNum "-F") hingePos hingeCupList)
          (setq curX (+ curX szerFront odstep)))
        (progn
          (drawFRONT curX cncY szerFront wysFront unitNum (strcat unitNum "-FL") "L" hingeCupList)
          (setq curX (+ curX szerFront odstep))
          (drawFRONT curX cncY szerFront wysFront unitNum (strcat unitNum "-FR") "R" hingeCupList)
          (setq curX (+ curX szerFront odstep))))
      
      ;;;========================================
      ;;; SUMMARY TEXT BLOCK
      ;;;========================================
      (setq sumX (+ curX 500.0))
      (setq sumY (+ cncY wysBUL))
      (setq lineH 30.0)
      
      ;; Total panels = 5 (BUL + BUR + TOP + BOTTOM + BACK) + shelves + rail partition
      (setq totalPanels (+ 5 numShelves))
      (if (= hasRail "Y") (setq totalPanels (+ totalPanels 1)))
      (setq numFronts (if (= numDoors 1) 1 2))
      
      ;; Total SQM
      (setq totalSQM (+
        (* szerBUL wysBUL 2.0)
        (* szerTOP wysTOP 2.0)
        (* szerBACK wysBACK)
        (* szerSHELF wysSHELF numShelves)))
      (if (= hasRail "Y")
        (setq totalSQM (+ totalSQM (* szerRAILPART wysRAILPART))))
      (setq totalSQM (/ totalSQM 1000000.0))
      
      (setq totalEdging (+
        (* wysBUL 2.0)
        (* szerTOP 2.0)
        (* szerSHELF numShelves)))
      (setq totalEdging (/ totalEdging 1000.0))
      
      ;; SUMMARY LINES
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "UNIT: " unitNum " (LOW CABINET)"))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "Hinges: " (itoa numHinges) ", Legs: 100mm"))
      (setq sumY (- sumY (* lineH 1.2)))
      (if (= hasRail "Y")
        (progn
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "Rail at: " (rtos railAbsY 2 0) "mm"))
          (setq sumY (- sumY (* lineH 1.2)))))
      (drawTextL "SUMMARY" sumX sumY lineH "---------")
      (setq sumY (- sumY (* lineH 1.2)))
      
      ;; Carcase panels
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "1. BUL: " (rtos szerBUL 2 0) " x " (rtos wysBUL 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "2. BUR: " (rtos szerBUL 2 0) " x " (rtos wysBUL 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "3. TOP: " (rtos szerTOP 2 0) " x " (rtos wysTOP 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "4. BOTTOM: " (rtos szerTOP 2 0) " x " (rtos wysTOP 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "5. BACK: " (rtos szerBACK 2 0) " x " (rtos wysBACK 2 0)))
      (setq sumY (- sumY (* lineH 1.2)))
      (if (> numShelves 0)
        (progn
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "6. SHELF: " (rtos szerSHELF 2 0) " x " (rtos wysSHELF 2 0) (if (> numShelves 1) (strcat " x" (itoa numShelves)) "")))
          (setq sumY (- sumY (* lineH 1.2)))))
      (if (= hasRail "Y")
        (progn
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "RAIL PARTITION: " (rtos szerRAILPART 2 0) " x " (rtos wysRAILPART 2 0)))
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
  
  ;; Restore state
  (if _oldClayer  (setvar "CLAYER"  _oldClayer))
  (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
  (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
  (setq *error* _olderr)
  
  (princ (strcat "\nLOW_CABINET_FULL " unitNum " - Done! (" (itoa numDoors) " " (cond ((= doorType "S") "Shaker") ((= doorType "H") "Handleless") (T "Flat")) " door(s), " (itoa numHinges) " hinges)"))
  (princ (strcat "\n  Cabinet: " (rtos szerSzafki 2 0) "x" (rtos wysSzafki 2 0) "x" (rtos glSzafki 2 0) "mm, G=" (rtos gruboscPlyty 2 0) "mm"))
  (if (= hasRail "Y")
    (princ (strcat "\n  Rail at: " (rtos railAbsY 2 0) "mm")))
  (if (= numDoors 1)
    (princ (strcat "\n  Front: " (rtos (- szerSzafki 3.0) 2 0) "x" (rtos (- wysSzafki 3.0) 2 0) "mm, hinge " hingePos))
    (princ (strcat "\n  Fronts: 2x " (rtos (/ (- szerSzafki 6.0) 2.0) 2 0) "x" (rtos (- wysSzafki 3.0) 2 0) "mm")))
  (princ (strcat "\n  Shelves: " (itoa numShelves) ", CNC: " (if (= drawCNC "Y") "Yes" "No")))
  (princ))

(princ "\nKIT_LOW_CABINET_FULL loaded. Type LOW_CABINET_FULL to run.")
(princ)