# CLAUDE.md — TURN 31

Date issued: 15.08.2026. Previous turn: T30 (merged — verify the merge before
anything: `src/engine/frontGapClash.js` must exist on main; if it does not,
STOP and tell the owner T30 is not merged). Everything below was agreed with
the owner in today's chat, point by point; the numbers are his unless marked
as a default he may correct.

## Iron rules for this turn

1. **Engine purity.** Bare `computeCabinet()` = the AutoLISP; golden fixtures
   untouchable. Owner-standard behaviour goes through the OVERRIDE CHANNEL
   (profile/company/project → `paramsForEngine()`), exactly as F5/F11 did in
   T30.
2. **No hole without truth.** A drilled hole exists only where a LISP line or
   a published Blum pattern says so.
3. **Proof screenshots** in `verify/t31/`, each containing its named subject;
   an empty frame fails the phase. Browser proofs on REAL pointer input where
   a feature is interactive.
4. **No auto-healing of faulty geometry.** A guard SPEAKS; it never silently
   fixes. (The duplicate-edge guard's own contract — it now applies to every
   guard this turn adds.)
5. **DXF text style is forbidden** (VCarve crash 02.08.2026).
6. All UI copy in English. Commit PER FEATURE in the order written; a run
   that dies early must leave a mergeable head.
7. No SQL expected. If a feature turns out to need a table, STOP and label
   the package "SQL PRZED push".

## Features

### F1 [CRITICAL] — Modal shell: all 42 windows, one behaviour

The owner's standing rule — every modal draggable, opening BESIDE the
clicked object — is real in 3 of 42 components. `Modal.jsx` already knows
how; make it the mandatory shell. Route every modal through it: drag by
header, spawn beside the click (clamped to viewport), one close path, one
z-order authority. No visual redesign — same content, same sizes; only the
shell behaviour unifies. Proof: three different modals dragged and opened
beside their objects, in `verify/t31/`.

### F2 [CRITICAL] — One dirty gate + message levels (owner's colours)

**Dirty:** today 77 of 137 store actions each remember to set the flag; 60
forget, and a forgotten flag is silently lost work. Wrap project mutation in
ONE gate that sets it; delete the 77 hand-written repeats. Leaving with
unsaved work shows a RED "Save the project — unsaved changes".

**Messages:** one toast slot, 4 s, each message erasing the last — the owner
has never seen one. Replace with three levels, his rules verbatim:
* RED — stays until clicked. Errors only.
* YELLOW — dismissed by clicking anywhere else.
* GREY — a few seconds, centre; and DELETE most of them — an effect visible
  in 3D needs no toast.
Messages queue; a red is never overwritten by a grey. Proof: one of each
level on screen, screenshotted.

### F3 [CRITICAL] — The guards, wired: Check #9 and #10 + export gate

`edgeGuard` (turn 25, tested, never wired to the user's own export) joins
the app in two places, and a second guard joins it:

* **Check #9 — outline faults** (`resultFindings`): doubled edge, overlapping
  runs, wrong winding. RED; click flies the camera to the panel.
* **Check #10 — drill faults**: exact-duplicate circles (same layer, same
  centre, same radius, 0.01 mm) AND colliding hinge rows (two rows closer
  than `hingeMinSpacingMm`, profile, default **60**). RED.
* **Export gate**: both guards run before files are written. A faulty panel
  is HELD OUT of the export — message names it — with an explicit "Export
  anyway" for the owner's own judgement. Everything clean exports normally.
* **At the source**: `setHingePos` / add-hinge REFUSE to land a row closer
  than `hingeMinSpacingMm` to another (the proven live bug:
  `hinge_rows [100,100,470]` drills every hinge hole twice today). Blocked
  move = yellow message with the number. One profile line flips block→warn
  if the owner ever wants it loose.
* Regression test: the `[100,100,470]` case must FAIL the guard and the
  store must refuse to create it.

### F4 [CRITICAL] — Front gaps: the owner's rulebook (18 points)

The rule set agreed today, verbatim; implement all of it. Display and Check
measure **front↔neighbour** (what a client sees), never front↔own carcass.

**A. Front clearance per edge, by neighbour (left and right independent):**
1. Neighbour = another cabinet's front → clearance **1.5** (1.5+1.5=3).
2. Neighbour = end panel → **3.0**.
3. Neighbour = infill/filler → **3.0** (same category as panel: a rigid
   neighbour that gives nothing back).
4. Neighbour = appliance with its own front (dishwasher 594 in 600) →
   **0** — the front extends to the carcass end; the appliance provides
   the 3.
   **4a. Appliance column (oven/microwave):** every front above/below the
   appliance takes the APPLIANCE's width (oven 598 → drawer front below is
   598). Alignment to neighbours happens at the COLUMN's outer edges by
   this matrix, symmetrically — uniquely here both edges are set by the
   appliance, not by hinges (a drawer has no cups; runners follow the
   carcass, only the front widens).
5. Neighbour = bare wall → **3.0** + yellow "infill? (dust collection)".
6. End of run (nothing) → **1.5**.
7. L-shape corner → PARKED with the L-shape unit; do not invent it.

**B. Asymmetry law:**
8. A width correction acts ONLY on the edge whose neighbour demands it —
   never symmetrically.
9. Cups sit **21.5 from the front's edge, always** — they travel WITH the
   edge on every correction; the drilling pattern is untouchable.
10. Plates on the carcass never move; differences up to ±1.5 are absorbed
    by the hinge's own side adjustment, silently.
11. A correction **> 1.5** on the hinge edge → yellow in Check ("beyond the
    hinge's adjustment — check").
12. Handle: centred stays centred (recomputed to the new width); edge-set
    keeps ITS edge at ITS distance, whichever edge that is.

**C. Carcasses:**
13. Carcasses in a run stand **touching** — a state, not an option. A gap
    between carcasses = RED in Check; the only fix offered is closing to
    touch. Cabinets are NEVER moved to fix a front gap.

**D. Detection and repair:**
14. Shown gap = front↔neighbour.
15. Gap **< 3 mm** → RED; the modal offers TWO options, each with its
    number: **[Narrow the front(s)]** (default; halves of the shortfall,
    asymmetry law applies, cups ride the edge) / **[Insert/fix an infill]**.
16. Gap **> 6 mm** → yellow "too wide — infill or front correction?"
    (owner's default threshold; one profile number).
17. Narrowing a front warns "changes BOM and drilling" before it acts.
18. Thresholds (3, 6, 1.5-adjustment) live in the profile.

### F5 [HIGH] — Export names the project

`{ProjectName}-cnc-{DDMM-HHMM}.dxf` (sanitised), never `All-materials-cnc`
again — nine identical filenames were half of yesterday's confusion. Same
pattern for any other export the app writes.

### F6 [HIGH] — Check v1: the pre-production controller

A **Check** button beside BOM/CNC, and the same list automatically before
Export. Result = a PANEL of findings (not toasts): click → camera flies to
the subject and the right editor opens (the F7/T30 mechanism). Rules, with
the owner's colours; thresholds are profile numbers marked as owner-tunable:

* #1 shelf × hinge collision (exists, T30) — red
* #2 front gap < 3 mm (exists, T30 → reuse under F4's neighbour measure) — red
* #3 tall cabinet with no FIX shelf: height > 1200 and zero fixed → "add one
  fixed shelf" — yellow
* #4 door too heavy / too few hinges: weight (already computed) + height vs
  the Blum table (`reference/hardware/` — take the published CLIP top table;
  if the repo lacks it, add it as a reference JSON with the source named) — red
* #5 20–80 mm of open gap above a run with no infill → "infill? (dust
  collection)" — yellow
* #6 base run standing with no plinth → yellow
* #7 panel larger than the sheet (2790×2060 default) → red
* #8 front wider than 600 at 110° → "consider 155°" — yellow
* #9 outline faults (F3) — red
* #10 drill faults (F3) — red
* #11 carcass gap in a run (F4.13) — red
Findings name their subject (unit, panel, mm). No blocking anywhere except
the export gate's hold-out, which has "Export anyway".

### F7 [HIGH] — Hover aura on handles and hinges

Not a snap — a CATCHMENT. An invisible enlarged hitbox (~8 mm in scene mm,
the T30 pick-surface pattern) around every handle and hinge:
* inside the aura → the dimension label shows (handle: distance to its
  NEAREST front edge, one number — default the owner may extend to two);
  colour ORANGE (red is reserved for Check);
* label STAYS while the cursor is anywhere in the aura; disappears ~300 ms
  after leaving (no flicker at the boundary);
* the same aura is the grab/double-click target — no more pixel-hunting a
  thin rail.

### F8 [MEDIUM] — Double-click a cabinet dimension → mini modal

Double-click the width or height figure on the canvas → a small modal
(through F1's shell, beside the click) with width and height fields; commit
on Enter. Existing engine setters; nothing new in the engine.

### F9 [MEDIUM] — HOOD: wall hood unit + the hood itself

New Kitchen type: hood wall unit (parent geometry KIT_WUD envelope, shorter
door above an open appliance aperture). The extractor itself is HARDWARE:
BOM line + GLB slot for when the owner uploads a model (the Blum pattern).
Rule 2 applies: no invented holes — the aperture is geometry, the fixings
wait for truth.

### F10 [MEDIUM] — CORNER → L-SHAPE rename

The T30 type is an L-shape cabinet, not a corner system — rename typeId
`CORNER` → `L_SHAPE`, label "L-shape unit". MIGRATE saved projects: on
project load, `CORNER` reads as `L_SHAPE` (one-line alias kept forever);
never break an existing save. Joints for it stay PARKED by the owner's word.

### F11 [MEDIUM] — Honest 155° fixture + T30 leftovers

* `71B7550_*` synthetic fixtures currently carry the 3550's node names —
  regenerate `scripts/make-fixture-hardware.mjs` output with the REAL 155°
  node names measured on the live bucket (`bau0079302490`, `bau0079324562`,
  `bau0079298416`, `bau0079291413`, `bau0079262819`, `bau0025540121`,
  `bau0082114196`) so the member-split tests test what ships.
* Rename `verify/t30/12b-…-1mm-…png` → its banner says 2 mm; the name lies.
* PANTRY defaults include its drawers (today it computes 6 bare panels until
  `drawers` is set).

### F12 [LOW] — Sweep

Delete `src/3d/JointLines.jsx` (dead since T13) and the 83 exports no code
imports (list from the 14.08 audit — regenerate it, don't trust it: an
export used only by tests stays if the test asserts behaviour, goes if it
asserts the export's own existence).

## Open items the owner parked (do NOT start)

L-shape joints and corner handle-reach rule · appliance GLBs (oven, sink,
hob, dishwasher, extractor — models arrive when the owner uploads them; the
slots from F9 and existing types are the landing pads) · sheet nesting
(cutting optimisation) = T32, its own turn · `71B3550_43192717` re-export ·
per-family arm offsets and fold axes · EGGER licence e-mail = BLOCKER #44.

## Owner-tunable defaults written in this turn

`hingeMinSpacingMm: 60` · gap thresholds 3 / 6 / ±1.5 · Check #3 height
1200 · #5 window 20–80 · #7 sheet 2790×2060 · #8 width 600 · hover aura
8 mm, linger 300 ms. Each is ONE profile number with a comment naming
today's date and the owner as the source.