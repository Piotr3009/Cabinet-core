# CLAUDE.md — Cabinet Core, TURN 16

The MATERIAL turn. One theme carried through: a board is assigned ONCE and
read EVERYWHERE — Step 5, the element modal, the 3D view, the BOM, the CNC
sheets. Plus the owner's view verdicts from the turn-15 eye test. Read the
whole file first. Full autonomy, zero questions. Clean or not at all; the
turn shrinks from the BOTTOM — but F1+F2 are the turn: if they cannot land
clean, STOP and write BLOCKERS rather than shipping the tail without them.

Baseline: main after the turn-15 merge PLUS the chat batch
`cabinetcore-sheen-carcass-swiatla500-0908-*` (sprayed-carcass sheen fix in
design.js/materials.js, the low light pair in profile.js, tests
`sprayed-carcass-sheen.test.js`, turn14-eye-lights narrowed to the 1650
pair). Tests at baseline: 1289. A later chat patch may have re-tuned the
four point intensities — do not pin their exact values, only that the low
pair is the quieter one (the shipped test already says exactly that).

## 0. IRON RULES

All standing rules apply (turns 1–15): engine purity; profile.js the only
home of numbers; existing fixtures inviolable (ADDING new ones is fine);
no new deps; mock mode; 0.5 mm + formatMm; English; full npm reinstalls;
Actions red; PR no merge; physical light units; library defaults read in
source; band-limit procedural detail; no `a?.x === b?.x`; one rig; spray
colour sacred; THE MODAL RULE (shared shell, draggable, beside the object;
editor window = the maximised exception); browser walk standard; NO
nesting (owner-deferred — do not sketch it).

CNC EXPORT: byte-identical EXCEPT one named delta this turn — SHEET
GROUPING moves from sprayed/non-sprayed to ASSIGNED MATERIAL (F2). Part
GEOMETRY does not change; which sheet a part lands on may. Fingerprint
before/after, publish in `verify/t16/cnc-export-identity.md`, and name the
delta in those words.

Owner decisions already made — do not reopen them:
- Backs and drawer boxes stay on the CARCASS material (no own slots);
  a different board on one piece goes through the element override (F1.4).
- Wall units: door height and masking-panel height are TWO INDEPENDENT
  fields — no auto-follow (F4.3).
- Door extend default stays 38 mm; the number becomes editable (F4.1).

## F0 — Baseline

1. Full install → tests green (record the count; expect 1289) → build.
2. Verify the chat batch is on main: `test/sprayed-carcass-sheen.test.js`
   exists; `profile.appearance.studio.points` has FOUR entries (two at
   yMm 1650, two at yMm 500); `resolveFinishes` in design.js starts the
   carcass chain with the sprayed-carcass line. If any is missing, STOP
   and write BLOCKERS — do not re-implement blind.

## F1 — MATERIAL IDENTITY (the turn's heart, with F2)

The owner, verbatim: "przypisane materiały jeśli są takie same to łączymy,
jeśli inne to oddzielamy — dlatego przypisanie materiałów jest takie
ważne." Today only the carcass types carry a real board assignment; fronts
have NONE, infills/plinths/end panels/masks have none, and the element
modal shows a collapsed, mislabelled list. All of it is one hole.

1. **Fronts get a board assignment PER TYPE.** In Step 5 and in Settings,
   each front type (Front 1, Front 2) gains the same MaterialStock
   dropdown a carcass type has — same store, same Generic fallback, same
   T15-B hard gates (changing an effective thickness with units present
   ASKS Recompute/Keep; check-out refuses placeholders). The assignment
   lives on the front TYPE (`material_id`), exactly as it does on a
   carcass type.
2. **"Same as fronts" for the run pieces.** Infills, plinths, end panels
   and masking panels get a material control with a checkbox **"Same as
   fronts"**, DEFAULT ON. On = they follow front type 1's board.
   Unticked = an own MaterialStock dropdown appears for that group. One
   shared component, one store shape — four switches, not four bespoke
   widgets. (This is a PROJECT-level setting in Step 5/Settings, beside
   the Fronts block.)
3. **The element list tells the types apart.** `elementMaterialChoices`
   returns ONE entry per front TYPE (label from the type's own finish or
   its assigned board — "Front 1 · EGGER H3325", "Front 2 · RAL 3005
   spray"), never a single collapsed "front" row. Entries carry their
   `key`; the picker in ElementProperties matches by KEY, never by label
   (two identical labels must still be two distinct choices). Hex per
   type for the swatch, as the carcass rows already do.
4. **An element override reaches the PICTURE.** Today a per-element
   material choice reaches the BOM and never the 3D view. Fix at the
   root: the view resolves a panel's SURFACE from its effective material
   (override where there is one, role's default where not) — a shelf
   switched to Front 2's board turns that colour on screen. Engine stays
   pure: the resolution is a function of (panel, unit params, design,
   profile), unit-tested; UnitView only consumes it. Walk proof: change
   one shelf's material, screenshot before/after.
5. **One source downstream.** BOM rows, part labels, drawings and
   check-out all read the same resolved material — no second lookup
   table. Node tests: two fronts with different boards produce two BOM
   material groups; an override moves a part between groups.

## F2 — CNC BY MATERIAL (the other half of the heart)

1. **The sprayed/non-sprayed toggle goes.** Remove it from the CNC view.
   Sheets group by ASSIGNED MATERIAL only: same material → same section,
   different → separate. Three materials in the project = three groups.
   Identity by material_id (with its label as the header, as the BOM
   names it) — never by colour, never by finish kind.
2. Parts with "Same as fronts" ON land in front type 1's material group —
   the checkbox is an ASSIGNMENT, not a display state.
3. The by-CABINET view from T15 stays as it is; the by-material view IS
   this new grouping. The toggle between the two views stays.
4. This is the turn's ONE named CNC delta. Same part set, same geometry,
   new sheet membership. Fingerprint and publish (rule 0).

## F3 — CNC readability: symbols scale with the zoom

Owner screenshot: zoom out and the cabinet names, part codes and drilling
symbols stay screen-sized, pile onto each other and spill outside their
parts. Fix: ALL annotation in the CNC canvas (names, codes, dog-bone and
drilling marks, edge ticks) scales WITH the drawing — one world-space
transform, no screen-space text. Everything a part owns fits INSIDE its
outline at any zoom; if a label cannot fit at extreme zoom-out it
truncates/hides rather than overlapping a neighbour (threshold as a
number in profile). Walk proof: two screenshots, near and far.

## F4 — Doors and heights

1. **Door extend, single door:** the modal already extends; add the
   NUMBER — default 38 (profile), editable, formatMm, same clamp rules as
   the modal's other fields.
2. **Door extend, multi-select:** the function is MISSING there entirely.
   Add it beside Add/Remove doors: one action, one undo step, same
   default-38-editable field, applied to every selected unit's doors.
3. **Wall units — two independent heights.** A wall unit's DOOR height
   and its masking-PANEL height are separate editable values (owner
   decision B). The door field lives with the door (modal/section), the
   panel field with the panel; neither writes the other. Engine functions
   + tests for both paths; the T14 mask rules (L = run sum, depth =
   unit + 10) stay untouched.

## F5 — Save is a STATE, not a flash

The T15 green ✓ shows for a moment. Make it dirty-state: SAVED and
unchanged → the button stays GREEN with ✓ (also after closing and
reopening Settings); ANY tracked change since the last save → RED "Save";
saving → green again. Scope: per SECTION, matching the T15 red-Save
sections (Carcasses, Fronts). Comparison against the last-saved snapshot
of that section's data — not a boolean that a re-render resets. Colours
from the app palette. Node-testable: the dirty computation is a pure
function of (saved, current).

## F6 — A cabinet's NAME is the owner's

Default stays automatic (01, 02, WU05…), but it becomes EDITABLE — panel
header and/or unit modal, inline edit, stored on the unit. Everything
downstream prints the edited name: canvas labels, CNC part codes and
cabinet groups, BOM, drawings, check-out. Uniqueness: duplicates allowed
but flagged (a soft warning, not a block). Node test: rename → BOM and
CNC tree carry the new name.

## F7 — LIGHT in the element editor

Owner: the element detail modal / exploded editor is nearly black —
"serio nic nie widać". Raise its rig ~25% AND/OR add fill lamps from
other angles until DETAIL reads (dog bones, drilling, edge profiles).
The editor has its OWN rig — tune it without touching the main scene's.
Numbers in profile. This is a browser-loop phase: measure pixel
luminance on a detail region before/after, screenshot both to
`verify/t16/`. Do not eyeball it in code.

## F8 — Wall units do not shine like the base units

Owner: hanging units still lack the base units' gloss — "albo coś z farbą
jest nie tak". DIAGNOSE FIRST in the browser loop, fix what is found:
- read the actual door materials of a wall vs base unit from the scene
  (the __THREE_DEVTOOLS__ harness pattern from the chat lab): same
  roughness/env/colour? If not — material path bug; fix at the root.
- if materials are IDENTICAL, it is geometry: the eye pair at 1650 grazes
  wall-unit fronts and the 500 pair cannot reach them. Then the fix is
  the rig (e.g. the eye pair's height/spread or a dedicated angle), as
  DATA in profile, re-measured.
Publish the measurement (numbers, not impressions) in `verify/t16/`
whichever way it lands.

## F9 — Infill to the ceiling

A side infill gains the panel's T15 ability: "above unit" extension and
fill-to-ceiling. Reuse the panel's mechanics (store fields, clamp,
obstacle behaviour where applicable) — different numbers, never a forked
copy. The T15 pinned rules for panels stay green.

## F10 — Browser walk + docs + GATE

Walk (screenshots committed to `verify/t16/`): Step 5 with front-type
board dropdowns and the four "Same as fronts" controls; element modal
listing "Front 1 · …" and "Front 2 · …" as separate rows; a shelf
recoloured live by an element override (before/after); CNC by-material
sections named by their boards, three materials → three groups, no
sprayed toggle anywhere; CNC far-zoom with labels inside their parts;
door extend field at 38 on a single door and on a multi-selection; a wall
unit's door height and panel height edited independently; Settings Save
green after save, red after a change, green again; a renamed cabinet
appearing renamed in the CNC tree and BOM; the element editor's lit
detail (with luminance numbers); the wall-vs-base gloss measurement; an
infill filled to the ceiling.

Docs: BUILD-LOG per phase; BACKLOG updated (material model lands; W-item
numbers from the owner's turn-15 batch noted done); BLOCKERS for anything
reverted or discovered. GATE: full reinstall → all green (baseline 1289 +
new) → clean build → existing fixtures diff 0 → deps untouched → engine
purity → CNC identity (delta: sheet grouping by material, in those words)
→ `verify/t16/` populated → PR.