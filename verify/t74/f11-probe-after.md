# T74 F11 · the probe: pulling away does not undo what pushing in did

The owner, 23.09.2026: *"dosunięcie szafy do ściany narożnej zmienia orientację drzwi i dokłada panel
(perfekcyjnie), ale po odsunięciu nic nie wraca: drzwi nie wracają na oryginalną stronę, panel/divider nie znika.
Brak odwrócenia operacji."*

Run by `node scripts/t74-probes.mjs f11`. A wardrobe from WHERE; the slope on the corner wall through EDIT THE ROOM
(the elevation's SLOPE RIGHT); then a REAL drag of a door leaf into the corner and a real drag back. `hinges` lists
each leaf as `id:hand`, `!` where the slope forced the hand and `@board` for the board it hangs on.

| when | x | doors | bay_doors | hinges | partitions | items | end_panels |
|---|---|---|---|---|---|---|---|
| added, the slope on the corner wall (right) | 40 | true | null | W01-FL:L W01-FR:R | (none) | (none) | R(auto) |
| pushed into the corner (real drag of W01-FL, +700 px) | 2760 | false | [{"door":"one","hinge":"L"},{"door":"one","hinge":"L"}] | W01-B1:L@BUL W01-B2:L!@VPART-1 | 593 | partition | L(auto) |
| pulled away (real drag of W01-B1, -900 px) | 40 | true | null | W01-FL:L W01-FR:R | (none) | (none) | R(auto) |


## After the fix

The same real drags after T74 F11. Pushed in, the rule does what it did (the right door forced left, the door
partition added, the end panel moving with the automat) and now writes it down (`params.slope_door_auto`); pulled
away, the same sweep undoes exactly that: the doors hang left and right again, the partition is gone, the record
with it. A door or a partition a person changed while in the corner is theirs and stays (the store tests say so).
The interior the flip cleared is not brought back (T58 F4: a removal is not a loan). Frames
`f11-probe-in-the-corner-after.png`, `f11-probe-pulled-away-after.png`.
