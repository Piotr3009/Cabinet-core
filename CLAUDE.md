# CLAUDE.md — Cabinet Core, TURN 11: THE DAILY-USE BATCH

Twenty-four owner-verdict fixes and features from live use, plus the New
Project "Step 5 — Project settings". Read the whole file first. Full
autonomy, zero questions. Every phase lands CLEAN or is reverted WHOLE with
a BLOCKERS entry — "clean or not at all".

This turn follows TURN 10 (render realism). Baseline = main AFTER the T10
merge. Record the test total you find; everything you add grows it.

## 0. IRON RULES (unchanged + this month's scars)

1. Engine purity: nothing in `src/engine/` imports React or three.
2. `profile.js` is the only home of numbers and of behavioural defaults.
   Different workshops = different NUMBERS, never different formulas.
3. Golden fixtures inviolable: `git diff --stat fixtures/` empty at end.
4. No new dependencies; `package.json` deps byte-identical.
5. Mock mode sacred: no `.env`, everything works.
6. 0.5 mm precision; `formatMm()`; no `Math.round` on mm in UI.
7. CNC EXPORT path untouchable (this turn changes the CNC *view* per F8 —
   the exported data, grouping and files must be byte-identical).
8. Code and comments in English. UI copy in English.
9. npm discipline: full reinstall before believing any regression.
10. GitHub Actions red by design — ignore; the gate rules.
11. PR at the end, no merge.
12. Physical light units (three r0.180): point/spot intensities are
    candela-like, fade with distance squared.
13. Read a library's prop DEFAULTS in its node_modules source before use
    (the drei `scale=10` scar).
14. Band-limit any high-frequency procedural detail (`fwidth`, see bevel.js).
15. Never `a?.x === b?.x` as an existence guard.
16. One rig for working view and render.
17. Spray colour is sacred.
18. **Browser verification is now a STANDARD phase** (F10). A feature that
    was never seen in a browser is not done.

## F0 — Baseline

Full install → full test suite green (record the count) → clean build.

## F1 — Selection & interaction (the daily irritations)

1. **Deselect on ANY background click.** Clicking the floor, a wall, or
   empty space clears the unit/element selection and its dashed box. Today
   only some surfaces do it. ESC keeps working.
2. **Exclusive selection.** Selecting a shelf/element REMOVES the unit's
   own highlight — exactly one thing wears the selection at a time. The
   right panel follows whichever is selected.
3. **X-ray is a MODE, not a moment.** Once toggled on it survives unit
   drag, camera orbit, selection changes — everything — until toggled off.
   Find why it resets (likely state coupled to pointer/redraw) and decouple.
4. **The right-click context menu**: (a) never renders outside the
   viewport — clamp/flip near edges so the whole menu is always visible on
   low screens; (b) is draggable by its header.
5. **Dimension labels/lines: default colour RED**, with a profile option
   for the current blue (`appearance.dimensions.colour` + alt). Today it is
   the reverse.

## F2 — Shelf spacing: finish the job

Owner screenshot after T9's fix: gaps 226.5 / 227 / 244.5 — the BOTTOM gap
is still wrong. The LISP formula (KIT_WARDROBE_FULL.lsp 133–142, N+1 equal
gaps) landed in `evenShelfPositions`, so the bug is in the ZONE fed to it:
almost certainly the bottom bound (cabinet floor top face vs plinth/base vs
drawer top) or a thickness accounted on one end only.

1. Re-derive the zone bounds strictly from the LISP files (read the
   drilling sections, not only the front-view helper) for BUD and WARDROBE.
2. Fix at the layer that computes the zone. Add node tests asserting ALL
   gaps equal (to 0.5 mm) for 1/2/3 shelves in: plain cabinet, cabinet
   with drawers below, cabinet with plinth. Fixtures diff stays 0.
3. **Adding a shelf defaults to centred** in its zone (owner verdict —
   today's default lands wrong). Equalise action unchanged otherwise.

## F3 — Per-element editing: the whole cabinet

T9 gave shelves selection + overrides. Extend to the rest:

1. **Selectable + editable individually:** sides, bottom, top, back,
   vertical partitions, end panels, infills, doors' hinges. Same selection
   model (`{unitId, elementRef}`), same highlight, same right-panel
   properties (thickness override, material override, element-appropriate
   geometry fields). Overrides remain DESIGN-layer inputs via
   `paramsForEngine`; bare `computeCabinet()` unchanged; BOM reflects them.
2. **End panel and infill are edited on their OWN selection**, not through
   the unit's panel (owner verdict: "osobno, nie z całą szafką").
3. **Double-click** any element → opens an edit MODAL next to the element
   AND focuses the right panel on it. Single click keeps selecting only.
4. **Vertical partition**: addable from the unit's Add-items flow ("add
   partition"), positioned/edited like shelves are (this unblocks the T9
   BLOCKERS #50 gap at the UI level; engine items pattern already exists).
5. **Hinges visible in Solid** (today X-ray only): draw the hinge bodies
   from the same data X-ray uses, materials modest (dark hardware tone from
   profile). Toggleable via the existing context-menu toggles group.

## F4 — Placing and feeding units

1. **Move a unit to another position/side/wall AFTER placement**: dragging
   an existing unit across the run or onto another wall re-homes it (reuse
   the placement maths `addUnit` uses; this is re-parenting, not new
   geometry). Collision/gap rules as on insert.
2. **Empty scene → one BIG "+" centred** ("Add first unit"): opens the
   Library. Disappears the moment the first unit exists; returns when the
   scene is emptied.
3. **Inner "+" on the ACTIVE unit only** (different colour than the
   run-end pluses — take both colours from profile): click → unit stays
   selected and the right panel opens its **Add items** section (and the
   same via the F3.3 modal). Hidden the moment the unit is deselected.
4. **Add-items list filtered by context**: a data map in `profile.js`
   (`itemsByContext`) decides what a KITCHEN unit offers by default
   (shelves, drawers, cargo, bins…) vs a WARDROBE (shelves, hanger rail,
   internal drawers…), with a **"Show all"** escape hatch under the list —
   filter, never a hard block. Structure is data; do not hardcode lists in
   components.

## F5 — Infill, plinth, and small furniture truths

1. **Insets L/P: REMOVE from the menu** (owner verdict: broken concept).
   Replacement — **side infill with the top-infill strategy**: appears and
   disappears AUTOMATICALLY in a unit-to-wall gap; right-click offers
   "Pin infill left/right" — a pinned infill never auto-vanishes and
   STRETCHES as the unit moves (≥100 mm too), plus "Unpin/remove" returns
   to auto. Reuse the top-infill code paths/geometry (mitre rules etc.)
   rather than a parallel implementation.
2. **Infill default width 40 mm** (today 20) — one number in profile.
3. **Infill toggled OFF (context menu) re-enables "push to wall"** for
   that unit — today the disabled state lingers.
4. **Plinth sits at the FRONT of the cabinet** — today it renders at the
   back. Front face, recessed per existing LISP/profile numbers. And the
   plinth takes the FRONT material/colour (spray included), not the
   carcass one — through the normal materials pipeline so BOM says so too.
5. **SINK cabinet is oriented backwards** — flip the kit's orientation so
   its front is the front. Verify against `KIT_SINK.lsp`; fixtures diff 0
   (if the fixture itself encodes the flipped orientation, STOP and write
   BLOCKERS instead of touching fixtures).

## F6 — Dog bones as reality

Owner verdict: stop drawing CNC layers; show the JOINT. The engine already
computes true dog-bone sockets in `panel.cnc` (Skylon puzzle).

1. In Solid and X-ray, render sockets as REAL recesses in the panel
   volume — the rectangular pocket with round corner reliefs of the tool
   radius, exactly as the machine leaves them. Geometry from existing cnc
   data only; the engine and export stay untouched.
2. Implementation is your choice (shape-with-holes extrusion per face,
   etc.) but working-view cost stays sane: geometry built once per panel
   config, cached, no per-frame work.
3. A close-up screenshot of a joint goes into `verify/t11/`.

## F7 — Top menu order

`File · View · Library · Settings · Database · Spraying · Output` — with
**Database** gaining a dropdown: Materials, Clients, Projects (entries may
be disabled-"soon" consistent with today's mock state; wire what exists).
Output moves to the END. Keep every existing menu item reachable — this is
a reorder, not a cull. (If the owner later decides Settings moves, it is a
one-line data change — structure the menu as data.)

## F8 — CNC view usability

1. **All units' parts at once** in the CNC view, grouped per unit, with
   CHECKBOXES to hide/show any unit (and, within a unit, its parts) from
   the view. View-state only.
2. **Panels stay open**: entering CNC no longer closes the Library or the
   right panel. The right panel in CNC hosts the checkbox tree.
3. The CNC EXPORT (files, grouping, numbers) is untouched — prove it with
   an export-diff check in tests or a hard node check in the gate.

## F9 — New Project: Step 1 button + STEP 5 "Project settings"

**Step 1:** above the project-number field add the button **"Import from
Joinery Core"** — replaces the confusing "Select from Joinery Core" near
the client field. Disabled with a "soon" badge (data turn wires it); the
client+number auto-fill lands then. Steps 2–4 unchanged.

**Step 5 (new, before "Start designing"):** the whole project's defaults —
everything below stored per-project (design layer), pre-filled from
profile, savable as a settings set:

1. **Default dimensions:** base-unit height, ALL-units depth, tall-unit
   height, wall-unit height, plinth height. (Profile defaults preloaded;
   UK numbers stand.)
2. **Materials — three separate sections:**
   - **Carcasses (1–3 types):** per type: source EGGER decor / SPRAYED
     (yes, carcasses can be sprayed) — colour first, then the MaterialStock
     assignment beneath it.
   - **Fronts (max 2 types):** per type: RAL / F&B / veneer / laminate /
     wood (wood colour range comes later — leave the option present,
     colours "coming soon"). End panels/infills default to FRONT TYPE 1;
     a per-unit override already exists via F3.2's separate editing.
   - **Hardware assignments:** legs+bases+clips → plinth; hinges (variant
     choice: soft-close / standard — the automat picks the concrete item);
     runners; handles → wall units; edge banding auto-assigned per
     material. ALL of these have profile defaults and run automatically —
     the user only ever picks a VARIANT.
3. **Material thickness:** auto per source — EGGER 18, veneer 19,
   laminate 18; board thickness selector 18 / 22 / 25 / **Other** (manual
   mm input). The maths already lives in the LISP-derived engine — feed the
   number through `paramsForEngine`, never fork formulas.
4. **Sheen and Dog-bones sections:** exactly as they are today.
5. On **"Start designing"** ask once: "Save these settings as a set?" —
   into the existing settings-sets store.
6. Layout: keep the current modal's step-by-step feel; this is ADDING a
   step and reorganising materials into the three sections — not a
   redesign.

## F10 — BROWSER VERIFICATION (standard, mandatory)

Drive the real app in a real browser. Minimum walk, screenshots to
`verify/t11/`, committed in the PR:
1. Empty scene big "+" → add unit → inner "+" → add shelf (lands centred)
   → equalise 3 shelves → measure equal gaps on screen.
2. Click floor → selection drops. Select shelf → unit highlight gone.
   Double-click side panel → modal + right panel.
3. X-ray on → drag unit → orbit → X-ray still on.
4. Side infill auto-appear at wall, pin it, move unit 150 mm → infill
   stretched. Plinth visibly at FRONT in front colour.
5. CNC view with all units + one unit unticked; Library/right panel open.
6. Dog-bone close-up.
7. Step 5 walkthrough ending in the save-set prompt.
If your environment cannot exercise something, write the honest BLOCKERS
line instead of a screenshot that lies.

## F11 — Docs + FINAL GATE

1. BUILD-LOG: turn 11 entry per phase, decisions, tuned numbers.
2. BACKLOG: mark done items; add "Library categories rework — Kitchen top
   level, sub-categories TO BE DISCUSSED with owner" as a NEW item for a
   future turn (explicitly NOT in this one).
3. BLOCKERS: anything reverted or environment-limited.
4. Gate: full reinstall → all tests green (baseline + new) → clean build →
   fixtures diff 0 → deps untouched → engine purity grep empty → CNC
   export identity check passes → `verify/t11/` populated → PR opened,
   not merged.