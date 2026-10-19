;;; Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
;;; Proprietary and confidential. Unauthorised copying, modification,
;;; distribution or use, including by automated tools and AI systems,
;;; is strictly prohibited without prior written permission.
;;;========================================
;;; KIT_HANGER_TWO.lsp
;;; THE SECOND HANGING ROD - a MODIFIER on the KIT_WARDROBE boards: a second
;;; rod in the SAME bay, under the first, proposed 950 mm axis to axis
;;; Command: HANGERTWO_FULL
;;; Chat-fix 19.10.2026 (the owner's eye-test of T79) - LISP FIRST ("lisp najpierw")
;;; Derived from: KIT_WARDROBE_FULL.lsp (its rail routines are CALLED, never
;;;               copied) + SKYLON_COMMON.lsp
;;; Requires: SKYLON_COMMON.lsp and KIT_WARDROBE_FULL.lsp loaded first
;;;========================================
;;;
;;; THE OWNER, 19.10.2026 (09:16, on T79 F11 "the rail is alone"):
;;;
;;;   "nie ma mozliwosci dodania drugiego ponizej, dodaj to prosze, i
;;;    proponuj (jak polki) 950 jedne od drugiego"
;;;
;;; ...and his answer to "950 mm os do osi, drugi w tym samym bayu pod
;;; pierwszym?" (09:59): "tak ale tylko jako propozycja".
;;;
;;; UNTIL THIS FILE a carcass hung ONE rod across its width (KIT_WARDROBE_FULL,
;;; T42: a rod and its two bracket screws) and, since T32, one rod PER COLUMN
;;; of a divided carcass; a second rod in the same bay was refused by the
;;; application ("This unit already has a hanging rail"). The engine already
;;; cut a divided carcass's column rods as a LIST (one law per rod, each at
;;; its own height); this file states that the unit-wide bay takes a list too.
;;;
;;; This is a NEW FILE. It touches no other kit. drawCircle is COMMON's own;
;;; drawWardrobeRailHolesBUL and drawWardrobeRailHolesBUR are
;;; KIT_WARDROBE_FULL's own and are CALLED. The six fossil kits are untouched.
;;;
;;;========================================
;;; 1. THE LAW IN ONE PARAGRAPH
;;;========================================
;;;
;;; A bay may hang TWO rods. The second rod is cut exactly as the first: a
;;; rod across the bay's light, one bracket screw in each bounding board at
;;; its own axis (KIT_WARDROBE_FULL drawWardrobeRailHolesBUL / BUR), its own
;;; purchase line. Its height is its OWN item's number (pos_mm above its
;;; support, T42's grammar), never derived from the first rod's. What this
;;; file adds is a PROPOSAL, not a rule: when the second rod is added, and
;;; when either rod is dragged, the place offered is `between` millimetres
;;; (950, hardware.hanger.betweenRailsMm, PROPOSED, owner to confirm) under
;;; the other rod, axis to axis, as T79 F11 offers 50 mm under a shelf; the
;;; hand may refuse it (Alt, or dragging on). A third rod in one bay is
;;; refused in words.
;;;
;;;========================================
;;; 2. DECISIONS TAKEN FOR THE OWNER (each one line to veto)
;;;========================================
;;;
;;; D1  TWO AT MOST. The owner asked for "drugi"; a third in one bay is
;;;     refused: "This bay already hangs two rails." (PROPOSED)
;;; D2  THE SECOND IS BORN BELOW. Added, it lands `between` under the first
;;;     rod's axis; where that place is under the rod's floor (the rod's
;;;     radius above the bottom board, KIT_WARDROBE_FULL's own clamp) the
;;;     addition is refused in words: "No room for a second rail 950 mm under
;;;     this one; raise the first." Nothing is placed silently elsewhere
;;;     (room refuses first).
;;; D3  THE PROPOSAL IS A MAGNET, BOTH WAYS. Dragging a rod, the catch of T79
;;;     F11 (editor.shelfMagnetMm) offers the place `between` under AND over
;;;     every other rod of the same bay, beside the 50 under a shelf; the
;;;     nearest catch wins, Alt refuses all.
;;; D4  ONE LAW, ONE PATH. The second rod's axis, clamp, bracket screws and
;;;     BOM line are the first's routines at the second height (the engine:
;;;     the column-rail set with no column). No new hole pattern exists.
;;; D5  THE NUMBER LIVES IN THE PROFILE. hardware.hanger.betweenRailsMm 950;
;;;     the UI shows no field for it (numbers never typed into the UI).
;;;
;;;========================================
;;; 3. ROUTINES
;;;========================================

;;; The second rod's PROPOSED axis: `between` under the first rod's axis.
(defun hanger-two-axis (firstAxis between)
  (- firstAxis between))

;;; Does a rod at `axis` stand clear of the floor board? The rod's lowest point
;;; must clear the bottom board's top (g) by nothing less than 0: the same
;;; clamp KIT_WARDROBE_FULL applies to the first rod at the top.
(defun hanger-two-fits-p (axis g radius)
  (>= (- axis radius) g))

;;; The magnet's catches for a dragged rod at a bay whose other rods stand at
;;; `others` (axes): `between` under and over each one.
(defun hanger-two-catches (others between / out)
  (setq out nil)
  (foreach a others
    (setq out (cons (- a between) out))
    (setq out (cons (+ a between) out)))
  (reverse out))

;;; The nearest catch within `reach` of `axis`, or nil (T79 F11's applyMagnet).
(defun hanger-two-catch (axis catches reach / best)
  (setq best nil)
  (foreach c catches
    (if (and (<= (abs (- c axis)) reach)
             (or (null best) (< (abs (- c axis)) (abs (- best axis)))))
      (setq best c)))
  best)

;;; The bracket screws of the second rod: KIT_WARDROBE_FULL's own, at the
;;; second axis (railAbsY is the axis above the carcass bottom, as the first).
(defun hanger-two-holes (x0BUL x0BUR y0 szer railAbsY)
  (drawWardrobeRailHolesBUL x0BUL y0 szer railAbsY)
  (drawWardrobeRailHolesBUR x0BUR y0 szer railAbsY))

;;;========================================
;;; 4. NUMBERS (the engine is held to these: test/chatfix-1910-hanger-two.test.js)
;;;========================================
;;;
;;; KIT_WARDROBE_FULL: W 600, H 2150, D 568, G 18. The first rod ALONE at its
;;; default, railOffset 1400 above the bottom board's top (support 18): axis
;;; 1418. The second, born below: axis 1418 - 950 = 468 (its own pos_mm 450).
;;;   bracket screws   BUL and BUR, x = sideW / 2 = 275 (sideW 550), y 1418 and y 468,
;;;                    dia 3 on SCREWS_3MM: 2 per side, 4 in all
;;;   fits             468 - 15 (radius, rail diameter 30) = 453 >= 18: yes
;;;   BOM              Hanging rail x 2, 564 mm each (the bay's light W - 2G)
;;;   catches          a rod dragged with the other at 1418: 468 and 2368 (over
;;;                    the top: the kit's own clamp holds it under 2132 - 50);
;;;                    with the other at 468: 1418 and -482 (under the floor:
;;;                    never caught, the travel ends at the floor)
;;; The first rod too low for a second: first at axis 900 (pos 882): 900 - 950
;;; = -50, (- -50 15) < 18: REFUSED, "No room for a second rail 950 mm under
;;; this one; raise the first."
;;; A THIRD rod: REFUSED, "This bay already hangs two rails."

;;;========================================
;;; 5. THE COMMAND (draws what section 3 returns, nothing more)
;;;========================================

(defun c:HANGERTWO_FULL (/ firstAxis between axis g radius)
  (setq firstAxis (getreal "\nFirst rod axis above the carcass bottom <1418>: "))
  (if (null firstAxis) (setq firstAxis 1418.0))
  (setq between (getreal "\nBetween the rods, axis to axis <950>: "))
  (if (null between) (setq between 950.0))
  (setq g 18.0 radius 15.0)
  (setq axis (hanger-two-axis firstAxis between))
  (if (hanger-two-fits-p axis g radius)
    (princ (strcat "\nSecond rod proposed at " (rtos axis 2 0) " above the carcass bottom."))
    (princ "\nNo room for a second rail under this one; raise the first."))
  (princ))
