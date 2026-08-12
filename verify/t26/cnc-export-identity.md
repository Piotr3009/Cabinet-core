# Turn 26 — what moved in the CNC export, and why

**Baseline: the turn-25 merge, `51c55dc`.** Every number below is a diff of two
runs of the same two scripts against the two checkouts — nothing here is read
off a screen.

```
scripts/cnc-fingerprint.mjs    252 scenarios ×  (files + 4 sheets)  →  4 072 rows
scripts/cnc-delta-probe.mjs     96 scenarios ×  GEOM/SHAPE/TEXT/CENSUS → 7 845 rows
```

---

## The short answer

**Three named deltas, and nothing else.** All three were asked for by name in
CLAUDE.md; no fourth thing moved anywhere in either instrument.

| | delta | what moves | golden defaults |
| --- | --- | --- | --- |
| **F7** | the fix shelf is a clean rectangle | four `BISCUIT_4MM` marks leave `SHELF-*`; two or three `SCREWS_3MM` arrive in `BACK` | **none** — a bare type carries no fixed shelf |
| **F8** | shelves lie along the grain | every `SHELF-*` outline and its label turn 90° | **none** — a bare type carries no shelf |
| **F5** | the dishwasher joins the family | `DW_PANEL`'s front gains a `SHAKER_PANEL_POCKET` | **`DW_PANEL`, and only `DW_PANEL`** |

Eleven of the twelve bare types — `BUD`, `BUDR`, `BUDR2`, `BUDR4`, `BUDTALL`,
`FRIDGE`, `LOW_CABINET`, `OVEN_BASE`, `SINK`, `WARDROBE`, `WUD` — are **byte-for-
byte what they were before this turn**, every file and all four sheets. The
twelfth is `DW_PANEL`, which is F5's own delta and the one CLAUDE.md's PROOF
section names.

---

## The fingerprints

`fingerprints-turn25-baseline.txt` → `fingerprints-turn26.txt`, both 4 072 rows:

```
420 rows changed  (210 pairs)
  0 rows added
  0 rows removed        ← no new scenario, no new file, no file gone
```

51 of the 252 scenarios moved. The changed rows name **four DXF files** and
nothing else:

| file | scenarios | which |
| --- | --- | --- |
| `01-SHELF-1.dxf` | 30 | every scenario with a shelf — **F8** (and **F7** where it is fixed) |
| `01-SHELF-2.dxf` | 12 | the second shelf of `+shelves` / `+adjustable-shelves` — **F8** |
| `01-BACK.dxf` | 24 | `+fix-shelf`, `+fix-shelf-in-bay`, `+partition-on-shelf`, `+shelves` — **F7.2** |
| `01-F.dxf` | 21 | **`DW_PANEL` and its twenty variants, no other type** — **F5.5** |

…plus the sheets that carry them (`all` 51, `non-sprayed` 30, `sprayed` 21,
`fronts` 21), which is arithmetic rather than a second finding: a sheet's
fingerprint is the nest of the files on it.

**`01-BACK.dxf` moves only where there is a FIXED shelf.** `+adjustable-shelves`
is in the SHELF list and not in the BACK list — which is exactly F7.2's rule
("⌀3 in the BACK on the shelf's axis") applied to the parts that have an axis to
put them on.

### The one that is NOT there

`01-F.dxf` changed on twenty-one scenarios and **every one of them is a
`DW_PANEL`.** F1 lowered the cup from 12.5 mm to the owner's measured 11 mm and
F2 rebuilt every hinge instance in the scene — and no ordinary front's DXF moved
by a hash. That is the honest reading of F1.4: **the cup's depth is a
`depth` field on the drill record, and the DXF is a 2-D file that carries a
circle's centre and diameter.** The sheet says where the bit goes and how wide;
how deep it goes is the record's, and the record is what R10 makes the scene
render. Nothing about the depth belongs in the DXF, so nothing about the depth
reached it — and `test/turn26-f1-no-pierce.test.js` proves the two agree by
reading both.

---

## The probe, entity by entity

`probe-diff.txt`, four sections against the same baseline:

```
GEOM    112 rows   01-SHELF-1 (24)  01-SHELF-2 (6)  01-BACK (18)  01-F (8)
SHAPE   112 rows   the same four files, the same counts
TEXT    180 rows   01-SHELF-1 (72)  01-SHELF-2 (18)  —  labels only, and only their POSITION
CENSUS  168 rows   three layers, named below
```

26 of the 96 probe scenarios moved; one of them is bare (`DW_PANEL`).

### SHAPE moved with GEOM, and that is the point

Turn 25's delta was a **re-order**: GEOM moved and SHAPE did not, which is what
"the same points, traced once" looks like as a measurement. Turn 26's is the
opposite claim and it shows the opposite signature — **SHAPE moved on every file
GEOM moved on, row for row.** F8 really does lay the board the other way round,
so its point set and its enclosed rectangle really are different; F7 really does
remove four closed polylines; F5 really does add one. A turn that claimed a
re-order and moved SHAPE would be a turn that had quietly re-cut a board.

### TEXT: the labels turned with their boards

Every TEXT row is a `SHELF-*` label, the string unchanged and the **position**
moved:

```
< UNIT_NUMBER|01 SHELF-1|20|432,295        > UNIT_NUMBER|01 SHELF-1|20|270,457
< UNIT_NUMBER|864x540|20|432,270           > UNIT_NUMBER|864x540|20|270,432
< UNIT_NUMBER|(FIX)|20|432,245             > UNIT_NUMBER|(FIX)|20|270,407
```

`864x540` is the same in both columns — the board is the same board. It is
lying the other way on the sheet, and its block of text went with it. No label
text changed anywhere in either instrument.

### CENSUS: exactly three layers, and no fourth

```
poly/BISCUIT_4MM              8  →   4    (36 scenario/file rows)     F7.1
circle/SCREWS_3MM            27  →  29                                F7.2
                             28  →  31
                             30  →  33
                             33  →  35
                             34  →  37
                             36  →  38
                             36  →  39
                             37  →  39
                             38  →  41
poly/SHAKER_PANEL_POCKET  absent →   1    (24 rows, DW_PANEL only)    F5.5
```

**No other layer's count changed in any scenario.** The eighteen classes the
export writes — outlines, `PUZZLE_HOLES_7_5MM`, `FRONT_HINGES_35MM`,
`FRONT_HINGES_3MM`, the dowels, the grooves, the pockets — are all at the counts
turn 25 left them at, everywhere.

* **`BISCUIT_4MM` 8 → 4** is F7.1 exactly: *"no biscuits on the shelf itself —
  not even on its ends."* Four marks left the fix shelf's own two ends. The
  four that remain are the bearers' — BUL/BUR and the partition — which is F7.2's
  other half: the joint moved into the bearers, it did not disappear.
* **`SCREWS_3MM` +2 or +3** is F7.2's back screws, on the shelf's axis, ends 50
  and pitch ≤ 400 — the same law the partition's back screws have followed since
  turn 24. The number is 2 or 3 because it is a pitch, not a constant: a 600 mm
  cabinet takes two and a 900 mm one takes three.
* **`SHAKER_PANEL_POCKET` absent → 1** is F5.5, and it appears on
  `DW_PANEL` scenarios and on nothing else. A D/W front is a front, so the
  shaker applies to it; the pocket is that sentence in the file.

The 24 **added** probe rows are these 24 `SHAKER_PANEL_POCKET` census rows — a
layer that did not exist on a D/W panel before cannot have had a row. Nothing
was **removed** from either instrument: `BISCUIT_4MM` went from 8 to 4 and not
from 8 to absent, because the bearers still carry theirs.

---

## What did NOT move, stated as a claim

* **Eleven of twelve bare types are unchanged**, all files and all four sheets.
* **Zero rows added or removed in the fingerprints** — the same 252 scenarios
  produce the same file list with the same names.
* **No hinge drilling changed anywhere.** F1 and F2 are display and depth; the
  ⌀35 cup centres and the ⌀3 plate holes are at the coordinates and counts turn
  25 exported. `test/turn26-f2-one-hinge-path.test.js` asserts this directly as
  well — a partition-hung leaf's hinge drilling is compared before and after and
  the delta is zero.
* **No `PUZZLE_HOLES_7_5MM` moved.** F3 makes the scene draw the ⌀7.5 ladder
  the sheet already carried; it does not drill one hole more or fewer. R10's
  direction of travel — the sheet is the truth, the scene follows it — is
  visible here as a diff of nothing.
* **No dimension, lighting or editor change reached the export**, which is what
  "display only" means when it is measured rather than asserted.

---

## How to reproduce

```
git checkout 51c55dc
node scripts/cnc-fingerprint.mjs   > /tmp/fingerprints-turn25-baseline.txt
node scripts/cnc-delta-probe.mjs   > /tmp/probe-turn25-baseline.txt
git checkout claude/turn-26-7j8avg
node scripts/cnc-fingerprint.mjs   > verify/t26/fingerprints-turn26.txt
node scripts/cnc-delta-probe.mjs   > verify/t26/probe-turn26.txt
diff /tmp/fingerprints-turn25-baseline.txt verify/t26/fingerprints-turn26.txt
diff /tmp/probe-turn25-baseline.txt        verify/t26/probe-turn26.txt
```

Both baselines are committed beside their turn-26 runs so the diff can be taken
without a checkout, and `test/cnc-export-identity.test.js` carries the sheet
fingerprints that changed as literals (`cbfa35ea → ce75028e` for the whole-unit
sheet, `32cca2e6 → 13ba3fd2` for the non-sprayed one, both named to F8 in the
comment beside them), so a fourth delta turns a test red rather than turning up
in a workshop.
