;;; Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
;;; Proprietary and confidential. Unauthorised copying, modification,
;;; distribution or use, including by automated tools and AI systems,
;;; is strictly prohibited without prior written permission.
;;;========================================
;;; KIT_MIRROR.lsp
;;; THE MIRROR CABINET - the wall unit hung in a bathroom: a carcass of the
;;; house board with PANELS round it to the mirror's face, MIRROR DOORS (a
;;; board 18 with a mirror 4 on it) of typed widths, LED STILES flush in the
;;; mirror face on the DIVIDERS that carry the doors, GLASS SHELVES on pins,
;;; a BOTTOM BOX for the LED under and its driver, a mirror on the BACK when
;;; asked, on the wall or in a RECESS
;;; Command: MIRROR_FULL
;;; Turn 83 (25.10.2026), the owner's words of 25.10.2026 over the
;;; architect's drawings of 36 Holland Park - LISP FIRST
;;; Derived from: KIT_WUD_FULL.lsp (the parent: the wall unit, its carcass,
;;;               its door, its hinges and its hangers), SKYLON_COMMON drawBUL,
;;;               drawBUR, drawTOP_ROT90, drawBOTTOM_ROT90 and drawBACK (the
;;;               carcass boards and their puzzle), calcHingePositionsBase and
;;;               drawFRONT (the cups), the house's divider that carries a door
;;;               (T21 F12) and its head and foot joint (SKYLON_JOINTS_BISCUIT
;;;               section I), the house's adjustable shelf on pins and its FIX
;;;               shelf, the Blum CLIP top hinge table
;;;               (reference/hardware/cliptop-hinge-count.json), T79's recess
;;;               (KIT_RECESS.lsp), the architect's elevation 34 and section 33
;;;               (verify/t83/holland-park/elev34.png, sect33.png) and the
;;;               agreed mockup (verify/t83/mockups/mirror2.png)
;;; Requires: SKYLON_COMMON.lsp loaded first (only the command draws, with
;;;           drawRect and drawText; the routines need nothing, and nothing is
;;;           loaded from here)
;;;========================================
;;;
;;; THE OWNER, 25.10.2026:
;;;
;;;   14:09  "zobacz szafki z mirrorami na wierzchu i szybkami w srodku czyli
;;;           szklane polki, czasami lustro z tylu, podswietlenie pod spodem
;;;           etc, teraz zaprojektujmy dokladnie to co masz na rysunku szafka
;;;           wiszaca"
;;;          "w tym przypadku to reces ale tez w standardzie normalnie wiszaca
;;;           i dodajemy oczywiscie panele dookola i ustawiamy jakie grube"
;;;          "polki szklane, rysujemy szklane 6 mm"
;;;          "lustro opcjonalnie, wtedy pamietaj ze drzwiczki 18 plus 4 mm
;;;           lustro, przedluzamy panele do grubosci drzwiczek i lustra"
;;;          "w tym przypadku mamy mleczne led panele, ale tez beda nakladane
;;;           na scianki boczne, ktore musza w tym przypadku byc, zeby przykryc
;;;           te panele"
;;;          "czasami jak ktos chce to bedzie mial na plecach tez, klikasz na
;;;           plecy i wyskakuje ci opcja chcesz lustro na plecach?"
;;;          "5 na kolumne domyslnie ale oczywiscie z mozliwoscia dodawania,
;;;           przesuwania"
;;;   14:14  "panele led trzeba bedzie zamontowac na rowno z drzwiami, nie
;;;           wcisniete, mamy carcas w srodku i panele dookola tego"
;;;   14:29  "nie wlasny box, ktos nam to zrobi na zamowienie", "4k"
;;;   22:41  "daj wszystkie mozliwosci z panelami, z ledami, bez, szerokosc
;;;           ustawianych drzwiczek etc"
;;;
;;; This is a NEW FILE. It touches no other kit. KIT_WUD_FULL, SKYLON_COMMON
;;; and the six fossil kits are untouched; a bare wall unit cuts what it cut.
;;;
;;;========================================
;;; 1. THE LAW IN ONE PARAGRAPH
;;;========================================
;;;
;;; A MIRROR CABINET is the wall unit (KIT_WUD_FULL) with PANELS round it: W x
;;; H is the cabinet with its panels, the CARCASS inside them the house board
;;; (BUL, BUR, TOP, BOTTOM, the BACK full behind), D deep. Its lowest 100 is a
;;; BOTTOM BOX (a FIX board BOX-TOP over the BOTTOM, closed by a front strip
;;; BOX-FRONT) for the LED under and its driver. Above it the face is set out
;;; left to right in the typed DOOR WIDTHS and the STILES between them, and
;;; the two fill the carcass width exactly or the room says so in words: a
;;; DIVIDER stands under each stile in the fronts' plane and carries the doors
;;; beside it, the LED STILE stands on its front edge flush with the mirror,
;;; and each MIRROR DOOR (a board 18 with a mirror 4 on it) is its width less
;;; the house's gap, hung by its weight on the Blum table. The bays between
;;; the boards take GLASS SHELVES 6 on the house's pins, five a bay; the BACK
;;; takes a mirror when asked; the PANELS reach from the back to the mirror's
;;; face. On the wall, or in a recess of the wall as T79's recess is read.
;;;
;;;========================================
;;; 2. DECISIONS TAKEN FOR THE OWNER (each one line to veto)
;;;========================================
;;;
;;; D1  THE PARENT IS KIT_WUD_FULL (CONFIRMED 14:09 "szafka wiszaca"). Hung on
;;;     the wall at its mount height, no legs, its carcass the parent's: BUL
;;;     and BUR D - G deep and the carcass's height, TOP and BOTTOM between
;;;     them, the BACK the carcass's whole face behind them, every board the
;;;     house board G and every joint the parent's (SKYLON_COMMON drawBUL,
;;;     drawBUR, drawTOP_ROT90, drawBOTTOM_ROT90, drawBACK: the project's
;;;     puzzle). This file writes only the differences, each a section of part
;;;     5, and restates (part 4) the parent's numbers it computes with.
;;; D2  THE CABINET IS W x H WITH ITS PANELS, THE CARCASS D DEEP (CONFIRMED by
;;;     the drawing and the mockup: elevation 34 "1350" x "1100"; the mockup
;;;     "1350 (panele 30 + karkas 1290)" and "215 karkas + 22 drzwi = 237").
;;;     The carcass is W less the side panels that are on and H less the top
;;;     and bottom panels that are on; D is the carcass's depth, as every
;;;     unit's depth is: the doors stand in front of it.
;;; D3  THE PANELS ROUND (CONFIRMED 14:09 "dodajemy oczywiscie panele dookola
;;;     i ustawiamy jakie grube", "przedluzamy panele do grubosci drzwiczek i
;;;     lustra"; 14:14 "mamy carcas w srodku i panele dookola tego"; 22:41 "daj
;;;     wszystkie mozliwosci z panelami"). PANEL-L, PANEL-R, PANEL-TOP and
;;;     PANEL-BOTTOM, each on or off, panel_t thick (30), in the front finish,
;;;     from the carcass's back plane to the doors' face: D + 22 deep with
;;;     mirror doors (237 on the drawing), D + 18 without. The side panels run
;;;     the cabinet's whole height; the top and bottom panels stand between
;;;     the side panels that are on and run to the carcass's edge where one is
;;;     off. They are fixed through the carcass from inside: no hole is
;;;     drilled for them (an outline only, as the corner post is).
;;; D4  THE FACE IS SET OUT IN THE TYPED DOOR WIDTHS (CONFIRMED 22:41
;;;     "szerokosc ustawianych drzwiczek"; the drawing 330 / 75 / 480 / 75 /
;;;     330). bays 1, 2 or 3; one door width a bay; left to right door,
;;;     stile, door, stile, door from the carcass's left face, the widths and
;;;     the stiles filling the carcass width exactly. A door is its width less
;;;     the house's gap, 1.5 in at each edge (WUD's own W - 3): 327 / 477 /
;;;     327 on the drawing.
;;; D5  WIDTHS THAT DO NOT FILL THE CARCASS ARE REFUSED IN WORDS (CLAUDE.md T83
;;;     LAWS: the room refuses in words, the engine never squashes). Typed widths whose
;;;     count is not the bays', one of which is no wider than the gap, or whose
;;;     sum with the stiles is not the carcass width, are said by
;;;     mirror-widths-refusal, and the doors are cut at the kit's OWN widths
;;;     (D6), never at the typed ones stretched.
;;; D6  THE KIT'S OWN WIDTHS (PROPOSED). Unsaid or refused: the profile's 330 /
;;;     480 / 330 at three bays where they fill the carcass with the stiles
;;;     (the drawing's cabinet); else the carcass width less the stiles shared
;;;     equally, WUD's pair (W - 6) / 2 read for n doors.
;;; D7  THE DIVIDERS CARRY THE DOORS (CONFIRMED by the mockup: "karkas: 2
;;;     przegrody 18 za slupkami LED, na nich zawiasy"; T21 F12's law: a full
;;;     height divider at setback 0 carries a door). DIVIDER-1 and DIVIDER-2,
;;;     the house board, D - G deep from the BACK's face to the carcass front
;;;     (the fronts' plane), from the floor of the bays (the box's BOX-TOP, or
;;;     the BOTTOM) to the TOP's underside, centred under their stile, or on
;;;     the joint of two doors where a divider has none. Their head and foot
;;;     are jointed as the house's divider (CHAT FIX 17.10.2026,
;;;     SKYLON_JOINTS_BISCUIT section I), by the engine's one pass.
;;; D8  THE STILE (CONFIRMED 14:14 "panele led trzeba bedzie zamontowac na
;;;     rowno z drzwiami, nie wcisniete"; 14:29 "nie wlasny box, ktos nam to
;;;     zrobi na zamowienie", "4k"; 22:41 "z ledami, bez"). stile_width_mm wide
;;;     (75), the doors' height, the doors' thickness with the mirror (22),
;;;     standing on its divider's front edge, its face the mirror's face.
;;;     "led": a LED light panel made to measure, 4000 K, BOUGHT (no CNC).
;;;     "timber": a board of the same size, cut, in the carcass finish.
;;;     "none": no stile; the two doors meet over the divider 3 apart, WUD's
;;;     pair. One kind for the cabinet (stile), or one per divider (stiles).
;;; D9  THE MIRROR DOOR (CONFIRMED 14:09 "drzwiczki 18 plus 4 mm lustro").
;;;     The board mirrorDoorBoard (18) in the front finish, overlaid on the
;;;     carcass, standing on its front face; with mirror_doors on, a mirror
;;;     mirrorMirrorT (4), BOUGHT by the square metre, glued to its whole face:
;;;     the door is 22 thick in the room and on the sheets, the board 18 on
;;;     the cut list. Hung on the board beside it: the left door L on BUL, the
;;;     right door R on BUR, a middle door L on the divider to its left (the
;;;     mockup's hinges), unless the hands are typed; its cups WUD's, 21.5
;;;     from its hinge edge (drawFRONT).
;;; D10 THE HINGES BY THE DOOR'S WEIGHT (CLAUDE.md T83 F1 (c); the board 700
;;;     kg per m3 PROPOSED, the mirror 10 kg per m2 PROPOSED). The door weighs
;;;     700 x its board x its area, and 10 x its area with a mirror; its hinge
;;;     count is the Blum CLIP top table's band of its height and its weight
;;;     (900 / 9: 2, 1600 / 13: 3, 2000 / 19: 4, 2400 / 24: 5, past them 6).
;;;     Three cups at WUD's places (100, h - 297, h - 97 from the door's
;;;     foot), two at its two ends (100, h - 97), four or more evenly between
;;;     those two ends. The plates on the board it hangs on, its pilots 37
;;;     from that board's front edge, two a cup 16 either side (the house's).
;;; D11 THE HINGE'S REACH IS SAID (DERIVED). A door covers the board it hangs
;;;     on by the board's face to the door's hinge edge: 16.5 on a side (G -
;;;     1.5, WUD's); on a divider under a stile it stands half the stile less
;;;     half the divider plus half the gap OFF that face (30 on the drawing:
;;;     37.5 - 9 + 1.5). The hinge that reaches it is the owner's article (NOT
;;;     THIS TURN: the mirror's own hinge article); mirror-reach-note says so,
;;;     never a clamp.
;;; D12 THE BOTTOM BOX (the drawing's 100; PROPOSED as a box, mirrorBottomBox).
;;;     The carcass's lowest 100: the BOTTOM at the carcass underside (the
;;;     parent's own), a FIX board BOX-TOP between the sides with its top face
;;;     100 above the underside (the floor of the bays and the dividers'
;;;     foot), and BOX-FRONT, a front strip in the front finish, the carcass
;;;     width less the gap by 100 less the gap, the doors' board thick,
;;;     standing in the doors' board plane (its face 4 behind the mirror's).
;;;     The driver stands in the box; the LED under is on the lowest board's
;;;     underside. BOX-TOP is the house's FIX shelf and takes its joint (the
;;;     house's set, engine/biscuits.js, screws through the sides, the BACK's
;;;     row). bottom_box off: no BOX-TOP, no strip, the doors from the carcass
;;;     underside (WUD's door) and the bays on the BOTTOM.
;;; D13 THE DOOR'S HEIGHT (DERIVED, WUD's). From the box's top (or the carcass
;;;     underside) to 3 under the carcass top: Hc - 100 - 3, 937 on the
;;;     drawing; the strip stands 3 under the doors; the stiles are the doors'
;;;     height at the doors' height.
;;; D14 THE GLASS SHELVES (CONFIRMED 14:09 "polki szklane, rysujemy szklane 6
;;;     mm", "5 na kolumne domyslnie ale oczywiscie z mozliwoscia dodawania,
;;;     przesuwania"). 6 toughened glass, BOUGHT (no CNC); shelves_per_bay (5)
;;;     a bay spaced evenly from the bays' floor to the TOP's underside (the
;;;     house's even rule), or where the unit's shelf items put them (moved
;;;     and added as every shelf); the bay's clear width less 4, D - G - 20
;;;     deep (WUD's shelf), 4 less when the back carries a mirror (material
;;;     never enters material); on the house's pins: 7.5 in the boards either
;;;     side, 70 from their front and their back edge, three a row at -50, 0
;;;     and +50 (the house's adjustable shelf). A row the board under a bay
;;;     does not reach is not drilled.
;;; D15 THE BACK AND ITS MIRROR (CONFIRMED 14:09 "czasami jak ktos chce to
;;;     bedzie mial na plecach tez, klikasz na plecy i wyskakuje ci opcja
;;;     chcesz lustro na plecach?"). The BACK is the parent's; with mirror_back
;;;     a mirror 4, BOUGHT by the square metre, on its inside face, one pane a
;;;     bay between the boards that stand on it, from the bays' floor to the
;;;     TOP's underside.
;;; D16 THE LIGHT (CONFIRMED 14:09 "podswietlenie pod spodem"; the drawing
;;;     "LED STRIP UNDER MEDICINE CABINET", "MEDICINE CABINET INTERNAL LED").
;;;     led_under: a LED strip on the lowest board's underside (PANEL-BOTTOM,
;;;     else the BOTTOM), the carcass's clear width long; led_inside: a strip up
;;;     the inside face of one side (the left, PROPOSED), the bays' height, half
;;;     the shelves' front clearance in from the carcass front; one LED driver
;;;     in the bottom box. All BOUGHT: the BOM's lines, never a hole.
;;; D17 THE RECESS (CONFIRMED 14:09 "w tym przypadku to reces ale tez w
;;;     standardzie normalnie wiszaca"; section 33 "155"). recess_mm typed, 0
;;;     on the wall: the cabinet stands in a recess of the wall that deep, read
;;;     by the room as T79's recess is (the back line behind the wall line by
;;;     recess_mm, the house's clearance kept behind the carcass); its carcass
;;;     face stands D - recess proud of its back plane's recess line (60 on the
;;;     drawing) and the mirror's face D + 22 - recess (82). Nothing is cut
;;;     differently for it.
;;; D18 THE HANGERS (CLAUDE.md T83 F4 "the hanging brackets as the vanity's";
;;;     the parent's drilling). Two "Cabinet hanger 50 kg with wall plate",
;;;     the article empty for the owner (PROPOSED, the vanity's); the parent's
;;;     holes for them: two 5 in each side, 21 and 53 from its back edge and
;;;     53 under its top, and the BACK's two 30 x 58 cut-outs at its top
;;;     corners (KIT_WUD_FULL, BUL and BUR hanger holes, BACK hanger rects).
;;; D19 NO HANDLE (DERIVED: the drawing and the client's render show none).
;;;     The mirror is the face; no handle hole is drilled.
;;; D20 THE NUMBERS AGREE WITH THE DRAWING (DECIDED here). CLAUDE.md F2's
;;;     "three doors 330 / 480 / 330 x 1100 less the gaps" is read with the
;;;     agreed mockup: 1100 is the cabinet with its panels (a carcass of 1040)
;;;     and the box's 100 stands under the doors, so the doors are 327 / 477 /
;;;     327 x 937. The section's 215 is the carcass; the panels' 237 is it with
;;;     the door and its mirror.
;;; D21 THE UNIT NUMBER is MC (MC01) (DERIVED, the house's one prefix a kit).
;;;
;;;========================================
;;; 3. CONSTANTS (the owner's numbers; profile.mirror mirrors them)
;;;========================================

;; profile.mirror.defaults.width, height, depth, mountHeight, overTopMm   CONFIRMED by elevation 34 and section 33
(defun mirrorWidth ( / ) 1350.0)
(defun mirrorHeight ( / ) 1100.0)
(defun mirrorDepth ( / ) 215.0)
(defun mirrorMountHeight ( / ) 1250.0)
(defun mirrorOverTop ( / ) 400.0)
;; profile.mirror.defaults.bays, doorWidths   CONFIRMED 22:41 "szerokosc ustawianych drzwiczek", the drawing's 330 / 480 / 330
(defun mirrorBays ( / ) 3)
(defun mirrorDoorWidths ( / ) (list 330.0 480.0 330.0))
;; profile.mirror.defaults.stile, stileWidthMm   CONFIRMED 14:14 "na rowno z drzwiami, nie wcisniete", the drawing's 75
(defun mirrorStileKind ( / ) "led")
(defun mirrorStileW ( / ) 75.0)
;; profile.mirror.defaults.panels, panelT   CONFIRMED 14:09 "dodajemy oczywiscie panele dookola i ustawiamy jakie grube", the mockup's 30
(defun mirrorPanelsOn ( / ) T)
(defun mirrorPanelT ( / ) 30.0)
;; profile.mirror.defaults.mirrorDoors, mirrorBack   CONFIRMED 14:09 "lustro opcjonalnie", "czasami jak ktos chce to bedzie mial na plecach tez"
(defun mirrorMirrorDoorsOn ( / ) T)
(defun mirrorMirrorBackOn ( / ) nil)
;; profile.mirror.defaults.shelvesPerBay   CONFIRMED 14:09 "5 na kolumne domyslnie"
(defun mirrorShelvesPerBay ( / ) 5)
;; profile.mirror.defaults.ledUnder, ledInside, bottomBox   CONFIRMED 14:09 "podswietlenie pod spodem", the drawing's LED under and inside
(defun mirrorLedUnderOn ( / ) T)
(defun mirrorLedInsideOn ( / ) T)
(defun mirrorBottomBoxOn ( / ) T)
;; profile.mirror.defaults.recessMm   CONFIRMED 14:09 "w tym przypadku to reces ale tez w standardzie normalnie wiszaca" (typed; 0 on the wall, 155 on the drawing)
(defun mirrorRecess ( / ) 0.0)
;; profile.mirror.doorBoardMm, mirrorMm   CONFIRMED 14:09 "drzwiczki 18 plus 4 mm lustro"
(defun mirrorDoorBoard ( / ) 18.0)
(defun mirrorMirrorT ( / ) 4.0)
;; profile.mirror.glassShelfMm   CONFIRMED 14:09 "polki szklane, rysujemy szklane 6 mm"
(defun mirrorGlassShelf ( / ) 6.0)
;; profile.mirror.bottomBoxMm   PROPOSED as a box (the drawing's 100, D12)
(defun mirrorBottomBox ( / ) 100.0)
;; profile.mirror.boardKgM3, mirrorKgM2   PROPOSED (D10)
(defun mirrorBoardKgM3 ( / ) 700.0)
(defun mirrorMirrorKgM2 ( / ) 10.0)
;; profile.mirror.ledKelvin   CONFIRMED 14:29 "4k"
(defun mirrorLedKelvin ( / ) 4000)
;; profile.mirror.ledInsideSide   PROPOSED (D16)
(defun mirrorLedInsideSide ( / ) "L")
;; profile.mirror.ledDriverVolts   PROPOSED (CLAUDE.md T83 F4 "LED driver 24 V")
(defun mirrorLedDriverVolts ( / ) 24)
;; profile.mirror.hangers   PROPOSED, the vanity's (D18); the article empty for the owner
(defun mirrorHangersPerUnit ( / ) 2)
(defun mirrorHangerName ( / ) "Cabinet hanger 50 kg with wall plate")
(defun mirrorHangerArticle ( / ) "")
;; profile.mirror.articles   PROPOSED (CLAUDE.md T83 F4): every bought line's article, empty for the owner to fill
(defun mirrorArticle ( / ) "")

;;;========================================
;;; 4. THE PARENT'S NUMBERS, RESTATED (never changed here)
;;;========================================
;;;
;;; The wall unit as the engine cuts KIT_WUD_FULL today. Each one is the
;;; profile key named beside it; test/turn83-f01-mirror-lisp.test.js holds the
;;; two equal, so the day the house moves one this file says so.

(defun mirrorGap ( / ) 3.0)                ;; doors.gap: a door is its width less 3, 1.5 at each edge
(defun mirrorTopDemand ( / ) 3.0)          ;; doors.gap: the door stands 3 under the carcass top (WUD's H - 3)
(defun mirrorCupBottom ( / ) 100.0)        ;; hinges.cups.baseOffsets.bottom
(defun mirrorCupUpperFromTop ( / ) 297.0)  ;; hinges.cups.baseOffsets.upperFromTop
(defun mirrorCupTopFromTop ( / ) 97.0)     ;; hinges.cups.baseOffsets.topFromTop
(defun mirrorCupFromEdge ( / ) 21.5)       ;; hinges.cups.xFromHingeEdge (drawFRONT)
(defun mirrorPlateFromFront ( / ) 37.0)    ;; hinges.xFromFrontEdge
(defun mirrorPlatePair ( / ) 16.0)         ;; hinges.holePairOffset
(defun mirrorPinColumn ( / ) 70.0)         ;; shelfHoles.columnFromEdge (SKYLON_COMMON's 70)
(defun mirrorPinD ( / ) 7.5)               ;; shelfHoles.diameter
(defun mirrorPinCluster ( / ) (list -50.0 0.0 50.0))   ;; shelfHoles.clusterOffsets
(defun mirrorShelfWidthClear ( / ) 4.0)    ;; carcass.shelfWidthClearance (WUD: W - 2G - 4)
(defun mirrorShelfFrontClear ( / ) 20.0)   ;; carcass.shelfDepthClearance (WUD: D - G - 20)
(defun mirrorHangerFromBack ( / ) (list 21.0 53.0))    ;; wallUnit.hangers.fromBackEdge
(defun mirrorHangerFromTop ( / ) 53.0)     ;; wallUnit.hangers.fromTop
(defun mirrorHangerHoleD ( / ) 5.0)        ;; wallUnit.hangers.holeDiameter
(defun mirrorHangerCutW ( / ) 30.0)        ;; wallUnit.hangers.cutoutWidth
(defun mirrorHangerCutH ( / ) 58.0)        ;; wallUnit.hangers.cutoutHeight
;; reference/hardware/cliptop-hinge-count.json bands: (max height, max kg, hinges)
(defun mirrorBlumBands ( / )
  (list (list 900.0 9.0 2) (list 1600.0 13.0 3) (list 2000.0 19.0 4) (list 2400.0 24.0 5)))
(defun mirrorBlumBeyond ( / ) 6)           ;; ..._beyond_the_table.hinges

;;;========================================
;;; 5. ROUTINES
;;;========================================
;;;
;;; THE FRAME. x from the cabinet's left face (the left panel's outer face),
;;; y up from its underside (the bottom panel's underside), z from the
;;; carcass's back plane (the BACK's back face) towards the room. A BOX is
;;; (name x y z w h d) in that frame; the carcass's own corner is (x0 y0).
;;; The four panel flags are onL onR onT onB, T or nil (AutoLISP folds case,
;;; so no flag may share a name with the panel thickness pt).

;;; A figure for a sentence: 45, or 45.5.
(defun mirror-mm (v)
  (if (= v (fix v)) (itoa (fix v)) (rtos v 2 1)))

;;; The sum of a list of numbers.
(defun mirror-sum (lst / s v)
  (setq s 0.0)
  (foreach v lst (setq s (+ s v)))
  s)

;;; ---- (a) THE CABINET AND ITS PANELS ROUND ----

;;; The carcass inside the panels that are on: (x0 y0 Wc Hc) (D2).
(defun mirror-carcass (W H onL onR onT onB pt / x0 y0)
  (setq x0 (if onL pt 0.0)
        y0 (if onB pt 0.0))
  (list x0 y0 (- W x0 (if onR pt 0.0)) (- H y0 (if onT pt 0.0))))

;;; The doors' face thickness: the board, and the mirror on it (D9).
(defun mirror-face-t (doorT mirrorOn)
  (+ doorT (if mirrorOn (mirrorMirrorT) 0.0)))

;;; The panels' depth: from the back plane to the doors' face (D3).
(defun mirror-panel-depth (D faceT)
  (+ D faceT))

;;; The panels that are on: ((name x y z w h d) ...) (D3).
(defun mirror-panels (W H D faceT onL onR onT onB pt / dp xa xb out)
  (setq dp (mirror-panel-depth D faceT)
        xa (if onL pt 0.0)
        xb (if onR (- W pt) W)
        out nil)
  (if onL (setq out (cons (list "PANEL-L" 0.0 0.0 0.0 pt H dp) out)))
  (if onR (setq out (cons (list "PANEL-R" (- W pt) 0.0 0.0 pt H dp) out)))
  (if onT (setq out (cons (list "PANEL-TOP" xa (- H pt) 0.0 (- xb xa) pt dp) out)))
  (if onB (setq out (cons (list "PANEL-BOTTOM" xa 0.0 0.0 (- xb xa) pt dp) out)))
  (reverse out))

;;; ---- (b) THE CARCASS, THE PARENT'S FIVE BOARDS ----

;;; BUL, BUR, TOP, BOTTOM and the BACK where the parent puts them (D1).
(defun mirror-carcass-boards (x0 y0 Wc Hc D G)
  (list (list "BUL" x0 y0 G G Hc (- D G))
        (list "BUR" (- (+ x0 Wc) G) y0 G G Hc (- D G))
        (list "TOP" (+ x0 G) (- (+ y0 Hc) G) G (- Wc G G) G (- D G))
        (list "BOTTOM" (+ x0 G) y0 G (- Wc G G) G (- D G))
        (list "BACK" x0 y0 0.0 Wc Hc G)))

;;; ---- (c) THE BOTTOM BOX ----

;;; How high the box is: 100, or nothing (D12).
(defun mirror-box-h (boxOn)
  (if boxOn (mirrorBottomBox) 0.0))

;;; The FIX board over the box, its top face boxH above the underside (D12).
(defun mirror-box-lid (x0 y0 Wc D G boxH)
  (if (> boxH 0.0)
    (list "BOX-TOP" (+ x0 G) (- (+ y0 boxH) G) G (- Wc G G) G (- D G))
    nil))

;;; The strip that closes it, in the doors' board plane (D12).
(defun mirror-box-front (x0 y0 Wc D doorT boxH)
  (if (> boxH 0.0)
    (list "BOX-FRONT" (+ x0 (/ (mirrorGap) 2.0)) y0 D (- Wc (mirrorGap)) (- boxH (mirrorGap)) doorT)
    nil))

;;; The floor of the bays: the box's top, else the BOTTOM's top face (D7, D14).
(defun mirror-floor (y0 G boxH)
  (if (> boxH 0.0) (+ y0 boxH) (+ y0 G)))

;;; The bays' ceiling: the TOP's underside.
(defun mirror-ceiling (y0 Hc G)
  (- (+ y0 Hc) G))

;;; The doors' foot and height (D13).
(defun mirror-door-y (y0 boxH)
  (+ y0 boxH))
(defun mirror-door-h (Hc boxH)
  (- Hc boxH (mirrorTopDemand)))

;;; ---- (d) THE FACE: DOORS, STILES, DIVIDERS ----

;;; Each divider's stile kind: one per divider when they are given, else the
;;; cabinet's one kind (D8).
(defun mirror-stile-kinds (bays kind kinds / out i)
  (if (and kinds (= (length kinds) (1- bays)))
    kinds
    (progn
      (setq out nil
            i 1)
      (while (< i bays)
        (setq out (cons kind out)
              i (1+ i)))
      out)))

;;; A stile's width on the face: none takes none.
(defun mirror-stile-w (k sw)
  (if (= k "none") 0.0 sw))

;;; The stiles' widths, and their sum.
(defun mirror-stile-ws (kinds sw / out k)
  (setq out nil)
  (foreach k kinds
    (if (/= k "none") (setq out (cons sw out))))
  (reverse out))
(defun mirror-stiles-total (kinds sw)
  (mirror-sum (mirror-stile-ws kinds sw)))

;;; Do the widths fill the carcass with the stiles, one a bay, each wider
;;; than the gap (D4, D5)?
(defun mirror-widths-fit-p (Wc bays widths kinds sw / ok v)
  (setq ok (and widths (= (length widths) bays)))
  (if ok
    (foreach v widths
      (if (<= v (mirrorGap)) (setq ok nil))))
  (if ok
    (equal (+ (mirror-sum widths) (mirror-stiles-total kinds sw)) Wc 0.01)
    nil))

;;; The kit's own widths (D6).
(defun mirror-own-widths (Wc bays kinds sw / own each out i)
  (setq own (mirrorDoorWidths))
  (if (mirror-widths-fit-p Wc bays own kinds sw)
    own
    (progn
      (setq each (/ (- Wc (mirror-stiles-total kinds sw)) (float bays))
            out nil
            i 0)
      (while (< i bays)
        (setq out (cons each out)
              i (1+ i)))
      out)))

;;; The widths the doors are cut to: the typed ones that fill the carcass,
;;; else the kit's own (D5, D6).
(defun mirror-widths (Wc bays widths kinds sw)
  (if (mirror-widths-fit-p Wc bays widths kinds sw)
    widths
    (mirror-own-widths Wc bays kinds sw)))

;;; The face from left to right: ("DOOR" from to), ("STILE" from to), or
;;; ("JOINT" x x) where a divider has no stile (D4, D8).
(defun mirror-zones (x0 widths kinds sw / x out i k w)
  (setq x x0
        out nil
        i 0)
  (foreach w widths
    (setq out (cons (list "DOOR" x (+ x w)) out)
          x (+ x w))
    (if (< i (length kinds))
      (progn
        (setq k (nth i kinds))
        (if (= k "none")
          (setq out (cons (list "JOINT" x x) out))
          (setq out (cons (list "STILE" x (+ x sw)) out)
                x (+ x sw)))))
    (setq i (1+ i)))
  (reverse out))

;;; The hinge hands, door by door: the typed ones, else L on the left and in
;;; the middle, R on the right (D9).
(defun mirror-hands (bays hands / out i)
  (if (and hands (= (length hands) bays))
    hands
    (cond
      ((= bays 1) (list "L"))
      ((= bays 2) (list "L" "R"))
      (T
        (setq out (list "R")
              i 1)
        (while (< i bays)
          (setq out (cons "L" out)
                i (1+ i)))
        out))))

;;; The doors: ((idx x y z w h d hand) ...), each its zone less the gap
;;; (D4, D9, D13).
(defun mirror-doors (zones yD hD D faceT hands / out i z)
  (setq out nil
        i 0)
  (foreach z zones
    (if (= (car z) "DOOR")
      (setq out (cons (list (1+ i) (+ (cadr z) (/ (mirrorGap) 2.0)) yD D
                            (- (caddr z) (cadr z) (mirrorGap)) hD faceT (nth i hands))
                      out)
            i (1+ i))))
  (reverse out))

;;; The stiles: ((idx kind x y z w h d) ...), idx the divider's (D8).
(defun mirror-stiles (zones kinds yD hD D faceT / out i z)
  (setq out nil
        i 0)
  (foreach z zones
    (cond
      ((= (car z) "STILE")
        (setq out (cons (list (1+ i) (nth i kinds) (cadr z) yD D (- (caddr z) (cadr z)) hD faceT) out)
              i (1+ i)))
      ((= (car z) "JOINT")
        (setq i (1+ i)))))
  (reverse out))

;;; The dividers: ((idx x y z w h d) ...), centred under the stile or on the
;;; joint, from the bays' floor bf to their ceiling bc (D7).
(defun mirror-dividers (zones bf bc D G / out i z c)
  (setq out nil
        i 0)
  (foreach z zones
    (if (or (= (car z) "STILE") (= (car z) "JOINT"))
      (setq c (/ (+ (cadr z) (caddr z)) 2.0)
            i (1+ i)
            out (cons (list i (- c (/ G 2.0)) bf G G (- bc bf) (- D G)) out))))
  (reverse out))

;;; The bays' clear openings, left to right: ((idx from to) ...) (D14).
(defun mirror-bays (x0 Wc G dividers / out from i dv)
  (setq out nil
        from (+ x0 G)
        i 1)
  (foreach dv dividers
    (setq out (cons (list i from (nth 1 dv)) out)
          from (+ (nth 1 dv) G)
          i (1+ i)))
  (reverse (cons (list i from (- (+ x0 Wc) G)) out)))

;;; ---- (e) THE WEIGHT AND THE HINGES ----

;;; The door's weight in kg: its board and its mirror (D10).
(defun mirror-door-kg (dw dh doorT mirrorOn / a)
  (setq a (/ (* dw dh) 1000000.0))
  (+ (* (mirrorBoardKgM3) (/ doorT 1000.0) a)
     (if mirrorOn (* (mirrorMirrorKgM2) a) 0.0)))

;;; Its band on the Blum table: (max height, max kg, hinges), or nil past it.
(defun mirror-hinge-band (dh kg / out b)
  (setq out nil)
  (foreach b (mirrorBlumBands)
    (if (and (null out) (<= dh (car b)) (<= kg (cadr b))) (setq out b)))
  out)

;;; How many hinges it hangs on (D10).
(defun mirror-hinge-count (dh kg / b)
  (setq b (mirror-hinge-band dh kg))
  (if b (caddr b) (mirrorBlumBeyond)))

;;; Its cups, up from its foot (D10).
(defun mirror-cups (dh n / out k sp)
  (cond
    ((= n 2) (list (mirrorCupBottom) (- dh (mirrorCupTopFromTop))))
    ((= n 3) (list (mirrorCupBottom) (- dh (mirrorCupUpperFromTop)) (- dh (mirrorCupTopFromTop))))
    (T
      (setq sp (/ (- dh (mirrorCupTopFromTop) (mirrorCupBottom)) (- n 1.0))
            out nil
            k 0)
      (while (< k n)
        (setq out (cons (+ (mirrorCupBottom) (* sp k)) out)
              k (1+ k)))
      (reverse out))))

;;; The board a door hangs on and the face of it the plates are on: ("BUL"
;;; "R"), ("BUR" "L"), ("DIVIDER-k" "R" or "L") (D9).
(defun mirror-hinge-board (idx bays hand)
  (if (= hand "L")
    (if (= idx 1) (list "BUL" "R") (list (strcat "DIVIDER-" (itoa (1- idx))) "R"))
    (if (= idx bays) (list "BUR" "L") (list (strcat "DIVIDER-" (itoa idx)) "L"))))

;;; The x span of the board a door hangs on: (bx0 bx1) (D11).
(defun mirror-board-span (board x0 Wc G dvs / out dv)
  (setq out nil)
  (cond
    ((= board "BUL") (setq out (list x0 (+ x0 G))))
    ((= board "BUR") (setq out (list (- (+ x0 Wc) G) (+ x0 Wc))))
    (T
      (foreach dv dvs
        (if (= board (strcat "DIVIDER-" (itoa (car dv))))
          (setq out (list (nth 1 dv) (+ (nth 1 dv) (nth 4 dv))))))))
  out)

;;; How far a door covers that board, from the face it hangs on (D11): the
;;; board's x span bx0 .. bx1; negative, it stands off it.
(defun mirror-overlay (door hand bx0 bx1)
  (if (= hand "L")
    (- bx1 (nth 1 door))
    (- (+ (nth 1 door) (nth 4 door)) bx0)))

;;; The plate pilots' heights on the board, in its own frame (up from its
;;; foot at boardY): two a cup, 16 either side (D10).
(defun mirror-plate-ys (cups doorY boardY / out c)
  (setq out nil)
  (foreach c cups
    (setq out (cons (+ (- (+ doorY c) boardY) (mirrorPlatePair))
                    (cons (- (- (+ doorY c) boardY) (mirrorPlatePair)) out))))
  (reverse out))

;;; ...and their x as the board is drawn: BUL and a divider's left face 37
;;; from the front edge; BUR and a divider's right face depth - 37 (the
;;; house's mirror rule, BUL and BUR since turn 1) (D10).
(defun mirror-plate-x (board face depth)
  (cond
    ((= board "BUL") (mirrorPlateFromFront))
    ((= board "BUR") (- depth (mirrorPlateFromFront)))
    ((= face "L") (mirrorPlateFromFront))
    (T (- depth (mirrorPlateFromFront)))))

;;; The note when a door stands off the board it hangs on (D11).
(defun mirror-reach-note (num idx board overlay)
  (if (< overlay 0.0)
    (strcat num ": door " (itoa idx) " hangs on " board " and stands " (mirror-mm (- overlay))
            " mm off its face: the hinge that reaches it is the owner's to name.")
    nil))

;;; ---- (f) THE GLASS SHELVES AND THEIR PINS ----

;;; n shelves' undersides, spaced evenly from the floor to the ceiling (D14).
(defun mirror-shelf-ys (bf bc n / out i sp)
  (setq sp (/ (- bc bf) (+ n 1.0))
        out nil
        i 1)
  (while (<= i n)
    (setq out (cons (+ bf (* sp i)) out)
          i (1+ i)))
  (reverse out))

;;; A glass shelf's depth: WUD's, less the back's mirror (D14, D15).
(defun mirror-shelf-depth (D G backOn)
  (- D G (mirrorShelfFrontClear) (if backOn (mirrorMirrorT) 0.0)))

;;; One glass shelf in bay b (idx from to) at height y: (x y z w h d) (D14).
(defun mirror-shelf (b y D G backOn / sd)
  (setq sd (mirror-shelf-depth D G backOn))
  (list (+ (nth 1 b) (/ (mirrorShelfWidthClear) 2.0)) y (- D (mirrorShelfFrontClear) sd)
        (- (nth 2 b) (nth 1 b) (mirrorShelfWidthClear)) (mirrorGlassShelf) sd))

;;; Does a shelf at y stand in its bay (D14)?
(defun mirror-shelf-fits-p (y bf bc)
  (and (>= y bf) (<= (+ y (mirrorGlassShelf)) bc)))

;;; The pin rows a board takes for the shelves at ys, in its own frame (its
;;; foot at boardY, boardH high): three a shelf, each once (D14).
(defun mirror-pin-ys (ys boardY boardH / out y dy v)
  (setq out nil)
  (foreach y ys
    (foreach dy (mirrorPinCluster)
      (setq v (- (+ y dy) boardY))
      (if (and (>= v 0.0) (<= v boardH) (not (member v out)))
        (setq out (cons v out)))))
  (reverse out))

;;; ...and their two columns, 70 from the board's front and back edges.
(defun mirror-pin-xs (depth)
  (list (mirrorPinColumn) (- depth (mirrorPinColumn))))

;;; ---- (g) THE BACK'S MIRROR ----

;;; One pane a bay, on the BACK's inside face: ((idx x y z w h d) ...) (D15).
(defun mirror-back-panes (bays bf bc G / out b)
  (setq out nil)
  (foreach b bays
    (setq out (cons (list (car b) (nth 1 b) bf G (- (nth 2 b) (nth 1 b)) (- bc bf) (mirrorMirrorT)) out)))
  (reverse out))

;;; ---- (h) THE HANGERS, THE LIGHT, THE RECESS ----

;;; The parent's hanger holes in a side, in its own frame (BUL's x from its
;;; front edge, BUR's from its back edge): ((x y) ...) (D18).
(defun mirror-hanger-holes (board sideW Hc / out f)
  (setq out nil)
  (foreach f (mirrorHangerFromBack)
    (setq out (cons (list (if (= board "BUL") (- sideW f) f) (- Hc (mirrorHangerFromTop))) out)))
  (reverse out))

;;; ...and the BACK's two cut-outs at its top corners: ((x1 y1 x2 y2) ...).
(defun mirror-hanger-cuts (Wc Hc)
  (list (list 0.0 (- Hc (mirrorHangerCutH)) (mirrorHangerCutW) Hc)
        (list (- Wc (mirrorHangerCutW)) (- Hc (mirrorHangerCutH)) Wc Hc)))

;;; The LED strips' lengths and the inside strip's line (D16).
(defun mirror-led-under-length (Wc G)
  (- Wc G G))
(defun mirror-led-inside-length (bf bc)
  (- bc bf))
(defun mirror-led-inside-z (D)
  (- D (/ (mirrorShelfFrontClear) 2.0)))

;;; How far the carcass face and the doors' face stand proud of the recess
;;; line (D17).
(defun mirror-proud (D recess)
  (- D recess))
(defun mirror-face-proud (D faceT recess)
  (- (+ D faceT) recess))

;;; ---- (i) THE REFUSAL ----

;;; A list of figures for a sentence: 330 + 480 + 330.
(defun mirror-list-mm (lst / s v)
  (setq s nil)
  (foreach v lst
    (setq s (if s (strcat s " + " (mirror-mm v)) (mirror-mm v))))
  (if s s "none"))

;;; Typed widths that do not fill the carcass, in words, or nil (D5).
(defun mirror-widths-refusal (num Wc bays widths kinds sw / thin v)
  (setq thin nil)
  (foreach v widths
    (if (<= v (mirrorGap)) (setq thin T)))
  (cond
    ((null widths) nil)
    ((mirror-widths-fit-p Wc bays widths kinds sw) nil)
    ((/= (length widths) bays)
      (strcat num ": " (itoa (length widths)) " door widths for " (itoa bays)
              " bays: type one width a bay. The doors are cut at the kit's own widths."))
    (thin
      (strcat num ": a door " (mirror-mm (mirrorGap)) " wide or less is no door: type every width wider than "
              (mirror-mm (mirrorGap)) ". The doors are cut at the kit's own widths."))
    (T
      (strcat num ": the door widths " (mirror-list-mm widths)
              (if (mirror-stile-ws kinds sw) (strcat " and the stiles " (mirror-list-mm (mirror-stile-ws kinds sw))) "")
              " make " (mirror-mm (+ (mirror-sum widths) (mirror-stiles-total kinds sw)))
              ", the carcass is " (mirror-mm Wc) " wide: type door widths that make " (mirror-mm Wc)
              " with the stiles. The doors are cut at the kit's own widths."))))

;;;========================================
;;; 6. NUMBERS (the engine is held to these: test/turn83-f01-mirror-lisp.test.js
;;;    RUNS the routines above on these inputs and reads these lines back)
;;;========================================
;;;
;;; THE WORKED EXAMPLE. MC01 1350 x 1100 x 215, G 18, the door board 18, the
;;; panels 30 all on, mirror doors, three bays at the kit's own widths, LED
;;; stiles 75, the bottom box, five glass shelves a bay.
;;; THE CARCASS. At x 30 y 30, 1290 x 1040: BUL at x 30 and BUR at x 1302, 18
;;; x 1040 x 197 from z 18; TOP 1254 x 197 at y 1052, BOTTOM at y 30; the BACK
;;; 1290 x 1040 at z 0.
;;; THE PANELS. 237 deep (215 + 18 + 4): PANEL-L and PANEL-R 30 x 1100 at x 0
;;; and 1320; PANEL-TOP and PANEL-BOTTOM 1290 x 30 at x 30, y 1070 and 0.
;;; THE BOX. BOX-TOP 1254 x 197 at y 112 (its top face at 130); BOX-FRONT 1287
;;; x 97 x 18 at x 31.5, y 30, z 215.
;;; THE FACE. The zones 30..360 door, 360..435 stile, 435..915 door, 915..990
;;; stile, 990..1320 door. The doors 327 / 477 / 327 x 937 at x 31.5, 436.5
;;; and 991.5, y 130, 22 thick (18 + 4), hands L L R; the stiles 75 x 937 x 22
;;; at x 360 and 915; DIVIDER-1 at x 388.5 and DIVIDER-2 at x 943.5, 18 x 922
;;; x 197 from y 130 and z 18; the bays 48..388.5, 406.5..943.5, 961.5..1302.
;;; THE HINGES. The 327 door 6.9246 kg, the 477 door 10.101 kg (3.8606 +
;;; 3.064 and 5.6316 + 4.4695): both in the 1600 / 13 band, 3 hinges, the cups
;;; at 100 640 840; the outer doors cover their sides 16.5, the middle one
;;; stands 30 off DIVIDER-1's face: "MC01: door 2 hangs on DIVIDER-1 and stands
;;; 30 mm off its face: the hinge that reaches it is the owner's to name."
;;; The plates on BUL at x 37, y 184 216 724 756 924 956; on DIVIDER-1's right
;;; face at x 160, y 84 116 624 656 824 856; on BUR at x 160 as BUL.
;;; THE SHELVES. Five a bay, 6 x 177 deep at z 18, 336.5 / 533 / 336.5 wide,
;;; their undersides at 130 + 922 / 6 x i: 283.6667, 437.3333, 591, 744.6667,
;;; 898.3333; the pins 70 and 127 from the boards' front edges.
;;; THE HANGERS. In BUL at x 176 and 144, in BUR at 21 and 53, y 987; the
;;; BACK's cut-outs 0..30 and 1260..1290 by 982..1040.
;;; THE LIGHT. The strip under 1254 long, the strip inside 922 at z 205.
;;; THE RECESS. 155: the carcass 60 proud of the recess line, the mirror's
;;; face 82.
;;;
;;; NO STILES. stile "none", widths 405 480 405: the doors 402 / 477 / 402 at
;;; x 31.5, 436.5, 916.5, 3 apart over DIVIDER-1 at x 426 and DIVIDER-2 at x
;;; 906. The kit's own widths with no stiles: 430 each.
;;; NO PANELS. The carcass the cabinet, 1350 x 1100 at 0 0; the kit's own
;;; widths 400 each (the profile's 1140 and the stiles' 150 make 1290, not
;;; 1350).
;;; NO MIRROR. The doors 18 thick, the panels 233 deep; the 477 door 5.6316
;;; kg, 3 hinges.
;;; A WIDTH THAT DOES NOT FIT. 330 480 300: "MC01: the door widths 330 + 480 +
;;; 300 and the stiles 75 + 75 make 1260, the carcass is 1290 wide: type door
;;; widths that make 1290 with the stiles. The doors are cut at the kit's own
;;; widths."
;;; THE BACK'S MIRROR. Three panes 340.5 / 537 / 340.5 x 922 x 4 at z 18; the
;;; shelves 173 deep from z 22.
;;; A HEAVY DOOR. 600 x 1700 with a mirror: 23.052 kg (12.852 + 10.2), 5
;;; hinges (the 2400 / 24 band), the cups at 100, 475.75, 851.5, 1227.25, 1603.

;;;========================================
;;; 7. THE COMMAND (prints and draws what part 5 returns, nothing more)
;;;========================================

(defun c:MIRROR_FULL (/ W H D G pt bays sw kinds cc x0 y0 Wc Hc doorT faceT boxH widths zones yD hD hands doors stiles dvs e r hb sp msg)
  (setq W (getreal "\nCabinet width <1350>: "))
  (if (null W) (setq W (mirrorWidth)))
  (setq H (getreal "\nCabinet height <1100>: "))
  (if (null H) (setq H (mirrorHeight)))
  (setq D (getreal "\nCarcass depth <215>: "))
  (if (null D) (setq D (mirrorDepth)))
  (setq G (getreal "\nBoard thickness <18>: "))
  (if (null G) (setq G 18.0))
  (setq pt (getreal "\nPanel thickness <30>: "))
  (if (null pt) (setq pt (mirrorPanelT)))
  (setq bays (getint "\nBays 1, 2 or 3 <3>: "))
  (if (null bays) (setq bays (mirrorBays)))
  (setq sw (mirrorStileW)
        kinds (mirror-stile-kinds bays (mirrorStileKind) nil)
        cc (mirror-carcass W H T T T T pt)
        x0 (car cc)
        y0 (cadr cc)
        Wc (caddr cc)
        Hc (cadddr cc)
        doorT (mirrorDoorBoard)
        faceT (mirror-face-t doorT T)
        boxH (mirror-box-h T)
        widths (mirror-widths Wc bays nil kinds sw)
        zones (mirror-zones x0 widths kinds sw)
        yD (mirror-door-y y0 boxH)
        hD (mirror-door-h Hc boxH)
        hands (mirror-hands bays nil)
        doors (mirror-doors zones yD hD D faceT hands)
        stiles (mirror-stiles zones kinds yD hD D faceT)
        dvs (mirror-dividers zones (mirror-floor y0 G boxH) (mirror-ceiling y0 Hc G) D G))
  ;; the front view: the panels, the carcass, the dividers behind, the doors and the stiles
  (foreach r (mirror-panels W H D faceT T T T T pt)
    (drawRect "CARCASE" (nth 1 r) (nth 2 r) (+ (nth 1 r) (nth 4 r)) (+ (nth 2 r) (nth 5 r))))
  (drawRect "CARCASE" x0 y0 (+ x0 Wc) (+ y0 Hc))
  (foreach r dvs
    (drawRect "CARCASE" (nth 1 r) (nth 2 r) (+ (nth 1 r) (nth 4 r)) (+ (nth 2 r) (nth 5 r))))
  (foreach e doors
    (drawRect "DOORS" (nth 1 e) (nth 2 e) (+ (nth 1 e) (nth 4 e)) (+ (nth 2 e) (nth 5 e))))
  (foreach e stiles
    (drawRect "DOORS" (nth 2 e) (nth 3 e) (+ (nth 2 e) (nth 5 e)) (+ (nth 3 e) (nth 6 e))))
  (drawText "LABELS" (/ W 2.0) (/ H 2.0) 24.0 "MC01")
  (foreach e doors
    (setq hb (mirror-hinge-board (car e) bays (nth 7 e))
          sp (mirror-board-span (car hb) x0 Wc G dvs)
          msg (mirror-reach-note "MC01" (car e) (car hb) (mirror-overlay e (nth 7 e) (car sp) (cadr sp))))
    (if msg (princ (strcat "\n" msg))))
  (princ))
