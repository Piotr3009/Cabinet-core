;;;========================================
;;; SKYLON_COMMON.lsp
;;; Shared functions for all Skylon Joinery scripts
;;; Version 1.0
;;; Load FIRST before any unit scripts
;;;========================================

;;;========================================
;;; A. BASIC DRAWING FUNCTIONS
;;;========================================

(defun drawRect (layer x1 y1 x2 y2 / )
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 layer)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list x1 y1)) (cons 10 (list x2 y1))
    (cons 10 (list x2 y2)) (cons 10 (list x1 y2)))))

(defun drawLine (layer x1 y1 x2 y2 / )
  (entmake (list '(0 . "LINE") '(100 . "AcDbEntity") (cons 8 layer)
    '(100 . "AcDbLine") (cons 10 (list x1 y1 0.0)) (cons 11 (list x2 y2 0.0)))))

(defun drawCircle (layer cx cy radius / )
  (entmake (list '(0 . "CIRCLE") '(100 . "AcDbEntity") (cons 8 layer)
    '(100 . "AcDbCircle") (cons 10 (list cx cy 0.0)) (cons 40 radius))))

(defun drawArc (layer cx cy radius startAng endAng / )
  (entmake (list '(0 . "ARC") '(100 . "AcDbEntity") (cons 8 layer)
    '(100 . "AcDbCircle") (cons 10 (list cx cy 0.0)) (cons 40 radius)
    '(100 . "AcDbArc") 
    (cons 50 (* pi (/ startAng 180.0)))
    (cons 51 (* pi (/ endAng 180.0))))))

;;; Normalize angle to 0..360
(defun norm360 (a)
  (while (< a 0.0) (setq a (+ a 360.0)))
  (while (>= a 360.0) (setq a (- a 360.0)))
  a)

;;; Mirrored arc for Right side hinge
(defun drawArcM (layer cx cy radius startAng endAng / ns ne)
  (setq ns (norm360 (- 180.0 endAng)))
  (setq ne (norm360 (- 180.0 startAng)))
  (entmake (list '(0 . "ARC") '(100 . "AcDbEntity") (cons 8 layer)
                 '(100 . "AcDbCircle") (cons 10 (list cx cy 0.0)) (cons 40 radius)
                 '(100 . "AcDbArc")
                 (cons 50 (* pi (/ ns 180.0)))
                 (cons 51 (* pi (/ ne 180.0))))))

;;; Center-aligned text
(defun drawText (layer x y height txt / )
  (entmake (list '(0 . "TEXT") '(100 . "AcDbEntity") (cons 8 layer)
    '(100 . "AcDbText") (cons 10 (list x y 0.0)) (cons 40 height) (cons 1 txt)
    '(72 . 1) (cons 11 (list x y 0.0)) '(100 . "AcDbText") '(73 . 2))))

;;; Left-aligned text
(defun drawTextL (layer x y height txt / )
  (entmake (list '(0 . "TEXT") '(100 . "AcDbEntity") (cons 8 layer)
    '(100 . "AcDbText") (cons 10 (list x y 0.0)) (cons 40 height) (cons 1 txt)
    '(72 . 0) (cons 11 (list x y 0.0)) '(100 . "AcDbText") '(73 . 0))))

;;; Left-aligned text with color override
(defun drawTextLC (layer x y height txt color / )
  (entmake (list '(0 . "TEXT") '(100 . "AcDbEntity") (cons 8 layer) (cons 62 color)
    '(100 . "AcDbText") (cons 10 (list x y 0.0)) (cons 40 height) (cons 1 txt)
    '(72 . 0) (cons 11 (list x y 0.0)) '(100 . "AcDbText") '(73 . 0))))

;;; Horizontal dimension behind back panel
(defun drawDimH (x1 x2 yBack / dimY mid oldOs oldLay)
  (setq oldOs (getvar "OSMODE"))
  (setq oldLay (getvar "CLAYER"))
  (setvar "OSMODE" 0)
  (setvar "CLAYER" "DIMENSIONS")
  (setq dimY (+ yBack 50.0))
  (setq mid (/ (+ x1 x2) 2.0))
  (command "_.DIMLINEAR"
           "_non" (list x1 yBack)
           "_non" (list x2 yBack)
           "_non" (list mid dimY))
  (setvar "CLAYER" oldLay)
  (setvar "OSMODE" oldOs))

;;; Horizontal dimension BELOW (for FRONT VIEW)
(defun drawDimHFront (x1 x2 yBase / dimY mid oldOs oldLay)
  (setq oldOs (getvar "OSMODE"))
  (setq oldLay (getvar "CLAYER"))
  (setvar "OSMODE" 0)
  (setvar "CLAYER" "DIMENSIONS")
  (setq dimY (- yBase 150.0))
  (setq mid (/ (+ x1 x2) 2.0))
  (command "_.DIMLINEAR"
           "_non" (list x1 yBase)
           "_non" (list x2 yBase)
           "_non" (list mid dimY))
  (setvar "CLAYER" oldLay)
  (setvar "OSMODE" oldOs))

;;; Make closed polyline from list of points
(defun makePolyline (layer pts / entData pt)
  (setq entData (list
    '(0 . "LWPOLYLINE")
    '(100 . "AcDbEntity")
    (cons 8 layer)
    '(100 . "AcDbPolyline")
    (cons 90 (length pts))
    '(70 . 1)
  ))
  (foreach pt pts
    (setq entData (append entData (list (cons 10 pt))))
  )
  (entmake entData))

;;;========================================
;;; B. BLOCK FUNCTIONS
;;;========================================

;;; Global counter for unique block names
(if (null *BLK_COUNTER*) (setq *BLK_COUNTER* 0))

;;; Create block from all entities after lastEnt, insert at first entity origin
(defun blockEntities (lastEnt blockName / ss ent insertPt uniqueName base)
  (setq *BLK_COUNTER* (1+ *BLK_COUNTER*))
  (setq uniqueName (strcat blockName "_" (itoa *BLK_COUNTER*)))
  (setq ss (ssadd))
  (setq ent (entnext lastEnt))
  (while ent
    (ssadd ent ss)
    (setq ent (entnext ent))
  )
  (if (> (sslength ss) 0)
    (progn
      (setq insertPt (cdr (assoc 10 (entget (ssname ss 0)))))
      (if (null insertPt) (setq insertPt (list 0.0 0.0 0.0)))
      (setq base (list (car insertPt) (cadr insertPt) 0.0))
      (command "._-BLOCK" uniqueName "_non" base ss "")
      (command "._-INSERT" uniqueName "_non" base 1.0 1.0 0.0)
    )
  ))

;;;========================================
;;; C. LEG BLOCK FUNCTIONS
;;;========================================

(defun _ptLeg (x y) (list x y 0.0))

(defun _mkLineLeg (p1 p2 lay)
  (entmakex (list (cons 0 "LINE") (cons 8 lay) (cons 10 p1) (cons 11 p2))))

(defun _mkPlineLeg (pts lay / entData pt)
  (setq entData (list
    '(0 . "LWPOLYLINE")
    '(100 . "AcDbEntity")
    (cons 8 lay)
    '(100 . "AcDbPolyline")
    (cons 90 (length pts))
    '(70 . 0)
  ))
  (foreach pt pts
    (setq entData (append entData (list (cons 10 pt))))
  )
  (entmakex entData))

(defun _createLegBlock (/ blk lay ss e)
  (setq blk "LEG")
  (if (tblsearch "BLOCK" blk)
    T
    (progn
      (setq lay "0")
      (setq ss (ssadd))
      (setq e (_mkLineLeg (_ptLeg 0.0 100.0) (_ptLeg 0.0 75.0) lay))
      (if e (ssadd e ss))
      (setq e (_mkLineLeg (_ptLeg 0.0 75.0) (_ptLeg 78.0 75.0) lay))
      (if e (ssadd e ss))
      (setq e (_mkLineLeg (_ptLeg 78.0 75.0) (_ptLeg 78.0 100.0) lay))
      (if e (ssadd e ss))
      (setq e (_mkLineLeg (_ptLeg 54.0 75.0) (_ptLeg 54.0 24.56) lay))
      (if e (ssadd e ss))
      (setq e (_mkLineLeg (_ptLeg 24.0 75.0) (_ptLeg 24.0 24.56) lay))
      (if e (ssadd e ss))
      (setq e (_mkLineLeg (_ptLeg 0.0 100.0) (_ptLeg 78.0 100.0) lay))
      (if e (ssadd e ss))
      (setq e (_mkLineLeg (_ptLeg 0.0 0.0) (_ptLeg 78.0 0.0) lay))
      (if e (ssadd e ss))
      (setq e (_mkPlineLeg (list
        (_ptLeg 78.0 0.0) (_ptLeg 78.0 6.11) (_ptLeg 77.26 9.94)
      ) lay))
      (if e (ssadd e ss))
      (setq e (_mkPlineLeg (list
        (_ptLeg 77.26 9.94) (_ptLeg 76.18 13.28) (_ptLeg 74.60 15.79)
        (_ptLeg 69.19 20.37) (_ptLeg 58.99 23.89) (_ptLeg 54.0 24.56)
      ) lay))
      (if e (ssadd e ss))
      (setq e (_mkPlineLeg (list
        (_ptLeg 0.0 0.0) (_ptLeg 0.0 6.11) (_ptLeg 0.74 9.94)
      ) lay))
      (if e (ssadd e ss))
      (setq e (_mkPlineLeg (list
        (_ptLeg 0.74 9.94) (_ptLeg 1.82 13.28) (_ptLeg 3.40 15.79)
        (_ptLeg 8.81 20.37) (_ptLeg 19.01 23.89) (_ptLeg 24.0 24.56)
      ) lay))
      (if e (ssadd e ss))
      (if (> (sslength ss) 0)
        (progn
          (command "._-BLOCK" blk "_non" (list 0.0 0.0 0.0) ss "")
          T)
        nil))))

;;; Draw pair of legs under carcase
(defun drawLegPair (x0 y0 szer G / legW legH xL xR yLeg oldLay)
  (setq legW 78.0)
  (setq legH 100.0)
  (_createLegBlock)
  (setq xL (+ x0 G))
  (setq xR (- (+ x0 szer) G legW))
  (setq yLeg (- y0 legH))
  (setq oldLay (getvar "CLAYER"))
  (setvar "CLAYER" "LEG_BLOCK")
  (command "._-INSERT" "LEG" "_non" (list xL yLeg) 1.0 1.0 0.0)
  (command "._-INSERT" "LEG" "_non" (list xR yLeg) 1.0 1.0 0.0)
  (setvar "CLAYER" oldLay))

;;; Draw pair of legs with custom height (for wardrobes etc.)
(defun drawLegPairH (x0 y0 szer G legHeight / legW xL xR yLeg oldLay)
  (setq legW 78.0)
  (_createLegBlock)
  (setq xL (+ x0 G))
  (setq xR (- (+ x0 szer) G legW))
  (setq yLeg (- y0 legHeight))
  (setq oldLay (getvar "CLAYER"))
  (setvar "CLAYER" "LEG_BLOCK")
  (command "._-INSERT" "LEG" "_non" (list xL yLeg) 1.0 1.0 0.0)
  (command "._-INSERT" "LEG" "_non" (list xR yLeg) 1.0 1.0 0.0)
  (setvar "CLAYER" oldLay))

;;;========================================
;;; D. HAFELE HINGE - TOP VIEW (exact geometry from DXF)
;;;========================================

(defun drawHinge (x0 y0 side / )
  (if (= side "L")
    (drawHingeL x0 y0)
    (drawHingeR x0 y0)))

;;; Left side hinge (original orientation)
(defun drawHingeL (x0 y0 / )
  (drawLine "HINGES" (+ x0 5.91) (+ y0 -6.14) (+ x0 33.46) (+ y0 -6.14))
  (drawLine "HINGES" (+ x0 35.21) (+ y0 -10.14) (+ x0 34.95) (+ y0 -7.50))
  (drawLine "HINGES" (+ x0 32.79) (+ y0 -10.14) (+ x0 32.79) (+ y0 -18.92))
  (drawLine "HINGES" (+ x0 28.24) (+ y0 -21.14) (+ x0 2.34) (+ y0 -21.14))
  (drawLine "HINGES" (+ x0 27.69) (+ y0 -20.52) (+ x0 13.01) (+ y0 -20.52))
  (drawLine "HINGES" (+ x0 11.74) (+ y0 -20.03) (+ x0 11.74) (+ y0 -10.14))
  (drawLine "HINGES" (+ x0 4.83) (+ y0 1.40) (+ x0 4.83) (+ y0 8.16))
  (drawLine "HINGES" (+ x0 7.83) (+ y0 9.65) (+ x0 7.91) (+ y0 52.33))
  (drawLine "HINGES" (+ x0 5.70) (+ y0 -10.14) (+ x0 5.91) (+ y0 -6.14))
  (drawLine "HINGES" (+ x0 0.00) (+ y0 0.00) (+ x0 -0.05) (+ y0 54.73))
  (drawLine "HINGES" (+ x0 1.14) (+ y0 40.09) (+ x0 1.13) (+ y0 54.73))
  (drawLine "HINGES" (+ x0 0.99) (+ y0 9.62) (+ x0 0.99) (+ y0 11.12))
  (drawLine "HINGES" (+ x0 27.71) (+ y0 -6.14) (+ x0 29.95) (+ y0 8.91))
  (drawLine "HINGES" (+ x0 5.83) (+ y0 9.15) (+ x0 7.33) (+ y0 9.15))
  (drawLine "HINGES" (+ x0 9.90) (+ y0 54.29) (+ x0 15.38) (+ y0 54.29))
  (drawLine "HINGES" (+ x0 21.48) (+ y0 11.78) (+ x0 15.38) (+ y0 54.29))
  (drawLine "HINGES" (+ x0 35.21) (+ y0 -10.14) (+ x0 -2.21) (+ y0 -10.14))
  (drawLine "HINGES" (+ x0 32.11) (+ y0 -19.87) (+ x0 28.56) (+ y0 -21.08))
  (drawLine "HINGES" (+ x0 -2.21) (+ y0 -10.14) (+ x0 -2.21) (+ y0 -18.92))
  (drawLine "HINGES" (+ x0 -1.53) (+ y0 -19.87) (+ x0 2.02) (+ y0 -21.08))
  (drawLine "HINGES" (+ x0 30.65) (+ y0 -19.56) (+ x0 28.02) (+ y0 -20.46))
  (drawLine "HINGES" (+ x0 31.27) (+ y0 -10.14) (+ x0 31.27) (+ y0 -18.75))
  (drawLine "HINGES" (+ x0 10.11) (+ y0 -10.14) (+ x0 10.36) (+ y0 -7.50))
  (drawLine "HINGES" (+ x0 0.99) (+ y0 9.62) (+ x0 5.09) (+ y0 9.62))
  (drawLine "HINGES" (+ x0 6.59) (+ y0 11.12) (+ x0 6.58) (+ y0 33.12))
  (drawLine "HINGES" (+ x0 0.99) (+ y0 11.12) (+ x0 5.09) (+ y0 11.12))
  (drawLine "HINGES" (+ x0 5.09) (+ y0 11.12) (+ x0 5.08) (+ y0 34.62))
  (drawLine "HINGES" (+ x0 -0.01) (+ y0 11.27) (+ x0 3.77) (+ y0 11.27))
  (drawLine "HINGES" (+ x0 4.77) (+ y0 12.27) (+ x0 4.77) (+ y0 33.29))
  (drawLine "HINGES" (+ x0 -0.03) (+ y0 34.28) (+ x0 3.77) (+ y0 34.29))
  (drawLine "HINGES" (+ x0 2.92) (+ y0 36.60) (+ x0 2.92) (+ y0 38.77))
  (drawLine "HINGES" (+ x0 2.17) (+ y0 39.44) (+ x0 1.83) (+ y0 39.44))
  (drawLine "HINGES" (+ x0 -0.05) (+ y0 54.73) (+ x0 1.13) (+ y0 54.73))
  (drawLine "HINGES" (+ x0 12.37) (+ y0 54.29) (+ x0 12.47) (+ y0 56.24))
  (drawLine "HINGES" (+ x0 13.55) (+ y0 54.29) (+ x0 13.65) (+ y0 56.18))
  (drawLine "HINGES" (+ x0 12.47) (+ y0 56.24) (+ x0 13.65) (+ y0 56.18))
  (drawLine "HINGES" (+ x0 2.18) (+ y0 42.09) (+ x0 2.14) (+ y0 53.44))
  (drawLine "HINGES" (+ x0 5.56) (+ y0 53.84) (+ x0 6.34) (+ y0 53.42))
  (drawLine "HINGES" (+ x0 6.79) (+ y0 53.73) (+ x0 5.42) (+ y0 56.71))
  (drawLine "HINGES" (+ x0 5.42) (+ y0 56.71) (+ x0 2.70) (+ y0 55.45))
  (drawLine "HINGES" (+ x0 5.23) (+ y0 53.78) (+ x0 7.92) (+ y0 52.48))
  (drawLine "HINGES" (+ x0 0.00) (+ y0 0.00) (+ x0 2.01) (+ y0 -0.03))
  (drawLine "HINGES" (+ x0 2.01) (+ y0 -0.03) (+ x0 2.01) (+ y0 9.62))
  (drawLine "HINGES" (+ x0 7.58) (+ y0 35.93) (+ x0 7.88) (+ y0 34.74))
  (drawLine "HINGES" (+ x0 29.95) (+ y0 8.91) (+ x0 21.48) (+ y0 11.78))
  (drawLine "HINGES" (+ x0 4.83) (+ y0 1.40) (+ x0 17.79) (+ y0 -2.44))
  (drawLine "HINGES" (+ x0 17.79) (+ y0 -2.44) (+ x0 17.79) (+ y0 -6.14))
  (drawLine "HINGES" (+ x0 6.83) (+ y0 -12.22) (+ x0 1.27) (+ y0 -12.22))
  (drawLine "HINGES" (+ x0 1.27) (+ y0 -12.22) (+ x0 1.27) (+ y0 -10.14))
  (drawLine "HINGES" (+ x0 1.27) (+ y0 -10.14) (+ x0 6.83) (+ y0 -10.14))
  (drawLine "HINGES" (+ x0 6.83) (+ y0 -10.14) (+ x0 6.83) (+ y0 -12.22))
  (drawLine "HINGES" (+ x0 -1.11) (+ y0 -11.67) (+ x0 -0.41) (+ y0 -11.54))
  (drawLine "HINGES" (+ x0 -0.41) (+ y0 -11.54) (+ x0 7.04) (+ y0 -16.59))
  (drawLine "HINGES" (+ x0 7.04) (+ y0 -16.59) (+ x0 7.17) (+ y0 -17.28))
  (drawLine "HINGES" (+ x0 7.17) (+ y0 -17.28) (+ x0 6.61) (+ y0 -18.11))
  (drawLine "HINGES" (+ x0 6.61) (+ y0 -18.11) (+ x0 5.92) (+ y0 -18.24))
  (drawLine "HINGES" (+ x0 5.92) (+ y0 -18.24) (+ x0 -1.53) (+ y0 -13.19))
  (drawLine "HINGES" (+ x0 -1.53) (+ y0 -13.19) (+ x0 -1.67) (+ y0 -12.50))
  (drawLine "HINGES" (+ x0 -1.67) (+ y0 -12.50) (+ x0 -1.11) (+ y0 -11.67))
  ;; ARCS
  (drawArc "HINGES" (+ x0 33.46) (+ y0 -7.64) 1.50 5.4 90.0)
  (drawArc "HINGES" (+ x0 31.79) (+ y0 -18.92) 1.00 288.9 360.0)
  (drawArc "HINGES" (+ x0 2.34) (+ y0 -20.14) 1.00 251.1 270.0)
  (drawArc "HINGES" (+ x0 28.24) (+ y0 -20.14) 1.00 270.0 288.9)
  (drawArc "HINGES" (+ x0 7.33) (+ y0 9.65) 0.50 270.0 360.0)
  (drawArc "HINGES" (+ x0 5.83) (+ y0 8.15) 1.00 90.0 180.0)
  (drawArc "HINGES" (+ x0 9.91) (+ y0 52.29) 2.00 90.0 178.8)
  (drawArc "HINGES" (+ x0 -1.21) (+ y0 -18.92) 1.00 180.0 251.1)
  (drawArc "HINGES" (+ x0 10.55) (+ y0 -17.95) 3.19 270.3 291.9)
  (drawArc "HINGES" (+ x0 13.04) (+ y0 -22.88) 2.37 88.6 123.4)
  (drawArc "HINGES" (+ x0 30.28) (+ y0 -18.63) 1.00 288.9 360.0)
  (drawArc "HINGES" (+ x0 27.69) (+ y0 -19.52) 1.00 270.0 288.9)
  (drawArc "HINGES" (+ x0 10.82) (+ y0 -19.97) 0.92 277.2 363.8)
  (drawArc "HINGES" (+ x0 11.85) (+ y0 -7.64) 1.50 90.0 174.6)
  (drawArc "HINGES" (+ x0 5.09) (+ y0 11.12) 1.50 270.0 360.0)
  (drawArc "HINGES" (+ x0 5.08) (+ y0 33.12) 1.50 0.0 90.0)
  (drawArc "HINGES" (+ x0 6.58) (+ y0 33.12) 1.50 90.0 180.0)
  (drawArc "HINGES" (+ x0 6.59) (+ y0 11.12) 1.50 180.0 270.0)
  (drawArc "HINGES" (+ x0 3.77) (+ y0 33.29) 1.00 0.0 90.1)
  (drawArc "HINGES" (+ x0 3.77) (+ y0 12.27) 1.00 270.0 360.0)
  (drawArc "HINGES" (+ x0 3.52) (+ y0 32.89) 3.07 358.6 448.3)
  (drawArc "HINGES" (+ x0 3.60) (+ y0 36.64) 0.69 176.9 270.3)
  (drawArc "HINGES" (+ x0 1.82) (+ y0 40.13) 0.69 176.9 270.3)
  (drawArc "HINGES" (+ x0 2.23) (+ y0 38.76) 0.69 1.3 94.8)
  (drawArc "HINGES" (+ x0 2.13) (+ y0 34.43) 5.65 15.4 78.0)
  (drawArc "HINGES" (+ x0 4.16) (+ y0 41.77) 2.01 171.1 245.0)
  (drawArc "HINGES" (+ x0 4.30) (+ y0 53.05) 2.20 81.5 169.6)
  (drawArc "HINGES" (+ x0 4.59) (+ y0 51.98) 3.54 88.7 118.5)
  (drawArc "HINGES" (+ x0 6.51) (+ y0 53.66) 0.29 234.2 390.8)
  (drawArc "HINGES" (+ x0 4.55) (+ y0 54.75) 0.48 345.8 442.3)
  (drawArc "HINGES" (+ x0 4.55) (+ y0 54.75) 0.78 345.8 442.3)
  (drawArc "HINGES" (+ x0 6.30) (+ y0 54.49) 1.29 173.7 213.7)
  (drawArc "HINGES" (+ x0 6.30) (+ y0 54.49) 0.99 173.7 221.5)
  (drawArc "HINGES" (+ x0 2.80) (+ y0 55.27) 0.21 104.7 298.7))

;;; Right side hinge (mirrored)
(defun drawHingeR (x0 y0 / )
  (drawLine "HINGES" (- x0 5.91) (+ y0 -6.14) (- x0 33.46) (+ y0 -6.14))
  (drawLine "HINGES" (- x0 35.21) (+ y0 -10.14) (- x0 34.95) (+ y0 -7.50))
  (drawLine "HINGES" (- x0 32.79) (+ y0 -10.14) (- x0 32.79) (+ y0 -18.92))
  (drawLine "HINGES" (- x0 28.24) (+ y0 -21.14) (- x0 2.34) (+ y0 -21.14))
  (drawLine "HINGES" (- x0 27.69) (+ y0 -20.52) (- x0 13.01) (+ y0 -20.52))
  (drawLine "HINGES" (- x0 11.74) (+ y0 -20.03) (- x0 11.74) (+ y0 -10.14))
  (drawLine "HINGES" (- x0 4.83) (+ y0 1.40) (- x0 4.83) (+ y0 8.16))
  (drawLine "HINGES" (- x0 7.83) (+ y0 9.65) (- x0 7.91) (+ y0 52.33))
  (drawLine "HINGES" (- x0 5.70) (+ y0 -10.14) (- x0 5.91) (+ y0 -6.14))
  (drawLine "HINGES" (- x0 0.00) (+ y0 0.00) (- x0 -0.05) (+ y0 54.73))
  (drawLine "HINGES" (- x0 1.14) (+ y0 40.09) (- x0 1.13) (+ y0 54.73))
  (drawLine "HINGES" (- x0 0.99) (+ y0 9.62) (- x0 0.99) (+ y0 11.12))
  (drawLine "HINGES" (- x0 27.71) (+ y0 -6.14) (- x0 29.95) (+ y0 8.91))
  (drawLine "HINGES" (- x0 5.83) (+ y0 9.15) (- x0 7.33) (+ y0 9.15))
  (drawLine "HINGES" (- x0 9.90) (+ y0 54.29) (- x0 15.38) (+ y0 54.29))
  (drawLine "HINGES" (- x0 21.48) (+ y0 11.78) (- x0 15.38) (+ y0 54.29))
  (drawLine "HINGES" (- x0 35.21) (+ y0 -10.14) (- x0 -2.21) (+ y0 -10.14))
  (drawLine "HINGES" (- x0 32.11) (+ y0 -19.87) (- x0 28.56) (+ y0 -21.08))
  (drawLine "HINGES" (- x0 -2.21) (+ y0 -10.14) (- x0 -2.21) (+ y0 -18.92))
  (drawLine "HINGES" (- x0 -1.53) (+ y0 -19.87) (- x0 2.02) (+ y0 -21.08))
  (drawLine "HINGES" (- x0 30.65) (+ y0 -19.56) (- x0 28.02) (+ y0 -20.46))
  (drawLine "HINGES" (- x0 31.27) (+ y0 -10.14) (- x0 31.27) (+ y0 -18.75))
  (drawLine "HINGES" (- x0 10.11) (+ y0 -10.14) (- x0 10.36) (+ y0 -7.50))
  (drawLine "HINGES" (- x0 0.99) (+ y0 9.62) (- x0 5.09) (+ y0 9.62))
  (drawLine "HINGES" (- x0 6.59) (+ y0 11.12) (- x0 6.58) (+ y0 33.12))
  (drawLine "HINGES" (- x0 0.99) (+ y0 11.12) (- x0 5.09) (+ y0 11.12))
  (drawLine "HINGES" (- x0 5.09) (+ y0 11.12) (- x0 5.08) (+ y0 34.62))
  (drawLine "HINGES" (- x0 -0.01) (+ y0 11.27) (- x0 3.77) (+ y0 11.27))
  (drawLine "HINGES" (- x0 4.77) (+ y0 12.27) (- x0 4.77) (+ y0 33.29))
  (drawLine "HINGES" (- x0 -0.03) (+ y0 34.28) (- x0 3.77) (+ y0 34.29))
  (drawLine "HINGES" (- x0 2.92) (+ y0 36.60) (- x0 2.92) (+ y0 38.77))
  (drawLine "HINGES" (- x0 2.17) (+ y0 39.44) (- x0 1.83) (+ y0 39.44))
  (drawLine "HINGES" (- x0 -0.05) (+ y0 54.73) (- x0 1.13) (+ y0 54.73))
  (drawLine "HINGES" (- x0 12.37) (+ y0 54.29) (- x0 12.47) (+ y0 56.24))
  (drawLine "HINGES" (- x0 13.55) (+ y0 54.29) (- x0 13.65) (+ y0 56.18))
  (drawLine "HINGES" (- x0 12.47) (+ y0 56.24) (- x0 13.65) (+ y0 56.18))
  (drawLine "HINGES" (- x0 2.18) (+ y0 42.09) (- x0 2.14) (+ y0 53.44))
  (drawLine "HINGES" (- x0 5.56) (+ y0 53.84) (- x0 6.34) (+ y0 53.42))
  (drawLine "HINGES" (- x0 6.79) (+ y0 53.73) (- x0 5.42) (+ y0 56.71))
  (drawLine "HINGES" (- x0 5.42) (+ y0 56.71) (- x0 2.70) (+ y0 55.45))
  (drawLine "HINGES" (- x0 5.23) (+ y0 53.78) (- x0 7.92) (+ y0 52.48))
  (drawLine "HINGES" (- x0 0.00) (+ y0 0.00) (- x0 2.01) (+ y0 -0.03))
  (drawLine "HINGES" (- x0 2.01) (+ y0 -0.03) (- x0 2.01) (+ y0 9.62))
  (drawLine "HINGES" (- x0 7.58) (+ y0 35.93) (- x0 7.88) (+ y0 34.74))
  (drawLine "HINGES" (- x0 29.95) (+ y0 8.91) (- x0 21.48) (+ y0 11.78))
  (drawLine "HINGES" (- x0 4.83) (+ y0 1.40) (- x0 17.79) (+ y0 -2.44))
  (drawLine "HINGES" (- x0 17.79) (+ y0 -2.44) (- x0 17.79) (+ y0 -6.14))
  (drawLine "HINGES" (- x0 6.83) (+ y0 -12.22) (- x0 1.27) (+ y0 -12.22))
  (drawLine "HINGES" (- x0 1.27) (+ y0 -12.22) (- x0 1.27) (+ y0 -10.14))
  (drawLine "HINGES" (- x0 1.27) (+ y0 -10.14) (- x0 6.83) (+ y0 -10.14))
  (drawLine "HINGES" (- x0 6.83) (+ y0 -10.14) (- x0 6.83) (+ y0 -12.22))
  (drawLine "HINGES" (- x0 -1.11) (+ y0 -11.67) (- x0 -0.41) (+ y0 -11.54))
  (drawLine "HINGES" (- x0 -0.41) (+ y0 -11.54) (- x0 7.04) (+ y0 -16.59))
  (drawLine "HINGES" (- x0 7.04) (+ y0 -16.59) (- x0 7.17) (+ y0 -17.28))
  (drawLine "HINGES" (- x0 7.17) (+ y0 -17.28) (- x0 6.61) (+ y0 -18.11))
  (drawLine "HINGES" (- x0 6.61) (+ y0 -18.11) (- x0 5.92) (+ y0 -18.24))
  (drawLine "HINGES" (- x0 5.92) (+ y0 -18.24) (- x0 -1.53) (+ y0 -13.19))
  (drawLine "HINGES" (- x0 -1.53) (+ y0 -13.19) (- x0 -1.67) (+ y0 -12.50))
  (drawLine "HINGES" (- x0 -1.67) (+ y0 -12.50) (- x0 -1.11) (+ y0 -11.67))
  ;; ARCS (mirrored)
  (drawArcM "HINGES" (- x0 33.46) (+ y0 -7.64) 1.50 5.4 90.0)
  (drawArcM "HINGES" (- x0 31.79) (+ y0 -18.92) 1.00 288.9 360.0)
  (drawArcM "HINGES" (- x0 2.34) (+ y0 -20.14) 1.00 251.1 270.0)
  (drawArcM "HINGES" (- x0 28.24) (+ y0 -20.14) 1.00 270.0 288.9)
  (drawArcM "HINGES" (- x0 7.33) (+ y0 9.65) 0.50 270.0 360.0)
  (drawArcM "HINGES" (- x0 5.83) (+ y0 8.15) 1.00 90.0 180.0)
  (drawArcM "HINGES" (- x0 9.91) (+ y0 52.29) 2.00 90.0 178.8)
  (drawArcM "HINGES" (- x0 -1.21) (+ y0 -18.92) 1.00 180.0 251.1)
  (drawArcM "HINGES" (- x0 10.55) (+ y0 -17.95) 3.19 270.3 291.9)
  (drawArcM "HINGES" (- x0 13.04) (+ y0 -22.88) 2.37 88.6 123.4)
  (drawArcM "HINGES" (- x0 30.28) (+ y0 -18.63) 1.00 288.9 360.0)
  (drawArcM "HINGES" (- x0 27.69) (+ y0 -19.52) 1.00 270.0 288.9)
  (drawArcM "HINGES" (- x0 10.82) (+ y0 -19.97) 0.92 277.2 363.8)
  (drawArcM "HINGES" (- x0 11.85) (+ y0 -7.64) 1.50 90.0 174.6)
  (drawArcM "HINGES" (- x0 5.09) (+ y0 11.12) 1.50 270.0 360.0)
  (drawArcM "HINGES" (- x0 5.08) (+ y0 33.12) 1.50 0.0 90.0)
  (drawArcM "HINGES" (- x0 6.58) (+ y0 33.12) 1.50 90.0 180.0)
  (drawArcM "HINGES" (- x0 6.59) (+ y0 11.12) 1.50 180.0 270.0)
  (drawArcM "HINGES" (- x0 3.77) (+ y0 33.29) 1.00 0.0 90.1)
  (drawArcM "HINGES" (- x0 3.77) (+ y0 12.27) 1.00 270.0 360.0)
  (drawArcM "HINGES" (- x0 3.52) (+ y0 32.89) 3.07 358.6 448.3)
  (drawArcM "HINGES" (- x0 3.60) (+ y0 36.64) 0.69 176.9 270.3)
  (drawArcM "HINGES" (- x0 1.82) (+ y0 40.13) 0.69 176.9 270.3)
  (drawArcM "HINGES" (- x0 2.23) (+ y0 38.76) 0.69 1.3 94.8)
  (drawArcM "HINGES" (- x0 2.13) (+ y0 34.43) 5.65 15.4 78.0)
  (drawArcM "HINGES" (- x0 4.16) (+ y0 41.77) 2.01 171.1 245.0)
  (drawArcM "HINGES" (- x0 4.30) (+ y0 53.05) 2.20 81.5 169.6)
  (drawArcM "HINGES" (- x0 4.59) (+ y0 51.98) 3.54 88.7 118.5)
  (drawArcM "HINGES" (- x0 6.51) (+ y0 53.66) 0.29 234.2 390.8)
  (drawArcM "HINGES" (- x0 4.55) (+ y0 54.75) 0.48 345.8 442.3)
  (drawArcM "HINGES" (- x0 4.55) (+ y0 54.75) 0.78 345.8 442.3)
  (drawArcM "HINGES" (- x0 6.30) (+ y0 54.49) 1.29 173.7 213.7)
  (drawArcM "HINGES" (- x0 6.30) (+ y0 54.49) 0.99 173.7 221.5)
  (drawArcM "HINGES" (- x0 2.80) (+ y0 55.27) 0.21 104.7 298.7))

;;;========================================
;;; E. DOOR - TOP VIEW
;;;========================================

(defun drawDoor (x1 y1 x2 y2 doorType / frameW stepD pts)
  (setq frameW 50.0)
  (setq stepD 6.0)
  (cond
    ((or (= doorType "F") (= doorType "H"))
      (drawRect "DOORS" x1 y1 x2 y2))
    (T
      (setq pts (list
        (list x1 y2) (list x2 y2) (list x2 y1)
        (list (- x2 frameW) y1) (list (- x2 frameW) (+ y1 stepD))
        (list (+ x1 frameW) (+ y1 stepD)) (list (+ x1 frameW) y1)
        (list x1 y1)))
      (makePolyline "DOORS" pts))))

;;;========================================
;;; F. FRONT VIEW FUNCTIONS
;;;========================================

;;; Draw FRONT VIEW carcase (4 panels)
(defun drawFrontCarcase (x0 y0 szer wys G / )
  (drawRect "CARCASE" x0 y0 (+ x0 G) (+ y0 wys))
  (drawRect "CARCASE" (- (+ x0 szer) G) y0 (+ x0 szer) (+ y0 wys))
  (drawRect "CARCASE" (+ x0 G) (- (+ y0 wys) G) (- (+ x0 szer) G) (+ y0 wys))
  (drawRect "CARCASE" (+ x0 G) y0 (- (+ x0 szer) G) (+ y0 G)))

;;; Draw FRONT VIEW carcase outline (simple rectangle)
(defun drawFrontCarcaseOutline (x0 y0 szer wys unitNum / )
  (drawRect "CARCASE" x0 y0 (+ x0 szer) (+ y0 wys)))

;;; Draw FRONT VIEW shelves
(defun drawFrontShelves (x0 y0 szer wys G numShelves / spacing shelfY i shelfX1 shelfX2)
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

;;; Draw FRONT VIEW door - FLAT
(defun drawFrontDoorSingleFlat (x0 y0 szer wys / dx1 dy1 dx2 dy2)
  (setq dx1 (+ x0 1.5)) (setq dy1 y0) (setq dx2 (- (+ x0 szer) 1.5)) (setq dy2 (- (+ y0 wys) 3.0))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list dx1 dy1)) (cons 10 (list dx2 dy1))
    (cons 10 (list dx2 dy2)) (cons 10 (list dx1 dy2)))))

;;; Draw FRONT VIEW door - SHAKER
(defun drawFrontDoorSingleShaker (x0 y0 szer wys / dx1 dy1 dx2 dy2 off)
  (setq off 50.0)
  (setq dx1 (+ x0 1.5)) (setq dy1 y0) (setq dx2 (- (+ x0 szer) 1.5)) (setq dy2 (- (+ y0 wys) 3.0))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list dx1 dy1)) (cons 10 (list dx2 dy1))
    (cons 10 (list dx2 dy2)) (cons 10 (list dx1 dy2))))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list (+ dx1 off) (+ dy1 off))) (cons 10 (list (- dx2 off) (+ dy1 off)))
    (cons 10 (list (- dx2 off) (- dy2 off))) (cons 10 (list (+ dx1 off) (- dy2 off))))))

;;; Draw FRONT VIEW door - HANDLELESS
(defun drawFrontDoorSingleHandleless (x0 y0 szer wys / dx1 dy1 dx2 dy2 jGroove)
  (setq jGroove 30.0)
  (setq dx1 (+ x0 1.5)) (setq dy1 y0) (setq dx2 (- (+ x0 szer) 1.5)) (setq dy2 (- (+ y0 wys) 3.0))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list dx1 dy1)) (cons 10 (list dx2 dy1))
    (cons 10 (list dx2 dy2)) (cons 10 (list dx1 dy2))))
  (drawLine "DOORS" dx1 (- dy2 jGroove) dx2 (- dy2 jGroove)))

;;; Draw swing lines on door
(defun drawDoorSwingLines (dx1 dy1 dx2 dy2 hingePos / midY)
  (setq midY (/ (+ dy1 dy2) 2.0))
  (if (= hingePos "L")
    (progn
      (drawLine "DOOR_SWING" dx1 midY dx2 dy2)
      (drawLine "DOOR_SWING" dx1 midY dx2 dy1))
    (progn
      (drawLine "DOOR_SWING" dx2 midY dx1 dy2)
      (drawLine "DOOR_SWING" dx2 midY dx1 dy1))))

;;; Draw FRONT VIEW single door with swing lines
(defun drawFrontDoorSingle (x0 y0 szer wys doorType hingePos / dx1 dy1 dx2 dy2)
  (setq dx1 (+ x0 1.5)) (setq dy1 y0) (setq dx2 (- (+ x0 szer) 1.5)) (setq dy2 (- (+ y0 wys) 3.0))
  (cond
    ((= doorType "S") (drawFrontDoorSingleShaker x0 y0 szer wys))
    ((= doorType "H") (drawFrontDoorSingleHandleless x0 y0 szer wys))
    (T (drawFrontDoorSingleFlat x0 y0 szer wys)))
  (drawDoorSwingLines dx1 dy1 dx2 dy2 hingePos))

;;; Draw FRONT VIEW double doors - FLAT
(defun drawFrontDoorDoubleFlat (x0 y0 szer wys / doorW midGap dx1L dx2L dx1R dx2R dy1 dy2)
  (setq midGap 3.0) (setq doorW (/ (- szer 3.0 midGap) 2.0))
  (setq dy1 y0) (setq dy2 (- (+ y0 wys) 3.0))
  (setq dx1L (+ x0 1.5)) (setq dx2L (+ dx1L doorW))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list dx1L dy1)) (cons 10 (list dx2L dy1))
    (cons 10 (list dx2L dy2)) (cons 10 (list dx1L dy2))))
  (setq dx1R (+ dx2L midGap)) (setq dx2R (- (+ x0 szer) 1.5))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list dx1R dy1)) (cons 10 (list dx2R dy1))
    (cons 10 (list dx2R dy2)) (cons 10 (list dx1R dy2)))))

;;; Draw FRONT VIEW double doors - SHAKER
(defun drawFrontDoorDoubleShaker (x0 y0 szer wys / doorW midGap dx1L dx2L dx1R dx2R dy1 dy2 off)
  (setq midGap 3.0) (setq off 50.0) (setq doorW (/ (- szer 3.0 midGap) 2.0))
  (setq dy1 y0) (setq dy2 (- (+ y0 wys) 3.0))
  (setq dx1L (+ x0 1.5)) (setq dx2L (+ dx1L doorW))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list dx1L dy1)) (cons 10 (list dx2L dy1))
    (cons 10 (list dx2L dy2)) (cons 10 (list dx1L dy2))))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list (+ dx1L off) (+ dy1 off))) (cons 10 (list (- dx2L off) (+ dy1 off)))
    (cons 10 (list (- dx2L off) (- dy2 off))) (cons 10 (list (+ dx1L off) (- dy2 off)))))
  (setq dx1R (+ dx2L midGap)) (setq dx2R (- (+ x0 szer) 1.5))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list dx1R dy1)) (cons 10 (list dx2R dy1))
    (cons 10 (list dx2R dy2)) (cons 10 (list dx1R dy2))))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list (+ dx1R off) (+ dy1 off))) (cons 10 (list (- dx2R off) (+ dy1 off)))
    (cons 10 (list (- dx2R off) (- dy2 off))) (cons 10 (list (+ dx1R off) (- dy2 off))))))

;;; Draw FRONT VIEW double doors - HANDLELESS
(defun drawFrontDoorDoubleHandleless (x0 y0 szer wys / doorW midGap dx1L dx2L dx1R dx2R dy1 dy2 jGroove)
  (setq midGap 3.0) (setq jGroove 30.0) (setq doorW (/ (- szer 3.0 midGap) 2.0))
  (setq dy1 y0) (setq dy2 (- (+ y0 wys) 3.0))
  (setq dx1L (+ x0 1.5)) (setq dx2L (+ dx1L doorW))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list dx1L dy1)) (cons 10 (list dx2L dy1))
    (cons 10 (list dx2L dy2)) (cons 10 (list dx1L dy2))))
  (drawLine "DOORS" dx1L (- dy2 jGroove) dx2L (- dy2 jGroove))
  (setq dx1R (+ dx2L midGap)) (setq dx2R (- (+ x0 szer) 1.5))
  (entmake (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") '(8 . "DOORS") '(62 . 6)
    '(100 . "AcDbPolyline") '(90 . 4) '(70 . 1)
    (cons 10 (list dx1R dy1)) (cons 10 (list dx2R dy1))
    (cons 10 (list dx2R dy2)) (cons 10 (list dx1R dy2))))
  (drawLine "DOORS" dx1R (- dy2 jGroove) dx2R (- dy2 jGroove)))

;;; Draw FRONT VIEW double doors with swing lines
(defun drawFrontDoorDouble (x0 y0 szer wys doorType / doorW midGap dx1L dx2L dx1R dx2R dy1 dy2)
  (setq midGap 3.0) (setq doorW (/ (- szer 3.0 midGap) 2.0))
  (setq dy1 y0) (setq dy2 (- (+ y0 wys) 3.0))
  (setq dx1L (+ x0 1.5)) (setq dx2L (+ dx1L doorW))
  (setq dx1R (+ dx2L midGap)) (setq dx2R (- (+ x0 szer) 1.5))
  (cond
    ((= doorType "S") (drawFrontDoorDoubleShaker x0 y0 szer wys))
    ((= doorType "H") (drawFrontDoorDoubleHandleless x0 y0 szer wys))
    (T (drawFrontDoorDoubleFlat x0 y0 szer wys)))
  (drawDoorSwingLines dx1L dy1 dx2L dy2 "L")
  (drawDoorSwingLines dx1R dy1 dx2R dy2 "R"))

;;; Draw FRONT VIEW hinge LEFT (loose entities)
(defun drawFrontHingeL (x0 y0 / lay)
  (setq lay "HINGES")
  (drawLine lay (+ x0 0.0) (+ y0 0.0) (+ x0 2.01) (+ y0 0.0))
  (drawLine lay (+ x0 2.01) (+ y0 0.0) (+ x0 2.01) (+ y0 60.0))
  (drawLine lay (+ x0 2.01) (+ y0 60.0) (+ x0 0.0) (+ y0 60.0))
  (drawLine lay (+ x0 0.0) (+ y0 60.0) (+ x0 0.01) (+ y0 0.0))
  (drawLine lay (+ x0 2.01) (+ y0 23.5) (+ x0 4.67) (+ y0 23.5))
  (drawLine lay (+ x0 4.67) (+ y0 23.5) (+ x0 4.67) (+ y0 36.5))
  (drawLine lay (+ x0 4.67) (+ y0 36.5) (+ x0 2.01) (+ y0 36.5))
  (drawLine lay (+ x0 4.67) (+ y0 23.5) (+ x0 5.67) (+ y0 23.5))
  (drawLine lay (+ x0 5.67) (+ y0 36.5) (+ x0 4.67) (+ y0 36.5))
  (drawLine lay (+ x0 5.67) (+ y0 23.5) (+ x0 5.67) (+ y0 26.5))
  (drawLine lay (+ x0 5.67) (+ y0 36.5) (+ x0 5.67) (+ y0 33.5))
  (drawLine lay (+ x0 5.67) (+ y0 23.5) (+ x0 6.97) (+ y0 23.5))
  (drawLine lay (+ x0 6.97) (+ y0 23.5) (+ x0 6.97) (+ y0 36.5))
  (drawLine lay (+ x0 5.67) (+ y0 36.5) (+ x0 6.97) (+ y0 36.5)))

;;; Draw FRONT VIEW hinge RIGHT (loose entities, mirrored)
(defun drawFrontHingeR (x0 y0 / lay)
  (setq lay "HINGES")
  (drawLine lay (- x0 0.0) (+ y0 0.0) (- x0 2.01) (+ y0 0.0))
  (drawLine lay (- x0 2.01) (+ y0 0.0) (- x0 2.01) (+ y0 60.0))
  (drawLine lay (- x0 2.01) (+ y0 60.0) (- x0 0.0) (+ y0 60.0))
  (drawLine lay (- x0 0.0) (+ y0 60.0) (- x0 0.01) (+ y0 0.0))
  (drawLine lay (- x0 2.01) (+ y0 23.5) (- x0 4.67) (+ y0 23.5))
  (drawLine lay (- x0 4.67) (+ y0 23.5) (- x0 4.67) (+ y0 36.5))
  (drawLine lay (- x0 4.67) (+ y0 36.5) (- x0 2.01) (+ y0 36.5))
  (drawLine lay (- x0 4.67) (+ y0 23.5) (- x0 5.67) (+ y0 23.5))
  (drawLine lay (- x0 5.67) (+ y0 36.5) (- x0 4.67) (+ y0 36.5))
  (drawLine lay (- x0 5.67) (+ y0 23.5) (- x0 5.67) (+ y0 26.5))
  (drawLine lay (- x0 5.67) (+ y0 36.5) (- x0 5.67) (+ y0 33.5))
  (drawLine lay (- x0 5.67) (+ y0 23.5) (- x0 6.97) (+ y0 23.5))
  (drawLine lay (- x0 6.97) (+ y0 23.5) (- x0 6.97) (+ y0 36.5))
  (drawLine lay (- x0 5.67) (+ y0 36.5) (- x0 6.97) (+ y0 36.5)))

;;; Draw FRONT VIEW hinges - PARAMETRIC
;;; hingeYList = list of Y offsets from bottom (e.g. (70.0 440.0 640.0) for base 3-hinge)
(defun drawFrontHinges (x0 y0 szer wys G numDoors hingePos unitNum hingeYList / xL xR hY)
  (setq xL (+ x0 G)) (setq xR (- (+ x0 szer) G))
  (if (= numDoors 1)
    (if (= hingePos "L")
      (foreach hY hingeYList
        (drawFrontHingeL xL (+ y0 hY)))
      (foreach hY hingeYList
        (drawFrontHingeR xR (+ y0 hY))))
    (progn
      (foreach hY hingeYList
        (drawFrontHingeL xL (+ y0 hY)))
      (foreach hY hingeYList
        (drawFrontHingeR xR (+ y0 hY))))))

;;;========================================
;;; G. LAYER CREATION
;;;========================================

;;; Create all standard layers for TOP + FRONT views
(defun createViewLayers ()
  (command "._LAYER" "_N" "CARCASE" "_C" "7" "CARCASE" "")
  (command "._LAYER" "_N" "DOORS" "_C" "6" "DOORS" "")
  (command "._LAYER" "_N" "HINGES" "_C" "96" "HINGES" "")
  (command "._LAYER" "_N" "SHELVES" "_C" "3" "SHELVES" "")
  (command "._LAYER" "_N" "UNIT_NUMBER" "_C" "94" "UNIT_NUMBER" "")
  (command "._LAYER" "_N" "DOOR_SWING" "_C" "8" "DOOR_SWING" "")
  (command "._LAYER" "_N" "LEG_BLOCK" "_C" "8" "LEG_BLOCK" "")
  (command "._LAYER" "_N" "DIMENSIONS" "_C" "8" "DIMENSIONS" ""))

;;; Create all CNC layers
(defun createCNCLayers ()
  (command "._LAYER" "_N" "OUTLINE" "_C" "7" "OUTLINE" "")
  (command "._LAYER" "_N" "PUZZLE_SOCKET" "_C" "1" "PUZZLE_SOCKET" "")
  (command "._LAYER" "_N" "PUZZLE_DOG_BONES" "_C" "2" "PUZZLE_DOG_BONES" "")
  (command "._LAYER" "_N" "PUZZLE_HOLES_7_5MM" "_C" "3" "PUZZLE_HOLES_7_5MM" "")
  (command "._LAYER" "_N" "SCREWS_3MM" "_C" "4" "SCREWS_3MM" "")
  (command "._LAYER" "_N" "HINGES_5MM" "_C" "5" "HINGES_5MM" "")
  (command "._LAYER" "_N" "SHELVES_7_5MM" "_C" "6" "SHELVES_7_5MM" "")
  (command "._LAYER" "_N" "SUMMARY" "_C" "5" "SUMMARY" "")
  (command "._LAYER" "_N" "DOORS" "_C" "6" "DOORS" "")
  (command "._LAYER" "_N" "FRONT_HINGES_35MM" "_C" "3" "FRONT_HINGES_35MM" "")
  (command "._LAYER" "_N" "FRONT_HINGES_3MM" "_C" "30" "FRONT_HINGES_3MM" "")
  (command "._LAYER" "_N" "RUNNERS_3MM" "_C" "5" "RUNNERS_3MM" ""))

;;; Create drawer-specific layers
(defun createDrawerLayers ()
  (command "._LAYER" "_N" "RUNNERS" "_C" "8" "RUNNERS" ""))

;;;========================================
;;; H. CNC PANEL FUNCTIONS (parametric)
;;;========================================

;;; Draw BUL panel - tenons on right edge
;;; hingeHoleYList = list of hinge CENTER Y positions relative to y0
;;;   each hinge has 2 holes at center +/- 16mm
;;;   X position: 37mm from left edge
(defun drawBUL (x0 y0 szer wys unitNum numShelves G drawHinges hingeHoleYList runnerYList / midX midY t1y t2y t3y pts shelfY i spacing S hY rY)
  (setq S (+ (/ G 2.0) 0.5))
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  (setq t1y (+ y0 95.0) t2y midY t3y (+ y0 wys -95.0))
  
  (setq pts (list
    (list x0 y0) (list (+ x0 szer) y0)
    (list (+ x0 szer) (- t1y 25.0)) (list (+ x0 szer) (- t1y 19.0))
    (list (+ x0 szer 10.5) (- t1y 19.0)) (list (+ x0 szer 10.5) (- t1y 25.0))
    (list (+ x0 szer G) (- t1y 25.0)) (list (+ x0 szer G) (+ t1y 25.0))
    (list (+ x0 szer 10.5) (+ t1y 25.0)) (list (+ x0 szer 10.5) (+ t1y 19.0))
    (list (+ x0 szer) (+ t1y 19.0)) (list (+ x0 szer) (+ t1y 25.0))
    (list (+ x0 szer) (- t2y 25.0)) (list (+ x0 szer) (- t2y 19.0))
    (list (+ x0 szer 10.5) (- t2y 19.0)) (list (+ x0 szer 10.5) (- t2y 25.0))
    (list (+ x0 szer G) (- t2y 25.0)) (list (+ x0 szer G) (+ t2y 25.0))
    (list (+ x0 szer 10.5) (+ t2y 25.0)) (list (+ x0 szer 10.5) (+ t2y 19.0))
    (list (+ x0 szer) (+ t2y 19.0)) (list (+ x0 szer) (+ t2y 25.0))
    (list (+ x0 szer) (- t3y 25.0)) (list (+ x0 szer) (- t3y 19.0))
    (list (+ x0 szer 10.5) (- t3y 19.0)) (list (+ x0 szer 10.5) (- t3y 25.0))
    (list (+ x0 szer G) (- t3y 25.0)) (list (+ x0 szer G) (+ t3y 25.0))
    (list (+ x0 szer 10.5) (+ t3y 25.0)) (list (+ x0 szer 10.5) (+ t3y 19.0))
    (list (+ x0 szer) (+ t3y 19.0)) (list (+ x0 szer) (+ t3y 25.0))
    (list (+ x0 szer) (+ y0 wys)) (list x0 (+ y0 wys))))
  (makePolyline "OUTLINE" pts)
  
  ;; Puzzle sockets - TOP edge
  ;; T50 (CLAUDE.md F8): NOT under a slope. The roof board carries no tab, so
  ;; a socket on the cut edge has nothing to catch and its dog bones surface
  ;; on a visible edge for nothing - the board is glued and screwed down onto
  ;; the bevel and the joint is not a puzzle. The law is stated above, beside
  ;; SKY:slopeCutPts. Flat ceiling, no switch set: drawn exactly as ever.
  (if (not (SKY:slopeOn))
    (progn
      (drawRect "PUZZLE_SOCKET" (+ x0 95.0 -25.5) (+ y0 wys (- S)) (+ x0 95.0 25.5) (+ y0 wys 6.0))
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 -24.5) (+ y0 wys (- S) 1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 24.5) (+ y0 wys (- S) 1.0) 3.75)
      (drawRect "PUZZLE_SOCKET" (+ x0 szer -95.0 -25.5) (+ y0 wys (- S)) (+ x0 szer -95.0 25.5) (+ y0 wys 6.0))
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 -24.5) (+ y0 wys (- S) 1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 24.5) (+ y0 wys (- S) 1.0) 3.75)))
  ;; Puzzle sockets - BOTTOM edge
  (drawRect "PUZZLE_SOCKET" (+ x0 95.0 -25.5) (- y0 6.0) (+ x0 95.0 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 -24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 24.5) (+ y0 S -1.0) 3.75)
  (drawRect "PUZZLE_SOCKET" (+ x0 szer -95.0 -25.5) (- y0 6.0) (+ x0 szer -95.0 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 -24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 24.5) (+ y0 S -1.0) 3.75)
  
  ;; Dog bones
  (drawRect "PUZZLE_DOG_BONES" (+ x0 szer) (- t1y 30.0) (+ x0 szer G) (+ t1y 30.0))
  (drawRect "PUZZLE_DOG_BONES" (+ x0 szer) (- t2y 30.0) (+ x0 szer G) (+ t2y 30.0))
  (drawRect "PUZZLE_DOG_BONES" (+ x0 szer) (- t3y 30.0) (+ x0 szer G) (+ t3y 30.0))
  
  ;; Screws
  ;; T50 (CLAUDE.md F8): the TOP row goes with the top sockets - the law says
  ;; "and no top screw row", and `sideCnc` in the application turns topSocket
  ;; and topScrews off together. The BOTTOM row is untouched: it screws into
  ;; the bottom panel, which is there whatever the ceiling does.
  (if (not (SKY:slopeOn))
    (progn
      (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 wys (- S)) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) (+ y0 wys (- S)) 1.5)
      (drawCircle "SCREWS_3MM" midX (+ y0 wys (- S)) 1.5)))
  (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" midX (+ y0 S) 1.5)
  
  ;; Hinges - PARAMETRIC from list
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
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) (- shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) shelfY 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) (+ shelfY 50.0) 3.75)
        (setq i (1+ i)))))
  ;; Runner holes - PARAMETRIC from list
  (if runnerYList
    (foreach rY runnerYList
      (drawCircle "RUNNERS_3MM" (+ x0 37.0) (+ y0 rY) 1.5)
      (drawCircle "RUNNERS_3MM" (+ x0 69.0) (+ y0 rY) 1.5)
      (drawCircle "RUNNERS_3MM" (+ x0 293.0) (+ y0 rY) 1.5)))
  (drawText "UNIT_NUMBER" midX midY 40.0 unitNum))

;;; Draw BUR panel - tenons on left edge (mirrored)
(defun drawBUR (x0 y0 szer wys unitNum numShelves G drawHinges hingeHoleYList runnerYList / midX midY t1y t2y t3y pts shelfY i spacing S hY rY)
  (setq S (+ (/ G 2.0) 0.5))
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  (setq t1y (+ y0 95.0) t2y midY t3y (+ y0 wys -95.0))
  
  (setq pts (list
    (list x0 y0) (list (+ x0 szer) y0)
    (list (+ x0 szer) (+ y0 wys)) (list x0 (+ y0 wys))
    (list x0 (+ t3y 25.0)) (list x0 (+ t3y 19.0))
    (list (- x0 10.5) (+ t3y 19.0)) (list (- x0 10.5) (+ t3y 25.0))
    (list (- x0 G) (+ t3y 25.0)) (list (- x0 G) (- t3y 25.0))
    (list (- x0 10.5) (- t3y 25.0)) (list (- x0 10.5) (- t3y 19.0))
    (list x0 (- t3y 19.0)) (list x0 (- t3y 25.0))
    (list x0 (+ t2y 25.0)) (list x0 (+ t2y 19.0))
    (list (- x0 10.5) (+ t2y 19.0)) (list (- x0 10.5) (+ t2y 25.0))
    (list (- x0 G) (+ t2y 25.0)) (list (- x0 G) (- t2y 25.0))
    (list (- x0 10.5) (- t2y 25.0)) (list (- x0 10.5) (- t2y 19.0))
    (list x0 (- t2y 19.0)) (list x0 (- t2y 25.0))
    (list x0 (+ t1y 25.0)) (list x0 (+ t1y 19.0))
    (list (- x0 10.5) (+ t1y 19.0)) (list (- x0 10.5) (+ t1y 25.0))
    (list (- x0 G) (+ t1y 25.0)) (list (- x0 G) (- t1y 25.0))
    (list (- x0 10.5) (- t1y 25.0)) (list (- x0 10.5) (- t1y 19.0))
    (list x0 (- t1y 19.0)) (list x0 (- t1y 25.0))))
  (makePolyline "OUTLINE" pts)
  
  ;; Puzzle sockets - TOP edge
  ;; T50 (CLAUDE.md F8): NOT under a slope. The roof board carries no tab, so
  ;; a socket on the cut edge has nothing to catch and its dog bones surface
  ;; on a visible edge for nothing - the board is glued and screwed down onto
  ;; the bevel and the joint is not a puzzle. The law is stated above, beside
  ;; SKY:slopeCutPts. Flat ceiling, no switch set: drawn exactly as ever.
  (if (not (SKY:slopeOn))
    (progn
      (drawRect "PUZZLE_SOCKET" (+ x0 95.0 -25.5) (+ y0 wys (- S)) (+ x0 95.0 25.5) (+ y0 wys 6.0))
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 -24.5) (+ y0 wys (- S) 1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 24.5) (+ y0 wys (- S) 1.0) 3.75)
      (drawRect "PUZZLE_SOCKET" (+ x0 szer -95.0 -25.5) (+ y0 wys (- S)) (+ x0 szer -95.0 25.5) (+ y0 wys 6.0))
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 -24.5) (+ y0 wys (- S) 1.0) 3.75)
      (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 24.5) (+ y0 wys (- S) 1.0) 3.75)))
  ;; Puzzle sockets - BOTTOM edge
  (drawRect "PUZZLE_SOCKET" (+ x0 95.0 -25.5) (- y0 6.0) (+ x0 95.0 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 -24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 95.0 24.5) (+ y0 S -1.0) 3.75)
  (drawRect "PUZZLE_SOCKET" (+ x0 szer -95.0 -25.5) (- y0 6.0) (+ x0 szer -95.0 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 -24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer -95.0 24.5) (+ y0 S -1.0) 3.75)
  
  ;; Dog bones
  (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t1y 30.0) x0 (+ t1y 30.0))
  (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t2y 30.0) x0 (+ t2y 30.0))
  (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t3y 30.0) x0 (+ t3y 30.0))
  
  ;; Screws
  ;; T50 (CLAUDE.md F8): the TOP row goes with the top sockets - the law says
  ;; "and no top screw row", and `sideCnc` in the application turns topSocket
  ;; and topScrews off together. The BOTTOM row is untouched: it screws into
  ;; the bottom panel, which is there whatever the ceiling does.
  (if (not (SKY:slopeOn))
    (progn
      (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 wys (- S)) 1.5)
      (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) (+ y0 wys (- S)) 1.5)
      (drawCircle "SCREWS_3MM" midX (+ y0 wys (- S)) 1.5)))
  (drawCircle "SCREWS_3MM" (+ x0 50.0) (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0) (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" midX (+ y0 S) 1.5)
  
  ;; Hinges - PARAMETRIC from list
  (if (and drawHinges hingeHoleYList)
    (foreach hY hingeHoleYList
      (drawCircle "HINGES_5MM" (+ x0 szer -37.0) (+ y0 hY -16.0) 2.5)
      (drawCircle "HINGES_5MM" (+ x0 szer -37.0) (+ y0 hY 16.0) 2.5)))
  
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
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) (- shelfY 50.0) 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) shelfY 3.75)
        (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) (+ shelfY 50.0) 3.75)
        (setq i (1+ i)))))
  ;; Runner holes - PARAMETRIC from list (mirrored X)
  (if runnerYList
    (foreach rY runnerYList
      (drawCircle "RUNNERS_3MM" (- (+ x0 szer) 37.0) (+ y0 rY) 1.5)
      (drawCircle "RUNNERS_3MM" (- (+ x0 szer) 69.0) (+ y0 rY) 1.5)
      (drawCircle "RUNNERS_3MM" (- (+ x0 szer) 293.0) (+ y0 rY) 1.5)))
  (drawText "UNIT_NUMBER" midX midY 40.0 unitNum))

;;; Draw TOP panel - ROTATED 90 LEFT
(defun drawTOP_ROT90 (x0 y0 szer wys unitNum G / midX midY t1y t2y t1x t2x pts)
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  (setq t1y (+ y0 95.0) t2y (+ y0 wys -95.0))
  (setq t1x (+ x0 95.0) t2x (+ x0 szer -95.0))
  
  (setq pts (list
    (list x0 y0) (list (+ x0 szer) y0)
    (list (+ x0 szer) (+ y0 wys))
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
    (list x0 (+ t2y 25.0)) (list x0 (+ t2y 19.0))
    (list (- x0 10.5) (+ t2y 19.0)) (list (- x0 10.5) (+ t2y 25.0))
    (list (- x0 G) (+ t2y 25.0)) (list (- x0 G) (- t2y 25.0))
    (list (- x0 10.5) (- t2y 25.0)) (list (- x0 10.5) (- t2y 19.0))
    (list x0 (- t2y 19.0)) (list x0 (- t2y 25.0))
    (list x0 (+ t1y 25.0)) (list x0 (+ t1y 19.0))
    (list (- x0 10.5) (+ t1y 19.0)) (list (- x0 10.5) (+ t1y 25.0))
    (list (- x0 G) (+ t1y 25.0)) (list (- x0 G) (- t1y 25.0))
    (list (- x0 10.5) (- t1y 25.0)) (list (- x0 10.5) (- t1y 19.0))
    (list x0 (- t1y 19.0)) (list x0 (- t1y 25.0))
    (list x0 y0)
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
  
  (drawRect "PUZZLE_DOG_BONES" (- t1x 30.0) (+ y0 wys) (+ t1x 30.0) (+ y0 wys G))
  (drawRect "PUZZLE_DOG_BONES" (- t2x 30.0) (+ y0 wys) (+ t2x 30.0) (+ y0 wys G))
  (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t1y 30.0) x0 (+ t1y 30.0))
  (drawRect "PUZZLE_DOG_BONES" (- x0 G) (- t2y 30.0) x0 (+ t2y 30.0))
  (drawRect "PUZZLE_DOG_BONES" (- t1x 30.0) (- y0 G) (+ t1x 30.0) y0)
  (drawRect "PUZZLE_DOG_BONES" (- t2x 30.0) (- y0 G) (+ t2x 30.0) y0)
  
  (drawText "UNIT_NUMBER" midX midY 40.0 unitNum))

;;; Draw BOTTOM panel - ROTATED 90 LEFT (same as TOP)
(defun drawBOTTOM_ROT90 (x0 y0 szer wys unitNum G / )
  (drawTOP_ROT90 x0 y0 szer wys unitNum G))

;;; Draw BACK panel - sockets on all 4 edges
(defun drawBACK (x0 y0 szer wys unitNum G / midX midY t1y t2y t3y t1x t2x S)
  (setq S (+ (/ G 2.0) 0.5))
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  (setq t1y (+ y0 95.0) t2y midY t3y (+ y0 wys -95.0))
  (setq t1x (+ x0 G 95.0) t2x (+ x0 szer (- G) -95.0))
  
  (drawRect "OUTLINE" x0 y0 (+ x0 szer) (+ y0 wys))
  
  ;; Left edge sockets
  (drawRect "PUZZLE_SOCKET" (- x0 6.0) (- t1y 25.5) (+ x0 S) (+ t1y 25.5))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 S -1.0) (- t1y 24.5) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 S -1.0) (+ t1y 24.5) 3.75)
  (drawRect "PUZZLE_SOCKET" (- x0 6.0) (- t2y 25.5) (+ x0 S) (+ t2y 25.5))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 S -1.0) (- t2y 24.5) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 S -1.0) (+ t2y 24.5) 3.75)
  (drawRect "PUZZLE_SOCKET" (- x0 6.0) (- t3y 25.5) (+ x0 S) (+ t3y 25.5))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 S -1.0) (- t3y 24.5) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 S -1.0) (+ t3y 24.5) 3.75)
  
  ;; Right edge sockets
  (drawRect "PUZZLE_SOCKET" (+ x0 szer (- S)) (- t1y 25.5) (+ x0 szer 6.0) (+ t1y 25.5))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer (- S) 1.0) (- t1y 24.5) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer (- S) 1.0) (+ t1y 24.5) 3.75)
  (drawRect "PUZZLE_SOCKET" (+ x0 szer (- S)) (- t2y 25.5) (+ x0 szer 6.0) (+ t2y 25.5))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer (- S) 1.0) (- t2y 24.5) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer (- S) 1.0) (+ t2y 24.5) 3.75)
  (drawRect "PUZZLE_SOCKET" (+ x0 szer (- S)) (- t3y 25.5) (+ x0 szer 6.0) (+ t3y 25.5))
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer (- S) 1.0) (- t3y 24.5) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ x0 szer (- S) 1.0) (+ t3y 24.5) 3.75)
  
  ;; Top edge sockets
  (drawRect "PUZZLE_SOCKET" (- t1x 25.5) (+ y0 wys (- S)) (+ t1x 25.5) (+ y0 wys 6.0))
  (drawCircle "PUZZLE_HOLES_7_5MM" (- t1x 24.5) (+ y0 wys (- S) 1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ t1x 24.5) (+ y0 wys (- S) 1.0) 3.75)
  (drawRect "PUZZLE_SOCKET" (- t2x 25.5) (+ y0 wys (- S)) (+ t2x 25.5) (+ y0 wys 6.0))
  (drawCircle "PUZZLE_HOLES_7_5MM" (- t2x 24.5) (+ y0 wys (- S) 1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ t2x 24.5) (+ y0 wys (- S) 1.0) 3.75)
  
  ;; Bottom edge sockets
  (drawRect "PUZZLE_SOCKET" (- t1x 25.5) (- y0 6.0) (+ t1x 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (- t1x 24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ t1x 24.5) (+ y0 S -1.0) 3.75)
  (drawRect "PUZZLE_SOCKET" (- t2x 25.5) (- y0 6.0) (+ t2x 25.5) (+ y0 S))
  (drawCircle "PUZZLE_HOLES_7_5MM" (- t2x 24.5) (+ y0 S -1.0) 3.75)
  (drawCircle "PUZZLE_HOLES_7_5MM" (+ t2x 24.5) (+ y0 S -1.0) 3.75)
  
  ;; Screws
  (drawCircle "SCREWS_3MM" (+ x0 S) (+ y0 50.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 S) (/ (+ t1y t2y) 2.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 S) (/ (+ t2y t3y) 2.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 S) (+ y0 wys -50.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer (- S)) (+ y0 50.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer (- S)) (/ (+ t1y t2y) 2.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer (- S)) (/ (+ t2y t3y) 2.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer (- S)) (+ y0 wys -50.0) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 50.0 G) (+ y0 wys (- S)) 1.5)
  (drawCircle "SCREWS_3MM" midX (+ y0 wys (- S)) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0 (- G)) (+ y0 wys (- S)) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 50.0 G) (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" midX (+ y0 S) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 szer -50.0 (- G)) (+ y0 S) 1.5)
  
  (drawText "UNIT_NUMBER" midX midY 40.0 unitNum))

;;; Draw SHELF panel
(defun drawSHELF (x0 y0 szer wys unitNum shelfNum / midX midY label)
  (setq midX (+ x0 (/ szer 2.0)) midY (+ y0 (/ wys 2.0)))
  (drawRect "OUTLINE" x0 y0 (+ x0 szer) (+ y0 wys))
  (setq label (strcat unitNum "-S" (itoa shelfNum)))
  (drawText "UNIT_NUMBER" midX midY 40.0 label))

;;; Draw FRONT panel (CNC) - PARAMETRIC hinge cups
;;; hingeCupYList = list of cup Y positions from BOTTOM of panel
;;;   e.g. base unit: (100.0 (wysFront - 297.0) (wysFront - 97.0))
(defun drawFRONT (x0 y0 szerFront wysFront unitNum frontLabel hingePos hingeCupYList / midX midY cupX holeX cupY)
  (setq midX (+ x0 (/ szerFront 2.0)) midY (+ y0 (/ wysFront 2.0)))
  
  ;; Panel outline
  (drawRect "DOORS" x0 y0 (+ x0 szerFront) (+ y0 wysFront))
  
  ;; Cup X position - 21.5mm from hinge edge
  (if (= hingePos "L")
    (setq cupX (- (+ x0 szerFront) 21.5))
    (setq cupX (+ x0 21.5)))
  
  ;; Mounting holes X - 9.5mm from cup center towards door center
  (if (= hingePos "L")
    (setq holeX (- cupX 9.5))
    (setq holeX (+ cupX 9.5)))
  
  ;; Draw cups and mounting holes from list
  (foreach cupY hingeCupYList
    (drawCircle "FRONT_HINGES_35MM" cupX (+ y0 cupY) 17.5)
    (drawCircle "FRONT_HINGES_3MM" holeX (+ y0 cupY 23.0) 1.5)
    (drawCircle "FRONT_HINGES_3MM" holeX (- (+ y0 cupY) 23.0) 1.5))
  
  ;; Label
  (drawText "UNIT_NUMBER" midX midY 40.0 frontLabel))

;;;========================================
;;; I. HINGE POSITION CALCULATORS
;;;========================================

;;; Base unit: 3 hinges
;;; Returns list of Y center positions from bottom
(defun calcHingePositionsBase (wys / )
  (list 100.0 (- wys 300.0) (- wys 100.0)))

;;; Tall unit: 5 hinges (1100-1599mm) or 6 hinges (>=1600mm)
;;; Returns list of Y center positions from bottom
(defun calcHingePositionsTall (wys / n spacing positions i)
  (if (< wys 1600.0)
    ;; 5 hinges: bottom, 3 evenly spaced, top
    (progn
      (setq n 3)
      (setq spacing (/ (- wys 200.0) 4.0))
      (setq positions (list 100.0))
      (setq i 1)
      (while (<= i n)
        (setq positions (append positions (list (+ 100.0 (* spacing i)))))
        (setq i (1+ i)))
      (setq positions (append positions (list (- wys 100.0))))
      positions)
    ;; 6 hinges: bottom, 4 evenly spaced, top
    (progn
      (setq n 4)
      (setq spacing (/ (- wys 200.0) 5.0))
      (setq positions (list 100.0))
      (setq i 1)
      (while (<= i n)
        (setq positions (append positions (list (+ 100.0 (* spacing i)))))
        (setq i (1+ i)))
      (setq positions (append positions (list (- wys 100.0))))
      positions)))



;;; Low cabinet: 2 hinges (<800mm), 3 hinges (800-1199mm), 4 hinges (>=1200mm)
;;; Returns list of Y center positions from bottom
(defun calcHingePositionsLow (wys / spacing)
  (cond
    ((< wys 800.0)
      ;; 2 hinges: bottom and top
      (list 100.0 (- wys 100.0)))
    ((< wys 1200.0)
      ;; 3 hinges: bottom, middle, top
      (list 100.0 (/ wys 2.0) (- wys 100.0)))
    (T
      ;; 4 hinges: bottom, 2 evenly spaced, top
      (setq spacing (/ (- wys 200.0) 3.0))
      (list 100.0 (+ 100.0 spacing) (+ 100.0 (* 2.0 spacing)) (- wys 100.0)))))

;;;========================================
;;; T46 - THE SLOPE CUT (24.08.2026)
;;;========================================
;;; Owner, 24.08.2026, screenshot in hand: "sufit sie scina, ale sciana juz nie
;;; - nie laczy sie. I mebel pozwala sie na dojechanie do skosu. Przeciez to
;;; nie ma sensu." And his decision, the same night, option A:
;;;
;;;   "tniemy po skosie, brak wyboru otwierania, musi byc od skosu."
;;;
;;; WE CUT ON THE SLOPE. This is that cut, and it is written HERE - once, in
;;; the shared file - because it is the same cut on every board it touches:
;;; the carcase seen from the front, the back panel, the side under the
;;; diagonal and the door over the opening. A routine per kit would be four
;;; diagonals that have to agree, and they would not.
;;;
;;; THE SHAPE. A panel is a rectangle `szer` x `wys` at (x0,y0). The ceiling
;;; over it is a straight line: `hL` millimetres of clear height at the panel's
;;; LEFT edge and `hR` at its RIGHT, both measured UP FROM y0 and both already
;;; less the scribe gap (the project's infill - the app resolves it before it
;;; gets here; this routine never invents a number).
;;;
;;; Three answers, and which one comes back is decided by the numbers rather
;;; than by a flag:
;;;
;;;   NOTHING TO TRIM   both edges clear the panel. The four points of the
;;;                     rectangle, in the order every outline in this file
;;;                     walks - so a panel out of the slope zone is drawn
;;;                     byte-for-byte as it was drawn before this section
;;;                     existed. That is the gate, and it is the shape's own.
;;;   THE TRAPEZIUM     the ceiling is under the panel at BOTH edges: the top
;;;                     edge IS the diagonal, corner to corner.
;;;   THE PENTAGON      the tall edge keeps FULL HEIGHT and the diagonal meets
;;;                     the top edge inside the panel. Five points, and the
;;;                     corner that goes is the one at the LOW end. This is the
;;;                     shape CLAUDE.md names: "vertical edge at the LOW end
;;;                     equals the cut height there, the top edge is the
;;;                     diagonal, the tall edge keeps full height".
;;;
;;; The knee is SOLVED, not searched: h(x) = hL + (hR - hL) * x / szer, so the
;;; x at which the ceiling reaches the panel's own top is
;;;
;;;     kx = szer * (wys - hL) / (hR - hL)
;;;
;;; which is exact at every gradient and needs no tolerance. The denominator is
;;; never zero on this branch - a level ceiling cannot be under the panel at
;;; one edge and over it at the other.

;;; Where the diagonal crosses the panel's own top edge, from x0.
(defun SKY:slopeKneeX (szer wys hL hR / d)
  (setq d (- hR hL))
  (if (equal d 0.0 1e-9)
    0.0
    (max 0.0 (min szer (* szer (/ (- wys hL) d))))))

;;;========================================
;;; T47 - THE LINE BENDS (24.08.2026)
;;;========================================
;;; The owner, the next morning, three screenshots in hand:
;;;
;;;   "jak sie konczy skos to powinno sie zalamywac kat tam gdzie sie zalamuje
;;;    a nie od konca do konca szafy... w tym przypadku powinno byc czesc
;;;    prosta i od momentu zalamania skos taki sam jak reszta skosu, nie moze
;;;    byc od konca do konca szafy bo nie mamy ten sam skos i to nie zadziala."
;;;
;;;   "skosy mamy tylko po jednej stronie, a moze byc tak ze beda po 2 stronach."
;;;
;;;   "boki sa w tym przypadku pod wiencem a nie obok, w tym przypadku jak mamy
;;;    skosy to wieniec jest na gorze."   ...  "pionowo lico do boku."
;;;    ...  "wieniec nie moze grubiec."
;;;
;;;   "BUL i BUR przedluzony do czubka skosu i ustawione ciecie pod skosem,
;;;    najlepiej zeby bylo napisane jaki kat ciecia, na CNC tez zeby bylo
;;;    napisane."
;;;
;;;   "gorny wieniec w tym przypadku nie moze miec dog bonesow."
;;;
;;; T46 handed this file TWO HEIGHTS and drew a straight line between them.
;;; Where the ceiling BENDS inside the cabinet's own width that line is a
;;; fiction: it cuts the boards at an angle the wall does not have, and the
;;; bevel will not meet the plaster. So the cut becomes a POLYLINE.
;;;
;;; ---------------------------------------------------------------------------
;;; THE CUT LINE, RESTATED ONCE
;;;
;;; A CUT LINE is a list of points, ((x y) (x y) ...), in the panel's own frame:
;;; x from 0 at the panel's LEFT edge, y measured UP from y0, at least two
;;; points, LEFT TO RIGHT, with a vertex at every knee. It is already less the
;;; scribe gap - this file never invents a gap and never asks where the ceiling
;;; is.
;;;
;;; TWO POINTS IS T46. `SKY:slopeLine` builds that pair, and every one of T46's
;;; four answers - the rectangle, the trapezium and the two pentagons - comes
;;; back from the general routine UNCHANGED, corner for corner. That is not a
;;; hope, it is the shape of the routine: the top boundary of a cut panel is
;;;
;;;     min(wys, at(x))
;;;
;;; sampled at every knee of `at` AND at every x where `at` crosses the panel's
;;; own top. On a straight line the crossing is `SKY:slopeKneeX` (kept above,
;;; unchanged), the sampling adds nothing, and the four branches T46 spelled out
;;; by hand fall out of one walk.
;;;
;;; ---------------------------------------------------------------------------
;;; AND THE TOP BOARD IS A ROOF
;;;
;;; The owner corrected T46's flat lid by name: "jak chcesz zeby szafa
;;; wygladala z wiencem poziomym jak jest skos?"  The top board LIES ON the two
;;; sides, spans the FULL width, and its ends are cut VERTICALLY - so its
;;; section is a PARALLELOGRAM and its two faces are the same length:
;;;
;;;     beta  = the segment's angle from horizontal = atan(dy / span)
;;;     L     = span / cos(beta)          the face, side face to side face
;;;     L_MAX = L + G * tan(beta)         the blank, lowest corner to highest
;;;
;;; The board is G thick MEASURED PERPENDICULAR and it does not thicken
;;; ("wieniec nie moze grubiec"). What DOES grow is its VERTICAL footprint at
;;; the edge, G / cos(beta), and that is a clearance fact - it is what the two
;;; sides stop under, and it is never a thickness.
;;;
;;; ONE BOARD PER SEGMENT. A board does not bend at a knee.
;;;
;;; A three-axis machine cannot cut the two end bevels or the sides' angled
;;; tops. This file states the DEGREES so the sheet can print them and the
;;; joiner can set the saw; the five-axis representation is written down as
;;; owed (BACKLOG 120), on the owner's own instruction: "narazie zrob 2D ale
;;; zapisz do cabinet core ze to bedzie zalegle."

;;; The T46 spelling: a straight line across the panel, as two points.
(defun SKY:slopeLine (szer hL hR)
  (list (list 0.0 hL) (list szer hR)))

;;; The clear height the cut line leaves at a point across a panel.
;;; Interpolated WITHIN the containing segment, never across the whole span -
;;; that is the whole of T47 in one sentence. Beyond either end the line holds
;;; its end value, which is what T46's own clamp did.
(defun SKY:cutHeightAt (pts x / a b n i res)
  (setq n (length pts))
  (cond
    ((= n 0) 0.0)
    ((= n 1) (cadr (car pts)))
    (T
      (setq a (car pts))
      (cond
        ((<= x (car a)) (cadr a))
        ((>= x (car (nth (1- n) pts))) (cadr (nth (1- n) pts)))
        (T
          (setq i 1 res nil)
          (while (and (< i n) (null res))
            (setq b (nth i pts))
            (if (<= x (car b))
              (if (< (abs (- (car b) (car a))) 1e-9)
                (setq res (cadr b))
                (setq res (+ (cadr a)
                             (* (- (cadr b) (cadr a))
                                (/ (- x (car a)) (- (car b) (car a)))))))
              (progn (setq a b) (setq i (1+ i)))))
          (if res res (cadr (nth (1- n) pts))))))))

;;; Is this panel cut at all? The gate, asked of the numbers.
(defun SKY:slopeCutActive (wys pts / hit)
  (setq hit nil)
  (foreach p pts (if (< (cadr p) (- wys 1e-9)) (setq hit T)))
  hit)

;;; The TOP BOUNDARY of a panel under a cut line: min(wys, at(x)), LEFT to
;;; RIGHT, with a vertex at every knee and at every place the line crosses the
;;; panel's own top edge. Consecutive duplicates are dropped - a vertex written
;;; twice is the T25 edge-guard fault in miniature.
(defun SKY:slopeTopPts (szer wys pts / out a b ax ay bx by kx i n cap push)
  (setq n (length pts))
  (if (< n 2)
    (list (list 0.0 (min wys (if (= n 1) (cadr (car pts)) wys)))
          (list szer (min wys (if (= n 1) (cadr (car pts)) wys))))
    (progn
      (setq a (car pts))
      (setq out (list (list (car a) (min wys (cadr a)))))
      (setq i 1)
      (while (< i n)
        (setq b (nth i pts))
        (setq ax (car a) ay (cadr a) bx (car b) by (cadr b))
        (if (and (> (abs (- by ay)) 1e-9)
                 (or (and (< ay wys) (> by wys))
                     (and (> ay wys) (< by wys))))
          (progn
            (setq kx (+ ax (/ (* (- bx ax) (- wys ay)) (- by ay))))
            (setq out (append out (list (list kx wys))))))
        (setq out (append out (list (list bx (min wys by)))))
        (setq a b)
        (setq i (1+ i)))
      ;; drop consecutive duplicates
      (setq cap '() )
      (foreach p out
        (if (or (null cap)
                (> (distance (list (car p) (cadr p))
                             (list (car (car cap)) (cadr (car cap)))) 1e-9))
          (setq cap (cons p cap))))
      (reverse cap))))

;;; The OUTLINE point list of a panel trimmed on the cut line.
;;; Walked in the same direction as every other outline in this file:
;;; bottom-left, bottom-right, up the right edge, back along the top.
;;;
;;; With a two-point line this returns EXACTLY what T46 returned - the
;;; rectangle, the trapezium, or either pentagon - corner for corner.
(defun SKY:slopeCutPts (x0 y0 szer wys pts / top)
  (setq top (SKY:slopeTopPts szer wys pts))
  (append (list (list x0 y0) (list (+ x0 szer) y0))
          (mapcar '(lambda (p) (list (+ x0 (car p)) (+ y0 (cadr p))))
                  (reverse top))))

;;; How many corners the trimmed panel has. The kits print it into the run
;;; report so a joiner reading the log knows which board is a pentagon before he
;;; finds out at the saw - and under T47 it may be MORE than five, because the
;;; ceiling may bend more than once over one cabinet.
(defun SKY:slopeCutCorners (szer wys pts)
  (length (SKY:slopeCutPts 0.0 0.0 szer wys pts)))

;;; Draw it. The panel's outline on OUTLINE (the T25 edge-guard lesson: two
;;; coincident paths are offset in OPPOSITE directions by VCarve and the board
;;; is cut from both sides, so the diagonal is never drawn twice).
(defun SKY:drawSlopeCut (x0 y0 szer wys pts / out)
  (setq out (SKY:slopeCutPts x0 y0 szer wys pts))
  (makePolyline "OUTLINE" out)
  out)

;;;----------------------------------------
;;; LAW (25.08.2026, the owner, screenshot in hand):
;;;
;;;   "bul lub bur nadal ma dog bonesy, a mowilismy ze jak jest skos to
;;;    dog bonesy znikaja."
;;;
;;; A carcass cut on the slope drills NO top-board sockets, no dog-bone
;;; reliefs for them and no top screw row. The roof board carries no tab
;;; (owner, 24.08: "gorny wieniec w tym przypadku nie moze miec dog
;;; bonesow") - so a socket on the cut edge has nothing to catch and its
;;; bones surface on a visible edge for nothing. The board is glued and
;;; screwed down onto the bevel; the joint is NOT a puzzle.
;;;
;;; Application follows this law in src/engine/cabinet.js (sideCnc: the
;;; KIT_SINK edges flag, topSocket/topScrews off under a roof).
;;;
;;; TURN 50 (CLAUDE.md F8) - THE DEBT IS PAID.
;;;
;;; T47 wrote here that the kit-level gate was "NAMED DEBT for the next slope
;;; turn: the kits do not yet take the slope as an argument". This is that
;;; turn, and CLAUDE.md F8 says it in as many words: drawBUL/drawBUR take the
;;; slope and skip their "Puzzle sockets - TOP edge" block when it is on.
;;;
;;; HOW IT ARRIVES. Not as an argument. `defun` in AutoLISP has fixed arity,
;;; so a seventh parameter on drawBUL would break every call site in every
;;; kit - and CLAUDE.md is explicit that SKYLON_COMMON.lsp is the ONLY LISP
;;; file this turn touches. So the slope is a MODULE-LEVEL SWITCH that this
;;; file owns and that the kits do not have to know about: a kit that never
;;; calls SKY:setSlope draws exactly what it drew last night, hole for hole.
;;;
;;; THE TOP SCREW ROW GOES WITH IT. The law three lines above says "no
;;; top-board sockets, no dog-bone reliefs for them and NO TOP SCREW ROW",
;;; and the application obeys all three (topSocket AND topScrews off under a
;;; roof). A gate that dropped the sockets and left the screws would be the
;;; kit and the app disagreeing about the same edge.
;;;
;;; The three routines below are the whole of it, and they are here rather
;;; than beside drawBUL because this is where the law is written.
;;;----------------------------------------

;;; The slope, as the kits' own switch. `pts` is a cut line - the same
;;; ((x y) ...) list SKY:slopeCutPts takes - or nil for a flat ceiling.
(defun SKY:setSlope (pts)
  (setq *SKY:SLOPE-PTS* pts))

;;; Put it back. A kit that has finished a sloped carcass calls this before
;;; the next one, or the next one inherits somebody else's ceiling.
(defun SKY:clearSlope ()
  (setq *SKY:SLOPE-PTS* nil))

;;; Is a slope on? Two points is the fewest a line can have; anything less is
;;; nobody having said, which is a flat ceiling.
(defun SKY:slopeOn ()
  (and (boundp '*SKY:SLOPE-PTS*)
       *SKY:SLOPE-PTS*
       (> (length *SKY:SLOPE-PTS*) 1)))
;;;----------------------------------------

;;;----------------------------------------
;;; LAW (26.08.2026, the owner, with the door in his hand):
;;;
;;;   "puszka troche odstaje od lica ... drzwi maja 18 minus 6 daje 12, a
;;;    puszka jest na glebokosc 11, wiec nie powinno byc widoczne. moze
;;;    puszka jest oka, ale otwor jest za gleboki?"
;;;
;;; He is right, and the last four words are the whole of it. The CUP is the
;;; only hole in these kits that does not go through, and its depth has always
;;; been measured against THE BOARD. On a SHAKER the board is not what is under
;;; the cup: the rebate is cut in the OUTER face, so where the cup lands in the
;;; panel field there is `boardT - recessD` of material and nothing more. An
;;; 18 mm shaker with a 6 mm rebate leaves 12; an 11 mm cup bored into it
;;; leaves ONE millimetre of floor instead of seven, and one millimetre reads
;;; through a sprayed face. At 16 mm board it would break out altogether.
;;;
;;; THE RULE: the bore takes the thickness AT THE CUP.
;;;
;;;   FULL BOARD  where the whole cup lands on the shaker's FRAME - the frame
;;;               is not rebated, so the board is all there.
;;;   LESS THE REBATE  where ANY of the cup reaches the panel field. The cup is
;;;               a circle, so what decides is its FAR edge - `cupX + cupDia/2`
;;;               from the hinge edge - and not its centre. A 35 mm cup at
;;;               21.5 mm reaches 39 mm in, so a 60 mm frame carries it whole
;;;               and a 30 mm frame does not.
;;;
;;; A PLAIN door has no rebate: `recessD` is 0, the thickness at the cup is the
;;; board, and every number below is what it has always been - hole for hole.
;;;
;;; AND A FRONT TOO THIN TO TAKE A CUP IS REPORTED, NOT BORED SHALLOWER. A
;;; silently shortened cup is a hinge that does not hold, discovered by a
;;; customer. `SKY:cupTooThin` is the question; the application asks it in Check
;;; (src/engine/checks.js) and says which door.
;;;
;;; Application follows this law in src/engine/doors.js (`cupThicknessAtBore`,
;;; `cupBoreOf`).
;;;----------------------------------------

;;; The material UNDER THE CUP. `frameW` is the shaker frame; `recessD` the
;;; rebate cut in the outer face; `cupX` the cup CENTRE from the hinge edge;
;;; `cupDia` the cup. A plain door passes recessD 0 and gets boardT back.
(defun SKY:cupThickness (boardT frameW recessD cupX cupDia)
  (if (or (<= recessD 0.0)
          (<= (+ cupX (/ cupDia 2.0)) frameW))
    boardT
    (- boardT recessD)))

;;; How deep the cup may be bored. `want` is the hinge's own depth (11 for the
;;; Hafele these kits draw); `keep` the floor that must remain so the bore stays
;;; BLIND on any board this workshop cuts fronts from.
(defun SKY:cupDepth (boardT frameW recessD cupX cupDia want keep / atCup)
  (setq atCup (SKY:cupThickness boardT frameW recessD cupX cupDia))
  (max 0.0 (min want (- atCup keep))))

;;; Is this front too thin to take the cup the hinge actually needs? Answered
;;; from the same two routines, so the report and the bore cannot disagree.
(defun SKY:cupTooThin (boardT frameW recessD cupX cupDia want keep)
  (< (SKY:cupDepth boardT frameW recessD cupX cupDia want keep) want))
;;;----------------------------------------

;;;----------------------------------------
;;; THE DOG BONES FOLLOW THE CABINET'S HEIGHT (turn 52, CLAUDE.md F3)
;;;----------------------------------------
;;;
;;; The owner, 26.08.2026:
;;;
;;;   "jak niska szafka ponizej 600 mm to juz zrob 2 dog bonesy, a jak ponizej
;;;    300 to jeden dog bones - na plecach i BUL i BUR."
;;;
;;; drawBUL, drawBUR and drawBACK below cut THREE tenons down the back edge -
;;; 95 in from each end and one on the middle - and three dog bones with them.
;;; That is right for a full-height carcass and wrong for a low one, and the
;;; owner has now given the two numbers he wants it decided by.
;;;
;;; THE RULE, and it is HIS, not a derivation:
;;;
;;;   at or under 300      ONE tenon, on the panel's own middle
;;;   under 600            TWO, `e` in from each end
;;;   600 and over         THREE, which is every kit in this folder
;;;
;;; WHY 300 IS "AT OR UNDER" AND NOT "UNDER". The application's LOW_CABINET
;;; minimum height is EXACTLY 300 (`lowCabinet.minHeight`), so a rule written
;;; as `< 300` could never fire on the one cabinet it exists for - the feature
;;; would ship dead. He said "ponizej 300" of a cabinet he can only build AT
;;; 300, so the boundary belongs inside the rule. 600 keeps the ordinary
;;; reading: at 600 there are still three.
;;;
;;; THE FLOOR THE THREE-TENON NUMBER MAY NOT GO BELOW. Turn 8 derived it from
;;; the geometry and the derivation still stands as a LIMIT, even though the
;;; owner's 600 has replaced it as the switch:
;;;
;;;   190   the two outer centres, 95 in from each end
;;; + 120   each outer tenon's own footprint plus the middle one's, both ends:
;;;         2 x 2 x max(tenon half width 25, dog bone half height 30)
;;; +  36   the minimum bridge - one board thickness on EACH side of the middle
;;;         tenon, because a middle tenon opens TWO gaps and not one
;;; = 346
;;;
;;; Below 346 the three would COLLIDE. The owner's 600 is well clear of it and
;;; a workshop that lowers the switch must never take it under 346, which is
;;; what `SKY:middleTabFloor` is for and what the application's test asserts.
;;;
;;; Application follows this law in src/engine/puzzle.js (`tabCentres`), and it
;;; reaches BUL, BUR and the BACK by one route: the back's side sockets are cut
;;; at the very centres the sides' tenons are, so it cannot fall out of step.
;;;----------------------------------------

;;; The floor the three-tenon switch may not be set below - turn 8's own
;;; derivation, kept as a LIMIT now that the switch itself is the owner's.
(defun SKY:middleTabFloor (e tabHalf boneHalf boardT)
  (+ (* e 2.0) (* (max tabHalf boneHalf) 4.0) (* boardT 2.0)))

;;; How many tenons - and therefore how many dog bones - a run of `len` takes.
;;; `three` is the owner's 600 and `one` his 300; the boundaries are his own
;;; words with the 300 taken as AT-or-under (see the note above).
(defun SKY:tabCount (len one three)
  (cond ((<= len one) 1)
        ((< len three) 2)
        (T 3)))

;;; And where they go. One tenon sits on the panel's own middle; two sit `e` in
;;; from each end; three are those two with the middle between them.
(defun SKY:tabCentres (len e one three / n)
  (setq n (SKY:tabCount len one three))
  (cond ((= n 1) (list (/ len 2.0)))
        ((= n 2) (list e (- len e)))
        (T (list e (/ len 2.0) (- len e)))))
;;;----------------------------------------

;;;----------------------------------------
;;; THE SEGMENTS, AND THEIR ANGLES
;;;----------------------------------------

;;; The cut line as segments: ((x0 y0 x1 y1 deg) ...), left to right.
;;; `deg` is the angle from HORIZONTAL, always positive - it is what a joiner
;;; sets on the saw, and which way the ceiling falls is plain from the points.
(defun SKY:slopeSegments (pts / out i n a b)
  (setq n (length pts) i 1 out '())
  (while (< i n)
    (setq a (nth (1- i) pts) b (nth i pts))
    (setq out (cons (list (car a) (cadr a) (car b) (cadr b)
                          (SKY:slopeSegDeg (- (car b) (car a)) (- (cadr b) (cadr a))))
                    out))
    (setq i (1+ i)))
  (reverse out))

;;; beta, in degrees, from a run and a rise. atan of a zero run is 90.
(defun SKY:slopeSegDeg (dx dy)
  (if (< (abs dx) 1e-9)
    90.0
    (abs (* (atan (/ dy dx)) (/ 180.0 pi)))))

;;; The tallest point of the cut line over a stretch of it - the "czubek
;;; skosu" a side panel is extended to. Sampled at both ends and at every knee
;;; between them, which is exact on a polyline and needs no search.
(defun SKY:cutPeakBetween (pts xa xb / top)
  (setq top (max (SKY:cutHeightAt pts xa) (SKY:cutHeightAt pts xb)))
  (foreach p pts
    (if (and (> (car p) xa) (< (car p) xb))
      (setq top (max top (cadr p)))))
  top)

;;; The lowest point of the cut line over a stretch of it - the short face of a
;;; bevelled side, and the number the joiner measures the finished board by.
(defun SKY:cutValleyBetween (pts xa xb / low)
  (setq low (min (SKY:cutHeightAt pts xa) (SKY:cutHeightAt pts xb)))
  (foreach p pts
    (if (and (> (car p) xa) (< (car p) xb))
      (setq low (min low (cadr p)))))
  low)

;;;----------------------------------------
;;; THE ROOF BOARD
;;;----------------------------------------

;;; The board's own length, side face to side face: L = span / cos(beta).
;;; Both faces measure this - the ends are cut VERTICALLY ("pionowo lico do
;;; boku"), so the section is a parallelogram and opposite sides are equal.
(defun SKY:roofFaceLen (span deg)
  (/ span (cos (* deg (/ pi 180.0)))))

;;; The BLANK, lowest corner to highest: L_MAX = L + G * tan(beta). This is the
;;; number that goes on the cut list, because it is what the sheet gives up.
(defun SKY:roofBlankLen (span deg G)
  (+ (SKY:roofFaceLen span deg) (* G (abs (/ (sin (* deg (/ pi 180.0)))
                                             (cos (* deg (/ pi 180.0))))))))

;;; The board is G thick MEASURED PERPENDICULAR and does not thicken. Its
;;; VERTICAL footprint at the edge is G / cos(beta) - a clearance fact for the
;;; elevation and for what the sides stop under, NEVER a thickness.
(defun SKY:roofVertDrop (G deg)
  (/ G (cos (* deg (/ pi 180.0)))))

;;; The ROOF LINE of a cabinet: the cut line capped at the cabinet's own height,
;;; which is the same walk `SKY:slopeTopPts` makes and therefore the same
;;; vertices. One board per segment of it.
(defun SKY:roofLinePts (szer wys pts)
  (SKY:slopeTopPts szer wys pts))

;;; The roof boards, left to right:
;;;   ((x0 x1 y0 y1 deg L L_MAX vdrop) ...)
;;; A board does not bend at a knee, so a line with an interior vertex makes
;;; more than one board and each carries its own beta.
(defun SKY:roofBoards (szer wys pts G / segs out span deg)
  (setq segs (SKY:slopeSegments (SKY:roofLinePts szer wys pts)))
  (setq out '())
  (foreach s segs
    (setq span (- (nth 2 s) (nth 0 s)))
    (setq deg (nth 4 s))
    (if (> span 1e-9)
      (setq out (cons (list (nth 0 s) (nth 2 s) (nth 1 s) (nth 3 s) deg
                            (SKY:roofFaceLen span deg)
                            (SKY:roofBlankLen span deg G)
                            (SKY:roofVertDrop G deg))
                      out))))
  (reverse out))

;;; NO DOG BONES ON THE ROOF BOARD. The owner's ruling, stated where the shape
;;; is: "gorny wieniec w tym przypadku nie moze miec dog bonesow." The blank is
;;; a plain rectangle L_MAX x depth and the bevel is an ANNOTATION - a
;;; three-axis machine cannot cut it and the sheet must not pretend otherwise.
(defun SKY:roofBoardBlank (span deg G glebokosc)
  (list (SKY:roofBlankLen span deg G) glebokosc))

;;;----------------------------------------
;;; THE SIDES RUN TO THE POINT
;;;----------------------------------------

;;; "BUL i BUR przedluzony do czubka skosu i ustawione ciecie pod skosem."
;;;
;;; A side stands over its own G of the cabinet's width, so the ceiling drops
;;; across it and its top is a BEVEL through the thickness. The board that
;;; leaves the machine is the BLANK - as tall as its highest corner - and the
;;; bevel takes the wedge off. Under the roof board, so the peak is lowered by
;;; the board's own vertical footprint.
;;;
;;; `xa`/`xb` are the side's own two faces in the cabinet's width.
(defun SKY:sideTopY (pts wys xa xb G / peak deg)
  (setq deg (SKY:slopeSegDeg (- xb xa)
                             (- (SKY:cutHeightAt pts xb) (SKY:cutHeightAt pts xa))))
  (setq peak (min wys (SKY:cutPeakBetween pts xa xb)))
  (max 0.0 (- peak (SKY:roofVertDrop G deg))))

;;; The angle the saw is set to for that bevel, in degrees - and the kits print
;;; it, because the owner asked for it in as many words: "najlepiej zeby bylo
;;; napisane jaki kat ciecia, na CNC tez zeby bylo napisane."
(defun SKY:sideCutDeg (pts xa xb)
  (SKY:slopeSegDeg (- xb xa)
                   (- (SKY:cutHeightAt pts xb) (SKY:cutHeightAt pts xa))))

;;;----------------------------------------
;;; WHICH WAY THE BEVEL RUNS  (turn 53, F4)
;;;----------------------------------------

;;; The owner, 27.08.2026, screenshot in hand:
;;;
;;;   "zamiast BUL obciac pod katem pasujacym do wienca, to sie nachodza
;;;    materialy na siebie."
;;;   "wyglada na to, ze ciecia istniejace na BUL i BUR sa odwrotnie."
;;;   ...and the correction that scopes it: "nie ciecie wienca - on juz jest
;;;    dobrze ciety. BUL i BUR."
;;;
;;; THE ROOF BOARD IS CORRECT. DO NOT TOUCH IT. What is stated here is the law
;;; the SIDES are cut by, because a law that lives only in a renderer is a law
;;; that can be forgotten by the next renderer:
;;;
;;;   THE HIGH POINT OF THE BLANK IS ALWAYS TOWARD THE PEAK, NEVER TOWARD THE
;;;   ROOM. The short face of the bevel is on the FALL side.
;;;
;;; It follows from the geometry rather than from a preference: the side's top
;;; is the roof board's UNDERSIDE at that face - `SKY:cutHeightAt` less the
;;; board's own vertical footprint - and the ceiling is higher on the peak side
;;; by definition. State it anyway. A wedge left uncut leaves the blank standing
;;; proud past the roof line at the corner, and the two boards then overlap -
;;; which the house forbids ("nie pozwalamy na nachodzenie sie materialow na
;;; siebie").
;;;
;;;   ((ya yb) high)   ya at xa, yb at xb, and which face carries the high point
(defun SKY:sideBevelFaces (pts wys xa xb G / ya yb deg drop)
  (setq deg (SKY:sideCutDeg pts xa xb))
  (setq drop (SKY:roofVertDrop G deg))
  (setq ya (max 0.0 (min wys (- (SKY:cutHeightAt pts xa) drop))))
  (setq yb (max 0.0 (min wys (- (SKY:cutHeightAt pts xb) drop))))
  (list (list ya yb) (if (>= ya yb) "xa" "xb")))

;;; ...and the check that says the law is kept: the side's top at each face is
;;; the roof board's underside there, to the millimetre. Anything HIGHER is the
;;; wedge left on, and the wedge left on is an overlap.
(defun SKY:sideBevelOverlap (pts wys xa xb G / f)
  (setq f (car (SKY:sideBevelFaces pts wys xa xb G)))
  (max (- (car f) (- (SKY:cutHeightAt pts xa) (SKY:roofVertDrop G (SKY:sideCutDeg pts xa xb))))
       (- (cadr f) (- (SKY:cutHeightAt pts xb) (SKY:roofVertDrop G (SKY:sideCutDeg pts xa xb))))))

;;;----------------------------------------
;;; THE INFILLS ON THE SLOPE - ONE LAW: 3D DRAWS WHAT CNC CUTS  (turn 53, F3)
;;;----------------------------------------

;;; The owner, 27.08.2026, three ways round one disease:
;;;
;;;   "top infill po skosie w ogole nie dziala ... jakos dziwnie sie rysuje
;;;    gdzies poza scianami."
;;;   "najdziwniejsze jest to, ze pionowy infill na CNC sie tnie pod skosem,
;;;    ale na wizualizacji pokazuje prosto."
;;;   "slope - tylko infill sie nie rysuje po skosie, a jest na CNC."
;;;
;;; The disease is TWO SOURCES OF TRUTH, which is the fault the grain rule
;;; already killed once. The CNC path carries the slope; the solid in the room
;;; measured the ceiling for itself and got a different answer. So the law is
;;; stated here, once, and both readers ask it:
;;;
;;;   EVERY PIECE THE MACHINE CUTS ON THE SLOPE IS DRAWN CUT IN THE ROOM.
;;;
;;; Nothing below is new geometry. It is the SAME `SKY:cutHeightAt` walk the
;;; roof board and the sides already take, asked of the three pieces that were
;;; asking themselves.

;;; The top of a VERTICAL member standing between `xa` and `xb` - a side infill,
;;; an end panel taken to the ceiling, a filler run up past the units.
;;;
;;; Its top is the ceiling AT ITS OWN X, and where the ceiling falls across its
;;; thickness that top is a BEVEL: the blank is as tall as the higher face and
;;; the wedge comes off, exactly as `SKY:sideTopY` does one piece over. Reading
;;; `wys` instead - the room height - is what drew a filler standing through the
;;; plaster.
(defun SKY:vertInfillTopY (pts wys xa xb)
  (min wys (SKY:cutPeakBetween pts xa xb)))

;;; ...and the angle the saw is set to for it. Zero under a flat ceiling, which
;;; is what makes every filler in every straight room the board it always was.
(defun SKY:vertInfillDeg (pts xa xb)
  (SKY:slopeSegDeg (- xb xa)
                   (- (SKY:cutHeightAt pts xb) (SKY:cutHeightAt pts xa))))

;;; A HORIZONTAL run of infill under a bent ceiling is not one board and it is
;;; not one plane: it is ONE PIECE PER SEGMENT of the ceiling line, each mounted
;;; along its own stretch. This is that walk, over `xa`..`xb`, and it is the
;;; same list `SKY:roofBoards` is built from - a knee inside the run splits the
;;; piece there and nowhere else.
;;;
;;;   ((x0 x1 y0 y1 deg along) ...)
;;;
;;; `along` is the piece's own length, span / cos(beta): it is MOUNTED on the
;;; slope, so it is longer than the span it covers. `y0`/`y1` are the ceiling at
;;; its two ends, which is the line its top edge follows - never above it, and
;;; never inside the triangle where the wall has ended.
(defun SKY:infillSegsUnder (pts xa xb / segs out sg x0 x1 y0 y1 deg)
  (setq segs (SKY:slopeSegments (SKY:cutPtsBetween pts xa xb)))
  (setq out '())
  (foreach sg segs
    (setq x0 (nth 0 sg) x1 (nth 1 sg))
    (setq y0 (SKY:cutHeightAt pts x0) y1 (SKY:cutHeightAt pts x1))
    (setq deg (SKY:slopeSegDeg (- x1 x0) (- y1 y0)))
    (setq out (cons (list x0 x1 y0 y1 deg (SKY:roofFaceLen (- x1 x0) deg)) out)))
  (reverse out))

;;; The stretch of the cut line between two x, with a vertex at every knee
;;; inside it and one at each end. A polyline sampled at its knees is exact;
;;; a polyline sampled at a step rounds every knee off.
(defun SKY:cutPtsBetween (pts xa xb / out p)
  (setq out (list (list xa (SKY:cutHeightAt pts xa))))
  (foreach p pts
    (if (and (> (car p) (+ xa 1e-6)) (< (car p) (- xb 1e-6)))
      (setq out (cons (list (car p) (cadr p)) out))))
  (reverse (cons (list xb (SKY:cutHeightAt pts xb)) out)))

;;;========================================
;;; LOADED
;;;========================================
(princ "\nSKYLON_COMMON v1.0 loaded.")
(princ)
