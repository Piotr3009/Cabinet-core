# T86B F10 · the two probes, as printed

The owner, 30.10.2026 23:02: *"zrob jak rekomendujesz"*. Printed from `test/turn86b-f10-probes.test.js` (its exported `topProbe` and `silhouetteProbe`, the very functions the cases run). A probe, not a fix: no kit's cut and no item is changed; a FINDING is a `todo` row in the test.

## 1. The TOP mirror across every kit (a bare default `computeCabinet()`)

UNDERSIDE: the TOP is drawn from below (`panelPlacement` u x v points down) and no record of it is cut from the upper face. MIRROR: every hole, pocket, mark and outline vertex of the TOP, placed into the cabinet, lands over the BOTTOM's in plan.

| kit | TOP | BOTTOM | underside | mirror of the BOTTOM |
| - | - | - | - | - |
| WARDROBE | TOP | BOTTOM | PASS | PASS |
| WARDROBE_TOP | TOP | BOTTOM | PASS | PASS |
| WARDROBE_WALL | TOP | BOTTOM | PASS | PASS |
| BLIND_WARDROBE | TOP | BOTTOM | PASS | PASS |
| WARDROBE_CHEST2 | TOP | BOTTOM | PASS | PASS |
| WARDROBE_CHEST3 | TOP | BOTTOM | PASS | PASS |
| WARDROBE_CHEST4 | TOP | BOTTOM | PASS | PASS |
| WARDROBE_DESK | TOP | BOTTOM | PASS | PASS |
| WARDROBE_LOW | TOP | BOTTOM | PASS | PASS |
| CORNER_L_WARDROBE | TOP-L | BOTTOM-L | PASS | PASS |
| BUD | TOP | BOTTOM | PASS | PASS |
| BLIND_BASE | TOP | BOTTOM | PASS | PASS |
| BLIND_WALL | TOP | BOTTOM | PASS | PASS |
| BUDR2 | TOP | BOTTOM | PASS | PASS |
| BUDR | TOP | BOTTOM | PASS | PASS |
| BUDR4 | TOP | BOTTOM | PASS | PASS |
| VANITY2 | TOP | BOTTOM | PASS | PASS |
| VANITY3 | TOP | BOTTOM | PASS | PASS |
| VANITY4 | TOP | BOTTOM | PASS | PASS |
| MIRROR_CABINET | TOP | BOTTOM | PASS | FINDING: on the TOP, not the BOTTOM: mark BISCUIT_4MM @397.5,151.5 397.5,81.5; on the TOP, not the BOTTOM: mark BISCUIT_4MM @952.5,151.5 952.5,81.5 |
| WUD | TOP | BOTTOM | PASS | PASS |
| BUDTALL | TOP | BOTTOM | PASS | PASS |
| CARGO | TOP | BOTTOM | PASS | PASS |
| PANTRY | TOP | BOTTOM | PASS | PASS |
| LOW_CABINET | TOP | BOTTOM | PASS | PASS |
| BIN | TOP | BOTTOM | PASS | PASS |
| WINE | TOP | BOTTOM | PASS | PASS |
| TWIN | TOP | BOTTOM | PASS | PASS |
| CORNER_L_BASE | TOP-L | BOTTOM-L | PASS | PASS |
| CORNER_L_WALL | TOP-L | BOTTOM-L | PASS | PASS |
| WUD_GLASS | TOP | BOTTOM | PASS | PASS |
| WUD_HOOD | TOP | none | PASS | not probed (no BOTTOM) |
| WUD_HOOD_CANOPY | TOP | BOTTOM | PASS | FINDING: on the TOP, not the BOTTOM: outline @582,400; on the TOP, not the BOTTOM: outline @18,400; on the BOTTOM, not the TOP: outline @18,550; on the BOTTOM, not the TOP: outline @582,550 |
| WUD_HOOD_SHORT | TOP | none | PASS | not probed (no BOTTOM) |
| SINK | none | - | not probed (no TOP) | - |
| DW_PANEL | TOP | none | PASS | not probed (no BOTTOM) |
| OVEN_BASE | none | - | not probed (no TOP) | - |
| FRIDGE | TOP | BOTTOM | PASS | PASS |
| FRIDGE_US | TOP | BOTTOM | PASS | PASS |
| APPLIANCE_TALL | TOP | BOTTOM | PASS | PASS |
| APPLIANCE_TALL2 | TOP | BOTTOM | PASS | PASS |
| BUD_INT | TOP | BOTTOM | PASS | PASS |
| BUDR2_HOB | TOP | BOTTOM | PASS | PASS |
| BUDR_HOB | TOP | BOTTOM | PASS | PASS |
| HAWA_POCKET | none | - | not probed (no TOP) | - |
| FREE_PANEL | none | - | not probed (no TOP) | - |

## 2. The hardware silhouettes

`verify/t82/silhouettes-live.json` against `reference/hardware/silhouettes.json`, by id (family and key), each view's bounding box and the model's bounds within `profile.hardware.silhouetteToleranceMm` = 1 mm. The two files are byte-identical tonight (both written by `scripts/t81-silhouettes.mjs`, entries sha256 e06d718f...), so every item with a silhouette passes by construction; the probe stands for the day the live file is regenerated.

| item | article | views | verdict |
| - | - | - | - |
| hinge 71B3550 | 42542984 | front, side, top | PASS |
| hinge 71B3590 | 48445634 | front, side, top | PASS |
| hinge 71B7550 | 45588965 | front, side, top | PASS |
| hinge 71B7590 | 40074274 | front, side, top | PASS |
| hinge 71B9550 | 40331821 | front, side, top | PASS |
| hinge 71B9590 | 46350480 | front, side, top | PASS |
| plate 174E6100.01 | 42378433 | front, side, top | PASS |
| plate 174E6130.01 | 41093467 | front, side, top | PASS |
| runner NL250-S | 44182964 | front, side, top | PASS |
| runner NL250-T | 44139775 | front, side, top | PASS |
| runner NL270-S | 40079932 | front, side, top | PASS |
| runner NL270-T | 42159483 | front, side, top | PASS |
| runner NL300-S | 46137056 | front, side, top | PASS |
| runner NL300-T | 40098135 | front, side, top | PASS |
| runner NL320-S | 40166254 | front, side, top | PASS |
| runner NL320-T | 43377273 | front, side, top | PASS |
| runner NL350-S | 47558526 | front, side, top | PASS |
| runner NL350-T | 40215596 | front, side, top | PASS |
| runner NL380-S | 45134399 | front, side, top | PASS |
| runner NL380-T | 43570166 | front, side, top | PASS |
| runner NL400-S | 45431782 | front, side, top | PASS |
| runner NL400-T | 43049000 | front, side, top | PASS |
| runner NL450-S | 46204387 | front, side, top | PASS |
| runner NL450-T | - | none | not probed (no silhouette: fallback symbol) |
| runner NL500-S | - | none | not probed (no silhouette: fallback symbol) |
| runner NL500-T | - | none | not probed (no silhouette: fallback symbol) |
| runner NL550-S | - | none | not probed (no silhouette: fallback symbol) |
| runner NL550-T | - | none | not probed (no silhouette: fallback symbol) |
| runner NL600-S | - | none | not probed (no silhouette: fallback symbol) |
| runner NL600-T | - | none | not probed (no silhouette: fallback symbol) |
| runner NL650-S | - | none | not probed (no silhouette: fallback symbol) |
| runner NL650-T | - | none | not probed (no silhouette: fallback symbol) |
| runner NL700-S | - | none | not probed (no silhouette: fallback symbol) |
| runner NL700-T | - | none | not probed (no silhouette: fallback symbol) |
| kit blind_pullout | - | none | not probed (no silhouette: fallback symbol) |
| kit carousel | - | none | not probed (no silhouette: fallback symbol) |
| kit placeholder | - | none | not probed (no silhouette: fallback symbol) |
| kit pulldown_rail | 674367/674569 | front, side, top | PASS |
| leg procedural | - | none | not probed (no silhouette: fallback symbol) |
| rail procedural | - | none | not probed (no silhouette: fallback symbol) |
| rod procedural | - | none | not probed (no silhouette: fallback symbol) |
| support procedural | - | none | not probed (no silhouette: fallback symbol) |
| knob procedural | - | none | not probed (no silhouette: fallback symbol) |
| bar procedural | - | none | not probed (no silhouette: fallback symbol) |
| plinth-clip procedural | - | none | not probed (no silhouette: fallback symbol) |

## Reading (G1, for the owner)

- No kit has a TOP cut on its upper face: every TOP (and every Corner L's TOP-L) is drawn from below and carries no 'outside' record. The underside half is clean across all 42 kits that emit a TOP.
- TWO MIRROR FINDINGS, both a difference of BOARDS rather than a cut on the wrong face, left as they are tonight: MIRROR_CABINET's TOP carries two BISCUIT_4MM marks (x 397.5 and 952.5, z 81.5 to 151.5) for its dividers that its BOTTOM does not; WUD_HOOD_CANOPY's TOP is 400 deep (front edge at z 400) where its BOTTOM is 550 (z 550), the canopy's own shape.
- Three kits emit a TOP and no BOTTOM (WUD_HOOD, WUD_HOOD_SHORT, DW_PANEL): the mirror half is skipped for them, named.
- The hardware: 24 items with a silhouette, all PASS within 1 mm (the two files are the same bytes tonight); 21 items carry no silhouette (a fallback symbol or a procedural part) and are skipped, named.
