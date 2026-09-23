# T74 F9 · the probe: the divider under a slope

The owner, 23.09.2026: *"divider przy skosie nie skraca się i nie ma cięcia pod kątem. Ma pokazywać najdłuższą
krawędź plus kąt cięcia."*

Run by `node scripts/t74-engine-probes.mjs f9`: a 1000 wide WARDROBE, a divider at x 491, an end panel on the
right, under a slope that falls from 2400 at the left to 1200 at the right (40 mm infill). `computeCabinet` direct.

| panel | cut w x h | box y..top | meta.slopeCut | the sheet's note | cut list line |
|---|---|---|---|---|---|
| BUL (BUL) | 550 x 2132 | 0..2132 | h 2132, low 2132 | (none) | 01,BUL,550,2132,<,2.13,1.173 |
| BUR (BUR) | 550 x 1131 | 0..1131 | h 1131, low 1109.4 | CUT 50.2° | 01,BUR,550,1131,>,1.13,0.622 |
| VPART-1 (VPART) | 1702.2 x 550 | 18..1720.2 | h 1702.2, low 1680.6 | CUT 50.2° | 01,VPART-1,1702,550,>,1.70,0.936 |
| END-R (END-PANEL) | 606 x 1300 | -100..1200 | h 1300, low  | CUT 50.2° | 01,END-R,606,1300,<>^v,3.81,0.788 |

The roof boards: TOP-1 y 2132, TOP-2 y 1119.52.

## After the fix

The same run after T74 F9. The divider takes the side's treatment: it stops under the roof board over its own
18 mm (1702.2, from 18 to 1720.2, the blank, its longest edge, which is its cut size and its cut list line),
carries the short face (1680.6), the angles and the wedge (`bevel3d`), and every sheet prints `CUT 50.2°` beside
it as it does beside the side and the end panel. Under a flat stretch, and on every cabinet with no slope, it is
exactly what it was.
