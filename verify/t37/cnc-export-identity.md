# CNC export identity — turn 37

Subject: **F7a — the sheet learns the field** (`src/engine/cnc/layout.js
sheetTurn`). The owner, on a nest of drawer parts lying flat: *"CNC jest ok, ale
wizualizacja nie jest — sprawdź, co ci nadpisuje."*

Baseline: turn 36's committed fingerprints, i.e. the numbers standing in
`test/cnc-export-identity.test.js` before this turn.
This turn: the same test, re-pinned and dated.

The unit under fingerprint is that file's own: `WARDROBE`, 600 × 2150 × 578,
`board_t` 18, `front_t` 25, shaker fronts, **2 shelves, 3 drawers, a rail, one
door**, `unit_num` 01.

## The headline

**One law changed, three parts moved, no entity appeared or disappeared.**

`sheetTurn` used to turn a part by its drawn SIZE and to ask that question only
of four part NAMES (`SHELF`, `PARTITION`, `RAIL-PART`, `FIXED`). It had never
read `cnc.grain`. F7a generalises it — *a part that STATES its grain is laid
with that grain running UP the sheet* — with the old size rule kept, unchanged,
as the fall-through for a part that states nothing.

On this sheet the only part whose statement disagrees with the way it is drawn
is the **drawer bottom**: `DRAWER-BOTTOM` states `w` ("dno — słoje w poprzek",
turn 36 F5) on a frame drawn 483 × 440, so it was going down the page with its
figure lying across. It now turns 90° and stands.

## Before → after

| sheet | before | after | why |
| --- | --- | --- | --- |
| `all` (whole unit) | `49b23ea5` | **`0987fb40`** | the three drawer bottoms turn 90° |
| `non-sprayed` | `f5aa169e` | **`9294e301`** | the same three — a drawer bottom is a carcass part |
| `sprayed` | `5637b58d` | `5637b58d` | **UNCHANGED** — no drawer bottom is a face |
| `fronts` | `5637b58d` | `5637b58d` | **UNCHANGED** — the same fronts, the same nothing |
| tree-ticks (`sprayed` unticked) | `f5aa169e` | **`9294e301`** | it is the `non-sprayed` file, to the byte, as it must be |

The census logic reads the way every delta before it has been read by: a drawer
bottom sits in the carcass, so the two sheets that carry a carcass move and the
two that are doors and drawer faces stand still. A delta that had touched a door
would be a delta that is not what it says it is.

## Which parts moved, and by how much

`sheetTurn` per part on this sheet, before → after:

| part | ids | states | drawn | turn before | turn after |
| --- | --- | --- | --- | --- | --- |
| `DRAWER-BOTTOM` | D1-DNO, D2-DNO, D3-DNO | `w` | 483 × 440 | 0 | **90** |
| `SHELF` | SHELF-1, SHELF-2 | `h` | 540 × 560 | 0 | 0 |
| `PARTITION` | PARTITION | — | 564 × 560 | 90 | 90 |
| `RAIL-PART` | RAIL-PART | — | 564 × 560 | 90 | 90 |
| `DRAWER-SIDE` | D1..D3-SL/SR | `h` | 440 × 164 | 0 | 0 |
| `DRAWER-BOX-FRONT`/`-BACK` | D1..D3-BF/BB | `h` | 470 × 130 | 0 | 0 |
| `DRAWER-FRONT` | 01-DF1..3 | `h` | 510 × 197/200 | 0 | 0 |
| `BUL` `BUR` `TOP` `BOTTOM` `BACK` `DP` `FILLER` `FRONT` | — | — | — | 0 | 0 |

The shelves are the case worth naming: they STATE their grain, they are the
family turn 17 F3 was written for, and they do not move — because turn 26 F8
already draws them standing (`depth × width`), so the statement and the old size
rule agree on them. `PARTITION` and `RAIL-PART` state nothing and are answered
by turn 17's own code, to the digit.

## The entity-level evidence

Taken by laying the same panels out twice — once with `cnc.grain` present and
once with it stripped, which reproduces the old rule exactly because **no other
module in `src/engine/cnc/` reads the field** (grep-verified; `layout.js` is its
only reader there, and `decors.js` its only reader in the app).

```
entities:            315 → 315
layer census:        unchanged to the digit
                     DRAWER_BOTTOM_POCKET 6, DRAWER_RUNNER_POCKET 6,
                     FRONT_HINGES_35MM 6, FRONT_HINGES_3MM 12, HINGES_5MM 12,
                     OUTLINE 31, PUZZLE_DOG_BONES 18, PUZZLE_HOLES_7_5MM 36,
                     PUZZLE_SOCKET 18, RUNNERS_3MM 18, SCREWS_3MM 52,
                     SHAKER_PANEL_POCKET 4, SHELVES_7_5MM 24, UNIT_NUMBER 72
sheet extent:        3596 × 6000  →  3580 × 6086
per-panel DXF files: 31 → 31, and ZERO of them differ by a byte
```

Not one entity is added, removed or re-layered. Three placements turn; the rest
of the movement is the row packing REFLOWING behind them, which is what a
placement change does to a sheet that wraps:

```
D1-DNO   turn 0→90   footprint 483×440 → 440×483   at 1550,2873 → 1550,2873
D2-SL                                              at 2083,2873 → 2040,2873
D2-SR                                              at 2593,2873 → 2550,2873
D2-BF                                              at 3103,2873 → 3060,2873
D2-BB                                              at    0,3363 →    0,3406
D2-DNO   turn 0→90   footprint 483×440 → 440×483   at  520,3363 →  520,3406
D3-SL                                              at 1053,3363 → 1010,3406
D3-SR                                              at 1563,3363 → 1520,3406
D3-BF                                              at 2073,3363 → 2030,3406
D3-BB                                              at 2593,3363 → 2550,3406
D3-DNO   turn 0→90   footprint 483×440 → 440×483   at 3113,3363 → 3070,3406
01-DF1                                             at    0,3853 →    0,3939
01-DF2                                             at  560,3853 →  560,3939
01-DF3                                             at 1120,3853 → 1120,3939
01-F                                               at 1680,3853 → 1680,3939
```

Sixteen of the thirty-one parts do not move at all; the fifteen listed are the
three that turn plus the twelve that sit after the first of them in the flow.
Every part before `D1-DNO` — the whole carcass, both shelves, the partition, the
rail, the drawer panel, the fillers and the first drawer's four box boards — is
placed on the identical coordinate it was.

**The parts' own frames did not move.** All 31 per-panel DXF files are
byte-identical: `sheetTurn` is a fact about how the SHEET puts a part down, not
about the part, and `verify/t26/sheet-vs-scene.md`'s distinction still holds.
The cut sizes the CSV and the BOM print are untouched.

## The 3D half (F7b) emits nothing

`decors.js grainRun` is a reader for the scene. It has no path to the export —
`test/turn29-f1-shelf-grain-scene.test.js` asserts that `cnc/layout.js` and
`cnc/dxf.js` mention neither `decorMapping` nor `decorPlacement` nor
`IMAGE_GRAIN_AXIS`, and that assertion is unchanged and still green. Nothing in
this file's numbers comes from F7b.

## Byte-identity contract (CLAUDE.md T37, iron rule 2)

`node scripts/t37-classify.mjs` over all six configs: **`UNNAMED: 0`, exit 0**,
every config `IDENTICAL`. `computeCabinet()`'s output has not moved — including
every `cnc.grain`, `cnc.rotated`, `cnc.drawn_w` and `cnc.drawn_h`, which
`test/turn37-f7-grain-two-readers.test.js` pins field by field.

The sheet fingerprints above are NOT a `computeCabinet()` delta: they are the
DXF the nester writes out of an unchanged engine result, and the classifier does
not read them. Both facts are true at once and that is the design — F7a moves
placement, F7b moves a reader, and the engine stands still between them.

## One divergence found, pinned rather than fixed

`cnc.grain` has two WRITERS and they do not name their frame the same way:
`cabinet.js` passes the shelf's statement through in the DRAWN frame (turn 26
F8), while `engine/grain.js` documents `GRAIN_AXIS_BY_PART` as "the axis each
ROLE's grain runs along, **in the panel's own `w × h` record**" (turn 36 F5).

Wherever the drawn frame equals the panel frame the two coincide. They part
company on one family — a role turn 36 answered that some kit also draws turned
— and that is the drawer BOX board:

| board | drawn frame | states | 3D figure runs along |
| --- | --- | --- | --- |
| a WARDROBE's `DRAWER-SIDE` (440 × 164) | none declared | `h` | 164 — **up the side** |
| a BUDR's `DRAWER-SIDE` (490 × 237) | 237 × 490 (turned) | `h` | 490 — **along its length** |

One role, two ladders, two directions. Both READERS still agree with each other
on both boards — the sheet and the scene report the same millimetres — so this
is a writer's question, not the drift F7 was written to stop. It changes no
exported byte (`sheetTurn` answers 0 on both). It is pinned as a number in
`test/turn37-f7-grain-two-readers.test.js` ("F7 THE DIVERGENCE"), and left for
the owner: iron rule 4 forbids moving either writer without his word.
