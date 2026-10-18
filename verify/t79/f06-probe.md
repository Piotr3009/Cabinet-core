# T79 F6 · PROBE: THE DIA 3 ROWS ON THE BACK ARE LOST TO A NOTCH AND A RECESS

The owner, 18.10.2026: *"jak mamy cut the corners lub recess to nie rysujesz
mi dziurek na śrubki 3 mm, to trzeba będzie dodać"*; 14:17: *"ale tylko na
plecach."* The chat probe of 18.10, re-run.

Engine only, UNMODIFIED code (HEAD `14b6fd1`, T79 F1 to F4 in the tree),
node: `computeCabinet(params, DEFAULT_CABINET_PROFILE)` with the goldens' own
params (`fixtures/golden-notch.json`: KIT_BUD_FULL, W 600, D 558, H 770, G 18,
front 25, 1 shelf, hinge L; `golden-notch-top.json`; `golden-recess.json`;
`golden-recess-band.json`); the part-height and the BR cases are
`golden-notch.json`'s params with only `notch` changed. "dia 3 holes" =
`result.drills` with `kind 'screw'` on `SCREWS_3MM`, in the board's own frame
(x from its left end, y up), sorted by x then y. S = G / 2 = 9,
`puzzle.screwFromEnd` = 50.

### parent BUD 600 (golden-notch.json params, no notch)

| board | w x h | dia 3 holes | positions (x, y) in the board's own frame |
| - | - | - | - |
| BACK | 600 x 770 | 14 | (9, 50) (9, 240) (9, 530) (9, 720) (68, 9) (68, 761) (300, 9) (300, 761) (532, 9) (532, 761) (591, 50) (591, 240) (591, 530) (591, 720) |
| BUL | 540 x 770 | 6 | (50, 9) (50, 761) (270, 9) (270, 761) (490, 9) (490, 761) |
| BUR | 540 x 770 | 6 | (50, 9) (50, 761) (270, 9) (270, 761) (490, 9) (490, 761) |

### notch BL 200 / 200 / 0 (full, golden-notch.json)

| board | w x h | dia 3 holes | positions (x, y) in the board's own frame |
| - | - | - | - |
| BACK | 400 x 770 | 10 | (68, 9) (68, 761) (200, 9) (200, 761) (332, 9) (332, 761) (391, 50) (391, 240) (391, 530) (391, 720) |
| BUL | 340 x 770 | 6 | (50, 9) (50, 761) (170, 9) (170, 761) (290, 9) (290, 761) |
| BUR | 540 x 770 | 6 | (50, 9) (50, 761) (270, 9) (270, 761) (490, 9) (490, 761) |

| added board | box x, y (z up), z (from the back), w, h, d | dia 3 holes |
| - | - | - |
| RETURN | x 200 y 0 z 18 w 18 h 770 d 182 | 0 |
| STEP | x 0 y 0 z 200 w 218 h 770 d 18 | 0 |

derived.notch: {"corner":"BL","w":200,"d":200,"h":0,"full":true,"boxed":true,"boards":["RETURN","STEP"],"dropped":0}

### notch BL 200 / 200 / 300 (part height, from the floor)

| board | w x h | dia 3 holes | positions (x, y) in the board's own frame |
| - | - | - | - |
| BACK | 600 x 770 | 13 | (9, 350) (9, 535) (9, 720) (68, 761) (268, 9) (300, 761) (400, 9) (532, 9) (532, 761) (591, 50) (591, 240) (591, 530) (591, 720) |
| BUL | 540 x 770 | 6 | (50, 9) (50, 761) (170, 9) (270, 761) (290, 9) (490, 761) |
| BUR | 540 x 770 | 6 | (50, 9) (50, 761) (270, 9) (270, 761) (490, 9) (490, 761) |

| added board | box x, y (z up), z (from the back), w, h, d | dia 3 holes |
| - | - | - |
| RETURN | x 200 y 0 z 18 w 18 h 300 d 182 | 0 |
| STEP | x 0 y 0 z 200 w 218 h 300 d 18 | 0 |
| LID | x 18 y 300 z 18 w 200 h 18 d 200 | 0 |

derived.notch: {"corner":"BL","w":200,"d":200,"h":300,"full":false,"boxed":true,"boards":["RETURN","STEP","LID"],"dropped":0}

### notch BL 200 / 200 / -300 (F4, from the top, golden-notch-top.json)

| board | w x h | dia 3 holes | positions (x, y) in the board's own frame |
| - | - | - | - |
| BACK | 600 x 770 | 13 | (9, 50) (9, 235) (9, 420) (68, 9) (268, 761) (300, 9) (400, 761) (532, 9) (532, 761) (591, 50) (591, 240) (591, 530) (591, 720) |
| BUL | 540 x 770 | 6 | (50, 9) (50, 761) (170, 761) (270, 9) (290, 761) (490, 9) |
| BUR | 540 x 770 | 6 | (50, 9) (50, 761) (270, 9) (270, 761) (490, 9) (490, 761) |

| added board | box x, y (z up), z (from the back), w, h, d | dia 3 holes |
| - | - | - |
| RETURN | x 200 y 470 z 18 w 18 h 300 d 182 | 0 |
| STEP | x 0 y 470 z 200 w 218 h 300 d 18 | 0 |
| FLOOR | x 18 y 452 z 18 w 200 h 18 d 200 | 0 |

derived.notch: {"corner":"BL","w":200,"d":200,"h":-300,"full":false,"boxed":true,"boards":["RETURN","STEP","FLOOR"],"dropped":0,"anchor":"top"}

### notch BR 200 / 200 / 0 (full, the mirror)

| board | w x h | dia 3 holes | positions (x, y) in the board's own frame |
| - | - | - | - |
| BACK | 400 x 770 | 10 | (9, 50) (9, 240) (9, 530) (9, 720) (68, 9) (68, 761) (200, 9) (200, 761) (332, 9) (332, 761) |
| BUL | 540 x 770 | 6 | (50, 9) (50, 761) (270, 9) (270, 761) (490, 9) (490, 761) |
| BUR | 340 x 770 | 6 | (50, 9) (50, 761) (170, 9) (170, 761) (290, 9) (290, 761) |

| added board | box x, y (z up), z (from the back), w, h, d | dia 3 holes |
| - | - | - |
| RETURN | x 382 y 0 z 18 w 18 h 770 d 182 | 0 |
| STEP | x 382 y 0 z 200 w 218 h 770 d 18 | 0 |

derived.notch: {"corner":"BR","w":200,"d":200,"h":0,"full":true,"boxed":true,"boards":["RETURN","STEP"],"dropped":0}

### recess CASE A, band 310..600 x 0..770 (golden-recess.json)

| board | w x h | dia 3 holes | positions (x, y) in the board's own frame |
| - | - | - | - |
| BACK | 328 x 770 | 10 | (9, 50) (9, 240) (9, 530) (9, 720) (68, 9) (68, 761) (173, 9) (173, 761) (278, 9) (278, 761) |
| BUL | 540 x 770 | 6 | (50, 9) (50, 761) (270, 9) (270, 761) (490, 9) (490, 761) |
| BUR | 690 x 770 | 6 | (50, 9) (50, 761) (345, 9) (345, 761) (640, 9) (640, 761) |

| added board | box x, y (z up), z (from the back), w, h, d | dia 3 holes |
| - | - | - |
| RETURN-L | x 310 y 0 z -132 w 18 h 770 d 132 | 0 |
| EXT-BACK | x 310 y 0 z -150 w 290 h 770 d 18 | 0 |

derived.extension: {"x0":310,"x1":600,"z0":0,"z1":770,"d":150,"window":[328,0,600,770],"grown":["BUR","TOP","BOTTOM","BACK","SHELF-1"],"boards":["RETURN-L","EXT-BACK"],"pieces":1,"for":"a recess in this wall"}

### recess CASE B, window 110..490 x 210..590 (golden-recess-band.json)

| board | w x h | dia 3 holes | positions (x, y) in the board's own frame |
| - | - | - | - |
| BACK | 600 x 770 | 14 | (9, 50) (9, 240) (9, 530) (9, 720) (68, 9) (68, 761) (300, 9) (300, 761) (532, 9) (532, 761) (591, 50) (591, 240) (591, 530) (591, 720) |
| BUL | 540 x 770 | 6 | (50, 9) (50, 761) (270, 9) (270, 761) (490, 9) (490, 761) |
| BUR | 540 x 770 | 6 | (50, 9) (50, 761) (270, 9) (270, 761) (490, 9) (490, 761) |

| added board | box x, y (z up), z (from the back), w, h, d | dia 3 holes |
| - | - | - |
| RETURN-L | x 110 y 228 z -132 w 18 h 344 d 132 | 0 |
| RETURN-R | x 472 y 228 z -132 w 18 h 344 d 132 | 0 |
| FLOOR | x 110 y 210 z -132 w 380 h 18 d 132 | 0 |
| LID | x 110 y 572 z -132 w 380 h 18 d 132 | 0 |
| EXT-BACK | x 110 y 210 z -150 w 380 h 380 d 18 | 0 |

derived.extension: {"x0":110,"x1":490,"z0":210,"z1":590,"d":150,"window":[128,228,472,572],"grown":["BACK","SHELF-1"],"boards":["RETURN-L","RETURN-R","FLOOR","LID","EXT-BACK"],"pieces":1,"for":"a recess in this wall"}

## THE FAULT, EDGE BY EDGE

Every edge of a back (the BACK, the EXT-BACK) that meets a board, and
whether it carries a row today:

| # | Case | Back, edge | The board behind it | Row today | File:line that decides it |
| - | - | - | - | - | - |
| 1 | BL full | BACK, the notched edge (carcass x 200, 0..770) | the RETURN's back end (x 200..218, z 0..770) | NONE (until 17.10: x 209, y 50 240 530 720) | notch.js 541-555 (D10): the nearX column dropped, `void nearX` |
| 2 | BR full | BACK, the notched edge (carcass x 400, 0..770) | the RETURN's back end (x 382..400) | NONE | the same lines |
| 3 | BL 300 | BACK, the notched edge beside the notch (x 200, 0..300) | the RETURN's back end (z 0..300) | NONE (until 17.10: x 209, y 50 150 250) | notch.js 541-555 (D10) |
| 4 | BL 300 | BACK, the edge over the notch (y 300, x 0..200) | the LID's back edge (x 18..218, z 300..318) | NONE (never drawn) | notchBackJoints draws no row along it |
| 5 | BL -300 | BACK, the notched edge beside the notch (x 200, 470..770) | the RETURN's back end (z 470..770) | NONE | notch.js 541-555 (D10, D21 branch) |
| 6 | BL -300 | BACK, the edge under the notch (y 470, x 0..200) | the FLOOR's back edge (x 18..218, z 452..470) | NONE (never drawn) | notchBackJoints draws no row along it |
| 7 | CASE A | BACK, its right edge beside the band (x 328, 0..770) | RETURN-L's front end (x 310..328) | NONE (until 17.10: x 319, y 50 385 720) | extension.js 371-379 (D17) |
| 8 | CASE B | BACK, the window's four edges | RETURN-L, RETURN-R front ends; the FLOOR's and the LID's front edges | NONE (until 17.10: x 119 and 481, y 278 400 522; y 219 and 581, x 178 300 422) | extension.js 371-379 (D17) |
| 9 | CASE A | EXT-BACK, the band's four edges | RETURN-L's back end, BUR's bump end, the BOTTOM's and the TOP's bump back edges | NONE (stated in meta until 17.10, never drilled) | extension.js 433 `recessExtBackScrews` answers [] (D17); the board is `rectGeometry`, readiness 'geometry' (867, 887) |
| 10 | CASE B | EXT-BACK, the band's four edges | RETURN-L, RETURN-R back ends; the FLOOR's and the LID's back edges | NONE | the same |
| 11 | all | BUL, BUR | the TOP, the BOTTOM | 6 / 6, unchanged by the notch and the recess | not this F |

The counts: the BACK has 10 holes instead of 14 with BL or BR full; 13 with
a part-height notch either way (the side's own rows above or under the notch
stay, the run beside it and the edge over or under it carry none); 10 in
CASE A (13 until 17.10); 14 in CASE B, the parent's own (26 until 17.10);
every EXT-BACK 0. The added boxes (RETURN, STEP, LID, FLOOR, RETURN-L,
RETURN-R, FLOOR, LID) carry 0 and the owner wants them to stay so: *"ale
tylko na plecach."*

## THE FIX (T79 F6)

LISP first: KIT_NOTCH.lsp D10 and KIT_RECESS.lsp D17 amended under the
owner's licence of 18.10: the dia 3 rows on a back follow EVERY edge of the
back that meets a board. Rows 1 to 10 above get their row; row 11 and the
box boards do not move. The pitch and end offsets are each kit's own: the
full-height notched edge is the side's row moved (drawBACK's side row,
between the parent's tabs: 50 240 530 720), every other run is THE BACK
SCREW ROW over its length (screwFromEnd from each end and the middle; a run
of 2 x screwFromEnd or less two at the quarters), and a run shorter than one
hole's offset (screwFromEnd) gets none and says so in the summary.
