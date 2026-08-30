;;;========================================
;;; KIT_FRONT_JPULL.lsp
;;; The J-pull handleless edge — Skylon Joinery
;;; Version 1.0  ·  turn 57 (CLAUDE.md F1)
;;; Load AFTER SKYLON_COMMON.lsp
;;;========================================
;;;
;;; CLAUDE.md iron rule, 30.08.2026:
;;;
;;;   "LISP IS LAW. New geometry is written in reference/lisp/ FIRST; the
;;;    engine follows. Paren census grows to 14/14 at 0/0."
;;;
;;; So this file is the DEFINITION and `src/engine/handles.js` follows it, not
;;; the other way round. It is a NEW FILE and it touches no other kit:
;;; SKYLON_COMMON.lsp, KIT_LED_GROOVE.lsp and the eleven others are
;;; byte-for-byte what they were. `drawLine`, `drawArc` and `drawText` below
;;; are COMMON's own — this file adds a layer and a law, not a second way to
;;; draw a line.
;;;
;;;========================================
;;; THE DOCTRINE, CORRECTED IN THE OPEN
;;;========================================
;;;
;;; There are TWO AXES and they are never merged:
;;;
;;;   FACE PATTERN   slab, shaker, grooved, ...   what the front LOOKS like
;;;   HANDLE SYSTEM  handle, knob, none, J-PULL   how the front is HELD
;;;
;;; A grooved door with a J edge has to be possible, and it is only possible
;;; if the two are separate. So a J-PULL IS A HANDLE SYSTEM. It is not a face
;;; pattern, it does not live in a pattern registry, and the engine reads it
;;; off the handle chain — `src/engine/handles.js`, the module that has owned
;;; "how is this front gripped" since turn 25.
;;;
;;; This is stated here, in the law, because it was nearly got wrong: a
;;; `jpull` id was once reserved on the PATTERN axis. Reserving it there would
;;; have made "shaker AND J-pull" unsayable, which is a kitchen the owner
;;; sells. The reservation is void; the axis is the handle axis.
;;;
;;;========================================
;;; WHAT A J-PULL IS
;;;========================================
;;;
;;; A J-pull is a PROFILE machined along one edge of a door leaf or a drawer
;;; front. Seen in section, the board's edge becomes a hook: a thin lip stands
;;; forward, a finger slot runs back behind it, and the back face is relieved
;;; so the hand can get in. The door is opened by that slot. There is no
;;; handle, no knob and no hole in the front at all.
;;;
;;; IT IS A SHAPER PASS, NOT A CUT PATH. The section above is cut by a
;;; FORM TOOL — a shaped cutter that carries the whole profile in one pass —
;;; and the machine's program owns the tool and owns Z. This drawing owns
;;; WHICH EDGE and HOW FAR ALONG IT, exactly as KIT_LED_GROOVE owns a groove's
;;; x and y and leaves the depth to the workshop.
;;;
;;; So the DXF carries the EDGE LINE (or, for a stopped run, that run's own
;;; span) and a note reading `J-PULL <EDGE>` — the same way a raked board
;;; carries its `CUT <beta> DEG` note and nothing else. NOBODY DRAWS THE
;;; PROFILE'S SECTION CURVES INTO THE CUT PATH. A polyline shaped like the
;;; letter J lying in the panel's own 2D frame is not a path any machine would
;;; run; it would be a picture of a section, drawn in the plane of the board,
;;; and the first joiner to send it to VCarve would cut a slot through his
;;; door.
;;;
;;;========================================
;;; THE PROFILE IS THE OWNER'S DRAWING
;;;========================================
;;;
;;; Measured off the owner's `J_hand.dxf` — an 18 mm board, sectioned at the
;;; edge. These numbers ARE the law and they are written here verbatim:
;;;
;;;   front lip        4.212 mm thick, standing 30 mm proud of the relieved
;;;                    back — the visible hook of the J
;;;   finger slot      10 mm wide, 40 mm deep from the edge, its bottom
;;;                    rounded r5 (so 45 mm from the edge to the arc's tangent)
;;;   rear leg         3.788 mm
;;;   rear relief      the back face cut down 30 mm from the edge — the
;;;                    finger clearance, and the same 30 the lip stands proud
;;;
;;; AND THE DRAWING CLOSES:
;;;
;;;   4.212 + 10 + 3.788 = 18.000
;;;
;;; That sum is the check on the whole section. A profile whose three parts do
;;; not add up to the board is a profile that eats into the next board or
;;; leaves a rib nobody drew; `jpullClosesOn` below asks the question in one
;;; line, and the engine's own test asks it of these very defuns.
;;;
;;;========================================
;;; WHICH EDGE — THE OWNER'S TABLE, VERBATIM LAW
;;;========================================
;;;
;;; kitchen BASE unit doors     the TOP edge, full width
;;; ALL drawer fronts           the TOP edge, full width
;;;
;;; kitchen WALL unit doors     NO J AT ALL. The owner, 30.08.2026:
;;;                             "na szafkach wiszacych nie rob J" — a wall
;;;                             door is gripped from BELOW, and "to juz robi
;;;                             program": the existing front geometry already
;;;                             leaves the hand what it needs. Zero machining,
;;;                             zero new extension logic invented. A wall door
;;;                             on a J-pull kitchen simply has nothing cut in
;;;                             it and nothing screwed to it.
;;;
;;; TALL doors                  (fridge housings, wardrobes) the VERTICAL edge
;;;                             on the OPENING side — the edge OPPOSITE the
;;;                             hinge. The hinge hand is already decided and
;;;                             already on the piece (`meta.hinge`), so the J
;;;                             is read off it and never decided a second time.
;;;                             Under a rake the hand is FORCED (T46/T55 law:
;;;                             hinges live on the full-height edge), and the
;;;                             J flips with it for free — one source, one
;;;                             decision.
;;;
;;; NEVER on a diagonal edge. A raked edge is a saw cut through the board's
;;; whole thickness; there is no material left there for a lip to stand on,
;;; and a form tool run along it would come out through the face. The
;;; resolver below can only ever answer TOP, L or R, which is that rule made
;;; unsayable rather than merely forbidden.
;;;
;;;========================================
;;; THE STOPPED RUN, AND WHY IT RAMPS ON AN ARC
;;;========================================
;;;
;;; A tall door does NOT take the J down its whole height. The owner,
;;; 30.08.2026: "500 mm, zaczyna sie od dolu frontu okolo 700 mm" — a run of
;;; 500 mm, starting about 700 mm up from the leaf's OWN bottom edge. That is
;;; where a standing hand falls, and a 2200 mm slot would be a 2200 mm dust
;;; trap.
;;;
;;; Both numbers are PROFILE PARAMETERS, not constants of the geometry:
;;; `jpullRunMm` and `jpullFromBottomMm` below, which the workshop tunes once
;;; and every tall door in every project follows.
;;;
;;; THE ENDS RAMP IN AND OUT ON AN ARC. The owner: "wjazd po luku, nie ostre,
;;; lukowate." This is the router's own lead-in and it is not decoration: a
;;; form tool plunged square at 700 mm leaves a vertical wall across the whole
;;; profile, which chips the lacquer, catches a sleeve and is impossible to
;;; sand. The cutter is walked in along a radius instead, so the profile
;;; grows out of the face and dies back into it.
;;;
;;; DECISION TAKEN for the owner, veto in one line: the ramp radius is
;;; `jpullRampR` = 25.0 mm, a PLACEHOLDER. The owner has said the routing
;;; itself comes later — "routerowanie bedziemy robic pozniej" — so this is
;;; the one number in the file that is a stand-in rather than a measurement,
;;; it is named so it can be changed in one place, and the morning report
;;; calls it out for him to tune.
;;;
;;;========================================
;;; A. THE LAYER
;;;========================================
;;;
;;; ACI 45 is unused by the LISP's own table (40 biscuit, 41 shaker pocket and
;;; watch divider, 42 handles and watch rebate, 43 hinge screws and watch
;;; opening, 44 LED groove) and by every layer src/engine/cnc/layers.js
;;; declares, so nothing this kit or the app already draws changes colour in
;;; AutoCAD.
;;;
;;; NAMED FOR THE OPERATION, not for a size. The house grammar is
;;; {FEATURE}_{DIAMETER}MM and the slot is 10 mm, so JPULL_10MM would be the
;;; obvious name — but the slot's width, the lip and the relief are all
;;; numbers the owner will tune, and a layer whose name moved with them would
;;; hand the machine a different layer on every job and a tool mapping that
;;; had to be redone each time. That is KIT_LED_GROOVE's own argument, and it
;;; applies here twice over. The SIZE is in the geometry and in the constants
;;; below, where a router reads it; the NAME is the operation, which is what
;;; VCarve maps.

(defun jpullMakeLayers ( / )
  (command "._LAYER" "_N" "JPULL_EDGE" "_C" "45" "JPULL_EDGE" "")
)

;;;========================================
;;; B. THE PROFILE, NAMED ONE NUMBER AT A TIME
;;;========================================
;;;
;;; Each of the owner's measurements is a zero-argument defun on ONE LINE, in
;;; the form `(defun name ( / ) value)`. That is not a style choice: it is the
;;; form `src/engine/profile.js` and the turn's test parse off this very file,
;;; exactly as `ledGrooveEndExtra` and `ledFlexiWidth` are already parsed. A
;;; workshop that runs a different cutter changes the number HERE and the
;;; application follows.

(defun jpullBoardT ( / ) 18.0)
(defun jpullLipT ( / ) 4.212)
(defun jpullSlotW ( / ) 10.0)
(defun jpullSlotDepth ( / ) 40.0)
(defun jpullSlotR ( / ) 5.0)
(defun jpullRearLeg ( / ) 3.788)
(defun jpullReliefMm ( / ) 30.0)

;;; …and the two the owner spoke as a sentence rather than as a measurement.
;;; They are the STOPPED RUN's, they belong to the tall door alone, and they
;;; are the two a joiner is most likely to want different.

(defun jpullRunMm ( / ) 500.0)
(defun jpullFromBottomMm ( / ) 700.0)

;;; The lead-in radius — the placeholder named in the preamble.

(defun jpullRampR ( / ) 25.0)

;;;----------------------------------------
;;; B2. THE DRAWING CLOSES — 4.212 + 10 + 3.788 = 18.000
;;;----------------------------------------
;;;
;;; Asked as a question rather than written as a comment, so that changing one
;;; of the three numbers and forgetting the others is a fault the law itself
;;; can report. `1e-6` and not `equal`'s default: these are millimetres to
;;; three decimals and a tolerance of 0.001 would let a tenth of a micron of
;;; nonsense through unnoticed for three turns.

(defun jpullClosesOn (boardT / sum)
  (setq sum (+ (jpullLipT) (jpullSlotW) (jpullRearLeg)))
  (equal sum boardT 1e-6)
)

;;;----------------------------------------
;;; B3. HOW DEEP THE TOOL REACHES
;;;----------------------------------------
;;;
;;; From the edge to the tangent of the slot's rounded bottom: 40 + 5 = 45.
;;; Stated as a routine and not as a fourteenth constant, because it is a
;;; CONSEQUENCE of two numbers above and a workshop that changed the slot
;;; depth and left a stale 45 behind would set the tool 5 mm shallow.

(defun jpullReachDepth ( / )
  (+ (jpullSlotDepth) (jpullSlotR))
)

;;;========================================
;;; C. WHICH EDGE — ONE FUNCTION, ONE ANSWER
;;;========================================
;;;
;;; The owner's table, made executable. `class` is the front's HANDLE CLASS —
;;; the same four words `handles.js handleClassOf` has answered with since
;;; turn 25, decided on the piece and its cabinet's mount and never on a list
;;; of ids — and `hinge` is the hand already on the piece ("L" or "R").
;;;
;;;   "wall-door"    nil   — the owner's "nie rob J", said as an absence
;;;   "horizontal"   "TOP" — every drawer front, and every front that drops
;;;   "base-door"    "TOP"
;;;   "tall-door"    the vertical edge OPPOSITE the hinge
;;;
;;; nil is a real answer here and the only honest one for a wall door: not
;;; "no edge yet", not a default, but "this front takes no J at all". The
;;; engine reads that nil and emits no machining and no handle either.
;;;
;;; THE OPPOSITE EDGE, and not "the right one": a door hinged on the room-LEFT
;;; opens from the room-RIGHT, and that is the edge the hand reaches for. It
;;; is one `if` and it is the whole of the tall-door rule, which is what makes
;;; the forced hand under a rake free — `meta.hinge` flips, and this flips
;;; with it without knowing a slope exists.

(defun SKY:jpullEdge (class hinge / )
  (cond
    ((= class "wall-door") nil)
    ((= class "horizontal") "TOP")
    ((= class "base-door") "TOP")
    ((= class "tall-door") (if (= hinge "R") "L" "R"))
    (T nil)
  )
)

;;;========================================
;;; D. HOW FAR ALONG — THE STOPPED RUN
;;;========================================
;;;
;;; A TOP-edge J runs the full width and there is nothing to decide. A TALL
;;; door's runs from `from` to `from + run` measured up the leaf's OWN bottom
;;; edge, and this is where the leaf's height gets a say.
;;;
;;; Returns a list (lo hi) in the leaf's own frame, or nil where the run
;;; cannot be placed at all.
;;;
;;; THREE ANSWERS, and the middle one is the one that matters:
;;;
;;;   leafH <= from            nil. There is no leaf above the start of the
;;;                            run. The engine REFUSES and says so; it does
;;;                            not slide the run down to make it fit, because
;;;                            a J at ankle height is not a handle.
;;;   from + run > leafH       CLAMPED to (from leafH). A 900 mm leaf under a
;;;                            rake gets the run it can hold, and the engine
;;;                            says in a Check line that it was shortened.
;;;   otherwise                (from  from+run), the owner's own 700 → 1200.
;;;
;;; The clamp is deliberate and the refusal is deliberate, and they are
;;; different: a run that is SHORTER than asked is still a working handle, and
;;; a run that starts above the top of the door is not a handle at all.

(defun SKY:jpullRun (leafH from run / hi)
  (setq hi (+ from run))
  (cond
    ((<= leafH from) nil)
    ((> hi leafH) (list from leafH))
    (T (list from hi))
  )
)

;;;========================================
;;; E. THE NOTE ON THE SHEET
;;;========================================
;;;
;;; `J-PULL TOP`, `J-PULL L`, `J-PULL R` — ASCII, upper case, on the
;;; UNIT_NUMBER layer, through `drawText`, exactly as a raked board's
;;; `CUT 59.9 DEG` is written. There is deliberately NO note layer of its own:
;;; the layer table is a tool mapping and a note is not a tool. (And no degree
;;; sign, ever, for the same R12 code-page reason the slope note has none.)
;;;
;;; A STOPPED run says so and gives its span, because the joiner reading the
;;; sheet has to know the cutter comes out again:
;;;
;;;   J-PULL R 700-1200

(defun jpullNote (edge span / )
  (if span
    (strcat "J-PULL " edge " "
      (rtos (nth 0 span) 2 0) "-" (rtos (nth 1 span) 2 0))
    (strcat "J-PULL " edge)
  )
)

;;;========================================
;;; F. DRAWING IT
;;;========================================
;;;
;;; In the PANEL's own 2D frame, millimetres, the board lying on the bed —
;;; the frame every CNC feature in this folder is drawn in.
;;;
;;;   w h        the panel, as it is cut
;;;   edge       "TOP", "L" or "R" — `SKY:jpullEdge`'s answer, never a guess
;;;   span       (lo hi) for a stopped run, or nil for the full edge
;;;
;;; WHAT IS DRAWN: the run's own LINE on JPULL_EDGE, its two lead-in ARCS
;;; where it is stopped, and the note. Nothing else. The line tells the
;;; machine where the form tool goes; the arcs tell it how to get in and out;
;;; the note tells the joiner what tool it is.
;;;
;;; THE ARCS ARE TANGENT TO THE EDGE and turn INTO the board — the cutter
;;; leaves the face and reaches full depth over `jpullRampR`, which is what
;;; "wjazd po luku" is. A quarter turn each end: 90 degrees, centred one
;;; radius inboard of the edge and one radius beyond the run's own end, so the
;;; arc meets the line exactly where the line stops.

(defun drawJpullEdge (w h edge span / r lo hi x y)
  (jpullMakeLayers)
  (setq r (jpullRampR))
  (if (= edge "TOP")
    ;; The full width, along the top edge. A drawer front and a base door
    ;; take the whole run and there is no lead-in: the tool enters off the
    ;; board at one end and leaves off it at the other.
    (progn
      (drawLine "JPULL_EDGE" 0.0 h w h)
      (drawText "UNIT_NUMBER" (/ w 2.0) (- h 12.0) 8.0 (jpullNote edge nil))
    )
    ;; A vertical edge — "L" at x = 0, "R" at x = w — over the run's span.
    (progn
      (setq x (if (= edge "R") w 0.0))
      (setq lo (if span (nth 0 span) 0.0))
      (setq hi (if span (nth 1 span) h))
      (drawLine "JPULL_EDGE" x lo x hi)
      ;; …and the two quarter-turn lead-ins, but only where the run actually
      ;; STOPS on the board. A run that reaches the leaf's own end runs off it
      ;; and needs no ramp, which is the same rule the top edge follows.
      (setq y (if (= edge "R") (- x r) (+ x r)))
      (if (> lo 0.0)
        (drawArc "JPULL_EDGE" y (- lo r) r
          (if (= edge "R") 0.0 90.0) (if (= edge "R") 90.0 180.0))
      )
      (if (< hi h)
        (drawArc "JPULL_EDGE" y (+ hi r) r
          (if (= edge "R") 270.0 180.0) (if (= edge "R") 360.0 270.0))
      )
      (drawText "UNIT_NUMBER"
        (if (= edge "R") (- w 12.0) 12.0)
        (/ (+ lo hi) 2.0) 8.0 (jpullNote edge span))
    )
  )
)

;;;========================================
;;; G. EVERY J ON ONE PANEL
;;;========================================
;;;
;;; GATED ON THE EDGE EXISTING — the same gate `ledGrooveOnPanel` opens with,
;;; and the reason no front in any project before tonight moves a byte: a
;;; panel whose handle system is not `jpull` never reaches here, and a WALL
;;; DOOR that does reach here resolves to nil and gets no layer, no line, no
;;; arc and no note. The `if` below is that gate and it is the first thing
;;; this function does.

(defun jpullOnPanel (w h class hinge leafH / edge span)
  (setq edge (SKY:jpullEdge class hinge))
  (if edge
    (progn
      (setq span
        (if (= edge "TOP")
          nil
          (SKY:jpullRun leafH (jpullFromBottomMm) (jpullRunMm))))
      (if (or (= edge "TOP") span)
        (drawJpullEdge w h edge span)
      )
    )
  )
)

(princ "\nKIT_FRONT_JPULL.lsp loaded — JPULL_EDGE layer, the owner's profile constants, SKY:jpullEdge, SKY:jpullRun, drawJpullEdge, jpullOnPanel.")
(princ)
