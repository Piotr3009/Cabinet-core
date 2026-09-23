# T74 F6 · the probe: how one shoe drawer is built today

The owner, 23.09.2026: *"DRUGA SZUFLADA NA BUTY (niskie i wysokie buty). Regulacja = WYSOKOŚĆ MONTAŻU, nie
wysokość szuflady. Pierwsza szuflada ZAWSZE na dnie (ustalone, bez zmian). Druga przesuwana góra/dół, program
pokazuje odległość między szufladami."*

Run by `node scripts/t74-engine-probes.mjs f6`, through the store the app uses (`addShoeDrawer`, `unitResult`).
A 1000 x 2150 x 568 wardrobe; every y is from the outside of the carcass bottom.

| when | item | pos_mm (mounting height) | front y..top | box side y, h | ramp |
|---|---|---|---|---|---|
| ONE shoe drawer (addShoeDrawer -> id) | 1 shoe | (none) | 21..134 | 31.5, 80 | D1-SHOE-RAMP tilt 15 |
| a SECOND addShoeDrawer -> id | 1 shoe | (none) | 21..134 | 31.5, 80 | D1-SHOE-RAMP tilt 15 |
| a SECOND addShoeDrawer -> id | 2 shoe | (none) | 137..253 | 150.5, 80 | D2-SHOE-RAMP tilt 15 |
| setDrawerMount(second, 450) -> {"pos":450,"min":137,"max":1816,"clamped":false} | 1 shoe | (none) | 21..134 | 31.5, 80 | D1-SHOE-RAMP tilt 15 |
| setDrawerMount(second, 450) -> {"pos":450,"min":137,"max":1816,"clamped":false} | 2 shoe | 450 | 450..566 | 463.5, 80 | D2-SHOE-RAMP tilt 15 |
| a THIRD addShoeDrawer -> null (refused) | 1 shoe | (none) | 21..134 | 31.5, 80 | D1-SHOE-RAMP tilt 15 |
| a THIRD addShoeDrawer -> null (refused) | 2 shoe | 450 | 450..566 | 463.5, 80 | D2-SHOE-RAMP tilt 15 |
| two plain drawers, then a shoe drawer | 1 plain | (none) | 21..218 | 31.5, 164 | (none) |
| two plain drawers, then a shoe drawer | 2 plain | (none) | 221..421 | 234.5, 164 | (none) |
| two plain drawers, then a shoe drawer | 3 shoe | (none) | 424..540 | 437.5, 80 | D3-SHOE-RAMP tilt 15 |

Warnings on the one-shoe wardrobe: SHOE_STACK_UNCAPPED. Stack zone: {"top":545,"count":3,"heights":[200,200,116]}.


## After the fix

1. A SECOND `addShoeDrawer` on a bay whose top drawer is a shoe drawer adds it, stacked tight on the first
   (front 137..253). A THIRD is refused (null), and so is a second over a PLAIN drawer that tops a shoe drawer.
2. The second moves by its MOUNTING HEIGHT (`pos_mm`, the front's underside in the house datum) through ONE
   setter, `setDrawerMount`, with ONE clamp: never below tight on the first (137), never above what the stack
   guard lets a drawer of its height stand (`H - G - zoneHeadroom - h` = 1816). Its own height does not change
   and its menu shows it read-only. The first stays on the bottom and has no mounting height (null).
3. Both drawers are cut with their ramps (`D1-SHOE-RAMP`, `D2-SHOE-RAMP`): the lower one's headroom is the upper
   one's box. A PLAIN drawer over a shoe drawer still refuses the ramp (the kit's law).
4. The drag (`UnitView.startDrawerDrag`) and the clickable distance (`SpacingChain`, row `drawer-gap`: top of the
   first front to the bottom of the second) both write through `setDrawerMount`.
5. A stack that states no `pos_mm` is built by the arithmetic it always was: the six goldens are byte-identical.
