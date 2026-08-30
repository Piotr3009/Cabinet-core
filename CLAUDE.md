# CLAUDE.md — TURN 55 · THE SLOPE SETTLES ITS DEBTS, THE WATCH DRAWER FINISHES

Run autonomously. Zero questions, zero stops. If a feature cannot land, skip it,
note it in the report, and move on — sacrifice from F8 upward, never F1/F2.
PR before morning. Branch `t55`, base `origin/main` (a09b09d or later).

## STANDING LAW (unchanged, enforced)

- **LISP IS LAW.** Geometry originates in `reference/lisp/` first. Paren-balance
  stays 14/14 at 0/0 (`scripts/t50-paren-balance.mjs`).
- **BYTE-IDENTITY.** The six golden fixtures stay byte-identical
  (`t55-classify.mjs`, copy the t54 classifier forward). Goldens are FLAT rooms:
  a slope fix that moves a flat room is a fault. Slope-case deltas are expected
  here and must be NAMED in the classifier. `UNNAMED=0`.
- **Sanctity.** Deletions licensed this turn, and no others:
  1. the `infillMitre` interception path for the run-top-infill board (F1),
  2. the infill shear/rotation split across `3d/panelSolid.js` / `3d/UnitView.jsx` (F1),
  3. `WATCH_FINISHES` entries `oak` and `walnut` and every reference to them (F5).
- **One path per job.** Report, per feature: how many paths do the same thing
  (a number), and the line balance `+X/−Y`. Y<X or every added line explained.
- **New feature = visible UI entry in the same package.** Proof by screenshot:
  "where I click → what opens/changes", committed under `verify/t55/`.
- **Full suite, never `--silent`.** Playwright rig screenshots committed.
- No new npm dependencies. Owner quotes below are law; code and UI copy English.

---

## F1 [CRITICAL] · TOP INFILL UNDER THE RAKE — FOUR EXPLICIT CORNERS

The parked fix from 30.08, now due. Owner's simplification, verbatim:
*"prosty kawałek, zawijanie likwidujemy."*

The law (already established T53/T54, unchanged): under a rake the top infill is
**ONE straight board — FACE only — a parallelogram with plumb ends**. SHELF/wrap
exists on level stretches only; TL/TR returns on level ends only.

The work:
1. In the engine, compute the infill's **four corner coordinates explicitly**
   (room frame). Those four corners are the SINGLE source of truth for the 3-D
   mesh, the 2-D drawing, and the DXF outline. Nothing downstream re-derives
   the shape.
2. **Delete** the `infillMitre` interception of the slope-cut infill board in
   `src/3d/mitre.js` — the board no longer passes through it. Physical deletion,
   not a gate.
3. **Delete** the shear/rotation rendering split for this board across
   `3d/panelSolid.js` and `3d/UnitView.jsx`. The mesh is built from the four
   corners directly.
4. Search-first rule: the slope sampling law already lives in `cabinet.js`
   (`slopeHeightAt` / `cutOver`, the TOP PANEL / CORNICE precedent). Take that
   law for the corner maths; name the source in the report. Do not write a
   second slope sampler.

Tests: node:test on the four corners (straight rake + T47 knee fixture),
residual < 0.001 mm against the ceiling line minus gaps. Rig screenshot:
closed wardrobe, slope left, the infill sits flush between door top and
ceiling line — `verify/t55/f1-infill.png`.

## F2 [CRITICAL] · SHAKER UNDER THE SLOPE — THE PICTURE, NOT THE ENGINE

Owner's screenshot 30.08: a closed 2-door shaker wardrobe under a left rake
shows a broken front. **The engine is proven clean** — reproduced numerically
this afternoon: leaf outlines parallel to the ceiling to <0.1 mm, the shaker
recess holds a true 60 mm frame PERPENDICULAR to the diagonal (119.95 mm
vertical at 60°, expected 119.98), knee handled, hinges forced to the tall
edge. Do not touch engine geometry for this feature.

The work:
1. Reproduce with the rig: wardrobe W1000 H2200 D600, `front_type:'S'`,
   `door_count:2`, `slope_cut {pts:[{x:0,y:1300},{x:520,y:2200},{x:1000,y:2200}],
   infill:40}` — closed doors, front view. Commit the BEFORE frame.
2. Expectation: F1 removes the wrong triangle above the doors (the un-fixed
   infill was the prime suspect). Re-shoot AFTER F1. If the shaker leaf itself
   still renders wrong, the fault is in `3d/shakerSolid.js` (`buildTray` with a
   no-flat-top outline) or `3d/UnitView.jsx` placement — fix in the 3-D layer
   only, engine untouched.
3. Commit `verify/t55/f2-shaker-before.png` / `f2-shaker-after.png`.

## F3 [HIGH] · THE SLOPE FLIPS A DOOR → THE DOOR PARTITION IS FORCED

Owner, verbatim: *"wymuszamy tylko jak się orientacja drzwi zmienia na skosach
… nie wymuszamy przez wielkość szafy absolutnie nie"* and *"usunięcie
wszystkiego co mogłoby nam rozwalić układ czyli drążki szuflady etc … klient
ustawi wszystko sobie od nowa."*

Why: under a left rake both leaves are forced hinge `R` (T46 law). The left
leaf's hinges then land mid-cabinet where no carcass side exists. A door needs
wood to hang on.

The law:
1. Trigger: a leaf whose FORCED hinge (`meta.hingeForced`) puts its hinge edge
   on a line with **no carcass side** (it faces the neighbouring leaf). Cabinet
   width is NEVER a trigger. No slope, no forcing.
2. Action, once per transition (when the slope first forces it, in the store —
   not on every recompute): insert the **door-mount partition** on that hinge
   line — the same partition bay doors hinge on (T21/F9 machinery, hinge kind
   `partition`; partition foot screws etc. all existing law). Reuse it; do not
   write a second partition.
3. Clear the unit's interior fitting: wardrobe kits and items — rods, drawers,
   shelves, inserts. The owner's sentence above is the licence. The partition
   and the doors stay.
4. UI entry (rule: visible in the same package): a notify the moment it
   happens — `"Slope flipped the doors — a door partition was added and the
   interior was cleared."` — plus a Check line naming the partition while the
   forcing stands. Screenshot `verify/t55/f3-partition.png`.
5. Hinges of the flipped leaf drill into the partition (existing partition
   drilling law); test asserts cup columns land on the partition line.

## F4 [HIGH] · THE GLASS ACCEPTS THE FORCED SHELF (PARTITION)

Owner: *"z automatycznym dodaniem leda dookoła szyby … na półce która jest
wymuszona nad szufladami."*

Everything about the pane already exists (T53 F8b/F8c: opening 50 mm in from
every edge, rebate, pane flush with the top, LED ring 15 mm underneath). It
refuses only because two checks ask `part === 'SHELF'` and the auto board over
a drawer bank is `part: 'PARTITION'` (role `shelf`).

The work: ONE predicate in the engine (e.g. `isShelfBoard(p)` — part `SHELF`
or `PARTITION`), consumed by BOTH askers: `watchShelfAbove`
(`src/stores/projectStore.js` ~6160) and the engine's `shelfAbove` filter
(`src/engine/cabinet.js` ~7318). One law, one definition, two callers. Report:
paths doing this job = 1.

Tests: a wardrobe whose watch drawer sits under the PARTITION — checkbox
enabled, pane cut in the partition, LED ring born, warning
`watch_glass_needs_shelf` absent. Flat twin: behaviour on a plain SHELF is
byte-identical. Screenshot `verify/t55/f4-glass.png`.

## F5 [HIGH] · WATCH FINISH — TWO CHOICES, WIRED FOR REAL

Owner: *"usuń po prostu … zrobimy sprayed (color frontów) albo carcass"* and
*"zostaw project jako carcass — teraźniejsze ustawienie."*

1. **Delete** `oak` and `walnut` from `WATCH_FINISHES`
   (`src/engine/watchDrawer.js`) and every reference — physical deletion.
   Surviving control: **Project** (null — the project's own decor, exactly
   today's default, reads as the carcass) and **Sprayed** (the project's front
   spray colour).
2. Wire the value through: today it dies in `born.finish` (cabinet.js ~7401)
   and reaches neither the 3-D nor the BOM — that is the whole bug. The insert
   parts (frame, dividers, base) carry the finish on their records; the 3-D
   material pick honours it; the BOM lines for the insert say it.
3. Balance for the deletion reported `+X/−Y`.

Test: toggle Sprayed → insert parts' resolved material = front spray; Project →
today's decor, byte-identical to before this turn. Screenshot
`verify/t55/f5-finish.png` (one frame per choice).

## F6 [MEDIUM] · INSERT GRAIN — HORIZONTAL, BORN THAT WAY

Owner, verbatim (now a Petros iron rule): *"wszystkie przegródki muszą być w
poziomie słoje nie w pionie"* and *"jak mamy oklejać to musi być wzdłuż słojów
nigdy w poprzek — to jest święta zasada w sheet goods."*

Watch-insert parts are currently born with NO `grain` field at all
(`watchInsertParts`, `src/engine/watchDrawer.js`). Set the drawn orientation /
`grain: 'h'` at birth for every insert board (dividers, frame rails, base) —
grain runs horizontally on the piece as fitted. Single-source rule stands: the
cut decides the grain, the 3-D renders what was cut. No per-role visual
overrides. Test asserts every insert part carries `grain` and it is `'h'`.

## F7 [MEDIUM] · LED LEARNS THE RAKE — LEVEL RUNS ONLY

Owner: *"skos bez LED … pionowych i poziomych łatwiej."*

`src/engine/ledStrips.js` knows only the flat W×H box: side strips run
`H − 2G`, top strips sit at `y = H` full width — under a rake they stand proud
of the carcass. The law:
1. **No strip along the diagonal.** Horizontal strips exist only on LEVEL
   stretches of the roof polyline, trimmed to that stretch's span.
2. A vertical side strip under the rake ends at the roof height at its own x
   (minus the existing insets).
3. Search-first: sample the SAME roof law (`slopeHeightAt` / `cutOver`) the
   carcass uses. Name the source. No second sampler.
4. BOM lengths (`lightingBomLines`) follow the trimmed strips.

Flat twin: a flat room's strips are byte-identical. Screenshot
`verify/t55/f7-led.png` (sloped wardrobe, strips inside the outline).

## F8 [LOW] · THE UNIT PANEL STOPS LYING ABOUT THE HINGE

Drilling, the door modal and ElementProperties already read the FORCED hand
(`meta.hinge` / `meta.hingeForced`, T46 law). The unit-level select in
`src/components/RightPanel.jsx` (~464) still shows raw `params.hinge`. Give it
the same conduct as ElementProperties' `hinge-side`: when every hinged leaf is
forced, show the forced hand, disable, one-line reason
(*"Cut on the slope — the door opens from the slope."*). Mixed case (some
forced, some free): the select governs the free leaves and says so in the
title. Add the missing assertion: under a slope, cup drilling side ==
`meta.hinge` for every leaf. Screenshot `verify/t55/f8-hinge.png`.

---

## ORDER, PROOF, REPORT

Order: F1 → F2 → F4 → F5 → F3 → F6 → F7 → F8 (F3 after F5 so the interior
clearing does not fight the finish tests; sacrifice from F8 downward-first).

Every feature: node:test first for engine law, rig frame committed under
`verify/t55/`, full suite (expect 4753 green + this turn's new), classifier
`t55-classify.mjs` verdict with named deltas only, paren balance 14/14.

Morning report, numbered: per feature — done/skipped, paths-count, `+X/−Y`,
licensed deletions confirmed executed, test totals, classifier verdict,
screenshots list.