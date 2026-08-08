# CNC export identity — turn 11 (CLAUDE.md F8.3)

Every DXF this app can produce, for all eight kits, fingerprinted (FNV-1a)
on the TURN-10 BASELINE (commit ccb1de1) and on the turn-11 branch.
`diff before after` is empty: the export did not move a byte.

```
(no differences)
```

## The fingerprints
```
WARDROBE files=31 01-BUL.dxf:2165ad2e,01-BUR.dxf:8f816024,01-TOP.dxf:9a377d8b,01-BOTTOM.dxf:e39f4787,01-BACK.dxf:38097caa,01-SHELF-1.dxf:c448fe60,01-SHELF-2.dxf:a06f00e1,01-PARTITION.dxf:34483110,01-RAIL-PART.dxf:6f9123b4,01-DP-L.dxf:aebcd709,01-FILLER-1.dxf:69afc79f,01-FILLER-2.dxf:c61ef690,01-D1-SL.dxf:4cff8b80,01-D1-SR.dxf:e056e30e,01-D1-BF.dxf:7842a65d,01-D1-BB.dxf:8accf569,01-D1-DNO.dxf:98c36dae,01-D2-SL.dxf:63bcc749,01-D2-SR.dxf:6eed1a67,01-D2-BF.dxf:938ff2ac,01-D2-BB.dxf:48383dd8,01-D2-DNO.dxf:e506cac3,01-D3-SL.dxf:8e7ffab2,01-D3-SR.dxf:9a62965c,01-D3-BF.dxf:1fab452b,01-D3-BB.dxf:fc222127,01-D3-DNO.dxf:edb68910,01-DF1.dxf:c01fb741,01-DF2.dxf:ce84b380,01-DF3.dxf:f966bd5b,01-F.dxf:5dc13225
WARDROBE all 5692ffcb
WARDROBE non-sprayed 74ccd107
WARDROBE sprayed a467790b
WARDROBE fronts a467790b
BUD files=10 B1-BUL.dxf:fd939516,B1-BUR.dxf:74a39ada,B1-TOP.dxf:f603d879,B1-BOTTOM.dxf:0e60ff7b,B1-BACK.dxf:69da5f46,B1-SHELF-1.dxf:4e22bafe,B1-PLINTH.dxf:2e0a5d71,B1-INFILL-T-FACE.dxf:7e3257ab,B1-INFILL-T-SHELF.dxf:5c91c5e9,B1-F.dxf:ae27eb55
BUD all 68df5595
BUD non-sprayed c2df7f5a
BUD sprayed 9850ebc3
BUD fronts ae27eb55
SINK files=8 S1-BUL.dxf:7f385c33,S1-BUR.dxf:7b4cce30,S1-BOTTOM.dxf:b3b2ca63,S1-BACK.dxf:b199ef22,S1-HOLDER-F.dxf:c8dcda33,S1-HOLDER-B.dxf:355ae0af,S1-SHELF-1.dxf:f9c8720d,S1-F.dxf:3683444d
SINK all 820c6221
SINK non-sprayed 6e47a2c9
SINK sprayed 3683444d
SINK fronts 3683444d
BUDR files=23 R1-BUL.dxf:9f21c2f4,R1-BUR.dxf:7c90cdc1,R1-TOP.dxf:a694c949,R1-BOTTOM.dxf:c90d146b,R1-BACK.dxf:8b427496,R1-D1-SL.dxf:cf056938,R1-D1-SR.dxf:e49de30e,R1-D2-SL.dxf:a4b5fe0b,R1-D2-SR.dxf:2a3e67c5,R1-D3-SL.dxf:c3a07a5a,R1-D3-SR.dxf:9fddd334,R1-D1-BF.dxf:54089996,R1-D1-BB.dxf:3a1d6d8a,R1-D2-BF.dxf:ec5693be,R1-D2-BB.dxf:b09cf2d2,R1-D3-BF.dxf:adeeffd3,R1-D3-BB.dxf:a4f163c1,R1-D1-DNO.dxf:bde5a7a6,R1-D2-DNO.dxf:2ee8035f,R1-D3-DNO.dxf:e5e0b9f4,R1-F1.dxf:6694c2e4,R1-F2.dxf:c3ba5027,R1-F3.dxf:17e0f2e8
BUDR all 65919213
BUDR non-sprayed 4004976e
BUDR sprayed ea7c9fa8
BUDR fronts ea7c9fa8
WUD files=7 W1-BUL.dxf:910cb2ce,W1-BUR.dxf:a5f3fb26,W1-TOP.dxf:0f289a16,W1-BOTTOM.dxf:6b03ba3e,W1-BACK.dxf:f986aad7,W1-SHELF-1.dxf:c277de37,W1-F.dxf:fbdf6a4a
WUD all c84ff614
WUD non-sprayed eacb6ac5
WUD sprayed fbdf6a4a
WUD fronts fbdf6a4a
FRIDGE files=10 F1-BUL.dxf:1f25c735,F1-BUR.dxf:29e71c2b,F1-TOP.dxf:4e651415,F1-BOTTOM.dxf:1231e767,F1-FIXED.dxf:8b8e9696,F1-RAIL1.dxf:d7684175,F1-RAIL2.dxf:ab060675,F1-BACK.dxf:391a9d64,F1-SPURS.dxf:2b1fe070,F1-F.dxf:24562f50
FRIDGE all 38b340d5
FRIDGE non-sprayed 918be070
FRIDGE sprayed 24562f50
FRIDGE fronts 24562f50
BUDTALL files=9 T1-BUL.dxf:9e208824,T1-BUR.dxf:08505eaf,T1-TOP.dxf:fdcdf1b7,T1-BOTTOM.dxf:b0cbdec5,T1-BACK.dxf:74455b5d,T1-SHELF-1.dxf:fbb4b3ac,T1-SHELF-2.dxf:f944845d,T1-SHELF-3.dxf:466db29e,T1-F.dxf:a3d0f430
BUDTALL all 91350a95
BUDTALL non-sprayed 938159ab
BUDTALL sprayed a3d0f430
BUDTALL fronts a3d0f430
LOW_CABINET files=7 L1-BUL.dxf:2ac8e269,L1-BUR.dxf:04efc68d,L1-TOP.dxf:2d01ff7f,L1-BOTTOM.dxf:a2a0e62b,L1-BACK.dxf:ebd5eadf,L1-SHELF-1.dxf:455d9c34,L1-F.dxf:70783195
LOW_CABINET all 79204d1e
LOW_CABINET non-sprayed 8399672f
LOW_CABINET sprayed 70783195
LOW_CABINET fronts 70783195
```
