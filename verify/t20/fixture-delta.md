# F1 — the golden fixtures, and what moved in them

> **CLAUDE.md F1.** "Golden fixtures: the box parts' Y positions in engine output
> WILL move by ~-20 mm on drawer cabinets — regenerate ONLY those fields, list
> every changed fixture with the old→new Y in `verify/t20/fixture-delta.md`, and
> justify each line with this formula. Any fixture field beyond drawer-box Y
> that moves = the turn is wrong."

## Nothing in `fixtures/` was regenerated, because nothing in it moved

The four fixtures that carry a drawer cabinet — `golden-budr.json`,
`golden-budr2.json`, `golden-budr4.json`, `golden-wardrobe.json` — record cut
SIZES, edging, areas, drilling summaries, hardware counts and totals. **Not one
of them records a panel's Y position in the cabinet.** Checked mechanically:

```
$ grep -c '"box_y"\|"y":' fixtures/golden-budr*.json fixtures/golden-wardrobe.json
0
```

So the answer to "which fixture fields were regenerated" is **none**, and the
rule "any fixture field beyond drawer-box Y that moves = the turn is wrong" is
satisfied in the strongest possible way: the whole `fixtures/` directory is
byte-for-byte what it was, and `npm test` reads it unchanged.

## What DID move, and by how much

The panel Ys in engine output — `result.panels[].box.y` for the drawer box —
which the fixtures do not carry but the tests now do
(`test/turn20-f1-box-vs-runner.test.js`) and the walk measures live
(`verify/t20/walk.json`, step "F1 every drawer box rides its runner").

The law, one formula for every drawer including the bottom one:

```
side.box.y   = runner_rows_carcass_y[i] + boxAboveRunner     (13.5)
bottom.box.y = runner_rows_carcass_y[i] + bottomAboveRunner  (28.5 = 13.5 + the 15 mm groove)
box front / back .box.y = bottom.box.y + G                    (they stand ON the bottom — turn 18 F3.4)
```

### BUDR, 600 × 770 × 558 — the default three-drawer base

| drawer | runner row | part | before | after | Δ |
| --- | --- | --- | --- | --- | --- |
| 1 | 56 | `D1-SL` / `D1-SR` (side) | 56 | **69.5** | +13.5 |
| 1 | 56 | `D1-DNO` (bottom) | 71 | **84.5** | +13.5 |
| 1 | 56 | `D1-BF` / `D1-BB` | 89 | **102.5** | +13.5 |
| 2 | 379 | `D2-*` side / bottom / front / back | 379 / 394 / 412 | **392.5 / 407.5 / 425.5** | +13.5 |
| 3 | 636 | `D3-*` side / bottom / front / back | 636 / 651 / 669 | **649.5 / 664.5 / 682.5** | +13.5 |

BUDR2 and BUDR4 are the same kit with a different ratio and move by the same
+13.5 on every part of every drawer.

### WARDROBE with internal drawers, 600 × 2150 × 578, heights 250 / 150

| drawer | runner row | part | before | after | Δ |
| --- | --- | --- | --- | --- | --- |
| 1 | 56 | `D1-SL` / `D1-SR` | 47 | **69.5** | +22.5 |
| 1 | 56 | `D1-DNO` | 62 | **84.5** | +22.5 |
| 1 | 56 | `D1-BF` / `D1-BB` | 80 | **102.5** | +22.5 |
| 2 | 309 | `D2-*` | 300 / 315 / 333 | **322.5 / 337.5 / 355.5** | +22.5 |

The wardrobe moves further because it was the kit that disagreed the most: turn
18 hung its box `wardrobe.drawers.boxDropFromRunner` = 9 mm **below** the row
while the BUDR's sat exactly **on** it. Two laws for one Blum runner; there is
one now, and `boxDropFromRunner` is deleted rather than left behind saying
something untrue.

### The direction, and the "~-20 mm" F1 predicts

F1 expects **−20 mm**; the measured moves are **+13.5** (BUDR family) and
**+22.5** (wardrobe). The magnitude is the one predicted; the sign is not, and
it is worth being plain about why rather than quietly shipping either number:

* the formula F1 states — *"derive it from the runner row:
  `boxSideBottomY = runnerBottomY + 13.5`"* — equates `runnerBottomY` with the
  engine's runner ROW, which is also where `3d/Hardware.jsx` has stood the
  bottom of the runner since turn 7;
* against that row, a BUDR box sat at **+0** and a wardrobe's at **−9**, so
  reaching +13.5 is upward from both.

A −20 result would need `runnerBottomY` to be ~33.5 mm below the drilled row,
which nothing in the engine, the profile or the LISP says it is. The formula is
implemented exactly as written and the arithmetic is pinned per kit family, per
drawer index, bottom drawer included.

## The one consequence, named rather than absorbed

An **appliance base**'s drawer-box side is clamped by turn 18 to the headroom
above the RUNNER ROW, and the box now starts 13.5 mm above that row — so its top
stands that far past the shelf the oven sits on. The board is **not** re-cut:
F1.2 keeps turn 18's side heights and the turn allows exactly one CNC delta
(F4's label height). The engine warns instead —
`APPLIANCE_DRAWER_BOX_OVER_SHELF`, with the millimetres in it — and the decision
to re-cut is the owner's, because it is a cutting-list decision.
BLOCKERS #85 carries it.

## CNC: ZERO, and it was checked with F4 held back

Every pocket, groove and drilling on a box part is measured from that part's OWN
edges, so none of them follows the box. Verified by running
`scripts/cnc-fingerprint.mjs` with F1 in and F4 out: **byte-identical to the
turn-19 baseline**, all 1 900-odd lines. The same check with F1 and F2 in and F4
still out: identical again. Only F4 moves a byte this turn
(`verify/t20/cnc-export-identity.md`).
