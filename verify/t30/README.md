# verify/t30 — the proofs of turn 30

**Baseline: `07ea132`, main. Suite at that commit: 2 328 tests, 2 328 pass, from
a clean `npm ci`.** Every phase below adds its own tests and its own pictures,
and the suite is green and the build clean at every one of the twenty-one
commits.

Run the walk with:

```
npm run build
npx vite preview --port 4173 &
node scripts/e2e-turn30.mjs            # or --only f1,f3,…
```

---

## R2 — the live bucket is BLOCKED in this container, and it is recorded

`bucket-live.json`: the storage host answers **403** to both manifests through
this session's egress proxy. Every GLB-dependent phase therefore runs on the
SILENT SHOWROOM (`test/fixtures/hardware-local/`, served by
`scripts/fixture-server.mjs`, reached through the app's own documented
`localStorage['cc.hardwareBase']` knob) — the app's catalogue resolution, URL
composition, loader, cache, clone, pose, mirror, swing and finish all run
exactly as they run against Blum's own files.

**Turn 30 grew the showroom by one family, and that growth is the point of F1.**
Until tonight it carried only `71B3550` — the 110° file every origin in
`profile.js` was derived from, and therefore the one file the old placement
could not get wrong. `scripts/make-fixture-hardware.mjs` now also writes
`71B7550` / `71B7590`, the 155° wardrobe family: the same cup at the same
absolute place, and an arm long enough to move the file's `min`. No Blum bytes
entered the repository; every vertex is written by that script from numbers in
that script.

---

## F1 [CRITICAL] — the hinge body stands on an ABSOLUTE datum

The owner, of a 155° hinge: *"jest za głęboko osadzony w drzwiach i się nie
otwiera."*

`modelOrigin` is MIN-RELATIVE — it says how far a file's bounding-box corner
must travel — and it was derived from `71B3550_42542984`'s own box. On that
file it is right by construction. A 155° body is longer behind the leaf, so its
`min` is somewhere else and the same subtraction carries the whole hinge in
after it.

**The fix is the KIND of number, not the number.** `fileDatum: { x: −7.75,
y: 0, z: 40.3 }` is the cup datum of the ONE authoring frame every Blum hinge
GLB in the bucket shares, and the body is placed at `−fileDatum`, absolute,
with the bounding box out of it altogether. `foldPivotMm` collapses with it, to
`axis − fileDatum`.

### Proved, not asserted

| | |
| --- | --- |
| on `42542984` the two transforms are **byte-identical** | `−min + modelOrigin = −min + (min − fileDatum) = −fileDatum`, read off the file's own bytes in `test/turn30-f1-hinge-datum.test.js` |
| on the 155° file they are **17.02 mm apart** | the old math lands the flange plane 17.02 mm inside an 18 mm leaf — the owner's fault, as arithmetic — and slides it 7.5 mm sideways as well |
| the pin has **not moved** | `axis − fileDatum` = (−10.33, 0, +2.56) mm, turn 29's measured knuckle to the micron |
| the PLATE is untouched | `plateOrigin` and `plateSpinDeg` keep the min-relative path; CLAUDE.md: "the owner's plate is right today" |

### And in a real Chromium, on the mounted meshes

`node scripts/e2e-turn30.mjs --only f1` → **12 ok · 0 failed · 1 blocked (R2)**.

The reading is how far the mounted body reaches into the mounted leaf, taken in
the LEAF's own frame — each mesh's own geometry box transformed corner by corner
by `leaf⁻¹ · mesh`, so it survives the door swinging.

| | 0° | 90° | 110° |
| --- | --- | --- | --- |
| **110° file**, cup, L and R | 11.00 | 11.00 | 11.00 |
| **155° file**, cup, L and R | 11.00 | 11.00 | 11.00 |

Eleven millimetres is the bore the owner measured. Both files, both hands, every
angle, to the hundredth. The 155° cup sits **exactly** where the 110° cup sits,
which is the whole claim of a shared authoring frame — and it is what the old
placement could not do.

Also read off the same scene: the knuckle is one point to 0.000 mm at every
angle on both hands, the pin is the measured (−10.33, 0, 2.56), and the arm
keeps the carcass's attitude to 0.000°.

### The pictures

| file | |
| --- | --- |
| `1a-155-left-hand-{closed,90,110}-cup-in-its-bore.png` | the 155° hinge on the left-hung leaf, framed off the ironmongery's own mounted meshes |
| `1b-155-right-hand-{closed,90,110}-cup-in-its-bore.png` | the same, mirrored |
| `1c-155-both-hands-open-the-doors-do-open.png` | both leaves at 90° with the 155° hinges in frame — the sentence the owner's fault denied |
| `1d-110-left-hand-{closed,90,110}-cup-in-its-bore.png` | the 110° file at the same three angles, for comparison |
| `1e-110-right-hand-110-cup-in-its-bore.png` | and the other hand |

---

## F2 [CRITICAL] — ONE modal for the door and its hinges

Until tonight a door had two windows, and `openModal` has one slot — so
double-clicking a hinge REPLACED the door's window with the hinge's, and a
joiner moving a cup by five millimetres could not see the leaf he was moving it
on. Two components, two open paths, two answers to "what is open".

`src/components/DoorModal.jsx` is now the only one. Section A is turn 11's
element window, whole; section B is turn 19's hinge window, whole.
`ElementModal.jsx` and `HingeModal.jsx` are DELETED, and the `hinge` modal kind
is gone from the app entirely — the hinge gesture opens `element` with a section
and a row. Every store action section B calls is the one turn 19 called, so the
clamp, the grid and the undo step are the ones a joiner already knows.

### Both gestures, with a REAL pointer

R1: the click coordinate is PROJECTED from the mesh the app itself mounted, so
what is proved is the whole path from the metal on the screen to the window that
opens — not a store call standing in for it.

| | |
| --- | --- |
| double-click the LEAF | `01 · Door · left`, sections `A,B`, 6 hinge rows, all 9 controls of the two old windows, **one** window on the screen, `scrollTop 0` |
| double-click a HINGE (the middle one) | the **same** window, same door, scrolled to section B (`scrollTop 344 of 344`, B is 310 px down an 849 px body), **row 1 ringed**, section A still in it |
| press ↑ in section B | `100 → 105 mm`, the profile's own 5 mm stride, through `setHingePos` |

| file | |
| --- | --- |
| `2a-the-door-window-opened-from-the-leaf-section-A.png` | opened from the leaf, at the top |
| `2b-the-same-window-opened-from-a-hinge-section-B.png` | the same window from the ironmongery: HINGES in view, row 2 in gold, section A above it |
| `2c-the-hinge-moved-from-inside-the-doors-own-window.png` | and the row moved |

---

## F3 [HIGH] — a divider is bored from ONE face, and it says which

The owner: a partition shows shelf-pin drilling on BOTH faces, and a machine
drills one.

**It was worse than a picture.** A partition serving two bays had the SAME
LADDER EMITTED TWICE — once for the left bay's shelves and once for the right's
— at identical x and y. Six positions, **twelve holes**, the bit going down each
one a second time.

What ships: a per-divider `drill_face`, written by the divider's own modal; the
engine drills that face only, so the 3-D and the DXF agree by construction (both
read `result.drills`, and there is one list); and DEFAULT **LEFT** from
`profile.shelfHoles.partitionFace`.

**Q1 for the owner is that one line.** CLAUDE.md: LEFT is the safe placeholder
and the SETTING is not in question. `test/turn30-f3-divider-face.test.js` proves
the line works by flipping it and re-reading the drilling.

### Read off the running app, on a divider with a shelf in EACH bay

| | |
| --- | --- |
| the ladder | **6 holes at 6 distinct points** — before F3 it was 12 at 6 |
| nothing said | face `L`, summary `{"VPART-1":"L"}` |
| …and it is the LEFT bay's shelf that put them there | rows **732, 782, 832** (that shelf is at 800 world; the divider stands one board up) |
| press **Right** in the divider's modal | rows **1332, 1382, 1432** — the right bay's shelf, at 1400 |
| the SIDES | `BUL 6→6, BUR 6→6` — untouched by any of it |

A bare kit does not move: a side panel has one face that matters and is never
asked the question, `partition_drill_face` is absent from the summary of a
cabinet with no divider in it, and the emission order is still BUL then BUR.

| file | |
| --- | --- |
| `3a-the-divider-bored-on-its-left-face-only.png` | the divider from the left |
| `3b-the-L-R-setting-in-the-dividers-modal.png` | the setting, in the divider's own window |
| `3c-the-same-divider-bored-on-its-right-face.png` | and from the right, after pressing Right |

---

## F4 [HIGH] — the divider's foot, restored from the LISP

Owner: *"chyba kiedyś było ale się zagineło."* Both halves of that sentence are
true, and the audit is the feature.

Turn 13 gave the vertical partition the owner's **biscuit set** on the top and
the bottom. Turn 23 removed it, and its reason was right as far as it went —
`drawWDR_PARTITION_PANEL` (KIT_WARDROBE_FULL.lsp L254-257) is an outline and a
label, and **no kit in `reference/lisp/` names `BISCUIT_4MM` anywhere**. The
biscuits stay gone.

**But that is the HORIZONTAL partition.** The vertical divider in that kit is
the DRAWER PANEL, and the LISP most certainly drills it into the board it stands
on:

```
(defun drawWardrobeDPHolesBOTTOM (x0 y0 szerBOT dpLeft dpRight
                                  dpInsetCenter dpScrewDepth drawerPanelD /)
  (drawCircle "SCREWS_3MM" (+ x0 dpScrewDepth)       (+ y0 dpInsetCenter) 1.5)
  (drawCircle "SCREWS_3MM" (+ x0 drawerPanelD -50.0) (+ y0 dpInsetCenter) 1.5) …)
                        — KIT_WARDROBE_FULL.lsp L377-385, called at L934
```

Turn 23 restored `…HolesBACK`, `…HolesBUL` and `…HolesBUR` and left this one
out — so the engine drilled a divider's back and its sides and **never its
foot**. It is back, for the wardrobe's drawer panel and for the interactive
divider alike.

**The TOP takes nothing, and that is the LISP too.** There is no
`drawWardrobeDPHolesTOP` in any kit — in that kit the divider stops at the
partition over the drawers and never reaches the top. Nothing is invented; the
gap is named here and asserted in the test, so it is a recorded decision rather
than an omission somebody rediscovers.

### THE SANCTIONED FIXTURE CHANGE, and its exact drill-count delta

CLAUDE.md rule 1's one exception, dated **15.08.2026**, taken in
`test/cnc-export-identity.test.js` with the LISP lines named beside it:

| | before | after |
| --- | --- | --- |
| whole-unit sheet | `3439a402` | `2cf80012` |
| `non-sprayed` | `07a0d206` | `f5aa169e` |
| `sprayed` | `8a6498da` | **unchanged** |
| `fronts` | `8a6498da` | **unchanged** |
| layer census `SCREWS_3MM` | 50 | **52** |

**+2 CIRCLE entities, and nothing else on the census moves by one digit.** The
two sheets that carry a carcass move; the two that are doors and drawer faces do
not — the same census logic every delta before it has been read by, and the pair
that stands still is the proof the delta is what it says it is.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f4` →

| | |
| --- | --- |
| the foot | 2 × ⌀3 on `SCREWS_3MM`, in the BOTTOM |
| at the LISP's own two points | **99** and **440** mm from the front (that divider is 490 deep) |
| across the width | **39 mm** — `dpInsetCenter`, the divider's own centre line |
| the TOP | **0 holes** |

| file | |
| --- | --- |
| `4a-the-dividers-foot-two-screws-in-the-bottom-board.png` | down into the carcass, at the foot |
| `4b-the-divider-standing-on-the-board-it-is-screwed-to.png` | the divider and its board together |

---

## F5 [HIGH] — the shelf-pin setback, 70 → 50, through the OVERRIDE CHANNEL

The LISP drills sleeves **70 mm** in from each edge — SKYLON_COMMON's own
shelf-hole block, `(+ x0 70.0)` and `(+ x0 szer -70.0)` — so **70 stays the
engine's bare answer** and the owner's 50 travels the plinth's road:

```
profile.shelfHoles.columnFromEdge (70, = LISP)
  → company row  shelf_pin_setback_mm
  → project      design.shelves.pinSetback
  → paramsForEngine()  shelf_pin_setback_mm
  → the drilling, and therefore the 3-D
```

Not one formula moved. A bare `computeCabinet()` — every golden fixture — passes
no setback and drills 70 on every kit, front and back.

The SINK keeps its own back column (120, `sinkUnit.shelfBackColumnFromEdge`):
that is a fact about the kit, not a workshop preference, so a sink on the
owner's standard is 50 at the front and the sink's own number at the back.

### Read off the running app

| | |
| --- | --- |
| nothing said | columns at **70 and 470** on a 540 mm board; the project says `null` |
| the owner's 50, typed into Settings | columns at **50 and 490**; **24 holes, the same 24** — moved, not added |
| the summary the drawings and the BOM read | `[50, 490]` |

| file | |
| --- | --- |
| `5a-the-kits-own-70-mm-pin-columns.png` | the kit's own answer |
| `5b-the-shelf-pin-setback-control-in-settings.png` | the control it is typed into |
| `5c-the-owners-50-mm-pin-columns-on-the-same-board.png` | the same board, the shop's standard |

---

## F6 [MEDIUM] — moving a handle stops asking a strange question

Owner: moving a handle by 10 mm asks a *"dziwne pytanie"* every time. It did — a
`window.confirm` naming a count, in front of an action that is ONE Ctrl+Z away,
on the gesture a person repeats most often in a session.

The move applies **directly** now. The count is still said — as a toast, after
the fact, with "Ctrl+Z puts them back" — because *how wide did that go* is a
real question; being asked it before anything happens is not.

**What is not removed**: the warning that guards an actual conflict. A 224 mm
bar whose holes fall off a 197 mm front is `handleFitProblem`
(`engine/handles.js`); the front is **not drilled** and the sentence is printed
under the buttons whether anybody presses one or not. The test exercises that
guard rather than asserting it by name, so it cannot be swept out with the nag —
and it sweeps the whole of `src/` for any other `window.confirm`, which now
returns none.

---

## F7 [HIGH] — a shelf and a hinge at one height: ASK, then open the editor

The owner's case: a shelf row and a hinge cup land level with each other and the
cabinet is cut anyway.

**The window is derived, not felt.** CLAUDE.md asks for the number to be written
down, so it is an arithmetic over values that already exist for their own
reasons:

```
  cup half        hardware.hinge.cupDiameter / 2      17.5
+ cluster reach   max |shelfHoles.clusterOffsets|     50
+ sleeve half     shelfHoles.diameter / 2              3.75
= 71.25 mm
```

Re-measure the cup and the window moves with it — the test proves that by
widening the cup to ⌀40 and reading 73.75 back. A 71.25 typed into a file would
not have.

**It asks. It does not fix.** Neither button changes anything: each opens the
editor where the decision belongs, on the row that is in conflict.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f7` → **8 ok · 0 failed**.

| | |
| --- | --- |
| the clash | a shelf at 470 and a hinge at 470 — **0 mm apart**, against the 71.25 window |
| the prompt | 1 prompt, 2 buttons, saying *"…are 0 mm apart — closer than the 71.25 mm the cup and the shelf's own sleeves need between them"* |
| **Remove sleeves at this shelf** | opens `SHELF-1`'s own window (`sections: A`) |
| **Move the hinge** | opens `01 · Door · left` at section B, **ringed row 1** — the hinge that clashed |
| after pressing both | rows `470`, hinges `100/470/670`, **still 1 clash** — no silent auto-fix |

The prompt sits **above** the collapsible sections. The first run of this walk
photographed a panel with no prompt in it, because it had been placed inside the
"Carcass" section — a conflict prompt nobody expands to find is a conflict
prompt nobody sees, and the test now asserts the placement.

| file | |
| --- | --- |
| `7a-the-conflict-prompt-with-its-two-choices.png` | the prompt, with the number in it |
| `7b-the-shelfs-own-window-opened-by-the-first-choice.png` | choice one |
| `7c-the-doors-window-at-its-hinges-that-row-ringed.png` | choice two, on that row |

---

## F8 [MEDIUM] — one worktop over a multi-selection

The owner: select two or more base cabinets and ONE worktop covers the run
**"od ściany aż do paneli"**.

Three overhangs, each its own sentence: **front 20 mm** proud of the door plane,
**sides 10 mm past an END PANEL** (past the panel, not the carcass), **wall
flush** — nothing hangs over a wall.

CLAUDE.md decided the rest so this turn did not have to: thickness **38 mm** (UK
standard — 770 + 100 legs + 38 lands on the 900 line), material = the project's
worktop decor by default, per-worktop override a later chat-fix. All three are
values in `profile.autoParts.worktop` and in the design record.

**A design-layer auto-part, like the end panels: no hole, no fixture.**
`computeCabinet()` neither imports the module nor reads a record — asserted, not
assumed — so every golden fixture is untouched by construction.

### Read off the running app, on three 600s with an end panel on the far end

`node scripts/e2e-turn30.mjs --only f8` → **8 ok · 0 failed**.

| | |
| --- | --- |
| the button | on the multi-selection, saying **Add worktop (3)** |
| after one real press | **1 stored · 1 drawn** — one slab, not three |
| thickness | **38 mm** on the record and on the mesh |
| depth | **606** = 558 carcass + 3 gap + 25 door + **20** — and flush at the wall (`z 0`) |
| length | **1845** over an 1800 run — 1820 without a panel, so it really does step past it |
| the cabinets under it | 7 panels, 77 holes, unchanged |

| file | |
| --- | --- |
| `8a-three-base-cabinets-selected-no-worktop-yet.png` | before |
| `8b-one-worktop-over-the-run-from-the-wall-out-past-the-panel.png` | one slab across all three |
| `8c-the-overhang-20-proud-of-the-doors-flush-at-the-wall.png` | the overhang, from the end |

---

## F9 [MEDIUM] — one cornice across a multi-selection

**What was missing was never the run.** `engine/cornice.js runCorniceParams` has
made a cornice ONE MOULDING across adjacent cornice-bearing cabinets since turn
22 — the top infill's own lesson from turn 6 — and not a line of it is touched.

What was missing was the **entrance**: a joiner who had just selected six tall
units had to open each panel and press its own button six times, and six presses
is six undo steps. So this is the per-unit control's own three buttons, over a
selection, through the per-unit action, in one batch.

### Read off the running app, on three tall units

`node scripts/e2e-turn30.mjs --only f9` → **8 ok · 0 failed**.

| | |
| --- | --- |
| the control | 3 buttons — None and the profile's own two heights, not a copy of the list |
| one press of **100** | all three at 100 |
| the piece | **1 owner spanning 3 cabinets, 1800 mm long** — one moulding, not three |
| the infill it is fixed to | 40 mm on each, exactly as a per-unit press asks for |
| one press of **None** | all three back to 0 |

A kit that takes no cornice is **skipped**, not refused — the courtesy the back
inset shows a wall unit. No drilling: the top infill the moulding needs is a
panel and appears; not one hole is added.

| file | |
| --- | --- |
| `9a-three-tall-units-selected-the-bulk-cornice-buttons.png` | the buttons on the selection |
| `9b-one-cornice-across-all-three-from-one-press.png` | one moulding across the run |
| `9c-and-one-press-takes-it-off-again.png` | and off again |

---

## F10 [MEDIUM] — the project's front style propagates

**The cascade was never wrong.** `engine/design.js resolveUnitDesign` has had it
right since turn 13: *this unit's own `front_type` → its door STYLE's → the
PROJECT's*.

The fault was that **no cabinet could say it had no override**.
`defaultParamsFor` stamps `front_type: profile.front.defaultType` on every unit
at birth — the fixture contract for a bare `computeCabinet()`, which must not
move — so inside a project every cabinet looked like it had chosen Shaker on
purpose. A job set to Flat was still **cut** as Shaker.

Two changes, neither a formula: a cabinet placed in a project is born with
`front_type: null`, and the answer travels the override channel in
`paramsForEngine` through the cascade that already existed. A project saved
before tonight is migrated with a stamp — a stored value **equal to the
profile's default** is read as a stamp, a value that **differs** is a real
override and is left alone.

### Read off the running app, three cabinets, one of them grooved by hand

`node scripts/e2e-turn30.mjs --only f10` → **7 ok · 0 failed**.

| | |
| --- | --- |
| before | project `S`, cut `S/S/G` |
| pressing **Flat** in the front-style gallery | project `F` |
| the two with no override | `F` · `F` — in the **cut**, not a label |
| the one somebody made grooved | `G`, untouched |
| and it really is the cut | the shaker's panel pocket **1 → 0** |

| file | |
| --- | --- |
| `10a-a-shaker-job-with-one-grooved-front.png` | before |
| `10b-the-front-style-gallery-in-the-main-menu.png` | the menu control |
| `10c-flat-everywhere-except-the-front-with-its-own-answer.png` | after |

---

## F11 [MEDIUM] — two hinges under 600, on the OVERRIDE CHANNEL

The LISP ladders stay the engine's bare answer — **Base is always three**, Low
takes two under 800 — and the owner's standard arrives the way F5's setback
does: `hinge_two_below_mm`, default **null** (= the ladders), company row →
project → `paramsForEngine()`.

The two centres are `[endOffset, H − endOffset]` — the LISP's own outer pair
written in the carcass frame — so *"100 / wys − 100"* is his sentence and not a
second set of numbers. The threshold is measured against the **door's** own
height, because that is what he said.

**"Respect per-door manual hinge edits — they win"** is control flow, not a
promise: the explicit list returns from `hingeRows` before the threshold is ever
read, and the test asserts that ordering in the source.

### Read off the running app, a 500 carcass beside a 770

`node scripts/e2e-turn30.mjs --only f11` → **7 ok · 0 failed**.

| | short (500) | full (770) |
| --- | --- | --- |
| nothing said | `100 / 200 / 400` — Base is always three | `100 / 470 / 670` |
| the owner's **600** | **`100 / 400`** | `100 / 470 / 670`, untouched |
| cups | 2 | 3 |
| after one hand edit | `140 / 400` — the bench wins | |

| file | |
| --- | --- |
| `11a-the-lisp-ladder-three-hinges-on-a-short-door.png` | the kit's own answer |
| `11b-the-owners-standard-two-hinges-on-the-same-door.png` | the shop's |
| `11c-and-a-hand-edited-door-wins.png` | and the bench's |

---

## F12 [MEDIUM] — front to front, red under 3 mm

`engine/frontGapClash.js` measures the gap between **neighbouring fronts across
a run** — the last door of one cabinet and the first door of the next, which is
the joint a kitchen actually fails at and which nothing in this app has ever
measured. Turn 25's `frontGaps` is the other question (the gaps *inside* one
cabinet) and is untouched.

A pair is: two fronts **on one wall**, on **unturned** cabinets, whose **height
bands** overlap, whose **front planes** overlap (a leaf on a 330 deep cabinet
and one on a 558 deep cabinet beside it are 228 mm apart in air and never
meet), with **nothing standing between them** — so a run of three doors reports
its two real joints rather than three pairs.

### The first thing the tests prove is that the app is right

Every kit in the engine stands its front `doors.gap / 2` = **1.5 mm** inside its
own carcass on both edges — measured across the whole type list — and the double
door and the per-bay doors leave the same **3.00** between leaves. So two
cabinets standing edge to edge measure exactly 3.00: **the number, not under
it**, and a correct kitchen is silent.

`moveUnit` clamps a slide into the free slot and `updateUnitParams` refuses a
width that would eat a neighbour (*"Width limited to 600 mm by 02"*), so **the
editor cannot draw this fault with the mouse** — both asserted. What can is a
job that arrives already laid out: `loadProject` opening a saved or imported
file whose positions never passed through `clampUnitX`. An **overlap** is the
same fault worse and is reported too, in the millimetres it comes out negative.

The threshold is `profile.doors.minNeighbourGapMm` = **3**; a workshop that
wants 5 gets 5, asserted rather than described.

### It is a WARNING and not a block

Nothing moves a cabinet, re-cuts a door or refuses a layout. The room paints the
pair's meeting edges (`FrontGapMarks`, the profile's red, spanning only the
height the two actually share) and `FrontGapWarnings` says the value — **one
list, `frontGapWarnings()` in the store**, so a mark can never appear without
its millimetres. The walk compares the cut before and after: identical.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f12` → **7 ok · 0 failed**.

| | faults | marks | readout | cut |
| --- | --- | --- | --- | --- |
| two 600s butted (3.00) | 0 | 0 | silent | 6 panels · 77 holes |
| the same job opened 1 mm tight | 1 | 1 × **2 mm** | *"2 mm between 01's 01-F and 02's 02-F — under the 3 mm minimum."* | 6 panels · 77 holes, **unchanged** |

| file | |
| --- | --- |
| `12a-two-cabinets-butted-a-correct-3mm-joint-says-nothing.png` | a correct run |
| `12b-the-same-run-2mm-tight-the-joint-painted-red-with-its-value.png` | the fault, painted, with the number (renamed turn 31 F11 — the name said 1 mm, the banner in the picture says 2; the picture was right) |
| `12c-the-meeting-edges-in-red-at-2mm.png` | close on the joint |

---

## F13 [HIGH] — Cargo 300, the tall pull-out larder

`CARGO` is `KIT_BUDTALL_FULL.lsp` at **300 wide**. Every field on the type is
BUDTALL's — the hinge ladder, the cup rule, the leg source, the carcass — and
the test states the consequence in the strongest form available:

> A Cargo is drilled **exactly** as KIT_BUDTALL drills a tall unit of the same
> size — hole for hole, layer for layer, and the same `drillSummary`.

**The pull-out frame is HARDWARE.** One BOM line, `cargo_frame`, quantity 1,
specified by the **clear opening** it has to fit (264 × 2064 × 540 on the
default). It reaches no drill, no runner row and no 3D body: `hardwareInstances`
has nothing for it, which is the honest form of *"GLB slot when the owner
uploads one"*.

That half of the batch rule is now a **field on the type**, not an engine
change: `hardwareKit: { role, label, by }`. No kit written before tonight
carries one, so no fixture can move — asserted across the whole type list.

### The gap, named

The mechanism mounts to the **floor and the top** per the manufacturer, and no
LISP line and no published pattern in `reference/hardware/` states those
fixings. **Nothing is drilled for it**, and the frame is ordered instead.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f13` → **7 ok · 0 failed**. Placed from the
Library panel, then measured against a BUDTALL cut to the same size standing
beside it.

| | Cargo | tall unit, same size |
| --- | --- | --- |
| size | 300 × 2150 × 558 | 300 × 2150 × 558 |
| parts | BUL BUR TOP BOTTOM BACK FRONT | the same |
| holes | 88 | 88, **the same fingerprint** |
| frame on the order | 1 × *264 × 2114 × 540 mm opening* | 0 |

| file | |
| --- | --- |
| `13a-cargo-300-in-the-kitchen-library-under-tall-units.png` | the row |
| `13b-a-cargo-300-standing-a-tall-carcass-and-a-full-door.png` | the cabinet |
| `13c-the-cargo-sheet-the-kits-own-holes-and-no-others.png` | the cut |

---

## F14 [HIGH] — the pantry, with Blum drawers ("koniecznie")

A pantry has **two parents**, so it is drilled by both of them and the test is
two equalities with no third answer:

| | is drilled exactly as |
| --- | --- |
| with **no** drawers | a `KIT_BUDTALL_FULL` tall unit of the same size — hole for hole, same `drillSummary` |
| with **three** | a **wardrobe with three frontless drawers** — the internal drawer machinery this engine has had since turn 3 |

Nothing is added between those two. The drawer panels the runners screw to, the
MOVENTO rows on `RUNNERS_3MM` (first row at `wardrobe.runners.firstRowFromBottom`
= 38), the box sides, backs and bottoms and the sync rod are all the existing
machinery, unchanged.

### The mechanism, built once — F20's

`internalDrawerSet(params, type, count)` is **F20's mechanism**, written here
because F14 is its first consumer, exactly as CLAUDE.md instructs. Three ways of
saying one thing:

| | |
| --- | --- |
| `internal_drawers: [2]` | the job's own — F20's hidden drawer |
| `internalDrawers: 'all'` on the type | the kit's — a pantry's drawers live behind its doors |
| `drawer_fronts: false` | turn 17's *"the fronts come off"*, unchanged |

It decides **one** thing: whether a `DRAWER-FRONT` board is cut. Asserted: the
same pantry with faces and without has *not one hole* different, an identical
order form, and exactly three boards between them. The source is checked for
`drills.push` / `hw(` / `panels.push` / `runner` and has none, and it is
consulted in exactly the two front loops.

### The gap, named

**None for the drawers** — box, runners and drilling are all existing LISP/
MOVENTO truth. What a larder often also has — **door racks** — is not shipped:
no LISP line and no published pattern states their fixing.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f14` → **7 ok · 0 failed**, against a
wardrobe cut to the same size with its fronts off, standing beside it.

| | pantry | wardrobe, fronts off |
| --- | --- | --- |
| boxes / faces / doors | 3 / **0** / 1 | 3 / 0 / 1 |
| holes on `RUNNERS_3MM` | 18 | 18 |
| holes in total | 125 | 125, **same fingerprint** |
| runner pairs ordered | 3 | 3 |

| file | |
| --- | --- |
| `14a-a-pantry-closed-a-tall-cupboard-with-doors.png` | closed |
| `14b-the-same-pantry-open-three-blum-boxes-and-no-drawer-faces.png` | open |
| `14c-fronts-hidden-the-boxes-and-their-runners-behind-the-doors.png` | fronts hidden |

---

## F15 [MEDIUM] — the american fridge housing

`KIT_FRIDGE.lsp` **exists and is the truth**, and it writes every panel it cuts
in terms of the **width** and the **aperture height** — the fixed panel, the
spurs panel on its 25 × 25 blocks, the two back rails and the back above them.
So an american housing is that kit given bigger numbers, and *"widen the
parameter envelope"* is a block of **defaults**, not a change to anything that
cuts.

`FRIDGE_US` copies every field of `FRIDGE` — the LISP, the hinge ladder, the
cup rule, the legs, `carcass.back: 'rails'`, the supports — and differs in
`defaultsKey` alone. **1000 × 2100, aperture 1900**, depth left at the run's,
because an american fridge stands proud of the units. Those are a *starting
size*, not a specification: a joiner types the appliance's numbers and the kit
follows them, asserted at 1200 × 1950 as well.

A separate type rather than wider defaults on `FRIDGE`, so the kit every
existing project uses does not move — asserted.

The **aperture control** no longer names a kit: `RightPanel` asks
`profilePath(profile, type.defaultsKey)?.fridgeH`, and `defaultParamsFor` does
the same, so a housing has an aperture by *having* one.

### A bug the wider envelope found — in the BUILT-IN housing

`FRIDGE_ZONE_TOO_TALL` has warned since turn 12 that an aperture taller than its
carcass leaves no room for the pieces above the fixed panel — **and the two
pieces were cut anyway, at negative height**. `FRIDGE` at 1900 high with a 1950
aperture cut a BACK of **600 × −68**: an inverted outline on a machine file,
which turn 25's edge guard finds as a clockwise loop. A cabinet the engine has
already refused to believe in now emits no boards for the part it cannot build.
Every valid housing has `spursH > G` by construction and is untouched.

### The gap, named

**None** — every hole is `KIT_FRIDGE.lsp`'s own, at whatever size it is given.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f15` → **7 ok · 0 failed**, against a
built-in housing cut to the same size beside it.

| | american | built-in, same size |
| --- | --- | --- |
| size · aperture | 1000 × 2150 · 1900 | 1000 × 2150 · 1900 |
| boards | BUL BUR TOP BOTTOM FIXED BACK-RAIL ×2 BACK SPURS FRONT ×2 | the same |
| holes | 127 | 127, **same fingerprint** |
| inverted boards | 0 | 0 |

| file | |
| --- | --- |
| `15a-an-american-fridge-housing-1000-wide-on-the-fridge-kit.png` | the cabinet |
| `15b-its-sheet-the-fridge-kits-own-boards-at-american-sizes.png` | the cut |

---

## F16 [MEDIUM] — the bin unit

A bin unit **is a base unit**: `KIT_BUD_FULL.lsp`, drilled hole for hole as
KIT_BUD drills one — asserted at three sizes and with the door hung either way,
and its door machined identically to a base unit's. The pull-out screws to the
door and to the carcass floor per its own manufacturer, and **neither fixing is
written in any LISP line or published pattern this repo holds**, so neither is
bored.

### "BOM + visual", honestly

* **BOM** — one line, `bin_pullout` × 1, specified by the clear opening
  (564 × 734 × 540 on the default).
* **Visual** — there is no drawing of a bin here, and inventing one would be
  fiction of the same kind as an invented hole. What is drawn is the **space the
  mechanism occupies**: `kitInstances` reads the *same* opening the order line
  is specified by, insets it on every side, and marks it `placeholder: true`.
  `KitBodies` draws it as five translucent faces, open at the top, in the
  bracket grey the bought ironmongery uses. It reaches no cut list, no drill and
  no quantity — asserted.

`hardwareKit.body` is what asks for one, so the cargo frame (F13) keeps its
**empty slot** — a larder frame's floor-and-top fixing is the manufacturer's and
the app draws nothing for it.

### The gap, named

The **mechanism's own fixings** — the door bracket and the floor plate — are not
drilled. No LISP line, no published pattern.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f16` → **6 ok · 0 failed**.

| | bin unit | base unit, same size |
| --- | --- | --- |
| holes | 77 | 77, **same fingerprint** |
| pull-out on the order | 1 × *564 × 734 × 540 mm opening* | 0 |
| placeholder bodies in the room | 1, `ccKitPlaceholder` | 0 |

| file | |
| --- | --- |
| `16a-a-bin-unit-the-space-the-pull-out-takes-inside-kit-buds-carcass.png` | the volume |
| `16b-closed-beside-the-base-unit-it-is-cut-exactly-like.png` | the pair |

---

## F17 [MEDIUM] — the wine rack

The one type in the batch with **geometry of its own**. Every other kit borrows
a carcass; this one adds boards no LISP has ever drawn. So the batch rule bites
here, and the answer is literal:

* the **carcass** is `KIT_BUD_FULL.lsp`'s, hole for hole (62 holes, same
  fingerprint as a doorless base unit — and the lattice adds **no** hole to it
  either, which is where a row of dowel holes would have been invented);
* the **lattice** is plain rectangles — no hole, no pocket, no socket, no tab,
  a four-corner outline and nothing else, asserted board by board.

The grid comes from `profile.wineRack.cellMm` = **100** — the bottle, in effect.
The engine fits as many whole cells as the carcass takes and shares the rest out
evenly, so a **wider rack gets more cells rather than fatter ones** (600 → 4
columns of 127.5; 1000 → more, at about the same cell). The shelves are cut
**per cell** rather than run through the uprights, so every board on the list is
one a joiner can cut and drop in without a joint this repo cannot specify.

It is an **open** unit: no doors (nothing in the kits about hanging one on a
rack), no shelves (the lattice is what it has instead), and nothing ordered.

### The gap, named

**The cross-halving joints.** A real lattice is halved together; no LISP line
and no published pattern in this repo states those notches, so they are **not
cut**. The library row says so where a joiner reads it — *"no drilling truth
exists yet"*.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f17` → **7 ok · 0 failed**.

| | |
| --- | --- |
| lattice | 3 uprights · 20 shelves, all 23 drawn in the room |
| machined lattice boards | **0** |
| carcass holes | 62 — the same fingerprint as a doorless base unit |
| on the cut list | 23 of 23 |

| file | |
| --- | --- |
| `17a-a-wine-rack-the-lattice-standing-in-kit-buds-carcass.png` | the rack |
| `17b-the-sheet-plain-rectangles-and-not-one-notch.png` | the cut |

---

## F18 [MEDIUM] — the twin cupboard

### First, the correction: what `KIT_DOOR_DOUBLE.lsp` actually is

CLAUDE.md names it as the parent — *"it exists"*. It exists, and it is **not a
cupboard**. Read it:

> `;;; Double Doors with Frame` · `;;; Command: DOOR_DOUBLE` · `;;; Base point:
> bottom-left of left door leaf` · layers `FRAME` / `DOOR_OUTSIDE` /
> `DOOR_INSIDE` / `DOOR_IRONMONGERY` · asks for *"Overall FRAME WIDTH incl frame
> members <1603>"*, *"Overall FRAME HEIGHT <2083>"*, *"Frame depth [mm] <100>"*,
> *"Door number <DD01>"*

It is a pair of **interior room doors in a lining**. There is no carcass in it,
no shelf, no leg and no cup bored into a cabinet side (`BUL`, `SHELF`, `legW`,
`hingeCupList` all absent — asserted). A kitchen cupboard cannot be built from
it, and no type in the app claims it as its kit.

### So what ships

The deliverable that survives the correction, which is the one that was asked
for: **a twin cupboard in the Kitchen category with its own defaults**.
`KIT_BUD_FULL.lsp` cuts it and the two-leaf face is the engine's own
`doors.doubleTotalGap` arithmetic — LISP truth since turn 1, untouched. A twin
at 900 is drilled **hole for hole** as a 900 base unit.

What is new is that it is a **kit**: `doorCount: 2`, so a **700 mm twin is a
pair** where the width threshold would give a base unit a single. No kit written
before tonight has a `doorCount`, so the threshold is exactly what it was
(704 → 1, 705 → 2, asserted), and a job that says `doors: { count: 1 }` still
wins.

### The gap, named

**None** — every hole is `KIT_BUD_FULL.lsp`'s own. What is *not* shipped is
anything from `KIT_DOOR_DOUBLE.lsp`: its frame members, its lining and its door
ironmongery are a different product and would need their own type.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f18` → **5 ok · 0 failed**.

| | twin | base unit, same width |
| --- | --- | --- |
| leaves at 900 | **2** × 447 mm | 1 |
| holes | 92 | 92, **same fingerprint** |
| leaves at 700 | **2** | 1 |

| file | |
| --- | --- |
| `18a-a-twin-cupboard-beside-a-single-door-base-unit-of-the-same-width.png` | the pair |
| `18b-open-a-pair-of-leaves-on-kit-buds-own-carcass.png` | open |

---

## F19 [MEDIUM] — the corner unit

### First, what `KIT_BUDR` is — read, as instructed

`reference/lisp/KIT_BUDR_FULL.lsp`, its own header:

> `;;; Base Unit Drawer - 3 drawers (4:3:2 ratio)`

…and its body is the MOVENTO runner outline drawn line by line
(`DRAW-RUNNER-LEFT`). It is the **three-drawer base unit** this app has shipped
since turn 3 — `BUDR` is already built from it — and there is **not one corner
in it** (no `corner`, `L-shape`, `diagonal` or `mitre`, asserted against the
file).

### Which settles the whole feature

No parent kit means no parent lines, and the batch rule then says exactly what
ships: **geometry and a BOM, and not one hole.**

| | |
| --- | --- |
| holes | **0** — no cup, no shelf sleeve, no leg plate, no corner post |
| hinged sides / cup rows / shelf rows / runner rows | all empty |
| order lines | **0** — nothing is bought, because nothing is specified |
| doors | **none** — a corner leaf hangs on cups nobody has written down; asking for one anyway changes nothing |
| legs | **`legs: false`** — a leg's position comes from a *rectangular* footprint and one of the four would stand in the L's missing corner |

`lisp: null`, honestly — the type claims no kit, because there is none to claim.

### The L, and why it is made of rectangles

Two arms meeting in the corner, inside the footprint the room already
understands:

```
    z=D  ┌──────┐            arm A: x 0..W,   z 0..arm
         │  B   │            arm B: x 0..arm, z 0..D
  z=arm  ├──────┴───────┐    the bite at (arm, arm) is the open front corner,
         │      A       │    where the two door openings would meet
    z=0  └──────────────┘
         x=0   x=arm    x=W
```

Eight boards — 2 backs, 2 ends, 2 floors, 2 tops — every one a **plain
rectangle**. The L floor and the L top are each cut as *two* pieces rather than
as one L-shaped board, because two rectangles are two boards a machine cuts
today and an L outline is a shape nobody's LISP has drawn.

1000 × 770 × 1000 with a 600 arm leaves two **400 mm openings**. The arm is an
input (`corner_arm_mm`), and a nonsense value cannot cut a board out of
existence. A corner unit also **keeps its own depth** — `ownDepth: true`, the
same sentence a wall unit's `mount` says, because a 558 corner is not a corner.

### The gap, named — and it is the biggest one in the batch

**All of its drilling.** No LISP line and no published pattern states a corner
unit's carcass joints, its door cups, its shelf supports, its corner post or
where it stands. None of it is guessed at. What ships is a shape a joiner can
see and a cut list he can cut.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f19` → **6 ok · 0 failed**.

| file | |
| --- | --- |
| `19a-the-corner-row-open-in-the-library-and-what-it-says.png` | the row, and its reason |
| `19b-the-l-carcass-two-arms-meeting-in-the-corner.png` | the carcass |
| `19c-its-sheet-eight-plain-boards-and-no-drilling-at-all.png` | the cut |

---

## F20 [HIGH] — two fronts, one hidden drawer behind them

The **mechanism was built once, in F14** — `internalDrawerSet` — exactly as
CLAUDE.md instructs, and it is not touched here. What F20 adds is the visible
half, and it is the half CLAUDE.md names in four words: *"sitting behind the
front above it"*.

A hidden drawer would leave a **hole in the façade** unless the front over it
grows down across its zone. So the front above takes in the run of internal
drawers immediately below it, **and the gaps between them**, measured off the
kit's own `frontY` table — never a second set of numbers. A three-drawer unit
with the middle one hidden shows **two fronts and has three boxes**, and the
face is continuous:

| | plain | one hidden |
| --- | --- | --- |
| fronts | `F1` 338 · `F2` 254 · `F3` 169 | `F1` 338 · **`F3` 426** |
| where `F3` starts | 598 | **341** — where `F2` used to |
| boxes / runner pairs | 3 / 3 | 3 / 3 |

`426 = 254 + 3 + 169` — the two zones and the kit's own gap.

### The thing that goes wrong quietly

A façade is measured from **its own bottom edge**. Grown downward, its screw row
would follow the edge and screw itself to thin air. It does not: the row keeps
its **absolute** height (694.5 mm on the default unit, before and after), so it
stays on its own box. Asserted.

### And the drawer itself is untouched

Not one hole moved — the carcass and the box fingerprints are identical, the
runner rows are in the same places, the order form is the same, and the cut list
shrank by **exactly one board**.

Hiding the **top** drawer takes a board off the face instead of growing another,
because there is no front above it. That is the mechanism being honest rather
than clever, and it is asserted too.

### The gap, named

**None** — box, runners and drilling are all existing MOVENTO/LISP truth. The
hidden drawer's own **pull** (an inner drawer usually opens by its box, not by a
handle) is not specified and nothing is drilled for one.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f20` → **7 ok · 0 failed**, two drawer units
side by side with the right-hand one's middle drawer hidden.

| file | |
| --- | --- |
| `20a-two-drawer-units-three-fronts-each.png` | before |
| `20b-the-trend-two-fronts-on-the-right-three-drawers-behind-them.png` | after |
| `20c-fronts-hidden-the-third-box-is-really-there.png` | the third box |

---

## F21 [MEDIUM] — glass wall units

**A glass door is a shaker whose panel is not there.** That sentence is the
whole design: the frame is the shaker's — the same number, cut by the same
arithmetic in `engine/shaker.js` — and the recess goes **all the way through**
instead of 6 mm deep. Asserted: the aperture rectangle is *identical* to the one
a shaker of the same leaf would recess.

Borrowing the frame rather than giving glass one of its own is deliberate. A
kitchen whose glass doors wear a different frame from its solid ones is a
kitchen nobody meant to build, and one law is one thing to get right. It is
**refused, not clamped**, exactly as the shaker is: a 200 mm frame on a 300 mm
door raises `GLASS_FRAME_TOO_WIDE`, the front is cut plain, and no pane is
ordered for a hole that is not there.

### ⚠ NOTE FOR THE OWNER, as CLAUDE.md asks

> *"hinge rule unchanged (glass doors take the same cups unless the owner says
> otherwise — **note it in the report**)"*

**A glass wall unit is drilled hole for hole as a wall unit with a solid door** —
the same three hinges, the same cups in the same places, the same board
thickness read by the hinge ladder. That is your instruction, carried out
literally and asserted twice. If a glazed door should take a different hinge in
your workshop, that is a one-line change and it needs your word.

### "BOM says glass door"

One `glass_pane` line per leaf, to the **aperture** it fills (457 × 577 on the
default unit); two glass leaves are one line of two. **Glass is not board**: it
reaches no panel, no sheet and no CSV line. In 3D the board's own aperture is a
full-depth cutout, so `panelSolids` leaves a frame, and a translucent pane is
drawn in the hole inside the group that animates — it swings with its door.

`glass` is a front **style**, not a kit: a base unit can wear it, and a glass
unit can wear a solid door. `WUD_GLASS` copies every field of `WUD` and adds
`frontType: 'GL'` — what it *arrives* wearing. Picking "Glass unit" from the
library is saying something about the front style, so it lands as the unit's own
answer and one write of `null` hands it back to the project.

### The gap, named

**The glazing rebate.** No LISP line and no published pattern states how the
pane is held — rebate depth, bead, or channel — so **nothing is cut for it**.
The aperture is straight through and the glazier works to it. **Glass shelves**
are a separate question and are not shipped.

### Read off the running app

`node scripts/e2e-turn30.mjs --only f21` → **7 ok · 0 failed**, beside a solid
wall unit of the same size.

| | glass | solid |
| --- | --- | --- |
| front style | `GL`, 70 mm frame | the project's |
| aperture | 25 mm through a 25 mm door | — |
| panes drawn in the room | 1 | 0 |
| holes | 81 | 81, **same fingerprint** |
| pane ordered | 1 × *457 × 577 mm aperture* | 0 |

| file | |
| --- | --- |
| `21a-a-glass-wall-unit-beside-a-solid-one-frame-and-pane.png` | the pair |
| `21b-the-door-itself-a-shaker-frame-with-the-panel-taken-through.png` | the door |

---

## The walk, end to end

Every phase above was proved on its own as it was built. Running the whole thing
in one go found two faults **in the harness** — both of which had been hidden by
running one phase at a time, which is the reason to run it end to end at all:

1. `frameUnits` measured a **stale world matrix**. A `Box3` is expanded by a
   mesh's WORLD transform and a cabinet placed a moment ago has not had one
   computed — three only refreshes them when it renders — so the frame was taken
   around a cabinet standing at the origin and the click that followed landed
   off the top of the canvas. `scene.updateMatrixWorld(true)` first. (The same
   lesson the hinge reader learned in F1.)
2. OrbitControls derives the camera's attitude from *position − target* on every
   `update()`, so the **target is set first** now and the update comes last,
   with damping off — a damped controller eases back toward wherever it was
   heading, which after a phase that framed a hinge is somewhere else entirely.

A new room also clears the view state it inherits — open doors, the selection —
because a phase that runs second was otherwise looking at the phase before it.

`node scripts/e2e-turn30.mjs` → **112 ok · 0 failed · 1 blocked**.

The one blocked step is **R2**: this container's egress policy answers 403 for
the live hardware bucket, so every hinge, runner and plate in these proofs comes
from the SILENT SHOWROOM (`scripts/make-fixture-hardware.mjs` → a local server,
reached through `localStorage['cc.hardwareBase']`). The GLB *placement* is
therefore proved; the bucket's own contents are not reachable from here.
