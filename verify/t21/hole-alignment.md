# F1 — the holes are the judge

> **CLAUDE.md F1.4.** "A test per kit family (BUDR, BUDR2, BUDR4, wardrobe with
> drawers, OVEN base) computes, for EVERY drawer, the world-space Y of the
> façade pilots (LISP law: front bottom + 96.5 (+G on drawer 1)) and of the
> box-front pilots (box front bottom + 50) and asserts `|Δ| = 0`."

Gate: `test/turn21-f1-hole-alignment.test.js` — **11 tests, all green.**
Table below: `node scripts/hole-alignment.mjs`.
Both ask `src/engine/drawerPilots.js`; neither carries its own copy of the law.

## The table — every drawer of every kit family

| kit | drawer | runner bottom | screw row (+38) | façade pilot Y | box-front pilot Y | Δ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| BUDR | 1 | 18 | 56 | 114.5 (drilled) | 114.5 (drilled) | **0** |
| BUDR | 2 | 341 | 379 | 437.5 (drilled) | 437.5 (drilled) | **0** |
| BUDR | 3 | 598 | 636 | 694.5 (drilled) | 694.5 (drilled) | **0** |
| BUDR2 | 1 | 18 | 56 | 114.5 (drilled) | 114.5 (drilled) | **0** |
| BUDR2 | 2 | 385 | 423 | 481.5 (drilled) | 481.5 (drilled) | **0** |
| BUDR4 | 1 | 18 | 56 | 114.5 (drilled) | 114.5 (drilled) | **0** |
| BUDR4 | 2 | 193 | 231 | 289.5 (drilled) | 289.5 (drilled) | **0** |
| BUDR4 | 3 | 386 | 424 | 482.5 (drilled) | 482.5 (drilled) | **0** |
| BUDR4 | 4 | 579 | 617 | 675.5 (drilled) | 675.5 (drilled) | **0** |
| WARDROBE | 1 | 18 | 56 | 114.5 (law) | 114.5 (law) | **0** |
| WARDROBE | 2 | 321 | 359 | 417.5 (law) | 417.5 (law) | **0** |
| WARDROBE | 3 | 524 | 562 | 620.5 (law) | 620.5 (law) | **0** |
| OVEN_BASE | 1 | 18 | 56 | 114.5 (drilled) | 114.5 (drilled) | **0** |

`drilled` = the coordinate of the hole the machine will actually cut, read off
the panel's own CNC record. `law` = the LISP's law applied to the panel the
engine placed (see "The wardrobe's missing drillings" below).

## What was wrong

`runnerRows` in `engine/cabinet.js` is the **screw row** — `firstRowFromBottom`
(38 mm), the MOVENTO drilling offset. It is the right anchor for carcass
drilling and the runner hole pattern, and turn 20 used it as the anchor for the
drawer **box** as well. So every box in the app hung 38 mm high, and the two
pilot patterns missed each other by exactly that:

| | turn 20 | turn 21 |
| --- | ---: | ---: |
| BUDR drawer 1 façade pilot | 114.5 | 114.5 |
| BUDR drawer 1 box-front pilot | 152.5 | **114.5** |
| Δ | **38** | **0** |

## The fix, as a chain

`runnerBottomY[i] = (i === 0 ? G : frontY[i])` is now its own named quantity —
KIT_BUDR_FULL L712-714 puts the runner's screw row 38 above it, which is the
whole of the distinction. From the runner's underside:

```
runner bottom  +  13.5   box side's lower edge        baseDrawerUnit.boxAboveRunner
               +  15     the bottom board's groove    baseDrawerUnit.runnerPocketWidth
               +  G      the bottom board itself      board.thickness
               +  50     the box front's own pilot    baseDrawerUnit.boxScrewFromEdge
               ───────
               =  96.5   the façade's own pilot       baseDrawerUnit.frontScrewFromBottom
```

`test/turn21-f1-hole-alignment.test.js` pins that sum as an equation between
profile numbers, so the day a workshop moves one of them the gate says which.

The wardrobe's own pair — 93.5 on drawer 1, 96.5 on the rest
(KIT_WARDROBE_FULL L313-322) — is the same line: its bottom front starts
`firstFrontAdjust` (3 mm) higher, and 93.5 + 3 = 96.5. Both numbers are in
`profile.wardrobe.drawers` now instead of only in the LISP.

## F1.3 — the runner GLB's mounting: the finding

**It was wrong, in exactly the same way, and is fixed.**

`engine/hardware3d.js → runnerInstances()` handed every runner instance
`drillSummary.runner_rows_carcass_y` as its `y`. Both consumers place their
geometry with its own **bottom** at that y:

* the downloaded GLB — `3d/runnerModels.js → runnerModel()` brings the file's
  bounding-box minimum to the group origin, then applies
  `movento.modelOrigin`, and `3d/Hardware.jsx` puts that group at `items[i].y`;
* the grey stand-in — `3d/Hardware.jsx → placeFace` centres a
  `profileHeight`-tall box at `r.y + profileHeight / 2`, i.e. its underside at
  `r.y`.

So the model stood on the **screw centres** and rendered 38 mm high, and the
model's own screw holes sat 38 mm above the holes the machine drills for them.
The instance now carries **both**: `y` is the runner's underside
(`runner_bottoms_carcass_y`) and `rowY` is the drilled screw row, so the +38
screw centres land where the model's holes are. The synchronisation rod, which
ties the two runners together, rides with them.

`test/hardware-3d.test.js` and `test/turn18-phases.test.js` assert both
coordinates per instance; nothing about a downloaded file can still move a hole.

## The wardrobe's missing drillings — recorded, not closed

`KIT_WARDROBE_FULL` drills the wardrobe's internal drawer front
(`drawWDR_DRAWER_FRONT`, `FRONT_HINGES_3MM` at 93.5/96.5) and its box front
(`drawWDR_BOX_FRONT`, `SCREWS_3MM` at 50). **The engine emits both as plain
rectangles.** The gate therefore applies the law to the panels the engine did
place for that kit — the same question of the same geometry, and every Δ is 0.

Adding those holes is a CNC delta, and this turn's rule is zero. BLOCKERS
carries the ask.

## F1.5 — the two zero claims

* **CNC fingerprints:** `verify/t21/fingerprints-diff.txt` — zero across all 12
  unit types × 12 scenarios × 4 presets. Every drilling was already measured
  from its own part's edges; nothing this section moved reaches a hole.
* **Golden fixtures:** zero moves. No fixture declares a panel Y, and the two
  new `drillSummary` keys (`runner_bottoms_carcass_y`, `runner_bottoms_dp_y`)
  are additions — the fixture comparison is key-by-key on what the fixture
  itself declares.
