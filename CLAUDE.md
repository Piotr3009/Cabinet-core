# CLAUDE.md — TURN 36: ONE SETTINGS MODAL, AND EVERYTHING THE NIGHT LEFT BEHIND

Date issued: 17.08.2026. Previous turn: T35 (partial — 10/16 merged; the
morning audit named the gaps, the owner's eye-test named three more). This
turn closes ALL of it. Nothing here is new invention: every feature below is
either a T35 spec section re-issued or an owner ruling from 16–17.08.

VERIFY FIRST — T35 must be on main: `src/engine/cabinet.js` contains
`front_top_gap_mm`, `reference/lisp/KIT_WARDROBE_FULL.lsp` contains the
`SPLIT DOORS (T35)` section, and the hanger modal contains
`Height above support`. Any missing → STOP and report.

## Iron rules for this turn

1. **/engineering-discipline. CONSUMER SWEEP mandatory.**
2. **Engine purity, named deltas.** Sibling `scripts/t36-classify.mjs`; the
   contract vs main: `GRAIN_AXIS` (F5 — drawer boxes, drawer fronts,
   plinths) is the ONLY expected bucket. Split doors default to "no split"
   and the top box is a new type, so neither may move the six configs.
   UNNAMED = 0 or the run failed its own contract.
3. **LISP is law.** F6 implements the engine against the ALREADY-MERGED
   `SPLIT DOORS (T35)` kit section — the engine matches it, never
   interprets; a divergence is reported, not resolved. Any further LISP
   edit only inside that named section, paren-balance test standing guard.
4. **THE OWNER'S SANCTITY RULE, verbatim:** *"nigdy nie kasuj bez mojej
   zgody jakichkolwiek funkcji — to jest świętość."* This turn DELETES
   NOTHING. F1 re-wires which modal opens; the old `SettingsPanel.jsx`
   STAYS IN THE TREE, un-deleted, and export by material stays
   byte-for-byte. The only removal already licensed and still pending from
   T35: the hinge-plate stand-in (F4 below — his explicit order, quoted).
5. **Fixtures, `depthSteps`, check rules' existing behaviour: untouchable.**
   Modals draggable, beside their object.
6. **PROOFS ARE NOT OPTIONAL — the T35 lesson.** T35-F1 shipped an engine
   and a modal but no clickable target, and no screenshot existed to catch
   it. This turn: EVERY feature with a visible surface ships at least one
   `verify/t36/` proof with its named subject, driven by real pointer
   input, or the feature is not done. Commit per feature, mergeable head,
   skip-and-note, PR before morning, full suite never `--silent`,
   clean-room, vite build, zero new dependencies. Use parallel subagents
   for independent features; engine-law features tests-first.

## Features

### F1 [CRITICAL] — ONE SETTINGS MODAL: the wizard's panel becomes the only
### one, and it gains everything the old one has

The owner, seeing sheet sizes appear in one panel and not the other:
*"mamy new project i edit project — 2 różne setup modale, a powinien to być
ten sam modal. Sprawdź dokładnie i dołóż wszystkie funkcje ze starego do
nowego."*

The audited facts: NEW project → `NewProjectFlow` → `WizardSettings`;
EDIT project → `DesignSettingsModal` → `SettingsPanel` (the old panel).
T35 landed sheet sizes (F15) and the hinge pilot (F8) in the OLD one only.

**Build:**
* `WizardSettings` becomes THE settings surface. It gains, section by
  section, everything the old panel has and it lacks — the inventory,
  read from the code, to be re-verified against the tree before building:
  * **thickness** (per-family board thickness with the hard gate);
  * **sheet sizes** (T35-F15: per-family Jumbo / Standard / 10 ft /
    Other…);
  * **door-style** gallery (+ New style, filter, the workshop's own
    styles, the shaker-frame number);
  * **runner variant** (standard / tip-on) at project level;
  * **hinge-plate pilot ⌀3/⌀5** (T35-F8);
  * ANY other control present in `SettingsPanel` and absent from the
    wizard — walk the old panel top to bottom and carry every last row.
* `DesignSettingsModal` (edit-project) opens the SAME unified panel,
  loaded with the project's values; New-project opens it inside the flow
  as today. One form, two doors into it.
* The old `SettingsPanel.jsx` is NOT deleted (iron rule 4) — it simply
  stops being the thing the edit door opens.
* Every control keeps its exact behaviour and store wiring — this feature
  MOVES surfaces, it does not redesign them. Material assignment keeps the
  T34 hard gate on every source.

**Tests:** a source-level inventory test — every `data-settings-section`
and every named control of the old panel has a counterpart in the unified
one; the edit door opens the unified panel; the existing wizard tests stay
green. PROOF: screenshots of the unified panel from BOTH doors, same
sections visible.

### F2 [HIGH] — MULTI-SELECT: Ctrl+click, the group moves as one
Re-issued from T35-F2, unchanged: Ctrl+click selection set (uiStore),
scene highlight, group edits — shelves: position and depth to all
selected; LED strips: inset and depth to all selected; one Delete removes
the whole set through the heal sweep; plain click = today's single-select,
untouched. Tests as T35 listed. PROOF: three shelves selected and nudged
in one shot.

### F3 [MEDIUM] — SHOE FIX: the front becomes a switch
Re-issued from T35-F3, with the owner's closing word ("punkt 3 — tak, z
przełącznikiem"): modal toggle **Front: on / off**, default ON; front off
drops SHOEBOX-FR from panels/BOM/3D; `KIT_SHOE_BOX.lsp` gains the
one-line note. Tests: both states, board count, BOM.

### F4 [HIGH] — HINGES: the plate joins the 14.08 order, bites 5 mm into
### the side, and the modal lists them like the wall does
Re-issued from T35-F5, all three owner findings, verbatim in that spec:
(a) REMOVE the plate stand-in — a plate is the downloaded GLB or nothing;
the invisible pick target stays; (b) the plate GLB moves 5 mm INTO the
side (`hardware.hinge.plateBiteMm: 5`, profile-listed) so screws sit in
timber; (c) the modal's hinge rows sort by Y DESCENDING — top hinge first.
Tests: no plate primitive (the 14.08 assertion pattern); the bite from the
profile; the order pinned. PROOF: a side with plates seated, and the modal
listing top-first.

### F5 [HIGH] — CNC GRAIN: drawer boxes, drawer fronts and the plinth
### stand along the grain
Re-issued from T35-F6, verbatim owner law: *"szuflady w pionie, wzdłuż
słojów; fronty szuflad też; plinth też."* Grain axis per ROLE is law; the
layout may not rotate these roles off-grain. Tests pin the axis per role
and the no-flip rule. Named bucket `GRAIN_AXIS` (iron rule 2).

### F6 [HIGH] — SPLIT DOORS: the engine and the UI catch up with the kit
T35 merged the LISP section and its paren test; the engine half never
landed. Build it now AGAINST that section: bay field "Split door: top
segment height ___ mm" (0 = none); bottom = opening − top − 3; ONE
auto fix shelf at the split at FULL depth (no 20 setback — its own law),
G thick; per-segment hinge sets via `hingesRequired`; per-segment handles
and mirrors; 3 mm between segments; top edge per T35-F12; BOM/CNC per
segment from its own hinge edge; modal segments top-first. Tests: the
arithmetic, the shelf law, hinge counts per segment, modal order. PROOF:
a split bay open in the scene.

### F7 [HIGH] — THE TOP BOX: a small wardrobe that rides the main one
Re-issued from T35-F14, verbatim reason (*"wysokie szafy nie wejdą do
domu"*): library offers Main wardrobe + Top box; the Top box snaps flush
on a main (same depth, x aligned, y = main's height), rides its moves;
red fault when orphaned; its own carcass/doors/BOM/CNC. Tests: snap,
ride, orphan fault, own BOM. PROOF: the pair standing, dims per unit.

### F8 [MEDIUM] — THE RAIL IS CLICKABLE: the missing double-click target
The owner, eye-testing T35-F1: *"nie ma możliwości 2 kliku i edycji tego
drążka."* The engine and the modal landed; the `<Rail>` tube in
`Hardware.jsx` has NO handler — nothing to click. Build: double-click on
the rail tube opens the hanger modal beside it (the shelves' own
`onEditElement` grammar); hover aura so the hand can see it is clickable.
Tests: the handler pinned at source. PROOF: the modal open beside a
double-clicked rail.

### F9 [LOW] — LIGHTING: a new project starts DARK
The owner: *"default teraz jest lights on — powinno być odwrotnie: OFF
default, a ON na życzenie klienta."* New projects start with the F10
switch OFF; the legacy load mapping from T35-F10 stands unchanged (an old
project that was shining stays ON). Tests: new-project default, legacy
mapping untouched.

### F10 [LOW] — INTERIOR FRONT DIMENSIONS: the law covers every interior
### front, not only drawers
The owner: *"front shoe boxa nadal widoczne wymiary przy zamkniętych
drzwiach."* T35-F11's law generalises: in a unit with doors, the front
dimensions of ANY interior element — drawer fronts, the shoe box's front,
anything future — render only while the doors are open. Door dims and
doorless units untouched. Tests: shoe-box front covered; drawers still
covered; open shows all.

## What this turn does NOT touch

Export by material (byte-for-byte). `SettingsPanel.jsx` stays in the tree.
`depthSteps`, golden fixtures. Parked list unchanged (L-shape, props,
JoineryCore, AGD GLB, sliding, nesting, hood, sheen per-slot, internal
metal default, hinge arm 15 mm). EGGER stays BLOCKER #44.

## Order of work

F1 first (the owner called it the problem behind half his evening), then
F6 (engine against the waiting kit), F4, F5, F2, F7, F8, F3, F10, F9.
Commit per feature; the morning audit holds this file against the diff
line by line, the classifier holds rule 2, and rule 6 holds every visible
feature to a photograph.