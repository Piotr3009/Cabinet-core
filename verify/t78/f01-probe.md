# T78 F1 · PROBE: NOTHING CAN BE ADDED LEFT OF AN L (the owner's blocker)

The owner, 11.10.2026: *"dodawanie szafek po lewej stronie l shape szafki
prosze, teraz nie mozna dodac zadnych szafek."*

PRO, a new project (the harness's `pro()`), the default room (4 walls:
wall 1 4000 from (0,0); wall 2 3000 from (4000,0); wall 3 4000 from
(4000,3000); wall 4 3000 from (0,3000); height 2500), the profile as served
(room.wallBackClearance 10; ui.addPlusMinGapMm 100; editor.minUnitGap 0;
corner.postMm 50; cornerBase.defaults 900 x 770 x 900). The L from the
library's real row (Library, Kitchen, Base units, Corner L) lands in the
corner of wall 1 at its start, so "left of the L" is wall 4, the wall B of
this table. The build under the mouse is HEAD `16477df` (the frames' stamp:
`#900 · 2026-10-11 21:28 UTC · 16477df`); the node-side engine readings are
from the same commit (`git archive HEAD src/engine`), because the working
tree already carries an uncommitted F1 fix the bundle does not. Every
File:line is HEAD's. Rows 1 to 9 are the real mouse (one browser); rows 10
to 17 are `addUnit` through the store API as a reading (a second browser,
so the mouse page stays pure). Script: `scripts/t78-f01-probe.mjs`; frames
`verify/t78/f01-probe-01..07-*.png`; the rows as printed:
`verify/t78/f01-probe.rows.md`.

| # | Gesture or call | Expected | Observed | File:line that decides it |
| - | - | - | - | - |
| 1 | Library, Kitchen, Base units, Corner L (the real row) | a CORNER_L_BASE in a room corner | CORNER_L_BASE CL01 on wall 1 at x 10, width 900 (arm A), depth 900 (arm B), arm 558, corner_side left; wall B is wall 4 (3000 long); arm A ends at x 910 on wall 1; arm B ends 910 from the corner, u 2090 in wall 4's frame | projectStore.js addUnit 4842-4854 cornerLSlots 10217 (first free internal corner of wall 1: x = wallClearance, side left) |
| 2 | the plus points with the L alone (engine addPlusPoints, and the sprites the scene draws) | a plus on wall 4 at arm B's end (u 2090) and one on wall 1 at arm A's end (x 910) | engine (HEAD 16477df): 1 point(s): wall 1 right x 910 gap 3090; scene: 1 run plus(es): wall 1 u 955 v 450 "Add a unit to the right of CL01"; plus the inside disc of the selected unit ("Add something inside this unit", not a place for a cabinet); run pluses on wall 4: 0 | runs.js addPlusPoints 790-816 (one plus per END of a RUN, runs built per wall from units on that wall: buildRuns 236; no unit on wall B, no run, no plus); the L's left end gap = wall clearance < addPlusMinGapMm, 801 |
| 3 | gesture 1, wall 4: click the plus beside the L's arm B end | the library opens to insert on wall B at arm B's end | NO PLUS on wall 4: nothing to click (the only run plus is wall 1 u 955) | Scene.jsx AddPluses 1002-1035 draws addPlusPoints only; runs.js 793-813 |
| 4 | gesture 1, wall 1: click the plus at arm A's end (pixel 520,546), then Standard (door-base) | a BUD lands on wall 1 at x 910, flush with arm A | insert {"near":"u_e7kh1zq","side":"right"}; row pressed true; BUD 01 on wall 1 at x 910..1510 (flush: true); said [] | Scene.jsx 2148-2154 onPick -> uiStore openLibraryToInsert 222 { near, side }; LibraryPanel.jsx handleAdd 128-134 -> addUnit { near, side }; freeSlotOnWall collision.js 822-873 |
| 5 | gesture 2: the L selected by a real click (selected, by TOP-L at 414,474), Library, Kitchen, Base units, Standard | the client means wall 4; a way to say so, or the unit beside the L on wall B at u 1490..2090 | row true; BUD 02 on wall 1 at x 1510..2110; the library has no wall control (LibraryPanel reads only libraryInsert.near/side/wall); said [] | LibraryPanel.jsx handleAdd 128-134: near = insertAt?.near ?? selectedUnitId, wall only from an island face's plus; addUnit 4830-4840 ordered = [besideWall, ...]; freeSlotOnWall near/side 846-871 (ties go right) |
| 6 | gesture 2b: the new Standard's Wall select set to wall 4 (a real click, the arrows, Enter) | it lands on wall 4 beside the L: x 1490..2090 (the first free slot from the corner) | option "Wall 4 · 3000 mm" chosen; BUD 02 on wall 4 at x 40..640; distance from the L's arm B end 1450; said [] | projectStore.js setUnitWall 6554-6582: freeSlotOnWall with no `near` -> collision.js 876-885: the right-hand end is taken by the L, so the FIRST gap from the wall's start wins (x = wallMargin, the far corner) |
| 7 | gesture 2c: a real drag of 02 along wall 4 toward the corner (+4000 mm asked) | it stops flush with arm B's end: right edge at u 2090, no corner post | grabbed by TOP; x 40 -> 1490; right edge 2090 vs arm B end 2090 (flush: true); posts L null R null; infill R 0; rulebook: [{"wallA":0,"wallB":3,"solution":"L","stopMm":null,"runA":"u_e7kh1zq","runB":"u_2y0se7w","gapB":910}]; obstacles on wall 4 for a 558 deep unit: [{"left":2090,"right":2990,"corner":true,"stopPad":0}]; said [] | moveUnit 6276-6330 -> wallObstacles collision.js 497-541 (the L's footprint in wall B's frame, corner: true, stopPad 0: cornerStopMm null for a corner kit, corners.js 97-101) -> clampUnitX 674-735 |
| 8 | the plus points with a run on wall 4 standing on arm B's end | no plus between 02 and the L (the L occupies u 2090..2990); a plus on 02's far side | engine (HEAD 16477df): wall 1 right of u_vdwfyp8 x 1510 gap 2490; wall 4 left of 02 x 1490 gap 1490; wall 4 right of 02 x 2090 gap 910; scene: 3 run plus(es): wall 1 u 1555 v 279 "Add a unit to the right of 01"; wall 4 u 1445 v 279 "Add a unit to the left of 02"; wall 4 u 2135 v 279 "Add a unit to the right of 02"; plus the inside disc of the selected unit ("Add something inside this unit", not a place for a cabinet); a plus INSIDE the L's footprint: yes, at u 2090, gap 910 (the L is not in its others) | runs.js addPlusPoints 797-800: others = units on the SAME wall only; runEndGap 702-760 measures to the wall's end |
| 9 | click that plus (pixel 369,570, "Add a unit to the right of 02"), then Standard | no such plus; or, if offered, a unit that lands | insert {"near":"u_2y0se7w","side":"right"}; row pressed true; NOTHING ADDED; said ["yellow: There is no room for 600 mm to the right of 02 - move something, or add it on the other side."] | addUnit 4866-4893: cornerSpansFor puts the L in `others`, freeSlotOnWall finds no slot on that side -> the refusal at 4897-4899 |
| 10 | addUnit('BUD', { wall: 3, x: 2100 }) (inside the L's corner square) | refused in words | REFUSED: "There is no room for 600 mm at 2100 mm on wall 4: move or remove something there first." | addUnit 4869-4871 slotTakes with cornerSpansFor 10198-10207; the refusal 4895-4896 |
| 11 | addUnit('BUD', { wall: 3, x: 1491 }) (1 mm into arm B) | refused in words | REFUSED: "There is no room for 600 mm at 1491 mm on wall 4: move or remove something there first." | collision.js slotTakes 899-911 (half a millimetre of slack) |
| 12 | addUnit('BUD', { wall: 3, x: 1490 }) (just past arm B's end) | lands at x 1490, right edge flush with arm B at u 2090 | LANDED: 01 on wall 4 at x 1490..2090; posts L null R null; infills L 0 R 0; clearance rows [] | addUnit 4869-4871 slotTakes; refreshAutoParts 2176-2260 (others = same wall only: no infill against the L, no post: cornersOf says L) |
| 13 | addUnit('BUD', { wall: 3 }) (no x: the store's own first free slot) | beside what stands there: x 890..1490 | LANDED: 02 on wall 4 at x 40..640 | freeSlotOnWall collision.js 876-885: right-hand end taken, so the first gap from the wall's START (the far corner) wins |
| 14 | addUnit('BUD', { near: "CL01", side: 'left' }) (the owner's sentence, as the plus would send it) | a unit on wall 4 at arm B's end | REFUSED: "There is no room for 600 mm to the right of CL01 - move something, or add it on the other side." | addUnit 4830-4840: a SIDE pins the search to the L's own wall (ordered = [besideWall]); freeSlotOnWall 846-871 finds nothing left of x 10; the refusal 4897-4899 |
| 15 | addUnit('BUD', { wall: 0, x: 910 }) (just past arm A's end) | lands at x 910, flush with arm A | LANDED: 03 on wall 1 at x 910..1510 | addUnit 4869-4871 slotTakes (same wall: unitSpan of the L) |
| 16 | addUnit('BUD', { wall: 0 }) (no x) | beside the run: x 1510 | LANDED: 04 on wall 1 at x 1510..2110 | freeSlotOnWall 876-878: rightMost + clearance |
| 17 | addUnit('BUD', { near: "CL01", side: 'right' }) | the nearest free slot right of the L on wall 1: x 2110 | LANDED: 05 on wall 1 at x 2110..2710 | freeSlotOnWall 846-871 |

The frames: `f01-probe-01-the-l.png` (the L alone), `02-plus-points.png`
(the one run plus, at arm A's end; the gold disc on the L's face is its
"add inside" plus, UnitView.jsx 3398, not a place for a cabinet),
`03-plus-a-added.png` (the Standard flush with arm A), `04-wall-select.png`
(the Standard dropped at the far corner of wall 4), `05-dragged-to-arm-b.png`
(the drag stopped flush with arm B), `06-wrong-plus.png` (the library open
"Adding to the right of 02", the plus standing inside the L's square, the
yellow refusal on screen), `07-api-landings.png` (the API page's units).

## THE FAULT

The L is placed on ONE wall (`position.wall` 0, wall 1) and its footprint is
what reaches onto wall 4: `collision.js wallObstacles` 497-541 brings the
L's rectangle into wall 4's frame (span u 2090..2990, `corner: true`,
`stopPad` 0 because `corners.js cornerStopMm` 97-101 returns null for a
corner kit), so the CLAMP and the PLACEMENT already stop at arm B's end: the
drag lands flush at 2090 (row 7), `slotTakes` lands 1490 and refuses 1491
and 2100 (rows 10 to 12), the rulebook answers `solution: 'L'`, no post, no
infill (rows 7, 12). What refuses the client is the GESTURE layer, in four
places. (1) No plus on wall 4 (rows 2, 3): `runs.js addPlusPoints` 790-816
offers a plus per END of a RUN and `buildRuns` 236 builds runs per wall from
the units ON that wall (`levelGroups`, keyed wall|mount), so an empty wall 4
has no run and no plus, and the L's own left end has a 10 mm gap (its wall
clearance) under `addPlusMinGapMm` 100, line 801, so the L carries ONE plus,
at arm A's end; the owner has nothing to click on the left. (2) The library
insert goes to wall 1 (row 5): `LibraryPanel.jsx handleAdd` 130-134 hands
`addUnit` `near: selectedUnitId` and no wall (a wall only from an island
face's plus), and `addUnit` 4834-4840 tries the L's own wall first, where
the right side is free; with a SIDE (the plus's word 'left'), 4836 pins the
search to the L's own wall, `freeSlotOnWall` 846-871 finds nothing left of
x 10, and the refusal at 4900 says "to the RIGHT of CL01" (row 14), because
it tests `side === 'L'` while the plus and the panel hand `'left'`
(`isLeftSide` exists at 155 and is not used there). (3) The Wall select
drops the unit at the far corner (rows 6, 13): `setUnitWall` 6552-6582 calls
`freeSlotOnWall` with no `near`, and once the right-hand end is taken by the
L's span, `collision.js` 876-885 takes the first gap from the wall's START:
x 40 (the infill margin), 1450 mm from the L. (4) With a run on wall 4
standing on the arm, `addPlusPoints` 797-800 passes only SAME-WALL units to
`runEndGap` 702-760, which measures to the wall's end (a "gap" of 910 that
is the L itself) and draws a plus INSIDE the L's footprint whose click is
refused by the very `cornerSpansFor` 10198 the placement reads (rows 8, 9;
frame 06). T75 F4's "the L is its own stop" holds for the drag and the
placement; the plus points, the library road and the Wall select never
learned the L stands on two walls.

## THE FIX

The L's arm B as the adjacent wall sees it is ONE arithmetic (for a
left-hand L: `left = lenB - gap - D`, `right = lenB - gap`, free side left;
mirrored for a right-hand L), the same numbers `wallObstacles` already
derives from `unitFootprint`, and it goes to four readers. `engine/runs.js
addPlusPoints` 790-816: a plus on wall B at arm B's end for every L in a
corner (unitId the L's, wall B, side the arm's free side, x the arm end, the
gap measured to the next same-level unit on wall B with the same 100 mm
threshold), and that span in `others` of every run on wall B so no plus is
offered inside the L. `3d/Scene.jsx AddPluses` 1002-1035: the plus stands
in front of the ARM (depth = the arm, not half the L's 900) and its key
carries the wall. `projectStore.js addUnit` 4834-4840 and 4891: a `near` L
asked on its corner side means the ADJACENT wall: `ordered = [wall B]`,
`near` = the arm span, `side` = the arm's free side, so the plus and the
library land flush at 1490..2090. `projectStore.js setUnitWall` 6552-6582: on
the wall an L's arm reaches, the same span as `near`, so the Wall select
lands beside the arm, not at the far corner. The working tree ALREADY
carries the first three, uncommitted, by the central-file writer (`runs.js
cornerLAdjacentSpan` + the wall-B plus + the stand-in span, `addUnit`'s
`cornerAim`, the Scene depth and key; `test/turn78-f01-add-left-of-l.test.js`);
they are not in the served bundle (no `armMm` in `dist/assets`), which is
why this table measured HEAD. The fourth is the patch
`scratchpad/patches/f01-wall-select-beside-l.patch` (note beside it),
written against the working tree with those edits in place (`git apply
--check` passes; checked in node on a scratch copy: Wall select to wall 4
lands x 1490, right edge 2090; a second one 890; a WUD stays centred at
1200). The fifth is one token for the one writer of `projectStore.js`: the
refusal at 4900 (4922 in the working tree) reads `isLeftSide(side)` instead
of `side === 'L'`, and that line's long dash goes with it (not in the
patch: the owner's law forbids writing one). Not touched, because the probe
shows them right: `collision.js` clampUnitX and wallObstacles,
`corners.js`, `cornerSpansFor`, `refreshAutoParts`.
