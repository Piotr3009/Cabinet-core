# TURN 51 — the verdict

*What the owner ruled on 26.08.2026, and what tonight did about it.*

Suite **4541 / 4541**, 0 fail, never `--silent`. Build clean. Six goldens
**IDENTICAL**, `UNNAMED = 0`. LISP **13 kits, every one 0/0**, one file moved.
Acceptance walk **33 / 33** steps, 15 pictures, every one looked at.

All eight features shipped. **Nothing was sacrificed** — F8, F6's presets and
F7's CSV import were the named order of retreat and none of them was needed.

---

## The eight, and what each one actually cost

### F1 — the wall editor is reverted, and the plan is real

> *"drawing room w ogóle nie ma sensu — cofnij całkowicie to i zostaw dodawanie
> wnęki i boxa jak wcześniej, ale żeby działało."*

The revert was the easy half: `engine/wallDraw.js`, its test, the drawing
surface and `room.drawn_walls` are gone; Rectangle, L-shape, + Box and Import
DXF stand in **both** doors, which is F1's own instruction and T50's F12 kept.

The half that mattered was *"żeby działało"*, and **neither fault was visible
from the code**. Both were found by using the app, which is what CLAUDE.md
asked for:

1. **`+ Box` was drawn behind `scope === 'room'`.** A ONE-WALL job — most of
   the jobs this app quotes — had **no button at all**. His *"nie pokazuje
   się"* was literally true. T50's own test asserted that gate and called it
   correct.
2. **A RECESS and a CHIMNEY were read by nothing.** Stored on
   `project.wallSlopes`, listed under "On this wall", drawn in the wall
   editor's top view — and both `3d/Room.jsx` and the placement filter that
   list to `kind === 'slope'`. He drew an alcove and the room did not have one.

A chimney is now an obstacle by the route a box in the plan has taken since
T14; a recess is **not** one, because an alcove is room and standing a cabinet
in it is the whole reason a joiner draws one.

### F2 + F3 — the layout settles itself

> *"nie działa ustawianie automatyczne, nie ma zapytania … a jest poniżej 400."*
> *"dojeżdżam — panel się pojawia, nie dojeżdżam — panel znika. proste."*

One `settleLayout(focusId)`, called from `addUnit`, `moveUnit`, `removeUnit`
and `updateUnitParams` — the last only where a dimension moved, so **a colour
change does not pay for it**. Module-scope recursion guard, exactly as CLAUDE.md
predicted the loop.

**The cabinets move.** `shareOutRun`'s arithmetic was right; the SCRIBE FILLERS
refused every move, because they are obstacles and were sized for the widths the
run had a moment ago. They stand down for the lay-out and come back re-cut.
Measured: five 600s at 40..3040 → six cabinets at 653/655 spanning 40..3960, no
overlap, **not one "limited by" notice**.

**The panel follows the hand**, both ways, which T50 could not do: it answered
"where does a panel need adding" and so could not tell a finished junction from
one that had ceased to exist.

*One correction to the spec's own arithmetic, for the record:* the offer stands
while the leftover is **less than** 400. A run at 40..3640 in a 4000 wall leaves
40 at the margin and 360 of shadow — 400 exactly, and the app is right to stay
quiet. It cost this walk a first run before the fixture was made unambiguous.

### F4 — the leftover is measured from the CARCASS

There are **two questions** at the end of a run and reading one measurement for
both was the bug. "Can a cabinet go here?" is measured to the padded edge — a
run's own end panel is a real board — and `test/add-plus.test.js` caught the
first cut of this change breaking it. "What is left over?" is measured from the
cabinet body. Both come back now and each caller reads the one it means.

The zero this fixes is real and is a test: an end unit with a 40 mm panel taken
to the wall read `gap: 0`, so the bar said there was nothing to share.

### F5 — LISP first: the cup bore respects the shaker's rebate

> *"puszka trochę odstaje od lica … może puszka jest oka, ale otwór jest za
> głęboki?"*

He was right, and the last four words are the whole of it. The rule is born in
`reference/lisp/SKYLON_COMMON.lsp` (`SKY:cupThickness` / `SKY:cupDepth` /
`SKY:cupTooThin`) and the application follows it: the bore takes the thickness
**at the cup** — full board on the shaker's frame, less the rebate in the panel
field, decided by the cup's **far edge** (21.5 + 35/2 = 39) and not its centre.

What it prevents, in CLAUDE.md's own example: a 16 mm leaf with a 6 mm rebate
under a cup that overhangs the frame has 10 mm of material. The old rule bored
`min(11, 16 − 1) = 11` — straight through. It bores 9 now, and **Check #22 says
so** rather than the app silently shortening a hinge that then does not hold.

A GLASS front is the same sentence with the rebate going all the way through.

### F6 — the light panel, built like a room

Four lamps — **ceiling, left wall, right wall, facing** — each a switch and a
strength. The mapping onto the rig that is already there is written down; the
bands are the ceiling, the pillars are the walls, the key/fill/spots are facing.
Ambient, hemisphere and rim stay out of it: a panel that could turn the scene
black is a panel whose first use is an accident.

**Nothing gets brighter by default.** Both pillars are built now so both
switches have a lamp, and the default reads the very same `pillars.count`/`side`
the scene used to read — so an untouched project is lit by exactly the lamps it
was lit by last night.

**THE EXPORT IGNORES THE PANEL**, enforced on the light rather than by a second
rig: every panel-driven lamp carries `ccExportIntensity` and `renderCapture`
swaps to it. Proved on the live scene — two completely different panel settings,
the editor visibly different, **the export rig identical lamp for lamp**.

Presets: Showroom (= the shipped rig), Bright, Moody, and Neutral with the walls
**off**, because a pillar rakes a gloss front on purpose and that is exactly
what you do not want when the question is "is this the right white".

### F7 — the materials warehouse

`Database ▸ Materials` opens the warehouse now, not the design modal — which is
why he could not find one.

PC's twelve columns in PC's order; `id` and `price_source` are ours and are
**not** columns, because one PC does not know would break the interchange. Its
own table with RLS. The owner's nine departments plus **Others**, which is a
real department with a real count. Subcategories flat and renameable in bulk.
The screen is his layout, card and all.

`jc_uuid` matching **overwrites and keeps the shelf label**; a row with no uuid
is a new row, because matching on name too would cost a warehouse its integrity
the first time two suppliers both sell "18mm MDF". A re-import over a hand-typed
price is **applied and reported** — both silences are faults, and keeping the old
price would be an import that did not import.

Two exports, two documents, named as CLAUDE.md writes them.

**Two bugs this turn's own tests found and fixed:** `mergeImport` left the price
provenance to its caller (a JC payload came out marked "typed"), and the
shopping list's name key collapsed whitespace instead of dropping it, so
"18mm MDF" and "18 mm mdf" read as two boards.

### F8 — side walls default to 2000

One number, in the profile, in the block that already holds what the workshop
knows about walls. **They were 1000, not 1500** — the 1500 in his sentence is a
number he has typed into that field on a job. The engine's fallback is the same
number and a test holds the two equal. A room that states its own length still
wins, including zero.

---

## Findings, and what was NOT done

* **No golden moved.** F5 changes the depth of a hole every one of the six has.
  `--cup` measures rather than claims why they held: four of the six ARE
  shakers, and their 60 mm frame carries the whole ⌀35 cup, so the material at
  the cup IS the board.
* **T50's own test asserted the `+ Box` scope gate** and called it right. It is
  rewritten in place with the reason, rather than deleted.
* **T49's reading of "usuń boxy" is reversed** by F1's own list of four tools.
  Named in the code and here rather than slid past.
* **One action is one undo step.** `refreshAutoParts` and `settleLayout` are
  each a batch; an unbatched action calling both took three history entries for
  one typed width. `test/turn12-undo.test.js` found it.
* **`scripts/e2e-turn50.mjs` no longer runs** — it drives the wall editor this
  turn removed. Left as the record of what T50 did, like every past walk.
* **Not touched, as instructed:** the DXF export's emptiness, the dog-bone
  thresholds, the slope geometry, and every LISP file but the one F5 needed.

## The numbered eye-test list

`verify/t51/EYE-TEST.md`.
