# T74 F6 · the probe: how one shoe drawer is built today

The owner, 23.09.2026: *"DRUGA SZUFLADA NA BUTY (niskie i wysokie buty). Regulacja = WYSOKOŚĆ MONTAŻU, nie
wysokość szuflady. Pierwsza szuflada ZAWSZE na dnie (ustalone, bez zmian). Druga przesuwana góra/dół, program
pokazuje odległość między szufladami."*

Run by `node scripts/t74-engine-probes.mjs f6`, through the store the app uses (`addShoeDrawer`, `unitResult`).
A 1000 x 2150 x 568 wardrobe; every y is from the outside of the carcass bottom.

| when | item | pos_mm (mounting height) | front y..top | box side y, h | ramp |
|---|---|---|---|---|---|
| ONE shoe drawer (addShoeDrawer -> id) | 1 shoe | (none) | 21..134 | 31.5, 80 | D1-SHOE-RAMP tilt 15 |
| a SECOND addShoeDrawer -> null (refused, no words) | 1 shoe | (none) | 21..134 | 31.5, 80 | D1-SHOE-RAMP tilt 15 |
| two plain drawers, then a shoe drawer | 1 plain | (none) | 21..218 | 31.5, 164 | (none) |
| two plain drawers, then a shoe drawer | 2 plain | (none) | 221..421 | 234.5, 164 | (none) |
| two plain drawers, then a shoe drawer | 3 shoe | (none) | 424..540 | 437.5, 80 | D3-SHOE-RAMP tilt 15 |

Warnings on the one-shoe wardrobe: SHOE_STACK_UNCAPPED. Stack zone: {"top":545,"count":3,"heights":[200,200,116]}.

## The facts

1. A shoe drawer is an ordinary drawer item, `variant: 'shoe'`, with an 80 mm box side (`wardrobe.drawers.shoeSideMm`)
   and a 116 mm front. Its height in the stack is decided by its INDEX: the engine stacks drawers tight from the
   floor (`zoneOffsets`, `cabinet.js` "stack the drawers tight"), so a lone shoe drawer is on the bottom and a shoe
   drawer added over plain drawers sits on top of them. No drawer carries a mounting height today.
2. A SECOND shoe drawer in the same bay is REFUSED by the store, silently: `addShoeDrawer` returns null on
   `stack.some((i) => i.variant === 'shoe')` and says nothing.
3. The shoe drawer's ramp (the sloped bottom, `SHOE-RAMP`) is the kit's: only the TOP drawer of a stack gets one
   (reason `not-top`, the LISP kit's *"tylko na wierzchu innych szuflad"*).
4. No drawer can be dragged, and the clickable spacing chain (`3d/SpacingChain.jsx`) has no drawer branch.

