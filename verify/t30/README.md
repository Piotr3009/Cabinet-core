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
