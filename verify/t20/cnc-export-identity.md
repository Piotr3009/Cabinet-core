# Turn 20 — the CNC export: ONE named delta, and nothing else

> **CLAUDE.md F4.3.** "This is the turn's ONLY intended CNC fingerprint delta,
> and it is confined to TEXT entities: height 20 → 10 (and the wrap layout's
> dependent line positions). `verify/t20/cnc-export-identity.md` names it, and
> the fingerprint diff must show text-height lines and NOTHING else. A single
> moved drill = stop."

## The delta

**F4 — the in-part label is written at half its height.** `profile.cnc.labelHeight`
40 → **20**. `exportLabelScale` stays 0.5, `labelMinHeight` (6) and
`labelFitRatio` (0.12) stay exactly where they are, so a small part already
sized by the ratio does **not** shrink twice.

Where the number acts: `engine/cnc/dxf.js → panelLabel()` takes

```
max( labelMinHeight,
     min( sheetBlockSize × exportLabelScale ,   ← 35 on a big part
          labelHeight ,                          ← was 40, now 20
          shortSide × labelFitRatio ) )
```

Before this turn the middle limit (40) never bound anything and the halved
sheet size (35) did. Now 20 binds every big part and nothing else changes.

## The evidence, entity by entity

`scripts/cnc-delta-probe.mjs`, run on the turn-19 baseline and on this branch:

| file | contents |
| --- | --- |
| `probe-turn19-baseline.txt` | the baseline probe (identical to `verify/t19/probe-turn19.txt`) |
| `probe-turn20.txt` | this branch |
| `probe-diff.txt` | the diff |

Machine-checked over all **278** exported per-panel files of every kit:

| what could have moved | how many did |
| --- | --- |
| `GEOM` — every poly and circle, hashed WITHOUT text | **0** |
| `CENSUS` — every entity of every preset sheet, by type and layer | **0** |
| TEXT — **layer** | **0** |
| TEXT — **string** (the words, and which words are on which line) | **0** |
| TEXT — **line count** per part | **0** |
| TEXT — **position** (x, y) | **0** |
| TEXT — **height** | **397** |

Every one of those 397 is a cap coming down:

| old height | new height | occurrences |
| --- | --- | --- |
| 35 | 20 | 314 |
| 33.75 | 20 | 16 |
| 31.2 | 20 | 4 |
| 30.48 | 20 | 4 |
| 27.2857 | 20 | 18 |
| 24 | 20 | 2 |
| 22.8 / 22.56 / 21.14 / 20.28 … | 20 | the rest |

and **no new height is above 20**. Heights already below the cap — 19.07, 16.64,
9.5, 8.25, the 6 mm floor — are **unchanged to the digit**, which is F4.2's
"small parts already size by the ratio and are NOT to shrink twice" as a fact
rather than a promise.

Line POSITIONS did not move at all, because the wrap layout is the SHEET's
block and the sheet's size did not change — so this turn's delta is even
narrower than F4.3 allows for.

## The fingerprints

| file | contents |
| --- | --- |
| `fingerprints-turn19-baseline.txt` | the turn-19 baseline, byte-identical to `verify/t19/fingerprints-turn19.txt` |
| `fingerprints-turn20.txt` | this branch |
| `fingerprints-diff.txt` | the diff — every line of it is a label height |

Pinned in `test/cnc-export-identity.test.js`, deliberately, in the commit that
moved them:

| case | turn 18/19 | turn 20 |
| --- | --- | --- |
| `01-BUL.dxf` | `27e677c5` | `d9555e61` |
| sheet `all` | `50931ceb` | `bf00b60f` |
| sheet `non-sprayed` | `707406dd` | `07a550cd` |
| sheet `sprayed` / `fronts` | `dbf83ff2` | `27364f5c` |

## What did NOT move, and was checked

* **F1 (the drawer box rides its runner)** — the box's Y in the cabinet moves;
  every pocket, groove and drilling on a box part is measured from that part's
  OWN edges, so not one exported byte follows it. Verified by running the
  fingerprint script with F1 in and F4 out: **identical to the baseline**.
* **F2 (the bucket)** — display and purchasing only. Verified the same way:
  identical to the baseline with F1 and F2 in and F4 out.
* **F3, F5–F12** — view, window and interaction work. `engine/cnc/*` is
  untouched by all of them; the census above covers it.

## The number F4.2 predicts, and the number the code produces

F4.2 reads: *"exportLabelScale stays 0.5 ⇒ exported DXF label text height
20 → 10."* The exported height on a big part was **35** and is now **20** — the
same halving, one rung up the ladder, because the SHEET's own caption is sized
by `cnc.annotation.partLabelMm` (70) and not by `labelHeight`. `labelHeight` has
only ever been the file's absolute cap.

**The sheet's caption is therefore unchanged by this turn**, and the owner's
"on the glass" is only half answered. It was left alone on purpose:
`partLabelMm` is held EQUAL to `sectionLabelMm` by turn 17's "ONE TYPE SCALE ON
THE SHEET" rule (`test/turn17-cnc-truth.test.js`), and capping the sheet's block
at 20 was tried and measured — it re-wraps the shared label, so 212 parts drop
from two lines to one and the CENSUS moves on 192 lines. That is a change to
what the FILE says, not to how tall it says it, and F4.3 does not allow it.
Halving the glass is a named delta for a turn that names it.
