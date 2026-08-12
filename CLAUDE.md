# CLAUDE.md — TURN 26: what the eye test found

Turn 25's guard caught a fault that had been shipping since turn 3, and
then the owner sat down with the result and found nine more. This turn
is mostly HIS list: the hinge that pierces the door front, the shelf
holes the scene never drew, the dimensions that speak four dialects,
the dishwasher that behaves like a cupboard, and the shaker whose
rebate reads as a different colour. Behind them, one new law that
outranks all of it — **the sheet is the truth and the scene follows
it**.

Read the whole file first. Full autonomy, zero questions. Clean or not
at all; the turn shrinks from the BOTTOM (F12 upward — F1, F2 and F3
never shrink).

Baseline: main after the turn-25 merge. Read the baseline test count
from that commit; do not hard-code it. CNC fingerprints:
`verify/t25/fingerprints-turn25.txt`.

## 0. IRON RULES

Everything from turns 1–25 stands: R1 real CDP input, R2 live bucket,
R3 verbatim manifests, R4 URLs from the app, R5 console captured, R6 a
React exception fails the step, R7 no DOM attributes on R3F objects,
R8 the silent showroom, R9 no feature without its part. New:

R10. **THE SHEET IS THE TRUTH; THE SCENE FOLLOWS IT.** The owner's
     law, verbatim intent: *"cut CNC musi być twoją drogą do
     wizualizacji, nie na odwrót."* Every drilling, pocket and cut on
     a panel's CNC record MUST be visible on that panel in 3-D — the
     scene renders the RECORD, never a parallel idea of what should be
     there. Hardware may add to the picture (a sleeve inside a hole, a
     hinge in its bore); it may never replace or omit the hole. A test
     per part class asserts count and position parity between
     `panel.cnc` and what the scene mounts, to 0.01 mm.

R11. **ONE DIMENSION COMPONENT.** The partition chain is the house
     style and the only implementation. Anything that dimensions
     anything — shelves, sides, fronts, gaps — feeds POINTS to that
     one component and draws nothing itself. Three exist today
     (`DistanceArrows`, `HoverDimensions`, `DimLabel`) and that is
     exactly how four dialects happened.

## F1 — The hinge stops piercing the door [CRITICAL]

The owner measured the real thing: a CLIP top cup is **11 mm** deep in
a 25 mm door. The scene shows roughly 15 and the body breaks through
to the FRONT face — diagnosed before this file was written:
`profile.js:1959` carries `cupDepth: 12.5`, and `Hardware.jsx:601`
mounts the cup at `z + cupDepth/2`, so the procedural cup alone
overshoots; with the GLB's own flange datum on top of it, the body
lands proud of the leaf.

1. `cupDepth: 11` — the owner's measured number, with his name on it
   in the comment.
2. **The mounting datum is the door's INNER face** — the side the bit
   enters — never the mid-plane, never the recess floor of a shaker
   panel. One helper resolves it for every leaf type; the GLB's cup
   flange sits ON that plane (the turn-24 `modelOrigin` derivation
   already measures the flange — re-verify against the STEP model
   now in the bucket and correct the number if it moved).
3. **The guarantee**: a test walks every hinge instance on every door
   type — plain, shaker, partition-hung, wall, tall — and asserts that
   NO part of the hinge (procedural or GLB, in ANY open angle of
   turn 24's rig) crosses the door's outer face plane. This is the
   test that makes "it pierces the front" impossible to ship again.
4. Fronts hinge-drilled by the engine already use the correct depth
   for CNC — verify; if CNC and the scene disagree, R10 decides: the
   sheet wins and the scene is corrected.

## F2 — Partition doors: one path, not two [CRITICAL]

The owner: on the small partition-hung leaves the hinges are the OLD
procedural ones, they do not fold, and they pierce. Three symptoms,
and the code says one cause — `Hardware.jsx` contains no reading of
`hingeOn`/`hingeFace` at all, so those leaves fall into a legacy
branch that predates the GLB mount, the rig and the datum fix.

1. Delete the legacy branch. EVERY door — side-hung or
   partition-hung — builds its hinge instances through ONE function
   that reads `hingeOn` + `hingeFace` from the panel's meta, mounts
   the GLB, applies turn 24's rig and turn 26's datum.
2. Turn 25's paired test compared NUMBERS and passed while the
   pictures differed. Extend it: the pair must also agree on the
   MOUNT — model-backed vs procedural, parent node, fold state at
   45°, and the F1 no-pierce assertion — for both leaves.
3. Display only ⇒ CNC delta ZERO.

## F3 — The scene draws what the sheet drills [CRITICAL]

R10's first application, and the owner's clearest complaint: a side
panel carries **three ⌀7.5 holes in a row** per shelf level on the
sheet; in the scene there are no holes at all — X-ray included — only
sleeves where a shelf happens to stand.

1. Every ⌀7.5 shelf hole on a panel's CNC record renders as a real
   bore in that panel's face — **empty ones too**, so the full ladder
   of levels reads at a glance, exactly as on the sheet.
2. Sleeves and pins (turn 25's brass) mount INSIDE the holes that
   actually carry a shelf. The hole is the panel's; the sleeve is
   the hardware's.
3. Sweep the same rule across every drilling class the scene claims
   to show — hinge bores, screw holes, biscuit slots, dowels: what is
   on the sheet is in the picture. Where a class is deliberately not
   drawn, name it in `verify/t26/sheet-vs-scene.md` with the reason;
   silence is not allowed.
4. The parity test from R10 is the proof; it must cover at least
   BUL/BUR, TOP/BOTTOM, BACK, shelves, partitions and fronts.

## F4 — One dimension language, at last [HIGH]

The owner: the partition chain is right; shelves, sides and fronts are
wrong — white labels, no arrows, badly placed, rounded to 1 mm.

1. R11: the partition chain's renderer becomes THE dimension
   component. `HoverDimensions` and any front-dimension drawing feed
   it points and captions; `DimLabel`'s standalone use for dimensions
   ends (it may stay for non-dimension chips like unit names).
2. **Placement, the owner's picture**: horizontal chains lie ON THE
   FLOOR in front of the run, like a drawing's dimension line —
   witness lines dropping from the front edges, the chain below them.
   Vertical chains run down the SIDE of the unit. Never across the
   face of a front.
3. **Precision 0.5 mm** everywhere (`formatMm` gains a half-mm mode
   for dimensions): 3 mm gaps and half-millimetre differences are
   exactly what these are for.
4. Same thin blue line, real arrowheads, value on the line — the
   partition style, everywhere. Shelves and side panels (interior
   depth, interior height) included; turn 25's magnet stays.

## F5 — The dishwasher joins the family [HIGH]

Four faults, one appliance:

1. **Front sits 3 mm high.** `cabinet.js:1534` — `dwH = H - gap` is
   right, but `box.y = H - dwH` glues the leaf to the TOP and puts
   the whole gap UNDER it, while every other front starts from the
   bottom. Correct the datum so a D/W front lines up with its
   neighbours; the gap belongs at the top.
2. **It opens sideways.** A D/W front drops FORWARD about its BOTTOM
   edge, ~90°, not on cup hinges. Its own opening behaviour.
3. **No cup hinges, no cup drilling** — the panel screws to the
   appliance door. If the engine drills hinge bores in it, they go
   (R9 and R10 agree).
4. **Plinth.** A D/W unit may carry a plinth like any other, joining
   the run's continuous plinth line, height from the run's leg
   height (turn 22's law). **BLOCKER**: whether the plinth in front
   of an appliance is a fixed part, a removable one, or simply the
   run's plinth passing through is a workshop question the owner has
   not answered — implement it as the run's plinth passing through,
   the least committal reading, and put the question in BLOCKERS.
5. **Shaker.** A D/W front is a front: F3-turn-25's shaker applies to
   it, and so do handles. The `dwPanel` path must stop being a
   special case for anything a front normally has.

## F6 — The shaker's rebate is the same colour [HIGH]

The owner: the recess reads as a different colour, and it looks bad.
The panel floor and the four inner walls must carry the SAME material
instance as the frame, with correct normals; the only difference the
eye should see is SHADOW. Verify smoothing/normals at the rebate
corners, kill any distinct material, screenshot at a grazing angle.

## F7 — The fix shelf is a clean rectangle [HIGH] — CNC, named

The owner, twice, and the second time decisively: **no biscuits on the
shelf itself — not even on its ends.** Remove them.

1. Fix shelf CNC = OUTLINE + label. Nothing else.
2. The joint lives in the bearers: biscuit slots in the faces of
   BUL/BUR **and** of the partition; ⌀3 through-screws from BUL/BUR
   only, never through a partition; ⌀3 in the BACK on the shelf's
   axis (the owner's addition — same law as the partition's back
   screws: ends 50, pitch ≤ 400).
3. Zero ⌀7.5 on a fix shelf or its bearers — the red test from turn
   24 stands; a second red test now forbids ANY entity but the
   outline on the fix shelf part itself.
4. Named delta in the fix-shelf probe; golden defaults ZERO.

## F8 — Shelves lie along the grain [HIGH] — CNC, named

The owner: shelves are laid across the sheet, so the grain runs
front-to-back; the edge banding goes on the LONG front edge and must
run WITH the grain. Lay every shelf (fix and adjustable) with its
length left-to-right, the same convention as the sides — the
partition already got this in turn 24 (F8) and this is the same
production law. Tops and bottoms are NOT in scope.

## F9 — The cornice grows corners [MEDIUM]

1. **Diagnose first**: the right-click cornice toggle does nothing
   (the owner). Find whether the menu item, the store write or the
   resolver is at fault; report in `verify/t26/cornice-toggle.md`.
2. **Wall units join the run.** A cornice run continues across ANY
   adjacent cornice-bearing unit whose top edges meet — tall and wall
   alike, not just floor-standing.
3. **The internal 45° mitre**: where two runs meet at an angle (a
   wall unit meeting a tall unit), the profile mitres internally at
   45°, as it already does externally at an open end. Four cases
   total: run, stop at a wall, open-end return, corner.
4. **BLOCKER**: when the two units differ in depth (wall 350 against
   tall 578) the cornice cannot simply mitre — the owner has not said
   whether he steps it or carries the deeper line and returns. Ship
   the mitre for equal depths, refuse (with a plain message) for
   unequal ones, and ask in BLOCKERS.

## F10 — The light comes from the ceiling [MEDIUM]

The owner's proposal, and his constraint: total brightness must NOT
increase.

1. One broad ceiling source at real ceiling height above the tall
   units, set back **1.5 m** from the fronts, medium intensity.
2. **Whatever is added above is subtracted from the facing spots** —
   the scene's total luminous contribution stays as it is today.
   Compute it, do not eyeball it, and put the before/after sum in
   `verify/t26/lighting.md`.
3. A **brightness slider** in the View menu scales every source
   proportionally, state remembered.
4. Screenshots: a shaker door under the old rig and the new one, same
   camera — the rebate shadow is the whole point.

## F11 — SHORT / OVER and the export tree, verified [LOW]

Turn 25 shipped both; the owner could not find the warning. Confirm
it triggers (a 770 opening with three 200 fronts), that its wording
names the number, and screenshot it. No new behaviour.

## F12 — Editor housekeeping [LOW]

Only what fits without touching the drawing tools:

1. The layer list moves OFF the toolbar; the layer is asked ONCE,
   before the edits are committed ("which layer should these go on?").
2. **Back** moves to the top centre of the modal, large.
3. Panel split: the 3-D view shrinks to ~25 %, the sheet takes ~75 %.
4. `Delete` after a selection must actually delete — verify the
   disabled-looking button in the owner's screenshot is state, not a
   bug; fix if it is a bug.

## OUT OF SCOPE — named so nothing drifts in

* The CAD drawing tools (circle, rectangle, trim, join `J`, offset,
  orto toggle, 45° constraint, typed `400 Tab 500`, starting a draw
  from a snapped point): the owner's list, and a turn of its own.
* Default depth 578 and end panels extending to the wall: gathered,
  not yet specified — next turn.
* Drawer numbering D1-from-top; `centrelineExtra` (removed in turn 24,
  the LISP still carries 0.5 — the owner's bench test decides);
  custom layers; four-bar linkage; LIFT kits; ⌀3 plate card;
  pull-out tray height.

## PROOF — `verify/t26/`

* `walk.json` — R1/R4/R5/R6/R8 as ever.
* `sheet-vs-scene.md` (R10 parity, per class, with the deliberate
  omissions named), `cornice-toggle.md`, `lighting.md`.
* Screenshots: a hinge at 0/45/90° with the no-pierce guarantee
  visible on a shaker door; a partition leaf's hinge folded and
  model-backed; a side panel showing its full ⌀7.5 ladder in the
  scene beside its sheet; floor-lying dimension chains at 0.5 mm; the
  D/W front level with its neighbours and dropped open; the shaker
  rebate at a grazing angle; the fix-shelf sheet as a bare rectangle;
  a shelf laid along the grain; a wall-to-tall cornice corner; the
  new lighting pair.
* `fingerprints-*`, `cnc-export-identity.md` — named: F7's fix-shelf
  subtraction and back screws, F8's shelf orientation, F5's D/W
  changes. ZERO on golden defaults.

## TESTS

New: F1's no-pierce sweep across door types and rig angles; F2's
extended pair (mount, parent, fold, pierce); R10 parity per part
class; R11 single-component assertion (grep-level: no other module
draws an arrowhead); 0.5 mm formatting; D/W front datum and opening
axis; shaker material identity; F7's bare-rectangle and no-⌀7.5 red
tests; F8 orientation; cornice corner resolution incl. the refusal on
unequal depths; the lighting sum. 100 % green or shrink from the
bottom.