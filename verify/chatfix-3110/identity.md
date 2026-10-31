# verify/chatfix-3110: no yellow on the machine file (31.10.2026)

The owner, 31.10.2026: *"zmien prosze layer cabineo dziury kolor z zoltego, raczej staraj sie wszedzie omijac zolty bo on jest mega nie widoczny na bialym tle (na takim pracuje vcarve)"*; on the mapping: *"1 ok, ale staraj sie trzymac w exporcie do DXF i u nas te same kolory, prosze upewnij sie ze wszystkie nasze figury w cnc sa zamkniete"*; *"cyjan jest ok, tylko jasny zolty jest nie widoczny"*; *"koduj"*.

## The palette

`palette.png` / `palette.svg`: every layer this fix touched, the old DXF colour on white, the new DXF colour on white, the new app ink on the black sheet (the same hue, lifted toward white only as far as a 3.5 : 1 contrast needs; engine/cnc/layers.js states the lift beside each row).

## The identity prints moved for the LAYER table rows alone

Every pinned DXF print that moved tonight moved because a `LAYER` row of the TABLES section states a new colour (group 62). The proof: the new text with the OLD number written back into those rows alone hashes to the old pin to the character. No record of ENTITIES moved.

```
01-BUL.dxf: now 52e6a0be; with the old colour rows 26bec93d (pinned 26bec93d) IDENTICAL; rows: PUZZLE_DOG_BONES 12 -> 2
sheet all: now e51cb490; with the old colour rows 7d4073bc (pinned 7d4073bc) IDENTICAL; rows: PUZZLE_DOG_BONES 12 -> 2, SHAKER_PANEL_POCKET 32 -> 41, DRAWER_BOTTOM_POCKET 230 -> 2
sheet non-sprayed: now 9263c54c; with the old colour rows 034c01aa (pinned 034c01aa) IDENTICAL; rows: PUZZLE_DOG_BONES 12 -> 2, DRAWER_BOTTOM_POCKET 230 -> 2
sheet sprayed: now 692e0871; with the old colour rows ceb3045b (pinned ceb3045b) IDENTICAL; rows: SHAKER_PANEL_POCKET 32 -> 41
sheet fronts: now 692e0871; with the old colour rows ceb3045b (pinned ceb3045b) IDENTICAL; rows: SHAKER_PANEL_POCKET 32 -> 41

WARDROBE plain 5325178ccdbaf1d76a18b4e6d18f79a81143c0d249fa6d5c0804314011a7c15b back IDENTICAL; plan 52acee84fe54b0a7f3f5b26b2ceae6a9f206091d9b3aac21709588db2230745e back IDENTICAL; rows PUZZLE_DOG_BONES 12->2, SHAKER_PANEL_POCKET 32->41
BUD      plain 8825fbd7279d9759c61d06b191eb84ec25dbc25081ed994e35f58932ef377636 back IDENTICAL; plan d8269135faf02d837c4588ba43ac792f5c2242bab4c4a7be19a3effed677c3ce back IDENTICAL; rows PUZZLE_DOG_BONES 12->2, SHAKER_PANEL_POCKET 32->41
WUD      plain fe391c4d7d6997195656feb9a958c7b33d58caa10d9c2f6edceeba5e7d2209e3 back IDENTICAL; plan e608d3859eb9c5931bd932c34a0ddeda985e7a7da463d6c265c89bf6ee335a55 back IDENTICAL; rows PUZZLE_DOG_BONES 12->2, SHAKER_PANEL_POCKET 32->41
BUDR     plain 4ba30eba5da915af3ca7285f7e0f04ae1284bc65c15c5d38f007ab795f01095d back IDENTICAL; plan bc218000781c360086adfdadef4d10064217769480b93fd723ac9717005e0885 back IDENTICAL; rows PUZZLE_DOG_BONES 12->2, DRAWER_BOTTOM_POCKET 230->2, SHAKER_PANEL_POCKET 32->41
BUDR4    plain 4e3146bcedae4bd16bb9fedecf02b3ae4420826adebab6569f05baa81f64dafe back IDENTICAL; plan f8893c2ee40b95b89fe3038fe7bf4396cd5532ade432d9668d003fa1c3f4ee1c back IDENTICAL; rows PUZZLE_DOG_BONES 12->2, DRAWER_BOTTOM_POCKET 230->2, SHAKER_PANEL_POCKET 32->41
PANTRY   plain d9b0686ef9e952ef0449deeaa929cc94bc96835cfd7c46553b7cd0038f08e2ed back IDENTICAL; plan dea72766b4d4a6b885deb5bb696c01d3cc06a2e60701dce448ffbc1fa431ec05 back IDENTICAL; rows PUZZLE_DOG_BONES 12->2, DRAWER_BOTTOM_POCKET 230->2, SHAKER_PANEL_POCKET 32->41
SHEET    plain 8f498c0eb3fe2b6d00383f49f2403ef6e03437182e19871efbe16a16f4b5adbe back IDENTICAL; plan 95d3bc166aa31983569c611909ce060541e5d9847d07ce78c28547d1dda7f5d2 back IDENTICAL; rows PUZZLE_DOG_BONES 12->2, SHAKER_PANEL_POCKET 32->41, DRAWER_BOTTOM_POCKET 230->2
```

## The two inframe goldens

golden-inframe-run.json 01-FRAME.dxf 70c1bd58 to a7b45d3e; golden-inframe-wud.json W01-FRAME.dxf 599b9cf3 to da1aea71: the frame's openings are cut on RECESS_WINDOW (52 to 142); not a point of the frame moved (the rest of each golden is byte for byte, `git diff --stat fixtures/`: one line each plus the meta note).

## Every figure closed

test/chatfix-3110-no-yellow.test.js walks every golden job of fixtures/ (params goldens, the old cases, the T75 scenes), builds every DXF and asserts: every POLYLINE on an outline or pocket layer carries the closed flag, has three points or more, does not repeat its first point as its last and has no zero-length segment; the owner's marks (BISCUIT_4MM, CORNER_4MM) are open walks of two or three points; no polyline stands on a hole layer.
