# T79 F9 · PROBE: THE END PANEL STAYS A PLAIN RECTANGLE BESIDE A RECESS AND A NOTCH

The owner, 18.10.2026: *"nie wycina mi panelu bocznego do recess a powinno."*

Store-built, UNMODIFIED code (HEAD `9aac3c2`, T79 F1 to F5 integrated), node,
`useProjectStore`: a room 4000 x 3000 x 2500, a recess on wall 0 where named,
a BUD (W 600, H 770, D 558, G 18, front_t 25) at x 900 on wall 0, end panels
added with `addEndPanel` (25 thick, `height` floor: 870, from y -100). Boxes
in the unit's own mm (`z` 0 = the carcass back face, the wall at z -10, the
door face at z 586). `notch` is the board's `cnc.notch`. The recess's back
wall stands at z -10 - depth.

| # | Case | Board | Observed (verbatim) | File:line that decides it |
| - | - | - | - | - |
| 1 | A: recess x 1300..2300 d 300 floor to ceiling, the carcass partly in (band to its right edge), END-R | extension | `{"x0":410,"x1":600,"z0":0,"z1":770,"d":300,"grown":["BUR","TOP","BOTTOM","BACK"]}` | projectStore.js 980-1011 recessExtensionFor |
| 2 | A | BUR | `w 840 h 770, box z -282..558` (grown 300 into the recess) | extension.js 683-737 (the sides that grow) |
| 3 | A | EXT-BACK | `box x 410..600 y 0..770 z -300..-282` (its end at x 600, the face END-R covers) | extension.js 386-396 recessBoxPlaces |
| 4 | A | END-R | `w 596 h 870, box x 600..625 y -100..770 z -10..586, outline 4 pts, notch null`; cut list `01,END-R,596,870,<>^v,2.93,0.519`: it stops at the wall line, 300 short of the recess back (z -310) the side reaches | cabinet.js 7030 `endPanelDepth = wallGap + insetBack + D + gap + frontT`, 7111 `rectGeometry(endPanelDepth, epH)`; extension.js never reads END-PANEL |
| 5 | B: recess x 1300..2300 d 300, bottom 0 top 600 (band z 0..490), END-R | BUR | `w 840, outline 16 pts, notch {"fc":"x0y1","nw":300,"nh":298}` (the bump 0..472) | extension.js 628-634 sideCorners |
| 6 | B | LID | `box x 410..600 y 472..490 z -282..0` (over the bump, its end at x 600) | extension.js 386-396 |
| 7 | B | END-R | `w 596 h 870, box z -10..586, notch null`: no bump, the LID's and the EXT-BACK's ends at x 600 show beside it | cabinet.js 7111 |
| 8 | C: recess x 1300..1510 (it ends INSIDE END-R's 25: carcass 900..1500, END-R 1500..1525) | extension | without END-R `[410,600,0,770,300]`, with END-R `[410,600,0,770,300]`: the same | projectStore.js 1001 `x1 = rx1 >= W ? W : ...` (the band clipped to 0..W, the end panels never read) |
| 9 | D: recess x 1300..2300 (past END-R) | extension | `[410,600,0,770,300]`: the same record as C; nothing tells the engine the band reaches past the end panel | projectStore.js 994-1011 |
| 10 | E: recess x 800..2100 d 300, WHOLLY inside (END-R included), END-R | unit | `D 858 depth_full 558 recess_mm 300` | projectStore.js 3244 settleRecesses |
| 11 | E | BUR / BACK | `BUR w 840 box z 18..858`; `BACK z 0..18` | the kit's own depth law |
| 12 | E | END-R | `w 596 h 870, box z 0..596`; cut list `01,END-R,596,870,...`: back face at z 0, front at 596 against the carcass front 858 and the door face 886: 290 short at the front, and 10 short of the recess back at z -10 | cabinet.js 7028 `wallGap = wallGapOf(...)` = 10 - 300 = -290 (runs.js 70-71), 7030 the sum 596, 7105 `z: wallGap + insetBack > 0 ? ... : 0` |
| 13 | F: no recess (the reference), END-R | END-R | `w 596 h 870, box z -10..586` | cabinet.js 7030 |
| 14 | G: corner notch BL 200/200/0 (full height), END-L | BUL | `w 340, box z 218..558, notch null` (shorter by 200) | notch.js 1640-1652 |
| 15 | G | STEP / RETURN | `STEP box x 0..218 z 200..218` (its end at x 0, the face END-L covers); `RETURN x 200..218 z 18..200` | notch.js 584-610 notchBoxPlaces |
| 16 | G | END-L | `w 596 h 870, box x -25..0 y -100..770 z -10..586`: through the notch's keep-out (z -10..200) over its whole height | cabinet.js 7111; notch.js never reads END-PANEL |
| 17 | H: BL 200/200/300 (from the floor), END-L | BUL | `notch {"fc":"x1y0","nw":200,"nh":300}`; `STEP x 0..218 y 0..300 z 200..218`; `LID x 18..218 y 300..318` | notch.js 1653-1683 |
| 18 | H | END-L | `w 596 h 870, notch null` | cabinet.js 7111 |
| 19 | I: BL 200/200/-300 (F4, from the top), END-L | BUL / END-L | `BUL notch {"fc":"x1y1","nw":200,"nh":300}`; `END-L w 596 h 870, notch null` | as 18 |
| 20 | J: edge notch BB 20/120 (F5), END-L and END-R | BUL / BUR | `BUL notch {"fc":"x1y0","nw":20,"nh":120}`, `BUR notch {"fc":"x0y0","nw":20,"nh":120}`; `BACK y 120..770`; `BOTTOM z 38..558` (the rebate open to z 38) | notch.js 2145-2181 edgeNotchCarcass |
| 21 | J | END-L / END-R | both `w 596 h 870, box z -10..586, notch null`: through the rebate (z -10..38) for 120 + 100 of their height | cabinet.js 7111 |
| 22 | all | 3D | `panelPlacement(END-L) = null`: the scene draws an END panel as its box whatever the record says | joinery.js 67-477 (no END-PANEL case) |

## THE FAULT

The END panel is cut as `rectGeometry(endPanelDepth, epH)` (cabinet.js 7111)
in every case: `extensionCarcass` cuts BUL, BUR, TOP, BOTTOM, BACK and the
SHELVES (and adds the five boards), `notchCarcass` and `edgeNotchCarcass` cut
BUL, BUR, TOP, BOTTOM, BACK, the SHELVES and the PLINTH; none of them reads an
END-PANEL. So beside a recess the side grows 300 into it and the END panel
stays on the wall line (rows 4, 7), the boards that close the bump showing
their ends beside it; beside a notch the side is cut and the END panel runs
through the obstacle (rows 16, 18, 19, 21). `recessExtensionFor` clips the band
to 0..W and never reads `end_panels` (rows 8, 9), so the engine could not tell
an END panel the band reaches from one it does not. Wholly inside a recess the
END panel is 596 deep at z 0..596 against a carcass at z 18..858 (row 12):
`wallGap` is the stand-off off the WALL LINE, 10 - 300 = -290, so the sum
loses the recess depth the carcass gained and the `> 0` guard pins its back
to z 0. The scene has no placement for an END panel (row 22), so no cut would
show in 3D even if the record carried one.

## THE FIX (T79 F9)

One law, one path (KIT_RECESS.lsp D21, KIT_NOTCH.lsp D23, `extension.js`
`endPanelsFollowSides`, called once after the three cutting passes): the END
panel takes its side's cut in its own frame (END-L the frame of BUL, x from
the front; END-R the frame of BUR, x from the back), run on to its own top and
bottom where the side's cut meets the carcass's:

- grown into a recess when its side grows AND the band reaches past its outer
  face (the band tested against -padL..W+padR in recessExtensionFor, the hand
  passed to the engine as `extension.ends`): the same ed, over the band's own
  height (it covers the FLOOR's, the LID's and the EXT-BACK's ends, rows 3, 6);
- notched where its side is notched (the corner notch, F4's notch from the
  top, F5's edge notch): the same corner, its cut face on the face the
  obstacle's keep-out begins at (the STEP's back face at a boxed back corner,
  row 15; flush with the side's cut face where nothing closes it, rows 14, 20);
- wholly inside: `endPanelDepth` measured from the recess's own back wall
  (`wallGap + recess_mm`), so it reaches the recess back with the sides and
  the door face with the doors.

The BOM area and the cut-list line follow the outline; `panelPlacement` gains
the END-PANEL case so the scene cuts the same corners.
