;;;========================================
;;; KIT_LED_GROOVE.lsp
;;; The groove an LED line sits in — Skylon Joinery
;;; Version 1.1  ·  turn 45 (CLAUDE.md F9-CNC), turn 48 (F4: the end extra)
;;; Load AFTER SKYLON_COMMON.lsp
;;;========================================
;;;
;;; CLAUDE.md iron rule 3, 23.08.2026:
;;;
;;;   "LISP is law (F9-CNC only): the LED groove is born in reference/lisp/
;;;    first, application follows. Paren balance 0/0 by script. No other kit is
;;;    touched."
;;;
;;; So this file is the DEFINITION and the application follows it, not the
;;; other way round. `src/lib/ledGroove.js` cuts exactly the rectangle
;;; `drawLedGroove` draws here, on exactly the layer `ledMakeLayers` declares,
;;; and test/turn45-f9-cnc-the-groove.test.js holds the two to each other.
;;;
;;; It is a NEW FILE and it touches no other kit: SKYLON_COMMON.lsp,
;;; KIT_BUD_FULL.lsp and the nine others are byte-for-byte what they were.
;;; `drawRect` below is COMMON's own — this file adds a layer and a rule, not a
;;; second way to draw a rectangle.
;;;
;;;========================================
;;; WHAT THE GROOVE IS
;;;========================================
;;;
;;; A flexible LED strip is 4 mm wide and is pressed into a 4 mm slot cut in
;;; the face of the board it lights from. An aluminium channel is screwed into
;;; a wider one, and how wide is the router's business — the joiner types it on
;;; settings tab 5.6 and it arrives here as `width`.
;;;
;;; The slot runs the LENGTH of the line and is `width` across. It is a POCKET,
;;; not a profile: the cutter stays in the board. Its depth is the workshop's
;;; own — the machine's program owns Z, and this drawing owns X and Y, which is
;;; how every other pocket in this kit is drawn (see PUZZLE_SOCKET in COMMON).
;;;
;;; ONE RULE, STATED ONCE: the groove is centred on the line. A line placed
;;; 80 mm back from the front edge has its groove centred at 80, running from
;;; 80 − width/2 to 80 + width/2 — never from 80 to 80 + width, which would put
;;; the light 2 mm off where the eye was told it would be.
;;;
;;;========================================
;;; A SECOND RULE — TURN 48 (CLAUDE.md F4)
;;;========================================
;;;
;;; The owner, 25.08.2026:
;;;
;;;   "LED groove: dluzszy niz profil o 10 mm z KAZDEJ strony … zaokraglenie
;;;    bita, nikt nie chce uzywac dlutka na rogach."
;;;
;;; THE SLOT IS LONGER THAN THE PROFILE BY `ledGrooveEndExtra` AT EACH END, so
;;; +20 mm overall, and the reason is the CUTTER and not a tolerance. A router
;;; bit is round. A pocket cut to the profile's exact length ends in two radii,
;;; and an aluminium channel — or a strip with an end cap on it — is square. The
;;; joiner is then holding a chisel in front of a finished carcass, squaring two
;;; corners by hand, on every board with a light in it. Ten millimetres of
;;; overrun at each end puts the radius PAST the profile, where nothing has to
;;; sit, and the channel drops in.
;;;
;;; It is a LENGTH rule and only a length rule: the slot's WIDTH is untouched,
;;; and so is the centreline. A groove that grew sideways would move the light.
;;;
;;;========================================
;;; A. THE LAYER
;;;========================================
;;;
;;; ACI 44 is unused by the LISP's own table and by every layer
;;; src/engine/cnc/layers.js declares, so nothing this kit or the app already
;;; draws changes colour in AutoCAD.
;;;
;;; ONE NAME for both modes, deliberately. The house grammar is
;;; {FEATURE}_{DIAMETER}MM and a 4 mm flexi slot would be LED_GROOVE_4MM by it —
;;; but a channel's width is a per-project number, so that grammar would give
;;; the machine a layer name that changed from job to job and a tool mapping
;;; that had to be redone every time. The WIDTH is in the geometry, where a
;;; router reads it; the NAME is the operation, which is what VCarve maps.

(defun ledMakeLayers ( / )
  (command "._LAYER" "_N" "LED_GROOVE" "_C" "44" "LED_GROOVE" "")
)

;;;========================================
;;; A2. THE END EXTRA — turn 48 (CLAUDE.md F4)
;;;========================================
;;;
;;; NAMED, not typed twice. `src/lib/ledGroove.js` reads this number out of the
;;; law rather than restating it, and `test/turn45-f9-cnc-the-groove.test.js`
;;; parses this very line off disk and holds the two to each other — so a
;;; workshop that runs a bigger bit changes 10.0 HERE and the application
;;; follows, exactly as `ledFlexiWidth` below already works.

(defun ledGrooveEndExtra ( / ) 10.0)

;;;========================================
;;; B. ONE GROOVE
;;;========================================
;;;
;;; Drawn in the PANEL's own 2D frame, millimetres, exactly as every other CNC
;;; feature in this kit is: x and y are the board lying on the bed.
;;;
;;;   x1 y1 x2 y2  the LINE the LED runs along, centre to centre — the
;;;                PROFILE's own two ends, not the slot's
;;;   width        4 for a flexi strip, or the channel's slot
;;;
;;; Only the two runs a board can actually carry are drawn — along x, or along
;;; y. A diagonal LED strip is not a thing a carcass has, and a rule that
;;; pretended to cut one would be a rule nobody could check.
;;;
;;; TURN 48 (F4): the slot RUNS PAST the profile by `ledGrooveEndExtra` at each
;;; end — see A2. `min`/`max` rather than "x1 first": a line is handed over in
;;; whichever order the caller holds it, and subtracting the extra from x1 when
;;; x1 is the far end would SHORTEN the pocket by 20 instead of growing it.

(defun drawLedGroove (x1 y1 x2 y2 width / half extra lo hi)
  (setq half (/ width 2.0))
  (setq extra (ledGrooveEndExtra))
  (if (equal y1 y2 0.001)
    ;; a run ALONG X: the slot is `width` tall, centred on the line, and 10 mm
    ;; longer than the profile at each end
    (progn
      (setq lo (- (min x1 x2) extra))
      (setq hi (+ (max x1 x2) extra))
      (drawRect "LED_GROOVE" lo (- y1 half) hi (+ y1 half))
    )
    ;; a run ALONG Y: the slot is `width` wide, centred on the line, and the
    ;; same 10 mm past each end
    (progn
      (setq lo (- (min y1 y2) extra))
      (setq hi (+ (max y1 y2) extra))
      (drawRect "LED_GROOVE" (- x1 half) lo (+ x1 half) hi)
    )
  )
)

;;;========================================
;;; C. EVERY GROOVE ON ONE PANEL
;;;========================================
;;;
;;; `lines` is a list of (x1 y1 x2 y2), one per LED line placed on this board.
;;;
;;; GATED ON LINES EXISTING — CLAUDE.md's own word, and the reason the six
;;; standard configs do not move a byte this turn: a panel with no line gets no
;;; layer, no rectangle and no change of any kind. The `if` below is that gate,
;;; and it is the first thing this function does.

(defun ledGrooveOnPanel (lines width / ln)
  (if lines
    (progn
      (ledMakeLayers)
      (foreach ln lines
        (drawLedGroove (nth 0 ln) (nth 1 ln) (nth 2 ln) (nth 3 ln) width)
      )
    )
  )
)

;;;========================================
;;; D. THE TWO WIDTHS, NAMED
;;;========================================
;;;
;;; The flexi slot is 4 because the strip is 4. A channel's is whatever the
;;; joiner typed. Stated here so the kit and the application cannot disagree
;;; about the one number the cutter is set to.
;;;
;;; (The LENGTH's own number is `ledGrooveEndExtra`, in section A2 — it is a
;;; different question from how wide the cutter is and it is asked once.)

(defun ledFlexiWidth ( / ) 4.0)

(defun ledGrooveWidth (mode channelWidth / )
  (if (= mode "channel") channelWidth (ledFlexiWidth))
)

(princ "\nKIT_LED_GROOVE.lsp loaded — LED_GROOVE layer, ledGrooveEndExtra, drawLedGroove, ledGrooveOnPanel.")
(princ)
