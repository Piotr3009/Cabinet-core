;;;========================================
;;; KIT_CORNER_L_BIFOLD.lsp
;;; The L corner's BI-FOLD DOOR: leaf A on the carcass, leaf B on leaf A
;;; Command: CORNER_L_BIFOLD
;;; Turn 78 (CLAUDE.md PART A, F8) - LISP FIRST
;;; Derived from: KIT_CORNER_L.lsp (the carcass, the pair of doors) +
;;;               KIT_BUD_FULL.lsp / SKYLON_COMMON.lsp (the hinged front)
;;; Requires: SKYLON_COMMON.lsp, KIT_CORNER_L.lsp loaded first (auto-loaded
;;;           below). Nothing of theirs is copied; every board is drawn by
;;;           CALLING them.
;;;========================================
;;;
;;; THE OWNER'S LAW, 11.10.2026 (the eye-test of T75 to T77, point by point):
;;;
;;;   "zawiasy podwojne czyli jedne drzwiczki do carcasu a pozniej zawiasy od
;;;    drzwiczek do drzwiczek"
;;;
;;; One leaf hangs on the carcass; the other hangs on THAT leaf. A per-unit
;;; choice on the L, `corner_doors: 'pair' | 'bifold'`, default `pair`, which is
;;; KIT_CORNER_L's A and B (its section 8: door B overlaps door A, door B opens
;;; first). THIS FILE IS THE `bifold` MODE. It stands under two T78 laws:
;;;
;;;   THE HINGE ANGLE STAYS DERIVED (T22). A wide-angle hinge is a FAMILY the
;;;   door chooses (`standard` | `wide`); inside the family the angle is still
;;;   hingeAngleFor from the front thickness and the catalogue. Company defaults
;;;   never carry an angle. The bi-fold hinge's own 60 is the CATALOGUE's number
;;;   for that one article, not a setting.
;;;
;;;   A BOUGHT MECHANISM IS A LINE AND A BODY, NEVER A HOLE, until its
;;;   manufacturer's drilling is in reference/hardware/ with a page number.
;;;
;;; THE DATA SOURCE is reference/hardware/blum-hinges.json, `families.bifold`
;;; (T78 F8 / F13, read 11.10.2026): Blum catalogue 2024/2025, Hinge systems
;;; from p. 70, the corner cabinet bi-fold hinge on p. 116 and its planning page
;;; p. 117 (https://publications.blum.com/2024/catalogue/en/116/ and /117/).
;;; From this container no page could be opened (the proxy refuses the host);
;;; every value was read from search snippets of the named page, so EVERY
;;; NUMBER BELOW IS `owner to confirm`, and a value the snippet did not carry
;;; is NULL and this file says so in words and DRAWS NO HOLE for it. What p. 116
;;; printed: CLIP top NI | ONS 79T8500 (screw-on) and 79T8530 (knock-in),
;;; "special hinge for corner cabinets with bi-fold doors", "for front
;;; thicknesses FD from 15 to 23, factory setting for 19", "for use in
;;; combination with 155 or 170 hinge" (pages 84 and 88), "60 opening angle",
;;; "spring closing mechanism", "3-dimensional front adjustment". What p. 117
;;; did NOT come through: the drilling distance TB of the cup, the cup depth,
;;; the boss screw offset, the plate's position on leaf A, the gap table.
;;;
;;; This is a NEW FILE. It touches no other kit. drawCL_PLAN, drawCL_LBOARD_ROT90,
;;; drawCL_BACKB, drawCL_HANGERSIDE, CL:lTop, CL:lTopJoints, CL:lShelf,
;;; CL:innerRelief, CL:cutterRadius, CL:validP, CL:hingeRows, CL:hangerBack are
;;; KIT_CORNER_L's;
;;; drawBUL, drawBUR, drawBACK, drawFRONT, drawRect, drawLine, drawCircle,
;;; drawText, drawTextL, drawTextLC, makePolyline, createViewLayers,
;;; createCNCLayers are COMMON's. All CALLED, never copied.
;;;
;;;========================================
;;; 1. THE FRAME (KIT_CORNER_L's, section 1, restated)
;;;========================================
;;;
;;;   ORIGIN   the ROOM CORNER, floor level under the carcass.
;;;   x        along WALL A (the unit's own wall), away from the corner.
;;;   y        along WALL B (the adjacent wall), OUT from wall A into the room.
;;;   z        up.
;;;
;;;   arm A    x d..W, y 0..d     SIDE-A at x = W, its front the line y = d
;;;   arm B    x 0..d, y d..D     SIDE-B at y = D, its front the line x = d
;;;   (d, d)   the INNER CORNER
;;;
;;; This is the LEFT HAND (engine `cornerL.side = 'left'`, box.x = x, box.z = y,
;;; box.y = z); the RIGHT HAND is this drawing mirrored in x, as every board of
;;; KIT_CORNER_L is. Seen from the room, SIDE-A is the LEFT side of arm A and
;;; SIDE-B the RIGHT side of arm B (KIT_CORNER_L section 3), so arm A's picture
;;; has the inner corner at its RIGHT and arm B's at its LEFT.
;;;
;;;========================================
;;; 2. THE INPUTS
;;;========================================
;;;
;;;   W, D, d, H, G   KIT_CORNER_L's own.
;;;   frontT          front thickness, profile front.thickness (18). Both leaves
;;;                   are frontT thick (T78 F3). The bi-fold hinge takes FD 15 to
;;;                   23, factory 19 (p. 116): a front outside that is refused
;;;                   in words.
;;;   gap             profile doors.gap (3): the leaf's standard clearance (gap/2
;;;                   a side, H - gap tall) and the stand-off of a leaf's back
;;;                   from the carcass front (KIT_BUDR_FULL's drawDoor, the same
;;;                   convention as KIT_CORNER_L_DRAWERS.lsp).
;;;   mount           B / W / X as KIT_CORNER_L: the hinge rows follow it.
;;;
;;;========================================
;;; 3. THE TWO LEAVES
;;;========================================
;;;
;;; Both leaves are H - gap tall (the engine's single front, (W - gap) x (H -
;;; gap)), standing from z = 0 with the gap at the top, both frontT thick.
;;;
;;;   LEAF A   KIT_CORNER_L's COVERED leaf, unchanged:
;;;            x from d  to  W - gap/2        length W - d - gap/2
;;;            body y from d + gap to d + gap + frontT (face at d + gap + frontT)
;;;            INNER TRIM -gap/2: against a standard front (gap/2 inside the
;;;            carcass end) it is gap/2 LONGER, its end at x = d exactly, the
;;;            inner corner (the engine's neighbour kind CORNER_COVERED = 0).
;;;            Hinged on SIDE-A (x = W), its free edge at the corner.
;;;   LEAF B   the folding leaf:
;;;            y from d + frontT + 2 gap  to  D - gap/2
;;;                                           length D - d - frontT - 2.5 gap
;;;            body x from d + gap to d + gap + frontT (face at d + gap + frontT)
;;;            INNER TRIM frontT + 1.5 gap: against a standard front its inner
;;;            edge, which is its HINGE EDGE, stands frontT + 1.5 gap further
;;;            in, i.e. at d + frontT + 2 gap: exactly `gap` off leaf A's FACE
;;;            (d + gap + frontT). That `gap` is the hinge's gap F; p. 117's
;;;            gap table did not come through, so the house gap 3 stands
;;;            (CLB:hingeGap, owner to confirm against p. 117).
;;;            Hinged on LEAF A's free edge. It carries NO carcass hinge, and
;;;            SIDE-B gets NO plate holes: drawBUR is called with no hinges.
;;;
;;; THE PAIR MODE for the record: KIT_CORNER_L section 8, door B's inner edge
;;; at CORNER_OVERLAP (front_t + clearance.corner beyond the corner), door B
;;; opens first. In `bifold` that overlap law is replaced by the trim above and
;;; the pair opens TOGETHER (section 6).
;;;
;;;========================================
;;; 4. THE HINGES
;;;========================================
;;;
;;; LEAF A hangs on SIDE-A with the FAMILY's carcass hinges, as KIT_CORNER_L's
;;; door A does: the plate rows are KIT_BUD's (CL:hingeRows: base and wall
;;; H - 100, H - 300, 100; wardrobe calcHingePositionsTall), the plate holes
;;; are drawBUL's own (pairs at +/- 16, 37 from the front edge, HINGES_5MM), the
;;; cups are COMMON's drawFRONT (35 at 21.5 from the hinge edge, two 3 mm boss
;;; screws 9.5 toward the leaf's centre, +/- 23: profile hinges.cups). None of
;;; that moves here. WHAT THE CATALOGUE ADDS: p. 116 says the bi-fold hinge is
;;; "for use in combination with 155 or 170 hinge", so in `bifold` mode LEAF A's
;;; family is `wide` (F13), and INSIDE the family the angle stays derived from
;;; frontT (blum-hinges.json rules.families.wide, T78 proposed: 170 to FD 21,
;;; 155 to FD 24, none above). CLB:wideAngleFor says it; a front the family has
;;; no rung for is refused in words. The owner decides the family rule; the
;;; angle is never typed.
;;;
;;; LEAF B hangs on LEAF A's FREE EDGE with Blum's CLIP top 60 degree bi-fold
;;; corner hinge, one per row of the kit's hinge ladder for B's height (the
;;; same rows as A's, CL:hingeRows: three on a base or wall L, six on the
;;; wardrobe), as a BOM QUANTITY:
;;;
;;;   article      79T8500 screw-on (default), 79T8530 knock-in     p. 116
;;;   angle        60, leaf B against leaf A                         p. 116
;;;   FD           15 to 23, factory setting 19                      p. 116
;;;   closing      spring                                            p. 116
;;;   plate        a 0 mm or 3 mm spaced standard mounting plate     p. 117
;;;                (dealers name 175H7100, 173L6100, 173H7100,
;;;                173L8100, 175H3100; D22: "use with 0 mm plate")
;;;   companion    155 or 170 on leaf A                              p. 116
;;;
;;; The cliptop-hinge-count.json bands (door height x weight) stay a CHECK on
;;; the count, never a drilling (turn 31 rule).
;;;
;;;========================================
;;; 5. THE PATTERN: WHERE IT WOULD BE BORED, AND WHY IT IS NOT
;;;========================================
;;;
;;; THE CUPS are on LEAF B: a 35 cup bored into B's BACK face at its HINGE EDGE
;;; (the edge toward A), by the catalogue's cup pattern: centre TB + 17.5 from
;;; the hinge edge, the two boss screws `spacing` apart (45 by dealer D21) and
;;; `offset` toward the leaf's centre, at each hinge row. THE PLATES are on
;;; LEAF A's INNER (back) face, near its free edge, by the catalogue's plate
;;; pattern (dealer D22: "the plate attaches to the back of the other door").
;;;
;;; WHAT THE JSON HOLDS, by path, every one `owner to confirm`:
;;;
;;;   cup_on_leaf_b.diameter.value                      35      dealers D21, D22
;;;   cup_on_leaf_b.depth_catalogue.value               NULL    p. 117 (dealers
;;;                                                             say 11 and 13.5,
;;;                                                             they conflict)
;;;   cup_on_leaf_b.drilling_distance_tb.value          NULL    p. 117
;;;   cup_on_leaf_b.boss_screws.spacing.value           45      dealer D21
;;;   cup_on_leaf_b.boss_screws.offset_from_cup_centre  NULL    p. 117 (the CLIP
;;;                                                             top range is 9.5)
;;;   plate_on_leaf_a.spacing.value                     "0 or 3 mm"   p. 117
;;;   plate_on_leaf_a.position_on_leaf_a.value          NULL    p. 117
;;;   plate_on_leaf_a.holes.value                       5 dia, 11.5 deep  D28
;;;                                                             (174E EXPANDO;
;;;                                                             screw plates
;;;                                                             take wood screws)
;;;
;;; THE GATE (CLB:patternReady): TB, the cup depth and the plate position must
;;; ALL be numbers before one hole is drawn. They are null, so this file draws
;;; ZERO HOLES for the bi-fold hinge: the hinge is a BOM LINE and a BODY (a
;;; placeholder block at each row on B's hinge edge, HARDWARE_BODY layer, never
;;; cut) and the CNC sheet carries a TEXT at each row saying so. The code that
;;; would bore them (CLB:cupsB, CLB:platesA) is written against the JSON paths
;;; and comes alive the day the owner reads p. 117 into the JSON; nothing else
;;; changes. The repo's own CLIP top numbers (TB 4 from 21.5 - 17.5, depth 11)
;;; are NOT used for the bi-fold: a different article, its own table.
;;;
;;;========================================
;;; 6. THE FOLD (the animation, in words and in the plan's picture)
;;;========================================
;;;
;;; A swings on the carcass to the door law's angle; B folds about its hinge
;;; edge by the family's angle, CLB:bifoldAngle 60 (p. 116). The whole pair
;;; moves together: pull B, A comes with it (the drawerMotion grammar for a
;;; child part: B is A's child).
;;;
;;;   A    rotates about its hinge edge at SIDE-A, its free edge out into the
;;;        room (+y). The PICTURE below draws it at profile doors.openAngle (99,
;;;        the double-click swing, "a swing is a picture"); its FULL swing is the
;;;        family's derived angle (170 at frontT 18), which the collision Check
;;;        runs against the neighbour, the wall and a corner post.
;;;   B    rotates WITH A (it hangs on A), and then FOLDS about its own hinge
;;;        edge by 60: shut, the two leaves stand at 90 to each other (the L);
;;;        open, the angle between their back faces has grown by 60 to 150, so
;;;        B's far end leaves SIDE-B and comes out into the room (+x when A is
;;;        shut), the way a cup hinge opens a door away from the side it hangs
;;;        on. The pair stands as a shallow V in front of arm A.
;;;
;;; THE DIRECTION IS THE PICTURE'S. CLB:foldSense +1 is the sense drawn below
;;; (B's far end into the room); -1 is the other sense (B folding onto A's
;;; face). The owner confirms it on his screen; one number moves. The hinge's
;;; AXIS in the picture is B's back-face corner at its hinge edge: the true
;;; axis sits inside the hinge body behind the leaves, p. 117, null.
;;;
;;; COLLISION CHECKS RUN ON THE FOLDED PAIR: the swept outlines of A and of B
;;; through the fold against the neighbour, the wall, a corner post, a handle.
;;; A hit is said in words, never clipped (T78 F13's law for the wide family).
;;;
;;;========================================
;;; 7. WHAT IS NOT IN THIS FILE
;;;========================================
;;;
;;; THE CARCASS is KIT_CORNER_L's, board for board: drawn here by calling its
;;; functions so the kit is whole on one sheet. The ONE change: SIDE-B carries
;;; no plate holes (drawBUR, no hinges). The shelves are KIT_CORNER_L's SHELF-L.
;;; THE PAIR MODE (KIT_CORNER_L section 8). THE DRAWERS (F7,
;;; KIT_CORNER_L_DRAWERS.lsp): a bi-fold L has no drawer rows. THE HANDLES: the
;;; engine's handle law; the Check names a handle in the fold's way.
;;;
;;;========================================
;;; 8. THE NUMBERS  (the assertion; computed, then written down)
;;;========================================
;;;
;;; BASE DEFAULTS: W 900, D 900, d 558, H 770, G 18, frontT 18, gap 3.
;;;
;;; LEAF A   x 558..898.5, length 340.5, height 767, body y 561..579
;;;          hinge rows (SIDE-A plates and A's cups) 670, 470, 100
;;;          cups 21.5 from the SIDE-A edge, boss screws at 9.5 toward the
;;;          centre and +/- 23 (KIT_BUD's, drawFRONT "L")
;;;          family wide, angle at FD 18: 170 (T78 proposed)
;;;          bi-fold PLATES at its free edge, rows 670, 470, 100: position
;;;          null, 0 holes, 3 marks
;;; LEAF B   y 582..898.5, length 316.5, height 767, body x 561..579
;;;          hinge edge at y 582, 3 off A's face (579)
;;;          bi-fold CUPS at the hinge edge, rows 670, 470, 100: TB null,
;;;          depth null, 0 holes, 3 marks
;;;          carcass hinges NONE; SIDE-B plate holes NONE
;;; SIDE-A   540 x 770, drawBUL, plate rows 670, 470, 100 (pairs +/- 16, x 37)
;;; SIDE-B   540 x 770, drawBUR, NO plate rows
;;; OPEN     A at 99 about (898.5, 561); B rotated with A and folded 60 about
;;;          (561, 582): the inside angle 150; foldSense +1
;;;
;;; CENSUS   leaves 2; carcass hinge rows A only 3 (3 cups, 6 boss screws on
;;;          A, 6 plate holes on SIDE-A: KIT_BUD's own); bi-fold hinges on B 3
;;;          (BOM quantity); bi-fold holes 0 (the pattern is null)
;;;
;;; WALL (W 600, D 600, d 400, H 720): leaf A 198.5 x 717 (x 400..598.5),
;;;   leaf B 174.5 x 717 (y 424..598.5), rows 620, 420, 100; 3 bi-fold
;;;   hinges, 0 holes.
;;; WARDROBE (W 1000, D 1000, d 568, H 2150): leaf A 430.5 x 2147, leaf B
;;;   406.5 x 2147 (y 592..998.5), rows calcHingePositionsTall 2150 = 100,
;;;   490, 880, 1270, 1660, 2050; 6 bi-fold hinges, 0 holes.
;;;
;;;========================================

;;; Auto-load what this file CALLS
(if (null drawRect) (load "SKYLON_COMMON"))
(if (null CL:lOutline) (load "KIT_CORNER_L"))

;;;========================================
;;; A. THE PROFILE NUMBERS THIS FILE READS
;;;========================================
;;;
;;; Keyed by their PATH in src/engine/profile.js. Every number here is already
;;; the profile's; this file adds none.

(defun CLB:profile ( / )
  '(("doors.gap" . 3.0)
    ("doors.clearance.corner" . 3.0)
    ("doors.openAngle" . 99.0)
    ("front.thickness" . 18.0)
    ("hinges.standard" . 3.0)
    ("hinges.holeDiameter" . 5.0)
    ("hinges.cups.diameter" . 35.0)
    ("hinges.cups.xFromHingeEdge" . 21.5)
    ("hinges.cups.screwDiameter" . 3.0)
    ("hinges.cups.screwOffsetX" . 9.5)
    ("hinges.cups.screwOffsetY" . 23.0)))

(defun CLB:p (key / hit)
  (setq hit (assoc key (CLB:profile)))
  (if hit
    (cdr hit)
    (progn (princ (strcat "\nKIT_CORNER_L_BIFOLD: no profile number " key)) 0.0)))

;;;========================================
;;; B. THE CATALOGUE NUMBERS THIS FILE READS (blum-hinges.json, owner to confirm)
;;;========================================
;;;
;;; Keyed by their PATH in reference/hardware/blum-hinges.json. A NIL value is
;;; the JSON's null: the snippet of the named page did not carry it. A string is
;;; a string as printed. Nothing here is from memory.

(defun CLB:hinge ( / )
  (list
    (cons "families.bifold.hinge.articles.screw_on.value" "79T8500")              ; p. 116
    (cons "families.bifold.hinge.articles.knock_in.value" "79T8530")              ; p. 116
    (cons "families.bifold.hinge.opening_angle.value" 60.0)                       ; p. 116
    (cons "families.bifold.hinge.companion_hinge_on_leaf_a.value" "155 or 170")   ; p. 116
    (cons "families.bifold.hinge.front_thickness_fd.min.value" 15.0)              ; p. 116
    (cons "families.bifold.hinge.front_thickness_fd.max.value" 23.0)              ; p. 116
    (cons "families.bifold.hinge.front_thickness_fd.factory_setting.value" 19.0)  ; p. 116
    (cons "families.bifold.hinge.closing.value" "spring closing mechanism")       ; p. 116
    (cons "families.bifold.hinge.cup_on_leaf_b.diameter.value" 35.0)              ; dealers D21 D22
    (cons "families.bifold.hinge.cup_on_leaf_b.depth_catalogue.value" nil)        ; p. 117, NULL
    (cons "families.bifold.hinge.cup_on_leaf_b.drilling_distance_tb.value" nil)   ; p. 117, NULL
    (cons "families.bifold.hinge.cup_on_leaf_b.boss_screws.spacing.value" 45.0)   ; dealer D21
    (cons "families.bifold.hinge.cup_on_leaf_b.boss_screws.offset_from_cup_centre.value" nil) ; p. 117, NULL
    (cons "families.bifold.hinge.plate_on_leaf_a.spacing.value" "0 mm or 3 mm spaced standard mounting plate") ; p. 117
    (cons "families.bifold.hinge.plate_on_leaf_a.position_on_leaf_a.value" nil)   ; p. 117, NULL
    (cons "families.bifold.hinge.plate_on_leaf_a.holes.value.diameter" 5.0)       ; dealer D28
    (cons "families.bifold.hinge.plate_on_leaf_a.holes.value.depth" 11.5)         ; dealer D28
    (cons "rules.families.wide.hinge_by_front_thickness.0.max" 21.0)              ; T78 proposed
    (cons "rules.families.wide.hinge_by_front_thickness.0.angle" 170.0)           ; p. 88 / 89
    (cons "rules.families.wide.hinge_by_front_thickness.1.max" 24.0)              ; T78 proposed
    (cons "rules.families.wide.hinge_by_front_thickness.1.angle" 155.0)))         ; p. 84 / 85

;;; The value at a path, nil when the JSON holds null (or the path is unknown:
;;; CLB:knownP tells the two apart).
(defun CLB:j (key / hit)
  (setq hit (assoc key (CLB:hinge)))
  (if hit (cdr hit) nil))

(defun CLB:knownP (key / )
  (if (assoc key (CLB:hinge)) T nil))

;;; THE FAMILY's angle on LEAF B against LEAF A: the catalogue's 60, owner to confirm.
(setq CLB:bifoldAngle (CLB:j "families.bifold.hinge.opening_angle.value"))

;;; THE SENSE OF THE FOLD (section 6): +1 the picture's, -1 the other way.
(setq CLB:foldSense 1.0)

;;; THE GAP between B's hinge edge and A's face: the house gap until p. 117 is read.
(defun CLB:hingeGap ( / )
  (CLB:p "doors.gap"))

;;; The article this file states on the BOM (screw-on by default).
(setq CLB:article (CLB:j "families.bifold.hinge.articles.screw_on.value"))

;;;========================================
;;; C. THE SET-OUT RULES
;;;========================================

(defun CLB:gap ( / )
  (CLB:p "doors.gap"))

;;; A leaf's height: the engine's single front, H - gap, the gap at the top.
(defun CLB:leafH (H / )
  (- H (CLB:gap)))

;;; LEAF A's span along wall A: (x1 x2). The covered leaf: its end AT the corner.
(defun CLB:leafA (outW armD / )
  (list armD (- outW (/ (CLB:gap) 2.0))))

;;; LEAF B's span along wall B: (y1 y2). Its hinge edge `gap` off A's face.
(defun CLB:leafB (outD armD frontT / g)
  (setq g (CLB:gap))
  (list (+ armD frontT g (CLB:hingeGap)) (- outD (/ g 2.0))))

(defun CLB:leafLen (f / )
  (- (cadr f) (car f)))

;;; A's face plane, y: the leaf stands `gap` off the carcass front, frontT thick.
(defun CLB:faceA (armD frontT / )
  (+ armD (CLB:gap) frontT))

;;; Is the front thickness one the bi-fold hinge takes? p. 116: FD 15 to 23.
(defun CLB:fdValidP (frontT / )
  (and (>= frontT (CLB:j "families.bifold.hinge.front_thickness_fd.min.value"))
       (<= frontT (CLB:j "families.bifold.hinge.front_thickness_fd.max.value"))))

;;; THE WIDE FAMILY's derived angle for LEAF A (T22 law: by the front thickness,
;;; never typed): 170 to FD 21, 155 to FD 24, nil above (refused in words).
(defun CLB:wideAngleFor (frontT / )
  (cond
    ((<= frontT (CLB:j "rules.families.wide.hinge_by_front_thickness.0.max"))
     (CLB:j "rules.families.wide.hinge_by_front_thickness.0.angle"))
    ((<= frontT (CLB:j "rules.families.wide.hinge_by_front_thickness.1.max"))
     (CLB:j "rules.families.wide.hinge_by_front_thickness.1.angle"))
    (T nil)))

;;; The hinge rows, KIT_CORNER_L's own (KIT_BUD's list, the tall rule for X).
;;; The same rows carry A's carcass hinges and B's bi-fold hinges.
(defun CLB:rows (H mount / )
  (CL:hingeRows H mount))

;;; THE GATE of section 5: all three numbers, or no hole.
(defun CLB:patternReady ( / )
  (and (CLB:j "families.bifold.hinge.cup_on_leaf_b.drilling_distance_tb.value")
       (CLB:j "families.bifold.hinge.cup_on_leaf_b.depth_catalogue.value")
       (CLB:j "families.bifold.hinge.plate_on_leaf_a.position_on_leaf_a.value")))

;;; LEAF B's bi-fold cups in its CNC frame (back face up, the hinge edge at
;;; X = lenB, Y up from the bottom edge): (layer x y diameter) per hole. EMPTY
;;; while the pattern is null. Written against the JSON paths for the day the
;;; owner reads p. 117 in.
(defun CLB:cupsB (lenB rows / tb dia sp off cx r out)
  (setq out '())
  (if (CLB:patternReady)
    (progn
      (setq tb  (CLB:j "families.bifold.hinge.cup_on_leaf_b.drilling_distance_tb.value")
            dia (CLB:j "families.bifold.hinge.cup_on_leaf_b.diameter.value")
            sp  (CLB:j "families.bifold.hinge.cup_on_leaf_b.boss_screws.spacing.value")
            off (CLB:j "families.bifold.hinge.cup_on_leaf_b.boss_screws.offset_from_cup_centre.value")
            cx  (- lenB tb (/ dia 2.0)))
      (foreach r rows
        (setq out (cons (list "FRONT_HINGES_35MM" cx r dia) out))
        (if off
          (progn
            (setq out (cons (list "FRONT_HINGES_3MM" (- cx off) (+ r (/ sp 2.0)) (CLB:p "hinges.cups.screwDiameter")) out))
            (setq out (cons (list "FRONT_HINGES_3MM" (- cx off) (- r (/ sp 2.0)) (CLB:p "hinges.cups.screwDiameter")) out)))))))
  (reverse out))

;;; LEAF A's bi-fold plate holes on its inner face, CNC frame (back face up,
;;; the free edge at X = 0): (layer x y diameter). EMPTY while the plate's
;;; position on leaf A is null.
(defun CLB:platesA (rows / pos dia r out)
  (setq out '())
  (if (CLB:patternReady)
    (progn
      (setq pos (CLB:j "families.bifold.hinge.plate_on_leaf_a.position_on_leaf_a.value")
            dia (CLB:j "families.bifold.hinge.plate_on_leaf_a.holes.value.diameter"))
      (foreach r rows
        (setq out (cons (list "HINGES_5MM" pos r dia) out)))))
  (reverse out))

;;; THE CENSUS: (leaves carcassRowsA bifoldRowsB bifoldHoles).
(defun CLB:census (rows / )
  (list 2 (length rows) (length rows)
        (if (CLB:patternReady) (* 3 (length rows)) 0)))

;;;========================================
;;; D. THE FOLD, FOR THE PICTURE (section 6)
;;;========================================

;;; A point `p` turned about centre `c` by `deg` (counter-clockwise positive).
(defun CLB:rot (p c deg / a dx dy)
  (setq a  (* deg (/ pi 180.0))
        dx (- (car p) (car c))
        dy (- (cadr p) (cadr c)))
  (list (+ (car c) (- (* dx (cos a)) (* dy (sin a))))
        (+ (cadr c) (+ (* dx (sin a)) (* dy (cos a))))))

;;; The two leaves' plan rectangles, SHUT: ((a1 a2 a3 a4) (b1 b2 b3 b4)).
(defun CLB:shutPicture (outW outD armD frontT / g la lb)
  (setq g  (CLB:gap)
        la (CLB:leafA outW armD)
        lb (CLB:leafB outD armD frontT))
  (list
    (list (list (car la) (+ armD g)) (list (cadr la) (+ armD g))
          (list (cadr la) (+ armD g frontT)) (list (car la) (+ armD g frontT)))
    (list (list (+ armD g) (car lb)) (list (+ armD g frontT) (car lb))
          (list (+ armD g frontT) (cadr lb)) (list (+ armD g) (cadr lb)))))

;;; ...and OPEN: A turned about its hinge edge at SIDE-A by -openDeg (clockwise,
;;; its free edge out into the room, +y); B turned about its own hinge edge by
;;; -foldSense x bifoldAngle (clockwise: its far end out into the room) and then
;;; carried round with A. Both pivots are back-face corners: a picture.
(defun CLB:openPicture (outW outD armD frontT openDeg / g la lb pA hB fold shut)
  (setq g    (CLB:gap)
        la   (CLB:leafA outW armD)
        lb   (CLB:leafB outD armD frontT)
        pA   (list (cadr la) (+ armD g))
        hB   (list (+ armD g) (car lb))
        fold (* -1.0 CLB:foldSense CLB:bifoldAngle)
        shut (CLB:shutPicture outW outD armD frontT))
  (list
    (mapcar '(lambda (p) (CLB:rot p pA (- openDeg))) (car shut))
    (mapcar '(lambda (p) (CLB:rot (CLB:rot p hB fold) pA (- openDeg))) (cadr shut))))

;;;========================================
;;; E. DRAWING
;;;========================================

;;; The one layer of this file's own: the bought body, never cut.
(defun createCLB_Layers ( / )
  (command "._LAYER" "_N" "HARDWARE_BODY" "_C" "30" "HARDWARE_BODY" ""))

;;; A closed polyline of points shifted to (x0 y0).
(defun drawCLB_POLY (layer x0 y0 pts / )
  (makePolyline layer
    (mapcar '(lambda (p) (list (+ x0 (car p)) (+ y0 (cadr p)))) pts)))

;;; THE PLAN: KIT_CORNER_L's carcass, the two leaves shut (DOORS), the hinge
;;; body at the corner (HARDWARE_BODY), the open picture (DOOR_SWING).
(defun drawCLB_PLAN (x0 y0 outW outD armD G frontT numShelves mount unitNum / shut open g lb s)
  (drawCL_PLAN x0 y0 outW outD armD G numShelves mount unitNum)
  (setq shut (CLB:shutPicture outW outD armD frontT)
        open (CLB:openPicture outW outD armD frontT (CLB:p "doors.openAngle"))
        g    (CLB:gap)
        lb   (CLB:leafB outD armD frontT)
        s    (CLB:p "hinges.cups.diameter"))
  (drawCLB_POLY "DOORS" x0 y0 (car shut))
  (drawCLB_POLY "DOORS" x0 y0 (cadr shut))
  ;; the bi-fold hinge body, a placeholder square behind the two leaves' corner
  (drawRect "HARDWARE_BODY" (+ x0 armD g (- s)) (+ y0 (car lb) (- s))
            (+ x0 armD g frontT) (+ y0 (car lb)))
  (drawCLB_POLY "DOOR_SWING" x0 y0 (car open))
  (drawCLB_POLY "DOOR_SWING" x0 y0 (cadr open))
  (drawText "UNIT_NUMBER" (+ x0 armD 200.0) (+ y0 armD 200.0) 24.0
            (strcat "BIFOLD: A " (rtos (CLB:p "doors.openAngle") 2 0) ", B folds "
                    (rtos CLB:bifoldAngle 2 0) " (sense " (rtos CLB:foldSense 2 0) ")")))

;;; ONE ARM's FRONT ELEVATION with its leaf. `leaf` the leaf's (start end) along
;;; the arm from the inner corner; `mirrored` puts the inner corner at the RIGHT
;;; (arm A, section 1). Hinge marks: `carcassAtLeft` draws A's carcass hinge
;;; rows at the left edge (SIDE-A); `bifoldAtRight` / its absence puts the
;;; bi-fold bodies at the leaf's hinge edge (A's free edge, B's hinge edge).
(defun drawCLB_ELEV (x0 y0 span armD leaf H rows mirrored carcassHinges bifoldAtRight label / a b h r s)
  (drawRect "CARCASE" x0 y0 (+ x0 span) (+ y0 H))
  (setq a (- (car leaf) armD)
        b (- (cadr leaf) armD)
        h (CLB:leafH H)
        s (CLB:p "hinges.cups.diameter"))
  (if mirrored
    (setq a (- span b) b (- span (- (car leaf) armD))))
  (drawRect "DOORS" (+ x0 a) y0 (+ x0 b) (+ y0 h))
  (foreach r rows
    (if carcassHinges
      (drawCircle "HINGES" (+ x0 a (CLB:p "hinges.cups.xFromHingeEdge")) (+ y0 r) (/ s 2.0)))
    (if bifoldAtRight
      (drawRect "HARDWARE_BODY" (+ x0 b (- s)) (+ y0 r (/ s -2.0)) (+ x0 b) (+ y0 r (/ s 2.0)))
      (drawRect "HARDWARE_BODY" (+ x0 a) (+ y0 r (/ s -2.0)) (+ x0 a s) (+ y0 r (/ s 2.0)))))
  (drawText "UNIT_NUMBER" (+ x0 (/ (+ a b) 2.0)) (+ y0 (/ h 2.0)) 30.0 label))

;;; LEAF B on the CNC sheet: back face up, the hinge edge at the RIGHT (seen from
;;; the room it is on the left, the corner end), its cups by CLB:cupsB when the
;;; pattern is in, a TEXT per row while it is not. No carcass cups: none.
(defun drawCLB_LEAFB (x0 y0 lenB h rows unitNum / k r)
  (drawRect "DOORS" x0 y0 (+ x0 lenB) (+ y0 h))
  (if (CLB:patternReady)
    (foreach k (CLB:cupsB lenB rows)
      (drawCircle (nth 0 k) (+ x0 (nth 1 k)) (+ y0 (nth 2 k)) (/ (nth 3 k) 2.0)))
    (foreach r rows
      (drawTextL "HARDWARE_BODY" (+ x0 lenB -200.0) (+ y0 r) 12.0
                 (strcat CLB:article " cup: p.117 null, 0 holes"))))
  (drawText "UNIT_NUMBER" (+ x0 (/ lenB 2.0)) (+ y0 (/ h 2.0)) 40.0 (strcat unitNum "-DOOR-B")))

;;; LEAF A's bi-fold PLATE marks on the CNC sheet (its free edge at the drawn
;;; LEFT, X = 0): holes by CLB:platesA when the pattern is in, a TEXT per row
;;; while it is not. Called after COMMON's drawFRONT has drawn the leaf.
(defun drawCLB_PLATESA (x0 y0 rows / k r)
  (if (CLB:patternReady)
    (foreach k (CLB:platesA rows)
      (drawCircle (nth 0 k) (+ x0 (nth 1 k)) (+ y0 (nth 2 k)) (/ (nth 3 k) 2.0)))
    (foreach r rows
      (drawTextL "HARDWARE_BODY" (+ x0 10.0) (+ y0 r) 12.0
                 (strcat CLB:article " plate: p.117 null, 0 holes")))))

;;;========================================
;;; F. THE COMMAND
;;;========================================
(defun c:CORNER_L_BIFOLD ( / G frontT mount dW dArm dH outW outD armD hgt numShelves
                             unitNum defNum pt x0 y0 sideW rows leafH la lb lenA lenB
                             wideDeg drawCNC cncPt cncX cncY odstep cncDone
                             nomTop jTop relTop nomShelf relShelf i b
                             census sumX sumY lineH elevX elevY
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
  (setq G (getreal "\nBoard THICKNESS [mm] (18=standard, 22=heavy) <18>: "))
  (if (or (null G) (<= G 0.0)) (setq G 18.0))

  (setq frontT (getreal (strcat "\nFRONT thickness [mm] <" (rtos (CLB:p "front.thickness") 2 0) ">: ")))
  (if (or (null frontT) (<= frontT 0.0)) (setq frontT (CLB:p "front.thickness")))

  ;; The bi-fold hinge takes FD 15 to 23 (p. 116): outside it, refused in words.
  (if (not (CLB:fdValidP frontT))
    (progn
      (princ (strcat "\nRefused: Blum's bi-fold corner hinge " CLB:article " takes fronts "
                     (rtos (CLB:j "families.bifold.hinge.front_thickness_fd.min.value") 2 0) " to "
                     (rtos (CLB:j "families.bifold.hinge.front_thickness_fd.max.value") 2 0)
                     " thick (catalogue p. 116, owner to confirm); this front is "
                     (rtos frontT 2 0) "."))
      (setvar "CMDECHO" _oldCmdecho)
      (exit)))

  ;; Leaf A's family is WIDE (p. 116: with a 155 or 170): the angle derived.
  (setq wideDeg (CLB:wideAngleFor frontT))
  (if (null wideDeg)
    (progn
      (princ (strcat "\nRefused: the wide family has no hinge for a front "
                     (rtos frontT 2 0) " thick (170 to 21, 155 to 24; blum-hinges.json, T78 proposed)."))
      (setvar "CMDECHO" _oldCmdecho)
      (exit)))

  (setq mount (getstring "\nVersion [B=Base on legs, W=Wall hung, X=Wardrobe] <B>: "))
  (if (= mount "") (setq mount "B"))
  (setq mount (strcase mount))
  (if (not (or (= mount "B") (= mount "W") (= mount "X"))) (setq mount "B"))

  ;; Defaults per version - KIT_CORNER_L's (T75 proposed, owner to confirm)
  (cond
    ((= mount "W") (setq dW 600.0  dArm 400.0 dH 720.0  defNum "CW01"))
    ((= mount "X") (setq dW 1000.0 dArm 568.0 dH 2150.0 defNum "CX01"))
    (T             (setq dW 900.0  dArm 558.0 dH 770.0  defNum "CL01")))

  (setq outW (getreal (strcat "\nOuter WIDTH along wall A [mm] <" (rtos dW 2 0) ">: ")))
  (if (or (null outW) (<= outW 0.0)) (setq outW dW))

  (setq outD (getreal (strcat "\nOuter WIDTH along wall B [mm] <" (rtos dW 2 0) ">: ")))
  (if (or (null outD) (<= outD 0.0)) (setq outD dW))

  (setq armD (getreal (strcat "\nArm DEPTH [mm] <" (rtos dArm 2 0) ">: ")))
  (if (or (null armD) (<= armD 0.0)) (setq armD dArm))

  (setq hgt (getreal (strcat "\nCabinet HEIGHT [mm] <" (rtos dH 2 0) ">: ")))
  (if (or (null hgt) (<= hgt 0.0)) (setq hgt dH))

  ;; Room refuses first: an L whose arm has no front of its own is not an L.
  (if (not (CL:validP outW outD armD G))
    (progn
      (princ (strcat "\nRefused: both arms must reach past the corner square - "
                     "WIDTH along wall A and along wall B must each exceed arm DEPTH + "
                     (rtos G 2 0) " mm."))
      (setvar "CMDECHO" _oldCmdecho)
      (exit)))

  (setq numShelves (getint "\nNumber of SHELVES (0-10): "))
  (if (or (null numShelves) (< numShelves 0)) (setq numShelves 0))
  (if (> numShelves 10) (setq numShelves 10))

  (setq unitNum (getstring T (strcat "\nUnit NUMBER <" defNum ">: ")))
  (if (= unitNum "") (setq unitNum defNum))

  (setq pt (getpoint "\nInsertion point (the ROOM CORNER): "))
  (if (null pt)
    (progn (princ "\nNo point selected.") (setvar "CMDECHO" _oldCmdecho) (exit)))

  (setq x0 (car pt) y0 (cadr pt))
  (setq sideW (- armD G))
  (setq rows  (CLB:rows hgt mount)
        leafH (CLB:leafH hgt)
        la    (CLB:leafA outW armD)
        lb    (CLB:leafB outD armD frontT)
        lenA  (CLB:leafLen la)
        lenB  (CLB:leafLen lb))

  ;; Leaf B must have a body: its hinge edge stands frontT + 2 gap in from the corner.
  (if (<= lenB 0.0)
    (progn
      (princ "\nRefused: arm B is too short for a folding leaf past leaf A's face.")
      (setvar "CMDECHO" _oldCmdecho)
      (exit)))

  ;; The pattern, said once, in words.
  (if (not (CLB:patternReady))
    (princ (strcat "\nBI-FOLD " CLB:article ": TB, cup depth and plate position are null "
                   "(blum-hinges.json, catalogue p. 117 not read): a BOM line and a body, 0 holes.")))

  ;; === LAYERS ===
  (createViewLayers)
  (createCLB_Layers)

  ;;;========================================
  ;;; PLAN VIEW (origin = the room corner), shut and open
  ;;;========================================
  (drawCLB_PLAN x0 y0 outW outD armD G frontT numShelves mount unitNum)

  ;;;========================================
  ;;; FRONT ELEVATIONS: arm A (SIDE-A left, corner right), arm B (corner left)
  ;;;========================================
  (setq elevX x0 elevY (- y0 hgt 200.0))
  (drawCLB_ELEV elevX elevY (- outW armD) armD la hgt rows T T T (strcat unitNum "-DOOR-A"))
  (setq elevX (+ elevX (- outW armD) 100.0))
  (drawCLB_ELEV elevX elevY (- outD armD) armD lb hgt rows nil nil nil (strcat unitNum "-DOOR-B"))

  ;;;========================================
  ;;; CNC PANELS - optional
  ;;;========================================
  (setq drawCNC (getstring "\nDraw CNC panels? [Y/N] <N>: "))
  (if (= drawCNC "") (setq drawCNC "N"))
  (setq drawCNC (strcase drawCNC))

  (if (= drawCNC "Y")
    (progn
      (createCNCLayers)
      (if (= mount "W")
        (command "._LAYER" "_N" "HANGER_HOLE" "_C" "4" "HANGER_HOLE" ""))

      (setq nomTop   (CL:lTop outW outD armD G)
            jTop     (CL:lTopJoints outW outD armD G)
            relTop   (CL:innerRelief nomTop (CL:cutterRadius))
            nomShelf (CL:lShelf outW outD armD G)
            relShelf (CL:innerRelief nomShelf (CL:cutterRadius)))

      (setq cncPt (getpoint "\nClick insertion point for CNC panels: "))
      (if (null cncPt)
        (princ "\nNo point selected. CNC cancelled.")
        (progn
          (setq cncX (car cncPt))
          (setq cncY (cadr cncPt))
          (setq odstep 50.0)

          ;; SIDE-A = KIT_BUD's BUL, drilled for leaf A's carcass hinges (the family's)
          (drawBUL cncX cncY sideW hgt unitNum numShelves G T rows nil)
          (if (= mount "W") (drawCL_HANGERSIDE cncX cncY sideW hgt "L"))
          (setq cncX (+ cncX sideW odstep))

          ;; SIDE-B = KIT_BUD's BUR with NO hinge plate holes: leaf B hangs on leaf A
          (drawBUR cncX cncY sideW hgt unitNum numShelves G nil nil nil)
          (if (= mount "W") (drawCL_HANGERSIDE cncX cncY sideW hgt "R"))
          (setq cncX (+ cncX sideW odstep))

          ;; TOP-L and BOTTOM-L - KIT_CORNER_L's, turned 90 (T78 F4)
          (setq cncX (+ cncX G))
          (drawCL_LBOARD_ROT90 cncX (+ cncY G) nomTop jTop relTop (strcat unitNum " TOP-L") G)
          (setq cncX (+ cncX (cadr (nth 5 nomTop)) G odstep))
          (setq cncX (+ cncX G))
          (drawCL_LBOARD_ROT90 cncX (+ cncY G) nomTop jTop relTop (strcat unitNum " BOTTOM-L") G)
          (setq cncX (+ cncX (cadr (nth 5 nomTop)) G odstep))

          ;; BACK-A = KIT_BUD's BACK at width W
          (drawBACK cncX cncY outW hgt unitNum G)
          (if (= mount "W")
            (progn
              (setq b (CL:hangerBack outW hgt))
              (drawRect "HANGER_HOLE" (+ cncX (nth 0 b)) (+ cncY (nth 1 b))
                        (+ cncX (nth 2 b)) (+ cncY (nth 3 b)))))
          (setq cncX (+ cncX outW odstep))

          ;; BACK-B - KIT_CORNER_L's own
          (setq cncX (+ cncX G))
          (drawCL_BACKB cncX cncY outD hgt G (strcat unitNum " BACK-B") (= mount "W"))
          (setq cncX (+ cncX (- outD G) odstep))

          ;; SHELF-L, turned (KIT_CORNER_L section 10)
          (setq i 1)
          (while (<= i numShelves)
            (drawCL_LBOARD_ROT90 cncX cncY nomShelf nil relShelf (strcat unitNum "-S" (itoa i)) G)
            (setq cncX (+ cncX (cadr (nth 5 nomShelf)) odstep))
            (setq i (1+ i)))

          ;; LEAF A = COMMON's drawFRONT, hinge "L" (SIDE-A is the left side
          ;; seen from the room; back face up, its cups land at the drawn
          ;; right), cups at the carcass rows; then the bi-fold plate marks at
          ;; its free edge, the drawn left.
          (setq cncX (+ cncX 100.0))
          (drawFRONT cncX cncY lenA leafH unitNum (strcat unitNum "-DOOR-A") "L" rows)
          (drawCLB_PLATESA cncX cncY rows)
          (setq cncX (+ cncX lenA odstep))

          ;; LEAF B: outline, no carcass cups, the bi-fold cups gated
          (drawCLB_LEAFB cncX cncY lenB leafH rows unitNum)
          (setq cncX (+ cncX lenB odstep))

          ;;;========================================
          ;;; SUMMARY TEXT BLOCK
          ;;;========================================
          (setq census (CLB:census rows))
          (setq sumX (+ cncX 500.0))
          (setq sumY (+ cncY hgt))
          (setq lineH 30.0)

          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "UNIT: " unitNum " (L CORNER, BI-FOLD DOOR, "
                    (cond ((= mount "W") "WALL") ((= mount "X") "WARDROBE") (T "BASE")) ")"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "CARCASS: KIT_CORNER_L's boards; SIDE-B without plate holes")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "1. " unitNum "-DOOR-A: " (rtos lenA 2 1) " x " (rtos leafH 2 0) " (on SIDE-A, wide family)"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "2. " unitNum "-DOOR-B: " (rtos lenB 2 1) " x " (rtos leafH 2 0) " (on DOOR-A, bi-fold)"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH (strcat "LEAVES: " (itoa (nth 0 census))))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "CARCASS HINGES (A only): " (itoa (nth 1 census)) " x CLIP top "
                    (rtos wideDeg 2 0) " (derived from FD " (rtos frontT 2 0) ")"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "BI-FOLD HINGES (B on A): " (itoa (nth 2 census)) " x " CLB:article
                    " (" (rtos CLB:bifoldAngle 2 0) " deg), plates 0 or 3 mm"))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH
            (strcat "BI-FOLD HOLES: " (itoa (nth 3 census))
                    (if (CLB:patternReady) " (p.117 pattern)" " (p.117 null: a line and a body)")))
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextL "SUMMARY" sumX sumY lineH "---------")
          (setq sumY (- sumY (* lineH 2.5)))
          (drawTextLC "SUMMARY" sumX sumY lineH "FOLD: A swings on the carcass, B folds with it" 6)
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextLC "SUMMARY" sumX sumY lineH
            (strcat "B's far end into the room (sense " (rtos CLB:foldSense 2 0) "), owner confirms on screen") 6)
          (setq sumY (- sumY (* lineH 1.2)))
          (drawTextLC "SUMMARY" sumX sumY lineH "numbers: blum-hinges.json p.116/117, owner to confirm" 6)
          (setq sumY (- sumY (* lineH 2.0)))
          (drawTextLC "SUMMARY" sumX sumY lineH "Property of Skylon Joinery" 6)

          (setq cncDone T)
          (princ "\nCNC panels generated."))))) ;; closes: getpoint progn, cncPt if, drawCNC progn, drawCNC if

  ;; Restore state
  (if _oldClayer  (setvar "CLAYER"  _oldClayer))
  (if _oldOsmode  (setvar "OSMODE"  _oldOsmode))
  (if _oldCmdecho (setvar "CMDECHO" _oldCmdecho))
  (setq *error* _olderr)

  (setq census (CLB:census rows))
  (princ (strcat "\nCORNER_L_BIFOLD " unitNum " - Done! ("
                 (cond ((= mount "W") "wall") ((= mount "X") "wardrobe") (T "base")) ")"))
  (princ (strcat "\n  L: " (rtos outW 2 0) " x " (rtos outD 2 0) ", arms " (rtos armD 2 0)
                 " deep, H " (rtos hgt 2 0) "mm, G=" (rtos G 2 0) "mm, front " (rtos frontT 2 0) "mm"))
  (princ (strcat "\n  Leaf A " (rtos lenA 2 1) " x " (rtos leafH 2 0) " on SIDE-A (" (rtos wideDeg 2 0)
                 "), leaf B " (rtos lenB 2 1) " x " (rtos leafH 2 0) " on leaf A (" CLB:article ")"))
  (princ (strcat "\n  Census: leaves " (itoa (nth 0 census)) ", carcass hinge rows (A) " (itoa (nth 1 census))
                 ", bi-fold hinges (B) " (itoa (nth 2 census)) ", bi-fold holes " (itoa (nth 3 census))
                 ", CNC: " (if (= drawCNC "Y") "Yes" "No")))
  (princ))

(princ "\nKIT_CORNER_L_BIFOLD loaded. Type CORNER_L_BIFOLD to run.")
(princ)
