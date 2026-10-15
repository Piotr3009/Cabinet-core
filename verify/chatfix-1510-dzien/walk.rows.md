| # | gesture | expected | observed | verdict |
|---|---|---|---|---|
| 1 | A1 two base units, the hand on nothing | no plus drawn | 0 plus(es): none | OK |
| 2 | A2 the hand over the first cabinet | the run's two end pluses | 2: Add a unit to the left of 01; Add a unit to the right of 02 | OK |
| 3 | A3 the hand away again, 1.5 s later | no plus | 0 | OK |
| 4 | B1 an island with nothing on it | 4 hover volumes, no plus | island island_97j2vop: 4 zone(s), 0 plus(es) | OK |
| 5 | B2 the hand over an empty island face | that face's plus, one | 1: Add a unit to face A of the island | OK |
| 6 | C1 a plan 1800 x 1100 with two on A and one on E2 | the core note shows 1232 x 532, no refusal | The cabinets stand inside this rectangle; what they leave in the middle is 1232 × 532 mm. / refusal false | OK |
| 7 | C2 INSERT | the core 1232 x 532 at (1716, 1984), three cabinets on A and E2 | {"cx":1716,"cy":1984,"w":1232,"d":532,"on":[["A",0,600],["A",600,600],["E2",0,450]]} | OK |
| 8 | D1 a new L | bi-fold by default, leaf A no handle, leaf B a handle | {"mode":"bifold","corner_doors":"bifold","handles":[["CL01-A-F",false],["CL01-B-F",true]]} | OK |
| 9 | D2 the handle in the scene | one handle, on leaf B's room face (x 586 .. +90, z 589 .. 898.5) | {"handles":1,"id":"CL01-B-F","x":[586,648],"y":[564,748],"z":[854,883]} | OK |
| 10 | E1 an 18 mm door 2klicked open, a neighbour on its hinge side | the leaf carries 155 and swings to 155 | carries 155, swung 155 | OK |
