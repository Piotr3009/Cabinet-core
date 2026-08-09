# CLAUDE.md — Cabinet Core, TURN 14

Eighteen owner verdicts from a long live session on turn 13. Read the whole
file first. Full autonomy, zero questions. Clean or not at all; the turn
shrinks from the BOTTOM — which is why the quick daily-pain fixes sit at
the TOP and the two big builds sit late.

Baseline: main after the turn-13 merge. Tests at baseline: 1159.

## 0. IRON RULES

All from turn 13 stand: engine purity; profile.js the only home of numbers;
existing fixtures inviolable (NEW fixtures for NEW parts may be added);
no new deps; mock mode; 0.5 mm + formatMm; CNC identity (byte-identical
except deltas this file names, fingerprinted both sides, published);
English; full npm reinstalls; Actions red; PR no merge; physical light
units; read library defaults in source; band-limit procedural detail; no
`a?.x === b?.x`; one rig; spray colour sacred; THE MODAL RULE (shared
shell, draggable, beside the object — editor window stays the sanctioned
maximised exception); browser verification is a standard phase.

## F1 — Quick bugs & regressions (the daily pain, first)

1. **[REGRESSION] Clicking a wall no longer deselects.** History: turn 11
   built it; turn 13's #65 fix (walls were EATING cabinet clicks) swung
   the pendulum the other way. Fix so BOTH invariants hold at once, and
   pin them as a PAIR in one e2e step so the pendulum cannot swing again:
   (a) click on wall/background → selection empty;
   (b) click on a cabinet THROUGH a wall → that cabinet selected.
2. **[BUG] A wall unit's top infill cannot be removed** — unchecking it in
   the context menu does nothing. Removal must remove.
3. **[BUG] The blue helper line (edge→ceiling) stays** after the top
   infill is set — it must disappear once the infill exists.
4. **Hover highlight OFF.** Nothing highlights on mouse-over; highlight
   appears only on CLICK (selection). Delete the hover treatment.
5. **Room setup, the two small fixes now** (the big rebuild is F10):
   (a) in Rectangle mode, TYPING a wall length keeps the RIGHT ANGLES —
   the rectangle rescales; today it shears into a rhombus (owner
   screenshot: two walls at 3041.4 after typing 4500);
   (b) scope **"One wall"** shows ONE wall in Room setup and in the scene
   — that wall plus, optionally, two 1000 mm side stubs forward. Never
   the whole room.

## F2 — [CRITICAL] FRIDGE backs sit ON the dog bones, per the LISP

Owner, precise: the small back panels sit BELOW the dog-bone row — the
LISP puts them exactly ON it; the top back is UPSIDE-DOWN (bones at the
bottom, must be at the top); the bottom back sits above instead of ON.
Fix 1:1 against `reference/lisp/KIT_FRIDGE.lsp` with line citations in
comments, the way turn 12 F10 did. If any golden fixture encodes the wrong
position, STOP and write BLOCKERS instead of touching fixtures (the SINK
rule). Regression tests on the corrected geometry.

## F3 — Top infill ENDS at obstacles (#55 activated, plus one new case)

The owner parked this at turn 8; it is now live:
1. A wall-unit run's top infill stops AT an end panel that runs to the
   ceiling (a standing/tall unit's panel) — no wrapping past it.
2. A tall unit's top infill ends ON a side infill — today it cuts through
   it. One termination rule, both cases, in the run/mitre logic the top
   infill already owns (no parallel implementation). Tests for both.

## F4 — Element modals: doors, end panels, infills, bottom panel

The owner's model: added/attached elements are clicked DIRECTLY and get
their OWN modal (shared shell): **doors, end panels, infills** — and the
bottom masking panel once F6 exists. Carcass stays in the editor window;
shelves/partitions stay as they are.
1. Each modal carries that element's properties (material/colour from the
   unit palette per turn 13 F3, geometry fields that apply).
2. **Door extend moves HOME:** it is a DOOR property — it lives in the
   door modal, not in the cabinet's carcass panel. Keep the engine as is
   (`door_extend` param); relocate the control.
3. While there: the owner reports the checkbox vanished for his wall
   units even though `types.js` WUD carries `doorExtend: true`. Verify
   every wall-unit LIBRARY entry (turn 12 data) resolves to a type with
   the flag; fix the data if an entry lost it.

## F5 — The bottom masking panel under wall units (#45, specified)

New part, run-based like the plinth:
1. One continuous panel under a RUN of wall units: **length = the sum of
   the run's units; depth = unit depth + 10 mm** (it hides the 10 mm
   wall standoff). Docking a unit extends it; an end panel or gap is a
   boundary (reuse the run logic).
2. Material: the FRONT material/colour pipeline (as the plinth got in
   turn 11) — flag in BUILD-LOG that the owner assumed sprayed/front and
   may adjust.
3. Enters BOM and CNC as a new part family with NEW fixtures; the CNC
   identity report lists it as this turn's deliberate delta. The
   `autoparts` slot already anticipates it by NAME — use it.
4. Its own modal per F4; F3's termination rules apply where it meets
   panels.

## F6 — Context menu, redesigned

1. **"Edit cabinet" FIRST and framed** (a bordered, standout entry).
2. **"Show all dimensions" LAST.**
3. Sections divided by a DELICATE line in the app's gold: [top infill +
   plinth] | [all end panels] | [the rest]. Data-driven order.
4. **Remove the hinges toggle entirely** — the choice is senseless
   (owner). Hinges stay visible as turn 13 left them; REDRAWING the
   hinges is a parked, separate topic — do not touch their look.

## F7 — The element DETAIL modal (double-click a part after explode)

Split view, shared shell, near-maximised like the editor:
1. LEFT: a 3D view of THAT element alone — zoom, pan, rotate.
2. RIGHT: the element's CNC DRAWING — the machined outline and paths with
   a LAYER LEGEND (names + colours from `cnc/layers.js`), dimensions with
   delicate extension lines from the edges.
3. Dimensions are INTERACTIVE: hovering a machining (e.g. SCREWS_3MM)
   highlights it in the drawing and shows its note; the element's OVERALL
   dimensions are always visible.
4. Reuse the drawings machinery (turn 6) for the right side — do not fork
   a second drawing engine.

## F8 — The editor window comes alive

1. **Doors OPEN in the editor** — the open-state animation exists for
   fronts (turn 8); wire it to a click/control in the editor so the owner
   can look inside and behind a door up close.
2. **Every part is selectable with ACTIONS** — including auto parts (the
   spur panel above a fridge, the sink kit's pieces): edit / move /
   remove where the physics allows; where it does not, a short
   explanation (the #58 pattern: say WHY, do not silently refuse).
   Removal/move of an auto part is a design-layer override on the unit
   (paramsForEngine), never an engine fork; BOM follows.

## F9 — Eye-level front lights (owner chose variant A)

The gloss reads only at steep angles because every strong light is high.
Add a SYMMETRIC PAIR of front point lights at EYE LEVEL:
1. Extend the `studio.points` spec with **`yMm`** — an ABSOLUTE height in
   mm (eyes do not scale with the kitchen; x/z stay rig-distance
   fractions). Spec: left+right of centre (x ≈ ±0.35), z ≈ 0.7, **yMm:
   1650**, intensity in the PHYSICAL teens (start ~12), warm white, NO
   shadows (the caster budget is untouched), `ccLight: 'point'` (the
   lightScale role exists).
2. Tune in the walk until an orbit at sheen 60–90 shows a travelling
   highlight at NORMAL viewing angles, not only from below. Numbers in
   profile; the owner will turn them.

## F10 — Room setup, the new paradigm (the big build)

Owner: corner-dragging is unusable — it wrecks the room and right angles
cannot be caught. Replace the interaction:
1. **Drag WHOLE WALLS, not corners.** Grabbing a wall moves it along its
   normal; neighbours stretch; angles are preserved. Corner handles go.
2. **Typed distance, AutoCAD-style:** start dragging (or select a wall),
   TYPE a number, Enter → the wall moves EXACTLY that many mm in the drag
   direction.
3. **Insert box** (chimney/pillar): place a rectangular obstacle in the
   plan; its walls are edited the same way (drag whole side / typed
   distance). It renders in 3D, participates in placement collision like
   walls do. Engine-side: a pure obstacle model with tests.
4. L-shape stays; the same wall-drag editing applies to it.
5. Rectangle right-angle lock from F1.5a is the constraint foundation —
   build on it, do not duplicate.

## F11 — Browser walk (standard) + docs + GATE

Walk highlights (screenshots to `verify/t14/`, committed): the F1.1 PAIR
invariant in ONE step; infill removed by uncheck; FRIDGE backs on the
bones (compare framing with the owner's screenshot); infill stopping at a
ceiling-height end panel AND at a side infill; door modal with Door
extend; masking panel under a three-unit run, fourth unit docks; context
menu order + gold dividers; detail modal with a hovered SCREWS_3MM
highlighted; a door OPEN in the editor; a spur panel removed with BOM
reflecting it; eye-level glint at a normal angle; a wall dragged 20 →
typed 202 → moved exactly 202; an inserted box blocking a unit.

Docs: BUILD-LOG per phase; BACKLOG (#45 closes, #55 closes; hinges-redraw
parked; cutouts parked); BLOCKERS for anything reverted. GATE: full
reinstall → all green (1159 + new) → clean build → existing fixtures diff
0, additions listed → deps untouched → engine purity → CNC identity
(deltas: masking panel only) → verify/t14 populated → PR opened, not
merged.