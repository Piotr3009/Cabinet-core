# T48 — THE FLOOR IS LAW, THE INFILL IS A BOARD, AND THE LED REACHES THE SHEET

The owner, 25.08.2026, with his rulings in hand. **Nine features were asked
for and nine were delivered.** F9 was named the one sacrifice allowed and it
did not fall; nothing was sacrificed.

F1's STOP did not fire either: the floor clamp moved no golden, so it ships
ungated rather than behind a flag. Six IDENTICAL is measured against **the
engine T47 shipped** (`f586f8c`), not against this branch's own first commit.

---

## The audit, run on this branch

| gate | result |
| --- | --- |
| `npm test` (never `--silent`) | **4278 pass, 0 fail** |
| `npm run build` | **passes** |
| `t48-classify` vs the T47 base (`f586f8c`) | **six IDENTICAL, UNNAMED 0** |
| `t48-classify --infill` (tonight's own census) | **CLEAN** — not one of the six states a top infill or cuts an INFILL part |
| `t48-classify --census` (T42's rail census, re-run) | **CLEAN** |
| `t48-classify --cut` (the slope gate still opens) | **6/6 cut** |
| `t48-paren-balance --against f586f8c` | **13/13 at 0/0**, and **only `KIT_LED_GROOVE.lsp` moved** |
| the call graph | `ledGrooveEndExtra` defined once, called once, in one kit |
| the acceptance walk (`e2e-turn48`) | **28/28**, real pointer input, 9 shots |

---

## What each feature is, in one line

* **F1 — the floor is law.** ONE clamp, in `engine/items.js` beside
  `centredShelfPos` (`floorClampedPos`), called from ONE station in the store
  (`onTheFloor`, from `addItem` and `updateItem`), so a placement, a drag, a
  typed number and a loaded project all obey the same sentence. What is
  clamped is the element's **lowest point**, not its datum; the floor is the
  engine's own `interiorFloor`; the element the law catches says so
  (`meta.floorClamped`); an element already legal is handed back the very
  object it came in as.
* **F2 — the top infill is a BOARD, and the sheet cuts TWO.** Two plain
  rectangles, `(run + 20) × (40 + 20)` and `(run + 20) × (80 + 20)`, both
  widths ARITHMETIC. The site cut is +20 on the LENGTH, on ONE stated end,
  with no annotation. The corner L is gone from the geometry — no
  `chamferedRectGeometry`, no `mitre.L`, no `'long'` — and `mitre_45`
  survives only where two RUNS meet. The scene draws ONE board, like a
  plinth. **The side infills are not touched by one line.**
* **F3 — the plinth defaults ON.** In `newUnit`, the store's create path, and
  NOT in `defaultParamsFor()` — which is why the goldens do not move by a
  whole part. Which types is asked of `takesPlinth`, the engine's own gate,
  never a list.
* **F4 — LISP first.** `ledGrooveEndExtra` is born in
  `KIT_LED_GROOVE.lsp` with the ruling quoted and the REASON stated (the
  cutter is round; nobody chisels a corner). `src/lib/ledGroove.js` follows,
  and the suite parses the kit off disk and holds the two to each other.
* **F5 — the groove reaches the sheet.** `unitCncResult` is the ONE answer
  every surface that speaks to the machine now asks — the preview, the tree,
  the material sections and the per-sheet DXF. `LED_GROOVE` gained a screen
  ink so the legend can name what the sheet draws. `grooved()` cuts once.
* **F6 — one button.** The same control removes what it added, on all six
  tools, through the `removeLightingItem` that already existed.
* **F7 — `top_under` gets its own picture.** It had none and fell through to
  the SPOTS drawing. The 3-D emission was ALREADY down and is now stated
  rather than defaulted into (`EMITS_UP` / `EMITS_DOWN`).
* **F8 — dimensions hold their size.** `useScreenScale` in `DimLabel`, both
  projections, view-space depth, matrices refreshed in the frame. The chain's
  own sprite imports the law rather than copying it, and the double-click
  catchment follows it. Not one tuned ratio moved.
* **F9 — the label never clips into a lie.** `30x6~` is a size with a digit
  taken off it. The block breaks, then steps OUTSIDE with a leader, then
  hides — and it never cuts a digit. Preview only; the file keeps turn 16's
  ladder.

---

## The pictures, and what each one settles

Every one of these was looked at, and two of them were re-shot because the
first frame did not contain its subject — which is 25.08's lesson.

1. **`walk-1-infill-in-view.png`** — the run of two talls with the top infill
   over its head, in its room. The frame the owner asked for.
2. **`walk-1b-infill-close.png`** — the same board, close: ONE plain strip
   across the run's head, its face in the plane of the fronts. No L behind
   it, no shelf board in the room. The turning corner at the left end is the
   one 45° that survives.
3. **`walk-2-dimensions-far.png`** — the scene from **8.93 m**. Every figure
   legible.
4. **`walk-3-dimensions-close.png`** — the same scene from **3.13 m**.
   `H 2150` is the same height as it is in the frame above; the world-sized
   "+" controls have grown, which is the contrast that makes the point.
   Measured off the live scene, the way three draws a sprite: **25 labels,
   worst delta 0.00 px**, and each is exactly the height it asked for.
5. **`walk-4-lighting-panel.png`** — `Under the top` with a drawing of its
   own: the strip UNDER the top board, washing DOWN onto a shelf. The tool
   above it is the top wash, washing UP.
6. **`walk-5-led-added.png`** — one press, and the same button reads
   **`Remove from the top · T01`**.
7. **`walk-6-cnc-sheet.png`** — `LED_GROOVE 1` in the legend (the groove
   reached the sheet), `INFILL-T-FACE 1220x60` and `INFILL-T-SHELF 1220x100`
   as two boards with two labels, and `PLINTH 1200x100` because a standing
   carcass is born with one.
8. **`walk-7-the-scribe-filler.png`** — the two 60 mm strips on a sheet of
   their own, zoomed to where a joiner reads them.
9. **`walk-8-label-outside.png`** — three times life size:
   `T01 / INFILL-L-FACE / 60x2250`, standing clear of its own 60 mm strip on
   a leader. Every digit whole. It used to read `60x2~`.

---

## The numbered eye test — nine things to look at

1. **The floor.** Wardrobe → Add items → shoe box, and type 0 into its
   height. It should sit **on** the bottom board, not in it. The same with a
   shoe shelf.
2. **The infill, in the room.** A run of two talls, Add top infill. ONE board
   across their heads, like a plinth. Nothing behind it.
3. **The infill, on the sheet.** CNC view: **two** rows —
   `INFILL-T-FACE …x60` and `INFILL-T-SHELF …x100` — each 20 longer than the
   run, and no note about it.
4. **The plinth.** Place a BUD. The toe kick is there without asking. Place a
   WUD: it is not, and never will be.
5. **The groove.** Place a shelf, put a LED under it, CNC view: `LED_GROOVE`
   in the legend, and the slot 10 mm past the strip at **each** end.
6. **The LED button.** Press `Add under the top`. Press it again. It should
   say `Remove` in between and the line should be gone after.
7. **The picture beside it.** `Under the top` draws a strip **under** the top
   board shining **down**. The `Top wash` above it shines up. They are
   opposites and they should look it.
8. **The dimensions.** Turn a cabinet's dimensions on and drive the camera in
   and out. The figures must not change size. The blue and gold "+" discs
   will — they are controls and belong to the furniture.
9. **The label.** Park a cabinet at a wall so it grows a scribe filler, put
   it alone on the CNC sheet and zoom in. Its label stands beside the strip
   on a leader and reads `60x2250` — all four digits.

---

## Two things named, not hidden

* **The corner is cut by two different rules.** The top infill's half of the
  T15 mitre is gone (a plain board cannot carry a long point) and the SIDE
  infill keeps its matching triangle, because *"infill pionowy nie ruszamy"*
  was taken literally. On the rare run that turns against a ceiling-height
  filler, the side piece is cut back at 45° on the machine and the top board
  is cut on site off its 20 mm. That is the owner's ruling as written; if he
  wants the side filler squared off with it, it is one branch in
  `engine/cabinet.js`'s side-infill block and one test.
* **A label that steps outside may cross a neighbour.** On a tightly nested
  sheet the leader puts the words over the strip next door
  (`walk-8-label-outside.png` shows it). It is the trade the ruling asks for:
  a label in the wrong place is a thing the eye sorts out in a second, and a
  size with a digit missing is not.
