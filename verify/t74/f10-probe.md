# T74 F10 · the probe: hinges on a door the slope cuts

The owner, 23.09.2026: *"ZAWIASY NA SKOSIE: minimum 150 mm od wierzchołka trójkąta skosu (inaczej nie da się
wkręcić śrubokrętem). Przeliczanie zawiasów na skosach inaczej."*

Run by `node scripts/t74-engine-probes.mjs f10`: the default WARDROBE, `computeCabinet` direct, each case a
`slope_cut` from the left to the right. `cups` are the hinge cup centres up the leaf (`meta.cupY`); the apex is the
top of the hinge edge, where the slope's triangle meets it.

| case | leaf | hinge edge | hinge edge top (apex) | cups | top cup to apex | cup spacing |
|---|---|---|---|---|---|---|
| slope over the hinge edge, 1500 -> 900 | 01-F h 1438.93 | L (forced) | 1438.93 | 100, 409.73, 719.47, 1029.2, 1338.93 | 100 | 309.73, 309.73, 309.73, 309.73 |
| a low door, 420 -> 300 | 01-F h 375.91 | L (forced) | 375.91 | 100, 143.98, 187.95, 231.93, 275.91 | 100 | 43.98, 43.98, 43.98, 43.98 |
| slope over the free edge, 2400 -> 1200 | 01-F h 2147 | L (forced) | 2304.56 | 100, 489.4, 878.8, 1268.2, 1657.6, 2047 | 257.56 | 389.4, 389.4, 389.4, 389.4, 389.4 |

## The facts

1. Where the slope cuts the hinge edge, the top cup is placed at the ordinary `hinges.endOffset` (100 mm) under
   the apex: closer than the 150 mm a screwdriver needs in that acute corner.
2. A low sloped door is SQUASHED: its ladder is kept and compressed into the short edge, cups closer than the
   profile's own `minSpacingMm` (60), and nothing refuses it in words.
3. There is no slope or apex number anywhere in the profile (`hinges.*`).

