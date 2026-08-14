# CLAUDE.md — TURN 30

Date issued: 14.08.2026. Previous turn: T29 (merged). **NIGHT RUN — maximum
scope.** Commit PER FEATURE in the order written here (F1 → F21), so a run
that dies at 4 a.m. still leaves a mergeable head with the critical core in. Everything below assumes
today's four chat-fix deliveries are already on `main` (arm slide −20/−20,
old procedural hinge removed, plate half-turn `plateSpinDeg`, member lists per
family + `hingeNudgeMm: 5`). If `test/turn29-f5` does not assert
`off.xMm === -20`, STOP and tell the owner to push the pending chat ZIP first.

## Iron rules for this turn

1. **Engine purity.** `computeCabinet()` bare — every golden fixture — cuts
   what the AutoLISP cuts. Owner-standard changes in this turn (F5, F11) go
   through the OVERRIDE CHANNEL (profile/company/project input →
   `paramsForEngine()`), never as a formula change. Golden fixtures are
   untouchable; if F4 restores LISP-true drilling that the engine LOST, that
   is the one sanctioned fixture change — regenerate with a dated fingerprint
   commentary naming this file and the LISP lines.
2. **Proof screenshots** in `verify/t30/`, each containing its named subject.
   An empty frame fails the phase.
3. **No scope creep.** Each feature names its files; touching anything else
   needs the owner's word in the PR description.
4. **DXF text style is forbidden** (VCarve crash 02.08.2026).
5. All UI copy in English. All modals draggable, opening BESIDE the clicked
   object.
6. No SQL is expected this turn. If any feature turns out to need a table,
   STOP and label the package "SQL PRZED push".

## Features

### F1 [CRITICAL] — Hinge body placed by ABSOLUTE datum (the 155° depth bug)

The owner: a 155° hinge "jest za głęboko osadzony w drzwiach i się nie
otwiera". Measured 14.08 in the chat lab, and the numbers are FINAL — do not
re-derive them:

* Every Blum hinge GLB in the bucket shares ONE authoring frame. The cup
  datum sits at **(x = −7.75, y = 0, z = 40.3) file-millimetres, absolute**
  (z = the flange plane). `modelOrigin`'s min-relative math places `42542984`
  correctly only because its own min was baked in; a 155° file has a bigger
  body, a different min, and lands ~17 mm deep in an 18 mm leaf.
* Fix: place the hinge BODY clone at `−datum` (absolute), not `−min +
  modelOrigin`. For `42542984` the two are byte-identical by construction —
  prove it in a test. `foldPivotMm` simplifies to `axis − datum` and the
  pivot stays (−10.33, 0, +2.56) to the micron — prove that too.
* Profile: `fileDatum: { x: -7.75, y: 0, z: 40.3 }` beside `modelOrigin`,
  with a comment giving `modelOrigin` the history and `fileDatum` the job.
  Keep `modelOrigin` for the PLATE path (plates are a separate question and
  the owner's plate is right today).
* Update the contracts in `test/turn24-f1`, `test/turn29-f5` and any turn-21/
  turn-26 test that spells the min-math. Render-verify closed/90°/110° for
  the 110° AND the 155° file, both hands, `verify/t30/`.
* Files: `src/engine/profile.js`, `src/3d/hingeModels.js`, tests above.

### F2 [CRITICAL] — ONE modal for door + hinges

Owner approved the shape ("opowiedz jak chcesz to zrobić" — this is how):

* One draggable modal **"Door"**, two sections. Section A = today's
  ElementModal content for a FRONT. Section B = today's HingeModal content,
  whole: assignment, rows list, ±5 mm arrows, NumberField, Reset, remove.
* Double-click the door → modal opens at section A. Double-click a hinge →
  the SAME modal, scrolled to section B, that hinge's row highlighted
  (today's `ring-gold` row style).
* The two old modals are REMOVED — one component, one open/close path, one
  registry of "what is open". Every existing action keeps working; no new
  dependencies; existing store actions (`setHingePos`, `resetHinges`,
  `removeHinge`, assignment) are reused, not rewritten.
* Files: new `src/components/DoorModal.jsx`, deletions of the old two, call
  sites in `UnitView.jsx` / `CabinetEditorModal.jsx` / pick handlers.

### F3 [HIGH] — Middle divider: CHOOSE the drilled face

Today a partition shows shelf-pin drilling on BOTH faces; a machine drills
one. Per-divider setting **L / R** in the divider's modal; the engine drills
the chosen face only; the 3D and the DXF agree. DEFAULT: **LEFT** — the
owner wants a longer conversation about dividers and this is the safe
placeholder, one profile line to change; the SETTING itself is not in
question.

### F4 [HIGH] — Dividers into TOP and BOTTOM: drilling + biscuits

Owner: "chyba kiedyś było ale się zagineło." Audit `engine/biscuits.js`,
`zones.js`/partitions against the LISP (`reference/lisp/` — KIT_BUDR,
KIT_WARDROBE carry partitions) and restore the partition-to-top/bottom
joinery the LISP cuts. This is LISP-truth restoration: if bare-kit output
changes, that is the sanctioned fixture regeneration of rule 1 — dated
commentary, named LISP lines, exact drill-count deltas in the PR.

### F5 [HIGH] — Shelf-pin setback 70 → 50, the owner's standard

LISP drills sleeves at **70 mm** from each edge (SKYLON_COMMON ~762) — so 70
stays the engine's bare answer. Add override input `shelf_pin_setback_mm`
travelling like the plinth: profile default 70 (=LISP), company/project value
**50**, `paramsForEngine()` passes it, drilling and 3D follow. Bare kit and
fixtures untouched.

### F6 [MEDIUM] — Handle move: kill the nag

Moving a handle by 10 mm asks "dziwne pytanie" every time. Remove the
confirmation on nudge; the move applies directly and one undo step covers it.
Keep any warning that guards an actual conflict (off-panel, collision) —
only the routine nag dies.

### F7 [HIGH] — Shelf × hinge clash: ask, then open the right menu

When a shelf row and a hinge cup land at the same height (collision window:
derive from the geometry — cup ⌀35 + the sleeve pattern's ±50 — and write
the number down, don't feel it), show a conflict prompt: **"Remove sleeves
at this shelf"** / **"Move the hinge"**. The choice OPENS the matching
editor: the shelf's modal at that row, or F2's Door modal at section B with
that hinge highlighted. No silent auto-fix.

### F8 [MEDIUM] — Auto worktop over a multi-selection

Select 2+ base cabinets → one worktop covers the run "od ściany aż do
paneli": front overhang **20 mm**, side overhang past an end panel **10
mm**, wall side flush. Design-layer auto-part like the end panels — no hole,
no fixture. Extensions drawable afterwards (same interaction family as end
panel edits). DECIDED: thickness **38 mm** (UK standard; 770 + 100 legs +
38 ≈ the 900 line), material = the PROJECT's worktop decor by default, a
per-worktop override is a later chat-fix, not tonight's problem.

### F9 [MEDIUM] — Cornice over a multi-selection, like the infill

Today cornice is per-cabinet; the infill already knows multi-select. Reuse
that flow: select 2+ → one cornice across. Same design layer, no drilling.

### F10 [MEDIUM] — Main-menu front style propagates

Choosing "flat" in the main menu sets the PROJECT default front style; every
front without its own override follows. Per-front overrides survive, exactly
like the hinge finish cascade (profile → company → project → element).

### F11 [MEDIUM] — Two hinges under 600 mm

LISP ladders: Base = always 3; Low = 2 under 800. Owner's standard: ANY door
under **600 mm** takes **2** hinges (100 / wys−100). Same override channel as
F5: `hinge_two_below_mm` default null (=LISP ladders, bare kit unchanged),
company/project value 600. Respect per-door manual hinge edits — they win.

### F12 [MEDIUM] — Front-to-front gap clash, red under 3 mm

Room level: compute the gap between neighbouring fronts in a run; when a gap
is **< 3 mm**, paint the pair's meeting edges red and show the value. It is
a WARNING overlay, not a block. Threshold as a profile number.

## The library batch — F13–F21 (owner: "daj na maxa")

**THE ONE HARD RULE FOR EVERY NEW TYPE:** a drilled hole exists only where a
LISP line (`reference/lisp/`) or a published Blum pattern
(`reference/hardware/`) says so. A type with no such truth ships GEOMETRY +
BOM and its panels ship UNDRILLED, with the gap named in the report — an
invented hole is a miscut in somebody's workshop. Kitchen becomes a
top-level library category; every type below lands in it with a default
size, a 3D body, a BOM line and the standard door/drawer machinery where its
parent kit already has it.

### F13 [HIGH] — Cargo 300 (tall pull-out larder)
Parent geometry: KIT_BUDTALL. Proposed width 300. Carcass + full door per
the kit; the pull-out frame is HARDWARE (BOM + GLB slot when the owner
uploads one), no invented runners drilling — the mechanism mounts to floor
and top per manufacturer, which is not this repo's truth yet.

### F14 [HIGH] — Pantry cupboard, Blum drawer system ("koniecznie")
Parent: KIT_BUDTALL + the existing drawer machinery (KIT_LOW/KIT_SINK rows,
MOVENTO catalogue). Internal drawers behind doors: existing drawer boxes and
runner drilling, front omitted (see F20's mechanism — build it once, use it
in both).

### F15 [MEDIUM] — American fridge housing
Parent: KIT_FRIDGE.lsp — it EXISTS and is the truth. Widen the parameter
envelope to american sizes; drilling stays the kit's own.

### F16 [MEDIUM] — Bin unit
Parent: KIT_BUD. Pull-out bin = hardware on the door/carcass per
manufacturer: BOM + visual, no invented holes.

### F17 [MEDIUM] — Wine rack
Geometry-only type: carcass per KIT_BUD/KIT_WUD envelope + the lattice as
panels in the BOM. No drilling truth exists → no drilling ships.

### F18 [MEDIUM] — Twin cupboard
Parent: KIT_DOOR_DOUBLE — it exists. Expose it in the Kitchen category with
its own defaults.

### F19 [MEDIUM] — Corner units
The riskiest of the batch. Start from what the LISP family actually
supports (KIT_BUDR is in the repo — READ it first and say in the PR what it
is); ship the L-carcass geometry + BOM; any hinge/drilling beyond the
parent kit's own lines waits for a LISP. Do not improvise corner-post
drilling overnight.

### F20 [HIGH] — Two-drawer front, one hidden internal (the trend)
Mechanism: an INTERNAL drawer = existing box + runner rows, `front: none`,
sitting behind the front above it. Engine input on the drawer stack; BOM
counts the box and the runners; drilling is the existing runner truth. This
is the same mechanism F14 consumes.

### F21 [MEDIUM] — Glass wall units
Parent: KIT_WUD. Front style `glass`: frame + translucent panel in 3D, BOM
says glass door; hinge rule unchanged (glass doors take the same cups
unless the owner says otherwise — note it in the report).

## Open question for the owner (answer in the push message)

* **Q1 (F3):** default drilled face of a divider — LEFT ships tonight;
  change the one profile line if you want RIGHT or "wider zone".

## Backlog carried (not in scope)

`71B3550_43192717` re-export (Geom3D names, fallback-only) · per-family arm
offsets and fold axes (155°/95° use 3550's — attitude right, point
approximate) · EGGER licence e-mail = BLOCKER #44 before any public demo.