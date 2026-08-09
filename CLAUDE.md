# CLAUDE.md — Cabinet Core, TURN 17

The PARITY turn: what the owner sees in a part must be what the machine
cuts, and what leaves for the machine must carry the cabinet's number and
nothing else. Then hinges, drawer heights, and two new kits built from the
owner's OWN numbers.

Read the whole file first. Full autonomy, zero questions. Clean or not at
all; the turn shrinks from the BOTTOM — and it is ordered so that shrinking
drops the KITS (F9–F11) before it touches the CNC truth (F1–F4).

Baseline: main after the turn-16 merge PLUS two chat packages —
`cabinetcore-editor-ibl-*` (the editor window gains the RoomEnvironment
probe: `Environment` exported from `3d/Scene.jsx`, mounted in
`CabinetEditorModal.jsx`) and `cabinetcore-swiatla-10-3-*` (studio points
now 10/10 at yMm 1650 and 3/3 at yMm 500). Tests at baseline: 1327.

## 0. IRON RULES

All standing rules apply (turns 1–16): engine purity; profile.js the only
home of numbers; existing fixtures inviolable (ADDING is fine); no new
deps; mock mode; 0.5 mm + formatMm; English; full npm reinstalls; Actions
red; PR no merge; physical light units; library defaults read in source;
band-limit procedural detail; no `a?.x === b?.x`; one rig; spray colour
sacred; THE MODAL RULE; browser walk standard; NO nesting.

CNC EXPORT: this turn has **FOUR named deltas**, and nothing outside them.
Fingerprint before/after and publish every one in
`verify/t17/cnc-export-identity.md`, in these words:

1. **Every part carries its cabinet's number, inside the part** (F1).
2. **Everything that is NOT that in-part label leaves the exported DXF**
   (F2) — the sheet may still show whatever helps on screen.
3. **Shelves are laid out rotated 90°** so the export agrees with the 3D
   view (F3).
4. **Dog bones that the export already cuts become visible on the part**
   (F4) — a VIEW change with no geometry change, listed because the two
   were out of step and a reader must be told which one moved. It is the
   VIEW that moves. If the export is found to be missing a dog bone the
   part has, STOP: that is the opposite bug and it goes to BLOCKERS.

Anything else moving in the fingerprints is a REGRESSION, not a delta.

KITS: F9 and F10 are new kits and the pattern-first rule governs them. The
owner gave exact numbers; build ONLY from those. Where a number is
missing — a fixing pattern, a gap, a hinge position, a runner spacing —
write BLOCKERS and ship the kit without that feature. **Never invent a
workshop number.** A guessed kit costs two turns to unpick.

## F0 — Baseline

1. Full install → tests green (record; expect 1327) → build.
2. Verify both chat packages are on main: `Environment` is EXPORTED from
   `src/3d/Scene.jsx` and imported by `CabinetEditorModal.jsx`; the four
   `studio.points` read 10, 10, 3, 3. If either is missing, STOP and write
   BLOCKERS — do not re-implement blind.

## F1 — Every part says which cabinet it belongs to

Owner: "numer szafki musi być na każdym elemencie, inaczej się pogubimy
który jest do którego."

1. **The text.** `F-01 BUR 597x568` — the cabinet's number (the owner's
   own name since turn 16 F6, not an internal id), then the part code,
   then width×height. One formatter in the engine, used by the sheet and
   by the export, so the two cannot word it differently.
2. **Inside the part**, not beside it, not above it — a joiner reads it
   off the board.
3. **The size of the yellow heading above the CNC view.** Same type scale,
   in world space (turn 16 F3): it grows and shrinks with the drawing and
   it stays inside its outline. Where a part is too small to hold the
   whole string at a readable size, the label is what shrinks — it never
   spills over the outline and never overlaps a neighbour.
4. Its layer is the existing text layer; no new layer name without a
   BLOCKERS entry.

## F2 — Export by MATERIAL, and nothing but the labels

1. **Choose the material, export the lot.** In the CNC export the owner
   picks which assigned material to send (turn 16 gave the sheet its
   material grouping; this is the same identity, now driving what leaves
   the app). One material, one export — plus "all" as it is today.
2. **The exported DXF carries the in-part labels and NOTHING else.**
   Owner: "żadnych innych liter bo to nam zaśmieca program w CNC." Every
   other piece of text the sheet draws for a human — sheet headings,
   material names, part counts, group titles — is SCREEN furniture and
   must not reach the file. Named delta 2.
3. The per-panel ZIP keeps its turn-15 behaviour (a whole unit, for
   recutting one damaged formatka).

## F3 — Shelves lie the way the 3D view says they do

Owner: "odwróć wszystkie półki o 90 stopni w CNC — zobacz, w 3D orientacja
jest dobra ale nie współgra z CNC."

The 3D view is RIGHT and the sheet is wrong: a shelf is laid out across
the sheet where the cabinet has it running the other way, so the grain the
owner set in 3D is not the grain the machine cuts. Rotate the shelf's CNC
placement 90° so the two agree, and pin the agreement with a test: for
every kit that has shelves, the part's grain axis in the export matches
the panel's grain axis in the cabinet frame (the turn-13 rule, "grain =
the cabinet's space"). Named delta 3.

## F4 — A part in the editor shows what the machine will cut

Owner, on drawers: "jak je edytuję to nie mają żadnych wcięć, nie widzę
dziurek." And on a fridge back: "na CNC są dog bones a na elemencie nie
ma."

1. **Dog bones and drilling appear on the part** in the element view and
   the detail modal, from the SAME geometry the export reads — not a
   second drawing. Where the two ever disagree, the export is the truth
   and the view is the bug (rule 0, delta 4).
2. **A drawer is an element the owner can open and edit**, like a shelf —
   selectable in the editor, with its own detail view.
3. **Its pockets are drawn, and they are cuts with depths:**
   - `DRAWER_RUNNER_POCKET` — **2 mm** deep, at the very bottom, so the
     runners sit flush.
   - `DRAWER_BOTTOM_POCKET` — **7 mm** deep.
   Depths as numbers in profile.js. Layer names exactly as written above
   unless the repo already owns a name for them — if it does, keep the
   repo's and note it in BUILD-LOG.
4. NOT this turn: drawing the runner hardware itself (owner's decision B).
   The pockets are in; the runner's LOOK is not.

## F5 — Back, one level, in the editor

Owner: inside the editor, with ONE element open, there is no way back to
the cabinet — the whole editor has to be closed and reopened.

Add **Back** to the element level of the cabinet editor: it returns to the
cabinet view and deselects the part. It does NOT collapse the explode and
it does not close the window (owner's answer 1). Keyboard Escape does the
same thing at that level. One editor, one navigation rule.

## F6 — Three small verdicts

1. **Top infill above wall units goes UP to the ceiling** — the panel's
   turn-15 ability, on the infill: an up control AND a typed number for
   how far to raise it. Reuse the panel mechanics; different numbers,
   never a forked copy.
2. **Renaming a cabinet must be FINDABLE.** Turn 16 F6 shipped it and the
   owner cannot find it. Do NOT rebuild it — put the entry where he
   looked: on the unit's panel header and in the right-click menu, as a
   visible, obvious control. Screenshot both.
3. **The name label on the canvas looks professional.** Today it is a
   "paskudna chmurka". A flat, quiet label — palette colours, the app's
   type scale, no cartoon bubble. It is a look change; walk it.

## F7 — Hinges: a project standard, and hands on

1. **Project setup gains "Standard hinges: 2 / 3", default 3.** On 2, each
   door loses ONE MIDDLE hinge: a 3-hinge door becomes 2, and a 6-hinge
   door becomes 5 — one comes off, the outer ones never move. Positions
   for the remaining hinges follow the LISP maths already in the engine.
2. **Hinges are editable per door:** add one, remove one, move one. Same
   editing idiom as shelves (turn 9/11 per-element editing), so a joiner
   who can move a shelf can move a hinge without learning a new gesture.
3. Everything downstream follows: the drilling in the export, the 3D view,
   the BOM's hardware count.

## F8 — Drawer HEIGHTS, once the fronts are off

1. **Remove drawer fronts** on a drawer unit — the same idiom as turn 15's
   Remove doors — so the boxes can be worked on.
2. **Edit each drawer's HEIGHT** (not its position — the owner was
   explicit), the way shelf editing works.
3. **The clamp is the owner's:** a drawer may come no closer than 10 mm
   below the bottom runner — **28 + 10 mm measured from the screw
   centres**. Numbers in profile; the clamp is an engine function with
   its own test, and the UI cannot exceed it.
4. The kit's 4:3:2 drift stays FROZEN (#64, owner-closed). This edits a
   unit; it does not touch the kit's defaults.

## F9 — KIT: D/W panel (dishwasher, washing machine, fridge front)

The owner's words, and only these numbers:
- It is **a front and nothing else** — no hinges, flat, no door furniture.
- **Height 594 mm, rigid.** Always under 600, or the appliance door
  cannot open. Not a default: a fixed value with a test that says so.
- **The plinth is cut out at that position, 20 mm from the top.**
- **One top panel, always 600 mm wide**, depth as the rest of the run.
- Named **"D/W panel"** in the library; the same kit answers for washing
  machines and fridges.
Everything else about it — fixings, gaps, how it meets its neighbours —
was NOT given. BLOCKERS, not invention.

## F10 — KIT: Oven base unit

- The oven is **595 high**, so the shelf it stands on sits **598 mm from
  the TOP of the cabinet** — from the top, not from a centre line. Say so
  in the code comment, because it is the sort of number that gets
  "corrected" later.
- **A drawer below**, drawn as the drawers are drawn (F4 gives it its
  pockets; the runner's look is out this turn).
- **No back except behind the drawer.** That back fixes the standard way —
  **4 dog bones: one at each side, two into the bottom of the cabinet** —
  the fridge pattern from turn 14.
Anything not listed goes to BLOCKERS.

## F11 — A measuring tool

A ruler in the canvas: click one point, click another, read the distance
in mm. formatMm, 0.5 mm, palette colours, Escape cancels. It measures; it
never edits.

## F12 — Browser walk + docs + GATE

Walk (screenshots to `verify/t17/`, committed): a part on the sheet
reading `F-01 BUR 597x568` inside its outline, near and far zoom; an
export of ONE chosen material, with the DXF text listing showing labels
only; a shelf's grain matching between 3D and the sheet; a drawer opened
as an element with both pockets visible; a fridge back showing its dog
bones in the element view; Back returning from a part to the cabinet;
a top infill raised to the ceiling; the rename control where the owner
looks; the new name label; hinges at 2 and at 3, and one hinge moved by
hand; drawer fronts removed and a drawer height edited to its clamp; the
D/W panel at 594 with its plinth cut-out; the oven base with its shelf 598
from the top; the ruler measuring a run.

Docs: BUILD-LOG per phase; BACKLOG updated; BLOCKERS for every number the
kits needed and did not have. GATE: full reinstall → all green (1327 +
new) → clean build → existing fixtures diff 0 → deps untouched → engine
purity → CNC identity showing FOUR named deltas and nothing else →
`verify/t17/` populated → PR.