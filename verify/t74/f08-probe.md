# T74 F8 · the probe: the sloped shoe drawer bottom stays behind

The owner, 23.09.2026: *"skośne dno szuflady na buty zostaje w szafie przy otwieraniu, nie wysuwa się z szufladą."*

Run by `node scripts/t74-probes.mjs f8` against the preview. A wardrobe from WHERE, a shoe drawer from INSIDE's own
buttons (`shoe_box`, ADD), the doors opened by OPEN ALL, the drawer opened and shut by a real 2klik on its front.
Every box is read off the LIVE scene, in the unit's own frame, in mm (y up from the unit origin, z out toward
the room).

| state | drawer open | ramp y (low..high) | ramp z (back..front) | floor y top | floor z (back..front) | front z | ramp below the floor by |
|---|---|---|---|---|---|---|---|
| shut | 0 | -43.8..73.2 | 79..485.3 | 64.5 | 60..500 | 500..518 | 108.3 |
| open (2klik on W01-DF1) | 1 | -157.6..-40.7 | 504..910.3 | 64.5 | 500..940 | 940..958 | 222.1 |
| shut again | 0 | -43.8..73.2 | 79..485.3 | 64.5 | 60..500 | 500..518 | 108.3 |
| engine: D1-SHOE-RAMP box {"x":90,"y":64.5,"z":79,"w":1020,"h":9,"d":418.2516}, tilt 15, pivot {"y":64.5,"z":79} |  |  |  |  |  |  |  |

## The verdict, before any fix

1. WHICH MESH: `D{n}-SHOE-RAMP` (and its two `SHOE-DIVIDER`s), role `shoe_insert`. It IS in its drawer's moving
   group (`engine/drawerMotion.js drawerOf` takes `shoe_insert` since T70 F1): the open amount reaches it, and the
   table shows it moving when the drawer opens.
2. WHY IT STAYS BEHIND: in `3d/UnitView.jsx MovingPanel` the slide moves the panel's own group, and a tilted panel's
   whole group is then wrapped in the tilt. So the ramp slides along its OWN leaning axis: out by 425 of the 440 and
   DOWN by 114, ending 222 mm under the drawer's floor, in the carcass below the open box. From the room it has not
   come out with the drawer.
3. AND SHUT it already leans the wrong way: the engine's pivot is the ramp's BACK bottom edge (`tilt_pivot.z` =
   the interior's back), so +15 degrees drops its FRONT 108 mm through the drawer floor. `engine/shoeInsert.js`
   says what was meant: *"The ramp starts at the drawer's front floor and rises going back"* and *"the 3-D leans
   it about its FRONT bottom edge"*.
