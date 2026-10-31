# T86B F9 · the left corner L in the scene: the diagnosis

The owner, 30.10.2026, 21:56, over `owner-two-corners.png`: *"zobacz lewa szafa, bul i bur sie nie odwrocily"*; 22:03, on the tall board standing in front of the left unit: *"bok, tutaj nie ma drzwi"*; 22:21: *"moze i zrobil lustro, ale te bul i bur powinny byc przekrecone o 90 stopni, czyli wychodzi na to ze dziala CNC ale nie dziala 3D, tak?"* (yes).

## 1. The engine (the chat's three probes, re-run)

`node verify/t86b/probe-mirror-bare.mjs` (CORNER_L_WARDROBE and CORNER_L_BASE), `probe-mirror-store.mjs`, `probe-mirror-move.mjs`: MIRROR OK in every case (10 / 10 panels, doors, shelves, drawers, 1200 x 1000, born left and moved right, resized). The owner's file through `paramsForEngine`, left hand (unit frame, mm):

| board | x | y | z | w x h x d |
| - | - | - | - | - |
| BACK-A | 0 | 0 | 0 | 1000 x 2150 x 18 |
| BACK-B | 0 | 0 | 18 | 18 x 2150 x 982 |
| SIDE-A (hand R) | 982 | 0 | 18 | 18 x 2150 x 550 |
| SIDE-B (hand L) | 18 | 0 | 982 | 550 x 2150 x 18 |
| TOP-L | 18 | 2132 | 18 | 964 x 18 x 964 |
| BOTTOM-L | 18 | 0 | 18 | 964 x 18 x 964 |
| PLINTH-A | 500 | -100 | 500 | 500 x 100 x 18 |
| PLINTH-B | 500 | -100 | 518 | 18 x 100 x 482 |

The right hand is its exact mirror (SIDE-A x 0, SIDE-B x 432, BACK-B x 982, PLINTH-A x 0, PLINTH-B x 482). `test/turn86b-f09-corner-mirror.test.js` holds this as law 9's engine half for CORNER_L_BASE, CORNER_L_WALL and CORNER_L_WARDROBE, square and 1200 x 1000, doors, 3 shelves, 2 drawers, board for board and mark for mark (every hole, pocket and outline vertex placed into the cabinet by `panelPlacement`, TOP-L and BOTTOM-L included): green.

## 2. The scene, read off the built app

`node verify/t86b/probe-f09-scene.mjs <url> <tag>`: the built app (`vite build`, `vite preview`), the owner's `.ccproject` opened through the start screen's own "Open from file" (a real click, the file handed to the app's own input), every mesh of the unit read back into the unit's frame (`scripts/t74-harness.mjs localBox`). Each case in a fresh browser. A drawn box PASSES when it is the engine's box through the board and covers it along its faces with at most one board (a tab) past either end.

BEFORE the fix (the build of 38869a07):

| case | unit | board | engine x / y / z | drawn x / y / z | verdict |
| - | - | - | - | - | - |
| the owner's file as saved (one left L) | left | all 8 | as above | as above (tabs within 18) | PASS 8 / 8 |
| the same file, corner_side 'right' | right | all 8 | as above | as above | PASS 8 / 8 |
| a right L, then the owner's left L (his room) | right | all 8 | | | PASS 8 / 8 |
| | left | SIDE-A | 982..1000 / 0..2150 / 18..568 | 716..1284 / 0..2150 / 284..302 | FAIL |
| | left | SIDE-B | 18..568 / 0..2150 / 982..1000 | 284..302 / 0..2150 / 698..1266 | FAIL |
| | left | the other 6 | | | PASS |

AFTER the fix: PASS 8 / 8 on every unit of every case (`f09-after-two.png`).

THE FINDING. The left SIDE-B (550 x 2150 x 18 across the arm's end) is drawn 18 x 2150 x 568 ALONG the left wall, standing from z 698 to z 1266, 266 mm in front of the unit: the owner's *"bok, tutaj nie ma drzwi"*. The left SIDE-A (18 x 2150 x 550 along the right end) is drawn 568 x 2150 x 18 ACROSS, from x 716 to 1284, 284 mm out past the unit's right end. Their top edges stand flush with the TOP-L's upper face (y 2150), which is the "joint marks on the TOP-L's upper face" of the chat's reading: two slots in the top that are the misdrawn boards' edges, not a cut on the TOP. The TOP-L itself stands where the engine put it in every case.

THE CAUSE is not a hand and not the engine. Each hand alone is drawn right, in a fresh page. It is the ORDER: `3d/panelSolid.js panelSolids` caches a solid by a key of the board's part, size, thickness, notches and tabs, and the key held nothing of the placement the solid is built in. The L's SIDE-A and SIDE-B are both part 'SIDE', 550 x 2150 x 18, and the left SIDE-B carries exactly the tabs the right SIDE-A does (outline x 550 to 568 at y 70..120, 1050..1100, 2030..2080), the left SIDE-A exactly the right SIDE-B's (x -18 to 0). So the second L in a room took the first L's solids, built in the OTHER board's frame (`engine/joinery.js panelPlacement`: SIDE-B origin [x+w, y, z+d], u -x; SIDE-A as BUL / BUR, u along z). The geometry is centred on the box, so a solid of 550 along z laid on a box 550 along x turns the board a quarter about its centre: x 293 +/- 9, z 982 +/- 284 for the left SIDE-B (284..302 / 698..1266, read above). The owner's room had a right L built first; built the other way round, the right L is the one drawn wrong (the node case "left first then right" in the F9 test, red before).

THE FIX (`src/3d/panelSolid.js`, one line in the key and one exported helper, `placementKey`): the placement (the CNC origin from the box's corner and the three axes) is part of the key, for every board. One law one path, the owner's words beside it. Nothing else in the scene changes: on every kit of `UNIT_TYPE_ORDER` at its defaults, every board alone and every board in its cabinet build the same vertex set in the job as alone, before the fix and after (a probe run in this F: 0 boards differ); the only boards that now get a buffer of their own are boards in mirrored frames (a drawer's left and right sides: one shape, two buffers; `test/turn20-f8-recesses.test.js` F8.3 rewritten to say so, the same side in an identical cabinet still one buffer).

## 3. The F9 test, both runs

`node --test test/turn86b-f09-corner-mirror.test.js`

- RED before the fix (panelSolid.js of 38869a07): pass 16, fail 5, todo 2. Failing: the owner's L right first then left; the owner's L left first then right; CORNER_L_BASE, CORNER_L_WALL, CORNER_L_WARDROBE 1200 x 1000 right built then left. The rows: `left: SIDE-A x drawn 716..1284, engine 982..1000 (through the board)`, `left: SIDE-B z drawn 698..1266, engine 982..1000 (through the board)`, and on the other order `right: SIDE-A x drawn -284..284`, `right: SIDE-B x drawn 698..716`.
- GREEN after: pass 21, fail 0, todo 2.

## 4. A second finding, not fixed tonight (listed as todo rows)

CORNER_L_BASE with drawers: the boards of the drawers on arm B (D1B-SL, D1B-SR, D2B-SL, D2B-SR, D1B-BF, D1B-BB, D2B-BF, D2B-BB, D1B-DNO, D2B-DNO) and the drawer fronts B (CL01-B-F1, CL01-B-F2) take `engine/joinery.js panelPlacement`'s generic drawer frames, which are not turned onto arm B: the drawing's rectangle lies along the wrong pair of the box's axes, in BOTH hands (it is not a mirror fault). In the room the four arm-B drawer SIDES are drawn turned off their boxes (left D1B-SL z 487..977 against the engine's 959..977; right D1B-SL z 109..599 against 581..599), the boxes and fronts are drawn as their boxes. The fix is a quarter turn of the arm-B frames in `panelPlacement`, which the engine itself reads (handles, hardware, drawings): an engine delta with goldens to classify, so it is the owner's to order, not this F's. The mark-for-mark rows of the engine half skip exactly these boards (named in the todo row).

## 5. The frames (the owner's camera: from the front of the room, high, both corners of wall A)

- `f09-before-left.png`: the owner's file alone (left L): drawn right.
- `f09-before-right.png`: the same with corner_side 'right': drawn right.
- `f09-before-two.png`: the owner's room, a right L then his left one: the left SIDE-B standing along the wall in front of the unit and SIDE-A across its right end, as in `owner-two-corners.png`.
- `f09-after-two.png`: the same room after the fix: the left L the mirror of the right.
