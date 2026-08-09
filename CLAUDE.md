# CLAUDE.md — Cabinet Core, TURN 13

Seven owner verdicts from live testing of turn 12, plus the partition
fixing pattern the owner just specified (#59), plus one SPEC closure (#64).
Read the whole file first. Full autonomy, zero questions. Clean or not at
all; the turn shrinks from the BOTTOM if it must.

Baseline: main after the turn-12 merge. Tests at baseline: 1062.

## 0. IRON RULES

All sixteen from turn 12 stand, including THE MODAL RULE (15: every modal
draggable + beside its object, through the shared shell). One sanctioned
exception is defined this turn: the cabinet EDITOR window (F2) opens
MAXIMISED by owner request — it is a workspace, not a side dialog; it keeps
its header drag (when un-maximised), ESC and close.

Fixtures: existing inviolable; NEW fixtures for NEW machining (partition
biscuits) are ADDED. CNC identity: byte-identical everywhere EXCEPT the
partition export, which gains drilling/biscuits this turn — a deliberate,
documented delta (it exported nothing there before). Fingerprint both
sides, publish in `verify/t13/cnc-export-identity.md`.

## F0 — Baseline

Full install → 1062/1062 → clean build.

## F1 — [CRITICAL] The flickering, vanishing panel faces

Owner screenshot: looking down into wall units, the TOP panels' faces are
partly missing and everything shimmers. Started when F6.2 (turn 12) turned
panels with dog-bone TABS into extrusions of their own outline.

Diagnosis FIRST. Two prime suspects, both consistent with the turn-12 F10
lesson (`cnc.rotated` nesting):
1. Winding/culling: an outline built in the ROTATED cnc frame and mapped
   into the cabinet can come out with reversed winding on some kits → the
   visible face is back-face-culled → "missing" surface from above.
2. Coplanar caps: tab geometry whose cap lies IN the panel's face plane →
   z-fighting → shimmer.
AND a third symptom with the SAME root, owner-verified: since the panels
became extrusions, TOP and BOTTOM grain runs FRONT-TO-BACK instead of
left-to-right. The `panelPlacement` mapping for TOP/BOTTOM (joinery.js —
CNC x along the cabinet's DEPTH) is machining truth and stays; the bug is
that the extrusion's UVs now follow that CNC frame. THE RULE: the visual
grain axis is a CABINET-SPACE rule, independent of nesting rotation —
horizontal panels (TOP/BOTTOM/shelves) grain along the cabinet's X
(left→right), vertical panels along the cabinet's height, exactly the
pre-turn-12 look. Decouple the solid builder's UVs from the placement
frame (or counter-rotate per placement) so world-space grain obeys it.
Regression test: grain axis per part class across every kit and both
nesting orientations.
Find the actual mechanism (log normals / compare kits exactly as F10 did),
fix at the outline→solid builder, and add a regression guard: a node test
asserting outward-facing normals for TOP/BOTTOM faces across every kit and
both nesting orientations, plus an e2e capture looking down into a wall
unit in `verify/t13/`.

## F2 — The editor window, grown up

1. The Edit-cabinet window opens near-FULLSCREEN (maximised; the rule-15
   exception above).
2. Add PAN (drag with right/middle button or a modifier — follow the main
   view's convention) alongside the existing orbit; today only orbit works.
3. Clicking a part inside the editor shows **"Edit element"** — the full
   element properties (the same override machinery), edited HERE.
4. MAIN VIEW selection model changes accordingly (owner verdict): clicking
   a cabinet selects the WHOLE cabinet again. Only ADDED interior items —
   shelves, partitions, rails — stay directly clickable in the main view.
   Carcass panels (sides, top, bottom, back) are edited exclusively
   through the editor window. Keep the element-selection code paths — the
   editor uses them; the main view simply stops routing carcass-panel
   clicks to them.

## F3 — Colour hierarchy: project → unit (→ element)

Owner set project colours in Step 5; editing ONE cabinet must offer THAT
cabinet's colour — today it silently rewrites the whole project.

1. Fix the bug: the unit edit modal writes a UNIT-LEVEL override
   (carcass finish, front finish per unit), never the project design.
2. The unit picker shows ONLY the project palette — Carcass 1..3, Front
   1..2, exactly the finishes Step 5 defined. No full colour lists. A
   "more colours" hint points back to Settings (where the palette grows).
3. "Reset to project" per unit. Element overrides (turn 9) sit above and
   are untouched. BOM/labels resolve element → unit → project.
4. Tests: override resolution order; picker offers palette only; changing
   a unit leaves siblings alone.

## F4 — Wall-unit end panel ends with the CABINET

Bug: a WUD end panel runs to the FLOOR. Verdict: it ends flush with the
hanging cabinet's bottom. The only future exception is a door/panel
EXTENSION below a wall unit (parked feature #45) — leave the data slot
(`endPanel.height` honouring a unit-class default: WUD → 'carcass') so the
extension can opt back into 'extended' later. Fixtures diff 0 (end panels
are design-layer); BOM height for WUD end panels shrinks accordingly —
that is the fix, assert it.

## F5 — Multi-select and bulk actions

1. **Ctrl+click** adds/removes cabinets to a selection SET (whole-unit
   selection per F2.4). Click without Ctrl = single. Background click
   clears (turn 11 behaviour).
2. The right panel over a multi-selection shows the COMMON actions:
   add shelves to all, Even/centre, and the shared property editors —
   fields with differing values display "mixed" and only write when the
   user sets them.
3. The right-click CONTEXT MENU applies to the WHOLE selection: Add
   plinth (the turn-12 run logic merges adjacent ones itself), infill
   pin, end panels, Add doors, unit colour (F3 palette).
4. Every bulk action is ONE undo step (single snapshot around the batch).
5. Tests: store-level bulk ops; single-snapshot undo; mixed-value
   detection.

## F6 — The golden plus learns doors

The plus-modal's add menu gains **"Add doors"** alongside items — same
action the right panel offers, one click closer. Trivial; do not gold-plate.

## F7 — Hinges visible by DEFAULT in Solid

Verdict: still X-ray-only in practice. Make the Solid hinge toggle default
ON (profile default; the toggle now exists to HIDE). If they still do not
appear with the toggle on, the rendering is branch-bound to X-ray —
diagnose and fix so Solid draws the same procedural hinges. e2e close-up
in `verify/t13/` from a fresh project (no toggles touched) — that is the
proof the DEFAULT shows them.

## F8 — Partition fixing: the BISCUIT pattern (#59, owner-specified)

The owner's workshop truth, now the reference. Implement in the engine as
pure functions + new golden fixtures; this is the deliberate CNC delta.

1. **The standard set** (joiner biscuit set), along the joint line:
   screw ⌀3 → 10 mm gap → **biscuit mark 70 mm** → 10 mm gap → screw ⌀3.
   The set STARTS no closer than **50 mm from the element's edge** — never
   less.
2. **Count by element width:** width ≤ 700 mm → TWO sets (one at each
   end, honouring the 50 mm rule). Width > 700 mm → add ONE more in the
   middle = three. That is all.
3. **The no-screw set** — the 70 mm biscuit mark alone — wherever a screw
   would break a VISIBLE face: e.g. a partition meeting the visible top of
   a fixed shelf must not be drilled through. Rule: a through-screw exists
   only where the receiving face is concealed; visible face → biscuit-only
   set in the same positions.
4. **Where it applies:** partition-to-carcass (top and bottom joints) and
   partition-to-fixed-shelf (the turn-12 attachment). Screw holes join the
   existing SCREWS_3MM machining family (turn-8 conventions — same layer,
   same sizes). The 70 mm biscuit marks go on a NEW DXF layer named
   **`BISCUIT_4MM`** — 4 mm, matching the owner's dedicated VCarve
   in-and-out program. Layer name exactly as written.
5. Tests: set positions for widths 400/700/701/900 (counts 2/2/3/3), the
   50 mm minimum, visible-face suppression of screws, layer assignment.
   New fixtures for a partitioned cabinet's partition/carcass files;
   everything else byte-identical in the identity report.

## F9 — Docs + SPEC closures

1. SPEC: "#64 closed 09.08 — the kit's 4:3:2 drawer split stays exactly
   as the kit cuts it (`exact:false`); the 1 mm drift at some heights is a
   recorded boundary, owner-confirmed."
2. SPEC: the biscuit pattern (F8) written up as the partition-fixing
   reference (numbers + rules), alongside a note that KIT-style reference
   files remain the model for future patterns (#61 door split, #62 DW,
   #63 corner/L still awaiting owner input).
3. BUILD-LOG per phase; BLOCKERS for anything reverted.

## F10 — Browser verification (standard)

Screenshots to `verify/t13/`, committed:
1. Looking down into a wall-unit run — full top faces, no shimmer (F1).
2. Editor maximised; view panned; a side panel in "Edit element".
3. Main view: cabinet click selects whole unit; a shelf still directly
   clickable.
4. Unit colour dialog showing ONLY the project palette; one cabinet
   recoloured, neighbours untouched.
5. WUD end panel ending at the cabinet bottom.
6. Ctrl+click three units → context menu → Add plinth → one plinth.
7. Plus-modal with "Add doors"; doors added.
8. Fresh project: hinges visible in Solid, no toggles touched.
9. X-ray of a partitioned cabinet showing the biscuit sets (screws + 70 mm
   marks) at correct spacing; CNC view layer `BISCUIT_4MM` present.

## F11 — FINAL GATE

Full reinstall → all green (1062 + new) → clean build → fixtures: existing
diff 0, additions listed → deps untouched → engine purity grep empty →
CNC identity: byte-identical except the documented partition delta →
`verify/t13/` populated → PR opened, not merged.