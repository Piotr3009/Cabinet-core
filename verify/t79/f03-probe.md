# T79 F3 · PROBE: A DIVIDER OVER A FULL-WIDTH DRAWER STACK RUNS THROUGH THE BOXES

The owner, 18.10.2026: *"wstawianie szuflad w szafie działa super z diverterem
ale muszę wstawić diverter z półką fix, a nie powinno być tak że diverter
powinien się wstawiać sam jak wybieramy ile kolumn szuflad wstawiamy 1 czy
2?"*; 14:17: *"jak ustawiamy sobie teraz 3 szuflady internal to niech pyta
czy chcesz 1 czy 2 kolumny, coś jak baye."* The chat probe of 18.10, re-run.

Engine only, UNMODIFIED code (HEAD `672da20`), node:
`computeCabinet({ ...defaultParamsFor('WARDROBE', P), width: 1200, items },
DEFAULT_CABINET_PROFILE)`: H 2150, W 1200, D 568, G 18, no store-injected
key (so `interior_setback_mm` is the engine's own 0 and the PARTITION is
550 deep). Boxes in cabinet mm, `x a..b` = left face to right face. "passes
through" = a box overlap of more than 1e-6 mm on all three axes with a
drawer box board or a PARTITION board. Joints are `derived.dividerJoints`.

Items per case (`index` 1.. bottom-up, `mount: 'internal'`):
- A: `{kind:'partition', x_mm:591}` + 2 drawers, `zone` null (the chat probe).
- B: the partition + 3 drawers `zone 0` + 3 drawers `zone 1` (two columns).
- C: the partition + 3 drawers `zone 0` + 2 drawers `zone 1` (unequal).
- D: the partition + 3 drawers `zone 0` only (a lone column).

| # | Case | Board | Observed (verbatim) | File:line that decides it |
| - | - | - | - | - |
| 1 | A | PARTITION | `PARTITION x 18..1182 y 426..444 z 18..568`, cut 1164 x 550 | cabinet.js 4788-4796 (full width, at `partitionY` 2525) |
| 2 | A | boxes | `boxes fullwidth: 10 panels, x 71..1129 y 31.5..398.5`: THROUGH the divider at x 591..609 | cabinet.js 795-796: a zone-null drawer is never a column drawer |
| 3 | A | VPART-1 | `VPART-1 x 591..609 y 18..2132 z 18..568 terminatesOn=null`, cut 2114 x 550 | cabinet.js 4884 `partitionFloor = overlay ? overlay.shelfY + G : G` (knows only the overlay stack); zones.js partitionSpan 201-242 (only a FIX shelf item ends it, the PARTITION board is not an item) |
| 4 | A | collision | `VPART-1 passes through: PARTITION D1-BF D1-BB D1-DNO D2-BF D2-BB D2-DNO` | material enters material |
| 5 | A | joints | `VPART-1 foot on BOTTOM length 550 sets 2 screws true`; `head on TOP length 550 sets 2 screws true` | dividerJoints.js 98-140 (the foot finds the BOTTOM under the boxes) |
| 6 | A | warnings | `[]`: no warning | nothing checks it |
| 7 | B | VPART-1 | `VPART-1 x 591..609 y 18..2132 terminatesOn=null`, cut 2114 x 550; passes through nothing | cabinet.js 4884, 4895-4905 |
| 8 | B | caps | `Z1-PART x 18..591 y 629..647`, `Z2-PART x 609..1182 y 629..647`, each cut 573 x 550: two boards, one per bay, the divider between them to the top | cabinet.js 5474-5484 (one `Z{k+1}-PART` per column) |
| 9 | B | boxes | `zone0: 15 panels, x 71..586 y 31.5..601.5`; `zone1: 15 panels, x 614..1129 y 31.5..601.5` | cabinet.js 5244-5340 |
| 10 | B | joints | `foot on BOTTOM length 550 sets 2 screws true`; `head on TOP length 550 sets 2 screws true` | dividerJoints.js |
| 11 | C | caps | `Z1-PART x 18..591 y 629..647`; `Z2-PART x 609..1182 y 426..444`: two boards at two heights | cabinet.js 5474-5484 |
| 12 | C | VPART-1 | `x 591..609 y 18..2132`, passes through nothing; boxes `zone1: 10 panels, x 614..1129 y 31.5..398.5` | cabinet.js 4884 |
| 13 | D | lone column | `VPART-1 y 18..2132`; `Z1-PART x 18..591 y 629..647`; boxes `zone0 x 71..586 y 31.5..601.5`; warnings `[]` | the law to keep for a lone column |

## THE FAULT

Case A is the owner's *"program nie bierze pod uwagę że to jest diverted"*:
the full-width stack is cut across the whole interior (PARTITION 18..1182,
boxes 71..1129) and the divider is cut from the BOTTOM to the TOP straight
through six box boards and the stack's own PARTITION board, with no warning.
`partitionFloor` (cabinet.js 4884) knows the overlay stack (T65 F7) and not
the internal full-width stack; `partitionSpan` can only end on a FIX shelf
item, and the PARTITION board is a panel, not an item.

Cases B and C stand (nothing passes through anything), but they are not the
approved mockup (`verify/t79/mockup-03-drawer-columns.png`, *"2 - tak."*):
the mockup has ONE FIX board over both stacks and the divider from the base
to that board's underside; today there are two boards and the divider runs
to the TOP.

## THE FIX (T79 F3)

- A full-width internal stack under a divider: the divider's floor is the
  top face of the stack's PARTITION board (`partitionY + G` = 444 here); the
  PARTITION stays full width.
- Every bay carrying a column stack (B, C): ONE full-width FIX `PARTITION`
  (x 18, w 1164) at the tallest column's `partY`, the divider from the base
  to its underside (`terminatesOn: 'PARTITION'`); a lone column (D) keeps
  its `Z{k+1}-PART` and its divider as today.
