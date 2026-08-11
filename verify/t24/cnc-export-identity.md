# CNC export identity — turn 24

> **Rule 7 / rule 0.** The DXF a machine cuts is the contract. A turn either
> moves nothing, or it names exactly what it moves and why.

Turn 24 moves **four things, all of them named here, and nothing else**:

| # | what moves | where it shows | scope |
| --- | --- | --- | --- |
| **F4** | every screw / socket axis, by **−0.5 mm** | every file that has one | **GLOBAL, named** |
| **F7** | the fix shelf's joint — biscuits + through ⌀3 | `+fix-shelf*`, `+partition-on-shelf` | probe scenarios only |
| **F8** | the partition drawn along the grain | `+partition*` | probe scenarios only |
| **F9** | `(FIX)` / `(ADJ)` on the shelf's label | any sheet with a shelf | **TEXT only** |
| F6 | the fix shelf's WIDTH (clear light, not clear − 4) | `+fix-shelf*` | probe scenarios only |

Everything else this turn — the hinge rig (F1), the part editor (F2), the
per-slot thickness (F3, whose defaults are 18 everywhere), the partition doors'
hinges (F5), the hover magnet (F10), the partition's chained display (F11) and
the hardware's environment probe (F12) — writes **zero** CNC delta, and that is
proved below rather than promised.

---

## The evidence, and how to reproduce it

| file | what it is |
| --- | --- |
| `fingerprints-turn23-baseline.txt` | `node scripts/cnc-fingerprint.mjs` at the turn-23 baseline (`12dbd9b`). **Byte-identical to `verify/t23/fingerprints-turn23.txt`** |
| `fingerprints-turn24.txt` | the same script on this branch |
| `fingerprints-diff.txt` | the diff of the two |
| `probe-turn23-baseline.txt` | `node scripts/cnc-delta-probe.mjs` at the baseline — every entity of every per-panel file and every preset sheet, by type and layer |
| `probe-turn24.txt` | the same on this branch |
| `probe-diff.txt` | the diff — the entity-level evidence a fingerprint cannot give |
| `axis-classifier.txt` | `node scripts/cnc-axis-classifier.mjs` — **F4.2's proof of innocence** |

```
git worktree add /tmp/base 12dbd9b
cp scripts/cnc-delta-probe.mjs scripts/cnc-axis-classifier.mjs /tmp/base/scripts/

node scripts/cnc-fingerprint.mjs > /tmp/fp-head.txt
(cd /tmp/base && node scripts/cnc-fingerprint.mjs > /tmp/fp-base.txt)
diff /tmp/fp-base.txt /tmp/fp-head.txt
```

The probe and the classifier are **copied into the baseline worktree** before
they are run there. Both scripts grew cases this turn (`+fix-shelf`,
`+fix-shelf-in-bay`, `+adjustable-shelves`), and a baseline swept with a
different set of cabinets would be a second opinion rather than a comparison.
Turn 23 did the same thing for the same reason.

---

## F4 — the GLOBAL named delta, and the proof it is only what it says

`profile.js`'s `puzzle.centrelineExtra: 0.5` put every screw axis at
`G/2 + 0.5`. The owner does not remember it, it is wrong, and it skewed the
whole calculation. It is gone: every centreline is now `thicknessOf(part) / 2`
— 18 → **9.00**, 18.5 → **9.25**.

**180 of the 192 fingerprint cases change.** That is expected and it is also
useless as evidence: a fingerprint says "this file changed", and on a turn where
two thousand files change it says nothing at all. F4.2 asks for the one check
that CAN speak — a per-entity classifier — and this is its summary:

```
entities compared            15581
identical                    9469
axis shift ±0.5 mm            6112
OTHER (must be 0)                0
entities added   (must be 0)     0
entities removed (must be 0)     0

every class that moved:
    2784  PUZZLE_HOLES_7_5MM
    1392  PUZZLE_SOCKET
    1936  SCREWS_3MM

UNIFORM — the delta is exactly what it is named
```

Read it as three separate statements:

1. **`OTHER 0`.** Every entity that is not byte-identical differs by exactly one
   axis coordinate of exactly 0.5 mm. Not 0.49, not two axes, not a radius.
2. **added 0 / removed 0.** No file gained or lost an entity — the shift is a
   move, not a redraw.
3. **three classes, and they are the three.** `SCREWS_3MM`, `PUZZLE_SOCKET`,
   `PUZZLE_HOLES_7_5MM` are the layers `centrelineExtra` was on. The outline,
   the dog bones, the hinge patterns, the shelf pins and the labels are all in
   the 9469 identical.

`scripts/cnc-axis-classifier.mjs` exits non-zero on anything in OTHER, so this
is a machine-checked statement rather than a reading of a diff.

### It is classified in ISOLATION, and that matters

The classifier was run **baseline → `0feb820` (the F4 commit)**, not baseline →
the tip of the branch. F7 ADDS entities to the fix-shelf scenarios and F8
re-orients a partition; a per-entity pairing walked over those would report
"OTHER" for changes that have nothing to do with F4 and are named separately
below. Isolating F4 is what makes "uniform" mean uniform. The other three
deltas are then accounted for on their own terms, by count and by scenario, in
`probe-diff.txt`.

The twelve cases that **do not** change at all are the `DW_PANEL` family — a
dishwasher panel carries no screw axis, so there is nothing in it for F4 to
move:

```
DW_PANEL  DW_PANEL+adjustable-shelves  DW_PANEL+bottom-mask
DW_PANEL+bottom-mask-run-owner  DW_PANEL+fix-shelf  DW_PANEL+infill-mitre
DW_PANEL+infill-mitre-narrow  DW_PANEL+infills  DW_PANEL+plinth
DW_PANEL+plinth-run-member  DW_PANEL+plinth-run-owner  DW_PANEL+shelves
```

---

## F7 — the fix shelf's joint: new entities, in the named probes only

The owner: *"jak fix, to nie ma 3 poziomów 7,5 — to się wyklucza."*

A FIX shelf now carries biscuits on both bearing faces and through ⌀3 screws
**from carcass sides only** — from a partition side it is biscuits alone,
because a partition serves two bays and a through screw would surface in the
neighbour's face.

Every entity-count change in the whole probe is one of exactly three rows:

```
168  text/UNIT_NUMBER      ← F8 and F9, below
 72  circle/SCREWS_3MM     ← F7, the side's through screws
 36  poly/BISCUIT_4MM      ← F7, the biscuits
```

and every scenario they appear in is a named one:

```
+fix-shelf   +fix-shelf-in-bay   +partition   +partitions-2   +partition-on-shelf
```

There is no other scenario in the file. `WARDROBE+fix-shelf`, entity by entity:

```
- circle/SCREWS_3MM 32          + circle/SCREWS_3MM 34
                                + poly/BISCUIT_4MM 8
```

**The ⌀7.5 is gone from fix, and it was never there to lose:** the
`+fix-shelf` census carries no `SHELVES_7_5MM` row at all, in the baseline or on
this branch, while `+adjustable-shelves` carries 24. F7.3's red test is what
keeps it that way — any `SHELVES_7_5MM` entity on a fix shelf or its bearers
fails the suite.

## F6 — the width, with zero delta where it counts

`fix = the full clear light` (600 carcass ⇒ **564**), `adjustable = clear − 4`
(⇒ **560**). Today's engine shelf was `W − 2G − 4` — already the adjustable
number — so every existing shelf and every golden default maps to ADJUSTABLE
with **zero** delta. The probe shows it: `WARDROBE+adjustable-shelves` reads
`560x540` in the baseline and `560x540` on this branch. A width only moves where
a shelf is switched to fix (`+partition-on-shelf`: `860x540` → `864x540`).

## F8 — the partition along the grain, in partition scenarios only

The LISP draws the partition "rotated 90"; the owner's production law wins —
**grain top-to-bottom, like the sides** — so the partition lays on the sheet in
the same convention as BUL/BUR. This is the documented exception where the
owner's production law overrides the LISP's drawing convenience.

It is a GEOM change on the partition's own file and a re-wrap of its label:

```
- UNIT_NUMBER|01 VPART-1 2114x560|20|1057,280
+ UNIT_NUMBER|01|20|280,1082
+ UNIT_NUMBER|VPART-1|20|280,1057
+ UNIT_NUMBER|2114x560|20|280,1032
```

One line became three because the same caption is being fitted to a tall narrow
box instead of a long flat one — which is the whole of the `text/UNIT_NUMBER +2`
in the partition scenarios. The words are identical.

## F9 — the shelf says what it is, and it is TEXT only

`… SHELF (FIX)` / `… SHELF (ADJ)`, from the panel's own `meta.variant`. Thirty
label lines carry the tag on this branch and **none** does in the baseline.

It adds no entity. The label block wraps to the space it has, and a longer
caption simply packs differently:

```
baseline                              turn 24
UNIT_NUMBER|01|20|280,295             UNIT_NUMBER|01 SHELF-1|20|280,295
UNIT_NUMBER|SHELF-1|20|280,270        UNIT_NUMBER|560x540|20|280,270
UNIT_NUMBER|560x540|20|280,245        UNIT_NUMBER|(ADJ)|20|280,245
```

`CENSUS WARDROBE+adjustable-shelves all text/UNIT_NUMBER` reads **19** on both
sides. Three lines before, three lines after.

---

## What is NOT here

* **F3** ships six thickness slots and a `thicknessOf(part)` helper, and every
  default is 18 — so the derived numbers are the numbers the goldens already
  had. The 18.5 probe lives in the test suite (axis 9.25, the groove, the box),
  not in the export.
* **F1, F2, F5, F10, F11, F12** touch the view, the editor's stored overrides
  and the scene. The part editor's overrides are per-print by construction: a
  stock project fingerprints identically, and the dedicated override test is
  what proves the drawn line and the dowel row reach the file.
