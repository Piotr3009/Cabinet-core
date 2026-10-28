# T84 F1 . THE SKIN, FRAMED: the Studio beside the designer's Stage-1 at 1280 x 800, 1440 x 900 and 1920 x 1080

Written by `scripts/t84-skin-frames.mjs` 2026-10-28 02:12 UTC (CLAUDE.md T84 PART A, F1: "the report names every deviation in px").

- OURS: the built app at http://127.0.0.1:4191/ (build stamp `#1134 . 2026-10-28 01:14 UTC . 07ac04c6`), the repo at HEAD `e6301f1c` (studio.css last changed in `07ac04c6 T84 F6: the scene's edge`); the PRO editor on the Studio face as the profile ships it (`ui.studio.enabled` true, no switch). The stage: the T81 kitchen, the 21 calls `scripts/t81-kitchen.mjs` `t81Kitchen()` makes, recorded in node and replayed through the page's own store: 01 BUD 600, 02 BUD 800, DR01 BUDR2 500, WU01 WUD 600 on wall A. The gesture: the BUD 800 (unit 02) selected by a real click on one of its pieces; then Full settings, Pin and the embedded panel's Carcass head, each a real click at its centre.
- HERS: `verify/t84/astra/Cabinet-Core-PRO-Studio-Stage-1.html` (file://) in the same Chromium at the same viewport, her own fixtures `?type=base` and `?type=base&inspector=full&pin=1`.
- TYPE: both pages ask for `system-ui` (hers in her style sheet, ours through tailwind.config.js `fontFamily.sans`); in this container it is Inter (`fc-match system-ui`), so a word is the same width on both sides.
- Every number is CSS px off getBoundingClientRect, to 0.1; `d` is ours less hers; `=` means within 0.5 px on x, y, w and h; a type row is `=` when every property shown is the same.
- A difference carries its reason (`DIFF: ...`, the deviations at the end, `D1` ... `Dn`); one with no reason would read UNEXPLAINED. THE NUMBERS win wherever Stage-1 differs from them.

## THE NUMBERS, read off the running page (`profile.ui.studio`)

| Number | Value |
| - | - |
| scale | text 13, field 30, button 32, radius 4 |
| bars | top 48, context 34, status 30 |
| rail | 112 with labels from 1440, 56 icons only below |
| inspector | quick 344 (316 below 1440), full 400 (360 below 1500) |
| issues | warn #d9a441, danger #c9524b, text 13 |
| at 1280 x 800 (studioWidths) | rail 56 icons only, quick 316, full 360 |
| at 1440 x 900 (studioWidths) | rail 112 with labels, quick 344, full 360 |
| at 1920 x 1080 (studioWidths) | rail 112 with labels, quick 344, full 400 |

## The frames

| Size | Ours, the quick card | Hers, `?type=base` | Ours, full and pinned | Hers, `?type=base&inspector=full&pin=1` |
| - | - | - | - | - |
| 1280 x 800 | `f01-skin-1280.png` | `f01-astra-1280.png` | `f01-skin-1280-full.png` | `f01-astra-1280-full.png` |
| 1440 x 900 | `f01-skin-1440.png` | `f01-astra-1440.png` | `f01-skin-1440-full.png` | `f01-astra-1440-full.png` |
| 1920 x 1080 | `f01-skin-1920.png` | `f01-astra-1920.png` | `f01-skin-1920-full.png` | `f01-astra-1920-full.png` |

## The checks: the skin holds THE NUMBERS at every size

```
PASS  [1280x800] the PRO editor opens on the Studio face, as the profile ships it (ui.studio.enabled, no switch) | expect: the shell [data-studio="shell"] mounted, ui.studio.enabled true | observed: {"shell":true,"enabled":true}
PASS  [1280x800] the stage: the 21 calls of scripts/t81-kitchen.mjs t81Kitchen() through the page's own store | expect: 4 units on wall A | observed: 01 BUD 600, 02 BUD 800, DR01 BUDR2 500, WU01 WUD 600
PASS  [1280x800] a real click on the BUD 800's 02-FL at (322, 489): the quick card for it | expect: unit 02 selected, the inspector in quick, the card of kind base | observed: {"type":"base","unit":"u_qccq9eh","num":"02","element":null,"mode":"quick"}
PASS  [1280x800] real clicks on Full settings (1123, 559), Pin (1163, 104) and the panel's Carcass head (1101, 157) | expect: the embedded RightPanel in the column, pinned, Carcass open | observed: {"full":true,"pinned":true,"carcass":true}
PASS  [1440x900] the PRO editor opens on the Studio face, as the profile ships it (ui.studio.enabled, no switch) | expect: the shell [data-studio="shell"] mounted, ui.studio.enabled true | observed: {"shell":true,"enabled":true}
PASS  [1440x900] the stage: the 21 calls of scripts/t81-kitchen.mjs t81Kitchen() through the page's own store | expect: 4 units on wall A | observed: 01 BUD 600, 02 BUD 800, DR01 BUDR2 500, WU01 WUD 600
PASS  [1440x900] a real click on the BUD 800's 02-FL at (389, 548): the quick card for it | expect: unit 02 selected, the inspector in quick, the card of kind base | observed: {"type":"base","unit":"u_tj4r03l","num":"02","element":null,"mode":"quick"}
PASS  [1440x900] real clicks on Full settings (1269, 559), Pin (1323, 104) and the panel's Carcass head (1261, 157) | expect: the embedded RightPanel in the column, pinned, Carcass open | observed: {"full":true,"pinned":true,"carcass":true}
PASS  [1920x1080] the PRO editor opens on the Studio face, as the profile ships it (ui.studio.enabled, no switch) | expect: the shell [data-studio="shell"] mounted, ui.studio.enabled true | observed: {"shell":true,"enabled":true}
PASS  [1920x1080] the stage: the 21 calls of scripts/t81-kitchen.mjs t81Kitchen() through the page's own store | expect: 4 units on wall A | observed: 01 BUD 600, 02 BUD 800, DR01 BUDR2 500, WU01 WUD 600
PASS  [1920x1080] a real click on the BUD 800's 02-FL at (580, 655): the quick card for it | expect: unit 02 selected, the inspector in quick, the card of kind base | observed: {"type":"base","unit":"u_2cnax4g","num":"02","element":null,"mode":"quick"}
PASS  [1920x1080] real clicks on Full settings (1749, 559), Pin (1803, 104) and the panel's Carcass head (1721, 157) | expect: the embedded RightPanel in the column, pinned, Carcass open | observed: {"full":true,"pinned":true,"carcass":true}
PASS  [1280x800] top bar 48 high | expect: bars.topPx 48 | observed: 48
PASS  [1280x800] context strip 34 high | expect: bars.contextPx 34 | observed: 34
PASS  [1280x800] status bar 30 high | expect: bars.statusPx 30 | observed: 30
PASS  [1280x800] rail 56 wide, its words not drawn | expect: rail 56 (icons only below 1440) | observed: 56; words: none
PASS  [1280x800] the quick card's column 316 wide | expect: inspector.quickPx 316 (344, 316 below 1440) | observed: 316
PASS  [1280x800] the full panel's column 360 wide | expect: inspector.fullPx 360 (400, 360 below 1500) | observed: 360
PASS  [1280x800] rail + scene + inspector = the window's width (quick) | expect: 1280 | observed: 56 + 908 + 316
PASS  [1280x800] every field of the card (4: 800, 770, 558, 2 doors . L / R) 30 high, radius 4, text 13 | expect: scale.fieldPx 30, radiusPx 4, textPx 13 | observed: all
PASS  [1280x800] every button of the card, the rail and the top bar (24) 32 high, radius 4 | expect: scale.buttonPx 32, radiusPx 4 | observed: all
PASS  [1280x800] the card's text 13px, its labels 12px | expect: scale.textPx 13, labels 12 (her 12 against her 13) | observed: 13px; labels all
PASS  [1280x800] no horizontal scroll: the page, the inspector column, the card, the embedded panel | expect: 0 px over at each | observed: {"page":0,"column":0,"card":0,"fullPage":0,"fullColumn":0,"panel":0}
PASS  [1440x900] top bar 48 high | expect: bars.topPx 48 | observed: 48
PASS  [1440x900] context strip 34 high | expect: bars.contextPx 34 | observed: 34
PASS  [1440x900] status bar 30 high | expect: bars.statusPx 30 | observed: 30
PASS  [1440x900] rail 112 wide, its words shown | expect: rail 112 (labels from 1440) | observed: 112; words: Select, Add, Room, Materials, Check, Design, CNC
PASS  [1440x900] the quick card's column 344 wide | expect: inspector.quickPx 344 (344, 316 below 1440) | observed: 344
PASS  [1440x900] the full panel's column 360 wide | expect: inspector.fullPx 360 (400, 360 below 1500) | observed: 360
PASS  [1440x900] rail + scene + inspector = the window's width (quick) | expect: 1440 | observed: 112 + 984 + 344
PASS  [1440x900] every field of the card (4: 800, 770, 558, 2 doors . L / R) 30 high, radius 4, text 13 | expect: scale.fieldPx 30, radiusPx 4, textPx 13 | observed: all
PASS  [1440x900] every button of the card, the rail and the top bar (24) 32 high, radius 4 | expect: scale.buttonPx 32, radiusPx 4 | observed: all
PASS  [1440x900] the card's text 13px, its labels 12px | expect: scale.textPx 13, labels 12 (her 12 against her 13) | observed: 13px; labels all
PASS  [1440x900] no horizontal scroll: the page, the inspector column, the card, the embedded panel | expect: 0 px over at each | observed: {"page":0,"column":0,"card":0,"fullPage":0,"fullColumn":0,"panel":0}
PASS  [1920x1080] top bar 48 high | expect: bars.topPx 48 | observed: 48
PASS  [1920x1080] context strip 34 high | expect: bars.contextPx 34 | observed: 34
PASS  [1920x1080] status bar 30 high | expect: bars.statusPx 30 | observed: 30
PASS  [1920x1080] rail 112 wide, its words shown | expect: rail 112 (labels from 1440) | observed: 112; words: Select, Add, Room, Materials, Check, Design, CNC
PASS  [1920x1080] the quick card's column 344 wide | expect: inspector.quickPx 344 (344, 316 below 1440) | observed: 344
PASS  [1920x1080] the full panel's column 400 wide | expect: inspector.fullPx 400 (400, 360 below 1500) | observed: 400
PASS  [1920x1080] rail + scene + inspector = the window's width (quick) | expect: 1920 | observed: 112 + 1464 + 344
PASS  [1920x1080] every field of the card (4: 800, 770, 558, 2 doors . L / R) 30 high, radius 4, text 13 | expect: scale.fieldPx 30, radiusPx 4, textPx 13 | observed: all
PASS  [1920x1080] every button of the card, the rail and the top bar (24) 32 high, radius 4 | expect: scale.buttonPx 32, radiusPx 4 | observed: all
PASS  [1920x1080] the card's text 13px, its labels 12px | expect: scale.textPx 13, labels 12 (her 12 against her 13) | observed: 13px; labels all
PASS  [1920x1080] no horizontal scroll: the page, the inspector column, the card, the embedded panel | expect: 0 px over at each | observed: {"page":0,"column":0,"card":0,"fullPage":0,"fullColumn":0,"panel":0}
```

## 1280 x 800

THE NUMBERS at this width: rail 56, icons only, quick card 316, full panel 360. Her file at this width: rail 112, quick card 344, full panel 360 (her media queries: 360 at 1500 and below, 96 / 316 at 1150 and below).

Ours shows unit 02 (card `base`), selected by a real click on its piece `02-FL` at (322, 489); part selected: none.

### Boxes, the quick card

| Box | Ours (x, y, w x h) | Hers (x, y, w x h) | d (x, y, w, h) | Verdict |
| - | - | - | - | - |
| the face (root) | 0, 0, 1280 x 800 | 0, 0, 1280 x 800 | 0, 0, 0, 0 | = |
| top bar | 0, 0, 1280 x 48 | 0, 0, 1280 x 48 | 0, 0, 0, 0 | = |
| top bar: the wordmark's cube | 10, 12, 23 x 23 | 10, 12, 23 x 23 | 0, 0, 0, 0 | = |
| top bar: CABINET CORE (the words) | 42, 15.1, 106.1 x 15 | 42, 15.1, 106.1 x 15 | 0, 0, 0, 0 | = |
| top bar: PRO | 155.1, 15.8, 34 x 15.4 | 157.1, 15.8, 34 x 15.4 | -2, 0, 0, 0 | DIFF: D4: ours at the bar's gap 7, hers at her wordmark's 9: -2 x |
| top bar: the rule after PRO | 196.2, 13.5, 1 x 20 | 201.2, 14.5, 1 x 18 | -5, -1, 0, +2 | DIFF: D4: TopBar's separator, 20 high and no margin, against her 18 with 3 px either side: -5 x, -1 y, +2 h |
| top bar: the project name | 204.2, 14.4, 84.9 x 18.2 | 212.2, 6.7, 155 x 33.6 | -8, +7.7, -70.1, -15.4 | DIFF: D5: the job's name on one line against her two-line sample (-70.1 w, -15.4 h); x -8 by D4 |
| top bar: the name's words (its first line) | 204.2, 15.4, 70.2 x 16 | 212.2, 7.7, 118.7 x 16 | -8, +7.7, -48.5, 0 | DIFF: D5: "T81 kitchen" against "Hampstead kitchen" (-48.5 w), centred, not the first of two lines (+7.7 y); x -8 by D4 |
| top bar: the eight legacy menus | 296.1, 7.5, 467.1 x 32 | 374.1, 7.5, 490.1 x 32 | -78, 0, -23, 0 | DIFF: D6: her Output's chevron (-23 w); x -78.1: the name's width (D5) and D4 |
| top bar: File | 296.1, 7.5, 35.6 x 32 | 374.1, 7.5, 35.6 x 32 | -78, 0, 0, 0 | DIFF: x -78.1 with the menus (D4, D5) |
| top bar: Output | 707.4, 7.5, 55.8 x 32 | 785.4, 7.5, 78.8 x 32 | -78, 0, -23, 0 | DIFF: D6: no chevron (-23 w); x with the menus |
| top bar: Undo | 818.3, 7.5, 32 x 32 | 1155.9, 7.5, 32 x 32 | -337.6, 0, 0, 0 | DIFF: D7: the right group Undo to BOM 451.7 wide, hers Undo to Save 114.1 |
| top bar: Redo | 857.3, 7.5, 32 x 32 | (none) |  | OURS ONLY: D7: Redo beside Undo (CLAUDE.md F2) |
| top bar: Save | 896.3, 7.5, 79.1 x 32 | 1194.9, 7.5, 75.1 x 32 | -298.6, 0, +4, 0 | DIFF: D8: the house's padding 12 against her 10 (+4 w); x by D7 (-298.6) |
| top bar: Brightness | 982.4, 15.5, 140 x 16 | (none) |  | OURS ONLY: D7: the Brightness slider, the same state (CLAUDE.md F2) |
| top bar: Account | 1129.4, 7.5, 77.3 x 32 | (none) |  | OURS ONLY: D7: Account (CLAUDE.md F2) |
| top bar: BOM | 1213.6, 7.5, 56.4 x 32 | (none) |  | OURS ONLY: D7: BOM, the gold button that said Export (CLAUDE.md F2; the owner, 16:27, "tak") |
| context strip | 0, 48, 1280 x 34 | 0, 48, 1280 x 34 | 0, 0, 0, 0 | = |
| context: the breadcrumb | 72, 55.4, 177 x 18.2 | 128, 55.4, 159.2 x 18.2 | -56, 0, +17.8, 0 | DIFF: D11: the job's words (+17.8 w); D1: the strip's padding is the rail and 16 (-56 x) |
| context: the unit number (bold) | 232.5, 55.4, 16.4 x 18.2 | 263, 55.4, 24.1 x 18.2 | -30.5, 0, -7.7, 0 | DIFF: D11: "02" against "B07" (-7.7 w), x after the words and D1 (-30.5) |
| context: "1 cabinet selected" | 1153.1, 56.1, 112.9 x 16.8 | 1113.1, 56.1, 112.9 x 16.8 | +40, 0, 0, 0 | DIFF: D10: no show-inspector button while the inspector shows (her 32 and gap 8: +40 x) |
| context: show-inspector button | (none) | 1234, 50.5, 32 x 28 |  | HERS ONLY: D10: drawn only while the inspector is hidden (CLAUDE.md F2) |
| workspace (rail / scene / inspector) | 0, 82, 1280 x 688 | 0, 82, 1280 x 688 | 0, 0, 0, 0 | = |
| rail | 0, 82, 56 x 688 | 0, 82, 112 x 688 | 0, 0, -56, 0 | DIFF: D1: rail 56, icons only, below 1440 (her 112) |
| rail: Select | 8, 96, 39 x 32 | 8, 96, 95 x 32 | 0, 0, -56, 0 | DIFF: D1 (-56 w) |
| rail: Add | 8, 134, 39 x 32 | 8, 134, 95 x 32 | 0, 0, -56, 0 | DIFF: D1 (-56 w) |
| rail: Room | 8, 172, 39 x 32 | 8, 172, 95 x 32 | 0, 0, -56, 0 | DIFF: D1 (-56 w) |
| rail: Materials | 8, 210, 39 x 32 | 8, 210, 95 x 32 | 0, 0, -56, 0 | DIFF: D1 (-56 w) |
| rail: separator | 12, 257, 31 x 1 | 12, 257, 87 x 1 | 0, 0, -56, 0 | DIFF: D1 (-56 w) |
| rail: Check | 8, 273, 39 x 32 | 8, 273, 95 x 32 | 0, 0, -56, 0 | DIFF: D1 (-56 w) |
| rail: Check's count | 28.6, 271, 20.4 x 20 | (none) |  | OURS ONLY: D12: Check's count, 2, red, on the button's corner (D1) |
| rail: WORKSPACE | (none) | 8, 700.6, 95 x 15.4 |  | HERS ONLY: D1: icons only, no caption |
| rail: Design | 8, 684, 39 x 32 | 8, 724, 95 x 32 | 0, -40, -56, 0 | DIFF: D13: CNC under it (-40 y); D1 (-56 w) |
| rail: CNC | 8, 724, 39 x 32 | (none) |  | OURS ONLY: D13: CNC at the rail's foot (CLAUDE.md F2) |
| scene slot | 56, 82, 908 x 688 | 112, 82, 824 x 688 | -56, 0, +84, 0 | DIFF: D1 (-56 x, +56 w) and D2 (+28 w) |
| scene: the four toggles | 351.3, 94, 317.4 x 44 | (none) |  | OURS ONLY: D14: X-ray, Hide fronts, Outlines, Open all (CLAUDE.md F6) |
| scene: View (top right) | 870.9, 94, 79.1 x 32 | 846.9, 94, 75.1 x 32 | +24, 0, +4, 0 | DIFF: D8: the house's padding (+4 w), right-aligned (-4 x); D2: the scene's right edge +28 |
| scene: the bar at the foot | 205.9, 708, 608.1 x 44 | 418.2, 708, 211.5 x 44 | -212.3, 0, +396.6, 0 | DIFF: D15: ten buttons against her two (+396.6 w), centred (-212.3 x, of which -14 the scene's centre, D1 and D2) |
| scene foot: 3D | 211.9, 714, 66.4 x 32 | 424.2, 714, 62.4 x 32 | -212.3, 0, +4, 0 | DIFF: D8: the house's padding (+4 w); x with the bar (D15) |
| scene foot: Drawings... | 697.9, 714, 110.1 x 32 | 509.6, 714, 114.1 x 32 | +188.3, 0, -4, 0 | DIFF: D8: the house's ghost padding 8 against her 10 (-4 w); x at the bar's end (D15: +188.3) |
| inspector column | 964, 82, 316 x 688 | 936, 82, 344 x 688 | +28, 0, -28, 0 | DIFF: D2: the card 316 below 1440 (her 344) |
| card: head | 965, 82, 315 x 110.8 | 937, 82, 343 x 110.8 | +28, 0, -28, 0 | DIFF: D2 |
| card: the unit number | 979, 101.6, 163.5 x 15.4 | 951, 101.6, 159.3 x 15.4 | +28, 0, +4.2, 0 | DIFF: D2 (+28 x), D16: the block's width is its title's ("02" over it; +4.2 w) |
| card: the title | 979, 120, 163.5 x 22.4 | 951, 120, 159.3 x 22.4 | +28, 0, +4.2, 0 | DIFF: D2 (+28 x), D16: "Base units . Standard" against "Drawer base cabinet" (+4.2 w) |
| card: the thumb | 1218, 98, 48 x 48 | 1218, 98, 48 x 48 | 0, 0, 0, 0 | = |
| card: the scope row | 979, 157, 287 x 22.8 | 951, 157, 315 x 22.8 | +28, 0, -28, 0 | DIFF: D2 |
| card: "This cabinet" | 979, 157, 85.4 x 22.8 | 951, 157, 85.4 x 22.8 | +28, 0, 0, 0 | DIFF: D2 (x only) |
| card: body | 965, 192.8, 315 x 394.2 | 937, 192.8, 343 x 436.2 | +28, 0, -28, -42 | DIFF: D2 (+28 x, -28 w), D17: one row fewer (-42 h) |
| card: the frame round the rows | 979, 204.8, 287 x 257.4 | 951, 204.8, 315 x 299.4 | +28, 0, -28, -42 | DIFF: D2 (+28 x, -28 w), D17: one row fewer (-42 h) |
| card: SIZE & SETUP | 990, 215.8, 265 x 15.4 | 962, 215.8, 293 x 15.4 | +28, 0, -28, 0 | DIFF: D2 |
| card: "Height follows project default" | 979, 470.2, 287 x 16.8 | 951, 512.2, 315 x 16.8 | +28, -42, -28, 0 | DIFF: D2 (+28 x, -28 w), D17: under five rows, not six (-42 y) |
| card: Open cabinet (gold) | 979, 503, 287 x 32 | 951, 545, 315 x 32 | +28, -42, -28, 0 | DIFF: D2 (+28 x, -28 w), D17 (-42 y); its weight is D9 |
| card: Full settings | 979, 543, 287 x 32 | 951, 585, 315 x 32 | +28, -42, -28, 0 | DIFF: D2 (+28 x, -28 w), D17 (-42 y) |
| card: foot | 965, 713, 315 x 57 | 937, 713, 343 x 57 | +28, 0, -28, 0 | DIFF: D2 (D18: the same box, no words in ours) |
| card foot: Hide settings | 1234, 726, 32 x 32 | 1234, 726, 32 x 32 | 0, 0, 0, 0 | = |
| status bar | 0, 770, 1280 x 30 | 0, 770, 1280 x 30 | 0, 0, 0, 0 | = |
| status: the selection in words | 117, 777.1, 89.4 x 16.8 | 14, 777.1, 112.6 x 16.8 | +103, 0, -23.2, 0 | DIFF: D19: after Changes (+103 x); "02 . Base unit" against "B07 . This cabinet" (-23.2 w) |
| status: the viewport | 889.8, 777.1, 72.3 x 16.8 | 1075.9, 777.1, 72.3 x 16.8 | -186.1, 0, 0, 0 | DIFF: D19: the counters after it, clear of the build stamp (-186.1 x) |

### The card's rows (the field heights, the row pitch)

| # | Ours: label, top, h, pitch; the value | Hers: label, top, h, pitch; the value |
| - | - | - |
| 1 | Width, 241.2, 42, 42; input.cc-input 136 x 30, text 13px, radius 4px | Width, 241.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px |
| 2 | Height, 283.2, 42, 42; input.cc-input 136 x 30, text 13px, radius 4px | Height, 283.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px |
| 3 | Depth, 325.2, 42, 42; input.cc-input 136 x 30, text 13px, radius 4px | Depth, 325.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px |
| 4 | Doors, 367.2, 42, 42; button.studio-value-action 136 x 30, text 13px, radius 4px; buttons 2 doors . L / R 30 high | Front type, 367.2, 42, 42; button.value-action 148.3 x 30, text 13px, radius 4px; buttons Project default 30 high |
| 5 | Plinth, 409.2, 42, -; span.studio-readonly-value 44.4 x 30, text 12px, radius 0px; buttons Remove 32 high | Finish, 409.2, 42, 42; button.value-action 148.3 x 30, text 13px, radius 4px; buttons Type A . Natural oak 30 high |
| 6 | (no row) | Plinth, 451.2, 42, -; button.value-action 148.3 x 30, text 13px, radius 4px; buttons On . 150 mm 30 high |

### Type and radius, the quick card

| Element | Ours | Hers | Verdict |
| - | - | - | - |
| the face's base text | size 13px; font system-ui | size 13px; font system-ui | = |
| a row's label (Width) | size 12px; weight 400; ink #d6d6d2 | size 12px; weight 400; ink #d6d6d2 | = |
| a number field (Width) | size 13px; h 30; radius 4px; align right; pad-r 40px; ground #1a1a1a; border #3e3e42 | size 13px; h 30; radius 4px; align right; pad-r 40px; ground #1a1a1a; border #3e3e42 | = |
| the unit in the field (mm) | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| a summary value (Doors / Front type) | size 13px; h 30; radius 4px; ground #2d2d30; border #3e3e42 | size 13px; h 30; radius 4px; ground #2d2d30; border #3e3e42 | = |
| the section title | size 11px; tracking 0.8px; case uppercase; ink #c8a678 | size 11px; tracking 0.8px; case uppercase; ink #c8a678 | = |
| the unit number over the title | size 11px; tracking 0.7px; ink #c8a678 | size 11px; tracking 0.7px; ink #c8a678 | = |
| the title | size 16px; weight 600; ink #f2f2f0 | size 16px; weight 600; ink #f2f2f0 | = |
| the scope row | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| the scope pill | size 12px; radius 4px; border #3e3e42 | size 12px; radius 4px; border #3e3e42 | = |
| the inheritance line | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| Open cabinet | size 13px; weight 500; h 32; radius 4px; ground #aa8e68; ink #1a1a1a | size 13px; weight 600; h 32; radius 4px; ground #aa8e68; ink #1a1a1a | DIFF: D9: the house's weight 500, hers 600 |
| Full settings | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | = |
| Hide settings | h 32; w 32; radius 4px | h 32; w 32; radius 4px | = |
| a rail button (Select) | size 13px; h 32; radius 4px; border #aa8e68/65%; ink #c8a678 | size 13px; h 32; radius 4px; border #aa8e68/65%; ink #c8a678 | = |
| the rail's WORKSPACE | (none) | size 11px; tracking 0.5px; case uppercase | DIFF: D1: icons only, no caption |
| a menu button (File) | size 13px; h 32; radius 4px; pad-l 6px; ink #d6d6d2 | size 13px; h 32; radius 4px; pad-l 6px; ink #d6d6d2 | = |
| Save | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | = |
| CABINET CORE | size 12px; tracking 1.5px; ink #d6d6d2 | size 12px; tracking 1.5px; ink #d6d6d2 | = |
| the breadcrumb | size 13px; ink #a8a8a2 | size 13px; ink #a8a8a2 | = |
| "1 cabinet selected" | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| the status bar | size 12px; ink #a8a8a2; ground #1a1a1a | size 12px; ink #a8a8a2; ground #1a1a1a | = |

### Boxes, full settings and pinned

| Box | Ours (x, y, w x h) | Hers (x, y, w x h) | d (x, y, w, h) | Verdict |
| - | - | - | - | - |
| inspector column (full, pinned) | 920, 82, 360 x 688 | 920, 82, 360 x 688 | 0, 0, 0, 0 | = |
| the panel's head | 921, 82, 359 x 45 | 921, 82, 359 x 53 | 0, 0, 0, -8 | DIFF: D20: the panel's own head, 45 high (hers 53) |
| head: the title | 933, 96, 45.2 x 16 | 933, 98.2, 257 x 19.6 | 0, -2.2, -211.8, -3.6 | DIFF: D20: the panel's "BASE UNIT" in its 12 px capitals (hers "Full settings", 14 px) |
| head: the unit's name field | 1020.7, 92, 112 x 24 | (none) |  | OURS ONLY: D20: the UnitNameField in the panel's head (LAW 2) |
| head: Pin | 1148.7, 90, 28 x 28 | 1197, 92, 32 x 32 | -48.3, -2, -4, -4 | DIFF: D20: the header's 28 px (hers 32); x and y in the panel's head |
| head: back to quick settings | 1180.7, 90, 54.1 x 28 | 1236, 92, 32 x 32 | -55.3, -2, +22.1, -4 | DIFF: D20: "Quick", a word (S3), where hers is an x (+22.1 w, -4 h) |
| head: the panel's own x | 1242.7, 90, 25.3 x 28 | (none) |  | OURS ONLY: D20: the panel's own x (one of the 649) |
| the unit line under the head | (none) | 921, 135, 359 x 52.6 |  | HERS ONLY: D20: no line under the head (LAW 2: no second header) |
| the rows' body (it scrolls) | 921, 127, 359 x 643 | 921, 187.6, 359 x 525.4 | 0, -60.6, 0, +117.6 | DIFF: D20: no unit line, no foot: from 127 to the status bar (-60.6 y, +117.6 h) |
| the first section (Carcass) | 931, 137, 339 x 673.5 | 933, 251.4, 335 x 160 | -2, -114.4, +4, +513.5 | DIFF: D20: the panel's own Carcass section, open (its rows, not her sample's) |
| its head | 932, 138, 337 x 37 | 944, 262.4, 313 x 24 | -12, -124.4, +24, +13 | DIFF: D20: the panel's section head (37 high, 16 px, its 10 px arrow) |
| its first field | 942, 197.5, 100.3 x 30 | 1117, 290.4, 140 x 30 | -175, -92.9, -39.7, 0 | DIFF: D20: the panel's own field (100.3 x 30 in its grid; hers 140 x 30) |
| the column's foot | (none) | 921, 713, 359 x 57 |  | HERS ONLY: D20: no foot under the panel (S3) |
| status bar | 0, 770, 1280 x 30 | 0, 770, 1280 x 30 | 0, 0, 0, 0 | = |

### Type and radius, full settings

| Element | Ours | Hers | Verdict |
| - | - | - | - |
| the head's title | size 12px; weight 400; case uppercase | size 14px; weight 600; case none | DIFF: D20: the panel's own title |
| Pin | h 28; w 28; radius 4px; ink #c8a678; border #aa8e68 | h 32; w 32; radius 4px; ink #c8a678; border #aa8e68 | DIFF: D20: the header's 28 px |
| back to quick settings | size 14px; h 28; w 54.1; radius 4px | size 13px; h 32; w 32; radius 4px | DIFF: D20: a word in the panel's 14 px (S3) |
| a section's head | size 16px; h 37; case none | size 13px; h 24; case none | DIFF: D20: the panel's section head |
| a field in it | size 14px; h 30; radius 4px | size 13px; h 30; radius 4px | DIFF: D20: the panel's 14 px (30 high, as hers) |
| a label in it | size 11px; case uppercase | size 12px; case none | DIFF: D20: the panel's 11 px capitals |
| the section's frame | radius 8px; border #aa8e68/70% | radius 4px; border #aa8e68/30% | DIFF: D20: the house's frame (8 round; gold 70 % while open) |

### The pixel ruler (where a shell-600 hairline is drawn, read off the four frames)

| Scan | Ours, quick | Hers, quick | Ours, full | Hers, full | Verdict |
| - | - | - | - | - | - |
| down the right edge, x 1274 (each hairline's y): the bars, the card's head and foot, the status bar | 47, 81, 192, 713, 770 | 47, 81, 192, 713, 770 | 47, 81, 126, 770 | 47, 81, 134, 187, 713, 770 | quick =; full: D20 |
| across the top bar, y 24: PRO's left border, the rule, the bordered buttons | 155, 196, 896, 974, 1129, 1206 | 157, 201, 1195, 1269 | 155, 196, 896, 974, 1129, 1206 | 157, 201, 1195, 1269 | quick: D4, D7, D8; full: D4, D7, D8 |
| across the context strip, y 64: the scope's left border | 1153 | 1113 | 1153 | 1113 | quick: D10; full: D10 |
| across the workspace, y 500 (x 0 to 140 and the last 420): the rail's and the inspector's borders | 55, 964 | 111, 936 | 55, 920 | 111, 920 | quick: D1, D2; full: D1 |

The scene's findings on this stage (the engine's `runChecks`, red and yellow, as the marker and the counters show them): red #18 on DR01: "DR01 D1: Runner NL500 (T): no article in catalogue - upload the model or adjust the ladder."; red #18 on DR01: "DR01 D2: Runner NL500 (T): no article in catalogue - upload the model or adjust the ladder.". Markers: 2 red.

Console errors on our page: none.

## 1440 x 900

THE NUMBERS at this width: rail 112 with labels, quick card 344, full panel 360. Her file at this width: rail 112, quick card 344, full panel 360 (her media queries: 360 at 1500 and below, 96 / 316 at 1150 and below).

Ours shows unit 02 (card `base`), selected by a real click on its piece `02-FL` at (389, 548); part selected: none.

### Boxes, the quick card

| Box | Ours (x, y, w x h) | Hers (x, y, w x h) | d (x, y, w, h) | Verdict |
| - | - | - | - | - |
| the face (root) | 0, 0, 1440 x 900 | 0, 0, 1440 x 900 | 0, 0, 0, 0 | = |
| top bar | 0, 0, 1440 x 48 | 0, 0, 1440 x 48 | 0, 0, 0, 0 | = |
| top bar: the wordmark's cube | 10, 12, 23 x 23 | 10, 12, 23 x 23 | 0, 0, 0, 0 | = |
| top bar: CABINET CORE (the words) | 42, 15.1, 106.1 x 15 | 42, 15.1, 106.1 x 15 | 0, 0, 0, 0 | = |
| top bar: PRO | 155.1, 15.8, 34 x 15.4 | 157.1, 15.8, 34 x 15.4 | -2, 0, 0, 0 | DIFF: D4: ours at the bar's gap 7, hers at her wordmark's 9: -2 x |
| top bar: the rule after PRO | 196.2, 13.5, 1 x 20 | 201.2, 14.5, 1 x 18 | -5, -1, 0, +2 | DIFF: D4: TopBar's separator, 20 high and no margin, against her 18 with 3 px either side: -5 x, -1 y, +2 h |
| top bar: the project name | 204.2, 14.4, 84.9 x 18.2 | 212.2, 6.7, 155 x 33.6 | -8, +7.7, -70.1, -15.4 | DIFF: D5: the job's name on one line against her two-line sample (-70.1 w, -15.4 h); x -8 by D4 |
| top bar: the name's words (its first line) | 204.2, 15.4, 70.2 x 16 | 212.2, 7.7, 118.7 x 16 | -8, +7.7, -48.5, 0 | DIFF: D5: "T81 kitchen" against "Hampstead kitchen" (-48.5 w), centred, not the first of two lines (+7.7 y); x -8 by D4 |
| top bar: the eight legacy menus | 296.1, 7.5, 467.1 x 32 | 374.1, 7.5, 490.1 x 32 | -78, 0, -23, 0 | DIFF: D6: her Output's chevron (-23 w); x -78.1: the name's width (D5) and D4 |
| top bar: File | 296.1, 7.5, 35.6 x 32 | 374.1, 7.5, 35.6 x 32 | -78, 0, 0, 0 | DIFF: x -78.1 with the menus (D4, D5) |
| top bar: Output | 707.4, 7.5, 55.8 x 32 | 785.4, 7.5, 78.8 x 32 | -78, 0, -23, 0 | DIFF: D6: no chevron (-23 w); x with the menus |
| top bar: Undo | 978.3, 7.5, 32 x 32 | 1315.9, 7.5, 32 x 32 | -337.6, 0, 0, 0 | DIFF: D7: the right group Undo to BOM 451.7 wide, hers Undo to Save 114.1 |
| top bar: Redo | 1017.3, 7.5, 32 x 32 | (none) |  | OURS ONLY: D7: Redo beside Undo (CLAUDE.md F2) |
| top bar: Save | 1056.3, 7.5, 79.1 x 32 | 1354.9, 7.5, 75.1 x 32 | -298.6, 0, +4, 0 | DIFF: D8: the house's padding 12 against her 10 (+4 w); x by D7 (-298.6) |
| top bar: Brightness | 1142.4, 15.5, 140 x 16 | (none) |  | OURS ONLY: D7: the Brightness slider, the same state (CLAUDE.md F2) |
| top bar: Account | 1289.4, 7.5, 77.3 x 32 | (none) |  | OURS ONLY: D7: Account (CLAUDE.md F2) |
| top bar: BOM | 1373.6, 7.5, 56.4 x 32 | (none) |  | OURS ONLY: D7: BOM, the gold button that said Export (CLAUDE.md F2; the owner, 16:27, "tak") |
| context strip | 0, 48, 1440 x 34 | 0, 48, 1440 x 34 | 0, 0, 0, 0 | = |
| context: the breadcrumb | 128, 55.4, 177 x 18.2 | 128, 55.4, 159.2 x 18.2 | 0, 0, +17.8, 0 | DIFF: D11: the job's words (+17.8 w) |
| context: the unit number (bold) | 288.5, 55.4, 16.4 x 18.2 | 263, 55.4, 24.1 x 18.2 | +25.5, 0, -7.7, 0 | DIFF: D11: "02" against "B07" (-7.7 w), x after the words (+25.5) |
| context: "1 cabinet selected" | 1313.1, 56.1, 112.9 x 16.8 | 1273.1, 56.1, 112.9 x 16.8 | +40, 0, 0, 0 | DIFF: D10: no show-inspector button while the inspector shows (her 32 and gap 8: +40 x) |
| context: show-inspector button | (none) | 1394, 50.5, 32 x 28 |  | HERS ONLY: D10: drawn only while the inspector is hidden (CLAUDE.md F2) |
| workspace (rail / scene / inspector) | 0, 82, 1440 x 788 | 0, 82, 1440 x 788 | 0, 0, 0, 0 | = |
| rail | 0, 82, 112 x 788 | 0, 82, 112 x 788 | 0, 0, 0, 0 | = |
| rail: Select | 8, 96, 95 x 32 | 8, 96, 95 x 32 | 0, 0, 0, 0 | = |
| rail: Add | 8, 134, 95 x 32 | 8, 134, 95 x 32 | 0, 0, 0, 0 | = |
| rail: Room | 8, 172, 95 x 32 | 8, 172, 95 x 32 | 0, 0, 0, 0 | = |
| rail: Materials | 8, 210, 95 x 32 | 8, 210, 95 x 32 | 0, 0, 0, 0 | = |
| rail: separator | 12, 257, 87 x 1 | 12, 257, 87 x 1 | 0, 0, 0, 0 | = |
| rail: Check | 8, 273, 95 x 32 | 8, 273, 95 x 32 | 0, 0, 0, 0 | = |
| rail: Check's count | 87.6, 280, 20.4 x 20 | (none) |  | OURS ONLY: D12: Check's count, 2, red |
| rail: WORKSPACE | 8, 760.6, 95 x 15.4 | 8, 800.6, 95 x 15.4 | 0, -40, 0, 0 | DIFF: D13: CNC under Design (32 + 8: -40 y) |
| rail: Design | 8, 784, 95 x 32 | 8, 824, 95 x 32 | 0, -40, 0, 0 | DIFF: D13: CNC under it (-40 y) |
| rail: CNC | 8, 824, 95 x 32 | (none) |  | OURS ONLY: D13: CNC at the rail's foot (CLAUDE.md F2) |
| scene slot | 112, 82, 984 x 788 | 112, 82, 984 x 788 | 0, 0, 0, 0 | = |
| scene: the four toggles | 445.3, 94, 317.4 x 44 | (none) |  | OURS ONLY: D14: X-ray, Hide fronts, Outlines, Open all (CLAUDE.md F6) |
| scene: View (top right) | 1002.9, 94, 79.1 x 32 | 1006.9, 94, 75.1 x 32 | -4, 0, +4, 0 | DIFF: D8: the house's padding (+4 w), right-aligned (-4 x) |
| scene: the bar at the foot | 299.9, 808, 608.1 x 44 | 498.2, 808, 211.5 x 44 | -198.3, 0, +396.6, 0 | DIFF: D15: ten buttons against her two (+396.6 w), centred (-198.3 x) |
| scene foot: 3D | 305.9, 814, 66.4 x 32 | 504.2, 814, 62.4 x 32 | -198.3, 0, +4, 0 | DIFF: D8: the house's padding (+4 w); x with the bar (D15) |
| scene foot: Drawings... | 791.9, 814, 110.1 x 32 | 589.6, 814, 114.1 x 32 | +202.3, 0, -4, 0 | DIFF: D8: the house's ghost padding 8 against her 10 (-4 w); x at the bar's end (D15: +202.3) |
| inspector column | 1096, 82, 344 x 788 | 1096, 82, 344 x 788 | 0, 0, 0, 0 | = |
| card: head | 1097, 82, 343 x 110.8 | 1097, 82, 343 x 110.8 | 0, 0, 0, 0 | = |
| card: the unit number | 1111, 101.6, 163.5 x 15.4 | 1111, 101.6, 159.3 x 15.4 | 0, 0, +4.2, 0 | DIFF: D16: the block's width is its title's ("02" over it; +4.2 w) |
| card: the title | 1111, 120, 163.5 x 22.4 | 1111, 120, 159.3 x 22.4 | 0, 0, +4.2, 0 | DIFF: D16: "Base units . Standard" against "Drawer base cabinet" (+4.2 w) |
| card: the thumb | 1378, 98, 48 x 48 | 1378, 98, 48 x 48 | 0, 0, 0, 0 | = |
| card: the scope row | 1111, 157, 315 x 22.8 | 1111, 157, 315 x 22.8 | 0, 0, 0, 0 | = |
| card: "This cabinet" | 1111, 157, 85.4 x 22.8 | 1111, 157, 85.4 x 22.8 | 0, 0, 0, 0 | = |
| card: body | 1097, 192.8, 343 x 394.2 | 1097, 192.8, 343 x 436.2 | 0, 0, 0, -42 | DIFF: D17: one row fewer (-42 h) |
| card: the frame round the rows | 1111, 204.8, 315 x 257.4 | 1111, 204.8, 315 x 299.4 | 0, 0, 0, -42 | DIFF: D17: one row fewer (-42 h) |
| card: SIZE & SETUP | 1122, 215.8, 293 x 15.4 | 1122, 215.8, 293 x 15.4 | 0, 0, 0, 0 | = |
| card: "Height follows project default" | 1111, 470.2, 315 x 16.8 | 1111, 512.2, 315 x 16.8 | 0, -42, 0, 0 | DIFF: D17: under five rows, not six (-42 y) |
| card: Open cabinet (gold) | 1111, 503, 315 x 32 | 1111, 545, 315 x 32 | 0, -42, 0, 0 | DIFF: D17 (-42 y); its weight is D9 |
| card: Full settings | 1111, 543, 315 x 32 | 1111, 585, 315 x 32 | 0, -42, 0, 0 | DIFF: D17 (-42 y) |
| card: foot | 1097, 813, 343 x 57 | 1097, 813, 343 x 57 | 0, 0, 0, 0 | = |
| card foot: Hide settings | 1394, 826, 32 x 32 | 1394, 826, 32 x 32 | 0, 0, 0, 0 | = |
| status bar | 0, 870, 1440 x 30 | 0, 870, 1440 x 30 | 0, 0, 0, 0 | = |
| status: the selection in words | 117, 877.1, 89.4 x 16.8 | 14, 877.1, 112.6 x 16.8 | +103, 0, -23.2, 0 | DIFF: D19: after Changes (+103 x); "02 . Base unit" against "B07 . This cabinet" (-23.2 w) |
| status: the viewport | 1049.8, 877.1, 72.3 x 16.8 | 1235.9, 877.1, 72.3 x 16.8 | -186.1, 0, 0, 0 | DIFF: D19: the counters after it, clear of the build stamp (-186.1 x) |

### The card's rows (the field heights, the row pitch)

| # | Ours: label, top, h, pitch; the value | Hers: label, top, h, pitch; the value |
| - | - | - |
| 1 | Width, 241.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px | Width, 241.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px |
| 2 | Height, 283.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px | Height, 283.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px |
| 3 | Depth, 325.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px | Depth, 325.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px |
| 4 | Doors, 367.2, 42, 42; button.studio-value-action 148.3 x 30, text 13px, radius 4px; buttons 2 doors . L / R 30 high | Front type, 367.2, 42, 42; button.value-action 148.3 x 30, text 13px, radius 4px; buttons Project default 30 high |
| 5 | Plinth, 409.2, 42, -; span.studio-readonly-value 44.4 x 30, text 12px, radius 0px; buttons Remove 32 high | Finish, 409.2, 42, 42; button.value-action 148.3 x 30, text 13px, radius 4px; buttons Type A . Natural oak 30 high |
| 6 | (no row) | Plinth, 451.2, 42, -; button.value-action 148.3 x 30, text 13px, radius 4px; buttons On . 150 mm 30 high |

### Type and radius, the quick card

| Element | Ours | Hers | Verdict |
| - | - | - | - |
| the face's base text | size 13px; font system-ui | size 13px; font system-ui | = |
| a row's label (Width) | size 12px; weight 400; ink #d6d6d2 | size 12px; weight 400; ink #d6d6d2 | = |
| a number field (Width) | size 13px; h 30; radius 4px; align right; pad-r 40px; ground #1a1a1a; border #3e3e42 | size 13px; h 30; radius 4px; align right; pad-r 40px; ground #1a1a1a; border #3e3e42 | = |
| the unit in the field (mm) | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| a summary value (Doors / Front type) | size 13px; h 30; radius 4px; ground #2d2d30; border #3e3e42 | size 13px; h 30; radius 4px; ground #2d2d30; border #3e3e42 | = |
| the section title | size 11px; tracking 0.8px; case uppercase; ink #c8a678 | size 11px; tracking 0.8px; case uppercase; ink #c8a678 | = |
| the unit number over the title | size 11px; tracking 0.7px; ink #c8a678 | size 11px; tracking 0.7px; ink #c8a678 | = |
| the title | size 16px; weight 600; ink #f2f2f0 | size 16px; weight 600; ink #f2f2f0 | = |
| the scope row | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| the scope pill | size 12px; radius 4px; border #3e3e42 | size 12px; radius 4px; border #3e3e42 | = |
| the inheritance line | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| Open cabinet | size 13px; weight 500; h 32; radius 4px; ground #aa8e68; ink #1a1a1a | size 13px; weight 600; h 32; radius 4px; ground #aa8e68; ink #1a1a1a | DIFF: D9: the house's weight 500, hers 600 |
| Full settings | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | = |
| Hide settings | h 32; w 32; radius 4px | h 32; w 32; radius 4px | = |
| a rail button (Select) | size 13px; h 32; radius 4px; border #aa8e68/65%; ink #c8a678 | size 13px; h 32; radius 4px; border #aa8e68/65%; ink #c8a678 | = |
| the rail's WORKSPACE | size 11px; tracking 0.5px; case uppercase | size 11px; tracking 0.5px; case uppercase | = |
| a menu button (File) | size 13px; h 32; radius 4px; pad-l 6px; ink #d6d6d2 | size 13px; h 32; radius 4px; pad-l 6px; ink #d6d6d2 | = |
| Save | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | = |
| CABINET CORE | size 12px; tracking 1.5px; ink #d6d6d2 | size 12px; tracking 1.5px; ink #d6d6d2 | = |
| the breadcrumb | size 13px; ink #a8a8a2 | size 13px; ink #a8a8a2 | = |
| "1 cabinet selected" | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| the status bar | size 12px; ink #a8a8a2; ground #1a1a1a | size 12px; ink #a8a8a2; ground #1a1a1a | = |

### Boxes, full settings and pinned

| Box | Ours (x, y, w x h) | Hers (x, y, w x h) | d (x, y, w, h) | Verdict |
| - | - | - | - | - |
| inspector column (full, pinned) | 1080, 82, 360 x 788 | 1080, 82, 360 x 788 | 0, 0, 0, 0 | = |
| the panel's head | 1081, 82, 359 x 45 | 1081, 82, 359 x 53 | 0, 0, 0, -8 | DIFF: D20: the panel's own head, 45 high (hers 53) |
| head: the title | 1093, 96, 45.2 x 16 | 1093, 98.2, 257 x 19.6 | 0, -2.2, -211.8, -3.6 | DIFF: D20: the panel's "BASE UNIT" in its 12 px capitals (hers "Full settings", 14 px) |
| head: the unit's name field | 1180.7, 92, 112 x 24 | (none) |  | OURS ONLY: D20: the UnitNameField in the panel's head (LAW 2) |
| head: Pin | 1308.7, 90, 28 x 28 | 1357, 92, 32 x 32 | -48.3, -2, -4, -4 | DIFF: D20: the header's 28 px (hers 32); x and y in the panel's head |
| head: back to quick settings | 1340.7, 90, 54.1 x 28 | 1396, 92, 32 x 32 | -55.3, -2, +22.1, -4 | DIFF: D20: "Quick", a word (S3), where hers is an x (+22.1 w, -4 h) |
| head: the panel's own x | 1402.7, 90, 25.3 x 28 | (none) |  | OURS ONLY: D20: the panel's own x (one of the 649) |
| the unit line under the head | (none) | 1081, 135, 359 x 52.6 |  | HERS ONLY: D20: no line under the head (LAW 2: no second header) |
| the rows' body (it scrolls) | 1081, 127, 359 x 743 | 1081, 187.6, 359 x 625.4 | 0, -60.6, 0, +117.6 | DIFF: D20: no unit line, no foot: from 127 to the status bar (-60.6 y, +117.6 h) |
| the first section (Carcass) | 1091, 137, 339 x 673.5 | 1093, 251.4, 335 x 160 | -2, -114.4, +4, +513.5 | DIFF: D20: the panel's own Carcass section, open (its rows, not her sample's) |
| its head | 1092, 138, 337 x 37 | 1104, 262.4, 313 x 24 | -12, -124.4, +24, +13 | DIFF: D20: the panel's section head (37 high, 16 px, its 10 px arrow) |
| its first field | 1102, 197.5, 100.3 x 30 | 1277, 290.4, 140 x 30 | -175, -92.9, -39.7, 0 | DIFF: D20: the panel's own field (100.3 x 30 in its grid; hers 140 x 30) |
| the column's foot | (none) | 1081, 813, 359 x 57 |  | HERS ONLY: D20: no foot under the panel (S3) |
| status bar | 0, 870, 1440 x 30 | 0, 870, 1440 x 30 | 0, 0, 0, 0 | = |

### Type and radius, full settings

| Element | Ours | Hers | Verdict |
| - | - | - | - |
| the head's title | size 12px; weight 400; case uppercase | size 14px; weight 600; case none | DIFF: D20: the panel's own title |
| Pin | h 28; w 28; radius 4px; ink #c8a678; border #aa8e68 | h 32; w 32; radius 4px; ink #c8a678; border #aa8e68 | DIFF: D20: the header's 28 px |
| back to quick settings | size 14px; h 28; w 54.1; radius 4px | size 13px; h 32; w 32; radius 4px | DIFF: D20: a word in the panel's 14 px (S3) |
| a section's head | size 16px; h 37; case none | size 13px; h 24; case none | DIFF: D20: the panel's section head |
| a field in it | size 14px; h 30; radius 4px | size 13px; h 30; radius 4px | DIFF: D20: the panel's 14 px (30 high, as hers) |
| a label in it | size 11px; case uppercase | size 12px; case none | DIFF: D20: the panel's 11 px capitals |
| the section's frame | radius 8px; border #aa8e68/70% | radius 4px; border #aa8e68/30% | DIFF: D20: the house's frame (8 round; gold 70 % while open) |

### The pixel ruler (where a shell-600 hairline is drawn, read off the four frames)

| Scan | Ours, quick | Hers, quick | Ours, full | Hers, full | Verdict |
| - | - | - | - | - | - |
| down the right edge, x 1434 (each hairline's y): the bars, the card's head and foot, the status bar | 47, 81, 192, 813, 870 | 47, 81, 192, 813, 870 | 47, 81, 126, 870 | 47, 81, 134, 187, 813, 870 | quick =; full: D20 |
| across the top bar, y 24: PRO's left border, the rule, the bordered buttons | 155, 196, 1056, 1134, 1289, 1366 | 157, 201, 1355, 1429 | 155, 196, 1056, 1134, 1289, 1366 | 157, 201, 1355, 1429 | quick: D4, D7, D8; full: D4, D7, D8 |
| across the context strip, y 64: the scope's left border | 1313 | 1273 | 1313 | 1273 | quick: D10; full: D10 |
| across the workspace, y 500 (x 0 to 140 and the last 420): the rail's and the inspector's borders | 111, 1096 | 111, 1096 | 111, 1080 | 111, 1080 | quick =; full = |

The scene's findings on this stage (the engine's `runChecks`, red and yellow, as the marker and the counters show them): red #18 on DR01: "DR01 D1: Runner NL500 (T): no article in catalogue - upload the model or adjust the ladder."; red #18 on DR01: "DR01 D2: Runner NL500 (T): no article in catalogue - upload the model or adjust the ladder.". Markers: 2 red.

Console errors on our page: none.

## 1920 x 1080

THE NUMBERS at this width: rail 112 with labels, quick card 344, full panel 400. Her file at this width: rail 112, quick card 344, full panel 400 (her media queries: 360 at 1500 and below, 96 / 316 at 1150 and below).

Ours shows unit 02 (card `base`), selected by a real click on its piece `02-FL` at (580, 655); part selected: none.

### Boxes, the quick card

| Box | Ours (x, y, w x h) | Hers (x, y, w x h) | d (x, y, w, h) | Verdict |
| - | - | - | - | - |
| the face (root) | 0, 0, 1920 x 1080 | 0, 0, 1920 x 1080 | 0, 0, 0, 0 | = |
| top bar | 0, 0, 1920 x 48 | 0, 0, 1920 x 48 | 0, 0, 0, 0 | = |
| top bar: the wordmark's cube | 10, 12, 23 x 23 | 14, 12, 23 x 23 | -4, 0, 0, 0 | DIFF: D3: her padding 14 above 1500, ours 10: -4 x |
| top bar: CABINET CORE (the words) | 42, 15.1, 106.1 x 15 | 46, 15.1, 112.1 x 15 | -4, 0, -6, 0 | DIFF: D3: her padding and her tracking 2 above 1500 (ours 1.5, 12 glyphs): -4 x, -6 w |
| top bar: PRO | 155.1, 15.8, 34 x 15.4 | 167.1, 15.8, 34 x 15.4 | -12, 0, 0, 0 | DIFF: D4: ours at the bar's gap 7, hers at her wordmark's 9, and D3: -12 x |
| top bar: the rule after PRO | 196.2, 13.5, 1 x 20 | 217.2, 14.5, 1 x 18 | -21, -1, 0, +2 | DIFF: D4: TopBar's separator, 20 high and no margin, against her 18 with 6 px either side, and D3: -21 x, -1 y, +2 h |
| top bar: the project name | 204.2, 14.4, 84.9 x 18.2 | 234.2, 6.7, 155 x 33.6 | -30, +7.7, -70.1, -15.4 | DIFF: D5: the job's name on one line against her two-line sample (-70.1 w, -15.4 h); x -30 by D4 and D3 |
| top bar: the name's words (its first line) | 204.2, 15.4, 70.2 x 16 | 234.2, 7.7, 118.7 x 16 | -30, +7.7, -48.5, 0 | DIFF: D5: "T81 kitchen" against "Hampstead kitchen" (-48.5 w), centred, not the first of two lines (+7.7 y); x -30 by D4 and D3 |
| top bar: the eight legacy menus | 296.1, 7.5, 467.1 x 32 | 407.1, 7.5, 522.1 x 32 | -111, 0, -55, 0 | DIFF: D6: her Output's chevron (-23 w), D3: her menu padding 8 (-32 w over eight); x -111.1: the name's width (D5) and D4, D3 |
| top bar: File | 296.1, 7.5, 35.6 x 32 | 407.1, 7.5, 39.6 x 32 | -111, 0, -4, 0 | DIFF: D3: her menu padding 8 (-4 w); x -111.1 with the menus (D4, D5, D3) |
| top bar: Output | 707.4, 7.5, 55.8 x 32 | 846.4, 7.5, 82.8 x 32 | -139, 0, -27, 0 | DIFF: D6: no chevron (-23 w), D3: her padding (-4 w, and -28 x from the seven before it); x with the menus |
| top bar: Undo | 1458.3, 7.5, 32 x 32 | 1788.9, 7.5, 32 x 32 | -330.6, 0, 0, 0 | DIFF: D7: the right group Undo to BOM 451.7 wide, hers Undo to Save 117.1; D3: her padding 14 |
| top bar: Redo | 1497.3, 7.5, 32 x 32 | (none) |  | OURS ONLY: D7: Redo beside Undo (CLAUDE.md F2) |
| top bar: Save | 1536.3, 7.5, 79.1 x 32 | 1830.9, 7.5, 75.1 x 32 | -294.6, 0, +4, 0 | DIFF: D8: the house's padding 12 against her 10 (+4 w); x by D7 (-294.6) |
| top bar: Brightness | 1622.4, 15.5, 140 x 16 | (none) |  | OURS ONLY: D7: the Brightness slider, the same state (CLAUDE.md F2) |
| top bar: Account | 1769.4, 7.5, 77.3 x 32 | (none) |  | OURS ONLY: D7: Account (CLAUDE.md F2) |
| top bar: BOM | 1853.6, 7.5, 56.4 x 32 | (none) |  | OURS ONLY: D7: BOM, the gold button that said Export (CLAUDE.md F2; the owner, 16:27, "tak") |
| context strip | 0, 48, 1920 x 34 | 0, 48, 1920 x 34 | 0, 0, 0, 0 | = |
| context: the breadcrumb | 128, 55.4, 177 x 18.2 | 128, 55.4, 159.2 x 18.2 | 0, 0, +17.8, 0 | DIFF: D11: the job's words (+17.8 w) |
| context: the unit number (bold) | 288.5, 55.4, 16.4 x 18.2 | 263, 55.4, 24.1 x 18.2 | +25.5, 0, -7.7, 0 | DIFF: D11: "02" against "B07" (-7.7 w), x after the words (+25.5) |
| context: "1 cabinet selected" | 1793.1, 56.1, 112.9 x 16.8 | 1753.1, 56.1, 112.9 x 16.8 | +40, 0, 0, 0 | DIFF: D10: no show-inspector button while the inspector shows (her 32 and gap 8: +40 x) |
| context: show-inspector button | (none) | 1874, 50.5, 32 x 28 |  | HERS ONLY: D10: drawn only while the inspector is hidden (CLAUDE.md F2) |
| workspace (rail / scene / inspector) | 0, 82, 1920 x 968 | 0, 82, 1920 x 968 | 0, 0, 0, 0 | = |
| rail | 0, 82, 112 x 968 | 0, 82, 112 x 968 | 0, 0, 0, 0 | = |
| rail: Select | 8, 96, 95 x 32 | 8, 96, 95 x 32 | 0, 0, 0, 0 | = |
| rail: Add | 8, 134, 95 x 32 | 8, 134, 95 x 32 | 0, 0, 0, 0 | = |
| rail: Room | 8, 172, 95 x 32 | 8, 172, 95 x 32 | 0, 0, 0, 0 | = |
| rail: Materials | 8, 210, 95 x 32 | 8, 210, 95 x 32 | 0, 0, 0, 0 | = |
| rail: separator | 12, 257, 87 x 1 | 12, 257, 87 x 1 | 0, 0, 0, 0 | = |
| rail: Check | 8, 273, 95 x 32 | 8, 273, 95 x 32 | 0, 0, 0, 0 | = |
| rail: Check's count | 87.6, 280, 20.4 x 20 | (none) |  | OURS ONLY: D12: Check's count, 2, red |
| rail: WORKSPACE | 8, 940.6, 95 x 15.4 | 8, 980.6, 95 x 15.4 | 0, -40, 0, 0 | DIFF: D13: CNC under Design (32 + 8: -40 y) |
| rail: Design | 8, 964, 95 x 32 | 8, 1004, 95 x 32 | 0, -40, 0, 0 | DIFF: D13: CNC under it (-40 y) |
| rail: CNC | 8, 1004, 95 x 32 | (none) |  | OURS ONLY: D13: CNC at the rail's foot (CLAUDE.md F2) |
| scene slot | 112, 82, 1464 x 968 | 112, 82, 1464 x 968 | 0, 0, 0, 0 | = |
| scene: the four toggles | 685.3, 94, 317.4 x 44 | (none) |  | OURS ONLY: D14: X-ray, Hide fronts, Outlines, Open all (CLAUDE.md F6) |
| scene: View (top right) | 1482.9, 94, 79.1 x 32 | 1486.9, 94, 75.1 x 32 | -4, 0, +4, 0 | DIFF: D8: the house's padding (+4 w), right-aligned (-4 x) |
| scene: the bar at the foot | 539.9, 988, 608.1 x 44 | 738.2, 988, 211.5 x 44 | -198.3, 0, +396.6, 0 | DIFF: D15: ten buttons against her two (+396.6 w), centred (-198.3 x) |
| scene foot: 3D | 545.9, 994, 66.4 x 32 | 744.2, 994, 62.4 x 32 | -198.3, 0, +4, 0 | DIFF: D8: the house's padding (+4 w); x with the bar (D15) |
| scene foot: Drawings... | 1031.9, 994, 110.1 x 32 | 829.6, 994, 114.1 x 32 | +202.3, 0, -4, 0 | DIFF: D8: the house's ghost padding 8 against her 10 (-4 w); x at the bar's end (D15: +202.3) |
| inspector column | 1576, 82, 344 x 968 | 1576, 82, 344 x 968 | 0, 0, 0, 0 | = |
| card: head | 1577, 82, 343 x 110.8 | 1577, 82, 343 x 110.8 | 0, 0, 0, 0 | = |
| card: the unit number | 1591, 101.6, 163.5 x 15.4 | 1591, 101.6, 159.3 x 15.4 | 0, 0, +4.2, 0 | DIFF: D16: the block's width is its title's ("02" over it; +4.2 w) |
| card: the title | 1591, 120, 163.5 x 22.4 | 1591, 120, 159.3 x 22.4 | 0, 0, +4.2, 0 | DIFF: D16: "Base units . Standard" against "Drawer base cabinet" (+4.2 w) |
| card: the thumb | 1858, 98, 48 x 48 | 1858, 98, 48 x 48 | 0, 0, 0, 0 | = |
| card: the scope row | 1591, 157, 315 x 22.8 | 1591, 157, 315 x 22.8 | 0, 0, 0, 0 | = |
| card: "This cabinet" | 1591, 157, 85.4 x 22.8 | 1591, 157, 85.4 x 22.8 | 0, 0, 0, 0 | = |
| card: body | 1577, 192.8, 343 x 394.2 | 1577, 192.8, 343 x 436.2 | 0, 0, 0, -42 | DIFF: D17: one row fewer (-42 h) |
| card: the frame round the rows | 1591, 204.8, 315 x 257.4 | 1591, 204.8, 315 x 299.4 | 0, 0, 0, -42 | DIFF: D17: one row fewer (-42 h) |
| card: SIZE & SETUP | 1602, 215.8, 293 x 15.4 | 1602, 215.8, 293 x 15.4 | 0, 0, 0, 0 | = |
| card: "Height follows project default" | 1591, 470.2, 315 x 16.8 | 1591, 512.2, 315 x 16.8 | 0, -42, 0, 0 | DIFF: D17: under five rows, not six (-42 y) |
| card: Open cabinet (gold) | 1591, 503, 315 x 32 | 1591, 545, 315 x 32 | 0, -42, 0, 0 | DIFF: D17 (-42 y); its weight is D9 |
| card: Full settings | 1591, 543, 315 x 32 | 1591, 585, 315 x 32 | 0, -42, 0, 0 | DIFF: D17 (-42 y) |
| card: foot | 1577, 993, 343 x 57 | 1577, 993, 343 x 57 | 0, 0, 0, 0 | = |
| card foot: Hide settings | 1874, 1006, 32 x 32 | 1874, 1006, 32 x 32 | 0, 0, 0, 0 | = |
| status bar | 0, 1050, 1920 x 30 | 0, 1050, 1920 x 30 | 0, 0, 0, 0 | = |
| status: the selection in words | 117, 1057.1, 89.4 x 16.8 | 14, 1057.1, 112.6 x 16.8 | +103, 0, -23.2, 0 | DIFF: D19: after Changes (+103 x); "02 . Base unit" against "B07 . This cabinet" (-23.2 w) |
| status: the viewport | 1522.5, 1057.1, 79.5 x 16.8 | 1708.7, 1057.1, 79.5 x 16.8 | -186.2, 0, 0, 0 | DIFF: D19: the counters after it, clear of the build stamp (-186.2 x) |

### The card's rows (the field heights, the row pitch)

| # | Ours: label, top, h, pitch; the value | Hers: label, top, h, pitch; the value |
| - | - | - |
| 1 | Width, 241.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px | Width, 241.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px |
| 2 | Height, 283.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px | Height, 283.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px |
| 3 | Depth, 325.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px | Depth, 325.2, 42, 42; input.cc-input 148.3 x 30, text 13px, radius 4px |
| 4 | Doors, 367.2, 42, 42; button.studio-value-action 148.3 x 30, text 13px, radius 4px; buttons 2 doors . L / R 30 high | Front type, 367.2, 42, 42; button.value-action 148.3 x 30, text 13px, radius 4px; buttons Project default 30 high |
| 5 | Plinth, 409.2, 42, -; span.studio-readonly-value 44.4 x 30, text 12px, radius 0px; buttons Remove 32 high | Finish, 409.2, 42, 42; button.value-action 148.3 x 30, text 13px, radius 4px; buttons Type A . Natural oak 30 high |
| 6 | (no row) | Plinth, 451.2, 42, -; button.value-action 148.3 x 30, text 13px, radius 4px; buttons On . 150 mm 30 high |

### Type and radius, the quick card

| Element | Ours | Hers | Verdict |
| - | - | - | - |
| the face's base text | size 13px; font system-ui | size 13px; font system-ui | = |
| a row's label (Width) | size 12px; weight 400; ink #d6d6d2 | size 12px; weight 400; ink #d6d6d2 | = |
| a number field (Width) | size 13px; h 30; radius 4px; align right; pad-r 40px; ground #1a1a1a; border #3e3e42 | size 13px; h 30; radius 4px; align right; pad-r 40px; ground #1a1a1a; border #3e3e42 | = |
| the unit in the field (mm) | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| a summary value (Doors / Front type) | size 13px; h 30; radius 4px; ground #2d2d30; border #3e3e42 | size 13px; h 30; radius 4px; ground #2d2d30; border #3e3e42 | = |
| the section title | size 11px; tracking 0.8px; case uppercase; ink #c8a678 | size 11px; tracking 0.8px; case uppercase; ink #c8a678 | = |
| the unit number over the title | size 11px; tracking 0.7px; ink #c8a678 | size 11px; tracking 0.7px; ink #c8a678 | = |
| the title | size 16px; weight 600; ink #f2f2f0 | size 16px; weight 600; ink #f2f2f0 | = |
| the scope row | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| the scope pill | size 12px; radius 4px; border #3e3e42 | size 12px; radius 4px; border #3e3e42 | = |
| the inheritance line | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| Open cabinet | size 13px; weight 500; h 32; radius 4px; ground #aa8e68; ink #1a1a1a | size 13px; weight 600; h 32; radius 4px; ground #aa8e68; ink #1a1a1a | DIFF: D9: the house's weight 500, hers 600 |
| Full settings | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | = |
| Hide settings | h 32; w 32; radius 4px | h 32; w 32; radius 4px | = |
| a rail button (Select) | size 13px; h 32; radius 4px; border #aa8e68/65%; ink #c8a678 | size 13px; h 32; radius 4px; border #aa8e68/65%; ink #c8a678 | = |
| the rail's WORKSPACE | size 11px; tracking 0.5px; case uppercase | size 11px; tracking 0.5px; case uppercase | = |
| a menu button (File) | size 13px; h 32; radius 4px; pad-l 6px; ink #d6d6d2 | size 13px; h 32; radius 4px; pad-l 8px; ink #d6d6d2 | DIFF: D3: her padding 8 above 1500 |
| Save | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | size 13px; h 32; radius 4px; ground #2d2d30; border #3e3e42 | = |
| CABINET CORE | size 12px; tracking 1.5px; ink #d6d6d2 | size 12px; tracking 2px; ink #d6d6d2 | DIFF: D3: her tracking 2 above 1500 |
| the breadcrumb | size 13px; ink #a8a8a2 | size 13px; ink #a8a8a2 | = |
| "1 cabinet selected" | size 12px; ink #a8a8a2 | size 12px; ink #a8a8a2 | = |
| the status bar | size 12px; ink #a8a8a2; ground #1a1a1a | size 12px; ink #a8a8a2; ground #1a1a1a | = |

### Boxes, full settings and pinned

| Box | Ours (x, y, w x h) | Hers (x, y, w x h) | d (x, y, w, h) | Verdict |
| - | - | - | - | - |
| inspector column (full, pinned) | 1520, 82, 400 x 968 | 1520, 82, 400 x 968 | 0, 0, 0, 0 | = |
| the panel's head | 1521, 82, 399 x 45 | 1521, 82, 399 x 53 | 0, 0, 0, -8 | DIFF: D20: the panel's own head, 45 high (hers 53) |
| head: the title | 1533, 96, 66.1 x 16 | 1533, 98.2, 297 x 19.6 | 0, -2.2, -230.9, -3.6 | DIFF: D20: the panel's "BASE UNIT" in its 12 px capitals (hers "Full settings", 14 px) |
| head: the unit's name field | 1641.5, 92, 112 x 24 | (none) |  | OURS ONLY: D20: the UnitNameField in the panel's head (LAW 2) |
| head: Pin | 1788.7, 90, 28 x 28 | 1837, 92, 32 x 32 | -48.3, -2, -4, -4 | DIFF: D20: the header's 28 px (hers 32); x and y in the panel's head |
| head: back to quick settings | 1820.7, 90, 54.1 x 28 | 1876, 92, 32 x 32 | -55.3, -2, +22.1, -4 | DIFF: D20: "Quick", a word (S3), where hers is an x (+22.1 w, -4 h) |
| head: the panel's own x | 1882.7, 90, 25.3 x 28 | (none) |  | OURS ONLY: D20: the panel's own x (one of the 649) |
| the unit line under the head | (none) | 1521, 135, 399 x 52.6 |  | HERS ONLY: D20: no line under the head (LAW 2: no second header) |
| the rows' body (it scrolls) | 1521, 127, 399 x 923 | 1521, 187.6, 399 x 743.8 | 0, -60.6, 0, +179.2 | DIFF: D20: no unit line, no foot: from 127 to the status bar (-60.6 y, +179.2 h) |
| the first section (Carcass) | 1531, 137, 379 x 673.5 | 1533, 251.4, 375 x 160 | -2, -114.4, +4, +513.5 | DIFF: D20: the panel's own Carcass section, open (its rows, not her sample's) |
| its head | 1532, 138, 377 x 37 | 1544, 262.4, 353 x 24 | -12, -124.4, +24, +13 | DIFF: D20: the panel's section head (37 high, 16 px, its 10 px arrow) |
| its first field | 1542, 197.5, 113.7 x 30 | 1757, 290.4, 140 x 30 | -215, -92.9, -26.3, 0 | DIFF: D20: the panel's own field (113.7 x 30 in its grid; hers 140 x 30) |
| the column's foot | (none) | 1521, 993, 399 x 57 |  | HERS ONLY: D20: no foot under the panel (S3) |
| status bar | 0, 1050, 1920 x 30 | 0, 1050, 1920 x 30 | 0, 0, 0, 0 | = |

### Type and radius, full settings

| Element | Ours | Hers | Verdict |
| - | - | - | - |
| the head's title | size 12px; weight 400; case uppercase | size 14px; weight 600; case none | DIFF: D20: the panel's own title |
| Pin | h 28; w 28; radius 4px; ink #c8a678; border #aa8e68 | h 32; w 32; radius 4px; ink #c8a678; border #aa8e68 | DIFF: D20: the header's 28 px |
| back to quick settings | size 14px; h 28; w 54.1; radius 4px | size 13px; h 32; w 32; radius 4px | DIFF: D20: a word in the panel's 14 px (S3) |
| a section's head | size 16px; h 37; case none | size 13px; h 24; case none | DIFF: D20: the panel's section head |
| a field in it | size 14px; h 30; radius 4px | size 13px; h 30; radius 4px | DIFF: D20: the panel's 14 px (30 high, as hers) |
| a label in it | size 11px; case uppercase | size 12px; case none | DIFF: D20: the panel's 11 px capitals |
| the section's frame | radius 8px; border #aa8e68/70% | radius 4px; border #aa8e68/30% | DIFF: D20: the house's frame (8 round; gold 70 % while open) |

### The pixel ruler (where a shell-600 hairline is drawn, read off the four frames)

| Scan | Ours, quick | Hers, quick | Ours, full | Hers, full | Verdict |
| - | - | - | - | - | - |
| down the right edge, x 1914 (each hairline's y): the bars, the card's head and foot, the status bar | 47, 81, 192, 993, 1050 | 47, 81, 192, 993, 1050 | 47, 81, 126, 1050 | 47, 81, 134, 187, 993, 1050 | quick =; full: D20 |
| across the top bar, y 24: PRO's left border, the rule, the bordered buttons | 155, 196, 1536, 1614, 1769, 1846 | 167, 217, 1831, 1905 | 155, 196, 1536, 1614, 1769, 1846 | 167, 217, 1831, 1905 | quick: D4, D7, D8, D3; full: D4, D7, D8, D3 |
| across the context strip, y 64: the scope's left border | 1793 | 1753 | 1793 | 1753 | quick: D10; full: D10 |
| across the workspace, y 500 (x 0 to 140 and the last 420): the rail's and the inspector's borders | 111, 1576 | 111, 1576 | 111, 1520 | 111, 1520 | quick =; full = |

The scene's findings on this stage (the engine's `runChecks`, red and yellow, as the marker and the counters show them): red #18 on DR01: "DR01 D1: Runner NL500 (T): no article in catalogue - upload the model or adjust the ladder."; red #18 on DR01: "DR01 D2: Runner NL500 (T): no article in catalogue - upload the model or adjust the ladder.". Markers: 2 red.

Console errors on our page: none.

## The chat's frames of her file (`verify/t84/astra/stage1-*.png`)

Each frame is the chat's screen, taller than the page it shows: her page is `100dvh` high and below it the frame is her body's ground (#1a1a1a). The viewport is read off the pixels: the last shell-600 hairline down the right edge is her status bar's top border, so the viewport ends a status bar below it; her status bar prints `innerWidth x innerHeight`, so its pixels against her file rendered here at that viewport confirm the reading. Her file is rendered here with the fixture the frame shows (the card's unit number: W02 wall, B07 base, V01 vanity) and the two are held pixel by pixel over the viewport (a pixel differs when a channel moves more than 24), region by region (her own boxes at that viewport), and by the ruler.

| Frame | Shows | Viewport off its pixels | Below it | Pixels that differ from her file here, by region | Ruler, the chat's frame | Ruler, her file here |
| - | - | - | - | - | - | - |
| `stage1-1280-quick.png` | quick card, W02 (her wall fixture), `?type=wall` | 1280 x 713 (frame 1280 x 800; status hairline at 683) | 87 rows, 100.0 % #1a1a1a | 588 of 912640 (0.06 %): top bar 55, context 16, rail 105, scene 357, inspector 54, status bar 1 | down: 47, 81, 192, 626, 683; across y 500: 111, 936 | down: 47, 81, 192, 626, 683; across y 500: 111, 936 |
| `stage1-1440-quick.png` | quick card, B07 (her base fixture), `?type=base` | 1440 x 813 (frame 1440 x 900; status hairline at 783) | 87 rows, 100.0 % #1a1a1a | 838 of 1170720 (0.07 %): top bar 55, context 16, rail 105, scene 576, inspector 85, status bar 1 | down: 47, 81, 192, 726, 783; across y 500: 111, 1096 | down: 47, 81, 192, 726, 783; across y 500: 111, 1096 |
| `stage1-1440-full.png` | full settings, pinned, B07, `?type=base&inspector=full&pin=1` | 1440 x 813 (frame 1440 x 900; status hairline at 783) | 87 rows, 100.0 % #1a1a1a | 757 of 1170720 (0.06 %): top bar 55, context 16, rail 105, scene 536, inspector 44, status bar 1 | down: 47, 81, 134, 187, 726, 783; across y 500: 111, 1080 | down: 47, 81, 134, 187, 726, 783; across y 500: 111, 1080 |
| `stage1-1920-full.png` | full settings, pinned, V01 (her vanity fixture), `?type=vanity&inspector=full&pin=1` | 1920 x 993 (frame 1920 x 1080; status hairline at 963) | 87 rows, 100.0 % #1a1a1a | 1083 of 1906560 (0.06 %): top bar 55, context 16, rail 105, scene 862, inspector 44, status bar 1 | down: 47, 81, 134, 187, 906, 963; across y 500: 111, 1520, 1757, 1896 | down: 47, 81, 134, 187, 906, 963; across y 500: 111, 1520, 1757, 1896 |

## Every deviation, in px, and why

Each is named once; the tables above cite it with the px they measured at each size. NUMBERS: Stage-1 differs from THE NUMBERS and THE NUMBERS win (D1, D2). CLAUDE.md: the order of this turn asks for what her Stage-1 does not draw, or draws otherwise (D6, D7, D10, D12 to D15, D17, D19, D20). CONTENT: the real job against her sample's words (D5, D11, D16, D18). SKIN: the skin's own choice or the house's class kept (D3, D4, D8, D9); a patch is offered where the skin can take her value without touching a file it does not own (D4, D8, D9), measured on a build of it.

D1. **THE NUMBERS: the rail at 1280 is 56, icons only.** `ui.studio.rail` is 112 with labels from 1440 and 56 below (PROPOSED, CLAUDE.md THE NUMBERS: "Stage-1 and her 1280 note"); her file keeps 112 with its words down to her 1150 query (96 below it). At 1280 the rail and each of its buttons are 56 px narrower (rail 56, buttons 39), the separator 31 against 87, no WORKSPACE caption, Check's count on the button's corner; the context strip's left padding is the rail and 16 (72 against 128), so the breadcrumb starts 56 px further left; the scene starts at 56. THE NUMBERS win.

D2. **THE NUMBERS: the quick card at 1280 is 316.** `ui.studio.inspector.quickNarrowPx` 316 below `quickNarrowBelowPx` 1440 (PROPOSED, the designer); her file keeps 344 down to her 1150 query. The column and everything in the card (head, scope row, body, frame, section title, inheritance line, Open cabinet, Full settings, foot) are 28 px narrower and stand 28 px further right; the rows keep their 42 px pitch and 30 px fields, the value column at its 136 px minimum (her `minmax(136px, 1.1fr)`; 148.3 at 344). The scene is 84 px wider (56 + 28). THE NUMBERS win.

D3. **Her wider top bar above 1500 is not taken (1920 only).** Her `@media (max-width: 1500px)` narrows her top bar; ours keeps her narrow values at every width (wave 1 of this slice, DECISIONS TAKEN 2: no media query can read the profile, and the Studio's bar holds more than hers, D7): padding 10 (hers 14 above 1500), gap 7 (10), the wordmark's tracking 1.5 (2), the rule's margin 3 (6), the menus' margin 0 (8), a menu button's side padding 6 (8), the name's max 180 (240). At 1920: the cube 4 px further left, CABINET CORE 6 px shorter (12 glyphs at 0.5), PRO 12, the rule 21, the name 30, the menus 111 px further left, each menu button 4 px narrower. Her 1500 is `inspector.fullNarrowBelowPx`, a profile number a style sheet cannot read in a query, so taking her wide bar needs a width signal from the shell (StudioShell.jsx, not this slice's file); not offered as a patch.

D4. **The PRO label and the rule after it.** TopBar draws PRO beside the wordmark, at the bar's gap (7), where her PRO stands inside her wordmark at its gap (9): 2 px nearer. The rule is TopBar's own separator (`h-5 w-px bg-shell-600`): 20 px high with no margin, against her `.rule`, 18 high with 3 px either side at 1500 and below: 5 px nearer, 1 px higher, 2 px taller, and everything after it 8 px nearer. PATCH offered: `/tmp/claude-0/t84/patches/D1-studio.css.diff`, the top bar hunk (PRO 2 px further off the words, the rule 18 high with 3 px either side). Measured on a build of it at the three sizes: at 1280 and 1440 PRO -2 to 0, the rule -5, -1, +2 to 0, 0, 0, the name -8 to 0 (its own width stays, D5); at 1920 PRO -10, the rule -16, the name -22 (D3's part).

D5. **The project name is the job's, on one line.** Ours is the open project's name ("T81 kitchen" and the unsaved dot after it), one line centred on the bar; hers is a sample name over a second line, "Sample project . Studio layout" (her fixture's words; the app holds no such line and CLAUDE.md F2 names none). Box 84.9 x 18.2 against 155 x 33.6; the name's words stand 7.7 px lower (centred, not the first of two lines); everything after the name moves with its width.

D6. **The menus are the legacy MenuBar's own (LAW 1, ZERO KASOWANIA).** The eight menus are MenuBar mounted whole with `orderMenus(menus)`, compacted to 13 px and her 6 px padding (studio.css section 4); Output is a word where her Output carries a chevron (16 and a gap of 7): 23 px. File to Lighting are her widths to the 0.1 px at 1500 and below.

D7. **The top bar's right group holds what CLAUDE.md F2 puts there.** F2: "then Undo and Redo (useHistoryStore, the same depth guards as the toolbar's), Save with its three states, Brightness (the same slider, the same state), Account, and BOM". Six controls where her Stage-1 shows Undo and Save; the group from Undo to BOM is 451.7 px against her 114.1 (117.1 above 1500), so Undo stands 337.6 px further left at 1280 and 1440 (330.6 at 1920); Redo, Brightness, Account and BOM have no counterpart in hers.

D8. **A house button keeps the house's side padding.** studio.css takes the scale (32 high, 4 round, 13 px) into the house classes and leaves their side padding to the house (src/index.css: `.cc-btn` and `.cc-btn-gold` `px-3` 12, `.cc-btn-ghost` `px-2` 8; wave 1 of this slice, DECISIONS TAKEN 1, so S2's `px-2` chips keep theirs); hers is 10 on all three. Save, View and 3D are 4 px wider than hers, Drawings... 4 px narrower; View, right-aligned, stands 4 px further left. PATCH offered (the padding hunk): 10 px either side for the house buttons of the top bar and the scene's edge that carry no `px-` utility, outside a popup and not an icon button. Measured on a build of it: Save, View, 3D and Drawings... on her widths at every size (View on her box at 1440 and 1920), Account 73.3 and BOM 52.6 (4 narrower), the camera bar 424.6 wider than hers instead of 396.6 (Plan, Iso, A to D and Frame selection, which she does not draw, take her 10 too), the View menu's Navy / Red chips keep their 8, every button 32 high, no overflow.

D9. **The gold button's weight.** The house's `.cc-btn-gold` is `font-medium`, 500 (src/index.css:25); her `.cc-btn-gold` is 600. Open cabinet (and BOM, which has no counterpart in hers) reads lighter; 0 px. PATCH offered (the weight hunk): 600 inside the skin; measured on a build of it: Open cabinet and BOM 600.

D10. **The show-inspector button stands only while the inspector is hidden.** CLAUDE.md F2: "the panel-show button when the inspector is hidden" (SelectionBreadcrumb draws it in `none` only); her context strip draws it always, where it does nothing while the inspector shows. "1 cabinet selected" stands 40 px further right (her button 32 and the gap 8).

D11. **The breadcrumb's words are the job's.** Ours "T81 kitchen > Wall A > 02" (S1: the project's name for the room, which has none; the wall by the drawing set's own letter; the unit's number), hers "Kitchen > Island > B07" (sample): 17.8 px longer; the bold number 7.7 px narrower ("02" against "B07").

D12. **Check carries its count on the rail.** CLAUDE.md F2: "Check (`toggleCheck`, the badge `findingsToAct(checkFindings).length`, red when a red finding is in it)"; on this stage 2, red (two red #18 findings on DR01: the NL500 runner has no article in the catalogue, the engine's own sentence). Her Check carries none.

D13. **CNC stands at the rail's foot.** CLAUDE.md F2: "The foot: Design (`setViewMode('3d')`) and CNC (`setViewMode('cnc')`)"; hers holds Design only. The caption and Design stand 40 px higher (one button and one gap, 32 + 8).

D14. **The four toggles at the scene's top edge.** CLAUDE.md F6 (the designer's set of 17:01, PROPOSED, `ui.studio.sceneToggles`): X-ray, Hide fronts, Outlines, Open all; her Stage-1 has none. 317.4 x 44, centred on the scene's top, 12 px down.

D15. **The bar at the scene's foot holds the camera.** CLAUDE.md F6: "`CameraBar` at the scene's foot: Plan, Iso, A, B, C, D, Frame selection, beside 3D | Drawings..."; hers is 3D and Drawings... only. 608.1 px against 211.5, both centred in the scene: 3D starts 198.3 px further left and Drawings... 202.3 further right where the scenes are one width (1440, 1920); the buttons' paddings are D8's.

D16. **The card's title and number are the cabinet's.** The title is the Library's row for the type ("Base units . Standard", S2's decision: the row after its group), the number the unit's ("02"); her base fixture reads "Drawer base cabinet" and "B07". The title block is 4.2 px wider (the longer words).

D17. **A BUD has five rows (LAW 3, THE CARD NEVER LIES).** CLAUDE.md F3: "Base: Width . Height . Depth . Doors (...) . Drawers (...) . Plinth (...). BUD hides Drawers"; a row the type does not have is absent. Her base fixture shows six sample rows (Width, Height, Depth, Front type, Finish, Plinth). Rows 1 to 5 stand where hers do, 42 apart and 42 high, their fields 30 high; the frame and the body are 42 px shorter, so the inheritance line, Open cabinet and Full settings stand 42 px higher. Our Plinth row is the derived height and Remove (a 32 px button: `removePlinth`), where her sample row is a 30 px summary.

D18. **The card's foot carries no words.** Ours holds Hide settings alone (S2); hers adds "Project defaults remain available". Same box, 57 high; Hide settings on her pixel.

D19. **The status bar holds what CLAUDE.md F2 and F5 put there.** Changes (the re-homed drawer, first), the selection in words (S1: "02 . Base unit"), MOCK DATA MODE, the unsaved mark, the counters ("2 red"), the viewport; hers holds the selection ("B07 . This cabinet"), the viewport, "mm" and her Prototype button. Our selection's words start 103 px further right (after Changes); our viewport words end clear of the app's build stamp (App.jsx, fixed at the bottom right; S1), 186 px further left than hers.

D20. **Full settings is RightPanel, embedded whole (LAW 2, DECISIONS 8).** CLAUDE.md LAW 2: "The full panel IS `RightPanel.jsx` embedded, every row, every section, the UnitNameField; no second header over it"; DECISIONS 8: the embedded panel keeps its own style tonight. So the head is the panel's, 45 high (hers 53): the type's label in the panel's 12 px capitals (hers "Full settings", 14 px), the UnitNameField, the host's Pin at the header's 28 px (hers 32) and Quick as a word (S3; hers an x), then the panel's own x; no unit line under the head and no foot (hers "B07 . Drawer base cabinet / Pinned . follows selection" and "No new panel tabs in Stage 1 / Open cabinet"), so the rows start 60.6 px higher and run to the status bar. The sections, rows and scale are the panel's own (Carcass, Add items, Section 1, Construction, Doors; fields 30 high at 14 px, 11 px capital labels, 8 px frames, gold at 70 % while open), not her sample's (13 px, 12 px labels, 4 px frames). The column is THE NUMBERS' width, 360 at 1280 and 1440, 400 at 1920: hers to the pixel.


SUMMARY: 45 checks, 45 PASS, 0 FAIL; 12 frames; boxes and type rows: 119 equal, 147 differing with their reason, 27 ours only, 10 hers only; 20 deviations named, 20 met on this run; 0 table rows UNEXPLAINED; 155 s.
