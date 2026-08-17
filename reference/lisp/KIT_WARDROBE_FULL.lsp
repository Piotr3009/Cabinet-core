;;;========================================
;;; KIT_WARDROBE_FULL.lsp
;;; Wardrobe with Doors - TOP + FRONT views + CNC panels
;;; Command: WARDROBE_FULL
;;; Features:
;;;   - 100mm legs (same as kitchen base units)
;;;   - Internal drawers (1-6), all equal 164mm side / 200mm front
;;;   - First drawer front -3mm (197mm) to clear bottom panel
;;;   - Drawers set back 50mm from front (behind doors)
;;;   - Drawer Panel: vertical panel on hinge side (30mm inset, 50mm setback)
;;;     carries runner holes, prevents hinge/drawer collision
;;;   - 30mm filler panel closes gap between BUL/BUR and Drawer Panel
;;;   - Partition Panel (fixed shelf) above drawers - full width/depth
;;;   - Hanging rail option
;;;   - Shelves positioned from partition upward
;;; Min height: 1800mm
;;; Hinges: 5 (1800-2099mm) or 6 (>=2100mm)
;;; Requires: SKYLON_COMMON.lsp loaded first
;;;========================================

;;; Auto-load COMMON if not already loaded
(if (null drawRect) (load "SKYLON_COMMON"))

;;;========================================
;;; A. FRONT VIEW DRAWER HELPERS
;;;========================================

;;; Draw internal drawers in FRONT VIEW 1 (carcase view)
;;; Uses RUNNER_L/RUNNER_R blocks if available, else simplified
;;; First drawer front is 3mm shorter
;;; dpLeft/dpRight: T if drawer panel present on that side (shifts runner/box positions)
(defun drawWardrobeDrawersFront (x0 y0 szer G numDr drFrontH drSideH drGap
                                  dpLeft dpRight dpInset /
                                  boxX1 boxX2 zoneY boxY runnerW xL xR
                                  hasBlocks oldLay frontBottom frontH i)
  ;; Drawer box X limits (shifted inward where drawer panel exists)
  (if dpLeft
    (setq boxX1 (+ x0 G dpInset G 5.0)
          xL    (+ x0 G dpInset G))
    (setq boxX1 (+ x0 G 5.0)
          xL    (+ x0 G)))
  (if dpRight
    (setq boxX2 (- (+ x0 szer) G dpInset G 5.0)
          xR    (- (+ x0 szer) G dpInset G))
    (setq boxX2 (- (+ x0 szer) G 5.0)
          xR    (- (+ x0 szer) G)))
  (setq hasBlocks (and (tblsearch "BLOCK" "RUNNER_L") (tblsearch "BLOCK" "RUNNER_R")))
  (setq i 0)
  (while (< i numDr)
    (setq zoneY (+ y0 G (* i (+ drFrontH drGap))))
    ;; Runner blocks or simplified
    (if hasBlocks
      (progn
        (setq oldLay (getvar "CLAYER"))
        (setvar "CLAYER" "RUNNERS")
        (command "._-INSERT" "RUNNER_L" "_non" (list xL zoneY) 1.0 1.0 0.0)
        (command "._-INSERT" "RUNNER_R" "_non" (list xR zoneY) 1.0 1.0 0.0)
        (setvar "CLAYER" oldLay))
      (progn
        (setq runnerW 40.0)
        (drawRect "RUNNERS" xL zoneY (+ xL runnerW) (+ zoneY 15.0))
        (drawRect "RUNNERS" (- xR runnerW) zoneY xR (+ zoneY 15.0))))
    ;; Drawer box (164mm high, 29mm above zone bottom = 38mm runner - 9mm drop)
    (setq boxY (+ zoneY 29.0))
    (drawRect "DRAWERS" boxX1 boxY boxX2 (+ boxY drSideH))
    ;; Drawer front indication (first front 3mm shorter from bottom)
    (if (= i 0)
      (progn
        (setq frontBottom (+ zoneY 3.0))
        (setq frontH (- drFrontH 3.0)))
      (progn
        (setq frontBottom zoneY)
        (setq frontH drFrontH)))
    (drawLine "DRAWERS" boxX1 frontBottom boxX2 frontBottom)
    (drawLine "DRAWERS" boxX1 (+ frontBottom frontH) boxX2 (+ frontBottom frontH))
    (setq i (1+ i))))

;;; Draw Drawer Panel(s) in FRONT VIEW 1 (vertical panel on hinge side)
(defun drawWardrobeDrawerPanelFront (x0 y0 szer G dpLeft dpRight dpInset dpBottom dpTop /)
  (if dpLeft
    (drawRect "CARCASE"
      (+ x0 G dpInset) dpBottom
      (+ x0 G dpInset G) dpTop))
  (if dpRight
    (drawRect "CARCASE"
      (- (+ x0 szer) G dpInset G) dpBottom
      (- (+ x0 szer) G dpInset) dpTop)))

;;; Draw 30mm filler(s) in FRONT VIEW 1
(defun drawWardrobeFillerFront (x0 y0 szer G dpLeft dpRight dpInset dpBottom dpTop /)
  (if dpLeft
    (drawRect "CARCASE"
      (+ x0 G) dpBottom
      (+ x0 G dpInset) dpTop))
  (if dpRight
    (drawRect "CARCASE"
      (- (+ x0 szer) G dpInset) dpBottom
      (- (+ x0 szer) G) dpTop)))

;;; Draw internal drawer indication in FRONT VIEW 2 (behind doors)
;;; First drawer front 3mm shorter
(defun drawWardrobeDrawersFront2 (x0 y0 szer G numDr drFrontH drGap /
                                   fX1 fX2 zoneY frontBottom frontH i)
  (setq fX1 (+ x0 G 2.0))
  (setq fX2 (- (+ x0 szer) G 2.0))
  (setq i 0)
  (while (< i numDr)
    (setq zoneY (+ y0 G (* i (+ drFrontH drGap))))
    (if (= i 0)
      (progn
        (setq frontBottom (+ zoneY 3.0))
        (setq frontH (- drFrontH 3.0)))
      (progn
        (setq frontBottom zoneY)
        (setq frontH drFrontH)))
    (drawRect "DRAWERS" fX1 frontBottom fX2 (+ frontBottom frontH))
    (setq i (1+ i))))

;;;========================================
;;; B. PARTITION + SHELF FRONT VIEW HELPERS
;;;========================================

;;; Draw partition (fixed shelf) in FRONT VIEW above drawers
(defun drawWardrobePartitionFront (x0 y0 szer G wieniecY /
                                    wX1 wX2 wY1 wY2)
  (setq wX1 (+ x0 G))
  (setq wX2 (- (+ x0 szer) G))
  (setq wY1 (+ y0 wieniecY))
  (setq wY2 (+ wY1 G))
  (drawRect "CARCASE" wX1 wY1 wX2 wY2))

;;; Draw shelves positioned in upper zone (from shelfZoneBottom to shelfZoneTop)
(defun drawWardrobeShelvesFront (x0 y0 szer G numShelves shelfZoneBottom shelfZoneTop /
                                  shelfX1 shelfX2 spacing shelfY i)
  (if (> numShelves 0)
    (progn
      (setq shelfX1 (+ x0 G 2.0))
      (setq shelfX2 (- (+ x0 szer) G 2.0))
      (setq spacing (/ (- shelfZoneTop shelfZoneBottom) (+ numShelves 1.0)))
      (setq i 1)
      (while (<= i numShelves)
        (setq shelfY (+ y0 shelfZoneBottom (* spacing i)))
        (drawRect "CARCASE" shelfX1 shelfY shelfX2 (+ shelfY G))
        (setq i (1+ i))))))

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
;;; C. CNC PANEL FUNCTIONS
;;;========================================

;;; Create drawer-specific CNC layers
(defun createWardrobeDrawerCNCLayers ()
  (command "._LAYER" "_N" "DRAWERS" "_C" "8" "DRAWERS" "")
  (command "._LAYER" "_N" "RUNNERS_3MM" "_C" "5" "RUNNERS_3MM" "")
  (command "._LAYER" "_N" "DRAWER_SIDE_OUTLINE" "_C" "8" "DRAWER_SIDE_OUTLINE" "")
  (command "._LAYER" "_N" "DRAWER_RUNNER_POCKET" "_C" "1" "DRAWER_RUNNER_POCKET" "")
  (command "._LAYER" "_N" "DRAWER_BOTTOM_POCKET" "_C" "2" "DRAWER_BOTTOM_POCKET" "")
  (command "._LAYER" "_N" "SCREWS_3MM" "_C" "3" "SCREWS_3MM" "")
  (command "._LAYER" "_N" "DRAWER_FRONT_OUTLINE" "_C" "6" "DRAWER_FRONT_OUTLINE" "")
  (command "._LAYER" "_N" "FRONT_HINGES_3MM" "_C" "1" "FRONT_HINGES_3MM" ""))

;;; Drawer side panel (same as BUDR)
(defun drawWDR_SIDE (x0 y0 szufDl wysSIDE unitNum drawerNum sideNum G / midX midY)
  (setq midX (+ x0 (/ wysSIDE 2.0)) midY (+ y0 (/ szufDl 2.0)))
  (drawRect "DRAWER_SIDE_OUTLINE" x0 y0 (+ x0 wysSIDE) (+ y0 szufDl))
  (drawRect "DRAWER_RUNNER_POCKET" x0 (- y0 10.0) (+ x0 15.0) (+ y0 szufDl 10.0))
  (drawRect "DRAWER_BOTTOM_POCKET" (+ x0 15.0) (- y0 10.0) (+ x0 15.0 G 1.0) (+ y0 szufDl 10.0))
  (drawText "UNIT_NUMBER" midX midY 30.0 (strcat unitNum "-D" (itoa drawerNum))))

;;; Drawer box front/back panel
;;; Screws on front piece at (50,50) and (50,dlBox-50) - BUDR style
(defun drawWDR_BOX_FRONT (x0 y0 dlBox wysBox unitNum drawerNum isFront / midX midY)
  (setq midX (+ x0 (/ wysBox 2.0)) midY (+ y0 (/ dlBox 2.0)))
  (drawRect "DRAWER_SIDE_OUTLINE" x0 y0 (+ x0 wysBox) (+ y0 dlBox))
  (if isFront
    (progn
      (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 50.0) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 dlBox -50.0) 1.5)))
  (drawText "UNIT_NUMBER" midX midY 24.0 (strcat unitNum "-D" (itoa drawerNum))))

;;; Drawer bottom panel
(defun drawWDR_BOTTOM (x0 y0 szerDno dlDno unitNum drawerNum / midX midY)
  (setq midX (+ x0 (/ szerDno 2.0)) midY (+ y0 (/ dlDno 2.0)))
  (drawRect "DRAWER_SIDE_OUTLINE" x0 y0 (+ x0 szerDno) (+ y0 dlDno))
  (drawCircle "SCREWS_3MM" (+ x0 70.0) (+ y0 9.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szerDno -70.0) (+ y0 9.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 70.0) (+ y0 dlDno -9.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szerDno -70.0) (+ y0 dlDno -9.0) 1.5)
  (drawText "UNIT_NUMBER" midX midY 24.0 (strcat unitNum "-D" (itoa drawerNum))))

;;; Partition Panel CNC (full width + depth, OUTLINE layer)
(defun drawWDR_PARTITION_PANEL (x0 y0 szerW wysW unitNum / midX midY)
  (setq midX (+ x0 (/ szerW 2.0)) midY (+ y0 (/ wysW 2.0)))
  (drawRect "OUTLINE" x0 y0 (+ x0 szerW) (+ y0 wysW))
  (drawText "UNIT_NUMBER" midX midY 40.0 (strcat unitNum "-PARTITION PANEL")))

;;; Drawer Panel CNC - vertical panel on hinge side with runner holes
;;; szerDP = depth of panel (glSzafki - G - 50mm setback)
;;; wysDP = height of panel (wieniecY - G)
;;; side = "L" or "R" (R is mirrored runner holes)
;;; runnerYRelDP = runner Y positions relative to panel bottom
;;; runnerXOff = extra X offset for runners (drawerFrontG, shifts runners back)
(defun drawWDR_DRAWER_PANEL (x0 y0 szerDP wysDP unitNum side runnerYRelDP runnerXOff / midX midY midH rY)
  (setq midX (+ x0 (/ szerDP 2.0)) midY (+ y0 (/ wysDP 2.0)))
  (setq midH (/ wysDP 2.0))
  (drawRect "OUTLINE" x0 y0 (+ x0 szerDP) (+ y0 wysDP))
  ;; Runner holes - L: standard, R: mirrored (with X offset for drawer front)
  (if (= side "L")
    (foreach rY runnerYRelDP
      (drawCircle "RUNNERS_3MM" (+ x0 37.0 runnerXOff) (+ y0 rY) 1.5)
      (drawCircle "RUNNERS_3MM" (+ x0 69.0 runnerXOff) (+ y0 rY) 1.5)
      (drawCircle "RUNNERS_3MM" (+ x0 293.0 runnerXOff) (+ y0 rY) 1.5))
    (foreach rY runnerYRelDP
      (drawCircle "RUNNERS_3MM" (- (+ x0 szerDP) 37.0 runnerXOff) (+ y0 rY) 1.5)
      (drawCircle "RUNNERS_3MM" (- (+ x0 szerDP) 69.0 runnerXOff) (+ y0 rY) 1.5)
      (drawCircle "RUNNERS_3MM" (- (+ x0 szerDP) 293.0 runnerXOff) (+ y0 rY) 1.5)))
  ;; Structural screws - L: standard, R: mirrored
  (if (= side "L")
    (progn
      ;; 3 holes at 49mm from front (BUL/BUR attachment)
      (drawCircle "SCREWS_3MM" (+ x0 49.0) (+ y0 50.0) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 49.0) (+ y0 midH) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 49.0) (+ y0 wysDP -50.0) 1.5)
      ;; 3 holes at 9mm from back edge (filler attachment)
      (drawCircle "SCREWS_3MM" (+ x0 szerDP -9.0) (+ y0 50.0) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 szerDP -9.0) (+ y0 midH) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 szerDP -9.0) (+ y0 wysDP -50.0) 1.5))
    (progn
      ;; R mirrored: 3 holes at szerDP-49 from left (BUR attachment)
      (drawCircle "SCREWS_3MM" (- (+ x0 szerDP) 49.0) (+ y0 50.0) 1.5)
      (drawCircle "SCREWS_3MM" (- (+ x0 szerDP) 49.0) (+ y0 midH) 1.5)
      (drawCircle "SCREWS_3MM" (- (+ x0 szerDP) 49.0) (+ y0 wysDP -50.0) 1.5)
      ;; R mirrored: 3 holes at 9mm from left (filler attachment)
      (drawCircle "SCREWS_3MM" (+ x0 9.0) (+ y0 50.0) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 9.0) (+ y0 midH) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 9.0) (+ y0 wysDP -50.0) 1.5)))
  (drawText "UNIT_NUMBER" midX midY 30.0 (strcat unitNum "-DRAWER PANEL")))

;;; 30mm Filler CNC - closing gap, no screw holes
(defun drawWDR_FILLER (x0 y0 szerF wysF unitNum fillerNum / midX midY)
  (setq midX (+ x0 (/ szerF 2.0)) midY (+ y0 (/ wysF 2.0)))
  (drawRect "OUTLINE" x0 y0 (+ x0 szerF) (+ y0 wysF))
  (drawText "UNIT_NUMBER" midX midY 20.0 (strcat unitNum "-F" (itoa fillerNum))))

;;; Wardrobe Drawer Front CNC panel (visible front, attached to drawer box)
;;; szerDF = front width (szufSzer + 4mm, 2mm wider each side than box)
;;; wysDF = front height (drawerFrontH or drawerFrontH - 3 for first)
;;; drawerNum = drawer number (1=first, 93.5mm; rest=96.5mm from bottom)
;;; G = board thickness for parametric screw position
;;; Screw X = 50 + G + 2 (box screw + material + runner space - gap)
(defun drawWDR_DRAWER_FRONT (x0 y0 szerDF wysDF unitNum drawerNum G / midX midY screwY screwX)
  (setq midX (+ x0 (/ szerDF 2.0)) midY (+ y0 (/ wysDF 2.0)))
  (drawRect "DRAWER_FRONT_OUTLINE" x0 y0 (+ x0 szerDF) (+ y0 wysDF))
  (if (= drawerNum 1)
    (setq screwY 93.5)
    (setq screwY 96.5))
  (setq screwX (+ 50.0 G 2.0))
  (drawCircle "FRONT_HINGES_3MM" (+ x0 screwX) (+ y0 screwY) 1.5)
  (drawCircle "FRONT_HINGES_3MM" (- (+ x0 szerDF) screwX) (+ y0 screwY) 1.5)
  (drawText "UNIT_NUMBER" midX midY 30.0 (strcat unitNum "-DF" (itoa drawerNum))))

;;;========================================
;;; D. CNC HOLE HELPERS (drawn after BUL/BUR/BACK)
;;;========================================

;;; Runner holes on BUL with 50mm setback - only for NON-hinge side
(defun drawWardrobeRunnerHolesBUL (x0 y0 runnerYRel setback / rY)
  (foreach rY runnerYRel
    (drawCircle "RUNNERS_3MM" (+ x0 37.0 setback) (+ y0 rY) 1.5)
    (drawCircle "RUNNERS_3MM" (+ x0 69.0 setback) (+ y0 rY) 1.5)
    (drawCircle "RUNNERS_3MM" (+ x0 293.0 setback) (+ y0 rY) 1.5)))

;;; Runner holes on BUR with 50mm setback - only for NON-hinge side
(defun drawWardrobeRunnerHolesBUR (x0 y0 szer runnerYRel setback / rY)
  (foreach rY runnerYRel
    (drawCircle "RUNNERS_3MM" (- (+ x0 szer) 37.0 setback) (+ y0 rY) 1.5)
    (drawCircle "RUNNERS_3MM" (- (+ x0 szer) 69.0 setback) (+ y0 rY) 1.5)
    (drawCircle "RUNNERS_3MM" (- (+ x0 szer) 293.0 setback) (+ y0 rY) 1.5)))

;;; Partition confirmat holes on BUL (3 holes along depth)
(defun drawWardrobePartitionHolesBUL (x0 y0 szer wieniecCenterY / hY)
  (setq hY (+ y0 wieniecCenterY))
  (drawCircle "SCREWS_3MM" (+ x0 50.0) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) hY 1.5))

;;; Partition confirmat holes on BUR (3 holes along depth)
(defun drawWardrobePartitionHolesBUR (x0 y0 szer wieniecCenterY / hY)
  (setq hY (+ y0 wieniecCenterY))
  (drawCircle "SCREWS_3MM" (+ x0 50.0) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) hY 1.5))

;;; Partition confirmat holes on BACK (3 holes along width)
(defun drawWardrobePartitionHolesBACK (x0 y0 szer G wieniecCenterY / hY)
  (setq hY (+ y0 wieniecCenterY))
  (drawCircle "SCREWS_3MM" (+ x0 G 50.0) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer (- G) -50.0) hY 1.5))

;;; Drawer Panel attachment holes on BUL (2 holes along depth at 99mm from front)
;;; dpScrewDepth = X position on BUL CNC panel (99mm from front edge)
(defun drawWardrobeDPHolesBUL (x0 y0 dpScrewDepth dpBottomY dpTopY /)
  (drawCircle "SCREWS_3MM" (+ x0 dpScrewDepth) (+ y0 dpBottomY 50.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 dpScrewDepth) (+ y0 dpTopY -50.0) 1.5))

;;; Drawer Panel attachment holes on BUR (mirrored)
(defun drawWardrobeDPHolesBUR (x0 y0 szer dpScrewDepth dpBottomY dpTopY /)
  (drawCircle "SCREWS_3MM" (- (+ x0 szer) dpScrewDepth) (+ y0 dpBottomY 50.0) 1.5)
  (drawCircle "SCREWS_3MM" (- (+ x0 szer) dpScrewDepth) (+ y0 dpTopY -50.0) 1.5))

;;; Drawer Panel attachment holes on BOTTOM (rotated 90: X=depth, Y=width)
;;; dpInsetCenter = 39mm position across width for DP center
;;; dpScrewDepth = 99mm from front, second hole near back of DP
(defun drawWardrobeDPHolesBOTTOM (x0 y0 szerBOT dpLeft dpRight dpInsetCenter dpScrewDepth drawerPanelD /)
  (if dpLeft
    (progn
      (drawCircle "SCREWS_3MM" (+ x0 dpScrewDepth) (+ y0 dpInsetCenter) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 drawerPanelD -50.0) (+ y0 dpInsetCenter) 1.5)))
  (if dpRight
    (progn
      (drawCircle "SCREWS_3MM" (+ x0 dpScrewDepth) (- (+ y0 szerBOT) dpInsetCenter) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 drawerPanelD -50.0) (- (+ y0 szerBOT) dpInsetCenter) 1.5))))

;;; Drawer Panel attachment holes on BACK (X=width, Y=height)
;;; DP center across width: G + dpInset + G/2 from back panel edge
(defun drawWardrobeDPHolesBACK (x0 y0 szerBACK G dpLeft dpRight dpInset dpBottomY dpTopY /
                                 leftX rightX)
  (setq leftX (+ x0 G dpInset (/ G 2.0)))
  (setq rightX (- (+ x0 szerBACK) G dpInset (/ G 2.0)))
  (if dpLeft
    (progn
      (drawCircle "SCREWS_3MM" leftX (+ y0 dpBottomY 50.0) 1.5)
      (drawCircle "SCREWS_3MM" leftX (+ y0 dpTopY -50.0) 1.5)))
  (if dpRight
    (progn
      (drawCircle "SCREWS_3MM" rightX (+ y0 dpBottomY 50.0) 1.5)
      (drawCircle "SCREWS_3MM" rightX (+ y0 dpTopY -50.0) 1.5))))

;;; Shelf pin holes on BUL in upper zone
(defun drawWardrobeShelfHolesBUL (x0 y0 szer numShelves shelfZoneBottom shelfZoneTop /
                                    spacing shelfY i)
  (if (> numShelves 0)
    (progn
      (setq spacing (/ (- shelfZoneTop shelfZoneBottom) (+ numShelves 1.0)))
      (setq i 1)
      (while (<= i numShelves)
        (setq shelfY (+ y0 shelfZoneBottom (* spacing i)))
        (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (- shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 70.0) shelfY 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (+ shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) (- shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) shelfY 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) (+ shelfY 50.0) 3.75)
        (setq i (1+ i))))))

;;; Shelf pin holes on BUR in upper zone (same layout)
(defun drawWardrobeShelfHolesBUR (x0 y0 szer numShelves shelfZoneBottom shelfZoneTop /)
  (drawWardrobeShelfHolesBUL x0 y0 szer numShelves shelfZoneBottom shelfZoneTop))

;;; Rail bracket screw on BUL (1 screw at center of depth)
(defun drawWardrobeRailHolesBUL (x0 y0 szer railAbsY /)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) (+ y0 railAbsY) 1.5))

;;; Rail bracket screw on BUR (1 screw at center of depth)
(defun drawWardrobeRailHolesBUR (x0 y0 szer railAbsY /)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) (+ y0 railAbsY) 1.5))

;;; Rail partitioner screws on BUL (3 holes along depth, like drawer partitioner)
(defun drawWardrobeRailPartHolesBUL (x0 y0 szer railPartCenterY / hY)
  (setq hY (+ y0 railPartCenterY))
  (drawCircle "SCREWS_3MM" (+ x0 50.0) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) hY 1.5))

;;; Rail partitioner screws on BUR (same pattern)
(defun drawWardrobeRailPartHolesBUR (x0 y0 szer railPartCenterY / hY)
  (drawWardrobeRailPartHolesBUL x0 y0 szer railPartCenterY))

;;; Rail partitioner screws on BACK (3 holes along width)
(defun drawWardrobeRailPartHolesBACK (x0 y0 szer G railPartCenterY / hY)
  (setq hY (+ y0 railPartCenterY))
  (drawCircle "SCREWS_3MM" (+ x0 G 50.0) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 (/ szer 2.0)) hY 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer (- G) -50.0) hY 1.5))

;;;========================================
;;; E. MAIN WARDROBE COMMAND
;;;========================================

(defun c:WARDROBE_FULL ( / szerSzafki glSzafki gruboscPlyty gruboscDrzwi
                    numShelves unitNum pt x0 y0 doorType hingePos
                    wewSzer wewGl doorWidth numDoors doorGap
                    hingeX hingeY hingePositions hingeCupList hingeFrontYList
                    wysSzafki frontY1 frontY2 numHinges legHeight
                    hasRail railOffset railAbsY railPartY railPartCenterY railLen railBlkName
                    szerRAILPART wysRAILPART
                    hasDrawers numDrawers
                    drawerSetback drawerSideH drawerFrontH drawerGap drFirstAdj
                    szufBok szufSzer szufMaxDl szufDl szufX szufY drawerTotalH
                    wieniecY wieniecCenterY shelfZoneBottom shelfZoneTop
                    dpInset dpLeft dpRight numDrPanels drawerReduction
                    drawerPanelH drawerPanelD fillerW fillerH
                    dpBottomY dpTopY dpInsetCenter dpScrewDepth
                    drawerFrontG fillerFrontOff boxSetback drawerFrontW dfY dfH
                    runnerYRel runnerYRelDP
                    drawCNC cncX cncY cncPt cncStartX odstep curX
                    szerBUL wysBUL szerTOP wysTOP szerBACK wysBACK
                    szerSHELF wysSHELF szerFront wysFront
                    szerPART wysPART
                    dlBoxFront wysBoxFront szerDno dlDno
                    i oldLay sumX sumY lineH totalPanels totalSQM totalEdging numFronts
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
  (setq legHeight 100.0)
  (setq drawerSetback 50.0)
  (setq drawerSideH 164.0)
  (setq drawerFrontH 200.0)
  (setq drawerGap 3.0)
  (setq drFirstAdj 3.0)
  (setq szufBok 18.0)
  (setq dpInset 30.0)
  (setq fillerW 30.0)
  (setq fillerFrontOff 40.0)    ;; front filler offset from drawerSetback
  
  ;; === INPUT ===
  (setq gruboscPlyty (getreal "\nBoard THICKNESS [mm] (18=standard, 22=heavy) <18>: "))
  (if (or (null gruboscPlyty) (<= gruboscPlyty 0.0)) (setq gruboscPlyty 18.0))
  
  (setq gruboscDrzwi (getreal "\nDoor THICKNESS [mm] (18=MDF, 19=melamine, 25=shaker) <25>: "))
  (if (or (null gruboscDrzwi) (<= gruboscDrzwi 0.0)) (setq gruboscDrzwi 25.0))
  
  (setq doorType (getstring "\nFront type [S=Shaker, H=Handleless (J-groove), F=Flat] <S>: "))
  (if (= doorType "") (setq doorType "S"))
  (setq doorType (strcase doorType))
  (if (not (or (= doorType "F") (= doorType "S") (= doorType "H"))) (setq doorType "S"))
  
  (setq szerSzafki (getreal "\nWardrobe WIDTH [mm] <600>: "))
  (if (or (null szerSzafki) (<= szerSzafki 0.0)) (setq szerSzafki 600.0))
  
  (setq wysSzafki (getreal "\nWardrobe HEIGHT [mm] (min 1800) <2150>: "))
  (if (or (null wysSzafki) (< wysSzafki 1800.0)) (setq wysSzafki 2150.0))
  
  (setq glSzafki (getreal "\nWardrobe DEPTH [mm] <578>: "))
  (if (or (null glSzafki) (<= glSzafki 0.0)) (setq glSzafki 578.0))
  
  ;; === INTERIOR OPTIONS (from bottom up) ===
  (princ "\n--- INTERIOR OPTIONS (from bottom) ---")
  
  ;; 1. Internal drawers
  (setq hasDrawers (getstring "\nInternal DRAWERS at bottom? [Y/N] <N>: "))
  (if (= hasDrawers "") (setq hasDrawers "N"))
  (setq hasDrawers (strcase hasDrawers))
  (if (= hasDrawers "Y")
    (progn
      (setq numDrawers (getint "\nNumber of drawers (1-6) <2>: "))
      (if (or (null numDrawers) (< numDrawers 1)) (setq numDrawers 2))
      (if (> numDrawers 6) (setq numDrawers 6)))
    (setq numDrawers 0))
  
  ;; 2. Hanging rail
  (setq hasRail (getstring "\nHanging RAIL? [Y/N] <Y>: "))
  (if (= hasRail "") (setq hasRail "Y"))
  (setq hasRail (strcase hasRail))
  (if (= hasRail "Y")
    (progn
      (setq railOffset (getreal "\nRail HEIGHT offset above base [mm] <1400>: "))
      (if (or (null railOffset) (<= railOffset 0.0)) (setq railOffset 1400.0))))
  
  ;; 3. Shelves
  (setq numShelves (getint "\nNumber of SHELVES (0-10) <2>: "))
  (if (or (null numShelves) (< numShelves 0)) (setq numShelves 2))
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
  
  (setq unitNum (getstring T "\nUnit NUMBER (e.g. W01, W02): "))
  (if (= unitNum "") (setq unitNum "W01"))
  
  (setq pt (getpoint "\nInsertion point: "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))
  
  (setq x0 (car pt) y0 (cadr pt))
  (setq wewSzer (- szerSzafki (* 2.0 gruboscPlyty)))
  (setq wewGl (- glSzafki gruboscPlyty))
  (setq doorGap 3.0)
  (setq drawerFrontG gruboscDrzwi) ;; drawer front thickness = door thickness
  
  ;; === DRAWER PANEL LOGIC ===
  (if (= hasDrawers "Y")
    (progn
      (if (= numDoors 2)
        (setq dpLeft T dpRight T numDrPanels 2)
        (if (= hingePos "L")
          (setq dpLeft T dpRight nil numDrPanels 1)
          (setq dpLeft nil dpRight T numDrPanels 1)))
      (setq drawerReduction (* numDrPanels (+ dpInset gruboscPlyty))))
    (setq dpLeft nil dpRight nil numDrPanels 0 drawerReduction 0.0))
  
  ;; === DRAWER CALCULATIONS ===
  (if (= hasDrawers "Y")
    (progn
      ;; Drawer depth
      (setq szufMaxDl (- glSzafki gruboscPlyty drawerSetback drawerFrontG 20.0))
      (setq szufDl 390.0)
      (if (>= szufMaxDl 440.0) (setq szufDl 440.0))
      (if (>= szufMaxDl 490.0) (setq szufDl 490.0))
      (if (>= szufMaxDl 540.0) (setq szufDl 540.0))
      (if (>= szufMaxDl 590.0) (setq szufDl 590.0))
      (if (>= szufMaxDl 640.0) (setq szufDl 640.0))
      (if (>= szufMaxDl 690.0) (setq szufDl 690.0))
      (if (< szufMaxDl 390.0)
        (progn
          (princ "\nWARNING: Cabinet too shallow for drawers!")
          (setq hasDrawers "N" numDrawers 0 dpLeft nil dpRight nil numDrPanels 0 drawerReduction 0.0)))
      ;; Drawer width = internal - clearance - drawer panel reduction
      (setq szufSzer (- wewSzer 10.0 drawerReduction))
      ;; Drawer front width = box + 2mm each side
      (setq drawerFrontW (+ szufSzer 4.0))
      ;; Drawer zone total height
      (setq drawerTotalH (+ (* numDrawers drawerFrontH) (* (- numDrawers 1) drawerGap)))
      ;; Validate height
      (if (and (= hasDrawers "Y") (> drawerTotalH (- wysSzafki (* 2.0 gruboscPlyty) 200.0)))
        (progn
          (princ "\nWARNING: Too many drawers for cabinet height!")
          (setq hasDrawers "N" numDrawers 0 dpLeft nil dpRight nil numDrPanels 0 drawerReduction 0.0)))))
  
  ;; === PARTITION + DRAWER PANEL CALCULATIONS ===
  (if (= hasDrawers "Y")
    (progn
      ;; Partition position: 5mm above last drawer front top
      (setq wieniecY (+ gruboscPlyty drawerTotalH 5.0))
      (setq wieniecCenterY (+ wieniecY (/ gruboscPlyty 2.0)))
      ;; Partition CNC dimensions (full internal)
      (setq szerPART (- szerSzafki (* 2.0 gruboscPlyty)))
      (setq wysPART (- glSzafki gruboscPlyty))
      ;; Drawer Panel dimensions
      (setq drawerPanelH (- wieniecY gruboscPlyty))
      (setq drawerPanelD (- glSzafki gruboscPlyty drawerSetback))
      (setq fillerH drawerPanelH)
      ;; BUL/BUR hole reference positions
      (setq dpBottomY gruboscPlyty)
      (setq dpTopY wieniecY)
      (setq dpInsetCenter (+ dpInset (/ gruboscPlyty 2.0)))
      (setq dpScrewDepth 99.0)
      (setq boxSetback (+ drawerSetback drawerFrontG))
      ;; Runner Y positions relative to Drawer Panel bottom (no G offset)
      (setq runnerYRelDP (list))
      (setq i 0)
      (while (< i numDrawers)
        (setq runnerYRelDP (append runnerYRelDP
          (list (+ (* i (+ drawerFrontH drawerGap)) 38.0))))
        (setq i (1+ i)))
      ;; Runner Y positions relative to BUL/BUR bottom (with G offset, for non-hinge side)
      (setq runnerYRel (list))
      (setq i 0)
      (while (< i numDrawers)
        (setq runnerYRel (append runnerYRel
          (list (+ gruboscPlyty (* i (+ drawerFrontH drawerGap)) 38.0))))
        (setq i (1+ i)))
      (princ (strcat "\n  Partition at: " (rtos wieniecY 2 0) "mm"))
      (princ (strcat "\n  Drawer Panel: " (rtos drawerPanelD 2 0) "x" (rtos drawerPanelH 2 0) "mm (x" (itoa numDrPanels) ")"))
      (princ (strcat "\n  Drawer width: " (rtos szufSzer 2 0) "mm (reduced by " (rtos drawerReduction 2 0) "mm)"))))
  
  ;; === RAIL POSITION CALCULATION ===
  (setq railAbsY nil railPartY nil)
  (if (= hasRail "Y")
    (progn
      ;; Rail absolute Y: offset above drawer partitioner or bottom panel
      (if (= hasDrawers "Y")
        (setq railAbsY (+ wieniecY gruboscPlyty railOffset))
        (setq railAbsY (+ gruboscPlyty railOffset)))
      ;; Rail partitioner: 40mm above rail
      (setq railPartY (+ railAbsY 40.0))
      ;; Validate
      (if (> (+ railPartY gruboscPlyty) (- wysSzafki gruboscPlyty 50.0))
        (progn
          (princ "\nWARNING: Rail too high! Adjusting...")
          (setq railAbsY (- wysSzafki gruboscPlyty 50.0 gruboscPlyty 40.0))
          (setq railPartY (+ railAbsY 40.0))))
      ;; Rail partitioner CNC dimensions (same as drawer partition)
      (setq railPartCenterY (+ railPartY (/ gruboscPlyty 2.0)))
      (setq szerRAILPART (- szerSzafki (* 2.0 gruboscPlyty)))
      (setq wysRAILPART (- glSzafki gruboscPlyty))
      (princ (strcat "\n  Rail at: " (rtos railAbsY 2 0) "mm"))
      (princ (strcat "\n  Rail partitioner at: " (rtos railPartY 2 0) "mm"))))
  
  ;; === SHELF ZONE (unified) ===
  (cond
    (railPartY
      (setq shelfZoneBottom (+ railPartY gruboscPlyty)))
    ((= hasDrawers "Y")
      (setq shelfZoneBottom (+ wieniecY gruboscPlyty)))
    (T
      (setq shelfZoneBottom gruboscPlyty)))
  (setq shelfZoneTop (- wysSzafki gruboscPlyty))
  
  ;; Hinge positions (5 or 6 hinges)
  (setq hingePositions (calcHingePositionsTall wysSzafki))
  (setq numHinges (length hingePositions))
  (setq hingeFrontYList (mapcar '(lambda (p) (- p 30.0)) hingePositions))
  
  ;; === LAYERS ===
  (createViewLayers)
  (command "._LAYER" "_N" "DRAWERS" "_C" "5" "DRAWERS" "")
  (command "._LAYER" "_N" "RUNNERS" "_C" "8" "RUNNERS" "")
  
  ;;;========================================
  ;;; TOP VIEW
  ;;;========================================
  ;; CARCASE outline
  (drawRect "CARCASE" x0 y0 (+ x0 szerSzafki) (+ y0 glSzafki))
  (drawRect "CARCASE" x0 y0 (+ x0 gruboscPlyty) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" (- (+ x0 szerSzafki) gruboscPlyty) y0 (+ x0 szerSzafki) (- (+ y0 glSzafki) gruboscPlyty))
  (drawRect "CARCASE" x0 (- (+ y0 glSzafki) gruboscPlyty) (+ x0 szerSzafki) (+ y0 glSzafki))
  
  ;; DRAWER PANEL + FILLER in TOP VIEW
  (if (and (= hasDrawers "Y") dpLeft)
    (progn
      ;; Drawer panel (runs from setback to back)
      (drawRect "CARCASE"
        (+ x0 gruboscPlyty dpInset) (+ y0 drawerSetback)
        (+ x0 gruboscPlyty dpInset gruboscPlyty) (- (+ y0 glSzafki) gruboscPlyty))
      ;; 30mm filler FRONT (moved back by fillerFrontOff=40mm)
      (drawRect "CARCASE"
        (+ x0 gruboscPlyty) (+ y0 drawerSetback fillerFrontOff)
        (+ x0 gruboscPlyty dpInset) (+ y0 drawerSetback fillerFrontOff gruboscPlyty))
      ;; 30mm filler BACK (at back of drawer panel, perpendicular)
      (drawRect "CARCASE"
        (+ x0 gruboscPlyty) (- (+ y0 glSzafki) gruboscPlyty gruboscPlyty)
        (+ x0 gruboscPlyty dpInset) (- (+ y0 glSzafki) gruboscPlyty))))
  
  (if (and (= hasDrawers "Y") dpRight)
    (progn
      ;; Drawer panel (mirrored)
      (drawRect "CARCASE"
        (- (+ x0 szerSzafki) gruboscPlyty dpInset gruboscPlyty) (+ y0 drawerSetback)
        (- (+ x0 szerSzafki) gruboscPlyty dpInset) (- (+ y0 glSzafki) gruboscPlyty))
      ;; 30mm filler FRONT (mirrored, moved back by fillerFrontOff=40mm)
      (drawRect "CARCASE"
        (- (+ x0 szerSzafki) gruboscPlyty dpInset) (+ y0 drawerSetback fillerFrontOff)
        (- (+ x0 szerSzafki) gruboscPlyty) (+ y0 drawerSetback fillerFrontOff gruboscPlyty))
      ;; 30mm filler BACK (mirrored)
      (drawRect "CARCASE"
        (- (+ x0 szerSzafki) gruboscPlyty dpInset) (- (+ y0 glSzafki) gruboscPlyty gruboscPlyty)
        (- (+ x0 szerSzafki) gruboscPlyty) (- (+ y0 glSzafki) gruboscPlyty))))
  
  ;; DRAWER in TOP VIEW (adjusted for drawer panels + front thickness)
  (if (= hasDrawers "Y")
    (progn
      (if dpLeft
        (setq szufX (+ x0 gruboscPlyty dpInset gruboscPlyty 5.0))
        (setq szufX (+ x0 gruboscPlyty 5.0)))
      ;; Drawer box starts at boxSetback (behind front panel)
      (setq szufY (+ y0 boxSetback))
      (drawRect "DRAWERS" szufX szufY (+ szufX szufBok) (+ szufY szufDl))
      (drawRect "DRAWERS" (- (+ szufX szufSzer) szufBok) szufY (+ szufX szufSzer) (+ szufY szufDl))
      (drawRect "DRAWERS" (+ szufX szufBok) szufY (- (+ szufX szufSzer) szufBok) (+ szufY szufBok))
      (drawRect "DRAWERS" (+ szufX szufBok) (- (+ szufY szufDl) szufBok) (- (+ szufX szufSzer) szufBok) (+ szufY szufDl))
      ;; Drawer FRONT panel in TOP VIEW (wider than box by 2mm each side, on DOORS layer)
      (drawRect "DOORS" (- szufX 2.0) (+ y0 drawerSetback) (+ szufX szufSzer 2.0) (+ y0 drawerSetback drawerFrontG))))
  
  ;; RAIL in TOP VIEW
  (if (= hasRail "Y")
    (drawLine "HINGES" 
      (+ x0 gruboscPlyty 50.0) (+ y0 50.0)
      (- (+ x0 szerSzafki) gruboscPlyty 50.0) (+ y0 50.0)))
  
  ;; SHELVES in TOP VIEW
  (if (> numShelves 0)
    (drawRect "SHELVES" 
      (+ x0 gruboscPlyty 2.0) (+ y0 20.0)
      (- (+ x0 szerSzafki) gruboscPlyty 2.0) (- (+ y0 glSzafki) gruboscPlyty)))
  
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
  
  ;; FRONT VIEW 1 - carcase + hinges + legs
  (drawFrontCarcase x0 frontY1 szerSzafki wysSzafki gruboscPlyty)
  (drawFrontHinges x0 frontY1 szerSzafki wysSzafki gruboscPlyty numDoors hingePos unitNum hingeFrontYList)
  (drawLegPairH x0 frontY1 szerSzafki gruboscPlyty legHeight)
  
  ;; DRAWER PANELS + FILLERS + DRAWERS + PARTITION
  (if (= hasDrawers "Y")
    (progn
      (drawWardrobeDrawerPanelFront x0 frontY1 szerSzafki gruboscPlyty
        dpLeft dpRight dpInset (+ frontY1 gruboscPlyty) (+ frontY1 wieniecY))
      (drawWardrobeFillerFront x0 frontY1 szerSzafki gruboscPlyty
        dpLeft dpRight dpInset (+ frontY1 gruboscPlyty) (+ frontY1 wieniecY))
      (drawWardrobeDrawersFront x0 frontY1 szerSzafki gruboscPlyty
        numDrawers drawerFrontH drawerSideH drawerGap dpLeft dpRight dpInset)
      (drawWardrobePartitionFront x0 frontY1 szerSzafki gruboscPlyty wieniecY)))
  
  ;; SHELVES (unified - from shelfZoneBottom/Top calculated earlier)
  (if (> numShelves 0)
    (drawWardrobeShelvesFront x0 frontY1 szerSzafki gruboscPlyty numShelves shelfZoneBottom shelfZoneTop))
  
  ;; RAIL in FRONT VIEW (block on HINGES layer + rail partitioner)
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
  
  ;; FRONT VIEW 2 - doors + indication
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
      (if (= hasDrawers "Y") (createWardrobeDrawerCNCLayers))
      
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
      (drawBUL curX cncY szerBUL wysBUL unitNum
        (if (= hasDrawers "Y") 0 numShelves)
        gruboscPlyty
        (or (= numDoors 2) (= hingePos "L"))
        (if (or (= numDoors 2) (= hingePos "L")) hingePositions nil)
        nil)
      (if (= hasDrawers "Y")
        (progn
          ;; Runner holes on BUL only if NO drawer panel on left
          (if (not dpLeft)
            (drawWardrobeRunnerHolesBUL curX cncY runnerYRel boxSetback))
          (drawWardrobePartitionHolesBUL curX cncY szerBUL wieniecCenterY)
          (drawWardrobeShelfHolesBUL curX cncY szerBUL numShelves shelfZoneBottom shelfZoneTop)
          ;; Drawer panel attachment holes
          (if dpLeft
            (drawWardrobeDPHolesBUL curX cncY dpScrewDepth dpBottomY dpTopY))))
      ;; Rail bracket + partitioner screws on BUL
      (if (= hasRail "Y")
        (progn
          (drawWardrobeRailHolesBUL curX cncY szerBUL railAbsY)
          (drawWardrobeRailPartHolesBUL curX cncY szerBUL railPartCenterY)))
      (setq curX (+ curX szerBUL odstep))
      
      ;; === BUR ===
      (drawBUR curX cncY szerBUL wysBUL unitNum
        (if (= hasDrawers "Y") 0 numShelves)
        gruboscPlyty
        (or (= numDoors 2) (= hingePos "R"))
        (if (or (= numDoors 2) (= hingePos "R")) hingePositions nil)
        nil)
      (if (= hasDrawers "Y")
        (progn
          ;; Runner holes on BUR only if NO drawer panel on right
          (if (not dpRight)
            (drawWardrobeRunnerHolesBUR curX cncY szerBUL runnerYRel boxSetback))
          (drawWardrobePartitionHolesBUR curX cncY szerBUL wieniecCenterY)
          (drawWardrobeShelfHolesBUR curX cncY szerBUL numShelves shelfZoneBottom shelfZoneTop)
          (if dpRight
            (drawWardrobeDPHolesBUR curX cncY szerBUL dpScrewDepth dpBottomY dpTopY))))
      ;; Rail bracket + partitioner screws on BUR
      (if (= hasRail "Y")
        (progn
          (drawWardrobeRailHolesBUR curX cncY szerBUL railAbsY)
          (drawWardrobeRailPartHolesBUR curX cncY szerBUL railPartCenterY)))
      (setq curX (+ curX szerBUL odstep))
      
      ;; === TOP / BOTTOM ===
      (drawTOP_ROT90 curX cncY wysTOP szerTOP unitNum gruboscPlyty)
      (drawText "UNIT_NUMBER" (+ curX (/ wysTOP 2.0)) (- (+ cncY (/ szerTOP 2.0)) 30.0) 30.0 (strcat unitNum "-TOP PANEL"))
      (setq curX (+ curX wysTOP odstep))
      (drawBOTTOM_ROT90 curX cncY wysTOP szerTOP unitNum gruboscPlyty)
      (drawText "UNIT_NUMBER" (+ curX (/ wysTOP 2.0)) (- (+ cncY (/ szerTOP 2.0)) 30.0) 30.0 (strcat unitNum "-BOTTOM PANEL"))
      (if (= hasDrawers "Y")
        (drawWardrobeDPHolesBOTTOM curX cncY szerTOP dpLeft dpRight dpInsetCenter dpScrewDepth drawerPanelD))
      (setq curX (+ curX wysTOP odstep))
      
      ;; === BACK ===
      (drawBACK curX cncY szerBACK wysBACK unitNum gruboscPlyty)
      (if (= hasDrawers "Y")
        (progn
          (drawWardrobePartitionHolesBACK curX cncY szerBACK gruboscPlyty wieniecCenterY)
          (drawWardrobeDPHolesBACK curX cncY szerBACK gruboscPlyty dpLeft dpRight dpInset dpBottomY dpTopY)))
      (if (= hasRail "Y")
        (drawWardrobeRailPartHolesBACK curX cncY szerBACK gruboscPlyty railPartCenterY))
      (setq curX (+ curX szerBACK odstep))
      
      ;; === SHELVES (rotated 90) ===
      (setq i 1)
      (while (<= i numShelves)
        (drawSHELF curX cncY wysSHELF szerSHELF unitNum i)
        (setq curX (+ curX wysSHELF odstep))
        (setq i (1+ i)))
      
      ;; === PARTITION PANEL (rotated 90) ===
      (if (= hasDrawers "Y")
        (progn
          (setq curX (+ curX 50.0))
          (drawWDR_PARTITION_PANEL curX cncY wysPART szerPART unitNum)
          (setq curX (+ curX wysPART odstep))))
      
      ;; === RAIL PARTITIONER PANEL (rotated 90) ===
      (if (= hasRail "Y")
        (progn
          (setq curX (+ curX 50.0))
          (drawRect "OUTLINE" curX cncY (+ curX wysRAILPART) (+ cncY szerRAILPART))
          (drawText "UNIT_NUMBER" (+ curX (/ wysRAILPART 2.0)) (+ cncY (/ szerRAILPART 2.0)) 40.0 (strcat unitNum "-RAIL PARTITION"))
          (setq curX (+ curX wysRAILPART odstep))))
      
      ;; === DRAWER PANEL(S) - L and/or R (mirrored) ===
      (if (= hasDrawers "Y")
        (progn
          (setq curX (+ curX 50.0))
          (if dpLeft
            (progn
              (drawWDR_DRAWER_PANEL curX cncY drawerPanelD drawerPanelH unitNum "L" runnerYRelDP drawerFrontG)
              (setq curX (+ curX drawerPanelD odstep))))
          (if dpRight
            (progn
              (drawWDR_DRAWER_PANEL curX cncY drawerPanelD drawerPanelH unitNum "R" runnerYRelDP drawerFrontG)
              (setq curX (+ curX drawerPanelD odstep))))))
      
      ;; === 30mm FILLER(S) - 2 per drawer panel (front + back) ===
      (if (= hasDrawers "Y")
        (progn
          (setq i 1)
          (while (<= i (* numDrPanels 2))
            (drawWDR_FILLER curX cncY fillerW fillerH unitNum i)
            (setq curX (+ curX fillerW odstep))
            (setq i (1+ i)))))
      
      ;; === DRAWER CNC PANELS ===
      (if (= hasDrawers "Y")
        (progn
          (setq curX (+ curX 100.0))
          ;; Box dimensions (adjusted for drawer panel reduction)
          (setq dlBoxFront (- szerSzafki (* 4.0 gruboscPlyty) 10.0 drawerReduction))
          (setq wysBoxFront (- drawerSideH 15.0 gruboscPlyty 1.0))
          (setq szerDno (+ dlBoxFront 13.0))
          (setq dlDno szufDl)
          
          (setq i 1)
          (while (<= i numDrawers)
            (drawWDR_SIDE curX cncY szufDl drawerSideH unitNum i 1 gruboscPlyty)
            (setq curX (+ curX drawerSideH odstep))
            (drawWDR_SIDE curX cncY szufDl drawerSideH unitNum i 2 gruboscPlyty)
            (setq curX (+ curX drawerSideH odstep))
            (drawWDR_BOX_FRONT curX cncY dlBoxFront wysBoxFront unitNum i T)
            (setq curX (+ curX wysBoxFront odstep))
            (drawWDR_BOX_FRONT curX cncY dlBoxFront wysBoxFront unitNum i nil)
            (setq curX (+ curX wysBoxFront odstep))
            (drawWDR_BOTTOM curX cncY szerDno dlDno unitNum i)
            (setq curX (+ curX szerDno odstep))
            (setq i (1+ i)))))
      
      ;; === DRAWER FRONT PANELS (visible fronts, magenta) ===
      (if (= hasDrawers "Y")
        (progn
          (setq curX (+ curX 100.0))
          (setq dfY cncY)
          (setq i 1)
          (while (<= i numDrawers)
            (if (= i 1)
              (setq dfH (- drawerFrontH 3.0))
              (setq dfH drawerFrontH))
            (drawWDR_DRAWER_FRONT curX dfY drawerFrontW dfH unitNum i gruboscPlyty)
            (setq dfY (+ dfY dfH 3.0))
            (setq i (1+ i)))
          (setq curX (+ curX drawerFrontW odstep))))
      
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
      
      ;; Total panels
      (setq totalPanels (+ 5 numShelves))
      (if (= hasDrawers "Y")
        (setq totalPanels (+ totalPanels 1 numDrPanels (* numDrPanels 2) (* numDrawers 5) numDrawers)))
      (setq numFronts (if (= numDoors 1) 1 2))
      
      ;; Total SQM
      (setq totalSQM (+
        (* szerBUL wysBUL 2.0)
        (* szerTOP wysTOP 2.0)
        (* szerBACK wysBACK)
        (* szerSHELF wysSHELF numShelves)))
      (if (= hasDrawers "Y")
        (setq totalSQM (+ totalSQM
          (* szerPART wysPART)
          (* numDrPanels drawerPanelD drawerPanelH)
          (* numDrPanels 2.0 fillerW fillerH)
          (* numDrawers 2.0 drawerSideH szufDl)
          (* numDrawers 2.0 dlBoxFront wysBoxFront)
          (* numDrawers szerDno dlDno)
          (* numDrawers drawerFrontW drawerFrontH))))
      (setq totalSQM (/ totalSQM 1000000.0))
      
      (setq totalEdging (+
        (* wysBUL 2.0)
        (* szerTOP 2.0)
        (* szerSHELF numShelves)))
      (setq totalEdging (/ totalEdging 1000.0))
      
      ;; SUMMARY LINES
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "UNIT: " unitNum " (WARDROBE)"))
      (setq sumY (- sumY (* lineH 1.2)))
      (drawTextL "SUMMARY" sumX sumY lineH (strcat "Hinges: " (itoa numHinges) ", Legs: 100mm"))
      (setq sumY (- sumY (* lineH 1.2)))
      (if (= hasRail "Y")
        (progn
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "Rail at: " (rtos railAbsY 2 0) "mm"))
          (setq sumY (- sumY (* lineH 1.2)))))
      (if (= hasDrawers "Y")
        (progn
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "Drawers: " (itoa numDrawers) "x (depth " (rtos szufDl 2 0) ", width " (rtos szufSzer 2 0) "mm)"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "Drawer Panel: " (rtos drawerPanelD 2 0) " x " (rtos drawerPanelH 2 0) " x" (itoa numDrPanels)))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "Filler: " (rtos fillerW 2 0) " x " (rtos fillerH 2 0) " x" (itoa (* numDrPanels 2))))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "Partition Panel at: " (rtos wieniecY 2 0) "mm"))
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
      
      ;; Extra panels summary
      (if (= hasDrawers "Y")
        (progn
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "PARTITION PANEL: " (rtos szerPART 2 0) " x " (rtos wysPART 2 0)))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "DRAWER PANEL: " (rtos drawerPanelD 2 0) " x " (rtos drawerPanelH 2 0) " x" (itoa numDrPanels)))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "FILLER: " (rtos fillerW 2 0) " x " (rtos fillerH 2 0) " x" (itoa (* numDrPanels 2))))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "DRAWERS: " (itoa numDrawers) "x equal"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "  SIDE x" (itoa (* numDrawers 2)) ": " (rtos szufDl 2 0) " x " (rtos drawerSideH 2 0)))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "  F/B x" (itoa (* numDrawers 2)) ": " (rtos dlBoxFront 2 0) " x " (rtos wysBoxFront 2 0)))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "  BTM x" (itoa numDrawers) ": " (rtos szerDno 2 0) " x " (rtos dlDno 2 0)))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "  FRONT x" (itoa numDrawers) ": " (rtos drawerFrontW 2 0) " x " (rtos drawerFrontH 2 0)))
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
      (setq csvPath (findfile "KIT_WARDROBE_FULL.lsp"))
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
          ;; Carcase
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
          ;; Shelves
          (setq i 1)
          (while (<= i numShelves)
            (write-line (strcat unitNum ",SHELF-" (itoa i) "," (rtos szerSHELF 2 0) "," (rtos wysSHELF 2 0) ",>,"
              (rtos (/ szerSHELF 1000.0) 2 2) "," (rtos (/ (* szerSHELF wysSHELF) 1000000.0) 2 3)) csvFile)
            (setq i (1+ i)))
          ;; Partition panel
          (if (= hasDrawers "Y")
            (write-line (strcat unitNum ",PARTITION," (rtos szerPART 2 0) "," (rtos wysPART 2 0) ",,0,"
              (rtos (/ (* szerPART wysPART) 1000000.0) 2 3)) csvFile))
          ;; Rail partition
          (if (= hasRail "Y")
            (write-line (strcat unitNum ",RAIL-PART," (rtos szerRAILPART 2 0) "," (rtos wysRAILPART 2 0) ",,0,"
              (rtos (/ (* szerRAILPART wysRAILPART) 1000000.0) 2 3)) csvFile))
          ;; Drawer panels (L/R)
          (if (= hasDrawers "Y")
            (progn
              (if dpLeft
                (write-line (strcat unitNum ",DP-L," (rtos drawerPanelD 2 0) "," (rtos drawerPanelH 2 0) ",,0,"
                  (rtos (/ (* drawerPanelD drawerPanelH) 1000000.0) 2 3)) csvFile))
              (if dpRight
                (write-line (strcat unitNum ",DP-R," (rtos drawerPanelD 2 0) "," (rtos drawerPanelH 2 0) ",,0,"
                  (rtos (/ (* drawerPanelD drawerPanelH) 1000000.0) 2 3)) csvFile))
              ;; Fillers
              (setq i 1)
              (while (<= i (* numDrPanels 2))
                (write-line (strcat unitNum ",FILLER-" (itoa i) "," (rtos fillerW 2 0) "," (rtos fillerH 2 0) ",,0,"
                  (rtos (/ (* fillerW fillerH) 1000000.0) 2 3)) csvFile)
                (setq i (1+ i)))
              ;; Drawer components per drawer
              (setq i 1)
              (while (<= i numDrawers)
                (write-line (strcat unitNum ",D" (itoa i) "-SL," (rtos szufDl 2 0) "," (rtos drawerSideH 2 0) ",,0,"
                  (rtos (/ (* szufDl drawerSideH) 1000000.0) 2 3)) csvFile)
                (write-line (strcat unitNum ",D" (itoa i) "-SR," (rtos szufDl 2 0) "," (rtos drawerSideH 2 0) ",,0,"
                  (rtos (/ (* szufDl drawerSideH) 1000000.0) 2 3)) csvFile)
                (write-line (strcat unitNum ",D" (itoa i) "-BF," (rtos dlBoxFront 2 0) "," (rtos wysBoxFront 2 0) ",,0,"
                  (rtos (/ (* dlBoxFront wysBoxFront) 1000000.0) 2 3)) csvFile)
                (write-line (strcat unitNum ",D" (itoa i) "-BB," (rtos dlBoxFront 2 0) "," (rtos wysBoxFront 2 0) ",,0,"
                  (rtos (/ (* dlBoxFront wysBoxFront) 1000000.0) 2 3)) csvFile)
                (write-line (strcat unitNum ",D" (itoa i) "-DNO," (rtos szerDno 2 0) "," (rtos dlDno 2 0) ",,0,"
                  (rtos (/ (* szerDno dlDno) 1000000.0) 2 3)) csvFile)
                (setq i (1+ i)))
              ;; Drawer fronts
              (setq i 1)
              (while (<= i numDrawers)
                (if (= i 1)
                  (setq dfH (- drawerFrontH 3.0))
                  (setq dfH drawerFrontH))
                (write-line (strcat unitNum "," unitNum "-DF" (itoa i) "," (rtos drawerFrontW 2 0) "," (rtos dfH 2 0) ",<>^v,"
                  (rtos (/ (+ (* 2.0 drawerFrontW) (* 2.0 dfH)) 1000.0) 2 2) "," (rtos (/ (* drawerFrontW dfH) 1000000.0) 2 3)) csvFile)
                (setq i (1+ i)))))
          ;; Door fronts
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
  
  (princ (strcat "\nWARDROBE_FULL " unitNum " - Done! (" (itoa numDoors) " " (cond ((= doorType "S") "Shaker") ((= doorType "H") "Handleless") (T "Flat")) " door(s), " (itoa numHinges) " hinges)"))
  (princ (strcat "\n  Cabinet: " (rtos szerSzafki 2 0) "x" (rtos wysSzafki 2 0) "x" (rtos glSzafki 2 0) "mm, G=" (rtos gruboscPlyty 2 0) "mm"))
  (if (= hasRail "Y")
    (princ (strcat "\n  Rail at: " (rtos railAbsY 2 0) "mm")))
  (if (= hasDrawers "Y")
    (progn
      (princ (strcat "\n  Drawers: " (itoa numDrawers) "x, width=" (rtos szufSzer 2 0) "mm, depth=" (rtos szufDl 2 0) "mm"))
      (princ (strcat "\n  Drawer Panel: " (itoa numDrPanels) "x " (rtos drawerPanelD 2 0) "x" (rtos drawerPanelH 2 0) "mm"))
      (princ (strcat "\n  Partition Panel at: " (rtos wieniecY 2 0) "mm"))))
  (if (= numDoors 1)
    (princ (strcat "\n  Front: " (rtos (- szerSzafki 3.0) 2 0) "x" (rtos (- wysSzafki 3.0) 2 0) "mm, hinge " hingePos))
    (princ (strcat "\n  Fronts: 2x " (rtos (/ (- szerSzafki 6.0) 2.0) 2 0) "x" (rtos (- wysSzafki 3.0) 2 0) "mm")))
  (princ (strcat "\n  Shelves: " (itoa numShelves) ", CNC: " (if (= drawCNC "Y") "Yes" "No")))
  (princ))

(princ "\nKIT_WARDROBE_FULL loaded. Type WARDROBE_FULL to run.")
(princ)

;;;========================================
;; --- SPLIT DOORS (T35)
;;;========================================
;;; Owner, 16.08.2026: "podzial drzwi na dolne i gorne - wystarcza 2 segmenty;
;;; wpisywanie GORNEJ czesci; i zawsze musi byc przedzielone polka FIX, ktora
;;; NIE MA cofniecia 20 mm (automatycznie)."
;;; Confirmed the same evening: the divider shelf is FULL DEPTH, flush with the
;;; front, so BOTH segments have something to close against.
;;;
;;; THE LAW, in the order the numbers are worked out:
;;;   1. OPENING - what the pair of segments has to close between them. It is
;;;      the carcase height less the TOP demand, and that demand is T35-F12's,
;;;      not a standing 3: an infill or a cornice above asks 3.0, NOTHING above
;;;      asks 0 and the front stands flush with the carcase top. See the
;;;      DOOR TOP EDGE (T35) section for the amendment itself; this section
;;;      takes the demand as a number and does not decide it.
;;;   2. TOP is the number the owner types - "wpisywanie GORNEJ czesci".
;;;      0 = no split, and the bay keeps exactly the one door it has today.
;;;   3. BOTTOM = OPENING - TOP - 3.0. That 3.0 is the front matrix's own gap
;;;      between two fronts - the same 3 that already stands between a pair of
;;;      side-by-side doors (doorGap in the main command above).
;;;   4. The DIVIDER is a FIX shelf on the split line, and it is NOT an
;;;      ordinary fix shelf. Ordinary shelves here are cut back:
;;;      `szerSHELF (- szerSzafki (* 2.0 gruboscPlyty) 4.0)` and
;;;      `wysSHELF   (- glSzafki gruboscPlyty 20.0)`. This one is cut to the
;;;      PARTITION PANEL's law instead - full width between the sides, full
;;;      depth to the back panel - so its front edge lands flush with the
;;;      carcase front and each segment has a face to close against.
;;;      "NIE MA cofniecia 20 mm (automatycznie)": the zero is not an option
;;;      offered to the user, it is what a divider IS.
;;;   5. HINGES are counted PER SEGMENT, from that segment's OWN height and
;;;      weight. A split is two doors, not one door with a line drawn on it,
;;;      and it is never the full-height count halved.
;;;   6. BOM/CNC: two fronts and one divider. Each segment is drilled from its
;;;      own hinge edge, exactly as a whole door is.
;;;   7. Side clearances are unchanged; the top edge is F12's; mirrors and
;;;      handles are asked per segment.
;;;
;;; Nothing above this line changes - T35 iron rule 3. This section is additive.

;; The constants of the split. SPLIT_SEG_GAP is the SAME 3.0 as `doorGap` in
;; the main command; it carries its own name so a reader of this section never
;; has to guess which 3 is being looked at.
(setq SPLIT_SEG_GAP    3.0)    ;; mm between the top and the bottom segment
(setq SPLIT_SHELF_BACK 0.0)    ;; the divider's setback - ZERO, "NIE MA cofniecia 20 mm"
(setq SPLIT_SEG_MIN    100.0)  ;; a segment shorter than this is a mistyped number

;;; The opening the two segments close between them. `topDemand` is F12's:
;;; 3.0 with an infill or a cornice above, 0.0 with nothing above.
(defun splitDoorOpening (wysSzafki topDemand)
  (- wysSzafki topDemand))

;;; BOTTOM = OPENING - TOP - 3. The arithmetic the tests pin, in one line:
;;;   top + SPLIT_SEG_GAP + bottom = opening, exactly, at every height.
(defun splitDoorBottomH (opening topH)
  (- opening topH SPLIT_SEG_GAP))

;;; 0 = no split. T only when BOTH segments come out real - a 40 mm "door" is a
;;; mistyped number and not a request, and the bay keeps its single door.
(defun splitDoorActive (opening topH)
  (and topH
       (> topH 0.0)
       (>= topH SPLIT_SEG_MIN)
       (>= (splitDoorBottomH opening topH) SPLIT_SEG_MIN)))

;;; The split line, measured from the same datum as the door's bottom edge: the
;;; UNDERSIDE of the divider is where the bottom segment stops.
(defun splitDoorLineY (opening topH)
  (splitDoorBottomH opening topH))

;;; The divider, cut to the PARTITION PANEL's law and NOT the shelf's. Compare
;;; `szerPART`/`wysPART` in the main command - identical - against
;;; `szerSHELF`/`wysSHELF`, which take 4.0 off the width and 20.0 off the depth.
(defun splitDoorShelfW (szerSzafki G) (- szerSzafki (* 2.0 G)))
(defun splitDoorShelfD (glSzafki G)   (- glSzafki G SPLIT_SHELF_BACK))

;;; HINGES PER SEGMENT. The house counts a wardrobe door's hinges off its own
;;; height (calcHingePositionsTall, SKYLON_COMMON.lsp) and the application
;;; counts them off the published Blum door-height / door-weight chart
;;; (reference/hardware/cliptop-hinge-count.json, check #4). A segment is a
;;; door: the same question is asked twice, once per segment, each time with
;;; that segment's own height and weight.
(defun splitDoorHingeCount (segH segKg)
  (cond
    ((and (<= segH  900.0) (<= segKg  9.0)) 2)
    ((and (<= segH 1600.0) (<= segKg 13.0)) 3)
    ((and (<= segH 2000.0) (<= segKg 19.0)) 4)
    ((and (<= segH 2400.0) (<= segKg 24.0)) 5)
    (T 6)))

;;; The two segments, TOP FIRST - the order the owner reads them in and the
;;; order the modal lists them in ("gorne zawiasy na gorze listy", T35-F5's
;;; order law applied to segments). Each entry is (label height hinges).
(defun splitDoorSegments (opening topH segKg / bottomH)
  (setq bottomH (splitDoorBottomH opening topH))
  (list
    (list "TOP"    topH    (splitDoorHingeCount topH    segKg))
    (list "BOTTOM" bottomH (splitDoorHingeCount bottomH segKg))))

(princ "\nKIT_WARDROBE_FULL: SPLIT DOORS T35 section loaded.")
(princ)


;;;========================================
;; --- DOOR TOP EDGE (T35)
;;;========================================
;;; Owner, 16.08.2026: "jak nie ma infilla, to wysokosc drzwi szafowych jest
;;; bez 3 mm przerwy; a jak dolozysz infill lub cornice, to wtedy skracamy o
;;; 3 mm." Both directions - remove the cornice and the door grows back.
;;;
;;; THE AMENDMENT. This kit says, at L865-866:
;;;
;;;   (if (= numDoors 1)
;;;     (setq szerFront (- szerSzafki 3.0) wysFront (- wysSzafki 3.0))
;;;     (setq szerFront (/ (- szerSzafki 6.0) 2.0) wysFront (- wysSzafki 3.0)))
;;;
;;; - three millimetres off the top, unconditionally, in both branches. So do
;;; KIT_BUD_FULL L200-201, KIT_BUDTALL_FULL L207-208, KIT_LOW_CABINET_FULL
;;; L374-375 and KIT_WUD_FULL L202-203. The house has cut every door that way
;;; since turn 1, and it was never wrong: a kit has no ROOM. It is asked for a
;;; cabinet and it draws a cabinet, and 3 mm off the top is the safe answer
;;; when you cannot see what is standing over the thing.
;;;
;;; The owner CAN see. His amendment does not say the 3 was a mistake; it says
;;; the 3 is a CLEARANCE, and a clearance needs something to be clear OF:
;;;
;;;   TOP DEMAND = 3.0  when an infill or a cornice stands over the carcass
;;;   TOP DEMAND = 0.0  when nothing does - the front finishes FLUSH with the
;;;                     top of the carcass top panel
;;;
;;; Note that the second line is what KIT_WUD_FULL's own sibling already says
;;; in prose: reference/lisp/../src/engine/cornice.js has carried the sentence
;;; "the doors finish FLUSH with the top of the carcass top panel" since the
;;; cornice was built, while every kit went on cutting H - 3. The amendment
;;; settles which of the two the house means.
;;;
;;; WHAT DID NOT CHANGE, AND WHY THE LINES ABOVE ARE UNTOUCHED. `wysSzafki` is
;;; all a kit is given; "is there an infill above" is a question about a ROOM
;;; and this file cannot answer it. So the kit keeps cutting H - 3 - that is
;;; still the right answer to the only question it is asked - and the demand
;;; travels to the application as an INPUT, exactly as the shelf-pin setback
;;; and the shaker frame do. A bare kit call and every golden fixture are
;;; byte-for-byte what they were.
;;;
;;;   TOP_DEMAND_WITH_NEIGHBOUR   3.0   ;; infill or cornice above
;;;   TOP_DEMAND_NOTHING_ABOVE    0.0   ;; flush with the carcass top
;;;
;;; Hinge drilling rides its own edge and does not move: the cups are measured
;;; from the door's BOTTOM (`hingeCupList` = `hingePositions`, L868, carcass
;;; centres passed straight through), so a front that grows 3 mm UPWARD leaves
;;; every cup exactly where it was. That is the whole reason the amendment is
;;; safe to make on a door that is already drilled.

(setq TOP_DEMAND_WITH_NEIGHBOUR 3.0)   ;; infill or cornice above the carcass
(setq TOP_DEMAND_NOTHING_ABOVE  0.0)   ;; nothing above - flush with the top

;;; The door height under the amendment. `topDemand` is one of the two
;;; constants above; the kit itself always passes the first.
(defun doorHeightAmended (wysSzafki topDemand)
  (- wysSzafki topDemand))

(princ "\nKIT_WARDROBE_FULL: DOOR TOP EDGE T35 section loaded.")
(princ)
