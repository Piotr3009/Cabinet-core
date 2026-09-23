# T74 F8 · the probe: the sloped shoe drawer bottom stays behind

The owner, 23.09.2026: *"skośne dno szuflady na buty zostaje w szafie przy otwieraniu, nie wysuwa się z szufladą."*

Run by `node scripts/t74-probes.mjs f8` against the preview. A wardrobe from WHERE, a shoe drawer from INSIDE's own
buttons (`shoe_box`, ADD), the doors opened by OPEN ALL, the drawer opened and shut by a real 2klik on its front.
Every box is read off the LIVE scene, in the unit's own frame, in mm (y up from the unit origin, z out toward
the room).

| state | drawer open | ramp y (low..high) | ramp z (back..front) | floor y top | floor z (back..front) | front z | ramp below the floor by |
|---|---|---|---|---|---|---|---|
| shut | 0 | 64.5..181.4 | 78..484.3 | 64.5 | 60..500 | 500..518 | 0 |
| open (2klik on W01-DF1) | 1 | 64.5..181.4 | 518..924.3 | 64.5 | 500..940 | 940..958 | 0 |
| shut again | 0 | 64.5..181.4 | 78..484.3 | 64.5 | 60..500 | 500..518 | 0 |
| engine: D1-SHOE-RAMP box {"x":90,"y":64.5,"z":63.7484,"w":1020,"h":9,"d":418.2516}, tilt 15, pivot {"y":64.5,"z":482} |  |  |  |  |  |  |  |


## After the fix

The same real-hand run after T74 F8. Shut, the ramp lies ON the drawer floor (its low edge is the floor's top) and
rises to the back inside the box; opened by the 2klik, it has travelled exactly the box's 440 mm, level with it,
and shut again it is back where it was. Frames `f08-probe-shut-after.png`, `f08-probe-open-after.png`.
