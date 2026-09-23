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
| pulled away (real drag of W01-B1, -900 px) | 40 | false | [{"door":"one","hinge":"L"},{"door":"one","hinge":"L"}] | W01-B1:L@BUL W01-B2:L@VPART-1 | 593 | partition | R(auto) |

## The verdict, before any fix

THE CORNER RULE is T55 F3's `settleSlopeDoorPartitions` (`stores/projectStore.js`), run by every move through
`refreshAutoParts`: under the slope that comes down to the corner wall, a leaf whose hinge edge the slope cuts has
its hand FORCED (T46 F4), and the sweep adds a door-mount partition (the divider), writes `bay_doors` with the
forced hands and `doors: false`, and clears the interior. It keeps NO record of what it did and has NO reverse
branch, so pulled away the doors stay `L, L` (the right leaf was `R`) and the divider stays. The end-panel automat
on the same move is already reversible (`R(auto)` -> `L(auto)` -> `R(auto)`), because it marks its own work
(`auto_added`), which is the pattern the fix copies.
