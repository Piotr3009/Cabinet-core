# CLAUDE.md — TURN 62 · PBI: THE ROOM, COPIED 1:1

Run autonomously. Zero questions, zero stops. Skip-and-note. PR before morning.
Full suite, never `--silent`. Frames committed under `verify/t62/`.

## THE LAW THAT GOVERNS THIS WHOLE TURN

The owner, 01.09.2026, verbatim:

> *"ale cała idea była że niektóre zmiany są wspólne, po to mamy cały silnik w
> jednym miejscu. jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie
> zmieniaj PRO, tylko zrób identycznie w retail."*

Read that three times. It overturns how T59–T61 were built and it is the
measure this turn is audited against.

**COPY. Do not re-invent.** Where PRO has a screen the client needs, the retail
screen is that screen's code, copied file-by-file into `src/retail/`, with the
markup and the behaviour kept and only the SKIN changed. Not "written afresh in
retail language" — that phrase produced a chip where PRO has an editor, and the
owner's verdict on it was *"miało być prawie 1 do 1 a jest 1 do 20"*.

**Do not cut. Do not touch PRO.** `src/components/**` is frozen at byte level
and the freeze test proves it. The copy is additive: PRO keeps its file, retail
gets its own.

**Copy is not a licence to diverge.** Every behaviour PRO's editor has, the
retail copy has: the same gestures, the same fields, the same refusals, the
same defaults, the same order of controls on screen. If a behaviour is dropped,
it is named in the PR body as a skip with a reason — never dropped silently.

**What may be SHARED rather than copied**: pure logic with no React and no
styling. That is the point of one engine in one place.

## THE THREE DECISIONS ALREADY MADE

The owner ordered the spec without answering three questions. They are decided
here, one line each, so he can overturn any of them with one word before push:

1. **`src/lib/**` becomes shared core.** The slope maths (`wallElements.js`,
   `slopeFlat.js`, `slopeLine.js`) is pure and already correct; retail imports
   it instead of growing a second copy. *(Overturn by saying: "lib zostaje w PRO".)*
2. **The room is set up in a MODAL in retail, as it is in PRO.** It needs a
   drawing and it is done once. *(Overturn: "pokój w kolumnie".)*
3. **Ivory & Onyx skin, PRO structure.** Same controls, same places, PBI
   tokens. *(Overturn: "retail ma wyglądać jak PRO".)*

---

## WHAT IS FROZEN

1. **PRO — zero bytes**: `index.html`, `src/App.jsx`, `src/main.jsx`,
   `src/components/**`, `src/pages/**`. The freeze test stays green, unedited,
   unweakened. This turn ADDS retail copies; it does not refactor PRO into
   shared parts. Extracting a shared component out of a PRO file would move
   PRO's bytes — forbidden, even where it looks tidier.
2. **`src/engine/**` cut geometry**: six goldens byte-identical,
   `computeCabinet()` matches LISP, `UNNAMED=0`. No engine file is licensed
   this turn. If F-work seems to need one, that is a skip-and-note, not an edit.
3. **`reference/lisp/**` untouched.** Parens 14/14 at 0/0.
4. **`src/lib/**` — copy-safe, edit-hostile.** Retail may IMPORT from it. Retail
   may not change it. If a `lib` function needs a new argument to serve retail,
   that is a skip-and-note with the reason — PRO reads those functions too.
5. **The RAIL is not rebuilt.** The 8-row RAIL, the FURNITURE tiles, the
   CARCASS/FRONTS split, the Egger tile modal: all still waiting on the owner's
   mockup. Not started, not scaffolded, `CATEGORIES` not renamed.

---

## F1 · THE BOUNDARY LEARNS THE DIFFERENCE BETWEEN LOGIC AND UI

`test/turn59-f1-the-switch.test.js` currently asserts, in one line,
`zoneOf(src/lib/anything.js) === 'pro'` — *"src/lib is NOT the shared core"*.
That line is why the slope became a chip: retail could not reach the maths and
was told to write its own, so it wrote none.

- Move `src/lib/**` into the `core` zone in that test, beside `engine`, `3d`
  and `stores`. Update the violation message to name the four-plus-one zones.
- The self-test that proves the walker is not blind keeps working: it must
  still resolve `src/App.jsx` as `pro` and `src/3d/Scene.jsx` as `core`. Add an
  assertion that `src/lib/wallElements.js` is now `core`.
- **The component half of the boundary does NOT move.** `src/components/**` and
  `src/pages/**` stay `pro`; retail importing a PRO component is still a
  violation and the test still says so. The owner's law is *copy*, not import.
- Write the reason into the test file in the owner's own words (the quote at
  the top of this file), so the next turn cannot undo it by accident.

**Proof**: the boundary test green with the new zoning; a new assertion naming
`src/lib` as core; the component half still failing on a planted violation
(the test's own self-check).

## F2 · THE ROOM EDITOR, COPIED

Source: `src/components/RoomModal.jsx` (721 lines).
Target: `src/retail/design/room/RoomModal.jsx` — a COPY.

Method, in this order:

1. Copy the file verbatim into the retail path.
2. Repoint its imports: `../lib/*` → the shared `src/lib/*` (now legal, F1);
   `../engine/*`, `../stores/*`, `../3d/*` unchanged; any import that resolves
   into `src/components/**` is a COPY TOO — walk the tree and copy every PRO
   component it reaches, into `src/retail/design/room/`, recursively, until
   nothing outside the boundary is imported. Name every copied file in the PR
   body with its source path and line count.
3. Change ONLY the skin: class names and CSS to PBI tokens (Ivory & Onyx,
   zero border-radius on panels, gold at 5% maximum, Cormorant for the title,
   Inter for controls). Structure, control order, labels, gestures, refusals:
   **unchanged**.
4. Do not delete a control because "a client would not need it". That judgement
   already cost this project a turn.

What the copy therefore carries, because PRO has it:

- **Rectangle** and **L** presets.
- **Walls** list with typed wall LENGTH per wall — using `setWallLengthCorners`,
  which keeps every angle (T14 F1.5a: a rectangle must not shear into a
  rhombus).
- Corner drag and whole-wall drag along the wall's own normal (`moveWall`),
  snapped to `profile.editor.mmStep`.
- **Room height (mm)** / **Wall height (mm)**.
- **+ Box** — boxes in the plan, in BOTH scopes (T51 found `+ Box` hidden
  behind `scope === 'room'`, which left the commonest job with no door to it;
  do not re-introduce that bug in the copy).
- **Boxes in the plan** list, with remove.
- **Import DXF plan** if PRO's file offers it — copied, and if its handler
  reaches a workshop-only path, the button stays and greys with the reason.
- **Drawn in** / **Cancel** / the modal's own commit.

Retail entry: **YOUR SPACE → EDIT THE ROOM**, opening this modal. Per the
house rule, the modal is draggable and opens beside its trigger, never on it.

**Proof**: `verify/t62/f2-*.png` — the entry; the modal open on a rectangle;
the L preset; a typed wall length holding its right angles; a box in the plan.

## F3 · THE WALL ELEVATION, COPIED — AND WITH IT, THE REAL SLOPE

Source: `src/components/WallElevationModal.jsx` (1096 lines).
Target: `src/retail/design/room/WallElevationModal.jsx` — a COPY, same method
as F2 (verbatim, repoint, recursive component copies, skin only).

This is the feature the owner named: *"gdzie jest slope ale nie cały sufit
tylko część"*. The engine has always had it; retail was given a
`SLOPED CEILING NO | YES` chip instead. The copy restores the whole editor:

- **Two views on one wall's data** — the PLAN strip and the ELEVATION. A slope
  edited in one cannot drop a chimney the other put there (the file's own
  comment states this; the copy keeps that property).
- **Put on the wall** — the add row, offering: **slope**, **recess**,
  **chimney**, **window**, **door**, with `ToolArt` drawings.
- **A slope's own fields**: **Side** (L | R), **Start height**, **Run**, and
  **Flat** — where `lib/slopeFlat.js` converts run↔flat and where
  `flatFieldShown(slopeCount)` decides whether Flat is offered at all. Two
  slopes on one wall means each is entered by its own run: carry
  `TWO_SLOPES_NOTE` verbatim.
- **A recess / chimney**: **Width**, **Depth**, **From the left**, drag in plan.
- **An opening**: **Width**, **Height**, **From the left**, **Sill** (window
  only) — the same records F6 of T61 already writes, now editable in the place
  PRO edits them. T61's ADD WINDOW / ADD DOOR buttons in the column are DELETED
  and replaced by this editor's own — one door to a window, not two. Say so in
  the balance. (Licensed removal; see LICENSED REMOVALS.)
- **On this wall** — the element list with **Take it off the wall**.
- **Back** / **Done**.
- Defaults exactly as `lib/wallElements.js` states them: slope
  `{ side:'R', startHeight:1800, run:900 }`, recess `{900, 300}`,
  chimney `{600, 350}`, and nothing smaller than `MIN_ELEMENT_MM`.
- Every number stays clamped by `clampSlope` / `clampPlanElement` — no second
  clamp is written in retail. The 3D room already draws `wallHeightAt`; nothing
  in `src/3d` needs touching for the slope to appear.

Retail entry: from the room modal's wall list, **one wall → its elevation** —
the same route PRO takes.

**Proof**: `verify/t62/f3-*.png` — the editor open; a slope on the RIGHT with
run 900 shown in elevation; the SAME slope standing in the 3D room, cutting
part of the ceiling and not all of it; a recess; a window; two slopes on one
wall with the note.

## F4 · THE COLUMN STOPS SHOUTING

The owner: *"te twoje pola na liczby są okropne, duże, rozwalone po całości,
w ogóle to nie ma składu ani takiego ładnego porządku"*.

He is right, and the cause is in `src/retail/design/controls.jsx`: `Field`
stacks label above input above a note, and every numeric row carries a range
line AND a sentence. Six numbers become eighteen lines.

- Rewrite `Field` as a **dense row**: label left, input right, one line. The
  range is not a permanent line — it lives in the input's `title` and appears
  under the field ONLY when a value is refused. The note under a field is gone
  unless a caller passes one deliberately, and no more than one per panel.
- The input itself: PBI tokens, softly rounded, hairline border, gold focus
  ring, right-aligned figures, the unit as a quiet suffix inside the field.
  One height for every control in the column; nothing taller than a chip row.
- Apply to every panel in `Options.jsx`. Column 3 should read as a list of
  settings, not as a page of paragraphs.
- Where PRO puts a control, retail puts the same control in the same order.
  Where PRO writes no sentence, retail writes none.

**Proof**: `verify/t62/f4-*.png` — YOUR SPACE before/after in the same viewport,
with the row count visible; a refused value showing its sentence and only then.

## F5 · SLIDERS DIE IN THE DETAIL PANEL TOO

T61 put typed fields in the column and left sliders in the DETAIL menus, so the
same width has two doors — a slider in `WardrobeMenu` and a field in LAYOUT.

- Every numeric slider in `src/retail/design/detail/**` becomes the F4 row:
  `WardrobeMenu` (width, height, depth and any other), `RailMenu`, and any
  other menu holding one. Chip rows stay chip rows.
- The `Slider` export in `controls.jsx` is deleted when its caller count
  reaches zero. Check, and say the number in the balance.

**Proof**: `verify/t62/f5-*.png` — a detail menu with no slider in it; the
caller count for `Slider` printed in the PR body.

---

## TESTS AND PROOF

1. Full suite green, never `--silent`. The PRO freeze test green and unedited.
2. Goldens ×6 byte-identical; `computeCabinet()` vs LISP exact; `UNNAMED=0`;
   `verify/t62/t62-classify.mjs` (copy t61's) — **zero engine files changed**
   this turn, and the probe fails if any did.
3. Parens 14/14 at 0/0.
4. The boundary test green with `src/lib` in core and components still out.
5. A COPY-FIDELITY test, new and the important one: for each copied file, read
   the PRO source and the retail copy off disk and assert that the retail copy
   contains **every control label PRO's file contains** — `Side`, `Run`,
   `Start height`, `Flat`, `Width`, `Depth`, `Height`, `Sill`,
   `From the left`, `On this wall`, `Put on the wall`, `Take it off the wall`,
   `Rectangle`, `L`, `Walls`, `Box`, `Boxes in the plan`, `Room height (mm)`,
   `Wall height (mm)`, `Drawn in`, `Back`, `Done`. A label PRO has and retail
   does not is a FAILING test with the label named. This is what stops "1 do
   20" from happening twice.
6. A slope test that goes end to end: write `{ side:'R', startHeight:1800,
   run:900 }` on a 4000 wall and assert `wallHeightAt` gives 2500 at x=0 and
   1800 at x=4000 — the ceiling is cut on PART of the wall, not all of it.
7. Playwright walk: every F's frames as listed, committed under `verify/t62/`.

## LICENSED REMOVALS

- T61's ADD WINDOW / ADD DOOR buttons and their panel block in the retail
  column, superseded by F3's elevation editor. One door to a window.
- T61's `SLOPED CEILING NO | YES` chip, superseded by F3's real slope.
- The `Slider` component in `src/retail/design/controls.jsx`, when its caller
  count reaches zero (F5).
- Nothing else. Anything else the night wants to delete: skip-and-note.
- Tombstone comments: two lines maximum.

## BALANCE

Per feature: files touched, lines added and removed. For F2 and F3, a table of
every COPIED file — PRO source path, retail path, line count, and the list of
changes made to it (which must read "imports repointed, classes reskinned" and
nothing else). Then answer, in one line each:

- How many places now decide a wall's height at a point? (Must be one:
  `lib/slopeLine.js`.)
- How many editors write `room.openings`? (Must be one.)
- Which PRO behaviours were dropped in the copy, and why?

## SKIP-AND-NOTE ORDER

F5 → F4 → F2 → F3 → F1. F1 goes first in execution (nothing else compiles
without it) but is last to be sacrificed. F3 is the turn's reason for existing:
if the night can only finish one big thing, it finishes F3.