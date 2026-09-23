# T74 F9 · the probe: the divider under a slope

The owner, 23.09.2026: *"divider przy skosie nie skraca się i nie ma cięcia pod kątem. Ma pokazywać najdłuższą
krawędź plus kąt cięcia."*

Run by `node scripts/t74-engine-probes.mjs f9`: a 1000 wide WARDROBE, a divider at x 491, an end panel on the
right, under a slope that falls from 2400 at the left to 1200 at the right (40 mm infill). `computeCabinet` direct.

| panel | cut w x h | box y..top | meta.slopeCut | the sheet's note | cut list line |
|---|---|---|---|---|---|
| BUL (BUL) | 550 x 2132 | 0..2132 | h 2132, low 2132 | (none) | 01,BUL,550,2132,<,2.13,1.173 |
| BUR (BUR) | 550 x 1131 | 0..1131 | h 1131, low 1109.4 | CUT 50.2° | 01,BUR,550,1131,>,1.13,0.622 |
| VPART-1 (VPART) | 2114 x 550 | 18..2132 | (none) | (none) | 01,VPART-1,2114,550,>,2.11,1.163 |
| END-R (END-PANEL) | 606 x 1300 | -100..1200 | h 1300, low  | CUT 50.2° | 01,END-R,606,1300,<>^v,3.81,0.788 |

The roof boards: TOP-1 y 2132, TOP-2 y 1119.52.

## The facts

1. The SIDES are cut to the slope (T47): the blank is the longest edge, `meta.slopeCut` carries the short face,
   the angles and the 3-D bevel, and every sheet prints `CUT β°` beside the blank (`slopeNoteText`).
2. The END PANEL is cut to the slope (T50 F5): shortened, with its angles.
3. The DIVIDER (`VPART`) is NOT: it stands to `H - G` whatever the slope over it does, runs up through the roof
   board, carries no `meta.slopeCut`, and its cut list line and its sheet say nothing of an angle.

