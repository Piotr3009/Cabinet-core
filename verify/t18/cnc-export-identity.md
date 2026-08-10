# CNC export identity — turn 18

CLAUDE.md, rule 0: *"CNC EXPORT: this turn has **THREE named deltas**, and nothing
outside them. Fingerprint before/after, publish in
`verify/t18/cnc-export-identity.md`, in these words … Anything else moving in the
fingerprints is a REGRESSION, not a delta."*

This is that publication. Baseline: `d220ee5` — main after the turn-17 merge plus
the chat package. Branch: `claude/claude-md-turn-18-vrbjyx`.

Evidence in this folder:

| file | what it is |
|---|---|
| `fingerprints-turn17-baseline.txt` | `scripts/cnc-fingerprint.mjs` run on `d220ee5` |
| `fingerprints-turn18.txt` | the same script run on this branch |
| `fingerprints-diff.txt` | the raw diff of the two |
| `probe-turn17-baseline.txt` | `scripts/cnc-delta-probe.mjs` run on `d220ee5` |
| `probe-turn18.txt` | the same probe run on this branch |
| `probe-diff.txt` | the raw diff of the two |

`fingerprints-diff.txt` is total: every line differs. That is expected and it is
delta 1, because delta 1 is a change to a label that **every part carries**. A
hash cannot tell you *what* moved, so the entity-level probe is the document that
matters.

Turn 17 ran that probe by hand against two checkouts. This turn it is a
**script** — `scripts/cnc-delta-probe.mjs`, runnable against any checkout — so
the next turn diffs two runs instead of rebuilding the apparatus. It asks three
questions:

```
1. PER-PANEL GEOMETRY   every poly and circle of every file, hashed WITHOUT text
     changed: 18        added: 4        removed: 2
2. SHEET CENSUS         every entity of every preset sheet, by type and layer
     changed: only on OVEN_BASE, WARDROBE+drawers, and text/UNIT_NUMBER
3. PER-PANEL TEXT       the label each file carries
     276 lines → 699 lines, on every kit
```

And the eighteen changed files, the four added and the two removed are **all**
in the two places this turn is about:

```
OVEN_BASE          BUL BUR D1-SL D1-SR D1-BF D1-BB F1     ← delta 3
OVEN_BASE          + RAIL-B  + RAIL-F   − TOP            ← delta 3
WARDROBE+drawers   D1-SL D1-SR D2-SL D2-SR               ← delta 2
```

Not one other kit's geometry moved. `BUD`, `BUDR`, `BUDR2`, `BUDR4`, `BUDTALL`,
`WUD`, `LOW_CABINET`, `SINK`, `DW_PANEL`, `FRIDGE` and a plain `WARDROBE` are
byte-for-byte the boards they were, apart from their lettering.

> **A note on the probe's own coverage.** The turn-17 probe built every kit at
> its DEFAULTS, and a wardrobe arrives with no drawers — so a probe run at
> defaults alone would have reported "no geometry changed" while delta 2 went
> past it unseen. `cases()` in the script now builds every kit twice, once with
> drawers, and says so in a comment. A turn that touches a piece the defaults do
> not reach adds its own case rather than trusting them.

---

## 1 · In-part labels wrap, centre and shrink — TEXT entities only

The owner's export screenshot: `F01 TOP 564x540 F01 BOTTOM 564x…` running over
the parts and into the neighbours. Two things were true at once.

* the label was ONE LINE, so a small part could only fit it by shrinking to
  nothing or by hanging over its own edges;
* the SHEET and the FILE each worked out the fit their own way — one from
  `annotation.partLabelMm` and a half-height box, the other from
  `cnc.labelHeight` and a fit ratio — so the picture on the glass and the
  lettering on the board could disagree, and did.

There is ONE layout function now (`engine/cnc/annotation.js` `labelBlock`), used
by `components/CncView.jsx` and by `engine/cnc/dxf.js`, with the part's own
rectangle as the box in both. The block breaks at the label's own word breaks,
is centred in the part both ways, and a line that still will not fit is
truncated with an ASCII `~`.

```
was: UNIT_NUMBER | 01 BUL 560x2150 | 40    | 280,1075
now: UNIT_NUMBER | 01 BUL          | 35    | 280,1096.875
     UNIT_NUMBER | 560x2150        | 35    | 280,1053.125

was: UNIT_NUMBER | 01 FIL~         | 6     | 15,204        (a 30 mm filler)
now: UNIT_NUMBER | 01              | 6     | 15,211.5
     UNIT_NUMBER | FILL~           | 6     | 15,204
     UNIT_NUMBER | 30x4~           | 6     | 15,196.5

was: UNIT_NUMBER | 01 D1-SL 440x164 | 19.68 | 220,82       (a drawer side)
now: UNIT_NUMBER | 01 D1-SL         | 19.68 | 220,94.3
     UNIT_NUMBER | 440x164          | 19.68 | 220,69.7
```

The filler is the case the owner's screenshot was really about. Thirty
millimetres of board could hold four characters of a seventeen-character string,
so `01 FIL~` was all a joiner ever got off one; it now says which cabinet, which
piece and roughly how big, on three lines, inside its own 30 mm.

Three things to note.

* The LAYER is unchanged (`UNIT_NUMBER`) and so is the anchor: the block's
  middle is the part's middle, which is exactly where the single line was
  written, so a one-line label does not move by a thousandth.
* **Half the size in the export** (F1.2). `cnc.exportLabelScale: 0.5` — the file
  writes what the sheet lays out, at half its height, never below
  `labelMinHeight` and never above the LISP's own `labelHeight`. The sheet on
  screen keeps its size.
* **A wider advance and a tighter fill** (F1.3). `MONO_ADVANCE` 0.62 → 0.85 and
  the fill ratio 0.94 → 0.85. A DXF carries no font, the reader's CAD picks its
  own, and Piotr's is wider than ours: a label must fit in the WORST reasonable
  face, not the best. No text STYLE was added and none ever will be — the header
  comment in `dxf.js` records why (a styled DXF is what killed VCarve's parser
  on 02.08.2026).

The census is the proof that this delta is TEXT and nothing else. On the
wardrobe the identity test builds:

```
                     was   now
OUTLINE               31    31
PUZZLE_DOG_BONES      18    18
PUZZLE_HOLES_7_5MM    36    36
PUZZLE_SOCKET         18    18
SCREWS_3MM            50    50
RUNNERS_3MM           18    18
SHELVES_7_5MM         24    24
HINGES_5MM            12    12
FRONT_HINGES_35MM      6     6
FRONT_HINGES_3MM      12    12
UNIT_NUMBER           31    72   ← 31 labels, 72 lines between them
DRAWER_RUNNER_POCKET   —     6   ← delta 2, below
DRAWER_BOTTOM_POCKET   —     6   ← delta 2, below
```

---

## 2 · Drawer SIDES gain their true machining

From the owner's own workshop DXF, read together in chat and confirmed:

* **bottom groove** (`DRAWER_BOTTOM_POCKET`) — in each side's inner face, **7 mm
  deep**, its lower edge **15 mm above the side's bottom edge**, `G + 1` tall so
  the 18 mm bottom goes in, running the full length of the side;
* **runner reduction** (`DRAWER_RUNNER_POCKET`) — the inner face milled **2 mm
  deep** over the band **from the bottom edge up to the groove (0 → 15)**, full
  length. An 18 board becomes 16 where the runner lives: *"blum tego wymaga."*

The BUDR kit has cut both since turn 3, at exactly these positions. The
WARDROBE's internal drawer boxes never had either — they went out as bare
rectangles — so a joiner cutting one got a side with nowhere for the bottom to
sit and 18 mm of board where the runner needs 16. That is the delta:

```
was: WARDROBE+drawers 01-D1-SL.dxf   OUTLINE only
now: WARDROBE+drawers 01-D1-SL.dxf   OUTLINE
                                     DRAWER_RUNNER_POCKET  −10,0 → 450,15
                                     DRAWER_BOTTOM_POCKET  −10,15 → 450,34
```

**The arithmetic closes, and that is the check that these are the right numbers
rather than plausible ones.** `bottomW = boxFrontLen + 13` (`bottomOversize`),
and `boxFrontLen` is the gap between the two sides' inner faces — so the bottom
reaches **6.5 mm** into a **7 mm** groove and half a millimetre of air is left at
the bottom of it. The profile's numbers were right all along; now the groove they
imply is cut. `test/turn18-phases.test.js` pins the sum on both kits.

The numbers are `profile.baseDrawerUnit`'s, READ from there rather than copied
into `wardrobe.drawers`: they were measured off *a drawer side*, not off a base
unit's drawer side, so there is one set of them and both kits cut to it.

Box length NL − 10, side = front − 36, `firstFrontAdjust` — all LISP, all
untouched.

---

## 3 · The oven base, corrected to the owner's review

### Side sockets only where the back is

The oven's BUL carried the same seven pockets a full-back BUD does — three
back-tab dog bones and four sockets — and above the drawer-back there is nothing
to catch. `sidePanelGeometry` takes a `backTabsBelow` now: a tab is cut only if
its whole DOG BONE lands inside the back, which is the same fact that decides
the middle tab on a low carcass. The top sockets and the top screw row go with
the TOP panel, exactly as the sink's do.

```
was: OVEN_BASE 01-BUL.dxf   PUZZLE_DOG_BONES ×3   PUZZLE_SOCKET ×4
now: OVEN_BASE 01-BUL.dxf   PUZZLE_DOG_BONES ×1   PUZZLE_SOCKET ×2
```

The one that is kept is the one the BACK really has a socket for — the lowest
tenon, 95 mm up from the carcass floor — and the two that stay are the bottom's.

### A rail top, not a TOP panel

An oven housing with a full top over it is a lid. The kit takes the SINK's own
two-holder answer with the one change the owner named: the FRONT rail lies FLAT,
100 mm wide and one board thick, so what you look at is an 18 mm edge and the
appliance's flue has the whole opening behind it.

```
removed: OVEN_BASE 01-TOP.dxf
added:   OVEN_BASE 01-RAIL-B.dxf   100 × 564, on edge
added:   OVEN_BASE 01-RAIL-F.dxf   100 × 564, lying flat
```

New numbers under `profile.ovenUnit.topRails`; the sink's own
(`sinkUnit.railHeight`, `sinkUnit.holderScrewFromTop`) are not read from this kit
and `fixtures/golden-sink.json` is unchanged, which is the fixture proving it.

**No ventilation cut**, and that is a decision rather than an omission: the open
back and the now-open top ARE the airflow, and a 50 × 300 slot in the shelf would
vent into a closed drawer. A specific oven's manual demanding one is a
manufacturer's number for a later turn (BLOCKERS #79).

### The drawer front takes its gap below the appliance

The oven FACE behaves like a front in the run, and two fronts never touch:

```
front = H − gap − ovenHeight − gap
      = 770 − 3 − 595 − 3
      = 169          (turn 17 gave 172, and the front sat against the oven)
```

*"szczelina 3 mm jak wszystkie nasze drzwi."*

The BOX still fits the OPENING under the shelf — and on a 770 carcass it did
not. A box side is `sideRatio` of its FRONT, which is right in a run of drawer
units where the front and the opening are the same piece of cabinet; an oven's
are not. So the front decides the box everywhere it did before, and under an
appliance shelf the opening has the last word:

```
was: side 120 mm, from y = 56 → 176, through a shelf whose underside is at 154
now: side  98 mm, from y = 56 → 154, exactly under it
```

---

## What did NOT move

* Every panel of every other kit, to the byte, apart from its label.
* The layer NAMES, the R12 dialect, the entity order, the file naming.
* `fixtures/` — `git diff --stat fixtures/` is empty.
* The dependency list — `package.json` and `package-lock.json` untouched.

Tests: **1405 pass, 0 fail** (1372 at the baseline, plus this turn's 33).
Browser walk: **28/28 checks**, `walk.json` beside this file.
