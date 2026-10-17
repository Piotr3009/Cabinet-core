;;;========================================
;;; SKYLON_JOINTS_CABINEO.lsp
;;; The FOURTH joint system: Lamello CABINEO 8 / 12 (T78, PART E, F20)
;;; Commands: CABINEO_JOINTS (prints the pattern for a cabinet; draws nothing)
;;;           CABINEO_DRAW   (draws the pattern board by board, in the frame
;;;                           each board is EXPORTED in: the horizontal boards
;;;                           OUTSIDE FACE UP, the sides inside face up)
;;; Requires: nothing. Pure functions, princ and entmake; SKYLON_COMMON is not
;;;           loaded because no drawing helper of it is called here.
;;;========================================
;;;
;;; The owner, 9.10.2026: "lisp najpierw." This file is written BEFORE any
;;; engine code, and the engine mirrors it routine for routine under the same
;;; names. Nothing in it is invented in JS and backfilled here.
;;;
;;; THE DATA. Every Lamello number in section A is restated from
;;; reference/hardware/cabineo/cabineo.json, which was read off Lamello's own
;;; sheet reference/hardware/cabineo/Operating_instructions_Cabineo.pdf
;;; (Cabineo operating instructions DE/EN, Lamello Art.No. 986320VS, edition
;;; 02/24, 2 pages; page 1 the product, assembly, applications and strengths;
;;; page 2 the machining: four mountings, three options each). Nothing was
;;; fetched from the web. Every number carries its page and the drawing it
;;; comes from and is OWNER TO CONFIRM; a value that is nil is NOT on the sheet
;;; and the comment beside it says what is missing. A value marked DERIVED is
;;; arithmetic on printed numbers and says which. The owner's own decisions
;;; (11.10.2026) are marked DECIDED.
;;;
;;; WHAT IT IS. The puzzle (SKYLON_COMMON drawBUL / drawBUR / drawTOP_ROT90 /
;;; drawBACK) stays the house's DEFAULT joint system and this file does not
;;; touch it. A unit whose company default or own override is
;;; `joints.system = 'cabineo8'` or `'cabineo12'` has its side to TOP, side to
;;; BOTTOM and side to FIX SHELF joints made with Cabineo connectors: a POCKET
;;; milled into the FACE of the horizontal board at its end (the channel open
;;; to the end), and a dia 5 hole drilled into the FACE of the side on the
;;; joint line, one per pocket. Never both systems on one joint: on those
;;; joints the puzzle's tenons, sockets, dia 7.5 holes, dog bones and dia 3
;;; screw rows go (section F). The joints into the BACK are NOT in the owner's
;;; sentence of 11.10.2026 (top, bottom, fixed shelf, side); they were left
;;; the puzzle's until 15.10.2026. THAT NIGHT the owner said "jak mamy cabineo
;;; to nie robimy dog bonsow" (a dog bone is the puzzle's relief, and the only
;;; puzzle a Cabineo unit still carried was the back joint: the sides' three
;;; back tenons, the TOP's and BOTTOM's two, each with its dog bone, and the
;;; BACK's sockets with their dia 7.5 holes), and THAT MORNING, asked whether
;;; the BACK stays on drawBACK's dia 3 screws or goes on Cabineo: "plecy tez na
;;; cabineo" (DECIDED). So the back joint goes WHOLE (tenons, sockets, dog
;;; bones AND the screw rows) and is made with Cabineo like the rest, section
;;; D.2b: the BACK is the counterpart (dia 5 holes in its inside face, the
;;; face the sides and the TOP and BOTTOM stand against), the pockets sit in
;;; the boards whose ENDS meet it: the TOP's and BOTTOM's back ends, cut from
;;; their OUTSIDE face as their other pockets are, and the sides' back ends,
;;; cut from the sides' INSIDE face, the face every hinge plate, shelf pin and
;;; dia 5 hole of theirs already lives on, so that no board is machined from
;;; two faces. SKYLON_JOINTS_BISCUIT keeps the BACK on the screws (no biscuit
;;; on the back, the owner); the dowel system (SKYLON_JOINTS_DOWEL) has its
;;; own BACK rows and never drew a dog bone.
;;;
;;; THE OWNER'S OWN MACHINING (15.10.2026, DECIDED): "musi byc 3 layery 1 to
;;; cabineo 15 mm, drugi to cabineo oblamowka, czyli zebranie 0.5 mm laminatu,
;;; 3 to przeciwlegle nawiercenie". Three layers and nothing else:
;;;   1. CABINEO_POCKET_15MM  the pocket as Option 1 drills it: three dia 15
;;;                           holes at 3.6 / 14.8 / 26 from the end, 11.5 deep
;;;                           from the OUTSIDE face (the flush band's depth)
;;;   2. CABINEO_RECESS       the skim: the collar's recess, 16.7 wide as the
;;;                           flush band prints it, 0.5 deep (the owner's
;;;                           number; the sheet prints 0.8), its rounded end
;;;                           concentric with the third hole (DERIVED, D.7)
;;;   3. CABINEO_HOLE_5MM     the counterpart's dia 5 hole in the side's inside
;;;                           face, on the screw axis 5.5 below the pocket face
;;;                           (5 from the collar seat + the 0.5 skim, DERIVED),
;;;                           X deep: 8 for Cabineo 8, 12 for Cabineo 12
;;;                           (DERIVED from the screw's projection; a dealer's
;;;                           technical sheet prints dia 5 x 8 and dia 5 x 12;
;;;                           the owner does not remember the depth and names
;;;                           it in holeDepthMm when he does)
;;; So the profile's defaults are machining "drill15", mounting "flush",
;;; skimMm 0.5. The cutter options and the cap mounting stay on the sheet and
;;; stay choosable; nothing of them is the default any more.
;;;
;;; THE INVERTED SIDE (the owner's own point, 11.10.2026, DECIDED): Cabineo
;;; drills NO panel edge. The pocket is milled into the FACE of the horizontal
;;; board (top, bottom, fixed shelf) at its end, and it is cut from the
;;; OUTSIDE face of the carcass ("ciecie nie od srodka korpusu tylko do
;;; zewnatrz"): the top from above (under the worktop), the bottom from below
;;; (in the plinth void), a fixed shelf from its underside (with the cap). The
;;; screw passes through the board's end into the dia 5 hole in the FACE of
;;; the side, drilled from the inside (the face every hinge plate and shelf pin
;;; already lives on). So one joint is machined from two opposite faces, and
;;; the export says so: section C.
;;;
;;; THE GATE. Lamello's numbers are restated here but not yet confirmed by the
;;; owner, and the mounting, the machining option, the pitch and the end
;;; offset are T78 PROPOSED. While `confirmed` is nil a kit or an export that
;;; would MACHINE these pockets refuses, in these words:
;;;   "the Cabineo pattern is proposed, not confirmed by the owner"
;;; (cabineo-gate) below returns that sentence (section E). CABINEO_JOINTS
;;; only PRINTS the pattern so the owner can check it, and prints the gate
;;; above it; CABINEO_DRAW draws it for his eye, on layers of its own.

;;;========================================
;;; A. THE NUMBERS
;;;========================================
;;; A.1 THE PROFILE: profile.joints.cabineo, as an assoc list. Passed IN to
;;; every function below, so each one is pure: same numbers in, same cuts out.
;;; The variant is the company's choice (joints.system 'cabineo8' |
;;; 'cabineo12', CLAUDE.md T78 F19/F20: "Cabineo 8 AND 12, chosen in the
;;; company's default settings"); here it is the id the sheet uses ("8" |
;;; "12"). The mounting and the machining option are the owner's own
;;; (15.10.2026, DECIDED: he drills, three dia 15 holes, and skims 0.5 for the
;;; collar; the head of this file). The pitch and the end offset are T78
;;; proposed and must sit inside the SHEET's two limits, restated here from
;;; page 1: min. 20 from the board's edge to the first connector, max. 300
;;; between connectors (Assembly panel 1). Never fewer than TWO on one joint
;;; (CLAUDE.md T78 F20: "never fewer than two, never over the sheet's 300").
(defun cabineo-profile ( / )
  (list
    (cons "variant" "12")          ;; "8" | "12": company defaults joints.system cabineo8 | cabineo12 (owner: both offered)
    (cons "mounting" "flush")      ;; surface | flush | flushCap | hpl       the owner, 15.10.2026, DECIDED (the collar skimmed in)
    (cons "machining" "drill15")   ;; drill15 | cutter10 | cutter12          the owner, 15.10.2026, DECIDED ("cabineo 15 mm": three dia 15 holes)
    (cons "skimMm" 0.5)            ;; the collar's skim under "flush", 0.5   the owner, 15.10.2026, DECIDED ("zebranie 0.5 mm laminatu"; the sheet prints 0.8)
    (cons "holeDepthMm" nil)       ;; the side's dia 5 hole depth; nil = X   DERIVED (8 / 12, the screw's projection); the owner names it when he remembers
    (cons "pitchMm" 250.0)         ;; the widest gap between two pockets     T78 proposed, owner to confirm
    (cons "endOffsetMm" 50.0)      ;; first and last pocket from each end    T78 proposed, owner to confirm
    (cons "minPerJoint" 2)         ;; never fewer than this on one joint     CLAUDE.md T78 F20
    (cons "maxSpacingMm" 300.0)    ;; THE SHEET's: max. 300 between connectors   page 1, Assembly panel 1, owner to confirm
    (cons "minFromEdgeMm" 20.0)    ;; THE SHEET's: min. 20 from the board's edge page 1, Assembly panel 1, owner to confirm
    (cons "caps" "all")            ;; "all" | "shelves": which pockets get a cover cap (section F)  T78 proposed
    (cons "minSkinMm" 3.0)         ;; T76's MIN_SKIN between opposing blind cuts (engine/frontBoard.js minSkinOf)
    (cons "confirmed" T)))         ;; THE GATE: OPEN since 15.10.2026 (the owner: "otworz"); nil shuts it again

;;; Read one value off an assoc list.
(defun cabineo-get (alist key)
  (cdr (assoc key alist)))

;;; Read a nested value: (cabineo-path sheet (list "mountings" "flushCap" "pocketDepthMm")).
(defun cabineo-path (alist keys / out)
  (setq out alist)
  (foreach k keys (setq out (cdr (assoc k out))))
  out)

;;; A.2 THE SHEET: cabineo.json key for key, as printed by Lamello. Every group
;;; carries "pageOf" and "drawing". Units mm. OWNER TO CONFIRM throughout.
;;; The FRAME of the machining numbers (cabineo.json machining.frame): s from
;;; the board's END (the joint line) along the board, t across the board with
;;; t = 0 on the screw axis; the pocket is OPEN at s = 0 (the channel runs out
;;; of the end); every outline is symmetric about the axis.
(defun cabineo-sheet ( / )
  (list
    (cons "source" (list
      (cons "file" "reference/hardware/cabineo/Operating_instructions_Cabineo.pdf")
      (cons "json" "reference/hardware/cabineo/cabineo.json")
      (cons "document" "Lamello Cabineo operating instructions DE/EN, Art.No. 986320VS, edition 02/24, 2 pages")
      (cons "status" "owner to confirm")))
    ;; The connector itself (page 1, Technical information and the isometric).
    (cons "connector" (list
      (cons "lengthMm" 33.8)         ;; overall, collar included
      (cons "widthMm" 16.5)
      (cons "heightMm" 10.8)         ;; overall, collar included
      (cons "bodyHeightMm" 10.0)     ;; the ribbed body below the collar (the isometric)
      (cons "cutterMaxDiaMm" 12.0)   ;; "Cutter <= dia 12 mm"
      (cons "pageOf" 1)
      (cons "drawing" "Technical information table 'Size 33.8 x 16.5 x 10.8 mm', 'Cutter <= dia 12 mm'; the isometric '33.8 / 16.5 / 10'")))
    ;; The spacing limits (page 1, Assembly panel 1).
    (cons "spacing" (list
      (cons "edgeMinMm" 20.0)        ;; min. 20 from the board's edge to the first connector
      (cons "maxMm" 300.0)           ;; max. 300 between connectors
      (cons "pageOf" 1)
      (cons "drawing" "Assembly, panel 1: 'min. 20 mm', 'max. 300 mm' along the board's end that carries the pockets")))
    ;; The counterpart hole, in the FACE of the panel that takes the screw.
    (cons "counterpartHole" (list
      (cons "diaMm" 5.0)
      (cons "depthMm" nil)           ;; NOT ON THE SHEET. "D-5 / D-5.8 / D-7.1" is the screw axis to the far face of the connector board, not this depth
      (cons "axisFromCollarSeatMm" 5.0) ;; every section drawing: 5 from the collar seat to the screw axis
      (cons "pageOf" 2)
      (cons "drawing" "every section drawing of page 2: 'dia 5 mm' on the counterpart panel, 'X' the screw's projection beyond the board's end")))
    ;; The variants (page 1 Applications and strength table; page 2 captions).
    (cons "variants" (list
      (cons "8" (list
        (cons "label" "Cabineo 8")
        (cons "screwReachXMm" 8.0)             ;; page 2 caption 'Cabineo 8: X = 8 mm'
        (cons "screw" "black galvanised screw")
        (cons "minCounterpartMm" 9.0)          ;; page 1 Applications, corner joint: the panel that takes the screw >= 9
        (cons "minConnectorBoardMm" 12.0)      ;; page 1 Applications: the board that carries the connector >= 12
        (cons "minCentreWallMm" 16.0)          ;; page 1 Applications, centre wall >= 16
        (cons "article" nil)                   ;; NOT ON THE SHEET. CLAUDE.md's 186310 is NOT printed on page 1 or 2: owner to supply
        (cons "pageOf" 1)
        (cons "drawing" "Applications, Cabineo 8: '>= 9 mm', '>= 12 mm', '>= 16 mm'; page 2 'Cabineo 8: X = 8 mm'")))
      (cons "12" (list
        (cons "label" "Cabineo 12")
        (cons "screwReachXMm" 12.0)            ;; page 2 caption 'Cabineo 12: X = 12 mm'
        (cons "screw" "galvanised screw")
        (cons "minCounterpartMm" 13.0)         ;; page 1 Applications, corner joint >= 13
        (cons "minConnectorBoardMm" 12.0)
        (cons "minCentreWallMm" 24.0)          ;; page 1 Applications, centre wall >= 24
        (cons "article" nil)                   ;; NOT ON THE SHEET: owner to supply
        (cons "pageOf" 1)
        (cons "drawing" "Applications, Cabineo 12: '>= 13 mm', '>= 12 mm', '>= 24 mm'; page 2 'Cabineo 12: X = 12 mm'")))
      (cons "8M6" (list
        (cons "label" "Cabineo 8 M6")
        (cons "screwReachXMm" 8.0)             ;; page 2 caption 'Cabineo 8 M6: X = 8 mm'
        (cons "screw" "yellow galvanised screw, metric ISO thread DIN 13-1")
        (cons "insertMm" 12.3)                 ;; 'with insert 12.3 mm' (page 1)
        (cons "minCounterpartMm" 14.0)         ;; page 1 Applications, corner joint >= 14 (plus an uncaptioned '1 mm' at the insert's mouth)
        (cons "minConnectorBoardMm" 12.0)
        (cons "minCentreWallMm" 14.0)          ;; page 1 Applications, centre wall >= 14 and <= 16
        (cons "maxCentreWallMm" 16.0)
        (cons "article" nil)                   ;; NOT ON THE SHEET: owner to supply (connector and insert)
        (cons "pageOf" 1)
        (cons "drawing" "Applications, Cabineo 8 M6 with insert 12.3 mm: '>= 14 mm', '>= 12 mm', '>= 14 mm', '<= 16 mm', '1 mm'; page 2 'Cabineo 8 M6: X = 8 mm'")))))
    ;; The four mountings (page 2, the four bands, each a section drawing).
    ;; axisFromSurfaceMm is DERIVED: D - (D-5 / D-5.8 / D-7.1) = the printed 5
    ;; plus the collar or cap recess (0 / 0.8 / 2.1); it is the depth of the
    ;; screw axis below the face the pocket is cut from.
    (cons "mountings" (list
      (cons "surface" (list
        (cons "label" "On the surface: the collar lies on the board's face")
        (cons "variants" (list "8" "12" "8M6"))
        (cons "pocketDepthMm" 11.0)
        (cons "axisFromCollarSeatMm" 5.0)
        (cons "axisToFarFace" "D-5")
        (cons "axisFromSurfaceMm" 5.0)      ;; DERIVED: D - (D-5)
        (cons "recessDepthMm" nil)           ;; no recess: the collar lies on the face
        (cons "recessWidthMm" nil)
        (cons "recessEndRadiusMm" nil)
        (cons "recessEndCentreFromEndMm" nil)
        (cons "recessLengthMm" nil)
        (cons "floorMm" nil)                 ;; no dimension printed at the pocket floor
        (cons "pageOf" 2)
        (cons "drawing" "On the surface, section: 'dia 5 mm', '5 mm', 'D-5 mm', '11 mm', 'D', 'X'")))
      (cons "flush" (list
        (cons "label" "Flush with the surface: the collar is let into the face")
        (cons "variants" (list "8" "12" "8M6"))
        (cons "pocketDepthMm" 11.5)
        (cons "axisFromCollarSeatMm" 5.0)
        (cons "axisToFarFace" "D-5.8")
        (cons "axisFromSurfaceMm" 5.8)      ;; DERIVED: D - (D-5.8) = 5 + 0.8
        (cons "recessDepthMm" 0.8)           ;; the collar recess
        (cons "recessWidthMm" 16.7)          ;; Options 1 to 3: '16.7 mm' across the recess
        (cons "recessEndRadiusMm" nil)       ;; NOT ON THE SHEET (the drawing shows a rounded end concentric with the third lobe)
        (cons "recessEndCentreFromEndMm" nil) ;; NOT ON THE SHEET
        (cons "recessLengthMm" nil)          ;; NOT ON THE SHEET
        (cons "floorMm" 0.7)                 ;; printed at the pocket floor, uncaptioned
        (cons "pageOf" 2)
        (cons "drawing" "Flush with the surface, section: 'dia 5 mm', '5 mm', 'D-5.8 mm', '11.5 mm', '0.8 mm', '0.7 mm', 'D', 'X'; Options 1 to 3: '16.7 mm'")))
      (cons "flushCap" (list
        (cons "label" "Flush cover cap: the cover cap sits flush in a deeper recess")
        (cons "variants" (list "8" "12" "8M6"))
        (cons "pocketDepthMm" 13.0)
        (cons "axisFromCollarSeatMm" 5.0)
        (cons "axisToFarFace" "D-7.1")
        (cons "axisFromSurfaceMm" 7.1)      ;; DERIVED: D - (D-7.1) = 5 + 2.1
        (cons "recessDepthMm" 2.1)           ;; the cap recess
        (cons "recessWidthMm" 18.8)          ;; Option 1: '18.8 mm' across the recess
        (cons "recessEndRadiusMm" 9.4)       ;; Options 1 and 2: '9.4 mm = r'
        (cons "recessEndCentreFromEndMm" 26.25) ;; Option 2: '26.25 mm' (Option 1: '0.25 mm' beyond the third hole centre)
        (cons "recessLengthMm" 35.65)        ;; Option 3: '35.65 mm' from the board's end
        (cons "floorMm" 0.95)                ;; printed at the pocket floor, uncaptioned
        (cons "pageOf" 2)
        (cons "drawing" "Flush cover cap, section: 'dia 5 mm', '5 mm', 'D-7.1 mm', '13 mm', '2.1 mm', '0.95 mm', 'D', 'X'; Option 1 '18.8 mm', '0.25 mm', '9.4 mm = r'; Option 2 '26.25 mm'; Option 3 '35.65 mm'")))
      (cons "hpl" (list
        (cons "label" "HPL on the surface: the collar lies on an HPL faced board")
        (cons "variants" (list "8M6"))       ;; this band's caption names Cabineo 8 M6 only
        (cons "pocketDepthMm" 11.0)
        (cons "axisFromCollarSeatMm" 5.0)
        (cons "axisToFarFace" "D-5")
        (cons "axisFromSurfaceMm" 5.0)      ;; DERIVED: D - (D-5)
        (cons "recessDepthMm" nil)
        (cons "recessWidthMm" nil)
        (cons "recessEndRadiusMm" nil)
        (cons "recessEndCentreFromEndMm" nil)
        (cons "recessLengthMm" nil)
        (cons "floorMm" 1.0)                 ;; printed at the pocket floor, uncaptioned
        (cons "pageOf" 2)
        (cons "drawing" "HPL on the surface, section: 'dia 5 mm', '5 mm', 'D-5 mm', '11 mm', '1 mm', 'D', 'X'")))))
    ;; The three machining options (page 2, Options 1 to 3 of every band). The
    ;; three standard bands (surface, flush, flushCap) print ONE set of
    ;; numbers ("standard"); the HPL band prints its own ("hpl").
    (cons "machining" (list
      (cons "drill15" (list
        (cons "label" "Option 1: Drill dia 15 mm, three overlapping holes")
        (cons "standard" (list
          (cons "holes" 3)
          (cons "lobeDiaMm" 15.0)                        ;; 'dia 15 mm (3x)'
          (cons "firstCentreFromEndMm" 3.6)              ;; '3.6 mm'
          (cons "pitchMm" 11.2)                          ;; '11.2 mm', '11.2 mm'
          (cons "lobeCentresFromEndMm" (list 3.6 14.8 26.0)) ;; DERIVED: 3.6, 3.6 + 11.2, 3.6 + 11.2 + 11.2 (Options 2 and 3 print 14.8 and 26 directly)
          (cons "pageOf" 2)
          (cons "drawing" "Option 1 under On the surface, Flush with the surface, Flush cover cap: '3.6 mm', '11.2 mm', '11.2 mm', 'dia 15 mm (3x)'")))
        (cons "hpl" (list
          (cons "holes" 3)
          (cons "lobeDiaMm" 15.2)                        ;; 'dia 15.2 mm (3x)'
          (cons "firstCentreFromEndMm" 3.5)
          (cons "pitchMm" 11.2)
          (cons "lobeCentresFromEndMm" (list 3.5 14.7 25.9)) ;; DERIVED
          (cons "pageOf" 2)
          (cons "drawing" "Option 1 under HPL on the surface: '3.5 mm', '11.2 mm', '11.2 mm', 'dia 15.2 mm (3x)'")))))
      (cons "cutter10" (list
        (cons "label" "Option 2: Cutter >= dia 10 mm, the three-lobe outline milled")
        (cons "toolMinDiaMm" 10.0)
        (cons "toolMaxDiaMm" 12.0)                       ;; page 1: 'Cutter <= dia 12 mm'
        (cons "standard" (list
          (cons "lobeDiaMm" 15.0)
          (cons "lobeCentresFromEndMm" (list 3.6 14.8 26.0)) ;; '3.6 mm', '14.8 mm', '26 mm'
          (cons "waistsFromEndMm" (list 9.2 20.4))       ;; '9.2 mm', '20.4 mm'
          (cons "halfHeightAtWaistMm" 5.0)               ;; '5 mm' (the axis to the waist between two lobes)
          (cons "halfHeightAtEndMm" 6.6)                 ;; '6.6 mm' (the axis to the outline where it meets the board's end)
          (cons "pageOf" 2)
          (cons "drawing" "Option 2 under the three standard bands: '26 mm', '14.8 mm', '3.6 mm', 'dia 15 mm (3x)', '6.6 mm', '5 mm', '9.2 mm', '20.4 mm'")))
        (cons "hpl" (list
          (cons "lobeDiaMm" 15.2)
          (cons "lobeCentresFromEndMm" (list 3.5 14.7 25.9))
          (cons "waistsFromEndMm" (list 9.1 20.3))
          (cons "halfHeightAtWaistMm" 5.2)
          (cons "halfHeightAtEndMm" 6.6)
          (cons "pageOf" 2)
          (cons "drawing" "Option 2 under HPL on the surface: '25.9 mm', '14.7 mm', '3.5 mm', 'dia 15.2 mm (3x)', '6.6 mm', '5.2 mm', '9.1 mm', '20.3 mm'")))))
      (cons "cutter12" (list
        (cons "label" "Option 3: Cutter dia 12 mm, the three lobes joined by a straight 12 mm channel")
        (cons "toolDiaMm" 12.0)
        (cons "shearStrengthF3" "-13 %")                 ;; the footnote: 'F3 Shear strength = -13%'
        (cons "standard" (list
          (cons "lobeDiaMm" 15.0)
          (cons "lobeCentresFromEndMm" (list 3.6 14.8 26.0)) ;; '3.6 mm', '14.8 mm', '26 mm'
          (cons "channelHeightMm" 12.0)                  ;; '12 mm'
          (cons "halfHeightAtChannelMm" 6.0)             ;; '6 mm'
          (cons "halfHeightAtEndMm" 6.6)                 ;; '6.6 mm'
          (cons "reliefs" (list (list 8.1 2.2) (list 19.3 2.2))) ;; '8.1 mm' then '2.2 mm'; '19.3 mm' then '2.2 mm': the two straight sections (start, length)
          (cons "pageOf" 2)
          (cons "drawing" "Option 3 under the three standard bands: '26 mm', '14.8 mm', '3.6 mm', 'dia 15 mm (3x)', '6.6 mm', '6 mm', '12 mm', '8.1 mm' + '2.2 mm', '19.3 mm' + '2.2 mm'")))
        (cons "hpl" (list
          (cons "lobeDiaMm" 15.2)
          (cons "lobeCentresFromEndMm" (list 3.5 14.7 25.9))
          (cons "channelHeightMm" 12.0)
          (cons "halfHeightAtChannelMm" 6.0)
          (cons "halfHeightAtEndMm" 6.8)
          (cons "reliefs" (list (list 8.2 1.8) (list 19.3 1.8)))
          (cons "pageOf" 2)
          (cons "drawing" "Option 3 under HPL on the surface: '25.9 mm', '14.7 mm', '3.5 mm', 'dia 15.2 mm (3x)', '6.8 mm', '6 mm', '12 mm', '8.2 mm' + '1.8 mm', '19.3 mm' + '1.8 mm'")))))))
    ;; The cover cap: drawn (Assembly panels 5 and 6; the Flush cover cap
    ;; band), never named.
    (cons "cap" (list
      (cons "article" nil)             ;; NOT ON THE SHEET: owner to supply
      (cons "sizeMm" nil)              ;; NOT ON THE SHEET
      (cons "pageOf" 1)
      (cons "drawing" "Assembly, panels 5 and 6 (the cap pressed on); page 2 Flush cover cap (the 2.1 recess, 18.8 wide, 35.65 long)")))))

;;; CONSISTENCY (cabineo.json machining.consistency, a check and not a
;;; number): three dia 15 circles at 3.6 / 14.8 / 26 give a waist half-height
;;; of sqrt(7.5^2 - 5.6^2) = 4.99 (printed 5), a half-height at the board's
;;; end of sqrt(7.5^2 - 3.6^2) = 6.58 (printed 6.6), and meet a 12 channel
;;; EXACTLY 4.5 from each centre (sqrt(7.5^2 - 6^2) = 4.5), at 8.1, 10.3, 19.3
;;; and 21.5 (printed 8.1 + 2.2 and 19.3 + 2.2). The printed numbers agree
;;; with each other to the sheet's own rounding. The pocket's far end,
;;; 26 + 7.5 = 33.5, is DERIVED (the sheet prints the recess's 35.65, not the
;;; pocket's length).

;;; The machining set in use: "hpl" under the HPL mounting, else "standard".
(defun cabineo-set-id (prof)
  (if (= (cabineo-get prof "mounting") "hpl") "hpl" "standard"))

;;; The chosen option's numbers, mounting and variant, each one assoc list.
(defun cabineo-option (prof sheet)
  (cabineo-path sheet (list "machining" (cabineo-get prof "machining") (cabineo-set-id prof))))
(defun cabineo-mounting (prof sheet)
  (cabineo-path sheet (list "mountings" (cabineo-get prof "mounting"))))
(defun cabineo-variant (prof sheet)
  (cabineo-path sheet (list "variants" (cabineo-get prof "variant"))))

;;; The widest outline a pocket draws ACROSS the axis: the recess where the
;;; mounting has one (18.8 / 16.7), else the lobe diameter (15 / 15.2). Two
;;; pockets closer than this would meet (section B's "too close").
(defun cabineo-pocket-width (prof sheet / m o)
  (setq m (cabineo-mounting prof sheet) o (cabineo-option prof sheet))
  (if (cabineo-get m "recessWidthMm")
    (cabineo-get m "recessWidthMm")
    (cabineo-get o "lobeDiaMm")))

;;;========================================
;;; B. THE SET-OUT RULE
;;;========================================
;;; Where the pockets go along ONE joint, as offsets from the joint's reference
;;; end: THE SAME RULE AS THE DOWELS of T78 F19 (SKYLON_JOINTS_DOWEL.lsp,
;;; section B), bounded by the sheet. Inputs: L the joint's length, e the end
;;; offset (50), p the pitch (250, the widest gap), nMin the fewest pockets on
;;; one joint (2), wide the pocket's across-width (18.8 under flushCap).
;;;
;;;   1. L <= 0: no pocket.
;;;   2. The two END pockets stand e in from each end: at e and at L - e. Their
;;;      span is S = L - 2e.
;;;   3. S < wide (the two end pockets would MEET): ONE pocket on the joint's
;;;      centre, L / 2. The only case under the minimum of two: a joint that
;;;      cannot hold two pockets at the end offsets at all (L < 2e + wide =
;;;      118.8 under flushCap).
;;;   4. Otherwise the COUNT: n = max(nMin, 1 + ceil(S / p)).
;;;   5. The SPACING: n - 1 EQUAL gaps of g = S / (n - 1), the pitch stretched
;;;      evenly so the last pocket lands exactly at e from the far end:
;;;
;;;          t(i) = e + i * S / (n - 1)        i = 0 .. n - 1
;;;
;;;      The last offset is written as L - e, not e + (n - 1) g, so no floating
;;;      remainder reaches the far end.
;;;
;;; WHY NO GAP EXCEEDS THE PITCH, AND SO THE SHEET'S 300. n - 1 >= ceil(S / p)
;;; >= S / p, so g <= p; and (cabineo-refusal) refuses a pitch over the sheet's
;;; maxSpacingMm (300) before any pattern is used, so g <= p <= 300.
;;; WHY THE SHEET'S 20 HOLDS. The first pocket's axis stands e from the end;
;;; (cabineo-refusal) refuses e under the sheet's minFromEdgeMm (20). The
;;; sheet's "min. 20 mm" is read as the distance to the connector (its centre
;;; line); at e = 50 the pocket's own edge stands 50 - 7.5 = 42.5 and the cap
;;; recess's edge 50 - 9.4 = 40.6 from the board's edge, so the reading does
;;; not decide anything here.
;;;
;;; FLOATING NOISE. The ceil takes 1e-9 of slack, as the dowels do; the engine
;;; mirrors the same 1e-9.

;;; ceil for x >= 0, with the 1e-9 slack (AutoLISP has no ceiling function).
(defun cabineo-ceil (x / n)
  (setq n (fix x))
  (if (> (- x n) 1e-9) (1+ n) n))

;;; The offsets along a joint of length L, from its reference end.
(defun cabineo-positions (L e p nMin wide / S n g i out)
  (setq L (float L) e (float e) p (float p) wide (float wide))
  (cond
    ((<= L 0.0) nil)
    ((< (- L e e) wide) (list (/ L 2.0)))
    (T
      (setq S (- L e e))
      (setq n (fix (max nMin (1+ (cabineo-ceil (/ S p))))))
      (setq g (/ S (- n 1)))
      (setq out nil)
      (setq i 0)
      (while (< i (- n 1))
        (setq out (cons (+ e (* i g)) out))
        (setq i (1+ i)))
      (reverse (cons (- L e) out)))))

;;; Do two neighbouring pockets stand closer than the pocket's width (their
;;; outlines would meet)? T if so. Offsets in order, as (cabineo-positions)
;;; gives them.
(defun cabineo-too-close (offs wide / prev hit)
  (foreach o offs
    (if (and prev (< (- o prev) wide)) (setq hit T))
    (setq prev o))
  hit)

;;;========================================
;;; C. THE INVERTED SIDE: WHICH FACE, AND THE ONE REFLECTION
;;;========================================
;;; THE OWNER, 11.10.2026 (DECIDED): no panel edge is drilled. The connector
;;; sits in a POCKET milled into the FACE of the horizontal board (TOP,
;;; BOTTOM, a FIX shelf) at its end, the channel open to the end; its screw
;;; passes through the board's end into a dia 5 hole drilled into the FACE of
;;; the side from the inside. And the pocket is cut from the OUTSIDE face of
;;; the carcass board: the top from above (under the worktop), the bottom from
;;; below (in the plinth void), a fixed shelf from its underside (with the
;;; cap). So:
;;;
;;;   BOARD        POCKET FACE       machinedFace   DRAWN TODAY FROM        EXPORT
;;;   TOP          its top face      "outside"      the inside (underside)  REFLECTED, "OUTSIDE FACE UP"
;;;   BOTTOM       its underside     "outside"      the inside (top face)   REFLECTED, "OUTSIDE FACE UP"
;;;   SHELF (FIX)  its underside     "outside"      its top face (T26 F8)   REFLECTED, "OUTSIDE FACE UP"
;;;   BUL / BUR    (the dia 5 hole)  "inside"       the inside face         as today
;;;
;;; THE FRAMES are the ones each board's LISP draws it in and the engine
;;; places it by (engine/joinery.js panelPlacement), origin bottom-left, x
;;; right, y up, seen from the face drawn today:
;;;   BUL     inside face; x from the FRONT edge (0) to the back edge (D - G), y up
;;;   BUR     inside face; x from the BACK edge (0) to the front edge (D - G), y up
;;;   BOTTOM  drawn ROT90 from the inside (its top face); x the depth from the
;;;           BACK edge (0) to the front (D - G), y the width from the BUL end
;;;           (0) to the BUR end (W - 2G)
;;;   TOP     drawn ROT90 from the inside (its UNDERSIDE): the same x; y the
;;;           width from the BUR end (0) to the BUL end (W - 2G). (17.10.2026,
;;;           SKYLON_JOINTS_BISCUIT.lsp section J: until that day the TOP was
;;;           drawn in the BOTTOM's frame, the view from ABOVE, so "drawn from
;;;           the inside" was not true of it and its REFLECTED file was the
;;;           underside view under an OUTSIDE FACE UP label. The set below is
;;;           symmetric about both axes of the board, which is why no pocket
;;;           moved; the label is honest now.)
;;;   SHELF   drawn from its top face; x from its FRONT edge (0) to the back
;;;           (D - G - setback), y from the BUL end (0) to the BUR end (W - 2G)
;;; The ENDS of a horizontal board, where its pockets open, are y = 0 and
;;; y = its width (the BUL end and the BUR end of the BOTTOM and a shelf; the
;;; BUR end and the BUL end of the TOP); the set-out runs along x (the depth).
;;;
;;; THE REFLECTION. A board whose pocket face is "outside" is exported as seen
;;; from THAT face: its coordinates reflected about the vertical axis,
;;;
;;;     x' = W - x,   y' = y
;;;
;;; where W is the board's DRAWN WIDTH (its x extent in its own frame: D - G
;;; for the TOP and BOTTOM, D - G - setback for a shelf; engine panel.cnc
;;; .drawn_w), NOT the cabinet's width. It is THE SAME reflection T76 built for
;;; the decorative fronts' FRONT files (src/engine/cnc/frontOperations.js
;;; frontPanelEntities: mirror = [width - x, y], frontX = partWidth - backX)
;;; and never a second one. y is untouched, so a pocket 3.6 from the BUL end
;;; lands 3.6 from the BUL end in the reflected file, and the BUR end's lands
;;; 3.6 from the BUR end; what crosses is the depth: a pocket 50 from the
;;; FRONT (x = D - G - 50 in the inside frame, counted from the back) stands at
;;; x' = 50 in the outside frame (counted from the front). The operations JSON
;;; and the part label print "OUTSIDE FACE UP" for every such board.
;;;
;;; THE SIDE'S HOLE. The screw axis sits (mounting's axisFromSurfaceMm) below
;;; the pocket face: 5 (surface, hpl), 5.8 (flush), 7.1 (flushCap). So in the
;;; side's frame the dia 5 hole stands that far from the horizontal board's
;;; OUTSIDE face: for the TOP at H - 7.1, for the BOTTOM at 0 + 7.1, for a FIX
;;; shelf at row + 7.1 (row its underside from the floor). NOT on the board's
;;; centre line as a dowel's face hole is (H - G / 2): on an 18 board the
;;; Cabineo hole is 1.9 nearer the outside than the dowel's.
;;;
;;; THE SKIN CHECK (T76, MIN_SKIN 3 between opposing blind cuts). The pocket is
;;; a blind cut from the OUTSIDE face; every blind cut from the INSIDE face of
;;; the same board whose footprint overlaps it (a screw row, a runner row, an
;;; LED groove) must leave boardT - pocketDepth - otherDepth >= MIN_SKIN; a
;;; clash is refused in words naming the board and the two cuts
;;; ((cabineo-skin-clash) below). On the side, the dia 5 hole is drilled from
;;; the SAME face as the hinge plates, the shelf pins, a wall unit's hanger
;;; holes and a runner row: there the check is a footprint overlap, not a skin
;;; ((cabineo-footprint-clash)). On a plain BUD (section H) neither has a word
;;; to say: the TOP and the BOTTOM carry no inside-face drilling of their own.

;;; The face a board's Cabineo machining is cut from: "outside" for the
;;; horizontal boards (TOP, BOTTOM, SHELF-n), "inside" for a side (the hole).
(defun cabineo-machined-face (board)
  (if (wcmatch board "TOP,BOTTOM,SHELF*") "outside" "inside"))

;;; The label the operations JSON and the part label print for an "outside" board.
(defun cabineo-face-label (board)
  (if (= (cabineo-machined-face board) "outside") "OUTSIDE FACE UP" ""))

;;; T76's one reflection: x' = W - x, y' = y. W is the board's drawn width.
(defun cabineo-reflect-x (x W)
  (- (float W) (float x)))
(defun cabineo-reflect-pt (pt W)
  (list (cabineo-reflect-x (car pt) W) (cadr pt)))

;;; The recess depth the job really cuts: under "flush" the owner's skim
;;; (skimMm, 0.5, 15.10.2026) when he names one, else the sheet's; under every
;;; other mounting the sheet's (the cap needs its full 2.1; the surface bands
;;; have none). nil where the mounting draws no recess.
(defun cabineo-recess-depth (prof sheet / m)
  (setq m (cabineo-mounting prof sheet))
  (cond
    ((null m) nil)
    ((and (= (cabineo-get prof "mounting") "flush") (cabineo-get prof "skimMm")) (cabineo-get prof "skimMm"))
    (T (cabineo-get m "recessDepthMm"))))

;;; The screw axis below the pocket face, by mounting: 5 / 5.8 / 7.1 / 5 off
;;; the sheet; under "flush" with the owner's skim it is 5 (from the collar
;;; seat, page 2) + the skim = 5.5 (DERIVED, the same arithmetic the sheet
;;; does for its own 5.8 = 5 + 0.8).
(defun cabineo-axis-from-outside (prof sheet / m)
  (setq m (cabineo-mounting prof sheet))
  (if (and (= (cabineo-get prof "mounting") "flush") (cabineo-get prof "skimMm"))
    (+ (cabineo-get m "axisFromCollarSeatMm") (cabineo-get prof "skimMm"))
    (cabineo-get m "axisFromSurfaceMm")))

;;; The skin left between a pocket (outside face) and an opposing blind cut
;;; (inside face) of the same board; a clash when it is under minSkin.
(defun cabineo-skin-left (boardT pocketDepth otherDepth)
  (- (float boardT) (float pocketDepth) (float otherDepth)))
(defun cabineo-skin-clash (boardT pocketDepth otherDepth minSkin)
  (< (cabineo-skin-left boardT pocketDepth otherDepth) (float minSkin)))

;;; Two cuts on the SAME face whose boxes overlap: (x1 y1 x2 y2) each.
(defun cabineo-footprint-clash (a b)
  (and (< (nth 0 a) (nth 2 b)) (> (nth 2 a) (nth 0 b))
       (< (nth 1 a) (nth 3 b)) (> (nth 3 a) (nth 1 b))))

;;;========================================
;;; D. PER BOARD: THE POCKET, THE HOLE, THE RECESS
;;;========================================
;;; D.1 THE JOINT RECORD. Every Cabineo joint is a horizontal board's END on a
;;; side's FACE: the board carries the pocket, the side the hole.
;;; Fields (an assoc list built by cabineo-joint):
;;;   name       the joint, e.g. "BUL-TOP"
;;;   len        the joint's length, mm (the board's depth)
;;;   ref        the end the offsets are counted from: always "FRONT"
;;;   side       the SIDE board (takes the dia 5 holes); the joint runs along its x
;;;   sideFrom   the side's x of offset 0
;;;   sideDir    +1.0 the offsets run with x, -1.0 against it
;;;   sideOut    the side's y of the horizontal board's OUTSIDE face (H, 0, row)
;;;   sideIn     +1.0 / -1.0: from that face, which way the board lies
;;;   board      the horizontal board (carries the pockets)
;;;   endName    which of its ends: "Y0" (y = 0, the BUL end) or "YH" (y = width, the BUR end)
;;;   endAt      that end's y coordinate
;;;   boardFrom  the board's x of offset 0
;;;   boardDir   +1.0 / -1.0, as sideDir
;;;   boardW     the board's DRAWN WIDTH (its x extent): the W of the reflection
;;;   boardT     the board's thickness (D on the sheet)
(defun cabineo-joint (name len ref side sFrom sDir sOut sIn board eNm eAt bFrom bDir bW bT)
  (list
    (cons "name" name) (cons "len" (float len)) (cons "ref" ref)
    (cons "side" side) (cons "sideFrom" (float sFrom)) (cons "sideDir" (float sDir))
    (cons "sideOut" (float sOut)) (cons "sideIn" (float sIn))
    (cons "board" board) (cons "endName" eNm) (cons "endAt" (float eAt))
    (cons "boardFrom" (float bFrom)) (cons "boardDir" (float bDir))
    (cons "boardW" (float bW)) (cons "boardT" (float bT))))

;;; Read one field off a joint.
(defun cabineo-jget (jt key)
  (cdr (assoc key jt)))

;;; D.2 THE JOINT TABLE: side to TOP, side to BOTTOM, side to every FIX shelf.
;;; The BACK's four joints are D.2b below (15.10.2026). fixShelves: ((row shelfT
;;; setback) ...), row the shelf's UNDERSIDE from the floor, setback its front
;;; behind the carcass front (the LISP's 20); its depth is D - G - setback and
;;; its width the full clear light W - 2G (turn 24 F6).
;;; The TOP's and BOTTOM's x runs from the BACK, so offset 0 (the FRONT) is at
;;; boardFrom = D - G with boardDir -1; a shelf's x runs from its own FRONT,
;;; so boardFrom = 0 with boardDir +1. BUL's x runs from the FRONT (sideFrom 0,
;;; +1, a shelf's front at its setback); BUR's from the BACK (sideFrom D - G,
;;; -1).
(defun cabineo-joint-table (W D H G fixShelves / sideW topW out k sh row st sb depthS)
  (setq W (float W) D (float D) H (float H) G (float G))
  (setq sideW (- D G)         ;; BUL / BUR: D - G deep; the TOP's and BOTTOM's depth too
        topW  (- W G G))      ;; TOP / BOTTOM / SHELF: the clear light between the sides
  (setq out (list
    ;;             name          len    ref
    ;;             SIDE   from   dir    out   in
    ;;             BOARD  end    at     from  dir    W      T
    (cabineo-joint "BUL-TOP"     sideW  "FRONT"
                   "BUL"    0.0    1.0    H     -1.0
                   "TOP"    "Y0"   0.0    sideW -1.0   sideW  G)
    (cabineo-joint "BUR-TOP"     sideW  "FRONT"
                   "BUR"    sideW  -1.0   H     -1.0
                   "TOP"    "YH"   topW   sideW -1.0   sideW  G)
    (cabineo-joint "BUL-BOTTOM"  sideW  "FRONT"
                   "BUL"    0.0    1.0    0.0   1.0
                   "BOTTOM" "Y0"   0.0    sideW -1.0   sideW  G)
    (cabineo-joint "BUR-BOTTOM"  sideW  "FRONT"
                   "BUR"    sideW  -1.0   0.0   1.0
                   "BOTTOM" "YH"   topW   sideW -1.0   sideW  G)))
  (setq k 1)
  (foreach sh fixShelves
    (setq row (float (car sh)) st (float (cadr sh)) sb (float (caddr sh)))
    (setq depthS (- D G sb))
    (setq out (append out (list
      (cabineo-joint (strcat "BUL-SHELF-" (itoa k)) depthS "FRONT"
                     "BUL" sb 1.0 row 1.0
                     (strcat "SHELF-" (itoa k)) "Y0" 0.0 0.0 1.0 depthS st)
      (cabineo-joint (strcat "BUR-SHELF-" (itoa k)) depthS "FRONT"
                     "BUR" (- sideW sb) -1.0 row 1.0
                     (strcat "SHELF-" (itoa k)) "YH" topW 0.0 1.0 depthS st))))
    (setq k (1+ k)))
  out)

;;; D.2b THE BACK JOINTS (the owner, 15.10.2026: "plecy tez na cabineo").
;;; The BACK (W x H, x from the LEFT outer face, y up, its INSIDE face) is the
;;; counterpart of four joints; the pocket board's channel runs ALONG ITS X
;;; here (the back end of a side is x = sideW for BUL and x = 0 for BUR, the
;;; back end of the TOP and BOTTOM, drawn ROT90, is x = 0), so a back joint
;;; carries its own fields:
;;;   name, len, ref     as D.1; ref "BOTTOM" (the sides, offsets up y) or
;;;                      "LEFT" (the TOP and BOTTOM, offsets along the back edge)
;;;   hole               "BACK"; the holes stand at (hx0 + hdx off, hy0 + hdy off)
;;;                      with the axis distance already in hx0 / hy0:
;;;                      BUL's pocket face is its inside face at x = G, the axis
;;;                      ax below it toward the outer face: hx0 = G - ax;
;;;                      BUR's: hx0 = W - G + ax; the TOP's pocket face is its
;;;                      top face at y = H: hy0 = H - ax; the BOTTOM's: hy0 = ax
;;;   board, face        the pocket board and the face it is cut from:
;;;                      "inside" for a side, "outside" for the TOP and BOTTOM
;;;   endAt, dirIn       the x of the end the channel opens at, and +1 / -1
;;;   acrossFrom/Dir     the board's y of offset 0 and its direction
;;;   boardW, boardT     as D.1 (the W of the reflection; the thickness)
;;; LENGTHS: a side's joint runs the carcass height H; the TOP's and BOTTOM's
;;; the clear light W - 2G. A WALL UNIT's side stops short of its hanger
;;; (KIT_WUD_FULL.lsp): the engine shortens the side joint to below the hanger
;;; holes (their lowest y less the hole's radius, the pocket's half width and
;;; 5), so a pocket never meets the bracket.
(defun cabineo-back-joint (name len ref hx0 hy0 hdx hdy board face endAt dirIn aFrom aDir bW bT)
  (list
    (cons "name" name) (cons "len" (float len)) (cons "ref" ref) (cons "kind" "back")
    (cons "side" "BACK") (cons "hx0" (float hx0)) (cons "hy0" (float hy0))
    (cons "hdx" (float hdx)) (cons "hdy" (float hdy))
    (cons "board" board) (cons "face" face) (cons "endAt" (float endAt)) (cons "dirIn" (float dirIn))
    (cons "acrossFrom" (float aFrom)) (cons "acrossDir" (float aDir))
    (cons "boardW" (float bW)) (cons "boardT" (float bT))))

;;; The four back joints. ax is the screw axis below the pocket face
;;; (cabineo-axis-from-outside, 5.5 under the owner's skim); sideLen the
;;; sides' joint length (H, or less under a hanger).
(defun cabineo-back-table (W D H G ax sideLen / sideW topW)
  (setq W (float W) D (float D) H (float H) G (float G) ax (float ax))
  (setq sideW (- D G) topW (- W G G))
  (list
    ;;                  name          len      ref      hx0          hy0      hdx  hdy  BOARD    face      endAt  dirIn across  W      T
    (cabineo-back-joint "BUL-BACK"    sideLen  "BOTTOM" (- G ax)     0.0      0.0  1.0  "BUL"    "inside"  sideW  -1.0  0.0 1.0 sideW  G)
    (cabineo-back-joint "BUR-BACK"    sideLen  "BOTTOM" (+ (- W G) ax) 0.0    0.0  1.0  "BUR"    "inside"  0.0    1.0   0.0 1.0 sideW  G)
    (cabineo-back-joint "TOP-BACK"    topW     "LEFT"   G            (- H ax) 1.0  0.0  "TOP"    "outside" 0.0    1.0   0.0 1.0 sideW  G)
    (cabineo-back-joint "BOTTOM-BACK" topW     "LEFT"   G            ax       1.0  0.0  "BOTTOM" "outside" 0.0    1.0   0.0 1.0 sideW  G)))

;;; A back joint's pockets: ((board along xEnd dirIn y W T joint off) ...),
;;; the channel along x from xEnd, the across coordinate y = acrossFrom +
;;; acrossDir * off; and its holes in the BACK: ((BACK "FACE" x y dia depth)).
(defun cabineo-back-pockets (jt offs / out off)
  (foreach off offs
    (setq out (cons (list (cabineo-jget jt "board") "x" (cabineo-jget jt "endAt") (cabineo-jget jt "dirIn")
                          (+ (cabineo-jget jt "acrossFrom") (* (cabineo-jget jt "acrossDir") off))
                          (cabineo-jget jt "boardW") (cabineo-jget jt "boardT") (cabineo-jget jt "name") off)
                    out)))
  (reverse out))
(defun cabineo-back-holes (jt offs prof sheet / out off)
  (foreach off offs
    (setq out (cons (list "BACK" "FACE"
                          (+ (cabineo-jget jt "hx0") (* (cabineo-jget jt "hdx") off))
                          (+ (cabineo-jget jt "hy0") (* (cabineo-jget jt "hdy") off))
                          (cabineo-path sheet (list "counterpartHole" "diaMm"))
                          (cabineo-hole-depth prof sheet))
                    out)))
  (reverse out))
;;; A sheet-frame point (s t) of an x-channel pocket in the board's own frame:
;;; s runs along x from the end, t across along y.
(defun cabineo-back-board-pt (pk s t)
  (list (+ (nth 2 pk) (* (nth 3 pk) (float s))) (+ (nth 4 pk) (float t))))

;;; D.3 THE POCKETS of one joint: one record per offset, on the horizontal
;;; board, in ITS OWN (inside) frame:
;;;   ((board x yEnd dirIn W T joint off) ...)
;;; x is the screw axis (the set-out position along the depth), yEnd the end
;;; the channel opens from, dirIn +1 (into the board, +y, the BUL end) or -1
;;; (the BUR end).
(defun cabineo-pockets (jt offs / out off x dirIn)
  (setq dirIn (if (= (cabineo-jget jt "endName") "Y0") 1.0 -1.0))
  (foreach off offs
    (setq x (+ (cabineo-jget jt "boardFrom") (* (cabineo-jget jt "boardDir") off)))
    (setq out (cons (list (cabineo-jget jt "board") x (cabineo-jget jt "endAt") dirIn
                          (cabineo-jget jt "boardW") (cabineo-jget jt "boardT")
                          (cabineo-jget jt "name") off)
                    out)))
  (reverse out))

;;; A sheet-frame point (s t) of one pocket, in the board's own frame: the
;;; sheet's s (along the board from the end) runs along y into the board, the
;;; sheet's t (across, from the axis) runs along x.
(defun cabineo-board-pt (pk s t)
  (list (+ (nth 1 pk) (float t)) (+ (nth 2 pk) (* (nth 3 pk) (float s)))))

;;; The same point in the EXPORT frame of an "outside" board: reflected.
(defun cabineo-export-pt (pk s t)
  (cabineo-reflect-pt (cabineo-board-pt pk s t) (nth 4 pk)))

;;; D.4 THE LOBE CENTRES in the sheet frame, by the chosen option: three
;;; (s 0) points at 3.6 / 14.8 / 26 (standard) or 3.5 / 14.7 / 25.9 (hpl).
;;; The same three under drill15 (three holes), cutter10 and cutter12 (three
;;; lobes).
(defun cabineo-lobe-centres (opt)
  (cabineo-get opt "lobeCentresFromEndMm"))
(defun cabineo-lobe-radius (opt)
  (/ (cabineo-get opt "lobeDiaMm") 2.0))

;;; D.5 THE OUTLINE'S KEY POINTS in the sheet frame, in order round the pocket
;;; from the end's upper corner to the end's lower corner (the end itself,
;;; s = 0, is open: the channel runs out of the board). Each point is (s t).
;;;   drill15   nil: three circles, no single outline (cabineo-lobe-centres)
;;;   cutter10  (0 6.6) (3.6 7.5) (9.2 5) (14.8 7.5) (20.4 5) (26 7.5) (33.5 0)
;;;             and the mirror below the axis; between two points the outline
;;;             follows the lobe circle it is on
;;;   cutter12  (0 6.6) (3.6 7.5) (8.1 6) (10.3 6) (14.8 7.5) (19.3 6) (21.5 6)
;;;             (26 7.5) (33.5 0) and the mirror; from 8.1 to 10.3 and from
;;;             19.3 to 21.5 the outline is the channel's STRAIGHT (12 high,
;;;             the reliefs), elsewhere the lobe circle
;;; 33.5 = 26 + 7.5 is DERIVED (the pocket's far end).
(defun cabineo-outline-key-points (opt machining / c c1 c2 c3 r he far w1 w2 hw hc rl r1s r1e r2s r2e)
  (setq c (cabineo-lobe-centres opt))
  (setq c1 (nth 0 c) c2 (nth 1 c) c3 (nth 2 c))
  (setq r (cabineo-lobe-radius opt))
  (setq far (+ c3 r))
  (setq he (cabineo-get opt "halfHeightAtEndMm"))
  (cond
    ((= machining "drill15") nil)
    ((= machining "cutter10")
      (setq w1 (nth 0 (cabineo-get opt "waistsFromEndMm"))
            w2 (nth 1 (cabineo-get opt "waistsFromEndMm"))
            hw (cabineo-get opt "halfHeightAtWaistMm"))
      (list (list 0.0 he) (list c1 r) (list w1 hw) (list c2 r) (list w2 hw) (list c3 r) (list far 0.0)
            (list c3 (- r)) (list w2 (- hw)) (list c2 (- r)) (list w1 (- hw)) (list c1 (- r)) (list 0.0 (- he))))
    ((= machining "cutter12")
      (setq hc (cabineo-get opt "halfHeightAtChannelMm"))
      (setq rl (cabineo-get opt "reliefs"))
      (setq r1s (car (nth 0 rl)) r1e (+ (car (nth 0 rl)) (cadr (nth 0 rl)))
            r2s (car (nth 1 rl)) r2e (+ (car (nth 1 rl)) (cadr (nth 1 rl))))
      (list (list 0.0 he) (list c1 r) (list r1s hc) (list r1e hc) (list c2 r) (list r2s hc) (list r2e hc)
            (list c3 r) (list far 0.0)
            (list c3 (- r)) (list r2e (- hc)) (list r2s (- hc)) (list c2 (- r)) (list r1e (- hc)) (list r1s (- hc))
            (list c1 (- r)) (list 0.0 (- he))))
    (T nil)))

;;; The pocket's bounding box in the sheet frame: (s1 t1 s2 t2) = (0 -r far r).
(defun cabineo-outline-box (opt / c3 r)
  (setq c3 (nth 2 (cabineo-lobe-centres opt)) r (cabineo-lobe-radius opt))
  (list 0.0 (- r) (+ c3 r) r))

;;; D.6 THE ARCS AND LINES of the milled outline (cutter10 / cutter12), in the
;;; sheet frame, for CABINEO_DRAW and for the engine's DXF: each arc is
;;; (centre start mid end), each a point (s t); mid is the point the arc passes
;;; through, so the direction is decided by three points in whatever frame
;;; the arc lands in (the board frame swaps the axes and the export frame
;;; reflects, each turning CCW into CW). Lines are (start end). Returns
;;; (arcs lines).
(defun cabineo-outline-arcs (opt machining / c c1 c2 c3 r he far a b hc arcs lines)
  (setq c (cabineo-lobe-centres opt))
  (setq c1 (nth 0 c) c2 (nth 1 c) c3 (nth 2 c))
  (setq r (cabineo-lobe-radius opt))
  (setq far (+ c3 r))
  (setq he (cabineo-get opt "halfHeightAtEndMm"))
  (cond
    ((= machining "cutter10")
      ;; a = (w1 w1): the first waist starts and ends the straight (none); b likewise
      (setq a (list (nth 0 (cabineo-get opt "waistsFromEndMm")) (nth 0 (cabineo-get opt "waistsFromEndMm")))
            b (list (nth 1 (cabineo-get opt "waistsFromEndMm")) (nth 1 (cabineo-get opt "waistsFromEndMm")))
            hc (cabineo-get opt "halfHeightAtWaistMm")))
    ((= machining "cutter12")
      (setq a (list (car (nth 0 (cabineo-get opt "reliefs")))
                    (+ (car (nth 0 (cabineo-get opt "reliefs"))) (cadr (nth 0 (cabineo-get opt "reliefs")))))
            b (list (car (nth 1 (cabineo-get opt "reliefs")))
                    (+ (car (nth 1 (cabineo-get opt "reliefs"))) (cadr (nth 1 (cabineo-get opt "reliefs")))))
            hc (cabineo-get opt "halfHeightAtChannelMm"))))
  (if a
    (progn
      (setq arcs (list
        ;; lobe 1, upper: from the end's corner over the apex to the first straight
        (list (list c1 0.0) (list 0.0 he) (list c1 r) (list (car a) hc))
        ;; lobe 1, lower
        (list (list c1 0.0) (list 0.0 (- he)) (list c1 (- r)) (list (car a) (- hc)))
        ;; lobe 2, upper and lower: between the two straights
        (list (list c2 0.0) (list (cadr a) hc) (list c2 r) (list (car b) hc))
        (list (list c2 0.0) (list (cadr a) (- hc)) (list c2 (- r)) (list (car b) (- hc)))
        ;; lobe 3: round the far end, from the upper straight to the lower
        (list (list c3 0.0) (list (cadr b) hc) (list far 0.0) (list (cadr b) (- hc)))))
      (if (> (- (cadr a) (car a)) 1e-9)
        (setq lines (list
          (list (list (car a) hc) (list (cadr a) hc))
          (list (list (car a) (- hc)) (list (cadr a) (- hc)))
          (list (list (car b) hc) (list (cadr b) hc))
          (list (list (car b) (- hc)) (list (cadr b) (- hc))))))))
  (list arcs lines))

;;; D.7 THE RECESS (the collar's under flush, the cap's under flushCap), in the
;;; sheet frame: (width length endRadius endCentre depth), nil where the
;;; mounting draws none. Under flushCap: 18.8 wide, 35.65 long, the end a
;;; semicircle r 9.4 centred 26.25 from the end, 2.1 deep. Under flush the
;;; sheet prints the width (16.7) and the depth (0.8) only; the sheet's own
;;; reading of its Options 1 to 3 (cabineo.json recessOutline.reading) is
;;; "the collar recess around the three lobes with a rounded end concentric
;;; with the third lobe", so the rest is DERIVED from that sentence: the end
;;; radius is half the width (8.35), the end centre is the third lobe's centre
;;; (26 standard, 25.9 hpl) and the length is the two added (34.35). The depth
;;; is the owner's skim where he names one (cabineo-recess-depth: 0.5,
;;; 15.10.2026). This is THE SKIM LAYER, CABINEO_RECESS, the owner's second of
;;; three; before 15.10.2026 the flush recess drew no outline and the owner's
;;; machine had nothing to skim with.
(defun cabineo-recess (prof sheet / m o d w c3)
  (setq m (cabineo-mounting prof sheet) d (cabineo-recess-depth prof sheet))
  (cond
    ((null d) nil)
    ((cabineo-get m "recessLengthMm")
      (list (cabineo-get m "recessWidthMm") (cabineo-get m "recessLengthMm")
            (cabineo-get m "recessEndRadiusMm") (cabineo-get m "recessEndCentreFromEndMm") d))
    ((cabineo-get m "recessWidthMm")
      (setq o (cabineo-option prof sheet) w (cabineo-get m "recessWidthMm") c3 (nth 2 (cabineo-lobe-centres o)))
      (list w (+ c3 (/ w 2.0)) (/ w 2.0) c3 d))   ;; DERIVED: concentric with the third lobe
    (T (list nil nil nil nil d))))

;;; The recess's bounding box in the sheet frame, or nil when its length is
;;; not on the sheet: (0 -w/2 length w/2).
(defun cabineo-recess-box (rc)
  (if (and rc (nth 1 rc))
    (list 0.0 (- (/ (nth 0 rc) 2.0)) (nth 1 rc) (/ (nth 0 rc) 2.0))
    nil))

;;; D.8 THE SIDE'S HOLES of one joint: dia 5, in the side's FACE (inside), on
;;; the joint line at the screw axis: y = sideOut + sideIn * axisFromOutside.
;;; Depth: NOT ON THE SHEET. The screw reaches X beyond the board's end
;;; (8 / 12 / 8), so the hole is at least that deep; a dealer's technical sheet
;;; (cnc-tool.com, Lamello Cabineo technical) prints "drill hole dia 5 x 12"
;;; for Cabineo 12 and "dia 5 x 8" for Cabineo 8, which is X itself. So the
;;; depth is the profile's holeDepthMm when the owner names one, else X
;;; (DERIVED, cabineo-hole-depth; the owner, 15.10.2026: "nie pamietam
;;; jakie"). Returns ((side "FACE" x y dia depth) ...), in offset order.
(defun cabineo-hole-depth (prof sheet / v)
  (setq v (cabineo-variant prof sheet))
  (cond
    ((cabineo-get prof "holeDepthMm") (cabineo-get prof "holeDepthMm"))
    ((cabineo-path sheet (list "counterpartHole" "depthMm")) (cabineo-path sheet (list "counterpartHole" "depthMm")))
    (v (cabineo-get v "screwReachXMm"))
    (T nil)))
(defun cabineo-side-holes (jt offs prof sheet / dia ax y out off x dp)
  (setq dia (cabineo-path sheet (list "counterpartHole" "diaMm"))
        ax  (cabineo-axis-from-outside prof sheet)
        dp  (cabineo-hole-depth prof sheet)
        y   (+ (cabineo-jget jt "sideOut") (* (cabineo-jget jt "sideIn") ax)))
  (foreach off offs
    (setq x (+ (cabineo-jget jt "sideFrom") (* (cabineo-jget jt "sideDir") off)))
    (setq out (cons (list (cabineo-jget jt "side") "FACE" x y dia dp) out)))
  (reverse out))

;;; One joint, whole: (offsets pockets sideHoles).
(defun cabineo-joint-cuts (jt prof sheet / offs)
  (setq offs (cabineo-positions (cabineo-jget jt "len")
                                (cabineo-get prof "endOffsetMm")
                                (cabineo-get prof "pitchMm")
                                (cabineo-get prof "minPerJoint")
                                (cabineo-pocket-width prof sheet)))
  (list offs (cabineo-pockets jt offs) (cabineo-side-holes jt offs prof sheet)))

;;; D.9 THE LAYERS (T78 proposed, the house grammar {FEATURE}_{DIAMETER}MM;
;;; the engine names them in engine/cnc/layers.js): the pocket by the tool
;;; that cuts it, the recess, the side's hole.
(defun cabineo-pocket-layer (prof)
  (cond
    ((= (cabineo-get prof "machining") "drill15") "CABINEO_POCKET_15MM")
    ((= (cabineo-get prof "machining") "cutter10") "CABINEO_POCKET_10MM")
    (T "CABINEO_POCKET_12MM")))
(defun cabineo-recess-layer ( / ) "CABINEO_RECESS")
(defun cabineo-hole-layer ( / ) "CABINEO_HOLE_5MM")

;;;========================================
;;; E. THE GATE AND THE REFUSALS
;;;========================================
;;; THE GATE: nil when the owner has confirmed the pattern, else the sentence.
(defun cabineo-gate (prof)
  (if (cabineo-get prof "confirmed")
    nil
    "the Cabineo pattern is proposed, not confirmed by the owner"))

;;; A profile that cannot make a sound joint, refused in words before any
;;; pattern is used. sideT and boardT are the thinnest side and the thinnest
;;; horizontal board the job uses. Returns a list of sentences, or nil.
(defun cabineo-refusal (prof sheet sideT boardT / v m o p e nMin out x pd ms)
  (setq v (cabineo-variant prof sheet) m (cabineo-mounting prof sheet) o (cabineo-option prof sheet)
        p (cabineo-get prof "pitchMm") e (cabineo-get prof "endOffsetMm") nMin (cabineo-get prof "minPerJoint")
        ms (cabineo-get prof "minSkinMm"))
  (setq sideT (float sideT) boardT (float boardT))
  (if (null v)
    (setq out (cons (strcat "the Cabineo variant '" (cabineo-get prof "variant") "' is not on the sheet (8, 12, 8M6)") out)))
  (if (and v (not (member (cabineo-get prof "variant") (list "8" "12"))))
    (setq out (cons (strcat "Cabineo " (cabineo-get prof "variant") " is not a company default: the owner chose 8 and 12") out)))
  (if (null m)
    (setq out (cons (strcat "the mounting '" (cabineo-get prof "mounting") "' is not on the sheet (surface, flush, flushCap, hpl)") out)))
  (if (and m v (not (member (cabineo-get prof "variant") (cabineo-get m "variants"))))
    (setq out (cons (strcat "the sheet captions the mounting '" (cabineo-get prof "mounting") "' for other variants than Cabineo "
                            (cabineo-get prof "variant")) out)))
  (if (null o)
    (setq out (cons (strcat "the machining option '" (cabineo-get prof "machining") "' is not on the sheet (drill15, cutter10, cutter12)") out)))
  (if (<= p 0.0)
    (setq out (cons (strcat "the pitch " (rtos p 2 2) " is not a positive length") out)))
  (if (> p (cabineo-get prof "maxSpacingMm"))
    (setq out (cons (strcat "the pitch " (rtos p 2 2) " is over the sheet's max. " (rtos (cabineo-get prof "maxSpacingMm") 2 2)
                            " between connectors (page 1, Assembly panel 1)") out)))
  (if (< e (cabineo-get prof "minFromEdgeMm"))
    (setq out (cons (strcat "the end offset " (rtos e 2 2) " is under the sheet's min. " (rtos (cabineo-get prof "minFromEdgeMm") 2 2)
                            " from the board's edge (page 1, Assembly panel 1)") out)))
  (if (< nMin 2)
    (setq out (cons (strcat "fewer than two pockets per joint: CLAUDE.md T78 F20 says never fewer than two, the profile says " (itoa (fix nMin))) out)))
  (if (and v (< sideT (cabineo-get v "minCounterpartMm")))
    (setq out (cons (strcat "Cabineo " (cabineo-get prof "variant") " needs the panel that takes the screw at least "
                            (rtos (cabineo-get v "minCounterpartMm") 2 2) " thick (page 1, Applications); the side is " (rtos sideT 2 2)) out)))
  (if (and v (< boardT (cabineo-get v "minConnectorBoardMm")))
    (setq out (cons (strcat "the board that carries the connector must be at least "
                            (rtos (cabineo-get v "minConnectorBoardMm") 2 2) " thick (page 1, Applications); it is " (rtos boardT 2 2)) out)))
  (if (and v (>= (cabineo-get v "screwReachXMm") sideT))
    (setq out (cons (strcat "the screw reaches X = " (rtos (cabineo-get v "screwReachXMm") 2 2) " into a side only " (rtos sideT 2 2) " thick") out)))
  (if m
    (progn
      (setq pd (cabineo-get m "pocketDepthMm"))
      (if (>= pd boardT)
        (setq out (cons (strcat "a pocket " (rtos pd 2 2) " deep would break through a " (rtos boardT 2 2) " board") out)))
      (if (and (< pd boardT) (< (- boardT pd) ms))
        (setq out (cons (strcat "a pocket " (rtos pd 2 2) " deep leaves less than " (rtos ms 2 2) " under it in a " (rtos boardT 2 2) " board") out)))))
  (reverse out))

;;;========================================
;;; F. WHAT A CABINEO JOINT REPLACES, AND THE BOM
;;;========================================
;;; On a joint switched to Cabineo, BOTH boards lose that joint's puzzle whole:
;;;   the tenons on the horizontal board's ends (the end goes back to a
;;;   straight line), the sockets in the side's top and bottom edges and their
;;;   two dia 7.5 holes (PUZZLE_HOLES_7_5MM), the dog bones, and the joint's
;;;   own dia 3 assembly screw row (SCREWS_3MM) on the side: the end pockets
;;;   stand at 50 on the joint line and the screws at 50, middle, L - 50 on the
;;;   centre line G / 2, 1.9 apart on an 18 board, and one system per joint.
;;; On the FIX shelf to side joint the biscuit marks and the side's through
;;; screws go the same way. THE BACK JOINT goes whole too (the owner,
;;; 15.10.2026, head of this file): the sides' back tenons and their dog bones
;;; (the side is a plain D - G x H), the TOP's and BOTTOM's back tenons and
;;; dog bones (a plain D - G x W - 2G with plain ends and a plain back edge),
;;; the BACK's sockets, their dia 7.5 holes AND drawBACK's dia 3 screw rows
;;; (a plain W x H); the four back joints of D.2b take their place. A wall
;;; unit's BACK keeps its hanger cut-outs. What is NOT a joint
;;; stays exactly as it is: hinge plate holes, shelf pin ladders, runner
;;; holes, the FIX shelf's dia 3 row through the BACK into its back edge, and
;;; everything on the fronts.
;;;
;;; THE BOM. A connector per pocket (the variant's label; its article is NOT
;;; on the sheet: CLAUDE.md T78 F20 names 186310 for Cabineo 8 "as the sheet's
;;; page 1 names it" and page 1 does not name it, so the article is nil and
;;; the owner supplies it); a cover cap per pocket under `caps = "all"` (T78
;;; proposed: the top's and bottom's pockets are hidden under the worktop and
;;; in the plinth void, the owner may want no cap there) or per FIX shelf
;;; pocket under `caps = "shelves"` (the owner's own words name the cap on the
;;; shelf: "a fixed shelf from its underside (with the cap)"); the cap's
;;; article is NOT on the sheet either. Under 8M6 an insert per pocket (12.3,
;;; article nil). The screw comes with the connector (the sheet's captions
;;; name it as the connector's own) and is no line of its own.
;;; Returns ((label article qty note) ...).
(defun cabineo-bom-lines (prof sheet nPockets nShelfPockets / v out capQty)
  (setq v (cabineo-variant prof sheet))
  (setq capQty (if (= (cabineo-get prof "caps") "shelves") nShelfPockets nPockets))
  (setq out (list
    (list (cabineo-get v "label") (cabineo-get v "article") nPockets
          "connector with its screw; article not on the sheet, owner to supply")
    (list "Cabineo cover cap" (cabineo-path sheet (list "cap" "article")) capQty
          (if (= (cabineo-get prof "caps") "shelves")
            "caps on the fixed shelves' pockets only (the owner: with the cap)"
            "a cap on every pocket, T78 proposed; article not on the sheet, owner to supply"))))
  (if (= (cabineo-get prof "variant") "8M6")
    (setq out (append out (list (list "Cabineo 8 M6 insert 12.3" nil nPockets "the threaded insert; article not on the sheet")))))
  out)

;;;========================================
;;; G. THE COMMANDS
;;;========================================
;;; Prints a number, or "not on the sheet" for nil.
(defun cabineo-num (v)
  (if v (rtos v 2 2) "not on the sheet"))

;;; Prints a point.
(defun cabineo-pt (pt)
  (strcat "(" (rtos (car pt) 2 2) ", " (rtos (cadr pt) 2 2) ")"))

;;; Prints one pocket: its axis and end in the board's own frame, the lobe
;;; centres and the boxes in that frame AND in the export (reflected) frame.
(defun cabineo-print-pocket (pk prof sheet / opt mch c r box rc rbox bx1 bx2 by1 by2 ex1 ex2)
  (setq opt (cabineo-option prof sheet) mch (cabineo-get prof "machining"))
  (setq c (cabineo-lobe-centres opt) r (cabineo-lobe-radius opt))
  (princ (strcat "\n    " (nth 0 pk) " POCKET  axis x=" (rtos (nth 1 pk) 2 2)
                 "  end y=" (rtos (nth 2 pk) 2 2) (if (> (nth 3 pk) 0.0) " (BUL end, into +y)" " (BUR end, into -y)")
                 "  offset " (rtos (nth 7 pk) 2 2) " from the FRONT"))
  (princ "\n      lobes (own frame):")
  (foreach s c (princ (strcat " " (cabineo-pt (cabineo-board-pt pk s 0.0)))))
  (princ (strcat "  dia " (rtos (* 2.0 r) 2 2)))
  (princ "\n      lobes (export, x' = W - x):")
  (foreach s c (princ (strcat " " (cabineo-pt (cabineo-export-pt pk s 0.0)))))
  (setq box (cabineo-outline-box opt))
  (setq bx1 (- (nth 1 pk) (nth 3 box)) bx2 (+ (nth 1 pk) (nth 3 box)))
  (princ (strcat "\n      pocket box (own): x " (rtos bx1 2 2) " to " (rtos bx2 2 2)
                 ", y " (rtos (cadr (cabineo-board-pt pk (nth 0 box) 0.0)) 2 2)
                 " to " (rtos (cadr (cabineo-board-pt pk (nth 2 box) 0.0)) 2 2)
                 "  (export: x' " (rtos (cabineo-reflect-x bx2 (nth 4 pk)) 2 2) " to " (rtos (cabineo-reflect-x bx1 (nth 4 pk)) 2 2) ")"
                 "  depth " (rtos (cabineo-get (cabineo-mounting prof sheet) "pocketDepthMm") 2 2) " from the OUTSIDE face"))
  (setq rc (cabineo-recess prof sheet) rbox (cabineo-recess-box rc))
  (if rbox
    (progn
      (setq ex1 (- (nth 1 pk) (nth 3 rbox)) ex2 (+ (nth 1 pk) (nth 3 rbox)))
      (princ (strcat "\n      recess box (own): x " (rtos ex1 2 2) " to " (rtos ex2 2 2)
                     ", y " (rtos (cadr (cabineo-board-pt pk 0.0 0.0)) 2 2)
                     " to " (rtos (cadr (cabineo-board-pt pk (nth 2 rbox) 0.0)) 2 2)
                     "  (export: x' " (rtos (cabineo-reflect-x ex2 (nth 4 pk)) 2 2) " to " (rtos (cabineo-reflect-x ex1 (nth 4 pk)) 2 2) ")"
                     "  depth " (rtos (nth 4 rc) 2 2) "  end r " (cabineo-num (nth 2 rc)) " centred " (cabineo-num (nth 3 rc)) " from the end")))
    (if rc
      (princ (strcat "\n      recess: " (rtos (nth 0 rc) 2 2) " wide, " (rtos (nth 4 rc) 2 2) " deep; its length is not on the sheet"))))
  (princ (strcat "\n      screw axis " (rtos (cabineo-axis-from-outside prof sheet) 2 2) " below the OUTSIDE face ("
                 (rtos (- (nth 5 pk) (cabineo-axis-from-outside prof sheet)) 2 2) " above the inside face); machining " mch)))

;;; Prints one side hole.
(defun cabineo-print-hole (h)
  (princ (strcat "\n    " (nth 0 h) " " (nth 1 h) "  x=" (rtos (nth 2 h) 2 2) " y=" (rtos (nth 3 h) 2 2)
                 "  dia=" (rtos (nth 4 h) 2 2) " depth=" (cabineo-num (nth 5 h)))))

;;; The cabinet prompts shared by both commands: (W D H G fixList).
(defun cabineo-ask-cabinet ( / W D H G nFix i spacing fixList)
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
  (list W D H G fixList))

;;; The variant prompt: 8 or 12 (the company's two). Returns the profile with it.
(defun cabineo-ask-profile ( / prof v)
  (setq prof (cabineo-profile))
  (initget "8 12")
  (setq v (getkword "\nCabineo variant [8/12] <12>: "))
  (if (null v) (setq v "12"))
  (subst (cons "variant" v) (assoc "variant" prof) prof))

;;; CABINEO_JOINTS: the pattern for a cabinet W D H G, at the profile's numbers.
;;; Defaults are KIT_BUD_FULL's own (600, 558, 770, 18). FIX shelves, if any,
;;; stand at KIT_BUD's even shelf spacing, G thick, 20 behind the front.
(defun c:CABINEO_JOINTS ( / prof sheet cab W D H G fixList gate bad why table jt res offs
                            total totalShelf o pk h line)
  (setq prof (cabineo-ask-profile) sheet (cabineo-sheet))
  (setq cab (cabineo-ask-cabinet))
  (setq W (nth 0 cab) D (nth 1 cab) H (nth 2 cab) G (nth 3 cab) fixList (nth 4 cab))
  (princ (strcat "\nCABINEO " (cabineo-get prof "variant") "  mounting " (cabineo-get prof "mounting")
                 "  machining " (cabineo-get prof "machining")
                 "  pitch " (rtos (cabineo-get prof "pitchMm") 2 2) "  end offset " (rtos (cabineo-get prof "endOffsetMm") 2 2)
                 "  (sheet: min. " (rtos (cabineo-get prof "minFromEdgeMm") 2 2) " from the edge, max. "
                 (rtos (cabineo-get prof "maxSpacingMm") 2 2) " apart)  every number owner to confirm"))
  (setq gate (cabineo-gate prof))
  (if gate (princ (strcat "\nGATE: " gate ". No machine file may carry these pockets.")))
  (setq bad (cabineo-refusal prof sheet G G))
  (if bad
    (foreach why bad (princ (strcat "\nREFUSED: " why)))
    (progn
      (setq table (cabineo-joint-table W D H G fixList))
      (setq total 0 totalShelf 0)
      (foreach jt table
        (setq res (cabineo-joint-cuts jt prof sheet))
        (setq offs (car res))
        (setq total (+ total (length offs)))
        (if (wcmatch (cabineo-jget jt "board") "SHELF*") (setq totalShelf (+ totalShelf (length offs))))
        (princ (strcat "\n" (cabineo-jget jt "name") "  L=" (rtos (cabineo-jget jt "len") 2 2)
                       "  from " (cabineo-jget jt "ref") "  pockets " (itoa (length offs))
                       "  board " (cabineo-jget jt "board") " machinedFace " (cabineo-machined-face (cabineo-jget jt "board"))
                       " " (cabineo-face-label (cabineo-jget jt "board"))
                       "  W(reflection)=" (rtos (cabineo-jget jt "boardW") 2 2)))
        (if (cabineo-too-close offs (cabineo-pocket-width prof sheet))
          (princ (strcat "\n  REFUSED: two pockets on " (cabineo-jget jt "name") " stand closer than the pocket's width")))
        (princ "\n  offsets:")
        (foreach o offs (princ (strcat " " (rtos o 2 2))))
        (foreach pk (cadr res) (cabineo-print-pocket pk prof sheet))
        (foreach h (caddr res) (cabineo-print-hole h)))
      (princ (strcat "\nPOCKETS: " (itoa total) " (each one pocket in a horizontal board's OUTSIDE face and one dia 5 hole in a side's inside face)"))
      (princ "\nBOM:")
      (foreach line (cabineo-bom-lines prof sheet total totalShelf)
        (princ (strcat "\n    " (nth 0 line) "  x" (itoa (nth 2 line)) "  article "
                       (if (nth 1 line) (nth 1 line) "owner to supply") "  (" (nth 3 line) ")")))))
  (princ))

;;; G.2 THE DRAWING COMMAND. Draws every board of the cabinet, side by side
;;; from a picked base point, each in the frame it is EXPORTED in: the TOP,
;;; the BOTTOM and the FIX shelves OUTSIDE FACE UP (the reflected frame) with
;;; their pockets and recesses, the sides as today with their dia 5 holes. The
;;; gate is printed; the drawing is for the owner's eye, not a machine file.
(defun cab-layer (name colour / )
  (if (null (tblsearch "LAYER" name))
    (command "._LAYER" "_N" name "_C" colour name "")))
(defun cab-line (layer p1 p2 / )
  (entmake (list '(0 . "LINE") '(100 . "AcDbEntity") (cons 8 layer) '(100 . "AcDbLine")
                 (cons 10 (list (car p1) (cadr p1) 0.0)) (cons 11 (list (car p2) (cadr p2) 0.0)))))
(defun cab-rect (layer x1 y1 x2 y2 / )
  (cab-line layer (list x1 y1) (list x2 y1))
  (cab-line layer (list x2 y1) (list x2 y2))
  (cab-line layer (list x2 y2) (list x1 y2))
  (cab-line layer (list x1 y2) (list x1 y1)))
(defun cab-circle (layer cx cy r / )
  (entmake (list '(0 . "CIRCLE") '(100 . "AcDbEntity") (cons 8 layer) '(100 . "AcDbCircle")
                 (cons 10 (list cx cy 0.0)) (cons 40 r))))
(defun cab-text (layer x y h txt / )
  (entmake (list '(0 . "TEXT") '(100 . "AcDbEntity") (cons 8 layer) '(100 . "AcDbText")
                 (cons 10 (list x y 0.0)) (cons 40 h) (cons 1 txt) '(100 . "AcDbText"))))
;;; An arc through three points (start, mid, end) about a known centre: the
;;; direction is read off the mid point, so the arc is right in any frame.
(defun cab-arc3 (layer c p1 pm p2 / r a1 am a2 two sweep sweepM)
  (setq r (distance c p1))
  (setq a1 (angle c p1) am (angle c pm) a2 (angle c p2))
  (setq two (* 2.0 pi))
  (setq sweep (- a2 a1))
  (if (< sweep 0.0) (setq sweep (+ sweep two)))
  (setq sweepM (- am a1))
  (if (< sweepM 0.0) (setq sweepM (+ sweepM two)))
  (if (> sweepM sweep)
    (entmake (list '(0 . "ARC") '(100 . "AcDbEntity") (cons 8 layer) '(100 . "AcDbCircle")
                   (cons 10 (list (car c) (cadr c) 0.0)) (cons 40 r) '(100 . "AcDbArc")
                   (cons 50 a2) (cons 51 a1)))
    (entmake (list '(0 . "ARC") '(100 . "AcDbEntity") (cons 8 layer) '(100 . "AcDbCircle")
                   (cons 10 (list (car c) (cadr c) 0.0)) (cons 40 r) '(100 . "AcDbArc")
                   (cons 50 a1) (cons 51 a2)))))

;;; Shift a point by a base.
(defun cab-at (base pt)
  (list (+ (car base) (car pt)) (+ (cadr base) (cadr pt))))

;;; Draw one pocket (and its recess) of an "outside" board at base, in the
;;; EXPORT frame: every sheet point goes through cabineo-export-pt.
(defun cabineo-draw-pocket (base pk prof sheet / opt mch lay c r s rc arcs lines a ln)
  (setq opt (cabineo-option prof sheet) mch (cabineo-get prof "machining") lay (cabineo-pocket-layer prof))
  (setq c (cabineo-lobe-centres opt) r (cabineo-lobe-radius opt))
  (if (= mch "drill15")
    (foreach s c
      (cab-circle lay (car (cab-at base (cabineo-export-pt pk s 0.0))) (cadr (cab-at base (cabineo-export-pt pk s 0.0))) r))
    (progn
      (setq arcs (car (cabineo-outline-arcs opt mch)) lines (cadr (cabineo-outline-arcs opt mch)))
      (foreach a arcs
        (cab-arc3 lay
                  (cab-at base (cabineo-export-pt pk (car (nth 0 a)) (cadr (nth 0 a))))
                  (cab-at base (cabineo-export-pt pk (car (nth 1 a)) (cadr (nth 1 a))))
                  (cab-at base (cabineo-export-pt pk (car (nth 2 a)) (cadr (nth 2 a))))
                  (cab-at base (cabineo-export-pt pk (car (nth 3 a)) (cadr (nth 3 a))))))
      (foreach ln lines
        (cab-line lay
                  (cab-at base (cabineo-export-pt pk (car (nth 0 ln)) (cadr (nth 0 ln))))
                  (cab-at base (cabineo-export-pt pk (car (nth 1 ln)) (cadr (nth 1 ln))))))))
  (setq rc (cabineo-recess prof sheet))
  (if (and rc (nth 1 rc) (nth 2 rc) (nth 3 rc))
    (progn
      ;; the two long sides of the recess, from the end to the semicircle's centre
      (cab-line (cabineo-recess-layer)
                (cab-at base (cabineo-export-pt pk 0.0 (/ (nth 0 rc) 2.0)))
                (cab-at base (cabineo-export-pt pk (nth 3 rc) (/ (nth 0 rc) 2.0))))
      (cab-line (cabineo-recess-layer)
                (cab-at base (cabineo-export-pt pk 0.0 (- (/ (nth 0 rc) 2.0))))
                (cab-at base (cabineo-export-pt pk (nth 3 rc) (- (/ (nth 0 rc) 2.0)))))
      ;; the semicircle round the far end
      (cab-arc3 (cabineo-recess-layer)
                (cab-at base (cabineo-export-pt pk (nth 3 rc) 0.0))
                (cab-at base (cabineo-export-pt pk (nth 3 rc) (/ (nth 0 rc) 2.0)))
                (cab-at base (cabineo-export-pt pk (nth 1 rc) 0.0))
                (cab-at base (cabineo-export-pt pk (nth 3 rc) (- (/ (nth 0 rc) 2.0))))))))

;;; CABINEO_DRAW: the boards of a cabinet, machined, each in its export frame.
(defun c:CABINEO_DRAW ( / prof sheet cab W D H G fixList gate bad why base table jt res pk h
                          boards b bw bh bx cur name k sideW topW gap)
  (setq prof (cabineo-ask-profile) sheet (cabineo-sheet))
  (setq cab (cabineo-ask-cabinet))
  (setq W (nth 0 cab) D (nth 1 cab) H (nth 2 cab) G (nth 3 cab) fixList (nth 4 cab))
  (setq gate (cabineo-gate prof))
  (if gate (princ (strcat "\nGATE: " gate ". This drawing is for the eye, not a machine file.")))
  (setq bad (cabineo-refusal prof sheet G G))
  (if bad
    (foreach why bad (princ (strcat "\nREFUSED: " why)))
    (progn
      (setq base (getpoint "\nBase point: "))
      (if (null base) (setq base (list 0.0 0.0)))
      (cab-layer "OUTLINE" "7")
      (cab-layer "UNIT_NUMBER" "94")
      (cab-layer (cabineo-pocket-layer prof) "30")
      (cab-layer (cabineo-recess-layer) "32")
      (cab-layer (cabineo-hole-layer) "150")
      (setq sideW (- D G) topW (- W G G) gap 100.0)
      ;; The boards and their drawn sizes (w h), in export order.
      (setq boards (list (list "BUL" sideW H) (list "BUR" sideW H) (list "TOP" sideW topW) (list "BOTTOM" sideW topW)))
      (setq k 1)
      (foreach b fixList
        (setq boards (append boards (list (list (strcat "SHELF-" (itoa k)) (- D G (caddr b)) topW))))
        (setq k (1+ k)))
      (setq table (cabineo-joint-table W D H G fixList))
      (setq bx (car base))
      (foreach b boards
        (setq name (car b) bw (cadr b) bh (caddr b))
        (setq cur (list bx (cadr base)))
        (cab-rect "OUTLINE" bx (cadr base) (+ bx bw) (+ (cadr base) bh))
        (cab-text "UNIT_NUMBER" (+ bx 10.0) (+ (cadr base) bh 15.0) 12.0
                  (strcat name "  " (rtos bw 2 0) " x " (rtos bh 2 0) "  " (cabineo-face-label name)))
        (foreach jt table
          (setq res (cabineo-joint-cuts jt prof sheet))
          (if (= (cabineo-jget jt "board") name)
            (foreach pk (cadr res) (cabineo-draw-pocket cur pk prof sheet)))
          (if (= (cabineo-jget jt "side") name)
            (foreach h (caddr res)
              (cab-circle (cabineo-hole-layer) (+ bx (nth 2 h)) (+ (cadr base) (nth 3 h)) (/ (nth 4 h) 2.0)))))
        (setq bx (+ bx bw gap)))))
  (princ))

;;;========================================
;;; H. NUMBERS: a BUD 600 x 770 x 558, G 18, Cabineo 12, flushCap, cutter12
;;;========================================
;;; Computed BY HAND, 11.10.2026, from the sheet's numbers of section A and the
;;; owner's law of section C, for the cutter12 / flushCap OPTION (the T78
;;; proposal; since 15.10.2026 an option a profile may still choose, not the
;;; default). The engine mirrors these to the decimal when asked for that
;;; option. THE GOLDENS golden-cabineo8-bud.json and golden-cabineo12-bud.json
;;; hold the owner's own setup of H.0 below since 15.10.2026, not this block.
;;;
;;; H.0 THE OWNER'S SETUP (15.10.2026): the same BUD, machining drill15,
;;; mounting flush, skim 0.5, Cabineo 12. The set-out, the joints, the frames
;;; and the reflection are exactly those of the block below (the option does
;;; not move an axis); only the cuts on each axis change:
;;;   TOP / BOTTOM, own frame, each axis x = 490 270 50, BUL end at y = 0:
;;;     CABINEO_POCKET_15MM   three dia 15 holes at (x, 3.6) (x, 14.8) (x, 26),
;;;                           11.5 deep from the OUTSIDE face (flush band)
;;;     CABINEO_RECESS        the skim: 16.7 wide (x -/+ 8.35), y 0 .. 34.35,
;;;                           semicircle r 8.35 centred (x, 26), 0.5 deep
;;;     no polygon pocket (drill15 draws none)
;;;     BUR end (y = 564): (x, 560.4) (x, 549.2) (x, 538); skim y 529.65 .. 564
;;;   EXPORT (OUTSIDE FACE UP), x' = 540 - x: the same three axes 50 270 490
;;;   BUL / BUR, inside face:
;;;     CABINEO_HOLE_5MM      dia 5, 12 deep (X; 8 deep for Cabineo 8), on the
;;;                           axis 5.5 below the pocket face:
;;;                           TOP row y 764.5 (= 770 - 5.5), BOTTOM row y 5.5
;;;   THE BACK JOINT (section F, D.2b): BUL and BUR lose 3 back tenons and 3
;;;   dog bones each (outline 4 points, 34 before); TOP and BOTTOM lose 2 back
;;;   tenons and 2 dog bones each (outline 4 points); the BACK loses 10
;;;   sockets, 20 dia 7.5 holes and its 14 dia 3 screws (a plain 600 x 770).
;;;   In their place, Cabineo (set-out as section B, ax = 5.5):
;;;     BUL-BACK     L 770, S 670, n 4, g 223.33: offsets up 50, 273.33,
;;;                  496.67, 720; pockets in BUL's INSIDE face, channel from
;;;                  x = 540 into -x (three dia 15 at x 536.4, 525.2, 514;
;;;                  skim x 505.65 .. 540), y the offset; BACK holes at
;;;                  x = 18 - 5.5 = 12.5, y 50 / 273.33 / 496.67 / 720
;;;     BUR-BACK     the same offsets; channel from x = 0 into +x (dia 15 at
;;;                  3.6, 14.8, 26; skim 0 .. 34.35); BACK holes at x 587.5
;;;     TOP-BACK     L 564, S 464, n 3, g 232: offsets 50, 282, 514 from the
;;;                  BUL end; pockets in the TOP's OUTSIDE face, channel from
;;;                  x = 0 (the back) into +x, y the offset; EXPORT x' = 540 - x
;;;                  (the back end lands at x' 540); BACK holes at x = 18 +
;;;                  offset = 68 / 300 / 532, y = 770 - 5.5 = 764.5
;;;     BOTTOM-BACK  as the TOP's; BACK holes at y = 5.5
;;;   The TOP's end pocket at x 50 (50 from the BACK, y 0 .. 34.35) and its
;;;   back pocket at y 50 (x 0 .. 34.35) stand in different quadrants of the
;;;   corner, 7.3 apart at the nearest. No PUZZLE layer is left on a Cabineo
;;;   BUD: three Cabineo layers and nothing else of the joint.
;;;   COUNTS: 12 + 14 = 26 pockets (78 dia 15 holes), 26 skims, 26 dia 5
;;;   holes (12 in the sides, 14 in the BACK); 26 connectors, 26 caps.
;;;
;;; W 600, D 558, H 770, G 18, no shelf. Profile: variant 12 (X = 12, the
;;; side >= 13, the board >= 12), mounting flushCap (pocket 13 deep, cap
;;; recess 2.1 deep and 18.8 wide, 35.65 long, end r 9.4 centred 26.25; the
;;; screw axis 7.1 below the OUTSIDE face, D - 7.1 = 10.9 above the inside
;;; face), machining cutter12 (lobes dia 15 at 3.6 / 14.8 / 26 from the end,
;;; channel 12 high, half 6; half 6.6 at the end; straights 8.1 to 10.3 and
;;; 19.3 to 21.5; far end 33.5 DERIVED), pitch 250, end offset 50, min 2;
;;; sheet: max. 300 apart, min. 20 from the edge. Every Lamello number owner
;;; to confirm; the pitch, the offset, the mounting and the option T78
;;; proposed; the inverted side DECIDED.
;;;
;;; BOARDS AND FRAMES (section C). BUL / BUR 540 x 770, inside face, BUL x
;;; from the FRONT, BUR x from the BACK, y up. TOP / BOTTOM 540 x 564, drawn
;;; ROT90 from the inside face: x the depth from the BACK (0) to the front
;;; (540), y the width from the BUL end (0) to the BUR end (564). Their
;;; pockets are on the OUTSIDE face, so each is EXPORTED in the reflected
;;; frame x' = 540 - x (x' the depth from the FRONT), y' = y, labelled
;;; OUTSIDE FACE UP. W of the reflection = 540 (the drawn width), not 600.
;;;
;;; SET-OUT, every joint (L = 540 = D - G): S = 440, n = max(2, 1 + ceil(440 /
;;; 250 = 1.76)) = 3, g = 220: offsets from the FRONT 50 270 490; gaps 220
;;; (<= 250 <= 300); the first axis 50 from the front edge (>= 20; the pocket's
;;; own edge at 42.5, the recess's at 40.6).
;;;
;;; JOINT        LEN  REF    S    n  g    OFFSETS       POCKET BOARD (face)   HOLE BOARD
;;; BUL-TOP      540  FRONT  440  3  220  50 270 490    TOP (outside, top)    BUL
;;; BUR-TOP      540  FRONT  440  3  220  50 270 490    TOP (outside, top)    BUR
;;; BUL-BOTTOM   540  FRONT  440  3  220  50 270 490    BOTTOM (outside, under) BUL
;;; BUR-BOTTOM   540  FRONT  440  3  220  50 270 490    BOTTOM (outside, under) BUR
;;;
;;; TOP, own (inside) frame, x from the BACK: pocket axes x = 540 - offset =
;;; 490 270 50.
;;;   BUL end (y = 0, the channel opens at y = 0, the pocket runs into +y):
;;;     lobe centres          (x, 3.6)  (x, 14.8)  (x, 26)            dia 15
;;;     outline key points    (x -/+ 6.6, 0)  (x -/+ 7.5, 3.6)  (x -/+ 6, 8.1)  (x -/+ 6, 10.3)
;;;                           (x -/+ 7.5, 14.8)  (x -/+ 6, 19.3)  (x -/+ 6, 21.5)  (x -/+ 7.5, 26)  (x, 33.5)
;;;     straights             y 8.1 to 10.3 and 19.3 to 21.5 at x -/+ 6 (the 2.2 reliefs)
;;;     pocket box            x - 7.5 .. x + 7.5,  y 0 .. 33.5,   13 deep from the OUTSIDE face
;;;     cap recess            x - 9.4 .. x + 9.4,  y 0 .. 35.65,  2.1 deep; semicircle r 9.4 centred (x, 26.25)
;;;     screw axis            along the end at y = 0, 7.1 below the top face (10.9 above the inside face)
;;;     x = 490: box 482.5 .. 497.5, recess 480.6 .. 499.4
;;;     x = 270: box 262.5 .. 277.5, recess 260.6 .. 279.4
;;;     x =  50: box  42.5 ..  57.5, recess  40.6 ..  59.4
;;;   BUR end (y = 564, the pocket runs into -y): every y above becomes 564 - y:
;;;     lobe centres          (x, 560.4)  (x, 549.2)  (x, 538)
;;;     straights             y 555.9 to 553.7 and 544.7 to 542.5
;;;     pocket box            y 530.5 .. 564;   cap recess  y 528.35 .. 564 (semicircle centred (x, 537.75))
;;;     the x boxes as the BUL end's
;;;   EXPORT (OUTSIDE FACE UP), x' = 540 - x, y' = y:
;;;     axes x' = 50 270 490: the pocket that stood at x 490 (50 from the FRONT) lands at x' 50
;;;                           (50 from the front, counted from the front now), 270 stays 270, 50 lands at 490
;;;     boxes x' 42.5 .. 57.5 | 262.5 .. 277.5 | 482.5 .. 497.5 (from 482.5 .. 497.5 | 262.5 .. 277.5 | 42.5 .. 57.5)
;;;     recesses x' 40.6 .. 59.4 | 260.6 .. 279.4 | 480.6 .. 499.4
;;;     y UNCHANGED: the BUL end's lobes at 3.6 / 14.8 / 26 from y = 0, the BUR end's at 560.4 / 549.2 / 538
;;;     (3.6 / 14.8 / 26 from y = 564): A POCKET 3.6 FROM THE END LANDS 3.6 FROM THE END IN THE REFLECTED DXF.
;;;     The three axes are the same three numbers because 50 + 490 = 540 (the set is symmetric
;;;     about the depth's middle); each pocket individually crosses.
;;;
;;; BOTTOM: identical to the TOP, number for number (same frame, same
;;; reflection W = 540; its outside face is its underside, cut from below in
;;; the plinth void; the screw axis 7.1 above the underside).
;;;
;;; BUL (x from the FRONT, y up), dia 5 holes in the inside face, on the
;;; joint line at the screw axis; depth NOT ON THE SHEET (the screw reaches
;;; X = 12 beyond the TOP's end into the side; the side 18 >= 13):
;;;   BUL-TOP      y 762.9  (= 770 - 7.1)   x 50 270 490
;;;   BUL-BOTTOM   y   7.1  (=   0 + 7.1)   x 50 270 490
;;; BUR (x from the BACK):
;;;   BUR-TOP      y 762.9                  x 490 270 50
;;;   BUR-BOTTOM   y   7.1                  x 490 270 50
;;; (The dowel's face holes on the same joints stand at y 761 and 9, the
;;; centre of the 18; the Cabineo hole is 1.9 nearer the outside face.)
;;;
;;; THE SKIN CHECK on this BUD: the TOP and the BOTTOM carry no inside-face
;;; drilling in KIT_BUD_FULL (the dia 3 rows are the sides' and the back's,
;;; the puzzle's holes go with the puzzle), so nothing opposes a pocket; the
;;; floor under a pocket is 18 - 13 = 5 >= 3. On the sides the dia 5 holes
;;; share the inside face with the hinge plates (y 100, 470, 670 at x 37 and
;;; 69) and the shelf pin ladders; at y 7.1 and 762.9 none overlaps.
;;;
;;; COUNTS. TOP 6 pockets (3 per end), BOTTOM 6; BUL 6 holes, BUR 6: 12
;;; POCKETS, 12 HOLES. BOM: 12 x Cabineo 12 (article not on the sheet, owner
;;; to supply), 12 x cover cap under caps = "all" (0 under "shelves"), no
;;; insert. Layers: CABINEO_POCKET_12MM, CABINEO_RECESS, CABINEO_HOLE_5MM.
;;;
;;; WHAT THE PUZZLE LOSES ON THE SAME BUD. Each side: 4 sockets (2 top, 2
;;; bottom), 8 dia 7.5 holes, 6 dia 3 screws (at x 50 270 490, y 761 and 9:
;;; the screws stood where the pockets' axes now are, 1.9 away). TOP and
;;; BOTTOM: the 4 end tenons each and the 4 end dog bones each. Since
;;; 15.10.2026 the BACK JOINT goes too (section F, H.0): each side its 3 back
;;; tenons and 3 dog bones, TOP and BOTTOM their 2 back tenons and 2 dog bones
;;; each, the BACK its 10 sockets, 20 dia 7.5 holes and 14 dia 3 screws; the
;;; four back joints of D.2b replace them. (Before 15.10.2026 the back joint
;;; stayed the kit's and the BACK lost nothing; the owner's "no dog bones" and
;;; "plecy tez na cabineo" ended that.)
;;;
;;; WITH ONE FIX SHELF (KIT_BUD's one-shelf row: underside 385, 18 thick,
;;; front 20 behind the carcass front; shelf 520 deep x 564 wide, drawn from
;;; its top face, x from its FRONT 0 to the back 520, y from the BUL end 0 to
;;; the BUR end 564; its pocket face is its UNDERSIDE, the owner's "with the
;;; cap", so it is exported reflected with W = 520):
;;; BUL-SHELF-1  520  FRONT  420  3  210   50 260 470   SHELF-1 (outside, under)  BUL
;;; BUR-SHELF-1  520  FRONT  420  3  210   50 260 470   SHELF-1 (outside, under)  BUR
;;; SHELF-1 (own frame, x from the FRONT): axes x = 50 260 470; BUL end lobes
;;;   (x, 3.6) (x, 14.8) (x, 26), BUR end (x, 560.4) (x, 549.2) (x, 538); boxes
;;;   x -/+ 7.5, recesses x -/+ 9.4, as the TOP's; EXPORT x' = 520 - x = 470 260 50.
;;; BUL   BUL-SHELF-1  y 392.1 (= 385 + 7.1)  x 70 280 490  (the shelf's front is 20 behind the carcass front)
;;; BUR   BUR-SHELF-1  y 392.1                x 470 260 50  (x = 540 - 20 - offset)
;;; (The dowel's shelf holes stood at y 394 = row + 9.) 6 more pockets, 6 more
;;; holes: 18 connectors, 18 caps under "all", 6 under "shelves". The shelf's
;;; last pocket axis (x 470, box to 477.5, recess to 479.4) stands 40.6 clear
;;; of the shelf's back edge at 520; the shelf's biscuit set and the sides'
;;; shelf screws give way to the Cabineo (section F).
;;;
;;; A SHORT JOINT, for the record (not a BUD board): a wall unit 300 deep has
;;; a 282 top; S = 182 < 250, n = max(2, 1 + 1) = 2: pockets at 50 and 232,
;;; one gap of 182. Under 118.8 (S < 18.8, the recess width) a joint gets one
;;; pocket on its centre.

(princ "\nSKYLON_JOINTS_CABINEO loaded. Type CABINEO_JOINTS to print the pattern, CABINEO_DRAW to draw it.")
(princ)
