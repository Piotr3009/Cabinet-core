# verify/chatfix-3110/box-flush.md: the drawer box wall stands flush with the sides' top (31.10.2026)

The owner, 18.10.2026: *"nawiercanie w bokach bedzie liczone od gory boxa"*; 31.10.2026, putting a side and a wall together: *"dziurki 5 mm byly za nisko, byly 24 od wyciecia i 26 od gory, a cabineo mialo 25 i tu i tu, i dlatego bylo zle ... powinny byc przesuniete o 1 mm do gory boxa"*; of the bench: *"pocialem dzisiaj szafe i mam przesuniecie o 1 milimetr"*.

## The geometry

Side: the bottom's groove 15 .. 34 (G + 1 tall). Wall: cut side - 15 - G - 1, its lower edge on the groove's upper edge (34), its top edge on the sides' top edge; the bottom (G) slides in under it on 1 mm of play. Until 31.10.2026 the engine stood the wall on the bottom BOARD (33), 1 low, and the Cabineo holes in the side added that 1 (26 under the top, 24 above the groove) against pockets 25 and 25 in the wall: the 1 mm the bench showed.

## What moved

- every DRAWER-BOX-FRONT and DRAWER-BOX-BACK box.y + 1 (placement, the 3D picture): 29 goldens re-pinned by their own writers (placement only; the T75 summaries count drills), the fossil three (BUDR, BUDR4, PANTRY) re-dumped;
- the sides' dia 5 Cabineo holes 1 higher: 25 under the side's top and 25 above the groove (BUDR D1: 212 / 59 from the lower edge; D2 153 / 59; D3 76; the wardrobe wall of 90: 79; the 130 wall: 139 / 59); the pockets never moved;
- the facade pilots follow the wall: 97.5 (94.5 on the wardrobe's first drawer, 115.5 on the BUDR's drawer 1 with its + G) instead of 96.5 / 93.5, KIT_BUDR_FULL.lsp and KIT_WARDROBE_FULL.lsp amended first, the profile after; the owner's own test applied to the front;
- the vanity's bowl check reads the wall 1 higher: the worked example 22.1 / 7.1, a bowl 113 deep clears (KIT_VANITY.lsp amended).

## The proof of the base results (the three fossils, before the pilots)

```
== BUDR: 12 changed lines (every one a box.y of a DRAWER-BOX-FRONT or DRAWER-BOX-BACK, + 1)
== BUDR4: 16 changed lines (every one a box.y of a DRAWER-BOX-FRONT or DRAWER-BOX-BACK, + 1)
== PANTRY: 12 changed lines (every one a box.y of a DRAWER-BOX-FRONT or DRAWER-BOX-BACK, + 1)
== WARDROBE: 0 changed lines (every one a box.y of a DRAWER-BOX-FRONT or DRAWER-BOX-BACK, + 1)
== BUD: 0 changed lines (every one a box.y of a DRAWER-BOX-FRONT or DRAWER-BOX-BACK, + 1)
== WUD: 0 changed lines (every one a box.y of a DRAWER-BOX-FRONT or DRAWER-BOX-BACK, + 1)
```

## The DXF prints (test/turn79-f15-label-colour.test.js), the pilots alone

```
WARDROBE UNCHANGED
BUD      UNCHANGED
WUD      UNCHANGED
BUDR     MOVED: 04-F1.dxf: circle FRONT_HINGES_3MM 114.5 -> 115.5; 04-F1.dxf: circle FRONT_HINGES_3MM 114.5 -> 115.5; 04-F2.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5; 04-F2.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5; 04-F3.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5; 04-F3.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5
BUDR4    MOVED: 05-F1.dxf: circle FRONT_HINGES_3MM 114.5 -> 115.5; 05-F1.dxf: circle FRONT_HINGES_3MM 114.5 -> 115.5; 05-F2.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5; 05-F2.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5; 05-F3.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5; 05-F3.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5; 05-F4.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5; 05-F4.dxf: circle FRONT_HINGES_3MM 96.5 -> 97.5
PANTRY   UNCHANGED
SHEET    MOVED: (the sheet: the same circles)
```
