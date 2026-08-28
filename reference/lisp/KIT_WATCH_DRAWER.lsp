;;;========================================
;;; KIT_WATCH_DRAWER.lsp
;;; The watch/tie INSERT that drops into a standard drawer — Skylon Joinery
;;; Version 1.0  ·  turn 52 (CLAUDE.md F5)
;;; Load AFTER SKYLON_COMMON.lsp and KIT_LED_GROOVE.lsp
;;;========================================
;;;
;;; CLAUDE.md iron rule 3, 26.08.2026:
;;;
;;;   "LISP IS LAW — FIRST for F4 and F5. Dog-bone counts and the insert's
;;;    geometry are cut on the machine, so they are born in reference/lisp/
;;;    before any JS."
;;;
;;; So this file is the DEFINITION and `src/engine/watchDrawer.js` follows it.
;;; `test/turn52-f5-the-watch-drawer.test.js` parses this file off disk and
;;; holds the two to each other, exactly as T48 does for the LED groove.
;;;
;;; It is a NEW FILE and it touches no other kit. `drawRect` is COMMON's own and
;;; `drawLedGroove` is KIT_LED_GROOVE's own — this file adds two layers and a
;;; set of rules, not a second way to draw a rectangle or a second groove.
;;;
;;;========================================
;;; WHAT THIS IS, AND WHAT IT IS NOT
;;;========================================
;;;
;;; The owner, 26.08.2026:
;;;
;;;   "szuflada z przegrodkami na zegarki, krawaty etc ... szklo i podswietlenie
;;;    ... rama z Eggera ale podswietlone zegarki ... oczywiscie szuflada nasza
;;;    standardowa, tylko przegrodki z 9 mm zrob, i szuflada plytka w srodku,
;;;    mysle ze okolo 60 mm."
;;;
;;; "SZUFLADA NASZA STANDARDOWA" — so this is an INSERT and not a new drawer.
;;; The BOX is untouched: same sides, same box front and back, same bottom, same
;;; runners, same holes. The insert is a tray that drops into it, and it is its
;;; own BOM line (decision 3, below) so a customer can have it in ONE drawer of
;;; six.
;;;
;;; NOTHING IN THIS FILE TOUCHES THE DRAWER BOX. Every rectangle drawn here is
;;; cut in a piece that did not exist before it.
;;;
;;;========================================
;;; THE NUMBERS, AND WHERE THEY COME FROM
;;;========================================
;;;
;;;   DIVIDER STOCK 9 mm      the owner: "przegrodki z 9 mm zrob"
;;;   INSIDE DEPTH  60 mm     the owner: "szuflada plytka w srodku, mysle ze
;;;                           okolo 60 mm". The trade standard is about 50 for a
;;;                           watch pocket; 60 carries a chronograph and a
;;;                           lining, which is why he is right to say 60.
;;;   POCKET        about 110 deep x 95 wide. A watch CASE runs 30-48 mm across,
;;;                           so a pocket must NEVER fall below 60 mm clear -
;;;                           that is the floor, and the count is what gives
;;;                           way to keep it.
;;;
;;; THE COUNT FOLLOWS THE WIDTH, NEVER A FIXED FIVE. Five pockets is what an
;;; insert of about 500 mm inside width comes out at with the numbers above
;;; (5 x 95 + 4 x 9 = 511), which is a 600 mm drawer. A 900 mm drawer gets
;;; EIGHT by the same rule, and that is the point of having a rule.
;;;
;;;========================================
;;; ONE ROW OF POCKETS, AT THE FRONT
;;;========================================
;;;
;;; CLAUDE.md: "ONE row of pockets, at the FRONT. Behind it, long sections for
;;; ties, cufflinks and straps. Three rows of pockets is a known mistake: the
;;; back row cannot be reached once the drawer is in."
;;;
;;; So the tray is divided ONCE across its depth - a rail at `pocketDepth` from
;;; the front - and the pockets are the strip in front of that rail. Behind it
;;; the same tray is divided into a small number of LONG sections, which is what
;;; a tie or a strap actually wants: length, not a pocket.
;;;
;;;========================================
;;; THE THREE DECISIONS TAKEN FOR THE OWNER
;;;========================================
;;;
;;; He was asked and left. CLAUDE.md writes them at the top of F5 for him to
;;; veto in one line, and they are law here until he does:
;;;
;;;   1. THE GLASS LIFTS OUT. A fixed pane looks better and makes a watch
;;;      unreachable without opening the whole drawer; a lift-out pane is what a
;;;      joiner would fit. So the glass sits in a REBATE in the top of the
;;;      frame - drawn here - and nothing holds it down.
;;;   2. THE LED LIGHTS THE WATCHES, not the glass. Lighting the pane makes a
;;;      shop display; lighting the contents makes a wardrobe. So the groove is
;;;      cut in the INNER face of the frame's front rail, BELOW the glass
;;;      rebate, and the strip fires back across the pockets.
;;;   3. THE INSERT IS ITS OWN BOM LINE, addable to any drawer - not a drawer
;;;      type.
;;;
;;;========================================
;;; A. THE LAYERS
;;;========================================
;;;
;;; ACI 41 and 42 are unused by this folder's own table and by every layer
;;; src/engine/cnc/layers.js declares, so nothing already drawn changes colour.
;;;
;;; The house grammar is {FEATURE}_{DIAMETER}MM where a diameter exists. A
;;; divider slot's width is the divider's stock - a per-project number - and a
;;; glass rebate's is the pane's, so both are named for the OPERATION and carry
;;; their size in the geometry, which is the reason KIT_LED_GROOVE gives for
;;; LED_GROOVE and is the same reason.

(defun watchMakeLayers ( / )
  (command "._LAYER" "_N" "WATCH_DIVIDER_SLOT" "_C" "41" "WATCH_DIVIDER_SLOT" "")
  (command "._LAYER" "_N" "WATCH_GLASS_REBATE" "_C" "42" "WATCH_GLASS_REBATE" "")
  ;; T53 (F8b): the pane is IN THE SHELF above now, so the shelf carries a
  ;; through cut as well as the rebate round it. Two operations, two layers -
  ;; a cut-out and a rebate are different tools and a machine must not have to
  ;; guess which from a depth.
  (command "._LAYER" "_N" "WATCH_GLASS_OPENING" "_C" "43" "WATCH_GLASS_OPENING" "")
)

;;;========================================
;;; B. HOW MANY POCKETS
;;;========================================
;;;
;;; `innerW`  the clear width INSIDE the tray's own frame
;;; `target`  the pocket width the workshop aims at (95)
;;; `t`       the divider stock (9)
;;; `minW`    the floor a pocket may never fall below (60)
;;;
;;; n pockets take (n - 1) dividers between them - the frame's own two sides are
;;; the outer walls and are not dividers - so
;;;
;;;     pocket = (innerW - (n - 1) * t) / n
;;;
;;; The count is the one that lands NEAREST the target, and then it gives way
;;; until the pocket clears `minW`. Giving way DOWNWARDS is the whole of it: a
;;; watch case is 30-48 across and a pocket under 60 will not take one, so
;;; fewer, bigger pockets is the only direction the rule may move in.
;;;
;;; AutoLISP has no `round`, so the nearest integer is `(fix (+ x 0.5))` - the
;;; same idiom this folder uses everywhere a count is derived.

(defun SKY:watchPocketWidth (innerW n t)
  (if (> n 0) (/ (- innerW (* (- n 1) t)) (float n)) 0.0)
)

(defun SKY:watchPocketCount (innerW target t minW / n)
  (setq n (fix (+ (/ (+ innerW t) (+ target t)) 0.5)))
  (if (< n 1) (setq n 1))
  (while (and (> n 1) (< (SKY:watchPocketWidth innerW n t) minW))
    (setq n (- n 1))
  )
  n
)

;;; The x of each DIVIDER's near face, measured from the inside of the frame's
;;; left rail. There are (n - 1) of them and they are evenly spaced by
;;; construction: pocket, divider, pocket, divider ... pocket.

(defun SKY:watchDividerXs (innerW n t / w out i)
  (setq w (SKY:watchPocketWidth innerW n t) out '() i 1)
  (while (< i n)
    (setq out (append out (list (+ (* i w) (* (- i 1) t)))))
    (setq i (1+ i))
  )
  out
)

;;;========================================
;;; C. THE SLOTS THE DIVIDERS STAND IN
;;;========================================
;;;
;;; Drawn in the PANEL's own 2D frame, millimetres, exactly as every other CNC
;;; feature in this folder is: x and y are the board lying on the bed.
;;;
;;; A slot is a POCKET `t` wide and `depth` deep, running the full height of the
;;; wall it is cut in. The cutter stays in the board; the machine's program owns
;;; Z, which is the same division of labour PUZZLE_SOCKET keeps in COMMON.
;;;
;;; `x` is the divider's NEAR face, as `SKY:watchDividerXs` reports it, so the
;;; slot runs x .. x + t and the divider drops in without a shuffle.

(defun drawWatchSlot (x y1 y2 t / )
  (drawRect "WATCH_DIVIDER_SLOT" x y1 (+ x t) y2)
)

;;; Every divider slot in one rail. `xs` is `SKY:watchDividerXs`' own list, and
;;; `x0` is where the frame's inside face starts on this board.

(defun drawWatchSlots (x0 y1 y2 t xs / x)
  (if xs
    (progn
      (watchMakeLayers)
      (foreach x xs (drawWatchSlot (+ x0 x) y1 y2 t))
    )
  )
)

;;;========================================
;;; D. THE REBATE THE GLASS LIFTS OUT OF (decision 1)
;;;========================================
;;; D+E. THE GLASS AND THE LED - RE-SPECIFIED BY THE OWNER (turn 53, F8)
;;;========================================
;;;
;;; THE ONE SANCTITY LICENCE OF THE NIGHT, and it is his own words that spend
;;; it. 27.08.2026:
;;;
;;;   "...i wtedy opcja: dodac szybe ponad szuflada - wtedy wycinamy w polce
;;;    otwor, offset od polki na 50 mm, i wstawiamy szybe w ten otwor. i dookola
;;;    tej szyby masz LED od spodu, offset okolo 15 mm na LED."
;;;
;;; T52's `drawWatchGlassRebate` (a rebate in the top of all four rails) and
;;; `drawWatchLed` (a groove in the inner face of the front rail) are REMOVED,
;;; because the pane and the strip are no longer on the tray at all: they are on
;;; the SHELF ABOVE it. Both are accounted for here rather than deleted in
;;; silence, and the T52 rule they carried - THE LED LIGHTS THE WATCHES, NOT
;;; THE GLASS - is not overturned. It is relocated: the strip now fires DOWN
;;; from the shelf's underside onto the watches, which is the same law from
;;; above.
;;;
;;; THE OPENING, in the SHELF's own board frame: inset `off` (50) from all four
;;; edges. DECISION TAKEN for the owner, veto in one line: the pane sits FLUSH
;;; WITH THE SHELF TOP, so the rebate is exactly the glass thickness - a proud
;;; pane on a wardrobe shelf catches every sleeve.

(defun SKY:watchShelfOpening (szer gleb off)
  (list off off (- szer off) (- gleb off))
)

(defun drawWatchShelfOpening (szer gleb off glassT / o)
  (setq o (SKY:watchShelfOpening szer gleb off))
  ;; The cut-out itself...
  (drawRect "WATCH_GLASS_OPENING" (nth 0 o) (nth 1 o) (nth 2 o) (nth 3 o))
  ;; ...and the rebate round it, one glass thickness deep, so the pane finishes
  ;; level with the shelf.
  (drawRect "WATCH_GLASS_REBATE"
            (- (nth 0 o) glassT) (- (nth 1 o) glassT)
            (+ (nth 2 o) glassT) (+ (nth 3 o) glassT))
)

;;; THE LED RINGS THE GLASS FROM BELOW: on the shelf's UNDERSIDE, `led` (about
;;; 15) OUTSIDE the opening on every side, firing down onto the watches. Cut by
;;; KIT_LED_GROOVE's own `drawLedGroove`, to KIT_LED_GROOVE's own law -
;;; INCLUDING the T48 rule that the slot runs `ledGrooveEndExtra` past the
;;; profile at each end. There is no second groove rule in this file and there
;;; must never be one.

(defun SKY:watchShelfLedRing (szer gleb off led / o)
  (setq o (SKY:watchShelfOpening szer gleb off))
  (list (- (nth 0 o) led) (- (nth 1 o) led) (+ (nth 2 o) led) (+ (nth 3 o) led))
)

(defun drawWatchShelfLed (szer gleb off led width / r)
  (setq r (SKY:watchShelfLedRing szer gleb off led))
  (drawLedGroove (nth 0 r) (nth 1 r) (nth 2 r) (nth 1 r) width)
  (drawLedGroove (nth 0 r) (nth 3 r) (nth 2 r) (nth 3 r) width)
  (drawLedGroove (nth 0 r) (nth 1 r) (nth 0 r) (nth 3 r) width)
  (drawLedGroove (nth 2 r) (nth 1 r) (nth 2 r) (nth 3 r) width)
)

;;;========================================
;;; G. THE FOUR LAYOUTS (turn 53, F8e)
;;;========================================
;;;
;;;   "i dodajesz do opcji kilka zaproponowanych i zaprojektowanych ukladow na
;;;    te zegarki i krawaty i paski - otwiera sie nowy modal z 4 propozycjami
;;;    rozmieszczenia."
;;;
;;; ALL FOUR KEEP THE T52 HARD LAW: one pocket row, at the FRONT, because the
;;; back row cannot be reached once the drawer is in. What varies is the REAR
;;; FIELD, and only that.
;;;
;;;   classic    4 long sections (ties / straps) - T52's own, unchanged
;;;   cufflinks  a 2-row grid of small cells (~70) plus one long section behind
;;;   ties       5-6 narrow long sections, for ties laid flat
;;;   belts      two wide channels (~110, rolled belts) plus a shallow tray
;;;
;;; The variant answers TWO numbers about the rear field - how many across, and
;;; how many rows deep - and everything else is the pocket rule already written
;;; above. A variant is therefore a pair, never a second geometry.

(defun SKY:watchRearField (variant innerW t / )
  (cond
    ((= variant "cufflinks") (list (SKY:watchPocketCount innerW 70.0 t 55.0) 2 T))
    ((= variant "ties")      (list (SKY:watchPocketCount innerW 150.0 t 60.0) 1 nil))
    ((= variant "belts")     (list (SKY:watchPocketCount innerW 110.0 t 60.0) 1 T))
    (T                       (list (SKY:watchPocketCount innerW 220.0 t 60.0) 1 nil))
  )
)

(defun SKY:watchInsertHeight (baseT insideD)
  (+ baseT insideD)
)

(defun SKY:watchDrawerTooShallow (clearH baseT insideD keep)
  (< clearH (+ (SKY:watchInsertHeight baseT insideD) keep))
)

(princ "\nKIT_WATCH_DRAWER.lsp loaded - WATCH_DIVIDER_SLOT / WATCH_GLASS_OPENING / WATCH_GLASS_REBATE, SKY:watchPocketCount, SKY:watchDividerXs, SKY:watchShelfOpening, SKY:watchShelfLedRing, SKY:watchRearField, drawWatchSlots, drawWatchShelfOpening, drawWatchShelfLed.")
(princ)
