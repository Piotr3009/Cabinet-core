| # | gesture | expected | observed | verdict |
|---|---|---|---|---|
| 1 | A1 the island width typed over the old number, Enter | the plan is 2100 wide | open true, w 2100 | OK |
| 2 | A2 the first cabinet's depth typed | depth 400 on the plan cabinet | 400 | OK |
| 3 | A3 the turn button | the cabinet moves from face A to E2 (clockwise) | A -> E2 | OK |
| 4 | A4 the front edge | a gold line on every plan cabinet | 2 line(s), stroke #E0B35A | OK |
| 5 | B1 a BL 200 x 200 notch | STEP 218 x 770 over x 0..218, RETURN 182 x 770 behind it | {"step":[218,770],"ret":[182,770],"stepBox":{"x":0,"y":0,"z":200,"w":218,"h":770,"d":18},"retBox":{"x":200,"y":0,"z":18,"w":18,"h":770,"d":182}} | OK |
| 6 | C1 a BUD slid wholly into a 300 recess | depth 858 (558 + 300), recess_mm 300, its own 558 kept | {"id":"u_a0z4a17","front":568,"depth":858,"recess":300,"full":558,"x":1100} | OK |
| 7 | C2 the scene | the BACK stands in the alcove (behind the wall line, z < -1500), the door on the line of fronts (z about -932) | {"back":{"found":true,"x":[-900,-300],"y":[100,870],"z":[-1790,-1772]},"front":{"found":true,"x":[-899,-301],"y":[100,870],"z":[-929,-904]}} | OK |
| 8 | C3 the same BUD half across the recess edge | depth 558 on the wall line, an extension: RETURN-R and EXT-BACK, no warning | {"x":1800,"depth":558,"ext":{"boards":["RETURN-R","EXT-BACK"],"x0":0,"x1":490},"warn":[]} | OK |
| 9 | C4 the scene | EXT-BACK drawn in the alcove (z about -1790 .. -1772), BUL grown back to it | {"extBack":{"found":true,"x":[-200,290],"y":[100,870],"z":[-1790,-1772]},"bul":{"found":true,"x":[-200,-182],"y":[100,870],"z":[-1772,-932]}} | OK |
| 10 | C5 a tall unit in a recess from the floor to 1000 | its depth kept, an extension with a LID at the band's top (z1 890 = 1000 - 100 base - 10) | {"id":"u_tlgdj2s","err":null,"depth":558,"ext":{"boards":["LID","EXT-BACK"],"z1":890},"warn":[]} | OK |
| 11 | C6 the scene | the LID drawn in the alcove at about 1000 off the floor | {"found":true,"x":[650,1250],"y":[972,990],"z":[-1622,-1490]} | OK |
| 12 | D1 Room setup, the wall from the FRONT | two recesses and the chimney drawn: the full one 2500 high, the band 1000 high, the chimney 2500 | {"view":"front","drawn":[["recess",2500],["recess",1000],["chimney",2500]],"listed":3} | OK |
| 13 | D2 double-click the band recess | its window shows Bottom 0 and Top 1000 | {"bottom":"0","top":"1000"} | OK |
| 14 | D3 Top 1200 and Bottom 300 typed | stored as bottom_mm 300, top_mm 1200 | [300,1200] | OK |
| 15 | D4 the drawing follows | the band recess is now drawn 900 high (300 to 1200) | true | OK |
