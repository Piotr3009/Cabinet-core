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
;;;
;;; A rebate along the TOP inside edge of a rail: `w` wide (the pane's bearing)
;;; and running the rail's whole length. The pane drops onto it and lifts out
;;; with a fingernail, which is decision 1 and the reason there is no bead.
;;;
;;; It is drawn on the rail's own board, along x, because that is how a rail
;;; lies on the bed. `y` is the rail's inside edge on that board.

(defun drawWatchGlassRebate (x1 x2 y w / )
  (drawRect "WATCH_GLASS_REBATE" x1 y x2 (+ y w))
)

;;;========================================
;;; E. THE LED, AIMED AT THE WATCHES (decision 2)
;;;========================================
;;;
;;; KIT_LED_GROOVE's own `drawLedGroove` cuts it, on KIT_LED_GROOVE's own layer,
;;; to KIT_LED_GROOVE's own law - INCLUDING the T48 rule that the slot runs
;;; `ledGrooveEndExtra` (10 mm) PAST the profile at each end so a round bit
;;; leaves no corner for a chisel. There is no second groove rule in this file
;;; and there must never be one.
;;;
;;; WHERE it goes is this file's business and it is decision 2: the INNER face
;;; of the front rail, BELOW the glass rebate, so the strip fires back and down
;;; across the pockets. A groove in the rail's top face would light the pane.
;;;
;;; `railLen` is the rail's own length and `yBelow` how far under the rebate the
;;; line runs.

(defun drawWatchLed (railLen yBelow width / )
  (drawLedGroove 0.0 yBelow railLen yBelow width)
)

;;;========================================
;;; F. IS THE DRAWER DEEP ENOUGH TO TAKE ONE?
;;;========================================
;;;
;;; CLAUDE.md: "Report in Check when a drawer is too shallow to take the insert
;;; rather than shipping a squashed one."
;;;
;;; The tray stands on the drawer's own bottom, so what it needs is its BASE
;;; plus the owner's 60 of inside depth plus a hair of air over the glass. A
;;; drawer with less inside height than that is REPORTED and the insert is not
;;; cut - the same honesty `SKY:cupTooThin` keeps about a front too thin for a
;;; cup.

(defun SKY:watchInsertHeight (baseT insideD)
  (+ baseT insideD)
)

(defun SKY:watchDrawerTooShallow (clearH baseT insideD keep)
  (< clearH (+ (SKY:watchInsertHeight baseT insideD) keep))
)

(princ "\nKIT_WATCH_DRAWER.lsp loaded — WATCH_DIVIDER_SLOT / WATCH_GLASS_REBATE, SKY:watchPocketCount, SKY:watchDividerXs, drawWatchSlots, drawWatchGlassRebate, drawWatchLed.")
(princ)
