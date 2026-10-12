# T78 F4 PROBE: the grain of the L boards, before and after

Owner, 11.10.2026: "na L polkach odwroc na CNC i na wizualizacji sloje o 90
stopni". Script: `scripts/t78-f04-probe.mjs` (the same script, run twice).
Asserted in `test/turn78-f04-l-grain.test.js`.

How to read a row. Grain has ONE source (T40): `engine/cnc/layout.js
sheetTurn` decides the turn on the sheet (0: the drawn height up the page;
90: the drawn width up the page), `sheetLay` names which of the piece's own
two sides went up the page (`axis`, w or h), `engine/decors.js grainRun`
hands that to the 3D, `decorMapping` lays it on the big face of the box
(`u` runs along box.w = x = along wall A, `v` along box.d = z = along wall B),
`panelBounds` / `dxf.js sheetEntities` turn the blank on the nest by the same
turn. An L board's `w` is its span along wall A, its `h` the span along
wall B; its drawn frame is its plan frame (no R). A BUD's TOP is drawn turned
(R) and its SHELF states `h` in that turned frame; both run along the
cabinet's width, which on wall A is wall A.

## BEFORE (T75's cabinet.js, HEAD decors.js and materials.js; 11.10.2026)

| case | board | w x h | drawn | cnc.grain | sheetTurn | sheetLay.axis | grainRun | 3D decorMapping | nest turn |
| - | - | - | - | - | - | - | - | - | - |
| CORNER_L_BASE, golden params (900 x 900, arm 558, left) | TOP-L | 864 x 864 | 864 x 864 | none | 0 | h | h (864) | v (along box.d = z = wall B) | 0 |
| CORNER_L_BASE, golden params (900 x 900, arm 558, left) | BOTTOM-L | 864 x 864 | 864 x 864 | none | 0 | h | h (864) | v (along box.d = z = wall B) | 0 |
| CORNER_L_BASE, golden params (900 x 900, arm 558, left) | SHELF-L-1 | 862 x 862 | 862 x 862 | none | 0 | h | h (862) | v (along box.d = z = wall B) | 0 |
| CORNER_L_WALL, golden params (600 x 600, arm 400, left) | TOP-L | 564 x 564 | 564 x 564 | none | 0 | h | h (564) | v (along box.d = z = wall B) | 0 |
| CORNER_L_WALL, golden params (600 x 600, arm 400, left) | BOTTOM-L | 564 x 564 | 564 x 564 | none | 0 | h | h (564) | v (along box.d = z = wall B) | 0 |
| CORNER_L_WALL, golden params (600 x 600, arm 400, left) | SHELF-L-1 | 562 x 562 | 562 x 562 | none | 0 | h | h (562) | v (along box.d = z = wall B) | 0 |
| CORNER_L_WARDROBE, golden params (1000 x 1000, arm 568, left) | TOP-L | 964 x 964 | 964 x 964 | none | 0 | h | h (964) | v (along box.d = z = wall B) | 0 |
| CORNER_L_WARDROBE, golden params (1000 x 1000, arm 568, left) | BOTTOM-L | 964 x 964 | 964 x 964 | none | 0 | h | h (964) | v (along box.d = z = wall B) | 0 |
| CORNER_L_BASE 1000 x 800, right hand | TOP-L | 964 x 764 | 964 x 764 | none | 0 | h | h (764) | v (along box.d = z = wall B) | 0 |
| CORNER_L_BASE 1000 x 800, right hand | BOTTOM-L | 964 x 764 | 964 x 764 | none | 0 | h | h (764) | v (along box.d = z = wall B) | 0 |
| CORNER_L_BASE 1000 x 800, right hand | SHELF-L-1 | 962 x 762 | 962 x 762 | none | 90 | w | w (962) | u (along box.w = x = wall A) | 90 |
| CORNER_L_BASE 800 x 1000, left hand | TOP-L | 764 x 964 | 764 x 964 | none | 0 | h | h (964) | v (along box.d = z = wall B) | 0 |
| CORNER_L_BASE 800 x 1000, left hand | BOTTOM-L | 764 x 964 | 764 x 964 | none | 0 | h | h (964) | v (along box.d = z = wall B) | 0 |
| CORNER_L_BASE 800 x 1000, left hand | SHELF-L-1 | 762 x 962 | 762 x 962 | none | 0 | h | h (962) | v (along box.d = z = wall B) | 0 |
| BUD 600 x 770 x 560 beside the L (the ordinary top and shelf) | TOP | 564 x 542 | 542 x 564 R | none | 0 | w | w (564) | u (along box.w = x = wall A) | 0 |
| BUD 600 x 770 x 560 beside the L (the ordinary top and shelf) | BOTTOM | 564 x 542 | 542 x 564 R | none | 0 | w | w (564) | u (along box.w = x = wall A) | 0 |
| BUD 600 x 770 x 560 beside the L (the ordinary top and shelf) | SHELF-1 | 560 x 522 | 522 x 560 R | h | 0 | w | w (560) | u (along box.w = x = wall A) | 0 |

THE FACT. On the square L of every kit the three L boards lay at turn 0 and
their figure ran along WALL B (axis h, 3D v), at 90 degrees to the BUD top
and shelf standing beside the L on wall A (axis w, 3D u). TOP-L and BOTTOM-L
were the same way as SHELF-L, so all three turn (CLAUDE.md F4's parenthesis).
On a non-square L the SHELF family's size rule (sheetTurn step 3,
`dw > dh ? 90 : 0`) turned the shelf of the 1000 x 800 L and left its top:
the top and the shelf of one carcass crossed, the T17 complaint reborn.

THE LINE. `src/engine/cabinet.js`, the L builder's `lBoard` closure, the
`cnc:` block (`rotated: false, drawn_w: shape.w, drawn_h: shape.h`, no grain
stated); `sheetTurn` steps 2 and 3 answered from nothing. A second line:
`engine/decors.js decorMapping` matched the grain LENGTH against the face's
two sides; every default L board is SQUARE, so the tie fell to `v` whatever
the cut said, and the 3D would not have followed a turned cut on its own.

## AFTER (the F4 fix: `grain: 'w'` on the three L boards; `decorMapping` takes the cut's axis for a square face)

| case | board | w x h | drawn | cnc.grain | sheetTurn | sheetLay.axis | grainRun | 3D decorMapping | nest turn |
| - | - | - | - | - | - | - | - | - | - |
| CORNER_L_BASE, golden params (900 x 900, arm 558, left) | TOP-L | 864 x 864 | 864 x 864 | w | 90 | w | w (864) | u (along box.w = x = wall A) | 90 |
| CORNER_L_BASE, golden params (900 x 900, arm 558, left) | BOTTOM-L | 864 x 864 | 864 x 864 | w | 90 | w | w (864) | u (along box.w = x = wall A) | 90 |
| CORNER_L_BASE, golden params (900 x 900, arm 558, left) | SHELF-L-1 | 862 x 862 | 862 x 862 | w | 90 | w | w (862) | u (along box.w = x = wall A) | 90 |
| CORNER_L_WALL, golden params (600 x 600, arm 400, left) | TOP-L | 564 x 564 | 564 x 564 | w | 90 | w | w (564) | u (along box.w = x = wall A) | 90 |
| CORNER_L_WALL, golden params (600 x 600, arm 400, left) | BOTTOM-L | 564 x 564 | 564 x 564 | w | 90 | w | w (564) | u (along box.w = x = wall A) | 90 |
| CORNER_L_WALL, golden params (600 x 600, arm 400, left) | SHELF-L-1 | 562 x 562 | 562 x 562 | w | 90 | w | w (562) | u (along box.w = x = wall A) | 90 |
| CORNER_L_WARDROBE, golden params (1000 x 1000, arm 568, left) | TOP-L | 964 x 964 | 964 x 964 | w | 90 | w | w (964) | u (along box.w = x = wall A) | 90 |
| CORNER_L_WARDROBE, golden params (1000 x 1000, arm 568, left) | BOTTOM-L | 964 x 964 | 964 x 964 | w | 90 | w | w (964) | u (along box.w = x = wall A) | 90 |
| CORNER_L_BASE 1000 x 800, right hand | TOP-L | 964 x 764 | 964 x 764 | w | 90 | w | w (964) | u (along box.w = x = wall A) | 90 |
| CORNER_L_BASE 1000 x 800, right hand | BOTTOM-L | 964 x 764 | 964 x 764 | w | 90 | w | w (964) | u (along box.w = x = wall A) | 90 |
| CORNER_L_BASE 1000 x 800, right hand | SHELF-L-1 | 962 x 762 | 962 x 762 | w | 90 | w | w (962) | u (along box.w = x = wall A) | 90 |
| CORNER_L_BASE 800 x 1000, left hand | TOP-L | 764 x 964 | 764 x 964 | w | 90 | w | w (764) | u (along box.w = x = wall A) | 90 |
| CORNER_L_BASE 800 x 1000, left hand | BOTTOM-L | 764 x 964 | 764 x 964 | w | 90 | w | w (764) | u (along box.w = x = wall A) | 90 |
| CORNER_L_BASE 800 x 1000, left hand | SHELF-L-1 | 762 x 962 | 762 x 962 | w | 90 | w | w (762) | u (along box.w = x = wall A) | 90 |
| BUD 600 x 770 x 560 beside the L (the ordinary top and shelf) | TOP | 564 x 542 | 542 x 564 R | none | 0 | w | w (564) | u (along box.w = x = wall A) | 0 |
| BUD 600 x 770 x 560 beside the L (the ordinary top and shelf) | BOTTOM | 564 x 542 | 542 x 564 R | none | 0 | w | w (564) | u (along box.w = x = wall A) | 0 |
| BUD 600 x 770 x 560 beside the L (the ordinary top and shelf) | SHELF-1 | 560 x 522 | 522 x 560 R | h | 0 | w | w (560) | u (along box.w = x = wall A) | 0 |

THE CHANGE, read off the rows. `cnc.grain` none -> w; `sheetTurn` 0 -> 90 on
every L board, square or not, either hand (the 1000 x 800 shelf stays 90, now
by the statement and not by size); `sheetLay.axis` h -> w; `grainRun` the
wall-A span; 3D `u` (along wall A), the same answer as the BUD top and shelf
beside the L; nest turn 90. The BUD rows do not move. The CNC frame (drawn
w x h, outline, relief, dog bones, area, box, CSV) does not move; the three
L goldens hold byte for byte (their summary carries no lay).

LISP FIRST: `reference/lisp/KIT_CORNER_L.lsp` section 10, `CL:rot90Pt`
(x y) -> (spanY - y, x), `drawCL_LBOARD_ROT90`; the engine's `turnPoint(x,
y, 90) = (-y, x)` plus the nest's shift is the same map, asserted point for
point in the test.
