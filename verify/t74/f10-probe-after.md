# T74 F10 · the probe: hinges on a door the slope cuts

The owner, 23.09.2026: *"ZAWIASY NA SKOSIE: minimum 150 mm od wierzchołka trójkąta skosu (inaczej nie da się
wkręcić śrubokrętem). Przeliczanie zawiasów na skosach inaczej."*

Run by `node scripts/t74-engine-probes.mjs f10`: the default WARDROBE, `computeCabinet` direct, each case a
`slope_cut` from the left to the right. `cups` are the hinge cup centres up the leaf (`meta.cupY`); the apex is the
top of the hinge edge, where the slope's triangle meets it.

| case | leaf | hinge edge | hinge edge top (apex) | cups | top cup to apex | cup spacing |
|---|---|---|---|---|---|---|
| slope over the hinge edge, 1500 -> 900 | 01-F h 1438.93 | L (forced) | 1438.93 | 100, 397.23, 694.47, 991.7, 1288.93 | 150 | 297.23, 297.23, 297.23, 297.23 |
| a low door, 420 -> 300 | 01-F h 375.91 | L (forced) | 375.91 | 100, 162.95, 225.91 | 150 | 62.95, 62.95 |
| slope over the free edge, 2400 -> 1200 | 01-F h 2147 | L (forced) | 2304.56 | 100, 489.4, 878.8, 1268.2, 1657.6, 2047 | 257.56 | 389.4, 389.4, 389.4, 389.4, 389.4 |

## After the fix

The same run after T74 F10. Where the slope cuts the hinge edge, the edge keeps its own ladder (its count is the
door's) with the top hinge brought down to exactly 150 mm below the apex (`hinges.slopeApexMinMm`, the owner's
number, beside `endOffset`) and every row re-spaced with it, the bottom one where it always is. The low door is no
longer squashed: three hinges at 63 mm, the house spacing kept, and it is REFUSED in words by Check #26 (red)
because its ladder asked for five. A slope that does not cut the hinge edge leaves the ladder as it was. A list
drilled by hand is not moved; Check #26 says where it stands inside the 150.

Found and not fixed tonight (pre-existing since T50 F7, and so in the table before as after): the carcass plates
of a plain sloped leaf are still bored at the whole-door ladder (`hingeHolePairs`), not at the leaf's re-run cups;
only split segments publish their own plate rows (`meta.plateY`). Publishing them for a sloped leaf moves the Doors
window's hinge edits onto the split channel, which the slope ladder does not read, so it is its own piece of work.
