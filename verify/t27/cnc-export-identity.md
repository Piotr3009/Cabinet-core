# Turn 27 — what moved in the CNC export, and why

**Baseline: the turn-26 merge, `8c0ece5`.** Every number below is a diff of two
runs of the same three scripts against the two checkouts — nothing here is read
off a screen.

```
scripts/cnc-fingerprint.mjs     288 scenarios × (files + 4 sheets)  →  4 794 rows
                                (252 of them in the baseline; 36 are new)
scripts/cnc-delta-probe.mjs      96 scenarios × GEOM/SHAPE/TEXT/CENSUS → 8 020 rows
scripts/t27-shelf-hole-move.mjs   5 arrangements × every ⌀7.5 hole    →     35 rows
```

---

## The short answer

**Two named deltas, and nothing else.** Both were asked for by name in
CLAUDE.md; no third thing moved anywhere in any of the three instruments.

| | delta | what moves | golden defaults |
| --- | --- | --- | --- |
| **F1** | a shelf drills the two boards that carry it | in a cabinet with a PARTITION, the ⌀7.5 pin ladder leaves the side the shelf does not touch and appears in the partition, in the partition's own frame | **none** |
| **F2** | the dishwasher stops being a species of its own | `DW_PANEL` gains `BUL`, `BUR`, `BOTTOM` and `BACK`; its `TOP` becomes the run's own top; a partition item stops cutting a board | **`DW_PANEL`, and only `DW_PANEL`** |

**F3 and F4 move no CNC entity at all.** F3 is a winding order in
`3d/shakerSolid.js` and F4 is a canvas fill in `3d/DimensionChain.jsx`; neither
file is on the export's path, and the delta probe below says so as a fact
rather than as a claim.

Eleven of the twelve bare types — `BUD`, `BUDR`, `BUDR2`, `BUDR4`, `BUDTALL`,
`FRIDGE`, `LOW_CABINET`, `OVEN_BASE`, `SINK`, `WARDROBE`, `WUD` — are
**byte-for-byte what they were before this turn**, every file and all four
sheets, in every one of their twenty-four variants. The twelfth is `DW_PANEL`,
which is F2's own delta and the one CLAUDE.md's PROOF section names.

---

## The fingerprints

`fingerprints-turn26-baseline.txt` (4 072 rows) → `fingerprints-turn27.txt`
(4 794 rows):

```
 68 rows changed        ← DW_PANEL, and nothing else
727 rows added
  5 rows removed
```

### The 68 changed rows are all `DW_PANEL` (F2)

They are 21 of its 24 scenarios, and they name exactly one DXF file:

| row | count | what |
| --- | --- | --- |
| `file 01-TOP.dxf` | 21 | the 600 mm top a carcass-less D/W needed becomes the run's own `W − 2G` top |
| `sheet all` | 21 | arithmetic: a sheet's fingerprint is the nest of the files on it |
| `sheet non-sprayed` | 21 | …the same |
| `sheet sprayed` | 5 | the plinth and infill scenarios — the FRONT is cut with the fronts now, so it enters the nest after the plinth instead of before it. **`01-F.dxf` itself is byte-identical**, which is why `sheet fronts` does not move on any scenario. |

`01-F.dxf` is unchanged on every D/W scenario: the leaf is still 594 × `H − gap`
with the same shaker pocket and the same handle holes. What changed about the
front is WHERE IN THE FILE ORDER it is cut, not what is cut.

### The 727 added rows

| source | rows | what |
| --- | --- | --- |
| the three new probes | 643 | `+shelf-in-right-bay`, `+shelf-mid-bay-2-parts`, `+shelf-end-bay-2-parts` across all twelve types — see below |
| `DW_PANEL` (F2) | 84 | `01-BUL.dxf`, `01-BUR.dxf`, `01-BOTTOM.dxf`, `01-BACK.dxf` — four boards that did not exist because turn 17 switched the carcass off |

An ADDED row is a file that did not exist in the baseline, which is what this
script's own header calls the right way to report a new variant.

### The 5 removed rows

```
DW_PANEL+fix-shelf-in-bay   file  01-VPART-1.dxf
DW_PANEL+partition          file  01-VPART-1.dxf
DW_PANEL+partition-doors    file  01-VPART-1.dxf
DW_PANEL+partition-doors    file  01-VPART-2.dxf
DW_PANEL+partition-on-shelf file  01-VPART-1.dxf
```

`interiorOccupied` (F2.1). A carcass with a dishwasher in it has nothing inside
it, so a partition item on a D/W stops cutting a board. Turn 26 cut one — a
divider standing in a cabinet that had no sides for it to stand between.

---

## The entity-by-entity probe

`probe-turn26-baseline.txt` (7 845 rows) → `probe-turn27.txt` (8 020 rows):

```
 89 lines removed
264 lines added
  0 lines on any type but DW_PANEL
```

That last line is the strongest form of the claim and it is a `grep`:

```
$ grep -E '^[<>]' probe-diff.txt | grep -vc 'DW_PANEL'
0
```

Every GEOM, SHAPE, TEXT and CENSUS line of the diff is a `DW_PANEL` line. F1's
correction moves no entity in any scenario that existed; F3 and F4 move none
anywhere.

---

## F1: the holes that left BUL, and why they were wrong to be there

The fingerprint reports F1 as three ADDED scenarios rather than as a change,
because **an adjustable shelf inside a BAY is a case the turn-26 probe set never
built**. That is also the reason F1's delta on everything that existed is zero:
a cabinet with no partition resolves both bearers to `BUL` and `BUR` and comes
out byte-for-byte what it was, and a FIX shelf in a bay has no pin ladder at all.

An addition is not evidence of a MOVE, so `scripts/t27-shelf-hole-move.mjs`
prints the move itself. Run against both checkouts
(`shelf-hole-move-diff.txt`):

| arrangement | turn 26 bored | turn 27 bores |
| --- | --- | --- |
| one partition, shelf in the RIGHT bay | `BUL` + `BUR` | **`VPART-1` + `BUR`** |
| one partition, shelf in the LEFT bay | `BUL` + `BUR` | **`BUL` + `VPART-1`** |
| two partitions, shelf in the MIDDLE bay | `BUL` + `BUR` | **`VPART-1` + `VPART-2`** |
| two partitions, shelf in the FAR bay | `BUL` + `BUR` | **`VPART-2` + `BUR`** |
| **no partition at all** | `BUL` + `BUR` | `BUL` + `BUR` — **the row does not appear in the diff** |

### The leaving holes were WRONG

This is a CORRECTION and not a new class, and it is worth saying plainly what
was wrong with the old position rather than only what is right about the new
one.

A shelf running from a partition to `BUR` **does not touch `BUL`**. The six ⌀7.5
holes turn 26 bored into `BUL` at that height held nothing: there was no board
landing on them, and a shelf pin driven into one would have stood in an empty
bay. They were not a different opinion about where the shelf goes — they were
holes drilled for a shelf that is somewhere else, in a board a joiner would have
had to fill or ignore. The two the shelf actually stands on, `VPART-1` and
`BUR`, got one ladder between them instead of two.

The cause was one line, and it is worth naming too:
`for (const sideId of ['BUL', 'BUR'])`. That is true of a cabinet with no
partition in it and of nothing else, and it had been true since turn 1 because
until turn 12 there was nothing else it could be.

### …and the heights are in each board's own frame

```
shelf at 400        cluster −50 / 0 / +50      world 350 / 400 / 450

BUR      origin y = 0    (the cabinet floor)   →   350 / 400 / 450
VPART-1  origin y = 18   (its own bottom edge) →   332 / 382 / 432
```

A partition stands INSIDE the carcass, one board up. A hole measured from the
cabinet floor and drilled on a partition is out by the thickness of the bottom
board — 18 mm — **on every hole**. `heightOnBearer` converts per bearer, and
`pinColumns` does the same for the two columns: `columnFromEdge` from that
board's own front edge and `shelfBackColumn` from the back of its own depth, so
a partition set back from the face has its back column set back with it.

### Why the fingerprint on the golden defaults is zero

The ladder is gathered per bearer and emitted in PANEL order — `BUL`, then each
partition, then `BUR`. On a box with no partition that is exactly the sequence
turn 26 wrote (`BUL`'s whole ladder, then `BUR`'s), so a plain cabinet is
byte-identical rather than merely equivalent.

---

## F2: where the unified path touches an entity

Every one of these was named in CLAUDE.md F2 and none is a new number.

| entity | turn 26 | turn 27 | why |
| --- | --- | --- | --- |
| `01-BUL.dxf`, `01-BUR.dxf` | did not exist | the run's own side panel, joints and all | F2.1 — "sides… exactly like its neighbours" |
| `01-BOTTOM.dxf` | did not exist | the run's own bottom | F2.1 (BLOCKERS #94 asks whether it should be there at all) |
| `01-BACK.dxf` | did not exist | the run's own back | F2.1 |
| `01-TOP.dxf` | 600 × depth, a profile constant | `W − 2G` × depth, the run's own top | F2.1 — the 600 was the parallel path's, for a top spanning a gap with no sides under it |
| `01-F.dxf` | 594 × `H − gap`, shaker, handle | **identical** | it was already right (turn 26 F5); only its place in the file order moved |
| `01-PLINTH.dxf` | notched 20 mm below the top | **identical** | F2.4 — "as turn 26 shipped", now keyed on the front's gesture rather than on the kit |
| `01-VPART-*.dxf` | cut where a partition item was set | not cut | F2.1 `interiorOccupied` |
| cup drilling on the front | none | **none** | F2.3 — it screws to the appliance's own door |
| the plate pattern in the sides | n/a (no sides) | **none** | F2.3 — nothing is hung on them |

A D/W beside a BUD of the same width now shares its carcass laws exactly —
board for board and hole for hole, at 500, 600 and 800 wide and at 720 and
770 high — with the hinge plate pattern as the single named exception, because a
BUD has a door hung on its side and a D/W has nothing hung on anything
(`test/turn27-f2-dishwasher-is-a-cabinet.test.js` → *F2.6*).

---

## F3 and F4: nothing

| | what changed | reaches the export? |
| --- | --- | --- |
| **F3** | the winding of four rebate walls, of every bore wall, and the subdivision of a bore's mouth, in `3d/shakerSolid.js` | **no** — the shaker POCKET on the sheet is a rectangle with a depth and it has not moved a hundredth |
| **F4** | a canvas fill in `3d/DimensionChain.jsx`, and a palette block in `profile.hoverDimensions.label` | **no** — a dimension label is scene chrome and has never been an entity |

Both are visible in the `0` on the probe's non-`DW_PANEL` grep above.
