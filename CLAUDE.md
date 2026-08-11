# CLAUDE.md — TURN 23: the Back button the owner asked for three times

The owner has asked for a Back button in the editor across several
sessions and it kept dying in collection — it leads this turn as F1 and
becomes a navigation STACK so the class of bug dies with it. Behind it:
the hinge models grow up (they swing with the door, wear the chosen
finish, and lose a stray black cylinder), two partition laws land in the
engine (no borrowed biscuits, screws in the back), the CNC detail view
learns zoom and proper hover dimensioning, and the owner gets his
one-off part editor — a pencil on one print, never a change to the book.

Read the whole file first. Full autonomy, zero questions. Clean or not
at all; the turn shrinks from the BOTTOM (F11, then F9's line/dowel
half, then F8's scene half — F1 and F2 never shrink).

Baseline: main INCLUDING both chat hotfixes — the hinge pose
("zawiasy") and the ruler R3F-attribute fix. If the ruler fix is not on
main yet, the owner pushes it BEFORE this file. Tests at baseline: 1679.
CNC fingerprints: `verify/t22/fingerprints-turn22.txt`.

## 0. IRON RULES

Everything standing from turns 1–22 applies, including R1 (real CDP
input), R2 (live bucket), R3 (verbatim manifests as fixtures), R4 (URLs
proven by asking the APP), R5 (the walk reads the console). New,
permanent, from this week's post-mortems:

R6. **A React exception in the console is a FAILED step.** The ruler's
    marker threw on every render for two turns and the walk stayed
    green because an error boundary swallowed the throw while the
    asserts read state off the remounted canvas. R5's capture now
    fails a step on ANY uncaught error or React error-boundary
    report — not just failed resources and WebGL complaints.

R7. **No DOM attributes on R3F scene objects.** `data-*` and friends
    crash the reconciler at runtime. Anything a walk or a tool needs
    to find goes in `userData`. Grep the tree for `data-` inside
    R3F returns before calling any phase done.

R8. **Hardware visuals are proven on the SILENT SHOWROOM.** The cloud
    sandbox cannot fetch the bucket (403), so GLB-dependent phases can
    never again end `blocked`. This turn adds
    `scripts/make-fixture-hardware.mjs`: it GENERATES simple synthetic
    GLBs (a box body + a cup cylinder + an arm bar, dimensioned like
    the real 71B family, plus a plate) and a matching manifest into
    `test/fixtures/hardware-local/`. The resolution order in
    `hardwareSource` gains an explicit TOP slot: an override base URL
    read from `localStorage['cc.hardwareBase']` — a documented service
    knob (it also gives the owner offline demos). The walk serves the
    fixture folder, sets the knob, and proves pose, mirror, swing and
    finish on the synthetic set with screenshots. No Blum bytes enter
    the repo — the licence question (BLOCKERS #75) stays clean. The
    REAL models remain proven by R2 (manifest + HEAD from the app's
    URL) and by the owner's screen.

## F1 — Back: the editor grows a navigation stack [CRITICAL]

The owner, for the third session running: from the part detail there is
no way BACK — only killing the whole editor and starting over.

1. Editor surfaces form a STACK: cabinet editor → part detail →
   (future: drawer editor → its part detail). PUSH on entering a
   nested view; POP restores the previous view EXACTLY as left —
   same unit, same camera, same selection, same scroll.
2. Every nested view renders **← Back** beside its title. **Esc** =
   Back (one level), not close-everything. **Done / ×** closes the
   whole editor, as today. The top level has no Back.
3. One implementation in the editor shell (turn 12's home) — views
   register onto the stack, none keeps its own history. The turn-21
   drawer editor inherits without a line of its own.
4. Walk (R1): editor → part detail → real click on Back → the SAME
   cabinet view with the SAME selection (assert store + screenshot);
   Esc from detail = same; Done from cabinet view closes. R6 applies.

## F2 — The hinge swings with its door [HIGH]

Owner: the model hangs closed on the carcass while the door stands
open. Looks awful, and it is wrong.

1. Split the mounting: the hinge BODY (cup + arm) parents to the DOOR
   node and rides its open rotation; the PLATE stays on the carcass.
   The drilled cup point is already door-space truth — the body's
   pose from the chat hotfix carries over unchanged, re-parented.
2. Articulation, this turn's honest scope: the body follows the leaf
   rigidly (cup stays in its bore, arm sweeps with the door). A real
   CLIP top folds its knuckle — that is a rig, not a transform; a
   code comment names it as future work. No invented joint angles.
3. The open/close animation is the door's own `openFronts` value —
   nothing new drives it.
4. Walk (R8): synthetic hinge on the fixture set; door closed
   screenshot, door open screenshot — the body visibly travels with
   the leaf, the plate visibly stays. Registry asserts both parents.

## F3 — The black cylinder [HIGH]

Owner's screenshot: a black drum floating beside each hinge.

1. Diagnose by MESH, not by eye: parse the real GLB (the headless
   loader from the chat hotfix is the tool), list mesh names, sizes
   and offsets, and identify the drum — expected: an adjustment cam /
   cover mesh with its own material and a displaced origin from the
   DAE conversion.
2. If it is a legitimate part of the hinge: place it where it
   belongs (its offset joins `modelOrigin`'s derivation comment).
   If it is a conversion artifact (duplicate or orphan): exclude it
   by NAME in the clone step, with the name and the reason written
   in the code comment and in `verify/t23/hinge-meshes.md`.
3. Either way the finding lands in `hinge-meshes.md`: full mesh table
   of one hinge file and one plate file, so the next person reads a
   report instead of squinting at a render.

## F4 — The hinge wears its finish [HIGH]

Owner: the model renders WHITE — raw file material. Settings say
nickel or onyx; the metal should follow, the way panels follow decors.

1. On clone, override the hinge and plate materials from the profile:
   `hardware.hinge.finishes.nickel` / `.onyx` — metalness/roughness/
   colour numbers in `profile.js`, sane metallic defaults, the
   owner's to tune. The turn-19 finish setting (project cascade,
   turn-22 company default) picks which.
2. Plastic sub-meshes (the CLIP lever, caps) keep a plastic look:
   override by material-name allowlist, not blanket — the F3 mesh
   table says which names are metal and which are not.
3. Runners get the SAME treatment through the same helper — one
   override function, two families. (Movento in orion grey / silk
   white per the runner setting when those finishes exist in the
   profile; otherwise the single default — do not invent Blum RAL
   values, one neutral metal is enough until the owner tunes.)
4. Walk (R8): fixture models render in both finishes, two
   screenshots; assert the applied material parameters via the
   registry.

## F5 — Partitions lose the borrowed biscuits [HIGH] — CNC, named

Verified against the LISP before this file was written: the partition
panel (`drawWDR_PARTITION_PANEL`) draws OUTLINE and LABEL only — no
biscuits, no end drilling. The engine applied the BOTTOM panel's
biscuit law to a part the LISP never gave it.

1. Remove every biscuit/end-preparation entity from vertical-partition
   parts. The partition meets floor and top the way the LISP says it
   does: not by biscuits.
2. CNC: golden defaults carry no partitions ⇒ **fingerprint delta
   ZERO on defaults**; the partition probe scenario loses exactly the
   biscuit entities — the ONLY subtraction this turn, named in
   `cnc-export-identity.md` with the LISP line as the justification.
3. Fixtures: zero (no partition in the golden set).

## F6 — The back holds every partition [HIGH] — CNC, named

Owner's law, grounded in the LISP's own pattern: the drawer-panel
partitions already screw through the back (`drawWardrobeDPHolesBACK`,
SCREWS_3MM, 50 mm off the partition's ends). The interactive vertical
partition gets the SAME law, densified to the owner's cap:

1. On the BACK panel, one screw line per vertical partition, on the
   partition's axis: `SCREWS_3MM`, ⌀3, first and last **50 mm** from
   the partition's ends (the LISP's number), intermediates spread
   EVENLY so the pitch never exceeds **400 mm** (the owner's number).
   A 2400 partition line ⇒ 2300 span ⇒ 7 screws at ~383. Both numbers
   in `profile.js`, named, with this derivation.
2. Split partitions (F9-turn-21 law: a crossing shelf splits one)
   drill per SEGMENT — each segment is its own 50…≤400 run.
3. DP-partition and rail-partitioner back lines keep their existing
   LISP law untouched — assert that in tests.
4. CNC: defaults ZERO; the partition probe gains exactly this named
   class. Fixtures: zero.

## F7 — The CNC detail learns to zoom [MEDIUM]

Owner: the part preview in the editor detail is fixed.

1. Wheel zoom about the cursor, drag to pan, double-click or a small
   ⌂ control = fit to window. Same input grammar as the main CNC
   sheet (turn 20's capture-on-move law applies — clicks stay alive).
2. Nothing about the drawing changes — presentation only.

## F8 — Hover dimensions become drawings, not captions [MEDIUM]

Owner: the corner caption is not what he asked for. He wants thin,
small, beautiful BLUE dimension arrows that appear on hover and
vanish on leave — like a drawing, in two places:

1. **CNC part detail**: hovering a drill/pocket/feature draws
   dimension arrows from the feature to the part's nearest edges and
   to the nearest neighbouring feature — extension lines, arrowheads,
   the value on the line, `formatMm`. The corner caption from turn
   22's detail goes away; the turn-20 sheet tooltip stays where it
   is (different surface, different job).
2. **Scene**: hovering a vertical partition draws the same style of
   arrows for the clear bay widths to its neighbours (side ↔
   partition ↔ partition). Appears on hover, fades on leave.
3. ONE style, defined once in the profile (colour — thin blue,
   stroke, arrowhead size, text size), consumed by both surfaces.
   Helpers carry `userData.ccHelper` so the ruler and picking ignore
   them (R7 applies — no DOM attributes).
4. Walk: real hover both places, screenshots; R6 console clean.

## F9 — The pencil on one print: per-part CNC overrides [HIGH]

The owner's words, after the scope was cut to the bone: he does NOT
want to touch the engine — he wants to edit ONE part in ONE project,
and the next wardrobe must come out stock. A 2400 back from a 1200
board, no back behind the washing machine — he will cut and delete
himself, given the tools:

1. Tools in the part detail (editor): **delete a feature** (any
   drill, biscuit, pocket on this part), **add a drill** (⌀ and
   depth typed, position clicked or typed), **add a line** and **add
   a dowel line** (start/end/pitch), each assigned to an EXISTING
   layer picked from a list. No custom layers this turn — parked by
   the owner's word.
2. Storage: a per-part override list on the PROJECT (`unit.partEdits`
   or equivalent) — ops like `{hide: featureId}` / `{add: {...}}`.
   The ENGINE stays pure and ignorant: overrides apply in a thin
   step after `computeCabinet()`, in one function both the 3-D, the
   sheet and the DXF EXPORT consume. LISP untouched, kits untouched,
   the next cabinet stock by construction.
3. The edited part wears a small badge ("edited by hand · 3 changes")
   in the detail and on the sheet; a one-click "Back to computed"
   drops all its edits. When a recompute changes that part's
   geometry (resize etc.), the app ASKS: "this part carries manual
   edits — recompute drops them, continue?" — the owner chooses.
   Feature ids must therefore be stable across identical recomputes.
4. Orientation: the detail shows the part exactly as the CNC sheet
   lays it — along the grain, no rotation for editing. (The owner's
   standing complaint; it dies here.)
5. CNC: fingerprints run on stock projects ⇒ **delta ZERO
   everywhere**. A dedicated TEST (not a fingerprint scenario)
   builds a project, applies one hide + one added drill, and asserts
   the DXF export of that part contains exactly those differences —
   and that a fresh unit of the same kit exports stock.
6. Walk (R1): open a back panel, delete one biscuit with a real
   click, add one drill, badge appears, export contains both, "Back
   to computed" restores; screenshots.

## F10 — Partition position speaks the shelves' language [MEDIUM]

Owner: the partition field measures from the cabinet's outer end;
he places partitions from the INSIDE, and cares about bay widths —
the same disease turn 21's F10 cured for shelves.

1. One derivation, two displays: the field = distance from the
   INTERIOR face of the left side to the partition's near face; the
   scene chips (and F8's hover arrows) = CLEAR bay widths between
   neighbours. Both from one function.
2. STORAGE DOES NOT MOVE — display and input mapping only; a saved
   project opens with every partition exactly where it was. Tests:
   round-trip + a turn-22 project loads identical.
3. The "Centre" action and P1/P2 rows re-label accordingly.

## F11 — Loose ends that ride along [LOW]

1. The turn-21 deferral note and any BUILD-LOG sections written in
   Polish are re-issued in English — docs speak one language.
2. `verify/` screenshots for this turn's hinge work include one real-
   model shot ONLY if the environment can fetch the bucket; otherwise
   the silent-showroom shots stand and the report says so plainly.

## OUT OF SCOPE — named so nothing drifts in

* Custom layers per tenant: parked BY THE OWNER with three questions
  on file (machine meaning/DXF mapping; definition fields; firm vs
  project scope). A future data-module turn.
* The hinge knuckle rig (true folding articulation): F2 names it.
* LIFT kits HK/HF; the ⌀3 screw-on plate (card 173L); the pull-out
  tray height — all still waiting on the owner's data. BLOCKERS.
* Element editing inside the cabinet editor beyond F9's tools: still
  unscoped by the owner. Parked.

## PROOF — `verify/t23/`

* `walk.json` — R1 input, R5+R6 console attached, R4 app URLs, R8
  silent-showroom base recorded.
* `hinge-meshes.md` — the F3 mesh table and the drum's verdict.
* Screenshots: Back round-trip; door open with the body riding and
  the plate staying; both finishes; partition probe sheet before/
  after F5+F6; zoomed detail; both hover-arrow surfaces; the F9
  badge, edit and restore.
* `fingerprints-turn22-baseline.txt`, `fingerprints-turn23.txt`,
  `fingerprints-diff.txt` — ZERO on golden defaults; the partition
  probe shows ONLY F5's subtraction and F6's addition.
* `cnc-export-identity.md` — names both classes, cites the LISP
  lines.

## TESTS

Baseline 1679 all green. New: the navigation stack (push/pop/Esc as
arithmetic on view state); hinge parenting (body under door, plate
under carcass); finish override mapping incl. the plastic allowlist;
F5 subtraction and F6 spacing law per partition height (2400 ⇒ 7 at
≤400, ends at 50) and the split-segment case; DP/rail lines untouched;
F9 override application, id stability, stock-neighbour assert, DXF
delta assert; F10 mapping round-trip. 100% green or shrink from the
bottom.